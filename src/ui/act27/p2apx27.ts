// r27 (P2A) — paintCork27: cortiça do quadro de favores (PURA, só Px). A sala de guerra da campanha e a coletiva
// saíram para r31/salas5px.paintWar5/paintPress5 (R31 onda 5 SALAS: corte da sede).

import { C, Px, dith, mix, noise, shade } from '../pixel/px';

export const PW27 = 200;
export const PH27 = 92;

/** Cortiça do quadro de favores (tamanho lógico pequeno; o CSS estica em pixel). */
export function paintCork27(w = 160, h = 100): Px {
  const p = new Px(w, h);
  const a = C('#b8864f'), b = C('#9c6c3c'), fr = C('#5a3a20');
  p.fill((x, y) => { const n = noise(x, y, 11); return n > 0.82 ? shade(a, 0.15) : n < 0.18 ? b : dith(x, y, 0.5) ? a : mix(a, b, 0.35); });
  p.rect(0, 0, w, 3, fr); p.rect(0, h - 3, w, 3, fr); p.rect(0, 0, 3, h, fr); p.rect(w - 3, 0, 3, h, fr);
  p.hline(0, w - 1, 3, shade(fr, 0.3)); p.vline(3, 3, h - 4, shade(fr, 0.3));
  return p;
}
