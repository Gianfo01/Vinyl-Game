// Pisos (sombreados no espaço do mundo, sem repetição visível), chão externo, segmentos de
// parede isométricos e decalques de parede (janelas, cartazes, discos emoldurados, espuma…).

import { drawText, textWidth } from './font';
import { PALETTES, eraIndex, type EraId, type FloorKind, type Palette } from './palette';
import { C, Px, dith, mix, noise, shade, withAlpha, type Col, type Sprite } from './px';

/** Cor do piso num ponto do mundo (unidades: 16 por tile). */
export function floorAt(kind: FloorKind, a: Col, b: Col, gx: number, gy: number, seed = 0): Col {
  const x = Math.floor(gx);
  const y = Math.floor(gy);
  switch (kind) {
    case 'parquet': {
      const bx = Math.floor(x / 8);
      const by = Math.floor(y / 8);
      const horiz = (bx + by) % 2 === 0;
      const lx = ((x % 8) + 8) % 8;
      const ly = ((y % 8) + 8) % 8;
      const plank = horiz ? Math.floor(ly / 2) : Math.floor(lx / 2);
      const seam = horiz ? ly % 2 === 1 && lx === 7 : lx % 2 === 1 && ly === 7;
      if ((horiz ? lx : ly) === 0) return shade(a, -0.3);
      const base = (plank + bx + by) % 2 ? a : b;
      return seam ? shade(base, -0.2) : noise(x, y, seed) > 0.9 ? shade(base, -0.1) : base;
    }
    case 'wood': {
      const row = Math.floor(y / 4);
      const off = Math.floor(noise(row, 0, seed + 3) * 40);
      const plank = Math.floor((x + off) / 40);
      if (((y % 4) + 4) % 4 === 3) return shade(a, -0.28);
      if (((x + off) % 40 + 40) % 40 === 0) return shade(a, -0.25);
      const base = noise(row, plank, seed) > 0.5 ? a : b;
      const grain = noise(Math.floor(x / 3), y, seed + 9);
      return grain > 0.88 ? shade(base, -0.12) : grain < 0.05 ? shade(base, 0.08) : base;
    }
    case 'carpet': {
      const n = noise(x, y, seed);
      return n > 0.75 ? b : n < 0.08 ? shade(a, 0.08) : a;
    }
    case 'shag': {
      const n = noise(x, y, seed);
      return n > 0.6 ? b : n < 0.18 ? shade(a, 0.14) : n > 0.9 ? shade(b, -0.15) : a;
    }
    case 'checker': {
      const c = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? a : b;
      return noise(x, y, seed) > 0.95 ? shade(c, -0.06) : c;
    }
    case 'concrete': {
      const n = noise(x, y, seed);
      if (((x % 32) + 32) % 32 === 0 || ((y % 32) + 32) % 32 === 0) return shade(a, -0.15);
      return n > 0.85 ? b : n < 0.06 ? shade(a, 0.08) : a;
    }
    case 'tiles': {
      if (((x % 16) + 16) % 16 === 0 || ((y % 16) + 16) % 16 === 0) return shade(b, -0.18);
      return (Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? a : mix(a, b, 0.5);
    }
    case 'glow': {
      const onLine = ((x % 16) + 16) % 16 === 0 || ((y % 16) + 16) % 16 === 0;
      if (onLine) return mix(a, C('#2ee8d8'), (x + y) % 6 < 3 ? 0.55 : 0.35);
      const near = ((x % 16) + 16) % 16 === 1 || ((y % 16) + 16) % 16 === 1;
      return near && dith(x, y, 0.5) ? mix(a, C('#2ee8d8'), 0.18) : a;
    }
    case 'rubber': {
      return (x % 4 === 0 && y % 4 === 0) ? shade(a, 0.12) : a;
    }
  }
  return a;
}

/** Tapete (retângulo com borda e padrão por era) em coordenadas locais (0..w, 0..h unidades). */
export function rugAt(pal: Palette, u: number, v: number, w: number, h: number, seed: number): Col {
  const e = pal.era;
  const base = e === '1920' ? C('#8a2e2a') : e === '1950' ? C('#6cc3b5') : e === '1960' ? C('#c8862a') : e === '1980' ? C('#3a2a6a') : e === '1990' ? C('#5a3a3a') : e === '2000' ? C('#b8763a') : e === '2010' ? C('#d8d4cc') : e === '2020' ? C('#c86e4a') : C('#1e4a56');
  const border = shade(base, -0.3);
  const x = Math.floor(u);
  const y = Math.floor(v);
  if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) return (x + y) % 2 ? border : shade(border, 0.1);
  if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) return shade(base, 0.25);
  if (e === '1920' || e === '1990') return (Math.abs(x - w / 2) + Math.abs(y - h / 2)) % 8 < 2 ? shade(base, 0.3) : base;
  if (e === '1960') return Math.floor(Math.hypot(x - w / 2, (y - h / 2)) / 3) % 2 ? base : C('#e8b84a');
  if (e === '1980') return (x + y) % 10 < 2 ? C('#ff4fa3') : (x - y + 100) % 10 < 1 ? C('#35e0e0') : base;
  if (e === '2030') return (x + y) % 8 === 0 ? withAlpha(C('#5ffff0'), 255) : base;
  return noise(x, y, seed) > 0.92 ? shade(base, -0.1) : base;
}

/** Chão externo em volta do prédio. */
export function groundAt(pal: Palette, gx: number, gy: number): Col {
  const x = Math.floor(gx);
  const y = Math.floor(gy);
  const [a, b] = pal.ground;
  switch (pal.groundKind) {
    case 'cobble': {
      const cx = Math.floor((x + (Math.floor(y / 5) % 2) * 3) / 6);
      const cy = Math.floor(y / 5);
      const lx = ((x + (Math.floor(y / 5) % 2) * 3) % 6 + 6) % 6;
      const ly = ((y % 5) + 5) % 5;
      if (lx === 0 || ly === 0) return shade(b, -0.3);
      return noise(cx, cy, 5) > 0.5 ? a : b;
    }
    case 'sidewalk':
      if (((x % 24) + 24) % 24 === 0 || ((y % 24) + 24) % 24 === 0) return shade(b, -0.15);
      return noise(x, y, 2) > 0.9 ? b : a;
    case 'asphalt':
      return noise(x, y, 4) > 0.7 ? b : noise(x, y, 8) > 0.97 ? shade(a, 0.2) : a;
    case 'grass': {
      const n = noise(x, y, 6);
      return n > 0.8 ? shade(a, 0.15) : n < 0.3 ? b : a;
    }
    case 'plaza':
      if (((x % 32) + 32) % 32 === 0 || ((y % 32) + 32) % 32 === 0) return pal.era === '2030' ? mix(a, C('#2ee8d8'), 0.4) : shade(b, -0.12);
      return (Math.floor(x / 32) + Math.floor(y / 32)) % 2 ? a : b;
  }
  return a;
}

// ---------- paredes ----------

export const WALL_H = 40;
export const LOW_H = 15;

export type WallOrient = 'x' | 'y'; // x: corre ao longo de gx (borda gy = k); y: ao longo de gy
export type WallStyle = 'back' | 'low' | 'glass' | 'lip' | 'post';

function wallTex(pal: Palette, u: number, v: number, H: number): Col {
  const x = Math.floor(u);
  const z = Math.floor(v);
  if (z < 2) return pal.trim;
  if (z >= H - 1) return shade(pal.trim, 0.15);
  const w = pal.wall;
  const w2 = pal.wall2;
  switch (pal.wallKind) {
    case 'wainscot':
      if (z < 14) return z === 13 ? pal.trim : x % 8 === 0 || z === 3 ? shade(w2, -0.2) : x % 8 === 1 ? shade(w2, 0.12) : w2;
      if (z === 14) return shade(pal.trim, 0.2);
      return x % 4 === 0 ? shade(w, -0.06) : w;
    case 'paper':
      if (z < 4) return pal.trim;
      return ((x + z) % 8 === 0 || (x - z + 64) % 8 === 0) && z % 2 === 0 ? w2 : w;
    case 'panel':
      if (z > H - 5) return shade(w, 0.25);
      return x % 4 === 0 ? shade(w2, -0.2) : noise(x, Math.floor(z / 6), 3) > 0.6 ? w2 : w;
    case 'plain':
      if (pal.era === '1980' && (z === 20 || z === 21)) return z === 20 ? w2 : shade(w2, -0.3);
      if (pal.era === '1990' && z === 16) return w2;
      if (pal.era === '2000' && z >= 14 && z < 17) return w2;
      if (pal.era === '2020' && z === H - 4) return withAlpha(pal.accent, 255);
      return w;
    case 'brick': {
      const row = Math.floor(z / 3);
      const off = row % 2 ? 4 : 0;
      if (z % 3 === 0 || (x + off) % 8 === 0) return w2;
      return noise(Math.floor((x + off) / 8), row, 1) > 0.8 ? shade(w, -0.04) : w;
    }
    case 'glass':
      if (z % 9 === 0) return mix(w, w2, 0.6);
      return x % 16 === 0 ? shade(w, 0.15) : w;
    case 'tile':
      return x % 4 === 0 || z % 4 === 0 ? w2 : w;
  }
  return w;
}

const wallCache = new Map<string, Sprite>();

/**
 * Segmento de parede de 1 tile. A âncora é o canto de trás da caixa no chão:
 * - back 'x' : caixa gx∈[0,16], gy∈[-4,0] (parede do fundo, à direita)
 * - back 'y' : caixa gx∈[-4,0], gy∈[0,16]
 * - low/glass/lip 'x': gy∈[-2,2] centrada na borda; 'y': gx∈[-2,2]
 * - post: pilar 4×4 centrado no vértice.
 */
export function wallSprite(era: EraId, orient: WallOrient, style: WallStyle, end = false): Sprite {
  const key = `${era}|${orient}|${style}|${end ? 1 : 0}`;
  const hit = wallCache.get(key);
  if (hit) return hit;
  const pal = PALETTES[era];
  const H = style === 'back' ? WALL_H : style === 'lip' ? 4 : style === 'post' ? LOW_H + 1 : style === 'glass' ? 30 : LOW_H;
  const T = 4;
  const W = style === 'post' ? T : orient === 'x' ? 16 : T;
  const Dd = style === 'post' ? T : orient === 'x' ? T : 16;
  const ox = Dd + 2;
  const oy = H + 2;
  const p = new Px(W + Dd + 4, H + (W + Dd) / 2 + 4);
  const cap = shade(pal.trim, 0.12);
  if (style === 'back') {
    const inner = (u: number, v: number) => wallTex(pal, u, v, H);
    const outer = (_u: number, v: number) => (v >= H - 1 ? cap : shade(pal.trim, -0.1));
    if (orient === 'x') p.box(ox, oy, W, Dd, H, { left: inner, right: end ? outer : undefined, top: () => cap });
    else p.box(ox, oy, W, Dd, H, { right: (u, v) => shade(inner(u, v), -0.1), left: end ? outer : undefined, top: () => cap });
  } else if (style === 'glass') {
    const low = LOW_H - 4;
    const wallC = (u: number, v: number) => (v < 2 ? pal.trim : v >= low - 1 ? cap : pal.era === '1920' ? pal.wall2 : pal.wall);
    p.box(ox, oy, W, Dd, low, { left: wallC, right: (u, v) => shade(wallC(u, v), -0.15), top: () => cap });
    const gl = withAlpha(mix(pal.glass, C('#ffffff'), 0.15), 85);
    const frame = shade(pal.trim, 0.05);
    const glass = (u: number, v: number) => (v >= H - low - 2 ? frame : (Math.floor(u) + Math.floor(v)) % 11 === 0 ? withAlpha(C('#ffffff'), 140) : gl);
    p.box(ox + (orient === 'x' ? 0 : 1), oy - low + (orient === 'x' ? 1 : 0.5), orient === 'x' ? W : 2, orient === 'x' ? 2 : Dd, H - low, { left: glass, right: glass, top: () => frame });
  } else {
    const isLow = style === 'low' || style === 'post';
    const lowCap = mix(pal.wall, C('#ffffff'), 0.28);
    const face = (u: number, v: number) => {
      if (v < 2) return pal.trim;
      if (v >= H - 1) return isLow ? shade(lowCap, -0.1) : cap;
      if (isLow && pal.wallKind === 'wainscot') return Math.floor(u) % 8 === 0 ? shade(pal.wall2, -0.2) : pal.wall2;
      if (isLow && pal.wallKind === 'brick') return wallTex(pal, u, v, WALL_H);
      if (isLow && pal.wallKind === 'panel') return Math.floor(u) % 4 === 0 ? shade(pal.wall2, -0.2) : pal.wall;
      return style === 'lip' ? shade(pal.trim, 0.05) : pal.wall;
    };
    p.box(ox, oy, W, Dd, H, { left: face, right: (u, v) => shade(face(u, v), -0.16), top: () => (isLow ? lowCap : cap) });
  }
  p.outline(withAlpha(pal.outline, 200));
  const sp: Sprite = { c: p.canvas(), ax: ox, ay: oy };
  wallCache.set(key, sp);
  return sp;
}

// ---------- decalques de parede (imagens planas, depois cisalhadas) ----------

export type DecalKind = 'window' | 'disc_gold' | 'disc_platinum' | 'awards' | 'clock' | 'cork' | 'whiteboard' | 'foam' | 'photo' | 'chart' | 'pegboard' | 'garage_door' | 'door' | 'onair' | 'onair_lit' | 'calendar' | 'neon' | 'speaker_wall' | 'tvwall';

const decalCache = new Map<string, Px>();

export function decalPx(kind: DecalKind, era: EraId, variant = 0, text = ''): Px {
  const key = `${kind}|${era}|${variant}|${text}`;
  const hit = decalCache.get(key);
  if (hit) return hit;
  const pal = PALETTES[era];
  const e = eraIndex(era);
  let p: Px;
  switch (kind) {
    case 'window': {
      const w = e >= 6 ? 14 : 12;
      const h = e >= 6 ? 24 : 18;
      p = new Px(w, h);
      const frame = e === 6 ? C('#26262a') : e === 8 ? C('#2ee8d8') : pal.trim;
      const sky = pal.sky;
      p.fill((x, y) => {
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) return frame;
        if (e <= 1 && (x === Math.floor(w / 2) || y === Math.floor(h / 2))) return frame;
        if (e === 6 && (x % 5 === 0 || y % 6 === 0)) return frame;
        if (e === 8) return y > h - 8 && (x * 3 + y) % 5 < 3 ? mix(sky, C('#e85ac8'), 0.6) : y > h - 6 ? C('#0e2030') : (noise(x, y, 4) > 0.94 ? C('#ffffff') : sky);
        const refl = (x + y) % 9 === 0 || (x + y) % 9 === 1;
        const c = mix(sky, C('#ffffff'), y / h * 0.3);
        return refl ? mix(c, C('#ffffff'), 0.5) : c;
      });
      if (e <= 2) p.hline(-1, w, h, shade(pal.trim, 0.2));
      break;
    }
    case 'disc_gold':
    case 'disc_platinum': {
      p = new Px(12, 15);
      const wood = e >= 6 ? C('#1e1e22') : pal.woodDark;
      p.rect(0, 0, 12, 15, wood);
      p.rect(1, 1, 10, 13, C('#16141a'));
      const disc = kind === 'disc_gold' ? pal.gold : C('#dfe6ee');
      p.disc(6, 6, 4, (_x, _y, d) => (d < 1.4 ? C('#f4f0e6') : Math.floor(d * 1.5) % 2 ? disc : shade(disc, -0.15)));
      p.set(4, 4, C('#ffffff'));
      p.rect(3, 11, 6, 2, kind === 'disc_gold' ? shade(pal.gold, -0.3) : C('#9aa0a8'));
      break;
    }
    case 'awards': {
      p = new Px(16, 12);
      const shelf = pal.woodDark;
      p.rect(0, 10, 16, 2, shelf);
      const n = Math.max(0, Math.min(4, variant));
      for (let i = 0; i < n; i++) {
        const x = 1 + i * 4;
        p.rect(x, 8, 3, 2, C('#3a2a1a'));
        p.vline(x + 1, 4, 7, pal.gold);
        p.rect(x, 2, 3, 2, pal.gold);
        p.put(x + 2, 1, pal.gold);
        p.put(x + 2, 0, pal.gold);
        p.put(x, 2, C('#fff2b0'));
      }
      break;
    }
    case 'clock': {
      p = new Px(8, 8);
      p.disc(4, 4, 3.6, pal.trim);
      p.disc(4, 4, 2.7, C('#f4f0e6'));
      p.vline(4, 2, 4, C('#1a1a1a'));
      p.hline(4, 5, 4, C('#1a1a1a'));
      break;
    }
    case 'cork': {
      p = new Px(16, 11);
      p.fill((x, y) => (x === 0 || y === 0 || x === 15 || y === 10 ? pal.woodDark : noise(x, y, 2) > 0.7 ? C('#a87a48') : C('#c8965a')));
      const notes = [C('#f0e080'), C('#f0a0b8'), C('#a0d8f0'), C('#f4f0e6')];
      for (let i = 0; i < 4; i++) { const x = 2 + i * 3 + (i % 2); const y = 2 + (i % 2) * 3; p.rect(x, y, 3, 3, notes[i]); p.put(x + 1, y, C('#e04848')); }
      break;
    }
    case 'whiteboard': {
      p = new Px(24, 13);
      p.rect(0, 0, 24, 13, C('#9aa0a8'));
      p.rect(1, 1, 22, 10, C('#f4f6f8'));
      for (let i = 0; i < 4; i++) p.hline(3, 3 + 6 + ((i * 5) % 9), 3 + i * 2, [C('#2a5aa0'), C('#c03a2a'), C('#2a8a4a'), C('#2a2a2a')][i]);
      p.line(15, 9, 20, 3, C('#c03a2a'));
      p.rect(2, 11, 20, 1, C('#7a8088'));
      break;
    }
    case 'foam': {
      p = new Px(14, 26);
      if (e === 0) {
        // cortina pesada
        p.fill((x) => (x % 3 === 0 ? shade(C('#6a2a2a'), -0.25) : x % 3 === 1 ? C('#7a2e2a') : shade(C('#7a2e2a'), 0.1)));
        p.hline(0, 13, 0, pal.gold);
      } else if (e >= 7) {
        // painéis hexagonais/feltro coloridos
        const cols = [pal.accent, pal.accent2, shade(pal.wall, 0.2)];
        p.fill((x, y) => {
          const r = Math.floor(y / 6);
          const cIdx = (r + Math.floor((x + (r % 2) * 3) / 6)) % 3;
          return (x + (r % 2) * 3) % 6 === 0 || y % 6 === 0 ? 0 : cols[cIdx];
        });
      } else {
        const foam = e === 1 || e === 2 ? C('#8a7a6a') : e === 3 ? C('#3a3a5a') : C('#3a3a40');
        p.fill((x, y) => {
          const q = Math.floor(x / 7) + Math.floor(y / 7);
          const lx = x % 7;
          const ly = y % 7;
          const peak = q % 2 === 0 ? (lx + ly) % 7 < 3 : (lx + 7 - ly) % 7 < 3;
          return peak ? shade(foam, 0.18) : (lx + ly) % 3 === 0 ? shade(foam, -0.2) : foam;
        });
      }
      break;
    }
    case 'photo': {
      p = new Px(9, 8);
      p.rect(0, 0, 9, 8, pal.woodDark);
      p.fill((x, y) => (e <= 2 ? mix(C('#d8c8a0'), C('#5a4030'), (noise(x, y, variant) + y / 8) / 2) : mix(C('#8ab0d0'), C('#4a6a3a'), y / 8)), 1, 1, 7, 6);
      p.disc(4.5, 4, 1.5, e <= 2 ? C('#3a2818') : C('#e0b090'));
      break;
    }
    case 'chart': {
      p = new Px(14, 11);
      p.rect(0, 0, 14, 11, pal.woodDark);
      p.rect(1, 1, 12, 9, C('#f4f0e6'));
      p.line(2, 8, 5, 6, C('#2a8a4a'));
      p.line(5, 6, 7, 7, C('#2a8a4a'));
      p.line(7, 7, 11, 2, C('#2a8a4a'));
      p.vline(1, 1, 9, C('#9a948a'));
      break;
    }
    case 'pegboard': {
      p = new Px(20, 12);
      p.fill((x, y) => (x % 3 === 1 && y % 3 === 1 ? C('#7a6a52') : C('#b89a6a')));
      p.rect(3, 3, 1, 7, C('#5a5a62'));
      p.rect(2, 2, 3, 2, C('#8a8a92'));
      p.rect(8, 3, 4, 1, C('#c03a2a'));
      p.vline(9, 4, 9, C('#5a5a62'));
      p.rect(14, 2, 4, 6, C('#2a5a3a'));
      break;
    }
    case 'garage_door': {
      p = new Px(28, 30);
      const c = e <= 1 ? pal.wood : C('#b8bcc0');
      p.fill((x, y) => (x === 0 || x === 27 || y === 0 ? shade(c, -0.35) : y % 4 === 0 ? shade(c, -0.2) : y % 4 === 1 ? shade(c, 0.12) : c));
      if (e <= 1) for (let y = 4; y < 28; y += 8) p.line(2, y, 25, y + 6, shade(c, -0.25));
      break;
    }
    case 'door': {
      p = new Px(11, 26);
      const c = e >= 6 ? C('#e8e8e4') : e === 8 ? C('#1e3c48') : pal.wood;
      p.fill((x, y) => (x === 0 || x === 10 || y === 0 ? pal.trim : (x === 2 || x === 8) && y > 2 && y < 24 ? shade(c, -0.12) : y === 12 ? shade(c, -0.12) : c));
      p.put(8, 14, pal.gold);
      if (e === 8) p.vline(5, 2, 24, withAlpha(C('#5ffff0'), 255));
      break;
    }
    case 'onair':
    case 'onair_lit': {
      const lit = kind === 'onair_lit';
      const label = e <= 2 ? 'ON AIR' : 'REC';
      const w = textWidth(label) + 5;
      p = new Px(w, 9);
      p.rect(0, 0, w, 9, C('#2a1a1a'));
      p.rect(1, 1, w - 2, 7, lit ? C('#e83a2a') : C('#5a2a26'));
      if (lit) p.hline(2, w - 3, 1, C('#ff8a6a'));
      drawText(p, label, 3, 2, lit ? C('#fff0e0') : C('#8a5a52'));
      break;
    }
    case 'calendar': {
      p = new Px(7, 9);
      p.rect(0, 0, 7, 9, C('#f4f0e6'));
      p.rect(0, 0, 7, 2, C('#c03a2a'));
      for (let y = 3; y < 9; y += 2) for (let x = 1; x < 7; x += 2) p.put(x, y, C('#7a7470'));
      break;
    }
    case 'neon': {
      const t = text || 'VTN';
      const w = textWidth(t, 1) + 6;
      p = new Px(w, 10);
      const g = variant % 2 ? pal.accent2 : pal.accent;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) drawText(p, t, 3 + dx, 3 + dy, withAlpha(g, 90));
      drawText(p, t, 3, 3, shade(g, 0.55));
      break;
    }
    case 'speaker_wall': {
      p = new Px(8, 10);
      p.rect(0, 0, 8, 10, C('#24222a'));
      p.disc(4, 6.5, 2.6, C('#4a4a52'));
      p.disc(4, 2.5, 1.2, C('#6a6a72'));
      break;
    }
    case 'tvwall': {
      p = new Px(18, 11);
      p.rect(0, 0, 18, 11, C('#1a1a1e'));
      p.fill((x, y) => (e === 8 ? withAlpha(C('#2ee8d8'), 120 + (y % 2) * 60) : mix(C('#2a5aa0'), C('#e08a3a'), y / 11)), 1, 1, 16, 9);
      break;
    }
  }
  decalCache.set(key, p);
  return p;
}
