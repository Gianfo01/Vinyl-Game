// Biblioteca de sprites isométricos procedurais (móveis e equipamentos por era), com cache por
// (tipo, era, variante, orientação, quadro). Pisos, paredes e decalques ficam em tiles.ts.

import { PALETTES, eraIndex, type EraId, type Palette } from './palette';
import { C, Px, dith, mix, noise, shade, withAlpha, type BoxShader, type Col, type Shader, type Sprite } from './px';

export * from './tiles';

export type Facing = 'SW' | 'SE';

export type FurnKind =
  | 'drumkit' | 'amp' | 'mic' | 'piano' | 'organ' | 'synth' | 'console' | 'daw' | 'laptop_desk' | 'holo_desk'
  | 'lathe' | 'gramophone' | 'tape' | 'speaker' | 'rack' | 'synth_rack' | 'echo' | 'neural_rig' | 'holo'
  | 'sofa' | 'armchair' | 'coffee_table' | 'table' | 'table3' | 'chair' | 'stool' | 'desk' | 'filing' | 'shelf' | 'archive'
  | 'vault' | 'server' | 'press' | 'fun' | 'tv' | 'coffee' | 'vending' | 'water' | 'bench' | 'lamp' | 'plant'
  | 'crate' | 'trophy_case' | 'mailbag' | 'video_suite' | 'dashboard' | 'bus' | 'workbench' | 'contracts';

/** Pegada em tiles na orientação SW (ao longo de gx × profundidade em gy) e altura máxima em px. */
export const FURN: Record<FurnKind, { a: number; b: number; h: number; frames?: number }> = {
  drumkit: { a: 1, b: 1, h: 30 }, amp: { a: 1, b: 1, h: 30 }, mic: { a: 1, b: 1, h: 32 }, piano: { a: 2, b: 1, h: 26 },
  organ: { a: 2, b: 1, h: 22 }, synth: { a: 2, b: 1, h: 24 }, console: { a: 2, b: 1, h: 28, frames: 2 }, daw: { a: 2, b: 1, h: 30, frames: 2 },
  laptop_desk: { a: 2, b: 1, h: 30, frames: 2 }, holo_desk: { a: 2, b: 1, h: 34, frames: 3 }, lathe: { a: 2, b: 1, h: 34, frames: 4 },
  gramophone: { a: 1, b: 1, h: 34, frames: 4 }, tape: { a: 1, b: 1, h: 30, frames: 4 }, speaker: { a: 1, b: 1, h: 34 },
  rack: { a: 1, b: 1, h: 32, frames: 2 }, synth_rack: { a: 1, b: 1, h: 32, frames: 2 }, echo: { a: 1, b: 1, h: 22, frames: 2 },
  neural_rig: { a: 1, b: 1, h: 34, frames: 3 }, holo: { a: 1, b: 1, h: 40, frames: 4 }, sofa: { a: 2, b: 1, h: 20 },
  armchair: { a: 1, b: 1, h: 20 }, coffee_table: { a: 1, b: 1, h: 14 }, table: { a: 2, b: 1, h: 20 }, table3: { a: 3, b: 1, h: 18 },
  chair: { a: 1, b: 1, h: 20 }, stool: { a: 1, b: 1, h: 12 }, desk: { a: 1, b: 1, h: 28, frames: 2 }, filing: { a: 1, b: 1, h: 26 },
  shelf: { a: 1, b: 1, h: 36 }, archive: { a: 1, b: 1, h: 36 }, vault: { a: 1, b: 1, h: 26 }, server: { a: 1, b: 1, h: 36, frames: 2 },
  press: { a: 2, b: 1, h: 38, frames: 4 }, fun: { a: 1, b: 1, h: 36, frames: 4 }, tv: { a: 1, b: 1, h: 30, frames: 2 },
  coffee: { a: 1, b: 1, h: 34, frames: 3 }, vending: { a: 1, b: 1, h: 36, frames: 2 }, water: { a: 1, b: 1, h: 28 },
  bench: { a: 2, b: 1, h: 14 }, lamp: { a: 1, b: 1, h: 34 }, plant: { a: 1, b: 1, h: 32 }, crate: { a: 1, b: 1, h: 18 },
  trophy_case: { a: 1, b: 1, h: 36 }, mailbag: { a: 1, b: 1, h: 16 }, video_suite: { a: 2, b: 1, h: 32, frames: 2 },
  dashboard: { a: 1, b: 1, h: 36, frames: 2 }, bus: { a: 4, b: 1, h: 34 }, workbench: { a: 2, b: 1, h: 26 }, contracts: { a: 1, b: 1, h: 26 },
};

/** Pegada no mundo (W ao longo de gx, D ao longo de gy) conforme a orientação. */
export function footprint(kind: FurnKind, facing: Facing): { w: number; d: number } {
  const f = FURN[kind];
  return facing === 'SW' ? { w: f.a, d: f.b } : { w: f.b, d: f.a };
}

/** Contexto de desenho em coordenadas locais (a = ao longo da parede, b = profundidade; frente em b máx). */
class D {
  constructor(readonly p: Px, readonly ox: number, readonly oy: number, readonly facing: Facing, readonly pal: Palette, readonly A: number, readonly B: number) {}

  world(a: number, b: number): [number, number] {
    return this.facing === 'SW' ? [a, b] : [b, a];
  }

  x(a: number, b: number): number {
    const [gx, gy] = this.world(a, b);
    return this.ox + gx - gy;
  }

  y(a: number, b: number, z = 0): number {
    const [gx, gy] = this.world(a, b);
    return this.oy + (gx + gy) / 2 - z;
  }

  /** Ponto (arredondado) na tela. */
  pt(a: number, b: number, z: number): [number, number] {
    return [Math.round(this.x(a, b) - 0.5), Math.round(this.y(a, b, z) - 0.5)];
  }

  dot(a: number, b: number, z: number, c: Col): void {
    const [x, y] = this.pt(a, b, z);
    this.p.set(x, y, c);
  }

  /** Caixa em coordenadas locais. front(a, z), side(b, z), top(a, b). */
  box(a: number, b: number, z: number, la: number, lb: number, h: number, base: Col, tex: { front?: Shader; side?: Shader; top?: Shader } = {}, topCol?: Col): void {
    const [gx, gy] = this.world(a, b);
    const W = this.facing === 'SW' ? la : lb;
    const Dd = this.facing === 'SW' ? lb : la;
    const t: BoxShader = {};
    if (this.facing === 'SW') {
      if (tex.front) t.left = tex.front;
      if (tex.side) t.right = (u, v) => tex.side!(u, v);
      if (tex.top) t.top = (u, v) => tex.top!(u, v);
    } else {
      if (tex.front) t.right = (u, v) => tex.front!(la - u, v);
      if (tex.side) t.left = (u, v) => tex.side!(lb - u, v);
      if (tex.top) t.top = (u, v) => tex.top!(v, u);
    }
    this.p.sbox(this.ox + gx - gy, this.oy + (gx + gy) / 2 - z, W, Dd, h, base, { tex: t, top: topCol });
  }

  /** Elipse horizontal (tampo redondo, prato) centrada num ponto local. */
  ell(a: number, b: number, z: number, rx: number, ry: number, c: Col | ((x: number, y: number, d: number) => Col)): void {
    this.p.ellipse(this.x(a, b), this.y(a, b, z), rx, ry, c);
  }

  disc(a: number, b: number, z: number, r: number, c: Col | ((x: number, y: number, d: number) => Col)): void {
    this.p.disc(this.x(a, b), this.y(a, b, z), r, c);
  }

  line(a0: number, b0: number, z0: number, a1: number, b1: number, z1: number, c: Col): void {
    const [x0, y0] = this.pt(a0, b0, z0);
    const [x1, y1] = this.pt(a1, b1, z1);
    this.p.line(x0, y0, x1, y1, c);
  }

  /** Haste vertical. */
  pole(a: number, b: number, z0: number, z1: number, c: Col): void {
    const [x, y0] = this.pt(a, b, z0);
    const [, y1] = this.pt(a, b, z1);
    this.p.vline(x, y0, y1, c);
  }
}

const cache = new Map<string, Sprite>();

function make(kind: FurnKind, era: EraId, facing: Facing, variant: number, frame: number, draw: (d: D) => void): Sprite {
  const f = FURN[kind];
  const { w, d } = footprint(kind, facing);
  const W = w * 16;
  const Dd = d * 16;
  const H = f.h + 6;
  const ox = Dd + 6;
  const oy = H + 4;
  const p = new Px(W + Dd + 12, H + (W + Dd) / 2 + 10);
  const pal = PALETTES[era];
  draw(new D(p, ox, oy, facing, pal, f.a * 16, f.b * 16));
  p.outline(pal.outline);
  void variant;
  void frame;
  return { c: p.canvas(), ax: ox, ay: oy };
}

// ---------- cores auxiliares ----------
const BLACK = C('#24222a');
const WHITE = C('#f2f0ea');
const CHROME = C('#c8ccd4');

function grille(base: Col): Shader {
  return (u, v) => (dith(Math.floor(u), Math.floor(v), 0.5) ? shade(base, -0.25) : shade(base, 0.05));
}

function screenTex(pal: Palette, frame: number, kind: 'wave' | 'bars' | 'text' = 'wave'): Shader {
  const bg = pal.era === '2030' ? C('#0a3a44') : pal.era === '1980' || pal.era === '1990' ? C('#103a20') : C('#1a3050');
  const fg = pal.era === '1980' || pal.era === '1990' ? C('#5fe07a') : pal.era === '2030' ? C('#5ffff0') : C('#7ac8ff');
  return (u, v) => {
    const x = Math.floor(u);
    const y = Math.floor(v);
    if (kind === 'wave') {
      const w = Math.round(Math.sin((x + frame * 3) * 0.9) * 1.5 + Math.sin((x + frame) * 2.3) * 0.8);
      return Math.abs(y - (3 + w)) < 1 ? fg : bg;
    }
    if (kind === 'bars') return y < ((x * 7 + frame * 3) % 5) + 1 ? fg : bg;
    return y % 2 === 0 && noise(x, y, frame) > 0.4 ? fg : bg;
  };
}

function legs(d: D, a0: number, b0: number, a1: number, b1: number, h: number, c: Col): void {
  for (const [a, b] of [[a0, b0], [a1, b0], [a0, b1], [a1, b1]]) d.box(a, b, 0, 2, 2, h, c);
}

function drumShell(era: EraId): Col {
  const m: Record<EraId, string> = { '1920': '#e8dcc0', '1950': '#d8b88a', '1960': '#2a2a30', '1980': '#c83030', '1990': '#1e1e24', '2000': '#2f5ac8', '2010': '#f0f0f0', '2020': '#3f8a5c', '2030': '#1a2a34' };
  return C(m[era]);
}

// ---------- desenhos ----------

type Painter = (d: D, era: EraId, variant: number, frame: number) => void;

const PAINT: Record<FurnKind, Painter> = {
  drumkit: (d, era) => {
    const shell = drumShell(era);
    const neon = era === '2030';
    const head = neon ? C('#0e1a22') : C('#f4eedc');
    const rim = neon ? C('#5ffff0') : CHROME;
    const cymbal = C('#e8c050');
    const cx = d.x(8, 8);
    const cy = d.y(8, 8);
    const p = d.p;
    // pratos e estantes
    p.vline(cx - 9, cy - 16, cy - 1, C('#6a6a70'));
    p.ellipse(cx - 9, cy - 17, 4.5, 1, cymbal);
    p.vline(cx + 9, cy - 19, cy - 1, C('#6a6a70'));
    p.ellipse(cx + 9, cy - 20, 5, 1.2, cymbal);
    p.set(cx + 7, cy - 21, C('#fff2b0'));
    // tons
    p.rect(cx - 5, cy - 14, 4, 3, shell);
    p.ellipse(cx - 3, cy - 14, 2.5, 1.2, head);
    p.rect(cx + 1, cy - 14, 4, 3, shade(shell, -0.1));
    p.ellipse(cx + 3, cy - 14, 2.5, 1.2, head);
    // caixa e surdo
    p.rect(cx - 10, cy - 8, 6, 3, shell);
    p.ellipse(cx - 7, cy - 8, 3.2, 1.3, head);
    p.hline(cx - 10, cx - 5, cy - 6, rim);
    p.rect(cx + 4, cy - 8, 7, 6, shade(shell, -0.15));
    p.ellipse(cx + 7.5, cy - 8, 3.5, 1.3, head);
    p.hline(cx + 4, cx + 10, cy - 3, rim);
    // bumbo
    p.disc(cx, cy - 5, 5.5, (x, y, dd) => (dd > 4.6 ? shell : dd > 4 ? rim : neon ? (y % 2 ? C('#1a3a44') : C('#0e2a34')) : x < cx - 1 && y < cy - 7 ? shade(head, 0.1) : head));
    if (neon) p.ring(cx, cy - 5, 4.2, C('#5ffff0'));
    else p.set(cx, cy - 5, shade(shell, 0.1));
  },
  amp: (d, era) => {
    const big = era === '1980' || era === '1990';
    if (era === '2030') {
      d.box(3, 4, 0, 10, 8, 20, C('#16262e'), { front: (u, v) => (Math.abs(v - 10) < 1 || Math.abs(u - 5) < 0.6 ? C('#5ffff0') : C('#122028')) });
      return;
    }
    const tolex = era === '1950' || era === '1960' ? C('#d8c8a0') : era === '2010' ? C('#3a3a3e') : BLACK;
    const cloth = era === '1950' || era === '1960' ? C('#8a6a48') : C('#3a3a40');
    const h = big ? 12 : 14;
    const cab = (z: number, hh: number, panel: boolean) => d.box(3, 4, z, 10, 8, hh, tolex, {
      front: (u, v) => {
        if (panel && v > hh - 3) return v > hh - 2 ? shade(tolex, 0.1) : u > 2 && u < 9 && Math.floor(u) % 2 === 0 ? C('#e8c050') : C('#2a2a2a');
        if (u > 1 && u < 9 && v > 1 && v < (panel ? hh - 3 : hh - 1)) return grille(cloth)(u, v);
        return 0;
      },
    });
    cab(0, h, !big);
    if (big) cab(h, 9, true);
  },
  mic: (d, era, variant) => {
    const pole = C('#5a5a62');
    d.line(5, 8, 0, 11, 8, 0, pole);
    d.line(8, 5, 0, 8, 11, 0, pole);
    d.pole(8, 8, 0, 22, pole);
    const [x, y] = d.pt(8, 8, 22);
    const p = d.p;
    if (variant === 1) {
      // microfone de fita (equipamento): cápsula grande cromada com suspensão
      p.rect(x - 3, y - 7, 6, 8, CHROME);
      p.ring(x, y - 3, 4, C('#3a3a40'));
      p.vline(x - 1, y - 6, y, shade(CHROME, -0.3));
      p.vline(x + 1, y - 6, y, shade(CHROME, -0.3));
      p.set(x - 2, y - 6, WHITE);
      return;
    }
    if (era === '1920') { p.ring(x, y - 4, 3.5, C('#c9a24a')); p.rect(x - 2, y - 6, 4, 4, C('#3a3a3a')); }
    else if (era === '1950' || era === '1960') { p.rect(x - 1, y - 6, 3, 6, C('#b8b8b0')); p.set(x - 1, y - 6, WHITE); }
    else {
      p.line(x, y, x + 3, y - 3, pole);
      p.rect(x + 2, y - 7, 3, 5, C('#4a4a50'));
      p.set(x + 2, y - 7, CHROME);
      if (eraIndex(era) >= 5) p.ring(x - 1, y - 5, 2.5, withAlpha(C('#202020'), 200));
    }
  },
  piano: (d, era) => {
    const wood = era === '1990' || era === '2000' || era === '2010' ? C('#1e1c22') : era === '2020' ? C('#f0f0ec') : d.pal.woodDark;
    d.box(2, 2, 0, 28, 10, 22, wood, {
      front: (u, v) => {
        if (v >= 9 && v < 11 && u > 2 && u < 26) return Math.floor(u) % 2 ? C('#f4f0e4') : C('#e0dccc');
        if (v >= 11 && v < 12 && u > 2 && u < 26) return Math.floor(u) % 3 === 0 ? C('#1a1a1a') : C('#f4f0e4');
        if (v < 2 && (u < 4 || u > 24)) return shade(wood, -0.2);
        if (v > 13 && v < 20 && u > 5 && u < 23) return shade(wood, 0.08);
        return 0;
      },
    });
    d.box(9, 13, 0, 12, 3, 7, shade(wood, 0.1));
    if (era === '1920' || era === '1950') { d.dot(6, 6, 24, d.pal.lamp); d.dot(6, 6, 25, d.pal.gold); }
  },
  organ: (d) => {
    const wood = d.pal.wood;
    legs(d, 2, 3, 26, 9, 6, d.pal.woodDark);
    d.box(2, 2, 6, 28, 10, 14, wood, {
      front: (u, v) => {
        if ((v >= 5 && v < 6) || (v >= 8 && v < 9)) return u > 3 && u < 25 ? (Math.floor(u) % 2 ? C('#f4f0e4') : C('#1a1a1a')) : 0;
        if (v >= 11 && v < 12 && u > 6 && u < 22) return [C('#7a4a20'), C('#1a1a1a'), C('#f4f0e4')][Math.floor(u) % 3];
        return 0;
      },
    });
  },
  synth: (d, era, _v, frame) => {
    const stand = C('#4a4a50');
    d.line(4, 8, 0, 26, 8, 12, stand);
    d.line(26, 8, 0, 4, 8, 12, stand);
    const body = era === '2030' ? C('#16303a') : era === '1980' ? C('#2a2a30') : C('#3a3a42');
    d.box(2, 4, 12, 28, 8, 3, body, { top: (a, b) => (b > 5 && a > 3 && a < 26 ? (Math.floor(a) % 2 ? C('#f4f0e4') : C('#d8d4c8')) : b < 3 && a > 4 && a < 24 && Math.floor(a) % 3 === 0 ? [C('#ff4fa3'), C('#35e0e0'), C('#f0c040')][(Math.floor(a) + frame) % 3] : 0) });
    d.box(6, 2, 18, 20, 5, 2, shade(body, 0.1), { top: (a, b) => (b > 2 && a > 2 && a < 18 ? (Math.floor(a) % 2 ? C('#f4f0e4') : C('#c8c4b8')) : 0) });
    d.line(6, 4, 15, 6, 4, 18, stand);
    d.line(24, 4, 15, 24, 4, 18, stand);
  },
  console: (d, era, _v, frame) => {
    const pal = d.pal;
    const side = era === '1960' ? pal.wood : era === '1950' ? C('#5a6a62') : era === '1980' ? C('#3a3a44') : C('#4a4a52');
    const panel = era === '1950' ? C('#8aa098') : era === '1960' ? C('#b8b4a8') : era === '1980' ? C('#5a5a64') : C('#6a6a72');
    d.box(1, 3, 0, 30, 12, 9, side);
    const caps = [C('#e04848'), C('#f0c040'), C('#48a8e0'), C('#f4f0e4'), C('#48c070')];
    d.box(1, 4, 9, 30, 11, 2, panel, {
      top: (a, b) => {
        const A = Math.floor(a);
        const Bb = Math.floor(b);
        if (era === '1950') return A % 6 === 3 && Bb % 4 === 2 ? C('#1a1a1a') : 0;
        if (A % 3 === 1 && Bb > 1 && Bb < 9) return Bb === 7 - ((A * 3 + frame) % 4) ? caps[A % 5] : C('#2a2a30');
        if (A % 3 === 2 && Bb < 2) return caps[(A + 2) % 5];
        return 0;
      },
    });
    // ponte de VU
    d.box(1, 2, 11, 30, 3, 6, side, {
      front: (a, v) => {
        const A = Math.floor(a);
        if (v > 1 && v < 5 && A % 5 > 0 && A > 2 && A < 28) {
          const needle = (A % 5) === 2 + ((A + frame) % 2) && v > 2;
          return needle ? C('#1a1a1a') : era === '1990' ? C('#5fe07a') : C('#f2e2a0');
        }
        return 0;
      },
    });
    if (era !== '1950') {
      for (const a of [2, 25]) d.box(a, 2, 17, 5, 4, 7, BLACK, { front: (u, v) => ((u - 2.5) ** 2 + (v - 3.5) ** 2 < 4 ? C('#5a5a62') : 0) });
    }
  },
  daw: (d, era, _v, frame) => {
    const pal = d.pal;
    const desk = era === '2000' ? C('#c8ccd4') : pal.wood;
    d.box(1, 3, 0, 30, 12, 11, desk, { front: (a, v) => (a > 2 && a < 28 && v < 9 ? shade(desk, -0.08) : 0) });
    // dois monitores (CRT nos 90, LCD depois)
    const crt = era === '1990';
    for (const a of [4, 17]) {
      if (crt) d.box(a, 3, 11, 10, 9, 10, C('#d8d0bc'), { front: (u, v) => (u > 1 && u < 9 && v > 2 && v < 9 ? screenTex(pal, frame, 'bars')(u - 1, v - 2) : 0) });
      else {
        d.box(a + 3, 5, 11, 3, 3, 3, C('#3a3a40'));
        d.box(a, 4, 14, 10, 2, 9, C('#2a2a30'), { front: (u, v) => (u > 0.8 && u < 9.2 && v > 1 && v < 8.4 ? screenTex(pal, frame + a, 'wave')(u, v - 1) : 0) });
      }
    }
    d.box(9, 11, 11, 10, 3, 1, C('#e8e8e8'));
    d.box(21, 11, 11, 3, 2, 1, C('#e8e8e8'));
  },
  laptop_desk: (d, era, _v, frame) => {
    const pal = d.pal;
    const desk = era === '2010' ? C('#f2f2f0') : pal.wood;
    legs(d, 1, 3, 28, 13, 10, era === '2010' ? C('#cfcfcc') : C('#2a2a2e'));
    d.box(1, 3, 10, 30, 12, 2, desk);
    if (era === '2020') d.line(1, 15, 10, 31, 15, 10, withAlpha(pal.accent, 230));
    for (const a of [4, 18]) {
      d.box(a + 3, 5, 12, 3, 3, 3, C('#9a9aa0'));
      d.box(a, 4, 15, 10, 2, 9, C('#2a2a30'), { front: (u, v) => (u > 0.8 && u < 9.2 && v > 1 && v < 8.4 ? screenTex(pal, frame + a, a === 4 ? 'wave' : 'bars')(u, v - 1) : 0) });
    }
    d.box(12, 10, 12, 7, 5, 1, C('#c8ccd4'));
    d.box(12, 9, 13, 7, 1, 5, C('#c8ccd4'), { front: () => withAlpha(C('#9ad0ff'), 255) });
    for (const a of [1, 27]) d.box(a, 5, 12, 3, 3, 6, BLACK);
  },
  holo_desk: (d, _era, _v, frame) => {
    const g = C('#5ffff0');
    d.box(4, 5, 0, 24, 6, 9, C('#16303a'), { front: (a, v) => (Math.abs(v - 7) < 0.6 ? g : 0) });
    d.box(1, 3, 9, 30, 12, 2, C('#1e3c48'), { top: (a, b) => (Math.floor(a + b) % 6 === frame % 6 ? withAlpha(g, 160) : 0) });
    // painéis flutuantes
    for (const [a, z] of [[3, 16], [13, 18], [22, 15]] as const) {
      d.box(a, 4, z, 8, 1, 8, withAlpha(C('#2ee8d8'), 90), { front: (u, v) => (Math.floor(v + frame) % 3 === 0 && u > 1 && u < 7 ? withAlpha(g, 200) : withAlpha(C('#2ee8d8'), 70)) });
    }
  },
  lathe: (d, _era, _v, frame) => {
    const iron = C('#3a3430');
    d.box(2, 2, 0, 26, 12, 12, d.pal.woodDark);
    d.box(4, 4, 12, 22, 8, 3, iron);
    // prato girando
    d.ell(11, 8, 15, 6, 3, (x, y) => {
      const ang = Math.atan2((y - d.y(11, 8, 15)) * 2, x - d.x(11, 8));
      return Math.floor((ang / Math.PI) * 4 + frame) % 2 ? C('#2a2424') : C('#1a1616');
    });
    d.dot(11, 8, 16, d.pal.gold);
    // braço de corte e corneta de gravação
    d.line(20, 6, 15, 13, 8, 18, d.pal.metal);
    d.pole(22, 6, 15, 24, d.pal.metalDark);
    const [hx, hy] = d.pt(22, 6, 24);
    d.p.poly([[hx, hy], [hx - 9, hy - 9], [hx - 4, hy - 12], [hx + 1, hy - 2]], d.pal.gold);
    d.p.ellipse(hx - 6.5, hy - 10.5, 3, 2, shade(d.pal.gold, -0.35));
  },
  gramophone: (d, _era, _v, frame) => {
    const pal = d.pal;
    d.box(3, 3, 0, 10, 10, 10, pal.wood, { front: (u, v) => (u > 2 && u < 8 && v > 2 && v < 7 ? shade(pal.wood, -0.15) : 0) });
    d.ell(8, 8, 10, 4.5, 2.3, (x, y) => {
      const ang = Math.atan2((y - d.y(8, 8, 10)) * 2, x - d.x(8, 8));
      return Math.floor((ang / Math.PI) * 3 + frame * 0.75) % 2 ? C('#2a2424') : C('#151212');
    });
    d.dot(8, 8, 11, C('#c03a2a'));
    d.line(11, 4, 10, 8, 8, 12, pal.metalDark);
    const [hx, hy] = d.pt(11, 4, 12);
    d.p.line(hx, hy, hx - 2, hy - 8, pal.metalDark);
    // corneta
    d.p.poly([[hx - 2, hy - 8], [hx - 12, hy - 18], [hx - 2, hy - 23], [hx, hy - 9]], pal.gold);
    d.p.ellipse(hx - 7, hy - 20.5, 5, 3, shade(pal.gold, -0.4));
    d.p.line(hx - 3, hy - 9, hx - 9, hy - 18, shade(pal.gold, 0.35));
  },
  tape: (d, era, _v, frame) => {
    const body = era === '1980' || era === '1990' ? C('#2c2c32') : C('#c8c2b0');
    const face = era === '1980' || era === '1990' ? C('#3a3a42') : C('#9a9488');
    d.box(3, 3, 0, 10, 10, 24, body, { front: (u, v) => (v > 12 && v < 23 && u > 0.5 && u < 9.5 ? face : v > 4 && v < 8 && u > 1 && u < 9 ? (Math.floor(u) % 3 === 0 ? C('#e04848') : C('#e8e0b0')) : 0) });
    for (const a of [5.5, 10.5]) {
      const [x, y] = d.pt(a, 13, 18);
      d.p.disc(x + 0.5, y + 0.5, 2.6, (xx, yy) => {
        const ang = Math.atan2(yy - y, xx - x) + frame * 1.2 + a;
        return Math.floor((ang / Math.PI) * 1.5 + 6) % 2 ? C('#d8d8d8') : C('#5a5048');
      });
      d.p.put(x, y, C('#202020'));
    }
  },
  speaker: (d, era) => {
    if (era === '2030') {
      d.pole(8, 8, 0, 18, C('#3e6670'));
      d.disc(8, 8, 24, 4, (x, y, dd) => (dd > 3 ? C('#1e3c48') : y % 2 ? C('#5ffff0') : C('#2ee8d8')));
      return;
    }
    const wood = era === '1960' ? d.pal.wood : era === '2010' ? C('#f2f2f0') : BLACK;
    if (era === '1960' || era === '1950') {
      d.box(3, 4, 0, 10, 8, 26, wood, { front: (u, v) => (u > 1 && u < 9 && v > 2 && v < 24 ? grille(C('#b8a070'))(u, v) : 0) });
      return;
    }
    d.pole(8, 8, 0, 12, C('#4a4a50'));
    d.line(6, 8, 0, 8, 8, 4, C('#4a4a50'));
    d.line(10, 8, 0, 8, 8, 4, C('#4a4a50'));
    d.box(4, 5, 12, 8, 6, 14, wood, { front: (u, v) => ((u - 4) ** 2 + (v - 5) ** 2 < 6 ? C('#5a5a62') : (u - 4) ** 2 + (v - 11) ** 2 < 2 ? C('#8a8a92') : 0) });
  },
  rack: (d, era, _v, frame) => {
    const body = era === '2010' || era === '2020' ? C('#2a2a2e') : BLACK;
    d.box(3, 3, 0, 10, 10, 26, body, {
      front: (u, v) => {
        const row = Math.floor(v / 4);
        if (v % 4 < 0.8) return C('#4a4a52');
        if (u < 1 || u > 9) return C('#6a6a72');
        if (era === '1990') return row % 2 === 0 && u > 2 && u < 7 && v % 4 > 1.5 ? C('#5fe07a') : 0;
        return Math.floor(u) === 2 + ((row + frame) % 3) && v % 4 > 2 ? [C('#e04848'), C('#5fe07a'), C('#f0c040')][row % 3] : 0;
      },
    });
  },
  synth_rack: (d, _era, _v, frame) => {
    const wood = d.pal.wood;
    d.box(2, 4, 0, 12, 8, 10, d.pal.woodDark);
    d.box(2, 3, 10, 12, 8, 18, wood, {
      front: (u, v) => {
        if (u < 1 || u > 11) return 0;
        if (Math.floor(v) % 6 === 0) return C('#5a5048');
        const A = Math.floor(u);
        const V = Math.floor(v);
        if ((A + V) % 4 === 0) return C('#e8e0d0');
        if (A % 3 === 1 && V % 3 === 1) return (A + V + frame) % 5 === 0 ? C('#ff5040') : C('#1a1a1a');
        return C('#2a2a30');
      },
    });
    // cabos de patch
    const cols = [C('#e04848'), C('#f0c040'), C('#48a8e0'), C('#48c070')];
    for (let i = 0; i < 4; i++) {
      const [x0, y0] = d.pt(3 + i * 2, 11, 25 - i * 3);
      const [x1, y1] = d.pt(9 - i, 11, 15 + i * 2);
      d.p.line(x0, y0, Math.round((x0 + x1) / 2), Math.max(y0, y1) + 3, cols[i]);
      d.p.line(Math.round((x0 + x1) / 2), Math.max(y0, y1) + 3, x1, y1, cols[i]);
    }
  },
  echo: (d, era, _v, frame) => {
    legs(d, 2, 4, 12, 10, 8, C('#4a4a50'));
    const body = era === '1950' || era === '1960' ? C('#7a8a6a') : C('#5a5a64');
    d.box(2, 4, 8, 12, 8, 8, body, { front: (u, v) => (v > 3 && v < 6 && u > 2 && u < 10 ? (Math.floor(u) === 3 + (frame % 2) * 4 ? C('#ff6040') : C('#2a2a2a')) : 0) });
  },
  neural_rig: (d, _era, _v, frame) => {
    const g = C('#5ffff0');
    d.box(4, 4, 0, 8, 8, 7, C('#2a3a44'));
    d.box(4, 3, 7, 8, 3, 12, C('#1e3c48'), { front: (u, v) => (Math.abs(v - 6 - (frame % 3)) < 0.6 ? g : 0) });
    d.box(5, 5, 7, 6, 6, 2, C('#2a6670'));
    d.ell(8, 6, 27, 6, 2.2, withAlpha(g, 140));
    d.ell(8, 6, 27, 4, 1.2, 0 as Col);
    d.p.ring(d.x(8, 6), d.y(8, 6, 27), 5, withAlpha(g, 200));
    d.line(4, 4, 18, 8, 6, 26, withAlpha(g, 160));
  },
  holo: (d, _era, _v, frame) => {
    const g = C('#5ffff0');
    d.box(5, 5, 0, 6, 6, 5, C('#2a3a44'));
    d.ell(8, 8, 5, 3, 1.4, g);
    const [x, y] = d.pt(8, 8, 5);
    d.p.poly([[x - 1, y], [x + 1, y], [x + 8, y - 30], [x - 8, y - 30]], withAlpha(g, 45));
    // figura giratória
    const w = [3, 2, 1, 2][frame % 4];
    d.p.disc(x + 0.5, y - 25, 2.2, withAlpha(C('#bffff8'), 200));
    d.p.rect(x - w + 1, y - 22, w * 2, 8, withAlpha(C('#7ffff4'), 170));
    d.p.rect(x - 1, y - 14, 2, 6, withAlpha(C('#7ffff4'), 150));
    for (let yy = y - 28; yy < y - 4; yy += 3) d.p.hline(x - 6, x + 6, yy, withAlpha(C('#ffffff'), 25));
  },
  sofa: (d, era) => seat(d, era, 30),
  armchair: (d, era) => seat(d, era, 14),
  coffee_table: (d, era) => {
    const top = era === '2030' || era === '2010' ? withAlpha(C('#cfe8ee'), 200) : d.pal.wood;
    legs(d, 3, 3, 11, 11, 4, d.pal.woodDark);
    d.box(2, 2, 4, 12, 12, 2, top);
    d.box(4, 5, 6, 5, 4, 1, era === '1920' ? C('#e8dcc0') : d.pal.accent2);
    d.dot(10, 9, 8, WHITE);
    d.dot(10, 9, 7, WHITE);
  },
  table: (d, era) => tableP(d, era, 30),
  table3: (d, era) => tableP(d, era, 46),
  chair: (d, era) => {
    const pal = d.pal;
    const office = eraIndex(era) >= 4;
    const c = office ? (era === '2010' ? C('#f2f2f0') : era === '2030' ? C('#2a6670') : C('#2a2a32')) : pal.wood;
    if (office) {
      d.pole(8, 9, 0, 6, C('#4a4a50'));
      d.line(5, 9, 0, 11, 9, 0, C('#4a4a50'));
    } else legs(d, 4, 5, 10, 11, 6, shade(c, -0.2));
    d.box(4, 5, 6, 8, 8, 2, c);
    d.box(4, 3, 8, 8, 2, office ? 10 : 9, shade(c, -0.05));
  },
  stool: (d, era) => {
    const c = era === '2030' ? C('#2a6670') : BLACK;
    d.pole(8, 8, 0, 6, C('#5a5a62'));
    d.ell(8, 8, 7, 4, 2, c);
    d.ell(8, 8, 8, 3.5, 1.6, shade(c, 0.2));
  },
  desk: (d, era, variant, frame) => {
    const pal = d.pal;
    const e = eraIndex(era);
    const wood = era === '2010' ? C('#f2f2f0') : era === '2030' ? C('#1e3c48') : era === '1990' ? C('#b8a888') : pal.wood;
    d.box(1, 2, 0, 14, 13, 11, wood, { side: (u, v) => (v < 9 && u > 1 && u < 7 && Math.floor(v) % 3 === 0 ? shade(wood, -0.25) : 0), front: (u, v) => (v < 9 && u > 1 && u < 13 ? shade(wood, -0.1) : 0) });
    // objeto principal de trabalho por era
    if (e <= 2) {
      // máquina de escrever, papel
      d.box(4, 5, 11, 7, 5, 3, C('#2a2a2e'));
      d.box(5, 6, 14, 5, 1, 4, WHITE);
      d.dot(12, 12, 12, C('#1a1a1a'));
      if (era === '1920') { d.pole(12, 4, 11, 16, pal.metalDark); d.ell(12, 4, 17, 2.5, 1.2, C('#3f7a3a')); }
    } else if (e <= 4) {
      // computador bege
      d.box(3, 3, 11, 9, 9, 8, C('#d8d0bc'));
      d.box(3, 12, 11, 9, 3, 1, C('#e8e0cc'));
      d.dot(6, 3, 21, withAlpha(pal.screen, 200));
    } else if (e <= 6) {
      d.box(6, 6, 11, 2, 2, 3, C('#6a6a70'));
      d.box(3, 5, 14, 9, 1, 7, era === '2010' ? C('#d8d8d8') : C('#2a2a30'));
      d.box(4, 11, 11, 7, 3, 1, C('#e0e0e0'));
    } else if (e === 7) {
      d.box(3, 8, 11, 8, 5, 1, C('#b8bcc4'));
      d.box(3, 7, 12, 8, 1, 6, C('#b8bcc4'), { front: () => C('#c8ccd4') });
    } else {
      d.box(3, 6, 15, 9, 1, 7, withAlpha(C('#5ffff0'), 110), { front: (u, v) => (Math.floor(v + frame) % 3 === 0 ? withAlpha(C('#5ffff0'), 200) : withAlpha(C('#2ee8d8'), 80)) });
    }
    // detalhe do papel da equipe
    const prop = variant % 6;
    if (prop === 1) { d.box(11, 3, 11, 3, 3, 2, e <= 3 ? C('#1a1a1a') : C('#e0e0e0')); d.dot(12, 4, 13, C('#e04848')); }
    if (prop === 2) { d.box(10, 9, 11, 4, 5, 3, WHITE); d.box(10, 9, 14, 4, 5, 1, C('#e8e0c8')); }
    if (prop === 3) d.box(11, 10, 11, 3, 3, 4, pal.accent2);
    if (prop === 4) { d.box(10, 4, 11, 4, 3, 5, C('#8a3a2a')); d.box(10, 7, 11, 4, 3, 4, C('#2a4a7a')); }
    if (prop === 5) d.ell(12, 11, 12, 1.5, 1, C('#e8e8e8'));
  },
  filing: (d, era) => {
    const c = era === '1920' ? d.pal.wood : era === '2010' ? C('#e8e8e6') : era === '2030' ? C('#1e3c48') : C('#8a9298');
    d.box(3, 4, 0, 10, 9, 22, c, { front: (u, v) => (Math.floor(v) % 7 === 0 ? shade(c, -0.25) : Math.floor(v) % 7 === 4 && u > 3 && u < 7 ? C('#e8e8e0') : 0) });
  },
  contracts: (d, era) => {
    PAINT.filing(d, era, 0, 0);
    for (let i = 0; i < 4; i++) d.box(4, 5, 22 + i, 8, 6, 1, i % 2 ? WHITE : C('#e8e0c8'));
    d.dot(7, 8, 27, C('#c03a2a'));
  },
  shelf: (d, era) => shelfP(d, era, 'books'),
  archive: (d, era) => shelfP(d, era, eraIndex(era) >= 4 && eraIndex(era) < 7 ? 'cds' : 'records'),
  vault: (d) => {
    const steel = C('#4a5058');
    d.box(3, 4, 0, 10, 9, 20, steel, {
      front: (u, v) => {
        if (u < 1 || u > 9 || v < 1 || v > 19) return shade(steel, -0.2);
        if ((u - 5) ** 2 + (v - 12) ** 2 < 6) return (u - 5) ** 2 + (v - 12) ** 2 < 2 ? C('#d8d8d8') : C('#9aa0a8');
        if (Math.abs(v - 6) < 0.6 && u > 3 && u < 8) return C('#c9a24a');
        return 0;
      },
    });
  },
  server: (d, _era, _v, frame) => {
    d.box(3, 3, 0, 10, 10, 30, C('#1e1e24'), {
      front: (u, v) => {
        const row = Math.floor(v / 3);
        if (v % 3 < 0.7) return C('#3a3a42');
        if (u > 1 && u < 2.2) return (row + frame) % 3 === 0 ? C('#5fe07a') : C('#2a6a3a');
        if (u > 3 && u < 4.2) return (row * 7 + frame) % 5 === 0 ? C('#48a8e0') : 0;
        return 0;
      },
    });
  },
  press: (d, _era, _v, frame) => {
    const g = C('#4a6a5a');
    d.box(2, 3, 0, 26, 11, 10, g);
    d.box(4, 4, 10, 12, 9, 3, C('#2a2a2e'));
    d.pole(5, 6, 10, 30, C('#8a9298'));
    d.pole(15, 6, 10, 30, C('#8a9298'));
    const up = [0, 2, 4, 2][frame % 4];
    d.box(4, 4, 18 + up, 12, 9, 3, C('#9aa0a8'));
    d.box(3, 3, 30, 14, 10, 4, g);
    // pilha de discos
    for (let i = 0; i < 5; i++) d.ell(23, 8, 10 + i, 4, 2, i % 2 ? C('#1a1a1a') : C('#2a2a2a'));
    d.dot(23, 8, 15, C('#c03a2a'));
    if (frame % 4 === 2) { d.dot(9, 4, 33, withAlpha(WHITE, 160)); d.dot(10, 4, 35, withAlpha(WHITE, 120)); }
  },
  fun: (d, era, _v, frame) => funP(d, era, frame),
  tv: (d, era, _v, frame) => {
    const pal = d.pal;
    const e = eraIndex(era);
    if (e === 0) {
      // rádio de mesa sobre aparador
      d.box(2, 3, 0, 12, 10, 10, pal.woodDark);
      d.box(3, 4, 10, 10, 7, 12, pal.wood, { front: (u, v) => (v > 2 && v < 8 && u > 1 && u < 9 ? (Math.floor(u + v) % 2 ? C('#d8b880') : shade(pal.wood, -0.3)) : v > 8.5 && v < 10 && u > 3 && u < 7 ? C('#f0d890') : 0) });
      return;
    }
    if (e <= 2) {
      legs(d, 3, 4, 11, 10, 4, pal.woodDark);
      d.box(2, 3, 4, 12, 10, 14, pal.wood, { front: (u, v) => (u > 1 && u < 8 && v > 3 && v < 12 ? (Math.floor(v + frame) % 3 ? C('#9ab0a8') : C('#c8d8d0')) : u > 9 && v > 6 && v < 8 ? C('#d8c890') : 0) });
      d.line(8, 6, 18, 5, 6, 26, C('#2a2a2a'));
      d.line(8, 6, 18, 11, 6, 26, C('#2a2a2a'));
      return;
    }
    if (e <= 4) {
      d.box(3, 4, 0, 10, 9, 8, BLACK);
      d.box(3, 4, 8, 10, 9, 11, C('#2a2a30'), { front: (u, v) => (u > 1 && u < 9 && v > 1.5 && v < 9.5 ? (Math.floor(v + frame) % 3 ? C('#3a6ad0') : C('#6a9af0')) : 0) });
      return;
    }
    d.box(2, 6, 0, 12, 8, 7, pal.woodDark);
    const scr = e === 8 ? withAlpha(C('#5ffff0'), 150) : (Math.floor(frame) % 2 ? C('#2a5aa0') : C('#3a6ab0'));
    d.box(2, 7, 9, 12, 1, 12, e === 8 ? withAlpha(C('#2ee8d8'), 60) : C('#1a1a1e'), { front: (u, v) => (u > 0.8 && u < 11.2 && v > 0.8 && v < 11 ? (v > 6 && u < 5 ? shade(scr, 0.2) : scr) : 0) });
    d.box(7, 7, 7, 2, 1, 2, C('#2a2a2e'));
  },
  coffee: (d, era, _v, frame) => {
    const pal = d.pal;
    const counter = era === '2010' || era === '2000' ? C('#f2f2f0') : pal.wood;
    d.box(1, 2, 0, 14, 13, 12, counter, { front: (u, v) => (v < 10 && Math.floor(u) === 7 ? shade(counter, -0.2) : 0) });
    const e = eraIndex(era);
    if (e === 0) {
      d.ell(8, 7, 13, 3, 1.5, pal.gold);
      d.box(6, 5, 12, 5, 5, 9, pal.gold);
      d.ell(8, 7, 22, 2.5, 1.2, shade(pal.gold, 0.2));
    } else if (e <= 3) {
      d.box(4, 4, 12, 7, 7, 10, e === 3 ? C('#e8e8e8') : C('#c8ccd4'));
      d.box(5, 8, 12, 5, 4, 4, withAlpha(C('#5a3a20'), 220));
    } else {
      d.box(3, 3, 12, 9, 8, 12, e >= 7 ? C('#2a2a2e') : C('#c8ccd4'), { front: (u, v) => (v > 7 && u > 2 && u < 7 ? C('#3a3a40') : 0) });
      d.box(5, 10, 12, 3, 3, 3, WHITE);
    }
    // vapor
    const [x, y] = d.pt(7, 8, 26);
    for (let i = 0; i < 3; i++) {
      const yy = y - ((frame * 2 + i * 3) % 8);
      const xx = x + Math.round(Math.sin((frame + i) * 1.7));
      d.p.set(xx, yy, withAlpha(WHITE, 150 - i * 30));
    }
  },
  vending: (d, era, _v, frame) => {
    const e = eraIndex(era);
    const body = e <= 2 ? C('#c83030') : e >= 7 ? C('#2a2a30') : C('#3a4a68');
    d.box(3, 4, 0, 10, 9, 30, body, {
      front: (u, v) => {
        if (e <= 2) {
          if (v > 16 && v < 26 && u > 1 && u < 9) return v > 19 && v < 23 ? WHITE : shade(body, 0.15);
          if (v > 6 && v < 9 && u > 6 && u < 9) return C('#2a2a2a');
          return 0;
        }
        if (u > 1 && u < 7 && v > 6 && v < 28) {
          if (Math.floor(v) % 5 === 0) return C('#9aa0a8');
          return [C('#e04848'), C('#f0c040'), C('#48a8e0'), C('#48c070')][(Math.floor(u) + Math.floor(v / 5)) % 4];
        }
        if (u > 7.5 && u < 9 && v > 18 && v < 24) return (Math.floor(v) + frame) % 3 === 0 ? C('#5fe07a') : C('#1a1a1a');
        return 0;
      },
    });
  },
  water: (d) => {
    d.box(4, 5, 0, 8, 7, 16, C('#e8e8e6'));
    d.dot(6, 12, 9, C('#4a8ae0'));
    d.dot(9, 12, 9, C('#e04848'));
    d.ell(8, 8, 22, 3.5, 2, withAlpha(C('#7ab8f0'), 210));
    d.box(5, 6, 16, 6, 5, 8, withAlpha(C('#7ab8f0'), 200));
  },
  bench: (d, era) => {
    const c = era === '2030' ? C('#2a6670') : d.pal.wood;
    legs(d, 2, 5, 27, 11, 6, d.pal.woodDark);
    d.box(1, 4, 6, 30, 9, 2, c, { top: (a) => (Math.floor(a) % 6 === 0 ? shade(c, -0.15) : 0) });
  },
  lamp: (d, era) => {
    const pal = d.pal;
    d.ell(8, 8, 0, 3, 1.5, C('#3a3a3a'));
    d.pole(8, 8, 0, 24, era === '2010' ? C('#2a2a2a') : pal.metalDark);
    const [x, y] = d.pt(8, 8, 24);
    d.p.disc(x + 0.5, y + 1, 9, withAlpha(pal.lamp, 40));
    d.p.poly([[x - 3, y - 6], [x + 4, y - 6], [x + 5, y + 1], [x - 4, y + 1]], era === '1960' ? C('#e8902c') : era === '1980' ? C('#ff5fa8') : C('#f2e2b0'));
    d.p.hline(x - 3, x + 4, y + 1, pal.lamp);
  },
  plant: (d, era, variant) => {
    const pal = d.pal;
    const pot = pal.pot;
    d.box(4, 4, 0, 8, 8, 7, pot, { top: () => C('#4a3020') });
    const [x, y] = d.pt(8, 8, 7);
    const leaf = pal.plant;
    const tall = variant % 2 === 1;
    if (era === '2030') {
      for (let i = 0; i < 6; i++) d.p.line(x, y, x - 6 + i * 2.4, y - 10 - (i % 3) * 4, i % 2 ? C('#3ac88a') : withAlpha(C('#5ffff0'), 220));
      return;
    }
    const blobs = tall ? [[0, -16, 5], [-4, -10, 4], [4, -11, 4], [0, -22, 4], [-3, -5, 3], [3, -5, 3]] : [[0, -7, 5], [-4, -4, 3.5], [4, -4, 3.5], [0, -11, 3.5]];
    if (tall) d.p.vline(x, y - 18, y, shade(leaf, -0.4));
    for (const [dx, dy, r] of blobs)
      d.p.disc(x + dx + 0.5, y + dy, r, (xx, yy) => (noise(xx, yy, variant) > 0.82 ? shade(leaf, -0.35) : xx < x + dx && yy < y + dy ? shade(leaf, 0.2) : leaf));
  },
  crate: (d, era) => {
    if (eraIndex(era) >= 3) {
      d.box(3, 4, 0, 10, 9, 12, BLACK, { front: (u, v) => ((u < 1.2 || u > 8.8) && (v < 1.2 || v > 10.8) ? CHROME : Math.abs(v - 6) < 0.5 ? C('#5a5a62') : 0) });
      return;
    }
    const w = d.pal.wood;
    d.box(3, 4, 0, 10, 9, 10, w, { front: (u, v) => (Math.floor(v) % 3 === 0 || u < 1 || u > 9 ? shade(w, -0.2) : 0) });
  },
  trophy_case: (d, era, variant) => {
    const frame = era === '2010' || era === '2030' ? C('#c8ccd4') : d.pal.woodDark;
    d.box(3, 4, 0, 10, 9, 30, frame, {
      front: (u, v) => {
        if (u < 1 || u > 9 || v < 1) return 0;
        if (Math.floor(v) % 9 === 0) return shade(frame, 0.2);
        return withAlpha(mix(d.pal.glass, C('#203040'), 0.5), 255);
      },
    });
    const n = Math.min(6, variant);
    for (let i = 0; i < n; i++) {
      const a = 5 + (i % 2) * 4;
      const z = 2 + Math.floor(i / 2) * 9;
      const [x, y] = d.pt(a, 12, z);
      d.p.rect(x - 1, y - 2, 2, 2, C('#7a5a1a'));
      d.p.vline(x, y - 5, y - 2, d.pal.gold);
      d.p.rect(x - 1, y - 7, 3, 2, d.pal.gold);
      d.p.set(x - 1, y - 7, C('#fff2b0'));
    }
  },
  mailbag: (d) => {
    const burlap = C('#b89a6a');
    for (const [a, b] of [[3, 6], [9, 4]]) {
      d.ell(a + 2, b + 2, 0, 4, 2, shade(burlap, -0.2));
      d.box(a, b, 0, 5, 5, 8, burlap);
      d.ell(a + 2.5, b + 2.5, 8, 2.6, 1.3, shade(burlap, -0.25));
    }
    d.box(6, 11, 0, 4, 3, 1, WHITE);
    d.box(7, 12, 1, 4, 3, 1, C('#e8e0c8'));
  },
  video_suite: (d, era, _v, frame) => {
    const pal = d.pal;
    d.box(1, 3, 0, 30, 12, 11, era === '1980' ? C('#3a3a44') : pal.wood);
    const crt = eraIndex(era) <= 4;
    for (const a of [2, 12, 22]) {
      if (crt) d.box(a, 3, 11, 8, 8, 8, C('#2a2a30'), { front: (u, v) => (u > 1 && u < 7 && v > 1.5 && v < 6.5 ? ((Math.floor(v) + frame + a) % 4 ? C('#5a8ad0') : C('#a8c8f0')) : 0) });
      else d.box(a, 4, 13, 8, 2, 8, C('#1a1a1e'), { front: (u, v) => (u > 0.8 && u < 7.2 && v > 1 && v < 7 ? screenTex(pal, frame + a, 'bars')(u, v - 1) : 0) });
    }
    if (crt) d.box(10, 11, 11, 10, 4, 3, C('#1a1a1e'), { front: (u, v) => (v > 1 && u > 1 && u < 4 ? C('#2a2a2a') : u > 6 && Math.floor(u) % 2 === 0 && v > 1 ? C('#e04848') : 0) });
  },
  dashboard: (d, _era, _v, frame) => {
    const pal = d.pal;
    d.ell(8, 8, 0, 4, 2, C('#3a3a40'));
    d.pole(8, 8, 0, 14, C('#5a5a62'));
    d.box(1, 7, 14, 14, 2, 14, C('#1e1e24'), {
      front: (u, v) => {
        if (u < 1 || u > 13 || v < 1 || v > 13) return 0;
        const A = Math.floor(u);
        const hgt = [3, 5, 4, 7, 6, 9, 8, 11, 10, 12][(A + frame) % 10];
        if (v < hgt && A % 2 === 0) return eraIndex(pal.era) >= 8 ? C('#5ffff0') : C('#5fe07a');
        return C('#2a3040');
      },
    });
  },
  bus: (d, era) => {
    const e = eraIndex(era);
    const body = e <= 2 ? C('#c86a2a') : e <= 4 ? C('#e8e4d8') : e <= 6 ? C('#2a2a30') : C('#1e3c48');
    const stripe = e <= 2 ? C('#f0d8a0') : e <= 4 ? C('#c83030') : e <= 6 ? C('#c9a24a') : C('#5ffff0');
    for (const a of [10, 50]) { d.ell(a, 15, 3, 4, 2, BLACK); }
    d.box(2, 2, 3, 60, 12, 26, body, {
      front: (u, v) => {
        if (v > 13 && v < 21 && u > 4 && u < 56 && Math.floor(u) % 9 !== 0) return mix(C('#2a3a4a'), d.pal.glass, 0.4);
        if (v > 8 && v < 10) return stripe;
        return 0;
      },
      side: (u, v) => (v > 12 && v < 22 && u > 1 && u < 11 ? mix(C('#2a3a4a'), d.pal.glass, 0.5) : v > 4 && v < 7 && (u < 3 || u > 9) ? C('#fff2b0') : 0),
    });
    d.box(2, 2, 29, 60, 12, 2, shade(body, 0.1));
    for (const a of [10, 50]) d.disc(a, 14, 4, 3.4, (x, y, dd) => (dd < 1.4 ? CHROME : C('#1a1a1a')));
  },
  workbench: (d) => {
    const pal = d.pal;
    legs(d, 2, 4, 27, 12, 10, pal.woodDark);
    d.box(1, 3, 10, 30, 12, 3, pal.wood, { top: (a, b) => (noise(Math.floor(a), Math.floor(b), 3) > 0.9 ? shade(pal.wood, -0.25) : 0) });
    d.box(3, 5, 13, 5, 4, 3, C('#5a5a62'));
    d.box(20, 6, 13, 6, 5, 2, C('#c83030'));
    d.box(12, 8, 13, 4, 2, 1, C('#e8c050'));
  },
};

function seat(d: D, era: EraId, len: number): void {
  const pal = d.pal;
  const f = era === '1920' ? C('#7a2e2a') : pal.fabric;
  const legsH = era === '1950' || era === '2010' ? 3 : 1;
  if (legsH > 1) legs(d, 2, 3, len - 2, 12, legsH, pal.woodDark);
  const tufted: Shader | undefined = era === '1920' ? (a, b) => ((Math.floor(a) + Math.floor(b)) % 4 === 0 ? shade(f, -0.3) : 0) : undefined;
  d.box(1, 2, legsH, len, 12, 6, f, { top: (a) => (len > 16 && Math.abs(a - len / 2) < 0.6 ? shade(f, -0.2) : 0) });
  d.box(1, 1, legsH, len, 4, 13, shade(f, -0.08), { front: tufted, top: () => shade(f, 0.1) });
  d.box(0, 1, legsH, 3, 13, 9, shade(f, 0.02));
  d.box(len - 2, 1, legsH, 3, 13, 9, shade(f, -0.04));
  if (era === '2030') d.line(1, 14, legsH, len, 14, legsH, withAlpha(C('#5ffff0'), 220));
  if (era === '1980') d.box(len / 2 - 3, 4, legsH + 6, 6, 4, 4, pal.fabric2);
}

function tableP(d: D, era: EraId, len: number): void {
  const pal = d.pal;
  const top = era === '2010' ? C('#f2f2f0') : era === '2030' ? withAlpha(C('#2a6670'), 230) : pal.wood;
  legs(d, 2, 3, len - 2, 11, 10, shade(top, -0.3));
  d.box(1, 2, 10, len, 12, 2, top);
  d.box(5, 5, 12, 6, 5, 1, WHITE);
  d.box(6, 6, 13, 5, 4, 1, C('#e8e0c8'));
  d.dot(len - 6, 8, 13, C('#e8e8e8'));
  d.dot(len - 6, 8, 14, C('#e8e8e8'));
  if (len > 32) d.box(len / 2 - 2, 4, 12, 5, 4, 2, pal.accent2);
}

function shelfP(d: D, era: EraId, kind: 'books' | 'records' | 'cds'): void {
  const pal = d.pal;
  const wood = era === '2010' ? C('#f2f2f0') : era === '2030' ? C('#1e3c48') : pal.woodDark;
  d.box(2, 4, 0, 12, 8, 32, wood, {
    front: (u, v) => {
      const A = Math.floor(u);
      const V = Math.floor(v);
      if (V % 8 === 0 || u < 1 || u > 11) return 0;
      const n = noise(A, Math.floor(V / 8), kind.length);
      if (kind === 'records') return n > 0.15 ? (A % 2 ? C('#1e1a1a') : mix(C('#e8dcc0'), C(['#c03a2a', '#2a5aa0', '#e0a030', '#3a8a4a'][A % 4]), 0.5)) : 0;
      if (kind === 'cds') return V % 8 > 3 && n > 0.1 ? (A % 2 ? C('#d8dce4') : C(['#c03a2a', '#2a5aa0', '#e0a030', '#3a8a4a', '#8a4ac0'][(A + V) % 5])) : 0;
      if (V % 8 < 2 && n < 0.5) return 0;
      return n > 0.2 ? C(['#8a2a2a', '#2a4a7a', '#3a6a3a', '#c09040', '#5a3a6a', '#d8d0bc'][Math.floor(n * 6)]) : 0;
    },
  });
}

function funP(d: D, era: EraId, frame: number): void {
  const e = eraIndex(era);
  const pal = d.pal;
  if (e === 0) {
    // rádio de chão (capela)
    d.box(3, 4, 0, 10, 8, 22, pal.wood, { front: (u, v) => (v > 8 && v < 18 && u > 2 && u < 8 ? (Math.floor(u + v) % 2 ? C('#d8b880') : shade(pal.wood, -0.3)) : v > 4 && v < 6 && u > 3 && u < 7 ? C('#f0d890') : 0) });
    const [x, y] = d.pt(8, 8, 22);
    d.p.ellipse(x, y - 1, 6, 4, pal.wood);
    return;
  }
  if (e <= 2) {
    // jukebox com tubos de luz
    const glow = [C('#ff5040'), C('#f0c040'), C('#48c0f0'), C('#ff70c0')];
    d.box(3, 4, 0, 10, 8, 20, era === '1960' ? pal.wood : C('#c83030'), {
      front: (u, v) => {
        if (u < 1.5 || u > 8.5) return glow[(Math.floor(v / 3) + frame) % 4];
        if (v > 10 && v < 17) return u > 2.5 && u < 7.5 ? C('#e8e0c0') : 0;
        if (v > 3 && v < 9) return grille(C('#c9a24a'))(u, v);
        return 0;
      },
    });
    const [x, y] = d.pt(8, 8, 20);
    d.p.ellipse(x, y, 7, 5, (xx) => glow[(Math.floor(xx / 2) + frame) % 4]);
    d.p.ellipse(x, y + 1, 4.5, 3, mix(C('#e8e0c0'), C('#ffffff'), 0.3));
    return;
  }
  if (e <= 5) {
    // fliperama
    const body = e === 3 ? C('#2a2a6a') : C('#1e1e24');
    d.box(3, 4, 0, 10, 9, 28, body, {
      front: (u, v) => {
        if (v > 24) return (Math.floor(u) + frame) % 2 ? C('#ff4fa3') : C('#f0c040');
        if (v > 13 && v < 22 && u > 1 && u < 9) return (Math.floor(u * 1.7 + v + frame * 2) % 7 === 0) ? C('#ffffff') : Math.floor(v) % 2 ? C('#102a50') : C('#1a3a70');
        if (v > 10 && v < 12 && u > 2 && u < 8) return Math.floor(u) % 2 ? C('#e04848') : C('#48a8e0');
        return 0;
      },
    });
    return;
  }
  if (e <= 7) {
    // toca-discos sobre móvel
    d.box(2, 4, 0, 12, 9, 12, pal.wood);
    d.box(3, 5, 12, 10, 7, 2, C('#2a2a2e'));
    d.ell(7, 8, 14, 3, 1.5, (x, y) => (Math.floor(x + y + frame) % 3 ? C('#1a1a1a') : C('#3a3a3a')));
    d.dot(7, 8, 15, pal.accent);
    return;
  }
  // cápsula de imersão
  d.ell(8, 8, 0, 6, 3, C('#1e3c48'));
  d.box(3, 3, 0, 10, 10, 20, C('#16303a'), { front: (u, v) => (v > 6 && v < 17 && u > 1 && u < 9 ? withAlpha(C('#5ffff0'), 90 + ((Math.floor(v) + frame) % 3) * 40) : 0) });
  d.ell(8, 8, 20, 5, 2.5, C('#5ffff0'));
}

/** Sprite de móvel com cache por (tipo, era, orientação, variante, quadro). */
export function furniture(kind: FurnKind, era: EraId, facing: Facing = 'SW', variant = 0, frame = 0): Sprite {
  const frames = FURN[kind].frames ?? 1;
  const fr = frames > 1 ? frame % frames : 0;
  const key = `${kind}|${era}|${facing}|${variant}|${fr}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const sp = make(kind, era, facing, variant, fr, (d) => PAINT[kind](d, era, variant, fr));
  cache.set(key, sp);
  return sp;
}

export function furnFrames(kind: FurnKind): number {
  return FURN[kind].frames ?? 1;
}

// ---------- equipamento do jogador → sprite e sala ----------

export type RoomKind = 'booth' | 'control' | 'rehearsal' | 'writing' | 'lounge' | 'office' | 'trophy' | 'meeting' | 'hall';

export interface EquipVisual {
  kind: FurnKind;
  room: RoomKind;
  variant?: number;
}

/** Mapeia os ids de EQUIPMENT (src/data/rules.ts) para sprites e salas. Desconhecido → caixa genérica. */
export function equipmentVisual(id: string, era: EraId): EquipVisual {
  const e = eraIndex(era);
  switch (id) {
    case 'ribbon_mic': return { kind: 'mic', room: 'booth', variant: 1 };
    case 'mixing_desk': return { kind: e >= 4 ? 'daw' : 'console', room: 'control' };
    case 'tape_machine': return { kind: 'tape', room: 'control' };
    case 'echo_chamber': return { kind: 'echo', room: 'control' };
    case 'synth_rack': return { kind: 'synth_rack', room: 'control' };
    case 'digital_console': return { kind: 'daw', room: 'control' };
    case 'plugin_suite': return { kind: e >= 8 ? 'holo_desk' : 'laptop_desk', room: 'control' };
    case 'ai_tools': return { kind: 'neural_rig', room: 'control' };
    case 'press_contract': return { kind: 'contracts', room: 'office' };
    case 'own_plant': return { kind: 'press', room: 'trophy' };
    case 'mail_list': return { kind: 'mailbag', room: 'office' };
    case 'video_suite': return { kind: 'video_suite', room: 'office' };
    case 'analytics': return { kind: 'dashboard', room: 'office' };
    case 'lounge': return { kind: 'fun', room: 'lounge' };
    case 'tour_bus': return { kind: 'bus', room: 'hall' };
    case 'tape_vault': return { kind: 'vault', room: 'trophy' };
    case 'digital_archive': return { kind: 'server', room: 'trophy' };
    default: return { kind: 'crate', room: 'trophy' };
  }
}


