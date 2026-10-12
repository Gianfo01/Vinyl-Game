// Rodada 23 — TALENTOS em três verbos: PROCURAR (ações ativas com custo, duração e rendimento esperado),
// FUNIL (Rumor → Observado → Acompanhado → Audição → Pronto para propor, com um próximo passo por card) e
// DECIDIR (comparar até três e abrir a proposta). Aqui fica a parte de simulação:
//  - viagem de olheiro a uma CENA (cidade + família de gênero): N nomes chegam ao longo das semanas;
//  - chamada de demos: algumas demos chegam nas semanas seguintes;
//  - próximo passo do funil com custo e tempo (o relatório chega depois, não na hora);
//  - texto de origem ("visto no clube X por Fulano, semana 12"), incerteza (? / ~ a–b / ✓ x) e aviso de rival.
// Estado novo em x4.scout23; campos novos de Knowledge são opcionais (saves antigos continuam válidos).

import { Rng, clamp } from '../../core/rng';
import { CITIES, GENRES, MARKETS, cityById, familyOf, l, type L, type MarketId } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { estimate, scoutActionsPerMonth, scoutCost, sourceName } from '../scouting';
import { scoutEligible20, signalEligible20 } from '../scout20';
import type { Act, GameState, Knowledge } from '../types';
import { dateOfDay, dayOfDate, fmtL, money, nextId, notify, post } from '../util';
import { addSignal, spawnProceduralAct } from '../worldgen';
import { cashWhy20, freeCash20 } from '../oblig20';
import { CH18, disc18 } from './discover18';
import { energyLeft, spendEnergy } from './life';

export interface Trip23 {
  id: string;
  kind: 'scene' | 'demo';
  city?: string;
  market: MarketId;
  fam: string;
  by: string;
  scoutId?: string;
  skill: number;
  start: number;
  until: number;
  target: number;
  found: string[];
}
export interface Scout23State { trips: Trip23[]; log: { w: number; t: L }[] }
declare module '../ext4' { interface Ext4 { scout23: Scout23State } }
const fresh = (): Scout23State => ({ trips: [], log: [] });
registerExt4('scout23', fresh);
export function scout23(s: GameState): Scout23State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.scout23 ??= fresh()) as Scout23State;
  st.trips ??= [];
  st.log ??= [];
  return st;
}
function log(s: GameState, t: L): void {
  const st = scout23(s);
  st.log.push({ w: s.week, t });
  if (st.log.length > 30) st.log.shift();
}

const homeMarket = (s: GameState): MarketId => cityById[s.config.homeCity]?.market as MarketId;
const famName = (id: string): L => (id === 'any' ? l('qualquer gênero', 'any genre') : l(id.replace(/_/g, ' ')));

// ---------------------------------------------------------------- PROCURAR: olheiro numa cena

/** Olheiros da equipe livres (sem missão antiga nem viagem r23). */
export function freeScouts23(s: GameState) {
  const busy = new Set(scout23(s).trips.map((x) => x.scoutId).filter(Boolean));
  return s.scouts.filter((sc) => !sc.mission && !busy.has(sc.id));
}

export interface Quote23 { cost: number; weeks: number; n: number; deg: number; by: string; skill: number }
/** Orçamento de mandar alguém a uma cena: freelancer (sem equipe) ou olheiro da casa (só a viagem). */
export function sceneQuote23(s: GameState, city: string, fam: string, scoutId?: string): Quote23 {
  const c = cityById[city];
  const home = c?.market === homeMarket(s);
  const sc = scoutId ? s.scouts.find((x) => x.id === scoutId) : undefined;
  const skill = sc?.skill ?? 45;
  const onSpec = !sc || fam === 'any' || fam === sc.family;
  const local = !sc || sc.region === c?.market;
  const weeks = (home ? 3 : 5) + (local ? 0 : 1);
  const cost = money(s, sc ? (home ? 200 : 900) : home ? 900 : 2200);
  const n = (sc ? 1 + Math.floor(skill / 35) : 2) + (onSpec ? 0 : -1) + (fam === 'any' ? 1 : 0);
  return { cost, weeks, n: Math.max(1, n), deg: skill >= 75 ? 3 : 2, by: sc?.name ?? '', skill };
}

/** Manda um olheiro (ou um freelancer) a uma cena: os nomes chegam semana a semana. */
export function startSceneTrip23(s: GameState, city: string, fam: string, scoutId?: string): L | null {
  const c = cityById[city];
  if (!c) return l('Cidade inválida.', 'Invalid city.');
  if (scoutId && !freeScouts23(s).some((x) => x.id === scoutId)) return l('Esse olheiro já está em campo.', 'That scout is already in the field.');
  const q = sceneQuote23(s, city, fam, scoutId);
  if (freeCash20(s) < q.cost) return cashWhy20(s, q.cost, l('Caixa insuficiente.', 'Not enough cash.'));
  const st = scout23(s);
  const id = nextId(s, 'tr23');
  post(s, `trip23:${id}`, -q.cost, 'scouting', `Cena ${c.name.pt}`);
  const by = q.by || fmtL(l('freelancer de {c}', '{c} freelancer'), { c: c.name }).pt;
  st.trips.push({ id, kind: 'scene', city, market: c.market as MarketId, fam, by, scoutId, skill: q.skill, start: s.week, until: s.week + q.weeks, target: q.n, found: [] });
  log(s, fmtL(l('{b} foi para a cena de {c} ({f}).', '{b} went to the {c} scene ({f}).'), { b: by, c: c.name, f: famName(fam) }));
  return null;
}

// ---------------------------------------------------------------- PROCURAR: chamada de demos

export function demoCallQuote23(s: GameState): Quote23 {
  return { cost: money(s, 300), weeks: 3, n: 2 + (s.player.reputation.artists > 40 ? 1 : 0), deg: 2, by: '', skill: 40 };
}
export function demoCallOpen23(s: GameState): boolean {
  return scout23(s).trips.some((x) => x.kind === 'demo');
}
/** Anúncio "mande sua demo": demos chegam nas próximas semanas (região de casa, gênero escolhido). */
export function openDemoCall23(s: GameState, fam: string): L | null {
  if (demoCallOpen23(s)) return l('Já há uma chamada de demos aberta.', 'A demo call is already open.');
  const q = demoCallQuote23(s);
  if (freeCash20(s) < q.cost) return cashWhy20(s, q.cost, l('Caixa insuficiente.', 'Not enough cash.'));
  const id = nextId(s, 'tr23');
  post(s, `demo23:${id}`, -q.cost, 'scouting', 'Chamada de demos');
  scout23(s).trips.push({ id, kind: 'demo', market: homeMarket(s), fam, by: s.config.companyName, skill: 40, start: s.week, until: s.week + q.weeks, target: q.n, found: [] });
  log(s, fmtL(l('Chamada de demos aberta ({f}).', 'Demo call opened ({f}).'), { f: famName(fam) }));
  return null;
}

function genreFor(s: GameState, r: Rng, fam: string): string | undefined {
  if (fam === 'any') return undefined;
  const gs = GENRES.filter((g) => familyOf(g.id) === fam && g.born <= s.year);
  return gs.length ? r.pick(gs).id : undefined;
}

function tripFind(s: GameState, r: Rng, tr: Trip23): Act | undefined {
  const cands = Object.values(s.acts).filter((a) => signalEligible20(s, a) && (tr.city ? a.city === tr.city : cityById[a.city]?.market === tr.market) && (tr.fam === 'any' || familyOf(a.genre) === tr.fam));
  // olheiro bom enxerga potencial; o mediano vai atrás de quem já faz barulho
  const a = cands.length && r.chance(0.75) ? r.weighted(cands, (x) => 1 + (x.potential / 40) * (tr.skill / 60) + x.fame / 30) : undefined;
  if (a) return a;
  const city = tr.city ?? r.pick(CITIES.filter((c) => c.market === tr.market)).id;
  return spawnProceduralAct(s, r, { city, genre: genreFor(s, r, tr.fam) });
}

function tripWeek(s: GameState, tr: Trip23): void {
  const span = Math.max(1, tr.until - tr.start);
  const due = Math.min(tr.target, Math.ceil(tr.target * clamp((s.week - tr.start) / span, 0, 1)));
  const r = Rng.fromSeed(`${s.config.seed}|scout23|${tr.id}|${s.week}`);
  while (tr.found.length < due) {
    const a = tripFind(s, r, tr);
    if (!a || s.knowledge[a.id]) break;
    const where = tr.kind === 'demo' ? l('chamada de demos', 'demo call') : fmtL(l('cena de {c}', '{c} scene'), { c: cityById[a.city]?.name ?? a.city });
    addSignal(s, r, a.id, tr.kind === 'demo' ? 'demo' : 'scene23', { by: tr.by, at: where, city: a.city });
    const k = s.knowledge[a.id];
    k.degree = tr.kind === 'demo' ? 2 : tr.skill >= 75 ? 3 : 2;
    k.stage = 'monitoring';
    k.bias = r.normal(0, tr.kind === 'demo' ? 10 : Math.max(2, 12 - tr.skill / 10));
    tr.found.push(a.id);
    log(s, fmtL(l('{b}: nome novo — {a}.', '{b}: new name — {a}.'), { b: tr.by, a: a.name }));
  }
}

/** Semana: viagens trazem nomes; passos do funil terminam. Exportada para os testes. */
export function scout23Week(s: GameState): void {
  const st = scout23(s);
  for (const tr of st.trips) tripWeek(s, tr);
  const done = st.trips.filter((x) => s.week >= x.until);
  for (const tr of done) {
    const sc = tr.scoutId ? s.scouts.find((x) => x.id === tr.scoutId) : undefined;
    if (sc) sc.found += tr.found.length;
    notify(s, tr.kind === 'demo' ? fmtL(l('Chamada de demos encerrada: {k} demo(s) no funil.', 'Demo call closed: {k} demo(s) in the funnel.'), { k: tr.found.length })
      : fmtL(l('{n} voltou da cena de {c} com {k} nome(s).', '{n} came back from the {c} scene with {k} name(s).'), { n: tr.by, c: cityById[tr.city ?? '']?.name ?? '?', k: tr.found.length }), 'info');
  }
  st.trips = st.trips.filter((x) => s.week < x.until);
  // relatórios pedidos no funil chegam
  for (const k of Object.values(s.knowledge)) {
    if (!k.pend23 || k.pend23.until > s.week) continue;
    const to = k.pend23.to;
    delete k.pend23;
    const a = s.acts[k.actId];
    if (!a || (a.owner && a.owner !== 'player')) continue;
    const r = Rng.fromSeed(`${s.config.seed}|step23|${k.actId}|${s.week}`);
    k.degree = Math.max(k.degree, to);
    k.updatedWeek = s.week;
    k.bias = k.bias * 0.6 + r.normal(0, 3);
    if (k.stage === 'signal' && k.degree >= 2) k.stage = 'monitoring';
    if (k.degree >= 3 && (k.stage === 'monitoring' || k.stage === 'signal')) k.stage = 'investigating';
    log(s, fmtL(l('Relatório de {a} chegou: {d}.', 'Report on {a} arrived: {d}.'), { a: a.name, d: COLS23[colOfDegree(k.degree)].name }));
  }
}
registerSimHook('week', 'scout23', scout23Week);

// ---------------------------------------------------------------- FUNIL

export type Col23 = 'rumor' | 'observed' | 'followed' | 'audition' | 'ready';
export const COLS23: Record<Col23, { name: L; desc: L }> = {
  rumor: { name: l('Rumor', 'Rumor'), desc: l('Só um nome e de onde veio.', 'Just a name and where it came from.') },
  observed: { name: l('Observado', 'Observed'), desc: l('Alguém viu: talento e habilidades em faixa larga.', 'Someone saw them: talent and skills in a wide range.') },
  followed: { name: l('Acompanhado', 'Followed'), desc: l('Vários relatórios: potencial e ambição aparecem.', 'Several reports: potential and ambition show up.') },
  audition: { name: l('Audição', 'Audition'), desc: l('Audição ou conversa marcada.', 'Audition or talk booked.') },
  ready: { name: l('Pronto para propor', 'Ready to offer'), desc: l('Você sabe o bastante. Proponha (ou já propôs).', 'You know enough. Make an offer (or already did).') },
};
export const COL_ORDER23: Col23[] = ['rumor', 'observed', 'followed', 'audition', 'ready'];
const colOfDegree = (d: number): Col23 => (d >= 4 ? 'ready' : d === 3 ? 'followed' : d === 2 ? 'observed' : 'rumor');

export function column23(s: GameState, k: Knowledge): Col23 {
  if (s.offers.some((o) => o.actId === k.actId && (o.status === 'pending' || o.status === 'counter'))) return 'ready';
  if (k.pend23?.to === 4 && k.degree < 4) return 'audition';
  return colOfDegree(k.degree);
}

export interface Step23 { to: number; label: L; cost: number; weeks: number; balls: number; ok: boolean; why?: L; until?: number }
const STEPS: { label: L; weeks: number; balls: number }[] = [
  { label: l('Observar mais', 'Observe more'), weeks: 1, balls: 0 },
  { label: l('Acompanhar', 'Follow up'), weeks: 2, balls: 0 },
  { label: l('Chamar para audição', 'Call for an audition'), weeks: 1, balls: 1 },
];

/** Próximo passo do card: custo, tempo, bolinhas — e se dá para fazer agora. null = já está pronto para propor. */
export function nextStep23(s: GameState, actId: string): Step23 | null {
  const k = s.knowledge[actId];
  if (!k || k.degree >= 4) return null;
  const st = STEPS[clamp(k.degree, 1, 3) - 1];
  const out: Step23 = { to: k.degree + 1, label: st.label, cost: scoutCost(s, k.degree), weeks: st.weeks, balls: st.balls, ok: true };
  const el = scoutEligible20(s, s.acts[actId]);
  if (k.pend23) return { ...out, ok: false, until: k.pend23.until, why: fmtL(l('Relatório a caminho (semana {w}).', 'Report on the way (week {w}).'), { w: k.pend23.until }) };
  if (!el.ok) return { ...out, ok: false, why: el.why };
  if (s.scoutActionsUsed >= scoutActionsPerMonth(s)) return { ...out, ok: false, why: l('Sem ações de A&R neste mês.', 'No A&R actions left this month.') };
  if (st.balls && energyLeft(s) < st.balls) return { ...out, ok: false, why: l('Sem tempo livre (bolinhas) neste mês.', 'No free time (energy) left this month.') };
  if (freeCash20(s) < out.cost) return { ...out, ok: false, why: cashWhy20(s, out.cost, l('Caixa insuficiente.', 'Not enough cash.')) };
  return out;
}

export function startStep23(s: GameState, actId: string): L | null {
  const st = nextStep23(s, actId);
  if (!st) return l('Já está pronto para propor.', 'Already ready to offer.');
  if (!st.ok) return st.why ?? l('Indisponível.', 'Unavailable.');
  if (st.balls) { const e = spendEnergy(s, st.balls); if (e) return e; }
  post(s, `step23:${actId}:${st.to}`, -st.cost, 'scouting', `Scouting ${s.acts[actId].name}`);
  s.scoutActionsUsed += 1;
  s.knowledge[actId].pend23 = { to: st.to, until: s.week + st.weeks };
  return null;
}

// ---------------------------------------------------------------- origem, incerteza, rivais

const PUBLIC = new Set(['contest', 'tv_talent', 'viral', 'showcase', 'd18:tiktok', 'd18:youtube', 'd18:myspace', 'd18:festival', 'd18:college']);

/** "visto na cena de Recife por Ana, semana 12" — em uma linha, com o que se sabe. */
export function originText23(s: GameState, k: Knowledge): L {
  const o = k.origin ?? { src: k.source, w: k.updatedWeek };
  const city = o.city ? cityById[o.city]?.name : undefined;
  const d18 = o.src.startsWith('d18:') ? CH18.find((c) => c.id === o.src.slice(4))?.name : undefined;
  const at = o.at ?? d18 ?? sourceName(o.src);
  const parts: L[] = [fmtL(l('visto em {a}', 'seen at {a}'), { a: at })];
  if (city && !(at.pt.includes(city.pt))) parts.push(fmtL(l('({c})', '({c})'), { c: city }));
  if (o.by) parts.push(fmtL(l('por {b}', 'by {b}'), { b: o.by }));
  // semana do ano + ano (a semana absoluta não diz nada ao jogador)
  const d = dateOfDay(s.config.startYear, o.w * 7);
  const wy = Math.floor((o.w * 7 - dayOfDate(s.config.startYear, d.year, 0)) / 7) + 1;
  parts.push(fmtL(l(', semana {w} de {y}', ', week {w} of {y}'), { w: Math.max(1, wy), y: d.year }));
  return { pt: parts.map((x) => x.pt).join(' ').replace(' ,', ','), en: parts.map((x) => x.en).join(' ').replace(' ,', ',') };
}

/** Fonte agrupada para filtros e para o boca a boca. */
export const isPassive23 = (k: Knowledge): boolean => !['scout', 'scene23', 'contest', 'watch', 'friend'].includes((k.origin?.src ?? k.source)) && !(k.origin?.src ?? k.source).startsWith('d18:') && !(k.origin?.by);

export type Unc23 = { kind: '?' } | { kind: '~'; lo: number; hi: number } | { kind: '✓'; v: number };
/** Incerteza única para todo atributo: ? (desconhecido), ~ a–b (faixa estimada), ✓ x (confirmado). */
export function unc23(s: GameState, actId: string, field: 'fame' | 'talent' | 'potential'): Unc23 {
  const e = estimate(s, actId, field);
  if (!e) return { kind: '?' };
  if (e.hi - e.lo <= 4) return { kind: '✓', v: e.mid };
  return { kind: '~', lo: e.lo, hi: e.hi };
}
export const uncText23 = (u: Unc23): string => (u.kind === '?' ? '?' : u.kind === '✓' ? `✓ ${u.v}` : `~ ${u.lo}–${u.hi}`);

export interface Rival23 { label?: string; weeks?: number; hard: boolean; text: L }
/** Rival de olho: disputa aberta (descoberta pública ou leilão) ou risco por canal público. */
export function rivalWatch23(s: GameState, actId: string): Rival23 | null {
  const a = s.acts[actId];
  if (!a || a.owner) return null;
  const hot = disc18(s).hot[actId];
  if (hot && s.labels[hot.lb]) {
    const w = Math.max(0, hot.w - s.week);
    return { label: s.labels[hot.lb].name, weeks: w, hard: true, text: fmtL(l('{l} também está de olho: assina em ~{w} sem.', '{l} is circling too: signs in ~{w} wk.'), { l: s.labels[hot.lb].name, w }) };
  }
  const au = s.auctions.find((x) => x.actId === actId && x.status === 'open');
  const rb = au?.bids.find((b) => b.party !== 'player');
  if (au && rb) return { label: s.labels[rb.party]?.name, hard: true, text: fmtL(l('{l} disputa no leilão (até sem. {w}).', '{l} is bidding (until wk {w}).'), { l: s.labels[rb.party]?.name ?? '?', w: au.endsWeek }) };
  const k = s.knowledge[actId];
  const src = k?.origin?.src ?? k?.source ?? '';
  if (PUBLIC.has(src) && (a.fame >= 8 || a.potential >= 60)) return { hard: false, text: l('Achado em canal público: rivais podem ter visto.', 'Found on a public channel: rivals may have seen it.') };
  return null;
}

/** Idade do relatório em meses e se já está velho (relatórios envelhecem e podem perder grau). */
export function reportAge23(s: GameState, k: Knowledge): { months: number; stale: boolean } {
  const months = Math.round((s.week - k.updatedWeek) / 4.35);
  return { months, stale: months >= 6 };
}

/** Rótulos de mercado para a UI. */
export const marketName23 = (id: string): L => MARKETS.find((m) => m.id === id)?.name ?? l(id);
