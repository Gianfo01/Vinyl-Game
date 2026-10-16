// Masters 31 (31.3 · F) — GRAFO SOCIAL de todos com todos ("Conhecidos, amigos e rivais", estilo The Sims).
//
// Quem nunca cruzou com alguém não tem opinião sobre essa pessoa. O motor guarda, para cada PAR que já teve contato,
// cinco dimensões separadas (a interface mostra um rótulo simples):
//   1. conhecimento/intimidade — `k` (2 já se viram · 3 trabalharam juntos) e `i` 0..100 (conhecido › colega › amigo › próximo)
//   2. afeto — NÃO é guardado aqui: é a opinião (opinion.ts — `p:<id>` quando o alvo é você; `Person.rel` entre NPCs)
//   3. respeito  — por sentido (a→b e b→a), −100..100
//   4. confiança — por sentido, −100..100
//   5. rivalidade — do par, 0..100 (rival vira inimigo só com motivo registrado: feud, aliciamento, traição…)
// "Reconhecimento" (sabe quem é pela fama/imprensa) é DERIVADO (know.ts): a imprensa dá reconhecimento, não intimidade.
// Laços estruturais também são derivados, não guardados: mesma banda (trabalham juntos), família (kin15), seu elenco
// e sua equipe — `registerTieDeriver` (sys/social31sys.ts registra família e banda).
//
// Desempenho e save: só pares que já tiveram contato, sem direção duplicada (chave "a|b" com a < b), em vetor compacto;
// limite por pessoa (SOC31.cap; o jogador tem SOC31.capMe) — o laço mais frio sai — e limpeza mensal dos laços frios de
// quem saiu de cena. Partidas novas começam com o grafo limpo.
//
// Módulo LEVE (sem sistemas): know.ts lê a intimidade daqui sem mudar a ordem de carregamento dos sistemas.

import { clamp } from '../core/rng';
import { registerExt4 } from './ext4';
import type { GameState } from './types';

/** Como se conheceram (índice guardado no vetor). */
export const HOW31 = ['other', 'band', 'label', 'hire', 'record', 'stage', 'festival', 'award', 'intro', 'visit', 'family', 'deal', 'rival', 'romance', 'press'] as const;
export type How31 = (typeof HOW31)[number];

/** Vetor compacto do par (a < b): [k, i, rAB, rBA, tAB, tBA, v, how, w0, w, by?] */
export type Edge31 = (number | string)[];
const K = 0, I = 1, RAB = 2, RBA = 3, TAB = 4, TBA = 5, V = 6, HOW = 7, W0 = 8, W = 9, BY = 10;

export interface Soc31State { e: Record<string, Edge31> }
declare module './ext4' { interface Ext4 { soc31: Soc31State } }
registerExt4('soc31', () => ({ e: {} }));

/** Regras do grafo (editáveis). */
export const SOC31 = {
  /** laços guardados por pessoa (o mais frio sai) */
  cap: 40,
  /** laços guardados do jogador */
  capMe: 400,
  /** meses sem contato até a intimidade começar a esfriar */
  coolAfter: 12,
  /** quanto esfria por mês sem contato */
  coolRate: 1,
  /** piso: quem já se conheceu continua "conhecido" */
  floor: 8,
  /** laço frio (intimidade no piso, sem rivalidade) de quem saiu de cena há mais de N anos sai do grafo */
  dropYears: 6,
  /** intimidade de partida por forma de se conhecer */
  start: { other: 10, band: 45, label: 15, hire: 25, record: 30, stage: 15, festival: 12, award: 10, intro: 15, visit: 12, family: 55, deal: 15, rival: 5, romance: 50, press: 0 } as Record<How31, number>,
};

export function soc31(s: GameState): Soc31State {
  const x = s.x4 as unknown as { soc31?: Soc31State };
  return (x.soc31 ??= { e: {} });
}

const pairKey = (a: string, b: string): [string, boolean] => (a < b ? [`${a}|${b}`, false] : [`${b}|${a}`, true]);

// ---------------------------------------------------------------- índice de vizinhos (cache por partida, nunca no save)

const ADJ = new WeakMap<Soc31State, Map<string, Set<string>>>();
function adj(st: Soc31State): Map<string, Set<string>> {
  let m = ADJ.get(st);
  if (m) return m;
  m = new Map();
  for (const k of Object.keys(st.e)) { const [a, b] = k.split('|'); link(m, a, b); }
  ADJ.set(st, m);
  return m;
}
function link(m: Map<string, Set<string>>, a: string, b: string): void {
  let x = m.get(a); if (!x) m.set(a, (x = new Set())); x.add(b);
  let y = m.get(b); if (!y) m.set(b, (y = new Set())); y.add(a);
}
function unlink(m: Map<string, Set<string>>, a: string, b: string): void { m.get(a)?.delete(b); m.get(b)?.delete(a); }

/** Vizinhos guardados de alguém (ids de nó). */
export function neighbors31(s: GameState, a: string): string[] { return [...(adj(soc31(s)).get(a) ?? [])].sort(); }

// ---------------------------------------------------------------- nós

/** Nó do jogador: a pessoa dele (quando existe) ou 'player'. */
export function meNode31(s: GameState): string {
  const pid = (s.x4 as unknown as { people?: { owner?: { personId?: string } } }).people?.owner?.personId;
  return pid && s.persons[pid] ? pid : 'player';
}
/** Normaliza chaves de opinião/fato para nó: 'p:x' → 'x', 'player' → pessoa do jogador. */
export function node31(s: GameState, key: string): string {
  if (key === 'player') return meNode31(s);
  if (key.startsWith('p:')) return key.slice(2);
  return key;
}

// ---------------------------------------------------------------- leitura

export interface Tie31 {
  /** 0 nunca se viram · 2 já se viram · 3 trabalharam juntos */
  k: 0 | 2 | 3;
  /** intimidade 0..100 */
  i: number;
  /** respeito de a por b / de b por a */
  r: number; rBack: number;
  /** confiança de a em b / de b em a */
  t: number; tBack: number;
  /** rivalidade do par 0..100 */
  v: number;
  how: How31;
  /** semana do primeiro contato e do último */
  since: number; last: number;
  /** quem apresentou (nó), quando foi por um amigo em comum */
  by?: string;
  /** veio de um laço estrutural (banda, família, contrato), não de um encontro guardado */
  derived?: boolean;
}

/** Laço estrutural que não precisa ser guardado (banda, família…). sys/social31sys.ts registra. */
export type TieDeriver = (s: GameState, a: string, b: string) => { how: How31; i: number; k: 2 | 3; since?: number } | undefined;
const DERIVERS: TieDeriver[] = [];
export function registerTieDeriver(fn: TieDeriver): void { DERIVERS.push(fn); }

function derive(s: GameState, a: string, b: string): ReturnType<TieDeriver> {
  let best: ReturnType<TieDeriver>;
  for (const f of DERIVERS) { const d = f(s, a, b); if (d && (!best || d.i > best.i)) best = d; }
  return best;
}

/** O laço guardado entre a e b (sem os derivados), já orientado a → b. */
export function storedTie31(s: GameState, a: string, b: string): Tie31 | undefined {
  if (a === b) return undefined;
  const [key, flip] = pairKey(a, b);
  const e = soc31(s).e[key];
  if (!e) return undefined;
  return {
    k: e[K] as 2 | 3, i: e[I] as number,
    r: (flip ? e[RBA] : e[RAB]) as number, rBack: (flip ? e[RAB] : e[RBA]) as number,
    t: (flip ? e[TBA] : e[TAB]) as number, tBack: (flip ? e[TAB] : e[TBA]) as number,
    v: e[V] as number, how: HOW31[e[HOW] as number] ?? 'other', since: e[W0] as number, last: e[W] as number,
    ...(e[BY] ? { by: e[BY] as string } : {}),
  };
}

/** O laço entre a e b (guardado + estrutural), orientado a → b; undefined = nunca se viram. */
export function tie31(s: GameState, a: string, b: string): Tie31 | undefined {
  if (a === b) return undefined;
  const st = storedTie31(s, a, b);
  const d = derive(s, a, b);
  if (!st && !d) return undefined;
  if (!st) return { k: d!.k, i: d!.i, r: 0, rBack: 0, t: 0, tBack: 0, v: 0, how: d!.how, since: d!.since ?? 0, last: s.week, derived: true };
  if (d && d.i > st.i) return { ...st, i: d.i, k: (Math.max(st.k, d.k) as 2 | 3), last: s.week };
  return st;
}

/** Intimidade 0..100 (0 = não se conhecem). */
export const intimacy31 = (s: GameState, a: string, b: string): number => tie31(s, a, b)?.i ?? 0;
/** Já tiveram contato? */
export const met31 = (s: GameState, a: string, b: string): boolean => !!tie31(s, a, b);

/** Rótulo de intimidade: 0 conhecido · 1 colega · 2 amigo · 3 próximo. */
export const closeness31 = (i: number): 0 | 1 | 2 | 3 => (i >= 70 ? 3 : i >= 45 ? 2 : i >= 25 ? 1 : 0);

// ---------------------------------------------------------------- escrita

function entry(s: GameState, a: string, b: string, how: How31): { e: Edge31; flip: boolean; fresh: boolean } | undefined {
  if (!a || !b || a === b) return undefined;
  const st = soc31(s);
  const [key, flip] = pairKey(a, b);
  let e = st.e[key];
  const fresh = !e;
  if (!e) {
    const i0 = SOC31.start[how] ?? 10;
    e = st.e[key] = [2, i0, 0, 0, 0, 0, 0, HOW31.indexOf(how), s.week, s.week];
    link(adj(st), ...(key.split('|') as [string, string]));
    trim(s, a);
    trim(s, b);
  }
  return st.e[key] ? { e, flip, fresh } : undefined;
}

/** Peso de um laço para decidir quem sai quando passa do limite (o mais frio sai). */
const warmth = (e: Edge31): number => (e[I] as number) + (e[V] as number) * 0.5 + (e[K] === 3 ? 10 : 0) + Math.abs(e[RAB] as number) * 0.1 + Math.abs(e[RBA] as number) * 0.1;

function trim(s: GameState, a: string): void {
  const st = soc31(s), m = adj(st);
  const ns = m.get(a);
  const cap = a === meNode31(s) ? SOC31.capMe : SOC31.cap;
  if (!ns || ns.size <= cap) return;
  const me = meNode31(s);
  let worst: string | undefined, wv = Infinity, ww = Infinity;
  for (const b of ns) {
    if (b === me) continue; // o laço com o jogador nunca sai por limite do outro lado
    const e = st.e[pairKey(a, b)[0]];
    const v = warmth(e);
    const w = e[W] as number;
    if (v < wv || (v === wv && w < ww)) { wv = v; ww = w; worst = b; }
  }
  if (worst) drop(s, a, worst);
}

function drop(s: GameState, a: string, b: string): void {
  const st = soc31(s);
  delete st.e[pairKey(a, b)[0]];
  unlink(adj(st), a, b);
}

/**
 * a e b se conhecem (ou se reencontram): cria o laço se não existir e marca o contato. `worked` = trabalharam juntos.
 * `by` = quem apresentou. Devolve true quando o laço é novo.
 */
export function meet31(s: GameState, a: string, b: string, how: How31, o: { worked?: boolean; by?: string; i?: number } = {}): boolean {
  const x = entry(s, a, b, how);
  if (!x) return false;
  const { e, fresh } = x;
  if (o.worked || how === 'band' || how === 'record' || how === 'hire') e[K] = 3;
  if (o.by && fresh) e[BY] = o.by;
  if (!fresh) e[I] = clamp((e[I] as number) + (o.i ?? 3), 0, 100);
  else if (o.i !== undefined) e[I] = clamp(o.i, 0, 100);
  e[W] = s.week;
  return fresh;
}

export interface Shift31 { i?: number; r?: number; rBack?: number; t?: number; tBack?: number; v?: number }
/** Mexe nas dimensões do par (cria o laço se preciso, com a forma dada). */
export function shiftTie31(s: GameState, a: string, b: string, d: Shift31, how: How31 = 'other'): void {
  const x = entry(s, a, b, how);
  if (!x) return;
  const { e, flip } = x;
  const add = (ix: number, v: number | undefined, lo: number, hi: number) => { if (v) e[ix] = clamp(Math.round(((e[ix] as number) + v) * 10) / 10, lo, hi); };
  add(I, d.i, 0, 100);
  add(flip ? RBA : RAB, d.r, -100, 100);
  add(flip ? RAB : RBA, d.rBack, -100, 100);
  add(flip ? TBA : TAB, d.t, -100, 100);
  add(flip ? TAB : TBA, d.tBack, -100, 100);
  add(V, d.v, 0, 100);
  e[W] = s.week;
}

/** Esquece todos os laços guardados de um nó (pessoa apagada do mundo). */
export function forgetNode31(s: GameState, a: string): void {
  for (const b of neighbors31(s, a)) drop(s, a, b);
}

// ---------------------------------------------------------------- tempo (uma vez por mês, chamado pelo motor)

/**
 * Esfria sem contato (devagar e com piso) e limpa laços frios de quem saiu de cena. `gone(nó)` diz se a pessoa saiu de
 * cena (morta, aposentada, apagada) — fica com quem chama, para este módulo continuar leve.
 */
export function coolMonth31(s: GameState, gone: (id: string) => boolean): { cooled: number; dropped: number } {
  const st = soc31(s);
  const me = meNode31(s);
  let cooled = 0, dropped = 0;
  const after = SOC31.coolAfter * 4.33, dropW = SOC31.dropYears * 52;
  for (const key of Object.keys(st.e)) {
    const e = st.e[key];
    const idle = s.week - (e[W] as number);
    if (idle > after && (e[I] as number) > SOC31.floor) { e[I] = Math.max(SOC31.floor, (e[I] as number) - SOC31.coolRate); cooled++; }
    // rivalidade sem motivo novo também baixa, mais devagar
    if (idle > after * 2 && (e[V] as number) > 0) e[V] = Math.max(0, (e[V] as number) - 0.5);
    if (idle > dropW && (e[I] as number) <= SOC31.floor && !(e[V] as number)) {
      const [a, b] = key.split('|');
      if (a === me || b === me) continue;
      if (gone(a) || gone(b)) { drop(s, a, b); dropped++; }
    }
  }
  return { cooled, dropped };
}

/** Número de laços guardados (medição). */
export const edgeCount31 = (s: GameState): number => Object.keys(soc31(s).e).length;

/** Medição de desempenho (só memória do processo, nunca no save): ms gastos pelo mês social. */
export const SOC31_PERF = { ms: 0, months: 0, max: 0 };
