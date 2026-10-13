// Rodada 27 (UX) — controles de escolha consistentes (guia: docs/ux27.md §4; regra pura em pick27model.ts).
// segmented27 (1 de 2–4), chips27 (filtros que somam), optionCards27 (escolha com consequência), listBar27
// (busca + ordem + filtros iguais em toda lista) e enhanceSelects27: as ~300 listas (<select>) antigas com 2–4
// opções curtas viram controle segmentado sem mexer em quem as criou — o <select> continua no DOM (escondido),
// recebe o valor e o evento "change", então os handlers antigos seguem iguais. Use data-keep-select para não converter.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { h } from '../dom';
import { pickKind27 } from './pick27model';
import './pick27.css';

const tx = (x: L | string): string => (typeof x === 'string' ? x : t(x));
export interface Opt27<T extends string> { value: T; label: L | string; hint?: L | string; disabled?: boolean; badge?: number }

/** Segmentado: 1 escolha entre 2–4 opções curtas, todas à vista (role=radiogroup, setas trocam). */
export function segmented27<T extends string>(value: T, opts: Opt27<T>[], onChange: (v: T) => void, label: L | string): HTMLElement {
  const box = h('div', { class: 'seg27', role: 'radiogroup', 'aria-label': tx(label) });
  const set = (v: T) => {
    for (const b of box.querySelectorAll<HTMLButtonElement>('button')) { const on = b.dataset.v === v; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; }
    onChange(v);
  };
  for (const o of opts) box.append(h('button', { type: 'button', role: 'radio', 'data-v': o.value, 'aria-checked': o.value === value ? 'true' : 'false', tabindex: o.value === value ? '0' : '-1',
    class: o.value === value ? 'on' : '', disabled: o.disabled, title: o.hint ? tx(o.hint) : undefined, onclick: () => set(o.value) }, tx(o.label), o.badge ? h('span', { class: 'badge' }, o.badge) : null));
  box.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const bs = [...box.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    const i = bs.findIndex((b) => b === document.activeElement);
    const nx = bs[(i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length];
    if (nx) { e.preventDefault(); nx.focus(); nx.click(); }
  });
  return box;
}

/** Chips de filtro: 0..n marcados; "Limpar" aparece quando há algum. */
export function chips27<T extends string>(on: T[], opts: Opt27<T>[], onChange: (v: T[]) => void, label: L | string): HTMLElement {
  const cur = new Set(on);
  return h('div', { class: 'chips27', role: 'group', 'aria-label': tx(label) },
    opts.map((o) => h('button', { type: 'button', class: `chip27b ${cur.has(o.value) ? 'on' : ''}`, 'aria-pressed': cur.has(o.value) ? 'true' : 'false', disabled: o.disabled,
      onclick: () => { if (cur.has(o.value)) cur.delete(o.value); else cur.add(o.value); onChange([...cur]); } }, tx(o.label), o.badge ? h('span', { class: 'badge' }, o.badge) : null)),
    cur.size ? h('button', { type: 'button', class: 'link chips27-clear', onclick: () => onChange([]) }, t(l('Limpar', 'Clear'))) : null);
}

export interface Card27<T extends string> extends Opt27<T> { cost?: string; effects?: (L | string)[]; tone?: 'good' | 'bad' | 'warn' | 'neutral' }
/** Cartões de opção: cada escolha mostra custo e efeitos antes do clique (escolhas com consequência). */
export function optionCards27<T extends string>(value: T | null, opts: Card27<T>[], onPick: (v: T) => void, label: L | string): HTMLElement {
  return h('div', { class: 'cards27', role: 'radiogroup', 'aria-label': tx(label) }, opts.map((o) => h('button', { type: 'button', role: 'radio', 'aria-checked': o.value === value ? 'true' : 'false',
    class: `card27o ${o.value === value ? 'on' : ''} ${o.tone ? 't-' + o.tone : ''}`, disabled: o.disabled, onclick: () => onPick(o.value) },
    h('b', null, tx(o.label)), o.cost ? h('span', { class: 'card27o-cost' }, o.cost) : null,
    o.hint ? h('span', { class: 'card27o-hint' }, tx(o.hint)) : null,
    o.effects?.length ? h('ul', null, o.effects.map((e) => h('li', null, tx(e)))) : null)));
}

/** Barra padrão de lista: busca à esquerda, ordem (segmentado) e filtros (chips) — a mesma em toda lista longa. */
export function listBar27<S extends string, F extends string>(o: {
  q?: string; onQ?: (q: string) => void; placeholder?: L | string;
  sort?: { value: S; opts: Opt27<S>[]; onChange: (v: S) => void };
  filters?: { on: F[]; opts: Opt27<F>[]; onChange: (v: F[]) => void };
  count?: number;
}): HTMLElement {
  return h('div', { class: 'listbar27', role: 'search' },
    o.onQ ? h('input', { type: 'search', class: 'listbar27-q', value: o.q ?? '', placeholder: tx(o.placeholder ?? l('Filtrar…', 'Filter…')), 'aria-label': tx(o.placeholder ?? l('Filtrar', 'Filter')),
      oninput: (e: Event) => o.onQ!((e.target as HTMLInputElement).value) }) : null,
    o.sort ? h('span', { class: 'listbar27-sort' }, h('small', { class: 'muted' }, t(l('Ordem', 'Sort'))), segmented27(o.sort.value, o.sort.opts, o.sort.onChange, l('Ordem', 'Sort'))) : null,
    o.filters ? chips27(o.filters.on, o.filters.opts, o.filters.onChange, l('Filtros', 'Filters')) : null,
    o.count != null ? h('small', { class: 'muted listbar27-n' }, String(o.count)) : null);
}

// ---------------------------------------------------------------- conversão das listas curtas antigas
/** Nome acessível do <select>: aria-label, title, <label for> ou o <label> em volta. */
function selName(sel: HTMLSelectElement): string {
  const own = sel.getAttribute('aria-label') ?? sel.title;
  if (own) return own;
  const lab = sel.id ? sel.ownerDocument.querySelector(`label[for="${CSS.escape(sel.id)}"]`) : sel.closest('label');
  return (lab?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

/** Troca, dentro de `root`, cada <select> simples com 2–4 opções curtas por um segmentado (o select fica escondido). */
export function enhanceSelects27(root: HTMLElement): number {
  let n = 0;
  for (const sel of root.querySelectorAll<HTMLSelectElement>('select:not([multiple]):not([data-keep-select]):not(.sel27-x)')) {
    if (sel.closest('[data-keep-select], .overlay')) continue;
    const opts = [...sel.options].filter((o) => !o.hidden);
    if (pickKind27({ n: opts.length, labels: opts.map((o) => o.text) }) !== 'segmented') continue;
    const seg = h('div', { class: 'seg27 seg27-auto', role: 'radiogroup', 'aria-label': selName(sel) || undefined });
    const sync = () => { for (const b of seg.querySelectorAll<HTMLButtonElement>('button')) { const on = b.dataset.v === sel.value; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; } };
    for (const o of opts) seg.append(h('button', { type: 'button', role: 'radio', 'data-v': o.value, disabled: o.disabled || sel.disabled, title: sel.title || undefined,
      onclick: (e: Event) => {
        e.preventDefault(); // dentro de <label>: não repassa o clique para o select escondido
        if (sel.value === o.value) return;
        sel.value = o.value; sync();
        sel.dispatchEvent(new Event('input', { bubbles: true }));
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      } }, o.text));
    seg.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const bs = [...seg.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      const i = bs.findIndex((b) => b === document.activeElement);
      const nx = bs[(i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length];
      if (nx) { e.preventDefault(); nx.focus(); nx.click(); }
    });
    sync();
    sel.classList.add('sel27-x');
    sel.setAttribute('aria-hidden', 'true');
    sel.tabIndex = -1;
    sel.after(seg);
    n++;
  }
  return n;
}
