// Núcleo de pixel art: buffer RGBA próprio (sem antialiasing do canvas), cores empacotadas,
// pontilhado Bayer, caixas isométricas 2:1 com shaders por face e contorno automático.
// Utilitários do estilo do pacote de assets: rampa de 6 tons (ramp6/lv/tint), sombreamento por volume
// (volume/discV/ellipseV/rectV), contorno em camada (inked) e brilho especular (glint).

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

// ---------- estilo do pacote de assets (pixel art HD, ver .claude/skills/masters-artist-sprites) ----------

/** Contorno externo de 1 px e linhas internas: escuro quente. */
export const INK = C('#170e12');
/** Paleta da casa: mogno, latão, vinho e cromado. */
export const HOUSE = { mahogany: C('#6e2e20'), brass: C('#c09048'), wine: C('#8a2430'), chrome: C('#a8acb8'), ink: INK } as const;

const SH_TINT = [pack(58, 32, 80), pack(42, 24, 56), pack(28, 16, 36)];
const HI_TINT = [pack(255, 240, 200), pack(255, 251, 232)];
const mul = (c: Col, m: number): Col => {
  const [r, g, b, a] = rgba(c);
  return pack(Math.min(255, r * m), Math.min(255, g * m), Math.min(255, b * m), a);
};
const rampCache = new Map<Col, Col[]>();

/**
 * Rampa de 6 tons a partir da cor base (índice 3): sombras deslocadas para o roxo, luzes para o amarelo quente.
 * 0 sombra profunda · 1 sombra · 2 meia-sombra · 3 base · 4 luz · 5 brilho (só material brilhante).
 */
export function ramp6(base: Col): Col[] {
  const hit = rampCache.get(base);
  if (hit) return hit;
  const a = base >>> 24;
  const keep = (c: Col) => withAlpha(c, a);
  const r = [
    keep(mix(mul(base, 0.4), SH_TINT[2], 0.32)),
    keep(mix(mul(base, 0.6), SH_TINT[1], 0.22)),
    keep(mix(mul(base, 0.8), SH_TINT[0], 0.12)),
    base,
    keep(mix(base, HI_TINT[0], 0.24)),
    keep(mix(base, HI_TINT[1], 0.55)),
  ];
  if (rampCache.size > 4096) rampCache.clear();
  rampCache.set(base, r);
  return r;
}

/** Tom n (0..5, aceita fração) da rampa da cor. */
export function lv(base: Col, n: number): Col {
  const r = ramp6(base);
  if (n <= 0) return r[0];
  if (n >= 5) return r[5];
  const i = Math.floor(n);
  const f = n - i;
  return f < 0.01 ? r[i] : mix(r[i], r[i + 1], f);
}

/**
 * Como shade(), mas andando pela rampa do estilo: f < 0 vai para a sombra arroxeada (−0.6 ≈ tom 0),
 * f > 0 para a luz quente (+0.24 ≈ tom 4, +0.55 ≈ tom 5). Abaixo de −0.6 escurece até o contorno.
 */
export function tint(c: Col, f: number): Col {
  if (f >= 0) return lv(c, f <= 0.24 ? 3 + f / 0.24 : 4 + Math.min(1, (f - 0.24) / 0.31));
  if (f >= -0.6) return lv(c, 3 + f / 0.2);
  return withAlpha(mix(lv(c, 0), INK, Math.min(1, (-f - 0.6) / 0.4)), c >>> 24);
}

/** Direção da luz (cima à esquerda, vindo da frente), normalizada. */
const LIGHT = (() => {
  const v = [-0.5, -0.72, 0.62];
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / n);
})();

export interface VolumeOpts {
  /** raio do "inflado" em px (bordas arredondadas); padrão 4 */
  r?: number;
  /** desloca a luz: negativo = mais sombra (membros de trás, áreas sob algo) */
  bias?: number;
  /** material brilhante: libera o tom 5 */
  spec?: boolean;
  /** contorno de 1 px (INK) em volta da forma */
  ink?: Col | false;
}

/**
 * Preenche uma forma com sombreamento pelo volume (como o motor de referência px.py): a máscara é
 * "inflada" (altura pela distância à borda), a normal vem do gradiente e a luz de cima à esquerda escolhe o tom da rampa.
 */
export function volume(p: Px, x0: number, y0: number, w: number, h: number, inside: (x: number, y: number) => boolean, base: Col, o: VolumeOpts = {}): void {
  x0 = Math.floor(x0); y0 = Math.floor(y0); w = Math.ceil(w); h = Math.ceil(h);
  const R = Math.max(1, o.r ?? 4);
  const W = w + 2;
  const H = h + 2;
  const m = new Uint8Array(W * H);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(x0 + x, y0 + y)) m[(y + 1) * W + x + 1] = 1;
  // distância (chanfro 3-4) até fora da máscara
  const d = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) d[i] = m[i] ? 1e9 : 0;
  const pass = (fw: boolean) => {
    for (let k = 0; k < W * H; k++) {
      const i = fw ? k : W * H - 1 - k;
      if (!m[i]) continue;
      const x = i % W;
      const y = (i / W) | 0;
      const s = fw ? -1 : 1;
      const nb = [[s, 0, 1], [0, s, 1], [s, s, 1.4], [-s, s, 1.4]] as const;
      for (const [dx, dy, c] of nb) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const v = d[yy * W + xx] + c;
        if (v < d[i]) d[i] = v;
      }
    }
  };
  pass(true);
  pass(false);
  const hgt = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (!m[i]) continue;
    const t = Math.min(1, d[i] / R);
    hgt[i] = R * Math.sqrt(1 - (1 - t) * (1 - t));
  }
  const ramp = ramp6(base);
  const bias = o.bias ?? 0;
  const tmp = o.ink === false ? null : new Px(W, H);
  for (let y = 1; y <= h; y++)
    for (let x = 1; x <= w; x++) {
      const i = y * W + x;
      if (!m[i]) continue;
      const gx = (hgt[i + 1] - hgt[i - 1]) / 2;
      const gy = (hgt[i + W] - hgt[i - W]) / 2;
      const n = Math.hypot(gx, gy, 1);
      const lam = (-gx * LIGHT[0] - gy * LIGHT[1] + LIGHT[2]) / n + bias;
      let L = lam < -0.1 ? 0 : lam < 0.25 ? 1 : lam < 0.48 ? 2 : lam < 0.74 ? 3 : lam < 0.92 ? 4 : 5;
      if (!o.spec) L = Math.min(L, 4);
      if (tmp) tmp.put(x, y, ramp[L]);
      else p.set(x0 + x - 1, y0 + y - 1, ramp[L]);
    }
  if (tmp) {
    tmp.outline(o.ink === undefined ? INK : (o.ink as Col));
    p.blit(tmp, x0 - 1, y0 - 1);
  }
}

/** Atalhos de volume para formas simples. */
export function discV(p: Px, cx: number, cy: number, r: number, base: Col, o: VolumeOpts = {}): void {
  const r2 = r * r + 0.3;
  volume(p, cx - r - 1, cy - r - 1, 2 * r + 3, 2 * r + 3, (x, y) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r2, base, { r: Math.max(2, r * 0.8), ...o });
}

export function ellipseV(p: Px, cx: number, cy: number, rx: number, ry: number, base: Col, o: VolumeOpts = {}): void {
  volume(p, cx - rx - 1, cy - ry - 1, 2 * rx + 3, 2 * ry + 3, (x, y) => ((x + 0.5 - cx) / (rx + 0.3)) ** 2 + ((y + 0.5 - cy) / (ry + 0.3)) ** 2 <= 1, base, { r: Math.max(2, Math.min(rx, ry) * 0.8), ...o });
}

export function rectV(p: Px, x: number, y: number, w: number, h: number, base: Col, o: VolumeOpts = {}): void {
  volume(p, x, y, w, h, () => true, base, { r: Math.max(1, Math.min(4, Math.min(w, h) / 3)), ...o });
}

/**
 * Desenha numa camada própria, contorna a silhueta com 1 px (INK) e cola no destino.
 * Use para objetos desenhados por cima de um fundo já preenchido (o contorno do Px só enxerga o vazio).
 */
export function inked(dst: Px, draw: (q: Px) => void, ink: Col = INK, o: { relief?: boolean } = {}): void {
  // R29 (arte consistente): camada reaproveitada e contorno só na caixa usada — o resultado é o mesmo de
  // `outline` no buffer inteiro, mas barato o bastante para contornar cada objeto de uma cena animada.
  const pool = INK_POOL.get(`${dst.w}x${dst.h}`) ?? [];
  INK_POOL.set(`${dst.w}x${dst.h}`, pool);
  const q = pool.pop() ?? new Px(dst.w, dst.h);
  try {
    draw(q);
    const { w, h, d } = q;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) if (d[row + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; y1 = y; }
    }
    if (x1 < 0) return;
    x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(w - 1, x1 + 1); y1 = Math.min(h - 1, y1 + 1);
    // só o que é (quase) opaco forma a silhueta: luzes e véus translúcidos (cones, halos, vidro) não ganham contorno
    const op = (i: number) => (d[i] >>> 24) > 150;
    if (o.relief) { // volume pela silhueta: borda de cima/esquerda sobe um tom, de baixo/direita desce um (luz de cima à esquerda)
      const src = d.slice();
      const sol = (i: number) => (src[i] >>> 24) > 40;
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const i = y * w + x;
          if ((src[i] >>> 24) < 255) continue;
          const up = y === 0 || !sol(i - w), lf = x === 0 || !sol(i - 1), dn = y === h - 1 || !sol(i + w), rt = x === w - 1 || !sol(i + 1);
          if (up || lf) d[i] = lv(src[i], 4);
          else if (dn || rt) d[i] = lv(src[i], 2);
        }
    }
    const add: number[] = [];
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const i = y * w + x;
        if ((d[i] >>> 24) > 40) continue; // o contorno só ocupa pixels vazios
        if ((x > 0 && op(i - 1)) || (x < w - 1 && op(i + 1)) || (y > 0 && op(i - w)) || (y < h - 1 && op(i + w))) add.push(i);
      }
    for (const i of add) d[i] = ink;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const i = y * w + x;
        if (d[i]) { dst.set(x, y, d[i]); d[i] = 0; }
      }
  } catch (e) {
    q.d.fill(0);
    throw e;
  } finally {
    pool.push(q);
  }
}
const INK_POOL = new Map<string, Px[]>();

/** Brilho especular (tom 5) em material brilhante: latão, cromado, verniz, vidro. */
export function glint(p: Px, x: number, y: number, base: Col, len = 1, vertical = false): void {
  const c = lv(base, 5);
  for (let i = 0; i < len; i++) p.set(vertical ? x : x + i, vertical ? y + i : y, c);
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

  /** Caixa com sombreamento padrão (luz do alto à esquerda, tons da rampa do estilo) e arestas realçadas. */
  sbox(ox: number, oy: number, W: number, D: number, H: number, base: Col, o: { top?: Col; tex?: BoxShader; edge?: boolean } = {}): void {
    const top = o.top ?? tint(base, 0.18);
    const left = base;
    const right = tint(base, -0.24);
    const edge = o.edge !== false;
    this.box(ox, oy, W, D, H, {
      top: (u, v) => {
        const t = o.tex?.top?.(u, v);
        if (t) return t;
        if (edge && (u >= W - 1 || v >= D - 1)) return tint(top, 0.22);
        return top;
      },
      left: (u, v) => {
        const t = o.tex?.left?.(u, v);
        if (t) return t;
        if (edge && v >= H - 1) return tint(left, 0.12);
        if (edge && v < 1) return tint(left, -0.2);
        return left;
      },
      right: (u, v) => {
        const t = o.tex?.right?.(u, v);
        if (t) return t;
        if (edge && v >= H - 1) return tint(right, 0.1);
        if (edge && v < 1) return tint(right, -0.2);
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

/**
 * R29 (arte consistente): mostra o canvas em escala INTEIRA (1×, 2×, 3×…) da largura disponível no `host`
 * (padrão: o avô do canvas), em vez de `width: 100%` — escala fracionária deixa pixels de tamanhos diferentes.
 * Abaixo de 1× (tela estreita) cai para 100% (reduzir é inevitável). `pad` desconta bordas/preenchimento do host.
 */
export function fitIntPx(cv: HTMLCanvasElement, w: number, o: { max?: number; pad?: number; host?: () => HTMLElement | null | undefined; on?: (n: number) => void } = {}): void {
  if (typeof ResizeObserver === 'undefined') return;
  const host = () => o.host?.() ?? cv.parentElement?.parentElement ?? cv.parentElement;
  let last = -1;
  const apply = (hw: number) => {
    const avail = Math.min(o.max ?? Infinity, hw - (o.pad ?? 0));
    const n = Math.floor(avail / w);
    if (n === last) return;
    last = n;
    if (n >= 1) { cv.style.width = `${n * w}px`; cv.style.maxWidth = '100%'; }
    else { cv.style.width = '100%'; }
    o.on?.(n);
  };
  let seen = false;
  const ro = new ResizeObserver((es) => {
    if (!cv.isConnected) { if (seen) ro.disconnect(); return; }
    seen = true;
    const cw = es[0]?.contentRect.width;
    if (cw) apply(cw);
  });
  queueMicrotask(() => { const el = host(); if (el) ro.observe(el); });
}

/**
 * R29 (arte consistente): polígono e elipse no <canvas> SEM antialiasing — varredura por linha com fillRect em
 * coordenadas inteiras (o `fill()` de um caminho suaviza as bordas diagonais e foge do pixel art). Usa o fillStyle atual.
 */
export function ctxPoly(ctx: CanvasRenderingContext2D, pts: [number, number][]): void {
  let y0 = Infinity, y1 = -Infinity;
  for (const [, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const yc = y + 0.5, xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) { const a = Math.ceil(xs[k] - 0.5), b = Math.ceil(xs[k + 1] - 0.5); if (b > a) ctx.fillRect(a, y, b - a, 1); }
  }
}
export function ctxEllipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const dy = (y + 0.5 - cy) / (ry + 0.3);
    if (Math.abs(dy) > 1) continue;
    const hw = (rx + 0.3) * Math.sqrt(1 - dy * dy);
    const a = Math.ceil(cx - hw - 0.5), b = Math.ceil(cx + hw - 0.5);
    if (b > a) ctx.fillRect(a, y, b - a, 1);
  }
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
