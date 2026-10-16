// R31 · onda 4 (H, acabamento POL) — CENA DA LOJA e CENA DA CASA em pixel art, no MESMO corte lateral da sede e dos
// interiores (cut27/cutEnd27 de interior27: céu, vizinhos, rua, parede da época, lâmpadas, contorno INK nos móveis).
// PURO: só Px e o modelo de pontos clicáveis; a página (city31ui.ts) desenha os bonecos entre o fundo e a FRENTE
// (o balcão fica na frente do vendedor: ele aparece do tronco para cima, com os pés no chão atrás do móvel).
//   loja: parede ripada com os instrumentos pendurados, peças de chão (piano, bateria, amplificador…) e a mesa de
//         vitrine com os miúdos e os presentes — cada peça desenhada de verdade (stage31px.inst31) com etiqueta
//         PEQUENA ao lado (laço vermelho = pode dar de presente); quadro "Novidades" com a contagem até o estoque
//         trocar; vitrine de vidro da relíquia (vazia = suporte e plaquinha); balcão; janela para o pátio da garagem
//         com a paisagem real da cidade e da época (window31) e o carro à venda.
//   casa: sala da época (sofá, abajur, rádio/TV, vitrola ou piano, violão no suporte, estante, discos de ouro, janela
//         com a cidade) e a garagem de verdade (parede de bloco, porta basculante, painel de ferramentas, prateleira
//         de latas, mancha de óleo; vazia = bicicleta e caixa de ferramentas — nunca um texto "vazia").
import { l, type L } from '../../data/world';
import { abbrText, drawText, textWidth } from '../pixel/font';
import { cut27, cutEnd27, facadeCol27 } from '../pixel/interior27';
import { carSide31, showcase31 } from '../pixel/props31';
import { C, INK, Px, lv, mix, withAlpha } from '../pixel/px';
import { inst31, instKind31, instSpec31 } from '../pixel/stage31px';
import { cityView31, window31 } from '../pixel/window31';
import { prim27 } from '../ps/hqpx27';
import { registerPol31, type PolScene31 } from './pol31';
import type { Spot31 } from './scene31model';

export const SW31 = 320, SH31 = 150;
/** Chão das cenas (y do pé de quem está de pé no salão). */
export const FLOOR31 = 127;

export type Fam31px = 'guitar' | 'bass' | 'drums' | 'keys' | 'strings' | 'horns' | 'mic' | 'dj' | 'studio' | 'gift';
export interface ShopItem31 { offer: string; fam: Fam31px; /** id do item no catálogo (escolhe o desenho) */ kind?: string; price: string; /** preço curto da etiqueta */ tag?: string; gift: boolean; name: L }
export interface ShopArt31 {
  year: number; month?: number; city?: string; seed?: number;
  /** cabeçalho do quadro, já na língua (ex.: NOVIDADES JUL) */ head: string; /** "MUDA EM 3 SEM" */ when: string; /** rótulo GARAGEM na língua */ gar: string;
  /** nome na fachada */ name?: string;
  weeks: number; items: ShopItem31[]; news: string[];
  relic?: { name: L; stars: number; price: string; offer: string };
  garage?: { price: string; n: number; car: number; tag?: string };
  clerk: boolean;
}
export interface Person31px { id: string; x: number; y: number; dir: 'SE' | 'SW'; behind?: boolean }
export interface Painted31 { px: Px; front: Px; spots: Spot31[]; people: Person31px[]; texts: string[] }

const PAPER = C('#fbf6ea'), BOW = C('#d02828');
/** Preço curto para a etiqueta: "$13,2 mil" → "$13K", "$1,5 mi" → "$1,5M" (o preço inteiro fica na dica). */
export function tagPrice31(full: string): string {
  return full.replace(/\s?mil\b/i, 'K').replace(/\s?mi\b/i, 'M').replace(/\s?bi\b/i, 'B').replace(/([0-9]+)[,.]([0-9])K/, '$1K');
}

/** Etiqueta pequena (papel 1 linha da fonte 3×5) pendurada por um fio; devolve a caixa. */
function tagAt(p: Px, txt: string, x: number, y: number, gift: boolean, hang = 0): { x: number; y: number; w: number; h: number } {
  const w = textWidth(txt) + 3;
  if (hang) p.vline(x + (w >> 1), y - hang, y - 1, C('#8a7a6a'));
  p.rect(x - 1, y - 1, w + 2, 8, lv(PAPER, 1.4)); p.rect(x, y, w, 6, PAPER); p.hline(x, x + w - 1, y + 5, lv(PAPER, 3.4));
  drawText(p, txt, x + 2, y, INK);
  if (gift) { p.rect(x - 2, y, 2, 2, BOW); p.put(x - 3, y + 2, BOW); p.put(x - 1, y + 2, BOW); }
  return { x: x - 3, y, w: w + 3, h: 7 };
}
const hitR = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// ---------------------------------------------------------------- loja

/** Pinta a loja e devolve os pontos clicáveis (ids: item:<oferta>, news, relic, counter, garage). */
export function paintShop31(a: ShopArt31): Painted31 {
  const city = a.city ?? 'rio', month = a.month ?? 6;
  const c = cut27(SW31, a.year, { floor: 'lobby', dim: false, seed: a.seed ?? 31, city });
  const { g, layer: p, back, fy, y0, pal } = c;
  const texts: string[] = [];
  const spots: Spot31[] = [];
  // parede ripada (slatwall) dos instrumentos — pintada no fundo (é parede)
  const slat = mix(pal.wood, C('#e8d8b8'), 0.35);
  back.rect(22, y0 + 6, 118, 44, lv(slat, 2));
  for (let yy = y0 + 7; yy < y0 + 49; yy += 4) { back.hline(23, 138, yy, lv(slat, 3.6)); back.hline(23, 138, yy + 1, slat); back.hline(23, 138, yy + 3, lv(slat, 1.6)); }
  // quadro "Novidades" (lousa) com a contagem
  const bx = 146, by = y0 + 8, bw = 64, bh = 46;
  prim27.blk(back, bx - 2, by - 2, bw + 4, bh + 4, pal.woodDark);
  back.rect(bx, by, bw, bh, C('#24402e'));
  for (let yy = by; yy < by + bh; yy++) for (let xx = bx; xx < bx + bw; xx++) if ((xx * 7 + yy * 13) % 23 === 0) back.put(xx, yy, C('#2e4c38'));
  const head = abbrText(a.head, bw - 6); drawText(back, head, bx + 3, by + 3, C('#f0ecd8')); texts.push(head);
  back.hline(bx + 3, bx + 3 + textWidth(head), by + 9, C('#c8c4b0'));
  a.news.slice(0, 3).forEach((n, i) => { const t = abbrText(n, bw - 6); drawText(back, t, bx + 3, by + 12 + i * 7, i === 3 ? C('#c0c0b0') : C('#f0ecd8')); texts.push(t); });
  const when = abbrText(a.when, bw - 8); const ww = textWidth(when) + 4;
  back.rect(bx + bw - ww - 2, by + bh - 9, ww, 7, C('#2a5ab0')); drawText(back, when, bx + bw - ww, by + bh - 8, C('#ffffff')); texts.push(when);
  back.rect(bx + 4, by + bh, bw - 8, 1, pal.metal); back.rect(bx + 10, by + bh - 1, 4, 1, C('#f0f0e8')); // calha com giz
  spots.push({ id: 'news', x: bx - 2, y: by - 2, w: bw + 4, h: bh + 4, label: l('Quadro de novidades', 'New-stock board'), tip: l('O estoque inteiro troca na virada do mês', 'The whole stock changes at the turn of the month'), go: { panel: 'news' }, badge: { text: `${a.weeks}`, level: a.weeks <= 1 ? 'soon' : 'info', sym: '⏱' } });
  // janela para o pátio da garagem: céu e prédios reais em cima, pátio de concreto com faixas embaixo
  const gx = 244, gy = y0 + 8, gw = 54, gh = 36;
  const fr = a.year < 1960 ? pal.woodDark : C('#8a8e98');
  back.rect(gx, gy, gw, gh, fr); back.hline(gx, gx + gw - 1, gy, lv(fr, 4.2));
  back.blit(cityView31(city, a.year, month, gw - 4, gh - 14), gx + 2, gy + 2);
  const lot = C('#8a8680');
  back.rect(gx + 2, gy + gh - 12, gw - 4, 10, lot);
  for (let i = 0; i < 4; i++) back.line(gx + 6 + i * 13, gy + gh - 3, gx + 9 + i * 13, gy + gh - 11, C('#e8e0c0'));
  back.rect(gx - 2, gy + gh, gw + 4, 2, mix(fr, C('#ffffff'), 0.15));
  const gp = new Px(SW31, SH31); const gg = { ...g, p: gp };
  if (a.garage) carSide31(gg, gx + 5, gy + gh - 16, a.year, 'own', a.garage.car);
  else { gp.poly([[gx + 40, gy + gh - 3], [gx + 43, gy + gh - 10], [gx + 46, gy + gh - 3]], C('#e86a2a')); gp.hline(gx + 41, gx + 45, gy + gh - 6, C('#f0f0e8')); } // cone: pátio esperando carro
  gp.outline(INK); back.blit(gp, 0, 0);
  back.vline(gx + (gw >> 1), gy + 2, gy + gh - 13, fr); back.line(gx + 4, gy + 3, gx + 8, gy + gh - 14, withAlpha(C('#ffffff'), 50));
  const gar = abbrText(a.gar, gw - 6), gtw = textWidth(gar) + 6; // plaquinha GARAGEM embaixo da janela (não por cima do desenho)
  prim27.blk(back, gx + ((gw - gtw) >> 1), gy + gh + 3, gtw, 8, C('#2a2026')); drawText(back, gar, gx + ((gw - gtw) >> 1) + 3, gy + gh + 5, C('#f0d040')); texts.push(gar);
  if (a.garage) { const tg = a.garage.tag ?? tagPrice31(a.garage.price); tagAt(back, tg, gx + gw - textWidth(tg) - 6, gy + 3, false); texts.push(tg); }
  spots.push({ id: 'garage', x: gx - 2, y: gy - 2, w: gw + 4, h: gh + 14, label: l('Janela da garagem', 'Garage window'), tip: a.garage ? l('Carros e motos à venda', 'Cars and bikes for sale') : l('Nada na garagem este mês', 'Nothing in the garage this month'), go: { panel: 'garage' } });
  // instrumentos: parede (pendurados), chão (de pé) e mesa de vitrine (miúdos e presentes)
  const its = a.items.slice(0, 6).map((it, i) => ({ it, i, kind: instKind31(it.kind ?? '', it.fam), sp: instSpec31(it.kind ?? '', it.fam) }));
  const wall = its.filter((x) => x.sp.band === 'wall'), floor = its.filter((x) => x.sp.band === 'floor'), table = its.filter((x) => x.sp.band === 'table');
  const tags: { x: number; y: number; w: number; h: number }[] = [];
  const later: (() => void)[] = []; // etiquetas vão por cima de tudo, sem o contorno grosso dos móveis (ficam pequenas)
  const place = (txt: string, x: number, y: number, gift: boolean, hang: number) => {
    let yy = y;
    const w = textWidth(txt) + 6;
    for (let k = 0; k < 3 && tags.some((t) => hitR(t, { x: x - 3, y: yy, w, h: 8 })); k++) yy += 8;
    const b = { x: x - 3, y: yy, w: w, h: 7 };
    later.push(() => tagAt(out(), txt, x, yy, gift, hang + (yy - y))); tags.push(b); texts.push(txt); return b;
  };
  let outPx: Px | null = null;
  const out = () => outPx!;
  const slotW = Math.min(22, Math.floor(112 / Math.max(1, wall.length)));
  wall.forEach((x, j) => {
    const cx = 30 + j * slotW + (slotW >> 1) - 6, top = y0 + 9;
    const ix = cx - (x.sp.w >> 1);
    p.rect(cx - 1, top - 3, 3, 2, pal.metalDark); // gancho
    inst31(p, x.kind, ix, top, a.year, x.i);
    const tg = x.it.tag ?? tagPrice31(x.it.price);
    const tb = place(tg, cx - ((textWidth(tg) + 3) >> 1), top + x.sp.h + 3, x.it.gift, 2);
    spots.push(itemSpot(x.it, Math.min(ix, tb.x), top - 3, Math.max(x.sp.w, tb.w), tb.y + tb.h - top + 3));
  });
  // chão: do canto esquerdo para o centro; a mesa de vitrine vem por último
  const tw = table.length ? table.reduce((s, x) => s + x.sp.w + 3, 5) : 0;
  const need = floor.reduce((s, x) => s + x.sp.w + 4, 0) + tw;
  const avail = 136 - 22, gap = need > avail ? Math.max(0, 4 - Math.ceil((need - avail) / Math.max(1, floor.length))) : 4;
  let fx = 24;
  for (const x of floor) {
    const top = fy - x.sp.h;
    inst31(p, x.kind, fx, top, a.year, x.i);
    const tg = x.it.tag ?? tagPrice31(x.it.price);
    const tb = place(tg, fx + (x.sp.w >> 1) - ((textWidth(tg) + 3) >> 1), top - 10, x.it.gift, 0);
    spots.push(itemSpot(x.it, Math.min(fx, tb.x), tb.y, Math.max(x.sp.w, tb.w), fy - tb.y));
    fx += x.sp.w + gap;
  }
  if (table.length) {
    const tx = Math.min(fx, 140 - tw), ttop = fy - 12;
    prim27.blk(p, tx, ttop, tw, 3, pal.wood); p.rect(tx + 1, ttop + 3, 2, 9, pal.woodDark); p.rect(tx + tw - 3, ttop + 3, 2, 9, pal.woodDark); // mesa de vitrine
    let ix = tx + 3;
    for (const x of table) {
      inst31(p, x.kind, ix, ttop - x.sp.h, a.year, x.i);
      const tg = x.it.tag ?? tagPrice31(x.it.price);
      const tb = place(tg, ix + (x.sp.w >> 1) - ((textWidth(tg) + 3) >> 1), ttop - x.sp.h - 9, x.it.gift, 0);
      spots.push(itemSpot(x.it, Math.min(ix, tb.x), tb.y, Math.max(x.sp.w, tb.w), ttop - tb.y));
      ix += x.sp.w + 3;
    }
  }
  // vitrine da relíquia: caixa de vidro sobre o móvel; sem peça = suporte vazio e plaquinha
  const vx = 220, vw = 22;
  prim27.blk(p, vx - 1, fy - 14, vw + 2, 14, pal.woodDark); p.rect(vx + 2, fy - 10, vw - 4, 1, lv(pal.woodDark, 4));
  showcase31(g, { x: vx, y: fy - 40, w: vw, h: 26 }, a.year, a.relic ? 1 : 0, (a.relic?.stars ?? 1) * 5);
  if (a.relic) for (let i = 0; i < a.relic.stars; i++) p.rect(vx + 3 + i * 4, fy - 7, 2, 2, pal.gold);
  spots.push({ id: 'relic', x: vx - 2, y: fy - 42, w: vw + 4, h: 42, label: l('Vitrine de relíquia', 'Relic showcase'), tip: a.relic ? l('Peça rara: história, donos e compra', 'Rare piece: history, owners and purchase') : l('Vitrine vazia este mês', 'Empty showcase this month'), go: { panel: 'relic' },
    ...(a.relic ? { badge: { text: '★'.repeat(a.relic.stars), level: 'info' as const } } : {}) });
  // balcão (camada da FRENTE: o vendedor fica atrás, aparece do tronco para cima)
  const front = new Px(SW31, SH31);
  const kx = 166, kw = 48, kh = 14;
  prim27.blk(front, kx, fy - kh, kw, kh, pal.wood);
  front.rect(kx - 1, fy - kh - 1, kw + 2, 2, lv(pal.wood, 4.2));
  front.rect(kx + 3, fy - kh + 4, kw - 6, 1, lv(pal.wood, 2)); front.rect(kx + 3, fy - 5, kw - 6, 1, lv(pal.wood, 2));
  prim27.blk(front, kx + kw - 14, fy - kh - 7, 11, 6, a.year < 1980 ? C('#9a8a6a') : C('#2a2a30')); front.rect(kx + kw - 12, fy - kh - 6, 6, 2, C('#7ad070')); // caixa registradora
  prim27.blk(front, kx + 4, fy - kh - 5, 9, 5, C('#2a5ab0')); front.rect(kx + 8, fy - kh - 5, 1, 5, C('#f0d040')); // pacote de presente
  front.outline(INK);
  spots.push({ id: 'counter', x: kx - 2, y: fy - kh - 30, w: kw + 4, h: kh + 30, label: l('Balcão', 'Counter'), tip: l('Presentear alguém que você conhece', 'Give something to someone you know'), go: { panel: 'gift' } });
  const name = a.name ?? '';
  const px = cutEnd27(c, { name, dim: false, facade: facadeCol27(a.year, 'instruments') });
  outPx = px; for (const f of later) f();
  if (name) texts.push(name);
  const people: Person31px[] = [{ id: 'you', x: 152, y: fy, dir: 'SE' }];
  if (a.clerk) people.push({ id: 'clerk', x: kx + 22, y: fy, dir: 'SW', behind: true });
  return { px, front, spots, people, texts };
}
function itemSpot(it: ShopItem31, x: number, y: number, w: number, h: number): Spot31 {
  return { id: `item:${it.offer}`, x, y, w, h, label: it.name, tip: it.gift ? l(`Ver, comprar ou dar de presente · ${it.price}`, `View, buy or give as a gift · ${it.price}`) : l(`Ver e comprar · ${it.price}`, `View and buy · ${it.price}`), go: { panel: `buy:${it.offer}` }, quiet: true };
}

// ---------------------------------------------------------------- casa

export interface HouseArt31 { year: number; month?: number; city?: string; seed?: number; gar: string; house: string; prestige: number; cars: number; carNames: L[]; piano: boolean; gold: number; pool: boolean; /** ano de fabricação de cada carro */ carYears?: number[] }
export function paintHouse31(a: HouseArt31): Painted31 {
  const city = a.city ?? 'rio', month = a.month ?? 6, year = a.year;
  const c = cut27(SW31, year, { floor: 'lounge', dim: false, seed: a.seed ?? 77, city });
  const { g, layer: p, back, fy, y0, pal } = c;
  const texts: string[] = [];
  const spots: Spot31[] = [];
  // ---- sala (x 18…196)
  window31(back, 28, y0 + 10, 44, 28, city, year, month);
  const ng = Math.min(3, a.gold);
  for (let i = 0; i < ng; i++) prim27.goldDisc({ ...g, p }, 84 + i * 14, y0 + 12, i === 2);
  if (!ng) prim27.poster({ ...g, p }, 88, y0 + 10, 14, 20, year % 6);
  spots.push({ id: 'gold', x: 82, y: y0 + 8, w: 46, h: 20, label: l('Discos na parede', 'Records on the wall'), tip: l('Seus discos de ouro e troféus', 'Your gold records and trophies'), go: { area: 'awards' } });
  prim27.couch({ ...g, p }, 24, fy, 46, pal.fabric);
  // abajur de pé
  p.vline(77, fy - 26, fy - 1, pal.metalDark); p.hline(74, 80, fy - 1, pal.metalDark); p.poly([[73, fy - 26], [81, fy - 26], [79, fy - 32], [75, fy - 32]], year < 1960 ? C('#e8d8a8') : year < 1990 ? C('#e8902c') : C('#f0f0e8'));
  prim27.tv({ ...g, p }, 86, fy);
  if (a.piano) prim27.piano({ ...g, p }, 108, fy);
  else { prim27.recordPlayer({ ...g, p }, 110, fy); }
  // violão no suporte de chão (nunca solto na parede)
  prim27.guitar({ ...g, p }, 140, fy, pal.accent);
  prim27.shelf({ ...g, p }, 150, y0 + 30, 22, fy - y0 - 30, year < 1985 ? 'records' : year < 2008 ? 'cds' : 'records');
  prim27.plant({ ...g, p }, 191, fy, true);
  spots.push({ id: 'sofa', x: 22, y: fy - 18, w: 50, h: 18, label: l('Sala', 'Living room'), tip: l('Descansar, dar uma festa ou ver o seu patrimônio', 'Rest, throw a party or see your wealth'), go: { panel: 'home' } });
  spots.push({ id: 'music', x: 84, y: fy - 28, w: 64, h: 28, label: a.piano ? l('Piano', 'Piano') : l('Som e instrumento', 'Stereo and instrument'), tip: l('Comprar instrumentos na loja da cidade', 'Buy instruments at the city shop'), go: { area: 'loja31' } });
  // parede entre a sala e a garagem
  prim27.blk(back, 198, y0, 5, fy - y0 + 3, lv(pal.wall, 2));
  // ---- garagem (x 204…301): parede de bloco, porta basculante, ferramentas
  const G0 = 204, G1 = 301, gw = G1 - G0;
  const block = mix(C('#8a8478'), pal.wall, 0.25);
  for (let yy = y0; yy < fy + 3; yy++) for (let xx = G0; xx < G1; xx++) {
    const ry = (yy - y0) % 6, row = Math.floor((yy - y0) / 6), off = row % 2 ? 6 : 0;
    back.put(xx, yy, yy >= fy ? lv(C('#9a968c'), 2.6) : ry === 5 || (xx - G0 + off) % 12 === 0 ? lv(block, 1.6) : ry === 0 ? lv(block, 3.6) : block);
  }
  const door = C('#c8ccd0'), dx = 222, dw = 70, dtop = y0 + 22;
  prim27.blk(back, dx - 2, dtop - 2, dw + 4, fy - dtop + 2, lv(C('#6a6e78'), 2.4)); // batente
  if (year < 1950) { // portões de madeira de abrir (tábuas e mão-francesa)
    const wd = pal.wood;
    for (let xx = dx; xx < dx + dw; xx++) back.vline(xx, dtop, fy - 1, (xx - dx) % 5 === 0 ? lv(wd, 1.8) : (xx - dx) % 5 === 1 ? lv(wd, 4) : wd);
    for (const [a0, a1] of [[dx, dx + (dw >> 1) - 1], [dx + (dw >> 1), dx + dw - 1]]) { back.hline(a0, a1, dtop + 4, lv(wd, 2)); back.hline(a0, a1, fy - 6, lv(wd, 2)); back.line(a0 + 1, fy - 7, a1 - 1, dtop + 5, lv(wd, 2.2)); }
    back.vline(dx + (dw >> 1), dtop, fy - 1, lv(wd, 0.8)); back.rect(dx + (dw >> 1) - 2, fy - 22, 4, 2, pal.metalDark);
  } else {
    for (let yy = dtop; yy < fy; yy++) back.hline(dx, dx + dw - 1, yy, (yy - dtop) % 4 === 0 ? lv(door, 4.4) : (yy - dtop) % 4 === 3 ? lv(door, 2) : door); // gomos da basculante
    back.rect(dx + (dw >> 1) - 4, fy - 12, 8, 2, lv(door, 1.6)); // puxador
  }
  // painel de ferramentas e prateleira de latas
  back.rect(G0 + 3, y0 + 12, 14, 30, C('#c8a878')); for (let yy = y0 + 14; yy < y0 + 41; yy += 3) for (let xx = G0 + 4; xx < G0 + 17; xx += 3) back.put(xx, yy, C('#8a6a48'));
  p.vline(G0 + 6, y0 + 15, y0 + 24, C('#8a5a2a')); p.rect(G0 + 5, y0 + 14, 3, 2, C('#4a4e56')); // martelo
  p.vline(G0 + 10, y0 + 16, y0 + 27, C('#9aa0aa')); p.rect(G0 + 9, y0 + 15, 3, 2, C('#9aa0aa')); // chave
  p.poly([[G0 + 13, y0 + 28], [G0 + 15, y0 + 16], [G0 + 16, y0 + 16], [G0 + 16, y0 + 28]], C('#c8ccd0')); p.rect(G0 + 13, y0 + 29, 4, 3, C('#8a3a2a')); // serrote
  p.rect(dx + 4, y0 + 12, dw - 8, 2, pal.woodDark);
  for (let i = 0; i < 5; i++) prim27.blk(p, dx + 8 + i * 12, y0 + 6, 6, 6, [C('#c8302c'), C('#2a5ab0'), C('#e8c030'), C('#e8e0d0'), C('#3a7a4a')][i]);
  back.ellipse(G0 + gw / 2, fy + 1, 16, 1, withAlpha(C('#1a1414'), 80)); // mancha de óleo
  const nCars = Math.min(2, a.cars);
  for (let i = 0; i < nCars; i++) carSide31({ ...g, p }, G0 + 5 + i * 48, fy - 14, a.carYears?.[i] ?? year - i * 6, 'own', i + 1);
  if (!nCars) {
    // bicicleta encostada e caixa de ferramentas de rodinha
    const bx0 = 234, by0 = fy - 5;
    p.ring(bx0, by0, 4.5, C('#2a2a30')); p.ring(bx0 + 15, by0, 4.5, C('#2a2a30'));
    p.line(bx0, by0, bx0 + 6, by0 - 7, C('#c8302c')); p.line(bx0 + 6, by0 - 7, bx0 + 13, by0 - 7, C('#c8302c')); p.line(bx0 + 13, by0 - 7, bx0 + 15, by0, C('#c8302c')); p.line(bx0 + 6, by0 - 7, bx0 + 8, by0, C('#c8302c'));
    p.rect(bx0 + 5, by0 - 9, 4, 1, C('#2a2a30')); p.line(bx0 + 13, by0 - 7, bx0 + 12, by0 - 10, C('#9aa0aa'));
    prim27.blk(p, 262, fy - 16, 18, 14, C('#b8282c')); for (let i = 0; i < 3; i++) p.hline(264, 277, fy - 13 + i * 4, lv(C('#b8282c'), 4.4));
    p.disc(265, fy - 1, 1.5, INK); p.disc(277, fy - 1, 1.5, INK);
  }
  spots.push({ id: 'garage', x: G0, y: y0 + 4, w: gw, h: fy - y0 - 4, label: l('Garagem', 'Garage'), tip: a.cars ? l('Seus veículos', 'Your vehicles') : l('Garagem sem carro: carros e motos na loja', 'No car in the garage: cars and bikes at the shop'), go: { panel: 'garage' },
    ...(a.cars ? { badge: { text: String(a.cars), level: 'info' as const } } : {}) });
  const px = cutEnd27(c, { dim: false, facade: a.prestige >= 5 ? C('#e8e6dc') : facadeCol27(year, 'apartments') });
  return { px, front: new Px(SW31, SH31), spots, people: [{ id: 'you', x: 180, y: fy, dir: 'SW' }], texts };
}

// ---------------------------------------------------------------- exemplos para a checagem automática (POL)
const nm = (s: string): L => l(s, s);
const SHOP_FIX31: ShopArt31[] = [1905, 1958, 1975, 1999, 2036].map((year, k) => ({
  year, city: ['sao_paulo', 'rio', 'rio', 'london', 'new_york'][k], head: 'Novidades MAR', when: `muda em ${k + 1} sem`, gar: 'Garagem', name: 'Loja de instrumentos', weeks: k + 1, clerk: true,
  items: [['accordion', 'keys'], ['tube_amp', 'guitar'], ['solid_body', 'guitar'], ['drum_kit', 'drums'], ['trumpet', 'horns'], ['flowers', 'gift'], ['violin', 'strings'], ['upright_piano', 'keys']]
    .slice(k % 3, k % 3 + 6).map(([kind, fam], i) => ({ offer: `o${i}`, kind, fam: fam as Fam31px, price: `$${(i + 1) * 323}`, gift: i % 2 === 0, name: nm(kind) })),
  news: ['+ Acordeão', '+ Amplificador valvulado', '- esgotou o resto'],
  relic: k % 2 ? { name: nm('Violino'), stars: 3, price: '$9,9 mil', offer: 'r' } : undefined,
  garage: k % 2 ? undefined : { price: '$13,2 mil', n: 1, car: k },
}));
registerPol31('loja31', () => SHOP_FIX31.map((a) => polOf31(`loja31:${a.year}`, paintShop31(a))));
registerPol31('casa31', () => [1925, 1962, 1975, 2004, 2036].map((year, k) => polOf31(`casa31:${year}`,
  paintHouse31({ year, city: ['rio', 'london', 'rio', 'new_york', 'sao_paulo'][k], gar: 'Garagem', house: 'rent', prestige: k, cars: k % 3, carNames: [], piano: k % 2 === 0, gold: k, pool: false }))));
export function polOf31(id: string, d: Painted31): PolScene31 {
  return { id, W: SW31, H: SH31, back: d.px, front: d.front, floors: [FLOOR31], people: d.people, spots: d.spots, texts: d.texts };
}
