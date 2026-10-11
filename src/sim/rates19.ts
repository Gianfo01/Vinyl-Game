// Rodada 19 (Frente 3, M13) — trajetória dos juros por época e o que ela faz com o dinheiro do selo.
// Puro (sem estado próprio): juro básico real aproximado (EUA, média do ano: padrão-ouro ~4,5%, depressão ~1,5%,
// 1981 ~16,5%, zero de 2009 a 2021, alta de 2022+). Fora do modo "Vida real exata", depois do ano de início, os juros
// derivam (passeio aleatório determinístico pela semente: história alternativa). Os juros mexem em:
//  - múltiplos de catálogo (sale17.eraMultiple, rights18.catVal18): juro baixo infla, juro alto comprime (inclinação
//    dentro da época, para não descalibrar as médias de cada época);
//  - apetite dos fundos de catálogo (mais lances e lances maiores com juro baixo);
//  - custo do empréstimo bancário (economy.loanOffer) e o cupom dos títulos lastreados em catálogo (money19).

import { clamp, hashString } from '../core/rng';
import { l, type L } from '../data/world';
import { altHistory } from './history15';
import type { GameState } from './types';

/** [ano a partir do qual, juro % a.a.] — aproximação documentada da taxa básica americana. */
export const RATE_PATH19: [number, number][] = [
  [0, 4.5], [1914, 5], [1920, 4.5], [1930, 1.5], [1941, 1], [1951, 2.5], [1960, 3.5], [1966, 5.5], [1973, 9], [1975, 5.5],
  [1978, 8], [1979, 11], [1980, 13.5], [1981, 16.5], [1982, 12.5], [1983, 9], [1984, 10], [1985, 7.5], [1987, 8], [1991, 4.5],
  [1993, 3], [1994, 4.5], [1995, 5.5], [2001, 3.9], [2002, 1.3], [2005, 3.2], [2006, 5], [2008, 1.9], [2009, 0.15], [2016, 0.4],
  [2017, 1], [2018, 1.8], [2019, 2.2], [2020, 0.1], [2022, 1.7], [2023, 5], [2024, 5.1], [2025, 4.3], [2026, 3.75],
];
export function realRate19(y: number): number {
  let v = RATE_PATH19[0][1];
  for (const [from, r] of RATE_PATH19) if (y >= from) v = r; else break;
  return v;
}
const MEMO = new WeakMap<GameState, Record<number, number>>();
/** Juro do ano (com a deriva da história alternativa depois do início). */
export function rate19(s: GameState, y = s.year): number {
  const base = realRate19(y);
  const st = s.config?.startYear ?? y;
  if (!altHistory(s) || y <= st) return base;
  let m = MEMO.get(s);
  if (!m) MEMO.set(s, (m = {}));
  if (m[y] === undefined) {
    let d = 0;
    for (let k = st + 1; k <= y; k++) d = clamp(d * 0.85 + ((hashString(`${s.config.seed}|rate19|${k}`) % 1000) / 1000 - 0.5) * 1.8, -4, 4);
    m[y] = Math.round(Math.max(0, base + d) * 100) / 100;
  }
  return m[y];
}
/** Quanto o juro empurra o valor de uma renda futura (1 = juro de 5%). */
export const rateF19 = (r: number): number => Math.pow(10 / (r + 5), 0.7);
const mean = (a: number, b: number) => { let t = 0, n = 0; for (let y = a; y < b; y++) { t += rateF19(realRate19(y)); n++; } return t / Math.max(1, n); };
/** Faixas de época de sale17.eraMultiple e rights18.eraMult18 (o múltiplo da época já embute o juro médio da faixa). */
const SALE_B = [1960, 1980, 1990, 2000, 2010, 2015, 2022, 2100];
const R18_B = [1985, 2000, 2014, 2022, 2100];
const bandMeans = (b: number[]) => b.map((to, i) => mean(i ? b[i - 1] : 1889, to));
const SALE_M = bandMeans(SALE_B), R18_M = bandMeans(R18_B);
const bandOf = (b: number[], y: number) => Math.max(0, b.findIndex((to) => y < to));
/** Inclinação do múltiplo dentro da época: juro deste ano vs. o juro médio da faixa (×0,6–×1,5). */
export function rateTilt19(s: GameState, y = s.year, kind: 'sale' | 'r18' = 'sale'): number {
  const m = kind === 'sale' ? SALE_M[bandOf(SALE_B, y)] : R18_M[bandOf(R18_B, y)];
  return clamp(rateF19(rate19(s, y)) / m, 0.6, 1.5);
}
/** Apetite dos fundos de catálogo: juro baixo = dinheiro barato procurando renda (×0,5–×1,5). */
export const fundAppetite19 = (s: GameState): number => clamp(1 + (3 - rate19(s)) / 6, 0.5, 1.5);
/** Ajuste do juro do empréstimo bancário (pontos: +4,6 em 1981, −2 em 2020). */
export const loanAdj19 = (s: GameState): number => (rate19(s) - 5) * 0.004;
/** Prêmio da edição sobre a gravação (2021: masters 15–20×, edição 25–30×). */
export const PUB_PREMIUM19 = 1.65;
export function rateWord19(r: number): L {
  return r >= 10 ? l('juros altíssimos', 'sky-high rates') : r >= 6 ? l('juros altos', 'high rates') : r >= 3 ? l('juros normais', 'normal rates') : r >= 1 ? l('juros baixos', 'low rates') : l('juro quase zero', 'near-zero rates');
}
