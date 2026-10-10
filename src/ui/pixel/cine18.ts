// Rodada 18 (cine18) — tocador de STORYBOARDS: desenha cada quadro (local-base do motor de lugares + atores com
// estado: figurino, idade, lesão, humor, holograma; objetos; efeitos; plateia com tamanho/humor/cartazes) num canvas
// 256×144 animado (~12 qps), com balões e legendas em HTML (acessíveis), indicados com retrato, envelope animado,
// controles (anterior, pausa, próximo, pular) e um "encaixe" para a decisão pendente do quadro. Movimento reduzido:
// quadros estáticos e sem avanço automático.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { Actor18, Board18, Frame18 } from '../../sim/sys/cine18';
import type { GameState } from '../../sim/types';
import { h } from '../dom';
import { avatarSprite, lookOf, portraitCanvas, randomLook } from './avatar';
import { drawText, fitText, textWidth } from './font';
import { buildPlace } from './places';
import { H, W } from './places/kit';
import { css } from './px';
import type { Appearance } from '../../sim/types';
import type { Sprite } from './px';
import './cine18.css';

const reduced = () => typeof document !== 'undefined' && document.documentElement.classList.contains('reduced-motion');
const T = (x: L | string | undefined) => (x === undefined ? '' : typeof x === 'string' ? x : t(x));

function lookFor(s: GameState, a: Actor18): Appearance {
  const p = a.pid ? s.persons[a.pid] : undefined;
  let look = p ? lookOf(p) : randomLook(a.seed ?? a.name ?? 'x');
  if (a.young) look = { ...look, ag: 0, gy: 0, bl: 0 };
  if (a.outfit) look = { ...look, outfit: a.outfit[0], outfitColor: a.outfit[1] };
  return look;
}

/** Cópia tingida (ciano/azulada) com linhas de varredura para hologramas e fantasmas de Pepper. */
const GHOSTS = new WeakMap<HTMLCanvasElement, Map<number, HTMLCanvasElement>>();
function ghostOf(sp: Sprite, kind: 1 | 2): HTMLCanvasElement {
  let m = GHOSTS.get(sp.c);
  if (!m) GHOSTS.set(sp.c, (m = new Map()));
  const hit = m.get(kind);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = sp.c.width; c.height = sp.c.height;
  const g = c.getContext('2d')!;
  g.drawImage(sp.c, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = kind === 2 ? 'rgba(80,240,230,0.55)' : 'rgba(190,210,255,0.6)';
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = 'rgba(0,0,0,0.55)';
  for (let y = 0; y < c.height; y += 2) g.fillRect(0, y, c.width, 1);
  m.set(kind, c);
  return c;
}

const HOP: Record<string, number> = { wild: 1.3, cheer: 0.7, mixed: 0.35, quiet: 0.08, boo: 0, grief: 0 };
const MOODC: Record<string, [string, string]> = { joy: ['!', '#ffd040'], angry: ['#', '#ff5040'], cry: [':(', '#7fb8ff'], sad: ['...', '#9fb0c8'], shock: ['!?', '#ffffff'], calm: ['', ''] };

/** Posição atual do ator (caminhando de x,y até `to`). */
function posOf(a: Actor18, k: number): [number, number] {
  if (!a.to) return [a.x, a.y];
  const e = Math.min(1, Math.max(0, k));
  return [Math.round(a.x + (a.to[0] - a.x) * e), Math.round(a.y + (a.to[1] - a.y) * e)];
}

/** Desenha um quadro no instante `tm` (segundos desde o início do quadro). */
export function drawFrame18(ctx: CanvasRenderingContext2D, s: GameState, f: Frame18, tm: number): void {
  const still = reduced();
  const model = buildPlace(f.place, f.year, f.variant ?? 0);
  const k = still ? 1 : Math.min(1, tm / Math.max(0.5, (f.ms / 1000) * 0.75));
  ctx.clearRect(0, 0, W, H);
  ctx.filter = model.filter ?? 'none';
  ctx.drawImage(model.bg, 0, 0);
  for (const b of model.blinks) {
    const on = still ? 1 : (Math.sin(tm * b.rate * Math.PI * 2 + b.x) + 1) / 2;
    if (on < 0.35) continue;
    ctx.fillStyle = css(b.col); ctx.globalAlpha = on; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.globalAlpha = 1;
  }
  props(ctx, s, f, tm, 'back');
  type Item = { y: number; draw: () => void };
  const items: Item[] = [];
  for (const pr of model.props) items.push({ y: pr.y, draw: () => ctx.drawImage(pr.sprite.c, pr.x - pr.sprite.ax, pr.y - pr.sprite.ay) });
  // plateia: tamanho e humor
  const n = Math.round(model.crowd.length * Math.max(0, Math.min(1, f.crowd.n)));
  const hop = HOP[f.crowd.mood] ?? 0.5;
  const stageA = f.actors.filter((a) => a.y < 100);
  const crowd = model.crowd.filter((m, i) => ((i * 7919) % model.crowd.length < n || n >= model.crowd.length)
    && !stageA.some((a) => Math.abs(m.x - a.x) < 16 && m.y > a.y && m.y - a.y < 26));
  crowd.forEach((m) => {
    const bob = still ? 0 : Math.round(Math.max(0, Math.sin(tm * (2 + hop * 4) + m.phase)) * m.hop * hop * 2.4);
    const sp = avatarSprite(randomLook(m.seed), { year: f.year, pose: m.pose, dir: m.dir, role: m.role ?? null, frame: still ? 0 : Math.floor(tm * 2 + m.phase) % 4, synthetic: m.role === 'synthetic' });
    items.push({ y: m.y, draw: () => ctx.drawImage(sp.c, m.x - sp.ax, m.y - sp.ay - bob) });
  });
  // atores
  for (const a of f.actors) {
    const [x, y] = posOf(a, k);
    const walking = !!a.to && k < 1;
    const sp = avatarSprite(lookFor(s, a), { year: f.year, pose: walking ? 'walk' : a.pose ?? 'stand', dir: a.dir ?? 'SE', frame: still ? 0 : Math.floor(tm * 4) % 4 });
    const bob = still || a.pose !== 'play' ? 0 : Math.round(Math.max(0, Math.sin(tm * 5)));
    items.push({ y: y + 0.5, draw: () => {
      if (a.ghost) {
        const g = ghostOf(sp, a.ghost);
        const fl = still ? 0.7 : a.ghost === 2 ? 0.55 + 0.25 * Math.sin(tm * 9) + (Math.sin(tm * 37) > 0.93 ? -0.35 : 0) : 0.4 + 0.12 * Math.sin(tm * 3);
        const jit = !still && Math.sin(tm * 23) > 0.95 ? 1 : 0;
        const sc = f.place === 'holo_stage' ? 1.25 : 1.6;
        ctx.globalAlpha = 0.14; ctx.fillStyle = a.ghost === 2 ? '#5ffff0' : '#c8d8ff';
        ctx.beginPath(); ctx.ellipse(x, y - sp.ay * sc / 2, 14 * sc, sp.ay * sc / 1.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = Math.max(0.15, Math.min(0.95, fl));
        ctx.drawImage(g, Math.round(x - sp.ax * sc + jit), Math.round(y - sp.ay * sc - bob), Math.round(g.width * sc), Math.round(g.height * sc));
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = a.ghost === 2 ? '#5ffff0' : '#c8d8ff';
        ctx.beginPath(); ctx.ellipse(x, y, 9, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      } else ctx.drawImage(sp.c, x - sp.ax, y - sp.ay - bob);
      if (a.inj && !a.ghost) { ctx.fillStyle = '#f4f4f0'; ctx.fillRect(x - 3, y - sp.ay + 5, 7, 2); ctx.fillStyle = '#d03030'; ctx.fillRect(x + 1, y - sp.ay + 5, 1, 1); }
      if (a.mark && !a.ghost) {
        ctx.fillStyle = '#ffd040';
        const ty = y - sp.ay - 4 - (still ? 0 : Math.round(Math.sin(tm * 4)));
        ctx.fillRect(x - 2, ty, 5, 1); ctx.fillRect(x - 1, ty + 1, 3, 1); ctx.fillRect(x, ty + 2, 1, 1);
      }
      const mc = a.mood ? MOODC[a.mood] : undefined;
      if (mc && mc[0] && tm > 0.4) drawText(ctx, mc[0], x + 5, y - sp.ay - 2 - (still ? 0 : Math.round(Math.abs(Math.sin(tm * 3)))), mc[1]);
    } });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  ctx.drawImage(model.fg, 0, 0);
  ctx.filter = 'none';
  props(ctx, s, f, tm, 'front');
  signs(ctx, f, crowd.map((m) => [m.x, m.y]), tm);
  for (const fx of f.fx) effect(ctx, fx, f, tm, k);
  if (f.banner) { const w = textWidth(f.banner) + 6; ctx.fillStyle = 'rgba(10,8,20,0.8)'; ctx.fillRect(W / 2 - w / 2, 2, w, 9); drawText(ctx, f.banner, W / 2 - w / 2 + 3, 4, '#ffd040'); }
}

function signs(ctx: CanvasRenderingContext2D, f: Frame18, spots: number[][], tm: number): void {
  const ss = f.crowd.signs ?? [];
  if (!ss.length || !spots.length) return;
  const bad = f.props.includes('protest') || f.crowd.mood === 'mixed' || f.crowd.mood === 'boo';
  const byX = spots.slice().sort((p, q) => p[0] - q[0]);
  const nS = Math.min(3, ss.length);
  ss.slice(0, 3).forEach((txt, i) => {
    const sp = byX[Math.floor(((i + 0.5) / nS) * byX.length) % byX.length];
    const tx = fitText(txt, 54);
    const w = textWidth(tx) + 4;
    const x = Math.max(1, Math.min(W - w - 1, sp[0] - w / 2));
    const y = sp[1] - 46 + (reduced() ? 0 : Math.round(Math.sin(tm * 3 + i) * 1.5));
    ctx.fillStyle = '#5a4030'; ctx.fillRect(sp[0], y + 7, 1, 10);
    ctx.fillStyle = bad && i < 2 ? '#f4e6d0' : '#fff6a8'; ctx.fillRect(x, y, w, 8);
    drawText(ctx, tx, x + 2, y + 2, bad && i < 2 ? '#c02020' : '#202040');
  });
}

function props(ctx: CanvasRenderingContext2D, s: GameState, f: Frame18, tm: number, layer: 'back' | 'front'): void {
  const still = reduced();
  for (const p of f.props) {
    if (layer === 'back') {
      if (p === 'carpet') { ctx.fillStyle = '#9a1c22'; ctx.beginPath(); ctx.moveTo(116, 88); ctx.lineTo(140, 88); ctx.lineTo(176, 144); ctx.lineTo(80, 144); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#d4a63c'; ctx.fillRect(80, 142, 96, 2); }
      else if (p === 'screen') {
        ctx.fillStyle = '#0c1020'; ctx.fillRect(84, 6, 88, 40); ctx.fillStyle = '#20406a'; ctx.fillRect(86, 8, 84, 36);
        const who = f.pic ?? f.actors.find((a) => a.ghost)?.pid ?? f.noms?.find((n) => n.win || n.mine)?.pid;
        const p0 = who ? s.persons[who] : undefined;
        if (p0) { const sp = avatarSprite(lookOf(p0), { year: f.year, dir: 'SE' }); ctx.globalAlpha = 0.85; ctx.drawImage(sp.c, 128 - sp.ax, 44 - sp.ay); ctx.globalAlpha = 1; }
      } else if (p === 'chart') {
        ctx.fillStyle = '#1a1840'; ctx.fillRect(18, 18, 70, 46);
        for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 0 ? '#ffd040' : '#8a88c8'; ctx.fillRect(34, 24 + i * 13, i === 0 ? 46 : 36 - i * 6, 8); drawText(ctx, String(i + 1), 24, 26 + i * 13, '#ffffff'); }
      } else if (p === 'glass') { ctx.fillStyle = 'rgba(190,225,255,0.16)'; ctx.beginPath(); ctx.moveTo(84, 30); ctx.lineTo(172, 30); ctx.lineTo(186, 92); ctx.lineTo(70, 92); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(220,240,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(70.5, 92); ctx.lineTo(84.5, 30); ctx.lineTo(171.5, 30); ctx.lineTo(185.5, 92); ctx.stroke(); }
      else if (p === 'table') { ctx.fillStyle = '#5a3a22'; ctx.fillRect(84, 94, 96, 10); ctx.fillStyle = '#3a2414'; ctx.fillRect(84, 104, 96, 3); }
      else if (p === 'barrier') { ctx.fillStyle = '#9aa0a8'; ctx.fillRect(0, 96, W, 2); for (let x = 4; x < W; x += 16) ctx.fillRect(x, 96, 1, 6); }
      continue;
    }
    if (p === 'rope') { for (const x of [92, 164]) { ctx.fillStyle = '#d4a63c'; for (let y = 96; y < 144; y += 16) ctx.fillRect(x + (y - 96) * (x < 128 ? -0.4 : 0.4), y, 2, 8); } }
    else if (p === 'cameras') { for (const [x, y] of [[22, 108], [40, 122], [212, 110], [230, 124]]) { ctx.fillStyle = '#18181c'; ctx.fillRect(x, y, 9, 6); ctx.fillStyle = '#6a7a8c'; ctx.fillRect(x + 3, y + 1, 3, 3); if (!still && Math.sin(tm * 11 + x) > 0.9) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, y - 2, 13, 10); } } }
    else if (p === 'podium') { ctx.fillStyle = '#4a2c18'; ctx.fillRect(120, 84, 18, 16); ctx.fillStyle = '#d4a63c'; ctx.fillRect(126, 89, 6, 4); ctx.fillStyle = '#2a2a2a'; ctx.fillRect(128, 74, 1, 10); }
    else if (p === 'trophy') { const x = 146, y = 84; ctx.fillStyle = '#e3c057'; ctx.fillRect(x, y - 2, 6, 2); ctx.fillRect(x + 2, y - 8, 2, 6); ctx.beginPath(); ctx.arc(x + 3, y - 10, 4, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 1, y - 11, 8, 1); }
    else if (p === 'mic') { ctx.fillStyle = '#2a2a2a'; ctx.fillRect(138, 72, 1, 14); ctx.fillRect(137, 71, 3, 2); }
    else if (p === 'casket') { ctx.fillStyle = '#3a2214'; ctx.fillRect(104, 94, 48, 12); ctx.fillStyle = '#6a4428'; ctx.fillRect(104, 94, 48, 3); ctx.fillStyle = '#d4a63c'; ctx.fillRect(112, 99, 2, 2); ctx.fillRect(142, 99, 2, 2); }
    else if (p === 'flowers') { const cols = ['#e05a4e', '#ffffff', '#f0c840', '#e070a8']; for (let i = 0; i < 18; i++) { ctx.fillStyle = cols[i % 4]; ctx.fillRect(96 + ((i * 37) % 64), 106 + ((i * 13) % 6), 2, 2); } }
    else if (p === 'candles') { for (let i = 0; i < 14; i++) { const x = 12 + i * 17, y = 136 - (i % 3) * 3; ctx.fillStyle = '#f4f0e0'; ctx.fillRect(x, y, 2, 4); ctx.fillStyle = still || Math.sin(tm * 9 + i) > -0.6 ? '#ffc040' : '#ff8020'; ctx.fillRect(x, y - 2, 2, 2); } }
    else if (p === 'pen') { ctx.fillStyle = '#f4f0e0'; ctx.fillRect(120, 92, 14, 4); ctx.fillStyle = '#18181c'; ctx.fillRect(126, 90, 1, 4); }
    else if (p === 'gavel') { const up = !still && Math.sin(tm * 4) > 0.6; ctx.fillStyle = '#5a3a22'; ctx.fillRect(138, up ? 60 : 64, 8, 3); ctx.fillRect(141, up ? 63 : 67, 2, 5); }
    else if (p === 'lightsticks') { for (let i = 0; i < 26; i++) { ctx.fillStyle = still || Math.sin(tm * 6 + i) > 0 ? '#ff7ad0' : '#a05cff'; ctx.fillRect(8 + i * 9.5, 104 + (i % 3) * 9 - (still ? 0 : Math.round(Math.abs(Math.sin(tm * 4 + i)) * 2)), 1, 3); } }
    else if (p === 'umbrellas') { for (const x of [30, 70, 190, 226]) { ctx.fillStyle = x % 20 ? '#2a2a3a' : '#7a1a2a'; ctx.beginPath(); ctx.arc(x, 100, 9, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#18181c'; ctx.fillRect(x, 100, 1, 8); } }
  }
}

const CONF = ['#e05a4e', '#ffd040', '#4ab0e0', '#6cc35a', '#e85ac8', '#ffffff'];
function effect(ctx: CanvasRenderingContext2D, fx: string, f: Frame18, tm: number, k: number): void {
  const still = reduced();
  if (fx === 'spot') {
    const tgt = f.actors.find((a) => a.mark) ?? f.actors[0];
    const [x, y] = tgt ? posOf(tgt, k) : [W / 2, 90];
    ctx.save(); ctx.fillStyle = `rgba(0,0,0,${0.35 + (f.dark ?? 0) * 0.6})`;
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.ellipse(x, y - 14, 18, 26, 0, 0, Math.PI * 2); ctx.fill('evenodd'); ctx.restore();
    ctx.fillStyle = 'rgba(255,245,200,0.08)'; ctx.beginPath(); ctx.moveTo(x - 6, 0); ctx.lineTo(x + 6, 0); ctx.lineTo(x + 18, y); ctx.lineTo(x - 18, y); ctx.closePath(); ctx.fill();
  } else if (fx === 'confetti') {
    for (let i = 0; i < 70; i++) { const x = (i * 53 + Math.sin(tm * 1.5 + i) * 6) % W; const y = still ? (i * 29) % H : ((i * 37 + tm * (30 + (i % 5) * 8)) % (H + 10)) - 6; ctx.fillStyle = CONF[i % CONF.length]; ctx.fillRect(Math.round(x), Math.round(y), i % 3 ? 2 : 1, i % 2 ? 1 : 2); }
  } else if (fx === 'flash') {
    if (!still) for (let i = 0; i < 4; i++) if (Math.sin(tm * (7 + i) + i * 2) > 0.94) { const x = (i * 67 + 20) % W, y = 80 + (i * 23) % 40; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(x - 3, y, 7, 1); ctx.fillRect(x, y - 3, 1, 7); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, 0, W, H); }
  } else if (fx === 'rain') {
    ctx.fillStyle = 'rgba(170,190,220,0.55)';
    for (let i = 0; i < 90; i++) { const x = (i * 29 + (still ? 0 : tm * 40)) % W; const y = (i * 47 + (still ? 0 : tm * 160)) % H; ctx.fillRect(Math.round(x), Math.round(y), 1, 4); }
    ctx.fillStyle = 'rgba(40,50,70,0.15)'; ctx.fillRect(0, 0, W, H);
  } else if (fx === 'snow') {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 70; i++) { const x = (i * 41 + Math.sin(tm + i) * 4) % W; const y = (i * 31 + (still ? 0 : tm * 18)) % H; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
  } else if (fx === 'pyro') {
    if (!still) for (const x of [40, 216]) { const ph = (tm * 1.3 + x) % 2; if (ph < 0.8) { const hgt = Math.round(ph * 60); ctx.fillStyle = 'rgba(255,170,40,0.85)'; ctx.fillRect(x - 2, 90 - hgt, 5, hgt); ctx.fillStyle = 'rgba(255,240,160,0.9)'; ctx.fillRect(x - 1, 90 - hgt, 3, Math.max(2, hgt / 3)); } }
  } else if (fx === 'lights') {
    const cols = ['rgba(255,80,160,0.10)', 'rgba(80,180,255,0.10)', 'rgba(255,220,80,0.10)'];
    for (let i = 0; i < 3; i++) { const sw = still ? 0 : Math.sin(tm * (0.8 + i * 0.3) + i) * 40; const x0 = 50 + i * 78; ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(x0 - 3, 0); ctx.lineTo(x0 + 3, 0); ctx.lineTo(x0 + sw + 24, 100); ctx.lineTo(x0 + sw - 24, 100); ctx.closePath(); ctx.fill(); }
  } else if (fx === 'smoke') {
    for (let i = 0; i < 7; i++) { const x = ((i * 47 + (still ? 0 : tm * 6)) % (W + 40)) - 20; ctx.fillStyle = 'rgba(200,210,220,0.12)'; ctx.beginPath(); ctx.ellipse(x, 88 + (i % 3) * 4, 26, 6, 0, 0, Math.PI * 2); ctx.fill(); }
  } else if (fx === 'flicker') {
    if (!still && Math.sin(tm * 31) > 0.9) { ctx.fillStyle = 'rgba(95,255,240,0.06)'; ctx.fillRect(0, 0, W, H); }
  } else if (fx === 'envelope' && f.env) {
    const cx = W / 2, cy = 56;
    const open = still ? 1 : Math.min(1, Math.max(0, (tm - 1.0) / 0.9));
    const card = still ? 1 : Math.min(1, Math.max(0, (tm - 1.9) / 0.8));
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(cx - 36, cy - 14, 72, 34);
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(cx - 32, cy - 10, 64, 28);
    // cartão subindo
    if (card > 0) { const cyy = cy - 4 - Math.round(card * 22); ctx.fillStyle = '#fffaf0'; ctx.fillRect(cx - 28, cyy, 56, 22); ctx.fillStyle = '#d4a63c'; ctx.fillRect(cx - 28, cyy, 56, 2); if (card >= 1) { const nm = fitText(f.env.name, 52); drawText(ctx, nm, cx - textWidth(nm) / 2, cyy + 9, f.env.win ? '#a02020' : '#202040'); } }
    // aba
    ctx.fillStyle = '#d8c8a4'; ctx.beginPath(); ctx.moveTo(cx - 32, cy - 10); ctx.lineTo(cx + 32, cy - 10); ctx.lineTo(cx, cy - 10 + Math.round(14 * (1 - open * 2))); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a02020'; ctx.fillRect(cx - 2, cy + 2 - Math.round(open * 12), 4, 4);
  }
}

export interface BoardOpts18 {
  start?: number;
  /** elemento da decisão pendente do quadro (null = nada a decidir) */
  slot?: (f: Frame18, refresh: () => void) => HTMLElement | null;
  /** remonta o storyboard (as decisões mudam os quadros seguintes) */
  rebuild?: () => Board18;
  auto?: boolean;
  /** compacto (dentro de cartões) */
  small?: boolean;
}

/** Tocador do storyboard: canvas + balões + legenda + controles + encaixe da decisão. */
export function boardView18(s: GameState, b0: Board18, o: BoardOpts18 = {}): HTMLElement {
  let b = b0;
  let cur = Math.max(0, Math.min(b.frames.length - 1, o.start ?? 0));
  let playing = (o.auto ?? true) && !reduced();
  let t0 = 0, raf = 0, last = 0, fstart = 0;
  const cv = h('canvas', { width: W, height: H, class: 'px c18-cv', role: 'img' }) as HTMLCanvasElement;
  const ctx = cv.getContext('2d');
  if (ctx) ctx.imageSmoothingEnabled = false;
  const ov = h('div', { class: 'c18-ov', 'aria-hidden': 'true' });
  const cap = h('p', { class: 'c18-cap', 'aria-live': 'polite' });
  const slotBox = h('div', { class: 'c18-slot' });
  const dots = h('div', { class: 'c18-dots' });
  const playBtn = h('button', { class: 'btn small ghost', type: 'button' });
  const wrap = h('figure', { class: `c18 ${o.small ? 'small' : ''}` },
    h('div', { class: 'c18-stage' }, cv, ov), cap, slotBox,
    h('div', { class: 'c18-ctl row' },
      h('button', { class: 'btn small ghost', type: 'button', title: t(l('Quadro anterior', 'Previous frame')), onclick: () => go(cur - 1) }, '◀'),
      playBtn,
      h('button', { class: 'btn small ghost', type: 'button', title: t(l('Próximo quadro', 'Next frame')), onclick: () => go(cur + 1) }, '▶'),
      dots,
      h('button', { class: 'btn small ghost c18-skip', type: 'button', title: t(l('Pular para o fim (ou para a decisão)', 'Skip to the end (or to the decision)')), onclick: () => skip() }, t(l('Pular ⏭', 'Skip ⏭')))),
    h('figcaption', { class: 'sr-only' }, T(b.title)));
  const refresh = () => { if (o.rebuild) b = o.rebuild(); go(cur, true); };
  const paintPlay = () => { playBtn.textContent = playing ? '⏸' : '⏵'; playBtn.title = t(playing ? l('Pausar', 'Pause') : l('Tocar', 'Play')); };
  playBtn.onclick = () => { playing = !playing; fstart = performance.now(); paintPlay(); };
  const skip = () => { const i = b.frames.findIndex((f, j) => j > cur && f.slot && !!o.slot?.(f, refresh)); go(i >= 0 ? i : b.frames.length - 1); playing = false; paintPlay(); };
  function overlay(f: Frame18): void {
    const kids: HTMLElement[] = [];
    for (const a of f.actors) {
      if (!a.bubble) continue;
      const [x, y] = a.to ? a.to : [a.x, a.y];
      kids.push(h('span', { class: `c18-bub ${a.ghost ? 'ghost' : ''} ${a.mood ?? ''}`, style: `left:${Math.max(9, Math.min(91, (x / W) * 100))}%;top:${Math.max(8, ((y - (a.ghost && y < 96 ? 54 : 40)) / H) * 100)}%` }, T(a.bubble)));
    }
    if (f.noms?.length) kids.push(h('div', { class: 'c18-noms' }, f.noms.map((n) => {
      const p = n.pid ? s.persons[n.pid] : undefined;
      const pic = p ? portraitCanvas(p, f.year, 2) : (() => { const sp = avatarSprite(randomLook(n.seed), { year: f.year, dir: 'SE' }); const c = h('canvas', { width: 24, height: 34, class: 'px' }) as HTMLCanvasElement; c.getContext('2d')?.drawImage(sp.c, 0, 0); return c; })();
      return h('div', { class: `c18-nom ${n.mine ? 'mine' : ''}` }, pic, h('small', null, n.name));
    })));
    ov.replaceChildren(...kids);
    // texto acessível do quadro: legenda + falas
    const said = f.actors.filter((a) => a.bubble).map((a) => `${a.name ?? (a.pid ? s.persons[a.pid]?.name : '') ?? ''}: “${T(a.bubble)}”`.replace(/^: /, ''));
    cv.setAttribute('aria-label', `${T(f.caption)}${said.length ? ` — ${said.join(' · ')}` : ''}${f.env ? ` — ${f.env.name}` : ''}`);
    cap.replaceChildren(h('b', null, T(f.caption)), f.sub ? h('span', { class: 'muted' }, ` ${T(f.sub)}`) : '', f.env ? h('span', { class: 'c18-envname' }, ` ★ ${f.env.name}`) : '');
  }
  function go(i: number, force = false): void {
    i = Math.max(0, Math.min(b.frames.length - 1, i));
    if (i === cur && !force && fstart) return;
    cur = i; fstart = performance.now();
    const f = b.frames[cur];
    overlay(f);
    const sl = f.slot && o.slot ? o.slot(f, refresh) : null;
    slotBox.replaceChildren(...(sl ? [sl] : []));
    if (sl) { playing = false; paintPlay(); }
    dots.replaceChildren(...b.frames.map((x, j) => h('button', { class: `c18-dot ${j === cur ? 'on' : ''} ${x.slot && o.slot?.(x, refresh) ? 'todo' : ''}`, type: 'button', title: T(x.caption), 'aria-label': `${j + 1}/${b.frames.length}`, onclick: () => go(j) })));
    if (ctx) drawFrame18(ctx, s, f, reduced() ? 99 : 0);
  }
  const loop = (now: number) => {
    if (!wrap.isConnected && t0) return;
    if (!t0) t0 = now;
    if (now - last >= 80 && ctx) {
      last = now;
      const f = b.frames[cur];
      drawFrame18(ctx, s, f, (now - fstart) / 1000);
      if (playing && now - fstart >= f.ms) { if (cur < b.frames.length - 1) go(cur + 1); else { playing = false; paintPlay(); } }
    }
    raf = requestAnimationFrame(loop);
  };
  paintPlay();
  go(cur, true);
  if (!reduced() && typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(loop);
  void raf;
  return wrap;
}
