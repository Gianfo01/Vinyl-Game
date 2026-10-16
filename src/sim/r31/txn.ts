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

import { tourList } from '../tours';
import { postObs18, type Sect18 } from '../ledger18';
import { registerExt4 } from '../ext4';
import type { GameState } from '../types';

export type TxnDim = 'artist' | 'project' | 'period';
export const TXN_DIMS: TxnDim[] = ['artist', 'project', 'period'];
/** res: resultado (DRE); inv: compra/venda de bem; fin: financiamento */
export type TxnCls = 'res' | 'inv' | 'fin';
export const TXN_CLS: TxnCls[] = ['res', 'inv', 'fin'];
export const clsOf = (sect: Sect18): TxnCls => (sect === 'inv' ? 'inv' : sect === 'fin' ? 'fin' : 'res');

export interface TxnTags {
  artist?: string; project?: string; period?: string;
  /** onda 3 (P): marcas finas gravadas no ato — o lançamento (release) e a turnê que geraram o valor. O projeto (dimensão
   *  durável) é o lançamento, a turnê ou o projeto musical ainda sem lançamento. */
  release?: string; tour?: string;
}
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
/** onda 3 (P): o contexto em vigor (o diário com contexto lê o lançamento/turnê em jogo). */
export const txnCtxNow = ctxNow;

/** onda 3 (P): o projeto programado (lançamento pendente) virou o lançamento `to` — resultados juntam as linhas. Função
 *  içada; market.ts chama sem importar os resultados. */
export type ProjAlias31 = (s: GameState, from: string, to: string) => void;
export function projAlias31(): ProjAlias31[] {
  const f = projAlias31 as unknown as { l?: ProjAlias31[] };
  return (f.l ??= []);
}

/** Marcas inferidas da chave: um pedaço que é id de ato (artista) ou de lançamento (projeto). */
export function inferTags(s: GameState, key: string): TxnTags {
  const out: TxnTags = {};
  for (const tok of key.split(':')) {
    if (!out.artist && s.acts[tok]) out.artist = tok;
    else if (!out.project && s.releases[tok]) { out.project = tok; out.release = tok; if (!out.artist && s.releases[tok].actId) out.artist = s.releases[tok].actId; }
    else if (!out.project && tok.length > 2 && /^(tr|pr)[0-9a-z]+$/.test(tok)) {
      // onda 3 (P): turnê e lançamento programado também são projeto (gravado no ato: a marca fica na transação)
      const t = tok.startsWith('tr') ? tourList(s).find((x) => x.id === tok) : undefined;
      if (t) { out.project = tok; out.tour = tok; out.artist ??= t.actId; continue; }
      const pr = tok.startsWith('pr') ? s.pendingReleases?.find((x) => x.id === tok) : undefined;
      if (pr) { out.project = tok; out.artist ??= pr.actId; }
    }
  }
  return out;
}

// ---------------------------------------------------------------- registro

/** Registra uma transação (chamado pelo observador do livro; testes podem chamar direto). */
export function recordTxn(s: GameState, key: string, amount: number, cat: string, sect: Sect18, cash: boolean): Txn {
  const c = ctxNow();
  const inf = c.artist && c.project ? {} : inferTags(s, key);
  const tags: TxnTags = { artist: c.artist ?? inf.artist, project: c.project ?? inf.project, period: c.period ?? String(s.year) };
  const rel = c.release ?? (c.project ? undefined : inf.release);
  if (rel) tags.release = rel;
  const tour = c.tour ?? (c.project ? undefined : inf.tour);
  if (tour) tags.tour = tour;
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
  for (const fn of txnObs31()) fn(s, t, sect);
  return t;
}

/** onda 3 (P): ouvintes de cada transação já atribuída (resultados por projeto, diário com contexto). Só leitura do
 *  lançamento; função içada como `postObs18`. */
export type TxnObs31 = (s: GameState, t: Txn, sect: Sect18) => void;
export function txnObs31(): TxnObs31[] {
  const f = txnObs31 as unknown as { l?: TxnObs31[] };
  return (f.l ??= []);
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
