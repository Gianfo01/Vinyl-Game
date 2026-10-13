// Rodada 18 (campus18) — pixel art isométrica do "Nosso mundo": quarteirões da cidade-sede (grade 20×16; r27: a
// grade e o canvas crescem com os bairros abertos — DIST18 em sim/sys/campus18 — até 29×24),
// prédios com estilo da época em que foram erguidos/reformados (1889 → 2040), estados de obra (lote cercado,
// andaime + guindaste, reforma com lona, fuligem de incêndio, tábuas de "vendido"), veículos por era,
// pedestres, filas, fãs, protestos, polícia, imprensa, clima por estação e ciclo dia/noite.
// Montagem em camadas: chão (1 canvas) + um sprite por prédio (ordenado por profundidade junto com o que se
// move) + luzes com oclusão. Tudo em baixa resolução (300×268) ampliado por CSS (pixelated).

import { C, Px, mix, noise, shade, withAlpha, dith, type Col } from './px';
import { drawText, textWidth } from './font';
import { DIST18, LOTS18, styleOf18, vehicleOf18, type Amb18, type Bld18, type BKind, type Style18 } from '../../sim/sys/campus18';
import { ICON27, cityLook27, env27, era27, hqExt27, type BVis27, type CityLook27, type Env27, type Era27, type HqExt27, type Life27, type Sale27 } from './city27';
import type { Landmark19 } from '../../data/landmarks19';
import { LM_SLOTS27, drawLmIso27, outlineOuter } from './lmiso27';

/** Grade e canvas do CENTRO (o mapa original, 300×226). Com mais bairros a cena usa `geo18` (ver Scene18.geo). */
export const GW = 20, GH = 16;
export const MW = 300, MH = 226;
const OY = 76, HZ = 74;
/** r27 (LOTS): geometria do mapa para uma grade gw×gh (o centro dá exatamente 300×226 e a origem de sempre). */
export interface Geo18 { gw: number; gh: number; mw: number; mh: number; ox: number }
export const geo18 = (gw: number, gh: number): Geo18 => ({ gw, gh, mw: (gw + gh) * 8 + 12, mh: OY + (gw + gh) * 4 + 6, ox: gh * 8 + 6 });
/** Geometria da cena em uso: buildScene18 define e drawFrame18 reativa (sprites e postes guardam coordenadas de tela). */
let G: Geo18 = geo18(GW, GH);
/** Geometria com os `d`+1 primeiros bairros abertos. */
export const geoDist18 = (d: number): Geo18 => { const x = DIST18[Math.max(0, Math.min(DIST18.length - 1, d))]; return geo18(x.gw, x.gh); };
/** Grade → tela numa geometria dada (pura; `iso` usa a da cena em uso). */
export const isoAt18 = (g: Geo18, gx: number, gy: number): [number, number] => [g.ox + (gx - gy) * 8, OY + (gx + gy) * 4];
export const iso = (gx: number, gy: number): [number, number] => isoAt18(G, gx, gy);
/** Tela → grade (para o chão). */
const unIso = (x: number, y: number): [number, number] => { const a = (x - G.ox) / 8, b = (y - OY) / 4; return [(a + b) / 2, (b - a) / 2]; };
/** r27 (LOTS): avenidas (início em gy, 2 de largura) e ruas (início em gx). O centro só tem a avenida 7 e a rua 9;
 *  as outras aparecem quando o bairro abre (fora da grade não se desenha nada). */
const HROADS = [7, 16], VROADS = [9, 20];
const hIn = () => HROADS.filter((b) => b + 2 <= G.gh), vIn = () => VROADS.filter((a) => a + 2 <= G.gw);
const hAt = (gy: number) => HROADS.find((b) => gy >= b && gy < b + 2), vAt = (gx: number) => VROADS.find((a) => gx >= a && gx < a + 2);
const ROAD = (gx: number, gy: number) => hAt(gy) !== undefined || vAt(gx) !== undefined;
/** Célula de avenida ou rua (todas, abertas ou não) — os testes conferem que nenhum lote cai na rua. */
export const roadAt18 = ROAD;
const WALK = (gx: number, gy: number) => !ROAD(gx, gy) && (HROADS.some((b) => gy >= b - 0.4 && gy < b + 2.4) || VROADS.some((a) => gx >= a - 0.4 && gx < a + 2.4));

// ---------------------------------------------------------------- ambiente (estação, clima)

/** r27: clima por cidade e hemisfério (neve só onde há inverno; trópico sempre verde) — ver city27.ts. */
export type Env18 = Env27;
export function env18(year: number, month: number, lat: number, city = ''): Env18 { return env27(year, month, lat, city); }

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
  // r19: estilos escolhidos pelo jogador
  gothic: { wall: C('#76727c'), roof: C('#3a3a4c'), trim: C('#cfc6b4'), win: C('#5a3a72'), fh: 10 },
  beaux: { wall: C('#e8dcc0'), roof: C('#7aa898'), trim: C('#fff6e0'), win: C('#3a4a5c'), fh: 8 },
  tropical: { wall: C('#f2ead2'), roof: C('#c4643c'), trim: C('#2f8a6c'), win: C('#2a5868'), fh: 8 },
  loft: { wall: C('#7c3a2a'), roof: C('#4a4a4c'), trim: C('#26262a'), win: C('#9ab8cc'), fh: 9 },
  neon: { wall: C('#2c2642'), roof: C('#3a3252'), trim: C('#ff48c8'), win: C('#3ae0ff'), fh: 6 },
};
const LIT = C('#ffd77a'), LIT2 = C('#ffeeb0'), DARK = C('#1c1a20'), RAW = C('#b4aea2'), SCAF = C('#c89838'), SCAF2 = C('#8a6428');
const ACCENT: Partial<Record<BKind, Col>> = {
  hq: C('#c08a2a'), studio: C('#d04040'), publisher: C('#7050c0'), booking: C('#3080d0'), media: C('#e0a020'), platform: C('#30c0c0'), branch: C('#406090'),
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
    case 'gothic': return u % 5 === 0 ? 'trim' : f >= 2 && f <= 8 && u % 5 >= 2 && u % 5 <= 3 && !(f === 8 && u % 5 === 3) ? 'win' : 'wall';
    case 'beaux': return u % 4 === 0 ? 'trim' : f >= 3 && f <= 6 && u % 4 === 2 ? 'win' : 'wall';
    case 'tropical': return f >= 2 && f <= 6 && u % 5 >= 2 && u % 5 <= 3 ? 'win' : (u % 5 === 1 || u % 5 === 4) && f >= 2 && f <= 6 ? 'trim' : 'wall';
    case 'loft': return f >= 2 && f <= 7 && u % 6 >= 1 && u % 6 <= 4 ? ((u % 6 === 2 || f === 4) ? 'trim' : 'win') : 'wall';
    case 'neon': return f === 0 ? 'trim' : f >= 2 && f <= 3 && u % 4 !== 0 ? 'win' : 'wall';
  }
  return 'wall';
}

interface BoxO { st: Style18; seed: number; lit: number; raw?: boolean; burnt?: boolean; boarded?: boolean; worn?: boolean; noWin?: boolean; roof?: Col; wall?: Col; snow?: boolean;
  /** r27 (I2): padrão de fachada próprio (sede: andares contados) e cor do vidro da época */ pat?: (u: number, hz: number, len: number, right: boolean) => WinK; win?: Col }
/** Caixa isométrica com fachadas por estilo; z0 = base (para recuos). */
function box(t: T, L: T, gx: number, gy: number, w: number, d: number, H: number, z0: number, o: BoxO): void {
  const m = MAT[o.st];
  const wall = o.raw ? RAW : o.wall ?? m.wall;
  const [Nx, Ny] = iso(gx, gy), [Ex, Ey] = iso(gx + w, gy), [Sx, Sy] = iso(gx + w, gy + d), [Wx, Wy] = iso(gx, gy + d);
  const col = (k: WinK, x: number, y: number, right: boolean, u: number, hz: number): Col => {
    let c: Col;
    if (o.raw) c = (Math.floor(hz) % 6 === 0 ? shade(RAW, -0.15) : RAW);
    else if (k === 'win') {
      c = o.boarded ? C('#7a5a34') : o.burnt ? DARK : o.win ?? m.win;
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
    return col(o.noWin ? 'wall' : o.pat ? o.pat(u, hz, lenL, false) : pattern(o.st, u, hz, H, lenL, z0), x, y, false, u, hz);
  });
  t.poly([[Sx, Sy - z0], [Ex, Ey - z0], [Ex, Ey - H], [Sx, Sy - H]], (x, y) => {
    const u = x - Sx, hz = Sy - u / 2 - y;
    return col(o.noWin ? 'wall' : o.pat ? o.pat(u, hz, lenR, true) : pattern(o.st, u, hz, H, lenR, z0, false), x, y, true, u, hz);
  });
  const roof = o.raw ? shade(RAW, 0.1) : o.roof ?? m.roof;
  t.poly([[Nx, Ny - H], [Ex, Ey - H], [Sx, Sy - H], [Wx, Wy - H]], (x, y) => {
    let c = roof;
    if (o.st === 'eco' && !o.raw && dith(x, y, 0.3)) c = shade(c, -0.15);
    if (o.burnt && noise(x, y, o.seed + 2) < 0.6) c = mix(c, DARK, 0.8);
    if (o.snow && !o.raw) c = noise(x, y, o.seed + 7) < 0.12 ? C('#c8d8ec') : C('#f4f8fc'); // r27: neve no telhado (branca, sombra azul)
    return c;
  });
}

// ---------------------------------------------------------------- acessórios

/** r27 (I2): caixa-d'água de madeira sobre pernas (base em x, y no telhado). */
function tank27(t: T, x: number, y: number): void {
  t.line(x - 2, y, x - 2, y - 3, C('#3a3030')); t.line(x + 2, y, x + 2, y - 3, C('#3a3030'));
  t.rect(x - 3, y - 9, 7, 6, C('#7a5a3a')); for (let i = -2; i <= 3; i += 2) t.line(x + i, y - 9, x + i, y - 4, C('#5a4028'));
  t.poly([[x - 4, y - 9], [x + 4, y - 9], [x + 0.5, y - 12]], C('#4a3a30'));
}
/** r27 (I2): cúpula sombreada (luz da esquerda) — no lugar da elipse chapada. */
function domeTop27(t: T, cx: number, cy: number, r: number, h: number, c: Col): void {
  for (let z = 0; z < h; z++) { const ww = r * Math.sqrt(1 - (z / h) ** 2); for (let dx = -Math.ceil(ww); dx <= Math.ceil(ww); dx++) { if (Math.abs(dx + 0.5) > ww) continue; const f = (dx + 0.5) / Math.max(1, ww); t.set(cx + dx, cy - z, shade(c, f < -0.35 ? 0.18 : f < 0.25 ? 0 : -0.2)); } }
}
/** r27 (I2): chafariz isométrico (borda em losango, água com brilho, jato). */
function fountain27(t: T, gx: number, gy: number): void {
  t.poly([iso(gx - 0.7, gy - 0.7), iso(gx + 0.7, gy - 0.7), iso(gx + 0.7, gy + 0.7), iso(gx - 0.7, gy + 0.7)], C('#b8b4ac'));
  t.poly([iso(gx - 0.5, gy - 0.5), iso(gx + 0.5, gy - 0.5), iso(gx + 0.5, gy + 0.5), iso(gx - 0.5, gy + 0.5)], (x, y) => ((x + y) % 5 === 0 ? C('#a8e0f8') : C('#4a98d8')));
  const [x, y] = iso(gx, gy); t.rect(x, y - 5, 1, 5, C('#c8e8f8')); t.set(x - 1, y - 5, C('#e8f8ff')); t.set(x + 1, y - 5, C('#e8f8ff')); t.set(x - 2, y - 3, C('#c8e8f8')); t.set(x + 2, y - 3, C('#c8e8f8'));
}

function roofTop(gx: number, gy: number, w: number, d: number, H: number): [number, number] { const [x, y] = iso(gx + w / 2, gy + d / 2); return [x, y - H]; }
function accessories(t: T, L: T, b: Bld18, st: Style18, gx: number, gy: number, w: number, d: number, H: number, seed: number): void {
  const [cx, cy] = roofTop(gx, gy, w, d, H);
  const m = MAT[st];
  if (st === 'victorian' || st === 'brick') {
    for (let i = 0; i < Math.min(3, w); i++) { const [x, y] = iso(gx + 0.6 + i * 1.3, gy + 0.5); t.rect(x, y - H - 5, 2, 5, C('#6a3a2a')); t.rect(x, y - H - 6, 2, 1, C('#3a3030')); }
    if (st === 'brick' && H > 14) tank27(t, cx + 5, cy);
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
    if (w >= 3) { t.poly([[cx - 10, cy + 1], [cx - 6, cy - 1], [cx - 2, cy + 1], [cx - 6, cy + 3]], C('#5a5e66')); t.set(cx - 7, cy + 1, C('#f0f0f0')); t.set(cx - 5, cy + 1, C('#f0f0f0')); t.set(cx - 6, cy + 1, C('#f0f0f0')); }
  } else if (st === 'eco') {
    for (let i = 0; i < Math.max(1, w - 1); i++) { const [x, y] = iso(gx + 0.5 + i, gy + 0.4); t.poly([[x, y - H - 1], [x + 6, y - H + 2], [x + 4, y - H + 3], [x - 2, y - H]], C('#2a3a6a')); }
  } else if (st === 'gothic') {
    for (const [a, c] of [[0, 0], [w, 0], [0, d], [w, d]] as [number, number][]) { const [x, y] = iso(gx + a, gy + c); t.rect(x - 1, y - H - 7, 2, 7, m.wall); t.poly([[x - 2, y - H - 7], [x + 2, y - H - 7], [x, y - H - 12]], m.roof); }
    if (H > 14) { t.rect(cx - 2, cy - 14, 4, 14, m.wall); t.poly([[cx - 3, cy - 14], [cx + 3, cy - 14], [cx, cy - 24]], m.roof); L.set(cx, cy - 9, C('#c080ff')); }
  } else if (st === 'beaux') {
    domeTop27(t, cx, cy, Math.min(7, Math.round(w * 2.2)), Math.min(6, Math.round(w * 2)), m.roof); t.line(cx, cy - 7, cx, cy - 11, m.trim);
  } else if (st === 'tropical') {
    const [Nx, Ny] = iso(gx, gy), [Ex, Ey] = iso(gx + w, gy), [Sx, Sy] = iso(gx + w, gy + d), [Wx, Wy] = iso(gx, gy + d);
    t.poly([[Nx, Ny - H - 1], [Ex + 2, Ey - H], [Sx, Sy - H + 2], [Wx - 2, Wy - H], [cx, cy - 9]], (x, y) => (Math.floor(y) % 2 ? m.roof : shade(m.roof, -0.12)));
    const [px, py] = iso(gx + w + 0.4, gy + d + 0.2); t.line(px, py, px + 1, py - 14, C('#7a5a34')); for (const [dx, dy] of [[-5, 2], [5, 2], [-4, -2], [4, -2]]) t.line(px + 1, py - 14, px + 1 + dx, py - 14 + dy + 2, C('#3a8a3a'));
  } else if (st === 'loft') {
    tank27(t, cx + 5, cy);
    for (let i = -6; i <= 0; i += 2) t.set(cx + i, cy - 2, C('#c8b080')); t.line(cx - 7, cy - 4, cx, cy - 4, C('#26262a'));
  } else if (st === 'neon') {
    const [Wx, Wy] = iso(gx, gy + d), [Sx, Sy] = iso(gx + w, gy + d);
    for (const [z, c] of [[H - 2, C('#ff48c8')], [H - 5, C('#3ae0ff')]] as [number, Col][]) { t.line(Wx + 1, Wy - z, Sx - 1, Sy - z, c); L.line(Wx + 1, Wy - z, Sx - 1, Sy - z, c); }
    neonBoard27(t, L, Math.round(cx), Math.round(cy - 8), C('#ff70d0'), C('#3ae0ff'));
  }
  void seed;
}

const KCOL = (k: BKind) => ACCENT[k] ?? C('#a04040');

// ---------------------------------------------------------------- prédio

export interface Sprite18 { id: string; c: HTMLCanvasElement; lc: HTMLCanvasElement; x: number; y: number; depth: number; box: [number, number, number, number]; door: [number, number]; top: [number, number]; fp: [number, number, number, number]; kind: BKind; st: Bld18['st']; nb?: boolean;
  /** r27: prédio comum da cidade (lote que não está à venda para você) — não é clicável */
  filler?: boolean; /** r27: janelas acesas também de dia (sessão, show) */ lit?: boolean; /** r27: topo da chaminé (fábrica) */ chim?: [number, number]; vis?: BVis27;
  /** r27 (I2): altura (px) para a sombra projetada; sede vista de fora */ h?: number; hq?: HqExt27 }
/** r27: extras do desenho (estado visual, neve, cores da cidade, letreiro da época). I2: andares abertos da sede (I1). */
export interface Spr27 { vis?: BVis27; snow?: boolean; wall?: Col; roof?: Col; sign?: Era27['sign']; filler?: boolean; floorsOpen?: number }

function fp(b: Bld18, lw: number, ld: number): { w: number; d: number; H: number } {
  const L = b.lvl;
  if (b.kind === 'hq') return b.place ? { w: 1.9, d: 1.7, H: 7 } : [{ w: 2, d: 2, H: 8 }, { w: 2.4, d: 2.2, H: 10 }, { w: 3, d: 3, H: 15 }, { w: 4, d: 3, H: 24 }, { w: 5, d: 5, H: 30 }, { w: 3, d: 3, H: 84 }, { w: 5, d: 5, H: 50 }][Math.min(6, L)];
  if (b.kind === 'fest' || b.kind === 'park') return { w: lw - 0.4, d: ld - 0.4, H: 0 };
  if (b.kind === 'home') return { w: Math.min(lw - 1, 1.6 + L * 0.5), d: Math.min(ld - 1, 1.5 + L * 0.3), H: 6 + L * 3 };
  if (b.kind === 'sign') return { w: 1, d: 1, H: 18 };
  if (b.kind === 'store' || b.kind === 'rehearsal' || b.kind === 'imprint') return { w: Math.min(lw - 1, 2 + L * 0.5), d: Math.min(ld - 1, 1.6 + L * 0.3), H: 8 + L * 2 };
  if (b.kind === 'venue') return { w: Math.min(lw - 0.6, 2 + L * 0.7), d: Math.min(ld - 0.6, 1.8 + L * 0.5), H: 9 + L * 4 };
  if (b.kind === 'plant') return { w: Math.min(lw - 0.6, 2.5 + L * 0.6), d: Math.min(ld - 0.6, 2 + L * 0.5), H: 10 + L * 2 };
  return { w: Math.min(lw - 1, 1.6 + L * 0.7), d: Math.min(ld - 1, 1.6 + L * 0.6), H: 8 + L * 7 };
}

/** Desenha um prédio num sprite próprio (cor + luzes) dentro do lote dado. */
export function buildingSprite18(b: Bld18, lot: { gx: number; gy: number; w: number; d: number }, year: number, seed: number, brand = 'REC', x27: Spr27 = {}): Sprite18 {
  // r27 (I2): a sede segue a casca do interior (garagem → campus), com andares contados e fachada da época
  const hx = b.kind === 'hq' ? hqExt27({ level: b.lvl - 1, year: b.sy || year, building: b.st === 'renovating' || b.st === 'building', style: b.style, floorsOpen: x27.floorsOpen }) : undefined;
  const { w, d, H } = hx ? { w: hx.w, d: hx.d, H: hx.H } : fp(b, lot.w, lot.d);
  const gx = lot.gx + (lot.w - w) / 2, gy = lot.gy + (lot.d - d) / 2;
  const [Nx] = iso(gx, gy + d), [Ex] = iso(gx + w, gy), [, Ny] = iso(gx, gy), [, Sy] = iso(gx + w, gy + d);
  const x0 = Math.floor(Math.min(Nx, iso(lot.gx, lot.gy + lot.d)[0])) - 10, x1 = Math.ceil(Math.max(Ex, iso(lot.gx + lot.w, lot.gy)[0])) + 10;
  const y0 = Math.floor(Ny - H - 44), y1 = Math.ceil(Math.max(Sy, iso(lot.gx + lot.w, lot.gy + lot.d)[1])) + 4;
  const p = new Px(x1 - x0, y1 - y0), lp = new Px(x1 - x0, y1 - y0);
  const t = new T(p, x0, y0), L = new T(lp, x0, y0);
  const st = hx ? hx.facade : b.style ?? styleOf18(b.sy || year);
  const building = !hx && (b.st === 'building' || b.st === 'planned');
  const prog = b.prog ?? 1;
  const lit = x27.vis?.lit ? 0.9 : b.st === 'open' || b.st === 'renovating' ? 0.45 : b.st === 'damaged' ? 0.1 : 0;
  const o: BoxO = { st, seed, lit, raw: building, burnt: b.st === 'damaged', boarded: b.st === 'sold' || b.st === 'closed', worn: b.worn, snow: x27.snow };
  let chim: [number, number] | undefined;
  // r19: cor do tipo de negócio na fachada e no telhado (leitura rápida: estúdio vermelho, editora roxa…)
  if (ACCENT[b.kind] && st !== 'glass' && st !== 'neon' && !hx) { o.wall = mix(MAT[st].wall, ACCENT[b.kind]!, 0.22); o.roof = mix(MAT[st].roof, ACCENT[b.kind]!, 0.45); }
  if (b.kind === 'venue') o.roof = mix(MAT[st].roof, C('#a03030'), 0.4);
  if (b.kind === 'plant') o.roof = mix(MAT[st].roof, C('#606870'), 0.5);
  if (b.kind === 'museum') { o.wall = mix(MAT[st].wall, C('#f0ead8'), 0.5); o.roof = C('#c8bfa8'); }
  if (x27.wall !== undefined) o.wall = x27.wall;
  if (x27.roof !== undefined) o.roof = x27.roof;
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
    fountain27(t, gx + w / 2, gy + d / 2);
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
    if (building && prog < 0.25) { // r19: estágio 1 — escavação e fundação
      t.poly([iso(gx, gy), iso(gx + w, gy), iso(gx + w, gy + d), iso(gx, gy + d)], (x, y) => (noise(x, y, seed) < 0.3 ? C('#5a4430') : C('#6e5238')));
      const [px, py] = iso(gx + w * 0.75, gy + d * 0.3); t.poly([[px - 6, py], [px - 2, py - 4], [px + 2, py - 5], [px + 6, py]], C('#8a6a48')); t.line(px - 2, py - 4, px + 2, py - 5, C('#a88a60'));
      for (let i = 0; i < 4; i++) { const [rx, ry] = iso(gx + 0.4 + i * (w - 0.8) / 3, gy + d - 0.4); t.line(rx, ry, rx, ry - 6, C('#7a7a80')); }
      const [mx, my] = iso(gx + 0.6, gy + d * 0.5);
      if (year < 1920) { t.rect(mx - 3, my - 4, 6, 3, C('#8a6a40')); t.rect(mx + 3, my - 5, 2, 3, C('#5a3a20')); } else { t.rect(mx - 4, my - 5, 7, 4, C('#e0b020')); t.line(mx + 3, my - 5, mx + 8, my - 10, C('#e0b020')); t.line(mx + 8, my - 10, mx + 10, my - 6, C('#c09010')); }
      HH = 0;
    }
    if (hx) {
      hqBody27(t, L, hx, gx, gy, w, d, o, b.sy || year, brand);
    } else if (b.kind === 'home') {
      box(t, L, gx, gy, w, d, HH, 0, { ...o, lit: o.lit * 0.6 });
      if (!building) { const [ax, ay] = iso(gx, gy + d / 2), [bx, by] = iso(gx + w, gy + d / 2), [wx, wy] = iso(gx, gy + d), [sx, sy] = iso(gx + w, gy + d), [nx, ny] = iso(gx, gy), [ex, ey] = iso(gx + w, gy);
        const rc = st === 'midcentury' || st === 'glass' || st === 'eco' ? MAT[st].roof : C('#8a3a2a');
        t.poly([[wx, wy - HH], [sx, sy - HH], [bx, by - HH - 7], [ax, ay - HH - 7]], rc); t.poly([[sx, sy - HH], [ex, ey - HH], [bx, by - HH - 7]], shade(rc, -0.25)); void nx; void ny;
        if (b.lvl >= 3 && year >= 1955) pool27(t, lot.gx + lot.w - 1.5, lot.gy + lot.d - 1.1); // r27 (I2): piscina em losango, com borda
      }
    } else if (HH > 0) {
      box(t, L, gx, gy, w, d, HH, 0, o);
    }
    if (!building && !hx && b.st !== 'sold' && b.st !== 'closed') {
      if (b.kind === 'venue') { // marquise com lâmpadas (r27: acesa só em noite de show)
        const mq = x27.vis ? x27.vis.marquee : true;
        for (let u = 2; u < Sx - Wx - 2; u += 2) { t.set(Wx + u, Wy + u / 2 - 7, mq ? C('#fff0b0') : C('#8a8070')); if (mq) L.set(Wx + u, Wy + u / 2 - 7, (u / 2) % 2 ? LIT : C('#ff8040')); }
        t.line(Wx + 1, Wy - 8, Sx - 1, Sy2 - 8, C('#b03030'));
        t.rect(Wx + 2, Wy - H - 8, 3, 9, C('#c03030')); if (mq) L.rect(Wx + 2, Wy - H - 7, 3, 7, withAlpha(C('#ff5050'), 220));
        if (mq) { const pw = Math.min(14, Sx - Wx - 6); for (let u = 0; u < pw; u++) { const yy = Wy + (u + 3) / 2 - 12; t.set(Wx + 3 + u, yy, C('#fff4c0')); t.set(Wx + 3 + u, yy + 1, C('#fff4c0')); L.set(Wx + 3 + u, yy, C('#fff8d0')); L.set(Wx + 3 + u, yy + 1, u % 3 ? C('#ff60a0') : C('#fff8d0')); } }
      }
      if (b.kind === 'plant') { // telhado em dente de serra + chaminé
        for (let i = 0; i < Math.floor(w); i++) { const [x, y] = iso(gx + i + 0.5, gy + d / 2); t.poly([[x - 4, y - H], [x + 4, y - H], [x - 4, y - H - 5]], C('#7a7e86')); t.line(x - 4, y - H - 5, x + 4, y - H, C('#a8c0d8')); }
        const [x, y] = iso(gx + 0.4, gy + 0.4); t.rect(x - 1, y - H - 18, 3, 18, C('#8a4630')); t.rect(x - 1, y - H - 19, 3, 1, C('#3a3030')); chim = [x + 0.5, y - H - 19];
      }
      if (b.kind === 'museum') { for (let u = 2; u < Sx - Wx - 1; u += 3) t.line(Wx + u, Wy + u / 2 - 1, Wx + u, Wy + u / 2 - 9, C('#f0ece0')); t.poly([[Wx, Wy - 9], [Sx, Sy2 - 9], [(Wx + Sx) / 2, (Wy + Sy2) / 2 - 15]], C('#e8e0d0')); }
      if (b.kind === 'school') { const [x, y] = roofTop(gx, gy, w, d, H); t.rect(x - 2, y - 7, 5, 7, MAT[st].wall); t.poly([[x - 3, y - 7], [x + 3, y - 7], [x, y - 11]], C('#5a4a46')); t.disc(x + 0.5, y - 4.5, 1.2, C('#f8f4ec')); }
      if (b.kind === 'media') { const [x, y] = roofTop(gx, gy, w, d, H); for (let i = 0; i < 24; i++) t.set(x, y - i, Math.floor(i / 4) % 2 ? C('#e04040') : C('#f0f0f0')); t.line(x - 4, y, x, y - 18, C('#8a8a90')); t.line(x + 4, y, x, y - 18, C('#8a8a90')); L.set(x, y - 24, C('#ff3030')); if (year >= 1965) { t.rect(x + 6, y - 6, 2, 5, C('#d8dce0')); t.rect(x + 5, y - 5, 1, 3, C('#d8dce0')); t.set(x + 8, y - 4, C('#606468')); t.line(x + 6, y - 1, x + 6, y, C('#8a8a90')); } }
      if (b.kind === 'platform') { for (let u = 3; u < Sx - Wx - 2; u += 2) L.set(Wx + u, Wy + u / 2 - 4, (u % 3) ? C('#40f0ff') : C('#80ff80')); }
      if (b.kind === 'store') { for (let u = 1; u < Sx - Wx - 1; u++) { t.set(Wx + u, Wy + u / 2 - 7, Math.floor(u / 2) % 2 ? C('#e04848') : C('#f8f4ec')); t.set(Wx + u, Wy + u / 2 - 6, Math.floor(u / 2) % 2 ? C('#b03030') : C('#d8d4cc')); } }
      if (b.kind === 'dorm') { for (let z = 8; z < H - 2; z += 7) t.line(Wx + 1, Wy - z, Sx - 1, Sy2 - z, shade(MAT[st].trim, -0.2)); }
      if (b.kind === 'rehearsal') { t.rect(door[0] + 1, door[1] - 17, 1, 5, C('#f0c040')); t.disc(door[0], door[1] - 12, 1.3, C('#f0c040')); t.rect(door[0] + 2, door[1] - 17, 2, 1, C('#f0c040')); }
      if (ACCENT[b.kind] && b.kind !== 'store' && !x27.filler) { t.rect(door[0] - 3, door[1] - 9, 6, 2, KCOL(b.kind)); }
      if (x27.sign && H > 6) eraSign27(t, L, x27.sign, gx, gy, w, d, H, seed);
      if (b.kind !== 'home' && b.kind !== 'store') accessories(t, L, b, st, gx, gy, w, d, H, seed);
    }
    outlineOuter(p, OUTL27); // r27 (I2): contorno seletivo de 1 px (só por fora)
    if (hx) hqPost27(t, L, hx, gx, gy, w, d);
    else if (building || b.st === 'renovating') {
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
  return { id: b.id, kind: b.kind, st: b.st, fp: [gx, gy, w, d], c: p.canvas(), lc: lp.canvas(), x: x0, y: y0, depth: gx + w / 2 + gy + d / 2, box: [Math.min(Wx, Nx), Ny - H - (b.kind === 'media' ? 24 : 6), Math.max(Ex, Sx), Math.max(Sy, Sy2)], door, top: roofTop(gx, gy, w, d, H),
    filler: x27.filler, lit: !!x27.vis?.lit, chim, vis: x27.vis, h: H, hq: hx };
}

/** r27 (I2): placa de neon legível também de dia — moldura de metal, fundo escuro e o tubo colorido em zigue-zague
 *  (antes era um retângulo preto). (x, y) = canto de cima no meio. */
function neonBoard27(t: T, L: T, x: number, y: number, c: Col, c2: Col): void {
  t.line(x - 3, y + 6, x - 3, y + 8, C('#5a5a60')); t.line(x + 3, y + 6, x + 3, y + 8, C('#5a5a60'));
  t.rect(x - 5, y, 11, 7, C('#8a8a94')); t.rect(x - 4, y + 1, 9, 5, C('#2c2438'));
  for (let i = 0; i < 9; i++) { const yy = y + 2 + ((i % 4 === 1 || i % 4 === 2) ? 0 : 2); t.set(x - 4 + i, yy, c); L.set(x - 4 + i, yy, c); }
  t.set(x - 3, y + 3, c2); t.set(x + 3, y + 3, c2); L.set(x - 3, y + 3, c2); L.set(x + 3, y + 3, c2);
}
/** r27: letreiro da época na fachada/telhado (pintado, neon, neon dos anos 80, telão, holograma). */
function eraSign27(t: T, L: T, k: Era27['sign'], gx: number, gy: number, w: number, d: number, H: number, seed: number): void {
  const [Wx, Wy] = iso(gx, gy + d), [Sx, Sy] = iso(gx + w, gy + d), [Ex, Ey] = iso(gx + w, gy);
  const pick = <X,>(xs: X[]) => xs[Math.floor(noise(seed, 5) * xs.length) % xs.length];
  if (k === 'painted') { // anúncio pintado na lateral, meio desbotado
    const c = pick([C('#c8a060'), C('#b85a3a'), C('#d8c8a0')]), z = Math.min(H - 3, 12);
    t.poly([[Sx + 2, Sy - z + 1], [Ex - 2, Ey - z + 1], [Ex - 2, Ey - z + 6], [Sx + 2, Sy - z + 6]], withAlpha(c, 200));
    for (let u = Sx + 4; u < Ex - 4; u += 2) t.set(u, Sy - z + 3 - (u - Sx) / 2, withAlpha(C('#f4ecd8'), 220));
  } else if (k === 'neon' || k === 'neon80') { // tubos de neon na fachada
    const cs = k === 'neon80' ? [C('#ff48c8'), C('#3ae0ff')] : [C('#ff5040'), C('#60ff90')];
    const z = Math.max(5, H - 3);
    t.line(Wx + 2, Wy - z, Sx - 2, Sy - z, cs[0]); L.line(Wx + 2, Wy - z, Sx - 2, Sy - z, cs[0]);
    if (k === 'neon80') { t.line(Wx + 2, Wy - z + 2, Sx - 2, Sy - z + 2, cs[1]); L.line(Wx + 2, Wy - z + 2, Sx - 2, Sy - z + 2, cs[1]); }
    const mx = Math.round((Wx + Sx) / 2), my = Math.round((Wy + Sy) / 2 - z - 7);
    neonBoard27(t, L, mx, my, cs[1], cs[0]);
  } else if (k === 'screen') { // telão no telhado
    const [cx, cy] = roofTop(gx, gy, w, d, H), bw = Math.max(8, Math.min(14, w * 4));
    t.line(cx - 3, cy, cx - 3, cy - 5, C('#5a5a60')); t.line(cx + 3, cy, cx + 3, cy - 5, C('#5a5a60'));
    t.rect(cx - bw / 2 - 1, cy - 14, bw + 2, 10, C('#16181e'));
    const cs = [C('#ff4080'), C('#40c0ff'), C('#ffb020'), C('#40e090')], k0 = Math.floor(noise(seed, 5) * 4), c0 = cs[k0], c1 = cs[(k0 + 2) % 4];
    for (let i = 0; i < bw; i++) for (let j = 0; j < 8; j++) { // anúncio: fundo em degradê + "rosto" + faixa de texto
      const fx = i - bw * 0.68, fy = j - 3.2, face = fx * fx + fy * fy * 1.3 < 6;
      const c = face ? C('#f8e0c8') : j === 6 && i > 1 && i < bw * 0.5 && i % 2 ? C('#ffffff') : mix(c0, c1, j / 8);
      t.set(cx - bw / 2 + i, cy - 13 + j, c); L.set(cx - bw / 2 + i, cy - 13 + j, withAlpha(c, 235));
    }
  } else { // holograma
    const [cx, cy] = roofTop(gx, gy, w, d, H);
    t.poly([[cx - 5, cy - 10], [cx, cy - 18], [cx + 5, cy - 10], [cx, cy - 4]], withAlpha(C('#80f0ff'), 110)); L.poly([[cx - 4, cy - 10], [cx, cy - 16], [cx + 4, cy - 10], [cx, cy - 5]], withAlpha(C('#a0ffff'), 150));
  }
}

/** Telhado de duas águas (cumeeira ao longo de gx). */
function gable(t: T, gx: number, gy: number, w: number, d: number, H: number, rc: Col): void {
  const [ax, ay] = iso(gx, gy + d / 2), [bx, by] = iso(gx + w, gy + d / 2), [wx, wy] = iso(gx, gy + d), [sx, sy] = iso(gx + w, gy + d), [ex, ey] = iso(gx + w, gy);
  t.poly([[wx, wy - H], [sx, sy - H], [bx, by - H - 6], [ax, ay - H - 6]], (_x, y) => ((Math.floor(y) % 2) ? rc : shade(rc, -0.08))); t.poly([[sx, sy - H], [ex, ey - H], [bx, by - H - 6]], shade(rc, -0.25));
}

// ---------------------------------------------------------------- r27 (I2): a sede por fora (mesma casca do interior)

const OUTL27 = C('#1c1824', 165);
/** Padrão da fachada da sede: um andar = fh px, laje clara entre andares (dá para contar), janelas da época. */
function hqPat27(x: HqExt27): (u: number, hz: number, len: number, right: boolean) => WinK {
  const { fh, facade, floors, shell } = x;
  return (u, hz, len, right) => {
    const f = Math.floor(hz / fh), z = hz - f * fh;
    if (hz >= floors * fh) return 'trim'; // platibanda
    if (z < 1 && f > 0) return 'trim'; // laje entre andares
    if (!right && f === 0 && z < 5 && Math.abs(u - len / 2) < 1.6 && shell !== 'garage') return 'door';
    if (u < 1 || u > len - 1) return facade === 'glass' ? 'trim' : 'wall';
    if (f === 0 && shell === 'shop' && !right) return z >= 1 && z <= fh - 3 && Math.floor(u) % 7 !== 0 ? 'win' : 'wall'; // vitrine da loja
    if (z < 2 && facade !== 'glass') return 'wall';
    const ui = Math.floor(u);
    switch (facade) {
      case 'glass': return ui % 6 === 0 ? 'trim' : 'win';
      case 'midcentury': return z >= 2 && z <= fh - 3 ? (ui % 8 === 0 ? 'trim' : 'win') : 'wall'; // fita de janelas (não é pele de vidro)
      case 'deco': case 'beaux': case 'gothic': return ui % 5 === 0 ? 'trim' : z <= fh - 2 && ui % 5 >= 2 && ui % 5 <= 3 ? 'win' : 'wall';
      case 'loft': return z <= fh - 2 && ui % 6 >= 1 && ui % 6 <= 4 ? (ui % 6 === 2 || z === Math.floor(fh / 2) ? 'trim' : 'win') : 'wall';
      case 'brutal': return z >= 3 && z <= fh - 3 && ui % 5 >= 2 && ui % 5 <= 3 ? 'win' : 'wall';
      case 'postmod': return z <= fh - 3 && ui % 5 >= 1 && ui % 5 <= 3 ? 'win' : ui % 5 === 0 && z <= fh - 3 ? 'trim' : 'wall';
      case 'eco': return ui % 7 === 0 ? 'trim' : z <= fh - 2 ? 'win' : 'wall';
      default: return z <= fh - 2 && ui % 4 >= 1 && ui % 4 <= 2 ? 'win' : 'wall';
    }
  };
}
/** Placa na fachada esquerda, presa na altura z (px), no meio da face. */
function facePlate27(t: T, L: T, gx: number, gy: number, w: number, d: number, z: number, txt: string, bg: Col, fg: Col, glow?: Col): void {
  const [Wx, Wy] = iso(gx, gy + d), [Sx, Sy] = iso(gx + w, gy + d);
  const mx = (Wx + Sx) / 2, my = (Wy + Sy) / 2 - z;
  const bw = textWidth(txt) + 4;
  t.rect(mx - bw / 2, my - 6, bw, 7, bg); t.text(txt, mx - bw / 2 + 2, my - 5, fg);
  if (glow) L.rect(mx - bw / 2 + 1, my - 5, bw - 2, 5, glow);
}
/** Corpo da sede: casca, andares, fachada da época, porta, telhado e letreiro. */
function hqBody27(t: T, L: T, x: HqExt27, gx: number, gy: number, w: number, d: number, o: BoxO, year: number, brand: string): void {
  const done = x.floors * x.fh + (x.shell === 'garage' ? 0 : 2);
  const [Wx, Wy] = iso(gx, gy + d), [Sx, Sy] = iso(gx + w, gy + d);
  const win = x.facade === 'glass' ? (year < 1990 ? C('#5c5648') : year < 2020 ? C('#3e6a96') : C('#5aa8b4')) : undefined;
  const wall = x.shell === 'garage' ? (year < 1925 ? C('#8a5a40') : C('#c8c0b0')) : x.shell === 'loft' ? C('#8a4632') : undefined;
  const bo: BoxO = { ...o, st: x.facade, pat: hqPat27(x), win, wall: wall ?? o.wall, roof: x.roof === 'garden' ? C('#5a9a48') : o.roof };
  if (x.shell === 'campus') t.poly([iso(gx - 0.5, gy - 0.5), iso(gx + w + 0.5, gy - 0.5), iso(gx + w + 0.5, gy + d + 0.5), iso(gx - 0.5, gy + d + 0.5)], (px, py) => ((Math.floor(px / 2) + py) % 2 ? C('#c8c2b6') : C('#d4cec2')));
  box(t, L, gx, gy, w, d, done, 0, bo);
  if (x.building) box(t, L, gx + 0.15, gy + 0.15, w - 0.3, d - 0.3, x.H, done, { ...o, st: 'brutal', raw: true, lit: 0, noWin: true });
  const lerp = (u: number, z: number): [number, number] => [Wx + (Sx - Wx) * u, Wy + (Sy - Wy) * u - z];
  // térreo de cada casca
  if (x.shell === 'garage') {
    const old = year < 1925, dc = old ? C('#6a4428') : C('#b4b4ba');
    for (let z = 1; z <= 6; z++) { const [ax, ay] = lerp(0.18, z), [bx, by] = lerp(0.72, z); t.line(ax, ay, bx, by, z % 2 ? dc : shade(dc, -0.14)); }
    if (old) { const [ax, ay] = lerp(0.18, 6), [bx, by] = lerp(0.72, 1); t.line(ax, ay, bx, by, shade(dc, -0.3)); const [cx, cy] = lerp(0.18, 1), [dx, dy] = lerp(0.72, 6); t.line(cx, cy, dx, dy, shade(dc, -0.3)); }
    else { const [ax, ay] = lerp(0.2, 1), [bx, by] = lerp(0.7, 1); t.line(ax, ay, bx, by, LIT); L.line(ax, ay, bx, by, LIT); } // luz por baixo da porta
    const [px, py] = lerp(0.84, 0); t.rect(px, py - 5, 2, 5, C('#5a3a28')); // porta lateral
  }
  if (x.shell === 'shop') { // toldo listrado da loja do térreo
    for (let u = 1; u < Sx - Wx - 1; u++) { const yy = Wy + u / 2 - x.fh + 1; t.set(Wx + u, yy, Math.floor(u / 2) % 2 ? C('#2f6a4a') : C('#f0e8d0')); t.set(Wx + u, yy + 1, Math.floor(u / 2) % 2 ? C('#245038') : C('#d8d0b8')); }
  }
  if (x.shell === 'loft') { // escada de incêndio em zigue-zague e guincho de carga
    const ink = C('#2a2a30');
    for (let f = 1; f < x.floors; f++) { const [ax, ay] = lerp(0.62, f * x.fh), [bx, by] = lerp(0.92, f * x.fh); t.line(ax, ay, bx, by, ink); const [cx, cy] = lerp(0.64, f * x.fh - x.fh + 1); t.line(cx, cy, ax + 4, ay + 2, ink); }
    const [hx2, hy2] = iso(gx + w, gy + d * 0.5); t.line(hx2, hy2 - done + 1, hx2 + 3, hy2 - done - 1, ink); t.line(hx2 + 3, hy2 - done - 1, hx2 + 3, hy2 - done + 4, C('#6a6a70'));
  }
  // placa do selo sobre a porta (todas as cascas)
  facePlate27(t, L, gx, gy, w, d, x.shell === 'garage' ? 8 : x.fh - 1, brand, C('#1a1214'), year >= 1925 ? C('#ffd060') : C('#f0e8d0'), withAlpha(C('#ffd060'), 140));
  if (x.building) return; // telhado em obra: andaime e guindaste em hqPost27
  const [cx, cy] = roofTop(gx, gy, w, d, done);
  const rcol = year < 1960 ? C('#6a3a2e') : C('#7a6a5e');
  if (x.roof === 'gable') gable(t, gx, gy, w, d, done, x.shell === 'garage' && year >= 1925 ? C('#7a6a5a') : rcol);
  if (x.roof === 'tank') { // caixa-d'água de madeira sobre pernas
    const [tx, ty] = iso(gx + w * 0.7, gy + d * 0.3); const yy = ty - done;
    t.line(tx - 2, yy, tx - 2, yy - 4, C('#3a3030')); t.line(tx + 2, yy, tx + 2, yy - 4, C('#3a3030'));
    t.rect(tx - 3, yy - 10, 7, 6, C('#7a5a3a')); for (let i = -2; i <= 3; i += 2) t.line(tx + i, yy - 10, tx + i, yy - 5, C('#5a4028'));
    t.poly([[tx - 4, yy - 10], [tx + 4, yy - 10], [tx + 0.5, yy - 13]], C('#4a3a30'));
  }
  if (x.roof === 'flat') { for (const [u, v] of [[0.25, 0.3], [0.55, 0.25]] as [number, number][]) { const [ax, ay] = iso(gx + w * u, gy + d * v); t.rect(ax - 2, ay - done - 3, 4, 3, C('#9a9ca4')); t.rect(ax - 2, ay - done - 3, 4, 1, C('#c0c4cc')); } }
  if (x.roof === 'crown') { // coroa art déco escalonada + agulha
    box(t, L, gx + 0.35, gy + 0.35, w - 0.7, d - 0.7, done + 6, done, { ...bo, pat: undefined, noWin: true });
    box(t, L, gx + 0.75, gy + 0.75, w - 1.5, d - 1.5, done + 11, done + 6, { ...bo, pat: undefined, noWin: true });
    const [sx, sy] = roofTop(gx, gy, w, d, done + 11); t.line(sx, sy, sx, sy - 10, MAT.deco.trim); L.set(sx, sy - 10, C('#ff6060'));
  }
  if (x.roof === 'antenna') {
    box(t, L, gx + 0.6, gy + 0.6, w - 1.2, d - 1.2, done + 5, done, { ...bo, pat: undefined, noWin: true, wall: shade(MAT[x.facade].wall, -0.1) });
    const [sx, sy] = roofTop(gx, gy, w, d, done + 5); t.line(sx + 2, sy, sx + 2, sy - 12, C('#c0c8d0')); L.set(sx + 2, sy - 12, C('#ff4040'));
    if (year >= 1970) { const q = [iso(gx + 0.2, gy + 0.2), iso(gx + 1.0, gy + 0.2), iso(gx + 1.0, gy + 1.0), iso(gx + 0.2, gy + 1.0)].map(([a, b]) => [a, b - done] as [number, number]); t.poly(q, C('#5a5e66')); const [hx3, hy3] = iso(gx + 0.6, gy + 0.6); t.text('H', hx3 - 1, hy3 - done - 3, C('#f0f0f0')); }
  }
  if (x.roof === 'garden') { // telhado verde: árvores e placas solares
    canopy27(t, cx - 10, cy - 8, C('#3a9040'), 3); canopy27(t, cx + 3, cy - 6, C('#3a9040'), 5);
    if (year >= 1990) for (let i = 0; i < 3; i++) { const [ax, ay] = iso(gx + w - 1.2, gy + 0.4 + i * 0.6); t.poly([[ax - 4, ay - done], [ax + 2, ay - done + 3], [ax + 4, ay - done + 2], [ax - 2, ay - done - 1]], C('#24345a')); }
  }
  // letreiro do selo no telhado (prédio, torre, campus), na linguagem da época
  if (x.rooftopSign) {
    const k = x.sign, bw = textWidth(brand) + 4;
    const [mx, my] = iso(gx + w * 0.5, gy + d - 0.2); const yy = my - done - 1;
    const bg = k === 'painted' ? C('#efe6cc') : k === 'holo' ? withAlpha(C('#60e0ff'), 150) : C('#16141c');
    const fg = k === 'painted' ? C('#a82a20') : k === 'neon' ? C('#ff5a4a') : k === 'neon80' ? C('#ff48c8') : k === 'screen' ? C('#40e0ff') : C('#e0ffff');
    t.line(mx - bw / 2 + 2, yy, mx - bw / 2 + 2, yy - 3, C('#4a4a50')); t.line(mx + bw / 2 - 2, yy, mx + bw / 2 - 2, yy - 3, C('#4a4a50'));
    t.rect(mx - bw / 2, yy - 10, bw, 7, bg); t.text(brand, mx - bw / 2 + 2, yy - 9, fg);
    if (k !== 'painted') L.rect(mx - bw / 2 + 1, yy - 9, bw - 2, 5, withAlpha(fg, 170));
  }
}
/** Obra na sede: andaime no andar novo (e no de baixo) + guindaste a partir do prédio. Depois do contorno. */
function hqPost27(t: T, L: T, x: HqExt27, gx: number, gy: number, w: number, d: number): void {
  if (!x.building) return;
  const [Wx, Wy] = iso(gx, gy + d), [Sx, Sy] = iso(gx + w, gy + d), [Ex, Ey] = iso(gx + w, gy);
  const z0 = Math.max(2, x.floors * x.fh - x.fh), top = x.H + 2;
  for (let z = z0; z <= top; z += 4) { t.line(Wx - 1, Wy - z, Sx, Sy - z, SCAF); t.line(Sx, Sy - z, Ex + 1, Ey - z, SCAF2); }
  for (let u = 0; u <= Sx - Wx; u += 4) t.line(Wx + u, Wy + u / 2 - z0, Wx + u, Wy + u / 2 - top, SCAF);
  for (let u = 0; u <= Ex - Sx; u += 4) t.line(Sx + u, Sy - u / 2 - z0, Sx + u, Sy - u / 2 - top, SCAF2);
  if (x.crane) {
    const [cx, cy] = iso(gx + w + 0.3, gy + 0.2), mast = x.H + 20;
    for (let z = 0; z < mast; z++) t.set(cx, cy - z, z % 4 === 0 ? C('#a07a10') : C('#e0b020'));
    for (let z = 0; z < mast; z += 3) t.set(cx + 1, cy - z, C('#c09010'));
    t.line(cx - 24, cy - mast, cx + 8, cy - mast, C('#e0b020')); t.line(cx, cy - mast - 4, cx - 18, cy - mast, C('#a07a10')); t.line(cx, cy - mast - 4, cx + 8, cy - mast, C('#a07a10'));
    t.line(cx - 15, cy - mast, cx - 15, cy - x.H - 6, C('#5a5a60')); t.rect(cx - 17, cy - x.H - 6, 5, 2, RAW); t.rect(cx + 5, cy - mast + 1, 3, 3, C('#7a7a80'));
    L.set(cx, cy - mast - 5, C('#ff4040')); L.set(cx - 24, cy - mast, C('#ff4040'));
  }
}
/** Piscina em losango com borda clara e reflexo. */
function pool27(t: T, gx: number, gy: number): void {
  t.poly([iso(gx - 0.1, gy - 0.1), iso(gx + 1.1, gy - 0.1), iso(gx + 1.1, gy + 0.8), iso(gx - 0.1, gy + 0.8)], C('#e8e4da'));
  t.poly([iso(gx, gy), iso(gx + 1, gy), iso(gx + 1, gy + 0.7), iso(gx, gy + 0.7)], (x, y) => ((x + y * 3) % 7 === 0 ? C('#a8e4f8') : C('#4ab0e0')));
}

/** r19: miniatura de um estilo (para o seletor nos popups). */
export function stylePreview19(st: Style18, year: number): HTMLCanvasElement {
  const lot = { gx: 0, gy: 0, w: 3, d: 3 };
  const sp = buildingSprite18({ id: 'pv', kind: 'dorm', name: '', city: '', zone: 'campus', lvl: 2, st: 'open', since: year, sy: year, style: st }, lot, year, 7, '');
  const c = document.createElement('canvas'); c.width = 44; c.height = 46;
  const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
  const [gx, gy] = iso(1.5, 1.5);
  ctx.drawImage(sp.c, sp.x - gx + 22, sp.y - gy + 34);
  return c;
}

function tree(t: T, x: number, y: number, year: number, season: Env18['season'], seed: number, env?: Env18): void {
  // r27: palmeira no litoral tropical; no trópico não há inverno (folhagem sempre verde e viva)
  // r27 (I2): árvores desenhadas pixel a pixel (copa em 3 tons com contorno; nada de bolinha solta) + sombra curta
  x = Math.round(x); y = Math.round(y);
  t.poly([[x - 1, y + 1], [x + 3, y - 1], [x + 7, y + 1], [x + 3, y + 3]], withAlpha(C('#141828'), 60));
  if (env && env.climate === 'tropical' && noise(seed, 3) < 0.6) { palm27(t, x, y, seed); return; }
  const bare = season === 'winter' && (!env || env.climate === 'cold' || env.climate === 'mild');
  if (bare) {
    const br = C('#5a4030');
    t.rect(x, y - 5, 1, 5, br); t.line(x, y - 4, x - 2, y - 7, br); t.line(x, y - 5, x + 2, y - 8, br); t.set(x - 3, y - 8, br); t.set(x + 1, y - 8, br); t.set(x + 3, y - 9, br);
    if (env?.snow) { t.set(x - 2, y - 8, C('#ffffff')); t.set(x + 2, y - 9, C('#ffffff')); t.set(x - 1, y - 6, C('#eef4fa')); }
    return;
  }
  if (env?.climate === 'cold' || (env?.climate === 'mild' && noise(seed, 5) < 0.25)) { conifer27(t, x, y, env?.snow ?? false); return; }
  const c = env?.climate === 'tropical' ? C('#2c9a3c') : env?.climate === 'arid' ? C('#7a9a48') : season === 'autumn' ? (noise(seed, 1) < 0.5 ? C('#d8862a') : C('#d0aa30')) : season === 'spring' && noise(seed, 2) < 0.35 ? C('#f0a0c4') : C('#3a903c');
  t.rect(x, y - 3, 1, 3, C('#5a3a20'));
  canopy27(t, x - 3, y - 10, c, seed);
  void year;
}
/** Copa de árvore (máscara 7×7) em 3 tons + contorno escuro: luz no alto à esquerda. */
const CANOPY27 = ['..###..', '.#####.', '#######', '#######', '#######', '.#####.', '..#.#..'];
function canopy27(t: T, x0: number, y0: number, c: Col, seed: number): void {
  const out = shade(c, -0.55), dk = shade(c, -0.22), hi = shade(c, 0.22);
  const on = (i: number, j: number) => j >= 0 && j < 7 && i >= 0 && i < 7 && CANOPY27[j][i] === '#';
  for (let j = -1; j <= 7; j++) for (let i = -1; i <= 7; i++) {
    if (on(i, j)) { const g = i + j; t.set(x0 + i, y0 + j, g <= 4 ? (noise(i, j, seed) < 0.7 ? hi : c) : g >= 9 ? dk : noise(i, j, seed + 1) < 0.25 ? dk : c); }
    else if (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1)) t.set(x0 + i, y0 + j, withAlpha(out, 200));
  }
}
function palm27(t: T, x: number, y: number, seed: number): void {
  const lean = noise(seed, 9) < 0.5 ? 1 : -1, tr = C('#8a6a40');
  for (let i = 0; i < 10; i++) t.set(x + Math.round((i * i * lean) / 40), y - i, i % 3 === 0 ? shade(tr, -0.2) : tr);
  const tx = x + Math.round((81 * lean) / 40), ty = y - 10, g = C('#2e9a3a'), gd = C('#1e6a2a');
  for (const [dx, dy] of [[-5, 3], [5, 3], [-4, 0], [4, 0], [-2, -2], [2, -2]] as [number, number][]) {
    for (let k = 1; k <= 5; k++) { const px = tx + Math.round((dx * k) / 5), py = ty + Math.round((dy * k) / 5 + (k * k) / 10); t.set(px, py, k > 3 ? gd : g); t.set(px, py + 1, withAlpha(gd, 160)); }
  }
  t.set(tx, ty, C('#6a4a28')); t.set(tx + 1, ty + 1, C('#6a4a28'));
}
function conifer27(t: T, x: number, y: number, snow: boolean): void {
  const g = C('#2a6a3a'), d = C('#1c4a2a'), o = C('#10241a');
  t.rect(x, y - 2, 1, 2, C('#4a3020'));
  for (let k = 0; k < 3; k++) { const w = 3 - k, yy = y - 3 - k * 3; for (let j = 0; j < 4; j++) for (let i = -w - 1 + Math.floor(j / 2); i <= w + 1 - Math.floor(j / 2); i++) { const edge = Math.abs(i) === w + 1 - Math.floor(j / 2); t.set(x + i, yy - j, edge ? o : i <= 0 ? (snow && j === 3 ? C('#f4f8fc') : g) : d); } }
  t.set(x, y - 13, o);
}

// ---------------------------------------------------------------- chão

/** r27: paleta do céu e da grama por clima, estação e tempo (cores vivas; a neve é branca com sombra azul). */
export function palette27(env: Env18): { skyTop: Col; skyBot: Col; grass: Col; grass2: Col } {
  const old = env.year < 1946 ? 0.12 : 0;
  let skyTop = env.snow ? C('#78b0e4') : env.rain ? C('#7f93ae') : env.climate === 'tropical' ? C('#3c9ce8') : env.climate === 'arid' ? C('#5aa8e6') : C('#4ea2e6');
  let skyBot = env.snow ? C('#e6f2fc') : env.rain ? C('#c0cad8') : env.climate === 'arid' ? C('#f2e0b8') : env.climate === 'tropical' ? C('#c4ecff') : C('#d4ecfa');
  if (old) { skyTop = mix(skyTop, C('#c8b890'), old); skyBot = mix(skyBot, C('#f0e4c8'), old); }
  let grass = env.snow ? C('#f4f8fc') : env.climate === 'arid' ? C('#cdb070') : env.climate === 'tropical' ? C('#3fa443') : env.season === 'autumn' ? C('#b8a03c') : env.season === 'winter' ? C('#7aa058') : env.season === 'spring' ? C('#66bc4c') : C('#52aa46');
  if (env.rain && !env.snow) grass = shade(grass, -0.08);
  const grass2 = env.snow ? C('#d6e4f2') : shade(grass, -0.1);
  return { skyTop, skyBot, grass, grass2 };
}

interface Ground27 { c: HTMLCanvasElement; lc: HTMLCanvasElement }
function groundCanvas(env: Env18, seed: number, used: Set<number>, sprites: Sprite18[], lms: Landmark19[], marks: Mark19[], look: CityLook27, sale: Sale27[]): Ground27 {
  const y = env.year;
  const p = new Px(G.mw, G.mh), gl = new Px(G.mw, G.mh);
  const road = y < 1910 ? C('#8a6e4c') : y < 1950 ? C('#6e6a66') : y < 2025 ? C('#44464e') : C('#4e5668');
  const walk = y < 1910 ? C('#b0946a') : y < 2025 ? C('#c4bcae') : C('#d0d4da');
  const pal = palette27(env);
  const { grass } = pal;
  const sea = env.rain ? C('#3a7aa0') : C('#2a8ad0'), sea2 = shade(sea, 0.25), sand = C('#ead8a8');
  const { gw: GW, gh: GH } = G;
  for (let py = 0; py < G.mh; py++) for (let px = 0; px < G.mw; px++) {
    const [gx, gy] = unIso(px + 0.5, py + 0.5);
    let c: Col;
    if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) {
      if (py < HZ) c = mix(pal.skyTop, pal.skyBot, Math.pow(py / HZ, 0.8));
      else if (look.sea) { // r27: cidade de baía: o mapa é cercado de mar e areia
        const edge = Math.min(Math.abs(gx < 0 ? gx : gx >= GW ? gx - GW : 0), 9) + Math.min(Math.abs(gy < 0 ? gy : gy >= GH ? gy - GH : 0), 9);
        // r27 (I2): areia → espuma (1 px) → raso → fundo, com brilhos em traços de 2 px (sem ruído de confete)
        const glint = (Math.floor(px / 2) * 7 + py * 13) % 61 === 0 && py % 3 === 0;
        c = edge < 0.55 ? (dith(px, py, 0.2) ? shade(sand, -0.06) : sand) : edge < 0.72 ? (dith(px, py, 0.5) ? C('#f4fbff') : C('#d6eef8')) : edge < 1.6 ? (glint ? sea2 : mix(sea, C('#5cc0e8'), 0.45 - edge * 0.2)) : glint ? sea2 : edge > 4 ? shade(sea, -0.06) : sea;
      } else { // r27 (I2): campo fora do mapa um tom abaixo, com sebes a cada quadra (sem pontilhado cheio)
        const hedge = (Math.abs(gx % 5) < 0.18 || Math.abs(gy % 5) < 0.18) && (gx < -0.6 || gy < -0.6 || gx > GW + 0.6 || gy > GH + 0.6);
        c = env.snow ? (dith(px, py, 0.2) ? C('#dfe9f4') : C('#eaf1f8')) : hedge ? shade(grass, -0.24) : dith(px, py, 0.12) ? shade(grass, -0.2) : shade(grass, -0.14);
      }
    } else if (ROAD(gx, gy)) {
      c = road;
      if (y < 1910 && noise(px, py, 1) < 0.15) c = shade(road, -0.15);
      else if (y >= 1910 && y < 1950 && ((Math.floor(gx * 4) + Math.floor(gy * 4)) % 2 === 0)) c = shade(road, 0.06);
      if (y >= 1955) {
        const lc = y >= 2025 ? C('#60e0ff') : y >= 1975 ? C('#f0d040') : C('#e8e8e8');
        const hb = hAt(gy), va = vAt(gx);
        if (hb !== undefined && Math.abs(gy - hb - 1) < 0.06 && Math.floor(gx * 2) % 2 === 0 && va === undefined) c = lc;
        if (va !== undefined && Math.abs(gx - va - 1) < 0.06 && Math.floor(gy * 2) % 2 === 0 && hb === undefined) c = lc;
        // faixas de pedestre em cada cruzamento (r27: também nos dos bairros novos)
        if (Math.floor((gx + gy) * 5) % 2 === 0 && VROADS.some((a) => HROADS.some((b) => (gx >= a - 0.1 && gx < a + 2.1 && gy > b - 0.5 && gy < b + 0.1) || (gy >= b - 0.1 && gy < b + 2.1 && gx > a + 2 && gx < a + 2.5)))) c = C('#e8e8e8');
      }
      if (env.snow && noise(px, py, 2) < 0.18) c = mix(c, C('#f4f8fc'), 0.7); // neve só nas bordas: a rua continua escura e legível
      if (env.rain) { c = shade(c, -0.1); if (noise(px, py, 8) < 0.04) c = shade(c, 0.35); } // poças refletindo
    } else if (WALK(gx, gy)) {
      c = walk;
      if ((Math.floor(gx * 2) + Math.floor(gy * 2)) % 2 === 0) c = shade(c, -0.05);
      if (env.snow && noise(px, py, 3) < 0.45) c = C('#f4f8fc');
      if (env.rain) c = shade(c, -0.08);
    } else {
      const lot = LOTS18.findIndex((l0) => gx >= l0.gx && gx < l0.gx + l0.w && gy >= l0.gy && gy < l0.gy + l0.d);
      c = dith(px, py, 0.18) ? pal.grass2 : grass;
      if (lot >= 0 && used.has(lot)) c = env.snow ? (dith(px, py, 0.2) ? C('#dfe8f2') : C('#eef3f8')) : mix(grass, walk, 0.5);
      if (!env.snow && noise(px, py, seed) < 0.1) c = shade(c, -0.07);
    }
    p.put(px, py, c);
  }
  horizon27(p, gl, env, look, seed, pal.skyBot);
  // r27 (I2): marcos em pixel isométrico, em 4 bastidores atrás do mapa (altos no fundo, largos nas laterais);
  // a escolha (até 4, por peso de ícone e ano de construção) é a função pura mapLms27 (city27.ts)
  lms.forEach((lm, i) => {
    const slot = (lm as Landmark19 & { slot?: number }).slot ?? i;
    const [sgx, sgy] = LM_SLOTS27[slot % LM_SLOTS27.length];
    const [lx, ly] = iso(sgx, sgy);
    marks.push({ id: lm.id, box: drawLmIso27(p, gl, lm.id, lm.sh, lx, ly, y, look.sea, seed) });
  });
  // r27 (I2): sombra projetada de cada prédio para a direita (luz do alto à esquerda)
  for (const sp of sprites) {
    const [gx, gy, w, d] = sp.fp, h = sp.h ?? 0;
    if (!w || !d || h < 4) continue;
    const L = Math.min(3, h / 14);
    p.poly([iso(gx, gy), iso(gx + w + L, gy), iso(gx + w + L, gy + d), iso(gx, gy + d)], withAlpha(C('#141828'), 66));
  }
  const t = new T(p, 0, 0);
  // r19: árvores alinhadas na avenida (a partir de 1920); r27: palmeiras no trópico, galhos nus no inverno frio
  if (y >= 1920) for (const b of hIn()) for (const gx of [2, 6, 14, 18, 24, 27]) { if (gx >= GW) continue; const [x, yy] = iso(gx + 0.3, b - 0.25); tree(t, x, yy, y, env.season, b === 7 ? gx : gx + b * 7, env); }
  // r27: lotes à venda (só os que você pode pagar): terreno capinado e placa "À VENDA" com a cor do tipo sugerido
  for (const sl of sale) {
    const l0 = LOTS18[sl.lot];
    if (!l0) continue;
    t.poly([iso(l0.gx + 0.3, l0.gy + 0.3), iso(l0.gx + l0.w - 0.3, l0.gy + 0.3), iso(l0.gx + l0.w - 0.3, l0.gy + l0.d - 0.3), iso(l0.gx + 0.3, l0.gy + l0.d - 0.3)],
      (x2, y2) => (env.snow ? (dith(x2, y2, 0.25) ? C('#e2ebf4') : C('#f2f6fa')) : (Math.floor((x2 + y2 * 2) / 3) % 2 ? shade(grass, 0.06) : shade(grass, -0.03))));
  }
  // r19: caminhos da porta de cada prédio até a calçada mais próxima (busca em meia-quadra)
  const pc = y < 1910 ? C('#a08460') : y < 1950 ? C('#b0a690') : y < 2025 ? C('#c4bcae') : C('#d0d4da');
  for (const sp of sprites) if (!sp.filler) for (const cell of path19(sp, sprites)) {
    const [cx, cy] = cell, q: [number, number][] = [iso(cx, cy), iso(cx + 0.5, cy), iso(cx + 0.5, cy + 0.5), iso(cx, cy + 0.5)];
    t.poly(q, (x2, y2) => (env.snow && noise(x2, y2, 4) < 0.5 ? C('#eef2f6') : dith(x2, y2, 0.15) ? shade(pc, -0.06) : pc));
  }
  return { c: p.canvas(), lc: gl.canvas() };
}

/** r27: horizonte pela cidade e pela época — morros + mar (baía), torres (Nova York), sobrados de tijolo com
 *  chaminés (Londres) ou genérico. Janelas do horizonte vão para `gl` (acendem à noite). */
function horizon27(p: Px, gl: Px, env: Env18, look: CityLook27, seed: number, skyBot: Col): void {
  const y = env.year;
  const air = (c: Col, k = 0.42) => mix(c, skyBot, k);
  const winLit = C('#ffd77a'), winLit2 = C('#fff0b8');
  const bld = (x: number, bw: number, bh: number, base: Col, o: { win?: boolean; pitch?: boolean; chim?: boolean; ant?: boolean; k?: number } = {}) => {
    const c = air(base, o.k ?? 0.42), dk = shade(c, -0.12);
    for (let i = 0; i < bw; i++) for (let j = 0; j < bh; j++) p.put(x + i, HZ - j, i === bw - 1 ? dk : c);
    if (o.pitch) for (let i = 0; i < bw; i++) { const hh = Math.min(i, bw - 1 - i) / 2; for (let j = 0; j < hh; j++) p.put(x + i, HZ - bh - j, shade(c, -0.2)); }
    if (o.chim) { p.rect(x + 1, HZ - bh - 4, 2, 4, shade(c, -0.25)); if (bw > 6) p.rect(x + bw - 3, HZ - bh - 3, 2, 3, shade(c, -0.25)); }
    if (o.ant) { p.rect(x + Math.floor(bw / 2), HZ - bh - 6, 1, 6, shade(c, -0.3)); gl.put(x + Math.floor(bw / 2), HZ - bh - 6, C('#ff4040')); }
    if (o.win !== false) for (let j = 3; j < bh - 2; j += 3) for (let i = 1; i < bw - 1; i += 2) {
      p.put(x + i, HZ - j, shade(c, -0.08));
      if (noise(x + i, j, seed + 11) < (y >= 1920 ? 0.42 : 0.25)) gl.put(x + i, HZ - j, noise(i, j, seed) < 0.2 ? winLit2 : winLit);
    }
  };
  const W = look.wall.map((hx) => C(hx));
  if (look.k === 'bay') {
    // r27 (I2): mar atrás da cidade + morros em cumeeira suave (sino, não semicírculo), encosta esquerda iluminada;
    // favela só no Rio/Salvador (casinhas em fileiras), porto baixo em Sydney
    for (let px = 0; px < G.mw; px++) for (let j = 0; j < 7; j++) p.put(px, HZ - j, j === 6 ? air(C('#3a90d0'), 0.3) : (px * 7 + j * 13) % 23 === 0 ? air(C('#9ad0f0'), 0.3) : air(C('#2a80c8'), 0.25));
    const amp = look.hillAmp;
    const kx = G.mw / MW; // r27 (LOTS): canvas maior = morros e casario espalhados na mesma proporção
    const HILLS: [number, number, number][] = [[20, 48, 30], [72, 30, 24], [244, 40, 26], [292, 54, 24]].map(([c, hh, w]) => [Math.round(c * kx), hh, w] as [number, number, number]);
    const hAt = (px: number) => Math.max(0, ...HILLS.map(([c, hh, w]) => hh * amp * Math.exp(-(((px - c) / w) ** 2) * 1.6))) + (amp > 0 ? (noise(px >> 2, 1, seed) - 0.5) * 1.6 : 0);
    const roofs = [C('#c8603c'), C('#e8c070'), C('#f0ece0'), C('#70a0d0'), C('#d88a8a'), C('#9ac088')];
    for (let px = 0; px < G.mw; px++) {
      const hh = Math.round(hAt(px));
      if (hh < 2) continue;
      const slope = hAt(px + 2) - hAt(px - 2);
      for (let j = 0; j < hh; j++) {
        let c = slope > 0 ? C('#3e8c46') : C('#2c6c38');
        if (j >= hh - 1) c = shade(c, 0.16);
        else if (Math.abs(slope) > 3.2 && j > hh * 0.45 && noise(px, j, seed + 5) < 0.6) c = slope > 0 ? C('#8e8a7e') : C('#6e6a62'); // costão de pedra
        else if (dith(px, j, 0.18)) c = shade(c, -0.08);
        if (look.favela && j < hh * 0.55 && hh > 9) { // casinhas em fileiras escalonadas
          const row = Math.floor(j / 3), col = Math.floor((px + row * 2) / 3);
          if (noise(col, row, seed + 9) < 0.72 && (px + row * 2) % 3 !== 2) {
            const rc = roofs[Math.floor(noise(col, row, seed + 1) * roofs.length)];
            c = j % 3 === 2 ? shade(rc, -0.2) : rc;
            if (j % 3 === 0 && noise(col, row, seed + 2) < 0.45) gl.put(px, HZ - 7 - j, winLit);
          }
        }
        p.put(px, HZ - 7 - j, air(c, 0.24));
      }
    }
    const maxH = y < 1930 ? 10 : y < 1960 ? 18 : y < 1990 ? 26 : 34;
    for (let x = Math.round(96 * kx); x < Math.round(226 * kx);) { const bw = 5 + Math.floor(noise(x, 9, seed) * 7), bh = 6 + Math.floor(noise(x, 11, seed) * maxH); bld(x, bw, bh + 7, W[Math.floor(noise(x, 2, seed) * W.length)], { k: 0.3 }); x += bw + 1; }
    return;
  }
  if (look.k === 'stone') {
    // r27 (I2): fileiras de prédios de pedra clara com mansarda cinza-azulada e chaminés; cúpulas e torres raras
    for (let x = 0; x < G.mw;) {
      const bw = 10 + Math.floor(noise(x, 9, seed) * 10), bh = 10 + Math.floor(noise(x, 11, seed) * (y < 1960 ? 8 : 14));
      bld(x, bw, bh, W[Math.floor(noise(x, 2, seed) * W.length)], { k: 0.3 });
      const roof = air(C('#5c6a80'), 0.3);
      for (let i = 0; i < bw; i++) for (let j = 0; j < 4; j++) if (i >= j && i < bw - j) p.put(x + i, HZ - bh - j, j === 3 ? shade(roof, 0.15) : roof);
      for (let i = 2; i < bw - 2; i += 4) { p.put(x + i, HZ - bh - 2, air(C('#e8e0cc'), 0.3)); gl.put(x + i, HZ - bh - 2, noise(x + i, 3, seed) < 0.4 ? winLit : 0); }
      if (noise(x, 4, seed) < 0.3) p.rect(x + bw - 4, HZ - bh - 7, 2, 4, air(C('#8a7a6a'), 0.3));
      if (noise(x, 6, seed) < 0.08) { const cx = x + Math.floor(bw / 2); for (let j = 0; j < 7; j++) for (let i = -4; i <= 4; i++) if (i * i + j * j * 1.6 <= 20) p.put(cx + i, HZ - bh - 3 - j, air(C('#a8b0a0'), 0.35)); }
      x += bw;
    }
    return;
  }
  if (look.k === 'brick') {
    // fileira de sobrados de tijolo com chaminés; torres de igreja; prédios mais altos ao fundo depois de 1960
    if (y >= 1960) for (let x = 0; x < G.mw;) { const bw = 7 + Math.floor(noise(x, 9, seed) * 9), bh = 16 + Math.floor(noise(x, 11, seed) * (y < 1990 ? 18 : 30)); if (noise(x, 4, seed) < 0.45) bld(x, bw, bh, C('#8a8c94'), { k: 0.55 }); x += bw + 6; }
    for (let x = 0; x < G.mw;) {
      const bw = 8 + Math.floor(noise(x, 9, seed) * 8), bh = 9 + Math.floor(noise(x, 11, seed) * 7);
      bld(x, bw, bh, W[Math.floor(noise(x, 2, seed) * W.length)], { pitch: true, chim: true, k: 0.32 });
      if (noise(x, 6, seed) < 0.12) { p.rect(x + 2, HZ - bh - 22, 3, 22, air(C('#6a6a72'), 0.4)); p.poly([[x + 1, HZ - bh - 22], [x + 6, HZ - bh - 22], [x + 3.5, HZ - bh - 32]], air(C('#4a4a56'), 0.4)); }
      x += bw;
    }
    return;
  }
  if (look.k === 'towers') {
    // muitas torres altas (com antenas), mais altas a cada década
    const maxH = y < 1915 ? 22 : y < 1931 ? 44 : y < 1960 ? 56 : y < 1990 ? 64 : 70;
    for (let x = -2; x < G.mw;) { const bw = 5 + Math.floor(noise(x, 19, seed) * 6), bh = 8 + Math.floor(noise(x, 21, seed) * maxH * 0.6); bld(x, bw, bh, C('#7a8496'), { k: 0.6 }); x += bw; }
    for (let x = 0; x < G.mw;) {
      const bw = 6 + Math.floor(noise(x, 9, seed) * 9), bh = 10 + Math.floor(noise(x, 11, seed) * maxH);
      const base = y >= 1960 && noise(x, 3, seed) < 0.45 ? C('#6a8aa8') : W[Math.floor(noise(x, 2, seed) * W.length)];
      bld(x, bw, bh, base, { ant: bh > 40 && y >= 1930, k: 0.36 });
      if (y >= 1930 && y < 1960 && bh > 34) { p.rect(x + 2, HZ - bh - 5, bw - 4, 5, air(base, 0.36)); p.rect(x + 3, HZ - bh - 10, bw - 6, 5, air(base, 0.36)); }
      x += bw + (noise(x, 7, seed) < 0.25 ? 2 : 0);
    }
    return;
  }
  const maxH = y < 1900 ? 12 : y < 1930 ? 20 : y < 1960 ? 30 : y < 1990 ? 40 : y < 2020 ? 52 : 58;
  for (let x = 0; x < G.mw;) {
    const bw = 5 + Math.floor(noise(x, 9, seed) * 10), bh = 4 + Math.floor(noise(x, 11, seed) * maxH);
    bld(x, bw, bh, W[Math.floor(noise(x, 2, seed) * W.length)], { chim: y < 1940 && noise(x, 5, seed) < 0.3 });
    if (y < 1930 && noise(x, 5, seed) < 0.15) for (let j = 0; j < 10; j++) p.put(x + 2, HZ - bh - j, air(W[0]));
    x += bw + (noise(x, 7, seed) < 0.3 ? 3 : 0);
  }
}

// ---------------------------------------------------------------- cena

export interface Mark19 { id: string; box: [number, number, number, number] }
export interface Scene18 { hl?: number; sel?: string; pins?: boolean; ground: HTMLCanvasElement; lights: HTMLCanvasElement; sprites: Sprite18[]; env: Env18; amb: { k: Amb18 | string; at: string }[]; seed: number; lamps: [number, number][]; marks: Mark19[];
  /** r27 */ look?: CityLook27; era?: Era27; life?: Life27; walks?: { pts: [number, number][]; len: number; k: 'artist' | 'staff'; off: number }[]; sale?: Sale27[]; selLot?: number; signs?: SaleSign27[];
  /** r27 (LOTS): grade e tamanho do canvas desta cena (crescem com os bairros abertos) */ geo: Geo18 }

/** Caminho (células de meia quadra) da porta do prédio até a rua/calçada; desvia de outros prédios. */
export function path19(sp: Sprite18, all: Sprite18[]): [number, number][] {
  const [gx, gy, w, d] = sp.fp;
  if (!w || !d) return [];
  const N = 2, W = G.gw * N, Hh = G.gh * N;
  const blocked = (cx: number, cy: number) => { const x = (cx + 0.5) / N, y = (cy + 0.5) / N; return all.some((o) => x > o.fp[0] - 0.05 && x < o.fp[0] + o.fp[2] + 0.05 && y > o.fp[1] - 0.05 && y < o.fp[1] + o.fp[3] + 0.05); };
  const goal = (cx: number, cy: number) => { const x = (cx + 0.5) / N, y = (cy + 0.5) / N; return ROAD(x, y) || WALK(x, y); };
  const sx = Math.floor((gx + w / 2) * N), sy = Math.floor((gy + d) * N);
  if (sx < 0 || sy >= Hh || blocked(sx, sy)) return [];
  const prev = new Map<number, number>(), key = (x: number, y: number) => y * W + x, q: [number, number][] = [[sx, sy]];
  prev.set(key(sx, sy), -1);
  // ordem preferida: para frente (+gy), depois para os lados
  const DIRS: [number, number][] = [[0, 1], [1, 0], [-1, 0], [0, -1]];
  while (q.length) {
    const [x, y] = q.shift()!;
    if (goal(x, y)) { const out: [number, number][] = []; let k = key(x, y); k = prev.get(k)!; while (k >= 0) { out.push([(k % W) / N, Math.floor(k / W) / N]); k = prev.get(k)!; } return out; }
    for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= Hh || prev.has(key(nx, ny)) || blocked(nx, ny)) continue; prev.set(key(nx, ny), key(x, y)); q.push([nx, ny]); }
  }
  return [];
}

export interface Nbr19 { lot: number; k: string; name: string }
const NBK: Record<string, BKind> = { rival: 'branch', records: 'store', bar: 'venue', rehearsal: 'rehearsal', radio: 'media' };
/** r27: extras da cena (estado dos prédios, lotes à venda, cidade comum, vida na rua). */
export interface SceneX27 { /** r27 (LOTS): bairros abertos (índice em DIST18); sem isso, o menor que cabe nos lotes desenhados */ dist?: number; /** r27: andares abertos da sede (salas/andares compráveis) e obra em andamento */ hqFloors?: { open: number; building: boolean }; vis?: Map<string, BVis27>; sale?: Sale27[]; filler?: number[]; life?: Life27; saleTxt?: string; /** r27 (CITY2): tipo de prédio de cada lote de cidade comum (lugares do bairro) */ fillKind?: Map<number, BKind> }
/** Placa À venda; `lift` = subiu acima do prédio da frente (haste até o lote) e vai por cima de tudo. */
export interface SaleSign27 { lot: number; c: HTMLCanvasElement; x: number; y: number; d: number; base: [number, number]; lift?: boolean }
/** Placa "À VENDA" (madeira + quadro branco + faixa na cor do tipo sugerido; letra cinza quando não cabe no caixa). */
function saleSign27(sl: Sale27, txt: string): SaleSign27 {
  const l0 = LOTS18[sl.lot];
  const [bx, by] = signAt27(sl.lot);
  const tw = textWidth(txt) + 4, W = tw + 2, H = 19;
  const p = new Px(W, H), t = new T(p, 0, 0), x0 = 1;
  t.line(x0 + 2, H - 1, x0 + 2, H - 10, C('#6a4a2a')); t.line(x0 + tw - 3, H - 1, x0 + tw - 3, H - 10, C('#6a4a2a'));
  t.rect(0, 0, tw + 2, 10, C('#3a2a1a'));
  t.rect(x0, 1, tw, 8, C('#fbf6ea'));
  t.text(txt, x0 + 2, 2, sl.dis ? C('#6a6470') : C('#c8302c')); // r27 (LOTS): fora do caixa = letra apagada (a placa continua lá)
  t.rect(x0, 8, tw, 1, C(ICON27[sl.kind]?.col ?? '#c8302c'));
  return { lot: sl.lot, c: p.canvas(), x: Math.round(bx - W / 2), y: Math.round(by - H + 1), d: l0.gx + l0.w / 2 + signGy27(sl.lot), base: [Math.round(bx), Math.round(by)] };
}
/** Onde fica a placa do lote: na beirada voltada para a rua (avenida ao norte dos lotes de baixo; ao sul dos de cima). */
const signGy27 = (lot: number): number => { const l0 = LOTS18[lot]; return l0.gy >= 8 ? l0.gy + 0.7 : l0.gy + l0.d - 0.6; };
export const signAt27 = (lot: number): [number, number] => { const l0 = LOTS18[lot]; return iso(l0.gx + l0.w / 2, signGy27(lot)); };
/** Sobe a placa acima do topo do prédio da frente que a cobriria (pura sobre as caixas dos sprites). */
export function liftSign27(sg: SaleSign27, sprites: { depth: number; box: [number, number, number, number]; filler?: boolean }[]): void {
  const w = sg.c.width, h = sg.c.height;
  let top = Infinity;
  for (const sp of sprites) {
    if (sp.depth <= sg.d) continue;
    const [x0, y0, x1, y1] = sp.box;
    if (x0 < sg.x + w - 2 && x1 > sg.x + 2 && y0 < sg.y + h - 2 && y1 > sg.y + 4) top = Math.min(top, y0);
  }
  if (top === Infinity) return;
  sg.y = Math.max(2, Math.round(top - h - 2));
  sg.lift = true;
}
/** r27 (LOTS): placas vizinhas (lotes estreitos lado a lado) não se cobrem — nem o preço que a página põe em cima de
 *  cada uma: a de trás desliza para o lado (ainda sobre o seu lote, até 22 px); se não der, sobe acima da outra, com haste. */
export function unstackSigns27(signs: SaleSign27[]): void {
  const done: SaleSign27[] = [];
  const board = 11, pin = 12; // quadro da placa (o resto são os pés) e a etiqueta de preço por cima
  for (const sg of [...signs].sort((a, b) => b.d - a.d || a.x - b.x)) {
    const w = sg.c.width, h = sg.c.height;
    for (let k = 0; k < 4; k++) {
      const hit = done.find((o) => o.x < sg.x + w && sg.x < o.x + o.c.width && o.y - pin < sg.y + board && sg.y - pin < o.y + board);
      if (!hit) break;
      const dir = sg.x + w / 2 >= hit.x + hit.c.width / 2 ? 1 : -1;
      const need = dir > 0 ? hit.x + hit.c.width - sg.x + 1 : sg.x + w - hit.x + 1;
      if (k === 0 && need <= 22) sg.x += dir * need;
      else { sg.y = Math.max(2, hit.y - pin - h); sg.lift = true; }
    }
    done.push(sg);
  }
}
/** Caminho de um pedestre em coordenadas da grade (porta → calçada → porta). */
type Walk27 = { pts: [number, number][]; len: number; k: 'artist' | 'staff'; off: number };
function walkPath27(a: Sprite18, b: Sprite18): [number, number][] {
  const door = (s: Sprite18): [number, number] => [s.fp[0] + s.fp[2] / 2, s.fp[1] + s.fp[3] + 0.15];
  // calçada da avenida mais perto da porta (r27 LOTS: a avenida nova serve os lotes do sul)
  const side = (gy: number) => hIn().flatMap((b) => [b - 0.2, b + 2.2]).reduce((m, v) => (Math.abs(v - gy) < Math.abs(m - gy) ? v : m), 9.2);
  const [ax, ay] = door(a), [bx, by] = door(b), wa = side(ay), wb = side(by);
  const pts: [number, number][] = [[ax, ay], [ax, wa]];
  if (wa === wb) pts.push([bx, wa]); else { pts.push([bx, wa]); pts.push([bx, wb]); }
  pts.push([bx, by]);
  return pts;
}
const plen = (pts: [number, number][]) => pts.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
function along(pts: [number, number][], d: number): [number, number] {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], L0 = Math.hypot(x1 - x0, y1 - y0);
    if (d <= L0 || i === pts.length - 1) { const k = L0 ? Math.min(1, d / L0) : 0; return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k]; }
    d -= L0;
  }
  return pts[pts.length - 1];
}

export function buildScene18(bs: Bld18[], lots: Map<string, number>, env: Env18, amb: { k: Amb18 | string; at: string }[], seed: number, brand = 'REC', nbs: Nbr19[] = [], lms: Landmark19[] = [], x: SceneX27 = {}): Scene18 {
  const used = new Set<number>(lots.values());
  // r27 (LOTS): a grade cobre os bairros abertos (retratos antigos: o menor bairro que contém os lotes desenhados)
  const top = Math.max(0, ...used, ...(x.sale ?? []).map((q) => q.lot), ...(x.filler ?? []), ...nbs.map((q) => q.lot));
  const dist = Math.max(x.dist ?? 0, DIST18.findIndex((q) => top < q.end));
  G = geoDist18(dist < 0 ? DIST18.length - 1 : dist);
  const geo = G;
  const look = cityLook27(env.city, env.lat, env.year), era = era27(env.year);
  const sprites: Sprite18[] = [];
  for (const b of bs) {
    if (b.zone !== 'campus') continue;
    const n = lots.get(b.id) ?? b.lot;
    if (n === undefined || n < 0 || !LOTS18[n]) continue;
    sprites.push(buildingSprite18(b.kind === 'hq' && x.hqFloors?.building ? { ...b, st: 'building' } : b, LOTS18[n], env.year, seed + n * 31, brand, { vis: x.vis?.get(b.id), snow: env.snow, floorsOpen: b.kind === 'hq' ? x.hqFloors?.open : undefined }));
  }
  // r19: vizinhos (não são seus) — prédios baixos, de época mais antiga, sem letreiro do selo (r27: letreiro da época)
  for (const nb of nbs) {
    if (used.has(nb.lot) || !LOTS18[nb.lot]) continue;
    const L0 = LOTS18[nb.lot];
    const sy = Math.max(1889, env.year - 15 - Math.floor(noise(nb.lot, 5, seed) * 30));
    const sp = buildingSprite18({ id: `nb:${nb.lot}`, kind: NBK[nb.k] ?? 'store', name: nb.name, city: '', zone: 'campus', lvl: nb.k === 'rival' ? 3 : 1, st: 'open', since: sy, sy }, { gx: L0.gx + L0.w * 0.15, gy: L0.gy + L0.d * 0.15, w: L0.w * 0.7, d: L0.d * 0.7 }, env.year, seed + nb.lot * 17, '',
      { snow: env.snow, sign: nb.k === 'rival' || nb.k === 'bar' || nb.k === 'radio' ? era.sign : undefined });
    sp.nb = true;
    sprites.push(sp);
    used.add(nb.lot);
  }
  // r27: lotes que não estão à venda para você = cidade comum (prédios da época e da cidade, sem ícone)
  for (const lot of x.filler ?? []) {
    const L0 = LOTS18[lot];
    if (!L0 || used.has(lot)) continue;
    const r = noise(lot, 13, seed);
    const lvl = look.k === 'towers' ? 3 + Math.floor(r * 3) : look.k === 'brick' ? 1 + Math.floor(r * 2) : 1 + Math.floor(r * 3);
    const style: Style18 = look.k === 'brick' ? (env.year < 1990 || r < 0.5 ? 'brick' : 'loft') : look.k === 'bay' && env.year >= 1930 && r < 0.6 ? 'tropical' : look.k === 'towers' ? (env.year < 1950 ? 'deco' : env.year < 1975 ? 'midcentury' : env.year < 1990 ? 'brutal' : 'glass') : styleOf18(Math.max(1889, env.year - 10 - Math.floor(r * 25)));
    const wall = C(look.wall[Math.floor(noise(lot, 2, seed) * look.wall.length) % look.wall.length]);
    const kind: BKind = x.fillKind?.get(lot) ?? (look.k === 'brick' && lvl <= 1 ? 'home' : 'office'); // r27 (CITY2): o lugar do lote (loja, rádio, casa de shows…)
    const sp = buildingSprite18({ id: `fl:${lot}`, kind, name: '', city: '', zone: 'campus', lvl, st: 'open', since: env.year, sy: env.year, style }, { gx: L0.gx + 0.35, gy: L0.gy + 0.35, w: L0.w - 0.7, d: L0.d - 0.7 }, env.year, seed + lot * 29, '',
      { filler: true, snow: env.snow, wall: style === 'glass' ? undefined : mix(wall, MAT[style].wall, 0.3), sign: x.fillKind?.has(lot) && kind !== 'home' && kind !== 'office' ? era.sign : noise(lot, 7, seed) < 0.35 ? era.sign : undefined });
    sprites.push(sp);
    used.add(lot);
  }
  sprites.sort((a, b) => a.depth - b.depth);
  const marks: Mark19[] = [];
  const gr = groundCanvas(env, seed, used, sprites, lms, marks, look, x.sale ?? []);
  // r27: placas "À venda" como sprites com profundidade (não somem atrás do prédio da frente)
  const signs: SaleSign27[] = (x.sale ?? []).filter((sl) => LOTS18[sl.lot]).map((sl) => saleSign27(sl, x.saleTxt ?? 'VENDA'));
  // r27 (I2): se um prédio da FRENTE cobre a placa, ela sobe acima do telhado dele (com haste até o lote)
  for (const sg of signs) liftSign27(sg, sprites);
  unstackSigns27(signs);
  const lights = document.createElement('canvas');
  lights.width = G.mw; lights.height = G.mh;
  const lc = lights.getContext('2d')!;
  lc.drawImage(gr.lc, 0, 0);
  for (const s of sprites) { lc.globalCompositeOperation = 'destination-out'; lc.drawImage(s.c, s.x, s.y); lc.globalCompositeOperation = 'source-over'; lc.drawImage(s.lc, s.x, s.y); }
  const lamps: [number, number][] = [];
  // postes nas duas calçadas de cada avenida e rua abertas, longe dos cruzamentos
  const hr = hIn(), vr = vIn();
  if (env.year >= 1880) for (const b of hr) for (let g = 1; g < G.gw; g += 3) { if (vr.some((a) => g >= a - 1 && g <= a + 2)) continue; lamps.push(iso(g + 0.2, b - 0.35)); lamps.push(iso(g + 0.8, b + 2.35)); }
  for (const a of vr) for (let g = 1; g < G.gh; g += 4) { if (hr.some((b) => g >= b - 1 && g <= b + 2)) continue; lamps.push(iso(a - 0.35, g + 0.3)); lamps.push(iso(a + 2.35, g + 0.7)); }
  // r27: pedestres com destino (artistas e equipe entre a sede e o estúdio etc.)
  const byId = new Map(sprites.map((s) => [s.id, s]));
  const walks: Walk27[] = [];
  (x.life?.walkers ?? []).forEach((w, i) => {
    const a = byId.get(w.from), b = byId.get(w.to);
    if (!a || !b || a === b) return;
    const pts = walkPath27(a, b);
    walks.push({ pts, len: plen(pts), k: w.k, off: noise(i, 41, seed) * 30 });
  });
  return { ground: gr.c, lights, sprites, env, amb, seed, lamps, marks, pins: true, look, era, life: x.life, walks, sale: x.sale ?? [], signs, geo };
}

// ---------------------------------------------------------------- vida (quadro a quadro)

const OUTFIT = ['#2c4a7e', '#a33434', '#2f7a4c', '#d0a43c', '#6a4590', '#e4dccb', '#2a2a30', '#d8692a', '#5e3c26', '#6ab0e0'];
type Extra27 = 'case' | 'camera' | 'mic' | 'sign' | 'heart';
function person(ctx: CanvasRenderingContext2D, x: number, y: number, k: number, year: number, frame: number, sign?: string, pal: string[] = OUTFIT, extra?: Extra27): void {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = pal[k % pal.length]; ctx.fillRect(x, y - 4, 2, 3);
  ctx.fillStyle = '#2a2628'; ctx.fillRect(x + (frame % 2), y - 1, 1, 1); ctx.fillRect(x + 1 - (frame % 2), y - 1, 1, 1);
  ctx.fillStyle = ['#f6d3b3', '#e0aa7e', '#a8714a', '#6e4528'][k % 4]; ctx.fillRect(x, y - 6, 2, 2);
  if (year < 1960 && k % 3) { ctx.fillStyle = '#2a2420'; ctx.fillRect(x - (k % 2), y - 7, 3, 1); }
  else if (year >= 1966 && year < 1980 && k % 3 === 0) { ctx.fillStyle = '#4a3020'; ctx.fillRect(x - 1, y - 7, 4, 2); } // cabelão dos anos 70
  if (sign) { ctx.fillStyle = '#7a5a34'; ctx.fillRect(x + 2, y - 9, 1, 5); ctx.fillStyle = sign; ctx.fillRect(x, y - 12, 5, 3); }
  if (extra === 'case') { ctx.fillStyle = '#2a1c14'; ctx.fillRect(x + 2, y - 5, 1, 5); ctx.fillRect(x + 2, y - 2, 2, 2); }
  if (extra === 'camera') { ctx.fillStyle = '#1a1a1e'; ctx.fillRect(x - 1, y - 6, 2, 2); }
  if (extra === 'mic') { ctx.fillStyle = '#c8c8d0'; ctx.fillRect(x + 2, y - 5, 2, 1); }
  if (extra === 'heart') { ctx.fillStyle = '#ff4a8a'; ctx.fillRect(x, y - 11, 1, 1); ctx.fillRect(x + 2, y - 11, 1, 1); ctx.fillRect(x, y - 10, 3, 1); ctx.fillRect(x + 1, y - 9, 1, 1); }
}
function vehicle(ctx: CanvasRenderingContext2D, x: number, y: number, kind: ReturnType<typeof vehicleOf18>, k: number, dir: number, flash?: boolean, t = 0, cars?: string[], night = 0): void {
  x = Math.round(x); y = Math.round(y);
  const col = (cars ?? ['#a03030', '#2c4a7e', '#e0c040', '#3a7a4a', '#e8e4d8', '#303034'])[k % (cars?.length ?? 6)];
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
  if (night > 0.3) { // r27: faróis e lanternas
    const fx = dir > 0 ? x0 + len : x0 - 1;
    ctx.fillStyle = '#fff4c0'; ctx.fillRect(fx, y - 3, 1, 1);
    ctx.fillStyle = 'rgba(255,240,180,0.35)'; ctx.fillRect(dir > 0 ? fx + 1 : fx - 5, y - 3, 5, 2);
    ctx.fillStyle = '#ff3030'; ctx.fillRect(dir > 0 ? x0 - 1 : x0 + len, y - 3, 1, 1);
  }
}
/** r27: ônibus da turnê (de época): carroceria longa com faixa; parado na porta e depois partindo. */
function tourBus(ctx: CanvasRenderingContext2D, x: number, y: number, year: number, night: number): void {
  x = Math.round(x); y = Math.round(y);
  const body = year < 1950 ? '#e8d8a8' : year < 1975 ? '#d8dce4' : year < 2000 ? '#f4f0f8' : '#24242a';
  const stripe = year < 1950 ? '#9a3a2a' : year < 1975 ? '#2a5ab0' : year < 2000 ? '#e040c0' : '#e0b040';
  ctx.fillStyle = body; ctx.fillRect(x - 16, y - 8, 16, 7);
  ctx.fillStyle = stripe; ctx.fillRect(x - 16, y - 4, 16, 1); ctx.fillRect(x - 16, y - 8, 16, 1);
  if (year >= 1975 && year < 2000) { ctx.fillStyle = '#30d0f0'; ctx.fillRect(x - 16, y - 3, 16, 1); }
  ctx.fillStyle = '#9ab8d0'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 15 + i * 3, y - 7, 2, 2);
  ctx.fillRect(x - 2, y - 7, 2, 3);
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x - 14, y - 1, 3, 1); ctx.fillRect(x - 5, y - 1, 3, 1);
  if (night > 0.3) { ctx.fillStyle = '#fff4c0'; ctx.fillRect(x, y - 3, 1, 1); ctx.fillStyle = 'rgba(255,240,180,0.35)'; ctx.fillRect(x + 1, y - 4, 7, 3); }
}
/** r27: poste da época (gás, ferro com globo, vapor de sódio com braço, LED fino). */
function lampPost(ctx: CanvasRenderingContext2D, x: number, y: number, k: Era27['lamp']): void {
  x = Math.round(x); y = Math.round(y);
  if (k === 'gas') { ctx.fillStyle = '#2a3a2a'; ctx.fillRect(x, y - 7, 1, 7); ctx.fillRect(x - 1, y - 9, 3, 2); }
  else if (k === 'iron') { ctx.fillStyle = '#1e1e22'; ctx.fillRect(x, y - 8, 1, 8); ctx.fillStyle = '#f0ecd8'; ctx.fillRect(x - 1, y - 10, 3, 2); }
  else if (k === 'sodium') { ctx.fillStyle = '#7a7c84'; ctx.fillRect(x, y - 10, 1, 10); ctx.fillRect(x, y - 10, 3, 1); ctx.fillStyle = '#c8c8c0'; ctx.fillRect(x + 2, y - 10, 2, 1); }
  else { ctx.fillStyle = '#c8ccd4'; ctx.fillRect(x, y - 11, 1, 11); ctx.fillStyle = '#eef4ff'; ctx.fillRect(x - 1, y - 11, 3, 1); }
}
const LAMPC: Record<Era27['lamp'], [string, string]> = { gas: ['#ffb060', 'rgba(255,160,80,'], iron: ['#ffe0a0', 'rgba(255,214,140,'], sodium: ['#ffb040', 'rgba(255,170,60,'], led: ['#eaf6ff', 'rgba(200,230,255,'] };
const lampHead = (x: number, y: number, k: Era27['lamp']): [number, number] => (k === 'gas' ? [x + 0.5, y - 8] : k === 'iron' ? [x + 0.5, y - 9] : k === 'sodium' ? [x + 3, y - 10] : [x + 0.5, y - 11]);

/** r27 (I2): fumaça em pixel (disco rasterizado com borda de baixo mais escura), sem círculo suavizado. */
function puff27(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: [number, number, number], a: number): void {
  x = Math.round(x); y = Math.round(y); const R = Math.max(1, Math.round(r));
  for (let dy = -R; dy <= R; dy++) {
    const half = Math.round(Math.sqrt(Math.max(0, R * R - dy * dy)));
    const k = dy > R / 3 ? 0.78 : dy < -R / 3 ? 1.04 : 1;
    ctx.fillStyle = `rgba(${Math.min(255, Math.round(rgb[0] * k))},${Math.min(255, Math.round(rgb[1] * k))},${Math.min(255, Math.round(rgb[2] * k))},${a.toFixed(2)})`;
    ctx.fillRect(x - half, y + dy, half * 2 + 1, 1);
  }
}
/** Ciclo do dia: 0 = meio-dia, 1 = meia-noite. */
export const nightOf = (t: number): number => { const ph = (t / 48) % 1; return Math.max(0, Math.min(1, (Math.cos(ph * Math.PI * 2) * -1 + 0.2) * 0.9)); };

export function drawFrame18(ctx: CanvasRenderingContext2D, sc: Scene18, t: number, night: number): void {
  const y = sc.env.year;
  const era = sc.era ?? era27(y);
  const pal = era.outfit, cars = era.cars;
  if (sc.geo) G = sc.geo; // r27 (LOTS): coordenadas desta cena
  const { gw: GW, gh: GH, mw: MW, mh: MH } = G;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, MW, MH);
  ctx.drawImage(sc.ground, 0, 0);
  if (sc.hl !== undefined && LOTS18[sc.hl]) {
    const l0 = LOTS18[sc.hl];
    ctx.strokeStyle = Math.floor(t * 3) % 2 ? '#ffe040' : '#ff8040'; ctx.lineWidth = 1;
    ctx.beginPath(); const q = [iso(l0.gx, l0.gy), iso(l0.gx + l0.w, l0.gy), iso(l0.gx + l0.w, l0.gy + l0.d), iso(l0.gx, l0.gy + l0.d)]; ctx.moveTo(q[0][0], q[0][1]); for (const z of q.slice(1)) ctx.lineTo(z[0], z[1]); ctx.closePath(); ctx.stroke();
  }
  const selS = sc.sel ? sc.sprites.find((x) => x.id === sc.sel) : undefined;
  if (selS) { const [gx, gy, w, d] = selS.fp; ctx.strokeStyle = Math.floor(t * 3) % 2 ? '#fff4a0' : '#ffd040'; ctx.lineWidth = 1; ctx.beginPath(); const q = [iso(gx - 0.3, gy - 0.3), iso(gx + w + 0.3, gy - 0.3), iso(gx + w + 0.3, gy + d + 0.3), iso(gx - 0.3, gy + d + 0.3)]; ctx.moveTo(q[0][0], q[0][1]); for (const z of q.slice(1)) ctx.lineTo(z[0], z[1]); ctx.closePath(); ctx.stroke(); }
  if (sc.selLot !== undefined && LOTS18[sc.selLot]) { const l0 = LOTS18[sc.selLot]; ctx.strokeStyle = '#ffd040'; ctx.lineWidth = 1; ctx.beginPath(); const q = [iso(l0.gx + 0.2, l0.gy + 0.2), iso(l0.gx + l0.w - 0.2, l0.gy + 0.2), iso(l0.gx + l0.w - 0.2, l0.gy + l0.d - 0.2), iso(l0.gx + 0.2, l0.gy + l0.d - 0.2)]; ctx.moveTo(q[0][0], q[0][1]); for (const z of q.slice(1)) ctx.lineTo(z[0], z[1]); ctx.closePath(); ctx.stroke(); }
  const vk = vehicleOf18(y);
  const dayLit = night < 0.5;
  // itens móveis com profundidade (gx+gy)
  const items: { d: number; f: () => void }[] = sc.sprites.map((s) => ({ d: s.depth, f: () => { ctx.drawImage(s.c, s.x, s.y); if (s.lit && dayLit) { ctx.globalAlpha = 0.75; ctx.drawImage(s.lc, s.x, s.y); ctx.globalAlpha = 1; } } }));
  for (const [x, yy] of sc.lamps) { const [gx, gy] = unIso(x, yy); items.push({ d: gx + gy, f: () => lampPost(ctx, x, yy, era.lamp) }); }
  for (const sg of sc.signs ?? []) if (!sg.lift) items.push({ d: sg.d, f: () => ctx.drawImage(sg.c, sg.x, sg.y) });
  // calçadas: as do centro primeiro (mesma ordem de sempre), depois as das avenidas e ruas novas
  const hr = hIn(), vr = vIn();
  const walksH = hr.flatMap((b) => [b - 0.2, b + 2.2]), walksV = vr.flatMap((a) => [a - 0.2, a + 2.2]);
  const paths: [boolean, number][] = [...walksH.slice(0, 2).map((v) => [true, v] as [boolean, number]), ...walksV.slice(0, 2).map((v) => [false, v] as [boolean, number]),
    ...walksH.slice(2).map((v) => [true, v] as [boolean, number]), ...walksV.slice(2).map((v) => [false, v] as [boolean, number])];
  const nP = Math.round((y < 1920 ? 8 : y < 1970 ? 12 : 16) * paths.length / 4);
  for (let i = 0; i < nP; i++) {
    const r = noise(i, 1, sc.seed), sp = 0.15 + noise(i, 2, sc.seed) * 0.25, [ph, at] = paths[i % paths.length];
    const u = ((r * 40 + t * sp * (i % 2 ? 1 : -1)) % GW + GW) % GW;
    const [gx, gy] = ph ? [u, at] : [at, (u * GH) / GW];
    if (ROAD(gx, gy)) continue;
    const [x, yy] = iso(gx, gy);
    items.push({ d: gx + gy, f: () => person(ctx, x, yy, i, y, Math.floor(t * 4 + i), undefined, pal) });
  }
  // r27: artistas e equipe indo de um prédio a outro (vai e volta)
  for (const w of sc.walks ?? []) {
    const per = w.len / 0.45, ph = ((t + w.off) % (per * 2 + 4)) / per; // ida, pausa, volta
    const dd = ph <= 1 ? ph * w.len : ph <= 1 + 2 / per ? w.len : Math.max(0, w.len - (ph - 1 - 2 / per) * w.len);
    const [gx, gy] = along(w.pts, dd);
    const [x, yy] = iso(gx, gy);
    items.push({ d: gx + gy, f: () => person(ctx, x, yy, w.k === 'artist' ? 4 + Math.floor(w.off) : 6, y, Math.floor(t * 5 + w.off), undefined, w.k === 'artist' ? pal : ['#2a2a30', '#3a4a6a'], w.k === 'artist' ? 'case' : undefined) });
  }
  // faixas: as do centro primeiro (mesma ordem de sempre), depois as das avenidas e ruas novas
  const lanes: [boolean, number, number][] = [[true, hr[0] + 0.5, 1], [true, hr[0] + 1.5, -1], [false, vr[0] + 0.5, -1], [false, vr[0] + 1.5, 1],
    ...hr.slice(1).flatMap((b) => [[true, b + 0.5, 1], [true, b + 1.5, -1]] as [boolean, number, number][]), ...vr.slice(1).flatMap((a) => [[false, a + 0.5, -1], [false, a + 1.5, 1]] as [boolean, number, number][])];
  const nV = Math.round((y < 1910 ? 2 : y < 1950 ? 3 : 5) * lanes.length / 4), fv = (0.75 * GH * 20) / (16 * GW);
  for (let i = 0; i < nV; i++) {
    const sp = 1 + noise(i, 4, sc.seed) * 1.2, [lh, at, dir] = lanes[i % lanes.length];
    const u = ((noise(i, 5, sc.seed) * 30 + t * sp) % (GW + 6)) - 3;
    const [gx, gy] = lh ? [dir > 0 ? u : GW - u, at] : [at, dir < 0 ? u * fv : GH - u * fv];
    const [x, yy] = iso(gx, gy);
    items.push({ d: gx + gy, f: () => vehicle(ctx, x, yy, vk, i, lh ? dir : -dir, undefined, t, cars, night) });
  }
  const byId = new Map(sc.sprites.map((s) => [s.id, s]));
  // r27: estado de cada prédio — fila de músicos (estúdio), fila de público (show), fumaça (fábrica prensando)
  for (const s of sc.sprites) {
    const v = s.vis;
    if (!v) continue;
    const [dx, dy] = s.door, d = s.depth + 1.5;
    if (v.queue) for (let i = 0; i < v.queue; i++) {
      const mus = v.queueK === 'musicians';
      items.push({ d, f: () => person(ctx, dx + 4 + i * 3, dy + 3 + i * 1.5, i + (mus ? 2 : 5), y, mus ? 0 : Math.floor(t * 2 + i) % 2, undefined, pal, mus ? (i % 2 ? 'case' : undefined) : undefined) });
    }
    if (v.smoke && s.chim) { const [cx, cy] = s.chim; items.push({ d: d + 8, f: () => { for (let i = 0; i < 8; i++) { const ph = (t * 0.5 + i / 8) % 1; puff27(ctx, cx + Math.sin(ph * 5 + i) * 2 + ph * 10, cy - 1 - ph * 28, 1 + ph * 4, night > 0.5 ? [150, 148, 160] : [240, 240, 244], 0.9 * (1 - ph * 0.8)); } } }); }
  }
  // r27: ônibus da turnê saindo da sede; fãs (disco na parada) e imprensa (escândalo) na porta
  const hq = byId.get('hq');
  const life = sc.life;
  if (hq && life) {
    const [dx, dy] = hq.door, [hgx, hgy, hw, hd] = hq.fp;
    if (life.bus) {
      const cyc = 16, ph = t % cyc, gx0 = Math.min(GW - 1, hgx + hw + 1.6);
      const gx = ph < 5 ? gx0 : gx0 + (ph - 5) ** 1.6 * 0.35;
      if (gx < GW + 3) { const [bx, by] = iso(gx, 7.45); items.push({ d: gx + 7.45, f: () => tourBus(ctx, bx, by, y, night) }); }
      if (ph < 5) for (let i = 0; i < 3; i++) { const k = Math.min(1, Math.max(0, (ph - i * 1.2) / 2.5)); const [px, py] = iso(hgx + hw / 2 + k * (gx0 - 1.2 - hgx - hw / 2), hgy + hd + 0.2 + k * (7.2 - hgy - hd)); items.push({ d: hgx + hgy + hd + 1, f: () => person(ctx, px, py, 3 + i, y, Math.floor(t * 6 + i), undefined, pal, 'case') }); }
    }
    for (let i = 0; i < life.fans; i++) { const ox = (i % 6) * 3 - 12, oy = Math.floor(i / 6) * 3 + 5; items.push({ d: hq.depth + 1.6, f: () => { const hop = Math.sin(t * 7 + i * 1.7) > 0.4 ? 1 : 0; person(ctx, dx + ox, dy + oy - hop, i + 3, y, 0, i % 5 === 0 ? '#ff7ab0' : undefined, pal, i % 4 === 1 ? 'heart' : undefined); } }); }
    if (life.press) {
      items.push({ d: hq.depth + 2.2, f: () => { const cx = dx + 18, cy = dy + 12; vehicle(ctx, cx + 6, cy + 4, vk === 'cart' ? 'modelT' : vk, 4, -1, undefined, t, ['#e8e8ec'], night); if (y >= 1970) { ctx.fillStyle = '#d0d4d8'; ctx.fillRect(Math.round(cx + 1), Math.round(cy - 6), 3, 2); ctx.fillRect(Math.round(cx + 2), Math.round(cy - 4), 1, 2); } } });
      for (let i = 0; i < life.press; i++) {
        const px = dx + 6 + (i % 4) * 4, py = dy + 6 + Math.floor(i / 4) * 4;
        items.push({ d: hq.depth + 1.8, f: () => { person(ctx, px, py, 6 + (i % 2), y, 0, undefined, ['#3a3a40', '#5a4a3a', '#2a3a5a'], i % 3 === 2 ? 'mic' : 'camera'); if (noise(i, Math.floor(t * 6), 3) < 0.18) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(px) - 2, Math.round(py) - 8, 3, 3); ctx.fillStyle = 'rgba(255,255,220,0.5)'; ctx.fillRect(Math.round(px) - 4, Math.round(py) - 10, 7, 7); } } });
      }
    }
  }
  // eventos em volta dos prédios
  for (const a of sc.amb) {
    const s = byId.get(a.at);
    if (!s) continue;
    const [dx, dy] = s.door;
    const d = s.depth + 1.5;
    if (a.k === 'fans') for (let i = 0; i < 14; i++) { const ox = (i % 7) * 3 - 9, oy = Math.floor(i / 7) * 3 + 4; items.push({ d, f: () => { const hop = Math.sin(t * 6 + i) > 0.5 ? 1 : 0; person(ctx, dx + ox, dy + oy - hop, i + 3, y, 0, undefined, pal); } }); }
    if (a.k === 'protest') for (let i = 0; i < 8; i++) { const ox = ((t * 3 + i * 4) % 30) - 15; items.push({ d, f: () => person(ctx, dx + ox, dy + 8 + (i % 2) * 2, i, y, Math.floor(t * 4 + i), '#f8f4ec', pal) }); }
    if (a.k === 'show') for (let i = 0; i < 9; i++) items.push({ d, f: () => person(ctx, dx - 4 - i * 3, dy + 3 + i * 1.5, i + 5, y, Math.floor(t * 2 + i) % 2, undefined, pal) });
    if (a.k === 'police') items.push({ d, f: () => vehicle(ctx, dx + 14, dy + 10, vk, 5, 1, true, t, cars, night) });
    if (a.k === 'press') items.push({ d, f: () => { vehicle(ctx, dx - 14, dy + 12, vk === 'cart' ? 'modelT' : vk, 4, -1, undefined, t, cars, night); if (y >= 1960) { ctx.fillStyle = '#d0d4d8'; ctx.fillRect(Math.round(dx - 18), Math.round(dy + 3), 3, 2); } person(ctx, dx - 6, dy + 11, 6, y, 0, undefined, pal); } });
    if (a.k === 'smoke') items.push({ d: d + 5, f: () => { for (let i = 0; i < 6; i++) { const ph = (t * 0.6 + i / 6) % 1; puff27(ctx, s.top[0] + Math.sin(ph * 6 + i) * 3, s.top[1] - ph * 26, 2 + ph * 4, [60, 58, 62], 0.7 * (1 - ph)); } if (Math.floor(t * 5) % 3) { ctx.fillStyle = '#ff7020'; ctx.fillRect(Math.round(s.top[0] - 1), Math.round(s.top[1] - 2), 3, 2); } } });
  }
  // r19: festival lotado, festa de rua, filmagem, mural, romaria de fãs, reclamação, enchente
  for (const a of sc.amb) {
    const s = byId.get(a.at);
    if (!s) continue;
    const [dx, dy] = s.door, d = s.depth + 1.5;
    if (a.k === 'crowd') { const [gx, gy, w, dd] = s.fp; for (let i = 0; i < 40; i++) { const [x, yy] = iso(gx + 0.4 + noise(i, 1, 3) * (w - 0.8), gy + 1.6 + noise(i, 2, 3) * Math.max(0.4, dd - 2)); items.push({ d: gx + gy + dd, f: () => person(ctx, x, yy - (Math.sin(t * 7 + i) > 0.3 ? 1 : 0), i + 2, y, 0, undefined, pal) }); } }
    if (a.k === 'party') items.push({ d, f: () => { for (let i = 0; i < 12; i++) { ctx.fillStyle = ['#ff4060', '#40c0ff', '#ffe040', '#60e080'][i % 4]; ctx.fillRect(Math.round(dx - 22 + i * 4), Math.round(dy + 14 - i * 2 + (i % 2)), 2, 2); } for (let i = 0; i < 8; i++) person(ctx, dx - 18 + i * 4, dy + 20 - i * 2, i + 1, y, Math.floor(t * 5 + i) % 2, undefined, pal); } });
    if (a.k === 'shoot') items.push({ d, f: () => { ctx.fillStyle = '#202024'; ctx.fillRect(Math.round(dx + 10), Math.round(dy + 4), 4, 3); ctx.fillRect(Math.round(dx + 11), Math.round(dy + 7), 1, 4); ctx.fillStyle = Math.floor(t * 2) % 2 ? '#fff8d0' : '#f0e0a0'; ctx.fillRect(Math.round(dx + 18), Math.round(dy - 2), 3, 3); ctx.fillRect(Math.round(dx + 19), Math.round(dy + 1), 1, 8); person(ctx, dx + 7, dy + 11, 6, y, 0, undefined, pal); person(ctx, dx + 15, dy + 12, 1, y, 0, undefined, pal); } });
    if (a.k === 'mural') items.push({ d: d + 2, f: () => { const [gx, gy, w, dd] = s.fp; const [ax, ay] = iso(gx + w, gy + dd); for (let i = 0; i < 9; i++) for (let j = 0; j < 7; j++) { ctx.fillStyle = ['#e04848', '#f0c040', '#48b85c', '#4a8ae0', '#8a5ad0'][(i + j * 2) % 5]; ctx.fillRect(Math.round(ax + 2 + i), Math.round(ay - 12 - i / 2 + j), 1, 1); } } });
    if (a.k === 'pilgrim') for (let i = 0; i < 18; i++) items.push({ d, f: () => person(ctx, dx - 20 + (i % 9) * 3, dy + 6 + Math.floor(i / 9) * 4 + (i % 9) * 1.5, i + 4, y, Math.floor(t * 3 + i) % 2, i % 5 === 0 ? '#ffe0f0' : undefined, pal) });
    if (a.k === 'noise') items.push({ d: d + 3, f: () => { ctx.fillStyle = '#f8f4ec'; const ph = (t * 1.5) % 1; ctx.font = '6px monospace'; ctx.fillText('♪', Math.round(s.top[0] + 4), Math.round(s.top[1] - 4 - ph * 10)); person(ctx, dx + 16, dy + 8, 7, y, 0, '#f04040', pal); } });
    if (a.k === 'flood') items.push({ d: d + 1, f: () => { ctx.fillStyle = `rgba(70,120,170,${0.55 + Math.sin(t * 2) * 0.08})`; const [gx, gy, w, dd] = s.fp; ctx.beginPath(); const q = [iso(gx - 1.2, gy + dd - 0.2), iso(gx + w + 0.4, gy + dd - 0.2), iso(gx + w + 0.4, gy + dd + 1.8), iso(gx - 1.2, gy + dd + 1.8)]; ctx.moveTo(q[0][0], q[0][1]); for (const z of q.slice(1)) ctx.lineTo(z[0], z[1]); ctx.fill(); } });
  }
  items.sort((a, b) => a.d - b.d);
  for (const it of items) it.f();
  for (const sg of sc.signs ?? []) if (sg.lift) { // placa erguida: haste fina até o lote, por cima de tudo
    const hx = sg.base[0], top = sg.y + sg.c.height - 1;
    ctx.fillStyle = '#6a4a2a'; ctx.fillRect(hx, top, 1, Math.max(0, sg.base[1] - top));
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(hx - 1, sg.base[1] - 1, 3, 1);
    ctx.drawImage(sg.c, sg.x, sg.y);
  }
  // clima (r27: flocos maiores e brancos; chuva em riscos finos)
  if (sc.env.snow || sc.env.rain) {
    for (let i = 0; i < (sc.env.snow ? 90 : 80); i++) {
      const x = (noise(i, 1, 9) * MW + (sc.env.snow ? Math.sin(t + i) * 3 : -t * 20)) % MW, yy = (noise(i, 2, 9) * MH + t * (sc.env.snow ? 10 + (i % 3) * 3 : 90)) % MH;
      if (sc.env.snow) { ctx.fillStyle = i % 4 ? '#ffffff' : '#dce8f8'; ctx.fillRect(Math.round((x + MW) % MW), Math.round(yy), i % 5 ? 1 : 2, i % 5 ? 1 : 2); }
      else { ctx.fillStyle = 'rgba(190,215,240,0.7)'; ctx.fillRect(Math.round((x + MW) % MW), Math.round(yy), 1, 3); }
    }
  }
  // r27: tom da estação só em dia sem neve (nada de véu cinza): outono âmbar, verão quente, chuva levemente azul
  const tint = sc.env.rain ? 'rgba(90,110,150,0.08)' : sc.env.snow ? '' : sc.env.season === 'autumn' && sc.env.climate !== 'tropical' ? 'rgba(255,170,80,0.06)' : sc.env.season === 'summer' || sc.env.climate === 'tropical' ? 'rgba(255,230,150,0.04)' : '';
  if (tint && night < 0.5) { ctx.fillStyle = tint; ctx.fillRect(0, 0, MW, MH); }
  // noite (r27: bem mais escura, janelas e neon brilhando, halo dos postes)
  if (night > 0.02) {
    ctx.fillStyle = `rgba(8,12,40,${(night * 0.74).toFixed(3)})`;
    ctx.fillRect(0, 0, MW, MH);
    ctx.globalAlpha = Math.min(1, night * 1.3);
    ctx.drawImage(sc.lights, 0, 0);
    const [lampC, lampA] = LAMPC[era.lamp];
    ctx.globalCompositeOperation = 'lighter';
    if ('filter' in ctx) { ctx.filter = 'blur(1.5px)'; ctx.globalAlpha = Math.min(0.6, night * 0.7); ctx.drawImage(sc.lights, 0, 0); ctx.filter = 'none'; }
    ctx.globalAlpha = Math.min(1, night * 1.2);
    for (const [x, yy] of sc.lamps) {
      const [hx, hy] = lampHead(x, yy, era.lamp);
      const g = ctx.createRadialGradient(hx, hy + 3, 0, hx, hy + 3, 6);
      g.addColorStop(0, `${lampA}0.32)`); g.addColorStop(1, `${lampA}0)`);
      ctx.fillStyle = g; ctx.fillRect(hx - 6, hy - 3, 12, 12);
      ctx.fillStyle = lampC; ctx.fillRect(Math.round(hx) - 1, Math.round(hy), 2, 1);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  if (sc.pins) for (const sp of sc.sprites) if (!sp.filler) pin19(ctx, sp, t);
}

// r19: plaquinha com ícone sobre cada prédio (leitura rápida, também à noite)
const GLYPH: Partial<Record<BKind, string>> = {
  hq: '0010001110111111010111111', studio: '0111001110011100010000100', venue: '1111110101101011010111111', fest: '0010001110111110010000100', publisher: '0011100101001010110111100',
  plant: '0111011011110111101101110', media: '1000101010001000010000100', platform: '0100001100011100110001000', booking: '1111010010111100101001111', school: '1111110001111111000111111',
  museum: '0111011111010101010111111', rehearsal: '0111010001111111000101110', imprint: '1000011110111101000010000', sublabel: '0111011011110111101101110', home: '0010001110111110101001110',
  store: '1111101010111110101011111', sign: '0010001110111110111001010', dorm: '0000010000111111111110001', park: '0111011111111110010000100', branch: '1111110101111111010111111', office: '0111010101111111010101110',
};
const PINC: Partial<Record<BKind, string>> = { hq: '#c08a2a', studio: '#c83838', venue: '#a02858', fest: '#d07018', publisher: '#6a48b8', plant: '#5a6470', media: '#c89a18', platform: '#209aa0', booking: '#2a70c0', school: '#2060a0', museum: '#8a7a5a', rehearsal: '#c06028', imprint: '#3a8a50', sublabel: '#b04888', home: '#4a7a3a', store: '#d04848', sign: '#d0a020', dorm: '#7a5ab0', park: '#3a9a48' };
function pin19(ctx: CanvasRenderingContext2D, sp: Sprite18, t: number): void {
  const g = GLYPH[sp.kind] ?? GLYPH.office!;
  const x = Math.round(sp.top[0]) - 4, y = Math.round(Math.min(sp.top[1], sp.box[1] + 6)) - 14 - (sp.st === 'building' || sp.st === 'planned' ? Math.round(Math.sin(t * 3)) : 0);
  const col = sp.nb ? '#7a7870' : sp.st === 'damaged' ? '#d03020' : sp.st === 'building' || sp.st === 'planned' || sp.st === 'renovating' ? '#e0b020' : sp.st === 'sold' || sp.st === 'closed' ? '#606060' : PINC[sp.kind] ?? '#406090';
  ctx.fillStyle = '#1a1416'; ctx.fillRect(x - 1, y - 1, 11, 11); ctx.fillRect(x + 3, y + 10, 3, 1); ctx.fillRect(x + 4, y + 11, 1, 1);
  ctx.fillStyle = col; ctx.fillRect(x, y, 9, 9);
  ctx.fillStyle = sp.nb ? '#d8d4c8' : '#fffaf0';
  for (let i = 0; i < 25; i++) if (g[i] === '1') ctx.fillRect(x + 2 + (i % 5), y + 2 + Math.floor(i / 5), 1, 1);
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
