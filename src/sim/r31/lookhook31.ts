// R31 · onda 3 (AP · Aparência) — PONTOS DE LIGAÇÃO da aparência nos sistemas que já existiam. Módulo sem
// dependências (só tipos) para que persona13, mkt18, careers19, merch17, image17, press27, life e value31 possam ler a
// aparência sem ciclo de import. Quem preenche é `src/sim/look31.ts`; vazio (ou interruptor `look31` desligado) =
// regra antiga, exatamente.

import type { L } from '../../data/world';
import type { Act, GameState, Person } from '../types';

/** Onde a aparência pesa (fora do apelo, que tem um ponto só: o modificador `persona13img`). */
export type LookUse31 = 'video' | 'brand' | 'merch' | 'ads' | 'press' | 'value' | 'cover';

export interface LookHooks31 {
  /** quanto somar ao atributo "Imagem e visual" (persona13) — o que mudou desde a base fixa da pessoa */
  imgDelta?: (s: GameState, p: Person) => number;
  /** assinatura para o cache da ficha (muda quando a aparência muda) */
  sig?: (s: GameState, p: Person) => string;
  /** peso da imagem no apelo além da era: gênero musical, público e a pressão estética histórica */
  weight?: (s: GameState, a: Act) => { k: number; why?: L };
  /** fator (≈ 0,85–1,2) de um ato num uso fora do apelo */
  act?: (s: GameState, a: Act, use: LookUse31, brandImage?: string) => { k: number; why?: L } | null;
  /** pontos de afinidade num encontro do jogador (aparência e estilo dele) */
  date?: (s: GameState) => number;
}

export const LOOKH31: LookHooks31 = {};

/** Atalho: fator do ato (1 quando não há gancho). */
export const lookK31 = (s: GameState, a: Act | undefined, use: LookUse31, brandImage?: string): number =>
  (a && LOOKH31.act?.(s, a, use, brandImage)?.k) || 1;
