// Rodada 18 (campus18) — pixel art isométrica do "Nosso mundo": quarteirões da cidade-sede (grade 20×16),
// prédios com estilo da época em que foram erguidos/reformados (1889 → 2040), estados de obra (lote cercado,
// andaime + guindaste, reforma com lona, fuligem de incêndio, tábuas de "vendido"), veículos por era,
// pedestres, filas, fãs, protestos, polícia, imprensa, clima por estação e ciclo dia/noite.
// Montagem em camadas: chão (1 canvas) + um sprite por prédio (ordenado por profundidade junto com o que se
// move) + luzes com oclusão. Tudo em baixa resolução (300×268) ampliado por CSS (pixelated).

import { C, Px, mix, noise, shade, withAlpha, dith, type Col } from './px';
import { drawText, textWidth } from './font';
import { LOTS18, styleOf18, vehicleOf18, type Amb18, type Bld18, type BKind, type Style18 } from '../../sim/sys/campus18';

export const GW = 20, GH = 16;
export const MW = 300, MH = 226;
const OX = GH * 8 + 6, OY = 76, HZ = 74;
export const iso = (gx: number, gy: number): [number, number] => [OX + (gx - gy) * 8, OY + (gx + gy) * 4];
/** Tela → grade (para o chão). */
const unIso = (x: number, y: number): [number, number] => { const a = (x - OX) / 8, b = (y - OY) / 4; return [(a + b) / 2, (b - a) / 2]; };
const ROAD = (gx: number, gy: number) => (gy >= 7 && gy < 9) || (gx >= 9 && gx < 11);
const WALK = (gx: number, gy: number) => !ROAD(gx, gy) && ((gy >= 6.6 && gy < 9.4) || (gx >= 8.6 && gx < 11.4));

// ---------------------------------------------------------------- ambiente (estação, clima)

export interface Env18 { year: number; month: number; lat: number; season: 'winter' | 'spring' | 'summer' | 'autumn'; snow: boolean; rain: boolean }
export function env18(year: number, month: number, lat: number): Env18 {
  const m = lat < 0 ? (month + 6) % 12 : month;
  const season = m === 11 || m <= 1 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn';
  const snow = season === 'winter' && Math.abs(lat) >= 38;
  const rain = !snow && noise(year, month, 77) < (season === 'summer' && Math.abs(lat) < 25 ? 0.6 : 0.28);
  return { year, month, lat, season, snow, rain };
}

// ---------------------------------------------------------------- camada transladada

class T {
  constructor(readonly p: Px, readonly ox: number, readonly oy: number) {}
  set(x: number, y: number, c: Col) { this.p.set(x - this.ox, y - this.oy, c); }
  rect(x: number, y: number, w: number, h: number, c: Col) { this.p.rect(Math.round(x - this.ox), Math.round(y - this.oy), w, h, c); }
  line(a: number, b: number, c2: number, d: number, c: Col) { this.p.line(a - this.ox, b - this.oy, c2 - this.ox, d - this.oy, c); }
  disc(x: number, y: number, r: number, c: Col) { this.p.disc(x - this.ox, y - this.oy, r, c); }
  ellipse(x: number, y: number, rx: number, ry: number, c: Col) { this.p.ellipse(x - this.ox, y - this.oy, rx, ry, c); }
  poly(pts: [number, number][], c: Col | ((x: number, y: number) => Col)) {
    this.p.poly(pts.map(([x, y]) => [x - this.ox, y - this.oy] as [number, number]), typeof c === 'number' ? c : (x, y) => c(x + this.ox, y + this.oy));
  }
  text(s: string, x: number, y: number, c: Col) { drawText(this.p, s, Math.round(x - this.ox), Math.round(y - this.oy), c); }
}

// ---------------------------------------------------------------- materiais por estilo

interface Mat { wall: Col; roof: Col; trim: Col; win: Col; fh: number }
const MAT: Record<Style18, Mat> = {
  victorian: { wall: C('#9a4a34'), roof: C('#5a4a46'), trim: C('#e0d0b0'), win: C('#36404e'), fh: 8 },
  brick: { wall: C('#874430'), roof: C('#6a5a50'), trim: C('#c8a080'), win: C('#384858'), fh: 8 },
  deco: { wall: C('#dccaa0'), roof: C('#b8a888'), trim: C('#c8a040'), win: C('#3a5068'), fh: 7 },
  midcentury: { wall: C('#e8e4d6'), roof: C('#a8a8a0'), trim: C('#e07848'), win: C('#5aa0b0'), fh: 7 },
  brutal: { wall: C('#9a968e'), roof: C('#7a7670'), trim: C('#6a6660'), win: C('#2a2e36'), fh: 8 },
  postmod: { wall: C('#e0a8a0'), roof: C('#6ab0b0'), trim: C('#f0e0c0'), win: C('#4a7898'), fh: 7 },
  glass: { wall: C('#4a7aa8'), roof: C('#8090a0'), trim: C('#c0d0e0'), win: C('#2a4a70'), fh: 4 },
  eco: { wall: C('#e8e6dc'), roof: C('#5a9a48'), trim: C('#a87848'), win: C('#4a6a80'), fh: 8 },
};
const LIT = C('#ffd77a'), LIT2 = C('#ffeeb0'), DARK = C('#1c1a20'), RAW = C('#b4aea2'), SCAF = C('#c89838'), SCAF2 = C('#8a6428');
const ACCENT: Partial<Record<BKind, Col>> = {
  studio: C('#d04040'), publisher: C('#7050c0'), booking: C('#3080d0'), media: C('#e0a020'), platform: C('#30c0c0'), branch: C('#406090'),
  office: C('#406090'), sublabel: C('#c05090'), imprint: C('#50a060'), rehearsal: C('#d07030'), school: C('#2060a0'),
};

type WinK = 'wall' | 'win' | 'trim' | 'door';
function pattern(st: Style18, u: number, hz: number, H: number, len: number, z0: number, doorOk = true): WinK {
  const m = MAT[st];
  const top = H - hz;
  if ((st === 'victorian' || st === 'brick' || st === 'deco' || st === 'postmod') && top < 2) return 'trim';
  if (st === 'brutal' && top < 3) return 'trim';
  if (st === 'midcentury' && top < 1) return 'trim';
  const z = hz - z0;
  if (doorOk && z0 === 0 && z < 5 && Math.abs(u - len / 2) < 1.6) return 'door';
  if (u < 1 || u > len - 1) return st === 'glass' ? 'trim' : 'wall';
  const f = z % m.fh;
  if (z < 2) return 'wall';
  switch (st) {
    case 'victorian': return f >= 3 && f <= 6 && u % 5 >= 2 && u % 5 <= 3 ? 'win' : 'wall';
    case 'brick': return f >= 3 && f <= 6 && u % 4 >= 1 && u % 4 <= 2 && !(f === 6 && u % 4 === 2) ? 'win' : 'wall';
    case 'deco': return u % 6 === 0 ? 'trim' : f >= 2 && f <= 5 && u % 6 >= 2 && u % 6 <= 4 ? 'win' : 'wall';
    case 'midcentury': return f >= 3 && f <= 4 ? 'win' : 'wall';
    case 'brutal': return f >= 3 && f <= 4 && u % 5 >= 2 && u % 5 <= 3 ? 'win' : 'wall';
    case 'postmod': return f >= 2 && f <= 4 && u % 5 >= 1 && u % 5 <= 3 ? 'win' : u % 5 === 0 && f >= 2 && f <= 4 ? 'trim' : 'wall';
    case 'glass': return f === 0 || u % 6 === 0 ? 'trim' : 'win';
    case 'eco': return u % 7 === 0 ? 'trim' : f >= 2 && f <= 6 && u % 7 >= 1 && u % 7 <= 5 ? 'win' : 'wall';
  }
}

interface BoxO { st: Style18; seed: number; lit: number; raw?: boolean; burnt?: boolean; boarded?: boolean; worn?: boolean; noWin?: boolean; roof?: Col; wall?: Col }
/** Caixa isométrica com fachadas por estilo; z0 = base (para recuos). */
function box(t: T, L: T, gx: number, gy: number, w: number, d: number, H: number, z0: number, o: BoxO): void {
  const m = MAT[o.st];
  const wall = o.raw ? RAW : o.wall ?? m.wall;
  const [Nx, Ny] = iso(gx, gy), [Ex, Ey] = iso(gx + w, gy), [Sx, Sy] = iso(gx + w, gy + d), [Wx, Wy] = iso(gx, gy + d);
  const col = (k: WinK, x: number, y: number, right: boolean, u: number, hz: number): Col => {
    let c: Col;
    if (o.raw) c = (Math.floor(hz) % 6 === 0 ? shade(RAW, -0.15) : RAW);
    else if (k === 'win') {
      c = o.boarded ? C('#7a5a34') : o.burnt ? DARK : m.win;
      if (o.st === 'glass' && (Math.floor(u) + Math.floor(hz)) % 17 < 2) c = shade(c, 0.35);
      if (!o.boarded && !o.burnt && noise(Math.floor(u / 4) + (right ? 50 : 0), Math.floor(hz / m.fh), o.seed) < o.lit) L.set(x, y, k === 'win' && (Math.floor(u) % 9 === 0) ? LIT2 : LIT);
    } else if (k === 'trim') c = m.trim;
    else if (k === 'door') c = o.boarded ? C('#6a4a2a') : shade(m.trim, -0.45);
    else c = wall;
    if (o.st === 'brick' || o.st === 'victorian') if (k === 'wall' && (Math.floor(hz) % 3 === 0 || (Math.floor(u) + (Math.floor(hz / 3) % 2) * 2) % 4 === 0) && noise(x, y, 3) < 0.5) c = shade(c, -0.08);
    if (o.st === 'eco' && k === 'wall' && noise(x, y, o.seed) < 0.12) c = C('#4a8a3a');
    if (o.burnt && noise(x, y, o.seed + 9) < 0.55) c = mix(c, DARK, 0.7);
    if (o.worn && noise(x, y, o.seed + 4) < 0.12) c = shade(c, -0.3);
    return right ? shade(c, -0.22) : c;
  };
  const lenL = Math.hypot(Sx - Wx, Sy - Wy) / 1.118, lenR = Math.hypot(Ex - Sx, Ey - Sy) / 1.118;
  // face esquerda (W→S) e direita (S→E)
  t.poly([[Wx, Wy - z0], [Sx, Sy - z0], [Sx, Sy - H], [Wx, Wy - H]], (x, y) => {
    const u = x - Wx, hz = Wy + u / 2 - y;
    return col(o.noWin ? 'wall' : pattern(o.st, u, hz, H, lenL, z0), x, y, false, u, hz);
  });
  t.poly([[Sx, Sy - z0], [Ex, Ey - z0], [Ex, Ey - H], [Sx, Sy - H]], (x, y) => {
    const u = x - Sx, hz = Sy - u / 2 - y;
    return col(o.noWin ? 'wall' : pattern(o.st, u, hz, H, lenR, z0, false), x, y, true, u, hz);
  });
  const roof = o.raw ? shade(RAW, 0.1) : o.roof ?? m.roof;
  t.poly([[Nx, Ny - H], [Ex, Ey - H], [Sx, Sy - H], [Wx, Wy - H]], (x, y) => {
    let c = roof;
    if (o.st === 'eco' && !o.raw && dith(x, y, 0.3)) c = shade(c, -0.15);
    if (o.burnt && noise(x, y, o.seed + 2) < 0.6) c = mix(c, DARK, 0.8);
    return c;
  });
}

// ---------------------------------------------------------------- acessórios

function roofTop(gx: number, gy: number, w: number, d: number, H: number): [number, number] { const [x, y] = iso(gx + w / 2, gy + d / 2); return [x, y - H]; }
function accessories(t: T, L: T, b: Bld18, st: Style18, gx: number, gy: number, w: number, d: number, H: number, seed: number): void {
  const [cx, cy] = roofTop(gx, gy, w, d, H);
  const m = MAT[st];
  if (st === 'victorian' || st === 'brick') {
    for (let i = 0; i < Math.min(3, w); i++) { const [x, y] = iso(gx + 0.6 + i * 1.3, gy + 0.5); t.rect(x, y - H - 5, 2, 5, C('#6a3a2a')); t.rect(x, y - H - 6, 2, 1, C('#3a3030')); }
    if (st === 'brick' && H > 14) { t.rect(cx + 3, cy - 9, 5, 6, C('#7a5a3a')); t.ellipse(cx + 5.5, cy - 9, 3, 1.4, C('#5a4030')); t.line(cx + 3, cy - 3, cx + 3, cy, C('#3a2a20')); t.line(cx + 7, cy - 3, cx + 7, cy, C('#3a2a20')); }
  } else if (st === 'deco' && H > 18) {
    t.line(cx, cy - 4, cx, cy - 4 - Math.min(16, H / 3), m.trim);
    L.set(cx, cy - 4 - Math.min(16, H / 3), C('#ff6060'));
  } else if (st === 'midcentury') {
    t.rect(cx - 6, cy - 4, 12, 3, m.trim);
  } else if (st === 'brutal') {
    t.rect(cx - 3, cy - 3, 4, 3, C('#6a6660')); t.rect(cx + 2, cy - 2, 3, 2, C('#7a7670'));
  } else if (st === 'postmod') {
    const [Nx, Ny] = iso(gx, gy), [Wx, Wy] = iso(gx, gy + d), [Sx, Sy] = iso(gx + w, gy + d);
    void Nx; void Ny;
    t.poly([[Wx, Wy - H], [Sx, Sy - H], [(Wx + Sx) / 2, (Wy + Sy) / 2 - H - 7]], m.roof);
  } else if (st === 'glass' && H > 24) {
    t.line(cx, cy, cx, cy - 12, C('#c0c8d0')); L.set(cx, cy - 12, C('#ff4040'));
    if (w >= 3) { t.ellipse(cx - 6, cy + 1, 3, 1.5, C('#d0d4d8')); t.text('H', cx - 7, cy - 1, C('#40444c')); }
  } else if (st === 'eco') {
    for (let i = 0; i < Math.max(1, w - 1); i++) { const [x, y] = iso(gx + 0.5 + i, gy + 0.4); t.poly([[x, y - H - 1], [x + 6, y - H + 2], [x + 4, y - H + 3], [x - 2, y - H]], C('#2a3a6a')); }
    if (b.kind === 'hq' && b.lvl >= 6) { t.ellipse(cx, cy - 6, 8, 6, withAlpha(C('#80f0ff'), 140)); L.ellipse(cx, cy - 6, 5, 4, withAlpha(C('#a0ffff'), 160)); }
  }
  void seed;
}

const KCOL = (k: BKind) => ACCENT[k] ?? C('#a04040');

// ---------------------------------------------------------------- prédio

export interface Sprite18 { id: string; c: HTMLCanvasElement; lc: HTMLCanvasElement; x: number; y: number; depth: number; box: [number, number, number, number]; door: [number, number]; top: [number, number] }

function fp(b: Bld18, lw: number, ld: number): { w: number; d: number; H: number } {
  const L = b.lvl;
  if (b.kind === 'hq') return [{ w: 2, d: 2, H: 8 }, { w: 2, d: 2, H: 8 }, { w: 3, d: 3, H: 15 }, { w: 4, d: 3, H: 24 }, { w: 5, d: 5, H: 30 }, { w: 3, d: 3, H: 84 }, { w: 5, d: 5, H: 50 }][Math.min(6, L)];
  if (b.kind === 'fest' || b.kind === 'park') return { w: lw - 0.4, d: ld - 0.4, H: 0 };
  if (b.kind === 'home') return { w: Math.min(lw - 1, 1.6 + L * 0.5), d: Math.min(ld - 1, 1.5 + L * 0.3), H: 6 + L * 3 };
  if (b.kind === 'sign') return { w: 1, d: 1, H: 18 };
  if (b.kind === 'store' || b.kind === 'rehearsal' || b.kind === 'imprint') return { w: Math.min(lw - 1, 2 + L * 0.5), d: Math.min(ld - 1, 1.6 + L * 0.3), H: 8 + L * 2 };
  if (b.kind === 'venue') return { w: Math.min(lw - 0.6, 2 + L * 0.7), d: Math.min(ld - 0.6, 1.8 + L * 0.5), H: 9 + L * 4 };
  if (b.kind === 'plant') return { w: Math.min(lw - 0.6, 2.5 + L * 0.6), d: Math.min(ld - 0.6, 2 + L * 0.5), H: 10 + L * 2 };
  return { w: Math.min(lw - 1, 1.6 + L * 0.7), d: Math.min(ld - 1, 1.6 + L * 0.6), H: 8 + L * 7 };
}

/** Desenha um prédio num sprite próprio (cor + luzes) dentro do lote dado. */
export function buildingSprite18(b: Bld18, lot: { gx: number; gy: number; w: number; d: number }, year: number, seed: number, brand = 'REC'): Sprite18 {
  const { w, d, H } = fp(b, lot.w, lot.d);
  const gx = lot.gx + (lot.w - w) / 2, gy = lot.gy + (lot.d - d) / 2;
  const [Nx] = iso(gx, gy + d), [Ex] = iso(gx + w, gy), [, Ny] = iso(gx, gy), [, Sy] = iso(gx + w, gy + d);
  const x0 = Math.floor(Math.min(Nx, iso(lot.gx, lot.gy + lot.d)[0])) - 10, x1 = Math.ceil(Math.max(Ex, iso(lot.gx + lot.w, lot.gy)[0])) + 10;
  const y0 = Math.floor(Ny - H - 44), y1 = Math.ceil(Math.max(Sy, iso(lot.gx + lot.w, lot.gy + lot.d)[1])) + 4;
  const p = new Px(x1 - x0, y1 - y0), lp = new Px(x1 - x0, y1 - y0);
  const t = new T(p, x0, y0), L = new T(lp, x0, y0);
  const st = styleOf18(b.sy || year);
  const building = b.st === 'building' || b.st === 'planned';
  const prog = b.prog ?? 1;
  const lit = b.st === 'open' || b.st === 'renovating' ? 0.45 : b.st === 'damaged' ? 0.1 : 0;
  const o: BoxO = { st, seed, lit, raw: building, burnt: b.st === 'damaged', boarded: b.st === 'sold' || b.st === 'closed', worn: b.worn };
  const [Wx, Wy] = iso(gx, gy + d), [Sx, Sy2] = iso(gx + w, gy + d);
  const door: [number, number] = [(Wx + Sx) / 2, (Wy + Sy2) / 2 + 2];
  if (b.st === 'planned') {
    // lote cercado + placa
    const pts: [number, number][] = [iso(gx, gy), iso(gx + w, gy), iso(gx + w, gy + d), iso(gx, gy + d), iso(gx, gy)];
    for (let i = 0; i < 4; i++) { const [a, c] = [pts[i], pts[i + 1]]; for (let k = 0; k <= 10; k++) { const x = a[0] + ((c[0] - a[0]) * k) / 10, y = a[1] + ((c[1] - a[1]) * k) / 10; t.rect(x, y - 3, 1, 3, k % 2 ? C('#e8c040') : C('#d04030')); } }
    t.poly([[Wx, Wy], [Sx, Sy2], iso(gx + w, gy), iso(gx, gy)], C('#8a6a48'));
    t.rect(door[0] - 5, door[1] - 12, 10, 6, C('#f0e8d0')); t.line(door[0], door[1] - 6, door[0], door[1], C('#5a4030')); t.rect(door[0] - 3, door[1] - 10, 6, 1, KCOL(b.kind));
  } else if (b.kind === 'fest') {
    t.poly([iso(gx, gy), iso(gx + w, gy), iso(gx + w, gy + d), iso(gx, gy + d)], (x, y) => (noise(x, y, 5) < 0.25 ? C('#6a5a3a') : C('#7a9a48')));
    const sw = Math.min(2.4, w * 0.5);
    box(t, L, gx + 0.2, gy + 0.2, sw, 1.2, 10 + b.lvl * 2, 0, { st: 'brutal', seed, lit: 0, noWin: true, wall: C('#4a4a56'), roof: C('#6a6a78') });
    { const [ax, ay] = iso(gx + 0.2, gy + 1.4), [bx, by] = iso(gx + 0.2 + sw, gy + 1.4); for (let k = 0; k <= 8; k++) t.line(ax + (bx - ax) * k / 8, ay + (by - ay) * k / 8 - 10 - b.lvl * 2, ax + (bx - ax) * (k + 1) / 8, ay + (by - ay) * (k + 1) / 8 - (k % 2 ? 6 : 10 + b.lvl * 2), C('#c0c0c8')); }
    const [sx, sy] = iso(gx + 0.2 + sw / 2, gy + 1.4);
    for (let i = 0; i < 5; i++) L.set(sx - 6 + i * 3, sy - 10 - b.lvl * 2, [C('#ff4080'), C('#40c0ff'), C('#ffe040')][i % 3]);
    for (let i = 0; i < Math.min(5, 1 + b.lvl); i++) { const [x, y] = iso(gx + 0.6 + (i % 3) * (w / 3), gy + 1.9 + Math.floor(i / 3) * 1.2); t.poly([[x - 4, y], [x + 4, y], [x, y - 6]], i % 2 ? C('#f0f0f0') : C('#d04040')); t.line(x, y, x, y - 6, C('#a03030')); }
    if (b.lvl >= 4) { const [x, y] = iso(gx + w - 1, gy + 0.8); for (let a = 0; a < 16; a++) t.set(x + Math.cos(a / 16 * 6.28) * 6, y - 9 + Math.sin(a / 16 * 6.28) * 6, C('#d0d0d8')); t.line(x, y, x, y - 9, C('#909098')); L.set(x, y - 15, C('#ffe080')); }
  } else if (b.kind === 'park') {
    t.poly([iso(gx, gy), iso(gx + w, gy), iso(gx + w, gy + d), iso(gx, gy + d)], (x, y) => (dith(x, y, 0.2) ? C('#5a8a40') : C('#6a9a48')));
    const [fx, fy] = iso(gx + w / 2, gy + d / 2); t.ellipse(fx, fy, 6, 3, C('#c0c0c0')); t.ellipse(fx, fy, 4.5, 2, C('#4a90d0')); t.line(fx, fy, fx, fy - 4, C('#a0d0f0'));
    const [mx, my] = iso(gx + 0.3, gy + 0.3); for (let i = 0; i < 14; i++) t.rect(mx + i, my - 7 + i / 2, 1, 6, [C('#e04848'), C('#f0c040'), C('#48b85c'), C('#4a8ae0'), C('#8a5ad0')][Math.floor(i / 3) % 5]);
    for (let i = 0; i < 3; i++) { const [x, y] = iso(gx + 0.5 + i * (w - 1) / 2, gy + d - 0.5); tree(t, x, y, year, 'summer', seed + i); }
  } else if (b.kind === 'sign') {
    const [x, y] = iso(gx + 0.5, gy + 0.5);
    t.line(x - 5, y, x - 5, y - 10, C('#5a5a60')); t.line(x + 5, y, x + 5, y - 10, C('#5a5a60'));
    const neon = year >= 1925, led = year >= 1995, holo = year >= 2030;
    const bc = holo ? withAlpha(C('#60e0ff'), 170) : led ? C('#202838') : neon ? C('#2a1a2a') : C('#e8dcc0');
    t.rect(x - 9, y - 20, 18, 10, bc);
    const tx = holo ? C('#e0ffff') : led ? C('#40e0ff') : neon ? C('#ff60c0') : C('#a03020');
    t.text(brand, x - Math.round(textWidth(brand) / 2), y - 18, tx);
    if (neon) L.rect(x - 7, y - 19, 14, 7, withAlpha(tx, 120));
  } else {
    let HH = H;
    if (building) HH = Math.max(3, Math.round(H * Math.max(0.12, prog)));
    if (b.kind === 'hq' && b.lvl === 6 && !building) {
      box(t, L, gx, gy + 1, w, d - 1, 16, 0, o);
      box(t, L, gx + 1, gy, 2.5, 2.5, H, 0, { ...o, roof: C('#5a9a48') });
    } else if (b.kind === 'hq' && b.lvl === 5 && !building) {
      box(t, L, gx - 1, gy - 1, w + 2, d + 2, 10, 0, o);
      box(t, L, gx, gy, w, d, H, 10, o);
    } else if (b.kind === 'home') {
      box(t, L, gx, gy, w, d, HH, 0, { ...o, lit: o.lit * 0.6 });
      if (!building) { const [ax, ay] = iso(gx, gy + d / 2), [bx, by] = iso(gx + w, gy + d / 2), [wx, wy] = iso(gx, gy + d), [sx, sy] = iso(gx + w, gy + d), [nx, ny] = iso(gx, gy), [ex, ey] = iso(gx + w, gy);
        const rc = st === 'midcentury' || st === 'glass' || st === 'eco' ? MAT[st].roof : C('#8a3a2a');
        t.poly([[wx, wy - HH], [sx, sy - HH], [bx, by - HH - 7], [ax, ay - HH - 7]], rc); t.poly([[sx, sy - HH], [ex, ey - HH], [bx, by - HH - 7]], shade(rc, -0.25)); void nx; void ny;
        if (b.lvl >= 3 && year >= 1955) { const [px2, py2] = iso(lot.gx + lot.w - 0.9, lot.gy + lot.d - 0.6); t.ellipse(px2, py2, 6, 2.6, C('#58b8e8')); }
      }
    } else {
      box(t, L, gx, gy, w, d, HH, 0, o);
    }
    if (!building && b.st !== 'sold' && b.st !== 'closed') {
      if (b.kind === 'hq') { const bw = textWidth(brand) + 4; t.rect(door[0] - bw / 2, door[1] - 15, bw, 7, C('#1a1214')); t.text(brand, door[0] - bw / 2 + 2, door[1] - 14, year >= 1925 ? C('#ffd060') : C('#f0e8d0')); L.rect(door[0] - bw / 2 + 1, door[1] - 14, bw - 2, 5, withAlpha(C('#ffd060'), 140));
        const [fx, fy] = roofTop(gx, gy, w, d, H); t.line(fx - 4, fy, fx - 4, fy - 12, C('#d0d0d0')); t.rect(fx - 3, fy - 12, 6, 4, C('#d04040')); }
      if (b.kind === 'hq' && b.lvl <= 1) { for (let i = 0; i < 4; i++) t.line(Wx + 2, Wy - 2 - i * 1.5, Sx - 2, Sy2 - 2 - i * 1.5, C('#8a8a90')); }
      if (b.kind === 'venue') { // marquise com lâmpadas
        for (let u = 2; u < Sx - Wx - 2; u += 2) { t.set(Wx + u, Wy + u / 2 - 7, C('#f0e0a0')); L.set(Wx + u, Wy + u / 2 - 7, (u / 2) % 2 ? LIT : C('#ff8040')); }
        t.line(Wx + 1, Wy - 8, Sx - 1, Sy2 - 8, C('#b03030'));
        t.rect(Wx + 2, Wy - H - 8, 3, 9, C('#c03030')); L.rect(Wx + 2, Wy - H - 7, 3, 7, withAlpha(C('#ff5050'), 200));
      }
      if (b.kind === 'plant') { // telhado em dente de serra + chaminé
        for (let i = 0; i < Math.floor(w); i++) { const [x, y] = iso(gx + i + 0.5, gy + d / 2); t.poly([[x - 4, y - H], [x + 4, y - H], [x - 4, y - H - 5]], C('#7a7e86')); t.line(x - 4, y - H - 5, x + 4, y - H, C('#a8c0d8')); }
        const [x, y] = iso(gx + 0.4, gy + 0.4); t.rect(x - 1, y - H - 18, 3, 18, C('#8a4630')); t.rect(x - 1, y - H - 19, 3, 1, C('#3a3030'));
      }
      if (b.kind === 'museum') { for (let u = 2; u < Sx - Wx - 1; u += 3) t.line(Wx + u, Wy + u / 2 - 1, Wx + u, Wy + u / 2 - 9, C('#f0ece0')); t.poly([[Wx, Wy - 9], [Sx, Sy2 - 9], [(Wx + Sx) / 2, (Wy + Sy2) / 2 - 15]], C('#e8e0d0')); }
      if (b.kind === 'school') { const [x, y] = roofTop(gx, gy, w, d, H); t.rect(x - 2, y - 7, 5, 7, MAT[st].wall); t.poly([[x - 3, y - 7], [x + 3, y - 7], [x, y - 11]], C('#5a4a46')); t.disc(x + 0.5, y - 4.5, 1.2, C('#f8f4ec')); }
      if (b.kind === 'media') { const [x, y] = roofTop(gx, gy, w, d, H); for (let i = 0; i < 24; i++) t.set(x, y - i, Math.floor(i / 4) % 2 ? C('#e04040') : C('#f0f0f0')); t.line(x - 4, y, x, y - 18, C('#8a8a90')); t.line(x + 4, y, x, y - 18, C('#8a8a90')); L.set(x, y - 24, C('#ff3030')); if (year >= 1965) { t.ellipse(x + 7, y - 3, 3, 3, C('#d8dce0')); t.set(x + 7, y - 3, C('#606468')); } }
      if (b.kind === 'platform') { for (let u = 3; u < Sx - Wx - 2; u += 2) L.set(Wx + u, Wy + u / 2 - 4, (u % 3) ? C('#40f0ff') : C('#80ff80')); }
      if (b.kind === 'store') { for (let u = 1; u < Sx - Wx - 1; u++) { t.set(Wx + u, Wy + u / 2 - 7, Math.floor(u / 2) % 2 ? C('#e04848') : C('#f8f4ec')); t.set(Wx + u, Wy + u / 2 - 6, Math.floor(u / 2) % 2 ? C('#b03030') : C('#d8d4cc')); } }
      if (b.kind === 'dorm') { for (let z = 8; z < H - 2; z += 7) t.line(Wx + 1, Wy - z, Sx - 1, Sy2 - z, shade(MAT[st].trim, -0.2)); }
      if (b.kind === 'rehearsal') { t.rect(door[0] + 1, door[1] - 17, 1, 5, C('#f0c040')); t.disc(door[0], door[1] - 12, 1.3, C('#f0c040')); t.rect(door[0] + 2, door[1] - 17, 2, 1, C('#f0c040')); }
      if (ACCENT[b.kind] && b.kind !== 'store') { t.rect(door[0] - 3, door[1] - 9, 6, 2, KCOL(b.kind)); }
      if (b.kind !== 'home' && b.kind !== 'store') accessories(t, L, b, st, gx, gy, w, d, H, seed);
    }
    if (building || b.st === 'renovating') {
      // andaime: grade de canos sobre as fachadas
      const top = b.st === 'renovating' ? H + 2 : Math.min(H + 2, HH + 6);
      for (let z = 4; z <= top; z += 5) { t.line(Wx - 1, Wy - z, Sx, Sy2 - z, SCAF); const [Ex2, Ey2] = iso(gx + w, gy); t.line(Sx, Sy2 - z, Ex2 + 1, Ey2 - z, SCAF2); }
      for (let u = 0; u <= Sx - Wx; u += 5) t.line(Wx + u, Wy + u / 2, Wx + u, Wy + u / 2 - top, SCAF);
      if (b.st === 'renovating') for (let u = 3; u < Sx - Wx - 3; u += 9) t.poly([[Wx + u, Wy + u / 2 - top + 2], [Wx + u + 5, Wy + (u + 5) / 2 - top + 2], [Wx + u + 5, Wy + (u + 5) / 2 - 3], [Wx + u, Wy + u / 2 - 3]], withAlpha(C('#3a8a5a'), 170));
      if (building && H > 20) { // guindaste
        const [cx, cy] = iso(gx + w + 0.3, gy + 0.3);
        t.line(cx, cy, cx, cy - H - 22, C('#e0b020')); t.line(cx - 22, cy - H - 22, cx + 8, cy - H - 22, C('#e0b020')); t.line(cx - 16, cy - H - 22, cx - 16, cy - HH - 6, C('#5a5a60')); t.rect(cx - 18, cy - HH - 6, 4, 2, RAW); L.set(cx, cy - H - 23, C('#ff4040'));
      }
    }
    if (b.st === 'sold' || b.st === 'closed') {
      t.rect(door[0] - 9, door[1] - 12, 19, 7, C('#f8f4ec')); t.text(b.st === 'sold' ? 'SOLD' : 'SHUT', door[0] - 7, door[1] - 11, C('#c03030'));
    }
  }
  return { id: b.id, c: p.canvas(), lc: lp.canvas(), x: x0, y: y0, depth: gx + w / 2 + gy + d / 2, box: [Math.min(Wx, Nx), Ny - H - (b.kind === 'media' ? 24 : 6), Math.max(Ex, Sx), Math.max(Sy, Sy2)], door, top: roofTop(gx, gy, w, d, H) };
}

function tree(t: T, x: number, y: number, year: number, season: Env18['season'], seed: number): void {
  t.line(x, y, x, y - 4, C('#5a3a20'));
  if (season === 'winter') { t.line(x - 2, y - 6, x, y - 3, C('#5a3a20')); t.line(x + 2, y - 6, x, y - 3, C('#5a3a20')); return; }
  const c = season === 'autumn' ? (noise(seed, 1) < 0.5 ? C('#d08030') : C('#c0a030')) : season === 'spring' && noise(seed, 2) < 0.3 ? C('#f0a8c8') : C('#3a7a38');
  t.disc(x + 0.5, y - 6.5, 3.2, c); t.disc(x - 0.5, y - 7.5, 1.6, shade(c, 0.2));
  void year;
}

// ---------------------------------------------------------------- chão

function groundCanvas(env: Env18, seed: number, used: Set<number>): HTMLCanvasElement {
  const y = env.year;
  const p = new Px(MW, MH);
  const road = y < 1910 ? C('#8a6e4c') : y < 1950 ? C('#76726c') : y < 2025 ? C('#4a4a52') : C('#5a6070');
  const walk = y < 1910 ? C('#a88c64') : y < 2025 ? C('#b8b0a2') : C('#c8ccd2');
  const grass = env.snow ? C('#e8eef4') : env.season === 'autumn' ? C('#9a9448') : env.season === 'winter' ? C('#8a9a70') : env.season === 'spring' ? C('#78aa50') : C('#68984a');
  const sky = y < 1946 ? C('#c4c4ac') : env.season === 'winter' ? C('#a8bccc') : C('#9cc4e4');
  for (let py = 0; py < MH; py++) for (let px = 0; px < MW; px++) {
    const [gx, gy] = unIso(px + 0.5, py + 0.5);
    let c: Col;
    if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) {
      if (py < HZ) c = mix(sky, C('#f0f0f0'), py / HZ * 0.4);
      else c = dith(px, py, 0.5) ? shade(grass, -0.18) : shade(grass, -0.24);
    } else if (ROAD(gx, gy)) {
      c = road;
      const fx = gx % 1, fy = gy % 1;
      if (y < 1910 && noise(px, py, 1) < 0.15) c = shade(road, -0.15);
      else if (y >= 1910 && y < 1950 && ((Math.floor(gx * 4) + Math.floor(gy * 4)) % 2 === 0)) c = shade(road, 0.06);
      if (y >= 1955) {
        const lc = y >= 2025 ? C('#60e0ff') : y >= 1975 ? C('#f0d040') : C('#e8e8e8');
        if (gy >= 7 && gy < 9 && Math.abs(gy - 8) < 0.06 && Math.floor(gx * 2) % 2 === 0 && !(gx >= 9 && gx < 11)) c = lc;
        if (gx >= 9 && gx < 11 && Math.abs(gx - 10) < 0.06 && Math.floor(gy * 2) % 2 === 0 && !(gy >= 7 && gy < 9)) c = lc;
        // faixa de pedestres
        if (y >= 1950 && ((gx >= 8.9 && gx < 11.1 && (gy > 6.5 && gy < 7.1)) || (gy >= 6.9 && gy < 9.1 && gx > 11 && gx < 11.5)) && Math.floor((gx + gy) * 5) % 2 === 0) c = C('#e8e8e8');
      }
      void fx; void fy;
      if (env.snow && noise(px, py, 2) < 0.25) c = mix(c, C('#f0f4f8'), 0.6);
      if (env.rain) c = shade(c, -0.08);
    } else if (WALK(gx, gy)) {
      c = walk;
      if ((Math.floor(gx * 2) + Math.floor(gy * 2)) % 2 === 0) c = shade(c, -0.05);
      if (env.snow && noise(px, py, 3) < 0.5) c = C('#eef2f6');
    } else {
      const lot = LOTS18.findIndex((l0) => gx >= l0.gx && gx < l0.gx + l0.w && gy >= l0.gy && gy < l0.gy + l0.d);
      c = grass;
      if (lot >= 0 && used.has(lot)) c = env.snow ? C('#dde4ea') : mix(grass, walk, 0.55);
      if (!env.snow && noise(px, py, seed) < 0.12) c = shade(c, -0.08);
    }
    p.put(px, py, c);
  }
  // horizonte: silhueta da cidade cresce com a época
  const maxH = y < 1900 ? 12 : y < 1930 ? 20 : y < 1960 ? 30 : y < 1990 ? 40 : y < 2020 ? 52 : 58;
  for (let x = 0; x < MW;) {
    const bw = 5 + Math.floor(noise(x, 9, seed) * 10), bh = 4 + Math.floor(noise(x, 11, seed) * maxH);
    const c = mix(sky, C('#5a6478'), 0.35 + noise(x, 3, seed) * 0.15);
    for (let i = 0; i < bw; i++) for (let j = 0; j < bh; j++) p.put(x + i, HZ - j, j > bh - 2 && y >= 2025 && i > 1 && i < bw - 2 ? shade(c, 0.1) : c);
    if (y < 1930 && noise(x, 5, seed) < 0.15) for (let j = 0; j < 10; j++) p.put(x + 2, HZ - bh - j, c);
    x += bw + (noise(x, 7, seed) < 0.3 ? 3 : 0);
  }
  // árvores nos lotes vazios e calçadas
  const t = new T(p, 0, 0);
  LOTS18.forEach((l0, i) => { if (used.has(i)) return; for (let k = 0; k < 3; k++) { const [x, yy] = iso(l0.gx + 0.7 + noise(i, k, seed) * (l0.w - 1.4), l0.gy + 0.7 + noise(k, i, seed) * (l0.d - 1.4)); tree(t, x, yy, y, env.season, i * 7 + k); } });
  if (y >= 1950) for (let gx = 1; gx < GW; gx += 3) if (!(gx >= 8 && gx <= 11)) { const [x, yy] = iso(gx + 0.3, 6.75); tree(t, x, yy, y, env.season, gx); }
  return p.canvas();
}

// ---------------------------------------------------------------- cena

export interface Scene18 { hl?: number; ground: HTMLCanvasElement; lights: HTMLCanvasElement; sprites: Sprite18[]; env: Env18; amb: { k: Amb18; at: string }[]; seed: number; lamps: [number, number][] }

export function buildScene18(bs: Bld18[], lots: Map<string, number>, env: Env18, amb: { k: Amb18; at: string }[], seed: number, brand = 'REC'): Scene18 {
  const used = new Set<number>(lots.values());
  const sprites: Sprite18[] = [];
  for (const b of bs) {
    if (b.zone !== 'campus') continue;
    const n = lots.get(b.id) ?? b.lot;
    if (n === undefined || n < 0 || !LOTS18[n]) continue;
    sprites.push(buildingSprite18(b, LOTS18[n], env.year, seed + n * 31, brand));
  }
  sprites.sort((a, b) => a.depth - b.depth);
  const lights = document.createElement('canvas');
  lights.width = MW; lights.height = MH;
  const lc = lights.getContext('2d')!;
  for (const s of sprites) { lc.globalCompositeOperation = 'destination-out'; lc.drawImage(s.c, s.x, s.y); lc.globalCompositeOperation = 'source-over'; lc.drawImage(s.lc, s.x, s.y); }
  const lamps: [number, number][] = [];
  if (env.year >= 1880) for (let g = 1; g < GW; g += 3) { lamps.push(iso(g + 0.2, 6.65)); lamps.push(iso(g + 0.8, 9.35)); }
  return { ground: groundCanvas(env, seed, used), lights, sprites, env, amb, seed, lamps };
}

// ---------------------------------------------------------------- vida (quadro a quadro)

const OUTFIT = ['#2c4a7e', '#a33434', '#2f7a4c', '#d0a43c', '#6a4590', '#e4dccb', '#2a2a30', '#d8692a', '#5e3c26', '#6ab0e0'];
function person(ctx: CanvasRenderingContext2D, x: number, y: number, k: number, year: number, frame: number, sign?: string): void {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = OUTFIT[k % OUTFIT.length]; ctx.fillRect(x, y - 4, 2, 3);
  ctx.fillStyle = '#2a2628'; ctx.fillRect(x + (frame % 2), y - 1, 1, 1); ctx.fillRect(x + 1 - (frame % 2), y - 1, 1, 1);
  ctx.fillStyle = ['#f6d3b3', '#e0aa7e', '#a8714a', '#6e4528'][k % 4]; ctx.fillRect(x, y - 6, 2, 2);
  if (year < 1955 && k % 3) { ctx.fillStyle = '#2a2420'; ctx.fillRect(x - (k % 2), y - 7, 3, 1); }
  if (sign) { ctx.fillStyle = '#7a5a34'; ctx.fillRect(x + 2, y - 9, 1, 5); ctx.fillStyle = sign; ctx.fillRect(x, y - 12, 5, 3); }
}
function vehicle(ctx: CanvasRenderingContext2D, x: number, y: number, kind: ReturnType<typeof vehicleOf18>, k: number, dir: number, flash?: boolean, t = 0): void {
  x = Math.round(x); y = Math.round(y);
  const col = ['#a03030', '#2c4a7e', '#e0c040', '#3a7a4a', '#e8e4d8', '#303034'][k % 6];
  const len = kind === 'cart' ? 8 : kind === 'fin' ? 9 : kind === 'suv' ? 8 : 7;
  const x0 = dir > 0 ? x - len : x;
  if (kind === 'cart') { ctx.fillStyle = '#5a3a20'; ctx.fillRect(x0 + (dir > 0 ? 5 : 0), y - 5, 3, 3); ctx.fillStyle = '#8a6a40'; ctx.fillRect(x0 + (dir > 0 ? 0 : 3), y - 5, 5, 3); ctx.fillStyle = '#2a2020'; ctx.fillRect(x0 + 1, y - 2, 2, 2); ctx.fillRect(x0 + 5, y - 2, 2, 2); return; }
  ctx.fillStyle = flash !== undefined ? '#e8e8f0' : kind === 'modelT' ? '#202024' : kind === 'pod' ? '#f0f4f8' : col;
  ctx.fillRect(x0, y - 4, len, 3);
  ctx.fillStyle = kind === 'modelT' ? '#202024' : '#9ab8d0';
  ctx.fillRect(x0 + 2, y - (kind === 'modelT' || kind === 'suv' ? 7 : 6), len - 4, kind === 'modelT' || kind === 'suv' ? 3 : 2);
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x0 + 1, y - 1, 2, 1); ctx.fillRect(x0 + len - 3, y - 1, 2, 1);
  if (kind === 'pod') { ctx.fillStyle = 'rgba(96,224,255,0.7)'; ctx.fillRect(x0, y, len, 1); }
  if (flash !== undefined) { ctx.fillStyle = Math.floor(t * 4) % 2 ? '#ff2020' : '#2040ff'; ctx.fillRect(x0 + 3, y - 8, 2, 1); }
}

/** Ciclo do dia: 0 = meio-dia, 1 = meia-noite. */
export const nightOf = (t: number): number => { const ph = (t / 48) % 1; return Math.max(0, Math.min(1, (Math.cos(ph * Math.PI * 2) * -1 + 0.2) * 0.9)); };

export function drawFrame18(ctx: CanvasRenderingContext2D, sc: Scene18, t: number, night: number): void {
  const y = sc.env.year;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, MW, MH);
  ctx.drawImage(sc.ground, 0, 0);
  if (sc.hl !== undefined && LOTS18[sc.hl]) {
    const l0 = LOTS18[sc.hl];
    ctx.strokeStyle = Math.floor(t * 3) % 2 ? '#ffe040' : '#ff8040'; ctx.lineWidth = 1;
    ctx.beginPath(); const q = [iso(l0.gx, l0.gy), iso(l0.gx + l0.w, l0.gy), iso(l0.gx + l0.w, l0.gy + l0.d), iso(l0.gx, l0.gy + l0.d)]; ctx.moveTo(q[0][0], q[0][1]); for (const z of q.slice(1)) ctx.lineTo(z[0], z[1]); ctx.closePath(); ctx.stroke();
  }
  const vk = vehicleOf18(y);
  // itens móveis com profundidade (gx+gy)
  const items: { d: number; f: () => void }[] = sc.sprites.map((s) => ({ d: s.depth, f: () => ctx.drawImage(s.c, s.x, s.y) }));
  const nP = y < 1920 ? 8 : y < 1970 ? 12 : 16;
  for (let i = 0; i < nP; i++) {
    const r = noise(i, 1, sc.seed), sp = 0.15 + noise(i, 2, sc.seed) * 0.25, path = i % 4;
    const u = ((r * 40 + t * sp * (i % 2 ? 1 : -1)) % 20 + 20) % 20;
    const [gx, gy] = path === 0 ? [u, 6.8] : path === 1 ? [u, 9.2] : path === 2 ? [8.8, u * 0.8] : [11.2, u * 0.8];
    if (ROAD(gx, gy)) continue;
    const [x, yy] = iso(gx, gy);
    items.push({ d: gx + gy, f: () => person(ctx, x, yy, i, y, Math.floor(t * 4 + i)) });
  }
  const nV = y < 1910 ? 2 : y < 1950 ? 3 : 5;
  for (let i = 0; i < nV; i++) {
    const sp = 1 + noise(i, 4, sc.seed) * 1.2, lane = i % 4;
    const u = ((noise(i, 5, sc.seed) * 30 + t * sp) % 26) - 3;
    const [gx, gy, dir] = lane === 0 ? [u, 7.5, 1] : lane === 1 ? [GW - u, 8.5, -1] : lane === 2 ? [9.5, u * 0.75, -1] : [10.5, GH - u * 0.75, 1];
    const [x, yy] = iso(gx, gy);
    items.push({ d: gx + gy, f: () => vehicle(ctx, x, yy, vk, i, lane < 2 ? dir : -dir) });
  }
  // eventos em volta dos prédios
  const byId = new Map(sc.sprites.map((s) => [s.id, s]));
  for (const a of sc.amb) {
    const s = byId.get(a.at);
    if (!s) continue;
    const [dx, dy] = s.door;
    const d = s.depth + 1.5;
    if (a.k === 'fans') for (let i = 0; i < 14; i++) { const ox = (i % 7) * 3 - 9, oy = Math.floor(i / 7) * 3 + 4; items.push({ d, f: () => { const hop = Math.sin(t * 6 + i) > 0.5 ? 1 : 0; person(ctx, dx + ox, dy + oy - hop, i + 3, y, 0); } }); }
    if (a.k === 'protest') for (let i = 0; i < 8; i++) { const ox = ((t * 3 + i * 4) % 30) - 15; items.push({ d, f: () => person(ctx, dx + ox, dy + 8 + (i % 2) * 2, i, y, Math.floor(t * 4 + i), '#f8f4ec') }); }
    if (a.k === 'show') for (let i = 0; i < 9; i++) items.push({ d, f: () => person(ctx, dx - 4 - i * 3, dy + 3 + i * 1.5, i + 5, y, Math.floor(t * 2 + i) % 2) });
    if (a.k === 'police') items.push({ d, f: () => vehicle(ctx, dx + 14, dy + 10, vk, 5, 1, true, t) });
    if (a.k === 'press') items.push({ d, f: () => { vehicle(ctx, dx - 14, dy + 12, vk === 'cart' ? 'modelT' : vk, 4, -1); if (y >= 1960) { ctx.fillStyle = '#d0d4d8'; ctx.fillRect(Math.round(dx - 18), Math.round(dy + 3), 3, 2); } person(ctx, dx - 6, dy + 11, 6, y, 0); } });
    if (a.k === 'smoke') items.push({ d: d + 5, f: () => { for (let i = 0; i < 6; i++) { const ph = (t * 0.6 + i / 6) % 1; ctx.fillStyle = `rgba(60,58,62,${0.55 * (1 - ph)})`; ctx.beginPath(); ctx.arc(s.top[0] + Math.sin(ph * 6 + i) * 3, s.top[1] - ph * 26, 2 + ph * 4, 0, 7); ctx.fill(); } if (Math.floor(t * 5) % 3) { ctx.fillStyle = '#ff7020'; ctx.fillRect(Math.round(s.top[0] - 1), Math.round(s.top[1] - 2), 3, 2); } } });
  }
  items.sort((a, b) => a.d - b.d);
  for (const it of items) it.f();
  // clima
  if (sc.env.snow || sc.env.rain) {
    ctx.fillStyle = sc.env.snow ? '#ffffff' : 'rgba(170,200,230,0.8)';
    for (let i = 0; i < 70; i++) {
      const x = (noise(i, 1, 9) * MW + (sc.env.snow ? Math.sin(t + i) * 3 : -t * 20)) % MW, yy = (noise(i, 2, 9) * MH + t * (sc.env.snow ? 12 : 90)) % MH;
      if (sc.env.snow) ctx.fillRect(Math.round((x + MW) % MW), Math.round(yy), 1, 1); else ctx.fillRect(Math.round((x + MW) % MW), Math.round(yy), 1, 3);
    }
  }
  // noite
  if (night > 0.02) {
    ctx.fillStyle = `rgba(14,18,52,${(night * 0.62).toFixed(3)})`;
    ctx.fillRect(0, 0, MW, MH);
    ctx.globalAlpha = Math.min(1, night * 1.3);
    ctx.drawImage(sc.lights, 0, 0);
    ctx.fillStyle = y >= 2025 ? 'rgba(160,240,255,0.5)' : y >= 1910 ? 'rgba(255,220,140,0.45)' : 'rgba(255,190,110,0.45)';
    for (const [x, yy] of sc.lamps) { ctx.fillRect(Math.round(x), Math.round(yy) - 6, 1, 6); ctx.beginPath(); ctx.arc(x, yy - 6, 2.5, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}

/** Sprite isolado para a faixa "pelo mundo". */
export function worldCanvas18(b: Bld18, year: number, seed: number, brand = 'REC'): HTMLCanvasElement {
  const lot = { gx: 0, gy: 0, w: 4, d: 4 };
  const s = buildingSprite18({ ...b, zone: 'campus' }, lot, year, seed, brand);
  const c = document.createElement('canvas');
  c.width = 72; c.height = 76;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const [gx, gy] = iso(2, 2);
  ctx.fillStyle = '#6a9a48';
  ctx.beginPath(); const p = [iso(0, 0), iso(4, 0), iso(4, 4), iso(0, 4)].map(([x, y]) => [x - gx + 36, y - gy + 52]); ctx.moveTo(p[0][0], p[0][1]); for (const q of p.slice(1)) ctx.lineTo(q[0], q[1]); ctx.fill();
  ctx.drawImage(s.c, s.x - gx + 36, s.y - gy + 52);
  return c;
}
export const textW18 = textWidth;
