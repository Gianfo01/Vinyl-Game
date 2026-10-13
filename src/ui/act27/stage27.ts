// r27 (M2) — palco em pixel art para o show jogável: casa por porte (bar, clube, teatro, arena, estádio a céu
// aberto) e luz por era (lâmpadas e âmbar → gelatinas coloridas → laser → telões de LED; isqueiros → celulares).
// paintStage27 é PURA (só Px); drawStage27 pinta no <canvas> e põe os integrantes reais (avatarSprite) no palco.
// r27 (CHAR): quem tem sprite de semelhança (pessoa real, nomes reais) sobe ao palco em corpo inteiro (palco em 4×).

import { avatarSprite, lookOf, type Role } from '../pixel/avatar';
import type { Appearance } from '../../sim/types';
import { C, Px, mix, noise, shade, withAlpha } from '../pixel/px';
import { drawPerson } from '../sys/live/art';
import { drawBody27, type Sprite27 } from '../pixel/people27';

export const W27 = 200;
export const H27 = 112;
export interface Stage27 { tier: number; year: number; energy: number; frame: number; power: boolean; rain: boolean; night?: boolean }

const LIGHTS = (y: number): string[] => (y < 1960 ? ['#ffd88a', '#fff2c8'] : y < 1980 ? ['#e04848', '#4a8ae0', '#f0c040', '#3fbf6a'] : y < 2000 ? ['#ff3c8c', '#3cc8ff', '#f0c040', '#a05ad0'] : ['#ff4f6d', '#4fd2ff', '#ffe066', '#9b6bff', '#46f0a0']);

/** Pinta casa, palco, luz e plateia num buffer (determinístico pelo quadro). */
export function paintStage27(o: Stage27): Px {
  const p = new Px(W27, H27);
  const dk = (c: number) => (o.power ? shade(c, -0.6) : c);
  const dim = o.power ? 0.35 : 1;
  const lc = LIGHTS(o.year).map((x) => C(x));
  const e = Math.max(0, Math.min(100, o.energy)) / 100;
  const stageY = [62, 58, 56, 52, 50][o.tier] ?? 56;
  const stageX0 = [56, 44, 34, 18, 10][o.tier] ?? 34;
  const stageX1 = W27 - stageX0;
  // fundo
  if (o.tier >= 4) {
    for (let y = 0; y < stageY; y++) p.hline(0, W27 - 1, y, mix(C('#0b1030'), C('#2a1842'), y / stageY));
    for (let i = 0; i < 40; i++) { const x = (i * 53) % W27; const y = (i * 29) % 30; if (noise(x, y, 7) > 0.4) p.put(x, y, C('#e8e4ff', 180)); }
  } else if (o.tier === 0) {
    p.rect(0, 0, W27, stageY, dk(C('#6a3424')));
    for (let y = 2; y < stageY; y += 5) p.hline(0, W27 - 1, y, dk(C('#4a2218')));
    for (let y = 0; y < stageY; y += 10) for (let x = (y / 5) % 2 ? 0 : 6; x < W27; x += 12) p.vline(x, y + 2, y + 6, dk(C('#4a2218')));
    // letreiro de neon
    const neon = o.power ? C('#3a2a30') : C(o.year < 1960 ? '#ffb347' : '#ff4fa0');
    p.rect(84, 8, 32, 7, C('#1a0e12'));
    p.hline(86, 113, 11, neon);
  } else if (o.tier === 2) {
    p.rect(0, 0, W27, stageY, C('#140c10'));
    for (let x = 0; x < stageX0 + 8; x++) p.vline(x, 0, stageY, dk(x % 6 < 3 ? C('#8a1c24') : C('#6a141c')));
    for (let x = stageX1 - 8; x < W27; x++) p.vline(x, 0, stageY, dk(x % 6 < 3 ? C('#8a1c24') : C('#6a141c')));
    p.rect(0, 0, W27, 8, dk(C('#a02430')));
    for (let x = 0; x < W27; x += 8) p.rect(x, 8, 4, 2, dk(C('#d4a640')));
  } else {
    p.rect(0, 0, W27, stageY, C(o.tier === 1 ? '#160f1c' : '#0c0a14'));
  }
  // treliça e refletores
  if (o.tier >= 3) {
    p.hline(stageX0, stageX1, 6, C('#5a5a66'));
    p.hline(stageX0, stageX1, 8, C('#5a5a66'));
    for (let x = stageX0; x <= stageX1; x += 4) p.line(x, 6, x + 2, 8, C('#5a5a66'));
  }
  const nl = [2, 3, 4, 6, 8][o.tier] ?? 4;
  for (let i = 0; i < nl; i++) {
    const lx = stageX0 + 8 + Math.round(((stageX1 - stageX0 - 16) * i) / Math.max(1, nl - 1));
    const col = lc[(i + Math.floor(o.frame / 18)) % lc.length];
    p.rect(lx - 1, o.tier >= 3 ? 9 : 2, 3, 2, C('#2a2a30'));
    if (o.power && i % 2) continue;
    const sw = Math.round(Math.sin((o.frame + i * 20) / 22) * 10 * e);
    const a = Math.round((50 + 90 * e) * dim);
    p.poly([[lx, o.tier >= 3 ? 11 : 4], [lx - 9 - e * 6 + sw, stageY], [lx + 9 + e * 6 + sw, stageY]], withAlpha(col, a));
  }
  // laser (anos 80+) e telões (90+ nas arenas, 2000+ em tudo grande)
  if (o.year >= 1980 && o.tier >= 3 && e > 0.7 && !o.power) for (let i = 0; i < 4; i++) p.line(W27 / 2, 12, (i * 70 + o.frame * 3) % W27, H27 - 1, withAlpha(lc[i % lc.length], 120));
  if (o.tier >= 3 && o.year >= 1990) for (const sx of [2, W27 - 2 - (o.tier >= 4 ? 30 : 22)]) {
    const sw = o.tier >= 4 ? 30 : 22;
    p.rect(sx, 14, sw, 18, C('#101018'));
    p.fill((x, y) => (o.power ? C('#141420') : mix(C('#101018'), lc[(Math.floor((x + o.frame) / 6) + Math.floor(y / 4)) % lc.length], 0.35 + e * 0.5)), sx + 1, 15, sw - 2, 16);
  }
  // palco
  p.rect(stageX0, stageY, stageX1 - stageX0, 6, dk(C(o.tier === 0 ? '#5a3a24' : '#2c2430')));
  p.hline(stageX0, stageX1 - 1, stageY, dk(C(o.tier === 2 ? '#d4a640' : '#6a6070')));
  // amplificadores
  for (const ax of [stageX0 + 2, stageX1 - 12]) { p.rect(ax, stageY - 12, 10, 12, C('#1c1a20')); p.rect(ax + 2, stageY - 10, 6, 8, C('#2e2a34')); }
  // plateia
  const rows = [3, 5, 7, 9, 12][o.tier] ?? 6;
  const y0 = stageY + 9;
  const phones = o.year >= 2007;
  for (let r = 0; r < rows; r++) {
    const y = y0 + r * Math.max(3, Math.floor((H27 - y0 - 4) / rows));
    const gap = o.tier >= 3 ? 4 : o.tier >= 1 ? 6 : 9;
    for (let x = (r % 2) * 3 + 1; x < W27 - 3; x += gap) {
      const seed = x * 7 + r * 131;
      if (o.tier === 0 && (x < 30 || x > 170) && noise(x, r, 3) > 0.3) continue;
      const jump = (o.frame + seed) % 24 < 12 * e ? 1 : 0;
      const arms = e > 0.6 && (o.frame + seed) % 30 < 15;
      drawPerson(p, x, y - jump, seed, arms);
      if (e > 0.75 && seed % 5 === 0) p.put(x + 1, y - jump - 2, phones ? C('#cfe8ff') : C('#ffd060'));
    }
  }
  if (o.power) p.map((c, x, y) => (y < y0 ? shade(c, -0.45) : c));
  // chuva
  if (o.rain) for (let i = 0; i < 90; i++) { const x = (i * 37 + o.frame * 2) % W27; const y = (i * 23 + o.frame * 5) % H27; p.line(x, y, x - 1, y + 3, C('#9cc4ff', 140)); }
  return p;
}

export interface Member27 { id: string; look?: Appearance; born?: number; role?: string; /** r27 (CHAR): sprite real (corpo 96×152) */ sprite?: Sprite27 }

/** r27 (CHAR): escala do palco quando alguém tem sprite real — o cenário 200×112 vai a 4× e o corpo real (≈125 px)
 *  entra em 1×, com a mesma altura relativa do boneco procedural (34 px × 4). */
export const HD27 = 4;
let stageBuf: HTMLCanvasElement | null = null;

/** Pinta no canvas e coloca os integrantes no palco. */
export function drawStage27(cv: HTMLCanvasElement, o: Stage27, members: Member27[]): void {
  const hd = members.slice(0, 5).some((m) => m.sprite);
  const k = hd ? HD27 : 1;
  if (cv.width !== W27 * k) { cv.width = W27 * k; cv.height = H27 * k; cv.classList.toggle('hd27', hd); }
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const px = paintStage27(o);
  if (hd) {
    stageBuf ??= document.createElement('canvas');
    stageBuf.width = W27;
    stageBuf.height = H27;
    const bctx = stageBuf.getContext('2d');
    if (!bctx) return;
    const img = bctx.createImageData(W27, H27);
    new Uint32Array(img.data.buffer).set(px.d);
    bctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(stageBuf, 0, 0, W27 * k, H27 * k);
  } else {
    const img = ctx.createImageData(W27, H27);
    new Uint32Array(img.data.buffer).set(px.d);
    ctx.putImageData(img, 0, 0);
  }
  ctx.imageSmoothingEnabled = false;
  const stageY = [62, 58, 56, 52, 50][o.tier] ?? 56;
  const n = Math.min(5, members.length);
  members.slice(0, 5).forEach((m, i) => {
    const x = Math.round(W27 / 2 + (i - (n - 1) / 2) * 22);
    const hop = o.energy > 70 && (o.frame + i * 7) % 20 < 4 ? 1 : 0;
    // corpo real: pés (linha 148 do quadro) no chão do palco, centro da figura (x≈57) na marca do integrante
    if (m.sprite && drawBody27(ctx, m.sprite, x * k - 57, (stageY + 1) * k - 149 - hop * 3, 1)) return;
    const sp = avatarSprite(lookOf({ id: m.id, look: m.look, born: m.born }), { year: o.year, role: (m.role ?? null) as Role | null, pose: 'play', frame: Math.floor(o.frame / 8) + i, dir: i % 2 ? 'SW' : 'SE' });
    ctx.drawImage(sp.c, (x - sp.ax) * k, (stageY + 1 - sp.ay - hop) * k, sp.c.width * k, sp.c.height * k);
  });
}
