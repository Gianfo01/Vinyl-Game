// Rodada 19 (cenas) — CALENDÁRIO REAL DOS PRÊMIOS. Cada premiação tem ano de fundação e mês de cerimônia vindos
// do dado autoral (data/content.ts AWARDS): Gramófonos ≈ Grammy (1959, fevereiro; indicados em novembro do ano
// homenageado), Crítica ≈ Pazz & Jop (1971, janeiro), Indústria ≈ Music Week (1975, abril), Ao Vivo ≈ Pollstar
// (1989, fevereiro), regionais com a data de cada um e o Hall dos Ecos (1986, abril). Antes do ano de fundação o
// prêmio não existe (nem cena, nem aviso). Sem imports pesados: pode ser lido de qualquer módulo.

import { AWARDS } from '../data/content';

export interface Cal19 { id: string; start: number; month: number; nomsMonth?: number }
const C = (id: string, start: number, month: number, nomsMonth?: number): Cal19 => {
  const a = AWARDS.find((x) => x.id === id);
  return { id, start: a?.start ?? start, month: a?.month ?? month, ...(nomsMonth !== undefined ? { nomsMonth } : {}) };
};

/** Gramófonos de Ouro: indicados em novembro do ano homenageado, cerimônia no mês do dado (fevereiro) do ano seguinte. */
export const GRAMO_CAL19 = C('gramofonos', 1959, 1, 10);
export const CRITICS_CAL19 = C('critics_poll', 1971, 0);
export const INDUSTRY_CAL19 = C('industry_guild', 1975, 3);
export const LIVE_CAL19 = C('live_awards', 1989, 1);
export const ECHOES_CAL19 = C('hall_echoes', 1986, 3);
/** Regionais sem dado próprio (fallback dos ids antigos reg_*): referência real de cada um. */
const REG_FALLBACK: Record<string, [number, number]> = { reg_na: [1974, 1], reg_br: [1958, 4], reg_latam: [1989, 10], reg_eu: [1977, 1], reg_asia: [1959, 11], reg_africa: [1994, 10], reg_oceania: [1987, 10] };

const GRAMO = new Set(['record', 'album', 'newcomer', 'performance']);
/** Calendário de uma categoria do livro de prêmios (s.awards). */
export function calOf19(cat: string): Cal19 {
  if (GRAMO.has(cat)) return GRAMO_CAL19;
  if (cat === 'critics') return CRITICS_CAL19;
  if (cat === 'label_year' || cat === 'producer_year') return INDUSTRY_CAL19;
  if (cat === 'live_act') return LIVE_CAL19;
  if (cat === 'hall_echoes') return ECHOES_CAL19;
  const a = AWARDS.find((x) => x.id === cat);
  if (a) return { id: cat, start: a.start, month: a.month };
  const f = REG_FALLBACK[cat];
  return { id: cat, start: f?.[0] ?? 1900, month: f?.[1] ?? 11 };
}

/** Ano homenageado por uma cerimônia no mês `m` do ano `y`: cerimônias do 1º semestre premiam o ano anterior. */
export const honoredYear19 = (y: number, m: number): number => (m <= 5 ? y - 1 : y);
/** A premiação já existe neste ano (ano da cerimônia ≥ fundação)? */
export const awardExists19 = (cat: string, year: number): boolean => year >= calOf19(cat).start;
