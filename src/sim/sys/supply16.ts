// Rodada 16 — matéria-prima começa no preço da época: antes todo jogo novo abria com ×1.00 em todos
// os materiais (o preço só andava 35% por mês rumo ao alvo), escondendo choques e eras logo no início.

import { registerSimHook } from '../ext4';
import type { Material } from './industry/state';
import { matTarget, matWhy } from './industry/supply13';
import { mainMaterial } from './industry/supply';
import { fmtL, notify } from '../util';
import { l } from '../../data/world';

registerSimHook('newgame', 'supply16', (s) => {
  const p = s.x4.industry.matPrice;
  for (const m of Object.keys(p) as Material[]) p[m] = Math.round(matTarget(m, s.year) * 100) / 100;
  // r19 (equilíbrio): começar no meio de um choque de matéria-prima (1917, 1941–46, 1973–75, 1979–81…) vem com aviso:
  // prensar sai mais caro e as prensas de terceiros têm fila — tiragens menores até o preço baixar.
  const main = mainMaterial(s.year), why = matWhy(main, s.year);
  if (why && (p[main] ?? 1) >= 1.15) notify(s, fmtL(l('Matéria-prima cara neste começo: {w} Prensar custa ×{x}; prefira tiragens pequenas e reprense se vender.', 'Pricey raw material at the start: {w} Pressing costs ×{x}; prefer small runs and repress if it sells.'), { w: why, x: (p[main] ?? 1).toFixed(2) }), 'bad');
});
