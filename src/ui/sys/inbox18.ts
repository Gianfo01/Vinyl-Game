// Rodada 18 (U2) — Caixa de entrada 2.0 no Cockpit (Football Manager): categorias, prioridade, "ir para",
// resposta na própria mensagem, arquivo e paginação. Substitui a área 'inbox' (mesmo id, mesmo atalho E),
// então o Cockpit e os links antigos continuam funcionando. Também o "ir para" comum (go18).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { resolveDecision } from '../../sim/events';
import { archive18, ib18, type Goto18, type InboxCat18 } from '../../sim/inbox18';
import { CAT18_NAME, items18, type Item18 } from '../../sim/sys/inbox18';
import { answerMsg, markRead, unreadCount } from '../../sim/sys/people/inbox';
import { MEDIUM_NAME, mediumFor } from '../../sim/sys/people/state';
import type { GameState } from '../../sim/types';
import { dateOfDay } from '../../sim/util';
import { inspect, monthName, rerender, toast } from '../common';
import { h } from '../dom';
import { registerArea } from '../registry';
import { personRoute16 } from '../route16';
import { store } from '../store';
import { ic, setTab } from '../vis';
import './core18.css';
import { decLocked18, decOptBody18, decTimer18, pendingView18, sender18, voice18, voiceTag18 } from './decide18';
import { pending18, thread18 } from '../../sim/sys/decide18';

/** Abre o destino de um "ir para" (pessoa, ato ou área/aba). */
export function go18(g: Goto18): void {
  if (g.person) {
    if (g.person.startsWith('a:')) { inspect.act(g.person.slice(2)); return; }
    if (personRoute16.f?.(g.person)) return;
  }
  if (g.act) { inspect.act(g.act); return; }
  if (g.area) { if (g.tab) setTab(g.tab[0], g.tab[1]); store.area = g.area as typeof store.area; rerender(); }
}
export const gotoLabel = (g: Goto18): L => g.label ?? (g.person ? l('Ver pessoa', 'See person') : g.act ? l('Ver artista', 'See act') : l('Ir', 'Go'));

const CAT_ICON: Record<InboxCat18, string> = { decision: 'calendar', people: 'fans', deals: 'contract', money: 'money', press: 'newspaper', world: 'globe', staff: 'handshake', life: 'heart', analyst: 'chart-up', other: 'key' };
type View = 'all' | 'unread' | 'reply' | 'urgent' | 'snoozed' | 'archived';
const ui = { cat: 'all' as InboxCat18 | 'all', view: 'all' as View, n: 12, open: new Set<string>(), sel: new Set<string>(), pend: false };
// r18 decide18: adiar mensagem (some até a semana), fios (consequência → decisão original; mesma pessoa) e seleção em lote
const snoozedMsg = (s: GameState, key: string): boolean => (ib18(s).snooze[`m:${key}`] ?? -1) > s.week;
const snoozeMsg = (s: GameState, key: string, w: number): void => { if (w) ib18(s).snooze[`m:${key}`] = s.week + w; else delete ib18(s).snooze[`m:${key}`]; };
const threadKey = (it: Item18): string | null => (it.msg?.ref?.thr ? `t:${it.msg.ref.thr}` : it.msg?.ref?.person && it.source === 'msg' ? `p:${it.msg.ref.person}` : null);

function dateOf(s: GameState, week: number): string {
  const d = dateOfDay(s.config.startYear, week * 7);
  return `${d.dom} ${monthName(d.month)} ${d.year}`;
}

function itemEl(s: GameState, it: Item18): HTMLElement {
  const m = it.msg;
  const d = it.decisionId ? s.decisions.find((x) => x.id === it.decisionId) : undefined;
  const pending = (m?.actions?.length && !m.resolved) || !!d;
  const body = t(it.body);
  const long = body.length > 180 && !ui.open.has(it.key);
  const tg = () => { if (ui.open.has(it.key)) ui.open.delete(it.key); else { ui.open.add(it.key); if (m && !m.actions?.length) markRead(s, m.id); } rerender(); };
  const v = m ? voice18(s, m) : null;
  const th = m?.ref?.thr ? thread18(s, String(m.ref.thr)) : undefined;
  const canSel = !pending;
  return h('li', { class: `ib18-it p${it.prio} ${it.unread ? 'unread' : ''} tone-${m?.ref?.tone ?? it.tone ?? ''}` },
    h('div', { class: 'ib18-hd' },
      canSel ? h('input', { type: 'checkbox', class: 'ib18-sel', 'aria-label': t(l('Selecionar', 'Select')), checked: ui.sel.has(it.key) ? true : undefined, onchange: () => { if (ui.sel.has(it.key)) ui.sel.delete(it.key); else ui.sel.add(it.key); rerender(); } }) : null,
      sender18(s, m, it.from, 22),
      ic(CAT_ICON[it.cat]), h('span', { class: 'ib18-cat' }, t(it.label ?? CAT18_NAME[it.cat])), v ? voiceTag18(v) : null, d ? decTimer18(s, d) : null,
      h('span', null, `· ${it.from} · ${dateOf(s, it.week)} · ${t(MEDIUM_NAME[it.medium])}`),
      it.prio >= 3 ? h('b', { class: 'bad' }, t(l('urgente', 'urgent'))) : it.prio === 2 ? h('b', null, t(l('importante', 'important'))) : null,
      m?.expires && !m.resolved && m.actions?.length ? h('small', { class: m.expires - s.week <= 2 ? 'bad' : 'muted' }, t(l('vence em {n} sem.', 'expires in {n} wk'), { n: Math.max(0, m.expires - s.week) })) : null),
    h('div', { class: 'ib18-sj', role: 'button', tabindex: '0', onclick: tg, onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') tg(); } }, t(it.subject)),
    th ? h('div', { class: 'ib18-th' }, '↳ ', t(l('continuação de', 'follow-up to')), ' ', h('b', null, t(th.t)), ' → ', t(th.o)) : null,
    h('div', { class: 'ib18-bd' }, v && it.source === 'msg' ? h('i', { class: 'ib18-open' }, t(v.open), ' ') : null, long ? `${body.slice(0, 170)}… ` : body, long ? h('button', { class: 'link', onclick: tg }, t(l('ler tudo', 'read more'))) : null),
    h('div', { class: 'ib18-acts' },
      m?.actions?.length && !m.resolved ? m.actions.map((a, i) => h('button', { class: `btn small ${i === 0 ? 'primary' : ''}`, title: i === m.actions!.length - 1 ? t(l('Opção padrão se você não responder', 'Default option if you don\'t reply')) : '', onclick: () => { toast(t(answerMsg(s, m.id, a.id))); rerender(); } }, t(a.label))) : null,
      m?.resolved ? h('small', { class: 'muted' }, '✓ ', t(m.actions?.find((a) => a.id === m.resolved)?.label)) : null,
      d ? d.options.map((o) => h('button', { class: `btn small ib18-opt ${o.id === d.defaultOption ? '' : 'primary'} ${decLocked18(s, d, o) ? 'dc18-locked' : ''}`, 'aria-disabled': String(decLocked18(s, d, o)), title: t(o.hint), onclick: () => { if (decLocked18(s, d, o)) return; resolveDecision(s, d.id, o.id); toast(t(o.label)); rerender(); } }, ...decOptBody18(s, d, o))) : null,
      it.goto ? h('button', { class: 'btn small ghost', onclick: () => { if (m) markRead(s, m.id); go18(it.goto!); } }, t(gotoLabel(it.goto)), ' →') : null,
      !pending && ui.view !== 'archived' ? h('button', { class: 'btn small ghost', title: t(l('Some por 4 semanas (fica em Adiadas)', 'Hidden for 4 weeks (kept in Snoozed)')), onclick: () => { snoozeMsg(s, it.key, ui.view === 'snoozed' ? 0 : 4); if (m) markRead(s, m.id); rerender(); } }, ui.view === 'snoozed' ? t(l('Trazer de volta', 'Bring back')) : t(l('Adiar', 'Snooze'))) : null,
      !pending ? h('button', { class: 'btn small ghost', title: t(l('Tira da lista (fica em Arquivadas)', 'Removes it from the list (kept in Archived)')), onclick: () => { archive18(s, it.key, ui.view !== 'archived'); if (m) markRead(s, m.id); rerender(); } }, ui.view === 'archived' ? t(l('Desarquivar', 'Unarchive')) : t(l('Arquivar', 'Archive'))) : null,
    ));
}

export function inbox18View(s: GameState, compact = false): HTMLElement {
  const all = items18(s, { archived: ui.view === 'archived' });
  const counts = new Map<string, number>();
  for (const it of all) if (it.unread || it.prio >= 2) counts.set(it.cat, (counts.get(it.cat) ?? 0) + 1);
  let items = ui.cat === 'all' ? all : all.filter((x) => x.cat === ui.cat);
  if (ui.view === 'snoozed') items = items.filter((x) => snoozedMsg(s, x.key)); else if (ui.view !== 'archived') items = items.filter((x) => !snoozedMsg(s, x.key));
  if (ui.view === 'unread') items = items.filter((x) => x.unread);
  if (ui.view === 'urgent') items = items.filter((x) => x.prio >= 2);
  if (ui.view === 'reply') items = items.filter((x) => (x.msg?.actions?.length && !x.msg.resolved) || x.source === 'decision');
  items = [...items].sort((a, b) => b.prio - a.prio || b.week - a.week);
  // fios: a mensagem mais importante/recente fica; as anteriores do mesmo fio entram dobradas debaixo dela
  const heads: Item18[] = [], kids = new Map<string, Item18[]>();
  for (const it of items) { const k = threadKey(it); if (k && kids.has(k)) kids.get(k)!.push(it); else { heads.push(it); if (k) kids.set(k, []); } }
  items = heads;
  const cats = [...new Set(all.map((x) => x.cat))];
  const shown = items.slice(0, ui.n);
  const empty: L = ui.view === 'archived' ? l('Nada arquivado. Arquive avisos lidos para limpar a caixa.', 'Nothing archived. Archive read notices to tidy the inbox.')
    : ui.view === 'reply' ? l('Nenhuma resposta pendente: tudo respondido.', 'No pending replies: all answered.')
      : l('Caixa limpa. Mensagens chegam com pedidos do elenco, propostas, alertas e o relatório do analista.', 'Inbox clear. Messages arrive with roster requests, offers, alerts and the analyst report.');
  return h('section', { class: 'card ib18' },
    h('div', { class: 'ck14-head' }, h('h3', null, ic('newspaper'), ' ', t(l('Caixa de entrada', 'Inbox')), ' ', h('small', { class: 'muted' }, t(MEDIUM_NAME[mediumFor(s.year)]))),
      h('span', { class: 'row wrap' },
        h('button', { class: `btn small ${ui.pend ? 'on' : 'ghost'}`, title: t(l('O que suas escolhas ainda podem trazer de volta', 'What your choices may still bring back')), onclick: () => { ui.pend = !ui.pend; rerender(); } }, ic('clock'), ' ', t(l('Consequências pendentes', 'Pending consequences')), ` (${pending18(s).length})`),
        h('button', { class: 'btn small ghost', title: t(l('Seleciona tudo que está visível e não pede resposta', 'Selects everything visible that needs no reply')), onclick: () => { for (const it of shown) if (it.source !== 'decision' && !(it.msg?.actions?.length && !it.msg.resolved)) ui.sel.add(it.key); rerender(); } }, t(l('Selecionar visíveis', 'Select visible'))),
        h('button', { class: 'btn small ghost', onclick: () => { markRead(s); rerender(); } }, t(l('Marcar tudo como lido', 'Mark all as read'))),
        h('button', { class: 'btn small ghost', title: t(l('Arquiva o que já foi lido e não pede resposta', 'Archives what is read and needs no reply')), onclick: () => { for (const it of items18(s)) if (!it.unread && it.source !== 'decision' && !(it.msg?.actions?.length && !it.msg.resolved)) archive18(s, it.key); rerender(); } }, t(l('Arquivar lidas', 'Archive read'))))),
    h('div', { class: 'ib18-bar', role: 'toolbar', 'aria-label': t(l('Categorias', 'Categories')) },
      h('button', { class: `btn small ${ui.cat === 'all' ? 'on' : ''}`, 'aria-pressed': String(ui.cat === 'all'), onclick: () => { ui.cat = 'all'; ui.n = 12; rerender(); } }, t(l('Todas', 'All')), ` (${all.length})`),
      cats.map((c) => h('button', { class: `btn small ${ui.cat === c ? 'on' : ''}`, 'aria-pressed': String(ui.cat === c), onclick: () => { ui.cat = c; ui.n = 12; rerender(); } }, ic(CAT_ICON[c]), ' ', t(CAT18_NAME[c]), counts.get(c) ? h('span', { class: 'badge' }, counts.get(c)) : null))),
    compact ? null : h('div', { class: 'ib18-bar' },
      ([['all', l('Tudo', 'All')], ['unread', l('Não lidas', 'Unread')], ['urgent', l('Importantes', 'Important')], ['reply', l('Pedem resposta', 'Need a reply')], ['snoozed', l('Adiadas', 'Snoozed')], ['archived', l('Arquivadas', 'Archived')]] as [View, L][]).map(([v, lb]) =>
        h('button', { class: `btn small ghost ${ui.view === v ? 'on' : ''}`, 'aria-pressed': String(ui.view === v), onclick: () => { ui.view = v; ui.n = 12; ui.sel.clear(); rerender(); } }, t(lb), v === 'unread' ? ` (${all.filter((x) => x.unread && !snoozedMsg(s, x.key)).length})` : v === 'reply' ? ` (${all.filter((x) => x.source === 'decision' || (x.msg?.actions?.length && !x.msg.resolved)).length})` : ''))),
    ui.sel.size ? h('div', { class: 'ib18-bar ib18-bulk' }, h('b', null, t(l('{n} selecionada(s)', '{n} selected'), { n: ui.sel.size })),
      h('button', { class: 'btn small primary', onclick: () => { for (const k of ui.sel) archive18(s, k, ui.view !== 'archived'); ui.sel.clear(); rerender(); } }, ui.view === 'archived' ? t(l('Desarquivar', 'Unarchive')) : t(l('Arquivar selecionadas', 'Archive selected'))),
      h('button', { class: 'btn small ghost', onclick: () => { for (const k of ui.sel) snoozeMsg(s, k, 4); ui.sel.clear(); rerender(); } }, t(l('Adiar selecionadas', 'Snooze selected'))),
      h('button', { class: 'btn small ghost', onclick: () => { ui.sel.clear(); rerender(); } }, t(l('Limpar seleção', 'Clear selection')))) : null,
    ui.pend ? pendingView18(s, 10) : null,
    shown.length ? h('ul', { class: 'ib18-list' }, shown.map((it) => {
      const k = threadKey(it), sub = k ? kids.get(k) ?? [] : [];
      const el = itemEl(s, it);
      if (sub.length) el.appendChild(h('details', { class: 'ib18-thr' }, h('summary', null, t(l('{n} mensagem(ns) anterior(es) neste fio', '{n} earlier message(s) in this thread'), { n: sub.length })),
        h('ul', { class: 'ib18-list' }, sub.slice(0, 6).map((x) => itemEl(s, x)))));
      return el;
    })) : h('p', { class: 'empty18' }, t(empty)),
    items.length > ui.n ? h('div', { class: 'ib18-more' }, h('button', { class: 'btn small ghost', onclick: () => { ui.n += 15; rerender(); } }, t(l('Mostrar mais ({n})', 'Show more ({n})'), { n: items.length - ui.n }))) : null,
  );
}

/** Chamado por ui/sys/core18.ts (último import): substitui a área antiga de mesmo id. */
export function installInbox18(): void {
  registerArea({ id: 'inbox', label: l('Caixa de entrada', 'Inbox'), icon: 'newspaper', key: 'e', render: (s) => inbox18View(s), badge: (s) => unreadCount(s) || undefined });
}
