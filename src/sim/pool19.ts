import type { GameState } from './types';
/** r19 (live19): curva sazonal no tamanho do mercado. Módulo próprio para não depender da ordem de avaliação de market.ts. */
export const POOL19: { f?: (s: GameState) => number } = {};
