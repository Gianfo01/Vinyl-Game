// R31 · onda 5 (ACOES5, EXP-13) — DADOS: o que entra no cartão de cada objeto (preenchido a seguir).
import type { L } from '../../data/world';
import type { Open5 } from './objects5';

export interface CardSpec5 { acts: string[]; nums: string[]; lines?: string; tip?: L; title?: L; all?: Open5 }
export const CARDS5: Record<string, CardSpec5> = {};
