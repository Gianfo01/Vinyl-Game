// Rodada 18 (decide18) — "Ligações do mês" no Cockpit: quando um sistema mexeu em outro (prédio → equipe, rixa →
// paradas, censura → rádio…), aparece aqui com o porquê encadeado (explain18 'link18').

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { LINKS18, links18Log } from '../../sim/sys/links18';
import { h } from '../dom';
import { registerSection } from '../registry';
import { ic } from '../vis';

registerSection('desk', { id: 'links18', order: 45, render: (s) => {
  const recent = links18Log(s).filter(([w]) => s.week - w <= 9).slice(0, 6);
  return h('section', { class: 'card lk18' },
    h('div', { class: 'ck14-head' }, h('h3', null, ic('handshake'), ' ', t(l('Ligações do mês', 'This month\'s links')))),
    recent.length ? h('ul', { class: 'small' }, recent.map(([, id, tx]) => h('li', null, h('b', { class: 'why18', 'data-why': 'link18', 'data-why-ctx': JSON.stringify({ id }), tabindex: '0' }, t(LINKS18.find((x) => x.id === id)?.a), ' → ', t(LINKS18.find((x) => x.id === id)?.b)), ': ', t(tx))))
      : h('p', { class: 'muted small' }, t(l('Nenhum sistema mexeu em outro neste mês.', 'No system nudged another this month.'))),
    h('details', null, h('summary', { class: 'small' }, t(l('Todas as ligações ({n})', 'All links ({n})'), { n: LINKS18.length })),
      h('ul', { class: 'small' }, LINKS18.map((x) => h('li', null, h('b', { class: 'why18', 'data-why': 'link18', 'data-why-ctx': JSON.stringify({ id: x.id }), tabindex: '0' }, t(x.a), ' → ', t(x.b)), ' — ', t(x.how))))));
} });
