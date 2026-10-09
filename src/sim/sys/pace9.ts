// Rodada 9 — ritmo do mundo (extensão do Diretor de Histórias em src/sim/director.ts): espalha os fatos
// autônomos para que cada mês tenha algo, mas nenhum mês tenha tudo. Sem dependências pesadas (seguro
// na ordem de carga).

import { clamp, type Rng } from '../../core/rng';
import type { GameState } from '../types';


/** Ritmo do mundo: os fatos dramáticos autônomos (crises, bandas novas, surtos criativos, selos fundados)
 *  gastam um orçamento que se recupera mês a mês. Mês agitado segura o próximo; meses calmos aceleram. */
export function worldDramaOk(s: GameState, r: Rng, weight = 1): boolean {
  const d = s.flags.wdrama ?? 0;
  const quiet = s.flags.wquiet ?? 0;
  const p = d + weight > 8 ? 0.1 : d + weight > 4 ? 0.45 : 1;
  return r.chance(Math.min(1, p * (quiet >= 4 ? 1.6 : 1)));
}
/** Multiplicador de chance para sistemas do mundo: >1 depois de meses calmos, <1 depois de agitados. */
export function worldPace(s: GameState): number {
  const d = s.flags.wdrama ?? 0;
  return clamp((s.flags.wquiet ?? 0) >= 4 ? 1.6 : 1.2 - d / 8, 0.25, 1.6);
}
export function spendDrama(s: GameState, weight = 1): void {
  s.flags.wdrama = (s.flags.wdrama ?? 0) + weight;
  s.flags.wquiet = 0;
}

/** Chamado pelo diretor a cada mês. */
export function paceMonth(s: GameState): void {
  s.flags.wdrama = Math.round((s.flags.wdrama ?? 0) * 0.6 * 100) / 100;
  s.flags.wquiet = (s.flags.wquiet ?? 0) + 1;
}
