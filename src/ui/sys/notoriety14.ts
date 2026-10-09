// Rodada 14 — interface da notoriedade: painel na página Carreiras e resumo na sede (com o "porquê" de cada mudança).

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { careers } from '../../sim/sys/careers12';
import { PRESS_TXT, TIERS, careerLabel, fxText, noto, notoTier, notoriety, tierOf } from '../../sim/sys/notoriety14';
import type { GameState } from '../../sim/types';
import { section } from '../common';
import { bar, h } from '../dom';
import { registerSection } from '../registry';

/** Painel completo (página Carreiras): barra, degrau, efeito e histórico do motivo. */
export function notoPanel(s: GameState): HTMLElement {
  const st = noto(s);
  const act = careers(s).active;
  return section(t(l('Notoriedade nas carreiras', 'Career notoriety')),
    h('p', { class: 'muted small' }, t(l('Cresce com conquistas de cada ofício, decai devagar se você para de brilhar. Degraus: Desconhecido → Conhecido local → Nacional → Internacional → Lenda. ', 'Grows with each trade\'s achievements and slowly fades if you stop shining. Tiers: Unknown → Local name → National → International → Legend. ')), t(PRESS_TXT)),
    h('table', { class: 'tbl compact' }, h('tbody', null, act.map((id) => {
      const v = notoriety(s, id), i = notoTier(s, id), nx = TIERS[i + 1];
      return h('tr', null,
        h('td', null, h('b', null, t(careerLabel(id))), h('div', { class: 'small muted' }, t(fxText(id)))),
        h('td', { class: 'small' }, h('div', { class: 'row' }, bar(v), ` ${Math.round(v)}`), h('b', null, t(TIERS[i].name)), nx ? h('span', { class: 'muted' }, ` · ${t(l('próximo', 'next'))}: ${nx.min}`) : null),
        h('td', { class: 'small muted' }, `${t(l('pico', 'peak'))} ${Math.round(st.peak[id] ?? v)}`));
    }))),
    st.log.length ? h('ul', { class: 'small' }, st.log.slice(-8).reverse().map((x) => h('li', { class: x.d < 0 ? 'bad' : x.d > 0 ? 'good' : '' }, `${x.y}: ${t(x.t)}`))) : h('p', { class: 'small muted' }, t(l('Nenhum marco ainda: faça sucesso, ganhe prêmios, lote shows.', 'No milestones yet: score hits, win awards, sell out shows.'))));
}

/** Resumo na sede: um chip por carreira ativa, com a última razão. */
function hqNoto(s: GameState): HTMLElement | null {
  const act = careers(s).active;
  const st = noto(s);
  const last = st.log[st.log.length - 1];
  return section(t(l('Notoriedade', 'Notoriety')),
    h('div', { class: 'row wrap small' }, act.map((id) => h('span', { class: 'pill', title: t(fxText(id)) }, `${t(careerLabel(id))}: ${t(TIERS[tierOf(st.v[id] ?? 0)].name)} (${Math.round(st.v[id] ?? 0)})`))),
    last ? h('p', { class: 'small muted' }, `${last.y}: ${t(last.t)}`) : null);
}
registerSection('hq', { id: 'noto14', order: 1, render: hqNoto });
