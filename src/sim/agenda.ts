// Agenda mensal dos artistas: 4 slots (3 para iniciantes), retorno decrescente,
// delegação por política (GDD §3 "manual / delegada / simples", §9).

import { clamp, type Rng } from '../core/rng';
import { agendaById, type SkillId } from '../data/people';
import { l } from '../data/world';
import { maxVenueTier, playGigs } from './live';
import { actHasTrait, actState, growPerson, traitMod } from './people';
import { composeSongs, notifyRecorded, recordSongs, recordingSessionsAvailable, scheduleRelease, suggestedPress, unrecorded, unreleasedRecorded, availableFormats, labelFunded, pressingCost } from './production';
import { availableChannels } from './market';
import type { Act, AgendaSlot, GameState } from './types';
import { fmtL, money, notify, playerActs, post, remember } from './util';
import { emitEvent } from './events';
import { EXTRA_ACTIONS } from '../data/actions';
import { activeMembers, agendaLoad, monthIndex, personLoad, planSlots, slotLoad } from './capacity';
import { runExtraAction } from './actions2';

export function slotsFor(act: Act): number {
  return act.fame < 10 && act.status === 'emerging' ? 3 : 4;
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
  for (const actId of playerActs(s)) {
    const act = s.acts[actId];
    if (act.hiatusUntil && act.hiatusUntil > s.week) continue;
    let slots = s.delegated[actId] !== false ? defaultAgenda(s, act) : s.agenda[actId] ?? [];
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
    for (const slot of slots) {
      const n = (counts[slot.action] = (counts[slot.action] ?? 0) + 1);
      const dim = 1 / n; // retorno decrescente
      runAction(s, r, act, slot, dim, () => {
        if (sessionsLeft > 0) {
          sessionsLeft -= 1;
          return true;
        }
        return false;
      });
    }
    if (s.delegated[actId] !== false) autoRelease(s, r, act);
  }
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
    post(s, `agenda:${act.id}:${id}`, -cost, 'artist_dev', `${def.name.pt} ${act.name}`);
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
      act.fame = clamp(act.fame + 1.4 * dim * (1 - act.fame / 70), 0, 100);
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
      act.fame = clamp(act.fame + 0.7 * dim * (1 + traitMod(s, act, 'media') / 20), 0, 100);
      act.momentum = clamp(act.momentum + 5 * dim, 0, 100);
      const risk = 0.04 + Math.max(0, traitMod(s, act, 'scandal')) * 0.12;
      if (r.chance(risk)) emitEvent(s, r, 'controversial_remark', { act: act.id });
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
  const ready = unreleasedRecorded(s, act).sort((a, b) => b.q - a.q);
  const since = s.week - act.lastRelease;
  if (!ready.length || since < 22) return;
  const type: 'single' | 'lp' = ready.length >= 8 ? 'lp' : 'single';
  const songs = type === 'lp' ? ready.slice(0, 10).map((x) => x.id) : [ready[0].id];
  const budgetCap = Math.max(0, Math.round(s.player.cash * 0.08));
  const ch = availableChannels(s);
  const main = ch.find((c) => c.id === 'playlists') ?? ch.find((c) => c.id === 'music_video') ?? ch.find((c) => c.id === 'tv_show') ?? ch[0];
  const budget = Math.min(budgetCap, money(s, type === 'lp' ? 6000 : 2500) * (1 + act.fame / 30));
  const formats = availableFormats(s);
  const per1000 = Math.max(1, pressingCost(s, formats, 1000) - pressingCost(s, formats, 0));
  const affordable = Math.floor((s.player.cash * 0.15) / per1000) * 1000;
  const press = labelFunded(s, act.id) ? suggestedPress(s, act, type) : Math.min(suggestedPress(s, act, type), affordable);
  if (s.player.cash < money(s, 1500)) return;
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
}
