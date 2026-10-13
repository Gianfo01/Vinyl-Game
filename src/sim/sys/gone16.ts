// Rodada 16: gancho mínimo (sem dependências) para outros sistemas perguntarem se uma pessoa da indústria saiu de
// cena por causa da vida pessoal (morte, aposentadoria, afastamento). Preenchido por people16.ts.
import type { GameState } from '../types';

export const GONE16: { f: (s: GameState, key: string) => boolean } = { f: () => false };
export const gone16 = (s: GameState, key: string): boolean => GONE16.f(s, key);

/**
 * r29 (Submundo: qualquer personagem é alvo): o mínimo da vida da indústria que o crime17 precisa para alvos fora do
 * banco de artistas (produtor 'pd:', empresário 'e:', líder 'l:', equipe 's:', crítico 'c:') — chave canônica (quem
 * também é artista vira 'p:'), estado de vida e morte encomendada. Preenchido por people16.ts; aqui sem dependências
 * para não mudar a ordem de carga dos sistemas (determinismo).
 */
export const KEY16: {
  canon: (s: GameState, key: string) => string;
  st: (s: GameState, key: string) => string;
  kill: (s: GameState, key: string, cause: { pt: string; en: string }) => boolean;
} = { canon: (_s, key) => key, st: () => 'ok', kill: () => false };
