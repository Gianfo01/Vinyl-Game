// Ajudantes de interface do sistema world4.

import { l, type L } from '../../../data/world';
import { t } from '../../../i18n/strings';
import { rerender, toast } from '../../common';
import { h } from '../../dom';

/** Executa uma ação da simulação (que devolve erro ou null), avisa e redesenha. */
export function act(fn: () => L | null | void, ok: L = l('Feito.', 'Done.')): void {
  const err = fn();
  toast(t(err ? err : ok), err ? 'bad' : 'good');
  rerender();
}

export function btn(label: string, onclick: () => void, opts: { cls?: string; disabled?: boolean; title?: string; pressed?: boolean } = {}): HTMLButtonElement {
  return h('button', {
    class: `btn small ${opts.cls ?? ''}`, onclick, disabled: opts.disabled ? true : undefined, title: opts.title,
    'aria-pressed': opts.pressed === undefined ? undefined : opts.pressed ? 'true' : 'false',
  }, label);
}

export const pct = (x: number) => `${x >= 1 ? '+' : ''}${Math.round((x - 1) * 100)}%`;

export function note(text: L | string): HTMLElement {
  return h('p', { class: 'muted small' }, typeof text === 'string' ? text : t(text));
}
