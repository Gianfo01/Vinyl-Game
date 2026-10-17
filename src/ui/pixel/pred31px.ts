// R31 · onda 4 (PRED) — DESENHO PRÓPRIO DE CADA TIPO DE PRÉDIO do mapa isométrico (chamado por buildingSprite18 em
// campus18px, depois da caixa e antes do contorno de 1 px). Mesmo pixel, mesma luz (do alto à esquerda: fachada da
// esquerda clara, da direita −22%), mesmas cores chapadas; cada tipo ganha silhueta (SHAPE31: largura/altura) e
// detalhes legíveis de longe (vitrine com capas de LP e toldo, disco de ouro e porta de vidro, luz vermelha e
// isolamento, torre, parabólica e caminhão de externa, marquise com lâmpadas, mesas na calçada…), variando por época
// (pintado → esmalte → neon → neon 80 → caixa luminosa → LED; carroça → carro da época). Sem texto solto: só as
// letras de letreiro de verdade (HOTEL, CINE, REC). Inventário em docs/r31/pred.md.

import { C, mix, noise, shade, withAlpha, type Col } from './px';
import type { Style18 } from '../../sim/sys/campus18';
import { eraIx31, type Art31 } from './pred31';

/** O que o desenho precisa da camada transladada de campus18px (a classe T cumpre). */
export interface Pen31 {
  set(x: number, y: number, c: Col): void; rect(x: number, y: number, w: number, h: number, c: Col): void; line(a: number, b: number, c2: number, d: number, c: Col): void;
  disc(x: number, y: number, r: number, c: Col): void; poly(pts: [number, number][], c: Col | ((x: number, y: number) => Col)): void; text(s: string, x: number, y: number, c: Col): void;
}
export interface Bx31 {
  t: Pen31; L: Pen31; iso: (gx: number, gy: number) => [number, number];
  gx: number; gy: number; w: number; d: number; H: number; year: number; seed: number; st: Style18;
  wall: Col; trim: Col; roof: Col; brand?: Col; marquee?: boolean;
}

// ---------------------------------------------------------------- silhueta por tipo

export interface Shape31 { w: number; d: number; H: number; /** fachada lisa (o desenho põe as aberturas) */ noWin?: boolean; /** parede própria (mistura) */ tint?: [Col, number]; /** telhado próprio (mistura 60%) */ roof?: Col; worn?: boolean; /** altura extra acima do telhado (caixa clicável) */ top?: number; /** sem os enfeites de telhado do estilo */ roofOwn?: boolean; /** sem o letreiro genérico da época */ ownSign?: boolean }
const cl = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export function shape31(art: Art31, f: { w: number; d: number; H: number }, lw: number, ld: number): Shape31 {
  const s: Shape31 = { ...f, ownSign: true };
  const W = (m: number) => { s.w = Math.min(lw - 0.6, m); }, D = (m: number) => { s.d = Math.min(ld - 0.6, m); };
  switch (art) {
    case 'studio': s.H = cl(f.H * 0.75, 10, 18); s.noWin = true; s.tint = [C('#3a3640'), 0.55]; s.roofOwn = true; break;
    case 'hotel': W(2.4); D(2.2); s.H = cl(Math.max(f.H, 34), 34, 46); s.tint = [C('#efe2c4'), 0.35]; break;
    case 'apart': W(2.6); s.H = cl(f.H, 16, 34); s.ownSign = false; break;
    case 'house': W(2); D(1.8); s.H = 7; s.ownSign = false; break;
    case 'mansion': W(3.4); D(2.4); s.H = 10; s.ownSign = false; s.tint = [C('#f4ecdc'), 0.45]; break;
    case 'arena': s.w = lw - 0.4; s.d = ld - 0.4; s.H = 12; s.roofOwn = true; s.top = 20; s.tint = [C('#c8ccd0'), 0.4]; break;
    case 'theatre': W(3.2); D(2.6); s.H = cl(f.H, 16, 22); s.tint = [C('#e8dcc0'), 0.45]; s.roofOwn = true; s.top = 10; break;
    case 'museum': s.H = cl(f.H, 14, 20); s.roofOwn = true; s.top = 12; break;
    case 'cinema': W(2.8); s.H = cl(f.H, 15, 19); s.top = 6; break;
    case 'tv': s.H = cl(Math.max(f.H, 16), 16, 26); s.roofOwn = true; s.top = 34; break;
    case 'radio': s.H = cl(f.H, 10, 20); s.roofOwn = true; s.top = 26; break;
    case 'label': s.H = cl(Math.max(f.H, 18), 18, 40); break;
    case 'sublabel': s.H = cl(f.H, 12, 20); break;
    case 'imprint': W(2.2); s.H = cl(f.H, 10, 14); break;
    case 'police': s.H = cl(f.H, 12, 16); s.tint = [C('#7a8aa0'), 0.35]; s.top = 12; break;
    case 'press': W(3); s.H = cl(f.H, 13, 18); break;
    case 'alley': W(1.9); s.H = cl(f.H, 12, 16); s.tint = [C('#3a3432'), 0.45]; s.worn = true; break;
    case 'facade': s.H = cl(f.H, 10, 13); s.tint = [C('#4a2a2a'), 0.3]; break;
    case 'bar': case 'jukebox': s.H = cl(f.H, 8, 10); break;
    case 'diner': W(3); D(1.7); s.H = 7; s.tint = [C('#e8e4dc'), 0.4]; break;
    case 'cdmega': W(3.4); D(2.6); s.H = 11; s.roofOwn = true; s.top = 16; break;
    case 'pager': W(1.7); D(1.5); s.H = 8; s.roofOwn = true; s.top = 14; break;
    case 'phones': s.H = cl(f.H, 10, 13); s.tint = [C('#f4f4f2'), 0.7]; break;
    case 'platform': s.H = cl(f.H, 12, 20); s.noWin = true; s.tint = [C('#30343e'), 0.6]; s.roofOwn = true; break;
    case 'telegraph': W(2.2); s.H = cl(f.H, 10, 13); s.top = 10; break;
    case 'holo': s.H = cl(f.H, 10, 13); s.tint = [C('#dfe6ee'), 0.5]; s.top = 16; break;
    case 'store': case 'records': case 'instruments': case 'sheet': case 'piano': case 'gramophone': case 'tailor': case 'radiotv': case 'hifi': case 'arcade':
    case 'video': case 'lan': case 'games': case 'vinyl': case 'cafe': case 'bakery': s.H = cl(f.H, 10, 14); break;
    case 'furniture': W(3.2); D(2.4); s.H = cl(Math.max(f.H, 14), 14, 22); break;
    case 'antique': W(2); s.H = cl(f.H, 11, 14); s.worn = true; break;
    case 'gallery': W(2.6); s.H = cl(f.H, 12, 16); s.noWin = true; break;
    case 'office': case 'dorm': case 'plant': case 'booking': case 'rehearsal': case 'school': case 'publisher': s.ownSign = false; break;
    default: break;
  }
  const pc = PAL31[art];
  if (pc) { if (!s.tint) s.tint = [C(pc[0]), pc[1]]; if (pc[2]) s.roof = C(pc[2]); }
  return s;
}

/** Cor de parede (mistura) e de telhado de cada tipo: de longe a cor já separa uma loja da outra. */
const PAL31: Partial<Record<Art31, [string, number, string?]>> = {
  records: ['#a83a3a', 0.4, '#6a2a2a'], instruments: ['#3a6a4a', 0.4, '#2a4a34'], store: ['#c09030', 0.35, '#8a6a20'], bar: ['#4a6a3a', 0.35, '#5a3a24'],
  sheet: ['#3a4a7a', 0.4, '#2a3050'], piano: ['#3a3438', 0.45, '#202024'], gramophone: ['#6a2a3a', 0.4, '#4a2028'], tailor: ['#5a6a7a', 0.4, '#3a4450'],
  radiotv: ['#3a7a7a', 0.4, '#2a5050'], jukebox: ['#e080a8', 0.4, '#a04070'], hifi: ['#3a3a44', 0.45, '#26262c'], arcade: ['#2a2436', 0.5, '#5a2a8a'],
  video: ['#2a4aa0', 0.4, '#f0c020'], cdmega: ['#e8e4dc', 0.4, '#c83030'], pager: ['#8ab040', 0.4, '#5a7a2a'], lan: ['#2a2436', 0.45, '#2a4a8a'],
  games: ['#6a3aa0', 0.4, '#3a2060'], vinyl: ['#7a3a2a', 0.4, '#2a2a2e'], cafe: ['#a87848', 0.4, '#5a3a24'], bakery: ['#e8c870', 0.45, '#a86a30'],
  furniture: ['#b88a5a', 0.4, '#6a4a2a'], antique: ['#5a4030', 0.45, '#3a2a20'], gallery: ['#f2f0ea', 0.7, '#9aa0a8'],
  telegraph: ['#8a7a5a', 0.35, '#4a4038'], diner: ['#e8e4dc', 0.4, '#c83030'], phones: ['#f4f4f2', 0.7, '#e8ecf0'], holo: ['#dfe6ee', 0.5, '#80d0e0'],
  label: ['#3a5a90', 0.15, '#2a3a5a'], sublabel: ['#b04888', 0.15, '#6a2a5a'], imprint: ['#3a8a50', 0.2, '#2a5a3a'], hotel: ['#efe2c4', 0.35, '#8a2a2a'],
  press: ['#5a5a60', 0.3, '#3a3a40'], police: ['#7a8aa0', 0.35, '#2a3a5a'], facade: ['#4a2a2a', 0.3, '#2a1a1a'], tv: ['#c8ccd0', 0.3, '#5a6a80'],
  radio: ['#e8d8b0', 0.3, '#b03030'], cinema: ['#e0c8a0', 0.3, '#8a1a1a'], venue: ['#8a2a3a', 0.2, '#5a1a2a'], apart: ['#d8c8b0', 0.25],
  office: ['#8a9aaa', 0.2], booking: ['#2a70c0', 0.2, '#2a4a7a'], rehearsal: ['#c06028', 0.25, '#6a3a20'], publisher: ['#6a48b8', 0.2, '#4a3a6a'],
};

// ---------------------------------------------------------------- geometria das fachadas

const INK = C('#170e12'), DARK = C('#1c1a20'), CREAM = C('#f4ecd8'), WHITE = C('#f8f6f0'), GOLD = C('#e0b030'), GOLD2 = C('#a87818'), RED = C('#c83030');
const GLASS = C('#2a3a4a'), REFL = C('#a8c8d8'), WOOD = C('#7a5232'), WOOD2 = C('#4e3420'), STEEL = C('#9aa0a8'), STEEL2 = C('#5a6068'), SKIN = C('#e0b088');
const LITW = C('#ffd77a'), LITC = C('#e8eedc');
const COVERS = ['#d04040', '#f0c040', '#3a8ad0', '#40a060', '#e07020', '#8a4ac0', '#f0f0f0', '#e060a0'].map((x) => C(x));
interface G31 extends Bx31 { Wx: number; Wy: number; Sx: number; Sy: number; Ex: number; Ey: number; Nx: number; Ny: number; lenL: number; lenR: number; era: number; cx: number; cy: number }
const geo = (b: Bx31): G31 => {
  const [Wx, Wy] = b.iso(b.gx, b.gy + b.d), [Sx, Sy] = b.iso(b.gx + b.w, b.gy + b.d), [Ex, Ey] = b.iso(b.gx + b.w, b.gy), [Nx, Ny] = b.iso(b.gx, b.gy);
  const [cx, cy0] = b.iso(b.gx + b.w / 2, b.gy + b.d / 2);
  return { ...b, Wx, Wy, Sx, Sy, Ex, Ey, Nx, Ny, lenL: Sx - Wx, lenR: Ex - Sx, era: eraIx31(b.year), cx, cy: cy0 - b.H };
};
/** Ponto da fachada esquerda (W→S): u px ao longo, z px de altura. */
const lp = (g: G31, u: number, z: number): [number, number] => [g.Wx + u, g.Wy + u / 2 - z];
const rp = (g: G31, u: number, z: number): [number, number] => [g.Sx + u, g.Sy - u / 2 - z];
type CF = Col | ((u: number, z: number) => Col);
/** Pinta um retângulo da fachada esquerda (colunas inteiras de tela). */
function fL(g: G31, u0: number, u1: number, z0: number, z1: number, c: CF, P: Pen31 = g.t): void {
  for (let x = Math.ceil(g.Wx + u0); x < g.Wx + u1; x++) {
    const u = x - g.Wx, yb = Math.floor(g.Wy + u / 2) - 1;
    for (let z = Math.round(z0); z < Math.round(z1); z++) { const k = typeof c === 'number' ? c : c(Math.floor(u - u0), z - Math.round(z0)); if (k) P.set(x, yb - z, k); }
  }
}
/** Idem na fachada direita (S→E), já com a sombra da face. */
function fR(g: G31, u0: number, u1: number, z0: number, z1: number, c: CF, P: Pen31 = g.t, sh = true): void {
  for (let x = Math.ceil(g.Sx + u0); x < g.Sx + u1; x++) {
    const u = x - g.Sx, yb = Math.floor(g.Sy - u / 2) - 1;
    for (let z = Math.round(z0); z < Math.round(z1); z++) { const k = typeof c === 'number' ? c : c(Math.floor(u - u0), z - Math.round(z0)); if (k) P.set(x, yb - z, sh && P === g.t ? shade(k, -0.22) : k); }
  }
}
/** Chão na frente da fachada esquerda: fração a de W→S, k px para fora (na direção da rua). */
const gnd = (g: G31, a: number, k: number): [number, number] => [Math.round(g.Wx + a * g.lenL - k * 1.6), Math.round(g.Wy + (a * g.lenL) / 2 + k * 0.8)];
const mid = (g: G31) => g.lenL / 2;

/** Porta no meio da fachada esquerda (redesenhada por cima da vitrine). */
function door(g: G31, c: Col, wd = 3, hh = 5, glass = false): void {
  const m = mid(g);
  fL(g, m - wd / 2 - 1, m + wd / 2 + 1, 0, hh + 1, shade(g.trim, -0.1));
  fL(g, m - wd / 2, m + wd / 2, 0, hh, glass ? (u, z) => (z > hh - 3 && u === 0 ? REFL : C('#5a7a94')) : c);
}
/** Vitrine com reflexo (uma diagonal clara) e moldura. */
function shopWin(g: G31, u0: number, u1: number, z0: number, z1: number, back: Col = GLASS): void {
  fL(g, u0 - 1, u1 + 1, z0 - 1, z1 + 1, shade(g.trim, -0.15));
  fL(g, u0, u1, z0, z1, (u, z) => ((u + z) % 9 === 0 ? mix(back, REFL, 0.5) : back));
}
/** Toldo que sai da parede na direção da rua; listrado ou liso, com a barra caída. */
function awning(g: G31, u0: number, u1: number, z: number, a: Col, b?: Col): void {
  const [x0, y0] = lp(g, u0, z + 3), [x1, y1] = lp(g, u1, z + 3), [x2, y2] = lp(g, u1, z), [x3, y3] = lp(g, u0, z);
  g.t.poly([[x0, y0], [x1, y1], [x2 - 3, y2 + 1.5], [x3 - 3, y3 + 1.5]], (x) => (b && Math.floor(x / 2) % 2 ? b : a));
  g.t.line(Math.round(x3 - 3), Math.round(y3 + 2), Math.round(x2 - 3), Math.round(y2 + 2), shade(a, -0.3));
}
/** Placa plana de frente (letreiro, braço da parede). */
function plate(g: G31, x: number, y: number, w: number, h: number, bg: Col, edge: Col): void {
  g.t.rect(Math.round(x) - 1, Math.round(y) - 1, w + 2, h + 2, edge); g.t.rect(Math.round(x), Math.round(y), w, h, bg);
}
/** Letreiro da época: pintado (0) → esmalte com lâmpadas (1) → neon (2, 3) → caixa luminosa (4) → LED (5).
 *  "Letras" em traços (o nome de verdade fica na etiqueta do mapa). */
function eraBoard(g: G31, x: number, y: number, w: number, c: Col): void {
  x = Math.round(x); y = Math.round(y);
  const e = g.era, h = 5;
  if (e === 0) { plate(g, x, y, w, h, C('#2e4a3a'), GOLD2); for (let i = 1; i < w - 1; i += 2) g.t.set(x + i, y + 2, CREAM); return; }
  if (e === 1) { plate(g, x, y, w, h, CREAM, c); for (let i = 1; i < w - 1; i += 2) g.t.set(x + i, y + 2, c); for (let i = 0; i < w; i += 2) { g.L.set(x + i, y - 1, LITW); g.L.set(x + i, y + h, LITW); } return; }
  if (e === 2 || e === 3) { const c2 = e === 3 ? C('#3ae0ff') : C('#ff5040'); plate(g, x, y, w, h, C('#2a1a2a'), C('#5a5a60')); for (let i = 1; i < w - 1; i++) { const yy = y + 1 + ((i % 3) === 1 ? 0 : 2); g.t.set(x + i, yy, i % 4 ? c : c2); g.L.set(x + i, yy, i % 4 ? c : c2); } return; }
  if (e === 4) { plate(g, x, y, w, h, mix(c, WHITE, 0.55), STEEL2); for (let i = 1; i < w - 1; i++) { g.t.set(x + i, y + 2, c); } g.L.rect(x, y, w, h, withAlpha(mix(c, WHITE, 0.6), 200)); return; }
  plate(g, x, y, w, h, C('#14161c'), STEEL2); for (let i = 1; i < w - 1; i++) { const k = i % 3 === 0 ? C('#ffffff') : c; g.t.set(x + i, y + 2, k); g.L.set(x + i, y + 2, k); }
}
/** Braço de parede com um emblema quadrado de 7×7 (desenhado por `f`, origem no canto). */
function blade(g: G31, u: number, z: number, f: (x: number, y: number) => void, bg: Col = CREAM, edge: Col = INK): void {
  const [x, y] = lp(g, u + 3, z);
  plate(g, x - 3, y - 6, 7, 7, bg, edge);
  f(Math.round(x) - 3, Math.round(y) - 6);
}
/** Letras empilhadas num letreiro vertical (HOTEL, CINE) com moldura de lâmpadas a partir de 1920. */
function vText(g: G31, x: number, y: number, s: string, bg: Col, fg: Col): void {
  x = Math.round(x); y = Math.round(y);
  const hh = s.length * 6 + 1;
  g.t.rect(x - 1, y - 1, 7, hh + 2, INK); g.t.rect(x, y, 5, hh, bg);
  [...s].forEach((ch, i) => g.t.text(ch, x + 1, y + 1 + i * 6, fg));
  if (g.era >= 1) { [...s].forEach((ch, i) => g.L.text(ch, x + 1, y + 1 + i * 6, fg)); for (let j = 0; j < hh; j += 3) { g.L.set(x - 1, y + j, LITW); g.L.set(x + 5, y + j, LITW); } }
}
/** Pessoa mínima de pé (2×6), com chapéu antes de 1960. */
function person(g: G31, x: number, y: number, body: Col): void {
  g.t.rect(x, y - 2, 2, 2, DARK); g.t.rect(x, y - 5, 2, 3, body); g.t.set(x, y - 6, SKIN); g.t.set(x + 1, y - 6, SKIN);
  if (g.year < 1960) g.t.rect(x - 1, y - 7, 4, 1, DARK);
}
/** Veículo parado, de frente para a rua (carroça antes de 1915; depois o carro/furgão da época). */
function vehicle(g: G31, x: number, y: number, col: Col, k: 'car' | 'van' | 'bus' | 'police' | 'ob'): void {
  x = Math.round(x); y = Math.round(y);
  if (g.year < 1915) { // carroça com cavalo
    g.t.rect(x - 3, y - 5, 7, 3, WOOD); g.t.rect(x - 3, y - 6, 7, 1, shade(WOOD, 0.2)); g.t.disc(x + 2, y - 1.5, 1.6, WOOD2); g.t.disc(x - 2, y - 1.5, 1.6, WOOD2);
    g.t.rect(x - 9, y - 5, 4, 2, C('#6a4a2a')); g.t.rect(x - 10, y - 7, 2, 2, C('#6a4a2a')); g.t.line(x - 8, y - 3, x - 8, y - 1, C('#4a3220')); g.t.line(x - 6, y - 3, x - 6, y - 1, C('#4a3220'));
    return;
  }
  const len = k === 'bus' ? 15 : k === 'van' || k === 'ob' ? 10 : 9, tall = k === 'bus' || k === 'van' || k === 'ob' ? 6 : 4;
  const old = g.year < 1950;
  g.t.rect(x - (len >> 1), y - tall - 1, len, tall, col);
  g.t.rect(x - (len >> 1), y - tall - 1, len, 1, shade(col, 0.25));
  if (k === 'car' || k === 'police') { g.t.rect(x - 2, y - tall - 3, 5, 2, shade(col, old ? -0.1 : 0.1)); g.t.set(x - 1, y - tall - 2, REFL); g.t.set(x + 1, y - tall - 2, REFL); }
  else for (let i = 1; i < len - 2; i += 3) g.t.set(x - (len >> 1) + i, y - tall + 1, REFL);
  g.t.rect(x - (len >> 1) + 1, y - 1, 2, 1, DARK); g.t.rect(x + (len >> 1) - 3, y - 1, 2, 1, DARK);
  if (k === 'police') { g.t.set(x, y - tall - 4, C('#3060e0')); g.t.set(x + 1, y - tall - 4, RED); g.L.set(x, y - tall - 4, C('#4080ff')); g.L.set(x + 1, y - tall - 4, C('#ff4040')); g.t.rect(x - (len >> 1), y - 3, len, 1, WHITE); }
  if (k === 'ob' && g.era >= 2) { g.t.line(x + 1, y - tall - 1, x + 1, y - tall - 3, STEEL2); g.t.disc(x + 2, y - tall - 5, 2, WHITE); g.t.set(x + 1, y - tall - 5, STEEL); }
  if (k === 'bus') { g.t.rect(x - 7, y - 4, 15, 1, shade(col, -0.35)); g.t.rect(x - 6, y - 7, 12, 1, REFL); }
}
const eraCar = (g: G31, i: number): Col => C([['#202024', '#3a2a24'], ['#2a3a2a', '#5a2a2a'], ['#e0d0a8', '#c03838'], ['#a8682a', '#d8b860'], ['#c8ccd0', '#2a3a5a'], ['#f0f4f8', '#2a2a30']][g.era][i % 2]);
/** Disco de vinil (preto, selo colorido) com brilho. */
function disc(g: G31, x: number, y: number, r: number, lbl: Col, gold = false): void {
  g.t.disc(x, y, r, gold ? GOLD : C('#16161a'));
  if (r >= 3) g.t.disc(x, y, r - 1.2, gold ? C('#f0cc50') : C('#26262c'));
  g.t.disc(x, y, Math.max(0.8, r / 3), gold ? GOLD2 : lbl);
  g.t.set(Math.round(x - r / 2), Math.round(y - r / 2), gold ? C('#fff4c0') : C('#5a5a66'));
}
const awnCols = (g: G31): [Col, Col] => [[C('#2e5a3a'), CREAM], [C('#b03030'), CREAM], [C('#d04040'), WHITE], [C('#d07020'), C('#6a3a1a')], [C('#2a5aa0'), WHITE], [C('#202024'), C('#40e0ff')]][g.era] as [Col, Col];

/** Frontão escalonado de loja antiga (falsa fachada acima do telhado, com cornija). */
function parapet(g: G31): void {
  const m = mid(g);
  fL(g, 1, g.lenL - 1, g.H, g.H + 3, g.wall); fL(g, m - 4, m + 4, g.H + 3, g.H + 5, g.wall);
  fL(g, 1, g.lenL - 1, g.H + 2, g.H + 3, shade(g.trim, 0.1)); fL(g, m - 4, m + 4, g.H + 4, g.H + 5, shade(g.trim, 0.1));
}
/** Outdoor sobre o telhado (duas pernas) com a imagem do tipo. */
function roofBoard(g: G31, f: (x: number, y: number) => void, bg: Col): void {
  const x = Math.round(g.cx), y = Math.round(g.cy);
  g.t.line(x - 4, y, x - 4, y - 4, STEEL2); g.t.line(x + 4, y, x + 4, y - 4, STEEL2);
  plate(g, x - 7, y - 12, 15, 8, bg, INK); f(x - 7, y - 12);
}
const OLD31 = new Set<Art31>(['sheet', 'piano', 'gramophone', 'tailor', 'bakery', 'telegraph', 'records', 'instruments', 'radiotv', 'furniture', 'antique', 'gallery']);

// ---------------------------------------------------------------- tipos

type Draw31 = (g: G31) => void;
const groundShop = (g: G31) => Math.min(6, g.H - 4);

const ART: Partial<Record<Art31, Draw31>> = {
  // ----- loja de discos: vitrine larga com capas de LP, toldo listrado e disco no braço
  records(g) {
    const z1 = groundShop(g); shopWin(g, 2, g.lenL - 2, 1, z1);
    for (let u = 3, i = 0; u + 3 < g.lenL - 2; u += 4, i++) {
      const c = COVERS[(i + Math.floor(noise(g.seed, i) * 8)) % COVERS.length];
      if (g.era === 4) { fL(g, u, u + 3, 2, 4, (x, z) => (z === 1 && x === 0 ? WHITE : STEEL)); fL(g, u + 1, u + 2, 2, 3, c); }
      else fL(g, u, u + 3, 2, 5, (x, z) => (x === 1 && z === 1 ? DARK : c));
    }
    door(g, WOOD2, 3, 5, g.era >= 3);
    const [a, b] = awnCols(g); awning(g, 1, g.lenL - 1, z1 + 1, a, b);
    blade(g, 1, Math.min(g.H - 1, z1 + 9), (x, y) => disc(g, x + 3.5, y + 3.5, 3, COVERS[0]), g.era >= 2 ? C('#2a1a2a') : CREAM);
    if (g.era >= 2) g.L.disc(lp(g, 1, 0)[0] - 6.5, lp(g, 1, z1 + 9)[1] - 3.5, 3, withAlpha(C('#ff60a0'), 150));
  },
  // ----- loja do selo: toldo dourado, camisetas da banda na vitrine e a estrela do selo
  store(g) {
    const z1 = groundShop(g); shopWin(g, 2, g.lenL - 2, 1, z1, C('#3a3040'));
    for (let u = 3, i = 0; u + 4 < g.lenL - 2; u += 5, i++) { const c = COVERS[(i * 3) % COVERS.length]; fL(g, u, u + 4, 3, 4, c); fL(g, u + 1, u + 3, 1, 3, c); }
    door(g, WOOD2);
    awning(g, 1, g.lenL - 1, z1 + 1, g.brand ?? GOLD, GOLD2);
    eraBoard(g, lp(g, 2, 0)[0], lp(g, 2, z1 + 6)[1] - 2, Math.min(14, Math.round(g.lenL - 5)), g.brand ?? GOLD);
  },
  // ----- instrumentos: guitarras e um tambor na vitrine, toldo verde liso, guitarra no braço
  instruments(g) {
    const z1 = groundShop(g); shopWin(g, 2, g.lenL - 2, 1, z1, C('#5a3e26'));
    const gc = [C('#d8862a'), C('#c03030'), C('#222226'), C('#e0b070')];
    for (let u = 3, i = 0; u + 3 < g.lenL - 2; u += 4, i++) {
      if (Math.abs(u + 1.5 - mid(g)) < 3) continue;
      fL(g, u, u + 3, 1, 3, gc[i % 4]); fL(g, u + 1, u + 2, 3, Math.min(z1, 6), C('#3a2a1a')); fL(g, u + 1, u + 2, 2, 3, DARK);
    }
    door(g, C('#2a4a2a'));
    awning(g, 1, g.lenL - 1, z1 + 1, C('#2e6a42'));
    blade(g, 1, Math.min(g.H - 1, z1 + 9), (x, y) => { g.t.disc(x + 2.5, y + 4.5, 1.8, C('#d8862a')); g.t.line(x + 3, y + 3, x + 5, y + 1, WOOD2); g.t.set(x + 2, y + 5, DARK); });
  },
  // ----- gravadora: escritório com porta de vidro, disco de ouro na fachada e placa do logo
  label(g) {
    door(g, 0, 4, 6, true);
    fL(g, mid(g) - 4, mid(g) + 4, 6, 7, STEEL);
    const z = Math.min(g.H - 6, 15); const [x, y] = lp(g, mid(g), z);
    g.t.disc(x, y - 1, 4.2, GOLD2); disc(g, x, y - 1, 3.6, GOLD2, true); g.L.set(x - 1, y - 2, C('#fff0a0'));
    fL(g, 1, g.lenL - 1, g.H - 3, g.H - 1, g.brand ?? C('#3a5a90'));
    if (g.era >= 3) fL(g, 1, g.lenL - 1, g.H - 3, g.H - 1, g.brand ?? C('#3a5a90'), g.L);
    const [fx, fy] = gnd(g, 0.85, 3); for (const dx of [0, 3]) { g.t.line(fx + dx, fy, fx + dx, fy - 11, STEEL); g.t.rect(fx + dx + 1, fy - 11, 3, 2, dx ? C('#3a5a90') : (g.brand ?? GOLD)); }
  },
  // ----- subselo: menor, disco de platina e um estandarte vertical na lateral
  sublabel(g) {
    door(g, 0, 3, 5, true);
    const [x, y] = lp(g, mid(g), Math.min(g.H - 5, 11)); g.t.disc(x, y, 3.4, STEEL2); g.t.disc(x, y, 2.8, C('#e8ecf0')); g.t.disc(x, y, 1, C('#a8b0bc')); g.t.set(x - 1, y - 1, WHITE);
    fR(g, g.lenR / 2 - 1, g.lenR / 2 + 2, 3, g.H - 2, (u, z) => (z % 4 === 0 ? GOLD : C('#b04888')));
  },
  // ----- selo boutique: sobrado com três bandeirinhas sobre a porta e floreiras
  imprint(g) {
    door(g, C('#2a6a4a'));
    fL(g, mid(g) - 4, mid(g) + 4, 6, 7, C('#3a8a50'));
    for (const du of [-3, 0, 3]) { const [x, y] = lp(g, mid(g) + du, 8); g.t.line(x, y, x - 2, y - 5, STEEL2); g.t.rect(x - 2, y - 5, 3, 2, du ? C('#3a8a50') : CREAM); }
    for (const u of [2, g.lenL - 5]) fL(g, u, u + 3, 7, 8, (x) => (x % 2 ? C('#e04848') : C('#3a8a3a')));
  },
  // ----- estúdio: fachada fechada com painéis de isolamento, luz vermelha "REC" acesa, ar-condicionado no telhado
  studio(g) {
    const q = (u: number, z: number) => ((u % 4 === 0 || z % 4 === 0) ? shade(g.wall, -0.12) : (u + z) % 4 === 2 ? shade(g.wall, 0.06) : 0);
    fL(g, 1, g.lenL - 1, 2, g.H - 2, q); fR(g, 1, g.lenR - 1, 2, g.H - 2, q);
    for (const u of [3, g.lenL - 5]) fL(g, u, u + 2, g.H - 5, g.H - 3, C('#2a3a5a'));
    door(g, C('#2a2830'), 3, 5); fL(g, mid(g) - 0.5, mid(g) + 0.5, 3, 4, REFL);
    const [x, y] = lp(g, mid(g), 9); plate(g, x - 5, y - 4, 11, 6, DARK, STEEL2);
    g.t.text('REC', x - 4, y - 4, C('#ff4040')); g.L.text('REC', x - 4, y - 4, C('#ff5050'));
    g.L.rect(x - 5, y - 5, 11, 7, withAlpha(C('#ff3030'), 90));
    for (const dx of [-6, 3]) { g.t.rect(g.cx + dx, g.cy - 3, 4, 3, STEEL); g.t.rect(g.cx + dx, g.cy - 3, 4, 1, shade(STEEL, 0.25)); g.t.set(g.cx + dx + 1, g.cy - 2, STEEL2); g.t.set(g.cx + dx + 2, g.cy - 2, STEEL2); }
  },
  // ----- casa de shows: marquise com lâmpadas, letreiro vertical e cartazes na lateral
  venue(g) {
    const mq = g.marquee !== false;
    for (let u = 2; u < g.lenL - 2; u += 2) { const [x, y] = lp(g, u, 7); g.t.set(x, y, mq ? C('#fff0b0') : C('#8a8070')); if (mq) g.L.set(x, y, (u / 2) % 2 ? LITW : C('#ff8040')); }
    fL(g, 1, g.lenL - 1, 8, 9, C('#b03030'));
    const [bx, by] = lp(g, 2, g.H); g.t.rect(bx, by - 8, 3, 9 + Math.min(10, g.H - 10), C('#c03030')); if (mq) g.L.rect(bx, by - 7, 3, 7, withAlpha(C('#ff5050'), 220));
    if (mq) { const pw = Math.min(14, g.lenL - 6); for (let u = 0; u < pw; u++) { const [x, y] = lp(g, 3 + u, 11); g.t.set(x, y, C('#fff4c0')); g.t.set(x, y + 1, C('#fff4c0')); g.L.set(x, y, C('#fff8d0')); g.L.set(x, y + 1, u % 3 ? C('#ff60a0') : C('#fff8d0')); } }
    for (let u = 3, i = 0; u + 3 < g.lenR - 2; u += 5, i++) fR(g, u, u + 3, 2, 7, (x, z) => (z === 4 ? WHITE : COVERS[(i * 2 + 1) % COVERS.length]));
  },
  // ----- bar: toldo, mesas na calçada, caneca de neon na janela, luz quente
  bar(g) {
    const z1 = groundShop(g); shopWin(g, 2, g.lenL - 2, 1, z1, C('#5a3a20')); fL(g, 2, g.lenL - 2, 2, z1 - 1, withAlpha(LITW, 160), g.L);
    door(g, WOOD2);
    const [a, b] = g.era === 0 ? [C('#6a2a2a'), CREAM] as [Col, Col] : g.era >= 5 ? [C('#202024'), C('#d04040')] as [Col, Col] : [C('#2e6a3a'), C('#e8d8a8')] as [Col, Col];
    awning(g, 1, g.lenL - 1, z1 + 1, a, b);
    if (g.era >= 1) { const [x, y] = lp(g, 4, 4); const nc = g.era >= 3 ? C('#40e0ff') : C('#ffb030'); g.t.rect(x - 1, y - 3, 3, 3, nc); g.t.set(x + 2, y - 2, nc); g.L.rect(x - 1, y - 3, 3, 3, nc); g.L.set(x + 2, y - 2, nc); }
    for (const a2 of [0.2, 0.75]) { const [x, y] = gnd(g, a2, 3); g.t.rect(x - 1, y - 3, 4, 1, WHITE); g.t.line(x + 1, y - 2, x + 1, y, STEEL2); g.t.rect(x - 2, y - 2, 1, 2, WOOD); g.t.rect(x + 4, y - 2, 1, 2, WOOD);
      if (g.era >= 2 && a2 > 0.5) { g.t.line(x + 1, y - 3, x + 1, y - 8, STEEL2); g.t.poly([[x - 3, y - 8], [x + 5, y - 8], [x + 1, y - 11]], C('#d04040')); } }
  },
  // ----- jornal: rotativa vista pela janela, relógio, faixa do nome, fardos e furgão de entrega
  press(g) {
    shopWin(g, 2, g.lenL - 2, 1, 6, C('#2e3036'));
    for (let u = 3; u < g.lenL - 3; u += 4) { const [x, y] = lp(g, u + 1, 3); g.t.disc(x, y, 1.4, C('#8a8e96')); g.t.set(x, y, DARK); }
    fL(g, 2, g.lenL - 2, 4, 5, STEEL2); fL(g, 2, g.lenL - 2, 2, 6, withAlpha(LITC, 120), g.L);
    door(g, WOOD2);
    fL(g, 1, g.lenL - 1, g.H - 4, g.H - 1, (u, z) => (z === 1 && u % 2 === 0 && u > 0 && u < g.lenL - 3 ? CREAM : DARK));
    const [x, y] = lp(g, mid(g), g.H - 8); g.t.disc(x, y, 2.6, INK); g.t.disc(x, y, 2, CREAM); g.t.line(x, y, x, y - 1, INK); g.t.line(x, y, x + 1, y, INK);
    const [px, py] = gnd(g, 0.32, 1); for (let i = 0; i < 3; i++) { g.t.rect(px + i * 2 - 2, py - 2 - (i === 1 ? 2 : 0), 3, 2, CREAM); g.t.set(px + i * 2 - 1, py - 2 - (i === 1 ? 2 : 0), STEEL2); }
    const [vx, vy] = gnd(g, 1.05, 2); vehicle(g, vx + 4, vy, C(g.era >= 4 ? '#e8e8ec' : '#2a4a3a'), 'van');
  },
  // ----- hotel: varandas por andar, marquise até a calçada com porteiro, letreiro HOTEL (no telhado até 1949, vertical depois)
  hotel(g) {
    for (let z = 9; z < g.H - 3; z += 6) { fL(g, 1, g.lenL - 1, z, z + 1, shade(g.trim, 0.1)); fL(g, 1, g.lenL - 1, z - 1, z, shade(g.wall, -0.25)); for (let u = 2; u < g.lenL - 1; u += 2) { const [x, y] = lp(g, u, z + 2); g.t.set(x, y, shade(g.trim, 0.1)); } }
    door(g, 0, 4, 6, true);
    const m = mid(g); const [ax, ay] = lp(g, m - 3, 7), [bx, by] = lp(g, m + 3, 7);
    g.t.poly([[ax, ay], [bx, by], [bx - 7, by + 3.5], [ax - 7, ay + 3.5]], C('#8a2a2a')); g.t.line(Math.round(ax - 7), Math.round(ay + 4), Math.round(bx - 7), Math.round(by + 4), GOLD);
    g.t.line(Math.round(ax - 7), Math.round(ay + 5), Math.round(ax - 7), Math.round(ay + 10), GOLD2); g.t.line(Math.round(bx - 7), Math.round(by + 5), Math.round(bx - 7), Math.round(by + 10), GOLD2);
    const [px, py] = gnd(g, 0.5 + 4 / g.lenL, 3); person(g, px, py, C('#a02828'));
    if (g.era <= 1) { const w = 21; g.t.line(g.cx - 6, g.cy, g.cx - 6, g.cy - 4, STEEL2); g.t.line(g.cx + 6, g.cy, g.cx + 6, g.cy - 4, STEEL2); plate(g, g.cx - 10, g.cy - 11, w, 7, g.era ? DARK : CREAM, GOLD2); g.t.text('HOTEL', g.cx - 9, g.cy - 10, g.era ? LITW : C('#a03020')); if (g.era) g.L.text('HOTEL', g.cx - 9, g.cy - 10, LITW); }
    else { const [x, y] = lp(g, 1, g.H - 3); vText(g, x - 7, y, 'HOTEL', g.era >= 4 ? DARK : C('#8a2020'), g.era >= 4 ? C('#60e0ff') : C('#fff0b0')); }
  },
  // ----- fachada de facção: cortinas fechadas, lampião vermelho, carro preto e o vigia na porta
  facade(g) {
    const z1 = groundShop(g); shopWin(g, 2, g.lenL - 2, 1, z1, C('#5a1a24')); fL(g, 2, g.lenL - 2, 1, z1, (u) => (u % 3 === 0 ? C('#3a1018') : 0));
    door(g, C('#201418'));
    awning(g, 1, g.lenL - 1, z1 + 1, C('#24342a'));
    const [x, y] = lp(g, mid(g) + 3, z1 + 1); g.t.rect(x, y - 2, 2, 2, RED); g.L.rect(x - 1, y - 3, 4, 4, withAlpha(C('#ff3030'), 200));
    const [px, py] = gnd(g, 0.5 - 4 / g.lenL, 2); person(g, px, py, C('#1e1e24'));
    const [vx, vy] = gnd(g, 0.95, 3); vehicle(g, vx + 3, vy, C('#141418'), 'car');
  },
  // ----- delegacia: lâmpada azul na porta, grades nas janelas, mastro com bandeira e viatura
  police(g) {
    for (let u = 3; u < g.lenR - 3; u += 5) fR(g, u, u + 3, 4, 8, (x) => (x % 2 ? DARK : C('#4a5a70')));
    door(g, C('#2a3a5a'), 3, 6);
    const [x, y] = lp(g, mid(g), 8); g.t.rect(x - 1, y - 3, 3, 3, C('#3060d0')); g.t.set(x, y - 4, WHITE); g.L.rect(x - 2, y - 4, 5, 5, withAlpha(C('#5080ff'), 230));
    fL(g, mid(g) - 4, mid(g) + 4, -1, 0, shade(g.wall, 0.2));
    const [fx, fy] = lp(g, 1, g.H); g.t.line(fx, fy, fx, fy - 11, STEEL); g.t.rect(fx + 1, fy - 11, 4, 3, C('#2a5aa0')); g.t.rect(fx + 1, fy - 10, 4, 1, WHITE);
    if (g.year >= 1915) { const [vx, vy] = gnd(g, 0.95, 3); vehicle(g, vx + 3, vy, g.era >= 3 ? WHITE : C('#202024'), 'police'); }
  },
  // ----- beco (mercado negro): parede escura, grafite (cartazes rasgados antes de 1970), escada de incêndio, latas de lixo
  alley(g) {
    const tags = g.era >= 3 ? [C('#ff48c8'), C('#3ae0ff'), C('#f0e040'), C('#60e060')] : [C('#e8dcc0'), C('#c8b890'), C('#d8d0b8')];
    for (let i = 0; i < 5; i++) {
      const u = 2 + Math.floor(noise(g.seed, i, 3) * (g.lenL - 6)), z = 2 + Math.floor(noise(g.seed, i, 4) * Math.max(1, g.H - 9)), c = tags[i % tags.length];
      if (g.era >= 3) fL(g, u, u + 4, z, z + 2, (x, zz) => ((x + zz * 2 + i) % 3 ? c : 0)); else fL(g, u, u + 3, z, z + 4, (x, zz) => (x + zz === 4 ? 0 : c));
    }
    fL(g, 2, 5, 2, 6, (u, z) => (z % 2 ? WOOD : WOOD2));
    door(g, C('#16141a'), 3, 5);
    const [bx, by] = lp(g, mid(g) + 3, 6); g.t.set(bx, by, C('#f0e0a0')); g.L.disc(bx, by, 2, withAlpha(C('#ffd070'), 180));
    for (let z = 4; z < g.H - 2; z += 5) { fR(g, 1, g.lenR - 2, z, z + 1, C('#26262c'), g.t, false); for (let u = 1; u < g.lenR - 2; u += 2) { const [x, y] = rp(g, u, z + 2); g.t.set(x, y, C('#26262c')); } const [sx, sy] = rp(g, 2, z), [ex, ey] = rp(g, g.lenR - 3, z + 5); g.t.line(Math.round(sx), Math.round(sy) - 1, Math.round(ex), Math.round(ey) - 1, C('#3a3a42')); }
    const [tx, ty] = gnd(g, 0.18, 2); g.t.rect(tx - 2, ty - 4, 3, 4, C('#2a4a32')); g.t.rect(tx - 2, ty - 5, 3, 1, C('#3a5a42')); g.t.rect(tx + 2, ty - 3, 3, 3, C('#2a4a32')); g.t.disc(tx + 6, ty - 1, 1.3, C('#1a1a1e'));
  },
  // ----- rádio: mastro listrado vermelho e branco no telhado, lâmpada "no ar" na porta
  radio(g) {
    const x = g.cx, y = g.cy; for (let i = 0; i < 24; i++) g.t.set(x, y - i, Math.floor(i / 4) % 2 ? C('#e04040') : C('#f0f0f0'));
    g.t.line(x - 4, y, x, y - 18, C('#8a8a90')); g.t.line(x + 4, y, x, y - 18, C('#8a8a90')); g.L.set(x, y - 24, C('#ff3030'));
    door(g, WOOD2);
    const [ox, oy] = lp(g, mid(g), 7); plate(g, ox - 3, oy - 3, 7, 3, DARK, STEEL2); g.t.rect(ox - 2, oy - 2, 5, 1, C('#ff4040')); g.L.rect(ox - 3, oy - 3, 7, 3, withAlpha(C('#ff4040'), 210));
    if (g.era >= 1) { const [mx, my] = lp(g, 3, g.H - 4); g.t.rect(mx, my - 3, 2, 3, STEEL); g.t.set(mx, my - 4, DARK); g.t.set(mx + 1, my - 4, DARK); }
  },
  // ----- TV: torre alta com antenas, parabólicas no telhado (a partir de 1950) e caminhão de externa
  tv(g) {
    const x = g.cx + 4, y = g.cy + 2;
    g.t.line(x - 5, y, x, y - 30, STEEL2); g.t.line(x + 5, y, x, y - 30, STEEL2); for (let z = 4; z < 30; z += 5) g.t.line(x - 5 + Math.round(z / 6), y - z, x + 5 - Math.round(z / 6), y - z, STEEL);
    g.L.set(x, y - 31, C('#ff3030')); g.L.set(x, y - 18, C('#ff3030'));
    if (g.era >= 2) for (const dx of [-11, -6]) { const cx2 = g.cx + dx, cy2 = g.cy - 1; g.t.line(cx2, cy2, cx2, cy2 - 3, STEEL2); g.t.disc(cx2 - 1, cy2 - 5, 2.6, WHITE); g.t.disc(cx2 - 1, cy2 - 5, 1.4, C('#d8dce0')); g.t.set(cx2 + 1, cy2 - 6, DARK); }
    else for (let i = 0; i < 4; i++) g.t.line(g.cx - 10, g.cy - 4 - i * 2, g.cx - 4, g.cy - 4 - i * 2, STEEL2);
    door(g, 0, 4, 6, true);
    const [lx, ly] = lp(g, mid(g), 10); plate(g, lx - 4, ly - 4, 9, 5, C('#2a5aa0'), INK); g.t.disc(lx, ly - 2, 1.5, WHITE); g.t.set(lx, ly - 2, C('#2a5aa0'));
    if (g.era >= 1) { const [vx, vy] = gnd(g, 1.0, 3); vehicle(g, vx + 4, vy, g.era >= 3 ? WHITE : C('#c8c0a8'), 'ob'); }
  },
  // ----- teatro: frontão com tímpano, colunas, cortinas vermelhas entre elas, globos de luz e escadaria
  theatre(g) {
    for (let u = 2; u < g.lenL - 1; u += 4) { fL(g, u, u + 1, 1, g.H - 1, C('#f4f0e4')); fL(g, u - 1, u + 2, g.H - 2, g.H - 1, C('#f4f0e4')); }
    for (let u = 4; u + 2 < g.lenL - 1; u += 8) fL(g, u, u + 2, 5, g.H - 4, (x, z) => (z === 0 ? GOLD : x ? C('#8a1a20') : C('#b02a30')));
    const [Wx, Wy] = lp(g, 0, g.H), [Sx, Sy] = lp(g, g.lenL, g.H), mx = (Wx + Sx) / 2, my = (Wy + Sy) / 2 - 9;
    g.t.poly([[Wx - 1, Wy], [Sx + 1, Sy], [mx, my]], C('#ece4d0')); g.t.poly([[Wx + 4, Wy - 1], [Sx - 4, Sy - 1], [mx, my + 3]], C('#c8bca0')); g.t.disc(mx, my + 6, 1.4, GOLD);
    door(g, C('#5a1a1a'), 4, 6);
    for (const du of [-4, 4]) { const [x, y] = lp(g, mid(g) + du, 6); g.t.set(x, y, C('#fff0c0')); g.L.disc(x, y, 1.5, LITW); }
    fL(g, -1, g.lenL + 1, -1, 0, C('#e8e0cc'));
  },
  // ----- museu: colunata com entablamento, cúpula de cobre verde, disco de ouro e estandartes azuis na lateral
  museum(g) {
    for (let u = 2; u < g.lenL - 1; u += 3) fL(g, u, u + 1, 1, g.H - 3, C('#f0ece0'));
    fL(g, 0, g.lenL, g.H - 3, g.H, C('#e8e0d0'));
    const r = Math.min(7, g.w * 2.2); for (let z = 0; z < r * 0.8; z++) { const ww = r * Math.sqrt(1 - (z / (r * 0.8)) ** 2); for (let dx = -Math.ceil(ww); dx <= Math.ceil(ww); dx++) { if (Math.abs(dx + 0.5) > ww) continue; const f = (dx + 0.5) / Math.max(1, ww); g.t.set(g.cx + dx, g.cy - z, shade(C('#5aa08a'), f < -0.35 ? 0.18 : f < 0.25 ? 0 : -0.2)); } }
    g.t.line(g.cx, g.cy - Math.round(r * 0.8), g.cx, g.cy - Math.round(r * 0.8) - 4, GOLD);
    const [x, y] = lp(g, mid(g), g.H - 7); disc(g, x, y, 2.6, GOLD2, true);
    for (let u = 3; u + 2 < g.lenR - 1; u += 6) fR(g, u, u + 2, 3, g.H - 5, (_x, z) => (z === 0 ? GOLD : C('#2a5aa0')));
    door(g, C('#3a3a40'), 4, 6);
  },
  // ----- arena: cobertura oval com nervuras, torres de refletor e portões
  arena(g) {
    for (let u = 3; u < g.lenL - 3; u += 7) fL(g, u, u + 3, 0, 4, DARK);
    for (let u = 1; u < g.lenL; u += 3) fL(g, u, u + 1, 4, g.H, shade(g.wall, -0.1));
    const rx = (g.Ex - g.Wx) / 2 * 0.86, ry = rx * 0.5;
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { const q = (x / rx) ** 2 + (y / ry) ** 2; if (q > 1) continue; const c = q > 0.82 ? C('#9aa0a8') : Math.floor(x + rx) % 5 === 0 ? C('#b8bec6') : x < 0 ? C('#e4e8ec') : C('#ccd2d8'); g.t.set(g.cx + x, g.cy - 3 - (1 - q) * 4 + y, c); }
    for (const [a, b] of [[0.05, 0.05], [0.95, 0.05]] as [number, number][]) { const [x, y] = g.iso(g.gx + a * g.w, g.gy + b * g.d); g.t.line(x, y - g.H, x, y - g.H - 16, STEEL2); g.t.rect(x - 2, y - g.H - 18, 5, 2, STEEL); for (let i = 0; i < 5; i++) g.L.set(x - 2 + i, y - g.H - 17, WHITE); }
  },
  // ----- cinema: letreiro vertical CINE, marquise triangular com lâmpadas, cartazes e bilheteria
  cinema(g) {
    const m = mid(g);
    for (const du of [-7, 5]) fL(g, m + du, m + du + 2, 1, 6, (x, z) => (x === 0 || z === 0 ? CREAM : COVERS[(Math.round(du) + 9) % COVERS.length]));
    door(g, C('#3a1a1a'), 4, 5, g.era >= 2);
    const [ax, ay] = lp(g, m - 6, 7), [bx, by] = lp(g, m + 6, 7);
    if (g.era >= 1) { g.t.poly([[ax, ay], [bx, by], [(ax + bx) / 2 - 6, (ay + by) / 2 + 4]], C('#c83030')); for (let k = 0; k <= 8; k++) { const x = ax + (bx - ax) * k / 8, y = ay + (by - ay) * k / 8 - 1; g.t.set(x, y, C('#fff0b0')); g.L.set(x, y, LITW); } }
    else { fL(g, m - 6, m + 6, 7, 8, GOLD2); const [px, py] = lp(g, m, 10); plate(g, px - 9, py - 4, 17, 6, CREAM, WOOD2); g.t.text('CINE', px - 8, py - 3, C('#a03020')); }
    if (g.era >= 1) { const [vx, vy] = lp(g, m, g.H + 2); vText(g, vx - 3, vy, 'CINE', g.era === 4 ? C('#20283a') : C('#8a1a1a'), g.era >= 4 ? C('#60e0ff') : C('#fff0b0')); }
    const [kx, ky] = gnd(g, 0.5, 3); g.t.rect(kx - 2, ky - 6, 5, 6, GOLD2); g.t.rect(kx - 1, ky - 5, 3, 2, REFL); g.t.rect(kx - 3, ky - 7, 7, 1, GOLD);
  },
  // ----- lanchonete: faixa cromada, janelão aceso, placa redonda no poste
  diner(g) {
    fL(g, 0, g.lenL, 1, 2, RED); fL(g, 1, g.lenL - 1, 2, 5, (u) => (u % 4 === 0 ? STEEL : C('#4a7aa0'))); fL(g, 1, g.lenL - 1, 2, 5, withAlpha(LITW, 150), g.L);
    fL(g, 0, g.lenL, 5, g.H - 1, (_u, z) => (z % 2 ? C('#d8dce0') : C('#a8b0b8'))); fR(g, 0, g.lenR, 5, g.H - 1, (_u, z) => (z % 2 ? C('#d8dce0') : C('#a8b0b8')));
    door(g, 0, 3, 5, true);
    const [x, y] = gnd(g, 0.02, 1); g.t.line(x, y, x, y - 14, STEEL2); g.t.disc(x, y - 17, 3.4, WHITE); g.t.disc(x, y - 17, 2.6, RED); g.t.rect(x - 1, y - 18, 3, 2, WHITE); g.L.disc(x, y - 17, 3, withAlpha(C('#ff5050'), 200));
  },
  // ----- padaria: toldo marrom e creme, pães dourados na vitrine, pão no braço e sacas de farinha
  bakery(g) {
    const z1 = groundShop(g); shopWin(g, 2, g.lenL - 2, 1, z1, C('#6a4a2a'));
    for (let u = 3; u + 3 < g.lenL - 2; u += 4) for (const z of [2, 4]) { if (Math.abs(u + 1.5 - mid(g)) < 3) continue; fL(g, u, u + 3, z, z + 1, C('#d8a050')); fL(g, u + 1, u + 2, z, z + 1, C('#f0c878')); }
    door(g, WOOD2);
    awning(g, 1, g.lenL - 1, z1 + 1, C('#8a5a2a'), C('#f0e0c0'));
    blade(g, 1, Math.min(g.H - 1, z1 + 9), (x, y) => { g.t.rect(x + 1, y + 2, 5, 3, C('#d8a050')); g.t.rect(x + 2, y + 2, 3, 1, C('#f0c878')); g.t.set(x + 1, y + 2, 0); });
    const [sx, sy] = gnd(g, 0.25, 1); g.t.rect(sx, sy - 3, 3, 3, CREAM); g.t.rect(sx + 3, sy - 2, 2, 2, C('#e8dcc0'));
  },
  // ----- café com wi-fi: vidro do chão ao teto, mesas com notebook, vasos e xícara no braço
  cafe(g) {
    const z1 = Math.min(8, g.H - 3); fL(g, 1, g.lenL - 1, 0, z1, (u, z) => (u % 5 === 0 || z === z1 - 1 ? C('#a87848') : (u + z) % 9 === 0 ? REFL : C('#3a4a56'))); fL(g, 1, g.lenL - 1, 1, z1 - 1, withAlpha(LITW, 130), g.L);
    fL(g, 0, g.lenL, z1, z1 + 2, C('#a87848'));
    for (const a of [0.22, 0.72]) { const [x, y] = gnd(g, a, 3); g.t.rect(x - 1, y - 3, 4, 1, WOOD); g.t.line(x + 1, y - 2, x + 1, y, WOOD2); g.t.rect(x, y - 5, 2, 2, STEEL); g.t.set(x, y - 5, C('#60a0e0')); }
    for (const a of [0.04, 0.96]) { const [x, y] = gnd(g, a, 1); g.t.rect(x - 1, y - 2, 3, 2, C('#b05a3a')); g.t.disc(x + 0.5, y - 4, 1.8, C('#3a8a3a')); }
    blade(g, 1, Math.min(g.H - 1, z1 + 6), (x, y) => { g.t.rect(x + 1, y + 3, 4, 3, WHITE); g.t.set(x + 5, y + 4, WHITE); g.t.set(x + 2, y + 1, STEEL); g.t.set(x + 3, y, STEEL); }, C('#2a2a30'));
  },
  // ----- partituras: folhas com pauta na vitrine, toldo azul, nota musical no braço
  sheet(g) {
    const z1 = groundShop(g); shopWin(g, 2, g.lenL - 2, 1, z1, C('#2a3048'));
    for (let u = 3; u + 3 < g.lenL - 2; u += 4) { if (Math.abs(u + 1.5 - mid(g)) < 3) continue; fL(g, u, u + 3, 1, 5, (_x, z) => (z % 2 ? WHITE : C('#2a2a30'))); }
    door(g, WOOD2); awning(g, 1, g.lenL - 1, z1 + 1, C('#24386a'));
    blade(g, 1, Math.min(g.H - 1, z1 + 9), (x, y) => { g.t.disc(x + 2.5, y + 5, 1.4, INK); g.t.line(x + 3, y + 5, x + 3, y + 1, INK); g.t.line(x + 3, y + 1, x + 5, y + 2, INK); });
  },
  // ----- pianos: piano de cauda preto na vitrine larga, faixa dourada com letras, pilastras
  piano(g) {
    const z1 = groundShop(g); shopWin(g, 2, g.lenL - 2, 1, z1, C('#5a4a3a'));
    const u0 = 3; fL(g, u0, u0 + 8, 2, 3, C('#141418')); fL(g, u0 + 5, u0 + 8, 3, 5, C('#141418')); fL(g, u0, u0 + 1, 1, 2, C('#141418')); fL(g, u0 + 6, u0 + 7, 1, 2, C('#141418')); fL(g, u0 + 1, u0 + 4, 3, 4, WHITE);
    door(g, WOOD2);
    fL(g, 1, g.lenL - 1, z1 + 1, z1 + 3, (u, z) => (z === 1 && u % 2 && u > 1 && u < g.lenL - 4 ? GOLD : INK));
    for (const u of [1, g.lenL - 2]) fL(g, u, u + 1, 0, z1 + 1, C('#e8e0c8'));
  },
  // ----- gramofones: gramofone com a corneta dourada na vitrine e no braço
  gramophone(g) {
    const z1 = groundShop(g); shopWin(g, 2, g.lenL - 2, 1, z1, C('#3a2e26'));
    const horn = (x: number, y: number) => { g.t.rect(x, y + 3, 3, 2, WOOD); g.t.line(x + 1, y + 3, x + 2, y + 1, GOLD2); g.t.poly([[x + 2, y + 1], [x + 6, y - 2], [x + 6, y + 2]], GOLD); };
    const [wx, wy] = lp(g, 3, 4); horn(wx, wy - 3);
    door(g, WOOD2); awning(g, 1, g.lenL - 1, z1 + 1, C('#5a2a3a'), C('#e8d8b0'));
    blade(g, 1, Math.min(g.H - 1, z1 + 9), (x, y) => horn(x, y + 1), DARK, GOLD2);
  },
  // ----- alfaiataria: dois manequins de terno na vitrine, peças de tecido, tesoura no braço
  tailor(g) {
    const z1 = groundShop(g); shopWin(g, 2, g.lenL - 2, 1, z1, C('#4a4038'));
    for (const [u, c] of [[3, C('#2c3a5e')], [g.lenL - 6, C('#5a4a3a')]] as [number, Col][]) { fL(g, u, u + 3, 2, 5, c); fL(g, u + 1, u + 2, 5, 6, SKIN); fL(g, u + 1, u + 2, 1, 2, STEEL2); }
    door(g, WOOD2); awning(g, 1, g.lenL - 1, z1 + 1, C('#3a3a40'));
    blade(g, 1, Math.min(g.H - 1, z1 + 9), (x, y) => { g.t.line(x + 1, y + 1, x + 5, y + 5, STEEL2); g.t.line(x + 5, y + 1, x + 1, y + 5, STEEL2); g.t.set(x + 1, y + 6, RED); g.t.set(x + 5, y + 6, RED); });
  },
  // ----- rádios e TVs: aparelhos empilhados na vitrine (rádios de madeira até 1949; TVs acesas depois) e antena em V
  radiotv(g) {
    const z1 = groundShop(g); shopWin(g, 2, g.lenL - 2, 1, z1, C('#2a2a30'));
    for (let u = 3, i = 0; u + 3 < g.lenL - 2; u += 4, i++) for (const z of [1, 3]) {
      if (Math.abs(u + 1.5 - mid(g)) < 3) continue;
      if (g.era <= 1) { fL(g, u, u + 3, z, z + 2, WOOD); fL(g, u + 1, u + 2, z + 1, z + 2, C('#e0c890')); }
      else { fL(g, u, u + 3, z, z + 2, STEEL2); fL(g, u, u + 2, z, z + 2, C('#60c0b0')); fL(g, u, u + 2, z, z + 2, C('#80f0e0'), g.L); }
    }
    door(g, WOOD2);
    g.t.line(g.cx, g.cy, g.cx, g.cy - 5, STEEL2); g.t.line(g.cx, g.cy - 5, g.cx - 4, g.cy - 10, STEEL); g.t.line(g.cx, g.cy - 5, g.cx + 4, g.cy - 10, STEEL);
    eraBoard(g, lp(g, 2, 0)[0], lp(g, 2, z1 + 6)[1] - 2, Math.min(12, Math.round(g.lenL - 5)), C('#3a8ad0'));
  },
  // ----- hi-fi: caixas de som altas com alto-falantes e o medidor VU aceso
  hifi(g) {
    const z1 = groundShop(g); shopWin(g, 2, g.lenL - 2, 1, z1, C('#2a2a30'));
    for (const u of [3, g.lenL - 6]) { fL(g, u, u + 3, 1, 6, C('#141418')); for (const z of [2, 4]) { const [x, y] = lp(g, u + 1.5, z); g.t.disc(x, y, 1, STEEL); } }
    door(g, WOOD2);
    const [x, y] = lp(g, 2, z1 + 6); plate(g, x, y - 4, 11, 4, DARK, STEEL2); for (let i = 0; i < 9; i++) { const c = i < 5 ? C('#40e060') : i < 7 ? C('#f0e040') : C('#ff4040'); g.t.set(x + 1 + i, y - 3 + (i % 2), c); g.L.set(x + 1 + i, y - 3 + (i % 2), c); }
  },
  // ----- fliperama: fachada escura, gabinetes com tela acesa e estrela de neon
  arcade(g) {
    const z1 = groundShop(g); shopWin(g, 2, g.lenL - 2, 1, z1, C('#120e1a'));
    const sc = [C('#ff48c8'), C('#3ae0ff'), C('#f0e040')];
    for (let u = 3, i = 0; u + 3 < g.lenL - 2; u += 4, i++) { if (Math.abs(u + 1.5 - mid(g)) < 3) continue; fL(g, u, u + 3, 1, 5, C('#3a2a5a')); fL(g, u, u + 2, 3, 5, sc[i % 3]); fL(g, u, u + 2, 3, 5, sc[i % 3], g.L); }
    door(g, C('#100c18'));
    const [x, y] = lp(g, mid(g), z1 + 6); const st = (P: Pen31, c: Col) => { P.line(x - 3, y, x + 3, y, c); P.line(x, y - 3, x, y + 3, c); P.line(x - 2, y - 2, x + 2, y + 2, c); P.line(x - 2, y + 2, x + 2, y - 2, c); };
    st(g.t, C('#ff70d0')); st(g.L, C('#ff70d0'));
  },
  // ----- videolocadora: faixa amarela e azul, prateleiras de fitas na vitrine e caixa de devolução
  video(g) {
    const z1 = groundShop(g); shopWin(g, 2, g.lenL - 2, 1, z1, C('#1e2a4a'));
    for (const z of [1, 3]) fL(g, 3, g.lenL - 3, z, z + 2, (u) => (Math.abs(u + 3 - mid(g)) < 2.5 ? 0 : COVERS[(u * 5 + z) % COVERS.length]));
    door(g, C('#1e2a4a'));
    fL(g, 0, g.lenL, z1 + 1, z1 + 4, (_u, z) => (z === 1 ? C('#1e3aa0') : C('#f0c020')));
    const [x, y] = gnd(g, 0.7, 1); g.t.rect(x, y - 4, 3, 4, C('#1e3aa0')); g.t.rect(x, y - 3, 3, 1, DARK);
  },
  // ----- megastore de CD: caixa larga, vitrines com cartazes, faixa vermelha e um CD gigante no telhado
  cdmega(g) {
    shopWin(g, 2, g.lenL - 2, 1, 6, C('#2a3040'));
    for (let u = 3, i = 0; u + 4 < g.lenL - 2; u += 6, i++) { if (Math.abs(u + 2 - mid(g)) < 4) continue; fL(g, u, u + 4, 2, 6, COVERS[i % COVERS.length]); }
    door(g, 0, 4, 5, true);
    fL(g, 0, g.lenL, 7, 9, RED); fR(g, 0, g.lenR, 7, 9, RED);
    const x = g.cx, y = g.cy - 8; g.t.line(x - 2, y + 7, x - 2, y + 4, STEEL2); g.t.line(x + 2, y + 7, x + 2, y + 4, STEEL2);
    g.t.disc(x, y, 6.2, C('#7a8088')); g.t.disc(x, y, 5.6, C('#d8dce4'));
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.t.set(x + Math.cos(a) * 4, y + Math.sin(a) * 4, COVERS[i % 6]); }
    g.t.disc(x, y, 1.6, C('#b8bec6')); g.t.set(x, y, C('#4a4e56')); g.L.set(x - 3, y - 3, WHITE);
  },
  // ----- bipes e celulares (1992–2004): quiosque baixo, bipe gigante no telhado e antena piscando
  pager(g) {
    shopWin(g, 1, g.lenL - 1, 1, 5, C('#2a3036')); for (let u = 2; u < g.lenL - 2; u += 3) fL(g, u, u + 2, 2, 3, C('#a8c890'));
    door(g, 0, 3, 5, true);
    const x = g.cx, y = g.cy - 3; plate(g, x - 5, y - 7, 10, 7, C('#2a2e34'), INK); g.t.rect(x - 3, y - 5, 6, 2, C('#a8e070')); g.L.rect(x - 3, y - 5, 6, 2, C('#c0ff80')); g.t.set(x + 3, y - 2, STEEL);
    g.t.line(x + 6, y + 2, x + 6, y - 10, STEEL2); g.L.set(x + 6, y - 11, C('#ff4040'));
  },
  // ----- lan house: vidro escuro com fileiras de monitores azuis acesos
  lan(g) {
    const z1 = groundShop(g); shopWin(g, 2, g.lenL - 2, 1, z1, C('#101420'));
    for (let u = 3; u + 2 < g.lenL - 2; u += 3) for (const z of [2, 4]) { if (Math.abs(u + 1 - mid(g)) < 2.5) continue; fL(g, u, u + 2, z, z + 1, C('#4aa0ff')); fL(g, u, u + 2, z, z + 1, C('#80c8ff'), g.L); }
    door(g, C('#101420'));
    eraBoard(g, lp(g, 2, 0)[0], lp(g, 2, z1 + 6)[1] - 2, Math.min(12, Math.round(g.lenL - 5)), C('#40a0ff'));
  },
  // ----- celulares: loja branca, vidro inteiro e um celular gigante aceso na vitrine
  phones(g) {
    const z1 = groundShop(g) + 1; fL(g, 1, g.lenL - 1, 0, z1, (u, z) => ((u + z) % 11 === 0 ? REFL : C('#d8e0e8')));
    const u0 = 3; fL(g, u0, u0 + 3, 1, z1 - 1, C('#16181e')); fL(g, u0, u0 + 2, 2, z1 - 2, C('#50c8f0')); fL(g, u0, u0 + 2, 2, z1 - 2, C('#80e0ff'), g.L);
    door(g, 0, 4, z1 - 1, true);
    const [x, y] = lp(g, mid(g), z1 + 3); g.t.disc(x, y, 1.6, C('#9aa4b0'));
  },
  // ----- games: caixas coloridas na vitrine e o controle no braço
  games(g) {
    const z1 = groundShop(g); shopWin(g, 2, g.lenL - 2, 1, z1, C('#2a2040'));
    for (let u = 3; u < g.lenL - 3; u += 2) { if (Math.abs(u - mid(g)) < 2.5) continue; fL(g, u, u + 1, 1, 4, COVERS[(u * 3) % COVERS.length]); }
    door(g, C('#2a2040')); fL(g, 0, g.lenL, z1 + 1, z1 + 3, C('#6a2aa0'));
    blade(g, 1, Math.min(g.H - 1, z1 + 9), (x, y) => { g.t.rect(x, y + 2, 7, 3, STEEL); g.t.set(x + 1, y + 3, DARK); g.t.set(x + 4, y + 3, RED); g.t.set(x + 5, y + 2, C('#40c060')); g.t.set(x + 5, y + 4, C('#3a70e0')); g.t.set(x + 6, y + 3, C('#f0c040')); }, WHITE);
  },
  // ----- vinil e colecionadores: caixotes na calçada, lousa de cavalete e LPs pendurados na vitrine
  vinyl(g) {
    const z1 = groundShop(g); shopWin(g, 2, g.lenL - 2, 1, z1, C('#3a2a22'));
    for (let u = 4; u + 2 < g.lenL - 2; u += 5) { if (Math.abs(u - mid(g)) < 3) continue; const [x, y] = lp(g, u, 3); disc(g, x, y, 2, COVERS[u % COVERS.length]); }
    door(g, C('#2a1a14')); awning(g, 1, g.lenL - 1, z1 + 1, C('#24242a'));
    for (const a of [0.15, 0.78]) { const [x, y] = gnd(g, a, 2); g.t.rect(x - 2, y - 3, 5, 3, C('#8a6040')); for (let i = 0; i < 4; i++) g.t.set(x - 1 + i, y - 4, COVERS[(i + Math.round(a * 10)) % COVERS.length]); }
    const [cx2, cy2] = gnd(g, 0.42, 3); g.t.poly([[cx2 - 2, cy2], [cx2, cy2 - 6], [cx2 + 2, cy2]], C('#24382c')); g.t.set(cx2, cy2 - 4, WHITE); g.t.set(cx2 - 1, cy2 - 2, WHITE);
  },
  // ----- hologramas (2030+): figura translúcida projetada sobre um disco na calçada, faixa luminosa
  holo(g) {
    shopWin(g, 2, g.lenL - 2, 1, groundShop(g), C('#1a2a3a'));
    door(g, 0, 3, 5, true);
    fL(g, 0, g.lenL, groundShop(g) + 1, groundShop(g) + 2, C('#60e0ff')); fL(g, 0, g.lenL, groundShop(g) + 1, groundShop(g) + 2, C('#a0ffff'), g.L);
    const [x, y] = gnd(g, 0.2, 3); g.t.rect(x - 2, y - 1, 5, 1, STEEL2); g.t.rect(x - 1, y - 2, 3, 1, C('#60e0ff'));
    const hc = withAlpha(C('#80f0ff'), 150); g.t.disc(x, y - 11, 1.5, hc); g.t.rect(x - 1, y - 9, 3, 4, hc); g.t.rect(x - 1, y - 5, 1, 3, hc); g.t.rect(x + 1, y - 5, 1, 3, hc);
    g.L.disc(x, y - 11, 1.5, C('#a0ffff')); g.L.rect(x - 1, y - 9, 3, 4, C('#a0ffff'));
  },
  // ----- móveis / loja de departamentos: vitrines largas com sofá, abajur e mesa; andar de cima com mais vitrines a
  // partir de 1930; toldo listrado (era 0–1), faixa de neon (2–3), caixa luminosa (4) e painel de LED (5)
  furniture(g) {
    const z1 = groundShop(g); shopWin(g, 2, g.lenL - 2, 1, z1, C('#4a3a2e'));
    const sofa = g.era <= 1 ? C('#7a2a3a') : g.era === 2 ? C('#3aa0a0') : g.era === 3 ? C('#d07a2a') : g.era === 4 ? C('#6a6a74') : C('#c8c8c0');
    const u0 = 3; fL(g, u0, u0 + 6, 1, 3, sofa); fL(g, u0, u0 + 1, 3, 4, sofa); fL(g, u0 + 5, u0 + 6, 3, 4, sofa); fL(g, u0 + 1, u0 + 5, 3, 4, shade(sofa, 0.2));
    const u1 = Math.min(g.lenL - 6, u0 + 9); fL(g, u1, u1 + 1, 1, 5, STEEL2); fL(g, u1 - 1, u1 + 2, 5, 6, g.era <= 1 ? C('#e0c070') : CREAM); g.L.set(...lp(g, u1 + 0.5, 4.5), LITW);
    if (g.lenL > 22) { const u2 = g.lenL - 7; fL(g, u2, u2 + 4, 2, 3, WOOD); fL(g, u2, u2 + 1, 1, 2, WOOD2); fL(g, u2 + 3, u2 + 4, 1, 2, WOOD2); }
    door(g, 0, 4, 5, g.era >= 2);
    if (g.H >= 13) for (let u = 3; u + 4 < g.lenL - 2; u += 6) { shopWin(g, u, u + 4, z1 + 3, z1 + 6, C('#3a4a5a')); fL(g, u + 1, u + 3, z1 + 3, z1 + 4, COVERS[(u * 3) % COVERS.length]); }
    if (g.era <= 1) { const [a, b] = awnCols(g); awning(g, 1, g.lenL - 1, z1 + 1, a, b); }
    else fL(g, 0, g.lenL, z1 + 1, z1 + 3, g.era >= 4 ? C('#2a5aa0') : C('#b03030'));
    eraBoard(g, lp(g, 3, 0)[0], lp(g, 3, Math.min(g.H - 1, z1 + (g.H >= 13 ? 8 : 4)))[1] - 2, Math.min(18, Math.round(g.lenL - 6)), g.era >= 4 ? C('#2a5aa0') : C('#e0a040'));
    if (g.era >= 4) { const [x, y] = gnd(g, 0.9, 2); g.t.rect(x - 1, y - 6, 2, 6, STEEL2); g.t.rect(x - 3, y - 9, 6, 3, C('#2a5aa0')); g.L.rect(x - 2, y - 8, 4, 1, WHITE); }
  },
  // ----- antiquário / brechó: fachada de madeira escura, vitrine em bay com relógio, gramofone e vaso; placa oval
  // pendurada; cadeira e baú na calçada (do brechó em diante: arara com roupas)
  antique(g) {
    const z1 = groundShop(g); fL(g, 1, g.lenL - 1, 0, z1 + 1, C('#3a2618'));
    shopWin(g, 2, g.lenL - 2, 1, z1 - 1, C('#2a2018'));
    const [cx, cy] = lp(g, 4, 3); g.t.disc(cx, cy - 1, 1.6, GOLD2); g.t.set(cx, cy - 1, CREAM); g.t.rect(cx - 1, cy + 1, 3, 2, WOOD2);
    const hx = lp(g, Math.min(g.lenL - 5, 8), 2); g.t.rect(hx[0], hx[1] - 1, 3, 2, WOOD); g.t.poly([[hx[0] + 2, hx[1] - 1], [hx[0] + 5, hx[1] - 4], [hx[0] + 5, hx[1]]], GOLD);
    if (g.lenL > 16) { const vx = lp(g, g.lenL - 5, 2); g.t.rect(vx[0], vx[1] - 3, 2, 3, C('#3a7a8a')); g.t.set(vx[0], vx[1] - 4, C('#5aa0b0')); }
    door(g, C('#4a2e1c'), 3, 5);
    const [bx, by] = lp(g, 1, z1 + 4); g.t.line(bx - 1, by, bx - 5, by + 2, DARK);
    g.t.disc(bx - 6, by + 4, 2.5, C('#e8d8b0')); g.t.disc(bx - 6, by + 4, 1.8, C('#5a3a24')); g.t.set(bx - 7, by + 4, GOLD); g.t.set(bx - 5, by + 4, GOLD);
    const [sx, sy] = gnd(g, 0.18, 2); g.t.rect(sx - 2, sy - 4, 1, 4, WOOD2); g.t.rect(sx + 1, sy - 4, 1, 4, WOOD2); g.t.rect(sx - 2, sy - 3, 4, 1, WOOD); g.t.rect(sx - 2, sy - 7, 1, 4, WOOD);
    if (g.year >= 1965) { const [rx, ry] = gnd(g, 0.82, 2); g.t.line(rx - 3, ry - 8, rx + 3, ry - 8, STEEL2); g.t.line(rx - 3, ry - 8, rx - 3, ry, STEEL2); g.t.line(rx + 3, ry - 8, rx + 3, ry, STEEL2); for (let i = 0; i < 4; i++) g.t.rect(rx - 2 + i * 1.5, ry - 7, 1, 4, COVERS[(i * 3 + 1) % COVERS.length]); }
    else { const [tx, ty] = gnd(g, 0.82, 2); g.t.rect(tx - 3, ty - 3, 6, 3, C('#6a4228')); g.t.rect(tx - 3, ty - 4, 6, 1, C('#8a5a34')); g.t.set(tx, ty - 2, GOLD); }
  },
  // ----- galeria: fachada branca lisa, uma vitrine alta com UM quadro iluminado por spot; pilastras e friso (até 1949),
  // faixa de exposição pendurada (1950–1999), moldura de LED na fachada (2000+)
  gallery(g) {
    const z1 = Math.min(g.H - 3, groundShop(g) + 3);
    const u0 = 3, u1 = Math.max(u0 + 8, g.lenL - 8);
    fL(g, u0 - 1, u1 + 1, 0, z1 + 1, shade(g.trim, -0.2)); fL(g, u0, u1, 1, z1, C('#e8e6e0'));
    const pw = Math.min(7, u1 - u0 - 2), pu = Math.round((u0 + u1) / 2 - pw / 2);
    const paint = [C('#c84040'), C('#3a6ab0'), C('#e0b030'), C('#40a060')];
    fL(g, pu - 1, pu + pw + 1, 2, z1 - 1, GOLD2); fL(g, pu, pu + pw, 3, z1 - 2, (u, z) => paint[(Math.floor(u / 2) + Math.floor(z / 2) + g.seed) % 4]);
    fL(g, pu, pu + pw, z1 - 2, z1 - 1, withAlpha(LITW, 160), g.L);
    door(g, 0, 3, 5, true);
    if (g.era <= 1) { for (const u of [1, g.lenL - 2]) fL(g, u, u + 1, 0, g.H, C('#e8e0c8')); fL(g, 1, g.lenL - 1, g.H - 2, g.H - 1, (u) => (u % 3 ? C('#d8d0b8') : C('#b8b098'))); }
    else if (g.era <= 3) { const [x, y] = lp(g, g.lenL - 3, g.H - 1); g.t.rect(x, y, 3, Math.min(10, g.H - 3), C('#c83030')); g.t.rect(x + 1, y + 2, 1, Math.min(6, g.H - 6), WHITE); }
    else { fL(g, u0 - 1, u1 + 1, z1 + 1, z1 + 2, C('#40e0ff')); fL(g, u0 - 1, u1 + 1, z1 + 1, z1 + 2, C('#a0ffff'), g.L); }
    const [px, py] = gnd(g, 0.85, 2); g.t.rect(px - 1, py - 6, 3, 6, CREAM); g.t.rect(px - 1, py - 6, 3, 1, INK); g.t.set(px, py - 4, paint[g.seed % 4]);
  },
  // ----- telégrafo: postes com cruzetas e fios até o telhado, relógio grande na fachada
  telegraph(g) {
    door(g, WOOD2);
    const [x, y] = lp(g, mid(g), g.H - 5); g.t.disc(x, y, 2.8, INK); g.t.disc(x, y, 2.2, CREAM); g.t.line(x, y, x, y - 2, INK); g.t.line(x, y, x + 1, y + 1, INK);
    const [px, py] = gnd(g, -0.02, 1); g.t.line(px, py, px, py - g.H - 8, WOOD2); g.t.line(px - 3, py - g.H - 6, px + 3, py - g.H - 6, WOOD2);
    for (const dx of [-3, 3]) { g.t.set(px + dx, py - g.H - 7, C('#80c0c0')); g.t.line(px + dx, py - g.H - 6, g.cx - 2 + dx, g.cy - 3, C('#2a2a30')); }
    g.t.line(g.cx - 2, g.cy, g.cx - 2, g.cy - 4, WOOD2);
    eraBoard(g, lp(g, 2, 0)[0], lp(g, 2, 9)[1] - 2, Math.min(12, Math.round(g.lenL - 5)), C('#a03020'));
  },
  // ----- bar da jukebox (1950–85): jukebox arco-íris na janela, piso xadrez, nota de neon
  jukebox(g) {
    const z1 = groundShop(g); shopWin(g, 2, g.lenL - 2, 1, z1, C('#2a1a2a'));
    fL(g, 0, g.lenL, 0, 1, (u) => (u % 2 ? WHITE : DARK));
    const u0 = 3, jc = [C('#ff4040'), C('#ffb020'), C('#f0e040'), C('#40e060'), C('#40a0ff')];
    for (let i = 0; i < 5; i++) { fL(g, u0 + i, u0 + i + 1, 1, 4 + (i === 0 || i === 4 ? 0 : 1), jc[i]); fL(g, u0 + i, u0 + i + 1, 1, 4, jc[i], g.L); }
    door(g, C('#3a1a2a'));
    const [x, y] = lp(g, mid(g) + 4, z1 + 4); const nt = (P: Pen31) => { P.disc(x, y + 2, 1.2, C('#ff60c0')); P.line(x + 1, y + 2, x + 1, y - 2, C('#ff60c0')); P.line(x + 1, y - 2, x + 3, y - 1, C('#ff60c0')); }; nt(g.t); nt(g.L);
  },
  // ----- escola de música: torre do sino (estilo), escadaria e a clave no frontão
  school(g) {
    const [x, y] = lp(g, mid(g), Math.min(g.H - 3, 10)); g.t.disc(x, y, 2.6, CREAM); g.t.line(x, y - 2, x, y + 2, INK); g.t.disc(x - 0.5, y + 1, 1, INK); g.t.set(x + 1, y - 1, INK);
    fL(g, mid(g) - 4, mid(g) + 4, -1, 0, shade(g.wall, 0.25));
  },
  // ----- editora musical: sobrado com janela saliente e a colcheia na placa redonda
  publisher(g) {
    const u0 = 2; fL(g, u0, u0 + 5, 6, 10, shade(g.trim, -0.1)); fL(g, u0 + 1, u0 + 4, 7, 9, GLASS); fL(g, u0 + 1, u0 + 4, 7, 9, LITW, g.L);
    const [x, y] = lp(g, g.lenL - 5, Math.min(g.H - 3, 11)); g.t.disc(x, y, 3, INK); g.t.disc(x, y, 2.4, CREAM); g.t.disc(x - 0.5, y + 1, 0.9, INK); g.t.line(x, y + 1, x, y - 2, INK); g.t.set(x + 1, y - 1, INK);
  },
  // ----- fábrica de discos: plataforma de carga com caixas de discos (o dente de serra e a chaminé vêm da carcaça)
  plant(g) {
    fL(g, g.lenL - 7, g.lenL - 2, 0, 5, (_u, z) => (z % 2 ? C('#7a7e86') : C('#5a5e66')));
    const [x, y] = gnd(g, 0.85, 2); g.t.rect(x - 3, y - 3, 3, 3, C('#c8a878')); g.t.rect(x, y - 2, 3, 2, C('#b89868')); g.t.rect(x - 2, y - 5, 3, 2, C('#d8b888'));
  },
  // ----- escritório: porta giratória de vidro, mastros com bandeiras, casa de máquinas no telhado
  office(g) {
    door(g, 0, 4, 5, true);
    const [fx, fy] = gnd(g, 0.85, 2); for (const dx of [0, 4]) { g.t.line(fx + dx, fy, fx + dx, fy - 10, STEEL); g.t.rect(fx + dx + 1, fy - 10, 3, 2, dx ? C('#3a70b0') : C('#c83030')); }
  },
  // ----- streaming (data center): sem janelas, faixas de LED piscando e ventiladores no telhado
  platform(g) {
    for (let z = 3; z < g.H - 2; z += 4) { fL(g, 1, g.lenL - 1, z, z + 1, C('#3a3e48')); for (let u = 2; u < g.lenL - 2; u += 3) { const [x, y] = lp(g, u, z + 2); const c = (u + z) % 2 ? C('#40f0ff') : C('#80ff80'); g.t.set(x, y, c); g.L.set(x, y, c); } }
    door(g, C('#20242c'), 3, 5);
    for (const dx of [-7, 0]) { g.t.rect(g.cx + dx, g.cy - 3, 6, 3, STEEL); g.t.disc(g.cx + dx + 3, g.cy - 2, 1.4, STEEL2); }
  },
  // ----- agência de turnês: ônibus da turnê parado ao lado e quadro de datas na fachada
  booking(g) {
    door(g, WOOD2);
    const [x, y] = lp(g, 2, 10); plate(g, x, y - 6, 9, 6, CREAM, INK); for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) g.t.set(x + 1 + i * 2, y - 5 + j * 2, (i + j) % 3 ? C('#3a70b0') : RED);
    const [vx, vy] = gnd(g, 1.08, 3); vehicle(g, vx + 6, vy, g.era >= 4 ? C('#202024') : C('#c8a040'), 'bus');
  },
  // ----- sala de ensaio: porta de enrolar de garagem, amplificador na calçada (a guitarra vem da carcaça)
  rehearsal(g) {
    fL(g, 2, Math.min(g.lenL - 2, 10), 0, 6, (_u, z) => (z % 2 ? C('#8a8e94') : C('#6a6e74')));
    const [x, y] = gnd(g, 0.85, 2); g.t.rect(x - 2, y - 5, 5, 5, C('#1c1c20')); g.t.rect(x - 1, y - 4, 3, 3, C('#4a4a50')); g.t.rect(x - 2, y - 5, 5, 1, GOLD2);
  },
  // ----- alojamento: bicicletário na frente (as faixas por andar vêm da carcaça)
  dorm(g) {
    const [x, y] = gnd(g, 0.8, 2); for (let i = 0; i < 3; i++) { g.t.disc(x + i * 3, y - 1, 1, DARK); g.t.disc(x + i * 3 + 2, y - 1, 1, DARK); g.t.line(x + i * 3, y - 2, x + i * 3 + 2, y - 2, [RED, C('#3a70b0'), C('#40a060')][i]); }
  },
  // ----- prédio de apartamentos: varandas com roupa no varal, ar-condicionado (1970+) e caixa-d'água
  apart(g) {
    for (let z = 8; z < g.H - 3; z += 7) { fL(g, 2, g.lenL - 2, z, z + 1, shade(g.trim, -0.05)); for (let u = 3; u < g.lenL - 3; u += 4) { const [x, y] = lp(g, u, z + 2); g.t.set(x, y, COVERS[(u + z) % COVERS.length]); g.t.set(x + 1, y, WHITE); } if (g.era >= 3) { const [x, y] = rp(g, 3 + (z % 5), z + 3); g.t.rect(x, y - 2, 3, 2, C('#d8d8d0')); } }
    door(g, WOOD2, 3, 5);
    g.t.line(g.cx + 2, g.cy, g.cx + 2, g.cy - 3, C('#3a3030')); g.t.line(g.cx + 6, g.cy, g.cx + 6, g.cy - 3, C('#3a3030')); g.t.rect(g.cx + 1, g.cy - 8, 7, 5, g.era >= 3 ? C('#4a7ab0') : C('#7a5a3a'));
  },
  // ----- casa: cerquinha na frente, caixa de correio e chaminé (o telhado de duas águas vem da carcaça)
  house(g) {
    const [x0, y0] = gnd(g, 0, 2); for (let u = 0; u <= g.lenL; u += 2) { const [x, y] = [x0 + u, y0 + u / 2]; g.t.line(Math.round(x), Math.round(y), Math.round(x), Math.round(y) - 2, WHITE); }
    const [mx, my] = gnd(g, 0.8, 3); g.t.line(mx, my, mx, my - 3, WOOD2); g.t.rect(mx - 1, my - 5, 3, 2, C('#3a70b0'));
    const [cx2, cy2] = lp(g, g.lenL - 4, g.H + 4); g.t.rect(cx2, cy2 - 5, 2, 5, C('#8a4a3a')); g.t.rect(cx2, cy2 - 6, 2, 1, C('#3a3030'));
  },
  // ----- mansão: varanda com colunas, sebe alta com portão e duas chaminés
  mansion(g) {
    for (let u = 3; u < g.lenL - 2; u += 4) fL(g, u, u + 1, 0, 7, WHITE);
    fL(g, 1, g.lenL - 1, 7, 8, shade(g.trim, 0.2));
    const [x0, y0] = gnd(g, 0, 3); for (let u = -2; u <= g.lenL + 2; u++) { if (Math.abs(u - mid(g)) < 3) continue; const x = x0 + u, y = y0 + u / 2; g.t.rect(Math.round(x), Math.round(y) - 3, 1, 3, u % 3 ? C('#2e6a32') : C('#3a7a3a')); }
    const [gx2, gy2] = gnd(g, 0.5, 3); g.t.line(gx2 - 3, gy2 + 1, gx2 - 3, gy2 - 5, DARK); g.t.line(gx2 + 3, gy2 - 2, gx2 + 3, gy2 - 8, DARK); g.t.line(gx2 - 3, gy2 - 5, gx2 + 3, gy2 - 8, DARK);
    if (g.year >= 1915) { const [vx, vy] = gnd(g, 1.05, 3); vehicle(g, vx + 3, vy, eraCar(g, g.seed), 'car'); }
    for (const u of [2, g.lenL - 4]) { const [cx2, cy2] = lp(g, u, g.H + 3); g.t.rect(cx2, cy2 - 6, 2, 6, C('#e8e0d0')); g.t.rect(cx2, cy2 - 7, 2, 1, C('#3a3030')); }
  },
};

/** Desenha os detalhes próprios do tipo (por cima da caixa da fachada). */
export function drawArt31(art: Art31, b: Bx31): void {
  const f = ART[art];
  if (!f) return;
  const g = geo(b);
  if (OLD31.has(art) && g.era <= 1) parapet(g);
  f(g);
  if (g.era >= 3 && (art === 'video' || art === 'games' || art === 'lan')) roofBoard(g, (x, y) => {
    if (art === 'video') { g.t.rect(x + 1, y + 1, 13, 3, C('#f0c020')); g.t.rect(x + 1, y + 4, 13, 3, C('#1e3aa0')); g.t.rect(x + 4, y + 2, 7, 4, DARK); g.t.disc(x + 5.5, y + 4, 1, STEEL); g.t.disc(x + 9.5, y + 4, 1, STEEL); }
    else if (art === 'games') { g.t.rect(x + 2, y + 2, 11, 4, STEEL); g.t.set(x + 4, y + 3, DARK); g.t.set(x + 3, y + 4, DARK); g.t.set(x + 5, y + 4, DARK); g.t.set(x + 10, y + 3, RED); g.t.set(x + 11, y + 4, C('#40c060')); g.L.set(x + 10, y + 3, RED); }
    else { for (let i = 0; i < 3; i++) { g.t.rect(x + 2 + i * 4, y + 2, 3, 3, C('#4aa0ff')); g.L.rect(x + 2 + i * 4, y + 2, 3, 3, C('#80c8ff')); g.t.rect(x + 3 + i * 4, y + 5, 1, 1, STEEL); } }
  }, C('#16181e'));
}
export const hasArt31 = (art: Art31): boolean => !!ART[art];
