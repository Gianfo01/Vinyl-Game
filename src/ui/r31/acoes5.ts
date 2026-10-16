// R31 · onda 5 (ACOES5, EXP-13) — O CARTÃO DE AÇÕES AO LADO DO OBJETO. Só com `exp5.nav` ligado (a casca liga o gancho
// CARD5 de nav5; desligado, nada aqui é chamado).
// Clicar (ou a tecla) num objeto abre um cartão pequeno em pixel art AO LADO dele, com os 1–3 números que importam ali e
// as 2–6 ações mais usadas, feitas ali mesmo com as funções de hoje (catálogo em acoes5model.ts; o que entra em cada
// objeto em acoes5data.ts). Bloqueio aparece no botão antes do clique (lockBtn31). A página antiga inteira só abre por
// "ver tudo ▸" (ou pelo índice da pausa); papéis já feitos (livro-caixa, mural, revista…) abrem por "abrir ▸".
// Teclado: a tecla do objeto abre o cartão com o foco na 1ª ação; 1–6 fazem a ação; Esc fecha; ↑/↓ andam.
// Leitor de tela: role=dialog com nome, números como lista, motivo do bloqueio ligado ao botão (aria-describedby).
// Explorar não muda o mundo: abrir/fechar o cartão só lê; só a ação escolhida escreve (pela função de hoje).

import './acoes5.css';
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { rerender, toast } from '../common';
import { h } from '../dom';
import { store } from '../store';
import { chordLabel5, key5 } from './keys5';
import { lockBtn31 } from './lock31';
import { CARD5, NAV5 } from './nav5';
import { card5, route5, type Card5, type CardAct5, type ActCtx5 } from './acoes5model';
import type { Open5 } from './objects5';

/** Cartão aberto agora (só interface). */
const CUR5: { id?: string; el?: HTMLElement; at?: DOMRect; mark?: Open5 } = {};
/** Quando true, a casca abre o papel (ver tudo, abrir ▸) em vez do cartão. */
let PASS5 = false;

/** Abre o papel/página do objeto sem passar pelo cartão (ver tudo ▸, abrir ▸). */
export function passThrough5(fn: () => void): void {
  PASS5 = true;
  try { fn(); } finally { PASS5 = false; }
}

// ---------------------------------------------------------------- onde ancorar (ao lado do objeto)

let lastPtr: { at: number; el: Element | null; x: number; y: number } = { at: 0, el: null, x: 0, y: 0 };
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (e) => { lastPtr = { at: Date.now(), el: e.target as Element | null, x: e.clientX, y: e.clientY }; }, true);
  // Esc fecha o cartão antes da casca (que abriria a pausa)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && CUR5.el?.isConnected) { e.preventDefault(); e.stopImmediatePropagation(); close5(); }
  }, true);
}
const pickable = 'button,[role="button"],a,[data-obj],canvas';

/** Retângulo do objeto: o clique recente (botão/objeto sob o ponteiro) ou o objeto desenhado com `data-obj`. */
function anchor5(id: string): DOMRect | undefined {
  if (typeof document === 'undefined') return undefined;
  if (Date.now() - lastPtr.at < 1200 && lastPtr.el && !lastPtr.el.closest('.ac5')) {
    const el = lastPtr.el.closest(pickable);
    if (el && el.isConnected) return el.getBoundingClientRect();
    return new DOMRect(lastPtr.x - 8, lastPtr.y - 8, 16, 16);
  }
  const el = document.querySelector(`[data-obj="${CSS.escape(id)}"]`);
  return el ? el.getBoundingClientRect() : undefined;
}

/** Põe o cartão ao lado do retângulo (direita; senão esquerda; senão embaixo), sempre dentro da janela. */
function place5(el: HTMLElement, a: DOMRect | undefined): void {
  const vw = window.innerWidth, vh = window.innerHeight;
  const r = el.getBoundingClientRect();
  const w = r.width || 260, hh = r.height || 200;
  const at = a ?? new DOMRect(vw / 2 - 1, vh / 3, 2, 2);
  let left = at.right + 10;
  if (left + w > vw - 8) left = at.left - 10 - w;
  if (left < 8) left = Math.min(vw - w - 8, Math.max(8, at.left + at.width / 2 - w / 2));
  let top = at.top + at.height / 2 - hh / 2;
  if (left === Math.min(vw - w - 8, Math.max(8, at.left + at.width / 2 - w / 2)) && at.bottom + 8 + hh <= vh) top = at.bottom + 8;
  top = Math.max(8, Math.min(vh - hh - 8, top));
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
  el.dataset.side = left >= at.right ? 'right' : left + w <= at.left ? 'left' : 'below';
}

// ---------------------------------------------------------------- abrir e fechar

export function close5(): void {
  CUR5.el?.remove();
  CUR5.el = undefined; CUR5.id = undefined; CUR5.mark = undefined;
}

/** "ver tudo ▸": a página antiga inteira do objeto (o marcador pedido, se veio de um "ir até lá"). */
function all5(id: string, m?: Open5): void {
  close5();
  passThrough5(() => { if (NAV5.open) NAV5.open(id, m ?? { area: card5(store.game!, id)?.all?.area ?? '' }); });
}

function ctx5(id: string): ActCtx5 {
  return {
    close: close5,
    all: () => all5(id, CUR5.mark),
    open: (obj, m) => { close5(); passThrough5(() => { const c = store.game ? card5(store.game, obj) : undefined; const tg = m ?? c?.all; if (tg && NAV5.open) NAV5.open(obj, tg); }); },
    say: (msg, kind = 'good') => toast(t(msg), kind),
    refresh: () => { rerender(); queueMicrotask(() => { if (CUR5.id === id && store.game) show5card(store.game, id, CUR5.at, CUR5.mark); }); },
  };
}

function actBtn5(s: GameState, id: string, a: CardAct5, i: number): HTMLElement {
  const label = h('span', { class: 'ac5-al' }, h('kbd', { class: 'ac5-n' }, String(i + 1)), h('span', null, t(a.label)), a.kind === 'open' || a.kind === 'all' ? ' ▸' : null);
  const run = () => {
    const c = ctx5(id);
    const msg = a.run(s, c);
    if (a.kind === 'do') { if (msg) c.say(msg.text, msg.bad ? 'bad' : 'good'); c.refresh(); }
  };
  return lockBtn31(label, a.lock ?? null, run, { cls: `ac5-a k-${a.kind}`, attrs: { 'data-act': a.id } });
}

/** Desenha o cartão do objeto (substitui o aberto). */
export function show5card(s: GameState, id: string, at?: DOMRect, mark?: Open5): HTMLElement | undefined {
  const c: Card5 | undefined = card5(s, id);
  if (!c) return undefined;
  const keep = CUR5.el?.isConnected && CUR5.id === id;
  CUR5.el?.remove();
  const chord = key5(`obj:${id}`)?.chord;
  const el = h('section', { class: 'ac5', role: 'dialog', 'aria-label': t(c.title), 'data-card': id },
    h('header', { class: 'ac5-h' },
      h('b', null, t(c.title)), chord ? h('kbd', { class: 'ac5-k' }, chordLabel5(chord)) : null,
      h('button', { type: 'button', class: 'ac5-x', 'aria-label': t(l('Fechar (Esc)', 'Close (Esc)')), onclick: close5 }, '×')),
    c.tip ? h('p', { class: 'ac5-t' }, t(c.tip)) : null,
    c.nums.length ? h('ul', { class: 'ac5-nums', 'aria-label': t(l('Números', 'Numbers')) }, c.nums.map((n) =>
      h('li', { class: n.tone ? `tone-${n.tone}` : '' }, h('span', null, t(n.label)), h('b', null, n.value),
        n.bar !== undefined ? h('i', { class: 'ac5-bar', 'aria-hidden': 'true' }, h('i', { style: `width:${Math.round(Math.max(0, Math.min(1, n.bar)) * 100)}%` })) : null))) : null,
    c.lines.length ? h('ul', { class: 'ac5-lines' }, c.lines.map((x) => h('li', null, t(x)))) : null,
    h('div', { class: 'ac5-acts' }, c.acts.map((a, i) => actBtn5(s, id, a, i))),
    c.all ? h('button', { type: 'button', class: 'ac5-all', onclick: () => all5(id, mark) }, t(l('ver tudo', 'see all')), ' ▸') : null);
  el.addEventListener('keydown', (e) => {
    const k = (e as KeyboardEvent).key;
    if (/^[1-6]$/.test(k)) {
      const b = el.querySelectorAll<HTMLButtonElement>('.ac5-a')[Number(k) - 1];
      e.preventDefault(); e.stopPropagation();
      if (b && !b.disabled) b.click();
      return;
    }
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      const bs = [...el.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
      const i = bs.indexOf(document.activeElement as HTMLButtonElement);
      bs[(i + (k === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length]?.focus();
      e.preventDefault(); e.stopPropagation();
      return;
    }
    // as outras teclas (objetos, viagem) seguem para a casca; Enter/Espaço são do botão
    if (k !== 'Tab' && k !== 'Enter' && k !== ' ') close5();
  });
  el.style.position = 'fixed';
  el.style.visibility = 'hidden';
  document.body.append(el);
  CUR5.el = el; CUR5.id = id; CUR5.at = at; CUR5.mark = mark;
  place5(el, at);
  el.style.visibility = '';
  if (!keep) (el.querySelector<HTMLElement>('.ac5-a:not([disabled]), .ac5-all') ?? el.querySelector<HTMLElement>('.ac5-x'))?.focus();
  return el;
}

// clicar fora fecha (o clique no próprio objeto fecha e reabre pelo gancho)
if (typeof document !== 'undefined') document.addEventListener('pointerdown', (e) => {
  if (CUR5.el && !CUR5.el.contains(e.target as Node)) close5();
}, true);

// ---------------------------------------------------------------- gancho da casca

/** A casca (shell5.show5) pergunta antes de abrir o papel de um objeto. */
export function take5(id: string, m: Open5): boolean {
  const s = store.game;
  if (!s || typeof document === 'undefined') return false;
  // índice da pausa aberto: a página inteira é o pedido; "ver tudo ▸"/"abrir ▸": PASS5
  if (route5(s, id, { pass: PASS5, pause: !!document.querySelector('.pz5') }) !== 'card') return false;
  return !!show5card(s, id, anchor5(id), m);
}
CARD5.take = take5;

/** Abre o cartão de um objeto da cena da casa (bilhete antigo → cartão). Devolve false quando o objeto não tem cartão. */
export function casaCard5(s: GameState, id: string, at: DOMRect | undefined): boolean {
  if (!card5(s, id)) return false;
  return !!show5card(s, id, at);
}
