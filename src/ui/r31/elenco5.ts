// R31 · onda 5 (ELENCO) — os PAPÉIS do elenco no jogo explorável (EXP-7), atrás de `exp5.nav` (DESLIGADO por padrão):
//  mural de cortiça (tecla 4), quadro de planejamento (C), agenda de couro (G), fichário de contatos (A), chefe de
//  gabinete (Shift+D) e contratação (classificados, recepção, telefone).
// Cada papel abre POR CIMA da cena (moldura em pixel art de exp5paper), com as abas de hoje como marcadores; Esc fecha.
// Mesmos dados e as MESMAS ações de hoje (fonte única): menu de ações do artista (actions20/openActionMenu20), ficha do
// artista (inspect.act), planos reservados (reserveDialog/movePlan), agenda do mês (planAgenda/commitAgenda20), envolvimento,
// diretores, chefe de gabinete, candidatos, freelancers e músicos de estúdio (agenda17), delegação (deleg31View).
// Nada antigo some: todo papel tem "página de hoje ▸" que abre a tela antiga.
//
// Registro mínimo (até a frente NAV ter a casca): `registerPaper5(id, def)`; a navegação nova chega aqui pelo gancho
// `NAV5.go` (embrulhado abaixo: objeto com papel registrado abre o papel; o resto segue para a página de sempre). Com o
// interruptor desligado o embrulho só repassa: o jogo é exatamente o de hoje. Ver DECISOES (onda 5 · ELENCO).

import './elenco5.css';
import { l, type L } from '../../data/world';
import { countryName } from '../../data/geo';
import { getLang, t } from '../../i18n/strings';
import { movePlan } from '../../sim/capacity';
import { nav5On } from '../../sim/r31/exp5';
import type { GameState } from '../../sim/types';
import { baseAgenda20, commitAgenda20 } from '../actions20';
import { $, cityName, genreName, inspect, modal, rerender, toast } from '../common';
import { h } from '../dom';
import { reserveDialog } from '../panels/central';
import { avatarSprite, lookOf } from '../pixel/avatar';
import { paper5Layout, paper5Px, polaroid5Px, postit5Px, card5Px, tab5Px, type Paper5, type Rect5 } from '../pixel/exp5paper';
import { C, upscale, type Px } from '../pixel/px';
import { EXTRA_AREAS } from '../registry';
import { store } from '../store';
import { ballsEl, candTable, careerRows, freeTab, hireBlock, sessionTab, youTab } from '../sys/agenda17';
import { openActionMenu20 } from '../sys/actmenu20';
import { deleg31View } from '../sys/deleg31';
import { setTab } from '../vis';
import { chiefCands } from '../../sim/sys/agenda17';
import { NAV5, goto5, open5, registerPaper5 } from './nav5';
import { objectFor5, type Open5 } from './objects5';
import {
  CARD5, FICH5_0, HIRE5, MURAL_TABS5, STAMP5, WHERE5, agenda5, board5, boardMonth5, boardSlotWeek5, compare5, fichKey5, fichario5, hire5, mural5,
  type Board5, type BoardCard5, type Fich5Filter, type Hire5, type Polaroid5,
} from './elenco5model';

const tl = (x: L | undefined): string => (x ? t(x) : '');
/** Rótulo de interface sem a troca de nomes reais (palavras comuns como "Elenco" e "Telefone" também são nomes de selos). */
const ui = (x: L): string => x[getLang()];
/** Texto cru (o h() troca um texto inteiro igual ao nome real de um selo, ex.: "Elenco" → selo-homenagem). */
const raw = <E extends HTMLElement>(el: E, text: string): E => { el.append(document.createTextNode(text)); return el; };
const N = (pt: string, en: string): L => l(pt, en);

// ================================================================ registro de papéis

export interface PaperTab5 { id: string; label: L }
export interface PaperDef5 {
  kind: Paper5;
  title: L;
  sub?: (s: GameState) => L;
  key?: string;
  tabs?: (s: GameState) => PaperTab5[];
  /** página de hoje (o botão "página de hoje ▸") */
  old?: Open5;
  render: (s: GameState, tab: string, body: Rect5[]) => HTMLElement;
}
const REG5 = new Map<string, PaperDef5>();
/** objeto da onda 5 → papel */
const BY_OBJ5 = new Map<string, string>();
/** Registra um papel do ELENCO (moldura própria até a casca da NAV existir) e o conteúdo na API da NAV (registerPaper5). */
export function registerElenco5(id: string, def: PaperDef5, objs: string[] = []): void {
  REG5.set(id, def);
  for (const o of objs) {
    BY_OBJ5.set(o, id);
    registerPaper5(o, (c) => navBody5(id, c.s, tabOfMarker5(id, c.marker)));
  }
}
export const elencoPapers5 = (): string[] => [...REG5.keys()];
export const paperOfObj5 = (obj: string): string | undefined => BY_OBJ5.get(obj);

let cur: { id: string; tab: string; area: string } | null = null;
let host: HTMLElement | null = null;
const TAB5: Record<string, string> = {};

export const paperOpen5 = (): string | undefined => cur?.id;
export function openPaper5(id: string, tab?: string): boolean {
  const d = REG5.get(id);
  if (!d || !store.game) return false;
  const tabs = d.tabs?.(store.game) ?? [];
  const tb = tab && tabs.some((x) => x.id === tab) ? tab : TAB5[id] && tabs.some((x) => x.id === TAB5[id]) ? TAB5[id] : tabs[0]?.id ?? '';
  cur = { id, tab: tb, area: store.area };
  TAB5[id] = tb;
  draw();
  return true;
}
export function closePaper5(): void {
  cur = null;
  host?.remove();
  host = null;
}

/** Aba do papel a partir do marcador que a casca da NAV abriu (página antiga + aba). */
export function tabOfMarker5(id: string, m: Open5 | undefined): string {
  if (id === 'mural') return m?.area === 'people' && m.tab?.[0] === 'people' ? m.tab[1] : 'roster';
  if (id === 'agenda') return m?.tab?.[1] === 'you' ? 'you' : 'month';
  if (id === 'quadro') return 'all';
  return '';
}
/** Miolo do papel para a casca da NAV (sem moldura: a casca põe moldura, título, marcadores e Esc). */
function navBody5(id: string, s: GameState, tab: string): HTMLElement | null {
  const d = REG5.get(id);
  if (!d || typeof window === 'undefined') return null;
  const W = Math.floor(Math.min(window.innerWidth - 80, 1300) / SCALE), H = Math.floor((window.innerHeight - 200) / SCALE);
  const lay = paper5Layout(d.kind, W, H);
  const off = lay.body[0];
  const body = lay.body.map((r) => ({ ...r, x: r.x - off.x, y: r.y - off.y }));
  return h('div', { class: `el5-paper el5-nav el5-${d.kind} el5-p-${id}`, style: `position:relative;width:${(body[body.length - 1].x + body[body.length - 1].w) * SCALE}px;height:${body[0].h * SCALE}px` }, d.render(s, tab, body));
}

// ================================================================ ganchos (embrulho de NAV5.go e do redesenho)

let rawGo: ((t: Open5) => void) | undefined = NAV5.go;
/** Página antiga (sem passar pelo papel). */
export function goOld5(t: Open5): void { closePaper5(); rawGo?.(t); }
/** Aba antiga que vira marcador do papel. */
const TAB_OF5: Record<string, string> = { people: 'people' };
function goWrapped(tgt: Open5): void {
  const g = store.game;
  if (g && nav5On(g)) {
    const o = objectFor5(tgt.area, tgt.tab);
    const pid = o ? BY_OBJ5.get(o.id) : undefined;
    if (pid && openPaper5(pid, tgt.tab && TAB_OF5[tgt.tab[0]] ? tgt.tab[1] : undefined)) return;
  }
  closePaper5();
  rawGo?.(tgt);
}
Object.defineProperty(NAV5, 'go', { configurable: true, enumerable: true, get: () => (rawGo ? goWrapped : undefined), set: (f: ((t: Open5) => void) | undefined) => { rawGo = f; } });

let rawRender: () => void = store.rerender;
Object.defineProperty(store, 'rerender', {
  configurable: true, enumerable: true,
  // redesenha o papel aberto depois de cada ação; se a ação levou a outra página (menu "ver…", "mais candidatos →"), o papel fecha
  get: () => () => { if (cur && cur.area !== store.area) closePaper5(); rawRender(); if (cur) { if (store.game && nav5On(store.game)) draw(); else closePaper5(); } },
  set: (f: () => void) => { rawRender = f; },
});

if (typeof document !== 'undefined') document.addEventListener('keydown', (e) => {
  if (!cur) return;
  if (document.querySelector('.overlay, .am20')) return; // janela ou menu por cima: a tecla é dela
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closePaper5(); return; }
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (cur.id === 'fichario' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); e.stopImmediatePropagation(); stepDrawer(e.key === 'ArrowRight' ? 1 : -1); }
}, true);

// ================================================================ casca do papel

const SCALE = 2;
function frameCanvas(kind: Paper5, w: number, h: number): HTMLCanvasElement {
  const c = upscale(paper5Px(kind, w, h, { seed: 7 }).canvas(), w * SCALE, h * SCALE);
  c.className = 'el5-frame px';
  return c;
}
const pxEl = (p: Px, cls: string, scale = SCALE): HTMLCanvasElement => { const c = upscale(p.canvas(), p.w * scale, p.h * scale); c.className = `${cls} px`; return c; };
const at = (r: Rect5): string => `left:${r.x * SCALE}px;top:${r.y * SCALE}px;width:${r.w * SCALE}px;height:${r.h * SCALE}px`;

function draw(): void {
  const s = store.game;
  if (!s || !cur || typeof document === 'undefined' || typeof document.body?.append !== 'function') return;
  const d = REG5.get(cur.id);
  if (!d) return;
  const vw = window.innerWidth, vh = window.innerHeight;
  const W = Math.floor(Math.min(vw - 40, 1360) / SCALE), H = Math.floor((vh - 96) / SCALE);
  const lay = paper5Layout(d.kind, W, H);
  const tabs = d.tabs?.(s) ?? [];
  const keep = host?.querySelector<HTMLElement>('.el5-scroll')?.scrollTop ?? 0;
  const tabEls = tabs.map((x) => {
    const on = x.id === cur!.tab;
    const label = ui(x.label);
    const w = Math.max(30, label.length * 4 + 14);
    return h('button', { type: 'button', class: `el5-tab ${on ? 'on' : ''}`, role: 'tab', 'aria-selected': on ? 'true' : 'false', style: `width:${w * SCALE}px`, onclick: () => { cur!.tab = x.id; TAB5[cur!.id] = x.id; draw(); } },
      pxEl(tab5Px(d.kind, w, on), 'el5-tabbg'), raw(h('span'), label));
  });
  const old = d.old;
  const body = d.render(s, cur.tab, lay.body);
  const paper = h('div', { class: `el5-paper el5-${d.kind} el5-p-${cur.id}`, style: `width:${W * SCALE}px;height:${H * SCALE}px`, role: 'dialog', 'aria-label': tl(d.title) },
    frameCanvas(d.kind, W, H),
    h('div', { class: 'el5-head', style: at(lay.head) },
      h('b', { class: 'el5-title' }, tl(d.title)),
      h('small', { class: 'el5-sub' }, [d.sub ? tl(d.sub(s)) : '', d.key ? `${t(l('tecla', 'key'))} ${d.key}` : ''].filter(Boolean).join(' · ')),
      h('span', { class: 'el5-sp' }),
      old ? h('button', { type: 'button', class: 'el5-old', onclick: () => goOld5(old) }, t(l('página de hoje ▸', 'today\'s page ▸'))) : null,
      h('button', { type: 'button', class: 'el5-close', onclick: () => closePaper5() }, h('kbd', null, 'Esc'), ' ', t(l('fechar', 'close')))),
    tabEls.length ? h('div', { class: 'el5-tabs', role: 'tablist', style: at(lay.tabs) }, tabEls) : null,
    body);
  const next = h('div', { class: 'el5-host', 'data-paper5': cur.id }, h('div', { class: 'el5-scrim', onclick: () => closePaper5() }), paper);
  if (host) host.replaceWith(next); else document.body.append(next);
  host = next;
  const sc = host.querySelector<HTMLElement>('.el5-scroll');
  if (sc) sc.scrollTop = keep;
}

/** Corpo com rolagem dentro de uma área do papel. */
const area = (r: Rect5, cls: string, ...kids: (Node | string | null | undefined | false)[]): HTMLElement =>
  h('div', { class: `el5-body el5-scroll ${cls}`, style: at(r) }, ...kids.filter((x): x is Node | string => !!x));

// ================================================================ retratos

const SPR = new Map<string, HTMLCanvasElement>();
function bodySprite(s: GameState, pid: string | undefined, scale: number): HTMLCanvasElement | null {
  const p = pid ? s.persons[pid] : undefined;
  if (!p) return null;
  const key = `${p.id}|${s.year}|${scale}`;
  let c = SPR.get(key);
  if (!c) {
    try { const sp = avatarSprite(lookOf(p), { year: s.year }); c = upscale(sp.c, sp.c.width * scale, sp.c.height * scale); } catch { return null; }
    SPR.set(key, c);
    if (SPR.size > 300) SPR.delete(SPR.keys().next().value!);
  }
  const copy = document.createElement('canvas');
  copy.width = c.width; copy.height = c.height; copy.className = 'px el5-spr';
  copy.getContext('2d')?.drawImage(c, 0, 0);
  return copy;
}

// ================================================================ 1. mural de cortiça

const PINS = [C('#c83a32'), C('#2a8a4a'), C('#e0c040'), C('#3a6ac8'), C('#8a4ab0')];
const PW = 88, PH = 106;
function polaroid(s: GameState, p: Polaroid5, i: number): HTMLElement {
  const pol = pxEl(polaroid5Px(PW, PH, PINS[i % PINS.length]), 'el5-polbg');
  const rot = ((i * 37) % 7) - 3;
  const photo = Math.round((PH - 1) * 0.74) - 3;
  const open = (e: Event) => { e.stopPropagation(); inspect.act(p.id); };
  const menu = (e: MouseEvent, anchor: HTMLElement) => { e.preventDefault(); e.stopPropagation(); openActionMenu20(s, p.id, anchor, { x: e.clientX, y: e.clientY }); };
  const btn = h('button', { type: 'button', class: 'el5-act', 'aria-haspopup': 'menu', 'data-actmenu20': p.id, onclick: (e: MouseEvent) => menu(e, btn) }, t(l('Ações ▾', 'Actions ▾')));
  const el = h('div', { class: 'el5-pol', style: `width:${(PW + 3) * SCALE}px;height:${(PH + 4) * SCALE}px;transform:rotate(${rot * 0.6}deg)`, tabindex: '0', role: 'button', 'data-act5': p.id,
    title: [p.name, tl(WHERE5[p.where]), p.alert ? tl(p.alert) : ''].filter(Boolean).join(' · '),
    onclick: open, oncontextmenu: (e: MouseEvent) => menu(e, el), onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') open(e); else if (e.key === ' ' || e.key === 'ContextMenu') menu(e as unknown as MouseEvent, btn); } },
    pol,
    h('div', { class: 'el5-photo', style: `left:${3 * SCALE}px;top:${4 * SCALE}px;width:${(PW - 5) * SCALE}px;height:${photo * SCALE}px` }, bodySprite(s, p.face, 3)),
    h('div', { class: 'el5-stamps' }, p.stamps.slice(0, 3).map((x) => h('span', { class: `el5-stamp t-${STAMP5[x].tone}` }, x === 'expiring' && p.contractLeft !== undefined ? t(l('contrato {w} sem', 'contract {w} wk'), { w: p.contractLeft }) : tl(STAMP5[x].label)))),
    h('div', { class: 'el5-cap', style: `top:${(photo + 6) * SCALE}px` },
      h('b', null, p.name), h('small', null, `${genreName(p.genre)} · ${t(l('fama', 'fame'))} ${p.fame}`),
      h('div', { class: 'el5-bars' },
        h('i', { class: 'el5-bar g', title: `${t(l('moral', 'morale'))} ${p.moral}` }, h('i', { style: `width:${p.moral}%` })),
        h('i', { class: 'el5-bar y', title: `${t(l('energia', 'energy'))} ${p.energy}` }, h('i', { style: `width:${p.energy}%` }))),
      btn));
  return el;
}
const postit = (w: number, hh: number, text: (Node | string)[], color?: string, onclick?: () => void): HTMLElement =>
  h(onclick ? 'button' : 'div', { class: `el5-postit ${onclick ? 'click' : ''}`, style: `width:${(w + 2) * SCALE}px;min-height:${(hh + 2) * SCALE}px`, ...(onclick ? { type: 'button', onclick } : {}) },
    pxEl(postit5Px(w, hh, color ? C(color) : undefined), 'el5-postbg'), h('div', { class: 'el5-posttxt' }, ...text));

function muralBody(s: GameState, tab: string, body: Rect5[]): HTMLElement {
  if (tab !== 'roster') { // abas de hoje da página Pessoas, no próprio papel (mesmas funções)
    const people = EXTRA_AREAS.find((a) => a.id === 'people');
    setTab('people', tab);
    return area(body[0], 'el5-sheet el5-embed el5-people', people ? people.render(s) : h('p', null, '—'));
  }
  const ps = mural5(s);
  return area(body[0], 'el5-cork',
    h('div', { class: 'el5-wall' },
      ps.map((p, i) => polaroid(s, p, i)),
      postit(84, 40, [h('b', null, t(l('+ Vaga no elenco', '+ Roster opening'))), h('br'), t(l('Polaroid vazia: clique para ir ao caderno do olheiro (A&R) e contratar.', 'Empty polaroid: click to go to the scout\'s notebook (A&R) and sign.'))], '#fbf6c0', () => open5('olheiro'))),
    h('div', { class: 'el5-notes' },
      postit(96, 44, [h('b', null, t(l('Barras', 'Bars'))), ': ', t(l('verde = moral, amarelo = energia.', 'green = morale, yellow = energy.')), h('br'), t(l('Clique = ficha; botão direito ou "Ações ▾" = o menu de ações de sempre.', 'Click = profile; right-click or "Actions ▾" = the usual actions menu.'))]),
      postit(96, 40, [h('b', null, t(l('Selinhos', 'Stamps'))), ' ', t(l('mostram o mês: gravando, turnê, descanso, crise, contrato vencendo, saúde ruim, lançamento.', 'show the month: recording, touring, resting, crisis, contract ending, poor health, release.'))]),
      ps.length ? null : postit(96, 30, [t(l('Ninguém no elenco ainda.', 'Nobody on the roster yet.'))])));
}

registerElenco5('mural', {
  kind: 'cork', title: N('Mural do elenco', 'Roster corkboard'), key: '4', old: { area: 'artists' },
  sub: (s) => l(`${mural5(s).length} artistas`, `${mural5(s).length} acts`),
  tabs: () => MURAL_TABS5,
  render: muralBody,
}, ['mural']);

// ================================================================ 2. quadro de planejamento

const BOARD5 = { mode: 'months' as 'months' | 'weeks', only: false };
let drag5: BoardCard5 | null = null;

function dropCard(s: GameState, b: Board5, c: BoardCard5, col: number, act: string): void {
  if (c.act !== act) { toast(t(l('O cartão fica na linha do artista.', 'The card stays on the artist\'s row.')), 'bad'); return; }
  if (c.src === 'plan' && b.mode === 'months') {
    const e = movePlan(s, String(c.ref), boardMonth5(b, col));
    toast(e ? t(e) : t(l('Plano movido.', 'Plan moved.')), e ? 'bad' : 'good');
    rerender();
    return;
  }
  if (c.src === 'slot' && b.mode === 'weeks') {
    const a = s.acts[c.act];
    const wk = boardSlotWeek5(b, col); // semana 1..4 do mês corrente
    const base = baseAgenda20(s, a);
    const i = Number(c.ref);
    if (!base[i] || wk < 1 || wk > 4) { toast(t(l('Só dá para mover dentro deste mês (semanas 1–4).', 'You can only move within this month (weeks 1–4).')), 'bad'); return; }
    base[i] = { action: base[i].action, params: { ...(base[i].params ?? {}), week: wk } };
    commitAgenda20(s, a, base);
    toast(t(l('Agenda do mês atualizada.', 'This month\'s agenda updated.')), 'good');
    rerender();
    return;
  }
  toast(t(l('Este cartão não muda de data por aqui.', 'This card cannot be rescheduled here.')), 'bad');
}

function quadroBody(s: GameState, tab: string, body: Rect5[]): HTMLElement {
  BOARD5.only = tab === 'conflicts';
  const b = board5(s, BOARD5.mode, BOARD5.only);
  const span = b.cols.length;
  const grid = `grid-template-columns: 172px repeat(${span}, minmax(0, 1fr))`;
  const head = h('div', { class: 'el5-brow el5-bhead', style: grid },
    h('div', { class: 'el5-bh' }, t(l('Artista', 'Artist'))),
    b.cols.map((c) => h('div', { class: `el5-bh ${c.now ? 'now' : ''}` }, tl(c.label))));
  const rows = b.rows.map((r) => {
    const cards = b.cards.filter((x) => x.act === r.id).sort((x, y) => x.c0 - y.c0 || y.c1 - x.c1);
    const lanes: number[] = []; // última coluna ocupada por faixa
    const placed = cards.map((c) => { let ln = lanes.findIndex((end) => end < c.c0); if (ln < 0) { ln = lanes.length; lanes.push(-1); } lanes[ln] = c.c1; return { c, ln }; });
    const nl = Math.max(1, lanes.length);
    const cells = b.cols.map((_, ci) => h('div', { class: 'el5-cell', style: `grid-column:${ci + 2};grid-row:1 / span ${nl}`, 'data-col': String(ci),
      ondragover: (e: DragEvent) => { if (drag5) e.preventDefault(); },
      ondrop: (e: DragEvent) => { e.preventDefault(); const c = drag5; drag5 = null; if (c) dropCard(s, b, c, ci, r.id); },
      onclick: (e: MouseEvent) => {
        const el = e.currentTarget as HTMLElement;
        openActionMenu20(s, r.id, el, { x: e.clientX, y: e.clientY }, { label: N('Quadro', 'Board'), items: [{ id: 'board.reserve', label: N('Reservar um mês (sem custo até começar)…', 'Book a month (no cost until it starts)…'), icon: 'calendar', run: () => reserveDialog(s, r.id) }] });
      } }));
    const cardEls = placed.map(({ c, ln }) => h('div', {
      class: `el5-card k-${c.kind} ${c.conflict ? 'conf' : ''} ${c.movable ? 'mv' : ''}`, style: `grid-column:${c.c0 + 2} / ${c.c1 + 3};grid-row:${ln + 1}`,
      draggable: c.movable ? 'true' : 'false', title: [tl(c.title), tl(c.sub), c.conflict ? t(l('Conflito: gravando e em turnê ao mesmo tempo. Arraste um dos cartões.', 'Conflict: recording and touring at once. Drag one of the cards.')) : ''].filter(Boolean).join(' · '),
      ondragstart: () => { drag5 = c; }, ondragend: () => { setTimeout(() => { drag5 = null; }, 0); },
      onclick: (e: MouseEvent) => { e.stopPropagation(); openActionMenu20(s, c.act, e.currentTarget as HTMLElement, { x: e.clientX, y: e.clientY }); } },
      h('b', null, tl(c.title)), c.sub ? h('small', null, tl(c.sub)) : null));
    return h('div', { class: 'el5-brow', style: `${grid};grid-template-rows:repeat(${nl}, 46px)` },
      h('div', { class: 'el5-bname', style: `grid-row:1 / span ${nl}`, onclick: () => inspect.act(r.id), title: t(l('Abrir a ficha', 'Open the profile')) }, bodySprite(s, r.face, 1), h('span', null, h('b', null, r.name), h('small', null, genreName(r.genre)))),
      cells, cardEls);
  });
  const legend = h('div', { class: 'el5-legend' },
    (['rec', 'rel', 'pro', 'tour', 'rest'] as const).map((k) => h('span', null, h('i', { class: `k-${k}` }), tl(CARD5[k]))),
    h('span', { class: 'el5-sp' }),
    h('span', { class: 'el5-hint' }, t(l('Clique num espaço vazio = menu de ações · arraste = mudar a data (planos por mês; agenda do mês por semana)', 'Click an empty space = actions menu · drag = reschedule (plans by month; this month\'s agenda by week)'))),
    h('span', { class: 'el5-seg' },
      (['months', 'weeks'] as const).map((m) => h('button', { type: 'button', class: BOARD5.mode === m ? 'on' : '', onclick: () => { BOARD5.mode = m; draw(); } }, m === 'months' ? t(l('Meses', 'Months')) : t(l('Semanas', 'Weeks'))))));
  return area(body[0], 'el5-board',
    b.conflicts.length ? h('div', { class: 'el5-warn' }, h('b', null, t(l('Conflito: ', 'Conflict: '))), b.conflicts.slice(0, 3).map((x) => tl(x.text)).join(' '), ' ', t(l('Arraste um dos cartões para outro mês.', 'Drag one of the cards to another month.'))) : null,
    b.rows.length ? h('div', { class: 'el5-grid' }, head, rows) : h('p', { class: 'el5-empty' }, BOARD5.only ? t(l('Nenhum conflito na agenda do elenco.', 'No conflicts in the roster schedule.')) : t(l('Ninguém no elenco ainda — contrate pelo caderno do olheiro.', 'Nobody on the roster yet — sign acts from the scout\'s notebook.'))),
    legend);
}

registerElenco5('quadro', {
  kind: 'planning', title: N('Quadro de planejamento', 'Planning board'), key: 'C', old: { area: 'plan' },
  sub: () => (BOARD5.mode === 'months' ? N('próximos 12 meses', 'next 12 months') : N('próximas 12 semanas', 'next 12 weeks')),
  tabs: () => [{ id: 'all', label: N('Seu elenco', 'Your roster') }, { id: 'conflicts', label: N('Só conflitos', 'Conflicts only') }, { id: 'team', label: N('Equipe', 'Staff') }],
  render: (s, tab, body) => (tab === 'team' ? area(body[0], 'el5-sheet el5-embed', deleg31View(s)) : quadroBody(s, tab, body)),
}, ['quadroplan']);

// ================================================================ 3. agenda de couro

const MONTH5: L[] = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  .map((pt, i) => l(pt, ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][i]));

function agendaBody(s: GameState, tab: string, body: Rect5[]): HTMLElement {
  if (tab === 'you') return h('div', null, area(body[0], 'el5-page el5-embed', youTab(s)), area(body[1], 'el5-page el5-embed', h('h3', null, t(l('Delegação', 'Delegation'))), deleg31View(s)));
  const a = agenda5(s);
  const item = (it: (typeof a.weeks)[number][number]) => h('div', { class: `el5-slot ${it.act ? 'act' : ''} tone-${it.tone}` },
    h('b', null, tl(it.t)), it.d ? h('small', null, tl(it.d)) : null,
    h('button', { type: 'button', class: 'el5-go', onclick: () => { closePaper5(); goto5(s, it.deadline); } }, t(l('ir até lá ▸', 'go there ▸'))));
  const left = area(body[0], 'el5-page',
    h('h3', null, `${tl(MONTH5[a.month])} ${a.year}`),
    h('p', { class: 'el5-subl' }, t(l('{o} horários de expediente + {p} pessoais por mês (passe o mouse nas bolinhas para ver o porquê)', '{o} office slots + {p} personal ones a month (hover the dots for the reason)'), { o: a.office.length, p: a.personal.length })),
    ballsEl(s, true),
    a.overbooked ? h('p', { class: 'el5-over' }, t(l('Página riscada: {n} além do possível — estresse sobe e tudo rende menos.', 'Crossed-out page: {n} beyond capacity — stress rises and everything yields less.'), { n: a.overbooked })) : null,
    h('div', { class: 'el5-weeks' }, a.weeks.map((w, i) => h('div', { class: 'el5-wk' },
      h('span', { class: 'el5-wkn' }, t(l('Semana {n}', 'Week {n}'), { n: i + 1 })),
      h('div', { class: 'el5-wks' }, w.length ? w.map(item) : h('div', { class: 'el5-slot free' }, t(l('+ livre', '+ free'))))))));
  const right = area(body[1], 'el5-page el5-embed',
    h('h3', null, t(l('Carreiras e delegação', 'Careers and delegation'))),
    h('p', { class: 'el5-subl' }, t(l('Envolvimento por carreira: à frente (2), normal (1), delegada (0). Mesmas escolhas da página de hoje.', 'Involvement per career: hands-on (2), normal (1), delegated (0). Same choices as today\'s page.'))),
    careerRows(s),
    h('div', { class: 'el5-box' }, h('h4', null, t(l('Chefe de gabinete', 'Chief of staff'))),
      a.chief ? h('p', null, h('b', null, a.chief.name), ` · ${t(l('habilidade', 'skill'))} ${a.chief.skill} · ${$(a.chief.salary)}/${t(l('mês', 'mo'))}`) : h('p', null, t(l('Ninguém no cargo. Candidatos esperam na recepção.', 'Nobody in the post. Candidates wait at reception.'))),
      a.reports[0] ? h('p', { class: 'el5-subl' }, `${t(l('Último relatório', 'Latest report'))}: ${tl(a.reports[0].t)}`) : null,
      h('button', { type: 'button', class: 'el5-link', onclick: () => openPaper5('chefe') }, t(l('relatórios de delegação ▸', 'delegation reports ▸')))),
    h('div', { class: 'el5-box' }, h('h4', null, t(l('Contratar', 'Hire'))),
      h('div', { class: 'el5-row' }, (Object.keys(HIRE5) as Hire5[]).map((k) => raw(h('button', { type: 'button', class: 'el5-link', title: tl(HIRE5[k].hint), onclick: () => openPaper5('contratar', k) }), `${ui(HIRE5[k].label)} ▸`)))));
  return h('div', null, left, right);
}

registerElenco5('agenda', {
  kind: 'agenda', title: N('Sua agenda', 'Your planner'), key: 'G', old: { area: 'agenda17' },
  sub: (s) => l(`${MONTH5[s.month].pt.toLowerCase()} de ${s.year}`, `${MONTH5[s.month].en} ${s.year}`),
  tabs: () => [{ id: 'month', label: N('Mês', 'Month') }, { id: 'you', label: N('Você e delegação', 'You and delegation') }],
  render: agendaBody,
}, ['agenda']);

// ================================================================ 4. fichário de contatos

const FICH5: Fich5Filter & { pick: string[] } = { ...FICH5_0, pick: [] };
function stepDrawer(d: number): void {
  const s = store.game;
  if (!s) return;
  const r = fichario5(s, { ...FICH5, page: 0 });
  const ks = r.drawers.filter((x) => x.n).map((x) => x.key);
  if (!ks.length) return;
  const i = ks.indexOf(fichKey5(s, FICH5));
  FICH5.key = ks[(i + d + ks.length) % ks.length]; FICH5.page = 0;
  draw();
}
const OWN5 = { mine: N('Seu', 'Yours'), rival: N('Rival', 'Rival'), free: N('Sem selo', 'Unsigned') };
function compareOpen(s: GameState): void {
  const c = compare5(s, FICH5.pick);
  modal(t(l('Comparar artistas', 'Compare acts')), h('table', { class: 'tbl compact el5-cmp' },
    h('thead', null, h('tr', null, h('th', null, ''), c.names.map((n) => h('th', null, n)))),
    h('tbody', null, c.rows.map((r) => h('tr', null, h('td', null, tl(r.label)), r.v.map((v) => h('td', { class: 'num' }, String(v))))))));
}
function fichBody(s: GameState, _tab: string, body: Rect5[]): HTMLElement {
  const f = fichario5(s, FICH5);
  const key = fichKey5(s, FICH5);
  const set = (p: Partial<Fich5Filter>) => { Object.assign(FICH5, p, 'page' in p ? {} : { page: 0 }); draw(); };
  const sel = (label: L, v: string, opts: { value: string; label: string }[], on: (v: string) => void) => h('div', { class: 'el5-sel' }, h('span', null, `${ui(label)}:`),
    h('select', { 'aria-label': ui(label), onchange: (e: Event) => on((e.target as HTMLSelectElement).value) }, opts.map((o) => h('option', { value: o.value, ...(o.value === v ? { selected: 'selected' } : {}) }, o.label))));
  // letra crua: o filtro de nomes reais do h() troca textos inteiros iguais a um nome (ex.: uma letra solta)
  const drawers = h('div', { class: 'el5-drawers' }, f.drawers.map((d) => raw(h('button', { type: 'button', class: `el5-dr ${d.key === key ? 'on' : ''}`, disabled: !d.n, title: `${d.n}`, onclick: () => set({ key: d.key }) }),
    FICH5.drawer === 'country' ? d.key : FICH5.drawer === 'genre' ? genreName(d.key) : d.key)));
  const filters = h('div', { class: 'el5-filters' },
    sel(N('Gaveta', 'Drawer'), FICH5.drawer, [{ value: 'letter', label: t(l('letra', 'letter')) }, { value: 'genre', label: t(l('gênero', 'genre')) }, { value: 'country', label: t(l('país', 'country')) }], (v) => set({ drawer: v as Fich5Filter['drawer'], key: '' })),
    sel(N('Gênero', 'Genre'), FICH5.genre, [{ value: '', label: t(l('todos', 'all')) }, ...f.genres.map((g) => ({ value: g, label: genreName(g) }))], (v) => set({ genre: v, key: '' })),
    sel(N('País', 'Country'), FICH5.country, [{ value: '', label: t(l('todos', 'all')) }, ...f.countries.map((c) => ({ value: c, label: t(countryName(c)) }))], (v) => set({ country: v, key: '' })),
    h('button', { type: 'button', class: `el5-chip ${FICH5.noLabel ? 'on' : ''}`, onclick: () => set({ noLabel: !FICH5.noLabel, key: '' }) }, t(l('Só sem selo', 'Unsigned only'))),
    sel(N('Ordenar', 'Sort'), FICH5.sort, [{ value: 'fame', label: t(l('fama', 'fame')) }, { value: 'name', label: t(l('nome', 'name')) }, { value: 'know', label: t(l('o que você sabe', 'what you know')) }], (v) => set({ sort: v as Fich5Filter['sort'] })),
    h('input', { type: 'search', class: 'el5-q', value: FICH5.q, placeholder: t(l('buscar no fichário…', 'search the card file…')), 'aria-label': t(l('buscar no fichário', 'search the card file')),
      onchange: (e: Event) => set({ q: (e.target as HTMLInputElement).value, key: '' }) }));
  const CW = 150, CH = 62;
  const cards = h('div', { class: 'el5-cards' }, f.cards.map((c) => {
    const picked = FICH5.pick.includes(c.id);
    return h('div', { class: `el5-fc ${picked ? 'picked' : ''}`, style: `width:${(CW + 2) * SCALE}px;height:${(CH + 2) * SCALE}px`, tabindex: '0', role: 'button', 'data-act5': c.id,
      onclick: () => inspect.act(c.id), onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') inspect.act(c.id); } },
      pxEl(card5Px(CW, CH), 'el5-fcbg'),
      h('div', { class: 'el5-fcface' }, bodySprite(s, c.face, 2)),
      h('span', { class: `el5-own o-${c.owner}` }, tl(OWN5[c.owner])),
      h('div', { class: 'el5-fctxt' },
        h('b', null, c.name), h('small', null, `${genreName(c.genre)} · ${cityName(c.city)}`),
        h('div', { class: 'el5-fame' }, h('small', null, `${t(l('fama', 'fame'))} ${c.fame}`), h('i', null, h('i', { style: `width:${Math.min(100, c.fame)}%` }))),
        h('small', { class: 'el5-know' }, `${t(l('o que você sabe', 'what you know'))} `, h('span', null, '▮'.repeat(c.know + 1) + '▯'.repeat(3 - c.know)))),
      h('label', { class: 'el5-pick', title: t(l('marcar para comparar', 'tick to compare')), onclick: (e: Event) => e.stopPropagation() },
        h('input', { type: 'checkbox', ...(picked ? { checked: 'checked' } : {}), onchange: () => { FICH5.pick = picked ? FICH5.pick.filter((x) => x !== c.id) : [...FICH5.pick, c.id].slice(-4); draw(); } }), t(l('comparar', 'compare'))));
  }));
  const foot = h('div', { class: 'el5-ffoot' },
    h('span', null, key ? t(l('Gaveta {k} · cartões {a}–{b} de {n}', 'Drawer {k} · cards {a}–{b} of {n}'), { k: FICH5.drawer === 'genre' ? genreName(key) : key, a: f.shown ? f.page * 12 + 1 : 0, b: Math.min(f.shown, (f.page + 1) * 12), n: f.shown }) : t(l('{n} cartões', '{n} cards'), { n: f.shown })),
    h('span', { class: 'el5-keys' }, h('kbd', null, '←'), h('kbd', null, '→'), ` ${t(l('trocar gaveta', 'switch drawer'))} · `, h('kbd', null, 'Enter'), ` ${t(l('abrir ficha', 'open profile'))}`),
    FICH5.pick.length >= 2 ? h('button', { type: 'button', class: 'el5-link', onclick: () => compareOpen(s) }, t(l('Comparar {n} ▸', 'Compare {n} ▸'), { n: FICH5.pick.length })) : h('span', { class: 'el5-hint' }, t(l('marque 2–4 cartões para comparar', 'tick 2–4 cards to compare'))),
    h('span', { class: 'el5-sp' }),
    f.page > 0 ? h('button', { type: 'button', class: 'el5-link', onclick: () => set({ page: f.page - 1 }) }, t(l('◂ anterior', '◂ previous'))) : null,
    f.page < f.pages - 1 ? h('button', { type: 'button', class: 'el5-link', onclick: () => set({ page: f.page + 1 }) }, t(l('próxima ▸', 'next ▸'))) : null);
  return area(body[0], 'el5-rolo', h('p', { class: 'el5-subl' }, t(l('Todos os artistas que você conhece · {n} cartões · clique num cartão para abrir a ficha', 'Every act you know · {n} cards · click a card to open the profile'), { n: f.total })), drawers, filters,
    f.cards.length ? cards : h('p', { class: 'el5-empty' }, t(l('Nenhum cartão nesta gaveta com esses filtros.', 'No cards in this drawer with these filters.'))), foot);
}

registerElenco5('fichario', {
  kind: 'rolodex', title: N('Fichário de contatos', 'Contact card file'), key: 'A', old: { area: 'directory' },
  render: fichBody,
}, ['fichario']);

// ================================================================ 5. contratação e chefe de gabinete

function hireBody(s: GameState, tab: string, body: Rect5[]): HTMLElement {
  const v = hire5(s);
  const k = (tab as Hire5) in HIRE5 ? (tab as Hire5) : 'jornal';
  const intro = h('p', { class: 'el5-subl' }, tl(HIRE5[k].hint));
  if (k === 'jornal') return area(body[0], 'el5-sheet el5-embed', intro, hireBlock(s));
  if (k === 'recepcao') return area(body[0], 'el5-sheet el5-embed', intro,
    h('h3', null, t(l('Diretores de carreira ({n} frentes sem diretor)', 'Career directors ({n} fronts without one)'), { n: v.directors.length })), careerRows(s),
    h('h3', null, t(l('Chefe de gabinete', 'Chief of staff'))), v.chief ? candTable(s, chiefCands(s), true) : h('p', null, t(l('O cargo está ocupado (veja o chefe de gabinete, Shift+D).', 'The post is filled (see the chief of staff, Shift+D).'))));
  return area(body[0], 'el5-sheet el5-embed', intro, freeTab(s), sessionTab(s));
}
registerElenco5('contratar', {
  kind: 'form', title: N('Contratação', 'Hiring'), old: { area: 'agenda17', tab: ['agenda17', 'hire'] },
  sub: (s) => { const v = hire5(s); return l(`${v.staff} candidatos · ${v.freelancers} freelancers`, `${v.staff} candidates · ${v.freelancers} freelancers`); },
  tabs: () => (Object.keys(HIRE5) as Hire5[]).map((k) => ({ id: k, label: HIRE5[k].label })),
  render: hireBody,
});
/** Contratação a partir do jornal (classificados), da recepção ou do telefone (para as frentes donas desses objetos). */
export const openHire5 = (where: Hire5): boolean => openPaper5('contratar', where);

registerElenco5('chefe', {
  kind: 'form', title: N('Chefe de gabinete', 'Chief of staff'), key: 'Shift+D', old: { area: 'deleg31' },
  sub: () => N('delegação, políticas e relatórios', 'delegation, policies and reports'),
  render: (s, _tab, body) => {
    const a = agenda5(s);
    return area(body[0], 'el5-sheet el5-embed',
      h('div', { class: 'el5-chief' },
        a.chief ? h('p', null, h('b', null, a.chief.name), ` · ${t(l('na sua sala', 'in your office'))} · ${t(l('habilidade', 'skill'))} ${a.chief.skill} · ${$(a.chief.salary)}/${t(l('mês', 'mo'))}`)
          : h('p', null, t(l('Ninguém no cargo ainda: ', 'Nobody in the post yet: ')), h('button', { type: 'button', class: 'el5-link', onclick: () => openPaper5('contratar', 'recepcao') }, t(l('candidatos na recepção ▸', 'candidates at reception ▸'))))),
      deleg31View(s));
  },
}, ['chefe']);

// ================================================================ apoio para testes e capturas

/** Estado de exibição (capturas e testes). */
export const _el5 = { BOARD5, FICH5, draw };
