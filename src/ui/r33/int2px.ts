// R33 · INT-2 (arte) — INTERIORES dos prédios novos e das lojas da época, NO PADRÃO DO JOGO: o corte lateral de `interior27`
// (céu, vizinhos e rua em volta, parede e piso da época, letreiro e lâmpadas da casca `cut27`), adereços do mesmo vocabulário
// (`PropT27`: balcão, estante, palco, plateia, mesa, cofre…) mais adereços novos pintados na camada de adereços (gancho `extra`
// do `drawInterior27`, igual ao `props31`), contorno INK de 1 px feito pela casca, e as PESSOAS são os bonecos do jogo
// (`avatarSprite` 24×34, posições em `spots` → `placePeople27`). Nada de imagem externa nem de texto de sistema.
//
//   int2Scene(id, ano)          — PURO: { m: Interior27, extra, name } do prédio novo `id` (15 tipos, ver sim/r33/int2.ts);
//   int2ShopScene(biz, ano)     — PURO: o mesmo para as lojas da época de `BIZ31` (city31);
//   paintInt2(scene, pessoas…)  — PURO (só Px): `paintInterior27` com o gancho; sem pessoas = só a sala;
//   drawInt2(canvas, scene, …)  — DOM: `drawInterior27` (com os bonecos do jogo).
// Determinístico: mesma entrada, mesmos pixels. Nada vai para o save.

import type { Person27 } from '../../sim/sys/place27';
import { C, INK, Px, lv, noise, tint, withAlpha, type Col } from '../pixel/px';
import { drawText, textWidth } from '../pixel/font';
import { drawInterior27, geom27, paintInterior27, type IDrawn27, type IDrawOpts27, type IKind27, type IPaint27, type Interior27, type ISpot27, type Prop27, type PropT27, type Zone27 } from '../pixel/interior27';
import { prim27, type Ctx27 } from '../ps/hqpx27';
import { drawProps31, type ArtItem31 } from '../pixel/props31';
import { crowd31, speaker31 } from '../pixel/stage31px';
import type { Pose } from '../pixel/avatar';
import { INT2, int2Def, type Int2Id } from '../../sim/r33/int2';

const B = prim27.blk;
export const epOf = (year: number): number => (year < 1920 ? 0 : year < 1950 ? 1 : year < 1970 ? 2 : year < 1990 ? 3 : year < 2010 ? 4 : 5);

export interface Int2Scene { id: string; m: Interior27; /** adereços novos, na camada de adereços */ extra: (g: Ctx27, seed: number) => void; /** letreiro da fachada */ name: string }

const sp = (x: number, z: Zone27, pose: Pose = 'stand', dir: 'SE' | 'SW' = 'SE'): ISpot27 => ({ x, z, pose, dir });
const P = (t: PropT27, x: number, w?: number, o: Partial<Prop27> = {}): Prop27 => ({ t, x, w, ...o });
const room = (k: IKind27, year: number, floor: Interior27['floor'], dim: boolean, props: Prop27[], spots: ISpot27[]): Interior27 => ({ k, year, props, spots, floor, dim });
const mediaOf = (y: number): Prop27['media'] => (y < 1920 ? 'sheets' : y < 1950 ? 'shellac' : y < 1985 ? 'lp' : y < 2008 ? 'cds' : 'vinyl');

/** Medidas da sala do corte (em px) para desenhar os adereços novos. */
const G = geom27(360);
const { y0: RY, fy: FYL, x0: RX, w0: RW } = G;
const RB = RY + 92; // borda de baixo da sala (piso incluído)
const X = (f: number): number => G.X(f);
const W = (f: number): number => G.Wd(f);

// ---------------------------------------------------------------- peças novas (na camada de adereços: o contorno INK vem da casca)

export const post = (p: Px, x: number, y: number, h: number, c: Col): void => { p.rect(x, y, 2, h, c); p.vline(x, y, y + h - 1, lv(c, 4)); };
function clock(g: Ctx27, cx: number, cy: number, r = 6): void { const { p, pal } = g; p.disc(cx, cy, r, pal.metal); p.disc(cx, cy, r - 2, C('#efe6cc')); p.line(cx, cy, cx, cy - r + 3, INK); p.line(cx, cy, cx + r - 3, cy + 1, INK); }
export function sign(g: Ctx27, cx: number, y: number, text: string, bg: Col, fg: Col): void { const { p } = g, w = textWidth(text) + 6; B(p, cx - (w >> 1), y, w, 9, bg); drawText(p, text, cx - (w >> 1) + 3, y + 2, fg); }
function glowRect(g: Ctx27, x: number, y: number, w: number, h: number, c: Col, a = 60): void { g.p.rect(x - 1, y - 1, w + 2, h + 2, withAlpha(c, 26)); g.p.rect(x, y, w, h, withAlpha(c, a)); }
function bed(g: Ctx27, x: number, fy: number, sheet: Col): void { const { p, pal } = g; B(p, x, fy - 9, 34, 4, pal.metal); B(p, x + 1, fy - 14, 32, 6, C('#e8eef0')); B(p, x + 1, fy - 17, 9, 4, C('#f6f8f8')); p.rect(x + 12, fy - 14, 20, 3, sheet); p.rect(x + 2, fy - 5, 2, 5, pal.metalDark); p.rect(x + 30, fy - 5, 2, 5, pal.metalDark); }
function trainCar(g: Ctx27, x: number, y: number, w: number, body: Col, stripe: Col): void { const { p, pal } = g; B(p, x, y, w, 30, body); for (let i = 0; i < Math.floor((w - 8) / 20); i++) B(p, x + 6 + i * 20, y + 5, 14, 11, C('#a8d8f0')); p.rect(x, y + 20, w, 3, stripe); p.disc(x + 14, y + 31, 4, pal.metalDark); p.disc(x + w - 14, y + 31, 4, pal.metalDark); }
export function tent(g: Ctx27, x: number, y: number, w: number, c: Col, label: string): void { const { p, pal } = g; p.poly([[x, y], [x + w, y], [x + w + 4, y + 9], [x - 4, y + 9]], c); for (let i = 0; i < Math.floor(w / 6); i++) p.rect(x - 4 + i * 6 + 2, y + 1, 3, 8, C('#f4f0e4')); post(p, x, y + 9, 22, pal.woodDark); post(p, x + w - 2, y + 9, 22, pal.woodDark); B(p, x, y + 22, w, 8, pal.wood); sign(g, x + (w >> 1), y - 11, label, tint(c, -0.25), C('#ffffff')); }
function cabinet(g: Ctx27, x: number, fy: number, w: number, h: number, c: Col): void { const { p } = g; B(p, x, fy - h, w, h, c); p.vline(x + (w >> 1), fy - h + 2, fy - 2, tint(c, -0.3)); p.rect(x + (w >> 1) - 2, fy - (h >> 1), 1, 3, C('#d8d0b8')); p.rect(x + (w >> 1) + 1, fy - (h >> 1), 1, 3, C('#d8d0b8')); }
/** Telão/LED: grade de painéis acesos (a luz em volta fica na própria camada, sem contorno extra). */
export function ledWall(g: Ctx27, x: number, y: number, w: number, h: number, a: Col, b: Col): void { const { p } = g; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p.put(x + i, y + j, i % 8 === 7 || j % 8 === 7 ? C('#14142a') : ((i >> 3) + (j >> 3)) % 2 ? lv(a, 3) : lv(b, 3)); glowRect(g, x, y, w, h, a, 18); }
/** Pano de fundo ao ar livre: céu, colinas e campo cobrindo a sala toda. */
function outdoor(g: Ctx27, o: { sky?: Col; field?: Col; horizon?: number; hills?: Col } = {}): void {
  const { p, pal } = g, hz = o.horizon ?? RY + 50, sky = o.sky ?? pal.sky, field = o.field ?? C('#4a8a3a');
  for (let y = RY; y < RB; y++) for (let x = RX; x < RX + RW; x++) p.put(x, y, y < hz ? lv(sky, 3.5 - (y - RY) / 90) : lv(field, 2.7 + ((x >> 4) % 2) * 0.28 + (y - hz) / 70));
  if (o.hills !== undefined) for (let x = RX; x < RX + RW; x++) { const h = hz - 10 + Math.round(Math.sin(x / 38) * 4 + Math.sin(x / 13) * 2); for (let y = h; y < hz; y++) p.put(x, y, lv(o.hills, 2.4 - (y - h) / 30)); }
}
export function treeLine(g: Ctx27, y: number, step = 23): void { const { p, pal } = g; for (let x = RX + 4; x < RX + RW - 6; x += step) { const k = x % 3; p.rect(x + 3, y, 3, 14, pal.woodDark); p.disc(x + 4.5, y - 3, 7, lv(C('#3f7a3a'), 2.8 + k * 0.3)); } }
export function bunting(g: Ctx27, y: number): void { const { p } = g; for (let x = RX; x < RX + RW; x += 12) p.rect(x, y + Math.round(Math.sin(x / 30) * 2), 6, 7, [C('#d8483a'), C('#e0b040'), C('#2a8a4a'), C('#3a6ac8'), C('#c070a0')][((x - RX) / 12) % 5 | 0]); }

// ---------------------------------------------------------------- os 15 lugares

type Def = (year: number) => { m: Interior27; extra: (g: Ctx27) => void };
const DEFS: Record<Int2Id, Def> = {
  bank: (y) => ({
    m: room('office', y, 'lobby', false, [P('window', 0.04, 0.1), P('desk', 0.04, 0.2), P('counter', 0.3, 0.4), P('plant', 0.77), P('filing', 0.93)],
      [sp(0.46, 'counter'), sp(0.6, 'counter', 'stand', 'SW'), sp(0.38, 'floor'), sp(0.7, 'floor', 'stand', 'SW'), sp(0.14, 'desk', 'sit')]),
    extra: (g) => {
      const { p, pal } = g, e = epOf(y), cx = X(0.3), cw = W(0.4);
      clock(g, X(0.5), RY + 10, 7);
      // cofre redondo de aço na parede da direita
      B(p, X(0.84), FYL - 42, 36, 42, lv(pal.metal, 2.6)); p.disc(X(0.84) + 18, FYL - 21, 14, lv(pal.metal, 3.4)); p.ring(X(0.84) + 18, FYL - 21, 9, lv(pal.metal, 4.6)); p.disc(X(0.84) + 18, FYL - 21, 3, pal.gold);
      for (let k = 0; k < 8; k++) p.put(X(0.84) + 18 + Math.round(Math.cos(k * 0.785) * 12), FYL - 21 + Math.round(Math.sin(k * 0.785) * 12), lv(pal.metal, 5));
      if (e <= 1) { p.hline(cx, cx + cw - 1, FYL - 44, pal.gold); for (let i = cx + 3; i < cx + cw - 2; i += 6) p.vline(i, FYL - 44, FYL - 15, lv(pal.metal, 3.2)); }
      else if (e <= 3) { p.rect(cx + 2, FYL - 38, cw - 4, 24, withAlpha(pal.glass, 70)); p.vline(cx + 2, FYL - 38, FYL - 15, lv(pal.metal, 4)); p.vline(cx + cw - 3, FYL - 38, FYL - 15, lv(pal.metal, 3)); }
      else { B(p, X(0.74), FYL - 36, 14, 36, lv(C('#8a8c96'), 3)); p.rect(X(0.74) + 2, FYL - 32, 10, 9, e >= 5 ? C('#9fd8ff') : C('#7be08a')); p.rect(X(0.74) + 3, FYL - 17, 8, 2, INK); }
      for (let i = 0; i < 4; i++) { post(p, X(0.3) + i * 32, FYL - 8, 8, pal.metal); p.put(X(0.3) + i * 32, FYL - 9, pal.gold); if (i) p.hline(X(0.3) + (i - 1) * 32 + 2, X(0.3) + i * 32, FYL - 6, pal.accent2); }
    },
  }),
  court: (y) => ({
    m: room('office', y, 'lobby', false, [P('window', 0.04, 0.09), P('racks', 0.17, 0.14, { media: 'sheets' }), P('racks', 0.69, 0.14, { media: 'sheets' }), P('desk', 0.05, 0.16), P('desk', 0.8, 0.16), P('plant', 0.95)],
      [sp(0.5, 'stage', 'stand'), sp(0.3, 'floor'), sp(0.7, 'floor', 'stand', 'SW'), sp(0.12, 'desk', 'sit'), sp(0.86, 'desk', 'sit', 'SW')]),
    extra: (g) => {
      const { p, pal } = g, bx = X(0.38), bw = W(0.24);
      B(p, bx, FYL - 9, bw, 9, pal.woodDark); B(p, bx - 2, FYL - 9 - 14, bw + 4, 14, pal.wood); p.hline(bx - 2, bx + bw + 1, FYL - 23, tint(pal.wood, 0.3));
      for (let i = 0; i < 4; i++) p.vline(bx + 6 + i * (((bw - 12) / 3) | 0), FYL - 20, FYL - 11, tint(pal.wood, -0.25));
      for (const fx of [X(0.33), X(0.66)]) { p.vline(fx, FYL - 54, FYL - 9, pal.woodDark); B(p, fx + 1, FYL - 54, 15, 10, fx < 180 ? C('#2a4a8a') : C('#8a2a2a')); }
      // balança da justiça na parede
      const sx = X(0.5); p.rect(sx - 1, RY + 8, 2, 16, pal.gold); p.hline(sx - 12, sx + 12, RY + 12, pal.gold); p.line(sx - 12, RY + 12, sx - 15, RY + 20, pal.gold); p.line(sx + 12, RY + 12, sx + 15, RY + 20, pal.gold); p.hline(sx - 18, sx - 12, RY + 21, pal.gold); p.hline(sx + 12, sx + 18, RY + 21, pal.gold);
      if (epOf(y) >= 3) for (const dx of [X(0.05) + 4, X(0.8) + 4]) { B(p, dx, FYL - 22, 11, 10, C('#d8d0bc')); p.rect(dx + 1, FYL - 21, 9, 6, epOf(y) >= 5 ? C('#9fd8ff') : C('#7be08a')); }
    },
  }),
  hospital: (y) => ({
    m: room('hotel', y, 'lobby', false, [P('counter', 0.03, 0.17), P('window', 0.24, 0.08), P('plant', 0.96)],
      [sp(0.1, 'counter'), sp(0.3, 'floor'), sp(0.5, 'floor', 'sit'), sp(0.68, 'floor', 'stand', 'SW'), sp(0.85, 'floor', 'sit', 'SW')]),
    extra: (g) => {
      const { p, pal } = g, e = epOf(y);
      p.rect(X(0.5) - 3, RY + 8, 6, 18, C('#d83a3a')); p.rect(X(0.5) - 9, RY + 14, 18, 6, C('#d83a3a'));
      for (let i = 0; i < 3; i++) { bed(g, X(0.36) + i * 62, FYL, [C('#4a90b8'), C('#6ab87a'), C('#b86a8a')][i]); p.hline(X(0.36) + i * 62 - 4, X(0.36) + i * 62 + 40, RY + 34, pal.metal); }
      post(p, X(0.62) - 4, FYL - 40, 40, pal.metal); B(p, X(0.62) - 8, FYL - 44, 8, 8, C('#a8d8f0'));
      if (y >= 1970) sign(g, X(0.84), RY + 30, 'REABILITACAO', C('#2a6a8a'), C('#e8f4ff'));
      if (e >= 3) for (let i = 0; i < 3; i++) { B(p, X(0.36) + i * 62 + 10, RY + 40, 14, 10, C('#2a2a32')); p.rect(X(0.36) + i * 62 + 12, RY + 42, 10, 6, C('#7be08a')); p.hline(X(0.36) + i * 62 + 12, X(0.36) + i * 62 + 21, RY + 45, C('#e8ffe8')); }
      cabinet(g, X(0.03) + W(0.2), FYL, 16, 36, C('#e8eef0'));
    },
  }),
  stadium: (y) => ({
    m: room('venue', y, 'lounge', false, [P('stage', 0.3, 0.4), P('amp', 0.36), P('drums', 0.58), P('mic', 0.48), P('crowd', 0.22, 0.56, { n: 14 })],
      [sp(0.5, 'stage', 'play'), sp(0.62, 'stage', 'play', 'SW'), sp(0.4, 'stage', 'play'), sp(0.14, 'floor'), sp(0.86, 'floor', 'stand', 'SW')]),
    extra: (g) => {
      const { p, pal } = g, e = epOf(y);
      // arquibancadas nos dois lados (degraus com torcida) e refletores
      for (const sx of [RX, RX + RW - 90]) for (let t = 0; t < 5; t++) { const yy = RY + 24 + t * 12; p.rect(sx, yy, 90, 12, lv(C('#8a8a88'), 2.2 + t * 0.1)); p.hline(sx, sx + 89, yy + 11, lv(C('#5a5a60'), 1.6)); for (let x = sx + 1; x < sx + 88; x += 4) { const n = noise(x, t, 9); if (n > 0.1) { p.rect(x, yy + 5, 4, 6, lv([C('#c8483a'), C('#3a6ac8'), C('#e0b040'), C('#2a8a4a'), C('#8a5a8a'), C('#e8e0d0')][Math.floor(n * 6) % 6], 2.8)); p.rect(x + 1, yy + 2, 3, 3, lv(n > 0.5 ? C('#e8c8a0') : C('#a8704a'), 3.2)); } } }
      for (const lx of [RX + 28, RX + RW - 36]) { post(p, lx, RY + 4, 60, pal.metal); B(p, lx - 8, RY + 2, 20, 7, lv(pal.metal, 3)); for (let i = 0; i < 4; i++) p.put(lx - 6 + i * 5, RY + 5, C('#fff6d0')); }
      B(p, X(0.4), RY + 4, W(0.2), 16, C('#2a2a34')); drawText(p, e >= 4 ? 'HOME 2 1' : 'CASA 2 1', X(0.4) + 6, RY + 10, pal.gold);
      speaker31(p, X(0.27), FYL - 9, 12, 28); speaker31(p, X(0.7), FYL - 9, 12, 28);
      crowd31(p, X(0.1), W(0.8), 18, FYL + 3, y, 3);
    },
  }),
  jazz: (y) => ({
    m: room('bar', y, 'lounge', true, [P('counter', 0.03, 0.3), P('bottles', 0.04, 0.28), P('poster', 0.38, 0.05), P('stage', 0.44, 0.3), P('piano', 0.5), P('mic', 0.66), P('drums', 0.7), P('tables', 0.78, 0.2, { n: 2 })],
      [sp(0.55, 'stage', 'play'), sp(0.75, 'stage', 'play', 'SW'), sp(0.14, 'counter'), sp(0.34, 'floor', 'sit'), sp(0.9, 'floor', 'sit', 'SW'), sp(0.25, 'floor')]),
    extra: (g) => {
      const { p, pal } = g;
      for (let i = 0; i < 14; i++) p.vline(X(0.44) + i * 7, RY + 10, RY + 40, lv(C('#6a1a28'), 1.6 + (i % 2)));
      glowRect(g, X(0.52), RY + 8, 44, 12, C('#ff5a8a'), 40); drawText(g.p, 'JAZZ', X(0.52) + 11, RY + 12, C('#ffd0e0'));
      p.ellipse(X(0.6), FYL - 15, 6, 10, lv(pal.wood, 2.6)); p.rect(X(0.6) - 1, FYL - 40, 2, 16, pal.woodDark); // contrabaixo
    },
  }),
  nightclub: (y) => ({
    m: room('venue', y, 'lounge', true, [P('counter', 0.02, 0.2), P('bottles', 0.03, 0.18), P('stage', 0.36, 0.28), P('speakers', 0.28, 0.07), P('speakers', 0.66, 0.07), P('crowd', 0.28, 0.44, { n: 11 }), P('tables', 0.82, 0.16, { n: 1 })],
      [sp(0.5, 'stage', 'play'), sp(0.12, 'counter'), sp(0.3, 'floor'), sp(0.62, 'floor', 'stand', 'SW'), sp(0.9, 'floor', 'sit', 'SW')]),
    extra: (g) => {
      const { p } = g, e = epOf(y), c1 = e >= 5 ? C('#7be0ff') : e >= 4 ? C('#70ff90') : C('#ff5ab0'), c2 = e >= 5 ? C('#c070ff') : e >= 4 ? C('#ff4040') : C('#ffd040');
      if (e >= 5) ledWall(g, X(0.3), RY + 6, W(0.4), 38, c1, c2);
      else if (e >= 4) for (let i = 0; i < 6; i++) { p.line(X(0.5), RY + 3, X(0.1) + i * W(0.16), FYL - 6, withAlpha(i % 2 ? c1 : c2, 110)); }
      else { p.disc(X(0.5), RY + 14, 9, lv(C('#d0d4e0'), 3.6)); p.vline(X(0.5), RY, RY + 5, lv(g.pal.metal, 2)); for (let k = 0; k < 14; k++) p.put(X(0.5) - 7 + (k * 5) % 15, RY + 8 + (k * 3) % 13, C('#ffffff')); for (let k = 0; k < 9; k++) p.disc(X(0.04) + k * W(0.11), RY + 30 + (k % 3) * 8, 4, withAlpha(k % 2 ? c1 : c2, 40)); }
      B(p, X(0.42), FYL - 9 - 12, 26, 8, lv(C('#3a3a46'), 3)); p.disc(X(0.42) + 7, FYL - 9 - 8, 3, lv(C('#14141c'), 3)); p.disc(X(0.42) + 19, FYL - 9 - 8, 3, lv(C('#14141c'), 3)); // mesa de DJ
      B(p, X(0.1), FYL - 12, 38, 12, lv(g.pal.fabric, 2.6)); // sofá VIP
      for (let x = RX + 4; x < RX + RW - 4; x += 12) p.rect(x, RB - 4, 6, 1, withAlpha(c1, 140));
    },
  }),
  church: (y) => ({
    m: room('office', y, 'lobby', false, [P('plant', 0.95)],
      [sp(0.74, 'stage', 'stand'), sp(0.82, 'stage', 'stand', 'SW'), sp(0.9, 'stage', 'stand', 'SW'), sp(0.5, 'floor'), sp(0.32, 'floor', 'sit'), sp(0.14, 'floor')]),
    extra: (g) => {
      const { p, pal } = g;
      for (const wx of [X(0.24), X(0.36), X(0.58), X(0.68)]) { B(p, wx - 2, RY + 6, 22, 40, pal.trim); for (let j = 0; j < 36; j++) for (let i = 0; i < 18; i++) p.put(wx + i, RY + 8 + j, lv([C('#c8483a'), C('#3a6ac8'), C('#e0b040'), C('#2a8a4a'), C('#8a5a8a'), C('#d86a2a')][((i >> 3) + (j >> 4) * 2) % 6], 2.8 + noise(i, j, wx) * 0.7)); p.vline(wx + 9, RY + 8, RY + 43, INK); p.hline(wx, wx + 17, RY + 26, INK); }
      // órgão de tubos
      B(p, X(0.03), RY + 14, 50, 78, pal.woodDark); for (let i = 0; i < 8; i++) { const h = 50 - Math.abs(3.5 - i) * 6; p.rect(X(0.03) + 4 + i * 5, FYL - 10 - h, 3, h, lv(pal.metal, 3.6)); p.put(X(0.03) + 5 + i * 5, FYL - 6 - h, INK); }
      // altar e cruz
      B(p, X(0.44), FYL - 22, 36, 22, C('#e8e0c8')); p.rect(X(0.44) + 16, RY + 6, 4, 44, pal.gold); p.rect(X(0.44) + 8, RY + 16, 20, 4, pal.gold);
      for (const cx of [X(0.44) - 2, X(0.44) + 36]) { p.rect(cx, FYL - 30, 2, 8, pal.gold); p.put(cx, FYL - 32, C('#ffd889')); }
      // degraus do coral (os cantores ficam no 1º degrau) e bancos
      B(p, X(0.7), FYL - 9, W(0.28), 9, pal.wood); B(p, X(0.72), FYL - 18, W(0.24), 9, tint(pal.wood, -0.1));
      B(p, X(0.2), FYL - 8, 52, 8, pal.woodDark); B(p, X(0.2) + 8, FYL - 16, 3, 8, pal.woodDark); B(p, X(0.5), FYL - 8, 52, 8, pal.woodDark);
      p.rect(X(0.46), RB - 16, 22, 14, C('#8a2430')); // tapete do corredor
    },
  }),
  tvstudio: (y) => ({
    m: room('venue', y, 'lounge', true, [P('stage', 0.28, 0.44), P('mic', 0.5), P('onair', 0.9), P('crowd', 0.1, 0.8, { n: 16 })],
      [sp(0.5, 'stage', 'stand'), sp(0.38, 'stage', 'play'), sp(0.6, 'stage', 'stand', 'SW'), sp(0.12, 'floor'), sp(0.88, 'floor', 'stand', 'SW')]),
    extra: (g) => {
      const { p, pal } = g, e = epOf(y);
      p.hline(RX + 4, RX + RW - 5, RY + 6, pal.metal); for (const lx of [0.12, 0.3, 0.5, 0.7, 0.88]) { B(p, X(lx) - 4, RY + 7, 10, 7, lv(C('#2a2a32'), 3)); p.poly([[X(lx) - 2, RY + 14], [X(lx) + 4, RY + 14], [X(lx) + 14, FYL - 9], [X(lx) - 12, FYL - 9]], withAlpha(C('#fff0c0'), 22)); }
      sign(g, X(0.5), RY + 18, e >= 4 ? 'NO AR' : e >= 2 ? 'CALOUROS' : 'CINEMA', C('#2a1a3a'), C('#ffd040'));
      if (e >= 4) B(p, X(0.03), RY + 20, 56, 44, C('#2ea86a'));
      sign(g, X(0.14), RY + 26 + (e >= 4 ? 40 : 0), 'APLAUSOS', C('#3a1a1a'), C('#ff6a4a'));
      const cam = (x: number) => { post(p, x + 11, FYL - 14, 26, pal.metal); p.line(x + 12, FYL + 12, x + 2, FYL + 14, pal.metal); p.line(x + 12, FYL + 12, x + 24, FYL + 14, pal.metal); B(p, x, FYL - 30, 26, 16, lv(C('#2a2a32'), 3)); B(p, x + 22, FYL - 27, 8, 10, lv(C('#3a3a46'), 3)); p.disc(x + 4, FYL - 22, 3, C('#6a8aa8')); if (e <= 1) { p.disc(x + 8, FYL - 36, 5, lv(C('#2a2a32'), 3)); p.disc(x + 18, FYL - 36, 5, lv(C('#2a2a32'), 3)); } };
      cam(X(0.03)); cam(X(0.82));
      B(p, X(0.4), FYL - 9 - 12, 38, 12, pal.wood); // mesa do apresentador
    },
  }),
  adagency: (y) => ({
    m: room('office', y, 'office', false, [P('window', 0.04, 0.1), P('poster', 0.22, 0.05), P('poster', 0.3, 0.05), P('poster', 0.38, 0.05), P('cork', 0.5, 0.16), P(y < 1990 ? 'typewriters' : 'screens', 0.05, 0.4, { n: 2 }), P('console', 0.62, 0.22), P('speakers', 0.86, 0.06), P('plant', 0.95)],
      [sp(0.18, 'desk', 'sit'), sp(0.34, 'desk', 'sit'), sp(0.7, 'desk', 'sit', 'SW'), sp(0.5, 'floor'), sp(0.8, 'floor', 'stand', 'SW')]),
    extra: (g) => {
      const { p, pal } = g;
      B(p, X(0.55), RY + 8, W(0.14), 30, C('#f4f0e4')); for (let i = 0; i < 4; i++) p.rect(X(0.55) + 3 + (i % 2) * 17, RY + 11 + (i >> 1) * 13, 14, 10, lv([pal.accent, pal.accent2, pal.fabric, pal.gold][i], 3)); // quadro de ideias
      B(p, X(0.43), FYL - 22, W(0.1), 22, pal.wood); p.rect(X(0.43) + 2, FYL - 40, 12, 16, C('#f4f0e4')); p.rect(X(0.43) + 4, FYL - 37, 8, 8, pal.accent2); // cavalete
      if (epOf(y) >= 5) { B(p, X(0.78), RY + 6, 40, 24, C('#2a2a32')); p.rect(X(0.78) + 2, RY + 8, 36, 20, C('#9fd8ff')); }
    },
  }),
  samba: (y) => ({
    m: room('venue', y, 'lounge', false, [], [sp(0.2, 'stage', 'play'), sp(0.32, 'stage', 'play', 'SW'), sp(0.44, 'stage', 'play'), sp(0.62, 'floor'), sp(0.78, 'floor', 'stand', 'SW'), sp(0.5, 'floor')]),
    extra: (g) => {
      const { p, pal } = g, gr = C('#2a8a4a'), pk = C('#e83a8a');
      outdoor(g, { sky: pal.sky, field: C('#9a9488'), horizon: RY + 30 });
      for (let y2 = RY + 30; y2 < FYL - 4; y2++) for (let x = RX; x < RX + RW; x++) if (((x + y2) >> 4) % 2 === 0) p.put(x, y2, lv(((x + y2) >> 5) % 2 ? pk : gr, 2.4 - (y2 - RY) / 100));
      bunting(g, RY + 4);
      B(p, X(0.43), RY + 34, W(0.16), 22, C('#14142a')); p.disc(X(0.51), RY + 45, 8, pal.gold); p.disc(X(0.51), RY + 45, 4, pk);
      B(p, X(0.02), FYL - 18, W(0.46), 18, pal.wall); for (let i = 0; i < 12; i++) { const x = X(0.03) + i * 12; p.rect(x, FYL - 33, 8, 14, lv(i % 2 ? gr : pk, 2.8)); p.disc(x + 4, FYL - 37, 3, C('#a86a3a')); p.disc(x + 4, FYL - 24, 4, C('#d8c8a0')); }
      B(p, X(0.66), FYL - 40, W(0.3), 24, pk); p.disc(X(0.7), FYL - 14, 8, lv(C('#2a2a32'), 3)); p.disc(X(0.92), FYL - 14, 8, lv(C('#2a2a32'), 3)); B(p, X(0.72), FYL - 64, W(0.2), 24, pal.gold); p.ring(X(0.82), FYL - 70, 8, lv(pal.gold, 4.6));
      for (const fx of [X(0.02), X(0.96)]) { post(p, fx, RY + 30, 70, pal.woodDark); B(p, fx + 2, RY + 32, 16, 22, fx < 100 ? gr : pk); p.hline(fx + 4, fx + 15, RY + 43, C('#f4f0e4')); }
    },
  }),
  festival: (y) => ({
    m: room('venue', y, 'lobby', false, [], [sp(0.5, 'stage', 'play'), sp(0.4, 'stage', 'play'), sp(0.6, 'stage', 'play', 'SW'), sp(0.2, 'floor'), sp(0.82, 'floor', 'stand', 'SW'), sp(0.08, 'floor')]),
    extra: (g) => {
      const { p, pal } = g, e = epOf(y), sx = X(0.3), sw = W(0.4), fy = FYL;
      outdoor(g, { sky: e === 5 ? C('#1a1c3c') : e === 3 ? C('#a8b0b8') : pal.sky, field: e === 3 ? C('#7a5a3a') : C('#4a8a3a'), horizon: RY + 54, hills: e === 5 ? C('#243a4a') : C('#5a8a50') });
      treeLine(g, RY + 40, 24); bunting(g, RY + 2);
      if (e === 3) for (let k = 0; k < 8; k++) p.ellipse(RX + 20 + k * 40, FYL - 8 + (k % 3) * 8, 14, 3, lv(C('#4a3420'), 2.4));
      // palco por época
      if (e === 0) { B(p, X(0.43), fy - 10, W(0.16), 10, pal.wall); for (let i = 0; i < 4; i++) p.rect(X(0.44) + i * 13, fy - 38, 3, 28, C('#f4f0e4')); p.poly([[X(0.42), fy - 38], [X(0.51), fy - 58], [X(0.6), fy - 38]], pal.accent2); }
      else if (e === 1) { p.disc(X(0.5), fy - 18, 36, pal.wall); B(p, sx + 4, fy - 8, sw - 8, 8, pal.wood); p.ring(X(0.5), fy - 18, 26, lv(pal.wall, 2)); }
      else if (e === 2) { B(p, sx, fy - 10, sw, 10, pal.wood); p.poly([[sx - 4, fy - 10], [sx + sw + 4, fy - 10], [sx + sw - 6, fy - 52], [sx + 6, fy - 52]], C('#d8cdb0')); post(p, sx - 3, fy - 52, 42, pal.woodDark); post(p, sx + sw + 1, fy - 52, 42, pal.woodDark); }
      else if (e === 3) { B(p, sx, fy - 10, sw, 10, pal.woodDark); for (let i = 0; i <= 5; i++) p.vline(sx + i * ((sw / 5) | 0), fy - 60, fy - 10, lv(pal.metal, 2.8)); for (let j = 0; j < 4; j++) p.hline(sx, sx + sw, fy - 60 + j * 14, lv(pal.metal, 3.2)); B(p, sx + 8, fy - 46, sw - 16, 34, C('#e8dcc0')); p.disc(X(0.5), fy - 29, 8, C('#d83a3a')); p.disc(X(0.5), fy - 29, 4, C('#e0c040')); }
      else { B(p, sx - 6, fy - 12, sw + 12, 12, C('#22222e')); for (let i = 0; i <= 6; i++) p.vline(sx - 4 + i * ((sw / 6) | 0), fy - 72, fy - 12, lv(pal.metal, 3)); p.hline(sx - 4, sx + sw + 4, fy - 72, lv(pal.metal, 3.4)); const lc = e === 5 ? C('#7be0ff') : C('#ffd040'), lc2 = e === 5 ? C('#c070ff') : C('#ff5ab0'); ledWall(g, sx + 6, fy - 68, sw - 12, 34, lc, lc2); ledWall(g, sx - 28, fy - 68, 20, 38, lc, lc2); ledWall(g, sx + sw + 8, fy - 68, 20, 38, lc, lc2);
        if (e === 5) for (let k = 0; k < 28; k++) { const dx = RX + 6 + ((k * 83) % (RW - 12)), dy = RY + 6 + ((k * 31) % 36); p.put(dx, dy, k % 2 ? lc : lc2); p.disc(dx, dy, 3, withAlpha(k % 2 ? lc : lc2, 34)); } }
      B(p, X(0.43), fy - 6, 30, 6, lv(C('#2a2a32'), 3));
      // barracas, banheiros, VIP, torre de som
      tent(g, X(0.02), fy - 52, 30, C('#e0702c'), 'COMIDA'); tent(g, X(0.02) + 38, fy - 52, 30, C('#2ec8c0'), 'MERCH');
      for (let i = 0; i < 3; i++) { B(p, X(0.8) + i * 14, fy - 24, 12, 24, C('#2a6ac8')); p.rect(X(0.8) + 3 + i * 14, fy - 20, 6, 8, C('#e8eef0')); } sign(g, X(0.8) + 21, fy - 36, 'BANHEIROS', C('#1a3a8a'), C('#ffffff'));
      B(p, X(0.7), fy - 6, W(0.16), 6, pal.wood); B(p, X(0.71), fy - 15, 18, 9, pal.fabric); B(p, X(0.78), fy - 15, 18, 9, pal.fabric); sign(g, X(0.77), fy - 28, 'VIP', C('#14102a'), pal.gold);
      if (e <= 3) { for (let i = 0; i < 3; i++) p.vline(X(0.2) + i * 7, fy - 46, fy - 4, lv(pal.metal, 2.6)); for (let j = 0; j < 5; j++) p.hline(X(0.2), X(0.2) + 14, fy - 44 + j * 8, lv(pal.metal, 3.2)); B(p, X(0.2) - 3, fy - 52, 20, 8, lv(C('#2a2a32'), 3)); }
      crowd31(p, X(0.04), W(0.92), 22, fy + 3, y, 5);
    },
  }),
  print: (y) => ({
    m: room('press', y, 'office', false, [P('window', 0.04, 0.09), P('cork', 0.7, 0.14), P('filing', 0.93), P('desk', 0.5, 0.2)],
      [sp(0.2, 'desk', 'sit'), sp(0.42, 'floor'), sp(0.62, 'floor', 'stand', 'SW'), sp(0.82, 'floor')]),
    extra: (g) => {
      const { p, pal } = g, e = epOf(y), ink = [C('#1a1a22'), C('#c83a2a'), C('#2a6aa8'), C('#e0c040')];
      p.hline(X(0.18), X(0.66), RY + 12, pal.metal); for (let i = 0; i < 9; i++) { p.rect(X(0.18) + 3 + i * 14, RY + 13, 9, 14 + (i % 3) * 3, C('#f4f0e4')); p.rect(X(0.18) + 5 + i * 14, RY + 16, 5, 5, lv([pal.accent, pal.accent2, pal.fabric][i % 3], 3)); }
      if (e <= 1) { B(p, X(0.1), FYL - 38, 52, 38, lv(C('#2a2a32'), 3)); B(p, X(0.1) + 6, FYL - 46, 40, 8, pal.metal); p.disc(X(0.1) + 60, FYL - 22, 9, pal.accent2); for (let i = 0; i < 3; i++) p.rect(X(0.1) + 6 + i * 13, FYL - 30, 9, 14, C('#f4f0e4')); }
      else { B(p, X(0.08), FYL - 36, 84, 36, e >= 5 ? C('#c8d0d8') : C('#6a7a8a')); for (let i = 0; i < 4; i++) { p.rect(X(0.08) + 6 + i * 19, FYL - 30, 15, 14, ink[i]); p.ring(X(0.08) + 13 + i * 19, FYL - 23, 5, pal.metal); } p.rect(X(0.08) + 4, FYL - 12, 76, 4, C('#f4f0e4')); }
      for (let i = 0; i < 4; i++) { B(p, X(0.78) + i * 8, FYL - 9, 7, 9, lv(ink[i], 3)); } p.disc(X(0.9), FYL - 16, 7, C('#f4f0e4')); p.disc(X(0.9), FYL - 16, 2, pal.woodDark);
      if (e >= 5) { B(p, X(0.62), RY + 22, 22, 14, C('#2a2a32')); p.rect(X(0.62) + 2, RY + 24, 18, 10, C('#9fd8ff')); }
    },
  }),
  pirate: (y) => ({
    m: room('rehearsal', y, 'studio', true, [P('racks', 0.03, 0.2, { media: mediaOf(y) }), P('console', 0.28, 0.28), P('mic', 0.6), P('amp', 0.74), P('couch', 0.86, 0.12)],
      [sp(0.4, 'desk', 'sit'), sp(0.52, 'floor'), sp(0.66, 'floor', 'stand', 'SW'), sp(0.2, 'floor', 'sit'), sp(0.92, 'floor', 'sit', 'SW')]),
    extra: (g) => {
      const { p, pal } = g;
      B(p, X(0.4), RY + 14, 54, 52, lv(C('#34343c'), 3)); for (let i = 0; i < 4; i++) { p.rect(X(0.4) + 4, RY + 18 + i * 12, 46, 9, lv(C('#22222a'), 3)); p.disc(X(0.4) + 10, RY + 22 + i * 12, 2, i % 2 ? C('#e83a3a') : C('#40e070')); p.rect(X(0.4) + 20, RY + 21 + i * 12, 26, 2, pal.metal); }
      p.rect(X(0.62), RY + 18, 4, 4, withAlpha(C('#e83a3a'), 90));
      post(p, X(0.9), RY + 4, 80, pal.metal); for (let i = 0; i < 4; i++) p.hline(X(0.9) - 8 + i * 2, X(0.9) + 10 - i * 2, RY + 10 + i * 14, lv(pal.metal, 3.4));
      for (let i = 0; i < 4; i++) B(p, X(0.28) + i * 12, RY + 20, 10, 14 + (i % 2) * 4, lv([C('#c83a2a'), C('#e0c040'), C('#2ec8c0'), C('#14141c')][i], 3)); // cartazes
    },
  }),
  station: (y) => ({
    m: room('hotel', y, 'lobby', false, [P('counter', 0.03, 0.22), P('plant', 0.3)],
      [sp(0.12, 'counter'), sp(0.4, 'floor', 'sit'), sp(0.52, 'floor', 'sit', 'SW'), sp(0.66, 'floor', 'stand', 'SW'), sp(0.3, 'floor'), sp(0.88, 'floor')]),
    extra: (g) => {
      const { p, pal } = g, e = epOf(y);
      clock(g, X(0.5), RY + 12, 9);
      if (e <= 1) { B(p, X(0.36), RY + 24, W(0.28), 24, lv(C('#14141c'), 3)); for (let i = 0; i < 3; i++) drawText(p, ['LISBOA 9 10', 'PARIS 10 30', 'ROMA 12 05'][i], X(0.37), RY + 27 + i * 7, pal.gold); }
      else { B(p, X(0.36), RY + 24, W(0.28), 28, e >= 4 ? C('#ffd040') : C('#e8a030')); for (let i = 0; i < 3; i++) drawText(p, ['SAO PAULO 10 20', 'RIO 10 45', 'PARIS 11 05'][i], X(0.37), RY + 28 + i * 7, C('#2a1a08')); }
      p.rect(X(0.7), FYL - 10, W(0.3), 4, lv(C('#6a6a72'), 2.4)); trainCar(g, X(0.7), FYL - 46, W(0.3), e >= 4 ? C('#d8dce4') : C('#7a2a24'), pal.accent);
      B(p, X(0.4), FYL - 8, 44, 8, pal.wood); B(p, X(0.4), FYL - 17, 44, 8, tint(pal.wood, -0.1)); B(p, X(0.52), FYL - 8, 44, 8, pal.wood);
      B(p, X(0.64), FYL - 14, 18, 14, pal.woodDark); B(p, X(0.64) + 3, FYL - 20, 12, 6, pal.fabric);
      B(p, X(0.3) + 14, FYL - 32, 14, 32, pal.accent2); p.rect(X(0.3) + 16, FYL - 28, 10, 10, pal.paper);
    },
  }),
  port: (y) => ({
    m: room('office', y, 'lobby', false, [], [sp(0.5, 'floor'), sp(0.64, 'floor', 'stand', 'SW'), sp(0.3, 'floor'), sp(0.84, 'counter')]),
    extra: (g) => {
      const { p, pal } = g, e = epOf(y), sea = C('#3a6a9a');
      outdoor(g, { sky: pal.sky, field: C('#8a8a82'), horizon: RY + 56 });
      for (let y2 = RY + 36; y2 < RY + 64; y2++) for (let x = RX; x < RX + RW; x++) p.put(x, y2, lv(sea, 2.8 + ((y2 + (x >> 3)) % 4 === 0 ? 0.6 : 0) - (y2 - RY - 36) / 60));
      B(p, X(0.06), RY + 28, 120, 26, e <= 1 ? C('#2a2a32') : C('#a82a2a')); p.poly([[X(0.06), RY + 54], [X(0.06) + 120, RY + 54], [X(0.06) + 110, RY + 62], [X(0.06) + 10, RY + 62]], C('#1a1a22')); B(p, X(0.06) + 36, RY + 18, 14, 10, C('#e8e2d4')); p.rect(X(0.06) + 41, RY + 6, 5, 12, C('#2a2a32')); p.rect(X(0.06) + 40, RY + 6, 7, 3, C('#e83a3a'));
      if (e >= 3) for (let i = 0; i < 5; i++) p.rect(X(0.06) + 60 + i * 11, RY + 22, 10, 6, lv([C('#c83a2a'), C('#2a6aa8'), C('#e0b040'), C('#2a8a4a'), C('#8a5a8a')][i], 3));
      post(p, X(0.7), RY + 6, 72, pal.metal); post(p, X(0.7) + 12, RY + 6, 72, pal.metal); p.hline(X(0.7) - 22, X(0.7) + 46, RY + 6, lv(pal.metal, 3.4)); p.vline(X(0.7) + 40, RY + 6, RY + 30, lv(pal.metal, 1.8)); B(p, X(0.7) + 36, RY + 30, 8, 6, pal.accent2);
      for (let i = 0; i < 3; i++) { B(p, X(0.03) + i * 24, FYL - 18 - (i % 2) * 12, 22, 18 + (i % 2) * 12, pal.wood); p.line(X(0.03) + i * 24 + 2, FYL - 18 - (i % 2) * 12, X(0.03) + i * 24 + 20, FYL - 2, pal.woodDark); }
      for (let i = 0; i < 3; i++) { p.ellipse(X(0.4) + i * 14, FYL - 8, 6, 8, lv(pal.wood, 2.6)); p.hline(X(0.4) - 5 + i * 14, X(0.4) + 5 + i * 14, FYL - 12, lv(pal.metal, 3)); }
      B(p, X(0.78), FYL - 34, W(0.2), 34, pal.wood); p.rect(X(0.78) + 2, FYL - 30, W(0.2) - 4, 14, withAlpha(pal.glass, 120)); sign(g, X(0.88), FYL - 46, 'PASSAGENS', C('#14202a'), C('#e8e0c0'));
      for (let k = 0; k < 5; k++) { const bx = RX + 30 + k * 60, by = RY + 14 + (k * 13) % 20; p.line(bx, by, bx + 3, by - 2, C('#f4f4f4')); p.line(bx + 3, by - 2, bx + 6, by, C('#f4f4f4')); }
    },
  }),
};

// ---------------------------------------------------------------- API

/** A cena (sala + adereços novos + letreiro) do prédio novo `id` no ano. */
export function int2Scene(id: Int2Id, year: number): Int2Scene {
  const d = DEFS[id](year);
  return { id, m: d.m, extra: (g, seed) => { void seed; d.extra(g); }, name: int2Def(id)!.tag };
}
export const INT2_SCENE_IDS: Int2Id[] = INT2.map((t) => t.id);

// ---------------------------------------------------------------- lojas da época

interface ShopR { sign: string; kind: IKind27; floor: Interior27['floor']; dim?: boolean; props: (y: number) => Prop27[]; art?: (y: number) => ArtItem31[]; extra?: (g: Ctx27) => void }
const wallCols = [C('#c8483a'), C('#3a6ac8'), C('#e0b040'), C('#2a8a4a'), C('#8a5a8a'), C('#d86a2a')];
void wallCols;
const SHOP_R: Record<string, ShopR> = {
  sheet: { sign: 'PARTITURAS', kind: 'records', floor: 'lobby', props: () => [P('racks', 0.03, 0.3, { media: 'sheets' }), P('bins', 0.36, 0.34, { media: 'sheets', n: 3 }), P('counter', 0.76, 0.2), P('poster', 0.5, 0.05)] },
  piano: { sign: 'PIANOS', kind: 'instruments', floor: 'lobby', props: () => [P('piano', 0.05), P('piano', 0.3), P('counter', 0.74, 0.22), P('guitars', 0.5, 0.2, { n: 3 })] },
  telegraph: { sign: 'TELEGRAFO', kind: 'office', floor: 'office', props: () => [P('desk', 0.06, 0.25), P('desk', 0.38, 0.25), P('counter', 0.74, 0.22), P('cork', 0.5, 0.14), P('window', 0.05, 0.1)], art: () => [{ t: 'phone', x: 0.66 }] },
  gramophone: { sign: 'GRAMOFONES', kind: 'records', floor: 'lobby', props: (y) => [P('racks', 0.03, 0.26, { media: y < 1950 ? 'shellac' : 'lp' }), P('counter', 0.74, 0.22), P('listen', 0.8), P('poster', 0.4, 0.05)], art: () => [{ t: 'radio', x: 0.45 }] },
  tailor: { sign: 'ALFAIATARIA', kind: 'instruments', floor: 'lobby', props: () => [P('counter', 0.74, 0.22), P('window', 0.05, 0.1), P('plant', 0.45)], extra: (g) => { const { p, pal } = g; for (let i = 0; i < 6; i++) B(p, X(0.2) + i * 14, RY + 14 + (i % 2) * 20, 12, 16, lv([C('#3a4a6a'), C('#6a4a3a'), C('#8a8a7a'), C('#2a3a2a')][i % 4], 3)); post(p, X(0.55), FYL - 44, 44, pal.woodDark); p.disc(X(0.55) + 1, FYL - 48, 5, pal.paper); B(p, X(0.55) - 8, FYL - 40, 18, 22, lv(C('#3a4a6a'), 3)); } },
  instruments: { sign: 'INSTRUMENTOS', kind: 'instruments', floor: 'lobby', props: () => [P('guitars', 0.04, 0.5, { n: 5 }), P('amp', 0.6), P('piano', 0.34), P('counter', 0.76, 0.2)] },
  cinema: { sign: 'CINEMA', kind: 'venue', floor: 'lounge', dim: true, props: () => [P('poster', 0.04, 0.06), P('poster', 0.14, 0.06), P('poster', 0.24, 0.06), P('counter', 0.6, 0.3)], extra: (g) => { const { p } = g; B(p, X(0.62), RY + 14, 60, 12, C('#2a1a2a')); drawText(p, 'BILHETERIA', X(0.62) + 6, RY + 18, C('#ffd040')); p.disc(X(0.9), FYL - 20, 7, C('#e8d8a0')); B(p, X(0.88), FYL - 14, 12, 14, C('#c83a2a')); } },
  radio_tv: { sign: 'RADIOS E TVS', kind: 'records', floor: 'lobby', props: () => [P('tv', 0.05), P('tv', 0.2), P('counter', 0.74, 0.22), P('poster', 0.5, 0.05)], art: () => [{ t: 'radio', x: 0.38 }, { t: 'radio', x: 0.58 }] },
  records: { sign: 'DISCOS', kind: 'records', floor: 'lobby', props: (y) => [P('racks', 0.03, 0.3, { media: mediaOf(y) }), P('bins', 0.36, 0.36, { media: mediaOf(y), n: 3 }), P('counter', 0.76, 0.21), P('listen', 0.8), P('poster', 0.4, 0.06)] },
  diner: { sign: 'LANCHONETE', kind: 'bar', floor: 'lounge', props: () => [P('counter', 0.03, 0.4), P('bottles', 0.04, 0.38), P('tables', 0.5, 0.3, { n: 3 }), P('poster', 0.9, 0.05)], art: () => [{ t: 'jukebox', x: 0.82 }], extra: (g) => { const { p, pal } = g; for (let i = 0; i < 5; i++) { p.rect(X(0.05) + 8 + i * 22, FYL - 12, 2, 12, pal.metal); p.disc(X(0.05) + 9 + i * 22, FYL - 14, 5, pal.accent2); } } },
  jukebox_bar: { sign: 'JUKEBOX', kind: 'bar', floor: 'lounge', dim: true, props: () => [P('counter', 0.03, 0.34), P('bottles', 0.04, 0.32), P('tables', 0.44, 0.3, { n: 2 }), P('stage', 0.78, 0.2), P('poster', 0.5, 0.05)], art: () => [{ t: 'jukebox', x: 0.68 }] },
  hifi: { sign: 'HI-FI', kind: 'instruments', floor: 'lobby', props: () => [P('speakers', 0.06, 0.06), P('speakers', 0.16, 0.06), P('amp', 0.3), P('tv', 0.44), P('counter', 0.74, 0.22)], art: () => [{ t: 'pa', x: 0.55 }] },
  arcade: { sign: 'FLIPERAMA', kind: 'bar', floor: 'lounge', dim: true, props: () => [P('counter', 0.74, 0.22), P('poster', 0.04, 0.05)], art: () => [{ t: 'arcade', x: 0.12 }, { t: 'arcade', x: 0.28 }, { t: 'arcade', x: 0.44 }, { t: 'arcade', x: 0.6 }] },
  video: { sign: 'LOCADORA', kind: 'records', floor: 'lobby', props: () => [P('counter', 0.76, 0.2), P('tv', 0.64), P('poster', 0.3, 0.05)], extra: (g) => { prim27.shelf(g, X(0.03), RY + 12, W(0.26), FYL - RY - 14, 'tapes'); prim27.shelf(g, X(0.34), RY + 12, W(0.22), FYL - RY - 14, 'tapes'); } },
  cd_mega: { sign: 'MEGASTORE CD', kind: 'records', floor: 'lobby', props: () => [P('racks', 0.03, 0.34, { media: 'cds' }), P('bins', 0.4, 0.32, { media: 'cds', n: 3 }), P('counter', 0.76, 0.2), P('poster', 0.4, 0.05)] },
  pager: { sign: 'BIPES', kind: 'instruments', floor: 'lobby', props: () => [P('counter', 0.06, 0.4), P('counter', 0.6, 0.3), P('poster', 0.5, 0.05)], art: () => [{ t: 'phone', x: 0.46 }, { t: 'phone', x: 0.9 }] },
  lan: { sign: 'LAN HOUSE', kind: 'office', floor: 'office', dim: true, props: () => [P('screens', 0.05, 0.7, { n: 4 }), P('counter', 0.8, 0.18)] },
  phones: { sign: 'CELULARES', kind: 'instruments', floor: 'lobby', props: () => [P('counter', 0.06, 0.4), P('counter', 0.55, 0.3), P('poster', 0.45, 0.05), P('plant', 0.94)], art: () => [{ t: 'phone', x: 0.5 }, { t: 'charts', x: 0.1, w: 0.1 }] },
  games: { sign: 'GAMES', kind: 'bar', floor: 'lounge', dim: true, props: () => [P('tv', 0.06), P('tv', 0.2), P('counter', 0.74, 0.22), P('couch', 0.36, 0.2)], art: () => [{ t: 'arcade', x: 0.6 }] },
  vinyl: { sign: 'VINIL', kind: 'records', floor: 'lobby', props: () => [P('racks', 0.03, 0.3, { media: 'vinyl' }), P('bins', 0.36, 0.36, { media: 'vinyl', n: 3 }), P('counter', 0.76, 0.21), P('listen', 0.8)] },
  cowork: { sign: 'CAFE WI-FI', kind: 'bar', floor: 'lounge', props: () => [P('counter', 0.03, 0.3), P('bottles', 0.04, 0.28), P('screens', 0.42, 0.34, { n: 2 }), P('plant', 0.9), P('tables', 0.7, 0.2, { n: 1 })] },
  holo: { sign: 'HOLOGRAMAS', kind: 'instruments', floor: 'lobby', props: () => [P('counter', 0.74, 0.22), P('window', 0.05, 0.1)], extra: (g) => { const { p } = g; B(p, X(0.3), FYL - 8, 36, 8, lv(C('#2a2a3a'), 3)); for (let j = 0; j < 40; j++) { const w = Math.round(2 + j * 0.45); p.hline(X(0.3) + 18 - (w >> 1), X(0.3) + 18 + (w >> 1), FYL - 48 + j, withAlpha(C('#7be0ff'), 40)); } p.ellipse(X(0.3) + 18, FYL - 50, 14, 4, withAlpha(C('#c070ff'), 120)); } },
  bakery: { sign: 'PADARIA', kind: 'records', floor: 'lobby', props: () => [P('counter', 0.04, 0.4), P('tables', 0.56, 0.3, { n: 2 }), P('window', 0.5, 0.1)], extra: (g) => { const { p, pal } = g; for (let r = 0; r < 3; r++) { p.hline(X(0.06), X(0.06) + W(0.34), RY + 28 + r * 14, pal.woodDark); for (let i = 0; i < 6; i++) p.ellipse(X(0.06) + 8 + i * 17, RY + 24 + r * 14, 7, 3.4, lv([C('#e0b870'), C('#c89850'), C('#f0d8a0')][(i + r) % 3], 3.2)); } } },
};
export const SHOP2_IDS: string[] = Object.keys(SHOP_R);
const SHOP_SPOTS: ISpot27[] = [sp(0.86, 'counter', 'stand', 'SW'), sp(0.45, 'floor'), sp(0.62, 'floor', 'stand', 'SW'), sp(0.2, 'floor'), sp(0.3, 'floor', 'stand', 'SW')];

/** Interior simples da loja da época `biz` (ids de `BIZ31`): balcão, mercadoria, o objeto da loja e o letreiro. */
export function int2ShopScene(biz: string, year: number): Int2Scene {
  const r = SHOP_R[biz] ?? SHOP_R.records, art = r.art?.(year) ?? [];
  const props = r.props(year), used = (x: number): boolean => props.some((q) => x < q.x + (q.w ?? 0.1) + 0.02 && q.x < x + 0.07);
  // parede e canto sem nada: cartaz e planta nos vãos (o corte nunca fica vazio)
  let posters = 0;
  for (const x of [0.52, 0.44, 0.6, 0.36, 0.28, 0.68]) if (posters < 2 && !used(x)) { props.push(P('poster', x, 0.05)); posters++; }
  if (!props.some((q) => q.t === 'plant') && !used(0.94)) props.push(P('plant', 0.95));
  const m = room(r.kind, year, r.floor, !!r.dim, props, SHOP_SPOTS);
  return { id: `shop:${biz}`, m, name: r.sign, extra: (g, seed) => { if (art.length) drawProps31(g, art, G, seed); r.extra?.(g); } };
}

/** Só a sala (pura, sem bonecos): o que `paintInterior27` pinta; `people` opcional (os bonecos entram no `drawInt2`). */
export function paintInt2(s: Int2Scene, people: Person27[] = [], o: IDrawOpts27 = {}): IPaint27 {
  return paintInterior27(s.m, people, { minW: 360, name: s.name, seed: s.id, city: 'london', ...o, extra: (g, seed) => { s.extra(g, seed); o.extra?.(g, seed); } });
}
/** A cena com os bonecos do jogo (DOM): o mesmo desenho do interior de qualquer lugar do bairro. */
export function drawInt2(canvas: HTMLCanvasElement, s: Int2Scene, people: Person27[], o: IDrawOpts27 = {}): IDrawn27 {
  return drawInterior27(canvas, s.m, people, { minW: 360, name: s.name, seed: s.id, city: 'london', ...o, extra: (g, seed) => { s.extra(g, seed); o.extra?.(g, seed); } });
}
export const INT2_W = 360;
export const INT2_H = 150;
