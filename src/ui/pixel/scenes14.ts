// Rodada 14 — cenas ilustradas em pixel art reutilizáveis: scene14(kind, opts) devolve um quadro
// animado (só enquanto visível; parado com movimento reduzido) com pontos de interesse: passar o
// mouse mostra uma dica, clicar leva à tela relacionada (ou troca de sala no próprio quadro).

import './scenes14.css';
import { t } from '../../i18n/strings';
import { h } from '../dom';
import { store } from '../store';
import { rerender } from '../common';
import { setTab } from '../vis';
import { openScene } from '../registry';
import { avatarSprite, randomLook } from './avatar';
import { PALETTES, eraOf } from './palette';
import { css } from './px';
import { H, W } from './places/kit';
import { buildPlace } from './places/index';
import { newCtx, finish, type PlaceModel } from './places/model';
import * as R14 from './places/rooms14';
import { sceneSpec14, type Hotspot14, type Nav14, type Scene14, type SceneOpts14 } from './spec14';

export { sceneSpec14, sceneOfCat14, venueTier14, mediaPlace14, landmarks14, type Scene14, type SceneOpts14, type SceneSpec14, type Hotspot14 } from './spec14';

export interface SceneView14 extends SceneOpts14 {
  /** banner: quadro + texto ao lado; card: quadro com legenda; thumb: miniatura que abre a cena grande */
  size?: 'banner' | 'card' | 'thumb';
  /** 0..1: energia da plateia (padrão: lotação) */
  energy?: number;
  /** texto extra na legenda */
  note?: string;
}

const cache = new Map<string, PlaceModel>();

function model14(kind: Scene14, o: SceneOpts14): PlaceModel {
  const spec = sceneSpec14(kind, o);
  if (spec.place) return buildPlace(spec.place, o.year, o.variant ?? 0);
  const era = eraOf(o.year);
  const dec = Math.floor(o.year / 10);
  const key = `${kind}|${era}|${dec}|${o.cityId ?? ''}|${o.variant ?? 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = newCtx(PALETTES[era], o.year, o.variant ?? 0);
  if (kind === 'studio_control') R14.studioControl(c);
  else if (kind === 'studio_live') R14.studioLive(c);
  else if (kind === 'home' || kind === 'garage') R14.home(c, kind === 'garage');
  else if (kind === 'city') R14.city(c, o.cityId ?? '');
  else R14.press(c);
  c.p.outline(PALETTES[era].outline);
  const m = finish(c);
  cache.set(key, m);
  if (cache.size > 40) cache.delete(cache.keys().next().value as string);
  return m;
}

const reduced = () => typeof document !== 'undefined' && document.documentElement.classList.contains('reduced-motion');

/** Vai para a área/aba (fecha janelas abertas). */
function go14(to: Exclude<Nav14, { swap: Scene14 }>): void {
  document.querySelectorAll('.overlay, .scene-overlay').forEach((x) => x.remove());
  if (to.tab) setTab(to.tab[0], to.tab[1]);
  store.area = to.area;
  rerender();
  (document.getElementById('main') as HTMLElement | null)?.focus?.();
}

/** Canvas animado do modelo, com gente nos pontos da cena e plateia proporcional à lotação. */
function canvas14(kind: Scene14, o: SceneView14, alt: string): HTMLCanvasElement {
  const model = model14(kind, o);
  const spec = sceneSpec14(kind, o);
  const cv = h('canvas', { width: W, height: H, class: 'px s14-canvas', role: 'img', 'aria-label': alt });
  if (model.filter) cv.style.filter = model.filter;
  const ctx = cv.getContext('2d');
  if (!ctx) return cv;
  ctx.imageSmoothingEnabled = false;
  const year = o.year;
  const energy = o.energy ?? spec.fill;
  const crowd = model.crowd.filter((_, i) => ((i * 0.618034) % 1) < spec.fill);
  const people = Object.entries(model.spots).map(([k, sp]) => ({ sp, look: randomLook(`s14-${kind}-${k}-${o.variant ?? 0}`) }));
  const draw = (tm: number) => {
    const still = reduced();
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(model.bg, 0, 0);
    for (const b of model.blinks) {
      const on = still ? 1 : (Math.sin(tm * b.rate * Math.PI * 2 + b.x) + 1) / 2;
      if (on < 0.35) continue;
      ctx.globalAlpha = on;
      ctx.fillStyle = css(b.col);
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.globalAlpha = 1;
    }
    const items: { y: number; d: () => void }[] = [];
    for (const pr of model.props) items.push({ y: pr.y, d: () => ctx.drawImage(pr.sprite.c, pr.x - pr.sprite.ax, pr.y - pr.sprite.ay) });
    for (const m of crowd) {
      const bob = still ? 0 : Math.round(Math.max(0, Math.sin(tm * (2 + energy * 4) + m.phase)) * m.hop * (1 + energy * 2));
      const sp = avatarSprite(randomLook(m.seed), { year, pose: m.pose, dir: m.dir, role: m.role ?? null, frame: still ? 0 : Math.floor(tm * 2 + m.phase) % 4 });
      items.push({ y: m.y, d: () => ctx.drawImage(sp.c, m.x - sp.ax, m.y - sp.ay - bob) });
    }
    for (const p of people) {
      const pose = p.sp.pose ?? 'stand';
      const sp = avatarSprite(p.look, { year, role: null, pose, dir: p.sp.dir, frame: still ? 0 : Math.floor(tm * 3) % 4 });
      const bob = still || pose !== 'play' ? 0 : Math.round(Math.max(0, Math.sin(tm * 5)));
      items.push({ y: p.sp.y + 0.5, d: () => ctx.drawImage(sp.c, p.sp.x - sp.ax, p.sp.y - sp.ay - bob) });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.d();
    ctx.drawImage(model.fg, 0, 0);
  };
  draw(0);
  if (reduced() || typeof requestAnimationFrame !== 'function') return cv;
  // anima só enquanto está na tela (e a aba está visível); ~12 quadros por segundo
  let visible = false, running = false, start = 0, last = 0;
  const loop = (now: number) => {
    if (!cv.isConnected && start) { running = false; io?.disconnect(); return; }
    if (!visible || reduced() || document.hidden) { running = false; return; }
    if (!start) start = now;
    if (now - last >= 80) { last = now; draw((now - start) / 1000); }
    requestAnimationFrame(loop);
  };
  const kick = () => { if (!running && visible) { running = true; requestAnimationFrame(loop); } };
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); kick(); }) : null;
  if (io) io.observe(cv);
  else { visible = true; kick(); }
  return cv;
}

/** Camada de pontos de interesse sobre o quadro. */
function hotspots(spots: Hotspot14[], onSwap: (k: Scene14) => void): HTMLElement {
  const tip = h('div', { class: 's14-tip', role: 'tooltip', hidden: true });
  const layer = h('div', { class: 's14-spots' });
  const show = (hs: Hotspot14, el: HTMLElement) => {
    tip.replaceChildren(...[h('b', null, t(hs.label)), h('span', null, t(hs.tip)), hs.to ? h('small', null, t({ pt: 'Clique para abrir', en: 'Click to open' })) : null].filter((x): x is HTMLElement => !!x));
    tip.hidden = false;
    const left = (hs.x + hs.w / 2) / W;
    tip.style.left = `${Math.max(12, Math.min(88, left * 100))}%`;
    tip.style.top = `${Math.min(92, ((hs.y + hs.h) / H) * 100)}%`;
    tip.classList.toggle('up', hs.y + hs.h > H * 0.7);
  };
  const hide = () => { tip.hidden = true; };
  for (const hs of spots) {
    const b = h('button', {
      class: `s14-spot ${hs.to ? 'go' : ''}`, type: 'button', 'aria-label': `${t(hs.label)} — ${t(hs.tip)}`,
      style: `left:${(hs.x / W) * 100}%;top:${(hs.y / H) * 100}%;width:${(hs.w / W) * 100}%;height:${(hs.h / H) * 100}%`,
      onclick: (e: Event) => { e.stopPropagation(); if (!hs.to) return; if ('swap' in hs.to) onSwap(hs.to.swap); else go14(hs.to); },
    });
    b.addEventListener('pointerenter', () => show(hs, b));
    b.addEventListener('focus', () => show(hs, b));
    b.addEventListener('pointerleave', hide);
    b.addEventListener('blur', hide);
    layer.appendChild(b);
  }
  layer.appendChild(tip);
  return layer;
}

/** Cena ilustrada reutilizável (estúdio, show, mídia, loja, fábrica, casa, garagem, cidade, prêmio, coletiva). */
export function scene14(kind: Scene14, o: SceneView14): HTMLElement {
  const spec = sceneSpec14(kind, o);
  const size = o.size ?? 'banner';
  const title = t(spec.title);
  const alt = `${title}. ${t(spec.gear)}. ${t(spec.fashion)}.`;
  const cv = canvas14(kind, o, alt);
  if (size === 'thumb') {
    return h('button', { class: 's14 s14-thumb', type: 'button', title: `${title} — ${t({ pt: 'ampliar', en: 'enlarge' })}`, 'aria-label': `${title}: ${t({ pt: 'ampliar cena', en: 'enlarge scene' })}`,
      onclick: () => openScene(spec.title, () => scene14(kind, { ...o, size: 'card' })) }, cv);
  }
  let root: HTMLElement;
  const stage = h('div', { class: 's14-stage' }, cv, hotspots(spec.hotspots, (k) => root.replaceWith(scene14(k, o))));
  const info = h('div', { class: 's14-info' },
    h('b', { class: 's14-title' }, title, h('small', null, ` · ${o.year}`)),
    h('div', { class: 's14-gear' }, t(spec.gear)),
    size === 'banner' ? h('div', { class: 's14-fashion muted small' }, t(spec.fashion)) : null,
    o.note ? h('div', { class: 'small' }, o.note) : null,
    size === 'banner' ? h('div', { class: 's14-hint muted small' }, t({ pt: 'Passe o mouse nos objetos; clique para ir à tela ligada a eles.', en: 'Hover objects; click to jump to the related screen.' })) : null);
  root = h('figure', { class: `s14 s14-${size} s14-k-${kind}`, 'data-era': spec.era }, stage, h('figcaption', null, info));
  return root;
}
