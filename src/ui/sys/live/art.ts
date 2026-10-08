// Pixel art do sistema "live": quadrados do terreno do festival, público e balões.

import { C, Px, shade, type Col } from '../../pixel/px';
import type { FestTile } from '../../../sim/sys/live';

const cache: Record<string, string> = {};

const GRASS = C('#5f9a48');
const GRASS2 = C('#4f8a3c');

function grass(p: Px): void {
  p.fill((x, y) => ((x * 7 + y * 3) % 5 === 0 ? GRASS2 : GRASS));
}

/** Desenha um quadrado 16×16 do terreno. */
export function drawTile(p: Px, ox: number, oy: number, tile: FestTile): void {
  const r = (x: number, y: number, w: number, h: number, c: Col) => p.rect(ox + x, oy + y, w, h, c);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.put(ox + x, oy + y, (x * 7 + y * 3 + ox + oy) % 5 === 0 ? GRASS2 : GRASS);
  switch (tile) {
    case 'stage':
      r(1, 5, 14, 9, C('#3a2a2a'));
      r(1, 3, 14, 2, C('#c04848'));
      r(2, 1, 1, 4, C('#888888'));
      r(13, 1, 1, 4, C('#888888'));
      r(4, 7, 2, 2, C('#f0c040'));
      r(10, 7, 2, 2, C('#f0c040'));
      r(7, 9, 2, 4, C('#e0e0e0'));
      break;
    case 'gate':
      r(0, 6, 16, 4, C('#9a6034'));
      r(5, 4, 6, 8, C('#e0b040'));
      r(6, 6, 4, 6, C('#2a2628'));
      break;
    case 'toilet':
      for (let i = 0; i < 3; i++) {
        r(1 + i * 5, 3, 4, 10, C('#4a8ae0'));
        r(2 + i * 5, 5, 2, 2, C('#cfe4ff'));
        r(1 + i * 5, 3, 4, 1, shade(C('#4a8ae0'), 0.7));
      }
      break;
    case 'food':
      r(1, 6, 14, 8, C('#f0e0c0'));
      r(1, 3, 14, 3, C('#f08a2c'));
      for (let i = 0; i < 7; i++) r(1 + i * 2, 3, 1, 3, C('#f8f4ec'));
      r(5, 9, 6, 2, C('#9a6034'));
      break;
    case 'bar':
      r(1, 6, 14, 8, C('#5e3a1e'));
      r(1, 3, 14, 3, C('#a05ad0'));
      r(3, 8, 2, 4, C('#48b85c'));
      r(7, 8, 2, 4, C('#f0c040'));
      r(11, 8, 2, 4, C('#e04848'));
      break;
    case 'camp':
      for (const [x, y, c] of [[1, 2, '#48b85c'], [9, 4, '#e04848'], [3, 9, '#4a8ae0'], [10, 10, '#f0c040']] as [number, number, string][]) {
        p.poly([[ox + x, oy + y + 5], [ox + x + 3, oy + y], [ox + x + 6, oy + y + 5]], C(c));
      }
      break;
    case 'security':
      r(4, 2, 8, 12, C('#2a2a30'));
      r(6, 3, 4, 3, C('#f0c8a0'));
      r(5, 7, 6, 2, C('#f0c040'));
      break;
    case 'medic':
      r(2, 3, 12, 10, C('#f8f4ec'));
      r(7, 4, 2, 8, C('#e04848'));
      r(4, 7, 8, 2, C('#e04848'));
      break;
    case 'merch':
      r(2, 4, 12, 9, C('#2ec8c0'));
      r(5, 6, 6, 5, C('#f8f4ec'));
      r(4, 6, 2, 2, C('#f8f4ec'));
      r(10, 6, 2, 2, C('#f8f4ec'));
      break;
    default:
      break;
  }
}

/** Data URL de um quadrado (cache). */
export function tileUrl(tile: FestTile): string {
  const k = tile || 'free';
  if (cache[k]) return cache[k];
  const p = new Px(16, 16);
  if (!tile) grass(p);
  else drawTile(p, 0, 0, tile);
  try {
    cache[k] = p.canvas().toDataURL();
  } catch {
    cache[k] = '';
  }
  return cache[k];
}

const SHIRTS = ['#e04848', '#4a8ae0', '#f0c040', '#48b85c', '#a05ad0', '#f08a2c', '#f8f4ec', '#2a2a30'].map((x) => C(x));
const SKINS = ['#f6d3b3', '#e0aa7e', '#a8714a', '#6e4528'].map((x) => C(x));

/** Uma pessoa minúscula (3×5) do público. */
export function drawPerson(p: Px, x: number, y: number, seed: number, arms = false): void {
  const shirt = SHIRTS[seed % SHIRTS.length];
  const skin = SKINS[(seed >> 3) % SKINS.length];
  p.put(x + 1, y, skin);
  p.rect(x, y + 1, 3, 2, shirt);
  p.put(x, y + 3, C('#2a2628'));
  p.put(x + 2, y + 3, C('#2a2628'));
  if (arms) {
    p.put(x - 1, y, skin);
    p.put(x + 3, y, skin);
  }
}
