// Rodada 27 (CITY2) — um lugar só: da sede (corte por dentro) para a cidade (mapa isométrico) e de volta.
// "Ver a cidade" (botão), Ctrl/⌘ + roda para baixo ou pinça fechando sobre o corte: a sede encolhe e o mapa
// "Nosso mundo" abre aproximado na sede e se afasta até o bairro inteiro (ui/sys/campus18.ts lê `arrive`).
// O caminho de volta (clicar na sede no mapa) já aproxima e entra. Com "reduzir movimento", troca direto.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { rerender } from '../common';
import { h } from '../dom';
import { store } from '../store';
import { ic } from '../vis';
import { SEDE25 } from './nav25';
import { trnMode31, trnOn31 } from '../../sim/r31/exp5trn';
import './zoom27.css';

/** Pedido de chegada: o mapa abre aproximado na sede e se afasta (consumido pelo mapa). */
export const zoom27: { arrive: boolean } = { arrive: false };
export const CITY27 = 'campus18';

const reduced = (): boolean => document.documentElement.classList.contains('reduced-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const goArea = (a: string): void => { store.area = a as typeof store.area; rerender(); };

/** Sai da sede para a cidade (com a sede encolhendo, se houver movimento). */
export function toCity27(el?: HTMLElement | null): void {
  zoom27.arrive = true;
  if (!el || reduced() || (trnOn31() && trnMode31() !== 'off')) { goArea(CITY27); return; } // R31 onda 5 (TRN): a cortina de viagem assume
  el.style.transition = 'transform 260ms ease-in, opacity 260ms ease-in';
  el.style.transformOrigin = '50% 60%';
  el.style.transform = 'scale(0.42)';
  el.style.opacity = '0.25';
  setTimeout(() => goArea(CITY27), 240);
}
export const toHq27 = (): void => goArea(SEDE25);

/** Abas "Sua sede | Nosso mundo" (as duas vistas do mesmo lugar) + botão de afastar. */
export function placeTabs27(on: 'hq' | 'city', zoomEl?: () => HTMLElement | null): HTMLElement {
  const tab = (k: 'hq' | 'city', icon: string, label: string, go: () => void) => h('button', { type: 'button', role: 'tab', class: `z27-tab ${on === k ? 'on' : ''}`, 'aria-selected': String(on === k), onclick: on === k ? undefined : go }, ic(icon), ' ', label);
  return h('div', { class: 'z27-tabs', role: 'tablist', 'aria-label': t(l('Vistas do seu lugar', 'Views of your place')) },
    tab('hq', 'house', t(l('Sua sede', 'Your HQ')), toHq27),
    tab('city', 'skyline', t(l('Nosso mundo', 'Our world')), () => toCity27(zoomEl?.())),
    on === 'hq' ? h('button', { type: 'button', class: 'btn small z27-out', title: t(l('Afastar: ver a cidade em volta da sede (Ctrl + roda ou pinça)', 'Zoom out: see the city around the HQ (Ctrl + wheel or pinch)')), onclick: () => toCity27(zoomEl?.()) }, ic('map'), ' ', t(l('Ver a cidade', 'See the city')), ' −') : null);
}

/** Gesto de afastar sobre um elemento: Ctrl/⌘ + roda para baixo (pinça do trackpad) ou pinça de dois dedos fechando. */
export function bindZoomOut27(el: HTMLElement, go: () => void): void {
  let acc = 0, fired = false;
  el.addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey) || fired) return;
    e.preventDefault();
    acc = e.deltaY > 0 ? acc + e.deltaY : 0;
    if (acc > 60) { fired = true; go(); }
  }, { passive: false });
  const pts = new Map<number, [number, number]>();
  let d0 = 0;
  const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
  el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) d0 = dist(); });
  el.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2 && d0 > 0 && !fired && dist() / d0 < 0.72) { fired = true; go(); }
  });
  const up = (e: PointerEvent) => { pts.delete(e.pointerId); if (pts.size < 2) d0 = 0; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}
