// Rodada 19 (T8, history19): Mundo › Marcos da história — os marcos 1926–2026 já acontecidos (nada do futuro), por década,
// com o fato documentado, a regra em jogo, se ainda vigora, a escolha do selo e o desfecho ("na sua partida", nos modos
// alternativos). Bloco no Cockpit para o marco mais recente do último ano.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { KIND19, cards19, mech19, type H19Card } from '../../sim/sys/history19';
import type { HK19 } from '../../data/hist19';
import type { GameState } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';
import { monthName, pill, rerender, section } from '../common';
import { h } from '../dom';
import { why18 } from '../explain18';
import { registerTab } from '../registry';
import { btn, note } from './world4/util';
import { HOME_EXTRA19 } from './home18';
import './era19.css';

let kind: HK19 | 'all' = 'all';
let dec = 0;

function card(c: H19Card): HTMLElement {
  const run = c.run;
  return h('article', { class: 'rh19-card' },
    h('h4', null, t(c.h.t), ` · ${c.h.m !== undefined ? monthName(c.h.m) + ' ' : ''}${c.h.y} `, pill(t(KIND19[c.h.k].name), c.h.k === 'crisis' ? 'bad' : ''),
      c.h.w ? pill(t(l('mundo', 'world')), 'gold') : null, c.on && c.h.until ? pill(t(fmtL(l('vigora até {y}', 'until {y}'), { y: c.h.until })), 'good') : null,
      c.before ? pill(t(l('antes do início', 'before your start')), '') : null),
    h('div', { class: 'rh19-side real' }, h('b', null, t(l('A história real', 'Real history'))), h('p', { class: 'small' }, t(c.h.x)), h('small', null, `${t(l('Fonte', 'Source'))}: ${c.h.ref}`)),
    h('div', { class: 'rh19-side' }, h('b', null, t(l('Em jogo', 'In the game'))), h('p', { class: 'small' }, t(mech19(c.h)))),
    !c.before ? h('div', { class: `rh19-side run ${run?.tone ?? ''}` }, h('b', null, t(l('Na sua partida', 'In your run'))),
      run ? h('p', { class: 'small' }, `${run.y}: ${t(l('o selo escolheu', 'the label chose'))} "${t(run.pick)}". `, run.out ? t(run.out) : t(l('As consequências ainda não chegaram.', 'The consequences have not arrived yet.')))
        : h('p', { class: 'small' }, t(l('O selo não decidiu nada: a história seguiu sem você.', 'The label decided nothing: history went on without you.'))),
      c.alt ? h('small', null, t(l('História alternativa: a partir do início, tudo pode mudar.', 'Alternate history: from the start, anything can change.'))) : null) : null);
}

function render(s: GameState): HTMLElement {
  const all = cards19(s);
  const decades = [...new Set(all.map((c) => Math.floor(c.h.y / 10) * 10))];
  const d = decades.includes(dec) ? dec : decades[0] ?? 0;
  const list = all.filter((c) => Math.floor(c.h.y / 10) * 10 === d && (kind === 'all' || c.h.k === kind));
  const top = playerActs(s)[0];
  const kinds: (HK19 | 'all')[] = ['all', 'wave', 'tech', 'law', 'stage', 'crisis', 'deal'];
  return h('div', null,
    h('p', { class: 'small muted' }, t(l('Marcos reais da indústria e do mundo que já aconteceram nesta partida. Cada um muda regras ou o gosto do público por um tempo e, quando acontece com o jogo em andamento, abre uma decisão com ecos.', 'Real industry and world milestones that have already happened in this run. Each changes rules or public taste for a while and, when it happens mid-game, opens a decision with echoes.'))),
    top ? h('p', { class: 'small' }, why18(s, 'hist19.ap', { act: top }, t(l('Como a história pesa no seu ato principal agora', 'How history weighs on your lead act now')))) : null,
    h('div', { class: 'row', role: 'group', 'aria-label': t(l('Década', 'Decade')) }, decades.map((x) => btn(`${x}s`, () => { dec = x; rerender(); }, { cls: x === d ? 'primary' : 'ghost', pressed: x === d }))),
    h('div', { class: 'row', role: 'group', 'aria-label': t(l('Tipo', 'Kind')) }, kinds.map((k) => btn(k === 'all' ? t(l('Todos', 'All')) : t(KIND19[k].name), () => { kind = k; rerender(); }, { cls: k === kind ? 'primary' : 'ghost', pressed: k === kind }))),
    list.length ? h('div', { class: 'rh19' }, list.map(card)) : note(l('Nada aqui ainda.', 'Nothing here yet.')),
  );
}

registerTab('worldHub', { id: 'history19', label: l('Marcos da história', 'History milestones'), icon: 'clock', order: 57, render });

HOME_EXTRA19.push((s) => {
  const fresh = cards19(s, { fresh: true }).slice(0, 1);
  if (!fresh.length) return [];
  return [{ id: 'home:h19', title: l('Marco da história', 'History milestone'), weight: 44, el: section(t(l('Marco da história', 'History milestone')), h('div', { class: 'rh19' }, fresh.map(card))), host: 'home' as const }];
});
