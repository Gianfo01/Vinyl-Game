// Rodada 16 — ponte leve para a fama regional (sys/fame16). Sem importações de sistemas: pode ser usada por
// rivals.ts e fame15.ts sem ciclos. Sem o sistema regional carregado, tudo cai na fama global (Act.fame).
import type { Act, GameState } from './types';

type FameAt = (s: GameState, a: Act, where?: string) => number;
let fn: FameAt | null = null;
export const setFameAt = (f: FameAt): void => { fn = f; };
/** Fama do ato num lugar: id de cidade, país (a3), '@me' (país do jogador) ou nada (onde o ato está agora). */
export const fameAt = (s: GameState, a: Act, where?: string): number => (fn ? fn(s, a, where) : a.fame);
