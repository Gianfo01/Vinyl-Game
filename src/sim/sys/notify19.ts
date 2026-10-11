// Rodada 19 (Frente 8, P9 + 11.3/11.15) — ORÇAMENTO DE NOTIFICAÇÕES e BOLETIM SEMANAL. Mensagens sem resposta e de baixa
// prioridade (relatórios, mercado, pós-lançamento, trajetória, prestações…) não entram mais uma a
// uma na Caixa: viram linhas de um único "Boletim da semana". Cada categoria tem um orçamento por mês; o excedente vai
// para o boletim. O que pede resposta, o que é urgente (prio ≥ 2) e o que é ruim nunca é engolido.
// Também: carta de continuação perdida (mesa cheia) vira mensagem com prazo (follow19) e o "por quê" do pulso do
// Cockpit (pulse19 → cash.month e cadeia de causas dos fatos: fact19.chain).

import { Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { dec18 } from './decide18';
import { FOLLOW19 } from './echoes18';
import { emitEvent, eventById, ctxParams, resolveDecision } from '../events';
import { registerExt4 } from '../ext4';
import { registerExplain, type WhyPart } from '../explain18';
import { causeChain, factById, recentFacts } from '../facts17';
import { INBOX_ROUTE19, inboxKind18, pushInbox18, registerInboxKind, type InboxCat18, type Push18 } from '../inbox18';
import { noteDeadline19, dropDeadline19 } from '../calendar19';
import type { GameState } from '../types';
import { fmtL, nextId, playerActs } from '../util';
import { addMsg, P, type InboxMsg } from './people/state';

// ---------------------------------------------------------------- regras

/** Sempre no boletim (sem resposta): relatórios e leituras periódicas. */
export const BULLETIN19 = new Set(['review18', 'market18', 'analyst', 'traj18', 'a18_stmt', 'tv18_third', 'regions18']);
/** Itens individuais por categoria por mês (sem resposta, prio ≤ 1); o excedente vai para o boletim. */
export const BUDGET19: Record<InboxCat18, number> = { decision: 3, people: 1, deals: 1, money: 1, press: 1, world: 1, staff: 1, life: 1, analyst: 0, other: 1 };

export interface Ib19State { mk: number; n: Partial<Record<InboxCat18, number>>; ind: number; bul: number; y: Record<number, [number, number]> }
declare module '../ext4' { interface Ext4 { ib19: Ib19State } }
const fresh = (): Ib19State => ({ mk: -1, n: {}, ind: 0, bul: 0, y: {} });
registerExt4('ib19', fresh);
export function ib19(s: GameState): Ib19State {
  const x = s.x4 as unknown as { ib19?: Ib19State };
  const st = (x.ib19 ??= fresh());
  st.n ??= {}; st.y ??= {};
  return st;
}
const yr = (s: GameState, i: 0 | 1) => { const st = ib19(s); const r = (st.y[s.year] ??= [0, 0]); r[i]++; const ks = Object.keys(st.y); if (ks.length > 12) delete st.y[Number(ks[0])]; };

/** Decide se a mensagem vai para o boletim (true) ou entra sozinha. Atualiza o orçamento do mês. */
export function routes19(s: GameState, kind: string, m: Push18): boolean {
  if (kind === 'bulletin19' || m.actions?.length) return false;
  const k = inboxKind18(kind);
  const cat: InboxCat18 = k?.cat ?? 'other';
  const prio = k?.prio ?? 0;
  if (BULLETIN19.has(kind)) return true;
  if (prio >= 2 || m.tone === 'bad') return false;
  const st = ib19(s), mk = s.year * 12 + s.month;
  if (st.mk !== mk) { st.mk = mk; st.n = {}; }
  const used = st.n[cat] ?? 0;
  if (used >= BUDGET19[cat]) return true;
  st.n[cat] = used + 1;
  return false;
}

const clip = (x: string, n = 150) => (x.length > n ? `${x.slice(0, n - 1)}…` : x);
/** Acrescenta uma linha ao boletim desta semana (cria se não houver). */
export function bulletin19(s: GameState, kind: string, m: Push18): InboxMsg {
  const k = inboxKind18(kind);
  const lab = k?.label ?? l('Aviso', 'Notice');
  const line: L = { pt: `• ${lab.pt}: ${m.subject.pt} — ${clip(m.body.pt)}`, en: `• ${lab.en}: ${m.subject.en} — ${clip(m.body.en)}` };
  const st = ib19(s);
  st.bul++; yr(s, 1);
  const cur = P(s).inbox.find((x) => x.ref?.k18 === 'bulletin19' && x.ref.bw === s.week);
  if (cur) {
    nextId(s, 'ib'); // consome o id que a mensagem teria (mantém a sequência de ids — e as sementes derivadas — igual)
    const n = Number(cur.ref!.n ?? 1) + 1;
    cur.ref!.n = n;
    cur.body = { pt: `${cur.body.pt}\n${line.pt}`, en: `${cur.body.en}\n${line.en}` };
    cur.subject = fmtL(l('Boletim da semana ({n} itens)', 'Weekly bulletin ({n} items)'), { n });
    cur.read = false;
    return cur;
  }
  return addMsg(s, { from: l('Boletim', 'Bulletin').pt, subject: l('Boletim da semana (1 item)', 'Weekly bulletin (1 item)'), body: line, kind: 'deal', tone: 'info', ref: { sys: 'k18', k18: 'bulletin19', bw: s.week, n: 1, first: kind } });
}

INBOX_ROUTE19.f = (s, kind, m) => {
  if (routes19(s, kind, m)) return bulletin19(s, kind, m);
  if (kind !== 'bulletin19') { ib19(s).ind++; yr(s, 0); }
  return null;
};

registerInboxKind('bulletin19', { label: l('Boletim semanal', 'Weekly bulletin'), cat: 'analyst', icon: 'newspaper', prio: 0, goto: () => ({ area: 'cockpit' }) });

// ---------------------------------------------------------------- carta perdida → mensagem com prazo (11.15)

/** Continuação que não coube na mesa (6+ cartões): vira mensagem com prazo e entra no calendário. */
export function follow19(s: GameState, id: string, ctx: Record<string, string | number>, weeks = 4): InboxMsg | null {
  const def = eventById[id];
  if (!def) return null;
  let title: L;
  try { title = fmtL(def.title, ctxParams(s, ctx)); } catch { title = def.title; }
  const m = pushInbox18(s, 'follow19', {
    from: l('Mesa de decisões', 'Decision desk').pt,
    subject: fmtL(l('Na fila: {t}', 'Queued: {t}'), { t: title }),
    body: fmtL(l('A mesa está cheia, então "{t}" ficou na fila. Abra quando puder; se o prazo passar, vale a opção padrão do cartão.', 'The desk is full, so "{t}" was queued. Open it when you can; if the deadline passes, the card\'s default option applies.'), { t: title }),
    actions: [{ id: 'open', label: l('Pôr na mesa agora', 'Put it on the desk now') }, { id: 'auto', label: l('Deixar valer o padrão', 'Let the default apply') }],
    weeks, tone: def.tone === 'bad' ? 'bad' : 'info',
    ref: { ev: id, ctx: JSON.stringify(ctx), ...(ctx.act ? { act: ctx.act } : {}), ...(ctx.person ? { person: ctx.person } : {}) },
  });
  noteDeadline19(s, { id: `fol:${m.id}`, w: s.week + weeks, kind: 'decision', t: title, d: l('Carta na fila: sem resposta, vale o padrão.', 'Queued card: unanswered, the default applies.'), tone: 'bad', act: true, goto: { area: 'cockpit' } });
  return m;
}
FOLLOW19.f = (s, id, c) => follow19(s, id, c);
registerInboxKind('follow19', {
  label: l('Carta na fila', 'Queued card'), cat: 'decision', icon: 'clock', prio: 2,
  goto: () => ({ area: 'cockpit' }),
  handle: (s, m, action) => {
    dropDeadline19(s, `fol:${m.id}`);
    const id = String(m.ref?.ev ?? '');
    let ctx: Record<string, string | number> = {};
    try { ctx = JSON.parse(String(m.ref?.ctx ?? '{}')); } catch { /* ctx inválido: segue vazio */ }
    if (!eventById[id]) return l('O assunto já se resolveu.', 'The matter resolved itself.');
    const n = s.decisions.length;
    emitEvent(s, Rng.fromSeed(`${s.config.seed}:fol19:${id}:${m.id}`), id, ctx);
    if (s.decisions.length <= n) return l('Resolvido na hora.', 'Settled on the spot.');
    if (action === 'open') return l('O cartão está na mesa de decisões.', 'The card is on the decision desk.');
    const d = s.decisions[s.decisions.length - 1];
    resolveDecision(s, d.id, d.defaultOption);
    return l('Valeu a opção padrão.', 'The default option applied.');
  },
});

// ---------------------------------------------------------------- pulso do Cockpit: ▲▼ abre a cadeia de causas

registerExplain('fact19.chain', (s, c) => {
  const f = factById(s, String(c.f ?? ''));
  if (!f) return null;
  const ch = causeChain(s, f, 6);
  return {
    title: l('Por que deu nisso?', 'Why did it come to this?'), value: `${f.m + 1}/${f.y}`, fmt: 'text',
    parts: [{ label: f.text, value: '', tone: '' }, ...ch.map((x): WhyPart => ({ label: x.text, value: `${x.m + 1}/${x.y}`, fmt: 'text', note: l('causa', 'cause') }))],
    note: ch.length ? l('Do fato mais recente para a causa mais antiga.', 'From the latest fact back to the oldest cause.') : l('Sem causa registrada: aconteceu por conta própria (ou por um sistema sem rastro).', 'No recorded cause: it happened on its own (or via a system without a trail).'),
  };
});

type PK = 'cash' | 'fans' | 'mood' | 'hits';
const FACTK: Record<PK, string[]> = {
  cash: ['deal', 'release', 'tour_cancel', 'scandal', 'case_ruling', 'label_sold', 'echo', 'show', 'signing', 'exit'],
  fans: ['release', 'chart', 'scandal', 'show', 'boycott', 'statement', 'echo', 'award'],
  mood: ['stress', 'breakdown', 'feud', 'breakup', 'health', 'hold', 'echo', 'situation', 'crunch'],
  hits: ['chart', 'release', 'award'],
};
registerExplain('pulse19', (s, c) => {
  const k = String(c.k ?? 'cash') as PK;
  const pl = dec18(s).pl, L0 = pl.last;
  if (!L0) return null;
  const mine = new Set(['player', ...playerActs(s)]);
  const parts: WhyPart[] = [];
  if (k === 'cash') parts.push({ label: l('Resultado do último mês (por categoria)', 'Last month result (by category)'), value: L0.cash, fmt: 'money', tone: L0.cash >= 0 ? 'good' : 'bad', why: { key: 'cash.month' } });
  if (k === 'fans' || k === 'hits') for (const id of playerActs(s).slice(0, 4)) {
    const a = s.acts[id];
    if (a) parts.push({ label: a.name, value: k === 'fans' ? a.fans.casual + a.fans.active + a.fans.core : `${a.hits} hits`, fmt: k === 'fans' ? 'num' : 'text', why: k === 'fans' ? { key: 'act.fame', ctx: { act: id } } : undefined });
  }
  const sinceW = Math.max(0, pl.w - 5);
  for (const f of recentFacts(s, { sinceWeek: sinceW, kinds: FACTK[k], limit: 40 }).filter((x) => x.visibility !== 'secret' || x.actors.includes('player'))) {
    if (!f.actors.some((a) => mine.has(a) || mine.has(a.replace(/^a:/, '')))) continue;
    parts.push({ label: f.text, value: f.cause?.length ? l('cadeia', 'chain').pt : '', fmt: 'text', tone: f.tags.includes('bad') ? 'bad' : f.tags.includes('good') ? 'good' : '', why: { key: 'fact19.chain', ctx: { f: f.id } } });
    if (parts.length >= 8) break;
  }
  for (const [w, t0, tx, tone] of dec18(s).done) if (w >= sinceW && parts.length < 10) parts.push({ label: tx, value: '', fmt: 'text', tone: tone === 'bad' ? 'bad' : tone === 'good' ? 'good' : '', note: fmtL(l('eco de "{t}"', 'echo of "{t}"'), { t: t0 }) });
  const name: Record<PK, L> = { cash: l('Caixa', 'Cash'), fans: l('Fãs', 'Fans'), mood: l('Humor do elenco', 'Roster mood'), hits: l('Nas paradas', 'Charting') };
  return {
    title: fmtL(l('{k}: o que mudou no mês', '{k}: what changed this month'), { k: name[k] }), value: L0[k], fmt: k === 'cash' ? 'money' : 'signed', parts,
    note: l('Cada fato com › abre a cadeia de causas (o que levou a ele).', 'Each fact with › opens its cause chain (what led to it).'),
  };
});
