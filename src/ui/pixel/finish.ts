// Acabamento no estilo do pacote de arte (art/pack-equipamentos-v1, skill masters-artist-sprites):
// rampas de 6 tons (sombra arroxeada → luz quente), luz de cima à esquerda, contorno #170e12 e
// brilho (tom 5) só em material brilhante. Usado por ícones, logos e capas; tudo determinístico.

import { C, pack, rgba, type Col } from './px';

/** Contorno quente da casa. */
export const INK = C('#170e12');

/** Paleta da casa (mesmos valores do SKILL.md). */
export const HOUSE = {
  mogno: C('#6e2e20'),
  latao: C('#c09048'),
  vinho: C('#8a2430'),
  cromado: C('#a8acb8'),
};

const SH: [number, number, number][] = [[58, 32, 80], [42, 24, 56], [28, 16, 36]];
const HI: [number, number, number][] = [[255, 240, 200], [255, 251, 232]];
const LX = -0.5, LY = -0.72, LZ = 0.62;
const LN = Math.hypot(LX, LY, LZ);

const mixRgb = (a: number[], b: number[], t: number) => [0, 1, 2].map((i) => Math.round(a[i] * (1 - t) + b[i] * t));
const rampCache = new Map<Col, Col[]>();

/** Rampa de 6 tons de uma cor (índice 3 = a própria cor), como ramp() em scripts/px.py. */
export function ramp6(c: Col): Col[] {
  const hit = rampCache.get(c);
  if (hit) return hit;
  const [r, g, b, a] = rgba(c);
  const mul = (m: number) => [Math.min(255, r * m), Math.min(255, g * m), Math.min(255, b * m)];
  const out = [
    mixRgb(mul(0.4), SH[2], 0.32),
    mixRgb(mul(0.6), SH[1], 0.22),
    mixRgb(mul(0.8), SH[0], 0.12),
    [r, g, b],
    mixRgb([r, g, b], HI[0], 0.24),
    mixRgb([r, g, b], HI[1], 0.55),
  ].map(([x, y, z]) => pack(x, y, z, a));
  rampCache.set(c, out);
  return out;
}

/** Tom n (0–5) da rampa de uma cor. */
export const tone = (c: Col, n: number): Col => ramp6(c)[Math.max(0, Math.min(5, n))];

/** Gradação quente: tira um pouco da saturação, puxa sombras para o roxo e luzes para o creme. k = intensidade. */
export function grade(c: Col, k = 1): Col {
  const [r, g, b, a] = rgba(c);
  if (!a) return c;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  let rgb = mixRgb([r, g, b], [lum * 255 + 6, lum * 255, lum * 255 - 6], 0.16 * k);
  const ts = Math.max(0, Math.min(1, (0.42 - lum) / 0.42)) * 0.24 * k;
  const th = Math.max(0, Math.min(1, (lum - 0.62) / 0.38)) * 0.16 * k;
  if (ts) rgb = mixRgb(rgb, SH[0], ts);
  if (th) rgb = mixRgb(rgb, HI[0], th);
  return pack(rgb[0], rgb[1], rgb[2], a);
}

const dist2 = (a: Col, b: Col) => {
  const A = rgba(a), B = rgba(b);
  return (A[0] - B[0]) ** 2 + (A[1] - B[1]) ** 2 + (A[2] - B[2]) ** 2;
};

export interface ReliefOpts {
  /** 'regions': cada mancha de cor vira um volume (ícones); 'silhouette': a peça inteira é um volume (logos). */
  mode?: 'regions' | 'silhouette';
  /** Raio do "inflar" (px). */
  r?: number;
  /** Fator na inclinação (menor = relevo mais suave). */
  slope?: number;
  /** Material brilhante (pode chegar ao tom 5). */
  spec?: (c: Col) => boolean;
  /** Cores que agrupam numa mesma região se a distância RGB for menor que isto. */
  join?: number;
}

/**
 * Relevo com luz de cima à esquerda: altura pela distância à borda (como shape() em px.py),
 * normal pelo gradiente, tom pela rampa da cor do próprio pixel. Pixels translúcidos ficam intactos.
 */
export function relief(p: { w: number; h: number; d: Uint32Array }, o: ReliefOpts = {}): void {
  const { w, h, d } = p;
  const R = o.r ?? 3;
  const slope = o.slope ?? 1;
  const join2 = (o.join ?? 30) ** 2;
  const N = w * h;
  const solid = (i: number) => d[i] >>> 24 === 255;
  // regiões
  const reg = new Int32Array(N).fill(-1);
  let nreg = 0;
  for (let s = 0; s < N; s++) {
    if (reg[s] >= 0 || !solid(s)) continue;
    const st = [s];
    reg[s] = nreg;
    while (st.length) {
      const i = st.pop()!;
      const x = i % w, y = (i / w) | 0;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (reg[j] >= 0 || !solid(j)) continue;
        if (o.mode !== 'silhouette' && dist2(d[i], d[j]) > join2) continue;
        reg[j] = nreg;
        st.push(j);
      }
    }
    nreg++;
  }
  // distância à borda da própria região (1 = borda)
  const dd = new Float32Array(N);
  const q: number[] = [];
  const inReg = (x: number, y: number, r: number) => x >= 0 && y >= 0 && x < w && y < h && reg[y * w + x] === r;
  for (let i = 0; i < N; i++) {
    if (reg[i] < 0) continue;
    const x = i % w, y = (i / w) | 0, r = reg[i];
    if (!inReg(x - 1, y, r) || !inReg(x + 1, y, r) || !inReg(x, y - 1, r) || !inReg(x, y + 1, r)) { dd[i] = 1; q.push(i); }
  }
  for (let k = 0; k < q.length; k++) {
    const i = q[k];
    const x = i % w, y = (i / w) | 0, r = reg[i];
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (!inReg(nx, ny, r)) continue;
      const j = ny * w + nx;
      if (dd[j]) continue;
      dd[j] = dd[i] + 1;
      q.push(j);
    }
  }
  // altura arredondada + suavização (só dentro da região)
  const h0 = new Float32Array(N);
  for (let i = 0; i < N; i++) if (reg[i] >= 0) { const t = Math.min(1, dd[i] / R); h0[i] = R * Math.sqrt(1 - (1 - t) ** 2); }
  const H = new Float32Array(N);
  const at = (x: number, y: number, r: number, def: number) => (inReg(x, y, r) ? h0[y * w + x] : def);
  for (let i = 0; i < N; i++) {
    if (reg[i] < 0) continue;
    const x = i % w, y = (i / w) | 0, r = reg[i];
    // vizinhos fora da região contam como chão (0): é o que dá o chanfro na borda
    H[i] = (4 * h0[i] + at(x - 1, y, r, 0) + at(x + 1, y, r, 0) + at(x, y - 1, r, 0) + at(x, y + 1, r, 0)) / 8;
  }
  const HH = (x: number, y: number, r: number) => (inReg(x, y, r) ? H[y * w + x] : 0);
  const out = d.slice();
  for (let i = 0; i < N; i++) {
    if (reg[i] < 0) continue;
    const x = i % w, y = (i / w) | 0, r = reg[i];
    const gx = ((HH(x + 1, y, r) - HH(x - 1, y, r)) / 2) * slope;
    const gy = ((HH(x, y + 1, r) - HH(x, y - 1, r)) / 2) * slope;
    const nn = Math.hypot(gx, gy, 1);
    const lam = (-gx * LX - gy * LY + LZ) / nn / LN;
    let L = lam < -0.1 ? 0 : lam < 0.25 ? 1 : lam < 0.48 ? 2 : lam < 0.74 ? 3 : lam < 0.92 ? 4 : 5;
    if (L === 5 && !o.spec?.(d[i])) L = 4;
    out[i] = ramp6(d[i])[L];
  }
  d.set(out);
}
