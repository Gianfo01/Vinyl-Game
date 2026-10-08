// Locais com palco e plateia: cerimônia de premiação, casas de show por porte, clube, palco
// holográfico e os estúdios de TV/podcast/live.

import { C, dith, mix, shade, withAlpha } from '../px';
import {
  H, W, beam, bleachers, box, curtain, floor, frame, lightRig, plant, screen, shelf, sign, sky, stagePlatform, table, wall, windowPane,
} from './kit';
import { crowdBlock, prop, type BuildCtx } from './model';

const GOLD = C('#e3c057');
const RED = C('#9c1f24');

/** Cerimônia de premiação: proscênio dourado, cortina, telão, palco, plateia e tapete vermelho. */
export function awards(c: BuildCtx): void {
  const { p, pal } = c;
  wall(p, pal, 0, 80, shade(pal.bg, 0.1), 'plain');
  // proscênio
  p.rect(20, 4, W - 40, 72, shade(pal.bg, -0.2));
  curtain(p, 20, 4, 30, 70, RED);
  curtain(p, W - 50, 4, 30, 70, RED);
  curtain(p, 20, 4, W - 40, 8, shade(RED, -0.1), true);
  frame(p, 19, 3, W - 38, 74, GOLD);
  frame(p, 18, 2, W - 36, 76, shade(GOLD, -0.3));
  // telão com o prêmio
  screen(p, 92, 16, 72, 34, c.ei >= 4 ? shade(pal.screen, -0.2) : C('#2a2018'), shade(GOLD, -0.2));
  p.disc(128, 30, 8, GOLD);
  p.rect(126, 37, 5, 8, shade(GOLD, -0.2));
  p.rect(121, 45, 15, 3, shade(GOLD, -0.35));
  c.blinks.push({ x: 92, y: 16, w: 72, h: 34, col: withAlpha(C('#ffffff'), 30), rate: 0.7 });
  // palco
  stagePlatform(p, 30, 70, W - 60, 14, shade(pal.wood, -0.1), shade(pal.woodDark, -0.2));
  floor(p, 84, shade(RED, -0.5), shade(RED, -0.55), 'carpet');
  // tapete vermelho no corredor
  p.poly([[118, 84], [138, 84], [150, H], [106, H]], RED);
  p.poly([[118, 84], [120, 84], [108, H], [106, H]], GOLD);
  p.poly([[136, 84], [138, 84], [150, H], [148, H]], GOLD);
  beam(p, 128, 0, 82, 26, pal.lamp, 50);
  prop(c, 'mic', 128, 80);
  crowdBlock(c, 4, 104, 98, 140, 14, { pose: 'sit', hop: 0.2, seed: 'aw-l' });
  crowdBlock(c, 152, 252, 98, 140, 14, { pose: 'sit', hop: 0.2, seed: 'aw-r' });
  c.spots.main = { x: 118, y: 80, dir: 'SE' };
  c.spots.host = { x: 150, y: 80, dir: 'SW' };
  c.spots.side = { x: 128, y: 120, dir: 'NE' };
  c.spots.extra = { x: 90, y: 80, dir: 'SE' };
}

/** Casas de show: 0 bar, 1 clube, 2 teatro, 3 ginásio, 4 arena, 5 estádio, 6 festival. */
export function venue(c: BuildCtx, size: number): void {
  const { p, pal } = c;
  const outdoor = size >= 5;
  if (outdoor) {
    sky(p, 0, 70, size === 6 ? C('#5a86c8') : C('#141a38'), size === 6 ? C('#f0b878') : C('#3a2a5a'));
    if (size === 5) {
      // arquibancada do estádio ao fundo, cheia
      bleachers(p, 30, 72, shade(pal.metalDark, -0.2));
      for (let y = 32; y < 70; y += 4) for (let x = (y % 8); x < W; x += 4) p.put(x, y, [pal.accent, pal.fabric, pal.paper, pal.accent2][(x + y) % 4]);
      lightRig(p, 6, pal, 4, 20, W - 20);
    } else {
      // festival: morros, tendas e bandeiras
      p.poly([[0, 70], [60, 48], [140, 66], [210, 44], [W, 62], [W, 72], [0, 72]], shade(pal.plant, -0.2));
      for (let i = 0; i < 4; i++) {
        const x = 14 + i * 64;
        p.poly([[x, 66], [x + 14, 54], [x + 28, 66]], [pal.accent, pal.accent2, pal.fabric, pal.fabric2][i]);
      }
      for (let x = 0; x < W; x += 8) p.poly([[x, 10], [x + 6, 10], [x + 3, 16]], [pal.accent, pal.gold, pal.accent2][(x / 8) % 3]);
      p.line(0, 10, W, 10, pal.metalDark);
    }
    floor(p, 72, size === 6 ? pal.plant : C('#3d6a34'), shade(size === 6 ? pal.plant : C('#3d6a34'), -0.15), 'grass');
  } else {
    const wallCol = size === 0 ? pal.wall : size === 1 ? shade(pal.bg, 0.15) : size === 2 ? shade(RED, -0.3) : shade(pal.bg, 0.05);
    wall(p, pal, 0, 76, wallCol, size === 0 ? pal.wallKind : size === 1 ? 'brick' : 'plain');
    floor(p, 76, size === 0 ? pal.wood : shade(pal.bg, 0.12), size === 0 ? pal.woodDark : shade(pal.bg, 0.05), size === 0 ? 'boards' : 'concrete');
  }
  // palco
  const sw = [90, 120, 150, 170, 210, 230, 220][size];
  const sx = Math.round((W - sw) / 2);
  const sy = outdoor ? 58 : [62, 58, 56, 54, 50, 50, 56][size];
  if (size === 2) {
    curtain(p, sx - 10, 4, 16, sy, RED);
    curtain(p, sx + sw - 6, 4, 16, sy, RED);
    // camarotes
    for (let i = 0; i < 3; i++) {
      box(p, 2, 14 + i * 16, 22, 8, shade(RED, -0.2), 2);
      box(p, W - 24, 14 + i * 16, 22, 8, shade(RED, -0.2), 2);
    }
  }
  if (size >= 3 && !outdoor) {
    bleachers(p, 10, 44, shade(pal.bg, 0.2));
    for (let y = 12; y < 44; y += 4) for (let x = (y % 8); x < W; x += 5) p.put(x, y, [pal.accent, pal.fabric, pal.paper][(x + y) % 3]);
    if (size === 3) for (let i = 0; i < 4; i++) sign(p, 40 + i * 58, 2, ['GO', 'TIME', 'CAMPEAO', '2X'][i], pal.paper, pal.accent2);
  }
  if (size >= 4) {
    p.rect(sx - 8, 4, 6, sy, pal.metalDark);
    p.rect(sx + sw + 2, 4, 6, sy, pal.metalDark);
    screen(p, sx - 34, 16, 24, 18, pal.screen, pal.metalDark);
    screen(p, sx + sw + 10, 16, 24, 18, pal.screen, pal.metalDark);
    c.blinks.push({ x: sx - 34, y: 16, w: 24, h: 18, col: withAlpha(pal.glow, 60), rate: 1.3 }, { x: sx + sw + 10, y: 16, w: 24, h: 18, col: withAlpha(pal.glow, 60), rate: 1.1 });
  }
  if (size >= 1) lightRig(p, outdoor ? 2 : 4, pal, size + 3, sx, sx + sw);
  if (size === 1) sign(p, W / 2, 10, c.ei >= 3 ? 'LIVE' : 'AO VIVO', pal.glow, shade(pal.bg, -0.3), pal.accent);
  if (size === 0) {
    // balcão do bar
    box(p, 4, 70, 60, 12, pal.woodDark, 4);
    for (let i = 0; i < 6; i++) p.rect(8 + i * 9, 54, 3, 8, [pal.glass, pal.accent2, pal.plant][i % 3]);
    p.hline(4, 62, 63, pal.wood);
    sign(p, 34, 40, 'BAR', pal.paper, pal.accent2);
  }
  stagePlatform(p, sx, sy, sw, outdoor ? 14 : 12, shade(pal.woodDark, 0.1), shade(pal.bg, 0.05));
  for (let i = 0; i < size + 2; i++) beam(p, sx + 10 + (i * (sw - 20)) / Math.max(1, size + 1), outdoor ? 4 : 8, sy + 2, 10, i % 2 ? pal.accent : pal.glow, 34);
  // equipamento
  const gy = sy + 3;
  prop(c, 'amp', sx + 14, gy);
  prop(c, 'drumkit', W / 2 + 4, gy - 2);
  if (size >= 2) prop(c, 'speaker', sx + sw - 10, gy, 'SE');
  if (size >= 4) prop(c, 'speaker', sx + 4, gy);
  prop(c, 'mic', W / 2 - 14, gy + 4);
  c.spots.main = { x: W / 2 - 14, y: gy + 6, dir: 'SE', pose: 'play' };
  c.spots.side = { x: W / 2 + 22, y: gy + 5, dir: 'SW', pose: 'play' };
  c.spots.host = { x: sx + 26, y: gy + 5, dir: 'SE', pose: 'play' };
  c.spots.extra = { x: W / 2 + 4, y: gy + 1, dir: 'SE', pose: 'sitplay' };
  // plateia (cresce com o porte)
  const n = [7, 14, 20, 26, 34, 40, 36][size];
  crowdBlock(c, 6, W - 6, sy + 30, H + 6, n, { hop: 0.5 + size * 0.07, seed: `v${size}` });
  if (size === 2) c.crowd.forEach((m) => (m.pose = 'sit'));
}

/** Pista de dança e clube: cabine do DJ, pista iluminada, fila na porta. */
export function danceClub(c: BuildCtx): void {
  const { p, pal } = c;
  wall(p, pal, 0, 70, shade(pal.bg, 0.08), 'brick');
  sign(p, 128, 6, c.ei >= 3 ? 'CLUB' : 'BAILE', pal.glow, shade(pal.bg, -0.3), pal.accent, 2);
  // globo espelhado
  p.disc(128, 30, 7, (x, y) => ((x + y) % 2 ? pal.metal : shade(pal.metal, 0.4)));
  c.blinks.push({ x: 121, y: 23, w: 14, h: 14, col: withAlpha(C('#ffffff'), 90), rate: 3 });
  // cabine do DJ
  box(p, 100, 52, 56, 18, shade(pal.metalDark, -0.2), 4);
  prop(c, c.ei >= 1 ? 'console' : 'gramophone', 128, 60);
  floor(p, 70, shade(pal.bg, 0.05), pal.bg, 'checker');
  // pista iluminada
  for (let j = 0; j < 5; j++) for (let i = 0; i < 9; i++) {
    const x = 56 + i * 16 - j * 3;
    const y = 82 + j * 12;
    const col = [pal.accent, pal.accent2, pal.glow, pal.fabric2][(i + j) % 4];
    p.rect(x, y, 14 + j, 10, withAlpha(col, 80));
    c.blinks.push({ x, y, w: 14 + j, h: 10, col: withAlpha(col, 70), rate: 1 + ((i * 7 + j * 3) % 5) * 0.4 });
  }
  // porta com fila
  box(p, 4, 30, 24, 40, pal.woodDark, 2);
  sign(p, 16, 22, 'VIP', pal.gold, shade(pal.bg, -0.3));
  c.spots.host = { x: 128, y: 70, dir: 'SE', pose: 'play' };
  c.spots.main = { x: 104, y: 112, dir: 'SE' };
  c.spots.side = { x: 150, y: 112, dir: 'SW' };
  crowdBlock(c, 40, 216, 92, 140, 22, { dir: 'mix', hop: 0.9, seed: 'club' });
  crowdBlock(c, 8, 30, 76, 140, 5, { dir: 'NE', hop: 0, seed: 'line' });
}

/** Palco holográfico: plateia mistura humanos e avatares. */
export function holoStage(c: BuildCtx): void {
  const { p, pal } = c;
  wall(p, pal, 0, 76, C('#08141c'), 'glass');
  for (let i = 0; i < 12; i++) beam(p, 20 + i * 20, 0, 70, 6, C('#2ee8d8'), 26);
  stagePlatform(p, 50, 64, 156, 12, C('#16303a'), C('#0c2028'));
  p.ellipse(128, 66, 30, 4, withAlpha(C('#5ffff0'), 120));
  c.blinks.push({ x: 98, y: 20, w: 60, h: 44, col: withAlpha(C('#5ffff0'), 22), rate: 2.2 });
  prop(c, 'holo', 100, 68);
  prop(c, 'holo', 156, 68);
  floor(p, 76, C('#10242c'), C('#2ee8d8'), 'glow');
  c.spots.main = { x: 128, y: 68, dir: 'SE', pose: 'play' };
  c.spots.side = { x: 150, y: 110, dir: 'NW' };
  c.spots.host = { x: 80, y: 68, dir: 'SE' };
  crowdBlock(c, 8, 248, 100, 142, 26, { hop: 0.7, seed: 'holo' });
  c.crowd.forEach((m, i) => (m.role = i % 3 === 0 ? 'synthetic' : null));
}

/** Estúdios de TV. kind: talk, variety (P&B), auditorium, chart, clips. */
export function tvStudio(c: BuildCtx, kind: 'talk' | 'variety' | 'auditorium' | 'chart' | 'clips'): void {
  const { p, pal } = c;
  if (kind === 'variety') c.filter = 'grayscale(1) contrast(1.15)';
  const back = kind === 'clips' ? shade(pal.bg, 0.1) : kind === 'auditorium' ? C('#c8641e') : kind === 'chart' ? C('#2a2a6a') : C('#2c3a5a');
  wall(p, pal, 0, 74, back, 'plain');
  lightRig(p, 2, pal, 8);
  if (kind === 'talk') {
    windowPane(p, 30, 14, 196, 50, pal, 'city');
    p.rect(30, 14, 196, 50, withAlpha(C('#000000'), 40));
    floor(p, 74, shade(pal.wood, -0.2), shade(pal.wood, -0.3), 'boards');
    // mesa do apresentador (frente no primeiro plano para cobrir as pernas)
    table(c.f, 150, 90, 56, 18, pal.woodDark, shade(pal.woodDark, 0.1));
    prop(c, 'sofa', 74, 98);
    plant(p, 230, 74, pal);
    c.spots.host = { x: 178, y: 92, dir: 'SW', pose: 'sit' };
    c.spots.main = { x: 82, y: 96, dir: 'SE', pose: 'sit' };
    c.spots.side = { x: 104, y: 98, dir: 'SE', pose: 'sit' };
    crowdBlock(c, 4, 252, 126, 146, 14, { pose: 'sit', hop: 0.25, seed: 'tvt' });
    sign(p, 128, 4, c.year >= 2000 ? 'LATE SHOW' : 'BOA NOITE', pal.gold, shade(back, -0.4), pal.gold);
  } else if (kind === 'variety') {
    curtain(p, 0, 6, W, 66, C('#6a6a6a'));
    sign(p, 128, 10, 'SHOW DE VARIEDADES', C('#ffffff'), C('#222222'), C('#aaaaaa'));
    stagePlatform(p, 30, 66, 196, 10, C('#9a9a9a'), C('#4a4a4a'));
    floor(p, 76, C('#3a3a3a'), C('#2c2c2c'), 'boards');
    prop(c, 'mic', 128, 72, 'SW', 1);
    prop(c, 'tv', 230, 80);
    c.spots.host = { x: 100, y: 72, dir: 'SE' };
    c.spots.main = { x: 140, y: 72, dir: 'SW' };
    c.spots.side = { x: 164, y: 72, dir: 'SW' };
    crowdBlock(c, 4, 252, 108, 144, 18, { pose: 'sit', hop: 0.25, seed: 'var' });
  } else if (kind === 'auditorium') {
    // cenário colorido, jurados, buzina e calouros
    for (let i = 0; i < 9; i++) p.disc(16 + i * 28, 24 + (i % 2) * 10, 10, [pal.gold, C('#e05a4e'), C('#6cc3b5'), C('#ffd889')][i % 4]);
    sign(p, 128, 6, 'PROGRAMA DE AUDITORIO', pal.paper, C('#9c3b2c'), pal.gold);
    stagePlatform(p, 24, 62, 208, 12, C('#e8c45a'), C('#9c5a2a'));
    // mesa dos jurados com buzina
    table(c.f, 176, 96, 70, 14, pal.wood, C('#3f5a9a'));
    c.f.poly([[230, 86], [244, 80], [244, 92]], pal.gold);
    c.f.rect(222, 84, 9, 4, C('#e05a4e'));
    floor(p, 74, C('#7a4a26'), C('#6a4020'), 'boards');
    prop(c, 'mic', 112, 70, 'SW', 1);
    c.spots.host = { x: 80, y: 70, dir: 'SE' };
    c.spots.main = { x: 124, y: 70, dir: 'SE' };
    c.spots.side = { x: 210, y: 92, dir: 'SW', pose: 'sit' };
    c.spots.extra = { x: 190, y: 92, dir: 'SW', pose: 'sit' };
    crowdBlock(c, 4, 170, 104, 144, 20, { pose: 'stand', hop: 0.8, seed: 'aud' });
  } else if (kind === 'chart') {
    // painel da parada semanal
    for (let i = 0; i < 5; i++) {
      p.rect(20, 10 + i * 11, 70, 9, i === 0 ? pal.gold : shade(back, 0.25));
      sign(p, 30, 10 + i * 11, String(i + 1), i === 0 ? C('#241808') : pal.paper, i === 0 ? pal.gold : shade(back, 0.25));
    }
    c.blinks.push({ x: 20, y: 10, w: 70, h: 9, col: withAlpha(C('#ffffff'), 90), rate: 2 });
    sign(p, 170, 8, 'PARADA DA SEMANA', pal.paper, shade(back, -0.3), pal.accent);
    stagePlatform(p, 110, 60, 130, 12, shade(back, 0.3), shade(back, -0.2));
    floor(p, 72, shade(back, -0.3), shade(back, -0.4), 'tiles');
    prop(c, 'mic', 170, 66);
    c.spots.main = { x: 172, y: 68, dir: 'SE' };
    c.spots.host = { x: 130, y: 68, dir: 'SE' };
    c.spots.side = { x: 210, y: 68, dir: 'SW' };
    crowdBlock(c, 4, 252, 100, 144, 18, { hop: 0.8, seed: 'chart' });
  } else {
    // canal de clipes: paredes de TVs
    for (let j = 0; j < 4; j++) for (let i = 0; i < 10; i++) {
      const x = 10 + i * 24;
      const y = 8 + j * 15;
      const col = [pal.accent, pal.accent2, pal.screen, pal.glow][(i + j) % 4];
      screen(p, x, y, 20, 11, shade(col, -0.2), C('#1a1a22'), true);
      c.blinks.push({ x, y, w: 20, h: 11, col: withAlpha(col, 90), rate: 0.6 + ((i * 3 + j) % 5) * 0.5 });
    }
    floor(p, 72, shade(pal.bg, 0.15), shade(pal.bg, 0.05), 'checker');
    prop(c, 'stool', 110, 100);
    prop(c, 'stool', 146, 100);
    c.spots.host = { x: 110, y: 100, dir: 'SE', pose: 'sit' };
    c.spots.main = { x: 146, y: 100, dir: 'SW', pose: 'sit' };
    c.spots.side = { x: 170, y: 104, dir: 'SW' };
  }
  // câmeras
  prop(c, 'tv', 20, 140, 'SE');
  if (kind !== 'variety') c.blinks.push({ x: 16, y: 112, w: 2, h: 2, col: C('#ff3030'), rate: 1.5 });
}

/** Podcast em vídeo: mesa redonda, microfones de braço, espuma acústica, ring light. */
export function podcast(c: BuildCtx): void {
  const { p, pal } = c;
  wall(p, pal, 0, 78, shade(pal.bg, 0.1), 'plain');
  for (let y = 8; y < 60; y += 6) for (let x = 10; x < W - 10; x += 6) if ((x + y) % 12 === 2) p.rect(x, y, 5, 5, shade(pal.accent, -0.5)); else p.rect(x, y, 5, 5, shade(pal.bg, 0.2));
  sign(p, 128, 4, 'ON AIR', C('#ffffff'), C('#c02828'));
  c.blinks.push({ x: 108, y: 4, w: 40, h: 9, col: withAlpha(C('#ff6060'), 90), rate: 1 });
  floor(p, 78, pal.floors.lounge.a, pal.floors.lounge.b, 'boards');
  table(c.f, 70, 104, 116, 14, pal.woodDark);
  for (const x of [96, 160]) {
    c.f.line(x, 104, x + 6, 92, pal.metalDark);
    c.f.rect(x + 4, 88, 4, 6, pal.metal);
  }
  p.ring(220, 70, 9, pal.lamp);
  p.vline(220, 79, 110, pal.metalDark);
  c.spots.host = { x: 98, y: 102, dir: 'SE', pose: 'sit' };
  c.spots.main = { x: 158, y: 102, dir: 'SW', pose: 'sit' };
  c.spots.side = { x: 128, y: 98, dir: 'SE', pose: 'sit' };
}

/** Live: quarto com setup, câmera e o chat descendo ao lado. */
export function livestream(c: BuildCtx): void {
  const { p, pal } = c;
  wall(p, pal, 0, 80, shade(pal.accent, -0.55), 'plain');
  for (let i = 0; i < W; i += 2) p.put(i, 78, withAlpha(pal.accent2, 200));
  windowPane(p, 20, 16, 50, 34, pal, 'night');
  shelf(p, 84, 20, 30, 40, pal);
  floor(p, 80, pal.floors.lounge.a, pal.floors.lounge.b, 'carpet');
  prop(c, 'laptop_desk', 128, 104);
  // painel de chat
  p.rect(186, 6, 64, 132, withAlpha(C('#0a0a14'), 210));
  for (let i = 0; i < 12; i++) {
    p.rect(190, 12 + i * 10, 6, 6, [pal.accent, pal.accent2, pal.gold, pal.glow][i % 4]);
    p.rect(198, 13 + i * 10, 10 + ((i * 17) % 36), 2, C('#c8c8d8'));
    p.rect(198, 16 + i * 10, 6 + ((i * 11) % 26), 1, C('#8888a0'));
  }
  c.blinks.push({ x: 186, y: 6, w: 64, h: 132, col: withAlpha(C('#ffffff'), 12), rate: 2.5 });
  c.spots.main = { x: 120, y: 112, dir: 'SE', pose: 'sit' };
  c.spots.host = { x: 150, y: 116, dir: 'SW' };
  c.spots.side = { x: 60, y: 116, dir: 'SE' };
}

void mix;
void dith;
