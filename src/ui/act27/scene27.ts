// r27 (M1) — drawScene27: pinta um buffer Px de cena e os bonecos (avatares reais, avatarSprite) no <canvas>, com a
// camada da frente por cima (mesa, balcão, vidro). As salas em si ficam no corte da sede: r31/scene31px (mecânicas,
// diretoria) e r31/salas5px (composição, estúdio, sala de guerra, crise, coletiva, golpe — R31 onda 5 SALAS).

import type { Person } from '../../sim/types';
import { avatarSprite, lookOf, type Pose } from '../pixel/avatar';
import { Px, type Col } from '../pixel/px';

export const W27 = 200;
export const H27 = 92;
const KIND_COL: Record<string, string> = { hook: '#e8b04a', lyric: '#7fb6e8', harmony: '#b58be0', rhythm: '#e07a5f', special: '#7fd18a' };

export interface Who27 { p: Pick<Person, 'id' | 'role' | 'look' | 'born'>; x: number; y: number; pose: Pose; dir?: 'SE' | 'SW' }

/** Pinta o buffer e os bonecos no canvas (tamanho lógico; o CSS escala por inteiro). */
/** `front` (R31 POL): o que fica na frente das pessoas (mesa, balcão, vidro) — pintado depois dos bonecos. */
export function drawScene27(canvas: HTMLCanvasElement, px: Px, year: number, who: Who27[], front?: Px): void {
  canvas.width = px.w; canvas.height = px.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(px.w, px.h);
  new Uint32Array(img.data.buffer).set(px.d);
  ctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  for (const w of [...who].sort((a, b) => a.y - b.y)) {
    try {
      const sp = avatarSprite(lookOf(w.p), { year, role: w.p.role, pose: w.pose, dir: w.dir ?? 'SE' });
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.fillRect(w.x - 6, w.y, 12, 1);
      ctx.drawImage(sp.c, w.x - sp.ax, w.y - sp.ay + 1);
    } catch { /* avatar opcional */ }
  }
  if (front && typeof document !== 'undefined') {
    const fc = document.createElement('canvas'); fc.width = front.w; fc.height = front.h;
    const f2 = fc.getContext('2d');
    if (f2) { const im = f2.createImageData(front.w, front.h); new Uint32Array(im.data.buffer).set(front.d); f2.putImageData(im, 0, 0); ctx.drawImage(fc, 0, 0); }
  }
}

export const kindColor27 = (k: string): string => KIND_COL[k] ?? '#cccccc';
export type { Col };
