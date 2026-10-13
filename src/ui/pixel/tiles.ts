// Pisos (sombreados no espaço do mundo, sem repetição visível), chão externo, segmentos de
// parede isométricos e decalques de parede (janelas, cartazes, discos emoldurados, espuma…).

import { drawText, textWidth } from './font';
import { PALETTES, eraIndex, type EraId, type FloorKind, type Palette } from './palette';
import { C, HOUSE, INK, Px, dith, glint, lv, mix, noise, tint, withAlpha, type Col, type Sprite } from './px';

/**
 * Cor do piso num ponto do mundo (unidades: 16 por tile). Estilo do pacote: superfícies limpas em 2–3 tons da
 * rampa, juntas escuras (tom 1) com um fio de luz (tom 4) na borda de cima à esquerda; textura rara e de baixa frequência.
 */
export function floorAt(kind: FloorKind, a: Col, b: Col, gx: number, gy: number, seed = 0): Col {
  const x = Math.floor(gx);
  const y = Math.floor(gy);
  const m = (v: number, k: number) => ((v % k) + k) % k;
  switch (kind) {
    case 'parquet': {
      // espinha de peixe em blocos de 8: tacos de 2 px com junta escura e luz no começo de cada taco
      const bx = Math.floor(x / 8);
      const by = Math.floor(y / 8);
      const horiz = (bx + by) % 2 === 0;
      const lx = m(x, 8);
      const ly = m(y, 8);
      const along = horiz ? lx : ly;
      const across = horiz ? ly : lx;
      const plank = Math.floor(across / 2);
      const base = (plank + bx + by) % 2 ? a : b;
      if (along === 0) return lv(base, 1);
      if (across % 2 === 1 && along === 7) return lv(base, 2);
      if (across % 2 === 0 && along === 1) return lv(base, 3.6);
      return noise(Math.floor(x / 3), Math.floor(y / 2), seed) > 0.93 ? lv(base, 2.6) : base;
    }
    case 'wood': {
      // tábuas de 4 px ao longo de gx, emendas desencontradas, veio raro e um fio de luz na borda da tábua
      const row = Math.floor(y / 4);
      const off = Math.floor(noise(row, 0, seed + 3) * 40);
      const plank = Math.floor((x + off) / 40);
      const ly = m(y, 4);
      const base = noise(row, plank, seed) > 0.5 ? a : b;
      if (ly === 3) return lv(base, 1.2);
      if (m(x + off, 40) === 0) return lv(base, 1.4);
      if (ly === 0) return lv(base, 3.5);
      const grain = noise(Math.floor((x + off) / 6), row, seed + 9);
      return grain > 0.86 && ly === 2 ? lv(base, 2.5) : base;
    }
    case 'carpet': {
      // trama miúda de baixo contraste, com manchas largas de desgaste
      const wear = noise(Math.floor(x / 6), Math.floor(y / 6), seed + 5);
      const c = wear > 0.72 ? mix(a, b, 0.5) : a;
      return (x + y * 2) % 4 === 0 ? lv(c, 2.5) : (x + y * 2) % 4 === 2 && dith(x, y, 0.5) ? mix(c, b, 0.5) : c;
    }
    case 'shag': {
      // tufos de 2×2 em dois tons, ponta iluminada
      const n = noise(Math.floor(x / 2), Math.floor(y / 2), seed);
      const c = n > 0.55 ? b : a;
      return m(x, 2) === 0 && m(y, 2) === 0 ? lv(c, n > 0.8 ? 4 : 3.4) : m(x, 2) === 1 && m(y, 2) === 1 ? lv(c, 2.2) : c;
    }
    case 'checker': {
      const c = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? a : b;
      const lx = m(x, 8);
      const ly = m(y, 8);
      if (lx === 7 || ly === 7) return lv(c, 1.6);
      if (lx === 0 || ly === 0) return lv(c, 3.7);
      return c;
    }
    case 'concrete': {
      // placas de 32 com junta, manchas largas e suaves
      const lx = m(x, 32);
      const ly = m(y, 32);
      if (lx === 0 || ly === 0) return lv(a, 1.4);
      if (lx === 1 || ly === 1) return lv(a, 3.5);
      const blot = noise(Math.floor(x / 8), Math.floor(y / 8), seed + 11);
      const c = blot > 0.7 ? b : a;
      return noise(x, y, seed) > 0.985 ? lv(c, 2.4) : c;
    }
    case 'tiles': {
      const lx = m(x, 16);
      const ly = m(y, 16);
      const c = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? a : mix(a, b, 0.5);
      if (lx === 0 || ly === 0) return lv(b, 1.3);
      if (lx === 1 || ly === 1) return lv(c, 3.8);
      if (lx === 15 || ly === 15) return lv(c, 2.3);
      return c;
    }
    case 'glow': {
      const onLine = m(x, 16) === 0 || m(y, 16) === 0;
      if (onLine) return mix(a, C('#2ee8d8'), (x + y) % 6 < 3 ? 0.55 : 0.35);
      const near = m(x, 16) === 1 || m(y, 16) === 1;
      return near && dith(x, y, 0.5) ? mix(a, C('#2ee8d8'), 0.18) : a;
    }
    case 'rubber': {
      return m(x, 4) === 0 && m(y, 4) === 0 ? lv(a, 4) : m(x, 4) === 1 && m(y, 4) === 1 ? lv(a, 2) : a;
    }
  }
  return a;
}

/** Tapete (retângulo com borda e padrão por era) em coordenadas locais (0..w, 0..h unidades). */
export function rugAt(pal: Palette, u: number, v: number, w: number, h: number, seed: number): Col {
  const e = pal.era;
  const base = e === '1920' ? HOUSE.wine : e === '1950' ? C('#6cb8ac') : e === '1960' ? C('#c0782a') : e === '1980' ? C('#3a2a64') : e === '1990' ? C('#6a2a30') : e === '2000' ? C('#b0703a') : e === '2010' ? C('#cfc6b8') : e === '2020' ? C('#b8664a') : C('#1e4a56');
  const trim = e === '1920' || e === '1990' ? HOUSE.brass : e === '2030' ? C('#5ffff0') : lv(base, 4.4);
  const x = Math.floor(u);
  const y = Math.floor(v);
  // franja, borda escura, filete claro e miolo; o lado de baixo/direita fica na sombra
  if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) return lv(base, 0.6);
  if (x < 3 || y < 3 || x >= w - 3 || y >= h - 3) return lv(base, x >= w - 3 || y >= h - 3 ? 1.4 : 2);
  if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) return trim;
  let c = base;
  if (e === '1920' || e === '1990') c = (Math.abs(x - w / 2) + Math.abs(y - h / 2)) % 8 < 2 ? lv(base, 1.6) : (Math.abs(x - w / 2) + Math.abs(y - h / 2)) % 8 === 4 ? lv(trim, 3) : base;
  else if (e === '1960') c = Math.floor(Math.hypot(x - w / 2, y - h / 2) / 3) % 2 ? base : C('#e0b04a');
  else if (e === '1980') c = (x + y) % 10 < 2 ? C('#e84a96') : (x - y + 100) % 10 < 1 ? C('#3cc8cc') : base;
  else if (e === '2030') c = (x + y) % 8 === 0 ? C('#5ffff0') : base;
  else c = (x + y * 2) % 4 === 0 ? lv(base, 2.6) : base;
  return noise(Math.floor(x / 4), Math.floor(y / 4), seed) > 0.85 ? lv(c, 2.6) : c;
}

/** Chão externo em volta do prédio. */
export function groundAt(pal: Palette, gx: number, gy: number): Col {
  const x = Math.floor(gx);
  const y = Math.floor(gy);
  const [a, b] = pal.ground;
  const m = (v: number, k: number) => ((v % k) + k) % k;
  switch (pal.groundKind) {
    case 'cobble': {
      // pedras com junta escura e um fio de luz em cima à esquerda
      const sh = (Math.floor(y / 5) % 2) * 3;
      const cx = Math.floor((x + sh) / 6);
      const cy = Math.floor(y / 5);
      const lx = m(x + sh, 6);
      const ly = m(y, 5);
      const c = noise(cx, cy, 5) > 0.5 ? a : b;
      if (lx === 0 || ly === 0) return lv(b, 1);
      if (lx === 1 || ly === 1) return lv(c, 3.8);
      if (lx === 5 || ly === 4) return lv(c, 2.4);
      return c;
    }
    case 'sidewalk': {
      const lx = m(x, 24);
      const ly = m(y, 24);
      if (lx === 0 || ly === 0) return lv(b, 1.6);
      if (lx === 1 || ly === 1) return lv(a, 3.7);
      return noise(Math.floor(x / 4), Math.floor(y / 4), 2) > 0.8 ? b : a;
    }
    case 'asphalt':
      return noise(Math.floor(x / 2), Math.floor(y / 2), 4) > 0.72 ? b : noise(x, y, 8) > 0.985 ? lv(a, 4) : a;
    case 'grass': {
      // tufos: ponta clara, base escura
      const n = noise(Math.floor(x / 2), Math.floor(y / 3), 6);
      const c = n < 0.35 ? b : a;
      if (n > 0.82) return m(y, 3) === 0 ? lv(a, 4) : lv(c, 2.4);
      return c;
    }
    case 'plaza': {
      const lx = m(x, 32);
      const ly = m(y, 32);
      if (lx === 0 || ly === 0) return pal.era === '2030' ? mix(a, C('#2ee8d8'), 0.4) : lv(b, 1.6);
      if (lx === 1 || ly === 1) return lv(a, 3.6);
      return (Math.floor(x / 32) + Math.floor(y / 32)) % 2 ? a : b;
    }
  }
  return a;
}

// ---------- paredes ----------

export const WALL_H = 40;
export const LOW_H = 15;

export type WallOrient = 'x' | 'y'; // x: corre ao longo de gx (borda gy = k); y: ao longo de gy
export type WallStyle = 'back' | 'low' | 'glass' | 'lip' | 'post';

/**
 * Textura da face interna da parede (u ao longo, v = altura). Camadas como no pacote: rodapé saliente
 * (luz no topo, linha escura no pé), sombra de oclusão logo acima do piso e sob a sanca, sanca com fio de luz.
 */
function wallTex(pal: Palette, u: number, v: number, H: number): Col {
  const x = Math.floor(u);
  const z = Math.floor(v);
  const t = pal.trim;
  // rodapé
  if (z < 1) return lv(t, 1);
  if (z < 3) return t;
  if (z === 3) return lv(t, 4);
  // sanca
  if (z >= H - 1) return lv(t, 4);
  if (z === H - 2) return t;
  if (z === H - 3) return lv(t, 1);
  const w = pal.wall;
  const w2 = pal.wall2;
  let c = w;
  switch (pal.wallKind) {
    case 'wainscot':
      // lambri de mogno com almofadas e régua de latão
      if (z < 15) {
        if (z === 14) return lv(HOUSE.brass, x % 6 === 1 ? 5 : 4);
        if (z === 13) return lv(HOUSE.brass, 1.6);
        if (z === 12) return lv(w2, 1);
        const px = x % 8;
        if (px === 0) return lv(w2, 1.2);
        if (px === 1) return lv(w2, 4);
        if (z === 5) return lv(w2, 1.6);
        if (z === 6) return lv(w2, 3.8);
        return px >= 6 ? lv(w2, 2.6) : w2;
      }
      if (z === 15) return lv(w, 1.8);
      c = x % 4 === 0 ? lv(w, 2.7) : w;
      break;
    case 'paper':
      if (z < 5) return z === 4 ? lv(t, 1.4) : t;
      c = ((x + z) % 8 === 0 || (x - z + 64) % 8 === 0) && z % 2 === 0 ? mix(w, w2, 0.7) : x % 8 === 4 ? lv(w, 2.8) : w;
      break;
    case 'panel': {
      // lambri setentista: tábuas verticais com veio e uma faixa clara no alto
      if (z > H - 6) return z === H - 6 ? lv(w2, 1) : lv(w, 3.8);
      const board = Math.floor(x / 4);
      const bc = noise(board, 0, 3) > 0.55 ? w2 : w;
      if (x % 4 === 0) return lv(bc, 1.2);
      if (x % 4 === 1) return lv(bc, 3.6);
      c = noise(board, Math.floor(z / 5), 7) > 0.8 ? lv(bc, 2.5) : bc;
      break;
    }
    case 'plain':
      if (pal.era === '1980' && (z === 20 || z === 21 || z === 22)) return z === 21 ? w2 : z === 22 ? lv(w2, 4) : lv(w2, 1);
      if (pal.era === '1990' && (z === 16 || z === 17)) return z === 16 ? lv(w2, 1.6) : w2;
      if (pal.era === '2000' && z >= 14 && z < 18) return z === 14 ? lv(w2, 1.4) : z === 17 ? lv(w2, 4) : w2;
      if (pal.era === '2020' && z === H - 5) return withAlpha(pal.accent, 255);
      break;
    case 'brick': {
      const row = Math.floor(z / 3);
      const off = row % 2 ? 4 : 0;
      const bc = noise(Math.floor((x + off) / 8), row, 1) > 0.75 ? lv(w, 2.6) : w;
      if (z % 3 === 0 || (x + off) % 8 === 0) return lv(w2, 2.2);
      if (z % 3 === 2 && (x + off) % 8 === 1) return lv(bc, 4);
      c = bc;
      break;
    }
    case 'glass':
      if (z % 9 === 0) return mix(w, w2, 0.6);
      c = x % 16 === 0 ? lv(w, 4) : x % 16 === 1 ? lv(w, 1.6) : w;
      break;
    case 'tile':
      c = x % 4 === 0 || z % 4 === 0 ? w2 : w;
      break;
  }
  // oclusão: perto do rodapé e da sanca
  if (z === 4 || (z === 5 && dith(x, z, 0.5)) || z === H - 4) return lv(c, 2.3);
  return c;
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
  const cap = lv(pal.trim, 4);
  if (style === 'back') {
    const inner = (u: number, v: number) => wallTex(pal, u, v, H);
    const outer = (_u: number, v: number) => (v >= H - 1 ? cap : v >= H - 2 ? pal.trim : lv(pal.trim, 1.8));
    if (orient === 'x') p.box(ox, oy, W, Dd, H, { left: inner, right: end ? outer : undefined, top: () => cap });
    else p.box(ox, oy, W, Dd, H, { right: (u, v) => tint(inner(u, v), -0.1), left: end ? outer : undefined, top: () => cap });
  } else if (style === 'glass') {
    const low = LOW_H - 4;
    const wallC = (u: number, v: number) => (v < 2 ? pal.trim : v >= low - 1 ? cap : pal.era === '1920' ? pal.wall2 : pal.wall);
    p.box(ox, oy, W, Dd, low, { left: wallC, right: (u, v) => tint(wallC(u, v), -0.15), top: () => cap });
    const gl = withAlpha(mix(pal.glass, C('#ffffff'), 0.15), 85);
    const frame = tint(pal.trim, 0.05);
    const glass = (u: number, v: number) => (v >= H - low - 2 ? frame : (Math.floor(u) + Math.floor(v)) % 11 === 0 ? withAlpha(C('#ffffff'), 140) : gl);
    p.box(ox + (orient === 'x' ? 0 : 1), oy - low + (orient === 'x' ? 1 : 0.5), orient === 'x' ? W : 2, orient === 'x' ? 2 : Dd, H - low, { left: glass, right: glass, top: () => frame });
  } else {
    const isLow = style === 'low' || style === 'post';
    // mureta: tampo com luz, faixa escura logo abaixo (linha entre camadas), corpo, rodapé
    const lowCap = lv(mix(pal.wall, pal.trim, 0.25), 4);
    const face = (u: number, v: number) => {
      const z = Math.floor(v);
      if (z < 1) return lv(pal.trim, 1);
      if (z < 2) return pal.trim;
      if (z === 2 && style !== 'lip') return lv(pal.trim, 4);
      if (v >= H - 1) return isLow ? lv(lowCap, 2.6) : cap;
      if (z === H - 2 && isLow) return lv(pal.wall, 1.8);
      if (isLow && pal.wallKind === 'wainscot') return Math.floor(u) % 8 === 0 ? lv(pal.wall2, 1.2) : Math.floor(u) % 8 === 1 ? lv(pal.wall2, 4) : pal.wall2;
      if (isLow && pal.wallKind === 'brick') return wallTex(pal, u, v, WALL_H);
      if (isLow && pal.wallKind === 'panel') return Math.floor(u) % 4 === 0 ? lv(pal.wall2, 1.2) : Math.floor(u) % 4 === 1 ? lv(pal.wall, 3.6) : pal.wall;
      return style === 'lip' ? pal.trim : pal.wall;
    };
    p.box(ox, oy, W, Dd, H, { left: face, right: (u, v) => lv(face(u, v), 2.1), top: (u, v) => (isLow ? (u < 1 || v < 1 ? lv(lowCap, 5) : lowCap) : cap) });
  }
  p.outline(INK);
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
      const frame = e === 6 ? C('#3a3a40') : e === 8 ? C('#2ee8d8') : e <= 2 ? pal.wood : pal.trim;
      const sky = pal.sky;
      p.fill((x, y) => {
        // moldura: luz em cima/esquerda, sombra embaixo/direita
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) return frame; // vira contorno
        if (x === 1 || y === 1) return lv(frame, 4);
        if (x === w - 2 || y === h - 2) return lv(frame, 1.6);
        if (y === 2) return lv(sky, 1.8); // sombra da verga no vidro
        if (e <= 1 && (x === Math.floor(w / 2) || y === Math.floor(h / 2))) return frame;
        if (e === 6 && (x % 5 === 0 || y % 6 === 0)) return frame;
        if (e === 8) return y > h - 8 && (x * 3 + y) % 5 < 3 ? mix(sky, C('#e85ac8'), 0.6) : y > h - 6 ? C('#0e2030') : (noise(x, y, 4) > 0.94 ? C('#ffffff') : sky);
        const refl = (x + y) % 9 === 0 || (x + y) % 9 === 1;
        const c = lv(sky, 3 + (1 - y / h) * 1.2);
        return refl ? lv(sky, 5) : c;
      });
      if (e <= 2) { p.hline(-1, w, h, lv(pal.trim, 4)); }
      break;
    }
    case 'disc_gold':
    case 'disc_platinum': {
      p = new Px(12, 15);
      const wood = e >= 6 ? C('#1e1e22') : pal.woodDark;
      p.rect(0, 0, 12, 15, wood);
      p.rect(1, 1, 10, 13, C('#16141a'));
      const disc = kind === 'disc_gold' ? pal.gold : C('#dfe6ee');
      p.disc(6, 6, 4, (x, y, d) => (d < 1.4 ? C('#f4f0e6') : lv(disc, (Math.floor(d * 1.5) % 2 ? 3 : 2) + (x + y < 11 ? 0.8 : -0.4))));
      glint(p, 4, 4, disc);
      glint(p, 3, 5, disc);
      p.rect(3, 11, 6, 2, kind === 'disc_gold' ? tint(pal.gold, -0.3) : C('#9aa0a8'));
      break;
    }
    case 'awards': {
      p = new Px(16, 12);
      const shelf = pal.woodDark;
      p.rect(0, 10, 16, 2, shelf);
      const n = Math.max(0, Math.min(4, variant));
      for (let i = 0; i < n; i++) {
        const x = 1 + i * 4;
        p.rect(x, 8, 3, 2, HOUSE.mahogany);
        p.put(x, 8, lv(HOUSE.mahogany, 4));
        p.vline(x + 1, 4, 7, lv(pal.gold, 2));
        p.rect(x, 2, 3, 2, pal.gold);
        p.put(x + 2, 3, lv(pal.gold, 1.6));
        p.put(x + 2, 1, pal.gold);
        p.put(x + 2, 0, pal.gold);
        glint(p, x, 2, pal.gold);
      }
      break;
    }
    case 'clock': {
      p = new Px(8, 8);
      p.disc(4, 4, 3.6, (x, y) => lv(e <= 2 ? HOUSE.brass : pal.trim, x + y < 7 ? 4 : 2));
      p.disc(4, 4, 2.7, (x, y) => lv(C('#efe6d2'), x + y > 8 ? 2.4 : 3));
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
        p.fill((x) => (x % 3 === 0 ? tint(C('#6a2a2a'), -0.25) : x % 3 === 1 ? C('#7a2e2a') : tint(C('#7a2e2a'), 0.1)));
        p.hline(0, 13, 0, pal.gold);
      } else if (e >= 7) {
        // painéis hexagonais/feltro coloridos
        const cols = [pal.accent, pal.accent2, tint(pal.wall, 0.2)];
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
          return peak ? tint(foam, 0.18) : (lx + ly) % 3 === 0 ? tint(foam, -0.2) : foam;
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
      p.fill((x, y) => (x === 0 || x === 27 || y === 0 ? tint(c, -0.35) : y % 4 === 0 ? tint(c, -0.2) : y % 4 === 1 ? tint(c, 0.12) : c));
      if (e <= 1) for (let y = 4; y < 28; y += 8) p.line(2, y, 25, y + 6, tint(c, -0.25));
      break;
    }
    case 'door': {
      p = new Px(11, 26);
      const c = e >= 6 ? C('#e2dcd2') : e === 8 ? C('#1e3c48') : pal.wood;
      // almofadas com chanfro: luz em cima/esquerda, sombra embaixo/direita
      p.fill((x, y) => {
        if (x === 0 || x === 10 || y === 0) return pal.trim;
        const inPanel = x >= 2 && x <= 8 && ((y >= 3 && y <= 10) || (y >= 14 && y <= 23));
        if (!inPanel) return c;
        if (x === 2 || y === 3 || y === 14) return lv(c, 1.8);
        if (x === 8 || y === 10 || y === 23) return lv(c, 4);
        return lv(c, 2.8);
      });
      p.put(8, 13, lv(HOUSE.brass, 2));
      glint(p, 8, 12, HOUSE.brass);
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
      drawText(p, t, 3, 3, tint(g, 0.55));
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
  if (kind !== 'neon' && kind !== 'foam' && kind !== 'awards') inkEdge(p);
  decalCache.set(key, p);
  return p;
}

/** Contorno do estilo dentro do próprio decalque: a borda opaca vira INK (o fundo da parede já é opaco). */
function inkEdge(p: Px): void {
  const src = p.d.slice();
  const op = (x: number, y: number) => x >= 0 && y >= 0 && x < p.w && y < p.h && (src[y * p.w + x] >>> 24) > 40;
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++)
      if (op(x, y) && (!op(x - 1, y) || !op(x + 1, y) || !op(x, y - 1) || !op(x, y + 1))) p.d[y * p.w + x] = INK;
}
