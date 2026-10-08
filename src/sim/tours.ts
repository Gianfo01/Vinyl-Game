// Turnês com granularidade diária (GDD §21, §37, §42.7): rota por cidades, deslocamento, setlist,
// produção de palco, abertura/co-headline, bilheteria e merch por cidade, logística de equipe,
// clima, vistos, acidentes e cancelamentos. Logística é reservada no início; cancelar devolve metade
// do que não foi executado.

import { clamp, type Rng } from '../core/rng';
import { VENUE_TIERS } from '../data/rules';
import { cityById, l, type L } from '../data/world';
import { actTalent } from './people';
import type { Act, GameState } from './types';
import type { Tour, TourStop } from './xtypes';
import { dateOfDay, fmtL, hasTech, money, nextId, post, remember, staffSkill } from './util';
import { activeMembers, checkCapacity, monthIndex } from './capacity';
import { legInfo, climateInfo } from './travelAdapter';
import { clubBonus, liveBlocked } from './culture';
import { branchCityBonus } from './branches';

const TICKET = [12, 25, 45, 70, 95];
const PRODUCTION_COST = [0, 400, 1500, 6000]; // por show
const PRODUCTION_BONUS = [0, 0.06, 0.14, 0.25];

export interface TourPlan {
  actId: string;
  cities: string[];
  startInDays: number;
  tier?: number; // -1/undefined = automático por cidade
  priceMult: number;
  minutes: Tour['minutes'];
  setlist: string[];
  production: number;
  role: Tour['role'];
  partnerActId?: string;
  crew: number;
  pay: Tour['pay'];
  name?: string;
}

/** Público potencial numa cidade: fãs locais + regionais, saturação de visitas recentes. */
export function cityDemand(s: GameState, act: Act, cityId: string): number {
  const city = cityById[cityId];
  if (!city) return 0;
  const home = cityById[act.city];
  const total = act.fans.core * 0.9 + act.fans.active * 0.35 + act.fans.casual * 0.03;
  let share = 0.05;
  if (cityId === act.city) share = 0.35;
  else if (home && city.market === home.market) share = 0.14;
  else if (s.player.territories.includes(city.market)) share = 0.06;
  const scene = s.scenes[`${cityId}:${act.genre}`] ?? 0;
  const last = s.flags[`played:${act.id}:${cityId}`];
  const sat = last !== undefined ? clamp((s.week - last) / 26, 0.35, 1) : 1;
  return Math.round(total * share * (1 + act.fame / 70) * (1 + Math.min(0.4, scene / 30)) * sat * branchCityBonus(s, cityId));
}

export function autoTier(s: GameState, act: Act, demand: number): number {
  let t = 0;
  for (const v of VENUE_TIERS) if (demand >= v.cap[0] * 0.6 && act.fame + staffSkill(s, 'booking') / 12 >= v.fameMin) t = v.id;
  return t;
}

export interface TourEstimate {
  stops: TourStop[];
  logistics: number;
  expectedRevenue: number;
  expectedMerch: number;
  days: number;
  visas: number;
  warnings: L[];
  km: number;
}

export function estimateTour(s: GameState, p: TourPlan): TourEstimate {
  const act = s.acts[p.actId];
  const warnings: L[] = [];
  const stops: TourStop[] = [];
  let day = s.day + s.clock.dayInMonth + Math.max(7, p.startInDays);
  let prev = s.location[act.id] ?? act.city;
  let logistics = 0;
  let revenue = 0;
  let merch = 0;
  let visas = 0;
  let km = 0;
  const crew = Math.max(1, p.crew);
  const people = activeMembers(s, act).length + crew;
  p.cities.forEach((cityId, i) => {
    const leg = legInfo(s, prev, cityId, people);
    km += leg.km;
    day += leg.days;
    if (i > 0 && i % 4 === 0) day += 1; // folga contratada
    const demand = cityDemand(s, act, cityId) * (p.role === 'opening' ? 0.3 : p.role === 'co' ? 1.2 : 1);
    const tier = p.tier !== undefined && p.tier >= 0 ? clamp(p.tier, 0, 4) : autoTier(s, act, demand);
    const v = VENUE_TIERS[tier];
    const capacity = Math.round((v.cap[0] + v.cap[1]) / 2);
    const price = money(s, TICKET[tier] * p.priceMult);
    const sold = Math.min(capacity, Math.round(demand * (1 + PRODUCTION_BONUS[p.production]) / Math.pow(p.priceMult, 1.2)));
    if (demand < 30) warnings.push(fmtL(l('{c}: público local muito baixo.', '{c}: very low local audience.'), { c: cityById[cityId]?.name ?? cityId }));
    if (leg.visa?.needed) {
      visas += 1;
      logistics += leg.visa.cost;
      if (leg.visa.denyChance > 0.3) warnings.push(fmtL(l('{c}: visto difícil ({p}% de recusa).', '{c}: hard visa ({p}% refusal).'), { c: cityById[cityId]?.name ?? cityId, p: Math.round(leg.visa.denyChance * 100) }));
    }
    logistics += leg.cost + money(s, (v.cost + 90 * people + PRODUCTION_COST[p.production]) * (1 - staffSkill(s, 'tour_manager') / 400));
    revenue += sold * price;
    merch += Math.round(sold * money(s, 3 + tier) * 0.6);
    stops.push({ cityId, day, tier, price, capacity, sold: 0, merch: 0, status: 'scheduled', travelDays: leg.days, visa: !!leg.visa?.needed });
    prev = cityId;
    day += 1;
  });
  return { stops, logistics, expectedRevenue: revenue, expectedMerch: merch, days: day - (s.day + s.clock.dayInMonth), visas, warnings, km };
}

function monthOfDay(s: GameState, day: number): number {
  const d = dateOfDay(s.config.startYear, day);
  return d.year * 12 + d.month;
}

export function planTour(s: GameState, p: TourPlan): Tour | L {
  const act = s.acts[p.actId];
  if (!act || (act.owner !== 'player' && !act.playerBand)) return l('Ato não é seu.', 'Not your act.');
  if (!p.cities.length) return l('Escolha ao menos uma cidade.', 'Pick at least one city.');
  if (s.tours.some((t) => t.actId === act.id && (t.status === 'planned' || t.status === 'running'))) return l('Já existe uma turnê marcada.', 'A tour is already booked.');
  const est = estimateTour(s, p);
  // capacidade: dias por mês
  const perMonth: Record<number, number> = {};
  for (const st of est.stops) perMonth[monthOfDay(s, st.day)] = (perMonth[monthOfDay(s, st.day)] ?? 0) + 1 + st.travelDays;
  for (const [m, d] of Object.entries(perMonth)) {
    const load = Math.min(100, Math.round(((d + 4) / 28) * 100));
    const c = checkCapacity(s, activeMembers(s, act), Number(m), 1, load);
    if (c) return c.text;
  }
  if (p.partnerActId && !s.acts[p.partnerActId]) return l('Parceiro inválido.', 'Invalid partner.');
  if (s.player.cash < est.logistics) return l('Caixa insuficiente para reservar a logística.', 'Not enough cash to book logistics.');
  const tour: Tour = {
    id: nextId(s, 'tr'), actId: act.id, name: p.name?.trim() || fmtL(l('Turnê {y}', '{y} Tour'), { y: s.year }).pt, stops: est.stops, setlist: p.setlist, minutes: p.minutes,
    production: p.production, role: p.role, partnerActId: p.partnerActId, crew: p.crew, pay: p.pay, costReserved: est.logistics, revenue: 0, costs: est.logistics, status: 'planned', log: [], accidents: 0,
  };
  post(s, `tour:${tour.id}`, -est.logistics, 'live_costs', `Logística ${tour.name}`);
  s.tours.push(tour);
  remember(s, 'tour_planned', fmtL(l('{a} anuncia {t}: {n} cidades.', '{a} announces {t}: {n} cities.'), { a: act.name, t: tour.name, n: tour.stops.length }), { actId: act.id });
  return tour;
}

export function cancelTour(s: GameState, tourId: string): L | null {
  const t = s.tours.find((x) => x.id === tourId);
  if (!t || t.status === 'done' || t.status === 'cancelled') return l('Turnê inválida.', 'Invalid tour.');
  const left = t.stops.filter((x) => x.status === 'scheduled').length;
  const refund = Math.round((t.costReserved * left) / Math.max(1, t.stops.length) * 0.5);
  if (refund) post(s, `tourcancel:${t.id}`, refund, 'live_costs', `Cancelamento ${t.name}`);
  for (const st of t.stops) if (st.status === 'scheduled') st.status = 'cancelled';
  t.status = 'cancelled';
  const act = s.acts[t.actId];
  if (act && left) {
    act.image && (act.image.professionalism = clamp(act.image.professionalism - 4, 0, 100));
    for (const id of act.members) if (s.persons[id]) s.persons[id].morale = clamp(s.persons[id].morale - 3, 0, 100);
  }
  return null;
}

function setlistQuality(s: GameState, t: Tour): { q: number; coverPenalty: number } {
  const songs = t.setlist.map((id) => s.songs[id]).filter((x) => x?.recorded);
  const need = Math.ceil(t.minutes / 4);
  const q = songs.length ? songs.reduce((x, y) => x + y.q, 0) / songs.length : 35;
  const coverPenalty = songs.length >= need ? 1 : 0.75 + 0.25 * (songs.length / need);
  return { q, coverPenalty };
}

/** Um dia de turnê: viagem ou show na data marcada. */
export function tourDay(s: GameState, r: Rng, day: number): void {
  for (const t of s.tours) {
    if (t.status !== 'planned' && t.status !== 'running') continue;
    const st = t.stops.find((x) => x.day === day && x.status === 'scheduled');
    if (!st) continue;
    const act = s.acts[t.actId];
    if (!act || act.status === 'retired' || act.status === 'split') {
      t.status = 'cancelled';
      continue;
    }
    t.status = 'running';
    s.location[act.id] = st.cityId;
    const cityL = cityById[st.cityId]?.name ?? l(st.cityId);
    const blocked = liveBlocked(s, st.cityId);
    if (blocked) {
      st.status = 'cancelled';
      st.note = blocked.name;
      s.daily.push({ day, kind: 'tour', actId: act.id, tone: 'bad', text: fmtL(l('{a}: show em {c} suspenso ({w}).', '{a}: show in {c} suspended ({w}).'), { a: act.name, c: cityL, w: blocked.name }) });
      continue;
    }
    // visto negado (rota internacional controlada)
    if (st.visa) {
      const leg = legInfo(s, t.stops[t.stops.indexOf(st) - 1]?.cityId ?? act.city, st.cityId, 1);
      if (leg.visa?.boycott) s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100);
      if (leg.visa && r.chance(leg.visa.denyChance)) {
        st.status = 'cancelled';
        st.note = l('visto negado', 'visa denied');
        s.daily.push({ day, kind: 'tour', actId: act.id, tone: 'bad', text: fmtL(l('{a}: visto negado para {c}. Show cancelado.', '{a}: visa denied for {c}. Show cancelled.'), { a: act.name, c: cityL }) });
        continue;
      }
    }
    const month = dateOfDay(s.config.startYear, day).month;
    const clim = climateInfo(s, st.cityId, month);
    const t2 = actTalent(s, act);
    const fatigue = activeMembers(s, act).reduce((x, id) => x + (s.persons[id]?.fatigue ?? 0), 0) / Math.max(1, act.members.length);
    // acidentes e cancelamentos: fadiga, produção complexa, clima, pouca equipe
    const risk = 0.006 + fatigue / 2500 + t.production * 0.004 + clim.cancelRisk + Math.max(0, 3 - t.crew) * 0.004;
    if (r.chance(risk)) {
      const kind = r.pick(['storm', 'injury', 'stage', 'power'] as const);
      const text = {
        storm: l('tempestade derrubou a estrutura', 'a storm brought down the rig'),
        injury: l('um integrante se machucou no palco', 'a member got hurt on stage'),
        stage: l('o palco cedeu na montagem', 'the stage gave way during setup'),
        power: l('apagão na casa de shows', 'power outage at the venue'),
      }[kind];
      st.status = 'cancelled';
      st.note = text;
      t.accidents += 1;
      if (kind === 'injury') {
        const p = s.persons[r.pick(activeMembers(s, act))];
        if (p) p.health = 'recovering';
      }
      act.image && (act.image.professionalism = clamp(act.image.professionalism - 2, 0, 100));
      s.daily.push({ day, kind: 'tour', actId: act.id, tone: 'bad', text: fmtL(l('{a} em {c}: {x}. Show cancelado.', '{a} in {c}: {x}. Show cancelled.'), { a: act.name, c: cityL, x: text }) });
      remember(s, 'tour_accident', fmtL(l('Acidente na turnê de {a} em {c}: {x}.', 'Accident on {a}\'s tour in {c}: {x}.'), { a: act.name, c: cityL, x: text }), { actId: act.id });
      continue;
    }
    const { q, coverPenalty } = setlistQuality(s, t);
    const demand = cityDemand(s, act, st.cityId) * (t.role === 'opening' ? 0.3 : 1);
    const partner = t.partnerActId ? s.acts[t.partnerActId] : undefined;
    const partnerDraw = partner ? cityDemand(s, partner, st.cityId) * (t.role === 'co' ? 0.8 : 1) : 0;
    const quality = clubBonus(s, st.cityId) * (0.75 + q / 200 + t2.stage / 250) * coverPenalty * (1 + PRODUCTION_BONUS[t.production]) * clim.outdoorFactor;
    const priceMult = st.price / Math.max(1, money(s, TICKET[st.tier]));
    let sold = Math.min(st.capacity, Math.round((demand + partnerDraw * (t.role === 'opening' ? 1 : 0.5)) * quality / Math.pow(priceMult, 1.2) * r.float(0.85, 1.12)));
    sold = Math.max(0, sold);
    st.sold = sold;
    st.status = 'played';
    const gross = sold * st.price;
    // pagamento: bilheteria 65% líquida / cachê fixo / garantia + 45%
    const forecast = Math.round(Math.min(st.capacity, demand) * st.price * 0.5);
    let pay = t.pay === 'door' ? Math.round(gross * 0.65) : t.pay === 'guarantee' ? Math.round(forecast * 0.8) : Math.round(forecast * 0.4 + gross * 0.45);
    if (t.role === 'opening') pay = Math.round(money(s, 150 + act.fame * 20));
    if (t.role === 'co') pay = Math.round(pay * 0.5);
    const mq = s.merch[act.id]?.quality ?? 40;
    const merch = Math.round(sold * money(s, 2 + st.tier) * (0.3 + mq / 120));
    st.merch = merch;
    if (s.merch[act.id]) {
      s.merch[act.id].sold += Math.round(sold * 0.12);
      s.merch[act.id].revenue += merch;
    }
    t.revenue += pay + merch;
    const c = act.contractId ? s.contracts[act.contractId] : undefined;
    if (act.playerBand || (c && c.party === 'player' && c.model === '360')) {
      const share = act.playerBand ? 1 : c!.share360;
      post(s, `show:${t.id}:${st.day}`, Math.round((pay + merch) * share), 'live', `Show ${act.name} — ${cityL.pt}`);
      if (!act.playerBand) act.cash += Math.round((pay + merch) * (1 - share));
    } else {
      // gravadora clássica: a bilheteria é do artista; o selo pagou a logística como investimento de carreira
      act.cash += pay + merch;
    }
    // público, fama e cena
    act.fans.casual += Math.round(sold * 0.16);
    act.fans.active += Math.round(sold * 0.05);
    act.fans.core += Math.round(sold * 0.007);
    act.fame = clamp(act.fame + Math.log10(1 + sold) * 0.05 * (1 - act.fame / 95), 0, 100);
    s.scenes[`${st.cityId}:${act.genre}`] = (s.scenes[`${st.cityId}:${act.genre}`] ?? 0) + sold / 4000;
    s.flags[`played:${act.id}:${st.cityId}`] = s.week;
    if (partner && t.role === 'opening') partner.fans.casual += Math.round(sold * 0.02);
    for (const id of act.members) {
      const p = s.persons[id];
      if (!p?.alive) continue;
      p.fatigue = clamp(p.fatigue + 2.5 + st.travelDays * 0.8 - t.crew * 0.15, 0, 100);
      p.skills.stage = Math.min(p.potential + 4, p.skills.stage + 0.08);
      p.morale = clamp(p.morale + (sold > st.capacity * 0.8 ? 1.5 : -0.5), 0, 100);
    }
    s.daily.push({
      day, kind: 'tour', actId: act.id, tone: sold > st.capacity * 0.8 ? 'good' : sold < st.capacity * 0.3 ? 'bad' : 'neutral',
      text: fmtL(l('{a} em {c}: {n}/{cap} ingressos, clima {w}.', '{a} in {c}: {n}/{cap} tickets, {w} weather.'), { a: act.name, c: cityL, n: sold, cap: st.capacity, w: clim.label }),
    });
    // virada de carreira: show forte com reconhecimento baixo (GDD §46.6)
    if (act.fame < 25 && sold >= st.capacity * 0.95 && st.tier >= 2 && r.chance(0.25)) {
      act.momentum = clamp(act.momentum + 20, 0, 100);
      remember(s, 'breakthrough_show', fmtL(l('Show histórico de {a} em {c} vira assunto na cidade.', '{a}\'s legendary show in {c} becomes the talk of the town.'), { a: act.name, c: cityL }), { actId: act.id, important: true });
    }
  }
  // fim de turnê
  for (const t of s.tours) {
    if (t.status !== 'running') continue;
    if (t.stops.every((x) => x.status !== 'scheduled')) {
      t.status = 'done';
      const act = s.acts[t.actId];
      const played = t.stops.filter((x) => x.status === 'played');
      const people = played.reduce((x, y) => x + y.sold, 0);
      if (act) {
        s.flags[`toured:${act.id}`] = s.week;
        s.location[act.id] = act.city;
        remember(s, 'tour_done', fmtL(l('{a} encerra {t}: {n} shows, {p} pessoas.', '{a} wraps {t}: {n} shows, {p} people.'), { a: act.name, t: t.name, n: played.length, p: people }), { actId: act.id, important: people > 50000 });
        if (people > 100000 && (act.owner === 'player' || act.playerBand)) s.player.stats.headlines += 1;
      }
    }
  }
}

export function toursCleanup(s: GameState): void {
  s.tours = s.tours.filter((t) => t.status === 'planned' || t.status === 'running' || s.day - (t.stops.at(-1)?.day ?? 0) < 400).slice(-25);
}

export function tourEligibleLive(s: GameState, actId: string): boolean {
  return s.tours.some((t) => t.actId === actId && t.status === 'done');
}

export function tourMonthIdx(s: GameState): number {
  return monthIndex(s);
}

export function canHologram(s: GameState): boolean {
  return hasTech(s, 'synthetic_voice');
}
