// R31 · DECO-A — ARTE da decoração (casa, sede e estabelecimentos) e dos UPGRADES dos itens obrigatórios.
//
// Desenha CADA item do catálogo da DECO-M (`src/data/deco31.ts`: DECO31 e UPG31) no tamanho do catálogo. Mesmo padrão
// aprovado de exp5px/props31: corte lateral, luz de cima à esquerda, pé em sombra, contorno escuro quente (INK) de 1 px
// na silhueta, escala dos bonecos (avatarSprite 24×34). Nada flutua: quadro tem prego e barbante, lustre e planta
// pendurada têm fio até o teto (y = 0), móvel de chão pisa na última linha, objeto de mesa tem base na última linha.
//
// Oito ESTILOS de época (art nouveau, art déco, anos 50, 70, 80, 90, minimalista, casa inteligente). Item com estilo
// tem o desenho do seu estilo em qualquer ano (uma poltrona déco continua déco em 1980); item "sem época" (any) muda
// com a época do ano pedido (moldura, madeira, tecido, pés). Estados: "novo" e "usado/vintage" (desbotado, riscado,
// manchado); o que tem luz acende. Papéis de parede e pisos são LADRILHOS 16×16 que se repetem sem costura (função
// periódica de x, y). Cortinas e molduras deixam o vão DWIN livre (a vista da cidade continua). Letreiros aceitam o
// nome do selo. Upgrades: cada modelo de UPG31 no tamanho fixo do seu item obrigatório; nível maior = visivelmente melhor.
//
//   decoStyleOf(id, ano)          — PURO: índice do estilo com que o item é desenhado (o dele, ou o da época);
//   decoPx(id, ano, op)           — PURO (só Px): o item com margem DPAD (contorno); padrões devolvem o ladrilho;
//   decoTilePx / decoFillPx       — PURO: ladrilho e área preenchida dos padrões (papel de parede, piso);
//   upgPx(id, ano, op)            — PURO: modelo de upgrade (id de UPG31) no tamanho do item obrigatório.
// Tudo determinístico (sem sorteio): mesma entrada, mesmos pixels. Nada vai para o save. Só aparência.

import { C, INK, Px, lv, mix, noise, rgba, pack, withAlpha, type Col } from './px';
import { abbrText, drawText, textWidth } from './font';
import { DECO31, STYLE31, STYLE31_FROM, UPG31, decoDef31, upgDef31, type DecoDef31, type DecoStyle31 } from '../../data/deco31';

// ---------------------------------------------------------------- estilos de época

/** Os 8 estilos, na ordem do catálogo (STYLE31). */
export const DSTY: DecoStyle31[] = STYLE31;
/** Ano típico de cada estilo (galeria e testes). */
export const DSTY_YEAR: number[] = [1905, 1935, 1958, 1974, 1985, 1996, 2008, 2025];
/** Estilo (índice 0..7) da época de um ano, nos mesmos cortes do catálogo (STYLE31_FROM). */
export function styOf(year: number): number {
  let k = 0;
  STYLE31.forEach((st, i) => { if (year >= STYLE31_FROM[st]) k = i; });
  return k;
}
/** Primeiro e último ano de cada estilo como época. */
export const styRange = (i: number): [number, number] => [STYLE31_FROM[STYLE31[i]], i < 7 ? STYLE31_FROM[STYLE31[i + 1]] - 1 : 2040];

/** Materiais de cada estilo: madeira, tecido, metal e acentos (cada cor vira rampa com lv). */
interface Mat { wood: Col; wood2: Col; fab: Col; fab2: Col; metal: Col; acc: Col; acc2: Col; glass: Col; wall: Col; floor: Col }
const M: Mat[] = [
  { wood: C('#6a3a22'), wood2: C('#4a2416'), fab: C('#8a2a3a'), fab2: C('#c8a060'), metal: C('#c09048'), acc: C('#5a8a5a'), acc2: C('#d8b878'), glass: C('#a8c8b8'), wall: C('#b8a888'), floor: C('#6a4a30') },
  { wood: C('#2e2024'), wood2: C('#1a1418'), fab: C('#e6dac0'), fab2: C('#20202a'), metal: C('#e0b048'), acc: C('#2a7a7a'), acc2: C('#c8584a'), glass: C('#c8d8e0'), wall: C('#d8c8a0'), floor: C('#3a2a2a') },
  { wood: C('#c48a52'), wood2: C('#8a5a30'), fab: C('#48a8a0'), fab2: C('#f0a0a8'), metal: C('#c0c4cc'), acc: C('#e04848'), acc2: C('#f0d040'), glass: C('#a8e0f0'), wall: C('#e8e0c0'), floor: C('#a8a088') },
  { wood: C('#7a4a24'), wood2: C('#4a2c18'), fab: C('#d8782a'), fab2: C('#a8862a'), metal: C('#c0a060'), acc: C('#7a8a2a'), acc2: C('#a8401a'), glass: C('#c8b070'), wall: C('#c8a868'), floor: C('#8a5a2a') },
  { wood: C('#ece6dc'), wood2: C('#24242a'), fab: C('#e04898'), fab2: C('#3ac0d0'), metal: C('#26262c'), acc: C('#f0e040'), acc2: C('#6a4ad0'), glass: C('#b8a8f0'), wall: C('#d8d0e0'), floor: C('#5a5a6a') },
  { wood: C('#c8a070'), wood2: C('#8a6a44'), fab: C('#4a6a8a'), fab2: C('#8a3a2a'), metal: C('#8a8c94'), acc: C('#d8a030'), acc2: C('#3a6a3a'), glass: C('#b8d0c8'), wall: C('#d8d0b8'), floor: C('#9a7a50') },
  { wood: C('#e2cfaa'), wood2: C('#b89a70'), fab: C('#c4c4c0'), fab2: C('#f2f0ea'), metal: C('#2a2a2e'), acc: C('#6a7a6a'), acc2: C('#c8784a'), glass: C('#d8e4e8'), wall: C('#ecebe6'), floor: C('#c8c0b0') },
  { wood: C('#9a7250'), wood2: C('#6a4a34'), fab: C('#4c4e56'), fab2: C('#8a8c96'), metal: C('#d8dce4'), acc: C('#5ae0ff'), acc2: C('#2a2c34'), glass: C('#30404c'), wall: C('#d0d4d8'), floor: C('#7a7a80') },
];
export const decoWall = (s: number): Col => M[s].wall;
export const decoFloor = (s: number): Col => M[s].floor;

/** Vão da janela dentro de cortina/moldura (transparente: a vista da cidade aparece por trás). */
export const DWIN = { x: 6, y: 6, w: 24, h: 30 } as const;

// ---------------------------------------------------------------- peças comuns

/** s = forma (variante do desenho) · m = materiais (estilo) · e = estilo da época (itens sem época mudam com ela). */
interface Dc { p: Px; fx: Px; s: number; m: Mat; e: number; lit: boolean; w: number; h: number; name: string }

const W = C('#f8f4ec'), PAPER = C('#efe6cc'), RED = C('#c83a32'), GOLD = C('#e0b048'), BRASS = C('#c09048'), CHROME = C('#b8bcc8');
const BLACK = C('#1e1c22'), GREY = C('#8a8c94'), DGREY = C('#4a4c56'), GLOW = C('#ffe08a'), LEAF = C('#3c8a3c'), LEAF2 = C('#5cb04c');
const BULB = C('#fff4c0'), LED = C('#ff4a3a');

/** Bloco com luz de cima à esquerda e pé em sombra (mesma conta de exp5px). */
const blk = (p: Px, x: number, y: number, w: number, h: number, c: Col): void => {
  if (w <= 0 || h <= 0) return;
  p.rect(x, y, w, h, c);
  p.hline(x, x + w - 1, y, lv(c, 4));
  if (h > 3 && w > 3) p.vline(x, y + 1, y + h - 2, lv(c, 3.5));
  p.hline(x, x + w - 1, y + h - 1, lv(c, 1));
  if (h > 2) p.vline(x + w - 1, y + 1, y + h - 2, lv(c, 2));
};
/** Moldura de espessura t com o miolo em outra cor. */
const framed = (p: Px, x: number, y: number, w: number, h: number, t: number, fr: Col, inner: Col): void => {
  blk(p, x, y, w, h, fr);
  p.rect(x + t, y + t, w - 2 * t, h - 2 * t, inner);
  p.hline(x + t, x + w - t - 1, y + t, lv(inner, 2));
};
/** Prego e barbante: o quadro não flutua. */
const hang = (p: Px, cx: number, x0: number, x1: number, yb: number): void => {
  const s = C('#4a3a30');
  p.line(cx, 0, x0, yb, s); p.line(cx, 0, x1, yb, s);
  p.put(cx, 0, C('#8a8a92'));
};
/** Bola sombreada (luz de cima à esquerda). */
const ball = (p: Px, cx: number, cy: number, r: number, c: Col): void => {
  p.disc(cx, cy, r, (x, y) => { const dx = x + 0.5 - cx, dy = y + 0.5 - cy; return dx + dy < -r * 0.5 ? lv(c, 4.4) : dx + dy > r * 0.6 ? lv(c, 1.6) : c; });
};
/** Brilho de luz (vai para a camada fx: luz não ganha contorno). */
const glow = (d: Dc, cx: number, cy: number, r: number, c: Col = GLOW): void => {
  if (!d.lit) return;
  d.fx.disc(cx, cy, r, (_x, _y, dd) => withAlpha(c, Math.round(110 * (1 - dd / (r + 0.5)))));
};
/** Pés do móvel no estilo da época, de `top` até o chão (última linha). Retorna nada; desenha em x0 e x1 (bordas). */
function legs(d: Dc, x0: number, x1: number, top: number): void {
  const { p, s, m, h } = d, fl = h - 1;
  if (s === 0) { // cabriolé curvo com pezinho
    for (const [x, dir] of [[x0, -1], [x1, 1]] as const) { p.line(x, top, x + dir, top + ((fl - top) >> 1), m.wood2); p.line(x + dir, top + ((fl - top) >> 1), x, fl - 1, m.wood2); p.put(x, fl, m.metal); p.put(x + dir, fl, lv(m.wood2, 1)); }
  } else if (s === 1) { // rodapé escalonado preto com filete dourado
    blk(p, x0, top, x1 - x0 + 1, fl - top + 1, m.wood2); p.hline(x0 + 1, x1 - 1, top + 1, m.metal);
  } else if (s === 2) { // pés palito abertos com ponteira
    p.line(x0 + 2, top, x0, fl, m.wood2); p.line(x1 - 2, top, x1, fl, m.wood2); p.put(x0, fl, m.metal); p.put(x1, fl, m.metal);
  } else if (s === 3) { // base baixa e recuada
    p.rect(x0 + 2, top, x1 - x0 - 3, fl - top + 1, lv(m.wood2, 1.4));
  } else if (s === 4) { // pés geométricos coloridos: cilindro e cone
    blk(p, x0, top, 3, fl - top + 1, m.acc); p.poly([[x1 - 3, fl + 1], [x1 + 1, fl + 1], [x1 - 1, top]], m.acc2);
  } else if (s === 5) { // pés retos de madeira
    blk(p, x0, top, 2, fl - top + 1, m.wood2); blk(p, x1 - 1, top, 2, fl - top + 1, m.wood2);
  } else if (s === 6) { // grampo de aço fino
    p.line(x0 + 1, top, x0, fl, m.metal); p.line(x0 + 1, top, x0 + 3, fl, m.metal); p.line(x1 - 1, top, x1, fl, m.metal); p.line(x1 - 1, top, x1 - 3, fl, m.metal);
  } else { // base recuada escura com fita de LED no chão
    p.rect(x0 + 3, top, x1 - x0 - 5, fl - top + 1, C('#1e1e24'));
    p.hline(x0 + 3, x1 - 3, fl, d.lit ? lv(m.acc, 5) : lv(m.acc, 2));
    if (d.lit) d.fx.hline(x0 + 1, x1 - 1, fl, withAlpha(m.acc, 120));
  }
}
/** Livros numa fileira (altura e cor variando, determinístico). */
function books(p: Px, x: number, yb: number, w: number, hmax: number, seed: number, cols: Col[]): void {
  let xx = x;
  let i = 0;
  while (xx < x + w) {
    const bw = 1 + (noise(i, seed, 3) > 0.6 ? 1 : 0);
    const bh = hmax - Math.floor(noise(i, seed, 5) * 3);
    if (xx + bw > x + w) break;
    const c = cols[Math.floor(noise(i, seed, 9) * cols.length)];
    p.rect(xx, yb - bh + 1, bw, bh, c); p.put(xx, yb - bh + 1, lv(c, 4.4));
    xx += bw + (noise(i, seed, 11) > 0.85 ? 1 : 0);
    i++;
  }
}
/** Folhagem: tufo de folhas em volta de (cx, cy). */
function foliage(p: Px, cx: number, cy: number, rx: number, ry: number, seed: number, a: Col = LEAF, b: Col = LEAF2): void {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const k = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
    if (k > 1 - noise(x, y, seed) * 0.45) continue;
    const hi = x + y < cx + cy - 1 && noise(x, y, seed + 1) > 0.35;
    p.set(x, y, hi ? b : noise(x, y, seed + 2) > 0.8 ? lv(a, 1.6) : a);
  }
}

// ---------------------------------------------------------------- parede

/** Pôster: litografia nouveau → raios déco → jazz anos 50 → psicodelia → grade neon → fotocópia grunge → suíço → moldura digital. */
function poster(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const y0 = s <= 1 ? 3 : 1, ph = h - y0;
  if (s <= 1) hang(p, w >> 1, 3, w - 4, y0);
  if (s === 0) {
    framed(p, 0, y0, w, ph, 1, m.wood2, PAPER);
    p.rect(2, y0 + 2, w - 4, ph - 4, C('#e8d8b0'));
    p.disc(w / 2, y0 + 9, 5, C('#d8b060')); p.disc(w / 2, y0 + 9, 3.6, C('#e8d8b0')); // auréola
    p.rect(w / 2 - 2, y0 + 7, 3, 4, C('#f0c8a0')); p.line(w / 2 - 3, y0 + 6, w / 2 - 5, y0 + 15, C('#a84a2a')); p.line(w / 2 + 1, y0 + 6, w / 2 + 4, y0 + 16, C('#a84a2a'));
    p.poly([[w / 2 - 4, y0 + 11], [w / 2 + 3, y0 + 11], [w / 2 + 5, y0 + 18], [w / 2 - 6, y0 + 18]], m.acc);
    for (let x = 3; x < w - 3; x++) p.put(x, y0 + 4 + Math.round(Math.sin(x * 0.9)), m.acc);
    p.rect(3, h - 4, w - 6, 2, m.fab);
  } else if (s === 1) {
    framed(p, 0, y0, w, ph, 1, m.metal, BLACK);
    for (let i = 0; i < 7; i++) p.line(w >> 1, h - 3, 2 + i * ((w - 5) / 6), y0 + 3, i % 2 ? m.metal : lv(m.metal, 2));
    p.rect(2, h - 6, w - 4, 3, m.acc); p.hline(3, w - 4, h - 5, m.fab);
    p.rect((w >> 1) - 3, y0 + 2, 6, 2, m.fab); p.rect((w >> 1) - 2, y0 + 1, 4, 1, m.fab);
  } else if (s === 2) {
    blk(p, 0, y0, w, ph, C('#f0d040'));
    p.disc(w / 2 + 2, y0 + 9, 5.5, RED); p.disc(w / 2 + 2, y0 + 9, 2.5, C('#f0d040'));
    p.line(2, h - 4, w - 6, y0 + 4, BLACK); p.line(3, h - 4, w - 5, y0 + 4, BLACK); // saxofone estilizado
    p.rect(2, h - 5, w - 4, 3, BLACK); p.hline(3, w - 6, h - 4, W);
    p.put(3, y0 + 2, W); p.put(w - 4, y0 + 15, W);
  } else if (s === 3) {
    const rings = [C('#a8401a'), C('#d8782a'), C('#f0b040'), C('#a8862a'), C('#7a8a2a'), C('#4a2c18')];
    p.rect(0, y0, w, ph, C('#f0e0b0'));
    for (let y = 0; y < ph; y++) for (let x = 0; x < w; x++) {
      const r = Math.hypot(x - w / 2 + 0.5, (y - ph + 2) * 1.1) + Math.sin(y * 0.7) * 1.2;
      p.set(x, y0 + y, rings[Math.floor(r / 2.4) % rings.length]);
    }
    p.rect(2, y0 + 2, w - 4, 3, C('#f0e0b0')); p.hline(3, w - 5, y0 + 3, C('#7a2a5a'));
  } else if (s === 4) {
    for (let y = 0; y < ph; y++) p.hline(0, w - 1, y0 + y, mix(C('#2a1a5a'), C('#e04898'), y / ph));
    p.disc(w / 2, y0 + 10, 5, C('#f0c040')); for (let k = 0; k < 3; k++) p.hline(w / 2 - 5, w / 2 + 5, y0 + 10 + k * 2, mix(C('#2a1a5a'), C('#e04898'), 0.45));
    for (let x = 0; x < w; x += 3) p.line(w / 2, y0 + 15, x, h - 1, C('#3ac0d0'));
    p.hline(0, w - 1, y0 + 15, C('#3ac0d0')); p.hline(0, w - 1, y0 + 18, C('#3ac0d0')); p.hline(0, w - 1, h - 2, C('#3ac0d0'));
  } else if (s === 5) {
    p.rect(0, y0, w, ph, C('#d0ccc4'));
    for (let y = 0; y < ph; y++) for (let x = 0; x < w; x++) if (noise(x, y, 51) > 0.86) p.set(x, y0 + y, C('#3a3a3a'));
    p.rect(3, y0 + 5, w - 6, 9, C('#2a2a2a')); p.rect(5, y0 + 7, 4, 5, C('#8a8a8a')); p.rect(10, y0 + 6, 4, 6, C('#6a6a6a'));
    p.rect(2, h - 6, w - 4, 3, RED); p.hline(3, w - 5, h - 5, W);
    p.poly([[w - 5, y0], [w, y0], [w, y0 + 4]], 0); // canto rasgado
    for (let y = 0; y < 4; y++) for (let x = w - 4 + y; x < w; x++) p.put(x, y0 + y, 0);
  } else if (s === 6) {
    p.rect(0, y0, w, ph, W); p.hline(0, w - 1, y0, lv(W, 4));
    p.disc(w / 2 - 1, y0 + 9, 5, BLACK); p.disc(w / 2 + 2, y0 + 7, 1.6, m.acc2);
    p.hline(2, 9, h - 6, BLACK); p.hline(2, 13, h - 4, GREY); p.hline(2, 6, h - 3, GREY);
  } else {
    blk(p, 0, y0, w, ph, C('#1a1a1e'));
    const sx = 1, sy = y0 + 1, sw = w - 2, sh = ph - 4;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const t = (x + y) / (sw + sh);
      p.set(sx + x, sy + y, lv(mix(C('#3a2a8a'), C('#e85a8a'), t), lit ? 4 : 2.6));
    }
    p.disc(w / 2, sy + sh / 2, 4, lit ? C('#1a1a2a') : C('#121218')); p.disc(w / 2, sy + sh / 2, 1.2, lit ? C('#f0c040') : C('#6a5a2a'));
    p.put(w - 3, h - 2, lit ? m.acc : DGREY); glow(d, w / 2, sy + sh / 2, 9, C('#e85a8a'));
  }
  if (s >= 2 && s <= 5) { const t = C('#e8e0c8', 220); p.rect(0, y0, 2, 2, t); p.rect(w - 2, y0, 2, 2, t); } // fita/tachinha
}

/** Quadro: paisagem em moldura dourada → figura déco → abstrato anos 50 → op-art → Memphis → pop art → campo de cor → tela digital. */
function painting(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const y0 = 3;
  hang(p, w >> 1, 4, w - 5, y0);
  const fr = [C('#d8a840'), BLACK, m.wood, m.wood, W, m.wood, C('#e8e6e0'), C('#1a1a1e')][s];
  const t = s === 0 ? 3 : s === 3 || s === 6 ? 0 : 1;
  const ix = t, iy = y0 + t, iw = w - 2 * t, ih = h - y0 - 2 * t;
  if (t) blk(p, 0, y0, w, h - y0, fr);
  if (s === 0) { for (let x = 0; x < w; x += 3) { p.put(x, y0, lv(fr, 5)); p.put(x + 1, h - 1, lv(fr, 1.4)); } }
  const at = (x: number, y: number, c: Col) => p.set(ix + x, iy + y, c);
  for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) {
    let c: Col;
    const u = x / iw, v = y / ih;
    if (s === 0) c = v < 0.55 ? mix(C('#c8d8e0'), C('#f0e0c0'), v * 1.6) : v < 0.55 + 0.25 * Math.sin(u * 3) ? C('#6a8a4a') : C('#4a6a3a');
    else if (s === 1) c = (u - 0.5) ** 2 + (v - 0.45) ** 2 < 0.06 ? C('#e8c8a8') : u + v > 1.1 ? m.acc : C('#e6dac0');
    else if (s === 2) c = C('#ece4cc');
    else if (s === 3) c = Math.floor(Math.hypot(x - iw / 2, (y - ih / 2) * 1.4) / 2) % 2 ? C('#d8782a') : C('#f0e0b0');
    else if (s === 4) c = C('#f0a0c8');
    else if (s === 5) c = (x + (y % 2) * 1) % 2 === 0 && y % 2 === 0 ? C('#e04848') : C('#f8e8d0');
    else if (s === 6) c = v < 0.45 ? C('#b8584a') : v < 0.5 ? C('#e8d8c0') : C('#4a3a50');
    else c = lv(mix(C('#1a3a5a'), C('#5ae0ff'), (Math.sin(u * 6) + 1) / 4 + v / 2), lit ? 3.6 : 2.4);
    at(x, y, c);
  }
  if (s === 0) { p.vline(ix + 18, iy + 6, iy + ih - 3, C('#4a2a1a')); foliage(p, ix + 18, iy + 5, 3, 3, 3); p.disc(ix + 5, iy + 3, 1.2, C('#fff0b0')); }
  if (s === 1) { p.poly([[ix + iw / 2 - 2, iy + 9], [ix + iw / 2 + 2, iy + 9], [ix + iw / 2 + 4, iy + ih], [ix + iw / 2 - 4, iy + ih]], BLACK); p.rect(ix + iw / 2 - 3, iy + 2, 6, 2, BLACK); p.hline(ix + 1, ix + iw - 2, iy + 1, m.metal); }
  if (s === 2) { p.line(ix + 2, iy + 10, ix + 12, iy + 3, BLACK); p.line(ix + 12, iy + 3, ix + 20, iy + 12, BLACK); p.disc(ix + 6, iy + 6, 2.2, RED); p.disc(ix + 18, iy + 5, 1.8, C('#3a6ac8')); p.disc(ix + 14, iy + 11, 1.5, C('#f0d040')); p.put(ix + 9, iy + 12, BLACK); }
  if (s === 4) { for (let x = 0; x < iw; x++) p.set(ix + x, iy + 4 + Math.round(Math.sin(x * 0.8) * 1.5), BLACK); p.poly([[ix + 3, iy + ih - 1], [ix + 9, iy + ih - 1], [ix + 6, iy + 8]], C('#3ac0d0')); p.disc(ix + iw - 6, iy + ih - 5, 2.5, C('#f0e040')); p.rect(ix + 12, iy + 9, 4, 4, C('#6a4ad0')); }
  if (s === 5) { p.disc(ix + iw / 2, iy + ih / 2, 5, C('#f0d040')); p.rect(ix + iw / 2 - 2, iy + ih / 2 - 1, 1, 1, BLACK); p.rect(ix + iw / 2 + 1, iy + ih / 2 - 1, 1, 1, BLACK); p.hline(ix + iw / 2 - 2, ix + iw / 2 + 2, iy + ih / 2 + 2, BLACK); }
  if (s === 6) { p.hline(0, w - 1, y0, lv(C('#b8584a'), 4)); p.vline(w - 1, y0, h - 1, lv(C('#4a3a50'), 1)); }
  if (s === 3) p.vline(w - 1, y0, h - 1, C('#7a4a24'));
  if (s === 7) { p.put(w - 3, h - 2, lit ? m.acc : DGREY); glow(d, w / 2, h / 2 + 1, 12, C('#5ae0ff')); }
}


/** Relógio de parede: de pêndulo → raios déco → atômico → laranja → quadrado neon → escritório → sem números → digital. */
function clock(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const hands = (cx: number, cy: number, r: number, c: Col) => { p.line(cx, cy, cx, cy - r + 1, c); p.line(cx, cy, cx + r - 2, cy + 1, c); };
  if (s === 0) { // caixa com pêndulo
    hang(p, w >> 1, 4, w - 5, 2);
    blk(p, 2, 2, w - 4, h - 2, m.wood); p.poly([[2, 3], [w / 2, 0], [w - 2, 3]], m.wood2);
    p.disc(w / 2, 6.5, 3.5, PAPER); hands(7, 6, 3, BLACK);
    p.rect(4, 11, w - 8, h - 13, lv(m.wood, 1)); p.vline(7, 11, h - 5, m.metal); p.disc(7, h - 4, 1.4, m.metal);
    return;
  }
  p.put(w >> 1, 0, GREY);
  const cx = w / 2, cy = h / 2 + 1;
  if (s === 1) {
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.line(cx, cy, cx + Math.cos(a) * 6.5, cy + Math.sin(a) * 6.5, i % 2 ? m.metal : lv(m.metal, 2)); }
    p.disc(cx, cy, 4, C('#e6dac0')); p.ring(cx, cy, 4.2, BLACK); hands(7, cy, 4, BLACK);
  } else if (s === 2) {
    const R = Math.min(w, h - 1) / 2 - 1.5, n = R > 7 ? 12 : 8;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; p.line(cx, cy, x, y, i % 2 ? BRASS : m.wood2); ball(p, x, y, R > 7 ? 1.6 : 1.2, i % 2 ? m.acc : m.acc2); }
    p.disc(cx, cy, R * 0.45, m.wood); p.ring(cx, cy, R * 0.45, BRASS); hands(Math.floor(cx), cy, Math.max(3, R * 0.45), BLACK);
  } else if (s === 3) {
    p.disc(cx, cy, 6, m.fab); p.disc(cx, cy, 4.5, C('#f8ecd0')); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; p.put(cx + Math.cos(a) * 3.6 - 0.5, cy + Math.sin(a) * 3.6 - 0.5, m.wood2); } hands(7, cy, 4, m.wood2);
  } else if (s === 4) {
    blk(p, 1, 2, w - 2, w - 2, BLACK); p.rect(3, 4, w - 6, w - 6, C('#1a1a2a')); p.ring(cx, 2 + (w - 2) / 2, 4.5, lit ? C('#ff5ab0') : C('#a03a80'));
    hands(7, 2 + (w - 2) / 2, 4, C('#3ac0d0')); glow(d, cx, 2 + (w - 2) / 2, 7, C('#ff5ab0'));
  } else if (s === 5) {
    p.disc(cx, cy, 6, DGREY); p.disc(cx, cy, 5, W); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.put(cx + Math.cos(a) * 4.2 - 0.5, cy + Math.sin(a) * 4.2 - 0.5, BLACK); } hands(7, cy, 4, BLACK); p.line(7, cy, 4, cy + 3, RED);
  } else if (s === 6) {
    p.disc(cx, cy, 6, m.wood); p.disc(cx, cy, 5.2, C('#f2f0ea')); hands(7, cy, 5, BLACK); p.put(7, cy - 4.5, BLACK);
  } else {
    blk(p, 0, 4, w, 8, C('#1a1a1e')); drawText(p, '12', 1, 5.5, lit ? m.acc : lv(m.acc, 1.4)); p.put(8, 7, lit ? m.acc : lv(m.acc, 1.4)); drawText(p, '0', 10, 5.5, lit ? m.acc : lv(m.acc, 1.4));
    p.hline(1, w - 2, 12, C('#3a3a42')); p.vline(w >> 1, 0, 3, GREY); glow(d, cx, 8, 6, m.acc);
  }
}

/** Espelho decorativo de parede. */
function wallmirror(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const gl = lit ? mix(m.glass, GLOW, 0.4) : m.glass;
  const shine = (x: number, y: number, n: number) => p.line(x, y + n, x + n, y, lv(gl, 5));
  if (s === 0) { hang(p, w >> 1, 4, w - 5, 4); p.ellipse(w / 2, 13, 7.5, 9, m.wood); p.ellipse(w / 2, 13, 5.5, 7, gl); shine(5, 8, 3); p.poly([[3, 5], [w / 2, 1], [w - 3, 5], [w / 2, 4]], m.wood2); p.put(w / 2, 2, m.metal); }
  else if (s === 1) { hang(p, w >> 1, 3, w - 4, 3); p.poly([[3, 3], [w - 3, 3], [w - 1, 6], [w - 1, h - 1], [0, h - 1], [0, 6]], m.metal); p.rect(2, 6, w - 4, h - 8, gl); for (let i = 0; i < 3; i++) p.vline(4 + i * 4, 7, h - 4, lv(gl, 4)); }
  else if (s === 2) { p.put(w >> 1, 0, GREY); p.vline(w >> 1, 1, 3, C('#4a3a30')); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; p.line(w / 2, 12, w / 2 + Math.cos(a) * 7.5, 12 + Math.sin(a) * 8, i % 2 ? GOLD : lv(GOLD, 2)); } p.disc(w / 2, 12, 4, gl); shine(6, 10, 2); }
  else if (s === 3) { hang(p, w >> 1, 4, w - 5, 5); p.disc(w / 2, 13, 7.5, C('#c8a060')); for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; p.put(w / 2 + Math.cos(a) * 7 - 0.5, 13 + Math.sin(a) * 7 - 0.5, C('#8a6a30')); } p.disc(w / 2, 13, 5, gl); shine(5, 11, 3); p.vline(w / 2, h - 2, h - 1, m.fab); }
  else if (s === 4) { p.put(w >> 1, 0, GREY); p.vline(w >> 1, 1, 2, C('#4a3a30')); p.poly([[1, 3], [w - 1, 3], [w - 1, h - 1], [4, h - 1]], m.acc2); p.rect(3, 5, w - 6, h - 8, gl); p.rect(w - 5, h - 6, 4, 4, m.fab); p.disc(3, 5, 2, m.acc); shine(5, 8, 3); }
  else if (s === 5) { hang(p, w >> 1, 3, w - 4, 3); framed(p, 0, 3, w, h - 3, 2, m.wood, gl); shine(4, 7, 4); }
  else if (s === 6) { p.put(w >> 1, 0, GREY); p.vline(w >> 1, 1, 3, C('#4a3a30')); p.disc(w / 2, 13, 7.5, m.metal); p.disc(w / 2, 13, 6.8, gl); shine(4, 10, 4); }
  else { p.put(w >> 1, 0, GREY); blk(p, 0, 2, w, h - 2, C('#2a2a30')); p.rect(1, 3, w - 2, h - 4, mix(gl, C('#20303a'), 0.5)); drawText(p, '21', 2, 5, lit ? m.acc : lv(m.acc, 2)); p.disc(11.5, 6.5, 1.4, lit ? C('#f0c040') : DGREY); p.hline(2, 8, 12, lit ? lv(m.acc, 4) : DGREY); glow(d, w / 2, 8, 7, m.acc); }
}


// ---------------------------------------------------------------- chão

/** Sofá: camelback capitonê → clube déco → palito anos 50 → modular de veludo cotelê → Memphis → estofadão com manta → linha baixa → modular com LED. */
function sofa(d: Dc): void {
  const { p, s, m, w, h } = d;
  const lh = [4, 3, 5, 2, 4, 3, 5, 2][s], fl = h - 1;
  const sb = fl - lh, sy = sb - 5; // assento: sy..sb
  const bh = [10, 9, 6, 8, 8, 9, 6, 7][s], by = sy - bh;
  const aw = [5, 7, 2, 6, 4, 6, 2, 5][s]; // largura do braço
  const back = s === 4 ? m.fab2 : m.fab, seat = m.fab, arm = s === 4 ? m.acc : s === 2 ? m.wood : m.fab;
  // encosto
  if (s === 0) { p.poly([[aw - 1, sy + 1], [aw - 1, by + 4], [w / 2 - 8, by], [w / 2 + 8, by], [w - aw + 1, by + 4], [w - aw + 1, sy + 1]], back); p.line(aw - 1, by + 4, w / 2 - 8, by, lv(back, 4)); p.hline(w / 2 - 8, w / 2 + 8, by, lv(back, 4)); p.line(w / 2 - 8, by - 1, w / 2 + 8, by - 1, m.wood2); }
  else if (s === 3) { for (let i = 0; i < 3; i++) { const x = aw + i * ((w - 2 * aw) / 3); p.ellipse(x + (w - 2 * aw) / 6, by + bh / 2 + 1, (w - 2 * aw) / 6, bh / 2 + 1, back); p.hline(x + 3, x + (w - 2 * aw) / 3 - 3, by + 1, lv(back, 4)); } }
  else blk(p, aw - 1, by, w - 2 * aw + 2, bh + 1, back);
  // detalhes do encosto
  if (s === 0) for (let y = by + 4; y < sy - 1; y += 3) for (let x = aw + 2 + ((y / 3) % 2) * 2; x < w - aw - 1; x += 4) p.put(x, y, lv(back, 1.4));
  if (s === 1) for (let x = aw + 2; x < w - aw - 1; x += 3) p.vline(x, by + 2, sy - 1, lv(back, 2.2));
  if (s === 2) for (let x = aw + 4; x < w - aw - 2; x += 7) p.put(x, by + 3, lv(back, 1.6));
  if (s === 3) for (let x = aw + 1; x < w - aw; x += 2) p.vline(x, sy + 1, sb - 1, lv(seat, 2.6));
  if (s === 4) { for (let x = aw + 1; x < w - aw; x++) p.put(x, by + 3 + Math.round(Math.sin(x * 0.9)), BLACK); for (let x = aw + 3; x < w - aw; x += 6) p.put(x, by + 6, m.acc); }
  if (s === 5) for (let i = 0; i < 2; i++) { const x = aw + 1 + i * ((w - 2 * aw) / 2); blk(p, x, by + 1, (w - 2 * aw) / 2 - 1, bh - 1, lv(back, 2.6)); }
  if (s === 7) { blk(p, aw + 1, by + 2, (w - 2 * aw) / 2 - 2, bh - 2, lv(back, 3.6)); blk(p, w / 2 + 1, by + 2, (w - 2 * aw) / 2 - 2, bh - 2, lv(back, 3.6)); }
  // assento (almofadas)
  blk(p, aw - 1, sy, w - 2 * aw + 2, sb - sy, seat);
  const nc = s === 0 || s === 1 ? 1 : s === 6 || s === 7 ? 2 : 3;
  for (let i = 1; i < nc; i++) p.vline(aw + Math.round(i * (w - 2 * aw) / nc), sy + 1, sb - 1, lv(seat, 1.6));
  if (s === 6) blk(p, aw + 3, sy - 4, 7, 5, m.acc);
  if (s === 7) blk(p, w - aw - 10, sy - 4, 7, 5, m.acc2);
  if (s === 2) { blk(p, aw + 2, sy - 3, 6, 4, m.fab2); }
  // braços
  const armL = (x: number) => {
    if (s === 0) { p.disc(x + aw / 2, sy - 1, aw / 2 + 0.5, arm); blk(p, x, sy - 1, aw, sb - sy + 1, arm); p.disc(x + aw / 2, sy - 1, 1.2, lv(arm, 1.6)); }
    else if (s === 1) { p.disc(x + aw / 2, sy + 1, aw / 2 + 0.5, arm); blk(p, x, sy + 1, aw, sb - sy - 1, arm); p.hline(x + 1, x + aw - 2, sy - 2, lv(arm, 4)); }
    else if (s === 2) { blk(p, x - 1, sy - 3, aw + 2, 2, m.wood); p.vline(x, sy - 1, sb - 1, m.wood); }
    else if (s === 3) { p.ellipse(x + aw / 2, sy + 1, aw / 2 + 0.5, 4, arm); blk(p, x, sy + 1, aw, sb - sy - 1, arm); }
    else if (s === 5) { p.disc(x + aw / 2, sy, aw / 2, arm); blk(p, x, sy, aw, sb - sy, arm); p.ring(x + aw / 2, sy, aw / 2 - 1.5, lv(arm, 1.6)); }
    else blk(p, x, sy - 3, aw, sb - sy + 3, arm);
  };
  armL(0); armL(w - aw);
  if (s === 5) { p.poly([[w - aw - 1, sy - 3], [w, sy - 3], [w, sb - 2], [w - aw - 3, sb + 1]], m.fab2); for (let y = sy - 2; y < sb; y += 2) p.hline(w - aw - 1, w - 1, y, lv(m.fab2, 4)); }
  // pés
  legs(d, 1, w - 2, sb);
}

/** Poltrona: bergère de abas → poltrona concha déco → poltrona ovo giratória → pufe de bolinhas → cadeira Memphis → reclinável de couro → poltrona de concha → reclinável inteligente. */
function armchair(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const fl = h - 1;
  if (s === 0) { // bergère de abas
    blk(p, 3, 1, w - 6, 16, m.fab); p.poly([[3, 3], [w / 2, -1], [w - 3, 3]], m.fab); p.hline(5, w - 6, 0, m.wood2);
    blk(p, 0, 4, 4, 11, lv(m.fab, 2.4)); blk(p, w - 4, 4, 4, 11, lv(m.fab, 2.4));
    for (let y = 4; y < 15; y += 3) for (let x = 6 + ((y / 3) % 2) * 2; x < w - 6; x += 4) p.put(x, y, lv(m.fab, 1.4));
    blk(p, 1, 15, w - 2, 5, m.fab); p.hline(2, w - 3, 16, lv(m.fab, 4.4));
    legs(d, 2, w - 3, 20);
  } else if (s === 1) { // concha redonda
    p.ellipse(w / 2, 11, w / 2 - 0.5, 10, m.fab); for (let x = 3; x < w - 3; x += 3) p.vline(x, 3, 14, lv(m.fab, 2.2));
    blk(p, 3, 14, w - 6, 5, lv(m.fab, 3.4)); blk(p, 0, 12, w, 7, m.fab); p.hline(2, w - 3, 13, lv(m.fab, 4.2));
    blk(p, 1, 19, w - 2, fl - 18, m.wood2); p.hline(2, w - 3, 20, m.metal);
  } else if (s === 2) { // ovo giratório
    p.ellipse(w / 2, 10, w / 2 - 0.5, 10, m.fab2); p.ellipse(w / 2 + 2, 11, w / 2 - 4, 7, lv(m.fab2, 1.6));
    blk(p, 5, 13, w - 8, 5, m.fab); p.hline(6, w - 4, 13, lv(m.fab, 4.4));
    p.vline(w / 2, 20, fl - 1, CHROME); p.vline(w / 2 + 1, 20, fl - 1, lv(CHROME, 2)); p.line(w / 2, fl, 3, fl, CHROME); p.line(w / 2, fl, w - 4, fl, CHROME); p.hline(4, w - 5, fl, lv(CHROME, 2));
  } else if (s === 3) { // pufe (bean bag)
    p.ellipse(w / 2, fl - 7, w / 2 - 0.5, 7.5, m.fab); p.ellipse(w / 2 - 1, fl - 13, w / 2 - 4, 6, m.fab);
    p.ellipse(w / 2 + 2, fl - 9, 4, 2.5, lv(m.fab, 1.8)); p.line(6, fl - 16, 9, fl - 12, lv(m.fab, 4.2)); p.hline(3, w - 4, fl, lv(m.fab, 1));
    for (let i = 0; i < 6; i++) p.put(4 + i * 3, fl - 5 + (i % 2), m.acc2);
  } else if (s === 4) { // cadeira Memphis
    blk(p, 3, 2, w - 6, 10, m.fab2); p.disc(w / 2, 2, 4, m.acc); for (let x = 4; x < w - 4; x += 3) p.put(x, 6 + (x % 2), BLACK);
    blk(p, 1, 12, w - 2, 5, m.fab); p.poly([[1, 12], [5, 12], [3, 9]], m.acc2);
    legs(d, 1, w - 2, 17);
  } else if (s === 5) { // reclinável de couro marrom
    const lc = C('#6a3a24');
    blk(p, 3, 1, w - 6, 15, lc); p.ellipse(w / 2, 2, w / 2 - 3.5, 2.5, lc); for (let y = 4; y < 14; y += 4) p.hline(4, w - 5, y, lv(lc, 1.6));
    blk(p, 0, 10, 5, 9, lv(lc, 2.6)); blk(p, w - 5, 10, 5, 9, lv(lc, 2.6)); blk(p, 3, 14, w - 6, 5, lc);
    p.rect(w - 2, 15, 2, 3, CHROME); blk(p, 1, 19, w - 2, fl - 18, lv(lc, 1.6));
  } else if (s === 6) { // concha moldada em pés de madeira
    p.poly([[3, 2], [w - 3, 2], [w - 2, 14], [w - 4, 17], [4, 17], [2, 14]], W); p.hline(4, w - 5, 2, lv(W, 5)); p.line(3, 3, 3, 14, lv(W, 3));
    blk(p, 4, 12, w - 8, 3, m.fab); p.hline(5, w - 6, 12, lv(m.fab, 4.4));
    p.line(6, 17, 3, fl, m.wood); p.line(w - 7, 17, w - 4, fl, m.wood); p.line(8, 17, 9, fl, m.wood); p.line(w - 9, 17, w - 10, fl, m.wood); p.hline(5, w - 6, fl - 4, m.metal);
  } else { // reclinável inteligente com painel e luz
    blk(p, 2, 0, w - 4, 16, m.fab); p.ellipse(w / 2, 4, w / 2 - 4, 3, lv(m.fab, 3.6));
    blk(p, 0, 9, 4, 10, m.fab2); blk(p, w - 4, 9, 4, 10, m.fab2); p.rect(w - 3, 10, 2, 2, lit ? m.acc : DGREY); glow(d, w - 2, 11, 3, m.acc);
    blk(p, 3, 13, w - 6, 6, m.fab); blk(p, 2, 19, w - 4, fl - 19, m.acc2); p.hline(3, w - 4, fl, lit ? lv(m.acc, 5) : lv(m.acc, 2)); if (lit) d.fx.hline(1, w - 2, fl, withAlpha(m.acc, 120));
  }
}

/** Estante: entalhada com vidro → escalonada déco → aberta de teca → lambri com plantas → modular laqueada → pinho com CDs → prateleira de aço → nichos com LED. */
function bookcase(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const fr = [m.wood, m.wood2, m.wood, m.wood, s === 4 ? m.wood2 : m.wood, m.wood, W, m.wood2][s];
  const top = s === 1 ? 4 : 0;
  if (s === 0) { blk(p, 0, 2, w, h - 2, fr); p.poly([[0, 3], [w / 2, 0], [w, 3]], m.wood2); }
  else if (s === 1) { blk(p, 6, 0, w - 12, 5, fr); blk(p, 2, 3, w - 4, 4, fr); blk(p, 0, top + 2, w, h - top - 2, fr); p.hline(1, w - 2, top + 3, m.metal); }
  else if (s === 6) { p.vline(0, 0, h - 1, m.metal); p.vline(w - 1, 0, h - 1, m.metal); }
  else blk(p, 0, 0, w, h, fr);
  const sh = s === 1 ? [10, 19, 28] : [8, 17, 26];
  const yb0 = s === 0 ? 4 : s === 1 ? 8 : 2;
  const ix = s === 6 ? 1 : 2, iw = w - 2 * ix;
  if (s !== 6) p.rect(ix, yb0, iw, h - yb0 - 6, lv(fr, 0.8));
  const shelf = (y: number) => { if (s === 6) { p.hline(0, w - 1, y, m.metal); p.hline(1, w - 2, y + 1, lv(W, 2)); } else p.hline(ix, ix + iw - 1, y, lv(fr, 3.4)); };
  const rows = [yb0 + sh[0], yb0 + sh[1], yb0 + sh[2] < h - 6 ? yb0 + sh[2] : h - 7];
  const pal = [[m.fab, C('#3a5a3a'), C('#5a3a20'), C('#2a3a5a')], [BLACK, C('#e6dac0'), m.acc, m.acc2], [C('#e04848'), C('#48a8a0'), C('#f0d040'), C('#e8e0c0')], [C('#d8782a'), C('#a8862a'), C('#7a8a2a'), C('#4a2c18')], [C('#e04898'), C('#3ac0d0'), BLACK, C('#f0e040')], [C('#3a6ac8'), C('#8a3a2a'), C('#d8a030'), C('#3a3a3a')], [W, C('#c8c4bc'), C('#2a2a2e'), C('#c8784a')], [C('#4a4c56'), C('#8a8c96'), C('#d8dce4'), C('#2a2c34')]][s];
  rows.forEach((y, i) => {
    shelf(y);
    if (s === 3 && i === 1) { blk(p, ix + 2, y - 4, 5, 4, C('#a8401a')); foliage(p, ix + 4.5, y - 7, 3.5, 3, 19, C('#5a7a2a'), C('#7a9a3a')); books(p, ix + 10, y - 1, iw - 12, 6, i + s * 7, pal); return; }
    if (s === 5 && i === 2) { for (let x = ix + 1; x < ix + iw - 1; x++) p.rect(x, y - 5, 1, 5, x % 2 ? C('#c8ccd8') : pal[x % 4]); return; }
    if (s === 6 && i === 1) { p.poly([[ix + 4, y], [ix + 8, y], [ix + 7, y - 6], [ix + 5, y - 6]], C('#e8e4dc')); blk(p, ix + 13, y - 2, 8, 2, m.acc); return; }
    if (s === 2 && i === 0) { p.ellipse(ix + 5, y - 2, 3, 2, C('#48a8a0')); books(p, ix + 10, y - 1, iw - 11, 6, 31, pal); return; }
    if (s === 4 && i === 1) { blk(p, ix + 2, y - 6, 8, 6, C('#2a2a30')); p.rect(ix + 3, y - 5, 6, 4, lit ? C('#6a8ae0') : C('#2a3a6a')); glow(d, ix + 6, y - 3, 4, C('#6a8ae0')); books(p, ix + 12, y - 1, iw - 13, 6, 41, pal); return; }
    books(p, ix + 1, y - 1, iw - 2, 7, i + s * 7, pal);
  });
  if (s === 0) { p.rect(ix, rows[1] + 1, iw, h - rows[1] - 7, withAlpha(m.glass, 90)); p.line(ix + 2, rows[1] + 3, ix + 6, rows[1] + 8, withAlpha(W, 120)); p.vline(w >> 1, rows[1] + 1, h - 7, m.wood2); }
  if (s === 7) for (const y of rows) { p.hline(ix, ix + iw - 1, y - 8, lit ? lv(m.acc, 5) : lv(m.acc, 1.6)); if (lit) d.fx.rect(ix, y - 7, iw, 2, withAlpha(m.acc, 60)); }
  // base / gavetas
  if (s === 6) { p.hline(0, w - 1, h - 1, m.metal); blk(p, 1, h - 6, w - 2, 5, m.wood); }
  else { blk(p, 0, h - 6, w, 6, lv(fr, 2.6)); p.vline(w >> 1, h - 5, h - 2, lv(fr, 1.4)); p.put((w >> 1) - 3, h - 4, m.metal); p.put((w >> 1) + 2, h - 4, m.metal); }
}

/** Jukebox (desde os anos 30): arco de madeira com luz → cromado bolha anos 50 → caixa de vidro anos 70 → CD neon → parede de CDs → touch digital → streaming de pé. */
function jukebox(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const L = (c: Col, n = 4.6) => (lit ? lv(c, n) : c);
  if (s === 1) { // arco de madeira, grade e tubo âmbar
    p.disc(w / 2, 10, w / 2 - 0.5, m.wood2); blk(p, 0, 10, w, h - 10, m.wood2);
    p.disc(w / 2, 10, w / 2 - 3, L(C('#c87a2a'))); p.disc(w / 2, 10, w / 2 - 5, m.wood); p.rect(3, 10, w - 6, 6, m.wood);
    for (let x = 5; x < w - 5; x += 2) p.vline(x, 18, 26, m.metal); p.rect(3, 28, w - 6, 3, m.wood); p.hline(3, w - 4, 28, m.metal);
    glow(d, w / 2, 10, 11, C('#f0a040'));
  } else if (s === 2) { // bolha cromada com tubos coloridos
    p.disc(w / 2, 9, w / 2 - 0.5, CHROME); blk(p, 0, 9, w, h - 9, m.wood);
    p.disc(w / 2, 9, w / 2 - 2.5, L(C('#e04848'))); p.disc(w / 2, 9, w / 2 - 4.5, L(C('#f0d040'))); p.disc(w / 2, 10, w / 2 - 6.5, L(C('#48a8a0')));
    p.rect(4, 10, w - 8, 7, BLACK); p.disc(w / 2, 13, 3, C('#2a2a2a')); p.disc(w / 2, 13, 1, RED);
    p.rect(2, 18, w - 4, 4, PAPER); for (let x = 3; x < w - 3; x += 3) p.vline(x, 18, 21, lv(PAPER, 2));
    for (let x = 3; x < w - 3; x += 2) p.vline(x, 24, h - 4, CHROME); p.vline(1, 9, h - 2, L(C('#e04848'))); p.vline(w - 2, 9, h - 2, L(C('#e04848')));
    glow(d, w / 2, 10, 12, C('#f0a0a0'));
  } else if (s === 3) { // caixa com vidro e lâmpadas laranja
    blk(p, 0, 0, w, h, m.wood); p.rect(2, 2, w - 4, 12, C('#2a1a10')); p.rect(3, 3, w - 6, 10, withAlpha(C('#c8b070'), 120)); p.disc(w / 2, 9, 3, C('#3a2a2a'));
    for (let i = 0; i < 5; i++) p.disc(3.5 + i * 3.7, 16, 1.2, L(m.fab)); p.rect(2, 18, w - 4, 5, PAPER); for (let y = 19; y < 23; y += 2) p.hline(3, w - 4, y, lv(PAPER, 2));
    for (let y = 25; y < h - 2; y += 2) p.hline(2, w - 3, y, lv(m.wood, 1.6)); glow(d, w / 2, 16, 10, C('#f0a040'));
  } else if (s === 4) { // CD com neon rosa e azul
    blk(p, 0, 2, w, h - 2, BLACK); p.rect(2, 0, w - 4, 3, L(C('#ff5ab0'))); p.vline(1, 3, h - 2, L(C('#3ac0d0'))); p.vline(w - 2, 3, h - 2, L(C('#3ac0d0')));
    p.rect(3, 5, w - 6, 9, C('#1a1a2a')); p.disc(w / 2, 9.5, 3.5, C('#d8dce8')); p.disc(w / 2, 9.5, 1, BLACK); p.line(w / 2 - 2, 7, w / 2 + 2, 11, C('#f0a0e0'));
    for (let i = 0; i < 6; i++) p.rect(3 + (i % 3) * 6, 17 + Math.floor(i / 3) * 3, 4, 2, i === 1 ? L(C('#f0e040')) : DGREY);
    for (let y = 24; y < h - 2; y += 2) p.hline(3, w - 4, y, C('#3a3a42')); glow(d, w / 2, 2, 10, C('#ff5ab0'));
  } else if (s === 5) { // parede de CDs
    blk(p, 0, 0, w, h, C('#3a3a42')); p.rect(2, 2, w - 4, 14, C('#1a1a1e'));
    for (let i = 0; i < 12; i++) p.rect(3 + (i % 4) * 4, 3 + Math.floor(i / 4) * 4, 3, 3, L([C('#c8ccd8'), C('#3a6ac8'), C('#e04848'), C('#d8a030')][i % 4], 4));
    p.rect(3, 18, w - 6, 4, L(C('#3a7a4a'), 4)); drawText(p, '42', 4, 18, C('#1a3a1a'));
    p.rect(2, 24, w - 4, h - 26, C('#2a2a30')); for (let y = 25; y < h - 2; y += 2) for (let x = 3; x < w - 3; x += 2) p.put(x, y, C('#4a4a52'));
    glow(d, w / 2, 9, 8, C('#c8d8ff'));
  } else if (s === 6) { // touch digital na parede, sobre um móvel
    blk(p, 2, 0, w - 4, 20, C('#e8e6e0')); p.rect(3, 1, w - 6, 18, lit ? C('#3a5ac8') : C('#1a2a4a'));
    for (let i = 0; i < 6; i++) p.rect(4 + (i % 3) * 5, 3 + Math.floor(i / 3) * 6, 4, 4, lit ? [C('#e04848'), C('#f0c040'), C('#48b85c')][i % 3] : DGREY);
    p.rect(w / 2 - 1, 20, 2, 4, m.metal); blk(p, 0, 24, w, h - 24, m.wood); p.hline(2, w - 3, 28, lv(m.wood, 1.6)); glow(d, w / 2, 10, 10, C('#6a8ae0'));
  } else { // coluna de streaming com anel de luz
    blk(p, 3, 4, w - 6, h - 4, C('#2a2c34')); p.ellipse(w / 2, 4, w / 2 - 3, 2, C('#3a3c44'));
    p.ellipse(w / 2, 4, w / 2 - 4, 1.2, lit ? lv(m.acc, 5) : lv(m.acc, 1.6));
    for (let y = 8; y < h - 3; y += 2) for (let x = 4 + (y % 4 === 0 ? 1 : 0); x < w - 4; x += 2) p.put(x, y, C('#3a3c46'));
    p.rect(5, 12, w - 10, 6, lit ? C('#2a3a5a') : C('#14141a')); p.hline(6, w - 7, 15, lit ? m.acc : DGREY);
    glow(d, w / 2, 4, 9, m.acc);
  }
}


/** Planta grande: palmeira em cachepô de faiança → strelitzia em vaso déco → costela-de-adão em vaso de pés → samambaia no macramê → ficus em vaso laqueado → árvore-da-felicidade em vaso de barro → oliveira em vaso de concreto → horta inteligente com luz. */
function bigplant(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const fl = h - 1;
  const pot = (x: number, y: number, pw: number, ph: number, c: Col, taper = 1) => { p.poly([[x, y], [x + pw, y], [x + pw - taper, fl + 1], [x + taper, fl + 1]], c); p.hline(x, x + pw - 1, y, lv(c, 4.4)); p.vline(x + 1, y + 1, fl - 1, lv(c, 3.6)); p.hline(x + taper, x + pw - taper - 1, fl, lv(c, 1.2)); };
  if (s === 0) { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.55; const ex = w / 2 + Math.cos(a) * 9, ey = 13 + Math.sin(a) * 11; p.line(w / 2, 20, ex, ey, LEAF); for (let k = 2; k < 8; k++) { const t = k / 8; p.put(w / 2 + (ex - w / 2) * t + (i < 2 ? -1 : 1), 20 + (ey - 20) * t + 1, LEAF2); } } pot(2, 20, w - 4, 11, C('#3a6ac8'), 2); p.hline(3, w - 4, 24, W); p.hline(3, w - 4, 26, C('#f0d040')); }
  else if (s === 1) { for (const [x, y, dx] of [[5, 6, -1], [9, 3, 1], [11, 9, 1]] as const) { p.line(w / 2, 20, x, y, LEAF); p.poly([[x, y], [x + 4 * dx, y - 2], [x + 2 * dx, y + 1]], C('#f08a30')); p.put(x + dx, y - 2, C('#3a6ac8')); } foliage(p, w / 2, 17, 5, 4, 11); blk(p, 3, 20, w - 6, fl - 19, BLACK); p.hline(3, w - 4, 22, m.metal); p.hline(4, w - 5, 27, m.metal); }
  else if (s === 2) { for (const [x, y] of [[4, 6], [12, 4], [8, 10], [3, 13], [13, 12]] as const) { p.line(w / 2, 22, x, y + 2, LEAF); p.ellipse(x, y, 3, 2.5, LEAF2); p.put(x, y, LEAF); p.put(x - 1, y + 1, C('#a8c870')); } p.poly([[3, 20], [13, 20], [11, 25], [5, 25]], W); p.hline(3, 12, 20, lv(W, 4)); p.line(5, 25, 3, fl, m.wood2); p.line(11, 25, 13, fl, m.wood2); p.line(8, 25, 8, fl, m.wood2); }
  else if (s === 3) { p.vline(w / 2, 0, 6, C('#c8a060')); p.line(w / 2, 6, 3, 14, C('#c8a060')); p.line(w / 2, 6, w - 4, 14, C('#c8a060')); for (let y = 7; y < 14; y += 2) p.put(w / 2 + ((y % 4) - 1), y, C('#a8803a')); blk(p, 3, 12, w - 6, 5, C('#a8401a')); for (let i = 0; i < 7; i++) { const x = 2 + i * 2; p.line(x, 14, x - 1 + (i % 2) * 2, 23 + (i % 3) * 2, LEAF); p.put(x, 16 + (i % 3), LEAF2); } p.vline(w / 2 - 3, 17, fl, C('#c8a060')); p.vline(w / 2 + 3, 17, fl, C('#c8a060')); blk(p, 4, fl - 2, w - 8, 3, m.wood); }
  else if (s === 4) { p.vline(w / 2, 6, 22, C('#6a4a2a')); foliage(p, w / 2, 8, 6.5, 6, 21); foliage(p, w / 2 - 2, 13, 5, 4, 22); blk(p, 3, 21, w - 6, fl - 20, m.acc2); p.hline(3, w - 4, 23, m.acc); }
  else if (s === 5) { p.vline(w / 2, 10, 21, C('#7a5a3a')); p.vline(w / 2 + 1, 12, 21, C('#7a5a3a')); for (const [x, y] of [[w / 2 - 3, 6], [w / 2 + 4, 4], [w / 2, 10]] as const) foliage(p, x, y, 4, 2.5, 30 + x); pot(3, 21, w - 6, 10, C('#b8603a'), 1); p.hline(3, w - 4, 22, lv(C('#b8603a'), 2)); }
  else if (s === 6) { p.line(w / 2, 22, w / 2 - 1, 8, C('#6a5a48')); p.line(w / 2 - 1, 12, w / 2 + 3, 6, C('#6a5a48')); for (let i = 0; i < 14; i++) p.put(3 + noise(i, 1, 61) * 10, 2 + noise(i, 2, 61) * 12, i % 3 ? C('#8aa07a') : C('#6a8060')); foliage(p, w / 2, 7, 5, 5, 62, C('#7a9070'), C('#9ab08a')); blk(p, 2, 22, w - 4, fl - 21, C('#b8b4ac')); for (let i = 0; i < 6; i++) p.put(4 + i * 2, 25 + (i % 3) * 2, lv(C('#b8b4ac'), 2)); }
  else { p.hline(1, w - 2, 1, C('#d8dce4')); p.vline(1, 1, 3, C('#d8dce4')); p.vline(w - 2, 1, 3, C('#d8dce4')); p.rect(3, 3, w - 6, 1, lit ? C('#e070ff') : C('#5a3a6a')); if (lit) d.fx.poly([[3, 4], [w - 3, 4], [w, 20], [0, 20]], withAlpha(C('#e070ff'), 40)); p.vline(w >> 1, 0, 0, C('#d8dce4')); for (let r = 0; r < 3; r++) foliage(p, 4 + r * 4, 11 + (r % 2) * 3, 2.5, 4, 70 + r); blk(p, 1, 17, w - 2, fl - 16, C('#2a2c34')); p.rect(3, 19, 4, 2, lit ? m.acc : DGREY); p.vline(1, 3, 17, C('#d8dce4')); p.vline(w - 2, 3, 17, C('#d8dce4')); }
}

/** Abajur de pé: lâmpada de franja → torchière déco → cone triplo → arco cromado com globo → halógena → cúpula de tecido → tripé → coluna de LED. */
function floorlamp(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const fl = h - 1, cx = w >> 1;
  const base = (bw: number, c: Col) => { blk(p, cx - (bw >> 1), fl - 1, bw, 2, c); };
  if (s === 0) { p.poly([[1, 9], [w - 1, 9], [w - 3, 2], [3, 2]], lit ? lv(m.fab, 4.4) : m.fab); for (let x = 1; x < w; x += 2) p.vline(x, 10, 12, m.fab2); p.vline(cx, 13, fl - 2, m.metal); p.put(cx - 1, 24, m.metal); p.put(cx + 1, 24, m.metal); base(8, m.wood2); glow(d, cx, 9, 9, C('#ffb080')); }
  else if (s === 1) { p.poly([[0, 1], [w, 1], [cx + 2, 7], [cx - 2, 7]], m.metal); p.hline(0, w - 1, 0, lit ? BULB : lv(m.metal, 4)); p.vline(cx, 7, fl - 3, BLACK); p.vline(cx - 1, 7, fl - 3, lv(BLACK, 3)); blk(p, cx - 3, fl - 3, 6, 2, m.metal); base(8, BLACK); if (lit) d.fx.poly([[0, 0], [w, 0], [w + 2, -6], [-2, -6]], withAlpha(GLOW, 80)); }
  else if (s === 2) { p.vline(cx, 6, fl - 1, BLACK); for (const [x, y, c] of [[1, 3, m.acc], [w - 5, 8, m.acc2], [2, 14, C('#f8f0e0')]] as const) { p.line(cx, y + 3, x + 2, y + 2, BLACK); p.poly([[x, y + 4], [x + 4, y + 4], [x + 3, y], [x + 1, y]], c); if (lit) d.fx.disc(x + 2, y + 5, 2.5, withAlpha(GLOW, 90)); } p.line(cx, fl - 1, 1, fl, BLACK); p.line(cx, fl - 1, w - 2, fl, BLACK); }
  else if (s === 3) { p.line(cx - 3, fl - 1, cx - 2, 12, CHROME); p.line(cx - 2, 12, cx + 1, 4, CHROME); p.line(cx + 1, 4, w - 3, 6, CHROME); ball(p, w - 3, 8, 2.6, lit ? BULB : C('#f0e8d0')); blk(p, cx - 5, fl - 2, 6, 3, C('#e8e4dc')); glow(d, w - 3, 9, 7); }
  else if (s === 4) { p.ellipse(cx, 2, cx, 1.5, BLACK); p.hline(1, w - 2, 1, lit ? BULB : C('#5a5a62')); p.vline(cx, 3, fl - 2, BLACK); p.rect(cx - 1, 20, 3, 2, m.acc); base(8, BLACK); if (lit) d.fx.poly([[0, 1], [w, 1], [w + 3, -3], [-3, -3]], withAlpha(BULB, 120)); }
  else if (s === 5) { p.poly([[1, 10], [w - 1, 10], [w - 3, 2], [3, 2]], lit ? lv(C('#e8dcc0'), 4.6) : C('#e8dcc0')); p.hline(1, w - 2, 10, lv(C('#e8dcc0'), 2)); p.vline(cx, 11, fl - 2, m.wood); p.vline(cx - 1, 11, fl - 2, lv(m.wood, 3)); base(8, m.wood); glow(d, cx, 10, 8); }
  else if (s === 6) { p.ellipse(cx, 4, cx - 0.5, 3, W); p.hline(1, w - 2, 7, lit ? BULB : lv(W, 2)); p.line(cx, 8, cx, 14, m.metal); p.line(cx, 14, 1, fl, m.wood); p.line(cx, 14, w - 2, fl, m.wood); p.line(cx, 14, cx, fl, m.wood); glow(d, cx, 7, 8); }
  else { blk(p, cx - 2, 0, 5, fl - 1, C('#2a2c34')); p.vline(cx, 1, fl - 3, lit ? lv(m.acc, 5) : lv(m.acc, 1.6)); base(8, C('#2a2c34')); if (lit) d.fx.rect(cx - 3, 0, 7, fl - 1, withAlpha(m.acc, 50)); }
}

/** Mesa de centro: entalhada com tampo de mármore → laca preta com dourado → bumerangue → baixa de vidro e cromo → tampo triangular Memphis → caixote de pinho → tampo fino de carvalho → mesa com tampo de vidro e carregador. */
function coffeetable(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  if (s === 0) { blk(p, 0, 0, w, 3, C('#e8e4d8')); for (let i = 0; i < 4; i++) p.put(3 + i * 7, 1, C('#b8b4a8')); blk(p, 1, 3, w - 2, 2, m.wood); p.put(w >> 1, 4, m.metal); legs(d, 2, w - 3, 5); }
  else if (s === 1) { blk(p, 0, 0, w, 3, BLACK); p.hline(0, w - 1, 2, m.metal); blk(p, 3, 3, w - 6, h - 3, m.wood2); p.hline(4, w - 5, 6, m.metal); p.hline(5, w - 6, h - 3, lv(m.wood2, 3)); }
  else if (s === 2) { p.poly([[0, 1], [w * 0.4, 0], [w - 1, 2], [w - 3, 4], [w * 0.5, 3], [2, 4]], m.wood); p.hline(2, w - 4, 0, lv(m.wood, 4.4)); p.line(4, 4, 2, h - 1, BLACK); p.line(w - 5, 4, w - 3, h - 1, BLACK); p.line(w / 2, 3, w / 2 + 1, h - 1, BLACK); p.disc(9, 1, 1.4, m.acc); }
  else if (s === 3) { p.rect(0, 0, w, 2, withAlpha(m.glass, 200)); p.hline(0, w - 1, 0, lv(m.glass, 5)); p.rect(1, 2, 2, h - 2, CHROME); p.rect(w - 3, 2, 2, h - 2, CHROME); p.hline(1, w - 2, h - 1, CHROME); blk(p, 6, h - 5, 6, 4, C('#7a8a2a')); }
  else if (s === 4) { p.poly([[0, 3], [w - 1, 0], [w - 4, 3]], m.fab); p.hline(0, w - 4, 3, lv(m.fab, 1.6)); blk(p, 3, 4, 4, h - 4, m.fab2); p.disc(w - 8, h - 4, 3.5, m.acc); p.rect(w - 9, 4, 2, 4, BLACK); }
  else if (s === 5) { blk(p, 0, 0, w, h, m.wood); for (let y = 2; y < h - 1; y += 3) p.hline(1, w - 2, y, lv(m.wood, 2)); p.rect(3, 4, w - 6, h - 6, lv(m.wood, 1.2)); books(p, 5, h - 3, 10, 4, 77, [C('#3a6ac8'), C('#8a3a2a'), C('#d8a030')]); }
  else if (s === 6) { blk(p, 0, 0, w, 2, m.wood); legs(d, 1, w - 2, 2); }
  else { p.rect(0, 0, w, 2, withAlpha(C('#30404c'), 220)); p.hline(0, w - 1, 0, C('#8aa0b0')); p.rect(w - 8, 0, 4, 1, lit ? m.acc : DGREY); glow(d, w - 6, 0, 3, m.acc); blk(p, 3, 2, w - 6, h - 2, C('#2a2c34')); p.hline(4, w - 5, h - 1, lit ? lv(m.acc, 5) : lv(m.acc, 2)); }
}

/** Aparelho de som: gramofone de corneta → radiola de válvulas → console hi-fi → torre de receiver e tape-deck → 3 em 1 com equalizador → micro system → toca-discos no aparador → caixa inteligente no aparador. */
function stereo(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const knob = (x: number, y: number) => { p.disc(x, y, 1.2, CHROME); p.put(x - 1, y - 1, W); };
  if (s === 0) { blk(p, 6, 12, 18, h - 12, m.wood); p.hline(7, 22, 14, m.metal); p.ellipse(15, 11, 7, 1.2, BLACK); p.vline(19, 7, 11, m.metal); p.line(19, 7, 14, 3, m.metal); p.poly([[14, 4], [3, 0], [0, 7], [10, 7]], m.metal); p.ellipse(2, 3.5, 2, 4, lv(m.metal, 1.4)); p.line(4, 1, 8, 5, lv(m.metal, 5)); for (let x = 9; x < 21; x += 3) p.vline(x, 17, h - 3, lv(m.wood, 1.8)); return; }
  if (s === 1) { blk(p, 0, 4, w, h - 6, m.wood2); p.poly([[2, 4], [w / 2, 0], [w - 2, 4]], m.wood2); p.rect(3, 6, 12, 12, C('#c8a878')); for (let x = 4; x < 15; x += 2) p.vline(x, 7, 16, m.wood); p.rect(17, 7, 10, 4, lit ? C('#f0c060') : C('#a8803a')); p.vline(21, 7, 10, RED); knob(19, 15); knob(25, 15); p.rect(1, h - 2, 2, 2, m.wood2); p.rect(w - 3, h - 2, 2, 2, m.wood2); glow(d, 22, 9, 4, C('#f0c060')); return; }
  if (s === 2) { blk(p, 0, 2, w, 13, m.wood); p.rect(2, 4, 9, 9, C('#d8c8a0')); for (let y = 5; y < 13; y += 2) p.hline(2, 10, y, lv(C('#d8c8a0'), 2)); p.rect(w - 11, 4, 9, 9, C('#d8c8a0')); for (let y = 5; y < 13; y += 2) p.hline(w - 11, w - 3, y, lv(C('#d8c8a0'), 2)); p.rect(12, 4, 6, 4, lit ? C('#f0d070') : C('#8a7a4a')); knob(13.5, 11); knob(16.5, 11); legs(d, 1, w - 2, 15); return; }
  if (s === 3) { blk(p, 2, 0, w - 4, 7, CHROME); p.rect(4, 2, 12, 3, lit ? C('#80c0f0') : C('#2a4a6a')); p.vline(9, 2, 4, RED); knob(20, 3.5); knob(24, 3.5); blk(p, 2, 7, w - 4, 7, C('#2a2a2a')); p.rect(5, 9, 5, 3, C('#5a4a3a')); p.disc(6.5, 10.5, 0.9, BLACK); p.disc(8.5, 10.5, 0.9, BLACK); for (let i = 0; i < 4; i++) p.rect(14 + i * 3, 10, 2, 2, CHROME); blk(p, 0, 14, w, h - 14, m.wood); p.hline(1, w - 2, 16, lv(m.wood, 1.6)); glow(d, 10, 3, 5, C('#80c0f0')); return; }
  if (s === 4) { blk(p, 6, 0, w - 12, h, BLACK); for (let i = 0; i < 7; i++) { const lvl = 2 + Math.round(noise(i, 4, 81) * 3); for (let k = 0; k < lvl; k++) p.put(9 + i * 2, 5 - k, lit ? (k > 3 ? RED : m.acc) : DGREY); } p.rect(8, 7, w - 16, 4, C('#3a3a42')); p.rect(9, 8, 4, 2, C('#1a1a1e')); p.rect(15, 8, 4, 2, C('#1a1a1e')); p.hline(8, w - 9, 13, m.fab); for (const x of [0, w - 6]) { blk(p, x, 4, 6, h - 4, C('#2a2a30')); p.disc(x + 3, 9, 2, C('#4a4a52')); p.disc(x + 3, 9, 0.8, BLACK); p.disc(x + 3, 17, 2.5, C('#4a4a52')); p.disc(x + 3, 17, 1, BLACK); } glow(d, w / 2, 3, 6, m.acc); return; }
  if (s === 5) { blk(p, 9, 6, 12, 10, C('#4a4a52')); p.rect(11, 8, 8, 2, lit ? C('#80f0a0') : C('#2a4a3a')); p.disc(15, 13, 1.6, C('#c8ccd8')); for (const x of [1, w - 8]) { blk(p, x, 4, 7, 14, C('#3a3a42')); p.disc(x + 3.5, 8, 1.6, BLACK); p.disc(x + 3.5, 13, 2.4, BLACK); } blk(p, 0, 18, w, h - 18, m.wood); p.hline(1, w - 2, 20, lv(m.wood, 1.8)); glow(d, 15, 9, 4, C('#80f0a0')); return; }
  if (s === 6) { blk(p, 0, 9, w, 6, m.wood); p.hline(1, w - 2, 12, lv(m.wood, 1.6)); legs(d, 1, w - 2, 15); blk(p, 8, 5, 14, 4, W); p.ellipse(14, 5, 5, 1, BLACK); p.ellipse(14, 5, 1.6, 0.6, m.acc2); p.line(20, 4, 18, 5, m.metal); blk(p, 1, 2, 5, 7, C('#e8e6e0')); p.disc(3.5, 5, 1.4, DGREY); blk(p, w - 6, 2, 5, 7, C('#e8e6e0')); p.disc(w - 3.5, 5, 1.4, DGREY); return; }
  blk(p, 0, 11, w, 6, m.wood); legs(d, 1, w - 2, 17); blk(p, 11, 1, 8, 10, C('#4c4e56')); p.ellipse(15, 1, 3.5, 1, lit ? lv(m.acc, 5) : C('#3a3c44')); for (let y = 3; y < 10; y += 2) for (let x = 12; x < 18; x += 2) p.put(x, y, C('#3a3c44')); glow(d, 15, 1, 5, m.acc);
  blk(p, 3, 7, 5, 4, C('#d8dce4')); p.rect(4, 8, 3, 2, lit ? C('#3a5ac8') : C('#14141a'));
}


/** Bar: armário de bebidas → carrinho déco espelhado → carrinho de latão → bar de canto acolchoado → carrinho Memphis → carrinho de metal → carrinho preto fino → adega climatizada. */
function barcart(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const bottles = (x: number, yb: number, n: number) => { for (let i = 0; i < n; i++) { const c = [C('#3a6a3a'), C('#8a3a1a'), C('#d8c8a0'), C('#2a4a6a'), C('#c8a040')][(i + s) % 5]; const bh = 5 + (i % 2) * 2; p.rect(x + i * 3, yb - bh + 1, 2, bh, c); p.put(x + i * 3, yb - bh - 1, c); p.put(x + i * 3, yb - bh, lv(c, 4)); } };
  const glasses = (x: number, yb: number) => { for (let i = 0; i < 2; i++) { p.rect(x + i * 3, yb - 1, 2, 2, withAlpha(m.glass, 200)); p.put(x + i * 3, yb - 2, W); } };
  if (s === 0 || s === 3 || s === 7) {
    const c = s === 0 ? m.wood : s === 3 ? m.fab : C('#2a2c34');
    blk(p, 0, 4, w, h - 4, c);
    if (s === 0) { p.poly([[0, 4], [w / 2, 1], [w, 4]], m.wood2); p.rect(2, 6, w - 4, 8, lv(c, 0.8)); bottles(3, 13, 5); p.rect(2, 6, w - 4, 8, withAlpha(m.glass, 70)); p.vline(w >> 1, 6, 13, m.wood2); blk(p, 2, 15, w - 4, h - 17, lv(c, 2.4)); p.put(w >> 1, 17, m.metal); legs(d, 1, w - 2, h - 2); }
    else if (s === 3) { for (let y = 6; y < h - 2; y += 3) for (let x = 2 + (y % 2); x < w - 2; x += 4) p.put(x, y, lv(c, 1.4)); blk(p, -0, 2, w, 3, m.wood); bottles(2, 1, 4); glasses(15, 1); }
    else { p.rect(2, 6, w - 4, 12, lit ? C('#2a3a4a') : C('#14141a')); for (let y = 8; y < 18; y += 3) { p.hline(3, w - 4, y, C('#3a3c44')); for (let x = 4; x < w - 4; x += 3) p.put(x, y - 1, [C('#8a1a2a'), C('#3a5a2a'), C('#c8a040')][(x + y) % 3]); } p.hline(2, w - 3, 6, lit ? lv(m.acc, 5) : lv(m.acc, 2)); drawText(p, '12', 3, h - 3 - 4, lit ? m.acc : DGREY); glow(d, w / 2, 7, 6, m.acc); p.put(w - 4, h - 3, lit ? C('#48b85c') : DGREY); }
    return;
  }
  const fr = [0, m.metal, BRASS, 0, m.acc, GREY, m.metal, 0][s];
  for (const y of [8, 15]) { p.hline(0, w - 1, y, fr); p.rect(1, y + 1, w - 2, 1, s === 1 ? withAlpha(m.glass, 200) : s === 4 ? m.fab : lv(fr, 1.6)); }
  p.vline(1, 6, h - 3, fr); p.vline(w - 2, 6, h - 3, fr);
  if (s === 1) { p.line(w - 2, 6, w, 3, fr); } else if (s === 2) { p.line(w - 2, 6, w - 5, 3, fr); p.line(w - 5, 3, w - 1, 3, fr); } else p.hline(w - 4, w - 1, 6, fr);
  bottles(3, 7, 4); glasses(15, 7); bottles(4, 14, 2); p.ellipse(15, 13, 3, 1.5, s === 4 ? m.acc2 : C('#c8a868'));
  for (const x of [2, w - 3]) { p.disc(x, h - 1.5, 1.5, s === 4 ? m.acc2 : BLACK); p.put(x, h - 2, GREY); }
}

/** Piano: armário com castiçais → baby grand de lado → espineta → piano elétrico com caixa → teclado no suporte em X → piano digital → piano branco fino → piano com tela e luz nas teclas. */
function piano(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const keys = (x: number, y: number, kw: number, kh: number, lightUp = false) => { p.rect(x, y, kw, kh, W); for (let i = 0; i < kw; i += 2) p.put(x + i, y + kh - 1, lv(W, 2.6)); for (let i = 1; i < kw - 1; i += 3) p.vline(x + i, y, y + (kh >> 1), lightUp ? (i % 2 ? m.acc : C('#ff5ab0')) : BLACK); };
  if (s === 0 || s === 2) { // armário (vertical) / espineta
    const top = s === 0 ? 0 : 8, c = s === 0 ? m.wood2 : m.wood;
    blk(p, 1, top, w - 2, 20 - top, c);
    if (s === 0) { p.rect(5, 3, w - 10, 8, lv(c, 2.4)); for (let x = 7; x < w - 7; x += 3) p.vline(x, 4, 10, lv(c, 1.4)); for (const x of [3, w - 4]) { p.rect(x, 4, 1, 4, m.metal); p.put(x, 3, W); p.put(x, 2, GLOW); } }
    else { p.rect(4, 10, w - 8, 4, lv(c, 2.6)); p.hline(5, w - 6, 9, lv(c, 4)); books(p, 6, top - 1, 6, 4, 91, [W, PAPER]); }
    blk(p, 0, 19, w, 3, c); keys(2, 19, w - 4, 2); blk(p, 2, 22, w - 4, h - 26, lv(c, 2)); p.rect(w / 2 - 3, h - 4, 6, 1, m.metal);
    if (s === 0) legs(d, 2, w - 3, h - 4); else { p.vline(3, h - 4, h - 1, c); p.vline(w - 4, h - 4, h - 1, c); }
    return;
  }
  if (s === 1) { // baby grand de lado com tampa aberta
    const c = BLACK; p.line(4, 9, w - 5, 0, lv(c, 3)); p.line(4, 10, w - 5, 1, c); p.vline(w - 5, 1, 10, lv(c, 2)); blk(p, 0, 10, w, 7, c); p.hline(1, w - 2, 11, m.metal); keys(1, 12, 9, 2);
    for (const x of [2, w - 4]) { p.vline(x, 17, h - 2, c); p.vline(x + 1, 17, h - 2, lv(c, 2)); p.put(x, h - 1, m.metal); p.put(x + 1, h - 1, m.metal); } p.line(14, 17, 15, h - 6, m.metal); p.rect(12, h - 6, 6, 1, m.metal); return;
  }
  if (s === 3) { blk(p, 2, 10, w - 4, 8, C('#d8d0c0')); p.rect(3, 11, w - 6, 3, C('#2a2a2a')); keys(4, 12, w - 8, 2); p.rect(3, 15, w - 6, 2, C('#c8401a')); drawText(p, 'EP', 4, 15.5, W); for (const x of [4, w - 6]) { p.vline(x, 18, h - 1, CHROME); p.vline(x + 1, 18, h - 1, lv(CHROME, 2)); } blk(p, w / 2 - 4, h - 7, 8, 7, m.wood); p.disc(w / 2, h - 3.5, 2, C('#3a3a3a')); return; }
  if (s === 4) { blk(p, 0, 12, w, 5, C('#2a2a30')); keys(2, 14, w - 4, 2); p.rect(3, 12, 8, 2, lit ? C('#80f0a0') : C('#1a3a2a')); for (let i = 0; i < 6; i++) p.put(14 + i * 2, 13, lit ? m.acc : DGREY); p.line(5, 17, w - 6, h - 1, BLACK); p.line(w - 6, 17, 5, h - 1, BLACK); p.line(6, 17, w - 5, h - 1, lv(BLACK, 3)); glow(d, 7, 13, 4, C('#80f0a0')); return; }
  if (s === 5) { blk(p, 1, 9, w - 2, 9, m.wood2); p.rect(3, 10, 6, 2, lit ? C('#f08a30') : C('#4a3a2a')); keys(2, 13, w - 4, 3); blk(p, 2, 18, 2, h - 18, m.wood2); blk(p, w - 4, 18, 2, h - 18, m.wood2); p.hline(4, w - 5, h - 3, m.wood2); blk(p, w / 2 - 4, h - 3, 8, 2, BLACK); return; }
  if (s === 6) { blk(p, 1, 12, w - 2, 6, W); keys(2, 15, w - 4, 2); p.hline(2, w - 3, 13, lv(W, 2)); for (const x of [2, w - 3]) { p.vline(x, 18, h - 1, W); p.put(x, h - 1, lv(W, 2)); } p.hline(2, w - 3, h - 8, lv(W, 2.6)); return; }
  blk(p, 1, 12, w - 2, 6, C('#2a2c34')); keys(2, 15, w - 4, 2, lit); blk(p, w / 2 - 6, 4, 12, 8, C('#1a1a1e')); p.rect(w / 2 - 5, 5, 10, 6, lit ? C('#3a5ac8') : C('#14141a')); for (let i = 0; i < 4; i++) p.rect(w / 2 - 4 + i * 2, 9 - i, 1, 1 + i, lit ? m.acc : DGREY);
  blk(p, 2, 18, 3, h - 18, C('#2a2c34')); blk(p, w - 5, 18, 3, h - 18, C('#2a2c34')); p.hline(5, w - 6, h - 1, lit ? lv(m.acc, 5) : lv(m.acc, 2)); glow(d, w / 2, 8, 9, C('#6a8ae0'));
}

/** Tapete (no chão, em perspectiva): persa → déco geométrico → oval trançado → felpudo → Memphis → kilim → sisal → tapete com fio de luz. */
function rug(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const at = (x: number, y: number) => {
    const u = x / w, v = y / h, edge = x < 2 || x >= w - 2 || y === 0 || y === h - 1;
    switch (s) {
      case 0: return edge ? m.acc2 : (Math.abs(u - 0.5) * 4 + Math.abs(v - 0.5) * 2) < 0.6 ? lv(m.wood2, 1.4) : (x + y * 2) % 6 === 0 ? m.acc2 : (m.fab === C('#e6dac0') ? C('#8a2a2a') : m.fab);
      case 1: return edge ? BLACK : (x % 8 < 4) === (y < h / 2) ? C('#e6dac0') : C('#2a7a7a');
      case 2: { const r = ((u - 0.5) * 2) ** 2 + ((v - 0.5) * 2) ** 2; return r > 1 ? 0 : C(['#c84a3a', '#e8d8b0', '#48a8a0', '#f0a0a8'][Math.floor(Math.sqrt(r) * 4) % 4]); }
      case 3: return y === 0 ? lv(C('#c8a060'), 4) : noise(x, y, 99) > 0.5 ? C('#c8a060') : C('#b08848');
      case 4: return edge ? BLACK : (x + y) % 7 === 0 ? C('#f0e040') : x % 12 < 6 ? C('#3ac0d0') : C('#e04898');
      case 5: return edge ? C('#3a2a20') : (Math.abs((x % 10) - 5) + Math.abs(y - h / 2)) < 3 ? C('#d8a030') : (x % 10 === 0 ? C('#3a6a3a') : C('#8a3a2a'));
      case 6: return (x + (y % 2)) % 2 ? C('#d8c8a0') : C('#c8b890');
      default: return edge ? (lit ? lv(m.acc, 5) : lv(m.acc, 2)) : (x % 6 === 0 ? C('#5a5c66') : C('#4c4e56'));
    }
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const skew = Math.round((h - 1 - y) * 0.5); // perspectiva: o fundo é mais estreito
    if (x < skew || x >= w - skew) continue;
    const c = at(x, y);
    if (c) p.put(x, y, c);
  }
  if (s === 0) for (let x = 0; x < w; x += 2) p.put(x, h - 1, C('#f0e8d0')); // franja
  if (s === 7) glow(d, w / 2, h / 2, 6, m.acc);
}

// ---------------------------------------------------------------- sobre a mesa

/** Abajur de mesa: Tiffany → leque déco → cone com pé de latão → luminária de lava → halógena articulada → cúpula de tecido → arco fino → lâmpada inteligente. */
function tablelamp(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const fl = h - 1, cx = w / 2;
  if (s === 0) { for (let y = 1; y < 7; y++) { const r = 1 + y * 0.7; for (let x = Math.round(cx - r); x < cx + r; x++) p.put(x, y, [C('#3a8a5a'), C('#d8a030'), C('#a83a2a'), C('#3a6a9a')][(x + y * 2) % 4]); } if (lit) p.rect(1, 3, w - 2, 4, withAlpha(GLOW, 90)); p.hline(0, w - 1, 7, m.metal); p.vline(cx, 8, fl - 2, m.metal); p.poly([[cx - 3, fl + 1], [cx + 3, fl + 1], [cx + 1, fl - 2], [cx - 1, fl - 2]], m.metal); glow(d, cx, 6, 6); }
  else if (s === 1) { for (let i = 0; i < 5; i++) p.line(cx, 8, 1 + i * 2, 2, i % 2 ? lv(C('#f0e8d8'), lit ? 5 : 3) : C('#f0e8d8')); p.hline(1, w - 2, 1, m.metal); blk(p, cx - 1, 8, 2, fl - 9, BLACK); blk(p, 1, fl - 1, w - 2, 2, BLACK); p.hline(2, w - 3, fl - 1, m.metal); glow(d, cx, 5, 6); }
  else if (s === 2) { p.poly([[1, 7], [w - 1, 7], [cx + 1, 1], [cx - 1, 1]], m.acc); p.hline(1, w - 2, 7, lit ? BULB : lv(m.acc, 2)); p.line(cx, 8, cx - 2, fl - 1, BRASS); p.line(cx, 8, cx + 2, fl - 1, BRASS); p.disc(cx, fl - 0.5, 1, m.wood2); glow(d, cx, 8, 5); }
  else if (s === 3) { p.poly([[cx - 2, 1], [cx + 2, 1], [cx + 3, 9], [cx - 3, 9]], lit ? C('#f0a040') : C('#a8602a')); p.disc(cx - 0.5, 5, 1.3, lit ? C('#ff5a3a') : C('#8a2a1a')); p.disc(cx + 1, 3, 0.8, lit ? C('#ff5a3a') : C('#8a2a1a')); p.hline(cx - 2, cx + 1, 0, m.metal); p.poly([[cx - 3, 9], [cx + 3, 9], [cx + 4, fl + 1], [cx - 4, fl + 1]], m.metal); glow(d, cx, 5, 5, C('#ff7a3a')); }
  else if (s === 4) { blk(p, 1, fl - 1, 5, 2, BLACK); p.line(3, fl - 1, 2, 6, BLACK); p.line(2, 6, 7, 2, BLACK); p.poly([[6, 1], [9, 2], [9, 5], [6, 4]], m.acc2); p.put(8, 5, lit ? BULB : DGREY); glow(d, 8, 6, 5, BULB); }
  else if (s === 5) { p.poly([[1, 7], [w - 1, 7], [w - 2, 1], [2, 1]], lit ? lv(C('#e8dcc0'), 4.6) : C('#e8dcc0')); p.hline(1, w - 2, 7, lv(C('#e8dcc0'), 2)); p.ellipse(cx, fl - 3, 3, 3, m.fab2); p.vline(cx, 8, fl - 6, m.metal); p.hline(cx - 2, cx + 1, fl, lv(m.fab2, 1)); glow(d, cx, 7, 5); }
  else if (s === 6) { blk(p, 0, fl - 1, 5, 2, m.wood); p.line(2, fl - 1, 2, 4, m.metal); p.line(2, 4, 7, 1, m.metal); p.ellipse(8, 3, 1.5, 1.5, m.metal); p.put(8, 4, lit ? BULB : lv(m.metal, 3)); glow(d, 8, 5, 4, BULB); }
  else { ball(p, cx, 5, 3.5, lit ? C('#f8f0ff') : C('#c8ccd8')); if (lit) d.fx.disc(cx, 5, 3.5, withAlpha(C('#ff9ae0'), 80)); blk(p, cx - 2, 8, 4, 3, C('#d8dce4')); blk(p, cx - 3, fl - 3, 6, 4, C('#2a2c34')); p.hline(cx - 2, cx + 1, fl - 2, lit ? m.acc : DGREY); glow(d, cx, 5, 6, C('#ff9ae0')); }
}

/** Vasinho: violeta em cachepô de porcelana → cacto em vaso escalonado → espada-de-são-jorge em vaso de pés → hera pendente em vaso de barro → cacto colorido → bonsai → suculenta em cimento → vaso autoirrigável com sensor. */
function smallplant(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const fl = h - 1;
  const pots: Col[] = [W, BLACK, C('#f0d040'), C('#b8603a'), m.acc2, C('#4a5a6a'), C('#b8b4ac'), C('#2a2c34')];
  const pot = pots[s], py = s === 3 ? 6 : 7;
  if (s === 0) { foliage(p, w / 2, 4, 4, 3, 101); for (const x of [3, 5, 7]) p.put(x, 3, C('#9a5ac8')); p.put(6, 2, C('#f0d040')); }
  else if (s === 1) { blk(p, 3, 1, 4, 7, C('#4a8a4a')); blk(p, 1, 3, 2, 3, C('#4a8a4a')); blk(p, 7, 2, 2, 3, C('#4a8a4a')); for (let y = 2; y < 7; y += 2) p.put(5, y, W); }
  else if (s === 2) { for (const [x, t] of [[3, 1], [5, 0], [7, 2]] as const) { p.rect(x, t, 2, py - t, C('#3a7a3a')); p.vline(x, t + 1, py - 1, C('#c8d070')); } }
  else if (s === 3) { foliage(p, w / 2, 3, 4, 2.5, 103); for (const x of [1, 8]) { p.vline(x, 5, fl - 1, LEAF); p.put(x, fl - 2, LEAF2); } }
  else if (s === 4) { p.ellipse(w / 2, 4, 2.5, 3.5, C('#48b85c')); p.disc(w / 2, 1, 1.2, C('#ff5ab0')); p.put(3, 4, W); }
  else if (s === 5) { p.line(5, py - 1, 4, 3, C('#6a4a2a')); p.line(4, 3, 7, 2, C('#6a4a2a')); foliage(p, 3, 2, 2.5, 1.5, 105); foliage(p, 7, 1.5, 2.5, 1.5, 106); }
  else if (s === 6) { for (const [x, y] of [[3, 5], [5, 4], [7, 5], [5, 6]] as const) p.ellipse(x, y, 1.6, 1.3, C('#8ab08a')); p.put(5, 4, lv(C('#8ab08a'), 4)); }
  else { foliage(p, w / 2, 3, 3.5, 3, 108); p.rect(1, py - 1, 1, 2, lit ? m.acc : DGREY); }
  const taper = s === 1 ? 0 : 1;
  p.poly([[1, py], [w - 1, py], [w - 1 - taper, fl + 1], [1 + taper, fl + 1]], pot); p.hline(1, w - 2, py, lv(pot, 4.4)); p.hline(1 + taper, w - 2 - taper, fl, lv(pot, 1.4));
  if (s === 0) { p.hline(2, w - 3, py + 2, C('#3a6ac8')); p.put(4, py + 3, C('#3a6ac8')); }
  if (s === 1) p.hline(1, w - 2, py + 2, m.metal);
  if (s === 7) { p.rect(w - 3, py + 1, 1, 2, lit ? C('#48b85c') : DGREY); glow(d, 1.5, py, 2.5, m.acc); }
}


/** Globo de mesa: globo em suporte de latão → globo déco com meridiano cromado → globo iluminado azul → globo de plástico laranja → globo inflável → globo de madeira → globo de arame → globo flutuante magnético com luz. */
function globe(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const fl = h - 1, cx = w / 2, cy = 5.5, r = 4.5;
  const sea = [C('#c8b07a'), C('#5a8ab0'), lit ? C('#6ab0f0') : C('#3a7ac0'), C('#e88a30'), C('#3ac0d0'), C('#c8a070'), 0, C('#20304a')][s];
  const land = [C('#8a6a3a'), C('#d8c890'), C('#48b85c'), C('#f0d040'), C('#e04898'), C('#6a4a2a'), m.metal, lit ? m.acc : C('#3a6a7a')][s];
  if (s === 6) { p.ring(cx, cy, r, m.metal); p.vline(cx, cy - r, cy + r, m.metal); p.hline(cx - r, cx + r, cy, m.metal); p.ellipse(cx, cy, 2, r, 0); p.ring(cx, cy, 2.4, m.metal); }
  else {
    p.disc(cx, cy, r, sea);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dd = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (dd < r && noise(x >> 1, y >> 1, 121) > 0.55) p.put(x, y, land); }
    p.put(cx - 2, cy - 3, lv(sea, 5));
  }
  if (s === 0 || s === 1 || s === 5) { p.ring(cx, cy, r + 1, s === 1 ? CHROME : m.metal); p.put(cx - r - 1, cy, BLACK); }
  if (s === 7) { p.line(cx + r, cy, cx + 1, fl - 1, C('#2a2c34')); blk(p, cx - 3, fl - 1, 6, 2, C('#2a2c34')); p.hline(cx - 2, cx + 1, fl - 1, lit ? lv(m.acc, 5) : DGREY); glow(d, cx, cy, 6, m.acc); return; } // braço em arco até a base
  const sc = s === 0 || s === 5 ? m.wood2 : s === 1 ? CHROME : s === 3 ? C('#e88a30') : s === 4 ? m.acc : s === 6 ? m.metal : m.metal;
  p.vline(cx, cy + r, fl - 1, sc); blk(p, cx - 3, fl - 1, 6, 2, sc);
  if (s === 2) glow(d, cx, cy, 6, C('#9ad0ff'));
}

// ---------------------------------------------------------------- teto (fio até y = 0)

/** Lustre/pendente: lustre de cristal → lustre déco escalonado → sputnik → pendente laranja de globo → trilho de spots → luminária de papel → lâmpadas de filamento → anel de LED. */
function chandelier(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const cx = w >> 1;
  const cord = (y1: number, c: Col = DGREY) => { p.rect(cx - 2, 0, 4, 1, lv(c, 2)); p.vline(cx, 1, y1, c); };
  if (s === 0) { cord(4, m.metal); p.ellipse(cx, 9, 10, 3, m.metal); p.ellipse(cx, 8, 9, 1.5, lv(m.metal, 4)); for (let i = 0; i < 6; i++) { const x = 2 + i * 4; p.vline(x, 9, 13 + (i % 2) * 2, withAlpha(C('#e8f0f8'), 230)); p.put(x, 14 + (i % 2) * 2, W); p.rect(x - 1, 4, 2, 4, W); p.put(x - 1, 3, lit ? BULB : C('#c8b878')); } p.disc(cx, h - 2, 1.5, withAlpha(C('#e8f0f8'), 230)); glow(d, cx, 8, 11); }
  else if (s === 1) { cord(3, BLACK); for (let i = 0; i < 3; i++) { const ww = 8 + i * 6; blk(p, cx - ww / 2, 4 + i * 4, ww, 4, i % 2 ? m.metal : lit ? C('#fff0d0') : C('#e8dcc0')); } p.hline(cx - 9, cx + 9, 15, m.metal); p.poly([[cx - 2, 16], [cx + 2, 16], [cx, 19]], m.metal); glow(d, cx, 11, 11); }
  else if (s === 2) { cord(7, BRASS); ball(p, cx, 9, 2, BRASS); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const x = cx + Math.cos(a) * 10, y = 9 + Math.sin(a) * 6; p.line(cx, 9, x, y, BRASS); p.disc(x, y, 1, lit ? BULB : W); } glow(d, cx, 9, 11); }
  else if (s === 3) { cord(5, m.wood2); ball(p, cx, 11, 6, lit ? lv(m.fab, 4.6) : m.fab); p.hline(cx - 6, cx + 5, 11, lv(m.fab, 1.6)); p.ellipse(cx, 16, 3, 1, lit ? BULB : lv(m.fab, 1.4)); if (lit) d.fx.poly([[cx - 4, 17], [cx + 4, 17], [cx + 9, h + 4], [cx - 9, h + 4]], withAlpha(GLOW, 60)); glow(d, cx, 11, 9, C('#ffb060')); }
  else if (s === 4) { p.rect(1, 0, w - 2, 2, BLACK); p.hline(1, w - 2, 0, C('#3a3a42')); for (const x of [4, 12, 20]) { p.vline(x, 2, 4, BLACK); p.poly([[x - 2, 5], [x + 2, 5], [x + 3, 10], [x - 1, 10]], x === 12 ? m.acc : C('#2a2a30')); p.put(x + 1, 10, lit ? BULB : DGREY); if (lit) d.fx.poly([[x - 1, 11], [x + 3, 11], [x + 6, h + 4], [x - 2, h + 4]], withAlpha(BULB, 60)); } }
  else if (s === 5) { const r = Math.min(7, w / 2 - 1, (h - 4) / 2), cy = h - 1 - r; cord(Math.floor(cy - r), W); p.disc(cx, cy, r, lit ? C('#fff8e8') : C('#f2ece0')); for (let y = Math.ceil(cy - r) + 1; y < cy + r; y += 2) { const hw = Math.round(Math.sqrt(Math.max(0, r * r - (y - cy) ** 2))); p.hline(cx - hw + 1, cx + hw - 1, y, lv(C('#f2ece0'), 2.6)); } glow(d, cx, cy, r + 3); }
  else if (s === 6) { p.rect(cx - 6, 0, 12, 1, m.metal); for (const [x, len] of [[cx - 5, 10], [cx, 14], [cx + 5, 8]] as const) { p.vline(x, 1, len, m.metal); p.rect(x - 1, len + 1, 2, 2, m.metal); p.ellipse(x, len + 5, 1.8, 2.5, withAlpha(C('#e8d8b0'), 220)); p.vline(x, len + 3, len + 6, lit ? C('#ffc040') : C('#8a6a2a')); if (lit) d.fx.disc(x, len + 5, 3.5, withAlpha(C('#ffc060'), 90)); } }
  else { p.vline(cx - 7, 0, 8, m.metal); p.vline(cx + 7, 0, 8, m.metal); p.ellipse(cx, 10, 11, 3, C('#2a2c34')); p.ellipse(cx, 10, 9, 1.5, lit ? lv(m.acc, 5) : lv(m.acc, 1.4)); p.ellipse(cx, 11, 9, 1, lit ? C('#f8f8ff') : C('#3a3c44')); if (lit) d.fx.ellipse(cx, 13, 11, 4, withAlpha(m.acc, 60)); }
}


// ---------------------------------------------------------------- padrões (ladrilhos sem costura: tudo é função periódica de x, y)

const wrapD = (a: number, b: number, n: number): number => { const d = Math.abs(a - b) % n; return Math.min(d, n - d); };
const TAU = Math.PI * 2;
/** Papel de parede (16×16). */
function wallpaperAt(s: number, x: number, y: number): Col {
  switch (s) {
    case 0: { // nouveau: trepadeira dourada ondulante sobre verde-sálvia, com flor-de-lis
      const vy = 8 + 3.5 * Math.sin((x / 16) * TAU);
      if (Math.abs(y - vy) < 0.8) return C('#c8a050');
      if (wrapD(x, 4, 16) + wrapD(y, 3, 16) < 2) return C('#e8d0a0');
      if (wrapD(x, 12, 16) + wrapD(y, 13, 16) < 1.5) return C('#7a3a4a');
      return (x + y) % 5 === 0 ? C('#7a9a78') : C('#8aaa86');
    }
    case 1: { // déco: leques dourados sobre creme
      const dx = x - 7.5, dy = y - 15.5, r = Math.hypot(dx, dy);
      if (r < 8 && dy < 0) { if (Math.abs(r - 7) < 0.6 || Math.abs(r - 4.5) < 0.5) return C('#c8a040'); if (Math.abs(Math.atan2(dy, dx) % 0.5) < 0.12) return C('#d8b860'); return C('#e8dcc0'); }
      return y === 15 ? C('#c8a040') : C('#efe4ca');
    }
    case 2: { // anos 50: bumerangues e estrelinhas atômicas
      if (wrapD(x, 3, 16) + wrapD(y, 3, 16) < 1 || (wrapD(x, 3, 16) < 0.6 && wrapD(y, 3, 16) < 2.6) || (wrapD(y, 3, 16) < 0.6 && wrapD(x, 3, 16) < 2.6)) return C('#2a2a2a');
      const bx = (x - 11 + 16) % 16, by = (y - 10 + 16) % 16;
      if (by < 2 && bx < 6 - by * 2) return C('#e04848');
      if (bx < 2 && by < 6 && by >= 1) return C('#48a8a0');
      if (wrapD(x, 13, 16) < 0.6 && wrapD(y, 2, 16) < 0.6) return C('#f0a0a8');
      return C('#f4ecd0');
    }
    case 3: { // anos 70: círculos concêntricos em duas grades
      const r1 = Math.hypot(wrapD(x + 0.5, 8, 16), wrapD(y + 0.5, 8, 16)), r2 = Math.hypot(wrapD(x + 0.5, 0, 16), wrapD(y + 0.5, 0, 16));
      const r = Math.min(r1, r2);
      return [C('#4a2c18'), C('#d8782a'), C('#a8862a'), C('#f0c060')][Math.floor(r / 1.6) % 4];
    }
    case 4: { // anos 80: Memphis — rabisco, triângulo e confete
      if (Math.abs(y - (4 + Math.round(1.5 * Math.sin((x / 16) * TAU * 2)))) < 0.6) return C('#26262c');
      const tx = (x - 10 + 16) % 16, ty = (y - 9 + 16) % 16;
      if (ty < 5 && Math.abs(tx - 2.5) < ty / 2 + 0.3) return C('#3ac0d0');
      if (wrapD(x, 3, 16) < 1 && wrapD(y, 12, 16) < 1) return C('#e04898');
      if ((x * 7 + y * 3) % 23 === 0) return C('#f0e040');
      return C('#ecebf0');
    }
    case 5: { // anos 90: xadrez escocês verde e vinho
      const a = wrapD(x, 4, 16) < 2, b = wrapD(y, 4, 16) < 2, t = wrapD(x, 12, 16) < 0.6 || wrapD(y, 12, 16) < 0.6;
      if (t) return C('#d8a030');
      return a && b ? C('#5a2420') : a || b ? C('#7a3a2a') : (x + y) % 2 ? C('#2e4a34') : C('#365a3c');
    }
    case 6: return x % 8 === 0 ? C('#dcdad4') : C('#ecebe6'); // minimalista: risca de giz quase invisível
    default: { // casa inteligente: painel acústico 3D de hexágonos
      const hx = x % 8, hy = (y + (Math.floor(x / 8) % 2) * 8) % 16;
      if (hy === 0 || hx === 0) return C('#30323a');
      return hy < 6 && hx < 5 ? C('#5a5c66') : hy > 11 ? C('#3e4048') : C('#4c4e56');
    }
  }
}
/** Pintura e textura (16×16). */
function paintAt(s: number, x: number, y: number): Col {
  const n = noise(x, y, 141 + s);
  switch (s) {
    case 0: return n > 0.82 ? C('#d8c8a0') : n < 0.12 ? C('#c0b088') : C('#ccbc94'); // estuque
    case 1: return y === 12 ? C('#c8a040') : y === 13 ? C('#a8802a') : n > 0.9 ? C('#f4ecd8') : C('#ece2c8'); // marfim com filete
    case 2: return (x + y * 3) % 7 === 0 ? C('#a8d8c0') : C('#b8e0cc'); // verde-menta de rolo
    case 3: return x % 4 === 0 ? C('#3a2010') : x % 4 === 1 ? C('#8a5a30') : n > 0.7 ? C('#6a4024') : C('#7a4a28'); // lambri escuro
    case 4: return n > 0.93 ? C('#3ac0d0') : n < 0.05 ? C('#26262c') : n > 0.88 ? C('#f0e040') : C('#f0d0dc'); // respingado
    case 5: return mix(C('#c8784a'), C('#e0a070'), (Math.sin((x / 16) * TAU) + Math.cos((y / 16) * TAU * 2) + n) / 3 + 0.33); // esponjado terracota
    case 6: { const hole = wrapD(x, 4, 16) < 1 && (wrapD(y, 4, 8) < 1); return hole ? C('#8a8a86') : x === 0 || y === 0 ? C('#a8a6a0') : n > 0.8 ? C('#c4c2bc') : C('#bab8b2'); } // concreto aparente
    default: return x % 3 === 2 ? C('#3a2c22') : x % 3 === 0 ? C('#b08a64') : C('#9a7452'); // painel ripado
  }
}
/** Piso (16×16). */
function floorAt(s: number, x: number, y: number): Col {
  const n = noise(x, y, 171 + s);
  switch (s) {
    case 0: { // espinha de peixe
      const u = (x + y) % 16, v = (x - y + 32) % 16, a = Math.floor(u / 4) % 2 === 0;
      const edge = a ? u % 4 === 0 : v % 4 === 0;
      return edge ? C('#4a2c18') : a ? (n > 0.7 ? C('#9a6a3a') : C('#8a5a30')) : n > 0.7 ? C('#a8784a') : C('#b08050');
    }
    case 1: { const k = (Math.floor(x / 8) + Math.floor(y / 8)) % 2; const vein = Math.abs(((x + y * 0.6) % 8) - 4) < 0.4 && n > 0.4; return k ? (vein ? C('#3a3a40') : C('#1e1e24')) : vein ? C('#c8c4bc') : C('#ece8e0'); } // xadrez de mármore
    case 2: { const g = x % 8 === 0 || y % 8 === 0; return g ? C('#8a8070') : n > 0.85 ? C('#e04848') : n < 0.1 ? C('#48a8a0') : C('#e8e0c8'); } // linóleo salpicado
    case 3: return n > 0.66 ? C('#e09040') : n < 0.3 ? C('#a8602a') : C('#c8782a'); // carpete felpudo
    case 4: return n > 0.94 ? C('#e04898') : n > 0.88 ? C('#3ac0d0') : n < 0.06 ? C('#26262c') : n < 0.1 ? C('#f0e040') : C('#d8d4dc'); // granilite
    case 5: { const row = Math.floor(y / 4), seam = (x + row * 6) % 16 === 0 || y % 4 === 0; return seam ? C('#7a5a34') : (x + row) % 5 === 0 ? C('#b89060') : C('#c8a070'); } // laminado
    case 6: return x === 0 || y === 0 ? C('#a8a49c') : n > 0.9 ? C('#d0ccc4') : C('#c4c0b8'); // cimento queimado
    default: return x === 0 || y === 0 ? C('#4a4a52') : (x + y) % 9 === 0 ? C('#9a9aa4') : C('#7a7a84'); // porcelanato grande
  }
}

// ---------------------------------------------------------------- janela (o vão DWIN fica livre: a vista da cidade aparece)

/** Cortina: drapeado de veludo → cetim plissado com bandô → tecido tropical → estampa geométrica → persiana vertical → romana → voal → rolô motorizado. */
function curtain(d: Dc): void {
  const { p, s, m, lit, w, h } = d;
  const { x: wx, w: ww } = DWIN;
  const rod = [BRASS, m.metal, m.wood2, m.wood, CHROME, m.wood, BLACK, C('#d8dce4')][s];
  const panel = (x0: number, x1: number, y0: number, c: Col, tie: number | null, pattern?: (x: number, y: number) => Col | 0) => {
    for (let y = y0; y < h; y++) {
      let a = x0, b = x1;
      if (tie !== null && y > tie - 6 && y < tie + 6) { const k = 1 - Math.abs(y - tie) / 6; if (x0 === 0) b = Math.round(x1 - k * (x1 - 2)); else a = Math.round(x0 + k * (w - 3 - x0)); }
      for (let x = a; x <= b; x++) { const pc = pattern?.(x, y); p.set(x, y, pc ? pc : (x - a) % 3 === 0 ? lv(c, 1.8) : (x - a) % 3 === 1 ? lv(c, 3.8) : c); }
    }
  };
  // suporte na parede e varão
  p.rect(1, 0, 2, 3, rod); p.rect(w - 3, 0, 2, 3, rod); p.hline(0, w - 1, 2, rod); p.hline(0, w - 1, 1, lv(rod, 4.2));
  if (s === 0) { p.disc(0.5, 2, 1.5, rod); p.disc(w - 0.5, 2, 1.5, rod); panel(0, 7, 3, m.fab, 24); panel(w - 8, w - 1, 3, m.fab, 24); for (let x = 3; x < w - 3; x++) p.set(x, 3 + Math.round(3 * Math.abs(Math.sin(((x - 3) / (w - 6)) * Math.PI * 2))), lv(m.fab, 1.6)); for (let x = 3; x < w - 3; x++) for (let y = 3; y < 3 + Math.round(3 * Math.abs(Math.sin(((x - 3) / (w - 6)) * Math.PI * 2))); y++) p.set(x, y, m.fab); for (const x of [3, w - 4]) { p.rect(x - 1, 24, 2, 1, GOLD); p.vline(x, 25, 28, GOLD); p.put(x, 29, lv(GOLD, 1.6)); } }
  else if (s === 1) { panel(0, 6, 3, m.fab, null); panel(w - 7, w - 1, 3, m.fab, null); blk(p, 0, 3, w, 5, BLACK); for (let x = 2; x < w - 2; x += 4) p.poly([[x, 7], [x + 2, 4], [x + 4, 7]], m.metal); p.hline(0, w - 1, 7, m.metal); }
  else if (s === 2) { const pat = (x: number, y: number): Col | 0 => ((x * 3 + y * 5) % 11 === 0 ? C('#3c8a3c') : (x + y * 2) % 13 === 0 ? C('#f0a0a8') : 0); panel(0, 7, 3, m.fab, 22, pat); panel(w - 8, w - 1, 3, m.fab, 22, pat); }
  else if (s === 3) { const pat = (x: number, y: number): Col | 0 => (Math.floor(y / 4) % 2 === (Math.floor(x / 4) % 2) ? C('#4a2c18') : (y % 4 === 0 ? C('#f0c060') : 0)); panel(0, 7, 3, m.fab, null, pat); panel(w - 8, w - 1, 3, m.fab, null, pat); for (let x = 1; x < w; x += 3) p.put(x, 3, lv(rod, 1.6)); }
  else if (s === 4) { blk(p, 0, 3, w, 3, m.wood); p.hline(0, w - 1, 4, m.fab2); for (const [x0, n] of [[0, 4], [w - 8, 4]] as const) for (let i = 0; i < n; i++) { const c = [m.fab, m.fab2, m.acc, C('#ecebf0')][i % 4]; p.rect(x0 + i * 2, 6, 2, h - 7, c); p.vline(x0 + i * 2, 6, h - 2, lv(c, 4)); } }
  else if (s === 5) { blk(p, wx - 2, 3, ww + 4, 9, m.fab2); for (let y = 5; y < 12; y += 3) p.hline(wx - 2, wx + ww + 1, y, lv(m.fab2, 1.6)); p.hline(wx - 2, wx + ww + 1, 11, lv(m.fab2, 1.2)); p.vline(w / 2, 12, 16, PAPER); p.put(w / 2, 17, m.wood); }
  else if (s === 6) { const sheer = withAlpha(W, 150); for (const [a, b] of [[0, 9], [w - 10, w - 1]] as const) for (let y = 3; y < h; y++) for (let x = a; x <= b; x++) p.set(x, y, (x % 3 === 0) ? withAlpha(lv(W, 2.6), 170) : sheer); }
  else { blk(p, 0, 2, w, 4, C('#e8eaee')); p.rect(wx - 1, 6, ww + 2, 8, C('#3a3c44')); p.hline(wx - 1, wx + ww, 13, C('#2a2c34')); p.rect(w - 4, 3, 2, 2, lit ? m.acc : DGREY); glow(d, w - 3, 4, 3, m.acc); }
}

/** Moldura da janela: bandeira de vitral → caixilho déco com raios → venezianas abertas e floreira → madeira com vaso de macramê → blocos de vidro → PVC branco com vaso → grade fina de aço → vidro inteligente com faixa de tela. */
function winframe(d: Dc): void {
  const { p, s, m, lit, w } = d;
  const { x: wx, y: wy, w: ww, h: wh } = DWIN;
  const fr = [m.wood, BLACK, W, m.wood, C('#f0d0dc'), W, BLACK, C('#2a2c34')][s];
  const t = s === 6 || s === 7 ? 1 : 2;
  // moldura em volta do vão
  blk(p, wx - t, wy - t, ww + 2 * t, t, fr); blk(p, wx - t, wy + wh, ww + 2 * t, t, fr); blk(p, wx - t, wy, t, wh, fr); blk(p, wx + ww, wy, t, wh, fr);
  // peitoril
  blk(p, wx - t - 2, wy + wh + t, ww + 2 * t + 4, 2, s === 4 ? m.fab2 : lv(fr, 2.6));
  if (s === 0) { p.poly([[wx - 3, wy - 2], [w / 2, 0], [wx + ww + 2, wy - 2]], m.wood2); p.put(w / 2, 1, m.metal); for (let x = wx; x < wx + ww; x++) for (let y = wy; y < wy + 7; y++) p.set(x, y, withAlpha([C('#c83a32'), C('#3a8a5a'), C('#d8a030'), C('#3a6ac8')][(Math.floor(x / 3) + Math.floor(y / 3)) % 4], 150)); p.hline(wx, wx + ww - 1, wy + 7, m.wood2); p.vline(w / 2, wy + 7, wy + wh - 1, m.wood2); }
  else if (s === 1) { for (let i = 0; i < 5; i++) p.line(w / 2, wy + 9, wx + i * (ww / 4), wy, m.metal); p.hline(wx, wx + ww - 1, wy + 9, m.metal); p.vline(w / 2, wy + 9, wy + wh - 1, BLACK); }
  else if (s === 2) { for (const x0 of [0, wx + ww + t]) { blk(p, x0, wy - t, wx - t, wh + 2 * t, m.acc); for (let y = wy; y < wy + wh; y += 2) p.hline(x0 + 1, x0 + wx - t - 2, y, lv(m.acc, 1.6)); } blk(p, wx - 1, wy + wh + t + 2, ww + 2, 3, m.wood); for (let x = wx; x < wx + ww; x += 3) { p.put(x, wy + wh + t + 1, x % 2 ? RED : C('#f0d040')); p.put(x + 1, wy + wh + t + 1, LEAF); } p.vline(w / 2, wy, wy + wh - 1, W); }
  else if (s === 3) { p.vline(w / 2, wy, wy + wh - 1, fr); p.vline(wx + 4, wy, wy + 8, C('#c8a060')); p.line(wx + 4, wy + 8, wx + 1, wy + 12, C('#c8a060')); p.line(wx + 4, wy + 8, wx + 7, wy + 12, C('#c8a060')); blk(p, wx + 1, wy + 12, 7, 4, C('#a8401a')); foliage(p, wx + 4, wy + 12, 4, 2, 151, C('#5a7a2a'), C('#7a9a3a')); for (let i = 0; i < 4; i++) p.vline(wx + 2 + i * 2, wy + 15, wy + 19 + (i % 2) * 2, LEAF); }
  else if (s === 4) { for (const x0 of [0, wx + ww + t]) for (let y = wy - t; y < wy + wh + t; y += 4) for (let x = x0; x < x0 + wx - t; x += 4) { p.rect(x, y, 3, 3, withAlpha(C('#b8d8f0'), 220)); p.put(x, y, W); p.hline(x, x + 3, y + 3, C('#8a9ab0')); p.vline(x + 3, y, y + 3, C('#8a9ab0')); } }
  else if (s === 5) { p.vline(w / 2, wy, wy + wh - 1, W); p.hline(wx, wx + ww - 1, wy + 11, W); p.rect(w / 2 + 2, wy + 15, 1, 3, GREY); blk(p, wx + ww - 6, wy + wh - 4, 4, 4, C('#b8603a')); foliage(p, wx + ww - 4, wy + wh - 6, 3, 2.5, 153); }
  else if (s === 6) { for (let x = wx + 6; x < wx + ww; x += 6) p.vline(x, wy, wy + wh - 1, BLACK); for (let y = wy + 7; y < wy + wh; y += 7) p.hline(wx, wx + ww - 1, y, BLACK); }
  else { p.rect(wx, wy + wh - 4, ww, 4, C('#1a1a1e')); drawText(p, '22', wx + 1, wy + wh - 4.5, lit ? m.acc : DGREY); p.hline(wx + 10, wx + ww - 2, wy + wh - 2, lit ? lv(m.acc, 5) : DGREY); for (let x = wx; x < wx + ww; x++) p.set(x, wy, withAlpha(C('#30404c'), 90)); glow(d, wx + 6, wy + wh - 2, 4, m.acc); }
}

// ---------------------------------------------------------------- letreiros (com o nome do selo)

/** Escreve o nome ajustado à largura: tenta escala 2, cai para 1 e abrevia sem cortar palavra. */
function nameIn(p: Px, name: string, x: number, y: number, mw: number, mh: number, c: Col, sh?: Col): void {
  const sc = textWidth(name, 2) <= mw && mh >= 10 ? 2 : 1;
  const t = sc === 2 ? name : abbrText(name, mw, 1);
  const tw = textWidth(t, sc), tx = x + Math.floor((mw - tw) / 2), ty = y + Math.floor((mh - 5 * sc) / 2);
  if (sh) drawText(p, t, tx + 1, ty + 1, sh, sc);
  drawText(p, t, tx, ty, c, sc);
}
/** Letreiro da fachada: tabuleta pintada → vidro negro com letras douradas → neon de caixa → caixa luminosa → neon sobre grade → placa de alumínio com refletores → letras de aço soltas → painel de LED. */
function sign(d: Dc): void {
  const { p, s, m, lit, w, h, name } = d;
  const neon = (c: Col) => (lit ? lv(c, 5) : lv(c, 2.2));
  if (s === 0) { const t = h < 14 ? 1 : 3; for (const x of [6, w - 7]) { p.vline(x, 0, t, GREY); p.put(x, 0, BLACK); } blk(p, 0, t, w, h - t, m.wood); p.rect(1, t + 1, w - 2, h - t - 2, lv(m.wood, 1.6)); for (const x of [1, w - 2]) p.put(x, t + 1, m.metal); nameIn(p, name, 2, t + 1, w - 4, h - t - 2, GOLD, lv(m.wood, 1)); }
  else if (s === 1) { blk(p, 4, 0, w - 8, h, BLACK); p.poly([[0, 4], [4, 0], [4, h], [0, h - 4]], m.metal); p.poly([[w, 4], [w - 4, 0], [w - 4, h], [w, h - 4]], m.metal); p.hline(5, w - 6, 2, m.metal); p.hline(5, w - 6, h - 3, m.metal); nameIn(p, name, 5, 3, w - 10, h - 6, GOLD); }
  else if (s === 2) { blk(p, 0, 2, w, h - 2, C('#2a2a30')); for (const x of [8, w - 9]) p.rect(x, 0, 1, 2, GREY); nameIn(p, name, 2, 3, w - 11, h - 5, neon(C('#ff6a8a'))); p.ring(w - 5, 6, 2, neon(C('#6ae0ff'))); if (lit) { d.fx.rect(1, 3, w - 2, h - 5, withAlpha(C('#ff6a8a'), 40)); } }
  else if (s === 3) { const sb = h < 14 ? 1 : 2; blk(p, 0, 1, w, h - 1, m.wood2); p.rect(1, 2, w - 2, h - 3, lit ? C('#f8e8c0') : C('#d8c8a0')); p.rect(1, 2, w - 2, sb, m.fab); p.rect(1, h - 1 - sb, w - 2, sb, m.fab); nameIn(p, name, 2, 2 + sb, w - 4, h - 3 - 2 * sb, m.wood2); glow(d, w / 2, h / 2, 12, C('#fff0c0')); p.vline(w >> 1, 0, 0, GREY); }
  else if (s === 4) { blk(p, 0, 2, w, h - 2, BLACK); for (let x = 2; x < w - 2; x += 4) p.vline(x, 3, h - 2, C('#1a1a30')); p.hline(1, w - 2, 3, neon(C('#3ac0d0'))); p.hline(1, w - 2, h - 2, neon(C('#3ac0d0'))); nameIn(p, name, 2, 4, w - 4, h - 6, neon(C('#ff5ab0'))); p.vline(w >> 1, 0, 1, GREY); if (lit) d.fx.rect(0, 2, w, h - 2, withAlpha(C('#ff5ab0'), 35)); }
  else if (s === 5) { for (const x of [10, w - 11]) { p.line(x, 0, x + 2, 3, DGREY); p.rect(x + 1, 3, 3, 1, DGREY); if (lit) d.fx.poly([[x, 4], [x + 5, 4], [x + 9, h], [x - 4, h]], withAlpha(BULB, 60)); } blk(p, 0, 5, w, h - 5, C('#c8ccd4')); nameIn(p, name, 2, 5, w - 4, h - 5, m.fab, undefined); }
  else if (s === 6) { blk(p, 0, 1, w, h - 1, C('#e4e2dc')); for (const x of [2, w - 3]) p.put(x, 2, GREY); nameIn(p, name, 1, 1, w - 2, h - 1, C('#7a7c86'), C('#c4c6cc')); }
  else { blk(p, 0, 1, w, h - 1, C('#14141a')); for (let y = 3; y < h - 1; y += 2) for (let x = 2; x < w - 1; x += 2) p.put(x, y, C('#1e1e26')); nameIn(p, name, 2, 3, w - 4, h - 4, lit ? m.acc : lv(m.acc, 1.6)); glow(d, w / 2, h / 2, 10, m.acc); p.vline(w >> 1, 0, 0, GREY); }
}



// ---------------------------------------------------------------- itens específicos do catálogo · móveis

/** Moldura da época (itens sem época): dourada, laca preta, madeira clara, nogueira, branca, pinho, preta fina, alumínio. */
const eraFrame = (e: number, m: Mat): Col => [C('#d8a840'), BLACK, m.wood, C('#5a3418'), W, C('#c8a070'), C('#2a2a2e'), C('#c8ccd4')][e];
/** Quadro pendurado (prego, barbante e moldura): devolve o miolo. */
function hungFrame(d: Dc, fr: Col, t: number, y0 = 3): { x: number; y: number; w: number; h: number } {
  const { p, w, h } = d;
  hang(p, w >> 1, Math.min(4, w >> 2), w - 1 - Math.min(4, w >> 2), y0);
  blk(p, 0, y0, w, h - y0, fr);
  if (t >= 2) p.hline(1, w - 2, y0 + 1, lv(fr, 4.6));
  return { x: t, y: y0 + t, w: w - 2 * t, h: h - y0 - 2 * t };
}

/** Chaise longue de vime curvado (madeira vergada, encosto em voluta). */
function chaise(d: Dc): void {
  const { p, m, w, h } = d, fl = h - 1;
  const wood = m.wood;
  for (let x = 2; x < w - 2; x++) { const y = 10 + Math.round(2 * Math.sin((x / (w - 4)) * Math.PI)); p.put(x, y, wood); p.put(x, y + 1, lv(wood, 2)); }
  p.line(2, 10, 1, 3, wood); p.line(1, 3, 4, 1, wood); p.disc(5, 2.5, 1.5, wood); // voluta do encosto
  for (let x = 4; x < 14; x++) for (let y = 4 + Math.round((14 - x) * 0.4); y < 10; y++) if ((x + y) % 2 === 0) p.put(x, y, C('#d8c090')); // palhinha
  blk(p, 3, 7, w - 7, 3, m.fab); p.hline(4, w - 5, 7, lv(m.fab, 4.4)); blk(p, 2, 4, 4, 5, lv(m.fab, 2.4));
  p.line(5, 12, 2, fl, wood); p.line(w - 6, 12, w - 3, fl, wood); p.line(w / 2, 13, w / 2 - 2, fl, wood);
  for (const x of [2, w / 2 - 2, w - 3]) p.put(x, fl, m.metal);
  p.line(4, fl - 2, w - 5, fl - 2, lv(wood, 2));
}
/** Biombo de seda pintada: 3 painéis em moldura entalhada com garça e galhos. */
function screenFold(d: Dc): void {
  const { p, m, w, h } = d, fl = h - 1, pw = Math.floor(w / 3);
  for (let i = 0; i < 3; i++) {
    const x = i * pw, top = i === 1 ? 0 : 2;
    blk(p, x, top, pw, fl - top - 1, m.wood);
    p.rect(x + 2, top + 2, pw - 4, fl - top - 6, i === 1 ? C('#e8dcc0') : C('#e0d4b4'));
    p.poly([[x + 2, top + 3], [x + pw / 2, top + 1], [x + pw - 2, top + 3]], m.wood2);
    p.rect(x + 1, fl - 1, 2, 2, m.wood2); p.rect(x + pw - 3, fl - 1, 2, 2, m.wood2);
  }
  // pintura que atravessa os painéis: galho com flores e uma garça
  for (let x = 3; x < w - 3; x++) { const y = 9 + Math.round(Math.sin(x * 0.35) * 3); if (x % pw > 1 && x % pw < pw - 2) { p.put(x, y, C('#4a3a30')); if (x % 4 === 0) p.put(x, y - 1, C('#e890a8')); } }
  const gx = pw + pw / 2;
  p.ellipse(gx, 20, 3, 2, W); p.line(gx + 2, 19, gx + 4, 14, W); p.put(gx + 5, 14, C('#c83a32')); p.line(gx - 1, 22, gx - 1, 26, C('#4a3a30')); p.line(gx + 1, 22, gx + 2, 26, C('#4a3a30'));
  p.hline(2, w - 3, fl - 4, C('#8aa878'));
}
/** Aparador/bufê/credenza: corpo com portas e gavetas no estilo (vitral nouveau, marchetaria déco, teca de pés palito). */
function cabinet(d: Dc): void {
  const { p, s, m, w, h } = d;
  const lh = s === 2 ? 6 : 3, top = s === 0 ? 3 : 0, bot = h - 1 - lh;
  const c = s === 1 ? BLACK : m.wood;
  blk(p, 0, top, w, bot - top + 1, c);
  if (s === 0) { p.poly([[2, top + 1], [w / 2, 0], [w - 2, top + 1]], m.wood2); p.disc(w / 2, 1.5, 1.2, m.metal); }
  const nd = s === 2 ? 3 : 2, dw = Math.floor((w - 4) / nd);
  for (let i = 0; i < nd; i++) {
    const x = 2 + i * dw, y = top + 4;
    p.rect(x, y, dw - 1, bot - y - 1, lv(c, s === 1 ? 2.6 : 2.4)); p.hline(x, x + dw - 2, y, lv(c, 1.4));
    if (s === 0) for (let yy = y + 1; yy < bot - 2; yy++) for (let xx = x + 1; xx < x + dw - 2; xx++) p.set(xx, yy, withAlpha([C('#c83a32'), C('#3a8a5a'), C('#d8a030'), C('#3a6ac8')][(Math.floor(xx / 3) + Math.floor(yy / 3)) % 4], 120));
    if (s === 1) { const cx = x + (dw - 1) / 2; for (let k = 0; k < 5; k++) p.line(cx, bot - 2, x + 1 + k * ((dw - 3) / 4), y + 2, k % 2 ? m.metal : lv(m.metal, 2)); }
    if (s === 2) p.hline(x + 2, x + dw - 4, y + 2, m.wood2);
    p.put(x + dw - 3, y + Math.floor((bot - y) / 2), m.metal);
  }
  p.rect(2, top + 1, w - 4, 2, lv(c, s === 1 ? 2 : 3.2)); p.put(w / 2, top + 2, m.metal);
  if (s === 1) { p.hline(0, w - 1, top, m.metal); blk(p, 2, bot + 1, w - 4, lh, BLACK); p.hline(3, w - 4, bot + 1, m.metal); }
  else legs(d, 2, w - 3, bot + 1);
  if (s === 2) { p.ellipse(w - 9, top - 1, 3, 1, m.acc); } // tigela de cerâmica em cima
}
/** Penteadeira déco: espelho redondo sobre cômoda escalonada com banqueta. */
function vanity(d: Dc): void {
  const { p, m, w, h } = d, fl = h - 1;
  p.disc(w / 2, 9, 8.5, m.wood2); p.disc(w / 2, 9, 7, m.glass); p.line(w / 2 - 4, 6, w / 2 - 1, 3, lv(m.glass, 5)); p.disc(w / 2, 9, 7.6, 0); p.ring(w / 2, 9, 7.5, m.metal);
  blk(p, 1, 17, w - 2, fl - 17, m.wood2); blk(p, 4, 15, w - 8, 3, m.wood2); p.hline(2, w - 3, 18, m.metal);
  for (const x of [3, w - 9]) { p.rect(x, 20, 6, 3, lv(m.wood2, 2.6)); p.put(x + 3, 21, m.metal); p.rect(x, 24, 6, 3, lv(m.wood2, 2.6)); p.put(x + 3, 25, m.metal); }
  p.rect(w / 2 - 1, 15, 2, 1, C('#f0a0c0')); p.put(w / 2 + 3, 14, C('#c8d8e0'));
}
/** Escrivaninha/mesa: ébano com gaveteiros (déco), vidro e cromo (anos 80), regulável de pé (minimalista). */
function deskF(d: Dc): void {
  const { p, s, m, lit, w, h } = d, fl = h - 1;
  if (s === 4) { // vidro e cromo
    p.rect(0, 6, w, 2, withAlpha(m.glass, 210)); p.hline(0, w - 1, 6, W);
    p.line(3, 8, 8, fl, CHROME); p.line(8, 8, 3, fl, CHROME); p.line(w - 4, 8, w - 9, fl, CHROME); p.line(w - 9, 8, w - 4, fl, CHROME);
    blk(p, w / 2 - 6, 1, 8, 5, C('#e8e4dc')); p.rect(w / 2 - 5, 2, 6, 3, lit ? C('#80c0a0') : C('#2a4a3a')); p.rect(w / 2 + 4, 4, 5, 2, PAPER);
    return;
  }
  if (s === 6) { // mesa de pé regulável
    blk(p, 0, 9, w, 2, m.wood); p.rect(5, 11, 2, fl - 13, m.metal); p.rect(w - 7, 11, 2, fl - 13, m.metal); p.hline(2, 10, fl, m.metal); p.hline(w - 11, w - 3, fl, m.metal);
    blk(p, w / 2 - 7, 0, 13, 8, BLACK); p.rect(w / 2 - 6, 1, 11, 6, lit ? C('#4a6ac8') : C('#1a2030')); p.vline(w / 2 - 1, 8, 8, m.metal); p.rect(w / 2 + 8, 7, 4, 2, W);
    return;
  }
  // ébano déco
  blk(p, 0, 6, w, 3, m.wood2); p.hline(0, w - 1, 8, m.metal);
  for (const x of [1, w - 12]) { blk(p, x, 9, 11, fl - 9, m.wood2); for (let i = 0; i < 3; i++) { p.hline(x + 1, x + 9, 11 + i * 4, lv(m.wood2, 3)); p.put(x + 5, 12 + i * 4, m.metal); } }
  p.rect(12, 9, w - 24, 2, lv(m.wood2, 2)); blk(p, 4, 2, 7, 4, C('#1e2a20')); p.vline(7, 2, 5, m.metal); p.poly([[4, 1], [10, 1], [8, 3], [6, 3]], C('#3a7a4a')); p.rect(w - 14, 3, 6, 3, C('#e6dac0')); p.put(w - 8, 2, BLACK);
}
/** Floreira de ferro batido com samambaia. */
function plantstand(d: Dc): void {
  const { p, w, h } = d, fl = h - 1, iron = C('#2a2a30');
  foliage(p, w / 2, 5, 5.5, 4.5, 201); for (const x of [1, w - 2]) { p.line(w / 2, 6, x, 12, LEAF); p.put(x, 12, LEAF2); }
  blk(p, 2, 8, w - 4, 4, C('#b8603a')); p.hline(1, w - 2, 12, iron);
  p.line(3, 13, 1, fl, iron); p.line(w - 4, 13, w - 2, fl, iron); p.vline(w / 2, 13, fl - 3, iron);
  p.ring(w / 2, 17, 2.5, iron); p.ring(w / 2, fl - 3, 1.5, iron); p.hline(2, w - 3, fl - 4, iron);
}
/** Poltrona de couro com banqueta (lounge de compensado moldado). */
function lounge(d: Dc): void {
  const { p, m, w, h } = d, fl = h - 1, leather = C('#2a1e1a'), ply = m.wood;
  p.poly([[1, 2], [7, 0], [11, 12], [4, 14]], ply); p.poly([[2, 3], [7, 1], [10, 11], [5, 12]], leather); p.line(3, 4, 7, 2, lv(leather, 4));
  p.poly([[4, 12], [14, 10], [16, 14], [5, 16]], ply); p.poly([[5, 12], [14, 11], [15, 13], [6, 15]], leather);
  blk(p, 8, 9, 7, 2, ply); p.hline(9, 13, 9, lv(leather, 4));
  p.vline(9, 16, fl - 2, BLACK); p.line(9, fl - 2, 4, fl, BLACK); p.line(9, fl - 2, 14, fl, BLACK);
  blk(p, w - 8, fl - 6, 7, 3, leather); p.hline(w - 8, w - 2, fl - 7, ply); p.vline(w - 5, fl - 3, fl - 1, BLACK); p.line(w - 5, fl - 1, w - 8, fl, BLACK); p.line(w - 5, fl - 1, w - 2, fl, BLACK);
}
/** Banco de lanchonete: dois bancos de vinil vermelho com mesa de fórmica e borda cromada. */
function booth(d: Dc): void {
  const { p, m, w, h } = d, fl = h - 1, red = m.acc;
  for (const x of [0, w - 9]) { blk(p, x, 2, 9, fl - 1, red); for (let y = 5; y < 12; y += 3) p.hline(x + 1, x + 7, y, lv(red, 1.6)); p.hline(x, x + 8, 12, CHROME); blk(p, x, 13, 9, fl - 12, lv(red, 2.4)); }
  blk(p, 9, 10, w - 18, 2, C('#e8e0c0')); p.hline(9, w - 10, 11, CHROME); p.vline(w / 2, 12, fl - 1, CHROME); p.hline(w / 2 - 3, w / 2 + 3, fl, CHROME);
  p.rect(13, 7, 2, 3, C('#e04848')); p.put(13, 6, W); p.rect(w - 16, 8, 3, 2, C('#f0d040')); p.rect(w / 2 - 1, 7, 2, 3, withAlpha(m.glass, 200));
}
/** Cama: cama d'água com moldura de madeira (anos 70), futon dobrável (anos 90), cama inteligente com luz (smart). */
function bedF(d: Dc): void {
  const { p, s, m, lit, w, h } = d, fl = h - 1;
  if (s === 3) { blk(p, 0, 5, w, fl - 4, m.wood); p.rect(2, 3, w - 4, 4, C('#5a8ac8')); for (let x = 3; x < w - 3; x += 4) p.put(x, 4 + (x % 8 ? 0 : 1), C('#9ac0f0')); p.rect(2, 2, w - 4, 1, lv(C('#5a8ac8'), 4)); blk(p, 0, 0, 4, 6, m.wood); blk(p, 3, 1, 8, 3, W); p.hline(1, w - 2, 9, lv(m.wood, 1.6)); return; }
  if (s === 5) { blk(p, 0, fl - 3, w, 4, m.wood); for (let x = 4; x < w - 4; x += 6) p.vline(x, fl - 3, fl, lv(m.wood, 1.6)); blk(p, 1, fl - 7, w - 2, 4, m.fab); p.hline(2, w - 3, fl - 7, lv(m.fab, 4.4)); for (let x = 6; x < w - 4; x += 8) p.put(x, fl - 5, lv(m.fab, 1.4)); blk(p, 2, fl - 10, 8, 3, m.fab2); p.poly([[w - 14, fl - 7], [w - 2, fl - 7], [w - 2, fl - 4]], C('#d8a030')); return; }
  blk(p, 0, fl - 6, w, 6, C('#2a2c34')); p.hline(1, w - 2, fl, lit ? lv(m.acc, 5) : lv(m.acc, 2)); if (lit) d.fx.hline(0, w - 1, fl, withAlpha(m.acc, 120));
  blk(p, 1, fl - 10, w - 2, 5, W); p.hline(2, w - 3, fl - 10, lv(W, 5)); blk(p, 0, 0, 6, fl - 5, m.fab); p.rect(1, 3, 4, 2, lit ? m.acc : DGREY);
  blk(p, 6, fl - 12, 8, 3, C('#e8e8ec')); blk(p, 16, fl - 11, w - 17, 3, m.fab2); glow(d, 3, 4, 3, m.acc);
}
/** Cadeira suspensa de macramê: corda do teto (y = 0), cesto trançado e almofada. */
function macrameChair(d: Dc): void {
  const { p, m, w, h } = d, rope = C('#d8c8a0');
  p.rect(w / 2 - 2, 0, 4, 1, GREY); p.vline(w / 2, 1, 8, rope); p.disc(w / 2, 9, 1.5, m.wood);
  p.line(w / 2, 10, 1, 18, rope); p.line(w / 2, 10, w - 2, 18, rope);
  for (let y = 18; y < h - 2; y++) { const r = (w / 2 - 1) * Math.sqrt(1 - ((y - 18) / (h - 18)) ** 2); for (let x = Math.round(w / 2 - r); x <= w / 2 + r; x++) p.put(x, y, (x + y) % 3 === 0 ? lv(rope, 2) : rope); }
  p.ellipse(w / 2, 18, w / 2 - 1, 2, lv(rope, 3)); blk(p, 4, 19, w - 8, 4, m.fab); p.hline(5, w - 6, 19, lv(m.fab, 4.4));
  for (let x = 3; x < w - 3; x += 2) p.vline(x, h - 3, h - 1, rope); // franja chega ao chão
}
/** Conjunto de vime: sofazinho de encosto em leque com almofadas. */
function rattan(d: Dc): void {
  const { p, m, w, h } = d, fl = h - 1, cane = C('#c8a060');
  for (let y = 1; y < 13; y++) for (let x = 2; x < w - 2; x++) { const dx = (x - w / 2) / (w / 2 - 2), top = 1 + Math.round(5 * dx * dx); if (y >= top) p.put(x, y, (x + y) % 2 ? cane : lv(cane, 2.2)); }
  for (let i = 0; i < 9; i++) p.line(w / 2, 12, 3 + i * ((w - 6) / 8), 2 + Math.round(5 * ((3 + i * ((w - 6) / 8) - w / 2) / (w / 2 - 2)) ** 2), lv(cane, 1.4));
  blk(p, 1, 12, w - 2, 5, cane); for (let x = 2; x < w - 2; x += 2) p.vline(x, 13, 16, lv(cane, 2)); blk(p, 4, 10, w - 8, 3, m.fab); p.vline(w / 2, 10, 12, lv(m.fab, 1.6));
  for (const x of [2, w - 4]) { p.rect(x, 17, 2, fl - 16, lv(cane, 1.6)); } p.hline(2, w - 3, fl - 1, lv(cane, 1.6));
}
/** Fliperama: gabinete com tela acesa, painel de controle, moedeiro e arte lateral. */
function arcade(d: Dc): void {
  const { p, m, lit, w, h } = d, fl = h - 1;
  blk(p, 0, 0, w, fl + 1, C('#1e1e2a')); p.rect(1, 1, w - 2, 5, lit ? m.acc : lv(m.acc, 1.4)); drawText(p, 'GO', 4, 1, BLACK);
  p.poly([[2, 7], [w - 2, 7], [w - 3, 18], [3, 18]], C('#0a0a10')); p.rect(4, 8, w - 8, 9, lit ? C('#1a2a6a') : C('#10142a'));
  if (true) { p.rect(6, 12, 2, 2, lit ? C('#f0e040') : C('#6a6a20')); for (let x = 9; x < w - 5; x += 2) p.put(x, 13, lit ? W : DGREY); p.rect(w - 7, 9, 2, 2, lit ? m.fab : lv(m.fab, 1.4)); }
  blk(p, 0, 19, w, 4, m.fab2); p.vline(4, 17, 19, BLACK); p.disc(4.5, 17, 1, RED); p.disc(10, 20.5, 0.9, C('#f0e040')); p.disc(13, 20.5, 0.9, m.fab);
  p.rect(w / 2 - 2, 26, 4, 3, C('#3a3a42')); p.rect(w / 2 - 1, 27, 1, 1, lit ? C('#ff4a3a') : DGREY); p.put(w / 2 + 1, 27, C('#c8ccd4'));
  for (let y = 24; y < fl - 1; y += 3) p.hline(1, 2, y, m.fab); glow(d, w / 2, 12, 9, C('#6a8af0'));
}
/** Torre de CDs. */
function cdtower(d: Dc): void {
  const { p, m, w, h } = d, fl = h - 1;
  blk(p, 0, 0, w, fl + 1, m.metal); p.rect(1, 1, w - 2, fl - 2, lv(m.metal, 1.4));
  for (let y = 2; y < fl - 2; y += 2) p.hline(2, w - 3, y, [C('#c8ccd8'), C('#3a6ac8'), C('#e04848'), C('#2a2a2a'), C('#d8a030'), W][(y >> 1) % 6]);
  blk(p, -0, fl - 1, w, 2, lv(m.metal, 1));
}
/** Mesa de sinuca: feltro verde, tabela de madeira, caçapas, bolas e taco; pés da época. */
function pooltable(d: Dc): void {
  const { p, m, w } = d;
  const felt = [C('#2a6a3a'), C('#2a6a3a'), C('#2a7a4a'), C('#3a6a2a'), C('#2a5a8a'), C('#7a2a3a'), C('#3a4a5a'), C('#2a3a6a')][d.e];
  blk(p, 0, 4, w, 4, m.wood); p.rect(2, 3, w - 4, 2, felt); p.hline(2, w - 3, 3, lv(felt, 4));
  for (const x of [1, w / 2, w - 2]) p.rect(x - 1, 3, 2, 1, BLACK);
  ball(p, 9, 2, 1.3, W); ball(p, w - 12, 2, 1.3, C('#e04848')); ball(p, w - 9, 2, 1.3, C('#f0c040')); ball(p, w - 15, 2, 1.3, C('#2a4ab0'));
  p.line(11, 1, w / 2 + 6, 0, C('#c8a060')); blk(p, 2, 8, w - 4, 3, lv(m.wood, 1.6)); p.hline(3, w - 4, 9, m.metal);
  legs({ ...d, s: d.e }, 3, w - 4, 11);
}
/** Prateleira flutuante (minimalista): tábua fina presa invisível, com vasinho e livros. */
function floatshelf(d: Dc): void {
  const { p, m, w, h } = d;
  blk(p, 0, h - 2, w, 2, m.wood); p.hline(1, w - 2, h - 1, lv(m.wood, 1.2));
  books(p, 3, h - 3, 6, 4, 211, [C('#e8e4dc'), C('#2a2a2e'), m.acc2]); p.rect(14, h - 4, 3, 2, C('#e8e4dc')); p.put(15, h - 5, LEAF); blk(p, w - 9, h - 3, 6, 1, m.acc); p.rect(w - 8, h - 4, 4, 1, C('#e8d8b8'));
}
/** Banco de madeira maciça. */
function bench(d: Dc): void {
  const { p, m, w, h } = d, fl = h - 1;
  blk(p, 0, 2, w, 3, m.wood); for (let x = 3; x < w - 2; x += 9) p.vline(x, 3, 3, lv(m.wood, 3)); blk(p, 3, 5, 3, fl - 4, m.wood2); blk(p, w - 6, 5, 3, fl - 4, m.wood2); blk(p, 10, 1, 6, 1, m.fab);
}
/** Balcão de bar: tampo, frente almofadada/da época, prateleira de garrafas atrás e banquetas. */
function barcounter(d: Dc): void {
  const { p, m, w, h, e } = d, fl = h - 1;
  for (let i = 0; i < 9; i++) { const x = 6 + i * 5, c = [C('#3a6a3a'), C('#8a3a1a'), C('#d8c8a0'), C('#2a4a6a'), C('#c8a040')][i % 5]; p.rect(x, 2, 2, 5, c); p.put(x, 1, c); p.put(x, 0, lv(c, 4)); }
  p.hline(4, w - 5, 7, m.wood2); p.vline(4, 7, 9, m.wood2); p.vline(w - 5, 7, 9, m.wood2);
  blk(p, 0, 10, w, 3, e === 0 || e === 1 ? C('#5a3418') : m.wood); p.hline(0, w - 1, 12, e >= 6 ? m.metal : BRASS);
  const front = [m.wood2, BLACK, C('#c84a3a'), m.wood, C('#2a2a30'), m.wood, C('#e8e4dc'), C('#2a2c34')][e];
  blk(p, 2, 13, w - 4, fl - 13, front);
  if (e === 0 || e === 3 || e === 5) for (let x = 6; x < w - 4; x += 8) p.rect(x, 15, 6, fl - 17, lv(front, 2.6));
  if (e === 1) for (let x = 6; x < w - 4; x += 4) p.vline(x, 14, fl - 2, m.metal);
  if (e === 2) for (let y = 15; y < fl - 1; y += 3) p.hline(3, w - 4, y, lv(front, 1.6));
  if (e === 7 || e === 4) p.hline(3, w - 4, fl - 1, e === 7 ? m.acc : C('#ff5ab0'));
  p.hline(3, w - 4, fl - 3, m.metal); // descanso de pé
  p.rect(w - 12, 8, 3, 2, withAlpha(m.glass, 200)); p.rect(10, 8, 2, 2, C('#c8a040'));
}
/** Arara de camisetas da casa: barra cromada, camisetas com o logo em cores. */
function merchrack(d: Dc): void {
  const { p, m, w, h, e } = d, fl = h - 1, bar = e >= 6 ? m.metal : CHROME;
  p.hline(1, w - 2, 2, bar); p.vline(1, 2, fl, bar); p.vline(w - 2, 2, fl, bar); p.hline(0, 3, fl, bar); p.hline(w - 4, w - 1, fl, bar); p.put(1, fl, BLACK); p.put(w - 2, fl, BLACK);
  const cols = [C('#2a2a30'), C('#c83a32'), W, C('#3a6ac8'), C('#48a050')];
  for (let i = 0; i < 5; i++) { const x = 3 + i * 5, c = cols[(i + e) % 5]; p.put(x + 2, 3, GREY); p.poly([[x, 5], [x + 5, 5], [x + 6, 8], [x + 5, 9], [x + 5, 17], [x, 17], [x, 9], [x - 1, 8]], c); p.hline(x, x + 4, 5, lv(c, 4.4)); p.rect(x + 2, 9, 2, 2, c === W ? BLACK : m.acc2 === c ? W : lv(c, 5)); }
  blk(p, 4, fl - 6, w - 8, 5, m.wood); p.hline(5, w - 6, fl - 4, lv(m.wood, 1.6)); for (let i = 0; i < 4; i++) p.rect(6 + i * 5, fl - 8, 4, 2, cols[(i + 2) % 5]);
}
/** Caixote de discos: lombadas e capas à mostra, madeira da época. */
function recordbin(d: Dc): void {
  const { p, m, w, h, e } = d, fl = h - 1;
  for (let i = 0; i < 9; i++) { const x = 3 + i * 2.6, c = [C('#c83a32'), C('#2a2a2a'), C('#f0d040'), C('#3a6ac8'), C('#e8e0c8'), C('#48a050'), C('#e88a30')][(i + e) % 7]; p.rect(x, 2 + (i % 3), 2, 10, c); p.put(x, 2 + (i % 3), lv(c, 4.4)); }
  p.rect(w - 9, 0, 7, 8, C('#e8e0c8')); p.disc(w - 5.5, 4, 2.2, BLACK); p.put(w - 6, 4, C('#c83a32'));
  blk(p, 0, 7, w, fl - 6, e >= 6 ? m.wood : C('#a07a4a')); p.hline(1, w - 2, 7, lv(e >= 6 ? m.wood : C('#a07a4a'), 4.4)); for (let x = 1; x < w - 1; x += 7) p.vline(x, 8, fl - 1, lv(C('#a07a4a'), 1.6));
  drawText(p, 'LP', w / 2 - 3, fl - 6, BLACK);
}
/** Banqueta de piano estofada (pés da época). */
function pianobench(d: Dc): void {
  const { p, m, w } = d;
  blk(p, 0, 1, w, 4, m.fab); p.hline(1, w - 2, 1, lv(m.fab, 4.4)); for (let x = 3; x < w - 2; x += 4) p.put(x, 3, lv(m.fab, 1.4)); blk(p, 1, 5, w - 2, 2, m.wood);
  legs({ ...d, s: d.e }, 1, w - 2, 7);
}
/** Cabideiro de pé com chapéu e casaco da época. */
function coatstand(d: Dc): void {
  const { p, m, w, h, e } = d, fl = h - 1, c = e >= 6 ? m.metal : e >= 4 ? C('#2a2a30') : m.wood;
  p.vline(w / 2, 2, fl - 2, c); p.vline(w / 2 - 1, 3, fl - 2, lv(c, 3.8)); p.disc(w / 2, 1.5, 1.4, c);
  for (const dx of [-1, 1]) { p.line(w / 2, 5, w / 2 + dx * 5, 2, c); p.line(w / 2, fl - 3, w / 2 + dx * 5, fl, c); }
  const hat = [C('#2a2a30'), C('#3a3a3a'), C('#7a5a3a'), C('#a8603a'), C('#e04898'), C('#2a3a6a'), C('#c8c4bc'), C('#4a4c56')][e];
  p.rect(0, 3, 4, 1, hat); p.rect(1, 1, 2, 2, hat);
  p.poly([[w - 4, 3], [w - 2, 3], [w, 18], [w - 6, 18]], [C('#4a3a30'), C('#2a2a3a'), C('#8a6a3a'), C('#a8862a'), C('#3ac0d0'), C('#3a4a3a'), C('#e8e4dc'), C('#2a2c34')][e]);
  if (e >= 3) p.poly([[1, 8], [3, 8], [4, 16], [0, 16]], C('#c83a32'));
}

// ---------------------------------------------------------------- itens específicos · quadros e parede

/** Cartaz de cabaré (nouveau): dançarina de cancã com saia em babados sobre amarelo, letreiro no alto. */
function cabaret(d: Dc): void {
  const { p, m, w, h } = d;
  p.rect(0, 0, w, h, C('#f0c850')); p.hline(0, w - 1, 0, lv(C('#f0c850'), 4.6)); p.rect(0, 0, w, 6, BLACK); p.hline(2, w - 3, 2, C('#f0c850')); p.hline(2, w - 7, 4, C('#e04848'));
  const cx = w / 2;
  p.disc(cx + 1, 10, 2, C('#f0d0b0')); p.rect(cx - 1, 8, 4, 1, BLACK); p.rect(cx, 12, 3, 4, BLACK);
  for (let i = 0; i < 4; i++) p.ellipse(cx + 1, 17 + i, 6 - i, 1.5, i % 2 ? W : C('#e04848'));
  p.line(cx + 2, 20, cx + 8, 12, C('#f0d0b0')); p.put(cx + 8, 11, BLACK); p.line(cx, 20, cx - 1, h - 5, C('#f0d0b0')); p.put(cx - 1, h - 4, BLACK);
  p.line(cx - 4, 14, cx - 7, 11, C('#f0d0b0'));
  for (let x = 1; x < w - 1; x += 3) p.put(x, h - 2, m.fab);
  p.rect(0, 0, 1, 1, C('#e8e0c8', 220)); p.rect(w - 1, 0, 1, 1, C('#e8e0c8', 220));
}
/** Cartaz de transatlântico (déco): casco preto e vermelho, chaminés, mar em faixas. */
function liner(d: Dc): void {
  const { p, m, w, h } = d;
  hungFrame(d, BLACK, 1, 3);
  for (let y = 4; y < h - 1; y++) p.hline(1, w - 2, y, mix(C('#e8c890'), C('#d87a4a'), (y - 4) / (h - 6)));
  for (let y = h - 9; y < h - 1; y++) p.hline(1, w - 2, y, (y % 2) ? C('#1a4a7a') : C('#2a5a8a'));
  p.poly([[2, h - 14], [w - 2, h - 18], [w - 3, h - 9], [3, h - 8]], BLACK); p.poly([[3, h - 10], [w - 3, h - 12], [w - 3, h - 9], [3, h - 8]], C('#c83a32'));
  for (let i = 0; i < 3; i++) { const x = 5 + i * 4; p.rect(x, h - 22 + i, 3, 7 - i, C('#c83a32')); p.rect(x, h - 22 + i, 3, 2, BLACK); }
  p.hline(4, w - 5, h - 15, W); p.rect(2, 5, w - 4, 3, m.fab2); p.hline(3, w - 5, 6, m.metal);
}
/** Gravura do horizonte da cidade: traço sépia em passe-partout, moldura preta fina. */
function skylineEtch(d: Dc): void {
  const { p, w, h } = d;
  const r = hungFrame(d, BLACK, 1, 3);
  p.rect(r.x, r.y, r.w, r.h, C('#efe6cc')); p.rect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, C('#e6d8b0'));
  const ink = C('#5a4030'); let x = r.x + 3;
  let i = 0;
  while (x < r.x + r.w - 3) { const bw = 2 + Math.floor(noise(i, 1, 221) * 3), bh = 3 + Math.floor(noise(i, 2, 221) * (r.h - 8)); p.vline(x, r.y + r.h - 3 - bh, r.y + r.h - 3, ink); p.hline(x, x + bw, r.y + r.h - 3 - bh, ink); if (i === 3) { p.vline(x + 1, r.y + 2, r.y + r.h - 4 - bh, ink); } x += bw; i++; }
  p.hline(r.x + 3, r.x + r.w - 4, r.y + r.h - 3, ink); p.hline(r.x + 3, w - 8, h - 2, C('#8a7050'));
}
/** Calendário de pin-up: ilustração em cima, grade de dias embaixo, preso num prego. */
function pinup(d: Dc): void {
  const { p, m, w, h } = d;
  p.put(w >> 1, 0, GREY); p.rect(0, 1, w, h - 1, W); p.rect(1, 2, w - 2, 12, C('#a8d8e8'));
  p.disc(w / 2, 5, 1.8, C('#f0c8a0')); p.rect(w / 2 - 2, 3, 4, 1, C('#e8c040')); p.poly([[w / 2 - 2, 7], [w / 2 + 2, 7], [w / 2 + 3, 12], [w / 2 - 3, 12]], m.acc); p.line(w / 2 + 2, 8, w / 2 + 5, 5, C('#f0c8a0')); p.line(w / 2 - 1, 12, w / 2 - 4, 13, C('#f0c8a0'));
  p.rect(1, 15, w - 2, 2, m.acc); for (let y = 18; y < h - 1; y += 2) for (let x = 2; x < w - 2; x += 2) p.put(x, y, x === 6 && y === 20 ? m.acc : GREY);
}
/** Painel de macramê: vareta de madeira e nós em losango com franja. */
function macrameWall(d: Dc): void {
  const { p, m, w, h } = d, rope = C('#e8dcc0');
  p.put(w >> 1, 0, GREY); p.line(w >> 1, 0, 2, 2, C('#4a3a30')); p.line(w >> 1, 0, w - 3, 2, C('#4a3a30'));
  blk(p, 0, 2, w, 2, m.wood);
  for (let x = 2; x < w - 1; x += 2) p.vline(x, 4, h - 8, rope);
  for (let k = 0; k < 4; k++) { const cy = 8 + k * 5, rr = 4 - Math.abs(k - 1.5); for (let dx = -rr; dx <= rr; dx++) p.put(w / 2 + dx, cy + Math.abs(dx) - rr, lv(rope, 2)); }
  for (let y = 6; y < h - 8; y += 4) p.hline(3, w - 4, y, lv(rope, 2.6));
  p.poly([[3, h - 8], [w - 3, h - 8], [w / 2, h - 1]], rope); for (let x = 4; x < w - 4; x += 2) p.line(x, h - 8, w / 2 + (x - w / 2) * 0.4, h - 2, lv(rope, 2.6));
  p.disc(w / 2, 12, 1.5, m.fab);
}
/** Tela de pôr do sol laranja: faixas de céu, sol, mar, sem moldura. */
function sunset(d: Dc): void {
  const { p, w, h } = d;
  hang(p, w >> 1, 4, w - 5, 3);
  for (let y = 3; y < h; y++) { const t = (y - 3) / (h - 3); p.hline(0, w - 1, y, t < 0.6 ? [C('#f0c060'), C('#f0a040'), C('#e07a30'), C('#c8501a')][Math.floor(t / 0.15)] : (y % 2 ? C('#7a3a1a') : C('#a84a1a'))); }
  p.disc(w / 2, 3 + (h - 3) * 0.6, 5, C('#fff0b0')); p.rect(0, 3 + Math.round((h - 3) * 0.6), w, h, 0);
  for (let y = 3 + Math.round((h - 3) * 0.6); y < h; y++) p.hline(0, w - 1, y, (y % 2 ? C('#7a3a1a') : C('#a84a1a')));
  for (let y = 3 + Math.round((h - 3) * 0.6) + 1; y < h; y += 2) p.hline(w / 2 - 3, w / 2 + 2, y, C('#f0c060'));
  p.line(3, 10, 6, 8, BLACK); p.line(6, 8, 9, 10, BLACK); p.vline(w - 1, 3, h - 1, C('#5a2a10'));
}
/** Quadro de néon (anos 80): palmeira e onda em tubo rosa e azul sobre placa preta. */
function neonArt(d: Dc): void {
  const { p, lit, w, h } = d;
  p.put(w >> 1, 0, GREY); blk(p, 0, 1, w, h - 1, C('#16161e'));
  const a = lit ? lv(C('#ff5ab0'), 5) : lv(C('#ff5ab0'), 2), b = lit ? lv(C('#3ac0d0'), 5) : lv(C('#3ac0d0'), 2);
  p.line(9, h - 3, 10, 6, a); p.line(10, 6, 4, 4, a); p.line(10, 6, 15, 3, a); p.line(10, 6, 6, 9, a); p.line(10, 6, 15, 8, a);
  for (let x = 16; x < w - 2; x++) p.put(x, h - 6 + Math.round(Math.sin(x * 0.7) * 2), b); p.disc(w - 6, 6, 3, 0); p.ring(w - 6, 6, 3, b);
  if (lit) { d.fx.rect(0, 1, w, h - 1, withAlpha(C('#ff5ab0'), 30)); }
}
/** Pôster de turnê de estádio: palco com luzes, multidão e datas. */
function tourPoster(d: Dc): void {
  const { p, m, w, h } = d;
  p.rect(0, 0, w, h, C('#14141e')); p.rect(0, 0, 2, 2, C('#e8e0c8', 220)); p.rect(w - 2, 0, 2, 2, C('#e8e0c8', 220));
  for (let i = 0; i < 4; i++) p.line(3 + i * 4, 3, w / 2, 14, withAlpha([C('#f0e040'), C('#3ac0d0'), C('#e04848'), W][i], 200));
  p.rect(2, 14, w - 4, 3, C('#3a3a48')); p.rect(w / 2 - 1, 11, 2, 3, W);
  for (let x = 1; x < w - 1; x++) p.put(x, 18 + (x % 2), C('#2a2a38'));
  p.rect(2, 21, w - 4, 2, m.acc); for (let y = 24; y < h - 1; y += 2) p.hline(3, 3 + ((y * 7) % (w - 8)) + 3, y, GREY);
}
/** Mural de flyers: vários papéis sobrepostos presos com fita e tachinha. */
function flyerWall(d: Dc): void {
  const { p, w, h } = d;
  const fl: [number, number, number, number, Col][] = [[0, 2, 11, 13, C('#f0e040')], [9, 0, 10, 12, W], [18, 3, 12, 14, C('#e04848')], [2, 12, 12, 11, C('#3ac0d0')], [13, 11, 10, 13, C('#d0ccc4')], [22, 14, 10, 10, C('#f0a0c8')]];
  fl.forEach(([x, y, fw, fh, c], i) => { const ww = Math.min(fw, w - x), hh = Math.min(fh, h - y); p.rect(x, y, ww, hh, c); p.hline(x, x + ww - 1, y, lv(c, 4.6)); p.rect(x + 2, y + 2, ww - 4, 3, BLACK); for (let yy = y + 7; yy < y + hh - 1; yy += 2) p.hline(x + 2, x + ww - 3 - (yy % 3), yy, lv(c, 1.4)); p.put(x + (ww >> 1), y, i % 2 ? RED : C('#3a6ac8')); });
}
/** Foto de palco em preto e branco: cantor no microfone sob o refletor, moldura da época. */
function photoBW(d: Dc): void {
  const { p, m, e } = d;
  const r = hungFrame(d, eraFrame(e, m), e === 0 ? 2 : 1);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const g = Math.max(0, 1 - Math.hypot(x - r.w / 2, y) / (r.h * 1.1)); p.put(r.x + x, r.y + y, mix(C('#1a1a1a'), e === 0 ? C('#d8c8a0') : C('#e8e8e8'), g * 0.8)); }
  const cx = r.x + r.w / 2;
  p.rect(cx - 2, r.y + r.h - 7, 4, 7, C('#101010')); p.disc(cx, r.y + r.h - 9, 1.6, C('#101010')); p.vline(cx + 3, r.y + r.h - 8, r.y + r.h - 1, C('#808080')); p.put(cx + 3, r.y + r.h - 9, C('#c0c0c0'));
}
/** Tela branca com um traço (minimalista). */
function canvasMin(d: Dc): void {
  const { p, m, w, h } = d;
  hang(p, w >> 1, 4, w - 5, 2);
  p.rect(0, 2, w, h - 2, C('#f6f4ee')); p.hline(0, w - 1, 2, W); p.vline(w - 1, 2, h - 1, lv(C('#f6f4ee'), 2));
  for (let x = 6; x < w - 6; x++) p.put(x, Math.round(h / 2 + Math.sin(x * 0.18) * 3), x % 7 === 0 ? lv(m.acc2, 2) : BLACK);
}
/** Placa de prêmio (disco de ouro / platina / bilhão de execuções) com moldura da época. */
function award(d: Dc, disc: Col, kind: 'lp' | 'plat' | 'stream'): void {
  const { p, m, e } = d;
  const fr = eraFrame(e, m), mat = [m.fab, C('#e6dac0'), W, C('#e8d8b0'), C('#2a2a32'), C('#2a3a6a'), W, C('#14141a')][e];
  const r = hungFrame(d, fr, 2);
  p.rect(r.x, r.y, r.w, r.h, mat);
  const cx = r.x + r.w / 2, cy = r.y + 7;
  if (kind === 'stream') { blk(p, cx - 4, r.y + 2, 8, 12, BLACK); p.rect(cx - 3, r.y + 3, 6, 9, C('#1a2a4a')); p.poly([[cx - 1, r.y + 5], [cx - 1, r.y + 10], [cx + 2, r.y + 7.5]], disc); drawText(p, '1B', cx - 3, r.y + r.h - 7, disc); }
  else { p.disc(cx, cy, 5, disc); for (let rr = 2; rr < 5; rr++) p.ring(cx, cy, rr + 0.3, lv(disc, 2.2)); p.disc(cx, cy, 1.6, kind === 'plat' ? C('#3a3a48') : RED); p.put(cx - 2, cy - 3, lv(disc, 5)); if (kind === 'plat') { p.disc(cx + 3, cy + 4, 2.2, lv(disc, 3)); p.disc(cx + 3, cy + 4, 0.6, mat); } }
  p.rect(cx - 4, r.y + r.h - 4, 8, 2, e >= 6 ? CHROME : GOLD); p.hline(cx - 3, cx + 2, r.y + r.h - 3, lv(GOLD, 1.6));
}
/** Moldura digital de capas: tela fina mostrando uma capa de disco, pé de apoio. */
function digitalFrame(d: Dc): void {
  const { p, m, lit, w, h } = d;
  p.put(w >> 1, 0, GREY); blk(p, 0, 1, w, h - 1, C('#e8e8ec')); p.rect(2, 3, w - 4, h - 5, lit ? C('#2a2040') : C('#121218'));
  if (lit) { for (let y = 4; y < h - 3; y++) for (let x = 3; x < w - 3; x++) p.put(x, y, mix(C('#e85a3a'), C('#3a2a8a'), (x + y) / (w + h))); p.disc(w / 2, h / 2 + 1, 3.5, C('#14141a')); p.disc(w / 2, h / 2 + 1, 1, C('#f0c040')); }
  p.put(w - 3, h - 2, lit ? m.acc : DGREY); glow(d, w / 2, h / 2, 9, C('#e85a3a'));
}
/** Painel de LED animado: matriz de pontos com ondas coloridas. */
function ledWall(d: Dc): void {
  const { p, m, lit, w, h } = d;
  p.put(4, 0, GREY); p.put(w - 5, 0, GREY); blk(p, 0, 1, w, h - 1, C('#0e0e14'));
  for (let y = 3; y < h - 2; y += 2) for (let x = 2; x < w - 2; x += 2) { const v = Math.sin(x * 0.3 + y * 0.2) + Math.cos(y * 0.5); p.put(x, y, lit ? (v > 0.6 ? m.acc : v > -0.2 ? C('#ff5ab0') : C('#3a2a6a')) : C('#24242e')); }
  glow(d, w / 2, h / 2, 14, m.acc);
}
/** Guitarra pendurada na parede (modelo da época) num suporte. */
function guitarWall(d: Dc): void {
  const { p, m, e, w, h } = d;
  const body = [C('#a8602a'), C('#c8803a'), C('#e8b048'), C('#c83a1a'), C('#1e1e24'), C('#2a8aa8'), C('#e8e4dc'), C('#7a3ac8')][e];
  p.rect(w / 2 - 2, 0, 4, 2, C('#3a3a42')); p.put(w / 2 - 2, 2, C('#3a3a42')); p.put(w / 2 + 1, 2, C('#3a3a42'));
  p.rect(w / 2 - 1, 1, 2, 4, e >= 4 ? BLACK : m.wood2); for (const y of [2, 4]) { p.put(w / 2 - 2, y, CHROME); p.put(w / 2 + 1, y, CHROME); }
  p.rect(w / 2 - 0.5, 5, 1, 13, C('#5a3a20')); p.vline(w / 2, 5, 17, lv(C('#5a3a20'), 3)); for (let y = 7; y < 17; y += 3) p.put(w / 2, y, CHROME);
  if (e >= 3 && e !== 6) { p.poly([[w / 2 - 4, 18], [w / 2 + 3, 17], [w / 2 + 5, 22], [w / 2 + 4, h - 2], [w / 2 - 5, h - 2], [w / 2 - 5, 24]], body); p.rect(w / 2 - 2, 23, 4, 1, CHROME); p.rect(w / 2 - 2, 26, 4, 1, CHROME); }
  else { p.ellipse(w / 2, 21, 3.5, 3.5, body); p.ellipse(w / 2, h - 7, 5.5, 5.5, body); p.disc(w / 2, 22, 1.4, BLACK); p.rect(w / 2 - 2, h - 6, 4, 1, BLACK); }
  p.put(w / 2 - 3, 20, lv(body, 5));
}
/** Mapa antigo emoldurado (moldura e cores da época). */
function worldMapF(d: Dc): void {
  const { p, m, e } = d;
  const r = hungFrame(d, eraFrame(e, m), 2);
  const sea = [C('#d8c08a'), C('#c8d8d0'), C('#5a8ac8'), C('#a8c8e0'), C('#4a8ae0'), C('#a8c0d0'), C('#e8e8e4'), C('#16243a')][e];
  const land = [C('#a87a48'), C('#d8b878'), C('#e8d890'), C('#c8a870'), C('#48b85c'), C('#d8c8a0'), C('#2a2a2e'), C('#2a8a9a')][e];
  p.rect(r.x, r.y, r.w, r.h, sea);
  const cont: [number, number, number, number][] = [[0.2, 0.32, 0.12, 0.17], [0.3, 0.68, 0.06, 0.17], [0.49, 0.28, 0.06, 0.1], [0.52, 0.6, 0.07, 0.18], [0.72, 0.32, 0.16, 0.16], [0.84, 0.74, 0.06, 0.08]];
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const u = (x + 0.5) / r.w, v = (y + 0.5) / r.h; if (cont.some(([cx, cy, rx, ry]) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 < 1 - noise(x, y, 231) * 0.35)) p.put(r.x + x, r.y + y, land); }
  if (e === 0) { p.disc(r.x + r.w - 4, r.y + r.h - 4, 2, lv(sea, 2)); p.vline(r.x + r.w - 4, r.y + r.h - 7, r.y + r.h - 2, lv(land, 1)); }
}
/** Foto autografada de ídolo: retrato da época com assinatura, moldura pequena com pé ou prego. */
function signedPhoto(d: Dc): void {
  const { p, m, e } = d;
  const r = hungFrame(d, eraFrame(e, m), 1);
  const bg = e <= 1 ? C('#d8c8a0') : e === 2 ? C('#c8c8c8') : [C('#e8a060'), C('#c8a8f0'), C('#a8c8e0'), C('#e8e4dc'), C('#3a4a6a')][e - 3];
  p.rect(r.x, r.y, r.w, r.h, bg);
  const tone = e <= 2 ? (c: Col) => mix(c, C('#8a7a5a'), 0.6) : (c: Col) => c;
  p.disc(r.x + r.w / 2, r.y + 5, 2.5, tone(C('#f0c8a0'))); p.rect(r.x + r.w / 2 - 3, r.y + 2, 6, 2, tone([C('#2a1a10'), C('#1a1a1a'), C('#3a2a1a'), C('#8a3a1e'), C('#dcb862'), C('#1a1a1a'), C('#6a4426'), C('#7fb8e8')][e]));
  p.rect(r.x + 2, r.y + 8, r.w - 4, r.h - 8, tone([C('#2a2a3a'), C('#3a3a3a'), C('#2c4a7e'), C('#d8692a'), C('#e070a8'), C('#2a2a30'), C('#e4dccb'), C('#5e3c26')][e]));
  for (let x = r.x + 2; x < r.x + r.w - 2; x++) p.put(x, r.y + r.h - 3 + Math.round(Math.sin(x * 1.3)), C('#1a2a6a'));
}
/** Capa de disco emoldurada (arte da capa da época). */
function coverFrame(d: Dc): void {
  const { p, m, e } = d;
  const r = hungFrame(d, eraFrame(e, m), 1);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const u = x / r.w, v = y / r.h;
    const c = e <= 2 ? (v < 0.6 ? C('#2a5a8a') : C('#e8e0c8')) : e === 3 ? [C('#e88a30'), C('#a8401a'), C('#f0c060')][Math.floor(Math.hypot(u - 0.5, v - 0.5) * 9) % 3] : e === 4 ? (u + v > 1 ? C('#e04898') : C('#1a1a3a')) : e === 5 ? (Math.abs(u - 0.5) < 0.2 ? C('#e8e8e8') : C('#5a5a5a')) : e === 6 ? C('#f2f0ea') : mix(C('#3a2a8a'), C('#5ae0ff'), u);
    p.put(r.x + x, r.y + y, c);
  }
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  if (e <= 2) { p.disc(cx, r.y + 4, 2, C('#f0c8a0')); drawText(p, 'LP', r.x + 2, r.y + r.h - 6, C('#c83a32')); }
  else if (e === 4) p.disc(cx + 2, cy - 2, 2.5, C('#f0e040'));
  else if (e === 6) p.disc(cx, cy, 2, BLACK);
  else if (e === 7) p.disc(cx, cy, 3, C('#14141a'));
}
/** Retrato de família: pais e criança, foto sépia em moldura oval (antigo) até foto colorida em moldura fina. */
function familyPortrait(d: Dc): void {
  const { p, m, e } = d;
  const r = hungFrame(d, eraFrame(e, m), e === 0 ? 3 : 2);
  const bg = e <= 1 ? C('#c8b090') : e === 2 ? C('#b8b8b0') : [C('#8ab0c8'), C('#c8a8d8'), C('#a8c8a0'), C('#e8e4dc'), C('#c8d8e8')][e - 3];
  p.rect(r.x, r.y, r.w, r.h, bg);
  const tone = e <= 2 ? (c: Col) => mix(c, C('#7a6a50'), 0.55) : (c: Col) => c;
  const person = (x: number, y: number, sc: number, cloth: Col, hair: Col) => { p.disc(x, y, 1.6 * sc, tone(SKIN0)); p.rect(x - 2 * sc, y - 1.8 * sc, 4 * sc, sc, tone(hair)); p.rect(x - 2.5 * sc, y + 2 * sc, 5 * sc, r.y + r.h - (y + 2 * sc), tone(cloth)); };
  person(r.x + r.w * 0.3, r.y + 6, 1, [C('#2a2a3a'), C('#3a3a3a'), C('#2c4a7e'), C('#7a4a24'), C('#e04898'), C('#2a2a30'), C('#6a7a6a'), C('#4c4e56')][e], C('#3a2a1a'));
  person(r.x + r.w * 0.7, r.y + 7, 1, [C('#5a2a3a'), C('#6a5a4a'), C('#c83a32'), C('#d8a030'), C('#3ac0d0'), C('#4a6a8a'), C('#e8e4dc'), C('#8a8c96')][e], C('#6a4426'));
  person(r.x + r.w * 0.5, r.y + r.h - 6, 0.8, C('#e8e0c8'), C('#8e3a1e'));
  if (e === 0) { p.rect(r.x, r.y, 2, 2, eraFrame(0, m)); p.rect(r.x + r.w - 2, r.y, 2, 2, eraFrame(0, m)); }
}
const SKIN0 = C('#f0c8a0');
/** Partitura emoldurada: pautas, notas e título. */
function sheetFrame(d: Dc): void {
  const { p, m, e } = d;
  const r = hungFrame(d, eraFrame(e, m), 1);
  p.rect(r.x, r.y, r.w, r.h, e <= 1 ? C('#ece0c0') : C('#f4f0e6'));
  p.hline(r.x + 2, r.x + r.w - 3, r.y + 2, BLACK);
  for (let k = 0; k < 3; k++) { const y0 = r.y + 5 + k * 5; for (let i = 0; i < 3; i++) p.hline(r.x + 1, r.x + r.w - 2, y0 + i, i === 1 ? lv(C('#9a9080'), 3) : C('#9a9080')); for (let x = r.x + 2; x < r.x + r.w - 2; x += 3) { const ny = y0 + ((x * 3 + k) % 3); p.put(x, ny, BLACK); p.vline(x + 1, ny - 2, ny, BLACK); } }
}

// ---------------------------------------------------------------- itens específicos · plantas e luminárias

/** Vaso afunilado na base. */
function potAt(p: Px, x: number, y: number, pw: number, yb: number, c: Col, taper = 1): void {
  p.poly([[x, y], [x + pw, y], [x + pw - taper, yb + 1], [x + taper, yb + 1]], c); p.hline(x, x + pw - 1, y, lv(c, 4.4)); p.vline(x + 1, y + 1, yb - 1, lv(c, 3.6)); p.hline(x + taper, x + pw - taper - 1, yb, lv(c, 1.2));
}
/** Samambaia no pedestal (nouveau): frondes em arco caindo sobre coluna de madeira torneada. */
function fern(d: Dc): void {
  const { p, m, w, h } = d, fl = h - 1;
  for (let i = 0; i < 7; i++) { const dir = i < 3 ? -1 : i > 3 ? 1 : 0, len = 6 + (i % 2) * 2; for (let k = 0; k < len; k++) { const x = w / 2 + dir * k * (0.6 + Math.abs(i - 3) * 0.15), y = 7 - k * (dir === 0 ? 0.9 : 0.4) + (dir ? (k * k) * 0.09 : 0); p.put(x, y, LEAF); if (k % 2) { p.put(x, y - 1, LEAF2); p.put(x + dir, y + 1, LEAF); } } }
  potAt(p, 4, 7, w - 8, 11, m.acc, 1); p.hline(4, w - 5, 9, m.metal);
  p.rect(w / 2 - 1, 12, 3, fl - 14, m.wood); p.rect(w / 2 - 2, 15, 5, 2, lv(m.wood, 1.6)); blk(p, w / 2 - 4, fl - 2, 9, 3, m.wood2);
}
/** Palmeira de vaso (déco): leques de folhas sobre vaso preto com faixas douradas. */
function palm(d: Dc): void {
  const { p, m, w, h } = d, fl = h - 1, py = fl - 9;
  p.vline(w / 2, 10, py, C('#6a5030')); p.vline(w / 2 + 1, 12, py, C('#8a6a40'));
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.48, ex = w / 2 + Math.cos(a) * 10, ey = 12 + Math.sin(a) * 10; p.line(w / 2, 12, ex, ey, LEAF); for (let k = 2; k < 9; k++) { const t = k / 9; p.put(w / 2 + (ex - w / 2) * t + (i < 3 ? -1 : 1), 12 + (ey - 12) * t + 1, LEAF2); } }
  blk(p, 3, py, w - 6, fl - py + 1, BLACK); p.hline(3, w - 4, py + 2, m.metal); p.hline(3, w - 4, py + 5, m.metal);
}
/** Orquídea em vaso da época. */
function orchid(d: Dc): void {
  const { p, e, w, h } = d, fl = h - 1;
  p.line(w / 2, 7, w / 2 - 1, 1, C('#4a5a2a')); p.line(w / 2 - 1, 1, w - 2, 2, C('#4a5a2a'));
  const fc = [C('#f0e0f0'), C('#f8f0f0'), C('#f0a0c8'), C('#d8a0e0'), C('#ff5ab0'), C('#f8f0f8'), W, C('#c8a0ff')][e];
  for (const [x, y] of [[w - 2, 2], [w / 2 + 1, 1], [w / 2 - 2, 3]] as const) { p.put(x, y, fc); p.put(x - 1, y, fc); p.put(x, y + 1, fc); p.put(x, y, lv(fc, 5)); }
  p.ellipse(w / 2 - 1, 7, 3, 1, LEAF);
  const pot = [C('#3a6ac8'), W, C('#f0d040'), C('#b8603a'), C('#e04898'), C('#c8d8e0'), C('#e8e6e0'), C('#2a2c34')][e];
  potAt(p, 1, 8, w - 2, fl, pot, e === 5 ? 0 : 1);
}
/** Clorofito pendurado (anos 70): corrente do teto, vaso de macramê e folhas caindo. */
function spider(d: Dc): void {
  const { p, w, h } = d, rope = C('#d8c8a0');
  p.rect(w / 2 - 2, 0, 4, 1, GREY); p.vline(w / 2, 1, 4, rope); p.line(w / 2, 4, 3, 9, rope); p.line(w / 2, 4, w - 4, 9, rope);
  blk(p, 3, 9, w - 6, 4, C('#a8401a')); p.line(3, 10, w - 4, 12, rope); p.line(3, 12, w - 4, 10, rope);
  for (let i = 0; i < 7; i++) { const x0 = 3 + i * ((w - 6) / 6), dir = x0 < w / 2 ? -1 : 1; p.line(x0, 9, x0 + dir * 3, 5 + (i % 2), C('#a8d070')); p.line(x0, 12, x0 + dir * 2, h - 2 - (i % 3), C('#7aa04a')); }
  p.put(1, h - 4, LEAF2); p.put(w - 2, h - 3, LEAF2);
}
/** Falsa-seringueira (anos 70): folhas ovais escuras e brilhantes em vaso de barro. */
function rubber(d: Dc): void {
  const { p, w, h } = d, fl = h - 1, py = fl - 8;
  p.vline(w / 2, 4, py, C('#5a3a2a'));
  for (let i = 0; i < 9; i++) { const y = 3 + i * 3, dir = i % 2 ? 1 : -1, x = w / 2 + dir * 4; p.line(w / 2, y + 2, x, y + 1, C('#5a3a2a')); p.ellipse(x, y, 3, 1.6, C('#1e4a2a')); p.put(x - dir, y - 1, C('#4a8a5a')); }
  potAt(p, 3, py, w - 6, fl, C('#b8603a'));
}
/** Bonsai em bandeja da época. */
function bonsai(d: Dc): void {
  const { p, e, w, h } = d, fl = h - 1;
  p.line(w / 2, fl - 2, w / 2 - 2, 4, C('#6a4a2a')); p.line(w / 2 - 2, 4, w / 2 + 3, 2, C('#6a4a2a'));
  foliage(p, w / 2 - 3, 3, 3, 1.8, 241, e === 3 ? C('#7a8a2a') : LEAF); foliage(p, w / 2 + 3, 2, 3, 1.6, 242, e === 3 ? C('#7a8a2a') : LEAF);
  const tray = [C('#3a6ac8'), BLACK, C('#4a8a6a'), C('#8a4a2a'), C('#e04898'), C('#5a4a3a'), C('#b8b4ac'), C('#2a2c34')][e];
  blk(p, 0, fl - 2, w, 3, tray); p.hline(1, w - 2, fl - 2, C('#6a5a3a'));
}
/** Trio de suculentas em potes de cimento (minimalista). */
function succulents(d: Dc): void {
  const { p, h } = d, fl = h - 1;
  for (let i = 0; i < 3; i++) { const x = 1 + i * 4.5; blk(p, x, fl - 3, 4, 4, [C('#b8b4ac'), W, C('#c8784a')][i]); p.ellipse(x + 2, fl - 4, 2, 1.5, [C('#8ab08a'), C('#6a9a7a'), C('#a8c08a')][i]); p.put(x + 2, fl - 6 + (i % 2), lv(C('#8ab08a'), 4)); }
}
/** Jardim vertical (casa inteligente): painel de plantas com moldura e irrigação. */
function greenWall(d: Dc): void {
  const { p, m, lit, w, h } = d;
  p.put(3, 0, GREY); p.put(w - 4, 0, GREY); blk(p, 0, 1, w, h - 1, C('#2a2c34'));
  for (let y = 3; y < h - 2; y += 4) for (let x = 2; x < w - 2; x += 4) foliage(p, x + 2, y + 2, 2.6, 2.4, 250 + x * 7 + y, [LEAF, C('#2a6a3a'), C('#5a8a2a')][(x + y) % 3], LEAF2);
  p.hline(1, w - 2, 1, lit ? lv(m.acc, 5) : lv(m.acc, 1.6)); for (let x = 4; x < w - 4; x += 8) p.put(x, 2, C('#6ab0f0')); glow(d, w / 2, 2, 8, m.acc);
}
/** Arandela a gás (nouveau): braço de latão na parede com chama em globo. */
function gasSconce(d: Dc): void {
  const { p, m, lit, w, h } = d;
  blk(p, 0, h - 6, 3, 6, m.metal); p.line(2, h - 3, w - 3, h - 5, m.metal); p.vline(w - 3, h - 5, h - 3, m.metal);
  p.ellipse(w - 3, h - 8, 2.5, 3, withAlpha(C('#f0e8d0'), 200)); p.put(w - 3, h - 8, lit ? C('#fff0a0') : C('#f0a040')); p.put(w - 3, h - 9, lit ? W : C('#e07a30'));
  p.hline(w - 5, w - 2, h - 11, m.metal); glow(d, w - 3, h - 8, 5, C('#ffd080'));
}
/** Luminária de banqueiro: cúpula verde de vidro, base de latão, puxador. */
function banker(d: Dc): void {
  const { p, m, lit, w, h } = d, fl = h - 1;
  p.ellipse(w / 2, 4, w / 2 - 0.5, 2.5, lit ? lv(C('#2a8a4a'), 4.4) : C('#2a7a4a')); p.hline(1, w - 2, 6, lit ? BULB : lv(C('#2a7a4a'), 1.6)); p.put(2, 3, lv(C('#2a7a4a'), 5));
  p.vline(w / 2, 7, fl - 2, m.metal); p.vline(w - 3, 6, 9, m.metal); p.put(w - 3, 10, m.metal);
  blk(p, 1, fl - 1, w - 2, 2, m.metal); glow(d, w / 2, 7, 6);
}
/** Luminária de arco (anos 50): base de mármore, arco cromado longo, cúpula em domo. */
function arcLamp(d: Dc): void {
  const { p, lit, w, h } = d, fl = h - 1;
  blk(p, 1, fl - 3, 7, 4, C('#e8e4d8')); p.put(3, fl - 2, C('#b8b4a8'));
  for (let t = 0; t <= 1; t += 0.01) { const x = 4 + (w - 9) * t, y = fl - 4 - Math.sin(t * Math.PI * 0.85) * (h - 10); p.put(x, y, CHROME); }
  const ex = 4 + (w - 9), ey = Math.round(fl - 4 - Math.sin(0.85 * Math.PI) * (h - 10));
  p.vline(ex, ey, ey + 4, CHROME); p.ellipse(ex, ey + 7, 5, 3, CHROME); p.hline(ex - 5, ex + 5, ey + 9, lit ? BULB : lv(CHROME, 1.6));
  if (lit) d.fx.poly([[ex - 5, ey + 10], [ex + 5, ey + 10], [ex + 9, h + 4], [ex - 9, h + 4]], withAlpha(BULB, 60));
}
/** Lâmpada de lava. */
function lava(d: Dc): void {
  const { p, m, lit, w, h } = d, fl = h - 1, cx = w / 2;
  p.poly([[cx - 1, 0], [cx + 1, 0], [w - 1, 8], [0, 8]], lit ? C('#f0a040') : C('#a8602a'));
  p.disc(cx - 0.5, 5, 1.2, lit ? C('#ff5a3a') : C('#8a2a1a')); p.disc(cx + 0.5, 2, 0.7, lit ? C('#ff5a3a') : C('#8a2a1a'));
  p.hline(cx - 1, cx, 0, m.metal); p.poly([[0, 8], [w, 8], [w - 1, fl + 1], [1, fl + 1]], m.metal); p.hline(0, w - 1, 9, lv(m.metal, 4));
  glow(d, cx, 4, 5, C('#ff7a3a'));
}
/** Abajur cogumelo (anos 70): cúpula redonda de plástico laranja. */
function mushroom(d: Dc): void {
  const { p, m, lit, w, h } = d, fl = h - 1;
  p.ellipse(w / 2, 4, w / 2 - 0.5, 4, lit ? lv(m.fab, 4.8) : m.fab); p.rect(0, 5, w, 4, 0);
  for (let y = 5; y < 8; y++) p.hline(1, w - 2, y, 0);
  p.hline(1, w - 2, 5, lit ? BULB : lv(m.fab, 1.6)); p.rect(w / 2 - 1, 6, 3, fl - 7, m.fab); p.ellipse(w / 2, fl, 3.5, 1, m.fab); glow(d, w / 2, 6, 6, C('#ffb060'));
}
/** Placa de néon "ON AIR" em caixa da época. */
function onAir(d: Dc): void {
  const { p, e, lit, w, h } = d;
  const box = [C('#4a2a1a'), BLACK, C('#c8ccd4'), C('#7a4a24'), C('#1a1a24'), C('#3a3a42'), W, C('#2a2c34')][e];
  p.put(3, 0, GREY); p.put(w - 4, 0, GREY); blk(p, 0, 1, w, h - 1, box); p.rect(1, 2, w - 2, h - 3, C('#14141a'));
  const nc = lit ? lv(C('#ff4a3a'), 5) : lv(C('#ff4a3a'), 1.8);
  drawText(p, 'ON', 2, 3, nc); drawText(p, 'AIR', 11, 3, nc); // espaço estreito: cabe na caixa
  if (lit) d.fx.rect(0, 1, w, h - 1, withAlpha(C('#ff4a3a'), 40));
}
/** Luminária articulada (desde 1932): braço de molas na cor da época. */
function tensor(d: Dc): void {
  const { p, e, lit, h } = d, fl = h - 1;
  const c = [BLACK, C('#2a2a2e'), C('#c83a32'), C('#e88a30'), C('#26262c'), C('#3a6ac8'), W, C('#d8dce4')][e];
  blk(p, 0, fl - 1, 6, 2, c); p.line(3, fl - 1, 2, 6, c); p.line(2, 6, 8, 2, c); p.line(3, fl - 3, 3, 8, lv(c, 3)); p.put(4, 9, CHROME);
  p.poly([[7, 1], [11, 3], [11, 6], [8, 5]], c); p.put(10, 6, lit ? BULB : DGREY); glow(d, 10, 7, 5, BULB);
}
/** Lanterna de papel de pé (anos 90): coluna de papel de arroz sobre pé de madeira. */
function paperLantern(d: Dc): void {
  const { p, m, lit, w, h } = d, fl = h - 1;
  blk(p, 1, 1, w - 2, fl - 4, lit ? C('#fff4dc') : C('#ece4d0')); for (let y = 4; y < fl - 4; y += 4) p.hline(1, w - 2, y, lv(C('#ece4d0'), 2.4));
  p.hline(1, w - 2, 1, m.wood); blk(p, 2, fl - 3, w - 4, 2, m.wood); p.vline(3, fl - 1, fl, m.wood); p.vline(w - 4, fl - 1, fl, m.wood); glow(d, w / 2, h / 2, 9);
}
/** Fita de LED colorida (parede). */
function ledStrip(d: Dc): void {
  const { p, lit, w, h } = d;
  p.rect(0, 1, w, 2, C('#e8e8ec')); for (let x = 1; x < w; x += 2) p.put(x, 1, lit ? [C('#ff5ab0'), C('#5ae0ff'), C('#a0ff6a'), C('#f0e040')][(x >> 1) % 4] : C('#8a8a92'));
  if (lit) d.fx.rect(0, 0, w, h, withAlpha(C('#ff9ae0'), 50));
}

// ---------------------------------------------------------------- itens específicos · som e aparelhos

const knob = (p: Px, x: number, y: number, c: Col = CHROME): void => { p.disc(x, y, 1.2, c); p.put(x - 1, y - 1, W); };
const grille = (p: Px, x: number, y: number, w: number, h: number, c: Col, step = 2): void => { for (let yy = y; yy < y + h; yy += step) p.hline(x, x + w - 1, yy, c); };
/** Gramofone de corneta (nouveau, compacto). */
function gramophone(d: Dc): void {
  const { p, m, w, h } = d, fl = h - 1;
  blk(p, 1, fl - 7, w - 2, 8, m.wood); p.hline(2, w - 3, fl - 5, m.metal); p.rect(w - 3, fl - 4, 2, 1, m.metal); p.ellipse(w / 2, fl - 8, w / 2 - 2, 0.8, BLACK);
  p.vline(w - 4, fl - 13, fl - 8, m.metal); p.line(w - 4, fl - 13, w / 2, fl - 17, m.metal);
  p.poly([[w / 2, fl - 16], [1, 0], [0, 9], [w / 2 + 1, fl - 15]], m.metal); p.ellipse(1, 4.5, 1.5, 4.5, lv(m.metal, 1.2)); p.line(3, 2, 7, 8, lv(m.metal, 5));
}
/** Caixa de música (nouveau): caixinha de madeira entalhada com cilindro à mostra. */
function musicBox(d: Dc): void {
  const { p, m, w, h } = d, fl = h - 1;
  blk(p, 0, fl - 4, w, 5, m.wood); p.hline(1, w - 2, fl - 2, m.metal); p.poly([[0, fl - 4], [2, 0], [w - 2, 0], [w, fl - 4]], lv(m.wood, 2.4)); p.rect(2, 1, w - 4, 2, m.fab);
  p.rect(2, fl - 3, w - 4, 1, CHROME); p.put(w - 1, fl - 2, m.metal);
}
/** Pianola: piano de armário com janela do rolo perfurado e pedais. */
function playerPiano(d: Dc): void {
  const { p, m, w, h } = d, fl = h - 1;
  blk(p, 1, 0, w - 2, 21, m.wood2); p.rect(5, 3, w - 10, 9, lv(m.wood2, 2.6)); p.rect(7, 4, w - 14, 7, PAPER); for (let y = 5; y < 11; y++) for (let x = 8; x < w - 8; x += 2) if (noise(x, y, 261) > 0.6) p.put(x, y, BLACK); p.vline(6, 4, 10, m.metal); p.vline(w - 7, 4, 10, m.metal);
  blk(p, 0, 20, w, 3, m.wood2); p.rect(2, 20, w - 4, 2, W); for (let i = 2; i < w - 2; i += 3) p.vline(i, 20, 20, BLACK);
  blk(p, 2, 23, w - 4, fl - 26, lv(m.wood2, 2)); p.rect(w / 2 - 4, fl - 3, 3, 1, m.metal); p.rect(w / 2 + 1, fl - 3, 3, 1, m.metal); legs({ ...d, s: 0 }, 2, w - 3, fl - 2);
}
/** Rádio capelinha (déco): arco de madeira, grade em vitral, botões. */
function cathedral(d: Dc): void {
  const { p, m, lit, w, h } = d, fl = h - 1;
  p.disc(w / 2, 6, w / 2 - 0.5, m.wood); blk(p, 0, 6, w, fl - 5, m.wood); p.disc(w / 2, 6, w / 2 - 2.5, C('#c8a878'));
  for (let x = 3; x < w - 3; x += 2) p.vline(x, 2, 9, m.wood); p.rect(2, 9, w - 4, 1, m.wood);
  p.rect(3, 11, w - 6, 2, lit ? C('#f0c060') : C('#a8803a')); knob(p, 3.5, fl - 1.5); knob(p, w - 3.5, fl - 1.5); glow(d, w / 2, 12, 4, C('#f0c060'));
}
/** TV de móvel dos anos 50: tela arredondada, antena, pés palito. */
function tv50(d: Dc): void {
  const { p, m, lit, w } = d;
  p.line(w / 2, 4, w / 2 - 5, 0, GREY); p.line(w / 2, 4, w / 2 + 5, 0, GREY);
  blk(p, 0, 4, w, 18, m.wood); p.rect(2, 6, w - 9, 14, C('#1a1a1a')); p.rect(3, 7, w - 11, 12, lit ? C('#c8d8d0') : C('#4a5a52')); p.put(3, 7, C('#1a1a1a')); p.put(w - 9, 7, C('#1a1a1a'));
  if (lit) { p.disc(w / 2 - 3, 12, 2, C('#7a8a82')); p.rect(w / 2 - 5, 14, 4, 4, C('#7a8a82')); }
  knob(p, w - 4, 9); knob(p, w - 4, 14); grille(p, w - 6, 17, 4, 3, lv(m.wood, 1.6), 1);
  legs({ ...d, s: 2 }, 2, w - 3, 22); glow(d, w / 2 - 3, 13, 9, C('#c8e0ff'));
}
/** Gravador de rolo doméstico: dois carretéis, cabeças, botões. */
function reelDeck(d: Dc): void {
  const { p, m, w, h } = d, fl = h - 1;
  blk(p, 0, 0, w, fl + 1, C('#c8ccd4')); p.rect(1, 1, w - 2, 12, C('#2a2a2e'));
  for (const x of [6, w - 6]) { p.disc(x, 6.5, 4.5, C('#8a8c94')); p.disc(x, 6.5, 3.5, C('#5a4a3a')); p.disc(x, 6.5, 1, CHROME); for (let i = 0; i < 3; i++) { const a = i * 2.1; p.put(x + Math.cos(a) * 2.5 - 0.5, 6.5 + Math.sin(a) * 2.5 - 0.5, C('#8a8c94')); } }
  p.line(6, 11, w - 6, 11, C('#5a4a3a')); p.rect(w / 2 - 2, 10, 4, 2, CHROME);
  for (let i = 0; i < 5; i++) p.rect(2 + i * 4, 15, 3, 2, i === 1 ? RED : m.wood2); p.rect(2, 19, 6, 2, C('#f0e0a0')); knob(p, w - 4, 19.5);
}
/** Rádio-gravador portátil (anos 80): duas caixas, fita no meio, alça. */
function boombox(d: Dc): void {
  const { p, m, w, h } = d, fl = h - 1;
  p.hline(3, w - 4, 0, CHROME); p.vline(3, 0, 2, CHROME); p.vline(w - 4, 0, 2, CHROME);
  blk(p, 0, 2, w, fl - 1, C('#2a2a30')); for (const x of [3.5, w - 3.5]) { p.disc(x, 6.5, 2.6, C('#4a4a52')); p.disc(x, 6.5, 1, BLACK); }
  p.rect(w / 2 - 3, 4, 6, 4, C('#5a4a3a')); p.disc(w / 2 - 1.5, 6, 0.8, BLACK); p.disc(w / 2 + 1.5, 6, 0.8, BLACK); p.hline(w / 2 - 3, w / 2 + 2, 3, m.fab);
}
/** TV de tubo com videocassete, num rack com fitas. */
function vcrTv(d: Dc): void {
  const { p, m, lit, w, h } = d, fl = h - 1;
  blk(p, 1, 0, w - 2, 14, C('#2a2a30')); p.rect(3, 2, w - 9, 10, lit ? C('#4a6ac8') : C('#1a2030')); if (lit) { p.rect(5, 4, 6, 2, C('#e04898')); p.hline(5, w - 9, 9, W); } knob(p, w - 3.5, 4, GREY); p.rect(w - 5, 8, 3, 3, BLACK);
  blk(p, 2, 14, w - 4, 3, BLACK); p.rect(4, 15, 8, 1, C('#3a3a42')); p.rect(w - 9, 15, 4, 1, lit ? C('#48c860') : DGREY);
  blk(p, 0, 17, w, fl - 16, m.wood2); for (let i = 0; i < 4; i++) p.rect(3 + i * 3, 19, 2, fl - 20, [BLACK, C('#e8e4dc'), BLACK, C('#c83a32')][i]);
  glow(d, w / 2 - 2, 7, 9, C('#6a8af0'));
}
/** Micro system de CD (anos 90): unidade central e duas caixinhas. */
function cdMicro(d: Dc): void {
  const { p, lit, w, h } = d, fl = h - 1;
  for (const x of [0, w - 5]) { blk(p, x, 1, 5, fl, C('#3a3a42')); p.disc(x + 2.5, 4, 1.3, BLACK); p.disc(x + 2.5, 7.5, 1.3, BLACK); }
  blk(p, 5, 2, w - 10, fl - 1, C('#8a8c94')); p.rect(6, 3, w - 12, 2, lit ? C('#80f0a0') : C('#2a4a3a')); p.ellipse(w / 2, 6.5, 3, 1, C('#c8ccd8')); p.put(w / 2, 7, BLACK); glow(d, w / 2, 4, 4, C('#80f0a0'));
}
/** Caixa de som de palco (desde 1968): gabinete da época com cone e corneta. */
function paSpeaker(d: Dc): void {
  const { p, e, w, h } = d, fl = h - 1;
  const box = [0, 0, 0, C('#3a2a1e'), C('#1e1e24'), C('#26262c'), C('#2a2a2e'), C('#1e2028')][Math.max(3, e)];
  blk(p, 0, 0, w, fl + 1, box); p.rect(2, 2, w - 4, 8, C('#141418')); p.poly([[4, 4], [w - 4, 4], [w / 2 + 2, 8], [w / 2 - 2, 8]], C('#3a3a42'));
  p.disc(w / 2, 19, w / 2 - 2.5, C('#3a3a42')); p.disc(w / 2, 19, w / 2 - 4.5, C('#2a2a30')); p.disc(w / 2, 19, 2, C('#4a4a52'));
  p.disc(w / 2, fl - 6, 2.5, C('#2a2a30'));
  for (const [x, y] of [[1, 1], [w - 2, 1], [1, fl - 1], [w - 2, fl - 1]] as const) p.put(x, y, CHROME);
  if (e >= 5) p.hline(2, w - 3, fl - 2, e === 7 ? C('#5ae0ff') : DGREY);
  if (e === 3) p.hline(2, w - 3, 11, C('#c0a060'));
}
/** TV de tela plana sobre rack fino. */
function flatTv(d: Dc): void {
  const { p, m, lit, w, h } = d, fl = h - 1;
  blk(p, 2, 0, w - 4, 15, C('#1a1a1e')); p.rect(3, 1, w - 6, 13, lit ? C('#2a4a7a') : C('#10121a')); if (lit) { p.rect(5, 3, 8, 6, C('#e8a040')); p.hline(15, w - 6, 5, W); p.hline(15, w - 9, 8, C('#c8ccd8')); }
  p.rect(w / 2 - 2, 15, 4, 2, C('#1a1a1e')); blk(p, 0, 17, w, fl - 16, m.wood); p.hline(1, w - 2, 19, lv(m.wood, 1.6)); glow(d, w / 2, 7, 12, C('#6a8af0'));
}
/** Alto-falante inteligente (cilindro com anel de luz). */
function smartSpeaker(d: Dc): void {
  const { p, m, lit, w, h } = d, fl = h - 1;
  blk(p, 0, 2, w, fl - 1, C('#4c4e56')); p.ellipse(w / 2, 2, w / 2 - 0.5, 1.2, lit ? lv(m.acc, 5) : C('#3a3c44'));
  for (let y = 4; y < fl - 1; y += 2) for (let x = 1 + (y % 4 === 0 ? 1 : 0); x < w - 1; x += 2) p.put(x, y, C('#3a3c46'));
  glow(d, w / 2, 2, 4, m.acc);
}
/** Toca-discos com Bluetooth (revival): base de madeira, prato, braço, luzinha azul. */
function vinylRevival(d: Dc): void {
  const { p, m, lit, w, h } = d, fl = h - 1;
  blk(p, 0, fl - 4, w, 5, m.wood); p.hline(1, w - 2, fl - 2, lv(m.wood, 1.6)); p.put(w - 3, fl - 2, lit ? C('#3a8aff') : DGREY);
  p.ellipse(w / 2 - 2, fl - 5, 6, 1.2, BLACK); p.put(w / 2 - 2, fl - 5, m.acc2); p.line(w - 3, fl - 6, w - 6, fl - 5, CHROME); p.vline(w - 3, fl - 7, fl - 5, CHROME);
  glow(d, w - 3, fl - 2, 2.5, C('#3a8aff'));
}
/** Projetor de holograma (2028+): base com lente e figura de luz sobre ela. */
function holo(d: Dc): void {
  const { p, m, lit, w, h } = d, fl = h - 1;
  blk(p, 1, fl - 5, w - 2, 6, C('#2a2c34')); p.ellipse(w / 2, fl - 5, w / 2 - 2, 1.2, lit ? lv(m.acc, 5) : C('#3a3c44'));
  const hc = lit ? withAlpha(lv(m.acc, 5), 170) : withAlpha(C('#4a6a7a'), 120);
  p.disc(w / 2, 5, 2, hc); p.rect(w / 2 - 2, 8, 4, 8, hc); p.line(w / 2 - 2, 9, w / 2 - 5, 13, hc); p.line(w / 2 + 2, 9, w / 2 + 5, 6, hc); p.rect(w / 2 - 2, 16, 1, 7, hc); p.rect(w / 2 + 1, 16, 1, 7, hc);
  if (lit) d.fx.poly([[w / 2 - 3, fl - 5], [w / 2 + 3, fl - 5], [w / 2 + 7, 1], [w / 2 - 7, 1]], withAlpha(m.acc, 40));
}
/** Máquina de karaokê (desde 1985): caixa da época com tela, microfone pendurado. */
function karaoke(d: Dc): void {
  const { p, e, lit, w, h } = d, fl = h - 1;
  const body = [0, 0, 0, 0, C('#2a2a3a'), C('#3a3a42'), C('#e8e8ec'), C('#2a2c34')][Math.max(4, e)];
  blk(p, 0, 6, w, fl - 5, body); p.rect(2, 8, w - 4, 6, lit ? C('#3a5ac8') : C('#14141a')); if (lit) { p.hline(3, w - 4, 10, C('#f0e040')); p.hline(3, w - 7, 12, W); }
  p.disc(w / 2, 19, 3, C('#141418')); p.disc(w / 2, 19, 1.2, C('#4a4a52')); for (let i = 0; i < 3; i++) p.put(3 + i * 2, fl - 2, lit ? [C('#e04848'), C('#48c860'), C('#f0e040')][i] : DGREY);
  blk(p, w - 4, 1, 3, 5, C('#2a2a30')); p.ellipse(w - 2.5, 1, 1.5, 1.2, GREY); p.line(w - 3, 6, w - 1, 9, BLACK);
  glow(d, w / 2, 11, 7, C('#6a8af0'));
}

// ---------------------------------------------------------------- itens específicos · coleção e enfeites

/** Relógio de pêndulo (nouveau): caixa alta com mostrador, pêndulo de latão atrás do vidro. */
function grandfather(d: Dc): void {
  const { p, m, w, h } = d, fl = h - 1;
  p.poly([[0, 3], [w / 2, 0], [w, 3]], m.wood2); blk(p, 0, 3, w, 11, m.wood); p.disc(w / 2, 8.5, 4, PAPER); p.ring(w / 2, 8.5, 4.2, m.metal); p.line(w / 2, 8, w / 2, 6, BLACK); p.line(w / 2, 8, w / 2 + 2, 9, BLACK);
  blk(p, 2, 14, w - 4, fl - 18, m.wood); p.rect(4, 16, w - 8, fl - 24, lv(m.wood, 0.8)); p.rect(4, 16, w - 8, fl - 24, withAlpha(m.glass, 70)); p.vline(w / 2, 16, fl - 12, m.metal); p.disc(w / 2, fl - 11, 1.8, m.metal);
  blk(p, 0, fl - 4, w, 5, m.wood2);
}
/** Metrônomo de madeira (cor da época). */
function metronome(d: Dc): void {
  const { p, m, e, w, h } = d, fl = h - 1;
  const c = [m.wood, BLACK, C('#c48a52'), C('#7a4a24'), C('#c83a32'), C('#3a3a42'), W, C('#2a2c34')][e];
  p.poly([[w / 2 - 1, 0], [w / 2, 0], [w - 1, fl + 1], [0, fl + 1]], c); p.line(w / 2, fl - 2, w / 2 + 1, 1, CHROME); p.put(w / 2 + 1, 4, GOLD); p.rect(1, fl - 1, w - 2, 1, lv(c, 2.6));
}
/** Estatueta de bailarina em bronze (déco) em pedestal de mármore. */
function decoStatue(d: Dc): void {
  const { p, w, h } = d, fl = h - 1, br = C('#a8783a');
  p.disc(w / 2, 1.5, 1.2, br); p.line(w / 2, 3, w / 2, 8, br); p.line(w / 2, 4, 0, 1, br); p.line(w / 2, 4, w - 1, 2, br); p.line(w / 2, 8, w / 2 - 2, 12, br); p.line(w / 2, 8, w - 1, 9, br);
  p.poly([[w / 2 - 1, 5], [w / 2 + 1, 5], [w / 2 + 2, 8], [w / 2 - 2, 8]], lv(br, 3)); blk(p, 0, 12, w, fl - 11, C('#2a2a30')); p.hline(0, w - 1, 12, C('#e8e4d8'));
}
/** Coqueteleira e taças (déco) numa bandeja. */
function cocktail(d: Dc): void {
  const { p, m, w, h } = d, fl = h - 1;
  blk(p, 0, fl - 1, w, 2, m.metal); blk(p, 2, 1, 4, fl - 2, CHROME); p.rect(3, 0, 2, 1, CHROME); p.hline(2, 5, 3, lv(CHROME, 1.6));
  for (const x of [8, 11]) { p.poly([[x - 1.5, 3], [x + 1.5, 3], [x, 6]], withAlpha(m.glass, 220)); p.vline(x, 6, fl - 2, CHROME); p.hline(x - 1, x + 1, fl - 2, CHROME); p.put(x, 4, C('#e04848')); }
}
/** Aquário de mesa (anos 50): tanque com tampa e base, peixes e plantas. */
function tankSmall(d: Dc): void {
  const { p, m, lit, w, h } = d, fl = h - 1, water = lit ? C('#6ad0f0') : C('#3a8ab8');
  blk(p, 0, 0, w, 2, m.wood); p.rect(1, 2, w - 2, fl - 5, water); p.vline(0, 2, fl - 3, lv(m.wood, 2)); p.vline(w - 1, 2, fl - 3, lv(m.wood, 2));
  p.hline(1, w - 2, fl - 4, C('#d8c088')); foliage(p, 4, fl - 7, 1.8, 3, 271); foliage(p, w - 5, fl - 6, 1.8, 2.5, 272);
  p.rect(8, 6, 3, 2, C('#f08a30')); p.put(11, 6, lv(C('#f08a30'), 2)); p.rect(w - 11, 9, 3, 2, C('#e04848')); p.put(w - 12, 9, lv(C('#e04848'), 2));
  blk(p, 0, fl - 2, w, 3, m.wood); p.put(w - 3, fl - 1, m.acc2); glow(d, w / 2, fl / 2, 11, C('#9ae0ff'));
}
/** Miniatura de jukebox. */
function jukeboxMini(d: Dc): void {
  const { p, m, lit, w, h } = d, fl = h - 1;
  p.disc(w / 2, 3, w / 2 - 0.5, CHROME); blk(p, 0, 3, w, fl - 2, m.wood); p.disc(w / 2, 3, w / 2 - 1.5, lit ? lv(m.acc, 4.6) : m.acc); p.rect(1, 5, w - 2, 2, m.acc2); p.hline(1, w - 2, fl - 2, CHROME);
}
/** Globo espelhado (do teto, na corrente). */
function discoBall(d: Dc): void {
  const { p, lit, w, h } = d;
  p.rect(w / 2 - 1, 0, 2, 1, GREY); p.vline(w / 2, 1, 2, GREY);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dd = Math.hypot(x + 0.5 - w / 2, y + 0.5 - (h / 2 + 1.5)); if (dd > w / 2 - 1.5) continue; p.put(x, y, (x + y) % 2 ? C('#c8ccd8') : (x - y + 20) % 3 ? C('#8a8c96') : W); }
  if (lit) for (const [x, y] of [[w / 2 - 3, h / 2], [w / 2 + 2, h / 2 + 3]] as const) d.fx.disc(x, y, 1.5, withAlpha(W, 200));
}
/** Cubo mágico. */
function rubik(d: Dc): void {
  const { p } = d;
  const c = [C('#e04848'), C('#f0e040'), C('#48a8e0'), C('#48c860'), C('#f08a30'), W];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) p.put(x, y, c[(x * 3 + y * 5) % 6]);
}
/** Parede de fitas cassete. */
function cassetteWall(d: Dc): void {
  const { p, w } = d;
  p.put(3, 0, GREY); p.put(w - 4, 0, GREY);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * 7 + 1, y = r * 5 + 1, col = [C('#2a2a30'), C('#e8e4dc'), C('#c83a32'), C('#3a6ac8'), C('#f0e040')][(r * 4 + c) % 5]; p.rect(x, y, 7, 4, col); p.rect(x + 1, y + 1, 5, 1, col === C('#e8e4dc') ? C('#3a6ac8') : W); p.put(x + 2, y + 2, BLACK); p.put(x + 4, y + 2, BLACK); }
}
/** Videogame na estante: console e controle com fio. */
function gameConsole(d: Dc): void {
  const { p, lit, h } = d, fl = h - 1;
  blk(p, 0, 1, 8, fl, C('#2a2a30')); p.hline(1, 6, 2, C('#6a4a2a')); p.rect(1, 4, 2, 1, lit ? C('#ff4a3a') : DGREY);
  p.rect(9, fl - 1, 3, 2, C('#2a2a30')); p.put(10, fl - 2, RED); p.line(8, fl - 1, 9, fl, BLACK);
}
/** Prateleira de bonecos colecionáveis. */
function figures(d: Dc): void {
  const { p, m, w, h } = d;
  blk(p, 0, h - 2, w, 2, m.wood); for (const x of [2, w - 4]) p.rect(x, h, 2, 1, GREY);
  for (let i = 0; i < 6; i++) { const x = 2 + i * 4, c = [C('#e04848'), C('#3a6ac8'), C('#48c860'), C('#f0e040'), C('#8a4ab0'), C('#e88a30')][i]; p.rect(x, h - 7, 3, 5, c); p.rect(x, h - 9, 3, 2, C('#f0c8a0')); p.put(x + 1, h - 10, i % 2 ? BLACK : C('#dcb862')); if (i % 3 === 0) p.put(x + 3, h - 6, CHROME); }
}
/** Cristaleira de troféus (desde 1900): armário de vidro da época com taças e medalhas. */
function trophyCase(d: Dc): void {
  const { p, m, e, w, h } = d, fl = h - 1;
  const fr = [m.wood, BLACK, m.wood, m.wood, C('#2a2a30'), m.wood, W, C('#2a2c34')][e];
  blk(p, 0, 0, w, fl + 1, fr); p.rect(2, 2, w - 4, fl - 9, lv(fr, 0.8));
  for (const y of [12, 22]) p.hline(2, w - 3, y, withAlpha(m.glass, 220));
  for (let i = 0; i < 3; i++) { const x = 5 + i * 7; p.poly([[x - 2, 6], [x + 2, 6], [x + 1, 9], [x - 1, 9]], GOLD); p.vline(x, 9, 11, GOLD); p.hline(x - 1, x + 1, 11, lv(GOLD, 1.6)); p.ring(x - 2.5, 7, 1, GOLD); }
  for (let i = 0; i < 3; i++) { p.disc(5 + i * 7, 18, 2, [GOLD, CHROME, C('#c8783a')][i]); p.vline(5 + i * 7, 14, 16, C('#3a6ac8')); }
  p.rect(4, 26, w - 8, 3, C('#e6dac0')); p.rect(2, 2, w - 4, fl - 9, withAlpha(m.glass, 60)); p.line(4, 3, 9, 12, withAlpha(W, 120));
  blk(p, 0, fl - 6, w, 7, lv(fr, 2.4)); p.put(w / 2, fl - 3, m.metal);
  if (e === 7) p.hline(2, w - 3, 2, C('#5ae0ff'));
}
/** Pele de bumbo autografada na parede. */
function drumhead(d: Dc): void {
  const { p, e, w, h } = d;
  p.put(w / 2, 0, GREY); p.vline(w / 2, 1, 1, C('#4a3a30'));
  const rim = [0, 0, C('#c8c8c8'), C('#c8402a'), C('#1e1e24'), C('#2a5a9a'), C('#e8e4dc'), C('#7a3ac8')][Math.max(2, e)];
  p.disc(w / 2, h / 2 + 1, w / 2 - 0.5, rim); p.disc(w / 2, h / 2 + 1, w / 2 - 2, C('#f4f0e6'));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; p.put(w / 2 + Math.cos(a) * (w / 2 - 1) - 0.5, h / 2 + 1 + Math.sin(a) * (w / 2 - 1) - 0.5, CHROME); }
  drawText(p, 'XO', w / 2 - 3, h / 2 - 2, C('#c83a32')); for (let x = 4; x < w - 4; x++) p.put(x, h / 2 + 4 + Math.round(Math.sin(x * 1.1)), C('#1a2a6a'));
}
/** Setlist de show histórico emoldurado (papel com fita e lista). */
function setlist(d: Dc): void {
  const { p, m, e } = d;
  const r = hungFrame(d, eraFrame(e, m), 1);
  p.rect(r.x, r.y, r.w, r.h, C('#f4f0e6')); p.rect(r.x + r.w / 2 - 1, r.y, 3, 1, C('#d8d0b0', 220));
  for (let i = 0; i < 6; i++) p.hline(r.x + 1, r.x + r.w - 2 - (i * 3) % 4, r.y + 2 + i * 2, i === 0 ? C('#c83a32') : BLACK);
}
/** Vaso de cerâmica fosca (minimalista). */
function ceramicMin(d: Dc): void {
  const { p, w, h } = d, fl = h - 1, c = C('#d8d0c4');
  p.poly([[w / 2 - 1, 0], [w / 2 + 1, 0], [w / 2 + 1, 3], [w - 1, 8], [w - 2, fl + 1], [1, fl + 1], [0, 8], [w / 2 - 1, 3]], c); p.vline(1, 8, fl - 1, lv(c, 3.6)); p.hline(1, w - 2, fl, lv(c, 1.4));
  p.line(w / 2, 0, w / 2 + 2, -0, C('#5a4a3a'));
}
/** Aspirador robô. */
function robotVac(d: Dc): void {
  const { p, m, lit, w, h } = d, fl = h - 1;
  p.ellipse(w / 2, fl - 1, w / 2 - 0.5, 1.5, C('#2a2c34')); p.hline(1, w - 2, fl - 2, C('#4a4c56')); p.put(w / 2, fl - 2, lit ? m.acc : DGREY); p.hline(2, w - 3, fl, BLACK);
}
/** Drone de filmagem na base. */
function droneCam(d: Dc): void {
  const { p, lit, w, h } = d, fl = h - 1;
  blk(p, 1, fl - 1, w - 2, 2, C('#2a2c34')); p.rect(3, fl - 3, w - 6, 2, C('#e8e8ec')); p.put(w / 2, fl - 2, lit ? C('#48c860') : DGREY);
  p.line(1, fl - 4, 3, fl - 3, C('#e8e8ec')); p.line(w - 2, fl - 4, w - 4, fl - 3, C('#e8e8ec')); p.hline(0, 2, fl - 5, GREY); p.hline(w - 3, w - 1, fl - 5, GREY); p.put(w / 2, fl - 1, BLACK);
}
/** Lareira (sem época): moldura da época, fogo aceso, lenha, cornija com enfeites. */
function fireplace(d: Dc): void {
  const { p, m, e, lit, w, h } = d, fl = h - 1;
  const st = [C('#e8e4d8'), BLACK, C('#c8603a'), C('#8a6a4a'), C('#e8e4ec'), C('#b8603a'), C('#e8e6e0'), C('#2a2c34')][e];
  blk(p, 0, 4, w, 3, e === 1 ? m.metal : lv(st, 2.6)); p.hline(0, w - 1, 6, lv(st, 1.4));
  blk(p, 1, 7, w - 2, fl - 6, st);
  if (e === 2 || e === 5) for (let y = 8; y < fl; y += 2) for (let x = 1 + ((y >> 1) % 2) * 2; x < w - 1; x += 4) p.put(x, y, lv(st, 1.6));
  if (e === 1) for (let i = 0; i < 5; i++) p.line(w / 2, fl - 2, 4 + i * ((w - 8) / 4), 8, lv(m.metal, 2));
  const ox = 6, ow = w - 12, oy = 11;
  p.rect(ox, oy, ow, fl - oy, C('#1a1210')); if (e !== 7) p.poly([[ox, oy], [ox + ow, oy], [ox + ow - 2, oy - 2], [ox + 2, oy - 2]], C('#1a1210'));
  blk(p, ox + 3, fl - 2, ow - 6, 2, C('#6a4a2a')); p.line(ox + 4, fl - 3, ox + ow - 5, fl - 4, C('#5a3a20'));
  const fire = lit || e === 7 ? 1 : 0.5;
  p.poly([[ox + 5, fl - 3], [ox + ow / 2, fl - 3 - 9 * fire], [ox + ow - 5, fl - 3]], C('#e0602a')); p.poly([[ox + 8, fl - 3], [ox + ow / 2 + 1, fl - 3 - 6 * fire], [ox + ow - 8, fl - 3]], C('#f0c040'));
  if (e === 7) { p.rect(ox, oy, ow, 1, C('#5ae0ff')); }
  p.rect(4, 1, 2, 3, GOLD); p.put(5, 0, C('#fff0a0')); blk(p, w - 9, 0, 5, 4, eraFrame(e, m)); p.rect(w - 8, 1, 3, 2, C('#a8c8e0')); p.rect(w / 2 - 1, 2, 3, 2, C('#c83a32'));
  glow(d, w / 2, fl - 6, 9, C('#ffa040'));
}
/** Piano de cauda de sala (sem época): visto de lado, laca e pés da época, tampa aberta. */
function grandPiano(d: Dc): void {
  const { p, m, e, w, h } = d, fl = h - 1;
  const c = [C('#3a2018'), BLACK, BLACK, C('#5a3418'), BLACK, C('#2a2a30'), W, BLACK][e];
  p.line(5, 12, w - 6, 1, lv(c, 3)); p.line(5, 13, w - 6, 2, c); p.vline(w - 6, 2, 13, lv(c, 2)); p.line(7, 13, w - 7, 4, lv(c, 2.2));
  blk(p, 0, 13, w, 7, c); p.hline(1, w - 2, 14, e === 6 ? CHROME : m.metal); p.rect(1, 15, 12, 2, W); for (let x = 2; x < 13; x += 2) p.put(x, 15, BLACK);
  p.rect(14, 8, 6, 5, PAPER); p.vline(17, 8, 12, lv(PAPER, 2));
  for (const x of [2, w / 2, w - 4]) { p.vline(x, 20, fl - 1, c); p.vline(x + 1, 20, fl - 1, lv(c, 2)); p.put(x, fl, m.metal); p.put(x + 1, fl, m.metal); }
  p.line(14, 20, 15, fl - 4, m.metal); p.rect(12, fl - 4, 6, 1, m.metal);
}
/** Castiçal de prata (velas acesas). */
function candles(d: Dc): void {
  const { p, e, lit, w, h } = d, fl = h - 1, ag = [C('#d8dce4'), C('#c0c4cc'), C('#e0b048'), C('#c09048'), C('#2a2a30'), C('#a8acb4'), C('#2a2a2e'), C('#e8e8ec')][e], wax = [W, C('#f4ecd8'), C('#f0a0a8'), C('#d8782a'), C('#e04898'), C('#c83a32'), C('#e8e4dc'), C('#c8d8f0')][e];
  blk(p, 2, fl - 1, w - 4, 2, ag); p.vline(w / 2, 7, fl - 1, ag); p.line(w / 2, 9, 1, 7, ag); p.line(w / 2, 9, w - 2, 7, ag);
  for (const x of [1, w / 2, w - 2]) { p.rect(x, 3, 1, 4, wax); p.put(x, 2, lit ? C('#fff0a0') : C('#f0a040')); p.put(x, 7, ag); }
  if (lit) for (const x of [1, w / 2, w - 2]) d.fx.disc(x + 0.5, 2, 2.5, withAlpha(C('#ffd080'), 90));
}

// ---------------------------------------------------------------- itens específicos · teto

/** Pendente a gás de latão (nouveau): haste, braço com globo de vidro e chama. */
function gasPendant(d: Dc): void {
  const { p, m, lit, w, h } = d;
  p.rect(w / 2 - 2, 0, 4, 1, m.metal); p.vline(w / 2, 1, 6, m.metal); p.hline(1, w - 2, 6, m.metal);
  for (const x of [2, w - 3]) { p.vline(x, 6, 8, m.metal); p.ellipse(x, 10.5, 2, 2.5, withAlpha(C('#f0e8d0'), 210)); p.put(x, 11, lit ? C('#fff0a0') : C('#f0a040')); if (lit) d.fx.disc(x + 0.5, 11, 3, withAlpha(C('#ffd080'), 90)); }
  p.disc(w / 2, 7.5, 1.3, m.metal); p.put(w / 2, h - 1, m.metal); p.vline(w / 2, 8, h - 2, m.metal);
}
/** Plafon de vidro jateado (déco): prato raso preso ao teto com aro de latão escalonado. */
function decoDish(d: Dc): void {
  const { p, m, lit, w, h } = d;
  p.rect(w / 2 - 3, 0, 6, 2, m.metal); p.hline(w / 2 - 5, w / 2 + 4, 2, m.metal);
  p.ellipse(w / 2, 3, w / 2 - 0.5, h - 4, lit ? C('#fff4dc') : C('#e8e0d0')); p.rect(0, 0, w, 3, 0);
  for (let i = 0; i < 3; i++) p.hline(3 + i * 2, w - 4 - i * 2, 4 + i, lv(C('#e8e0d0'), 2.4));
  p.hline(1, w - 2, 3, m.metal); glow(d, w / 2, h - 2, 8);
}
/** Calha fluorescente (sem época): luminária de tubo, corpo da época. */
function fluorescent(d: Dc): void {
  const { p, e, lit, w, h } = d;
  const c = [C('#8a8478'), C('#6a7a6a'), C('#c8ccd4'), C('#d8c8a0'), C('#e8e8ec'), C('#a8acb4'), W, C('#2a2c34')][e];
  p.put(3, 0, GREY); p.put(w - 4, 0, GREY); blk(p, 0, 1, w, 2, c); p.hline(1, w - 2, h - 1, lit ? C('#f0fff8') : C('#c8d0cc'));
  if (lit) d.fx.rect(0, h - 1, w, 3, withAlpha(C('#e8fff0'), 90));
}
/** Refletores de palco coloridos (sem época): barra com latas PAR e gelatinas. */
function stagePar(d: Dc): void {
  const { p, e, lit, w } = d;
  p.put(4, 0, GREY); p.put(w - 5, 0, GREY); p.hline(0, w - 1, 1, C('#3a3a42')); p.hline(0, w - 1, 2, C('#2a2a30'));
  const cols = [C('#e04848'), C('#3a8af0'), C('#f0c040'), C('#48c860'), C('#ff5ab0')];
  const n = e >= 4 ? 5 : 4;
  for (let i = 0; i < n; i++) { const x = 2 + i * ((w - 6) / (n - 1)); p.vline(x + 1, 3, 3, C('#3a3a42')); blk(p, x - 1, 4, 5, 5, [C('#3a3a3a'), C('#3a3a3a'), C('#5a5a62'), C('#3a2a20'), C('#2a2a30'), C('#4a4a52'), BLACK, C('#d8dce4')][e]); p.hline(x, x + 2, 8, lit ? lv(cols[i], 5) : lv(cols[i], 1.8)); if (lit) d.fx.poly([[x - 1, 9], [x + 4, 9], [x + 7, 16], [x - 4, 16]], withAlpha(cols[i], 70)); }
}
/** Trilho de spots (anos 80, compacto). */
function track(d: Dc): void {
  const { p, lit, w } = d;
  p.rect(0, 0, w, 2, BLACK); p.hline(0, w - 1, 0, C('#3a3a42'));
  for (const x of [4, 12, 20, 28]) { p.vline(x, 2, 2, BLACK); p.poly([[x - 1, 3], [x + 2, 3], [x + 3, 6], [x - 1, 6]], x === 12 ? C('#e04898') : C('#2a2a30')); p.put(x + 1, 6, lit ? BULB : DGREY); if (lit) d.fx.poly([[x - 1, 6], [x + 3, 6], [x + 6, 14], [x - 3, 14]], withAlpha(BULB, 60)); }
}
/** Pendentes industriais (anos 90): cúpulas de metal em fio. */
function industrial(d: Dc): void {
  const { p, lit, w } = d;
  for (const [x, len] of [[5, 6], [w / 2, 3], [w - 6, 6]] as const) { p.rect(x - 1, 0, 3, 1, C('#3a3a42')); p.vline(x, 1, len, BLACK); p.poly([[x - 4, len + 6], [x + 5, len + 6], [x + 2, len + 1], [x - 1, len + 1]], C('#4a5a5a')); p.hline(x - 4, x + 4, len + 6, lv(C('#4a5a5a'), 1.4)); p.put(x, len + 7, lit ? C('#ffc040') : C('#8a6a2a')); if (lit) d.fx.poly([[x - 4, len + 7], [x + 5, len + 7], [x + 8, len + 14], [x - 7, len + 14]], withAlpha(C('#ffd080'), 60)); }
}
/** Painel de LED embutido (minimalista). */
function ledPanel(d: Dc): void {
  const { p, lit, w, h } = d;
  p.rect(0, 0, w, h, W); p.hline(0, w - 1, h - 1, C('#c8ccd4')); p.rect(2, 1, w - 4, h - 2, lit ? C('#f8fcff') : C('#e0e4e8'));
  if (lit) d.fx.rect(0, h, w, 3, withAlpha(C('#f0f8ff'), 80));
}
/** Teto de luz que acompanha o dia (smart): painel com degradê do céu. */
function smartCeiling(d: Dc): void {
  const { p, m, lit, w, h } = d;
  p.rect(0, 0, w, h, C('#e8eaee'));
  for (let x = 1; x < w - 1; x++) p.vline(x, 1, h - 2, lit ? mix(C('#ffd0a0'), C('#a0d0ff'), x / w) : mix(C('#b8b0a8'), C('#a8b0b8'), x / w));
  p.put(w - 2, 0, lit ? m.acc : DGREY); if (lit) d.fx.rect(0, h, w, 3, withAlpha(C('#ffe8d0'), 70));
}
/** Canhão de laser (anos 80): caixa presa no teto, feixes verdes. */
function laser(d: Dc): void {
  const { p, lit, w, h } = d;
  p.rect(w / 2 - 3, 0, 6, 1, GREY); blk(p, 2, 1, w - 4, 5, C('#26262c')); p.rect(w / 2 - 1, 6, 3, 2, C('#3a3a42')); p.put(w / 2, 7, lit ? C('#80ff80') : C('#2a4a2a'));
  p.put(4, 3, lit ? C('#e04848') : DGREY);
  if (lit) for (let i = 0; i < 5; i++) d.fx.line(w / 2, 8, i * 4, h + 10, withAlpha(C('#80ff80'), 170));
  else p.hline(4, w - 5, 2, C('#3a3a42'));
}

// ---------------------------------------------------------------- itens específicos · janela (o vão DWIN fica livre)

/** Varão e suportes comuns às cortinas. */
function rodTop(p: Px, w: number, c: Col): void { p.rect(1, 0, 2, 3, c); p.rect(w - 3, 0, 2, 3, c); p.hline(0, w - 1, 2, c); p.hline(0, w - 1, 1, lv(c, 4.2)); }
/** Cortina de renda: painéis brancos translúcidos com motivo de flores, bandô de renda. */
function lace(d: Dc): void {
  const { p, m, w, h } = d;
  rodTop(p, w, m.metal);
  for (const [a, b] of [[0, 10], [w - 11, w - 1]] as const) for (let y = 3; y < h; y++) for (let x = a; x <= b; x++) { const motif = (Math.hypot((x % 6) - 3, (y % 6) - 3) < 1.6) || ((x + y) % 6 === 0); p.set(x, y, motif ? withAlpha(W, 235) : withAlpha(C('#f4f0e6'), 150)); }
  for (let x = 0; x < w; x++) p.set(x, 3 + (x % 4 === 0 ? 2 : x % 2), withAlpha(W, 230)); for (let x = 0; x < w; x++) p.set(x, 3, withAlpha(W, 230));
}
/** Persiana de alumínio (déco em diante): lâminas horizontais recolhidas no alto, cordão. */
function venetian(d: Dc): void {
  const { p, w } = d;
  const { x: wx, w: ww } = DWIN;
  blk(p, wx - 2, 2, ww + 4, 2, CHROME); for (let y = 4; y < 14; y += 2) { p.hline(wx - 1, wx + ww, y, C('#c8ccd4')); p.hline(wx - 1, wx + ww, y + 1, lv(C('#c8ccd4'), 2)); }
  p.vline(wx + 3, 14, 19, C('#e8e4dc')); p.put(wx + 3, 20, CHROME); p.vline(w - wx - 4, 14, 16, C('#e8e4dc')); p.put(w - wx - 4, 17, CHROME); p.rect(1, 0, 2, 3, GREY); p.rect(w - 3, 0, 2, 3, GREY);
}
/** Cortina de contas (anos 70): fios de contas coloridas caindo do varão, abertos no meio. */
function beads(d: Dc): void {
  const { p, w, h } = d;
  rodTop(p, w, C('#7a4a24'));
  const cols = [C('#d8782a'), C('#a8401a'), C('#f0c060'), C('#7a8a2a')];
  for (let x = 0; x < w; x += 2) { if (x > 8 && x < w - 9) continue; for (let y = 3; y < h - 2; y += 2) p.put(x, y, cols[(x + y) % 4]); }
}
/** Cortina blecaute (anos 90): painéis grossos escuros abertos e enrolador em cima. */
function blackout(d: Dc): void {
  const { p, m, w, h } = d;
  rodTop(p, w, m.metal);
  for (const [a, b] of [[0, 7], [w - 8, w - 1]] as const) for (let y = 3; y < h; y++) for (let x = a; x <= b; x++) p.set(x, y, (x - a) % 3 === 0 ? lv(C('#2a3040'), 1.6) : C('#2a3040'));
  blk(p, DWIN.x - 1, 3, DWIN.w + 2, 3, C('#3a4050')); p.put(DWIN.x + 2, 6, GREY);
}
/** Floreira de janela (sem época): caixa sob o peitoril com flores, suporte da época. */
function planters(d: Dc): void {
  const { p, m, e, h } = d;
  const { x: wx, y: wy, w: ww, h: wh } = DWIN;
  const box = [C('#2a2a30'), BLACK, C('#e8e0c8'), C('#b8603a'), C('#e04898'), C('#5a6a7a'), C('#e8e6e0'), C('#2a2c34')][e];
  const fl = [[C('#c83a32'), C('#f0e0f0')], [C('#f8f0f0'), C('#f0d040')], [C('#e04848'), C('#f0a0c8')], [C('#f0d040'), W], [C('#ff5ab0'), C('#3ac0d0')], [C('#8a5ac8'), C('#c8a0e0')], [LEAF2, C('#8ab08a')], [C('#f0a0e0'), C('#a0c0ff')]][e];
  const by = wy + wh + 2, bh = Math.min(5, h - by);
  if (e === 0) { for (let x = wx - 3; x < wx + ww + 3; x += 2) p.vline(x, by, by + bh - 1, box); p.hline(wx - 3, wx + ww + 2, by, box); p.hline(wx - 3, wx + ww + 2, by + bh - 1, box); for (let x = wx - 2; x < wx + ww + 2; x += 4) p.ring(x + 1, by + 2, 1, box); }
  else blk(p, wx - 3, by, ww + 6, bh, box);
  if (e === 1) p.hline(wx - 3, wx + ww + 2, by + 1, m.metal);
  for (let x = wx - 2; x < wx + ww + 2; x += 2) {
    const tall = e === 6 ? 3 : e === 3 ? 5 : 4;
    p.vline(x, by - tall + 1, by - 1, LEAF);
    if (e === 6) { p.put(x, by - tall, LEAF2); continue; }
    p.put(x, by - tall, fl[(x >> 1) % 2]); if (e === 3 || e === 5) p.put(x, by - tall - 1, fl[(x >> 1) % 2]);
  }
  if (e === 7) p.rect(wx + ww, by + 1, 2, 2, C('#5ae0ff'));
  // mãos-francesas presas na parede (a floreira não flutua)
  for (const x of [wx - 1, wx + ww]) p.line(x, by + bh, x - 2, Math.min(h - 1, by + bh + 2), box === BLACK ? C('#3a3a42') : lv(box, 1.4));
}
/** Vidro que escurece sozinho: moldura fina e vidro com película escura em degradê. */
function smartGlass(d: Dc): void {
  const { p, m, lit, w } = d;
  const { x: wx, y: wy, w: ww, h: wh } = DWIN;
  blk(p, wx - 1, wy - 1, ww + 2, 1, C('#2a2c34')); blk(p, wx - 1, wy + wh, ww + 2, 1, C('#2a2c34')); p.vline(wx - 1, wy, wy + wh - 1, C('#2a2c34')); p.vline(wx + ww, wy, wy + wh - 1, C('#2a2c34'));
  for (let y = wy; y < wy + wh; y++) p.hline(wx, wx + ww - 1, y, withAlpha(C('#20283a'), Math.round(lit ? 60 : 30 + 140 * (1 - (y - wy) / wh))));
  p.rect(wx + ww - 4, wy + wh - 3, 3, 2, lit ? m.acc : DGREY); p.rect(1, wy + wh + 1, w - 2, 2, C('#e8e8ec'));
}

// ---------------------------------------------------------------- itens específicos · letreiros (com o nome do selo)

/** Letras douradas na vidraça (déco): nome em ouro com contorno preto sobre o vidro, filete. */
function giltLetters(d: Dc): void {
  const { p, m, w, h, name } = d;
  p.rect(0, 0, w, h, withAlpha(m.glass, 230)); p.hline(0, w - 1, 0, W); nameIn(p, name, 1, 0, w - 2, h - 1, GOLD, lv(GOLD, 1.2)); p.hline(2, w - 3, h - 1, GOLD);
}
/** Marquise de lâmpadas (déco): caixa com borda de lâmpadas e o nome. */
function marquee(d: Dc): void {
  const { p, lit, w, h, name } = d;
  blk(p, 0, 0, w, h, C('#c83a32')); p.rect(3, 3, w - 6, h - 6, C('#f4ecd0'));
  for (let x = 1; x < w - 1; x += 3) { p.put(x, 1, lit ? BULB : C('#c8a040')); p.put(x, h - 2, lit ? BULB : C('#c8a040')); }
  for (let y = 4; y < h - 3; y += 3) { p.put(1, y, lit ? BULB : C('#c8a040')); p.put(w - 2, y, lit ? BULB : C('#c8a040')); }
  nameIn(p, name, 4, 3, w - 8, h - 6, BLACK); if (lit) d.fx.rect(0, 0, w, h, withAlpha(GLOW, 40));
}
/** Placa googie (anos 50): seta e estrela com o nome. */
function googie(d: Dc): void {
  const { p, m, lit, w, h, name } = d, fl = h - 1;
  p.vline(w / 2, 18, fl, CHROME); p.vline(w / 2 + 1, 18, fl, lv(CHROME, 2));
  p.poly([[0, 8], [w - 6, 6], [w - 6, 3], [w, 11], [w - 6, 19], [w - 6, 16], [0, 18]], m.acc); p.poly([[2, 10], [w - 8, 9], [w - 8, 15], [2, 16]], C('#f4ecd0'));
  nameIn(p, name, 2, 9, w - 10, 7, m.acc);
  const sx = 6, sy = 3; for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; p.line(sx, sy, sx + Math.cos(a) * (i % 2 ? 2 : 4), sy + Math.sin(a) * (i % 2 ? 2 : 4), lit ? C('#fff0a0') : m.acc2); }
  for (let x = 4; x < w - 8; x += 3) p.put(x, 20, lit ? BULB : C('#c8a040'));
  p.hline(w / 2 - 3, w / 2 + 4, fl, CHROME); glow(d, sx, sy, 5);
}
/** Logotipo gigante pintado (anos 70): faixas de arco-íris em curva e o nome. */
function supergraphic(d: Dc): void {
  const { p, w, h, name } = d;
  const cols = [C('#a8401a'), C('#d8782a'), C('#f0c060'), C('#7a8a2a')];
  for (let i = 0; i < 4; i++) for (let x = 0; x < w; x++) { const y = 2 + i * 2 + Math.round(Math.sin(x / w * Math.PI) * -1.5 + 1.5); p.put(x, y, cols[i]); p.put(x, y + 1, cols[i]); }
  p.rect(0, 11, w, h - 11, C('#f0e0b0')); p.hline(0, w - 1, 11, lv(C('#f0e0b0'), 4));
  nameIn(p, name, 1, 11, w - 2, h - 11, C('#4a2c18'));
}
/** Logo pequeno em relevo (minimalista): inicial em placa clara. */
function minLogo(d: Dc): void {
  const { p, w, h, name } = d;
  const ini = (name.trim()[0] ?? 'S').toUpperCase();
  for (const x of [1, w - 2]) p.put(x, 1, GREY); blk(p, 0, 0, w, h, C('#ecebe6')); drawText(p, ini, 2, 2.5, C('#2a2a2e')); p.hline(7, w - 3, 4, C('#8a8a86')); p.hline(7, w - 5, 6, C('#b8b6b0'));
}
/** Placa de latão gravada (sem época): placa de parede com o nome. */
function brassPlate(d: Dc): void {
  const { p, e, w, h, name } = d;
  const c = [BRASS, C('#e0b048'), CHROME, C('#a87a3a'), C('#c8a8e0'), C('#b8a070'), C('#2a2a2e'), C('#d8dce4')][e];
  blk(p, 0, 0, w, h, c); p.rect(1, 1, w - 2, h - 2, lv(c, 3.2)); for (const [x, y] of [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]] as const) p.put(x, y, lv(c, 1.4));
  nameIn(p, name, 2, 1, w - 4, h - 2, e === 6 ? W : lv(c, 0.6));
}
/** Logo projetado na calçada (smart): elipse de luz com o nome. */
function projection(d: Dc): void {
  const { m, lit, w, h, name } = d, q = d.fx; // luz no chão: vai inteira para a camada de luz (sem contorno)
  q.ellipse(w / 2, h / 2, w / 2 - 0.5, h / 2 - 0.5, lit ? withAlpha(lv(m.acc, 4), 150) : withAlpha(C('#8a9aa8'), 110));
  q.ellipse(w / 2, h / 2, w / 2 - 3, h / 2 - 1.5, lit ? withAlpha(lv(m.acc, 5), 90) : withAlpha(C('#a8b8c8'), 70));
  nameIn(q, name, 2, 0, w - 4, h, lit ? W : C('#4a5a68'));
}

// ---------------------------------------------------------------- padrões do catálogo (ladrilho 16×16, sem costura)

/** Tamanho do ladrilho dos papéis de parede e pisos (o catálogo traz 0×0: cobrem a área toda). */
export const DTILE = 16;
type TileF = (x: number, y: number, m: Mat, e: number) => Col;
const TILES: Record<string, TileF> = {
  w_damask: (x, y) => { const u = wrapD(x, 8, 16), v = wrapD(y, 8, 16), k = (u / 5) ** 2 + (v / 7) ** 2; const u2 = wrapD(x, 0, 16), v2 = wrapD(y, 0, 16); return k < 1 && (k > 0.55 || (u < 1 && v < 4)) || (u2 < 2 && v2 < 2 && u2 + v2 < 3) ? C('#a83a48') : (x + y) % 4 === 0 ? C('#6a1a2a') : C('#7a2232'); },
  w_floral_nouveau: (x, y) => wallpaperAt(0, x, y),
  w_wood_panel: (x, y, m) => (x % 8 === 0 ? lv(m.wood2, 1.2) : x % 8 === 1 ? lv(m.wood, 4) : noise(x, y, 301) > 0.75 ? lv(m.wood, 2.4) : m.wood),
  w_deco_fan: (x, y) => wallpaperAt(1, x, y),
  w_deco_stripe: (x) => (x % 8 < 3 ? C('#1e1c22') : x % 8 === 3 ? C('#c8a040') : C('#efe4ca')),
  w_atomic: (x, y) => wallpaperAt(2, x, y),
  w_pastel: (x, y) => (noise(x, y, 391) > 0.93 ? C('#c8ecd8') : paintAt(2, x, y)),
  w_psych: (x, y) => { const v = y + 3 * Math.sin((x / 16) * TAU) ; return [C('#e04898'), C('#f08a30'), C('#f0e040'), C('#7a3ac8')][Math.floor(((v % 16) + 16) % 16 / 4)]; },
  w_orange_geo: (x, y) => wallpaperAt(3, x, y),
  w_cork: (x, y) => { const n = noise(x, y, 311); return n > 0.8 ? C('#8a5a2a') : n < 0.2 ? C('#e0b070') : C('#c89050'); },
  w_memphis: (x, y) => wallpaperAt(4, x, y),
  w_grey_sponge: (x, y) => mix(C('#8a8c94'), C('#c8cad0'), (Math.sin((x / 16) * TAU) + Math.cos((y / 16) * TAU * 2) + noise(x, y, 321)) / 3 + 0.33),
  w_brick: (x, y) => { const row = Math.floor(y / 4), off = (row % 2) * 4; const mort = y % 4 === 3 || (x + off) % 8 === 7; return mort ? C('#c8bca8') : noise(Math.floor((x + off) / 8), row, 331) > 0.6 ? C('#9a4a32') : (y % 4 === 0 ? C('#c0644a') : C('#a8543a')); },
  w_acoustic: (x, y, m) => { const u = x % 8, v = y % 8, k = Math.max(Math.abs(u - 3.5), Math.abs(v - 3.5)); const c = m.fab2; return k > 3 ? lv(c, 0.8) : u < v ? lv(c, 2) : lv(c, 3.6); },
  w_white_matte: (x, y) => { const n = noise(x, y, 341); return n > 0.92 ? C('#e6e4de') : n < 0.05 ? C('#f8f7f4') : C('#f2f1ec'); },
  w_concrete: (x, y) => paintAt(6, x, y),
  w_led_paint: (x, y, m) => (x % 8 === 0 || y % 8 === 0 ? lv(m.acc, 4.4) : (x + y) % 16 < 8 ? C('#d0d4d8') : C('#c4c8ce')),
  g_parquet: (x, y) => floorAt(0, x, y),
  g_mosaic: (x, y) => { const u = x % 8, v = y % 8; if (u === 0 || v === 0) return C('#d8d0c0'); const r = Math.hypot(u - 4, v - 4); return r < 1.5 ? C('#c83a32') : Math.abs(u - v) < 1 || Math.abs(u + v - 8) < 1 ? C('#2a5a8a') : C('#e8dcc0'); },
  g_terrazzo: (x, y) => { const n = noise(x, y, 351); return x % 16 === 0 || y % 16 === 0 ? C('#c09048') : n > 0.9 ? C('#2a2a30') : n < 0.08 ? C('#a8584a') : C('#e6dcc8'); },
  g_checker: (x, y) => (x % 8 === 0 && y % 8 === 0 ? C('#8a8a90') : (Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? ((x + y) % 7 === 0 ? C('#2e2e36') : C('#1e1e24')) : C('#f0ece4')),
  g_shag: (x, y) => floorAt(3, x, y),
  g_disco_floor: (x, y) => { const k = (Math.floor(x / 8) + Math.floor(y / 8) * 3) % 4; const c = [C('#ff5ab0'), C('#5ae0ff'), C('#f0e040'), C('#a06aff')][k]; return x % 8 === 0 || y % 8 === 0 ? C('#1a1a24') : (x % 8 === 1 || y % 8 === 1) ? lv(c, 5) : c; },
  g_grey_carpet: (x, y) => { const n = noise(x, y, 361); return n > 0.9 ? C('#8a8c94') : n > 0.55 ? C('#7a7c84') : C('#6a6c74'); },
  g_laminate: (x, y) => floorAt(5, x, y),
  g_polished_concrete: (x, y) => floorAt(6, x, y),
  g_wide_oak: (x, y) => { const seam = y % 8 === 0 || (x + (Math.floor(y / 8) % 2) * 8) % 16 === 0; return seam ? C('#a88a60') : noise(x >> 1, y, 371) > 0.8 ? C('#d8bc90') : C('#e2c8a0'); },
  g_heated: (x, y) => (x === 0 || y === 0 ? C('#9a9aa0') : (y === 8 && x % 4 < 2) ? C('#e8b8a0') : C('#c8c8cc')),
  g_floating_studio: (x, y, m) => (y % 4 === 0 ? lv(m.wood2, 1.4) : (x + Math.floor(y / 4) * 5) % 16 === 0 ? lv(m.wood2, 2) : noise(x, y, 381) > 0.8 ? lv(m.wood, 2.4) : m.wood),
};

/** Busto de compositor (mesa): mármore sobre base. */
function bustSmall(d: Dc): void {
  const { p, w, h } = d, fl = h - 1, mb = C('#ece8dc');
  p.ellipse(w / 2, 3.5, 2.5, 3, mb); p.rect(w / 2 - 3, 0, 6, 2, lv(mb, 2.4)); p.put(w / 2 + 1, 4, lv(mb, 1.6)); p.rect(w / 2 - 1, 6, 3, 2, mb);
  p.poly([[1, 10], [w - 1, 10], [w - 2, 7], [2, 7]], mb); p.hline(2, w - 3, 7, lv(mb, 4.4)); blk(p, 2, 10, w - 4, fl - 9, C('#2a2a30'));
}

// ---------------------------------------------------------------- registro: id do catálogo → desenho

interface Rec {
  f: (d: Dc) => void;
  /** forma do desenho de família (padrão: o estilo do item; nos itens sem época, o da época) */
  v?: number;
  /** troca de materiais (ex.: couro preto num sofá dos anos 90) */
  mat?: Partial<Mat>;
  /** desenha num tamanho próprio e cola centrado no tamanho do catálogo (encostado embaixo) */
  nat?: [number, number];
}
const r = (f: (d: Dc) => void, o: Omit<Rec, 'f'> = {}): Rec => ({ f, ...o });
const LEATHER = C('#7a3a24');
const REC: Record<string, Rec> = {
  // móveis
  d_chaise_nouveau: r(chaise), d_armchair_nouveau: r(armchair, { v: 0 }), d_screen_nouveau: r(screenFold), d_sideboard_nouveau: r(cabinet, { v: 0 }),
  d_bookcase_nouveau: r(bookcase, { v: 0 }), d_plantstand_nouveau: r(plantstand), d_sofa_deco: r(sofa, { v: 1, mat: { fab: LEATHER } }),
  d_club_chair: r(armchair, { v: 1, mat: { fab: C('#8a4a2a') } }), d_bar_cart_deco: r(barcart, { v: 1 }), d_cabinet_deco: r(cabinet, { v: 1 }),
  d_vanity_deco: r(vanity), d_desk_deco: r(deskF, { v: 1 }), d_sofa_fifties: r(sofa, { v: 2 }), d_eames_chair: r(lounge), d_diner_booth: r(booth),
  d_boomerang_table: r(coffeetable, { v: 2 }), d_credenza_fifties: r(cabinet, { v: 2 }), d_shell_chair: r(armchair, { v: 6 }), d_bean_bag: r(armchair, { v: 3 }),
  d_conversation_pit: r(sofa, { v: 3 }), d_egg_chair: r(armchair, { v: 2 }), d_waterbed: r(bedF, { v: 3 }), d_macrame_chair: r(macrameChair), d_rattan_set: r(rattan),
  d_sofa_eighties: r(sofa, { v: 6, mat: { fab: C('#8a8c94'), metal: C('#26262c') } }), d_glass_desk: r(deskF, { v: 4 }), d_memphis_shelf: r(bookcase, { v: 4 }), d_arcade_cab: r(arcade),
  d_futon: r(bedF, { v: 5 }), d_leather_sofa90: r(sofa, { v: 5, mat: { fab: C('#26262c') } }), d_cd_tower: r(cdtower), d_pool_table: r(pooltable),
  d_lowsofa_min: r(sofa, { v: 6 }), d_floating_shelf: r(floatshelf), d_standing_desk: r(deskF, { v: 6 }), d_bench_min: r(bench), d_smart_sofa: r(sofa, { v: 7 }),
  d_massage_chair: r(armchair, { v: 7 }), d_pod_bed: r(bedF, { v: 7 }), d_bar_counter: r(barcounter), d_merch_rack: r(merchrack), d_record_bin: r(recordbin),
  d_piano_bench: r(pianobench), d_coat_stand: r(coatstand),
  // quadros e parede
  a_mucha_print: r(poster, { v: 0 }), a_oil_landscape: r(painting, { v: 0 }), a_family_portrait: r(familyPortrait), a_sheet_frame: r(sheetFrame),
  a_cabaret_poster: r(cabaret), a_deco_mirror: r(wallmirror, { v: 2 }), a_ocean_liner: r(liner), a_jazz_poster: r(poster, { v: 1 }), a_skyline_etch: r(skylineEtch),
  a_gold_78: r((d) => award(d, GOLD, 'lp')), a_pinup: r(pinup), a_abstract_fifties: r(painting, { v: 2 }), a_starburst_clock: r(clock, { v: 2 }),
  a_rocknroll_poster: r(poster, { v: 2 }), a_gold_lp: r((d) => award(d, GOLD, 'lp')), a_psych_poster: r(poster, { v: 3 }), a_macrame_wall: r(macrameWall),
  a_sunset_canvas: r(sunset), a_platinum: r((d) => award(d, C('#e8ecf4'), 'plat')), a_neon_art: r(neonArt), a_pop_print: r(painting, { v: 5 }),
  a_mtv_poster: r(poster, { v: 4 }), a_tour_poster90: r(tourPoster), a_grunge_flyer: r(flyerWall), a_photo_bw: r(photoBW), a_canvas_min: r(canvasMin),
  a_streaming_plaque: r((d) => award(d, C('#5ae0a0'), 'stream')), a_digital_frame: r(digitalFrame), a_led_wall: r(ledWall), a_guitar_wall: r(guitarWall),
  a_world_map: r(worldMapF), a_signed_photo: r(signedPhoto), a_cover_frame: r(coverFrame),
  // plantas
  p_fern: r(fern), p_palm: r(palm), p_orchid: r(orchid), p_cactus: r(smallplant, { v: 1 }), p_spider: r(spider), p_rubber: r(rubber), p_bonsai: r(bonsai),
  p_ficus: r(bigplant, { v: 4, nat: [16, 32] }), p_succulents: r(succulents), p_monstera: r(bigplant, { v: 2, nat: [16, 30] }), p_green_wall: r(greenWall),
  p_hydro: r(bigplant, { v: 7, nat: [16, 28] }),
  // luminárias
  l_tiffany: r(tablelamp, { v: 0, nat: [10, 16] }), l_gas_sconce: r(gasSconce), l_deco_floor: r(floorlamp, { v: 1 }), l_banker: r(banker), l_arc: r(arcLamp),
  l_atomic: r(floorlamp, { v: 2 }), l_lava: r(lava), l_mushroom: r(mushroom), l_neon_sign: r(onAir), l_halogen: r(floorlamp, { v: 4 }), l_desk_tensor: r(tensor),
  l_paper_lantern: r(paperLantern), l_led_strip: r(ledStrip), l_smart_bulb: r(tablelamp, { v: 7 }),
  // som e aparelhos
  h_gramophone: r(gramophone), h_music_box: r(musicBox), h_player_piano: r(playerPiano), h_cathedral_radio: r(cathedral), h_console_radio: r(stereo, { v: 1 }),
  h_jukebox: r(jukebox, { v: 2 }), h_hifi_tube: r(stereo, { v: 2 }), h_tv_fifties: r(tv50), h_reel_deck: r(reelDeck), h_quad_stereo: r(stereo, { v: 3 }),
  h_boombox: r(boombox), h_vcr_tv: r(vcrTv), h_cd_micro: r(cdMicro), h_pa_speaker: r(paSpeaker), h_flat_tv: r(flatTv), h_smart_speaker: r(smartSpeaker),
  h_vinyl_revival: r(vinylRevival), h_holo: r(holo), h_karaoke: r(karaoke),
  // coleção e enfeites
  c_bust: r(bustSmall), c_globe: r(globe), c_grandfather_clock: r(grandfather), c_metronome: r(metronome), c_deco_statue: r(decoStatue), c_cocktail_set: r(cocktail),
  c_aquarium: r(tankSmall), c_jukebox_mini: r(jukeboxMini), c_disco_ball: r(discoBall), c_rubik: r(rubik), c_cassette_wall: r(cassetteWall), c_gameconsole: r(gameConsole),
  c_action_figures: r(figures), c_trophy_case: r(trophyCase), c_drumhead: r(drumhead), c_setlist_frame: r(setlist), c_ceramic_min: r(ceramicMin),
  c_robot_vac: r(robotVac), c_drone_cam: r(droneCam), c_fireplace: r(fireplace), c_piano_grand: r(grandPiano), c_candles: r(candles),
  // tapetes (com tamanho)
  g_persian: r(rug, { v: 0 }), g_rug_kilim: r(rug, { v: 5 }),
  // teto
  t_crystal: r(chandelier, { v: 0 }), t_gas_pendant: r(gasPendant), t_deco_dish: r(decoDish), t_sputnik: r(chandelier, { v: 2 }), t_fluorescent: r(fluorescent),
  t_rice_globe: r(chandelier, { v: 5 }), t_stage_par: r(stagePar), t_track: r(track), t_industrial: r(industrial), t_led_panel: r(ledPanel),
  t_smart_ceiling: r(smartCeiling), t_laser: r(laser),
  // janela
  k_velvet: r(curtain, { v: 0 }), k_lace: r(lace), k_stained: r(winframe, { v: 0 }), k_venetian: r(venetian), k_barkcloth: r(curtain, { v: 2 }), k_beads: r(beads),
  k_vertical: r(curtain, { v: 4 }), k_blackout: r(blackout), k_linen: r(curtain, { v: 6 }), k_smart_glass: r(smartGlass), k_planters: r(planters),
  // letreiros
  s_painted: r(sign, { v: 0 }), s_brass_plate: r(brassPlate), s_gilt_letters: r(giltLetters), s_marquee: r(marquee), s_neon_script: r(sign, { v: 2 }),
  s_googie: r(googie), s_supergraphic: r(supergraphic), s_lightbox: r(sign, { v: 3 }), s_steel_letters: r(sign, { v: 6 }), s_min_logo: r(minLogo),
  s_led_screen: r(sign, { v: 7 }), s_projection: r(projection),
};
/** O catálogo tem desenho aqui? (todo item de DECO31 precisa ter: o teste cobra) */
export const decoHasArt = (id: string): boolean => id in REC || id in TILES;
/** Janela sem tamanho no catálogo: cortina/moldura no tamanho padrão da janela das cenas. */
export const DWIN_SIZE = { w: 36, h: 40 } as const;

// ---------------------------------------------------------------- montagem

/** Margem em volta do desenho (contorno de 1 px). */
export const DPAD = 2;
export type DCond = 'new' | 'used';
export interface DecoOpts { cond?: DCond; lit?: boolean; /** nome do selo (letreiros) */ name?: string }
const hashS = (s: string): number => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
const styIdx = (st: DecoStyle31): number => STYLE31.indexOf(st);

/** O item é um padrão que cobre a área (papel de parede ou piso sem tamanho)? */
export const decoIsTile = (id: string): boolean => id in TILES;
/** Tamanho lógico do desenho (sem margem): o do catálogo; padrões = ladrilho; janela sem tamanho = DWIN_SIZE. */
export function decoArtSize(id: string): { w: number; h: number } {
  const def = decoDef31(id)!;
  if (id in TILES) return { w: DTILE, h: DTILE };
  if (def.w === 0 || def.h === 0) return { ...DWIN_SIZE };
  return { w: def.w, h: def.h };
}
/** Tamanho final do Px (com a margem DPAD nos objetos; ladrilho sem margem). */
export function decoSize(id: string): { w: number; h: number } {
  const s = decoArtSize(id);
  return id in TILES ? s : { w: s.w + 2 * DPAD, h: s.h + 2 * DPAD };
}
/** Estilo (0..7) com que o item é desenhado no ano: o dele; "sem época" segue a época do ano (limitada ao período do item). */
export function decoStyleOf(id: string, year: number): number {
  const def = decoDef31(id)!;
  if (def.style !== 'any') return styIdx(def.style);
  const y = Math.max(def.from, Math.min(def.to ? def.to - 1 : 2040, year));
  return styOf(y);
}
/** Épocas (índices de estilo) em que o item existe: do ano em que aparece até sair de linha. */
export function decoEras(id: string): number[] {
  const def = decoDef31(id)!;
  const a = styOf(def.from), b = styOf(def.to ? def.to - 1 : 2040);
  const out: number[] = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}

/**
 * Desgaste de "usado/vintage": cor desbota para o sépia e escurece um pouco, aparecem riscos claros e manchas escuras
 * (determinísticos pela semente). Só mexe em pixels opacos: a silhueta não muda.
 */
function wear(p: Px, seed: number): void {
  const sep = C('#a89070');
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const i = y * p.w + x, c = p.d[i];
    if (c >>> 24 < 40) continue;
    const [rr, g, b, a] = rgba(c);
    const gr = (rr * 0.3 + g * 0.59 + b * 0.11) | 0;
    let o = mix(pack(Math.round(rr * 0.55 + gr * 0.45), Math.round(g * 0.55 + gr * 0.45), Math.round(b * 0.55 + gr * 0.45), a), sep, 0.22);
    o = mix(o, C('#1e1814'), 0.08);
    const n = noise(x, y, seed);
    if (n > 0.95) o = mix(o, C('#f0e8d8'), 0.35); // risco
    else if (n < 0.04) o = mix(o, C('#3a2a1a'), 0.3); // mancha
    if ((x + seed) % 13 === 0 && noise(x, 0, seed + 1) > 0.6 && y > p.h * 0.3 && y < p.h * 0.7) o = mix(o, C('#f0e8d8'), 0.25); // arranhão
    p.d[i] = withAlpha(o, a);
  }
}

const cacheD = new Map<string, Px>();
/**
 * O item pronto: desenha no tamanho do catálogo, desgasta se usado, contorna (INK) e cola a luz. Objetos ganham a margem
 * DPAD; padrões devolvem o ladrilho (use decoFillPx para cobrir uma área).
 */
export function decoPx(id: string, year: number, o: DecoOpts = {}): Px {
  const def = decoDef31(id);
  if (!def || !decoHasArt(id)) throw new Error(`deco31px: sem desenho para '${id}'`);
  const e = decoStyleOf(id, year), cond = o.cond ?? 'new', lit = !!o.lit, name = def.cat === 'sign' ? (o.name ?? 'Selo') : '';
  const key = `${id}|${e}|${cond}|${lit ? 1 : 0}|${name}`;
  const hit = cacheD.get(key);
  if (hit) return hit;
  let out: Px;
  if (id in TILES) out = decoTilePx(id, year, cond);
  else {
    const rec = REC[id], { w, h } = decoArtSize(id), [nw, nh] = rec.nat ?? [w, h];
    const m = rec.mat ? { ...M[e], ...rec.mat } : M[e];
    const layer = new Px(nw, nh), fx = new Px(nw, nh);
    rec.f({ p: layer, fx, s: rec.v ?? e, m, e, lit, w: nw, h: nh, name });
    if (cond === 'used') { wear(layer, hashS(id) + e * 17); wear(fx, hashS(id) + e * 17 + 1); } // a luz de peça velha também amarela
    out = new Px(w + 2 * DPAD, h + 2 * DPAD);
    const ox = DPAD + Math.floor((w - nw) / 2), oy = DPAD + (def.slots[0] === 'ceiling' || def.slots[0] === 'wall' ? 0 : h - nh);
    out.blit(layer, ox, oy);
    out.outline(INK);
    out.blit(fx, ox, oy);
  }
  if (cacheD.size > 2500) cacheD.clear();
  cacheD.set(key, out);
  return out;
}
/** O desenho muda quando aceso? (luminárias, telas, neon, letreiros de luz) */
export function decoHasLight(id: string): boolean {
  if (id in TILES) return false;
  const y = DSTY_YEAR[decoEras(id)[0]];
  const a = decoPx(id, y, { lit: false }).d, b = decoPx(id, y, { lit: true }).d;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
  return false;
}

/** Ladrilho 16×16 de um papel de parede ou piso: repete sem costura. */
export function decoTilePx(id: string, year: number, cond: DCond = 'new'): Px {
  const f = TILES[id], e = decoStyleOf(id, year), m = M[e];
  const t = new Px(DTILE, DTILE);
  for (let y = 0; y < DTILE; y++) for (let x = 0; x < DTILE; x++) t.d[y * DTILE + x] = f(x, y, m, e) | 0xff000000;
  if (cond === 'used') wear(t, hashS(id) + e * 17);
  return t;
}
/** Área W × H coberta pelo padrão, a partir da origem (ox, oy) do mundo (para casar com a área vizinha). */
export function decoFillPx(id: string, year: number, W: number, H: number, cond: DCond = 'new', ox = 0, oy = 0): Px {
  const t = decoTilePx(id, year, cond), out = new Px(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out.d[y * W + x] = t.d[((((y + oy) % t.h) + t.h) % t.h) * t.w + ((((x + ox) % t.w) + t.w) % t.w)];
  return out;
}
/** Todos os ids do catálogo (na ordem do catálogo). */
export const DECO_IDS: string[] = DECO31.map((d: DecoDef31) => d.id);

// ---------------------------------------------------------------- upgrades dos itens obrigatórios (UPG31)

/** Tamanho fixo do desenho de cada item obrigatório (todos os níveis cabem nele). */
export const REQ_SIZE: Record<string, { w: number; h: number }> = {
  telefone: { w: 22, h: 16 }, arquivoaco: { w: 18, h: 32 }, cofre: { w: 24, h: 28 }, livrocaixa: { w: 24, h: 12 }, fichario: { w: 18, h: 12 },
  mesames: { w: 44, h: 26 }, radiotv: { w: 26, h: 28 }, mesasom: { w: 50, h: 28 }, piano: { w: 40, h: 30 }, palco: { w: 30, h: 40 },
  mesareuniao: { w: 60, h: 22 }, cama: { w: 46, h: 22 },
};
type Ud = Dc & { lv: number };

/** Telefone: de parede com manivela → baquelite → várias linhas → central com secretária → videoconferência. */
function uTelefone(u: Ud): void {
  const { p, m, s, lit, w, h } = u, fl = h - 1;
  if (s === 0) { blk(p, 4, 0, 10, fl - 1, m.wood); p.disc(6, 3, 1.4, m.metal); p.disc(11, 3, 1.4, m.metal); p.rect(7, 6, 4, 3, BLACK); p.disc(9, 10.5, 1.5, BLACK); p.line(14, 6, 17, 6, m.metal); p.vline(17, 6, 8, m.metal); p.rect(1, 4, 3, 6, BLACK); p.rect(2, 2, 1, 2, BLACK); blk(p, 3, fl - 1, 12, 2, m.wood2); return; }
  if (s === 1) { p.ellipse(9, fl - 3, 7, 3.5, BLACK); p.disc(9, fl - 3, 2.6, C('#e8e4dc')); p.disc(9, fl - 3, 1, BLACK); blk(p, 2, fl - 10, 14, 3, BLACK); p.rect(2, fl - 8, 2, 3, BLACK); p.rect(14, fl - 8, 2, 3, BLACK); p.hline(3, 14, fl - 10, lv(BLACK, 4)); return; }
  if (s === 2) { blk(p, 0, fl - 7, w, 8, C('#e8e0c8')); for (let i = 0; i < 6; i++) p.rect(2 + i * 3, fl - 2, 2, 2, i < 2 ? (lit || i === 0 ? C('#f0c040') : C('#c8b878')) : C('#d0c8b0')); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) p.put(13 + i * 2, fl - 6 + j * 2, BLACK); blk(p, 1, fl - 11, 11, 3, C('#d8d0b8')); p.rect(2, fl - 9, 2, 2, C('#d8d0b8')); p.rect(9, fl - 9, 2, 2, C('#d8d0b8')); return; }
  if (s === 4) { blk(p, 0, fl - 6, 12, 7, C('#2a2a30')); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) p.put(2 + i * 2, fl - 4 + j * 2, GREY); blk(p, 0, fl - 9, 12, 3, C('#2a2a30')); blk(p, 13, fl - 6, 9, 7, C('#3a3a42')); p.rect(14, fl - 5, 5, 3, C('#5a4a3a')); p.rect(20, fl - 5, 1, 1, lit ? LED : DGREY); p.rect(14, fl - 1, 3, 1, C('#80c0a0')); for (let i = 0; i < 4; i++) p.put(2 + i * 2, fl - 7, i === 0 ? C('#48c860') : C('#f0c040')); return; }
  // videoconferência
  blk(p, 2, 0, w - 4, 11, C('#1a1a1e')); p.rect(3, 1, w - 6, 9, lit ? C('#3a5ac8') : C('#14141a'));
  if (lit) { for (let i = 0; i < 4; i++) { const x = 4 + (i % 2) * 8, y = 2 + Math.floor(i / 2) * 4; p.rect(x, y, 7, 3, C('#2a3a6a')); p.disc(x + 3, y + 1, 1, C('#f0c8a0')); } }
  p.rect(w / 2 - 1, 0, 2, 1, lit ? LED : DGREY); p.rect(w / 2 - 1, 11, 2, 2, C('#2a2c34')); blk(p, 3, fl - 2, w - 6, 3, C('#2a2c34')); p.ellipse(w / 2, fl - 2, 5, 1, lit ? lv(m.acc, 5) : C('#3a3c44')); glow(u, w / 2, 5, 9, C('#6a8af0'));
}
/** Arquivo: carvalho com latão → aço de 4 gavetas → arquivo deslizante → servidor de arquivos. */
function uArquivo(u: Ud): void {
  const { p, m, s, lit, w, h } = u, fl = h - 1;
  if (s <= 1) {
    const c = s === 0 ? C('#a87a48') : C('#4a5a3a'), top = 6;
    blk(p, 0, top, w, fl - top + 1, c);
    for (let i = 0; i < 4; i++) { const y = top + 1 + i * 6; p.rect(1, y, w - 2, 5, lv(c, 2.6)); p.hline(1, w - 2, y, lv(c, 4)); p.rect(w / 2 - 2, y + 2, 4, 1, s === 0 ? BRASS : CHROME); p.rect(w / 2 - 1, y + 1, 2, 1, PAPER); }
    if (s === 0) p.hline(0, w - 1, top, m.wood2);
    return;
  }
  if (s === 3) { // deslizante: três estantes em trilho com volante
    for (let i = 0; i < 3; i++) { const x = i * 6; blk(p, x, 0, 6, fl - 1, i === 1 ? C('#c8b890') : C('#b8a880')); for (let y = 4; y < fl - 2; y += 6) books(p, x + 1, y, 4, 4, 401 + i * 7 + y, [C('#3a6ac8'), C('#e8e0c8'), C('#c83a32'), C('#d8a030')]); }
    p.ring(w - 4, 14, 2.2, CHROME); p.put(w - 4, 14, CHROME); p.hline(0, w - 1, fl, GREY); p.hline(0, w - 1, fl - 1, C('#5a5a62'));
    return;
  }
  // servidor de arquivos
  blk(p, 0, 0, w, fl + 1, C('#1e1e24')); for (let i = 0; i < 6; i++) { const y = 2 + i * 5; p.rect(2, y, w - 4, 4, C('#2a2a32')); for (let k = 0; k < 4; k++) p.put(4 + k * 2, y + 1, lit ? [C('#48c860'), C('#48c860'), C('#f0c040'), C('#5ae0ff')][(k + i) % 4] : DGREY); p.hline(4, w - 4, y + 3, C('#3a3a44')); }
  glow(u, w / 2, h / 2, 6, C('#48c860'));
}
/** Cofre: de ferro com segredo → casa-forte embutida → biométrico. */
function uCofre(u: Ud): void {
  const { p, lv: L, lit, w, h } = u, fl = h - 1;
  if (L === 1) { const x = 4, sw = 16, top = 8; blk(p, x, top, sw, fl - top - 1, C('#2a2a2a')); p.rect(x + 2, top + 2, sw - 4, fl - top - 6, C('#3a3a3a')); for (let i = x + 3; i < x + sw - 3; i++) p.put(i, top + 3, GOLD); p.disc(x + sw / 2 - 2, top + 9, 2.4, GOLD); p.disc(x + sw / 2 - 2, top + 9, 1, C('#3a3a3a')); p.rect(x + sw - 5, top + 8, 2, 3, GOLD); p.disc(x + 2, fl - 0.5, 1.2, BLACK); p.disc(x + sw - 3, fl - 0.5, 1.2, BLACK); return; }
  if (L === 2) { blk(p, 0, 0, w, fl + 1, C('#8a8478')); p.rect(2, 2, w - 4, fl - 3, C('#4a4e58')); p.disc(w / 2, h / 2, 9, C('#6a6e78')); p.disc(w / 2, h / 2, 7, C('#5a5e68')); p.disc(w / 2, h / 2, 2, CHROME); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; p.line(w / 2, h / 2, w / 2 + Math.cos(a) * 6, h / 2 + Math.sin(a) * 6, CHROME); p.put(w / 2 + Math.cos(a) * 6 - 0.5, h / 2 + Math.sin(a) * 6 - 0.5, W); } for (const y of [5, fl - 5]) p.rect(w - 4, y, 2, 3, CHROME); return; }
  blk(p, 3, 4, w - 6, fl - 3, C('#1e1e24')); p.rect(5, 6, w - 10, fl - 8, C('#2a2a32')); p.rect(w / 2 - 3, 9, 6, 7, lit ? C('#1a3a5a') : C('#14141a')); for (let y = 10; y < 15; y += 2) p.hline(w / 2 - 2, w / 2 + 1, y, lit ? C('#5ae0ff') : C('#2a3a4a')); p.rect(w / 2 - 3, 18, 6, 2, lit ? C('#48c860') : DGREY); p.rect(w - 7, 12, 1, 6, CHROME); glow(u, w / 2, 12, 6, C('#5ae0ff'));
}
/** Livro-caixa: encadernado em couro → máquina de somar → computador com planilha → painel em tempo real. */
function uLivro(u: Ud): void {
  const { p, s, lit, h } = u, fl = h - 1;
  const ledger = (x: number) => { blk(p, x, fl - 4, 13, 5, C('#6a2a1a')); p.rect(x + 1, fl - 3, 11, 3, PAPER); for (let y = fl - 3; y < fl; y++) p.hline(x + 1, x + 11, y, y % 2 ? lv(PAPER, 2) : PAPER); p.hline(x, x + 12, fl - 4, lv(C('#6a2a1a'), 4)); p.rect(x + 9, fl - 4, 2, 1, GOLD); p.vline(x + 5, fl - 4, fl, RED); };
  if (s === 0) { ledger(1); ledger(11 - 0); p.rect(11, fl - 8, 12, 4, C('#6a2a1a')); p.hline(11, 22, fl - 8, GOLD); p.hline(12, 21, fl - 6, lv(C('#6a2a1a'), 3)); return; }
  if (s === 2) { ledger(0); blk(p, 13, fl - 6, 10, 7, C('#a8a8a0')); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) p.put(14 + i * 2, fl - 4 + j * 2, BLACK); p.rect(15, fl - 10, 6, 4, PAPER); p.vline(22, fl - 9, fl - 6, BLACK); p.rect(21, fl - 5, 1, 1, lit ? LED : DGREY); return; }
  if (s === 4) { blk(p, 0, fl - 1, 11, 2, C('#d8d0b8')); blk(p, 1, 0, 11, fl - 2, C('#d8d0b8')); p.rect(2, 1, 9, 7, lit ? C('#1a3a1a') : C('#14181a')); if (lit) for (let y = 2; y < 8; y += 2) for (let x = 3; x < 10; x += 3) p.hline(x, x + 1, y, C('#80f0a0')); blk(p, 13, fl - 2, 11, 3, C('#d8d0b8')); for (let x = 14; x < 23; x += 2) p.put(x, fl - 1, GREY); return; }
  blk(p, 0, 0, 15, fl - 1, C('#1a1a1e')); p.rect(1, 1, 13, fl - 3, lit ? C('#14203a') : C('#101014')); if (lit) { for (let i = 0; i < 5; i++) p.vline(2 + i * 2, fl - 3 - i, fl - 3, [C('#48c860'), C('#5ae0ff'), C('#48c860'), C('#f0c040'), C('#5ae0ff')][i]); p.line(1, 4, 13, 1, C('#f0c040')); } p.rect(6, fl - 1, 3, 2, C('#2a2c34'));
  blk(p, 17, fl - 7, 7, 8, C('#2a2c34')); p.rect(18, fl - 6, 5, 6, lit ? C('#3a5ac8') : C('#14141a')); glow(u, 7, 4, 8, C('#5ae0ff'));
}
/** Fichário: giratório → agenda eletrônica → contatos na nuvem (tablet). */
function uFichario(u: Ud): void {
  const { p, m, s, lit, w, h } = u, fl = h - 1;
  if (s === 2) { p.ellipse(9, 5, 6, 4.5, C('#f0ece0')); for (let i = 0; i < 6; i++) p.line(9, 5, 9 + Math.cos(i) * 6, 5 + Math.sin(i) * 4, lv(C('#f0ece0'), 2)); p.ring(9, 5, 1, CHROME); p.line(3, 5, 3, fl - 1, CHROME); p.line(15, 5, 15, fl - 1, CHROME); blk(p, 1, fl - 1, 16, 2, C('#3a6a5a')); p.disc(17, 5, 1, C('#e04848')); return; }
  if (s === 4) { blk(p, 3, 1, 12, fl, C('#2a2a30')); p.rect(4, 2, 10, 5, lit ? C('#9af0a0') : C('#3a6a40')); drawText(p, 'AB', 5, 2, C('#1a3a1a')); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) p.put(5 + i * 2, 8 + j * 2, GREY); return; }
  blk(p, 1, 0, w - 2, fl + 1, C('#2a2c34')); p.rect(2, 1, w - 4, fl - 1, lit ? C('#e8ecf4') : C('#20242c')); if (lit) for (let i = 0; i < 3; i++) { p.disc(4.5, 3 + i * 3, 1, [C('#e04848'), C('#3a6ac8'), C('#48c860')][i]); p.hline(7, w - 4, 3 + i * 3, C('#5a5c66')); } p.put(w / 2, fl, lit ? m.acc : DGREY);
}
/** Mesa de trabalho: tampo corrediço → mesa de executivo → mesa com tela embutida. */
function uMesa(u: Ud): void {
  const { p, m, s, lit, w, h } = u, fl = h - 1;
  if (s === 0) { blk(p, 0, 4, w, fl - 3, m.wood); p.poly([[2, 12], [6, 2], [w - 6, 2], [w - 2, 12]], m.wood2); for (let x = 7; x < w - 6; x += 2) p.vline(x, 3, 11, lv(m.wood2, 2.6)); p.rect(4, 8, w - 8, 4, lv(m.wood, 0.8)); for (let i = 0; i < 6; i++) p.rect(6 + i * 5, 9, 4, 2, PAPER); for (const x of [2, w - 14]) for (let i = 0; i < 3; i++) { p.rect(x, 14 + i * 4, 12, 3, lv(m.wood, 2.6)); p.put(x + 6, 15 + i * 4, m.metal); } return; }
  if (s === 1) { blk(p, 0, 8, w, 3, m.wood2); p.rect(4, 8, w - 8, 1, C('#2a5a3a')); p.hline(0, w - 1, 10, m.metal); for (const x of [1, w - 13]) { blk(p, x, 11, 12, fl - 10, m.wood2); for (let i = 0; i < 3; i++) { p.hline(x + 1, x + 10, 13 + i * 4, lv(m.wood2, 3)); p.put(x + 6, 14 + i * 4, m.metal); } } blk(p, 6, 3, 8, 5, C('#1e2a20')); p.vline(9, 3, 7, m.metal); p.poly([[6, 2], [13, 2], [11, 4], [8, 4]], C('#3a7a4a')); p.rect(w - 16, 5, 8, 3, C('#e6dac0')); p.rect(18, 6, 6, 2, BLACK); return; }
  blk(p, 0, 9, w, 3, C('#e8e6e0')); p.rect(6, 9, w - 12, 2, lit ? C('#2a4a7a') : C('#1a1e28')); if (lit) { p.hline(8, 20, 9, C('#5ae0ff')); p.hline(24, w - 8, 10, C('#f0c040')); } p.rect(3, 12, 2, fl - 13, m.metal); p.rect(w - 5, 12, 2, fl - 13, m.metal); p.hline(1, 7, fl, m.metal); p.hline(w - 8, w - 2, fl, m.metal);
  blk(p, w / 2 - 6, 0, 13, 8, BLACK); p.rect(w / 2 - 5, 1, 11, 6, lit ? C('#3a5ac8') : C('#14141a')); p.rect(w / 2, 8, 1, 1, m.metal); glow(u, w / 2, 6, 12, C('#6a8af0'));
}
/** Rádio/TV: rádio de válvula numa mesinha → TV em cores com controle → parede de telas. */
function uRadioTv(u: Ud): void {
  const { p, m, s, lit, w, h } = u, fl = h - 1;
  if (s === 1) { blk(p, 2, 14, w - 4, 3, m.wood); legs({ ...u, s: 1 }, 4, w - 5, 17); blk(p, 5, 4, w - 10, 10, m.wood2); p.disc(w / 2, 4, (w - 10) / 2, m.wood2); p.rect(7, 4, 6, 7, C('#c8a878')); for (let x = 8; x < 13; x += 2) p.vline(x, 4, 10, m.wood2); p.rect(14, 6, 5, 2, lit ? C('#f0c060') : C('#a8803a')); p.disc(15.5, 10.5, 1, CHROME); p.disc(18, 10.5, 1, CHROME); glow(u, 16, 7, 4, C('#f0c060')); return; }
  if (s === 3) { blk(p, 0, 2, w, 18, m.wood); p.rect(2, 4, w - 8, 14, C('#1a1a1a')); p.rect(3, 5, w - 10, 12, lit ? C('#3a8ac8') : C('#2a3a3a')); if (lit) { p.rect(4, 11, 6, 5, C('#48b85c')); p.disc(w - 12, 8, 2, C('#f0c040')); p.rect(11, 9, 4, 6, C('#e04848')); } for (let i = 0; i < 4; i++) p.rect(w - 5, 5 + i * 3, 3, 2, C('#c0a060')); blk(p, 0, 20, w, fl - 19, m.wood2); p.rect(3, 22, 6, 2, C('#2a2a2a')); p.put(4, 22, LED); glow(u, w / 2 - 2, 10, 11, C('#80c0f0')); return; }
  for (let i = 0; i < 6; i++) { const x = (i % 3) * 8 + 1, y = Math.floor(i / 3) * 8; blk(p, x, y, 8, 7, C('#1a1a1e')); p.rect(x + 1, y + 1, 6, 5, lit ? [C('#3a5ac8'), C('#e04848'), C('#48b85c'), C('#f0c040'), C('#8a4ab0'), C('#5ae0ff')][i] : C('#14141a')); }
  p.rect(w / 2 - 1, 15, 2, fl - 17, C('#2a2a2e')); blk(p, w / 2 - 6, fl - 2, 12, 3, C('#2a2a2e')); glow(u, w / 2, 7, 13, C('#6a8af0'));
}
/** Mesa de som: corte em cera → console de válvulas 4 canais → 8 pistas → 24 pistas → console grande automatizado → estação digital → sala imersiva. */
function uMesaSom(u: Ud): void {
  const { p, m, s, lit, w, h } = u, fl = h - 1;
  if (s === 0) { // torno de corte direto em cera
    blk(p, 6, 12, w - 12, fl - 11, m.wood); legs({ ...u, s: 0 }, 7, w - 8, fl - 3); p.ellipse(w / 2, 11, 12, 1.5, C('#c8a060')); p.ellipse(w / 2, 10.5, 9, 1, C('#8a6a3a'));
    p.vline(w / 2 + 10, 3, 10, m.metal); p.line(w / 2 + 10, 3, w / 2 + 2, 6, m.metal); p.vline(w / 2 + 2, 6, 10, m.metal); p.poly([[w / 2 - 4, 0], [w / 2 - 14, -0], [w / 2 - 18, 7], [w / 2 - 6, 6]], m.metal); p.line(w / 2 - 6, 6, w / 2 + 2, 8, m.metal);
    return;
  }
  const strips = (x0: number, y0: number, n: number, sw: number, bot: number, fader: boolean, kc: Col[]) => { for (let i = 0; i < n; i++) { const x = x0 + i * sw; p.put(x, y0, kc[i % kc.length]); p.put(x, y0 + 2, kc[(i + 1) % kc.length]); if (fader) { p.vline(x, y0 + 4, bot, C('#141418')); p.put(x, y0 + 4 + ((i * 3) % Math.max(1, bot - y0 - 4)), W); } else p.disc(x + 0.5, y0 + 5, 0.9, CHROME); } };
  const vu = (x: number, y: number, n: number, mw: number) => { for (let i = 0; i < n; i++) { const mx = x + i * (mw + 1); p.rect(mx, y, mw, 3, C('#f0e0a0')); p.line(mx + 1, y + 2, mx + mw - 2, y + 1, BLACK); if (lit) u.fx.rect(mx, y, mw, 3, withAlpha(GLOW, 60)); } };
  const desk = (x0: number, x1: number, top: number, c: Col, legsY: number) => { p.poly([[x0, legsY], [x1, legsY], [x1, top], [x0, top + 3]], c); p.line(x0, top + 3, x1, top, lv(c, 4.4)); };
  if (s === 1) { blk(p, 10, fl - 10, w - 20, 2, m.wood); p.vline(12, fl - 8, fl, m.wood); p.vline(w - 13, fl - 8, fl, m.wood); blk(p, 15, fl - 20, w - 30, 10, C('#4a3a30')); vu(17, fl - 19, 2, 4); strips(18, fl - 15, 4, 4, fl - 11, false, [C('#e8e0c8')]); return; }
  if (s === 2) { blk(p, 6, fl - 8, w - 12, 8, C('#7a7e88')); desk(6, w - 7, fl - 18, C('#8a8e98'), fl - 8); vu(9, fl - 23, 4, 6); p.vline(8, fl - 20, fl - 18, C('#8a8e98')); strips(10, fl - 15, 8, 4, fl - 10, true, [C('#e04848'), CHROME]); return; }
  if (s === 3) { blk(p, 2, fl - 8, w - 4, 8, m.wood); desk(2, w - 3, fl - 20, C('#5a6a7a'), fl - 8); blk(p, 2, fl - 26, w - 4, 5, C('#4a5a6a')); vu(4, fl - 25, 8, 4); strips(4, fl - 17, 24, 2, fl - 10, true, [C('#3a6ac8'), C('#e04848'), C('#f0c040')]); return; }
  if (s === 4) { blk(p, 0, fl - 8, w, 8, C('#2a2a30')); desk(0, w - 1, fl - 21, C('#3a3a42'), fl - 8); blk(p, 0, fl - 27, w, 6, C('#1e1e24')); for (let i = 0; i < 16; i++) for (let k = 0; k < 4; k++) p.put(2 + i * 3, fl - 23 - k, lit ? (k > 2 ? C('#e04848') : C('#48c860')) : DGREY); strips(2, fl - 18, 24, 2, fl - 10, true, [C('#e04848'), CHROME, C('#3a6ac8')]); p.rect(w / 2 - 3, fl - 6, 6, 3, lit ? C('#80c0f0') : C('#2a3a4a')); p.hline(1, w - 2, fl - 27, GOLD); glow(u, w / 2, fl - 24, 14, C('#48c860')); return; }
  if (s === 6) { blk(p, 0, fl - 10, w, 2, m.wood); p.vline(2, fl - 8, fl, m.metal); p.vline(w - 3, fl - 8, fl, m.metal); for (const x of [6, w - 22]) { blk(p, x, fl - 24, 16, 10, BLACK); p.rect(x + 1, fl - 23, 14, 8, lit ? C('#2a3a5a') : C('#14141a')); if (lit) for (let k = 0; k < 6; k++) p.hline(x + 2, x + 2 + ((k * 5) % 11), fl - 22 + k, [C('#e04848'), C('#48c860'), C('#5ae0ff')][k % 3]); p.rect(x + 7, fl - 14, 2, 2, BLACK); } blk(p, 12, fl - 13, w - 24, 3, C('#2a2a30')); strips(14, fl - 13, 12, 2, fl - 11, false, [C('#5ae0ff')]); blk(p, 0, fl - 30, 5, 8, C('#2a2a2e')); blk(p, w - 5, fl - 30, 5, 8, C('#2a2a2e')); glow(u, w / 2, fl - 19, 14, C('#6a8af0')); return; }
  // sala imersiva: console, caixas no alto e anel de luz
  p.rect(0, 0, w, 1, C('#3a3c44')); for (const x of [2, w / 2 - 3, w - 8]) { p.vline(x + 3, 1, 2, C('#3a3c44')); blk(p, x, 3, 6, 7, C('#2a2c34')); p.disc(x + 3, 6.5, 1.8, BLACK); }
  blk(p, 0, fl - 8, w, 8, C('#2a2c34')); desk(0, w - 1, fl - 18, C('#3a3c44'), fl - 8); strips(2, fl - 15, 24, 2, fl - 10, true, [C('#5ae0ff'), W]); blk(p, w / 2 - 8, fl - 24, 16, 6, BLACK); p.rect(w / 2 - 7, fl - 23, 14, 4, lit ? C('#3a5ac8') : C('#14141a'));
  p.hline(1, w - 2, fl, lit ? lv(m.acc, 5) : lv(m.acc, 2)); if (lit) u.fx.ellipse(w / 2, 10, w / 2, 6, withAlpha(m.acc, 40)); glow(u, w / 2, fl - 21, 10, m.acc);
}
/** Piano de ensaio: armário afinado → meia cauda → piano de concerto (cauda longa, da época). */
function uPiano(u: Ud): void {
  if (u.lv === 1) { piano({ ...u, s: 0 }); return; }
  if (u.lv === 2) { piano({ ...u, s: 1 }); return; }
  grandPiano(u);
}
/** Som do palco: corneta e megafone → amplificação valvulada → paredão de caixas → line array suspenso. */
function uPalco(u: Ud): void {
  const { p, m, s, lit, w, h } = u, fl = h - 1;
  if (s === 0) { p.vline(w / 2, 14, fl - 1, BLACK); p.line(w / 2, fl - 1, w / 2 - 6, fl, BLACK); p.line(w / 2, fl - 1, w / 2 + 6, fl, BLACK); p.poly([[w / 2, 12], [w / 2 + 2, 12], [w - 1, 2], [w - 1, 22]], m.metal); p.ellipse(w - 1.5, 12, 1.5, 10, lv(m.metal, 1.4)); p.poly([[2, 26], [8, 24], [8, 30], [2, 28]], C('#c8c8c0')); p.ellipse(1.5, 27, 1.5, 2.5, C('#a8a8a0')); blk(p, 0, 32, 10, fl - 31, m.wood); return; }
  if (s === 1) { for (const y of [fl - 11, fl - 23]) { blk(p, 2, y, w - 4, 12, C('#3a2a20')); p.rect(4, y + 2, w - 8, 8, C('#c8b890')); for (let x = 5; x < w - 5; x += 2) p.vline(x, y + 2, y + 9, C('#a89870')); } blk(p, 6, fl - 30, w - 12, 7, C('#2a2a2a')); for (let i = 0; i < 4; i++) { p.rect(8 + i * 4, fl - 32, 2, 3, lit ? C('#ffb060') : C('#8a6a4a')); } for (let i = 0; i < 3; i++) p.disc(10 + i * 5, fl - 26, 1, CHROME); glow(u, w / 2, fl - 31, 7, C('#ffb060')); return; }
  if (s === 3) { for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { const x = c * 15, y = fl + 1 - (r + 1) * 13; blk(p, x, y, 15, 13, C('#2a2a2e')); p.disc(x + 7.5, y + 7, 4.5, C('#3a3a42')); p.disc(x + 7.5, y + 7, 2, BLACK); p.rect(x + 3, y + 1, 9, 2, C('#141418')); } return; }
  // line array suspenso: treliça presa no teto e caixas curvas
  p.hline(0, w - 1, 0, GREY); for (const x of [6, w - 7]) p.vline(x, 1, 4, BLACK); blk(p, 4, 4, w - 8, 2, C('#3a3a42'));
  for (let i = 0; i < 5; i++) { const y = 6 + i * 4, dx = Math.round(i * i * 0.3); blk(p, 5 + dx, y, w - 10, 4, C('#1e1e24')); p.hline(7 + dx, w - 8 + dx, y + 2, C('#3a3a44')); }
  blk(p, 2, fl - 9, w - 4, 10, C('#1e1e24')); p.disc(w / 2, fl - 4, 3.5, C('#3a3a42')); p.disc(w / 2, fl - 4, 1.5, BLACK);
}
/** Mesa de reunião: mogno com cadeiras → mesa com sistema de apresentação. */
function uReuniao(u: Ud): void {
  const { p, m, s, lit, w, h } = u, fl = h - 1;
  const chair = (x: number, c: Col) => { blk(p, x, fl - 14, 7, 9, c); blk(p, x - 1, fl - 6, 9, 2, c); p.vline(x, fl - 4, fl, BLACK); p.vline(x + 6, fl - 4, fl, BLACK); };
  if (s === 1) { for (const x of [6, w / 2 - 4, w - 14]) chair(x, C('#5a2a1a')); blk(p, 0, fl - 10, w, 3, C('#5a2418')); p.hline(0, w - 1, fl - 8, BRASS); for (const x of [3, w - 6]) blk(p, x, fl - 7, 3, 8, C('#4a1e14')); p.rect(12, fl - 12, 6, 2, PAPER); p.rect(w - 22, fl - 12, 4, 2, withAlpha(C('#c8d8e0'), 220)); return; }
  for (const x of [5, w / 2 - 4, w - 13]) chair(x, C('#3a3c44'));
  blk(p, 0, fl - 10, w, 2, C('#e8e6e0')); p.rect(4, fl - 8, 2, 8, m.metal); p.rect(w - 6, fl - 8, 2, 8, m.metal); p.ellipse(w / 2, fl - 11, 4, 1, lit ? lv(C('#5ae0ff'), 4) : C('#2a2c34'));
  blk(p, w - 20, 0, 18, 11, BLACK); p.rect(w - 19, 1, 16, 9, lit ? C('#2a4a7a') : C('#14141a')); if (lit) { p.rect(w - 17, 6, 2, 3, C('#48c860')); p.rect(w - 14, 4, 2, 5, C('#f0c040')); p.rect(w - 11, 3, 2, 6, C('#e04848')); } p.vline(w - 11, 11, fl - 11, m.metal); glow(u, w - 11, 5, 9, C('#6a8af0'));
}
/** Cama: de ferro com molas → de casal estofada → king ortopédica → cama que mede o sono. */
function uCama(u: Ud): void {
  const { p, m, s, lit, w, h } = u, fl = h - 1;
  const mattress = (x0: number, x1: number, y: number, th: number, c: Col) => { blk(p, x0, y, x1 - x0, th, c); p.hline(x0 + 1, x1 - 2, y, lv(c, 4.6)); };
  if (s === 0) { const iron = C('#2a2a30'); for (const [x, top] of [[0, 2], [w - 2, 8]] as const) { p.vline(x, top, fl, iron); p.vline(x + 1, top, fl, iron); } for (let x = 3; x < 10; x += 2) p.vline(x, 4, 12, iron); p.line(0, 2, 10, 2, iron); p.line(10, 2, 11, 12, iron); p.disc(1, 1.5, 1.2, BRASS); p.disc(w - 1, 7.5, 1.2, BRASS); mattress(2, w - 2, 12, 4, C('#e8e0c8')); p.rect(3, 9, 8, 3, W); blk(p, 14, 10, w - 16, 3, C('#a83a3a')); p.hline(2, w - 3, 16, iron); for (let x = 4; x < w - 3; x += 3) p.put(x, 17, iron); return; }
  if (s === 2) { blk(p, 0, 2, 4, fl - 1, m.fab2); for (let y = 4; y < 14; y += 3) p.put(2, y, lv(m.fab2, 1.4)); mattress(2, w - 1, 12, 5, C('#e8e0c8')); blk(p, 4, 9, 8, 3, W); blk(p, 13, 10, w - 14, 3, m.fab); blk(p, 2, 17, w - 3, 3, m.wood); legs({ ...u, s: 2 }, 3, w - 3, 20); return; }
  if (s === 4) { blk(p, 0, 0, 5, fl - 1, C('#e8e4ec')); p.rect(1, 2, 3, 10, C('#c8c4d0')); mattress(3, w, 9, 7, W); for (let x = 5; x < w - 1; x += 4) p.put(x, 12, lv(W, 2.6)); blk(p, 5, 6, 9, 3, C('#e8e8f0')); blk(p, 15, 7, w - 15, 3, m.fab); blk(p, 3, 16, w - 3, 4, C('#2a2a30')); p.hline(3, w - 1, fl, BLACK); return; }
  blk(p, 0, 0, 5, fl - 3, m.fab); p.rect(1, 3, 3, 2, lit ? m.acc : DGREY); mattress(3, w, 10, 6, W); p.hline(3, w - 1, 13, lit ? lv(m.acc, 4) : C('#d8dce4')); blk(p, 5, 7, 9, 3, C('#e8e8ec')); blk(p, 15, 8, w - 15, 3, m.fab2);
  blk(p, 3, 16, w - 3, 5, C('#2a2c34')); p.hline(4, w - 2, fl, lit ? lv(m.acc, 5) : lv(m.acc, 2)); if (lit) u.fx.hline(2, w - 1, fl, withAlpha(m.acc, 120)); glow(u, 2.5, 4, 3, m.acc);
}
const UDRAW: Record<string, (u: Ud) => void> = {
  telefone: uTelefone, arquivoaco: uArquivo, cofre: uCofre, livrocaixa: uLivro, fichario: uFichario, mesames: uMesa, radiotv: uRadioTv,
  mesasom: uMesaSom, piano: uPiano, palco: uPalco, mesareuniao: uReuniao, cama: uCama,
};
/** Tamanho final do Px de um upgrade (com margem): o do seu item obrigatório. */
export const upgSize = (id: string): { w: number; h: number } => { const s = REQ_SIZE[upgDef31(id)!.req]; return { w: s.w + 2 * DPAD, h: s.h + 2 * DPAD }; };
const cacheU = new Map<string, Px>();
/** Um modelo de upgrade (id de UPG31) pronto. Estilo fixo do modelo; "sem época" (piano de concerto) segue a época do ano. */
export function upgPx(id: string, year: number, o: { cond?: DCond; lit?: boolean } = {}): Px {
  const def = upgDef31(id);
  if (!def || !UDRAW[def.req]) throw new Error(`deco31px: sem upgrade '${id}'`);
  const e = def.style === 'any' ? styOf(Math.max(def.from, year)) : styIdx(def.style), cond = o.cond ?? 'new', lit = !!o.lit;
  const key = `${id}|${e}|${cond}|${lit ? 1 : 0}`;
  const hit = cacheU.get(key);
  if (hit) return hit;
  const { w, h } = REQ_SIZE[def.req];
  const layer = new Px(w, h), fx = new Px(w, h);
  UDRAW[def.req]({ p: layer, fx, s: e, m: M[e], e, lit, w, h, name: '', lv: def.lv });
  if (cond === 'used') wear(layer, hashS(id) + e * 13);
  const out = new Px(w + 2 * DPAD, h + 2 * DPAD);
  out.blit(layer, DPAD, DPAD);
  out.outline(INK);
  out.blit(fx, DPAD, DPAD);
  if (cacheU.size > 600) cacheU.clear();
  cacheU.set(key, out);
  return out;
}
/** Todos os modelos de upgrade, na ordem do catálogo. */
export const UPG_IDS: string[] = UPG31.map((u) => u.id);
