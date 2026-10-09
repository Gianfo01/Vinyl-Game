// Rodada 16 — matéria-prima começa no preço da época: antes todo jogo novo abria com ×1.00 em todos
// os materiais (o preço só andava 35% por mês rumo ao alvo), escondendo choques e eras logo no início.

import { registerSimHook } from '../ext4';
import type { Material } from './industry/state';
import { matTarget } from './industry/supply13';

registerSimHook('newgame', 'supply16', (s) => {
  const p = s.x4.industry.matPrice;
  for (const m of Object.keys(p) as Material[]) p[m] = Math.round(matTarget(m, s.year) * 100) / 100;
});
