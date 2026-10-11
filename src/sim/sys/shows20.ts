// Rodada 20 (G5) — conflitos de agenda para o hub de Shows (puro, sem DOM).
// Duro: o mesmo artista teria duas datas em cidades diferentes na mesma semana (não dá para estar em dois lugares).
// Brando: disputa de público medida por clash17 — a MESMA conta que o modificador 'showRevenue' aplica no acerto,
// então o preview não promete uma penalidade que o motor não usa.

import type { L } from '../../data/world';
import type { GameState } from '../types';
import { clashOf, playerShows, weekOfDay, type PShow } from './clash17';

export interface ShowConflict20 { hard: boolean; soft: number; why: L[] }

/** Conflito de uma data já marcada (x) contra as demais datas do jogador. */
export function showConflict20(s: GameState, x: PShow, all: PShow[] = playerShows(s)): ShowConflict20 {
  const hard = all.some((y) => y !== x && y.actId === x.actId && y.w === x.w && y.city !== x.city);
  const a = s.acts[x.actId];
  const c = a ? clashOf(s, a, x.city, x.w) : { mult: 1, why: [] as L[] };
  return { hard, soft: Math.max(0, 1 - c.mult), why: c.why };
}

/** Datas futuras com conflito duro (badge da aba Agenda). */
export const hardConflictCount20 = (s: GameState): number => { const all = playerShows(s); return all.filter((x) => x.w >= s.week && showConflict20(s, x, all).hard).length; };

/** Conflitos de uma turnê em rascunho (paradas com dia absoluto). */
export function draftConflicts20(s: GameState, actId: string, stops: { cityId: string; day: number }[]): { hard: { city: string; other: string }[]; soft: L[] } {
  const act = s.acts[actId];
  const hard: { city: string; other: string }[] = [];
  const soft = new Map<string, L>();
  if (!act) return { hard, soft: [] };
  const mine = playerShows(s).filter((x) => x.actId === actId);
  for (const st of stops) {
    const w = weekOfDay(st.day);
    const dup = mine.find((x) => x.w === w);
    if (dup) hard.push({ city: st.cityId, other: dup.city });
    for (const why of clashOf(s, act, st.cityId, w).why) soft.set(why.pt, why);
  }
  return { hard, soft: [...soft.values()] };
}
