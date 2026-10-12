// r23: fechamento contábil do mês. O extrato do mês (monthLedger) vira um retrato imutável
// NO FECHAMENTO (não na abertura do mês seguinte), para a barra do topo, a Mesa e o Cockpit
// mostrarem o mês que acabou de fechar — não o anterior a ele. Guarda os últimos 24 fechamentos.

import { l, type L } from '../data/world';
import type { GameState } from './types';

export interface Closed23 {
  /** ano/mês (0-11) do mês fechado */
  y: number;
  m: number;
  cashStart: number;
  cashEnd: number;
  /** lançamentos do mês por categoria (competência; soma = resultado do extrato) */
  byCat: Record<string, number>;
  /** por seção (ledger18): rev, cost, nonop, tax, inv, fin */
  sect: Record<string, number>;
}

export const CLOSED23_MAX = 24;

type S23 = GameState & { closed23?: Closed23[]; cashOpen23?: number; monthSect23?: Record<string, number> };
const x23 = (s: GameState): S23 => s as S23;

export const closedList23 = (s: GameState): Closed23[] => x23(s).closed23 ?? [];
export const lastClosed23 = (s: GameState): Closed23 | undefined => x23(s).closed23?.at(-1);

/** soma dos lançamentos por categoria */
export const ledgerNet23 = (o: Record<string, number> | undefined): number => Object.values(o ?? {}).reduce((t, v) => t + v, 0);
/** variação do caixa do mês fechado (o número da barra do topo) */
export const cashDelta23 = (c: Closed23 | undefined): number => (c ? c.cashEnd - c.cashStart : 0);
/** resultado operacional (receitas + custos operacionais) */
export const opResult23 = (c: Closed23 | undefined): number => (c ? (c.sect.rev ?? 0) + (c.sect.cost ?? 0) : 0);
/** diferença entre caixa e competência (a receber/a pagar, liquidações) */
export const accrualAdj23 = (c: Closed23 | undefined): number => (c ? cashDelta23(c) - ledgerNet23(c.byCat) : 0);

/** chamado por util.post: acumula o lançamento na seção do mês corrente */
export function noteSect23(s: GameState, sect: string, amount: number): void {
  const x = x23(s);
  const ms = (x.monthSect23 ??= {});
  ms[sect] = (ms[sect] ?? 0) + amount;
}

/** Fecha o extrato do mês (y/m): retrato imutável, histórico e zera o mês corrente. */
export function rotate23(s: GameState, y: number, m: number): Closed23 {
  const x = x23(s);
  const byCat = { ...s.monthLedger };
  const cashEnd = s.player.cash;
  // save antigo sem saldo de abertura: reconstrói pelo extrato (aproximação de competência)
  const cashStart = x.cashOpen23 ?? cashEnd - ledgerNet23(byCat);
  const c: Closed23 = { y, m, cashStart, cashEnd, byCat, sect: { ...(x.monthSect23 ?? {}) } };
  const list = (x.closed23 ??= []);
  list.push(c);
  if (list.length > CLOSED23_MAX) list.splice(0, list.length - CLOSED23_MAX);
  s.lastMonthLedger = { ...byCat };
  s.monthLedger = {};
  x.monthSect23 = {};
  x.cashOpen23 = cashEnd;
  return c;
}

/** save anterior ao r23: o mês ainda é girado na abertura (uma vez), depois passa a girar no fechamento */
export const legacyOpen23 = (s: GameState): boolean => x23(s).cashOpen23 === undefined;

/** o que a barra do topo / Mesa / Cockpit mostram como "mês passado": variação do caixa do mês fechado */
export function lastMonthView23(s: GameState): { delta: number; op: number; net: number; adj: number; y?: number; m?: number } {
  const c = lastClosed23(s);
  if (!c) { const n = ledgerNet23(s.lastMonthLedger); return { delta: n, op: n, net: n, adj: 0 }; } // sem fechamento ainda: extrato bruto
  return { delta: cashDelta23(c), op: opResult23(c), net: ledgerNet23(c.byCat), adj: accrualAdj23(c), y: c.y, m: c.m };
}

/** rótulos padronizados (mesmo texto no topo, Mesa, Central e no porquê) */
export const monthTag23 = (y?: number, m?: number): string => (y === undefined || m === undefined ? '—' : `${String(m + 1).padStart(2, '0')}/${y}`);
export const cashDeltaL23 = (s: GameState): L => {
  const c = lastClosed23(s), tag = monthTag23(c?.y, c?.m);
  return l(`Variação do caixa (mês fechado: ${tag})`, `Cash change (closed month: ${tag})`);
};
export const opResultL23 = (s: GameState): L => {
  const c = lastClosed23(s), tag = monthTag23(c?.y, c?.m);
  return l(`Resultado operacional (${tag})`, `Operating result (${tag})`);
};
