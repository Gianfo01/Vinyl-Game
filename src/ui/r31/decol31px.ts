// R31 · DECO-L — CENAS DAS LOJAS DE DECORAÇÃO e do ESTABELECIMENTO DECORADO, no MESMO corte lateral da loja de
// instrumentos, da casa e da sede (cut27/cutEnd27 de interior27: céu, vizinhos, rua, parede da época, lâmpadas,
// contorno INK nos móveis; mobília do prim27 — sofá, estante, mesa, planta, TV/rádio, vitrola/jukebox, piano,
// pôster, disco de ouro — e bonecos de verdade desenhados pela página entre o fundo e a FRENTE).
// PURO: só Px e o modelo de pontos clicáveis. A peça que o prim27 não tem sai do desenho por categoria da DECO-L
// (pixel/decol31px) até a arte da DECO-A (deco31px) existir.
//   loja: por tipo — móveis (vitrine grande com a rua, mostruário de sala), antiquário (papel adamascado, estante de
//         livros, relógio de parede, peças amontoadas), eletrônicos (prateleira de aparelhos acesos), galeria (parede
//         branca, quadros espaçados com spot e banco); cada peça à venda com etiqueta pequena (preço); quadro do mês;
//         balcão com o vendedor atrás.
//   estabelecimento: o cômodo (bar, palco, loja do selo, sala) com as peças nos lugares do motor da DECO-M (papel de
//         parede, piso/tapete, janela com a cidade e cortina, teto, paredes, chão, balcão, letreiro) e, se for aberto
//         ao público, a clientela.
import { l, type L } from '../../data/world';
import type { DecoDef31 } from '../../data/deco31';
import type { DecoRoom31 } from '../../sim/r31/deco31';
import { abbrText, drawText, textWidth } from '../pixel/font';
import { cut27, cutEnd27, facadeCol27, type Cut27 } from '../pixel/interior27';
import { C, INK, Px, lv, mix, withAlpha, type Col } from '../pixel/px';
import { cityView31, window31 } from '../pixel/window31';
import { STY31, pieceArt31 } from '../pixel/decol31px';
import { prim27 } from '../ps/hqpx27';
import { art31, light31, sign31 } from './decol31art';
import { SH31, SW31, tagPrice31, type Painted31, type Person31px } from './shop31px';
import type { Spot31 } from './scene31model';

export { SH31, SW31 };
const PAPER = C('#fbf6ea');
const col = (d: DecoDef31, i = 0): Col => C(STY31[d.style][i]);
/** Variação estável por peça (qual pôster/pintura). */
const hk = (id: string): number => { let x = 2166136261; for (let i = 0; i < id.length; i++) x = Math.imul(x ^ id.charCodeAt(i), 16777619) >>> 0; return x % 997; };

/** Etiqueta pequena (como a da loja de instrumentos), pendurada por um fio; devolve a caixa. */
function tag(p: Px, txt: string, x: number, y: number, hang = 0): { x: number; y: number; w: number; h: number } {
  const w = textWidth(txt) + 3;
  if (hang) p.vline(x + (w >> 1), y - hang, y - 1, C('#8a7a6a'));
  p.rect(x - 1, y - 1, w + 2, 8, lv(PAPER, 1.4)); p.rect(x, y, w, 6, PAPER); p.hline(x, x + w - 1, y + 5, lv(PAPER, 3.4));
  drawText(p, txt, x + 2, y, INK);
  return { x: x - 1, y: y - 1, w: w + 2, h: 8 };
}

// ---------------------------------------------------------------- uma peça (base embaixo à esquerda)

type G = Cut27['g'];
/** Largura e altura da peça na cena (escala do boneco 24×34, com teto para caber). */
export const pieceSize31 = (d: DecoDef31): { w: number; h: number } => ({ w: Math.max(6, Math.min(56, Math.round(d.w))), h: Math.max(6, Math.min(44, Math.round(d.h))) });
/** Desenha a peça na camada do corte (o contorno INK vem no fechamento). `x` = esquerda; `base` = chão/apoio. */
export function piece31(g: G, d: DecoDef31, x: number, base: number, k: number): { w: number; h: number } {
  const { w, h } = pieceSize31(d);
  const p = g.p, id = d.id, year = g.pl.year;
  const has = (re: RegExp) => re.test(id);
  if (d.cat === 'light') return light31(g, d, x + (w >> 1), base - h);
  if (d.cat !== 'hifi') { const own = art31(g, d, x, base); if (own) return own; }
  switch (d.cat) {
    case 'furniture':
      if (has(/sofa|couch|pit|futon|booth|chaise|lounge/) || (w > h * 1.4 && !has(/table|desk|cart|bed/))) { prim27.couch(g, x, base, Math.max(16, w), col(d)); return { w: Math.max(16, w), h: 14 }; }
      if (has(/chair|armchair|club|stool|ottoman|bag/)) { prim27.couch(g, x, base, Math.max(14, Math.min(22, w)), col(d)); return { w: Math.max(14, Math.min(22, w)), h: 14 }; }
      if (has(/book|shelf|cabinet|sideboard|credenza|case|wardrobe/)) { const hh = Math.max(14, Math.min(40, h)); prim27.shelf(g, x, base - hh, Math.max(12, w), hh, has(/book/) ? 'books' : year < 1955 ? 'records' : year < 1985 ? 'tapes' : 'cds'); return { w: Math.max(12, w), h: hh }; }
      if (has(/desk|table|cart|vanity/)) { prim27.desk(g, x, base, Math.max(16, w)); return { w: Math.max(16, w), h: 12 }; }
      break;
    case 'plant': prim27.plant(g, x + (w >> 1), base, h > 20); return { w, h: h > 20 ? 22 : 12 };
    case 'hifi': { const r = hifi31(g, id, x, base); if (r) return r; break; }
    case 'art':
      if (has(/gold|platinum|disc|record/)) { prim27.goldDisc(g, x, base - 12, has(/platinum/)); return { w: 10, h: 12 }; }
      { // moldura (dourada antes de 1950, preta depois) + a pintura/pôster da época
        const fw = Math.max(10, Math.min(34, w)), fh = Math.max(10, Math.min(30, h));
        prim27.blk(p, x, base - fh, fw, fh, d.style === 'deco' || d.style === 'nouveau' ? C('#c8a040') : C('#26222a'));
        if (k % 2) prim27.poster(g, x + 2, base - fh + 2, fw - 4, fh - 4, k);
        else pieceArt31(p, { ...d, cat: 'art', w: fw - 4, h: fh - 4 }, x + 2, base - 2, year, false);
        return { w: fw, h: fh };
      }
    case 'lamp': { // luminária de pé ou de mesa
      const hh = Math.max(10, Math.min(34, h));
      p.vline(x + (w >> 1), base - hh + 5, base - 1, g.pal.metalDark); p.hline(x + (w >> 1) - 3, x + (w >> 1) + 3, base - 1, g.pal.metalDark);
      p.poly([[x + (w >> 1) - 5, base - hh + 6], [x + (w >> 1) + 5, base - hh + 6], [x + (w >> 1) + 3, base - hh], [x + (w >> 1) - 3, base - hh]], col(d, 1));
      return { w, h: hh };
    }
    case 'sign': return sign31(g, d, x, base, year < 1950 ? 'ABERTO' : year < 1990 ? 'OPEN' : 'ON AIR');
    default: break;
  }
  pieceArt31(p, { ...d, w, h }, x, base, year, false);
  return { w, h };
}
/** Cada aparelho de som e imagem do catálogo com desenho próprio (base embaixo à esquerda). */
function hifi31(g: G, id: string, x: number, b: number): { w: number; h: number } | null {
  const p = g.p, wd = g.pal.wood, wk = g.pal.woodDark, blk = prim27.blk;
  const knob = (cx: number, cy: number, c: Col = C('#e0b030')) => { p.put(cx, cy, c); p.put(cx + 1, cy, lv(c, 2)); };
  const spk = (cx: number, cy: number, r: number) => { p.disc(cx, cy, r, C('#1a1a1e')); p.disc(cx, cy, Math.max(0.8, r * 0.45), C('#4a4a52')); };
  switch (id.replace(/^h_/, '')) {
    case 'gramophone': prim27.recordPlayer({ ...g, pl: { ...g.pl, gear: 'shellac' } }, x, b); return { w: 16, h: 27 };
    case 'music_box': blk(p, x, b - 7, 12, 7, wd); p.rect(x + 1, b - 9, 10, 2, lv(wd, 4)); p.rect(x + 2, b - 6, 8, 3, C('#e8d8a8')); p.disc(x + 6, b - 5, 1.2, C('#c83a2a')); p.line(x + 12, b - 4, x + 14, b - 6, C('#c8a040')); return { w: 15, h: 9 };
    case 'player_piano': prim27.piano(g, x, b); blk(p, x + 8, b - 21, 10, 3, C('#f0e8d0')); for (let i = 0; i < 5; i++) p.put(x + 9 + i * 2, b - 20, INK); return { w: 26, h: 26 };
    case 'cathedral_radio': blk(p, x, b - 16, 14, 16, wd); p.ellipse(x + 7, b - 15, 7, 4, wd); p.rect(x + 3, b - 14, 8, 7, C('#e8d8a8')); for (let i = 0; i < 4; i++) p.vline(x + 4 + i * 2, b - 14, b - 8, lv(wd, 2)); knob(x + 3, b - 4); knob(x + 9, b - 4); return { w: 14, h: 20 };
    case 'console_radio': blk(p, x, b - 22, 26, 22, wd); p.rect(x + 2, b - 20, 22, 2, lv(wd, 4)); p.rect(x + 3, b - 16, 9, 9, C('#d8c8a0')); for (let i = 0; i < 4; i++) p.vline(x + 4 + i * 2, b - 16, b - 8, lv(wd, 2)); p.rect(x + 15, b - 16, 8, 3, C('#f0e090')); knob(x + 16, b - 10); knob(x + 20, b - 10); p.rect(x + 2, b - 3, 2, 3, wk); p.rect(x + 22, b - 3, 2, 3, wk); return { w: 26, h: 22 };
    case 'jukebox': prim27.recordPlayer({ ...g, pl: { ...g.pl, gear: 'reel' } }, x, b); return { w: 14, h: 26 };
    case 'hifi_tube': blk(p, x, b - 9, 26, 9, wk); blk(p, x + 1, b - 12, 13, 3, C('#9a9aa2')); p.ellipse(x + 7, b - 13, 5, 1, INK); for (let i = 0; i < 3; i++) { p.rect(x + 17 + i * 3, b - 15, 2, 5, withAlpha(C('#ffb060'), 200)); p.put(x + 17 + i * 3, b - 15, C('#fff0c0')); } p.rect(x + 16, b - 10, 9, 1, C('#c8ccd4')); return { w: 26, h: 15 };
    case 'tv_fifties': blk(p, x, b - 22, 22, 22, wd); p.rect(x + 3, b - 19, 12, 10, C('#3a4a48')); p.rect(x + 4, b - 18, 4, 3, C('#9ad0c0')); knob(x + 17, b - 17); knob(x + 17, b - 13); for (let i = 0; i < 3; i++) p.hline(x + 3, x + 18, b - 6 + i * 2, lv(wd, 2)); return { w: 22, h: 22 };
    case 'reel_deck': blk(p, x, b - 20, 18, 20, C('#5a5e66')); for (const cy of [b - 15, b - 8]) { p.disc(x + 9, cy, 4, C('#b8bcc4')); p.disc(x + 9, cy, 1.2, INK); } p.line(x + 5, b - 15, x + 5, b - 8, C('#3a2a1e')); p.rect(x + 2, b - 3, 14, 2, C('#2a2a30')); return { w: 18, h: 20 };
    case 'quad_stereo': for (const sx of [x, x + 30]) { blk(p, sx, b - 18, 8, 18, wd); spk(sx + 4, b - 13, 2.5); spk(sx + 4, b - 5, 2); } blk(p, x + 10, b - 8, 18, 8, C('#c8ccd4')); for (let i = 0; i < 4; i++) p.disc(x + 13 + i * 4, b - 4, 1, C('#2a2a30')); p.rect(x + 12, b - 7, 14, 1, C('#40e060')); return { w: 38, h: 18 };
    case 'boombox': blk(p, x, b - 11, 24, 11, C('#3a3a42')); spk(x + 5, b - 5, 3.5); spk(x + 19, b - 5, 3.5); p.rect(x + 10, b - 9, 4, 4, C('#9aa0a8')); p.rect(x + 10, b - 4, 4, 2, C('#c83a2a')); p.line(x + 3, b - 11, x + 6, b - 15, C('#c8ccd4')); p.line(x + 6, b - 15, x + 18, b - 15, C('#c8ccd4')); p.line(x + 18, b - 15, x + 21, b - 11, C('#c8ccd4')); return { w: 24, h: 15 };
    case 'vcr_tv': blk(p, x, b - 6, 20, 6, wk); blk(p, x + 2, b - 9, 16, 3, C('#2a2a30')); p.rect(x + 4, b - 8, 6, 1, C('#7af0a0')); blk(p, x + 1, b - 24, 18, 15, C('#2a2a30')); p.rect(x + 3, b - 22, 12, 10, C('#3a7ab8')); p.rect(x + 4, b - 21, 4, 2, C('#9ad0f0')); return { w: 20, h: 24 };
    case 'cd_micro': for (const sx of [x, x + 18]) { blk(p, sx, b - 12, 7, 12, C('#2a2a30')); spk(sx + 3.5, b - 7, 2.5); } blk(p, x + 8, b - 10, 9, 10, C('#9aa0a8')); p.rect(x + 9, b - 9, 7, 2, C('#40c0f0')); p.ellipse(x + 12, b - 4, 3, 1, C('#d8dce4')); return { w: 25, h: 12 };
    case 'pa_speaker': blk(p, x, b - 36, 16, 18, C('#1e1e22')); blk(p, x, b - 18, 16, 18, C('#1e1e22')); spk(x + 8, b - 28, 5); spk(x + 8, b - 10, 5); p.rect(x + 3, b - 34, 10, 2, C('#5a5e66')); return { w: 16, h: 36 };
    case 'flat_tv': prim27.tv({ ...g, pl: { ...g.pl, year: Math.max(2006, g.pl.year) } }, x + 2, b); return { w: 26, h: 24 };
    case 'smart_speaker': p.rect(x + 2, b - 10, 6, 10, C('#3a3a42')); p.ellipse(x + 5, b - 10, 3, 1, C('#4a4a54')); p.hline(x + 3, x + 7, b - 10, C('#40c0ff')); for (let i = 0; i < 4; i++) p.hline(x + 2, x + 7, b - 8 + i * 2, C('#2a2a30')); p.ellipse(x + 5, b - 13, 4, 1.5, withAlpha(C('#40c0ff'), 90)); return { w: 10, h: 13 };
    case 'vinyl_revival': blk(p, x, b - 6, 20, 6, wd); blk(p, x + 1, b - 8, 18, 2, C('#e8e6e0')); p.ellipse(x + 8, b - 9, 6, 1.4, INK); p.put(x + 8, b - 9, C('#c83a2a')); p.line(x + 16, b - 9, x + 13, b - 10, C('#c8ccd4')); p.put(x + 18, b - 4, C('#40a0ff')); return { w: 20, h: 10 };
    case 'holo': blk(p, x + 2, b - 4, 14, 4, C('#2a2a30')); p.ellipse(x + 9, b - 5, 6, 1.5, C('#60e0ff')); p.poly([[x + 4, b - 5], [x + 14, b - 5], [x + 12, b - 24], [x + 6, b - 24]], withAlpha(C('#80f0ff'), 60)); p.disc(x + 9, b - 20, 2, withAlpha(C('#a0ffff'), 170)); p.rect(x + 8, b - 18, 3, 6, withAlpha(C('#a0ffff'), 150)); return { w: 18, h: 24 };
    case 'karaoke': blk(p, x, b - 14, 16, 14, C('#4a2a6a')); p.rect(x + 2, b - 12, 12, 6, C('#2a2a40')); p.hline(x + 3, x + 12, b - 10, C('#ff60c0')); p.hline(x + 3, x + 9, b - 8, C('#60e0ff')); spk(x + 5, b - 3, 1.5); spk(x + 11, b - 3, 1.5); p.line(x + 17, b - 1, x + 19, b - 12, C('#2a2a30')); p.rect(x + 18, b - 15, 3, 4, C('#9aa0a8')); return { w: 22, h: 15 };
    default: return null;
  }
}

/** Papel de parede (estampa da época por cima da parede do corte), piso/tapete e luz de teto. */
function surfaces(c: Cut27, items: { d: DecoDef31; slot: string }[]): void {
  const { back, layer, x0, w0, y0, fy } = c;
  const paper = items.find((i) => i.slot === 'paper');
  if (paper) {
    const a = col(paper.d), b = col(paper.d, 1);
    for (let y = y0 + 2; y < fy - 12; y++) for (let x = x0; x < x0 + w0; x++) {
      const on = ((x - x0) % 8 === 4 && (y - y0) % 8 === 4) || ((x - x0) % 8 === 0 && (y - y0) % 8 === 0);
      back.put(x, y, on ? b : mix(a, back.get(x, y) || a, 0.35));
    }
    back.rect(x0, fy - 12, w0, 2, lv(a, 1.6)); // rodapé
  }
  const ground = items.find((i) => i.slot === 'ground');
  if (ground) { const a = col(ground.d), b = col(ground.d, 1); back.rect(x0 + 30, fy - 1, w0 - 60, 3, b); back.rect(x0 + 34, fy, w0 - 68, 1, a); }
  for (const it of items.filter((i) => i.slot === 'ceiling')) light31({ ...c.g, p: layer }, it.d, x0 + Math.round(w0 / 2), y0);
}

// ---------------------------------------------------------------- loja

export type DecoShopPx31 = 'furniture' | 'antique' | 'hifi' | 'gallery';
export interface DecoShopItem31 { offer: string; def: DecoDef31; price: string; name: L }
export interface DecoShopArt31 { k: DecoShopPx31; year: number; month?: number; city?: string; seed?: number; name: string; head: string; when: string; weeks: number; items: DecoShopItem31[] }

/** Pinta a loja de decoração e devolve os pontos clicáveis (ids: item:<oferta>, news, counter). */
export function paintDecoShop31(a: DecoShopArt31): Painted31 {
  const city = a.city ?? 'rio', month = a.month ?? 6;
  const c = cut27(SW31, a.year, { floor: a.k === 'antique' ? 'lounge' : 'lobby', dim: false, seed: a.seed ?? 41, city });
  const { g, layer: p, back, fy, y0, x0, w0, pal } = c;
  const spots: Spot31[] = [];
  const texts: string[] = [];
  // ---- fundo por tipo de loja
  if (a.k === 'gallery') { // parede branca de galeria + trilho de spots
    back.rect(x0, y0 + 2, w0, fy - y0 - 12, C('#f2f0ea')); back.rect(x0, fy - 12, w0, 2, C('#d8d4cc'));
    back.rect(x0 + 4, y0 + 4, w0 - 8, 1, C('#3a3a40'));
  } else if (a.k === 'antique') { // papel adamascado escuro, relógio de parede, estante de livros
    for (let y = y0 + 2; y < fy - 12; y++) for (let x = x0; x < x0 + w0; x++) back.put(x, y, ((x + y * 3) % 11 === 0 || (x * 3 - y) % 13 === 0) ? C('#6a3a2a') : C('#4a2a22'));
    prim27.shelf({ ...g, p: back }, x0 + 4, y0 + 8, 34, fy - y0 - 20, 'books');
    back.disc(x0 + 54, y0 + 16, 6, C('#c8a040')); back.disc(x0 + 54, y0 + 16, 4.5, C('#f0e8d0')); back.line(x0 + 54, y0 + 16, x0 + 54, y0 + 12, INK); back.line(x0 + 54, y0 + 16, x0 + 57, y0 + 17, INK);
    back.rect(x0 + 53, y0 + 22, 2, 14, C('#8a5a30')); back.disc(x0 + 54, y0 + 37, 2, C('#c8a040'));
  } else if (a.k === 'hifi') { // prateleira de aparelhos acesos ao fundo
    const sx = x0 + 4, sw = 120;
    prim27.blk(back, sx, y0 + 8, sw, 40, pal.woodDark);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) {
      const bx = sx + 4 + i * 19, by = y0 + 12 + r * 18, k = (i + r * 2) % 4;
      if (a.year < 1955) { // rádios de capela e gramofones
        if (k === 3) { back.rect(bx + 2, by + 8, 12, 4, pal.wood); back.poly([[bx + 7, by + 8], [bx + 9, by + 8], [bx + 15, by - 1], [bx + 9, by - 2]], C('#d8a840')); }
        else { back.rect(bx + 1, by + 1, 14, 11, pal.wood); back.ellipse(bx + 8, by + 2, 7, 3, pal.wood); back.rect(bx + 4, by + 3, 8, 5, C('#e8d8a8')); for (let j = 0; j < 4; j++) back.vline(bx + 5 + j * 2, by + 3, by + 7, lv(pal.wood, 2)); back.put(bx + 5, by + 10, C('#e0b030')); back.put(bx + 11, by + 10, C('#e0b030')); }
      } else if (k === 0) { back.rect(bx, by + 1, 16, 11, C('#26262c')); back.rect(bx + 2, by + 3, 10, 7, a.year < 1980 ? C('#4a6a68') : C('#3a7ab8')); back.rect(bx + 3, by + 4, 3, 2, C('#a8e0f8')); back.put(bx + 14, by + 4, C('#e0e0e0')); back.put(bx + 14, by + 7, C('#e0e0e0')); } // TV
      else if (k === 1) { back.rect(bx, by + 4, 16, 8, C('#b8bcc4')); back.rect(bx + 1, by + 6, 6, 4, C('#26262c')); back.disc(bx + 11, by + 8, 2, C('#3a3a40')); for (let j = 0; j < 5; j++) back.put(bx + 1 + j, by + 5, [C('#40e060'), C('#40e060'), C('#f0e040'), C('#ff4040'), C('#ff4040')][j]); } // receiver com VU
      else if (k === 2) { back.rect(bx + 1, by, 6, 12, C('#3a2a1e')); back.rect(bx + 9, by, 6, 12, C('#3a2a1e')); for (const cx of [bx + 4, bx + 12]) { back.disc(cx, by + 4, 2, C('#1a1a1e')); back.disc(cx, by + 9, 1.5, C('#1a1a1e')); } } // par de caixas
      else { back.rect(bx, by + 6, 16, 6, a.year < 1990 ? pal.woodDark : C('#2a2a30')); back.rect(bx + 1, by + 4, 14, 2, C('#9aa0a8')); back.ellipse(bx + 7, by + 4, 5, 1, INK); back.line(bx + 13, by + 3, bx + 10, by + 4, C('#d0d4dc')); } // toca-discos
      back.hline(sx + 1, sx + sw - 2, by + 14, lv(pal.woodDark, 3.6));
    }
  } else { // móveis: vitrine grande para a rua e quadro "mostruário"
    window31(back, x0 + 4, y0 + 8, 64, 38, city, a.year, month);
    back.rect(x0 + 2, y0 + 46, 68, 2, lv(pal.wood, 4));
  }
  // ---- quadro do mês (como na loja de instrumentos): novidades e a contagem até trocar
  const bx = x0 + w0 - 74, by = y0 + 8, bw = 52, bh = 30;
  prim27.blk(back, bx - 2, by - 2, bw + 4, bh + 4, pal.woodDark);
  back.rect(bx, by, bw, bh, a.k === 'gallery' ? C('#26262c') : C('#24402e'));
  const head = abbrText(a.head, bw - 6); drawText(back, head, bx + 3, by + 3, C('#f0ecd8')); texts.push(head);
  back.hline(bx + 3, bx + 3 + textWidth(head), by + 9, C('#c8c4b0'));
  const when = abbrText(a.when, bw - 8); const ww = textWidth(when) + 4;
  back.rect(bx + bw - ww - 2, by + bh - 9, ww, 7, C('#2a5ab0')); drawText(back, when, bx + bw - ww, by + bh - 8, C('#ffffff')); texts.push(when);
  spots.push({ id: 'news', x: bx - 2, y: by - 2, w: bw + 4, h: bh + 4, label: l('Quadro do mês', 'Board of the month'), tip: l('O estoque inteiro troca na virada do mês', 'The whole stock changes at the turn of the month'), go: { panel: 'news' }, badge: { text: `${a.weeks}`, level: a.weeks <= 1 ? 'soon' : 'info', sym: '⏱' } });
  // ---- peças: parede (quadros, enfeites, letreiros, amostras) e chão (móveis, plantas, aparelhos)
  const items = a.items.slice(0, 7);
  const isWall = (d: DecoDef31) => d.cat === 'art' || d.cat === 'sign' || d.cat === 'collect' || d.cat === 'paper' || d.cat === 'window' || d.cat === 'light' || d.slots[0] === 'wall';
  const wall = items.filter((x) => isWall(x.def)), floor = items.filter((x) => !isWall(x.def));
  const tags: (() => void)[] = [];
  const boxes: { x: number; y: number; w: number; h: number }[] = [];
  const hit = (b: { x: number; y: number; w: number; h: number }) => boxes.some((o) => b.x < o.x + o.w && o.x < b.x + b.w && b.y < o.y + o.h && o.y < b.y + b.h);
  const label = (it: DecoShopItem31, x: number, y: number, hang: number) => {
    const t = tagPrice31(it.price);
    let yy = y; const w = textWidth(t) + 5;
    for (let i = 0; i < 3 && hit({ x: x - 1, y: yy - 1, w, h: 8 }); i++) yy += 8;
    boxes.push({ x: x - 1, y: yy - 1, w, h: 8 }); texts.push(t);
    tags.push(() => tag(px, t, x, yy, hang + (yy - y)));
    return { x: x - 1, y: yy - 1, w, h: 8 };
  };
  let px = back;
  // parede: área livre entre o fundo da loja e o quadro
  const wx0 = a.k === 'antique' ? x0 + 66 : a.k === 'hifi' ? x0 + 130 : a.k === 'furniture' ? x0 + 76 : x0 + 8;
  const wx1 = bx - 6;
  let wx = wx0;
  const wslot = Math.max(16, Math.floor((wx1 - wx0) / Math.max(1, wall.length)));
  for (const it of wall) {
    const d = it.def, sz = pieceSize31(d);
    const top = y0 + 10;
    let size = { w: sz.w, h: sz.h };
    if (d.cat === 'paper' || d.cat === 'window') { // amostra: rolo/cortina pendurado
      const a2 = col(d), b2 = col(d, 1);
      prim27.blk(p, wx, top, 14, 22, a2); for (let yy = top + 3; yy < top + 20; yy += 4) p.hline(wx + 2, wx + 11, yy, b2); size = { w: 14, h: 22 };
    } else if (d.cat === 'light') size = light31({ ...g, p }, d, wx + 10, y0);
    else size = piece31({ ...g, p }, d, wx, top + Math.min(30, sz.h), hk(it.def.id));
    if (a.k === 'gallery') back.poly([[wx + (size.w >> 1) - 2, y0 + 5], [wx + (size.w >> 1) + 2, y0 + 5], [wx + size.w + 2, top + size.h + 4], [wx - 2, top + size.h + 4]], withAlpha(C('#fff4c8'), 30));
    const tb = label(it, wx, top + Math.min(30, Math.max(size.h, 12)) + 3, 2);
    spots.push(itemSpot(it, Math.min(wx, tb.x), top - 2, Math.max(size.w, tb.w), tb.y + tb.h - top + 2));
    wx += Math.max(size.w + 6, wslot);
    if (wx > wx1) break;
  }
  // chão: do canto esquerdo até o balcão; banco no meio da galeria
  let fx = x0 + 6;
  const fx1 = x0 + w0 - 70;
  if (a.k === 'gallery') { prim27.blk(p, x0 + 110, fy - 6, 30, 3, C('#3a3a40')); p.rect(x0 + 112, fy - 3, 2, 3, INK); p.rect(x0 + 136, fy - 3, 2, 3, INK); }
  for (const it of floor) {
    const d = it.def;
    const sz = piece31({ ...g, p }, d, fx, fy, hk(it.def.id));
    const tb = label(it, fx + (sz.w >> 1) - 6, fy - sz.h - 10, 0);
    spots.push(itemSpot(it, Math.min(fx, tb.x), tb.y, Math.max(sz.w, tb.w), fy - tb.y));
    fx += sz.w + 6;
    if (fx > fx1) break;
  }
  // ---- balcão (FRENTE: o vendedor fica atrás) com caixa registradora da época
  const front = new Px(SW31, SH31);
  const kx = x0 + w0 - 56, kw = 44, kh = 14;
  prim27.blk(front, kx, fy - kh, kw, kh, a.k === 'gallery' ? C('#e8e6e0') : pal.wood);
  front.rect(kx - 1, fy - kh - 1, kw + 2, 2, lv(a.k === 'gallery' ? C('#e8e6e0') : pal.wood, 4.2));
  prim27.blk(front, kx + kw - 14, fy - kh - 7, 11, 6, a.year < 1980 ? C('#9a8a6a') : C('#2a2a30')); front.rect(kx + kw - 12, fy - kh - 6, 6, 2, C('#7ad070'));
  if (a.k !== 'gallery') { prim27.blk(front, kx + 4, fy - kh - 6, 12, 6, C('#c8a878')); front.hline(kx + 4, kx + 15, fy - kh - 3, C('#8a6a48')); } // pacote de papel pardo
  front.outline(INK);
  spots.push({ id: 'counter', x: kx - 2, y: fy - kh - 30, w: kw + 4, h: kh + 30, label: l('Balcão', 'Counter'), tip: l('Tudo o que está à venda, em lista', 'Everything for sale, as a list'), go: { panel: 'news' } });
  px = cutEnd27(c, { name: a.name, dim: false, facade: a.k === 'gallery' ? C('#ece8de') : facadeCol27(a.year, 'instruments') });
  for (const f of tags) f();
  texts.push(a.name);
  const people: Person31px[] = [{ id: 'you', x: x0 + w0 - 80, y: fy, dir: 'SE' }, { id: 'clerk', x: kx + 22, y: fy, dir: 'SW', behind: true }];
  return { px, front, spots, people, texts };
}
function itemSpot(it: DecoShopItem31, x: number, y: number, w: number, h: number): Spot31 {
  return { id: `item:${it.offer}`, x, y, w, h, label: it.name, tip: l(`Ver e comprar · ${it.price}`, `View and buy · ${it.price}`), go: { panel: `buy:${it.offer}` }, quiet: true };
}

// ---------------------------------------------------------------- bar: garrafas, copos, espelho, chopeira

const BOTTLE: Col[] = ['#2e6a3a', '#7a2a22', '#b8862a', '#2a3a7a', '#d8d0b8', '#5a2a5a', '#a85a1a'].map((x) => C(x));
/** Uma garrafa de pé com a base em (x, base): 0 vinho (alta e fina), 1 uísque (quadrada), 2 licor (bojuda), 3 champanhe. */
function bottle(p: Px, x: number, base: number, k: number, glass: Col): void {
  const kind = k % 4, lab = [C('#f0e8d0'), C('#e8c860'), C('#f4f4ee'), C('#c83a2a')][(k >> 2) % 4];
  const bw = kind === 1 ? 5 : kind === 2 ? 6 : 4, bh = kind === 0 ? 9 : kind === 3 ? 10 : kind === 1 ? 7 : 6, nh = kind === 2 ? 2 : kind === 1 ? 2 : 4;
  const top = base - bh;
  p.rect(x, top, bw, bh, glass); // corpo
  if (kind === 2) { p.put(x, top, 0); p.put(x + bw - 1, top, 0); }
  p.vline(x, top + 1, base - 2, lv(glass, 4)); // brilho do vidro à esquerda
  p.vline(x + bw - 1, top + 1, base - 1, lv(glass, 1.4));
  p.rect(x + 1, top + Math.round(bh * 0.4), bw - 2, Math.max(2, Math.round(bh * 0.3)), lab); // rótulo
  if (bw > 4) p.put(x + 2, top + Math.round(bh * 0.4) + 1, INK);
  const nx = x + (bw >> 1) - (kind === 3 ? 1 : 0), nw = kind === 3 ? 2 : 1;
  p.rect(nx, top - nh, nw, nh, glass); p.rect(nx, top - nh - 1, nw, 1, kind === 3 ? C('#d8b040') : C('#6a4a2a')); // gargalo + rolha/cápsula
}
/** Fundo do bar: espelho com moldura, duas prateleiras de garrafas, copos emborcados, luz quente embaixo e chopeira. */
function backBar(p: Px, x0: number, x1: number, y0: number, year: number, pal: Cut27['pal']): void {
  const w = x1 - x0, my = y0 + 24, mh = 34;
  // espelho (reflexo em diagonal) com moldura de madeira
  prim27.blk(p, x0, my, w, mh, pal.woodDark);
  p.rect(x0 + 2, my + 2, w - 4, mh - 4, year < 1960 ? C('#9aa8a8') : C('#7a8a98'));
  for (let i = 0; i < w; i += 9) p.line(x0 + 3 + i, my + mh - 3, x0 + 3 + i + 10, my + 3, withAlpha(C('#ffffff'), 40));
  // duas prateleiras de vidro/madeira com garrafas variadas (as da direita com as cores invertidas)
  for (const [row, sy] of [[0, my + 15], [1, my + mh - 3]] as const) {
    p.rect(x0 + 2, sy, w - 4, 2, lv(pal.wood, 3.6)); p.hline(x0 + 2, x0 + w - 3, sy + 2, lv(pal.wood, 1.2));
    p.rect(x0 + 2, sy - 1, w - 4, 1, withAlpha(C('#ffd889'), 70)); // luz quente sob a prateleira
    let x = x0 + 4, k = row * 3 + 1;
    while (x < x1 - 9) { const gl = BOTTLE[(k * 5 + row) % BOTTLE.length]; bottle(p, x, sy, k, gl); x += (k % 4 === 2 ? 7 : k % 4 === 1 ? 6 : 5) + (k % 3 === 0 ? 2 : 1); k++; }
  }
  // copos emborcados na bandeja (balcão de trás) e a chopeira (a partir de 1930)
  const gy = my + mh + 6;
  prim27.blk(p, x0 + 4, gy, 30, 2, pal.metalDark);
  for (let i = 0; i < 6; i++) { const gx = x0 + 6 + i * 4; p.rect(gx, gy - 4, 3, 4, withAlpha(C('#d8e8f0'), 170)); p.put(gx, gy - 4, C('#ffffff')); }
  if (year >= 1930) { const tx = x1 - 26; prim27.blk(p, tx, gy - 2, 20, 4, C('#9aa0a8')); for (let i = 0; i < 3; i++) { p.rect(tx + 3 + i * 6, gy - 9, 2, 7, C('#c8ccd4')); p.rect(tx + 2 + i * 6, gy - 11, 4, 2, [C('#c83a2a'), C('#2a5aa0'), C('#e0b030')][i]); } }
}

// ---------------------------------------------------------------- estabelecimento decorado

export interface EstItem31 { d: DecoDef31; slot: string; x: number }
export interface EstArt31 { year: number; month?: number; city?: string; seed?: number; name: string; room: Pick<DecoRoom31, 'id' | 'spots'>; items: EstItem31[]; pub: boolean }
/** Pinta um cômodo de estabelecimento seu com as peças postas (ids dos pontos: place:<lugar>). */
export function paintEst31(a: EstArt31): Painted31 {
  const city = a.city ?? 'rio', month = a.month ?? 6;
  const c = cut27(SW31, a.year, { floor: 'lounge', dim: a.room.id === 'stage', seed: a.seed ?? 53, city });
  const { g, layer: p, back, fy, y0, x0, w0, pal } = c;
  const spots: Spot31[] = [];
  surfaces(c, a.items);
  const X = (f: number) => Math.round(x0 + f * w0);
  // janela com a cidade (e a cortina, se houver)
  const win = a.room.spots.find((s) => s.slot === 'window');
  if (win) {
    const wx = (a.room.id === 'bar' ? X(0.17) : X(win.x)) - 24, wy = y0 + 10; // no bar a janela fica de lado (o espelho é o fundo)
    window31(back, wx, wy, 48, 30, city, a.year, month);
    const cur = a.items.find((i) => i.slot === 'window');
    if (cur) { const cc = col(cur.d); prim27.blk(back, wx - 6, wy - 3, 8, 36, cc); prim27.blk(back, wx + 46, wy - 3, 8, 36, cc); back.rect(wx - 8, wy - 5, 64, 2, col(cur.d, 1)); }
  }
  // fundo do cômodo
  if (a.room.id === 'bar') backBar(back, X(0.3), X(0.7), y0, a.year, pal);
  else if (a.room.id === 'stage') { prim27.blk(p, x0 + 4, fy - 8, w0 - 8, 8, pal.wood); prim27.amp(g, x0 + 14, fy - 8, true); }
  else if (a.room.id === 'shop') prim27.shelf(g, x0 + 4, y0 + 10, 40, fy - y0 - 22, a.year < 1955 ? 'records' : a.year < 1985 ? 'tapes' : 'cds');
  const base = a.room.id === 'stage' ? fy - 8 : fy;
  // peças: parede, chão (o balcão vai na frente; o que fica "sobre a mesa" vai em cima dele)
  // paredes livres: no bar o espelho ocupa o centro e a janela o lado esquerdo — as peças de parede vão para a direita
  const walls = a.items.filter((i) => i.slot === 'wall');
  const wxs = a.room.id === 'bar' ? walls.map((_, i) => 0.8 + i * 0.11) : walls.map((i) => i.x);
  walls.forEach((it, i) => { const sz = pieceSize31(it.d); piece31(g, it.d, Math.min(x0 + w0 - sz.w - 4, X(wxs[i]) - (sz.w >> 1)), y0 + 14 + Math.min(30, sz.h), hk(it.d.id)); });
  for (const it of a.items.filter((i) => i.slot === 'floor').sort((u, v) => u.x - v.x)) { const sz = pieceSize31(it.d); piece31(g, it.d, Math.max(x0 + 2, Math.min(x0 + w0 - sz.w - 2, X(it.x) - (sz.w >> 1))), base, hk(it.d.id)); }
  const front = new Px(SW31, SH31);
  const desk = a.items.filter((i) => i.slot === 'desk');
  const hasDesk = a.room.spots.some((s) => s.slot === 'desk');
  const kx = X(0.36), kw = X(0.64) - kx, kh = 16;
  if (hasDesk) {
    const top = a.room.id === 'bar' ? C('#6a3a20') : pal.wood;
    prim27.blk(front, kx, fy - kh, kw, kh, top); front.rect(kx - 2, fy - kh - 2, kw + 4, 3, lv(top, 4.4));
    for (let i = 0; i < kw - 6; i += 8) front.rect(kx + 3 + i, fy - kh + 4, 5, kh - 7, lv(top, 2));
    let dx = kx + 4;
    for (const it of desk) { const sz = piece31({ ...g, p: front }, it.d, dx, fy - kh - 2, hk(it.d.id)); dx += sz.w + 4; }
    front.outline(INK);
  }
  const sg = a.items.find((i) => i.slot === 'sign');
  const px = cutEnd27(c, { name: a.name, dim: a.room.id === 'stage', facade: facadeCol27(a.year, 'instruments') });
  if (sg) { const t = a.room.id === 'bar' ? 'BAR' : a.room.id === 'stage' ? (a.year < 1950 ? 'BAILE' : 'AO VIVO') : a.room.id === 'shop' ? 'DISCOS' : 'ABERTO'; const q = new Px(SW31, SH31); const sz = sign31({ ...g, p: q }, sg.d, 0, 40, t); q.outline(INK); px.blit(q, X(0.5) - (sz.w >> 1), y0 + 14 - 40 + sz.h - 10); }
  const people: Person31px[] = [{ id: 'you', x: X(0.12), y: fy, dir: 'SE' }];
  if (hasDesk) people.push({ id: 'clerk', x: kx + (kw >> 1), y: fy, dir: 'SW', behind: true });
  if (a.pub) people.push({ id: 'cust1', x: X(0.3), y: fy, dir: 'SE' }, { id: 'cust2', x: X(0.78), y: fy, dir: 'SW' }, { id: 'cust3', x: X(0.9), y: fy, dir: 'SW' });
  spots.push({ id: 'room', x: x0, y: y0, w: w0, h: fy - y0, label: l('Arrumar este cômodo', 'Arrange this room'), tip: l('Levar peças para cá ou daqui para outro lugar seu', 'Bring pieces here or move them to another of your places'), go: { panel: 'room' }, quiet: true });
  return { px, front, spots, people, texts: sg ? [sg.d.name.pt] : [] };
}
export { cityView31 };
