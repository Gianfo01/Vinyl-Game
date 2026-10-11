// Rodada 19 (era19 + realhist19): card "A era" no topo do Cockpit (fatores vivos de 1889–1931) e cartões
// "A história real" (o que aconteceu de verdade ao lado do que aconteceu na sua partida, nos modos alternativos):
// no Mundo (seção) e no Cockpit por alguns meses depois de cada marco.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { eraFactors19 } from '../../sim/sys/era19';
import { realCards19, type RHCard19 } from '../../sim/sys/realhist19';
import { w4 } from '../../sim/sys/world4/state';
import type { GameState } from '../../sim/types';
import { section } from '../common';
import { h } from '../dom';
import { why18 } from '../explain18';
import { registerSection } from '../registry';
import { HOME_EXTRA19 } from './home18';
import './era19.css';

export function eraCard19(s: GameState): HTMLElement | null {
  const f = eraFactors19(s);
  if (!f.length) return null;
  return h('section', { class: 'card era19' },
    h('h3', null, why18(s, 'era19.factors', {}, t(l('A era', 'The era'))), ' · ', String(s.year)),
    h('ul', null, f.map((x) => h('li', { class: x.tone }, h('b', null, t(x.t)), h('span', { class: 'small' }, t(x.d))))));
}

function rhCard(s: GameState, c: RHCard19): HTMLElement {
  const run = c.run;
  return h('article', { class: 'rh19-card' },
    h('h4', null, t(c.r.title), ` · ${c.r.year}`),
    h('div', { class: 'rh19-side real' }, h('b', null, t(l('A história real', 'Real history'))), h('p', { class: 'small' }, t(c.r.real)), h('small', null, `${t(l('Fonte', 'Source'))}: ${c.r.src}`)),
    c.alt ? h('div', { class: `rh19-side run ${run?.tone ?? ''}` }, h('b', null, t(l('Na sua partida', 'In your run'))),
      run ? h('p', { class: 'small' }, `${run.y}: ${t(l('o selo escolheu', 'the label chose'))} "${t(run.pick)}". `, run.out ? t(run.out) : t(l('As consequências ainda não chegaram.', 'The consequences have not arrived yet.')))
        : h('p', { class: 'small' }, t(l('O selo não participou: aqui a história seguiu sem você.', 'The label did not take part: here history went on without you.'))),
      h('small', null, t(l('História alternativa: a partir do início, tudo pode mudar.', 'Alternate history: from the start, anything can change.')))) : null);
}
export function realHistSection19(s: GameState): HTMLElement | null {
  const cs = realCards19(s);
  if (!cs.length) return null;
  return section(t(l('A história real', 'Real history')), h('div', { class: 'rh19' }, cs.map((c) => rhCard(s, c))));
}

registerSection('world', { id: 'rh19', order: 59, render: realHistSection19 });
HOME_EXTRA19.push((s) => {
  const out = [];
  const era = s.year < 1932 ? eraCard19(s) : null;
  if (era) out.push({ id: 'home:era19', title: l('A era', 'The era'), weight: 56, el: era, host: 'home' as const });
  const ms = w4(s).ms;
  const fresh = realCards19(s).filter((c) => (ms[c.r.ms] ?? -1) >= s.year - 1);
  if (fresh.length) out.push({ id: 'home:rh19', title: l('A história real', 'Real history'), weight: 48, el: h('section', { class: 'card rh19' }, fresh.map((c) => rhCard(s, c))), host: 'home' as const });
  return out;
});
