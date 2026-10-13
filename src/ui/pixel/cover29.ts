// Rodada 29 (ARTE) — mais CAPAS (40×40) no estilo antigo, agora com FOTO DA BANDA: os integrantes desenhados pelo
// retrato de avatar.ts, com tratamento de foto da época (people29). Composições novas:
//   fotos — foto sangrada com tarja, foto com borda branca, close de um rosto, cabine de fotos (tira de 3), recorte
//   de jornal em meio-tom, silhuetas contra a cor;
//   outras — listras de teste de cor, mapa/rota de turnê, folha datilografada, mosaico de azulejos, olho gigante,
//   tipografia empilhada.
// Entra no lugar de parte das capas que seguiam o desenho original de art.ts (a escolha é pela semente; as
// composições da rodada 28 não mudam). Os integrantes vêm do ato (resolvedor opcional) ou do nome (procedural).

import { familyOf } from '../../data/world';
import type { Appearance } from '../../sim/types';
import { drawText, drawTextOutlined, fitText, textWidth } from './font';
import { C, Px, dith, hsl, mix, noise, shade, withAlpha, type Col } from './px';
import { h28, rng28 } from './art28kit';
import { genreMood28 } from './cover28';
import { randomLook } from './avatar';
import { flavor27 } from './looks27';
import { bandPhotoPx29, photoOf29, type Photo29 } from './people29';
import type { Rng } from '../../core/rng';

export const COVER_LAYOUTS29 = ['photo_bleed', 'photo_border', 'closeup', 'photobooth', 'newsprint', 'silhouettes', 'test_bars', 'tour_map', 'typed_sheet', 'tiles', 'big_eye', 'stack_type'] as const;
export type CoverLayout29 = (typeof COVER_LAYOUTS29)[number];
export const PHOTO_LAYOUTS29: CoverLayout29[] = ['photo_bleed', 'photo_border', 'closeup', 'photobooth', 'newsprint', 'silhouettes'];

type Member = { id: string; look?: Appearance; born?: number };
/** Resolvedor opcional (UI): integrantes reais do ato pelo nome. Sem ele, integrantes procedurais coerentes. */
let MEMBERS_FN: ((actName: string) => Member[] | null) | null = null;
export function setCoverMembers29(fn: typeof MEMBERS_FN): void { MEMBERS_FN = fn; }

/** Integrantes para a foto: do ato (se o resolvedor souber) ou 1–4 pessoas procedurais com a moda do gênero/ano. */
export function coverMembers29(actName: string, genre: string, year: number, seed: number): Member[] {
  const real = MEMBERS_FN?.(actName);
  if (real && real.length) return real.slice(0, 5);
  const n = 1 + (h28('cm29', actName, seed) % 4);
  return Array.from({ length: n }, (_, i) => {
    const id = `cv29:${actName}:${i}`;
    return { id, look: flavor27(randomLook(id), id, { year, genre, family: familyOf(genre) }) };
  });
}

/** Composição nova (ou null = segue o desenho original). ≈60% das capas que ficavam no original. Pura. */
export function coverLayout29(seed: number, genre: string, year: number): CoverLayout29 | null {
  if (h28('cov29', seed) % 100 >= 60) return null;
  const m = genreMood28(genre);
  const photo = h28('cov29p', seed) % 100 < (m === 'jazz' || m === 'soul' || m === 'rock' || m === 'pop' || m === 'country' || m === 'britpop' || m === 'indie' ? 70 : 50);
  let pool: CoverLayout29[] = photo ? [...PHOTO_LAYOUTS29] : ['test_bars', 'tour_map', 'typed_sheet', 'tiles', 'big_eye', 'stack_type'];
  if (year < 1960) pool = pool.filter((x) => x !== 'photobooth' || year >= 1930).filter((x) => x !== 'test_bars');
  if (m === 'punk' || m === 'indie') pool.push('newsprint', 'typed_sheet');
  return pool[h28('cov29l', seed) % pool.length];
}

const N = 40;
const ink = C('#151214');
interface Cx { p: Px; r: Rng; hue: number; seed: number; title: string; act: string; y: number; genre: string; ms: Member[] }
const center = (p: Px, t: string, y: number, c: Col, sc = 1) => drawText(p, t, Math.round((N - textWidth(t, sc)) / 2), y, c, sc);

function photo(c: Cx, W: number, H: number, kind?: Photo29, ms = c.ms): Px {
  return bandPhotoPx29(ms, c.y, W, H, kind ?? photoOf29(c.y), c.seed);
}

const L: Record<CoverLayout29, (c: Cx) => void> = {
  photo_bleed: (c) => {
    const { p, hue, title, act } = c;
    p.blit(photo(c, N, N), 0, 0);
    const top = c.y < 1975;
    p.rect(0, top ? 0 : 31, N, 9, withAlpha(top ? C('#f4ecdc') : ink, 225));
    drawText(p, fitText(act, 36), 2, top ? 1 : 32, top ? hsl(hue, 60, 35) : K_WHITE);
    if (!top) drawText(p, fitText(title, 36), 2, 26, K_WHITE);
    else drawText(p, fitText(title, 36), 2, 33, K_WHITE);
  },
  photo_border: (c) => {
    const { p, hue, title, act } = c;
    p.rect(0, 0, N, N, c.y < 1970 ? C('#f4ecdc') : hsl(hue, 50, 55));
    p.blit(photo(c, 32, 24), 4, 4);
    drawText(p, fitText(act, 34), 4, 30, c.y < 1970 ? ink : K_WHITE);
    drawText(p, fitText(title, 34), 4, 34 + 1, c.y < 1970 ? hsl(hue, 60, 38) : shade(hsl(hue, 50, 55), -0.55));
  },
  closeup: (c) => {
    const { p, hue, title, act } = c;
    p.blit(photo(c, N, N, undefined, c.ms.slice(0, 1)), 0, 0);
    if (c.y >= 1980) for (let y = 0; y < N; y++) for (let x = 0; x < 3; x++) p.put(x, y, hsl(hue, 80, 55));
    drawTextOutlined(p, fitText(act, 34), 5, 2, K_WHITE, ink);
    drawTextOutlined(p, fitText(title, 34), 5, 33, hsl(hue, 80, 75), ink);
  },
  photobooth: (c) => {
    const { p, hue, title, act } = c;
    p.rect(0, 0, N, N, hsl(hue, 40, 22));
    p.rect(3, 1, 15, 38, K_PAPER);
    for (let i = 0; i < 3; i++) { const m = c.ms[i % c.ms.length]; p.blit(bandPhotoPx29([m], c.y, 13, 11, c.y < 1975 ? 'bw' : photoOf29(c.y), c.seed + i), 4, 2 + i * 12); }
    const t = fitText(act, 20), u = fitText(title, 20);
    drawText(p, t, 20, 6, K_WHITE); drawText(p, u, 20, 14, hsl(hue, 70, 70));
    p.hline(20, 37, 22, hsl(hue, 70, 55));
  },
  newsprint: (c) => {
    const { p, title, act } = c;
    p.rect(0, 0, N, N, C('#ece6d8'));
    for (let y = 2; y < N; y += 2) for (let x = 0; x < N; x++) if (noise(x, y, c.seed) < 0.06) p.put(x, y, C('#d8d0c0'));
    const t = fitText(act.toUpperCase(), 38);
    drawText(p, t, Math.round((N - textWidth(t)) / 2), 1, ink); p.hline(1, 38, 7, ink);
    p.blit(photo(c, 26, 20, 'halftone'), 2, 9);
    for (let i = 0; i < 9; i++) p.hline(30, 38, 10 + i * 2, withAlpha(ink, 120));
    p.rect(0, 31, N, 9, ink); drawText(p, fitText(title.toUpperCase(), 36), 2, 33, C('#ece6d8'));
  },
  silhouettes: (c) => {
    const { p, hue, title, act } = c;
    const bg = hsl(hue, 75, 55), bg2 = hsl(hue + 30, 80, 62);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) p.put(x, y, dith(x, y, y / N) ? bg2 : bg);
    const ph = bandPhotoPx29(c.ms, c.y, N, 34, 'crisp', c.seed, true);
    for (let y = 0; y < 34; y++) for (let x = 0; x < N; x++) if (ph.get(x, y)) p.put(x, y + 6, ink);
    drawText(p, fitText(act, 36), 2, 2, ink); drawText(p, fitText(title, 36), 2, 9, K_WHITE);
  },
  test_bars: ({ p, title, act }) => {
    const cs = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'].map((x) => C(x));
    for (let x = 0; x < N; x++) { const c = cs[Math.floor((x / N) * 7)]; for (let y = 0; y < 26; y++) p.put(x, y, c); }
    for (let x = 0; x < N; x++) for (let y = 26; y < N; y++) p.put(x, y, y < 29 ? cs[6 - Math.floor((x / N) * 7)] : ink);
    drawText(p, fitText(act, 36), 2, 30, K_WHITE); drawText(p, fitText(title, 36), 2, 35, C('#808080'));
  },
  tour_map: ({ p, r, hue, title, act }) => {
    p.rect(0, 0, N, N, C('#e8dcb8'));
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (noise(x >> 2, y >> 2, r.int(0, 999)) > 0.62) p.put(x, y, C('#b8d0a0'));
    for (let x = 0; x < N; x += 8) p.vline(x, 0, N - 1, withAlpha(C('#8a7a5a'), 60));
    for (let y = 0; y < N; y += 8) p.hline(0, N - 1, y, withAlpha(C('#8a7a5a'), 60));
    let px = 4, py = 30;
    for (let i = 0; i < 6; i++) { const nx = Math.min(36, px + r.int(3, 8)), ny = Math.max(10, Math.min(28, py + r.int(-8, 6))); for (let t = 0; t < 1; t += 0.12) p.put(Math.round(px + (nx - px) * t), Math.round(py + (ny - py) * t), hsl(hue, 80, 40)); p.disc(nx, ny, 1.2, C('#c83030')); px = nx; py = ny; }
    p.rect(0, 0, N, 9, withAlpha(ink, 210)); drawText(p, fitText(act, 36), 2, 2, K_WHITE);
    drawText(p, fitText(title, 36), 2, 33, hsl(hue, 60, 30));
  },
  typed_sheet: ({ p, seed, title, act }) => {
    p.rect(0, 0, N, N, K_PAPER);
    for (let i = 0; i < 12; i++) for (let x = 3; x < 36 - (i * 5) % 9; x++) if (noise(x, i, seed) > 0.22) p.put(x, 13 + i * 2, withAlpha(ink, 170));
    drawText(p, fitText(act.toUpperCase(), 34), 3, 3, ink); drawText(p, fitText(title, 34), 3, 8 - 0, C('#a02020'));
    p.disc(32, 34, 4, withAlpha(C('#a07040'), 90)); p.ring(32, 34, 4, withAlpha(C('#a07040'), 110));
  },
  tiles: ({ p, hue, title, act }) => {
    const a = hsl(hue, 70, 45), b = K_PAPER;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const tx = x % 10, ty = y % 10; const d = Math.abs(tx - 4.5) + Math.abs(ty - 4.5); p.put(x, y, d < 3 ? a : d < 4 ? b : (tx === 0 || ty === 0) ? shade(b, -0.2) : (tx + ty) % 9 === 0 ? a : b); }
    p.rect(4, 14, 32, 12, K_PAPER); p.hline(4, 35, 14, a); p.hline(4, 35, 25, a);
    center(p, fitText(act, 30), 16, ink); center(p, fitText(title, 30), 21 - 1 + 1, a);
  },
  big_eye: ({ p, hue, title, act }) => {
    p.rect(0, 0, N, N, hsl(hue + 200, 40, 14));
    p.ellipse(20, 18, 16, 9, K_PAPER); p.disc(20, 18, 7, hsl(hue, 70, 45)); p.disc(20, 18, 3, ink); p.put(18, 16, K_WHITE); p.put(17, 16, K_WHITE);
    for (let x = 5; x < 36; x += 3) p.line(x, 9 - Math.round(Math.sin(((x - 4) / 32) * Math.PI) * 2), x - 1, 6 - Math.round(Math.sin(((x - 4) / 32) * Math.PI) * 2), ink);
    drawText(p, fitText(act, 36), 2, 29, hsl(hue, 70, 70)); drawText(p, fitText(title, 36), 2, 34, K_WHITE);
  },
  stack_type: ({ p, hue, title, act }) => {
    p.rect(0, 0, N, N, hsl(hue, 60, 50));
    const words = `${act} ${title}`.toUpperCase().split(/\s+/).filter(Boolean).slice(0, 5);
    let y = 2;
    words.forEach((w, i) => { const two = textWidth(fitText(w, 999), 2) <= 38; const t = two ? fitText(w, 999) : fitText(w, 38); const sc = two ? 2 : 1; if (y + 5 * sc > 39) return; drawText(p, t, 2, y, i % 2 ? ink : K_WHITE, sc); y += 5 * sc + 2; });
  },
};
const K_WHITE = C('#f8f4ec'), K_PAPER = C('#ece0c4');

/** Pinta uma composição (folha de contato e testes). */
export function coverLayoutPx29(lay: CoverLayout29, seed: number, title: string, actName: string, genre: string, year: number, budget = 0.6, ms?: Member[]): Px {
  const p = new Px(N, N);
  const r = rng28('cover29', seed, lay);
  const hue = (h28('c29h', seed, genre) + 360) % 360;
  L[lay]({ p, r, hue, seed, title, act: actName, y: year, genre, ms: ms ?? coverMembers29(actName, genre, year, seed) });
  if (budget <= 0.45) p.map((c) => mix(c, C('#808080'), 0.1));
  return p;
}

/** Hook de art.ts: capa nova (ou null = desenho original). */
export function cover29(seed: number, title: string, actName: string, genre: string, year: number, budget: number): Px | null {
  const lay = coverLayout29(seed, genre, year);
  return lay ? coverLayoutPx29(lay, seed, title, actName, genre, year, budget) : null;
}
