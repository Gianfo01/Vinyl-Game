// Comparadores (GDD §46.7): carreiras lado a lado. Para atos de terceiros usa só o que o
// scouting revelou (intervalos), nunca o valor verdadeiro.

import { l } from '../data/world';
import { t } from '../i18n/strings';
import { estimate } from '../sim/scouting';
import type { GameState } from '../sim/types';
import { $, N, genreName, logo, modal } from './common';
import { h, select } from './dom';
import { ic } from './vis';

export function compareActs(s: GameState, initial: string[]): void {
  const pool = [...new Set([...Object.values(s.acts).filter((a) => a.owner === 'player').map((a) => a.id), ...Object.keys(s.knowledge)])].filter((id) => s.acts[id]);
  let picks = initial.filter((id) => pool.includes(id)).slice(0, 3);
  while (picks.length < 2 && pool[picks.length]) picks.push(pool.find((x) => !picks.includes(x))!);
  const body = h('div', { class: 'compare' });
  const row = (label: string, icon: string, f: (id: string) => string | HTMLElement) => h('tr', null, h('th', null, ic(icon), ' ', label), picks.map((id) => h('td', null, f(id))));
  const range = (id: string, field: 'fame' | 'talent' | 'potential') => {
    const r = estimate(s, id, field);
    if (!r) return h('span', { class: 'muted' }, '?');
    return h('span', { class: 'range-cell' }, `${r.lo}–${r.hi}`, h('span', { class: 'bar range' }, h('span', { style: `left:${r.lo}%;width:${Math.max(2, r.hi - r.lo)}%` })));
  };
  const draw = () => {
    body.replaceChildren(
      h('div', { class: 'row wrap' }, picks.map((id, i) => select(id, pool.map((x) => ({ value: x, label: s.acts[x].name })), (v) => { picks[i] = v; draw(); })),
        picks.length < 3 ? h('button', { class: 'btn small ghost', onclick: () => { const n = pool.find((x) => !picks.includes(x)); if (n) picks.push(n); draw(); } }, '+') : null),
      h('table', { class: 'tbl compare-tbl' },
        h('thead', null, h('tr', null, h('th'), picks.map((id) => h('th', null, logo(s.acts[id], 40), h('div', null, s.acts[id].name))))),
        h('tbody', null,
          row(t(l('Gênero', 'Genre')), 'guitar', (id) => genreName(s.acts[id].genre)),
          row(t(l('Fama', 'Fame')), 'fame', (id) => range(id, 'fame')),
          row(t(l('Talento', 'Talent')), 'sparkle', (id) => range(id, 'talent')),
          row(t(l('Potencial', 'Potential')), 'chart-up', (id) => range(id, 'potential')),
          row(t(l('Fãs (núcleo)', 'Fans (core)')), 'fans', (id) => (s.acts[id].owner === 'player' || (s.knowledge[id]?.degree ?? 0) >= 2 ? N(s.acts[id].fans.core) : '?')),
          row(t(l('Hits / #1', 'Hits / #1')), 'trophy', (id) => `${s.acts[id].hits} / ${s.acts[id].number1s}`),
          row(t(l('Caixa próprio', 'Own cash')), 'money', (id) => (s.acts[id].owner === 'player' ? $(s.acts[id].cash) : '?')),
          row(t(l('Integrantes', 'Members')), 'fans', (id) => String(s.acts[id].members.length)),
        ),
      ),
      h('p', { class: 'muted small' }, t(l('Atos de terceiros mostram apenas intervalos do scouting.', 'Other acts show scouting ranges only.'))),
    );
  };
  draw();
  modal(t(l('Comparar carreiras', 'Compare careers')), body, { wide: true });
}
