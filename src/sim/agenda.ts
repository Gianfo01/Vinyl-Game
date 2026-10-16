// Agenda mensal dos artistas: 4 slots (3 para iniciantes), retorno decrescente,
// delegação por política (GDD §3 "manual / delegada / simples", §9).

import { clamp, hashString, type Rng } from '../core/rng';
import { agendaById, type SkillId } from '../data/people';
import { l, type L } from '../data/world';
import { maxVenueTier, playGigs } from './live';
import { actHasTrait, actState, actTalent, growPerson, traitMod } from './people';
import { composeSongs, notifyRecorded, recordSongs, recordingSessionsAvailable, scheduleRelease, suggestedPress, unrecorded, unreleasedRecorded, availableFormats, labelFunded, pressingCost } from './production';
import { availableChannels } from './market';
import type { Act, AgendaSlot, GameState } from './types';
import { fmtL, money, notify, playerActs, post, remember } from './util';
import { emitEvent } from './events';
import { EXTRA_ACTIONS } from '../data/actions';
import { activeMembers, agendaLoad, monthIndex, personLoad, planSlots, slotLoad } from './capacity';
import { runExtraAction } from './actions2';
import { registerExt4, registerSimHook } from './ext4';
import { on31 } from './r31/market31';

/** Química com o público, fixa por ato: 0,4–1,6 (média 1). */
export const clickK18 = (s: GameState, act: Act): number => 0.4 + (hashString(`${s.config.seed}|click|${act.id}`) % 1000) / 1000 * 1.2;
/** r18 final (balanço): nem toda banda "pega" — a vitrine (abrir shows, entrevistas) rende conforme o palco e um
 *  fator de química com o público, fixo por ato (0,55–1,45). Antes toda carreira subia igual. */
export function click18(s: GameState, act: Act): number {
  const k = clickK18(s, act);
  return k * (0.6 + actTalent(s, act).stage / 125);
}

export function slotsFor(act: Act): number {
  return act.fame < 10 && act.status === 'emerging' ? 5 : 6;
}

export function slotCost(action: string): number {
  return action === 'record' ? 2 : 1;
}

export function usedSlots(slots: AgendaSlot[]): number {
  return slots.reduce((t, x) => t + slotCost(x.action), 0);
}

/** Capacidade livre da formação neste mês, fora a agenda do próprio ato (turnês, planos, solo). */
export function freeCapacity(s: GameState, act: Act): number {
  const now = monthIndex(s);
  const own = agendaLoad(s.agenda[act.id] ?? []);
  let free = 100;
  for (const pid of activeMembers(s, act)) free = Math.min(free, 100 - (personLoad(s, pid, now).total - own));
  return Math.max(0, free);
}

export function defaultAgenda(s: GameState, act: Act): AgendaSlot[] {
  const st = actState(s, act);
  const max = slotsFor(act);
  const cap = Math.min(100, freeCapacity(s, act) - agendaLoad(planSlots(s, act.id)));
  const out: AgendaSlot[] = [];
  const add = (a: AgendaSlot) => {
    if (usedSlots(out) + slotCost(a.action) <= max && agendaLoad(out) + slotLoad(a) <= cap) out.push(a);
  };
  if (st.fatigue > 65 || st.stress > 75) add({ action: 'rest' });
  const unrec = unrecorded(s, act).length;
  if (unrec >= 3) add({ action: 'record', params: { tier: s.player.hq >= 1 ? 0 : 1, approach: 'balanced' } });
  if (unrec < 4) add({ action: 'compose' });
  const tier = Math.min(maxVenueTier(s, act), 3);
  if (st.fatigue < 55) add({ action: 'gigs', params: { tier, dates: tier >= 3 ? 3 : 4 } });
  if (act.rehearsed < 6) add({ action: 'rehearse' });
  add({ action: act.fame < 15 ? 'opening' : 'interview' });
  add({ action: 'train' });
  return out;
}

export function setAgenda(s: GameState, actId: string, slots: AgendaSlot[]): boolean {
  const act = s.acts[actId];
  if (!act) return false;
  if (agendaLoad(slots) + agendaLoad(planSlots(s, actId)) > freeCapacity(s, act)) return false;
  s.agenda[actId] = slots;
  s.delegated[actId] = false;
  return true;
}

/** Processa a agenda de todos os atos do jogador no início do mês. */
export function processPlayerAgendas(s: GameState, r: Rng): void {
  let sessionsLeft = recordingSessionsAvailable(s);
  const ids = deleg.order ? deleg.order(s, playerActs(s)) : playerActs(s);
  for (const actId of ids) {
    const act = s.acts[actId];
    if (act.hiatusUntil && act.hiatusUntil > s.week) continue;
    let slots = s.delegated[actId] !== false ? (deleg.agenda ? deleg.agenda(s, act, defaultAgenda(s, act)) : defaultAgenda(s, act)) : s.agenda[actId] ?? [];
    if (s.delegated[actId] !== false) s.agenda[actId] = slots;
    // autonomia: artista com controle criativo pode trocar uma ação
    const c = act.contractId ? s.contracts[act.contractId] : undefined;
    if (c?.creativeControl && r.chance(0.15) && !act.playerBand && slots.length) slots = [...slots.slice(0, -1), { action: 'residency_art' }];
    // planos iniciados têm precedência; a agenda é cortada até caber em 100%
    const fromPlans = planSlots(s, actId);
    if (fromPlans.length) {
      const capLeft = freeCapacity(s, act) + agendaLoad(s.agenda[actId] ?? []);
      const kept: AgendaSlot[] = [...fromPlans];
      for (const x of slots) if (agendaLoad(kept) + slotLoad(x) <= capLeft) kept.push(x);
      slots = kept;
    }
    s.loadNow[actId] = agendaLoad(slots);
    const counts: Record<string, number> = {};
    // rodada 7: cada ação acontece na semana marcada (1–4); a semana 1 roda já, as outras entram na fila
    const ordered = [...slots].map((x, i) => ({ x, i })).sort((a, b) => slotWeek(a.x, a.i) - slotWeek(b.x, b.i) || a.i - b.i);
    for (const { x: slot, i } of ordered) {
      const n = (counts[slot.action] = (counts[slot.action] ?? 0) + 1);
      const dim = 1 / n; // retorno decrescente
      const week = slotWeek(slot, i);
      if (week > 1) { ag7(s).queue.push({ actId: act.id, slot: { ...slot, params: { ...(slot.params ?? {}) } }, dim, week }); continue; }
      beforeSlot7(s, r, act, slot, week);
      runAction(s, r, act, slot, dim, () => {
        if (sessionsLeft > 0) {
          sessionsLeft -= 1;
          return true;
        }
        return false;
      });
    }
    ag7(s).sessions = sessionsLeft;
    if (s.delegated[actId] !== false) autoRelease(s, r, act);
  }
}

/** Semana do mês (1–4) em que a ação acontece; sem marcação, distribui na ordem. */
export function slotWeek(slot: AgendaSlot, index: number): number {
  const w = Number(slot.params?.week ?? 0);
  return w >= 1 && w <= 4 ? w : Math.min(4, 1 + index);
}


// delegação da rodada 8 (prioridades, tetos de gasto, ordem e registro das decisões): sim/sys/pacing8.ts
export interface DelegationHooks {
  /** ordem em que as carreiras disputam sessões e orçamento */
  order?: (s: GameState, ids: string[]) => string[];
  /** agenda delegada a partir da padrão */
  agenda?: (s: GameState, act: Act, base: AgendaSlot[]) => AgendaSlot[];
  /** a equipe pode gastar isto nesta carreira? */
  canSpend?: (s: GameState, act: Act, cost: number, what: string) => boolean;
  spent?: (s: GameState, act: Act, cost: number, what: string) => void;
  /** política de lançamento delegado */
  release?: (s: GameState, act: Act) => { ok: boolean; minGap: number; budgetMult: number; maxSpend: number; type?: 'single' | 'lp'; songs?: string[] };
  released?: (s: GameState, act: Act, info: { type: 'single' | 'lp'; budget: number; press: number; cost: number; error?: L }) => void;
}
let deleg: DelegationHooks = {};
export function setDelegationHooks(h: DelegationHooks): void {
  deleg = h;
}

function payAction(s: GameState, act: Act, id: string, planned?: string): boolean {
  const def = agendaById[id] ?? EXTRA_ACTIONS.find((x) => x.id === id);
  if (!def?.cost) return true;
  // planos de vários meses pagam só no primeiro mês
  if (planned) {
    const p = s.plans.find((x) => x.id === planned);
    if (p && p.startMonth !== monthIndex(s)) return true;
  }
  const cost = money(s, def.cost);
  if (act.playerBand || act.owner === 'player') {
    if (s.player.cash < cost) return false;
    const byTeam = s.delegated[act.id] !== false;
    if (byTeam && deleg.canSpend && !deleg.canSpend(s, act, cost, id)) return false;
    post(s, `agenda:${act.id}:${id}`, -cost, 'artist_dev', `${def.name.pt} ${act.name}`);
    if (byTeam) deleg.spent?.(s, act, cost, id);
  }
  return true;
}

function members(s: GameState, act: Act) {
  return act.members.map((id) => s.persons[id]).filter((p) => p && p.alive);
}

function runAction(s: GameState, r: Rng, act: Act, slot: AgendaSlot, dim: number, takeSession: () => boolean): void {
  const a = slot.action;
  if (!payAction(s, act, a, slot.params?.plan ? String(slot.params.plan) : undefined)) return;
  if (EXTRA_ACTIONS.some((x) => x.id === a)) {
    runExtraAction(s, r, act, slot, dim);
    return;
  }
  const grow = (keys: SkillId[], amt: number) => {
    for (const p of members(s, act)) for (const k of keys) growPerson(p, k, amt * dim);
  };
  const mood = (k: 'fatigue' | 'stress' | 'morale' | 'inspiration', v: number) => {
    for (const p of members(s, act)) p[k] = clamp(p[k] + v, 0, 100);
  };
  switch (a) {
    case 'train':
      grow(['voice', 'instr'], 2.2);
      mood('fatigue', 3);
      break;
    case 'workshop':
      grow(['comp', 'lyr'], 2.2);
      mood('inspiration', 4);
      break;
    case 'rehearse':
      act.rehearsed = clamp(act.rehearsed + 6 * dim, 0, 15);
      grow(['stage', 'instr'], 0.8);
      break;
    case 'opening':
      act.fame = clamp(act.fame + 1.4 * dim * (1 - act.fame / 70) * click18(s, act), 0, 100);
      act.fans.casual += Math.round(400 * dim * (1 + act.fame / 15));
      act.fans.active += Math.round(40 * dim);
      mood('fatigue', 5);
      grow(['stage'], 0.8);
      break;
    case 'networking':
      act.networking = clamp(act.networking + 6 * dim, 0, 40);
      if (act.owner === 'player') s.player.reputation.institutional = clamp(s.player.reputation.institutional + 0.2, 0, 100);
      break;
    case 'interview': {
      act.fame = clamp(act.fame + 0.45 * dim * (1 + traitMod(s, act, 'media') / 20) * (1 - act.fame / 100) * click18(s, act), 0, 100); // r18 final: entrevista rende menos para quem já é famoso
      act.momentum = clamp(act.momentum + 5 * dim, 0, 100);
      const risk = 0.04 + Math.max(0, traitMod(s, act, 'scandal')) * 0.12;
      // r18 final (ritmo): a mesma polêmica no máximo uma vez por semestre por ato (era a carta mais repetida)
      const ck = `cr18:${act.id}`;
      if (r.chance(risk) && (s.flags[ck] ?? -99) <= s.week - 26) { s.flags[ck] = s.week; emitEvent(s, r, 'controversial_remark', { act: act.id }); }
      break;
    }
    case 'residency_art':
      mood('inspiration', 25 * dim);
      mood('stress', -6);
      act.positioning = clamp(act.positioning - 3, 0, 100);
      break;
    case 'side_job':
      act.cash += money(s, 600);
      mood('fatigue', 6);
      mood('morale', -2);
      break;
    case 'feat': {
      const partner = r.pick(Object.values(s.acts).filter((x) => x.id !== act.id && x.status === 'active' && x.fame > act.fame && x.genre === act.genre)) ??
        r.pick(Object.values(s.acts).filter((x) => x.id !== act.id && x.status === 'active' && x.fame > act.fame));
      if (partner) {
        act.fame = clamp(act.fame + 1.6 * dim, 0, 100);
        act.fans.casual += Math.round(partner.fans.casual * 0.015 * dim);
        act.feats += 1;
        remember(s, 'feat', fmtL(l('{a} participa de faixa de {b}.', '{a} guests on a {b} track.'), { a: act.name, b: partner.name }), { actId: act.id });
      }
      break;
    }
    case 'rest':
      mood('fatigue', -28 * dim);
      mood('stress', -18 * dim);
      mood('morale', 3);
      break;
    case 'social':
      mood('morale', 4);
      act.fame = clamp(act.fame + 0.3, 0, 100);
      if (act.owner === 'player') s.player.reputation.institutional = clamp(s.player.reputation.institutional + 0.8 * dim, 0, 100);
      break;
    case 'reposition': {
      const target = slot.params?.target === 'underground' ? -12 : 12;
      act.positioning = clamp(act.positioning + target * dim, 0, 100);
      act.momentum = clamp(act.momentum + 3, 0, 100);
      if (actHasTrait(s, act, 'purist') && target > 0) mood('morale', -6);
      break;
    }
    case 'compose': {
      if (slot.params?.played27) { for (const x of [slot, ...(s.agenda[act.id] ?? [])]) if (x.params) delete x.params.played27; break; } // r27 M1: a composição jogada (compose27) já escreveu as músicas deste mês
      const prolific = actHasTrait(s, act, 'prolific') ? 1 : 0;
      const n = Math.max(1, Math.round((1 + (r.chance(0.5) ? 1 : 0) + prolific) * (actHasTrait(s, act, 'blocked') ? 0.5 : 1)));
      composeSongs(s, r, act, n);
      break;
    }
    case 'record': {
      let tier = Number(slot.params?.tier ?? 0);
      const approach = String(slot.params?.approach ?? 'balanced');
      const songs = unrecorded(s, act).sort((x, y) => y.melody + y.lyrics - (x.melody + x.lyrics)).slice(0, act.playerBand && s.config.role === 'artist' ? 4 : 5);
      if (!songs.length) break;
      if (tier === 0 && (s.player.hq < 1 || !takeSession())) tier = Math.max(1, tier);
      const res = recordSongs(s, r, act, songs.map((x) => x.id), tier, approach, 'player');
      if (res.songs.length) notifyRecorded(s, act, res.songs.length, res.songs.reduce((t, x) => t + x.q, 0) / res.songs.length);
      mood('fatigue', 6);
      break;
    }
    case 'gigs': {
      const tier = clamp(Number(slot.params?.tier ?? 0), 0, maxVenueTier(s, act));
      const dates = clamp(Number(slot.params?.dates ?? 4), 1, 12);
      playGigs(s, r, act, tier, dates);
      break;
    }
  }
}

/** Política de lançamento delegada: singles regulares, LP quando há repertório. */
function autoRelease(s: GameState, r: Rng, act: Act): void {
  if (s.pendingReleases.some((p) => p.actId === act.id)) return;
  const pol = deleg.release?.(s, act);
  if (pol && !pol.ok) return;
  const ready = unreleasedRecorded(s, act).sort((a, b) => b.q - a.q);
  const since = s.week - act.lastRelease;
  if (!ready.length || since < (pol?.minGap ?? 22)) return;
  // r31 (Q): o produtor executivo pode fixar o formato e escolher as faixas (diretrizes da delegação)
  const type: 'single' | 'lp' = pol?.type ?? (ready.length >= 8 ? 'lp' : 'single');
  if (type === 'lp' && ready.length < 8) return;
  const songs = pol?.songs?.length ? pol.songs : type === 'lp' ? ready.slice(0, 10).map((x) => x.id) : [ready[0].id];
  const budgetCap = Math.max(0, Math.round(s.player.cash * 0.08));
  const ch = availableChannels(s);
  const main = ch.find((c) => c.id === 'playlists') ?? ch.find((c) => c.id === 'music_video') ?? ch.find((c) => c.id === 'tv_show') ?? ch[0];
  let budget = Math.min(budgetCap, money(s, type === 'lp' ? 6000 : 2500) * (1 + act.fame / 30));
  if (pol) budget = Math.round(Math.min(budget * pol.budgetMult, pol.maxSpend * 0.5));
  const formats = availableFormats(s);
  const per1000 = Math.max(1, pressingCost(s, formats, 1000) - pressingCost(s, formats, 0));
  const affordable = Math.floor((pol ? Math.min(s.player.cash * 0.15, pol.maxSpend * 0.5) : s.player.cash * 0.15) / per1000) * 1000;
  const want = suggestedPress(s, act, type, 50, { marketing: budget > 0 && main ? [{ channel: main.id, budget }] : [], extra: { songs } });
  const press = labelFunded(s, act.id) ? want : Math.min(want, affordable);
  if (s.player.cash < money(s, 1500)) return;
  // R31 onda 3 (bal31.hold): sem caixa para metade da tiragem sugerida, segura o disco (a gravação não se perde) em vez
  // de queimá-lo com 200 cópias e milhares perdidas por falta de estoque — salvo se o ato está há 78+ semanas sem lançar.
  if (!labelFunded(s, act.id) && on31(s, 'bal31.hold') && press < want * 0.5 && since < 78) return;
  const cashBefore = s.player.cash;
  const res = scheduleRelease(s, r, {
    actId: act.id,
    type,
    songs,
    formats,
    press: Math.max(200, press),
    marketing: budget > 0 && main ? [{ channel: main.id, budget }] : [],
    territories: s.player.territories,
    weeksAhead: 2,
  });
  if ('pt' in res) notify(s, fmtL(l('Lançamento automático de {act} não saiu: {e}', 'Auto release for {act} failed: {e}'), { act: act.name, e: res }), 'info');
  deleg.released?.(s, act, { type, budget, press: Math.max(200, press), cost: Math.max(0, cashBefore - s.player.cash), error: 'pt' in res ? res : undefined });
}

// ================================================================ agenda por semana (rodada 7; r31 UNI-1: era sys/agenda7)
// Calendário de 4 semanas, combinações entre ações (ensaiar antes dos shows, compor antes de gravar, descansar depois da
// estrada…), sinergia com a semana de lançamento, semana cheia que cansa, e modelos de agenda que você salva e aplica a
// qualquer artista. Mesmo conceito dos slots acima: a ação marcada na semana 1 roda no virar do mês, as outras entram
// na fila semanal.

export interface ComboDef { id: string; before: string; after: string; name: L; desc: L; apply: (s: GameState, act: Act) => void }

const mood7 = (s: GameState, act: Act, k: 'fatigue' | 'stress' | 'morale' | 'inspiration', v: number) => {
  for (const id of act.members) { const p = s.persons[id]; if (p?.alive) p[k] = clamp(p[k] + v, 0, 100); }
};

export const COMBOS: ComboDef[] = [
  { id: 'tight', before: 'rehearse', after: 'gigs', name: l('Banda afiada', 'Tight band'), desc: l('Ensaiar antes dos shows: palco melhor e mais fãs.', 'Rehearse before the gigs: better stage, more fans.'), apply: (s, a) => { a.rehearsed = clamp(a.rehearsed + 4, 0, 15); a.fans.active += Math.round(20 + a.fame * 2); } },
  { id: 'notebook', before: 'compose', after: 'record', name: l('Do caderno ao estúdio', 'From notebook to studio'), desc: l('Compor antes de gravar: a inspiração chega quente ao estúdio.', 'Write before recording: inspiration arrives hot at the studio.'), apply: (s, a) => mood7(s, a, 'inspiration', 12) },
  { id: 'workshop', before: 'workshop', after: 'compose', name: l('Oficina inspirada', 'Inspired workshop'), desc: l('Oficina antes de compor: músicas melhores.', 'Workshop before writing: better songs.'), apply: (s, a) => mood7(s, a, 'inspiration', 10) },
  { id: 'chops', before: 'train', after: 'record', name: l('Técnica em dia', 'Chops in shape'), desc: l('Treinar antes de gravar: interpretação melhor.', 'Train before recording: better performance.'), apply: (s, a) => { for (const id of a.members) { const p = s.persons[id]; if (p?.alive) { growPerson(p, 'instr', 0.8); growPerson(p, 'voice', 0.8); } } } },
  { id: 'deserved', before: 'gigs', after: 'rest', name: l('Descanso merecido', 'Well-earned rest'), desc: l('Descansar depois da estrada recupera o dobro.', 'Resting after the road recovers twice as much.'), apply: (s, a) => { mood7(s, a, 'fatigue', -12); mood7(s, a, 'stress', -8); } },
  { id: 'buzz', before: 'interview', after: 'gigs', name: l('Divulgação antes do show', 'Buzz before the show'), desc: l('Entrevista antes dos shows: casas mais cheias e momento.', 'Interview before gigs: fuller venues and momentum.'), apply: (_s, a) => { a.momentum = clamp(a.momentum + 4, 0, 100); a.fans.casual += Math.round(200 + a.fame * 20); } },
  { id: 'contacts', before: 'networking', after: 'opening', name: l('Contatos certos', 'The right contacts'), desc: l('Networking antes de abrir shows: a abertura certa.', 'Networking before opening slots: the right support slot.'), apply: (_s, a) => { a.fame = clamp(a.fame + 0.6, 0, 100); } },
  { id: 'retreat', before: 'residency_art', after: 'compose', name: l('Retiro criativo', 'Creative retreat'), desc: l('Residência antes de compor: originalidade.', 'Residency before writing: originality.'), apply: (s, a) => mood7(s, a, 'inspiration', 14) },
];

export interface Ag7State {
  weekNo: number;
  queue: { actId: string; slot: AgendaSlot; dim: number; week: number }[];
  done: Record<string, { action: string; week: number }[]>;
  sessions: number;
  templates: { id: string; name: string; slots: AgendaSlot[] }[];
  combos: { week: number; actId: string; combo: string }[];
}

declare module './ext4' { interface Ext4 { ag7: Ag7State } }
export const ag7 = (s: GameState): Ag7State => (s as unknown as { x4: { ag7: Ag7State } }).x4.ag7;

/** Combinações que esta agenda ativa (para a interface mostrar ✦). */
export function plannedCombos(slots: AgendaSlot[]): { combo: ComboDef; after: number }[] {
  const out: { combo: ComboDef; after: number }[] = [];
  slots.forEach((x, i) => {
    const w = slotWeek(x, i);
    for (const c of COMBOS) {
      if (c.after !== x.action) continue;
      if (slots.some((y, j) => j !== i && y.action === c.before && slotWeek(y, j) <= w && (slotWeek(y, j) < w || j < i))) out.push({ combo: c, after: i });
    }
  });
  return out;
}

/** Semanas cheias (shows + gravação na mesma semana, ou 3+ ações): cansam mais. */
export function crowdedWeeks(slots: AgendaSlot[]): number[] {
  const per: Record<number, string[]> = {};
  slots.forEach((x, i) => (per[slotWeek(x, i)] ??= []).push(x.action));
  return Object.entries(per).filter(([, a]) => a.length >= 3 || (a.includes('gigs') && a.includes('record'))).map(([w]) => Number(w));
}

/** Semana do mês (1–4) em que sai um lançamento já agendado deste ato. */
export function releaseWeek(s: GameState, actId: string): number | null {
  const pr = s.pendingReleases.find((p) => p.actId === actId);
  if (!pr) return null;
  const start = s.clock.opened ? s.clock.monthStartWeek : s.week;
  const w = pr.week - start + 1;
  return w >= 1 && w <= 4 ? w : null;
}

/** Antes de cada ação: combinações, divulgação na semana do lançamento, semana cheia. */
function beforeSlot7(s: GameState, _r: Rng, act: Act, slot: AgendaSlot, week: number): void {
  const st = ag7(s);
  const done = (st.done[act.id] ??= []);
  for (const c of COMBOS) {
    if (c.after === slot.action && done.some((d) => d.action === c.before && d.week <= week)) {
      c.apply(s, act);
      st.combos.push({ week: s.week, actId: act.id, combo: c.id });
      if (st.combos.length > 40) st.combos.shift();
    }
  }
  // divulgação na semana do lançamento: mais expectativa
  if ((slot.action === 'interview' || slot.action === 'social' || slot.action === 'feat') && releaseWeek(s, act.id) === week) {
    const pr = s.pendingReleases.find((p) => p.actId === act.id);
    if (pr) pr.hype = (pr.hype ?? 0) + 0.12;
  }
  // semana cheia cansa
  const sameWeek = done.filter((d) => d.week === week).map((d) => d.action);
  if (sameWeek.length >= 2 || (slot.action === 'gigs' && sameWeek.includes('record')) || (slot.action === 'record' && sameWeek.includes('gigs'))) mood7(s, act, 'fatigue', 5);
  done.push({ action: slot.action, week });
}

function runQueued7(s: GameState, r: Rng, upTo: number): void {
  const st = ag7(s);
  const due = st.queue.filter((q) => q.week <= upTo);
  if (!due.length) return;
  st.queue = st.queue.filter((q) => q.week > upTo);
  for (const q of due) {
    const act = s.acts[q.actId];
    if (!act || act.owner !== 'player' && !act.playerBand) continue;
    if (act.hiatusUntil && act.hiatusUntil > s.week) continue;
    beforeSlot7(s, r, act, q.slot, q.week);
    runAction(s, r, act, q.slot, q.dim, () => {
      if (st.sessions > 0) { st.sessions -= 1; return true; }
      return false;
    });
  }
}

/** Estado e ganchos da agenda semanal. A ordem dos ganchos do tick é parte do determinismo: quem chama é o fim de
 *  sys/songsale.ts, o ponto exato da cadeia de sys/index em que o antigo sys/agenda7 entrava (r31 UNI-1). */
export function registerAgendaWeek(): void {
  registerExt4('ag7', () => ({ weekNo: 1, queue: [], done: {}, sessions: 0, templates: [], combos: [] }));
  // a cada fechamento semanal, roda o que estava marcado para a semana seguinte
  registerSimHook('week', 'ag7', (s, r) => {
    const st = ag7(s);
    st.weekNo += 1;
    runQueued7(s, r, st.weekNo);
  });
  // fechamento do mês: o que sobrou roda; zera o calendário
  registerSimHook('month', 'ag7', (s, r) => {
    const st = ag7(s);
    runQueued7(s, r, 99);
    st.weekNo = 1;
    st.done = {};
  });
}

// ---------------------------------------------------------------- modelos

export function saveTemplate(s: GameState, name: string, slots: AgendaSlot[]): void {
  const st = ag7(s);
  st.templates.push({ id: `tpl${st.templates.length + 1}-${s.week}`, name: name.slice(0, 40) || 'Modelo', slots: slots.map((x) => ({ action: x.action, params: { ...(x.params ?? {}) } })) });
  if (st.templates.length > 12) st.templates.shift();
}

export function deleteTemplate(s: GameState, id: string): void {
  const st = ag7(s);
  st.templates = st.templates.filter((x) => x.id !== id);
}

export function applyTemplate(s: GameState, id: string, actIds: string[]): number {
  const tpl = ag7(s).templates.find((x) => x.id === id);
  if (!tpl) return 0;
  for (const a of actIds) {
    s.agenda[a] = tpl.slots.map((x) => ({ action: x.action, params: { ...(x.params ?? {}) } }));
    s.delegated[a] = false;
  }
  if (actIds.length > 1) notify(s, fmtL(l('Modelo "{n}" aplicado a {k} artistas.', 'Template "{n}" applied to {k} acts.'), { n: tpl.name, k: actIds.length }), 'info');
  return actIds.length;
}

/** Modelos prontos para começar. */
export const PRESETS: { id: string; name: L; slots: AgendaSlot[] }[] = [
  { id: 'studio', name: l('Modo estúdio', 'Studio mode'), slots: [{ action: 'workshop', params: { week: 1 } }, { action: 'compose', params: { week: 2 } }, { action: 'record', params: { week: 3, tier: 1, approach: 'balanced' } }] },
  { id: 'road', name: l('Modo estrada', 'Road mode'), slots: [{ action: 'rehearse', params: { week: 1 } }, { action: 'interview', params: { week: 1 } }, { action: 'gigs', params: { week: 2, tier: 1, dates: 6 } }, { action: 'rest', params: { week: 4 } }] },
  { id: 'promo', name: l('Divulgação', 'Promotion'), slots: [{ action: 'networking', params: { week: 1 } }, { action: 'opening', params: { week: 2 } }, { action: 'interview', params: { week: 3 } }, { action: 'social', params: { week: 4 } }] },
  { id: 'recover', name: l('Recuperação', 'Recovery'), slots: [{ action: 'rest', params: { week: 1 } }, { action: 'residency_art', params: { week: 3 } }] },
];
