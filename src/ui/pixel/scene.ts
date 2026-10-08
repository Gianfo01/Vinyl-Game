// Planta da sede por nível (Garagem, Estúdio pequeno, Loft, Complexo, Torre, Campus): salas, portas, paredes,
// mobília por era e equipamento do jogador, pontos de atividade e busca de caminho no grid.

import { Rng } from '../../core/rng';
import { EQUIPMENT, HQ_LEVELS } from '../../data/rules';
import { l, type L } from '../../data/world';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import type { Dir } from './avatar';
import { PALETTES, eraIndex, eraOf, type EraId, type Palette } from './palette';
import { equipmentVisual, footprint, furnFrames, type Facing, type FurnKind, type RoomKind } from './sprites';

export type FloorKey = keyof Palette['floors'];

export interface Room {
  id: string;
  kind: RoomKind;
  x: number;
  y: number;
  w: number;
  h: number;
  floor: FloorKey;
  /** salas do mesmo grupo não têm parede entre si (garagem aberta) */
  group?: string;
}

/** Borda: 'E' entre (x,y) e (x+1,y); 'S' entre (x,y) e (x,y+1). */
export interface Edge {
  x: number;
  y: number;
  side: 'E' | 'S';
}

export interface LayoutDef {
  W: number;
  H: number;
  rooms: Room[];
  doors: Edge[];
  glass: Edge[];
  entrance: Edge;
}

const R = (id: string, kind: RoomKind, x: number, y: number, w: number, h: number, floor: FloorKey, group?: string): Room => ({ id, kind, x, y, w, h, floor, group });
const E = (x: number, y: number, side: 'E' | 'S'): Edge => ({ x, y, side });

export const LAYOUTS: LayoutDef[] = [
  // 0 Garagem: um ambiente aberto com zonas
  {
    W: 9, H: 7,
    rooms: [
      R('reh', 'rehearsal', 0, 0, 5, 4, 'garage', 'g'),
      R('off', 'office', 5, 0, 4, 3, 'garage', 'g'),
      R('lng', 'lounge', 0, 4, 5, 3, 'garage', 'g'),
      R('wri', 'writing', 5, 3, 4, 4, 'garage', 'g'),
    ],
    doors: [], glass: [], entrance: E(6, 6, 'S'),
  },
  // 1 Estúdio pequeno
  {
    W: 12, H: 9,
    rooms: [
      R('booth', 'booth', 0, 0, 5, 4, 'studio'),
      R('ctrl', 'control', 5, 0, 4, 4, 'control'),
      R('off', 'office', 9, 0, 3, 5, 'office'),
      R('lng', 'lounge', 0, 4, 5, 5, 'lounge'),
      R('wri', 'writing', 5, 4, 4, 5, 'hall'),
      R('reh', 'rehearsal', 9, 5, 3, 4, 'studio'),
    ],
    doors: [E(4, 2, 'E'), E(8, 2, 'E'), E(2, 3, 'S'), E(6, 3, 'S'), E(4, 6, 'E'), E(8, 7, 'E'), E(10, 4, 'S')],
    glass: [E(4, 1, 'E')],
    entrance: E(7, 8, 'S'),
  },
  // 2 Loft
  {
    W: 16, H: 11,
    rooms: [
      R('booth', 'booth', 0, 0, 5, 4, 'studio'),
      R('ctrl', 'control', 5, 0, 4, 4, 'control'),
      R('wri', 'writing', 9, 0, 4, 4, 'office'),
      R('tro', 'trophy', 13, 0, 3, 4, 'hall'),
      R('reh', 'rehearsal', 0, 4, 5, 7, 'studio'),
      R('lng', 'lounge', 5, 4, 5, 7, 'lounge'),
      R('off', 'office', 10, 4, 6, 7, 'office'),
    ],
    doors: [E(4, 2, 'E'), E(2, 3, 'S'), E(7, 3, 'S'), E(9, 3, 'S'), E(14, 3, 'S'), E(4, 8, 'E'), E(9, 7, 'E'), E(12, 2, 'E')],
    glass: [E(4, 1, 'E')],
    entrance: E(7, 10, 'S'),
  },
  // 3 Complexo
  {
    W: 22, H: 15,
    rooms: [
      R('boothA', 'booth', 0, 0, 5, 4, 'studio'),
      R('ctrlA', 'control', 5, 0, 4, 4, 'control'),
      R('boothB', 'booth', 9, 0, 4, 4, 'studio'),
      R('ctrlB', 'control', 13, 0, 4, 4, 'control'),
      R('tro', 'trophy', 17, 0, 5, 4, 'hall'),
      R('hall', 'hall', 0, 4, 22, 2, 'hall'),
      R('reh', 'rehearsal', 0, 6, 5, 9, 'studio'),
      R('wri', 'writing', 5, 6, 4, 4, 'office'),
      R('meet', 'meeting', 5, 10, 4, 5, 'office'),
      R('lng', 'lounge', 9, 6, 6, 9, 'lounge'),
      R('off', 'office', 15, 6, 7, 9, 'office'),
    ],
    doors: [
      E(2, 3, 'S'), E(6, 3, 'S'), E(10, 3, 'S'), E(14, 3, 'S'), E(19, 3, 'S'), E(4, 2, 'E'), E(12, 2, 'E'),
      E(2, 5, 'S'), E(6, 5, 'S'), E(11, 5, 'S'), E(18, 5, 'S'), E(6, 9, 'S'), E(8, 12, 'E'),
    ],
    glass: [E(4, 1, 'E'), E(12, 1, 'E')],
    entrance: E(12, 14, 'S'),
  },
  // 4 Torre multinacional: três estúdios, dois andares de escritórios, lobby com lounge
  {
    W: 26, H: 18,
    rooms: [
      R('boothA', 'booth', 0, 0, 5, 4, 'studio'),
      R('ctrlA', 'control', 5, 0, 4, 4, 'control'),
      R('boothB', 'booth', 9, 0, 5, 4, 'studio'),
      R('ctrlB', 'control', 14, 0, 4, 4, 'control'),
      R('boothC', 'booth', 18, 0, 4, 4, 'studio'),
      R('tro', 'trophy', 22, 0, 4, 4, 'hall'),
      R('hall', 'hall', 0, 4, 26, 2, 'hall'),
      R('reh', 'rehearsal', 0, 6, 5, 5, 'studio'),
      R('wri', 'writing', 5, 6, 4, 5, 'office'),
      R('lng', 'lounge', 9, 6, 6, 5, 'lounge'),
      R('wri2', 'writing', 15, 6, 4, 5, 'office'),
      R('meet', 'meeting', 19, 6, 7, 5, 'office'),
      R('hall2', 'hall', 0, 11, 26, 2, 'hall'),
      R('offA', 'office', 0, 13, 7, 5, 'office'),
      R('offB', 'office', 7, 13, 6, 5, 'office'),
      R('meet2', 'meeting', 13, 13, 5, 5, 'office'),
      R('lng2', 'lounge', 18, 13, 8, 5, 'lounge'),
    ],
    doors: [
      E(2, 3, 'S'), E(6, 3, 'S'), E(11, 3, 'S'), E(15, 3, 'S'), E(19, 3, 'S'), E(23, 3, 'S'),
      E(4, 2, 'E'), E(13, 2, 'E'), E(17, 2, 'E'),
      E(2, 5, 'S'), E(6, 5, 'S'), E(11, 5, 'S'), E(16, 5, 'S'), E(22, 5, 'S'),
      E(2, 10, 'S'), E(6, 10, 'S'), E(12, 10, 'S'), E(16, 10, 'S'), E(22, 10, 'S'),
      E(3, 12, 'S'), E(9, 12, 'S'), E(15, 12, 'S'), E(21, 12, 'S'),
    ],
    glass: [E(4, 1, 'E'), E(13, 1, 'E'), E(17, 1, 'E')],
    entrance: E(21, 17, 'S'),
  },
  // 5 Campus futurista: estúdios imersivos, galeria holográfica, dois lounges
  {
    W: 30, H: 20,
    rooms: [
      R('boothA', 'booth', 0, 0, 6, 5, 'studio'),
      R('ctrlA', 'control', 6, 0, 4, 5, 'control'),
      R('boothB', 'booth', 10, 0, 5, 5, 'studio'),
      R('ctrlB', 'control', 15, 0, 4, 5, 'control'),
      R('boothC', 'booth', 19, 0, 5, 5, 'studio'),
      R('ctrlC', 'control', 24, 0, 6, 5, 'control'),
      R('hall', 'hall', 0, 5, 30, 2, 'hall'),
      R('reh', 'rehearsal', 0, 7, 6, 6, 'studio'),
      R('reh2', 'rehearsal', 6, 7, 5, 6, 'studio'),
      R('wri', 'writing', 11, 7, 4, 6, 'office'),
      R('lng', 'lounge', 15, 7, 7, 6, 'lounge'),
      R('tro', 'trophy', 22, 7, 8, 6, 'hall'),
      R('hall2', 'hall', 0, 13, 30, 2, 'hall'),
      R('offA', 'office', 0, 15, 7, 5, 'office'),
      R('offB', 'office', 7, 15, 7, 5, 'office'),
      R('meet', 'meeting', 14, 15, 5, 5, 'office'),
      R('wri2', 'writing', 19, 15, 4, 5, 'office'),
      R('lng2', 'lounge', 23, 15, 7, 5, 'lounge'),
    ],
    doors: [
      E(3, 4, 'S'), E(8, 4, 'S'), E(12, 4, 'S'), E(17, 4, 'S'), E(21, 4, 'S'), E(27, 4, 'S'),
      E(5, 2, 'E'), E(14, 2, 'E'), E(23, 2, 'E'),
      E(3, 6, 'S'), E(8, 6, 'S'), E(13, 6, 'S'), E(18, 6, 'S'), E(26, 6, 'S'),
      E(3, 12, 'S'), E(8, 12, 'S'), E(13, 12, 'S'), E(18, 12, 'S'), E(26, 12, 'S'),
      E(3, 14, 'S'), E(10, 14, 'S'), E(16, 14, 'S'), E(21, 14, 'S'), E(26, 14, 'S'),
    ],
    glass: [E(5, 1, 'E'), E(14, 1, 'E'), E(23, 1, 'E')],
    entrance: E(26, 19, 'S'),
  },
];

/** Planta usada por uma filial (escritório, estúdio ou sede regional). */
export const BRANCH_LAYOUT = [1, 2, 3];

export const ROOM_NAMES: Record<RoomKind, L> = {
  booth: l('Sala de gravação', 'Live room'),
  control: l('Técnica', 'Control room'),
  rehearsal: l('Sala de ensaio', 'Rehearsal room'),
  writing: l('Sala de composição', 'Writing room'),
  lounge: l('Sala de descanso', 'Lounge'),
  office: l('Escritório', 'Office'),
  trophy: l('Arquivo e troféus', 'Archive & trophies'),
  meeting: l('Sala de reunião', 'Meeting room'),
  hall: l('Corredor', 'Hallway'),
};

export interface Item {
  kind: FurnKind;
  x: number;
  y: number;
  w: number;
  d: number;
  facing: Facing;
  variant: number;
  frames: number;
  room: string;
  /** chave de profundidade (soma do centro) */
  key: number;
  label?: L;
  outside?: boolean;
}

export type SpotKind = 'play' | 'drum' | 'sit' | 'desk' | 'console' | 'stand';

export interface Spot {
  x: number;
  y: number;
  kind: SpotKind;
  dir: Dir;
  room: RoomKind;
  roomId: string;
  /** chave de profundidade do assento (a pessoa é desenhada logo depois) */
  seatKey?: number;
}

export interface WallSeg {
  orient: 'x' | 'y';
  /** vértice inicial da borda (em tiles) */
  x: number;
  y: number;
  style: 'low' | 'glass' | 'lip' | 'post';
  key: number;
}

export interface DecalPlace {
  kind: string;
  wall: 'x' | 'y';
  /** índice do tile ao longo da parede de fundo */
  tile: number;
  /** altura do topo do decalque (px) */
  z: number;
  /** largura em tiles (1 ou 2) */
  span?: number;
  variant?: number;
  actId?: string;
  text?: string;
  dyn?: 'onair';
}

export interface Scene {
  level: number;
  era: EraId;
  pal: Palette;
  W: number;
  H: number;
  layout: LayoutDef;
  rooms: Room[];
  roomGrid: (Room | null)[];
  edges: Set<string>;
  blocked: Uint8Array;
  items: Item[];
  spots: Spot[];
  walls: WallSeg[];
  decals: DecalPlace[];
  rugs: { x: number; y: number; w: number; h: number }[];
  lights: { x: number; y: number; w: number; h: number }[];
  entrance: [number, number];
}

const ek = (side: 'E' | 'S', x: number, y: number) => `${side}:${x}:${y}`;

export function roomAt(sc: Scene, x: number, y: number): Room | null {
  if (x < 0 || y < 0 || x >= sc.W || y >= sc.H) return null;
  return sc.roomGrid[y * sc.W + x];
}

/** Pode andar de (x,y) para (nx,ny) (vizinhos ortogonais)? */
export function canStep(sc: Scene, x: number, y: number, nx: number, ny: number): boolean {
  if (nx < 0 || ny < 0 || nx >= sc.W || ny >= sc.H) return false;
  if (nx === x + 1) return !sc.edges.has(ek('E', x, y));
  if (nx === x - 1) return !sc.edges.has(ek('E', nx, y));
  if (ny === y + 1) return !sc.edges.has(ek('S', x, y));
  if (ny === y - 1) return !sc.edges.has(ek('S', x, ny));
  return false;
}

/** BFS no grid: atravessa só tiles livres, mas aceita entrar no destino (assentos). */
export function findPath(sc: Scene, from: [number, number], to: [number, number]): [number, number][] | null {
  const { W, H } = sc;
  const start = from[1] * W + from[0];
  const goal = to[1] * W + to[0];
  if (start === goal) return [to];
  const prev = new Int32Array(W * H).fill(-1);
  prev[start] = start;
  const q = [start];
  for (let qi = 0; qi < q.length; qi++) {
    const cur = q[qi];
    const x = cur % W;
    const y = (cur / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!canStep(sc, x, y, nx, ny)) continue;
      const ni = ny * W + nx;
      if (prev[ni] !== -1) continue;
      if (ni !== goal && sc.blocked[ni]) continue;
      prev[ni] = cur;
      if (ni === goal) {
        const path: [number, number][] = [];
        let c = goal;
        while (c !== start) {
          path.push([c % W, (c / W) | 0]);
          c = prev[c];
        }
        return path.reverse();
      }
      q.push(ni);
    }
  }
  return null;
}

// ---------- montagem ----------

interface Ctx {
  s: GameState;
  sc: Scene;
  era: EraId;
  e: number;
  r: Rng;
  keepClear: Uint8Array;
  owned: Set<string>;
}

function free(c: Ctx, x: number, y: number, w = 1, d = 1, room?: Room): boolean {
  for (let j = 0; j < d; j++)
    for (let i = 0; i < w; i++) {
      const xx = x + i;
      const yy = y + j;
      if (xx < 0 || yy < 0 || xx >= c.sc.W || yy >= c.sc.H) return false;
      const k = yy * c.sc.W + xx;
      if (c.sc.blocked[k] || c.keepClear[k]) return false;
      if (room && (xx < room.x || yy < room.y || xx >= room.x + room.w || yy >= room.y + room.h)) return false;
      // não atravessa paredes internas
      if (i > 0 && c.sc.edges.has(ek('E', xx - 1, yy))) return false;
      if (j > 0 && c.sc.edges.has(ek('S', xx, yy - 1))) return false;
    }
  return true;
}

function put(c: Ctx, room: Room, kind: FurnKind, x: number, y: number, facing: Facing, variant = 0, opts: { block?: boolean; label?: L } = {}): Item | null {
  const { w, d } = footprint(kind, facing);
  if (!free(c, x, y, w, d, room)) return null;
  const it: Item = { kind, x, y, w, d, facing, variant, frames: furnFrames(kind), room: room.id, key: x + w / 2 + y + d / 2, label: opts.label };
  c.sc.items.push(it);
  if (opts.block !== false) for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) c.sc.blocked[(y + j) * c.sc.W + x + i] = 1;
  return it;
}

/** Encosta um móvel nas paredes do fundo da sala (topo → esquerda). */
function alongWall(c: Ctx, room: Room, kind: FurnKind, variant = 0, opts: { label?: L; prefer?: 'top' | 'left'; from?: 'start' | 'end' } = {}): Item | null {
  const tries: [number, number, Facing][] = [];
  const top: [number, number, Facing][] = [];
  const left: [number, number, Facing][] = [];
  for (let x = room.x; x < room.x + room.w; x++) top.push([x, room.y, 'SW']);
  for (let y = room.y; y < room.y + room.h; y++) left.push([room.x, y, 'SE']);
  if (opts.from === 'end') { top.reverse(); left.reverse(); }
  if (opts.prefer === 'left') tries.push(...left, ...top);
  else tries.push(...top, ...left);
  for (const [x, y, f] of tries) {
    const it = put(c, room, kind, x, y, f, variant, { label: opts.label });
    if (it) return it;
  }
  return null;
}

function spot(c: Ctx, room: Room, x: number, y: number, kind: SpotKind, dir: Dir, seatKey?: number): void {
  c.sc.spots.push({ x, y, kind, dir, room: room.kind, roomId: room.id, seatKey });
}

/** Cadeira + assento virado para 'dir'. */
function seatAt(c: Ctx, room: Room, x: number, y: number, dir: 'SE' | 'SW', kind: FurnKind = 'chair', variant = 0): boolean {
  const it = put(c, room, kind, x, y, dir, variant);
  if (!it) return false;
  spot(c, room, x, y, 'sit', dir, it.key + 0.01);
  return true;
}

function floorSpots(c: Ctx, room: Room, kind: SpotKind, max: number): void {
  const cells: [number, number][] = [];
  for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) if (free(c, x, y)) cells.push([x, y]);
  // prioriza o meio da sala
  const cx = room.x + room.w / 2;
  const cy = room.y + room.h / 2;
  cells.sort((a, b) => Math.hypot(a[0] + 0.5 - cx, a[1] + 0.5 - cy) - Math.hypot(b[0] + 0.5 - cx, b[1] + 0.5 - cy));
  let n = 0;
  for (const [x, y] of cells) {
    if (n >= max) break;
    if (c.sc.spots.some((s) => s.x === x && s.y === y)) continue;
    spot(c, room, x, y, kind, n % 2 ? 'SW' : 'SE');
    n++;
  }
}

function backWalls(sc: Scene, room: Room): { wall: 'x' | 'y'; tile: number }[] {
  const out: { wall: 'x' | 'y'; tile: number }[] = [];
  if (room.y === 0) for (let x = room.x; x < room.x + room.w; x++) out.push({ wall: 'x', tile: x });
  if (room.x === 0) for (let y = room.y; y < room.y + room.h; y++) out.push({ wall: 'y', tile: y });
  void sc;
  return out;
}

function keysInstrument(e: number): FurnKind {
  if (e <= 1) return 'piano';
  if (e === 2) return 'organ';
  if (e === 3 || e >= 7) return 'synth';
  return 'piano';
}

function furnishRoom(c: Ctx, room: Room): void {
  const { sc, e } = c;
  const walls = backWalls(sc, room);
  const decal = (kind: string, z: number, opts: Partial<DecalPlace> = {}) => {
    const free = walls.filter((w) => !sc.decals.some((d) => d.wall === w.wall && (d.tile === w.tile || (d.span === 2 && d.tile + 1 === w.tile))));
    const pick = opts.tile !== undefined ? free.find((w) => w.tile === opts.tile && (!opts.wall || w.wall === opts.wall)) : free[Math.floor(c.r.next() * free.length)];
    if (!pick) return;
    sc.decals.push({ kind, wall: pick.wall, tile: pick.tile, z, ...opts });
  };
  const garage = room.group === 'g';
  const owned = (id: string) => c.owned.has(id);
  switch (room.kind) {
    case 'booth':
    case 'rehearsal': {
      const isBooth = room.kind === 'booth';
      // bateria com banquinho atrás
      const kx = room.x + room.w - 2;
      const ky = room.y + 1;
      if (e >= 1 && free(c, kx, ky) && free(c, kx, ky - 1)) {
        const kit = put(c, room, 'drumkit', kx, ky, 'SW');
        const st = put(c, room, 'stool', kx, ky - 1, 'SW');
        if (kit && st) spot(c, room, kx, ky - 1, 'drum', 'SW', st.key + 0.01);
      }
      if (e >= 1) alongWall(c, room, 'amp', 0);
      if (e >= 1 && room.w >= 4) alongWall(c, room, 'amp', 1, { from: 'end' });
      if (room.h >= 4) alongWall(c, room, keysInstrument(e), 0, { prefer: 'left' });
      if (!isBooth && e >= 2) { alongWall(c, room, 'speaker', 0, { prefer: 'left', from: 'end' }); }
      if (isBooth && owned('ribbon_mic')) alongWall(c, room, 'mic', 1, { prefer: 'left', label: EQUIPMENT.find((x) => x.id === 'ribbon_mic')?.name });
      else if (isBooth || e === 0) alongWall(c, room, 'mic', 0, { prefer: 'left' });
      if (e === 0 && !isBooth) alongWall(c, room, 'gramophone', 0);
      sc.rugs.push({ x: room.x + 1, y: room.y + 1, w: Math.max(1, Math.min(4, room.w - 2)), h: Math.max(1, Math.min(4, room.h - 2)) });
      if (isBooth) for (let i = 0; i < 3; i++) decal('foam', 34);
      else {
        decal('poster', 32);
        decal('poster', 32);
        if (garage) { decal('garage_door', 36, { span: 2, wall: 'x', tile: room.x + 1 }); decal('pegboard', 30); }
        else decal('window', 34);
      }
      if (isBooth) decal('onair', 39, { dyn: 'onair' });
      floorSpots(c, room, 'play', isBooth ? 5 : 6);
      break;
    }
    case 'control': {
      // mesa principal: o melhor equipamento de áudio que o jogador tem
      let main: FurnKind = e === 0 ? 'lathe' : e <= 3 ? 'console' : e <= 6 ? 'daw' : e === 7 ? 'laptop_desk' : 'holo_desk';
      let mainLabel: L | undefined;
      const eq = (id: string) => EQUIPMENT.find((x) => x.id === id)?.name;
      if (owned('plugin_suite')) { main = equipmentVisual('plugin_suite', c.era).kind; mainLabel = eq('plugin_suite'); }
      else if (owned('digital_console')) { main = 'daw'; mainLabel = eq('digital_console'); }
      else if (owned('mixing_desk')) { main = equipmentVisual('mixing_desk', c.era).kind; mainLabel = eq('mixing_desk'); }
      const desk = put(c, room, main, room.x + 1, room.y, 'SW', 0, { label: mainLabel });
      if (desk) {
        const st = put(c, room, 'stool', room.x + 1, room.y + 1, 'SW');
        if (st) spot(c, room, room.x + 1, room.y + 1, 'console', 'NE', st.key + 0.01);
        const st2 = put(c, room, 'stool', room.x + 2, room.y + 1, 'SW');
        if (st2) spot(c, room, room.x + 2, room.y + 1, 'console', 'NE', st2.key + 0.01);
      }
      for (const id of ['tape_machine', 'echo_chamber', 'synth_rack', 'ai_tools', 'digital_console', 'mixing_desk']) {
        if (!owned(id)) continue;
        const v = equipmentVisual(id, c.era);
        if (v.kind === main) continue;
        alongWall(c, room, v.kind, v.variant ?? 0, { prefer: 'left', label: eq(id) });
      }
      if (e === 0 && !owned('tape_machine')) alongWall(c, room, 'gramophone', 0, { prefer: 'left' });
      if (room.h >= 4) alongWall(c, room, 'sofa', 0, { prefer: 'left', from: 'end' });
      alongWall(c, room, 'plant', 1, { from: 'end' });
      decal('clock', 30);
      decal('speaker_wall', 30);
      floorSpots(c, room, 'stand', 2);
      break;
    }
    case 'writing': {
      const tx = room.x + 1;
      const ty = room.y + Math.min(2, room.h - 2);
      if (garage) {
        put(c, room, 'workbench', room.x + 1, room.y + room.h - 1, 'SW');
        seatAt(c, room, room.x + 1, room.y + room.h - 2, 'SW');
        seatAt(c, room, room.x + 2, room.y + room.h - 2, 'SW');
      } else if (put(c, room, 'table', tx, ty, 'SW')) {
        seatAt(c, room, tx, ty - 1, 'SW');
        seatAt(c, room, tx + 1, ty - 1, 'SW');
        if (tx - 1 >= room.x) seatAt(c, room, tx - 1, ty, 'SE');
      }
      if (!garage && room.w >= 4) alongWall(c, room, keysInstrument(Math.min(e, 1)), 0, { prefer: 'left', from: 'end' });
      alongWall(c, room, 'shelf', 0, { from: 'end' });
      alongWall(c, room, 'lamp', 0, { from: 'end' });
      alongWall(c, room, 'plant', 0);
      decal('cork', 30);
      decal('window', 34);
      floorSpots(c, room, 'stand', 2);
      break;
    }
    case 'lounge': {
      const sx = room.x + 1;
      const sofa = put(c, room, 'sofa', sx, room.y, 'SW');
      if (sofa) {
        spot(c, room, sx, room.y, 'sit', 'SW', sofa.key + 0.01);
        spot(c, room, sx + 1, room.y, 'sit', 'SW', sofa.key + 0.02);
        put(c, room, 'coffee_table', sx, room.y + 1, 'SW');
      }
      put(c, room, 'lamp', room.x, room.y, 'SW');
      const arm = put(c, room, 'armchair', room.x, room.y + 2, 'SE');
      if (arm) spot(c, room, room.x, room.y + 2, 'sit', 'SE', arm.key + 0.01);
      if (!garage) alongWall(c, room, 'tv', 0, { prefer: 'left', from: 'end' });
      else alongWall(c, room, 'crate', 0, { from: 'end' });
      if (owned('lounge') || e >= 1) alongWall(c, room, 'fun', 0, { from: 'end', label: owned('lounge') ? EQUIPMENT.find((x) => x.id === 'lounge')?.name : undefined });
      alongWall(c, room, 'coffee', 0, { from: 'end' });
      alongWall(c, room, 'plant', 1, { from: 'end' });
      sc.rugs.push({ x: room.x + 1, y: room.y + 1, w: Math.max(1, room.w - 2), h: Math.max(1, Math.min(3, room.h - 1)) });
      decal('poster', 32);
      decal('window', 34);
      decal('poster', 32);
      floorSpots(c, room, 'stand', 4);
      break;
    }
    case 'office': {
      const desks = garage ? 1 : HQ_LEVELS[c.sc.level].staff;
      let made = 0;
      if (garage) {
        put(c, room, 'workbench', room.x + 1, room.y, 'SW');
        if (seatAt(c, room, room.x + 1, room.y + 1, 'SW')) { c.sc.spots[c.sc.spots.length - 1].kind = 'desk'; made++; }
        decal('pegboard', 30);
        alongWall(c, room, 'shelf', 0, { prefer: 'left' });
        break;
      }
      alongWall(c, room, 'filing', 0);
      for (let row = room.y + 1; row < room.y + room.h && made < desks; row += 2) {
        for (let col = room.x; col + 1 < room.x + room.w && made < desks; col += 3) {
          if (!free(c, col, row) || !free(c, col + 1, row)) continue;
          const ch = put(c, room, 'chair', col, row, 'SE');
          if (!ch) continue;
          put(c, room, 'desk', col + 1, row, 'SE', made);
          spot(c, room, col, row, 'desk', 'SE', ch.key + 0.01);
          made++;
        }
      }
      for (const id of ['press_contract', 'mail_list', 'video_suite', 'analytics']) {
        if (!owned(id)) continue;
        const v = equipmentVisual(id, c.era);
        alongWall(c, room, v.kind, v.variant ?? 0, { label: EQUIPMENT.find((x) => x.id === id)?.name });
      }
      if (e >= 1) alongWall(c, room, 'water', 0, { from: 'end' });
      alongWall(c, room, 'plant', 1, { from: 'end' });
      decal('window', 34);
      decal('calendar', 30);
      decal('chart', 30);
      decal('clock', 34);
      break;
    }
    case 'trophy': {
      const awards = c.s.player.stats.awards;
      for (let i = 0; i < 2; i++) alongWall(c, room, 'archive', 0, { from: 'end' });
      alongWall(c, room, 'trophy_case', Math.min(6, awards), { prefer: 'left' });
      if (awards > 6) alongWall(c, room, 'trophy_case', Math.min(6, awards - 6), { prefer: 'left' });
      for (const id of ['tape_vault', 'digital_archive', 'own_plant']) {
        if (!owned(id)) continue;
        const v = equipmentVisual(id, c.era);
        alongWall(c, room, v.kind, v.variant ?? 0, { prefer: 'left', label: EQUIPMENT.find((x) => x.id === id)?.name });
      }
      // equipamento desconhecido vai para o arquivo como caixa genérica
      for (const id of c.owned) if (!EQUIPMENT.some((x) => x.id === id)) alongWall(c, room, 'crate', 0);
      alongWall(c, room, 'plant', 1);
      sc.rugs.push({ x: room.x + 1, y: room.y + 1, w: Math.max(1, room.w - 2), h: Math.max(1, room.h - 2) });
      const discs: string[] = [];
      for (let i = 0; i < Math.min(8, c.s.player.stats.platinum); i++) discs.push('disc_platinum');
      for (let i = 0; i < Math.min(12, c.s.player.stats.gold); i++) discs.push('disc_gold');
      // discos ocupam a parede do fundo em pares
      const wallTiles = walls.slice();
      let di = 0;
      for (const w of wallTiles) {
        if (di >= discs.length) break;
        sc.decals.push({ kind: discs[di++], wall: w.wall, tile: w.tile, z: 33 });
        if (di < discs.length) sc.decals.push({ kind: discs[di++], wall: w.wall, tile: w.tile, z: 17, variant: 1 });
      }
      if (awards > 0) decal('awards', 13, { variant: Math.min(4, awards) });
      if (!discs.length) decal('photo', 30);
      floorSpots(c, room, 'stand', 2);
      break;
    }
    case 'meeting': {
      const tx = room.x + Math.max(0, Math.floor((room.w - 3) / 2));
      const ty = room.y + 2;
      if (put(c, room, 'table3', tx, ty, 'SW')) {
        for (let i = 0; i < 3; i++) seatAt(c, room, tx + i, ty - 1, 'SW');
        if (tx - 1 >= room.x) seatAt(c, room, tx - 1, ty, 'SE');
      }
      alongWall(c, room, 'plant', 1, { from: 'end' });
      decal('whiteboard', 32, { span: 2 });
      decal('tvwall', 32);
      floorSpots(c, room, 'stand', 2);
      break;
    }
    case 'hall': {
      alongWall(c, room, 'bench', 0, { prefer: 'left' });
      if (e >= 1) alongWall(c, room, 'vending', 0, { from: 'end' });
      alongWall(c, room, 'plant', 1);
      alongWall(c, room, 'plant', 0, { from: 'end' });
      decal('poster', 32);
      decal('photo', 30);
      decal('poster', 32);
      floorSpots(c, room, 'stand', 6);
      break;
    }
  }
}

function computeEdges(sc: Scene): void {
  const { W, H, layout } = sc;
  const doors = new Set(layout.doors.map((d) => ek(d.side, d.x, d.y)));
  const glass = new Set(layout.glass.map((d) => ek(d.side, d.x, d.y)));
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const a = roomAt(sc, x, y);
      for (const [side, nx, ny] of [['E', x + 1, y], ['S', x, y + 1]] as const) {
        if (nx >= W || ny >= H) continue;
        const b = roomAt(sc, nx, ny);
        if (!a || !b || a.id === b.id || (a.group && a.group === b.group)) continue;
        const k = ek(side, x, y);
        if (doors.has(k)) continue;
        sc.edges.add(k);
        sc.walls.push({
          orient: side === 'S' ? 'x' : 'y',
          x: side === 'S' ? x : x + 1,
          y: side === 'S' ? y + 1 : y,
          style: glass.has(k) ? 'glass' : 'low',
          key: side === 'S' ? x + 0.5 + y + 1 : x + 1 + y + 0.5,
        });
      }
    }
  // pilares nas pontas das paredes internas e nos batentes das portas
  const posts = new Set<string>();
  const addPost = (x: number, y: number) => {
    const k = `${x}:${y}`;
    if (posts.has(k) || x <= 0 || y <= 0) return;
    posts.add(k);
    sc.walls.push({ orient: 'x', x, y, style: 'post', key: x + y + 0.02 });
  };
  for (const w of sc.walls.slice()) {
    if (w.style === 'post') continue;
    addPost(w.x, w.y);
    if (w.orient === 'x') addPost(w.x + 1, w.y);
    else addPost(w.x, w.y + 1);
  }
  // mureta frontal (corte do prédio), com vão na entrada
  const ent = layout.entrance;
  for (let x = 0; x < W; x++) if (!(ent.side === 'S' && ent.x === x)) sc.walls.push({ orient: 'x', x, y: H, style: 'lip', key: x + 0.5 + H });
  for (let y = 0; y < H; y++) if (!(ent.side === 'E' && ent.y === y)) sc.walls.push({ orient: 'y', x: W, y, style: 'lip', key: W + y + 0.5 });
}

/** Monta a cena da sede para o estado atual (determinística). */
export function buildScene(s: GameState, site?: { level: number; seedKey: string }): Scene {
  const level = Math.max(0, Math.min(LAYOUTS.length - 1, site ? site.level : s.player.hq));
  // trocas de função das salas feitas pelo jogador (só na matriz)
  const kinds = !site ? (s.x4 as { industry?: { roomKinds?: Record<string, Record<string, string>> } } | undefined)?.industry?.roomKinds?.[String(level)] : undefined;
  const layout: LayoutDef = kinds ? { ...LAYOUTS[level], rooms: LAYOUTS[level].rooms.map((r) => (kinds[r.id] ? { ...r, kind: kinds[r.id] as RoomKind } : r)) } : LAYOUTS[level];
  const era = eraOf(s.year);
  const { W, H } = layout;
  const sc: Scene = {
    level, era, pal: PALETTES[era], W, H, layout, rooms: layout.rooms, roomGrid: new Array(W * H).fill(null), edges: new Set(), blocked: new Uint8Array(W * H),
    items: [], spots: [], walls: [], decals: [], rugs: [], lights: [], entrance: [layout.entrance.x, layout.entrance.y],
  };
  for (const r of layout.rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) sc.roomGrid[y * W + x] = r;
  computeEdges(sc);
  const keepClear = new Uint8Array(W * H);
  const clear = (x: number, y: number) => { if (x >= 0 && y >= 0 && x < W && y < H) keepClear[y * W + x] = 1; };
  for (const d of [...layout.doors, layout.entrance]) {
    clear(d.x, d.y);
    if (d.side === 'E') clear(d.x + 1, d.y);
    else clear(d.x, d.y + 1);
  }
  const c: Ctx = { s, sc, era, e: eraIndex(era), r: Rng.fromSeed(`hq:${level}:${era}:${s.config.seed}${site ? ':' + site.seedKey : ''}`), keepClear, owned: new Set(s.player.equipment) };
  // ordem: salas com mais exigência primeiro
  const order: RoomKind[] = ['control', 'booth', 'office', 'trophy', 'meeting', 'writing', 'lounge', 'rehearsal', 'hall'];
  for (const k of order) for (const room of layout.rooms.filter((r) => r.kind === k)) furnishRoom(c, room);
  // decalques ganham os logos dos atos do jogador
  const acts = playerActs(s);
  let ai = 0;
  for (const d of sc.decals) if (d.kind === 'poster') { if (acts.length) d.actId = acts[ai++ % acts.length]; else d.kind = 'photo'; }
  // ônibus de turnê estacionado do lado de fora
  if (c.owned.has('tour_bus')) {
    sc.items.push({ kind: 'bus', x: W + 1, y: Math.max(0, Math.floor(H / 2) - 2), w: 1, d: 4, facing: 'SE', variant: 0, frames: 1, room: 'outside', key: W + 1.5 + Math.floor(H / 2), outside: true, label: EQUIPMENT.find((x) => x.id === 'tour_bus')?.name });
  }
  // luz das janelas no piso
  for (const d of sc.decals) {
    if (d.kind !== 'window') continue;
    if (d.wall === 'x') sc.lights.push({ x: d.tile * 16 + 3, y: 1, w: 10, h: 26 });
    else sc.lights.push({ x: 1, y: d.tile * 16 + 3, w: 26, h: 10 });
  }
  // remove pontos inalcançáveis a partir da entrada
  const reach = new Uint8Array(W * H);
  const q = [sc.entrance[1] * W + sc.entrance[0]];
  reach[q[0]] = 1;
  for (let qi = 0; qi < q.length; qi++) {
    const cur = q[qi];
    const x = cur % W;
    const y = (cur / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!canStep(sc, x, y, nx, ny)) continue;
      const ni = ny * W + nx;
      if (reach[ni]) continue;
      reach[ni] = 2;
      if (sc.blocked[ni]) continue;
      reach[ni] = 1;
      q.push(ni);
    }
  }
  sc.spots = sc.spots.filter((sp) => reach[sp.y * W + sp.x] > 0);
  return sc;
}

/** Tiles livres de uma sala (para passear). */
export function freeTiles(sc: Scene, kinds: RoomKind[]): [number, number][] {
  const out: [number, number][] = [];
  for (const r of sc.rooms) {
    if (!kinds.includes(r.kind)) continue;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (!sc.blocked[y * sc.W + x]) out.push([x, y]);
  }
  return out;
}
