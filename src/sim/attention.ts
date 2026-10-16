// Masters 31 (onda 0, W0-AT) — FILA ÚNICA DE AVISOS. Tudo que pede a atenção do jogador (aviso, mensagem, cena,
// pendência) vira um item priorizado aqui, com um orçamento único por mês. Nesta onda só `notify()` grava na fila
// (além de `s.notifications`, que a interface atual ainda lê); a troca da interface e a absorção de `people/inbox`,
// `inbox18`, `notify19` e `story28` são da onda 31.1 (UNI-1). Módulo puro: sem sistemas, sem sorteio.
//
//   pushAttn(s, { cat: 'money', prio: 2, title: l('Caixa negativo', 'Negative cash'), pendId: 'cash<0', dest: { area: 'finance' } });
//   attnQueue(s)        // itens visíveis, mais urgentes primeiro
//   pendingCount(s)     // pendências únicas (por pendId), sem duplicar
//   resolveAttn(s, 'cash<0')

import type { L } from '../data/world';
import { registerExt4 } from './ext4';
import type { GameState } from './types';

/** Categoria do aviso (aberta; as fixas abaixo são as que a interface agrupa). */
export type AttnCat = 'info' | 'good' | 'bad' | 'event' | 'money' | 'people' | 'career' | 'world' | 'deadline' | 'decision' | 'scene' | (string & {});
/** 0 = rotina · 1 = normal · 2 = importante · 3 = urgente (pede ação agora). */
export type AttnPrio = 0 | 1 | 2 | 3;
/** Destino de navegação (objeto simples; a interface resolve). */
export interface AttnDest { area: string; tab?: string; id?: string }

export interface AttnItem {
  /** estável: `a<seq>` (contador da própria fila, não depende de outros sistemas) */
  id: string;
  cat: AttnCat;
  prio: AttnPrio;
  title: L;
  body?: L;
  /** quem manda (id de pessoa/ato/selo, ou nome do sistema) */
  from?: string;
  /** semana absoluta em que entrou (ou foi atualizado) */
  at: number;
  /** pendência única: itens com o mesmo pendId são a MESMA pendência (o novo atualiza o antigo) */
  pendId?: string;
  dest?: AttnDest;
  seen: boolean;
  /** passou do orçamento do mês: fica no registro, não aparece na lista principal */
  fold?: 1;
  /** pendência resolvida */
  done?: 1;
}
export type AttnIn = Omit<AttnItem, 'id' | 'at' | 'seen' | 'fold' | 'done'> & Partial<Pick<AttnItem, 'at' | 'seen'>>;

export interface AttnState {
  q: AttnItem[];
  seq: number;
  /** mês do orçamento (ano*12+mês) e quantos itens de rotina/normal já entraram nele */
  bm: number;
  bn: number;
}
declare module './ext4' { interface Ext4 { attn: AttnState } }
const fresh = (): AttnState => ({ q: [], seq: 0, bm: -1, bn: 0 });
registerExt4('attn', fresh);
export function attn(s: GameState): AttnState {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.attn ??= fresh()) as AttnState;
  st.q ??= []; st.seq ??= 0; st.bm ??= -1; st.bn ??= 0;
  return st;
}

/** Teto da fila (itens resolvidos/vistos e mais antigos saem primeiro). */
export const ATTN_CAP = 160;
/** Orçamento único do mês: quantos avisos de prioridade 0–1 aparecem; o resto fica dobrado (`fold`).
 *  Prioridade ≥ 2 e pendências (pendId) nunca são cortadas. */
export const ATTN_BUDGET = 24;

const monthKey = (s: GameState): number => s.year * 12 + s.month;

/** Põe um item na fila. Com `pendId`, atualiza a pendência aberta de mesmo id em vez de criar outra. */
export function pushAttn(s: GameState, it: AttnIn): AttnItem {
  const st = attn(s);
  const at = it.at ?? s.week;
  if (it.pendId) {
    const o = st.q.find((x) => x.pendId === it.pendId && !x.done);
    if (o) {
      const p0 = o.prio;
      Object.assign(o, it, { at, seen: it.seen ?? false });
      o.prio = Math.max(p0, it.prio) as AttnPrio;
      delete o.fold;
      return o;
    }
  }
  const item: AttnItem = { ...it, id: `a${++st.seq}`, at, seen: it.seen ?? false };
  if (!it.pendId && it.prio < 2) {
    const mk = monthKey(s);
    if (st.bm !== mk) { st.bm = mk; st.bn = 0; }
    if (++st.bn > ATTN_BUDGET) item.fold = 1;
  }
  st.q.push(item);
  if (st.q.length > ATTN_CAP) prune(st);
  return item;
}

function prune(st: AttnState): void {
  // sai primeiro o que já foi resolvido ou dobrado, depois o visto, depois o mais antigo; pendência aberta fica
  const score = (x: AttnItem): number => (x.done ? 0 : x.fold ? 1 : x.seen ? 2 : x.pendId ? 4 : 3);
  while (st.q.length > ATTN_CAP) {
    let k = 0;
    for (let i = 1; i < st.q.length; i++) if (score(st.q[i]) < score(st.q[k])) k = i;
    st.q.splice(k, 1);
  }
}

/** Itens visíveis (sem dobrados nem resolvidos), mais urgentes e mais novos primeiro. */
export function attnQueue(s: GameState, o: { unseen?: boolean; folded?: boolean; done?: boolean; cat?: AttnCat; limit?: number } = {}): AttnItem[] {
  const xs = attn(s).q.filter((x) => (o.folded || !x.fold) && (o.done || !x.done) && (!o.unseen || !x.seen) && (!o.cat || x.cat === o.cat));
  xs.sort((a, b) => b.prio - a.prio || b.at - a.at || (a.id < b.id ? 1 : -1));
  return o.limit ? xs.slice(0, o.limit) : xs;
}

/** Pendências abertas únicas (por pendId): o mesmo assunto vindo de dois lugares conta uma vez. */
export function pendingCount(s: GameState): number {
  const ids = new Set<string>();
  for (const x of attn(s).q) if (x.pendId && !x.done) ids.add(x.pendId);
  return ids.size;
}

/** Marca a pendência como resolvida (todos os itens com esse pendId). */
export function resolveAttn(s: GameState, pendId: string): number {
  let n = 0;
  for (const x of attn(s).q) if (x.pendId === pendId && !x.done) { x.done = 1; x.seen = true; n++; }
  return n;
}

/** Marca itens como vistos (um id, ou todos). */
export function seeAttn(s: GameState, id?: string): void {
  for (const x of attn(s).q) if (!id || x.id === id) x.seen = true;
}
