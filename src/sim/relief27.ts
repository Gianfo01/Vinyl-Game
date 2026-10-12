// Rodada 27 (AUD2) — ALÍVIO DE ESTRESSE COM CONSEQUÊNCIA. Módulo neutro (sem sistemas, sem ciclos): as ações
// "gaste X, estresse −N" (noitada, droga, viagem, saída de lazer) avisam aqui o que aconteceu, e quem quiser reage
// com o contexto (com quem você bebeu, quem te viu, o escritório sem você). Os ouvintes usam o próprio sorteio.
//
//   relief27(s, 'drink', 18)          // na ação, depois de aplicar o alívio
//   RELIEF27.push((s, kind, d) => …)  // no sistema que reage (sys/aud27/burnout27.ts)

import type { GameState } from './types';

export type Relief27 = 'drink' | 'drugs' | 'trip' | 'out';
export const RELIEF27: ((s: GameState, kind: Relief27, d: number, ref?: string) => void)[] = [];
export function relief27(s: GameState, kind: Relief27, d: number, ref?: string): void {
  for (const fn of RELIEF27) fn(s, kind, d, ref);
}
