// Caixa de entrada por era: cada comunicação aparece como carta, telegrama, telefonema, fax, e-mail
// ou mensagem conforme o ano. Junta mensagens dos sistemas de pessoas, notificações e decisões.

import { l, type L } from '../../../data/world';
import { t } from '../../../i18n/strings';
import { resolveDecision } from '../../../sim/events';
import { answerMsg, inboxItems, markRead, unreadCount, type InboxItem } from '../../../sim/sys/people/inbox';
import { MEDIUM_NAME, mediumFor } from '../../../sim/sys/people/state';
import type { GameState } from '../../../sim/types';
import { dateOfDay } from '../../../sim/util';
import { monthName, rerender, toast } from '../../common';
import { h } from '../../dom';
import { store } from '../../store';

type Filter = 'all' | 'unread' | 'requests' | 'decisions' | 'notices';
let filter: Filter = 'all';

const FILTERS: [Filter, L][] = [
  ['all', l('Tudo', 'All')], ['unread', l('Não lidas', 'Unread')], ['requests', l('Pedidos', 'Requests')],
  ['decisions', l('Decisões', 'Decisions')], ['notices', l('Avisos', 'Notices')],
];

function dateOf(s: GameState, week: number): string {
  const d = dateOfDay(s.config.startYear, week * 7);
  return `${d.dom} ${monthName(d.month)} ${d.year}`;
}

function header(s: GameState, it: InboxItem): HTMLElement {
  const date = dateOf(s, it.week);
  const med = t(MEDIUM_NAME[it.medium]);
  switch (it.medium) {
    case 'letter': return h('div', { class: 'hd' }, `✉ ${med} · ${date}`, h('span', null, t(l('De: {f}', 'From: {f}'), { f: it.from })));
    case 'telegram': return h('div', { class: 'hd' }, `${med.toUpperCase()} · ${date} · ${it.from}`);
    case 'phone': return h('div', { class: 'hd' }, `${med} · ${date}`, h('span', null, t(l('Ligação de {f}', 'Call from {f}'), { f: it.from })));
    case 'fax': return h('div', { class: 'hd' }, `FAX · ${date} · ${t(l('DE', 'FROM'))}: ${it.from} · ${t(l('PARA', 'TO'))}: ${s.config.companyName}`);
    case 'email': return h('div', { class: 'hd' }, h('span', null, `${t(l('De', 'From'))}: ${it.from}`), h('span', null, `${t(l('Para', 'To'))}: ${s.config.companyName}`), h('span', null, date));
    default: return h('div', { class: 'hd' }, h('b', null, it.from), h('span', null, date));
  }
}

function body(it: InboxItem): string {
  const txt = t(it.body);
  if (it.medium === 'telegram') return `${txt.replace(/[.!?]\s*/g, ' STOP ').trim()}`;
  return txt;
}

function itemEl(s: GameState, it: InboxItem): HTMLElement {
  const m = it.msg;
  const d = it.decisionId ? s.decisions.find((x) => x.id === it.decisionId) : undefined;
  return h('li', { class: `ppl-msg ${it.medium} ${it.unread ? 'unread' : ''} ${it.tone === 'bad' ? 'bad' : ''}` },
    header(s, it),
    h('div', { class: 'sj' }, t(it.subject)),
    h('div', { class: 'bd' }, body(it)),
    m?.actions?.length && !m.resolved ? h('div', { class: 'ppl-actions' }, m.actions.map((a) => h('button', { class: 'btn small', onclick: () => { toast(t(answerMsg(s, m.id, a.id))); rerender(); } }, t(a.label)))) : null,
    m?.resolved ? h('div', { class: 'small muted' }, '✓ ', t(m.actions?.find((a) => a.id === m.resolved)?.label)) : null,
    d ? h('div', { class: 'ppl-actions' },
      d.options.map((o) => h('button', { class: 'btn small', title: t(o.hint), onclick: () => { resolveDecision(s, d.id, o.id); toast(t(o.label)); rerender(); } }, t(o.label))),
      h('button', { class: 'btn small ghost', onclick: () => { store.area = 'desk'; rerender(); } }, t(l('Ver na Mesa', 'Open the desk'))),
    ) : null,
    m && !m.read && !m.actions?.length ? h('button', { class: 'btn small ghost', onclick: () => { markRead(s, m.id); rerender(); } }, t(l('Marcar como lida', 'Mark as read'))) : null,
  );
}

export function inboxArea(s: GameState): HTMLElement {
  let items = inboxItems(s);
  if (filter === 'unread') items = items.filter((x) => x.unread);
  if (filter === 'requests') items = items.filter((x) => x.msg?.actions?.length);
  if (filter === 'decisions') items = items.filter((x) => x.source === 'decision');
  if (filter === 'notices') items = items.filter((x) => x.source === 'notification');
  const med = mediumFor(s.year);
  return h('div', { class: 'ppl-inbox-area' },
    h('section', { class: 'card' },
      h('h3', null, t(l('Caixa de entrada', 'Inbox')), ' ', h('span', { class: 'pill' }, t(l('Meio da época: {m}', 'Era medium: {m}'), { m: MEDIUM_NAME[med] }))),
      h('div', { class: 'ppl-filter', role: 'toolbar' },
        FILTERS.map(([id, lbl]) => h('button', { class: `btn small ${filter === id ? 'on' : ''}`, 'aria-pressed': filter === id ? 'true' : 'false', onclick: () => { filter = id; rerender(); } }, t(lbl))),
        h('button', { class: 'btn small ghost', onclick: () => { markRead(s); rerender(); } }, t(l('Marcar tudo como lido', 'Mark all as read'))),
      ),
      items.length ? h('ul', { class: 'ppl-inbox' }, items.slice(0, 60).map((it) => itemEl(s, it))) : h('p', { class: 'muted' }, t(l('Nada por aqui.', 'Nothing here.'))),
    ),
  );
}

export function inboxBadge(s: GameState): number | undefined {
  return unreadCount(s) || undefined;
}
