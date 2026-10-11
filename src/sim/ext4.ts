// Base de extensão da rodada 4: cada sistema novo guarda seu estado em `s.x4.<chave>`, declara o tipo
// por module augmentation, registra um inicializador e entra no tick por ganchos. Assim vários
// sistemas evoluem em paralelo sem disputar os mesmos arquivos.
//
//   declare module './ext4' { interface Ext4 { music: MusicState } }
//   registerExt4('music', () => ({ ... }));
//   registerSimHook('month', 'music', (s, r) => { ... });
//   registerMod('appeal', 'music', (v, c) => ({ value: v * 1.1, label: l('...', '...') }));
//
// Ordem determinística: ganchos rodam na ordem de registro, que é a ordem dos imports em
// src/sim/sys/index.ts.

import { CAT_BIG19, DIMINISH18, DIMINISH19, MOD_CAP18, SMALL18, capStat18, catAdj19, modAdj18, modCat19 } from './caps18';
import type { Rng } from '../core/rng';
import type { L } from '../data/world';
import type { Act, GameState, Offer, Release, Song } from './types';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Ext4 {}

const INITS: { key: string; init: () => unknown }[] = [];

export function registerExt4<K extends keyof Ext4>(key: K, init: () => Ext4[K]): void {
  if (!INITS.some((x) => x.key === key)) INITS.push({ key: key as string, init });
}

/** Cria (ou completa, em saves antigos) o estado de todos os sistemas registrados. */
export function ensureExt4(s: GameState): void {
  const st = s as unknown as { x4?: Record<string, unknown> };
  st.x4 ??= {};
  for (const { key, init } of INITS) if (st.x4[key] === undefined) st.x4[key] = init();
}

// ---------------------------------------------------------------- ganchos do tick

export interface HookArgs {
  day: number;
  release: Release;
  song: Song;
  show: { actId: string; cityId: string; sold: number; capacity: number; revenue: number; tourId: string };
}
export type HookPhase = 'day' | 'week' | 'month' | 'year' | 'launch' | 'compose' | 'record' | 'show' | 'newgame';
type HookFn = (s: GameState, r: Rng, arg: Partial<HookArgs>) => void;
const HOOKS: Record<HookPhase, { id: string; fn: HookFn }[]> = { day: [], week: [], month: [], year: [], launch: [], compose: [], record: [], show: [], newgame: [] };

export function registerSimHook(phase: HookPhase, id: string, fn: HookFn): void {
  const list = HOOKS[phase];
  const i = list.findIndex((x) => x.id === id);
  if (i >= 0) list[i] = { id, fn };
  else list.push({ id, fn });
}

export function runSimHooks(phase: HookPhase, s: GameState, r: Rng, arg: Partial<HookArgs> = {}): void {
  const P = (globalThis as { __hookProf?: Record<string, number> }).__hookProf;
  if (!P) { for (const h of HOOKS[phase]) h.fn(s, r, arg); return; }
  for (const h of HOOKS[phase]) { const t = performance.now(); h.fn(s, r, arg); const k = phase + ':' + h.id; P[k] = (P[k] ?? 0) + performance.now() - t; }
}

// ---------------------------------------------------------------- decisões do jogador

type DecisionFn = (s: GameState, eventId: string, optionId: string, ctx?: Record<string, string | number>) => void;
const DECISION_FNS: { id: string; fn: DecisionFn }[] = [];
/** Avisa sistemas (ex.: estilo de liderança) sobre a opção que o jogador escolheu num cartão de decisão. */
export function registerDecisionListener(id: string, fn: DecisionFn): void {
  const i = DECISION_FNS.findIndex((x) => x.id === id);
  if (i >= 0) DECISION_FNS[i] = { id, fn };
  else DECISION_FNS.push({ id, fn });
}
export function runDecisionListeners(s: GameState, eventId: string, optionId: string, ctx?: Record<string, string | number>): void {
  for (const x of DECISION_FNS) x.fn(s, eventId, optionId, ctx);
}
/** r18 decide18: portão de opção (traço/habilidade/relação/desbloqueio) — bloqueada vira a opção padrão. */
export const DEC_GATE18: { f: null | ((s: GameState, eventId: string, optionId: string, ctx: Record<string, string | number>) => boolean) } = { f: null };
/** r19 (sys/ctxsys19): contexto do ator nas decisões — `pre` fotografa confiança/reputação, `post` escala a variação pelo
 *  histórico (mágoas, favores, promessas quebradas, temperamento, relação); `pickW` faz quem tem mágoa aberta reagir primeiro. */
export const CTXFX19: { pre: null | ((s: GameState, eventId: string, optionId: string, ctx: Record<string, string | number>) => unknown); post: null | ((s: GameState, tok: unknown) => void); pickW: null | ((s: GameState, a: Act) => number) } = { pre: null, post: null, pickW: null };

// ---------------------------------------------------------------- modificadores

export interface ModCtx {
  release?: Release;
  act?: Act;
  cityId?: string;
  song?: Song;
  /** rodada 13: formatos do pedido de prensagem */
  formats?: string[];
}
export type ModName = 'appeal' | 'cityDemand' | 'pressingCost' | 'songQ' | 'showRevenue' | 'chartUnits' | 'tourRisk';
type ModFn = (s: GameState, value: number, ctx: ModCtx) => { value: number; label?: L } | null;
const MODS: Record<ModName, { id: string; fn: ModFn }[]> = { appeal: [], cityDemand: [], pressingCost: [], songQ: [], showRevenue: [], chartUnits: [], tourRisk: [] };

export function registerMod(name: ModName, id: string, fn: ModFn): void {
  const list = MODS[name];
  const i = list.findIndex((x) => x.id === id);
  if (i >= 0) list[i] = { id, fn };
  else list.push({ id, fn });
}

/** Aplica os modificadores em cadeia; devolve o valor final e os rótulos (para a autópsia). */
export function applyMods(s: GameState, name: ModName, value: number, ctx: ModCtx = {}): { value: number; factors: { label: L; ratio: number }[] } {
  const factors: { label: L; ratio: number }[] = [];
  const lower = MOD_CAP18[name]?.lower;
  let boost = 1; // r18: produto dos multiplicadores favoráveis (retornos decrescentes no fim)
  let fam: Record<string, number> | null = null; // r19: pilha por família de causa (só appeal)
  const M19 = (globalThis as { __mod19?: Record<string, { n: number; lg: number; max: number }> }).__mod19;
  for (const m of MODS[name]) {
    const res = m.fn(s, value, ctx);
    if (!res || !Number.isFinite(res.value)) continue;
    if (value > 0 && res.value > 0) {
      const r = res.value / value; const f = lower ? 1 / r : r;
      if (f > 1 && f <= SMALL18) boost *= f;
      const c = f > 1 && f <= CAT_BIG19 ? modCat19(name, m.id) : undefined;
      if (c) { fam ??= {}; fam[c] = (fam[c] ?? 1) * f; }
      if (M19) { const x = (M19[`${name}:${m.id}`] ??= { n: 0, lg: 0, max: 0 }); x.n++; x.lg += Math.log(r); x.max = Math.max(x.max, r); }
    }
    if (res.label && value > 0 && Math.abs(res.value / value - 1) > 0.005) factors.push({ label: res.label, ratio: res.value / value });
    value = res.value;
  }
  if (fam && value > 0) {
    let ca = 1;
    for (const B of Object.values(fam)) ca *= catAdj19(name, B);
    if (ca < 0.9995) { value *= ca; boost *= ca; factors.push({ label: DIMINISH19, ratio: ca }); capStat18('cat:' + name, 1 / ca - 1, 0); }
  }
  const adj = modAdj18(name, boost);
  capStat18('mod:' + name, boost - 1, adj === 1 ? boost - 1 : (lower ? boost / adj : boost * adj) - 1);
  if (adj !== 1 && value > 0) { value *= adj; if (Math.abs(adj - 1) > 0.005) factors.push({ label: DIMINISH18, ratio: adj }); }
  return { value, factors };
}

// ---------------------------------------------------------------- cenas para a interface

/** Momento que a interface deve mostrar (premiação, crítica do lançamento, entrevista...). */
export interface Cutscene {
  id: string;
  kind: string;
  week: number;
  data: Record<string, unknown>;
  seen?: boolean;
}

/** r19 (cenas): `hold` segura uma cena menor para espalhar picos (devolve true = guardada para depois);
 *  `trim` corta a fila sem perder cenas não vistas importantes. Preenchidos por sys/scenes19.ts. */
export const CS_HOOK19: { hold?: (s: GameState, cs: Cutscene) => boolean; trim?: (s: GameState) => void } = {};

export function queueCutscene(s: GameState, kind: string, data: Record<string, unknown>): Cutscene {
  s.cutscenes ??= [];
  // r19: id por contador que só cresce (antes usava o tamanho da fila, que repetia depois do corte em 40)
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {}) as { csSeq?: number };
  x.csSeq = (x.csSeq ?? 0) + 1;
  const cs: Cutscene = { id: `cs${s.week}-n${x.csSeq}-${kind}`, kind, week: s.week, data };
  if (CS_HOOK19.hold?.(s, cs)) return cs;
  s.cutscenes.push(cs);
  if (CS_HOOK19.trim) CS_HOOK19.trim(s);
  else if (s.cutscenes.length > 40) s.cutscenes.splice(0, s.cutscenes.length - 40);
  return cs;
}

// ---------------------------------------------------------------- eventos (sem ciclo de imports)

type EventDefLike = { id: string };
let registrar: ((defs: never[]) => void) | null = null;
const pendingEvents: EventDefLike[][] = [];

/**
 * Registra eventos de um sistema da rodada 4. Como os sistemas podem carregar antes de events.ts
 * terminar (ciclo de imports), a lista fica na fila até events.ts chamar setEventRegistrar.
 */
export function deferEvents<T extends EventDefLike>(defs: T[]): void {
  if (registrar) registrar(defs as never[]);
  else pendingEvents.push(defs);
}

export function setEventRegistrar(fn: (defs: never[]) => void): void {
  registrar = fn;
  for (const defs of pendingEvents.splice(0)) fn(defs as never[]);
}

// ---------------------------------------------------------------- propostas (rodada 8)

/** Sistemas acrescentam motivos à avaliação de propostas de contrato (preferências, memória, rivais).
 *  Fica aqui (módulo sem dependências) para não sofrer com a ordem de carga dos imports.
 *  Precisam ser puros: a interface chama a avaliação a cada tecla. */
export type OfferMod = (s: GameState, act: Act, o: Omit<Offer, 'id' | 'week' | 'status'>) => { delta: number; reason?: L } | null;
const OFFER_MODS: { id: string; fn: OfferMod }[] = [];
export function registerOfferMod(id: string, fn: OfferMod): void {
  const i = OFFER_MODS.findIndex((x) => x.id === id);
  if (i >= 0) OFFER_MODS[i] = { id, fn };
  else OFFER_MODS.push({ id, fn });
}
export function offerMods(): { id: string; fn: OfferMod }[] {
  return OFFER_MODS;
}
