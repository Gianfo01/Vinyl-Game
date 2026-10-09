// Rodada 14 — "Tamanho da base de dados": quantos artistas reais e gerados existem no mundo (Novo Jogo).
// Médio = o padrão histórico do jogo (todos os reais originais + 1º lote novo). Menor = mais leve; maior = mundo cheio.
import type { RealArtist } from '../data/realtypes';
import type { RunConfig } from './types';

export type DbSize = NonNullable<RunConfig['dbSize']>;
export interface DbInfo { id: DbSize; lvl: 0 | 1 | 2 | 3; /** fator dos atos gerados no início */ gen: number; /** fator dos que surgem a cada ano */ yearly: number; pt: string; en: string }
export const DB_SIZES: DbInfo[] = [
  { id: 'small', lvl: 0, gen: 0.6, yearly: 0.7, pt: 'Pequena', en: 'Small' },
  { id: 'medium', lvl: 1, gen: 1, yearly: 1, pt: 'Média', en: 'Medium' },
  { id: 'large', lvl: 2, gen: 1.7, yearly: 1.5, pt: 'Grande', en: 'Large' },
  { id: 'huge', lvl: 3, gen: 3, yearly: 2.4, pt: 'Enorme', en: 'Huge' },
];
export const dbSizeInfo = (c: Pick<RunConfig, 'dbSize'>): DbInfo => DB_SIZES.find((d) => d.id === c.dbSize) ?? DB_SIZES[1];
/** O artista real entra nesta partida? Lista original: sempre (menos nomes regionais no tamanho pequeno); lote novo: pelo nível `z`. */
export const realAllowed = (c: Pick<RunConfig, 'dbSize'>, a: RealArtist): boolean => {
  const lvl = dbSizeInfo(c).lvl;
  return a.z ? a.z <= lvl : lvl > 0 || a.t < 3;
};
