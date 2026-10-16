// Comparadores (GDD §46.7): carreiras lado a lado. Para atos de terceiros usa só o que o
// scouting revelou (intervalos), nunca o valor verdadeiro.
// R31 (N): qualquer artista conhecido; cada linha passa pelo que você sabe (know.ts › see) e o que não se sabe vira "?"
// com um botão para mandar o olheiro.

import { l } from '../data/world';
import { t } from '../i18n/strings';
import { estimate } from '../sim/scouting';
import { see, type SeeField } from '../sim/know';
import { watchAct } from '../sim/scouting';
import type { GameState } from '../sim/types';
import { $, N, genreName, logo, modal, toast } from './common';
import { h, select } from './dom';
import { ic } from './vis';
import { knownActIds31 } from '../sim/sys/knownacts27';

export function compareActs(s: GameState, initial: string[]): void {
  // r31 F: além do seu elenco e do radar, todo ato que a sua empresa conhece (inclusive a superestrela pública)
  const pool = [...new Set([...Object.values(s.acts).filter((a) => a.owner === 'player').map((a) => a.id), ...Object.keys(s.knowledge), ...knownActIds31(s)])].filter((id) => s.acts[id]);
  let picks = initial.filter((id) => pool.includes(id)).slice(0, 3);
  while (picks.length < 2 && pool[picks.length]) picks.push(pool.find((x) => !picks.includes(x))!);
  const body = h('div', { class: 'compare' });
  const row = (label: string, icon: string, f: (id: string) => string | HTMLElement) => h('tr', null, h('th', null, ic(icon), ' ', label), picks.map((id) => h('td', null, f(id))));
  // R31 (N): "?" com o atalho para o olheiro (só para quem ainda não está no radar)
  const unknown = (id: string) => h('span', { class: 'muted' }, '? ', s.acts[id].owner === 'player' || s.knowledge[id] ? null
    : h('button', { class: 'btn tiny ghost', title: t(l('Mandar o olheiro', 'Send the scout')), onclick: () => { toast(t(watchAct(s, id) ? l('Olheiro a caminho: o ato entrou no radar.', 'Scout on the way: the act is on the radar.') : l('Não deu para mandar o olheiro agora.', 'Could not send the scout now.'))); draw(); } }, '🔎'));
  const known = (id: string, f: SeeField, v: () => string | HTMLElement) => (see(s, id, f) === 'hidden' ? unknown(id) : v());
  const range = (id: string, field: 'fame' | 'talent' | 'potential') => {
    const r = estimate(s, id, field);
    if (!r) return unknown(id);
    return h('span', { class: 'range-cell' }, r.lo === r.hi ? String(r.lo) : `${r.lo}–${r.hi}`, h('span', { class: 'bar range' }, h('span', { style: `left:${r.lo}%;width:${Math.max(2, r.hi - r.lo)}%` })));
  };
  const draw = () => {
    body.replaceChildren(
      h('div', { class: 'row wrap' }, picks.map((id, i) => select(id, pool.map((x) => ({ value: x, label: s.acts[x].name })), (v) => { picks[i] = v; draw(); })),
        picks.length < 3 ? h('button', { class: 'btn small ghost', onclick: () => { const n = pool.find((x) => !picks.includes(x)); if (n) picks.push(n); draw(); } }, '+') : null),
      h('table', { class: 'tbl compare-tbl' },
        h('thead', null, h('tr', null, h('th'), picks.map((id) => h('th', null, logo(s.acts[id], 40), h('div', null, s.acts[id].name))))),
        h('tbody', null,
          row(t(l('Gênero', 'Genre')), 'guitar', (id) => known(id, 'public', () => genreName(s.acts[id].genre))),
          row(t(l('Fama', 'Fame')), 'fame', (id) => range(id, 'fame')),
          row(t(l('Talento', 'Talent')), 'sparkle', (id) => range(id, 'talent')),
          row(t(l('Potencial', 'Potential')), 'chart-up', (id) => range(id, 'potential')),
          row(t(l('Fãs (núcleo)', 'Fans (core)')), 'fans', (id) => known(id, 'fans', () => N(s.acts[id].fans.core))),
          row(t(l('Hits / #1', 'Hits / #1')), 'trophy', (id) => known(id, 'public', () => `${s.acts[id].hits} / ${s.acts[id].number1s}`)),
          row(t(l('Caixa próprio', 'Own cash')), 'money', (id) => (s.acts[id].owner === 'player' ? $(s.acts[id].cash) : h('span', { class: 'muted' }, '?'))),
          row(t(l('Integrantes', 'Members')), 'fans', (id) => known(id, 'members', () => String(s.acts[id].members.length))),
        ),
      ),
      h('p', { class: 'muted small' }, t(l('Atos de terceiros mostram só o que você sabe (intervalos do olheiro); "?" é o que falta descobrir.', 'Other acts show only what you know (scout ranges); "?" is what is still unknown.'))),
    );
  };
  draw();
  modal(t(l('Comparar carreiras', 'Compare careers')), body, { wide: true });
}
