// R31 · W0-CON — TRANSAÇÃO ATRIBUÍDA E TOTAIS DURÁVEIS. O razão (`s.ledger`) guarda só as últimas 400 linhas; os
// resultados por artista, projeto e período não podem sumir quando ele corta. Cada lançamento que passa por `post()`
// (util.ts) chega aqui por um observador do livro (`postObs18`, ledger18.ts) e vira uma transação atribuída:
//   pagador, dono (de quem é o livro), beneficiário e marcas (artista, projeto, período).
// Os totais por marca são acumulados em `x4.txn31` e nunca são cortados. Para cada dimensão vale sempre
//   soma(atribuído) + não alocado == total
// separado por classe: resultado (receita, custo, não operacional, impostos), compra/venda de bem (investimento) e
// financiamento — caixa à parte (`cash`). Nada aqui muda valores: o observador só lê o lançamento.
//
// Contexto: o sistema que sabe de quem é o dinheiro grava o contexto NA transação que de fato aconteceu, envolvendo o
// `post` em `withTxn({ artist, project, payer… }, () => post(...))`. Sem contexto, a marca é inferida da chave do
// lançamento (pedaços separados por ':' que sejam id de ato ou de lançamento); o resto fica como não alocado.

import { postObs18, type Sect18 } from '../ledger18';
import { registerExt4 } from '../ext4';
import type { GameState } from '../types';

export type TxnDim = 'artist' | 'project' | 'period';
export const TXN_DIMS: TxnDim[] = ['artist', 'project', 'period'];
/** res: resultado (DRE); inv: compra/venda de bem; fin: financiamento */
export type TxnCls = 'res' | 'inv' | 'fin';
export const TXN_CLS: TxnCls[] = ['res', 'inv', 'fin'];
export const clsOf = (sect: Sect18): TxnCls => (sect === 'inv' ? 'inv' : sect === 'fin' ? 'fin' : 'res');

export interface TxnTags { artist?: string; project?: string; period?: string }
export interface TxnCtx extends TxnTags { payer?: string; owner?: string; beneficiary?: string }
export interface Txn { key: string; w: number; amount: number; cat: string; cls: TxnCls; cash: boolean; payer: string; owner: string; beneficiary: string; tags: TxnTags }

export interface TxnDimTot { by: Record<string, number>; un: number }
export interface TxnClsTot { total: number; dims: Record<TxnDim, TxnDimTot> }
export interface Txn31St { cls: Record<TxnCls, TxnClsTot>; cash: number; n: number; last: Txn[] }

const dimTot = (): TxnDimTot => ({ by: {}, un: 0 });
const clsTot = (): TxnClsTot => ({ total: 0, dims: { artist: dimTot(), project: dimTot(), period: dimTot() } });
const fresh = (): Txn31St => ({ cls: { res: clsTot(), inv: clsTot(), fin: clsTot() }, cash: 0, n: 0, last: [] });
declare module '../ext4' { interface Ext4 { txn31: Txn31St } }
registerExt4('txn31', fresh);
export function txn31(s: GameState): Txn31St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  return (x.txn31 ??= fresh()) as Txn31St;
}
export const LAST_CAP31 = 60;

// ---------------------------------------------------------------- contexto

const STACK: TxnCtx[] = [];
/** Roda `fn` com o contexto (o mais interno vale); os lançamentos feitos dentro levam as marcas. */
export function withTxn<T>(ctx: TxnCtx, fn: () => T): T {
  STACK.push({ ...(STACK[STACK.length - 1] ?? {}), ...ctx });
  try { return fn(); } finally { STACK.pop(); }
}
const ctxNow = (): TxnCtx => STACK[STACK.length - 1] ?? {};

/** Marcas inferidas da chave: um pedaço que é id de ato (artista) ou de lançamento (projeto). */
export function inferTags(s: GameState, key: string): TxnTags {
  const out: TxnTags = {};
  for (const tok of key.split(':')) {
    if (!out.artist && s.acts[tok]) out.artist = tok;
    else if (!out.project && s.releases[tok]) { out.project = tok; if (!out.artist && s.releases[tok].actId) out.artist = s.releases[tok].actId; }
  }
  return out;
}

// ---------------------------------------------------------------- registro

/** Registra uma transação (chamado pelo observador do livro; testes podem chamar direto). */
export function recordTxn(s: GameState, key: string, amount: number, cat: string, sect: Sect18, cash: boolean): Txn {
  const c = ctxNow();
  const inf = c.artist && c.project ? {} : inferTags(s, key);
  const tags: TxnTags = { artist: c.artist ?? inf.artist, project: c.project ?? inf.project, period: c.period ?? String(s.year) };
  const t: Txn = {
    key, w: s.week, amount, cat, cls: clsOf(sect), cash,
    payer: c.payer ?? (amount >= 0 ? 'ext' : 'player'),
    owner: c.owner ?? 'player',
    beneficiary: c.beneficiary ?? (amount >= 0 ? 'player' : 'ext'),
    tags,
  };
  const st = txn31(s);
  const ct = st.cls[t.cls];
  ct.total += amount;
  for (const d of TXN_DIMS) {
    const id = tags[d];
    const dt = ct.dims[d];
    if (id) dt.by[id] = (dt.by[id] ?? 0) + amount;
    else dt.un += amount;
  }
  if (cash) st.cash += amount;
  st.n++;
  st.last.push(t);
  if (st.last.length > LAST_CAP31) st.last.splice(0, st.last.length - LAST_CAP31);
  return t;
}

postObs18().push((s, key, amount, cat, sect, cash) => { recordTxn(s, key, amount, cat, sect, cash); });

// ---------------------------------------------------------------- leitura

/** Total durável de uma marca (ex.: artista 'a12' na classe resultado). */
export const txnTotal = (s: GameState, dim: TxnDim, id: string, cls: TxnCls = 'res'): number => txn31(s).cls[cls].dims[dim].by[id] ?? 0;
export const txnUnallocated = (s: GameState, dim: TxnDim, cls: TxnCls = 'res'): number => txn31(s).cls[cls].dims[dim].un;

/** Fechamento: para cada classe e dimensão, atribuído + não alocado == total. Devolve os desvios (vazio = fecha). */
export function txnBalance(s: GameState): string[] {
  const st = txn31(s);
  const bad: string[] = [];
  for (const c of TXN_CLS) for (const d of TXN_DIMS) {
    const dt = st.cls[c].dims[d];
    let sum = dt.un;
    for (const k in dt.by) sum += dt.by[k];
    if (sum !== st.cls[c].total) bad.push(`${c}/${d}: ${sum} ≠ ${st.cls[c].total}`);
  }
  return bad;
}
