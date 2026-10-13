// Rodada 29 (REORG, M41 + S04) — vista do Elenco no formato do Atlas e a SELEÇÃO para lote. Preferência de vista e
// seleção são estado de interface. O lote é o fluxo de sempre (openBatch20): prévia por artista (elegível? efeito,
// tempo, custo), reversibilidade, e só aplica depois de "Revisar e confirmar…" + "Confirmar".

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { rerender } from '../common';
import { h } from '../dom';
import { openBatch20 } from '../sys/actmenu20';

const KEY = 'vtn29.rosterView';
export type RosterView29 = 'atlas' | 'detail';
export const rosterView29 = (): RosterView29 => { try { return localStorage.getItem(KEY) === 'detail' ? 'detail' : 'atlas'; } catch { return 'atlas'; } };
export const setRosterView29 = (v: RosterView29): void => { try { localStorage.setItem(KEY, v); } catch { /* sem armazenamento */ } };

const sel = new Set<string>();
/** Barra de seleção para ação em lote (marcar artistas → abrir a prévia). Só aparece com 2+ artistas. */
export function batchBar29(s: GameState, ids: string[]): HTMLElement | null {
  if (ids.length < 2) return null;
  for (const x of [...sel]) if (!ids.includes(x)) sel.delete(x);
  return h('section', { class: 'card bb29' },
    h('h3', null, t(l('Ação em lote', 'Batch action')), h('small', { class: 'muted' }, ` · ${sel.size}/${ids.length} ${t(l('marcados', 'selected'))}`)),
    h('div', { class: 'bb29-chips', role: 'group', 'aria-label': t(l('Artistas para o lote', 'Acts for the batch')) },
      ids.map((id) => h('label', { class: `check chip27 ${sel.has(id) ? 'on' : ''}` },
        h('input', { type: 'checkbox', checked: sel.has(id), onchange: (e: Event) => { if ((e.target as HTMLInputElement).checked) sel.add(id); else sel.delete(id); rerender(); } }), ' ', s.acts[id]?.name ?? id))),
    h('div', { class: 'row wrap' },
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => { ids.forEach((x) => sel.add(x)); rerender(); } }, t(l('Marcar todos', 'Select all'))),
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => { sel.clear(); rerender(); } }, t(l('Limpar', 'Clear'))),
      h('button', { type: 'button', class: 'btn small primary', disabled: !sel.size, onclick: () => openBatch20(s, [...sel][0], [...sel]) }, t(l('Prévia da ação em lote…', 'Batch action preview…')))),
    h('p', { class: 'small muted' }, t(l('Marcar não muda nada. A prévia mostra quem é elegível, o efeito, o custo e o que dá para desfazer; só aplica depois da sua confirmação.', 'Selecting changes nothing. The preview shows who is eligible, the effect, the cost and what can be undone; it only applies after you confirm.'))));
}
