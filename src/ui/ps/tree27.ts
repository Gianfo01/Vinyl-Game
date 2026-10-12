// Rodada 27 — menu em árvore: Seção › Página › Aba (› aba interna). Tudo visível, nada escondido em "Mais".
// Cada seção e cada página abre e fecha; o que está aberto é lembrado neste navegador (conveniência por pessoa,
// nunca estado do jogo). A página e a aba abertas ficam destacadas. No celular, a barra inferior mostra as
// 6 seções e um toque abre uma folha com as páginas e abas da seção.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { h } from '../dom';
import { ic } from '../vis';
import type { NavGroup25 } from './nav25';
import { tabTree27, type TabDef27, type TabNode27 } from './subtabs27';
import './nav27.css';

export interface TreeItem27 { id: string; label: string; icon: string; badge?: number }
export interface TreeCtx27 {
  groups: NavGroup25[];
  item: (id: string) => TreeItem27 | undefined;
  /** página aberta e a seção dela */
  area: string; section: string;
  /** abas abertas agora na página (chave da faixa → id), lidas do painel desenhado */
  live: Map<string, string>;
  /** todas as abas conhecidas (registro + vistas) */
  tabs: TabDef27[];
  go: (id: string) => void;
  goTab: (area: string, path: [string, string][]) => void;
  /** casa da seção */
  home: (g: NavGroup25) => string;
  search: () => void;
}

// ---------------------------------------------------------------- aberto/fechado (por pessoa)
const KEY = 'vtn27.tree';
interface Fold27 { s: Record<string, 0 | 1>; p: Record<string, 0 | 1> }
const fold: Fold27 = (() => { try { const x = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Fold27>; return { s: x.s ?? {}, p: x.p ?? {} }; } catch { return { s: {}, p: {} }; } })();
const saveFold = (): void => { try { localStorage.setItem(KEY, JSON.stringify(fold)); } catch { /* sem armazenamento */ } };
/** Seção aberta: a atual abre sozinha (a menos que a pessoa a tenha fechado); as outras só se a pessoa abriu. */
export const secOpen27 = (id: string, cur: string): boolean => (fold.s[id] ?? (id === cur ? 1 : 0)) === 1;
/** Página com abas à mostra: a atual abre sozinha; as outras só se a pessoa abriu. */
export const pageOpen27 = (area: string, cur: string): boolean => (fold.p[area] ?? (area === cur ? 1 : 0)) === 1;

const mobile = (): boolean => typeof matchMedia !== 'undefined' && matchMedia('(max-width: 860px)').matches;

/** A aba está aberta agora? (página atual, a faixa mostra essa aba e as abas-mãe também estão abertas) */
function isOn(ctx: TreeCtx27, n: TabDef27): boolean {
  if (n.area !== ctx.area) return false;
  return [...n.trail, [n.key, n.id] as [string, string]].every(([k, v]) => ctx.live.get(k) === v);
}

function tabList(ctx: TreeCtx27, nodes: TabNode27[], depth: number): HTMLElement {
  return h('ul', { class: `tree27-tabs d${depth}`, role: 'group' }, nodes.map((n) => {
    const on = isOn(ctx, n);
    return h('li', null,
      h('button', { type: 'button', class: `tree27-tab ${on ? 'on' : ''}`, 'aria-current': on ? 'true' : undefined, title: t(n.label),
        onclick: () => ctx.goTab(n.area, [...n.trail, [n.key, n.id]]) }, h('span', { class: 'lbl' }, t(n.label))),
      n.kids.length ? tabList(ctx, n.kids, depth + 1) : null);
  }));
}

function caret(open: boolean, label: string, toggle: (el: HTMLElement) => void): HTMLElement {
  const b: HTMLElement = h('button', { type: 'button', class: 'tree27-caret', 'aria-expanded': open ? 'true' : 'false', 'aria-label': label, title: label,
    onclick: (e: Event) => { e.stopPropagation(); toggle(b); } }, h('span', { 'aria-hidden': 'true' }, '▸'));
  return b;
}

function pageNode(ctx: TreeCtx27, it: TreeItem27): HTMLElement {
  const kids = tabTree27(it.id, ctx.tabs);
  const here = it.id === ctx.area;
  const open = kids.length > 0 && pageOpen27(it.id, ctx.area);
  const li: HTMLElement = h('li', { class: `tree27-page ${open ? 'exp27' : ''} ${here ? 'here' : ''}`, 'data-area': it.id },
    h('div', { class: 'tree27-row' },
      h('button', { type: 'button', class: `tree27-pg ${here ? 'on' : ''}`, 'aria-current': here ? 'page' : undefined, title: it.label, onclick: () => ctx.go(it.id) },
        h('span', { class: 'ic', 'aria-hidden': 'true' }, ic(it.icon)), h('span', { class: 'lbl' }, it.label), it.badge ? h('span', { class: 'badge' }, it.badge) : null),
      kids.length ? caret(open, t(l(`Abas de ${it.label}`, `${it.label} tabs`)), (b) => {
        const now = !li.classList.contains('exp27');
        li.classList.toggle('exp27', now); b.setAttribute('aria-expanded', now ? 'true' : 'false');
        fold.p[it.id] = now ? 1 : 0; saveFold();
      }) : null),
    kids.length ? tabList(ctx, kids, 1) : null);
  return li;
}

/** Os grupos de páginas da seção (temas), com os itens que existem agora. */
function themes(ctx: TreeCtx27, gr: NavGroup25): { label: L; items: TreeItem27[] }[] {
  return (gr.sections ?? [{ label: gr.label, areas: gr.areas }]).map((sc) => ({ label: sc.label, items: sc.areas.map(ctx.item).filter((x): x is TreeItem27 => !!x) })).filter((x) => x.items.length);
}

/** Uma seção do menu: cabeçalho (vai para a casa da seção) + seta (abre/fecha) + páginas por tema, com abas. */
export function navSection27(ctx: TreeCtx27, gr: NavGroup25): HTMLElement {
  const here = gr.id === ctx.section;
  const open = secOpen27(gr.id, ctx.section);
  const ths = themes(ctx, gr);
  const badge = ths.reduce((a, x) => a + x.items.reduce((b, y) => b + (y.badge ?? 0), 0), 0);
  const box: HTMLElement = h('div', { class: `nav-group tree27-sec ${here ? 'open' : ''} ${open ? 'exp27' : ''}`, 'data-sec25': gr.id });
  const head = h('button', { type: 'button', class: `nav-head ${here ? 'on' : ''}`, 'aria-current': here ? 'true' : undefined, title: t(gr.label),
    'aria-haspopup': 'dialog',
    onclick: () => {
      if (mobile()) { openSheet27(ctx, gr); return; }
      // abre a seção (e lembra) e vai para a casa dela
      fold.s[gr.id] = 1; saveFold();
      ctx.go(ctx.home(gr));
    } },
    h('span', { class: 'ic', 'aria-hidden': 'true' }, ic(gr.icon, 2)), h('span', { class: 'lbl' }, t(gr.label)), badge ? h('span', { class: 'badge' }, badge) : null);
  const body = h('ul', { class: 'tree27-pages', role: 'group', 'aria-label': t(gr.label) },
    ths.flatMap((th) => [
      ths.length > 1 ? h('li', { class: 'tree27-theme', 'aria-hidden': 'true' }, t(th.label)) : null,
      ...th.items.map((it) => pageNode(ctx, it)),
    ]));
  box.append(h('div', { class: 'tree27-head' }, head,
    caret(open, t(l(`Páginas de ${t(gr.label)}`, `${t(gr.label)} pages`)), (b) => {
      const now = !box.classList.contains('exp27');
      box.classList.toggle('exp27', now); b.setAttribute('aria-expanded', now ? 'true' : 'false');
      fold.s[gr.id] = now ? 1 : 0; saveFold();
    })), body);
  return box;
}

// ---------------------------------------------------------------- folha do celular
let sheet: HTMLElement | null = null, sheetSec = '';
export function closeSheet27(): void {
  sheet?.remove(); sheet = null; sheetSec = '';
  document.removeEventListener('keydown', sheetKey, true);
}
const sheetKey = (e: KeyboardEvent): void => { if (e.key === 'Escape' && sheet) { e.stopPropagation(); closeSheet27(); } };

function sheetTabs(ctx: TreeCtx27, nodes: TabNode27[], depth: number): HTMLElement[] {
  return nodes.flatMap((n) => {
    const on = isOn(ctx, n);
    return [h('button', { type: 'button', class: `sheet27-tab d${depth} ${on ? 'on' : ''}`, 'aria-current': on ? 'true' : undefined,
      onclick: () => { closeSheet27(); ctx.goTab(n.area, [...n.trail, [n.key, n.id]]); } }, depth > 1 ? h('span', { class: 'sheet27-sub', 'aria-hidden': 'true' }, '›') : null, t(n.label)),
    ...sheetTabs(ctx, n.kids, depth + 1)];
  });
}

/** Folha (celular): as páginas da seção, cada uma com as suas abas. */
export function openSheet27(ctx: TreeCtx27, gr: NavGroup25): void {
  const again = sheet && sheetSec === gr.id;
  closeSheet27();
  if (again) return; // tocar de novo na mesma seção fecha a folha
  const ths = themes(ctx, gr);
  const panel = h('div', { class: 'sheet27', role: 'dialog', 'aria-modal': 'true', 'aria-label': t(gr.label) },
    h('div', { class: 'sheet27-head' },
      h('span', { class: 'ic', 'aria-hidden': 'true' }, ic(gr.icon, 2)), h('b', null, t(gr.label)),
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => { closeSheet27(); ctx.search(); } }, '⌕ ', t(l('Buscar', 'Search'))),
      h('button', { type: 'button', class: 'icon sheet27-x', 'aria-label': t(l('Fechar', 'Close')), title: t(l('Fechar', 'Close')), onclick: closeSheet27 }, '×')),
    h('div', { class: 'sheet27-body' }, ths.map((th) => h('section', { class: 'sheet27-theme' },
      ths.length > 1 ? h('h4', null, t(th.label)) : null,
      th.items.map((it) => {
        const here = it.id === ctx.area;
        const kids = tabTree27(it.id, ctx.tabs);
        return h('div', { class: `sheet27-page ${here ? 'here' : ''}` },
          h('button', { type: 'button', class: `sheet27-pg ${here ? 'on' : ''}`, 'aria-current': here ? 'page' : undefined, onclick: () => { closeSheet27(); ctx.go(it.id); } },
            h('span', { class: 'ic', 'aria-hidden': 'true' }, ic(it.icon)), h('span', { class: 'lbl' }, it.label), it.badge ? h('span', { class: 'badge' }, it.badge) : null),
          kids.length ? h('div', { class: 'sheet27-tabs' }, sheetTabs(ctx, kids, 1)) : null);
      })))));
  sheetSec = gr.id;
  sheet = h('div', { class: 'sheet27-wrap' }, h('div', { class: 'sheet27-back', onclick: closeSheet27 }), panel);
  document.body.append(sheet);
  document.addEventListener('keydown', sheetKey, true);
  // a página atual à vista; o foco vai para o primeiro botão
  setTimeout(() => { (panel.querySelector('.sheet27-pg.on') ?? panel.querySelector('.sheet27-pg'))?.scrollIntoView?.({ block: 'nearest' }); panel.querySelector<HTMLElement>('.sheet27-x')?.focus(); }, 0);
}
