// Rodada 13: de onde vêm os pontos de habilidade (fontes fixas, conquistas com teto e diário).

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { YEARLY_SKILL_POINTS, skills } from '../../sim/sys/persona';
import { ACH_KINDS } from '../../sim/sys/skillpts13';
import type { GameState } from '../../sim/types';
import { section } from '../common';
import { h } from '../dom';

export function skillSources(s: GameState): HTMLElement {
  const S0 = skills(s);
  const pts = S0.achPts ?? {};
  return section(t(l('Fontes de pontos', 'Point sources')),
    h('ul', { class: 'small' },
      h('li', null, h('b', null, t(l('Cada ano vivido', 'Every year lived'))), ` +${YEARLY_SKILL_POINTS}`),
      h('li', null, h('b', null, t(l('Marcos da carreira', 'Career milestones'))), ' +1'),
      ...ACH_KINDS.map((k) => h('li', null, h('b', null, t(k.name)), ` ${pts[k.id] ?? 0}/${k.cap} — `, h('span', { class: 'muted' }, t(k.desc))))),
    h('p', { class: 'muted small' }, t(l('Cada conquista paga uma vez só.', 'Each achievement pays only once.'))),
    (S0.achLog ?? []).length
      ? h('ul', { class: 'small' }, (S0.achLog ?? []).slice(0, 8).map((e) => h('li', null, h('span', { class: 'muted' }, `${t(l('sem.', 'wk'))} ${e.week} · `), t(e.text))))
      : h('p', { class: 'muted small' }, t(l('Nenhuma conquista rendeu pontos ainda.', 'No achievement has paid points yet.'))));
}
