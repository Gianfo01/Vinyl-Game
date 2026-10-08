// Casa de shows própria (agenda, aluguel a terceiros, bar, acústica), residência em cassino para
// veteranos e megaeventos beneficentes globais (modelo 1985).

import { clamp, type Rng } from '../../../core/rng';
import { cityById, l, type L } from '../../../data/world';
import { emitEvent, registerEvents, type EventDef } from '../../events';
import { applyMods, registerMod, registerSimHook } from '../../ext4';
import { gigEstimate } from '../../live';
import type { Act, GameState } from '../../types';
import { fmtL, money, nextId, notify, playerActs, post, remember } from '../../util';
import { monthIndex } from '../../capacity';
import { bump, isMine, liveOf, liveShare, type OwnVenue, type Residency } from './state';

void applyMods;

export const VENUE_KINDS: { id: OwnVenue['kind']; name: L; cap: number; price: number; upkeep: number; rent: number; minYear: number }[] = [
  { id: 'club', name: l('Clube', 'Club'), cap: 400, price: 60000, upkeep: 2500, rent: 700, minYear: 1920 },
  { id: 'theater', name: l('Teatro', 'Theatre'), cap: 2500, price: 600000, upkeep: 16000, rent: 6500, minYear: 1920 },
  { id: 'arena', name: l('Arena', 'Arena'), cap: 15000, price: 6000000, upkeep: 90000, rent: 42000, minYear: 1960 },
];
export const venueKind = (k: OwnVenue['kind']) => VENUE_KINDS.find((x) => x.id === k)!;

export function upgradeCost(s: GameState, v: OwnVenue, what: 'bar' | 'acoustics'): number {
  return money(s, venueKind(v.kind).price * 0.06 * (1 + v[what]));
}

export function buyVenue(s: GameState, kind: OwnVenue['kind'], cityId: string, name: string): OwnVenue | L {
  const lv = liveOf(s);
  if (lv.venue) return l('Você já tem uma casa de shows.', 'You already own a venue.');
  const k = venueKind(kind);
  if (s.year < k.minYear) return l('Ainda não existem arenas desse porte.', 'Arenas of that size don\'t exist yet.');
  if (!cityById[cityId]) return l('Cidade inválida.', 'Invalid city.');
  const price = money(s, k.price);
  if (s.player.cash < price) return l('Caixa insuficiente.', 'Not enough cash.');
  const v: OwnVenue = { kind, cityId, name: name.trim() || `${k.name.pt} ${cityById[cityId].name.pt}`, bar: 0, acoustics: 0, rentalNights: 8, ownNights: 0, boughtYear: s.year, price, history: [] };
  post(s, `venuebuy:${kind}:${cityId}`, -price, 'investments', `Compra: ${v.name}`);
  lv.venue = v;
  remember(s, 'venue_bought', fmtL(l('O selo compra {v} em {c}.', 'The label buys {v} in {c}.'), { v: v.name, c: cityById[cityId].name }), { important: true });
  bump(s, 'venues');
  return v;
}

export function upgradeVenue(s: GameState, what: 'bar' | 'acoustics'): L | null {
  const v = liveOf(s).venue;
  if (!v) return l('Sem casa de shows.', 'No venue.');
  if (v[what] >= 3) return l('Já está no máximo.', 'Already maxed out.');
  const cost = upgradeCost(s, v, what);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `venueup:${what}:${v[what]}`, -cost, 'investments', `Reforma (${what}) ${v.name}`);
  v[what] += 1;
  return null;
}

export function setVenueAgenda(s: GameState, rentalNights: number, ownActId: string | undefined, ownNights: number): void {
  const v = liveOf(s).venue;
  if (!v) return;
  v.ownActId = ownActId && isMine(s, ownActId) ? ownActId : undefined;
  v.ownNights = v.ownActId ? clamp(Math.round(ownNights), 0, 8) : 0;
  v.rentalNights = clamp(Math.round(rentalNights), 0, 26 - v.ownNights);
}

export function sellVenue(s: GameState): L | null {
  const lv = liveOf(s);
  const v = lv.venue;
  if (!v) return l('Sem casa de shows.', 'No venue.');
  post(s, `venuesell:${v.kind}:${v.cityId}`, Math.round(v.price * 0.6), 'asset_sales', `Venda: ${v.name}`);
  lv.venue = null;
  return null;
}

/** Ocupação esperada nas noites de aluguel (cena local, acústica, reputação). */
export function rentalOccupancy(s: GameState, v: OwnVenue): number {
  const city = cityById[v.cityId];
  const scene = city ? city.scenes.reduce((t, g) => t + (s.scenes[`${v.cityId}:${g}`] ?? 0), 0) : 0;
  return clamp(0.32 + Math.min(0.25, scene / 40) + v.acoustics * 0.08 + s.player.reputation.artistic / 500, 0.15, 0.95);
}

export function venueMonthEstimate(s: GameState, v: OwnVenue): { rent: number; bar: number; own: number; upkeep: number; occupancy: number; ownAttendance: number } {
  const k = venueKind(v.kind);
  const occ = rentalOccupancy(s, v);
  const rent = Math.round(v.rentalNights * money(s, k.rent) * occ);
  let ownAttendance = 0;
  let own = 0;
  const act = v.ownActId ? s.acts[v.ownActId] : undefined;
  if (act && v.ownNights) {
    const tier = k.cap >= 5000 ? 3 : k.cap >= 1500 ? 2 : 0;
    const est = gigEstimate(s, act, tier, v.ownNights);
    ownAttendance = Math.min(k.cap, est.perDate) * v.ownNights;
    own = Math.round(ownAttendance * money(s, [12, 25, 45, 70, 95][tier]) * (0.4 + 0.6 * liveShare(s, act.id)));
  }
  const nights = v.rentalNights * occ * k.cap + ownAttendance;
  const bar = Math.round(nights * money(s, 2 + v.bar * 1.5) * 0.5);
  return { rent, bar, own, upkeep: money(s, k.upkeep), occupancy: occ, ownAttendance };
}

function venueMonth(s: GameState, r: Rng): void {
  const v = liveOf(s).venue;
  if (!v) return;
  const e = venueMonthEstimate(s, v);
  const noise = r.float(0.85, 1.1);
  const revenue = Math.round((e.rent + e.bar + e.own) * noise);
  post(s, `venue:rev`, revenue, 'live', `Casa de shows ${v.name}`);
  post(s, `venue:cost`, -e.upkeep, 'live_costs', `Manutenção ${v.name}`);
  const act = v.ownActId ? s.acts[v.ownActId] : undefined;
  if (act && e.ownAttendance) {
    act.fans.casual += Math.round(e.ownAttendance * 0.1);
    act.fans.active += Math.round(e.ownAttendance * 0.02);
    for (const id of act.members) if (s.persons[id]) s.persons[id].fatigue = clamp(s.persons[id].fatigue + v.ownNights * 1.2, 0, 100);
    if (!act.playerBand && liveShare(s, act.id) < 1) act.cash += Math.round(e.own * 0.5);
  }
  v.history.push({ year: s.year, month: s.month, revenue, costs: e.upkeep, occupancy: Math.round(e.occupancy * 100) });
  if (v.history.length > 12) v.history.splice(0, v.history.length - 12);
  bump(s, 'venueMonths');
}

// ---------------------------------------------------------------- residência em cassino

export const RESIDENCY_MIN_YEARS = 12;

export function residencyCity(s: GameState, act: Act): string {
  return s.year >= 1946 && cityById.las_vegas ? 'las_vegas' : act.city;
}

export function residencyEligible(s: GameState, act: Act): L | null {
  if (!isMine(s, act.id)) return l('Ato não é seu.', 'Not your act.');
  if (s.year - act.debutYear < RESIDENCY_MIN_YEARS) return fmtL(l('Só para veteranos ({n}+ anos de carreira).', 'Veterans only ({n}+ career years).'), { n: RESIDENCY_MIN_YEARS });
  if (act.fame < 25) return l('Fama insuficiente para lotar um cassino.', 'Not famous enough to fill a casino.');
  if (liveOf(s).residencies.some((x) => x.actId === act.id && x.status === 'active')) return l('Já em residência.', 'Already in residency.');
  return null;
}

/** Noite de residência: público fiel, sem viagem. Valor por noite para o selo. */
export function residencyNight(s: GameState, act: Act): { attendance: number; gross: number } {
  const draw = (act.fans.core * 0.5 + act.fans.active * 0.15 + act.fans.casual * 0.01) * (1 + act.fame / 100);
  const attendance = Math.round(clamp(draw / 6, 300, 4000));
  return { attendance, gross: Math.round(attendance * money(s, 55)) };
}

export function startResidency(s: GameState, actId: string, months: number): Residency | L {
  const act = s.acts[actId];
  if (!act) return l('Inválido.', 'Invalid.');
  const why = residencyEligible(s, act);
  if (why) return why;
  if (s.tours.some((t) => t.actId === actId && (t.status === 'planned' || t.status === 'running'))) return l('Termine a turnê antes.', 'Finish the tour first.');
  const res: Residency = { id: nextId(s, 'rz'), actId, cityId: residencyCity(s, act), startMonth: monthIndex(s) + 1, months: clamp(Math.round(months), 3, 24), nights: 12, earned: 0, status: 'active' };
  liveOf(s).residencies.push(res);
  // ocupa a capacidade da formação nos meses da residência
  s.plans.push({ id: nextId(s, 'pl'), actId, personIds: act.members.filter((id) => s.persons[id]?.alive), action: 'residency', startMonth: res.startMonth, months: res.months, load: 55, status: 'planned', costEst: 0 });
  remember(s, 'residency', fmtL(l('{a} assina residência de {m} meses em {c}.', '{a} signs a {m}-month residency in {c}.'), { a: act.name, m: res.months, c: cityById[res.cityId]?.name ?? res.cityId }), { actId, important: true });
  return res;
}

export function cancelResidency(s: GameState, id: string): void {
  const res = liveOf(s).residencies.find((x) => x.id === id);
  if (!res || res.status !== 'active') return;
  res.status = 'cancelled';
  const p = s.plans.find((x) => x.actId === res.actId && x.action === 'residency' && (x.status === 'planned' || x.status === 'started'));
  if (p) p.status = 'cancelled';
}

function residencyMonth(s: GameState): void {
  const now = monthIndex(s);
  const lv = liveOf(s);
  for (const res of lv.residencies) {
    if (res.status !== 'active' || now < res.startMonth) continue;
    const act = s.acts[res.actId];
    if (!act || act.status === 'retired' || act.status === 'split') {
      res.status = 'cancelled';
      continue;
    }
    const n = residencyNight(s, act);
    const gross = n.gross * res.nights;
    const share = liveShare(s, act.id);
    // contrato clássico: o selo fica com a comissão de agenciamento (15%)
    const mine = share > 0 ? Math.round(gross * 0.6 * share) : Math.round(gross * 0.15);
    post(s, `resid:${res.id}`, mine, 'live', `Residência ${act.name}`);
    act.cash += Math.round(gross * 0.6) - (share > 0 ? mine : 0);
    res.earned += mine;
    act.fans.core += Math.round(n.attendance * res.nights * 0.002);
    act.momentum = clamp(act.momentum - 1, 0, 100);
    for (const id of act.members) if (s.persons[id]) s.persons[id].inspiration = clamp(s.persons[id].inspiration - 2, 0, 100);
    bump(s, 'residencyMonths');
    if (now >= res.startMonth + res.months - 1) {
      res.status = 'done';
      remember(s, 'residency_done', fmtL(l('{a} encerra a residência em {c}.', '{a} ends the residency in {c}.'), { a: act.name, c: cityById[res.cityId]?.name ?? res.cityId }), { actId: act.id });
    }
  }
  if (lv.residencies.length > 12) lv.residencies = lv.residencies.filter((x) => x.status === 'active').concat(lv.residencies.filter((x) => x.status !== 'active').slice(-6));
}

// ---------------------------------------------------------------- megaeventos beneficentes

export const MEGA_EVENTS: { year: number; name: L; city: string }[] = [
  { year: 1971, name: l('Concerto pela Ilha das Monções', 'Concert for Monsoon Island'), city: 'new_york' },
  { year: 1985, name: l('Earth Aid — transmissão global', 'Earth Aid — global broadcast'), city: 'london' },
  { year: 1988, name: l('Show pela Liberdade', 'Freedom Concert'), city: 'london' },
  { year: 1992, name: l('Tributo Arco-Íris', 'Rainbow Tribute'), city: 'london' },
  { year: 2005, name: l('Earth Aid 8', 'Earth Aid 8'), city: 'berlin' },
  { year: 2007, name: l('Planeta Vivo', 'Living Planet'), city: 'sydney' },
  { year: 2020, name: l('Juntos em Casa (virtual)', 'Together at Home (virtual)'), city: 'los_angeles' },
  { year: 2033, name: l('Concerto pelo Clima', 'Climate Concert'), city: 'rio' },
];

const MEGA_EVENT: EventDef = {
  id: 'live_mega_benefit', cat: 'stage', tone: 'good', tags: [], cooldown: 6, forcedOnly: true,
  title: l('Convite: {megaName}', 'Invitation: {megaName}'),
  text: l('{act} é convidado para o {megaName}, transmitido para o mundo todo. Sem cachê — só a causa, a vitrine e o catálogo.', '{act} is invited to {megaName}, broadcast worldwide. No fee — just the cause, the exposure and the catalog.'),
  options: [
    { id: 'accept', label: l('Aceitar (sem cachê)', 'Accept (no fee)'), hint: l('Reputação enorme e vendas de catálogo.', 'Huge reputation and catalog sales.'), apply: (s, _r, c) => {
      const a = s.acts[String(c.act)];
      if (!a) return;
      post(s, `mega:${a.id}`, -money(s, 2500), 'live_costs', `Viagem e produção: ${String(c.megaPt)}`);
      a.fame = clamp(a.fame + 5, 0, 100);
      a.fans.casual += Math.round(120000 * (1 + a.fame / 50));
      a.fans.active += Math.round(15000 * (1 + a.fame / 50));
      s.player.reputation.institutional = clamp(s.player.reputation.institutional + 8, 0, 100);
      s.player.reputation.artistic = clamp(s.player.reputation.artistic + 3, 0, 100);
      const lv = liveOf(s);
      lv.boosts[a.id] = s.week + 12;
      const m = lv.mega.find((x) => x.year === s.year && x.actId === a.id);
      if (m) m.accepted = true;
      bump(s, 'megaEvents');
      remember(s, 'mega_event', fmtL(l('{a} toca no {m} para o mundo inteiro.', '{a} plays {m} for the whole world.'), { a: a.name, m: { pt: String(c.megaPt), en: String(c.megaEn) } }), { actId: a.id, important: true });
    } },
    { id: 'decline', label: l('Recusar', 'Decline'), apply: (s) => { s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100); } },
  ],
};
registerEvents([MEGA_EVENT]);

registerMod('chartUnits', 'live-mega', (s, value, ctx) => {
  const rel = ctx.release;
  if (!rel) return null;
  const until = liveOf(s).boosts[rel.actId];
  if (!until || until < s.week || rel.week >= s.week - 1) return null;
  return { value: value * 1.25, label: l('Efeito do megaevento no catálogo', 'Mega-event catalog effect') };
});

function megaMonth(s: GameState, r: Rng): void {
  const lv = liveOf(s);
  for (const [k, w] of Object.entries(lv.boosts)) if (w < s.week) delete lv.boosts[k];
  if (s.month !== 5) return;
  const ev = MEGA_EVENTS.find((x) => x.year === s.year);
  if (!ev || lv.mega.some((x) => x.year === s.year)) return;
  const acts = playerActs(s).map((id) => s.acts[id]).filter((a) => a.fame >= 35).sort((a, b) => b.fame - a.fame);
  const a = acts[0];
  if (!a) return;
  void r;
  lv.mega.push({ year: s.year, name: ev.name.pt, actId: a.id });
  if (lv.mega.length > 10) lv.mega.splice(0, lv.mega.length - 10);
  emitEvent(s, r, MEGA_EVENT.id, { act: a.id, megaName: ev.name.pt, megaPt: ev.name.pt, megaEn: ev.name.en });
  notify(s, fmtL(l('Convite para o {m}!', 'Invitation to {m}!'), { m: ev.name }), 'event');
}

registerSimHook('month', 'live-venue', (s, r) => {
  venueMonth(s, r);
  residencyMonth(s);
  megaMonth(s, r);
});
