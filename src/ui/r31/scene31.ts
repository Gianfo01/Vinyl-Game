// R31 · onda 2 (J) — HOSPEDEIRO DAS CENAS INTERATIVAS (DOM). Cada cena entrega o modelo puro (áreas clicáveis em
// pixels lógicos) e a função que pinta o <canvas>; aqui ficam as regras comuns da "camada de clareza":
//   · toda área acende ao passar o mouse/foco, mostra a dica curta e abre algo ao clicar; clique direito (ou tecla de
//     menu / toque longo) abre o painel rápido do alvo; o teclado percorre as áreas (Tab) com foco visível;
//   · área de clique maior que o desenho; selos com número + símbolo + texto (nada só por cor); só o crítico pulsa;
//   · "Rótulos" (ligado no primeiro ano), "Mostrar o que é clicável" (opção que fica), "Ver como lista" (pular a cena,
//     fica lembrado) e a apresentação dos objetos na primeira visita;
//   · a lista acessível dos pontos vem do MESMO registro que desenha a cena.
// Preferências de quem joga ficam no navegador (localStorage, com try/catch): explorar não muda o mundo.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { rerender } from '../common';
import { h } from '../dom';
import { store } from '../store';
import { setTab } from '../vis';
import { goToHub } from '../sys/project12';
import { quickHook31 } from './lock31';
import { ALERT31, badgeSym31, labelsDefault31, personSpot31, placeLabels31, type Go31s, type Spot31 } from './scene31model';
import { nav5On } from '../../sim/r31/exp5';
import { ic } from '../vis';
import { help5Of, sorted5, splitLock5 } from './cenas5model';
import { arrows5, fit5, setHelp5 } from './cenas5';
import './scene31.css';

const lsGet = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string): void => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };

export type SceneMode31 = 'scene' | 'list';
export const sceneMode31 = (id: string): SceneMode31 => (lsGet(`vtn31-scene:${id}`) === 'list' ? 'list' : 'scene');
export const setSceneMode31 = (id: string, m: SceneMode31): void => lsSet(`vtn31-scene:${id}`, m);
const showAll31 = (): boolean => lsGet('vtn31-scene-all') === '1';
const labelsOn31 = (s: GameState): boolean => { const v = lsGet('vtn31-scene-labels'); return v === null ? labelsDefault31(s) : v === '1'; };

/** Executa o destino de uma área (painel na cena, painel rápido, projeto, ficha, aba ou área). */
export function runGo31(g: Go31s, panels: Record<string, (() => void) | undefined> = {}): void {
  if (g.panel) {
    const [k, arg] = g.panel.split(':');
    const f = panels[g.panel] ?? panels[k];
    if (f) { (f as (a?: string) => void)(arg); return; }
  }
  if (g.quick) { quickHook31.open?.(g.quick, g.focus); return; }
  if (g.hub) { goToHub(g.hub.actId, g.hub.pid); return; }
  if (g.tab) setTab(g.tab[0], g.tab[1]);
  if (g.act && !g.area) { store.selectedAct = g.act; }
  if (g.area) {
    const ev = new CustomEvent('vtn31-go', { detail: g.area, cancelable: true });
    if (document.dispatchEvent(ev)) { store.area = g.area as typeof store.area; rerender(); }
  }
}

/** Pinta um buffer de pixels no canvas (tamanho lógico; o CSS amplia sem suavizar). */
export function blitPx31(cv: HTMLCanvasElement, d: Uint32Array, W: number, H: number): CanvasRenderingContext2D | null {
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(W, H);
  new Uint32Array(img.data.buffer).set(d);
  ctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

export interface SceneOpts31 {
  id: string;
  title: L;
  W: number; H: number;
  spots: Spot31[];
  paint: (cv: HTMLCanvasElement) => void;
  /** painéis curtos dentro da cena (a ação se resolve ali) */
  panels?: Record<string, ((arg?: string) => void) | undefined>;
  /** a alternativa em lista (pular a cena) */
  list: () => HTMLElement;
  /** o que a cena é, em uma frase (primeira visita) */
  intro: L;
  /** linha de legenda escrita abaixo da cena */
  legend?: HTMLElement | null;
  /** controles extras na barra (ex.: escolher turnê) */
  tools?: HTMLElement | null;
  /** aviso por cima (ex.: "você está em turnê") */
  note?: L;
  aspect?: string;
}

const pct = (v: number, of: number): string => `${((v / of) * 100).toFixed(3)}%`;
const PAD = 3; // área de clique maior que o desenho

function spotEl(o: SceneOpts31, sp: Spot31, labels: boolean): HTMLElement {
  const x = sp.x - PAD, y = sp.y - PAD, w = sp.w + PAD * 2, hh = sp.h + PAD * 2;
  const b = sp.badge;
  const lv = b ? ALERT31[b.level] : null;
  const btxt = b ? (typeof b.text === 'string' ? b.text : t(b.text)) : '';
  const say = [t(sp.label), b ? `${[badgeSym31(b), btxt].filter(Boolean).join(' ')} (${t(lv!.name)})` : '', t(sp.tip)].filter(Boolean).join(' — ');
  const btn = h('button', {
    type: 'button', class: `sc31-spot${b ? ` lvl-${b.level}` : ''}${personSpot31(sp) ? ' sc31-person' : ''}`, 'data-spot': sp.id, 'aria-label': say, title: say,
    style: `left:${pct(x, o.W)};top:${pct(y, o.H)};width:${pct(w, o.W)};height:${pct(hh, o.H)}`,
    onclick: (e: Event) => { e.stopPropagation(); runGo31(sp.go, o.panels as Record<string, () => void>); },
    oncontextmenu: (e: Event) => { e.preventDefault(); e.stopPropagation(); if (sp.quick) quickHook31.open?.(sp.quick); else runGo31(sp.go, o.panels as Record<string, () => void>); },
  },
  b ? h('span', { class: `sc31-badge lvl-${b.level}`, 'aria-hidden': 'true' }, badgeSym31(b) ? h('i', null, badgeSym31(b)) : null, badgeSym31(b) && btxt ? ' ' : '', btxt) : null,
  h('span', { class: 'sc31-tip', 'aria-hidden': 'true' }, h('b', null, t(sp.label)), ' — ', t(sp.tip)));
  void labels;
  return btn;
}

/** R31 onda 5 (CENAS5): um ponto no jogo explorável — o bloqueio vira selo no próprio objeto (antes do clique). */
function spotEl5(o: SceneOpts31, sp: Spot31): HTMLElement {
  const lk = splitLock5(sp.tip);
  const btn = spotEl(o, { ...sp, tip: lk.tip }, false);
  if (!lk.lock) return btn;
  const why = t(lk.lock);
  btn.classList.add('sc5-locked');
  btn.setAttribute('aria-label', `${btn.getAttribute('aria-label') ?? ''} — ${t(l('bloqueado', 'locked'))}: ${why}`);
  btn.title = btn.getAttribute('aria-label') ?? '';
  btn.append(h('span', { class: 'sc5-lock', 'aria-hidden': 'true' }, ic('lock')));
  btn.querySelector('.sc31-tip')?.append(h('span', { class: 'sc5-tlk' }, ic('lock'), ' ', why));
  return btn;
}

/** R31 onda 5 (CENAS5): com exp5.nav ligado a cena é SÓ o cenário — sem barra (Cena/lista, mostrar clicáveis, rótulos),
 *  sem a caixa de ajuda e sem a lista de pontos. Rótulos e "tudo que é clicável" aparecem com Alt (e no passar do
 *  mouse/foco); a ajuda vai para o "?" da casca; Tab e setas percorrem os pontos na ordem de leitura. */
function sceneNav5(s: GameState, o: SceneOpts31): HTMLElement {
  setHelp5(o.id, help5Of(o.title, o.intro, o.spots, o.legend?.textContent?.trim() || undefined));
  const cv = h('canvas', { class: 'sc31-cv px', 'aria-hidden': 'true' }) as HTMLCanvasElement;
  try { o.paint(cv); } catch (e) { console.error('cena', o.id, e); }
  const lab = h('div', { class: 'sc31-labels sc5-labels', 'aria-hidden': 'true' });
  const relabel = (px: number): void => {
    const sc = Math.max(1, px / o.W);
    lab.replaceChildren(...placeLabels31(o.spots, o.W, o.H, sc, (sp) => t(sp.label)).map((b) => h('span', {
      class: 'sc31-label', title: b.text !== b.full ? b.full : undefined,
      style: `left:${pct(b.x, o.W)};top:${pct(b.y, o.H)};width:${pct(b.w, o.W)}`,
    }, b.text)));
  };
  // ordem de leitura = ordem do Tab; nenhum ponto fica de fora (nem os "quietos")
  const layer = h('div', { class: 'sc31-layer', role: 'group', 'aria-label': t(o.title) }, sorted5(o.spots).map((sp) => spotEl5(o, sp)));
  arrows5(layer, o.spots);
  const stage = h('div', { class: 'sc31-stage sc5-stage' }, cv, layer, lab);
  const fit = h('div', { class: 'sc5-fit' }, stage);
  relabel(Math.min(960, o.W * 4));
  fit5(fit, stage, o.W, o.H, relabel);
  return h('section', { class: `sc31 sc31-${o.id} sc5`, 'aria-label': t(o.title), 'data-help5': o.id },
    o.tools || o.note ? h('div', { class: 'sc5-top' }, o.tools ?? null, o.note ? h('p', { class: 'sc5-note', role: 'status' }, t(o.note)) : null) : null,
    fit);
}

/** A cena inteira (ou a lista, quando a pessoa prefere pular a cena). */
export function sceneView31(s: GameState, o: SceneOpts31): HTMLElement {
  if (nav5On(s)) return sceneNav5(s, o); // R31 onda 5 (CENAS5): só o cenário navegável
  const root = h('section', { class: `sc31 sc31-${o.id}`, 'aria-label': t(o.title) });
  const draw = (): void => {
    const mode = sceneMode31(o.id);
    const labels = labelsOn31(s);
    const all = showAll31();
    const seen = lsGet(`vtn31-seen:${o.id}`) === '1';
    const bar = h('div', { class: 'sc31-bar', role: 'toolbar', 'aria-label': t(l('Opções da cena', 'Scene options')) },
      h('div', { class: 'sc31-seg', role: 'group', 'aria-label': t(l('Como ver', 'How to view')) },
        h('button', { type: 'button', class: 'btn small ghost', 'aria-pressed': mode === 'scene' ? 'true' : 'false', onclick: () => { setSceneMode31(o.id, 'scene'); draw(); } }, t(l('Cena', 'Scene'))),
        h('button', { type: 'button', class: 'btn small ghost', 'aria-pressed': mode === 'list' ? 'true' : 'false', onclick: () => { setSceneMode31(o.id, 'list'); draw(); } }, t(l('Ver como lista', 'View as list')))),
      mode === 'scene' ? h('label', { class: 'sc31-opt' }, h('input', { type: 'checkbox', checked: all ? true : undefined, onchange: (e: Event) => { lsSet('vtn31-scene-all', (e.target as HTMLInputElement).checked ? '1' : '0'); draw(); } }), ' ', t(l('Mostrar tudo que é clicável', 'Show everything clickable'))) : null,
      mode === 'scene' ? h('label', { class: 'sc31-opt' }, h('input', { type: 'checkbox', checked: labels ? true : undefined, onchange: (e: Event) => { lsSet('vtn31-scene-labels', (e.target as HTMLInputElement).checked ? '1' : '0'); draw(); } }), ' ', t(l('Rótulos', 'Labels'))) : null,
      mode === 'scene' && seen ? h('button', { type: 'button', class: 'btn small ghost', title: t(l('O que é cada objeto', 'What each object is')), onclick: () => { lsSet(`vtn31-seen:${o.id}`, '0'); draw(); } }, '?') : null,
      o.tools ?? null);
    if (mode === 'list') { root.replaceChildren(bar, o.list()); return; }
    const cv = h('canvas', { class: 'sc31-cv px', 'aria-hidden': 'true' }) as HTMLCanvasElement;
    try { o.paint(cv); } catch (e) { console.error('cena', o.id, e); }
    // R31 (POL): rótulos numa camada própria, posicionados sem colisão e abreviados sem cortar palavra (placeLabels31);
    // o que não couber some do desenho e continua no passar do mouse, no foco e na lista de pontos
    const lab = h('div', { class: 'sc31-labels', 'aria-hidden': 'true' });
    const relabel = (px: number): void => {
      if (!labels) { lab.replaceChildren(); return; }
      const sc = Math.max(1, px / o.W);
      lab.replaceChildren(...placeLabels31(o.spots, o.W, o.H, sc, (sp) => t(sp.label)).map((b) => h('span', {
        class: 'sc31-label', title: b.text !== b.full ? b.full : undefined,
        style: `left:${pct(b.x, o.W)};top:${pct(b.y, o.H)};width:${pct(b.w, o.W)}`,
      }, b.text)));
    };
    const stage = h('div', { class: `sc31-stage${all ? ' show-all' : ''}`, style: `aspect-ratio:${o.W} / ${o.H}` }, cv,
      h('div', { class: 'sc31-layer' }, o.spots.map((sp) => spotEl(o, sp, labels))), lab);
    relabel(Math.min(960, o.W * 4));
    if (typeof ResizeObserver === 'function') {
      let last = 0;
      const ro = new ResizeObserver((es) => { const wd = Math.round(es[0]?.contentRect.width ?? 0); if (!stage.isConnected && last) { ro.disconnect(); return; } if (wd > 0 && Math.abs(wd - last) > 8) { last = wd; relabel(wd); } });
      ro.observe(stage);
    }
    const intro = !seen ? h('div', { class: 'sc31-intro', role: 'note' },
      h('p', null, h('b', null, t(o.title)), ' — ', t(o.intro)),
      h('ul', null, [...new Map(o.spots.filter((x) => !x.id.includes(':')).map((x) => [x.id, x])).values()].map((x) => h('li', null, h('b', null, t(x.label)), ': ', t(x.tip)))),
      h('button', { type: 'button', class: 'btn small', onclick: () => { lsSet(`vtn31-seen:${o.id}`, '1'); draw(); } }, t(l('Entendi', 'Got it')))) : null;
    // lista acessível dos pontos: o mesmo registro que desenha a cena (também é o caminho de 2 cliques)
    const pts = h('details', { class: 'sc31-pts' },
      h('summary', null, t(l('Pontos desta cena ({n})', 'Points in this scene ({n})'), { n: o.spots.length })),
      h('ul', null, o.spots.map((sp) => h('li', null, h('button', { type: 'button', class: 'link', onclick: () => runGo31(sp.go, o.panels as Record<string, () => void>) },
        sp.badge ? `${[badgeSym31(sp.badge), typeof sp.badge.text === 'string' ? sp.badge.text : t(sp.badge.text)].filter(Boolean).join(' ')} · ` : '', h('b', null, t(sp.label))), ' ', h('small', { class: 'muted' }, t(sp.tip))))));
    root.replaceChildren(...[bar, o.note ? h('p', { class: 'sc31-note', role: 'status' }, t(o.note)) : null, intro, h('div', { class: 'sc31-scroll' }, stage), o.legend ?? null, pts].filter((x): x is HTMLElement => !!x));
  };
  draw();
  return root;
}

/** Botão "abrir em lista detalhada" padrão (rodapé de painéis). */
export const moreBtn31 = (label: L, on: () => void): HTMLElement => h('button', { type: 'button', class: 'btn small ghost', onclick: on }, t(label), ' →');
