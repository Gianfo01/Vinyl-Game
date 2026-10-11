// Rodada 20c (N2) — preço com "por quê" (moeda e base de tempo) e selo do tipo de custo (reformar/equipar/alugar/
// comprar/mudar/construir/ampliar × investimento/recorrente). Só desenha; a regra está em src/sim/sys/price20.ts.
import { COSTK20, NATURE20, priceBasis20, type CostKind20 } from '../sim/sys/price20';
import type { GameState } from '../sim/types';
import { t } from '../i18n/strings';
import { $, pill } from './common';
import { why18 } from './explain18';

/** Valor em dinheiro com a explicação 'price20' (US$ do ano; ≈ US$ de 2020) no hover/toque. */
export function price20(s: GameState, cents: number, k?: CostKind20, rec = false): HTMLElement {
  const el = why18(s, 'price20', { v: cents, k, rec }, $(cents));
  el.title = t(priceBasis20(s, cents));
  return el;
}
/** Selo "Reformar · Investimento (uma vez)". */
export function costKindPill20(k: CostKind20): HTMLElement {
  const d = COSTK20[k];
  const el = pill(`${t(d.name)} · ${t(NATURE20[d.nature])}`, d.nature === 'rec' ? 'warn' : '');
  el.title = t(d.desc);
  return el;
}
