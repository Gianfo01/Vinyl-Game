// Rodada 15 — modos de história: marca os atos reais cuja história o jogador alterou (contratou, roubou ou é a
// própria banda). No modo "Vida real exata" isso solta o ato do roteiro real daquele ponto em diante.

import { l } from '../../data/world';
import { registerSimHook } from '../ext4';
import { histMode } from '../history15';
import type { GameState } from '../types';
import { fmtL, notify, remember } from '../util';

function markAltered(s: GameState): void {
  const f = s.flags as Record<string, number>;
  for (const a of Object.values(s.acts)) {
    if (!a.catalogNo || !(a.owner === 'player' || a.playerBand) || f[`h15alt:${a.id}`]) continue;
    f[`h15alt:${a.id}`] = s.year;
    if (histMode(s) !== 'strict' || s.week <= 0) continue;
    const msg = fmtL(l('História alterada por você: {a} sai do roteiro da vida real — daqui em diante, a carreira depende das suas decisões.', 'History changed by you: {a} leaves the real-life script — from now on, their career depends on your decisions.'), { a: a.name });
    remember(s, 'history15', msg, { actId: a.id, important: true });
    notify(s, msg, 'info');
  }
}

registerSimHook('newgame', 'history15', (s) => markAltered(s));
registerSimHook('month', 'history15', (s) => markAltered(s));
