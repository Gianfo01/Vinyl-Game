// R31 (DBTAM) — números da base de dados para a Nova run, calculados com as MESMAS regras do motor (fonte única):
// quem entra (dbsize14.realAllowed + interruptores das bases BR/IT/HITS na configuração), o catálogo clássico (com o
// filtro de país) e os gerados do início (mesma conta do worldgen). Só lê dados; não cria nada nem sorteia.
import { CATALOG_ACTS } from '../data/catalog';
import { countryOfCity } from '../data/geo';
import { cityById } from '../data/world';
import { REAL_CLASSIC } from '../data/realacts_classic';
import { classicOff31, dbSizeInfo, realAllowed, realCountry31 } from './dbsize14';
import { BASE31BR_FROM, BASE31BR_TO, BASE31H_FROM, BASE31H_TO, BASE31IT_FROM, BASE31IT_TO, REAL_ALL } from './sys/realworld';
import type { RunConfig } from './types';

export type DbCfg31 = Partial<Pick<RunConfig, 'dbSize' | 'realOff31' | 'history' | 'realNames' | 'mode' | 'base31br' | 'base31it' | 'base31hits' | 'startYear'>>;

/** O ato `i` de REAL_ALL pode existir nesta configuração (tamanho, país, modo exato e chaves das bases novas). */
export function realIn31(c: DbCfg31, i: number): boolean {
  const a = REAL_ALL[i];
  if (!a || !realAllowed(c, a)) return false;
  if (c.base31br === false && i >= BASE31BR_FROM && i < BASE31BR_TO) return false;
  if (c.base31it === false && i >= BASE31IT_FROM && i < BASE31IT_TO) return false;
  if (c.base31hits === false && i >= BASE31H_FROM && i < BASE31H_TO) return false;
  return true;
}

/** Gerados do início (mesma conta de worldgen › "procedurais iniciais", sem mutadores). */
export const genStart31 = (c: DbCfg31): number => Math.round(95 * (c.mode === 'historic' ? 0.9 : 1.1) * dbSizeInfo(c).gen);

/** Personagens e artistas no começo da partida: reais já estreados no ano de início (das listas, com integrantes),
 *  catálogo clássico já estreado (com nomes reais, filtrado por país) e gerados (≈ 2 pessoas por ato). */
export function cast31(c: DbCfg31, year: number): { acts: number; real: number; classic: number; gen: number; people: number } {
  let real = 0, realP = 0;
  for (let i = 0; i < REAL_ALL.length; i++) {
    const a = REAL_ALL[i];
    if (a.d > year || !cityById[a.c] || !realIn31(c, i)) continue;
    real++; realP += Math.max(1, a.m?.length ?? 0);
  }
  // modos livre/caos: sys/realworld deixa de fora 8% / 25% dos reais por sorteio (valor esperado)
  const keep = c.mode === 'chaos' ? 0.75 : c.mode === 'free' ? 0.92 : 1;
  real = Math.round(real * keep); realP = Math.round(realP * keep);
  let classic = 0;
  for (const ca of CATALOG_ACTS) {
    if (classicOff31(c, ca.city)) continue;
    const d = (c.realNames ? REAL_CLASSIC[ca.no]?.d : undefined) ?? ca.debut;
    if (d <= year) classic++;
  }
  const gen = genStart31(c);
  return { acts: real + classic + gen, real: real + classic, classic, gen, people: realP + classic * 2 + gen * 2 };
}

/** Artistas reais por país NESTE tamanho de base (todas as listas + catálogo clássico com nomes reais), do maior para o
 *  menor — a contagem do cartão de países. `year` limita a quem já estreou (ausente = a base inteira, inclusive futuros). */
export function countries31(c: DbCfg31, year?: number): { a3: string; n: number }[] {
  const n = new Map<string, number>();
  const cc = { ...c, realOff31: undefined };
  for (let i = 0; i < REAL_ALL.length; i++) {
    const a = REAL_ALL[i];
    if ((year !== undefined && a.d > year) || !realIn31(cc, i)) continue;
    const k = realCountry31(a);
    if (k) n.set(k, (n.get(k) ?? 0) + 1);
  }
  if (c.realNames) for (const ca of CATALOG_ACTS) {
    const k = countryOfCity(ca.city);
    if (k && (year === undefined || ((REAL_CLASSIC[ca.no]?.d ?? ca.debut) <= year))) n.set(k, (n.get(k) ?? 0) + 1);
  }
  return [...n.entries()].map(([a3, k]) => ({ a3, n: k })).sort((x, y) => y.n - x.n || x.a3.localeCompare(y.a3));
}
