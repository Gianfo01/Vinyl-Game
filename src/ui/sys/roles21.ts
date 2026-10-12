// Rodada 21 — aba "Funções" na página da pessoa: linha do tempo das funções na indústria (artista, selo, empresário,
// festival, produção…), somando registros reais do acervo e o que aconteceu nesta partida.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { ROLE21_NAME, spans21 } from '../../sim/sys/roles21';
import type { GameState, Person } from '../../sim/types';
import { pill, section } from '../common';
import { h } from '../dom';
import { PERSON_TABS } from '../pages';

function rolesView(s: GameState, p: Person): HTMLElement {
  const xs = spans21(s, p.id);
  return section(t(l('Funções ao longo do tempo', 'Roles over time')),
    h('ol', { class: 'r21-tl' }, ...xs.map((x) => {
      const on = !x.ended && x.from <= s.year && (x.to === undefined || x.to >= s.year);
      const when = `${x.from}–${x.to ?? (x.ended ? '?' : t(l('hoje', 'now')))}`;
      return h('li', { class: on ? 'on' : '' }, h('b', null, t(ROLE21_NAME[x.k])), x.org ? ` · ${x.org}` : '', ' ', h('span', { class: 'muted small' }, when), ' ',
        on ? pill(t(l('ativa', 'active')), 'good') : null, x.why ? h('div', { class: 'muted small' }, t(x.why)) : null);
    })),
    h('p', { class: 'muted small' }, t(l('Uma pessoa pode acumular funções. Cada função nova mexe no mundo: selos disputam talentos, empresários oferecem representação, festivais montam escalações, financiadores bancam discos.', 'A person can hold several roles. Each new role moves the world: labels fight for talent, managers offer representation, festivals build line-ups, financiers fund records.'))));
}

PERSON_TABS.push((s, p) => (spans21(s, p.id).length > 1 ? { id: 'roles21', label: l('Funções', 'Roles'), icon: 'briefcase', render: () => rolesView(s, p) } : null));
