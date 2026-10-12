// Rodada 21 (revisão 21 §2.3): utilidades de interface para desafogar telas sem tirar nada —
// seções recolhíveis cujo estado fica nas preferências do navegador (fold21) e a página vazia com atalho para o Mercado.

import { l } from '../data/world';
import { t } from '../i18n/strings';
import type { GameState } from '../sim/types';
import { h } from './dom';
import { savePrefs, store } from './store';
import { ic } from './vis';

type Kid = Node | string | null | false | undefined | Kid[];

const foldOpen = (id: string, def: boolean): boolean => store.prefs.fold21?.[id] ?? def;
const setFold = (id: string, open: boolean): void => { (store.prefs.fold21 ??= {})[id] = open; savePrefs(); };

/** Cartão recolhível (`details`): recolhido por padrão, estado lembrado por jogador (prefs). */
export function fold21(id: string, title: string, ...children: Kid[]): HTMLElement {
  const open = foldOpen(id, false);
  return h('details', { class: 'card fold21', open: open ? true : undefined, 'data-fold': id,
    ontoggle: (e: Event) => setFold(id, (e.currentTarget as HTMLDetailsElement).open) },
    h('summary', null, h('h3', null, title)), ...(children as never[]));
}

/** Cartão recolhível que só monta o conteúdo quando aberto (menos DOM e menos controles na tela); estado lembrado por jogador. */
export function foldLazy21(id: string, title: Kid, render: () => Kid, def = false, cls = ''): HTMLElement {
  const open = foldOpen(id, def);
  const body = h('div', { class: 'fold21-body' });
  let built = false;
  const build = () => { if (built) return; built = true; const k = render(); for (const x of (Array.isArray(k) ? k : [k]).flat(4) as (Node | string | null | false | undefined)[]) if (x) body.append(x); };
  const det = h('details', { class: `card fold21 ${cls}`, open: open ? true : undefined, 'data-fold': id,
    ontoggle: (e: Event) => { const o = (e.currentTarget as HTMLDetailsElement).open; setFold(id, o); if (o) build(); } },
    h('summary', null, typeof title === 'string' ? h('h3', null, title) : (title as never)), body);
  if (open) build();
  return det;
}
export const foldOpen21 = foldOpen;
export const setFold21 = setFold;

/** Envolve um cartão já pronto (section.card com h3) num fold21; o h3 vira o título do summary. */
export function foldWrap21(id: string, title: string, el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  const h3 = el.querySelector(':scope > h3');
  const label = h3?.textContent?.trim() || title;
  h3?.remove();
  el.classList.remove('card');
  return fold21(id, label, el);
}

/** Página sem elenco: uma frase + botão direto para o Mercado (contratar) e a dica do menu Ações. */
export function emptyRoster21(s: GameState, title: string, text?: string): HTMLElement {
  void s;
  return h('section', { class: 'card empty21' },
    h('h3', null, title),
    h('p', { class: 'muted' }, text ?? t(l('Contrate um artista para começar.', 'Sign an act to get started.'))),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn primary', onclick: () => { store.area = 'market'; store.rerender(); } }, ic('fans'), ' ', t(l('Ir ao Mercado (contratar)', 'Go to the Market (sign an act)'))),
      h('button', { class: 'btn ghost', onclick: () => { store.area = 'directory'; store.rerender(); } }, t(l('Todos os artistas', 'All artists')))));
}

/** Recolhível leve, dentro de um cartão (filtros avançados, listas secundárias): mesmo estado nas prefs, sem moldura de cartão. */
export function foldInline21(id: string, title: string, ...children: Kid[]): HTMLElement {
  const open = foldOpen(id, false);
  return h('details', { class: 'fold21 fold21-inline', open: open ? true : undefined, 'data-fold': id,
    ontoggle: (e: Event) => setFold(id, (e.currentTarget as HTMLDetailsElement).open) },
    h('summary', null, h('span', { class: 'fold21-t' }, title)), ...(children as never[]));
}

export interface MenuItem21 { label: string; icon?: string; run: () => void; disabled?: boolean; title?: string; on?: boolean }
let openMenu21: (() => void) | null = null;
let menuSeq21 = 0;
/** Botão `…` (menu W3C): as ações secundárias de um cartão. Setas/Home/End/Escape; clique fora fecha; devolve o foco. */
export function moreMenu21(items: MenuItem21[], label = t(l('Mais ações', 'More actions')), text?: string): HTMLElement {
  const id = `mm21-${++menuSeq21}`;
  const btn = h('button', { class: `btn small ghost ${text ? '' : 'mm21-btn'}`, 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': label, title: label }, text ?? '…');
  btn.addEventListener('click', (e: Event) => {
    e.stopPropagation();
    if (openMenu21) { openMenu21(); return; }
    const els: HTMLElement[] = [];
    const menu = h('div', { role: 'menu', id, class: 'mm21', 'aria-label': label },
      items.map((it) => {
        const el = h('div', { role: 'menuitem', tabindex: '-1', class: `mm21-item ${it.disabled ? 'off' : ''}`, 'aria-disabled': it.disabled ? 'true' : null, title: it.title ?? null,
          onclick: (ev: Event) => { ev.stopPropagation(); if (it.disabled) return; close(false); it.run(); } },
          it.icon ? ic(it.icon) : null, it.icon ? ' ' : null, it.on ? '✓ ' : '', it.label);
        els.push(el);
        return el;
      }));
    const focusAt = (i: number) => { const n = els.length; if (n) els[((i % n) + n) % n].focus(); };
    const cur = () => els.indexOf(document.activeElement as HTMLElement);
    const onKey = (e2: KeyboardEvent) => {
      const i = cur();
      if (e2.key === 'ArrowDown') { e2.preventDefault(); focusAt(i + 1); }
      else if (e2.key === 'ArrowUp') { e2.preventDefault(); focusAt(i - 1); }
      else if (e2.key === 'Home') { e2.preventDefault(); focusAt(0); }
      else if (e2.key === 'End') { e2.preventDefault(); focusAt(els.length - 1); }
      else if (e2.key === 'Escape') { e2.preventDefault(); e2.stopPropagation(); close(true); }
      else if (e2.key === 'Tab') close(false);
      else if ((e2.key === 'Enter' || e2.key === ' ') && i >= 0) { e2.preventDefault(); els[i].click(); }
      else if (e2.key.length === 1) e2.stopPropagation();
    };
    const onDown = (e2: Event) => { if (!menu.contains(e2.target as Node) && e2.target !== btn) close(false); };
    function close(refocus: boolean): void {
      if (!menu.isConnected) return;
      menu.remove();
      document.removeEventListener('pointerdown', onDown, true);
      btn.setAttribute('aria-expanded', 'false'); btn.removeAttribute('aria-controls');
      openMenu21 = null;
      if (refocus && btn.isConnected) btn.focus();
    }
    document.body.appendChild(menu);
    menu.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown, true);
    btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-controls', id);
    openMenu21 = () => close(false);
    const r = btn.getBoundingClientRect(), w = menu.offsetWidth || 220, hh = menu.offsetHeight || 160;
    const below = window.innerHeight - r.bottom - 8 >= hh;
    menu.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w))}px`;
    menu.style.top = `${below ? r.bottom + 4 : Math.max(8, r.top - hh - 4)}px`;
    focusAt(0);
  });
  return btn;
}
