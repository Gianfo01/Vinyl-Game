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
