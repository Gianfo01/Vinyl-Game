// Rodada 15: no modo nomes reais, artistas famosos ganham o visual característico de cada fase
// (topete do Elvis, dreads do Marley, capacetes do Daft Punk, pintura do KISS…). A troca acontece
// quando a pessoa surge e sempre que a fase muda. Visual editado pelo jogador (sem `rl`) nunca é sobrescrito.

import { realLook15 } from '../../data/looks15';
import { registerSimHook } from '../ext4';
import type { GameState } from '../types';

/** Aplica/atualiza os visuais reais; devolve quantas pessoas mudaram. */
export function applyRealLooks15(s: GameState): number {
  if (!s.config.realNames) return 0;
  let n = 0;
  for (const p of Object.values(s.persons)) {
    if (p.isPlayer || (p.look && !p.look.rl)) continue;
    const L = realLook15(p.name, s.year);
    if (!L || p.look?.rl === L.rl) continue;
    p.look = L;
    n++;
  }
  return n;
}

registerSimHook('newgame', 'looks15', (s) => { applyRealLooks15(s); });
registerSimHook('month', 'looks15', (s) => { applyRealLooks15(s); });
