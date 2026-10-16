// Rodada 23 — ficha da pessoa: aba "Crime" quando o jogador SABE (boato/confirmado) que ela é membro de uma
// organização — patente, função, desde quando e o porquê; ou que virou ex-membro/delator(a).

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { crime17, orgById } from '../../sim/sys/crime17';
import { GONE23, RANK23, ROLE23, mem23 } from '../../sim/sys/crimemem23';
import type { GameState, Person } from '../../sim/types';
import { pill, section } from '../common';
import { h } from '../dom';
import { PERSON_TABS } from '../pages';

function box(s: GameState, p: Person): HTMLElement | null {
  const k = `p:${p.id}`;
  const m = mem23(s)[k];
  const g = (crime17(s).gone23 ?? []).filter((x) => x.k === k).at(-1);
  if (m && m.k >= 1) {
    const o = orgById(s, m.o);
    return section(t(l('Crime organizado', 'Organized crime')), h('div', { class: 'small' },
      h('p', null, pill(m.k === 2 ? t(l('confirmado', 'confirmed')) : t(l('boato', 'rumor')), m.k === 2 ? 'bad' : 'warn'), ' ',
        // r31 F #23: no boato só a organização; patente, função, número de crimes e o porquê só quando confirmado
        m.k === 2 ? `${o ? t(o.name) : m.o} · ${t(RANK23[m.rk])} · ${t(ROLE23[m.ro])} · ${t(l('crimes bem-sucedidos', 'successful jobs'))}: ${m.n}` : `${t(l('dizem que anda com', 'said to run with'))} ${o ? t(o.name) : m.o}`),
      m.k === 2 ? h('p', { class: 'muted' }, `${t(l('Por quê', 'Why'))}: ${m.why.map((w) => t(w)).join(' · ')}`) : null,
      h('p', { class: 'muted' }, t(m.k === 2
        ? l('Confirmado (caso, prisão ou delação): escândalo possível; apelo de rua em trap/drill/funk/corridos, fama de bandido nos outros gêneros.', 'Confirmed (case, prison or informant): scandal possible; street appeal in trap/drill/funk/corridos, gangster image in other genres.')
        : l('Boato: ninguém prova nada — mas o público já comenta (apelo de rua ou fama de bandido).', 'Rumor: nobody proves anything — but the public talks (street appeal or gangster image).'))),
    ));
  }
  if (g && g.how !== 'death') {
    const o = orgById(s, g.o);
    return section(t(l('Crime organizado', 'Organized crime')), h('p', { class: 'small' }, `${t(l('Ex-membro de', 'Former member of'))} ${o ? t(o.name) : g.o} (${t(RANK23[g.rk])}): ${t(GONE23[g.how])}.`));
  }
  return null;
}
PERSON_TABS.push((s, p: Person) => (box(s, p) ? { id: 'crime23', label: l('Crime', 'Crime'), icon: 'skull', render: () => box(s, p) } : null));
