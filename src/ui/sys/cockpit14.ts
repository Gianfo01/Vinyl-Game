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
import { campusThumb18 } from './campus18';
import { home18, homeBlocks18 } from './home18';
import { head19View } from './cockpit19';
import { deskBlocks19, pick19, renderBlocks19 } from '../blocks19';
import { EXTRA_AREAS, registerArea } from '../registry';
import { store } from '../store';
import { ic } from '../vis';
import './cockpit14.css';

const inbox = () => EXTRA_AREAS.find((a) => a.id === 'inbox');
const unread = (s: GameState) => inbox()?.badge?.(s) ?? 0;
const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

// r18 (campus18): a vista da sede em pixel art virou miniatura do "Nosso mundo" (clique abre o mapa completo)
function hqMini(s: GameState): HTMLElement {
  return h('section', { class: 'card ck14-hq', id: 'ck14-hq' },
    h('div', { class: 'ck14-head' }, h('h3', null, ic('house'), ' ', s.config.companyName, h('small', { class: 'muted' }, ` · ${t(HQ_LEVELS[s.player.hq].name)}`)),
      h('button', { class: 'btn small ghost', onclick: () => { store.area = 'campus18' as typeof store.area; rerender(); } }, t(l('Nosso mundo', 'Our world'))),
      h('button', { class: 'btn small ghost', onclick: () => { store.area = 'hq'; rerender(); } }, t(l('Sede completa', 'Full HQ')), ' (2)')),
    campusThumb18(s));
}

export function cockpit(s: GameState): HTMLElement {
  const n = s.decisions.length, m = unread(s);
  const ib = inbox();
  const desk = deskPanel(s);
  // r19 (blocks19): cartões do topo + seções da Mesa num só conjunto com peso; ~6 abertos, resto em "Mais"
  const blocks = [...homeBlocks18(s), { id: 'home:hq', title: l('Nosso mundo', 'Our world'), weight: 18, el: hqMini(s), host: 'home' as const }, ...deskBlocks19(s)];
  const pk = pick19(s, blocks);
  const more = renderBlocks19(s, pk, 'desk');
  if (more.length) desk.appendChild(h('div', { class: 'extra-sections' }, more));
  return h('div', { class: 'ck14' },
    h('div', { class: 'ck14-bar', role: 'toolbar', 'aria-label': t(l('Atalhos do cockpit', 'Cockpit shortcuts')) },
      h('b', null, t(l('Cockpit do mês', 'Monthly cockpit'))),
      h('button', { class: `btn small ${n ? 'primary' : 'ghost'}`, onclick: () => jump('ck14-desk') }, ic('calendar'), ' ', t(l('Decisões', 'Decisions')), ` (${n})`),
      h('button', { class: `btn small ${m ? '' : 'ghost'}`, onclick: () => jump('ck14-inbox') }, ic('newspaper'), ' ', t(l('Mensagens', 'Messages')), ` (${m})`),
      h('small', { class: 'muted' }, n ? t(l('Decisões ignoradas aplicam a opção padrão ao avançar.', 'Ignored decisions apply the default option when you advance.')) : t(l('Nenhuma decisão pendente: dá para avançar o mês.', 'No pending decisions: you can advance the month.')))),
    head19View(s), // r19: Hoje / Ameaças / Andamento
    home18(s, pk), // r18 decide18 + r19 blocks19: calendário, pulso, momentos, humor… (por peso)
    h('div', { class: 'ck14-inbox', id: 'ck14-inbox' }, ib ? ib.render(s) : h('p', { class: 'muted' }, '—')),
    h('div', { id: 'ck14-desk', class: 'ck14-desk' }, desk));
}

registerArea({ id: 'cockpit', label: l('Cockpit', 'Cockpit'), icon: 'calendar', key: '1', render: cockpit, badge: (s) => (s.decisions.length + unread(s)) || undefined });
