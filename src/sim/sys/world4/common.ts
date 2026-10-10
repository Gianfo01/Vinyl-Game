// Ajudantes comuns do sistema world4.

import { clamp } from '../../../core/rng';
import { familyOf } from '../../../data/world';
import type { Act, GameState, Release } from '../../types';
import { playerActs } from '../../util';
import { w4 } from './state';
import { allReleases17 } from '../../relidx17';

export const fam = (act: Act | undefined): string => (act ? familyOf(act.genre) : '');

export function mineRel(s: GameState, rel: Release | undefined): boolean {
  if (!rel) return false;
  return rel.owner === 'player' || !!s.acts[rel.actId]?.playerBand;
}

export function mineAct(s: GameState, act: Act | undefined): boolean {
  return !!act && (act.owner === 'player' || !!act.playerBand);
}

export function rep(s: GameState, k: keyof GameState['player']['reputation'], v: number): void {
  s.player.reputation[k] = clamp(s.player.reputation[k] + v, 0, 100);
}

/** Greve de gravação em vigor (marco de 1942–44 ou greves aleatórias do sindicato). */
export function strikeActive(s: GameState): { from: number; to: number } | null {
  const w = w4(s);
  if (w.strike && s.week < w.strike.to && s.week >= w.strike.from) return { from: w.strike.from, to: w.strike.to };
  if (s.economy.strikeUntil > s.week) return { from: s.economy.strikeUntil - 13, to: s.economy.strikeUntil };
  return null;
}

/** Atos do jogador vivos (não aposentados nem separados). */
export function liveMine(s: GameState): Act[] {
  return playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split');
}

/** Lançamentos do jogador ainda em circulação, mais novos primeiro. */
export function liveMineReleases(s: GameState, maxAge = 52): Release[] {
  return allReleases17(s).filter((r) => r.live && mineRel(s, r) && s.week - r.week <= maxAge).sort((a, b) => b.week - a.week);
}

export const hasMs = (s: GameState, id: string): boolean => w4(s).ms[id] !== undefined;
