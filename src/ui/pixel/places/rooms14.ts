// Rodada 14 — locais novos: estúdio (técnica e sala de gravação), casa/garagem do artista,
// horizonte de cidade com marcos datados e coletiva de imprensa. Tudo muda por década.

import { C, shade, withAlpha, type Col } from '../px';
import { H, W, beam, box, curtain, floor, frame, plant, posters, screen, shelf, sign, sky, table, wall, windowPane } from './kit';
import { crowdBlock, prop, type BuildCtx } from './model';
import { landmarks14 } from '../spec14';

const BLACK = C('#16141a');

/** Fileira de VU / LEDs que piscam. */
function meters(c: BuildCtx, x: number, y: number, n: number, col: Col): void {
  for (let i = 0; i < n; i++) {
    c.p.rect(x + i * 6, y, 4, 3, BLACK);
    c.blinks.push({ x: x + i * 6, y, w: 4, h: 3, col: withAlpha(col, 220), rate: 0.7 + (i % 5) * 0.37 });
  }
}

/** Mesa de som frontal: largura e número de canais pela era. */
function desk(c: BuildCtx, cx: number, y: number): void {
  const { f, pal, year } = c;
  const w = year < 1950 ? 50 : year < 1960 ? 70 : year < 2000 ? 116 : year < 2010 ? 96 : 80;
  const x = Math.round(cx - w / 2);
  const body = year >= 1980 && year < 2000 ? C('#3a3a42') : year >= 2000 ? C('#26262c') : pal.woodDark;
  f.poly([[x, y], [x + w, y], [x + w - 6, y - 10], [x + 6, y - 10]], shade(body, 0.12));
  f.rect(x, y, w, 14, body);
  f.hline(x, x + w - 1, y, shade(body, 0.3));
  if (year < 2000) {
    // canais com faders
    for (let i = x + 8; i < x + w - 8; i += year < 1960 ? 8 : 4) {
      f.vline(i, y - 8, y - 3, shade(body, -0.35));
      f.put(i, y - 5 - ((i * 7) % 3), pal.paper);
      f.put(i, y - 9, [pal.accent, pal.accent2, pal.glow][i % 3]);
    }
  } else {
    // telas da DAW
    const n = year >= 2010 && year < 2020 ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const sx = Math.round(cx - (n * 34) / 2 + i * 36);
      screen(f, sx, y - 34, 30, 18, year >= 2030 ? withAlpha(pal.glow, 140) : pal.screen, BLACK, false);
      for (let k = 0; k < 4; k++) f.rect(sx + 2, y - 31 + k * 4, 6 + ((k * 9 + i * 5) % 20), 2, [pal.accent, pal.accent2, pal.glow, pal.paper][k]);
      f.rect(sx + 13, y - 14, 4, 4, BLACK);
      c.blinks.push({ x: sx + 2, y: y - 32, w: 26, h: 14, col: withAlpha(pal.glow, 30), rate: 0.5 + i * 0.2 });
    }
    if (year >= 2010) f.rect(Math.round(cx - 12), y - 4, 24, 3, C('#c8c8d0')); // laptop/teclado
  }
}

/** Vidro com a outra sala ao fundo (bateria e microfone, ou técnico na mesa). */
function glass(c: BuildCtx, x: number, y: number, w: number, hh: number, inside: 'live' | 'control'): void {
  const { p, pal } = c;
  p.rect(x, y, w, hh, shade(pal.floors.studio.a, -0.35));
  p.rect(x, y + hh - 10, w, 10, shade(pal.floors.studio.a, -0.2));
  if (inside === 'live') {
    // silhueta da bateria e do pedestal
    p.ellipse(x + 24, y + hh - 12, 9, 5, shade(pal.accent2, -0.3));
    p.disc(x + 14, y + hh - 22, 4, shade(pal.gold, -0.2));
    p.disc(x + 34, y + hh - 24, 4, shade(pal.gold, -0.2));
    p.vline(x + w - 30, y + 14, y + hh - 4, pal.metal);
    p.disc(x + w - 30, y + 12, 3, pal.metalDark);
  } else {
    p.rect(x + 10, y + hh - 18, w - 20, 8, shade(pal.woodDark, -0.2));
    for (let i = x + 14; i < x + w - 14; i += 5) p.put(i, y + hh - 16, pal.glow);
  }
  for (let i = 0; i < w; i += 3) if ((i * 7) % 11 < 3) p.put(x + i, y + 2 + (i % 9), withAlpha(C('#ffffff'), 90));
  frame(p, x - 1, y - 1, w + 2, hh + 2, shade(pal.trim, -0.2));
  frame(p, x - 2, y - 2, w + 4, hh + 4, pal.trim);
}

/** Painéis acústicos pela era. */
function acoustic(c: BuildCtx, y1: number): void {
  const { p, pal, year } = c;
  if (year < 1960) { wall(p, pal, 0, y1, pal.wall, 'wainscot'); return; }
  if (year < 1980) {
    wall(p, pal, 0, y1, C('#7a5030'), 'panel'); // lambri setentista
    for (let x = 0; x < W; x += 20) p.rect(x + 2, 6, 14, 30, shade(C('#c8782a'), (x % 40) ? -0.1 : 0.05));
    return;
  }
  wall(p, pal, 0, y1, year >= 2010 ? C('#3a3a40') : C('#2c2a34'), 'plain');
  for (let y = 4; y < y1 - 6; y += 8) for (let x = (y % 16) / 2; x < W; x += 8) p.rect(x, y, 7, 7, (x + y) % 3 ? shade(C('#3c3848'), -0.1) : C('#4a4458'));
  if (year >= 1980 && year < 1990) for (let x = 0; x < W; x += 2) p.put(x, 2, withAlpha(C('#ff4fd8'), 200)); // neon
}

/** Estúdio, sala de controle. */
export function studioControl(c: BuildCtx): void {
  const { p, pal, year } = c;
  acoustic(c, 74);
  glass(c, 66, 12, 124, 48, 'live');
  sign(p, 128, 2, year < 1960 ? 'GRAVANDO' : 'REC', C('#ffffff'), C('#c02828'), C('#601010'));
  c.blinks.push({ x: 110, y: 1, w: 36, h: 10, col: withAlpha(C('#ff4040'), 110), rate: 0.9 });
  floor(p, 74, pal.floors.control.a, pal.floors.control.b, year >= 1960 && year < 1980 ? 'carpet' : 'boards');
  // lado esquerdo: torno, fita ou rack
  if (year < 1950) prop(c, 'lathe', 26, 112);
  else if (year < 2000) { prop(c, 'tape', 20, 104); prop(c, year >= 1980 ? 'synth_rack' : 'rack', 42, 116); }
  else { prop(c, 'rack', 24, 110); prop(c, 'speaker', 44, 118); }
  // monitores
  box(p, 46, 40, 12, 18, BLACK, 2);
  box(p, 198, 40, 12, 18, BLACK, 2);
  p.disc(52, 52, 3, shade(pal.metal, -0.3));
  p.disc(204, 52, 3, shade(pal.metal, -0.3));
  if (year >= 1950) meters(c, 102, 64, 9, year < 1980 ? C('#ffd040') : C('#40ff80'));
  desk(c, 128, 108);
  if (year >= 2030) prop(c, 'holo', 150, 96);
  prop(c, 'sofa', 222, 104);
  if (year >= 1960) plant(p, 244, 74, pal);
  c.spots.main = { x: 128, y: 104, dir: 'NE', pose: 'sit' };
  c.spots.host = { x: 100, y: 108, dir: 'NE', pose: 'sit' };
  c.spots.side = { x: 214, y: 100, dir: 'SW', pose: 'sit' };
}

/** Estúdio, sala de gravação (ao vivo). */
export function studioLive(c: BuildCtx): void {
  const { p, pal, year } = c;
  acoustic(c, 70);
  glass(c, 90, 8, 76, 36, 'control');
  floor(p, 70, pal.floors.studio.a, pal.floors.studio.b, year >= 1960 && year < 1980 ? 'carpet' : 'boards');
  // tapete persa sob a bateria
  p.ellipse(52, 112, 40, 12, shade(pal.fabric, -0.15));
  p.ellipse(52, 112, 34, 9, pal.fabric);
  // biombos
  for (const bx of [8, 222]) { box(p, bx, 46, 26, 40, shade(pal.fabric2, -0.2), 2); for (let y = 50; y < 84; y += 4) p.hline(bx + 2, bx + 23, y, shade(pal.fabric2, -0.35)); }
  if (year < 1950) {
    // banda em volta de um único microfone
    prop(c, 'mic', 128, 104);
    prop(c, 'piano', 210, 112);
    prop(c, 'chair', 60, 110);
  } else {
    prop(c, 'drumkit', 52, 114);
    prop(c, 'amp', 92, 100);
    prop(c, 'mic', 128, 108, 'SW', year >= 1990 ? 1 : 0);
    prop(c, year >= 1970 ? 'synth' : 'piano', 206, 112);
    if (year >= 1980) prop(c, 'speaker', 168, 98);
  }
  // fones pendurados
  if (year >= 1960) for (let i = 0; i < 3; i++) { p.ring(186 + i * 8, 56, 3, BLACK); p.vline(186 + i * 8, 52, 54, pal.metal); }
  // lâmpadas
  beam(p, 128, 0, 100, 22, pal.lamp, 30);
  c.spots.main = { x: 132, y: 112, dir: 'SW', pose: 'stand' };
  c.spots.host = { x: 64, y: 118, dir: 'SE', pose: 'play' };
  c.spots.side = { x: 186, y: 118, dir: 'SW', pose: 'play' };
}

/** Casa (quarto/sala) ou garagem de ensaio. */
export function home(c: BuildCtx, garage: boolean): void {
  const { p, pal, year } = c;
  if (garage) {
    wall(p, pal, 0, 78, shade(pal.wall, -0.15), year < 1960 ? 'brick' : 'plain');
    // portão de enrolar
    box(p, 150, 8, 66, 62, shade(pal.metal, -0.2), 0);
    for (let y = 10; y < 70; y += 4) p.hline(151, 214, y, shade(pal.metal, -0.4));
    p.rect(151, 60, 64, 10, withAlpha(C('#ffe8a0'), 120)); // luz do dia por baixo
    posters(p, 8, 14, 5, pal, year);
    shelf(p, 66, 18, 40, 40, pal, 9);
    floor(p, 78, pal.floors.garage.a, pal.floors.garage.b, 'concrete');
    // mancha de óleo
    p.ellipse(120, 126, 14, 3, shade(pal.floors.garage.a, -0.25));
    prop(c, 'drumkit', 50, 108);
    prop(c, 'amp', 96, 102);
    prop(c, 'mic', 124, 118);
    prop(c, 'workbench', 214, 112);
    stereo(c, 200, 70);
    // lâmpada pendurada
    p.vline(128, 0, 8, BLACK);
    p.disc(128, 10, 3, pal.lamp);
    beam(p, 128, 10, 110, 40, pal.lamp, 26);
    c.spots.main = { x: 124, y: 112, dir: 'SE', pose: 'play' };
    c.spots.host = { x: 70, y: 116, dir: 'SE', pose: 'play' };
    c.spots.side = { x: 160, y: 118, dir: 'SW', pose: 'play' };
    return;
  }
  wall(p, pal, 0, 80, pal.wall, pal.wallKind === 'glass' ? 'plain' : pal.wallKind);
  windowPane(p, 96, 12, 56, 36, pal, year >= 1990 ? 'city' : 'trees');
  curtain(p, 88, 8, 10, 44, pal.fabric);
  curtain(p, 150, 8, 10, 44, pal.fabric);
  // pôsteres da época
  if (year >= 1960) posters(p, 172, 16, 6, pal, year + 3);
  else { frame(p, 180, 18, 30, 22, pal.gold); p.rect(181, 19, 28, 20, shade(pal.fabric2, -0.1)); }
  floor(p, 80, pal.floors.lounge.a, pal.floors.lounge.b, year >= 1960 && year < 1980 ? 'carpet' : 'boards');
  // cama/sofá
  box(p, 20, 98, 70, 18, year >= 1960 && year < 1980 ? C('#c8782a') : pal.fabric2, 5);
  p.rect(20, 92, 70, 6, pal.woodDark);
  stereo(c, 18, 66);
  if (year < 1950) prop(c, 'piano', 200, 112);
  else if (year < 1980) { prop(c, 'amp', 176, 104); prop(c, 'chair', 210, 116); }
  else if (year < 2000) prop(c, 'synth', 200, 112);
  else if (year < 2030) prop(c, 'laptop_desk', 200, 112);
  else prop(c, 'holo_desk', 200, 112);
  if (year >= 2020) {
    // ring light
    p.ring(150, 74, 7, C('#fff8e0'));
    p.vline(150, 81, 116, BLACK);
    c.blinks.push({ x: 144, y: 68, w: 13, h: 13, col: withAlpha(C('#ffffff'), 40), rate: 0.3 });
  }
  plant(p, 240, 100, pal);
  c.spots.main = { x: 186, y: 116, dir: 'SE', pose: year < 1950 ? 'sitplay' : 'play' };
  c.spots.host = { x: 54, y: 104, dir: 'SE', pose: 'sit' };
  c.spots.side = { x: 120, y: 120, dir: 'NE' };
}

/** Aparelho de som da era (sobre uma mesinha). */
function stereo(c: BuildCtx, x: number, y: number): void {
  const { p, pal, year } = c;
  table(p, x, y + 22, 44, 12, pal.wood);
  if (year < 1946) { prop(c, 'gramophone', x + 22, y + 20); return; }
  if (year < 1960) { box(p, x + 8, y + 4, 28, 16, pal.wood, 2); p.disc(x + 16, y + 12, 4, pal.paper); p.rect(x + 24, y + 8, 10, 3, pal.glow); return; }
  if (year < 1980) { box(p, x + 4, y + 2, 36, 18, C('#c8c0b0'), 3); p.ellipse(x + 22, y, 12, 2, BLACK); for (const k of [10, 34]) p.disc(x + k, y + 13, 4, BLACK); return; }
  if (year < 1995) { box(p, x + 4, y + 6, 36, 14, BLACK, 2); for (const k of [11, 33]) p.disc(x + k, y + 13, 5, shade(pal.metal, -0.3)); p.rect(x + 18, y + 9, 8, 6, pal.screen); return; }
  if (year < 2010) { box(p, x + 10, y + 6, 24, 14, C('#d0d4dc'), 2); p.rect(x + 13, y + 9, 18, 8, pal.screen); return; }
  box(p, x + 6, y + 10, 10, 10, BLACK, 1);
  box(p, x + 28, y + 10, 10, 10, BLACK, 1);
  p.rect(x + 18, y + 12, 8, 6, year >= 2030 ? pal.glow : pal.screen);
}

/** Horizonte de cidade com marcos que já existem no ano e uma rua com casa de shows, loja e rádio. */
export function city(c: BuildCtx, cityId: string): void {
  const { p, pal, year } = c;
  const night = c.variant % 2 === 1;
  sky(p, 0, 62, night ? C('#141a38') : pal.sky, night ? C('#3a2a5a') : shade(pal.sky, 0.25));
  // prédios genéricos: crescem com o século
  const maxH = 14 + Math.min(44, Math.max(0, (year - 1920) * 0.4));
  for (let i = 0, x = 0; x < W; i++) {
    const bw = 10 + ((i * 37 + cityId.length * 11) % 16);
    const bh = Math.round(8 + ((i * 53 + cityId.charCodeAt(0)) % 100) / 100 * maxH);
    const col = shade(night ? C('#232a44') : C('#7a7c8c'), ((i % 3) - 1) * 0.08);
    p.rect(x, 62 - bh, bw - 1, bh, col);
    for (let wy = 64 - bh; wy < 60; wy += 3) for (let wx = x + 2; wx < x + bw - 3; wx += 3) if ((wx * 13 + wy * 7) % 5 < (night ? 2 : 1)) p.put(wx, wy, night ? C('#ffd889') : shade(col, 0.3));
    if (year >= 2005 && i % 7 === 3) { p.rect(x + 1, 64 - bh, bw - 3, 6, pal.accent2); c.blinks.push({ x: x + 1, y: 64 - bh, w: bw - 3, h: 6, col: withAlpha(pal.glow, 120), rate: 0.6 }); }
    x += bw;
  }
  for (const lm of landmarks14(cityId, year)) landmark(c, lm, night);
  // rua: casa de shows, loja de discos, prédio da rádio
  floor(p, 62, shade(pal.wall, -0.1), shade(pal.wall, -0.2), 'concrete', 66);
  box(p, 6, 66, 84, 52, shade(pal.wall2, -0.15), 0);
  p.rect(10, 70, 76, 12, BLACK);
  sign(p, 48, 72, year < 1960 ? 'SHOW HOJE' : year < 2000 ? 'AO VIVO' : 'LIVE', pal.glow, BLACK);
  for (let x = 12; x < 86; x += 4) c.blinks.push({ x, y: 69, w: 2, h: 1, col: withAlpha(pal.lamp, 255), rate: 2 + (x % 3) * 0.3 });
  p.rect(36, 94, 24, 24, shade(pal.wood, -0.3));
  box(p, 92, 72, 72, 46, C('#8a5a3a'), 0);
  sign(p, 128, 76, year >= 1985 && year < 2008 ? 'CDS' : 'DISCOS', pal.paper, shade(pal.accent, -0.2));
  p.rect(98, 88, 60, 22, pal.glass);
  for (let i = 0; i < 4; i++) { p.rect(102 + i * 14, 92, 10, 10, [pal.accent, pal.accent2, pal.gold, pal.fabric][i]); p.disc(107 + i * 14, 97, 2, BLACK); }
  box(p, 166, 50, 86, 68, shade(pal.metal, -0.25), 0);
  for (let y = 56; y < 110; y += 8) for (let x = 172; x < 246; x += 10) p.rect(x, y, 6, 5, night ? C('#ffd889') : pal.glass);
  // antena: rádio / TV / antena 5G
  p.vline(208, 18, 50, pal.metalDark);
  p.line(200, 50, 208, 22, pal.metalDark);
  p.line(216, 50, 208, 22, pal.metalDark);
  c.blinks.push({ x: 207, y: 16, w: 3, h: 3, col: C('#ff3030'), rate: 1 });
  sign(p, 209, 52, year < 1950 ? 'RADIO' : year < 2010 ? 'RADIO TV' : 'STREAM', pal.paper, shade(pal.accent2, -0.2));
  floor(p, 118, C('#4a4850'), C('#3e3c44'), 'asphalt');
  for (let x = 0; x < W; x += 22) p.rect(x, 132, 10, 2, C('#e8e0b0'));
  car(c, 30 + (c.variant * 40) % 120, 128);
  if (landmarks14(cityId, year).includes('wall')) { p.rect(0, 58, W, 4, C('#b8b4ac')); for (let x = 0; x < W; x += 6) p.vline(x, 58, 61, C('#9a968e')); }
  crowdBlock(c, 10, 240, 116, 122, 8, { dir: 'mix', hop: 0.1, seed: `city-${cityId}` });
  c.spots.main = { x: 48, y: 118, dir: 'SE' };
  c.spots.host = { x: 128, y: 118, dir: 'SW' };
  c.spots.side = { x: 200, y: 120, dir: 'SW' };
}

/** Carro com o formato da época (andando quando animado: o desenho fica no fundo). */
function car(c: BuildCtx, x: number, y: number): void {
  const { p, pal, year } = c;
  if (year >= 2030) { p.ellipse(x + 16, y - 8, 16, 5, pal.metal); p.rect(x + 6, y - 2, 20, 1, withAlpha(pal.glow, 160)); return; }
  const col = year < 1946 ? C('#1a1a1a') : year < 1960 ? C('#7ac8c0') : year < 1980 ? C('#c8782a') : year < 2000 ? C('#a03030') : C('#c8ccd4');
  const len = year < 1946 ? 26 : year < 1980 ? 40 : 34;
  p.rect(x, y - 8, len, 6, col);
  if (year < 1946) p.rect(x + 8, y - 15, 14, 7, col);
  else p.poly([[x + 8, y - 8], [x + len - 8, y - 8], [x + len - 12, y - 14], [x + 12, y - 14]], shade(col, -0.1));
  if (year >= 1950 && year < 1960) p.line(x + len - 2, y - 10, x + len, y - 13, col); // rabo de peixe
  p.disc(x + 7, y - 2, 3, BLACK);
  p.disc(x + len - 7, y - 2, 3, BLACK);
}

/** Marcos de cidade (silhuetas simples). */
function landmark(c: BuildCtx, id: string, night: boolean): void {
  const { p } = c;
  const ink = night ? C('#0e1226') : C('#4a4c5c');
  switch (id) {
    case 'eiffel': p.poly([[118, 62], [138, 62], [129, 6], [127, 6]], ink); p.rect(122, 40, 12, 2, ink); p.disc(128, 60, 5, night ? C('#141a38') : shade(c.pal.sky, 0.1)); break;
    case 'bigben': p.rect(30, 12, 10, 50, ink); p.poly([[29, 12], [41, 12], [35, 2]], ink); p.disc(35, 20, 3, C('#f0e0a0')); break;
    case 'eye': p.ring(200, 38, 18, ink); for (let a = 0; a < 8; a++) p.line(200, 38, 200 + Math.round(Math.cos(a) * 18), 38 + Math.round(Math.sin(a) * 18), ink); break;
    case 'shard': p.poly([[150, 62], [166, 62], [159, 4]], C('#8a98b0')); break;
    case 'empire': p.rect(120, 16, 16, 46, ink); p.rect(124, 8, 8, 8, ink); p.vline(128, 0, 8, ink); break;
    case 'twins': p.rect(60, 4, 10, 58, ink); p.rect(74, 4, 10, 58, ink); break;
    case 'onewtc': p.poly([[66, 62], [80, 62], [76, 6], [70, 6]], C('#7c8ca8')); p.vline(73, 0, 6, ink); break;
    case 'tokyotower': p.poly([[60, 62], [76, 62], [69, 8], [67, 8]], C('#d04020')); p.rect(62, 38, 12, 2, C('#f0f0f0')); break;
    case 'skytree': p.poly([[180, 62], [190, 62], [186, 0], [184, 0]], C('#c8d0dc')); break;
    case 'sugarloaf': p.poly([[150, 62], [176, 18], [196, 62]], C('#3a6a3a')); p.poly([[196, 62], [210, 40], [226, 62]], C('#3a6a3a')); break;
    case 'christ': p.poly([[40, 62], [70, 22], [100, 62]], C('#2e5a30')); p.rect(68, 8, 4, 14, C('#e8e8e0')); p.rect(62, 11, 16, 2, C('#e8e8e0')); break;
    case 'tvtower': p.vline(140, 4, 62, ink); p.vline(141, 4, 62, ink); p.disc(140, 22, 5, ink); break;
    case 'needle': p.vline(100, 10, 62, ink); p.ellipse(100, 14, 9, 3, ink); p.vline(100, 2, 10, ink); break;
    case 'cntower': p.poly([[118, 62], [126, 62], [123, 2], [121, 2]], ink); p.disc(122, 24, 4, ink); break;
    case 'bridge': for (let x = 0; x < 110; x++) p.put(x, 40 + Math.round(((x - 55) / 55) ** 2 * 14), ink); p.hline(0, 110, 52, ink); break;
    case 'opera': for (let i = 0; i < 4; i++) p.poly([[140 + i * 14, 62], [160 + i * 14, 62], [146 + i * 14, 40 + i * 2]], C('#f0f0e8')); break;
    case 'namsan': p.poly([[90, 62], [130, 40], [170, 62]], C('#3a5a3a')); p.vline(130, 12, 40, ink); p.disc(130, 22, 3, ink); break;
    case 'hollywood': p.poly([[0, 62], [60, 30], [130, 58], [130, 62]], C('#8a7a5a')); sign(p, 52, 36, c.year < 1949 ? 'HOLLYWOODLAND' : 'HOLLYWOOD', C('#ffffff'), C('#8a7a5a')); break;
    case 'palms': for (const x of [20, 236]) { p.vline(x, 30, 62, C('#6a4a2a')); for (let a = 0; a < 6; a++) p.line(x, 30, x + Math.round(Math.cos(a) * 10), 30 + Math.round(Math.sin(a) * 5) + 3, C('#2e7a3a')); } break;
    case 'neonstrip': for (let i = 0; i < 5; i++) { p.rect(20 + i * 48, 20, 28, 12, BLACK); c.blinks.push({ x: 22 + i * 48, y: 22, w: 24, h: 8, col: [C('#ff4fd8'), C('#40e0ff'), C('#ffd040')][i % 3], rate: 1 + i * 0.3 }); } break;
    case 'pyramids': p.poly([[120, 62], [160, 24], [200, 62]], C('#d8b878')); p.poly([[180, 62], [206, 38], [232, 62]], C('#c8a868')); break;
    case 'dome': p.ellipse(128, 40, 22, 14, ink); p.rect(106, 40, 44, 22, ink); p.rect(96, 14, 3, 48, ink); p.rect(157, 14, 3, 48, ink); break;
    case 'congress': p.rect(122, 10, 5, 52, C('#e8e8e0')); p.rect(130, 10, 5, 52, C('#e8e8e0')); p.ellipse(90, 56, 14, 5, C('#e8e8e0')); p.ellipse(170, 52, 14, 5, C('#e8e8e0')); break;
    case 'copan': for (let y = 14; y < 62; y += 3) p.hline(60 + Math.round(Math.sin(y / 8) * 4), 100 + Math.round(Math.sin(y / 8) * 4), y, C('#e8e4d8')); break;
    case 'harbour': p.rect(0, 56, W, 6, C('#2a4a7a')); for (let x = 0; x < W; x += 9) p.hline(x, x + 4, 58, C('#5a8ac8')); break;
    case 'capitol': p.rect(100, 36, 56, 26, C('#e8e4d8')); p.ellipse(128, 34, 12, 12, C('#e8e4d8')); p.vline(128, 16, 24, C('#e8e4d8')); break;
  }
}

/** Coletiva de imprensa: painel, púlpito com microfones e fotógrafos. */
export function press(c: BuildCtx): void {
  const { p, pal, year } = c;
  if (year >= 1990) {
    wall(p, pal, 0, 80, C('#f0eee8'), 'plain');
    for (let y = 6; y < 74; y += 14) for (let x = (y % 28) ? 0 : 14; x < W; x += 28) sign(p, x + 12, y, 'PRESS', pal.accent2, C('#f0eee8'));
  } else {
    wall(p, pal, 0, 80, pal.wall, pal.wallKind);
    curtain(p, 0, 0, W, 76, shade(pal.fabric, -0.1), false);
  }
  floor(p, 80, pal.floors.office.a, pal.floors.office.b, 'carpet');
  // mesa / púlpito
  table(c.f, 72, 100, 112, 14, pal.woodDark, shade(pal.fabric2, -0.2));
  const mics = year < 1950 ? 1 : year < 1970 ? 3 : year < 2010 ? 7 : 4;
  for (let i = 0; i < mics; i++) {
    const x = 128 - (mics - 1) * 5 + i * 10;
    c.f.vline(x, 88, 96, BLACK);
    c.f.rect(x - 2, 84, 5, 5, year < 1950 ? pal.metal : [pal.accent, pal.accent2, pal.fabric, pal.gold, pal.metal][i % 5]);
  }
  // câmeras de TV / tripés
  if (year >= 1950) for (const x of [20, 226]) { p.rect(x - 8, 70, 16, 10, BLACK); p.line(x, 80, x - 6, 100, BLACK); p.line(x, 80, x + 6, 100, BLACK); p.rect(x + 8, 73, 4, 4, pal.metal); }
  crowdBlock(c, 10, 246, 118, 142, 12, { dir: 'mix', hop: 0.15, seed: 'press' });
  // flashes
  for (let i = 0; i < 6; i++) c.blinks.push({ x: 20 + i * 40, y: 112 + (i % 2) * 6, w: 4, h: 3, col: withAlpha(C('#ffffff'), 255), rate: 0.4 + i * 0.23 });
  if (year >= 2010) for (let i = 0; i < 6; i++) { p.rect(30 + i * 36, 108, 4, 7, BLACK); p.rect(31 + i * 36, 109, 2, 5, pal.screen); }
  c.spots.main = { x: 128, y: 98, dir: 'SE' };
  c.spots.host = { x: 98, y: 98, dir: 'SE' };
  c.spots.side = { x: 160, y: 98, dir: 'SW' };
  void H;
}
