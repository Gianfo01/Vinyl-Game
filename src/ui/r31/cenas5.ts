// R31 · onda 5 (CENAS5) — PEÇAS DE DOM DAS CENAS DE LUGAR NO JOGO EXPLORÁVEL (atrás de `exp5.nav`; o modelo puro é
// ./cenas5model.ts). Aqui ficam:
//   · a faixa de lugar (como "SEDE · LONDRES · 1962") com o "◂ Cidade" pequeno em pixel;
//   · voltar um nível com Esc/Backspace (cena registrada com `bindBack5`; papel, pausa ou janela por cima têm a vez);
//   · a ajuda do lugar no "?" da casca (`helpHere5`: a cena à vista registra a sua com `setHelp5`);
//   · Tab e setas percorrendo os pontos na ordem de leitura (`arrows5`);
//   · a cena ajustada à área da casca, sem rolagem (`fit5`, `fillMain5`).
// Só interface: nada aqui muda o mundo nem vai para o save.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { nav5On } from '../../sim/r31/exp5';
import { h } from '../dom';
import { store } from '../store';
import { HOW5, order5, step5, type Help5, type Pt5 } from './cenas5model';
import './cenas5.css';

const T = (x: L): string => t(x);
export const cenas5On = (): boolean => !!store.game && nav5On(store.game);

// ---------------------------------------------------------------- faixa de lugar

export interface Strip5 { title: string; sub?: string[]; back?: { label: L; go: () => void }; extra?: (HTMLElement | null)[] }
/** Faixa de lugar da casca: "◂ Cidade" + NOME · tipo · cidade · ano (mesmo estilo de "SEDE · LONDRES · 1962"). */
export function placeStrip5(o: Strip5): HTMLElement {
  const back = o.back ? h('button', { type: 'button', class: 'cn5-back c2-back', title: `${T(o.back.label)} (Esc)`, onclick: o.back.go }, '◂ ', T(o.back.label)) : null;
  return h('div', { class: 's5-where cn5-where' }, back, h('b', null, o.title), ...(o.sub ?? []).filter(Boolean).map((x) => ` · ${x}`), h('span', { class: 'cn5-sp' }), ...(o.extra ?? []));
}

// ---------------------------------------------------------------- voltar um nível (Esc / Backspace)

const BACKS: { el: HTMLElement; go: () => void }[] = [];
let keyOn = false;
/** A cena `el` volta um nível com Esc/Backspace enquanto estiver à vista (a última registrada vale). */
export function bindBack5(el: HTMLElement, go: () => void): void {
  for (let i = BACKS.length - 1; i >= 0; i--) if (!BACKS[i].el.isConnected || BACKS[i].el === el) BACKS.splice(i, 1);
  BACKS.push({ el, go });
  if (keyOn || typeof window === 'undefined') return;
  keyOn = true;
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' && e.key !== 'Backspace') return;
    if (e.ctrlKey || e.metaKey || e.altKey || !cenas5On()) return;
    const tg = e.target as HTMLElement | null;
    if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return;
    // papel, pausa, ajuda ou janela por cima: Esc é deles (a casca fecha primeiro o que está em cima)
    if (document.querySelector('.p5, .pz5-back, .overlay, .s5-pop:not([hidden])')) return;
    for (let i = BACKS.length - 1; i >= 0; i--) if (!BACKS[i].el.isConnected) BACKS.splice(i, 1);
    const top = BACKS[BACKS.length - 1];
    if (!top) return;
    e.preventDefault(); e.stopImmediatePropagation();
    top.go();
  }, true);
}

// ---------------------------------------------------------------- ajuda do lugar no "?" da casca

const HELP: Map<string, Help5> = new Map();
/** A cena `id` registra a ajuda dela (a casca mostra a da cena que estiver à vista). */
export const setHelp5 = (id: string, x: Help5): void => { HELP.set(id, x); };
/** Bloco "Neste lugar" para a ajuda (?) da casca: a cena à vista mais de cima (a última no documento ou em `within`). */
export function helpHere5(within?: string): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const root = (within ? document.querySelector<HTMLElement>(within) : null) ?? document;
  const all = [...root.querySelectorAll<HTMLElement>('[data-help5]')];
  const els = all.filter((e) => e.offsetParent !== null);
  const el = els[els.length - 1] ?? all[all.length - 1];
  const x = el ? HELP.get(el.dataset.help5 ?? '') : undefined;
  if (!x) return null;
  return h('section', { class: 'cn5-help' },
    h('h2', null, T(l('Neste lugar', 'In this place')), h('small', null, ` · ${T(x.title)}`)),
    h('p', null, T(x.intro)),
    x.rows.length ? h('ul', null, ...x.rows.map((r) => h('li', null, h('b', null, T(r.label)), ': ', T(r.tip), r.lock ? h('span', { class: 'cn5-lk' }, ` · ${T(l('bloqueado', 'locked'))}: ${T(r.lock)}`) : null))) : null,
    x.legend ? h('p', { class: 'muted small' }, x.legend) : null,
    h('p', { class: 'muted small' }, T(HOW5)));
}

// ---------------------------------------------------------------- teclado: setas percorrem os pontos

/** Setas andam pelos botões de `layer` marcados com `attr` na ordem de leitura de `pts` (Tab segue a mesma ordem no DOM). */
export function arrows5(layer: HTMLElement, pts: readonly Pt5[], attr = 'data-spot'): void {
  const order = order5(pts);
  layer.addEventListener('keydown', (e: KeyboardEvent) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    const cur = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(`[${attr}]`)?.getAttribute(attr) ?? undefined;
    const nx = step5(order, cur, d as 1 | -1);
    const el = nx ? layer.querySelector<HTMLElement>(`[${attr}="${CSS.escape(nx)}"]`) : null;
    if (!el) return;
    e.preventDefault(); e.stopPropagation();
    el.focus();
  });
}

// ---------------------------------------------------------------- caber na área da casca, sem rolagem

/** Ajusta `stage` (proporção W×H) ao espaço livre de `box`: cabe na largura e na altura, centrado, sem rolar. */
export function fit5(box: HTMLElement, stage: HTMLElement, W: number, H: number, onSize?: (px: number) => void): void {
  let last = '';
  const run = (): void => {
    if (!stage.isConnected) return;
    const r = box.getBoundingClientRect();
    // limite de baixo: a área que contém a cena (papel, interior, região da casca) ou a janela menos a barra de baixo
    const vh = typeof window !== 'undefined' ? window.innerHeight || 800 : 800;
    const lim = box.parentElement?.closest<HTMLElement>('.p5-body, .c2-in, .reg5, .m5');
    const bot = lim ? lim.getBoundingClientRect().bottom - 8 : vh - (document.querySelector<HTMLElement>('.app5 > .b5')?.getBoundingClientRect().height ?? 0) - 6;
    const aw = Math.max(240, r.width || box.clientWidth || 640);
    const ah = Math.max(160, bot - Math.max(0, r.top));
    const k = Math.min(aw / W, ah / H);
    const w = Math.floor(W * k), hh = Math.floor(H * k);
    const key = `${w}x${hh}`;
    if (key === last) return;
    last = key;
    stage.style.width = `${w}px`; stage.style.height = `${hh}px`;
    onSize?.(w);
  };
  queueMicrotask(run);
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => { if (!stage.isConnected) { ro.disconnect(); return; } run(); });
    ro.observe(box);
  }
  if (typeof window !== 'undefined') { const rs = (): void => { if (!stage.isConnected) { window.removeEventListener('resize', rs); return; } run(); }; window.addEventListener('resize', rs); }
}

/** Faz `el` (sobreposição de um lugar) ocupar a área de cena da casca inteira (entre o topo e a barra de baixo). */
export function fillMain5(el: HTMLElement): void {
  const put = (): void => {
    const m = document.querySelector<HTMLElement>('.app5 > .m5');
    if (!m || !el.isConnected) return;
    const r = m.getBoundingClientRect();
    Object.assign(el.style, { position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, right: 'auto', bottom: 'auto' });
  };
  queueMicrotask(put);
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(put);
  if (typeof ResizeObserver === 'function') {
    const m = document.querySelector<HTMLElement>('.app5 > .m5');
    const ro = new ResizeObserver(() => { if (!el.isConnected) { ro.disconnect(); return; } put(); });
    if (m) ro.observe(m); else queueMicrotask(() => { const m2 = document.querySelector<HTMLElement>('.app5 > .m5'); if (m2) ro.observe(m2); });
  }
}
