// Rodada 18 (U3) — tooltips encadeados (CK3). Qualquer número pode ganhar um "por quê": passe o mouse (ou toque)
// e abre a decomposição; uma parte sublinhada abre o próximo nível ao lado. Três formas de usar:
//
//   why18(s, 'act.hype', { act: id }, String(v))     // embrulha o conteúdo num gatilho
//   whyIcon(s, 'stress', { person: pid })             // ⓘ pequeno ao lado do número
//   h('b', whyAttrs('cash.month'), $(net))            // atributos data-why (delegação global; ctx precisa ser JSON)
//
// Registrar explicações: registerExplain (src/sim/explain18.ts, re-exportado aqui).

import { l, type L } from '../data/world';
import { t } from '../i18n/strings';
import { explain18, type Why18, type WhyCtx, type WhyFmt, type WhyPart } from '../sim/explain18';
import type { GameState } from '../sim/types';
import { $, N } from './common';
import { h } from './dom';
import { store } from './store';
import './sys/core18.css';

export { explain18, hasExplain, registerExplain, type Why18, type WhyCtx, type WhyPart } from '../sim/explain18';

const tx = (x: L | string | undefined): string => (x === undefined ? '' : typeof x === 'string' ? x : t(x));
export function fmtWhy(v: number | string | undefined, fmt: WhyFmt = 'num'): string {
  if (v === undefined) return '';
  if (typeof v === 'string') return v;
  switch (fmt) {
    case 'money': return $(Math.round(v));
    case 'signed': return `${v > 0 ? '+' : v < 0 ? '−' : '±'}${N(Math.abs(Math.round(v * 10) / 10))}`;
    case 'pct': return `${Math.round(v)}%`;
    case 'mult': return `×${(Math.round(v * 100) / 100).toFixed(2)}`;
    case 'text': return String(v);
    default: return N(Math.round(v * 10) / 10);
  }
}

// ---------------------------------------------------------------- pilha de popovers

const stack: HTMLElement[] = [];
let pinned = false;
let closeT: ReturnType<typeof setTimeout> | null = null;
let openT: ReturnType<typeof setTimeout> | null = null;
const cancelClose = () => { if (closeT) clearTimeout(closeT); closeT = null; };
const schedClose = () => { cancelClose(); if (!pinned) closeT = setTimeout(() => closeFrom(0), 280); };
export function closeWhy(): void { pinned = false; closeFrom(0); }
function closeFrom(level: number): void { while (stack.length > level) stack.pop()!.remove(); }

function place(pop: HTMLElement, anchor: DOMRect, side: boolean): void {
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.min(340, vw - 16);
  pop.style.width = `${w}px`;
  let x = side ? anchor.right + 6 : anchor.left;
  if (x + w > vw - 8) x = side ? Math.max(8, anchor.left - w - 6) : Math.max(8, vw - w - 8);
  pop.style.left = `${Math.max(8, x)}px`;
  const ph = pop.offsetHeight || 200;
  let y = side ? anchor.top : anchor.bottom + 6;
  if (y + ph > vh - 8) y = Math.max(8, (side ? anchor.bottom : anchor.top - 6) - ph);
  pop.style.top = `${y}px`;
}

/** Retângulo para o nível seguinte: altura da linha, mas encostado na borda do popover pai (não cobre os valores). */
function subRect(el: HTMLElement): DOMRect {
  const br = el.getBoundingClientRect();
  const pr = (el.closest('.why18-pop') as HTMLElement | null)?.getBoundingClientRect() ?? br;
  return new DOMRect(pr.left, br.top, pr.width, br.height);
}
function partEl(s: GameState, p: WhyPart, level: number): HTMLElement {
  const label = tx(p.label);
  const val = fmtWhy(p.value, p.fmt);
  const sub = p.why;
  const lab = sub
    ? h('button', { type: 'button', class: 'why18-sub', 'aria-haspopup': 'dialog',
        onmouseenter: (e: Event) => { cancelClose(); openWhy(s, sub.key, sub.ctx ?? {}, subRect(e.currentTarget as HTMLElement), level + 1, true); },
        onclick: (e: Event) => { e.stopPropagation(); pinned = true; openWhy(s, sub.key, sub.ctx ?? {}, subRect(e.currentTarget as HTMLElement), level + 1, true, true); } }, label, ' ›')
    : h('span', null, label);
  return h('li', { class: p.tone ?? '' }, lab, h('b', null, val), p.note ? h('small', { class: 'muted' }, tx(p.note)) : null);
}

/** Abre a explicação `key` perto de `rect` no nível `level` (0 = primeiro). Devolve false se não há explicação. */
export function openWhy(s: GameState, key: string, ctx: WhyCtx, rect: DOMRect, level = 0, side = false, focus = false): boolean {
  const w: Why18 | null = explain18(s, key, ctx);
  if (!w) return false;
  closeFrom(level);
  const pop = h('div', { class: 'why18-pop', role: 'dialog', 'aria-label': tx(w.title) || t(l('Por quê', 'Why')), 'data-level': level,
    onmouseenter: cancelClose, onmouseleave: schedClose, onclick: (e: Event) => e.stopPropagation() },
    h('header', null, h('span', null, tx(w.title)), h('b', null, fmtWhy(w.value, w.fmt)),
      h('button', { type: 'button', class: 'icon why18-x', 'aria-label': t(l('Fechar', 'Close')), onclick: () => closeFrom(level) }, '✕')),
    w.parts.length ? h('ul', null, w.parts.map((p) => partEl(s, p, level))) : h('p', { class: 'muted small' }, t(l('Sem componentes no momento.', 'No components right now.'))),
    w.note ? h('p', { class: 'muted small' }, tx(w.note)) : null,
    level === 0 ? h('p', { class: 'why18-hint' }, t(l('Itens com › abrem o próximo nível. Clique para fixar; Esc fecha.', 'Items with › open the next level. Click to pin; Esc closes.'))) : null);
  document.body.appendChild(pop);
  place(pop, rect, side);
  stack.push(pop);
  if (focus) (pop.querySelector('.why18-sub, .why18-x') as HTMLElement | null)?.focus();
  return true;
}

// ---------------------------------------------------------------- gatilhos

function bind(el: HTMLElement, key: string, ctx: () => WhyCtx): HTMLElement {
  el.classList.add('why18');
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-haspopup', 'dialog');
  el.addEventListener('mouseenter', () => {
    const s = store.game; if (!s || pinned) return;
    cancelClose(); if (openT) clearTimeout(openT);
    openT = setTimeout(() => openWhy(s, key, ctx(), el.getBoundingClientRect()), 220);
  });
  el.addEventListener('mouseleave', () => { if (openT) clearTimeout(openT); schedClose(); });
  const pin = (e: Event) => { e.stopPropagation(); e.preventDefault(); const s = store.game; if (!s) return; pinned = true; cancelClose(); openWhy(s, key, ctx(), el.getBoundingClientRect(), 0, false, e.type === 'keydown'); };
  el.addEventListener('click', pin);
  el.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') pin(e); });
  return el;
}

/** Embrulha `content` num gatilho de "por quê". Sem explicação registrada, devolve só o conteúdo. */
export function why18(s: GameState, key: string, ctx: WhyCtx, ...content: (Node | string | number | null)[]): HTMLElement {
  const el = h('span', null, ...content);
  if (!explain18(s, key, ctx)) return el;
  el.title = t(l('Por quê? (passe o mouse ou toque)', 'Why? (hover or tap)'));
  return bind(el, key, () => ctx);
}
/** Ícone ⓘ que abre a explicação. */
export function whyIcon(s: GameState, key: string, ctx: WhyCtx = {}): HTMLElement | null {
  if (!explain18(s, key, ctx)) return null;
  const el = h('span', { class: 'why18-i', 'aria-label': t(l('Por quê', 'Why')) }, 'ⓘ');
  return bind(el, key, () => ctx);
}
/** Atributos para delegação global (ctx serializável). */
export function whyAttrs(key: string, ctx: WhyCtx = {}): Record<string, string> {
  return { 'data-why': key, 'data-why-ctx': JSON.stringify(ctx), class: 'why18', tabindex: '0' };
}

// delegação: qualquer elemento com data-why vira gatilho na primeira vez que o mouse/foco passa por ele
if (typeof document !== 'undefined') {
  const arm = (e: Event) => {
    const el = (e.target as Element | null)?.closest?.('[data-why]') as HTMLElement | null;
    if (!el || el.dataset.why18 === '1') return;
    el.dataset.why18 = '1';
    let ctx: WhyCtx = {};
    try { ctx = JSON.parse(el.dataset.whyCtx ?? '{}'); } catch { /* ctx inválido */ }
    bind(el, el.dataset.why!, () => ctx);
    el.dispatchEvent(new MouseEvent(e.type === 'focusin' ? 'mouseenter' : 'mouseenter'));
  };
  document.addEventListener('mouseover', arm, true);
  document.addEventListener('focusin', arm, true);
  document.addEventListener('click', (e) => { if (stack.length && !(e.target as Element | null)?.closest?.('.why18-pop')) closeWhy(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stack.length) { e.stopPropagation(); closeFrom(stack.length - 1); if (!stack.length) pinned = false; } }, true);
}
