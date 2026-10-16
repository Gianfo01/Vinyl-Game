// R31 · onda 4 (VIT) — DESENHO DOS ITENS DA VITRINE DO MÊS no pixel art antigo do jogo (mesma camada de adereços dos
// interiores: luz de cima à esquerda pelo `blk`, contorno escuro quente aplicado pela camada, rampa via lv). Cada item
// fica numa prateleira comprida da vitrine (a "prateleira do mês") e muda com a época: o disco é cilindro/goma-laca,
// LP, CD ou vinil redescoberto; a fita é rolo, cassete ou pen drive; o cartaz é litografia, serigrafia ou tela.
//   vitBox31(i, n, G)        — PURO: a caixa do item i de n na prateleira (a área clicável usa a mesma conta);
//   drawVit31(g, itens, G)   — pinta a prateleira e os itens (gancho `extra` do drawInterior27).
// Determinístico: mesma entrada, mesmos pixels. Nada vai para o save.

import { C, INK, lv, mix, withAlpha } from './px';
import { prim27, type Ctx27 } from '../ps/hqpx27';
import type { G31 } from './props31';
import type { VitArt31 } from '../../sim/r31/vitrine31';

export interface VitPx31 { art: VitArt31; rare?: boolean; mine?: boolean }

const blk = prim27.blk;
/** Altura da prateleira (do teto do salão) e tamanho do item. */
export const VIT_SHELF_DY31 = 46, VIT_W31 = 14, VIT_H31 = 14;

/** Caixa do item i de n na prateleira (pixels lógicos). */
export function vitBox31(i: number, n: number, G: G31): { x: number; y: number; w: number; h: number } {
  const span = Math.min(0.86, 0.12 * n);
  const f0 = 0.5 - span / 2;
  const f = n <= 1 ? 0.5 : f0 + (span * i) / (n - 1);
  return { x: G.X(f) - (VIT_W31 >> 1), y: G.y0 + VIT_SHELF_DY31 - VIT_H31, w: VIT_W31, h: VIT_H31 };
}

/** Pinta a prateleira e os itens. */
export function drawVit31(g: Ctx27, items: VitPx31[], G: G31): void {
  if (!items.length) return;
  const { p, pal } = g;
  const year = g.pl.year;
  const a = vitBox31(0, items.length, G), b = vitBox31(items.length - 1, items.length, G);
  const y = G.y0 + VIT_SHELF_DY31;
  // prateleira: tábua com mão-francesa (madeira até 1960, metal depois, acrílico com luz no futuro)
  const shelf = year < 1960 ? pal.wood : year < 2025 ? C('#8a8e98') : C('#bfe8f0');
  blk(p, a.x - 4, y, b.x + b.w - a.x + 8, 3, shelf);
  for (const xx of [a.x - 2, b.x + b.w]) p.rect(xx, y + 3, 2, 4, lv(shelf, 1));
  if (year >= 2025) p.rect(a.x - 4, y + 3, b.x + b.w - a.x + 8, 1, withAlpha(C('#7af0ff'), 70));
  items.forEach((it, i) => {
    const bx = vitBox31(i, items.length, G);
    if (it.rare) p.rect(bx.x - 1, bx.y - 1, bx.w + 2, bx.h + 2, withAlpha(C('#ffd060'), 60)); // brilho do raro
    paint(g, it.art, bx, year, i);
    if (it.mine) { p.rect(bx.x + bx.w - 4, bx.y, 4, 4, C('#ffd060')); p.put(bx.x + bx.w - 3, bx.y + 1, INK); } // ★ seu
  });
}

type B = { x: number; y: number; w: number; h: number };

function paint(g: Ctx27, art: VitArt31, b: B, year: number, i: number): void {
  const { p, pal } = g; const { x, y, w, h } = b;
  const ac = i % 2 ? pal.accent2 : pal.accent;
  switch (art) {
    case 'disc': { // capa + disco saindo (cilindro → goma-laca → LP → CD → vinil redescoberto)
      if (year < 1910) { blk(p, x + 3, y + 2, 8, h - 2, C('#3a2a1a')); p.rect(x + 4, y + 3, 6, h - 4, C('#6a4a2a')); p.rect(x + 3, y + 2, 8, 2, C('#c8a040')); return; }
      if (year >= 1985 && year < 2010) { blk(p, x + 1, y + 2, w - 2, h - 3, C('#d8dce4')); p.disc(x + (w >> 1), y + 8, 4, C('#c8d0e0')); p.put(x + (w >> 1), y + 8, INK); p.rect(x + 2, y + 3, w - 4, 2, ac); return; }
      p.disc(x + w - 5, y + 7, 5, year < 1950 ? C('#1a1418') : C('#141418'));
      p.disc(x + w - 5, y + 7, 2, year < 1950 ? C('#b84a3a') : ac);
      blk(p, x, y + 1, w - 4, h - 1, mix(ac, C('#f0e8d8'), 0.45));
      p.rect(x + 2, y + 3, w - 8, 3, lv(ac, 1)); p.rect(x + 2, y + 8, w - 9, 1, lv(ac, 0));
      return;
    }
    case 'crate': { // caixote de garimpo com capas
      blk(p, x, y + 5, w, h - 5, pal.wood);
      for (let k = 0; k < 4; k++) p.rect(x + 1 + k * 3, y + 1 + (k % 2), 3, 6, k % 2 ? ac : mix(pal.accent2, C('#f0e0c0'), 0.4));
      p.hline(x + 1, x + w - 2, y + 9, lv(pal.wood, 1));
      return;
    }
    case 'guitar': { // guitarra/violão no suporte (corpo de madeira → elétrica colorida)
      const body = year < 1950 ? C('#b8742a') : ac;
      p.vline(x + 7, y, y + 7, C('#3a2a1a')); p.rect(x + 6, y, 3, 2, C('#2a1a10'));
      p.ellipse(x + 7, y + 10, 5, 4, body); p.ellipse(x + 7, y + 7, 3, 2, body);
      p.disc(x + 7, y + 9, 1, INK);
      p.line(x + 3, y + 13, x + 11, y + 13, C('#4a4e58'));
      return;
    }
    case 'amp': { // amplificador / instrumento consignado (caixa com tela)
      blk(p, x + 1, y + 2, w - 2, h - 2, year < 1950 ? pal.wood : C('#26262c'));
      p.rect(x + 3, y + 5, w - 6, h - 8, year < 1950 ? C('#d8c890') : C('#5a5048'));
      for (let yy = y + 6; yy < y + h - 3; yy += 2) p.hline(x + 3, x + w - 4, yy, lv(C('#5a5048'), 1));
      p.rect(x + 3, y + 3, 2, 1, C('#e8e0c8')); p.rect(x + 7, y + 3, 2, 1, C('#e8e0c8'));
      return;
    }
    case 'keys': { // teclado / novidade da época
      blk(p, x, y + 6, w, 6, year < 1965 ? pal.wood : C('#2e2e36'));
      p.rect(x + 1, y + 9, w - 2, 3, C('#f0ece0'));
      for (let k = 0; k < 5; k++) p.rect(x + 2 + k * 2 + (k > 2 ? 1 : 0), y + 9, 1, 2, INK);
      if (year >= 1965) for (let k = 0; k < 4; k++) p.put(x + 2 + k * 3, y + 7, k % 2 ? C('#ff7a40') : C('#7af0ff'));
      p.rect(x + 3, y + 1, w - 6, 4, mix(ac, C('#ffffff'), 0.3)); p.rect(x + 4, y + 2, 3, 1, INK); // etiqueta "novo"
      return;
    }
    case 'drums': {
      p.ellipse(x + 7, y + 9, 5, 4, ac); p.ellipse(x + 7, y + 7, 5, 2, C('#e8e4dc'));
      p.line(x + 1, y + 3, x + 5, y + 6, C('#c8a040')); p.ellipse(x + 3, y + 3, 3, 1, C('#c8a040'));
      return;
    }
    case 'horn': {
      p.line(x + 2, y + 10, x + 10, y + 4, C('#c89a3a')); p.ellipse(x + 11, y + 4, 2, 3, C('#e0b850'));
      p.rect(x + 4, y + 8, 2, 2, C('#a87a2a'));
      return;
    }
    case 'mic': { // microfone da época (fita/condensador/sem fio) no pedestal
      p.vline(x + 7, y + 6, y + h - 1, C('#4a4e58')); p.hline(x + 4, x + 10, y + h - 1, C('#4a4e58'));
      if (year < 1950) { blk(p, x + 4, y, 7, 7, C('#8a8e98')); for (let yy = y + 1; yy < y + 6; yy += 2) p.hline(x + 5, x + 9, yy, C('#3a3e48')); }
      else { p.disc(x + 7, y + 3, 3, C('#9aa0aa')); p.disc(x + 7, y + 3, 1, C('#3a3e48')); }
      return;
    }
    case 'poster': { // cartaz: litografia → serigrafia colorida → tela
      if (year >= 2010) { blk(p, x, y, w, h, C('#16161c')); p.rect(x + 1, y + 1, w - 2, h - 2, mix(ac, C('#202840'), 0.4)); p.rect(x + 3, y + 3, w - 6, 3, C('#f0f0f8')); p.rect(x + 3, y + 8, w - 8, 1, pal.accent2); return; }
      blk(p, x + 1, y, w - 2, h, year < 1950 ? C('#efe2c2') : mix(ac, C('#f8f0e0'), 0.5));
      p.rect(x + 2, y + 1, w - 4, 4, year < 1950 ? C('#5a3a24') : ac);
      p.disc(x + 7, y + 8, 2, year < 1950 ? C('#5a3a24') : pal.accent2);
      p.rect(x + 3, y + 11, w - 6, 1, C('#3a3a3a'));
      return;
    }
    case 'tape': { // rolo → cassete → pen drive
      if (year < 1965) { p.disc(x + 4, y + 8, 4, C('#5a4a3a')); p.disc(x + 10, y + 8, 4, C('#5a4a3a')); p.disc(x + 4, y + 8, 1, C('#c8c0b0')); p.disc(x + 10, y + 8, 1, C('#c8c0b0')); p.hline(x + 4, x + 10, y + 12, C('#2a2018')); return; }
      if (year < 2005) { blk(p, x, y + 4, w, 9, C('#2a2a32')); p.rect(x + 2, y + 5, w - 4, 3, mix(ac, C('#f0f0e0'), 0.4)); p.disc(x + 4, y + 10, 1, C('#e8e8e8')); p.disc(x + 10, y + 10, 1, C('#e8e8e8')); return; }
      blk(p, x + 3, y + 4, 8, 8, ac); p.rect(x + 5, y + 2, 4, 2, C('#c8c8d0'));
      return;
    }
    case 'note': { // bilhete / recado / boato
      p.poly([[x + 2, y + 2], [x + w - 2, y + 1], [x + w - 1, y + h - 2], [x + 1, y + h - 1]], C('#f4ecd0'));
      for (let k = 0; k < 3; k++) p.hline(x + 3, x + w - 4 - k, y + 4 + k * 3, C('#7a7064'));
      p.disc(x + 7, y + 2, 1, C('#c83a3a'));
      return;
    }
    case 'contract': { // contrato na mesa, com caneta
      p.rect(x + 1, y + 3, w - 2, h - 3, C('#f8f4e8')); p.rect(x + 2, y + 4, w - 4, 1, C('#6a6058'));
      for (let k = 0; k < 3; k++) p.hline(x + 3, x + w - 4, y + 6 + k * 2, C('#b0a898'));
      p.line(x + w - 5, y + h - 3, x + w - 1, y + 2, C('#1a1a22')); p.put(x + w - 1, y + 2, C('#c8a040'));
      return;
    }
    case 'lot': { // lote/relíquia: pedestal com brilho
      blk(p, x + 3, y + 8, 8, h - 8, C('#5a4a6a'));
      p.disc(x + 7, y + 5, 3, C('#ffd060')); p.put(x + 6, y + 4, C('#fff8e0'));
      p.rect(x + 2, y + 1, 10, 1, withAlpha(C('#ffd060'), 80));
      return;
    }
    case 'gear': { // equipamento de estúdio (rack/mesa)
      blk(p, x, y + 3, w, h - 3, C('#34343c'));
      for (let k = 0; k < 3; k++) { p.rect(x + 2, y + 5 + k * 3, w - 4, 2, C('#4a4a54')); p.put(x + 3 + k * 3, y + 5 + k * 3, k === 1 ? C('#ff7a40') : C('#7af0ff')); }
      return;
    }
    case 'person': return; // gente entra na cena como pessoa
  }
}
