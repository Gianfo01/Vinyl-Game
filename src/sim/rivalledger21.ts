// Revisão 21 (G-7) — ECONOMIA DOS RIVAIS COM EXTRATO. Um só ponto de débito/crédito para selos NPC (`labelPost`),
// com extrato curto por selo (`lb.ledger21`, últimas 60 entradas) para o relatório "O que os rivais fizeram… e quanto
// custou". `revenueYear` só cresce com receita REAL (categorias em REVENUE_CATS21: vendas, shows, edição e catálogo
// — lançamentos de verdade); dinheiro de acordos, licenças e favores entra no caixa mas não na receita pública.
// Falência: caixa abaixo de 6 meses de custo fixo (`broke21`), em vez de −$300 mil fixos para todo selo.

import type { GameState, Label } from './types';
import { money } from './util';

export interface LabelEntry21 { w: number; v: number; cat: string; memo: string }

/** Categorias que contam como receita pública (`revenueYear`). */
export const REVENUE_CATS21 = new Set(['sales', 'live', 'publishing', 'catalog']);

/** Lança no caixa do selo rival (centavos nominais) e no extrato; receita pública só nas categorias reais. */
export function labelPost(s: GameState, lb: Label, amount: number, cat: string, memo: string): void {
  amount = Math.round(amount);
  if (!amount) return;
  lb.cash += amount;
  if (amount > 0 && REVENUE_CATS21.has(cat)) lb.revenueYear += amount;
  const led = (lb.ledger21 ??= []);
  led.push({ w: s.week, v: amount, cat, memo });
  if (led.length > 60) led.splice(0, led.length - 60);
}

/** Custo fixo mensal do selo (o mesmo cobrado em rivals.ts). */
export const fixedCost21 = (s: GameState, lb: Label): number => money(s, 4000 + lb.roster.length * 1800) * (lb.family === 'A' ? 2 : 1);

/** Quebrou: deve mais de 6 meses de custo fixo. */
export const broke21 = (s: GameState, lb: Label): boolean => lb.cash < -fixedCost21(s, lb) * 6;

/** Extrato recente (mais novo primeiro). */
export const ledger21 = (lb: Label, n = 12): LabelEntry21[] => (lb.ledger21 ?? []).slice(-n).reverse();
