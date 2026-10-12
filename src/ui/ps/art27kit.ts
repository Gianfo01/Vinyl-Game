// r27 (K) — KIT de pintura das ilustrações de página e das cenas animadas. Tudo puro (só o buffer Px, sem DOM):
// fundos (céu, horizonte, paredes, pisos), luz (cones, halos, neon) e objetos que mudam com a época (rádio → TV →
// walkman → celular; torno de acetato → fita de rolo → mesa analógica → DAW; ônibus, viatura, câmeras...).
// A "faixa" (band) é a geração dos objetos: 0 = até 1954, 1 = 1955–79, 2 = 1980–99, 3 = 2000+.
// As cores saem da paleta da era (palette.ts) e passam pelo tom da época (sépia nos anos 20).

import { drawText, textWidth } from '../pixel/font';
import { paletteOf, tone, type Palette } from '../pixel/palette';
import { C, Px, dith, mix, noise, shade, withAlpha, type Col } from '../pixel/px';

export type Band27 = 0 | 1 | 2 | 3;
/** Geração dos objetos por ano (os testes conferem as fronteiras). */
export const bandOf27 = (year: number): Band27 => (year < 1955 ? 0 : year < 1980 ? 1 : year < 2000 ? 2 : 3);
export const BAND_NAME27 = ['1920–54', '1955–79', '1980–99', '2000+'] as const;

/** Contexto de pintura: buffer, paleta da era, geração, tempo (s) e semente. */
export interface K27 {
  p: Px; W: number; H: number; pal: Palette; band: Band27; year: number;
  /** tempo em segundos (0 = quadro estático) */
  t: number; seed: number;
  /** linha do chão (pés das pessoas) */
  fy: number;
  /** cor da época: hex → Col já tonalizada (sépia nos anos 20) */
  c: (hex: string, a?: number) => Col;
}

export function kit27(p: Px, year: number, t: number, seed: number, fy?: number): K27 {
  const pal = paletteOf(year);
  const cache = new Map<string, Col>();
  const c = (hex: string, a?: number): Col => {
    const key = a === undefined ? hex : `${hex}/${a}`;
    let v = cache.get(key);
    if (v === undefined) { v = tone(C(hex), pal); if (a !== undefined) v = withAlpha(v, a); cache.set(key, v); }
    return v;
  };
  return { p, W: p.w, H: p.h, pal, band: bandOf27(year), year, t, seed, fy: fy ?? p.h - 12, c };
}

// ---------------------------------------------------------------- básicos

/** Pisca determinístico: liga/desliga em `rate` Hz (fase pela semente); parado = ligado. */
export const blink = (k: K27, rate: number, ph = 0): boolean => (k.t === 0 ? true : Math.sin((k.t * rate + ph) * Math.PI * 2) > -0.2);
export const wave = (k: K27, rate: number, ph = 0): number => (k.t === 0 ? 0 : Math.sin((k.t * rate + ph) * Math.PI * 2));

export function R(k: K27, x: number, y: number, w: number, h: number, c: Col): void { k.p.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), c); }

/** Degradê vertical com pontilhado (4 passos por faixa). */
export function grad(k: K27, x: number, y0: number, w: number, y1: number, top: Col, bot: Col): void {
  const h = Math.max(1, y1 - y0);
  for (let y = y0; y < y1; y++) {
    const f = (y - y0) / h;
    const q = Math.floor(f * 6) / 6;
    const a = mix(top, bot, q), b = mix(top, bot, Math.min(1, q + 1 / 6));
    const frac = f * 6 - Math.floor(f * 6);
    for (let xx = x; xx < x + w; xx++) k.p.put(xx, y, dith(xx, y, frac) ? b : a);
  }
}

export function stars(k: K27, n: number, ymax: number): void {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(noise(i, 1, k.seed) * k.W), y = Math.floor(noise(i, 2, k.seed) * ymax);
    const on = k.t === 0 || noise(i, Math.floor(k.t * 3), 7) > 0.15;
    if (on) k.p.set(x, y, k.c(i % 5 ? '#e8e4ff' : '#fff2b0', i % 3 ? 200 : 255));
  }
}

/** Silhuetas de prédios com janelas acesas (horizonte). */
export function skyline(k: K27, y: number, col: Col, lit: Col, o: { seed?: number; tall?: number; dens?: number } = {}): void {
  const sd = o.seed ?? k.seed, tall = o.tall ?? 26;
  let x = -4;
  let i = 0;
  while (x < k.W) {
    const w = 10 + Math.floor(noise(i, 3, sd) * 18);
    const h = 8 + Math.floor(noise(i, 4, sd) * tall) + (k.band >= 2 && noise(i, 5, sd) > 0.82 ? 14 : 0);
    R(k, x, y - h, w, h, col);
    if (k.band >= 1 && noise(i, 9, sd) > 0.7) R(k, x + w / 2, y - h - 4, 1, 4, col); // antena
    for (let wy = y - h + 3; wy < y - 2; wy += 4)
      for (let wx = x + 2; wx < x + w - 2; wx += 3)
        if (noise(wx, wy, sd) < (o.dens ?? 0.35)) k.p.set(wx, wy, lit);
    x += w + (noise(i, 6, sd) > 0.6 ? 2 : 0);
    i++;
  }
}

export function bricks(k: K27, x: number, y: number, w: number, h: number, base: Col, mortar?: Col): void {
  R(k, x, y, w, h, base);
  const m = mortar ?? shade(base, -0.25);
  for (let yy = y; yy < y + h; yy += 4) {
    k.p.hline(x, x + w - 1, yy, m);
    const off = ((yy - y) / 4) % 2 ? 4 : 0;
    for (let xx = x + off; xx < x + w; xx += 8) k.p.vline(xx, yy, Math.min(y + h - 1, yy + 3), m);
  }
  for (let i = 0; i < (w * h) / 40; i++) k.p.set(x + Math.floor(noise(i, 11, k.seed) * w), y + Math.floor(noise(i, 12, k.seed) * h), shade(base, 0.12));
}
export function planks(k: K27, x: number, y: number, w: number, h: number, base: Col, vertical = true): void {
  R(k, x, y, w, h, base);
  const d = shade(base, -0.2);
  if (vertical) for (let xx = x; xx < x + w; xx += 6) k.p.vline(xx, y, y + h - 1, d);
  else for (let yy = y; yy < y + h; yy += 4) k.p.hline(x, x + w - 1, yy, d);
}

/** Parede interna da era (lambri nos anos 20, papel listrado, lambri 70s, tijolo, vidro). */
export function wall(k: K27, y0: number, y1: number, base?: Col): void {
  const pal = k.pal;
  const b = base ?? pal.wall;
  R(k, 0, y0, k.W, y1 - y0, b);
  switch (pal.wallKind) {
    case 'wainscot': R(k, 0, y1 - 18, k.W, 18, pal.wall2); for (let x = 3; x < k.W; x += 14) R(k, x, y1 - 15, 10, 12, shade(pal.wall2, 0.08)); k.p.hline(0, k.W - 1, y1 - 19, pal.trim); break;
    case 'paper': for (let x = 0; x < k.W; x += 6) for (let y = y0; y < y1; y++) if ((y + x) % 3 === 0) k.p.set(x, y, shade(b, -0.08)); break;
    case 'panel': for (let x = 0; x < k.W; x += 5) k.p.vline(x, y0, y1 - 1, shade(b, -0.14)); break;
    case 'brick': bricks(k, 0, y0, k.W, y1 - y0, b); break;
    case 'glass': for (let x = 0; x < k.W; x += 24) k.p.vline(x, y0, y1 - 1, shade(b, -0.2)); break;
    case 'tile': for (let y = y0; y < y1; y += 6) k.p.hline(0, k.W - 1, y, shade(b, -0.1)); break;
    default: break;
  }
  k.p.hline(0, k.W - 1, y1 - 1, pal.trim);
}

export function floor(k: K27, y0: number, a?: Col, b?: Col): void {
  const A = a ?? k.pal.floors.office.a, B = b ?? k.pal.floors.office.b;
  for (let y = y0; y < k.H; y++) for (let x = 0; x < k.W; x++) k.p.put(x, y, (Math.floor(x / 8) + Math.floor((y - y0) / 3)) % 2 ? A : B);
  k.p.hline(0, k.W - 1, y0, shade(A, -0.3));
}

/** Cone de luz translúcido (holofote, poste). */
export function cone(k: K27, x: number, y0: number, w0: number, y1: number, w1: number, col: Col, a = 46): void {
  const h = y1 - y0;
  for (let y = y0; y < y1; y++) {
    const f = (y - y0) / h, hw = (w0 + (w1 - w0) * f) / 2;
    for (let xx = Math.round(x - hw); xx <= Math.round(x + hw); xx++) if (dith(xx, y, 0.75)) k.p.set(xx, y, withAlpha(col, a));
  }
}
export function halo(k: K27, cx: number, cy: number, r: number, col: Col, a = 90): void {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = Math.sqrt(x * x + y * y) / r;
    if (d > 1) continue;
    const al = a * (1 - d) * (1 - d);
    if (al > 4 && dith(cx + x, cy + y, Math.min(1, al / 60 + 0.3))) k.p.set(cx + x, cy + y, withAlpha(col, al));
  }
}
/** Escurece a cena (noite, crise) mantendo as luzes por cima depois. */
export function dim(k: K27, a: number, col = '#0a0818'): void { R(k, 0, 0, k.W, k.H, k.c(col, a)); }

export function text(k: K27, s: string, x: number, y: number, col: Col, out?: Col): number {
  if (out) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) drawText(k.p, s, x + dx, y + dy, out);
  return drawText(k.p, s, x, y, col);
}
export const tw = (s: string): number => textWidth(s);
/** Letreiro de neon (com halo e falha ocasional). */
export function neon(k: K27, s: string, cx: number, y: number, col: Col): void {
  const w = tw(s);
  const on = k.t === 0 || noise(Math.floor(k.t * 6), 3, k.seed) > 0.08;
  if (!on) { text(k, s, cx - w / 2, y, shade(col, -0.55)); return; }
  halo(k, Math.round(cx), y + 2, Math.max(8, Math.round(w / 2) + 4), col, 50);
  text(k, s, Math.round(cx - w / 2), y, col, shade(col, -0.5));
}

// ---------------------------------------------------------------- multidão e figurantes

/** Plateia em silhuetas (cabeças e ombros), `n` 0..1 de lotação; pula no ritmo quando `hop` > 0. */
export function crowd(k: K27, x0: number, x1: number, y: number, n: number, hop: number, rows = 3, lit?: Col): void {
  const skin = ['#f2c9a0', '#d79b6b', '#a46a42', '#6b4428'].map((h) => k.c(h));
  const cloth = [k.pal.fabric, k.pal.fabric2, k.pal.accent2, k.c('#2a2a38'), k.c('#4a5a7a'), k.pal.metalDark];
  const hair = [k.c('#1e1814'), k.c('#3d2616'), k.c('#8e3a1e'), k.c('#dcb862')];
  for (let r = rows - 1; r >= 0; r--) {
    const yy = y + r * 6, back = 0.55 - r * 0.14; // fileiras de trás mais escuras (contraluz)
    for (let x = x0 + (r % 2) * 4; x < x1; x += 8) {
      const i = x * 7 + r * 131;
      if (noise(i, r, k.seed) > n) continue;
      const b = hop > 0 && k.t > 0 ? Math.round(Math.max(0, Math.sin(k.t * (3 + hop * 4) + noise(i, 9) * 6)) * 2 * hop) : 0;
      const top = yy - 12 - b - (noise(i, 5) > 0.7 ? 1 : 0);
      const body = shade(cloth[Math.floor(noise(i, 6) * cloth.length)], -back);
      R(k, x, top + 5, 7, 12 + b, body); R(k, x + 1, top + 4, 5, 1, body); // ombros
      R(k, x + 2, top, 4, 4, shade(skin[Math.floor(noise(i, 7) * 4)], -back));
      R(k, x + 2, top - 1, 4, 2, shade(hair[Math.floor(noise(i, 8) * 4)], -back * 0.6));
      if (hop > 0.6 && noise(i, 10) > 0.75) { const ax = noise(i, 12) > 0.5 ? x + 6 : x; R(k, ax, top - 4 - b, 1, 8, shade(skin[1], -back)); }
      if (lit && noise(i, 13) > 0.85) { k.p.set(x + 6, top - 4 - b, lit); k.p.set(x + 6, top - 3 - b, lit); }
    }
  }
}

// ---------------------------------------------------------------- objetos (todos ancorados no chão: x = esquerda, y = base)

export function speaker(k: K27, x: number, y: number, w = 10, h = 16): void {
  R(k, x, y - h, w, h, k.c('#1c1a20')); R(k, x, y - h, w, 1, k.c('#38343e'));
  for (let i = 0; i < Math.floor(h / 8); i++) { k.p.disc(x + w / 2 - 0.5, y - h + 4 + i * 8, Math.min(3, w / 3), k.c('#3a3640')); k.p.set(Math.floor(x + w / 2), y - h + 4 + i * 8, k.c('#5a5662')); }
}
export function micStand(k: K27, x: number, y: number, h = 20): void {
  k.p.vline(x, y - h, y - 1, k.c('#8a8a92')); k.p.hline(x - 3, x + 3, y - 1, k.c('#5a5a62'));
  R(k, x - 1, y - h - 3, 3, 3, k.band === 0 ? k.c('#c9b37a') : k.c('#3a3a42'));
}
export function drums(k: K27, x: number, y: number): void {
  k.p.ellipse(x + 9, y - 6, 6, 6, k.c('#e8e0d0')); k.p.ring(x + 9, y - 6, 6, k.pal.accent2);
  R(k, x, y - 9, 5, 7, k.pal.accent2); R(k, x + 15, y - 9, 5, 7, k.pal.accent2);
  k.p.hline(x - 2, x + 3, y - 14, k.pal.gold); k.p.hline(x + 16, x + 22, y - 16, k.pal.gold);
  k.p.vline(x, y - 14, y - 1, k.c('#7a7a80')); k.p.vline(x + 19, y - 16, y - 1, k.c('#7a7a80'));
}
export function amp(k: K27, x: number, y: number): void {
  R(k, x, y - 10, 12, 10, k.band >= 2 ? k.c('#1a1a1e') : k.c('#5a3a24'));
  R(k, x + 1, y - 9, 10, 2, k.band >= 2 ? k.c('#c0c0c8') : k.pal.gold);
  R(k, x + 1, y - 6, 10, 5, k.c('#2e2a2a'));
}
export function guitar(k: K27, x: number, y: number, col?: Col): void {
  const c = col ?? k.pal.accent2;
  k.p.ellipse(x + 3, y - 4, 3, 3, c); k.p.ellipse(x + 3, y - 8, 2, 2, c);
  k.p.line(x + 3, y - 9, x + 3, y - 18, k.pal.woodDark); R(k, x + 2, y - 20, 3, 2, k.pal.woodDark);
}
export function piano(k: K27, x: number, y: number, grand = false): void {
  if (grand) {
    k.p.poly([[x, y - 12], [x + 30, y - 12], [x + 36, y - 16], [x + 28, y - 20], [x + 4, y - 18]], k.c('#16141a'));
    R(k, x + 2, y - 12, 24, 3, k.c('#f0ece0')); for (let i = 0; i < 12; i++) k.p.set(x + 3 + i * 2, y - 12, k.c('#16141a'));
    k.p.vline(x + 3, y - 9, y - 1, k.c('#16141a')); k.p.vline(x + 26, y - 9, y - 1, k.c('#16141a'));
  } else {
    R(k, x, y - 18, 22, 18, k.pal.woodDark); R(k, x + 1, y - 17, 20, 6, k.pal.wood);
    R(k, x - 1, y - 10, 24, 3, k.c('#f0ece0')); for (let i = 0; i < 11; i++) k.p.set(x + i * 2, y - 10, k.c('#16141a'));
  }
}
export function desk(k: K27, x: number, y: number, w = 30): void {
  const top = k.band >= 3 ? k.c('#d8d4cc') : k.pal.wood;
  R(k, x, y - 12, w, 3, top); R(k, x, y - 9, w, 1, shade(top, -0.3));
  R(k, x + 1, y - 9, 3, 9, shade(top, -0.25)); R(k, x + w - 4, y - 9, 3, 9, shade(top, -0.25));
  if (k.band < 3) R(k, x + w - 11, y - 9, 7, 7, shade(top, -0.15));
}
export function chair(k: K27, x: number, y: number): void {
  const c = k.band >= 2 ? k.c('#26262c') : k.pal.woodDark;
  R(k, x, y - 7, 6, 2, c); R(k, x + 5, y - 13, 1, 8, c); k.p.vline(x, y - 5, y - 1, c); k.p.vline(x + 5, y - 5, y - 1, c);
}
export function lampDesk(k: K27, x: number, y: number, on = true): void {
  k.p.vline(x + 2, y - 8, y - 1, k.pal.metalDark); R(k, x, y - 10, 5, 2, k.band === 0 ? k.c('#2f6a3a') : k.pal.metal);
  if (on) halo(k, x + 2, y - 4, 10, k.pal.lamp, 70);
}
export function phone(k: K27, x: number, y: number): void {
  if (k.band <= 1) { R(k, x, y - 3, 6, 3, k.c('#18181c')); R(k, x - 1, y - 5, 8, 2, k.c('#18181c')); k.p.set(x + 3, y - 2, k.c('#c0c0c0')); }
  else if (k.band === 2) { R(k, x, y - 3, 7, 3, k.c('#d8d0c0')); R(k, x, y - 5, 7, 1, k.c('#b8b0a0')); }
  else { R(k, x + 1, y - 5, 3, 5, k.c('#18181c')); k.p.set(x + 2, y - 4, k.c('#7ac0ff')); }
}
export function typewriter(k: K27, x: number, y: number): void {
  R(k, x, y - 5, 10, 5, k.c('#2a2a2e')); R(k, x + 2, y - 9, 6, 4, k.c('#f4ecd8')); R(k, x - 1, y - 6, 12, 1, k.c('#5a5a62'));
}
/** Tela de computador por geração (terminal verde, PC bege, monitor fino com gráfico). */
export function computer(k: K27, x: number, y: number, chart = false): void {
  if (k.band <= 1) { typewriter(k, x, y); return; }
  if (k.band === 2) {
    R(k, x, y - 12, 13, 11, k.c('#d8d0bc')); R(k, x + 2, y - 10, 9, 7, k.c('#0a2a12'));
    for (let i = 0; i < 3; i++) k.p.hline(x + 3, x + 4 + ((i * 3 + k.seed) % 5), y - 9 + i * 2, k.c('#3aff6a'));
    R(k, x - 1, y - 1, 15, 1, k.c('#b8b0a0'));
  } else {
    R(k, x, y - 13, 16, 10, k.c('#1a1c22')); R(k, x + 1, y - 12, 14, 8, k.c('#1d3a5a'));
    if (chart) for (let i = 0; i < 6; i++) k.p.vline(x + 2 + i * 2, y - 5 - Math.floor(noise(i, 3, k.seed) * 6), y - 5, i === 5 ? k.c('#4ade80') : k.c('#7ac0ff'));
    else for (let i = 0; i < 3; i++) k.p.hline(x + 3, x + 8 + i * 2, y - 10 + i * 2, k.c('#a8d0ff'));
    R(k, x + 7, y - 3, 2, 3, k.c('#3a3c44')); R(k, x + 4, y - 1, 8, 1, k.c('#3a3c44'));
  }
}
export function tvSet(k: K27, x: number, y: number, glow?: Col): void {
  const g = glow ?? k.c('#9ac0ff');
  if (k.band <= 1) { R(k, x, y - 16, 20, 14, k.pal.woodDark); R(k, x + 2, y - 14, 12, 10, shade(g, -0.35)); k.p.vline(x + 3, y - 2, y - 1, k.pal.woodDark); k.p.vline(x + 16, y - 2, y - 1, k.pal.woodDark); }
  else if (k.band === 2) { R(k, x, y - 14, 18, 14, k.c('#2a2a2e')); R(k, x + 2, y - 12, 14, 10, shade(g, -0.25)); }
  else { R(k, x, y - 14, 26, 14, k.c('#121216')); R(k, x + 1, y - 13, 24, 12, shade(g, -0.2)); }
  halo(k, x + 10, y - 9, 12, g, 40);
}
/** Aparelho de ouvir música da geração: rádio-capela, vitrola, walkman/boombox, celular. */
export function radio(k: K27, x: number, y: number): void {
  if (k.band === 0) { k.p.disc(x + 7, y - 10, 7, k.pal.wood); R(k, x, y - 10, 15, 10, k.pal.wood); R(k, x + 3, y - 12, 9, 6, k.c('#c8a868')); for (let i = 0; i < 4; i++) k.p.vline(x + 4 + i * 2, y - 12, y - 7, k.pal.woodDark); R(k, x + 5, y - 4, 2, 2, k.pal.gold); R(k, x + 9, y - 4, 2, 2, k.pal.gold); }
  else if (k.band === 1) { R(k, x, y - 9, 18, 9, k.pal.accent); R(k, x + 2, y - 8, 7, 7, shade(k.pal.accent, -0.3)); R(k, x + 11, y - 7, 5, 2, k.c('#e8e0c8')); }
  else if (k.band === 2) { R(k, x, y - 10, 22, 10, k.c('#26262c')); k.p.disc(x + 5, y - 5, 3, k.c('#4a4a52')); k.p.disc(x + 16, y - 5, 3, k.c('#4a4a52')); R(k, x + 8, y - 8, 6, 3, k.c('#7ac0ff')); R(k, x + 3, y - 13, 16, 1, k.c('#8a8a92')); }
  else { R(k, x + 3, y - 10, 6, 10, k.c('#16161a')); R(k, x + 4, y - 9, 4, 7, k.c('#3aa0ff')); k.p.set(x + 6, y - 7, k.c('#ffffff')); }
}
export function jukebox(k: K27, x: number, y: number): void {
  k.p.disc(x + 8, y - 20, 8, k.c('#c84a2a')); R(k, x, y - 20, 17, 20, k.c('#c84a2a'));
  k.p.disc(x + 8, y - 20, 6, k.c('#ffd27a')); R(k, x + 2, y - 20, 13, 8, k.c('#ffd27a'));
  R(k, x + 3, y - 11, 11, 5, k.c('#3a2a2a')); for (let i = 0; i < 4; i++) k.p.vline(x + 4 + i * 3, y - 10, y - 7, k.c(i % 2 ? '#6ad0ff' : '#ff7ad0'));
  halo(k, x + 8, y - 16, 14, k.c('#ffb050'), 50);
}
/** Disco de vinil (ou 78, ou CD na faixa 3) visto de frente/girando. */
export function disc(k: K27, cx: number, cy: number, r: number, label: Col, ang = 0): void {
  if (k.band === 3 && k.year >= 1990 && r <= 6) { k.p.disc(cx, cy, r, k.c('#d8dce8')); k.p.disc(cx, cy, 1, k.c('#8890a0')); k.p.set(cx - 2, cy - 2, k.c('#ffffff')); return; }
  k.p.disc(cx, cy, r, k.c('#121214'));
  for (let rr = 2; rr < r; rr += 2) k.p.ring(cx, cy, rr, k.c('#202024'));
  k.p.disc(cx, cy, Math.max(1, Math.floor(r / 3)), label);
  const a = ang;
  k.p.set(Math.round(cx + Math.cos(a) * (r - 1)), Math.round(cy + Math.sin(a) * (r - 1)), k.c('#5a5a66'));
  k.p.set(Math.round(cx + Math.cos(a) * (r / 3)), Math.round(cy + Math.sin(a) * (r / 3)), shade(label, -0.4));
}
/** Prateleira de discos (lombadas coloridas). */
export function shelf(k: K27, x: number, y: number, w: number, h: number, fill = 0.8): void {
  R(k, x, y - h, w, h, k.pal.woodDark);
  for (let row = 0; row < Math.floor(h / 8); row++) {
    const yy = y - h + 1 + row * 8;
    R(k, x + 1, yy + 6, w - 2, 1, shade(k.pal.woodDark, -0.3));
    for (let i = 0; i < w - 2; i++) if (noise(i, row, k.seed + 3) < fill) k.p.vline(x + 1 + i, yy, yy + 5, [k.pal.accent, k.pal.accent2, k.pal.fabric2, k.pal.paper, k.c('#2a2a30')][Math.floor(noise(i, row + 9) * 5)]);
  }
}
export function poster(k: K27, x: number, y: number, w: number, h: number, col: Col, s?: string): void {
  R(k, x, y, w, h, col); R(k, x, y, w, 1, shade(col, 0.3));
  k.p.disc(x + w / 2, y + h / 2 - 1, Math.min(w, h) / 4, shade(col, -0.35));
  if (s) text(k, s.slice(0, Math.max(1, Math.floor((w - 2) / 4))), x + 2, y + h - 7, k.c('#fffaf0'));
}
export function windowPane(k: K27, x: number, y: number, w: number, h: number, out: Col, night = true): void {
  R(k, x - 1, y - 1, w + 2, h + 2, k.pal.trim);
  grad(k, x, y, w, y + h, out, shade(out, night ? -0.2 : 0.3));
  if (night) for (let i = 0; i < w / 4; i++) k.p.set(x + Math.floor(noise(i, 1, k.seed) * w), y + Math.floor(noise(i, 2, k.seed) * h * 0.6), k.c('#ffe8a0'));
  k.p.vline(x + Math.floor(w / 2), y, y + h - 1, k.pal.trim); k.p.hline(x, x + w - 1, y + Math.floor(h / 2), k.pal.trim);
}
export function trophy(k: K27, x: number, y: number, kind: 0 | 1 | 2 = 0): void {
  const g = k.pal.gold;
  if (kind === 1) { disc(k, x + 3, y - 6, 5, g); R(k, x - 2, y - 12, 11, 12, withAlpha(k.c('#c0a050'), 60)); return; } // disco de ouro emoldurado
  if (kind === 2) { R(k, x + 1, y - 2, 5, 2, k.pal.woodDark); k.p.vline(x + 3, y - 9, y - 3, g); k.p.disc(x + 3, y - 11, 2, g); return; } // estatueta
  R(k, x, y - 2, 7, 2, k.pal.woodDark); R(k, x + 2, y - 4, 3, 2, g); k.p.disc(x + 3, y - 7, 3, g); R(k, x, y - 9, 7, 2, g); k.p.set(x + 2, y - 8, shade(g, 0.5));
}
export function candle(k: K27, x: number, y: number): void {
  R(k, x, y - 4, 2, 4, k.c('#f4f0e0'));
  const f = k.t === 0 || Math.sin(k.t * 11 + x) > -0.6;
  k.p.set(x, y - 5, k.c(f ? '#ffd040' : '#ff8020')); k.p.set(x + (f ? 0 : 1), y - 6, k.c('#ffb040', 200));
  halo(k, x + 1, y - 5, 5, k.c('#ffb040'), 50);
}

// ---------------------------------------------------------------- estúdio

/** Equipamento de gravação da geração: torno de acetato, fita de rolo, mesa analógica, DAW. */
export function console27(k: K27, x: number, y: number, w = 44, rec = false): void {
  if (k.band === 0) {
    R(k, x, y - 12, 20, 12, k.pal.woodDark); disc(k, x + 10, y - 13, 7, k.pal.paper, k.t * 6); k.p.line(x + 17, y - 18, x + 12, y - 14, k.pal.metal); // torno
    R(k, x + 24, y - 16, 12, 16, k.pal.metalDark); for (let i = 0; i < 3; i++) k.p.disc(x + 28 + (i % 2) * 4, y - 12 + i * 3, 1, k.c(rec && blink(k, 1.5, i) ? '#ff5040' : '#ffd889'));
    return;
  }
  if (k.band === 1) {
    R(k, x, y - 22, 16, 22, k.c('#7a7a80')); k.p.disc(x + 5, y - 17, 4, k.c('#2a2a2e')); k.p.disc(x + 11, y - 17, 4, k.c('#2a2a2e'));
    const a = k.t * 4; k.p.set(Math.round(x + 5 + Math.cos(a) * 3), Math.round(y - 17 + Math.sin(a) * 3), k.c('#c0c0c8')); k.p.set(Math.round(x + 11 + Math.cos(a) * 3), Math.round(y - 17 + Math.sin(a) * 3), k.c('#c0c0c8'));
    R(k, x + 2, y - 10, 12, 3, k.c('#3a3a42'));
    R(k, x + 20, y - 10, w - 20, 10, k.c('#4a3a2c')); R(k, x + 20, y - 12, w - 20, 2, k.c('#6a5a4c'));
    for (let i = 0; i < (w - 22) / 3; i++) k.p.vline(x + 22 + i * 3, y - 9, y - 7, k.c('#d8d0c0'));
    meters(k, x + 22, y - 18, 3, rec);
    return;
  }
  const big = k.band === 2;
  R(k, x, y - 10, w, 10, big ? k.c('#2e2e34') : k.c('#1c1e24'));
  k.p.poly([[x, y - 10], [x + w, y - 10], [x + w - 3, y - 14], [x + 3, y - 14]], big ? k.c('#4a4a52') : k.c('#2a2c34'));
  for (let i = 0; i < (w - 6) / 2; i++) { const yy = y - 13 + ((i * 7 + k.seed) % 3); k.p.set(x + 4 + i * 2, yy, k.c(i % 4 ? '#c8c8d0' : '#ff8a3a')); }
  if (big) { meters(k, x + 4, y - 22, 4, rec); speaker(k, x - 10, y - 14, 8, 12); speaker(k, x + w + 2, y - 14, 8, 12); }
  else {
    R(k, x + 4, y - 26, 16, 11, k.c('#121216')); R(k, x + 5, y - 25, 14, 9, k.c('#1d2a3a'));
    R(k, x + w - 20, y - 26, 16, 11, k.c('#121216')); R(k, x + w - 19, y - 25, 14, 9, k.c('#1d2a3a'));
    for (let i = 0; i < 12; i++) { const hh = 1 + Math.floor(Math.abs(Math.sin(i * 0.9 + k.t * (rec ? 6 : 0))) * 6); k.p.vline(x + 6 + i, y - 17 - hh, y - 17, k.c(i % 3 ? '#4ab0ff' : '#5aff9a')); }
    for (let i = 0; i < 4; i++) k.p.hline(x + w - 18, x + w - 18 + 4 + ((i * 5) % 9), y - 24 + i * 2, k.c(['#ff7ad0', '#7ac0ff', '#ffd040', '#5aff9a'][i]));
  }
}
/** VU meters (ponteiro mexe quando grava). */
export function meters(k: K27, x: number, y: number, n: number, live: boolean): void {
  for (let i = 0; i < n; i++) {
    R(k, x + i * 8, y, 7, 5, k.c('#f0e6c0')); R(k, x + i * 8, y + 4, 7, 1, k.c('#c04030'));
    const a = -2.4 + (live ? 0.5 + 0.5 * Math.abs(Math.sin(k.t * 7 + i)) : 0.3) * 1.6;
    k.p.line(x + i * 8 + 3, y + 4, Math.round(x + i * 8 + 3 + Math.cos(a) * 3), Math.round(y + 4 + Math.sin(a) * 3), k.c('#202020'));
  }
}
export function recLight(k: K27, x: number, y: number, on: boolean): void {
  R(k, x, y, 16, 6, k.c('#1a1416'));
  text(k, k.band === 0 ? 'REC' : 'ON AIR', x + 1 + (k.band === 0 ? 3 : 0), y + 1, on ? k.c('#ff4030') : k.c('#4a2420'));
  if (on) halo(k, x + 8, y + 3, 12, k.c('#ff4030'), 60);
}

// ---------------------------------------------------------------- veículos

/** Ônibus/van de turnê da geração (frente para a direita). */
export function tourVehicle(k: K27, x: number, y: number, name?: string): void {
  const body = k.band === 0 ? k.c('#5a6a4a') : k.band === 1 ? k.c('#d8c8a0') : k.band === 2 ? k.c('#e8e8f0') : k.c('#1a1c24');
  const stripe = k.band === 0 ? k.pal.gold : k.band === 1 ? k.c('#c86a2a') : k.band === 2 ? k.c('#3a6ad0') : k.pal.accent;
  const L = k.band === 1 ? 46 : 66, Hh = k.band === 1 ? 20 : 24;
  if (k.band === 1) { R(k, x, y - Hh - 4, L - 10, Hh, body); R(k, x + L - 12, y - Hh + 2, 12, Hh - 6, body); R(k, x + L - 10, y - Hh + 4, 7, 6, k.c('#9ac0d8')); } // van
  else { R(k, x, y - Hh - 4, L, Hh, body); R(k, x + L - 4, y - Hh, 4, Hh - 8, k.c('#9ac0d8')); }
  R(k, x, y - 12, L - (k.band === 1 ? 0 : 0), 3, stripe);
  for (let i = 0; i < (L - 16) / 9; i++) R(k, x + 4 + i * 9, y - Hh, 7, 6, k.band === 3 ? k.c('#2a3a5a') : k.c('#9ac0d8'));
  for (const wx of [x + 10, x + L - 12]) { k.p.disc(wx, y - 3, 4, k.c('#141418')); k.p.disc(wx, y - 3, 1, k.c('#8a8a92')); }
  if (name) text(k, name.slice(0, 12), x + 4, y - 9, k.c('#fffaf0'), shade(stripe, -0.5));
  k.p.set(x + L - 1, y - 7, k.c('#fff4b0')); halo(k, x + L + 2, y - 7, 8, k.c('#fff4b0'), 50);
}
/** Viatura da geração com giroflex (azul/vermelho alternando). */
export function policeCar(k: K27, x: number, y: number): void {
  const body = k.band <= 1 ? k.c('#18181c') : k.c('#e8e8ec');
  R(k, x, y - 9, 34, 6, body); R(k, x + 7, y - 14, 18, 5, body); R(k, x + 9, y - 13, 6, 3, k.c('#9ac0d8')); R(k, x + 17, y - 13, 6, 3, k.c('#9ac0d8'));
  if (k.band >= 2) R(k, x, y - 7, 34, 2, k.c('#2a4ad0'));
  for (const wx of [x + 7, x + 27]) { k.p.disc(wx, y - 3, 3, k.c('#141418')); }
  const ph = k.t === 0 ? 0 : Math.floor(k.t * 4) % 2;
  if (k.band === 0) { R(k, x + 15, y - 16, 2, 2, k.c('#ff3030')); if (ph === 0) halo(k, x + 16, y - 15, 10, k.c('#ff3030'), 70); }
  else { R(k, x + 12, y - 16, 4, 2, k.c(ph ? '#ff3030' : '#801818')); R(k, x + 16, y - 16, 4, 2, k.c(ph ? '#182880' : '#3060ff')); halo(k, ph ? x + 13 : x + 18, y - 15, 16, k.c(ph ? '#ff3030' : '#3060ff'), 70); }
}
/** Câmera de imprensa da geração (com flash). */
export function pressCam(k: K27, x: number, y: number, flash: boolean): void {
  if (k.band === 0) { R(k, x, y - 6, 6, 5, k.c('#2a2a2e')); k.p.disc(x + 7, y - 9, 2, k.c('#d8d8e0')); }
  else if (k.band <= 2) { R(k, x, y - 5, 7, 5, k.c('#1a1a1e')); R(k, x + 2, y - 7, 3, 2, k.c('#1a1a1e')); k.p.set(x + 3, y - 3, k.c('#8090a0')); }
  else { R(k, x, y - 7, 4, 7, k.c('#16161a')); R(k, x + 1, y - 6, 2, 4, k.c('#3aa0ff')); }
  if (flash) { halo(k, x + 4, y - 6, 18, k.c('#ffffff'), 160); R(k, x + 1, y - 7, 6, 2, k.c('#ffffff')); }
}

// ---------------------------------------------------------------- fábrica / loja

/** Prensa de discos (a máquina): prato hidráulico + pilha de discos. */
export function press(k: K27, x: number, y: number, label: Col, beat = 0): void {
  R(k, x, y - 30, 26, 30, k.pal.metalDark); R(k, x + 2, y - 28, 22, 4, k.pal.metal);
  const down = Math.round(Math.max(0, Math.sin(beat)) * 4);
  R(k, x + 5, y - 24 + down, 16, 4, k.c('#5a5a62')); R(k, x + 12, y - 28, 2, 4 + down, k.c('#8a8a92'));
  R(k, x + 4, y - 16, 18, 2, k.c('#2a2a2e')); disc(k, x + 13, y - 14, 5, label, 0);
  R(k, x + 3, y - 8, 20, 8, shade(k.pal.metalDark, -0.2));
  halo(k, x + 13, y - 18, 8, k.c('#ffb060'), down > 2 ? 60 : 20);
}
export function stackDiscs(k: K27, x: number, y: number, n: number, label: Col): void {
  for (let i = 0; i < n; i++) { R(k, x, y - 2 - i * 2, 12, 2, k.c('#121214')); k.p.set(x + 5, y - 2 - i * 2, label); }
}
