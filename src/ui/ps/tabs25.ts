// Rodada 25 — Pixel Studio: no máximo 5 abas visíveis em qualquer faixa de abas (vis.ts tabs()).
// As demais vão para "Mais ▾" (com filtro); a aba aberta sempre fica visível. Só apresentação:
// os botões originais continuam no DOM (atalhos { }, ajuda e testes seguem iguais), apenas ocultos.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { h } from '../dom';

const MAX = 5;
const fold = (x: string): string => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function enhance(bar: HTMLElement): void {
  bar.dataset.t25 = '1';
  const bs = [...bar.querySelectorAll<HTMLButtonElement>(':scope > button')];
  if (bs.length <= MAX) return;
  const on = bs.findIndex((b) => b.classList.contains('on'));
  const show = new Set(bs.slice(0, on >= MAX ? MAX - 1 : MAX));
  if (on >= 0) show.add(bs[on]);
  const hidden = bs.filter((b) => !show.has(b));
  for (const b of hidden) b.classList.add('t25-hidden');
  const list = h('div', { class: 'more25-list' });
  const paint = (q: string) => {
    const f = fold(q);
    const xs = hidden.filter((b) => !f || fold(b.textContent ?? '').includes(f));
    list.replaceChildren(...(xs.length ? [h('div', { class: 'more25-sec' }, ...xs.map((b) => {
      const it = h('button', { type: 'button', role: 'menuitem', onclick: () => { b.click(); } });
      for (const c of b.childNodes) it.append(c.cloneNode(true));
      return it;
    }))] : [h('p', { class: 'muted small' }, t(l('Nenhuma aba com esse nome.', 'No tab by that name.')))]));
  };
  paint('');
  const filter = h('input', { type: 'search', class: 'more25-filter', placeholder: t(l('Filtrar abas…', 'Filter tabs…')), 'aria-label': t(l('Filtrar abas', 'Filter tabs')), oninput: (e: Event) => paint((e.target as HTMLInputElement).value) }) as HTMLInputElement;
  const d = h('details', { class: 'more25 tabmore25', ontoggle: () => { if ((d as HTMLDetailsElement).open) setTimeout(() => filter.focus(), 0); },
    onkeydown: (e: KeyboardEvent) => { if (e.key === 'Escape') { (d as HTMLDetailsElement).open = false; e.stopPropagation(); } } },
    h('summary', { class: 'btn25', title: t(l('Mais abas', 'More tabs')) }, h('span', { class: 'lbl' }, t(l('Mais', 'More'))), h('small', { class: 'more25-n' }, String(hidden.length)), h('span', { class: 'more25-caret', 'aria-hidden': 'true' }, '▾')),
    h('div', { class: 'more25-pop', role: 'menu' }, filter, list));
  bar.append(d);
}

function scan(root: ParentNode): void {
  for (const bar of root.querySelectorAll<HTMLElement>('main .tabs[role=tablist]:not([data-t25])')) enhance(bar);
}

export function installTabs25(): void {
  if (typeof MutationObserver === 'undefined') return;
  let queued = false;
  const run = () => { queued = false; scan(document); };
  new MutationObserver(() => { if (!queued) { queued = true; queueMicrotask(run); } }).observe(document.body, { childList: true, subtree: true });
  // "Mais" (seções e abas) fecha ao clicar fora
  document.addEventListener('click', (e) => {
    for (const d of document.querySelectorAll<HTMLDetailsElement>('details.more25[open]')) if (!d.contains(e.target as Node)) d.open = false;
  });
  run();
}
