// Rodada 19 (onda 5, B.5): ponte sem dependências para o orçamento global de conflitos abertos. O narrador
// (events.storyteller), as situações (situations17) e o Mestre (dm18.opener) só leem `CONFLICTS19.full(s)`;
// quem soma (decisões, fios, rixas, ecos ruins, crises de clientes e do festival) é sim/sys/budget19.
import type { GameState } from './types';

export const CONFLICTS19 = {
  /** conflitos abertos (peso) e o teto do mês */
  n: (_s: GameState): number => 0,
  cap: (_s: GameState): number => 99,
  full(s: GameState): boolean { return this.n(s) >= this.cap(s); },
};
