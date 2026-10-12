// Rodada 22 — peças de seleção da Nova run, num padrão só: escolha única em cartões, seletor segmentado para 2–4
// opções curtas, etiquetas para escolha múltipla e chave liga/desliga. Todos redesenham a si mesmos ao clicar.

import { h } from './dom';

export interface Opt22<T extends string | number> { value: T; name: string; desc?: string; badge?: string; disabled?: boolean }

/** Cartões de escolha única (radiogroup). */
export function cards22<T extends string | number>(label: string, opts: Opt22<T>[], cur: () => T, set: (v: T) => void, cls = ''): HTMLElement {
  const box = h('div', { class: `ng22-picks ${cls}`, role: 'radiogroup', 'aria-label': label });
  const draw = () => box.replaceChildren(...opts.map((o) => {
    const on = cur() === o.value;
    return h('button', { type: 'button', role: 'radio', class: `pick ${on ? 'on' : ''}`, 'aria-checked': String(on), disabled: !!o.disabled, onclick: () => { set(o.value); draw(); } },
      h('b', null, o.name, o.badge ? h('span', { class: 'ng20-badge' }, o.badge) : null), o.desc ? h('small', null, o.desc) : null);
  }));
  draw();
  return box;
}

/** Seletor segmentado (poucas opções curtas). */
export function seg22<T extends string | number>(label: string, opts: Opt22<T>[], cur: () => T, set: (v: T) => void): HTMLElement {
  const box = h('div', { class: 'ng22-seg', role: 'radiogroup', 'aria-label': label });
  const hint = h('small', { class: 'muted ng22-seg-hint' });
  const draw = () => {
    box.replaceChildren(...opts.map((o) => {
      const on = cur() === o.value;
      return h('button', { type: 'button', role: 'radio', class: on ? 'on' : '', 'aria-checked': String(on), onclick: () => { set(o.value); draw(); } }, o.name);
    }));
    hint.textContent = opts.find((o) => o.value === cur())?.desc ?? '';
  };
  draw();
  return h('div', { class: 'ng22-segwrap' }, box, hint);
}

/** Etiquetas de escolha múltipla. */
export function chips22(label: string, opts: Opt22<string>[], cur: () => string[], set: (v: string[]) => void): HTMLElement {
  const box = h('div', { class: 'ng22-chips', role: 'group', 'aria-label': label });
  const draw = () => box.replaceChildren(...opts.map((o) => {
    const on = cur().includes(o.value);
    return h('button', { type: 'button', class: `chip-btn ${on ? 'on' : ''}`, 'aria-pressed': String(on), title: o.desc ?? '', onclick: () => { set(on ? cur().filter((x) => x !== o.value) : [...cur(), o.value]); draw(); } }, on ? `✓ ${o.name}` : o.name);
  }));
  draw();
  return box;
}

/** Chave liga/desliga com título e explicação. */
export function toggle22(name: string, desc: string, cur: () => boolean, set: (v: boolean) => void): HTMLElement {
  const sw = h('button', { type: 'button', role: 'switch', class: 'ng22-switch' }) as HTMLButtonElement;
  const draw = () => { sw.setAttribute('aria-checked', String(cur())); sw.classList.toggle('on', cur()); };
  sw.onclick = () => { set(!cur()); draw(); };
  draw();
  return h('label', { class: 'ng22-toggle' }, sw, h('span', null, h('b', null, name), h('small', { class: 'muted' }, desc)));
}
