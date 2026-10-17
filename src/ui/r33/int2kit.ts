// R33 · INT-2 (arte) — KIT dos interiores novos: casca da sala (parede, piso, rodapé, luz) e as peças que se repetem
// (balcão, estante, mesa, cadeira, janela, porta, relógio, quadro, planta, lâmpada, letreiro, tela, caixa de som).
// Tudo por código em `Px`, sem imagem externa nem texto de sistema: luz de cima à esquerda, sombra arroxeada, contorno
// escuro quente (`inked`), tons por `lv()`, paleta da época (`paletteOf`). Luz (halos, cones, telas acesas) em camada
// própria, sem contorno. Determinístico (sem sorteio): mesma entrada, mesmos pixels.

import { drawText, textWidth } from '../pixel/font';
import { paletteOf, type Palette } from '../pixel/palette';
import { C, INK, Px, dith, inked, lv, mix, noise, withAlpha, type Col } from '../pixel/px';

export const IW = 360;
export const IH = 150;
/** Linha onde a parede encontra o piso e linha dos pés das peças (as pessoas ficam entre as duas e a borda de baixo). */
export const WALL_Y = 96;
export const FY = 120;

export const epOf = (year: number): number => (year < 1920 ? 0 : year < 1950 ? 1 : year < 1970 ? 2 : year < 1990 ? 3 : year < 2010 ? 4 : 5);

export interface Room {
  p: Px; year: number; ep: number; pal: Palette; seed: number;
  /** camada de luz: desenhada por cima de tudo, sem contorno */ light: Px;
  /** a sala é escura (cabine, boate): véu no fim, lâmpadas e telas acesas por cima */ dim: boolean;
}
export type FloorK = 'wood' | 'checker' | 'concrete' | 'carpet' | 'tiles' | 'marble' | 'rubber' | 'glow';
export interface ShellO { wall?: Col; wall2?: Col; floorA?: Col; floorB?: Col; floor?: FloorK; kind?: 'wainscot' | 'brick' | 'plain' | 'tile' | 'panel' | 'stone'; dim?: boolean; ceil?: Col }

export function room(year: number, o: ShellO = {}, seed = 1): Room {
  const pal = paletteOf(year), p = new Px(IW, IH), light = new Px(IW, IH);
  const R: Room = { p, year, ep: epOf(year), pal, seed, light, dim: !!o.dim };
  const wall = o.wall ?? pal.wall, w2 = o.wall2 ?? pal.wall2, fa = o.floorA ?? pal.woodDark, fb = o.floorB ?? pal.wood, fk = o.floor ?? 'wood', wk = o.kind ?? 'wainscot';
  // parede: faixa de cima mais clara, fundo mais escuro (luz do alto), tom por linha
  for (let y = 0; y < WALL_Y; y++) {
    const t = y / WALL_Y;
    for (let x = 0; x < IW; x++) {
      let c = lv(wall, 3.6 - t * 1.1 - (x > IW * 0.9 ? 0.4 : 0));
      if (wk === 'brick') { const row = Math.floor(y / 5), off = row % 2 ? 4 : 0, mortar = y % 5 === 4 || (x + off) % 9 === 8; c = mortar ? lv(wall, 1.6 - t * 0.4) : lv(wall, 3.2 - t + noise(Math.floor((x + off) / 9), row, seed) * 0.7); }
      else if (wk === 'tile') { const g = x % 8 === 7 || y % 8 === 7; c = g ? lv(wall, 2.0) : lv(wall, 3.5 - t * 0.6); }
      else if (wk === 'stone') { const row = Math.floor(y / 10), off = row % 2 ? 9 : 0; const m = y % 10 === 9 || (x + off) % 18 === 17; c = m ? lv(wall, 2.0) : lv(wall, 3.4 - t * 0.8 + noise(Math.floor((x + off) / 18), row, seed + 3) * 0.5); }
      else if (wk === 'panel') { c = x % 14 === 0 ? lv(wall, 2.2) : lv(wall, 3.3 - t * 0.9 + (dith(x, y, 0.2) ? 0.2 : 0)); }
      else if (wk === 'wainscot' && dith(x, y, 0.12)) c = lv(wall, 3.3 - t * 1.1);
      p.put(x, y, c);
    }
  }
  if (wk === 'wainscot') { // lambri: dado de madeira, friso e tábuas
    const y0 = Math.round(WALL_Y * 0.62);
    for (let y = y0; y < WALL_Y; y++) for (let x = 0; x < IW; x++) p.put(x, y, x % 12 === 0 ? lv(w2, 1.6) : lv(w2, 3 - (y - y0) / 34 + (x % 12 === 1 ? 0.5 : 0)));
    p.hline(0, IW - 1, y0, lv(w2, 4.4)); p.hline(0, IW - 1, y0 + 1, lv(w2, 2));
  }
  // teto: sombra pontilhada
  const ceil = o.ceil ?? pal.trim;
  for (let y = 0; y < 7; y++) for (let x = 0; x < IW; x++) if (dith(x, y, 0.85 - y * 0.13)) p.put(x, y, mix(lv(ceil, 1), INK, 0.4));
  // piso: faixas que descem com leve perspectiva
  for (let y = WALL_Y; y < IH; y++) {
    const d = (y - WALL_Y) / (IH - WALL_Y);
    for (let x = 0; x < IW; x++) {
      let c = fa;
      if (fk === 'wood') { const w = 14 + Math.round(d * 6), col = Math.floor((x + Math.floor(d * 40)) / w); c = lv(col % 2 ? fa : fb, 2.6 + d * 0.8 + noise(col, Math.floor(y / 3), seed + 5) * 0.5); if ((x + Math.floor(d * 40)) % w === 0) c = lv(fa, 1.2); }
      else if (fk === 'checker') { const s = 12 + Math.round(d * 5), a = (Math.floor(x / s) + Math.floor((y - WALL_Y) / (s - 4))) % 2; c = lv(a ? fa : fb, 2.8 + d * 0.7); }
      else if (fk === 'marble') { const s = 22, a = (Math.floor(x / s) + Math.floor((y - WALL_Y) / 9)) % 2; c = lv(a ? fa : fb, 3.2 + d * 0.5 + noise(x >> 2, y >> 1, seed + 9) * 0.4); if (x % s === 0 || (y - WALL_Y) % 9 === 0) c = lv(fa, 2); }
      else if (fk === 'tiles') { c = lv(fa, 3 + d * 0.6 + (dith(x, y, 0.1) ? 0.3 : 0)); if (x % 14 === 0 || (y - WALL_Y) % 7 === 0) c = lv(fb, 2.4); }
      else if (fk === 'carpet') c = lv(fa, 2.8 + d * 0.5 + (noise(x, y, seed + 2) > 0.7 ? 0.5 : 0));
      else if (fk === 'rubber') c = lv(fa, 2.5 + d * 0.5 + (dith(x, y, 0.1) ? 0.2 : 0));
      else if (fk === 'glow') { const s = 16, a = (Math.floor(x / s) + Math.floor((y - WALL_Y) / 8)) % 2; c = lv(a ? fa : fb, 2.2 + d * 0.4); }
      else c = lv(fa, 2.6 + d * 0.7 + (dith(x, y, 0.12) ? 0.25 : 0) - noise(x >> 1, y >> 1, seed + 1) * 0.3);
      p.put(x, y, c);
    }
  }
  // rodapé e quina de baixo da parede (oclusão arroxeada)
  p.hline(0, IW - 1, WALL_Y - 1, lv(pal.trim, 4)); p.hline(0, IW - 1, WALL_Y, lv(pal.trim, 1.6)); p.hline(0, IW - 1, WALL_Y + 1, withAlpha(C('#3a2050'), 140));
  p.hline(0, IW - 1, WALL_Y + 2, withAlpha(C('#3a2050'), 70));
  for (let i = 0; i < 4; i++) { p.vline(i, 0, IH - 1, withAlpha(C('#2a1638'), 90 - i * 22)); p.vline(IW - 1 - i, 0, IH - 1, withAlpha(C('#2a1638'), 80 - i * 20)); }
  return R;
}

/** Fecha a cena: luz por cima e, nas salas escuras, o véu (a luz fica fora do véu). */
export function seal(R: Room): Px {
  if (R.dim) for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) R.p.set(x, y, withAlpha(C('#0c0822'), 78 + (y < WALL_Y ? 14 : 0)));
  R.p.blit(R.light, 0, 0);
  return R.p;
}

// ---------------------------------------------------------------- primitivas

/** Caixa chanfrada com a luz de cima à esquerda. */
export function bev(q: Px, x: number, y: number, w: number, h: number, base: Col, o: { top?: number; side?: number } = {}): void {
  if (w < 1 || h < 1) return;
  q.rect(x, y, w, h, lv(base, 3));
  q.hline(x, x + w - 1, y, lv(base, 4.4 + (o.top ?? 0))); if (h > 2) q.vline(x, y, y + h - 1, lv(base, 4));
  if (w > 2) q.vline(x + w - 1, y, y + h - 1, lv(base, 2 + (o.side ?? 0)));
  if (h > 2) q.hline(x, x + w - 1, y + h - 1, lv(base, 1.4));
}
/** Veio de madeira (tom 2 e 4 em traços curtos) sobre uma área já pintada. */
export function grain(q: Px, x: number, y: number, w: number, h: number, base: Col, seed = 0): void {
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) { const n = noise(i >> 2, j, seed); if (n > 0.86) q.set(x + i, y + j, lv(base, 2.2)); else if (n < 0.06) q.set(x + i, y + j, lv(base, 4)); }
}
/** Sombra no chão sob a peça. */
export function shadow(p: Px, x: number, y: number, w: number, a = 120): void {
  p.ellipse(x + w / 2, y - 1, w / 2 + 2, 2.2, withAlpha(C('#2a1638'), a));
}
/** Desenha uma peça numa camada própria e a contorna (INK) ao colar na sala. */
export const obj = (R: Room, draw: (q: Px) => void): void => inked(R.p, draw);

// ---------------------------------------------------------------- peças

export function counter(R: Room, x: number, w: number, o: { h?: number; top?: Col; body?: Col; glass?: boolean; y?: number } = {}): void {
  const h = o.h ?? 24, y = (o.y ?? FY) - h, body = o.body ?? R.pal.wood, top = o.top ?? R.pal.woodDark;
  shadow(R.p, x, y + h, w);
  obj(R, (q) => {
    bev(q, x, y + 4, w, h - 4, body); grain(q, x, y + 4, w, h - 4, body, x);
    for (let i = x + 6; i < x + w - 6; i += 18) { q.rect(i, y + 8, 12, h - 10, lv(body, 2.4)); q.hline(i, i + 11, y + 8, lv(body, 1.6)); q.vline(i, y + 8, y + h - 3, lv(body, 1.8)); }
    bev(q, x - 2, y, w + 4, 4, top, { top: 0.4 }); q.hline(x - 2, x + w + 1, y, lv(top, 5));
    if (o.glass) { q.rect(x + 2, y - 14, w - 4, 14, withAlpha(R.pal.glass, 70)); q.vline(x + 2, y - 14, y - 1, lv(R.pal.metal, 4)); q.vline(x + w - 3, y - 14, y - 1, lv(R.pal.metal, 3)); q.hline(x + 2, x + w - 3, y - 14, lv(R.pal.metal, 4)); }
  });
}
/** Estante com a mercadoria: lombadas (livros), capas quadradas (discos), pilhas de pano, caixas com visor, pães ou potes. */
export type Stock = 'spine' | 'sleeve' | 'cloth' | 'box' | 'loaf' | 'jar';
export function shelf(R: Room, x: number, y: number, w: number, h: number, cs: Col[], o: { rows?: number; wood?: Col; stock?: Stock } = {}): void {
  const wood = o.wood ?? R.pal.woodDark, rows = o.rows ?? Math.max(2, Math.floor(h / 15)), st = o.stock ?? 'spine';
  shadow(R.p, x, y + h, w, 90);
  obj(R, (q) => {
    bev(q, x, y, w, h, wood); q.rect(x + 2, y + 2, w - 4, h - 4, lv(wood, 0.8));
    const rh = Math.floor((h - 4) / rows);
    for (let r = 0; r < rows; r++) {
      const ry = y + 2 + r * rh, base = ry + rh - 2;
      let ix = x + 3, k = 0;
      while (ix < x + w - 4) {
        if (st !== 'spine' && ix + 13 > x + w - 3) break;
        const n = noise(ix, r, R.seed), c = cs[(k++ + r) % cs.length];
        let iw = 3;
        if (st === 'spine') { iw = 2 + Math.floor(n * 3); const bh = rh - 3 - Math.floor(noise(ix, r + 7, R.seed) * 4); q.rect(ix, base - bh, iw, bh, lv(c, 3)); q.vline(ix, base - bh, base - 1, lv(c, 4.2)); q.vline(ix + iw - 1, base - bh, base - 1, lv(c, 2)); }
        else if (st === 'sleeve') { iw = Math.min(rh - 3, 9); const bh = iw; q.rect(ix, base - bh, iw, bh, lv(c, 3)); q.hline(ix, ix + iw - 1, base - bh, lv(c, 4.4)); q.vline(ix + iw - 1, base - bh, base - 1, lv(c, 2)); q.disc(ix + iw / 2, base - bh / 2, Math.max(1, iw / 4), lv(R.pal.paper, 3.6)); iw += 1; }
        else if (st === 'cloth') { iw = 12; const bh = 4 + Math.floor(n * 3); for (let t = 0; t < Math.floor((rh - 3) / 5); t++) { q.rect(ix, base - 5 - t * 5, iw, 5, lv(cs[(k + t) % cs.length], 3 - t * 0.2)); q.hline(ix, ix + iw - 1, base - 5 - t * 5, lv(cs[(k + t) % cs.length], 4.4)); } void bh; iw += 1; }
        else if (st === 'box') { iw = 9; const bh = Math.min(rh - 3, 11); q.rect(ix, base - bh, iw, bh, lv(c, 2.6)); q.hline(ix, ix + iw - 1, base - bh, lv(c, 4)); q.rect(ix + 2, base - bh + 2, iw - 4, bh - 6, n > 0.5 ? lv(R.pal.glass, 3.6) : lv(C('#14141c'), 3)); iw += 1; }
        else if (st === 'loaf') { iw = 11; q.ellipse(ix + iw / 2, base - 4, iw / 2, 3.4, lv(cs[k % cs.length], 3.2)); q.hline(ix + 2, ix + iw - 3, base - 6, lv(cs[k % cs.length], 4.6)); iw += 1; }
        else { iw = 6; const bh = Math.min(rh - 3, 10); q.rect(ix, base - bh, iw, bh, lv(c, 3)); q.rect(ix + 1, base - bh - 2, iw - 2, 2, lv(R.pal.metal, 3.4)); q.vline(ix + 1, base - bh + 1, base - 2, lv(c, 4.6)); iw += 1; }
        ix += iw; if (noise(ix, r + 3, R.seed) > 0.85) ix += 2;
      }
      q.hline(x + 2, x + w - 3, ry + rh - 2, lv(wood, 4)); q.hline(x + 2, x + w - 3, ry + rh - 1, lv(wood, 1.4));
    }
  });
}
export function table(R: Room, x: number, y: number, w: number, o: { top?: Col; legs?: Col; cloth?: Col } = {}): void {
  const top = o.top ?? R.pal.wood, legs = o.legs ?? R.pal.woodDark, h = 15;
  shadow(R.p, x, y, w, 100);
  obj(R, (q) => {
    if (o.cloth) { bev(q, x, y - h, w, 4, o.cloth, { top: 0.3 }); q.rect(x + 2, y - h + 4, w - 4, h - 4, lv(o.cloth, 2.6)); q.vline(x + 2, y - h + 4, y - 1, lv(o.cloth, 3.6)); }
    else { q.rect(x + 3, y - h + 3, 2, h - 3, lv(legs, 2.4)); q.rect(x + w - 5, y - h + 3, 2, h - 3, lv(legs, 2)); bev(q, x, y - h, w, 4, top, { top: 0.4 }); }
  });
}
export function chair(R: Room, x: number, y: number, c: Col, back = true, flip = false): void {
  shadow(R.p, x, y, 11, 90);
  obj(R, (q) => {
    q.rect(x + 1, y - 7, 2, 7, lv(R.pal.woodDark, 2.2)); q.rect(x + 8, y - 7, 2, 7, lv(R.pal.woodDark, 1.8));
    bev(q, x, y - 10, 11, 4, c);
    if (back) bev(q, flip ? x + 8 : x, y - 22, 3, 13, c);
  });
}
export function windowP(R: Room, x: number, y: number, w: number, h: number, o: { night?: boolean } = {}): void {
  const sky = o.night ? C('#1c2250') : R.pal.sky;
  obj(R, (q) => {
    bev(q, x - 2, y - 2, w + 4, h + 4, R.pal.trim);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) q.set(x + i, y + j, lv(sky, o.night ? 2.6 : 3 + (1 - j / h) * 1.2));
    if (o.night) for (let i = 0; i < 5; i++) q.set(x + 3 + ((i * 7) % (w - 5)), y + 3 + ((i * 5) % (h - 6)), C('#ffe9a8'));
    else { q.rect(x + 2, y + h - 8, Math.floor(w / 3), 8, lv(C('#707a8a'), 2.6)); q.rect(x + Math.floor(w / 2), y + h - 12, Math.floor(w / 3), 12, lv(C('#8a7a6a'), 2.4)); }
    q.vline(x + (w >> 1), y, y + h - 1, lv(R.pal.trim, 3.4)); q.hline(x, x + w - 1, y + (h >> 1), lv(R.pal.trim, 3.4));
    q.hline(x, x + w - 1, y, lv(R.pal.trim, 4.6));
  });
  R.light.rect(x, y, Math.floor(w * 0.45), 3, withAlpha(C('#fff6d0'), 70));
}
export function doorP(R: Room, x: number, y: number, o: { glass?: boolean; body?: Col; exit?: boolean } = {}): void {
  const body = o.body ?? R.pal.wood, h = 38, w = 22;
  shadow(R.p, x, y, w, 80);
  obj(R, (q) => {
    bev(q, x - 2, y - h - 2, w + 4, h + 2, R.pal.trim);
    bev(q, x, y - h, w, h, body); grain(q, x, y - h, w, h, body, x);
    if (o.glass) { q.rect(x + 4, y - h + 5, w - 8, 18, withAlpha(R.pal.glass, 120)); q.hline(x + 4, x + w - 5, y - h + 5, lv(R.pal.metal, 4)); }
    else { q.rect(x + 4, y - h + 5, w - 8, 12, lv(body, 2.4)); q.rect(x + 4, y - h + 21, w - 8, 12, lv(body, 2.4)); }
    q.rect(x + w - 6, y - 19, 2, 3, lv(R.pal.metal, 4.4));
  });
  if (o.exit) { R.light.rect(x + 4, y - h - 8, 14, 5, C('#2ee07a')); drawText(R.light, 'EXIT', x + 5, y - h - 7, C('#06301a')); }
}
export function clockP(R: Room, cx: number, cy: number, r = 7, face = C('#efe6cc')): void {
  obj(R, (q) => { q.disc(cx, cy, r, lv(R.pal.metal, 3)); q.disc(cx, cy, r - 2, lv(face, 4)); q.line(cx, cy, cx, cy - r + 3, INK); q.line(cx, cy, cx + r - 4, cy + 1, INK); q.set(cx, cy, lv(R.pal.accent2, 3)); });
}
export function picture(R: Room, x: number, y: number, w: number, h: number, c1: Col, c2: Col): void {
  obj(R, (q) => {
    bev(q, x, y, w, h, R.pal.gold);
    for (let j = 2; j < h - 2; j++) for (let i = 2; i < w - 2; i++) q.set(x + i, y + j, lv(j < h / 2 ? c1 : c2, 3 - noise(i, j, x) * 0.7));
    q.hline(x + 2, x + w - 3, y + (h >> 1), lv(c2, 4));
  });
}
export function plant(R: Room, x: number, y: number, tall = 22): void {
  shadow(R.p, x - 4, y, 14, 80);
  obj(R, (q) => {
    bev(q, x - 3, y - 9, 10, 9, R.pal.pot);
    for (let k = 0; k < 7; k++) { const a = -1.2 + k * 0.4, lx = x + 2 + Math.round(Math.sin(a) * (tall * 0.4)), ly = y - 9 - Math.round(Math.cos(a) * tall * 0.9); q.line(x + 2, y - 9, lx, ly, lv(R.pal.plant, 2.6)); q.disc(lx, ly, 2.4, lv(R.pal.plant, 3 + (k % 3) * 0.5)); }
  });
}
/** Lâmpada pendente com halo (a luz fica na camada própria). */
export function lampHang(R: Room, x: number, y: number, len = 16, col?: Col): void {
  const c = col ?? R.pal.lamp;
  obj(R, (q) => { q.vline(x, y, y + len - 5, lv(R.pal.metal, 2)); q.rect(x - 3, y + len - 5, 7, 4, lv(R.pal.metal, 3.4)); });
  R.light.disc(x + 0.5, y + len, 3, withAlpha(c, 255)); R.light.disc(x + 0.5, y + len + 2, 13, withAlpha(c, 38)); R.light.disc(x + 0.5, y + len + 2, 7, withAlpha(c, 52));
}
/** Letreiro: placa com texto na fonte do jogo, centrado (sem acento, sem fonte do sistema). */
export function signBoard(R: Room, cx: number, y: number, text: string, o: { bg?: Col; fg?: Col; scale?: number; glow?: boolean } = {}): void {
  const sc = o.scale ?? 1, tw = textWidth(text, sc), w = tw + 8, x = Math.round(cx - w / 2), bg = o.bg ?? R.pal.woodDark, fg = o.fg ?? R.pal.gold;
  obj(R, (q) => { bev(q, x, y, w, 5 * sc + 6, bg); drawText(q, text, x + 4, y + 3, fg, sc); });
  if (o.glow) R.light.rect(x - 2, y - 1, w + 4, 5 * sc + 8, withAlpha(fg, 34));
}
/** Tela (monitor, TV, telão): corpo + vidro aceso na camada de luz. */
export function screenP(R: Room, x: number, y: number, w: number, h: number, glow: Col, o: { crt?: boolean; stand?: boolean } = {}): void {
  obj(R, (q) => {
    bev(q, x, y, w, h, lv(C('#3a3c44'), o.crt ? 3.4 : 2.6));
    if (o.stand !== false) { q.rect(x + (w >> 1) - 2, y + h, 5, 3, lv(C('#3a3c44'), 2.4)); q.rect(x + (w >> 1) - 6, y + h + 3, 13, 2, lv(C('#3a3c44'), 3)); }
  });
  R.p.rect(x + 2, y + 2, w - 4, h - 4, lv(glow, 3));
  for (let j = 0; j < h - 4; j += 2) R.p.hline(x + 2, x + w - 3, y + 2 + j, lv(glow, 3.8));
  R.light.rect(x - 2, y - 2, w + 4, h + 4, withAlpha(glow, 26));
}
export function speaker(R: Room, x: number, y: number, h = 22): void {
  shadow(R.p, x, y, 13, 90);
  obj(R, (q) => { bev(q, x, y - h, 13, h, lv(C('#2a2a32'), 3)); q.disc(x + 6.5, y - h + 6, 3.4, lv(C('#6a6a74'), 3)); q.disc(x + 6.5, y - 7, 4.4, lv(C('#6a6a74'), 3)); q.set(x + 6, y - 7, lv(C('#9a9aa4'), 5)); });
}
export function bench(R: Room, x: number, y: number, w: number, c?: Col): void {
  const col = c ?? R.pal.wood;
  shadow(R.p, x, y, w, 90);
  obj(R, (q) => { bev(q, x, y - 11, w, 4, col, { top: 0.4 }); bev(q, x, y - 21, w, 8, lv(col, 2.6)); q.rect(x + 3, y - 7, 2, 7, lv(R.pal.woodDark, 2)); q.rect(x + w - 5, y - 7, 2, 7, lv(R.pal.woodDark, 1.8)); });
}
export function pillar(R: Room, x: number, w: number, c?: Col, top = 0): void {
  const col = c ?? R.pal.wall;
  obj(R, (q) => { bev(q, x, top, w, FY - top, col); q.rect(x - 2, top, w + 4, 4, lv(col, 3.6)); q.rect(x - 2, FY - 5, w + 4, 5, lv(col, 3)); q.vline(x + 2, top + 4, FY - 6, lv(col, 4.2)); });
}
export function poster(R: Room, x: number, y: number, w: number, h: number, a: Col, b: Col, text?: string): void {
  obj(R, (q) => {
    q.rect(x, y, w, h, lv(R.pal.paper, 3.6));
    q.rect(x + 2, y + 2, w - 4, Math.floor((h - 4) * 0.6), lv(a, 3)); q.rect(x + 2, y + 2 + Math.floor((h - 4) * 0.6), w - 4, Math.ceil((h - 4) * 0.4), lv(b, 3));
    if (text) drawText(q, text, x + 3, y + h - 7, INK);
    q.hline(x, x + w - 1, y, lv(R.pal.paper, 5));
  });
}
/** Faixa de luz de néon (camada de luz) com o brilho em volta. */
export function neon(R: Room, x: number, y: number, w: number, c: Col, h = 2): void {
  R.light.rect(x - 3, y - 3, w + 6, h + 6, withAlpha(c, 28)); R.light.rect(x - 1, y - 1, w + 2, h + 2, withAlpha(c, 70)); R.light.rect(x, y, w, h, c);
}
export const cols = (...hex: string[]): Col[] => hex.map((h) => C(h));
