// Rodada 27 (CITY2) — INTERIORES dos lugares da cidade em pixel art, no mesmo corte lateral da sede (hqpx27):
// casa de shows com palco e plateia, loja de discos com caixotes e balcão, rádio com cabine "no ar", estúdio
// com técnica e sala de gravação, bar com balcão e palquinho, redação, sala de ensaio, escritório, prédio,
// hotel e loja de instrumentos — cada um com mobília da época e as pessoas reais que estão lá.
//   interior27(k, ano, n)     — PURO: o que tem dentro (adereços e lugares das pessoas, em frações da sala);
//   drawInterior27(canvas, …) — DOM: pinta com as primitivas da sede (prim27) e desenha os bonecos (avatarSprite).

import type { PlaceK27, Person27 } from '../../sim/sys/place27';
import { avatarSprite, lookOf, type Pose } from './avatar';
import { paletteOf } from './palette';
import { C, INK, Px, inked, lv, mix, noise, tint, withAlpha, type Col } from './px';
import { bars31, crowd31, speaker31 } from './stage31px';
import { eraOf } from './palette';
import { gearOf27, lightOf27, prim27, type Ctx27, type Plan27 } from '../ps/hqpx27';

// ---------------------------------------------------------------- modelo (puro)

export type Media27 = 'sheets' | 'shellac' | 'lp' | 'cds' | 'vinyl';
export type PropT27 = 'stage' | 'crowd' | 'counter' | 'bottles' | 'bins' | 'racks' | 'listen' | 'booth' | 'console' | 'glass' | 'drums' | 'amp' | 'mic' | 'piano' | 'guitar'
  | 'typewriters' | 'screens' | 'presses' | 'cork' | 'filing' | 'tables' | 'jukebox' | 'foam' | 'couch' | 'tv' | 'plant' | 'window' | 'keys' | 'guitars' | 'poster' | 'gold' | 'reel' | 'onair' | 'desk'
  // r31 (I/S): interiores do submundo e da delegacia
  | 'cells' | 'crates' | 'safe' | 'roulette' | 'speakers' | 'door';
export interface Prop27 { t: PropT27; x: number; w?: number; media?: Media27; n?: number }
export type Zone27 = 'stage' | 'floor' | 'booth' | 'live' | 'counter' | 'desk';
export interface ISpot27 { x: number; z: Zone27; pose: Pose; dir: 'SE' | 'SW' }
/** r31 (S): salas que não são lugares do mapa (fundos da fachada, baile) */
export type IKind27 = PlaceK27 | 'backroom' | 'baile';
export interface Interior27 { k: IKind27; year: number; props: Prop27[]; spots: ISpot27[]; floor: 'studio' | 'lounge' | 'lobby' | 'office'; dim: boolean; /** r31: fachada (restaurante, boate…) */ v?: string; /** r31 (AMOR): onde fica o seu personagem (padrão: na porta) */ youAt?: ISpot27 }

export const INTERIOR_KINDS27: PlaceK27[] = ['venue', 'records', 'radio', 'studio', 'bar', 'press', 'rehearsal', 'label', 'office', 'apartments', 'hotel', 'instruments'];

const mediaOf = (y: number): Media27 => (y < 1920 ? 'sheets' : y < 1950 ? 'shellac' : y < 1985 ? 'lp' : y < 2008 ? 'cds' : 'vinyl');
const sp = (x: number, z: Zone27, pose: Pose = 'stand', dir: 'SE' | 'SW' = 'SE'): ISpot27 => ({ x, z, pose, dir });

/** O que há dentro de cada tipo de lugar, por época (frações da largura da sala). */
export function interior27(k: IKind27, year: number, n = 4, v?: string): Interior27 {
  const props: Prop27[] = [];
  let spots: ISpot27[] = [];
  let floor: Interior27['floor'] = 'lobby', dim = false;
  const P = (t: PropT27, x: number, w?: number, extra: Partial<Prop27> = {}) => props.push({ t, x, w, ...extra });
  switch (k) {
    case 'venue':
      dim = true; floor = 'lounge';
      P('poster', 0.04, 0.06); P('counter', 0.02, 0.22); P('bottles', 0.03, 0.2); P('stage', 0.42, 0.56); P('amp', 0.48); P('drums', 0.68); P('mic', 0.6); P('crowd', 0.4, 0.58, { n: 11 });
      spots = [sp(0.55, 'stage', 'play'), sp(0.78, 'stage', 'play', 'SW'), sp(0.88, 'stage', 'play', 'SW'), sp(0.12, 'counter'), sp(0.3, 'floor', 'stand', 'SW'), sp(0.2, 'floor')];
      break;
    case 'bar':
      dim = true; floor = 'lounge';
      P('counter', 0.03, 0.34); P('bottles', 0.04, 0.32); P('tables', 0.42, 0.3, { n: 2 }); P('stage', 0.76, 0.22); P('mic', 0.84);
      if (year >= 1940) P('jukebox', 0.69); P('poster', 0.5, 0.05);
      spots = [sp(0.84, 'stage', 'play', 'SW'), sp(0.92, 'stage', 'play', 'SW'), sp(0.14, 'counter'), sp(0.47, 'floor', 'sit'), sp(0.6, 'floor', 'sit', 'SW'), sp(0.3, 'floor')];
      break;
    case 'records':
      floor = 'lobby';
      P('racks', 0.03, 0.3, { media: mediaOf(year) }); P('bins', 0.36, 0.36, { media: mediaOf(year), n: 3 }); P('counter', 0.76, 0.21); P('listen', 0.8);
      P('poster', 0.4, 0.06); P('poster', 0.55, 0.06);
      spots = [sp(0.86, 'counter', 'stand', 'SW'), sp(0.45, 'floor'), sp(0.62, 'floor', 'stand', 'SW'), sp(0.2, 'floor'), sp(0.3, 'floor', 'stand', 'SW')];
      break;
    case 'radio':
      floor = 'studio';
      P('racks', 0.03, 0.2, { media: year < 1950 ? 'shellac' : year < 1985 ? 'lp' : 'cds' }); P('console', 0.26, 0.3); P('reel', 0.27); P('glass', 0.6, 0.02); P('booth', 0.62, 0.35); P('mic', 0.76); P('onair', 0.74);
      spots = [sp(0.72, 'booth', 'sit', 'SW'), sp(0.84, 'booth', 'sit', 'SW'), sp(0.38, 'desk', 'sit'), sp(0.5, 'floor', 'stand', 'SW'), sp(0.15, 'floor')];
      break;
    case 'studio':
      floor = 'studio';
      P('console', 0.04, 0.34); P('reel', 0.04); P('glass', 0.42, 0.03); P('foam', 0.46, 0.52); P('drums', 0.7); P('amp', 0.52); P('mic', 0.62); P('piano', 0.86);
      spots = [sp(0.58, 'live', 'play'), sp(0.78, 'live', 'play', 'SW'), sp(0.66, 'live', 'play', 'SW'), sp(0.18, 'desk', 'sit'), sp(0.32, 'floor', 'stand', 'SW')];
      break;
    case 'press':
      floor = 'office';
      P('window', 0.08, 0.2); P('poster', 0.4, 0.06); P(year < 1990 ? 'typewriters' : 'screens', 0.06, 0.6, { n: 3 }); P('cork', 0.7, 0.14); P('filing', 0.88);
      if (year < 1960) P('presses', 0.7, 0.16);
      spots = [sp(0.12, 'desk', 'sit'), sp(0.32, 'desk', 'sit'), sp(0.52, 'desk', 'sit'), sp(0.78, 'floor', 'stand', 'SW'), sp(0.66, 'floor')];
      break;
    case 'rehearsal':
      floor = 'studio'; dim = true;
      P('foam', 0.04, 0.92); P('drums', 0.46); P('amp', 0.24); P('amp', 0.74); P('mic', 0.6); P('couch', 0.04, 0.16);
      spots = [sp(0.34, 'live', 'play'), sp(0.58, 'live', 'play', 'SW'), sp(0.82, 'live', 'play', 'SW'), sp(0.12, 'floor', 'sit')];
      break;
    case 'label':
      floor = 'office';
      P('gold', 0.06, 0.2, { n: 3 }); P('desk', 0.08, 0.2); P('desk', 0.36, 0.2); P('poster', 0.62, 0.07); P('couch', 0.66, 0.2); P('filing', 0.9);
      spots = [sp(0.16, 'desk', 'sit'), sp(0.44, 'desk', 'sit'), sp(0.74, 'floor', 'sit', 'SW'), sp(0.56, 'floor')];
      break;
    case 'office':
      floor = 'office';
      P('window', 0.1, 0.2); P('desk', 0.06, 0.22); P('desk', 0.4, 0.22); P('filing', 0.72); P('filing', 0.78); P('plant', 0.9);
      spots = [sp(0.14, 'desk', 'sit'), sp(0.48, 'desk', 'sit'), sp(0.66, 'floor', 'stand', 'SW'), sp(0.3, 'floor')];
      break;
    case 'apartments':
      floor = 'lounge';
      P('window', 0.1, 0.18); P('couch', 0.06, 0.26); if (year >= 1950) P('tv', 0.4); P('listen', 0.56); P('plant', 0.68); P('window', 0.74, 0.16); P('guitar', 0.9);
      spots = [sp(0.16, 'floor', 'sit'), sp(0.26, 'floor', 'sit', 'SW'), sp(0.82, 'floor', 'play', 'SW'), sp(0.6, 'floor')];
      break;
    case 'hotel':
      floor = 'lobby';
      P('counter', 0.06, 0.26); P('keys', 0.08, 0.2); P('couch', 0.46, 0.24); P('plant', 0.42); P('plant', 0.74); P('poster', 0.82, 0.07);
      spots = [sp(0.18, 'counter'), sp(0.54, 'floor', 'sit'), sp(0.64, 'floor', 'sit', 'SW'), sp(0.86, 'floor', 'stand', 'SW')];
      break;
    case 'instruments':
      floor = 'lobby';
      P('guitars', 0.04, 0.36, { n: 5 }); P('piano', 0.44); P('drums', 0.58); P('amp', 0.68); P('counter', 0.78, 0.18);
      spots = [sp(0.86, 'counter', 'stand', 'SW'), sp(0.3, 'floor', 'play'), sp(0.5, 'floor'), sp(0.66, 'floor', 'stand', 'SW')];
      break;
    // r31 (S): fachada da facção (restaurante, boate, galpão, cassino, barracão, escritório) — a porta dos fundos leva à sala
    case 'facade':
      dim = v !== 'office' && v !== 'restaurant'; floor = v === 'warehouse' ? 'studio' : v === 'office' ? 'office' : 'lounge';
      if (v === 'warehouse') { P('crates', 0.04, 0.5, { n: 4 }); P('crates', 0.58, 0.22, { n: 2 }); }
      else if (v === 'casino') { P('roulette', 0.08, 0.26); P('tables', 0.38, 0.3, { n: 2 }); P('bottles', 0.72, 0.16); P('counter', 0.7, 0.18); }
      else if (v === 'office') { P('window', 0.1, 0.2); P('desk', 0.08, 0.22); P('filing', 0.4); P('plant', 0.5); P('couch', 0.56, 0.2); }
      else if (v === 'club' || v === 'barracao') { P('counter', 0.03, 0.24); P('bottles', 0.04, 0.22); P('speakers', 0.36, 0.06); P('stage', 0.42, 0.3); P('speakers', 0.66, 0.06); }
      else { P('counter', 0.03, 0.22); P('bottles', 0.04, 0.2); P('tables', 0.3, 0.46, { n: 3 }); P('poster', 0.32, 0.05); }
      P('door', 0.86, 0.08);
      spots = [sp(0.14, 'counter'), sp(0.5, 'floor', 'sit'), sp(0.62, 'floor', 'stand', 'SW'), sp(0.78, 'floor', 'stand', 'SW'), sp(0.36, 'floor')];
      break;
    case 'backroom':
      floor = 'office'; dim = true;
      P('safe', 0.05); P('poster', 0.2, 0.05); P('desk', 0.36, 0.3); P('bottles', 0.74, 0.14); P('couch', 0.72, 0.18); P('door', 0.92, 0.06);
      spots = [sp(0.5, 'desk', 'sit', 'SW'), sp(0.68, 'floor', 'stand', 'SW'), sp(0.32, 'floor', 'stand'), sp(0.82, 'floor', 'stand', 'SW'), sp(0.2, 'floor')];
      break;
    case 'baile':
      dim = true; floor = 'lounge';
      P('speakers', 0.04, 0.06); P('stage', 0.12, 0.5); P('mic', 0.3); P('speakers', 0.58, 0.06); P('counter', 0.74, 0.22); P('crowd', 0.1, 0.56, { n: 12 });
      spots = [sp(0.26, 'stage', 'play'), sp(0.36, 'stage', 'play'), sp(0.46, 'stage', 'play', 'SW'), sp(0.82, 'counter', 'stand', 'SW'), sp(0.72, 'floor', 'stand', 'SW'), sp(0.9, 'floor')];
      break;
    case 'police':
      floor = 'office';
      P('window', 0.06, 0.12); P('desk', 0.04, 0.2); P('filing', 0.28); P('cork', 0.34, 0.12); P('cells', 0.52, 0.46, { n: 3 });
      spots = [sp(0.12, 'desk', 'sit'), sp(0.3, 'floor', 'stand', 'SW'), sp(0.58, 'booth', 'stand'), sp(0.74, 'booth', 'stand', 'SW'), sp(0.9, 'booth', 'sit', 'SW'), sp(0.44, 'floor')];
      break;
    case 'market':
      floor = 'studio'; dim = true;
      P('crates', 0.04, 0.3, { n: 3 }); P('bins', 0.38, 0.26, { media: mediaOf(year), n: 2 }); P('guitars', 0.68, 0.24, { n: 3 }); P('door', 0.94, 0.05);
      spots = [sp(0.56, 'counter', 'stand', 'SW'), sp(0.22, 'floor'), sp(0.84, 'floor', 'stand', 'SW'), sp(0.66, 'floor')];
      break;
  }
  // pelo menos 4 lugares (n pessoas): completa com plateia/visita espalhada
  let i = 0;
  while (spots.length < Math.max(4, Math.min(n, 8))) { spots.push(sp(0.15 + ((i * 0.23) % 0.7), 'floor', 'stand', i % 2 ? 'SW' : 'SE')); i++; }
  return { k, year, props, spots, floor, dim };
}

// ---------------------------------------------------------------- pessoas e geometria (puro: a cena e os pontos clicáveis usam o mesmo cálculo)

/** Onde cada pessoa fica: você na porta; artistas no palco/sala de gravação/cabine; equipe no balcão/mesa; o resto no salão. */
export function placePeople27(m: Interior27, people: Person27[]): [Person27, ISpot27][] {
  const you = people.filter((x) => x.you), cell = people.filter((x) => x.cell && !x.you), perf = people.filter((x) => !!x.actId && !x.you && !x.staff && !x.cell), rest = people.filter((x) => (!x.actId || x.staff) && !x.you && !x.cell);
  const free = [...m.spots];
  let extra = 0;
  // sem lugar livre na zona certa: um lugar a mais no salão (a equipe nunca sobe ao palco nem entra na cela)
  const more = (): ISpot27 => sp(0.16 + ((extra++ * 0.17) % 0.6), 'floor', 'stand', extra % 2 ? 'SW' : 'SE');
  const take = (zs: Zone27[], any = true): ISpot27 | undefined => { for (const z of zs) { const i = free.findIndex((s0) => s0.z === z); if (i >= 0) return free.splice(i, 1)[0]; } return any ? free.shift() : more(); };
  const placed: [Person27, ISpot27][] = [];
  for (const x of you) placed.push([x, m.youAt ?? sp(m.k === 'police' || m.k === 'backroom' ? 0.24 : 0.06, 'floor', 'stand', 'SE')]);
  for (const x of cell) placed.push([x, take(['booth'], false) ?? more()]);
  for (const x of perf) { const s0 = take(['stage', 'live', 'booth', 'floor']); if (s0) placed.push([x, s0]); }
  const restZ: Zone27[] = m.k === 'police' ? ['desk', 'counter', 'floor'] : ['counter', 'desk', 'booth', 'floor'];
  for (const x of rest) placed.push([x, take(restZ, false) ?? more()]);
  return placed.sort((a, b) => a[1].x - b[1].x);
}
export const liftOf27 = (m: Interior27, s0: ISpot27): number => (s0.z === 'stage' ? (m.k === 'bar' || m.k === 'baile' ? 5 : 9) : 0);
/** Geometria do corte (pixels lógicos) para largura W: sala, chão e a caixa de um adereço. */
export function geom27(W: number): { W: number; H: number; x0: number; w0: number; y0: number; fy: number; X: (f: number) => number; Wd: (f?: number) => number } {
  const H = 150, gy = H - STREET, bx = 12, bw = W - 24, y0 = gy - FOUND - RH, x0 = bx + OW, w0 = bw - 2 * OW;
  return { W, H, x0, w0, y0, fy: y0 + RH - 3, X: (f) => Math.round(x0 + f * w0), Wd: (f = 0.1) => Math.max(6, Math.round(f * w0)) };
}

// ---------------------------------------------------------------- pintura

const RH = 92, STREET = 16, FOUND = 4, OW = 6;
/** Oclusão nos cantos: o tom mais fundo da rampa, puxado para o roxo (igual à sede). */
const OCC = C('#2a1634');
export interface IDrawn27 { W: number; H: number; hits: { x: number; y: number; w: number; h: number; who: Person27 }[] }
export interface IDrawOpts27 { minW?: number; city?: string; name?: string; seed?: string; look?: (p: Person27) => ReturnType<typeof lookOf>; role?: (p: Person27) => string | null | undefined;
  /** r31 (ART2): adereços extras pintados na mesma camada (mesmo contorno), antes das pessoas */ extra?: (g: Ctx27, seed: number) => void }

const hs = (str: string): number => { let x = 2166136261; for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619) >>> 0; return x; };
const FLOORK: Record<Interior27['floor'], 'studio' | 'lounge' | 'lobby' | 'office'> = { studio: 'studio', lounge: 'lounge', lobby: 'lobby', office: 'office' };

/** Fachada da época (moldura do corte). */
function facadeCol(year: number, k: IKind27): Col {
  if (k === 'apartments' && year < 1930) return C('#8a5a44');
  return year < 1920 ? C('#874430') : year < 1946 ? C('#dccaa0') : year < 1968 ? C('#e0dccf') : year < 1990 ? C('#9a968e') : year < 2020 ? C('#8a9aa8') : C('#e8e6dc');
}

/** Põe um buffer Px (com transparência) por cima do que já está no canvas. */
function pxOnCtx(ctx: CanvasRenderingContext2D, q: Px): void {
  if (typeof document === 'undefined') return;
  const cv = document.createElement('canvas');
  cv.width = q.w; cv.height = q.h;
  const c2 = cv.getContext('2d');
  if (!c2) return;
  const img = c2.createImageData(q.w, q.h);
  new Uint32Array(img.data.buffer).set(q.d);
  c2.putImageData(img, 0, 0);
  ctx.drawImage(cv, 0, 0);
}

export function drawInterior27(canvas: HTMLCanvasElement, m: Interior27, people: Person27[], o: IDrawOpts27 = {}): IDrawn27 {
  const W = Math.max(300, Math.floor(o.minW ?? 0)), H = 150;
  const gy = H - STREET, bx = 12, bw = W - 24, y0 = gy - FOUND - RH, x0 = bx + OW, w0 = bw - 2 * OW, top = y0 - 14;
  const year = m.year;
  const seed = hs(`${o.seed ?? ''}|${m.k}|${o.city ?? ''}`);
  const cell = { kind: (m.floor === 'office' ? 'office' : m.floor === 'studio' ? 'studio' : m.floor === 'lounge' ? 'lounge' : 'lobby') as Plan27['cells'][number]['kind'], floor: 0, x: x0, y: y0, w: w0, h: RH };
  const shell: Plan27['shell'] = m.k === 'rehearsal' ? 'garage' : 'shop';
  const pl = { hq: 1, year, shell, gear: gearOf27(year), light: m.dim ? (year < 1960 ? 'bulb' : lightOf27('shop', year)) : lightOf27('shop', year), era: eraOf(year), facade: 'block',
    W, H, gy, bx, bw, top, floors: 1, cells: [cell], rooms: [], city: o.city ?? '', lms: [], brand: '', seed, flock: {}, vip: null, crown: null } as unknown as Plan27;
  let p = new Px(W, H);
  const pal = paletteOf(year);
  const g: Ctx27 = { p, pal, pl, r: prim27.rng27(seed), lamp: pl.light === 'tube' ? C('#e8f4ff') : pl.light === 'led' ? mix(C('#ffffff'), pal.accent, 0.25) : pl.light === 'globe' ? C('#ffc070') : C('#ffd889') };
  prim27.sky(g); prim27.neighbours(g); prim27.street(g);
  prim27.wallFill(g, cell as Plan27['cells'][number]);
  void FLOORK;
  const fy = y0 + RH - 3;
  const X = (f: number) => Math.round(x0 + f * w0);
  const Wd = (f = 0.1) => Math.max(6, Math.round(f * w0));
  const { blk } = prim27;
  const k0 = m.k;
  let crowd: Prop27 | undefined;
  // adereços numa camada própria, contornada com INK no fim (mesmo acabamento da sede e do pacote de equipamentos)
  const back = p, layer = new Px(W, H);
  p = layer; g.p = layer;
  for (const pr of m.props) {
    const x = X(pr.x), w = Wd(pr.w);
    switch (pr.t) {
      case 'stage': {
        const sh = k0 === 'bar' ? 5 : 9;
        // fundo do palco: cortina de veludo (antes de 1968) ou parede preta com refletores
        const curtain = year < 1968 ? C('#8a1c24') : C('#18161e');
        p.rect(x, y0 + 4, w, fy - sh - y0 - 4, curtain);
        if (year < 1968) for (let xx = x; xx < x + w; xx++) { const k = (xx - x) % 4; if (k !== 1) p.vline(xx, y0 + 4, fy - sh - 1, lv(curtain, k === 0 ? 1.2 : k === 2 ? 4 : 2.4)); } // pregas: sombra, luz, meia-sombra
        else for (let i = 0; i < 4; i++) { const cx = x + Math.round((w * (i + 0.5)) / 4); p.rect(cx - 1, y0 + 5, 3, 2, C('#3a3a40')); p.poly([[cx, y0 + 7], [cx - 6, fy - sh], [cx + 6, fy - sh]], withAlpha(i % 2 ? C('#ff60c0') : C('#60d0ff'), 26)); }
        blk(p, x, fy - sh, w, sh, pal.woodDark);
        p.hline(x, x + w - 1, fy - sh, tint(pal.wood, 0.3));
        break;
      }
      case 'crowd': crowd = pr; break; // a plateia vai NA FRENTE dos bonecos (pintada no fim)
      case 'counter': {
        blk(p, x, fy - 14, w, 14, pal.wood);
        p.rect(x - 1, fy - 15, w + 2, 2, tint(pal.wood, 0.3));
        if (k0 === 'records' || k0 === 'instruments') { blk(p, x + w - 12, fy - 21, 9, 6, year < 1980 ? C('#9a8a6a') : C('#2a2a30')); p.rect(x + w - 10, fy - 20, 5, 2, C('#7ad070')); }
        if (k0 === 'hotel') p.rect(x + 4, fy - 17, 3, 2, C('#e8c050'));
        break;
      }
      case 'bottles': {
        for (let r = 0; r < 2; r++) {
          const yy = y0 + 18 + r * 14;
          p.rect(x, yy + 8, w, 2, pal.woodDark);
          for (let xx = x + 1; xx < x + w - 3; xx += 4) { const c = [C('#3a7a3a'), C('#8a5a20'), C('#c8c0a0'), C('#5a2a2a'), C('#2a4a6a')][(xx + r + seed) % 5]; p.rect(xx, yy + 3, 3, 5, c); p.rect(xx + 1, yy, 1, 3, tint(c, 0.15)); p.put(xx, yy + 4, withAlpha(C('#ffffff'), 90)); }
        }
        p.rect(x, y0 + 12, w, 1, withAlpha(C('#ffe0a0'), 38)); // luz da prateleira (fraca: não ganha contorno)
        break;
      }
      case 'racks': prim27.shelf(g, x, y0 + 12, w, fy - y0 - 14, pr.media === 'cds' ? 'cds' : pr.media === 'sheets' ? 'books' : 'records'); break;
      case 'bins': {
        const n = pr.n ?? 3, bwid = Math.floor((w - (n - 1) * 3) / n);
        for (let i = 0; i < n; i++) {
          const bx0 = x + i * (bwid + 3);
          blk(p, bx0, fy - 11, bwid, 11, pal.wood);
          p.rect(bx0 + 2, fy - 4, bwid - 4, 1, tint(pal.wood, -0.3));
          // o que está dentro do caixote
          const tall = pr.media === 'cds' ? 4 : pr.media === 'sheets' ? 6 : 7;
          for (let xx = bx0 + 1; xx < bx0 + bwid - 1; xx += pr.media === 'cds' ? 2 : 1) {
            const c = pr.media === 'sheets' ? (xx % 3 ? C('#f0e8d0') : C('#d8c8a0')) : pr.media === 'shellac' ? (xx % 2 ? C('#7a5a3a') : C('#2a2020'))
              : [pal.accent, pal.accent2, pal.fabric, C('#1e1e24'), pal.gold, C('#e8e0d0')][Math.floor(noise(xx, i, seed) * 6)];
            p.rect(xx, fy - 11 - tall + (xx % 2), 1, tall - (xx % 2), c);
          }
        }
        // placa da seção
        p.rect(x + 2, fy - 28, 18, 6, C('#f8f0dc')); p.rect(x + 4, fy - 26, 12, 1, C('#c8302c'));
        break;
      }
      case 'listen': prim27.recordPlayer(g, x, fy); break;
      case 'booth': {
        const bt = y0 + 8;
        p.rect(x, bt, w, fy - bt, withAlpha(C('#9ad0e8'), 34));
        p.rect(x, bt, w, 2, pal.metalDark); p.rect(x, bt, 2, fy - bt, pal.metalDark); p.rect(x + w - 2, bt, 2, fy - bt, pal.metalDark);
        blk(p, x + 6, fy - 12, w - 12, 3, pal.wood); // mesa do locutor
        prim27.foam(g, x + 3, bt + 4, w - 6, 16);
        break;
      }
      case 'onair': { const lit = C('#e83030'); blk(p, x - 8, y0 + 2, 18, 6, C('#1a1214')); p.rect(x - 7, y0 + 3, 16, 4, lit); p.rect(x - 5, y0 + 4, 12, 2, C('#ffd0c0')); break; }
      case 'console': prim27.consoleDesk(g, x, fy, w); break;
      case 'reel': prim27.reelDeck(g, x, fy - 14, false); break;
      case 'glass': { p.rect(x, y0 + 6, Math.max(3, w), fy - y0 - 6, pal.metalDark); p.rect(x + 1, y0 + 18, Math.max(1, w - 2), 26, withAlpha(C('#a8d8f0'), 90)); break; }
      case 'foam': prim27.foam(g, x, y0 + 8, w, 34); break;
      case 'drums': prim27.drums(g, x, k0 === 'venue' ? fy - 9 : fy); break;
      case 'amp': prim27.amp(g, x, k0 === 'venue' ? fy - 9 : fy, k0 !== 'instruments'); break;
      case 'mic': prim27.micStand(g, x, k0 === 'venue' ? fy - 9 : k0 === 'bar' ? fy - 5 : fy); break;
      case 'piano': prim27.piano(g, x, fy); break;
      case 'guitar': prim27.guitar(g, x, fy, pal.accent); break;
      case 'guitars': { const n = pr.n ?? 4; for (let i = 0; i < n; i++) { const gx = x + Math.round((w * (i + 0.5)) / n); p.rect(gx - 1, y0 + 14, 3, 2, pal.metalDark); prim27.guitar(g, gx - 3, y0 + 52, [pal.accent, pal.gold, pal.accent2, C('#2a2a30'), C('#e8e0d0')][i % 5]); } break; }
      case 'typewriters':
      case 'screens': { const n = pr.n ?? 3; for (let i = 0; i < n; i++) { const dx = x + Math.round((w * i) / n); prim27.desk(g, dx, fy, Math.min(34, Math.round(w / n) - 6)); prim27.deskGear(g, dx + 4, fy); prim27.chair(g, dx + 14, fy); } break; }
      case 'presses': { for (let i = 0; i < 3; i++) blk(p, x + i * 9, fy - 6 - i * 3, 12, 6 + i * 3, C('#e8e0cc')); p.rect(x, fy - 15, 30, 1, C('#4a4440')); break; }
      case 'cork': prim27.corkBoard(g, x, y0 + 14, w, 22); break;
      case 'filing': prim27.filing(g, x, fy); break;
      case 'desk': prim27.desk(g, x, fy, w); prim27.deskGear(g, x + 4, fy); break;
      case 'tables': { const n = pr.n ?? 2; for (let i = 0; i < n; i++) { const tx = x + Math.round((w * (i + 0.5)) / n) - 6; blk(p, tx, fy - 10, 12, 2, pal.wood); p.vline(tx + 6, fy - 8, fy - 1, pal.woodDark); p.rect(tx + 2, fy - 13, 2, 3, C('#c8a040')); } break; }
      case 'jukebox': { blk(p, x, fy - 22, 12, 22, C('#8a2a2a')); p.ellipse(x + 6, fy - 17, 5, 4, C('#f0c050')); p.rect(x + 2, fy - 12, 8, 6, C('#3a2a2a')); for (let i = 0; i < 4; i++) p.rect(x + 2 + i * 2, fy - 11, 1, 4, [C('#ff6040'), C('#60c0ff'), C('#f0e060'), C('#80ff80')][i]); break; }
      case 'couch': prim27.couch(g, x, fy, w, pal.fabric); break;
      case 'tv': prim27.tv(g, x, fy); break;
      case 'plant': prim27.plant(g, x, fy, true); break;
      case 'window': prim27.backWindow(g, x, y0 + 12, w, 30, year < 1930); break;
      case 'keys': { blk(p, x, y0 + 14, w, 18, pal.woodDark); for (let r = 0; r < 3; r++) for (let xx = x + 2; xx < x + w - 2; xx += 4) p.rect(xx, y0 + 16 + r * 6, 1, 3, C('#d8b040')); break; }
      case 'poster': prim27.poster(g, x, y0 + 12, w, Math.round(w * 1.4), hs(`${seed}|${pr.x}`) % 6); break;
      case 'gold': { const n = pr.n ?? 3; for (let i = 0; i < n; i++) prim27.goldDisc(g, x + i * 14, y0 + 14, i === 0); break; }
      // r31 (S): celas com grade, caixotes do porto, cofre, roleta, caixas de som do baile, porta dos fundos
      case 'cells': {
        const n = pr.n ?? 3, cw = Math.floor(w / n);
        for (let i = 0; i < n; i++) {
          const cx = x + i * cw;
          blk(p, cx, y0 + 6, cw - 2, fy - y0 - 6, C('#4a4a50'));
          p.rect(cx + 2, y0 + 8, cw - 6, fy - y0 - 10, C('#2a2a30'));
          for (let yy = y0 + 12; yy < fy - 8; yy += 6) p.hline(cx + 2, cx + cw - 5, yy, C('#262630')); // juntas do bloco
          const cot = Math.min(16, cw - 8);
          blk(p, cx + 3, fy - 6, cot, 4, C('#7a6a5a')); p.rect(cx + 4, fy - 7, cot - 5, 2, C('#4a5a3a')); p.rect(cx + cot - 1, fy - 8, 3, 2, C('#d8d0bc')); // catre, cobertor, travesseiro
        }
        break;
      }
      case 'crates': { // caixotes de porto: tábuas com fio de luz, sarrafos nas pontas, estêncil
        const n = pr.n ?? 3; const cw = Math.max(10, Math.floor(w / n) - 2);
        const crate = (cx: number, cy: number, ww: number, hh: number, wood: Col) => {
          blk(p, cx, cy, ww, hh, wood);
          for (let yy = cy + 4; yy < cy + hh - 1; yy += 4) { p.hline(cx + 1, cx + ww - 2, yy, lv(wood, 1.8)); p.hline(cx + 1, cx + ww - 2, yy + 1, lv(wood, 3.6)); }
          p.vline(cx + 1, cy + 1, cy + hh - 2, lv(wood, 4)); p.vline(cx + 2, cy + 1, cy + hh - 2, lv(wood, 2.4));
          p.vline(cx + ww - 3, cy + 1, cy + hh - 2, lv(wood, 3.4)); p.vline(cx + ww - 2, cy + 1, cy + hh - 2, lv(wood, 1.8));
          if (ww >= 12 && hh >= 10) p.rect(cx + (ww >> 1) - 2, cy + (hh >> 1) - 1, 4, 2, lv(wood, 1)); // estêncil
        };
        for (let i = 0; i < n; i++) { const cx = x + i * (cw + 2), hh = 12 + ((i * 7 + seed) % 3) * 4; crate(cx, fy - hh, cw, hh, C('#8a6a3a')); if (i % 2 === 0) crate(cx + 2, fy - hh - 9, cw - 4, 9, C('#9a7a46')); }
        break;
      }
      case 'safe': { // cofre: porta embutida, dobradiças, segredo com marcas e manopla de 3 raios, pés
        const st = C('#4a4e56');
        blk(p, x, fy - 24, 18, 22, st);
        p.rect(x + 2, fy - 22, 14, 18, lv(st, 2.4)); p.hline(x + 2, x + 15, fy - 22, lv(st, 1.6)); p.hline(x + 2, x + 15, fy - 5, lv(st, 3.8)); p.vline(x + 2, fy - 21, fy - 6, lv(st, 1.8));
        p.rect(x + 3, fy - 21, 12, 16, st);
        p.rect(x + 1, fy - 19, 1, 3, lv(st, 4.4)); p.rect(x + 1, fy - 10, 1, 3, lv(st, 4.4)); // dobradiças
        p.disc(x + 9, fy - 15, 3.5, (xx, yy) => (xx + yy < x + 9 + fy - 15 - 2 ? C('#e8e8e0') : xx + yy > x + 9 + fy - 15 + 2 ? C('#8a8a84') : C('#c8c8c0')));
        p.put(x + 9, fy - 19, INK); p.put(x + 8, fy - 15, INK);
        p.hline(x + 7, x + 11, fy - 9, lv(st, 4.4)); p.vline(x + 9, fy - 11, fy - 8, lv(st, 4.4)); // manopla
        p.rect(x + 1, fy - 2, 3, 2, lv(st, 1.6)); p.rect(x + 14, fy - 2, 3, 2, lv(st, 1.6)); // pés
        break;
      }
      case 'roulette': { // mesa de feltro com borda de madeira; roda com casas vermelhas/pretas e cubo de latão; fichas
        const felt = C('#1e5a2a'), wood = C('#5a2a1a');
        blk(p, x, fy - 12, w, 3, wood); p.rect(x + 1, fy - 11, w - 2, 1, lv(felt, 3.4));
        p.rect(x + 2, fy - 9, 2, 9, lv(wood, 2.4)); p.rect(x + w - 4, fy - 9, 2, 9, lv(wood, 2));
        const cx = x + 10, cy = fy - 14;
        p.ellipse(cx, cy, 8, 3, lv(wood, 3.6)); p.hline(cx - 7, cx + 6, cy - 3, lv(wood, 4.6));
        p.ellipse(cx, cy, 6, 2, (xx) => ((xx - cx + 20) % 2 ? C('#c8302c') : C('#1a1a1e')));
        p.rect(cx - 1, cy - 1, 2, 1, C('#e8c050')); p.put(cx - 1, cy - 2, lv(C('#e8c050'), 4.6));
        for (let i = 0; i < 3; i++) { const fx0 = x + w - 12 + i * 3, ch = [C('#e8e0c8'), C('#c8302c'), C('#2a5ab0')][i]; for (let k = 0; k < 2 + i; k++) p.hline(fx0, fx0 + 1, fy - 13 - k, k % 2 ? lv(ch, 2.4) : ch); }
        break;
      }
      case 'speakers': speaker31(p, x, fy, Math.max(10, w), 30); break;
      case 'door': prim27.door(g, x, fy, Math.max(10, w), fy - y0 - 30); break;
    }
  }
  o.extra?.(g, seed);
  layer.outline(INK);
  p = back; g.p = back;
  p.blit(layer, 0, 0);
  // moldura do corte: paredes da fachada, laje, cornija e letreiro com o nome
  const fc = facadeCol(year, m.k);
  blk(p, bx, top, OW, gy - top, fc); blk(p, bx + bw - OW, top, OW, gy - top, tint(fc, -0.18));
  blk(p, bx, top, bw, y0 - top, tint(fc, 0.06));
  p.rect(bx - 2, top - 2, bw + 4, 3, tint(fc, -0.3));
  blk(p, bx, gy - FOUND, bw, FOUND, tint(fc, -0.35));
  if (o.name) prim27.sign(g, Math.round(W / 2), top + 2, o.name, Math.min(bw - 20, 200), m.dim || year >= 1925);
  // luz: uma ou duas lâmpadas; casa escura (show, bar) tem halo mais forte no palco
  const nL = w0 > 200 ? 3 : 2;
  for (let i = 0; i < nL; i++) prim27.lamp(g, x0 + Math.round((w0 * (i + 0.5)) / nL), y0, fy, 26);
  if (m.dim) p.rect(x0, y0, w0, RH, withAlpha(C('#0a0820'), 70));
  for (let i = 0; i < 3; i++) { p.rect(x0 + i, y0, 1, RH, withAlpha(OCC, 90 - i * 28)); p.rect(x0 + w0 - 1 - i, y0, 1, RH, withAlpha(OCC, 80 - i * 25)); }
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const hits: IDrawn27['hits'] = [];
  if (ctx) {
    const img = ctx.createImageData(W, H);
    new Uint32Array(img.data.buffer).set(p.d);
    ctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const placed = placePeople27(m, people);
    for (const [who, s0] of placed) {
      const lift = liftOf27(m, s0);
      const fx = X(s0.x), fyy = fy - lift;
      const look = o.look ? o.look(who) : lookOf({ id: who.pid ?? `npc:${who.name}` });
      const role = (o.role?.(who) ?? null) as Parameters<typeof avatarSprite>[1]['role'];
      const pose: Pose = s0.pose === 'play' && !who.actId ? 'stand' : s0.pose;
      const a = avatarSprite(look, { year, role, pose, dir: s0.dir });
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(fx - 6, fyy, 12, 1);
      ctx.drawImage(a.c, fx - a.ax, fyy - a.ay + 1);
      hits.push({ x: fx - 7, y: fyy - 31, w: 14, h: 32, who });
      if (who.you) { ctx.fillStyle = '#ffe070'; ctx.fillRect(fx - 1, fyy - 38, 3, 3); ctx.fillStyle = '#1a1214'; ctx.fillRect(fx, fyy - 37, 1, 1); } // marcador de você
    }
    // na frente dos bonecos (mesmo acabamento dos adereços): a grade das celas e a plateia de costas
    const front = new Px(W, H);
    for (const pr of m.props) if (pr.t === 'cells') {
      const n = pr.n ?? 3, cw = Math.floor(Wd(pr.w) / n), x1 = X(pr.x);
      for (let i = 0; i < n; i++) bars31(front, x1 + i * cw, y0 + 6, cw - 2, fy);
    }
    // plateia de costas, em frente ao palco (casa vazia — ninguém no palco — fica sem plateia)
    if (crowd && placed.some(([x]) => !!x.actId && !x.staff && !x.you)) inked(front, (q) => crowd31(q, X(crowd!.x), Wd(crowd!.w), crowd!.n ?? 12, fy, year, seed));
    pxOnCtx(ctx, front);
  }
  return { W, H, hits };
}
