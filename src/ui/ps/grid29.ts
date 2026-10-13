// Rodada 29 (REORG, S03) — vista da grade semana/mês com capacidade por recurso (modelo: grid29model.ts).
// Selecionar uma coluna mostra os itens do período (consulta); nada aqui avança o tempo.

import { l, type L } from '../../data/world';
import { formatMoney } from '../../core/money';
import { locale, t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { rerender } from '../common';
import { h } from '../dom';
import { openTarget29 } from './route29';
import { colItems29, grid29, type GridMode29, type Level29, type Row29 } from './grid29model';
import { show29 } from './state29model';
import { secTitle29 } from './shell29';
import './grid29.css';

const ui = { mode: 'week' as GridMode29, sel: 0 };
const lang = (): 'pt' | 'en' => (locale().startsWith('en') ? 'en' : 'pt');
const tx = (x: L | string): string => (typeof x === 'string' ? x : t(x));
const LVL: Record<Level29, L> = { ok: l('ok', 'ok'), warn: l('atenção', 'watch'), over: l('acima da capacidade', 'over capacity'), unknown: l('desconhecido', 'unknown'), none: l('livre', 'free') };

function cellText(r: Row29, i: number): string {
  const c = r.cells[i];
  if (r.kind === 'money') return show29(c.v, (n) => formatMoney(n, locale()), lang());
  if (r.kind === 'person') return show29(c.v, (n) => `${n}%`, lang());
  return show29(c.v, (n) => String(n), lang());
}

/** Grade + detalhe da coluna selecionada. */
export function grid29View(s: GameState): HTMLElement {
  const G = grid29(s, ui.mode);
  const sel = Math.min(ui.sel, G.cols.length - 1);
  const pick = (m: GridMode29) => h('button', { type: 'button', role: 'radio', 'aria-checked': ui.mode === m ? 'true' : 'false', class: ui.mode === m ? 'on' : '', onclick: () => { ui.mode = m; ui.sel = 0; rerender(); } },
    t(m === 'week' ? l('Semana', 'Week') : l('Mês', 'Month')));
  const items = colItems29(s, G.cols[sel]);
  return h('section', { class: 'g29' },
    h('div', { class: 'g29-head' }, secTitle29(l('Capacidade por recurso', 'Capacity by resource'), l('Pessoas, estúdio, dinheiro e tempo. Escolher um período é só consulta.', 'People, studio, money and time. Picking a period is only a lookup.')),
      h('div', { class: 'seg27', role: 'radiogroup', 'aria-label': t(l('Período da grade', 'Grid period')) }, pick('week'), pick('month'))),
    h('div', { class: 'g29-scroll' },
      h('table', { class: 'g29-t' },
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, t(l('Recurso', 'Resource'))),
          G.cols.map((c, i) => h('th', { scope: 'col', class: i === sel ? 'sel' : '' },
            h('button', { type: 'button', 'aria-pressed': i === sel ? 'true' : 'false', onclick: () => { ui.sel = i; rerender(); } }, tx(c.label)))))),
        h('tbody', null, G.rows.map((r) => h('tr', { class: `k-${r.kind}` },
          h('th', { scope: 'row' }, h('span', null, tx(r.label)), h('small', { class: 'muted' }, t(r.unit))),
          r.cells.map((c, i) => h('td', { class: `lv-${c.level} ${i === sel ? 'sel' : ''}`, title: c.note ? t(c.note) : undefined },
            h('b', null, cellText(r, i)), h('small', null, t(LVL[c.level]))))))))),
    h('div', { class: 'g29-det' },
      h('h3', null, t(l('Neste período', 'In this period')), ': ', tx(G.cols[sel].label)),
      items.length ? h('ul', { class: 'g29-items' }, items.map((d) => h('li', { class: d.act ? 'act' : '' },
        h('span', null, tx(d.t)), d.d ? h('small', { class: 'muted' }, ' — ', tx(d.d)) : null,
        d.goto?.area ? h('button', { type: 'button', class: 'btn small ghost', onclick: () => openTarget29({ area: d.goto!.area!, tab: d.goto!.tab }) }, t(l('Abrir origem', 'Open source')), ' ›') : null)))
        : h('p', { class: 'small muted' }, t(l('Nenhum prazo registrado neste período (isso não garante que esteja livre: veja a carga das pessoas acima).', 'No deadline recorded in this period (that does not mean it is free: see people\'s load above).')))),
    h('p', { class: 'small muted' }, 'ⓘ ', t(l('Desconhecido não é zero: o tempo pessoal só é calculado para o mês em curso. Avançar continua no botão de sempre.', 'Unknown is not zero: personal time is only computed for the current month. Advancing stays on the usual button.'))));
}
