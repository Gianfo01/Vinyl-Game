// Núcleo de pixel art: buffer RGBA próprio (sem antialiasing do canvas), cores empacotadas,
// pontilhado Bayer, caixas isométricas 2:1 com shaders por face e contorno automático.

/** Cor empacotada 0xAABBGGRR (ordem do ImageData em little-endian). 0 = transparente. */
export type Col = number;

const hexCache = new Map<string, Col>();

export function pack(r: number, g: number, b: number, a = 255): Col {
  return (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
}

export function rgba(c: Col): [number, number, number, number] {
  return [c & 255, (c >>> 8) & 255, (c >>> 16) & 255, (c >>> 24) & 255];
}

/** '#rgb', '#rrggbb' ou '#rrggbbaa' → cor empacotada. */
export function C(hex: string, a?: number): Col {
  const key = a === undefined ? hex : `${hex}/${a}`;
  const hit = hexCache.get(key);
  if (hit !== undefined) return hit;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const al = a !== undefined ? a : h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255;
  const c = pack(r, g, b, al);
  hexCache.set(key, c);
  return c;
}

export function css(c: Col): string {
  const [r, g, b, a] = rgba(c);
  return a === 255 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
}

/** f > 0 clareia em direção ao branco; f < 0 escurece (com leve desvio de matiz para tons quentes/frios). */
export function shade(c: Col, f: number): Col {
  const [r, g, b, a] = rgba(c);
  if (f >= 0) return pack(r + (255 - r) * f, g + (255 - g) * f, b + (248 - b) * f, a);
  const k = 1 + f;
  // sombras puxam levemente para o azul/roxo, como em paletas de 16 bits
  return pack(r * k, g * k, Math.min(255, b * k + -f * 18), a);
}

export function mix(a: Col, b: Col, t: number): Col {
  const A = rgba(a);
  const B = rgba(b);
  return pack(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t, A[3] + (B[3] - A[3]) * t);
}

export function withAlpha(c: Col, a: number): Col {
  return ((c & 0xffffff) | ((Math.round(a) & 255) << 24)) >>> 0;
}

export function hsl(h: number, s: number, l: number, a = 255): Col {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const q = s * Math.min(l, 1 - l);
  const f = (n: number) => l - q * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return pack(Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255), a);
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Pontilhado ordenado: verdadeiro para uma fração t (0..1) dos pixels. */
export function dith(x: number, y: number, t: number): boolean {
  return BAYER4[((y & 3) << 2) | (x & 3)] < t * 16;
}

/** Ruído determinístico por coordenada (0..1). */
export function noise(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export type Shader = (u: number, v: number) => Col;
export interface BoxShader {
  top?: Shader;
  left?: Shader;
  right?: Shader;
}

export class Px {
  readonly d: Uint32Array;
  constructor(readonly w: number, readonly h: number) {
    this.d = new Uint32Array(w * h);
  }

  inb(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): Col {
    return this.inb(x, y) ? this.d[y * this.w + x] : 0;
  }

  /** Escreve sem mistura. */
  put(x: number, y: number, c: Col): void {
    x |= 0;
    y |= 0;
    if (this.inb(x, y)) this.d[y * this.w + x] = c;
  }

  /** Escreve com mistura alfa (0 é ignorado). */
  set(x: number, y: number, c: Col): void {
    if (!c) return;
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.inb(x, y)) return;
    const a = c >>> 24;
    const i = y * this.w + x;
    if (a >= 255) {
      this.d[i] = c;
      return;
    }
    const dst = this.d[i];
    if (!dst) {
      this.d[i] = c;
      return;
    }
    const t = a / 255;
    const da = dst >>> 24;
    const out = mix(dst, c | 0xff000000, t);
    this.d[i] = withAlpha(out, Math.max(da, a));
  }

  rect(x: number, y: number, w: number, h: number, c: Col): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }

  hline(x0: number, x1: number, y: number, c: Col): void {
    if (x1 < x0) [x0, x1] = [x1, x0];
    for (let x = x0; x <= x1; x++) this.set(x, y, c);
  }

  vline(x: number, y0: number, y1: number, c: Col): void {
    if (y1 < y0) [y0, y1] = [y1, y0];
    for (let y = y0; y <= y1; y++) this.set(x, y, c);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: Col): void {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Disco preenchido. Centro em coordenadas contínuas: 8 = entre pixels 7 e 8; 8.5 = sobre o pixel 8. */
  disc(cx: number, cy: number, r: number, c: Col | ((x: number, y: number, d: number) => Col)): void {
    const r2 = r * r + 0.3;
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const dd = dx * dx + dy * dy;
        if (dd <= r2) this.set(x, y, typeof c === 'number' ? c : c(x, y, Math.sqrt(dd)));
      }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: Col | ((x: number, y: number, d: number) => Col)): void {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / (rx + 0.3);
        const dy = (y + 0.5 - cy) / (ry + 0.3);
        const dd = dx * dx + dy * dy;
        if (dd <= 1) this.set(x, y, typeof c === 'number' ? c : c(x, y, Math.sqrt(dd)));
      }
  }

  ring(cx: number, cy: number, r: number, c: Col): void {
    const steps = Math.max(12, Math.ceil(r * 8));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      this.set(Math.round(cx + Math.cos(a) * r - 0.5), Math.round(cy + Math.sin(a) * r - 0.5), c);
    }
  }

  /** Polígono por varredura com amostragem no centro do pixel. */
  poly(pts: [number, number][], c: Col | ((x: number, y: number) => Col)): void {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const yc = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)) xs.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.ceil(xs[k] - 0.5); x < Math.ceil(xs[k + 1] - 0.5); x++) this.set(x, y, typeof c === 'number' ? c : c(x, y));
    }
  }

  fill(fn: (x: number, y: number) => Col, x0 = 0, y0 = 0, w = this.w, h = this.h): void {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, fn(x, y));
  }

  /**
   * Caixa isométrica. (ox, oy) é o pixel do canto de trás no chão (mundo 0,0,0).
   * Unidades do mundo: 1 unidade em gx = (+1, +0,5) px; tile = 16 unidades = 32×16 px.
   * Shaders recebem (u, v): topo (gx, gy); faces verticais (u da esquerda para a direita, v = altura).
   */
  box(ox: number, oy: number, W: number, D: number, H: number, sh: BoxShader): void {
    const x0 = Math.floor(ox - D) - 1;
    const x1 = Math.ceil(ox + W) + 1;
    const y0 = Math.floor(oy - H) - 1;
    const y1 = Math.ceil(oy + (W + D) / 2) + 1;
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const X = px + 0.5 - ox;
        const Y = py + 0.5 - oy;
        let c: Col = 0;
        // face esquerda (plano gy = D)
        if (sh.left) {
          const gx = X + D;
          const z = (gx + D) / 2 - Y;
          if (gx >= 0 && gx < W && z >= 0 && z < H) c = sh.left(gx, z);
        }
        if (sh.right) {
          const gy = W - X;
          const z = (W + gy) / 2 - Y;
          if (gy >= 0 && gy < D && z >= 0 && z < H) c = sh.right(D - gy, z);
        }
        if (sh.top) {
          const Yt = Y + H;
          const gx = Yt + X / 2;
          const gy = Yt - X / 2;
          if (gx >= 0 && gx < W && gy >= 0 && gy < D) c = sh.top(gx, gy);
        }
        if (c) this.set(px, py, c);
      }
    }
  }

  /** Caixa com sombreamento padrão (luz do alto à esquerda) e arestas realçadas. */
  sbox(ox: number, oy: number, W: number, D: number, H: number, base: Col, o: { top?: Col; tex?: BoxShader; edge?: boolean } = {}): void {
    const top = o.top ?? shade(base, 0.18);
    const left = base;
    const right = shade(base, -0.22);
    const edge = o.edge !== false;
    this.box(ox, oy, W, D, H, {
      top: (u, v) => {
        const t = o.tex?.top?.(u, v);
        if (t) return t;
        if (edge && (u >= W - 1 || v >= D - 1)) return shade(top, 0.22);
        return top;
      },
      left: (u, v) => {
        const t = o.tex?.left?.(u, v);
        if (t) return t;
        if (edge && v >= H - 1) return shade(left, 0.12);
        return left;
      },
      right: (u, v) => {
        const t = o.tex?.right?.(u, v);
        if (t) return t;
        if (edge && v >= H - 1) return shade(right, 0.1);
        return right;
      },
    });
  }

  /** Contorno de 1 px em volta da silhueta (só em pixels vazios). */
  outline(c: Col, diag = false): void {
    const w = this.w;
    const src = this.d.slice();
    const op = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < this.h && (src[y * w + x] >>> 24) > 40;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < w; x++) {
        if ((src[y * w + x] >>> 24) > 40) continue;
        if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1) || (diag && (op(x - 1, y - 1) || op(x + 1, y - 1) || op(x - 1, y + 1) || op(x + 1, y + 1)))) this.d[y * w + x] = c;
      }
  }

  /** Copia outro buffer (com mistura); flip espelha horizontalmente. */
  blit(src: Px, dx: number, dy: number, flip = false, tint?: (c: Col, x: number, y: number) => Col): void {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        let c = src.d[y * src.w + (flip ? src.w - 1 - x : x)];
        if (!c) continue;
        if (tint) c = tint(c, x, y);
        this.set(dx + x, dy + y, c);
      }
  }

  /** Cola uma imagem num plano de parede isométrico: slope 1 desce para a direita, −1 sobe. */
  decal(src: Px, sx: number, sy: number, slope: 1 | -1): void {
    for (let x = 0; x < src.w; x++) {
      const off = slope === 1 ? Math.floor(x / 2) : -Math.floor(x / 2);
      for (let y = 0; y < src.h; y++) this.set(sx + x, sy + y + off, src.d[y * src.w + x]);
    }
  }

  map(fn: (c: Col, x: number, y: number) => Col): void {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        if (this.d[i]) this.d[i] = fn(this.d[i], x, y);
      }
  }

  clone(): Px {
    const p = new Px(this.w, this.h);
    p.d.set(this.d);
    return p;
  }

  canvas(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(this.w, this.h);
    new Uint32Array(img.data.buffer).set(this.d);
    ctx.putImageData(img, 0, 0);
    return c;
  }
}

/** Amplia um canvas por vizinho mais próximo. */
export function upscale(src: HTMLCanvasElement, w: number, h = w): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, w, h);
  return c;
}

/** Sprite pronto para desenhar: canvas + âncora (pixel que toca o ponto do mundo). */
export interface Sprite {
  c: HTMLCanvasElement;
  ax: number;
  ay: number;
}

export function sprite(p: Px, ax: number, ay: number): Sprite {
  return { c: p.canvas(), ax, ay };
}
