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

import type { Rng } from '../core/rng';
import type { L } from '../data/world';
import type { Act, GameState, Release, Song } from './types';

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
  for (const h of HOOKS[phase]) h.fn(s, r, arg);
}

// ---------------------------------------------------------------- modificadores

export interface ModCtx {
  release?: Release;
  act?: Act;
  cityId?: string;
  song?: Song;
}
export type ModName = 'appeal' | 'cityDemand' | 'pressingCost' | 'songQ' | 'showRevenue' | 'chartUnits';
type ModFn = (s: GameState, value: number, ctx: ModCtx) => { value: number; label?: L } | null;
const MODS: Record<ModName, { id: string; fn: ModFn }[]> = { appeal: [], cityDemand: [], pressingCost: [], songQ: [], showRevenue: [], chartUnits: [] };

export function registerMod(name: ModName, id: string, fn: ModFn): void {
  const list = MODS[name];
  const i = list.findIndex((x) => x.id === id);
  if (i >= 0) list[i] = { id, fn };
  else list.push({ id, fn });
}

/** Aplica os modificadores em cadeia; devolve o valor final e os rótulos (para a autópsia). */
export function applyMods(s: GameState, name: ModName, value: number, ctx: ModCtx = {}): { value: number; factors: { label: L; ratio: number }[] } {
  const factors: { label: L; ratio: number }[] = [];
  for (const m of MODS[name]) {
    const res = m.fn(s, value, ctx);
    if (!res || !Number.isFinite(res.value)) continue;
    if (res.label && value > 0 && Math.abs(res.value / value - 1) > 0.005) factors.push({ label: res.label, ratio: res.value / value });
    value = res.value;
  }
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

export function queueCutscene(s: GameState, kind: string, data: Record<string, unknown>): void {
  s.cutscenes ??= [];
  s.cutscenes.push({ id: `cs${s.week}-${s.cutscenes.length}-${kind}`, kind, week: s.week, data });
  if (s.cutscenes.length > 40) s.cutscenes.splice(0, s.cutscenes.length - 40);
}
