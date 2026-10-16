// R31 · onda 4 (H) — CENA DA LOJA e CENA DA CASA em pixel art (estilo antigo do jogo: paleta da era, contorno INK, relevo
// pela silhueta, pontilhado). PURO: só Px e o modelo de pontos clicáveis; a página (city31ui.ts) põe os bonecos e a
// camada de clareza (sceneView31). Tamanho lógico 240×120.
//   loja: parede de instrumentos com etiquetas de preço (laço vermelho = pode dar de presente), quadro "Novidades"
//         com a contagem até o estoque trocar, vitrine da relíquia rara, balcão (presentear) e janela da garagem.
//   casa: sala da época (sofá, vitrola/som, piano ou guitarra na parede, disco emoldurado), janela com a cidade e a
//         garagem com os seus veículos.
import { l, type L } from '../../data/world';
import { paletteOf, type Palette } from '../pixel/palette';
import { drawText, textWidth } from '../pixel/font';
import { C, INK, Px, dith, inked, mix, noise, shade, type Col } from '../pixel/px';
import type { Spot31 } from './scene31model';

export const SW31 = 240, SH31 = 120, FLOOR31 = 98;

function walls(p: Px, pal: Palette, wood: boolean): void {
  p.fill((x, y) => {
    if (y >= FLOOR31) return ((x >> 3) + (y >> 2)) % 2 ? pal.floors.hall.a : pal.floors.hall.b;
    if (wood) { const plank = Math.floor(x / 9); const c = plank % 2 ? pal.wood : shade(pal.wood, -0.08); return shade(c, (noise(plank, y >> 3, 3) - 0.5) * 0.08 - y / FLOOR31 * 0.1); }
    return shade(x % 14 < 7 ? pal.wall : mix(pal.wall, pal.wall2, 0.15), 0.04 - y / FLOOR31 * 0.12);
  });
  p.hline(0, p.w - 1, FLOOR31 - 1, pal.trim);
  p.hline(0, p.w - 1, FLOOR31, shade(pal.trim, -0.3));
}
const tagPx = (p: Px, x: number, y: number, txt: string, bg: Col, fg: Col): number => {
  const w = textWidth(txt) + 4;
  p.rect(x - 1, y - 1, w + 2, 9, INK); p.rect(x, y, w, 7, bg); drawText(p, txt, x + 2, y + 1, fg);
  return w;
};

// ---------------------------------------------------------------- loja

export type Fam31px = 'guitar' | 'bass' | 'drums' | 'keys' | 'strings' | 'horns' | 'mic' | 'dj' | 'studio' | 'gift';
export interface ShopItem31 { offer: string; fam: Fam31px; price: string; gift: boolean; name: L }
export interface ShopArt31 { year: number; /** cabeçalho do quadro, já na língua (ex.: NOVIDADES JUL) */ head: string; /** "MUDA EM 3 SEM" */ when: string; /** rótulo GARAGEM na língua */ gar: string; weeks: number; items: ShopItem31[]; news: string[]; relic?: { name: L; stars: number; price: string; offer: string }; garage?: { price: string; n: number; car: number }; clerk: boolean }

function instrument(p: Px, pal: Palette, f: Fam31px, x: number, y: number, k: number): void {
  const body = [C('#c0502a'), C('#e0b040'), C('#3a3a44'), C('#a02030'), C('#6a4a2a'), C('#2a5ab0')][k % 6];
  inked(p, (q) => {
    if (f === 'guitar' || f === 'strings' || f === 'bass') {
      const long = f === 'bass' ? 4 : 0;
      q.rect(x + 3, y, 2, 14 + long, pal.woodDark); q.rect(x + 2, y - 2, 4, 3, pal.woodDark);
      q.ellipse(x + 4, y + 18 + long, 5, 4, body); q.ellipse(x + 4, y + 23 + long, 6, 5, body); q.disc(x + 4, y + 20 + long, 1, INK);
    } else if (f === 'horns') {
      q.rect(x + 3, y, 2, 16, pal.gold); q.ellipse(x + 6, y + 19, 4, 3, pal.gold); q.rect(x + 1, y + 6, 3, 2, shade(pal.gold, -0.2));
    } else if (f === 'mic' || f === 'dj' || f === 'studio') {
      q.rect(x, y + 6, 9, 14, pal.metalDark); q.rect(x + 1, y + 7, 7, 5, pal.screen); q.disc(x + 4, y + 16, 2, pal.metal);
    } else if (f === 'keys') {
      q.rect(x - 2, y + 10, 14, 6, pal.metalDark); for (let i = 0; i < 6; i++) q.rect(x - 1 + i * 2, y + 11, 1, 4, C('#f4f0e8'));
    } else if (f === 'drums') {
      q.ellipse(x + 4, y + 18, 6, 5, body); q.ellipse(x + 4, y + 14, 6, 2, shade(body, 0.3));
    } else { // presente
      q.rect(x, y + 10, 10, 9, body); q.rect(x + 4, y + 10, 2, 9, C('#f0d040')); q.rect(x, y + 13, 10, 2, C('#f0d040'));
    }
  }, INK, { relief: true });
}
function car(p: Px, x: number, y: number, year: number, k: number): void {
  const col = [C('#d06a2a'), C('#2c4a7e'), C('#a03030'), C('#3a7a4a')][k % 4];
  inked(p, (q) => {
    if (year < 1935) { q.rect(x, y - 8, 18, 6, col); q.rect(x + 4, y - 13, 9, 5, INK); q.rect(x + 5, y - 12, 7, 3, C('#9ab8d0')); }
    else if (year < 1960) { q.ellipse(x + 11, y - 6, 12, 4, col); q.ellipse(x + 11, y - 10, 6, 3, col); q.rect(x + 7, y - 12, 8, 2, C('#9ab8d0')); }
    else if (year < 1996) { q.rect(x, y - 8, 24, 5, col); q.poly([[x + 5, y - 8], [x + 8, y - 13], [x + 17, y - 13], [x + 20, y - 8]], col); q.rect(x + 9, y - 12, 7, 3, C('#9ab8d0')); }
    else { q.rect(x, y - 9, 24, 6, col); q.rect(x + 3, y - 14, 18, 5, col); q.rect(x + 5, y - 13, 14, 3, C('#9ab8d0')); }
    q.disc(x + 5, y - 2, 2, C('#1a1a1a')); q.disc(x + 18, y - 2, 2, C('#1a1a1a'));
  }, INK, { relief: true });
}

/** Pinta a loja e devolve os pontos clicáveis (ids: item:<oferta>, news, relic, counter, garage). */
export function paintShop31(a: ShopArt31): { px: Px; spots: Spot31[] } {
  const pal = paletteOf(a.year), p = new Px(SW31, SH31);
  walls(p, pal, true);
  const spots: Spot31[] = [];
  // trilho dos instrumentos e etiquetas
  p.rect(6, 12, 108, 3, pal.woodDark);
  a.items.slice(0, 6).forEach((it, i) => {
    const x = 10 + i * 18;
    for (let k = 0; k < 3; k++) p.put(x + 4, 15 + k, pal.metalDark);
    instrument(p, pal, it.fam, x, 18, i);
    const ty = 50 + (i % 2) * 10;
    const w = tagPx(p, x - 3, ty, it.price, C('#fbf6ea'), INK);
    if (it.gift) { p.rect(x - 5, ty, 2, 2, C('#d02828')); p.rect(x - 6, ty + 2, 4, 1, C('#d02828')); } // laço = pode presentear
    spots.push({ id: `item:${it.offer}`, x: x - 3, y: 14, w: Math.max(14, w), h: 54 - (i % 2 ? 0 : 10) + (i % 2) * 10, label: it.name, tip: it.gift ? l('Ver, comprar ou dar de presente', 'View, buy or give as a gift') : l('Ver e comprar', 'View and buy'), go: { panel: `buy:${it.offer}` }, quiet: true });
  });
  // amplificadores e bateria no chão (decoração da época)
  inked(p, (q) => {
    q.rect(8, 80, 18, 18, pal.outline); q.rect(9, 81, 16, 16, pal.woodDark); q.rect(11, 84, 12, 9, shade(pal.fabric, -0.45));
    q.rect(30, 86, 12, 12, pal.outline); q.rect(31, 87, 10, 10, shade(pal.fabric, -0.35));
    q.ellipse(70, 88, 9, 6, pal.accent2); q.ellipse(70, 85, 9, 2, shade(pal.accent2, 0.3)); q.ellipse(56, 82, 5, 2, mix(pal.gold, pal.metal, 0.4)); q.vline(56, 82, 97, pal.metalDark);
    q.rect(84, 84, 22, 4, pal.woodDark); q.rect(86, 88, 2, 10, pal.woodDark); q.rect(102, 88, 2, 10, pal.woodDark);
  }, INK, { relief: true });
  // quadro "Novidades"
  p.rect(118, 8, 74, 46, pal.woodDark); p.rect(120, 10, 70, 42, C('#24402e'));
  p.fill((x, y) => (dith(x, y, 0.12) ? shade(p.get(x, y), 0.08) : p.get(x, y)), 120, 10, 70, 42);
  drawText(p, a.head.toUpperCase().slice(0, 16), 124, 13, C('#f0ecd8'));
  a.news.slice(0, 4).forEach((n, i) => drawText(p, n.toUpperCase().slice(0, 15), 124, 22 + i * 7, i === 3 ? C('#c0c0b0') : C('#f0ecd8')));
  tagPx(p, 126, 2, a.when.toUpperCase(), C('#2a5ab0'), C('#ffffff'));
  spots.push({ id: 'news', x: 118, y: 2, w: 74, h: 52, label: l('Quadro de novidades', 'New-stock board'), tip: l('O estoque inteiro troca na virada do mês', 'The whole stock changes at the turn of the month'), go: { panel: 'news' }, badge: { text: `${a.weeks}`, level: a.weeks <= 1 ? 'soon' : 'info', sym: '⏱' } });
  // janela da garagem
  p.rect(196, 4, 42, 50, pal.outline); p.rect(198, 6, 38, 46, mix(pal.sky, C('#cfe4f4'), 0.4));
  for (let i = 0; i < 4; i++) { const hh = 8 + ((i * 7) % 13); p.rect(200 + i * 9, 40 - hh, 7, hh, shade(pal.outline, 0.5)); }
  p.rect(198, 40, 38, 12, C('#7a7a7e'));
  if (a.garage) { car(p, 204, 50, a.year, a.garage.car); tagPx(p, 200, 8, a.garage.price, C('#fbf6ea'), INK); }
  drawText(p, a.gar.toUpperCase(), 199, 56, C('#f0d040'));
  spots.push({ id: 'garage', x: 196, y: 4, w: 42, h: 58, label: l('Janela da garagem', 'Garage window'), tip: a.garage ? l('Carros e motos à venda', 'Cars and bikes for sale') : l('Nada na garagem este mês', 'Nothing in the garage this month'), go: { panel: 'garage' } });
  // balcão com caixa registradora
  inked(p, (q) => {
    q.rect(150, 74, 44, 24, pal.wood); q.hline(150, 193, 74, shade(pal.wood, 0.2)); q.rect(150, 96, 44, 2, pal.woodDark);
    q.rect(176, 66, 12, 8, pal.metal); q.rect(178, 64, 8, 3, pal.screen);
    q.rect(156, 68, 10, 6, C('#2a5ab0')); q.rect(160, 68, 2, 6, C('#f0d040'));
  }, INK, { relief: true });
  spots.push({ id: 'counter', x: 150, y: 60, w: 44, h: 38, label: l('Balcão', 'Counter'), tip: l('Presentear alguém que você conhece', 'Give something to someone you know'), go: { panel: 'gift' } });
  // vitrine da relíquia rara
  p.rect(200, 64, 30, 34, pal.woodDark); p.rect(202, 66, 26, 22, mix(pal.glass, C('#e8f0f4'), 0.4));
  if (a.relic) {
    instrument(p, pal, 'guitar', 210, 60, 3);
    for (let i = 0; i < a.relic.stars; i++) p.rect(204 + i * 5, 90, 3, 3, pal.gold);
    for (let i = 0; i < 4; i++) p.put(204 + i * 7, 68 + (i % 2) * 6, C('#fff8c0'));
  }
  spots.push({ id: 'relic', x: 200, y: 62, w: 30, h: 36, label: l('Vitrine de relíquia', 'Relic showcase'), tip: a.relic ? l('Peça rara: história, donos e compra', 'Rare piece: history, owners and purchase') : l('Vitrine vazia este mês', 'Empty showcase this month'), go: { panel: 'relic' },
    ...(a.relic ? { badge: { text: '★'.repeat(a.relic.stars), level: 'info' as const } } : {}) });
  return { px: p, spots };
}

// ---------------------------------------------------------------- casa

export interface HouseArt31 { year: number; gar: string; empty: string; house: string; prestige: number; cars: number; carNames: L[]; piano: boolean; gold: number; pool: boolean }
export function paintHouse31(a: HouseArt31): { px: Px; spots: Spot31[] } {
  const pal = paletteOf(a.year), p = new Px(SW31, SH31);
  walls(p, pal, a.prestige <= 1);
  const spots: Spot31[] = [];
  // janela com a cidade
  p.rect(14, 10, 46, 32, pal.outline); p.rect(16, 12, 42, 28, mix(pal.sky, C('#9fc4e8'), 0.35));
  for (let i = 0; i < 8; i++) { const hh = 5 + ((i * 7) % 15); p.rect(17 + i * 5, 40 - hh, 4, hh, shade(pal.outline, 0.55)); }
  p.vline(37, 12, 39, pal.outline);
  // discos emoldurados
  for (let i = 0; i < Math.min(3, a.gold); i++) { const x = 70 + i * 16; p.rect(x, 12, 13, 15, pal.woodDark); p.rect(x + 1, 13, 11, 13, shade(pal.wall2, -0.2)); p.disc(x + 6, 19, 4, pal.gold); p.disc(x + 6, 19, 1, INK); }
  spots.push({ id: 'gold', x: 68, y: 10, w: 50, h: 20, label: l('Discos na parede', 'Records on the wall'), tip: l('Seus discos de ouro e troféus', 'Your gold records and trophies'), go: { area: 'awards' } });
  inked(p, (q) => {
    // sofá
    q.rect(20, 78, 46, 14, pal.fabric); q.rect(20, 72, 46, 7, shade(pal.fabric, 0.15)); q.rect(18, 76, 5, 16, shade(pal.fabric, -0.2)); q.rect(63, 76, 5, 16, shade(pal.fabric, -0.2));
    // vitrola / som da época
    if (a.year < 1955) { q.rect(80, 74, 18, 18, pal.woodDark); q.ellipse(89, 74, 8, 2, INK); q.poly([[94, 72], [100, 60], [104, 62], [97, 72]], pal.gold); }
    else if (a.year < 1990) { q.rect(78, 80, 26, 12, pal.woodDark); q.rect(80, 76, 22, 4, pal.metal); q.ellipse(88, 76, 6, 1, INK); }
    else { q.rect(80, 70, 22, 22, C('#2a2a30')); q.rect(82, 72, 18, 12, pal.screen); }
    // piano ou guitarra na parede
    if (a.piano) { q.rect(108, 60, 30, 32, pal.woodDark); q.rect(110, 72, 26, 4, C('#f4f0e8')); for (let i = 0; i < 6; i++) q.rect(111 + i * 4, 72, 1, 3, INK); }
    else { q.rect(118, 36, 2, 16, pal.woodDark); q.ellipse(119, 56, 5, 4, C('#c0502a')); q.ellipse(119, 61, 6, 5, C('#c0502a')); }
  }, INK, { relief: true });
  spots.push({ id: 'sofa', x: 18, y: 70, w: 52, h: 24, label: l('Sala', 'Living room'), tip: l('Descansar, dar uma festa ou ver o seu patrimônio', 'Rest, throw a party or see your wealth'), go: { panel: 'home' } });
  spots.push({ id: 'music', x: 76, y: 56, w: 64, h: 38, label: a.piano ? l('Piano', 'Piano') : l('Som e instrumento', 'Stereo and instrument'), tip: l('Comprar instrumentos na loja da cidade', 'Buy instruments at the city shop'), go: { area: 'loja31' } });
  // garagem à direita
  p.rect(150, 30, 88, 68, shade(pal.wall, -0.25)); p.rect(150, 30, 88, 3, pal.trim);
  p.fill((x, y) => ((x + y) % 11 === 0 ? shade(p.get(x, y), -0.06) : p.get(x, y)), 150, 33, 88, 65);
  drawText(p, a.gar.toUpperCase(), 156, 36, C('#f0d040'));
  for (let i = 0; i < Math.min(3, a.cars); i++) car(p, 154 + i * 28, 96, a.year - i * 6, i);
  if (!a.cars) drawText(p, a.empty.toUpperCase(), 182, 70, shade(pal.wall, 0.3));
  if (a.pool) { p.rect(70, 100, 60, 6, C('#e8e4da')); p.rect(72, 101, 56, 4, C('#4ab0e0')); }
  spots.push({ id: 'garage', x: 150, y: 30, w: 88, h: 68, label: l('Garagem', 'Garage'), tip: a.cars ? l('Seus veículos', 'Your vehicles') : l('Garagem vazia: carros e motos na loja', 'Empty garage: cars and bikes at the shop'), go: { panel: 'garage' },
    ...(a.cars ? { badge: { text: String(a.cars), level: 'info' as const } } : {}) });
  return { px: p, spots };
}
