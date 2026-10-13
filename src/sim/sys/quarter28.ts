// Rodada 28 (Fase 8, C3/I25) — UMA DECISÃO QUE IMPORTA POR TRIMESTRE + DELEGAÇÃO LIDA PELO MESTRE.
//  • Ritmo: o Mestre conta as decisões que chegaram a você no trimestre (cartas de evento e mensagens da Caixa com
//    resposta). Trimestre VAZIO → no fechamento ele põe na mesa UMA decisão com peso (a "decisão do trimestre"), lida
//    do estado: contrato do seu principal artista vencendo (renovar agora com aumento / negociar depois / deixar sair),
//    ou o foco do trimestre do principal artista (estrada: caixa agora e cansaço; estúdio: momento e moral; descanso:
//    cansaço cai, momento cai). Trimestre SUFOCANTE (≥ 14 decisões) → o trimestre seguinte abre menos fios seus no
//    Mestre (dm18). Antes havia meses vazios e meses com 20 cartas (análise C3/I25).
//  • Delegação: o Mestre lê o quanto você delegou — carreiras com diretor ("Delegada" na agenda17) e objetivos de
//    política por artista (policy18). Com frentes delegadas ele abre menos fios do jogador ao mesmo tempo (4 → 3 → 2), e
//    a decisão do trimestre de um artista delegado é tomada pelo diretor pelo objetivo (crescer → estúdio, dar lucro →
//    estrada, descanso → descanso) e chega como relatório, sem pedir resposta.
// Determinístico: só lê estado (nenhum sorteio).

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { pushInbox18, registerInboxKind } from '../inbox18';
import type { Act, GameState } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { invOf } from './agenda17';
import { careers } from './careers12';
import { DM_MINE18 } from './dm18';
import { pol18, type Goal18 } from './policy18';
import { P } from './people/state';

export type Focus28 = 'road' | 'studio' | 'rest';
export type QKind28 = 'focus' | 'renew';
export interface Q28 { q: number; n: number; made?: QKind28; auto?: string }
export interface Quarter28State { lastW: number; cur: Q28; hist: Q28[]; quiet?: number }
declare module '../ext4' { interface Ext4 { q28: Quarter28State } }
const qOf = (s: GameState): number => s.year * 4 + Math.floor(s.month / 3);
const fresh = (): Quarter28State => ({ lastW: 0, cur: { q: 0, n: 0 }, hist: [] });
registerExt4('q28', fresh);
export function q28(s: GameState): Quarter28State { const x = s.x4 as unknown as { q28?: Quarter28State }; const st = (x.q28 ??= fresh()); st.hist ??= []; st.cur ??= { q: qOf(s), n: 0 }; return st; }
export const OFF_Q28: { on?: boolean } = {};
export const BUSY28 = 14;

// ---------------------------------------------------------------- delegação lida pelo Mestre

/** Fração das frentes delegadas (0..1): carreiras com diretor + artistas com objetivo de política. */
export function delegShare28(s: GameState): number {
  const act = careers(s).active ?? [];
  const dc = act.filter((id) => invOf(s, id) === 'deleg').length;
  const mine = playerActs(s);
  const goals = pol18(s).goals ?? {};
  const da = mine.filter((id) => goals[id] !== undefined).length;
  const tot = act.length + mine.length;
  return tot ? (dc + da) / tot : 0;
}
/** Teto de fios do jogador no Mestre: 4, menos com delegação e depois de trimestre sufocante. */
export function mineCap28(s: GameState): number {
  const d = delegShare28(s);
  const busy = (q28(s).quiet ?? -1) === qOf(s);
  return Math.max(1, 4 - (d >= 0.66 ? 2 : d >= 0.33 ? 1 : 0) - (busy ? 1 : 0));
}
DM_MINE18.f = (s) => (OFF_Q28.on ? 4 : mineCap28(s));

/** O artista está delegado? (diretor na carreira do seu papel, ou objetivo de política definido para ele) */
export function delegated28(s: GameState, a: Act): boolean {
  return ['label', 'manager'].some((id) => (careers(s).active ?? []).includes(id) && invOf(s, id) === 'deleg') || pol18(s).goals?.[a.id] !== undefined;
}
const GOAL_FOCUS: Record<Goal18, Focus28 | null> = { grow: 'studio', profit: 'road', rest: 'rest', catalog: 'studio', free: null };

// ---------------------------------------------------------------- a decisão do trimestre

const top = (s: GameState): Act | undefined => playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'split' && a.status !== 'retired').sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1))[0];
const tiredOf = (s: GameState, a: Act): number => { const ps = a.members.map((id) => s.persons[id]).filter((p) => p?.alive); return ps.length ? ps.reduce((t, p) => t + (p.fatigue ?? 0), 0) / ps.length : 0; };
const roadPay = (s: GameState, a: Act): number => money(s, 600 + a.fame * 90);

export const FOCUS28: Record<Focus28, { label: L; hint: L }> = {
  road: { label: l('Estrada: shows o trimestre todo', 'Road: shows all quarter'), hint: l('caixa agora (cachês), +3% fãs casuais, +15 cansaço', 'cash now (fees), +3% casual fans, +15 fatigue') },
  studio: { label: l('Estúdio: compor e gravar', 'Studio: write and record'), hint: l('+5 momento, +4 moral, sem receita', '+5 momentum, +4 morale, no revenue') },
  rest: { label: l('Descanso', 'Rest'), hint: l('−25 cansaço, +5 moral, −3 momento', '−25 fatigue, +5 morale, −3 momentum') },
};
/** Aplica o foco (resposta da Caixa ou escolha do diretor). */
export function applyFocus28(s: GameState, actId: string, f: Focus28): L {
  const a = s.acts[actId];
  if (!a) return l('O artista já não está no selo.', 'The artist is no longer with the label.');
  const mem = a.members.map((id) => s.persons[id]).filter((p) => p?.alive && !p.isPlayer);
  if (f === 'road') {
    const v = roadPay(s, a);
    post(s, `q28:road:${actId}:${s.week}`, v, 'live', `Trimestre na estrada: ${a.name}`);
    a.fans.casual = Math.round(a.fans.casual * 1.03);
    for (const p of mem) p.fatigue = clamp((p.fatigue ?? 0) + 15, 0, 100);
    return fmtL(l('{a} passa o trimestre na estrada: {v} em cachês e gente nova na plateia.', '{a} spends the quarter on the road: {v} in fees and new faces in the crowd.'), { a: a.name, v: `$${Math.round(v / 100).toLocaleString('en-US')}` });
  }
  if (f === 'studio') {
    a.momentum = clamp(a.momentum + 5, 0, 100);
    for (const p of mem) p.morale = clamp((p.morale ?? 50) + 4, 0, 100);
    return fmtL(l('{a} se tranca no estúdio: músicas novas e a banda animada.', '{a} locks themselves in the studio: new songs and a fired-up band.'), { a: a.name });
  }
  for (const p of mem) { p.fatigue = clamp((p.fatigue ?? 0) - 25, 0, 100); p.morale = clamp((p.morale ?? 50) + 5, 0, 100); }
  a.momentum = clamp(a.momentum - 3, 0, 100);
  return fmtL(l('{a} descansa. O público esquece um pouco; a banda agradece.', '{a} rests. The public forgets a little; the band is grateful.'), { a: a.name });
}
/** Renovação antecipada (aumento de 3 pontos de royalty, +12 meses, confiança). */
export function renew28(s: GameState, actId: string, how: 'now' | 'later' | 'let'): L {
  const a = s.acts[actId], c = a?.contractId ? s.contracts[a.contractId] : undefined;
  if (!a || !c) return l('Não há contrato para renovar.', 'There is no contract to renew.');
  if (how === 'now') {
    c.royalty = Math.min(0.5, c.royalty + 0.03);
    c.endWeek = (c.endWeek ?? s.week) + 52;
    a.trust = clamp(a.trust + 8, 0, 100);
    return fmtL(l('Renovado com {a} por mais um ano, com aumento. A confiança sobe.', 'Renewed with {a} for another year, with a raise. Trust goes up.'), { a: a.name });
  }
  if (how === 'later') { a.trust = clamp(a.trust - 2, 0, 100); return fmtL(l('A conversa com {a} fica para depois. O empresário anota.', 'The talk with {a} is postponed. The manager takes note.'), { a: a.name }); }
  a.trust = clamp(a.trust - 6, 0, 100);
  return fmtL(l('Você avisa que não vai renovar com {a}. O fim do contrato segue o calendário.', 'You tell {a} you won\'t renew. The contract ends on schedule.'), { a: a.name });
}

registerInboxKind('q28', { label: l('Decisão do trimestre', 'Quarter decision'), cat: 'decision', icon: 'star', prio: 3, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, action) => {
    const id = String(m.ref?.act ?? '');
    if (m.ref?.q28 === 'renew') return renew28(s, id, action as 'now' | 'later' | 'let');
    return applyFocus28(s, id, action as Focus28);
  } });

/** Monta a decisão do trimestre (ou o relatório do diretor, se delegado). Exportada para testes. */
export function makeDecision28(s: GameState): QKind28 | null {
  const a = top(s);
  if (!a) return null;
  const st = q28(s);
  const c = a.contractId ? s.contracts[a.contractId] : undefined;
  const ends = c?.endWeek !== undefined ? c.endWeek - s.week : 999;
  if (c && ends > 0 && ends <= 26 && !a.playerBand) {
    if (delegated28(s, a)) { const t = renew28(s, a.id, a.trust >= 40 ? 'now' : 'later'); st.cur.auto = t.pt; report(s, a, t); return 'renew'; }
    pushInbox18(s, 'q28', { from: l('Mestre', 'Game master').pt, tone: 'info', subject: fmtL(l('Decisão do trimestre: o contrato de {a} vence em {m} meses', 'Quarter decision: {a}\'s contract ends in {m} months'), { a: a.name, m: Math.max(1, Math.round(ends / 4.33)) }),
      body: fmtL(l('{a} é o seu principal artista (fama {f}, confiança {t}). Renovar agora custa 3 pontos de royalty e garante mais um ano; deixar para depois irrita um pouco; não renovar libera o artista no fim do prazo.', '{a} is your top artist (fame {f}, trust {t}). Renewing now costs 3 royalty points and secures another year; postponing annoys them a little; not renewing frees them when the term ends.'), { a: a.name, f: Math.round(a.fame), t: Math.round(a.trust) }),
      ref: { act: a.id, q28: 'renew' }, weeks: 6,
      actions: [{ id: 'now', label: l('Renovar agora com aumento', 'Renew now with a raise') }, { id: 'let', label: l('Não renovar', 'Don\'t renew') }, { id: 'later', label: l('Deixar para depois', 'Postpone') }] });
    return 'renew';
  }
  const tired = tiredOf(s, a);
  if (delegated28(s, a)) {
    const f = GOAL_FOCUS[pol18(s).goals?.[a.id] ?? 'grow'] ?? (tired >= 60 ? 'rest' : 'studio');
    const t = applyFocus28(s, a.id, tired >= 75 ? 'rest' : f);
    st.cur.auto = t.pt; report(s, a, t);
    return 'focus';
  }
  pushInbox18(s, 'q28', { from: l('Mestre', 'Game master').pt, tone: 'info', subject: fmtL(l('Decisão do trimestre: o foco de {a}', 'Quarter decision: {a}\'s focus'), { a: a.name }),
    body: fmtL(l('Trimestre sem grandes decisões. Para onde vai {a} nos próximos três meses? Cansaço médio da banda: {c}. Estrada: {r}.', 'A quarter without big decisions. Where does {a} go for the next three months? Band\'s average fatigue: {c}. Road: {r}.'), { a: a.name, c: Math.round(tired), r: `$${Math.round(roadPay(s, a) / 100).toLocaleString('en-US')}` }),
    ref: { act: a.id, q28: 'focus' }, weeks: 6,
    // o último botão é o padrão quando a mensagem expira: o mais sensato para o estado da banda
    actions: (tired >= 60 ? ['road', 'studio', 'rest'] as Focus28[] : ['road', 'rest', 'studio'] as Focus28[]).map((k) => ({ id: k, label: l(`${FOCUS28[k].label.pt} (${FOCUS28[k].hint.pt})`, `${FOCUS28[k].label.en} (${FOCUS28[k].hint.en})`) })) });
  return 'focus';
}
function report(s: GameState, a: Act, t: L): void {
  pushInbox18(s, 'q28', { from: l('Diretor (delegado)', 'Director (delegated)').pt, tone: 'info', subject: fmtL(l('Relatório do trimestre: {a}', 'Quarter report: {a}'), { a: a.name }),
    body: fmtL(l('Você delegou esta frente; o diretor decidiu pelo objetivo combinado. {t}', 'You delegated this front; the director decided by the agreed goal. {t}'), { t }) });
}

/** Conta as decisões que chegaram desde o último mês (cartas de evento + mensagens com resposta, exceto as do próprio quarter28). */
export function countNew28(s: GameState, since: number): number {
  const ib = P(s).inbox.filter((m) => m.week > since && !!m.actions?.length && m.ref?.k18 !== 'q28').length;
  const ev = s.decisions.filter((d) => d.week > since).length;
  return ib + ev;
}

export function quarterMonth28(s: GameState): void {
  if (OFF_Q28.on) return;
  const st = q28(s);
  const q = qOf(s);
  if (st.cur.q !== q) { st.cur = { q, n: 0 }; }
  st.cur.n += countNew28(s, st.lastW);
  st.lastW = s.week;
  if (s.month % 3 !== 2) return; // fecha o trimestre no último mês
  if (st.cur.n === 0 && !st.cur.made) st.cur.made = makeDecision28(s) ?? undefined;
  if (st.cur.n >= BUSY28) st.quiet = q + 1;
  st.hist.unshift({ ...st.cur });
  if (st.hist.length > 16) st.hist.length = 16;
}
registerSimHook('month', 'q28', (s) => quarterMonth28(s));
