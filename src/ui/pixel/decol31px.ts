// R31 · DECO-L — desenho das peças nas lojas e da cena de um estabelecimento decorado (puro, sem DOM além do canvas,
// sem sorteio). A arte FINAL de cada peça é da DECO-A (`ui/pixel/deco31px.ts`, por id e estilo): quando ela existir,
// `pieceArt31` passa a usá-la pelo registro `DECO_ART31.f`; até lá cada peça é desenhada pela categoria, pelo tamanho do
// catálogo (escala do boneco 24×34) e pela cor do estilo — nada de placeholder: sofá parece sofá, quadro parece quadro.

import type { DecoDef31, DecoStyle31 } from '../../data/deco31';
import type { DecoRoom31 } from '../../sim/r31/deco31';
import { C, Px, inked, mix, shade, withAlpha } from './px';

/** Registro para a arte da DECO-A (id + estilo + ano → desenho no Px, ancorado no canto de baixo à esquerda). */
export const DECO_ART31: { f?: (p: Px, d: DecoDef31, x: number, y: number, year: number) => boolean } = {};

/** Cor principal e de detalhe de cada estilo de época. */
const STY: Record<DecoStyle31, [string, string]> = {
  nouveau: ['#6a7a3a', '#c8a050'], deco: ['#2a2a34', '#d4af37'], fifties: ['#3ab0a8', '#f07878'], seventies: ['#d0702a', '#8a5a2a'],
  eighties: ['#e040a0', '#30c0e0'], nineties: ['#4a5a7a', '#a83a3a'], minimal: ['#d8d8d2', '#3a3a3e'], smart: ['#eef0f2', '#40a0ff'], any: ['#4a8a3a', '#a87848'],
};
const WOOD = C('#7a5232'), WOOD2 = C('#4e3420'), GOLD = C('#e0b030'), STEEL2 = C('#5a6068'), CREAM = C('#f4ecd8'), LIT = C('#ffd77a');
const PAINT = ['#c84040', '#3a6ab0', '#e0b030', '#40a060', '#e07020', '#8a4ac0'].map((x) => C(x));
const hsh = (s: string): number => { let x = 2166136261; for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619) >>> 0; return x; };

/** Desenha a peça com a base em (x, y) (canto de baixo à esquerda), no tamanho do catálogo. */
export function pieceArt31(p: Px, d: DecoDef31, x: number, y: number, year: number): void {
  if (DECO_ART31.f?.(p, d, x, y, year)) return;
  const [a, b] = STY[d.style].map((c) => C(c));
  const w = Math.max(4, Math.round(d.w)), h = Math.max(4, Math.round(d.h)), k = hsh(d.id);
  const X = Math.round(x), Y = Math.round(y);
  inked(p, (q) => {
    switch (d.cat) {
      case 'furniture': {
        if (/bed|futon|waterbed/.test(d.id)) { q.rect(X, Y - h, w, h, WOOD); q.rect(X + 2, Y - h + 2, w - 4, h - 4, CREAM); q.rect(X + 2, Y - h + 2, 6, 3, shade(CREAM, -0.1)); q.rect(X + 8, Y - h + 2, w - 10, h - 4, a); return; }
        if (/table|desk|cart|booth/.test(d.id) && h <= w) { q.rect(X, Y - h, w, 3, b === a ? WOOD : shade(a, 0.1)); q.rect(X + 1, Y - h + 3, 2, h - 3, WOOD2); q.rect(X + w - 3, Y - h + 3, 2, h - 3, WOOD2); if (/desk/.test(d.id)) q.rect(X + w - 10, Y - h + 3, 7, h - 6, shade(a, -0.15)); return; }
        if (h > w * 1.3) { // estante, armário, fliperama
          q.rect(X, Y - h, w, h, /arcade/.test(d.id) ? C('#2a2436') : shade(a, -0.1));
          if (/arcade/.test(d.id)) { q.rect(X + 2, Y - h + 4, w - 4, 8, b); q.rect(X + 3, Y - h + 5, w - 6, 6, C('#40e0ff')); q.rect(X + 2, Y - h + 14, w - 4, 2, STEEL2); q.set(X + 5, Y - h + 13, C('#ff4040')); return; }
          for (let yy = Y - h + 4; yy < Y - 2; yy += 7) { q.rect(X + 2, yy, w - 4, 1, shade(a, -0.35)); for (let i = 0; i < w - 6; i += 3) q.rect(X + 3 + i, yy - 4, 2, 4, PAINT[(i + k) % PAINT.length]); }
          return;
        }
        // sofá / poltrona: assento, encosto, braços e pés
        const seat = Math.max(3, Math.round(h * 0.38));
        q.rect(X + 1, Y - h, w - 2, h - seat, shade(a, 0.08));
        q.rect(X, Y - seat - 2, w, seat, a);
        q.rect(X, Y - h + 3, 3, h - 5, shade(a, -0.12)); q.rect(X + w - 3, Y - h + 3, 3, h - 5, shade(a, -0.12));
        q.rect(X + 2, Y - 2, 2, 2, year < 1950 ? WOOD2 : STEEL2); q.rect(X + w - 4, Y - 2, 2, 2, year < 1950 ? WOOD2 : STEEL2);
        if (w > 30) q.rect(X + Math.round(w / 2), Y - h + 2, 1, h - seat - 2, shade(a, -0.2));
        return;
      }
      case 'art': {
        const fr = d.style === 'deco' || d.style === 'nouveau' ? GOLD : d.style === 'minimal' || d.style === 'smart' ? C('#20222a') : b;
        q.rect(X, Y - h, w, h, fr); q.rect(X + 2, Y - h + 2, w - 4, h - 4, CREAM);
        if (/gold|platinum|record/.test(d.id)) { q.disc(X + w / 2, Y - h / 2, Math.min(w, h) / 2 - 3, GOLD); q.disc(X + w / 2, Y - h / 2, 1.5, C('#a87818')); return; }
        for (let yy = 0; yy < h - 4; yy++) for (let xx = 0; xx < w - 4; xx++) { const c = PAINT[(Math.floor(xx / Math.max(2, w / 4)) + Math.floor(yy / Math.max(2, h / 3)) + k) % PAINT.length]; if ((xx + yy + k) % 5) q.set(X + 2 + xx, Y - h + 2 + yy, mix(c, a, 0.25)); }
        return;
      }
      case 'plant': { const pot = Math.max(4, Math.round(h * 0.3)); q.rect(X + w / 4, Y - pot, w / 2, pot, C('#b0603a')); for (let i = 0; i < 6; i++) q.disc(X + w / 2 + Math.cos(i + k) * w / 4, Y - pot - 3 - (i % 3) * (h - pot) / 4, Math.max(2, w / 5), i % 2 ? C('#3a8a3a') : C('#2a6a2a')); return; }
      case 'lamp': { q.rect(X + w / 2, Y - h + 6, 1, h - 7, STEEL2); q.rect(X + w / 2 - 3, Y - 2, 7, 2, STEEL2); q.poly([[X + 1, Y - h + 7], [X + w - 1, Y - h + 7], [X + w - 4, Y - h], [X + 4, Y - h]], b); return; }
      case 'hifi': {
        q.rect(X, Y - h, w, h, /tv|screen|flat/.test(d.id) ? C('#1c1c22') : year < 1950 ? WOOD : shade(a, -0.3));
        if (/tv|screen|flat|video/.test(d.id)) { q.rect(X + 2, Y - h + 2, w - 4, Math.max(3, h - 6), C('#4ab0d0')); return; }
        if (/juke/.test(d.id)) { q.rect(X + 2, Y - h + 2, w - 4, 5, C('#ff9a3a')); q.rect(X + 3, Y - h + 9, w - 6, 4, C('#3ad0ff')); return; }
        for (let i = 0; i < 2; i++) q.disc(X + (i ? w * 0.72 : w * 0.28), Y - h / 2, Math.min(w / 5, h / 3), STEEL2);
        q.rect(X + w * 0.4, Y - h + 2, w * 0.2, 2, C('#40e060'));
        return;
      }
      case 'collect': { if (/disc|record|gold/.test(d.id)) { q.disc(X + w / 2, Y - h / 2, Math.min(w, h) / 2, GOLD); q.disc(X + w / 2, Y - h / 2, 1, WOOD2); return; } q.rect(X + w / 4, Y - h, w / 2, h, a); q.rect(X + w / 4, Y - h, w / 2, 2, b); return; }
      case 'light': { q.rect(X + w / 2, Y, 1, 4, STEEL2); q.ellipse(X + w / 2, Y + 6, w / 2, 3, b); return; }
      case 'sign': { q.rect(X, Y - h, w, h, C('#1a1420')); for (let i = 2; i < w - 2; i += 2) q.set(X + i, Y - h / 2, i % 4 ? a : b); return; }
      default: q.rect(X, Y - h, w, h, a);
    }
  });
  if (d.cat === 'lamp') { p.disc(x + d.w / 2, y - d.h + 9, 3, withAlpha(LIT, 90)); }
  if (d.cat === 'light') { p.disc(x + d.w / 2, y + 9, 5, withAlpha(LIT, 70)); }
}

/** Ícone da peça para os cartões da loja (canvas do tamanho da peça + borda). */
export function decoIcon31(d: DecoDef31, year: number): HTMLCanvasElement {
  const w = Math.max(8, Math.min(60, Math.round(d.cat === 'paper' || d.cat === 'ground' || d.cat === 'window' ? 28 : d.w))) + 6;
  const h = Math.max(8, Math.min(60, Math.round(d.cat === 'paper' || d.cat === 'ground' || d.cat === 'window' ? 22 : d.h))) + 6;
  const p = new Px(w, h);
  const [a, b] = STY[d.style].map((c) => C(c));
  if (d.cat === 'paper') { inked(p, (q) => { q.rect(3, 3, w - 6, h - 6, a); for (let yy = 4; yy < h - 4; yy += 4) for (let xx = 4 + (yy % 8 ? 2 : 0); xx < w - 4; xx += 4) q.set(xx, yy, b); }); }
  else if (d.cat === 'ground') { inked(p, (q) => { q.rect(3, 3, w - 6, h - 6, a); q.rect(5, 5, w - 10, h - 10, b); q.rect(7, 7, w - 14, h - 14, shade(a, 0.15)); }); }
  else if (d.cat === 'window') { inked(p, (q) => { q.rect(3, 3, w - 6, h - 6, C('#8ac0e0')); q.rect(3, 3, 7, h - 6, a); q.rect(w - 10, 3, 7, h - 6, a); q.rect(3, 3, w - 6, 3, b); }); }
  else if (d.cat === 'light') pieceArt31(p, { ...d, w: Math.min(d.w, w - 6), h: Math.min(d.h, h - 6) }, 3, 3, year);
  else pieceArt31(p, { ...d, w: Math.min(d.w, w - 6), h: Math.min(d.h, h - 6) }, 3, h - 3, year);
  return p.canvas();
}

/** Peça posta num lugar do cômodo (spot do motor da DECO-M: x/y relativos). */
export interface Placed31 { d: DecoDef31; slot: string; x: number; y: number }
export const SCENE_W31 = 240, SCENE_H31 = 136;
/** Cena de um cômodo de estabelecimento (bar, palco, loja…): parede, piso, balcão, janela e as peças nos lugares. */
export function estScene31(room: Pick<DecoRoom31, 'id' | 'spots'>, items: Placed31[], year: number, pub: boolean): HTMLCanvasElement {
  const W = SCENE_W31, H = SCENE_H31, FLOOR = 100;
  const p = new Px(W, H);
  const paper = items.find((i) => i.slot === 'paper');
  const ground = items.find((i) => i.slot === 'ground');
  const era = year < 1920 ? 0 : year < 1950 ? 1 : year < 1970 ? 2 : year < 1990 ? 3 : year < 2010 ? 4 : 5;
  const wallBase = paper ? C(STY[paper.d.style][0]) : C(['#c8b48a', '#b89a70', '#d8c8a0', '#a87850', '#c0c4c8', '#e4e4e0'][era]);
  const wallDot = paper ? C(STY[paper.d.style][1]) : shade(wallBase, -0.08);
  p.fill((x, y) => (y < 8 ? shade(wallBase, -0.35) : y < FLOOR ? ((x + (y >> 2) * 3) % 8 === 0 && y % 6 === 0 ? wallDot : (y % 22 === 0 ? shade(wallBase, -0.05) : wallBase)) : 0));
  p.rect(0, FLOOR - 4, W, 4, shade(wallBase, -0.3)); // rodapé
  const fl = ground ? C(STY[ground.d.style][0]) : C(['#6a4a2a', '#5a3a24', '#8a7a6a', '#7a4a2a', '#5a5a60', '#9a9a9c'][era]);
  p.fill((x, y) => (y >= FLOOR ? (((x >> 3) + (y >> 2)) % 2 ? fl : shade(fl, -0.1)) : 0), 0, FLOOR, W, H - FLOOR);
  if (ground) { const [a, b] = STY[ground.d.style].map((c) => C(c)); p.ellipse(W / 2, FLOOR + 22, 70, 9, b); p.ellipse(W / 2, FLOOR + 22, 64, 7, a); }
  // janela com a rua (céu da época) e cortina
  const win = room.spots.find((s) => s.slot === 'window');
  if (win) {
    const wx = Math.round(win.x * W) - 22, wy = 20;
    p.rect(wx - 2, wy - 2, 48, 40, shade(wallBase, -0.4));
    p.fill((_x, y) => mix(C('#7ab0e0'), C('#e8d8b0'), (y - wy) / 36), wx, wy, 44, 36);
    for (let i = 0; i < 4; i++) p.rect(wx + 2 + i * 11, wy + 22 - (i % 2) * 6, 9, 14 + (i % 2) * 6, C('#5a6a7a'));
    const cur = items.find((i) => i.slot === 'window');
    if (cur) { const c = C(STY[cur.d.style][0]); p.rect(wx - 4, wy - 4, 9, 44, c); p.rect(wx + 39, wy - 4, 9, 44, c); p.rect(wx - 4, wy - 6, 56, 4, C(STY[cur.d.style][1])); }
  }
  // balcão do bar / mostrador da loja / mesa (onde ficam as peças "sobre a mesa")
  const desk = room.spots.filter((s) => s.slot === 'desk');
  if (desk.length) {
    const dy = Math.round(0.62 * H) + 8;
    const top = room.id === 'bar' ? C('#8a5a34') : room.id === 'shop' ? C('#c8ccd0') : WOOD;
    inked(p, (q) => { q.rect(30, dy, W - 60, 4, shade(top, 0.15)); q.rect(32, dy + 4, W - 64, FLOOR + 6 - dy - 4, shade(top, -0.2)); });
    if (room.id === 'bar') for (let i = 0; i < 6; i++) { const bx = 40 + i * 28; p.rect(bx, dy - 12, 3, 12, PAINT[i % PAINT.length]); p.rect(bx, dy - 14, 3, 2, C('#2a2a2a')); }
  }
  // palco: tablado
  if (room.id === 'stage') inked(p, (q) => { q.rect(10, FLOOR - 10, W - 20, 10, WOOD); q.rect(10, FLOOR - 10, W - 20, 2, shade(WOOD, 0.2)); });
  // peças nos lugares (fundo → frente: parede, teto, mesa, chão, letreiro)
  const order = ['wall', 'ceiling', 'desk', 'floor', 'sign'];
  for (const it of [...items].filter((i) => order.includes(i.slot)).sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot) || a.x - b.x)) {
    const w = Math.min(it.d.w, 70), h = Math.min(it.d.h, 60);
    const d = { ...it.d, w, h };
    const cx = it.x * W;
    if (it.slot === 'wall') pieceArt31(p, d, cx - w / 2, Math.min(FLOOR - 26, 30 + h / 2 + 14), year);
    else if (it.slot === 'ceiling') pieceArt31(p, d, cx - w / 2, it.d.cat === 'light' ? 8 : 8 + h, year);
    else if (it.slot === 'desk') pieceArt31(p, d, cx - w / 2, Math.round(0.62 * H) + 8, year);
    else if (it.slot === 'sign') pieceArt31(p, d, W / 2 - w / 2, 8 + h, year);
    else pieceArt31(p, d, Math.max(2, Math.min(W - w - 2, cx - w / 2)), it.y * H + 4 > FLOOR + 24 ? FLOOR + 24 : FLOOR + 14, year);
  }
  // clientes (lugar público): dois bonecos de costas no salão
  if (pub) for (const [px, col] of [[54, '#3a5a8a'], [170, '#8a3a4a']] as [number, string][]) inked(p, (q) => { q.rect(px, FLOOR + 6, 6, 14, C(col)); q.disc(px + 3, FLOOR + 3, 3, C('#3a2a20')); q.rect(px + 1, FLOOR + 20, 2, 6, C('#2a2a30')); q.rect(px + 4, FLOOR + 20, 2, 6, C('#2a2a30')); });
  return p.canvas();
}
