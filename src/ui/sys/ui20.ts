// Rodada 20 (G6) — Cockpit em primeiro plano, caixa de entrada como área própria, pós-turno "3 destaques + N outros",
// gráficos acessíveis (nome + resumo + tabela), densidade confortável/compacta, números tabulares, vocabulário de estado,
// estados vazios úteis e foco preservado depois de cada ação. Lógica sem DOM em ui/ux20.ts.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { calendar19 } from '../../sim/calendar19';
import { STAGE_NAMES, openProjects, projectStage } from '../../sim/sys/project8';
import { slack } from '../../sim/sys/project12';
import { items18 } from '../../sim/sys/inbox18';
import { ib18 } from '../../sim/inbox18';
import type { GameState, Notification } from '../../sim/types';
import { $, dateLabel, modal, pill, rerender, toast } from '../common';
import { h } from '../dom';
import { savePrefs, store } from '../store';
import { STATUS20, changes20, chartSummary20, decisions20, highlights20, moreLabel20, review20, type Status20 } from '../ux20';
import { ic, setTab } from '../vis';
import { go18 } from './inbox18';
import { goToHub } from './project12';
import './ui20.css';

// ---------------------------------------------------------------- §5: estado, vazio, densidade

/** Estado com ícone + texto (vocabulário único: ativo, planejado, pendente, bloqueado, concluído, expirado). */
export function status20(k: Status20, extra?: string): HTMLElement {
  const x = STATUS20[k];
  return h('span', { class: `pill st20 ${x.cls}` }, h('span', { 'aria-hidden': 'true' }, x.icon), ' ', t(x.name), extra ? ` · ${extra}` : '');
}
/** Estado vazio útil: o que falta, por que ainda não há resultado e a ação que inicia o fluxo. */
export function empty20(what: L, why?: L, action?: { label: L; run: () => void }): HTMLElement {
  return h('div', { class: 'empty20' }, h('p', null, t(what)), why ? h('p', { class: 'muted small' }, t(why)) : null,
    action ? h('button', { class: 'btn small', onclick: action.run }, t(action.label)) : null);
}

type Dens = 'comfy' | 'compact';
const dens = (): Dens => ((store.prefs as { dens20?: Dens }).dens20 ?? 'comfy');
export function applyDensity20(): void { if (typeof document !== 'undefined') document.documentElement.dataset.dens20 = dens(); }
/** Linha para Configurações: densidade (mesma informação, só muda o espaçamento). */
export function settings20(): HTMLElement {
  return h('label', null, t(l('Densidade da interface', 'Interface density')),
    h('select', { onchange: (e: Event) => { (store.prefs as { dens20?: Dens }).dens20 = (e.target as HTMLSelectElement).value as Dens; savePrefs(); applyDensity20(); } },
      h('option', { value: 'comfy', selected: dens() === 'comfy' ? true : undefined }, t(l('Confortável', 'Comfortable'))),
      h('option', { value: 'compact', selected: dens() === 'compact' ? true : undefined }, t(l('Compacta (mesma informação)', 'Compact (same information)')))));
}

// ---------------------------------------------------------------- B24: gráficos acessíveis

const en = () => store.prefs.lang === 'en';
/** Dá nome + resumo a um SVG de gráfico (role=img, aria-label e <title>). */
export function a11yChart20<T extends Element>(svg: T, name: string, values: number[], fmt?: (n: number) => string): T {
  const sum = chartSummary20(name, values, fmt, en());
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', sum);
  if (!svg.querySelector(':scope > title')) { const tt = document.createElementNS('http://www.w3.org/2000/svg', 'title'); tt.textContent = sum; svg.insertBefore(tt, svg.firstChild); }
  return svg;
}
/** Tabela textual (recolhida) com os valores do gráfico. */
export function chartTable20(name: string, cols: string[], rows: (string | number)[][]): HTMLElement {
  return h('details', { class: 'ch20-tbl small' }, h('summary', null, t(l('Ver como tabela', 'View as table'))),
    h('table', { class: 'tbl compact' }, h('caption', { class: 'sr-only' }, name),
      h('thead', null, h('tr', null, cols.map((c) => h('th', { scope: 'col' }, c)))),
      h('tbody', null, rows.map((r) => h('tr', null, r.map((c) => h('td', null, String(c))))))));
}
/** Rede de segurança: todo SVG exposto como imagem sem nome recebe o título da seção mais próxima. */
function nameOrphanCharts(root: ParentNode): void {
  for (const svg of root.querySelectorAll('svg[role="img"]:not([aria-label]):not([aria-labelledby])')) {
    const host = svg.closest('section, .card, details, .modal');
    const head = host?.querySelector('h2, h3, h4, summary, legend')?.textContent?.trim();
    svg.setAttribute('aria-label', head ? `${t(l('Gráfico', 'Chart'))}: ${head}` : t(l('Gráfico', 'Chart')));
  }
}

// ---------------------------------------------------------------- B23: pós-turno

const KIND_ICON: Record<Notification['kind'], string> = { bad: '⚠', event: '★', good: '▲', info: '•' };
/** Lista completa (acessível) dos avisos do avanço, na ordem de importância. */
export function openNotes20(all: Notification[]): void {
  const { top, rest } = highlights20(all, all.length);
  modal(t(l('Avisos deste avanço ({n})', 'Notices from this advance ({n})'), { n: all.length }),
    h('div', null, h('ul', { class: 'nt20-list' }, [...top, ...rest].map((n) => h('li', { class: n.kind }, h('span', { 'aria-hidden': 'true' }, KIND_ICON[n.kind]), ' ', h('span', { class: 'sr-only' }, t(KIND20[n.kind]), ': '), t(n.text)))),
      h('p', { class: 'muted small' }, t(l('Tudo continua na caixa de entrada e no diário.', 'Everything stays in the inbox and the diary.')))));
}
const KIND20: Record<Notification['kind'], L> = { bad: l('problema', 'problem'), event: l('evento', 'event'), good: l('boa notícia', 'good news'), info: l('aviso', 'notice') };
/** Toasts do avanço: 3 destaques por severidade + um contador "+N outros" que abre a lista inteira. */
export function advanceToasts20(fresh: Notification[]): void {
  const { top, rest } = highlights20(fresh);
  for (const n of [...top].reverse()) toast(t(n.text), n.kind);
  if (!rest.length) return;
  const host = typeof document !== 'undefined' ? document.getElementById('toasts') : null;
  if (!host) return;
  const el = h('div', { class: 'toast info nt20-more', role: 'status' },
    h('button', { class: 'link', onclick: () => { el.remove(); openNotes20(fresh); } }, t(moreLabel20(rest.length)), ' — ', t(l('ver todos', 'see all'))));
  host.appendChild(el);
  setTimeout(() => el.classList.add('out'), 7000);
  setTimeout(() => el.remove(), 7600);
}

// ---------------------------------------------------------------- §4.4: cockpit em primeiro plano

const jumpDesk = () => { setTab('ck20', 'panel'); rerender(); setTimeout(() => document.getElementById('ck14-desk')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); };
const card = (id: string, title: L, icon: string, n: number, body: HTMLElement): HTMLElement =>
  h('section', { class: 'card fp20-card', 'aria-labelledby': `fp20-${id}` }, h('h3', { id: `fp20-${id}` }, ic(icon), ' ', t(title), ' ', h('span', { class: 'badge' }, n)), body);

/** "Agora": data, caixa, reservado em ofertas e caixa livre. */
function nowRow(s: GameState): HTMLElement {
  const rv = review20(s, { actId: '', model: 'classic', advance: 0, royalty: 0, termMonths: 0, releasesOwed: 0, creativeControl: false, publishing: false, share360: 0, promises: [] });
  return h('div', { class: 'fp20-now', role: 'group', 'aria-label': t(l('Agora', 'Now')) },
    h('span', null, ic('calendar'), ' ', h('b', null, dateLabel(s)), h('small', { class: 'muted' }, ` · ${t(l('semana', 'week'))} ${s.week}`)),
    h('span', null, t(l('Caixa', 'Cash')), ' ', h('b', { class: `num20 ${s.player.cash < 0 ? 'bad' : ''}` }, $(s.player.cash))),
    rv.reserved ? h('span', { title: t(l('Adiantamentos de ofertas em aberto', 'Advances in open offers')) }, t(l('Reservado', 'Reserved')), ' ', h('b', { class: 'num20' }, $(rv.reserved))) : null,
    h('span', null, t(l('Livre', 'Free')), ' ', h('b', { class: `num20 ${rv.free < 0 ? 'bad' : 'good'}` }, $(rv.free))));
}
function decCard(s: GameState): HTMLElement {
  const xs = decisions20(s);
  return card('dec', l('Decisões com prazo', 'Deadline decisions'), 'contract', xs.length, xs.length ? h('div', null,
    h('ul', { class: 'fp20-list' }, xs.slice(0, 3).map((d) => h('li', { class: d.left !== null && d.left <= 1 ? 'bad' : '' },
      h('b', null, t(d.title)), ' ', d.left !== null ? status20(d.left <= 0 ? 'expired' : 'pending', t(l('vence em {n} sem.', 'due in {n} wk'), { n: d.left })) : status20('pending'),
      h('small', { class: 'muted fp20-ev' }, t(d.why).slice(0, 140)),
      d.def ? h('small', null, t(l('Se ignorar: ', 'If ignored: ')), h('i', null, t(d.def))) : null))),
    h('button', { class: 'btn small primary', onclick: jumpDesk }, t(l('Decidir', 'Decide')), xs.length > 3 ? ` (+${xs.length - 3})` : ''))
    : empty20(l('Nenhuma decisão pendente.', 'No pending decisions.'), l('Dá para avançar: nada vai valer a opção padrão.', 'You can advance: nothing will take the default option.')));
}
function commitCard(s: GameState): HTMLElement {
  const xs = calendar19(s, { weeks: 4 }).filter((d) => d.kind !== 'decision' && d.kind !== 'msg' && d.w0 === undefined).slice(0, 4);
  return card('cal', l('Próximos compromissos', 'Upcoming commitments'), 'clock', xs.length, xs.length
    ? h('ul', { class: 'fp20-list' }, xs.map((d) => h('li', { class: d.tone === 'bad' ? 'bad' : '' },
      h('span', { class: 'num20' }, d.w <= s.week ? t(l('esta semana', 'this week')) : t(l('em {n} sem.', 'in {n} wk'), { n: d.w - s.week })), ' · ', t(d.t),
      d.d ? h('small', { class: 'muted fp20-ev' }, t(d.d)) : null,
      d.goto ? h('button', { class: 'btn small ghost', 'aria-label': `${t(l('Ir', 'Go'))}: ${t(d.t)}`, onclick: () => go18(d.goto!) }, '›') : null)))
    : empty20(l('Nada marcado nas próximas 4 semanas.', 'Nothing booked in the next 4 weeks.'), l('Prazos de contrato, lançamentos e turnês aparecem aqui assim que existirem.', 'Contract deadlines, releases and tours show here once they exist.'), { label: l('Abrir calendário', 'Open calendar'), run: () => go18({ area: 'calendar19' }) }));
}
function projCard(s: GameState): HTMLElement {
  const xs = openProjects(s).filter((p) => { const a = s.acts[p.actId]; return !!a && (a.owner === 'player' || !!a.playerBand); });
  return card('proj', l('Projetos', 'Projects'), 'disc', xs.length, xs.length
    ? h('ul', { class: 'fp20-list' }, xs.slice(0, 4).map((p) => { const sl = slack(s, p); return h('li', null,
      h('b', null, s.acts[p.actId]?.name ?? '—'), ': ', p.title || p.type.toUpperCase(), ' ', pill(t(STAGE_NAMES[projectStage(s, p)])),
      sl !== null ? status20(sl < 0 ? 'blocked' : sl < 2 ? 'pending' : 'active', sl < 0 ? t(l('atrasado {n} sem.', '{n} wk behind'), { n: -sl }) : t(l('folga {n} sem.', '{n} wk slack'), { n: sl })) : null,
      h('button', { class: 'btn small ghost', 'aria-label': `${t(l('Abrir projeto', 'Open project'))}: ${p.title || p.type}`, onclick: () => goToHub(p.actId, p.id) }, '›')); }))
    : empty20(l('Nenhum disco em andamento.', 'No record in progress.'), l('Um projeto junta intenção, orçamento, gravação e lançamento.', 'A project ties intent, budget, recording and release together.'), { label: l('Começar um disco', 'Start a record'), run: () => goToHub() }));
}
function changeCard(s: GameState): HTMLElement {
  const c = changes20(s);
  const all = [...c.top, ...c.rest] as Notification[];
  return card('chg', l('O que mudou', 'What changed'), 'sparkle', all.length, all.length
    ? h('div', null, h('ul', { class: 'fp20-list' }, c.top.map((n) => h('li', { class: n.kind }, h('span', { 'aria-hidden': 'true' }, KIND_ICON[n.kind]), h('span', { class: 'sr-only' }, t(KIND20[n.kind]), ': '), ' ', t(n.text)))),
      c.rest.length || c.folded ? h('button', { class: 'link small', onclick: () => openNotes20(all) }, t(moreLabel20(c.rest.length)), c.folded ? ` · ${t(l('{n} menores no resumo do mês', '{n} minor in the monthly summary'), { n: c.folded })}` : '') : null)
    : empty20(l('Nada mudou desde o último avanço.', 'Nothing changed since the last advance.')));
}
/** Contagem que explica o que conta: decisões obrigatórias, negócios, rotina e o que está oculto. */
export function inboxCounts20(s: GameState): { dec: number; deals: number; routine: number; archived: number; snoozed: number } {
  const xs = items18(s);
  const sn = ib18(s).snooze ?? {};
  const snoozed = Object.entries(sn).filter(([k, w]) => k.startsWith('m:') && w > s.week).length;
  return { dec: xs.filter((x) => x.cat === 'decision').length, deals: xs.filter((x) => x.cat === 'deals').length, routine: xs.filter((x) => x.cat !== 'decision' && x.cat !== 'deals').length, archived: items18(s, { archived: true }).length, snoozed };
}
function inboxLine(s: GameState): HTMLElement {
  const c = inboxCounts20(s);
  return h('p', { class: 'small fp20-ib' }, ic('newspaper'), ' ',
    t(l('Caixa de entrada: {d} decisões obrigatórias · {n} negócios · {r} rotina/notícias', 'Inbox: {d} required decisions · {n} deals · {r} routine/news'), { d: c.dec, n: c.deals, r: c.routine }),
    c.archived || c.snoozed ? h('span', { class: 'muted' }, ` · ${t(l('ocultas: {a} arquivadas, {z} adiadas', 'hidden: {a} archived, {z} snoozed'), { a: c.archived, z: c.snoozed })}`) : null,
    ' ', h('button', { class: 'link', onclick: () => { setTab('ck20', 'inbox'); rerender(); } }, t(l('abrir a caixa inteira', 'open the full inbox')), ' →'));
}
/** Primeiro plano do Cockpit: agora, decisões com prazo, compromissos, projetos e as 3 mudanças mais importantes. */
export function plane20(s: GameState): HTMLElement {
  return h('div', { class: 'fp20', role: 'region', 'aria-label': t(l('Primeiro plano', 'Front page')) },
    nowRow(s), h('div', { class: 'fp20-grid' }, decCard(s), commitCard(s), projCard(s), changeCard(s)), inboxLine(s));
}

// ---------------------------------------------------------------- §5: foco e estado depois de cada ação

interface Focus20 { area: string; key: string; idx: number; at: number }
let lastFocus: Focus20 | null = null;
const keyOf = (el: HTMLElement): string => [el.tagName, el.id, el.getAttribute('aria-label') ?? '', el.getAttribute('name') ?? '', (el.textContent ?? '').trim().slice(0, 40)].join('|');
function sameKey(root: ParentNode, key: string): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('button, a, input, select, textarea, [tabindex]')].filter((x) => keyOf(x) === key);
}
function installFocus20(): void {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  document.addEventListener('focusin', (e) => {
    const el = e.target as HTMLElement;
    const main = document.getElementById('main');
    if (!main || !main.contains(el) || el === main) return;
    const key = keyOf(el);
    lastFocus = { area: String(store.area), key, idx: sameKey(main, key).indexOf(el), at: Date.now() };
  });
  const app = document.getElementById('app');
  if (!app) return;
  new MutationObserver(() => {
    const main = document.getElementById('main');
    if (main) nameOrphanCharts(main);
    const f = lastFocus;
    if (!f || !main || f.area !== String(store.area) || Date.now() - f.at > 60000) return;
    const a = document.activeElement;
    if (a && a !== document.body && a !== main && document.contains(a)) return;
    const xs = sameKey(main, f.key);
    const el = xs[Math.min(Math.max(0, f.idx), xs.length - 1)];
    if (el) el.focus({ preventScroll: true });
  }).observe(app, { childList: true });
}
installFocus20();
applyDensity20();
