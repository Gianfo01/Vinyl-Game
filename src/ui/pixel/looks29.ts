// Rodada 29 (ARTE) — mais variedade nos bonecos, por cima do tempero da rodada 27 (looks27.flavor27):
//   • ROUPAS por época e região (índices 26..33, anexados a OUTFIT27): terno zoot, guayabera, agbada, hanbok,
//     jaqueta college (varsity), terninho de ombreiras, colete de patches (battle vest) e camisa de futebol;
//   • TIPOS DE CORPO novos (body 3 = atlético de ombros largos, body 4 = grandalhão), só no procedural.
// Compatibilidade: nada aqui toca visual gravado (flavor só roda no procedural, e com RNG próprio, então o resto do
// visual sorteado em flavor27 não muda). Visual salvo com body 0..2 e roupa 0..25 desenha pixel a pixel igual.

import { Rng } from '../../core/rng';
import type { Appearance } from '../../sim/types';
import type { Ctx27 } from './looks27';

/** Primeira roupa da rodada 29 (índice em Appearance.outfit). */
export const OUTFIT29_BASE = 26;
/** Corpo 3 (atlético) e 4 (grandalhão). */
export const BODY29 = { athletic: 3, big: 4 } as const;

const win = (y: number, a: number, b: number) => (y >= a && y <= b ? 1 : 0);

/** [índice, peso(ctx)] das roupas novas; o país pesa muito nas peças regionais. */
const OUT29: [number, '' | 'm' | 'f', (c: Ctx27) => number][] = [
  [26, 'm', (c) => win(c.year, 1938, 1955) * (c.family === 'blues_jazz' ? 3 : c.family === 'latin' || c.family === 'rnb' ? 2 : 0.4)],
  [27, '', (c) => (c.year >= 1940 ? 1 : 0) * (c.family === 'latin' || c.family === 'caribbean' ? 3 : 0.1) * (c.country === 'CUB' || c.country === 'MEX' || c.country === 'PRI' ? 2 : 1)],
  [28, '', (c) => (c.family === 'africa' ? 3 : 0.02) * (c.country === 'NGA' || c.country === 'SEN' || c.country === 'GHA' || c.country === 'MLI' ? 2 : 1)],
  [29, '', (c) => (c.country === 'KOR' ? 4 : c.family === 'asia_me' ? 0.3 : 0)],
  [30, '', (c) => win(c.year, 1950, 2030) * (c.family === 'rock' || c.family === 'pop' ? 1 : c.family === 'hiphop' && c.year >= 1985 ? 2.5 : 0.3)],
  [31, '', (c) => win(c.year, 1980, 1994) * (c.family === 'pop' || c.family === 'europe' || c.family === 'rnb' ? 2 : 0.4) * (c.sex === 'f' ? 1.6 : 0.8)],
  [32, '', (c) => win(c.year, 1970, 2030) * (/metal|thrash|punk|hardcore|hard_rock/.test(c.genre ?? '') ? 4 : c.family === 'rock' ? 0.6 : 0.03)],
  [33, '', (c) => win(c.year, 1970, 2030) * (c.family === 'brazil' || c.family === 'latin' || c.family === 'africa' ? 1.5 : c.family === 'europe' || c.family === 'hiphop' ? 0.6 : 0.15)],
];

/** Cor típica da roupa nova (índices de OUTFIT_COLORS). */
const COL29: Record<number, number[]> = { 26: [4, 1, 3, 9], 27: [5, 5, 12, 8], 28: [3, 0, 4, 2, 5], 29: [9, 4, 12, 3], 30: [1, 0, 2, 6], 31: [1, 5, 10, 0, 9], 32: [0, 6, 11], 33: [8, 2, 1, 0, 3, 12] };

/**
 * Passo extra do procedural (chamado no fim de flavor27). RNG próprio por pessoa e década: não mexe nas escolhas de
 * cabelo/roupa/acessórios de flavor27, só troca a roupa (≈14%, quando uma peça nova cabe na época/região) e o corpo (≈12%).
 */
export function flavor29(a: Appearance, seed: string, c: Ctx27): Appearance {
  const r = Rng.fromSeed(`look29:${seed}:${Math.floor(c.year / 10)}`);
  const sx = c.sex ?? a.sx;
  let o: Appearance | null = null;
  const w = (): Appearance => (o ??= { ...a });
  const opts = OUT29.filter(([, s]) => !s || !sx || sx === 'x' || s === sx).map(([i, , f]) => [i, f(c)] as [number, number]).filter(([, x]) => x > 0);
  const tot = opts.reduce((s, [, x]) => s + x, 0);
  const roll = r.next();
  if (tot > 0 && roll < Math.min(0.32, 0.06 + tot * 0.04)) {
    let x = r.next() * tot;
    let pick = opts[opts.length - 1][0];
    for (const [i, wt] of opts) { x -= wt; if (x < 0) { pick = i; break; } }
    w().outfit = pick;
    if (COL29[pick]) w().outfitColor = r.pick(COL29[pick]);
  }
  const b = r.next();
  if (a.body === 1 && b < 0.07) w().body = BODY29.athletic;
  else if (a.body === 2 && b < 0.35) w().body = BODY29.big;
  return o ?? a;
}
