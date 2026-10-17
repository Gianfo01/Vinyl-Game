// R31 · DECO-L — desenho das peças nas lojas e da cena de um estabelecimento decorado (puro, sem DOM além do canvas,
// sem sorteio). A arte FINAL de cada peça é da DECO-A (`ui/pixel/deco31px.ts`, por id e estilo): quando ela existir,
// `pieceArt31` passa a usá-la pelo registro `DECO_ART31.f`; até lá cada peça é desenhada pela categoria, pelo tamanho do
// catálogo (escala do boneco 24×34) e pela cor do estilo — nada de placeholder: sofá parece sofá, quadro parece quadro.

import type { DecoDef31, DecoStyle31 } from '../../data/deco31';
import { C, Px, inked, mix, shade, withAlpha } from './px';

/** Registro para a arte da DECO-A (id + estilo + ano → desenho no Px, ancorado no canto de baixo à esquerda). */
export const DECO_ART31: { f?: (p: Px, d: DecoDef31, x: number, y: number, year: number) => boolean } = {};

/** Cor principal e de detalhe de cada estilo de época. */
export const STY31: Record<DecoStyle31, [string, string]> = {
  nouveau: ['#6a7a3a', '#c8a050'], deco: ['#2a2a34', '#d4af37'], fifties: ['#3ab0a8', '#f07878'], seventies: ['#d0702a', '#8a5a2a'],
  eighties: ['#e040a0', '#30c0e0'], nineties: ['#4a5a7a', '#a83a3a'], minimal: ['#d8d8d2', '#3a3a3e'], smart: ['#eef0f2', '#40a0ff'], any: ['#4a8a3a', '#a87848'],
};
const WOOD = C('#7a5232'), WOOD2 = C('#4e3420'), GOLD = C('#e0b030'), STEEL2 = C('#5a6068'), CREAM = C('#f4ecd8'), LIT = C('#ffd77a');
const PAINT = ['#c84040', '#3a6ab0', '#e0b030', '#40a060', '#e07020', '#8a4ac0'].map((x) => C(x));
const hsh = (s: string): number => { let x = 2166136261; for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619) >>> 0; return x; };

/** Desenha a peça com a base em (x, y) (canto de baixo à esquerda), no tamanho do catálogo. */
export function pieceArt31(p: Px, d: DecoDef31, x: number, y: number, year: number, ink = true): void {
  if (DECO_ART31.f?.(p, d, x, y, year)) return;
  const [a, b] = STY31[d.style].map((c) => C(c));
  const w = Math.max(4, Math.round(d.w)), h = Math.max(4, Math.round(d.h)), k = hsh(d.id);
  const X = Math.round(x), Y = Math.round(y);
  const run = (f: (q: Px) => void) => (ink ? inked(p, f) : f(p));
  run((q) => {
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
        { // a pintura: paisagem, retrato ou abstrato, nas cores do estilo
          const ix = X + 2, iy = Y - h + 2, iw = w - 4, ih = h - 4, kind = k % 3;
          if (kind === 0) {
            q.rect(ix, iy, iw, ih, mix(C('#8ac0e0'), a, 0.2));
            q.disc(ix + iw * 0.7, iy + ih * 0.3, Math.max(1.5, Math.min(iw, ih) / 6), C('#f0d060'));
            q.poly([[ix, iy + ih], [ix, iy + ih * 0.6], [ix + iw * 0.4, iy + ih * 0.45], [ix + iw, iy + ih * 0.7], [ix + iw, iy + ih]], mix(C('#4a8a3a'), b, 0.3));
          } else if (kind === 1) {
            q.rect(ix, iy, iw, ih, mix(a, C('#2a2026'), 0.5));
            q.rect(ix + iw * 0.2, iy + ih * 0.62, iw * 0.6, ih * 0.38, b);
            q.disc(ix + iw / 2, iy + ih * 0.42, Math.max(1.5, Math.min(iw, ih) / 4.5), C('#e0b088'));
            q.rect(ix + iw / 2 - Math.min(iw, ih) / 4.5, iy + ih * 0.2, Math.min(iw, ih) / 2.25, Math.max(1, ih * 0.1), C('#3a2418'));
          } else {
            q.rect(ix, iy, iw, ih, C('#f0ece0'));
            q.rect(ix + 1, iy + 1, iw * 0.5, ih * 0.55, PAINT[k % PAINT.length]);
            q.rect(ix + iw * 0.55, iy + ih * 0.3, iw * 0.4, ih * 0.6, PAINT[(k + 2) % PAINT.length]);
            q.rect(ix + iw * 0.1, iy + ih * 0.65, iw * 0.35, ih * 0.3, a);
          }
        }
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
  const [a, b] = STY31[d.style].map((c) => C(c));
  if (d.cat === 'paper') { inked(p, (q) => { q.rect(3, 3, w - 6, h - 6, a); for (let yy = 4; yy < h - 4; yy += 4) for (let xx = 4 + (yy % 8 ? 2 : 0); xx < w - 4; xx += 4) q.set(xx, yy, b); }); }
  else if (d.cat === 'ground') { inked(p, (q) => { q.rect(3, 3, w - 6, h - 6, a); q.rect(5, 5, w - 10, h - 10, b); q.rect(7, 7, w - 14, h - 14, shade(a, 0.15)); }); }
  else if (d.cat === 'window') { inked(p, (q) => { q.rect(3, 3, w - 6, h - 6, C('#8ac0e0')); q.rect(3, 3, 7, h - 6, a); q.rect(w - 10, 3, 7, h - 6, a); q.rect(3, 3, w - 6, 3, b); }); }
  else if (d.cat === 'light') pieceArt31(p, { ...d, w: Math.min(d.w, w - 6), h: Math.min(d.h, h - 6) }, 3, 3, year);
  else pieceArt31(p, { ...d, w: Math.min(d.w, w - 6), h: Math.min(d.h, h - 6) }, 3, h - 3, year);
  return p.canvas();
}
