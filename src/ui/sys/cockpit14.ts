// r27 (COCK): o Cockpit é a 1ª seção do menu e a página inicial; o painel ficou enxuto (cockpit27model.ts):
// "Agora" (≤3 ações), a faixa do mês e ≤4 cartões; o resto foi para a aba "Mesa do mês" e para links.
// Rodada 14 — Cockpit: a tela inicial junta a Mesa do mês (briefing, decisões, ofertas), a Caixa de
// entrada e a sede em pixel art. "desk" e "inbox" redirecionam para cá (careernav14.alias14), então
// atalhos (1, E), links do conselheiro e da sede continuam funcionando. A sede completa (ampliações,
// capacidade) segue na área própria (tecla 2).

import { cockpitBadge23 } from '../../sim/counters23';
import { HQ_LEVELS } from '../../data/rules';
import { l, type L } from '../../data/world';
import { locale, t } from '../../i18n/strings';
import { artHook27, card27, emptyState27, list27, listRow27, pageHeader27 } from '../ps/ui27';
import type { Tone27 } from '../ps/ui27model';
import { go25 } from '../ps/hq25';
import type { Goto25 } from '../ps/hq25model';
import type { Goto18 } from '../../sim/inbox18';
import { cockpit27, type Card27m, type Cockpit27 } from './cockpit27model';
import { go18 } from './inbox18';
import { goToHub } from './project12';
import { store } from '../store';
import type { GameState } from '../../sim/types';
import { dateLabel, rerender } from '../common';
import { h } from '../dom';
import { deskPanel } from '../panels/desk';
import { campusThumb18 } from './campus18';
import { home18, homeBlocks18 } from './home18';
import { head19View } from './cockpit19';
import { deskBlocks19, pick19, renderBlocks19 } from '../blocks19';
import { EXTRA_AREAS, registerArea } from '../registry';
import { ic, setTab, tabs } from '../vis';
import { rumoInto28 } from '../end28'; // r28 (F4)
import { cockpit29Into } from '../ps/screens29'; // r29 REORG (M04/M17)
import { parts21 } from './ui20';
import { openSede27 } from '../ps/hqpeek27';
import './cockpit14.css';
import './cockpit27.css';

const inbox = () => EXTRA_AREAS.find((a) => a.id === 'inbox');
const unread = (s: GameState) => inbox()?.badge?.(s) ?? 0;

// r18 (campus18): a vista da sede em pixel art virou miniatura do "Nosso mundo" (clique abre o mapa completo)
// r27 (COCK): mora na aba "Mesa do mês" (fora do painel enxuto)
function hqMini(s: GameState): HTMLElement {
  return h('section', { class: 'card ck14-hq', id: 'ck14-hq' },
    h('div', { class: 'ck14-head h21' }, h('h3', null, h('span', { class: 'ic21' }, ic('globe', 2)), ' ', t(l('Nosso mundo', 'Our world')), h('small', { class: 'muted' }, ` · ${t(HQ_LEVELS[s.player.hq].name)}`)),
      h('button', { class: 'btn small', onclick: openSede27 }, t(l('Sede completa', 'Full HQ')), ' →')), // r27: abre a sede em corte (única vista de dentro)
    campusThumb18(s));
}

// ---------------------------------------------------------------- r27 (COCK): painel enxuto
const goTo = (g: Goto25 & Goto18): void => (g.person ? go18(g) : go25(g));
const tx = (x: L | string): string => (typeof x === 'string' ? x : t(x));
const TONE: Record<string, Tone27> = { bad: 'bad', warn: 'warn', good: 'good', info: 'info', idle: 'neutral' };

/** "Agora": até 3 ações por prioridade (o mesmo "Precisa de você" da sede); a primeira é o botão principal. */
function agoraView(m: Cockpit27): HTMLElement {
  return h('section', { class: 'ck27-now', 'aria-labelledby': 'ck27-now-h' },
    h('h2', { id: 'ck27-now-h', class: 'ck27-h' }, t(l('Agora', 'Now'))),
    m.agora.length
      ? h('ol', { class: 'ck27-acts' }, m.agora.map((n, i) => h('li', { class: `ck27-act t-${TONE[n.tone] ?? 'neutral'}` },
        h('span', { class: 'ck27-act-ic', 'aria-hidden': 'true' }, ic(n.icon, 2)),
        h('span', { class: 'ck27-act-b' }, h('b', null, t(n.title)), h('small', null, t(n.why))),
        h('button', { type: 'button', class: `btn small ${i === 0 ? 'primary' : ''}`, onclick: () => goTo(n.go) }, t(n.cta), ' ›'))))
      : emptyState27({ icon: 'check', title: l('Nada pede você agora.', 'Nothing needs you right now.'), why: l('Dá para avançar o mês.', 'You can advance the month.') }),
    m.agoraMore ? h('p', { class: 'small ck27-foot' }, h('button', { type: 'button', class: 'link', onclick: () => goTo({ area: 'cockpit', tab: ['ck20', 'inbox'] }) }, t(m.agoraMore), ' →')) : null);
}

function cardView(c: Card27m): HTMLElement {
  const rows = c.rows.map((r) => listRow27({
    title: tx(r.title), meta: r.meta ? tx(r.meta) : undefined, aside: r.aside ? tx(r.aside) : undefined, tone: r.tone,
    onClick: r.hub ? () => goToHub(r.hub!.actId, r.hub!.pid) : r.go ? () => goTo(r.go!) : undefined,
  }));
  return card27({ title: c.title, icon: c.icon, cls: `ck27-card ck27-${c.id}`,
    actions: [h('button', { type: 'button', class: 'btn small ghost', onclick: () => goTo(c.action.go) }, t(c.action.label), ' →')] },
  list27(c.title, rows), c.foot ? h('p', { class: 'small muted ck27-foot' }, t(c.foot)) : null);
}

/** Painel: Agora, (faixa do mês no cabeçalho), até 4 cartões e "Ver mais". */
function panel27(m: Cockpit27): HTMLElement {
  return h('div', { class: 'ck27' },
    agoraView(m),
    m.cards.length ? h('div', { class: 'ck27-grid' }, m.cards.map(cardView)) : null,
    m.empty.length ? h('p', { class: 'small muted ck27-empty' }, t(l('Ainda vazio: ', 'Still empty: ')), m.empty.map((e) => t(e.title)).join(' · '),
      t(l(' — aparecem aqui assim que existirem.', ' — they show up here once they exist.'))) : null,
    h('nav', { class: 'ck27-more', 'aria-label': t(l('Ver mais', 'See more')) },
      h('span', { class: 'ck27-more-l' }, t(l('Ver mais', 'See more')), ':'),
      m.more.map((x) => h('button', { type: 'button', class: 'link', onclick: () => goTo(x.go) }, t(x.label)))));
}

/** Mesa do mês: tudo o que saiu do painel (Hoje/Ameaças, blocos por peso, o que mudou, a Mesa e o Nosso mundo). */
function desk27(s: GameState): HTMLElement {
  const desk = deskPanel(s);
  // r19 (blocks19): cartões do topo + seções da Mesa num só conjunto com peso; ~6 abertos, resto em "Mais"
  const blocks = [...homeBlocks18(s), ...deskBlocks19(s)];
  const pk = pick19(s, blocks);
  const more = renderBlocks19(s, pk, 'desk');
  if (more.length) desk.appendChild(h('div', { class: 'extra-sections' }, more));
  const P = parts21(s);
  return h('div', { class: 'ck21-grid' },
    h('div', { class: 'ck21-main' }, head19View(s), home18(s, pk), P.change, h('div', { id: 'ck14-desk', class: 'ck14-desk' }, desk)),
    h('aside', { class: 'ck21-side' }, hqMini(s)));
}

export function cockpit(s: GameState): HTMLElement {
  const m = unread(s);
  const ib = inbox();
  const M = cockpit27(s, locale(), dateLabel(s));
  return h('div', { class: 'ck14 ck21 ck27-page' },
    // r27 (COCK): cabeçalho do sistema (ui27) — título, o que vale ao avançar e a faixa do mês (data, caixa, fôlego, fama).
    // Sem botões "Decisões (n)"/"Mensagens (n)": decisões aparecem uma vez (no Agora) e a caixa tem a própria aba.
    pageHeader27({ title: l('Cockpit', 'Cockpit'), area: 'cockpit', sub: M.sub, kpis: M.strip, art: artHook27.f?.('cockpit', s) ?? null, go: (a) => { setTab('ck20', 'panel'); goArea27(a); } }),
    tabs('ck20', [
      { id: 'panel', label: t(l('Painel', 'Panel')), render: () => cockpit29Into(rumoInto28(panel27(M), s), s) }, // r28 (F4): + "Rumo a: <final> (x/100)"; r29: + retomada e acompanhamento
      { id: 'inbox', label: t(l('Caixa de entrada', 'Inbox')), badge: m || undefined, render: () => h('div', { class: 'ck14-inbox', id: 'ck14-inbox' }, ib ? ib.render(s) : h('p', { class: 'muted' }, '—')) },
      { id: 'desk', label: t(l('Mesa do mês', 'Monthly desk')), render: () => desk27(s) },
    ], rerender));
}

/** r27 (J): KPI do cabeçalho leva à página (mesmo efeito de clicar no menu). */
function goArea27(a: string): void { store.area = a as typeof store.area; rerender(); }

registerArea({ id: 'cockpit', label: l('Cockpit', 'Cockpit'), icon: 'calendar', key: '1', render: cockpit, badge: (s) => cockpitBadge23(s) || undefined }); // r23 (B): só o que pede ação
