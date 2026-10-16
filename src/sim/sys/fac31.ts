// R31 · onda 3 (U) — FACÇÕES POR PAÍS: presença e expansão. Plano: docs/r31/plano-pagina.md, "Submundo no mundo".
//
// Presença (interruptor 'u31'): uma facção age DIRETO só no país da sede e nos países onde já abriu operação (nível de
// operação ≥ OPEN31). O crime digital não tem fronteira (depois da internet). As outras ficam do outro lado do
// intermediário (broker31): mais caro, mais lento, com risco de traição. Desligado: a regra antiga do mob29 (alcance
// internacional pelo poder ≥ 85).
//
// Expansão (uma vez por ano, gancho 'year', sorteio no fluxo rng19 'fac31'): cada facção cresce ou encolhe pela época
// (o ramo dela está em alta?), pelo calor da polícia no país da sede, pela velhice e pelo fim anunciado; as fortes abrem
// operação num país vizinho, as operações crescem ou recuam, e uma operação que chega ao nível de abertura num país com
// facção local forte vira guerra (fato público). Usar muito uma facção de fora pelo intermediário puxa a operação dela
// para o seu país (o "puxão"), e a abertura irrita as locais (opinião delas sobre você, via opinion.ts).
//
// Poder efetivo = poder de base + crescimento (fac31.g) − poder perdido por delações (crime17.pw23). Só este módulo e o
// intermediário leem o poder efetivo: os sistemas antigos continuam com o poder de base (o mundo deles não muda).
// O estado do mundo fica em x4.fac31 (registerExt4). Abrir telas só lê.

import { clamp } from '../../core/rng';
import { citiesByCountry31 } from '../../data/fac31';
import { countryName } from '../../data/geo';
import { cityById, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, recentFacts, type Fact } from '../facts17';
import { shiftOpinion } from '../opinion';
import { u31On } from '../r31/u31sw';
import { rng19 } from '../rng19';
import type { GameState } from '../types';
import { fmtL, notify } from '../util';
import { a3Of, crime17, heatIn, orgById, orgs17, type Org17 } from './crime17';

const N = (pt: string, en: string): L => l(pt, en);

// ---------------------------------------------------------------- estado

export interface Fac31State {
  /** último ano processado (0 = nunca) */
  y: number;
  /** crescimento acumulado do poder (−40..+20) por facção */
  g: Record<string, number>;
  /** operações fora da sede: facção → país → nível 0..100 */
  ops: Record<string, Record<string, number>>;
  /** puxão do intermediário: facção → país → uso (decai à metade por ano) */
  use: Record<string, Record<string, number>>;
  /** guerras entre facções ('a|b' em ordem) → intensidade 0..100 */
  war: Record<string, number>;
  /** crônica curta (ano, facção, texto) */
  log: [number, string, L][];
}
declare module '../ext4' { interface Ext4 { fac31: Fac31State } }
const fresh = (): Fac31State => ({ y: 0, g: {}, ops: {}, use: {}, war: {}, log: [] });
registerExt4('fac31', fresh);
export function fac31(s: GameState): Fac31State {
  const x = s.x4 as unknown as { fac31?: Fac31State };
  const st = (x.fac31 ??= fresh());
  st.g ??= {}; st.ops ??= {}; st.use ??= {}; st.war ??= {}; st.log ??= [];
  return st;
}
const peek = (s: GameState): Fac31State | undefined => (s.x4 as unknown as { fac31?: Fac31State }).fac31;

/** Nível de operação a partir do qual a facção age direto no país. */
export const OPEN31 = 30;
/** Ano em que o crime digital passa a não ter fronteira (internet comercial). */
export const NET31 = 1995;
export const facOn31 = (s: GameState): boolean => u31On(s);
export const home31 = (s: GameState): string => a3Of(s, s.config.homeCity);
const isCyber = (o: Org17): boolean => o.kind === 'cyber';
const down = (s: GameState, o: Org17): boolean => (crime17(s).down[o.id] ?? 0) > s.week;

/** Poder efetivo (base + crescimento − delações), 5..100. */
export function power31(s: GameState, o: Org17): number {
  const g = peek(s)?.g[o.id] ?? 0;
  const lost = crime17(s).pw23?.[o.id] ?? 0;
  return Math.round(clamp(o.power + g - lost, 5, 100));
}
export const opsOf31 = (s: GameState, oid: string): Record<string, number> => peek(s)?.ops[oid.replace(/^o:/, '')] ?? {};
/** Nível de operação da facção no país (100 = sede). */
export function opIn31(s: GameState, o: Org17, a3: string): number {
  if (o.a3 === a3) return 100;
  return opsOf31(s, o.id)[a3] ?? 0;
}

/** A facção age direto neste país? (com o interruptor; sem ele, quem decide é o mob29 pela regra antiga) */
export function present31(s: GameState, o: Org17, a3: string): boolean {
  if (isCyber(o)) return s.year >= NET31 || o.a3 === a3;
  return opIn31(s, o, a3) >= OPEN31;
}

/** Facções que agem direto no país (padrão: o da sua sede), da época, não desmanteladas, sem o crime digital. */
export function localOrgs31(s: GameState, a3 = home31(s)): Org17[] {
  return orgs17(s, false, true).filter((o) => !isCyber(o) && !down(s, o) && present31(s, o, a3))
    .sort((a, b) => (b.a3 === a3 ? 1 : 0) - (a.a3 === a3 ? 1 : 0) || power31(s, b) - power31(s, a) || a.id.localeCompare(b.id));
}
/** Facções de fora (para o intermediário): da época, não desmanteladas, sem presença no país. */
export function foreignOrgs31(s: GameState, a3 = home31(s)): Org17[] {
  return orgs17(s, false, true).filter((o) => !down(s, o) && !present31(s, o, a3));
}

// ---------------------------------------------------------------- vizinhos (estático: centro das cidades de cada país)

let NB: Record<string, string[]> | null = null;
const rad = (x: number): number => (x * Math.PI) / 180;
function km(a: [number, number], b: [number, number]): number {
  const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}
/** Países vizinhos (até 4, a menos de 2.500 km; ilha distante fica com o mais próximo). */
export function neighbors31(a3: string): string[] {
  if (!NB) {
    const by = citiesByCountry31();
    const ctr: Record<string, [number, number]> = {};
    for (const [k, cs] of Object.entries(by)) {
      const pts = cs.map((c) => cityById[c]).filter((c) => c && (c.lat || c.lon));
      if (pts.length) ctr[k] = [pts.reduce((t, c) => t + c.lat, 0) / pts.length, pts.reduce((t, c) => t + c.lon, 0) / pts.length];
    }
    NB = {};
    const keys = Object.keys(ctr).sort();
    for (const k of keys) {
      const d = keys.filter((x) => x !== k).map((x) => [x, km(ctr[k], ctr[x])] as const).sort((p, q) => p[1] - q[1] || p[0].localeCompare(q[0]));
      const near = d.filter((x) => x[1] <= 2500).slice(0, 4).map((x) => x[0]);
      NB[k] = near.length ? near : d.slice(0, 1).map((x) => x[0]);
    }
  }
  return NB[a3] ?? [];
}

// ---------------------------------------------------------------- crescimento pela época

/** Quanto o ramo da facção está em alta neste ano (−2..+3). */
function eraFit31(o: Org17, y: number): number {
  let d = 0;
  for (const r of o.rackets) {
    if (r === 'jukebox') d += y >= 1930 && y <= 1985 ? 1 : -1;
    else if (r === 'payola') d += y >= 1950 && y <= 1990 ? 1 : 0;
    else if (r === 'bootleg') d += y >= 1965 && y <= 2005 ? 1 : y > 2012 ? -1 : 0;
    else if (r === 'corridos') d += y >= 1990 ? 1 : 0;
    else if (r === 'clubs') d += y >= 1920 && y <= 2000 ? 0.5 : 0;
    else if (r === 'tickets') d += y >= 1960 ? 0.5 : 0;
    else if (r === 'laundering') d += y >= 1970 ? 0.5 : 0;
  }
  return clamp(d, -2, 3);
}

const warKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);
function logIt(s: GameState, oid: string, text: L): void {
  const st = fac31(s);
  st.log.push([s.year, oid, text]);
  if (st.log.length > 60) st.log.splice(0, st.log.length - 60);
}

/** Primeiro ano: as facções muito fortes já chegam com operação nos vizinhos (o alcance que antes vinha do poder). */
function seed31(s: GameState): void {
  const st = fac31(s);
  for (const o of orgs17(s, false, true)) {
    if (isCyber(o) || o.power < 80) continue;
    const nb = neighbors31(o.a3).slice(0, o.power >= 88 ? 2 : 1);
    for (const a3 of nb) (st.ops[o.id] ??= {})[a3] = Math.max(st.ops[o.id]?.[a3] ?? 0, 35);
  }
}

/** A virada do ano: crescimento, expansão, recuo, puxão do intermediário e guerras. Determinístico (rng19 'fac31'). */
export function expandYear31(s: GameState, force = false): void {
  const st = fac31(s);
  if (st.y === s.year && !force) return;
  if (!st.y) seed31(s);
  st.y = s.year;
  const r = rng19(s, 'fac31');
  const home = home31(s);
  const live = orgs17(s, false, true).filter((o) => !isCyber(o)).sort((a, b) => a.id.localeCompare(b.id));
  const liveIds = new Set(live.map((o) => o.id));
  // 1. crescimento do poder
  for (const o of live) {
    const d = eraFit31(o, s.year) - heatIn(s, o.a3) / 25 - (s.year - o.from > 60 ? 1 : 0) - (o.to - s.year < 5 ? 3 : 0) - (down(s, o) ? 8 : 0) + r.int(-3, 3);
    st.g[o.id] = Math.round(clamp((st.g[o.id] ?? 0) + d, -40, 20));
  }
  // 2. operações existentes: crescem com poder, recuam sem; puxão do intermediário; facção que acabou sai de tudo
  for (const oid of Object.keys(st.ops).sort()) {
    const o = liveIds.has(oid) ? orgById(s, oid) : undefined;
    if (!o) { delete st.ops[oid]; continue; }
    const P = power31(s, o);
    for (const a3 of Object.keys(st.ops[oid]).sort()) {
      const before = st.ops[oid][a3];
      const pull = (st.use[oid]?.[a3] ?? 0) * 6;
      const resist = localOrgs31(s, a3).filter((x) => x.a3 === a3).reduce((t, x) => Math.max(t, power31(s, x)), 0) / 20;
      const v = clamp(before + (P >= 50 ? r.int(2, 8) : -r.int(3, 8)) + pull - resist, 0, 100);
      st.ops[oid][a3] = Math.round(v);
      if (before >= OPEN31 && v < OPEN31) {
        emitFact(s, { kind: 'faction_withdraw', actors: [o.key], severity: 25, visibility: 'rumor', tags: ['crime', 'fac31'], src: 'fac31',
          text: fmtL(N('{o} fecha a operação em {c}.', '{o} closes its operation in {c}.'), { o: o.name, c: countryName(a3) }) });
        logIt(s, oid, fmtL(N('Saiu de {c}.', 'Left {c}.'), { c: countryName(a3) }));
      }
      if (before < OPEN31 && v >= OPEN31) opened31(s, o, a3, pull > 0);
      if (v <= 0) delete st.ops[oid][a3];
    }
  }
  // puxão em país onde ainda não havia operação (contrato pelo intermediário cria a semente)
  for (const oid of Object.keys(st.use).sort()) {
    const o = liveIds.has(oid) ? orgById(s, oid) : undefined;
    for (const a3 of Object.keys(st.use[oid]).sort()) {
      const u = st.use[oid][a3];
      if (o && a3 !== o.a3 && st.ops[oid]?.[a3] === undefined && u >= 1) (st.ops[oid] ??= {})[a3] = Math.round(clamp(u * 6, 0, OPEN31 - 1));
      st.use[oid][a3] = Math.floor(u / 2);
      if (!st.use[oid][a3]) delete st.use[oid][a3];
    }
    if (!Object.keys(st.use[oid]).length) delete st.use[oid];
  }
  // 3. as fortes abrem operação num vizinho (uma por ano no máximo)
  for (const o of live) {
    const P = power31(s, o);
    if (P < 60 || down(s, o) || !r.chance((P - 55) / 100)) continue;
    const opts = neighbors31(o.a3).filter((a3) => a3 !== o.a3 && st.ops[o.id]?.[a3] === undefined).slice(0, 3);
    if (!opts.length) continue;
    const a3 = r.pick(opts);
    (st.ops[o.id] ??= {})[a3] = r.int(10, 20);
    if (a3 === home) emitFact(s, { kind: 'faction_scout', actors: [o.key], severity: 20, visibility: 'rumor', tags: ['crime', 'fac31'], src: 'fac31',
      text: fmtL(N('Boato: gente de {o} sondando a noite de {c}.', 'Rumour: {o} people sounding out the {c} night.'), { o: o.name, c: countryName(a3) }) });
  }
  // 4. guerras: esfriam; a mais fraca perde poder
  for (const k of Object.keys(st.war).sort()) {
    const [a, b] = k.split('|').map((id) => orgById(s, id));
    if (!a || !b || !liveIds.has(a.id) || !liveIds.has(b.id)) { delete st.war[k]; continue; }
    const pa = power31(s, a), pb = power31(s, b);
    const loser = pa < pb || (pa === pb && r.chance(0.5)) ? a : b;
    st.g[loser.id] = Math.round(clamp((st.g[loser.id] ?? 0) - Math.round(st.war[k] / 15), -40, 20));
    st.war[k] = Math.round(st.war[k] - r.int(8, 16));
    if (st.war[k] <= 0) { delete st.war[k]; logIt(s, loser.id, fmtL(N('Trégua com {o}.', 'Truce with {o}.'), { o: (loser === a ? b : a).name })); }
  }
}

/** Uma operação chegou ao nível de abertura: a facção passa a agir direto no país; locais fortes reagem (guerra). */
function opened31(s: GameState, o: Org17, a3: string, pulled: boolean): void {
  const st = fac31(s);
  const home = home31(s);
  emitFact(s, { kind: 'faction_expand', actors: [o.key], severity: 35, visibility: a3 === home ? 'public' : 'rumor', tags: ['crime', 'fac31'], src: 'fac31',
    text: fmtL(N('{o} abre operação em {c}.', '{o} opens an operation in {c}.'), { o: o.name, c: countryName(a3) }) });
  logIt(s, o.id, fmtL(N('Abriu operação em {c}.', 'Opened an operation in {c}.'), { c: countryName(a3) }));
  const locals = orgs17(s, false, true).filter((x) => !isCyber(x) && x.a3 === a3 && x.id !== o.id && !down(s, x) && power31(s, x) >= 40).sort((p, q) => power31(s, q) - power31(s, p));
  const rival = locals[0];
  if (rival) {
    const k = warKey(o.id, rival.id);
    if (!st.war[k]) emitFact(s, { kind: 'faction_war', actors: [o.key, rival.key], severity: 50, visibility: 'public', tags: ['crime', 'fac31', 'violence'], src: 'fac31',
      text: fmtL(N('Guerra no submundo de {c}: {a} chega e {b} reage.', 'Underworld war in {c}: {a} moves in and {b} hits back.'), { c: countryName(a3), a: o.name, b: rival.name }) });
    st.war[k] = Math.min(100, (st.war[k] ?? 0) + 40);
  }
  if (a3 === home && pulled) {
    // quem trouxe gente de fora foi você: as locais não esquecem (opinião delas sobre você)
    for (const x of locals) shiftOpinion(s, facOpKey31(x.id), -12, { why: fmtL(N('Seus contratos trouxeram {o} para o país.', 'Your contracts brought {o} into the country.'), { o: o.name }) });
    notify(s, fmtL(N('{o} abriu operação no seu país — de tanto trabalhar para você pelo intermediário. As facções locais não gostaram.', '{o} opened an operation in your country — from working for you through the broker so often. The local factions are not pleased.'), { o: o.name }), 'bad');
  }
}

/** Chave da opinião de uma facção sobre você (opinion.ts; tipo "grupo"). */
export const facOpKey31 = (oid: string): string => `w:f31:${oid.replace(/^o:/, '')}`;

/** Registro do intermediário: um contrato com facção de fora puxa a operação dela para o país. */
export function pull31(s: GameState, oid: string, a3: string, n = 1): void {
  const st = fac31(s);
  const id = oid.replace(/^o:/, '');
  (st.use[id] ??= {})[a3] = (st.use[id][a3] ?? 0) + n;
}

/** Abre (ou fecha) uma operação na hora (editor). */
export function setOp31(s: GameState, oid: string, a3: string, v: number): void {
  const o = orgById(s, oid);
  if (!o) return;
  const st = fac31(s);
  const before = st.ops[o.id]?.[a3] ?? 0;
  (st.ops[o.id] ??= {})[a3] = Math.round(clamp(v, 0, 100));
  if (before < OPEN31 && v >= OPEN31) opened31(s, o, a3, false);
}

/** Guerras abertas (para a interface e o mural da onda 4). */
export const wars31 = (s: GameState): { a: string; b: string; v: number }[] =>
  Object.entries(peek(s)?.war ?? {}).map(([k, v]) => { const [a, b] = k.split('|'); return { a, b, v }; }).sort((x, y) => y.v - x.v);
export const facLog31 = (s: GameState, oid?: string): [number, string, L][] => (peek(s)?.log ?? []).filter((x) => !oid || x[1] === oid.replace(/^o:/, ''));

registerSimHook('year', 'fac31', (s) => { if (facOn31(s)) expandYear31(s); });

/** Países com facção da época (cobertura; para testes e o editor). */
export function coverage31(s: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a3 of Object.keys(citiesByCountry31())) out[a3] = 0;
  for (const o of orgs17(s, false, true)) if (!isCyber(o) && out[o.a3] !== undefined) out[o.a3]++;
  return out;
}

/** Notícias do submundo que chegaram a você (fatos, não o estado): o que saiu como boato ou na imprensa sobre facções
 *  abrindo, fechando, sondando ou em guerra, e a traição do intermediário contra você (é secreta, mas você sabe). */
export function underworldNews31(s: GameState, limit = 12): Fact[] {
  return recentFacts(s, { kinds: ['faction_expand', 'faction_withdraw', 'faction_scout', 'faction_war', 'broker_betrayal'], limit: 60 })
    .filter((f) => f.visibility !== 'secret' || (f.kind === 'broker_betrayal' && f.actors.includes('player'))).slice(0, limit);
}
