// r27 (D1) — miniatura da sede em corte (a MESMA pixel art da tela da Sede, hqpx27.ts) para as telas antigas
// que tinham uma segunda vista interna (planta isométrica de ui/hq.ts): Gestão › Sede, Cockpit. Um clique abre
// a Sede. Assim só existe UMA vista de dentro da sede; o "Nosso mundo" (campus18) segue como a vista de fora.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { rerender } from '../common';
import { h } from '../dom';
import { lookOf } from '../pixel/avatar';
import { store } from '../store';
import { hqModel25 } from './hq25model';
import { drawHqCutaway27 } from './hqpx27';
import { SEDE25 } from './nav25';

/** Abre a tela da Sede (área virtual do Pixel Studio). */
export function openSede27(): void {
  store.area = SEDE25 as typeof store.area;
  rerender();
}

/** Botão com a sede em corte em tamanho natural (1 pixel lógico = 1 pixel; nítido), rolagem lateral se faltar espaço. */
export function hqPeek27(s: GameState): HTMLElement {
  const m = hqModel25(s);
  const cv = h('canvas', { class: 'hq27-peek-cv px', role: 'img', 'aria-label': t(l('Sua sede em corte', 'Your HQ, cut away')) }) as HTMLCanvasElement;
  try { drawHqCutaway27(cv, m, { look: (x) => lookOf((x.personId ? s.persons[x.personId] : undefined) ?? { id: x.id }), role: (x) => (x.personId ? s.persons[x.personId]?.role : null) ?? null }); } catch { /* sem canvas (testes) */ }
  return h('div', { class: 'hq27-peek' },
    h('button', { type: 'button', class: 'hq27-peek-btn', title: t(l('Abrir a Sede', 'Open the HQ')), onclick: openSede27 }, cv),
    h('button', { type: 'button', class: 'btn small', onclick: openSede27 }, t(l('Abrir a Sede (salas, pessoas e tarefas)', 'Open the HQ (rooms, people and tasks)')), ' →'));
}
