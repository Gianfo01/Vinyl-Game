// Rodada 19 (world19) — silhuetas em pixel dos marcos da cidade no horizonte do "Nosso mundo" (genéricas, sem
// marcas). Cada forma desenha a partir da base (x = centro, y = linha do horizonte) e devolve a caixa ocupada.

import type { LmShape } from '../../data/landmarks19';
import { Px, shade, type Col } from './px';

export interface LmCols { body: Col; hi: Col; dark: Col; lamp: Col }
/** Desenha a silhueta; devolve [x0, y0, x1, y1]. */
export function drawLandmark19(p: Px, sh: LmShape, x: number, y: number, c: LmCols): [number, number, number, number] {
  const B = c.body, H = c.hi, D = c.dark;
  const r = (x0: number, y0: number, w: number, h: number, col = B) => p.rect(Math.round(x0), Math.round(y0), Math.round(w), Math.round(h), col);
  switch (sh) {
    case 'statue': { p.ellipse(x, y, 16, 10, shade(B, -0.1)); r(x - 1, y - 30, 3, 18, H); r(x - 7, y - 26, 15, 2, H); p.disc(x + 0.5, y - 31, 1.5, H); return [x - 18, y - 33, x + 18, y]; }
    case 'cable': { p.ellipse(x + 8, y, 12, 26, shade(B, -0.08)); p.ellipse(x - 14, y, 9, 14, shade(B, -0.12)); p.line(x - 14, y - 14, x + 6, y - 25, D); r(x - 5, y - 21, 3, 2, c.lamp); return [x - 23, y - 26, x + 20, y]; }
    case 'bridge': { r(x - 24, y - 6, 49, 2, D); for (const tx of [x - 14, x + 14]) r(tx - 1, y - 22, 3, 22, B); for (let i = -24; i <= 24; i++) { const a = Math.abs(i); p.set(x + i, Math.round(a <= 14 ? y - 22 + (196 - i * i) / 14 : y - 22 + ((a - 14) * 15) / 10), H); } return [x - 24, y - 22, x + 25, y]; }
    case 'tbridge': { r(x - 22, y - 7, 45, 2, D); for (const tx of [x - 11, x + 11]) { r(tx - 3, y - 20, 7, 20, B); p.poly([[tx - 4, y - 20], [tx + 4, y - 20], [tx, y - 26]], D); } r(x - 8, y - 17, 17, 2, H); return [x - 22, y - 26, x + 23, y]; }
    case 'arch': { r(x - 24, y - 10, 49, 2, D); for (let i = -20; i <= 20; i++) p.set(x + i, Math.round(y - 4 - (400 - i * i) / 28), H); for (const tx of [x - 22, x + 22]) r(tx - 2, y - 14, 4, 14, B); return [x - 24, y - 19, x + 25, y]; }
    case 'spire': { r(x - 6, y - 30, 13, 30); r(x - 4, y - 40, 9, 10); r(x - 2, y - 46, 5, 6); p.line(x, y - 46, x, y - 56, H); for (let j = y - 28; j < y - 2; j += 3) r(x - 4, j, 9, 1, shade(B, 0.12)); return [x - 6, y - 56, x + 7, y]; }
    case 'twin': { r(x - 9, y - 50, 7, 50); r(x + 2, y - 50, 7, 50); for (let j = y - 48; j < y; j += 2) { r(x - 8, j, 5, 1, shade(B, 0.1)); r(x + 3, j, 5, 1, shade(B, 0.1)); } return [x - 9, y - 50, x + 9, y]; }
    case 'clock': { r(x - 4, y - 34, 9, 34); p.poly([[x - 5, y - 34], [x + 5, y - 34], [x, y - 44]], D); p.disc(x + 0.5, y - 29, 2.6, H); p.set(x, y - 30, D); return [x - 5, y - 44, x + 6, y]; }
    case 'lattice': { p.poly([[x - 12, y], [x - 6, y], [x - 1, y - 30], [x + 1, y - 30], [x + 6, y], [x + 12, y], [x + 2, y - 40], [x - 2, y - 40]], B); p.rect(x - 7, y - 14, 15, 2, B); p.ellipse(x, y - 1, 5, 6, shade(B, 0.25)); p.line(x, y - 40, x, y - 50, H); return [x - 12, y - 50, x + 12, y]; }
    case 'needle': { r(x - 1, y - 46, 3, 46); p.ellipse(x + 0.5, y - 36, 5, 2.5, B); r(x - 4, y - 38, 9, 2, H); p.line(x, y - 46, x, y - 54, H); p.set(x, y - 55, c.lamp); return [x - 5, y - 55, x + 6, y]; }
    case 'shell': { for (const [ox, h] of [[-12, 10], [-5, 16], [3, 13], [10, 9]] as [number, number][]) p.poly([[x + ox - 5, y], [x + ox + 5, y], [x + ox - 2, y - h]], H); r(x - 18, y - 2, 34, 2, D); return [x - 18, y - 16, x + 16, y]; }
    case 'stadium': { p.ellipse(x, y - 4, 22, 7, B); p.ellipse(x, y - 6, 17, 4, shade(B, 0.25)); for (const tx of [x - 18, x + 18]) { r(tx, y - 18, 1, 12, D); r(tx - 2, y - 19, 5, 2, c.lamp); } return [x - 22, y - 19, x + 22, y]; }
    case 'dome': { r(x - 14, y - 12, 29, 12); p.ellipse(x + 0.5, y - 12, 8, 9, B); r(x - 7, y - 13, 15, 2, B); r(x, y - 25, 1, 4, H); for (let i = -12; i <= 12; i += 3) r(x + i, y - 10, 1, 9, shade(B, 0.15)); return [x - 14, y - 25, x + 15, y]; }
    case 'hall': { r(x - 13, y - 13, 27, 13); p.poly([[x - 14, y - 13], [x + 14, y - 13], [x, y - 20]], shade(B, -0.1)); for (let i = -11; i <= 11; i += 3) r(x + i, y - 12, 1, 11, H); r(x - 2, y - 5, 5, 5, c.lamp); return [x - 14, y - 20, x + 14, y]; }
    case 'cathedral': { r(x - 10, y - 14, 21, 14); for (const tx of [x - 8, x + 8]) { r(tx - 2, y - 30, 5, 16); p.poly([[tx - 3, y - 30], [tx + 3, y - 30], [tx, y - 40]], D); } p.disc(x + 0.5, y - 10, 2.5, H); return [x - 11, y - 40, x + 11, y]; }
    case 'wall': { r(x - 26, y - 5, 53, 5, H); for (let i = -26; i < 27; i += 4) p.set(x + i, y - 6, D); r(x + 14, y - 15, 5, 15); r(x + 13, y - 17, 7, 2, D); p.set(x + 16, y - 18, c.lamp); return [x - 26, y - 18, x + 27, y]; }
    case 'pyramid': { p.poly([[x - 22, y], [x + 4, y], [x - 9, y - 18]], B); p.poly([[x - 2, y], [x + 22, y], [x + 10, y - 14]], shade(B, -0.1)); p.poly([[x - 9, y - 18], [x + 4, y], [x - 3, y]], shade(B, 0.12)); return [x - 22, y - 18, x + 22, y]; }
    case 'minaret': { r(x - 10, y - 10, 21, 10); p.ellipse(x + 0.5, y - 11, 7, 8, B); for (const tx of [x - 14, x + 14]) { r(tx - 1, y - 30, 3, 30); p.poly([[tx - 2, y - 30], [tx + 2, y - 30], [tx, y - 35]], D); } p.disc(x + 0.5, y - 19, 2, H); return [x - 15, y - 35, x + 16, y]; }
    case 'pagoda': { for (let k = 0; k < 4; k++) { const w = 22 - k * 5, yy = y - 6 - k * 7; r(x - w / 2 + 2, yy, w - 4, 6); p.poly([[x - w / 2 - 2, yy + 1], [x + w / 2 + 2, yy + 1], [x + w / 2 - 2, yy - 2], [x - w / 2 + 2, yy - 2]], D); } r(x, y - 38, 1, 6, H); return [x - 13, y - 38, x + 13, y]; }
    case 'sign': { p.ellipse(x, y, 28, 14, shade(B, -0.12)); for (let i = 0; i < 9; i++) r(x - 22 + i * 5, y - 10 - (i % 2), 3, 5, H); return [x - 28, y - 14, x + 28, y]; }
    case 'gate': { r(x - 12, y - 18, 25, 4); for (let i = -11; i <= 11; i += 4) r(x + i, y - 14, 2, 14); r(x - 13, y - 20, 27, 2, D); r(x - 2, y - 24, 5, 4, H); return [x - 13, y - 24, x + 14, y]; }
    case 'colosseum': { p.ellipse(x, y - 9, 20, 10, B); r(x - 20, y - 9, 41, 9); for (let j = 0; j < 3; j++) for (let i = -18; i <= 18; i += 4) r(x + i, y - 16 + j * 5, 2, 3, D); return [x - 20, y - 19, x + 21, y]; }
    case 'castle': { r(x - 5, y - 26, 11, 26); for (let i = -5; i <= 5; i += 3) r(x + i, y - 28, 2, 2); r(x - 12, y - 12, 7, 12, shade(B, -0.1)); p.disc(x + 0.5, y - 18, 1.5, H); return [x - 12, y - 28, x + 6, y]; }
    case 'wheel': { p.ring(x, y - 20, 16, B); p.ring(x, y - 20, 15, shade(B, -0.1)); for (let a = 0; a < 12; a++) { const t = (a / 12) * Math.PI * 2; p.line(x, y - 20, x + Math.cos(t) * 15, y - 20 + Math.sin(t) * 15, shade(B, 0.12)); p.rect(Math.round(x + Math.cos(t) * 16) - 1, Math.round(y - 20 + Math.sin(t) * 16), 2, 2, H); } p.line(x, y - 20, x - 8, y, D); p.line(x, y - 20, x + 8, y, D); return [x - 17, y - 37, x + 17, y]; }
    case 'obelisk': { p.poly([[x - 3, y], [x + 3, y], [x + 2, y - 40], [x - 2, y - 40]], B); p.poly([[x - 2, y - 40], [x + 2, y - 40], [x, y - 45]], H); return [x - 3, y - 45, x + 3, y]; }
    case 'temple': { p.ellipse(x, y, 22, 8, shade(B, -0.12)); r(x - 14, y - 16, 29, 2); p.poly([[x - 15, y - 16], [x + 15, y - 16], [x, y - 21]], shade(B, -0.08)); for (let i = -13; i <= 13; i += 3) r(x + i, y - 14, 1, 10, H); r(x - 14, y - 4, 29, 2); return [x - 22, y - 21, x + 22, y]; }
    case 'studio': { r(x - 9, y - 11, 19, 11); p.poly([[x - 10, y - 11], [x + 10, y - 11], [x + 6, y - 15], [x - 6, y - 15]], D); r(x - 6, y - 8, 5, 4, H); r(x + 3, y - 7, 3, 7, shade(B, -0.2)); r(x + 6, y - 14, 2, 2, c.lamp); return [x - 10, y - 15, x + 10, y]; }
  }
  return [x, y, x, y];
}
