// r27 (P2B) — TURNÊ NO MAPA. Duas partes, ambas puras e determinísticas:
//   1. Planejar: a rota cidade por cidade sobre o mapa, com custo e tempo de cada trecho (travelAdapter), público
//      previsto (tours.cityDemand), economia da praça (cities27: poder de compra, ingresso, mídia, leis) e as cenas
//      vivas no lugar (scenes27). A marcação é a de sempre (tours.planTour) — nada de motor paralelo.
//   2. Na estrada: em turnês marcadas por aqui, cada data pode trazer um evento de estrada (van quebrada, fronteira,
//      data cancelada pelo promotor, festa/groupies, imprensa local, doença, temporal) com opções "mais segura" ×
//      "mais lucrativa". A escolha vira efeito imediato (caixa, cansaço, visto, casa menor, data cancelada) e/ou
//      ajustes da noite (StopMods27) que o show de sempre aplica (tours.playStop via STOP27.pre).
//      Sem escolha do jogador, a equipe decide sozinha (gerente de turnê escolhe o melhor valor esperado; sem ele,
//      a opção segura) — dentro do teto de gasto da política (policy18).
// Sorte: Rng.fromSeed(semente|road27v1|turnê|dia|parte) — nunca s.rng. Turnês marcadas pelo caminho normal (e as dos
// bots) não passam por aqui: o modo rápido continua idêntico.

import { Rng, clamp } from '../../core/rng';
import { toReal } from '../../core/money';
import { VENUE_TIERS } from '../../data/rules';
import { countryName, countryOfCity } from '../../data/geo';
import { cityById, l, type L } from '../../data/world';
import { activeMembers } from '../capacity';
import { emitFact } from '../facts17';
import { STOP27, TICKET, cityDemand, estimateTour, planTour, type StopMods27, type TourEstimate, type TourPlan } from '../tours';
import { climateInfo, legInfo } from '../travelAdapter';
import type { Act, GameState } from '../types';
import type { Tour, TourStop } from '../xtypes';
import { dateOfDay, fmtL, money, post, staffSkill } from '../util';
import { cityEcon27 } from './cities27';
import { PH27, sceneDemand27 } from './scenes27';
import { pol18, reserveCents18 } from './policy18';
import { registerDeadline, type Deadline19 } from '../calendar19';

export const ROAD27_RNG = 'road27v1';
const rng = (s: GameState, t: string, day: number, part: string) => Rng.fromSeed(`${s.config.seed}|${ROAD27_RNG}|${t}|${day}|${part}`);
const today = (s: GameState) => s.day + s.clock.dayInMonth;
const cityL = (id: string): L => cityById[id]?.name ?? l(id, id);

// ---------------------------------------------------------------- estado (criado só quando o jogador usa)

export type RoadKind27 = 'van' | 'border' | 'promoter' | 'party' | 'press' | 'ill' | 'weather';
export interface RoadDone27 { k: RoadKind27; c: number; ok: boolean; auto?: 1; t: L; mods?: StopMods27; skip?: 1; who?: string }
export interface RoadTour27 { ev: Record<string, RoadDone27>; log: { d: number; t: L; tone: 'good' | 'bad' | 'info' }[] }
export interface Road27 { tours: Record<string, RoadTour27> }
export const road27 = (s: GameState): Road27 => {
  const x = s.x4 as unknown as { road27?: Road27 };
  return (x.road27 ??= { tours: {} });
};
export const isRoad27 = (s: GameState, tourId: string): boolean => !!(s.x4 as unknown as { road27?: Road27 }).road27?.tours[tourId];

// ---------------------------------------------------------------- 1. planejar no mapa

export interface StopView27 {
  cityId: string; day: number; date: { year: number; month: number; dom: number };
  km: number; travelDays: number; legCost: number; mode: string; visa: boolean; visaDeny: number;
  tier: number; capacity: number; price: number; demand: number; expSold: number; gross: number;
  econ: { buy: number; price: number; media: number; laws: L[]; country: L };
  scene?: { name: L; phase: L; k: number };
  localScene: number;
  weather: { label: L; risk: number };
  /** chance de um evento de estrada nesta data e os tipos mais prováveis */
  roadOdds: number; likely: RoadKind27[];
}
export interface Route27 { plan: TourPlan; est: TourEstimate; stops: StopView27[]; net: number; days: number }

/** Plano padrão de uma turnê jogável (mesmos defaults do planejador de sempre). */
export function basePlan27(s: GameState, actId: string, cities: string[], o: Partial<TourPlan> = {}): TourPlan {
  const act = s.acts[actId];
  const setlist = (act?.songs ?? []).map((id) => s.songs[id]).filter((x) => x?.recorded).sort((a, b) => b.q - a.q).slice(0, 15).map((x) => x.id);
  return { actId, cities, startInDays: 21, priceMult: 1, minutes: 60, setlist, production: 1, role: 'headline', crew: 4, pay: 'door', restEvery: 4, ...o };
}

/** Rota vista no mapa: cada parada com trecho, praça, economia, cena e risco de estrada. Pura. */
export function routeView27(s: GameState, plan: TourPlan): Route27 | null {
  const act = s.acts[plan.actId];
  if (!act || !plan.cities.length) return null;
  const est = estimateTour(s, plan);
  const people = activeMembers(s, act).length + Math.max(1, plan.crew);
  let prev = s.location[act.id] ?? act.city;
  const stops: StopView27[] = est.stops.map((st) => {
    const leg = legInfo(s, prev, st.cityId, people);
    prev = st.cityId;
    const e = cityEcon27(s, st.cityId);
    const sc = sceneDemand27(s, act, st.cityId);
    const demand = cityDemand(s, act, st.cityId);
    const expSold = Math.min(st.capacity, Math.round(demand / Math.pow(plan.priceMult, 1.2)));
    const date = dateOfDay(s.config.startYear, st.day);
    const clim = climateInfo(s, st.cityId, date.month);
    const ctx = ctx27(s, act, st, plan.kit?.move ?? 'bus', leg.days, clim.cancelRisk);
    return {
      cityId: st.cityId, day: st.day, date, km: leg.km, travelDays: leg.days, legCost: leg.cost, mode: leg.mode, visa: !!leg.visa?.needed, visaDeny: leg.visa?.denyChance ?? 0,
      tier: st.tier, capacity: st.capacity, price: st.price, demand, expSold, gross: expSold * st.price,
      econ: { buy: e.buy, price: e.price, media: e.media, laws: e.laws, country: countryName(countryOfCity(st.cityId)) },
      ...(sc.sc ? { scene: { name: sc.sc.name, phase: PH27[sc.sc.ph], k: sc.k } } : {}),
      localScene: Math.round((s.scenes[`${st.cityId}:${act.genre}`] ?? 0) * 10) / 10,
      weather: { label: clim.label, risk: clim.cancelRisk },
      roadOdds: ODDS27, likely: weights27(ctx).sort((a, b) => b[1] - a[1]).slice(0, 2).map((x) => x[0]),
    };
  });
  return { plan, est, stops, net: est.expectedRevenue + est.expectedMerch - est.logistics, days: est.days };
}

/** Marca a turnê pelo caminho de sempre (planTour) e liga os eventos de estrada nela. */
export function bookRoute27(s: GameState, plan: TourPlan): Tour | L {
  const r = planTour(s, plan);
  if ('id' in r) road27(s).tours[r.id] = { ev: {}, log: [] };
  return r;
}

// ---------------------------------------------------------------- 2. eventos de estrada

/** Chance de evento por data. */
export const ODDS27 = 0.45;
interface Ctx27 { s: GameState; act: Act; st: TourStop; move: string; travel: number; wx: number; fatigue: number; fame: number }
function ctx27(s: GameState, act: Act, st: TourStop, move: string, travel: number, wx: number): Ctx27 {
  const ms = activeMembers(s, act);
  const fatigue = ms.reduce((x, id) => x + (s.persons[id]?.fatigue ?? 0), 0) / Math.max(1, ms.length);
  return { s, act, st, move, travel, wx, fatigue, fame: act.fame };
}
function weights27(c: Ctx27): [RoadKind27, number][] {
  return ([
    ['van', c.move === 'fly' ? 0 : 2 + c.travel * 2],
    ['border', c.st.visa ? 6 : 0],
    ['promoter', 1.5],
    ['party', 1 + c.fame / 30],
    ['press', c.st.tier >= 1 ? 2 : 0.8],
    ['ill', 0.8 + c.fatigue / 25],
    ['weather', c.wx * 60 + 0.4],
  ] as [RoadKind27, number][]).filter((x) => x[1] > 0);
}

export interface Opt27b { id: string; label: L; hint: L; cost: number; p?: number; safe?: boolean; cancel?: boolean }
export interface RoadEv27 { tourId: string; day: number; k: RoadKind27; title: L; text: L; opts: Opt27b[]; who?: string }

const KIND_T27: Record<RoadKind27, L> = {
  van: l('Van quebrada', 'Broken van'), border: l('Fronteira', 'Border'), promoter: l('Data cancelada', 'Date cancelled'),
  party: l('Festa e groupies', 'Party and groupies'), press: l('Imprensa local', 'Local press'), ill: l('Doença na banda', 'Illness in the band'), weather: l('Temporal', 'Storm'),
};
export const roadKindName27 = (k: RoadKind27): L => KIND_T27[k];

function tourCtx(s: GameState, t: Tour, st: TourStop): Ctx27 | null {
  const act = s.acts[t.actId];
  if (!act) return null;
  const i = t.stops.indexOf(st);
  const prev = t.stops[i - 1]?.cityId ?? act.city;
  const leg = legInfo(s, prev, st.cityId, 1);
  return ctx27(s, act, st, t.kit18?.move ?? 'bus', leg.days, climateInfo(s, st.cityId, dateOfDay(s.config.startYear, st.day).month).cancelRisk);
}

/** O evento desta data (ou null). Puro: o sorteio é da própria data. */
export function roadEvent27(s: GameState, t: Tour, st: TourStop): RoadEv27 | null {
  if (!isRoad27(s, t.id)) return null;
  const c = tourCtx(s, t, st);
  if (!c) return null;
  const r = rng(s, t.id, st.day, 'ev');
  if (r.next() >= ODDS27) return null;
  const ws = weights27(c);
  let x = r.next() * ws.reduce((a, b) => a + b[1], 0);
  let k: RoadKind27 = ws[0][0];
  for (const [kk, w] of ws) { if ((x -= w) <= 0) { k = kk; break; } }
  const ms = activeMembers(s, c.act);
  const who = ms.length ? ms[Math.floor(r.next() * ms.length)] : undefined;
  return build27(s, t, st, k, who);
}

function build27(s: GameState, t: Tour, st: TourStop, k: RoadKind27, who?: string): RoadEv27 {
  const act = s.acts[t.actId];
  const people = activeMembers(s, act).length + t.crew;
  const tm = staffSkill(s, 'tour_manager');
  const legal = Math.max(staffSkill(s, 'legal'), staffSkill(s, 'agent'));
  const pub = staffSkill(s, 'publicist');
  const c = cityL(st.cityId);
  const v = { c, p: who ? s.persons[who]?.name ?? '' : '' };
  const base = { tourId: t.id, day: st.day, k, title: KIND_T27[k], who };
  const ins = t.kit18?.ins ? l(' O seguro da turnê devolve parte do prejuízo.', ' Tour insurance covers part of the loss.') : l('', '');
  switch (k) {
    case 'van': return { ...base, text: fmtL(l('A van quebra a caminho de {c}. O mecânico mais perto fica a 80 km.', 'The van breaks down on the way to {c}. The nearest mechanic is 80 km away.'), v), opts: [
      { id: 'rent', label: l('Alugar outra van', 'Rent another van'), hint: l('Chega a tempo; custa caro.', 'Arrives on time; pricey.'), cost: money(s, 220 + 45 * people), safe: true },
      { id: 'fix', label: l('Consertar no acostamento', 'Fix it on the roadside'), hint: l('Barato; se não der certo, chega atrasado e sem passagem de som.', 'Cheap; if it fails, late and no soundcheck.'), cost: money(s, 60), p: clamp(0.55 + tm / 250, 0.3, 0.9) },
      { id: 'drop', label: l('Desistir desta data', 'Drop this date'), hint: fmtL(l('Ninguém se arrisca; a data cai.{i}', 'No risk taken; the date is lost.{i}'), { i: ins }), cost: 0, cancel: true },
    ] };
    case 'border': return { ...base, text: fmtL(l('A papelada para entrar em {c} travou na fronteira.', 'The paperwork to enter {c} is stuck at the border.'), v), opts: [
      { id: 'fixer', label: l('Pagar um despachante', 'Pay a fixer'), hint: l('O visto sai com certeza.', 'The visa comes through for sure.'), cost: money(s, 250 + 30 * people), safe: true },
      { id: 'queue', label: l('Encarar a fila', 'Wait in line'), hint: l('Grátis; a recusa do visto continua possível.', 'Free; the visa may still be refused.'), cost: 0 },
      { id: 'bribe', label: l('Molhar a mão do guarda', 'Grease the guard\'s palm'), hint: l('Barato e rápido — se pegar mal, vira escândalo.', 'Cheap and fast — if it goes wrong, it\'s a scandal.'), cost: money(s, 120), p: clamp(0.6 + legal / 400, 0.4, 0.85) },
    ] };
    case 'promoter': {
      const lower = Math.max(0, st.tier - 1);
      return { ...base, text: fmtL(l('O promotor de {c} liga: a casa marcou outra atração na mesma noite.', 'The {c} promoter calls: the venue double-booked the night.'), v), opts: [
        { id: 'smaller', label: fmtL(l('Achar outra casa ({v})', 'Find another venue ({v})'), { v: VENUE_TIERS[lower].name }), hint: l('A data fica, num lugar menor.', 'The date stays, in a smaller room.'), cost: money(s, 150), safe: true },
        { id: 'press', label: l('Cobrar o contrato', 'Enforce the contract'), hint: l('Se colar, a noite fica como estava; se não, perde a data e o promotor fala mal.', 'If it sticks, the night stays as booked; if not, the date is lost and the promoter badmouths you.'), cost: 0, p: clamp(0.45 + legal / 250, 0.3, 0.85) },
        { id: 'accept', label: l('Aceitar e receber a multa', 'Accept and take the penalty fee'), hint: l('A data cai, mas a multa contratual entra no caixa.', 'The date is lost but the contract penalty is paid.'), cost: 0, cancel: true },
      ] };
    }
    case 'party': return { ...base, text: fmtL(l('Depois da passagem de som em {c}, a festa promete: fãs, groupies e um convite para o after.', 'After soundcheck in {c}, the party beckons: fans, groupies and an after-party invite.'), v), opts: [
      { id: 'bed', label: l('Hotel e cama cedo', 'Hotel and early night'), hint: l('Banda descansada; o pessoal reclama.', 'A rested band; some grumbling.'), cost: 0, safe: true },
      { id: 'meet', label: l('Encontro com os fãs', 'Meet the fans'), hint: l('Mais fãs fiéis; um pouco mais de cansaço.', 'More loyal fans; a bit more fatigue.'), cost: money(s, 40) },
      { id: 'party', label: l('Cair na festa', 'Hit the party'), hint: l('Moral lá em cima — e o risco de virar manchete.', 'Morale through the roof — and the risk of a headline.'), cost: 0, p: 0.7 },
    ] };
    case 'press': return { ...base, text: fmtL(l('A rádio e o jornal de {c} querem a banda no dia do show.', 'The {c} radio and paper want the band on show day.'), v), opts: [
      { id: 'skip', label: l('Poupar a voz', 'Save the voice'), hint: l('Show um pouco melhor; nada de imprensa.', 'A slightly better show; no press.'), cost: 0, safe: true },
      { id: 'acoustic', label: l('Sessão acústica na rádio', 'Acoustic radio session'), hint: l('Vende mais merch; cansa.', 'Sells more merch; tiring.'), cost: 0 },
      { id: 'interview', label: l('Entrevista polêmica', 'Edgy interview'), hint: l('Pode encher a casa — ou render uma gafe.', 'May pack the house — or cause a gaffe.'), cost: 0, p: clamp(0.65 + pub / 300, 0.5, 0.92) },
    ] };
    case 'ill': return { ...base, text: fmtL(l('{p} acorda com febre no dia do show em {c}.', '{p} wakes up feverish on show day in {c}.'), v), opts: [
      { id: 'doctor', label: l('Médico e remédio', 'Doctor and medicine'), hint: l('Sobe ao palco a meia força, sem risco.', 'Goes on at half strength, no risk.'), cost: money(s, 160), safe: true },
      { id: 'play', label: l('Tocar assim mesmo', 'Play anyway'), hint: l('Ninguém percebe — ou a pessoa desaba e fica de molho.', 'Nobody notices — or they collapse and need rest.'), cost: 0, p: 0.6 },
      { id: 'rest', label: l('Cancelar e descansar', 'Cancel and rest'), hint: fmtL(l('A data cai; a pessoa se recupera.{i}', 'The date is lost; they recover.{i}'), { i: ins }), cost: 0, cancel: true },
    ] };
    case 'weather': default: return { ...base, k: 'weather', title: KIND_T27.weather, text: fmtL(l('Previsão de temporal em {c} na noite do show.', 'A storm is forecast in {c} on show night.'), v), opts: [
      { id: 'cover', label: l('Pagar lona e gerador', 'Pay for cover and a generator'), hint: l('O show acontece normalmente.', 'The show goes on as normal.'), cost: money(s, 180 + st.tier * 160), safe: true },
      { id: 'rain', label: l('Tocar na chuva', 'Play in the rain'), hint: l('Show na chuva pode virar lenda — ou plateia rala e equipamento molhado.', 'A rain show may become legend — or a thin crowd and wet gear.'), cost: 0, p: 0.5 },
      { id: 'postpone', label: l('Cancelar a data', 'Cancel the date'), hint: fmtL(l('Sem risco para ninguém.{i}', 'No risk to anyone.{i}'), { i: ins }), cost: 0, cancel: true },
    ] };
  }
}

/** Datas com evento ainda sem decisão, nos próximos `days` dias (o que vem pela frente na estrada). */
export function pendingRoad27(s: GameState, days = 35): { t: Tour; st: TourStop; ev: RoadEv27 }[] {
  const out: { t: Tour; st: TourStop; ev: RoadEv27 }[] = [];
  const d0 = today(s);
  for (const t of s.tours) {
    if ((t.status !== 'planned' && t.status !== 'running') || !isRoad27(s, t.id)) continue;
    const R = road27(s).tours[t.id];
    for (const st of t.stops) {
      if (st.status !== 'scheduled' || st.day < d0 || st.day >= d0 + days || R.ev[st.day]) continue;
      const ev = roadEvent27(s, t, st);
      if (ev) out.push({ t, st, ev });
    }
  }
  return out.sort((a, b) => a.st.day - b.st.day);
}

/** Fora da política de gasto? (teto por ordem e reserva mínima do policy18 — leitura, sem registrar exceção) */
export function overPolicy27(s: GameState, cost: number): L | null {
  if (cost <= 0) return null;
  const P = pol18(s);
  if (P.cap > 0 && toReal(cost, s.year) > P.cap) return fmtL(l('acima do teto de gasto (US$ {c})', 'above the spending cap (US$ {c})'), { c: Math.round(P.cap) });
  const res = reserveCents18(s);
  if (res > 0 && s.player.cash - cost < res) return l('fura a reserva mínima de caixa', 'breaks the minimum cash reserve');
  return null;
}

/** A escolha que a equipe faria sozinha: gerente de turnê bom escolhe o maior valor esperado; sem ele, a segura.
 *  Gastos fora da política (policy18) ficam de fora. */
export function autoPick27(s: GameState, ev: RoadEv27): number {
  const ok = (o: Opt27b) => !overPolicy27(s, o.cost) && o.cost <= Math.max(0, s.player.cash);
  if (staffSkill(s, 'tour_manager') >= 50) {
    let best = -1, bv = -Infinity;
    ev.opts.forEach((o, i) => { if (!ok(o)) return; const v = ev27(o); if (v > bv) { bv = v; best = i; } });
    if (best >= 0) return best;
  }
  const safe = ev.opts.findIndex((o) => o.safe && ok(o));
  if (safe >= 0) return safe;
  const free = ev.opts.findIndex((o) => o.cost === 0 && !o.cancel);
  return free >= 0 ? free : ev.opts.findIndex((o) => o.cost === 0);
}
/** valor esperado grosseiro de uma opção (para a equipe e para a dica da interface) */
const EV27: Record<string, [number, number]> = {
  rent: [0.9, 0.9], fix: [1, 0.72], drop: [0, 0], fixer: [1, 1], queue: [0.9, 0.9], bribe: [1, 0.7], smaller: [0.75, 0.75], press: [1, 0], accept: [0.25, 0.25],
  bed: [0.98, 0.98], meet: [1.04, 1.04], party: [1.03, 0.92], skip: [1.02, 1.02], acoustic: [1.06, 1.06], interview: [1.1, 0.95],
  doctor: [0.95, 0.95], play: [0.97, 0.82], rest: [0.1, 0.1], cover: [1, 1], rain: [1.12, 0.78], postpone: [0.1, 0.1],
};
export const ev27 = (o: Opt27b): number => { const [g, b] = EV27[o.id] ?? [1, 1]; const p = o.p ?? 1; return p * g + (1 - p) * b - o.cost / 1e7; };

/** Resolve o evento de uma data com a opção `i`. Efeito imediato + ajustes da noite guardados para o playStop. */
export function resolveRoad27(s: GameState, tourId: string, day: number, i: number, auto = false): RoadDone27 | L {
  const t = s.tours.find((x) => x.id === tourId);
  const st = t?.stops.find((x) => x.day === day);
  if (!t || !st || !isRoad27(s, t.id)) return l('Data não encontrada.', 'Date not found.');
  if (st.status !== 'scheduled') return l('Esta data já passou.', 'This date has passed.');
  const R = road27(s).tours[t.id];
  if (R.ev[day]) return l('Já decidido.', 'Already decided.');
  const ev = roadEvent27(s, t, st);
  if (!ev) return l('Nada aconteceu nesta data.', 'Nothing happened on this date.');
  const o = ev.opts[i];
  if (!o) return l('Opção inválida.', 'Invalid option.');
  if (o.cost > 0 && s.player.cash < o.cost) return l('Caixa insuficiente.', 'Not enough cash.');
  const act = s.acts[t.actId];
  const ok = o.p === undefined ? true : rng(s, t.id, day, 'roll').next() < o.p;
  const c = cityL(st.cityId);
  const cityTxt = c;
  if (o.cost > 0) post(s, `road27:${t.id}:${day}`, -o.cost, 'live_costs', `Estrada: ${o.label.pt} (${cityTxt.pt})`);
  const who = ev.who ? s.persons[ev.who] : undefined;
  const ins = !!t.kit18?.ins;
  let mods: StopMods27 | undefined;
  let txt: L;
  let skip = false;
  let tone: 'good' | 'bad' | 'info' = 'info';
  const refund = (k: number) => { if (!ins) return 0; const v = Math.round(st.capacity * st.price * 0.35 * k); if (v) post(s, `road27ins:${t.id}:${day}`, v, 'other_income', `Seguro de turnê (${cityTxt.pt})`); return v; };
  switch (o.id) {
    case 'rent': txt = l('Van alugada: a banda chega a tempo, com o bolso mais leve.', 'Van rented: the band arrives on time, wallet lighter.'); break;
    case 'fix': if (ok) { mods = { fatigue: 2 }; txt = l('O conserto segurou: chegaram em cima da hora.', 'The fix held: they made it just in time.'); } else { mods = { qMult: 0.86, fatigue: 5, morale: -2 }; tone = 'bad'; txt = l('O conserto não segurou: chegaram atrasados, sem passagem de som — show abaixo do normal.', 'The fix failed: they arrived late with no soundcheck — a below-par show.'); } break;
    case 'fixer': st.visa = false; tone = 'good'; txt = l('O despachante resolveu: visto carimbado.', 'The fixer sorted it: visa stamped.'); break;
    case 'queue': txt = l('Fila na fronteira: o visto ainda pode ser recusado no dia.', 'Border queue: the visa may still be refused on the day.'); break;
    case 'bribe':
      if (ok) { st.visa = false; txt = l('O guarda olhou para o outro lado: passaram.', 'The guard looked the other way: they got through.'); }
      else {
        tone = 'bad';
        s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100);
        emitFact(s, { kind: 'scandal', actors: [act.id, 'player'], place: st.cityId, severity: 30, visibility: 'public', tags: ['bad', 'tour', 'bribe', 'road27'], src: 'road27', text: fmtL(l('Equipe de {a} flagrada tentando subornar guarda de fronteira a caminho de {c}.', '{a}\'s crew caught trying to bribe a border guard on the way to {c}.'), { a: act.name, c }) });
        txt = l('O guarda não aceitou e chamou o chefe: escândalo, e o visto ainda pode cair.', 'The guard refused and called his boss: a scandal, and the visa may still fall.');
      }
      break;
    case 'smaller': {
      const lower = Math.max(0, st.tier - 1);
      if (lower < st.tier) {
        const ratio = st.price / Math.max(1, money(s, TICKET[st.tier]));
        st.tier = lower; st.capacity = Math.round((VENUE_TIERS[lower].cap[0] + VENUE_TIERS[lower].cap[1]) / 2); st.price = money(s, TICKET[lower] * ratio);
      }
      txt = fmtL(l('Nova casa em {c}: {v}, menor, mas a data está de pé.', 'New venue in {c}: {v}, smaller, but the date stands.'), { c, v: VENUE_TIERS[st.tier].name });
      break;
    }
    case 'press':
      if (ok) { tone = 'good'; txt = l('O contrato falou mais alto: a outra atração saiu, a noite é sua.', 'The contract won: the other act is out, the night is yours.'); }
      else { skip = true; tone = 'bad'; s.player.reputation.institutional = clamp(s.player.reputation.institutional - 1, 0, 100); txt = l('O promotor bateu o pé: data perdida e fama de encrenqueiro no circuito.', 'The promoter dug in: date lost and a troublemaker reputation on the circuit.'); }
      break;
    case 'accept': { skip = true; const v = Math.round(st.capacity * st.price * 0.15); if (v) post(s, `road27fee:${t.id}:${day}`, v, 'live', `Multa do promotor (${cityTxt.pt})`); txt = l('Data cancelada; a multa contratual cobre parte da noite perdida.', 'Date cancelled; the contract penalty covers part of the lost night.'); break; }
    case 'drop': case 'rest': case 'postpone': {
      skip = true; const v = refund(o.id === 'rest' ? 1 : 0.8);
      if (o.id === 'rest' && who) who.fatigue = clamp(who.fatigue - 15, 0, 100);
      txt = v ? l('Data cancelada; o seguro da turnê cobriu parte da perda.', 'Date cancelled; tour insurance covered part of the loss.') : l('Data cancelada, sem seguro para cobrir.', 'Date cancelled, no insurance to cover it.');
      tone = v ? 'info' : 'bad';
      break;
    }
    case 'bed': mods = { fatigue: -4, morale: -1 }; txt = l('Cama cedo: banda inteira no palco.', 'Early night: the whole band in shape.'); break;
    case 'meet': mods = { fans: 1.08, fatigue: 2 }; tone = 'good'; txt = l('Encontro com os fãs: fila na porta e boca a boca.', 'Meet & greet: a queue at the door and word of mouth.'); break;
    case 'party':
      if (ok) { mods = { morale: 4, fatigue: 6 }; tone = 'good'; txt = l('Festa lendária e ninguém foi parar no jornal: moral lá em cima.', 'A legendary party and nobody made the papers: morale sky-high.'); }
      else {
        mods = { morale: 2, fatigue: 8, qMult: 0.95 }; tone = 'bad';
        emitFact(s, { kind: 'scandal', actors: [act.id], place: st.cityId, severity: 25, visibility: 'public', tags: ['bad', 'tour', 'party', 'road27'], src: 'road27', text: fmtL(l('Festa da turnê de {a} em {c} termina com polícia na porta do hotel.', '{a}\'s tour party in {c} ends with police at the hotel door.'), { a: act.name, c }) });
        txt = l('A festa saiu do controle: polícia no hotel, manchete no dia seguinte e ressaca no palco.', 'The party got out of hand: police at the hotel, a headline next day and a hungover show.');
      }
      break;
    case 'skip': mods = { qMult: 1.03 }; txt = l('Voz poupada: o show sai um pouco melhor.', 'Voice saved: a slightly better show.'); break;
    case 'acoustic': mods = { merch: 1.15, fatigue: 3 }; tone = 'good'; txt = l('Sessão acústica na rádio: a cidade inteira ouviu, o merch voou.', 'Acoustic radio session: the whole town heard it, merch flew.'); break;
    case 'interview':
      if (ok) { mods = { fans: 1.12, fame: 0.05 }; tone = 'good'; txt = l('A entrevista bombou: casa cheia de curiosos.', 'The interview blew up: a house full of the curious.'); }
      else {
        mods = { fans: 0.95 }; tone = 'bad';
        emitFact(s, { kind: 'statement', actors: [act.id], place: st.cityId, severity: 20, visibility: 'public', tags: ['bad', 'press', 'gaffe', 'road27'], src: 'road27', text: fmtL(l('{a} solta frase infeliz na rádio de {c}.', '{a} drops an unfortunate line on {c} radio.'), { a: act.name, c }) });
        txt = l('Gafe na rádio: parte da cidade torceu o nariz.', 'A radio gaffe: part of the town turned its nose up.');
      }
      break;
    case 'doctor': mods = { qMult: 0.96 }; txt = l('Remédio e repouso até a hora do show: meia força, sem risco.', 'Medicine and rest until showtime: half strength, no risk.'); break;
    case 'play':
      if (ok) { mods = { qMult: 0.97 }; txt = l('Tocou com febre e ninguém percebeu.', 'Played feverish and nobody noticed.'); }
      else { mods = { qMult: 0.84, fatigue: 4 }; tone = 'bad'; if (who) who.health = 'recovering'; txt = l('Desabou no meio do show: show curto e semanas de molho.', 'Collapsed mid-show: a short set and weeks of rest.'); }
      break;
    case 'cover': txt = l('Lona e gerador: o temporal passou e o show aconteceu.', 'Cover and generator: the storm passed and the show went on.'); break;
    case 'rain':
      if (ok) { mods = { fans: 1.15, fame: 0.05 }; tone = 'good'; txt = l('Show debaixo de chuva: ninguém foi embora e virou lenda.', 'A show in the pouring rain: nobody left and it became legend.'); }
      else { mods = { qMult: 0.8, merch: 0.7 }; tone = 'bad'; const v = refund(0.3); txt = v ? l('Plateia rala e equipamento molhado; o seguro cobriu parte.', 'A thin crowd and wet gear; insurance covered part.') : l('Plateia rala e equipamento molhado.', 'A thin crowd and wet gear.'); }
      break;
    default: txt = l('—', '—');
  }
  const done: RoadDone27 = { k: ev.k, c: i, ok, t: txt, ...(auto ? { auto: 1 as const } : {}), ...(mods ? { mods } : {}), ...(skip ? { skip: 1 as const } : {}), ...(ev.who ? { who: ev.who } : {}) };
  R.ev[day] = done;
  if (skip) {
    st.status = 'cancelled';
    st.note = fmtL(l('{k}: data cancelada', '{k}: date cancelled'), { k: KIND_T27[ev.k] });
    s.daily.push({ day, kind: 'tour', actId: act.id, tone: 'bad', text: fmtL(l('{a}: data em {c} cancelada na estrada ({k}).', '{a}: {c} date cancelled on the road ({k}).'), { a: act.name, c, k: KIND_T27[ev.k] }) });
    if (t.stops.every((x) => x.status !== 'scheduled')) t.status = t.stops.some((x) => x.status === 'played') ? 'running' : 'cancelled';
  }
  R.log.unshift({ d: day, t: fmtL(l('{c} — {k}: {o}. {x}', '{c} — {k}: {o}. {x}'), { c, k: KIND_T27[ev.k], o: o.label, x: txt }), tone });
  if (R.log.length > 30) R.log.length = 30;
  return done;
}

// gancho: antes de cada data de uma turnê de estrada, a equipe decide o que o jogador não decidiu
STOP27.pre = (s, t, st) => {
  if (!isRoad27(s, t.id)) return undefined;
  const R = road27(s).tours[t.id];
  let d = R.ev[st.day];
  if (!d) {
    const ev = roadEvent27(s, t, st);
    if (!ev) return undefined;
    const i = autoPick27(s, ev);
    const r = i >= 0 ? resolveRoad27(s, t.id, st.day, i, true) : null;
    if (!r || !('k' in r)) return undefined;
    d = r;
  }
  if (d.skip || st.status !== 'scheduled') return 'skip';
  return d.mods;
};

/** Resumo de uma turnê de estrada (interface): datas com evento, decididas por você × pela equipe. */
export function roadSummary27(s: GameState, tourId: string): { events: number; mine: number; auto: number; skipped: number } {
  const R = road27(s).tours[tourId];
  if (!R) return { events: 0, mine: 0, auto: 0, skipped: 0 };
  const v = Object.values(R.ev);
  return { events: v.length, mine: v.filter((x) => !x.auto).length, auto: v.filter((x) => x.auto).length, skipped: v.filter((x) => x.skip).length };
}

// r31 (UNI-1): calendário único — datas da estrada com evento ainda sem decisão (puro: o sorteio é o da própria data).
registerDeadline('road27', (s, from, to) => {
  if (!(s.x4 as unknown as { road27?: Road27 }).road27) return [];
  const days = Math.max(7, Math.min(26 * 7, (to - s.week + 1) * 7));
  const out: Deadline19[] = [];
  for (const { t, st, ev } of pendingRoad27(s, days)) {
    const w = Math.floor(st.day / 7);
    if (w < from || w > to) continue;
    out.push({ id: `r27:${t.id}:${st.day}`, w, kind: 'tour', t: fmtL(l('Na estrada ({c}): {k}', 'On the road ({c}): {k}'), { c: cityL(st.cityId), k: ev.title }), d: l('Sem escolha sua, a equipe decide sozinha.', 'Without your call, the crew decides.'), tone: 'bad', act: true, goto: { area: 'shows' } });
  }
  return out;
});
