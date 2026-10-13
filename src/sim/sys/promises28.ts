// Rodada 28 (fase 5, C7) — PROMESSAS COM VERBA, PRAZO E MULTA. A promessa de contrato (turnê, prioridade de
// lançamento, liberdade) deixa de ser só uma frase que vira "cumpriu / não cumpriu":
//   • verba comprometida: turnê e prioridade separam caixa (sai do caixa LIVRE — oblig20) até cumprir ou vencer;
//   • prazo: o mesmo de sempre (turnê 26 semanas, prioridade 52, liberdade = o contrato todo);
//   • multa: descumprir paga multa ao artista (vai para o caixa dele) além da confiança/reputação de sempre.
// Cumprir antes do prazo libera a verba na hora (vira apoio de turnê/marketing do ato: embalo e público).
// Sem caixa para a verba quando a promessa se cumpre = promessa quebrada (paga a multa se der).
// O gancho semanal só lê contratos do jogador com promessa aberta; puro e sem sorte (determinístico).

import { toReal } from '../../core/money';
import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { expectedAdvance } from '../contracts';
import { registerSimHook } from '../ext4';
import { registerReserve20 } from '../oblig20';
import type { Act, Contract, ContractPromise, GameState } from '../types';
import { fmtL, money, notify, post } from '../util';

export type PromKind28 = ContractPromise['kind'];

export const PROM28_NAME: Record<PromKind28, L> = {
  tour: l('Turnê', 'Tour'), priority: l('Prioridade de lançamento', 'Release priority'), freedom: l('Liberdade criativa', 'Creative freedom'),
};
export const PROM28_GOAL: Record<PromKind28, L> = {
  tour: l('levar o ato em turnê (turnê do selo ou 6 semanas de shows)', 'take the act on tour (a label tour or 6 weeks of gigs)'),
  priority: l('lançar um disco do ato', 'release a record by the act'),
  freedom: l('manter o controle criativo com o artista', 'keep creative control with the artist'),
};

export interface PromTerms28 { budget: number; penalty: number; weeks: number }

/** Verba, multa e prazo de uma promessa para este ato (centavos do ano). */
export function promiseTerms28(s: GameState, act: Act, kind: PromKind28, termWeeks = 156): PromTerms28 {
  const exp = expectedAdvance(s, act);
  const r100 = (v: number) => Math.round(v / 100) * 100;
  if (kind === 'tour') { const b = r100(money(s, exp * 0.35)); return { budget: b, penalty: r100(b * 0.6), weeks: 26 }; }
  if (kind === 'priority') { const b = r100(money(s, exp * 0.3)); return { budget: b, penalty: r100(b * 0.6), weeks: 52 }; }
  return { budget: 0, penalty: r100(money(s, exp * 0.25)), weeks: termWeeks };
}

interface Prom28State { penalties: number; kept: number; broken: number; early: number }
export function prom28(s: GameState): Prom28State {
  const x = s.x4 as unknown as Record<string, unknown>;
  const st = (x.prom28 ??= { penalties: 0, kept: 0, broken: 0, early: 0 }) as Prom28State;
  return st;
}

/** Preenche verba/multa de promessas antigas ou criadas por caminhos que não passam por aqui. */
export function armPromises28(s: GameState, c: Contract): void {
  const act = s.acts[c.actId];
  if (!act) return;
  for (const p of c.promises) {
    if (p.budget !== undefined || p.kept !== undefined) continue;
    const t = promiseTerms28(s, act, p.kind, Math.max(1, c.endWeek - c.startWeek));
    p.budget = t.budget;
    p.penalty = t.penalty;
    p.spent = 0;
  }
}

/** Promessa aberta (sem desfecho) de contrato vigente do jogador. */
const openP = (s: GameState, c: Contract, p: ContractPromise) => c.party === 'player' && c.endWeek >= s.week && p.kept === undefined;

/** Caixa comprometido com promessas ainda abertas (sai do caixa livre). */
export function committed28(s: GameState): number {
  let t = 0;
  for (const c of Object.values(s.contracts)) {
    if (c.party !== 'player' || c.endWeek < s.week || !c.promises.length) continue;
    for (const p of c.promises) if (openP(s, c, p)) t += Math.max(0, (p.budget ?? 0) - (p.spent ?? 0));
  }
  return t;
}

/** Semanas com shows pela agenda que valem como turnê cumprida (sem turnê planejada). */
export const TOUR_GIG_WEEKS28 = 6;

/** A condição da promessa já foi atendida? (mesma regra de sempre do checkPromises) */
export function promiseMet28(s: GameState, c: Contract, act: Act, p: ContractPromise): boolean {
  if (p.kind === 'priority') return act.releases.some((rid) => s.releases[rid] && s.releases[rid].week >= c.startWeek);
  // r28: turnê de verdade — uma turnê do selo (planejada depois da assinatura e já na estrada ou encerrada) ou estrada
  // contínua pela agenda (6+ semanas com shows). Antes, uma única semana de show de bar da agenda automática já
  // "cumpria" a turnê na semana seguinte à assinatura (a sonda "promete e não cumpre" nunca quebrava nada).
  if (p.kind === 'tour') {
    if (s.memory.some((m) => m.actId === act.id && m.kind === 'tour_done' && m.week >= c.startWeek)) return true;
    if (s.memory.some((m) => m.actId === act.id && m.kind === 'tour_planned' && m.week >= c.startWeek) && s.tours.some((t) => t.actId === act.id && t.status === 'running' && t.stops.some((x) => x.status === 'played'))) return true;
    return act.history.length > 0 && s.memory.filter((m) => m.actId === act.id && m.kind === 'gigs' && m.week >= c.startWeek).length >= TOUR_GIG_WEEKS28;
  }
  return c.creativeControl;
}

/** Fecha a promessa: cumprida → gasta o resto da verba (apoio ao ato); sem caixa ou descumprida → multa.
 *  Devolve se ficou cumprida. Não mexe em confiança/reputação (isso é do checkPromises). */
export function settlePromise28(s: GameState, c: Contract, act: Act, p: ContractPromise, kept: boolean): boolean {
  armPromises28(s, c);
  const st = prom28(s);
  const left = Math.max(0, (p.budget ?? 0) - (p.spent ?? 0));
  if (kept && left > 0) {
    if (s.player.cash < left) kept = false;
    else {
      post(s, `prom28:${c.id}:${p.kind}`, -left, p.kind === 'tour' ? 'live_costs' : 'marketing', `Verba prometida (${PROM28_NAME[p.kind].pt}) ${act.name}`);
      p.spent = (p.spent ?? 0) + left;
      const x = toReal(left, s.year) / Math.max(1, expectedAdvance(s, act));
      act.momentum = clamp(act.momentum + x * 8, 0, 100);
      act.fans.casual += Math.round(x * (p.kind === 'tour' ? 900 : 500));
      if (p.kind === 'priority') act.fame = clamp(act.fame + x * 1.2 * (1 - act.fame / 100), 0, 100);
    }
  }
  if (kept) st.kept += 1;
  else {
    st.broken += 1;
    const pen = Math.min(p.penalty ?? 0, Math.max(0, s.player.cash));
    if (pen > 0 && !p.paidPenalty) {
      post(s, `prom28pen:${c.id}:${p.kind}`, -pen, 'legal', `Multa por promessa quebrada ${act.name}`);
      act.cash += pen;
      st.penalties += pen;
      p.paidPenalty = pen;
    }
  }
  return kept;
}

/** Semanal: arma promessas novas e cumpre antes do prazo as que já foram atendidas (libera a verba). */
export function tickPromises28(s: GameState): void {
  for (const c of Object.values(s.contracts)) {
    if (c.party !== 'player' || c.endWeek < s.week || !c.promises.length) continue;
    const act = s.acts[c.actId];
    if (!act) continue;
    armPromises28(s, c);
    for (const p of c.promises) {
      if (!openP(s, c, p) || p.kind === 'freedom' || s.week >= p.dueWeek) continue; // no prazo, o checkPromises decide
      if (!promiseMet28(s, c, act, p)) continue;
      if (s.player.cash < Math.max(0, (p.budget ?? 0) - (p.spent ?? 0))) continue; // sem caixa agora: tenta de novo até o prazo
      settlePromise28(s, c, act, p, true);
      p.kept = true;
      prom28(s).early += 1;
      act.trust = clamp(act.trust + 6, 0, 100);
      notify(s, fmtL(l('Promessa a {a} cumprida ({k}): a verba virou apoio.', 'Promise to {a} kept ({k}): the budget became support.'), { a: act.name, k: PROM28_NAME[p.kind] }), 'good');
    }
  }
}

/** Linhas para a interface (ficha do ato e Cockpit). */
export interface PromRow28 { actId: string; act: string; kind: PromKind28; budget: number; spent: number; penalty: number; dueWeek: number; weeksLeft: number; met: boolean; state: 'open' | 'kept' | 'broken' }
export function promiseRows28(s: GameState, actId?: string): PromRow28[] {
  const out: PromRow28[] = [];
  for (const c of Object.values(s.contracts)) {
    if (c.party !== 'player' || c.endWeek < s.week || !c.promises.length) continue;
    if (actId && c.actId !== actId) continue;
    const act = s.acts[c.actId];
    if (!act || act.contractId !== c.id) continue;
    for (const p of c.promises) {
      const t = p.budget === undefined && p.kept === undefined ? promiseTerms28(s, act, p.kind, c.endWeek - c.startWeek) : null;
      out.push({ actId: act.id, act: act.name, kind: p.kind, budget: t?.budget ?? p.budget ?? 0, spent: p.spent ?? 0, penalty: t?.penalty ?? p.penalty ?? 0,
        dueWeek: p.dueWeek, weeksLeft: p.dueWeek - s.week, met: p.kept === undefined && promiseMet28(s, c, act, p), state: p.kept === undefined ? 'open' : p.kept ? 'kept' : 'broken' });
    }
  }
  return out.sort((a, b) => (a.state === 'open' ? 0 : 1) - (b.state === 'open' ? 0 : 1) || a.dueWeek - b.dueWeek || (a.actId < b.actId ? -1 : 1));
}

registerSimHook('week', 'promises28', (s) => tickPromises28(s));
registerReserve20('prom28', committed28);
