// Rodada 14 — Cockpit: a tela inicial junta a Mesa do mês (briefing, decisões, ofertas), a Caixa de
// entrada e a sede em pixel art. "desk" e "inbox" redirecionam para cá (careernav14.alias14), então
// atalhos (1, E), links do conselheiro e da sede continuam funcionando. A sede completa (ampliações,
// capacidade) segue na área própria (tecla 2).

import { HQ_LEVELS } from '../../data/rules';
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { rerender } from '../common';
import { h } from '../dom';
import { deskPanel } from '../panels/desk';
import { hqPanel } from '../panels/misc';
import { EXTRA_AREAS, extraSections, registerArea } from '../registry';
import { store } from '../store';
import { ic } from '../vis';
import './cockpit14.css';

const inbox = () => EXTRA_AREAS.find((a) => a.id === 'inbox');
const unread = (s: GameState) => inbox()?.badge?.(s) ?? 0;
const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

function hqMini(s: GameState): HTMLElement {
  const wrap = hqPanel(s).querySelector('.hq-wrap') as HTMLElement | null;
  return h('section', { class: 'card ck14-hq', id: 'ck14-hq' },
    h('div', { class: 'ck14-head' }, h('h3', null, ic('house'), ' ', s.config.companyName, h('small', { class: 'muted' }, ` · ${t(HQ_LEVELS[s.player.hq].name)}`)),
      h('button', { class: 'btn small ghost', onclick: () => { store.area = 'hq'; rerender(); } }, t(l('Sede completa', 'Full HQ')), ' (2)')),
    wrap ?? h('p', { class: 'muted' }, '—'));
}

export function cockpit(s: GameState): HTMLElement {
  const n = s.decisions.length, m = unread(s);
  const ib = inbox();
  const desk = deskPanel(s);
  const more = extraSections('desk', s);
  if (more) desk.appendChild(more);
  return h('div', { class: 'ck14' },
    h('div', { class: 'ck14-bar', role: 'toolbar', 'aria-label': t(l('Atalhos do cockpit', 'Cockpit shortcuts')) },
      h('b', null, t(l('Cockpit do mês', 'Monthly cockpit'))),
      h('button', { class: `btn small ${n ? 'primary' : 'ghost'}`, onclick: () => jump('ck14-desk') }, ic('calendar'), ' ', t(l('Decisões', 'Decisions')), ` (${n})`),
      h('button', { class: `btn small ${m ? '' : 'ghost'}`, onclick: () => jump('ck14-inbox') }, ic('newspaper'), ' ', t(l('Mensagens', 'Messages')), ` (${m})`),
      h('small', { class: 'muted' }, n ? t(l('Decisões ignoradas aplicam a opção padrão ao avançar.', 'Ignored decisions apply the default option when you advance.')) : t(l('Nenhuma decisão pendente: dá para avançar o mês.', 'No pending decisions: you can advance the month.')))),
    h('div', { class: 'ck14-top' },
      hqMini(s),
      h('div', { class: 'ck14-inbox', id: 'ck14-inbox' }, ib ? ib.render(s) : h('p', { class: 'muted' }, '—'))),
    h('div', { id: 'ck14-desk', class: 'ck14-desk' }, desk));
}

registerArea({ id: 'cockpit', label: l('Cockpit', 'Cockpit'), icon: 'calendar', key: '1', render: cockpit, badge: (s) => (s.decisions.length + unread(s)) || undefined });
