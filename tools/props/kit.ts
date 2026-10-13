// Kit de desenho dos props de Masters (ilustrações de objetos em pixel art, vista 3/4 de cima).
// Segue o padrão dos assets desenhados à mão: contorno azul-marinho quase preto, 5–8 tons por
// material, luz vindo de cima à esquerda, sombras puxando para o roxo, brilhos duros nas bordas.
//
// Coordenadas: tudo em pixels nativos da tela (x para a direita, y para baixo). As funções 3D
// (box, cylV) usam um ponto de origem na tela e projeção oblíqua: a profundidade sobe para a
// direita (KX, KY), igual aos assets originais.
//
// Cada primitiva é uma "peça": é desenhada numa camada própria, ganha contorno interno escuro e
// depois é composta no desenho (ordem do pintor). Use k.group(() => …) para juntar várias
// primitivas numa peça só (um contorno em volta do conjunto).

import { C, Px, dith, mix, noise, rgba, pack, type Col } from '../../src/ui/pixel/px';

export type Ramp = readonly Col[];

const R = (...hex: string[]): Ramp => hex.map((h) => C(h));

/** Contorno externo de todos os props (azul-marinho quase preto, como nos originais). */
export const INK = C('#0a0a1c');

/** Materiais: rampas do escuro ao claro, tiradas dos assets originais. */
export const M = {
  wood: R('#1f0f1a', '#3a1619', '#56201a', '#73291a', '#8d3815', '#a64d1d', '#c46a2a', '#e79e3e'),
  woodDark: R('#160b16', '#2a1219', '#3e1a1b', '#55231c', '#6b2d1c', '#843c1f', '#a55427'),
  woodLight: R('#3a1a17', '#6b3418', '#94531f', '#b8742c', '#d29440', '#e8b45e', '#f6d38a'),
  gold: R('#2a1420', '#55220f', '#8e4421', '#bd651e', '#e3982e', '#f7c652', '#fde78b', '#fff6c8'),
  brass: R('#24131e', '#4a2412', '#7a4219', '#a8692a', '#cf963d', '#ebc266', '#fbe6a0'),
  copper: R('#22101a', '#4a1c16', '#7a3420', '#a8532c', '#cc7442', '#e89a64', '#f8c79a'),
  iron: R('#0e0d1a', '#17172a', '#232335', '#2f3042', '#3d3e50', '#55545f', '#7a6f6c', '#a18062'),
  black: R('#0a0914', '#15131e', '#1f1c28', '#2a2632', '#36313c', '#48404a', '#625452', '#8a7262'),
  steel: R('#0b0e1d', '#22263a', '#363b4e', '#4f5464', '#6c707c', '#8e9098', '#b6b6b6', '#e4e2da'),
  chrome: R('#121628', '#2c3248', '#4a5268', '#727a8c', '#a0a6b2', '#c9ccd2', '#eceef0', '#ffffff'),
  red: R('#13091b', '#360f18', '#5a1219', '#80191c', '#a52624', '#c8402e', '#e8673f'),
  velvet: R('#12081a', '#2c0c1c', '#4a1222', '#68182a', '#861f32', '#a32c3c', '#c04450'),
  cream: R('#3a2a2a', '#6e5648', '#9c8068', '#bd9d7f', '#d8bc98', '#ecd6b0', '#f8eccc', '#fffaea'),
  paper: R('#3c2c2a', '#7a6450', '#a88e70', '#cdb48e', '#e4d0a8', '#f2e4c2', '#fcf4dc'),
  green: R('#0f1414', '#20211b', '#343323', '#4d4d2a', '#5e6332', '#767939', '#929a4c'),
  emerald: R('#081414', '#0e2620', '#163a2c', '#1f5238', '#2b6c44', '#3f8a52', '#62aa66'),
  teal: R('#081420', '#0f2630', '#163a44', '#1f5258', '#2b6a6c', '#3f8684', '#64a8a0'),
  blue: R('#0a0e26', '#0e1436', '#1c2a5a', '#2c4478', '#446392', '#5798d2', '#7abdf0', '#bfe4fa'),
  navy: R('#08081c', '#0e1230', '#161c44', '#20285a', '#2c3872', '#3c4c8c', '#5266a6'),
  purple: R('#0e0820', '#1e0e36', '#30144e', '#46206a', '#5e2e86', '#7a44a4', '#9a66c4'),
  orange: R('#2a0e10', '#5a1c10', '#8a3412', '#bc5414', '#e07a1c', '#f6a032', '#fcca62'),
  yellow: R('#2a1a10', '#5a3a10', '#8a6014', '#bc8c1c', '#e0b42c', '#f6d44c', '#fcee8a'),
  pink: R('#2a0e1c', '#5a1c34', '#8a2c4c', '#bc4868', '#e06c88', '#f096a8', '#fcc4d0'),
  leather: R('#0e0a14', '#1c1218', '#2c1a1c', '#3e2420', '#543226', '#6c4430', '#8a5a3c'),
  rubber: R('#06060e', '#0e0e18', '#181822', '#22222e', '#30303c', '#44444f'),
  plastic: R('#1a1a26', '#3a3a48', '#5c5c68', '#82828a', '#a8a8ac', '#cacac8', '#ececea'),
  beige: R('#2e2420', '#5a4a3c', '#8a7860', '#b0a080', '#ccbe9c', '#e2d6b8', '#f4ecd6'),
  glass: R('#0a1430', '#14284c', '#20406a', '#2e5a88', '#4a7ea8', '#78a8c8', '#b4d6e8', '#eef8ff'),
  screen: R('#04060e', '#08101c', '#0e1a2c', '#16283e', '#203a52', '#2e5068'),
  skin: R('#2a1414', '#5a2a20', '#8a4a34', '#b06c4c', '#cc8c64', '#e4ae84', '#f6d0a8'),
  plant: R('#081408', '#102410', '#183818', '#22501e', '#2e6a24', '#43882e', '#62a63c', '#8cc454'),
  terracotta: R('#2a0e0c', '#561c12', '#80301a', '#a64824', '#c86434', '#e0844a', '#f4aa6c'),
  white: R('#3a3a4c', '#6e6e80', '#9c9caa', '#c4c4cc', '#e0e0e2', '#f2f2f0', '#ffffff'),
} as const satisfies Record<string, Ramp>;

export type MatName = keyof typeof M;
export type Mat = MatName | Ramp;

/** Cores de luz (LEDs, telas, lâmpadas). */
export const GLOW = {
  red: C('#ff3a2a'),
  green: C('#3cff6a'),
  amber: C('#ffb02a'),
  blue: C('#3ab4ff'),
  purple: C('#b45aff'),
  cyan: C('#5affee'),
  white: C('#fff8e0'),
  pink: C('#ff5ab4'),
};

export const ramp = (m: Mat): Ramp => (typeof m === 'string' ? M[m] : m);

/** Cor → (rampa, índice): permite ao chanfro automático subir/descer um tom em qualquer material. */
const REG = new Map<Col, [Ramp, number]>();
const seen = new Set<Ramp>();
function register(r: Ramp): void {
  if (seen.has(r)) return;
  seen.add(r);
  r.forEach((c, i) => {
    if (!REG.has(c)) REG.set(c, [r, i]);
  });
}

/** Todas as cores de rampa já usadas (para reduzir a paleta ao mudar de escala). */
export function usedColors(): Col[] {
  return [...REG.keys()];
}

/** Escolhe a cor da rampa para uma luz l (0..1), com pontilhado só na faixa de transição. */
export function tone(m: Mat, l: number, x: number, y: number): Col {
  const r = ramp(m);
  register(r);
  const v = Math.max(0, Math.min(0.9999, l)) * (r.length - 1);
  const i = Math.floor(v);
  const f = v - i;
  if (i >= r.length - 1) return r[r.length - 1];
  if (f < 0.38) return r[i];
  if (f > 0.62) return r[i + 1];
  return dith(x, y, (f - 0.38) / 0.24) ? r[i + 1] : r[i];
}

/** Textura somada à luz: grão de madeira, metal escovado, tela de alto-falante, couro, ruído. */
export type Tex = 'none' | 'wood' | 'woodV' | 'brushed' | 'grille' | 'mesh' | 'leather' | 'noise' | 'fabric' | 'stripes';

export function texel(t: Tex | undefined, u: number, v: number, x: number, y: number, seed = 0): number {
  switch (t) {
    case 'wood': {
      // veios longos ao longo de u
      const w = Math.sin(v * 0.9 + Math.sin(u * 0.05 + seed) * 2.2 + noise(Math.floor(u / 9), Math.floor(v / 3), seed) * 1.6);
      return w > 0.72 ? -0.1 : w < -0.85 ? 0.06 : 0;
    }
    case 'woodV': {
      const w = Math.sin(u * 0.9 + Math.sin(v * 0.05 + seed) * 2.2 + noise(Math.floor(u / 3), Math.floor(v / 9), seed) * 1.6);
      return w > 0.72 ? -0.1 : w < -0.85 ? 0.06 : 0;
    }
    case 'brushed':
      return (noise(0, Math.floor(v), seed) - 0.5) * 0.08 + (noise(Math.floor(u / 6), Math.floor(v), seed) > 0.93 ? 0.08 : 0);
    case 'grille':
      return (Math.floor(u) + Math.floor(v)) % 2 === 0 ? 0.06 : -0.1;
    case 'mesh':
      return Math.floor(u) % 3 === 0 || Math.floor(v) % 3 === 0 ? -0.12 : 0.04;
    case 'fabric':
      return (Math.floor(u) % 2) * 0.04 - (Math.floor(v) % 2) * 0.04 + (noise(x, y, seed) - 0.5) * 0.04;
    case 'leather':
      return noise(Math.floor(x / 3), Math.floor(y / 2), seed) > 0.85 ? -0.07 : 0;
    case 'noise':
      return noise(x, y, seed) > 0.9 ? -0.06 : noise(x, y, seed + 1) > 0.94 ? 0.05 : 0;
    case 'stripes':
      return Math.floor(v / 2) % 2 === 0 ? 0.05 : -0.05;
    default:
      return 0;
  }
}

export type Pt = readonly [number, number];
/** Sombreador de face: recebe (u, v) em pixels da face, (s, t) normalizados 0..1 e a posição na tela; devolve luz 0..1 ou uma cor pronta. */
export type FaceFn = (u: number, v: number, s: number, t: number, x: number, y: number) => number | { col: Col };

export interface FaceStyle {
  mat?: Mat;
  /** luz base (0..1) */
  l?: number;
  /** variação de luz de cima (t=0) para baixo (t=1); negativo escurece embaixo */
  grad?: number;
  /** variação de luz da esquerda (s=0) para a direita (s=1) */
  gradX?: number;
  tex?: Tex;
  seed?: number;
  fn?: FaceFn;
  /** cantos arredondados (em pixels), só para rect/quad */
  radius?: number;
}

export interface PartOpts {
  /** contorno da peça: 'auto' (tom mais escuro do material), uma cor, ou false */
  outline?: 'auto' | Col | false;
  /** chanfro automático: 1 px mais claro em cima/esquerda e mais escuro embaixo/direita (padrão: sim) */
  bevel?: boolean;
  /** sombra projetada da peça sobre o que já está desenhado, para baixo/direita, em px (padrão 2; 0 desliga) */
  cast?: number;
}

/** Projeção oblíqua: quanto a profundidade desloca na tela (para a direita e para cima). */
export const KX = 0.55;
export const KY = 0.42;

export class Kit {
  readonly out: Px;
  private layer: Px | null = null;
  private layerMat: Ramp | null = null;
  private depth = 0;

  constructor(readonly w: number, readonly h: number) {
    this.out = new Px(w, h);
  }

  // ------------------------------------------------------------------ camadas

  private target(): Px {
    return this.layer ?? this.out;
  }

  /** Abre uma peça (camada), roda fn e fecha com contorno. Peças aninhadas entram na mesma camada. */
  group(fn: () => void, o: PartOpts & { mat?: Mat } = {}): void {
    if (this.layer) {
      fn();
      return;
    }
    this.layer = new Px(this.w, this.h);
    this.layerMat = o.mat ? ramp(o.mat) : null;
    this.depth++;
    try {
      fn();
    } finally {
      this.depth--;
      const L = this.layer;
      const lm = this.layerMat;
      this.layer = null;
      this.layerMat = null;
      this.flatten(L, o.outline ?? 'auto', lm, o.bevel ?? true, o.cast ?? 2);
    }
  }

  private part(m: Mat | null, o: PartOpts, fn: () => void): void {
    if (this.layer) {
      if (!this.layerMat && m) this.layerMat = ramp(m);
      fn();
      return;
    }
    this.group(fn, { ...o, mat: m ?? undefined });
  }

  private flatten(L: Px, outline: 'auto' | Col | false, m: Ramp | null, bevel: boolean, cast: number): void {
    const { w, h } = this;
    if (cast > 0) {
      // sombra projetada: escurece o que já existe logo abaixo/à direita da peça (dá profundidade entre peças)
      const out = this.out;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          if (L.d[i] || !out.d[i]) continue;
          let k = 0;
          for (let s = 1; s <= cast; s++) if (L.get(x - s, y - s) || (L.get(x - s + 1, y - s) && s > 1)) k = Math.max(k, cast - s + 1);
          if (!k) continue;
          out.d[i] = darker(out.d[i], k >= 2 ? 2 : 1);
        }
    }
    if (bevel) {
      // chanfro: desloca um tom na rampa do material nas bordas internas (luz de cima à esquerda)
      const src = L.clone();
      const at = (x: number, y: number) => src.get(x, y);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const c = src.d[y * w + x];
          if (!c) continue;
          const hit = REG.get(c);
          if (!hit) continue;
          const [rm, i] = hit;
          // a 2 px da borda (a 1 px fica o contorno)
          const up = !at(x, y - 2) && at(x, y - 1);
          const lf = !at(x - 2, y) && at(x - 1, y);
          const dn = !at(x, y + 2) && at(x, y + 1);
          const rt = !at(x + 2, y) && at(x + 1, y);
          if (up || lf) L.d[y * w + x] = rm[Math.min(rm.length - 1, i + (up ? 2 : 1))];
          else if (dn || rt) L.d[y * w + x] = rm[Math.max(0, i - 1)];
        }
    }
    if (outline !== false) {
      const oc = outline === 'auto' ? mix(m ? m[0] : INK, INK, 0.45) : outline;
      const add: number[] = [];
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          if (!L.d[i]) continue;
          // pixel de borda da própria peça vira contorno
          if (!L.get(x - 1, y) || !L.get(x + 1, y) || !L.get(x, y - 1) || !L.get(x, y + 1)) add.push(i);
        }
      for (const i of add) L.d[i] = oc;
    }
    for (let i = 0; i < w * h; i++) if (L.d[i]) this.out.set(i % w, Math.floor(i / w), L.d[i]);
  }

  // ------------------------------------------------------------------ pixels

  px(x: number, y: number, c: Col): void {
    this.target().set(Math.floor(x), Math.floor(y), c);
  }

  /** Linha de 1 px (Bresenham), sem contorno: para detalhes, cordas, riscos. */
  line(x0: number, y0: number, x1: number, y1: number, c: Col): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) {
        e += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        e += dx;
        y0 += sy;
      }
    }
  }

  /** Retângulo chapado sem contorno (detalhe). */
  fill(x: number, y: number, w: number, h: number, c: Col): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }

  // ------------------------------------------------------------------ faces e polígonos

  /** Polígono qualquer na tela; a luz vem de style (com u, v = posição relativa ao canto superior esquerdo). */
  poly(pts: readonly Pt[], style: FaceStyle, o: PartOpts = {}): void {
    const mat = style.mat ?? 'wood';
    this.part(mat, o, () => {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const [x, y] of pts) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
      const W = Math.max(1, x1 - x0);
      const H = Math.max(1, y1 - y0);
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
        for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
          if (!inside(pts, x + 0.5, y + 0.5)) continue;
          this.shadePx(x, y, x - x0, y - y0, (x - x0) / W, (y - y0) / H, style);
        }
    });
  }

  /** Paralelogramo O + s·A + t·B (s, t ∈ [0,1]); u, v em pixels ao longo de A e B. */
  quad(O: Pt, A: Pt, B: Pt, style: FaceStyle, o: PartOpts = {}): void {
    const mat = style.mat ?? 'wood';
    const det = A[0] * B[1] - A[1] * B[0];
    if (Math.abs(det) < 1e-6) return;
    const la = Math.hypot(A[0], A[1]);
    const lb = Math.hypot(B[0], B[1]);
    const xs = [O[0], O[0] + A[0], O[0] + B[0], O[0] + A[0] + B[0]];
    const ys = [O[1], O[1] + A[1], O[1] + B[1], O[1] + A[1] + B[1]];
    this.part(mat, o, () => {
      for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
        for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
          const px = x + 0.5 - O[0];
          const py = y + 0.5 - O[1];
          const s = (px * B[1] - py * B[0]) / det;
          const t = (A[0] * py - A[1] * px) / det;
          if (s < -0.001 || s > 1.001 || t < -0.001 || t > 1.001) continue;
          if (style.radius && !inRounded(s * la, t * lb, la, lb, style.radius)) continue;
          this.shadePx(x, y, s * la, t * lb, s, t, style);
        }
    });
  }

  private shadePx(x: number, y: number, u: number, v: number, s: number, t: number, st: FaceStyle): void {
    const mat = st.mat ?? 'wood';
    let l = st.l ?? 0.55;
    if (st.fn) {
      const r = st.fn(u, v, s, t, x, y);
      if (typeof r !== 'number') {
        if (r.col) this.px(x, y, r.col);
        return;
      }
      l = r;
    }
    l += (st.grad ?? 0) * t + (st.gradX ?? 0) * s + texel(st.tex, u, v, x, y, st.seed ?? 0);
    this.px(x, y, tone(mat, l, x, y));
  }

  /** Retângulo de frente (face plana voltada para o observador). */
  rect(x: number, y: number, w: number, h: number, style: FaceStyle, o: PartOpts = {}): void {
    this.quad([x, y], [w, 0], [0, h], style, o);
  }

  // ------------------------------------------------------------------ sólidos

  /**
   * Caixa: canto frontal inferior esquerdo na tela em (x, y); largura w, altura h, profundidade d.
   * Faces: frente (front), tampa (top) e lateral direita (side). Devolve os cantos úteis.
   */
  box(
    x: number,
    y: number,
    w: number,
    h: number,
    d: number,
    mat: Mat,
    o: PartOpts & { front?: Partial<FaceStyle>; top?: Partial<FaceStyle>; side?: Partial<FaceStyle>; tex?: Tex; bevel?: boolean; hideTop?: boolean } = {},
  ): { fx: number; fy: number; fw: number; fh: number; dx: number; dy: number } {
    const dx = d * KX;
    const dy = d * KY;
    const tex = o.tex;
    this.part(mat, o, () => {
      if (!o.hideTop && d > 0) this.quad([x, y - h], [w, 0], [dx, -dy], { mat, l: 0.8, tex, grad: 0.06, ...o.top, fn: o.top?.fn }, o);
      if (d > 0) this.quad([x + w, y - h], [dx, -dy], [0, h], { mat, l: 0.32, tex: tex === 'wood' ? 'wood' : tex, grad: -0.06, gradX: -0.08, ...o.side }, o);
      this.quad([x, y - h], [w, 0], [0, h], { mat, l: 0.56, tex, grad: -0.12, ...o.front }, o);
      if (o.bevel !== false) {
        const r = ramp(mat);
        // brilho na aresta frontal de cima e na vertical da esquerda
        for (let i = 0; i < w; i++) this.px(x + i, y - h, tone(r, 0.95, x + i, y - h));
        for (let j = 1; j < h; j++) this.px(x, y - h + j, tone(r, 0.72, x, y - h + j));
      }
    });
    return { fx: x, fy: y - h, fw: w, fh: h, dx, dy };
  }

  /** Cilindro vertical: centro da base na tela (cx, by), raio rx, altura h. Tampa elíptica (ry = rx·e). */
  cylV(cx: number, by: number, rx: number, h: number, mat: Mat, o: PartOpts & { e?: number; tex?: Tex; top?: Partial<FaceStyle> | false; l?: number; hl?: number } = {}): void {
    const e = o.e ?? 0.38;
    const ry = Math.max(1, rx * e);
    const base = o.l ?? 0.5;
    this.part(mat, o, () => {
      for (let y = Math.floor(by - h - ry); y <= Math.ceil(by + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const nx = (x + 0.5 - cx) / rx;
          if (Math.abs(nx) > 1) continue;
          const yb = by + ry * Math.sqrt(1 - nx * nx);
          const yt = by - h - ry * Math.sqrt(1 - nx * nx);
          if (y + 0.5 < yt || y + 0.5 > yb) continue;
          const l = base + cylLight(nx, o.hl ?? -0.45) + texel(o.tex, (nx + 1) * rx, y - (by - h), x, y);
          this.px(x, y, tone(mat, l, x, y));
        }
      if (o.top !== false) this.ellipse(cx, by - h, rx, ry, { mat, l: 0.8, ...(o.top ?? {}) });
    });
  }

  /** Cilindro deitado (eixo horizontal na tela): centro da face da direita... simplificado como barra com sombreamento vertical. */
  cylH(x0: number, x1: number, cy: number, ry: number, mat: Mat, o: PartOpts & { cap?: boolean; capRx?: number; l?: number; tex?: Tex } = {}): void {
    const base = o.l ?? 0.5;
    const capRx = o.capRx ?? Math.max(1, ry * 0.4);
    this.part(mat, o, () => {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        const ny = (y + 0.5 - cy) / ry;
        if (Math.abs(ny) > 1) continue;
        const l = base + cylLight(ny, -0.4);
        for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) this.px(x, y, tone(mat, l + texel(o.tex, x - x0, y, x, y), x, y));
      }
      if (o.cap !== false) this.ellipse(x1, cy, capRx, ry, { mat, l: 0.7 });
    });
  }

  /** Elipse de frente. shade: 'flat' (luz l com gradiente), 'sphere' (bola), 'dome', 'cone' (alto-falante, côncavo), 'disc' (prato/disco com brilho anelar). */
  ellipse(cx: number, cy: number, rx: number, ry: number, style: FaceStyle & { shade?: 'flat' | 'sphere' | 'cone' | 'disc' }, o: PartOpts = {}): void {
    const mat = style.mat ?? 'wood';
    this.part(mat, o, () => {
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
        for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
          const nx = (x + 0.5 - cx) / rx;
          const ny = (y + 0.5 - cy) / ry;
          const r2 = nx * nx + ny * ny;
          if (r2 > 1) continue;
          let l = style.l ?? 0.55;
          const sh = style.shade ?? 'flat';
          if (sh === 'sphere') {
            const nz = Math.sqrt(1 - r2);
            l += (-0.55 * nx - 0.6 * ny + 0.6 * nz) * 0.45 - 0.1;
            if ((nx + 0.38) ** 2 + (ny + 0.42) ** 2 < 0.05) l += 0.35;
          } else if (sh === 'cone') {
            // côncavo: escuro em cima à esquerda, claro embaixo à direita
            l += (0.35 * nx + 0.35 * ny) * Math.sqrt(r2) * 0.8 - 0.1 * (1 - Math.sqrt(r2));
          } else if (sh === 'disc') {
            const ang = Math.atan2(ny, nx);
            l += Math.cos(2 * ang + 0.8) * 0.12 * Math.sqrt(r2);
          } else {
            l += (style.grad ?? 0) * ((ny + 1) / 2) + (style.gradX ?? 0) * ((nx + 1) / 2);
          }
          if (style.fn) {
            const r = style.fn(x - (cx - rx), y - (cy - ry), (nx + 1) / 2, (ny + 1) / 2, x, y);
            if (typeof r !== 'number') {
              this.px(x, y, r.col);
              continue;
            }
            l = r;
          }
          l += texel(style.tex, x - cx, y - cy, x, y, style.seed ?? 0);
          this.px(x, y, tone(mat, l, x, y));
        }
    });
  }

  /** Anel elíptico (aro, borda de prato, cinta). */
  ring(cx: number, cy: number, rx: number, ry: number, th: number, style: FaceStyle, o: PartOpts = {}): void {
    const mat = style.mat ?? 'brass';
    this.part(mat, o, () => {
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
        for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
          const nx = (x + 0.5 - cx) / rx;
          const ny = (y + 0.5 - cy) / ry;
          const r = Math.sqrt(nx * nx + ny * ny);
          const ri = 1 - th / Math.min(rx, ry);
          if (r > 1 || r < ri) continue;
          const l = (style.l ?? 0.55) + (-0.3 * nx - 0.35 * ny) * 0.5;
          this.px(x, y, tone(mat, l, x, y));
        }
    });
  }

  /** Tubo grosso ao longo de uma poligonal (pernas, hastes, braços de instrumento, cabos), sombreado como cilindro. */
  tube(pts: readonly Pt[], th: number, mat: Mat, o: PartOpts & { l?: number; cap?: boolean } = {}): void {
    const r = th / 2;
    const base = o.l ?? 0.5;
    this.part(mat, o, () => {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const [x, y] of pts) {
        x0 = Math.min(x0, x - r - 1);
        y0 = Math.min(y0, y - r - 1);
        x1 = Math.max(x1, x + r + 1);
        y1 = Math.max(y1, y + r + 1);
      }
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
        for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
          const P: Pt = [x + 0.5, y + 0.5];
          let best = Infinity;
          let side = 0;
          for (let i = 0; i < pts.length - 1; i++) {
            const [ax, ay] = pts[i];
            const [bx, by] = pts[i + 1];
            const vx = bx - ax;
            const vy = by - ay;
            const L2 = vx * vx + vy * vy || 1;
            const t = Math.max(0, Math.min(1, ((P[0] - ax) * vx + (P[1] - ay) * vy) / L2));
            if (o.cap === false && (t <= 0 || t >= 1) && (i === 0 || i === pts.length - 2)) {
              if ((i === 0 && t <= 0) || (i === pts.length - 2 && t >= 1)) continue;
            }
            const qx = ax + vx * t - P[0];
            const qy = ay + vy * t - P[1];
            const dd = Math.hypot(qx, qy);
            if (dd < best) {
              best = dd;
              // lado: produto vetorial (normal "para cima/esquerda" fica clara)
              const L = Math.sqrt(L2);
              const nx = -vy / L;
              const ny = vx / L;
              const s = -(qx * nx + qy * ny);
              side = s / r;
              if (nx * -0.6 + ny * -0.8 < 0) side = -side;
            }
          }
          if (best > r) continue;
          this.px(x, y, tone(mat, base + cylLight(side, -0.35), x, y));
        }
    });
  }

  /**
   * Extrusão: dá espessura (profundidade d) a qualquer contorno de frente. Desenha as paredes visíveis
   * (as que olham para cima e para a direita, na direção da profundidade) e depois a face da frente,
   * com brilho na aresta onde a frente encontra a parede de cima. É a base da sensação de volume.
   * Paredes voltadas para cima ficam claras (como tampa), as voltadas para a direita ficam escuras.
   */
  extrude(pts: readonly Pt[], d: number, mat: Mat, o: PartOpts & { front?: FaceStyle; wall?: { mat?: Mat; l?: number; tex?: Tex }; edge?: number; back?: boolean } = {}): void {
    const ox = d * KX;
    const oy = -d * KY;
    const n = pts.length;
    const wm = o.wall?.mat ?? mat;
    const wl = o.wall?.l ?? 0;
    this.part(mat, o, () => {
      if (d > 0) {
        // paredes: varre a face em passos de 1 px ao longo da profundidade, de trás para a frente
        const steps = Math.max(1, Math.ceil(Math.hypot(ox, oy)));
        const norms: { nx: number; ny: number }[] = [];
        for (let i = 0; i < n; i++) {
          const [ax, ay] = pts[i];
          const [bx, by] = pts[(i + 1) % n];
          const ex = bx - ax;
          const ey = by - ay;
          const L = Math.hypot(ex, ey) || 1;
          let nx = ey / L;
          let ny = -ex / L;
          if (inside(pts, (ax + bx) / 2 + nx * 0.8, (ay + by) / 2 + ny * 0.8)) {
            nx = -nx;
            ny = -ny;
          }
          norms.push({ nx, ny });
        }
        for (let st = steps; st >= 1; st--) {
          const t = st / steps;
          const sx = ox * t;
          const sy = oy * t;
          for (let i = 0; i < n; i++) {
            const { nx, ny } = norms[i];
            if (nx * ox + ny * oy <= 0) continue; // parede escondida
            const [ax, ay] = pts[i];
            const [bx, by] = pts[(i + 1) % n];
            const up = Math.max(0, -ny);
            const right = Math.max(0, nx);
            const l = 0.3 + up * 0.52 - right * 0.06 + wl + (1 - t) * 0.04;
            const len = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 1.5));
            for (let j = 0; j <= len; j++) {
              const q = j / len;
              const x = Math.floor(ax + (bx - ax) * q + sx);
              const y = Math.floor(ay + (by - ay) * q + sy);
              const u = Math.hypot(bx - ax, by - ay) * q;
              this.px(x, y, tone(wm, l + texel(o.wall?.tex, u, st, x, y), x, y));
            }
          }
        }
        if (o.back !== false) {
          // fecha buracos da varredura: face de trás com a luz da parede de cima
          this.polyRaw(pts.map(([x, y]) => [x + ox, y + oy] as Pt), { mat: wm, l: 0.62 + wl });
          for (let st = steps; st >= 1; st--) {
            const t = st / steps;
            // preenche o miolo entre frente e fundo com o tom de parede da direita
            this.polyFill(pts.map(([x, y]) => [x + ox * t, y + oy * t] as Pt), (x, y) => !this.target().get(x, y) ? tone(wm, 0.34 + wl, x, y) : 0);
          }
        }
      }
      const fs: FaceStyle = { mat, l: 0.56, grad: -0.12, ...(o.front ?? {}) };
      this.polyRaw(pts, fs);
      // aresta de brilho onde a frente encontra paredes que olham para cima
      const e = o.edge ?? 0.3;
      if (d > 0 && e > 0) {
        for (let i = 0; i < n; i++) {
          const [ax, ay] = pts[i];
          const [bx, by] = pts[(i + 1) % n];
          const ex = bx - ax;
          const ey = by - ay;
          const L = Math.hypot(ex, ey) || 1;
          let nx = ey / L;
          let ny = -ex / L;
          if (inside(pts, (ax + bx) / 2 + nx * 0.8, (ay + by) / 2 + ny * 0.8)) {
            nx = -nx;
            ny = -ny;
          }
          if (ny > -0.35) continue;
          const len = Math.max(1, Math.ceil(L * 1.5));
          for (let j = 0; j <= len; j++) {
            const x = Math.floor(ax + ex * (j / len) - nx * 0.6);
            const y = Math.floor(ay + ey * (j / len) - ny * 0.6);
            if (!inside(pts, x + 0.5, y + 0.5)) continue;
            this.px(x, y, tone(fs.mat ?? mat, (fs.l ?? 0.56) + e + 0.1 * -ny, x, y));
          }
        }
      }
    });
  }

  /** Caixa com cantos arredondados e espessura (extrusão de um retângulo arredondado). */
  rbox(x: number, y: number, w: number, h: number, d: number, r: number, mat: Mat, o: PartOpts & { front?: FaceStyle; wall?: { mat?: Mat; l?: number; tex?: Tex }; edge?: number } = {}): { fx: number; fy: number; dx: number; dy: number } {
    this.extrude(roundRect(x, y - h, w, h, r), d, mat, o);
    return { fx: x, fy: y - h, dx: d * KX, dy: d * KY };
  }

  /** Disco/cilindro "de frente" com espessura: elipse extrudada (botões grossos, tambores de frente, rodas, bolachas). */
  disc(cx: number, cy: number, rx: number, ry: number, d: number, mat: Mat, o: PartOpts & { front?: FaceStyle & { shade?: 'flat' | 'sphere' | 'cone' | 'disc' }; wall?: { mat?: Mat; l?: number; tex?: Tex }; edge?: number } = {}): void {
    this.group(() => {
      this.extrude(ellipsePts(cx, cy, rx, ry), d, mat, { ...o, front: { mat, l: 0.56, ...(o.front ?? {}) } });
      if (o.front?.shade && o.front.shade !== 'flat') this.ellipse(cx, cy, rx - 0.5, ry - 0.5, { mat, ...o.front });
    }, o);
  }

  /** Polígono sem abrir peça própria (uso interno). */
  private polyRaw(pts: readonly Pt[], style: FaceStyle): void {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [x, y] of pts) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    const W = Math.max(1, x1 - x0);
    const H = Math.max(1, y1 - y0);
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        if (!inside(pts, x + 0.5, y + 0.5)) continue;
        this.shadePx(x, y, x - x0, y - y0, (x - x0) / W, (y - y0) / H, style);
      }
  }

  private polyFill(pts: readonly Pt[], fn: (x: number, y: number) => Col): void {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [x, y] of pts) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        if (!inside(pts, x + 0.5, y + 0.5)) continue;
        const c = fn(x, y);
        if (c) this.px(x, y, c);
      }
  }

  // ------------------------------------------------------------------ detalhes prontos

  /** Botão giratório (knob) com marcador. */
  knob(cx: number, cy: number, r: number, mat: Mat = 'black', mark: Col = C('#e8dcc0')): void {
    this.group(() => {
      this.ellipse(cx, cy + r * 0.25, r, r * 0.9, { mat, l: 0.25 });
      this.ellipse(cx, cy, r * 0.82, r * 0.72, { mat, shade: 'sphere', l: 0.55 });
    });
    if (r >= 3) this.line(cx, cy, cx - r * 0.35, cy - r * 0.55, mark);
  }

  /** Cantoneira de metal (protetor de quina, como nos cases e amplificadores). corner: 'tl'|'tr'|'bl'|'br'. */
  corner(x: number, y: number, s: number, corner: 'tl' | 'tr' | 'bl' | 'br', mat: Mat = 'brass'): void {
    const sx = corner === 'tl' || corner === 'bl' ? 1 : -1;
    const sy = corner === 'tl' || corner === 'tr' ? 1 : -1;
    const pts: Pt[] = [[x, y], [x + sx * s, y], [x + sx * s, y + sy * (s * 0.45)], [x + sx * (s * 0.45), y + sy * s], [x, y + sy * s]];
    this.poly(pts, { mat, l: 0.62, grad: sy > 0 ? -0.15 : 0.1, gradX: sx > 0 ? -0.1 : 0.1 });
    this.screw(x + sx * (s * 0.3) - (sx < 0 ? 1 : 0), y + sy * (s * 0.3) - (sy < 0 ? 1 : 0), mat);
  }

  /** Parafuso / rebite. */
  screw(cx: number, cy: number, mat: Mat = 'steel'): void {
    const r = ramp(mat);
    this.px(cx, cy, r[r.length - 2]);
    this.px(cx + 1, cy, r[3]);
    this.px(cx, cy + 1, r[2]);
    this.px(cx + 1, cy + 1, r[1]);
  }

  /** LED aceso com halo. */
  led(cx: number, cy: number, c: Col, r = 1, halo = 3): void {
    this.glow(cx, cy, halo, c, 0.45);
    const [R0, G, B] = rgba(c);
    const hot = pack(Math.min(255, R0 + 120), Math.min(255, G + 120), Math.min(255, B + 120));
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 0.5) this.px(cx + x, cy + y, c);
    this.px(cx, cy, hot);
  }

  /** Halo luminoso (mistura aditiva suave, sem contorno). Desenha direto na saída. */
  glow(cx: number, cy: number, r: number, c: Col, k = 0.5): void {
    const [R0, G, B] = rgba(c);
    const t = this.target();
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
        if (d > 1) continue;
        const a = (1 - d) * (1 - d) * k;
        if (!dith(x, y, Math.min(1, a * 2.2))) continue;
        const cur = t.get(x, y);
        if (!cur) continue;
        const [r0, g0, b0, a0] = rgba(cur);
        t.put(x, y, pack(Math.min(255, r0 + R0 * a), Math.min(255, g0 + G * a), Math.min(255, b0 + B * a), a0));
      }
  }

  /** Mostrador VU analógico com ponteiro. */
  vu(x: number, y: number, w: number, h: number, needle = 0.35): void {
    this.group(() => {
      this.rect(x, y, w, h, { mat: 'cream', l: 0.78, grad: -0.25 });
    }, { outline: mix(M.brass[1], INK, 0.3) });
    const cx = x + w / 2;
    const cy = y + h + 1;
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI * (0.8 - i * 0.1);
      const R0 = Math.min(w * 0.42, h * 0.8);
      this.px(cx + Math.cos(a) * R0, cy - Math.sin(a) * R0, i >= 5 ? C('#c02a1a') : C('#3a2a20'));
    }
    const a = Math.PI * (0.85 - needle * 0.7);
    this.line(cx, cy - 1, cx + Math.cos(a) * h * 0.85, cy - 1 - Math.sin(a) * h * 0.85, C('#1a1010'));
  }

  /** Teclas de piano em vista frontal-superior (faixa de largura w, n teclas brancas). */
  keys(x: number, y: number, w: number, h: number, n: number, o: { ivory?: Mat; ebony?: Mat; slant?: number } = {}): void {
    const ivory = ramp(o.ivory ?? 'cream');
    const ebony = ramp(o.ebony ?? 'black');
    const kw = w / n;
    this.group(() => {
      for (let i = 0; i < n; i++) {
        const x0 = Math.round(x + i * kw);
        const x1 = Math.round(x + (i + 1) * kw) - 1;
        for (let j = 0; j < h; j++) for (let xx = x0; xx <= x1; xx++) this.px(xx, y + j, xx === x1 ? ivory[2] : j === h - 1 ? ivory[3] : ivory[ivory.length - 2 - (j > h * 0.7 ? 1 : 0)]);
      }
    }, { outline: mix(ivory[0], INK, 0.4) });
    const pat = [1, 1, 0, 1, 1, 1, 0];
    for (let i = 0; i < n - 1; i++) {
      if (!pat[i % 7]) continue;
      const bx = Math.round(x + (i + 1) * kw - kw * 0.32);
      const bw = Math.max(1, Math.round(kw * 0.64));
      for (let j = 0; j < Math.round(h * 0.6); j++) for (let xx = bx; xx < bx + bw; xx++) this.px(xx, y + j, j === 0 || xx === bx ? ebony[4] : ebony[1]);
    }
  }

  /** Riscos de texto (linhas de "escrita" em papel, etiquetas, telas). */
  scribble(x: number, y: number, w: number, lines: number, c: Col, gap = 3, seed = 1): void {
    for (let i = 0; i < lines; i++) {
      const lw = Math.round(w * (i === lines - 1 ? 0.55 : 0.75 + noise(i, seed, 7) * 0.25));
      for (let j = 0; j < lw; j++) if (noise(j, i, seed) > 0.18) this.px(x + j, y + i * gap, c);
    }
  }

  /** Grade de alto-falante (tecido ou metal) dentro de um retângulo. */
  grille(x: number, y: number, w: number, h: number, mat: Mat = 'iron', tex: Tex = 'grille'): void {
    this.rect(x, y, w, h, { mat, l: 0.42, tex, grad: -0.12 });
  }

  /** Cone de alto-falante redondo. */
  speaker(cx: number, cy: number, r: number, mat: Mat = 'black'): void {
    this.group(() => {
      this.ellipse(cx, cy, r, r, { mat, l: 0.3 });
      this.ellipse(cx, cy, r * 0.82, r * 0.82, { mat, shade: 'cone', l: 0.42 });
      this.ellipse(cx, cy, r * 0.28, r * 0.28, { mat, shade: 'sphere', l: 0.5 });
    });
  }

  /** Sombra suave no chão (elipse escura translúcida) — os originais não usam; disponível para cenas. */
  shadow(cx: number, cy: number, rx: number, ry: number): void {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d <= 1) this.out.set(x, y, C('#0a0a1c', 70));
      }
  }

  // ------------------------------------------------------------------ acabamento

  /** Contorno externo de 1 px (INK) em volta de toda a silhueta + corte para o conteúdo. */
  finish(pad = 3): Px {
    const { w, h } = this;
    const src = this.out;
    const o = new Px(w, h);
    o.d.set(src.d);
    // pixels semitransparentes viram opacos (pixel art não tem borda suave)
    for (let i = 0; i < w * h; i++) {
      const a = o.d[i] >>> 24;
      if (a && a < 128) o.d[i] = 0;
      else if (a) o.d[i] = (o.d[i] | 0xff000000) >>> 0;
    }
    const edge: number[] = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (o.d[y * w + x]) continue;
        if (o.get(x - 1, y) || o.get(x + 1, y) || o.get(x, y - 1) || o.get(x, y + 1)) edge.push(y * w + x);
      }
    for (const i of edge) o.d[i] = INK;
    // recorte
    let x0 = w;
    let y0 = h;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (o.d[y * w + x]) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
    if (x1 < 0) return new Px(1, 1);
    const cw = x1 - x0 + 1 + pad * 2;
    const ch = y1 - y0 + 1 + pad * 2;
    const c = new Px(cw, ch);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) c.d[(y - y0 + pad) * cw + (x - x0 + pad)] = o.d[y * w + x];
    return c;
  }
}

/** Luz de cilindro para a coordenada normalizada n ∈ [-1, 1] através do eixo; hl = posição do brilho. */
export function cylLight(n: number, hl = -0.45): number {
  const d = n - hl;
  let l = 0.32 - d * d * 0.32 + (1 - Math.abs(n)) * 0.12;
  if (Math.abs(d) < 0.14) l += 0.26;
  if (n > 0.82) l += 0.08; // luz refletida na borda de trás
  return l;
}

/** Desce n tons na rampa da cor (se conhecida); senão mistura com INK. */
export function darker(c: Col, n = 1): Col {
  const hit = REG.get(c);
  if (hit) return hit[0][Math.max(0, hit[1] - n)];
  return mix(c, INK, 0.22 * n);
}

/** Sobe n tons na rampa da cor (se conhecida); senão clareia. */
export function lighter(c: Col, n = 1): Col {
  const hit = REG.get(c);
  if (hit) return hit[0][Math.min(hit[0].length - 1, hit[1] + n)];
  return mix(c, C('#fff6e0'), 0.2 * n);
}

function inRounded(u: number, v: number, w: number, h: number, r: number): boolean {
  const cx = u < r ? r : u > w - r ? w - r : u;
  const cy = v < r ? r : v > h - r ? h - r : v;
  return (u - cx) ** 2 + (v - cy) ** 2 <= r * r + 0.5;
}

/** Contorno de retângulo arredondado (sentido horário na tela). */
export function roundRect(x: number, y: number, w: number, h: number, r: number): Pt[] {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (r < 0.5) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const pts: Pt[] = [];
  const seg = Math.max(2, Math.ceil(r / 2));
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (Math.PI / 2) * (i / seg);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x + w - r, y + r, -Math.PI / 2);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  corner(x + r, y + r, Math.PI);
  return pts;
}

/** Contorno de elipse como polígono. */
export function ellipsePts(cx: number, cy: number, rx: number, ry: number, n = 0): Pt[] {
  const k = n || Math.max(16, Math.ceil((rx + ry) * 1.2));
  const pts: Pt[] = [];
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

export function inside(pts: readonly Pt[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Amplia por vizinho mais próximo. */
export function upscalePx(p: Px, k: number): Px {
  const o = new Px(p.w * k, p.h * k);
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) o.d[y * o.w + x] = p.d[Math.floor(y / k) * p.w + Math.floor(x / k)];
  return o;
}

/** Ponto em coordenadas 3D (x direita, y altura, z profundidade) a partir de uma origem na tela. */
export function P(ox: number, oy: number, x: number, y: number, z = 0): Pt {
  return [ox + x + z * KX, oy - y - z * KY];
}
