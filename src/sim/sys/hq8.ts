// Sede como painel (rodada 8): estado legível de cada carreira para a sede em pixel art e a lista
// rápida — quem grava, compõe, está na estrada ou à toa, quem precisa de atenção, que projeto está
// perto de terminar e qual é a próxima decisão importante. Também guarda a linha do tempo de
// crescimento da empresa (sede, filiais, equipe, elenco, departamentos, equipamentos, mobília).

import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { slotWeek } from '../agenda';
import { unrecorded, unreleasedRecorded } from '../production';
import type { Act, GameState } from '../types';
import { fmtL, playerActs } from '../util';
import { furn } from './furnish';
import { hq6 } from './hq6';

export type HqKind = 'record' | 'write' | 'tour' | 'rehearse' | 'rest' | 'idle' | 'hiatus';
export type Attention = 'decision' | 'take' | 'crisis' | 'tired' | 'trust' | 'contract' | 'empty' | 'queue';

export interface NextStep {
  kind: 'decision' | 'take' | 'crisis' | 'contract' | 'release' | 'studio' | 'rest' | 'agenda';
  label: L;
  /** id do alvo (decisão, sessão, crise) quando houver */
  ref?: string;
}

export interface ActStatus {
  kind: HqKind;
  attention: Attention[];
  project: { label: L; pct: number } | null;
  next: NextStep;
}

const has = (a: string[], ...ids: string[]) => ids.some((x) => a.includes(x));

/** Ações da agenda marcadas para a semana corrente do mês (a sede mostra a semana, não o mês inteiro). */
export function weekActions(s: GameState, actId: string): string[] {
  const w = s.clock.opened ? Math.min(4, Math.floor(s.clock.dayInMonth / 7) + 1) : 1;
  return (s.agenda[actId] ?? []).filter((x, i) => slotWeek(x, i) === w).map((x) => x.action);
}

export function hqKind(s: GameState, act: Act): HqKind {
  if (act.status === 'hiatus' || (act.hiatusUntil !== undefined && act.hiatusUntil > s.week)) return 'hiatus';
  const acts = weekActions(s, act.id);
  if (s.tours?.some((t) => t.actId === act.id && t.status === 'running') || has(acts, 'gigs', 'tour')) return 'tour';
  if (s.sessions.some((x) => x.actId === act.id && !x.done) || has(acts, 'record')) return 'record';
  if (has(acts, 'compose', 'workshop', 'residency_art')) return 'write';
  if (has(acts, 'rest')) return 'rest';
  if (has(acts, 'rehearse', 'train')) return 'rehearse';
  return 'idle';
}

/** Estado completo de uma carreira para a sede. */
export function actStatus(s: GameState, act: Act): ActStatus {
  const att: Attention[] = [];
  const dec = s.decisions.find((d) => String(d.ctx.act ?? '') === act.id);
  const sess = s.sessions.find((x) => x.actId === act.id && !x.done);
  const crisis = s.crises.find((c) => c.actId === act.id && !c.resolved);
  const ms = act.members.map((id) => s.persons[id]).filter((p) => p?.alive);
  const fat = ms.length ? Math.max(...ms.map((p) => p.fatigue)) : 0;
  const str = ms.length ? Math.max(...ms.map((p) => p.stress)) : 0;
  const c = act.contractId ? s.contracts[act.contractId] : undefined;
  const ending = c && !act.playerBand && c.endWeek - s.week <= 13 && c.endWeek >= s.week;
  const unrec = unrecorded(s, act).length;
  const ready = unreleasedRecorded(s, act).length;
  const manual = s.delegated[act.id] === false;
  if (dec) att.push('decision');
  if (sess?.decision) att.push('take');
  if (crisis) att.push('crisis');
  if (fat > 75 || str > 80) att.push('tired');
  if (act.trust < 30 && !act.playerBand) att.push('trust');
  if (ending) att.push('contract');
  if (manual && !(s.agenda[act.id] ?? []).length) att.push('empty');
  if (unrec >= 6) att.push('queue');

  let project: ActStatus['project'] = null;
  const pr = s.pendingReleases.find((p) => p.actId === act.id);
  if (sess) project = { label: fmtL(l('Sessão: dia {d}/{n}', 'Session: day {d}/{n}'), { d: sess.dayDone, n: sess.days }), pct: sess.days ? sess.dayDone / sess.days : 0 };
  else if (pr) { const left = Math.max(0, pr.week - s.week); project = { label: fmtL(l('"{t}" sai em {w} sem.', '"{t}" out in {w} wk'), { t: pr.title, w: left }), pct: Math.max(0.05, 1 - left / 8) }; }
  else if (ready) project = { label: fmtL(l('Álbum: {n}/8 faixas gravadas', 'Album: {n}/8 tracks recorded'), { n: Math.min(ready, 8) }), pct: Math.min(1, ready / 8) };
  else if (unrec) project = { label: fmtL(l('{n} música(s) prontas para gravar', '{n} song(s) ready to record'), { n: unrec }), pct: Math.min(1, unrec / 5) };

  let next: NextStep;
  if (dec) next = { kind: 'decision', label: dec.title, ref: dec.id };
  else if (sess?.decision) next = { kind: 'take', label: fmtL(l('Escolher o take de "{s}"', 'Pick the take for "{s}"'), { s: s.songs[sess.decision.songId]?.title ?? '' }), ref: sess.id };
  else if (crisis) next = { kind: 'crisis', label: crisis.text, ref: crisis.id };
  else if (ending) next = { kind: 'contract', label: fmtL(l('Renovar o contrato (acaba em {w} sem.)', 'Renew the contract (ends in {w} wk)'), { w: c!.endWeek - s.week }) };
  else if (ready >= 8 && !pr) next = { kind: 'release', label: l('Lançar o álbum: o repertório está pronto', 'Release the album: the repertoire is ready') };
  else if (ready >= 1 && !pr && s.week - act.lastRelease > 26) next = { kind: 'release', label: l('Lançar um single: faz tempo que não sai nada', 'Release a single: nothing has come out in a while') };
  else if (unrec >= 3 && !sess) next = { kind: 'studio', label: l('Marcar estúdio para gravar as músicas', 'Book the studio to record the songs') };
  else if (fat > 70 || str > 75) next = { kind: 'rest', label: l('Dar uma pausa antes que alguém quebre', 'Give a break before someone breaks') };
  else next = { kind: 'agenda', label: manual ? l('Planejar a agenda do mês', 'Plan this month\'s agenda') : l('Agenda delegada: revisar prioridade da equipe', 'Delegated agenda: review the team priority') };
  return { kind: hqKind(s, act), attention: att, project, next };
}

/** Capacidade do estúdio: sessões disponíveis, ocupadas e fila de músicas esperando gravação. */
export function studioLoad(s: GameState): { busy: number; queue: number; waiting: string[] } {
  const acts = playerActs(s).map((id) => s.acts[id]);
  const busy = s.sessions.filter((x) => !x.done).length;
  const waiting = acts.filter((a) => unrecorded(s, a).length >= 3 && !s.sessions.some((x) => x.actId === a.id && !x.done)).map((a) => a.id);
  return { busy, queue: acts.reduce((t, a) => t + unrecorded(s, a).length, 0), waiting };
}

// ---------------------------------------------------------------- linha do tempo da sede

export interface HqSnap { y: number; m: number; hq: number; br: number; st: number; ac: number; dp: number; eq: number; fu: number; rev: number }
export interface Hq8State { hist: HqSnap[] }
declare module '../ext4' { interface Ext4 { hq8: Hq8State } }
registerExt4('hq8', () => ({ hist: [] }));
export const hq8 = (s: GameState): Hq8State => {
  const x = s.x4 as unknown as { hq8?: Hq8State };
  x.hq8 ??= { hist: [] };
  return x.hq8;
};

export function hqSnapshot(s: GameState): HqSnap {
  const fu = Object.values(furn(s).items).reduce((a, b) => a + b, 0);
  return {
    y: s.year, m: s.month, hq: s.player.hq, br: s.branches.length, st: s.player.staff.length, ac: playerActs(s).length,
    dp: Object.values(hq6(s).depts).filter((v) => (v ?? 0) > 0).length, eq: s.player.equipment.length, fu,
    rev: Math.round((s.player.revenueByYear[s.year] ?? 0) / 100),
  };
}

const same = (a: HqSnap, b: HqSnap) => a.hq === b.hq && a.br === b.br && a.st === b.st && a.ac === b.ac && a.dp === b.dp && a.eq === b.eq && a.fu === b.fu;

/** Registra o retrato se algo da empresa mudou (ou na virada do ano). */
export function recordHq(s: GameState, force = false): void {
  const st = hq8(s);
  const snap = hqSnapshot(s);
  const last = st.hist[st.hist.length - 1];
  if (last && same(last, snap) && !force) return;
  if (last && last.y === snap.y && last.m === snap.m) st.hist[st.hist.length - 1] = snap;
  else st.hist.push(snap);
  if (st.hist.length > 90) st.hist.splice(1, st.hist.length - 90);
}

/** O que mudou entre dois retratos, em texto. */
export function hqChanges(a: HqSnap | undefined, b: HqSnap): L[] {
  const out: L[] = [];
  if (!a) return [l('Fundação da empresa', 'The company is founded')];
  const d = (k: keyof HqSnap, up: L, down: L) => { const v = b[k] - a[k]; if (v > 0) out.push(fmtL(up, { n: v })); else if (v < 0) out.push(fmtL(down, { n: -v })); };
  d('hq', l('Sede ampliada', 'HQ upgraded'), l('Sede reduzida', 'HQ downsized'));
  d('br', l('+{n} filial(is)', '+{n} branch(es)'), l('−{n} filial(is)', '−{n} branch(es)'));
  d('ac', l('+{n} carreira(s)', '+{n} career(s)'), l('−{n} carreira(s)', '−{n} career(s)'));
  d('st', l('+{n} na equipe', '+{n} staff'), l('−{n} na equipe', '−{n} staff'));
  d('dp', l('+{n} departamento(s)', '+{n} department(s)'), l('−{n} departamento(s)', '−{n} department(s)'));
  d('eq', l('+{n} equipamento(s)', '+{n} equipment'), l('−{n} equipamento(s)', '−{n} equipment'));
  d('fu', l('+{n} móvel(is) e instrumento(s)', '+{n} furniture & instruments'), l('−{n} móvel(is)', '−{n} furniture'));
  return out;
}

registerSimHook('newgame', 'hq8', (s) => recordHq(s, true));
registerSimHook('month', 'hq8', (s) => recordHq(s, s.month === 11));
