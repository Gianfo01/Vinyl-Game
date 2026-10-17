// R33 · QA33 — ganchos de arquivos antigos (economia, mercado) que as frentes da 33 preenchem. Módulo folha (sem
// imports de valor): pode ser lido por economy.ts e market.ts sem ciclo de carga. Quem preenche: sim/r33/ligar33.
import type { Act, GameState, Release } from '../types';

export interface LoanOffer33 { amount: number; rate: number; months: number }
/** Crise de crédito da MUNDO (exp33.crise/memes) em toda oferta de empréstimo; sem ele, nada muda. */
export const LOAN_X33: { f?: (s: GameState, o: LoanOffer33) => LoanOffer33 | null } = {};
/** Largura da faixa da previsão pelos aprendizados (GESTÃO, exp33.learn — learnWidth33); sem ele, 1. */
export const FCW33: { f?: (s: GameState, act: Act, type: Release['type']) => number } = {};
