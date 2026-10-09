// Rivais respondem à vista (rodada 12): avisos com escolha nas telas certas (mercado, estúdio,
// lançamentos, shows, catálogo, sede, mesa) e a aba "Disputas e acordos" na ficha de cada selo.

import { l, marketById, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { dealWith, endDeal, openContests, OPT_TXT, recentContests, respond, rivals12, rivalWho, type Contest, type ContestKind, type Screen } from '../../sim/sys/rivals12';
import { leaderOf } from '../../sim/sys/leaders10';
import type { GameState } from '../../sim/types';
import { $, actLink, labelLink, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { registerPageTab, registerSection, type SectionHost } from '../registry';
import { ic } from '../vis';
import './rivals12.css';

const ICON: Record<ContestKind, string> = { bid: 'gavel', auction: 'gavel', date: 'calendar', producer: 'mic', market: 'globe', catalog: 'disc', fest: 'star', deal: 'handshake', deal_end: 'broken-heart', info: 'newspaper' };
const KIND: Record<ContestKind, L> = {
  bid: l('Guerra de lances', 'Bidding war'), auction: l('Leilão', 'Auction'), date: l('Janela de lançamento', 'Release window'), producer: l('Produtor disputado', 'Contested producer'),
  market: l('Mercado regional', 'Regional market'), catalog: l('Catálogo à venda', 'Catalog for sale'), fest: l('Vaga de festival', 'Festival slot'),
  deal: l('Proposta de distribuição', 'Distribution offer'), deal_end: l('Acordo encerrado', 'Deal ended'), info: l('Jogada rival', 'Rival move'),
};
const doneTxt = (d: string): string => {
  const auto = d.startsWith('auto:');
  const o = OPT_TXT[auto ? d.slice(5) : d];
  if (d === 'gone' || d === 'expired') return t(l('encerrado', 'closed'));
  return `${auto ? t(l('sem resposta → ', 'no answer → ')) : ''}${o ? t(o[0]) : d}`;
};

/** Um aviso: o que o rival fez, por quê importa e as respostas possíveis. */
export function contestCard(s: GameState, c: Contest): HTMLElement {
  const left = c.until !== undefined && !c.done ? c.until - s.week : undefined;
  return h('div', { class: `riv12-card ${c.done ? 'done' : 'open'}` },
    h('div', { class: 'row wrap' }, ic(ICON[c.k]), ' ', pill(t(KIND[c.k]), c.k === 'deal' ? 'good' : c.done ? '' : 'warn'), ' ', labelLink(s, c.lb), c.a ? h('span', null, ' · ', actLink(s, c.a)) : null,
      left !== undefined ? h('small', { class: 'muted' }, ` · ${t(l('responder em {n} sem.', 'answer within {n} wk'), { n: Math.max(0, left) })}`) : null),
    h('p', { class: 'small' }, t(c.t)),
    c.why ? h('p', { class: 'small muted' }, ic('handshake'), ' ', t(c.why)) : null,
    c.done ? h('small', { class: 'muted' }, t(l('Sua resposta: ', 'Your answer: ')), doneTxt(c.done))
      : c.opts ? h('div', { class: 'row wrap' }, c.opts.map((o, i) => h('button', { class: `btn small ${i === 0 ? 'primary' : 'ghost'}`, title: t(OPT_TXT[o]?.[1] ?? l('', '')), onclick: () => { const e = respond(s, c.id, o); if (e) toast(t(e), 'bad'); rerender(); } }, t(OPT_TXT[o]?.[0] ?? l(o, o))))) : null,
  );
}

function strip(s: GameState, scr: Screen[] | undefined, title: L): HTMLElement | null {
  const open = openContests(s, scr);
  const recent = recentContests(s, scr, 8).filter((c) => !open.includes(c)).slice(-4).reverse();
  if (!open.length && !recent.length) return null;
  return section(t(title), h('div', { class: 'riv12-list' }, ...open.map((c) => contestCard(s, c)), ...recent.map((c) => contestCard(s, c))));
}

/** Acordos de distribuição em vigor (parceiros que também são rivais). */
function dealsBlock(s: GameState): HTMLElement | null {
  const on = rivals12(s).deals.filter((d) => d.st === 'on');
  if (!on.length) return null;
  return section(t(l('Distribuição por rivais', 'Distribution by rivals')),
    h('p', { class: 'small muted' }, t(l('Eles levam seus discos a mercados onde você não está e pagam um mínimo mensal — e continuam disputando artistas, datas e vagas com você. Cada confronto sobe a tensão; a 100, rompem.', 'They take your records to markets you are not in and pay a monthly minimum — and keep fighting you for artists, dates and slots. Every clash raises tension; at 100 they break it off.'))),
    h('ul', { class: 'small' }, on.map((d) => h('li', null, labelLink(s, d.lb), ` — ${t(marketById[d.m].name)} · ${$(d.fee)}/${t(l('mês', 'mo'))} · ${t(l('até a semana', 'until week'))} ${d.until} `,
      h('span', { class: 'meter-bar sm', title: `${t(l('Tensão', 'Tension'))} ${Math.round(d.ten)}/100` }, h('span', { style: `width:${Math.round(d.ten)}%;background:${d.ten > 70 ? 'var(--bad, #c33)' : ''}` })),
      ` ${t(l('tensão', 'tension'))} ${Math.round(d.ten)} `,
      h('button', { class: 'btn small ghost', onclick: () => { if (confirm(t(l('Encerrar o acordo? O parceiro não vai gostar.', 'End the deal? The partner will not like it.')))) { endDeal(s, d.id); rerender(); } } }, t(l('Encerrar', 'End')))))),
  );
}

const sec = (host: string, id: string, scr: Screen[] | undefined, title: L, order = 2) =>
  registerSection(host as SectionHost, { id, order, render: (s) => strip(s, scr, title) });

sec('desk', 'riv12-desk', undefined, l('Rivais respondendo', 'Rivals responding'), 3);
sec('market', 'riv12-market', ['market'], l('Disputas por talento', 'Talent fights'), 0);
sec('studio', 'riv12-studio', ['studio'], l('Disputas no estúdio', 'Studio fights'), 0);
sec('releases', 'riv12-releases', ['releases'], l('Disputas pela janela de lançamento', 'Release window fights'), 0);
sec('creation', 'riv12-creation', ['studio', 'releases'], l('Rivais no seu caminho', 'Rivals in your way'), 0);
sec('shows', 'riv12-shows', ['shows'], l('Disputas por vagas de festival', 'Festival slot fights'), 0);
sec('catalog', 'riv12-catalog', ['catalog'], l('Disputas por catálogo', 'Catalog fights'), 0);
sec('business', 'riv12-business', ['catalog'], l('Disputas por catálogo', 'Catalog fights'), 0);
sec('world', 'riv12-world', ['world'], l('Mercados e acordos com rivais', 'Markets and deals with rivals'), 0);
sec('hq', 'riv12-hq', ['world'], l('Mercados e acordos com rivais', 'Markets and deals with rivals'), 2);
registerSection('hq', { id: 'riv12-deals', order: 2, render: dealsBlock });
registerSection('world', { id: 'riv12-deals', order: 1, render: dealsBlock });

registerPageTab('label', {
  id: 'rivals12', label: l('Disputas e acordos', 'Fights and deals'), icon: 'handshake', order: 9,
  when: (s, id) => rivals12(s).c.some((c) => c.lb === id) || rivals12(s).deals.some((d) => d.lb === id),
  render: (s, id) => {
    const d = dealWith(s, id);
    const ld = leaderOf(s, id);
    const list = rivals12(s).c.filter((c) => c.lb === id).slice(-10).reverse();
    return h('div', null,
      h('p', { class: 'small' }, t(rivalWho(s, id)), ' · ', t(l('rixa com você', 'feud with you')), ` ${Math.round(s.rivalries[id] ?? 0)}`,
        ld ? ` · ${t(l('líder com você', 'leader toward you'))} ${Math.round(ld.rel.player ?? 0)}` : '',
        d ? h('span', null, ' · ', pill(`${t(l('distribui você em', 'distributes you in'))} ${t(marketById[d.m].name)} · ${t(l('tensão', 'tension'))} ${Math.round(d.ten)}`, d.ten > 70 ? 'bad' : 'good')) : null),
      list.length ? h('div', { class: 'riv12-list' }, list.map((c) => contestCard(s, c))) : null,
    );
  },
});
