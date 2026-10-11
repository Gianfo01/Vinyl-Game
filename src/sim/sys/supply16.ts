// Rodada 16 — matéria-prima começa no preço da época: antes todo jogo novo abria com ×1.00 em todos
// os materiais (o preço só andava 35% por mês rumo ao alvo), escondendo choques e eras logo no início.

import { registerSimHook } from '../ext4';
import type { Material } from './industry/state';
import { matTarget, matWhy } from './industry/supply13';
import { mainMaterial } from './industry/supply';
import { fmtL } from '../util';
import { registerAdvisorTip } from '../inbox18';
import { l } from '../../data/world';

registerSimHook('newgame', 'supply16', (s) => {
  const p = s.x4.industry.matPrice;
  for (const m of Object.keys(p) as Material[]) p[m] = Math.round(matTarget(m, s.year) * 100) / 100;
});

// r19 (equilíbrio): choque de matéria-prima (1917, 1941–46, 1973–75, 1979–81…) vira alerta do conselheiro enquanto durar —
// prensar sai mais caro e as prensas de terceiros têm fila: tiragens menores até o preço baixar (pega quem começa no meio dele).
registerAdvisorTip('supply16', (s) => {
  const main = mainMaterial(s.year), why = matWhy(main, s.year), x = s.x4?.industry?.matPrice?.[main] ?? 1;
  if (!why || x < 1.15) return [];
  return [{ id: 'mat-shock', level: 'warn' as const, text: fmtL(l('Matéria-prima cara: {w}', 'Pricey raw material: {w}'), { w: why }),
    why: [fmtL(l('Prensar custa ×{x} do normal e as prensas de terceiros têm fila.', 'Pressing costs ×{x} of normal and third-party presses are queued.'), { x: x.toFixed(2) }), l('Prefira tiragens pequenas e reprense se vender.', 'Prefer small runs and repress if it sells.')],
    goto: { area: 'supply18' } }];
});
