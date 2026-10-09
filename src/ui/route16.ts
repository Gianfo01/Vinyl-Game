// Rodada 16: rota única para páginas de pessoa. As páginas antigas (empresário, produtor, líder, crítico, ficha)
// perguntam aqui primeiro; ui/sys/people16.ts preenche com a página única. Sem dependências (evita ciclos).
import type { GameState } from '../sim/types';

export const personRoute16: { f?: (key: string, tab?: string) => boolean } = {};
/** Busca (Ctrl+K): gente da indústria (empresários, produtores, líderes) que não é artista. */
export const searchRoute16: { f?: (s: GameState, q: string) => { label: string; hint: string; key: string }[] } = {};
