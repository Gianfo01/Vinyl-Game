// Rodada 20 (G6 §5) — peças visuais folha (sem importar sistemas, para não criar ciclos de import):
// estado com ícone + texto, estado vazio útil e tabela textual de gráfico.

import type { L } from '../data/world';
import { l } from '../data/world';
import { t } from '../i18n/strings';
import { h } from './dom';
import { STATUS20, type Status20 } from './ux20';

/** Estado com ícone + texto (vocabulário único: ativo, planejado, pendente, bloqueado, concluído, expirado). */
export function status20(k: Status20, extra?: string): HTMLElement {
  const x = STATUS20[k];
  return h('span', { class: `pill st20 ${x.cls}` }, h('span', { 'aria-hidden': 'true' }, x.icon), ' ', t(x.name), extra ? ` · ${extra}` : '');
}
/** Estado vazio útil: o que falta, por que ainda não há resultado e a ação que inicia o fluxo. */
export function empty20(what: L, why?: L, action?: { label: L; run: () => void }): HTMLElement {
  return h('div', { class: 'empty20' }, h('p', null, t(what)), why ? h('p', { class: 'muted small' }, t(why)) : null,
    action ? h('button', { class: 'btn small', onclick: action.run }, t(action.label)) : null);
}
/** Tabela textual (recolhida) com os valores de um gráfico. */
export function chartTable20(name: string, cols: string[], rows: (string | number)[][]): HTMLElement {
  return h('details', { class: 'ch20-tbl small' }, h('summary', null, t(l('Ver como tabela', 'View as table'))),
    h('table', { class: 'tbl compact' }, h('caption', { class: 'sr-only' }, name),
      h('thead', null, h('tr', null, cols.map((c) => h('th', { scope: 'col' }, c)))),
      h('tbody', null, rows.map((r) => h('tr', null, r.map((c) => h('td', null, String(c))))))));
}
