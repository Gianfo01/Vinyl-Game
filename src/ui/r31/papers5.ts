// R31 · onda 5 (PAPEL, EXP-4) — o CONTEÚDO das páginas antigas dentro dos papéis do jogo explorável, atrás de `exp5.nav`.
// Cada objeto (livro-caixa, cofre, arquivo de aço, revista de paradas, caderno do olheiro, quadro branco, jornal, rádio/TV,
// correspondência, secretária, telefone, quadro de metas, diário, caderno de aprendizados, gráficos, contador) mostra a
// MESMA página de hoje — mesmas funções de desenho, mesmos botões, mesmas teclas —, só que reorganizada dentro da moldura
// em pixel art (src/ui/pixel/exp5paper.ts): as abas viram marcadores do papel, as páginas irmãs viram pastas, e os livros
// e cadernos abrem em duas páginas. Fonte única: nada aqui calcula regra do jogo; o papel move os elementos que a página
// antiga já desenhou (os cliques continuam ligados) ou chama as mesmas funções (caixa de entrada: mailView27).
//
// Registro: cada papel entra na API da casca (`registerPaperPage5` de nav5.ts, frente NAV) e devolve o papel INTEIRO, com a
// moldura em pixel art (o elemento traz `data-paper5`: a casca não põe segunda moldura). Enquanto a casca (shell5) não
// liga a API, `wrapPaper5` é chamado pelo desenho da página em app.ts (DECISOES, onda 5 PAPEL). Desligado: null = hoje.
// Explorar não muda o mundo: abrir, trocar marcador e fechar só leem o estado (o bolso é escolha do jogador, no save).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { fin18, mIdx18, netProfit18, sumP18 } from '../../sim/ledger18';
import { position20 } from '../../sim/oblig20';
import { nav5On, pocketIds5 } from '../../sim/r31/exp5';
import type { GameState } from '../../sim/types';
import { $, monthName } from '../common';
import { h } from '../dom';
import { drawText, textWidth } from '../pixel/font';
import { C, Px, upscale } from '../pixel/px';
import { inbox5Layout, inbox5Look, inbox5Px, paper5Canvas, paper5Layout, paper5Px, type Inbox5, type Paper5, type Rect5 } from '../pixel/exp5paper';
import { pendingView18 } from '../sys/decide18';
import { COST, REV } from '../sys/finance18';
import { mailKey27, mailView27 } from '../sys/inbox27';
import { getTab, setTab } from '../vis';
import { chordLabel5, key5 } from './keys5';
import { NAV5, pin5, registerPaper5, travelTarget5 } from './nav5';
import { MOVES5, object5, ownerOf5, type Obj5, type Open5 } from './objects5';
import './papers5.css';

// ---------------------------------------------------------------- registro

/** O que o desenho da página passa ao papel. */
export interface PageCtx5 {
  s: GameState;
  obj: Obj5;
  /** página antiga aberta agora (dona ou de onde o marcador veio) */
  area: string;
  /** a página antiga já desenhada (os elementos são movidos para dentro do papel, com os cliques) */
  page: HTMLElement;
  /** rótulo de uma página (o mesmo do menu de hoje) */
  label?: (area: string) => string;
  /** casca (nav5): fechar e trocar de marcador sem sair do papel */
  close?: () => void;
  mark?: (m: Open5) => void;
}
export type PageRender5 = (c: PageCtx5) => HTMLElement;
const PAGES5 = new Map<string, PageRender5>();
export function registerPaperPage5(id: string, render: PageRender5): void { PAGES5.set(id, render); }
export const paperPageIds5 = (): string[] => [...PAGES5.keys()];
export const paperPageOf5 = (id: string): PageRender5 | undefined => PAGES5.get(id);

/** Objeto cujo papel mostra a página aberta agora (a aba aberta pode ter vindo de outro objeto: MOVES5). */
export function paperObjOf5(area: string): string | undefined {
  for (const m of MOVES5) if (m.area === area && m.tab && getTab(m.key) === m.tab) {
    if (object5(m.to) && PAGES5.has(m.to)) return m.to;
    if (m.to === 'topo' && area === 'cockpit') return 'secretaria'; // o painel do mês: recados da secretária (até o topo ampliável existir)
  }
  const o = ownerOf5(area);
  return o && PAGES5.has(o.id) ? o.id : undefined;
}

/** Antes de abrir um objeto dono sem aba: a aba que tinha ido para outro papel (cofre, caderno) volta à 1ª,
 *  para Z abrir o livro-caixa e não o cofre. Só com `exp5.nav`; abrir com aba (marcador) respeita a aba. */
export function paperGo5(s: GameState | undefined, x: Open5): void {
  if (!s || !nav5On(s) || x.tab) return;
  for (const m of MOVES5) if (m.area === x.area && m.tab && getTab(m.key) === m.tab && m.to !== 'pausa') setTab(m.key, '');
}

/** Desenha o papel no lugar da página antiga (só com `exp5.nav` ligado e papel registrado; senão null = igual a hoje). */
export function wrapPaper5(s: GameState, area: string, page: HTMLElement, label?: (a: string) => string): HTMLElement | null {
  if (!nav5On(s)) return null;
  const id = paperObjOf5(area);
  const obj = id ? object5(id) : undefined;
  const r = id ? PAGES5.get(id) : undefined;
  if (!obj || !r) return null;
  return r({ s, obj, area, page, label });
}

// ---------------------------------------------------------------- moldura

type Frame5x = { k: 'paper'; p: Paper5; gray?: boolean } | { k: 'inbox'; look: (y: number) => Inbox5 };
const SCALE5 = 2;

// ---------------------------------------------------------------- texto e teclas em pixel art (fonte bitmap do jogo)

const canPx5 = (): boolean => typeof document !== 'undefined' && !!document.createElement('canvas').getContext?.('2d');

/** Texto em pixel art (fonte 3×5 do jogo, maiúsculas sem acento) num canvas ampliado; o texto real fica para leitores de tela. */
export function pxText5(text: string, color = '#f4ecd8', o: { scale?: number; shadow?: string; cls?: string } = {}): HTMLElement {
  const sc = o.scale ?? 2;
  const wrap = h('span', { class: `pxt5 ${o.cls ?? ''}` }, h('span', { class: 'sr-only' }, text));
  if (!canPx5()) { wrap.append(h('span', { 'aria-hidden': 'true' }, text)); return wrap; }
  const w = textWidth(text) + 2, hh = 7;
  const p = new Px(Math.max(1, w), hh);
  if (o.shadow) drawText(p, text, 1, 2, C(o.shadow));
  drawText(p, text, 0, 1, C(color));
  const cv = upscale(p.canvas(), p.w * sc, p.h * sc);
  cv.setAttribute('aria-hidden', 'true');
  cv.className = 'pxt5-c';
  wrap.append(cv);
  return wrap;
}

/** Tecla em pixel art (tampa com chanfro, luz de cima à esquerda). */
export function pxKey5(label: string): HTMLElement {
  const wrap = h('span', { class: 'pxk5' }, h('span', { class: 'sr-only' }, label));
  if (!canPx5()) { wrap.append(h('kbd', { 'aria-hidden': 'true' }, label)); return wrap; }
  const tw = textWidth(label), w = Math.max(9, tw + 6), hh = 11;
  const p = new Px(w, hh);
  const body = C('#2a3a5a'), top = C('#4a6290'), dark = C('#121a2a'), ink = C('#0a0e16');
  p.rect(1, 0, w - 2, hh - 1, ink); p.rect(0, 1, w, hh - 3, ink);
  p.rect(1, 1, w - 2, hh - 3, body);
  p.rect(1, hh - 3, w - 2, 2, dark);
  p.hline(2, w - 3, 1, top); p.vline(1, 2, hh - 5, top);
  drawText(p, label, Math.floor((w - tw) / 2), 2, C('#f4f0e8'));
  const cv = upscale(p.canvas(), w * 2, hh * 2);
  cv.setAttribute('aria-hidden', 'true');
  wrap.append(cv);
  return wrap;
}

/** Troca o texto de um botão por texto em pixel art (o nome fica em aria-label; contador "badge" continua). */
function pxButton5(b: HTMLElement, color: string): void {
  const badge = b.querySelector('.badge');
  const label = [...b.childNodes].filter((n) => !(n instanceof HTMLElement && (n.classList.contains('badge') || n.tagName === 'svg' || n.classList.contains('ic')))).map((n) => n.textContent ?? '').join('').trim();
  if (!label) return;
  b.setAttribute('aria-label', label);
  b.replaceChildren(pxText5(label, color), ...(badge ? [badge] : []));
}

const pxRect = (r: Rect5): string => `left:${r.x * SCALE5}px;top:${r.y * SCALE5}px;width:${r.w * SCALE5}px;height:${r.h * SCALE5}px`;

/** Tecla do objeto, como aparece na tela (⇧Z, 3, E…). */
export function paperKey5(id: string): string {
  const b = key5(`obj:${id}`);
  return b ? chordLabel5(b.chord) : '';
}

/** Nome do objeto na época (o rádio de válvula, o celular…). */
export function paperName5(o: Obj5, year: number): L {
  const f = o.forms?.find((x) => year >= x.era[0] && year <= x.era[1]);
  return f?.label ?? o.label;
}

/** Fechar = voltar à sede (Esc), sem passar tempo. */
export function closePaper5(s: GameState): void { NAV5.go?.(travelTarget5(s, 'sede')); }

const KIND5 = new WeakMap<PageCtx5, string>();
const frameKind5 = (c: PageCtx5): string => KIND5.get(c) ?? '';
/** Molduras claras (título e textos escuros). */
const LIGHT5 = new Set(['whiteboard', 'planning', 'form', 'rolodex', 'inbox-fax', 'inbox-phone']);

interface Shell5 { head: HTMLElement; tabs: HTMLElement; pages: HTMLElement[]; extra?: Partial<Record<'filters' | 'notes' | 'keys', HTMLElement>> }

/** Cabeçalho comum: título do objeto (nome da época), mês, tecla, fixar no bolso e fechar. */
function head5(c: PageCtx5, sub?: string): HTMLElement {
  const { s, obj } = c;
  const k = paperKey5(obj.id);
  const pinned = pocketIds5(s).includes(obj.id);
  const pinBtn = h('button', { type: 'button', class: `paper5-pin ${pinned ? 'on' : ''}`, 'aria-pressed': pinned ? 'true' : 'false',
    title: t(pinned ? l('Tirar do bolso', 'Remove from pocket') : l('Fixar no bolso (abre direto pela tecla)', 'Pin to the pocket (opens straight from the key)')),
    onclick: () => {
      const why = pin5(s, obj.id);
      if (why) { pinBtn.title = t(why); pinBtn.classList.add('full'); return; }
      const on = pocketIds5(s).includes(obj.id);
      pinBtn.classList.toggle('on', on); pinBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      pinBtn.replaceChildren(pxText5(t(on ? l('no bolso', 'in pocket') : l('+ fixar', '+ pin')), on ? '#1a1214' : '#f0e8d8'));
    } }, pxText5(t(pinned ? l('no bolso', 'in pocket') : l('+ fixar', '+ pin')), pinned ? '#1a1214' : '#f0e8d8'));
  const light = LIGHT5.has(frameKind5(c));
  const sub0 = sub ?? `${monthName(s.month)} ${t(l('de', 'of'))} ${s.year}`;
  return h('div', { class: 'paper5-hd' },
    h('h2', { class: 'paper5-title', 'aria-label': t(paperName5(obj, s.year)) }, pxText5(t(paperName5(obj, s.year)), light ? '#1a1a20' : '#f8f0dc', { scale: 3, shadow: light ? undefined : '#1a1214' })),
    h('span', { class: 'paper5-sub' }, pxText5(sub0, light ? '#3a3a44' : '#eadfc4'), k ? [pxText5(t(l('tecla', 'key')), light ? '#3a3a44' : '#eadfc4'), pxKey5(k)] : null),
    h('span', { class: 'paper5-sp' }),
    pinBtn,
    h('button', { type: 'button', class: 'paper5-close bare', 'aria-label': t(l('Fechar (Esc)', 'Close (Esc)')), onclick: () => (c.close ? c.close() : closePaper5(s)) }, pxKey5('Esc'), pxText5(t(l('fechar', 'close')), '#f0e8d8')));
}

/** Monta o papel: moldura em pixel art (quando há layout) + áreas HTML posicionadas pelas áreas da moldura. */
function frame5(c: PageCtx5, f: Frame5x, parts: Shell5): HTMLElement {
  const kind = f.k === 'paper' ? f.p : `inbox-${f.look(c.s.year)}`;
  const root = h('section', { class: `paper5 paper5-${kind} paper5-o-${c.obj.id.replace(/[^a-z0-9]/gi, '')}`, 'data-paper5': c.obj.id, 'data-area': c.area, role: 'region', 'aria-label': t(c.obj.label) });
  const hd = h('header', { class: 'paper5-head' }, parts.head);
  const tb = h('nav', { class: 'paper5-tabs', 'aria-label': t(l('Marcadores', 'Markers')) }, parts.tabs);
  const pages = parts.pages.map((p, i) => h('div', { class: `paper5-page paper5-p${i}` }, p));
  const ex = Object.entries(parts.extra ?? {}).map(([k, e]) => h('div', { class: `paper5-x paper5-${k}` }, e));
  root.append(hd, tb, ...pages, ...ex);
  if (pages.length === 1) root.classList.add('one');
  if (pages.length === 1 && f.k === 'paper' && (f.p === 'ledger' || f.p === 'scout' || f.p === 'agenda')) root.classList.add('wide'); // folha solta por cima do livro
  // a moldura é desenhada no tamanho real (pixels lógicos = tela ÷ 2) assim que o papel ganha tamanho
  if (typeof ResizeObserver === 'undefined') return root;
  let last = '';
  const lay = (): void => {
    const W = Math.floor(root.clientWidth / SCALE5), H = Math.floor(root.clientHeight / SCALE5);
    if (W < 80 || H < 60 || `${W}x${H}` === last) return;
    last = `${W}x${H}`;
    let px, rs: { head: Rect5; tabs: Rect5; body: Rect5[]; x?: Record<string, Rect5> };
    if (f.k === 'paper') {
      const L0 = paper5Layout(f.p, W, H);
      px = paper5Px(f.p, W, H, { seed: c.s.year });
      rs = { head: L0.head, tabs: L0.tabs, body: L0.body };
    } else {
      const look = f.look(c.s.year);
      const L1 = inbox5Layout(look, W, H);
      px = inbox5Px(look, W, H, c.s.year);
      const full = !ex.length;
      // as faixas de hoje (pasta, busca e ordem; filtros) são mais altas que as da moldura: as áreas descem um pouco
      const tools: Rect5 = { ...L1.tabs, y: L1.head.y + L1.head.h + 2, h: 16 };
      const filt: Rect5 = { ...L1.filters, y: tools.y + tools.h + 2, h: 14 };
      const top = filt.y + filt.h + 4, bot = L1.list.y + L1.list.h;
      const at = (r: Rect5): Rect5 => ({ ...r, y: top, h: bot - top });
      const body = full ? [{ x: L1.filters.x, y: L1.filters.y, w: L1.filters.w, h: bot - L1.filters.y }] : [at(L1.list), at(L1.read)];
      const nh = Math.round((bot - top) * 0.6);
      rs = { head: L1.head, tabs: full ? L1.tabs : tools, body, x: { filters: filt, notes: { ...L1.notes, y: top, h: nh }, keys: { ...L1.keys, y: top + nh + 4, h: bot - top - nh - 4 } } };
    }
    const cv = paper5Canvas(px, SCALE5);
    cv.classList.add('paper5-bg');
    if (f.k === 'paper' && f.gray) cv.classList.add('gray');
    cv.setAttribute('aria-hidden', 'true');
    root.querySelector('.paper5-bg')?.remove();
    root.prepend(cv);
    hd.setAttribute('style', pxRect(rs.head));
    tb.setAttribute('style', pxRect(rs.tabs));
    const bodies = rs.body.length >= pages.length ? rs.body : [rs.body[0]];
    pages.forEach((p, i) => {
      const r = pages.length === 1 && rs.body.length === 2 ? { x: rs.body[0].x, y: rs.body[0].y, w: rs.body[1].x + rs.body[1].w - rs.body[0].x, h: rs.body[0].h } : bodies[Math.min(i, bodies.length - 1)];
      p.setAttribute('style', pxRect(r));
    });
    for (const e of ex) { const k = [...e.classList].find((x) => x !== 'paper5-x')!.slice(7); const r = rs.x?.[k]; if (r) e.setAttribute('style', pxRect(r)); }
    root.classList.add('laid');
  };
  new ResizeObserver(lay).observe(root);
  return root;
}

// ---------------------------------------------------------------- a página antiga dentro do papel

/** Tira a faixa de abas de cima da página (marcadores do papel): botões movidos, com o clique de hoje.
 *  `keep(tabId)` decide quais ficam neste papel (as que foram para outro objeto saem). */
function liftTabs5(page: HTMLElement, keep: (key: string, id: string) => boolean): { key?: string; marks: HTMLElement[]; panel: HTMLElement } {
  const tw = page.querySelector<HTMLElement>('[data-tabs]');
  const bar = tw?.querySelector<HTMLElement>(':scope > .tabs');
  if (!tw || !bar) return { marks: [], panel: page };
  const key = tw.dataset.tabs ?? '';
  const marks = [...bar.querySelectorAll<HTMLElement>(':scope > button[role=tab]')].filter((b) => keep(key, b.dataset.tab ?? ''));
  for (const b of marks) { b.classList.remove('tab27-x'); b.classList.add('paper5-mk'); }
  bar.remove();
  return { key, marks, panel: page };
}

/** Divide o conteúdo em duas páginas (livro, caderno, agenda): a 1ª metade dos blocos à esquerda, o resto à direita. */
function split5(panel: HTMLElement): [HTMLElement, HTMLElement] | null {
  let el = panel;
  const before: Element[] = [];
  for (let i = 0; i < 6; i++) {
    const tp = el.querySelector(':scope > [data-tabs] > [role=tabpanel]') as HTMLElement | null;
    const kids = [...el.children].filter((x) => !(x instanceof HTMLElement && x.hidden));
    if (kids.length === 1 && kids[0] instanceof HTMLElement) { el = kids[0]; continue; }
    if (tp && kids.length > 1) { before.push(...kids.filter((k) => !k.contains(tp))); el = tp; continue; }
    break;
  }
  const kids = [...el.children];
  if (kids.length < 2) return null;
  // tabela larga (mais de 5 colunas) não cabe em meia página: fica a folha dupla inteira
  if ([...el.querySelectorAll('table')].some((tb) => (tb.querySelector('tr')?.children.length ?? 0) > 5)) return null;
  const weight = (e: Element): number => Math.max(1, (e.textContent ?? '').length / 400 + e.querySelectorAll('tr, li, .card').length / 6);
  const total = kids.reduce((a, k) => a + weight(k), 0);
  let acc = 0, cut = 1;
  for (let i = 0; i < kids.length - 1; i++) { acc += weight(kids[i]); cut = i + 1; if (acc >= total / 2) break; }
  const L0 = h('div', { class: el.className }), R0 = h('div', { class: el.className });
  for (const b of before) L0.append(b);
  kids.slice(0, cut).forEach((k) => L0.append(k));
  kids.slice(cut).forEach((k) => R0.append(k));
  return [L0, R0];
}

/** Pastas: as outras páginas de que o objeto é dono (Mercado de contratos, Direitos…), com a aberta acesa. */
function folders5(c: PageCtx5): HTMLElement[] {
  const own = c.obj.opens.filter((x, i, a) => a.findIndex((y) => y.area === x.area) === i);
  if (own.length < 2) return [];
  return own.map((x: Open5) => h('button', { type: 'button', class: `paper5-folder ${x.area === c.area ? 'on' : ''}`, 'aria-current': x.area === c.area ? 'page' : 'false',
    onclick: () => (c.mark ? c.mark({ area: x.area }) : NAV5.go?.({ area: x.area })) }, pxText5(c.label?.(x.area) ?? x.area, '#2a2018')));
}

/** Marcadores que o papel `id` mostra numa página (as abas de hoje menos as que foram para outro objeto). */
export const paperTabs5 = (id: string, area: string, key: string, tabs: string[]): string[] => tabs.filter((x) => keepTab5({ obj: { id }, area })(key, x));

/** Este papel mostra a aba? (abas que mudaram para outro objeto saem; papel que recebe abas mostra só as dele). */
function keepTab5(c: { obj: { id: string }; area: string }): (key: string, id: string) => boolean {
  const into = MOVES5.filter((m) => m.to === c.obj.id && m.area === c.area);
  if (into.length) return (key, id) => into.some((m) => m.key === key && (m.tab === undefined || m.tab === id));
  // objeto-atalho para uma aba (secretária → painel do mês): só essa aba, nada de marcador de outro objeto
  const link = object5(c.obj.id)?.links?.filter((x) => x.area === c.area && x.tab) ?? [];
  if (link.length && !object5(c.obj.id)?.opens.some((x) => x.area === c.area)) return (key, id) => link.some((x) => x.tab![0] === key && x.tab![1] === id);
  return (key, id) => {
    const mv = MOVES5.find((m) => m.area === c.area && m.key === key && (m.tab === undefined || m.tab === id));
    return !mv || mv.to === 'pausa' ? !mv : mv.to === c.obj.id;
  };
}

export interface Generic5 { frame: Frame5x; two?: boolean; sub?: (c: PageCtx5) => string; first?: (c: PageCtx5, tab: string | undefined) => [HTMLElement, HTMLElement] | null }

/** Papel padrão: a página antiga, com as abas como marcadores e (livros) em duas páginas. */
export function genericPaper5(o: Generic5): PageRender5 {
  return (c) => {
    KIND5.set(c, o.frame.k === 'paper' ? o.frame.p : `inbox-${o.frame.look(c.s.year)}`);
    const { key, marks, panel } = liftTabs5(c.page, keepTab5(c));
    for (const m of marks) pxButton5(m, m.getAttribute('aria-selected') === 'true' ? '#ffffff' : '#2a2018');
    const tab = key ? getTab(key) ?? marks.find((m) => m.getAttribute('aria-selected') === 'true')?.dataset.tab : undefined;
    const fd = folders5(c);
    const tabs = h('div', { class: 'paper5-marks' }, fd.length ? h('span', { class: 'paper5-folders' }, fd) : null, marks);
    const own = o.first?.(c, tab);
    const sp = own ?? (o.two ? split5(panel) : null);
    const pages = sp ? [h('div', { class: 'paper5-in' }, sp[0]), h('div', { class: 'paper5-in' }, sp[1])] : [h('div', { class: 'paper5-in' }, panel)];
    return frame5(c, o.frame, { head: head5(c, o.sub?.(c)), tabs, pages });
  };
}

// ---------------------------------------------------------------- livro-caixa: a 1ª página são lançamentos

/** Posição do mês em linhas de livro (as mesmas contas da DRE e da Posição: fin18, position20) e os últimos 12 meses. */
/** Os números do livro-caixa, lidos das mesmas fontes da DRE (fin18) e da Posição (position20). Puro: só lê. */
export function ledgerData5(s: GameState): { shown: number; rows: [L, number][]; net: number; cash: number; debt: number; last: { i: number; v: number }[]; year: { rev: number; cost: number; net: number } } {
  const F = fin18(s), mi = mIdx18(s);
  const M = F.m[mi - 1] ?? F.m[mi];
  const shown = F.m[mi - 1] ? mi - 1 : mi;
  const p = position20(s);
  const rows = ([...REV.map(([k, n]) => [n, M?.[`rev:${k}`] ?? 0]), ...COST.map(([k, n]) => [n, M?.[`cost:${k}`] ?? 0]),
    [l('Não operacional e impostos', 'Non-operating and taxes'), sumP18(M, 'nonop:') + sumP18(M, 'tax:')]] as [L, number][]).filter(([, v]) => Math.round(v) !== 0);
  const Y = F.y[s.year];
  return { shown, rows, net: netProfit18(M), cash: p.cash, debt: p.debt, last: Array.from({ length: 12 }, (_, k) => shown - 11 + k).map((i) => ({ i, v: netProfit18(F.m[i]) })),
    year: { rev: sumP18(Y, 'rev:'), cost: sumP18(Y, 'cost:'), net: netProfit18(Y) } };
}

function ledgerFirst5(c: PageCtx5, tab: string | undefined): [HTMLElement, HTMLElement] | null {
  if (tab && tab !== 'pos20') return null;
  const D = ledgerData5(c.s);
  const { shown, net, last } = D;
  const p = { cash: D.cash, debt: D.debt };
  const rows = D.rows.map(([n, v]) => [t(n), v] as const);
  const line = (name: string, v: number, cls = ''): HTMLElement => h('div', { class: `pl5-row ${cls}` }, h('span', null, name), h('span', { class: `pl5-v ${v < 0 ? 'neg' : v > 0 ? 'pos' : ''}` }, `${v > 0 ? '+ ' : v < 0 ? '− ' : ''}${$(Math.abs(v))}`));
  const mon = (i: number): string => monthName(((i % 12) + 12) % 12).slice(0, 3);
  const left = h('div', { class: 'pl5' },
    h('h3', { class: 'pl5-h' }, t(l('Posição do mês', 'Month position'))),
    h('p', { class: 'pl5-s' }, t(l('o que entrou e saiu em {m} · valores de {y}', 'what came in and went out in {m} · {y} money'), { m: mon(shown), y: String(Math.floor(shown / 12)) })),
    rows.length ? rows.map(([n, v]) => line(n, v)) : h('p', { class: 'pl5-s' }, t(l('Nenhum lançamento ainda neste mês.', 'No entries yet this month.'))),
    line(t(l('Resultado do mês', 'Month result')), net, 'tot'),
    line(t(l('Caixa agora', 'Cash now')), p.cash, 'tot cash'),
    h('div', { class: 'pl5-stamps' },
      p.debt > 0 ? h('span', { class: 'pl5-stamp red' }, pxText5(t(l('dívida {v}', 'debt {v}'), { v: $(p.debt) }), '#b0302a')) : h('span', { class: 'pl5-stamp green' }, pxText5(t(l('sem dívida', 'no debt')), '#22764a')),
      net >= 0 ? h('span', { class: 'pl5-stamp green' }, pxText5(t(l('mês no azul', 'month in the black')), '#22764a')) : h('span', { class: 'pl5-stamp red' }, pxText5(t(l('mês no vermelho', 'month in the red')), '#b0302a'))));
  const mx = Math.max(1, ...last.map((x) => Math.abs(x.v)));
  const right = h('div', { class: 'pl5' },
    h('h3', { class: 'pl5-h' }, t(l('Últimos 12 meses', 'Last 12 months'))),
    h('p', { class: 'pl5-s' }, t(l('resultado por mês (verde = lucro, vermelho = prejuízo)', 'result per month (green = profit, red = loss)'))),
    h('div', { class: 'pl5-bars', role: 'img', 'aria-label': last.map((x) => `${mon(x.i)} ${$(x.v)}`).join(', ') },
      last.map((x) => h('span', { class: 'pl5-bar', title: `${mon(x.i)}: ${$(x.v)}` }, h('i', { class: x.v < 0 ? 'neg' : 'pos', style: `height:${Math.max(3, Math.round((Math.abs(x.v) / mx) * 100))}%` }), h('small', null, mon(x.i))))),
    line(t(l('Receita no ano', 'Revenue this year')), D.year.rev),
    line(t(l('Despesa no ano', 'Costs this year')), D.year.cost),
    line(t(l('Lucro no ano', 'Profit this year')), D.year.net),
    line(t(l('Dívida', 'Debt')), -p.debt));
  // o resto da aba Posição (os quatro conceitos, agora × fechamento, obrigações, reconciliação) continua na página da direita
  const rest = c.page.querySelector<HTMLElement>('.fin20');
  if (rest) right.append(h('div', { class: 'pl5-more' }, rest));
  return [left, right];
}

// ---------------------------------------------------------------- caixa de entrada (mesma estrutura em toda época)

/** A caixa de entrada inteira de hoje (mailView27), distribuída nas áreas da aparência da época. */
interface Mail5 { mail: HTMLElement; tabs: HTMLElement; filters: HTMLElement; list: HTMLElement; read: HTMLElement; notes: HTMLElement; keys: HTMLElement }
/** As peças da caixa de entrada de hoje (mailView27), presas a ela: a caixa se redesenha sozinha e as peças voltam ao lugar. */
function mailPieces5(s: GameState): Mail5 {
  const mail = mailView27(s);
  const list = h('div', { class: 'paper5-mail-list' }), read = h('div', { class: 'paper5-mail-read' });
  const tabs = h('div', { class: 'paper5-mail-tools' }), filters = h('div', { class: 'paper5-mail-flags' });
  const place = (): void => {
    const t0 = mail.querySelector(':scope > .m27-tools'), f0 = mail.querySelector(':scope > .m27-filters'), s0 = mail.querySelector(':scope > .m27-split');
    if (t0) tabs.replaceChildren(t0);
    if (f0) filters.replaceChildren(f0);
    if (s0) {
      const L0 = s0.querySelector('.m27-lpane'), R0 = s0.querySelector('.m27-rpane');
      if (L0) list.replaceChildren(L0);
      if (R0) read.replaceChildren(R0);
      read.classList.toggle('reading', s0.classList.contains('reading'));
    }
  };
  place();
  // a raiz da caixa continua no documento (escondida) para as teclas J/K/Enter/S dela valerem (live27.root.isConnected)
  mail.classList.add('paper5-mail-root');
  if (typeof MutationObserver !== 'undefined') new MutationObserver(place).observe(mail, { childList: true });
  const keys = h('div', { class: 'paper5-keys' },
    ...[['J', 'K', l('próxima / anterior', 'next / previous')], ['Enter', '', l('abrir', 'open')], ['A', 'S', l('arquivar · estrela', 'archive · star')], ['1', '4', l('responder', 'reply')], ['Esc', '', l('voltar à sede', 'back to the HQ')]]
      .map(([a, b, x]) => h('div', { class: 'paper5-krow' }, pxKey5(a as string), b ? [b === '4' ? pxText5('-', '#f0e8d8') : null, pxKey5(b as string)] : null, pxText5(t(x as L), '#f0e8d8'))));
  const notes = h('div', { class: 'paper5-notes' }, pendingView18(s, 4));
  return { mail, tabs, filters, list, read, notes, keys };
}

export const inboxPaper5: PageRender5 = (c) => {
  const { s } = c;
  KIND5.set(c, `inbox-${inbox5Look(s.year)}`);
  const M = mailPieces5(s);
  const look = inbox5Look(s.year);
  const el = frame5(c, { k: 'inbox', look: inbox5Look }, {
    head: head5(c, `${s.year} · ${t(INBOX_LOOK5[look])}`), tabs: M.tabs, pages: [M.list, M.read], extra: { filters: M.filters, notes: M.notes, keys: M.keys },
  });
  el.dataset.look = look;
  el.dataset.unread = String(M.mail.querySelectorAll('.m27-row.unread').length);
  el.append(M.mail);
  return el;
};

// ---------------------------------------------------------------- miolo para a casca (shell5: ela põe moldura, título e marcadores)

/** Moldura que a casca escolhe para o objeto (mesma regra de shell5.paperKind5), para o miolo vestir as cores certas. */
const SHELL_KIND5: Record<string, string> = { livro: 'ledger', caderno: 'scout', quadro: 'whiteboard', revista: 'charts', cortica: 'cork', agenda: 'agenda', fichario: 'rolodex' };
export const shellKind5 = (o: Obj5, year: number): string => (o.id === 'quadroplan' ? 'planning' : o.frame === 'caixa' ? `inbox-${inbox5Look(year)}` : SHELL_KIND5[o.frame] ?? 'form');

/** O miolo do papel: abas internas da página como marcadores em pixel, páginas duplas nos livros, a caixa em suas áreas. */
export function mioloPaper5(c: PageCtx5): HTMLElement {
  const kind = shellKind5(c.obj, c.s.year);
  const root = h('div', { class: `paper5 paper5m paper5-${kind} paper5-o-${c.obj.id.replace(/[^a-z0-9]/gi, '')}`, 'data-paper5': c.obj.id, 'data-area': c.area });
  if (c.obj.id === 'correspondencia') {
    const M = mailPieces5(c.s);
    root.classList.add('paper5m-mail');
    root.append(h('div', { class: 'paper5-x paper5-tabsrow' }, M.tabs), h('div', { class: 'paper5-x paper5-filtrow' }, M.filters),
      h('div', { class: 'paper5m-grid' }, h('div', { class: 'paper5-page paper5-p0' }, M.list), h('div', { class: 'paper5-page paper5-p1' }, M.read),
        h('div', { class: 'paper5m-side' }, h('div', { class: 'paper5-x paper5-notes-w' }, M.notes), h('div', { class: 'paper5-x paper5-keys-w' }, M.keys))), M.mail);
    return root;
  }
  KIND5.set(c, kind);
  const { key, marks, panel } = liftTabs5(c.page, keepTab5(c));
  for (const m of marks) pxButton5(m, m.getAttribute('aria-selected') === 'true' ? '#ffffff' : '#2a2018');
  const tab = key ? getTab(key) ?? marks.find((m) => m.getAttribute('aria-selected') === 'true')?.dataset.tab : undefined;
  const two = c.obj.frame === 'livro' || c.obj.frame === 'caderno' || c.obj.frame === 'agenda';
  const own = c.obj.id === 'livrocaixa' ? ledgerFirst5(c, tab) : null;
  const sp = own ?? (two ? split5(panel) : null);
  if (marks.length > 1) root.append(h('nav', { class: 'paper5m-marks paper5-marks', 'aria-label': t(l('Abas desta página', 'Tabs of this page')) }, marks));
  const pages = sp ? [sp[0], sp[1]] : [panel];
  root.append(h('div', { class: `paper5m-pages ${pages.length === 2 ? 'two' : 'one'}` }, pages.map((p, i) => h('div', { class: `paper5-page paper5-p${i}` }, h('div', { class: 'paper5-in' }, p)))));
  if (two && pages.length === 1) root.classList.add('wide');
  return root;
}

/** Nome curto da aparência (aparece no cabeçalho, como no mock: "1962 · cartas e telegramas"). */
export const INBOX_LOOK5: Record<Inbox5, L> = {
  desk: l('escrivaninha e envelopes', 'desk and envelopes'), telegram: l('cartas e telegramas', 'letters and telegrams'), fax: l('telex e fax', 'telex and fax'),
  crt: l('e-mail no monitor', 'e-mail on the monitor'), flat: l('e-mail na tela plana', 'e-mail on the flat screen'), phone: l('mensagens no celular', 'messages on the phone'),
};

// ---------------------------------------------------------------- teclas do papel (A arquivar, 1–4 responder, Esc fechar)

/** Teclas próprias do papel aberto. Devolve true quando tratou. Sem papel na tela: false. */
export function paperKey5Ev(e: { key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean; target?: EventTarget | null }, s: GameState | undefined): boolean {
  if (!s || !nav5On(s) || e.ctrlKey || e.metaKey || e.altKey || typeof document === 'undefined') return false;
  const pp = document.querySelector<HTMLElement>('[data-paper5]');
  if (!pp) return false;
  const tg = e.target as HTMLElement | null;
  if (tg && (/^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName) || tg.isContentEditable)) return false;
  if (document.querySelector('.overlay, .scene-overlay')) return false;
  const k = e.key;
  if (pp.dataset.paper5 === 'correspondencia') {
    if (k === 'a' || k === 'A') return mailKey27('e'); // A = arquivar (a mesma ação do "e" de hoje)
    if (/^[1-4]$/.test(k)) {
      const bs = [...pp.querySelectorAll<HTMLButtonElement>('.paper5-mail-read .m27-acts button:not(:disabled)')];
      const b = bs[Number(k) - 1];
      if (b) { b.click(); return true; }
      return false;
    }
    if (k === 'Escape' && pp.querySelector('.paper5-mail-read.reading')) return mailKey27('Escape');
  }
  if (k === 'Escape' && !pp.classList.contains('paper5m')) { closePaper5(s); return true; } // na casca, Esc é dela
  return false;
}

// ---------------------------------------------------------------- os papéis desta frente

const P = (p: Paper5, gray = false): Frame5x => ({ k: 'paper', p, gray });
const TV5 = (y: number): Inbox5 => (y < 1950 ? 'desk' : y < 2010 ? (y < 2000 ? 'crt' : 'flat') : 'flat');
const MSG5 = (y: number): Inbox5 => (y < 1970 ? 'telegram' : y < 2010 ? 'fax' : 'phone');

export const PAPER_FRAMES5: Record<string, Generic5> = {
  livrocaixa: { frame: P('ledger'), two: true, first: ledgerFirst5 },
  cofre: { frame: P('agenda'), two: true },
  arquivoaco: { frame: P('form') },
  revista: { frame: P('charts') },
  olheiro: { frame: P('scout'), two: true },
  quadrobranco: { frame: P('whiteboard') },
  jornal: { frame: P('charts', true) },
  radiotv: { frame: { k: 'inbox', look: TV5 } },
  secretaria: { frame: { k: 'inbox', look: MSG5 } },
  telefone: { frame: P('rolodex') },
  quadrometas: { frame: P('cork') },
  diario: { frame: P('agenda'), two: true },
  caderno: { frame: P('scout'), two: true },
  graficos: { frame: P('planning') },
  contador: { frame: P('form') },
};
for (const [id, g] of Object.entries(PAPER_FRAMES5)) registerPaperPage5(id, genericPaper5(g));
registerPaperPage5('correspondencia', inboxPaper5);

/** Os objetos desta frente (teste e capturas). */
export const PAPER_OBJS5 = [...Object.keys(PAPER_FRAMES5), 'correspondencia'];

// na API da casca (nav5): o MIOLO do papel (a casca põe moldura, título, tecla, bolso, Esc e os marcadores das páginas);
// as abas internas da página antiga viram marcadores do próprio miolo. Erro aqui = a casca mostra a página antiga.
for (const id of PAPER_OBJS5) registerPaper5(id, (c) => mioloPaper5({ s: c.s, obj: c.obj, area: c.marker.area, page: c.old(), close: c.close, mark: c.mark }));
