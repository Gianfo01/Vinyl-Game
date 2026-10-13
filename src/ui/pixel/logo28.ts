// Rodada 28 (ARTE) — LOGOS DE BANDA por gênero e época, no estilo antigo (32×32, iniciais na fonte 3×5 ampliada):
// metal pontiagudo, estêncil punk sobre spray, script inclinado da disco, alvo mod (britpop), grafite em bolha (rap),
// cromado synth com horizonte, rabisco indie em papel com fita, ferradura country, quadrado tipográfico do jazz, círculo
// rasta, matriz de LEDs da eletrônica, selo de compacto do soul, sol latino, coroa de louros clássica, carimbo hanko,
// escudo com padrão africano, adesivo pop, raio do rock. Cerca de 45% dos atos seguem no logo original de art.ts.
// Também o LETREIRO (wordmark 64×16) com o nome inteiro na tipografia do gênero, para a página do artista.

import { drawText, fitText, textWidth } from './font';
import { C, Px, dith, hsl, mix, noise, shade, withAlpha, type Col } from './px';
import { K28 as K, h28, pxImg28, rng28 } from './art28kit';
import { genreMood28, type Mood28 } from './cover28';
import type { Rng } from '../../core/rng';

export const LOGO_STYLES28 = ['spiky', 'stencil', 'script', 'target', 'bubble', 'chrome', 'hand', 'horseshoe', 'block', 'rasta', 'led', 'label45', 'sun', 'laurel', 'hanko', 'pattern', 'sticker', 'bolt'] as const;
export type LogoStyle28 = (typeof LOGO_STYLES28)[number];

const MOOD_LOGO: Record<Mood28, LogoStyle28[]> = {
  metal: ['spiky'], punk: ['stencil'], disco: ['script'], britpop: ['target'], hiphop: ['bubble'], synth: ['chrome'], indie: ['hand'], country: ['horseshoe'],
  jazz: ['block', 'script'], reggae: ['rasta'], electronic: ['led', 'chrome'], soul: ['label45', 'script'], latin: ['sun'], brazil: ['sun', 'label45'], classical: ['laurel'],
  asia: ['hanko'], africa: ['pattern'], pop: ['sticker', 'script'], rock: ['bolt', 'target'],
};

/** Estilo novo de logo (ou null = logo original). Puro. */
export function logoStyle28(seed: number, genre: string, year: number): LogoStyle28 | null {
  if (year < 1946 || h28('logo', seed) % 100 < 45) return null;
  const m = genreMood28(genre);
  let opts = MOOD_LOGO[m];
  if (m === 'metal' && year < 1969) opts = ['bolt'];
  if (m === 'hiphop' && year < 1979) opts = ['label45'];
  if ((m === 'synth' || m === 'electronic') && year < 1975) opts = ['target'];
  return opts[h28('logos', seed) % opts.length];
}

// ---------------------------------------------------------------- letras

/** Desenha as letras numa camada (para aplicar efeitos) e devolve a camada. */
function letters(t: string, sc: number, w: number, hh: number, col: Col = K.white): Px {
  const q = new Px(w, hh);
  drawText(q, t, Math.round((w - textWidth(t, sc)) / 2), Math.round((hh - 5 * sc) / 2), col, sc);
  return q;
}
function paste(p: Px, q: Px, dx: number, dy: number, f: (x: number, y: number) => Col): void {
  for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) if (q.get(x, y)) p.set(x + dx, y + dy, f(x, y));
}
function ring1(p: Px, q: Px, dx: number, dy: number, c: Col, diag = true): void {
  for (let y = -1; y <= q.h; y++) for (let x = -1; x <= q.w; x++) {
    if (q.get(x, y)) continue;
    const n = q.get(x - 1, y) || q.get(x + 1, y) || q.get(x, y - 1) || q.get(x, y + 1) || (diag && (q.get(x - 1, y - 1) || q.get(x + 1, y + 1) || q.get(x + 1, y - 1) || q.get(x - 1, y + 1)));
    if (n) p.set(x + dx, y + dy, c);
  }
}
/** Efeitos de letra por estilo (usados no logo e no letreiro). */
function styled(p: Px, t: string, sc: number, dx: number, dy: number, w: number, hh: number, st: LogoStyle28, r: Rng, a: Col, b: Col): void {
  const q = letters(t, sc, w, hh);
  switch (st) {
    case 'spiky': {
      ring1(p, q, dx, dy, K.ink);
      paste(p, q, dx, dy, (_x, y) => (y < hh / 2 ? K.white : K.silver));
      for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
        if (!q.get(x, y)) continue;
        if (!q.get(x, y - 1) && noise(x, y, 5) < 0.45) { const L = 1 + (noise(x, y, 6) < 0.5 ? 1 : 0) + (noise(x, y, 8) < 0.2 ? 1 : 0); for (let k = 1; k <= L; k++) p.set(x + dx, y + dy - k, k === L ? K.dsilver : K.silver); }
        if (!q.get(x, y + 1) && noise(x, y, 9) < 0.3) { p.set(x + dx, y + dy + 1, K.silver); p.set(x + dx, y + dy + 2, K.dsilver); }
      }
      return;
    }
    case 'stencil': {
      const mid = Math.round((hh - 5 * sc) / 2) + Math.floor(2.5 * sc);
      paste(p, q, dx, dy, (x, y) => (y === mid || (sc > 1 && y === mid - 1 && x % 2) ? 0 : a));
      return;
    }
    case 'script': {
      const sh = (y: number) => -Math.floor((y - hh / 2) / 3);
      for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) if (q.get(x, y)) { p.set(x + dx + sh(y) + 1, y + dy + 1, shade(a, -0.5)); }
      for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) if (q.get(x, y)) p.set(x + dx + sh(y), y + dy, mix(a, b, y / hh));
      return;
    }
    case 'bubble': {
      const fat = new Px(w, hh); for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) if (q.get(x, y) || q.get(x - 1, y) || q.get(x, y - 1)) fat.put(x, y, a);
      ring1(p, fat, dx, dy, K.ink); paste(p, fat, dx, dy, (_x, y) => (y < hh / 2 - 1 ? shade(a, 0.4) : a));
      for (let x = 0; x < w; x++) for (let y = hh - 1; y >= 0; y--) if (fat.get(x, y)) { if (noise(x, 0, 3) < 0.18) { p.set(x + dx, y + dy + 1, a); p.set(x + dx, y + dy + 2, a); } break; }
      return;
    }
    case 'chrome': {
      const ramp = [K.white, C('#c8f0ff'), C('#7ad0ff'), C('#3a4a8a'), C('#f0a0ff'), K.white];
      ring1(p, q, dx, dy, C('#1a0e3a'));
      const top = Math.round((hh - 5 * sc) / 2);
      paste(p, q, dx, dy, (_x, y) => ramp[Math.max(0, Math.min(5, Math.floor(((y - top) / (5 * sc)) * 6)))]);
      return;
    }
    case 'hand': {
      for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) if (q.get(x, y)) p.set(x + dx, y + dy + (noise(Math.floor(x / (4 * sc)), 0, 7) < 0.45 ? 1 : 0), a);
      return;
    }
    case 'led': {
      paste(p, q, dx, dy, (x, y) => ((x + y) % 2 ? a : shade(a, -0.45)));
      return;
    }
    default: {
      ring1(p, q, dx, dy, b, false); paste(p, q, dx, dy, () => a); void r;
    }
  }
}

// ---------------------------------------------------------------- logo 32×32

const N = 32;
type Mask = (x: number, y: number) => boolean;
const dsk = (r: number): Mask => (x, y) => (x + 0.5 - 16) ** 2 + (y + 0.5 - 16) ** 2 <= r * r;
function fillM(p: Px, m: Mask, c: (x: number, y: number) => Col): void { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (m(x, y)) p.set(x, y, c(x, y)); }

/** Pinta o logo novo (32×32, com contorno). */
export function logoStylePx28(st: LogoStyle28, seed: number, ini: string, genre: string, year: number): Px {
  const p = new Px(N, N);
  const r = rng28('logo', seed, st);
  const hue = (h28('lh', seed, genre) + r.int(0, 40)) % 360;
  const a = hsl(hue, 75, 58), b = hsl(hue + 160, 60, 35);
  const t2 = fitText(ini, 28, 2);
  const T = t2.length ? t2 : fitText(ini, 28);
  const sc = t2.length ? 2 : 1;
  const L = (st2: LogoStyle28, ca: Col, cb: Col, dy = 0) => styled(p, T, sc, 2, 9 + dy, 28, 14, st2, r, ca, cb);
  switch (st) {
    case 'spiky': {
      p.poly([[1, 6], [8, 9], [16, 3], [24, 9], [31, 6], [27, 18], [16, 30], [5, 18]], C('#161012'));
      for (let y = 18; y < 30; y++) for (let x = 0; x < N; x++) if (p.get(x, y) && dith(x, y, (y - 16) / 18)) p.put(x, y, C('#6a1018'));
      L('spiky', a, b, 1); break;
    }
    case 'stencil': {
      const fl = r.pick([C('#f8e030'), C('#f06aa8'), C('#a8f040'), C('#f0f0e8')]);
      fillM(p, (x, y) => Math.hypot(x + 0.5 - 16, y + 0.5 - 15) < 11 + noise(x >> 1, y >> 1, seed) * 4, () => fl);
      for (let i = 0; i < 4; i++) { const x = 6 + r.int(0, 20); for (let y = 22; y < 22 + r.int(4, 9); y++) p.set(x, y, fl); }
      L('stencil', C('#151214'), C('#151214')); break;
    }
    case 'script': {
      fillM(p, (x, y) => y >= 8 && y <= 24 && Math.hypot(Math.max(0, Math.abs(x + 0.5 - 16) - 8), y + 0.5 - 16) <= 8, (x, y) => mix(C('#3a0e4a'), C('#7a1a6a'), y / N));
      L('script', C('#ffb0e0'), C('#f0c040'));
      for (const [x, y] of [[4, 6], [27, 8], [26, 24]] as const) { p.put(x, y, K.white); p.put(x - 1, y, K.lgold); p.put(x + 1, y, K.lgold); p.put(x, y - 1, K.lgold); p.put(x, y + 1, K.lgold); }
      break;
    }
    case 'target': {
      fillM(p, dsk(14.5), (x, y) => { const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 16); return d > 10.5 ? C('#2c3a8a') : d > 5.5 ? C('#f8f4ec') : C('#c8302c'); });
      if (r.chance(0.4)) p.poly([[24, 4], [31, 4], [31, 11]], C('#f8f4ec'));
      L('block', K.ink, K.white); break;
    }
    case 'bubble': {
      for (let y = 4; y < 28; y++) for (let x = 2; x < 30; x++) p.put(x, y, y % 4 === 3 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0 ? C('#6a3a2a') : C('#9a4e38'));
      p.poly([[9, 6], [9, 1], [12, 4], [16, 0], [20, 4], [23, 1], [23, 6]], K.gold);
      L('bubble', a, b, 1); break;
    }
    case 'chrome': {
      p.poly([[16, 1], [31, 16], [16, 31], [1, 16]], C('#0a0620'));
      for (let k = 0; k < 4; k++) { const y = 20 + k * k; for (let x = 0; x < N; x++) if (p.get(x, y)) p.put(x, y, C('#3ad8ff')); }
      L('chrome', a, b, -1); break;
    }
    case 'hand': {
      const ang = r.pick([-1, 1]);
      for (let y = 3; y < 29; y++) for (let x = 3; x < 29; x++) p.put(x + Math.round((y - 16) * 0.06 * ang), y, K.paper);
      p.rect(11, 1, 10, 4, withAlpha(C('#c8c0a0'), 220));
      L('hand', K.ink, K.ink);
      p.put(24, 24, hsl(hue, 70, 50)); p.put(23, 25, hsl(hue, 70, 50)); p.put(25, 25, hsl(hue, 70, 50)); p.put(24, 26, hsl(hue, 70, 50)); break;
    }
    case 'horseshoe': {
      fillM(p, (x, y) => { const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 13); return d <= 13.5 && (d >= 9 || y >= 22) && !(y >= 22 && Math.abs(x + 0.5 - 16) < 9); }, (x, y) => (Math.round(Math.hypot(x - 15.5, y - 12.5)) === 11 && (x + y) % 3 === 0 ? K.dbrown : C('#b08048')));
      p.disc(16, 13, 8.6, C('#e8d0a0'));
      L('block', C('#6a1a10'), K.cream, -2); break;
    }
    case 'block': {
      p.rect(3, 3, 26, 26, hsl(hue, 70, 45)); p.rect(3, 22, 26, 7, K.ink); p.rect(3, 3, 4, 19, K.white);
      L('block', K.white, K.ink, -2); break;
    }
    case 'rasta': {
      fillM(p, dsk(14), (_x, y) => (y < 11 ? C('#c8302c') : y < 21 ? C('#f0c040') : C('#2c7a3c')));
      L('block', K.white, K.ink); break;
    }
    case 'led': {
      p.rect(2, 4, 28, 24, C('#101418'));
      for (let y = 5; y < 27; y += 2) for (let x = 3; x < 29; x += 2) p.put(x, y, C('#202830'));
      L('led', hsl(hue, 90, 60), K.ink); break;
    }
    case 'label45': {
      fillM(p, dsk(14.5), (x, y) => (Math.floor(Math.hypot(x + 0.5 - 16, y + 0.5 - 16)) % 2 ? C('#1e1a1c') : C('#2e2a2c')));
      p.disc(16, 16, 9, hsl(hue, 70, 50)); p.disc(16, 16, 3.2, C('#151214')); p.disc(16, 16, 2.2, K.gold);
      styled(p, T, sc, 2, 1, 28, 14, 'block', r, K.white, shade(hsl(hue, 70, 50), -0.5)); break;
    }
    case 'sun': {
      for (let i = 0; i < 16; i++) { const an = i * 0.3927; p.poly([[16 + Math.cos(an - 0.12) * 9, 16 + Math.sin(an - 0.12) * 9], [16 + Math.cos(an) * 15, 16 + Math.sin(an) * 15], [16 + Math.cos(an + 0.12) * 9, 16 + Math.sin(an + 0.12) * 9]], i % 2 ? K.orange : K.gold); }
      p.disc(16, 16, 10, K.gold); p.disc(16, 16, 9, hsl(hue, 75, 50));
      L('block', K.white, K.ink); break;
    }
    case 'laurel': {
      p.disc(16, 16, 11, K.cream);
      for (let i = 0; i < 9; i++) { const an = Math.PI * 0.6 + i * 0.2; for (const sgn of [1, -1]) { const x = 16 + Math.cos(an) * 13 * sgn, y = 16 + Math.sin(an) * 13; p.ellipse(x, y, 1.6, 1, C('#4a8a3a')); } }
      p.disc(16, 16, 9.5, C('#ece0c4'));
      L('block', C('#3a2a18'), C('#c09048')); break;
    }
    case 'hanko': {
      p.rect(4, 4, 24, 24, C('#c8302c')); for (let y = 4; y < 28; y++) for (let x = 4; x < 28; x++) if (noise(x, y, seed) < 0.08) p.put(x, y, C('#e8806c'));
      p.hline(6, 25, 6, K.cream); p.hline(6, 25, 25, K.cream); p.vline(6, 6, 25, K.cream); p.vline(25, 6, 25, K.cream);
      L('block', K.cream, C('#7a1018')); break;
    }
    case 'pattern': {
      p.poly([[16, 1], [28, 6], [28, 20], [16, 31], [4, 20], [4, 6]], C('#2a1a10'));
      for (let y = 1; y < 31; y++) for (let x = 4; x < 29; x++) if (p.get(x, y) && ((x + y) % 6 === 0 || (x - y + 40) % 6 === 0)) p.put(x, y, K.gold);
      p.rect(6, 11, 20, 12, C('#c8302c'));
      L('block', K.cream, K.ink, 1); break;
    }
    case 'sticker': {
      const heart = r.chance(0.5);
      if (heart) { p.disc(10.5, 12, 7, a); p.disc(21.5, 12, 7, a); p.poly([[3.5, 13.5], [28.5, 13.5], [16, 29]], a); }
      else { const pts: [number, number][] = []; for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? 7 : 15; pts.push([16 + Math.cos(an) * rr, 17 + Math.sin(an) * rr]); } p.poly(pts, a); }
      L('block', K.white, shade(a, -0.5), 1); p.put(8, 9, K.white); p.put(9, 8, K.white); break;
    }
    case 'bolt': {
      fillM(p, dsk(14), (x, y) => (y < 16 ? shade(b, 0.1) : b));
      p.poly([[19, 1], [9, 17], [15, 17], [12, 31], [23, 13], [17, 13], [21, 1]], withAlpha(K.yellow, 200));
      L('block', K.white, K.ink); break;
    }
  }
  p.outline(C('#120d10'));
  return p;
}

/** Hook de art.ts: logo novo (ou null). */
export function logo28(seed: number, ini: string, genre: string, year: number): Px | null {
  const st = logoStyle28(seed, genre, year);
  return st ? logoStylePx28(st, seed, ini, genre, year) : null;
}

// ---------------------------------------------------------------- letreiro (wordmark)

const WM_STYLE: Record<Mood28, LogoStyle28> = {
  metal: 'spiky', punk: 'stencil', disco: 'script', britpop: 'block', hiphop: 'bubble', synth: 'chrome', indie: 'hand', country: 'block', jazz: 'script',
  reggae: 'block', electronic: 'led', soul: 'script', latin: 'block', brazil: 'block', classical: 'block', asia: 'block', africa: 'block', pop: 'block', rock: 'block',
};

/** Letreiro 64×16 com o nome inteiro na tipografia do gênero (fundo transparente). */
export function wordmarkPx28(seed: number, name: string, genre: string, year: number): Px {
  const W = 64, H = 16;
  const p = new Px(W, H);
  const m = genreMood28(genre);
  const st = WM_STYLE[m];
  const r = rng28('wm', seed);
  const hue = (h28('lh', seed, genre) + 20) % 360;
  const a = st === 'stencil' ? C('#151214') : st === 'hand' ? K.ink : hsl(hue, 75, 60);
  const b = st === 'script' ? K.lgold : hsl(hue + 160, 60, 30);
  const full = fitText(name, 999);
  const two = textWidth(full, 2) <= W - 4;
  const T = two ? full : fitText(name, W - 4);
  const sc = two ? 2 : 1;
  if (st === 'stencil') { const fl = r.pick([C('#f8e030'), C('#f06aa8'), C('#a8f040')]); for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (noise(x >> 2, y >> 2, seed) < 0.9 || (y > 2 && y < H - 3)) p.put(x, y, fl); }
  if (st === 'hand') p.rect(1, 1, W - 2, H - 2, K.paper);
  styled(p, T, sc, 0, 0, W, H, st, r, a, b);
  if (st === 'block') { const q = p.clone(); p.d.fill(0); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = q.get(x, y); if (c) p.set(x + 1, y + 1, shade(c, -0.6)); } p.blit(q, 0, 0); }
  p.outline(C('#120d10'));
  return p;
}

/** <img> do letreiro (memorizado). */
export function wordmarkImg28(seed: number, name: string, genre: string, year: number, w = 128): HTMLImageElement {
  return pxImg28(`wm:${seed}:${name}:${genreMood28(genre)}`, () => wordmarkPx28(seed, name, genre, year), w, w / 4, { cls: 'wordmark28', title: name });
}
