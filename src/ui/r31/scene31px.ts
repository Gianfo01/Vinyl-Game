// R31 · onda 2 (V) — salas das cenas de mecânica em pixel art (estilo antigo do jogo: paleta da era, contorno INK,
// relevo pela silhueta, pontilhado). Mesmo tamanho lógico das cenas da rodada 27 (200×92) e os mesmos bonecos
// (avatarSprite via drawScene27). PURO: só Px.
//   table     — a mesa de negociação/renovação (paintTable27, sem cartas)
//   office    — a sua sala: mesa, janela, arquivo e a parede de vidro por onde a equipe assiste
//   rehearsal — sala de ensaio: espuma, amplificadores, bateria e tapete

import { paintTable27, W27, H27 } from '../act27/scene27';
import { paletteOf, type Palette } from '../pixel/palette';
import { C, INK, Px, dith, inked, mix, noise, shade } from '../pixel/px';
import type { Room31 } from './scene31core';

function room(p: Px, pal: Palette, floorY: number, kind: 'office' | 'studio' | 'lounge'): void {
  const fl = pal.floors[kind];
  p.fill((x, y) => (y < floorY ? shade(x % 12 < 6 ? pal.wall : mix(pal.wall, pal.wall2, 0.15), 0.04 - y / floorY * 0.12 + (noise(x >> 2, y >> 2, 11) - 0.5) * 0.02) : ((x >> 3) + (y >> 2)) % 2 ? fl.a : fl.b));
  p.hline(0, p.w - 1, floorY - 1, pal.trim);
  p.hline(0, p.w - 1, floorY, shade(pal.trim, -0.3));
}

/** A sua sala: janela com a cidade, mesa com papéis e telefone, arquivo, quadro e a parede de vidro (à direita). */
export function paintOffice31(year: number, glass = true): Px {
  const pal = paletteOf(year);
  const p = new Px(W27, H27);
  room(p, pal, 60, 'office');
  // janela
  p.rect(10, 10, 36, 26, pal.outline); p.rect(11, 11, 34, 24, mix(pal.sky, C('#9fc4e8'), 0.35));
  for (let i = 0; i < 7; i++) { const x = 12 + i * 5, hh = 5 + ((i * 7) % 11); p.rect(x, 35 - hh, 4, hh, shade(pal.outline, 0.55)); }
  p.vline(28, 11, 34, pal.outline); p.hline(11, 44, 23, pal.outline);
  // quadro (disco de ouro) na parede
  p.rect(56, 12, 18, 20, pal.woodDark); p.rect(57, 13, 16, 18, shade(pal.wall2, -0.2)); p.disc(65, 21, 6, pal.gold); p.disc(65, 21, 1, pal.outline);
  // parede de vidro da equipe
  if (glass) {
    p.rect(132, 0, 68, 60, shade(pal.wall, -0.15));
    p.rect(136, 6, 60, 46, pal.outline); p.rect(137, 7, 58, 44, mix(pal.glass, C('#dfeaf0'), 0.3));
    p.fill((x, y) => (dith(x, y, 0.25) && (x + y) % 9 === 0 ? mix(p.get(x, y), C('#ffffff'), 0.4) : p.get(x, y)), 137, 7, 58, 44);
    p.vline(166, 7, 50, pal.outline);
  }
  inked(p, (q) => {
    // arquivo
    q.rect(80, 30, 14, 30, pal.metalDark); for (let i = 0; i < 3; i++) { q.rect(81, 32 + i * 9, 12, 8, pal.metal); q.hline(85, 89, 35 + i * 9, pal.outline); }
    // mesa do chefe (tampo em perspectiva), papéis, telefone e luminária
    q.poly([[34, 62], [118, 62], [126, 72], [26, 72]], pal.wood);
    q.hline(26, 126, 72, pal.woodDark); q.rect(26, 73, 100, 3, shade(pal.woodDark, -0.2));
    q.rect(30, 76, 4, 13, pal.woodDark); q.rect(118, 76, 4, 13, pal.woodDark);
    q.poly([[60, 64], [74, 63], [76, 69], [62, 70]], pal.paper);
    q.rect(96, 63, 10, 5, pal.outline); q.rect(97, 62, 8, 2, pal.accent2);
    q.vline(44, 54, 63, pal.metalDark); q.poly([[38, 54], [50, 54], [47, 50], [41, 50]], pal.accent);
  }, INK, { relief: true });
  return p;
}

/** Sala de ensaio: espuma, amplificadores, bateria simples, tapete. */
export function paintRehearsal31(year: number): Px {
  const pal = paletteOf(year);
  const p = new Px(W27, H27);
  room(p, pal, 62, 'studio');
  const foam = mix(pal.fabric, C('#3a3f4a'), 0.5);
  for (let y = 6; y < 54; y += 6) for (let x = 4; x < 196; x += 6) { p.rect(x, y, 5, 5, ((x + y) >> 1) % 2 ? shade(foam, -0.12) : foam); p.hline(x, x + 4, y, shade(foam, 0.15)); }
  p.ellipse(100, 76, 70, 10, shade(pal.fabric2, -0.1));
  inked(p, (q) => {
    // amplificadores
    q.rect(10, 44, 20, 18, pal.outline); q.rect(11, 45, 18, 16, pal.woodDark); q.rect(13, 48, 14, 10, shade(pal.fabric, -0.45));
    q.rect(170, 40, 22, 22, pal.outline); q.rect(171, 41, 20, 20, pal.woodDark); q.rect(173, 44, 16, 14, shade(pal.fabric, -0.45));
    // bateria (fundo, no meio)
    q.ellipse(100, 58, 9, 6, pal.accent2); q.ellipse(100, 56, 9, 2, shade(pal.accent2, 0.3));
    q.ellipse(84, 52, 5, 2, mix(pal.gold, pal.metal, 0.4)); q.vline(84, 52, 62, pal.metalDark);
    q.ellipse(116, 50, 6, 2, mix(pal.gold, pal.metal, 0.4)); q.vline(116, 50, 62, pal.metalDark);
    // pedestal de microfone
    q.vline(60, 40, 70, pal.metalDark); q.rect(58, 36, 5, 5, pal.metal); q.hline(56, 64, 70, pal.metalDark);
  }, INK, { relief: true });
  return p;
}

// ---------------------------------------------------------------- onda 4 (W): salas do lote 2

/** Sala de reunião com QUADRO BRANCO: a linha do tempo do lançamento com os cartões (cores por canal), mesa comprida. */
export function paintBoard31(year: number, cards = 0): Px {
  const pal = paletteOf(year);
  const p = new Px(W27, H27);
  room(p, pal, 60, 'office');
  // quadro (lousa antes de 1960, quadro branco depois) com a linha do tempo
  const board = year < 1960 ? shade(C('#2f4a3a'), 0.05) : C('#eef1f2');
  const ink = year < 1960 ? C('#e8e8e0') : pal.outline;
  p.rect(30, 8, 140, 40, pal.metalDark); p.rect(32, 10, 136, 36, board);
  p.hline(38, 162, 34, ink);
  for (let i = 0; i < 6; i++) p.vline(40 + i * 24, 32, 36, ink);
  const cc = [pal.accent, pal.accent2, pal.gold, mix(pal.accent, C('#4aa3df'), 0.6), mix(pal.accent2, C('#7ac74f'), 0.6), mix(pal.gold, C('#e05a9d'), 0.5)];
  for (let i = 0; i < Math.min(6, cards); i++) { p.rect(36 + i * 24, 16 + (i % 2) * 6, 14, 10, cc[i]); p.hline(38 + i * 24, 47 + i * 24, 19 + (i % 2) * 6, shade(cc[i], -0.4)); }
  p.rect(32, 46, 136, 2, pal.metal); // calha dos pincéis
  inked(p, (q) => {
    q.poly([[40, 64], [160, 64], [172, 74], [28, 74]], pal.wood);
    q.hline(28, 172, 74, pal.woodDark); q.rect(28, 75, 144, 3, shade(pal.woodDark, -0.2));
    q.rect(34, 78, 4, 11, pal.woodDark); q.rect(162, 78, 4, 11, pal.woodDark);
    q.poly([[70, 66], [84, 65], [86, 70], [72, 71]], pal.paper); q.poly([[110, 66], [122, 66], [123, 70], [111, 70]], pal.paper);
  }, INK, { relief: true });
  return p;
}

/** Agência do banco: balcão com grade, cofre redondo ao fundo, relógio, mesa do gerente. */
export function paintBank31(year: number): Px {
  const pal = paletteOf(year);
  const p = new Px(W27, H27);
  room(p, pal, 60, 'office');
  // colunas e cofre
  for (const x of [8, 182]) { p.rect(x, 4, 10, 56, mix(pal.wall2, C('#e8e2d0'), 0.5)); p.hline(x - 1, x + 10, 4, pal.trim); }
  p.disc(150, 30, 18, pal.metalDark); p.disc(150, 30, 15, pal.metal); p.disc(150, 30, 4, pal.metalDark);
  for (let a = 0; a < 6; a++) { const r = (a / 6) * Math.PI * 2; p.set(150 + Math.round(Math.cos(r) * 10), 30 + Math.round(Math.sin(r) * 10), pal.outline); }
  // relógio e letreiro
  p.disc(100, 14, 7, pal.paper); p.disc(100, 14, 1, pal.outline); p.vline(100, 9, 14, pal.outline); p.hline(100, 104, 14, pal.outline);
  p.rect(26, 8, 52, 9, pal.woodDark); p.hline(30, 74, 12, pal.gold);
  inked(p, (q) => {
    // balcão com grade (caixas)
    q.rect(20, 38, 64, 22, pal.woodDark); q.rect(20, 36, 64, 3, pal.wood);
    for (let x = 24; x < 82; x += 5) q.vline(x, 22, 36, pal.metal);
    q.hline(22, 82, 22, pal.metalDark);
    // mesa do gerente
    q.poly([[50, 64], [150, 64], [158, 74], [42, 74]], pal.wood);
    q.hline(42, 158, 74, pal.woodDark); q.rect(42, 75, 116, 3, shade(pal.woodDark, -0.2));
    q.poly([[92, 66], [108, 65], [110, 70], [94, 71]], pal.paper); q.rect(118, 64, 8, 6, pal.accent2);
  }, INK, { relief: true });
  return p;
}

/** Sala do dono (CEO rival): janela grande, sofá, estante com discos de ouro, mesa larga. */
export function paintCeo31(year: number): Px {
  const pal = paletteOf(year);
  const p = new Px(W27, H27);
  room(p, pal, 60, 'lounge');
  p.rect(100, 6, 92, 40, pal.outline); p.rect(101, 7, 90, 38, mix(pal.sky, C('#9fc4e8'), 0.3));
  for (let i = 0; i < 12; i++) { const x = 102 + i * 7, hh = 8 + ((i * 11) % 19); p.rect(x, 45 - hh, 6, hh, shade(pal.outline, 0.5)); }
  p.vline(146, 7, 44, pal.outline);
  for (let i = 0; i < 3; i++) { p.rect(12 + i * 26, 12, 20, 20, pal.woodDark); p.rect(13 + i * 26, 13, 18, 18, shade(pal.wall2, -0.2)); p.disc(22 + i * 26, 22, 6, i === 1 ? pal.metal : pal.gold); p.disc(22 + i * 26, 22, 1, pal.outline); }
  inked(p, (q) => {
    q.rect(10, 48, 40, 12, pal.fabric); q.rect(10, 44, 40, 5, shade(pal.fabric, 0.15)); // sofá
    q.poly([[56, 62], [164, 62], [172, 73], [48, 73]], pal.woodDark);
    q.hline(48, 172, 73, shade(pal.woodDark, -0.3)); q.rect(48, 74, 124, 3, shade(pal.woodDark, -0.35));
    q.poly([[96, 64], [112, 63], [114, 68], [98, 69]], pal.paper); q.rect(132, 62, 6, 5, pal.gold);
  }, INK, { relief: true });
  return p;
}

/** Rádio: aquário (vidro) com o locutor e o microfone, mesa de som, discos na prateleira, luz "NO AR". */
export function paintRadio31(year: number): Px {
  const pal = paletteOf(year);
  const p = new Px(W27, H27);
  room(p, pal, 60, 'studio');
  p.rect(110, 6, 84, 46, pal.outline); p.rect(111, 7, 82, 44, mix(pal.glass, C('#dfeaf0'), 0.35));
  p.fill((x, y) => (dith(x, y, 0.25) && (x + y) % 9 === 0 ? mix(p.get(x, y), C('#ffffff'), 0.4) : p.get(x, y)), 111, 7, 82, 44);
  p.rect(140, 2, 24, 6, C('#b3261e')); p.hline(144, 160, 4, C('#ffd6d0')); // luz "no ar"
  for (let i = 0; i < 14; i++) p.rect(8 + i * 3, 12 + (i % 3), 2, 18 - (i % 3), [pal.accent, pal.accent2, pal.gold, pal.metal][i % 4]); // discos
  p.hline(6, 52, 30, pal.woodDark);
  inked(p, (q) => {
    // mesa de som
    q.poly([[40, 62], [120, 62], [126, 72], [34, 72]], pal.metalDark);
    for (let i = 0; i < 10; i++) q.vline(48 + i * 7, 63, 69, i % 3 ? pal.metal : pal.accent);
    q.rect(34, 73, 92, 3, shade(pal.metalDark, -0.3));
    // microfone no aquário
    q.vline(150, 30, 50, pal.metalDark); q.rect(147, 26, 6, 6, pal.metal);
  }, INK, { relief: true });
  return p;
}

export function paintRoom31(room: Room31, year: number, glass = true, cards = 0): Px {
  switch (room) {
    case 'table': return paintTable27(year, [], 0);
    case 'office': return paintOffice31(year, glass);
    case 'rehearsal': return paintRehearsal31(year);
    case 'board': return paintBoard31(year, cards);
    case 'bank': return paintBank31(year);
    case 'ceo': return paintCeo31(year);
    case 'radio': return paintRadio31(year);
  }
}

/** Onde cada um fica: x,y no pé do boneco; pose e direção. `you` à esquerda, a outra parte à direita, quem assiste atrás do vidro. */
export interface Spot31 { x: number; y: number; pose: 'stand' | 'sit'; dir: 'SE' | 'SW' }
export function spots31(room: Room31, sides: ('you' | 'them' | 'watch')[]): Spot31[] {
  let nThem = 0, nWatch = 0;
  return sides.map((sd) => {
    if (room === 'table') {
      if (sd === 'you') return { x: 56, y: 66, pose: 'sit', dir: 'SE' };
      if (sd === 'them') { const i = nThem++; return { x: 140 + i * 18, y: 66 - i * 6, pose: 'sit', dir: 'SW' }; }
      const i = nWatch++; return { x: 176 - i * 12, y: 56, pose: 'stand', dir: 'SW' };
    }
    if (room === 'office') {
      if (sd === 'you') return { x: 70, y: 70, pose: 'sit', dir: 'SE' };
      if (sd === 'them') { const i = nThem++; return { x: 112 + i * 14, y: 84 - i * 4, pose: 'stand', dir: 'SW' }; }
      const i = nWatch++; return { x: 148 + i * 14, y: 50, pose: 'stand', dir: 'SW' };
    }
    if (room === 'board') { // você na cabeceira; a equipe em volta da mesa comprida
      if (sd === 'you') return { x: 22, y: 86, pose: 'stand', dir: 'SE' };
      if (sd === 'them') { const i = nThem++; return { x: 64 + i * 36, y: 70, pose: 'sit', dir: i % 2 ? 'SW' : 'SE' }; }
      const i = nWatch++; return { x: 182 - i * 12, y: 84, pose: 'stand', dir: 'SW' };
    }
    if (room === 'bank' || room === 'ceo') { // você de um lado da mesa; o dono/gerente do outro; quem assiste ao fundo
      if (sd === 'you') return { x: 66, y: 70, pose: 'sit', dir: 'SE' };
      if (sd === 'them') { const i = nThem++; return { x: 132 + i * 18, y: 70 - i * 4, pose: 'sit', dir: 'SW' }; }
      const i = nWatch++; return { x: room === 'bank' ? 30 + i * 14 : 180 - i * 14, y: 62, pose: 'stand', dir: room === 'bank' ? 'SE' : 'SW' };
    }
    if (room === 'radio') { // você junto à mesa de som; o diretor do lado do aquário
      if (sd === 'you') return { x: 52, y: 84, pose: 'stand', dir: 'SE' };
      if (sd === 'them') { const i = nThem++; return { x: 108 + i * 20, y: 84, pose: 'stand', dir: 'SW' }; }
      const i = nWatch++; return { x: 24 + i * 12, y: 80, pose: 'stand', dir: 'SE' };
    }
    if (sd === 'you') return { x: 40, y: 84, pose: 'stand', dir: 'SE' };
    const i = nThem++ + nWatch;
    return { x: 72 + (i % 5) * 26, y: 78 - (i % 2) * 6, pose: 'stand', dir: i % 2 ? 'SW' : 'SE' };
  });
}
