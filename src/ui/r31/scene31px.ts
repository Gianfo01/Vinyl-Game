// R31 · onda 2 (V), acabamento onda 4 (POL) — salas das cenas de mecânica em pixel art, no MESMO corte lateral da
// sede e dos interiores (cut27/cutEnd27: parede da época, lâmpadas, contorno INK nos móveis, oclusão nos cantos) e
// com as peças da fonte única (prim27 / stage31px / props31 / window31). PURO: só Px.
// Cada sala devolve o FUNDO e a FRENTE: a mesa/balcão vai na frente de quem está sentado atrás dela (do tronco para
// cima, com a cadeira atrás) — antes os bonecos eram pintados por cima do tampo e pareciam de pé na mesa.
//   table     — mesa de negociação/renovação: janela com a cidade, quadro de cortiça, violão no suporte
//   office    — a sua sala: mesa, arquivo, disco de ouro e a parede de vidro por onde a equipe assiste
//   rehearsal — sala de ensaio: espuma, amplificadores, bateria e microfone
//   board     — reunião de lançamento: quadro com a linha do tempo e os cartões, mesa comprida
//   bank      — agência: colunas, cofre redondo, guichê com grade, relógio, mesa do gerente
//   ceo       — sala do dono rival: janelão com a cidade, sofá, estante com discos de ouro, mesa larga
//   radio     — rádio: aquário com o locutor, luz NO AR, mesa de som, discos na prateleira

import { cut27, cutEnd27, facadeCol27, type Cut27 } from '../pixel/interior27';
import { C, INK, Px, lv, mix, withAlpha } from '../pixel/px';
import { amp31, drumKit31 } from '../pixel/stage31px';
import { window31 } from '../pixel/window31';
import { prim27 } from '../ps/hqpx27';
import type { Room31 } from './scene31core';
import { registerPol31 } from './pol31';
import { l } from '../../data/world';

export const MW31 = 300, MH31 = 150, MFY31 = 127;
export interface RoomPx31 { back: Px; front: Px }
export interface RoomOpts31 { city?: string; month?: number; glass?: boolean; cards?: number; /** onde há gente sentada (cadeira atrás) */ seats?: { x: number; y: number }[] }

const blk = prim27.blk;
/** Mesa de lado (tampo com fio de luz, saia e pernas) na camada da frente. */
function tableFront(f: Px, c: Cut27, x: number, w: number, h = 14, top = c.pal.wood): void {
  const fy = c.fy;
  blk(f, x, fy - h, w, 3, top); f.hline(x, x + w - 1, fy - h, lv(top, 4.4));
  f.rect(x + 1, fy - h + 3, w - 2, 3, lv(top, 2)); // saia
  f.rect(x + 2, fy - h + 6, 3, h - 6, lv(top, 2.4)); f.rect(x + w - 5, fy - h + 6, 3, h - 6, lv(top, 2));
}
/** Encosto da cadeira atrás de quem senta (fundo). */
function chairBack(p: Px, c: Cut27, x: number): void {
  const col = c.year < 1970 ? c.pal.woodDark : c.year < 1995 ? c.pal.fabric : C('#2a2a32');
  blk(p, x - 6, c.fy - 26, 12, 14, col); p.vline(x - 5, c.fy - 12, c.fy - 1, lv(col, 2)); p.vline(x + 4, c.fy - 12, c.fy - 1, lv(col, 2));
}
function begin(year: number, o: RoomOpts31, floor: 'office' | 'studio' | 'lounge' | 'lobby', seed: number): { c: Cut27; f: Px } {
  const c = cut27(MW31, year, { floor, dim: false, seed, city: o.city });
  for (const s of o.seats ?? []) chairBack(c.layer, c, s.x);
  return { c, f: new Px(MW31, MH31) };
}
function end(c: Cut27, f: Px, k: 'office' | 'studio' | 'label' = 'office'): RoomPx31 {
  const back = cutEnd27(c, { dim: false, facade: facadeCol27(c.year, k) });
  f.outline(INK);
  return { back, front: f };
}

export function paintTable31(year: number, o: RoomOpts31 = {}): RoomPx31 {
  const { c, f } = begin(year, o, 'lounge', 271);
  const { layer: p, back, g, y0, fy } = c;
  window31(back, 28, y0 + 12, 44, 28, o.city ?? 'rio', year, o.month ?? 6);
  prim27.corkBoard({ ...g, p }, 228, y0 + 12, 40, 24);
  prim27.guitar({ ...g, p }, 270, fy, c.pal.accent);
  prim27.plant({ ...g, p }, 30, fy, true);
  tableFront(f, c, 74, 150);
  f.poly([[100, fy - 15], [114, fy - 15], [115, fy - 14], [99, fy - 14]], c.pal.paper); // contrato
  f.rect(184, fy - 17, 5, 3, c.pal.paper); f.rect(189, fy - 16, 1, 1, c.pal.paper); // xícara
  return end(c, f);
}

export function paintOffice31(year: number, o: RoomOpts31 = {}): RoomPx31 {
  const glass = o.glass ?? true;
  const { c, f } = begin(year, o, 'office', 113);
  const { layer: p, back, g, y0, fy } = c;
  window31(back, 26, y0 + 12, 40, 26, o.city ?? 'rio', year, o.month ?? 6);
  prim27.goldDisc({ ...g, p }, 78, y0 + 14);
  prim27.filing({ ...g, p }, 150, fy); prim27.filing({ ...g, p }, 160, fy);
  prim27.plant({ ...g, p }, 176, fy);
  if (glass) { // parede de vidro da equipe: caixilho na frente, vidro translúcido (quem assiste fica atrás)
    const gx = 198, gw = 80;
    blk(f, gx, y0 + 4, 3, fy - y0 - 4, c.pal.metalDark); blk(f, gx + gw - 3, y0 + 4, 3, fy - y0 - 4, c.pal.metalDark);
    blk(f, gx, y0 + 4, gw, 3, c.pal.metalDark); blk(f, gx, fy - 8, gw, 8, mix(c.pal.wall, C('#8a8478'), 0.4));
    f.rect(gx + 3, y0 + 7, gw - 6, fy - y0 - 15, withAlpha(C('#c8e0ec'), 54));
    for (let i = 0; i < 3; i++) f.line(gx + 8 + i * 22, y0 + 10, gx + 18 + i * 22, fy - 12, withAlpha(C('#ffffff'), 70));
  }
  tableFront(f, c, 70, 64);
  blk(f, 120, fy - 18, 9, 4, year < 1990 ? C('#2a2a2e') : C('#c8ccd4')); // telefone / monitor
  f.poly([[82, fy - 15], [96, fy - 15], [97, fy - 14], [81, fy - 14]], c.pal.paper);
  return end(c, f);
}

export function paintRehearsal31(year: number, o: RoomOpts31 = {}): RoomPx31 {
  const { c, f } = begin(year, o, 'studio', 61);
  const { layer: p, back, g, y0, x0, w0, fy } = c;
  prim27.foam({ ...g, p: back }, x0 + 2, y0 + 8, w0 - 4, 40);
  amp31(p, 30, fy, year, true); amp31(p, 250, fy, year, true); amp31(p, 268, fy, year, false);
  drumKit31(p, 138, fy, year, c.pal.accent2);
  prim27.micStand({ ...g, p }, 100, fy); prim27.micStand({ ...g, p }, 200, fy);
  prim27.couch({ ...g, p }, 48, fy, 30, c.pal.fabric);
  return end(c, f, 'studio');
}

export function paintBoard31(year: number, o: RoomOpts31 = {}): RoomPx31 {
  const cards = o.cards ?? 0;
  const { c, f } = begin(year, o, 'office', 199);
  const { layer: p, back, y0, fy, pal } = c;
  const board = year < 1960 ? C('#2f4a3a') : C('#eef1f2'), ink = year < 1960 ? C('#e8e8e0') : C('#2a2a30');
  blk(p, 70, y0 + 10, 160, 40, pal.metalDark); void back;
  const q = new Px(MW31, MH31); q.rect(72, y0 + 12, 156, 36, board);
  q.hline(80, 220, y0 + 38, ink);
  for (let i = 0; i < 6; i++) q.vline(84 + i * 26, y0 + 36, y0 + 40, ink);
  const cc = [pal.accent, pal.accent2, pal.gold, mix(pal.accent, C('#4aa3df'), 0.6), mix(pal.accent2, C('#7ac74f'), 0.6), mix(pal.gold, C('#e05a9d'), 0.5)];
  for (let i = 0; i < Math.min(6, cards); i++) { q.rect(78 + i * 26, y0 + 18 + (i % 2) * 6, 15, 10, cc[i]); q.hline(80 + i * 26, 90 + i * 26, y0 + 21 + (i % 2) * 6, lv(cc[i], 1.4)); }
  q.rect(76, y0 + 48, 148, 2, pal.metal);
  c.layer.blit(q, 0, 0);
  prim27.plant({ ...c.g, p }, 272, fy, true);
  tableFront(f, c, 62, 196);
  f.poly([[110, fy - 15], [124, fy - 15], [125, fy - 14], [109, fy - 14]], pal.paper); f.poly([[170, fy - 15], [182, fy - 15], [183, fy - 14], [169, fy - 14]], pal.paper);
  return end(c, f, 'label');
}

export function paintBank31(year: number, o: RoomOpts31 = {}): RoomPx31 {
  const { c, f } = begin(year, o, 'lobby', 41);
  const { layer: p, back, y0, fy, pal } = c;
  for (const x of [24, 268]) { blk(back, x, y0, 10, fy - y0, mix(pal.wall2, C('#e8e2d0'), 0.5)); back.hline(x - 1, x + 10, y0 + 2, pal.trim); back.hline(x - 1, x + 10, fy - 3, pal.trim); }
  // cofre redondo
  p.disc(232, y0 + 34, 18, pal.metalDark); p.disc(232, y0 + 34, 15, pal.metal); p.disc(232, y0 + 34, 4, pal.metalDark);
  for (let a = 0; a < 6; a++) { const r = (a / 6) * Math.PI * 2; p.put(232 + Math.round(Math.cos(r) * 10), y0 + 34 + Math.round(Math.sin(r) * 10), INK); }
  // relógio e letreiro
  p.disc(150, y0 + 12, 6, pal.paper); p.vline(150, y0 + 8, y0 + 12, INK); p.hline(150, 153, y0 + 12, INK);
  // guichê com grade
  blk(p, 44, fy - 30, 60, 30, pal.woodDark); blk(p, 42, fy - 32, 64, 3, pal.wood);
  for (let x = 47; x < 104; x += 5) p.vline(x, y0 + 26, fy - 33, pal.metal);
  p.hline(45, 103, y0 + 26, pal.metalDark);
  tableFront(f, c, 120, 96);
  f.poly([[150, fy - 15], [164, fy - 15], [165, fy - 14], [149, fy - 14]], pal.paper); f.rect(186, fy - 18, 8, 4, pal.accent2);
  return end(c, f);
}

export function paintCeo31(year: number, o: RoomOpts31 = {}): RoomPx31 {
  const { c, f } = begin(year, o, 'lounge', 97);
  const { layer: p, back, g, y0, fy, pal } = c;
  window31(back, 150, y0 + 8, 110, 40, o.city ?? 'rio', year, o.month ?? 6);
  prim27.shelf({ ...g, p }, 26, y0 + 30, 26, fy - y0 - 30, 'records');
  for (let i = 0; i < 3; i++) prim27.goldDisc({ ...g, p }, 60 + i * 14, y0 + 12, i === 1);
  prim27.couch({ ...g, p }, 58, fy, 40, pal.fabric);
  prim27.plant({ ...g, p }, 276, fy, true);
  tableFront(f, c, 120, 120, 14, pal.woodDark);
  f.poly([[156, fy - 15], [172, fy - 15], [173, fy - 14], [155, fy - 14]], pal.paper); f.rect(196, fy - 17, 6, 3, pal.gold);
  return end(c, f, 'label');
}

export function paintRadio31(year: number, o: RoomOpts31 = {}): RoomPx31 {
  const { c, f } = begin(year, o, 'studio', 83);
  const { layer: p, back, g, y0, fy, pal } = c;
  prim27.shelf({ ...g, p }, 24, y0 + 10, 40, 34, year < 1985 ? 'records' : 'cds');
  // aquário (vidro) com o microfone; luz NO AR
  const ax = 176, aw = 100;
  blk(f, ax, y0 + 6, 3, fy - y0 - 6, pal.metalDark); blk(f, ax + aw - 3, y0 + 6, 3, fy - y0 - 6, pal.metalDark); blk(f, ax, y0 + 6, aw, 3, pal.metalDark);
  blk(f, ax, fy - 10, aw, 10, mix(pal.wall, C('#8a8478'), 0.4));
  f.rect(ax + 3, y0 + 9, aw - 6, fy - y0 - 19, withAlpha(C('#c8e0ec'), 50));
  prim27.foam({ ...g, p: back }, ax + 4, y0 + 10, aw - 8, 20);
  blk(p, 214, y0 - 2, 24, 7, C('#1a1214')); p.rect(215, y0 - 1, 22, 5, C('#e83030')); p.hline(218, 234, y0 + 1, C('#ffd0c0'));
  prim27.micStand({ ...g, p }, 236, fy - 10);
  // mesa de som na frente de quem opera
  prim27.consoleDesk({ ...g, p: f }, 70, fy, 72);
  return end(c, f, 'studio');
}

export function paintRoom31(room: Room31, year: number, glass = true, cards = 0, o: RoomOpts31 = {}): RoomPx31 {
  const oo = { ...o, glass, cards };
  switch (room) {
    case 'table': return paintTable31(year, oo);
    case 'office': return paintOffice31(year, oo);
    case 'rehearsal': return paintRehearsal31(year, oo);
    case 'board': return paintBoard31(year, oo);
    case 'bank': return paintBank31(year, oo);
    case 'ceo': return paintCeo31(year, oo);
    case 'radio': return paintRadio31(year, oo);
  }
}

/** Onde cada um fica: x,y no pé do boneco; pose e direção; `behind` = atrás da mesa/vidro (camada da frente).
 *  Você à esquerda, a outra parte à direita, quem assiste ao fundo ou atrás do vidro. Todo pé fica no chão (y = MFY31). */
export interface Spot31 { x: number; y: number; pose: 'stand' | 'sit'; dir: 'SE' | 'SW'; behind?: boolean }
export function spots31(room: Room31, sides: ('you' | 'them' | 'watch')[]): Spot31[] {
  let nThem = 0, nWatch = 0;
  const Y = MFY31;
  const sit = (x: number, dir: 'SE' | 'SW'): Spot31 => ({ x, y: Y, pose: 'sit', dir, behind: true });
  const stand = (x: number, dir: 'SE' | 'SW', behind = false): Spot31 => ({ x, y: Y, pose: 'stand', dir, ...(behind ? { behind } : {}) });
  return sides.map((sd) => {
    if (room === 'table') {
      if (sd === 'you') return sit(98, 'SE');
      if (sd === 'them') { const i = nThem++; return sit(170 + i * 22, 'SW'); }
      const i = nWatch++; return stand(252 - i * 14, 'SW');
    }
    if (room === 'office') {
      if (sd === 'you') return sit(92, 'SE');
      if (sd === 'them') { const i = nThem++; return stand(146 + i * 16, 'SW'); }
      const i = nWatch++; return stand(222 + i * 16, 'SW', true);
    }
    if (room === 'board') { // você de pé junto ao quadro; a equipe em volta da mesa comprida
      if (sd === 'you') return stand(44, 'SE');
      if (sd === 'them') { const i = nThem++; return sit(90 + i * 30, i % 2 ? 'SW' : 'SE'); }
      const i = nWatch++; return stand(278 - i * 12, 'SW');
    }
    if (room === 'bank' || room === 'ceo') { // você de um lado da mesa; o dono/gerente do outro; quem assiste ao fundo
      if (sd === 'you') return sit(138, 'SE');
      if (sd === 'them') { const i = nThem++; return sit(206 + i * 18, 'SW'); }
      const i = nWatch++; return room === 'bank' ? stand(70 + i * 14, 'SE') : stand(108 - i * 14, 'SE');
    }
    if (room === 'radio') { // você junto à mesa de som; o diretor do lado do aquário
      if (sd === 'you') return stand(150, 'SE');
      if (sd === 'them') { const i = nThem++; return stand(162 + i * 14, 'SW'); }
      const i = nWatch++; return stand(40 + i * 14, 'SE');
    }
    if (sd === 'you') return stand(70, 'SE');
    const i = nThem++ + nWatch;
    return stand(96 + (i % 6) * 26, i % 2 ? 'SW' : 'SE');
  });
}

// ---------------------------------------------------------------- exemplos para a checagem automática (POL)
const ROOMS31: Room31[] = ['table', 'office', 'rehearsal', 'board', 'bank', 'ceo', 'radio'];
registerPol31('mech31', () => ROOMS31.flatMap((room) => [1930, 1975, 2024].map((year) => {
  const sides: ('you' | 'them' | 'watch')[] = ['you', 'them', 'them', 'watch', 'watch'];
  const sp = spots31(room, sides);
  const r = paintRoom31(room, year, true, 4, { seats: sp.filter((x) => x.pose === 'sit') });
  return { id: `mech31:${room}:${year}`, W: MW31, H: MH31, back: r.back, front: r.front, floors: [MFY31], people: sp, texts: [],
    spots: sp.map((x, i) => ({ id: `p${i}`, x: x.x - 7, y: x.y - (x.pose === 'sit' ? 26 : 32), w: 14, h: x.pose === 'sit' ? 26 : 32, label: l(sides[i], sides[i]), tip: l('-', '-'), go: { panel: 'x' }, quiet: true })) };
})));
