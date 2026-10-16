// R31 · onda 2 · K + L — PINTURA das salas em cena (pixel art no mesmo corte lateral da sede, hqpx27).
//
//   layout31(m, minW)   — PURO: geometria (sala ou andares, chão, retângulo de cada ponto clicável em pixels lógicos);
//   paintSala31(m, lay) — PURO (só Px): parede da casca e da época, mobília com contorno INK, luz, oclusão;
//   drawSala31(canvas, m, o) — DOM: pinta, desenha os bonecos reais (avatarSprite) e os balões de humor.
// Mesmas peças da sede (prim27): contorno escuro quente, luz de cima à esquerda, paleta da era (paletteOf).

import { C, INK, Px, lv, mix, noise, tint, withAlpha, type Col } from '../pixel/px';
import { eraOf, paletteOf } from '../pixel/palette';
import { avatarSprite, lookOf } from '../pixel/avatar';
import { drawText } from '../pixel/font';
import { relicArtOf28, relicPx28 } from '../pixel/relic28';
import { prim27, type Cell27, type Ctx27, type Plan27 } from '../ps/hqpx27';
import type { Appearance } from '../../sim/types';
import type { Fig31, Hot31, Prop31, SalaM31 } from './salas31model';

// ---------------------------------------------------------------- geometria (pura)

export interface Rect31 { x: number; y: number; w: number; h: number }
export interface Room31 extends Rect31 { floor: number }
export interface Lay31 {
  W: number; H: number;
  rooms: Room31[];
  /** faixa dos andares de cima esmaecidos (Equipe em sede grande) */
  upper?: Rect31;
  /** posição x de uma fração e largura em pixels */
  X: (f: number) => number; Wd: (f: number) => number;
  /** chão de um andar */
  fy: (floor: number) => number;
  hits: Record<string, Rect31>;
  you?: { x: number; y: number };
}

const OW = 6, TOP = 8, SLAB = 6, BASE = 8;
const RH1 = 124, RH2 = 80, UP = 30;

export function layout31(m: SalaM31, minW = 0): Lay31 {
  const W = Math.max(m.art.W, Math.floor(minW));
  const team = m.id === 'team';
  const rooms: Room31[] = [];
  const up = team && m.art.upper > 0 ? UP : 0;
  let H: number;
  if (team) {
    H = TOP + up + 2 * RH2 + SLAB + BASE;
    rooms.push({ x: OW, y: TOP + up + RH2 + SLAB, w: W - 2 * OW, h: RH2, floor: 0 });
    rooms.push({ x: OW, y: TOP + up, w: W - 2 * OW, h: RH2, floor: 1 });
  } else {
    H = TOP + RH1 + BASE;
    rooms.push({ x: OW, y: TOP, w: W - 2 * OW, h: RH1, floor: 0 });
  }
  const x0 = OW + 2, w0 = W - 2 * OW - 4;
  const X = (f: number) => Math.round(x0 + f * w0);
  const Wd = (f: number) => Math.max(6, Math.round(f * w0));
  const fy = (floor: number) => { const r = rooms.find((x) => x.floor === floor) ?? rooms[0]; return r.y + r.h - 3; };
  const lay: Lay31 = { W, H, rooms, upper: up ? { x: OW, y: TOP, w: W - 2 * OW, h: up - 2 } : undefined, X, Wd, fy, hits: {} };
  for (const h of m.hots) lay.hits[h.id] = hitOf(m, lay, h);
  if (m.you.here) lay.you = { x: X(m.you.x), y: fy(0) };
  return lay;
}

/** Tamanho aproximado de cada peça (para a área de clique; maior que o desenho). */
const BOX: Partial<Record<Prop31, [number, number]>> = {
  console: [0, 30], reel: [20, 32], onair: [22, 10], door: [16, 34], couch: [0, 18], guitarstand: [10, 28], suitcase: [14, 12], ghost: [14, 34],
  cork: [0, 28], desk: [0, 30], vacancy: [0, 30], clipboard: [10, 14], masters: [0, 92], scores: [0, 80], portraits: [0, 70], boxes: [0, 44],
  demos: [12, 20], notebook: [16, 16], flyer: [16, 22], pedestal: [0, 70], trophies: [0, 36], whiteboard: [0, 40], mirror: [0, 44], clients: [0, 40],
  routemap: [0, 44], booth: [0, 70], tents: [0, 30], servers: [0, 70], screen: [0, 54], projector: [18, 30], records: [0, 30], phone: [10, 10], schedule: [0, 34],
  typewriter: [0, 30], stage: [0, 60], piano: [28, 26], glass: [6, 90], window: [0, 30],
};
const WALL: Partial<Record<Prop31, number>> = { onair: 6, cork: 30, clipboard: 30, flyer: 24, whiteboard: 20, clients: 22, routemap: 18, schedule: 22, screen: 14, portraits: 10 };

function hitOf(m: SalaM31, L: Lay31, h: Hot31): Rect31 {
  const floor = h.pp?.n !== undefined && m.id === 'team' ? h.pp.n : 0;
  const fy = L.fy(floor);
  const x = L.X(h.x), w = L.Wd(h.w);
  if (h.id === 'upper' && L.upper) return pad(L.upper, 0);
  if (h.kind === 'person' && h.fig) {
    const cx = h.prop ? x + Math.round(w / 2) : x + Math.round(w / 2);
    const lift = h.fig.lift ?? 0;
    return pad({ x: cx - 9, y: fy - lift - 34, w: 18, h: 36 }, 3);
  }
  const b = (h.prop && BOX[h.prop]) || [0, 24];
  const bw = b[0] || w, bh = b[1];
  const wall = h.prop ? WALL[h.prop] : undefined;
  const y = wall !== undefined ? L.rooms.find((r) => r.floor === floor)!.y + wall : fy - bh;
  return pad({ x, y, w: bw, h: bh }, 3);
}
/** Área de clique maior que o desenho: margem e, no mínimo, 16×16 pixels lógicos (32 px na tela). */
const pad = (r: Rect31, p: number): Rect31 => {
  const w = Math.max(16, r.w + 2 * p), h = Math.max(16, r.h + 2 * p);
  return { x: Math.round(r.x + r.w / 2 - w / 2), y: Math.round(r.y + r.h / 2 - h / 2), w, h };
};

// ---------------------------------------------------------------- pintura (pura)

const OCC = C('#2a1634');
const hs = (str: string): number => { let x = 2166136261; for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619) >>> 0; return x; };

function ctxOf(m: SalaM31, L: Lay31): { g: Ctx27; pl: Plan27 } {
  const a = m.art;
  const pal = paletteOf(a.year);
  const seed = hs(`${a.seed}|${a.hq}`);
  const pl = {
    hq: a.hq, year: a.year, shell: a.shell, gear: a.gear, light: a.light, era: eraOf(a.year), facade: 'block',
    W: L.W, H: L.H, gy: L.H, bx: 0, bw: L.W, top: 0, floors: L.rooms.length, cells: [], rooms: [], city: '', lms: [], brand: '', seed, flock: {}, vip: null, crown: null,
  } as unknown as Plan27;
  const lamp = a.light === 'tube' ? C('#e8f4ff') : a.light === 'led' ? mix(C('#ffffff'), pal.accent, 0.25) : a.light === 'globe' ? C('#ffc070') : C('#ffd889');
  return { g: { p: new Px(L.W, L.H), pal, pl, r: prim27.rng27(seed), lamp }, pl };
}

const kindOf = (m: SalaM31): Cell27['kind'] => (m.id === 'studio' || m.id === 'sig:studio' || m.id === 'sig:musician' ? 'studio'
  : m.id === 'roster' || m.id === 'talent' || m.id === 'sig:venue' ? 'lounge' : m.id === 'trophy' || m.id === 'sig:festival' ? 'lobby' : 'office');

export function paintSala31(m: SalaM31, L: Lay31): Px {
  const { g } = ctxOf(m, L);
  const p = g.p;
  void g.pal;
  const a = m.art;
  // moldura do corte: fachada da época em volta e laje
  const frame = a.shell === 'garage' ? C('#8a8478') : a.shell === 'tower' || a.shell === 'campus' ? (a.year < 1968 ? C('#c8bca0') : C('#7a8a98')) : a.year < 1946 ? C('#874430') : C('#9a968e');
  p.rect(0, 0, L.W, L.H, lv(frame, 2));
  p.rect(0, 0, L.W, TOP - 2, lv(frame, 3.4)); p.hline(0, L.W - 1, 0, lv(frame, 4.4));
  p.rect(0, L.H - BASE, L.W, BASE, lv(frame, 1.6)); p.hline(0, L.W - 1, L.H - BASE, lv(frame, 3));
  for (const r of L.rooms) {
    if (r.floor === 1) p.rect(r.x, r.y + r.h, r.w, SLAB, lv(frame, 1.8));
    prim27.wallFill(g, { kind: kindOf(m), floor: r.floor, x: r.x, y: r.y, w: r.w, h: r.h } as Cell27);
    // vista da janela nas cascas altas (torre/campus): faixa de vidro com a cidade
    if ((a.shell === 'tower' || a.shell === 'campus') && m.id !== 'talent' && !m.id.startsWith('sig:venue')) prim27.backWindow(g, r.x + Math.round(r.w * 0.36), r.y + 8, Math.round(r.w * 0.26), Math.min(28, r.h - 50), false);
  }
  if (L.upper) upperFloors(g, L.upper, a.upper);
  // mobília numa camada própria (contorno INK de 1 px na silhueta)
  const q = new Px(L.W, L.H);
  g.p = q;
  for (const d of m.deco) prop(g, m, L, d.prop, d.x, d.w ?? 0.08, 0, d.pp);
  for (const h of m.hots) if (h.prop) prop(g, m, L, h.prop, h.x, h.w, m.id === 'team' ? h.pp?.n ?? 0 : 0, h.pp, h);
  q.outline(INK);
  g.p = p;
  p.blit(q, 0, 0);
  // luz: uma ou duas lâmpadas por sala/andar
  for (const r of L.rooms) {
    const n = r.w > 300 ? 3 : 2;
    for (let i = 0; i < n; i++) prim27.lamp(g, r.x + Math.round((r.w * (i + 0.5)) / n), r.y, r.y + r.h - 3, Math.min(34, r.w / (2 * n)));
  }
  if (a.dim) for (const r of L.rooms) p.rect(r.x, r.y, r.w, r.h, withAlpha(C('#0a0820'), 64));
  for (const r of L.rooms) for (let i = 0; i < 3; i++) { p.rect(r.x + i, r.y, 1, r.h, withAlpha(OCC, 90 - i * 28)); p.rect(r.x + r.w - 1 - i, r.y, 1, r.h, withAlpha(OCC, 80 - i * 25)); }
  // pedestais míticos e palco: halo por cima do escurecido
  for (const h of m.hots) {
    if (h.prop === 'pedestal' && (h.pp?.lvl ?? 0) >= 4 && h.pp?.art) { const x = L.X(h.x) + (L.Wd(h.w) >> 1); p.poly([[x - 3, TOP], [x + 3, TOP], [x + 16, L.fy(0) - 30], [x - 16, L.fy(0) - 30]], withAlpha((h.pp.lvl ?? 0) >= 5 ? C('#ff6ae0') : C('#ffe08a'), 30)); }
  }
  for (const d of m.deco) if (d.prop === 'stage') { const x = L.X(d.x), w = L.Wd(d.w ?? 0.4); for (let i = 0; i < 3; i++) { const cx = x + Math.round((w * (i + 0.5)) / 3); p.poly([[cx - 1, TOP + 4], [cx + 1, TOP + 4], [cx + 14, L.fy(0) - 9], [cx - 14, L.fy(0) - 9]], withAlpha([C('#ff6a8a'), C('#ffd27a'), C('#7ac8ff')][i], 30)); } }
  return p;
}

/** Andares de cima esmaecidos (visão agregada): janelas, poucas luzes acesas, faixa escura. */
function upperFloors(g: Ctx27, r: Rect31, n: number): void {
  const { p } = g;
  p.rect(r.x, r.y, r.w, r.h, C('#3a3a52'));
  for (let i = 0; i < Math.max(1, n); i++) p.hline(r.x, r.x + r.w - 1, r.y + Math.round((r.h * (i + 1)) / (n + 1)), C('#2a2a3e'));
  for (let xx = r.x + 6; xx < r.x + r.w - 8; xx += 14) for (let yy = r.y + 3; yy < r.y + r.h - 5; yy += 9) p.rect(xx, yy, 7, 5, noise(xx, yy, 13) < 0.3 ? C('#c8b070') : C('#4a4a66'));
  p.rect(r.x, r.y, r.w, r.h, withAlpha(C('#0a0a18'), 70));
}

/** Uma peça. `h` = ponto clicável dono (pp com contagem, brilho, nível). */
function prop(g: Ctx27, m: SalaM31, L: Lay31, k: Prop31, f: number, fw: number, floor: number, pp?: Hot31['pp'], _h?: Hot31): void {
  const { p, pal, pl } = g;
  const { blk } = prim27;
  const x = L.X(f), w = L.Wd(fw), fy = L.fy(floor);
  const room = L.rooms.find((r) => r.floor === floor) ?? L.rooms[0];
  const y0 = room.y;
  const era = m.art.year;
  switch (k) {
    case 'console': prim27.consoleDesk(g, x, fy, Math.max(24, w)); break;
    case 'reel': prim27.reelDeck(g, x, fy, pl.gear !== 'shellac'); if (pl.gear === 'shellac') prim27.lathe(g, x, fy); break;
    case 'glass': p.rect(x, y0 + 4, 3, room.h - 8, C('#2a2a30')); for (let yy = y0 + 10; yy < y0 + room.h - 24; yy++) p.put(x + 1, yy, withAlpha(C('#bfe0e8'), 120)); break;
    case 'foam': prim27.foam(g, x, y0 + 10, w, Math.min(40, room.h - 40)); break;
    case 'drums': prim27.drums(g, x, fy); break;
    case 'amp': prim27.amp(g, x, fy, true); break;
    case 'mic': prim27.micStand(g, x, fy); break;
    case 'piano': prim27.piano(g, x, fy); break;
    case 'monitors': prim27.monitorSpk(g, x, y0 + 30); prim27.monitorSpk(g, x + 10, y0 + 30); break;
    case 'onair': {
      const on = !!pp?.on;
      blk(p, x, y0 + 6, 22, 8, C('#1a1214'));
      p.rect(x + 1, y0 + 7, 20, 6, on ? C('#e83030') : C('#4a2a2a'));
      drawText(p, era < 1950 ? 'REC' : 'ON AIR', x + 2, y0 + 8, on ? C('#ffe0d0') : C('#8a6a6a'));
      break;
    }
    case 'door': {
      blk(p, x, fy - 32, 14, 32, pal.woodDark);
      for (const [py, ph] of [[fy - 29, 10], [fy - 16, 12]] as const) { p.rect(x + 2, py, 10, ph, lv(pal.woodDark, 2.4)); p.hline(x + 2, x + 11, py + ph - 1, lv(pal.woodDark, 3.8)); }
      p.rect(x + 3, fy - 27, 8, 6, pal.paper); for (let i = 0; i < 3; i++) p.hline(x + 4, x + 9 - i, fy - 26 + i * 2, INK); // horário na porta
      p.put(x + 11, fy - 15, pal.gold);
      break;
    }
    case 'couch': prim27.couch(g, x, fy, Math.max(30, w), pal.fabric); break;
    case 'poster': prim27.poster(g, x, y0 + 12, 12, 17, hs(`${f}`) % 6); break;
    case 'gold': for (let i = 0; i < (pp?.n ?? 2); i++) prim27.goldDisc(g, x + i * 12, y0 + 14, i === 1); break;
    case 'window': {
      if (_h?.id === 'upper') break; // a faixa dos andares de cima já é pintada à parte
      prim27.backWindow(g, x, y0 + 12, Math.max(14, w), 26, era < 1930);
      break;
    }
    case 'player': prim27.recordPlayer(g, x, fy); break;
    case 'plant': prim27.plant(g, x, fy, true); break;
    case 'guitarstand': { const gx = x + w - 6; p.line(gx - 2, fy, gx + 1, fy - 6, C('#3a3a40')); p.line(gx + 4, fy, gx + 1, fy - 6, C('#3a3a40')); prim27.guitar(g, gx - 1, fy - 1, pal.accent2); break; }
    case 'suitcase': { const sx = x + w - 14; blk(p, sx, fy - 11, 13, 11, C('#8a5a30')); p.rect(sx + 4, fy - 13, 5, 2, C('#4a3020')); p.hline(sx, sx + 12, fy - 6, C('#c8a040')); p.rect(sx + 2, fy - 9, 2, 2, C('#e8e0d0')); break; }
    case 'ghost': { // vaga livre: silhueta tracejada
      const cx = x + (w >> 1);
      for (let yy = fy - 32; yy < fy; yy += 2) { const r = yy < fy - 24 ? 3 : 5; p.put(cx - r, yy, C('#e8e0c8')); p.put(cx + r, yy, C('#e8e0c8')); }
      for (let xx = cx - 3; xx <= cx + 3; xx += 2) p.put(xx, fy - 33, C('#e8e0c8'));
      for (let xx = cx - 5; xx <= cx + 5; xx += 2) p.put(xx, fy - 1, C('#e8e0c8'));
      break;
    }
    case 'cork': {
      const cw = Math.max(26, w), ch = 26;
      prim27.corkBoard(g, x, y0 + 30, cw, ch);
      const n = pp?.n ?? 0;
      for (let i = 0; i < n; i++) { const px0 = x + 3 + (i % 3) * Math.floor((cw - 6) / 3), py0 = y0 + 33 + Math.floor(i / 3) * 11; p.rect(px0, py0, 8, 9, C('#f2ece0')); p.rect(px0 + 1, py0 + 1, 6, 5, C('#3a4a6a')); p.disc(px0 + 4, py0 + 3, 1.5, C('#e0aa7e')); p.put(px0 + 4, py0, C('#d03030')); }
      break;
    }
    case 'desk': case 'vacancy': case 'typewriter': {
      const dw = Math.max(30, Math.min(48, w - 6));
      prim27.desk(g, x, fy, dw);
      if (k === 'vacancy') { blk(p, x + 6, fy - 20, 18, 8, C('#f2ece0')); p.rect(x + 7, fy - 19, 16, 6, C('#f8f4ea')); drawText(p, 'VAGA', x + 8, fy - 19, C('#c8302c')); prim27.chair(g, x + dw + 2, fy); }
      else { prim27.deskGear(g, x + 4, fy); if (k === 'desk' && m.id === 'team') prim27.chair(g, x + dw + 1, fy); }
      break;
    }
    case 'chair': prim27.chair(g, x, fy); break;
    case 'filing': prim27.filing(g, x, fy); break;
    case 'shelf': prim27.shelf(g, x, y0 + 14, Math.max(16, w), room.h - 18, mediaShelf(m)); break;
    case 'clipboard': { blk(p, x, y0 + 30, 10, 13, C('#a8845a')); p.rect(x + 1, y0 + 32, 8, 10, C('#f2ece0')); p.rect(x + 3, y0 + 29, 4, 2, C('#9a9aa2')); for (let i = 0; i < 4; i++) p.hline(x + 2, x + 7 - (i % 2), y0 + 34 + i * 2, i === 0 ? C('#c8302c') : INK); break; }
    case 'masters': {
      const n = Math.max(1, Math.floor(w / 46));
      const cw = Math.floor((w - (n - 1) * 3) / n), sh = room.h - 22;
      const glow = pp?.glow ?? [];
      let gi = 0;
      for (let i = 0; i < n; i++) {
        const sx = x + i * (cw + 3), sy = fy - sh;
        blk(p, sx, sy, cw, sh, pal.woodDark);
        for (let r = 0; r < 5; r++) {
          const yy = sy + 4 + r * Math.floor((sh - 6) / 5);
          p.hline(sx + 1, sx + cw - 2, yy + 10, tint(pal.woodDark, 0.25));
          for (let xx = sx + 2; xx < sx + cw - 3; xx += 3) {
            const gl = glow[gi++] ?? 0;
            const base = m.art.media === 'cds' || m.art.media === 'drives' ? C('#8a8a94') : m.art.media === 'tapes' ? C('#9a9080') : m.art.media === 'sheets' ? C('#d8c8a0') : C('#5a5048');
            p.rect(xx, yy + 1, 2, 9, gl > 0.05 ? mix(base, C('#ffd860'), Math.min(1, 0.3 + gl * 0.7)) : base);
            if (gl > 0.6) p.put(xx, yy + 1, C('#fff4c0'));
          }
        }
      }
      break;
    }
    case 'boxes': {
      for (let i = 0; i < 5; i++) { const bx = x + (i % 3) * 22 + (i >= 3 ? 11 : 0), by = fy - 14 - (i >= 3 ? 14 : 0); blk(p, bx, by, 20, 14, C('#b8946a')); p.hline(bx + 1, bx + 18, by + 4, C('#8a6a44')); p.rect(bx + 7, by + 7, 6, 3, C('#f2ece0')); }
      for (let i = 0; i < 4; i++) { p.disc(x + 70 + i * 2, fy - 4 - i * 3, 3, C('#3a3a40')); p.put(x + 70 + i * 2, fy - 4 - i * 3, C('#c8ccd0')); } // rolos soltos
      break;
    }
    case 'scores': {
      const sw = Math.max(30, w);
      prim27.shelf(g, x, fy - 76, sw, 30, 'books');
      for (let i = 0; i < 5; i++) blk(p, x + 2 + i * Math.floor((sw - 4) / 5), fy - 42, Math.floor((sw - 4) / 5) - 2, 14, [C('#2a5aa0'), C('#a8302c'), C('#3a8a4a'), C('#d8b040'), C('#6a3a8a')][i]);
      const nf = Math.max(1, Math.floor(sw / 14));
      for (let i = 0; i < nf; i++) prim27.filing(g, x + i * 13, fy);
      break;
    }
    case 'portraits': {
      const n = Math.max(3, Math.min(6, pp?.n ?? 3));
      const cols = 3, fw0 = Math.floor((Math.max(40, w) - 4) / cols);
      for (let i = 0; i < n; i++) {
        const px0 = x + 2 + (i % cols) * fw0, py0 = y0 + 10 + Math.floor(i / cols) * 26;
        blk(p, px0, py0, fw0 - 4, 22, C('#2a2026'));
        p.rect(px0 + 2, py0 + 2, fw0 - 8, 18, [C('#c8a888'), C('#7a9ab8'), C('#e8d8a8'), C('#8aa888'), C('#d8a0a8'), C('#a8a8c8')][i % 6]);
        p.disc(px0 + (fw0 >> 1) - 2, py0 + 9, 3, C('#5a4030')); p.rect(px0 + (fw0 >> 1) - 6, py0 + 13, 8, 7, C('#5a4030'));
      }
      for (let i = 0; i < 4; i++) blk(p, x + 4 + i * 9, fy - 22, 7, 22, [C('#e89a3a'), C('#8a3a8a'), C('#e8d070'), C('#c84a2a')][i]);
      break;
    }
    case 'counter': blk(p, x, fy - 14, w, 14, pal.wood); p.rect(x - 1, fy - 15, w + 2, 2, tint(pal.wood, 0.3)); break;
    case 'bottles': {
      for (let r = 0; r < 2; r++) {
        const yy = y0 + 16 + r * 14;
        p.rect(x, yy + 8, w, 2, pal.woodDark);
        for (let xx = x + 1; xx < x + w - 3; xx += 4) { const c = [C('#3a7a3a'), C('#8a5a20'), C('#c8c0a0'), C('#5a2a2a'), C('#2a4a6a')][(xx + r) % 5]; p.rect(xx, yy + 3, 3, 5, c); p.rect(xx + 1, yy, 1, 3, tint(c, 0.15)); }
      }
      break;
    }
    case 'stage': {
      const curtain = era < 1968 ? C('#8a1c24') : C('#18161e');
      p.rect(x, y0 + 4, w, fy - 9 - y0 - 4, curtain);
      if (era < 1968) for (let xx = x; xx < x + w; xx++) { const kk = (xx - x) % 4; if (kk !== 1) p.vline(xx, y0 + 4, fy - 10, lv(curtain, kk === 0 ? 1.2 : kk === 2 ? 4 : 2.4)); }
      blk(p, x, fy - 9, w, 9, pal.woodDark); p.hline(x, x + w - 1, fy - 9, tint(pal.wood, 0.3));
      break;
    }
    case 'crowd': {
      const n = pp?.n ?? 0;
      const cols = era < 1946 ? [C('#3a2a24'), C('#4a3a30'), C('#2a2a30')] : era < 1990 ? [C('#2c3a5e'), C('#5a2a2a'), C('#3a2a4a')] : [C('#20222a'), C('#2a3040'), C('#3a2a3a')];
      for (let i = 0; i < n; i++) { const row = i % 2, cx = x + Math.round((w * (i + 0.5)) / n) + (row ? 3 : 0), by = fy + 2 - row * 2, hh = 13 + (i * 7) % 4; p.rect(cx - 4, by - hh, 9, hh, cols[(i + row) % 3]); p.rect(cx - 2, by - hh - 6, 6, 6, C('#2a1e1a')); }
      break;
    }
    case 'demos': { const n = Math.max(1, pp?.n ?? 1); for (let i = 0; i < n; i++) blk(p, x + (i % 2), fy - 4 - i * 3, 11, 3, demoCol(era, i)); blk(p, x - 2, fy - 4, 15, 4, pal.wood); break; }
    case 'notebook': { blk(p, x, fy - 10, 16, 3, pal.wood); p.rect(x + 2, fy - 7, 2, 7, pal.woodDark); p.rect(x + 12, fy - 7, 2, 7, pal.woodDark); blk(p, x + 3, fy - 13, 10, 3, C('#f2ece0')); p.vline(x + 8, fy - 13, fy - 11, INK); p.line(x + 11, fy - 15, x + 14, fy - 18, C('#2a5aa0')); break; }
    case 'flyer': prim27.poster(g, x, y0 + 24, 14, 20, 3); break;
    case 'pedestal': pedestal(g, x, w, fy, pp); break;
    case 'tiers': {
      for (let i = 0; i < 5; i++) {
        const tx = L.X(0.04 + i * 0.19) + 2, tw = L.Wd(0.15) - 4;
        blk(p, tx, y0 + 6, tw, 13, C('#f2ece0'));
        for (let s0 = 0; s0 < 5; s0++) { const sx = tx + Math.round((tw - 25) / 2) + s0 * 5; star(p, sx, y0 + 12, s0 <= i ? C('#e8b020') : C('#6a6a72')); }
        if (i < 4) p.hline(tx + tw + 2, tx + tw + 8, y0 + 12, C('#c09048'));
      }
      break;
    }
    case 'trophies': {
      const sw = Math.max(36, w);
      blk(p, x, fy - 36, sw, 3, pal.woodDark); blk(p, x, fy - 18, sw, 3, pal.woodDark);
      const n = pp?.n ?? 0;
      for (let i = 0; i < n; i++) { const tx = x + 4 + (i % 3) * Math.floor((sw - 8) / 3), ty = i < 3 ? fy - 36 : fy - 18; p.rect(tx + 1, ty - 3, 4, 3, C('#c09048')); p.rect(tx, ty - 8, 6, 5, C('#e8c45a')); p.put(tx + 1, ty - 7, C('#fff4c0')); }
      if (!n) for (let i = 0; i < 2; i++) p.rect(x + 6 + i * 14, fy - 21, 8, 3, tint(pal.woodDark, 0.4));
      break;
    }
    case 'whiteboard': {
      const bw0 = Math.max(40, w);
      blk(p, x, y0 + 20, bw0, 34, C('#e8ecf0')); p.rect(x + 2, y0 + 22, bw0 - 4, 30, C('#f8fafc'));
      const n = Math.max(1, pp?.n ?? 2);
      for (let i = 0; i < n; i++) { p.hline(x + 5, x + 5 + 10 + ((i * 13) % 20), y0 + 26 + i * 5, [C('#2a6ab0'), C('#c8302c'), C('#3a8a4a')][i % 3]); p.rect(x + bw0 - 14, y0 + 25 + i * 5, 6, 3, C('#f0e070')); }
      p.rect(x + 4, y0 + 54, 10, 2, C('#9a9aa2'));
      break;
    }
    case 'mirror': {
      const mw = Math.max(26, w);
      blk(p, x, y0 + 24, mw, 30, C('#5a3a2a')); p.rect(x + 3, y0 + 27, mw - 6, 24, C('#a8c0cc')); p.line(x + 6, y0 + 48, x + 14, y0 + 30, C('#d8e8f0'));
      for (let i = 0; i < 4; i++) { p.disc(x + 3 + i * Math.floor((mw - 6) / 3), y0 + 23, 1.6, C('#fff2c0')); }
      blk(p, x - 2, fy - 12, mw + 4, 3, pal.wood);
      break;
    }
    case 'clients': {
      const bw0 = Math.max(60, w);
      prim27.corkBoard(g, x, y0 + 18, bw0, 36);
      const n = pp?.n ?? 0;
      for (let i = 0; i < n; i++) { const cx = x + 6 + (i % 3) * Math.floor((bw0 - 12) / 3), cy = y0 + 22 + Math.floor(i / 3) * 16; p.rect(cx, cy, 11, 12, C('#f2ece0')); p.disc(cx + 5, cy + 4, 2.5, C('#c89a70')); p.rect(cx + 2, cy + 8, 7, 3, C('#3a4a6a')); }
      break;
    }
    case 'routemap': {
      const mw = Math.max(60, w);
      blk(p, x, y0 + 16, mw, 40, C('#2a4a6a'));
      for (let yy = y0 + 18; yy < y0 + 54; yy++) for (let xx = x + 2; xx < x + mw - 2; xx++) if (noise(Math.floor(xx / 6), Math.floor(yy / 5), 17) < 0.42) p.put(xx, yy, C('#5a8a5a'));
      const n = Math.max(2, (pp?.n ?? 0) + 2);
      let lx = x + 6, ly = y0 + 40;
      for (let i = 0; i < n; i++) { const nx = x + 6 + Math.round(((mw - 12) * (i + 1)) / n), ny = y0 + 22 + ((i * 11) % 28); p.line(lx, ly, nx, ny, C('#f0c040')); p.disc(nx, ny, 1.8, C('#e8502c')); lx = nx; ly = ny; }
      break;
    }
    case 'booth': {
      const bw0 = Math.max(40, w), bt = y0 + 10;
      p.rect(x, bt, bw0, fy - bt, withAlpha(C('#9ad0e8'), 34));
      p.rect(x, bt, bw0, 2, pal.metalDark); p.rect(x, bt, 2, fy - bt, pal.metalDark); p.rect(x + bw0 - 2, bt, 2, fy - bt, pal.metalDark);
      blk(p, x + 6, fy - 12, bw0 - 12, 3, pal.wood);
      break;
    }
    case 'tents': for (let i = 0; i < 2; i++) { const tx = x + i * Math.floor(w / 2); p.poly([[tx, fy], [tx + 20, fy], [tx + 10, fy - 22]], i ? C('#e8e0c8') : C('#c8402c')); p.line(tx + 10, fy - 22, tx + 10, fy, C('#5a3a2a')); } break;
    case 'servers': {
      const n = Math.max(2, Math.floor(w / 18));
      for (let i = 0; i < n; i++) { const sx = x + i * 18; blk(p, sx, fy - 64, 15, 64, C('#22242c')); for (let r = 0; r < 12; r++) { p.hline(sx + 2, sx + 12, fy - 60 + r * 5, C('#34363e')); p.put(sx + 3 + ((r + i) % 3) * 3, fy - 59 + r * 5, (r + i) % 4 ? C('#35e0a0') : C('#f0a040')); } }
      break;
    }
    case 'screen': {
      const sw = Math.max(50, w);
      blk(p, x, y0 + 12, sw, 44, C('#16161e'));
      for (let yy = y0 + 14; yy < y0 + 54; yy++) p.hline(x + 2, x + sw - 3, yy, m.id === 'sig:screen' ? mix(C('#e8e4da'), C('#c8c0b0'), (yy - y0) / 60) : mix(C('#1e2a5a'), C('#3a2a6a'), (yy - y0) / 60));
      if (m.id === 'sig:platform') for (let i = 0; i < 5; i++) { p.rect(x + 6, y0 + 18 + i * 7, 6, 5, [C('#ff4fa3'), C('#35e0e0'), C('#f0c040'), C('#7af0a0'), C('#a07aff')][i]); p.hline(x + 14, x + 14 + 10 + ((i * 9) % 20), y0 + 20 + i * 7, C('#e8e8f0')); }
      break;
    }
    case 'projector': { blk(p, x, fy - 26, 16, 10, C('#3a3a40')); p.disc(x + 4, fy - 30, 4, C('#2a2a30')); p.disc(x + 12, fy - 30, 4, C('#2a2a30')); p.rect(x + 16, fy - 23, 3, 3, C('#fff4c0')); p.vline(x + 7, fy - 16, fy, C('#5a5a62')); p.line(x + 7, fy - 2, x + 3, fy, C('#5a5a62')); p.line(x + 7, fy - 2, x + 11, fy, C('#5a5a62')); break; }
    case 'records': { for (let i = 0; i < 6; i++) blk(p, x + (i % 2) * 2, fy - 4 - i * 4, 14, 4, [pal.accent, C('#1e1e24'), pal.accent2, pal.gold, C('#e8e0d0'), pal.fabric][i]); break; }
    case 'phone': { const y = fy - 14; p.rect(x, y - 3, 6, 3, era < 1990 ? C('#1a1a1e') : C('#d8d8dc')); p.ellipse(x + 3, y - 4, 4, 1, era < 1990 ? C('#1a1a1e') : C('#d8d8dc')); break; }
    case 'schedule': {
      const cw = Math.max(30, w);
      blk(p, x, y0 + 22, cw, 30, C('#f2ece0'));
      p.rect(x + 1, y0 + 23, cw - 2, 5, C('#c8302c'));
      for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) p.rect(x + 3 + c * Math.floor((cw - 6) / 6), y0 + 31 + r * 5, 3, 3, (r * 6 + c) % 5 === 0 ? C('#2a6ab0') : C('#c8c0b0'));
      break;
    }
  }
}

const mediaShelf = (m: SalaM31): 'records' | 'tapes' | 'cds' | 'books' | 'drives' => (m.art.media === 'sheets' ? 'books' : m.art.media === 'shellac' || m.art.media === 'lp' ? 'records' : m.art.media === 'tapes' ? 'tapes' : m.art.media === 'cds' ? 'cds' : 'drives');
const demoCol = (year: number, i: number): Col => (year < 1960 ? [C('#2a2020'), C('#7a5a3a')][i % 2] : year < 1990 ? [C('#e8e0d0'), C('#c84f2a'), C('#2a2a2e')][i % 3] : year < 2008 ? [C('#d8dce4'), C('#a8c8e8')][i % 2] : [C('#3a3a46'), C('#ff4fa3')][i % 2]);

function star(p: Px, x: number, y: number, c: Col): void {
  p.put(x + 2, y - 2, c); p.hline(x + 1, x + 3, y - 1, c); p.hline(x, x + 4, y, c); p.hline(x + 1, x + 3, y + 1, c); p.put(x + 1, y + 2, c); p.put(x + 3, y + 2, c);
}

/** Pedestal pelo nível: 1 caixote, 2 coluna de madeira, 3 coluna de mármore com cúpula, 4 preto e ouro, 5 roxo místico. */
function pedestal(g: Ctx27, x: number, w: number, fy: number, pp?: Hot31['pp']): void {
  const { p, pal } = g;
  const { blk } = prim27;
  const lvl = pp?.lvl ?? 1;
  const cx = x + (w >> 1);
  let top = fy;
  if (lvl === 1) { blk(p, cx - 13, fy - 14, 26, 14, C('#a8683a')); p.hline(cx - 12, cx + 11, fy - 9, C('#7a4a2a')); top = fy - 14; }
  else if (lvl === 2) { blk(p, cx - 10, fy - 26, 20, 26, pal.woodDark); blk(p, cx - 12, fy - 28, 24, 3, pal.wood); p.rect(cx - 4, fy - 18, 8, 3, C('#c09048')); top = fy - 28; }
  else if (lvl === 3) { blk(p, cx - 9, fy - 32, 18, 32, C('#e8e2d4')); blk(p, cx - 11, fy - 34, 22, 3, C('#f4f0e6')); for (let i = 0; i < 6; i++) p.put(cx - 6 + ((i * 5) % 12), fy - 28 + i * 4, C('#c8c0b0')); top = fy - 34; }
  else if (lvl === 4) { blk(p, cx - 10, fy - 36, 20, 36, C('#1a1a1e')); blk(p, cx - 12, fy - 38, 24, 3, C('#e8b020')); blk(p, cx - 12, fy - 3, 24, 3, C('#e8b020')); p.rect(cx - 4, fy - 22, 8, 4, C('#e8b020')); top = fy - 38; }
  else { for (let i = 0; i < 3; i++) blk(p, cx - 14 + i * 3, fy - 8 - i * 8, 28 - i * 6, 8, mix(C('#4a2a6a'), C('#7a3a9a'), i / 3)); top = fy - 24; }
  if (pp?.art) {
    const art = relicArtOf28(pp.art, pp.name ?? '', pp.year ?? 1970, pp.seed ?? '');
    const q = relicPx28(art, pp.seed ?? '', pp.year ?? 1970, pp.name ?? '');
    p.blit(q, cx - (q.w >> 1), top - q.h + 2);
    if (lvl >= 3 && lvl <= 4) { // cúpula de vidro
      const gx = cx - 14, gy = top - 28;
      p.rect(gx, gy, 28, 2, C('#d8e8f0')); p.vline(gx, gy, top - 1, C('#c8dce8')); p.vline(gx + 27, gy, top - 1, C('#a8c0cc'));
      p.line(gx + 4, gy + 4, gx + 8, gy + 14, withAlpha(C('#ffffff'), 200));
    }
  } else {
    for (let xx = cx - 6; xx <= cx + 6; xx += 2) p.put(xx, top - 2, C('#c8c0b0'));
  }
}

// ---------------------------------------------------------------- DOM

export interface Drawn31 { lay: Lay31; people: { id: string; x: number; y: number }[] }
export interface DrawOpts31 { minW?: number; look?: (personId: string | undefined, seed: string) => Appearance; role?: (f: Fig31) => string | null | undefined; youLook?: Appearance; hideYou?: boolean }

/** Balões de humor por cima da cabeça (coração, raio, nuvem com chuva). */
function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, k: NonNullable<Fig31['bubble']>): void {
  const q = new Px(13, 12);
  if (k === 'cloud') { q.ellipse(6, 4, 6, 3, C('#9aa0b0')); q.ellipse(4, 3, 3, 2.4, C('#b8bcc8')); for (let i = 0; i < 3; i++) q.vline(3 + i * 3, 8, 10, C('#5a8ad0')); q.line(7, 7, 5, 10, C('#f0d020')); }
  else {
    q.rect(0, 0, 13, 9, C('#f2ece0')); q.put(5, 9, C('#f2ece0')); q.put(6, 10, C('#f2ece0'));
    if (k === 'heart') { q.rect(3, 2, 3, 3, C('#3a9a5a')); q.rect(7, 2, 3, 3, C('#3a9a5a')); q.rect(4, 4, 5, 2, C('#3a9a5a')); q.put(6, 6, C('#3a9a5a')); }
    else { q.line(7, 1, 4, 5, C('#e88a1a')); q.line(4, 5, 8, 4, C('#e88a1a')); q.line(8, 4, 5, 8, C('#e88a1a')); }
  }
  q.outline(INK);
  const c = q.canvas();
  ctx.drawImage(c, x - 6, y);
}

export function drawSala31(canvas: HTMLCanvasElement, m: SalaM31, o: DrawOpts31 = {}): Drawn31 {
  const lay = layout31(m, o.minW);
  const px = paintSala31(m, lay);
  canvas.width = lay.W; canvas.height = lay.H;
  const ctx = canvas.getContext('2d');
  const people: Drawn31['people'] = [];
  if (!ctx) return { lay, people };
  const img = ctx.createImageData(lay.W, lay.H);
  new Uint32Array(img.data.buffer).set(px.d);
  ctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const figs = m.hots.filter((h) => h.fig).map((h) => ({ h, f: h.fig! })).sort((a, b) => a.h.x - b.h.x);
  for (const { h, f } of figs) {
    const r = lay.hits[h.id];
    const floor = m.id === 'team' ? h.pp?.n ?? 0 : 0;
    const x = r.x + (r.w >> 1), y = lay.fy(floor) - (f.lift ?? 0) + (f.pose === 'sit' ? -3 : 0);
    const look = o.look ? o.look(f.personId, f.seed) : lookOf({ id: f.personId ?? f.seed });
    const role = (o.role?.(f) ?? f.role ?? null) as Parameters<typeof avatarSprite>[1]['role'];
    const sp = avatarSprite(look, { year: m.art.year, role, pose: f.pose === 'play' && !role ? 'stand' : f.pose, dir: f.dir });
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.fillRect(x - 6, y, 12, 1);
    ctx.drawImage(sp.c, x - sp.ax, y - sp.ay + 1);
    if (f.bubble) bubble(ctx, x + 6, y - 46, f.bubble);
    people.push({ id: h.id, x, y });
  }
  return { lay, people };
}

/** Quadro de caminhada do seu personagem (a tela anima trocando o quadro). */
export function youSprite31(look: Appearance, year: number, frame: number, walking: boolean, dir: 'SE' | 'SW'): HTMLCanvasElement {
  return avatarSprite(look, { year, pose: walking ? 'walk' : 'stand', dir, frame }).c;
}
