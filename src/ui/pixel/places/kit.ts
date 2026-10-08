// Kit de desenho dos locais (vista frontal 2.5D): parede ao fundo, piso com perspectiva,
// caixas com luz do alto à esquerda e contorno escuro, cortinas, telões, janelas, placas e fileiras
// de plateia. Tudo em Px (sem antialiasing), com a paleta da era.

import { drawText, textWidth } from '../font';
import type { Palette } from '../palette';
import { C, Px, dith, mix, noise, shade, withAlpha, type Col } from '../px';

export const W = 256;
export const H = 144;

/** Parede de fundo entre y0 e y1. */
export function wall(p: Px, pal: Palette, y0: number, y1: number, base = pal.wall, kind = pal.wallKind): void {
  const dark = shade(base, -0.12);
  for (let y = y0; y < y1; y++)
    for (let x = 0; x < p.w; x++) {
      let c = base;
      if (kind === 'wainscot' && y > y1 - (y1 - y0) / 3) c = (x % 12 === 0 || y === Math.floor(y1 - (y1 - y0) / 3) + 1) ? shade(pal.wall2, -0.25) : pal.wall2;
      else if (kind === 'paper') c = (x % 8 < 4) ? base : mix(base, pal.wall2, 0.25);
      else if (kind === 'panel') c = x % 10 === 0 ? shade(base, -0.3) : mix(base, shade(base, -0.1), noise(x >> 1, y >> 3, 7) * 0.6);
      else if (kind === 'brick') c = ((y % 6 === 0) || ((x + (Math.floor(y / 6) % 2) * 6) % 12 === 0)) ? dark : base;
      else if (kind === 'glass') c = (x % 24 === 0) ? shade(base, 0.25) : mix(base, pal.glass, dith(x, y, (y - y0) / (y1 - y0) * 0.3) ? 0.18 : 0.05);
      else if (kind === 'tile') c = (x % 8 === 0 || y % 8 === 0) ? dark : base;
      else c = dith(x, y, 0.12) ? dark : base;
      p.put(x, y, c);
    }
  p.hline(0, p.w - 1, y1 - 1, pal.trim);
  p.hline(0, p.w - 1, y1 - 2, shade(pal.trim, 0.15));
}

export type FloorStyle = 'boards' | 'tiles' | 'carpet' | 'grass' | 'concrete' | 'checker' | 'glow' | 'asphalt';

/** Piso de y0 até o fim, com linhas convergindo para o centro. */
export function floor(p: Px, y0: number, a: Col, b: Col, style: FloorStyle = 'boards', y1 = p.h): void {
  const cx = p.w / 2;
  for (let y = y0; y < y1; y++) {
    const depth = (y - y0 + 4) / (y1 - y0 + 4); // 0 longe .. 1 perto
    for (let x = 0; x < p.w; x++) {
      const u = (x - cx) / (0.7 + depth * 0.6); // coordenada "do mundo"
      let c = a;
      if (style === 'boards') c = Math.floor(u / 10) % 2 ? a : b;
      else if (style === 'tiles') c = (Math.abs(Math.floor(u)) % 14 === 0 || (y - y0) % Math.max(2, Math.round(3 + depth * 6)) === 0) ? b : a;
      else if (style === 'checker') c = (Math.floor(u / 12) + Math.floor((y - y0) / (2 + depth * 6))) % 2 ? a : b;
      else if (style === 'carpet') c = dith(x, y, 0.25) ? b : a;
      else if (style === 'grass') c = noise(x, y, 3) > 0.7 ? b : noise(x >> 1, y, 9) > 0.85 ? shade(a, 0.15) : a;
      else if (style === 'concrete') c = noise(x, y, 5) > 0.82 ? b : a;
      else if (style === 'asphalt') c = noise(x, y, 11) > 0.75 ? b : a;
      else if (style === 'glow') c = (Math.abs(Math.floor(u)) % 16 === 0) ? withAlpha(b, 255) : a;
      // escurece ao fundo
      if (depth < 0.35 && dith(x, y, (0.35 - depth) * 1.4)) c = shade(c, -0.12);
      p.put(x, y, c);
    }
  }
}

/** Caixa frontal com topo (profundidade d), luz da esquerda e contorno. */
export function box(p: Px, x: number, y: number, w: number, h: number, col: Col, d = 3, outline?: Col): void {
  if (d > 0) p.poly([[x, y], [x + w, y], [x + w - d, y - d], [x + d, y - d]], shade(col, 0.22));
  p.rect(x, y, w, h, col);
  p.vline(x, y, y + h - 1, shade(col, 0.12));
  p.vline(x + w - 1, y, y + h - 1, shade(col, -0.22));
  p.hline(x, x + w - 1, y + h - 1, shade(col, -0.3));
  if (outline !== undefined) frame(p, x, y - d, w, h + d, outline);
}

/** Moldura de 1 px. */
export function frame(p: Px, x: number, y: number, w: number, h: number, col: Col): void {
  p.hline(x, x + w - 1, y, col);
  p.hline(x, x + w - 1, y + h - 1, col);
  p.vline(x, y, y + h - 1, col);
  p.vline(x + w - 1, y, y + h - 1, col);
}

/** Cortina de veludo com pregas. */
export function curtain(p: Px, x: number, y: number, w: number, h: number, col: Col, swag = true): void {
  for (let i = 0; i < w; i++) {
    const f = Math.sin((i / 5) * Math.PI);
    const c = f > 0.4 ? shade(col, 0.18) : f < -0.4 ? shade(col, -0.28) : col;
    p.vline(x + i, y, y + h - 1, c);
  }
  if (swag) for (let i = 0; i < w; i++) p.vline(x + i, y, y + 3 + Math.round(Math.abs(Math.sin((i / w) * Math.PI * 3)) * 3), shade(col, -0.35));
}

/** Telão / tela / quadro com moldura e brilho. */
export function screen(p: Px, x: number, y: number, w: number, h: number, body: Col, rim: Col, scan = true): void {
  p.rect(x - 2, y - 2, w + 4, h + 4, rim);
  p.rect(x, y, w, h, body);
  for (let j = 0; j < h; j++) {
    if (scan && j % 2 === 0) p.hline(x, x + w - 1, y + j, shade(body, 0.06));
  }
  p.line(x + 2, y + 2, x + Math.min(w, h) / 2, y + 2, withAlpha(C('#ffffff'), 70));
}

/** Cone de luz translúcido. */
export function beam(p: Px, x: number, y: number, bottomY: number, spread: number, col: Col, alpha = 40): void {
  const c = withAlpha(col, alpha);
  p.poly([[x - 1, y], [x + 1, y], [x + spread, bottomY], [x - spread, bottomY]], (px, py) => (dith(px, py, 0.6) ? c : 0));
}

/** Placa com texto (fonte 3×5). */
export function sign(p: Px, cx: number, y: number, text: string, fg: Col, bg: Col, rim?: Col, scale = 1): void {
  const w = textWidth(text, scale) + 6;
  const x = Math.round(cx - w / 2);
  p.rect(x, y, w, 5 * scale + 4, bg);
  if (rim !== undefined) frame(p, x - 1, y - 1, w + 2, 5 * scale + 6, rim);
  drawText(p, text, x + 3, y + 2, fg, scale);
}

/** Janela com vista (dia, noite, cidade, árvores). */
export function windowPane(p: Px, x: number, y: number, w: number, h: number, pal: Palette, view: 'day' | 'night' | 'city' | 'trees' = 'day'): void {
  const sky = view === 'night' || view === 'city' ? C('#1a2240') : pal.sky;
  p.rect(x, y, w, h, sky);
  if (view === 'city' || view === 'night') {
    for (let i = 0; i < w; i += 7) {
      const bh = 6 + Math.floor(noise(i, 3, x) * (h - 6));
      p.rect(x + i, y + h - bh, 6, bh, C('#232a44'));
      for (let j = y + h - bh + 2; j < y + h - 1; j += 3) for (let k = 1; k < 5; k += 2) if (noise(i + k, j, 4) > 0.55) p.put(x + i + k, j, C('#ffd889'));
    }
  } else if (view === 'trees') {
    for (let i = 0; i < w; i += 6) p.disc(x + i + 3, y + h - 4, 5, shade(pal.plant, noise(i, 1, 2) * 0.3 - 0.15));
  } else {
    p.disc(x + w - 6, y + 6, 3, withAlpha(C('#fff6c8'), 200));
  }
  frame(p, x - 1, y - 1, w + 2, h + 2, pal.trim);
  p.vline(x + Math.floor(w / 2), y, y + h - 1, pal.trim);
  p.hline(x, x + w - 1, y + Math.floor(h / 2), pal.trim);
}

/** Estante com lombadas coloridas (discos, livros, pastas). */
export function shelf(p: Px, x: number, y: number, w: number, h: number, pal: Palette, seed = 0): void {
  box(p, x, y, w, h, pal.woodDark, 2);
  for (let row = y + 2; row < y + h - 3; row += 8) {
    p.hline(x + 1, x + w - 2, row + 6, pal.wood);
    for (let i = x + 2; i < x + w - 2; i += 2) {
      const n = noise(i, row, seed);
      if (n < 0.1) continue;
      const hue = [pal.accent, pal.accent2, pal.fabric, pal.fabric2, pal.paper, pal.metal][Math.floor(n * 6)];
      p.vline(i, row + 1 + Math.floor(n * 2), row + 5, hue);
    }
  }
}

/** Fileiras de poltronas de teatro (vistas de trás), da linha y para baixo. */
export function seatRows(p: Px, y: number, rows: number, col: Col, gap = 7): void {
  for (let r = 0; r < rows; r++) {
    const yy = y + r * gap;
    const sw = 8 + r;
    for (let x = -(r * 3) % sw; x < p.w; x += sw + 1) {
      p.rect(x, yy, sw, 5, col);
      p.hline(x, x + sw - 1, yy, shade(col, 0.2));
      p.vline(x + sw - 1, yy, yy + 4, shade(col, -0.3));
    }
  }
}

/** Mesa frontal (tampo + pernas). */
export function table(p: Px, x: number, y: number, w: number, h: number, col: Col, cloth?: Col): void {
  p.poly([[x, y], [x + w, y], [x + w - 4, y - 5], [x + 4, y - 5]], shade(cloth ?? col, 0.15));
  if (cloth !== undefined) {
    p.rect(x, y, w, h, cloth);
    for (let i = x; i < x + w; i += 4) p.vline(i, y, y + h - 1, shade(cloth, -0.12));
  } else {
    p.rect(x, y, w, 3, col);
    p.rect(x + 2, y + 3, 2, h - 3, shade(col, -0.25));
    p.rect(x + w - 4, y + 3, 2, h - 3, shade(col, -0.25));
  }
}

/** Palco: plataforma com borda frontal. */
export function stagePlatform(p: Px, x: number, y: number, w: number, h: number, top: Col, front: Col): void {
  p.rect(x, y, w, 2, shade(top, 0.25));
  p.rect(x, y + 2, w, 3, top);
  p.rect(x, y + 5, w, h - 5, front);
  for (let i = x; i < x + w; i += 16) p.vline(i, y + 5, y + h - 1, shade(front, -0.2));
}

/** Holofotes no teto. */
export function lightRig(p: Px, y: number, pal: Palette, n = 6, x0 = 10, x1 = W - 10): void {
  p.hline(x0, x1, y, pal.metalDark);
  p.hline(x0, x1, y + 1, shade(pal.metalDark, -0.2));
  for (let i = 0; i < n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * (i + 0.5)) / n);
    p.rect(x - 2, y + 2, 5, 4, pal.metal);
    p.rect(x - 1, y + 6, 3, 1, pal.glow);
  }
}

/** Planta em vaso (frontal). */
export function plant(p: Px, x: number, y: number, pal: Palette): void {
  p.rect(x - 3, y - 5, 7, 5, pal.pot);
  p.hline(x - 3, x + 3, y - 5, shade(pal.pot, 0.2));
  for (let i = 0; i < 9; i++) p.disc(x + Math.round(Math.sin(i * 1.7) * 4), y - 8 - (i % 4) * 2, 2.2, shade(pal.plant, (i % 3) * 0.1 - 0.1));
}

/** Escada ou arquibancada (degraus horizontais). */
export function bleachers(p: Px, y0: number, y1: number, col: Col): void {
  for (let y = y0; y < y1; y++) p.hline(0, p.w - 1, y, (y - y0) % 5 === 0 ? shade(col, -0.25) : (y - y0) % 5 === 1 ? shade(col, 0.15) : col);
}

/** Céu com gradiente pontilhado (dia/entardecer/noite). */
export function sky(p: Px, y0: number, y1: number, top: Col, bottom: Col): void {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0);
    for (let x = 0; x < p.w; x++) p.put(x, y, dith(x, y, t) ? bottom : top);
  }
}

/** Fachada com vitrine/porta para cenas de rua. */
export function facade(p: Px, x: number, y: number, w: number, h: number, col: Col, pal: Palette, label = ''): void {
  box(p, x, y, w, h, col, 0);
  p.rect(x, y, w, 4, shade(col, -0.3));
  const wy = y + 12;
  p.rect(x + 4, wy, w - 8, h - 16, pal.glass);
  for (let i = x + 4; i < x + w - 4; i += 12) p.vline(i, wy, y + h - 5, shade(col, -0.2));
  if (label) sign(p, x + w / 2, y + 4, label, pal.paper, shade(pal.accent2, -0.2));
}

/** Cartazes colados (rua). */
export function posters(p: Px, x: number, y: number, n: number, pal: Palette, seed = 1): void {
  for (let i = 0; i < n; i++) {
    const c = [pal.accent, pal.accent2, pal.fabric, pal.fabric2, pal.gold][Math.floor(noise(i, seed, 2) * 5)];
    const px = x + i * 11;
    const py = y + Math.floor(noise(i, seed, 5) * 4);
    p.rect(px, py, 10, 14, pal.paper);
    p.rect(px + 1, py + 1, 8, 7, c);
    p.hline(px + 1, px + 8, py + 10, shade(c, -0.3));
    p.hline(px + 2, px + 6, py + 12, shade(c, -0.3));
  }
}
