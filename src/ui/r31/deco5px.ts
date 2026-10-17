// R31 · DECO-M — DESENHO das peças de decoração e do cômodo do modo Arrumar, enquanto a DECO-A não publica
// `src/ui/pixel/deco31px.ts`. Mesmo estilo do jogo (px.ts: corte lateral, luz de cima à esquerda, contorno INK, cores da
// paleta da época e do estilo da peça). Obrigatórios usam o desenho de exp5px quando existe.
// A DECO-A troca tudo de uma vez por `registerDecoArt5(fn)` (devolve null para cair neste desenho).
// PURO (só Px) e determinístico: mesma peça, mesmos pixels.

import type { DecoDef31, DecoStyle31, UpgDef31 } from '../../data/deco31';
import { paletteOf, type Palette } from '../pixel/palette';
import { C, INK, Px, discV, ellipseV, lv, mix, rectV, shade, withAlpha, type Col } from '../pixel/px';
import { obj5Px, type Obj5 } from '../pixel/exp5px';
import { drawText, textWidth } from '../pixel/font';

export type DecoArt5 = (d: DecoDef31, year: number) => Px | null;
let ART: DecoArt5 | null = null;
/** Ponto de troca para a DECO-A (deco31px.ts): desenho definitivo por peça. */
export function registerDecoArt5(fn: DecoArt5): void { ART = fn; }

const hash = (s: string): number => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };

/** Cores do estilo: [principal, secundária, detalhe]. */
function styleCols(st: DecoStyle31, p: Palette): [Col, Col, Col] {
  switch (st) {
    case 'nouveau': return [C('#6a4228'), C('#5f7a48'), C('#c09048')];
    case 'deco': return [C('#2a2630'), C('#e6d8b4'), C('#d8a840')];
    case 'fifties': return [C('#3fb0a8'), C('#e88aa0'), C('#d23c3c')];
    case 'seventies': return [C('#c8641e'), C('#7a4a26'), C('#d8a830')];
    case 'eighties': return [C('#c040a0'), C('#40c0d8'), C('#8a8a98')];
    case 'nineties': return [C('#2e2e36'), C('#5a6a8a'), C('#a8a8b0')];
    case 'minimal': return [C('#e4e0d8'), C('#c8a878'), C('#4a4a4a')];
    case 'smart': return [C('#eef2f6'), C('#5aa0e8'), C('#38e0d0')];
    default: return [p.wood, p.fabric, p.accent];
  }
}
const has = (id: string, ...ks: string[]) => ks.some((k) => id.includes(k));

// peças comuns (mesma conta do exp5px/prim27: luz de cima à esquerda, pé em sombra)
const W0 = C('#f8f4ec'), PAPER = C('#efe6cc'), GOLD = C('#e0b048'), BRASS = C('#c09048'), CHROME = C('#b8bcc8');
const BLACK = C('#1e1c22'), DGREY = C('#4a4c56'), GREY = C('#8a8c94'), GLOW = C('#ffe08a'), SCR = C('#7ad0f0');
const blk = (p: Px, x: number, y: number, w: number, h: number, c: Col): void => {
  if (w <= 0 || h <= 0) return;
  p.rect(x, y, w, h, c);
  p.hline(x, x + w - 1, y, lv(c, 4));
  if (h > 3 && w > 3) p.vline(x, y + 1, y + h - 2, lv(c, 3.5));
  p.hline(x, x + w - 1, y + h - 1, lv(c, 1));
  if (h > 2) p.vline(x + w - 1, y + 1, y + h - 2, lv(c, 2));
};
const framed = (p: Px, x: number, y: number, w: number, h: number, t: number, fr: Col, inner: Col): void => {
  blk(p, x, y, w, h, fr);
  p.rect(x + t, y + t, w - 2 * t, h - 2 * t, inner);
  p.hline(x + t, x + w - t - 1, y + t, lv(inner, 2));
};
/** Prego e barbante: o quadro não flutua. */
const hang = (p: Px, cx: number, x0: number, x1: number, yb: number): void => {
  const s = C('#4a3a30');
  p.line(cx, 0, x0, yb, s); p.line(cx, 0, x1, yb, s); p.put(cx, 0, C('#8a8a92'));
};
/** Pés por estilo (torneado, tubo cromado, palito, bloco, plinto). */
function legs(p: Px, x0: number, x1: number, y: number, h: number, st: DecoStyle31, wood: Col): void {
  if (h <= 0) return;
  const xs = [x0, x1];
  for (const x of xs) {
    if (st === 'nouveau') { p.vline(x, y, y + h - 1, lv(wood, 1.5)); p.put(x + 1, y + Math.floor(h / 2), lv(wood, 3)); p.put(x, y + h - 1, BRASS); }
    else if (st === 'deco' || st === 'eighties' || st === 'smart') { p.vline(x, y, y + h - 1, CHROME); p.vline(x + 1, y, y + h - 1, lv(CHROME, 1.5)); }
    else if (st === 'fifties') { p.line(x, y, x + (x === x0 ? -1 : 1), y + h - 1, BLACK); }
    else if (st === 'minimal' || st === 'nineties') { p.rect(x, y, 2, h, st === 'minimal' ? C('#c8a878') : BLACK); }
    else blk(p, x, y, 3, h, lv(wood, 1.4));
  }
}

/** Uma peça decorativa (tamanho do catálogo; superfícies 0×0 não têm peça: o cômodo pinta). */
export function decoPx5(d: DecoDef31, year: number, brand = ''): Px {
  const a = ART?.(d, year);
  if (a) return a;
  const pal = paletteOf(year);
  const [m, s2, x] = styleCols(d.style, pal);
  const id = d.id, st = d.style;
  const w = Math.max(6, d.w), h = Math.max(6, d.h);
  const wall = d.slots[0] === 'wall' && (d.cat === 'art' || d.cat === 'collect' && has(id, 'drumhead', 'setlist', 'cassette', 'figures'));
  const top = wall && !has(id, 'shelf', 'led_wall', 'neon_art', 'strip', 'green_wall', 'cassette', 'figures') ? 4 : 0;
  const q = new Px(w + 2, h + 2 + top);
  const p = new Px(w, h);
  const r = hash(id);
  const wood = st === 'any' ? pal.wood : m;
  const shelfBooks = (y: number, x0: number, x1: number) => { for (let bx = x0; bx < x1 - 1; bx += 2 + ((r >> (bx % 7)) & 1)) { const bh = 3 + ((r >> (bx % 11)) & 1) + ((bx * 7) % 2); p.rect(bx, y - bh, 2, bh, [s2, x, PAPER, lv(m, 4), C('#3a5a8a')][(bx + r) % 5]); p.put(bx, y - bh, lv(PAPER, 4)); } };
  if (d.cat === 'furniture') {
    if (has(id, 'sofa', 'chaise', 'futon', 'bench', 'booth', 'pit', 'bed')) {
      const lh = has(id, 'futon', 'pit', 'waterbed', 'bench') ? 2 : 3;
      const bed = has(id, 'bed');
      const body = has(id, 'bench') ? wood : lv(m, 2.6);
      legs(p, 2, w - 4, h - lh, lh, st, wood);
      if (has(id, 'bench')) { blk(p, 0, h - lh - 4, w, 4, wood); }
      else {
        const sy = Math.floor(h * 0.5);
        if (!bed && !has(id, 'futon')) rectV(p, 1, Math.floor(h * 0.12), w - 2, sy, body, { ink: false });
        rectV(p, 0, sy, w, h - sy - lh, lv(body, 0.85 + 2), { ink: false });
        const n = Math.max(1, Math.round(w / 16));
        for (let i = 1; i < n; i++) p.vline(Math.floor((i * w) / n), sy + 1, h - lh - 2, lv(body, 1));
        if (!bed) { rectV(p, 0, Math.floor(h * 0.3), 4, h - Math.floor(h * 0.3) - lh, lv(body, 2), { ink: false }); rectV(p, w - 4, Math.floor(h * 0.3), 4, h - Math.floor(h * 0.3) - lh, lv(body, 2), { ink: false }); }
        if (st === 'nouveau' || st === 'deco') for (let i = 6; i < w - 6; i += 6) p.put(i, Math.floor(h * 0.3), lv(body, 1)); // botões do capitonê
        if (bed || has(id, 'futon')) { blk(p, 2, sy - 3, 10, 4, W0); rectV(p, 12, sy - 2, w - 14, 4, s2, { ink: false }); }
        if (has(id, 'booth')) blk(p, w - 8, sy - 6, 8, h - sy + 6 - lh, C('#d8d8d0'));
      }
    } else if (has(id, 'chair', 'armchair', 'bag', 'egg')) {
      if (has(id, 'bag')) ellipseV(p, w / 2 - 0.5, h / 2 + 1, w / 2 - 1, h / 2 - 2, lv(m, 2.6), { ink: false });
      else if (has(id, 'egg', 'shell')) {
        ellipseV(p, w / 2 - 0.5, h * 0.42, w / 2 - 1, h * 0.4, lv(m, 2.6), { ink: false });
        ellipseV(p, w / 2, h * 0.5, w / 2 - 4, h * 0.25, lv(s2, 2.6), { ink: false });
        p.vline(Math.floor(w / 2), Math.floor(h * 0.8), h - 2, CHROME); p.hline(Math.floor(w / 2) - 4, Math.floor(w / 2) + 4, h - 1, CHROME);
      } else if (has(id, 'macrame')) {
        p.line(Math.floor(w / 2), 0, 2, Math.floor(h * 0.4), C('#e8dcc0')); p.line(Math.floor(w / 2), 0, w - 3, Math.floor(h * 0.4), C('#e8dcc0'));
        ellipseV(p, w / 2, h * 0.65, w / 2 - 1, h * 0.3, C('#e8dcc0'), { ink: false });
        for (let y = Math.floor(h * 0.4); y < h - 2; y += 2) for (let xx = 3; xx < w - 3; xx += 3) p.put(xx + (y % 4 ? 1 : 0), y, C('#b8a888'));
        ellipseV(p, w / 2, h * 0.68, w / 2 - 4, h * 0.12, lv(s2, 2.6), { ink: false });
      } else {
        const lh = Math.max(3, Math.floor(h * 0.22));
        rectV(p, 2, 0, w - 4, Math.floor(h * 0.62), lv(m, 2.6), { ink: false });
        rectV(p, 0, Math.floor(h * 0.5), w, Math.floor(h * 0.28), lv(s2, 2.6), { ink: false });
        if (!has(id, 'shell')) { rectV(p, 0, Math.floor(h * 0.3), 3, Math.floor(h * 0.48), lv(m, 2), { ink: false }); rectV(p, w - 3, Math.floor(h * 0.3), 3, Math.floor(h * 0.48), lv(m, 2), { ink: false }); }
        legs(p, 2, w - 4, h - lh, lh, st, pal.woodDark);
        if (has(id, 'eames')) blk(p, w - 8, h - 8, 8, 5, lv(m, 2));
      }
    } else if (has(id, 'pool')) {
      blk(p, 0, 0, w, 5, C('#2f7a3a')); p.hline(1, w - 2, 1, C('#4aa05a'));
      blk(p, 0, 4, w, 5, pal.woodDark); for (const xx of [0, Math.floor(w / 2) - 1, w - 3]) p.rect(xx, 0, 3, 2, BLACK);
      blk(p, 3, 9, 5, h - 9, pal.woodDark); blk(p, w - 8, 9, 5, h - 9, pal.woodDark);
      p.disc(10, 2, 1.2, W0); p.disc(14, 2, 1.2, C('#d23c3c')); p.line(18, 3, w - 6, 0, C('#c8a060'));
    } else if (has(id, 'table', 'desk', 'counter', 'cart')) {
      const tt = has(id, 'counter') ? 5 : 3;
      blk(p, 0, 0, w, tt, has(id, 'glass') ? C('#a8c8d8') : lv(wood, 2.6));
      if (has(id, 'counter')) { blk(p, 2, tt, w - 4, h - tt, lv(wood, 2)); for (let xx = 6; xx < w - 4; xx += 8) p.vline(xx, tt + 2, h - 3, lv(wood, 1)); p.hline(2, w - 3, h - 4, BRASS); for (let i = 0; i < 4; i++) { const bx = 6 + i * 6; p.rect(bx, -0, 2, 0, BLACK); } }
      else if (has(id, 'cart')) { blk(p, 2, Math.floor(h * 0.55), w - 4, 2, CHROME); p.vline(2, tt, h - 3, CHROME); p.vline(w - 3, tt, h - 3, CHROME); p.disc(4, h - 2, 1.4, BLACK); p.disc(w - 5, h - 2, 1.4, BLACK); for (let i = 0; i < 3; i++) { p.rect(5 + i * 4, Math.floor(h * 0.55) - 5, 2, 5, [C('#3a7a3a'), C('#8a2430'), C('#d8b040')][i]); p.put(5 + i * 4, Math.floor(h * 0.55) - 6, lv(CHROME, 2)); } }
      else if (has(id, 'boomerang')) { p.line(1, tt, 4, h - 1, BLACK); p.line(w - 2, tt, w - 5, h - 1, BLACK); p.line(Math.floor(w / 2), tt, Math.floor(w / 2), h - 1, BLACK); }
      else if (has(id, 'standing')) { blk(p, 3, tt, 3, h - tt - 2, DGREY); blk(p, w - 6, tt, 3, h - tt - 2, DGREY); blk(p, 0, h - 2, 9, 2, DGREY); blk(p, w - 9, h - 2, 9, 2, DGREY); p.rect(Math.floor(w / 2) - 5, -0, 10, 0, BLACK); }
      else { legs(p, 1, w - 3, tt, h - tt, st, wood); if (h > 14) { blk(p, 3, tt, Math.floor(w * 0.35), Math.min(10, h - tt - 4), lv(wood, 2)); p.rect(3 + Math.floor(w * 0.17), tt + 3, 3, 1, BRASS); } }
    } else if (has(id, 'arcade')) {
      blk(p, 0, 0, w, h, lv(m, 2.2)); blk(p, 1, 1, w - 2, 5, BLACK); p.hline(3, w - 4, 3, x);
      p.rect(2, 7, w - 4, Math.floor(h * 0.3), BLACK); p.rect(3, 8, w - 6, Math.floor(h * 0.3) - 2, lv(C('#3a7ab8'), 4)); p.put(5, 10, C('#f0d040')); p.rect(8, 12, 3, 2, C('#e04a4a'));
      blk(p, 0, Math.floor(h * 0.48), w, 4, lv(m, 3)); p.vline(5, Math.floor(h * 0.48) - 2, Math.floor(h * 0.48), BLACK); p.disc(5, Math.floor(h * 0.48) - 3, 1, C('#e04a4a')); p.put(10, Math.floor(h * 0.48) + 1, C('#40c0d8')); p.put(13, Math.floor(h * 0.48) + 1, C('#f0d040'));
      p.rect(Math.floor(w / 2) - 2, h - 8, 4, 3, BLACK); p.put(Math.floor(w / 2), h - 7, GOLD);
    } else if (has(id, 'coat')) {
      p.vline(Math.floor(w / 2), 2, h - 3, pal.woodDark); p.vline(Math.floor(w / 2) + 1, 2, h - 3, lv(pal.woodDark, 2));
      p.line(Math.floor(w / 2), h - 3, 1, h - 1, pal.woodDark); p.line(Math.floor(w / 2), h - 3, w - 2, h - 1, pal.woodDark);
      p.line(Math.floor(w / 2), 4, 2, 2, pal.woodDark); p.line(Math.floor(w / 2), 4, w - 3, 2, pal.woodDark); p.disc(Math.floor(w / 2) + 0.5, 1, 1.2, lv(pal.woodDark, 3));
      rectV(p, 1, 4, 5, 14, lv(s2, 2), { ink: false }); blk(p, w - 6, 3, 5, 3, BLACK); p.hline(w - 7, w - 1, 6, BLACK);
    } else if (has(id, 'plantstand')) {
      blk(p, 0, 0, w, 2, BLACK); p.vline(1, 2, h - 1, BLACK); p.vline(w - 2, 2, h - 1, BLACK); p.line(1, h - 6, w - 2, h - 10, BLACK); p.line(1, h - 10, w - 2, h - 6, BLACK);
      for (let i = 2; i < w - 2; i += 3) p.put(i, 3, lv(BLACK, 3));
    } else if (has(id, 'merch')) {
      p.vline(1, 0, h - 1, CHROME); p.vline(w - 2, 0, h - 1, CHROME); p.hline(1, w - 2, 1, CHROME); p.hline(0, 3, h - 1, CHROME); p.hline(w - 4, w - 1, h - 1, CHROME);
      for (let i = 0; i < 4; i++) { const sx = 3 + i * Math.floor((w - 6) / 4); const c = [BLACK, x, W0, s2][i]; p.put(sx + 2, 2, GREY); blk(p, sx, 3, 6, 10, c); p.rect(sx - 1, 3, 1, 4, c); p.rect(sx + 6, 3, 1, 4, c); p.put(sx + 2, 6, lv(c, 4.5)); }
    } else if (has(id, 'record_bin')) {
      blk(p, 0, Math.floor(h * 0.35), w, h - Math.floor(h * 0.35), lv(pal.wood, 2.4)); p.hline(1, w - 2, Math.floor(h * 0.6), lv(pal.wood, 1));
      for (let i = 2; i < w - 2; i += 2) { p.vline(i, 0 + ((i * 3) % 3), Math.floor(h * 0.35), [BLACK, x, s2, C('#e8e0d0')][(i + r) % 4]); }
    } else {
      // estante, aparador, cristaleira, torre, bufê, penteadeira, banqueta
      const lh = has(id, 'tower', 'shelf', 'bookcase', 'cabinet', 'case') ? 2 : Math.max(2, Math.floor(h * 0.15));
      const bodyH = h - lh;
      blk(p, 0, 0, w, bodyH, lv(wood, 2.4));
      if (has(id, 'screen')) { const n = 3, pw = Math.floor(w / n); for (let i = 0; i < n; i++) { framed(p, i * pw, i % 2 ? 1 : 0, pw - 1, bodyH - 1, 2, lv(wood, 2.4), i % 2 ? lv(s2, 3.6) : lv(s2, 3)); p.line(i * pw + 3, bodyH - 6, i * pw + pw - 4, 6, x); p.disc(i * pw + pw / 2, bodyH * 0.35, 1.5, C('#e88aa0')); } }
      else if (has(id, 'vanity')) { p.ellipse(w / 2, bodyH * 0.3, w * 0.32, bodyH * 0.28, lv(wood, 2.8)); p.ellipse(w / 2, bodyH * 0.3, w * 0.26, bodyH * 0.22, C('#a8c8d8')); p.line(Math.floor(w * 0.35), Math.floor(bodyH * 0.2), Math.floor(w * 0.45), Math.floor(bodyH * 0.12), W0); blk(p, 0, Math.floor(bodyH * 0.6), w, Math.ceil(bodyH * 0.4), lv(wood, 2.4)); }
      else if (has(id, 'bookcase', 'shelf', 'tower', 'memphis')) {
        const n = Math.max(2, Math.floor(bodyH / 9));
        p.rect(2, 2, w - 4, bodyH - 4, lv(wood, 1));
        for (let i = 1; i <= n; i++) { const y = 1 + Math.floor((i * (bodyH - 2)) / n); p.hline(1, w - 2, y, lv(wood, 3)); shelfBooks(y, 2, w - 2); }
        if (has(id, 'nouveau')) { p.vline(Math.floor(w / 2), 1, bodyH - 2, lv(wood, 2)); for (let y = 2; y < bodyH - 2; y += 5) p.line(2, y + 3, 5, y, withAlpha(W0, 120)); }
        if (has(id, 'memphis')) { p.rect(0, 0, 4, 4, C('#f0d040')); p.disc(w - 4, 3, 2.5, C('#40c0d8')); p.rect(w - 3, bodyH - 6, 3, 6, C('#e04a8a')); }
        if (has(id, 'tower')) for (let y = 3; y < bodyH - 2; y += 2) p.hline(2, w - 3, y, [C('#c8c8d0'), x, s2][(y >> 1) % 3]);
      } else if (has(id, 'trophy')) {
        p.rect(2, 2, w - 4, bodyH - 4, C('#9ac0d0'));
      } else {
        const doors = Math.max(2, Math.round(w / 12));
        for (let i = 0; i < doors; i++) { const dx = 2 + Math.floor((i * (w - 4)) / doors), dw = Math.floor((w - 4) / doors) - 1; blk(p, dx, 3, dw, bodyH - 6, lv(wood, 2.8)); p.put(dx + (i % 2 ? 1 : dw - 2), Math.floor(bodyH / 2), st === 'nouveau' || st === 'deco' ? GOLD : CHROME); if (st === 'deco') p.hline(dx + 1, dx + dw - 2, Math.floor(bodyH / 2) - 3, GOLD); if (has(id, 'nouveau') && i % 2 === 0) { p.rect(dx + 2, 5, dw - 4, 5, [C('#c03030'), C('#3060c0'), C('#e0b040')][i % 3]); } }
        p.hline(0, w - 1, 0, lv(wood, 4.5));
      }
      if (lh > 0) legs(p, 1, w - 3, bodyH, lh, st, wood);
    }
  } else if (d.cat === 'art') {
    const y0 = 0;
    const frameC = has(id, 'gold', 'platinum', 'plaque') ? BLACK : st === 'nouveau' || st === 'deco' || has(id, 'oil', 'map', 'family') ? GOLD : st === 'minimal' || st === 'smart' ? W0 : lv(pal.woodDark, 2);
    if (has(id, 'poster', 'flyer', 'pinup', 'liner')) {
      if (has(id, 'flyer')) { for (let i = 0; i < 9; i++) { const fx = (i % 3) * Math.floor(w / 3) + ((r >> i) & 3), fy = Math.floor(i / 3) * Math.floor(h / 3) + ((r >> (i + 3)) & 2); const c = [PAPER, C('#f0d040'), C('#e88aa0'), C('#a8d0e0')][(i + r) % 4]; blk(p, fx, fy, Math.floor(w / 3) - 1, Math.floor(h / 3) - 1, c); p.hline(fx + 1, fx + Math.floor(w / 3) - 4, fy + 2, BLACK); p.put(fx + 2, fy, C('#d23c3c')); } }
      else {
        const bg = has(id, 'psych') ? C('#e86a2a') : has(id, 'cabaret') ? C('#e8d8b0') : has(id, 'jazz', 'rock') ? C('#e8c040') : has(id, 'liner') ? C('#a8c8e0') : has(id, 'pinup') ? PAPER : lv(s2, 3.5);
        blk(p, 0, y0, w, h, bg);
        if (has(id, 'pinup')) { p.rect(1, 1, w - 2, 2, C('#d23c3c')); for (let i = 0; i < 3; i++) p.hline(2, w - 3, h - 6 + i * 2, GREY); bustArt(p, Math.floor(w / 2) - 3, 5, C('#f0c8a0'), C('#d23c3c'), C('#e8c040')); }
        else if (has(id, 'liner')) { p.rect(0, Math.floor(h * 0.6), w, Math.ceil(h * 0.4), C('#2a5a8a')); blk(p, 3, Math.floor(h * 0.4), w - 6, Math.floor(h * 0.22), BLACK); p.rect(3, Math.floor(h * 0.4) + 3, w - 6, 2, W0); for (let i = 0; i < 3; i++) blk(p, 6 + i * 4, Math.floor(h * 0.25), 3, Math.floor(h * 0.15), C('#d23c3c')); }
        else if (has(id, 'psych')) { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (((xx - w / 2) ** 2 + (yy - h / 2) ** 2) ** 0.5 % 6 < 2) p.put(xx, yy, C('#a040c0')); p.disc(w / 2, h / 2, 3, C('#f0d040')); }
        else { p.disc(w / 2, h * 0.42, Math.min(w, h) * 0.22, has(id, 'cabaret') ? C('#d23c3c') : BLACK); p.rect(2, 2, w - 4, 3, BLACK); p.hline(3, w - 4, 3, lv(bg, 4)); for (let i = 0; i < 2; i++) p.hline(3, w - 4 - i * 3, h - 6 + i * 2, BLACK); }
      }
      if (!has(id, 'flyer')) { p.put(1, 0, CHROME); p.put(w - 2, 0, CHROME); }
    } else if (has(id, 'gold', 'platinum', 'plaque')) {
      framed(p, 0, y0, w, h, 2, frameC, has(id, 'plaque') ? C('#26222a') : C('#3a1a2a'));
      const disc = has(id, 'platinum', 'plaque') ? C('#d8dce4') : GOLD;
      const rr = Math.max(3, Math.floor(Math.min(w, h - 6) / 2) - 2);
      discV(p, w / 2 - 0.5, 2 + rr + 1, rr, disc, { ink: false, spec: true });
      p.ring(w / 2 - 0.5, 2 + rr + 1, rr - 2, lv(disc, 2)); p.disc(w / 2 - 0.5, 2 + rr + 1, 1.2, has(id, '78') ? C('#d23c3c') : W0);
      blk(p, 4, h - 5, w - 8, 3, BRASS); p.hline(6, w - 7, h - 4, lv(BRASS, 1));
    } else if (has(id, 'mirror', 'clock')) {
      const cx = w / 2 - 0.5, cy = h / 2 - 0.5, R = Math.min(w, h) / 2 - 1;
      for (let i = 0; i < 16; i++) { const an = (i / 16) * Math.PI * 2; p.line(Math.round(cx), Math.round(cy), Math.round(cx + Math.cos(an) * R), Math.round(cy + Math.sin(an) * R), i % 2 ? lv(GOLD, 2) : GOLD); }
      if (has(id, 'mirror')) { discV(p, cx, cy, R * 0.55, C('#a8c8d8'), { ink: false }); p.line(Math.round(cx - 2), Math.round(cy + 1), Math.round(cx + 1), Math.round(cy - 2), W0); }
      else { discV(p, cx, cy, R * 0.45, W0, { ink: false }); p.line(Math.round(cx), Math.round(cy), Math.round(cx), Math.round(cy - R * 0.35), BLACK); p.line(Math.round(cx), Math.round(cy), Math.round(cx + R * 0.25), Math.round(cy), BLACK); }
    } else if (has(id, 'guitar')) {
      const cx = Math.floor(w / 2);
      p.rect(cx - 2, 0, 4, 2, BLACK); // gancho
      blk(p, cx - 2, 1, 4, 4, lv(pal.woodDark, 1.5)); for (let i = 0; i < 3; i++) { p.put(cx - 3, 2 + i, CHROME); p.put(cx + 2, 2 + i, CHROME); }
      p.rect(cx - 1, 5, 2, Math.floor(h * 0.45), lv(pal.woodDark, 2)); for (let y = 7; y < 5 + Math.floor(h * 0.45); y += 3) p.hline(cx - 1, cx, y, CHROME);
      ellipseV(p, cx - 0.5, h * 0.62, w / 2 - 2, h * 0.11, lv(m, 2.6), { ink: false }); ellipseV(p, cx - 0.5, h * 0.8, w / 2 - 1, h * 0.14, lv(m, 2.6), { ink: false });
      p.disc(cx - 0.5, h * 0.68, 1.6, BLACK); p.hline(cx - 3, cx + 2, Math.floor(h * 0.86), BLACK);
    } else if (has(id, 'macrame')) {
      const cord = C('#e8dcc0');
      for (let xx = 1; xx < w - 1; xx++) { const yb = Math.round(h - 2 - Math.abs(xx - w / 2) * 0.7); p.vline(xx, 2, yb, xx % 2 ? cord : lv(cord, 3.2)); }
      for (let yy = 5; yy < h - 6; yy += 5) for (let xx = 2 + ((yy / 5) % 2) * 2; xx < w - 2; xx += 4) { p.put(xx, yy, C('#b8a888')); p.put(xx + 1, yy + 1, C('#b8a888')); p.put(xx - 1, yy + 1, C('#b8a888')); }
      for (let xx = 2; xx < w - 2; xx += 3) p.vline(xx, Math.round(h - 2 - Math.abs(xx - w / 2) * 0.7), Math.round(h - 1 - Math.abs(xx - w / 2) * 0.7) + 1, lv(cord, 2));
      blk(p, 0, 0, w, 3, pal.wood);
    } else if (has(id, 'neon_art', 'led_wall')) {
      blk(p, 0, 0, w, h, C('#16141c'));
      const c1 = has(id, 'led') ? C('#38e0d0') : C('#ff5ab0'), c2 = has(id, 'led') ? C('#f0d040') : C('#5ae0ff');
      for (let i = 0; i < w - 6; i++) { const yy = Math.round(h / 2 + Math.sin(i / 3) * (h / 4)); p.put(3 + i, yy, c1); p.put(3 + i, yy + 1, withAlpha(c1, 120)); }
      p.ring(w * 0.75, h * 0.35, Math.min(w, h) * 0.16, c2);
    } else if (has(id, 'digital_frame')) {
      blk(p, 0, 0, w, h, BLACK); p.rect(2, 2, w - 4, h - 4, lv(C('#8a2430'), 3)); p.rect(5, 4, w - 10, h - 8, lv(C('#e8c040'), 3)); p.disc(w / 2, h / 2, 2, BLACK); p.put(w - 3, h - 2, SCR);
    } else if (has(id, 'sheet', 'setlist', 'cover')) {
      framed(p, 0, y0, w, h, 1, frameC, PAPER);
      if (has(id, 'cover')) { p.rect(2, 2, w - 4, h - 4, lv(s2, 2.6)); p.disc(w / 2, h / 2, Math.min(w, h) * 0.22, x); p.hline(3, w - 4, h - 4, W0); }
      else for (let i = 0; i < Math.floor((h - 4) / 3); i++) { p.hline(2, w - 3, 3 + i * 3, GREY); if (has(id, 'sheet')) p.put(3 + ((i * 5 + r) % (w - 6)), 2 + i * 3, BLACK); }
    } else {
      // pintura emoldurada: paisagem, horizonte, mapa, retrato, foto, abstrato
      const t = w >= 24 ? 3 : 2;
      framed(p, 0, y0, w, h, t, frameC, PAPER);
      const ix = t, iy = t, iw = w - 2 * t, ih = h - 2 * t;
      if (has(id, 'landscape', 'oil', 'sunset')) {
        for (let yy = 0; yy < ih; yy++) p.hline(ix, ix + iw - 1, iy + yy, mix(has(id, 'sunset') ? C('#f0a040') : C('#9ac8e8'), has(id, 'sunset') ? C('#c84a4a') : C('#e8e0c0'), yy / ih));
        p.disc(ix + iw * 0.72, iy + ih * 0.3, Math.max(1.5, ih * 0.13), has(id, 'sunset') ? C('#f8e080') : W0);
        for (let xx = 0; xx < iw; xx++) { const hh2 = Math.round(ih * 0.35 + Math.sin(xx / 4 + r) * ih * 0.12); p.vline(ix + xx, iy + ih - hh2, iy + ih - 1, xx % 5 ? C('#5a7a48') : C('#4a6a3a')); }
      } else if (has(id, 'pop')) {
        const cs = [C('#f0d040'), C('#e04a8a'), C('#40c0d8'), C('#f08a30')];
        for (let i = 0; i < 4; i++) { const qx = ix + (i % 2) * Math.floor(iw / 2), qy = iy + Math.floor(i / 2) * Math.floor(ih / 2); p.rect(qx, qy, Math.floor(iw / 2), Math.floor(ih / 2), cs[i]); bustArt(p, qx + Math.floor(iw / 4) - 2, qy + Math.floor(ih / 4) - 1, cs[(i + 2) % 4], cs[(i + 1) % 4], BLACK); }
      } else if (has(id, 'skyline', 'map')) {
        p.rect(ix, iy, iw, ih, has(id, 'map') ? C('#e8dcb0') : C('#d8d0c0'));
        if (has(id, 'map')) { p.ellipse(ix + iw * 0.3, iy + ih * 0.45, iw * 0.15, ih * 0.3, C('#b89a68')); p.ellipse(ix + iw * 0.68, iy + ih * 0.4, iw * 0.2, ih * 0.25, C('#b89a68')); p.hline(ix, ix + iw - 1, iy + Math.floor(ih / 2), withAlpha(C('#8a6a48'), 120)); }
        else for (let xx = 0; xx < iw; xx += 3) { const bh = 3 + ((r >> (xx % 13)) % Math.max(2, ih - 4)); p.rect(ix + xx, iy + ih - bh, 2, bh, C('#3a3a44')); }
      } else if (has(id, 'portrait', 'photo', 'signed', 'mucha')) {
        const bw = has(id, 'photo', 'signed') && !has(id, 'mucha');
        p.rect(ix, iy, iw, ih, bw ? C('#9a9890') : C('#d8c8a0'));
        const n = has(id, 'family') ? 3 : 1;
        for (let i = 0; i < n; i++) bustArt(p, ix + Math.floor(((i + 0.5) * iw) / n) - 2, iy + Math.floor(ih * 0.35), bw ? C('#d8d4cc') : C('#f0c8a0'), bw ? C('#4a4a50') : [C('#3a5a8a'), C('#8a2430'), C('#5a7a48')][i], bw ? C('#2a2a30') : C('#6a4228'));
        if (has(id, 'mucha')) { p.ring(ix + iw / 2, iy + ih * 0.38, Math.min(iw, ih) * 0.35, GOLD); for (let i = 0; i < 4; i++) p.put(ix + 2 + i * 3, iy + 2, C('#e88aa0')); }
        if (has(id, 'signed')) p.line(ix + 1, iy + ih - 2, ix + iw - 2, iy + ih - 4, C('#2a4aa0'));
        if (has(id, 'stage') || has(id, 'bw')) p.rect(ix, iy + ih - 3, iw, 3, C('#5a5a60'));
      } else {
        p.rect(ix, iy, iw, ih, st === 'minimal' ? W0 : lv(s2, 4));
        if (st === 'minimal') p.line(ix + 2, iy + ih - 3, ix + iw - 3, iy + 2, BLACK);
        else for (let i = 0; i < 5; i++) { const bx = ix + 1 + ((r >> (i * 3)) % Math.max(1, iw - 6)); const by = iy + 1 + ((r >> (i * 5)) % Math.max(1, ih - 5)); if (i % 2) p.disc(bx + 2, by + 2, 2, [m, x, C('#3a5a8a'), C('#f0d040'), BLACK][i]); else p.rect(bx, by, 5, 3, [m, x, C('#3a5a8a'), C('#f0d040'), BLACK][i]); }
      }
    }
  } else if (d.cat === 'plant') {
    const potC = st === 'minimal' ? C('#e8e4dc') : st === 'smart' ? W0 : st === 'nouveau' || st === 'deco' ? C('#3a6a5a') : pal.pot;
    const leaf = pal.plant;
    if (has(id, 'green_wall')) { blk(p, 0, 0, w, h, pal.woodDark); for (let yy = 2; yy < h - 1; yy += 3) for (let xx = 1; xx < w - 1; xx += 3) ellipseV(p, xx + 1, yy, 2, 1.4, lv(leaf, 2 + ((xx + yy + r) % 3) * 0.5), { ink: false }); }
    else {
      const hanging = has(id, 'spider');
      const ph = hanging ? 5 : Math.max(4, Math.floor(h * (has(id, 'orchid', 'bonsai', 'succul') ? 0.32 : 0.24)));
      const py = hanging ? 6 : h - ph;
      const pw = Math.max(5, Math.floor(w * (has(id, 'bonsai', 'succul') ? 0.9 : 0.55)));
      const px0 = Math.floor((w - pw) / 2);
      if (hanging) { p.line(Math.floor(w / 2), 0, px0, py, C('#c8b898')); p.line(Math.floor(w / 2), 0, px0 + pw - 1, py, C('#c8b898')); }
      if (has(id, 'hydro')) { blk(p, 0, h - 6, w, 6, W0); p.rect(1, 0, w - 2, 2, CHROME); p.hline(2, w - 3, 2, GLOW); for (let i = 2; i < w - 2; i += 4) ellipseV(p, i + 1, h - 9, 1.5, 3, lv(leaf, 3), { ink: false }); }
      else {
        blk(p, px0, py, pw, ph, potC); p.hline(px0 - 1, px0 + pw, py, lv(potC, 4.2)); p.hline(px0 + 1, px0 + pw - 2, py + 1, lv(potC, 1.4));
        const top = py;
        if (has(id, 'palm')) { p.vline(Math.floor(w / 2), Math.floor(h * 0.3), top, lv(pal.woodDark, 2)); for (let i = 0; i < 6; i++) { const ex = Math.round(w / 2 + Math.cos(Math.PI + (i * Math.PI) / 5) * (w / 2 - 1)); const ey = Math.round(h * 0.3 + Math.sin(Math.PI + (i * Math.PI) / 5) * 6) + 5; p.line(Math.floor(w / 2), Math.floor(h * 0.3), ex, ey, lv(leaf, 2 + (i % 2))); p.line(Math.floor(w / 2), Math.floor(h * 0.3) + 1, ex, ey + 1, lv(leaf, 1.5)); } }
        else if (has(id, 'fern', 'spider')) { for (let i = 0; i < 7; i++) { const ex = Math.round((i * (w - 1)) / 6); const ey = hanging ? py + ph + 4 + (i % 3) * 3 : top - 3 - ((i * 5) % 7) + (i === 0 || i === 6 ? 8 : 0); p.line(Math.floor(w / 2), hanging ? py + 1 : top - 1, ex, ey, lv(leaf, 2 + (i % 3) * 0.6)); p.line(Math.floor(w / 2), hanging ? py + 2 : top - 2, ex, ey + 1, lv(leaf, 3.2)); } }
        else if (has(id, 'cactus')) { rectV(p, Math.floor(w / 2) - 2, 0, 4, top, lv(leaf, 2.4), { ink: false }); if (w >= 8) rectV(p, Math.floor(w / 2) + 2, Math.floor(top * 0.35), 2, 3, lv(leaf, 2.4), { ink: false }); p.put(Math.floor(w / 2), 0, C('#e88aa0')); }
        else if (has(id, 'orchid')) { p.line(Math.floor(w / 2), top - 1, Math.floor(w / 2) + 1, 1, lv(leaf, 1.5)); for (const [fx2, fy2] of [[w / 2 + 2, 2], [w / 2 - 1, 4], [w / 2 + 2, 6]]) p.disc(fx2, fy2, 1.3, C('#f0a0d0')); ellipseV(p, w / 2 - 2, top - 1, 2.5, 1, lv(leaf, 2.5), { ink: false }); }
        else if (has(id, 'bonsai')) { p.line(Math.floor(w / 2), top - 1, Math.floor(w / 2) - 2, top - 4, lv(pal.woodDark, 2)); ellipseV(p, w / 2 - 2, top - 6, w / 2 - 2, 2.5, lv(leaf, 2.4), { ink: false }); }
        else if (has(id, 'succul')) { for (let i = 0; i < 3; i++) discV(p, px0 + 2 + i * Math.floor(pw / 3), top - 1, 2, lv(C('#7aa890'), 2.4), { ink: false }); }
        else if (has(id, 'monstera', 'rubber', 'ficus')) { p.vline(Math.floor(w / 2), Math.floor(h * 0.25), top, lv(pal.woodDark, 2)); for (let i = 0; i < 6; i++) { const lx = w / 2 + (i % 2 ? 1 : -1) * (2 + (i * 3) % (w / 2 - 2)); const ly = h * 0.12 + i * (top - h * 0.12) / 6; ellipseV(p, Math.max(2, Math.min(w - 3, lx)), ly, has(id, 'monstera') ? 3.5 : 2.5, has(id, 'monstera') ? 2.5 : 1.6, lv(leaf, 2.2 + (i % 3) * 0.4), { ink: false }); if (has(id, 'monstera')) p.put(Math.round(Math.max(2, Math.min(w - 3, lx))), Math.round(ly), lv(leaf, 1)); } }
        else ellipseV(p, w / 2 - 0.5, top / 2, w / 2 - 1, top / 2 - 0.5, lv(leaf, 2.5), { ink: false });
      }
    }
  } else if (d.cat === 'lamp') {
    const glowOn = (yy: number) => { for (let i = 0; i < 3; i++) p.hline(Math.max(0, Math.floor(w / 2) - 3 + i), Math.min(w - 1, Math.floor(w / 2) + 3 - i), yy + i, withAlpha(GLOW, 90 - i * 25)); };
    if (has(id, 'strip')) { p.hline(0, w - 1, 1, DGREY); for (let i = 0; i < w; i += 2) p.put(i, 1, [C('#ff4ab0'), C('#4ae0ff'), C('#f0e040')][(i >> 1) % 3]); for (let i = 0; i < w; i += 2) p.put(i, 2, withAlpha(C('#ff4ab0'), 80)); }
    else if (has(id, 'sconce')) { blk(p, 2, 3, 4, 7, BRASS); p.line(4, 6, 1, 4, BRASS); p.disc(1, 2, 1.2, GLOW); p.put(1, 0, C('#ffb040')); }
    else if (has(id, 'neon_sign')) { blk(p, 0, 0, w, h, C('#16141c')); const red = C('#ff4a3a'); for (const [gx, gy] of [[3, 3], [7, 3], [11, 3], [15, 3], [19, 3]]) { p.rect(gx, gy, 3, 1, red); p.rect(gx, gy + 3, 3, 1, red); p.vline(gx, gy, gy + 3, red); } p.hline(2, w - 3, h - 2, withAlpha(red, 120)); }
    else if (has(id, 'lava')) { blk(p, 1, h - 4, w - 2, 4, CHROME); p.rect(1, 2, w - 2, h - 6, C('#f0a0c8')); ellipseV(p, w / 2, 5, 1.5, 1.5, C('#e04a8a'), { ink: false }); ellipseV(p, w / 2 - 0.5, 9, 1.5, 1.8, C('#e04a8a'), { ink: false }); blk(p, 1, 0, w - 2, 2, CHROME); }
    else {
      const floor = d.slots[0] === 'floor';
      const sh = Math.max(4, Math.floor(h * (floor ? 0.22 : 0.45)));
      const shadeC = has(id, 'tiffany') ? C('#3f8a5a') : has(id, 'banker') ? C('#2f7a4a') : has(id, 'mushroom') ? C('#e8a030') : has(id, 'paper_lantern') ? W0 : lv(s2, 3.4);
      if (has(id, 'arc')) { let lx = 4, ly = h - 3; for (let i = 1; i <= 24; i++) { const u = i / 24; const nx = Math.round(4 + u * (w - 9)); const ny = Math.round(h - 3 - Math.sin(u * Math.PI * 0.62) * (h - 9)); p.line(lx, ly, nx, ny, CHROME); p.line(lx + 1, ly, nx + 1, ny, lv(CHROME, 1.5)); lx = nx; ly = ny; } ellipseV(p, w - 5, 6, 4, 2.5, CHROME, { ink: false, spec: true }); glowOn(9); blk(p, 0, h - 3, 9, 3, W0); }
      else if (has(id, 'atomic')) { p.vline(Math.floor(w / 2), 6, h - 3, BLACK); for (const [ex, ey, c] of [[1, 4, C('#e8c040')], [w - 2, 7, C('#d23c3c')], [Math.floor(w / 2), 1, C('#3fb0a8')]] as [number, number, Col][]) { p.line(Math.floor(w / 2), 10, ex, ey + 2, BLACK); p.rect(ex - 1, ey, 3, 3, c); } p.line(Math.floor(w / 2), h - 3, 2, h - 1, BLACK); p.line(Math.floor(w / 2), h - 3, w - 3, h - 1, BLACK); }
      else if (has(id, 'paper_lantern')) { p.vline(Math.floor(w / 2), h - 6, h - 1, BLACK); blk(p, Math.floor(w / 2) - 3, h - 2, 7, 2, BLACK); for (let yy = 0; yy < h - 6; yy++) { const ww2 = Math.round((w / 2 - 1) * Math.sin(Math.PI * (yy + 0.5) / (h - 6))); p.hline(Math.floor(w / 2) - ww2, Math.floor(w / 2) + ww2, yy, yy % 3 ? lv(GLOW, 4) : lv(GLOW, 3)); } }
      else {
        const pole = floor || has(id, 'tensor') ? 1 : 0;
        if (has(id, 'tensor')) { p.line(3, h - 2, 6, Math.floor(h / 2), DGREY); p.line(6, Math.floor(h / 2), w - 4, 3, DGREY); ellipseV(p, w - 4, 3, 3, 2, x, { ink: false }); glowOn(5); blk(p, 0, h - 2, 7, 2, DGREY); }
        else {
          p.vline(Math.floor(w / 2), sh, h - 3, has(id, 'halogen', 'deco') || floor ? CHROME : BRASS); if (pole) p.vline(Math.floor(w / 2) + 1, sh, h - 3, lv(CHROME, 1.5));
          blk(p, Math.floor(w * 0.2), h - 3, Math.ceil(w * 0.6), 3, has(id, 'banker', 'tiffany') ? BRASS : lv(m, 2));
          if (has(id, 'tiffany')) { for (let yy = 0; yy < sh; yy++) { const ww2 = Math.round(2 + (w / 2 - 2) * (yy / sh)); for (let xx = -ww2; xx <= ww2; xx++) p.put(Math.floor(w / 2) + xx, yy, [C('#3f8a5a'), C('#d8a030'), C('#c04030'), C('#3060a0')][((xx + 9) * 3 + yy * 5) % 4]); } }
          else if (has(id, 'banker')) { ellipseV(p, w / 2, sh / 2 + 1, w / 2 - 1, sh / 2, shadeC, { ink: false, spec: true }); }
          else if (has(id, 'mushroom')) ellipseV(p, w / 2 - 0.5, sh / 2 + 1, w / 2 - 1, sh / 2, shadeC, { ink: false, spec: true });
          else { for (let yy = 0; yy < sh; yy++) { const ww2 = Math.round(w * 0.22 + (w * 0.26) * (yy / sh)); p.hline(Math.floor(w / 2) - ww2, Math.floor(w / 2) + ww2, yy, yy === 0 ? lv(shadeC, 4.5) : xx(yy, sh) ? lv(shadeC, 3) : shadeC); } if (st === 'deco') for (let i = 1; i < 3; i++) p.hline(Math.floor(w * 0.25), Math.floor(w * 0.75), Math.floor((i * sh) / 3), GOLD); }
          glowOn(sh);
        }
      }
    }
  } else if (d.cat === 'hifi') {
    const cab = st === 'any' ? lv(DGREY, 2) : lv(wood, 2.4);
    const spk = (cx: number, cy: number, rr: number) => { p.disc(cx, cy, rr, lv(DGREY, 1.6)); p.ring(cx, cy, rr, BLACK); p.disc(cx, cy, Math.max(0.8, rr * 0.35), BLACK); p.put(Math.round(cx - rr * 0.5), Math.round(cy - rr * 0.5), GREY); };
    if (has(id, 'gramophone')) { blk(p, 1, h - 7, w - 2, 7, pal.wood); p.disc(5, h - 8, 3, BLACK); p.line(6, h - 9, Math.floor(w / 2), Math.floor(h * 0.45), BRASS); for (let i = 0; i < 8; i++) p.line(Math.floor(w / 2) + Math.floor(i / 2), Math.floor(h * 0.45) - i, w - 2, Math.max(0, 1 + i - 4), i % 2 ? GOLD : BRASS); }
    else if (has(id, 'music_box')) { blk(p, 0, 3, w, h - 3, pal.wood); blk(p, 0, 0, w, 3, lv(pal.wood, 3)); p.hline(2, w - 3, 5, GOLD); p.put(w - 1, h - 4, BRASS); }
    else if (has(id, 'player_piano')) { blk(p, 0, 0, w, h - 4, pal.woodDark); p.rect(3, 4, w - 6, Math.floor(h * 0.3), lv(PAPER, 2)); for (let i = 0; i < 8; i++) p.put(5 + i * 3, 6 + (i * 5) % 6, BLACK); p.rect(2, Math.floor(h * 0.55), w - 4, 3, W0); for (let xx = 3; xx < w - 3; xx += 2) p.put(xx, Math.floor(h * 0.55), BLACK); p.rect(3, h - 4, 2, 4, pal.woodDark); p.rect(w - 5, h - 4, 2, 4, pal.woodDark); }
    else if (has(id, 'cathedral')) { for (let yy = 0; yy < h; yy++) { const ww2 = yy < h * 0.4 ? Math.round((w / 2) * Math.sin(Math.PI / 2 * (yy + 1) / (h * 0.4))) : Math.floor(w / 2); p.hline(Math.floor(w / 2) - ww2, Math.floor(w / 2) + ww2 - 1, yy, yy === 0 ? lv(wood, 4) : lv(wood, 2.4)); } for (let xx = 3; xx < w - 3; xx += 2) p.vline(xx, 4, Math.floor(h * 0.6), C('#c8a870')); p.disc(w / 2 - 3, h - 4, 1.2, BRASS); p.disc(w / 2 + 2, h - 4, 1.2, BRASS); }
    else if (has(id, 'jukebox')) {
      for (let yy = 0; yy < h; yy++) { const ww2 = yy < 8 ? Math.round((w / 2) * Math.sin(Math.PI / 2 * (yy + 1) / 8)) : Math.floor(w / 2); p.hline(Math.floor(w / 2) - ww2, Math.floor(w / 2) + ww2 - 1, yy, lv(C('#a83a2a'), 2.4)); }
      for (let yy = 2; yy < 9; yy++) p.hline(Math.floor(w / 2) - 5, Math.floor(w / 2) + 4, yy, [C('#ffb040'), C('#e04a8a'), C('#40c0d8')][yy % 3]);
      p.rect(3, 10, w - 6, 8, C('#d8e8f0')); for (let i = 0; i < 4; i++) p.hline(4, w - 5, 11 + i * 2, GREY);
      for (let xx = 3; xx < w - 3; xx += 2) p.vline(xx, 21, h - 4, CHROME); blk(p, 1, h - 3, w - 2, 3, BLACK);
      p.vline(1, 9, h - 4, C('#ffb040')); p.vline(w - 2, 9, h - 4, C('#ffb040'));
    }
    else if (has(id, 'pa_speaker', 'quad', 'boombox', 'micro', 'console_radio', 'hifi_tube', 'reel', 'karaoke', 'smart_speaker', 'holo', 'vinyl', 'tv', 'flat')) {
      if (has(id, 'smart_speaker')) { rectV(p, 0, 1, w, h - 1, has(id, 'smart') ? C('#d8d8dc') : DGREY, { ink: false }); p.hline(1, w - 2, 1, C('#38e0d0')); for (let y = 4; y < h - 1; y += 2) p.hline(1, w - 2, y, lv(C('#d8d8dc'), 1.5)); }
      else if (has(id, 'holo')) { blk(p, 2, h - 5, w - 4, 5, BLACK); p.hline(4, w - 5, h - 5, C('#38e0d0')); for (let yy = 0; yy < h - 6; yy++) p.hline(Math.floor(w / 2) - Math.floor(yy / 4) - 1, Math.floor(w / 2) + Math.floor(yy / 4), h - 6 - yy, withAlpha(C('#38e0d0'), 70)); bustArt(p, Math.floor(w / 2) - 2, 6, withAlpha(C('#a0f0f0'), 200), withAlpha(C('#38e0d0'), 200), withAlpha(C('#a0f0f0'), 200)); }
      else if (has(id, 'vinyl')) { blk(p, 0, 2, w, h - 2, has(id, 'revival') ? C('#c8a878') : DGREY); p.disc(w / 2 - 2, 2, 5, BLACK); p.disc(w / 2 - 2, 2, 1.2, C('#d23c3c')); p.line(w - 3, 3, w - 6, 1, CHROME); }
      else if (has(id, 'flat')) { blk(p, 0, 0, w, h - 3, BLACK); screenArt(p, 1, 1, w - 2, h - 5, true); p.rect(Math.floor(w / 2) - 4, h - 3, 8, 1, DGREY); blk(p, Math.floor(w / 2) - 7, h - 2, 14, 2, DGREY); }
      else if (has(id, 'tv')) {
        const legH = has(id, 'fifties') ? 5 : 0;
        blk(p, 0, 0, w, h - legH, cab); p.rect(2, 2, Math.floor(w * 0.7), Math.floor((h - legH) * 0.62), BLACK); screenArt(p, 3, 3, Math.floor(w * 0.7) - 2, Math.floor((h - legH) * 0.62) - 2, false);
        for (let i = 0; i < 3; i++) p.disc(w - 4, 4 + i * 4, 1.2, i ? GREY : BRASS);
        if (has(id, 'vcr')) { blk(p, 1, h - 7, w - 2, 5, BLACK); p.hline(4, 12, h - 5, DGREY); p.put(w - 5, h - 5, C('#7af08a')); }
        if (legH) legs(p, 2, w - 4, h - legH, legH, 'fifties', wood);
        p.line(w / 2 - 2, 0, w / 2 - 6, -4, CHROME);
      } else if (has(id, 'pa_speaker')) { blk(p, 0, 0, w, h, C('#26242a')); spk(w / 2, h * 0.3, Math.min(w / 2 - 2, 5)); spk(w / 2, h * 0.7, Math.min(w / 2 - 2, 6)); p.rect(3, 2, w - 6, 1, GREY); }
      else if (has(id, 'boombox')) { p.hline(4, w - 5, 0, CHROME); p.vline(4, 0, 2, CHROME); p.vline(w - 5, 0, 2, CHROME); blk(p, 0, 2, w, h - 2, C('#3a3a44')); spk(4, h / 2 + 1, 3); spk(w - 5, h / 2 + 1, 3); p.rect(Math.floor(w / 2) - 3, 4, 6, 4, BLACK); p.rect(Math.floor(w / 2) - 2, 5, 4, 2, C('#a8b0c0')); }
      else if (has(id, 'reel')) { blk(p, 0, 0, w, h, cab); for (const cx of [w * 0.28, w * 0.72]) { p.disc(cx, h * 0.35, Math.min(w, h) * 0.22, C('#5a5a64')); p.ring(cx, h * 0.35, Math.min(w, h) * 0.22, CHROME); p.disc(cx, h * 0.35, 1.2, CHROME); } p.rect(3, h - 6, w - 6, 3, BLACK); for (let i = 0; i < 4; i++) p.put(5 + i * 4, h - 5, CHROME); }
      else if (has(id, 'karaoke')) { blk(p, 0, Math.floor(h * 0.35), w, Math.ceil(h * 0.65), C('#3a3a44')); screenArt(p, 2, Math.floor(h * 0.35) + 2, w - 4, 6, true, C('#c040a0')); spk(w / 2, h - 6, 3); p.vline(w - 3, 2, Math.floor(h * 0.35), CHROME); ellipseV(p, w - 3, 2, 1.5, 2, BLACK, { ink: false }); }
      else { // aparelhos de som e rádio-vitrola
        blk(p, 0, 0, w, h - (has(id, 'console') ? 3 : 0), cab);
        if (has(id, 'console', 'tube')) { p.rect(3, 3, Math.floor(w * 0.45), h - 9, C('#c8a870')); for (let xx = 4; xx < 3 + Math.floor(w * 0.45); xx += 2) p.vline(xx, 4, h - 8, lv(C('#c8a870'), 1.5)); p.rect(Math.floor(w * 0.55), 4, Math.floor(w * 0.38), 3, lv(GLOW, 3)); p.put(Math.floor(w * 0.6), 5, C('#d23c3c')); for (let i = 0; i < 3; i++) p.disc(Math.floor(w * 0.6) + i * 4, 11, 1.2, BRASS); if (has(id, 'console')) legs(p, 2, w - 4, h - 3, 3, st, wood); }
        else { spk(w * 0.18, h / 2, Math.min(h * 0.32, w * 0.14)); spk(w * 0.82, h / 2, Math.min(h * 0.32, w * 0.14)); p.rect(Math.floor(w * 0.34), 3, Math.floor(w * 0.32), 4, BLACK); for (let i = 0; i < 2; i++) p.rect(Math.floor(w * 0.36) + i * 5, 4, 3, 2, has(id, 'quad') ? C('#f0d040') : SCR); p.rect(Math.floor(w * 0.34), h - 5, Math.floor(w * 0.32), 2, DGREY); }
      }
    }
    else { blk(p, 0, 0, w, h, cab); spk(w * 0.3, h / 2, Math.min(w, h) * 0.25); }
  } else if (d.cat === 'collect') {
    if (has(id, 'grandfather')) { blk(p, 1, 0, w - 2, h, pal.woodDark); p.disc(w / 2 - 0.5, 5, w / 2 - 3, W0); p.line(Math.floor(w / 2), 5, Math.floor(w / 2), 2, BLACK); p.line(Math.floor(w / 2), 5, Math.floor(w / 2) + 2, 5, BLACK); p.rect(3, 11, w - 6, h - 16, lv(pal.woodDark, 0.8)); p.vline(Math.floor(w / 2), 11, h - 9, GOLD); p.disc(w / 2 - 0.5, h - 9, 1.5, GOLD); blk(p, 0, h - 3, w, 3, lv(pal.woodDark, 2)); }
    else if (has(id, 'globe')) { p.vline(Math.floor(w / 2), h - 4, h - 1, BRASS); blk(p, 2, h - 2, w - 4, 2, pal.woodDark); discV(p, w / 2 - 0.5, (h - 4) / 2, Math.min(w, h - 4) / 2 - 1, C('#3a78b8'), { ink: false, spec: true }); p.ellipse(w / 2 - 2, (h - 4) / 2 - 1, 2, 1.5, C('#5a9a58')); p.ellipse(w / 2 + 2, (h - 4) / 2 + 2, 1.5, 1, C('#5a9a58')); p.ring(w / 2 - 0.5, (h - 4) / 2, Math.min(w, h - 4) / 2 - 0.5, BRASS); }
    else if (has(id, 'disco_ball')) { p.vline(Math.floor(w / 2), 0, 1, CHROME); discV(p, w / 2 - 0.5, h / 2 + 0.5, Math.min(w, h) / 2 - 1.5, C('#b8bcc8'), { ink: false, spec: true }); for (let yy = 2; yy < h; yy += 2) for (let xx = 1; xx < w; xx += 2) if (p.get(xx, yy)) p.put(xx, yy, ((xx + yy + r) % 5) ? lv(CHROME, 2) : W0); }
    else if (has(id, 'aquarium')) { blk(p, 0, h - 3, w, 3, BLACK); p.rect(0, 0, w, h - 3, C('#a8d8e8')); p.rect(1, 3, w - 2, h - 7, C('#3a8ac0')); p.rect(1, h - 6, w - 2, 2, C('#c8b070')); for (let i = 2; i < w - 2; i += 5) p.vline(i, h - 11, h - 6, C('#4a9a5a')); p.rect(Math.floor(w * 0.3), 6, 3, 2, C('#f08030')); p.put(Math.floor(w * 0.3) - 1, 7, C('#f08030')); p.rect(Math.floor(w * 0.65), 9, 3, 2, C('#f0d030')); p.put(w - 4, 4, W0); blk(p, 0, 0, w, 2, BLACK); }
    else if (has(id, 'fireplace')) { blk(p, 0, 0, w, 4, lv(m === pal.wood ? C('#e8dcc0') : m, 2.4)); blk(p, 2, 4, w - 4, h - 4, C('#a85a40')); for (let yy = 6; yy < h; yy += 3) for (let xx = 3 + ((yy / 3) % 2) * 2; xx < w - 3; xx += 4) p.put(xx, yy, C('#8a4a38')); p.rect(7, Math.floor(h * 0.38), w - 14, h - Math.floor(h * 0.38), BLACK); for (let i = 0; i < 3; i++) ellipseV(p, w / 2 - 4 + i * 4, h - 4, 1.8, 3 - (i % 2), [C('#f08a20'), C('#f8d040'), C('#e04a20')][i], { ink: false }); p.hline(8, w - 9, h - 1, C('#5a3a2a')); }
    else if (has(id, 'piano_grand')) { const body = BLACK; for (let xx = 0; xx < w; xx++) { const top2 = xx < w * 0.55 ? 5 : Math.round(5 + ((xx - w * 0.55) / (w * 0.45)) ** 2 * 8); p.vline(xx, top2, 14, xx === 0 ? lv(body, 3) : lv(body, 1.6)); } p.line(4, 5, Math.floor(w * 0.7), 0, lv(body, 2.5)); p.line(Math.floor(w * 0.7), 0, Math.floor(w * 0.7), 5, CHROME); p.rect(1, 9, 14, 3, W0); for (let xx = 2; xx < 15; xx += 2) p.put(xx, 9, BLACK); for (const lx of [3, Math.floor(w * 0.5), w - 4]) blk(p, lx, 14, 2, h - 14, body); p.hline(1, w - 2, 14, lv(body, 3)); }
    else if (has(id, 'trophy')) { blk(p, 0, 0, w, h, lv(pal.wood, 2.4)); p.rect(2, 2, w - 4, h - 6, C('#9ac0d0')); for (let i = 1; i < 3; i++) p.hline(2, w - 3, 2 + Math.floor((i * (h - 6)) / 3), lv(pal.wood, 3)); for (let i = 0; i < 6; i++) { const cx = 4 + (i % 3) * Math.floor((w - 8) / 3), cy = 2 + Math.floor(i / 3) * Math.floor((h - 6) / 3) + Math.floor((h - 6) / 3) - 6; p.rect(cx, cy, 4, 3, GOLD); p.put(cx + 1, cy + 3, GOLD); p.hline(cx, cx + 3, cy + 4, lv(GOLD, 1)); } p.line(3, 4, 6, 1, withAlpha(W0, 150)); }
    else if (has(id, 'bust', 'statue')) { blk(p, Math.floor(w * 0.2), h - 4, Math.ceil(w * 0.6), 4, has(id, 'statue') ? BLACK : C('#d8d4cc')); const c = has(id, 'statue') ? C('#a8703e') : C('#e8e4dc'); if (has(id, 'statue')) { p.disc(w / 2, 2, 1.4, c); p.line(Math.floor(w / 2), 3, Math.floor(w / 2), h - 7, c); p.line(Math.floor(w / 2), 5, 1, 2, c); p.line(Math.floor(w / 2), 5, w - 2, 4, c); p.line(Math.floor(w / 2), h - 7, 2, h - 5, c); p.line(Math.floor(w / 2), h - 7, w - 3, h - 5, c); } else { discV(p, w / 2 - 0.5, 3.5, 3, c, { ink: false }); rectV(p, 1, 7, w - 2, h - 11, c, { ink: false }); } }
    else if (has(id, 'metronome')) { p.poly([[0, h - 1], [w - 1, h - 1], [Math.floor(w / 2) + 1, 0], [Math.floor(w / 2) - 1, 0]], lv(pal.woodDark, 2.4)); p.line(Math.floor(w / 2), h - 3, Math.floor(w / 2) + 2, 1, CHROME); p.rect(Math.floor(w / 2), 4, 2, 1, BRASS); }
    else if (has(id, 'cocktail')) { rectV(p, 0, 0, 4, h, CHROME, { ink: false, spec: true }); for (const gx of [6, 10]) { p.line(gx, 4, gx + 3, 4, W0); p.line(gx, 4, gx + 1, 7, withAlpha(W0, 200)); p.line(gx + 3, 4, gx + 2, 7, withAlpha(W0, 200)); p.vline(gx + 1, 7, h - 2, W0); p.hline(gx, gx + 3, h - 1, W0); p.put(gx + 1, 5, C('#e04a4a')); } }
    else if (has(id, 'jukebox_mini')) { for (let yy = 0; yy < h; yy++) { const ww2 = yy < 3 ? yy + 1 : Math.floor(w / 2); p.hline(Math.floor(w / 2) - ww2, Math.floor(w / 2) + ww2 - 1, yy, yy % 3 ? C('#a83a2a') : C('#ffb040')); } }
    else if (has(id, 'rubik')) { for (let i = 0; i < 4; i++) p.rect((i % 2) * 2, Math.floor(i / 2) * 2, 2, 2, [C('#d23c3c'), C('#f0d040'), C('#3a78b8'), C('#4aa05a')][i]); }
    else if (has(id, 'cassette')) { blk(p, 0, 0, w, h, lv(pal.woodDark, 1.6)); for (let i = 0; i < 12; i++) { const cx = (i % 4) * Math.floor(w / 4) + 1, cy = Math.floor(i / 4) * Math.floor(h / 3) + 1; blk(p, cx, cy, Math.floor(w / 4) - 2, Math.floor(h / 3) - 2, [BLACK, C('#d8d0c0'), C('#3a5a8a'), C('#c04030')][(i + r) % 4]); p.rect(cx + 1, cy + 1, Math.floor(w / 4) - 4, 2, W0); p.put(cx + 2, cy + 4, GREY); p.put(cx + Math.floor(w / 4) - 5, cy + 4, GREY); } }
    else if (has(id, 'gameconsole')) { blk(p, 0, 1, w, h - 1, has(id, 'eighties') ? C('#3a3a44') : C('#d8d4cc')); p.rect(2, 2, w - 4, 1, BLACK); p.put(w - 3, h - 2, C('#e04a4a')); }
    else if (has(id, 'figures')) { blk(p, 0, h - 2, w, 2, lv(pal.wood, 2.6)); for (let i = 0; i < 5; i++) { const fx2 = 2 + i * Math.floor((w - 4) / 5); const c = [C('#d23c3c'), C('#3a78b8'), C('#f0d040'), C('#4aa05a'), C('#a040c0')][i]; p.disc(fx2 + 1.5, h - 9, 1.4, C('#f0c8a0')); p.rect(fx2, h - 8, 3, 6, c); } }
    else if (has(id, 'drumhead')) { p.put(Math.floor(w / 2), 0, GREY); discV(p, w / 2 - 0.5, h / 2 - 0.5, Math.min(w, h) / 2 - 1, W0, { ink: false }); p.ring(w / 2 - 0.5, h / 2 - 0.5, Math.min(w, h) / 2 - 1, C('#2a2a30')); p.line(4, h / 2 + 2, w - 5, h / 2 - 3, C('#2a4aa0')); p.line(5, h / 2 + 4, w - 7, h / 2 - 1, C('#2a4aa0')); p.disc(w / 2, h / 2 - 3, 2, C('#d23c3c')); }
    else if (has(id, 'setlist')) { blk(p, 0, 0, w, h, W0); for (let i = 0; i < 5; i++) p.hline(2, w - 3 - (i * 3) % 4, 3 + i * 3, BLACK); p.put(Math.floor(w / 2), 0, C('#c8c8d0')); }
    else if (has(id, 'ceramic', 'vase')) { ellipseV(p, w / 2 - 0.5, h * 0.62, w / 2 - 1, h * 0.36, st === 'minimal' ? C('#d8d0c4') : x, { ink: false }); p.rect(Math.floor(w / 2) - 1, 0, 3, Math.floor(h * 0.3), st === 'minimal' ? C('#d8d0c4') : x); p.vline(Math.floor(w / 2) + 3, 0, 2, C('#7aa060')); }
    else if (has(id, 'robot')) { ellipseV(p, w / 2 - 0.5, h / 2, w / 2 - 1, h / 2 - 0.5, DGREY, { ink: false, spec: true }); p.put(Math.floor(w / 2), 1, C('#38e0d0')); }
    else if (has(id, 'drone')) { blk(p, 2, 2, w - 4, 3, C('#d8d8dc')); p.hline(0, 2, 1, DGREY); p.hline(w - 3, w - 1, 1, DGREY); blk(p, 0, h - 2, w, 2, DGREY); p.put(Math.floor(w / 2), 4, BLACK); }
    else if (has(id, 'candles')) { p.vline(Math.floor(w / 2), 4, h - 2, CHROME); blk(p, 2, h - 2, w - 4, 2, CHROME); p.hline(1, w - 2, 6, CHROME); for (const cx of [1, Math.floor(w / 2), w - 2]) { p.vline(cx, 2, 5, W0); p.put(cx, 0, C('#ffb040')); p.put(cx, 1, GLOW); } }
    else { rectV(p, 1, Math.floor(h * 0.3), w - 2, Math.ceil(h * 0.7), lv(m, 2.4), { ink: false }); blk(p, 2, 0, w - 4, Math.ceil(h * 0.35), lv(x, 2.6)); }
  } else if (d.cat === 'light') {
    const cord = (y1: number) => { p.vline(Math.floor(w / 2), 0, y1, DGREY); blk(p, Math.floor(w / 2) - 2, 0, 5, 1, CHROME); };
    if (has(id, 'crystal')) { cord(3); for (let i = 0; i < 5; i++) { const ax = Math.round(2 + (i * (w - 5)) / 4); p.line(Math.floor(w / 2), 4, ax, 8, GOLD); p.vline(ax, 8, 10, GOLD); p.put(ax, 7, GLOW); for (let j = 0; j < 3; j++) p.put(ax + (j - 1), 11 + (j % 2), C('#d8f0f8')); } p.vline(Math.floor(w / 2), 4, h - 2, GOLD); p.put(Math.floor(w / 2), h - 1, C('#d8f0f8')); }
    else if (has(id, 'sputnik')) { cord(4); discV(p, w / 2 - 0.5, h / 2 + 2, 3, BRASS, { ink: false, spec: true }); for (let i = 0; i < 10; i++) { const an = (i / 10) * Math.PI * 2; const ex = Math.round(w / 2 + Math.cos(an) * (w / 2 - 1)), ey = Math.round(h / 2 + 2 + Math.sin(an) * (h / 2 - 3)); p.line(Math.floor(w / 2), Math.floor(h / 2) + 2, ex, ey, BRASS); p.put(ex, ey, GLOW); } }
    else if (has(id, 'fluorescent', 'led_panel', 'smart_ceiling')) { blk(p, 0, 0, w, Math.max(3, h - 1), has(id, 'fluorescent') ? C('#c8ccd4') : W0); p.hline(1, w - 2, Math.max(3, h - 1) - 1, has(id, 'smart') ? C('#ffd8a0') : C('#f0f8ff')); for (let i = 0; i < 2; i++) p.hline(2 + i, w - 3 - i, Math.max(3, h - 1) + i, withAlpha(has(id, 'smart') ? C('#ffd8a0') : C('#f0f8ff'), 70 - i * 30)); }
    else if (has(id, 'stage_par', 'track', 'laser')) { blk(p, 0, 0, w, 2, DGREY); const n = has(id, 'laser') ? 2 : 4; for (let i = 0; i < n; i++) { const cx = Math.round(3 + (i * (w - 7)) / Math.max(1, n - 1)); blk(p, cx - 2, 2, 5, Math.max(4, h - 4), has(id, 'track') ? W0 : BLACK); const c = has(id, 'laser') ? C('#4af04a') : has(id, 'track') ? GLOW : [C('#ff4a3a'), C('#4a8aff'), C('#f0d040'), C('#e04ab0')][i]; p.hline(cx - 1, cx + 1, Math.max(4, h - 4) + 1, c); p.put(cx, Math.max(4, h - 4) + 2, withAlpha(c, 120)); } }
    else if (has(id, 'industrial')) { for (let i = 0; i < 3; i++) { const cx = Math.round(4 + (i * (w - 9)) / 2); p.vline(cx, 0, h - 7, BLACK); for (let yy = 0; yy < 5; yy++) p.hline(cx - yy, cx + yy, h - 6 + yy, yy === 0 ? lv(DGREY, 4) : DGREY); p.hline(cx - 2, cx + 2, h - 1, GLOW); } }
    else if (has(id, 'rice')) { cord(2); discV(p, w / 2 - 0.5, h / 2 + 1, Math.min(w, h) / 2 - 1.5, lv(GLOW, 4), { ink: false }); for (let yy = 4; yy < h - 1; yy += 2) p.hline(Math.floor(w / 2) - 3, Math.floor(w / 2) + 3, yy, withAlpha(lv(GLOW, 2), 120)); }
    else { cord(Math.floor(h * 0.4)); for (let yy = Math.floor(h * 0.4); yy < h - 1; yy++) { const ww2 = Math.round(2 + (w / 2 - 2) * ((yy - h * 0.4) / (h * 0.6))); p.hline(Math.floor(w / 2) - ww2, Math.floor(w / 2) + ww2, yy, yy === Math.floor(h * 0.4) ? lv(st === 'nouveau' ? BRASS : C('#e8e0d0'), 4) : st === 'nouveau' ? BRASS : C('#e8e0d0')); } p.hline(Math.floor(w / 2) - 3, Math.floor(w / 2) + 3, h - 1, GLOW); }
  } else if (d.cat === 'sign') {
    const lit = has(id, 'neon', 'led', 'lightbox', 'marquee', 'projection');
    const bg = has(id, 'brass') ? BRASS : has(id, 'steel') ? CHROME : lit ? C('#16141c') : has(id, 'gilt') ? withAlpha(C('#2a3a4a'), 0) : lv(m, 2.4);
    if (!has(id, 'gilt', 'steel', 'projection')) blk(p, 0, 0, w, h, bg);
    const fg = has(id, 'neon') ? C('#ff5ab0') : has(id, 'led') ? C('#38e0d0') : has(id, 'marquee') ? C('#f8e8a0') : has(id, 'gilt') ? GOLD : has(id, 'steel') ? lv(CHROME, 1.5) : has(id, 'projection') ? withAlpha(C('#a0e0ff'), 160) : has(id, 'brass') ? lv(BRASS, 1) : W0;
    const name = (brand || 'MASTERS').toUpperCase();
    let txt = name; while (txt.length > 1 && textWidth(txt) > w - 4) txt = txt.slice(0, -1);
    const tw = textWidth(txt);
    const ty = Math.max(1, Math.floor((h - 5) / 2));
    if (lit) drawText(p, txt, Math.floor((w - tw) / 2), ty + 1, withAlpha(fg, 90));
    drawText(p, txt, Math.floor((w - tw) / 2), ty, fg);
    if (has(id, 'marquee')) for (let i = 1; i < w - 1; i += 2) { p.put(i, 1, GLOW); p.put(i, h - 2, GLOW); }
    if (has(id, 'googie')) { p.poly([[2, h - 6], [w - 8, h - 6], [w - 8, h - 9], [w - 2, h - 4], [w - 8, h + 1], [w - 8, h - 2], [2, h - 2]], C('#d23c3c')); for (let i = 4; i < w - 9; i += 3) p.put(i, h - 4, GLOW); p.disc(w - 5, 4, 3, C('#f0d040')); p.put(w - 5, 0, GLOW); }
  } else {
    blk(p, 0, 0, w, h, m);
  }
  q.blit(p, 1, 1 + top);
  if (top) hang(q, Math.floor(q.w / 2), 2, q.w - 3, top + 1);
  q.outline(INK);
  // sombra no pé (peças de chão), roxeada como no resto do jogo
  if (d.slots[0] === 'floor' && d.cat !== 'light') { const sy = q.h - 1; for (let xx = 1; xx < q.w - 1; xx++) if (q.get(xx, sy - 1) && !q.get(xx, sy)) q.put(xx, sy, withAlpha(C('#2a1a3a'), 110)); }
  return q;
}
const xx = (y: number, sh: number): boolean => y > sh * 0.6;
/** Pessoinha (cabeça e ombros) para retratos e pôsteres. */
function bustArt(p: Px, x: number, y: number, skin: Col, cloth: Col, hair: Col): void {
  p.rect(x - 1, y + 4, 6, 3, cloth); p.hline(x, x + 3, y + 3, cloth);
  p.rect(x, y, 4, 3, skin); p.hline(x, x + 3, y - 1, hair); p.put(x - 1, y, hair);
}
function screenArt(p: Px, x: number, y: number, w: number, h: number, on: boolean, tone: Col = C('#3a7ab8')): void {
  p.rect(x, y, w, h, on ? lv(tone, 3.5) : lv(tone, 1));
  if (w > 3 && h > 2) { p.hline(x + 1, x + w - 2, y + 1, on ? lv(tone, 5) : lv(tone, 2)); p.put(x + 1, y + 1, on ? W0 : lv(tone, 3)); }
}

// ---------------------------------------------------------------- obrigatórios (nível)

const REQ_ART5: Partial<Record<string, Obj5>> = {
  telefone: 'phone', arquivoaco: 'filing', cofre: 'safe', livrocaixa: 'ledger', fichario: 'rolodex', mesames: 'monthdesk', radiotv: 'radiotv', mesareuniao: 'meeting', cama: 'bed',
};
/** O obrigatório no nível `lv` (0 = de fábrica). Exp5px quando existe; mesa de som, piano e som do palco desenhados aqui
 *  (crescem com o nível: mais canais, cauda maior, mais caixas). Selo dourado com o nível no canto. */
export function reqPx5(req: string, lvl: number, year: number, u?: UpgDef31): Px {
  const p = paletteOf(year);
  const art = REQ_ART5[req];
  let q: Px;
  if (art) q = obj5Px(art, u ? Math.max(u.from, Math.min(year, u.to ?? year)) : year);
  else {
    const style = u?.style ?? 'any';
    const [m] = styleCols(style, p); const pal = p;
    if (req === 'mesasom') {
      // mesa de corte em cera → console de válvulas → 8 pistas → 24 pistas → console grande → sala imersiva
      const w = 34 + lvl * 8, hh = 24;
      q = new Px(w + 2, hh + 2);
      const body = lvl === 0 ? pal.woodDark : lvl === 1 ? C('#5a4a3a') : lvl === 2 ? C('#3a3c44') : lvl === 3 ? C('#2a2a30') : C('#1e1e24');
      blk(q, 1, 10, w, hh - 13, body); // gabinete
      q.rect(3, hh - 3, 2, 3, INK); q.rect(w - 3, hh - 3, 2, 3, INK);
      for (let xx = 2; xx < w; xx++) { const y0 = 4 + Math.floor((xx - 1) / (w / 3)) * 0; q.vline(xx, y0 + 2 - Math.floor((xx * 2) / w), 10, xx === 2 ? lv(body, 4) : lv(body, 2.4)); }
      q.hline(1, w, 3, lv(body, 4.4));
      const ch = 4 + lvl * 3;
      for (let i = 0; i < ch; i++) {
        const cx = 4 + Math.floor((i * (w - 7)) / ch);
        q.vline(cx, 5, 9, BLACK); q.rect(cx - 0, 5 + ((i * 3 + lvl) % 4), 1, 1, lvl >= 2 ? C('#e8e0d0') : CHROME);
        q.put(cx, 4, [C('#d23c3c'), C('#f0d040'), C('#4aa05a'), C('#3a78b8')][i % 4]);
      }
      if (lvl >= 2) { blk(q, Math.floor(w / 2) - 7, 0, 14, 4, BLACK); for (let i = 0; i < 2; i++) q.rect(Math.floor(w / 2) - 5 + i * 6, 1, 4, 2, lv(GLOW, 3)); }
      if (lvl >= 3) { q.rect(w - 9, 1, 7, 3, lv(C('#3a7ab8'), 4)); q.put(w - 8, 2, W0); }
      if (lvl >= 4) for (let i = 3; i < w - 2; i += 4) q.put(i, 11, C('#38e0d0'));
      if (lvl === 0) { q.disc(9, 6, 4, BLACK); q.ring(9, 6, 4, CHROME); q.line(14, 3, 10, 6, BRASS); }
    } else if (req === 'piano') {
      const w = 30 + lvl * 6, hh = 26;
      q = new Px(w + 2, hh + 2);
      const body = lvl === 0 ? pal.woodDark : BLACK;
      if (lvl >= 2) { for (let xx = 1; xx <= w; xx++) { const t2 = xx < w * 0.5 ? 6 : Math.round(6 + ((xx - w * 0.5) / (w * 0.5)) ** 2 * 7); q.vline(xx, t2, 15, xx === 1 ? lv(body, 3) : lv(body, 1.6)); } q.line(3, 6, Math.floor(w * 0.7), 0, lv(body, 2.5)); q.vline(Math.floor(w * 0.7), 0, 6, CHROME); }
      else { blk(q, 1, 0, w, 16, body); q.rect(3, 2, w - 4, 4, lv(body, 2)); q.hline(3, w - 2, 2, lv(body, 4)); if (lvl === 0) for (let i = 4; i < w - 2; i += 6) q.put(i, 4, BRASS); }
      blk(q, 1, 11, Math.min(w, 22), 4, body); q.rect(2, 11, Math.min(w, 22) - 2, 2, W0); for (let xx = 3; xx < Math.min(w, 22); xx += 2) q.put(xx, 11, BLACK);
      for (const lx of [3, Math.floor(w / 2), w - 3]) blk(q, lx, 16, 2, hh - 16, body);
      q.hline(1, w, 16, lv(body, 3));
    } else if (req === 'palco') {
      const n = 1 + lvl, w = n * 12 + 2, hh = 30;
      q = new Px(w + 2, hh + 2);
      for (let i = 0; i < n; i++) {
        const bx = 1 + i * 12;
        blk(q, bx, 4, 11, hh - 4, lvl === 0 ? pal.woodDark : C('#26242a'));
        for (const [cy, rr] of [[11, 3.4], [22, 4]] as [number, number][]) { q.disc(bx + 5, cy, rr, lv(DGREY, 1.6)); q.ring(bx + 5, cy, rr, BLACK); q.disc(bx + 5, cy, 1.2, BLACK); q.put(bx + 3, cy - 2, GREY); }
        q.hline(bx + 2, bx + 8, 6, GREY);
      }
      if (lvl >= 3) { q.hline(1, w, 1, DGREY); for (let i = 0; i < n; i++) q.vline(6 + i * 12, 1, 4, DGREY); }
      if (lvl === 0) { q.rect(Math.floor(w / 2) - 1, 0, 3, 4, BRASS); }
    } else {
      q = new Px(18, 18); blk(q, 1, 1, 16, 16, lv(m, 2.4));
    }
    q.outline(INK);
  }
  if (lvl > 0) {
    const out = new Px(q.w + 6, q.h + 4);
    out.blit(q, 0, 4);
    out.rect(out.w - 7, 0, 7, 6, C('#e0b040')); out.outline(INK);
    for (let i = 0; i < lvl; i++) out.put(out.w - 6 + i * 1.5 | 0, 2, INK);
    return out;
  }
  return q;
}

// ---------------------------------------------------------------- cômodo (papel, piso, janela, teto)

/** Pinta o cômodo vazio: parede (ou papel de parede), lambri, piso (ou tapete), janela com a cidade, luz de teto. */
export function roomPx5(W: number, H: number, year: number, o: { paper?: DecoDef31; ground?: DecoDef31; window?: DecoDef31; ceiling?: DecoDef31; win?: [number, number]; noWin?: boolean; seed: number; desk?: [number, number] }): Px {
  const p = paletteOf(year);
  const q = new Px(W, H);
  const FL = H - 20;
  // parede
  const wc = o.paper ? styleCols(o.paper.style, p) : null;
  for (let y = 0; y < FL; y++) for (let x = 0; x < W; x++) {
    let c = p.wall;
    if (wc && o.paper) {
      const id = o.paper.id;
      if (has(id, 'brick')) c = ((y % 6 === 0) || ((x + (Math.floor(y / 6) % 2) * 6) % 12 === 0)) ? lv(C('#8a4a38'), 0) : lv(C('#a85a40'), 1);
      else if (has(id, 'stripe', 'wood')) c = (x % 8 < 4) ? lv(wc[0], 1) : lv(wc[0], 2);
      else if (has(id, 'acoustic')) c = ((x >> 2) + (y >> 2)) % 2 ? C('#3a3a44') : C('#4a4a56');
      else if (has(id, 'white', 'concrete')) c = has(id, 'concrete') && (x * 7 + y * 13) % 29 === 0 ? C('#9a9890') : has(id, 'concrete') ? C('#b4b0a8') : C('#eeeae2');
      else if (has(id, 'led')) c = (x % 16 < 15 && y % 16 < 15) ? mix(C('#203048'), C('#38e0d0'), ((x + y) % 32) / 64) : INK;
      else c = ((x % 10 === 5 && y % 10 === 5) || (x % 10 === 0 && y % 10 === 0)) ? lv(wc[2], 2) : ((x + y) % 2 ? lv(wc[1], 1) : lv(wc[1], 2));
    } else if (y > FL - 26) c = p.wall2;
    q.put(x, y, c);
  }
  q.hline(0, W - 1, FL - 26, p.trim);
  // piso
  const gc = o.ground ? styleCols(o.ground.style, p) : null;
  for (let y = FL; y < H; y++) for (let x = 0; x < W; x++) {
    let c = (Math.floor(x / 14) + (y % 2)) % 2 ? p.ground[0] : p.ground[1];
    if (gc && o.ground) {
      const id = o.ground.id;
      if (has(id, 'checker')) c = (Math.floor(x / 6) + Math.floor((y - FL) / 6)) % 2 ? C('#f0ece4') : C('#2a2a30');
      else if (has(id, 'disco')) c = ((Math.floor(x / 8) * 3 + Math.floor((y - FL) / 5)) % 4 === 0) ? C('#f0d040') : ((Math.floor(x / 8) + Math.floor((y - FL) / 5)) % 3 ? C('#c040a0') : C('#40c0d8'));
      else if (has(id, 'persian', 'kilim')) c = (x > W * 0.2 && x < W * 0.8 && y > FL + 3) ? (((x + y) % 4) ? C('#8a2430') : C('#c09048')) : p.ground[0];
      else if (has(id, 'shag', 'carpet')) c = (x * 5 + y * 3) % 7 ? lv(gc[0], 1) : lv(gc[0], 0);
      else if (has(id, 'concrete')) c = C('#a8a49c');
      else c = ((x + (y - FL) * 2) % 12 < 1) ? lv(gc[0], 0) : lv(gc[0], 2);
    }
    q.put(x, y, c);
  }
  q.hline(0, W - 1, FL, p.trim); q.hline(0, W - 1, FL - 1, shade(p.trim, 0.7));
  // janela (a vista é a cidade: céu da hora e silhuetas)
  if (!o.noWin && o.win) {
    const [wx, ww] = o.win; const wy = 22, wh = 34;
    q.rect(wx - 2, wy - 2, ww + 4, wh + 4, p.woodDark);
    for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) q.put(wx + x, wy + y, mix(C('#8ab8e0'), C('#e8c8a0'), y / wh));
    for (let i = 0; i < ww; i += 5) { const bh = 6 + ((o.seed * 31 + i * 17) % 14); q.rect(wx + i, wy + wh - bh, 4, bh, mix(C('#506078'), INK, 0.3)); }
    q.vline(wx + Math.floor(ww / 2), wy, wy + wh - 1, p.woodDark); q.hline(wx, wx + ww - 1, wy + Math.floor(wh / 2), p.woodDark);
    if (o.window) {
      const [m, s2] = styleCols(o.window.style, p);
      const id = o.window.id;
      if (has(id, 'blind', 'venetian', 'vertical')) for (let y = wy; y < wy + wh * 0.6; y += 2) q.hline(wx, wx + ww - 1, y, has(id, 'vertical') ? s2 : C('#c8ccd4'));
      else if (has(id, 'planter')) { q.rect(wx - 2, wy + wh + 2, ww + 4, 5, p.pot); for (let i = 0; i < ww; i += 3) q.rect(wx + i, wy + wh - 1, 2, 3, lv(p.plant, 3)); }
      else if (has(id, 'smart')) for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) q.put(wx + x, wy + y, withAlpha(C('#203048'), 120));
      else if (has(id, 'stained')) for (let x = 0; x < ww; x++) for (let y = 0; y < 8; y++) q.put(wx + x, wy + y, [C('#c03030'), C('#3060c0'), C('#e0b040'), C('#309050')][((x >> 2) + (y >> 2)) % 4]);
      else { q.rect(wx - 6, wy - 4, 7, wh + 8, lv(m, 1)); q.rect(wx + ww - 1, wy - 4, 7, wh + 8, lv(m, 1)); q.rect(wx - 6, wy - 6, ww + 12, 4, lv(s2, 0)); for (let y = wy - 4; y < wy + wh + 4; y += 3) { q.put(wx - 3, y, lv(m, 3)); q.put(wx + ww + 2, y, lv(m, 3)); } }
    }
  }
  // aparador sob a janela (onde ficam as peças "sobre a mesa")
  if (o.desk) {
    const [a, b] = o.desk;
    q.rect(a, 78, b - a, FL + 1 - 78, p.wood);
    q.hline(a, b - 1, 78, lv(p.wood, 4)); q.hline(a, b - 1, 79, lv(p.wood, 3));
    for (let x = a + 6; x < b - 4; x += Math.max(10, Math.floor((b - a) / 3))) q.vline(x, 82, FL - 2, p.woodDark);
    q.rect(a + 1, FL - 1, 2, 2, p.woodDark); q.rect(b - 3, FL - 1, 2, 2, p.woodDark);
  }
  // luz de teto padrão (sem peça): plafon simples
  if (!o.ceiling) { const cx = Math.floor(W / 2); q.rect(cx - 4, 0, 8, 3, p.metal); q.hline(cx - 3, cx + 3, 3, p.lamp); }
  return q;
}
