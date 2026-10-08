// Tipos e utilidades do motor de locais.

import type { Dir, Pose, Role } from '../avatar';
import { furniture, type Facing, type FurnKind } from '../sprites';
import { eraIndex, type EraId, type Palette } from '../palette';
import { Px, type Col, type Sprite } from '../px';
import { H, W } from './kit';

export interface Prop {
  sprite: Sprite;
  x: number;
  y: number;
}

export interface CrowdMember {
  x: number;
  y: number;
  seed: string;
  dir: Dir;
  pose: Pose;
  phase: number;
  role?: Role | null;
  /** 0..1: quanto pula com a energia */
  hop: number;
}

export interface Spot {
  x: number;
  y: number;
  dir: Dir;
  pose?: Pose;
}

export interface Blink {
  x: number;
  y: number;
  w: number;
  h: number;
  col: Col;
  rate: number;
}

export interface PlaceModel {
  era: EraId;
  bg: HTMLCanvasElement;
  fg: HTMLCanvasElement;
  props: Prop[];
  crowd: CrowdMember[];
  spots: Record<string, Spot>;
  blinks: Blink[];
  /** filtro CSS (ex.: P&B nos anos 50 da TV) */
  filter?: string;
}

export interface BuildCtx {
  p: Px;
  f: Px;
  pal: Palette;
  era: EraId;
  ei: number;
  year: number;
  variant: number;
  props: Prop[];
  crowd: CrowdMember[];
  spots: Record<string, Spot>;
  blinks: Blink[];
  filter?: string;
}

export function newCtx(pal: Palette, year: number, variant: number): BuildCtx {
  return { p: new Px(W, H), f: new Px(W, H), pal, era: pal.era, ei: eraIndex(pal.era), year, variant, props: [], crowd: [], spots: {}, blinks: [] };
}

/** Móvel isométrico existente como objeto de cena (âncora nos pés). */
export function prop(c: BuildCtx, kind: FurnKind, x: number, y: number, facing: Facing = 'SW', variant = 0, frame = 0): void {
  c.props.push({ sprite: furniture(kind, c.era, facing, variant, frame), x, y });
}

let seq = 0;
/** Bloco de plateia com distribuição determinística. */
export function crowdBlock(c: BuildCtx, x0: number, x1: number, y0: number, y1: number, n: number, opts: { dir?: Dir | 'mix'; pose?: Pose; hop?: number; seed?: string } = {}): void {
  const rows = Math.max(1, Math.round(Math.sqrt((n * (y1 - y0 + 1)) / Math.max(1, x1 - x0))));
  const perRow = Math.ceil(n / rows);
  let k = 0;
  for (let r = 0; r < rows; r++) {
    const y = rows === 1 ? y1 : Math.round(y0 + ((y1 - y0) * r) / (rows - 1));
    for (let i = 0; i < perRow && k < n; i++, k++) {
      const jitter = ((k * 37) % 7) - 3;
      const x = Math.round(x0 + ((x1 - x0) * (i + (r % 2 ? 0.5 : 0.15))) / perRow + jitter);
      const dir: Dir = opts.dir === 'mix' || !opts.dir ? (k % 2 ? 'NE' : 'NW') : opts.dir;
      c.crowd.push({ x, y, seed: `${opts.seed ?? 'crowd'}${c.variant}-${k}-${seq % 1}`, dir, pose: opts.pose ?? 'stand', phase: (k * 1.37) % (Math.PI * 2), hop: opts.hop ?? 0.6 });
    }
  }
  seq += 1;
}

export function finish(c: BuildCtx): PlaceModel {
  c.props.sort((a, b) => a.y - b.y);
  return { era: c.era, bg: c.p.canvas(), fg: c.f.canvas(), props: c.props, crowd: c.crowd, spots: c.spots, blinks: c.blinks, filter: c.filter };
}
