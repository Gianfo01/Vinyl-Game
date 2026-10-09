// Nada do futuro aparece nas telas (rodada 9): festivais ainda não fundados, gêneros que não nasceram,
// artistas que não estrearam, eras e tecnologias que ainda vão chegar. O jogador descobre o novo quando
// avança — e a novidade sai no noticiário. Estes ajudantes centralizam a regra.

import type { Act, GameState } from './types';

/** Algo datado em `year` já existe no ano atual da partida (sem data = sempre existiu). */
export const existsNow = (s: GameState, year: number | undefined | null): boolean => year === undefined || year === null || year <= s.year;

/** Um intervalo [from, to] já começou (o fim pode estar no passado: aí é história, pode aparecer). */
export const begun = (s: GameState, from: number | undefined): boolean => from === undefined || from <= s.year;

/**
 * Um ato pode aparecer nas listas? Quem ainda não estreou só aparece se for seu, se for a sua banda ou
 * se você já tem notícia dele (sinal de cena, olheiro, radar).
 */
export function visibleAct(s: GameState, a: Act | undefined | null): boolean {
  if (!a) return false;
  if (a.debutYear <= s.year) return true;
  return a.owner === 'player' || !!a.playerBand || !!s.knowledge[a.id];
}

/** Ato ainda não estreou (mostrar "promessa" em vez de um ano futuro). */
export const preDebut = (s: GameState, a: Act): boolean => a.debutYear > s.year;
