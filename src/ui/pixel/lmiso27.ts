// Rodada 27 (I2) — marcos da cidade em PIXEL ART ISOMÉTRICA para o "Nosso mundo" (bíblia: docs/art27-city.md).
// Cada marco é um modelinho com volume (face esquerda iluminada, direita −22%, topo claro), contorno escuro de
// 1 px só por fora, sombra projetada para a direita e luzes noturnas numa camada própria. Desenhos próprios para
// os marcos famosos (Big Ben, Tower Bridge, Torre Eiffel, Empire State, Estátua da Liberdade, Cristo, Pão de
// Açúcar, MASP, Edifício Itália, Liver Building, Torre de Tóquio, Torre de TV de Berlim, Portão de Brandemburgo,
// Ópera e ponte de Sydney…) e versões genéricas, também isométricas, para as outras formas (LmShape).
// Quem decide QUAIS marcos e ONDE é a função pura mapLms27 (city27.ts); aqui só se desenha.

import type { LmShape } from '../../data/landmarks19';
import { C, Px, dith, noise, shade, withAlpha, type Col } from './px';
import { drawText } from './font';
import { INK, ramp20 } from './cenas20';
import { region27 } from './skyline27';

type P = [number, number];
/** Contexto de desenho: buffer de cor, buffer de luzes, âncora (centro da base no chão), ano. */
interface K { p: Px; l: Px; X: number; Y: number; year: number; seed: number; /** chão (água, praça): sem contorno */ g: Px; /** r27 (I2b): região da cidade (skyline27.region27) para os genéricos */ reg?: string }
/** Desenha no chão do marco (fica fora do contorno). */
const G = (k: K): K => ({ ...k, p: k.g });
/** Pegada para a sombra (células) e altura (px). */
interface Foot { r1: number; r2: number; h: number }
type Base = 'plaza' | 'water' | 'island' | 'none';

const QW = 150, QH = 150, AX = 75, AY = 116;
// r27 (I2b): estilo oficial (skill masters-artist-sprites): contorno #170e12, sombra arroxeada, rampas de 6 tons
const OUTL = withAlpha(INK, 200);
const SHADOW = withAlpha(C('#2a1838'), 74);
/** Tom n (0–2 sombra arroxeada, 3 base, 4 luz quente, 5 brilho) da rampa da cor. */
const tn = (c: Col, n: number): Col => ramp20(c)[n];

// ---------------------------------------------------------------- kit isométrico (1 célula = 8 px × 4 px)

const ip = (k: K, u: number, v: number, z = 0): P => [k.X + (u - v) * 8, k.Y + (u + v) * 4 - z];
type Tex = (side: 0 | 1, s: number, z: number, len: number) => Col | 0;

/** Caixa isométrica centrada em (u, v), meia-largura r1 (eixo u) e r2 (eixo v), do chão z0 até z0 + h. */
function ibox(k: K, u: number, v: number, r1: number, r2: number, z0: number, h: number, base: Col, o: { top?: Col; tex?: Tex; noTop?: boolean; right?: Col } = {}): void {
  const W = ip(k, u - r1, v + r2), S = ip(k, u + r1, v + r2), E = ip(k, u + r1, v - r2), N = ip(k, u - r1, v - r2);
  const lenL = S[0] - W[0], lenR = E[0] - S[0];
  const rc = o.right ?? tn(base, 2);
  k.p.poly([[W[0], W[1] - z0], [S[0], S[1] - z0], [S[0], S[1] - z0 - h], [W[0], W[1] - z0 - h]], (x, y) => {
    const s = x + 0.5 - W[0], z = W[1] + s / 2 - z0 - (y + 0.5);
    const t = o.tex?.(0, s, z, lenL);
    if (t) return t;
    return z >= h - 1 ? tn(base, 4) : s >= lenL - 1 && lenL > 3 && h > 5 ? tn(base, 1) : z0 === 0 && z < 1.5 && h > 6 ? tn(base, 2) : base;
  });
  k.p.poly([[S[0], S[1] - z0], [E[0], E[1] - z0], [E[0], E[1] - z0 - h], [S[0], S[1] - z0 - h]], (x, y) => {
    const s = x + 0.5 - S[0], z = S[1] - s / 2 - z0 - (y + 0.5);
    const t = o.tex?.(1, s, z, lenR);
    if (t) return tn(t, 2);
    return z >= h - 1 ? tn(rc, 4) : z0 === 0 && z < 1.5 && h > 6 ? tn(rc, 2) : rc;
  });
  if (!o.noTop) k.p.poly([[N[0], N[1] - z0 - h], [E[0], E[1] - z0 - h], [S[0], S[1] - z0 - h], [W[0], W[1] - z0 - h]], o.top ?? tn(base, 4));
}
/** Prisma afunilado (pirâmide quando rt = 0): base r0, topo rt. */
function taper(k: K, u: number, v: number, r0: number, rt: number, z0: number, h: number, base: Col, o: { right?: Col; tex?: (side: 0 | 1, x: number, y: number) => Col | 0 } = {}): void {
  const at = (r: number, z: number) => ({ W: ip(k, u - r, v + r, z), S: ip(k, u + r, v + r, z), E: ip(k, u + r, v - r, z), N: ip(k, u - r, v - r, z) });
  const a = at(r0, z0), b = at(rt, z0 + h);
  const rc = o.right ?? tn(base, 2);
  k.p.poly([a.W, a.S, b.S, b.W], (x, y) => o.tex?.(0, x, y) || base);
  k.p.poly([a.S, a.E, b.E, b.S], (x, y) => { const t = o.tex?.(1, x, y); return t ? tn(t, 2) : rc; });
  if (rt > 0) k.p.poly([b.N, b.E, b.S, b.W], tn(base, 4));
}
/** Cilindro vertical em faixas de luz (esquerda clara → direita escura), tampa no topo. */
function cyl(k: K, u: number, v: number, r: number, z0: number, h: number, base: Col, rTop = r): void {
  const [cx, cy] = ip(k, u, v);
  for (let z = 0; z < h; z++) {
    const rr = r + (rTop - r) * (z / Math.max(1, h)), rx = rr * 11.3;
    for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
      if (Math.abs(dx + 0.5) > rx + 0.3) continue;
      const f = (dx + 0.5) / Math.max(1, rx);
      k.p.set(cx + dx, cy - z0 - z, tn(base, f < -0.35 ? 4 : f < 0.2 ? 3 : f < 0.65 ? 2 : 1));
    }
  }
  const rx = rTop * 11.3, ry = rx / 2;
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
    if (((dx + 0.5) / (rx + 0.3)) ** 2 + ((dy + 0.5) / (ry + 0.3)) ** 2 <= 1) k.p.set(cx + dx, cy - z0 - h + dy, tn(base, 4));
  }
}
/** Esfera sombreada em 4 tons com brilho no alto à esquerda. */
function ball(k: K, u: number, v: number, z: number, r: number, base: Col): void {
  const [cx, cy0] = ip(k, u, v), cy = cy0 - z;
  for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
    const x = (dx + 0.5) / r, y = (dy + 0.5) / r, d = x * x + y * y;
    if (d > 1) continue;
    const nz = Math.sqrt(1 - d), lum = -0.55 * x - 0.55 * y + 0.62 * nz;
    const c = tn(base, lum > 0.8 ? 5 : lum > 0.45 ? 4 : lum > 0.1 ? 3 : lum > -0.3 ? 2 : 1);
    k.p.set(cx + dx, cy + dy, c);
  }
}
/** Losango no chão (praça, água, ilha). */
function diamond(k: K, u: number, v: number, r1: number, r2: number, c: Col | ((x: number, y: number) => Col)): void {
  k.p.poly([ip(k, u - r1, v - r2), ip(k, u + r1, v - r2), ip(k, u + r1, v + r2), ip(k, u - r1, v + r2)], c);
}
const lamp = (k: K, x: number, y: number, c: Col) => { k.l.set(x, y, c); };
/** Textura de janelas: fileiras a cada `fh` px, colunas a cada `cw` px. */
const winTex = (win: Col, fh: number, cw: number, o: { from?: number; to?: number; pier?: Col } = {}): Tex => (_side, s, z, len) => {
  if (z < (o.from ?? 3) || z > (o.to ?? 1e9) || s < 1 || s > len - 1) return 0;
  const zr = Math.floor(z) % fh, sr = Math.floor(s) % cw;
  if (o.pier && sr === 0) return o.pier;
  return zr >= 1 && zr <= Math.max(1, fh - 2) && sr >= 1 ? win : 0;
};

// ---------------------------------------------------------------- relevo natural

/** Morro em perfil (rocha nas encostas íngremes, mata no resto), luz da esquerda. */
function mountain(k: K, dx0: number, dx1: number, hAt: (dx: number) => number, rock: Col, green: Col, peak: number, bare = 2): void {
  for (let dx = dx0; dx <= dx1; dx++) {
    const h = Math.max(0, Math.round(hAt(dx)));
    const slope = Math.abs(hAt(dx + 1) - hAt(dx - 1)) / 2;
    for (let z = 0; z < h; z++) {
      const lit = dx < peak ? 0.08 : -0.18;
      const top = z > h - 2;
      const steep = slope > 1.6 || (slope > 1 && noise(dx, z, k.seed) < 0.5) || (z > h * bare && z < h - 2 && noise(dx >> 1, z >> 2, k.seed) < 0.85);
      let c = steep && z > h * 0.25 ? rock : green;
      if (!steep && z < h * 0.35 && noise(dx, z, k.seed + 3) < 0.25) c = shade(green, -0.15);
      if (steep && (dx + Math.floor(z / 3)) % 4 === 0) c = shade(c, -0.12); // estrias na rocha
      c = top ? tn(c, 4) : lit > 0 ? c : tn(c, 2);
      if (dith(dx + 40, z, 0.12) && !top) c = shade(c, -0.06);
      k.p.set(k.X + dx, k.Y - z, c);
    }
  }
}

// ---------------------------------------------------------------- marcos com desenho próprio

const GRAN = C('#aca69a'), WHITE = C('#f2eee4');
const GOLDL = C('#ffd77a'), WARM = C('#ffeeb0'), REDL = C('#ff4a3a');

function bigBen(k: K, o: { stone?: Col; tall?: number } = {}): Foot {
  const st = o.stone ?? C('#cfb27a'), H = o.tall ?? 40;
  const rib: Tex = (_s, s, z, len) => (z > 3 && z < H - 2 && s > 0.5 && s < len - 1 && Math.floor(s) % 3 === 1 ? shade(st, -0.2) : z > 3 && Math.floor(z) % 9 === 0 ? shade(st, 0.12) : 0);
  ibox(k, 1.55, 0.1, 1.15, 0.42, 0, 12, st, { tex: winTex(shade(st, -0.3), 5, 3, { to: 11 }), top: C('#5a6670') }); // ala do palácio
  for (let i = 0; i < 5; i++) { const [x, y] = ip(k, 0.6 + i * 0.5, -0.32, 12); k.p.rect(x, y - 3, 1, 3, st); }
  ibox(k, 0, 0, 0.5, 0.5, 0, H, st, { tex: rib });
  ibox(k, 0, 0, 0.6, 0.6, H, 10, st, { top: st });
  // mostradores (dois lados visíveis) — acesos à noite
  for (const side of [0, 1] as const) {
    const a = side ? ip(k, 0.6, 0.6, H + 5) : ip(k, -0.6, 0.6, H + 5), b = side ? ip(k, 0.6, -0.6, H + 5) : ip(k, 0.6, 0.6, H + 5);
    const cx = Math.round((a[0] + b[0]) / 2), cy = Math.round((a[1] + b[1]) / 2);
    const face = side ? C('#d8d0b8') : C('#f4eedc');
    k.p.rect(cx - 2, cy - 2, 5, 5, face); k.p.set(cx - 2, cy - 2, st); k.p.set(cx + 2, cy - 2, st); k.p.set(cx - 2, cy + 2, st); k.p.set(cx + 2, cy + 2, st);
    k.p.set(cx, cy, C('#2a2a30')); k.p.set(cx, cy - 1, C('#2a2a30')); k.p.set(cx + 1, cy, C('#2a2a30'));
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) lamp(k, cx + i, cy + j, WARM);
  }
  ibox(k, 0, 0, 0.5, 0.5, H + 10, 5, st, { tex: (_s, s, z) => (z > 1 && z < 4 && Math.floor(s) % 3 !== 0 ? shade(st, -0.35) : 0) });
  taper(k, 0, 0, 0.55, 0.08, H + 15, 13, C('#56625c'), { tex: (_s, x, y) => ((x + y) % 4 === 0 ? C('#c8a040') : 0) });
  for (const [cu, cv] of [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.5]] as P[]) { const [x, y] = ip(k, cu, cv, H + 15); k.p.rect(x, y - 4, 1, 4, C('#c8a040')); }
  const [tx, ty] = ip(k, 0, 0, H + 28); k.p.rect(tx, ty - 4, 1, 4, C('#c8a040')); lamp(k, tx, ty - 1, GOLDL);
  return { r1: 0.6, r2: 0.6, h: H + 30 };
}

function towerBridge(k: K): Foot {
  const walk = k.year < 1977 ? C('#6a5442') : C('#4a78b0'), st = C('#cfc6b4');
  diamond(G(k), 0, 0, 3.6, 0.95, (x, y) => (noise(x, y, 5) < 0.06 ? C('#5aa0d8') : C('#3a7cb8')));
  for (const s of [-1, 1]) { // correntes laterais até as margens
    for (let i = 0; i <= 20; i++) { const t = i / 20, u = s * (1.75 + t * 1.6), z = 22 - 18 * Math.sqrt(t); const [x, y] = ip(k, u, 0, z); k.p.set(x, y, walk); k.p.set(x, y + 1, shade(walk, -0.2)); }
    ibox(k, s * 2.5, 0, 0.78, 0.2, 3, 2, walk, { top: shade(walk, 0.2) });
  }
  ibox(k, 0, 0, 0.9, 0.22, 4, 2, walk, { top: C('#8a8a90') }); // pista (báscula)
  for (const s of [-1, 1]) {
    ibox(k, s * 1.3, 0, 0.5, 0.5, 0, 4, GRAN);
    ibox(k, s * 1.3, 0, 0.42, 0.42, 4, 26, st, { tex: (_q, ss, z, len) => (z > 3 && z < 24 && Math.abs(ss - len / 2) < 1.5 && Math.floor(z) % 7 < 4 ? C('#3a4048') : Math.floor(z) % 8 === 0 ? shade(st, -0.1) : 0) });
    taper(k, s * 1.3, 0, 0.44, 0.04, 30, 8, C('#5a6878'));
    for (const [cu, cv] of [[-0.42, 0.42], [0.42, 0.42], [0.42, -0.42]] as P[]) { const [x, y] = ip(k, s * 1.3 + cu, cv, 30); k.p.rect(x, y - 4, 1, 4, st); k.p.set(x, y - 5, C('#c8a040')); }
    const [lx, ly] = ip(k, s * 1.3, 0, 22); lamp(k, lx, ly, WARM); lamp(k, lx - 2, ly + 1, WARM);
  }
  ibox(k, 0, 0, 0.88, 0.16, 22, 3, walk, { tex: (_q, s) => (Math.floor(s) % 2 ? 0 : shade(walk, -0.25)) }); // passarelas altas
  for (let u = -0.8; u <= 0.8; u += 0.4) { const [x, y] = ip(k, u, 0.16, 23); lamp(k, x, y, WARM); }
  return { r1: 2.2, r2: 0.5, h: 38 };
}

/** Torre treliçada (Eiffel / Tóquio): pernas curvas com treliça vazada, plataformas e antena. */
function lattice(k: K, o: { H: number; base: number; col: (z: number) => Col; decks: number[]; ant: number; lights?: Col; arch?: boolean; pow?: number }): Foot {
  const { H } = o;
  const hw = (z: number) => o.base * Math.pow(Math.max(0, 1 - z / (H + 4)), o.pow ?? 1.7) + 1.2;
  for (let z = 0; z < H; z++) {
    const w = hw(z), y = k.Y - z;
    for (let dx = -Math.ceil(w); dx <= Math.ceil(w); dx++) {
      const ad = Math.abs(dx + 0.5);
      if (ad > w) continue;
      const edge = ad > w - 1.6;
      const archHole = o.arch !== false && z < H * 0.16 && ad < w * 0.72 * Math.sqrt(Math.max(0, 1 - (z / (H * 0.16)) ** 2));
      if (archHole) continue;
      const lace = (Math.abs(dx) + z) % 4 === 0 || (Math.abs(dx) - z + 400) % 4 === 0;
      const core = ad < 1 && z > H * 0.5;
      if (!edge && !lace && !core) continue;
      const c = o.col(z);
      k.p.set(k.X + dx, y, dx < 0 ? c : shade(c, -0.24));
      if (o.lights && edge && (z % 3 === 0)) lamp(k, k.X + dx, y, o.lights);
    }
  }
  for (const dz of o.decks) { const r = hw(dz) / 11 + 0.08; ibox(k, 0, 0, r, r, dz, 3, shade(o.col(dz), 0.05), { tex: (_s, s) => (Math.floor(s) % 2 ? C('#3a3e48') : 0) }); const [x, y] = ip(k, 0, r, dz + 1); lamp(k, x, y, WARM); }
  const [tx, ty] = ip(k, 0, 0, H); k.p.rect(tx, ty - o.ant, 1, o.ant, shade(o.col(H), 0.1)); lamp(k, tx, ty - o.ant, REDL);
  return { r1: o.base / 11, r2: o.base / 11, h: H + o.ant };
}
const eiffel = (k: K) => lattice(k, { H: 66, base: 15, col: () => C('#8a6a50'), decks: [16, 37, 60], ant: 9, lights: k.year >= 1985 ? GOLDL : undefined });
const tokyoTower = (k: K) => lattice(k, { H: 62, base: 12, pow: 1.5, col: (z) => (Math.floor(z / 7) % 2 ? C('#f4f0ea') : C('#e8482a')), decks: [24, 46], ant: 12, lights: k.year >= 1989 ? C('#ffa040') : undefined });

function empire(k: K, o: { col?: Col; tiers?: [number, number][]; mast?: number } = {}): Foot {
  const c = o.col ?? C('#cfc6b0'), win = C('#46505c');
  const tiers = o.tiers ?? [[0.95, 16], [0.72, 22], [0.55, 20], [0.38, 6], [0.26, 4]];
  let z = 0;
  for (const [r, h] of tiers) {
    ibox(k, 0, 0, r, r, z, h, c, { tex: (_s, s, zz, len) => (s > 0.5 && s < len - 0.5 && Math.floor(s) % 2 === 1 && zz > 1 && zz < h - 1 ? win : 0) });
    z += h;
  }
  if (o.mast !== 0) { cyl(k, 0, 0, 0.1, z, 6, shade(c, 0.1)); const [x, y] = ip(k, 0, 0, z + 6); k.p.rect(x, y - (o.mast ?? 9), 1, o.mast ?? 9, C('#c8ccd0')); lamp(k, x, y - (o.mast ?? 9), REDL); }
  const [lx, ly] = ip(k, 0, 0, z - 4);
  if (k.year >= 1964) for (let i = -2; i <= 2; i++) lamp(k, lx + i, ly, k.year >= 1976 ? [C('#ff5050'), WHITE, C('#5080ff')][(i + 2) % 3] : WARM);
  return { r1: 0.95, r2: 0.95, h: z + 12 };
}

function liberty(k: K): Foot {
  const pat = k.year < 1900 ? C('#b8703e') : k.year < 1910 ? C('#8a9a70') : C('#6ab49c');
  diamond(G(k), 0, 0, 1.7, 1.7, (x, y) => (noise(x, y, 7) < 0.1 ? C('#5a9a48') : C('#4a8a40')));
  diamond(G(k), 0, 0, 2.6, 2.6, (x, y) => (noise(x, y, 4) < 0.07 ? C('#64b0e0') : C('#2f86c8'))); diamond(G(k), 0, 0, 1.95, 1.95, C('#e8d8a8'));
  diamond(G(k), 0, 0, 1.6, 1.6, (x, y) => (noise(x, y, 7) < 0.1 ? C('#5a9a48') : C('#4a8a40')));
  ibox(k, 0, 0, 0.95, 0.95, 0, 3, GRAN, { top: C('#8a8a80') }); // forte em estrela (base)
  taper(k, 0, 0, 0.45, 0.36, 3, 15, C('#b8ae9c')); // pedestal de granito
  ibox(k, 0, 0, 0.38, 0.38, 18, 2, C('#c8beac'));
  taper(k, 0, 0, 0.26, 0.12, 20, 15, pat); // manto
  const [hx, hy] = ip(k, 0, 0, 35);
  k.p.rect(hx - 1, hy - 3, 3, 3, shade(pat, 0.08)); // cabeça
  for (const dx of [-2, 0, 2]) k.p.set(hx + dx, hy - 4 - (dx === 0 ? 1 : 0), shade(pat, 0.2)); // coroa
  k.p.line(hx + 2, hy + 1, hx + 4, hy - 9, pat); k.p.line(hx + 3, hy + 1, hx + 5, hy - 9, shade(pat, -0.2)); // braço erguido
  k.p.rect(hx + 3, hy - 12, 3, 3, C('#e8b040')); for (let i = 0; i < 3; i++) lamp(k, hx + 3 + i, hy - 12, GOLDL); lamp(k, hx + 4, hy - 13, WARM);
  k.p.rect(hx - 4, hy + 4, 2, 4, shade(pat, -0.1)); // tábua
  return { r1: 0.9, r2: 0.9, h: 50 };
}

function christ(k: K, statue: boolean): Foot {
  const peak = 3;
  // Corcovado: pico íngreme com um ombro à esquerda (mata) e paredão de pedra à direita
  const hAt = (dx: number) => {
    const t = (dx - peak) / (dx < peak ? 26 : 17), main = 46 * Math.max(0, 1 - Math.abs(t)) ** 1.25;
    const shoulder = 25 * Math.exp(-(((dx + 15) / 10) ** 2)), foot = 10 * Math.exp(-(((dx - 18) / 7) ** 2));
    const h = Math.max(main, shoulder, foot);
    return h + (h > 4 ? (noise(dx, 1, 77) - 0.5) * 2 : 0);
  };
  mountain(k, -32, 26, hAt, C('#8e8a7e'), C('#3a8a44'), peak);
  if (statue) {
    const x = k.X + peak, y = k.Y - Math.round(hAt(peak)), w = C('#f2eee4'), sd = C('#cfcac0');
    k.p.rect(x - 1, y - 2, 3, 2, C('#bdb8ac')); // pedestal
    k.p.rect(x - 1, y - 5, 3, 3, w); k.p.set(x + 1, y - 5, sd); k.p.set(x + 1, y - 4, sd); k.p.set(x + 1, y - 3, sd); // manto (mais largo embaixo)
    k.p.rect(x, y - 10, 2, 5, w); k.p.rect(x + 1, y - 10, 1, 5, sd); // corpo
    k.p.rect(x - 3, y - 10, 8, 1, w); k.p.set(x + 4, y - 10, sd); k.p.set(x - 4, y - 9, w); k.p.set(x + 5, y - 9, sd); // braços abertos, mãos caídas
    k.p.set(x, y - 11, w); k.p.set(x + 1, y - 11, sd); k.p.set(x, y - 12, w); // cabeça
    for (let j = 2; j < 13; j++) { lamp(k, x, y - j, WARM); lamp(k, x + 1, y - j, WARM); }
    for (let i = -3; i <= 4; i++) lamp(k, x + i, y - 10, WARM);
  }
  return { r1: 2.2, r2: 1.2, h: 60 };
}

function sugarloaf(k: K, cable: boolean): Foot {
  diamond(G(k), 0, 0, 3.3, 1.6, (x, y) => (noise(x, y, 9) < 0.07 ? C('#64b0e0') : C('#2f86c8')));
  // pão de açúcar: paredes quase verticais e topo arredondado (não é semicírculo); Urca menor à esquerda, selado por mata
  const loaf = (cx: number, R: number, H: number, dx: number) => { const t = Math.abs(dx - cx) / R; return t >= 1 ? 0 : H * Math.pow(1 - t ** 2.2, 0.42); };
  const hAt = (dx: number) => Math.max(loaf(5, 10, 40, dx), loaf(-15, 9, 17, dx), dx > -8 && dx < 0 ? 6 + Math.sin((dx + 8) / 8 * Math.PI) * 2 : 0);
  mountain(k, -26, 18, hAt, C('#a69e8e'), C('#3a8a44'), 4, 0.3);
  for (let dx = -26; dx <= 18; dx++) if (hAt(dx) > 0) { k.g.set(k.X + dx, k.Y + 1, C('#e8f4fa')); for (let z = 0; z < 3; z++) k.p.set(k.X + dx, k.Y - z, shade(C('#2f7a3a'), z === 2 ? 0.1 : 0)); }
  if (cable) {
    const a: P = [k.X - 15, k.Y - 17], b: P = [k.X + 3, k.Y - 39];
    for (let i = 0; i <= 20; i++) { const t = i / 20; k.p.set(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * 2), C('#2a2a30')); }
    const cab = (t: number) => { const x = Math.round(a[0] + (b[0] - a[0]) * t), y = Math.round(a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * 2); k.p.rect(x - 1, y + 1, 3, 2, k.year >= 1972 ? C('#e83a2a') : C('#e8d070')); lamp(k, x, y + 1, WARM); };
    cab(0.35); cab(0.72);
    k.p.rect(b[0] - 1, b[1] - 1, 3, 2, C('#d8d0c0')); lamp(k, b[0], b[1] - 1, REDL);
  }
  return { r1: 2.6, r2: 1.2, h: 42 };
}

function masp(k: K): Foot {
  const red = C('#cc2a1e'), glass = C('#2e353e'), slab = C('#c8c4bc');
  diamond(G(k), 0, 0, 2.2, 1, (x, y) => ((x + y * 2) % 6 < 3 ? C('#b8b2a6') : C('#c4beb2'))); // vão livre (praça por baixo)
  // pilares vermelhos nas pontas (dois por ponta) — atrás primeiro
  for (const s of [-1, 1]) ibox(k, s * 1.62, -0.36, 0.12, 0.1, 0, 21, red);
  ibox(k, 0, 0, 1.5, 0.36, 9, 8, glass, { tex: (_s, s, z) => (Math.floor(s) % 5 === 0 ? C('#56606c') : z > 6 ? C('#6a7480') : 0), top: slab }); // caixa de vidro suspensa
  ibox(k, 0, 0, 1.6, 0.4, 17, 3, red, { top: slab }); // viga de cima (laje clara por cima)
  ibox(k, 0, 0.36, 1.6, 0.05, 7, 2, red); // viga de baixo (frente)
  for (const s of [-1, 1]) ibox(k, s * 1.62, 0.36, 0.12, 0.1, 0, 21, red);
  for (let u = -1.3; u <= 1.3; u += 0.32) { const [x, y] = ip(k, u, 0.36, 12); lamp(k, x, y, WARM); }
  return { r1: 1.7, r2: 0.5, h: 21 };
}

function italia(k: K): Foot {
  const c = C('#cfc4ae');
  ibox(k, 0, 0, 0.62, 0.62, 0, 60, c, { tex: (_s, s, z, len) => (z > 2 && z < 59 && s > 0.5 && s < len - 0.5 ? (Math.floor(z) % 3 === 0 ? C('#4a5058') : Math.floor(s) % 4 === 0 ? shade(c, 0.12) : 0) : 0) });
  ibox(k, 0, 0, 0.66, 0.66, 60, 3, shade(c, -0.15), { top: C('#5a8a50') }); // terraço com plantas
  const [x, y] = ip(k, 0, 0, 63); k.p.rect(x, y - 6, 1, 6, C('#c8ccd0')); lamp(k, x, y - 6, REDL);
  for (let z = 6; z < 58; z += 6) { const [wx, wy] = ip(k, -0.3, 0.62, z); if (noise(z, 2, k.seed) < 0.6) lamp(k, wx, wy, WARM); }
  return { r1: 0.62, r2: 0.62, h: 69 };
}

function liver(k: K): Foot {
  const c = C('#bab4a6'), cu = C('#6aa890');
  ibox(k, 0, 0, 1.15, 0.62, 0, 30, c, { tex: winTex(C('#424a54'), 5, 3) });
  for (const s of [-1, 1]) {
    const u = s * 0.72;
    ibox(k, u, 0, 0.3, 0.3, 30, 10, c);
    const [x, y] = ip(k, u - 0.3, 0.3, 35), [x2, y2] = ip(k, u + 0.3, 0.3, 35);
    const cx = Math.round((x + x2) / 2), cy = Math.round((y + y2) / 2);
    k.p.rect(cx - 1, cy - 1, 3, 3, WHITE); k.p.set(cx, cy, C('#2a2a30'));
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) lamp(k, cx + i, cy + j, WARM);
    ibox(k, u, 0, 0.24, 0.24, 40, 2, cu); ibox(k, u, 0, 0.16, 0.16, 42, 2, cu); taper(k, u, 0, 0.1, 0, 44, 3, cu);
    const [bx, by] = ip(k, u, 0, 47); k.p.rect(bx - 1, by - 2, 3, 2, C('#3a5a48')); k.p.set(bx + 1, by - 3, C('#3a5a48'));
  }
  return { r1: 1.15, r2: 0.62, h: 50 };
}

function tvTower(k: K, o: { ball: boolean; shaft: Col; podR?: number; pod?: number; H?: number; podCol?: Col }): Foot {
  const H = o.H ?? 50, pod = o.pod ?? H + 4, rr = o.podR ?? 7;
  ibox(k, 0, 0, 1.1, 1.1, 0, 4, C('#d8d4cc'), { top: C('#8a9098') });
  cyl(k, 0, 0, 0.32, 4, H - 4, o.shaft, 0.2);
  if (o.ball) { ball(k, 0, 0, pod, rr, C('#bcc4cc')); const [x, y] = ip(k, 0, 0, pod); for (let i = -rr + 1; i < rr; i++) { k.p.set(x + i, y + 1, C('#3a4250')); lamp(k, x + i, y + 1, WARM); } }
  else { ibox(k, 0, 0, rr / 11, rr / 11, pod - 3, 6, o.podCol ?? shade(o.shaft, -0.1), { tex: (_s, s, z) => (z > 2 && z < 4 && Math.floor(s) % 2 ? C('#3a4250') : 0) }); const [x, y] = ip(k, 0, rr / 11, pod); lamp(k, x - 2, y, WARM); lamp(k, x + 2, y, WARM); }
  cyl(k, 0, 0, 0.12, pod + rr - 1, 6, o.shaft);
  const [tx, ty] = ip(k, 0, 0, pod + rr + 5);
  for (let i = 0; i < 12; i++) k.p.set(tx, ty - i, Math.floor(i / 3) % 2 ? C('#e83a2a') : WHITE);
  lamp(k, tx, ty - 12, REDL); lamp(k, tx, ty - 6, REDL);
  return { r1: 0.5, r2: 0.5, h: pod + rr + 17 };
}

function brandenburg(k: K, o: { col?: Col; quadriga?: boolean } = {}): Foot {
  const c = o.col ?? C('#dcc89c');
  diamond(G(k), 0, 0, 2.3, 1.1, (x, y) => ((Math.floor(x / 2) + y) % 2 ? C('#b8b0a0') : C('#c4bcac')));
  for (let i = 0; i < 6; i++) ibox(k, -1.5 + i * 0.6, 0, 0.11, 0.36, 0, 17, c);
  ibox(k, 0, 0, 1.72, 0.46, 17, 4, c, { tex: (_s, _q, z) => (z > 1.5 && z < 2.5 ? shade(c, -0.15) : 0) });
  ibox(k, 0, 0, 0.75, 0.4, 21, 4, c);
  if (o.quadriga !== false) { const [x, y] = ip(k, 0, 0, 25); const g = C('#4a7a62'); k.p.rect(x - 4, y - 3, 9, 2, g); for (const dx of [-4, -2, 1, 3]) k.p.rect(x + dx, y - 6, 1, 3, g); k.p.rect(x - 4, y - 7, 2, 1, g); k.p.rect(x + 3, y - 7, 2, 1, g); k.p.rect(x, y - 9, 1, 6, g); k.p.rect(x - 1, y - 10, 3, 1, g); }
  for (let u = -1.2; u <= 1.2; u += 0.6) { const [x, y] = ip(k, u, 0.4, 7); lamp(k, x, y, WARM); }
  return { r1: 1.72, r2: 0.46, h: 34 };
}

function opera(k: K): Foot {
  diamond(G(k), 0.2, 0, 2.7, 1.4, (x, y) => (noise(x, y, 4) < 0.07 ? C('#64b0e0') : C('#2f86c8')));
  ibox(k, 0, 0, 1.8, 0.85, 0, 5, C('#cdb898'), { tex: (_s, s) => (Math.floor(s) % 6 === 0 ? C('#a89878') : 0), top: C('#d8c8a8') });
  // conchas = barbatanas grossas no plano u-z: perfil de longe (cinza), aro e perfil de perto (branco), nervura de luz
  // conchas = barbatanas grossas no plano u-z: dorso convexo subindo de trás para a ponta, na frente quase vertical
  const shell = (u0: number, len: number, ht: number, v0: number) => {
    const prof: [number, number][] = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; prof.push([u0 + len * t, 5 + ht * Math.sin(t * Math.PI / 2) ** 1.4]); } // dorso
    prof.push([u0 + len + 0.06, 5 + ht * 0.55], [u0 + len - 0.02, 5]); // frente: ponta e queda quase reta
    const at = (v: number) => prof.map(([u, z]) => ip(k, u, v, z));
    const far = at(v0 - 0.32), near = at(v0 + 0.32);
    k.p.poly(far, C('#b8bcc2'));
    for (let i = 0; i < 10; i++) k.p.poly([near[i], near[i + 1], far[i + 1], far[i]], C('#e2e2de')); // dorso visto de cima
    k.p.poly(near, (x, y) => { const t = (x - near[0][0]) / Math.max(1, near[10][0] - near[0][0]); return t > 0.72 ? C('#d2d4d6') : (x * 3 + y * 5) % 11 === 0 ? C('#ebe9e2') : C('#faf8f0'); });
    for (let i = 0; i <= 10; i += 2) lamp(k, near[i][0], near[i][1] + 1, WARM);
  };
  shell(-1.5, 0.75, 9, -0.35); shell(-0.7, 0.85, 14, -0.35);
  shell(-1.55, 0.7, 11, 0.38); shell(-0.85, 0.85, 16, 0.38); shell(0.05, 1.0, 22, 0.38);
  shell(1.05, 0.55, 8, 0.45);
  return { r1: 1.8, r2: 0.85, h: 28 };
}

/** Ponte em arco de aço (Harbour Bridge / Hernando de Soto em M). */
function archBridge(k: K, o: { col: Col; double?: boolean; pylons?: boolean; peak?: number }): Foot {
  diamond(G(k), 0, 0, 3.5, 0.9, (x, y) => (noise(x, y, 5) < 0.06 ? C('#5aa0d8') : C('#3a7cb8')));
  const peak = o.peak ?? 22;
  const arcs: [number, number][] = o.double ? [[-2.6, 0], [0, 2.6]] : [[-2.3, 2.3]];
  for (const [u0, u1] of arcs) for (let i = 0; i <= 40; i++) {
    const t = i / 40, u = u0 + (u1 - u0) * t, z = 4 + (peak - 4) * (1 - (2 * t - 1) ** 2);
    const [x, y] = ip(k, u, 0, z); k.p.set(x, y, o.col); k.p.set(x, y + 1, shade(o.col, -0.25));
    const [x2, y2] = ip(k, u, 0, z - 4 * (1 - (2 * t - 1) ** 2)); k.p.set(x2, y2, shade(o.col, -0.1));
    if (i % 4 === 0 && z > 9) for (let zz = 9; zz < z; zz++) { const [hx, hy] = ip(k, u, 0, zz); k.p.set(hx, hy, withAlpha(o.col, 200)); }
    if (i % 5 === 0) lamp(k, x, y, WARM);
  }
  ibox(k, 0, 0, 3.2, 0.18, 8, 2, shade(o.col, -0.1), { top: C('#8a8a90') });
  if (o.pylons) for (const s of [-1, 1]) ibox(k, s * 2.45, 0, 0.32, 0.36, 0, 16, C('#cdbd9a'), { tex: (_q, ss, z) => (Math.floor(z) % 4 === 0 || Math.floor(ss) % 5 === 0 ? shade(C('#cdbd9a'), -0.1) : 0) });
  return { r1: 3, r2: 0.5, h: peak + 2 };
}

/** Ponte pênsil (Brooklyn de pedra, Golden Gate vermelha…). */
function suspension(k: K, o: { tower: Col; cable: Col; stone?: boolean }): Foot {
  diamond(G(k), 0, 0, 3.6, 0.9, (x, y) => (noise(x, y, 5) < 0.06 ? C('#5aa0d8') : C('#3a7cb8')));
  const TZ = 28;
  for (let i = 0; i <= 60; i++) {
    const u = -3.4 + 6.8 * (i / 60);
    const near = Math.min(Math.abs(u - 1.6), Math.abs(u + 1.6));
    const z = Math.abs(u) < 1.6 ? 8 + (TZ - 10) * (Math.abs(u) / 1.6) ** 2 : 8 + (TZ - 10) * Math.max(0, 1 - (Math.abs(u) - 1.6) / 1.8) ** 1.5;
    const [x, y] = ip(k, u, 0, z); k.p.set(x, y, o.cable);
    if (i % 2 === 0 && z > 9 && near > 0.1) for (let zz = 7; zz < z; zz++) { const [hx, hy] = ip(k, u, 0, zz); k.p.set(hx, hy, withAlpha(o.cable, 150)); }
    if (i % 6 === 0) lamp(k, x, y, WARM);
  }
  ibox(k, 0, 0, 3.4, 0.18, 6, 2, shade(o.cable, -0.2), { top: C('#8a8a90') });
  for (const s of [-1, 1]) {
    const tex: Tex | undefined = o.stone ? (_q, ss, z, len) => (z > 12 && z < 24 && Math.abs(ss - len / 2) > 0.5 && Math.abs(ss - len / 2) < 3 - (z - 12) / 6 ? C('#3a4048') : 0) : (_q, ss, z) => (Math.floor(z) % 7 === 0 || Math.floor(ss) === 1 ? shade(o.tower, -0.12) : 0);
    ibox(k, s * 1.6, 0, 0.26, 0.42, 0, TZ, o.tower, { tex });
    const [lx, ly] = ip(k, s * 1.6, 0, TZ + 1); lamp(k, lx, ly, REDL);
  }
  return { r1: 3, r2: 0.5, h: TZ + 2 };
}

function gableRoof(k: K, u: number, v: number, r1: number, r2: number, z: number, rh: number, col: Col): void {
  const W = ip(k, u - r1, v + r2, z), S = ip(k, u + r1, v + r2, z), E = ip(k, u + r1, v - r2, z), N = ip(k, u - r1, v - r2, z);
  const R0 = ip(k, u - r1, v, z + rh), R1 = ip(k, u + r1, v, z + rh);
  k.p.poly([N, E, R1, R0], shade(col, -0.3));
  k.p.poly([W, S, R1, R0], col);
  k.p.poly([S, E, R1], shade(col, -0.18));
}
function hall(k: K, o: { wall: Col; roof: Col; cols?: boolean; r1?: number; r2?: number; h?: number; arch?: boolean } ): Foot {
  const r1 = o.r1 ?? 1.2, r2 = o.r2 ?? 0.7, h = o.h ?? 12;
  diamond(G(k), 0, 0, r1 + 0.5, r2 + 0.5, (x, y) => ((x + y) % 4 < 2 ? C('#b8b2a6') : C('#c4beb2')));
  ibox(k, 0, 0, r1, r2, 0, h, o.wall, { tex: o.arch ? (_s, s, z, len) => (s > 1 && s < len - 1 && Math.floor(s) % 4 >= 1 && Math.floor(s) % 4 <= 2 && z > 3 && z < h - 3 - (Math.floor(s) % 4 === 1 ? 0 : 1) ? C('#3a3e52') : 0) : winTex(C('#3e4656'), 5, 3) });
  gableRoof(k, 0, 0, r1, r2, h, 6, o.roof);
  if (o.cols) { for (let i = 0; i < 5; i++) { const [x, y] = ip(k, -r1 * 0.6 + i * r1 * 0.3, r2 + 0.12, 0); k.p.rect(x, y - h + 2, 1, h - 2, WHITE); } }
  for (let u = -r1 + 0.3; u < r1; u += 0.4) { const [x, y] = ip(k, u, r2, 4); lamp(k, x, y, WARM); }
  return { r1, r2, h: h + 6 };
}
function sunStudio(k: K): Foot {
  diamond(G(k), 0, 0, 1.3, 0.9, (x, y) => ((x + y) % 4 < 2 ? C('#b8b2a6') : C('#c4beb2')));
  ibox(k, 0, 0, 0.85, 0.55, 0, 9, C('#ece2c8'), { tex: winTex(C('#3a4e5c'), 5, 4, { to: 7 }) });
  ibox(k, 0, 0, 0.88, 0.58, 9, 1, C('#8a6a4a'));
  const [x, y] = ip(k, -0.85, 0.55, 0); k.p.rect(x, y - 16, 1, 16, C('#5a5a60'));
  const sun = C('#f0b030'); k.p.rect(x - 3, y - 20, 7, 4, sun); k.p.set(x - 4, y - 18, sun); k.p.set(x + 4, y - 18, sun); k.p.set(x, y - 21, sun);
  for (let i = -3; i <= 3; i++) lamp(k, x + i, y - 18, C('#ffc040'));
  return { r1: 0.85, r2: 0.55, h: 20 };
}

// ---------------------------------------------------------------- formas genéricas (também isométricas)

function cathedral(k: K, col = C('#c8bca4')): Foot {
  diamond(G(k), 0, 0, 1.6, 1, (x, y) => ((x + y) % 4 < 2 ? C('#b8b2a6') : C('#c4beb2')));
  ibox(k, 0.5, 0, 1.0, 0.55, 0, 14, col, { tex: winTex(C('#5a4a72'), 7, 3) });
  gableRoof(k, 0.5, 0, 1.0, 0.55, 14, 7, C('#5a5a68'));
  for (const v of [-0.38, 0.38]) { ibox(k, -0.75, v, 0.3, 0.26, 0, 26, col, { tex: winTex(C('#3a3e52'), 6, 3, { from: 14 }) }); taper(k, -0.75, v, 0.3, 0, 26, 10, C('#4a4a58')); }
  const [rx, ry] = ip(k, -0.45, 0.55, 18); k.p.rect(rx - 1, ry - 1, 3, 3, C('#7a4a8a')); lamp(k, rx, ry, C('#d090ff'));
  return { r1: 1.5, r2: 0.6, h: 36 };
}
function stadium(k: K): Foot {
  const ring: P[] = [], inner: P[] = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; ring.push(ip(k, Math.cos(a) * 2.2, Math.sin(a) * 1.5, 0)); inner.push(ip(k, Math.cos(a) * 1.5, Math.sin(a) * 0.9, 0)); }
  const top = ring.map(([x, y]) => [x, y - 8] as P);
  k.p.poly(ring, C('#8a8e98'));
  k.p.poly(top, (x, y) => (dith(x, y, 0.3) ? C('#c8c4bc') : C('#b8b4ac')));
  for (let i = 8; i < 16; i++) { const a = ring[i], b = ring[(i + 1) % 16]; k.p.poly([a, b, [b[0], b[1] - 8], [a[0], a[1] - 8]], i < 12 ? C('#a8a4a0') : C('#8a8690')); }
  k.p.poly(inner.map(([x, y]) => [x, y - 4] as P), (x) => (Math.floor(x / 3) % 2 ? C('#3a9a44') : C('#46a84e')));
  for (const [u, v] of [[-2, -1.2], [2, -1.2], [2, 1.2], [-2, 1.2]] as P[]) { const [x, y] = ip(k, u, v, 0); k.p.rect(x, y - 20, 1, 20, C('#6a6e78')); k.p.rect(x - 1, y - 22, 3, 2, C('#e8e8e0')); lamp(k, x - 1, y - 22, WARM); lamp(k, x + 1, y - 22, WARM); }
  return { r1: 2.2, r2: 1.5, h: 22 };
}
function dome(k: K, col = C('#e8e0cc'), domeCol = C('#e8e4da')): Foot {
  diamond(G(k), 0, 0, 1.8, 1.2, (x, y) => ((x + y) % 4 < 2 ? C('#b8b2a6') : C('#c4beb2')));
  ibox(k, 0, 0, 1.4, 0.8, 0, 12, col, { tex: winTex(C('#4a5262'), 4, 2) });
  cyl(k, 0, 0, 0.5, 12, 6, col);
  const [cx, cy] = ip(k, 0, 0, 18);
  for (let z = 0; z < 10; z++) { const w = 5.6 * Math.sqrt(1 - (z / 10) ** 2); for (let dx = -Math.ceil(w); dx <= Math.ceil(w); dx++) { if (Math.abs(dx + 0.5) > w) continue; const f = (dx + 0.5) / w; k.p.set(cx + dx, cy - z, shade(domeCol, f < -0.3 ? 0.12 : f < 0.3 ? 0 : -0.22)); } }
  k.p.rect(cx, cy - 13, 1, 3, col); lamp(k, cx, cy - 13, WARM);
  for (let u = -1.1; u <= 1.1; u += 0.45) { const [x, y] = ip(k, u, 0.8, 5); lamp(k, x, y, WARM); }
  return { r1: 1.4, r2: 0.8, h: 31 };
}
function obelisk(k: K, col = C('#e0d8c8')): Foot {
  diamond(G(k), 0, 0, 0.9, 0.9, (x, y) => ((x + y) % 4 < 2 ? C('#b8b2a6') : C('#c4beb2')));
  taper(k, 0, 0, 0.32, 0.22, 0, 52, col); taper(k, 0, 0, 0.22, 0, 52, 5, shade(col, 0.1));
  const [x, y] = ip(k, 0, 0, 50); lamp(k, x - 1, y, REDL); lamp(k, x + 1, y, REDL);
  return { r1: 0.4, r2: 0.4, h: 58 };
}
function pyramid(k: K, col: Col, glassy = false): Foot {
  taper(k, 0, 0, 1.9, 0, 0, 30, col, { tex: glassy ? (_s, x, y) => ((x + y * 2) % 5 === 0 ? shade(col, 0.2) : 0) : (_s, x, y) => (y % 3 === 0 ? shade(col, -0.1) : dith(x, y, 0.1) ? shade(col, 0.06) : 0) });
  if (glassy) { const [x, y] = ip(k, 0, 0, 30); lamp(k, x, y, C('#a0d0ff')); }
  return { r1: 1.9, r2: 1.9, h: 30 };
}
function wheel(k: K): Foot {
  const [cx, cy0] = ip(k, 0, 0, 0), R = 20, cy = cy0 - R - 4;
  k.p.line(cx, cy, cx - 9, cy0, C('#7a8088')); k.p.line(cx, cy, cx + 9, cy0, C('#5a6068'));
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2, x = cx + Math.cos(a) * R * 0.62, y = cy + Math.sin(a) * R; k.p.set(Math.round(x), Math.round(y), C('#e8ecf0')); if (i % 4 === 0) { k.p.line(cx, cy, Math.round(x), Math.round(y), withAlpha(C('#c8ccd4'), 140)); k.p.rect(Math.round(x) - 1, Math.round(y), 2, 2, C('#e0e8f0')); lamp(k, Math.round(x), Math.round(y), C('#a0d8ff')); } }
  return { r1: 0.8, r2: 0.6, h: 2 * R + 6 };
}
function pagoda(k: K, col = C('#c84a3a')): Foot {
  diamond(G(k), 0, 0, 1.4, 1.4, (x, y) => ((x + y) % 4 < 2 ? C('#b8b2a6') : C('#c4beb2')));
  let z = 0;
  for (let i = 0; i < 4; i++) { const r = 0.9 - i * 0.16; ibox(k, 0, 0, r * 0.8, r * 0.8, z, 6, col, { tex: winTex(C('#3a2a2a'), 6, 3, { from: 2 }) }); z += 6; taper(k, 0, 0, r + 0.15, r * 0.55, z, 3, C('#3a3a40')); z += 2; const [x, y] = ip(k, 0, r * 0.8, z - 4); lamp(k, x, y, WARM); }
  const [x, y] = ip(k, 0, 0, z); k.p.rect(x, y - 7, 1, 7, C('#c8a040'));
  return { r1: 1, r2: 1, h: z + 7 };
}
function minaret(k: K, col = C('#d8cbb0'), domeCol = C('#7a8c9a')): Foot {
  ibox(k, 0, 0, 1.0, 1.0, 0, 12, col, { tex: winTex(C('#4a4a5a'), 6, 3) });
  const [cx, cy] = ip(k, 0, 0, 12);
  for (let z = 0; z < 11; z++) { const w = 8 * Math.sqrt(1 - (z / 11) ** 2); for (let dx = -Math.ceil(w); dx <= Math.ceil(w); dx++) { if (Math.abs(dx + 0.5) > w) continue; const f = (dx + 0.5) / w; k.p.set(cx + dx, cy - z, shade(domeCol, f < -0.3 ? 0.14 : f < 0.3 ? 0 : -0.22)); } }
  for (const [u, v] of [[-1.3, 1.3], [1.3, 1.3], [1.3, -1.3]] as P[]) { cyl(k, u, v, 0.12, 0, 28, col); taper(k, u, v, 0.14, 0, 28, 6, domeCol); const [x, y] = ip(k, u, v, 20); lamp(k, x, y, WARM); }
  return { r1: 1.3, r2: 1.3, h: 34 };
}
function temple(k: K, col = C('#e0d6bc')): Foot {
  ibox(k, 0, 0, 1.6, 0.8, 0, 3, shade(col, -0.05));
  for (let i = 0; i < 8; i++) { const [x, y] = ip(k, -1.45 + i * 0.41, 0.72, 3); k.p.rect(x, y - 13, 2, 13, i % 2 ? col : shade(col, 0.1)); }
  for (let i = 0; i < 4; i++) { const [x, y] = ip(k, 1.45, 0.6 - i * 0.4, 3); k.p.rect(x, y - 13, 2, 13, shade(col, -0.22)); }
  ibox(k, 0, 0, 1.6, 0.8, 16, 3, col);
  gableRoof(k, 0, 0, 1.6, 0.8, 19, 4, shade(col, -0.1));
  for (let u = -1.2; u <= 1.2; u += 0.6) { const [x, y] = ip(k, u, 0.8, 8); lamp(k, x, y, WARM); }
  return { r1: 1.6, r2: 0.8, h: 23 };
}
function colosseum(k: K, col = C('#c8a878')): Foot {
  const ring: P[] = [];
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; ring.push(ip(k, Math.cos(a) * 1.9, Math.sin(a) * 1.4, 0)); }
  k.p.poly(ring.map(([x, y]) => [x, y - 18] as P), shade(col, -0.35));
  for (let i = 10; i < 20; i++) { const a = ring[i], b = ring[(i + 1) % 20]; const lit = i < 15 ? 0 : -0.2; k.p.poly([a, b, [b[0], b[1] - 18], [a[0], a[1] - 18]], (x, y) => { const z = (a[1] + (b[1] - a[1]) * ((x - a[0]) / Math.max(1, b[0] - a[0]))) - y; return Math.floor(z) % 6 >= 2 && Math.floor(z) % 6 <= 4 && Math.floor(x) % 3 === 1 ? C('#3a3030') : shade(col, lit); }); }
  for (let i = 12; i < 18; i += 2) { const [x, y] = ring[i]; lamp(k, x, y - 9, WARM); }
  return { r1: 1.9, r2: 1.4, h: 18 };
}
function castle(k: K, col = C('#e0d4b8')): Foot {
  ibox(k, 0.5, 0.3, 0.9, 0.7, 0, 8, col, { tex: winTex(C('#4a4a50'), 8, 4) });
  ibox(k, -0.3, -0.2, 0.42, 0.42, 0, 26, col, { tex: winTex(C('#3a3e48'), 7, 3, { from: 8 }) });
  for (let i = 0; i < 4; i++) { const [x, y] = ip(k, -0.72 + i * 0.28, 0.22, 26); k.p.rect(x, y - 2, 1, 2, col); }
  const [x, y] = ip(k, -0.3, -0.2, 26); lamp(k, x, y + 8, WARM);
  return { r1: 1.2, r2: 0.9, h: 29 };
}
function wall(k: K): Foot {
  for (let i = 0; i < 14; i++) ibox(k, -3 + i * 0.45, 0, 0.21, 0.08, 0, 7, C('#b8b4ac'), { tex: k.year >= 1975 ? (_s, s, z) => (noise(Math.floor(s), Math.floor(z), i) < 0.25 ? [C('#e04848'), C('#40a0e0'), C('#f0c040'), C('#48b85c')][i % 4] : 0) : undefined, top: C('#a8a49c') });
  ibox(k, 2.2, -0.9, 0.22, 0.22, 0, 16, C('#c8c4bc')); ibox(k, 2.2, -0.9, 0.34, 0.34, 16, 4, C('#5a6068'), { tex: (_s, s) => (Math.floor(s) % 2 ? C('#3a4048') : 0) });
  const [x, y] = ip(k, 2.2, -0.9, 20); lamp(k, x, y, WARM);
  return { r1: 3, r2: 0.3, h: 20 };
}
function hillSign(k: K): Foot {
  const hAt = (dx: number) => 28 * Math.max(0, 1 - Math.abs(dx - 4) / 30) ** 1.3 + (noise(dx, 3, 5) - 0.5) * 1.5;
  mountain(k, -30, 30, hAt, C('#9a8a6a'), C('#7a8a4a'), 4);
  for (let i = 0; i < 9; i++) { const dx = -17 + i * 4, x = k.X + dx, y = k.Y - Math.round(hAt(dx + 1) * 0.72); k.p.rect(x, y - 4, 3, 4, WHITE); k.p.set(x + 2, y - 4, C('#d8d8d4')); k.p.set(x + 2, y - 1, C('#c8c8c4')); if (k.year >= 2000) lamp(k, x + 1, y - 2, WARM); }
  return { r1: 2.5, r2: 1, h: 30 };
}
function bowl(k: K): Foot {
  diamond(G(k), 0, 0, 2, 1.3, (x, y) => (dith(x, y, 0.3) ? C('#6a8a4a') : C('#7a9a58')));
  for (let r = 0; r < 4; r++) { const R = 12 - r * 2.4; const [cx, cy] = ip(k, -0.4, -0.3, 0); for (let a = 0; a <= 32; a++) { const t = Math.PI * (a / 32); k.p.set(Math.round(cx - Math.cos(t) * R), Math.round(cy - Math.sin(t) * R * 0.95), shade(WHITE, -r * 0.05)); } }
  const [cx, cy] = ip(k, -0.4, -0.3, 0); for (let i = -4; i <= 4; i++) lamp(k, cx + i, cy - 2, WARM);
  return { r1: 1.6, r2: 1.1, h: 14 };
}
function studio(k: K): Foot {
  diamond(G(k), 0, 0, 1.2, 0.9, (x, y) => ((x + y) % 4 < 2 ? C('#b8b2a6') : C('#c4beb2')));
  ibox(k, 0, 0, 0.9, 0.6, 0, 10, C('#e4d8c0'), { tex: winTex(C('#3a4e5c'), 5, 4, { to: 8 }) });
  gableRoof(k, 0, 0, 0.9, 0.6, 10, 5, C('#6a4a3a'));
  const [x, y] = ip(k, 0, 0.6, 5); lamp(k, x, y, WARM); lamp(k, x - 2, y - 1, WARM);
  return { r1: 0.9, r2: 0.6, h: 15 };
}
function twin(k: K, col = C('#c8ccd0')): Foot {
  for (const [u, v] of [[-0.55, -0.45], [0.55, 0.45]] as P[]) ibox(k, u, v, 0.42, 0.42, 0, 62, col, { tex: (_s, s, z, len) => (s > 0.5 && s < len - 0.5 && Math.floor(s) % 2 === 1 && z > 2 && z < 61 ? C('#5a6070') : 0) });
  const [x, y] = ip(k, -0.55, -0.45, 62); k.p.rect(x, y - 10, 1, 10, C('#d8dce0')); lamp(k, x, y - 10, REDL);
  for (let z = 8; z < 60; z += 7) { const [wx, wy] = ip(k, 0.3, 0.87, z); if (noise(z, 4, k.seed) < 0.6) lamp(k, wx, wy, WARM); }
  return { r1: 1, r2: 1, h: 72 };
}
function batman(k: K): Foot {
  const c = C('#5c6474');
  ibox(k, 0, 0, 0.62, 0.5, 0, 46, c, { tex: (_s, s, z) => (Math.floor(s) % 2 === 1 && z > 2 ? C('#7a8698') : 0) });
  taper(k, 0, 0, 0.5, 0.25, 46, 5, c);
  for (const s of [-1, 1]) { const [x, y] = ip(k, s * 0.32, 0, 50); k.p.rect(x, y - 12, 2, 12, C('#7a8496')); lamp(k, x, y - 12, REDL); }
  return { r1: 0.62, r2: 0.5, h: 63 };
}
function sears(k: K): Foot {
  const c = C('#3a3c44');
  const tex: Tex = (_s, s, z) => (Math.floor(s) % 2 === 1 && Math.floor(z) % 3 !== 0 ? C('#4c5260') : 0);
  ibox(k, 0, 0, 0.85, 0.85, 0, 30, c, { tex }); ibox(k, -0.2, 0.2, 0.6, 0.6, 30, 16, c, { tex }); ibox(k, -0.3, 0.3, 0.4, 0.4, 46, 16, c, { tex });
  for (const u of [-0.5, -0.15]) { const [x, y] = ip(k, u, 0.3, 62); k.p.rect(x, y - 10, 1, 10, C('#d8dce0')); lamp(k, x, y - 10, REDL); }
  return { r1: 0.85, r2: 0.85, h: 72 };
}

// ---------------------------------------------------------------- r27 (I2b): marcos novos e redesenhados

/** Meia-esfera (cúpula) com ry = r·k, luz no alto à esquerda; só a metade de cima. */
function hemi(k: K, u: number, v: number, z: number, r: number, base: Col, ky = 1): void {
  const [cx, cy0] = ip(k, u, v), cy = cy0 - z, ry = r * ky;
  for (let dy = -Math.ceil(ry); dy <= 0; dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
    const x = (dx + 0.5) / r, y = (dy + 0.5) / ry, d = x * x + y * y;
    if (d > 1) continue;
    const nz = Math.sqrt(1 - d), lum = -0.6 * x - 0.45 * y + 0.62 * nz;
    k.p.set(cx + dx, cy + dy, tn(base, lum > 0.85 ? 5 : lum > 0.5 ? 4 : lum > 0.15 ? 3 : lum > -0.2 ? 2 : 1));
  }
}
/** Faixa horizontal de pixels (para frisos e marquises). */
const hrow = (k: K, x: number, y: number, w: number, c: Col) => { for (let i = 0; i < w; i++) k.p.set(x + i, y, c); };

/** Capitol Records: pilha de "discos" (andares redondos com quebra-sol), agulha com a luz em Morse. */
function capitolRecords(k: K): Foot {
  diamond(G(k), 0, 0, 1.1, 0.9, (x, y) => ((x + y) % 4 < 2 ? C('#b8b2a6') : C('#c4beb2')));
  ibox(k, 0.35, 0.25, 0.7, 0.45, 0, 5, C('#e8e2d2'), { tex: winTex(C('#3a4a5a'), 4, 3) });
  const glass = C('#5a7088'), lip = C('#f0ece2');
  for (let f = 0; f < 13; f++) {
    const z = 3 + f * 3, r = 0.5 - f * 0.012;
    cyl(k, 0, 0, r, z, 2, glass);
    cyl(k, 0, 0, r + 0.1, z + 2, 1, lip);
    const [x, y] = ip(k, 0, 0, z + 1);
    for (let i = -4; i <= 4; i += 2) if (noise(f, i, k.seed) < 0.6) lamp(k, x + i, y, WARM);
  }
  cyl(k, 0, 0, 0.26, 42, 3, lip);
  const [tx, ty] = ip(k, 0, 0, 45);
  k.p.rect(tx, ty - 14, 1, 14, C('#d8dce0')); k.p.set(tx, ty - 15, REDL); lamp(k, tx, ty - 15, REDL); lamp(k, tx, ty - 16, REDL);
  return { r1: 0.62, r2: 0.62, h: 60 };
}

/** Observatório Griffith: corpo branco art déco, cúpula grande de cobre no meio, duas menores nas pontas. */
function griffith(k: K): Foot {
  const hAt = (dx: number) => 14 * Math.max(0, 1 - Math.abs(dx) / 34) ** 0.9 + (noise(dx, 1, 41) - 0.5) * 1.2;
  mountain(k, -34, 34, hAt, C('#9a8a6a'), C('#7a8a50'), 0);
  const w = C('#f0ece2'), cu = C('#4e7a72'), Z = 12;
  ibox(k, 0, 0, 1.7, 0.42, Z, 7, w, { tex: (_s, ss, z, len) => (z > 2 && z < 5 && ss > 2 && ss < len - 2 && Math.floor(ss) % 3 === 1 ? C('#5a6470') : 0) });
  for (const s2 of [-1, 1]) { cyl(k, s2 * 1.55, 0, 0.32, Z + 7, 3, w); hemi(k, s2 * 1.55, 0, Z + 10, 3.6, cu); }
  ibox(k, 0, 0, 0.62, 0.6, Z, 10, w, { tex: (_s, ss, z, len) => (z > 2 && z < 8 && Math.abs(ss - len / 2) < 1 ? C('#4a5260') : 0) });
  cyl(k, 0, 0, 0.55, Z + 10, 3, shade(w, -0.04));
  hemi(k, 0, 0, Z + 13, 6.6, cu);
  const [x, y] = ip(k, 0, 0, Z + 19); k.p.set(x, y - 1, C('#c8a040'));
  for (let u = -1.4; u <= 1.4; u += 0.35) { const [lx, ly] = ip(k, u, 0.42, Z + 4); lamp(k, lx, ly, WARM); }
  lamp(k, x, y + 1, C('#a0c8ff'));
  return { r1: 1.8, r2: 0.8, h: 34 };
}

/** Letreiro de Hollywood: morro de chaparral e letras brancas de pé na encosta (HOLLYWOODLAND até 1949). */
function hollywoodSign(k: K): Foot {
  const hAt = (dx: number) => 32 * Math.max(0, 1 - Math.abs(dx - 6) / 34) ** 1.15 + 4 * Math.exp(-(((dx + 18) / 8) ** 2)) + (noise(dx, 3, 5) - 0.5) * 1.6;
  mountain(k, -34, 38, hAt, C('#a08c66'), C('#86904e'), 6, 0.5);
  for (let dx = -32; dx <= 36; dx += 3) { const h = hAt(dx); if (h > 6 && noise(dx, 9, 3) < 0.5) { const yy = k.Y - Math.round(h * (0.3 + noise(dx, 4, 3) * 0.5)); k.p.set(k.X + dx, yy, C('#5a6a3a')); k.p.set(k.X + dx + 1, yy, C('#4a5a32')); } }
  const word = k.year < 1949 ? 'HOLLYWOODLAND' : 'HOLLYWOOD', step = k.year < 1949 ? 4 : 5;
  const x0 = -Math.round((word.length * step) / 2) + 2;
  for (let i = 0; i < word.length; i++) {
    const dx = x0 + i * step, y = Math.max(k.Y - Math.round(hAt(6) * 0.62) - 5, k.Y - Math.round(hAt(dx + 1)) - 2) + (i % 3 === 1 ? 1 : 0);
    drawText(k.p, word[i], k.X + dx + 1, y + 1, C('#8a8a80'));
    drawText(k.p, word[i], k.X + dx, y, C('#fbfaf6'));
    if (k.year < 1949 || k.year >= 2000) lamp(k, k.X + dx + 1, y + 2, k.year < 1949 ? C('#fff0b8') : WARM);
  }
  return { r1: 2.6, r2: 1, h: 34 };
}

/** Hollywood Bowl: concha de arcos concêntricos encaixada no morro, plateia em leque. */
function hollywoodBowl(k: K): Foot {
  const hAt = (dx: number) => 22 * Math.max(0, 1 - Math.abs(dx + 2) / 30) ** 1.1 + (noise(dx, 2, 8) - 0.5) * 1.2;
  mountain(k, -30, 28, hAt, C('#9a8a6a'), C('#7a8a50'), -2, 0.6);
  for (let r = 0; r < 7; r++) { const R0 = 15 - r * 2.2; for (let i = -Math.ceil(R0 * 1.6); i <= R0 * 1.6; i++) { const t = i / (R0 * 1.6); if (Math.abs(t) > 1) continue; const yy = Math.round(Math.sqrt(1 - t * t) * R0 * 0.55); k.g.set(k.X + i, k.Y + 10 - yy, r % 2 ? C('#7a6a5a') : C('#a89880')); } }
  const cx = k.X - 1, cy = k.Y + 2;
  for (let r = 0; r < 5; r++) { const R = 13 - r * 2.3; for (let a = 0; a <= 40; a++) { const t = Math.PI * (a / 40); const x = Math.round(cx - Math.cos(t) * R), y = Math.round(cy - Math.sin(t) * R * 0.95); k.p.set(x, y, shade(WHITE, -r * 0.06)); k.p.set(x, y + 1, shade(WHITE, -0.18 - r * 0.05)); } }
  for (let i = -8; i <= 8; i++) for (let j = 0; j < 3; j++) k.p.set(cx + i, cy - j, C('#3a3438'));
  for (let i = -6; i <= 6; i += 2) lamp(k, cx + i, cy - 3, k.year >= 1980 ? C('#ff80d0') : WARM);
  for (let r = 0; r < 5; r++) { const R = 13 - r * 2.3; for (let a = 2; a <= 38; a += 6) { const t = Math.PI * (a / 40); lamp(k, Math.round(cx - Math.cos(t) * R), Math.round(cy - Math.sin(t) * R * 0.95), WARM); } }
  return { r1: 1.8, r2: 1.2, h: 24 };
}

/** Stax: cinema velho com marquise ("SOUL CITY USA") e letreiro vertical. */
function stax(k: K): Foot {
  diamond(G(k), 0, 0, 1.3, 0.9, (x, y) => ((x + y) % 4 < 2 ? C('#b8b2a6') : C('#c4beb2')));
  ibox(k, 0, 0, 1.0, 0.6, 0, 12, C('#e8dcc0'), { tex: winTex(C('#5a4a3a'), 6, 4, { from: 7 }) });
  const [x, y] = ip(k, -1.0, 0.6, 5);
  for (let i = 0; i < 16; i++) { const yy = y + Math.floor(i / 2); k.p.set(x + i, yy - 1, C('#2a2428')); k.p.set(x + i, yy - 2, C('#e8c040')); k.p.set(x + i, yy - 3, C('#2a2428')); if (i % 2 === 0) lamp(k, x + i, yy - 2, C('#ffe080')); }
  const [vx, vy] = ip(k, -0.2, 0.6, 9);
  k.p.rect(vx, vy - 9, 3, 11, C('#c83a2a')); for (let j = 0; j < 4; j++) { k.p.set(vx + 1, vy - 7 + j * 2, C('#fff4d0')); lamp(k, vx + 1, vy - 7 + j * 2, C('#ff8060')); }
  return { r1: 1.0, r2: 0.6, h: 14 };
}

/** Hitsville U.S.A.: casinha branca de dois andares com o letreiro azul na frente. */
function hitsville(k: K): Foot {
  diamond(G(k), 0, 0, 1.2, 0.95, (x, y) => (noise(x, y, 3) < 0.15 ? C('#5a9a48') : C('#4e8c42')));
  ibox(k, 0, -0.1, 0.8, 0.55, 0, 13, C('#f2efe6'), { tex: winTex(C('#3a4a5c'), 6, 3) });
  gableRoof(k, 0, -0.1, 0.8, 0.55, 13, 5, C('#5a5a64'));
  const [x, y] = ip(k, -0.75, 0.45, 9);
  const blue = C('#2a5aa8');
  for (let i = 0; i < 13; i++) for (let j = 0; j < 4; j++) k.p.set(x + i, y + Math.floor(i / 2) - j, j === 0 || j === 3 ? C('#f2efe6') : blue);
  for (let i = 1; i < 12; i += 2) { k.p.set(x + i, y + Math.floor(i / 2) - 2, C('#ffffff')); lamp(k, x + i, y + Math.floor(i / 2) - 2, C('#c0d8ff')); }
  return { r1: 0.8, r2: 0.6, h: 18 };
}

/** Renaissance Center: torre cilíndrica de vidro escuro cercada por quatro torres menores. */
function renCen(k: K): Foot {
  diamond(G(k), 0, 0, 1.6, 1.6, (x, y) => ((Math.floor(x / 2) + y) % 2 ? C('#bdb6a8') : C('#c9c2b4')));
  ibox(k, 0, 0, 1.3, 1.3, 0, 6, C('#8a8e96'), { tex: winTex(C('#3a4250'), 3, 2) });
  const gl = C('#4a5e72');
  const ring = (u: number, v: number, r: number, h: number) => { cyl(k, u, v, r, 6, h, gl); const [x, y] = ip(k, u, v, 6); for (let z = 6; z < h; z += 4) for (let i = -Math.floor(r * 9); i <= Math.floor(r * 9); i += 2) if (noise(i, z, k.seed + Math.round(u * 7)) < 0.45) lamp(k, x + i, y - z, WARM); };
  ring(-0.75, -0.75, 0.38, 38); ring(0.75, -0.75, 0.38, 38);
  ring(0, 0, 0.52, 62);
  const [tx, ty] = ip(k, 0, 0, 68); for (let i = -4; i <= 4; i++) lamp(k, tx + i, ty, C('#a0c8ff'));
  ring(-0.75, 0.75, 0.38, 38); ring(0.75, 0.75, 0.38, 38);
  return { r1: 1.3, r2: 1.3, h: 70 };
}

/** Water Tower de Chicago: torre de calcário com ameias e torreões, lanterna e agulha. */
function waterTower(k: K): Foot {
  const c = C('#e2d6b2');
  diamond(G(k), 0, 0, 1.2, 1.2, (x, y) => (noise(x, y, 5) < 0.12 ? C('#5a9a48') : C('#4e8c42')));
  ibox(k, 0, 0, 0.75, 0.75, 0, 12, c, { tex: (_s, ss, z, len) => (z > 4 && z < 9 && Math.abs(ss - len / 2) < 1 ? C('#4a4a50') : Math.floor(z) % 4 === 0 ? shade(c, -0.08) : 0) });
  for (const [u, v] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]] as P[]) { ibox(k, u, v, 0.16, 0.16, 0, 15, c); taper(k, u, v, 0.16, 0, 15, 4, shade(c, -0.05)); }
  ibox(k, 0, 0, 0.32, 0.32, 12, 26, c, { tex: (_s, ss, z) => (Math.floor(z) % 5 === 0 ? shade(c, -0.1) : z > 16 && z < 22 && Math.floor(ss) === 1 ? C('#4a4a50') : 0) });
  ibox(k, 0, 0, 0.38, 0.38, 38, 2, shade(c, 0.06));
  for (const [u, v] of [[-0.38, 0.38], [0.38, 0.38], [0.38, -0.38]] as P[]) { const [x, y] = ip(k, u, v, 40); k.p.rect(x, y - 2, 1, 2, c); }
  cyl(k, 0, 0, 0.2, 40, 6, c); taper(k, 0, 0, 0.2, 0, 46, 8, C('#6a7a70'));
  const [x, y] = ip(k, 0, 0, 30); lamp(k, x, y, WARM); lamp(k, x, y - 1, WARM);
  return { r1: 0.85, r2: 0.85, h: 54 };
}

/** Sacré-Cœur: travertino branco no alto de Montmartre — cúpula ovoide, cupulinhas e campanário. */
function sacreCoeur(k: K): Foot {
  const hAt = (dx: number) => 16 * Math.max(0, 1 - (dx / 34) ** 2) ** 0.8 + (noise(dx, 2, 13) - 0.5) * 1.2;
  mountain(k, -34, 34, hAt, C('#7a8a70'), C('#4e8a44'), 0, 2);
  for (let dx = -26; dx <= 26; dx += 3) { const h = hAt(dx); if (noise(dx, 5, 9) < 0.55) { const yy = k.Y - Math.round(h * (0.25 + noise(dx, 6, 9) * 0.45)); k.p.rect(k.X + dx, yy - 2, 3, 2, [C('#e8dcc4'), C('#d8c8a8'), C('#c8786a')][Math.floor(noise(dx, 7, 9) * 3)]); if (noise(dx, 8, 9) < 0.4) lamp(k, k.X + dx + 1, yy - 1, WARM); } }
  const w = WHITE, Z = 15;
  ibox(k, 0.7, -0.75, 0.2, 0.2, Z, 26, w, { tex: (_s, ss, z) => (z > 18 && z < 22 && Math.floor(ss) === 1 ? C('#5a5a64') : 0) }); taper(k, 0.7, -0.75, 0.2, 0, Z + 26, 5, w);
  ibox(k, 0, 0, 1.0, 0.6, Z, 10, w, { tex: (_s, ss, z, len) => (z > 3 && z < 8 && ss > 1 && ss < len - 1 && Math.floor(ss) % 3 === 1 ? C('#6a6a74') : 0) });
  for (const [u, v] of [[-0.75, 0.45], [0.75, 0.45], [-0.75, -0.45]] as P[]) { cyl(k, u, v, 0.14, Z + 10, 3, w); hemi(k, u, v, Z + 13, 2.2, w, 1.3); }
  cyl(k, 0, 0, 0.4, Z + 10, 7, w);
  hemi(k, 0, 0, Z + 17, 4.8, w, 1.5);
  cyl(k, 0, 0, 0.08, Z + 24, 3, w); const [x, y] = ip(k, 0, 0, Z + 27); k.p.set(x, y - 1, C('#c8c0b0'));
  for (let u = -0.8; u <= 0.8; u += 0.4) { const [lx, ly] = ip(k, u, 0.6, Z + 4); lamp(k, lx, ly, WARM); }
  return { r1: 1.0, r2: 0.7, h: 46 };
}

/** Budokan: base octogonal clara e grande telhado côncavo (como o Fuji) com a giboshi dourada no alto. */
function budokan(k: K): Foot {
  diamond(G(k), 0, 0, 1.7, 1.7, (x, y) => ((x + y) % 4 < 2 ? C('#b8b2a6') : C('#c4beb2')));
  cyl(k, 0, 0, 1.25, 0, 7, C('#e8e2d4'));
  const [cx, cy] = ip(k, 0, 0, 7), roof = C('#5e6e6a');
  for (let z = 0; z < 16; z++) {
    const r = 1.55 * Math.pow(1 - z / 16, 1.7) + 0.06, rx = r * 11.3;
    for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
      if (Math.abs(dx + 0.5) > rx + 0.3) continue;
      const f = (dx + 0.5) / Math.max(1, rx);
      k.p.set(cx + dx, cy - z, shade(roof, z === 0 ? -0.3 : f < -0.35 ? 0.16 : f < 0.2 ? 0 : f < 0.65 ? -0.16 : -0.3));
    }
  }
  for (let i = -13; i <= 13; i += 2) lamp(k, cx + i, cy + 3, WARM);
  ball(k, 0, 0, 7 + 18, 2.4, C('#d8b048')); k.p.rect(cx, cy - 22, 1, 2, C('#d8b048'));
  return { r1: 1.4, r2: 1.4, h: 28 };
}

/** Tokyo Skytree: fuste branco treliçado que afina, dois mirantes em anel e antena. */
function skytree2(k: K): Foot {
  diamond(G(k), 0, 0, 1.0, 1.0, (x, y) => ((Math.floor(x / 2) + y) % 2 ? C('#bdb6a8') : C('#c9c2b4')));
  const c = C('#e8eef4');
  for (let z = 0; z < 64; z++) {
    const w = 6.5 * Math.pow(1 - z / 80, 1.2) + 1, y = k.Y - z;
    for (let dx = -Math.ceil(w); dx <= Math.ceil(w); dx++) {
      const ad = Math.abs(dx + 0.5); if (ad > w) continue;
      const edge = ad > w - 1.2, lace = (Math.abs(dx) + z) % 3 === 0 || (Math.abs(dx) - z + 300) % 3 === 0;
      k.p.set(k.X + dx, y, edge || lace ? (dx < 0 ? c : shade(c, -0.22)) : shade(C('#b8c4d0'), dx < 0 ? 0 : -0.15));
      if (edge && z % 4 === 0) lamp(k, k.X + dx, y, k.year % 2 ? C('#a0c8ff') : C('#d0a0ff'));
    }
  }
  cyl(k, 0, 0, 0.62, 40, 5, C('#9aa8b8')); cyl(k, 0, 0, 0.66, 45, 1, c);
  cyl(k, 0, 0, 0.42, 54, 3, C('#9aa8b8'));
  const [x0, y0] = ip(k, 0, 0, 42), [x1, y1] = ip(k, 0, 0, 55);
  for (let i = -6; i <= 6; i++) lamp(k, x0 + i, y0, WARM);
  for (let i = -4; i <= 4; i++) lamp(k, x1 + i, y1, WARM);
  const [tx, ty] = ip(k, 0, 0, 64); k.p.rect(tx, ty - 14, 1, 14, c); lamp(k, tx, ty - 14, REDL);
  return { r1: 0.7, r2: 0.7, h: 80 };
}

/** Arcos da Lapa: aqueduto branco em dois andares de arcos; bondinho amarelo por cima desde 1896. */
function lapa(k: K): Foot {
  diamond(G(k), 0, 0, 3.4, 0.8, (x, y) => ((x + y) % 4 < 2 ? C('#b8b2a6') : C('#c4beb2')));
  const w = C('#f2eee2');
  for (let i = 0; i <= 12; i++) ibox(k, -3 + i * 0.5, 0, 0.1, 0.16, 0, 10, w);
  ibox(k, 0, 0, 3.1, 0.16, 10, 2, w);
  for (let i = 0; i <= 24; i++) ibox(k, -3 + i * 0.25, 0, 0.05, 0.12, 12, 6, shade(w, -0.03));
  ibox(k, 0, 0, 3.1, 0.18, 18, 2, w, { top: C('#8a8a90') });
  if (k.year >= 1896) { ibox(k, 0.8, 0, 0.32, 0.12, 20, 4, C('#e8c030'), { tex: (_s, ss, z) => (z > 1 && z < 3 && Math.floor(ss) % 2 ? C('#3a4048') : 0) }); const [x, y] = ip(k, 0.8, 0, 22); lamp(k, x, y, WARM); }
  for (let i = 0; i < 12; i++) { const [x, y] = ip(k, -2.75 + i * 0.5, 0.16, 7); lamp(k, x, y, WARM); }
  return { r1: 3.1, r2: 0.3, h: 22 };
}

/** 56 Hope Road: casa colonial creme com varanda de colunas, telhado vermelho e o portão rasta. */
function marley(k: K): Foot {
  diamond(G(k), 0, 0, 1.5, 1.1, (x, y) => (noise(x, y, 6) < 0.15 ? C('#3fa443') : C('#36963c')));
  ibox(k, 0.1, -0.15, 1.0, 0.6, 0, 13, C('#f0e2bc'), { tex: winTex(C('#3a4a3a'), 6, 3) });
  gableRoof(k, 0.1, -0.15, 1.0, 0.6, 13, 5, C('#b84a32'));
  ibox(k, 0.1, 0.5, 1.0, 0.12, 6, 1, C('#e8dcc0'), { top: C('#c86a4a') });
  for (let i = 0; i < 6; i++) { const [x, y] = ip(k, -0.8 + i * 0.36, 0.62, 0); k.p.rect(x, y - 6, 1, 6, WHITE); }
  const rasta = [C('#2a9a3a'), C('#f0c830'), C('#d83a2a')];
  for (let i = 0; i < 18; i++) { const [x, y] = ip(k, -1.45 + i * 0.12, 1.0, 0); for (let j = 0; j < 3; j++) k.p.set(x, y - j - 1, rasta[j]); }
  const [lx, ly] = ip(k, 0.1, 0.62, 3); lamp(k, lx, ly, WARM); lamp(k, lx - 4, ly - 2, WARM);
  return { r1: 1.0, r2: 0.7, h: 18 };
}

/** Teatro Nacional de Lagos: tambor baixo e largo com a "aba de quepe" e a cobertura em cúpula rasa. */
function lagosTheatre(k: K): Foot {
  diamond(G(k), 0, 0, 2.1, 2.1, (x, y) => ((Math.floor(x / 2) + y) % 2 ? C('#bdb6a8') : C('#c9c2b4')));
  const w = C('#e6e2d8'), rim = C('#d8c890');
  cyl(k, 0, 0, 1.5, 0, 8, w);
  const [cx, cy] = ip(k, 0, 0, 0);
  for (let i = -15; i <= 15; i++) { k.p.set(cx + i, cy - 4, C('#3a4250')); if (i % 2 === 0) lamp(k, cx + i, cy - 4, WARM); }
  for (let z = 0; z < 3; z++) { const rx = 21 - z; for (let dx = -rx; dx <= rx; dx++) k.p.set(cx + dx, cy - 8 - z, shade(rim, dx < -rx * 0.3 ? 0.12 : dx > rx * 0.4 ? -0.18 : 0)); }
  hemi(k, 0, 0, 11, 14, C('#c8c4ba'), 0.42);
  for (let i = -12; i <= 12; i += 3) k.p.set(cx + i, cy - 12, C('#a8a49a'));
  const [vx, vy] = ip(k, 0, 1.55, 10);
  for (let j = 0; j < 3; j++) hrow(k, vx - 9 + j, vy + j, 18 - j * 2, shade(rim, -0.1 - j * 0.05));
  return { r1: 1.6, r2: 1.6, h: 20 };
}

/** Ponte baixa sobre muitos pilares (Terceiro Continente; Carter com treliça de aço antes de 1970). */
function beamBridge(k: K, truss: boolean): Foot {
  diamond(G(k), 0, 0, 3.6, 0.9, (x, y) => (noise(x, y, 5) < 0.06 ? C('#6aa8d0') : C('#4a8ab4')));
  const c = truss ? C('#6a6a70') : C('#c8c4bc');
  for (let i = 0; i <= 12; i++) ibox(k, -3.3 + i * 0.55, 0, 0.08, 0.14, 0, 6, shade(c, -0.08));
  ibox(k, 0, 0, 3.45, 0.2, 6, 2, c, { top: C('#5a5a62') });
  if (truss) for (let i = 0; i < 28; i++) { const [x, y] = ip(k, -3.3 + i * 0.24, 0.2, 8); k.p.set(x, y - (i % 2 ? 4 : 1), c); k.p.set(x, y - 2, c); k.p.set(x, y - 3, c); }
  for (let i = 0; i < 14; i++) { const [x, y] = ip(k, -3.2 + i * 0.5, 0.2, 9); lamp(k, x, y, k.year >= 1990 ? C('#ffe8b0') : WARM); }
  return { r1: 3.4, r2: 0.3, h: 12 };
}

// ---------------------------------------------------------------- catálogo

interface Spec { base: Base; draw: (k: K) => Foot }
/** R31 (GEO): Elevador Lacerda (Salvador) — escarpa da Cidade Alta com casario no alto, torre do elevador na Cidade
 *  Baixa e passarela até o topo. Art déco creme desde a reforma de 1930; antes, torre de ferro treliçada. */
function lacerda(k: K): Foot {
  const deco = k.year >= 1930, rock = C('#8a7660'), green = C('#4e8a44');
  // escarpa (fundo à esquerda) com mata na encosta e casario colonial no alto
  ibox(k, -1.5, -0.2, 0.8, 1.1, 0, 30, rock, { top: green, tex: (_sd, s, z) => (noise(Math.floor(s / 2), Math.floor(z / 3), k.seed + 5) < 0.35 ? tn(green, 2) : (Math.floor(s) + Math.floor(z / 4)) % 5 === 0 ? tn(rock, 2) : 0) });
  const roofs = [C('#c8603c'), C('#e8c070'), C('#d88a6a')], walls = [C('#f0e4cc'), C('#e8c8a0'), C('#a8d0c8'), C('#f4ecdc')];
  [[-1.9, -0.9], [-1.2, -0.9], [-1.9, 0.3], [-1.2, 0.2]].forEach(([u, v], i) => ibox(k, u, v, 0.3, 0.3, 30, 6 + (i % 2) * 2, walls[i % walls.length], { top: roofs[i % roofs.length], tex: winTex(C('#4a3a30'), 4, 3, { from: 2 }) }));
  // passarela do topo da torre até a escarpa
  const tw = deco ? C('#ece2cc') : C('#7a7e86');
  ibox(k, -0.4, 0.15, 0.75, 0.2, 27, 4, tw, { tex: winTex(C('#3a4a5a'), 4, 2, { from: 1 }) });
  // torre do elevador
  const tex: Tex = deco
    ? (_sd, s, z, len) => (s > 0.5 && s < len - 0.5 && Math.floor(s) % 3 === 1 && z > 4 && z < 36 ? C('#c8bca0') : Math.floor(z) % 12 === 0 ? C('#f8f2e2') : 0)
    : (_sd, s, z) => ((Math.floor(s) + Math.floor(z)) % 4 === 0 || (Math.floor(s) - Math.floor(z) + 40) % 4 === 0 ? C('#4a4e56') : C('#9aa0a8'));
  ibox(k, 0.55, 0.15, 0.38, 0.38, 0, 36, tw, { tex });
  ibox(k, 0.55, 0.15, 0.48, 0.48, 36, 7, tw, { top: deco ? C('#d8cfb8') : C('#5a5e66'), tex: winTex(C('#3a4a5a'), 7, 2, { from: 2, to: 5 }) });
  if (deco) { const [x, y] = ip(k, 0.55, 0.15, 44); k.p.rect(x - 1, y - 3, 2, 3, tw); lamp(k, x, y - 4, REDL); }
  for (const z of [38, 40]) { const [x, y] = ip(k, 0.35, 0.6, z); lamp(k, x, y, WARM); lamp(k, x + 3, y - 1, WARM); }
  return { r1: 1.6, r2: 1.2, h: 46 };
}
const BESPOKE: Record<string, Spec> = {
  ssa_lacerda: { base: 'plaza', draw: lacerda },
  lon_bigben: { base: 'plaza', draw: (k) => bigBen(k) },
  lon_tbridge: { base: 'none', draw: towerBridge },
  lon_eye: { base: 'plaza', draw: wheel },
  lon_bt: { base: 'plaza', draw: (k) => tvTower(k, { ball: false, shaft: C('#c8ccd0'), podR: 9, pod: 50, H: 48 }) },
  lon_rah: { base: 'none', draw: (k) => dome(k, C('#b8644a'), C('#9aa8b0')) },
  lon_abbey: { base: 'none', draw: studio },
  par_eiffel: { base: 'plaza', draw: eiffel },
  par_arc: { base: 'plaza', draw: (k) => arcTriomphe(k) },
  par_olympia: { base: 'none', draw: (k) => hall(k, { wall: C('#e8dcc4'), roof: C('#7a8a96'), arch: true }) },
  ny_empire: { base: 'plaza', draw: (k) => empire(k) },
  ny_liberty: { base: 'none', draw: liberty },
  ny_brooklyn: { base: 'none', draw: (k) => suspension(k, { tower: C('#b8a88e'), cable: C('#5a5e66'), stone: true }) },
  ny_wtc: { base: 'plaza', draw: (k) => twin(k) },
  ny_carnegie: { base: 'none', draw: (k) => hall(k, { wall: C('#b86a4a'), roof: C('#5a5a62'), arch: true }) },
  ny_apollo: { base: 'none', draw: (k) => hall(k, { wall: C('#c8b090'), roof: C('#5a4a4a'), arch: false }) },
  rio_christ: { base: 'none', draw: (k) => christ(k, true) },
  rio_corcovado: { base: 'none', draw: (k) => christ(k, false) },
  rio_cable: { base: 'none', draw: (k) => sugarloaf(k, true) },
  rio_sugar: { base: 'none', draw: (k) => sugarloaf(k, false) },
  rio_maracana: { base: 'plaza', draw: stadium },
  sp_masp: { base: 'none', draw: masp },
  sp_italia: { base: 'plaza', draw: italia },
  sp_municipal: { base: 'none', draw: (k) => dome(k, C('#d8c8a0'), C('#6aa890')) },
  liv_liver: { base: 'plaza', draw: liver },
  liv_cavern: { base: 'none', draw: (k) => hall(k, { wall: C('#8a4430'), roof: C('#4a4a50'), r1: 0.9, r2: 0.6, h: 10 }) },
  man_trafford: { base: 'none', draw: stadium },
  man_fth: { base: 'none', draw: (k) => hall(k, { wall: C('#c8b088'), roof: C('#5a5a62'), arch: true }) },
  mem_sun: { base: 'none', draw: sunStudio },
  mem_bridge: { base: 'none', draw: (k) => archBridge(k, { col: C('#d8dce0'), double: true, peak: 18 }) },
  mem_pyramid: { base: 'plaza', draw: (k) => pyramid(k, C('#b8bec8'), true) },
  nash_ryman: { base: 'none', draw: (k) => hall(k, { wall: C('#9a4a34'), roof: C('#5a4a46'), arch: true, r1: 1.2, r2: 0.75, h: 13 }) },
  nash_opry: { base: 'none', draw: (k) => hall(k, { wall: C('#c89a72'), roof: C('#e8e4dc'), cols: true, r1: 1.6, r2: 0.8, h: 9 }) },
  nash_batman: { base: 'plaza', draw: batman },
  tok_tower: { base: 'plaza', draw: tokyoTower },
  tok_sky: { base: 'plaza', draw: skytree2 },
  tok_budokan: { base: 'none', draw: budokan },
  ber_tv: { base: 'plaza', draw: (k) => tvTower(k, { ball: true, shaft: C('#cfcbc2') }) },
  ber_gate: { base: 'none', draw: (k) => brandenburg(k) },
  ber_wall: { base: 'none', draw: wall },
  syd_opera: { base: 'none', draw: opera },
  syd_bridge: { base: 'none', draw: (k) => archBridge(k, { col: C('#6e7884'), pylons: true }) },
  sf_gate: { base: 'none', draw: (k) => suspension(k, { tower: C('#c0402c'), cable: C('#b03828') }) },
  lis_bridge: { base: 'none', draw: (k) => suspension(k, { tower: C('#c0402c'), cable: C('#b03828') }) },
  ist_bridge: { base: 'none', draw: (k) => suspension(k, { tower: C('#d8dce0'), cable: C('#9aa0a8') }) },
  det_ambassador: { base: 'none', draw: (k) => suspension(k, { tower: C('#3a4a5a'), cable: C('#3a4a5a') }) },
  la_sign: { base: 'none', draw: hollywoodSign },
  la_bowl: { base: 'none', draw: hollywoodBowl },
  la_griffith: { base: 'none', draw: griffith },
  la_capitol: { base: 'plaza', draw: capitolRecords },
  nash_parthenon: { base: 'plaza', draw: (k) => temple(k, C('#d8ccae')) },
  mem_stax: { base: 'none', draw: stax },
  det_hitsville: { base: 'none', draw: hitsville },
  det_rencen: { base: 'plaza', draw: renCen },
  chi_water: { base: 'none', draw: waterTower },
  par_sacre: { base: 'none', draw: sacreCoeur },
  rio_lapa: { base: 'none', draw: lapa },
  kgn_devon: { base: 'none', draw: (k) => hall(k, { wall: C('#f2ece0'), roof: C('#4a7a5a'), cols: true, r1: 1.3, r2: 0.75, h: 11 }) },
  kgn_marley: { base: 'none', draw: marley },
  lag_theatre: { base: 'none', draw: lagosTheatre },
  lag_carter: { base: 'none', draw: (k) => beamBridge(k, k.year < 1970) },
  lag_mainland: { base: 'none', draw: (k) => beamBridge(k, false) },
  syd_tower: { base: 'plaza', draw: (k) => tvTower(k, { ball: false, shaft: C('#c8c8c4'), podR: 8, pod: 52, H: 50, podCol: C('#d0a848') }) },
  hav_tropicana: { base: 'none', draw: bowl },
  chi_sears: { base: 'plaza', draw: sears },
  sea_needle: { base: 'plaza', draw: (k) => tvTower(k, { ball: false, shaft: C('#e8e4dc'), podR: 13, pod: 46, H: 44 }) },
  tor_cn: { base: 'plaza', draw: (k) => tvTower(k, { ball: false, shaft: C('#d8d4cc'), podR: 9, pod: 44, H: 42 }) },
  was_monument: { base: 'plaza', draw: (k) => obelisk(k) },
  was_capitol: { base: 'none', draw: (k) => dome(k, WHITE, WHITE) },
  ba_obelisk: { base: 'plaza', draw: (k) => obelisk(k, WHITE) },
};
function arcTriomphe(k: K): Foot {
  const c = C('#ddd0b0');
  diamond(G(k), 0, 0, 1.9, 1.5, (x, y) => ((Math.floor(x / 2) + y) % 2 ? C('#bdb6a8') : C('#c9c2b4'))); // a Étoile
  ibox(k, 0, 0, 1.15, 0.66, 0, 28, c, { tex: (side, s, z, len) => { const half = len / 2, w = side ? 2.4 : 5, top = side ? 13 : 19; const dx = Math.abs(s - half); if (dx < w && z < top - (dx / w) ** 2 * 4) return C('#4a4648'); if (z > 6 && z < 13 && Math.abs(dx - len * 0.36) < 1.5 && !side) return shade(c, -0.1); return Math.floor(z) === 23 ? shade(c, -0.14) : 0; } });
  ibox(k, 0, 0, 1.18, 0.69, 28, 3, shade(c, 0.05));
  const [x, y] = ip(k, 0, 0.66, 12); lamp(k, x, y, WARM); lamp(k, x - 3, y - 1, WARM); lamp(k, x + 3, y + 1, WARM);
  return { r1: 1.15, r2: 0.66, h: 31 };
}
const GENERIC: Record<LmShape, Spec> = {
  statue: { base: 'none', draw: liberty }, cable: { base: 'none', draw: (k) => sugarloaf(k, true) }, bridge: { base: 'none', draw: (k) => suspension(k, { tower: C('#8a96a0'), cable: C('#6a7480') }) },
  tbridge: { base: 'none', draw: towerBridge }, arch: { base: 'none', draw: (k) => archBridge(k, { col: C('#7a8088'), pylons: true }) }, spire: { base: 'plaza', draw: (k) => empire(k, { col: C('#c8c0b0') }) },
  twin: { base: 'plaza', draw: (k) => twin(k, C('#d8d4cc')) }, clock: { base: 'plaza', draw: (k) => bigBen(k, { stone: C('#c8bca4'), tall: 30 }) }, lattice: { base: 'plaza', draw: eiffel },
  needle: { base: 'plaza', draw: (k) => tvTower(k, { ball: false, shaft: C('#d8d4cc'), podR: 9, pod: 44, H: 42 }) }, shell: { base: 'none', draw: opera }, stadium: { base: 'plaza', draw: stadium },
  dome: { base: 'none', draw: (k) => dome(k) }, hall: { base: 'none', draw: (k) => hall(k, { wall: C('#d8c8a8'), roof: C('#5a6068'), cols: true }) }, cathedral: { base: 'none', draw: (k) => cathedral(k, GEN_STONE27[k.reg ?? ''] ?? C('#c8bca4')) },
  wall: { base: 'none', draw: wall }, pyramid: { base: 'none', draw: (k) => pyramid(k, C('#d8b878')) }, minaret: { base: 'plaza', draw: (k) => minaret(k) }, pagoda: { base: 'plaza', draw: (k) => pagoda(k) },
  sign: { base: 'none', draw: hillSign }, gate: { base: 'none', draw: (k) => brandenburg(k, { col: C('#d8ccb0'), quadriga: false }) }, colosseum: { base: 'none', draw: (k) => colosseum(k) },
  castle: { base: 'plaza', draw: (k) => castle(k) }, wheel: { base: 'plaza', draw: wheel }, obelisk: { base: 'plaza', draw: (k) => obelisk(k) }, temple: { base: 'none', draw: (k) => temple(k) },
  studio: { base: 'none', draw: studio },
};

/** r27 (I2b): pedra da catedral genérica pela região (caiada no trópico e na América Latina, ocre no Oriente Médio). */
const GEN_STONE27: Record<string, Col> = { br: C('#f0e8d4'), latam: C('#f0e4cc'), carib: C('#f2ecdc'), africa: C('#ece0c4'), mena: C('#dcc49a'), med: C('#e4d6b8'), south: C('#e8d8b8'), asia: C('#d8d0c0') };

/** Tem desenho próprio (não só a forma genérica)? */
export const hasBespoke27 = (id: string): boolean => id in BESPOKE;

/** Onde fica cada bastidor (grade do mapa: atrás das bordas gx < 0 e gy < 0). */
export const LM_SLOTS27: [number, number][] = [[-2.6, 3.4], [4.6, -2.6], [-2.8, 9.4], [11.4, -2.8]];

/**
 * Desenha um marco com base no chão em (x, y) de `p` (cor) e `gl` (luzes). `sea` = em volta é mar (ilha/praça viram
 * terra firme). Devolve a caixa ocupada [x0, y0, x1, y1] para o ponto clicável.
 */
export function drawLmIso27(p: Px, gl: Px, id: string, sh: LmShape, x: number, y: number, year: number, sea: boolean, seed = 0, city = ''): [number, number, number, number] {
  const spec = BESPOKE[id] ?? GENERIC[sh] ?? GENERIC.cathedral;
  const q = new Px(QW, QH), ql = new Px(QW, QH), g = new Px(QW, QH), gb = new Px(QW, QH);
  const k: K = { p: q, l: ql, X: AX, Y: AY, year, seed, g, reg: city ? region27(city) : undefined };
  const kg: K = { ...k, p: gb };
  const foot = spec.draw(k);
  const r1 = foot.r1 + 0.45, r2 = foot.r2 + 0.45;
  if (spec.base === 'plaza' || spec.base === 'island') {
    if (sea || spec.base === 'island') { diamond(kg, 0, 0, r1 + 0.5, r2 + 0.5, C('#e6d6a6')); diamond(kg, 0, 0, r1 + 0.2, r2 + 0.2, (xx, yy) => (dith(xx, yy, 0.2) ? C('#4a9a44') : C('#56a84c'))); }
    if (spec.base === 'plaza') diamond(kg, 0, 0, r1, r2, (xx, yy) => ((Math.floor(xx / 2) + yy) % 2 ? C('#bdb6a8') : C('#c9c2b4')));
  }
  // sombra para a direita (luz do alto à esquerda): pegada + pegada deslocada em +u
  const L = Math.min(3.2, foot.h / 16);
  const sh0 = [ip(kg, -foot.r1, -foot.r2), ip(kg, foot.r1 + L, -foot.r2), ip(kg, foot.r1 + L, foot.r2), ip(kg, -foot.r1, foot.r2)];
  gb.blit(g, 0, 0); // água/ilha desenhadas pelo próprio marco (por baixo da sombra)
  gb.poly(sh0, SHADOW);
  // contorno só por fora (os vãos da treliça continuam vazados)
  outlineOuter(q, OUTL);
  p.blit(gb, Math.round(x - AX), Math.round(y - AY));
  p.blit(q, Math.round(x - AX), Math.round(y - AY));
  // r27 (I2b): o marco tapa as luzes do horizonte e as estrelas que ficam atrás dele
  for (let j = 0; j < QH; j++) for (let i = 0; i < QW; i++) if (q.d[j * QW + i] >>> 24 > 40) { const gx = i + Math.round(x - AX), gy = j + Math.round(y - AY); if (gx >= 0 && gy >= 0 && gx < gl.w && gy < gl.h) gl.d[gy * gl.w + gx] = 0; }
  gl.blit(ql, Math.round(x - AX), Math.round(y - AY));
  // caixa ocupada
  let x0 = QW, y0 = QH, x1 = 0, y1 = 0;
  for (let j = 0; j < QH; j++) for (let i = 0; i < QW; i++) if (q.d[j * QW + i] >>> 24 > 40) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  if (x1 < x0) return [x - 4, y - 8, x + 4, y];
  return [x0 + Math.round(x - AX), y0 + Math.round(y - AY), x1 + 1 + Math.round(x - AX), y1 + 1 + Math.round(y - AY)];
}

/** Contorno de 1 px nos pixels vazios ligados à borda (vãos internos não ganham contorno). */
export function outlineOuter(q: Px, c: Col): void {
  const W = q.w, H = q.h, src = q.d.slice(), out = new Uint8Array(W * H);
  const op = (i: number) => (src[i] >>> 24) > 40;
  const st: number[] = [];
  for (let i = 0; i < W; i++) { st.push(i, (H - 1) * W + i); }
  for (let j = 0; j < H; j++) { st.push(j * W, j * W + W - 1); }
  while (st.length) {
    const i = st.pop()!;
    if (out[i] || op(i)) continue;
    out[i] = 1;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1); if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W);
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!out[i] || y > AY) continue;
    if ((x > 0 && op(i - 1)) || (x < W - 1 && op(i + 1)) || (y > 0 && op(i - W)) || (y < H - 1 && op(i + W))) q.d[i] = c;
  }
}
