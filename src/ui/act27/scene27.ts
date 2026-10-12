// r27 (M1) — cenas em pixel art das atividades de criação: a mesa de composição (cartas na mesa, parceiros
// sentados) e o estúdio (sala de gravação + técnica atrás do vidro, luz de REC). Mesmo estilo da Sede em corte
// (hqpx27): paleta da era, contorno, pontilhado; os bonecos são os avatares reais das pessoas (avatarSprite).
// paintTable27/paintStudio27 são PURAS (só Px); drawScene27 pinta no <canvas> (escala inteira por CSS).

import type { Person } from '../../sim/types';
import { avatarSprite, lookOf, type Pose } from '../pixel/avatar';
import { paletteOf, type Palette } from '../pixel/palette';
import { C, Px, dith, mix, noise, shade, type Col } from '../pixel/px';

export const W27 = 200;
export const H27 = 92;
const KIND_COL: Record<string, string> = { hook: '#e8b04a', lyric: '#7fb6e8', harmony: '#b58be0', rhythm: '#e07a5f', special: '#7fd18a' };

function room(p: Px, pal: Palette, floorY: number, kind: 'lounge' | 'studio' | 'control'): void {
  const fl = pal.floors[kind];
  // parede com listras discretas (papel de parede) e um leve gradiente; piso da sala
  p.fill((x, y) => (y < floorY ? shade(x % 10 < 5 ? pal.wall : mix(pal.wall, pal.wall2, 0.18), 0.04 - y / floorY * 0.12 + (noise(x >> 2, y >> 2, 7) - 0.5) * 0.02) : ((x >> 3) + (y >> 2)) % 2 ? fl.a : fl.b));
  p.hline(0, p.w - 1, floorY - 1, pal.trim);
  p.hline(0, p.w - 1, floorY, shade(pal.trim, -0.3));
  p.rect(0, floorY - 6, p.w, 1, pal.wall2);
}

/** Mesa de composição: n cartas jogadas (cores por tipo), luminária, violão encostado, quadro na parede. */
export function paintTable27(year: number, played: string[] = [], seed = 0): Px {
  const pal = paletteOf(year);
  const p = new Px(W27, H27);
  room(p, pal, 58, 'lounge');
  // janela com a cidade à noite
  p.rect(14, 10, 34, 24, pal.outline); p.rect(15, 11, 32, 22, mix(pal.sky, C('#0b1430'), 0.5));
  for (let i = 0; i < 9; i++) { const x = 16 + ((i * 7 + seed) % 30), h = 4 + ((i * 5 + seed) % 9); p.rect(x, 33 - h, 3, h, shade(pal.outline, 0.6)); if (i % 2) p.set(x + 1, 33 - h + 2, pal.lamp); }
  p.vline(31, 11, 32, pal.outline); p.hline(15, 46, 22, pal.outline);
  // quadro de cortiça com papéis
  p.rect(150, 12, 36, 22, pal.woodDark); p.rect(151, 13, 34, 20, mix(pal.wood, C('#c8a165'), 0.5));
  for (let i = 0; i < 5; i++) p.rect(153 + i * 6, 15 + (i % 2) * 6, 5, 7, i % 2 ? pal.paper : shade(pal.paper, -0.1));
  // luminária pendente
  p.vline(100, 0, 14, pal.outline); p.poly([[92, 20], [108, 20], [104, 14], [96, 14]], pal.metalDark); p.hline(93, 107, 20, pal.lamp);
  p.fill((x, y) => { const d = Math.hypot((x - 100) / 1.6, y - 50); return d < 34 && dith(x, y, 0.5 - d / 80) ? mix(p.get(x, y), pal.lamp, 0.12) : p.get(x, y); }, 50, 20, 100, 60);
  // violão encostado
  p.ellipse(176, 70, 6, 8, pal.wood); p.ellipse(176, 60, 4, 5, pal.wood); p.disc(176, 66, 1, pal.outline); p.rect(175, 38, 2, 22, pal.woodDark);
  // mesa (tampo em perspectiva) e pernas
  p.poly([[52, 58], [148, 58], [160, 72], [40, 72]], pal.wood);
  p.hline(40, 160, 72, pal.woodDark); p.rect(40, 73, 120, 3, shade(pal.woodDark, -0.2));
  p.rect(46, 76, 4, 14, pal.woodDark); p.rect(150, 76, 4, 14, pal.woodDark);
  // papel, caneta e xícara
  p.poly([[60, 61], [74, 60], [76, 68], [62, 69]], pal.paper); p.line(64, 63, 72, 62, shade(pal.paper, -0.4)); p.line(64, 65, 70, 65, shade(pal.paper, -0.4));
  p.rect(130, 61, 6, 5, pal.paper); p.rect(136, 62, 2, 2, pal.paper);
  // cartas jogadas (leque no centro)
  played.slice(-8).forEach((k, i) => {
    const x = 82 + i * 5, y = 61 + (i % 2);
    p.rect(x - 1, y - 1, 10, 9, pal.outline); p.rect(x, y, 8, 7, C(KIND_COL[k] ?? '#cccccc')); p.rect(x + 1, y + 1, 6, 1, shade(C(KIND_COL[k] ?? '#cccccc'), 0.25));
  });
  return p;
}

/** Estúdio: sala de gravação (esquerda) e técnica atrás do vidro (direita); `rec` acende a luz vermelha. */
export function paintStudio27(year: number, rec = false): Px {
  const pal = paletteOf(year);
  const p = new Px(W27, H27);
  room(p, pal, 62, 'studio');
  // espuma acústica na sala
  const foam = mix(pal.fabric, C('#3a3f4a'), 0.55);
  for (let y = 6; y < 50; y += 6) for (let x = 4; x < 118; x += 6) { p.rect(x, y, 5, 5, ((x + y) >> 1) % 2 ? shade(foam, -0.12) : foam); p.hline(x, x + 4, y, shade(foam, 0.15)); }
  // parede da técnica com vidro
  p.rect(122, 0, 78, 62, shade(pal.wall, -0.2));
  p.rect(126, 12, 70, 30, pal.outline); p.rect(127, 13, 68, 28, mix(pal.glass, C('#0e1a2a'), 0.55));
  p.line(130, 16, 140, 26, mix(pal.glass, C('#ffffff'), 0.4));
  // mesa de som atrás do vidro
  p.rect(130, 32, 62, 8, pal.metalDark);
  for (let i = 0; i < 14; i++) p.vline(133 + i * 4, 33, 38 - ((i * 3) % 4), (i % 4) ? pal.metal : pal.accent);
  // luz de REC
  p.rect(150, 4, 22, 7, pal.outline); p.rect(151, 5, 20, 5, rec ? C('#d83a3a') : C('#4a1f1f'));
  // tapete, microfone, amplificador, bateria simples
  p.ellipse(60, 74, 44, 9, shade(pal.fabric2, -0.1));
  p.vline(40, 34, 70, pal.metalDark); p.rect(38, 30, 5, 6, pal.metal); p.hline(36, 44, 70, pal.metalDark);
  p.rect(96, 52, 16, 14, pal.outline); p.rect(97, 53, 14, 12, pal.woodDark); p.rect(99, 55, 10, 8, shade(pal.fabric, -0.4));
  p.ellipse(20, 70, 8, 4, pal.metal); p.ellipse(20, 62, 6, 3, mix(pal.gold, pal.metal, 0.4)); p.vline(20, 58, 70, pal.metalDark);
  p.rect(0, 62, p.w, 1, shade(pal.trim, -0.2));
  return p;
}

export interface Who27 { p: Pick<Person, 'id' | 'role' | 'look' | 'born'>; x: number; y: number; pose: Pose; dir?: 'SE' | 'SW' }

/** Pinta o buffer e os bonecos no canvas (tamanho lógico; o CSS escala por inteiro). */
export function drawScene27(canvas: HTMLCanvasElement, px: Px, year: number, who: Who27[]): void {
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
}

export const kindColor27 = (k: string): string => KIND_COL[k] ?? '#cccccc';
export type { Col };
