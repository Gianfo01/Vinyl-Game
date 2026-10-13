// Rodada 29 (WIKI) — interface da wiki (carregada sob demanda por wiki29open.ts). Utilidade GLOBAL, não macromenu:
// abre por cima da tela atual (mesmo padrão do Índice e da Central da campanha), com busca, migalhas, voltar/avançar,
// links cruzados, caixas "Na sua partida" e o botão "Revelar história real" (desligado por padrão, só nesta sessão).
// Listas longas (a base "enorme" tem milhares de pessoas) são virtualizadas; as páginas são montadas só quando abertas.
// Arte: só a pixel art procedural que já existe (retratos com visual famoso, logos, brasões, selos, relíquias…).

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { logoUrl } from '../art';
import { modal } from '../common';
import { h } from '../dom';
import { portraitDataUrl } from '../pixel/avatar';
import { awardSealImg29, genreBadgeImg29, movementBadgeImg29 } from '../pixel/badge29';
import { emblemImg28, orgEmblemKind28 } from '../pixel/emblem28';
import { cityCrestImg29, flagImg29, skylineThumbImg29 } from '../pixel/geo29';
import { bandPhotoImg29, staffPortraitImg29, staffRoleOf29 } from '../pixel/people29';
import { relicImg28 } from '../pixel/relic28';
import { gearImg29, merchImg29, vehicleImg29 } from '../pixel/things29';
import { outletArt29, venueArt29 } from '../art29ui';
import { ic } from '../vis';
import { label29 } from '../ps/route29';
import { MECH29, EDGES29W, page29, search29, title29, sub29 } from './wiki29model';
import { SECS29W, T, hashOf29, idOfHash29, kindOf29, restOf29, secOf29W, type W29 } from './wiki29core';
import { WIKI29 } from './wiki29open';
import type { Art29W, Block29, Inline29, Page29 } from './wiki29types';
import './wiki29.css';

// ---------------------------------------------------------------- estado da janela (só desta sessão; nada no save)

interface St { id: string; back: string[]; fwd: string[]; reveal: boolean; q: string; prevHash: string; root: HTMLElement | null; body: HTMLElement | null; input: HTMLInputElement | null; close: () => void }
const st: St = { id: 'home', back: [], fwd: [], reveal: false, q: '', prevHash: '', root: null, body: null, input: null, close: () => {} };
const ctx = (): W29 => ({ s: WIKI29.api.game(), reveal: st.reveal });

/** Abre (ou navega, se já aberta). Aceita id ("mech:money") ou hash ("#/wiki/mech/money"). */
export function showWiki29(idOrHash = 'home', q = ''): void {
  const id = idOrHash.startsWith('#') ? idOfHash29(idOrHash) ?? 'home' : idOrHash || 'home';
  if (st.root?.isConnected) { if (q) setQuery(q); else go(id); return; }
  st.back = []; st.fwd = []; st.id = id; st.q = q;
  st.prevHash = typeof location !== 'undefined' && !/^#\/wiki/.test(location.hash) ? location.hash : '';
  const input = h('input', { type: 'search', class: 'wk29-q', placeholder: T('Buscar na wiki (pessoas, sistemas, cidades…)', 'Search the wiki (people, systems, cities…)'), 'aria-label': T('Buscar na wiki', 'Search the wiki'), value: q }) as HTMLInputElement;
  input.addEventListener('input', () => { st.q = input.value; draw(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const b = st.body?.querySelector<HTMLButtonElement>('.wk29-hit'); b?.click(); } });
  const body = h('div', { class: 'wk29-body', tabindex: '-1' });
  const root = h('div', { class: 'wk29' }, h('div', { class: 'wk29-bar' }, h('div', { class: 'wk29-nav' }), input, h('label', { class: 'wk29-rev', title: T('Mostra fatos reais posteriores ao ano da partida. Só nesta sessão; não muda a partida.', 'Shows real facts after the run\'s year. This session only; does not change the run.') },
    h('input', { type: 'checkbox', checked: st.reveal, onchange: (e: Event) => { st.reveal = (e.target as HTMLInputElement).checked; draw(); } }), ' ', T('Revelar história real', 'Reveal real history'))),
  h('nav', { class: 'wk29-tabs', 'aria-label': T('Seções da wiki', 'Wiki sections') }), body);
  st.root = root; st.body = body; st.input = input;
  st.close = modal(T('Wiki', 'Wiki'), root, { wide: true, onClose: () => { st.root = null; restoreHash(); } });
  root.closest('.modal')?.classList.add('wk29-modal');
  draw();
  setTimeout(() => input.focus(), 30);
}

function restoreHash(): void {
  try { history.replaceState(null, '', st.prevHash || location.pathname + location.search); } catch { /* file:// */ }
}
function syncHash(): void {
  try { history.replaceState(null, '', hashOf29(st.id)); } catch { /* file:// */ }
}

function go(id: string): void {
  if (id === st.id && !st.q) return;
  st.back.push(st.id); if (st.back.length > 60) st.back.shift();
  st.fwd = [];
  st.id = id; st.q = '';
  if (st.input) st.input.value = '';
  draw();
}
function setQuery(q: string): void { st.q = q; if (st.input) st.input.value = q; draw(); }
const goBack = () => { const x = st.back.pop(); if (x === undefined) return; st.fwd.push(st.id); st.id = x; st.q = ''; if (st.input) st.input.value = ''; draw(); };
const goFwd = () => { const x = st.fwd.pop(); if (x === undefined) return; st.back.push(st.id); st.id = x; st.q = ''; if (st.input) st.input.value = ''; draw(); };

// ---------------------------------------------------------------- desenho

function draw(): void {
  const root = st.root, body = st.body;
  if (!root || !body) return;
  const c = ctx();
  const nav = root.querySelector('.wk29-nav')!;
  nav.replaceChildren(
    h('button', { type: 'button', class: 'wk29-nb', disabled: !st.back.length, title: T('Voltar', 'Back'), 'aria-label': T('Voltar', 'Back'), onclick: goBack }, '◀'),
    h('button', { type: 'button', class: 'wk29-nb', disabled: !st.fwd.length, title: T('Avançar', 'Forward'), 'aria-label': T('Avançar', 'Forward'), onclick: goFwd }, '▶'));
  const sec = secOf29W(st.id);
  root.querySelector('.wk29-tabs')!.replaceChildren(...SECS29W.map((x) => h('button', { type: 'button', class: `wk29-tab${x.id === sec && !st.q ? ' on' : ''}`, 'aria-current': x.id === sec && !st.q ? 'page' : undefined,
    onclick: () => go(x.id === 'home' ? 'home' : `idx:${x.id}`) }, h('span', { class: 'wk29-tic', 'aria-hidden': 'true' }, ic(x.icon)), h('span', null, t(x.label)))));
  body.replaceChildren();
  if (st.q.trim().length >= 2) { body.append(results(c)); return; }
  let p: Page29 | null = null;
  try { p = page29(c, st.id); } catch (e) { console.error('wiki29', e); }
  if (!p) p = { id: st.id, title: T('Página não encontrada', 'Page not found'), kind: '', crumbs: [{ id: 'home', label: T('Início', 'Home') }], blocks: [{ k: 'p', x: [T('Este artigo não existe nesta partida. Use a busca acima.', 'This article does not exist in this run. Use the search above.')] }] };
  syncHash();
  body.append(pageEl(p));
  body.scrollTop = 0;
}

function results(c: W29): HTMLElement {
  const gs = search29(c, st.q);
  if (!gs.length) return h('p', { class: 'muted' }, T('Nada encontrado. Tente outra palavra (a busca ignora acentos).', 'Nothing found. Try another word (search ignores accents).'));
  return h('div', { class: 'wk29-res' }, gs.map((g) => h('section', { class: 'wk29-rg' }, h('h3', null, g.label, g.more ? h('small', { class: 'muted' }, ` +${g.more}`) : null),
    h('ul', null, g.items.map((x) => h('li', null, h('button', { type: 'button', class: 'link wk29-hit', onclick: () => go(x.id) }, thumb(x.id), h('span', null, h('b', null, x.label), x.sub ? h('small', { class: 'muted' }, ` ${x.sub}`) : null))))))));
}

function pageEl(p: Page29): HTMLElement {
  const crumbs = p.crumbs.length ? h('nav', { class: 'wk29-crumbs', 'aria-label': T('Migalhas', 'Breadcrumbs') }, p.crumbs.flatMap((x, i) => [i ? h('span', { 'aria-hidden': 'true' }, ' › ') : null, link(x.id, x.label)])) : null;
  return h('article', { class: 'wk29-page' }, crumbs,
    h('div', { class: 'wk29-head' }, p.art ? h('div', { class: `wk29-art wk29-art-${p.art.k}` }, art(p.art, 96)) : null,
      h('div', null, p.kind ? h('p', { class: 'wk29-kind' }, p.kind) : null, h('h2', null, p.title))),
    ...p.blocks.map(block));
}

const inl = (xs: Inline29[]): (Node | string)[] => xs.map((x) => (typeof x === 'string' ? x : link(x.link, x.text)));
function link(id: string, text: string): HTMLElement {
  return h('a', { href: hashOf29(id), class: 'wk29-a', onclick: (e: Event) => { e.preventDefault(); go(id); } }, text);
}

function block(b: Block29): HTMLElement {
  switch (b.k) {
    case 'h': return h('h3', { class: 'wk29-h' }, b.t);
    case 'p': return h('p', null, ...inl(b.x));
    case 'ul': return h('ul', { class: 'wk29-ul' }, b.items.map((x) => h('li', null, ...inl(x))));
    case 'kv': return h('dl', { class: 'wk29-kv' }, b.rows.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, ...inl(v))]));
    case 'live': return h('section', { class: 'wk29-live', 'aria-label': T('Na sua partida', 'In your run') }, h('h3', null, '● ', T('Na sua partida', 'In your run')),
      h('dl', { class: 'wk29-kv' }, b.rows.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, ...inl(v))])));
    case 'note': return h('div', { class: `wk29-note hue-${b.hue}`, role: 'note' }, h('b', null, b.t), h('p', null, ...inl(b.x)));
    case 'arts': return h('div', { class: 'wk29-arts' }, b.items.map((x) => h('figure', null, x.link ? h('a', { href: hashOf29(x.link), onclick: (e: Event) => { e.preventDefault(); go(x.link!); } }, art(x.art, 64)) : art(x.art, 64), h('figcaption', null, x.cap))));
    case 'list': return vlist(b.ids);
    case 'pages': return pagesEl(b.ids);
    case 'spoiler': return h('div', { class: 'wk29-spoil', role: 'note' }, h('span', null, '🔒 ', b.n === 1 ? T('1 fato da história real está escondido (depois do ano da partida).', '1 real-history fact is hidden (after the run\'s year).') : t(l('{n} fatos da história real estão escondidos (depois do ano da partida).', '{n} real-history facts are hidden (after the run\'s year).'), { n: b.n })),
      h('button', { type: 'button', class: 'btn small', onclick: () => { st.reveal = true; const cb = st.root?.querySelector<HTMLInputElement>('.wk29-rev input'); if (cb) cb.checked = true; draw(); } }, T('Revelar história real', 'Reveal real history')));
    case 'diagram': return diagram();
    default: return h('span');
  }
}

/** Botões para as páginas do jogo que controlam o sistema (fecham a wiki e abrem a página pelo caminho do menu). */
function pagesEl(ids: string[]): HTMLElement {
  const open = WIKI29.api.open;
  const has = !!WIKI29.api.game() && !!open;
  return h('div', { class: 'wk29-pages' }, ids.map((a) => h('button', { type: 'button', class: 'chip27', disabled: !has, title: has ? T('Abrir no jogo', 'Open in game') : T('Comece uma partida para abrir as páginas do jogo.', 'Start a run to open game pages.'),
    onclick: () => { st.close(); open?.({ area: a }); } }, '↗ ', has ? label29(a) : a)));
}

// ---------------------------------------------------------------- lista virtualizada

const ROW = 44;
function vlist(ids: string[]): HTMLElement {
  const c = ctx();
  const filt = h('input', { type: 'search', class: 'wk29-lf', placeholder: T('Filtrar esta lista…', 'Filter this list…'), 'aria-label': T('Filtrar esta lista', 'Filter this list') }) as HTMLInputElement;
  const view = h('div', { class: 'wk29-vl', role: 'list' });
  const pad = h('div', { class: 'wk29-vpad' });
  view.append(pad);
  const count = h('p', { class: 'small muted' });
  let cur = ids;
  const titles = new Map<string, string>();
  const tl = (id: string) => { let x = titles.get(id); if (x === undefined) { x = title29(c, id); titles.set(id, x); } return x; };
  const fold = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const paint = () => {
    const top = view.scrollTop, hgt = view.clientHeight || 520;
    const a = Math.max(0, Math.floor(top / ROW) - 6), z = Math.min(cur.length, Math.ceil((top + hgt) / ROW) + 6);
    pad.style.height = `${cur.length * ROW}px`;
    pad.replaceChildren(...cur.slice(a, z).map((id, i) => h('button', { type: 'button', role: 'listitem', class: 'wk29-row', style: `top:${(a + i) * ROW}px`, onclick: () => go(id) }, thumb(id), h('span', { class: 'wk29-rt' }, h('b', null, tl(id)), h('small', { class: 'muted' }, sub29(c, id))))));
  };
  filt.addEventListener('input', () => { const f = fold(filt.value.trim()); cur = f ? ids.filter((id) => fold(tl(id)).includes(f)) : ids; count.textContent = `${cur.length.toLocaleString()} / ${ids.length.toLocaleString()}`; view.scrollTop = 0; paint(); });
  view.addEventListener('scroll', () => requestAnimationFrame(paint), { passive: true });
  count.textContent = ids.length.toLocaleString();
  requestAnimationFrame(paint);
  setTimeout(paint, 0);
  return h('div', { class: 'wk29-list' }, ids.length > 12 ? filt : null, count, view);
}

// ---------------------------------------------------------------- arte (pixel art procedural que já existe)

function thumb(id: string): HTMLElement {
  const k = kindOf29(id), r = restOf29(id);
  const s = WIKI29.api.game();
  const box = (x: Node) => h('span', { class: 'wk29-th', 'aria-hidden': 'true' }, x);
  try {
    if (k === 'person' && s?.persons[r]) { const p = s.persons[r]; return box(img(portraitDataUrl(p, 32, s.year), 28)); }
    if (k === 'act' && s?.acts[r]) { const a = s.acts[r]; return box(img(logoUrl(a.logoSeed, a.name, a.genre, a.formed, 32), 28)); }
    if (k === 'city') return box(cityCrestImg29(r, 28));
    if (k === 'genre') return box(genreBadgeImg29(r, 28));
    if (k === 'country') return box(flagImg29(r, 28));
    if (k === 'mech') { const m = MECH29.find((x) => x.id === r); return box(ic(m?.icon ?? 'book', 1)); }
  } catch { /* sem arte */ }
  return box(ic(k === 'rp' || k === 'person' ? 'star' : k === 'ract' || k === 'act' ? 'guitar' : k === 'relic' ? 'diamond' : k === 'glossario' ? 'quill' : k === 'faq' ? 'bulb' : k === 'label' ? 'building' : 'book', 1));
}
const img = (src: string, size: number) => h('img', { class: 'px', src, width: size, height: size, alt: '' });

function art(a: Art29W, size: number): HTMLElement {
  try {
    switch (a.k) {
      case 'portrait': return img(portraitDataUrl({ id: a.id, look: a.look, born: a.born, role: a.role as never }, 96, a.year), size);
      case 'staff': return sz(staffPortraitImg29({ id: a.id, born: a.born }, staffRoleOf29(a.role), a.year, 96), size);
      case 'band': return sz(bandPhotoImg29(a.ids, a.year, a.seed, 160), size * 1.6);
      case 'logo': return img(logoUrl(a.seed, a.name, a.genre, a.year, 96), size);
      case 'crest': return sz(cityCrestImg29(a.city, 48), size);
      case 'skyline': return sz(skylineThumbImg29(a.city, a.year, 192), size * 2);
      case 'flag': return sz(flagImg29(a.a3, 48), size);
      case 'genre': return sz(genreBadgeImg29(a.id, 48), size);
      case 'movement': return sz(movementBadgeImg29(a.id, a.genre, a.year, 48), size);
      case 'relic': return sz(relicImg28(a.kind, a.name, a.year, a.seed, 64), size);
      case 'gear': return sz(gearImg29(a.id, a.name, 48), size);
      case 'merch': return sz(merchImg29(a.sku, a.seed, a.act, a.genre, a.year, 48), size);
      case 'vehicle': return sz(vehicleImg29(a.move, a.year, '', 96), size * 1.5);
      case 'emblem': return sz(emblemImg28({ id: a.id, kind: orgEmblemKind28(a.kind), a3: a.a3, name: a.name }, 48), size);
      case 'venue': return sz(venueArt29(a.id, a.name, a.cap, a.year, a.city, 48), size);
      case 'outlet': return outletArt29(a.id, a.name, a.kind, a.year, a.city);
      case 'award': return sz(awardSealImg29(a.id, a.name, a.year, 48), size);
      case 'icon': return h('span', { class: 'wk29-icon' }, ic(a.name, 3));
    }
  } catch { /* arte indisponível */ }
  return h('span', { class: 'wk29-icon' }, ic('book', 3));
}
function sz<E extends HTMLElement>(e: E, size: number): E {
  e.classList.add('px');
  e.style.width = `${Math.round(size)}px`; e.style.height = 'auto';
  return e;
}

// ---------------------------------------------------------------- diagrama de conexões (SVG)

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag: string, at: Record<string, string | number>, text?: string): SVGElement => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(at)) e.setAttribute(k, String(v)); if (text) e.textContent = text; return e; };

function diagram(): HTMLElement {
  const nodes = [...new Set(EDGES29W.flatMap((e) => [e.from, e.to]))];
  const W = 780, Hh = 440, cx = W / 2, cy = Hh / 2, RX = 300, RY = 180;
  const pos = new Map(nodes.map((n, i) => { const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2; return [n, [cx + Math.cos(a) * RX, cy + Math.sin(a) * RY] as [number, number]]; }));
  const root = svg('svg', { viewBox: `0 0 ${W} ${Hh}`, class: 'wk29-dg', role: 'img', 'aria-label': T('Mapa de conexões entre sistemas', 'Map of connections between systems') });
  const defs = svg('defs', {});
  for (const k of ['ok', 'weak', 'fixed', 'intended']) { const m = svg('marker', { id: `wk29ar-${k}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }); m.append(svg('path', { d: 'M0,0 L10,5 L0,10 z', class: `wk29-e-${k}` })); defs.append(m); }
  root.append(defs);
  const pairs = new Map<string, number>();
  for (const e of EDGES29W) {
    const [x1, y1] = pos.get(e.from)!, [x2, y2] = pos.get(e.to)!;
    const key = `${e.from}>${e.to}`; const n = pairs.get(key) ?? 0; pairs.set(key, n + 1);
    const mx = (x1 + x2) / 2 + (y2 - y1) * (0.08 + n * 0.07), my = (y1 + y2) / 2 - (x2 - x1) * (0.08 + n * 0.07);
    const path = svg('path', { d: `M${x1},${y1} Q${mx},${my} ${x2},${y2}`, class: `wk29-e wk29-e-${e.state}`, 'marker-end': `url(#wk29ar-${e.state})` });
    path.append(svg('title', {}, `${e.id}: ${t(e.label)}`));
    root.append(path);
  }
  for (const n of nodes) {
    const [x, y] = pos.get(n)!;
    const g = svg('g', { class: 'wk29-n', tabindex: 0, role: 'link' });
    const name = title29(ctx(), `mech:${n}`);
    g.append(svg('rect', { x: x - 74, y: y - 14, width: 148, height: 28, rx: 4 }), svg('text', { x, y: y + 4, 'text-anchor': 'middle' }, name.length > 23 ? `${name.slice(0, 22)}…` : name));
    g.addEventListener('click', () => go(`mech:${n}`));
    g.addEventListener('keydown', (ev) => { if ((ev as KeyboardEvent).key === 'Enter') go(`mech:${n}`); });
    root.append(g);
  }
  const legend = h('ul', { class: 'wk29-lg' },
    h('li', { class: 'wk29-e-ok' }, T('conectada', 'connected')), h('li', { class: 'wk29-e-fixed' }, T('estava morta, religada na R29', 'was dead, reconnected in R29')),
    h('li', { class: 'wk29-e-weak' }, T('fraca (efeito pequeno)', 'weak (small effect)')), h('li', { class: 'wk29-e-intended' }, T('de propósito (efeito Streisand)', 'on purpose (Streisand effect)')));
  const table = h('table', { class: 'wk29-et' }, h('thead', null, h('tr', null, h('th', null, 'id'), h('th', null, T('de → para', 'from → to')), h('th', null, T('efeito', 'effect')))),
    h('tbody', null, EDGES29W.map((e) => h('tr', { class: `wk29-e-${e.state}` }, h('td', null, e.id), h('td', null, link(`mech:${e.from}`, title29(ctx(), `mech:${e.from}`)), ' → ', link(`mech:${e.to}`, title29(ctx(), `mech:${e.to}`))), h('td', null, t(e.label))))));
  return h('div', { class: 'wk29-dgw' }, root as unknown as HTMLElement, legend, h('details', null, h('summary', null, T('Tabela das arestas medidas', 'Table of measured edges')), table));
}
