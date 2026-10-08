// Locais "de bastidor": rádio, fábrica, loja, camarim, ônibus, aeroporto, hotel, tribunal, conselho,
// pregão, set de clipe, casa de campo, clínica, velório, mansão, rua e feira do setor.

import { C, shade, withAlpha } from '../px';
import {
  H, W, beam, bleachers, box, curtain, facade, floor, frame, lightRig, plant, posters, screen, seatRows, shelf, sign, sky, table, wall, windowPane,
} from './kit';
import { crowdBlock, prop, type BuildCtx } from './model';

/** Estação de rádio: AM (cabine de madeira), FM (neon) ou sala de curadores (streaming). */
export function radio(c: BuildCtx, band: 'am' | 'fm' | 'curators'): void {
  const { p, pal } = c;
  if (band === 'curators') {
    wall(p, pal, 0, 78, shade(pal.wall, -0.1), 'plain');
    for (let i = 0; i < 3; i++) {
      screen(p, 24 + i * 72, 14, 60, 36, pal.screen, C('#1a1a20'));
      for (let j = 0; j < 5; j++) p.rect(30 + i * 72, 20 + j * 6, 30 + ((i + j) * 7) % 20, 3, [pal.accent, pal.accent2, pal.glow][(i + j) % 3]);
      c.blinks.push({ x: 24 + i * 72, y: 14, w: 60, h: 36, col: withAlpha(pal.glow, 25), rate: 0.8 + i * 0.3 });
    }
    sign(p, 128, 56, 'PLAYLISTS', pal.paper, pal.accent);
    floor(p, 78, pal.floors.office.a, pal.floors.office.b, 'concrete');
    table(c.f, 50, 106, 156, 12, pal.wood);
    prop(c, 'laptop_desk', 90, 100);
    c.spots.host = { x: 150, y: 104, dir: 'SW', pose: 'sit' };
    c.spots.main = { x: 104, y: 104, dir: 'SE', pose: 'sit' };
    c.spots.side = { x: 200, y: 116, dir: 'SW' };
    return;
  }
  const fm = band === 'fm';
  wall(p, pal, 0, 78, fm ? shade(pal.bg, 0.12) : pal.wall, fm ? 'plain' : pal.wallKind);
  // espuma / painéis
  for (let y = 6; y < 70; y += 8) for (let x = 6; x < 90; x += 8) p.rect(x, y, 7, 7, fm ? shade(pal.bg, 0.2) : shade(pal.wall2, (x + y) % 16 ? -0.1 : 0.05));
  // janela para a técnica
  windowPane(p, 150, 14, 90, 40, pal, 'night');
  p.rect(150, 14, 90, 40, withAlpha(pal.glass, 40));
  sign(p, 128, 4, 'NO AR', C('#ffffff'), C('#c02828'), C('#601010'));
  c.blinks.push({ x: 110, y: 3, w: 36, h: 11, col: withAlpha(C('#ff4040'), 120), rate: 1.2 });
  if (fm) {
    for (let x = 100; x < 250; x += 2) p.put(x, 62, withAlpha(pal.accent, 220));
    sign(p, 200, 62, 'FM', pal.glow, shade(pal.bg, -0.3), pal.accent, 2);
  }
  floor(p, 78, pal.floors.control.a, pal.floors.control.b, fm ? 'carpet' : 'boards');
  table(c.f, 60, 104, 136, 14, pal.woodDark);
  prop(c, fm ? 'console' : 'gramophone', 92, 100);
  prop(c, 'mic', 150, 104, 'SW', 1);
  c.spots.host = { x: 120, y: 100, dir: 'SE', pose: 'sit' };
  c.spots.main = { x: 168, y: 102, dir: 'SW', pose: 'sit' };
  c.spots.side = { x: 210, y: 116, dir: 'SW' };
}

/** Fábrica: prensas, forno de vinil, esteira e linha de CD (a partir de 1983). */
export function factory(c: BuildCtx): void {
  const { p, pal } = c;
  wall(p, pal, 0, 70, shade(pal.metalDark, 0.1), 'brick');
  for (let i = 0; i < 4; i++) windowPane(p, 14 + i * 62, 8, 40, 18, pal, 'day');
  lightRig(p, 30, pal, 5);
  floor(p, 70, C('#6e6a64'), C('#5e5a54'), 'concrete');
  // forno
  box(p, 8, 46, 34, 26, shade(pal.metalDark, -0.1), 3);
  p.rect(14, 54, 22, 10, C('#e86a2a'));
  c.blinks.push({ x: 14, y: 54, w: 22, h: 10, col: withAlpha(C('#ffd040'), 120), rate: 1.8 });
  for (let i = 0; i < 3; i++) prop(c, 'press', 70 + i * 46, 84, 'SW', 0, i);
  // esteira
  p.rect(20, 112, 216, 6, pal.metalDark);
  for (let x = 22; x < 234; x += 8) p.rect(x, 110, 6, 2, x % 16 ? C('#151515') : pal.accent);
  if (c.year >= 1983) {
    box(p, 196, 50, 50, 26, pal.metal, 3);
    sign(p, 221, 54, 'CD', pal.paper, pal.screen);
    for (let i = 0; i < 4; i++) p.ring(206 + i * 10, 68, 3, C('#d8e0f0'));
  }
  sign(p, 128, 120, 'CONTROLE DE QUALIDADE', pal.paper, shade(pal.accent2, -0.2));
  c.spots.main = { x: 110, y: 104, dir: 'SE' };
  c.spots.host = { x: 150, y: 104, dir: 'SW' };
  c.spots.side = { x: 60, y: 130, dir: 'NE' };
}

/** Loja de discos: prateleiras, cabines de audição, vitrine, sessão de autógrafos. */
export function store(c: BuildCtx): void {
  const { p, pal } = c;
  wall(p, pal, 0, 76, pal.wall, pal.wallKind);
  shelf(p, 6, 14, 60, 60, pal, 1);
  shelf(p, 190, 14, 60, 60, pal, 2);
  // cabines de audição
  for (let i = 0; i < 2; i++) {
    box(p, 76 + i * 30, 26, 26, 50, shade(pal.wood, -0.1), 2);
    windowPane(p, 80 + i * 30, 32, 18, 14, pal, 'day');
  }
  // vitrine com o lançamento
  box(p, 140, 20, 44, 40, pal.glass, 2);
  for (let i = 0; i < 3; i++) {
    p.rect(146 + i * 12, 30 + (i % 2) * 6, 10, 10, [pal.accent, pal.accent2, pal.gold][i]);
    p.disc(151 + i * 12, 35 + (i % 2) * 6, 2, C('#1a1a1a'));
  }
  sign(p, 162, 12, c.year >= 1985 ? 'NOVIDADES' : 'LANCAMENTOS', pal.paper, pal.accent2);
  floor(p, 76, pal.floors.hall.a, pal.floors.hall.b, 'checker');
  // mesa de autógrafos
  table(c.f, 90, 102, 76, 14, pal.wood, pal.fabric);
  for (let i = 0; i < 6; i++) prop(c, 'crate', 30 + i * 36 - (i > 2 ? 0 : 0), 128 + (i % 2) * 6);
  c.spots.main = { x: 128, y: 100, dir: 'SE', pose: 'sit' };
  c.spots.host = { x: 104, y: 100, dir: 'SE', pose: 'sit' };
  c.spots.side = { x: 160, y: 120, dir: 'NW' };
  crowdBlock(c, 120, 240, 112, 140, 9, { dir: 'NW', hop: 0.3, seed: 'store' });
}

/** Camarim: espelho com lâmpadas, sofá, mesa do pedido. */
export function backstage(c: BuildCtx): void {
  const { p, pal } = c;
  wall(p, pal, 0, 80, shade(pal.wall, -0.15), pal.wallKind);
  box(p, 20, 18, 90, 40, pal.metalDark, 0);
  p.rect(24, 22, 82, 32, mixGlass(pal));
  for (let i = 0; i < 9; i++) {
    p.disc(24 + i * 10, 19, 1.6, pal.lamp);
    c.blinks.push({ x: 23 + i * 10, y: 18, w: 3, h: 3, col: withAlpha(C('#ffffff'), 120), rate: 0.3 + (i % 3) * 0.2 });
  }
  box(p, 20, 60, 90, 8, pal.wood, 3);
  posters(p, 140, 10, 9, pal, 4);
  floor(p, 80, pal.floors.lounge.a, pal.floors.lounge.b, 'carpet');
  prop(c, 'sofa', 168, 104);
  table(c.f, 96, 116, 52, 12, pal.wood, pal.paper);
  for (let i = 0; i < 4; i++) c.f.disc(104 + i * 11, 109, 2.5, [pal.accent, pal.gold, pal.accent2, pal.plant][i]);
  prop(c, 'lamp', 236, 96);
  c.spots.main = { x: 176, y: 102, dir: 'SW', pose: 'sit' };
  c.spots.side = { x: 196, y: 104, dir: 'SW', pose: 'sit' };
  c.spots.host = { x: 70, y: 100, dir: 'SE' };
}

function mixGlass(pal: BuildCtx['pal']): number {
  return shade(pal.glass, -0.1);
}

/** Ônibus de turnê na estrada (lado de fora). */
export function tourBus(c: BuildCtx): void {
  const { p, pal } = c;
  sky(p, 0, 64, C('#f0a868'), C('#ffd8a0'));
  p.disc(200, 40, 12, withAlpha(C('#fff2c0'), 230));
  p.poly([[0, 64], [50, 46], [110, 60], [170, 42], [W, 58], [W, 66], [0, 66]], shade(pal.plant, -0.35));
  floor(p, 64, shade(pal.plant, -0.1), shade(pal.plant, -0.2), 'grass', 92);
  floor(p, 92, C('#3c3a40'), C('#34323a'), 'asphalt');
  for (let x = 0; x < W; x += 20) p.rect(x, 116, 10, 2, C('#e8e0b0'));
  // ônibus (frontal-lateral)
  const bx = 44;
  box(p, bx, 66, 150, 40, c.ei >= 3 ? pal.accent2 : pal.accent, 0);
  p.rect(bx, 66, 150, 6, shade(c.ei >= 3 ? pal.accent2 : pal.accent, 0.2));
  for (let i = 0; i < 7; i++) p.rect(bx + 8 + i * 20, 74, 14, 12, C('#2a3448'));
  p.rect(bx + 136, 74, 12, 26, C('#2a3448'));
  for (const wx of [bx + 22, bx + 120]) {
    p.disc(wx, 106, 8, C('#1a1a1a'));
    p.disc(wx, 106, 3, pal.metal);
  }
  sign(p, bx + 70, 90, 'TOUR', pal.paper, shade(pal.bg, -0.2));
  c.spots.main = { x: 200, y: 112, dir: 'SW' };
  c.spots.side = { x: 222, y: 114, dir: 'SW' };
  c.spots.host = { x: 30, y: 112, dir: 'SE' };
}

/** Aeroporto: painel de partidas, balcão da imigração, fila. */
export function airport(c: BuildCtx): void {
  const { p, pal } = c;
  wall(p, pal, 0, 72, shade(pal.metal, -0.1), 'glass');
  windowPane(p, 8, 8, 110, 46, pal, 'day');
  // avião lá fora
  p.rect(30, 36, 60, 6, C('#e8eef6'));
  p.poly([[60, 36], [74, 26], [78, 26], [70, 36]], C('#c8d2dc'));
  screen(p, 136, 8, 110, 40, C('#141414'), pal.metalDark, false);
  const rows = ['PARIS', 'TOKYO', 'LAGOS', 'RIO', 'NY'];
  rows.forEach((t, i) => sign(p, 170, 11 + i * 7, t, C('#ffd040'), C('#141414')));
  sign(p, 222, 11 + 3 * 7, 'CANCEL', C('#ff4040'), C('#141414'));
  c.blinks.push({ x: 206, y: 32, w: 32, h: 7, col: withAlpha(C('#ff4040'), 140), rate: 1.4 });
  floor(p, 72, pal.floors.hall.a, pal.floors.hall.b, 'tiles');
  box(c.f, 150, 98, 80, 22, pal.metalDark, 4);
  sign(c.f, 190, 102, 'IMIGRACAO', pal.paper, shade(pal.accent2, -0.3));
  c.spots.host = { x: 196, y: 94, dir: 'SW' };
  c.spots.main = { x: 130, y: 112, dir: 'NE' };
  c.spots.side = { x: 112, y: 116, dir: 'NE' };
  crowdBlock(c, 10, 100, 104, 140, 8, { dir: 'NE', hop: 0, seed: 'air' });
}

/** Quarto de hotel (destruído quando variant = 1). */
export function hotel(c: BuildCtx): void {
  const { p, pal } = c;
  wall(p, pal, 0, 80, pal.wall, 'paper');
  windowPane(p, 160, 14, 70, 44, pal, 'city');
  curtain(p, 150, 10, 12, 54, pal.fabric);
  curtain(p, 228, 10, 12, 54, pal.fabric);
  frame(p, 30, 20, 40, 26, pal.gold);
  p.rect(31, 21, 38, 24, shade(pal.fabric2, -0.1));
  floor(p, 80, pal.floors.lounge.a, pal.floors.lounge.b, 'carpet');
  // cama
  box(p, 24, 92, 100, 26, pal.paper, 6);
  p.rect(24, 86, 100, 6, pal.woodDark);
  p.rect(30, 92, 30, 8, C('#ffffff'));
  prop(c, 'tv', 200, 112);
  prop(c, 'lamp', 140, 92);
  if (c.variant === 1) {
    // bagunça: TV quebrada, travesseiros, garrafas
    p.line(30, 22, 68, 44, C('#1a1a1a'));
    p.line(68, 22, 30, 44, C('#1a1a1a'));
    for (let i = 0; i < 14; i++) p.rect(20 + ((i * 53) % 210), 120 + ((i * 7) % 20), 3 + (i % 3), 2, [C('#ffffff'), pal.glass, pal.accent][i % 3]);
    p.line(170, 20, 200, 50, C('#ffffff'));
  }
  c.spots.main = { x: 150, y: 120, dir: 'SW' };
  c.spots.side = { x: 90, y: 128, dir: 'SE' };
  c.spots.host = { x: 230, y: 124, dir: 'SW' };
}

/** Tribunal: bancada do juiz, tribuna da testemunha, mesas das partes e galeria. */
export function court(c: BuildCtx): void {
  const { p, pal } = c;
  wall(p, pal, 0, 72, shade(pal.wood, -0.15), 'panel');
  p.disc(128, 14, 9, pal.gold);
  p.disc(128, 14, 6, shade(pal.gold, -0.3));
  box(p, 88, 38, 80, 34, pal.woodDark, 5);
  p.rect(88, 38, 80, 3, pal.wood);
  box(p, 176, 52, 34, 20, pal.woodDark, 3);
  floor(p, 72, pal.floors.office.a, pal.floors.office.b, 'boards');
  table(c.f, 30, 104, 70, 14, pal.wood);
  table(c.f, 156, 104, 70, 14, pal.wood);
  seatRows(c.f, 128, 3, pal.woodDark, 6);
  prop(c, 'piano', 50, 86);
  c.spots.host = { x: 128, y: 44, dir: 'SE' }; // juiz
  c.spots.side = { x: 192, y: 60, dir: 'SW' }; // testemunha / perito
  c.spots.main = { x: 64, y: 100, dir: 'NE' };
  c.spots.extra = { x: 190, y: 100, dir: 'NW' };
}

/** Sala do conselho: mesa longa, gráfico, cadeiras. */
export function boardroom(c: BuildCtx): void {
  const { p, pal } = c;
  wall(p, pal, 0, 76, shade(pal.wall, -0.05), c.ei >= 5 ? 'glass' : 'panel');
  windowPane(p, 170, 10, 74, 50, pal, 'city');
  screen(p, 20, 12, 70, 42, pal.paper, pal.metalDark, false);
  for (let i = 0; i < 6; i++) p.line(26 + i * 10, 46 - ((i * 13) % 26), 36 + i * 10, 46 - (((i + 1) * 13) % 26), pal.accent2);
  floor(p, 76, pal.floors.office.a, pal.floors.office.b, 'carpet');
  // mesa longa em perspectiva
  c.f.poly([[60, 104], [196, 104], [176, 90], [80, 90]], pal.woodDark);
  c.f.poly([[60, 104], [196, 104], [196, 108], [60, 108]], shade(pal.woodDark, -0.3));
  c.spots.host = { x: 128, y: 92, dir: 'SE', pose: 'sit' };
  c.spots.main = { x: 128, y: 122, dir: 'NE' };
  c.spots.side = { x: 210, y: 112, dir: 'SW', pose: 'sit' };
  const seats: [number, number, 'SE' | 'SW'][] = [[84, 96, 'SE'], [104, 96, 'SE'], [152, 96, 'SW'], [172, 96, 'SW'], [66, 106, 'SE'], [190, 106, 'SW']];
  seats.forEach(([x, y, dir], i) => c.crowd.push({ x, y, seed: `board${i}`, dir, pose: 'sit', phase: i, hop: 0.05 }));
}

/** Pregão da bolsa: painel com o gráfico, sino, operadores. */
export function exchange(c: BuildCtx): void {
  const { p, pal } = c;
  wall(p, pal, 0, 70, C('#1f2a3a'), 'plain');
  screen(p, 12, 8, 232, 34, C('#06120c'), pal.metalDark, false);
  for (let i = 0; i < 20; i++) p.line(16 + i * 11, 34 - ((i * 7) % 18), 27 + i * 11, 34 - (((i + 1) * 7) % 18), C('#40e070'));
  sign(p, 128, 46, 'BOLSA SONORA', pal.gold, C('#101820'), pal.gold);
  c.blinks.push({ x: 12, y: 8, w: 232, h: 34, col: withAlpha(C('#40e070'), 25), rate: 1.6 });
  // sino no balcão
  box(p, 104, 58, 48, 14, pal.woodDark, 3);
  p.disc(128, 54, 5, pal.gold);
  floor(p, 72, C('#4a4a52'), C('#3e3e46'), 'tiles');
  c.spots.main = { x: 120, y: 64, dir: 'SE' };
  c.spots.host = { x: 140, y: 64, dir: 'SW' };
  crowdBlock(c, 6, 250, 92, 142, 22, { dir: 'mix', hop: 0.6, seed: 'trade' });
}

/** Set de clipe / estúdio de fotos. */
export function videoSet(c: BuildCtx): void {
  const { p, pal } = c;
  wall(p, pal, 0, 82, shade(pal.bg, 0.1), 'plain');
  // fundo pintado
  p.rect(50, 10, 156, 70, pal.sky);
  p.poly([[50, 80], [100, 40], [150, 70], [206, 30], [206, 80]], shade(pal.plant, -0.1));
  frame(p, 49, 9, 158, 72, pal.metalDark);
  floor(p, 82, C('#d8d4cc'), C('#c8c4bc'), 'concrete');
  for (const x of [26, 230]) {
    p.vline(x, 30, 110, pal.metalDark);
    p.rect(x - 6, 24, 12, 8, pal.metal);
    beam(p, x, 32, 110, 22, pal.lamp, 40);
  }
  prop(c, 'tv', 96, 132, 'SE');
  c.spots.main = { x: 128, y: 104, dir: 'SE' };
  c.spots.side = { x: 156, y: 106, dir: 'SW' };
  c.spots.host = { x: 70, y: 126, dir: 'NE' };
}

/** Casa de campo para composição: lareira, piano, janela com árvores. */
export function countryHouse(c: BuildCtx): void {
  const { p, pal } = c;
  wall(p, pal, 0, 80, shade(pal.wood, 0.1), 'panel');
  windowPane(p, 150, 14, 80, 46, pal, 'trees');
  box(p, 20, 30, 60, 50, C('#7a6a5a'), 4);
  p.rect(32, 50, 36, 30, C('#1a1210'));
  p.disc(50, 72, 8, C('#e86a2a'));
  c.blinks.push({ x: 40, y: 62, w: 20, h: 16, col: withAlpha(C('#ffd040'), 110), rate: 2.5 });
  floor(p, 80, pal.wood, pal.woodDark, 'boards');
  prop(c, 'piano', 120, 98);
  prop(c, 'armchair', 200, 106);
  plant(p, 240, 80, pal);
  c.spots.main = { x: 124, y: 102, dir: 'SE', pose: 'sit' };
  c.spots.side = { x: 200, y: 108, dir: 'SW', pose: 'sit' };
  c.spots.host = { x: 70, y: 112, dir: 'SE' };
}

/** Clínica / hospital: tons calmos, leito, cortina, janela. */
export function clinic(c: BuildCtx): void {
  const { p, pal } = c;
  wall(p, pal, 0, 80, C('#d8e4e0'), 'plain');
  windowPane(p, 30, 14, 60, 40, pal, 'trees');
  for (let i = 0; i < 40; i++) p.vline(150 + i, 6, 78, i % 4 ? C('#b8d0d8') : C('#98b0b8'));
  floor(p, 80, C('#c8d4d0'), C('#b8c4c0'), 'tiles');
  box(p, 100, 96, 90, 18, C('#f2f6f4'), 6);
  p.rect(100, 90, 8, 24, pal.metal);
  p.rect(104, 96, 24, 6, C('#ffffff'));
  plant(p, 230, 84, pal);
  c.spots.main = { x: 140, y: 100, dir: 'SE', pose: 'sit' };
  c.spots.host = { x: 210, y: 112, dir: 'SW' };
  c.spots.side = { x: 80, y: 116, dir: 'SE' };
}

/** Velório / despedida: flores, retrato, velas, bancos. Cores contidas. */
export function funeral(c: BuildCtx): void {
  const { p, pal } = c;
  c.filter = 'saturate(0.55)';
  wall(p, pal, 0, 80, C('#4a4650'), 'plain');
  p.poly([[100, 0], [156, 0], [146, 40], [110, 40]], withAlpha(C('#fff2c8'), 40));
  frame(p, 110, 14, 36, 44, pal.gold);
  p.rect(111, 15, 34, 42, C('#2a2630'));
  for (let i = 0; i < 12; i++) p.disc(80 + i * 9, 70 + (i % 2) * 3, 4, [C('#ffffff'), C('#f0d8e0'), C('#e8e0c0')][i % 3]);
  for (const x of [96, 160]) {
    p.rect(x, 50, 3, 14, C('#f2eee0'));
    c.blinks.push({ x: x - 1, y: 46, w: 5, h: 4, col: withAlpha(C('#ffd040'), 160), rate: 2.8 });
  }
  floor(p, 80, C('#3a3640'), C('#34303a'), 'carpet');
  seatRows(c.f, 116, 4, shade(pal.woodDark, -0.1), 8);
  c.spots.main = { x: 104, y: 98, dir: 'NE' };
  c.spots.side = { x: 152, y: 98, dir: 'NW' };
  c.spots.host = { x: 128, y: 92, dir: 'NE' };
  crowdBlock(c, 10, 246, 112, 140, 12, { pose: 'sit', hop: 0, seed: 'fun' });
}

/** Mansão: a casa cresce com o nível (variant 0..5). Exterior com piscina e carros. */
export function mansion(c: BuildCtx): void {
  const { p, pal } = c;
  const lv = Math.max(0, Math.min(5, c.variant));
  sky(p, 0, 74, C('#7ab8e8'), C('#c8e4f4'));
  floor(p, 74, shade(pal.plant, 0.1), pal.plant, 'grass');
  const w = 70 + lv * 26;
  const x = Math.round((W - w) / 2);
  const hgt = 30 + Math.min(3, lv) * 10;
  const top = 76 - hgt;
  box(p, x, top, w, hgt, lv >= 3 ? C('#f2ece0') : pal.wall, 0);
  p.poly([[x - 6, top], [x + w + 6, top], [x + w / 2, top - 18 - lv * 2]], lv >= 4 ? C('#5a6a7a') : C('#9c3b2c'));
  for (let i = 0; i < Math.floor(w / 18); i++) for (let j = 0; j < Math.floor(hgt / 16); j++) {
    const wx = x + 6 + i * 18;
    const wy = top + 6 + j * 14;
    p.rect(wx, wy, 8, 8, C('#2a3448'));
    c.blinks.push({ x: wx, y: wy, w: 8, h: 8, col: withAlpha(C('#ffd889'), 80), rate: 0.2 + ((i + j) % 4) * 0.15 });
  }
  if (lv >= 2) {
    p.ellipse(200, 110, 34, 9, C('#4ab0e0'));
    p.ellipse(200, 108, 30, 6, C('#7ad0f0'));
  }
  if (lv >= 3) {
    for (let i = 0; i < Math.min(3, lv - 2); i++) {
      box(p, 20 + i * 30, 104, 26, 10, [pal.accent, pal.metal, pal.accent2][i], 3);
      p.disc(25 + i * 30, 115, 3, C('#1a1a1a'));
      p.disc(41 + i * 30, 115, 3, C('#1a1a1a'));
    }
  }
  if (lv >= 5) for (let i = 0; i < 8; i++) plant(p, 10 + i * 34, 80, pal);
  c.spots.main = { x: 128, y: 100, dir: 'SE' };
  c.spots.side = { x: 150, y: 104, dir: 'SW' };
  c.spots.host = { x: 100, y: 104, dir: 'SE' };
  if (c.variant >= 3) crowdBlock(c, 150, 250, 112, 140, 6, { dir: 'mix', hop: 0.6, seed: 'party' });
}

/** Rua: calçada, cartazes, músico de rua e fila na porta da loja. */
export function street(c: BuildCtx): void {
  const { p, pal } = c;
  sky(p, 0, 30, pal.sky, shade(pal.sky, 0.2));
  facade(p, 0, 16, 90, 70, shade(pal.wall, -0.1), pal, 'DISCOS');
  facade(p, 92, 6, 76, 80, C('#8a5a3a'), pal, 'CAFE');
  facade(p, 170, 20, 86, 66, shade(pal.wall2, -0.1), pal);
  posters(p, 174, 34, 7, pal, 7);
  floor(p, 86, pal.ground[0], pal.ground[1], 'tiles', 118);
  floor(p, 118, C('#3c3a40'), C('#34323a'), 'asphalt');
  // chapéu do músico
  p.ellipse(150, 112, 6, 2, C('#2a2020'));
  for (let i = 0; i < 4; i++) p.put(147 + i * 2, 111, pal.gold);
  c.spots.main = { x: 150, y: 108, dir: 'SE', pose: 'play' };
  c.spots.host = { x: 196, y: 112, dir: 'SW' };
  c.spots.side = { x: 120, y: 112, dir: 'SE' };
  crowdBlock(c, 4, 80, 96, 116, 8, { dir: 'NE', hop: 0.1, seed: 'line' });
  crowdBlock(c, 160, 240, 100, 114, 4, { dir: 'NW', hop: 0.3, seed: 'watch' });
}

/** Feira do setor: estandes com faixas dos selos. */
export function tradeFair(c: BuildCtx): void {
  const { p, pal } = c;
  wall(p, pal, 0, 60, shade(pal.metal, -0.2), 'plain');
  lightRig(p, 4, pal, 8);
  for (let i = 0; i < 4; i++) {
    const x = 6 + i * 63;
    const col = [pal.accent, pal.accent2, pal.fabric, pal.fabric2][i];
    box(p, x, 26, 58, 40, shade(col, -0.25), 3);
    p.rect(x, 26, 58, 9, col);
    sign(p, x + 29, 28, ['SELO', 'RIVAL', 'INDIE', 'MAJOR'][i], pal.paper, shade(col, -0.2));
    p.rect(x + 6, 42, 14, 14, pal.paper);
    p.disc(x + 13, 49, 4, C('#1a1a1a'));
  }
  floor(p, 66, pal.floors.hall.a, pal.floors.hall.b, 'tiles');
  table(c.f, 96, 98, 64, 12, pal.wood, pal.accent);
  c.spots.main = { x: 128, y: 96, dir: 'SE' };
  c.spots.host = { x: 176, y: 104, dir: 'SW' };
  c.spots.side = { x: 100, y: 96, dir: 'SE' };
  crowdBlock(c, 6, 250, 100, 142, 16, { dir: 'mix', hop: 0.1, seed: 'fair' });
}

void H;
void bleachers;
void curtain;
