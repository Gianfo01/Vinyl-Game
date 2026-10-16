// R31 (B) — painel de perguntas do próprio jogo, no lugar das janelas do navegador (alert/confirm/prompt).
// Um componente só, assíncrono: ask (escolha entre opções), askConfirm (sim/não), askText (texto/PIN), tell (aviso),
// askFile (arrastar arquivo ou escolher). Teclado: Enter confirma, Esc cancela, Tab circula só dentro do painel.
import type { L } from '../data/world';
import { t } from '../i18n/strings';
import { h } from './dom';
import './ask31.css';

type Txt = L | string;
const tx = (x: Txt | undefined): string => (x === undefined ? '' : typeof x === 'string' ? x : t(x));

export interface AskOption<T> { value: T; label: Txt; kind?: 'primary' | 'danger' | 'ghost'; }
export interface AskOpts<T> { title: Txt; body?: Txt | Node; options: AskOption<T>[]; }

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Monta o painel e devolve uma promessa resolvida por `done(v)`; Esc resolve com `cancel`. */
function panel<R>(title: Txt, build: (done: (v: R) => void) => { body: Node[]; first?: HTMLElement; enter?: () => void }, cancel: R): Promise<R> {
  return new Promise<R>((resolve) => {
    const prev = document.activeElement as HTMLElement | null;
    let closed = false;
    const done = (v: R) => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
      prev?.focus?.();
      resolve(v);
    };
    const titleId = `ask31-t-${Math.floor(performance.now() * 1000) % 1e9}`;
    const parts = build(done);
    const box = h('div', { class: 'modal ask31-panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
      h('header', null, h('h2', { id: titleId }, tx(title))),
      h('div', { class: 'modal-body ask31-body' }, ...parts.body));
    const overlay = h('div', { class: 'overlay ask31', onclick: (e: Event) => { if (e.target === overlay) done(cancel); } }, box);
    const onKey = (e: KeyboardEvent) => {
      // o painel fica por cima de tudo: nenhuma outra tecla de atalho vaza para a tela de baixo
      if (!document.body.contains(overlay)) return;
      const top = [...document.querySelectorAll('.overlay.ask31')].pop();
      if (top !== overlay) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); done(cancel); return; }
      if (e.key === 'Tab') {
        const els = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null || x === document.activeElement);
        if (!els.length) { e.preventDefault(); return; }
        const i = els.indexOf(document.activeElement as HTMLElement);
        const n = e.shiftKey ? (i <= 0 ? els.length - 1 : i - 1) : (i < 0 || i >= els.length - 1 ? 0 : i + 1);
        e.preventDefault(); e.stopImmediatePropagation();
        els[n].focus();
        return;
      }
      if (e.key === 'Enter') {
        const a = document.activeElement as HTMLElement | null;
        if (a?.tagName === 'TEXTAREA' && !(e.ctrlKey || e.metaKey)) return; // quebra de linha
        if (a?.tagName === 'BUTTON' && box.contains(a)) { e.stopImmediatePropagation(); return; } // o botão focado responde sozinho
        if (parts.enter) { e.preventDefault(); e.stopImmediatePropagation(); parts.enter(); }
        return;
      }
      if (!box.contains(e.target as Node)) e.stopImmediatePropagation();
    };
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(overlay);
    (parts.first ?? box.querySelector<HTMLElement>(FOCUSABLE))?.focus();
  });
}

function bodyNode(b: Txt | Node | undefined): Node[] {
  if (b === undefined) return [];
  if (b instanceof Node) return [b];
  return tx(b).split('\n').map((p) => h('p', null, p));
}

/** Pergunta com opções; devolve o valor escolhido ou `null` (Esc, clique fora). */
export function ask<T>(o: AskOpts<T>): Promise<T | null> {
  return panel<T | null>(o.title, (done) => {
    const btns = o.options.map((op) => h('button', { type: 'button', class: `btn ${op.kind ?? ''}`, onclick: () => done(op.value) }, tx(op.label)));
    const main = o.options.findIndex((op) => op.kind === 'primary' || op.kind === 'danger');
    const mi = main >= 0 ? main : 0;
    return { body: [...bodyNode(o.body), h('div', { class: 'ask31-actions' }, ...btns)], first: btns[mi], enter: () => done(o.options[mi]?.value ?? null) };
  }, null);
}

/** Sim/não. `danger` pinta o botão de confirmar de vermelho (ações sem volta). */
export async function askConfirm(body: Txt, opts: { title?: Txt; ok?: Txt; cancel?: Txt; danger?: boolean } = {}): Promise<boolean> {
  const r = await ask<boolean>({
    title: opts.title ?? { pt: 'Confirmar', en: 'Confirm' },
    body,
    options: [
      { value: false, label: opts.cancel ?? { pt: 'Cancelar', en: 'Cancel' }, kind: 'ghost' },
      { value: true, label: opts.ok ?? { pt: 'Confirmar', en: 'Confirm' }, kind: opts.danger ? 'danger' : 'primary' },
    ],
  });
  return r === true;
}

/** Aviso com um botão só. */
export async function tell(o: { title: Txt; body?: Txt | Node; ok?: Txt }): Promise<void> {
  await ask<true>({ title: o.title, body: o.body, options: [{ value: true, label: o.ok ?? { pt: 'Entendi', en: 'Got it' }, kind: 'primary' }] });
}

export interface AskTextOpts {
  title: Txt; label?: Txt; default?: string; placeholder?: Txt; hint?: Txt;
  /** PIN/senha: os caracteres não aparecem. */
  secret?: boolean;
  /** Texto longo (colar save/código): caixa de várias linhas; Ctrl+Enter confirma. */
  multiline?: boolean;
  /** Texto usado no campo para copiar (só leitura, já selecionado). */
  readonly?: boolean;
  ok?: Txt;
  /** Aceita vazio (devolve ''); por padrão vazio desabilita o botão de confirmar. */
  allowEmpty?: boolean;
}

/** Pede um texto; devolve o texto ou `null` se cancelou. */
export function askText(o: AskTextOpts): Promise<string | null> {
  return panel<string | null>(o.title, (done) => {
    const id = `ask31-i-${Math.floor(performance.now() * 1000) % 1e9}`;
    const common = { id, class: 'ask31-input', placeholder: tx(o.placeholder) || undefined, readonly: o.readonly || undefined, autocomplete: 'off', spellcheck: 'false' };
    const input = (o.multiline
      ? h('textarea', { ...common, rows: 5 })
      : h('input', { ...common, type: o.secret ? 'password' : 'text' })) as HTMLInputElement | HTMLTextAreaElement;
    input.value = o.default ?? '';
    const okBtn = h('button', { type: 'button', class: 'btn primary', onclick: () => submit() }, tx(o.ok ?? (o.readonly ? { pt: 'Fechar', en: 'Close' } : { pt: 'OK', en: 'OK' })));
    const sync = () => { okBtn.disabled = !o.allowEmpty && !o.readonly && !input.value.trim(); };
    input.addEventListener('input', sync); sync();
    const submit = () => { if (okBtn.disabled) return; done(input.value); };
    const cancelBtn = o.readonly ? null : h('button', { type: 'button', class: 'btn ghost', onclick: () => done(null) }, tx({ pt: 'Cancelar', en: 'Cancel' }));
    input.addEventListener('focus', () => { if (o.readonly || o.default) input.select(); });
    return {
      body: [
        o.label ? h('label', { for: id, class: 'ask31-label' }, tx(o.label)) : null,
        input,
        o.hint ? h('small', { class: 'muted ask31-hint' }, tx(o.hint)) : null,
        h('div', { class: 'ask31-actions' }, cancelBtn, okBtn),
      ].filter(Boolean) as Node[],
      first: input,
      enter: submit,
    };
  }, null);
}

/** Área de arrastar arquivo (com botão para escolher). Devolve o arquivo ou `null`. */
export function askFile(o: { title: Txt; body?: Txt; accept?: string }): Promise<File | null> {
  return panel<File | null>(o.title, (done) => {
    const pick = h('input', { type: 'file', accept: o.accept, class: 'ask31-file', tabindex: '-1', 'aria-hidden': 'true', onchange: () => { const f = pick.files?.[0]; if (f) done(f); } }) as HTMLInputElement;
    const btn = h('button', { type: 'button', class: 'btn primary', onclick: () => pick.click() }, tx({ pt: 'Escolher arquivo…', en: 'Choose file…' }));
    const zone = h('div', { class: 'ask31-drop', role: 'button', tabindex: '0', 'aria-label': tx({ pt: 'Solte o arquivo aqui ou aperte Enter para escolher', en: 'Drop the file here or press Enter to choose' }),
      onclick: () => pick.click(),
      ondragover: (e: DragEvent) => { e.preventDefault(); zone.classList.add('over'); },
      ondragleave: () => zone.classList.remove('over'),
      ondrop: (e: DragEvent) => { e.preventDefault(); zone.classList.remove('over'); const f = e.dataTransfer?.files?.[0]; if (f) done(f); },
    }, h('span', { class: 'ask31-drop-ico', 'aria-hidden': 'true' }, '⇩'), h('span', null, tx({ pt: 'Arraste o arquivo para cá', en: 'Drag the file here' })));
    return {
      body: [...bodyNode(o.body), zone, pick, h('div', { class: 'ask31-actions' }, h('button', { type: 'button', class: 'btn ghost', onclick: () => done(null) }, tx({ pt: 'Cancelar', en: 'Cancel' })), btn)],
      first: btn,
      enter: () => pick.click(),
    };
  }, null);
}
