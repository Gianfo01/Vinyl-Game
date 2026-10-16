// R31 · onda 2 (V) — salas das cenas de mecânica em pixel art (estilo antigo do jogo: paleta da era, contorno INK,
// relevo pela silhueta, pontilhado). Mesmo tamanho lógico das cenas da rodada 27 (200×92) e os mesmos bonecos
// (avatarSprite via drawScene27). PURO: só Px.
//   table     — a mesa de negociação/renovação (paintTable27, sem cartas)
//   office    — a sua sala: mesa, janela, arquivo e a parede de vidro por onde a equipe assiste
//   rehearsal — sala de ensaio: espuma, amplificadores, bateria e tapete

import { paintTable27, W27, H27 } from '../act27/scene27';
import { paletteOf, type Palette } from '../pixel/palette';
import { C, INK, Px, dith, inked, mix, noise, shade } from '../pixel/px';
import type { Room31 } from './scene31core';

function room(p: Px, pal: Palette, floorY: number, kind: 'office' | 'studio' | 'lounge'): void {
  const fl = pal.floors[kind];
  p.fill((x, y) => (y < floorY ? shade(x % 12 < 6 ? pal.wall : mix(pal.wall, pal.wall2, 0.15), 0.04 - y / floorY * 0.12 + (noise(x >> 2, y >> 2, 11) - 0.5) * 0.02) : ((x >> 3) + (y >> 2)) % 2 ? fl.a : fl.b));
  p.hline(0, p.w - 1, floorY - 1, pal.trim);
  p.hline(0, p.w - 1, floorY, shade(pal.trim, -0.3));
}

/** A sua sala: janela com a cidade, mesa com papéis e telefone, arquivo, quadro e a parede de vidro (à direita). */
export function paintOffice31(year: number, glass = true): Px {
  const pal = paletteOf(year);
  const p = new Px(W27, H27);
  room(p, pal, 60, 'office');
  // janela
  p.rect(10, 10, 36, 26, pal.outline); p.rect(11, 11, 34, 24, mix(pal.sky, C('#9fc4e8'), 0.35));
  for (let i = 0; i < 7; i++) { const x = 12 + i * 5, hh = 5 + ((i * 7) % 11); p.rect(x, 35 - hh, 4, hh, shade(pal.outline, 0.55)); }
  p.vline(28, 11, 34, pal.outline); p.hline(11, 44, 23, pal.outline);
  // quadro (disco de ouro) na parede
  p.rect(56, 12, 18, 20, pal.woodDark); p.rect(57, 13, 16, 18, shade(pal.wall2, -0.2)); p.disc(65, 21, 6, pal.gold); p.disc(65, 21, 1, pal.outline);
  // parede de vidro da equipe
  if (glass) {
    p.rect(132, 0, 68, 60, shade(pal.wall, -0.15));
    p.rect(136, 6, 60, 46, pal.outline); p.rect(137, 7, 58, 44, mix(pal.glass, C('#dfeaf0'), 0.3));
    p.fill((x, y) => (dith(x, y, 0.25) && (x + y) % 9 === 0 ? mix(p.get(x, y), C('#ffffff'), 0.4) : p.get(x, y)), 137, 7, 58, 44);
    p.vline(166, 7, 50, pal.outline);
  }
  inked(p, (q) => {
    // arquivo
    q.rect(80, 30, 14, 30, pal.metalDark); for (let i = 0; i < 3; i++) { q.rect(81, 32 + i * 9, 12, 8, pal.metal); q.hline(85, 89, 35 + i * 9, pal.outline); }
    // mesa do chefe (tampo em perspectiva), papéis, telefone e luminária
    q.poly([[34, 62], [118, 62], [126, 72], [26, 72]], pal.wood);
    q.hline(26, 126, 72, pal.woodDark); q.rect(26, 73, 100, 3, shade(pal.woodDark, -0.2));
    q.rect(30, 76, 4, 13, pal.woodDark); q.rect(118, 76, 4, 13, pal.woodDark);
    q.poly([[60, 64], [74, 63], [76, 69], [62, 70]], pal.paper);
    q.rect(96, 63, 10, 5, pal.outline); q.rect(97, 62, 8, 2, pal.accent2);
    q.vline(44, 54, 63, pal.metalDark); q.poly([[38, 54], [50, 54], [47, 50], [41, 50]], pal.accent);
  }, INK, { relief: true });
  return p;
}

/** Sala de ensaio: espuma, amplificadores, bateria simples, tapete. */
export function paintRehearsal31(year: number): Px {
  const pal = paletteOf(year);
  const p = new Px(W27, H27);
  room(p, pal, 62, 'studio');
  const foam = mix(pal.fabric, C('#3a3f4a'), 0.5);
  for (let y = 6; y < 54; y += 6) for (let x = 4; x < 196; x += 6) { p.rect(x, y, 5, 5, ((x + y) >> 1) % 2 ? shade(foam, -0.12) : foam); p.hline(x, x + 4, y, shade(foam, 0.15)); }
  p.ellipse(100, 76, 70, 10, shade(pal.fabric2, -0.1));
  inked(p, (q) => {
    // amplificadores
    q.rect(10, 44, 20, 18, pal.outline); q.rect(11, 45, 18, 16, pal.woodDark); q.rect(13, 48, 14, 10, shade(pal.fabric, -0.45));
    q.rect(170, 40, 22, 22, pal.outline); q.rect(171, 41, 20, 20, pal.woodDark); q.rect(173, 44, 16, 14, shade(pal.fabric, -0.45));
    // bateria (fundo, no meio)
    q.ellipse(100, 58, 9, 6, pal.accent2); q.ellipse(100, 56, 9, 2, shade(pal.accent2, 0.3));
    q.ellipse(84, 52, 5, 2, mix(pal.gold, pal.metal, 0.4)); q.vline(84, 52, 62, pal.metalDark);
    q.ellipse(116, 50, 6, 2, mix(pal.gold, pal.metal, 0.4)); q.vline(116, 50, 62, pal.metalDark);
    // pedestal de microfone
    q.vline(60, 40, 70, pal.metalDark); q.rect(58, 36, 5, 5, pal.metal); q.hline(56, 64, 70, pal.metalDark);
  }, INK, { relief: true });
  return p;
}

export function paintRoom31(room: Room31, year: number, glass = true): Px {
  return room === 'table' ? paintTable27(year, [], 0) : room === 'office' ? paintOffice31(year, glass) : paintRehearsal31(year);
}

/** Onde cada um fica: x,y no pé do boneco; pose e direção. `you` à esquerda, a outra parte à direita, quem assiste atrás do vidro. */
export interface Spot31 { x: number; y: number; pose: 'stand' | 'sit'; dir: 'SE' | 'SW' }
export function spots31(room: Room31, sides: ('you' | 'them' | 'watch')[]): Spot31[] {
  let nThem = 0, nWatch = 0;
  return sides.map((sd) => {
    if (room === 'table') {
      if (sd === 'you') return { x: 56, y: 66, pose: 'sit', dir: 'SE' };
      if (sd === 'them') { const i = nThem++; return { x: 140 + i * 18, y: 66 - i * 6, pose: 'sit', dir: 'SW' }; }
      const i = nWatch++; return { x: 176 - i * 12, y: 56, pose: 'stand', dir: 'SW' };
    }
    if (room === 'office') {
      if (sd === 'you') return { x: 70, y: 70, pose: 'sit', dir: 'SE' };
      if (sd === 'them') { const i = nThem++; return { x: 112 + i * 14, y: 84 - i * 4, pose: 'stand', dir: 'SW' }; }
      const i = nWatch++; return { x: 148 + i * 14, y: 50, pose: 'stand', dir: 'SW' };
    }
    if (sd === 'you') return { x: 40, y: 84, pose: 'stand', dir: 'SE' };
    const i = nThem++ + nWatch;
    return { x: 72 + (i % 5) * 26, y: 78 - (i % 2) * 6, pose: 'stand', dir: i % 2 ? 'SW' : 'SE' };
  });
}
