// Rodada 23 — TALENTOS em três verbos: PROCURAR (ações ativas com custo, duração e rendimento esperado),
// FUNIL (Rumor → Observado → Acompanhado → Audição → Pronto para propor, com um próximo passo por card) e
// DECIDIR (comparar até três e abrir a proposta). Aqui fica a parte de simulação:
//  - viagem de olheiro a uma CENA (cidade + família de gênero): N nomes chegam ao longo das semanas;
//  - chamada de demos: algumas demos chegam nas semanas seguintes;
//  - próximo passo do funil com custo e tempo (o relatório chega depois, não na hora);
//  - texto de origem ("visto no clube X por Fulano, semana 12"), incerteza (? / ~ a–b / ✓ x) e aviso de rival.
// r27 (AUD1): é o ÚNICO motor de scouting ativo. Absorveu o que havia de bom nos antigos:
//  - a missão de olheiro da equipe (scout11): viagem a um MERCADO inteiro com duração escolhida (4/8/12 semanas),
//    e os relatórios das pistas sobem de grau semana a semana durante a missão (até o grau máximo da missão);
//  - o pedido de scout com filtros (scouting.requestScout): a viagem aceita nível (iniciante/promissor) e formato
//    (banda/solo) sem "relaxar" filtros — sem ninguém no mundo, nasce um ato que obedece; senão, sem resultado;
//  - o aprofundar na hora (scouting.scoutAct) virou o próximo passo do funil (startStep23), com o mesmo custo.
// scouting.ts guarda o conhecimento (graus, estimativas, boca a boca mensal); scout11 só a observação/comparação.
// O bot usa as mesmas funções da tela Talentos. A noite de olheiro jogável fica em night27.ts.

import { Rng, clamp } from '../../core/rng';
import { CITIES, GENRES, MARKETS, cityById, familyOf, l, type L, type MarketId } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { estimate, scoutActionsPerMonth, scoutCost, sourceName } from '../scouting';
import { matchesReq20, scoutEligible20, signalEligible20, spawnPlanForReq20 } from '../scout20';
import type { Act, GameState, Knowledge } from '../types';
import type { Scout } from '../xtypes';
import { dateOfDay, dayOfDate, fmtL, money, nextId, notify, post } from '../util';
import { addSignal, spawnProceduralAct } from '../worldgen';
import { cashWhy20, freeCash20 } from '../oblig20';
import { CH18, disc18 } from './discover18';
import { energyLeft, spendEnergy } from './life';
import { actsNow27 } from '../tickcache27';

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
  /** r27: grau máximo que os relatórios das pistas alcançam durante a viagem (missão de olheiro da equipe) */
  depth?: number;
  /** r27: filtros do antigo pedido de scout (nível e formato) */
  req?: TripReq23;
}
/** Filtros extras de uma viagem: nível ('any' | 'beginner' | 'promising') e formato ('any' | 'band' | 'solo'). */
export interface TripReq23 { level: string; role: string }
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
  return s.scouts.filter((sc) => !busy.has(sc.id));
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
export function startSceneTrip23(s: GameState, city: string, fam: string, scoutId?: string, req?: TripReq23): L | null {
  const c = cityById[city];
  if (!c) return l('Cidade inválida.', 'Invalid city.');
  if (scoutId && !freeScouts23(s).some((x) => x.id === scoutId)) return l('Esse olheiro já está em campo.', 'That scout is already in the field.');
  const q = sceneQuote23(s, city, fam, scoutId);
  if (freeCash20(s) < q.cost) return cashWhy20(s, q.cost, l('Caixa insuficiente.', 'Not enough cash.'));
  const st = scout23(s);
  const id = nextId(s, 'tr23');
  post(s, `trip23:${id}`, -q.cost, 'scouting', `Cena ${c.name.pt}`);
  const by = q.by || fmtL(l('freelancer de {c}', '{c} freelancer'), { c: c.name }).pt;
  const filt = req && (req.level !== 'any' || req.role !== 'any') ? req : undefined;
  st.trips.push({ id, kind: 'scene', city, market: c.market as MarketId, fam, by, scoutId, skill: q.skill, start: s.week, until: s.week + q.weeks, target: q.n, found: [], ...(filt ? { req: filt } : {}) });
  log(s, fmtL(l('{b} foi para a cena de {c} ({f}).', '{b} went to the {c} scene ({f}).'), { b: by, c: c.name, f: famName(fam) }));
  return null;
}

// ---------------------------------------------------------------- PROCURAR: missão de olheiro da equipe (ex-scout11)

export const MISSION_WEEKS = [4, 8, 12] as const;
/** Grau máximo que a missão alcança: curtas só observam, longas acompanham; olheiro excelente em missão longa chega à audição. */
export function missionDepth(sc: Scout, weeks: number): number {
  return weeks >= 12 && sc.skill >= 80 ? 4 : weeks >= 8 ? 3 : 2;
}
export function missionTarget(sc: Scout, weeks: number): number {
  return 1 + Math.floor(sc.skill / 35) + (weeks >= 12 ? 1 : 0);
}
/** Fora da região do olheiro a missão leva +4 semanas. */
export function missionLength(sc: Scout, region: MarketId, weeks: number): number {
  return weeks + (sc.region === region ? 0 : 4);
}
export const missionCost = (s: GameState, sc: Scout, region: MarketId): number => money(s, sc.region === region ? 300 : 1200);
/** Viagem em andamento do olheiro (missão ou cena), se houver. */
export const tripOf23 = (s: GameState, scoutId: string): Trip23 | undefined => scout23(s).trips.find((x) => x.scoutId === scoutId);
export function missionProgress(s: GameState, sc: Scout): number {
  const tr = tripOf23(s, sc.id);
  return tr ? clamp((s.week - tr.start) / Math.max(1, tr.until - tr.start), 0, 1) : 0;
}
/** Envia o olheiro da equipe a um MERCADO com duração e foco escolhidos: as pistas chegam e amadurecem semana a semana. */
export function startMission(s: GameState, scoutId: string, region: MarketId, family: string, weeks: number): L | null {
  const sc = s.scouts.find((x) => x.id === scoutId);
  if (!sc) return l('Olheiro inválido.', 'Invalid scout.');
  if (!freeScouts23(s).some((x) => x.id === scoutId)) return l('Já está em missão.', 'Already on a mission.');
  const cost = missionCost(s, sc, region);
  if (freeCash20(s) < cost) return cashWhy20(s, cost, l('Caixa insuficiente para a viagem.', 'Not enough cash for travel.'));
  const id = nextId(s, 'tr23');
  post(s, `scouttrip:${sc.id}:${id}`, -cost, 'scouting', `Missão ${sc.name}`);
  const len = missionLength(sc, region, weeks);
  scout23(s).trips.push({ id, kind: 'scene', market: region, fam: family, by: sc.name, scoutId, skill: sc.skill, start: s.week, until: s.week + len, target: missionTarget(sc, weeks), found: [], depth: missionDepth(sc, weeks) });
  log(s, fmtL(l('{b} partiu em missão ({m}, {f}, {w} semanas).', '{b} left on a mission ({m}, {f}, {w} weeks).'), { b: sc.name, m: marketName23(region), f: famName(family), w: len }));
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

/** r23 (links23): pesos extras na hora de o olheiro achar alguém (gênero em alta, coro/escola…). */
export const FIND23: ((s: GameState, a: Act, tr: Trip23) => number)[] = [];
function reqOf(tr: Trip23) { return tr.req ? { genreFamily: tr.fam, market: tr.market, level: tr.req.level, role: tr.req.role } : undefined; }
function tripFind(s: GameState, r: Rng, tr: Trip23): Act | undefined {
  const req = reqOf(tr);
  const cands = actsNow27(s).filter((a) => signalEligible20(s, a) && (tr.city ? a.city === tr.city : cityById[a.city]?.market === tr.market) && (tr.fam === 'any' || familyOf(a.genre) === tr.fam) && (!req || matchesReq20(a, req)));
  // olheiro bom enxerga potencial; o mediano vai atrás de quem já faz barulho
  const a = cands.length && r.chance(0.75) ? r.weighted(cands, (x) => (1 + (x.potential / 40) * (tr.skill / 60) + x.fame / 30) * FIND23.reduce((m, f) => m * f(s, x, tr), 1)) : undefined;
  if (a) return a;
  if (req) {
    // filtros não relaxam: um ato novo que obedece a todos, ou nada
    const plan = spawnPlanForReq20(s, r, req);
    if (!plan) return undefined;
    const b = spawnProceduralAct(s, r, { ...plan, city: tr.city ?? plan.city });
    return matchesReq20(b, req) ? b : undefined;
  }
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
    const mission = !tr.city && tr.kind === 'scene';
    const where = tr.kind === 'demo' ? l('chamada de demos', 'demo call') : mission ? fmtL(l('missão em {m}', 'mission in {m}'), { m: marketName23(tr.market) }) : fmtL(l('cena de {c}', '{c} scene'), { c: cityById[a.city]?.name ?? a.city });
    addSignal(s, r, a.id, tr.kind === 'demo' ? 'demo' : mission ? 'scout' : 'scene23', { by: tr.by, at: where, city: a.city });
    const k = s.knowledge[a.id];
    k.degree = tr.kind === 'demo' ? 2 : tr.skill >= 75 && !tr.depth ? 3 : 2;
    k.stage = 'monitoring';
    const sc = mission && tr.scoutId ? s.scouts.find((x) => x.id === tr.scoutId) : undefined;
    k.bias = (sc?.bias ?? 0) + r.normal(0, tr.kind === 'demo' ? 10 : Math.max(2, 12 - tr.skill / 10));
    tr.found.push(a.id);
    log(s, fmtL(l('{b}: nome novo — {a}.', '{b}: new name — {a}.'), { b: tr.by, a: a.name }));
  }
  // r27 (ex-scout11): durante a missão os relatórios das pistas amadurecem até o grau máximo
  if (tr.depth) for (const id of tr.found) {
    const k = s.knowledge[id];
    if (!k || k.degree >= tr.depth || s.acts[id]?.owner || !r.chance(0.16 + tr.skill / 300)) continue;
    k.degree += 1;
    k.bias *= 0.7;
    k.updatedWeek = s.week;
    if (k.degree >= 3 && (k.stage === 'monitoring' || k.stage === 'signal')) k.stage = 'investigating';
    log(s, fmtL(l('{n}: relatório de {a} chega ao grau {d}.', '{n}: report on {a} reaches degree {d}.'), { n: tr.by, a: s.acts[id]?.name ?? '?', d: k.degree }));
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
      : !tr.found.length && tr.req ? l('O olheiro voltou sem nomes: ninguém atende a todos os filtros agora.', 'The scout came back empty-handed: nobody matches every filter right now.')
      : fmtL(l('{n} voltou de {c} com {k} nome(s).', '{n} came back from {c} with {k} name(s).'), { n: tr.by, c: tr.city ? cityById[tr.city]?.name ?? '?' : marketName23(tr.market), k: tr.found.length }), 'info');
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
