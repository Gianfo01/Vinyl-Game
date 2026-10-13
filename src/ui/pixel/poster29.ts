// Rodada 29 (ARTE) — mais CARTAZES de parede (14×19, os da sede/HQ de art.ts posterPx), no estilo antigo: cartaz
// de show com data em bloco, silhueta com guitarra, espiral psicodélica, colagem xerox, lista de datas de turnê,
// mini-retrato do ato e explosão de estrelas. A época escolhe o repertório; a cor vem do logo do ato (logoColors).
// Entra no lugar de parte dos cartazes originais (≈60%, pela semente). Puro e semeado.

import { drawText, fitText, textWidth } from './font';
import { C, Px, hsl, mix, noise, shade, type Col } from './px';
import { h28 } from './art28kit';

export const POSTERS29 = ['gig', 'silhouette', 'swirl', 'xerox', 'dates', 'portrait', 'burst'] as const;
export type Poster29 = (typeof POSTERS29)[number];

export function posterKind29(seed: number, year: number): Poster29 | null {
  if (h28('pst29', seed) % 100 >= 60) return null;
  const pool: Poster29[] = year < 1965 ? ['gig', 'silhouette', 'dates'] : year < 1975 ? ['swirl', 'silhouette', 'gig'] : year < 1985 ? ['xerox', 'gig', 'burst'] : year < 2000 ? ['xerox', 'burst', 'dates', 'portrait'] : ['portrait', 'dates', 'burst', 'silhouette'];
  return pool[h28('pst29k', seed) % pool.length];
}

/** Cores (do logo do ato): fundo, letra, destaque, escuro. */
export interface PosterCols29 { bg: Col; fg: Col; accent: Col; dark: Col; hue: number }

export function posterPx29(kind: Poster29, seed: number, ini: string, year: number, col: PosterCols29): Px {
  const W = 14, H = 19;
  const p = new Px(W, H);
  const paper = year < 1975 ? C('#e8dcc0') : col.bg;
  p.rect(0, 0, W, H, paper);
  const ink = paper === col.bg ? col.fg : col.dark;
  const t = fitText(ini, 12);
  switch (kind) {
    case 'gig': p.rect(1, 1, 12, 6, col.accent); drawText(p, t, Math.round((W - textWidth(t)) / 2), 2, paper); for (let y = 9; y < 15; y += 2) p.hline(2, 11 - (y % 4), y, ink); p.rect(9, 13, 4, 5, col.dark); drawText(p, String(seed % 9 + 1), 10, 13, paper); break;
    case 'silhouette': p.rect(0, 0, W, 12, col.accent); p.disc(7, 4, 2, col.dark); p.poly([[3, 12], [5, 6], [9, 6], [11, 12]], col.dark); p.line(4, 10, 11, 5, col.dark); drawText(p, t, Math.round((W - textWidth(t)) / 2), 13, ink); break;
    case 'swirl': for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = Math.atan2(y - 9, x - 7), d = Math.hypot(x - 7, y - 9); const i = Math.floor((d + a * 2) / 2.2); p.put(x, y, [col.accent, col.bg, col.fg, hsl(col.hue + 90, 80, 55)][((i % 4) + 4) % 4]); } p.rect(1, 13, 12, 5, C('#151214')); drawText(p, t, Math.round((W - textWidth(t)) / 2), 13, C('#fff6e0')); break;
    case 'xerox': p.rect(0, 0, W, H, C('#efe9dc')); for (let y = 3; y < 13; y++) for (let x = 1; x < 13; x++) if (noise(x >> 1, y >> 1, seed) + 0.6 - Math.hypot(x - 7, y - 8) / 8 > 0.7) p.put(x, y, C('#151214')); p.rect(1, 13, 12, 5, col.accent); drawText(p, t, 2, 13, C('#151214')); p.rect(9, 1, 4, 2, mix(col.accent, C('#ffffff'), 0.3)); break;
    case 'dates': p.rect(1, 1, 12, 6, col.dark); drawText(p, t, Math.round((W - textWidth(t)) / 2), 2, col.fg === paper ? C('#fff6e0') : col.fg); for (let y = 8; y < 18; y += 2) { p.hline(1, 3, y, col.accent); p.hline(5, 12 - (y * 3) % 4, y, ink); } break;
    case 'portrait': p.rect(0, 0, W, H, col.bg); p.disc(7, 7, 4, C('#e0aa7e')); p.rect(3, 2, 8, 3, col.dark); p.put(5, 7, C('#151214')); p.put(9, 7, C('#151214')); p.poly([[2, 14], [4, 11], [10, 11], [12, 14]], col.accent); p.rect(0, 14, W, 5, C('#151214')); drawText(p, t, Math.round((W - textWidth(t)) / 2), 14, col.fg); break;
    case 'burst': for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = Math.atan2(y - 8, x - 7); p.put(x, y, Math.floor((a + Math.PI) * 4) % 2 ? col.accent : col.bg); } p.disc(7, 8, 4, col.fg); drawText(p, fitText(ini, 8), 7 - Math.round(textWidth(fitText(ini, 8)) / 2), 6, col.dark); p.hline(2, 11, 16, col.dark); break;
  }
  // moldura (igual ao cartaz original)
  for (let x = 0; x < W; x++) { p.put(x, 0, shade(paper, -0.35)); p.put(x, H - 1, shade(paper, -0.45)); }
  for (let y = 0; y < H; y++) { p.put(0, y, shade(paper, -0.35)); p.put(W - 1, y, shade(paper, -0.45)); }
  return p;
}
