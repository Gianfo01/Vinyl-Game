// Rodada 17 — barramento de FATOS (fundação da integração). Todo acontecimento notável vira um `Fact` tipado
// (quem, onde, quão grave, quão visível, por quê) guardado num anel em s.x4.facts17. Sistemas publicam com
// emitFact e reagem com onFact; a interface lê factsAbout/recentFacts. Módulo puro (sem sistemas): pode ser
// importado de qualquer lugar sem ciclo. As pontes com remember()/chron9/press9 ficam em sys/bridge17.ts.
//
//   emitFact(s, { kind: 'arrest', actors: [personId, actId], place: cityId, severity: 60, visibility: 'rumor', tags: ['crime'], text: l('…', '…') });
//   onFact('scandal', (s, f) => { … });              // ou '*' para todos
//   factsAbout(s, actId) · recentFacts(s, { kind: 'death', months: 12 })
//
// Convenção de ids dos atores: pessoa = id de s.persons ('p…'), ato = id de s.acts, selo = id de s.labels,
// 'player' = você/seu selo; outras pessoas usam a chave persona13 ('l:', 'e:', 'pd:', 's:', 'c:').

import type { L } from '../data/world';
import { registerExt4 } from './ext4';
import type { GameState } from './types';

export type FactKind =
  | 'release' | 'chart' | 'award' | 'show' | 'tour_cancel' | 'scandal' | 'arrest' | 'case_ruling'
  | 'affair' | 'romance' | 'marriage' | 'breakup' | 'birth' | 'death' | 'health' | 'breakdown' | 'rehab' | 'addiction'
  | 'signing' | 'exit' | 'split' | 'poach' | 'deal' | 'label_sold' | 'statement' | 'boycott' | 'law'
  | 'favor' | 'hold' | 'hold_used' | 'secret_exposed' | 'forgiven' | 'situation' | 'stress' | 'memory'
  | (string & {});
export type Visibility = 'secret' | 'rumor' | 'public';

export interface Fact {
  id: string;
  y: number;
  m: number;
  /** semana absoluta (recência) */
  w: number;
  kind: FactKind;
  /** [0] = protagonista */
  actors: string[];
  /** cidade (id) — o país sai de countryOfCity */
  place?: string;
  /** 0..100 */
  severity: number;
  visibility: Visibility;
  tags: string[];
  text: L;
  /** ids de fatos que causaram este (cadeia "por que deu nisso?") */
  cause?: string[];
  /** origem: 'chron' | 'memory' | 'scandal17' | sistema */
  src?: string;
  data?: Record<string, number | string>;
}
export type FactIn = Omit<Fact, 'id' | 'y' | 'm' | 'w' | 'visibility' | 'tags' | 'severity'> & Partial<Pick<Fact, 'visibility' | 'tags' | 'severity'>>;

export interface Facts17State { f: Fact[]; seq: number }
declare module './ext4' { interface Ext4 { facts17: Facts17State } }
const fresh = (): Facts17State => ({ f: [], seq: 0 });
registerExt4('facts17', fresh);
export function facts17(s: GameState): Facts17State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.facts17 ??= fresh()) as Facts17State;
  st.f ??= []; st.seq ??= 0;
  return st;
}

/** Teto do anel: fatos pequenos e velhos saem primeiro. */
export const FACT_CAP = 600;
type FactFn = (s: GameState, f: Fact) => void;
const LISTENERS: { kind: string; id: string; fn: FactFn }[] = [];
let depth = 0;

/** Reage a fatos de um tipo (ou '*' = todos). `id` permite substituir o ouvinte (recarga). */
export function onFact(kind: FactKind | '*', fn: FactFn, id = `${kind}#${LISTENERS.length}`): void {
  const i = LISTENERS.findIndex((x) => x.id === id);
  if (i >= 0) LISTENERS[i] = { kind, id, fn };
  else LISTENERS.push({ kind, id, fn });
}

const same = (a: Fact, b: Omit<Fact, 'id'>): boolean => a.kind === b.kind && a.w === b.w && (a.actors[0] ?? '') === (b.actors[0] ?? '');

/** Publica um fato: guarda no anel e chama os ouvintes. Fatos vindos de pontes (data.bridged) não duplicam
 *  um fato nativo da mesma semana/tipo/protagonista; o nativo substitui o da ponte. */
export function emitFact(s: GameState, fi: FactIn): Fact {
  const st = facts17(s);
  const f0: Omit<Fact, 'id'> = {
    ...fi, y: s.year, m: s.month, w: s.week,
    actors: [...new Set(fi.actors.filter(Boolean))],
    severity: Math.round(Math.max(0, Math.min(100, fi.severity ?? 30))),
    visibility: fi.visibility ?? 'public', tags: fi.tags ?? [],
  };
  const bridged = !!fi.data?.bridged;
  for (let i = st.f.length - 1, n = 0; i >= 0 && n < 10; i--, n++) {
    const o = st.f[i];
    if (!same(o, f0)) continue;
    if (bridged) { if (o.text.pt === f0.text.pt || !o.data?.bridged) return o; }
    else if (o.data?.bridged) { const f = { ...f0, id: o.id }; st.f[i] = f; fire(s, f); return f; }
  }
  const f: Fact = { ...f0, id: `f${++st.seq}` };
  st.f.push(f);
  if (st.f.length > FACT_CAP) prune(s, st);
  fire(s, f);
  return f;
}

function fire(s: GameState, f: Fact): void {
  if (depth > 3) return; // cadeias de reação limitadas (fato → fato → fato)
  depth++;
  try {
    for (const x of LISTENERS) if (x.kind === '*' || x.kind === f.kind) x.fn(s, f);
  } finally { depth--; }
}

function prune(s: GameState, st: Facts17State): void {
  const over = st.f.length - FACT_CAP + 60;
  const old = st.f.filter((f) => s.week - f.w > 104 && f.severity < 50).slice(0, over).map((f) => f.id);
  const drop = new Set(old);
  st.f = st.f.filter((f) => !drop.has(f.id));
  if (st.f.length > FACT_CAP) st.f = st.f.slice(st.f.length - FACT_CAP + 60);
}

/** Normaliza chaves persona13 de pessoas ('p:xyz' → 'xyz'). */
export const actorId = (k: string): string => (k.startsWith('p:') ? k.slice(2) : k);

export interface FactFilter { kind?: FactKind; kinds?: FactKind[]; tag?: string; minSev?: number; vis?: Visibility | Visibility[]; months?: number; sinceWeek?: number; actor?: string; place?: string; limit?: number; notSecret?: boolean }

/** Fatos mais recentes primeiro. */
export function recentFacts(s: GameState, q: FactFilter = {}): Fact[] {
  const out: Fact[] = [];
  const st = facts17(s);
  const since = q.sinceWeek ?? (q.months ? s.week - Math.round(q.months * 4.35) : -Infinity);
  const vis = q.vis ? (Array.isArray(q.vis) ? q.vis : [q.vis]) : null;
  const who = q.actor ? actorId(q.actor) : null;
  for (let i = st.f.length - 1; i >= 0; i--) {
    const f = st.f[i];
    if (f.w < since) break;
    if (q.kind && f.kind !== q.kind) continue;
    if (q.kinds && !q.kinds.includes(f.kind)) continue;
    if (q.tag && !f.tags.includes(q.tag)) continue;
    if (q.minSev && f.severity < q.minSev) continue;
    if (vis && !vis.includes(f.visibility)) continue;
    if (q.notSecret && f.visibility === 'secret') continue;
    if (who && !f.actors.includes(who)) continue;
    if (q.place && f.place !== q.place) continue;
    out.push(f);
    if (q.limit && out.length >= q.limit) break;
  }
  return out;
}

/** Fatos em que alguém aparece (pessoa, ato, selo, 'player' ou chave persona13). Pessoa inclui o ato atual
 *  quando `withAct` (ex.: escândalo da banda aparece na página do vocalista). */
export function factsAbout(s: GameState, id: string, o: { limit?: number; withAct?: boolean; notSecret?: boolean } = {}): Fact[] {
  const k = actorId(id);
  const ids = new Set([k, id]);
  if (o.withAct && s.persons[k]) for (const a of Object.values(s.acts)) if (a.members.includes(k)) ids.add(a.id);
  const out: Fact[] = [];
  const st = facts17(s);
  for (let i = st.f.length - 1; i >= 0 && out.length < (o.limit ?? 30); i--) {
    const f = st.f[i];
    if (o.notSecret && f.visibility === 'secret') continue;
    if (f.actors.some((x) => ids.has(x))) out.push(f);
  }
  return out;
}

export const factById = (s: GameState, id: string): Fact | undefined => facts17(s).f.find((f) => f.id === id);

/** Cadeia de causas (mais antigo por último), até `max` elos. */
export function causeChain(s: GameState, f: Fact, max = 6): Fact[] {
  const out: Fact[] = [];
  let cur: Fact | undefined = f;
  while (cur?.cause?.length && out.length < max) {
    cur = factById(s, cur.cause[0]);
    if (cur) out.push(cur);
  }
  return out;
}

/** Torna um fato mais visível (segredo → boato → público). Nunca rebaixa. */
export function raiseVisibility(f: Fact, v: Visibility): boolean {
  const r = { secret: 0, rumor: 1, public: 2 } as const;
  if (r[v] <= r[f.visibility]) return false;
  f.visibility = v;
  return true;
}

export const VIS_NAME: Record<Visibility, L> = {
  secret: { pt: 'segredo', en: 'secret' },
  rumor: { pt: 'boato', en: 'rumor' },
  public: { pt: 'público', en: 'public' },
};
