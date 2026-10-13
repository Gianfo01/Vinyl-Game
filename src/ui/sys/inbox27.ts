// Rodada 27 (INBOX) — Caixa de entrada estilo e-mail / Football Manager (pedido do autor: "meio confusa e cheia de
// texto … estilo FM e email mesmo, onde você tem a preview mas recebe o email com tudo escrito mais detalhado").
// Lista compacta à esquerda (uma linha por conversa: remetente com retrato/logo, assunto, uma linha de prévia, data e
// chip de categoria; não lida = negrito + ponto; estrela; "pede resposta") e painel de leitura à direita com o e-mail
// inteiro (mail27model.ts). No celular: lista → e-mail em tela cheia com "voltar". Filtros (categorias, não lidas,
// pedem resposta, estrela, busca), ordem (data/prioridade), teclado (j/k ou setas, Enter, e, s, Esc) e animação
// discreta para correspondência nova. Ações: UM lugar só (ACT27) — as mesmas funções de antes (answerMsg,
// resolveDecision com o portão decLocked18, go18, archive18, snooze, markRead).

import { alertChips29 } from '../ps/alerts29'; // r29 (M44)
import { hashString } from '../../core/rng';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { resolveDecision } from '../../sim/events';
import { archive18, isSeen18, seen18, star18, type Goto18, type InboxCat18 } from '../../sim/inbox18';
import type { Item18 } from '../../sim/sys/inbox18';
import { answerMsg, markRead, unreadCount } from '../../sim/sys/people/inbox';
import { P, type InboxMsg } from '../../sim/sys/people/state';
import type { Decision, DecisionOption, GameState } from '../../sim/types';
import { logoUrl } from '../art';
import { actLink, cityLink, labelLink, logo, releaseLink, rerender, toast } from '../common';
import { h } from '../dom';
import { chips27, segmented27 } from '../ps/pick27';
import { ent27 } from '../ps/ent27';
import { emptyState27, statusChip27 } from '../ps/ui27';
import { AFTER_ADVANCE } from '../registry';
import { store } from '../store';
import { ic, portrait, setTab } from '../vis';
import { decLocked18, decOptBody18, decTimer18, pendingView18, voiceTag18 } from './decide18';
import {
  CAT27, FILTER0_27, actions27, letter27, mailbox27, snooze27, type Box27, type Filter27, type LS27, type Mail27, type Seg27, type Sender27, type Sort27, type Thread27,
} from './mail27model';
import './inbox27.css';
import { staffPortraitImg29, staffRoleOf29 } from '../pixel/people29'; // r29 (arte)

/** Abre o destino de um "ir para" — injetado por inbox18.ts (go18 mora lá; evita ciclo de import). */
export const GO27: { f: (g: Goto18) => void; label: (g: Goto18) => L } = { f: () => {}, label: (g) => g.label ?? l('Ir', 'Go') };

// ---------------------------------------------------------------- estado de interface (sessão; o que é do save fica no save)

/** r29 (M44): o Cockpit abre a caixa já filtrada por categoria de alerta. */
export const setInboxAlert27 = (a: Filter27['alert']): void => { ui.f = { ...FILTER0_27(), alert: a }; };
const ui = {
  f: FILTER0_27() as Filter27,
  /** conversa aberta */
  sel: '' as string,
  /** celular: e-mail em tela cheia */
  open: false,
  /** mensagens já vistas nesta sessão (animação de correspondência nova) */
  seenWeek: new WeakMap<GameState, number>(),
  /** rolagem da lista entre redesenhos */
  scroll: 0,
  /** mensagens antigas do fio abertas à mão */
  expand: new Set<string>(),
};
const lang = (): 'pt' | 'en' => (t(l('pt', 'en')) === 'en' ? 'en' : 'pt');
const phone = (): boolean => typeof matchMedia !== 'undefined' && matchMedia('(max-width: 860px)').matches;

// ---------------------------------------------------------------- ações (um lugar só)

/** Todas as ações da caixa. Respostas e decisões usam exatamente os mesmos tratadores de antes. */
export const ACT27 = {
  /** Abre (marca lida/vista) — mensagens: `read`; avisos e decisões: marcador `seen` da caixa. */
  open(s: GameState, it: Item18): void {
    if (it.msg) markRead(s, it.msg.id);
    else if (!isSeen18(s, it.key)) seen18(s, it.key);
  },
  /** Responde uma mensagem (tratador do sistema que a criou). */
  reply(s: GameState, m: InboxMsg, action: string): void { toast(t(answerMsg(s, m.id, action))); rerender(); },
  /** Escolhe uma opção de decisão da mesa (respeita o portão da opção travada). */
  decide(s: GameState, d: Decision, o: DecisionOption): void {
    if (decLocked18(s, d, o)) return;
    resolveDecision(s, d.id, o.id);
    toast(t(o.label));
    rerender();
  },
  go(s: GameState, it: Item18, g: Goto18): void { ACT27.open(s, it); GO27.f(g); },
  /** Estrela na conversa (marca a mensagem principal; tirar limpa todas). */
  star(s: GameState, th: Thread27): void { if (th.starred) for (const m of th.mails) star18(s, m.key, false); else star18(s, th.head.key, true); },
  /** Arquivar some da Entrada (fica em Arquivadas); o que pede resposta não arquiva. */
  archive(s: GameState, th: Thread27, on = true): boolean {
    const xs = th.mails.filter((m) => !m.reply);
    for (const m of xs) { archive18(s, m.key, on); ACT27.open(s, m.it); }
    return xs.length > 0;
  },
  snooze(s: GameState, th: Thread27, weeks: number): void { for (const m of th.mails) if (!m.reply || !weeks) { snooze27(s, m.key, weeks); ACT27.open(s, m.it); } },
  readAll(s: GameState): void { markRead(s); for (const d of s.decisions) seen18(s, d.id); rerender(); },
  archiveRead(s: GameState, ths: Thread27[]): number {
    let n = 0;
    for (const th of ths) for (const m of th.mails) if (!m.unread && !m.reply && !m.starred) { archive18(s, m.key); n++; }
    rerender();
    return n;
  },
};

// ---------------------------------------------------------------- pedaços visuais

function avatar(s: GameState, snd: Sender27, size: number): HTMLElement {
  if (snd.person?.startsWith('p:')) { const p = s.persons[snd.person.slice(2)]; if (p) return portrait(p, size); }
  if (snd.act && s.acts[snd.act]) return logo(s.acts[snd.act], size);
  if (snd.label && s.labels[snd.label]) {
    const b = s.labels[snd.label];
    return h('img', { class: 'logo', src: logoUrl(hashString(b.id), b.name, b.focus[0] ?? 'pop', b.founded, 96), width: size, height: size, alt: '' });
  }
  if (snd.kind === 'person' || snd.kind === 'org') {
    let hue = 0;
    for (const ch of snd.name) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
    if (snd.kind === 'person') {
      // r29 (arte): retrato de bastidor com o adereço da função no lugar das iniciais
      const img = staffPortraitImg29({ id: `snd:${snd.name}` }, staffRoleOf29(t(snd.role)), s.year, size); img.setAttribute('aria-hidden', 'true'); return img;
    }
    return h('span', { class: 'm27-tile', style: `width:${size}px;height:${size}px;--h:${hue}`, 'aria-hidden': 'true' }, ic(snd.icon, size >= 36 ? 2 : 1));
  }
  return h('span', { class: 'm27-tile desk', style: `width:${size}px;height:${size}px`, 'aria-hidden': 'true' }, ic(snd.icon, size >= 36 ? 2 : 1));
}

/** Um pedaço de texto: nome clicável com data-ent/data-id (clique direito = menu de ações do ctx27). */
function segEl(s: GameState, g: Seg27): Node {
  if (typeof g === 'string') return document.createTextNode(g);
  switch (g.e) {
    case 'act': return actLink(s, g.id);
    case 'release': return releaseLink(s, g.id);
    case 'label': return labelLink(s, g.id);
    case 'city': return cityLink(g.id, g.t);
    case 'person': return h('button', { type: 'button', class: 'link', ...ent27('person', g.id), onclick: (e: Event) => { e.stopPropagation(); GO27.f({ person: g.id }); } }, g.t);
    default: return h('span', { ...ent27(g.e, g.id) }, g.t);
  }
}
const segsEl = (s: GameState, x: LS27): Node[] => x[lang()].map((g) => segEl(s, g));

function fromEl(s: GameState, snd: Sender27): Node {
  if (snd.person) return segEl(s, { e: 'person', id: snd.person, t: snd.name });
  if (snd.act && s.acts[snd.act]) return segEl(s, { e: 'act', id: snd.act, t: snd.name });
  if (snd.label && s.labels[snd.label]) return h('span', null, segEl(s, { e: 'label', id: snd.label, t: snd.name }));
  return document.createTextNode(snd.kind === 'desk' && snd.nameL ? t(snd.nameL) : snd.name);
}
const senderName = (snd: Sender27): string => (snd.nameL ? t(snd.nameL) : snd.name);

// ---------------------------------------------------------------- lista

function rowEl(s: GameState, th: Thread27, isNew: boolean, pick: (id: string) => void, repaint: () => void): HTMLElement {
  const m = th.head;
  const on = ui.sel === th.id;
  return h('li', {
    class: `m27-row ${th.unread ? 'unread' : ''} ${on ? 'sel' : ''} ${isNew ? 'm27-new' : ''} ${th.due ? 'due' : ''}`, role: 'option', 'aria-selected': on ? 'true' : 'false',
    id: `m27-${hashString(th.id)}`, tabindex: on ? '0' : '-1', 'data-th': th.id, onclick: () => pick(th.id),
  },
  h('span', { class: 'm27-av' }, avatar(s, m.sender, 34), th.unread ? h('span', { class: 'm27-dot', title: t(l('Não lida', 'Unread')) }) : null),
  h('span', { class: 'm27-rb' },
    h('span', { class: 'm27-r1' },
      h('span', { class: 'm27-from' }, senderName(m.sender)),
      th.n > 1 ? h('span', { class: 'm27-n', title: t(l('Mensagens nesta conversa', 'Messages in this conversation')) }, String(th.n)) : null,
      h('span', { class: 'm27-date' }, t(m.date))),
    h('span', { class: 'm27-sj' }, t(m.subject)),
    h('span', { class: 'm27-sn' }, t(m.snippet)),
    h('span', { class: 'm27-r3' },
      statusChip27(CAT27[th.cat].name, CAT27[th.cat].tone),
      th.reply ? statusChip27(th.due ? l('Vence já', 'Due now') : l('Pede resposta', 'Needs reply'), th.due ? 'bad' : 'warn') : null,
      th.prio >= 3 && !th.reply ? statusChip27(l('Urgente', 'Urgent'), 'bad') : null)),
  h('button', {
    type: 'button', class: `m27-star ${th.starred ? 'on' : ''}`, 'aria-pressed': th.starred ? 'true' : 'false', title: t(l('Estrela (s)', 'Star (s)')), 'aria-label': t(l('Estrela', 'Star')),
    onclick: (e: Event) => { e.stopPropagation(); ACT27.star(s, th); repaint(); },
  }, th.starred ? '★' : '☆'));
}

// ---------------------------------------------------------------- leitura

function letterEl(s: GameState, m: Mail27, focus: boolean): HTMLElement {
  const it = m.it;
  const L = letter27(s, it);
  const msg = it.msg;
  const d = it.decisionId ? s.decisions.find((x) => x.id === it.decisionId) : undefined;
  const acts = actions27(s, it).map((a) => {
    if (a.kind === 'reply') return h('button', { type: 'button', class: `btn small ${a.primary ? 'primary' : ''}`, title: a.def ? t(l('Opção padrão se você não responder', 'Default option if you don\'t reply')) : undefined, onclick: () => ACT27.reply(s, msg!, a.id) }, t(a.label));
    const o = d!.options.find((x) => x.id === a.id)!;
    const lock = decLocked18(s, d!, o);
    return h('button', { type: 'button', class: `btn small m27-opt ${a.primary ? 'primary' : ''} ${lock ? 'dc18-locked' : ''}`, 'aria-disabled': String(lock), title: t(o.hint), onclick: () => ACT27.decide(s, d!, o) }, ...decOptBody18(s, d!, o));
  });
  const go: HTMLElement[] = [];
  if (it.goto) go.push(h('button', { type: 'button', class: 'btn small ghost', onclick: () => ACT27.go(s, it, it.goto!) }, t(GO27.label(it.goto)), ' →'));
  const actE = L.facts.find((f) => f.value.pt.some((g) => typeof g !== 'string' && g.e === 'act'))?.value.pt.find((g) => typeof g !== 'string' && g.e === 'act') as { id: string; t: string } | undefined;
  if (actE && it.goto?.act !== actE.id) go.push(h('button', { type: 'button', class: 'btn small ghost', onclick: () => ACT27.go(s, it, { act: actE.id }) }, t(l('Abrir ficha', 'Open profile')), ` · ${actE.t}`));
  if (m.sender.person && it.goto?.person !== m.sender.person) go.push(h('button', { type: 'button', class: 'btn small ghost', onclick: () => ACT27.go(s, it, { person: m.sender.person }) }, t(l('Ficha de quem escreve', 'Sender profile'))));
  return h('article', { class: `m27-letter ${focus ? 'focus' : ''} med-${it.medium}`, 'aria-label': t(L.subject) },
    h('header', { class: 'm27-lh' },
      h('span', { class: 'm27-lav' }, avatar(s, m.sender, 44)),
      h('div', { class: 'm27-lhd' },
        h('div', { class: 'm27-lfrom' }, h('b', null, fromEl(s, m.sender)), h('small', { class: 'muted' }, ' · ', t(L.from.role)), L.voice ? voiceTag18(L.voice) : null),
        h('div', { class: 'm27-lto small muted' }, t(l('Para', 'To')), ': ', t(L.to)),
        h('div', { class: 'm27-ldt small muted' }, t(L.date), ' · ', t(L.meta), d ? [' ', decTimer18(s, d)] : null))),
    h('div', { class: 'm27-lbody' },
      h('p', { class: 'm27-greet' }, t(L.greeting)),
      L.intro ? h('p', null, t(L.intro)) : null,
      groupParas(s, L.paras),
      L.facts.length ? h('dl', { class: 'm27-facts' }, L.facts.map((f) => [h('dt', null, t(f.label)), h('dd', { class: f.tone ? `t-${f.tone}` : '' }, ...segsEl(s, f.value))])) : null,
      L.closing ? h('p', null, t(L.closing)) : null,
      h('p', { class: 'm27-sign' }, t(L.signoff), h('br'), h('b', null, senderName(m.sender)), h('br'), h('small', { class: 'muted' }, t(L.from.role)))),
    L.replied ? h('div', { class: 'm27-reply' }, h('span', { class: 'm27-reply-l' }, t(l('Sua resposta', 'Your reply'))), h('span', null, '↩ ', t(L.replied))) : null,
    acts.length || go.length ? h('footer', { class: 'm27-acts' },
      acts.length ? h('div', { class: `m27-acts-r ${d ? 'dec' : ''}` }, acts) : null,
      go.length ? h('div', { class: 'm27-acts-g' }, go) : null) : null);
}
function groupParas(s: GameState, ps: ReturnType<typeof letter27>['paras']): HTMLElement[] {
  const out: HTMLElement[] = [];
  let ul: HTMLElement | null = null;
  for (const p of ps) {
    if (p.k === 'li') { if (!ul) out.push((ul = h('ul', { class: 'm27-ul' }))); ul.appendChild(h('li', null, ...segsEl(s, p.s))); }
    else { ul = null; out.push(h('p', null, ...segsEl(s, p.s))); }
  }
  return out;
}

/** Mensagem anterior do fio, dobrada (abre ao clicar). */
function foldEl(s: GameState, m: Mail27, repaint: () => void): HTMLElement {
  return h('button', { type: 'button', class: `m27-fold ${m.unread ? 'unread' : ''}`, onclick: () => { ui.expand.add(m.key); ACT27.open(s, m.it); repaint(); } },
    avatar(s, m.sender, 22), h('b', null, senderName(m.sender)),
    h('span', { class: 'm27-fold-sn' }, t(m.subject), ' — ', t(m.snippet)),
    h('small', { class: 'muted' }, m.it.msg?.resolved ? [h('span', { class: 'm27-fold-re' }, '↩ ', t(m.it.msg.actions?.find((a) => a.id === m.it.msg!.resolved)?.label ?? l('Respondida', 'Answered'))), ' · '] : null, t(m.date)));
}

function readerEl(s: GameState, th: Thread27 | undefined, box: { threads: Thread27[] }, nav: { back: () => void; step: (d: number) => void; next: () => void; repaint: () => void; pick: (id: string) => void }): HTMLElement {
  if (!th) {
    const reply = box.threads.filter((x) => x.reply).length, unread = box.threads.filter((x) => x.unread).length;
    const first = box.threads.find((x) => x.reply) ?? box.threads.find((x) => x.unread) ?? box.threads[0];
    return h('div', { class: 'm27-reader m27-none' },
      emptyState27({
        icon: 'newspaper', title: box.threads.length ? l('Nenhuma mensagem aberta', 'No message open') : l('Caixa limpa', 'Inbox clear'),
        why: box.threads.length ? fmtN(reply, unread) : l('Mensagens chegam com pedidos do elenco, propostas, alertas e relatórios.', 'Messages arrive with roster requests, offers, alerts and reports.'),
        action: first ? { label: first.reply ? l('Abrir a que pede resposta', 'Open the one needing a reply') : l('Abrir a mais recente', 'Open the latest'), run: () => nav.pick(first.id) } : undefined,
      }),
      h('p', { class: 'small muted m27-keys' }, t(l('Atalhos: j/k ou ↑/↓ navegam · Enter abre · e arquiva · s marca estrela · Esc volta', 'Shortcuts: j/k or ↑/↓ move · Enter opens · e archives · s stars · Esc goes back'))),
      pendingView18(s, 4));
  }
  const older = [...th.mails].reverse(); // mais antiga primeiro: a conversa se lê de cima para baixo
  const canArch = th.mails.some((x) => !x.reply);
  const i = box.threads.indexOf(th);
  return h('div', { class: 'm27-reader' },
    h('div', { class: 'm27-rbar' },
      h('button', { type: 'button', class: 'btn small ghost m27-back', onclick: nav.back }, '← ', t(l('Caixa de entrada', 'Inbox'))),
      h('span', { class: 'm27-rbar-sp' }),
      h('button', { type: 'button', class: 'btn small ghost m27-nav', disabled: i <= 0, 'aria-label': t(l('Anterior (k)', 'Previous (k)')), title: t(l('Anterior (k)', 'Previous (k)')), onclick: () => nav.step(-1) }, '↑'),
      h('button', { type: 'button', class: 'btn small ghost m27-nav', disabled: i < 0 || i >= box.threads.length - 1, 'aria-label': t(l('Próxima (j)', 'Next (j)')), title: t(l('Próxima (j)', 'Next (j)')), onclick: () => nav.step(1) }, '↓'),
      h('button', { type: 'button', class: `btn small ghost ${th.starred ? 'on' : ''}`, 'aria-pressed': th.starred ? 'true' : 'false', title: t(l('Estrela (s)', 'Star (s)')), onclick: () => { ACT27.star(s, th); nav.repaint(); } }, th.starred ? '★ ' : '☆ ', t(l('Estrela', 'Star'))),
      ui.f.box === 'inbox' ? h('button', { type: 'button', class: 'btn small ghost', title: t(l('Some por 4 semanas (fica em Adiadas)', 'Hidden for 4 weeks (kept in Snoozed)')), onclick: () => { ACT27.snooze(s, th, 4); nav.next(); } }, t(l('Adiar', 'Snooze'))) : null,
      ui.f.box === 'snoozed' ? h('button', { type: 'button', class: 'btn small ghost', onclick: () => { ACT27.snooze(s, th, 0); nav.next(); } }, t(l('Trazer de volta', 'Bring back'))) : null,
      canArch ? h('button', { type: 'button', class: 'btn small ghost', title: t(l('Arquivar (e)', 'Archive (e)')), onclick: () => { ACT27.archive(s, th, ui.f.box !== 'archived'); nav.next(); } }, ui.f.box === 'archived' ? t(l('Desarquivar', 'Unarchive')) : t(l('Arquivar', 'Archive'))) : null),
    h('h2', { class: 'm27-subj' }, t(th.head.subject)),
    h('div', { class: 'm27-chips' }, statusChip27(CAT27[th.cat].name, CAT27[th.cat].tone), th.reply ? statusChip27(th.due ? l('Vence já', 'Due now') : l('Pede resposta', 'Needs reply'), th.due ? 'bad' : 'warn') : null,
      th.n > 1 ? h('small', { class: 'muted' }, t(l('Conversa com {n} mensagens', 'Conversation of {n} messages'), { n: th.n })) : null),
    h('div', { class: 'm27-thread' }, older.map((m) => (m === th.head || ui.expand.has(m.key) ? letterEl(s, m, m === th.head) : foldEl(s, m, nav.repaint)))));
}
const fmtN = (reply: number, unread: number): L => {
  const a = reply ? (reply === 1 ? l('1 pede resposta', '1 needs a reply') : l(`${reply} pedem resposta`, `${reply} need a reply`)) : null;
  const b = unread ? (unread === 1 ? l('1 não lida', '1 unread') : l(`${unread} não lidas`, `${unread} unread`)) : null;
  const xs = [a, b].filter(Boolean) as L[];
  return xs.length ? { pt: `${xs.map((x) => x.pt).join(' · ')}. Escolha uma na lista.`, en: `${xs.map((x) => x.en).join(' · ')}. Pick one from the list.` } : l('Tudo lido e respondido. Escolha uma mensagem na lista.', 'Everything read and answered. Pick a message from the list.');
};

// ---------------------------------------------------------------- a caixa

interface Live27 { s: GameState; root: HTMLElement; paint: () => void; key: (e: KeyboardEvent) => boolean }
let live27: Live27 | null = null;

/** Caixa de entrada inteira (aba "Caixa de entrada" do Cockpit e área 'inbox'). */
export function mailView27(s: GameState): HTMLElement {
  const root = h('div', { class: 'mail27', 'data-mail27': '1' });
  let box = mailbox27(s, ui.f);
  const last = ui.seenWeek.get(s);
  const isNew = (th: Thread27) => last !== undefined && th.unread && th.week > last;

  const cur = (): Thread27 | undefined => box.threads.find((x) => x.id === ui.sel);
  /** Abre uma conversa (como no e-mail: a conversa inteira fica lida). */
  const pick = (id: string) => {
    ui.sel = id; ui.open = true;
    const th = cur();
    if (th) for (const m of th.mails) ACT27.open(s, m.it);
    paint();
    focusSel();
    inView();
  };
  /** A caixa ocupa a tela ao ler: no celular o e-mail começa no topo; no computador a caixa sobe se estiver baixa. */
  const inView = () => {
    const top = root.getBoundingClientRect().top;
    if (phone() || top > innerHeight * 0.35 || top < -4) root.scrollIntoView({ block: 'start' });
  };
  const step = (dx: number) => {
    if (!box.threads.length) return;
    let i = box.threads.findIndex((x) => x.id === ui.sel);
    i = i < 0 ? (dx > 0 ? 0 : box.threads.length - 1) : Math.max(0, Math.min(box.threads.length - 1, i + dx));
    pick(box.threads[i].id);
  };
  /** Depois de arquivar/adiar: a conversa seguinte ocupa o lugar (como no e-mail). */
  const next = () => {
    const i = Math.max(0, box.threads.findIndex((x) => x.id === ui.sel));
    box = mailbox27(s, ui.f);
    const nx = box.threads.find((x) => x.id === ui.sel) ? box.threads[i + 1] : box.threads[Math.min(i, box.threads.length - 1)];
    if (nx) pick(nx.id); else { ui.sel = ''; ui.open = false; paint(); }
  };
  const back = () => { ui.open = false; paint(); focusSel(); if (phone()) root.querySelector('.m27-row.sel')?.scrollIntoView({ block: 'center' }); };
  const focusSel = () => { const el = root.querySelector<HTMLElement>('.m27-row.sel'); if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }); } };
  const setF = (p: Partial<Filter27>) => { ui.f = { ...ui.f, ...p }; ui.scroll = 0; paint(); };

  function syncBadge(): void {
    const n = unreadCount(s);
    const tab = document.querySelector('[data-tabs="ck20"] > .tabs > [role=tab][aria-selected=true]');
    if (!tab) return;
    let b = tab.querySelector('.badge');
    if (!n) b?.remove();
    else { if (!b) tab.appendChild((b = h('span', { class: 'badge' }))); b.textContent = String(n); }
  }

  function paint(): void {
    const listEl0 = root.querySelector('.m27-list');
    if (listEl0) ui.scroll = listEl0.scrollTop;
    box = mailbox27(s, ui.f);
    if (ui.sel && !cur()) { ui.sel = ''; ui.open = false; }
    const th = cur();
    const L0 = lang();
    const toolbar = h('div', { class: 'm27-tools' },
      segmented27<Box27>(ui.f.box, [{ value: 'inbox', label: l('Entrada', 'Inbox') }, { value: 'snoozed', label: l('Adiadas', 'Snoozed') }, { value: 'archived', label: l('Arquivadas', 'Archived') }], (v) => { ui.sel = ''; setF({ box: v }); }, l('Pasta', 'Folder')),
      h('input', { type: 'search', class: 'm27-q', value: ui.f.q, placeholder: t(l('Buscar remetente, assunto ou texto…', 'Search sender, subject or text…')), 'aria-label': t(l('Buscar na caixa de entrada', 'Search the inbox')),
        oninput: (e: Event) => { ui.f.q = (e.target as HTMLInputElement).value; const pos = (e.target as HTMLInputElement).selectionStart; paint(); const q = root.querySelector<HTMLInputElement>('.m27-q'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } } }),
      h('span', { class: 'm27-sort' }, h('small', { class: 'muted' }, t(l('Ordem', 'Sort'))), segmented27<Sort27>(ui.f.sort, [{ value: 'date', label: l('Data', 'Date') }, { value: 'prio', label: l('Prioridade', 'Priority') }], (v) => setF({ sort: v }), l('Ordem', 'Sort'))),
      h('span', { class: 'm27-bulk' },
        h('button', { type: 'button', class: 'btn small ghost', onclick: () => ACT27.readAll(s) }, t(l('Marcar tudo como lido', 'Mark all read'))),
        ui.f.box === 'inbox' ? h('button', { type: 'button', class: 'btn small ghost', title: t(l('Arquiva o que já foi lido, sem estrela e sem resposta pendente', 'Archives what is read, unstarred and needs no reply')), onclick: () => { const n = ACT27.archiveRead(s, box.threads); toast(t(l('{n} arquivada(s).', '{n} archived.'), { n })); } }, t(l('Arquivar lidas', 'Archive read'))) : null));
    type Flag = 'unread' | 'reply' | 'starred';
    const flags = h('div', { class: 'm27-filters' },
      chips27<Flag>((['unread', 'reply', 'starred'] as Flag[]).filter((k) => ui.f[k]), [
        { value: 'unread', label: l('Não lidas', 'Unread') }, { value: 'reply', label: l('Pedem resposta', 'Need a reply') }, { value: 'starred', label: l('★ Com estrela', '★ Starred') },
      ], (v) => setF({ unread: v.includes('unread'), reply: v.includes('reply'), starred: v.includes('starred') }), l('Mostrar só', 'Show only')),
      box.cats.length > 1 ? chips27<InboxCat18>(ui.f.cats, box.cats.map((c) => ({ value: c, label: CAT27[c].name })), (v) => setF({ cats: v }), l('Categorias', 'Categories')) : null,
      alertChips29(s, ui.f.alert, (a) => setF({ alert: a }))); // r29 (M44): alertas por categoria (preferência de apresentação)
    const rows = box.threads.map((x) => rowEl(s, x, isNew(x), (id) => pick(id), paint));
    const list = h('ul', { class: 'm27-list', role: 'listbox', 'aria-label': t(l('Mensagens', 'Messages')), tabindex: rows.length && !ui.sel ? '0' : '-1' }, rows);
    const empty = !rows.length ? emptyState27({
      icon: 'check', title: ui.f.alert || ui.f.q || ui.f.cats.length || ui.f.unread || ui.f.reply || ui.f.starred ? l('Nada com esses filtros', 'Nothing matches these filters') : ui.f.box === 'archived' ? l('Nada arquivado', 'Nothing archived') : ui.f.box === 'snoozed' ? l('Nada adiado', 'Nothing snoozed') : l('Caixa limpa', 'Inbox clear'),
      why: ui.f.box === 'archived' ? l('Arquive avisos lidos para limpar a caixa.', 'Archive read notices to tidy the inbox.') : l('Mensagens chegam com pedidos do elenco, propostas, alertas e relatórios.', 'Messages arrive with roster requests, offers, alerts and reports.'),
      action: ui.f.alert || ui.f.q || ui.f.cats.length || ui.f.unread || ui.f.reply || ui.f.starred ? { label: l('Limpar filtros', 'Clear filters'), run: () => setF({ q: '', cats: [], unread: false, reply: false, starred: false, alert: undefined }) } : undefined,
    }) : null;
    const reader = readerEl(s, th, box, { back, step, next, repaint: paint, pick: (id) => pick(id) });
    root.classList.toggle('reading', !!(ui.open && th));
    root.replaceChildren(toolbar, flags,
      h('div', { class: `m27-split ${ui.open && th ? 'reading' : ''}`, 'data-lang': L0 },
        h('div', { class: 'm27-lpane' }, empty ?? list, box.threads.length ? h('p', { class: 'small muted m27-count' }, t(l('{n} conversa(s)', '{n} conversation(s)'), { n: box.threads.length })) : null),
        h('div', { class: 'm27-rpane', 'aria-live': 'polite' }, reader)));
    const L2 = root.querySelector('.m27-list');
    if (L2) L2.scrollTop = ui.scroll;
    syncBadge();
  }

  function key(e: KeyboardEvent): boolean {
    const k = e.key;
    if (k === 'j' || k === 'ArrowDown') { step(1); return true; }
    if (k === 'k' || k === 'ArrowUp') { step(-1); return true; }
    const th = cur();
    if (k === 'Enter') { if (!th) { step(1); return true; } pick(th.id); root.querySelector<HTMLElement>('.m27-rpane button.primary, .m27-rpane .m27-acts button')?.focus(); return true; }
    if (k === 'Escape') { if (ui.open) { back(); return true; } return false; }
    if (!th) return false;
    if (k === 'e' || k === 'Delete' || k === '#') { if (ACT27.archive(s, th, ui.f.box !== 'archived')) next(); else toast(t(l('Pede resposta: responda antes de arquivar.', 'Needs a reply: answer before archiving.')), 'warn'); return true; }
    if (k === 's') { ACT27.star(s, th); paint(); focusSel(); return true; }
    return false;
  }

  paint();
  ui.seenWeek.set(s, s.week);
  live27 = { s, root, paint, key };
  return root;
}

// ---------------------------------------------------------------- teclado (só com a caixa na tela)

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    const L = live27;
    if (!L || !L.root.isConnected || e.ctrlKey || e.metaKey || e.altKey) return;
    const tg = e.target as HTMLElement | null;
    if (tg && (/^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName) || tg.isContentEditable)) return;
    if (document.querySelector('.overlay, .scene-overlay')) return;
    // Enter num botão/link é do próprio botão; setas dentro de grupos (segmentado) também
    if (e.key === 'Enter' && tg?.closest('button, a, [role=radio]') && !tg.classList.contains('m27-row')) return;
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && tg?.closest('[role=radiogroup], details, .m27-rpane')) return;
    if (L.key(e)) { e.preventDefault(); e.stopPropagation(); }
  }, true);
}

// ---------------------------------------------------------------- correspondência nova ao avançar: um aviso só

const lastWk = new WeakMap<GameState, number>();
AFTER_ADVANCE.push((s) => {
  const from = lastWk.get(s) ?? s.week - 5;
  lastWk.set(s, s.week);
  const fresh = P(s).inbox.filter((m) => m.week > from && !m.read && !m.resolved).length;
  if (!fresh || typeof document === 'undefined') return;
  const host = document.getElementById('toasts');
  if (!host) return;
  const txt = fresh === 1 ? t(l('1 mensagem nova', '1 new message')) : t(l('{n} mensagens novas', '{n} new messages'), { n: fresh });
  const el = h('div', { class: 'toast info m27-toast', role: 'status' }, h('button', { type: 'button', class: 'link', onclick: () => { el.remove(); setTab('ck20', 'inbox'); store.area = 'cockpit' as typeof store.area; rerender(); } }, '✉ ', txt, ' — ', t(l('abrir a caixa', 'open the inbox'))));
  host.appendChild(el);
  setTimeout(() => el.classList.add('out'), 6000);
  setTimeout(() => el.remove(), 6600);
});
