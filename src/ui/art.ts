// Logos e capas em pixel art gerados por parâmetros (seed, família, era, orçamento); nada vai para o save (GDD §25).
// Desenhados em baixa resolução (logo 32×32, capa 40×40) e ampliados por vizinho mais próximo.

import { Rng } from '../core/rng';
import { FAMILIES, familyOf } from '../data/world';
import { drawText, drawTextOutlined, fitText, textWidth } from './pixel/font';
import { C, Px, dith, hsl, mix, noise, shade, upscale, withAlpha, type Col } from './pixel/px';

const cache = new Map<string, string>();
const pxCache = new Map<string, Px>();

export type ArtStyle = 'deco' | 'classic' | 'psych' | 'punk' | 'neon' | 'grunge' | 'gloss' | 'minimal' | 'neural';

export function eraStyle(year: number): ArtStyle {
  if (year < 1945) return 'deco';
  if (year < 1964) return 'classic';
  if (year < 1975) return 'psych';
  if (year < 1981) return 'punk';
  if (year < 1990) return 'neon';
  if (year < 2000) return 'grunge';
  if (year < 2010) return 'gloss';
  if (year < 2030) return 'minimal';
  return 'neural';
}

function hueFor(genre: string): number {
  return FAMILIES.find((f) => f.id === familyOf(genre))?.hue ?? 200;
}

export function initials(name: string): string {
  const words = name.replace(/^(The|Os|As|Los|Las|Dupla|O|A)\s+/i, '').split(/[\s&\-]+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export interface LogoColors {
  hue: number;
  bg: Col;
  fg: Col;
  accent: Col;
  dark: Col;
}

/** Cores do logo de um ato (as mesmas usadas no crachá e nos cartazes da sede). */
export function logoColors(seed: number, genre: string, year: number): LogoColors {
  const r = Rng.fromSeed(String(seed));
  const hue = (hueFor(genre) + r.int(-25, 25) + 360) % 360;
  const style = eraStyle(year);
  const fgHue = (hue + 180 + r.int(-30, 30)) % 360;
  let bg = hsl(hue, r.int(40, 70), r.int(20, 32));
  let fg = hsl(fgHue, r.int(65, 95), r.int(64, 78));
  let accent = hsl((hue + 40) % 360, 70, 55);
  if (style === 'deco') { bg = hsl(hue, 30, 14); fg = C('#e8c45a'); accent = C('#a8843a'); }
  if (style === 'classic') { bg = hsl(hue, 55, 68); fg = C('#fff6e0'); accent = hsl((hue + 160) % 360, 65, 50); }
  if (style === 'punk') { bg = C('#efe9dc'); fg = C('#151313'); accent = hsl(hue, 85, 50); }
  if (style === 'neon') { bg = hsl(hue, 45, 9); fg = hsl(fgHue, 100, 66); accent = hsl((fgHue + 60) % 360, 100, 62); }
  if (style === 'grunge') { bg = hsl(hue, 22, 26); fg = C('#e6dccb'); accent = hsl(hue, 35, 40); }
  if (style === 'minimal') { bg = hsl(hue, 45, 52); fg = C('#fbfbf8'); accent = hsl(hue, 40, 38); }
  if (style === 'gloss') { bg = hsl(hue, 70, 45); fg = C('#ffffff'); accent = hsl(hue, 80, 70); }
  if (style === 'neural') { bg = hsl(195, 70, 10); fg = C('#6ff8f0'); accent = C('#e85ac8'); }
  return { hue, bg, fg, accent, dark: shade(bg, -0.6) };
}

// ---------- Logos ----------

type Mask = (x: number, y: number) => boolean;

function shapeMask(shape: number, n: number): Mask {
  const c = n / 2;
  if (shape === 0) return (x, y) => (x + 0.5 - c) ** 2 + (y + 0.5 - c) ** 2 <= (c - 1.5) ** 2;
  if (shape === 1) return (x, y) => {
    const rx = Math.max(0, Math.abs(x + 0.5 - c) - (c - 6));
    const ry = Math.max(0, Math.abs(y + 0.5 - c) - (c - 6));
    return x >= 1 && y >= 1 && x < n - 1 && y < n - 1 && rx * rx + ry * ry <= 20;
  };
  if (shape === 2) return (x, y) => Math.abs(x + 0.5 - c) + Math.abs(y + 0.5 - c) <= c - 1;
  if (shape === 3) return (x, y) => x >= 2 && x < n - 2 && y >= 2 && (y < n * 0.6 || Math.abs(x + 0.5 - c) <= (n - 2 - y) * 1.05);
  return (x, y) => (x + 0.5 - c) ** 2 + (y + 0.5 - c) ** 2 <= (c - 1) ** 2;
}

function drawInitials(p: Px, text: string, fg: Col, shadow: Col, cy: number, scale = 2): void {
  const w = textWidth(text, scale);
  const x = Math.round((p.w - w) / 2);
  drawText(p, text, x + 1, cy + 1, shadow, scale);
  drawText(p, text, x, cy, fg, scale);
}

/** Logo 32×32 em pixel art. */
export function logoPx(seed: number, name: string, genre: string, year: number): Px {
  const key = `L:${seed}:${name}:${eraStyle(year)}`;
  const hit = pxCache.get(key);
  if (hit) return hit;
  const N = 32;
  const r = Rng.fromSeed(String(seed));
  const col = logoColors(seed, genre, year);
  const style = eraStyle(year);
  r.int(0, 100); // descarta para variar a forma em relação às cores
  const shape = style === 'deco' ? (r.chance(0.6) ? 4 : 0) : r.int(0, 3);
  const inside = shapeMask(shape, N);
  const p = new Px(N, N);
  const ini = initials(name);
  // fundo + motivo
  p.fill((x, y) => {
    if (!inside(x, y)) return 0;
    const dx = x + 0.5 - N / 2;
    const dy = y + 0.5 - N / 2;
    const d = Math.sqrt(dx * dx + dy * dy);
    const ang = Math.atan2(dy, dx);
    switch (style) {
      case 'deco': {
        if (shape === 4) {
          if (d < 7) return d < 1.5 ? C('#151010') : col.fg;
          return Math.floor(d) % 2 ? C('#1c1716') : C('#2a2321');
        }
        const ray = Math.floor(((Math.atan2(y - N, x + 0.5 - N / 2) + Math.PI) / Math.PI) * 14) % 2;
        return ray ? shade(col.bg, 0.12) : col.bg;
      }
      case 'classic': {
        if (y >= 11 && y <= 20) return col.accent;
        return (x * 7 + y * 3) % 23 === 0 ? shade(col.bg, 0.4) : col.bg;
      }
      case 'psych': {
        const band = (d + Math.sin(ang * 4 + seed) * 2.2) / 3;
        const i = Math.floor(band);
        const f = band - i;
        const hues = [col.hue, col.hue + 50, col.hue + 110, col.hue + 200];
        const a = hsl(hues[i % 4], 80, 55);
        const b = hsl(hues[(i + 1) % 4], 80, 55);
        return dith(x, y, f > 0.75 ? (f - 0.75) * 4 : 0) ? b : a;
      }
      case 'punk': return noise(x, y, seed) < 0.08 ? C('#9a948a') : col.bg;
      case 'neon': {
        if (y > N * 0.55) {
          const yy = y - N * 0.55;
          if (Math.round(yy * yy * 0.18) !== Math.round((yy - 1) * (yy - 1) * 0.18) || Math.abs((x + 0.5 - N / 2) / (yy + 2)) % 1.2 < 0.12) return withAlpha(col.accent, 255);
        }
        return col.bg;
      }
      case 'grunge': {
        const n = noise(x, y, seed) * 0.6 + noise(x >> 1, y >> 1, seed + 1) * 0.4;
        return n > 0.72 ? shade(col.bg, 0.25) : n < 0.2 ? shade(col.bg, -0.3) : col.bg;
      }
      case 'gloss': return y < N * 0.45 ? mix(col.bg, C('#ffffff'), 0.22 + (dith(x, y, 0.5) ? 0.04 : 0)) : col.bg;
      case 'minimal': return col.bg;
      case 'neural': {
        const t = y / N;
        const g = mix(C('#0a2a3a'), C('#3a0a3a'), t);
        return y % 2 ? shade(g, -0.25) : g;
      }
    }
    return col.bg;
  });
  // borda interna
  if (style !== 'minimal' && style !== 'punk') {
    const border = style === 'neon' ? col.fg : style === 'deco' ? col.fg : shade(col.bg, -0.45);
    const src = p.clone();
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        if (!src.get(x, y)) continue;
        if (!src.get(x - 1, y) || !src.get(x + 1, y) || !src.get(x, y - 1) || !src.get(x, y + 1)) p.put(x, y, border);
      }
    if (style === 'deco' && shape !== 4) {
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          if (!src.get(x, y)) continue;
          const near = !src.get(x - 2, y) || !src.get(x + 2, y) || !src.get(x, y - 2) || !src.get(x, y + 2);
          const near3 = !src.get(x - 3, y) || !src.get(x + 3, y) || !src.get(x, y - 3) || !src.get(x, y + 3);
          if (!near && near3) p.put(x, y, shade(col.fg, -0.3));
        }
    }
  }
  // iniciais
  const cy = 11;
  if (style === 'punk') {
    let x = Math.round((N - textWidth(ini, 2) - 4) / 2);
    for (let i = 0; i < ini.length; i++) {
      const ch = ini[i];
      const w = textWidth(ch, 2);
      const bgc = i % 2 ? col.accent : C('#151313');
      const off = i % 2 ? -1 : 1;
      p.rect(x - 2, cy - 2 + off, w + 4, 14, bgc);
      drawText(p, ch, x, cy + off, i % 2 ? C('#151313') : C('#efe9dc'), 2);
      x += w + 4;
    }
  } else if (style === 'neon') {
    const w = textWidth(ini, 2);
    const x = Math.round((N - w) / 2);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) drawText(p, ini, x + dx, cy - 3 + dy, withAlpha(col.fg, 110), 2);
    drawText(p, ini, x, cy - 3, shade(col.fg, 0.5), 2);
  } else if (style === 'neural') {
    const w = textWidth(ini, 2);
    const x = Math.round((N - w) / 2);
    drawText(p, ini, x + 1, cy, col.accent, 2);
    drawText(p, ini, x, cy, col.fg, 2);
  } else if (style === 'minimal') {
    drawInitials(p, ini, col.fg, shade(col.bg, -0.2), cy, 2);
  } else if (style === 'deco' && shape === 4) {
    // selo de disco: iniciais pequenas no rótulo
    const w = textWidth(ini, 1);
    drawText(p, ini, Math.round((N - w) / 2), 14, C('#2a1810'), 1);
  } else {
    const w = textWidth(ini, 2);
    drawTextOutlined(p, ini, Math.round((N - w) / 2), cy, col.fg, col.dark, 2);
  }
  // pós-efeitos
  if (style === 'grunge') for (let i = 0; i < 4; i++) { const x = r.int(4, 27); p.line(x, r.int(2, 10), x + r.int(-3, 3), r.int(20, 30), withAlpha(C('#000000'), 70)); }
  if (style === 'neural') {
    const src = p.clone();
    for (let k = 0; k < 3; k++) {
      const y0 = r.pick([3, 5, 7, 23, 25, 27]);
      const sh = r.int(1, 3) * (r.chance(0.5) ? 1 : -1);
      for (let y = y0; y < y0 + r.int(1, 3); y++) for (let x = 0; x < N; x++) p.put(x, y, src.get(x - sh, y));
    }
  }
  p.outline(C('#120d10'));
  pxCache.set(key, p);
  return p;
}

export function logoUrl(seed: number, name: string, genre: string, year: number, size = 96): string {
  const key = `logo:${seed}:${name}:${eraStyle(year)}:${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const url = upscale(logoPx(seed, name, genre, year).canvas(), size).toDataURL();
  cache.set(key, url);
  return url;
}

/** Crachá 12×12 com iniciais (para a sede). */
export function badgePx(seed: number, name: string, genre: string, year: number): Px {
  const key = `B:${seed}:${name}:${eraStyle(year)}`;
  const hit = pxCache.get(key);
  if (hit) return hit;
  const col = logoColors(seed, genre, year);
  const ini = fitText(initials(name), 10);
  const w = Math.max(9, textWidth(ini) + 4);
  const p = new Px(w + 2, 11);
  p.rect(1, 1, w, 9, col.bg);
  p.hline(2, w - 1, 1, shade(col.bg, 0.25));
  drawText(p, ini, 1 + Math.round((w - textWidth(ini)) / 2), 3, col.fg);
  p.outline(C('#120d10'));
  pxCache.set(key, p);
  return p;
}

/** Cartaz 14×19 de um ato (paredes da sede). */
export function posterPx(seed: number, name: string, genre: string, year: number): Px {
  const key = `P:${seed}:${name}:${eraStyle(year)}`;
  const hit = pxCache.get(key);
  if (hit) return hit;
  const col = logoColors(seed, genre, year);
  const style = eraStyle(year);
  const p = new Px(14, 19);
  const paper = style === 'deco' || style === 'classic' ? C('#e8dcc0') : col.bg;
  p.rect(0, 0, 14, 19, paper);
  const r = Rng.fromSeed(`${seed}:poster`);
  const motif = r.int(0, 2);
  if (motif === 0) p.disc(7, 8, 4.5, col.accent);
  else if (motif === 1) for (let y = 3; y < 13; y += 2) p.hline(1, 12, y, mix(paper, col.accent, 0.7));
  else p.poly([[2, 13], [7, 3], [12, 13]], col.accent);
  const ini = fitText(initials(name), 12);
  drawText(p, ini, Math.round((14 - textWidth(ini)) / 2), 6, paper === col.bg ? col.fg : col.dark);
  p.hline(2, 11, 15, col.fg === paper ? col.dark : col.fg);
  p.hline(3, 9, 17, shade(paper, -0.3));
  // moldura
  for (let x = 0; x < 14; x++) { p.put(x, 0, shade(paper, -0.35)); p.put(x, 18, shade(paper, -0.45)); }
  for (let y = 0; y < 19; y++) { p.put(0, y, shade(paper, -0.35)); p.put(13, y, shade(paper, -0.45)); }
  pxCache.set(key, p);
  return p;
}

// ---------- Capas ----------

const COVER_N = 40;

export function coverPx(seed: number, title: string, actName: string, genre: string, year: number, budget = 0.5): Px {
  const style = eraStyle(year);
  const key = `C:${seed}:${style}:${Math.round(budget * 4)}`;
  const hit = pxCache.get(key);
  if (hit) return hit;
  const N = COVER_N;
  const r = Rng.fromSeed(String(seed));
  const hue = (hueFor(genre) + r.int(-40, 40) + 360) % 360;
  const sat = 30 + budget * 55;
  const rich = budget > 0.45;
  const p = new Px(N, N);
  const a = hsl(hue, sat, r.int(35, 55));
  const b = hsl((hue + r.int(30, 120)) % 360, sat, r.int(18, 38));
  const acc = hsl((hue + 160) % 360, 80, 66);
  const ink = C('#151214');
  const actTxt = fitText(actName, N - 4);
  const titleTxt = fitText(title, N - 4);
  switch (style) {
    case 'deco': {
      const kraft = C('#c9a878');
      p.fill((x, y) => (noise(x, y, seed) < 0.07 ? shade(kraft, -0.1) : kraft));
      // disco com rótulo
      p.disc(20, 20, 11.5, (x, y, d) => (d > 4.2 ? (Math.floor(d) % 2 ? C('#1b1717') : C('#2a2524')) : d < 0.9 ? C('#c9a878') : hsl(hue, 55, 45)));
      p.set(15, 14, withAlpha(C('#ffffff'), 90));
      p.set(16, 13, withAlpha(C('#ffffff'), 70));
      for (let x = 2; x < N - 2; x++) { p.put(x, 1, C('#5a3a20')); p.put(x, N - 2, C('#5a3a20')); }
      drawText(p, actTxt, Math.round((N - textWidth(actTxt)) / 2), 3, C('#3a2414'));
      drawText(p, titleTxt, Math.round((N - textWidth(titleTxt)) / 2), 35 - 1, C('#3a2414'));
      break;
    }
    case 'classic': {
      const pastel = hsl(hue, 50, 74);
      p.rect(0, 0, N, N, pastel);
      p.rect(0, 0, N, 26, hsl(hue, 45, 42));
      // silhueta com microfone
      const sx = r.int(13, 26);
      p.disc(sx, 12, 4, ink);
      p.poly([[sx - 9, 26], [sx - 6, 17], [sx + 6, 17], [sx + 9, 26]], ink);
      p.vline(sx + 8, 10, 25, C('#8a8a8a'));
      p.rect(sx + 7, 8, 3, 3, C('#c0c0c0'));
      if (rich) for (let i = 0; i < 6; i++) p.set(r.int(2, 37), r.int(2, 22), C('#fff6c8'));
      drawText(p, actTxt, 2, 2, C('#fff6e0'));
      p.rect(0, 28, N, 9, C('#fff6e0'));
      drawText(p, titleTxt, 2, 30, hsl(hue, 60, 35));
      break;
    }
    case 'psych': {
      const cx = r.int(12, 28);
      const cy = r.int(12, 28);
      p.fill((x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        const ang = Math.atan2(dy, dx);
        const band = (d + Math.sin(ang * 3 + d * 0.25) * 3) / 3.2;
        const i = Math.floor(band);
        const f = band - i;
        const hs = [hue, hue + 40, hue + 100, hue + 170, hue + 220];
        const c1 = hsl(hs[i % 5], 85, 55);
        const c2 = hsl(hs[(i + 1) % 5], 85, 55);
        return dith(x, y, f > 0.7 ? (f - 0.7) * 3.3 : 0) ? c2 : c1;
      });
      drawTextOutlined(p, actTxt, Math.round((N - textWidth(actTxt)) / 2), 3, C('#fff8e0'), ink);
      drawTextOutlined(p, titleTxt, Math.round((N - textWidth(titleTxt)) / 2), 32, C('#fff8e0'), ink);
      break;
    }
    case 'punk': {
      const paper = C('#efe9dc');
      p.rect(0, 0, N, N, paper);
      // foto xerox: blobs com limiar
      const bx = r.int(10, 30);
      const by = r.int(14, 24);
      p.fill((x, y) => {
        const v = noise(x >> 1, y >> 1, seed) * 0.5 + 0.9 - Math.hypot(x - bx, (y - by) * 1.2) / 14;
        return v > 0.75 ? ink : v > 0.6 && dith(x, y, 0.5) ? ink : 0;
      }, 0, 6, N, 26);
      p.rect(0, 30, N, 8, hsl(hue, 90, 50));
      drawText(p, titleTxt, 2, 32, ink);
      let x = 2;
      for (let i = 0; i < actTxt.length && x < N - 4; i++) {
        const ch = actTxt[i];
        const w = textWidth(ch);
        if (ch !== ' ') { p.rect(x - 1, 1 + (i % 2), w + 2, 7, i % 3 === 0 ? ink : i % 3 === 1 ? hsl(hue, 90, 50) : C('#ffffff')); drawText(p, ch, x, 2 + (i % 2), i % 3 === 0 ? paper : ink); }
        x += w + 2;
      }
      break;
    }
    case 'neon': {
      const sky0 = hsl(260, 60, 12);
      const sky1 = hsl(320, 70, 35);
      p.fill((x, y) => (y < 24 ? (dith(x, y, y / 24) ? sky1 : sky0) : hsl(270, 50, 8)));
      // sol com faixas
      p.disc(20, 20, 9, (x, y) => (y > 16 && (y - 16) % 3 === 0 ? 0 : mix(C('#ffd23a'), C('#ff3fa0'), Math.max(0, (y - 11) / 12))));
      p.rect(0, 24, N, 16, hsl(270, 50, 8));
      for (let k = 0; k < 6; k++) { const yy = 24 + Math.round(k * k * 0.45); p.hline(0, N - 1, yy, C('#ff3fd0')); }
      for (let k = -6; k <= 6; k++) p.line(20, 24, 20 + k * 9, 40, C('#c02cc0'));
      drawText(p, actTxt, Math.round((N - textWidth(actTxt)) / 2), 2, C('#5ff0ff'));
      drawTextOutlined(p, titleTxt, Math.round((N - textWidth(titleTxt)) / 2), 33, C('#f4f4ff'), C('#ff3fd0'));
      break;
    }
    case 'grunge': {
      const d0 = hsl(hue, 20, 14);
      const d1 = hsl(hue, 25, 42);
      const d2 = hsl(hue, 18, 70);
      const fx = r.int(14, 26);
      p.fill((x, y) => {
        const v = noise(x >> 2, y >> 2, seed) * 0.35 + noise(x, y, seed + 3) * 0.15 + 0.6 - Math.hypot(x - fx, y - 20) / 22;
        return v > 0.62 ? (dith(x, y, (v - 0.62) * 4) ? d2 : d1) : dith(x, y, v * 1.4) ? d1 : d0;
      });
      for (let i = 0; i < (rich ? 5 : 3); i++) { const x = r.int(0, N); p.line(x, 0, x + r.int(-4, 4), N, withAlpha(C('#e6dccb'), 50)); }
      drawText(p, actTxt, 3, 3, C('#e6dccb'));
      drawText(p, titleTxt, 3, 33, hsl(hue, 70, 60));
      break;
    }
    case 'gloss': {
      p.fill((x, y) => mix(a, b, y / N));
      p.poly([[0, 22], [N, 12], [N, 18], [0, 30]], withAlpha(C('#ffffff'), 80));
      p.disc(r.int(10, 30), r.int(8, 18), r.int(4, 7), withAlpha(acc, 200));
      p.fill((x, y) => (y < 14 ? withAlpha(C('#ffffff'), 30) : 0));
      drawText(p, actTxt, 3, 27, C('#ffffff'));
      drawText(p, titleTxt, 3, 34, withAlpha(C('#ffffff'), 190));
      break;
    }
    case 'minimal': {
      const flat = hsl(hue, 30 + budget * 30, r.int(55, 80));
      p.rect(0, 0, N, N, flat);
      const m = r.int(0, 3);
      const fg = hsl((hue + 180) % 360, 45, 30);
      if (m === 0) p.disc(20, 18, r.int(7, 11), fg);
      else if (m === 1) p.poly([[8, 28], [20, 8], [32, 28]], fg);
      else if (m === 2) p.rect(6, 17, 28, 2, fg);
      else for (let i = 0; i < 4; i++) p.rect(8 + i * 6, 10, 2, 18, fg);
      drawText(p, actTxt, 3, 32, shade(flat, -0.55));
      break;
    }
    case 'neural': {
      p.fill((x, y) => {
        const t = (x + y) / (2 * N);
        const c = mix(C('#0a3a4a'), C('#4a0a4a'), t);
        return y % 2 ? shade(c, -0.3) : c;
      });
      for (let i = 0; i < (rich ? 7 : 4); i++) p.rect(r.int(0, 34), r.int(4, 30), r.int(3, 12), r.int(1, 3), r.chance(0.5) ? withAlpha(C('#2ee8d8'), 170) : withAlpha(C('#e85ac8'), 170));
      p.ring(20, 19, 8, C('#6ff8f0'));
      drawText(p, actTxt, 3, 3, C('#6ff8f0'));
      drawText(p, titleTxt, 4, 33, C('#e85ac8'));
      drawText(p, titleTxt, 3, 33, C('#e8fcff'));
      break;
    }
  }
  if (!rich && style !== 'minimal') p.map((c) => mix(c, C('#808080'), 0.12));
  pxCache.set(key, p);
  return p;
}

export function coverUrl(seed: number, title: string, actName: string, genre: string, year: number, budget = 0.5, size = 160): string {
  const key = `cover:${seed}:${eraStyle(year)}:${Math.round(budget * 4)}:${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const url = upscale(coverPx(seed, title, actName, genre, year, budget).canvas(), size).toDataURL();
  cache.set(key, url);
  return url;
}
