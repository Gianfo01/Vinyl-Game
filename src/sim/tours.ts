// Turnês com granularidade diária (GDD §21, §37, §42.7): rota por cidades, deslocamento, setlist,
// produção de palco, abertura/co-headline, bilheteria e merch por cidade, logística de equipe,
// clima, vistos, acidentes e cancelamentos. Logística é reservada no início; cancelar devolve metade
// do que não foi executado.
// r21 (F): a conta de público/bilheteria/cachê vive em showmath.ts (a previsão chama o acerto com ruído 1);
// a rota usa travel.planRoute (visto uma vez por país, prazo de processamento); o planejador recusa cidade em
// mercado com shows suspensos, início antes do prazo do visto e ato ocupado (isBusy).

import { clamp, type Rng } from '../core/rng';
import { VENUE_TIERS } from '../data/rules';
import { cityById, l, type L } from '../data/world';

import type { AgendaSlot, GameState } from './types';
import type { Tour, TourStop } from './xtypes';
import { dateOfDay, fmtL, hasTech, money, nextId, notify, post, remember, staffSkill } from './util';
import { activeMembers, checkCapacity, fitOverAgenda, monthIndex } from './capacity';
import { legInfo } from './travelAdapter';
import { planRoute } from './travel';
import { liveBlocked } from './culture';
import { applyMods, runSimHooks } from './ext4';
import { labelTake } from './sys/deal360_17';
import { TOUR18, type Kit18 } from './tourhook18';
import { cashWhy20, freeCash20 } from './oblig20';
import { PRODUCTION_COST, TICKET, autoTier, basePay, cityDemand, expectedGross, expectedStop, merchStand, showCalc, soldFrom } from './showmath';
import { isBusy, weekOfDay } from './sys/clash17';

export { TICKET, PRODUCTION_COST, cityDemand, autoTier } from './showmath';

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
  /** folga a cada N datas (padrão 4; 0 = sem folga) */
  restEvery?: number;
  /** r18: logística (transporte, hospedagem, seguro…); ausente = padrão */
  kit?: Kit18;
}

export interface TourEstimate {
  stops: TourStop[];
  logistics: number;
  /** bilheteria bruta prevista (depois dos modificadores de show — a mesma conta do acerto) */
  expectedRevenue: number;
  expectedMerch: number;
  /** r21: público previsto (soma das paradas) e cachê previsto do ato (porta/garantia/abertura, como no acerto) */
  expectedSold: number;
  expectedPay: number;
  days: number;
  visas: number;
  /** r21 (F-4): dias mínimos até a 1ª data (prazo do visto mais longo da rota) */
  minStartInDays: number;
  /** r21 (F-3): cidades em mercado com shows suspensos (motivo por cidade) */
  blocked: Record<string, L>;
  warnings: L[];
  km: number;
}

export function estimateTour(s: GameState, p: TourPlan): TourEstimate {
  const act = s.acts[p.actId];
  const warnings: L[] = [];
  const stops: TourStop[] = [];
  const blocked: Record<string, L> = {};
  const startIn = Math.max(7, p.startInDays);
  let day = s.day + s.clock.dayInMonth + startIn;
  const start = s.location[act.id] ?? act.city;
  let prev = start;
  let logistics = 0;
  let revenue = 0;
  let merch = 0;
  let sold = 0;
  let pay = 0;
  let visas = 0;
  let km = 0;
  let travel = 0;
  const tiers: number[] = [];
  const crew = Math.max(1, p.crew);
  const people = activeMembers(s, act).length + crew;
  // r21 (F-4): a rota inteira de uma vez — visto uma só vez por país, prazo de processamento, boicote
  const rp = planRoute(p.cities, start, s.year, dateOfDay(s.config.startYear, day).month, people, s.config.homeCity);
  let li = 0;
  p.cities.forEach((cityId, i) => {
    const rl = cityId !== prev && cityById[cityId] ? rp.legs[li++] : undefined;
    const leg = rl ? { km: rl.km, days: rl.days, cost: money(s, rl.costReal), visa: rl.visa.needed ? { cost: money(s, rl.visa.costReal), denyChance: rl.visa.denyChance } : undefined } : { km: 0, days: 0, cost: 0, visa: undefined };
    km += leg.km;
    travel += leg.cost;
    day += Math.round(leg.days); // datas em dias inteiros (viagens de meio dia não podem pular o show)
    const rest = p.restEvery ?? 4;
    if (rest > 0 && i > 0 && i % rest === 0) day += 1; // folga contratada
    const demand = cityDemand(s, act, cityId) * (p.role === 'opening' ? 0.3 : p.role === 'co' ? 1.2 : 1);
    const tier = p.tier !== undefined && p.tier >= 0 ? clamp(p.tier, 0, 4) : autoTier(s, act, demand);
    const v = VENUE_TIERS[tier];
    const capacity = Math.round((v.cap[0] + v.cap[1]) / 2);
    const price = money(s, TICKET[tier] * p.priceMult);
    if (demand < 30) warnings.push(fmtL(l('{c}: público local muito baixo.', '{c}: very low local audience.'), { c: cityById[cityId]?.name ?? cityId }));
    const blk = liveBlocked(s, cityId);
    if (blk) { blocked[cityId] = blk.name; warnings.push(fmtL(l('{c}: shows suspensos ({w}) — bloqueado.', '{c}: shows suspended ({w}) — blocked.'), { c: cityById[cityId]?.name ?? cityId, w: blk.name })); }
    if (leg.visa) {
      visas += 1;
      logistics += leg.visa.cost;
      if (leg.visa.denyChance > 0.3) warnings.push(fmtL(l('{c}: visto difícil ({p}% de recusa).', '{c}: hard visa ({p}% refusal).'), { c: cityById[cityId]?.name ?? cityId, p: Math.round(leg.visa.denyChance * 100) }));
    }
    logistics += leg.cost + money(s, (v.cost + 90 * people + PRODUCTION_COST[p.production]) * (1 - staffSkill(s, 'tour_manager') / 400));
    // r20 (B16): a previsão aplica a mesma concorrência de agenda que o acerto (TOUR18.clash, semana do dia do show)
    const clash = TOUR18.clash?.(s, act, cityId, day) ?? 1;
    if (clash < 0.92) warnings.push(fmtL(l('{c}: concorrência na agenda nessa semana (−{p}% na bilheteria).', '{c}: calendar competition that week (−{p}% box office).'), { c: cityById[cityId]?.name ?? cityId, p: Math.round((1 - clash) * 100) }));
    tiers.push(tier);
    stops.push({ cityId, day, tier, price, capacity, sold: 0, merch: 0, status: 'scheduled', travelDays: leg.days, visa: !!leg.visa });
    prev = cityId;
    day += 1;
  });
  const days = day - (s.day + s.clock.dayInMonth);
  const minStartInDays = rp.totals.leadDays;
  if (minStartInDays > startIn) warnings.push(fmtL(l('Visto: {n} dias de processamento — a turnê só pode começar em {n}+ dias.', 'Visa: {n} processing days — the tour can only start in {n}+ days.'), { n: minStartInDays }));
  // r21 (F-1): público, bilheteria e cachê previstos = a conta do acerto com ruído 1 (mesma turnê que será marcada)
  const draft: Tour = {
    id: 'draft', actId: act.id, name: '', stops, setlist: p.setlist, minutes: p.minutes, production: p.production, role: p.role, partnerActId: p.partnerActId,
    crew, pay: p.pay, costReserved: 0, revenue: 0, costs: 0, status: 'planned', log: [], accidents: 0, kit18: TOUR18.effKit?.(s, p.kit, people, act.fame) ?? p.kit,
  };
  for (const st of stops) {
    const e = expectedStop(s, act, draft, st);
    sold += e.sold; revenue += e.gross; pay += e.pay;
    merch += merchStand(s, act, e.sold, false);
  }
  if (TOUR18.kit) { const k = TOUR18.kit(s, p.kit, { people, km, travel, shows: stops.length, days, tiers, gross: revenue, fame: act.fame, members: activeMembers(s, act).length }); logistics += k.total; warnings.push(...k.warn); }
  return { stops, logistics, expectedRevenue: revenue, expectedMerch: merch, expectedSold: sold, expectedPay: pay, days, visas, minStartInDays, blocked, warnings, km };
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
  // r21 (F-3): cidade em mercado com shows suspensos não entra (antes cancelava no dia, sem reembolso)
  const blk = Object.entries(est.blocked)[0];
  if (blk) return fmtL(l('{c}: shows suspensos ({w}). Tire a cidade da rota.', '{c}: shows suspended ({w}). Remove the city from the route.'), { c: cityById[blk[0]]?.name ?? blk[0], w: blk[1] });
  // r21 (F-4): o visto mais lento da rota precisa estar pronto antes da 1ª data
  if (est.minStartInDays > Math.max(7, p.startInDays)) return fmtL(l('Visto leva {n} dias: comece a turnê em {n}+ dias.', 'Visa takes {n} days: start the tour in {n}+ days.'), { n: est.minStartInDays });
  // r21 (F-6): um só calendário — festival, data de agente/promotor, residência, intercâmbio ou hiato na semana
  for (const st of est.stops) { const busy = isBusy(s, act, weekOfDay(st.day)); if (busy) return busy; }
  // capacidade: dias por mês
  const perMonth: Record<number, number> = {};
  for (const st of est.stops) perMonth[monthOfDay(s, st.day)] = (perMonth[monthOfDay(s, st.day)] ?? 0) + 1 + st.travelDays;
  // rodada 16: no mês corrente a turnê toma o lugar da agenda do próprio ato (shows locais, entrevistas...) em vez de recusar
  let agendaKeep: AgendaSlot[] | null = null;
  for (const [m, d] of Object.entries(perMonth)) {
    const load = Math.min(100, Math.round(((d + 4) / 28) * 100));
    const chk = () => checkCapacity(s, activeMembers(s, act), Number(m), 1, load);
    if (Number(m) === monthIndex(s)) {
      const f = fitOverAgenda(s, act.id, chk, () => false);
      if (f.conflict) return f.conflict.text;
      if (f.dropped) agendaKeep = f.keep;
    } else {
      const c = chk();
      if (c) return c.text;
    }
  }
  if (p.partnerActId && !s.acts[p.partnerActId]) return l('Parceiro inválido.', 'Invalid partner.');
  if (freeCash20(s) < est.logistics) return cashWhy20(s, est.logistics, l('Caixa insuficiente para reservar a logística.', 'Not enough cash to book logistics.'));
  const tour: Tour = {
    id: nextId(s, 'tr'), actId: act.id, name: p.name?.trim() || fmtL(l('Turnê {y}', '{y} Tour'), { y: s.year }).pt, stops: est.stops, setlist: p.setlist, minutes: p.minutes,
    production: p.production, role: p.role, partnerActId: p.partnerActId, crew: p.crew, pay: p.pay, costReserved: est.logistics, revenue: 0, costs: est.logistics, status: 'planned', log: [], accidents: 0,
  };
  post(s, `tour:${tour.id}`, -est.logistics, 'live_costs', `Logística ${tour.name}`);
  s.tours.push(tour);
  if (p.kit) tour.kit18 = { ...p.kit };
  TOUR18.planned?.(s, tour, p.kit, { people: activeMembers(s, act).length + Math.max(1, p.crew), km: est.km, travel: 0, shows: est.stops.length, days: est.days, tiers: est.stops.map((x) => x.tier), gross: est.expectedRevenue, fame: act.fame, members: activeMembers(s, act).length });
  if (agendaKeep) {
    const n = (s.agenda[act.id] ?? []).length - agendaKeep.length;
    s.agenda[act.id] = agendaKeep;
    notify(s, fmtL(l('{a} cai na estrada: {n} item(ns) da agenda deste mês saíram para abrir espaço.', '{a} hits the road: {n} item(s) of this month\'s agenda were dropped to make room.'), { a: act.name, n }));
  }
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

/** Um dia de turnê: viagem ou show na data marcada. */
export function tourDay(s: GameState, r: Rng, day: number): void {
  for (const t of s.tours) {
    if (t.status !== 'planned' && t.status !== 'running') continue;
    const st = t.stops.find((x) => x.day === day && x.status === 'scheduled');
    if (!st) continue;
    const act = s.acts[t.actId];
    if (!act || act.status === 'retired' || act.status === 'split' || act.status === 'hiatus') {
      // r21 (1.12/F-6): ato encerrado ou em hiato — as datas restantes ficam canceladas (sinistro real: seguro e post-mortem veem)
      const why = !act || act.status !== 'hiatus' ? l('ato encerrado', 'act disbanded') : l('ato em hiato', 'act on hiatus');
      for (const x of t.stops) if (x.status === 'scheduled') { x.status = 'cancelled'; x.note = why; }
      t.status = 'cancelled';
      continue;
    }
    t.status = 'running';
    const cityL = cityById[st.cityId]?.name ?? l(st.cityId);
    const blocked = liveBlocked(s, st.cityId);
    if (blocked) {
      st.status = 'cancelled';
      st.note = blocked.name;
      s.daily.push({ day, kind: 'tour', actId: act.id, tone: 'bad', text: fmtL(l('{a}: show em {c} suspenso ({w}).', '{a}: show in {c} suspended ({w}).'), { a: act.name, c: cityL, w: blocked.name }) });
      continue;
    }
    // visto negado (rota internacional controlada) — r21 (F-4): só nas paradas que exigem visto novo (um por país)
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
    s.location[act.id] = st.cityId; // r21 (1.5): o ato só "chega" depois do bloqueio e do visto
    const fatigue = activeMembers(s, act).reduce((x, id) => x + (s.persons[id]?.fatigue ?? 0), 0) / Math.max(1, act.members.length);
    const calc = showCalc(s, act, t, st);
    const clim = calc.clim;
    // acidentes e cancelamentos: fadiga, produção complexa, clima, pouca equipe
    const risk = applyMods(s, 'tourRisk', 0.006 + fatigue / 2500 + t.production * 0.004 + clim.cancelRisk + Math.max(0, 3 - t.crew) * 0.004, { act, cityId: st.cityId }).value;
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
    // r21 (F-1): a MESMA conta da previsão, só com a sorte da noite
    const { demand, partnerDraw, quality, priceMult, cover: coverPenalty, ownShare } = calc;
    const partner = t.partnerActId ? s.acts[t.partnerActId] : undefined;
    const sold = soldFrom(st.capacity, demand + partnerDraw, quality, priceMult, r.float(0.85, 1.12));
    st.sold = sold;
    st.status = 'played';
    const gross = expectedGross(s, act, t, st, sold);
    runSimHooks('show', s, r, { show: { actId: act.id, cityId: st.cityId, sold, capacity: st.capacity, revenue: sold * st.price, tourId: t.id } });
    // pagamento: bilheteria 65% líquida / cachê fixo / garantia + 45% / o maior; abertura = cachê fixo (F-2)
    const forecast = Math.round(Math.min(st.capacity, demand) * st.price * 0.5);
    let pay = basePay(s, act, t, st, gross, demand);
    // r21 (F-8): a banca vende do estoque do merch17 (sem lote, nada)
    let merch = merchStand(s, act, sold, true);
    if (TOUR18.settle) ({ pay, merch } = TOUR18.settle(s, r, t, st, { gross, pay, merch, demand, quality, cover: coverPenalty, fatigue, priceMult, clim: clim.label, forecast, ownShare }));
    st.merch = merch;
    if (s.merch[act.id]) {
      s.merch[act.id].sold += Math.round(sold * 0.12);
      s.merch[act.id].revenue += merch;
    }
    t.revenue += pay + merch;
    const c = act.contractId ? s.contracts[act.contractId] : undefined;
    if (act.playerBand || (c && c.party === 'player' && c.model === '360')) {
      const lab = labelTake(s, act, 'live', pay + merch); // r21 (H-8): régua única da fatia do selo
      if (!TOUR18.book?.(s, t, `show:${t.id}:${st.day}`, lab, `Show ${act.name} — ${cityL.pt}`)) post(s, `show:${t.id}:${st.day}`, lab, 'live', `Show ${act.name} — ${cityL.pt}`);
      if (!act.playerBand) act.cash += pay + merch - lab;
    } else {
      // gravadora clássica: a bilheteria é do artista; o selo pagou a logística como investimento de carreira
      act.cash += pay + merch;
    }
    // público, fama e cena — r21 (F-2): na abertura só o público próprio converte aqui; o emprestado converte no live18 (uma vez só)
    const own = t.role === 'opening' ? Math.round(sold * ownShare) : sold;
    act.fans.casual += Math.round(own * 0.16);
    act.fans.active += Math.round(own * 0.05);
    act.fans.core += Math.round(own * 0.007);
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
