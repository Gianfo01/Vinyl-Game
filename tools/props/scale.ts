// Escala de jogo: leva o desenho (prancheta ~256 px) para a mesma densidade de pixel dos
// personagens de corpo inteiro (~78 px de altura). Reduz por área, volta a encaixar cada pixel
// na rampa de material mais próxima, refaz o contorno e acrescenta a sombra elíptica no chão.

import { C, Px, rgba, type Col } from '../../src/ui/pixel/px';
import { INK, Kit, darker, lighter, usedColors } from './kit';
import { crop } from './originais';

/** Altura nativa de referência de um personagem em pé (os sprites de corpo inteiro). */
export const CHAR_H = 78;

/** Cor da sombra no chão (translúcida, como nos personagens). */
export const SHADOW = C('#06040a', 110);

function nearest(c: Col, pal: Col[]): Col {
  const [r, g, b] = rgba(c);
  let best = pal[0];
  let bd = Infinity;
  for (const p of pal) {
    const [r2, g2, b2] = rgba(p);
    // distância ponderada (o olho é mais sensível ao verde)
    const d = (r - r2) ** 2 * 0.3 + (g - g2) ** 2 * 0.59 + (b - b2) ** 2 * 0.11;
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

/**
 * Reduz um prop renderizado (com contorno) para a altura h em pixels nativos de jogo.
 * shadow: largura relativa da sombra no chão (0 = sem sombra). snap: encaixar nas rampas do kit (desligue para os originais).
 */
export function toGameScale(src: Px, h: number, o: { shadow?: number; pad?: number; snap?: boolean } = {}): Px {
  const f = src.h / h;
  const w = Math.max(1, Math.round(src.w / f));
  const out = new Px(w + 2, h + 2);
  const pal = [...usedColors(), INK];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const x0 = x * f;
      const y0 = y * f;
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      let tot = 0;
      let ink = 0;
      for (let j = Math.floor(y0); j < Math.min(src.h, Math.ceil(y0 + f)); j++)
        for (let i = Math.floor(x0); i < Math.min(src.w, Math.ceil(x0 + f)); i++) {
          tot++;
          const c = src.d[j * src.w + i];
          if (!(c >>> 24)) continue;
          if (c === INK) ink++;
          const [cr, cg, cb] = rgba(c);
          r += cr;
          g += cg;
          b += cb;
          n++;
        }
      if (!n || n / tot < 0.5) continue;
      // o contorno externo do desenho grande não entra na média (senão tudo escurece)
      const solid = n - ink;
      if (solid <= 0) continue;
      let c: Col;
      if (ink) {
        r = 0;
        g = 0;
        b = 0;
        for (let j = Math.floor(y0); j < Math.min(src.h, Math.ceil(y0 + f)); j++)
          for (let i = Math.floor(x0); i < Math.min(src.w, Math.ceil(x0 + f)); i++) {
            const cc = src.d[j * src.w + i];
            if (!(cc >>> 24) || cc === INK) continue;
            const [cr, cg, cb] = rgba(cc);
            r += cr;
            g += cg;
            b += cb;
          }
        c = (0xff000000 | (Math.round(b / solid) << 16) | (Math.round(g / solid) << 8) | Math.round(r / solid)) >>> 0;
      } else c = (0xff000000 | (Math.round(b / n) << 16) | (Math.round(g / n) << 8) | Math.round(r / n)) >>> 0;
      out.d[(y + 1) * out.w + x + 1] = o.snap === false ? c : nearest(c, pal);
    }
  // contraste: em escala pequena o chanfro some; reforça luz em cima/esquerda e sombra embaixo/direita
  const base = out.clone();
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) {
      const c = base.d[y * out.w + x];
      if (!c) continue;
      if (!base.get(x, y - 1)) out.d[y * out.w + x] = lighter(c, 1);
      else if (!base.get(x + 1, y) || !base.get(x, y + 1)) out.d[y * out.w + x] = darker(c, 1);
    }
  // contorno externo
  const edge: number[] = [];
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) {
      if (out.d[y * out.w + x]) continue;
      if (out.get(x - 1, y) || out.get(x + 1, y) || out.get(x, y - 1) || out.get(x, y + 1)) edge.push(y * out.w + x);
    }
  for (const i of edge) out.d[i] = INK;
  const pad = o.pad ?? 1;
  const body = crop(out, 0);
  const sw = o.shadow ?? 1.05;
  if (!sw) return crop(body, pad);
  // sombra elíptica no chão, centrada sob a base do objeto (mais larga que ele, achatada)
  const rx = Math.max(4, Math.round((body.w * sw) / 2));
  const ry = Math.max(2, Math.round(rx * 0.22));
  const W = Math.max(body.w, rx * 2 + 1) + pad * 2;
  const H = body.h + ry + pad * 2;
  const res = new Px(W, H);
  const cx = W / 2;
  const cy = pad + body.h - 1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      if (d <= 1) res.d[y * W + x] = SHADOW;
    }
  const ox = Math.floor((W - body.w) / 2);
  for (let y = 0; y < body.h; y++)
    for (let x = 0; x < body.w; x++) {
      const c = body.d[y * body.w + x];
      if (c) res.d[(y + pad) * W + x + ox] = c;
    }
  return res;
}

/** Boneco de referência (pessoa de terno, ~78 px na escala de jogo) para conferir o tamanho dos props. Não é um asset. */
export function mannequin(): Px {
  const k = new Kit(120, 300);
  k.rbox(36, 290, 22, 12, 10, 4, 'black');
  k.rbox(62, 290, 22, 12, 10, 4, 'black');
  k.rbox(38, 280, 18, 90, 8, 3, 'navy', { front: { mat: 'navy', l: 0.5 } });
  k.rbox(62, 280, 18, 90, 8, 3, 'navy', { front: { mat: 'navy', l: 0.45 } });
  k.rbox(30, 196, 60, 90, 16, 10, 'navy', { front: { mat: 'navy', l: 0.55, grad: -0.15 } });
  k.tube([[32, 110], [24, 160], [28, 196]], 14, 'navy');
  k.tube([[88, 110], [96, 160], [92, 196]], 14, 'navy');
  k.poly([[54, 106], [66, 106], [60, 140]], { mat: 'cream', l: 0.85 });
  k.rbox(46, 106, 28, 14, 10, 4, 'skin', { front: { mat: 'skin', l: 0.6 } });
  k.disc(60, 74, 22, 28, 10, 'skin', { front: { mat: 'skin', l: 0.65, shade: 'sphere' } });
  k.disc(60, 52, 24, 14, 10, 'black', { front: { mat: 'black', l: 0.5 } });
  k.fill(50, 72, 3, 3, C('#1a1010'));
  k.fill(66, 72, 3, 3, C('#1a1010'));
  return k.finish();
}
