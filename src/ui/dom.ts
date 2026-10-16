// Mini-helper de DOM sem framework.
import { disp31 } from '../data/realdisp31';
import { emoPlain31, hasEmo31, pxNodes31 } from './pixel/emo31'; // r31 onda 4 (EMO): emoji → ícone em pixel art

type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, unknown> & { class?: string; style?: string };

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs | null = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      } else if (k === 'class') el.className = String(v);
      else if (k === 'style') el.setAttribute('style', String(v));
      else if (k === 'value' && 'value' in el) (el as HTMLInputElement).value = String(v);
      else if (k === 'checked' && 'checked' in el) (el as HTMLInputElement).checked = !!v;
      else if (k === 'disabled') (el as HTMLButtonElement).disabled = !!v;
      else if (k === 'selected' && 'selected' in el) (el as HTMLOptionElement).selected = !!v;
      else el.setAttribute(k, v === true ? '' : k === 'title' || k === 'aria-label' || k === 'placeholder' ? emoPlain31(disp31(String(v))) : String(v));
    }
  }
  append(el, children);
  return el;
}

function append(el: HTMLElement, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else {
      const txt = disp31(String(c)); // R31 (X): interruptor "Nomes e obras reais" na exibição
      // r31 onda 4 (EMO): emoji vira ícone em pixel art (em <option>/<textarea>, palavra)
      if (!hasEmo31(txt)) el.appendChild(document.createTextNode(txt));
      else if (el.tagName === 'OPTION' || el.tagName === 'TEXTAREA') el.appendChild(document.createTextNode(emoPlain31(txt)));
      else for (const n of pxNodes31(txt, el.tagName === 'BUTTON' && children.length === 1)) el.appendChild(n);
    }
  }
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function select<T extends string | number>(value: T, options: { value: T; label: string; disabled?: boolean }[], onChange: (v: T) => void, attrs: Attrs = {}): HTMLSelectElement {
  const sel = h('select', { ...attrs, onchange: (e: Event) => {
    const raw = (e.target as HTMLSelectElement).value;
    const found = options.find((o) => String(o.value) === raw);
    if (found) onChange(found.value);
  } });
  for (const o of options) sel.appendChild(h('option', { value: String(o.value), selected: o.value === value, disabled: o.disabled }, o.label));
  return sel;
}

export function bar(value: number, max = 100, cls = ''): HTMLElement {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return h('span', { class: `bar ${cls}`, role: 'meter', 'aria-valuenow': Math.round(value), 'aria-valuemin': 0, 'aria-valuemax': max }, h('span', { style: `width:${pct}%` }));
}

export function rangeBar(lo: number, hi: number, cls = ''): HTMLElement {
  return h('span', { class: `bar range ${cls}`, title: `${lo}–${hi}` }, h('span', { style: `left:${lo}%;width:${Math.max(2, hi - lo)}%` }));
}
