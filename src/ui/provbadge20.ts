// r20 (novarun §9.2): selo de procedência do lançamento — "Documentado" (roteiro real) × "Simulado" (gerado nesta partida).
import { l } from '../data/world';
import { t } from '../i18n/strings';
import { provOf20 } from '../sim/prov20';
import type { GameState, Release } from '../sim/types';
import { pill } from './common';

export const PROV_LABEL20 = {
  doc: l('Documentado', 'Documented'),
  sim: l('Simulado', 'Simulated'),
};
const PROV_TIP20 = {
  doc: l('Lançamento real, posto pelo roteiro documentado (modo exato/legado). Os números de venda são da simulação.', 'Real release, placed by the documented script (exact/legacy mode). Sales figures come from the simulation.'),
  sim: l('Gerado nesta partida (não é um fato histórico).', 'Generated in this run (not a historical fact).'),
};

export function provBadge20(s: GameState, r: Release): HTMLElement {
  const p = provOf20(s, r);
  const el = pill(t(PROV_LABEL20[p]), p === 'doc' ? 'gold' : '');
  el.title = t(PROV_TIP20[p]);
  el.classList.add('prov20', `prov20-${p}`);
  return el;
}
