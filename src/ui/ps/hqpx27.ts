// r27 (D1) — a Sede em PIXEL ART: o prédio do jogador aberto como casa de bonecas (vista lateral em corte),
// salas lado a lado e empilhadas, a cidade-sede ao fundo. Substitui as ilustrações (hq_*.webp) da tela da Sede.
//
// Três camadas, todas determinísticas:
//   plan27()   — PURA: nível da sede → casca (garagem, sala alugada, loft, prédio, torre, campus) e salas;
//                ano → equipamento, luz e paleta; cidade → marcos no horizonte. Coordenadas em pixels lógicos.
//   paint27()  — PURA (só Px, sem DOM): pinta céu, horizonte, rua, prédio, salas e mobília num buffer.
//   drawHqCutaway27(canvas, model) — DOM: pinta no <canvas> e desenha os bonecos reais (avatarSprite).
// O "Nosso mundo" (campus18px, mapa isométrico) é a vista de FORA; esta é a única vista de DENTRO.

import { l, type L } from '../../data/world';
import { landmarksAt19, type LmShape } from '../../data/landmarks19';
import { lookOf, type Pose } from '../pixel/avatar';
import { avatarSprite } from '../pixel/avatar';
import { drawLandmark19 } from '../pixel/landmarks19px';
import { eraOf, paletteOf, type EraId, type Palette } from '../pixel/palette';
import { C, INK, Px, dith, inked, lv, mix, noise, tint, withAlpha, type Col } from '../pixel/px';
import { amp31, drumKit31 } from '../pixel/stage31px';
import { drawText, fitText, textWidth } from '../pixel/font';
import type { HqModel25, Room25, Sprite25 } from './hq25model';

// ---------------------------------------------------------------- tipos e tabelas

/** Casca do prédio por nível da sede (HQ_LEVELS: garage, small_studio, loft, complex, tower, campus). */
export type Shell27 = 'garage' | 'shop' | 'loft' | 'building' | 'tower' | 'campus';
/** Geração do equipamento: gramofone e 78 rpm → fita de rolo → mesa analógica → digital → laptop. */
export type Gear27 = 'shellac' | 'reel' | 'console' | 'digital' | 'laptop';
/** Luz das salas. */
export type Light27 = 'bulb' | 'pendant' | 'globe' | 'tube' | 'led';
/** Salas extras (r27 I1: compráveis, ver sim/sys/hqrooms27.ts — os ids batem com Buy27). */
export type Deco27 = 'meeting' | 'press' | 'legal' | 'marketing' | 'studioB' | 'archive' | 'rehearsal' | 'garden' | 'neural';
export type Kind27 = Room25 | Deco27;
/** Estado de obra de uma sala/andar comprável (sem estado = aberta). */
export type Lock27 = 'locked' | 'building';
/** Fachada da casca por época: a torre de vidro só aparece a partir de 1968. */
export type Facade27 = 'block' | 'brick' | 'stone' | 'deco' | 'glass' | 'contemporary' | 'future';

export interface Cell27 { kind: Kind27; room?: Room25; floor: number; x: number; y: number; w: number; h: number; name?: L; /** id da sala comprável */ unit?: string; lock?: Lock27 }
export interface Plan27 {
  hq: number; year: number; shell: Shell27; gear: Gear27; light: Light27; era: EraId; facade: Facade27;
  W: number; H: number; /** chão da rua */ gy: number; /** prédio */ bx: number; bw: number; top: number;
  floors: number; cells: Cell27[]; rooms: Room25[]; city: string; lms: LmShape[]; brand: string; seed: number;
  /** andares compráveis: índice → estado (só os fechados ou em obra aparecem) */
  flock: Record<number, Lock27>;
  /** reforma do lounge: aberta (true), em obra, fechada ou inexistente neste nível */
  vip: boolean | Lock27 | null;
  /** coroa da torre acima do corte (x0, x1) — o horizonte põe os marcos fora dela */
  crown: [number, number] | null;
  /** r27 INT: caixa do toca-discos/gramofone do lounge [x, y, w, h] (preenchida ao pintar; clique do ovo) */
  gramo?: [number, number, number, number];
  /** R29: a vaga da garagem está ocupada por um objeto extra (calhambeque do ovo) — a van não é pintada */
  garageTaken?: boolean;
}
export interface Spot27 { id: string; room: Room25; x: number; y: number; pose: Pose; dir: 'SE' | 'SW'; sprite: Sprite25 }
export interface More27 { room: Room25; x: number; y: number; n: number }

/** Sala estreita na tela (largura × escala < 200 px): só o selo curto, sem etiquetas — que vazariam para a vizinha. */
export const NARROW27 = 200;
export const isNarrow27 = (c: { w: number }, k: number): boolean => c.w * k < NARROW27;

export const FH27 = 64; // altura interna de um andar (boneco tem 34)
const SLAB = 6, OW = 6, IWALL = 4, STREET = 16, FOUND = 4;

export function shellOf27(hq: number): Shell27 {
  return (['garage', 'shop', 'loft', 'building', 'tower', 'campus'] as const)[Math.max(0, Math.min(5, Math.floor(hq)))];
}
export function gearOf27(year: number): Gear27 {
  return year < 1955 ? 'shellac' : year < 1970 ? 'reel' : year < 1990 ? 'console' : year < 2010 ? 'digital' : 'laptop';
}
export function lightOf27(shell: Shell27, year: number): Light27 {
  if (shell === 'garage') return 'bulb'; // uma lâmpada pendurada, em qualquer época
  return year < 1960 ? 'pendant' : year < 1980 ? 'globe' : year < 2010 ? 'tube' : 'led';
}

/** O que o estúdio, o escritório, o lounge e o A&R têm em cada geração (os testes conferem). */
export const GEAR27: Record<Gear27, { studio: string[]; office: string[]; lounge: string[]; anr: string[] }> = {
  shellac: { studio: ['lathe', 'ribbon_mic', 'piano'], office: ['typewriter', 'rotary_phone', 'safe'], lounge: ['radiogram', 'shellac_78s'], anr: ['shellac_78s', 'sheet_music'] },
  reel: { studio: ['reel_to_reel', 'tube_desk', 'condenser_mic', 'piano'], office: ['typewriter', 'rotary_phone', 'filing'], lounge: ['jukebox', 'vinyl_45s', 'tv_console'], anr: ['vinyl_45s', 'acetates'] },
  console: { studio: ['analog_console', 'multitrack', 'monitors', 'synth'], office: ['typewriter', 'push_phone', 'filing'], lounge: ['turntable', 'lp_shelf', 'tv_crt'], anr: ['cassettes', 'lp_shelf'] },
  digital: { studio: ['small_console', 'daw_screen', 'rack', 'monitors'], office: ['pc', 'push_phone', 'filing'], lounge: ['cd_tower', 'tv_crt'], anr: ['cds', 'demo_cds'] },
  laptop: { studio: ['laptop', 'midi_pads', 'led_strip', 'monitors'], office: ['laptop', 'phone_dock'], lounge: ['turntable', 'tv_flat'], anr: ['laptop', 'streams_board'] },
};

const D = (kind: Kind27, w: number): [Kind27, number] => [kind, w];
/** Planta por casca: andares de baixo para cima; cada sala com a largura relativa. As salas extras e os andares de
 *  cima dos prédios grandes são compráveis (sim/sys/hqrooms27.ts LEVELS27 — o teste confere que batem). */
const SPEC: Record<Shell27, { iw: number; top: number; open?: boolean; floors: [Kind27, number][][] }> = {
  garage: { iw: 330, top: 86, open: true, floors: [[D('studio', 104), D('lounge', 84), D('office', 66), D('lobby', 76)]] },
  shop: { iw: 330, top: 72, floors: [[D('lobby', 92), D('stage', 136), D('rehearsal', 102)], [D('office', 96), D('studio', 140), D('lounge', 94)]] },
  loft: { iw: 404, top: 72, floors: [[D('anr', 120), D('stage', 144), D('lobby', 140)], [D('studio', 172), D('lounge', 112), D('office', 120)], [D('rehearsal', 200), D('archive', 204)]] },
  building: { iw: 400, top: 72, floors: [[D('lobby', 180), D('stage', 240)], [D('studio', 250), D('lounge', 170)], [D('office', 150), D('anr', 150), D('meeting', 120)], [D('studioB', 220), D('press', 200)]] },
  tower: { iw: 400, top: 84, floors: [[D('lobby', 250), D('stage', 170)], [D('studio', 250), D('studioB', 170)], [D('office', 140), D('anr', 130), D('lounge', 150)], [D('legal', 130), D('marketing', 140), D('meeting', 150)], [D('press', 220), D('archive', 200)]] },
  campus: { iw: 400, top: 84, floors: [[D('lobby', 250), D('stage', 170)], [D('studio', 250), D('neural', 170)], [D('office', 140), D('anr', 130), D('lounge', 150)], [D('legal', 130), D('marketing', 140), D('press', 150)], [D('garden', 150), D('studioB', 140), D('archive', 130)]] },
};
const ROOM_SET = new Set<Kind27>(['studio', 'lounge', 'office', 'anr', 'stage', 'lobby']);
export const DECO_NAME27: Record<Deco27, L> = {
  meeting: l('Sala de reunião', 'Meeting room'), press: l('Sala de imprensa', 'Press room'), legal: l('Jurídico', 'Legal'),
  marketing: l('Marketing', 'Marketing'), studioB: l('Estúdio B', 'Studio B'), archive: l('Arquivo de fitas', 'Tape archive'),
  rehearsal: l('Sala de ensaio', 'Rehearsal room'), garden: l('Jardim suspenso', 'Hanging garden'), neural: l('Estúdio imersivo', 'Immersive studio'),
};
/** Kinds de cada andar por nível (o teste compara com LEVELS27 da simulação). */
export function specFloors27(hq: number): Kind27[][] {
  return SPEC[shellOf27(hq)].floors.map((f) => f.map(([k]) => k));
}

/** Fachada por casca e ano: garagem de bloco; prédios de tijolo/pedra; torre e campus em pedra/art déco até 1967,
 *  vidro modernista de 1968 a 1994, vidro contemporâneo depois (campus futurista a partir de 2015). */
export function facadeOf27(shell: Shell27, year: number): Facade27 {
  if (shell === 'garage') return 'block';
  if (shell === 'shop' || shell === 'loft') return 'brick';
  if (shell === 'building') return year < 1960 ? 'stone' : 'brick';
  if (year < 1930) return 'stone';
  if (year < 1968) return 'deco';
  if (year < 1995) return 'glass';
  return shell === 'campus' && year >= 2015 ? 'future' : 'contemporary';
}

/** Salas do jogo desenhadas em cada nível (as outras ficam fechadas, com a dica de ampliação). */
export function roomsForLevel27(hq: number): Room25[] {
  const out: Room25[] = [];
  for (const f of SPEC[shellOf27(hq)].floors) for (const [k] of f) if (ROOM_SET.has(k) && !out.includes(k as Room25)) out.push(k as Room25);
  return out;
}

export function hash27(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
/** Gerador local (não toca nos fluxos do jogo). */
function rng27(seed: number): () => number {
  let a = seed | 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export interface PlanIn27 {
  hq: number; year: number; city?: string; brand?: string; seedKey?: string; /** largura mínima (preenche o contêiner) */ minW?: number;
  /** estado das salas/andares compráveis (id de hqRooms27 → estado); sem isto, tudo aberto */
  units?: Record<string, 'open' | Lock27>;
  /** r27: ano da fachada (construção/última reforma da sede, igual ao mapa da cidade); sem isto, o ano do jogo */
  facadeYear?: number;
}

/** A planta inteira (pura). */
export function plan27(o: PlanIn27): Plan27 {
  const shell = shellOf27(o.hq);
  const sp = SPEC[shell];
  const n = sp.floors.length;
  const bw = sp.iw + 2 * OW;
  const left = shell === 'garage' ? 84 : shell === 'loft' || shell === 'building' ? 18 : 0;
  const H = sp.top + n * (FH27 + SLAB) + FOUND + STREET;
  const gy = H - STREET;
  const need = bw + left + 2 * 8;
  const W = Math.max(need, Math.floor(o.minW ?? 0));
  const bx = Math.floor((W - bw + left) / 2);
  const cells: Cell27[] = [];
  sp.floors.forEach((fl, i) => {
    const y = gy - FOUND - (i + 1) * FH27 - i * SLAB;
    const walls = sp.open ? 0 : (fl.length - 1) * IWALL;
    const tot = fl.reduce((a, [, w]) => a + w, 0);
    let x = bx + OW;
    fl.forEach(([kind, wt], j) => {
      const w = j === fl.length - 1 ? bx + OW + sp.iw - x : Math.round(((sp.iw - walls) * wt) / tot);
      const room = ROOM_SET.has(kind) ? (kind as Room25) : undefined;
      const st = room ? undefined : o.units?.[kind];
      cells.push({ kind, room, floor: i, x, y, w, h: FH27, name: room ? undefined : DECO_NAME27[kind as Deco27], unit: room ? undefined : kind, lock: st && st !== 'open' ? st : undefined });
      x += w + (sp.open ? 0 : IWALL);
    });
  });
  const city = o.city ?? '';
  const flock: Record<number, Lock27> = {};
  for (const [k, v] of Object.entries(o.units ?? {})) {
    const m = /^floor:(\d+):(\d+)$/.exec(k);
    if (m && Number(m[1]) === Math.floor(o.hq) && v !== 'open') flock[Number(m[2])] = v;
  }
  // sala em andar fechado fica fechada junto (o andar manda)
  for (const c of cells) if (flock[c.floor] && !c.room) c.lock = flock[c.floor];
  const vs = o.units?.loungeVip;
  const vip: Plan27['vip'] = vs === undefined ? (o.units ? null : false) : vs === 'open' ? true : vs;
  const facade = facadeOf27(shell, o.facadeYear ?? o.year);
  const tall = shell === 'tower' || shell === 'campus';
  const cw = facade === 'deco' || facade === 'stone' ? Math.round(bw * 0.46) : Math.round(bw * 0.42);
  return {
    hq: o.hq, year: o.year, shell, gear: gearOf27(o.year), light: lightOf27(shell, o.year), era: eraOf(o.year), facade,
    W, H, gy, bx, bw, top: sp.top, floors: n, cells, rooms: roomsForLevel27(o.hq), city,
    lms: city ? landmarksAt19(city, o.year).map((x) => x.sh) : [], brand: o.brand ?? 'REC', seed: hash27(`${o.seedKey ?? ''}|${shell}|${city}`),
    flock, vip, crown: tall ? [bx + ((bw - cw) >> 1), bx + ((bw - cw) >> 1) + cw] : null,
  };
}

/** Onde cada boneco fica (pés no chão da sala), espalhados pela largura. */
export function place27(p: Plan27, rooms: { id: Room25; sprites: Sprite25[]; more: number }[]): { spots: Spot27[]; more: More27[] } {
  const spots: Spot27[] = [];
  const more: More27[] = [];
  for (const r of rooms) {
    const c = p.cells.find((x) => x.room === r.id);
    if (!c) continue;
    const n = r.sprites.length + (r.more ? 1 : 0);
    const fy = c.y + c.h - 3;
    r.sprites.forEach((sp, i) => {
      const x = Math.round(c.x + 8 + ((c.w - 16) * (i + 1)) / (n + 1));
      const playing = sp.kind === 'artist' && (r.id === 'studio' || r.id === 'stage');
      spots.push({ id: sp.id, room: r.id, x, y: fy, pose: playing ? 'play' : 'stand', dir: i % 2 ? 'SW' : 'SE', sprite: sp });
    });
    if (r.more) more.push({ room: r.id, x: Math.round(c.x + 8 + ((c.w - 16) * n) / (n + 1)), y: fy - 14, n: r.more });
  }
  return { spots, more };
}

// ---------------------------------------------------------------- pintura (pura)

type Pal = Palette;
interface Ctx { p: Px; pal: Pal; pl: Plan27; r: () => number; lamp: Col }

/** Sombra de oclusão (cantos, teto): o tom mais fundo da rampa, puxado para o roxo. */
const OCC = C('#2a1634');
const blk = (p: Px, x: number, y: number, w: number, h: number, c: Col): void => {
  if (w <= 0 || h <= 0) return;
  p.rect(x, y, w, h, c);
  // luz de cima à esquerda (tom 4), pé em sombra arroxeada (tom 1), lado direito em meia-sombra (tom 2)
  p.hline(x, x + w - 1, y, lv(c, 4));
  if (h > 3 && w > 3) p.vline(x, y + 1, y + h - 2, lv(c, 3.5));
  p.hline(x, x + w - 1, y + h - 1, lv(c, 1));
  if (h > 2) p.vline(x + w - 1, y + 1, y + h - 2, lv(c, 2));
};

function sky(g: Ctx): void {
  const { p, pl } = g;
  const stops: [number, Col][] = pl.year < 1960
    ? [[0, C('#1a1d3c')], [0.45, C('#4a3560')], [0.78, C('#c66a52')], [1, C('#f0b062')]]
    : pl.year < 1990 ? [[0, C('#161838')], [0.45, C('#46305e')], [0.8, C('#d0644e')], [1, C('#f29a52')]]
    : [[0, C('#0f1430')], [0.5, C('#38306a')], [0.82, C('#b8508a')], [1, C('#f08a6a')]];
  const hz = pl.gy - 10;
  for (let y = 0; y < pl.gy; y++) {
    const t = Math.min(1, y / hz);
    let i = 0;
    while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
    const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
    const u = (t - t0) / (t1 - t0);
    for (let x = 0; x < pl.W; x++) p.put(x, y, dith(x, y, (u * 4) % 1) ? mix(c0, c1, Math.min(1, Math.floor(u * 4 + 1) / 4)) : mix(c0, c1, Math.floor(u * 4) / 4));
  }
  for (let i = 0; i < pl.W / 9; i++) { const x = Math.floor(g.r() * pl.W), y = Math.floor(g.r() * hz * 0.4); p.put(x, y, withAlpha(C('#fff6d8'), 120 + Math.floor(g.r() * 120))); }
  if (pl.year >= 1950) p.disc(pl.W * 0.82, 14, 5, C('#f6ecd0')); // lua
  if (pl.year >= 1950) p.disc(pl.W * 0.82 + 2, 13, 4.2, mix(stops[0][1], stops[1][1], 0.2));
}

/** Silhuetas da cidade: alturas sobem com o ano; janelas acesas; marcos da cidade-sede. */
function skyline(g: Ctx): void {
  const { p, pl } = g;
  const roof = pl.gy - FOUND - pl.floors * (FH27 + SLAB) - SLAB;
  const hz = Math.min(pl.gy, roof + 46); // horizonte logo abaixo do telhado: a cidade aparece por cima e dos lados
  const room = hz - 6;
  const maxH = Math.min(room, pl.year < 1930 ? 54 : pl.year < 1960 ? 76 : pl.year < 1990 ? 100 : 124);
  const lit = withAlpha(C('#ffd889'), 200);
  const layer = (col: Col, hMul: number, base: number, wl: number) => {
    let x = -6;
    while (x < pl.W) {
      const w = 10 + Math.floor(g.r() * 22);
      const tall = g.r() < (pl.year < 1960 ? 0.1 : 0.25);
      const h = Math.floor((tall ? 0.7 + g.r() * 0.3 : 0.25 + g.r() * 0.45) * maxH * hMul);
      const y = hz - base - h;
      p.rect(x, y, w, pl.gy - y, col);
      if (pl.year >= 1990 && tall) { p.rect(x + 1, y, w - 2, h, mix(col, C('#5a6aa8'), 0.18)); }
      if (g.r() < 0.3 && pl.year >= 1930) { p.vline(x + (w >> 1), y - 6, y, col); if (pl.year >= 1960) p.put(x + (w >> 1), y - 7, C('#ff5a4a')); }
      if (pl.year < 1960 && g.r() < 0.25) { p.rect(x + 2, y - 7, 6, 5, tint(col, 0.1)); p.vline(x + 3, y - 2, y, col); p.vline(x + 6, y - 2, y, col); } // caixa-d'água
      for (let yy = y + 3; yy < pl.gy - 2; yy += 4) for (let xx = x + 2; xx < x + w - 2; xx += 3) if (noise(xx, yy, pl.seed) < wl) p.rect(xx, yy, 1, 2, lit);
      x += w + (g.r() < 0.3 ? 2 : 0);
    }
  };
  layer(C('#2c2850'), 1, 18, 0.18);
  layer(C('#1d1a38'), 0.75, 8, 0.12);
  // r27 I1: marcos da cidade-sede em dobro (2×), em vãos visíveis acima do telhado (fora da coroa da torre, do
  // letreiro e da caixa-d'água), com a base escondida atrás do prédio — aparece a silhueta reconhecível
  landmarks27(g);
}

/** Silhuetas mais reconhecíveis primeiro (torres, estátuas, pontes) e sem repetir a mesma forma; no máximo 3. */
const LM_RANK27: LmShape[] = ['spire', 'twin', 'lattice', 'needle', 'clock', 'statue', 'tbridge', 'bridge', 'cable', 'wheel', 'cathedral', 'minaret', 'pagoda', 'shell', 'dome', 'obelisk', 'arch', 'castle', 'temple', 'colosseum', 'pyramid', 'gate', 'stadium', 'hall', 'wall', 'sign', 'studio'];
export function pickLms27(lms: LmShape[]): LmShape[] {
  const u = [...new Set(lms)];
  return u.sort((a, b) => LM_RANK27.indexOf(a) - LM_RANK27.indexOf(b)).slice(0, 3);
}

export interface LmSpot27 { sh: LmShape; x: number; k: number; base: number; box: [number, number, number, number] }
/** Onde cada marco fica: centro, escala, linha de base e caixa (pura; os testes conferem que não some atrás do prédio). */
export function lmSpots27(pl: Plan27): LmSpot27[] {
  const roof = pl.gy - FOUND - pl.floors * (FH27 + SLAB) - SLAB;
  const out: LmSpot27[] = [];
  const probe = new Px(160, 140);
  // faixas ocupadas acima do telhado: coroa da torre, letreiro, caixa-d'água
  const busy: [number, number][] = [];
  if (pl.crown) busy.push([pl.crown[0] - 6, pl.crown[1] + 6]);
  else if (pl.shell === 'garage') busy.push([pl.bx + (pl.bw >> 1) - 64, pl.bx + (pl.bw >> 1) + 64]);
  else {
    const sx = pl.bx + Math.floor(pl.bw * 0.32);
    busy.push([sx - 50, sx + 50]);
    if (pl.shell === 'loft' || (pl.shell === 'building' && pl.year < 1990)) busy.push([pl.bx + pl.bw - 50, pl.bx + pl.bw - 26]);
  }
  const free = (x0: number, x1: number) => x0 >= 2 && x1 <= pl.W - 2 && busy.every(([a, b]) => x1 < a || x0 > b) && out.every((o) => x1 < o.box[0] - 6 || x0 > o.box[2] + 6);
  const avail = Math.max(24, roof - 6); // altura de céu acima do telhado
  const cands = [0.14, 0.86, 0.5, 0.3, 0.7, 0.07, 0.93].map((f) => Math.round(pl.W * f));
  for (const sh of pickLms27(pl.lms)) {
    const [x0, y0, x1] = drawLandmark19(probe, sh, 80, 130, { body: 0, hi: 0, dark: 0, lamp: 0 });
    const lw = x1 - x0, lh = 130 - y0;
    for (const k of [2, 1]) {
      const tall = lh * k;
      // até 35% do marco atrás do telhado, para o topo caber no céu
      const hide = Math.max(0, Math.min(Math.round(tall * 0.35), tall - avail));
      if (tall - hide > avail + 2 || lw * k > pl.W * 0.42) continue;
      const base = roof + hide - 1;
      const spot = cands.map((cx) => ({ cx, b0: cx + (x0 - 80) * k, b1: cx + (x1 - 80) * k })).find((c) => free(c.b0, c.b1));
      if (!spot) continue;
      out.push({ sh, x: spot.cx, k, base, box: [spot.b0, base - tall, spot.b1, base] });
      break;
    }
  }
  return out;
}

function landmarks27(g: Ctx): void {
  const { p, pl } = g;
  const lc = { body: C('#4a4482'), hi: C('#7068b0'), dark: C('#2e2a5c'), lamp: C('#ffcf6a') };
  for (const m of lmSpots27(pl)) {
    if (m.k === 1) { drawLandmark19(p, m.sh, m.x, m.base, lc); continue; }
    const t = new Px(160, 140);
    drawLandmark19(t, m.sh, 80, 130, lc);
    for (let y = 0; y < 140; y++) for (let x = 0; x < 160; x++) {
      const c = t.get(x, y);
      if (!(c >>> 24)) continue;
      const dx = m.x + (x - 80) * 2, dy = m.base + (y - 130) * 2;
      p.set(dx, dy, c); p.set(dx + 1, dy, c); p.set(dx, dy + 1, c); p.set(dx + 1, dy + 1, c);
    }
    // contorno escuro fino para destacar do céu
    for (let y = m.box[1] - 1; y <= m.box[3]; y++) for (let x = m.box[0] - 1; x <= m.box[2] + 1; x++) {
      const tx = Math.floor((x - m.x) / 2) + 80, ty = Math.floor((y - m.base) / 2) + 130;
      if (t.get(tx, ty) >>> 24) continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const u = Math.floor((x + a - m.x) / 2) + 80, v = Math.floor((y + b - m.base) / 2) + 130; return (t.get(u, v) >>> 24) > 0; });
      if (nb) p.set(x, y, withAlpha(C('#141230'), 150));
    }
  }
}

function street(g: Ctx): void {
  const { p, pl, pal } = g;
  const y = pl.gy;
  const side = pl.shell === 'garage' ? mix(pal.ground[0], C('#8a8478'), 0.5) : mix(pal.ground[0], C('#7a7672'), 0.6);
  p.rect(0, y, pl.W, 5, side);
  for (let x = 0; x < pl.W; x += 12) p.vline(x, y, y + 4, tint(side, -0.15));
  p.rect(0, y + 5, pl.W, 1, tint(side, 0.3));
  const road = pl.year < 1930 ? C('#4a4440') : C('#24222c');
  p.rect(0, y + 6, pl.W, STREET - 6, road);
  if (pl.year < 1930) for (let yy = y + 7; yy < y + STREET; yy += 2) for (let x = (yy & 2); x < pl.W; x += 4) p.put(x, yy, tint(road, 0.12));
  else for (let x = 4; x < pl.W; x += 18) p.rect(x, y + 11, 8, 1, C('#d8c060'));
  // postes
  for (let x = 14; x < pl.W; x += 120) {
    if (x > pl.bx - 10 && x < pl.bx + pl.bw + 10) continue;
    // R29: poste em 2 tons (aresta clara à esquerda), base e luminária com vidro aceso, contorno INK
    const iron = pl.year < 1960 ? C('#3a3a2e') : C('#4a4a56');
    const bulb = pl.year >= 2010 ? C('#e8f4ff') : pl.year >= 1960 ? C('#ffc870') : C('#ffd889');
    inked(p, (q) => {
      q.vline(x, y - 34, y - 1, lv(iron, 3.8)); q.vline(x + 1, y - 34, y - 1, lv(iron, 2));
      q.rect(x - 1, y - 4, 4, 4, lv(iron, 2.6)); q.hline(x - 1, x + 2, y - 4, lv(iron, 4));
      if (pl.year < 1940) { // lampião a gás
        q.rect(x - 2, y - 40, 6, 6, lv(iron, 2)); q.rect(x - 1, y - 39, 4, 4, bulb); q.hline(x - 1, x + 2, y - 39, lv(bulb, 5)); q.hline(x - 2, x + 3, y - 41, lv(iron, 3.6));
      } else { // braço com luminária
        q.hline(x + 1, x + 6, y - 35, lv(iron, 3.4)); q.hline(x + 1, x + 6, y - 34, lv(iron, 1.8));
        q.rect(x + 4, y - 33, 5, 2, lv(iron, 2.4)); q.hline(x + 5, x + 7, y - 31, bulb);
      }
    });
    p.ellipse(pl.year < 1940 ? x + 1 : x + 6, pl.year < 1940 ? y - 37 : y - 31, 4, 3, withAlpha(bulb, 60));
    p.poly([[x + 6, y - 31], [x + 1, y], [x + 12, y]], withAlpha(bulb, 22));
  }
}

/** Prédios vizinhos (mais próximos, um pouco mais escuros) dos dois lados. */
function neighbours(g: Ctx): void {
  const { p, pl } = g;
  const bh = pl.gy - (pl.H - STREET - FOUND - pl.floors * (FH27 + SLAB));
  const col = pl.year < 1960 ? C('#3a2a2e') : pl.year < 1990 ? C('#33283a') : C('#262a40');
  const lit = withAlpha(C('#ffc870'), 170);
  // R29 (arte consistente): vizinhos com o mesmo acabamento do resto — contorno INK, cornija com luz em cima,
  // aresta esquerda clara e direita em meia-sombra, janelas com moldura, peitoril e vidro aceso em degradê
  // (ou apagado com reflexo), porta/vitrine no térreo. Continuam mais escuros que a sede (plano de trás).
  const draw = (x0: number, x1: number) => {
    let x = x0;
    while (x < x1) {
      const w = Math.min(x1 - x, 34 + Math.floor(g.r() * 30));
      if (w < 8) break;
      const h = Math.max(30, Math.floor(bh * (0.55 + g.r() * 0.6)));
      const y = pl.gy - h;
      const xs = x;
      inked(p, (q) => {
        for (let yy = y; yy < pl.gy; yy++) for (let xx = xs; xx < xs + w; xx++) {
          let c = col;
          if (xx === xs) c = lv(col, 3.6); else if (xx >= xs + w - 2) c = lv(col, 2.2);
          else if ((yy - y) % 4 === 3 && pl.year < 1960) c = lv(col, 2.6); // fiadas de tijolo
          q.put(xx, yy, c);
        }
        q.rect(xs - 1, y, w + 2, 3, lv(col, 3.4)); q.hline(xs - 1, xs + w, y, lv(col, 4.4)); q.hline(xs - 1, xs + w, y + 3, lv(col, 1.2)); // cornija
        for (let yy = y + 7; yy < pl.gy - 14; yy += 11) for (let xx = xs + 4; xx < xs + w - 6; xx += 9) {
          const on = noise(xx, yy, pl.seed + 7) < 0.35;
          q.rect(xx - 1, yy - 1, 6, 8, lv(col, 1.3)); // moldura
          for (let r = 0; r < 6; r++) q.hline(xx, xx + 3, yy + r, on ? (r < 2 ? C('#ffe6a8') : r < 4 ? lit : C('#e0a050')) : lv(col, r < 2 ? 1.9 : 1.1));
          if (!on) q.put(xx, yy, lv(col, 2.8)); else if (noise(xx, yy, pl.seed + 9) < 0.3) q.rect(xx + 1, yy + 2, 2, 4, C('#5a3a3a')); // reflexo / alguém na janela
          q.hline(xx - 1, xx + 4, yy + 7, lv(col, 4)); // peitoril
        }
        const dx = xs + Math.floor(w / 2) - 3; // térreo: porta com bandeira acesa
        q.rect(dx - 1, pl.gy - 13, 8, 13, lv(col, 1.2)); q.rect(dx, pl.gy - 12, 6, 12, lv(col, 0.6)); q.hline(dx, dx + 5, pl.gy - 12, C('#e0a050'));
      });
      x += w + 1;
    }
  };
  const lx = pl.shell === 'garage' ? pl.bx - 84 : pl.bx - (pl.shell === 'loft' || pl.shell === 'building' ? 18 : 0);
  draw(-4, lx - 2);
  draw(pl.bx + pl.bw + 2, pl.W + 4);
}

// ---------------------------------------------------------------- mobília (vista lateral; fy = chão)

// R31 (arte): bateria e amplificador vêm da fonte única no estilo padrão (stage31px) — não mais do atlas do pacote
// de equipamentos (arte em alta resolução reduzida, que destoava dos bonecos e da mobília).
function amp(g: Ctx, x: number, fy: number, big = false): void {
  amp31(g.p, x, fy, g.pl.year, big);
}
function micStand(g: Ctx, x: number, fy: number): void {
  const { p, pl } = g;
  const m = C('#9aa0aa');
  p.vline(x, fy - 24, fy - 1, m);
  p.line(x, fy - 2, x - 3, fy - 1, m); p.line(x, fy - 2, x + 3, fy - 1, m);
  if (pl.gear === 'shellac') { p.rect(x - 2, fy - 31, 5, 7, C('#c8ccd0')); for (let y = fy - 30; y < fy - 24; y += 2) p.hline(x - 1, x + 1, y, C('#6a6e78')); }
  else if (pl.gear === 'reel') { p.rect(x - 1, fy - 30, 3, 6, C('#b8bcc4')); p.put(x, fy - 29, C('#5a5e68')); }
  else { p.line(x, fy - 24, x + 4, fy - 27, m); p.rect(x + 4, fy - 29, 2, 3, C('#2a2a2e')); p.put(x + 5, fy - 30, C('#d0d4dc')); if (pl.gear !== 'console') p.ring(x + 8, fy - 28, 2, C('#3a3a40')); }
}
function guitar(g: Ctx, x: number, fy: number, col: Col): void {
  const { p } = g;
  p.line(x - 1, fy - 1, x + 1, fy - 6, C('#2a2a2e')); p.line(x + 3, fy - 1, x + 1, fy - 6, C('#2a2a2e'));
  p.ellipse(x + 1, fy - 7, 3, 3, col); p.ellipse(x + 1, fy - 12, 2.4, 2.4, col);
  p.put(x + 1, fy - 9, INK);
  p.rect(x + 1, fy - 24, 1, 11, C('#6a4a2a')); p.rect(x, fy - 26, 3, 2, C('#2a2a2e'));
}
function drums(g: Ctx, x: number, fy: number): void {
  drumKit31(g.p, x, fy, g.pl.year, g.pal.accent2);
}
/** Porta interna (fundos, agenda do estúdio): batente, duas almofadas com luz embaixo, maçaneta; `note` = papel colado. */
function door(g: Ctx, x: number, fy: number, w = 14, h = 32, note = false): void {
  const { p, pal } = g;
  const wd = pal.woodDark;
  blk(p, x, fy - h, w, h, wd);
  const pw = w - 4, top = fy - h + 3, ph1 = Math.round((h - 8) * 0.42), ph2 = h - 8 - ph1;
  for (const [py, ph] of [[top, ph1], [top + ph1 + 2, ph2]] as const) { p.rect(x + 2, py, pw, ph, lv(wd, 2.4)); p.hline(x + 2, x + 1 + pw, py, lv(wd, 1.6)); p.hline(x + 2, x + 1 + pw, py + ph - 1, lv(wd, 3.8)); }
  if (note) { p.rect(x + 3, top + 2, pw - 2, 6, pal.paper); for (let i = 0; i < 3; i++) p.hline(x + 4, x + pw - 1 - i, top + 3 + i * 2, INK); }
  const hy = fy - Math.round(h * 0.47);
  p.rect(x + w - 4, hy, 2, 2, pal.gold); p.put(x + w - 4, hy, lv(pal.gold, 4.6));
}
function piano(g: Ctx, x: number, fy: number): void {
  const { p, pal } = g;
  const w = pal.woodDark;
  blk(p, x, fy - 22, 26, 14, w);
  p.rect(x + 1, fy - 9, 24, 2, C('#f2ece0')); for (let i = x + 2; i < x + 25; i += 2) p.put(i, fy - 9, INK);
  p.rect(x + 2, fy - 7, 2, 7, w); p.rect(x + 22, fy - 7, 2, 7, w);
  p.rect(x + 4, fy - 20, 18, 1, tint(w, 0.15));
  p.rect(x + 9, fy - 26, 6, 4, g.pal.paper); // partitura
}
function lathe(g: Ctx, x: number, fy: number): void {
  const { p, pal } = g;
  blk(p, x, fy - 12, 22, 3, pal.wood); p.rect(x + 2, fy - 9, 2, 9, pal.woodDark); p.rect(x + 18, fy - 9, 2, 9, pal.woodDark);
  blk(p, x + 2, fy - 15, 18, 3, C('#3a3a40')); p.ellipse(x + 11, fy - 16, 7, 1.2, C('#1a1a1e'));
  p.line(x + 15, fy - 16, x + 18, fy - 21, C('#b8bcc4'));
  // corneta de gramofone
  p.poly([[x + 4, fy - 17], [x + 6, fy - 17], [x + 1, fy - 30], [x - 6, fy - 26]], C('#d8a840'));
  p.line(x + 1, fy - 30, x - 6, fy - 26, C('#f2d070'));
}
function reelDeck(g: Ctx, x: number, fy: number, tall = false): void {
  const { p } = g;
  const h = tall ? 30 : 24, w = tall ? 18 : 16;
  blk(p, x, fy - h, w, h, tall ? C('#4a4a52') : C('#7a7262'));
  const ry = fy - h + 6;
  for (const cx of [x + 4.5, x + w - 4.5]) { p.disc(cx, ry, tall ? 4 : 3.4, C('#c8ccd0')); p.disc(cx, ry, 1.2, INK); p.ring(cx, ry, tall ? 3 : 2.5, C('#5a5e68')); }
  p.rect(x + 3, fy - h + 12, w - 6, 2, INK);
  if (tall) for (let i = 0; i < 4; i++) p.rect(x + 2 + i * 4, fy - h + 16, 3, 2, C('#e8b048'));
  for (let i = 0; i < 3; i++) p.put(x + 4 + i * 4, fy - 6, C('#d0d4dc'));
}
function monitorSpk(g: Ctx, x: number, y: number): void {
  const { p } = g;
  blk(p, x, y, 6, 9, C('#26242a')); p.disc(x + 3, y + 6, 1.8, C('#5a5a62')); p.put(x + 3, y + 2, C('#7a7a82'));
}
function consoleDesk(g: Ctx, x: number, fy: number, w: number): void {
  const { p, pl, pal } = g;
  if (pl.gear === 'shellac') { lathe(g, x, fy); return; }
  if (pl.gear === 'reel') {
    blk(p, x, fy - 12, w, 3, pal.wood); p.rect(x + 2, fy - 9, 2, 9, pal.woodDark); p.rect(x + w - 4, fy - 9, 2, 9, pal.woodDark);
    blk(p, x + 3, fy - 17, 14, 5, C('#6a6458')); for (let i = 0; i < 5; i++) p.put(x + 5 + i * 2, fy - 15, C('#e8d8a8'));
    p.rect(x + 6, fy - 19, 6, 2, C('#e8b048'));
    return;
  }
  const deskC = pl.gear === 'console' ? pal.woodDark : C('#2e2e36');
  blk(p, x, fy - 10, w, 10, deskC);
  p.poly([[x, fy - 10], [x + w, fy - 10], [x + w - 2, fy - 15], [x + 2, fy - 15]], pl.gear === 'console' ? C('#5a5650') : C('#3a3a44'));
  if (pl.gear === 'console' || pl.gear === 'digital') {
    for (let i = x + 3; i < x + w - 3; i += 2) { p.put(i, fy - 12 - (i % 3), C('#d8d4c8')); p.put(i, fy - 14, i % 6 === 0 ? C('#e85a4a') : C('#8a8a92')); }
    if (pl.gear === 'console') { blk(p, x + 2, fy - 20, w - 4, 5, C('#2a2826')); for (let i = x + 4; i < x + w - 6; i += 5) p.rect(i, fy - 19, 3, 3, C('#f0c060')); }
  }
  if (pl.gear === 'digital') { // tela da DAW
    const c = pl.year < 2003 ? C('#d8d0bc') : C('#26262e');
    blk(p, x + (w >> 1) - 8, fy - 27, 16, 11, c);
    p.rect(x + (w >> 1) - 6, fy - 25, 12, 7, C('#2a5aa0'));
    for (let i = 0; i < 4; i++) p.hline(x + (w >> 1) - 5, x + (w >> 1) - 5 + 3 + ((i * 5) % 8), fy - 24 + i * 2, C('#7ad0f0'));
    p.rect(x + (w >> 1) - 1, fy - 16, 2, 1, c);
  }
  if (pl.gear === 'laptop') {
    p.poly([[x + 6, fy - 16], [x + 16, fy - 16], [x + 14, fy - 24], [x + 4, fy - 24]], C('#b8bcc4'));
    p.rect(x + 6, fy - 23, 7, 5, C('#3a8ad8'));
    blk(p, x + 20, fy - 17, 12, 2, C('#e8e8ec')); for (let i = 0; i < 4; i++) p.rect(x + 21 + i * 3, fy - 17, 2, 1, i % 2 ? C('#ff4fa3') : C('#35e0e0')); // pads
    blk(p, x + w - 18, fy - 28, 14, 10, C('#1a1a20')); p.rect(x + w - 17, fy - 27, 12, 7, C('#2a3a6a'));
    for (let i = 0; i < 6; i++) p.vline(x + w - 16 + i * 2, fy - 21 - ((i * 7) % 5), fy - 21, C('#35e0e0'));
  }
  monitorSpk(g, x - 1, fy - 25); monitorSpk(g, x + w - 5, fy - 25);
}
function couch(g: Ctx, x: number, fy: number, w: number, col: Col): void {
  const { p } = g;
  blk(p, x, fy - 14, w, 7, tint(col, -0.08)); // encosto
  blk(p, x + 2, fy - 8, w - 4, 4, col); // assento
  blk(p, x, fy - 10, 3, 7, tint(col, -0.18)); blk(p, x + w - 3, fy - 10, 3, 7, tint(col, -0.18));
  p.rect(x + 1, fy - 3, 2, 3, INK); p.rect(x + w - 3, fy - 3, 2, 3, INK);
  p.rect(x + 5, fy - 12, 5, 3, tint(col, 0.25)); // almofada
}
function shelf(g: Ctx, x: number, y: number, w: number, h: number, media: 'records' | 'tapes' | 'cds' | 'books' | 'drives'): void {
  const { p, pal } = g;
  blk(p, x, y, w, h, pal.woodDark);
  const cols = [pal.accent, pal.accent2, pal.fabric, pal.fabric2, pal.paper, pal.gold, C('#3a3a44')];
  for (let yy = y + 2; yy < y + h - 3; yy += 7) {
    p.hline(x + 1, x + w - 2, yy + 5, tint(pal.woodDark, 0.25));
    let xx = x + 2;
    while (xx < x + w - 2) {
      const th = media === 'records' ? 1 : media === 'cds' ? 1 : media === 'drives' ? 2 : 2;
      const hh = media === 'records' ? 5 : media === 'cds' ? 3 : media === 'tapes' ? 4 : 5 - Math.floor(noise(xx, yy, 3) * 2);
      p.rect(xx, yy + 5 - hh, th, hh, cols[Math.floor(noise(xx, yy, g.pl.seed) * cols.length)]);
      xx += th + (media === 'records' ? 0 : 1);
    }
  }
}
function desk(g: Ctx, x: number, fy: number, w: number): void {
  const { p, pal, pl } = g;
  const top = pl.year < 1990 ? pal.wood : pl.year < 2010 ? C('#c8c4b8') : C('#e8e6e0');
  blk(p, x, fy - 12, w, 3, top);
  if (pl.year < 1990) blk(p, x + w - 9, fy - 9, 8, 9, tint(top, -0.12)); else p.rect(x + w - 3, fy - 9, 2, 9, C('#7a7a82'));
  p.rect(x + 1, fy - 9, 2, 9, tint(top, -0.3));
}
function deskGear(g: Ctx, x: number, fy: number): void {
  const { p, pl } = g;
  const y = fy - 12;
  if (pl.gear === 'shellac' || pl.gear === 'reel' || pl.gear === 'console') {
    blk(p, x, y - 4, 9, 4, pl.gear === 'console' ? C('#c84f2a') : C('#2a2a2e')); p.rect(x + 2, y - 7, 5, 3, C('#f2ece0')); // máquina de escrever
    p.rect(x + 12, y - 3, 5, 3, pl.gear === 'console' ? C('#e8d070') : C('#1a1a1e')); p.ellipse(x + 14, y - 4, 3, 1, pl.gear === 'console' ? C('#e8d070') : C('#1a1a1e')); // telefone
  } else if (pl.gear === 'digital') {
    blk(p, x, y - 10, 12, 10, pl.year < 2003 ? C('#d8d0bc') : C('#2a2a32')); p.rect(x + 2, y - 8, 8, 6, C('#2a6ab0')); p.rect(x + 1, y - 1, 12, 1, C('#b8b0a0'));
    p.rect(x + 14, y - 2, 4, 2, C('#2a2a2e'));
  } else {
    p.poly([[x, y], [x + 10, y], [x + 9, y - 7], [x + 1, y - 7]], C('#c8ccd4')); p.rect(x + 2, y - 6, 6, 4, C('#7ab8f0'));
    p.rect(x + 13, y - 4, 2, 4, C('#f0f0f0'));
  }
}
function chair(g: Ctx, x: number, fy: number): void {
  const { p, pl, pal } = g;
  if (pl.year < 1970) { p.rect(x, fy - 7, 7, 2, pal.wood); p.rect(x + 5, fy - 15, 2, 15, pal.woodDark); p.rect(x, fy - 5, 1, 5, pal.woodDark); return; }
  const c = pl.year < 1990 ? pal.fabric : C('#2a2a32');
  blk(p, x, fy - 8, 8, 2, c); blk(p, x + 6, fy - 16, 3, 9, c); p.vline(x + 4, fy - 6, fy - 2, C('#6a6a72')); p.hline(x + 1, x + 7, fy - 1, C('#6a6a72'));
}
function filing(g: Ctx, x: number, fy: number): void {
  const { p, pal } = g;
  blk(p, x, fy - 20, 9, 20, pal.metalDark);
  for (let i = 0; i < 3; i++) { p.hline(x + 1, x + 7, fy - 19 + i * 6 + 5, tint(pal.metalDark, -0.3)); p.rect(x + 3, fy - 17 + i * 6, 3, 1, pal.metal); }
}
function plant(g: Ctx, x: number, fy: number, big = false): void {
  const { p, pal } = g;
  const h = big ? 22 : 12;
  blk(p, x - 3, fy - 5, 7, 5, pal.pot);
  for (let i = 0; i < (big ? 9 : 5); i++) {
    const a = -Math.PI / 2 + (i - (big ? 4 : 2)) * 0.32;
    const len = h * (0.6 + noise(x, i, 1) * 0.4);
    p.line(x, fy - 5, x + Math.cos(a) * len * 0.5, fy - 5 + Math.sin(a) * len, i % 2 ? pal.plant : tint(pal.plant, 0.2));
  }
}
function tv(g: Ctx, x: number, fy: number): void {
  const { p, pl, pal } = g;
  if (pl.year < 1955) { blk(p, x, fy - 18, 14, 18, pal.wood); p.disc(x + 7, fy - 12, 3.5, C('#e8d8a8')); p.put(x + 7, fy - 12, INK); for (let i = 0; i < 3; i++) p.put(x + 4 + i * 3, fy - 5, pal.gold); return; } // rádio
  if (pl.year < 1980) { blk(p, x, fy - 18, 18, 14, pal.wood); blk(p, x + 2, fy - 16, 10, 9, C('#3a4a48')); p.rect(x + 3, fy - 15, 3, 2, C('#7ac0b0')); p.rect(x + 2, fy - 4, 2, 4, pal.woodDark); p.rect(x + 14, fy - 4, 2, 4, pal.woodDark); return; }
  if (pl.year < 2005) { blk(p, x, fy - 9, 18, 9, pal.woodDark); blk(p, x + 2, fy - 22, 14, 13, C('#2a2a30')); p.rect(x + 3, fy - 21, 10, 9, C('#3a7ab8')); p.rect(x + 4, fy - 20, 3, 2, C('#9ad0f0')); return; }
  blk(p, x, fy - 8, 22, 8, C('#2a2a32')); blk(p, x - 2, fy - 24, 26, 14, C('#111116')); p.rect(x - 1, fy - 23, 24, 12, C('#2a3a7a')); p.rect(x + 2, fy - 21, 8, 3, C('#e85a8a'));
}
function recordPlayer(g: Ctx, x: number, fy: number): void {
  const { p, pl, pal } = g;
  pl.gramo = pl.gear === 'shellac' ? [x, fy - 27, 16, 27] : pl.gear === 'reel' ? [x, fy - 26, 14, 26] : [x, fy - 16, 18, 16];
  if (pl.gear === 'shellac') { // gramofone sobre mesinha
    p.rect(x + 1, fy - 9, 10, 2, pal.wood); p.rect(x + 2, fy - 7, 1, 7, pal.woodDark); p.rect(x + 9, fy - 7, 1, 7, pal.woodDark);
    blk(p, x + 1, fy - 13, 10, 4, pal.woodDark);
    p.poly([[x + 6, fy - 13], [x + 8, fy - 13], [x + 15, fy - 25], [x + 8, fy - 27]], C('#d8a840'));
    return;
  }
  if (pl.gear === 'reel') { // jukebox
    p.rect(x, fy - 24, 14, 24, pal.accent); p.ellipse(x + 7, fy - 22, 7, 4, pal.accent);
    p.rect(x + 2, fy - 20, 10, 6, C('#ffe0a0')); p.rect(x + 2, fy - 12, 10, 8, pal.woodDark);
    for (let i = 0; i < 4; i++) p.vline(x + 3 + i * 3, fy - 11, fy - 5, C('#ffcf6a'));
    return;
  }
  blk(p, x, fy - 10, 18, 10, pal.woodDark);
  for (let i = 0; i < 6; i++) p.vline(x + 2 + i * 2, fy - 8, fy - 2, [pal.accent, pal.accent2, pal.fabric][i % 3]);
  blk(p, x + 1, fy - 13, 16, 3, pl.gear === 'digital' ? C('#2a2a30') : C('#9a9aa2'));
  if (pl.gear !== 'digital') { p.ellipse(x + 7, fy - 14, 5, 1, INK); p.line(x + 13, fy - 14, x + 15, fy - 15, C('#d0d4dc')); }
  else { p.rect(x + 3, fy - 12, 8, 1, C('#7af0a0')); }
}

// ---------------------------------------------------------------- decoração de parede

function poster(g: Ctx, x: number, y: number, w: number, h: number, k: number): void {
  const { p, pl, pal } = g;
  if (pl.year < 1960) {
    blk(p, x, y, w, h, C('#efe2c2')); p.rect(x + 1, y + 1, w - 2, 3, k % 2 ? C('#b8322a') : C('#1a1a22'));
    p.disc(x + w / 2, y + h * 0.55, Math.min(w, h) * 0.22, k % 2 ? C('#1a1a22') : C('#b8322a'));
    p.rect(x + 2, y + h - 3, w - 4, 1, C('#1a1a22'));
  } else if (pl.year < 1990) {
    blk(p, x, y, w, h, k % 2 ? C('#e8902c') : C('#7a3a8a'));
    p.disc(x + w / 2, y + h * 0.45, Math.min(w, h) * 0.3, k % 2 ? C('#f8d050') : C('#ff6a4a'));
    for (let i = 0; i < 3; i++) p.hline(x + 1, x + w - 2, y + h - 3 - i * 2, i % 2 ? C('#c84f2a') : C('#f2d070'));
  } else if (pl.year < 2015) {
    blk(p, x, y, w, h, k % 2 ? C('#16161e') : C('#e8e4da'));
    p.rect(x + 2, y + 2, w - 4, Math.floor(h * 0.45), k % 2 ? pal.accent : C('#2a6ab0'));
    p.rect(x + 2, y + h - 5, w - 5, 1, k % 2 ? C('#f0f0f0') : C('#16161e')); p.rect(x + 2, y + h - 3, w - 8, 1, k % 2 ? C('#f0f0f0') : C('#16161e'));
  } else {
    blk(p, x, y, w, h, C('#f2ece4')); p.disc(x + w / 2, y + h / 2, Math.min(w, h) * 0.3, k % 2 ? C('#e86a5a') : C('#3a6a8a'));
  }
}
function goldDisc(g: Ctx, x: number, y: number, plat = false): void {
  const { p } = g;
  blk(p, x, y, 10, 12, C('#1e1a22'));
  p.disc(x + 5, y + 5, 3.5, plat ? C('#d8dce4') : C('#e8c45a')); p.put(x + 5, y + 5, INK);
  p.rect(x + 2, y + 9, 6, 1, C('#f0e8d0'));
}
function backWindow(g: Ctx, x: number, y: number, w: number, h: number, arched: boolean): void {
  const { p, pl } = g;
  const frame = pl.shell === 'loft' ? C('#2a2a30') : tint(g.pal.trim, -0.1);
  p.rect(x, y, w, h, frame);
  for (let yy = y + 1; yy < y + h - 1; yy++) for (let xx = x + 1; xx < x + w - 1; xx++) p.put(xx, yy, mix(C('#3a2d62'), C('#e07a5a'), (yy - y) / h));
  for (let xx = x + 1; xx < x + w - 1; xx += 3) { const hh = 2 + Math.floor(noise(xx, y, pl.seed) * (h * 0.5)); p.rect(xx, y + h - 1 - hh, 3, hh, C('#211d3c')); if (noise(xx, y, 9) < 0.5) p.put(xx + 1, y + h - hh, C('#ffd27a')); }
  p.vline(x + (w >> 1), y, y + h - 1, frame);
  p.hline(x, x + w - 1, y + (h >> 1), frame);
  if (arched) p.ellipse(x + w / 2, y + 1, w / 2, 3, frame);
}
function foam(g: Ctx, x: number, y: number, w: number, h: number): void {
  const { p, pl } = g;
  const a = pl.year < 1990 ? C('#6a5a4a') : C('#3a3a46'), b = tint(a, -0.2);
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) p.put(xx, yy, ((xx >> 2) + (yy >> 2)) % 2 ? a : b);
}
function corkBoard(g: Ctx, x: number, y: number, w: number, h: number): void {
  const { p, pal } = g;
  blk(p, x, y, w, h, pal.woodDark); p.rect(x + 1, y + 1, w - 2, h - 2, C('#b88a58'));
  for (let i = 0; i < 6; i++) { const xx = x + 2 + Math.floor(noise(i, x, 4) * (w - 6)), yy = y + 2 + Math.floor(noise(x, i, 5) * (h - 6)); p.rect(xx, yy, 4, 4, [pal.paper, C('#f0e070'), pal.accent2][i % 3]); p.put(xx + 1, yy, C('#d03030')); }
}
function sign(g: Ctx, x: number, y: number, text: string, maxW: number, lit = true): void {
  const { p, pl } = g;
  const t = fitText(text, maxW - 6);
  const w = textWidth(t) + 6;
  inked(p, (q) => blk(q, x - (w >> 1), y, w, 9, C('#2a2026'))); // R29: placa com contorno INK
  drawText(p, t, x - (w >> 1) + 3, y + 2, lit ? (pl.year < 1960 ? C('#ffe2a0') : pl.year < 1990 ? C('#ff9a4a') : C('#7af0ff')) : C('#c8c0b0'));
}

// ---------------------------------------------------------------- luz

function lamp(g: Ctx, cx: number, y: number, fy: number, reach: number): void {
  const { p, pl } = g;
  const glow = g.lamp;
  p.ellipse(cx + 0.5, y + 8, 9, 6, withAlpha(glow, 34)); // halo na parede
  const cone = (w0: number, a: number) => p.poly([[cx - w0, y + 3], [cx + w0, y + 3], [cx + reach, fy], [cx - reach, fy]], withAlpha(glow, a));
  switch (pl.light) {
    case 'bulb': p.vline(cx, y, y + 6, INK); p.disc(cx + 0.5, y + 8, 1.6, C('#fff2c0')); cone(1, 40); break;
    case 'pendant': p.vline(cx, y, y + 4, INK); p.poly([[cx - 4, y + 8], [cx + 5, y + 8], [cx + 2, y + 4], [cx - 1, y + 4]], C('#2e5a52')); p.hline(cx - 2, cx + 3, y + 9, C('#fff0b8')); cone(4, 34); break;
    case 'globe': p.vline(cx, y, y + 5, INK); p.disc(cx + 0.5, y + 8, 3.2, C('#f0a040')); p.disc(cx + 0.5, y + 8, 1.8, C('#ffe0a0')); cone(3, 36); break;
    case 'tube': p.rect(cx - 7, y, 15, 2, C('#d0d4dc')); p.rect(cx - 6, y + 2, 13, 1, C('#f4fbff')); cone(7, 26); break;
    case 'led': p.rect(cx - 8, y, 17, 1, C('#3a3a40')); for (let i = -6; i <= 6; i += 4) { p.put(cx + i, y + 1, C('#ffffff')); } cone(8, 24); break;
  }
}

// ---------------------------------------------------------------- uma sala

function wallFill(g: Ctx, c: Cell27): void {
  const { p, pl, pal } = g;
  const { x, y, w, h } = c;
  const brick = pl.shell === 'loft' || pal.wallKind === 'brick';
  const block = pl.shell === 'garage';
  const base = block ? mix(C('#8a8478'), pal.wall, 0.25) : pl.shell === 'loft' ? C('#9a5440') : pal.wall;
  const joint = lv(base, 1.4), lit = lv(base, 3.6);
  const wain = pal.wallKind === 'wainscot' || pal.wallKind === 'paper';
  const wy = Math.round(y + h * 0.62); // altura do lambri / régua
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    let col = base;
    if (brick || block) {
      // tijolo/bloco: junta escura (tom 1), fio de luz em cima de cada fiada (tom 4) — sem ruído por pixel
      const bh = block ? 6 : 3, bwid = block ? 12 : 7;
      const ry = (yy - y) % bh, row = Math.floor((yy - y) / bh), off = row % 2 ? bwid >> 1 : 0;
      if (ry === bh - 1 || (xx - x + off) % bwid === 0) col = joint;
      else if (ry === 0) col = lit;
      else if (noise(Math.floor((xx - x + off) / bwid), row, 11) < 0.18) col = lv(base, 2.6); // tijolo mais queimado (por peça)
    } else if (pal.wallKind === 'panel' && pl.year < 1990) {
      const k = (xx - x) % 6;
      col = k === 0 ? lv(base, 1.6) : k === 1 ? lv(base, 3.5) : base; // ripas com chanfro
    } else if (wain) {
      if (yy > wy) {
        const k = (xx - x) % 5;
        col = k === 0 ? lv(pal.wall2, 1.4) : k === 1 ? lv(pal.wall2, 3.6) : pal.wall2; // lambri com veio
      } else if (pal.wallKind === 'paper' && (xx - x) % 6 === 0 && (yy - y) % 4 < 2) col = lv(base, 2.6);
    }
    p.put(xx, yy, col);
  }
  if (wain) { // régua do lambri: latão em 1920, madeira nas outras
    const rule = pl.year < 1940 ? C('#c09048') : pal.trim;
    p.hline(x, x + w - 1, wy, lv(rule, 4)); p.hline(x, x + w - 1, wy + 1, lv(rule, 1.5));
  }
  // oclusão sob a sanca (degraus arroxeados, a luz cai de cima)
  for (let yy = 0; yy < 4; yy++) p.rect(x, y + yy, w, 1, withAlpha(OCC, 120 - yy * 30));
  // rodapé saliente e piso
  const fk = c.kind === 'studio' || c.kind === 'studioB' ? 'studio' : c.kind === 'lounge' ? 'lounge' : c.kind === 'lobby' ? 'hall' : pl.shell === 'garage' ? 'garage' : 'office';
  const fl = pal.floors[fk];
  p.rect(x, y + h - 7, w, 1, withAlpha(OCC, 60)); // sombra do rodapé na parede
  p.hline(x, x + w - 1, y + h - 6, lv(pal.trim, 4));
  p.hline(x, x + w - 1, y + h - 5, lv(pal.trim, 2));
  for (let yy = y + h - 4; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const r = yy - (y + h - 4);
    let col = fl.a;
    if (fl.kind === 'checker') col = ((xx >> 2) + (yy >> 1)) % 2 ? fl.b : fl.a;
    else if (fl.kind === 'parquet' || fl.kind === 'wood') { // tábuas: junta (tom 1) e fio de luz na borda de cima
      const k = (xx + (yy % 2) * 5) % 9;
      col = k === 0 ? lv(fl.a, 1.2) : (yy % 2 ? fl.b : fl.a);
      if (r === 0 && k !== 0) col = lv(fl.a, 4);
    } else if (fl.kind === 'tiles') col = (xx - x) % 6 === 0 || r === 2 ? lv(fl.a, 1.5) : r === 0 ? lv(fl.a, 4) : fl.a;
    else if (fl.kind === 'carpet' || fl.kind === 'shag') col = r === 0 ? lv(fl.a, 3.6) : (xx + yy) % 3 === 0 ? fl.b : fl.a; // trama miúda
    else col = (xx - x) % 16 === 0 ? lv(fl.a, 1.6) : r === 0 ? lv(fl.a, 3.6) : fl.a; // concreto/placas
    p.put(xx, yy, col);
  }
}

function furnish(g: Ctx, c: Cell27): void {
  const { p, pl, pal } = g;
  const { x, y, w, h } = c;
  const fy = y + h - 3;
  const big = pl.hq >= 2;
  const wy = y + 10; // altura de quadros na parede
  switch (c.kind) {
    case 'studio': {
      if (pl.year >= 1965 && pl.shell !== 'garage') foam(g, x + 3, y + 8, Math.min(30, w * 0.25), 22);
      if (big && pl.gear !== 'shellac') { // vidro da cabine: técnica à direita, sala de gravação à esquerda
        const gx = x + Math.floor(w * 0.42);
        p.rect(gx, y + 4, 3, h - 8, C('#2a2a30')); for (let yy = y + 8; yy < y + h - 20; yy++) p.put(gx + 1, yy, withAlpha(C('#bfe0e8'), 120));
        drums(g, x + 6, fy); micStand(g, x + Math.floor(w * 0.34), fy);
        consoleDesk(g, gx + 10, fy, Math.min(56, x + w - gx - 30));
        if (pl.gear === 'console') reelDeck(g, x + w - 20, fy, true);
        else if (pl.gear === 'reel') reelDeck(g, x + w - 19, fy);
        else if (pl.gear === 'digital') { blk(p, x + w - 14, fy - 26, 11, 26, C('#26262e')); for (let i = 0; i < 6; i++) { p.hline(x + w - 13, x + w - 5, fy - 24 + i * 4, C('#3a3a46')); p.put(x + w - 11, fy - 23 + i * 4, i % 2 ? C('#7af0a0') : C('#f0a040')); } }
        else plant(g, x + w - 8, fy, true);
      } else if (pl.gear === 'shellac') {
        lathe(g, x + w - 34, fy); micStand(g, x + 20, fy); piano(g, x + 30, fy);
      } else {
        // estúdio pequeno: mic, amp, guitarra, mesa compacta
        micStand(g, x + 14, fy); amp(g, x + 22, fy, true); guitar(g, x + 40, fy, pal.accent2);
        if (pl.shell === 'garage') { // tapete velho e caixas
          for (let xx = x + 8; xx < x + 60; xx++) p.put(xx, fy + 1, (xx >> 1) % 2 ? C('#8a2a2a') : C('#b8862a'));
          drums(g, x + w - 40, fy);
          if (pl.gear === 'reel' || pl.gear === 'console') reelDeck(g, x + 52, fy);
          else if (pl.gear === 'digital' || pl.gear === 'laptop') { blk(p, x + 52, fy - 9, 14, 9, C('#3a3028')); deskGear(g, x + 53, fy + 3); }
        } else {
          consoleDesk(g, x + w - 50, fy, 40);
          if (pl.gear === 'reel' || pl.gear === 'console') reelDeck(g, x + 52, fy);
        }
      }
      if (pl.year >= 2010) { p.rect(x + 2, y + 6, w - 4, 1, withAlpha(pal.accent, 200)); }
      break;
    }
    case 'lounge': {
      if (big) backWindow(g, x + w - 30, y + 10, 22, 26, pl.shell === 'loft');
      poster(g, x + 8, wy, 12, 16, 1); poster(g, x + 24, wy + 2, 10, 13, 2);
      const sofa = Math.min(46, w - 40);
      couch(g, x + 10, fy, sofa, pal.fabric);
      blk(p, x + 14, fy - 5, sofa - 10, 2, pal.wood); p.rect(x + 16, fy - 3, 1, 3, pal.woodDark); p.rect(x + sofa - 1, fy - 3, 1, 3, pal.woodDark);
      p.rect(x + 18, fy - 6, 5, 1, pal.accent2);
      recordPlayer(g, x + sofa + 14, fy);
      if (w > 100) tv(g, x + w - 26, fy);
      plant(g, x + w - 5, fy, big);
      break;
    }
    case 'office': {
      if (big) backWindow(g, x + w - 26, y + 10, 18, 24, pl.shell === 'loft');
      if (pl.shell === 'garage') { // bancada com ferramentas
        blk(p, x + 4, y + 12, w - 12, 18, C('#b89a6a'));
        for (let i = 0; i < 6; i++) { const xx = x + 7 + i * 7; p.vline(xx, y + 15, y + 22 + (i % 3) * 2, [C('#8a8a92'), C('#c83a2a'), C('#2a5aa0')][i % 3]); p.put(xx, y + 14, INK); }
        blk(p, x + 2, fy - 12, w - 6, 3, C('#7a5a3a')); p.rect(x + 3, fy - 9, 2, 9, C('#5a3a20')); p.rect(x + w - 7, fy - 9, 2, 9, C('#5a3a20'));
        deskGear(g, x + 6, fy);
        break;
      }
      if (pl.hq >= 2) { goldDisc(g, x + 6, wy); goldDisc(g, x + 18, wy, pl.hq >= 3); if (pl.hq >= 4) goldDisc(g, x + 30, wy); }
      else poster(g, x + 8, wy, 12, 15, 3);
      const dw = Math.min(40, w - 30);
      desk(g, x + 12, fy, dw); deskGear(g, x + 15, fy); chair(g, x + 12 + dw + 2, fy);
      if (pl.gear === 'shellac') blk(p, x + w - 14, fy - 14, 11, 14, C('#3a3a40')); else filing(g, x + w - 12, fy);
      if (pl.year < 1960) { p.disc(x + w - 9, y + 14, 3.5, C('#f2ece0')); p.put(x + w - 9, y + 13, INK); }
      if (w > 120) plant(g, x + dw + 30, fy, true);
      break;
    }
    case 'anr': {
      corkBoard(g, x + 8, wy, 26, 18);
      shelf(g, x + w - 30, y + 12, 24, h - 15, pl.gear === 'shellac' || pl.gear === 'reel' ? 'records' : pl.gear === 'console' ? 'tapes' : pl.gear === 'digital' ? 'cds' : 'drives');
      blk(p, x + 10, fy - 10, 40, 3, pal.wood); p.rect(x + 12, fy - 7, 2, 7, pal.woodDark); p.rect(x + 46, fy - 7, 2, 7, pal.woodDark);
      chair(g, x + 52, fy);
      if (pl.gear === 'laptop') deskGear(g, x + 18, fy + 2); else if (pl.gear === 'digital') { for (let i = 0; i < 4; i++) p.rect(x + 14 + i * 5, fy - 12, 4, 2, [pal.accent, C('#d0d4dc'), pal.accent2, C('#f0f0f0')][i]); }
      else for (let i = 0; i < 4; i++) p.rect(x + 14 + i * 6, fy - 11 - (i % 2), 5, 1 + (i % 2), pl.gear === 'console' ? C('#2a2a2e') : C('#1a1a1e'));
      if (pl.gear === 'console') for (let i = 0; i < 3; i++) p.rect(x + 18 + i * 6, fy - 12, 4, 2, [C('#e8e4da'), C('#c84f2a'), C('#2a2a2e')][i]);
      break;
    }
    case 'stage': {
      const riser = pl.hq >= 2;
      if (riser) { blk(p, x + 6, fy - 4, w - 30, 4, pal.woodDark); for (let xx = x + 8; xx < x + w - 26; xx += 8) p.put(xx, fy - 2, tint(pal.woodDark, 0.3)); }
      const sy = riser ? fy - 4 : fy;
      if (pl.year >= 1965) { p.rect(x + 4, y + 4, w - 8, 2, C('#2a2a30')); for (let i = 0; i < 3; i++) { const xx = x + 20 + i * Math.floor((w - 50) / 2); p.rect(xx, y + 6, 3, 4, C('#3a3a40')); p.poly([[xx, y + 10], [xx + 3, y + 10], [xx + 14, sy], [xx - 11, sy]], withAlpha([C('#ff6a8a'), C('#ffd27a'), C('#7ac8ff')][i], 24)); } }
      else poster(g, x + w - 26, wy, 16, 20, 4);
      if (pl.gear === 'shellac') { piano(g, x + 10, sy); for (let i = 0; i < 3; i++) { p.vline(x + 48 + i * 14, sy - 14, sy - 1, C('#2a2a30')); blk(p, x + 45 + i * 14, sy - 18, 7, 4, C('#2a2a30')); } }
      else { drums(g, x + Math.floor(w * 0.36), sy); amp(g, x + 10, sy, true); amp(g, x + w - 40, sy); micStand(g, x + Math.floor(w * 0.3), sy); }
      if (w > 120) { for (let xx = x + w - 22; xx < x + w - 4; xx++) p.put(xx, fy + 1, (xx >> 1) % 2 ? C('#8a2a2a') : C('#b8862a')); }
      break;
    }
    case 'lobby': {
      if (pl.shell === 'garage') { // porta de enrolar meio aberta, van e caixa de correio
        const dx = x + 4, dw = w - 6, dh = h - 8;
        p.rect(dx, y + 4, dw, dh, C('#2a2a34'));
        for (let yy = y + 4 + Math.floor(dh * 0.55); yy < y + 4 + dh; yy++) for (let xx = dx + 1; xx < dx + dw - 1; xx++) p.put(xx, yy, mix(C('#3a2d62'), C('#e07a5a'), (yy - y) / h));
        for (let yy = y + 5; yy < y + 4 + Math.floor(dh * 0.55); yy += 3) p.hline(dx + 1, dx + dw - 2, yy, C('#a8a8b0'));
        p.rect(dx, y + 4 + Math.floor(dh * 0.55), dw, 2, C('#6a6a72'));
        if (!pl.garageTaken) van(g, x - 18, fy); // R29: com o calhambeque na vaga, ele substitui a van (não cabem os dois)
        break;
      }
      sign(g, x + Math.floor(w * (w < 140 ? 0.55 : 0.68)), w < 140 ? y + 30 : y + 7, pl.brand, Math.floor(w * 0.8), true);
      const dw = Math.min(46, w - 50);
      blk(p, x + w - dw - 12, fy - 13, dw, 13, pl.year < 1990 ? pal.wood : C('#d8d4cc')); p.rect(x + w - dw - 12, fy - 14, dw, 1, pal.trim);
      couch(g, x + 8, fy, 26, pal.fabric2);
      plant(g, x + 40, fy, true);
      if (pl.shell === 'shop') { // escada para o andar de cima
        for (let i = 0; i < 8; i++) p.rect(x + w - 10 - i * 0, fy - 4 - i * 7, 8, 2, pal.woodDark);
      }
      // porta de entrada
      blk(p, x + 2, fy - 30, 2, 30, pal.trim);
      break;
    }
    // ---- enfeites
    case 'rehearsal': { // sala de ensaio: isolamento, tapete, bateria, amplificadores, setlist na parede
      if (pl.year >= 1965) foam(g, x + 3, y + 8, w - 6, 18); else for (let xx = x + 4; xx < x + w - 4; xx += 6) p.vline(xx, y + 8, y + 26, tint(pal.wall, -0.12));
      p.rect(x + 8, y + 30, 14, 18, pal.paper); for (let i = 0; i < 5; i++) p.hline(x + 10, x + 18 - (i % 3) * 2, y + 33 + i * 3, INK); // setlist
      for (let xx = x + 6; xx < x + w - 6; xx++) p.put(xx, fy + 1, (xx >> 1) % 3 ? C('#7a2a3a') : C('#b8862a'));
      if (pl.gear === 'shellac') { piano(g, x + 26, fy); micStand(g, x + 60, fy); for (let i = 0; i < 2; i++) { p.vline(x + 72 + i * 12, fy - 14, fy - 1, C('#2a2a30')); blk(p, x + 69 + i * 12, fy - 18, 7, 4, C('#2a2a30')); } }
      else { amp(g, x + 26, fy, true); drums(g, x + Math.floor(w * 0.45), fy); micStand(g, x + Math.floor(w * 0.36), fy); amp(g, x + w - 22, fy); guitar(g, x + w - 34, fy, pal.accent); }
      break;
    }
    case 'meeting': case 'press': {
      if (c.kind === 'press') { blk(p, x + 8, y + 8, w - 16, 26, C('#1e2238')); for (let yy = y + 11; yy < y + 32; yy += 7) for (let xx = x + 11 + ((yy >> 1) % 2) * 5; xx < x + w - 14; xx += 10) { p.disc(xx + 2, yy + 2, 2, C('#e8c45a')); p.put(xx + 2, yy + 2, C('#1e2238')); } }
      else { backWindow(g, x + w - 26, y + 10, 18, 22, false); p.rect(x + 8, y + 10, 22, 14, C('#f2f2ee')); p.line(x + 10, y + 20, x + 16, y + 14, C('#2a6ab0')); p.line(x + 16, y + 14, x + 26, y + 18, C('#c83a2a')); }
      blk(p, x + 14, fy - 9, w - 40, 3, pal.wood); p.rect(x + 16, fy - 6, 2, 6, pal.woodDark); p.rect(x + w - 30, fy - 6, 2, 6, pal.woodDark);
      for (let xx = x + 18; xx < x + w - 30; xx += 18) chair(g, xx, fy);
      if (c.kind === 'press') for (let xx = x + 20; xx < x + w - 30; xx += 9) { p.vline(xx, fy - 13, fy - 10, C('#2a2a2e')); p.rect(xx - 1, fy - 15, 2, 2, C('#2a2a2e')); }
      break;
    }
    case 'legal': shelf(g, x + 4, y + 10, w - 8, 22, 'books'); desk(g, x + 8, fy, w - 22); deskGear(g, x + 12, fy); break;
    case 'marketing': p.rect(x + 6, y + 10, w - 12, 16, C('#f2f2ee')); for (let i = 0; i < 5; i++) p.rect(x + 9 + i * 7, y + 22 - i * 2, 4, 2 + i * 2, [C('#2a6ab0'), pal.accent, C('#3a9a5a')][i % 3]); desk(g, x + 8, fy, w - 22); deskGear(g, x + 12, fy); break;
    case 'studioB': foam(g, x + 3, y + 8, 22, 22); consoleDesk(g, x + 34, fy, Math.min(56, w - 50)); micStand(g, x + 16, fy); break;
    case 'archive': for (let i = 0; i < Math.floor((w - 8) / 30); i++) shelf(g, x + 6 + i * 30, y + 8, 26, h - 11, pl.gear === 'digital' || pl.gear === 'laptop' ? 'drives' : 'tapes'); break;
    case 'garden': for (let i = 0; i < 6; i++) plant(g, x + 12 + i * Math.floor((w - 24) / 5), fy, true); p.rect(x + 4, y + 4, w - 8, 1, withAlpha(C('#7af0a0'), 180)); break;
    case 'neural': {
      if (pl.year < 2000) { foam(g, x + 3, y + 8, 22, 22); consoleDesk(g, x + 34, fy, Math.min(56, w - 50)); micStand(g, x + 16, fy); break; } // antes: um estúdio B
      // tela curva envolvente, anel de alto-falantes, poltrona no centro e óculos imersivos
      const cx = x + (w >> 1);
      for (let xx = x + 8; xx < x + w - 8; xx++) {
        const u = (xx - x - 8) / (w - 16), arc = Math.round(Math.sin(u * Math.PI) * 6);
        for (let yy = y + 8 + arc; yy < y + 38 - arc; yy++) p.put(xx, yy, mix(C('#2a2a7a'), C('#2ee8d8'), Math.abs(Math.sin(u * 6 + (yy - y) / 9))));
      }
      for (let r = 4; r < 14; r += 4) p.ring(cx, y + 23, r, withAlpha(C('#ffffff'), 150 - r * 8));
      for (let i = 0; i < 7; i++) { const sx = x + 10 + Math.round(((w - 20) * i) / 6); blk(p, sx - 2, y + 3, 4, 3, C('#2a2a32')); p.put(sx, y + 5, C('#2ee8d8')); }
      p.ellipse(cx, fy - 9, 7, 6, C('#e8e8ee')); p.rect(cx - 6, fy - 9, 13, 4, C('#d0d0d8')); p.rect(cx - 1, fy - 4, 3, 4, C('#9a9aa2')); p.hline(cx - 5, cx + 5, fy - 1, C('#9a9aa2')); // poltrona
      blk(p, x + w - 22, fy - 16, 14, 16, C('#2a2a32')); for (let i = 0; i < 3; i++) p.rect(x + w - 20 + i * 4, fy - 14, 3, 2, C('#e8e8ee')); // óculos no rack
      p.rect(x + 4, fy, w - 8, 1, withAlpha(C('#2ee8d8'), 160));
      break;
    }
  }
}

/** Detalhes extras de parede e chão (deixam as salas habitadas; o canto de cima à esquerda fica livre para o selo). */
function extras(g: Ctx, c: Cell27): void {
  const { p, pl, pal } = g;
  const { x, y, w, h } = c;
  const fy = y + h - 3;
  if (pl.shell === 'loft' || pl.shell === 'garage') { p.hline(x, x + w - 1, y + 2, C('#5a5a62')); p.hline(x, x + w - 1, y + 3, C('#3a3a42')); for (let xx = x + 10; xx < x + w; xx += 40) p.rect(xx, y + 1, 2, 4, C('#6a6a72')); }
  const rug = (x0: number, x1: number, a: Col, b: Col) => { for (let xx = x0; xx < x1; xx++) { p.put(xx, fy, (xx >> 1) % 3 ? a : b); p.put(xx, fy + 1, tint(a, -0.2)); } };
  switch (c.kind) {
    case 'lounge': {
      if (w > 96) shelf(g, x + Math.floor(w * 0.52), y + 9, 22, 16, pl.gear === 'digital' ? 'cds' : 'records');
      rug(x + 8, x + Math.min(w - 30, 64), pal.accent2, pal.gold);
      break;
    }
    case 'studio': {
      if (w > 120) { shelf(g, x + w - 30, y + 8, 22, 9, pl.gear === 'shellac' || pl.gear === 'reel' ? 'records' : pl.gear === 'console' ? 'tapes' : 'drives'); }
      rug(x + 4, x + Math.floor(w * 0.4), C('#7a2a2a'), C('#b8862a'));
      for (let xx = x + 12; xx < x + Math.floor(w * 0.5); xx += 3) p.put(xx, fy + 1, C('#1a1a1e')); // cabos
      break;
    }
    case 'office': {
      if (pl.shell !== 'garage') { p.disc(x + Math.floor(w * 0.6), y + 13, 3.5, C('#f2ece0')); p.ring(x + Math.floor(w * 0.6), y + 13, 3.5, C('#2a2a2e')); p.put(x + Math.floor(w * 0.6), y + 12, INK); }
      break;
    }
    case 'lobby': {
      if (pl.shell === 'garage') break;
      if (pl.hq >= 3) { goldDisc(g, x + w - 26, y + 22); goldDisc(g, x + w - 14, y + 22, true); }
      else poster(g, x + w - 22, y + 20, 12, 15, 5);
      rug(x + 6, x + 40, pal.fabric, pal.trim);
      break;
    }
    case 'stage': if (pl.year >= 1965) poster(g, x + w - 22, y + 16, 14, 18, 6); break;
    case 'anr': if (w > 110) poster(g, x + Math.floor(w * 0.5), y + 12, 12, 16, 7); break;
  }
}

function van(g: Ctx, x: number, fy: number): void {
  // R29 (arte consistente): a van da garagem no estilo da mobília — silhueta por linhas (sem formas "vetoriais"),
  // lataria em 3 tons (teto na luz, flanco, saia na sombra), vincos, vidros com reflexo diagonal, para-choque
  // cromado, caixa de roda escura, pneu em 2 tons e calota com brilho. A camada da mobília contorna em INK.
  const { p, pl, pal } = g;
  const era = pl.year < 1960 ? 0 : pl.year < 1990 ? 1 : 2;
  const body = era === 0 ? C('#5a7a6a') : era === 1 ? pal.accent : C('#d8d8dc');
  const top2 = era === 1 ? C('#f2ece0') : body; // kombi saia-e-blusa
  const L = 60, y0 = fy - 23, x0 = x + 2; // caixa: x0..x0+L-1, y0..fy-4
  // perfil (meia-largura do teto ao chão): quantos px a linha encolhe em cada lado, de cima para baixo
  const inset = (r: number): [number, number] => {
    if (era === 0) return [[7, 4, 3, 2, 1, 1][r] ?? 0, [9, 6, 4, 3, 2, 1, 1][r] ?? 0]; // furgão arredondado
    if (era === 1) return [r < 2 ? 2 - r : 0, r < 2 ? 2 - r : r < 4 ? 1 : 0]; // kombi: frente reta e redonda
    return [r < 1 ? 1 : 0, r < 8 ? 8 - r : 0]; // minivan: capô inclinado
  };
  const H = fy - 4 - y0;
  for (let r = 0; r < H; r++) {
    const [a, b] = inset(r);
    const yy = y0 + r;
    for (let xx = x0 + a; xx < x0 + L - b; xx++) {
      const upper = r < Math.floor(H * 0.48);
      const base = upper ? top2 : body;
      let c = base;
      if (r === 0 || xx === x0 + a) c = lv(base, 4); // teto e traseira na luz
      else if (r >= H - 3) c = lv(base, 1.7); // saia na sombra
      else if (!upper && r >= H - 6) c = lv(base, 2.4);
      if (xx >= x0 + L - b - 1 && r > 0) c = lv(c, 2); // borda da frente em meia-sombra
      if (r === Math.floor(H * 0.48)) c = lv(body, 4.4); // vinco/friso
      p.put(xx, yy, c);
    }
  }
  if (era === 1) for (let i = 0; i < 3; i++) p.put(x0 + L - 6 - i, y0 + Math.floor(H * 0.48) + 2 + i, lv(top2, 3)); // o "V" da kombi
  // janelas
  const wy = y0 + 3, wh = era === 0 ? 5 : 6;
  const wins = era === 2 ? [[x0 + 6, 12], [x0 + 21, 12], [x0 + 36, 10]] : [[x0 + 7, 10], [x0 + 20, 10], [x0 + 33, 10]];
  for (const [wx, ww] of wins) {
    p.rect(wx - 1, wy - 1, ww + 2, wh + 2, lv(body, 1.4));
    for (let yy = 0; yy < wh; yy++) p.hline(wx, wx + ww - 1, wy + yy, yy < 2 ? C('#4a5a7a') : C('#2a3048'));
    p.line(wx + 2, wy + wh - 1, wx + 2 + wh - 1, wy, C('#8ab0d0')); p.line(wx + 4, wy + wh - 1, wx + 4 + wh - 2, wy + 1, C('#5a7aa0')); // reflexo
  }
  // para-brisa (frente à direita, inclinado)
  const fx = x0 + L - (era === 2 ? 14 : 11);
  for (let yy = 0; yy < wh; yy++) p.hline(fx + (era === 2 ? yy : 0), fx + 7 + (era === 2 ? yy : 0), wy + yy, yy < 2 ? C('#5a6a8a') : C('#2a3048'));
  p.put(fx + 2, wy + 1, C('#c8e0f0'));
  // porta: vinco e maçaneta
  const dx = x0 + 31;
  p.vline(dx, wy + wh + 2, fy - 7, lv(body, 1.6)); p.vline(dx + 1, wy + wh + 2, fy - 7, lv(body, 3.8));
  p.hline(dx + 3, dx + 5, wy + wh + 4, lv(C('#c8ccd4'), 4));
  // para-choques cromados, farol e lanterna
  for (const bx of [x0 - 1, x0 + L - 3]) { p.rect(bx, fy - 8, 4, 3, C('#a8acb8')); p.hline(bx, bx + 3, fy - 8, lv(C('#a8acb8'), 5)); p.hline(bx, bx + 3, fy - 6, lv(C('#a8acb8'), 1.6)); }
  p.rect(x0 + L - 2, y0 + H - 11, 2, 3, C('#fff2c0')); p.put(x0 + L - 1, y0 + H - 11, C('#ffffff'));
  p.rect(x0, y0 + H - 11, 1, 3, C('#d03030'));
  // rodas: caixa escura, pneu em 2 tons, calota com brilho em cima à esquerda
  for (const wx of [x0 + 12, x0 + 46]) {
    p.disc(wx, fy - 3, 6, lv(body, 0.6));
    p.disc(wx, fy - 2, 4.6, C('#26242c')); p.ring(wx, fy - 2, 4.2, C('#3a3842'));
    p.disc(wx, fy - 2, 2.2, C('#a8acb8')); p.put(Math.floor(wx) - 1, fy - 4, C('#f4f4f8')); p.put(Math.floor(wx), fy - 2, C('#5a5e68'));
  }
  if (era === 0) for (let i = 0; i < 3; i++) p.put(x0 + 4 + i * 2, y0 + H - 6, lv(body, 4.4)); // frisos cromados
}

// ---------------------------------------------------------------- casca

function shell(g: Ctx): void {
  const { p, pl, pal } = g;
  const topY = pl.gy - FOUND - pl.floors * (FH27 + SLAB);
  const fc = pl.facade;
  const glass = fc === 'glass' || fc === 'contemporary' || fc === 'future';
  const masonry = fc === 'stone' || fc === 'deco';
  const outer = pl.shell === 'garage' ? C('#a8a094') : pl.shell === 'loft' ? C('#8a4632')
    : fc === 'glass' ? C('#3a4a6a') : fc === 'contemporary' ? C('#4a6278') : fc === 'future' ? C('#d8dee6')
    : fc === 'deco' ? C('#b09a78') : fc === 'stone' ? C('#a89a84') : pl.year < 1960 ? C('#a88a6a') : C('#8a7a6e');
  // torre e campus: a fachada continua acima do corte (cortada pelo topo da imagem), estreita para deixar o céu e os marcos à vista
  if (pl.crown) inkLayer(g, () => crown27(g, topY - SLAB - 6)); // R29: coroa com contorno INK
  const slab = glass ? (fc === 'future' ? C('#b8c2cc') : C('#4a5068')) : masonry ? tint(outer, -0.3) : C('#5a5458');
  p.rect(pl.bx, pl.gy - FOUND, pl.bw, FOUND, tint(outer, -0.35));
  for (let f = 0; f < pl.floors; f++) {
    const y0 = pl.gy - FOUND - (f + 1) * FH27 - f * SLAB;
    p.rect(pl.bx, y0 - SLAB, pl.bw, SLAB, slab);
    p.rect(pl.bx, y0 - SLAB, pl.bw, 1, tint(slab, 0.2));
    if (fc === 'deco') for (let xx = pl.bx + 3; xx < pl.bx + pl.bw - 3; xx += 6) p.put(xx, y0 - 3, tint(slab, 0.35)); // friso art déco
    if (pl.shell === 'loft' || pl.shell === 'building') for (let xx = pl.bx; xx < pl.bx + pl.bw; xx += 10) p.vline(xx, y0 - SLAB + 2, y0 - 2, C('#3a3438')); // vigas
    if (pl.shell === 'campus' && f > 0) for (let xx = pl.bx + 4; xx < pl.bx + pl.bw - 4; xx += 7) { p.put(xx, y0 - SLAB - 1, pal.plant); p.put(xx + 2, y0 - SLAB - 2, tint(pal.plant, 0.2)); } // floreiras nas lajes
  }
  // paredes externas
  for (const wx of [pl.bx, pl.bx + pl.bw - OW]) {
    for (let yy = topY - SLAB; yy < pl.gy - FOUND; yy++) for (let xx = wx; xx < wx + OW; xx++) {
      let c = outer;
      if (!glass && pl.shell !== 'garage') {
        if (masonry) { if (yy % 8 === 7 || (fc === 'deco' && (xx - wx) === 2)) c = tint(outer, -0.18); }
        else { const row = Math.floor(yy / 3), off = row % 2 ? 3 : 0; if (yy % 3 === 2 || (xx + off) % 6 === 0) c = tint(outer, -0.25); }
      }
      if (glass && (xx - wx) === OW - 2) c = fc === 'future' ? C('#2ee8d8') : C('#8aa0c8');
      if (xx === wx && wx === pl.bx) c = lv(c, 4); // R29: aresta da esquerda na luz, da direita em meia-sombra
      if (xx === wx + OW - 1 && wx !== pl.bx) c = lv(c, 2);
      p.put(xx, yy, c);
    }
  }
  // R29: contorno INK da silhueta do prédio (as paredes são opacas sobre a rua: o contorno vai à mão)
  p.vline(pl.bx - 1, topY - SLAB, pl.gy - 1, INK); p.vline(pl.bx + pl.bw, topY - SLAB, pl.gy - 1, INK);
  // paredes internas (andar fechado ou em obra: vão livre, sem divisórias)
  if (pl.shell !== 'garage') for (const c of pl.cells) if (c.x + c.w < pl.bx + pl.bw - OW - 1 && !pl.flock[c.floor]) p.rect(c.x + c.w, c.y, IWALL, c.h, tint(outer, -0.15)), p.rect(c.x + c.w + 1, c.y, 1, c.h, tint(outer, 0.08));
  // telhado
  if (pl.shell === 'garage') {
    const ry = topY - SLAB;
    // R29: telhado de telhas onduladas/fibrocimento em fiadas (fio de luz em cima de cada uma), cumeeira clara,
    // beiral em sombra, contorno INK
    const roofC = C('#5a4a48');
    inkLayer(g, () => {
      const q = g.p;
      for (let yy = ry - 16; yy <= ry + 1; yy++) {
        const t = (yy - (ry - 16)) / 17;
        const xa = Math.round(pl.bx + 30 - t * 36), xb = Math.round(pl.bx + pl.bw - 30 + t * 36);
        const r = (yy - (ry - 16)) % 3;
        for (let xx = xa; xx <= xb; xx++) {
          let c = r === 0 ? lv(roofC, 3.8) : r === 2 ? lv(roofC, 1.8) : roofC;
          if (r === 1 && (xx + Math.floor((yy - ry) / 3) * 3) % 6 === 0) c = lv(roofC, 2.3); // ondas
          if (xx <= xa + 1) c = lv(roofC, 4.2); else if (xx >= xb - 1) c = lv(roofC, 1.6);
          q.put(xx, yy, c);
        }
      }
      q.hline(pl.bx + 30, pl.bx + pl.bw - 30, ry - 16, lv(roofC, 4.6)); // cumeeira
      q.hline(pl.bx - 6, pl.bx + pl.bw + 6, ry + 1, lv(roofC, 1.2)); // beiral
    });
    sign(g, pl.bx + (pl.bw >> 1), ry - 12, pl.brand, 120, false);
    house(g);
  } else {
    const ry = topY - SLAB;
    // R29: platibanda com rufo claro em cima, sombra embaixo e contorno INK
    p.rect(pl.bx - 2, ry - 6, pl.bw + 4, 6, tint(outer, -0.1)); p.rect(pl.bx - 2, ry - 6, pl.bw + 4, 1, tint(outer, 0.2)); p.hline(pl.bx - 2, pl.bx + pl.bw + 1, ry - 1, lv(tint(outer, -0.1), 1.4));
    p.hline(pl.bx - 3, pl.bx + pl.bw + 2, ry - 7, INK); p.vline(pl.bx - 3, ry - 6, ry - 1, INK); p.vline(pl.bx + pl.bw + 2, ry - 6, ry - 1, INK);
    if (pl.shell === 'loft' || (pl.shell === 'building' && pl.year < 1990)) { // caixa-d'água
      const wx = pl.bx + pl.bw - 46;
      const wood = C('#6a4a32');
      inkLayer(g, () => { // R29: aduelas com luz à esquerda, aros de ferro, tampa cônica em 2 águas, pés
        const q = g.p;
        for (let yy = ry - 30; yy < ry - 14; yy++) for (let xx = wx; xx < wx + 16; xx++) q.put(xx, yy, (xx - wx) % 3 === 0 ? lv(wood, 1.8) : xx - wx < 5 ? lv(wood, 3.6) : xx - wx > 12 ? lv(wood, 2.2) : wood);
        for (const yy of [ry - 27, ry - 21, ry - 16]) q.hline(wx, wx + 15, yy, lv(C('#5a5a62'), 3));
        q.poly([[wx - 1, ry - 30], [wx + 8, ry - 30], [wx + 8, ry - 38]], lv(C('#4a3222'), 3.4)); q.poly([[wx + 8, ry - 30], [wx + 17, ry - 30], [wx + 8, ry - 38]], lv(C('#4a3222'), 2));
        q.vline(wx + 2, ry - 14, ry - 7, lv(C('#3a3a42'), 3)); q.vline(wx + 13, ry - 14, ry - 7, lv(C('#3a3a42'), 2)); q.line(wx + 2, ry - 8, wx + 13, ry - 13, C('#3a3a42'));
      });
    }
    if (!pl.crown) {
      // letreiro no telhado
      const sx = pl.bx + Math.floor(pl.bw * 0.32);
      p.vline(sx - 20, ry - 18, ry - 6, INK); p.vline(sx + 20, ry - 18, ry - 6, INK);
      sign(g, sx, ry - 22, pl.brand, 90, true);
      if (pl.year >= 1960) { p.vline(pl.bx + 12, ry - 26, ry - 6, C('#5a5a62')); p.put(pl.bx + 12, ry - 27, C('#ff5a4a')); }
    } else {
      sign(g, pl.bx + (pl.bw >> 1), ry - 16, pl.brand, Math.min(120, (pl.crown?.[1] ?? 999) - (pl.crown?.[0] ?? 0) - 8), true);
    }
    if (pl.shell === 'loft' || pl.shell === 'building') { // escada de incêndio
      const fx = pl.bx - 16;
      for (let f = 0; f < pl.floors; f++) {
        const y0 = pl.gy - FOUND - (f + 1) * FH27 - f * SLAB;
        inkLayer(g, () => { // R29: ferro em 2 tons (fio de luz em cima), grade com balaústres, escada com degraus
          const q = g.p, iron = C('#4a4a56');
          q.rect(fx, y0 + FH27 - 1, 16, 2, lv(iron, 2)); q.hline(fx, fx + 15, y0 + FH27 - 1, lv(iron, 3.8));
          q.hline(fx, fx + 15, y0 + FH27 - 8, lv(iron, 3.4)); for (let xx = fx; xx < fx + 16; xx += 3) q.vline(xx, y0 + FH27 - 8, y0 + FH27 - 2, lv(iron, 2.4));
          if (f > 0) { q.line(fx + 2, y0 + FH27 + SLAB + FH27 - 2, fx + 14, y0 + FH27, lv(iron, 3)); for (let i = 2; i < 13; i += 3) q.hline(fx + i, fx + i + 1, y0 + FH27 + SLAB + FH27 - 2 - Math.round(((i - 2) * (SLAB + FH27 - 2)) / 12), lv(iron, 4)); }
        });
      }
    }
  }
  void pal;
}

/** Coroa da torre/campus acima do corte, conforme a época: pedra com recuos (até 1929), art déco com recuos e
 *  agulha (1930–1967), cortina de vidro modernista (1968–1994), vidro contemporâneo com contraventamento (1995+),
 *  campus futurista com faixas de luz (2015+). */
function crown27(g: Ctx, base: number): void {
  const { p, pl } = g;
  const [cx0, cx1] = pl.crown!;
  const cw = cx1 - cx0, mid = (cx0 + cx1) >> 1;
  const fc = pl.facade;
  const lit = C('#ffd27a');
  if (fc === 'stone' || fc === 'deco') {
    const stone = fc === 'deco' ? C('#b09a78') : C('#a89a84');
    // recuos: três blocos cada vez mais estreitos
    const tiers: [number, number, number][] = fc === 'deco'
      ? [[cw, base, Math.round(base * 0.45)], [Math.round(cw * 0.7), Math.round(base * 0.45), Math.round(base * 0.18)], [Math.round(cw * 0.4), Math.round(base * 0.18), 6]]
      : [[cw, base, Math.round(base * 0.4)], [Math.round(cw * 0.66), Math.round(base * 0.4), 0]];
    for (const [w, y1, y0] of tiers) {
      const x0 = mid - (w >> 1);
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x0 + w; xx++) {
        const lx = xx - x0, ly = yy - y0;
        let c = mix(stone, C('#5a4a5a'), 0.35 + 0.3 * (1 - yy / Math.max(1, base)));
        if (lx === 0 || lx === w - 1) c = tint(c, -0.25);
        else if (fc === 'deco' && lx % 8 === 0) c = tint(c, 0.12); // pilastras
        else if (lx % 8 >= 3 && lx % 8 <= 5 && ly % 7 >= 2 && ly % 7 <= 5) c = noise(xx >> 3, Math.floor(yy / 7), pl.seed) < 0.3 ? lit : C('#2a2438'); // janelas
        p.put(xx, yy, c);
      }
      p.hline(x0 - 1, x0 + w, y1 - 1, tint(stone, -0.3)); p.hline(x0 - 1, x0 + w, y0, tint(stone, 0.2));
    }
    if (fc === 'deco') { // agulha e coroa em leque
      p.poly([[mid - 6, 6], [mid + 6, 6], [mid, -12]], tint(stone, 0.15));
      for (let i = -2; i <= 2; i++) p.line(mid, 10, mid + i * 6, 2, tint(stone, 0.3));
      p.vline(mid, 0, 6, C('#d8c8a0'));
    }
    return;
  }
  for (let yy = 0; yy < base; yy++) for (let xx = cx0; xx < cx1; xx++) {
    const lx = xx - cx0;
    let c: Col;
    if (fc === 'glass') { // cortina de vidro modernista: grade escura, janelas acesas
      const mull = lx % 8 === 0 || yy % 10 === 0;
      c = mull ? C('#26304a') : noise(xx >> 3, Math.floor(yy / 10), pl.seed) < 0.16 ? C('#d8b870') : mix(C('#2e3c64'), C('#7a5a8a'), yy / Math.max(1, base));
    } else { // contemporâneo/futurista: vidro claro, faixas horizontais, contraventamento em X
      const band = yy % 12 === 0;
      const brace = Math.abs(((lx + yy) % 48) - 24) === 0 || Math.abs(((lx - yy + 4800) % 48) - 24) === 0;
      c = band ? (fc === 'future' ? C('#e8eef4') : C('#2a3a4a')) : brace ? C('#1e2a38') : noise(xx >> 2, Math.floor(yy / 12), pl.seed) < 0.12 ? C('#e8f0ff')
        : mix(fc === 'future' ? C('#4aa8c8') : C('#3a6a8a'), C('#c0789a'), (yy / Math.max(1, base)) * 0.7);
    }
    if (lx === 0 || lx === cw - 1) c = tint(c, -0.3);
    p.put(xx, yy, c);
  }
  if (fc === 'contemporary' || fc === 'future') { // topo chanfrado (um canto cortado)
    for (let i = 0; i < 18; i++) for (let xx = cx1 - 18 + i; xx < cx1; xx++) p.put(xx, i, 0); // R29: recorta (transparente) — o céu aparece e o contorno segue o chanfro
    p.line(cx1 - 18, 0, cx1 - 1, 17, C('#8ab0d0'));
  }
  if (fc === 'future') for (let i = 0; i < 3; i++) p.rect(cx0 - 4, 14 + i * 16, cw + 8, 2, withAlpha(C('#2ee8d8'), 170));
  if (fc === 'glass') { p.rect(cx0 + 4, 0, cw - 8, 2, C('#1a2034')); }
}

/** R29 (arte consistente): desenha numa camada própria e contorna a silhueta com INK (como a mobília). */
function inkLayer(g: Ctx, draw: () => void): void {
  const p0 = g.p;
  inked(p0, (q) => { g.p = q; try { draw(); } finally { g.p = p0; } });
}

/** Casa da família ao lado da garagem — R29: contorno INK, telhado de telhas com água clara à esquerda e escura à
 *  direita, revestimento da época (tábuas até 1959, tijolo à vista 1960–89, siding de vinil depois), janelas com
 *  moldura, peitoril, cortinas e luz acesa (vazando na parede), porta almofadada com luz de varanda, chaminé/antena. */
function house(g: Ctx): void {
  const { pl, pal } = g;
  const x = pl.bx - 80, w = 74, top = pl.gy - 58, gy = pl.gy;
  const era = pl.year < 1960 ? 0 : pl.year < 1990 ? 1 : 2;
  const wall = era === 0 ? C('#d8c8a8') : era === 1 ? C('#b8704a') : C('#b8c0c8');
  const trim = era === 0 ? C('#f2ecdc') : era === 1 ? C('#5a3a2a') : C('#f4f4f0');
  const roofC = era === 2 ? C('#4a4a58') : C('#7a3a30');
  const glow = C('#ffd27a');
  const midX = x + (w >> 1);
  inkLayer(g, () => {
    const p = g.p;
    // fachada: revestimento com fio de luz em cima de cada fiada; lado direito e base em meia-sombra
    for (let yy = top; yy < gy; yy++) for (let xx = x; xx < x + w; xx++) {
      const ry = yy - top, rx = xx - x;
      let c = wall;
      if (era === 1) { // tijolo
        const row = Math.floor(ry / 3), off = row % 2 ? 3 : 0;
        if (ry % 3 === 2 || (rx + off) % 6 === 0) c = lv(wall, 1.5);
        else if (ry % 3 === 0) c = lv(wall, 3.6);
        else if (noise(Math.floor((rx + off) / 6), row, 31) < 0.2) c = lv(wall, 2.5);
      } else { // tábuas / siding
        const k = ry % (era === 0 ? 4 : 3);
        c = k === 0 ? lv(wall, 3.7) : k === (era === 0 ? 3 : 2) ? lv(wall, 1.8) : wall;
      }
      if (rx >= w - 3) c = lv(c, 2.3);
      p.put(xx, yy, c);
    }
    for (let yy = 0; yy < 3; yy++) p.rect(x, top + yy, w, 1, withAlpha(OCC, 130 - yy * 40)); // sombra do beiral
    p.rect(x, gy - 4, w, 4, lv(C('#8a8478'), 2)); p.hline(x, x + w - 1, gy - 4, lv(C('#8a8478'), 3.6)); // soco de pedra
    for (let xx = x + 5; xx < x + w; xx += 9) p.put(xx, gy - 2, lv(C('#8a8478'), 1));
    // chaminé (antes de 1990) atrás do telhado, na água direita
    if (era < 2) {
      const cx = x + w - 20;
      p.rect(cx, top - 24, 7, 18, C('#8a4a36'));
      for (let yy = top - 24; yy < top - 6; yy++) if ((yy - top) % 3 === 0) p.hline(cx, cx + 6, yy, lv(C('#8a4a36'), 1.5));
      p.vline(cx, top - 24, top - 7, lv(C('#8a4a36'), 3.8));
      p.rect(cx - 1, top - 26, 9, 2, lv(C('#6a6a72'), 3));
    }
    // telhado: telhas em fiadas; água esquerda na luz, direita na sombra; testeira clara
    const peak = top - 22;
    for (let yy = peak; yy <= top; yy++) {
      const t = (yy - peak) / 22;
      const xa = Math.round(midX - t * (w / 2 + 6)), xb = Math.round(midX + t * (w / 2 + 6));
      for (let xx = xa; xx <= xb; xx++) {
        const left = xx < midX;
        const row = Math.floor((yy - peak) / 3);
        let c = left ? lv(roofC, 3.4) : lv(roofC, 2.2);
        if ((yy - peak) % 3 === 2) c = lv(roofC, left ? 2 : 1.2); // sombra da fiada
        else if (era < 2 && (xx + (row % 2) * 2) % 4 === 0) c = lv(roofC, left ? 2.6 : 1.6); // junta da telha
        if (xx === xa || xx === xa + 1) c = lv(trim, 4); // testeira
        if (xx === xb || xx === xb - 1) c = lv(trim, 2);
        p.put(xx, yy, c);
      }
    }
    p.hline(x - 6, x + w + 5, top + 1, lv(trim, 2)); // beiral
    p.vline(midX, peak, peak + 1, lv(roofC, 4));
    if (era === 2) { p.hline(x - 5, x + w + 4, top + 2, C('#d8dce0')); p.vline(x + w + 4, top + 2, gy - 5, C('#c8ccd2')); } // calha e condutor
    if (era === 1) { p.vline(x + 16, peak - 4, top - 10, C('#3a3a42')); p.hline(x + 11, x + 21, peak - 4, C('#3a3a42')); p.hline(x + 13, x + 19, peak - 1, C('#3a3a42')); } // antena de TV
    if (era === 2) { // antena parabólica na parede, perto do beiral
      const sx = x + w - 11, sy = top + 4;
      p.ellipse(sx + 3, sy + 3, 3, 3, lv(C('#d8dce0'), 3)); p.vline(sx + 1, sy + 1, sy + 5, lv(C('#d8dce0'), 4.4)); p.put(sx + 5, sy + 3, lv(C('#d8dce0'), 1.8));
      p.line(sx + 3, sy + 3, sx + 7, sy + 1, C('#5a5a62')); p.hline(sx + 4, sx + 7, sy + 6, C('#5a5a62'));
    }
    // janelas: moldura, vidro aceso em degradê, cortinas, cruz, peitoril
    for (const wx of [x + 7, x + 52]) {
      const wy = top + 12;
      p.rect(wx - 1, wy - 1, 18, 16, lv(trim, 3)); p.hline(wx - 1, wx + 16, wy - 1, lv(trim, 4)); p.vline(wx + 16, wy, wy + 14, lv(trim, 2));
      for (let yy = 0; yy < 14; yy++) p.hline(wx, wx + 15, wy + yy, yy < 5 ? C('#fff0c0') : yy < 10 ? C('#ffd889') : C('#f0b860'));
      p.rect(wx, wy, 3, 14, lv(pal.fabric, 3)); p.vline(wx + 2, wy, wy + 13, lv(pal.fabric, 2)); // cortinas
      p.rect(wx + 13, wy, 3, 14, lv(pal.fabric, 2.4));
      p.vline(wx + 8, wy, wy + 13, lv(trim, 2.5)); p.hline(wx, wx + 15, wy + 6, lv(trim, 2.5));
      p.put(wx + 5, wy + 1, C('#ffffff')); p.put(wx + 6, wy + 2, C('#ffffff')); // reflexo
      p.rect(wx - 2, wy + 15, 20, 2, lv(trim, 3.6)); p.hline(wx - 2, wx + 17, wy + 16, lv(trim, 1.6)); // peitoril
      if (era < 2) { p.rect(wx - 5, wy - 1, 3, 16, lv(roofC, 2.8)); p.rect(wx + 17, wy - 1, 3, 16, lv(roofC, 2.2)); for (let yy = wy + 1; yy < wy + 15; yy += 2) { p.put(wx - 4, yy, lv(roofC, 1.6)); p.put(wx + 18, yy, lv(roofC, 1.4)); } } // venezianas
    }
    // porta almofadada com bandeira, maçaneta de latão, degrau
    const dx = x + 31, dh = 21;
    p.rect(dx - 2, gy - dh - 2, 16, dh + 2, lv(trim, 3)); p.hline(dx - 2, dx + 13, gy - dh - 2, lv(trim, 4));
    p.rect(dx, gy - dh, 12, dh, pal.woodDark);
    p.vline(dx, gy - dh, gy - 1, lv(pal.woodDark, 3.8)); p.vline(dx + 11, gy - dh, gy - 1, lv(pal.woodDark, 1.6));
    for (const [py, ph] of [[gy - dh + 3, 6], [gy - dh + 12, 6]] as const) { p.rect(dx + 2, py, 8, ph, lv(pal.woodDark, 2.4)); p.hline(dx + 2, dx + 9, py + ph - 1, lv(pal.woodDark, 3.8)); }
    if (era === 2) p.rect(dx + 3, gy - dh + 3, 6, 5, C('#ffd889'));
    p.put(dx + 9, gy - 10, pal.gold); p.put(dx + 9, gy - 11, lv(pal.gold, 5));
    p.rect(dx - 3, gy - 2, 18, 2, lv(C('#8a8478'), 3.4)); p.hline(dx - 3, dx + 14, gy - 1, lv(C('#8a8478'), 2));
    p.rect(dx + 4, gy - dh - 6, 4, 3, C('#2a2a32')); p.hline(dx + 5, dx + 6, gy - dh - 4, C('#fff2c0')); // luz da varanda
    // caixa de correio
    const mx = x - 7;
    p.vline(mx + 2, gy - 9, gy - 1, lv(pal.woodDark, 2.6));
    p.rect(mx, gy - 13, 6, 4, era === 0 ? C('#3a5a3a') : era === 1 ? C('#2a4a8a') : C('#5a5a62')); p.hline(mx, mx + 5, gy - 13, C('#c8ccd4'));
    p.put(mx + 6, gy - 13, C('#d03030'));
    plant(g, x + 4, gy, true);
  });
  // luz das janelas e da varanda na parede e na calçada (depois do contorno, em cima)
  const { p } = g;
  for (const wx of [x + 7, x + 52]) { p.ellipse(wx + 8, top + 19, 13, 11, withAlpha(glow, 22)); for (let xx = wx - 2; xx < wx + 18; xx++) if ((xx & 1) === 0) p.set(xx, top + 31, withAlpha(glow, 60)); }
  p.ellipse(x + 37, gy - 24, 6, 4, withAlpha(C('#fff2c0'), 40));
}

// ---------------------------------------------------------------- API

/** Pinta a sede inteira num buffer (puro, determinístico). */
export function paint27(pl: Plan27): Px {
  const p = new Px(pl.W, pl.H);
  const pal = paletteOf(pl.year);
  const lampC = pl.light === 'tube' ? C('#e8f4ff') : pl.light === 'led' ? mix(C('#ffffff'), pal.accent, 0.25) : pl.light === 'globe' ? C('#ffc070') : C('#ffd889');
  const g: Ctx = { p, pal, pl, r: rng27(pl.seed), lamp: lampC };
  sky(g);
  skyline(g);
  neighbours(g);
  street(g);
  for (const c of pl.cells) if (!c.lock) wallFill(g, c);
  // mobília numa camada própria: contorno INK de 1 px na silhueta (o fundo é opaco, o contorno do Px só vê o vazio)
  const q = new Px(pl.W, pl.H);
  g.p = q;
  for (const c of pl.cells) if (!c.lock) { extras(g, c); furnish(g, c); }
  const lounge = pl.cells.find((c) => c.kind === 'lounge');
  if (lounge && pl.vip) vip27(g, lounge, pl.vip);
  q.outline(INK);
  g.p = p;
  p.blit(q, 0, 0);
  // r27 I1: salas e andares ainda não comprados (escuros, no osso) ou em obra (andaime)
  const fspan = (f: number) => { const cs = pl.cells.filter((c) => c.floor === f); return { x: cs[0].x, y: cs[0].y, w: cs[cs.length - 1].x + cs[cs.length - 1].w - cs[0].x, h: FH27 }; };
  for (const [f, st] of Object.entries(pl.flock)) bare27(g, fspan(Number(f)), st, true);
  for (const c of pl.cells) if (c.lock && !pl.flock[c.floor]) bare27(g, c, c.lock, false);
  shell(g);
  // luzes: uma por sala (a garagem tem uma só lâmpada no meio); sala fechada fica apagada, obra tem lâmpada de serviço
  if (pl.shell === 'garage') { const c0 = pl.cells[0]; lamp(g, pl.bx + (pl.bw >> 1) - 20, c0.y, c0.y + c0.h - 3, 60); }
  else for (const c of pl.cells) { if (c.lock) continue; const n = c.w > 160 ? 2 : 1; for (let i = 0; i < n; i++) lamp(g, c.x + Math.round((c.w * (i + 1)) / (n + 1)), c.y, c.y + c.h - 3, Math.min(30, c.w / (2 * n))); }
  // oclusão nos cantos das salas (sombra arroxeada em degraus)
  for (const c of pl.cells) if (!pl.flock[c.floor]) for (let i = 0; i < 3; i++) { p.rect(c.x + i, c.y, 1, c.h, withAlpha(OCC, 90 - i * 28)); p.rect(c.x + c.w - 1 - i, c.y, 1, c.h, withAlpha(OCC, 80 - i * 25)); }
  return p;
}

/** Sala ou andar no osso: concreto, fiação solta, volumes sob lona. Fechado = escuro; em obra = andaime, fita e lâmpada de serviço. */
function bare27(g: Ctx, c: { x: number; y: number; w: number; h: number }, st: Lock27, floor: boolean): void {
  const { p, pl } = g;
  const { x, y, w, h } = c;
  const fy = y + h - 3;
  const con = C('#76727c');
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    let col = con;
    if ((yy - y) % 16 === 15 || (xx - x) % 24 === 0) col = tint(con, -0.12); // fôrmas do concreto
    else if (noise(xx, yy, 21) < 0.06) col = tint(con, noise(xx, yy, 4) < 0.5 ? 0.07 : -0.08);
    p.put(xx, yy, col);
  }
  p.rect(x, y + h - 4, w, 4, C('#5a5660')); p.hline(x, x + w - 1, y + h - 4, C('#8a8690'));
  if (floor) for (let xx = x + 70; xx < x + w - 30; xx += 96) { blk(p, xx, y, 8, h - 4, C('#8a8690')); p.vline(xx + 2, y, y + h - 5, C('#9a96a0')); } // pilares
  // fios pendurados e volumes cobertos
  for (let xx = x + 30; xx < x + w - 10; xx += 64) { p.vline(xx, y, y + 8, INK); p.put(xx, y + 9, C('#c8c0a0')); }
  const lumps = Math.max(1, Math.floor(w / 90));
  for (let i = 0; i < lumps; i++) {
    const lx = x + 14 + Math.floor((i + 0.4) * (w / lumps)) - 10;
    p.ellipse(lx + 9, fy - 5, 10, 6, C('#c8c4bc')); p.rect(lx - 1, fy - 5, 21, 5, C('#c8c4bc')); p.hline(lx, lx + 18, fy - 8, C('#e0dcd4'));
    blk(p, lx + 22, fy - 9, 9, 9, C('#a8845a')); blk(p, lx + 24, fy - 16, 7, 7, C('#b8946a'));
  }
  if (st === 'building') {
    const pole = C('#c8a040'), plank = C('#8a6a3a');
    for (let xx = x + 8; xx < x + w - 4; xx += 26) p.vline(xx, y + 3, fy, pole);
    for (const yy of [y + Math.floor(h * 0.42), fy - 14]) { p.rect(x + 6, yy, w - 12, 2, plank); p.hline(x + 6, x + w - 7, yy + 2, tint(plank, -0.3)); }
    for (let xx = x + 8; xx + 26 < x + w - 4; xx += 52) p.line(xx, fy - 14, xx + 26, y + Math.floor(h * 0.42), tint(pole, -0.2));
    for (let xx = x + 2; xx < x + w - 2; xx++) p.put(xx, fy - 1, ((xx - x) >> 2) % 2 ? C('#f0c020') : C('#1a1a1a')); // fita zebrada
    const lx = x + w - 30; // escada, balde, carrinho
    for (let i = 0; i < 6; i++) p.hline(lx, lx + 6, fy - 4 - i * 5, C('#a8a8b0')); p.vline(lx, fy - 30, fy, C('#a8a8b0')); p.vline(lx + 6, fy - 30, fy, C('#a8a8b0'));
    blk(p, x + 20, fy - 7, 7, 7, C('#d8d8dc')); p.rect(x + 21, fy - 8, 5, 1, C('#e86a3a'));
    p.disc(x + w - 46, fy - 3, 3, INK); p.poly([[x + w - 56, fy - 10], [x + w - 40, fy - 10], [x + w - 44, fy - 4], [x + w - 54, fy - 4]], C('#5a7aa0'));
    // lâmpada de serviço com grade
    const bx = x + (w >> 1);
    p.vline(bx, y, y + 10, INK); p.disc(bx + 0.5, y + 12, 2.2, C('#fff4c0')); p.ring(bx, y + 12, 3, C('#3a3a40'));
    p.poly([[bx - 2, y + 14], [bx + 3, y + 14], [bx + 28, fy], [bx - 27, fy]], withAlpha(C('#ffe8a0'), 30));
  } else {
    p.rect(x, y, w, h, withAlpha(C('#06060e'), pl.year < 1960 ? 170 : 160)); // apagada
    for (let xx = x + 6; xx < x + w - 6; xx += 3) p.put(xx, y + 2, withAlpha(C('#000000'), 120));
  }
}

/** Reforma do lounge: discos de ouro, lustre/globo de espelhos, tapete vermelho e neon; em obra, cones e fita. */
function vip27(g: Ctx, c: Cell27, st: boolean | Lock27): void {
  const { p, pl, pal } = g;
  const { x, y, w, h } = c;
  const fy = y + h - 3;
  if (st === 'building') {
    for (const cx of [x + w - 40, x + w - 22]) p.poly([[cx - 3, fy], [cx + 3, fy], [cx, fy - 9]], C('#f07a2a'));
    for (let xx = x + w - 44; xx < x + w - 16; xx++) p.put(xx, fy - 6, ((xx >> 2) % 2) ? C('#f0c020') : C('#1a1a1a'));
    return;
  }
  if (st !== true) return;
  goldDisc(g, x + 6, y + 9); goldDisc(g, x + 18, y + 9, true);
  const cx = x + Math.floor(w * 0.42);
  if (pl.year < 1972) { // lustre
    p.vline(cx, y, y + 4, INK); p.hline(cx - 6, cx + 6, y + 6, pal.gold); for (const d of [-6, -3, 0, 3, 6]) { p.vline(cx + d, y + 4, y + 6, pal.gold); p.put(cx + d, y + 3, C('#fff2c0')); }
  } else { // globo de espelhos
    p.vline(cx, y, y + 3, INK); p.disc(cx + 0.5, y + 7, 3.6, C('#c8ccd8'));
    for (let i = 0; i < 6; i++) p.put(cx - 2 + (i % 3) * 2, y + 5 + Math.floor(i / 3) * 3, C('#ffffff'));
    for (let i = 0; i < 5; i++) p.put(x + 10 + Math.floor(noise(i, x, 7) * (w - 20)), y + 12 + Math.floor(noise(x, i, 8) * 30), withAlpha(C('#fff0d0'), 170));
  }
  if (pl.year >= 1980) p.rect(x + 3, y + 5, w - 6, 1, withAlpha(C('#ff4fa3'), 210)); // neon
  for (let xx = x + 6; xx < x + Math.min(w - 26, 70); xx++) { p.put(xx, fy, C('#a8202a')); p.put(xx, fy + 1, C('#7a1a20')); }
}

export interface Drawn27 { plan: Plan27; spots: Spot27[]; more: More27[] }
/** Objeto extra desenhado por cima (ovos da sede, `hqPropEggs27`): `slot` 'garage' = vaga da garagem. */
export interface PropIn27 { slot: string; w: number; h: number; draw: (c: CanvasRenderingContext2D, x: number, y: number, t: number) => void }
/** Canto de cada vaga: 'garage' = dentro da porta de enrolar (casca garagem) ou estacionado na rua, junto ao meio-fio, à esquerda da fachada. */
export function slotXY27(pl: Plan27, slot: string, w: number, hh: number): [number, number] | null {
  if (slot !== 'garage') return null;
  const lob = pl.shell === 'garage' ? pl.cells.find((c) => c.kind === 'lobby') : undefined;
  if (lob) return [lob.x + Math.max(6, (lob.w - w) >> 1), lob.y + lob.h - 3 - hh];
  // outras cascas: estacionado na rua, junto ao meio-fio, no lado esquerdo da fachada
  return [Math.max(2, pl.bx + 14), pl.gy + STREET - 1 - hh];
}
export interface DrawOpts27 { /** objetos extras (ovos) */ props?: PropIn27[]; /** largura mínima em pixels lógicos (preenche o contêiner) */ minW?: number; /** aparência real (padrão: pelo id) */ look?: (x: Sprite25) => ReturnType<typeof lookOf>; role?: (x: Sprite25) => string | null | undefined }

/** Desenha a sede em corte no canvas (tamanho lógico; quem chama escala por inteiro com CSS). Exportado para o
 *  "Nosso mundo" (D2) abrir o interior no zoom. */
export function drawHqCutaway27(canvas: HTMLCanvasElement, model: Pick<HqModel25, 'hq' | 'year' | 'rooms'> & { city?: string; brand?: string; seedKey?: string; facadeYear?: number; units?: { id: string; status: 'open' | Lock27 }[] }, o: DrawOpts27 = {}): Drawn27 {
  const units = model.units ? Object.fromEntries(model.units.map((u) => [u.id, u.status])) : undefined;
  const plan = plan27({ hq: model.hq, year: model.year, facadeYear: model.facadeYear, city: model.city, brand: model.brand, seedKey: model.seedKey, minW: o.minW, units });
  if (plan.shell === 'garage' && (o.props ?? []).some((pr) => pr.slot === 'garage')) plan.garageTaken = true;
  const px = paint27(plan);
  canvas.width = plan.W; canvas.height = plan.H;
  const ctx = canvas.getContext('2d');
  const { spots, more } = place27(plan, model.rooms.filter((r) => plan.rooms.includes(r.id)));
  if (ctx) {
    const img = ctx.createImageData(plan.W, plan.H);
    new Uint32Array(img.data.buffer).set(px.d);
    ctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    for (const s of spots) {
      const look = o.look ? o.look(s.sprite) : lookOf({ id: s.sprite.personId ?? s.sprite.id });
      const role = (o.role?.(s.sprite) ?? null) as Parameters<typeof avatarSprite>[1]['role'];
      const sp = avatarSprite(look, { year: plan.year, role, pose: s.pose, dir: s.dir });
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.fillRect(s.x - 6, s.y, 12, 1);
      ctx.drawImage(sp.c, s.x - sp.ax, s.y - sp.ay + 1);
    }
    for (const pr of o.props ?? []) { const at = slotXY27(plan, pr.slot, pr.w, pr.h); if (at) pr.draw(ctx, at[0], at[1], 0); }
  }
  return { plan, spots, more };
}

// ---------------------------------------------------------------- r27 (CITY2): primitivas para os interiores da cidade
/** Contexto de pintura (Px + paleta + planta) — os interiores dos lugares do bairro (ui/pixel/interior27.ts) montam
 *  uma planta de um andar só e reaproveitam a mesma mobília, luz e rua da sede. */
export type Ctx27 = Ctx;
export const prim27 = {
  blk, sky, street, neighbours, wallFill, lamp, sign, amp, micStand, guitar, drums, door, piano, lathe, reelDeck, monitorSpk, consoleDesk, couch, shelf, desk, deskGear,
  chair, filing, plant, tv, recordPlayer, poster, goldDisc, backWindow, foam, corkBoard, rng27, INK,
};
