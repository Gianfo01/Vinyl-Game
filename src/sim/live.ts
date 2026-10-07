// Palco: shows, casas, festivais e incidentes (GDD §15).

import { clamp, type Rng } from '../core/rng';
import { EQUIPMENT, VENUE_TIERS } from '../data/rules';
import { l } from '../data/world';
import { actHasTrait, actState, actTalent } from './people';
import type { Act, GameState } from './types';
import { fmtL, hasCard, money, notify, post, remember, staffSkill } from './util';

const TICKET = [12, 25, 45, 70, 95];
const ARTIST_SPLIT = 0.6;

export function maxVenueTier(s: GameState, act: Act): number {
  const booking = staffSkill(s, 'booking') / 12;
  let t = 0;
  for (const v of VENUE_TIERS) if (act.fame + booking >= v.fameMin) t = v.id;
  return t;
}

export interface GigEstimate {
  perDate: number;
  capacity: number;
  revenue: number;
  cost: number;
  net: number;
  fatigue: number;
}

export function gigEstimate(s: GameState, act: Act, tier: number, dates: number): GigEstimate {
  const v = VENUE_TIERS[clamp(tier, 0, 4)];
  const capacity = Math.round((v.cap[0] + v.cap[1]) / 2);
  const t = actTalent(s, act);
  const draw = (act.fans.core * 0.8 + act.fans.active * 0.3 + act.fans.casual * 0.02) * (1 + act.fame / 60) * (0.7 + t.stage / 150);
  // o mesmo público não vai a todo show: shows recentes saturam a praça
  const sat = 1 + (act.gigSat ?? 0) / 6;
  const perDate = Math.round(Math.min(capacity, draw / sat / Math.max(1, Math.sqrt(dates) * 1.2)));
  const price = money(s, TICKET[v.id] * (hasCard(s, 'showman') ? 1.1 : 1));
  // promotor e casa ficam com parte da bilheteria
  const revenue = Math.round(perDate * dates * price * ARTIST_SPLIT);
  const tm = staffSkill(s, 'tour_manager');
  const crew = money(s, (v.cost + 120 * act.members.length) * (1 - tm / 400)) * dates;
  let comfort = 0;
  for (const id of s.player.equipment) comfort += EQUIPMENT.find((e) => e.id === id)?.effect.fatigue ?? 0;
  const fatigue = Math.max(1, dates * (5 + v.id) - tm / 25 - comfort);
  return { perDate, capacity, revenue, cost: crew, net: revenue - crew, fatigue };
}

export function playGigs(s: GameState, r: Rng, act: Act, tier: number, dates: number): void {
  const est = gigEstimate(s, act, tier, dates);
  const noise = r.float(0.8, 1.15);
  const attendance = Math.round(Math.min(est.capacity, est.perDate * noise)) * dates;
  const v = VENUE_TIERS[clamp(tier, 0, 4)];
  const revenue = Math.round(attendance * money(s, TICKET[v.id]) * ARTIST_SPLIT);
  act.gigSat = (act.gigSat ?? 0) + dates;
  const net = revenue - est.cost;
  const c = act.contractId ? s.contracts[act.contractId] : undefined;
  if (act.playerBand) {
    post(s, `gigs:${act.id}`, revenue, 'live', `Shows ${act.name}`);
    post(s, `gigcost:${act.id}`, -est.cost, 'live_costs', `Custos de shows ${act.name}`);
  } else if (c && c.party === 'player' && c.model === '360') {
    const share = Math.round(net * c.share360);
    post(s, `gig360:${act.id}`, share, 'live', `360: shows ${act.name}`);
    act.cash += net - share;
  } else {
    act.cash += net;
  }
  // só parte do público é nova
  act.fans.casual += Math.round(attendance * 0.15);
  act.fans.active += Math.round(attendance * 0.05);
  act.fans.core += Math.round(attendance * 0.006);
  act.fame = clamp(act.fame + Math.log10(1 + attendance) * 0.08 * (1 - act.fame / 90), 0, 100);
  act.momentum = clamp(act.momentum + 2 + v.id, 0, 100);
  for (const id of act.members) {
    const p = s.persons[id];
    if (!p) continue;
    p.fatigue = clamp(p.fatigue + est.fatigue / Math.max(1, 1) * (actHasTrait(s, act, 'disciplined') ? 0.85 : 1), 0, 100);
    p.skills.stage = Math.min(p.potential + 4, p.skills.stage + 0.3 * dates / 4);
    p.morale = clamp(p.morale + (attendance / dates > est.capacity * 0.7 ? 3 : -2), 0, 100);
  }
  const st = actState(s, act);
  // incidentes de palco
  if (r.chance(0.02 * dates + st.fatigue / 800)) {
    const kind = r.pick(['equipment', 'delay', 'fight', 'cancel'] as const);
    const msg = {
      equipment: l('falha de equipamento no show de {act}', 'equipment failure at a {act} show'),
      delay: l('atraso de duas horas num show de {act}', 'two-hour delay at a {act} show'),
      fight: l('briga no palco durante show de {act}', 'onstage fight during a {act} show'),
      cancel: l('cancelamento de última hora de {act}', 'last-minute cancellation by {act}'),
    }[kind];
    act.momentum = clamp(act.momentum - 6, 0, 100);
    remember(s, 'stage_incident', fmtL(msg, { act: act.name }), { actId: act.id });
    notify(s, fmtL(l('Incidente: {m}.', 'Incident: {m}.'), { m: fmtL(msg, { act: act.name }) }), 'bad');
  }
  remember(s, 'gigs', fmtL(l('{act} fez {d} show(s) em {v}: {n} pessoas.', '{act} played {d} show(s) at {v}: {n} people.'), { act: act.name, d: dates, v: v.name, n: attendance }), { actId: act.id });
}

/** Convites de festival no verão do hemisfério norte; vagas por adequação, prestígio e rede. */
export function festivalSlot(s: GameState, act: Act, prestige: number): 'headline' | 'afternoon' | 'opening' | null {
  const score = act.fame + act.networking * 0.5 + staffSkill(s, 'booking') / 8 + (hasCard(s, 'showman') ? 8 : 0);
  if (score >= prestige + 5) return 'headline';
  if (score >= prestige - 25) return 'afternoon';
  if (score >= prestige - 50) return 'opening';
  return null;
}
