// R31 · DECO-L — desenho de CADA peça de decoração do catálogo da DECO-M que o prim27 não tem (móveis, coleção,
// luminárias, luzes de teto e plantas), no estilo da mobília das cenas: vista lateral, chapado com luz de cima à
// esquerda (`blk`), cores da época/estilo, contorno INK aplicado no fechamento do corte. Base embaixo à esquerda
// (x, b = chão/apoio); luz de teto pendurada a partir de `top`. Devolve o tamanho desenhado (ou null = sem desenho).
// A arte final por id e estilo é da DECO-A (pixel/deco31px); isto cobre o catálogo inteiro até lá.

import type { DecoDef31 } from '../../data/deco31';
import type { Cut27 } from '../pixel/interior27';
import { C, INK, lv, withAlpha, type Col } from '../pixel/px';
import { STY31 } from '../pixel/decol31px';
import { prim27 } from '../ps/hqpx27';
import { drawText, textWidth } from '../pixel/font';

type G = Cut27['g'];
type WH = { w: number; h: number };
const blk = prim27.blk;
const GOLD = C('#d8b040'), BRASS = C('#b88a3a'), CHROME = C('#c8ccd4'), STEEL = C('#7a8088'), BLACK = C('#1e1e24'), WHITE = C('#f0eee8'), GLASS = C('#a8d0e0');
const LEAF = C('#3a8a3a'), LEAF2 = C('#2a6a2a'), POT = C('#b0603a');

/** Sofá/poltrona com estilo (curvo, pés palito, modular, baixo…). */
function seat(g: G, x: number, b: number, w: number, c: Col, o: { legs?: 'pin' | 'wood' | 'none' | 'chrome'; back?: number; round?: boolean } = {}): WH {
  const p = g.p, bh = o.back ?? 7;
  blk(p, x, b - 7 - bh, w, bh, lv(c, 2.6)); // encosto
  if (o.round) { p.put(x, b - 7 - bh, 0); p.put(x + w - 1, b - 7 - bh, 0); }
  blk(p, x + 2, b - 8, w - 4, 4, c); // assento
  blk(p, x, b - 10, 3, 7, lv(c, 2)); blk(p, x + w - 3, b - 10, 3, 7, lv(c, 2)); // braços
  p.rect(x + 4, b - 12, Math.min(6, w / 4), 3, lv(c, 4)); // almofada
  const lc = o.legs === 'pin' ? C('#2a2a30') : o.legs === 'chrome' ? CHROME : C('#4e3420');
  if (o.legs !== 'none') { p.rect(x + 1, b - 3, o.legs === 'pin' ? 1 : 2, 3, lc); p.rect(x + w - 3, b - 3, o.legs === 'pin' ? 1 : 2, 3, lc); }
  else p.rect(x, b - 3, w, 3, lv(c, 1.4));
  return { w, h: 7 + bh };
}
/** Móvel de guardar (aparador, cômoda) com portas/gavetas e pés. */
function cabinet(g: G, x: number, b: number, w: number, h: number, c: Col, glass = false, inlay?: Col): WH {
  const p = g.p;
  blk(p, x, b - h, w, h - 3, c);
  const n = Math.max(2, Math.round(w / 12));
  for (let i = 0; i < n; i++) {
    const dx = x + 2 + Math.round(i * (w - 4) / n), dw = Math.round((w - 4) / n) - 1;
    p.rect(dx, b - h + 3, dw, h - 9, glass ? GLASS : lv(c, 2.2));
    if (glass) p.line(dx + 1, b - 7, dx + dw - 2, b - h + 4, withAlpha(WHITE, 90));
    p.put(dx + dw - 2, b - h + (h >> 1), GOLD);
  }
  if (inlay) p.hline(x + 2, x + w - 3, b - h + 1, inlay);
  p.rect(x + 1, b - 3, 2, 3, lv(c, 1)); p.rect(x + w - 3, b - 3, 2, 3, lv(c, 1));
  return { w, h };
}
function leaves(g: G, cx: number, y: number, n: number, len: number, spread = 0.32, c1 = LEAF, c2 = LEAF2): void {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * spread;
    const l = len * (0.65 + ((i * 7) % 5) / 12);
    g.p.line(cx, y, cx + Math.cos(a) * l * 0.6, y + Math.sin(a) * l, i % 2 ? c1 : c2);
  }
}
const pot = (g: G, x: number, b: number, w: number, h: number, c: Col = POT): void => { blk(g.p, x, b - h, w, h, c); g.p.hline(x - 1, x + w, b - h, lv(c, 4)); };

/** Desenha a peça pelo id; null = não tem desenho próprio aqui. */
export function art31(g: G, d: DecoDef31, x: number, b: number): WH | null {
  const p = g.p, a = C(STY31[d.style][0]), wd = g.pal.wood, wk = g.pal.woodDark;
  switch (d.id) {
    // ---------------------------------------------------------------- móveis
    case 'd_chaise_nouveau': { blk(p, x, b - 8, 32, 4, a); p.line(x, b - 8, x + 4, b - 16, wd); p.line(x + 1, b - 8, x + 5, b - 16, wd); blk(p, x + 1, b - 14, 6, 6, lv(a, 2.6)); p.rect(x + 2, b - 4, 1, 4, wd); p.rect(x + 28, b - 4, 1, 4, wd); return { w: 32, h: 16 }; }
    case 'd_armchair_nouveau': return seat(g, x, b, 18, C('#7a2a3a'), { legs: 'wood', back: 12, round: true });
    case 'd_screen_nouveau': { for (let i = 0; i < 3; i++) { const px = x + i * 10; blk(p, px, b - 32, 9, 30, wd); p.rect(px + 1, b - 30, 7, 26, C('#e8d8b0')); p.line(px + 2, b - 8, px + 6, b - 24, LEAF); p.disc(px + 5, b - 22, 1.5, C('#d06a7a')); } return { w: 29, h: 32 }; }
    case 'd_sideboard_nouveau': return cabinet(g, x, b, 34, 22, wk, false, C('#6aa0c0'));
    case 'd_bookcase_nouveau': { blk(p, x, b - 38, 24, 38, C('#8a5a30')); prim27.shelf(g, x + 2, b - 36, 20, 32, 'books'); p.line(x + 3, b - 6, x + 20, b - 34, withAlpha(WHITE, 60)); return { w: 24, h: 38 }; }
    case 'd_plantstand_nouveau': { p.vline(x + 5, b - 18, b - 1, BLACK); p.line(x + 5, b - 2, x + 1, b, BLACK); p.line(x + 5, b - 2, x + 9, b, BLACK); p.hline(x + 1, x + 9, b - 18, BLACK); pot(g, x + 2, b - 18, 7, 4); leaves(g, x + 5, b - 22, 6, 9); return { w: 11, h: 30 }; }
    case 'd_sofa_deco': return seat(g, x, b, 42, C('#3a2a24'), { legs: 'chrome', back: 8, round: true });
    case 'd_club_chair': return seat(g, x, b, 20, C('#6a3a20'), { legs: 'none', back: 9, round: true });
    case 'd_bar_cart_deco': { p.hline(x, x + 18, b - 16, CHROME); p.hline(x, x + 18, b - 8, CHROME); p.vline(x + 1, b - 16, b - 3, CHROME); p.vline(x + 17, b - 16, b - 3, CHROME); p.disc(x + 2, b - 2, 1.5, BLACK); p.disc(x + 16, b - 2, 1.5, BLACK); for (let i = 0; i < 4; i++) p.rect(x + 3 + i * 4, b - 21, 2, 5, [C('#7a2a22'), C('#b8862a'), C('#2e6a3a'), GLASS][i]); p.rect(x + 5, b - 11, 3, 3, GLASS); p.rect(x + 11, b - 11, 3, 3, GLASS); return { w: 19, h: 21 }; }
    case 'd_cabinet_deco': return cabinet(g, x, b, 36, 22, BLACK, false, GOLD);
    case 'd_vanity_deco': { blk(p, x, b - 12, 24, 9, wd); p.rect(x + 2, b - 3, 2, 3, wk); p.rect(x + 20, b - 3, 2, 3, wk); p.disc(x + 12, b - 22, 8, GOLD); p.disc(x + 12, b - 22, 6.5, GLASS); p.line(x + 9, b - 18, x + 14, b - 26, withAlpha(WHITE, 120)); p.rect(x + 5, b - 14, 3, 2, C('#d06a7a')); return { w: 24, h: 30 }; }
    case 'd_desk_deco': { prim27.desk(g, x, b, 38); blk(p, x + 26, b - 15, 10, 3, BLACK); p.rect(x + 4, b - 16, 6, 3, GOLD); return { w: 38, h: 16 }; }
    case 'd_sofa_fifties': return seat(g, x, b, 40, C('#3ab0a8'), { legs: 'pin', back: 6 });
    case 'd_eames_chair': { seat(g, x, b, 18, C('#2a2026'), { legs: 'chrome', back: 10, round: true }); blk(p, x + 20, b - 6, 8, 3, C('#2a2026')); p.rect(x + 23, b - 3, 1, 3, CHROME); return { w: 28, h: 17 }; }
    case 'd_diner_booth': { blk(p, x, b - 20, 4, 20, C('#c83030')); blk(p, x + 32, b - 20, 4, 20, C('#c83030')); blk(p, x + 4, b - 8, 28, 3, CHROME); p.rect(x + 17, b - 5, 2, 5, CHROME); p.rect(x + 8, b - 11, 4, 3, C('#f0d060')); p.rect(x + 22, b - 12, 3, 4, C('#c83030')); return { w: 36, h: 20 }; }
    case 'd_boomerang_table': { p.poly([[x, b - 7], [x + 27, b - 9], [x + 24, b - 6], [x + 3, b - 5]], C('#f07878')); p.hline(x + 1, x + 25, b - 9, lv(C('#f07878'), 4)); for (const lx of [x + 3, x + 13, x + 23]) p.line(lx, b - 5, lx + 1, b, BLACK); return { w: 28, h: 9 }; }
    case 'd_credenza_fifties': return cabinet(g, x, b, 36, 18, C('#a0602a'));
    case 'd_shell_chair': { p.poly([[x + 1, b - 22], [x + 14, b - 22], [x + 13, b - 10], [x + 2, b - 10]], C('#f07878')); blk(p, x + 1, b - 11, 14, 3, C('#f07878')); p.line(x + 4, b - 8, x + 2, b, BLACK); p.line(x + 11, b - 8, x + 13, b, BLACK); p.line(x + 3, b - 4, x + 12, b - 4, BLACK); return { w: 16, h: 22 }; }
    case 'd_bean_bag': { p.ellipse(x + 10, b - 6, 10, 6, C('#d0702a')); p.ellipse(x + 8, b - 9, 6, 3, lv(C('#d0702a'), 4)); p.hline(x + 2, x + 18, b - 1, lv(C('#d0702a'), 1.2)); return { w: 20, h: 12 }; }
    case 'd_conversation_pit': { blk(p, x, b - 10, 52, 10, C('#b8862a')); blk(p, x + 4, b - 6, 44, 6, lv(C('#d0702a'), 2.6)); for (let i = 0; i < 4; i++) p.rect(x + 7 + i * 11, b - 9, 7, 3, C('#e0a040')); return { w: 52, h: 10 }; }
    case 'd_egg_chair': { p.ellipse(x + 11, b - 18, 10, 12, C('#c83030')); p.ellipse(x + 13, b - 17, 6, 8, lv(C('#c83030'), 1.6)); p.rect(x + 10, b - 6, 2, 5, CHROME); p.hline(x + 5, x + 17, b - 1, CHROME); return { w: 22, h: 30 }; }
    case 'd_waterbed': { blk(p, x, b - 8, 44, 8, wd); p.rect(x + 2, b - 11, 40, 4, C('#3a7ab8')); for (let i = 0; i < 40; i += 6) p.hline(x + 3 + i, x + 5 + i, b - 10, C('#7ab0e0')); p.rect(x + 3, b - 13, 8, 2, WHITE); return { w: 44, h: 13 }; }
    case 'd_macrame_chair': { p.vline(x + 10, b - 34, b - 22, wk); p.ellipse(x + 10, b - 13, 9, 9, C('#e8d8b0')); for (let i = -6; i <= 6; i += 3) p.line(x + 10, b - 22, x + 10 + i, b - 5, C('#c8a878')); blk(p, x + 4, b - 9, 12, 3, C('#d0702a')); return { w: 20, h: 34 }; }
    case 'd_rattan_set': { seat(g, x, b, 22, C('#c8a060'), { legs: 'wood', back: 8, round: true }); for (let i = 0; i < 20; i += 3) p.vline(x + 1 + i, b - 15, b - 9, C('#a07840')); p.ellipse(x + 32, b - 8, 7, 2, GLASS); p.rect(x + 31, b - 6, 2, 6, C('#a07840')); return { w: 40, h: 15 }; }
    case 'd_sofa_eighties': { for (let i = 0; i < 3; i++) seat(g, x + i * 16, b, 16, C('#7a7a84'), { legs: 'none', back: 6 }); return { w: 48, h: 13 }; }
    case 'd_glass_desk': { p.rect(x, b - 15, 36, 2, withAlpha(GLASS, 200)); p.hline(x, x + 35, b - 15, WHITE); p.rect(x + 2, b - 13, 2, 13, CHROME); p.rect(x + 32, b - 13, 2, 13, CHROME); p.rect(x + 22, b - 22, 9, 7, BLACK); p.rect(x + 23, b - 21, 7, 5, C('#3a7ab8')); return { w: 36, h: 22 }; }
    case 'd_memphis_shelf': { blk(p, x, b - 36, 28, 4, C('#e040a0')); blk(p, x + 4, b - 32, 4, 32, BLACK); blk(p, x + 20, b - 32, 4, 32, C('#30c0e0')); blk(p, x + 8, b - 20, 12, 3, C('#f0d040')); for (let i = 0; i < 4; i++) p.rect(x + 9 + i * 3, b - 26, 2, 6, [C('#e04040'), WHITE, C('#30c0e0'), BLACK][i]); p.disc(x + 14, b - 6, 3, C('#f0d040')); return { w: 28, h: 36 }; }
    case 'd_arcade_cab': { blk(p, x, b - 36, 18, 36, C('#2a2436')); p.rect(x + 2, b - 34, 14, 4, C('#ff48c8')); p.rect(x + 3, b - 28, 12, 9, C('#40e0ff')); p.rect(x + 4, b - 27, 4, 3, WHITE); blk(p, x - 1, b - 18, 20, 3, C('#3a2a5a')); p.put(x + 5, b - 20, C('#ff4040')); p.vline(x + 5, b - 19, b - 18, BLACK); p.disc(x + 11, b - 17, 1, C('#f0e040')); p.rect(x + 7, b - 10, 4, 2, C('#f0d040')); return { w: 18, h: 36 }; }
    case 'd_futon': { blk(p, x, b - 5, 40, 5, C('#c8a060')); blk(p, x + 1, b - 9, 38, 4, C('#3a4a6a')); blk(p, x + 1, b - 14, 38, 5, lv(C('#3a4a6a'), 2.6)); return { w: 40, h: 14 }; }
    case 'd_leather_sofa90': return seat(g, x, b, 44, BLACK, { legs: 'chrome', back: 8 });
    case 'd_cd_tower': { p.vline(x + 4, b - 34, b - 1, STEEL); p.hline(x + 1, x + 8, b - 1, STEEL); for (let y = b - 33; y < b - 2; y += 2) p.hline(x + 1, x + 7, y, [C('#e04040'), C('#3a7ab8'), WHITE, C('#f0d040'), BLACK][(y >> 1) % 5]); return { w: 9, h: 34 }; }
    case 'd_pool_table': { blk(p, x, b - 16, 48, 5, wk); p.rect(x + 2, b - 16, 44, 2, C('#2a8a4a')); p.disc(x + 14, b - 17, 1.2, WHITE); p.disc(x + 30, b - 17, 1.2, C('#e04040')); p.disc(x + 33, b - 17, 1.2, C('#f0d040')); p.rect(x + 3, b - 11, 4, 11, wk); p.rect(x + 41, b - 11, 4, 11, wk); p.line(x + 10, b - 22, x + 30, b - 18, C('#c8a060')); return { w: 48, h: 22 }; }
    case 'd_lowsofa_min': return seat(g, x, b, 44, C('#d8d0c0'), { legs: 'wood', back: 4 });
    case 'd_floating_shelf': { blk(p, x, b - 4, 30, 3, C('#e8e4dc')); p.rect(x + 3, b - 10, 3, 6, C('#3a3a3e')); p.rect(x + 8, b - 9, 8, 5, C('#c8a060')); p.disc(x + 22, b - 7, 2.5, C('#d8d0c0')); return { w: 30, h: 10 }; }
    case 'd_standing_desk': { blk(p, x, b - 22, 34, 3, C('#e8e4dc')); p.rect(x + 4, b - 19, 2, 19, STEEL); p.rect(x + 28, b - 19, 2, 19, STEEL); p.hline(x + 1, x + 9, b - 1, STEEL); p.hline(x + 25, x + 33, b - 1, STEEL); p.rect(x + 12, b - 30, 12, 8, BLACK); p.rect(x + 13, b - 29, 10, 6, C('#3a7ab8')); return { w: 34, h: 30 }; }
    case 'd_bench_min': { blk(p, x, b - 9, 36, 3, C('#c8a060')); p.rect(x + 3, b - 6, 3, 6, C('#a07840')); p.rect(x + 30, b - 6, 3, 6, C('#a07840')); return { w: 36, h: 9 }; }
    case 'd_smart_sofa': { seat(g, x, b, 46, C('#5a6a7a'), { legs: 'none', back: 6 }); p.hline(x + 3, x + 42, b - 3, C('#40c0ff')); p.rect(x + 1, b - 12, 2, 2, C('#40c0ff')); return { w: 46, h: 13 }; }
    case 'd_massage_chair': { blk(p, x + 2, b - 28, 12, 18, C('#3a3a42')); blk(p, x, b - 12, 22, 6, C('#3a3a42')); blk(p, x + 16, b - 10, 6, 10, lv(C('#3a3a42'), 2)); p.rect(x + 4, b - 26, 8, 2, C('#40c0ff')); p.rect(x + 1, b - 6, 14, 6, lv(C('#3a3a42'), 1.4)); return { w: 22, h: 28 }; }
    case 'd_pod_bed': { p.ellipse(x + 23, b - 8, 23, 8, WHITE); p.ellipse(x + 23, b - 9, 20, 4, C('#d0e8f0')); p.rect(x + 4, b - 11, 8, 3, C('#f8f8f8')); p.hline(x + 6, x + 40, b - 2, C('#40c0ff')); return { w: 46, h: 16 }; }
    case 'd_bar_counter': { blk(p, x, b - 24, 56, 4, wk); blk(p, x + 2, b - 20, 52, 20, wd); for (let i = 0; i < 52; i += 9) p.rect(x + 4 + i, b - 17, 6, 13, lv(wd, 2)); p.hline(x + 2, x + 53, b - 2, BRASS); return { w: 56, h: 24 }; }
    case 'd_merch_rack': { p.hline(x, x + 28, b - 28, CHROME); p.vline(x + 1, b - 28, b - 1, CHROME); p.vline(x + 27, b - 28, b - 1, CHROME); for (let i = 0; i < 6; i++) { const tx = x + 3 + i * 4; p.rect(tx, b - 26, 4, 10, [C('#1e1e24'), C('#c83030'), WHITE, C('#3a6ab0'), C('#f0d040'), C('#1e1e24')][i]); p.put(tx + 1, b - 22, i % 2 ? BLACK : WHITE); } return { w: 28, h: 28 }; }
    case 'd_record_bin': { blk(p, x, b - 12, 28, 12, C('#8a6040')); for (let i = 0; i < 9; i++) p.rect(x + 2 + i * 3, b - 16 + (i % 3), 2, 5, [C('#e04040'), C('#f0d040'), C('#3a7ab8'), WHITE, C('#40a060')][i % 5]); p.rect(x + 9, b - 8, 10, 4, C('#f0e8d0')); return { w: 28, h: 16 }; }
    case 'd_piano_bench': { blk(p, x, b - 10, 20, 4, C('#7a2a3a')); p.rect(x + 2, b - 6, 2, 6, wk); p.rect(x + 16, b - 6, 2, 6, wk); return { w: 20, h: 10 }; }
    case 'd_coat_stand': { p.vline(x + 6, b - 34, b - 1, wk); p.line(x + 6, b - 2, x + 1, b, wk); p.line(x + 6, b - 2, x + 11, b, wk); p.line(x + 6, b - 32, x + 2, b - 35, wk); p.line(x + 6, b - 32, x + 10, b - 35, wk); blk(p, x + 1, b - 31, 5, 12, C('#5a4a3a')); p.rect(x + 7, b - 33, 5, 3, C('#2a2a30')); return { w: 12, h: 35 }; }
    // ---------------------------------------------------------------- coleção e enfeites
    case 'c_bust': { blk(p, x + 2, b - 4, 8, 4, WHITE); p.rect(x + 3, b - 8, 6, 4, C('#e0dcd0')); p.disc(x + 6, b - 11, 3, C('#e8e4d8')); p.rect(x + 3, b - 14, 6, 2, C('#c8c4b8')); return { w: 12, h: 14 }; }
    case 'c_globe': { p.vline(x + 6, b - 4, b - 1, BRASS); p.hline(x + 3, x + 9, b - 1, wk); p.disc(x + 6, b - 9, 5, C('#3a7ab8')); p.rect(x + 3, b - 11, 3, 2, LEAF); p.rect(x + 7, b - 8, 3, 3, LEAF); p.ring(x + 6, b - 9, 5.5, BRASS); return { w: 12, h: 14 }; }
    case 'c_grandfather_clock': { blk(p, x, b - 40, 14, 40, wk); p.disc(x + 7, b - 33, 5, C('#f0e8d0')); p.line(x + 7, b - 33, x + 7, b - 36, INK); p.line(x + 7, b - 33, x + 9, b - 32, INK); p.rect(x + 3, b - 26, 8, 20, lv(wk, 1.4)); p.vline(x + 7, b - 26, b - 12, BRASS); p.disc(x + 7, b - 11, 2, GOLD); p.rect(x - 1, b - 41, 16, 2, lv(wk, 3)); return { w: 14, h: 41 }; }
    case 'c_metronome': { p.poly([[x, b], [x + 6, b], [x + 4, b - 10], [x + 2, b - 10]], wd); p.line(x + 3, b - 2, x + 5, b - 10, CHROME); return { w: 6, h: 10 }; }
    case 'c_deco_statue': { blk(p, x + 1, b - 3, 7, 3, BLACK); p.line(x + 4, b - 3, x + 4, b - 10, BRASS); p.line(x + 4, b - 10, x + 1, b - 14, BRASS); p.line(x + 4, b - 10, x + 7, b - 15, BRASS); p.disc(x + 4, b - 12, 1.2, C('#f0e8d8')); p.line(x + 4, b - 6, x + 6, b - 3, BRASS); return { w: 8, h: 15 }; }
    case 'c_cocktail_set': { blk(p, x, b - 2, 14, 2, CHROME); p.rect(x + 2, b - 10, 4, 8, CHROME); p.rect(x + 3, b - 12, 2, 2, CHROME); p.poly([[x + 8, b - 8], [x + 13, b - 8], [x + 11, b - 5], [x + 10, b - 5]], GLASS); p.vline(x + 10, b - 5, b - 3, GLASS); p.put(x + 10, b - 7, C('#d03040')); return { w: 14, h: 12 }; }
    case 'c_aquarium': { blk(p, x, b - 5, 26, 5, wk); p.rect(x + 1, b - 18, 24, 13, withAlpha(C('#4ab0d0'), 210)); p.hline(x + 1, x + 24, b - 18, CHROME); p.rect(x + 1, b - 7, 24, 2, C('#e0c890')); p.line(x + 4, b - 7, x + 5, b - 14, LEAF); p.line(x + 20, b - 7, x + 19, b - 13, LEAF); p.rect(x + 9, b - 13, 3, 2, C('#f08030')); p.put(x + 12, b - 12, C('#f08030')); p.rect(x + 15, b - 10, 2, 1, C('#f0d040')); p.put(x + 8, b - 16, WHITE); return { w: 26, h: 18 }; }
    case 'c_jukebox_mini': { p.rect(x, b - 9, 6, 9, C('#c83030')); p.ellipse(x + 3, b - 9, 3, 2, C('#c83030')); p.rect(x + 1, b - 7, 4, 3, C('#ffe0a0')); return { w: 6, h: 11 }; }
    case 'c_disco_ball': { p.vline(x + 6, b - 18, b - 13, STEEL); p.disc(x + 6, b - 7, 6, CHROME); for (let yy = -5; yy <= 5; yy += 2) for (let xx = -5; xx <= 5; xx += 2) if (xx * xx + yy * yy < 26) p.put(x + 6 + xx, b - 7 + yy, (xx + yy) % 4 ? C('#9aa0aa') : WHITE); return { w: 12, h: 18 }; }
    case 'c_rubik': { const cs = [C('#e04040'), C('#40a060'), C('#3a7ab8'), C('#f0d040'), C('#f08030'), WHITE]; for (let i = 0; i < 9; i++) p.rect(x + (i % 3) * 2, b - 6 + Math.floor(i / 3) * 2, 2, 2, cs[(i * 2) % 6]); return { w: 6, h: 6 }; }
    case 'c_cassette_wall': { blk(p, x, b - 20, 30, 20, BLACK); for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) { const cx = x + 2 + i * 7, cy = b - 18 + r * 5; p.rect(cx, cy, 6, 4, [C('#e04040'), C('#f0d040'), C('#3a7ab8'), WHITE][(i + r) % 4]); p.rect(cx + 1, cy + 1, 4, 1, BLACK); } return { w: 30, h: 20 }; }
    case 'c_gameconsole': { blk(p, x, b - 4, 12, 4, C('#2a2a30')); p.rect(x + 1, b - 3, 3, 1, C('#40e060')); p.rect(x + 3, b - 7, 6, 3, C('#3a3a42')); p.put(x + 7, b - 6, C('#e04040')); return { w: 12, h: 7 }; }
    case 'c_action_figures': { blk(p, x, b - 2, 28, 2, C('#e8e4dc')); for (let i = 0; i < 6; i++) { const fx = x + 2 + i * 4, c = [C('#e04040'), C('#3a7ab8'), C('#40a060'), C('#f0d040'), C('#8a4ac0'), C('#f08030')][i]; p.rect(fx, b - 7, 2, 5, c); p.put(fx, b - 8, C('#e0b088')); p.put(fx + 1, b - 8, C('#e0b088')); } return { w: 28, h: 8 }; }
    case 'c_trophy_case': { blk(p, x, b - 38, 26, 38, wk); p.rect(x + 2, b - 36, 22, 32, withAlpha(GLASS, 120)); for (let r = 0; r < 3; r++) { p.hline(x + 2, x + 23, b - 26 + r * 10, lv(wk, 3)); for (let i = 0; i < 3; i++) { const tx = x + 4 + i * 7, ty = b - 26 + r * 10; p.rect(tx + 1, ty - 2, 2, 2, GOLD); p.rect(tx, ty - 6, 4, 4, GOLD); p.put(tx - 1, ty - 5, GOLD); p.put(tx + 4, ty - 5, GOLD); } } return { w: 26, h: 38 }; }
    case 'c_drumhead': { p.disc(x + 9, b - 9, 9, WHITE); p.ring(x + 9, b - 9, 9, CHROME); p.line(x + 4, b - 10, x + 13, b - 7, C('#2a2a7a')); p.line(x + 5, b - 13, x + 11, b - 12, C('#c83030')); return { w: 18, h: 18 }; }
    case 'c_setlist_frame': { blk(p, x, b - 16, 12, 16, BLACK); p.rect(x + 2, b - 14, 8, 12, WHITE); for (let i = 0; i < 5; i++) p.hline(x + 3, x + 6 + (i % 3), b - 12 + i * 2, INK); return { w: 12, h: 16 }; }
    case 'c_ceramic_min': { p.ellipse(x + 4, b - 6, 4, 6, C('#d8d4cc')); p.rect(x + 3, b - 14, 3, 3, C('#d8d4cc')); p.vline(x + 2, b - 10, b - 3, WHITE); return { w: 8, h: 14 }; }
    case 'c_robot_vac': { p.ellipse(x + 5, b - 2, 5, 2, C('#2a2a30')); p.put(x + 5, b - 3, C('#40c0ff')); return { w: 10, h: 4 }; }
    case 'c_drone_cam': { blk(p, x, b - 2, 10, 2, C('#e8e4dc')); p.rect(x + 3, b - 4, 4, 2, C('#3a3a42')); p.hline(x, x + 9, b - 5, STEEL); p.put(x + 5, b - 3, C('#40c0ff')); return { w: 10, h: 5 }; }
    case 'c_fireplace': { blk(p, x, b - 32, 34, 32, C('#d8ccb8')); blk(p, x - 2, b - 32, 38, 3, lv(C('#d8ccb8'), 2.4)); p.rect(x + 7, b - 22, 20, 22, BLACK); p.poly([[x + 10, b - 2], [x + 14, b - 12], [x + 17, b - 6], [x + 20, b - 15], [x + 24, b - 2]], C('#f08030')); p.poly([[x + 13, b - 2], [x + 17, b - 9], [x + 21, b - 2]], C('#f8d050')); p.rect(x + 9, b - 3, 16, 2, C('#4e3420')); return { w: 34, h: 32 }; }
    case 'c_piano_grand': { blk(p, x, b - 20, 44, 6, BLACK); p.poly([[x + 6, b - 20], [x + 38, b - 30], [x + 40, b - 20]], BLACK); p.rect(x + 2, b - 16, 12, 2, WHITE); for (let i = 0; i < 6; i++) p.put(x + 3 + i * 2, b - 16, INK); for (const lx of [x + 3, x + 22, x + 40]) p.rect(lx, b - 14, 2, 14, BLACK); p.line(x + 8, b - 21, x + 36, b - 29, lv(BLACK, 4)); return { w: 44, h: 30 }; }
    case 'c_candles': { p.hline(x + 1, x + 9, b - 1, CHROME); p.vline(x + 5, b - 9, b - 1, CHROME); p.line(x + 5, b - 7, x + 1, b - 9, CHROME); p.line(x + 5, b - 7, x + 9, b - 9, CHROME); for (const cx of [x + 1, x + 5, x + 9]) { p.rect(cx, b - (cx === x + 5 ? 13 : 12), 1, 3, WHITE); p.put(cx, b - (cx === x + 5 ? 14 : 13), C('#f8c040')); } return { w: 10, h: 14 }; }
    // ---------------------------------------------------------------- luminárias
    case 'l_tiffany': { p.vline(x + 6, b - 8, b - 1, BRASS); p.hline(x + 3, x + 9, b - 1, BRASS); p.poly([[x, b - 8], [x + 12, b - 8], [x + 9, b - 15], [x + 3, b - 15]], C('#3a8a5a')); p.rect(x + 3, b - 12, 2, 2, C('#d04040')); p.rect(x + 7, b - 11, 2, 2, C('#f0c040')); return { w: 12, h: 15 }; }
    case 'l_gas_sconce': { p.rect(x + 2, b - 4, 4, 4, BRASS); p.line(x + 4, b - 4, x + 4, b - 8, BRASS); p.poly([[x + 1, b - 8], [x + 7, b - 8], [x + 6, b - 12], [x + 2, b - 12]], withAlpha(C('#fff0c0'), 210)); return { w: 8, h: 12 }; }
    case 'l_deco_floor': { p.vline(x + 6, b - 30, b - 1, BLACK); p.hline(x + 2, x + 10, b - 1, BLACK); for (let i = 0; i < 3; i++) p.rect(x + 2 + i, b - 36 + i * 2, 8 - i * 2, 2, i % 2 ? GOLD : C('#f0e8d0')); return { w: 12, h: 36 }; }
    case 'l_banker': { p.vline(x + 6, b - 6, b - 1, BRASS); p.hline(x + 2, x + 10, b - 1, BRASS); p.ellipse(x + 6, b - 8, 6, 2, C('#2a7a4a')); p.hline(x + 1, x + 11, b - 7, C('#fff0b0')); return { w: 12, h: 10 }; }
    case 'l_arc': { p.line(x + 2, b - 1, x + 2, b - 30, CHROME); p.line(x + 2, b - 30, x + 14, b - 38, CHROME); p.line(x + 14, b - 38, x + 26, b - 30, CHROME); blk(p, x, b - 2, 6, 2, WHITE); p.disc(x + 26, b - 28, 3, CHROME); p.hline(x + 24, x + 28, b - 25, C('#fff0b0')); return { w: 30, h: 38 }; }
    case 'l_atomic': { p.vline(x + 8, b - 34, b - 1, BLACK); p.hline(x + 3, x + 13, b - 1, BLACK); for (const [dx, dy] of [[-6, -34], [6, -30], [-5, -24]]) { p.line(x + 8, b + dy + 4, x + 8 + dx, b + dy, BLACK); p.poly([[x + 8 + dx - 2, b + dy], [x + 8 + dx + 2, b + dy], [x + 8 + dx + 1, b + dy - 3], [x + 8 + dx - 1, b + dy - 3]], C('#f07878')); } return { w: 16, h: 37 }; }
    case 'l_lava': { p.poly([[x, b], [x + 6, b], [x + 4, b - 3], [x + 2, b - 3]], CHROME); p.rect(x + 2, b - 11, 3, 8, C('#e04080')); p.disc(x + 3, b - 8, 1, C('#f0a020')); p.disc(x + 3, b - 5, 1, C('#f0a020')); p.rect(x + 2, b - 13, 3, 2, CHROME); return { w: 6, h: 13 }; }
    case 'l_desk_tensor': { blk(p, x, b - 2, 6, 2, BLACK); p.line(x + 3, b - 2, x + 7, b - 10, BLACK); p.line(x + 7, b - 10, x + 11, b - 7, BLACK); p.poly([[x + 9, b - 8], [x + 13, b - 6], [x + 12, b - 4], [x + 9, b - 5]], C('#e04040')); return { w: 13, h: 10 }; }
    case 'l_led_strip': { blk(p, x, b - 3, 40, 3, C('#2a2a30')); for (let i = 0; i < 40; i += 2) p.put(x + i, b - 2, [C('#ff40c0'), C('#40c0ff'), C('#40e060'), C('#f0e040')][(i >> 1) % 4]); return { w: 40, h: 3 }; }
    case 'l_mushroom': { p.rect(x + 5, b - 5, 2, 5, WHITE); p.ellipse(x + 6, b - 7, 6, 4, C('#f0a020')); p.hline(x + 1, x + 11, b - 5, lv(C('#f0a020'), 1.6)); return { w: 12, h: 11 }; }
    case 'l_neon_sign': { blk(p, x, b - 10, 24, 10, BLACK); p.rect(x + 2, b - 7, 20, 1, C('#ff4040')); p.rect(x + 2, b - 4, 20, 1, C('#ff4040')); for (let i = 3; i < 21; i += 4) p.vline(x + i, b - 7, b - 4, C('#ff8080')); return { w: 24, h: 10 }; }
    case 'l_halogen': { p.vline(x + 5, b - 36, b - 1, STEEL); p.hline(x + 1, x + 9, b - 1, STEEL); p.poly([[x, b - 40], [x + 10, b - 40], [x + 7, b - 36], [x + 3, b - 36]], C('#3a3a42')); p.hline(x + 1, x + 9, b - 40, C('#fff8d0')); return { w: 10, h: 40 }; }
    case 'l_paper_lantern': { p.vline(x + 7, b - 8, b - 1, C('#4e3420')); p.hline(x + 3, x + 11, b - 1, C('#4e3420')); p.ellipse(x + 7, b - 18, 6, 10, C('#f4ecd8')); for (let y = b - 26; y < b - 10; y += 3) p.hline(x + 2, x + 12, y, C('#d8ccb0')); return { w: 14, h: 28 }; }
    case 'l_smart_bulb': { p.ellipse(x + 5, b - 6, 5, 6, C('#40c0ff')); p.ellipse(x + 4, b - 8, 2, 2, WHITE); blk(p, x + 2, b - 2, 6, 2, C('#3a3a42')); p.ellipse(x + 5, b - 6, 7, 8, withAlpha(C('#40c0ff'), 50)); return { w: 10, h: 14 }; }
    // ---------------------------------------------------------------- plantas
    case 'p_bonsai': { blk(p, x + 1, b - 3, 10, 3, C('#3a5a7a')); p.line(x + 6, b - 3, x + 4, b - 7, wk); p.line(x + 4, b - 7, x + 7, b - 9, wk); p.ellipse(x + 4, b - 8, 3, 1.5, LEAF); p.ellipse(x + 8, b - 9, 3, 1.5, LEAF2); return { w: 12, h: 10 }; }
    case 'p_cactus': { pot(g, x + 1, b, 6, 4); p.rect(x + 3, b - 12, 2, 8, LEAF); p.rect(x + 1, b - 9, 2, 1, LEAF); p.rect(x + 1, b - 11, 1, 2, LEAF); p.rect(x + 5, b - 8, 2, 1, LEAF); p.rect(x + 6, b - 10, 1, 2, LEAF); return { w: 8, h: 12 }; }
    case 'p_fern': { p.rect(x + 6, b - 10, 4, 10, WHITE); pot(g, x + 4, b - 10, 8, 4); leaves(g, x + 8, b - 14, 9, 12, 0.36); return { w: 16, h: 26 }; }
    case 'p_ficus': { pot(g, x + 5, b, 8, 6); p.vline(x + 9, b - 20, b - 6, wk); for (let i = 0; i < 9; i++) p.disc(x + 9 + Math.cos(i * 1.7) * 6, b - 22 - Math.sin(i * 2.3) * 8, 2.4, i % 2 ? LEAF : LEAF2); return { w: 18, h: 32 }; }
    case 'p_green_wall': { blk(p, x, b - 30, 36, 30, C('#4e3420')); for (let i = 0; i < 40; i++) p.disc(x + 3 + (i * 7) % 31, b - 27 + (i * 11) % 25, 2.2, [LEAF, LEAF2, C('#5aa04a')][i % 3]); return { w: 36, h: 30 }; }
    case 'p_hydro': { blk(p, x, b - 28, 20, 28, CHROME); for (let r = 0; r < 3; r++) { p.rect(x + 2, b - 26 + r * 9, 16, 2, C('#ff60c0')); for (let i = 0; i < 4; i++) p.disc(x + 4 + i * 4, b - 20 + r * 9, 1.6, LEAF); } return { w: 20, h: 28 }; }
    case 'p_monstera': { pot(g, x + 7, b, 8, 5); for (let i = 0; i < 6; i++) { const lx = x + 11 + Math.cos(-Math.PI / 2 + (i - 2.5) * 0.5) * 9, ly = b - 14 - Math.sin(Math.PI / 2 + (i - 2.5) * 0.5) * 12; p.line(x + 11, b - 5, lx, ly, LEAF2); p.ellipse(lx, ly, 4, 3, i % 2 ? LEAF : LEAF2); p.put(lx, ly, C('#d8c8a8')); } return { w: 22, h: 30 }; }
    case 'p_orchid': { pot(g, x + 1, b, 6, 4, WHITE); p.line(x + 4, b - 4, x + 5, b - 12, LEAF2); for (const [dx, dy] of [[5, -12], [7, -10], [6, -8]]) p.disc(x + dx, b + dy, 1.4, C('#e070c0')); return { w: 8, h: 12 }; }
    case 'p_palm': { pot(g, x + 6, b, 8, 6, C('#8a6040')); p.line(x + 10, b - 6, x + 10, b - 22, C('#8a6a3a')); leaves(g, x + 10, b - 22, 9, 14, 0.42); return { w: 20, h: 36 }; }
    case 'p_rubber': { pot(g, x + 5, b, 8, 6); p.vline(x + 9, b - 30, b - 6, wk); for (let i = 0; i < 7; i++) p.ellipse(x + 9 + (i % 2 ? 4 : -4), b - 10 - i * 3.5, 3.5, 2, i % 2 ? LEAF2 : C('#1e4a1e')); return { w: 18, h: 32 }; }
    case 'p_spider': { p.vline(x + 7, b - 20, b - 12, STEEL); pot(g, x + 3, b - 6, 8, 6, WHITE); for (let i = 0; i < 7; i++) p.line(x + 7, b - 8, x + 1 + i * 2, b - (i % 2 ? 1 : 3), i % 2 ? LEAF : C('#8ac060')); return { w: 14, h: 20 }; }
    case 'p_succulents': { blk(p, x, b - 3, 14, 3, C('#d8d4cc')); for (const cx of [x + 3, x + 7, x + 11]) { p.disc(cx, b - 5, 2, C('#6aa080')); p.put(cx, b - 6, C('#a0d0b0')); } return { w: 14, h: 7 }; }
    default: return null;
  }
}

/** Luz de teto pendurada a partir de `top` (centro em cx). */
export function light31(g: G, d: DecoDef31, cx: number, top: number): WH {
  const p = g.p, glow = withAlpha(C('#ffe8a0'), 26);
  const cone = (y: number, w0: number, reach: number) => p.poly([[cx - w0, y], [cx + w0, y], [cx + reach, y + 60], [cx - reach, y + 60]], glow);
  switch (d.id) {
    case 't_crystal': { p.vline(cx, top, top + 4, BRASS); p.poly([[cx - 12, top + 8], [cx + 12, top + 8], [cx, top + 18]], withAlpha(GLASS, 200)); for (let i = -10; i <= 10; i += 4) { p.vline(cx + i, top + 8, top + 12, WHITE); p.put(cx + i, top + 13, C('#fff8d0')); } p.hline(cx - 12, cx + 12, top + 8, GOLD); cone(top + 14, 8, 26); return { w: 26, h: 18 }; }
    case 't_deco_dish': { p.vline(cx, top, top + 4, BRASS); p.ellipse(cx, top + 6, 10, 2.5, C('#f0ece0')); p.hline(cx - 9, cx + 9, top + 8, BRASS); cone(top + 8, 8, 22); return { w: 20, h: 9 }; }
    case 't_fluorescent': { blk(p, cx - 15, top, 30, 3, C('#d0d4dc')); p.hline(cx - 13, cx + 13, top + 3, C('#f4fbff')); cone(top + 3, 13, 22); return { w: 30, h: 4 }; }
    case 't_gas_pendant': { p.vline(cx, top, top + 6, BRASS); p.ellipse(cx, top + 9, 5, 4, withAlpha(C('#fff0c0'), 220)); p.hline(cx - 5, cx + 5, top + 6, BRASS); cone(top + 10, 3, 18); return { w: 14, h: 14 }; }
    case 't_industrial': { for (const dx of [-10, 0, 10]) { p.vline(cx + dx, top, top + 6, BLACK); p.poly([[cx + dx - 4, top + 11], [cx + dx + 4, top + 11], [cx + dx + 2, top + 6], [cx + dx - 2, top + 6]], C('#3a4a3a')); p.hline(cx + dx - 2, cx + dx + 2, top + 12, C('#fff0b8')); } cone(top + 12, 12, 26); return { w: 30, h: 13 }; }
    case 't_laser': { blk(p, cx - 6, top, 12, 6, BLACK); for (const [dx, c] of [[-20, C('#ff2040')], [0, C('#40ff60')], [20, C('#4060ff')]] as [number, Col][]) p.line(cx, top + 6, cx + dx, top + 50, withAlpha(c, 150)); return { w: 16, h: 6 }; }
    case 't_led_panel': { blk(p, cx - 12, top, 24, 2, WHITE); p.hline(cx - 11, cx + 11, top + 2, C('#ffffff')); cone(top + 2, 12, 24); return { w: 24, h: 3 }; }
    case 't_rice_globe': { p.vline(cx, top, top + 4, BLACK); p.disc(cx, top + 11, 7, C('#f4ecd8')); for (let y = top + 6; y < top + 17; y += 3) p.hline(cx - 6, cx + 6, y, C('#d8ccb0')); cone(top + 12, 5, 20); return { w: 16, h: 18 }; }
    case 't_smart_ceiling': { p.ellipse(cx, top + 2, 15, 2, WHITE); p.hline(cx - 14, cx + 14, top + 3, C('#ffd0a0')); cone(top + 3, 12, 26); return { w: 30, h: 4 }; }
    case 't_sputnik': { p.vline(cx, top, top + 6, BRASS); p.disc(cx, top + 10, 2.5, BRASS); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, ex = cx + Math.cos(a) * 11, ey = top + 10 + Math.sin(a) * 7; p.line(cx, top + 10, ex, ey, BRASS); p.put(Math.round(ex), Math.round(ey), C('#fff8d0')); } cone(top + 10, 6, 24); return { w: 24, h: 20 }; }
    case 't_stage_par': { p.hline(cx - 15, cx + 15, top + 1, BLACK); for (const [dx, c] of [[-11, C('#ff4040')], [-4, C('#40a0ff')], [4, C('#f0e040')], [11, C('#40e060')]] as [number, Col][]) { blk(p, cx + dx - 2, top + 2, 5, 6, BLACK); p.hline(cx + dx - 1, cx + dx + 1, top + 8, c); p.poly([[cx + dx - 1, top + 9], [cx + dx + 1, top + 9], [cx + dx + 8, top + 60], [cx + dx - 8, top + 60]], withAlpha(c, 26)); } return { w: 30, h: 9 }; }
    case 't_track': { p.hline(cx - 17, cx + 17, top + 1, BLACK); for (const dx of [-12, -2, 8]) { p.line(cx + dx, top + 1, cx + dx + 2, top + 4, BLACK); blk(p, cx + dx + 1, top + 4, 4, 3, C('#2a2a30')); p.poly([[cx + dx + 2, top + 7], [cx + dx + 5, top + 7], [cx + dx + 14, top + 60], [cx + dx - 2, top + 60]], glow); } return { w: 34, h: 7 }; }
    default: { p.vline(cx, top, top + 6, INK); p.poly([[cx - 6, top + 11], [cx + 6, top + 11], [cx + 3, top + 6], [cx - 3, top + 6]], C(STY31[d.style][1])); cone(top + 11, 5, 22); return { w: 14, h: 12 }; }
  }
}

/** Letreiro de cada estilo com o texto dado (base embaixo à esquerda). */
export function sign31(g: G, d: DecoDef31, x: number, b: number, text: string): WH {
  const p = g.p, tw = textWidth(text);
  const put = (tx: number, ty: number, c: Col) => drawText(p, text, tx, ty, c);
  switch (d.id) {
    case 's_painted': { const w = tw + 8; blk(p, x, b - 10, w, 10, C('#2e4a3a')); p.rect(x + 1, b - 9, w - 2, 1, C('#c8a040')); put(x + 4, b - 7, C('#f0e8c8')); return { w, h: 10 }; }
    case 's_brass_plate': { const w = tw + 6; blk(p, x, b - 9, w, 9, BRASS); p.put(x + 1, b - 8, INK); p.put(x + w - 2, b - 8, INK); put(x + 3, b - 7, C('#3a2a10')); return { w, h: 9 }; }
    case 's_gilt_letters': { put(x + 1, b - 7, C('#8a6a20')); put(x, b - 8, GOLD); return { w: tw + 2, h: 8 }; }
    case 's_marquee': { const w = tw + 12; blk(p, x, b - 14, w, 14, C('#c83030')); p.rect(x + 3, b - 11, w - 6, 8, WHITE); put(x + 6, b - 9, INK); for (let i = 1; i < w - 1; i += 3) { p.put(x + i, b - 13, C('#fff0a0')); p.put(x + i, b - 2, C('#fff0a0')); } return { w, h: 14 }; }
    case 's_neon_script': { const w = tw + 8; blk(p, x, b - 12, w, 12, C('#1a1420')); put(x + 4, b - 8, C('#ff70c0')); p.rect(x + 2, b - 3, w - 4, 1, withAlpha(C('#ff70c0'), 160)); return { w, h: 12 }; }
    case 's_googie': { p.vline(x + 14, b - 28, b - 1, STEEL); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.line(x + 14, b - 24, x + 14 + Math.cos(a) * 7, b - 24 + Math.sin(a) * 7, C('#f0d040')); } p.poly([[x, b - 14], [x + tw + 8, b - 18], [x + tw + 10, b - 11], [x + 2, b - 8]], C('#3ab0a8')); put(x + 4, b - 15, WHITE); return { w: Math.max(28, tw + 10), h: 31 }; }
    case 's_supergraphic': { const w = tw + 16; for (let i = 0; i < 4; i++) p.rect(x, b - 18 + i * 4, w, 4, [C('#e05a2a'), C('#f0a020'), C('#f0d040'), C('#8a5a2a')][i]); blk(p, x + 4, b - 13, tw + 8, 9, C('#1e1e24')); put(x + 8, b - 11, WHITE); return { w, h: 18 }; }
    case 's_lightbox': { const w = tw + 10; blk(p, x, b - 12, w, 12, C('#9aa0a8')); p.rect(x + 2, b - 10, w - 4, 8, C('#f8f8f0')); put(x + 5, b - 8, C('#c83030')); return { w, h: 12 }; }
    case 's_steel_letters': { put(x + 1, b - 7, C('#3a3a42')); put(x, b - 8, CHROME); p.hline(x, x + tw, b - 1, STEEL); return { w: tw + 2, h: 9 }; }
    case 's_min_logo': { blk(p, x, b - 10, 12, 10, WHITE); p.disc(x + 6, b - 5, 3, C('#1e1e24')); p.disc(x + 6, b - 5, 1, WHITE); put(x + 14, b - 7, C('#1e1e24')); return { w: tw + 15, h: 10 }; }
    case 's_led_screen': { const w = tw + 14; blk(p, x, b - 20, w, 20, C('#14161c')); for (let yy = b - 18; yy < b - 2; yy += 2) for (let xx = x + 2; xx < x + w - 2; xx += 2) p.put(xx, yy, C('#1e2a3a')); put(x + 7, b - 13, C('#40e0ff')); p.rect(x + 4, b - 6, w - 8, 1, C('#ff40c0')); return { w, h: 20 }; }
    case 's_projection': { p.poly([[x, b], [x + 6, b], [x + tw + 10, b - 18], [x + tw + 2, b - 22]], withAlpha(C('#a0f0ff'), 50)); put(x + 4, b - 20, C('#a0f0ff')); blk(p, x, b - 3, 6, 3, C('#2a2a30')); return { w: tw + 10, h: 22 }; }
    default: { const w = tw + 6; blk(p, x, b - 9, w, 9, C('#2a2026')); put(x + 3, b - 7, C('#ffe2a0')); return { w, h: 9 }; }
  }
}
