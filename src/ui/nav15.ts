// Rodada 15 — navegação: medição de render, histórico (hash + voltar/avançar do navegador), migalhas,
// paleta Ctrl+K com busca de áreas/artistas/selos/pessoas, painel de atalhos (?), gaveta no celular,
// rolagem lembrada por área e autosave fora do quadro do clique.

import { l, type L } from '../data/world';
import { t } from '../i18n/strings';
import { modal } from './common';
import { h } from './dom';
import { buildHash, crumbs15, pageTitle15, parseHash, rank15, ScrollMemo15, shortcutRows15, type Route15 } from './navcore15';
import { ic } from './vis';
import './nav15.css';

/** Últimos tempos (ms) por etiqueta, lidos por testes de desempenho no navegador (window.__perf15). */
export const PERF15: Record<string, number[]> = {};
export function perfNote(k: string, ms: number): void {
  const a = (PERF15[k] ??= []); a.push(ms); if (a.length > 50) a.shift();
  if (typeof window !== 'undefined') (window as unknown as { __perf15: typeof PERF15 }).__perf15 = PERF15;
}

/** Autosave depois que o quadro foi pintado (o clique responde antes); várias chamadas seguidas viram uma. */
let saveQ = false;
export function saveSoon(fn: () => void): void {
  if (saveQ) return;
  saveQ = true;
  const run = () => { saveQ = false; fn(); };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(run, 30));
  else setTimeout(run, 0);
}

// ---------- histórico ----------
let fromPop = false;
let depth = 0;
let started = false;
let onRoute: ((r: Route15) => boolean) | null = null;

/** Liga voltar/avançar do navegador às áreas. `apply` devolve false se a rota não existe (área futura, etc.). */
export function initRouter15(apply: (r: Route15) => boolean): void {
  onRoute = apply;
  const go = () => { const r = parseHash(location.hash); if (!r || !onRoute) return; fromPop = true; if (!onRoute(r)) fromPop = false; };
  window.addEventListener('popstate', () => { depth = Math.max(0, depth - 1); go(); });
  window.addEventListener('hashchange', go);
}
export const initialRoute15 = (): Route15 | null => (typeof location !== 'undefined' ? parseHash(location.hash) : null);

/** Chamado após cada render: grava a rota (nova entrada só quando área/aba mudou). */
export function syncRoute15(r: Route15, title: string): void {
  document.title = title;
  const hash = buildHash(r);
  if (location.hash === hash) { fromPop = false; started = true; return; }
  try {
    if (!started || fromPop) history.replaceState(null, '', hash);
    else { history.pushState(null, '', hash); depth++; }
  } catch { /* file:// restrito: segue sem histórico */ }
  started = true;
  fromPop = false;
}
export const canBack15 = (): boolean => depth > 0;
export const resetRouter15 = (): void => { started = false; depth = 0; };

// ---------- rolagem ----------
export const scroll15 = new ScrollMemo15();

// ---------- abas lembradas entre sessões ----------
const TKEY = 'vtn15.tabs';
export function loadTabs15(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(TKEY) ?? '{}') as Record<string, string>; } catch { return {}; }
}
let tabsLast = '';
export function saveTabs15(m: Record<string, string>): void {
  const j = JSON.stringify(m);
  if (j === tabsLast) return;
  tabsLast = j;
  try { localStorage.setItem(TKEY, j); } catch { /* sem armazenamento */ }
}

// ---------- barra: voltar + migalhas ----------
export interface Crumb { label: string; go?: () => void }
export function crumbBar15(parts: Crumb[], extra?: HTMLElement | null): HTMLElement {
  const labels = crumbs15(parts.map((p) => p.label));
  const items = labels.map((lb) => parts.find((p) => p.label === lb)!);
  return h('div', { class: 'bar15' },
    h('div', { class: 'crumbs15' },
      h('button', { class: 'icon back15', disabled: !canBack15(), title: t(l('Voltar (Alt+←)', 'Back (Alt+←)')), 'aria-label': t(l('Voltar', 'Back')), onclick: () => history.back() }, '←'),
      h('nav', { 'aria-label': t(l('Você está em', 'You are here')) }, h('ol', null, items.map((c, i) => h('li', null,
        i === items.length - 1 ? h('b', { 'aria-current': 'page' }, c.label) : c.go ? h('button', { class: 'link', onclick: c.go }, c.label) : h('span', null, c.label))))),
      h('button', { class: 'btn small ghost find15', title: 'Ctrl+K', onclick: () => document.dispatchEvent(new CustomEvent('vtn15-palette')) }, '⌕ ', h('span', { class: 'lbl' }, t(l('Ir para…', 'Go to…'))), h('kbd', null, 'Ctrl K'))),
    extra ?? null);
}

/** Cola a barra (migalhas + sub-áreas) e as abas do hub no topo ao rolar. */
let barH = -1;
export function stickyFix15(main: HTMLElement): void {
  const bar = main.querySelector<HTMLElement>(':scope > .bar15');
  const v = bar ? bar.offsetHeight : 0;
  // só escreve quando muda: trocar a variável invalida o estilo de toda a página
  if (v !== barH) { barH = v; document.documentElement.style.setProperty('--bar15h', `${v}px`); }
}

// ---------- painel de atalhos ----------
export function shortcutsHelp15(areas: { key: string; label: string }[]): void {
  const rows = shortcutRows15(areas);
  const G: [string, L][] = [
    ['Ctrl K', l('Ir para… (áreas, artistas, selos, pessoas, ações)', 'Go to… (areas, artists, labels, people, actions)')],
    ['/', l('Também abre a busca', 'Also opens search')],
    ['Ctrl Enter', l('Avançar um mês', 'Advance one month')],
    ['Alt ← / Alt →', l('Voltar / avançar entre telas (também os botões do navegador)', 'Back / forward between screens (browser buttons too)')],
    ['?', l('Este painel', 'This panel')],
    ['Esc', l('Fecha janelas', 'Closes dialogs')],
  ];
  modal(t(l('Atalhos de teclado', 'Keyboard shortcuts')), h('div', { class: 'keys15' },
    h('h4', null, t(l('Gerais', 'General'))),
    h('dl', null, G.map(([k, d]) => [h('dt', null, h('kbd', null, k)), h('dd', null, t(d))])),
    h('h4', null, t(l('Áreas', 'Areas'))),
    h('dl', { class: 'cols15' }, rows.map((r) => [h('dt', null, h('kbd', null, r.key)), h('dd', null, r.label)]))), { wide: true });
}

// ---------- paleta ----------
export interface PCmd { label: string; kind: string; hint?: string; icon?: string; weight?: number; run: () => void }
const KIND: Record<string, L> = { area: l('Área', 'Area'), act: l('Artista', 'Artist'), mine: l('Seu artista', 'Your artist'), label: l('Selo', 'Label'), person: l('Pessoa', 'Person'), action: l('Ação', 'Action'), recent: l('Recente', 'Recent') };
export function palette15(base: PCmd[], search: (q: string) => PCmd[]): void {
  const list = h('ul', { class: 'palette-list p15', role: 'listbox' });
  let sel = 0;
  let shown: PCmd[] = [];
  let close = () => {};
  let timer = 0;
  const pick = (c: PCmd) => { close(); c.run(); };
  const paint = () => {
    list.replaceChildren(...shown.map((c, i) => h('li', { role: 'option', 'aria-selected': i === sel ? 'true' : 'false', class: i === sel ? 'on' : '' },
      h('button', { class: 'p15-item', onclick: () => pick(c), onmousemove: () => { if (sel !== i) { sel = i; paint(); } } },
        c.icon ? ic(c.icon) : null, h('span', { class: 'p15-lbl' }, c.label), c.hint ? h('small', { class: 'muted' }, c.hint) : null, h('span', { class: 'pill p15-kind' }, t(KIND[c.kind] ?? l(c.kind, c.kind)))))));
    list.querySelector('li.on')?.scrollIntoView?.({ block: 'nearest' });
  };
  const fill = () => {
    const q = input.value;
    shown = rank15([...base, ...(q.trim().length >= 2 ? search(q) : [])], q, q.trim() ? 14 : 12);
    sel = 0;
    paint();
  };
  const input = h('input', { type: 'search', class: 'p15-input', placeholder: t(l('Área, artista, selo, pessoa ou ação…', 'Area, artist, label, person or action…')), 'aria-label': t(l('Buscar', 'Search')),
    oninput: () => { clearTimeout(timer); timer = window.setTimeout(fill, 90); },
    onkeydown: (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!shown.length) return; sel = (sel + (e.key === 'ArrowDown' ? 1 : shown.length - 1)) % shown.length; paint(); }
      else if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); if (timer) fill(); timer = 0; const c = shown[sel]; if (c) pick(c); }
    } }) as HTMLInputElement;
  fill();
  close = modal(t(l('Ir para…', 'Go to…')), h('div', { class: 'p15' }, input, list, h('p', { class: 'muted small' }, t(l('↑↓ escolhe · Enter abre · Esc fecha · digite 2+ letras para buscar pessoas e artistas', '↑↓ pick · Enter opens · Esc closes · type 2+ letters to search people and artists')))));
  input.focus();
}

// ---------- gaveta (celular) ----------
export interface DrawerGroup { label: string; icon: string; on: boolean; items: { label: string; icon: string; on: boolean; badge?: number; key: string; go: () => void }[] }
export function drawer15(groups: DrawerGroup[]): void {
  let close = () => {};
  const body = h('div', { class: 'drawer15-body' }, groups.map((g) => h('details', { class: 'drawer15-g', open: g.on || undefined },
    h('summary', null, ic(g.icon), ' ', g.label, g.items.some((x) => x.badge) ? h('span', { class: 'badge' }, g.items.reduce((a, x) => a + (x.badge ?? 0), 0)) : null),
    h('div', { class: 'drawer15-items' }, g.items.map((x) => h('button', { class: x.on ? 'on' : '', 'aria-current': x.on ? 'page' : undefined, onclick: () => { close(); x.go(); } },
      ic(x.icon), h('span', null, x.label), x.badge ? h('span', { class: 'badge' }, x.badge) : null, h('kbd', null, x.key.toUpperCase())))))));
  close = modal(t(l('Menu', 'Menu')), body);
  document.body.lastElementChild?.classList.add('drawer15');
}

export const menuButton15 = (open: () => void): HTMLElement =>
  h('button', { class: 'icon menu15', 'aria-label': t(l('Abrir menu', 'Open menu')), title: t(l('Menu completo', 'Full menu')), onclick: open }, '☰');

export { pageTitle15 };
