// Rodada 18 (artist18): ganchos puros que market.ts chama na liquidação da banda do jogador.
// Desligados (sem artist18 carregado) = regra antiga (royalty no caixa na hora; independente recebe tudo).
import type { GameState, Release } from './types';

export const ART18: {
  /** banda do jogador com contrato de selo NPC: devolve true se o royalty foi para a prestação de contas */
  roy?: (s: GameState, rel: Release, payout: number, artistShare: number) => boolean;
  /** banda sem contrato vigente: master de um selo antigo segue pagando só royalty (true = tratado) */
  indie?: (s: GameState, rel: Release, net: number, gross: number) => boolean;
} = {};
