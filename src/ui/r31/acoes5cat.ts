// R31 · onda 5 (ACOES5, EXP-13) — CATÁLOGO de ações, números e linhas dos cartões (preenchido a seguir).
import type { L } from '../../data/world';
import type { GameState } from '../../sim/types';
import type { ActDef5, NumDef5 } from './acoes5model';

export const ACTS_CAT5: Record<string, ActDef5> = {};
export const NUMS_CAT5: Record<string, NumDef5> = {};
export const LINES_CAT5: Record<string, (s: GameState) => L[]> = {};
