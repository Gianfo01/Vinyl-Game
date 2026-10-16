// Kit de desenho dos locais (vista frontal 2.5D): parede ao fundo, piso com perspectiva,
// caixas com luz do alto à esquerda e contorno escuro, cortinas, telões, janelas, placas e fileiras
// de plateia. Tudo em Px (sem antialiasing), com a paleta da era e o estilo do pacote de assets:
// rampa de 6 tons (sombra arroxeada, luz quente), contorno INK de 1 px nos objetos e linhas internas escuras.

import { drawText, textWidth } from '../font';
import type { Palette } from '../palette';
import { C, HOUSE, INK, Px, dith, discV, glint, inked, lv, mix, noise, tint, withAlpha, type Col } from '../px';

export const W = 256;
export const H = 144;

/**
 * Parede de fundo entre y0 e y1: sanca com fio de luz no alto, reboco/papel/lambri, sombra de oclusão
 * descendo do teto e subindo do rodapé, rodapé saliente com luz no topo e linha escura no pé.
 */
export function wall(p: Px, pal: Palette, y0: number, y1: number, base = pal.wall, kind = pal.wallKind): void {
  const hgt = y1 - y0;
  const wainTop = Math.floor(y1 - hgt / 3);
  for (let y = y0; y < y1; y++)
    for (let x = 0; x < p.w; x++) {
      let c = base;
      if (kind === 'wainscot' && y > wainTop) {
        // lambri de mogno com almofadas, régua de latão no topo
        const w2 = pal.wall2;
        const px = x % 24;
        const py = y - wainTop;
        if (py === 1) c = lv(HOUSE.brass, x % 9 === 2 ? 5 : 4);
        else if (py === 2) c = lv(HOUSE.brass, 1.6);
        else if (py === 3) c = lv(w2, 1);
        else if (px === 0) c = lv(w2, 1.2);
        else if (px === 1) c = lv(w2, 4);
        else if (py === 6) c = lv(w2, 1.6);
        else if (py === 7) c = lv(w2, 3.8);
        else c = px > 19 ? lv(w2, 2.6) : w2;
      } else if (kind === 'paper') c = x % 8 < 4 ? base : mix(base, pal.wall2, 0.25);
      else if (kind === 'panel') {
        const board = Math.floor(x / 10);
        const bc = noise(board, 0, 7) > 0.5 ? base : lv(base, 2.6);
        c = x % 10 === 0 ? lv(base, 1) : x % 10 === 1 ? lv(bc, 3.8) : noise(board, y >> 3, 7) > 0.85 ? lv(bc, 2.4) : bc;
      } else if (kind === 'brick') {
        const row = Math.floor(y / 6);
        const off = (row % 2) * 6;
        const bc = noise(Math.floor((x + off) / 12), row, 4) > 0.75 ? lv(base, 2.6) : base;
        c = y % 6 === 0 || (x + off) % 12 === 0 ? lv(base, 1.2) : y % 6 === 1 && (x + off) % 12 !== 11 ? lv(bc, 3.7) : bc;
      } else if (kind === 'glass') c = x % 24 === 0 ? lv(base, 4) : x % 24 === 1 ? lv(base, 1.8) : mix(base, pal.glass, dith(x, y, ((y - y0) / hgt) * 0.3) ? 0.18 : 0.05);
      else if (kind === 'tile') c = x % 8 === 0 || y % 8 === 0 ? lv(base, 1.6) : x % 8 === 1 || y % 8 === 1 ? lv(base, 3.7) : base;
      else c = noise(x >> 2, y >> 2, 13) > 0.9 ? lv(base, 2.7) : base; // reboco liso com manchas largas
      // oclusão no alto (sob a sanca) e embaixo (sobre o rodapé)
      const top = y - y0;
      const bot = y1 - 1 - y;
      if (top < 6 && dith(x, y, (6 - top) / 7)) c = tint(c, -0.16);
      else if (bot < 10 && bot > 3 && dith(x, y, (10 - bot) / 14)) c = tint(c, -0.12);
      p.put(x, y, c);
    }
  // sanca
  if (y0 <= 0) {
    p.hline(0, p.w - 1, y0, lv(pal.trim, 2));
    p.hline(0, p.w - 1, y0 + 1, lv(pal.trim, 4));
    p.hline(0, p.w - 1, y0 + 2, INK);
  }
  // rodapé
  p.hline(0, p.w - 1, y1 - 4, INK);
  p.hline(0, p.w - 1, y1 - 3, lv(pal.trim, 4));
  p.hline(0, p.w - 1, y1 - 2, pal.trim);
  p.hline(0, p.w - 1, y1 - 1, lv(pal.trim, 1));
}

export type FloorStyle = 'boards' | 'tiles' | 'carpet' | 'grass' | 'concrete' | 'checker' | 'glow' | 'asphalt';

/** Piso de y0 até o fim, com linhas convergindo para o centro e sombra arroxeada ao fundo. */
export function floor(p: Px, y0: number, a: Col, b: Col, style: FloorStyle = 'boards', y1 = p.h): void {
  const cx = p.w / 2;
  const span = Math.max(1, y1 - y0);
  for (let y = y0; y < y1; y++) {
    const depth = (y - y0 + 4) / (span + 4); // 0 longe .. 1 perto
    const k = 0.7 + depth * 0.6;
    for (let x = 0; x < p.w; x++) {
      const u = (x - cx) / k; // coordenada "do mundo"
      const un = (x + 1 - cx) / k;
      let c = a;
      if (style === 'boards') {
        // tábuas em perspectiva: junta escura (tom 1), fio de luz à esquerda, emendas desencontradas
        const plank = Math.floor(u / 10);
        const seam = Math.floor(un / 10) !== plank;
        const base = plank % 2 ? a : b;
        const row = Math.floor((y - y0) / Math.max(3, 4 + depth * 10));
        const butt = noise(plank, row, 3) > 0.8 && (y - y0) % Math.max(3, Math.round(4 + depth * 10)) === 0;
        c = seam ? lv(base, 1.2) : butt ? lv(base, 1.8) : Math.floor((u - 1) / 10) !== plank ? lv(base, 3.6) : noise(plank, (y - y0) >> 2, 9) > 0.9 ? lv(base, 2.6) : base;
      } else if (style === 'tiles') {
        const rowH = Math.max(2, Math.round(3 + depth * 6));
        const grout = Math.abs(Math.floor(u)) % 14 === 0 || (y - y0) % rowH === 0;
        c = grout ? lv(b, 1.4) : (y - y0) % rowH === 1 ? lv(a, 3.7) : a;
      } else if (style === 'checker') {
        const rowH = 2 + depth * 6;
        const cell = (Math.floor(u / 12) + Math.floor((y - y0) / rowH)) % 2 ? a : b;
        c = Math.floor((y - y0 + 1) / rowH) !== Math.floor((y - y0) / rowH) ? lv(cell, 2) : cell;
      } else if (style === 'carpet') c = (x + y * 2) % 4 === 0 ? lv(a, 2.5) : (x + y * 2) % 4 === 2 && dith(x, y, 0.5) ? mix(a, b, 0.5) : noise(x >> 3, y >> 2, 5) > 0.75 ? mix(a, b, 0.6) : a;
      else if (style === 'grass') {
        const n = noise(x >> 2, y >> 1, 3);
        c = n > 0.8 ? ((y >> 1) % 2 === 0 ? lv(a, 3.8) : lv(b, 2.4)) : n < 0.3 ? b : a;
      } else if (style === 'concrete') {
        const slab = Math.abs(Math.floor(u)) % 40 === 0 || (y - y0) % Math.max(4, Math.round(6 + depth * 14)) === 0;
        c = slab ? lv(a, 2) : noise(Math.floor(u / 16), (y - y0) >> 3, 5) > 0.75 && dith(x, y, 0.5) ? mix(a, b, 0.6) : noise(x, y, 5) > 0.985 ? lv(a, 2.5) : a;
      } else if (style === 'asphalt') c = noise(x >> 1, y >> 1, 11) > 0.72 ? b : noise(x, y, 12) > 0.99 ? lv(a, 4) : a;
      else if (style === 'glow') c = Math.abs(Math.floor(u)) % 16 === 0 ? withAlpha(b, 255) : a;
      // escurece ao fundo (roxo da rampa)
      if (depth < 0.4 && dith(x, y, (0.4 - depth) * 1.6)) c = tint(c, -0.16);
      p.put(x, y, c);
    }
  }
  // sombra de contato logo abaixo da parede/palco
  for (let x = 0; x < p.w; x++) if (dith(x, y0, 0.5)) p.put(x, y0, tint(p.get(x, y0), -0.24));
}

/** Caixa frontal com topo (profundidade d), luz da esquerda e contorno (INK por padrão; 0 = sem contorno). */
export function box(p: Px, x: number, y: number, w: number, h: number, col: Col, d = 3, outline: Col = INK): void {
  const draw = (q: Px) => {
    if (d > 0) {
      q.poly([[x, y], [x + w, y], [x + w - d, y - d], [x + d, y - d]], lv(col, 4));
      q.hline(x + d, x + w - d - 1, y - d, lv(col, 4.6));
    }
    q.rect(x, y, w, h, col);
    // linha interna entre o topo e a frente, luz na quina esquerda, sombra à direita e no pé
    if (d > 0) q.hline(x, x + w - 1, y, lv(col, 2));
    q.vline(x, y, y + h - 1, lv(col, 3.8));
    q.vline(x + w - 1, y, y + h - 1, lv(col, 1.6));
    q.vline(x + w - 2, y + 1, y + h - 1, lv(col, 2.4));
    q.hline(x, x + w - 1, y + h - 1, lv(col, 1));
  };
  if (outline) inked(p, draw, outline);
  else draw(p);
}

/** Moldura de 1 px. */
export function frame(p: Px, x: number, y: number, w: number, h: number, col: Col): void {
  p.hline(x, x + w - 1, y, col);
  p.hline(x, x + w - 1, y + h - 1, col);
  p.vline(x, y, y + h - 1, col);
  p.vline(x + w - 1, y, y + h - 1, col);
}

/** Cortina de veludo: pregas em 6 tons (vale escuro, crista com luz quente), bainha e varão de latão. */
export function curtain(p: Px, x: number, y: number, w: number, h: number, col: Col, swag = true): void {
  for (let i = 0; i < w; i++) {
    const f = Math.sin((i / 5) * Math.PI);
    const f2 = Math.sin(((i + 1) / 5) * Math.PI);
    // crista iluminada do lado esquerdo da prega, vale com linha escura
    const n = f > 0.85 ? 4.4 : f > 0.3 ? (f2 < f ? 3 : 3.6) : f > -0.4 ? 2.2 : f > -0.9 ? 1.4 : 0.6;
    for (let j = 0; j < h; j++) {
      const lift = j > h - 4 ? -0.8 : 0; // bainha em sombra
      p.set(x + i, y + j, lv(col, Math.max(0, n + lift)));
    }
  }
  if (swag) {
    for (let i = 0; i < w; i++) {
      const sag = 3 + Math.round(Math.abs(Math.sin((i / w) * Math.PI * 3)) * 3);
      p.vline(x + i, y, y + sag - 1, lv(col, 1.6));
      p.set(x + i, y + sag, INK);
      p.set(x + i, y + sag - 1, lv(col, 3.4));
    }
    p.hline(x, x + w - 1, y, lv(HOUSE.brass, 4));
    p.hline(x, x + w - 1, y + 1, lv(HOUSE.brass, 2));
  }
}

/** Telão / tela / quadro com moldura, contorno e reflexo diagonal. */
export function screen(p: Px, x: number, y: number, w: number, h: number, body: Col, rim: Col, scan = true): void {
  frame(p, x - 3, y - 3, w + 6, h + 6, INK);
  p.rect(x - 2, y - 2, w + 4, h + 4, rim);
  p.hline(x - 2, x + w + 1, y - 2, lv(rim, 4));
  p.vline(x - 2, y - 2, y + h + 1, lv(rim, 3.6));
  p.hline(x - 2, x + w + 1, y + h + 1, lv(rim, 1.4));
  p.rect(x, y, w, h, body);
  p.hline(x, x + w - 1, y, lv(body, 1.6)); // sombra da moldura no vidro
  for (let j = 1; j < h; j++) {
    if (scan && j % 2 === 0) p.hline(x, x + w - 1, y + j, lv(body, 3.3));
  }
  // reflexo: brilho curto no canto de cima à direita (R31 POL: o risco diagonal cortava a 1ª linha de texto dos painéis)
  for (let i = 0; i < Math.min(5, Math.min(w, h) / 2); i++) p.set(x + w - 3 - i, y + Math.min(h - 1, 1 + Math.floor(i / 2)), withAlpha(C('#fff0d0'), 60));
}

/** Cone de luz translúcido (quente). */
export function beam(p: Px, x: number, y: number, bottomY: number, spread: number, col: Col, alpha = 40): void {
  const c = withAlpha(mix(col, C('#fff0c8'), 0.25), alpha);
  const core = withAlpha(mix(col, C('#fff8e8'), 0.5), Math.round(alpha * 0.7));
  p.poly([[x - 1, y], [x + 1, y], [x + spread, bottomY], [x - spread, bottomY]], (px, py) => (dith(px, py, 0.6) ? c : 0));
  p.poly([[x, y], [x + 1, y], [x + spread * 0.35, bottomY], [x - spread * 0.35, bottomY]], (px, py) => (dith(px, py, 0.4) ? core : 0));
  // poça de luz no chão
  p.ellipse(x, bottomY, spread * 0.9, Math.max(2, spread * 0.18), (px, py) => (dith(px, py, 0.5) ? withAlpha(C('#fff0c8'), Math.round(alpha * 0.9)) : 0));
}

/** Placa com texto (fonte 3×5): contorno, chanfro de luz e sombra. */
export function sign(p: Px, cx: number, y: number, text: string, fg: Col, bg: Col, rim?: Col, scale = 1): void {
  const w = textWidth(text, scale) + 6;
  const x = Math.round(cx - w / 2);
  const hh = 5 * scale + 4;
  p.rect(x, y, w, hh, bg);
  p.hline(x, x + w - 1, y, lv(bg, 4));
  p.hline(x, x + w - 1, y + hh - 1, lv(bg, 1.6));
  if (rim !== undefined) {
    frame(p, x - 1, y - 1, w + 2, hh + 2, rim);
    p.hline(x - 1, x + w, y - 1, lv(rim, 4.4));
    frame(p, x - 2, y - 2, w + 4, hh + 4, INK);
  } else frame(p, x - 1, y - 1, w + 2, hh + 2, INK);
  drawText(p, text, x + 3, y + 2, fg, scale);
}

/** Janela com vista (dia, noite, cidade, árvores): caixilho com luz/sombra, contorno e peitoril. */
export function windowPane(p: Px, x: number, y: number, w: number, h: number, pal: Palette, view: 'day' | 'night' | 'city' | 'trees' = 'day'): void {
  const sky = view === 'night' || view === 'city' ? C('#1a2240') : pal.sky;
  for (let j = 0; j < h; j++) p.hline(x, x + w - 1, y + j, lv(sky, 3 + (view === 'night' || view === 'city' ? -j / h : (1 - j / h) * 0.9)));
  if (view === 'city' || view === 'night') {
    for (let i = 0; i < w; i += 7) {
      const bh = 6 + Math.floor(noise(i, 3, x) * (h - 6));
      p.rect(x + i, y + h - bh, 6, bh, C('#232a44'));
      p.vline(x + i, y + h - bh, y + h - 1, C('#2e3656'));
      for (let j = y + h - bh + 2; j < y + h - 1; j += 3) for (let k = 1; k < 5; k += 2) if (noise(i + k, j, 4) > 0.55) p.put(x + i + k, j, C('#ffd889'));
    }
  } else if (view === 'trees') {
    for (let i = 0; i < w; i += 6) discV(p, x + i + 3, y + h - 4, 5, tint(pal.plant, noise(i, 1, 2) * 0.3 - 0.15), { ink: false });
  } else {
    p.disc(x + w - 6, y + 6, 3, withAlpha(C('#fff6c8'), 200));
  }
  // reflexo
  for (let i = 0; i < Math.min(w, h) / 2; i++) p.set(x + 3 + i, y + h - 3 - i, withAlpha(C('#ffffff'), 50));
  const t = pal.trim;
  frame(p, x - 2, y - 2, w + 4, h + 4, INK);
  frame(p, x - 1, y - 1, w + 2, h + 2, t);
  p.hline(x - 1, x + w, y - 1, lv(t, 4));
  p.vline(x - 1, y - 1, y + h, lv(t, 3.6));
  p.vline(x + Math.floor(w / 2), y, y + h - 1, t);
  p.vline(x + Math.floor(w / 2) + 1, y, y + h - 1, lv(t, 1.4));
  p.hline(x, x + w - 1, y + Math.floor(h / 2), t);
  p.hline(x, x + w - 1, y + Math.floor(h / 2) + 1, lv(t, 1.4));
  p.hline(x, x + w - 1, y, lv(sky, 1.6));
  // peitoril
  p.hline(x - 3, x + w + 2, y + h + 2, lv(t, 4));
  p.hline(x - 3, x + w + 2, y + h + 3, INK);
}

/** Estante com lombadas coloridas (discos, livros, pastas). */
export function shelf(p: Px, x: number, y: number, w: number, h: number, pal: Palette, seed = 0): void {
  box(p, x, y, w, h, pal.woodDark, 2);
  p.rect(x + 2, y + 2, w - 4, h - 5, lv(pal.woodDark, 0.8));
  for (let row = y + 2; row < y + h - 3; row += 8) {
    p.hline(x + 1, x + w - 2, row + 6, lv(pal.wood, 4));
    p.hline(x + 1, x + w - 2, row + 7, lv(pal.wood, 1.4));
    for (let i = x + 2; i < x + w - 2; i += 2) {
      const n = noise(i, row, seed);
      if (n < 0.1) continue;
      const hue = [pal.accent, pal.accent2, pal.fabric, pal.fabric2, pal.paper, pal.metal][Math.floor(n * 6)];
      const top = row + 1 + Math.floor(n * 2);
      p.set(i, top, lv(hue, 4));
      p.vline(i, top + 1, row + 5, hue);
    }
  }
}

/** Fileiras de poltronas de teatro (vistas de trás), da linha y para baixo: encosto estofado e contorno. */
export function seatRows(p: Px, y: number, rows: number, col: Col, gap = 7): void {
  for (let r = 0; r < rows; r++) {
    const yy = y + r * gap;
    const sw = 8 + r;
    for (let x = -(r * 3) % sw; x < p.w; x += sw + 1) {
      p.rect(x, yy, sw, 5, col);
      p.hline(x + 1, x + sw - 2, yy, lv(col, 4));
      p.vline(x, yy, yy + 4, lv(col, 3.6));
      p.vline(x + sw - 1, yy, yy + 4, lv(col, 1.6));
      p.hline(x, x + sw - 1, yy + 4, lv(col, 1.2));
      p.vline(x + sw, yy, yy + 4, INK);
      p.hline(x, x + sw - 1, yy + 5, INK);
    }
  }
}

/** Mesa frontal (tampo + pernas) com contorno. */
export function table(p: Px, x: number, y: number, w: number, h: number, col: Col, cloth?: Col): void {
  inked(p, (q) => {
    const top = cloth ?? col;
    q.poly([[x, y], [x + w, y], [x + w - 4, y - 5], [x + 4, y - 5]], lv(top, 3.8));
    q.hline(x + 4, x + w - 5, y - 5, lv(top, 4.6));
    if (cloth !== undefined) {
      q.rect(x, y, w, h, cloth);
      q.hline(x, x + w - 1, y, lv(cloth, 2));
      for (let i = x; i < x + w; i += 4) { q.vline(i, y + 1, y + h - 1, lv(cloth, 2.2)); q.vline(i + 1, y + 1, y + h - 1, lv(cloth, 3.5)); }
      q.hline(x, x + w - 1, y + h - 1, lv(cloth, 1.4));
    } else {
      q.rect(x, y, w, 3, col);
      q.hline(x, x + w - 1, y, lv(col, 4));
      q.hline(x, x + w - 1, y + 2, lv(col, 1.6));
      q.rect(x + 2, y + 3, 2, h - 3, lv(col, 2));
      q.vline(x + 2, y + 3, y + h - 1, lv(col, 3.4));
      q.rect(x + w - 4, y + 3, 2, h - 3, lv(col, 1.6));
    }
  });
}

/** Palco: tablado de tábuas com borda de latão e frente em sombra, com contorno. */
export function stagePlatform(p: Px, x: number, y: number, w: number, h: number, top: Col, front: Col): void {
  inked(p, (q) => {
    q.rect(x, y, w, 5, top);
    q.hline(x, x + w - 1, y, lv(top, 4.4));
    for (let i = x + 6; i < x + w; i += 12) q.vline(i, y + 1, y + 4, lv(top, 2));
    q.hline(x, x + w - 1, y + 4, lv(top, 2.2));
    // borda de latão (com brilho) e linha escura entre camadas
    q.hline(x, x + w - 1, y + 5, lv(HOUSE.brass, 4));
    for (let i = x + 3; i < x + w; i += 17) glint(q, i, y + 5, HOUSE.brass, 2);
    q.hline(x, x + w - 1, y + 6, INK);
    q.rect(x, y + 7, w, h - 7, front);
    for (let i = x; i < x + w; i += 16) { q.vline(i, y + 7, y + h - 1, lv(front, 1.2)); q.vline(i + 1, y + 7, y + h - 1, lv(front, 3.6)); }
    q.hline(x, x + w - 1, y + h - 1, lv(front, 1));
  });
}

/** Holofotes no teto: treliça cromada e latas com lente acesa, contornadas. */
export function lightRig(p: Px, y: number, pal: Palette, n = 6, x0 = 10, x1 = W - 10): void {
  inked(p, (q) => {
    const m = pal.metalDark;
    q.hline(x0, x1, y, lv(m, 4));
    q.hline(x0, x1, y + 1, lv(m, 2));
    for (let x = x0; x < x1; x += 6) q.set(x, y + 1, lv(m, 1));
    for (let i = 0; i < n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * (i + 0.5)) / n);
      q.vline(x, y + 2, y + 2, lv(m, 1.4));
      q.rect(x - 2, y + 3, 5, 4, pal.metal);
      q.vline(x - 2, y + 3, y + 6, lv(pal.metal, 4));
      q.vline(x + 2, y + 3, y + 6, lv(pal.metal, 1.6));
      glint(q, x - 1, y + 3, pal.metal);
      q.rect(x - 1, y + 7, 3, 1, lv(pal.glow, 4.4));
    }
  });
}

/** Planta em vaso (frontal): folhas com volume, vaso com luz e contorno. */
export function plant(p: Px, x: number, y: number, pal: Palette): void {
  inked(p, (q) => {
    for (let i = 0; i < 9; i++) discV(q, x + Math.round(Math.sin(i * 1.7) * 4), y - 8 - (i % 4) * 2, 2.6, tint(pal.plant, (i % 3) * 0.08 - 0.08), { ink: false, r: 2 });
    q.rect(x - 3, y - 5, 7, 5, pal.pot);
    q.hline(x - 3, x + 3, y - 5, lv(pal.pot, 4));
    q.vline(x - 3, y - 4, y - 1, lv(pal.pot, 3.6));
    q.vline(x + 3, y - 4, y - 1, lv(pal.pot, 1.6));
    q.hline(x - 3, x + 3, y - 4, lv(pal.pot, 1.4));
  });
}

/** Escada ou arquibancada (degraus horizontais): espelho em sombra, quina com luz. */
export function bleachers(p: Px, y0: number, y1: number, col: Col): void {
  for (let y = y0; y < y1; y++) p.hline(0, p.w - 1, y, (y - y0) % 5 === 0 ? lv(col, 1) : (y - y0) % 5 === 1 ? lv(col, 4) : (y - y0) % 5 === 4 ? lv(col, 2.2) : col);
}

/** Céu em faixas (6 tons entre o alto e o horizonte), com pontilhado só na transição entre faixas. */
export function sky(p: Px, y0: number, y1: number, top: Col, bottom: Col): void {
  const n = 6;
  for (let y = y0; y < y1; y++) {
    const t = ((y - y0) / Math.max(1, y1 - y0)) * (n - 1);
    const i = Math.floor(t);
    const f = t - i;
    const a = mix(top, bottom, i / (n - 1));
    const b = mix(top, bottom, Math.min(n - 1, i + 1) / (n - 1));
    for (let x = 0; x < p.w; x++) p.put(x, y, f > 0.6 && dith(x, y, (f - 0.6) / 0.4) ? b : a);
  }
}

/** Fachada com vitrine/porta para cenas de rua. */
export function facade(p: Px, x: number, y: number, w: number, h: number, col: Col, pal: Palette, label = ''): void {
  box(p, x, y, w, h, col, 0);
  p.rect(x, y, w, 4, lv(col, 1.4));
  p.hline(x, x + w - 1, y + 4, lv(col, 4));
  const wy = y + 12;
  p.rect(x + 4, wy, w - 8, h - 16, pal.glass);
  frame(p, x + 3, wy - 1, w - 6, h - 14, INK);
  p.hline(x + 4, x + w - 5, wy, lv(pal.glass, 1.8));
  for (let i = x + 4; i < x + w - 4; i += 12) { p.vline(i, wy, y + h - 5, lv(col, 1.6)); p.vline(i + 1, wy, y + h - 5, lv(col, 3.6)); }
  if (label) sign(p, x + w / 2, y + 4, label, pal.paper, tint(pal.accent2, -0.2));
}

/** Cartazes colados (rua): papel com sombra de cola e contorno. */
export function posters(p: Px, x: number, y: number, n: number, pal: Palette, seed = 1): void {
  for (let i = 0; i < n; i++) {
    const c = [pal.accent, pal.accent2, pal.fabric, pal.fabric2, pal.gold][Math.floor(noise(i, seed, 2) * 5)];
    const px = x + i * 11;
    const py = y + Math.floor(noise(i, seed, 5) * 4);
    frame(p, px - 1, py - 1, 12, 16, INK);
    p.rect(px, py, 10, 14, pal.paper);
    p.vline(px + 9, py, py + 13, lv(pal.paper, 2.2));
    p.rect(px + 1, py + 1, 8, 7, c);
    p.hline(px + 1, px + 8, py + 1, lv(c, 4));
    p.hline(px + 1, px + 8, py + 10, lv(c, 1.6));
    p.hline(px + 2, px + 6, py + 12, lv(c, 1.6));
  }
}
