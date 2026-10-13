// Rodada 20 (arte-cenas) — acabamento das cenas cinemáticas, do campus, dos marcos e do mapa no estilo do pacote de
// equipamentos (art/pack-equipamentos-v1): rampas de 6 tons (sombra arroxeada → luz quente), luz de cima à esquerda,
// contorno #170e12, linhas internas escuras e brilho (nível 5) só em material brilhante. Espelha `ramp()` do
// scripts/px.py da skill masters-artist-sprites. Não substitui px.ts/palette.ts (de outra frente): só os usa.
// r27 (I2b): trazido do ramo claude/arte-cenas (r20) para os marcos isométricos (lmiso27) e o horizonte (skyline27).

import { C, pack, rgba, type Col, type Px } from './px';

export const INK20 = '#170e12';
export const INK = C(INK20);
/** Paleta da casa. */
export const MOGNO = '#6e2e20', LATAO = '#c09048', VINHO = '#8a2430', CROMO = '#a8acb8', CREME = '#f2e4c4';

const SH: [number, number, number][] = [[58, 32, 80], [42, 24, 56], [28, 16, 36]];
const HI: [number, number, number][] = [[255, 240, 200], [255, 251, 232]];
const mixRGB = (a: number[], b: number[], t: number) => [0, 1, 2].map((i) => Math.round(a[i] * (1 - t) + b[i] * t));
const mul = (c: number[], m: number) => c.map((x) => Math.min(255, Math.floor(x * m)));

const RAMPS = new Map<Col, Col[]>();
/** 6 tons: 0–2 sombra (arroxeada), 3 base, 4 luz, 5 brilho (só em material brilhante). Alfa preservado. */
export function ramp20(base: Col): Col[] {
  const hit = RAMPS.get(base);
  if (hit) return hit;
  const [r, g, b, a] = rgba(base);
  const B = [r, g, b];
  const out = [
    mixRGB(mul(B, 0.4), SH[2], 0.32), mixRGB(mul(B, 0.6), SH[1], 0.22), mixRGB(mul(B, 0.8), SH[0], 0.12),
    B, mixRGB(B, HI[0], 0.24), mixRGB(B, HI[1], 0.55),
  ].map(([x, y, z]) => pack(x, y, z, a));
  if (RAMPS.size > 4000) RAMPS.clear();
  RAMPS.set(base, out);
  return out;
}
/** Tom `n` (0–5) da rampa de uma cor CSS hexadecimal, como string CSS. */
const RAMPS_CSS = new Map<string, string[]>();
export function tone20(hex: string, n: number): string {
  let r = RAMPS_CSS.get(hex);
  if (!r) {
    r = ramp20(C(hex)).map((c) => { const [x, y, z] = rgba(c); return `rgb(${x},${y},${z})`; });
    RAMPS_CSS.set(hex, r);
  }
  return r[Math.max(0, Math.min(5, n))];
}

// ---------------------------------------------------------------- Canvas 2D (cenas cinemáticas)

type Ctx = CanvasRenderingContext2D;
/**
 * Bloco com volume: contorno, topo e borda esquerda na luz, borda direita e base na sombra.
 * `spec` = material brilhante (latão, verniz, vidro): ganha o tom 5 no canto aceso.
 */
export function vbox20(ctx: Ctx, x: number, y: number, w: number, h: number, hex: string, o: { spec?: boolean; line?: boolean } = {}): void {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  if (o.line !== false) { ctx.fillStyle = INK20; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); }
  ctx.fillStyle = tone20(hex, 3); ctx.fillRect(x, y, w, h);
  if (h > 2) { ctx.fillStyle = tone20(hex, 1); ctx.fillRect(x, y + h - 1, w, 1); }
  if (w > 2) { ctx.fillStyle = tone20(hex, 2); ctx.fillRect(x + w - 1, y, 1, h); }
  ctx.fillStyle = tone20(hex, 4); ctx.fillRect(x, y, w, 1);
  if (h > 2) ctx.fillRect(x, y, 1, h - 1);
  if (o.spec && w > 2) { ctx.fillStyle = tone20(hex, 5); ctx.fillRect(x + 1, y, Math.max(1, Math.round(w / 4)), 1); }
}
/** Disco/elipse com volume (luz de cima à esquerda) e contorno. */
export function vdisc20(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, hex: string, spec = false): void {
  const el = (x: number, y: number, a: number, b: number, c: string) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.5, a), Math.max(0.5, b), 0, 0, Math.PI * 2); ctx.fill(); };
  el(cx, cy, rx + 1, ry + 1, INK20);
  el(cx, cy, rx, ry, tone20(hex, 2));
  el(cx - rx * 0.18, cy - ry * 0.18, rx * 0.8, ry * 0.8, tone20(hex, 3));
  el(cx - rx * 0.4, cy - ry * 0.4, rx * 0.32, ry * 0.32, tone20(hex, spec ? 5 : 4));
}
/** Sombra de contato no chão (elipse escura arroxeada). */
export function ground20(ctx: Ctx, x: number, y: number, rx: number, ry = 1.6, a = 0.35): void {
  ctx.fillStyle = `rgba(23,14,18,${a})`; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

const GRADE = new Map<string, HTMLCanvasElement>();
/** Luz ambiente da casa: calor no alto à esquerda, sombra arroxeada no canto oposto (cacheado por tamanho). */
export function grade20(w: number, h: number, k = 1): HTMLCanvasElement {
  const key = `${w}x${h}x${k}`;
  const hit = GRADE.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (g) {
    const lg = g.createLinearGradient(0, 0, w, h);
    lg.addColorStop(0, `rgba(255,236,190,${0.1 * k})`);
    lg.addColorStop(0.45, 'rgba(255,236,190,0)');
    lg.addColorStop(0.6, 'rgba(42,24,56,0)');
    lg.addColorStop(1, `rgba(42,24,56,${0.22 * k})`);
    g.fillStyle = lg; g.fillRect(0, 0, w, h);
  }
  GRADE.set(key, c);
  return c;
}

// ---------------------------------------------------------------- Px (campus, marcos)

/**
 * Volume por silhueta: borda de cima e da esquerda sobem um tom, borda de baixo e da direita descem um;
 * depois contorno `ink` (para objetos distantes, use um contorno misturado ao corpo).
 */
export function relief20(p: Px, ink: Col = INK, o: { light?: boolean; keep?: Col } = {}): void {
  const src = p.d.slice();
  const w = p.w;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < p.h && (src[y * w + x] >>> 24) > 40;
  if (o.light !== false) for (let y = 0; y < p.h; y++) for (let x = 0; x < w; x++) {
    const c = src[y * w + x];
    if ((c >>> 24) <= 40 || c === o.keep) continue;
    const r = ramp20(c);
    const up = !solid(x, y - 1), lf = !solid(x - 1, y), dn = !solid(x, y + 1), rt = !solid(x + 1, y);
    if (up || lf) p.d[y * w + x] = r[4];
    else if (dn || rt) p.d[y * w + x] = r[2];
  }
  p.outline(ink);
}
