// R33 · POL33-A item 2 — FESTIVAL A CÉU ABERTO. O terreno do festival deixa de ser um salão com teto e letreiro (o corte
// de `interior27`): é um campo inteiro, sem moldura de prédio — céu por época e clima, colinas e árvores da estação, palco
// grande por época (coreto → concha → lona → andaimes → megapalco → LED e drones), barracas, banheiros, VIP, torre de som e
// plateia em campo em várias fileiras. Mesmo acabamento do jogo: peças em `Px` pela casca `cut27` (paleta da época, contorno
// INK de 1 px na camada de adereços), bonecos do jogo (`avatarSprite`) no palco. Determinístico; nada vai para o save.
import { C, INK, Px, lv, mix, noise, withAlpha, type Col } from '../pixel/px';
import { cut27 } from '../pixel/interior27';
import { prim27, type Ctx27 } from '../ps/hqpx27';
import { crowd31 } from '../pixel/stage31px';
import { avatarSprite, lookOf, type Pose } from '../pixel/avatar';
import { epOf, ledWall, post, sign, tent } from './int2px';

export type Clima33 = 'sol' | 'nublado' | 'chuva' | 'noite';
export const FEST33 = { W: 360, H: 124 } as const;
const B = prim27.blk;

/** Estação do ano pelo mês (0..11, hemisfério norte; o jogo não distingue). */
export const estacao33 = (m: number): 'inverno' | 'primavera' | 'verao' | 'outono' => (m <= 1 || m === 11 ? 'inverno' : m <= 4 ? 'primavera' : m <= 7 ? 'verao' : 'outono');
/** Clima do dia do festival: por mês e por uma semente estável (não sorteia nada do jogo). */
export function clima33(year: number, month: number, seed: string): Clima33 {
  let x = 2166136261 ^ (year * 31 + month);
  for (let i = 0; i < seed.length; i++) x = Math.imul(x ^ seed.charCodeAt(i), 16777619) >>> 0;
  const r = (x % 1000) / 1000, st = estacao33(month);
  if (year >= 1990 && r < 0.3) return 'noite';
  if (st === 'inverno') return r < 0.5 ? 'nublado' : r < 0.7 ? 'chuva' : 'sol';
  if (st === 'outono') return r < 0.4 ? 'nublado' : r < 0.6 ? 'chuva' : 'sol';
  return r < 0.15 ? 'chuva' : r < 0.35 ? 'nublado' : 'sol';
}

export interface Fest33Opts { year: number; month?: number; clima?: Clima33; seed?: string; /** quem toca (ids de ato) para os bonecos do palco */ acts?: string[] }

const HZ = 46, FLOOR = 86; // horizonte e chão do palco

function sky(p: Px, clima: Clima33, year: number): void {
  const top = clima === 'noite' ? C('#12142e') : clima === 'chuva' ? C('#5e6a78') : clima === 'nublado' ? C('#98a2ac') : year < 1950 ? C('#9cc4dc') : C('#6cc0f0');
  const low = clima === 'noite' ? C('#3a2a5a') : clima === 'chuva' ? C('#8a96a2') : clima === 'nublado' ? C('#c8ccd0') : C('#f0e4c4');
  for (let y = 0; y < HZ + 6; y++) for (let x = 0; x < FEST33.W; x++) p.put(x, y, mix(top, low, Math.min(1, y / (HZ + 4))));
}
function cloudBlob(p: Px, cx: number, cy: number, w: number, c: Col): void {
  for (let i = 0; i < 5; i++) p.ellipse(cx + (i - 2) * (w / 6), cy + (i % 2 ? -2 : 1), w / 4, 5 - Math.abs(i - 2), lv(c, 3 + (i % 2) * 0.4));
  p.ellipse(cx, cy + 4, w / 2, 3, lv(c, 2.4));
}
function skyDeco(p: Px, clima: Clima33, year: number, seed: number): void {
  if (clima === 'noite') {
    for (let k = 0; k < 46; k++) p.put(Math.floor(noise(k, 1, seed) * FEST33.W), Math.floor(noise(k, 2, seed) * (HZ - 4)), k % 3 ? C('#cfd6ff') : C('#fff2c0'));
    p.disc(300, 14, 7, C('#f4ecc8')); p.disc(303, 12, 6, C('#12142e')); p.disc(303, 12, 6, withAlpha(C('#12142e'), 255));
    p.ring(300, 14, 9, withAlpha(C('#f4ecc8'), 40));
  } else if (clima === 'sol') {
    p.disc(56, 14, 9, C('#fff0a0')); p.ring(56, 14, 12, withAlpha(C('#fff0a0'), 50)); p.ring(56, 14, 16, withAlpha(C('#fff0a0'), 24));
    cloudBlob(p, 190, 12, 46, C('#ffffff')); cloudBlob(p, 290, 22, 36, C('#ffffff'));
  } else {
    const c = clima === 'chuva' ? C('#6e7884') : C('#dfe3e6');
    for (let i = 0; i < 5; i++) cloudBlob(p, 36 + i * 76 + ((i * 17) % 20), 10 + (i % 2) * 14, 64, c);
  }
  void year;
}
function ground(p: Px, clima: Clima33, st: ReturnType<typeof estacao33>, year: number): void {
  const e = epOf(year);
  const base = e === 3 ? C('#7a5a3a') : st === 'outono' ? C('#7a8a3a') : st === 'inverno' ? C('#8a9a8a') : C('#4a8a3a');
  for (let y = HZ; y < FEST33.H; y++) for (let x = 0; x < FEST33.W; x++) {
    const stripe = ((x >> 4) + (y >> 4)) % 2 ? 0.26 : 0;
    p.put(x, y, lv(base, 2.7 + stripe + (y - HZ) / 90 - (clima === 'noite' ? 1.2 : clima === 'chuva' ? 0.5 : 0)));
  }
  if (e === 3 || clima === 'chuva') for (let k = 0; k < 9; k++) p.ellipse(20 + k * 40 + (k % 3) * 6, 104 + (k % 4) * 5, 15, 3, lv(clima === 'chuva' ? C('#6a7a8c') : C('#4a3420'), 2.4)); // lama e poças
  if (st === 'inverno' && clima !== 'chuva') for (let k = 0; k < 14; k++) p.ellipse(10 + k * 26, 52 + (k * 13) % 12, 11, 2, lv(C('#f2f6f8'), 3.4)); // neve nas beiradas
}
function hills(p: Px, clima: Clima33, st: ReturnType<typeof estacao33>): void {
  const col = clima === 'noite' ? C('#1e3040') : st === 'inverno' ? C('#8a9aa0') : st === 'outono' ? C('#8a7a40') : C('#5a8a50');
  for (let x = 0; x < FEST33.W; x++) { const h = HZ - 12 + Math.round(Math.sin(x / 38) * 4 + Math.sin(x / 13) * 2); for (let y = h; y < HZ + 2; y++) p.put(x, y, lv(col, 2.5 - (y - h) / 28)); }
}
function trees(g: Ctx27, st: ReturnType<typeof estacao33>, clima: Clima33): void {
  const { p, pal } = g, leaf = clima === 'noite' ? C('#1e4a2a') : st === 'outono' ? C('#c8782a') : st === 'primavera' ? C('#6ab04a') : C('#3f7a3a');
  for (let x = 6; x < FEST33.W - 8; x += 26) {
    const k = x % 3, y = HZ - 2 + (k % 2) * 3;
    p.rect(x + 3, y - 2, 3, 14, pal.woodDark);
    if (st === 'inverno') { p.line(x + 4, y - 2, x - 1, y - 12, pal.woodDark); p.line(x + 4, y - 2, x + 9, y - 13, pal.woodDark); p.line(x + 4, y - 4, x + 4, y - 15, pal.woodDark); }
    else { p.disc(x + 4.5, y - 6, 7, lv(leaf, 2.8 + k * 0.3)); if (st === 'primavera' && k === 0) p.put(x + 2, y - 8, C('#f4b4cc')); }
  }
}
function flags(g: Ctx27, y: number, x0: number, x1: number): void {
  const { p } = g; p.line(x0, y, x1, y + 4, C('#2a2a32'));
  for (let x = x0; x < x1; x += 12) p.rect(x, y + Math.round((x - x0) * 4 / (x1 - x0)) + 1, 6, 7, [C('#d8483a'), C('#e0b040'), C('#2a8a4a'), C('#3a6ac8'), C('#c070a0')][((x - x0) / 12) % 5 | 0]);
}

function stage(g: Ctx27, e: number, noite: boolean): void {
  const { p, pal } = g, sx = 98, sw = 164, fy = FLOOR;
  if (e === 0) { // coreto
    B(p, 154, fy - 10, 52, 10, pal.wall); for (let i = 0; i < 4; i++) p.rect(158 + i * 13, fy - 38, 3, 28, C('#f4f0e4'));
    p.poly([[152, fy - 38], [180, fy - 60], [208, fy - 38]], pal.accent2); p.disc(180, fy - 62, 2, pal.gold);
  } else if (e === 1) { // concha acústica
    p.disc(180, fy - 20, 44, pal.wall); p.disc(180, fy - 20, 36, lv(pal.wall, 1.6)); p.ring(180, fy - 20, 30, lv(pal.wall, 2)); B(p, sx + 14, fy - 8, sw - 28, 8, pal.wood);
    p.rect(sx + 14, fy - 30, sw - 28, 22, C('#1a1a22')); p.rect(sx + 14, fy - 30, sw - 28, 22, pal.wall); B(p, 150, fy - 8, 60, 8, pal.woodDark);
  } else if (e === 2) { // palco de madeira com lona
    B(p, sx, fy - 12, sw, 12, pal.wood); p.poly([[sx - 6, fy - 12], [sx + sw + 6, fy - 12], [sx + sw - 8, fy - 58], [sx + 8, fy - 58]], C('#d8cdb0'));
    post(p, sx - 4, fy - 58, 46, pal.woodDark); post(p, sx + sw + 2, fy - 58, 46, pal.woodDark); p.hline(sx + 10, sx + sw - 10, fy - 56, lv(C('#d8cdb0'), 1.6));
    B(p, 150, fy - 40, 60, 12, C('#c83a2a'));
  } else if (e === 3) { // andaimes
    B(p, sx, fy - 12, sw, 12, pal.woodDark); for (let i = 0; i <= 7; i++) p.vline(sx + i * ((sw / 7) | 0), fy - 66, fy - 12, lv(pal.metal, 2.8));
    for (let j = 0; j < 5; j++) p.hline(sx, sx + sw, fy - 66 + j * 13, lv(pal.metal, 3.2));
    B(p, sx + 10, fy - 50, sw - 20, 36, C('#e8dcc0')); p.disc(180, fy - 32, 9, C('#d83a3a')); p.disc(180, fy - 32, 4, C('#e0c040'));
  } else { // megapalco com telões
    p.rect(sx - 4, fy - 80, sw + 8, 66, C('#1a1a26')); B(p, sx - 8, fy - 14, sw + 16, 14, C('#22222e')); for (let i = 0; i <= 8; i++) p.vline(sx - 4 + i * (((sw + 8) / 8) | 0), fy - 80, fy - 14, lv(pal.metal, 3));
    p.hline(sx - 4, sx + sw + 4, fy - 80, lv(pal.metal, 3.4)); p.hline(sx - 4, sx + sw + 4, fy - 40, lv(pal.metal, 2.6));
    const a = e === 5 ? C('#7be0ff') : C('#ffd040'), b = e === 5 ? C('#c070ff') : C('#ff5ab0');
    ledWall(g, sx + 8, fy - 76, sw - 16, 34, a, b); ledWall(g, sx - 40, fy - 72, 28, 44, a, b); ledWall(g, sx + sw + 12, fy - 72, 28, 44, a, b);
    for (let i = 0; i < 5; i++) { p.rect(sx + 12 + i * 32, fy - 84, 8, 4, lv(C('#2a2a32'), 3)); if (noite || e >= 4) p.poly([[sx + 16 + i * 32, fy - 80], [sx + 4 + i * 32, fy - 14], [sx + 28 + i * 32, fy - 14]], withAlpha(i % 2 ? b : a, 18)); }
  }
  // monitores e caixas na frente
  B(p, 128, fy - 6, 30, 6, lv(C('#2a2a32'), 3)); B(p, 202, fy - 6, 30, 6, lv(C('#2a2a32'), 3));
}

function sideSets(g: Ctx27, e: number, year: number): void {
  const { p, pal } = g, fy = FLOOR;
  tent(g, 8, fy - 24, 30, C('#e0702c'), 'COMIDA'); tent(g, 46, fy - 24, 30, C('#2ec8c0'), 'MERCH');
  for (let i = 0; i < 3; i++) { B(p, 296 + i * 14, fy - 20, 12, 22, C('#2a6ac8')); p.rect(299 + i * 14, fy - 16, 6, 8, C('#e8eef0')); } sign(g, 317, fy - 32, 'BANHEIROS', C('#1a3a8a'), C('#ffffff'));
  B(p, 270, fy - 4, 22, 6, pal.wood); B(p, 271, fy - 12, 9, 9, pal.fabric); B(p, 282, fy - 12, 9, 9, pal.fabric); sign(g, 281, fy - 24, 'VIP', C('#14102a'), pal.gold);
  if (e <= 3) { for (let i = 0; i < 3; i++) p.vline(82 + i * 7, fy - 44, fy, lv(pal.metal, 2.6)); for (let j = 0; j < 5; j++) p.hline(82, 96, fy - 42 + j * 8, lv(pal.metal, 3.2)); B(p, 79, fy - 50, 20, 8, lv(C('#2a2a32'), 3)); } // torre de som
  else { for (const x of [264, 82]) { B(p, x, fy - 30, 10, 30, lv(C('#2a2a32'), 3)); for (let j = 0; j < 3; j++) p.disc(x + 5, fy - 24 + j * 9, 3, lv(C('#44444c'), 3)); } }
  if (e >= 3) for (let k = 0; k < 6; k++) { const bx = 12 + k * 7; p.ellipse(bx, FEST33.H - 14 + (k % 2) * 3, 3, 4, lv([C('#c83a2a'), C('#3a6ac8'), C('#e0b040')][k % 3], 2.8)); } // acampamento (barracas de lona)
  void year;
}

/** Pinta o campo do festival num `Px` de 360×124 (sem os bonecos do palco: ver `drawFestival33`). */
export function paintFestival33(o: Fest33Opts): { px: Px; clima: Clima33 } {
  const { year } = o, month = o.month ?? 6, st = estacao33(month), e = epOf(year), clima = o.clima ?? clima33(year, month, o.seed ?? 'f');
  const seed = Math.floor(noise(year, month, 7) * 1e6);
  const c = cut27(FEST33.W, year, { floor: 'lobby', dim: false, seed });
  const out = new Px(FEST33.W, FEST33.H), layer = new Px(FEST33.W, FEST33.H);
  sky(out, clima, year); skyDeco(out, clima, year, seed); hills(out, clima, st); ground(out, clima, st, year);
  const g: Ctx27 = { ...c.g, p: layer };
  trees(g, st, clima);
  flags(g, 6, 0, FEST33.W - 4);
  stage(g, e, clima === 'noite');
  sideSets(g, e, year);
  // plateia em campo: três fileiras, as de trás mais altas no quadro
  crowd31(layer, 70, 220, 26, FLOOR + 14, year, 5); crowd31(layer, 20, 320, 34, FLOOR + 24, year, 6); crowd31(layer, 6, 348, 36, FLOOR + 36, year, 7);
  if (e >= 4 && clima !== 'sol') for (let k = 0; k < 24; k++) { const dx = 6 + ((k * 83) % (FEST33.W - 12)), dy = 4 + ((k * 31) % 34), cc = k % 2 ? C('#7be0ff') : C('#c070ff'); layer.put(dx, dy, cc); layer.disc(dx, dy, 3, withAlpha(cc, 34)); } // drones e luzes
  layer.outline(INK);
  out.blit(layer, 0, 0);
  if (clima === 'noite') out.rect(0, 0, FEST33.W, FEST33.H, withAlpha(C('#0a0820'), 70));
  if (clima === 'chuva') for (let k = 0; k < 150; k++) { const x = Math.floor(noise(k, 4, seed) * FEST33.W), y = Math.floor(noise(k, 5, seed) * FEST33.H); out.line(x, y, x - 2, y + 4, withAlpha(C('#dfe8f4'), 120)); }
  return { px: out, clima };
}

/** O festival no canvas: o campo + os bonecos do jogo no palco. */
export function drawFestival33(canvas: HTMLCanvasElement, o: Fest33Opts): { clima: Clima33 } {
  const { px, clima } = paintFestival33(o);
  canvas.width = FEST33.W; canvas.height = FEST33.H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { clima };
  const img = ctx.createImageData(FEST33.W, FEST33.H);
  new Uint32Array(img.data.buffer).set(px.d);
  ctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const who = o.acts?.length ? o.acts : ['festa:a', 'festa:b', 'festa:c'];
  [150, 180, 212].forEach((x, i) => {
    const pose: Pose = 'play';
    const a = avatarSprite(lookOf({ id: who[i % who.length] }), { year: o.year, pose, dir: i === 2 ? 'SW' : 'SE' });
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(x - 6, FLOOR - 12, 12, 1);
    ctx.drawImage(a.c, x - a.ax, FLOOR - 12 - a.ay + 1);
  });
  return { clima };
}
