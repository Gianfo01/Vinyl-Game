// Canvas animado de um local: fundo, móveis, plateia que balança de leve, personagens nos pontos
// e efeitos (confete, disco de ouro, ônibus partindo, flash). Respeita movimento reduzido: um único
// quadro estático. Escala inteira via CSS (image-rendering: pixelated).

import { h } from '../../dom';
import { avatarSprite, randomLook, type Dir, type Pose, type Role } from '../avatar';
import { C, css } from '../px';
import type { Appearance } from '../../../sim/types';
import { H, W } from './kit';
import type { PlaceKind } from '../../../sim/sys/scenes/state';
import { buildPlace } from './index';

export interface Actor {
  look: Appearance;
  role?: Role | null;
  spot: string;
  pose?: Pose;
  dir?: Dir;
  /** destaque (seta acima da cabeça) */
  mark?: boolean;
}

export type PlaceFx = 'confetti' | 'gold' | 'bus' | 'flash' | 'spot' | 'bell' | 'none';

export interface PlaceViewOpts {
  year: number;
  variant?: number;
  actors?: Actor[];
  fx?: PlaceFx;
  /** 0..1: energia da plateia */
  energy?: number;
  alt: string;
  /** classe extra */
  cls?: string;
}

const reduced = () => document.documentElement.classList.contains('reduced-motion');

/** Cria o canvas do local. O laço de animação para sozinho quando o canvas sai da página. */
export function placeView(kind: PlaceKind, o: PlaceViewOpts): HTMLElement {
  const model = buildPlace(kind, o.year, o.variant ?? 0);
  const cv = h('canvas', { width: W, height: H, class: 'px place-canvas', role: 'img', 'aria-label': o.alt });
  if (model.filter) cv.style.filter = model.filter;
  const ctx = cv.getContext('2d');
  const wrap = h('figure', { class: `place-view ${o.cls ?? ''}` }, cv, h('figcaption', { class: 'sr-only' }, o.alt));
  if (!ctx) return wrap;
  ctx.imageSmoothingEnabled = false;
  const energy = o.energy ?? 0.5;
  const year = o.year;
  const actors = (o.actors ?? []).filter((a) => model.spots[a.spot]);
  const draw = (t: number) => {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(model.bg, 0, 0);
    // luzes que piscam
    for (const b of model.blinks) {
      const on = reduced() ? 1 : (Math.sin(t * b.rate * Math.PI * 2 + b.x) + 1) / 2;
      if (on < 0.35) continue;
      ctx.fillStyle = css(b.col);
      ctx.globalAlpha = on;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.globalAlpha = 1;
    }
    type Item = { y: number; draw: () => void };
    const items: Item[] = [];
    for (const pr of model.props) items.push({ y: pr.y, draw: () => ctx.drawImage(pr.sprite.c, pr.x - pr.sprite.ax, pr.y - pr.sprite.ay) });
    for (const m of model.crowd) {
      const bob = reduced() ? 0 : Math.round(Math.max(0, Math.sin(t * (2 + energy * 4) + m.phase)) * m.hop * (1 + energy * 2));
      const sp = avatarSprite(randomLook(m.seed), { year, pose: m.pose, dir: m.dir, role: m.role ?? null, frame: reduced() ? 0 : Math.floor(t * 2 + m.phase) % 4, synthetic: m.role === 'synthetic' });
      items.push({ y: m.y, draw: () => ctx.drawImage(sp.c, m.x - sp.ax, m.y - sp.ay - bob) });
    }
    for (const a of actors) {
      const s = model.spots[a.spot];
      const pose = a.pose ?? s.pose ?? 'stand';
      const sp = avatarSprite(a.look, { year, role: a.role ?? null, pose, dir: a.dir ?? s.dir, frame: reduced() ? 0 : Math.floor(t * 3) % 4 });
      const bob = reduced() || pose !== 'play' ? 0 : Math.round(Math.max(0, Math.sin(t * 5)));
      items.push({ y: s.y + 0.5, draw: () => {
        ctx.drawImage(sp.c, s.x - sp.ax, s.y - sp.ay - bob);
        if (a.mark) {
          ctx.fillStyle = '#ffd040';
          const ty = s.y - sp.ay - 4 - (reduced() ? 0 : Math.round(Math.sin(t * 4)));
          ctx.fillRect(s.x - 2, ty, 5, 1);
          ctx.fillRect(s.x - 1, ty + 1, 3, 1);
          ctx.fillRect(s.x, ty + 2, 1, 1);
        }
      } });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    ctx.drawImage(model.fg, 0, 0);
    fx(ctx, o.fx ?? 'none', t);
  };
  let raf = 0;
  let start = 0;
  let lastDraw = 0;
  const loop = (now: number) => {
    if (!cv.isConnected && start) return;
    if (!start) start = now;
    // ritmo de pixel art: ~12 quadros por segundo
    if (now - lastDraw >= 80) {
      lastDraw = now;
      draw((now - start) / 1000);
    }
    if (!reduced()) raf = requestAnimationFrame(loop);
  };
  draw(0);
  if (!reduced() && typeof requestAnimationFrame === 'function') {
    // espera entrar na página para animar
    raf = requestAnimationFrame(loop);
  }
  void raf;
  return wrap;
}

const CONF = ['#e05a4e', '#ffd040', '#4ab0e0', '#6cc35a', '#e85ac8', '#ffffff'];

function fx(ctx: CanvasRenderingContext2D, kind: PlaceFx, t: number): void {
  const still = reduced();
  if (kind === 'confetti') {
    for (let i = 0; i < 70; i++) {
      const x = (i * 53 + Math.sin(t * 1.5 + i) * 6) % W;
      const y = still ? (i * 29) % H : ((i * 37 + t * (30 + (i % 5) * 8)) % (H + 10)) - 6;
      ctx.fillStyle = CONF[i % CONF.length];
      ctx.fillRect(Math.round(x), Math.round(y), i % 3 ? 2 : 1, i % 2 ? 1 : 2);
    }
  } else if (kind === 'gold') {
    // disco de ouro emoldurado subindo ao centro
    const k = still ? 1 : Math.min(1, t / 1.2);
    const cy = Math.round(H / 2 + (1 - k) * 40);
    ctx.fillStyle = '#3a2a14';
    ctx.fillRect(W / 2 - 22, cy - 22, 44, 44);
    ctx.fillStyle = '#e3c057';
    ctx.fillRect(W / 2 - 20, cy - 20, 40, 40);
    ctx.fillStyle = '#1a1208';
    ctx.fillRect(W / 2 - 18, cy - 18, 36, 36);
    ctx.fillStyle = '#f0c840';
    ctx.beginPath();
    ctx.arc(W / 2, cy, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b08820';
    ctx.beginPath();
    ctx.arc(W / 2, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e05a4e';
    ctx.fillRect(W / 2 - 2, cy - 2, 4, 4);
    if (!still) {
      const a = t * 3;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(W / 2 + Math.cos(a) * 12), Math.round(cy + Math.sin(a) * 12), 2, 2);
    }
    if (k >= 1) fx(ctx, 'confetti', t);
  } else if (kind === 'bus') {
    // ônibus atravessa a cena da esquerda para a direita (some e volta)
    const x = still ? W / 2 - 40 : ((t * 40) % (W + 120)) - 100;
    const y = 96;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(Math.round(x) - 1, y - 1, 82, 30);
    ctx.fillStyle = '#e8902c';
    ctx.fillRect(Math.round(x), y, 80, 24);
    ctx.fillStyle = '#2a3448';
    for (let i = 0; i < 5; i++) ctx.fillRect(Math.round(x) + 6 + i * 14, y + 5, 10, 8);
    ctx.fillStyle = '#1a1a1a';
    for (const wx of [14, 62]) {
      ctx.beginPath();
      ctx.arc(Math.round(x) + wx, y + 25, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!still) {
      ctx.fillStyle = 'rgba(200,200,200,0.5)';
      for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(x) - 6 - i * 6, y + 18 - (i % 2) * 3, 4, 3);
    }
  } else if (kind === 'flash') {
    if (!still && Math.sin(t * 7) > 0.92) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(0, 0, W, H);
    }
  } else if (kind === 'spot') {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, W, H);
  } else if (kind === 'bell') {
    const sw = still ? 0 : Math.sin(t * 10) * 3;
    ctx.fillStyle = css(C('#e3c057'));
    ctx.fillRect(W / 2 - 4 + Math.round(sw), 44, 8, 6);
  }
}
