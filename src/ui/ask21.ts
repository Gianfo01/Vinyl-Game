// Rodada 21 (I-9): confirmações e perguntas no diálogo do jogo (modal) no lugar de confirm()/prompt() nativos —
// com tema, botões traduzidos, sem travar a thread e sem limite de tamanho no texto colado (saves).
// confirm21/prompt21 são por callback (os botões chamam em resposta ao clique); as versões *Async devolvem Promise.

import { l } from '../data/world';
import { t } from '../i18n/strings';
import { modal } from './common';
import { h } from './dom';

export interface AskOpts21 { title?: string; yes?: string; no?: string; danger?: boolean; multiline?: boolean; placeholder?: string; password?: boolean }

/** Pergunta sim/não; `onYes` roda só na confirmação. */
export function confirm21(msg: string, onYes: () => void, opts: AskOpts21 = {}): void {
  let done = false;
  let close = () => {};
  const yes = () => { if (done) return; done = true; close(); onYes(); };
  const body = h('div', { class: 'ask21' },
    h('p', null, msg),
    h('div', { class: 'row wrap ask21-btns' },
      h('button', { class: 'btn ghost', onclick: () => close() }, opts.no ?? t(l('Cancelar', 'Cancel'))),
      h('button', { class: `btn ${opts.danger ? 'danger' : 'primary'}`, onclick: yes }, opts.yes ?? t(l('Confirmar', 'Confirm')))));
  close = modal(opts.title ?? t(l('Confirmar', 'Confirm')), body);
  (body.querySelector('.btn.primary, .btn.danger') as HTMLElement | null)?.focus();
}

/** Pergunta um texto; `onOk` recebe o valor (string, pode ser vazia) só quando a pessoa confirma. */
export function prompt21(msg: string, def: string, onOk: (v: string) => void, opts: AskOpts21 = {}): void {
  let done = false;
  let close = () => {};
  const inp = (opts.multiline
    ? h('textarea', { class: 'save-text ask21-in', rows: 5, placeholder: opts.placeholder ?? '', 'aria-label': msg })
    : h('input', { type: 'text', class: 'ask21-in', value: def, placeholder: opts.placeholder ?? '', 'aria-label': msg })) as HTMLInputElement | HTMLTextAreaElement;
  if (opts.multiline) inp.value = def;
  const ok = () => { if (done) return; done = true; const v = inp.value; close(); onOk(v); };
  inp.addEventListener('keydown', (e: Event) => { if ((e as KeyboardEvent).key === 'Enter' && (!opts.multiline || (e as KeyboardEvent).ctrlKey || (e as KeyboardEvent).metaKey)) { e.preventDefault(); ok(); } });
  const body = h('div', { class: 'ask21 form' },
    h('label', null, msg, inp),
    h('div', { class: 'row wrap ask21-btns' },
      h('button', { class: 'btn ghost', onclick: () => close() }, opts.no ?? t(l('Cancelar', 'Cancel'))),
      h('button', { class: 'btn primary', onclick: ok }, opts.yes ?? t(l('OK', 'OK')))));
  close = modal(opts.title ?? t(l('Pergunta', 'Question')), body);
  inp.focus();
  if (!opts.multiline && def) (inp as HTMLInputElement).select();
}

/** Versão com Promise (true = confirmou). */
export const confirmAsync21 = (msg: string, opts: AskOpts21 = {}): Promise<boolean> => new Promise((res) => {
  let answered = false;
  let close = () => {};
  const fin = (v: boolean) => { if (answered) return; answered = true; close(); res(v); };
  const body = h('div', { class: 'ask21' },
    h('p', null, msg),
    h('div', { class: 'row wrap ask21-btns' },
      h('button', { class: 'btn ghost', onclick: () => fin(false) }, opts.no ?? t(l('Cancelar', 'Cancel'))),
      h('button', { class: `btn ${opts.danger ? 'danger' : 'primary'}`, onclick: () => fin(true) }, opts.yes ?? t(l('Confirmar', 'Confirm')))));
  close = modal(opts.title ?? t(l('Confirmar', 'Confirm')), body, { onClose: () => fin(false) });
  (body.querySelector('.btn.primary, .btn.danger') as HTMLElement | null)?.focus();
});

/** Versão com Promise (null = cancelou, como o prompt nativo). */
export const promptAsync21 = (msg: string, def = '', opts: AskOpts21 = {}): Promise<string | null> => new Promise((res) => {
  let answered = false;
  let close = () => {};
  const fin = (v: string | null) => { if (answered) return; answered = true; close(); res(v); };
  const inp = (opts.multiline
    ? h('textarea', { class: 'save-text ask21-in', rows: 6, placeholder: opts.placeholder ?? '', 'aria-label': msg })
    : h('input', { type: opts.password ? 'password' : 'text', class: 'ask21-in', value: def, placeholder: opts.placeholder ?? '', 'aria-label': msg })) as HTMLInputElement | HTMLTextAreaElement;
  if (opts.multiline) inp.value = def;
  inp.addEventListener('keydown', (e: Event) => { if ((e as KeyboardEvent).key === 'Enter' && (!opts.multiline || (e as KeyboardEvent).ctrlKey || (e as KeyboardEvent).metaKey)) { e.preventDefault(); fin(inp.value); } });
  const body = h('div', { class: 'ask21 form' },
    h('label', null, msg, inp),
    h('div', { class: 'row wrap ask21-btns' },
      h('button', { class: 'btn ghost', onclick: () => fin(null) }, opts.no ?? t(l('Cancelar', 'Cancel'))),
      h('button', { class: 'btn primary', onclick: () => fin(inp.value) }, opts.yes ?? t(l('OK', 'OK')))));
  close = modal(opts.title ?? t(l('Pergunta', 'Question')), body, { onClose: () => fin(null) });
  inp.focus();
  if (!opts.multiline && def) (inp as HTMLInputElement).select();
});
