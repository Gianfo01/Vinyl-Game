// Rodada 20 (G2 — integridade financeira): REGISTRO CANÔNICO DE OBRIGAÇÕES e posição "Agora × Último fechamento".
//  B3  Toda obrigação do selo (empréstimos, credores, títulos lastreados em catálogo, contas a pagar) vem de uma
//      única lista; o balanço soma TODAS as que são passivo e o covenant bancário usa só o subconjunto `bank`
//      (rotulado). Antes os títulos de catálogo (money19) entravam no caixa sem passivo correspondente.
//  B4  Adiantamentos de ofertas pendentes ficam RESERVADOS (não são passivo, mas comprometem caixa livre).
//      A reserva é derivada do status da oferta: some sozinha na recusa, na expiração ou na assinatura.
//  B8  AR/AP do balanço vêm do subledger ao vivo; o fechamento do mês guarda um retrato datado para comparação.
// Sem dependência de sistemas: outros módulos registram fontes (registerOblig20).
import { l, type L } from '../data/world';
import { apTotal18, arTotal18, fin18, mIdx18 } from './ledger18';
import type { GameState } from './types';

/** r20 (B21): nomes distintos dos dois legados (aqui, sem dependências, para a interface importar cedo). */
export const LABEL_LEGACY20 = l('Legado do selo', 'Label legacy');
export const PATH_LEGACY20 = l('Legado por caminhos', 'Path legacy');

export type OblKind20 = 'loan' | 'creditor' | 'bond' | 'payable' | 'reserve' | 'commitment';
export interface Obl20 {
  id: string;
  kind: OblKind20;
  /** sistema de origem */
  src: string;
  label: L | string;
  /** valor devido/comprometido (centavos, ≥ 0) */
  amt: number;
  /** passivo do balanço (reserva e compromisso planejado não são) */
  liability: boolean;
  /** entra no covenant bancário (empréstimos e credor banco) */
  bank: boolean;
  monthly?: number;
  /** juros ao ano (fração) */
  rate?: number;
  note?: L;
}
type Src20 = (s: GameState) => Obl20[];
const SRC: { id: string; fn: Src20 }[] = [];
export function registerOblig20(id: string, fn: Src20): void {
  const i = SRC.findIndex((x) => x.id === id);
  if (i >= 0) SRC[i] = { id, fn };
  else SRC.push({ id, fn });
}

export const KIND_NAME20: Record<OblKind20, L> = {
  loan: l('Empréstimos', 'Loans'), creditor: l('Credores', 'Creditors'), bond: l('Títulos lastreados em catálogo', 'Catalog-backed bonds'),
  payable: l('Contas a pagar (royalties e fornecedores)', 'Payables (royalties and suppliers)'), reserve: l('Reservado para ofertas pendentes', 'Reserved for pending offers'),
  commitment: l('Compromissos planejados', 'Planned commitments'),
};

/** B4: adiantamentos das ofertas ainda sem resposta (o caixa já está prometido). */
export function reservedAdvances20(s: GameState, exceptId?: string): number {
  return (s.offers ?? []).filter((o) => o.status === 'pending' && o.id !== exceptId).reduce((t, o) => t + Math.max(0, o.advance), 0);
}
/** r28 (C7): outras reservas de caixa (ex.: verba de promessas — sys/promises28), registradas sem dependência. */
const RESERVES20: { id: string; fn: (s: GameState) => number }[] = [];
export function registerReserve20(id: string, fn: (s: GameState) => number): void {
  const i = RESERVES20.findIndex((x) => x.id === id);
  if (i >= 0) RESERVES20[i] = { id, fn }; else RESERVES20.push({ id, fn });
}
export const otherReserves20 = (s: GameState): number => RESERVES20.reduce((t, x) => t + Math.max(0, x.fn(s)), 0);
/** Caixa livre = caixa − reservas de ofertas pendentes − outras reservas (r28: verba de promessas). */
export const freeCash20 = (s: GameState, exceptId?: string): number => s.player.cash - reservedAdvances20(s, exceptId) - otherReserves20(s);
const usd20 = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;
/** r20c (N2): motivo do bloqueio de um gasto checado contra o caixa LIVRE. Se o caixa bruto também não cobre, mantém
 *  a mensagem original do sistema; se só a reserva impede, diz quanto está reservado e para quê. */
export function cashWhy20(s: GameState, cost: number, base: L): L {
  if (s.player.cash < cost) return base;
  const r = usd20(reservedAdvances20(s)), f = usd20(Math.max(0, freeCash20(s)));
  return l(`Caixa livre insuficiente: ${r} estão reservados para adiantamentos de ofertas pendentes (livre: ${f}). Retire ou espere a resposta das ofertas.`,
    `Not enough free cash: ${r} is reserved for advances on pending offers (free: ${f}). Withdraw them or wait for an answer.`);
}
/** r20c (N2): gate padrão de gasto do jogador (caixa livre ≥ custo). */
export const canSpend20 = (s: GameState, cost: number): boolean => freeCash20(s) >= cost;

// fontes nativas (as do motor-base)
registerOblig20('loans', (s) => s.player.loans.filter((x) => x.balance > 0).map((x) => ({ id: x.id, kind: 'loan' as const, src: 'economy', label: l('Empréstimo', 'Loan'), amt: x.balance, liability: true, bank: true, monthly: x.monthly, rate: x.rate })));
registerOblig20('creditors', (s) => (s.creditors ?? []).filter((c) => c.owed > 0).map((c) => ({ id: c.id, kind: 'creditor' as const, src: 'finance', label: c.name, amt: c.owed, liability: true, bank: c.kind === 'bank' })));
registerOblig20('ap18', (s) => { const v = apTotal18(s); return v > 0 ? [{ id: 'ap18', kind: 'payable' as const, src: 'econ18', label: l('Prestação de contas e fornecedores a vencer', 'Statements and suppliers coming due'), amt: v, liability: true, bank: false }] : []; });
registerOblig20('offers', (s) => (s.offers ?? []).filter((o) => o.status === 'pending' && o.advance > 0).map((o) => ({ id: o.id, kind: 'reserve' as const, src: 'contracts', label: s.acts[o.actId]?.name ?? '?', amt: o.advance, liability: false, bank: false, note: l('Adiantamento prometido: sai do caixa se aceitarem', 'Promised advance: leaves cash if they accept') })));
registerOblig20('plans', (s) => { const v = (s.plans ?? []).filter((p) => p.status === 'planned').reduce((t, p) => t + Math.max(0, p.costEst), 0); return v > 0 ? [{ id: 'plans', kind: 'commitment' as const, src: 'agenda', label: l('Planos agendados (custo estimado)', 'Scheduled plans (estimated cost)'), amt: v, liability: false, bank: false }] : []; });

export function obligations20(s: GameState): Obl20[] {
  const out: Obl20[] = [];
  for (const x of SRC) { try { for (const o of x.fn(s)) if (o.amt > 0) out.push(o); } catch { /* fonte quebrada não derruba o balanço */ } }
  return out;
}
const sum = (xs: Obl20[]) => xs.reduce((t, o) => t + o.amt, 0);
/** Dívida financeira (passivos menos contas a pagar operacionais). */
export const debt20 = (s: GameState): number => sum(obligations20(s).filter((o) => o.liability && o.kind !== 'payable'));
/** Subconjunto do covenant bancário (contrato do banco): empréstimos + credor banco. Títulos e fornecedores ficam fora. */
export const bankDebt20 = (s: GameState): number => sum(obligations20(s).filter((o) => o.bank));
export const liabilities20 = (s: GameState): number => sum(obligations20(s).filter((o) => o.liability));

// ---------------------------------------------------------------- posição: agora × último fechamento

export interface Pos20 { cash: number; ar: number; ap: number; debt: number; bank: number; bonds: number; assets: number; equity: number; reserved: number; committed: number }
export interface Close20 extends Pos20 { y: number; m: number; w: number; mi: number; cf: { op: number; inv: number; fin: number } }

export function position20(s: GameState): Pos20 {
  const ob = obligations20(s);
  const assets = (s.assets ?? []).reduce((t, a) => t + a.bookValue, 0);
  const ar = arTotal18(s), ap = apTotal18(s);
  const debt = sum(ob.filter((o) => o.liability && o.kind !== 'payable'));
  return {
    cash: s.player.cash, ar, ap, debt, bank: sum(ob.filter((o) => o.bank)), bonds: sum(ob.filter((o) => o.kind === 'bond')), assets,
    equity: s.player.cash + assets + ar - debt - ap,
    reserved: sum(ob.filter((o) => o.kind === 'reserve')), committed: sum(ob.filter((o) => o.kind === 'commitment')),
  };
}

const cfOf = (s: GameState) => { const M = fin18(s).m[mIdx18(s)] ?? {}; return { op: M['cf:op'] ?? 0, inv: M['cf:inv'] ?? 0, fin: M['cf:fin'] ?? 0 }; };
/** Retrato no fim do fechamento mensal (chamado por tick.closeMonth). Só contabilidade: não muda o jogo. */
export function closeSnapshot20(s: GameState): void {
  const x = s.player as unknown as { close20?: Close20 };
  x.close20 = { ...position20(s), y: s.year, m: s.month, w: s.week, mi: mIdx18(s), cf: cfOf(s) };
}
export const lastClose20 = (s: GameState): Close20 | undefined => (s.player as unknown as { close20?: Close20 }).close20;

export interface Recon20 { open: number; op: number; inv: number; fin: number; other: number; now: number; since?: { y: number; m: number } }
/** Reconciliação simples: saldo do fechamento + operacional + investimento + financiamento (+ ajustes) = caixa agora. */
export function recon20(s: GameState): Recon20 | null {
  const c = lastClose20(s);
  if (!c) return null;
  const now = s.player.cash;
  const cf = c.mi === mIdx18(s) ? cfOf(s) : { op: 0, inv: 0, fin: 0 };
  const op = cf.op - (c.mi === mIdx18(s) ? c.cf.op : 0), inv = cf.inv - (c.mi === mIdx18(s) ? c.cf.inv : 0), fin = cf.fin - (c.mi === mIdx18(s) ? c.cf.fin : 0);
  return { open: c.cash, op, inv, fin, other: now - c.cash - op - inv - fin, now, since: { y: c.y, m: c.m } };
}
