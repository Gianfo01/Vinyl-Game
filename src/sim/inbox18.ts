// Rodada 18 (U2) — Inbox 2.0 e Conselheiro v2 (API leve, sem ciclo de import). Sistemas registram TIPOS de
// mensagem (categoria, prioridade, "ir para", tratador da resposta) e DICAS do conselheiro/analista (com o porquê,
// efeito estimado e ações sugeridas). A interface (src/ui/sys/inbox18.ts) junta tudo no Cockpit.
//
//   registerInboxKind('radio_payola', { label: l('Rádio', 'Radio'), cat: 'deals', prio: 2,
//     goto: (s, m) => ({ area: 'media' }), handle: (s, m, action) => l('Feito.', 'Done.') });
//   pushInbox18(s, 'radio_payola', { from: 'DJ Joe', subject: l(...), body: l(...), actions: [{ id: 'pay', label: l('Pagar', 'Pay') }, { id: 'no', label: l('Recusar', 'Refuse') }] });
//   registerAdvisorTip('cash18', (s) => [{ id: 'runway', level: 'warn', text: l(...), why: [l(...)], effect: l('+$2k/mês', '+$2k/mo'), goto: { area: 'finance' } }]);

import type { Rng } from '../core/rng';
import type { L } from '../data/world';
import { registerExt4 } from './ext4';
import { addMsg, type InboxMsg } from './sys/people/state';
import type { GameState } from './types';

export type InboxCat18 = 'decision' | 'people' | 'deals' | 'money' | 'press' | 'world' | 'staff' | 'life' | 'analyst' | 'other';
/** Destino de um "ir para": área (com aba), ato ou pessoa (chave persona13: 'p:id', 'l:id', 'e:id'…). */
export interface Goto18 { area?: string; tab?: [string, string]; act?: string; person?: string; label?: L }
export interface InboxKind18 {
  label: L;
  cat: InboxCat18;
  icon?: string;
  /** 0 (baixa) – 3 (urgente); mensagens com resposta pendente ganham +1 */
  prio?: number;
  goto?: (s: GameState, m: InboxMsg) => Goto18 | null;
  /** resposta do jogador (o último botão é o padrão quando a mensagem expira) */
  handle?: (s: GameState, m: InboxMsg, action: string, r: Rng) => L;
}
const KINDS: Record<string, InboxKind18> = {};
export function registerInboxKind(kind: string, def: InboxKind18): void { KINDS[kind] = def; }
export const inboxKind18 = (kind: string): InboxKind18 | undefined => KINDS[kind];
export const inboxKinds18 = (): string[] => Object.keys(KINDS);

export interface Push18 {
  from: string;
  subject: L;
  body: L;
  actions?: { id: string; label: L }[];
  ref?: Record<string, string | number>;
  tone?: 'good' | 'bad' | 'info';
  /** semanas até expirar (padrão 6 quando há ações) */
  weeks?: number;
}
/** Manda uma mensagem tipada para a caixa de entrada. */
export function pushInbox18(s: GameState, kind: string, m: Push18): InboxMsg {
  return addMsg(s, {
    from: m.from, subject: m.subject, body: m.body, kind: 'deal', tone: m.tone ?? 'info', actions: m.actions,
    expires: m.actions?.length ? s.week + (m.weeks ?? 6) : undefined,
    ref: { ...(m.ref ?? {}), sys: 'k18', k18: kind },
  });
}

// ---------------------------------------------------------------- conselheiro / analista

export type TipLevel18 = 'bad' | 'warn' | 'info' | 'good';
export interface AdvTip18 {
  id: string;
  level: TipLevel18;
  text: L;
  /** por quê (lista curta) */
  why?: L[];
  /** efeito estimado da sugestão ("+4 moral, −$2k") */
  effect?: L;
  /** prioridade fina (maior primeiro); padrão pelo nível */
  score?: number;
  cat?: 'cash' | 'release' | 'rival' | 'opportunity' | 'people' | 'career' | 'other';
  goto?: Goto18;
  /** ação direta (executa e devolve o texto do resultado) */
  run?: { label: L; fn: (s: GameState) => L };
}
const TIPS: { id: string; fn: (s: GameState) => AdvTip18[] }[] = [];
export function registerAdvisorTip(id: string, fn: (s: GameState) => AdvTip18[]): void {
  const i = TIPS.findIndex((x) => x.id === id);
  if (i >= 0) TIPS[i] = { id, fn }; else TIPS.push({ id, fn });
}
const LV: Record<TipLevel18, number> = { bad: 90, warn: 60, info: 30, good: 20 };
export const tipScore = (t: AdvTip18): number => t.score ?? LV[t.level];
/** Todas as dicas registradas, em ranking (sem limite: a interface mostra 7 e "ver mais"). */
export function advisorTips18(s: GameState): AdvTip18[] {
  const out: AdvTip18[] = [];
  for (const t of TIPS) { try { out.push(...t.fn(s)); } catch { /* dica com erro não derruba a mesa */ } }
  const seen = new Set<string>();
  return out.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true))).sort((a, b) => tipScore(b) - tipScore(a));
}

// ---------------------------------------------------------------- estado (arquivo, adiamento)

export interface Inbox18State { arch: Record<string, number>; snooze: Record<string, number>; rep: number }
declare module './ext4' { interface Ext4 { inbox18: Inbox18State } }
const fresh = (): Inbox18State => ({ arch: {}, snooze: {}, rep: -1 });
registerExt4('inbox18', fresh);
export function ib18(s: GameState): Inbox18State {
  const x = s.x4 as unknown as { inbox18?: Inbox18State };
  const st = (x.inbox18 ??= fresh());
  st.arch ??= {}; st.snooze ??= {};
  return st;
}
export function archive18(s: GameState, key: string, on = true): void {
  const a = ib18(s).arch;
  if (on) a[key] = s.week; else delete a[key];
  const ks = Object.keys(a);
  if (ks.length > 300) for (const k of ks.sort((x, y) => a[x] - a[y]).slice(0, ks.length - 300)) delete a[k];
}
export const isArchived18 = (s: GameState, key: string): boolean => ib18(s).arch[key] !== undefined;
/** Adia uma dica do conselheiro por n semanas. */
export function snoozeTip18(s: GameState, id: string, weeks = 8): void { ib18(s).snooze[id] = s.week + weeks; }
export const snoozed18 = (s: GameState, id: string): boolean => (ib18(s).snooze[id] ?? -1) > s.week;
