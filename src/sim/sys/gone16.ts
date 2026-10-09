// Rodada 16: gancho mínimo (sem dependências) para outros sistemas perguntarem se uma pessoa da indústria saiu de
// cena por causa da vida pessoal (morte, aposentadoria, afastamento). Preenchido por people16.ts.
import type { GameState } from '../types';

export const GONE16: { f: (s: GameState, key: string) => boolean } = { f: () => false };
export const gone16 = (s: GameState, key: string): boolean => GONE16.f(s, key);
