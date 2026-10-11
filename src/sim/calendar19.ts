// Rodada 19 (Frente 8, P2) — CALENDÁRIO ÚNICO DE PRAZOS. Todo compromisso com data (cartão com prazo, janela de eco,
// opção/fim de contrato, cláusula, prestação de contas, lançamento, fila da fábrica, turnê, festival, obra, tribunal,
// parcela de empréstimo, prêmio, mensagem que vence) entra num só lugar. Puro (sem DOM); os provedores de cada sistema
// ficam em sys/calendar19.ts e a interface (faixa de 6 semanas no Cockpit + página "Calendário") em ui/sys/calendar19.ts.
//
//   registerDeadline('meu19', (s, from, to) => [{ id: 'x1', w: s.week + 3, kind: 'contract', t: l('Opção de X', 'X option'), tone: 'bad', goto: { area: 'artists' } }]);
//   calendar19(s, { weeks: 6 })          // → Deadline19[] ordenado por semana (e por risco)
//   noteDeadline19(s, { ... })           // prazo avulso guardado no save (sistemas sem estado próprio de data)

import type { L } from '../data/world';
import { registerExt4 } from './ext4';
import type { Goto18 } from './inbox18';
import type { GameState } from './types';
import { dayOfDate } from './util';

export type CalKind19 = 'decision' | 'echo' | 'msg' | 'contract' | 'clause' | 'money' | 'release' | 'supply' | 'tour' | 'festival' | 'build' | 'court' | 'award' | 'other';
export interface Deadline19 {
  /** único entre provedores (prefixe com o id do provedor) */
  id: string;
  /** semana absoluta do prazo (ou fim da janela) */
  w: number;
  /** início da janela (ecos: "entre a semana X e Y"); ausente = data exata */
  w0?: number;
  kind: CalKind19;
  t: L;
  /** detalhe curto (o que acontece se passar) */
  d?: L;
  tone?: 'bad' | 'good' | 'info';
  goto?: Goto18;
  /** pede ação do jogador (senão é só aviso) */
  act?: boolean;
}
export type DeadlineFn19 = (s: GameState, from: number, to: number) => Deadline19[];
const PROV: { id: string; fn: DeadlineFn19 }[] = [];
/** Registra (ou substitui) um provedor de prazos. */
export function registerDeadline(id: string, fn: DeadlineFn19): void {
  const i = PROV.findIndex((x) => x.id === id);
  if (i >= 0) PROV[i] = { id, fn }; else PROV.push({ id, fn });
}
export const deadlineProviders19 = (): string[] => PROV.map((x) => x.id);

export const CAL19_ICON: Record<CalKind19, string> = {
  decision: '⏱', echo: '↩', msg: '✉', contract: '✍', clause: '§', money: '$', release: '💿', supply: '🏭', tour: '🚐', festival: '🎪', build: '🏗', court: '⚖', award: '🏅', other: '◆',
};

// ---------------------------------------------------------------- prazos avulsos (no save)

export interface Cal19State { n: Deadline19[] }
declare module './ext4' { interface Ext4 { cal19: Cal19State } }
const fresh = (): Cal19State => ({ n: [] });
registerExt4('cal19', fresh);
export function cal19(s: GameState): Cal19State {
  const x = s.x4 as unknown as { cal19?: Cal19State };
  const st = (x.cal19 ??= fresh());
  st.n ??= [];
  return st;
}
/** Guarda um prazo avulso (substitui pelo id). Some sozinho uma semana depois de vencer. */
export function noteDeadline19(s: GameState, d: Deadline19): void {
  const st = cal19(s);
  st.n = st.n.filter((x) => x.id !== d.id && x.w >= s.week - 1);
  st.n.push(d);
  if (st.n.length > 60) st.n.splice(0, st.n.length - 60);
}
export function dropDeadline19(s: GameState, id: string): void { const st = cal19(s); st.n = st.n.filter((x) => x.id !== id); }
registerDeadline('note19', (s, from, to) => cal19(s).n.filter((d) => d.w >= from && (d.w0 ?? d.w) <= to));

// ---------------------------------------------------------------- leitura

const RISK: Record<string, number> = { bad: 0, info: 1, good: 2 };
/** O calendário inteiro na janela [semana atual, +weeks]. Nunca lança (provedor com erro fica de fora). */
export function calendar19(s: GameState, o: { weeks?: number; from?: number; kinds?: CalKind19[] } = {}): Deadline19[] {
  const from = o.from ?? s.week, to = from + (o.weeks ?? 26);
  const out: Deadline19[] = [];
  const seen = new Set<string>();
  for (const p of PROV) {
    let xs: Deadline19[] = [];
    try { xs = p.fn(s, from, to); } catch { /* provedor quebrado não derruba o calendário */ }
    for (const d of xs) {
      if (!d || !Number.isFinite(d.w) || seen.has(d.id)) continue;
      if (d.w < from || (d.w0 ?? d.w) > to) continue;
      if (o.kinds && !o.kinds.includes(d.kind)) continue;
      seen.add(d.id);
      out.push(d);
    }
  }
  return out.sort((a, b) => a.w - b.w || (RISK[a.tone ?? 'info'] - RISK[b.tone ?? 'info']) || (a.act === b.act ? 0 : a.act ? -1 : 1));
}
/** Semana absoluta em que começa um mês do jogo. */
export const weekOfMonth19 = (s: GameState, year: number, month: number): number => Math.floor(dayOfDate(s.config.startYear, year, month) / 7);
/** Próxima ocorrência (semana) de um mês do ano (0–11), a partir de agora. */
export function nextMonthWeek19(s: GameState, month: number): number {
  const y = month > s.month || (month === s.month && weekOfMonth19(s, s.year, month) >= s.week) ? s.year : s.year + 1;
  return weekOfMonth19(s, y, month);
}
/** Semanas com acúmulo (≥ n prazos que pedem ação) — usado pelo aviso de "semana apertada". */
export function crunch19(s: GameState, weeks = 6, n = 3): { w: number; items: Deadline19[] }[] {
  const by = new Map<number, Deadline19[]>();
  for (const d of calendar19(s, { weeks })) if (d.act && d.w0 === undefined) by.set(d.w, [...(by.get(d.w) ?? []), d]);
  return [...by.entries()].filter(([, v]) => v.length >= n).map(([w, items]) => ({ w, items })).sort((a, b) => a.w - b.w);
}
