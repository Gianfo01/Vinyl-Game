// Leva os PNGs originais (≈1 254 px, arte ampliada ~5×) para a grade nativa dos props.

import { Px } from '../../src/ui/pixel/px';
import type { Img } from './png';

/** Fator de ampliação dos originais enviados (1 pixel de arte ≈ 5 pixels do arquivo). */
export const ORIG_SCALE = 5;

/** Reduz por média de bloco (só pixels opacos), binariza o alfa e recorta no conteúdo com margem. */
export function nativeFromOriginal(img: Img, f = ORIG_SCALE, pad = 3): Px {
  const w = Math.round(img.w / f);
  const h = Math.round(img.h / f);
  const out = new Px(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      let cov = 0;
      let tot = 0;
      for (let j = Math.floor(y * f); j < Math.min(img.h, Math.floor((y + 1) * f)); j++)
        for (let i = Math.floor(x * f); i < Math.min(img.w, Math.floor((x + 1) * f)); i++) {
          const c = img.d[j * img.w + i];
          const a = c >>> 24;
          tot++;
          cov += a;
          if (a < 128) continue;
          r += c & 255;
          g += (c >>> 8) & 255;
          b += (c >>> 16) & 255;
          n++;
        }
      if (!n || cov / tot < 110) continue;
      out.d[y * w + x] = ((255 << 24) | (Math.round(b / n) << 16) | (Math.round(g / n) << 8) | Math.round(r / n)) >>> 0;
    }
  return crop(out, pad);
}

export function crop(p: Px, pad: number): Px {
  let x0 = p.w;
  let y0 = p.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++)
      if (p.d[y * p.w + x]) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) return new Px(1, 1);
  const c = new Px(x1 - x0 + 1 + pad * 2, y1 - y0 + 1 + pad * 2);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) c.d[(y - y0 + pad) * c.w + (x - x0 + pad)] = p.d[y * p.w + x];
  return c;
}
