// R31 · onda 3 (P) — RESULTADOS POR PROJETO E POR ARTISTA (RN-07) e DIÁRIO COM CONTEXTO (RN-10).
//
// Fonte: cada transação atribuída do contrato da onda 0 (`txn.ts`: `txnObs31`), já com as marcas gravadas no ato
// (artista, projeto, lançamento, turnê, período). Aqui elas viram totais duráveis — não somem quando o razão (400
// linhas) corta — separados em receita, custo direto e custo RATEADO:
//   • custo comum (sem artista: salários da casa, escritório, marketing institucional…) é dividido no fechamento de
//     cada mês por uma REGRA DECLARADA (`rule`): pela receita do mês (padrão), igual entre os artistas com movimento,
//     ou sem rateio. Mudar a regra vale do mês seguinte em diante (o passado já fechado fica como foi).
//   • o que não tem base de rateio (impostos, juros, câmbio, outras receitas e despesas não operacionais; mês sem
//     receita) fica como NÃO ALOCADO, sempre visível.
//   • fecha sempre: Σ direto + Σ rateado + não alocado == total do resultado (`results31Balance`).
// Projeto = lançamento, turnê ou projeto musical ainda sem lançamento (custo de estúdio antes do disco sair).
// Período: o artista tem totais por ano; o projeto, desde o início.
//
// Diário com contexto: cada fato SEU que entra no diário guarda o momento — caixa, fama do artista (ou do selo),
// a chance mostrada quando a decisão tinha uma e o lançamento/turnê em jogo (`withDiaryCtx31`). A tela marca isso
// como fato registrado; a ligação causa → efeito continua sendo leitura (inferência).
//
// Sem sorteio, sem mudar valores: só lê os lançamentos. Estado em `x4.res31` e `x4.dctx31`.

import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { group18, type Sect18 } from '../ledger18';
import type { GameState, MemoryEntry } from '../types';
import { rememberListeners } from '../util';
import { playerMem28 } from '../sys/story28';
import { registerEditable, registerRunnable } from './editor';
import { projAlias31, txn31, txnCtxNow, txnObs31, type Txn } from './txn';

// ---------------------------------------------------------------- regra de rateio

export type Rule31 = 'revenue' | 'equal' | 'none';
export const RULES31: Record<Rule31, { label: L; desc: L }> = {
  revenue: {
    label: l('Pela receita do mês', 'By the month\'s revenue'),
    desc: l('O custo comum do mês (salários da casa, escritório, divulgação do selo) é dividido na proporção da receita que cada artista e cada projeto trouxe no mês. Mês sem receita: fica não alocado.',
      'The month\'s common cost (house salaries, office, label promotion) is split in proportion to the revenue each act and each project brought in that month. A month with no revenue: it stays unallocated.'),
  },
  equal: {
    label: l('Igual entre quem teve movimento', 'Equally among those with activity'),
    desc: l('O custo comum do mês é dividido em partes iguais entre os artistas e projetos que tiveram receita ou custo no mês.',
      'The month\'s common cost is split equally among the acts and projects with any revenue or cost that month.'),
  },
  none: {
    label: l('Sem rateio', 'No allocation'),
    desc: l('Nada é rateado: o custo comum fica inteiro como não alocado.', 'Nothing is allocated: the common cost stays entirely unallocated.'),
  },
};
/** Grupos da DRE que formam o custo comum rateável (só custo operacional). Imposto, juros, câmbio e não operacional
 *  nunca são rateados. */
export const SHARE_GROUPS31 = new Set(['pay', 'ovh', 'mkt', 'ar', 'cogs']);

// ---------------------------------------------------------------- estado

/** [receita, custo direto, custo rateado] — custos negativos */
export type R3 = [number, number, number];
export type PKind31 = 'rel' | 'tour' | 'proj' | 'x';
export interface PRow31 { v: R3; n: string; a?: string; k: PKind31; y: number }
export interface Un31 { r: number; c: number; sh: number }
export interface YRow31 { A: Record<string, R3>; tot: number; unA: Un31 }
export interface J31 { w: number; amt: number; memo: string; cls: 'res' | 'inv' | 'fin'; a?: string; p?: string; payer: string; ben: string }
export interface Res31St {
  rule: Rule31;
  /** semana em que a regra atual passou a valer */
  ruleSince: number;
  A: Record<string, { v: R3; n: string }>;
  P: Record<string, PRow31>;
  Y: Record<number, YRow31>;
  /** total do resultado e não alocado por dimensão (r/c brutos; sh = parte do custo que saiu do não alocado por rateio) */
  tot: number;
  unA: Un31;
  unP: Un31;
  /** mês aberto: receita/movimento por artista e projeto e custo comum ainda não rateado */
  cur: { m: number; y: number; a: Record<string, [number, number]>; p: Record<string, [number, number]>; comA: number; comP: number };
  /** diário de lançamentos com contexto (últimos J_CAP31) */
  j: J31[];
}
export const J_CAP31 = 120;
const un = (): Un31 => ({ r: 0, c: 0, sh: 0 });
const fresh = (): Res31St => ({
  rule: 'revenue', ruleSince: 0, A: {}, P: {}, Y: {}, tot: 0, unA: un(), unP: un(),
  cur: { m: -1, y: 0, a: {}, p: {}, comA: 0, comP: 0 }, j: [],
});
export type DCtx31 = [number, number, number?, string?];
export interface DCtxSt { m: Record<string, DCtx31>; o: string[] }
declare module '../ext4' { interface Ext4 { res31: Res31St; dctx31: DCtxSt } }
registerExt4('res31', fresh);
registerExt4('dctx31', () => ({ m: {}, o: [] }));
export function res31(s: GameState): Res31St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  return (x.res31 ??= fresh()) as Res31St;
}
function dctx31(s: GameState): DCtxSt {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  return (x.dctx31 ??= { m: {}, o: [] }) as DCtxSt;
}

// ---------------------------------------------------------------- nomes (gravados no ato: o projeto pode sumir depois)

function projOf(s: GameState, id: string): { n: string; a?: string; k: PKind31 } {
  const r = s.releases[id];
  if (r) return { n: r.title, a: r.actId, k: 'rel' };
  const t = s.tours?.find((x) => x.id === id);
  if (t) return { n: t.name, a: t.actId, k: 'tour' };
  const pr = s.pendingReleases?.find((x) => x.id === id);
  if (pr) return { n: pr.title, a: pr.actId, k: 'proj' };
  const pj = (s.x4 as unknown as { proj8?: { list: { id: string; title: string; actId: string }[] } }).proj8?.list.find((x) => x.id === id);
  if (pj) return { n: pj.title, a: pj.actId, k: 'proj' };
  for (const f of projName31()) { const n = f(s, id); if (n) return { n, k: 'x' }; }
  return { n: '', k: 'x' };
}
/** Nomes de projetos de outros sistemas (SOC: 'soc:<negócio>' → nome do festival/casa/rádio/estúdio). Função içada. */
export type ProjName31 = (s: GameState, id: string) => string | undefined;
export function projName31(): ProjName31[] {
  const f = projName31 as unknown as { l?: ProjName31[] };
  return (f.l ??= []);
}

// ---------------------------------------------------------------- registro (ouvinte da transação)

const add3 = (v: R3, amt: number, i: 0 | 1 | 2) => { v[i] += amt; };

export function closeMonth31(s: GameState): void {
  const st = res31(s);
  const cur = st.cur;
  if (cur.m < 0) return;
  const rule = st.rule;
  const split = (pool: number, mv: Record<string, [number, number]>): Record<string, number> => {
    const out: Record<string, number> = {};
    if (!pool || rule === 'none') return out;
    const ids = Object.keys(mv).sort();
    const base = rule === 'revenue' ? ids.filter((k) => mv[k][0] > 0) : ids.filter((k) => mv[k][0] || mv[k][1]);
    if (!base.length) return out;
    const tot = rule === 'revenue' ? base.reduce((t, k) => t + mv[k][0], 0) : base.length;
    let left = pool;
    let big = base[0];
    for (const k of base) {
      const w = rule === 'revenue' ? mv[k][0] : 1;
      const part = Math.round((pool * w) / tot);
      out[k] = part;
      left -= part;
      if ((rule === 'revenue' ? mv[k][0] : 0) > (rule === 'revenue' ? mv[big][0] : 0)) big = k;
    }
    out[big] += left; // resto do arredondamento no maior: fecha no centavo
    return out;
  };
  const shA = split(cur.comA, cur.a);
  const Y = yRow(st, cur.y);
  for (const k in shA) {
    const v = shA[k];
    add3((st.A[k] ??= { v: [0, 0, 0], n: '' }).v, v, 2);
    add3((Y.A[k] ??= [0, 0, 0]), v, 2);
    st.unA.sh += v;
    Y.unA.sh += v;
  }
  const shP = split(cur.comP, cur.p);
  for (const k in shP) {
    const row = st.P[k];
    if (!row) continue;
    add3(row.v, shP[k], 2);
    st.unP.sh += shP[k];
  }
  st.cur = { m: -1, y: 0, a: {}, p: {}, comA: 0, comP: 0 };
}

function yRow(st: Res31St, y: number): YRow31 {
  return (st.Y[y] ??= { A: {}, tot: 0, unA: un() });
}

export function recordRes31(s: GameState, t: Txn, sect: Sect18): void {
  const st = res31(s);
  // diário de lançamentos com contexto (resultado e compra de bem; financiamento também, para a retirada aparecer)
  const last = s.ledger[s.ledger.length - 1];
  const memo = last && last.key === `${s.week}:${t.key}` ? last.memo : '';
  st.j.push({ w: s.week, amt: t.amount, memo, cls: t.cls, ...(t.tags.artist ? { a: t.tags.artist } : {}), ...(t.tags.project ? { p: t.tags.project } : {}), payer: t.payer, ben: t.beneficiary });
  if (st.j.length > J_CAP31) st.j.splice(0, st.j.length - J_CAP31);
  if (t.cls !== 'res') return;
  const mi = s.year * 12 + s.month;
  if (st.cur.m !== mi) { closeMonth31(s); st.cur.m = mi; st.cur.y = s.year; }
  const amt = t.amount;
  const rev = amt > 0;
  const year = Number(t.tags.period ?? s.year) || s.year;
  const Y = yRow(st, year);
  st.tot += amt;
  Y.tot += amt;
  const common = sect === 'cost' && SHARE_GROUPS31.has(group18(t.cat, sect, t.key));
  const a = t.tags.artist;
  if (a) {
    const A = (st.A[a] ??= { v: [0, 0, 0], n: '' });
    if (!A.n) A.n = s.acts[a]?.name ?? '';
    add3(A.v, amt, rev ? 0 : 1);
    add3((Y.A[a] ??= [0, 0, 0]), amt, rev ? 0 : 1);
    const m = (st.cur.a[a] ??= [0, 0]);
    if (rev) m[0] += amt; else m[1] += amt;
  } else {
    if (rev) { st.unA.r += amt; Y.unA.r += amt; } else { st.unA.c += amt; Y.unA.c += amt; }
    if (common) st.cur.comA += amt;
  }
  const p = t.tags.project;
  if (p) {
    let P = st.P[p];
    if (!P) { const o = projOf(s, p); P = st.P[p] = { v: [0, 0, 0], n: o.n, k: t.tags.tour === p ? 'tour' : o.k, y: s.year, ...(o.a ?? a ? { a: o.a ?? a } : {}) }; }
    if (!P.n) { const o = projOf(s, p); if (o.n) { P.n = o.n; if (o.k !== 'x') P.k = o.k; P.a ??= o.a; } }
    add3(P.v, amt, rev ? 0 : 1);
    const m = (st.cur.p[p] ??= [0, 0]);
    if (rev) m[0] += amt; else m[1] += amt;
  } else {
    if (rev) st.unP.r += amt; else st.unP.c += amt;
    if (common && !a) st.cur.comP += amt;
  }
}
txnObs31().push(recordRes31);
projAlias31().push((s, from, to) => {
  const st = res31(s);
  const P = st.P[from];
  if (!P) return;
  const Q = (st.P[to] ??= { v: [0, 0, 0], n: P.n, k: 'rel', y: P.y, ...(P.a ? { a: P.a } : {}) });
  Q.k = 'rel';
  Q.n = s.releases[to]?.title || Q.n || P.n;
  for (const i of [0, 1, 2] as const) Q.v[i] += P.v[i];
  delete st.P[from];
  const m = st.cur.p[from];
  if (m) { const n = (st.cur.p[to] ??= [0, 0]); n[0] += m[0]; n[1] += m[1]; delete st.cur.p[from]; }
  for (const j of st.j) if (j.p === from) j.p = to;
});
registerSimHook('month', 'res31.close', (s) => { const st = res31(s); if (st.cur.m >= 0 && st.cur.m !== s.year * 12 + s.month) closeMonth31(s); });

// ---------------------------------------------------------------- leitura

export interface Row31 { id: string; name: string; kind?: PKind31; actId?: string; rev: number; cost: number; shared: number; margin: number; year?: number }
export interface Totals31 {
  /** total do resultado no recorte */
  total: number;
  /** atribuído direto (receita + custo marcados) */
  direct: number;
  /** custo comum rateado pela regra */
  shared: number;
  /** não alocado depois do rateio (inclui custo comum do mês ainda aberto) */
  unallocated: number;
  /** não alocado antes do rateio: receita e custo sem marca */
  unRev: number;
  unCost: number;
}
export interface Report31 { dim: 'artist' | 'project'; period: number | 'all'; rule: Rule31; rows: Row31[]; totals: Totals31 }

const sum3 = (v: R3) => v[0] + v[1] + v[2];

/** Resultado por artista (período = ano ou tudo) ou por projeto (desde o início). Não muda nada. */
export function resultsReport31(s: GameState, dim: 'artist' | 'project', period: number | 'all' = 'all'): Report31 {
  const st = res31(s);
  const rows: Row31[] = [];
  let direct = 0, shared = 0, total: number, u: Un31;
  if (dim === 'artist') {
    const src: Record<string, R3> = {};
    if (period === 'all') { for (const k in st.A) src[k] = st.A[k].v; total = st.tot; u = st.unA; }
    else { const Y = st.Y[period]; total = Y?.tot ?? 0; u = Y?.unA ?? un(); if (Y) for (const k in Y.A) src[k] = Y.A[k]; }
    for (const id in src) {
      const v = src[id];
      rows.push({ id, name: s.acts[id]?.name ?? st.A[id]?.n ?? '', actId: id, rev: v[0], cost: v[1], shared: v[2], margin: sum3(v) });
      direct += v[0] + v[1]; shared += v[2];
    }
  } else {
    total = st.tot; u = st.unP;
    for (const id in st.P) {
      const P = st.P[id];
      rows.push({ id, name: P.n || projOf(s, id).n, kind: P.k, actId: P.a, year: P.y, rev: P.v[0], cost: P.v[1], shared: P.v[2], margin: sum3(P.v) });
      direct += P.v[0] + P.v[1]; shared += P.v[2];
    }
  }
  rows.sort((a, b) => b.margin - a.margin || (a.id < b.id ? -1 : 1));
  return { dim, period, rule: st.rule, rows, totals: { total, direct, shared, unallocated: u.r + u.c - u.sh, unRev: u.r, unCost: u.c } };
}

/** Fechamento: direto + rateado + não alocado == total, por dimensão e por ano; e o total bate com o contrato da onda 0. */
export function results31Balance(s: GameState): string[] {
  const bad: string[] = [];
  const chk = (lbl: string, r: Report31) => {
    const t = r.totals;
    if (t.direct + t.shared + t.unallocated !== t.total) bad.push(`${lbl}: ${t.direct} + ${t.shared} + ${t.unallocated} ≠ ${t.total}`);
  };
  chk('artista/tudo', resultsReport31(s, 'artist'));
  chk('projeto/tudo', resultsReport31(s, 'project'));
  for (const y of Object.keys(res31(s).Y)) chk(`artista/${y}`, resultsReport31(s, 'artist', Number(y)));
  const t0 = txn31(s).cls.res.total;
  if (res31(s).tot !== t0) bad.push(`total ${res31(s).tot} ≠ contrato ${t0}`);
  return bad;
}

/** Resultado de um projeto (para a ficha). */
export const projectResult31 = (s: GameState, id: string): Row31 | undefined => {
  const P = res31(s).P[id];
  return P ? { id, name: P.n, kind: P.k, actId: P.a, year: P.y, rev: P.v[0], cost: P.v[1], shared: P.v[2], margin: sum3(P.v) } : undefined;
};
/** Resultado de um artista (para a ficha). */
export const artistResult31 = (s: GameState, id: string, period: number | 'all' = 'all'): Row31 | undefined => {
  const st = res31(s);
  const v = period === 'all' ? st.A[id]?.v : st.Y[period]?.A[id];
  return v ? { id, name: s.acts[id]?.name ?? st.A[id]?.n ?? '', actId: id, rev: v[0], cost: v[1], shared: v[2], margin: sum3(v) } : undefined;
};
/** Projetos de um artista, do melhor ao pior. */
export const projectsOfArtist31 = (s: GameState, actId: string): Row31[] => resultsReport31(s, 'project').rows.filter((r) => r.actId === actId);

/** Diário de lançamentos com contexto (mais novo primeiro), opcionalmente de um artista/projeto. */
export function journal31(s: GameState, f: { a?: string; p?: string } = {}): J31[] {
  return res31(s).j.filter((x) => (!f.a || x.a === f.a) && (!f.p || x.p === f.p)).slice().reverse();
}

/** Troca a regra de rateio: vale do mês seguinte em diante (o mês aberto fecha com a regra antiga). */
export function setRule31(s: GameState, rule: Rule31): void {
  const st = res31(s);
  if (st.rule === rule || !RULES31[rule]) return;
  closeMonth31(s);
  st.rule = rule;
  st.ruleSince = s.week;
}

// ---------------------------------------------------------------- diário com contexto (RN-10)

const CTX: { chance?: number; ref?: string }[] = [];
/** Roda `fn` registrando, nos fatos do diário criados dentro, a chance mostrada (0–1) e o lançamento/turnê em jogo. */
export function withDiaryCtx31<T>(ctx: { chance?: number; ref?: string }, fn: () => T): T {
  CTX.push({ ...(CTX[CTX.length - 1] ?? {}), ...ctx });
  try { return fn(); } finally { CTX.pop(); }
}
export const DCTX_CAP31 = 1500;

function fameNow(s: GameState, actId?: string): number {
  if (actId && s.acts[actId]) return Math.round(s.acts[actId].fame);
  return Math.round(s.player.reputation.commercial);
}

rememberListeners().push((s, e) => {
  if (!playerMem28(s, e)) return; // só os fatos seus (o anel "Minha história")
  const c0 = CTX[CTX.length - 1];
  const tc = txnCtxNow();
  const ref = c0?.ref ?? tc.release ?? tc.tour ?? tc.project;
  const c = { chance: c0?.chance, ref };
  const st = dctx31(s);
  const v: DCtx31 = [s.player.cash, fameNow(s, e.actId)];
  if (c?.chance !== undefined) v[2] = Math.round(c.chance * 100);
  if (c?.ref) { if (v.length < 3) v[2] = -1; v[3] = c.ref; }
  st.m[e.id] = v;
  st.o.push(e.id);
  if (st.o.length > DCTX_CAP31) for (const k of st.o.splice(0, st.o.length - DCTX_CAP31)) delete st.m[k];
});

export interface DiaryCtx31 { cash: number; fame: number; famous: 'act' | 'label'; chance?: number; ref?: { id: string; name: string } }
/** Contexto gravado quando o fato aconteceu (ou nada, se não for fato seu). */
export function diaryCtx31(s: GameState, e: Pick<MemoryEntry, 'id' | 'actId'>): DiaryCtx31 | undefined {
  const v = dctx31(s).m[e.id];
  if (!v) return undefined;
  const out: DiaryCtx31 = { cash: v[0], fame: v[1], famous: e.actId ? 'act' : 'label' };
  if (v[2] !== undefined && v[2] >= 0) out.chance = v[2];
  if (v[3]) { const P = res31(s).P[v[3]]; out.ref = { id: v[3], name: P?.n || projOf(s, v[3]).n }; }
  return out;
}

// ---------------------------------------------------------------- editor (regra 10)

registerEditable({
  id: 'results.rule', area: 'money', kind: 'select', label: l('Regra de rateio do custo comum', 'Common cost allocation rule'),
  help: l('Vale do mês seguinte em diante; o que já fechou fica como foi.', 'Applies from next month on; closed months stay as they were.'),
  options: () => (Object.keys(RULES31) as Rule31[]).map((k) => ({ value: k, label: RULES31[k].label })),
  get: (s) => res31(s).rule,
  set: (s, v) => { if (!RULES31[v as Rule31]) return l('Regra desconhecida.', 'Unknown rule.'); setRule31(s, v as Rule31); },
});
registerRunnable({
  id: 'results.close', area: 'money', label: l('Fechar o mês dos resultados agora (rateio)', 'Close the results month now (allocation)'),
  run: (s) => { closeMonth31(s); return l('Mês fechado: custo comum rateado pela regra.', 'Month closed: common cost allocated by the rule.'); },
});
