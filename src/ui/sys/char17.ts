// Rodada 17 — origem profissional e ambição pertencem ao PERSONAGEM: aparecem (somente leitura, 🔒) no topo
// de Você e no cabeçalho da sua página de pessoa. Escolhidas no Novo Jogo (aba Personagem), não mudam no meio
// da partida — só um herdeiro com outros sonhos pode trazer outra ambição.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { AMBITIONS, ORIGINS, ambitionGoal, careers } from '../../sim/sys/careers12';
import type { GameState } from '../../sim/types';
import { h } from '../dom';
import { PERSON_HEAD_EXTRAS } from '../pages';
import { EXTRA_AREAS, registerArea } from '../registry';
import { ic } from '../vis';

export function charIdentity17(s: GameState): HTMLElement | null {
  const st = careers(s);
  const o = ORIGINS[st.origin], a = AMBITIONS[st.ambition];
  if (!o && !a) return null;
  const g = ambitionGoal(s);
  return h('div', { class: 'card char17', title: t(l('Definidas na criação do personagem; travadas durante a partida.', 'Set at character creation; locked for the run.')) },
    h('div', { class: 'row wrap small' },
      ic('lock'), ' ', o ? h('span', null, t(l('Origem', 'Origin')), ': ', h('b', null, t(o.name))) : null,
      a ? h('span', null, ' · ', t(l('Ambição', 'Ambition')), ': ', h('b', null, t(a.name))) : null,
      g ? h('span', { class: g.ok ? 'good' : 'muted' }, ` · ${t(l('meta do ano', 'year goal'))}: `, t(g.why)) : null),
    o ? h('div', { class: 'small muted' }, t(o.desc)) : null);
}

PERSON_HEAD_EXTRAS.push((s, p) => (p.isPlayer ? charIdentity17(s) : null));

const you = EXTRA_AREAS.find((x) => x.id === 'you');
if (you) registerArea({ ...you, render: (s) => h('div', null, charIdentity17(s), you.render(s)) });
