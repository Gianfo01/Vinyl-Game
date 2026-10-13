// Rodada 28 (Fase 8) — REPUTAÇÃO DE SELO NPC NAS OFERTAS + ESCÂNDALO DE FUNDADOR-INSTITUIÇÃO (N25).
//  • Reputação vista pelo artista: o "peso do selo" (offers12.labelClout) passa a descontar o histórico que o mercado
//    comenta — processos contra artistas nos últimos 5 anos (fatos `case_ruling`/`law` com o selo), falências no
//    currículo do CEO (leaders10: empregos que terminaram em 'closed'), dívida maior que o caixa e um escândalo recente do
//    fundador. Cada desconto vira um "contra" no pacote ("processou 2 artistas desde 1984"). Antes a escolha de selo era
//    cega a isso (análise, Top 30 nº 13).
//  • Escândalo do fundador: o fundador de um selo NPC (leaders10 `founder`) pode cair em desgraça — assédio no camarim,
//    desvio de royalties, trainees maltratados (mais provável em selos de ídolos/K-pop e com líderes de risco alto).
//    O selo perde reputação, o elenco perde momento, a imprensa fala do selo (fato `scandal` com o SELO como protagonista,
//    tags `founder`/`institution`) e, por alguns anos, os artistas desse selo ouvem os seus pacotes com outros olhos.
//    Sorteio próprio por selo e mês (Rng.fromSeed), não mexe em nenhum outro fluxo.

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { pushInbox18, registerInboxKind } from '../inbox18';
import type { GameState, Label } from '../types';
import { fmtL, playerActs } from '../util';
import { leaderOf, leaders } from './leaders10';
import { CLOUT_ADJ12, CLOUT_WHY12 } from './clout28';

export type FounderKind28 = 'conduct' | 'money' | 'sex';
export interface LabelRep28 { suits: number[]; founder?: { w: number; y: number; sev: number; kind: FounderKind28; who: string } }
export interface LRep28State { lb: Record<string, LabelRep28>; done: string[] }
declare module '../ext4' { interface Ext4 { lrep28: LRep28State } }
const fresh = (): LRep28State => ({ lb: {}, done: [] });
registerExt4('lrep28', fresh);
export function lrep28(s: GameState): LRep28State {
  const x = s.x4 as unknown as { lrep28?: LRep28State };
  const st = (x.lrep28 ??= fresh());
  st.lb ??= {}; st.done ??= [];
  return st;
}
registerInboxKind('lrep28', { label: l('Escândalo de selo', 'Label scandal'), cat: 'press', prio: 1 });
const rec = (s: GameState, id: string): LabelRep28 => (lrep28(s).lb[id] ??= { suits: [] });
export const OFF_LREP28: { clout?: boolean; founder?: boolean } = {};

// ---------------------------------------------------------------- processos (contador por selo)

function suit(s: GameState, ids: string[]): void {
  for (const id of ids) {
    if (!s.labels[id]) continue;
    const r = rec(s, id);
    if (r.suits[r.suits.length - 1] === s.week) continue;
    r.suits.push(s.week);
    if (r.suits.length > 12) r.suits.shift();
  }
}
onFact('case_ruling', (s, f) => { if (f.tags.includes('lawsuit') || f.tags.includes('law') || f.tags.includes('strike')) suit(s, f.actors); }, 'lrep28:case');
onFact('law', (s, f) => { if (f.tags.includes('ag18')) suit(s, f.actors.map((k) => (k.startsWith('l:') ? leaders(s).L[k.slice(2)]?.label ?? '' : k))); }, 'lrep28:law');

// ---------------------------------------------------------------- leitura (pura)

export interface RepPart28 { k: 'suits' | 'ceo' | 'debt' | 'founder'; v: number; why: L }
/** Descontos da reputação de um selo NPC aos olhos do artista (valores negativos, somam no máximo −0,4). */
export function labelRepParts28(s: GameState, lbId: string): RepPart28[] {
  const lb = s.labels[lbId];
  if (!lb) return [];
  const out: RepPart28[] = [];
  const r = lrep28(s).lb[lbId];
  const n = (r?.suits ?? []).filter((w) => s.week - w <= 52 * 5).length;
  if (n) out.push({ k: 'suits', v: -Math.min(0.15, n * 0.05), why: fmtL(l('processou {n} artista(s) nos últimos 5 anos', 'sued {n} artist(s) in the last 5 years'), { n }) });
  const L0 = leaderOf(s, lbId);
  const closed = (L0?.jobs ?? []).filter((j) => j.end === 'closed' && j.lb !== lbId).length;
  if (closed) out.push({ k: 'ceo', v: -Math.min(0.15, closed * 0.08), why: fmtL(l('o CEO, {c}, já quebrou {n} selo(s)', 'the CEO, {c}, already ran {n} label(s) into the ground'), { c: L0!.name, n: closed }) });
  if ((lb.debt ?? 0) > Math.max(0, lb.cash) * 1.5 && (lb.debt ?? 0) > 0) out.push({ k: 'debt', v: -0.05, why: l('selo endividado (risco de não pagar a verba)', 'label in debt (may not pay the budget)') });
  const fd = r?.founder;
  if (fd) {
    const age = (s.week - fd.w) / 52;
    if (age < 4) out.push({ k: 'founder', v: -clamp(0.25 * (fd.sev / 100) * (1 - age / 4), 0.02, 0.25), why: fmtL(l('escândalo do fundador ({y})', 'founder scandal ({y})'), { y: fd.y }) });
  }
  return out;
}
export const labelRepAdj28 = (s: GameState, lbId: string): number => Math.max(-0.4, labelRepParts28(s, lbId).reduce((x, p) => x + p.v, 0));
CLOUT_ADJ12.push((s, lb) => (OFF_LREP28.clout ? 0 : labelRepAdj28(s, lb)));
CLOUT_WHY12.push((s, lb) => {
  if (OFF_LREP28.clout || lb === 'player') return null;
  const ps = labelRepParts28(s, lb).sort((a, b) => a.v - b.v);
  return ps.length ? ps[0].why : null;
});

// ---------------------------------------------------------------- escândalo do fundador (N25)

const IDOL = /idol|kpop|k-pop|jpop|j-pop|cpop|boy_?band|girl_?group/i;
const idolish = (s: GameState, lb: Label): boolean => lb.focus.some((g) => IDOL.test(g)) || lb.roster.slice(0, 20).some((id) => IDOL.test(s.acts[id]?.genre ?? ''));
const KIND_TXT: Record<FounderKind28, L> = {
  conduct: l('{f}, fundador da {b}, é acusado de maltratar trainees e artistas por anos.', '{f}, founder of {b}, is accused of mistreating trainees and artists for years.'),
  money: l('{f}, fundador da {b}, teria desviado royalties do elenco para contas pessoais.', '{f}, founder of {b}, allegedly diverted the roster\'s royalties into personal accounts.'),
  sex: l('{f}, fundador da {b}, é acusado de assédio nos bastidores.', '{f}, founder of {b}, is accused of backstage harassment.'),
};

/** Chance mensal do escândalo do fundador (pura). */
export function founderOdds28(s: GameState, lb: Label): number {
  const L0 = leaderOf(s, lb.id);
  if (!L0?.founder || L0.st !== 'active' || !lb.active) return 0;
  let p = 0.0015 * (0.5 + L0.risk / 100) * (0.6 + L0.amb / 125);
  if (idolish(s, lb)) p *= 3;
  if (s.year >= 2017) p *= 1.6; // era das denúncias públicas
  if (s.year < 1950) p *= 0.4;
  return Math.min(0.02, p);
}

/** Dispara o escândalo (também usado pelos testes). */
export function founderScandal28(s: GameState, lbId: string, r: Rng): boolean {
  const lb = s.labels[lbId];
  const L0 = leaderOf(s, lbId);
  if (!lb || !L0) return false;
  const st = lrep28(s);
  if (st.done.includes(L0.id)) return false;
  st.done.push(L0.id);
  if (st.done.length > 200) st.done.shift();
  const kind = r.pick(['conduct', 'money', 'sex'] as FounderKind28[]);
  const sev = Math.round(r.float(45, 90));
  rec(s, lbId).founder = { w: s.week, y: s.year, sev, kind, who: L0.name };
  lb.reputation = clamp(lb.reputation - Math.round(sev / 5), 0, 100);
  const roster = lb.roster.filter((id) => s.acts[id]).slice(0, 8);
  for (const id of roster) { const a = s.acts[id]; a.momentum = clamp(a.momentum - Math.round(sev / 12), 0, 100); a.trust = clamp(a.trust - Math.round(sev / 8), 0, 100); }
  const text = fmtL(KIND_TXT[kind], { f: L0.name, b: lb.name });
  emitFact(s, { kind: 'scandal', actors: [lb.id, ...roster.slice(0, 5)], severity: sev, visibility: 'public', tags: ['founder', 'institution', kind, 'bad', 'lrep28'], text, src: 'lrep28', data: { kind, founder: 1, sev } });
  if (playerActs(s).length || s.player.reputation.artists > 0) {
    pushInbox18(s, 'lrep28', { from: l('Imprensa', 'Press').pt, tone: 'info', subject: fmtL(l('Escândalo na {b}', 'Scandal at {b}'), { b: lb.name }),
      body: fmtL(l('{t} O elenco está abalado (confiança em queda) e, por alguns anos, artistas vão pensar duas vezes antes de assinar com eles.', '{t} The roster is shaken (trust falling) and, for a few years, artists will think twice before signing with them.'), { t: text }) });
  }
  return true;
}

registerSimHook('month', 'lrep28', (s) => {
  if (OFF_LREP28.founder) return;
  for (const lb of Object.values(s.labels)) {
    const p = founderOdds28(s, lb);
    if (!p) continue;
    const r = Rng.fromSeed(`${s.config.seed}|lrep28|f|${lb.id}|${s.year}-${s.month}`);
    if (r.chance(p)) founderScandal28(s, lb.id, r);
  }
});
