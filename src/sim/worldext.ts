// Estado inicial dos sistemas da expansão (clubes por cena, olheiros disponíveis, famílias).

import type { Rng } from '../core/rng';
import type { GameState } from './types';
import { seedClubs } from './culture';

export function initWorldExt(s: GameState, r: Rng): void {
  seedClubs(s, r);
  s.flags.geoDemand = 1;
  s.flags.geoPressing = 1;
}
