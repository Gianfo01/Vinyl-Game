// Turnês roteadas com promotor (rodada 8, §3.6): a turnê de terceiros vira planejamento de rota e
// construção de público. O jogador escolhe cidades ligadas por distância e custo (rota compacta e barata
// ou rota longa que abre mercados), negocia com o promotor cachê, divisão da bilheteria, apoio local e
// condições de produção, escolhe o formato (abrir para alguém maior, casas pequenas, tentar uma arena) e
// controla descanso, intensidade e preço. Ao fim, a turnê é medida por várias métricas: lucro, fãs novos,
// venda de catálogo, imprensa, relação com promotores locais e risco físico.
//
// A turnê em si continua sendo a de tours.ts (datas, viagem, shows, acidentes); este módulo acrescenta o
// acordo com o promotor, os ajustes por show (gancho 'show') e o relatório final.

import { clamp, type Rng } from '../../core/rng';
import { VENUE_TIERS } from '../../data/rules';
import { CITIES, cityById, l, type L, type MarketId } from '../../data/world';
import { activeMembers } from '../capacity';
import { liveBlocked } from '../culture';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { PRODUCTION_COST, autoTier, cityDemand, planTour, type TourPlan } from '../tours';
import { legInfo } from '../travelAdapter';
import type { Act, GameState } from '../types';
import { fmtL, money, post, remember, staffSkill } from '../util';
import { eff360, take360 } from './deal360_17';
import { chemistry, hasSpec } from './crew8';

export type TourFormat = 'support' | 'small' | 'standard' | 'arena';
export type Intensity = 'rest' | 'normal' | 'grind';

export interface DealTerms {
  format: TourFormat;
  /** cachê garantido por show: 0 sem, 1 médio, 2 alto */
  fee: 0 | 1 | 2;
  /** fatia da bilheteria pedida: 0 baixa, 1 padrão, 2 alta */
  split: 0 | 1 | 2;
  /** apoio local do promotor: 0 nenhum, 1 imprensa, 2 imprensa e rua */
  support: 0 | 1 | 2;
  /** condições de produção (rider) bancadas pelo promotor: 0 básica, 1 padrão, 2 exigente */
  rider: 0 | 1 | 2;
  intensity: Intensity;
  /** multiplicador do ingresso */
  price: number;
}

export interface DealResult {
  terms: DealTerms;
  asked: DealTerms;
  /** humor do promotor 0..100 */
  mood: number;
  leverage: number;
  ask: number;
  countered: L[];
  doorShare: number;
  partnerActId?: string;
  error?: L;
}

export interface RouteDeal {
  tourId: string;
  actId: string;
  terms: DealTerms;
  mood: number;
  doorShare: number;
  base: { fans: number; units: number; fat: number };
  newCities: string[];
  newMarkets: MarketId[];
  /** custo líquido da logística para quem paga (depois do que o promotor cobre) */
  cost: number;
  /** pagamentos extras do acordo (cachê e ajuste de bilheteria), total e parte do selo */
  extra: number;
  label: number;
  press: number;
  rel: number;
  shows: number;
}

export interface TourReport {
  tourId: string;
  name: string;
  actId: string;
  year: number;
  shows: number;
  cancelled: number;
  attendance: number;
  profit: number;
  labelNet: number;
  newFans: number;
  catalogUnits: number;
  press: number;
  rel: number;
  accidents: number;
  fatigue: number;
  newCities: number;
  newMarkets: number;
  format: TourFormat;
}

export interface RouteState {
  deals: Record<string, RouteDeal>;
  reports: TourReport[];
  /** relação com promotores por cidade (0..100; ausente = 50) */
  rel: Record<string, number>;
}

declare module '../ext4' { interface Ext4 { route8: RouteState } }
registerExt4('route8', () => ({ deals: {}, reports: [], rel: {} }));
export const route = (s: GameState): RouteState => (s as unknown as { x4: { route8: RouteState } }).x4.route8;

export const FORMAT_NAME: Record<TourFormat, L> = {
  support: l('Abrir para alguém maior', 'Open for a bigger act'),
  small: l('Casas pequenas', 'Small venues'),
  standard: l('Casas do tamanho do público', 'Venues sized to the audience'),
  arena: l('Tentar arenas', 'Try arenas'),
};
export const INTENSITY: Record<Intensity, { name: L; restEvery: number; fatigue: number; risk: number }> = {
  rest: { name: l('Folgada (folga a cada 2 datas)', 'Relaxed (day off every 2 dates)'), restEvery: 2, fatigue: -1.2, risk: 0.8 },
  normal: { name: l('Normal (folga a cada 4)', 'Normal (day off every 4)'), restEvery: 4, fatigue: 0, risk: 1 },
  grind: { name: l('Maratona (sem folga)', 'Grind (no days off)'), restEvery: 0, fatigue: 2, risk: 1.35 },
};

const G_BASE = [0, 120, 350];
const T_SCALE = [0.4, 1, 2.5, 6, 12];
const SPLIT = [0.5, 0.65, 0.8];

export const relOf = (s: GameState, cityId: string): number => route(s).rel[cityId] ?? 50;

function fansOf(a: Act): number {
  return a.fans.casual + a.fans.active + a.fans.core;
}

function unitsOf(s: GameState, a: Act): number {
  let n = 0;
  for (const id of a.releases) n += s.releases[id]?.totalUnits ?? 0;
  return n;
}

function avgFatigue(s: GameState, a: Act): number {
  const m = activeMembers(s, a);
  return m.length ? m.reduce((t, id) => t + (s.persons[id]?.fatigue ?? 0), 0) / m.length : 0;
}

/** Equipe de estrada conforme o chefe de estrada. */
export function crewSize(s: GameState): number {
  return hasSpec(s, 'safety') ? 8 : hasSpec(s, 'lean') ? 2 : 4;
}

/** Mercados em que o ato já tocou (pelas marcas de cidade). */
export function playedMarkets(s: GameState, a: Act): Set<MarketId> {
  const out = new Set<MarketId>();
  const home = cityById[a.city]?.market;
  if (home) out.add(home);
  const pre = `played:${a.id}:`;
  for (const k in s.flags) if (k.startsWith(pre)) { const m = cityById[k.slice(pre.length)]?.market; if (m) out.add(m); }
  return out;
}

export interface CityOption { cityId: string; demand: number; km: number; market: MarketId; newCity: boolean; newMarket: boolean; rel: number }

/** Cidades candidatas, com público estimado e distância a partir de onde o ato está. */
export function candidateCities(s: GameState, actId: string, limit = 40): CityOption[] {
  const a = s.acts[actId];
  if (!a) return [];
  const from = s.location[a.id] ?? a.city;
  const played = playedMarkets(s, a);
  const out: CityOption[] = [];
  for (const c of CITIES) {
    if (liveBlocked(s, c.id)) continue;
    const demand = cityDemand(s, a, c.id);
    if (demand < 3) continue;
    out.push({ cityId: c.id, demand, km: 0, market: c.market, newCity: s.flags[`played:${a.id}:${c.id}`] === undefined, newMarket: !played.has(c.market), rel: relOf(s, c.id) });
  }
  out.sort((x, y) => y.demand - x.demand);
  const top = out.slice(0, limit);
  for (const o of top) o.km = legInfo(s, from, o.cityId, 1).km;
  return top;
}

/** Ordena pelo vizinho mais próximo: a rota mais curta "boa o bastante". */
export function orderCompact(s: GameState, from: string, cities: string[]): string[] {
  const left = [...new Set(cities)];
  const out: string[] = [];
  let cur = from;
  while (left.length) {
    let bi = 0;
    let bk = Infinity;
    left.forEach((c, i) => { const k = legInfo(s, cur, c, 1).km; if (k < bk) { bk = k; bi = i; } });
    cur = left.splice(bi, 1)[0];
    out.push(cur);
  }
  return out;
}

/** Sugestão de rota: compacta (perto de casa, barata) ou de expansão (metade em mercados novos). */
export function suggestRoute(s: GameState, actId: string, mode: 'compact' | 'expand', n = 6): string[] {
  const a = s.acts[actId];
  if (!a) return [];
  const opts = candidateCities(s, actId, 60);
  const home = cityById[a.city]?.market;
  let pick: string[];
  if (mode === 'compact') {
    // público pesado pela distância: perto de casa e cheio vence (se o mercado de casa estiver fechado, o mais perto possível)
    const near = (o: CityOption) => o.demand / (1 + o.km / 500) * (o.market === home ? 1.5 : 1);
    pick = [...opts].sort((x, y) => near(y) - near(x)).slice(0, n).map((o) => o.cityId);
  } else {
    const fresh = opts.filter((o) => o.newMarket).sort((x, y) => y.demand - x.demand);
    const markets = new Set<MarketId>();
    const far: string[] = [];
    for (const o of fresh) { if (far.length >= Math.ceil(n / 2)) break; if (markets.size < 2 || markets.has(o.market)) { markets.add(o.market); far.push(o.cityId); } }
    pick = [...opts.filter((o) => !far.includes(o.cityId)).slice(0, n - far.length).map((o) => o.cityId), ...far];
  }
  return orderCompact(s, s.location[a.id] ?? a.city, pick);
}

export interface Leg { cityId: string; km: number; days: number; cost: number; visa: boolean; demand: number; newCity: boolean; newMarket: boolean; market: MarketId; rel: number }

/** Pernas da rota na ordem dada: distância, dias, custo de viagem, público e novidade. */
export function routeLegs(s: GameState, actId: string, cities: string[]): { legs: Leg[]; km: number; days: number; travel: number; newCities: number; newMarkets: number; demand: number } {
  const a = s.acts[actId];
  const legs: Leg[] = [];
  if (!a) return { legs, km: 0, days: 0, travel: 0, newCities: 0, newMarkets: 0, demand: 0 };
  const people = activeMembers(s, a).length + crewSize(s);
  const played = playedMarkets(s, a);
  const seen = new Set<MarketId>();
  let prev = s.location[a.id] ?? a.city;
  for (const c of cities) {
    const leg = legInfo(s, prev, c, people);
    const m = cityById[c]?.market ?? 'na';
    const newMarket = !played.has(m) && !seen.has(m);
    if (!played.has(m)) seen.add(m);
    legs.push({ cityId: c, km: leg.km, days: leg.days, cost: leg.cost + (leg.visa?.cost ?? 0), visa: !!leg.visa?.needed, demand: cityDemand(s, a, c), newCity: s.flags[`played:${a.id}:${c}`] === undefined, newMarket, market: m, rel: relOf(s, c) });
    prev = c;
  }
  return {
    legs,
    km: legs.reduce((t, x) => t + x.km, 0),
    days: legs.reduce((t, x) => t + x.days + 1, 0),
    travel: legs.reduce((t, x) => t + x.cost, 0),
    newCities: legs.filter((x) => x.newCity).length,
    newMarkets: legs.filter((x) => x.newMarket).length,
    demand: legs.reduce((t, x) => t + x.demand, 0),
  };
}

/** Atração maior que aceitaria o ato como abertura. */
export function headlinerFor(s: GameState, a: Act): Act | undefined {
  let best: Act | undefined;
  for (const x of Object.values(s.acts)) {
    if (x.id === a.id || x.status !== 'active' || x.deceased || x.fame < a.fame + 10 || x.fame > a.fame + 45) continue;
    const score = x.fame + (x.genre === a.genre ? 20 : 0);
    if (!best || score > best.fame + (best.genre === a.genre ? 20 : 0)) best = x;
  }
  return best;
}

function askOf(t: DealTerms, a: Act): number {
  const fmt = t.format === 'arena' ? 18 + Math.max(0, 55 - a.fame) * 0.6 : t.format === 'small' ? -8 : t.format === 'support' ? -5 : 0;
  return t.fee * 14 + t.split * 12 + t.support * 8 + t.rider * 9 + fmt;
}

/** Força do selo na mesa: fama, booking, química, relação com os promotores da rota e jurídico. */
export function leverageOf(s: GameState, a: Act, cities: string[]): number {
  const home = cityById[a.city]?.market;
  const homeShare = cities.length ? cities.filter((c) => cityById[c]?.market === home).length / cities.length : 1;
  const played = playedMarkets(s, a);
  const freshShare = cities.length ? cities.filter((c) => !played.has(cityById[c]?.market ?? 'na')).length / cities.length : 0;
  const avgRel = cities.length ? cities.reduce((t, c) => t + relOf(s, c), 0) / cities.length : 50;
  let v = a.fame * 0.8 + staffSkill(s, 'booking') / 5 + chemistry(s) / 8 + (avgRel - 50) / 3 + a.momentum / 10;
  const loc = hasSpec(s, 'local');
  const glo = hasSpec(s, 'global');
  if (loc) v += homeShare * (6 + loc / 10) - freshShare * 4;
  if (glo) v += freshShare * (6 + glo / 10) - homeShare * 3;
  const hb = hasSpec(s, 'hardball');
  const md = hasSpec(s, 'mediator');
  if (hb) v += hb / 6;
  else if (md) v += md / 12;
  return v;
}

/** Proposta ao promotor: ele aceita ou devolve uma contraproposta cortando extras. */
export function negotiateTour(s: GameState, actId: string, cities: string[], asked: DealTerms): DealResult {
  const a = s.acts[actId];
  const terms: DealTerms = { ...asked };
  const countered: L[] = [];
  if (!a) return { terms, asked, mood: 0, leverage: 0, ask: 0, countered, doorShare: 0.65, error: l('Ato inválido.', 'Invalid act.') };
  let partnerActId: string | undefined;
  if (terms.format === 'support') {
    partnerActId = headlinerFor(s, a)?.id;
    if (!partnerActId) return { terms, asked, mood: 0, leverage: 0, ask: 0, countered, doorShare: 0.65, error: l('Nenhuma atração maior aceita abertura agora.', 'No bigger act takes an opener right now.') };
  }
  const leverage = leverageOf(s, a, cities) + (terms.format === 'support' ? 12 : 0);
  const cuts: [keyof DealTerms, L][] = [['support', l('apoio local reduzido', 'less local support')], ['rider', l('rider mais simples', 'simpler rider')], ['fee', l('cachê menor', 'lower fee')], ['split', l('fatia menor da bilheteria', 'smaller door share')]];
  let guard = 0;
  while (askOf(terms, a) > leverage + 4 && guard++ < 12) {
    const cut = cuts.find(([k]) => (terms[k] as number) > 0);
    if (cut) { (terms[cut[0]] as number) -= 1; if (!countered.includes(cut[1])) countered.push(cut[1]); continue; }
    if (terms.format === 'arena') { terms.format = 'standard'; countered.push(l('arena recusada: casas do tamanho do público', 'arena refused: venues sized to the audience')); continue; }
    break;
  }
  const ask = askOf(terms, a);
  const hb = hasSpec(s, 'hardball');
  const md = hasSpec(s, 'mediator');
  const mood = clamp(55 + (leverage - ask) * 0.8 - (hb ? 10 + hb / 10 : 0) + (md ? 6 : 0) - countered.length * 4, 5, 95);
  const doorShare = clamp(SPLIT[terms.split] - 0.04 * terms.support - 0.03 * terms.rider + (hb ? 0.03 : 0), 0.35, 0.85);
  return { terms, asked, mood, leverage, ask, countered, doorShare, partnerActId };
}

function tierFor(s: GameState, a: Act, t: DealTerms, partner?: Act): number | undefined {
  if (t.format === 'small') return a.fame < 12 ? 0 : 1;
  if (t.format === 'arena') return 3;
  if (t.format === 'support' && partner) return autoTier(s, partner, cityDemand(s, partner, partner.city));
  return undefined;
}

/** Fecha a turnê com o promotor: reserva a logística (tours.ts) e registra o acordo. */
export function bookRoutedTour(s: GameState, actId: string, cities: string[], asked: DealTerms, startInDays = 21, name?: string): { tourId: string; deal: DealResult } | L {
  const a = s.acts[actId];
  if (!a) return l('Ato inválido.', 'Invalid act.');
  if (!cities.length) return l('Escolha ao menos uma cidade.', 'Pick at least one city.');
  if (cities.length > 16) return l('No máximo 16 datas por turnê.', 'At most 16 dates per tour.');
  const deal = negotiateTour(s, actId, cities, asked);
  if (deal.error) return deal.error;
  const t = deal.terms;
  const partner = deal.partnerActId ? s.acts[deal.partnerActId] : undefined;
  const crewN = crewSize(s);
  const songs = a.songs.map((id) => s.songs[id]).filter((x) => x?.recorded).sort((x, y) => y.q - x.q);
  const minutes: TourPlan['minutes'] = t.format === 'support' ? 30 : t.format === 'arena' ? 90 : 60;
  const plan: TourPlan = {
    actId, cities, startInDays, tier: tierFor(s, a, t, partner), priceMult: t.price, minutes, setlist: songs.slice(0, Math.ceil(minutes / 4)).map((x) => x.id),
    production: t.rider, role: t.format === 'support' ? 'opening' : 'headline', partnerActId: partner?.id, crew: crewN, pay: 'door', name, restEvery: INTENSITY[t.intensity].restEvery,
  };
  const before = { fans: fansOf(a), units: unitsOf(s, a), fat: avgFatigue(s, a) };
  const legs = routeLegs(s, actId, cities);
  const res = planTour(s, plan);
  if ('pt' in res) return res;
  // o promotor (ou a atração principal) banca casa e produção local; o enxuto corta mais um pouco
  const tm = staffSkill(s, 'tour_manager') / 400;
  let covered = 0;
  for (const st of res.stops) covered += money(s, (VENUE_TIERS[st.tier].cost + PRODUCTION_COST[t.rider]) * (1 - tm));
  covered = Math.min(covered, res.costReserved);
  const lean = hasSpec(s, 'lean') ? Math.round((res.costReserved - covered) * 0.12) : 0;
  post(s, `r8cover:${res.id}`, covered + lean, 'live_costs', `Promotor cobre casas e produção — ${res.name}`);
  const restDays = INTENSITY[t.intensity].restEvery ? Math.floor((cities.length - 1) / INTENSITY[t.intensity].restEvery) : 0;
  const people = activeMembers(s, a).length + crewN;
  const restCost = restDays * money(s, 35 * people);
  if (restCost) post(s, `r8rest:${res.id}`, -restCost, 'live_costs', `Diárias de folga — ${res.name}`);
  route(s).deals[res.id] = {
    tourId: res.id, actId, terms: t, mood: deal.mood, doorShare: deal.doorShare, base: before,
    newCities: legs.legs.filter((x) => x.newCity).map((x) => x.cityId), newMarkets: [...new Set(legs.legs.filter((x) => x.newMarket).map((x) => x.market))],
    cost: res.costReserved - covered - lean + restCost, extra: 0, label: 0, press: 0, rel: 0, shows: 0,
  };
  return { tourId: res.id, deal };
}

/** Paga ao ato (e ao selo, se o contrato dá parte dos shows ao selo). Devolve a parte do selo. */
function payAct(s: GameState, a: Act, amount: number, key: string, memo: string): number {
  if (!amount) return 0;
  const c = a.contractId ? s.contracts[a.contractId] : undefined;
  if (a.playerBand || (c && c.party === 'player' && c.model === '360')) {
    const lab = a.playerBand ? amount : take360(s, a, amount, c!.share360);
    post(s, key, lab, 'live', memo);
    a.cash += amount - lab;
    return lab;
  }
  a.cash += amount;
  return 0;
}

function labelShare(s: GameState, a: Act): number {
  const c = a.contractId ? s.contracts[a.contractId] : undefined;
  return a.playerBand ? 1 : c && c.party === 'player' && c.model === '360' ? eff360(a, c.share360) : 0;
}

registerSimHook('show', 'route8', (s, _r, arg) => {
  const sh = arg.show;
  if (!sh) return;
  const d = route(s).deals[sh.tourId];
  if (!d) return;
  const a = s.acts[sh.actId];
  const tour = s.tours.find((x) => x.id === sh.tourId);
  const st = tour?.stops.find((x) => x.cityId === sh.cityId && x.status === 'played' && x.sold === sh.sold);
  if (!a || !tour || !st) return;
  const t = d.terms;
  const ratio = sh.capacity ? sh.sold / sh.capacity : 0;
  // dinheiro do acordo: garantia por show e ajuste da divisão da bilheteria (base de tours.ts: 65%)
  if (t.format !== 'support') {
    const hb = hasSpec(s, 'hardball') ? 1.15 : 1;
    const amount = Math.round(money(s, G_BASE[t.fee] * T_SCALE[st.tier]) * hb + (d.doorShare - 0.65) * sh.revenue);
    d.extra += amount;
    d.label += payAct(s, a, amount, `r8:${tour.id}:${st.day}`, `Acordo com promotor — ${cityById[sh.cityId]?.name.pt ?? sh.cityId}`);
  }
  // público: apoio local e rider convertem plateia em fãs; ingresso caro afasta, barato atrai
  const extra = sh.sold * (0.035 * t.support + 0.02 * t.rider);
  const priceF = sh.sold * (1 - t.price) * 0.08;
  a.fans.casual = Math.max(0, a.fans.casual + Math.round(extra * 0.8 + priceF));
  a.fans.active += Math.round(extra * 0.2);
  // corpo: intensidade e conforto do rider
  const fat = INTENSITY[t.intensity].fatigue - 0.4 * t.rider;
  if (fat) for (const id of activeMembers(s, a)) { const p = s.persons[id]; if (p) p.fatigue = clamp(p.fatigue + fat, 0, 100); }
  // imprensa: casa cheia rende, arena vazia vira manchete ruim
  d.press += (ratio - 0.45) * (1 + t.support * 0.4) * [0.5, 0.8, 1, 1.6, 2.2][st.tier] + (d.newCities.includes(sh.cityId) ? 0.5 : 0);
  // relação com o promotor local
  const hb = hasSpec(s, 'hardball');
  const md = hasSpec(s, 'mediator');
  const dr = (d.mood - 50) / 25 + (ratio > 0.8 ? 2 : ratio < 0.3 ? -2 : 0) + t.support * 0.5 - (hb ? 1 : 0) + (md ? 0.5 : 0);
  const rel = route(s).rel;
  rel[sh.cityId] = clamp((rel[sh.cityId] ?? 50) + dr, 0, 100);
  d.rel += dr;
  d.shows += 1;
});

registerMod('tourRisk', 'route8', (s, value, ctx) => {
  if (!ctx.act) return null;
  for (const d of Object.values(route(s).deals)) {
    if (d.actId !== ctx.act.id) continue;
    const m = INTENSITY[d.terms.intensity].risk * (1 - d.terms.rider * 0.05);
    return { value: value * m };
  }
  return null;
});

registerMod('cityDemand', 'route8', (s, value, ctx) => {
  const r = ctx.cityId ? route(s).rel[ctx.cityId] : undefined;
  return r === undefined ? null : { value: value * (1 + (r - 50) / 400) };
});

registerMod('chartUnits', 'route8', (s, value, ctx) => {
  const rel = ctx.release;
  if (!rel || rel.owner !== 'player') return null;
  const deals = route(s).deals;
  for (const id in deals) {
    const d = deals[id];
    if (d.actId !== rel.actId) continue;
    const tour = s.tours.find((x) => x.id === id);
    if (tour?.status !== 'running') continue;
    return { value: value * (1.04 + d.terms.support * 0.02), label: l('Turnê na estrada', 'Tour on the road') };
  }
  return null;
});

/** Relatório final da turnê (várias métricas, nenhuma decide sozinha). */
export function buildReport(s: GameState, d: RouteDeal): TourReport | null {
  const tour = s.tours.find((x) => x.id === d.tourId);
  const a = s.acts[d.actId];
  if (!tour || !a) return null;
  const played = tour.stops.filter((x) => x.status === 'played');
  const cancelled = tour.stops.filter((x) => x.status === 'cancelled');
  return {
    tourId: tour.id, name: tour.name, actId: a.id, year: s.year, shows: played.length, cancelled: cancelled.length,
    attendance: played.reduce((t, x) => t + x.sold, 0),
    profit: tour.revenue + d.extra - d.cost,
    labelNet: Math.round(tour.revenue * labelShare(s, a)) + d.label - d.cost,
    newFans: fansOf(a) - d.base.fans,
    catalogUnits: unitsOf(s, a) - d.base.units,
    press: Math.round(d.press * 10) / 10,
    rel: Math.round(d.rel - cancelled.length * 3),
    accidents: tour.accidents,
    fatigue: Math.round(avgFatigue(s, a) - d.base.fat),
    newCities: played.filter((x) => d.newCities.includes(x.cityId)).length,
    newMarkets: d.newMarkets.filter((m) => played.some((x) => cityById[x.cityId]?.market === m)).length,
    format: d.terms.format,
  };
}

export function routeWeek(s: GameState, _r: Rng): void {
  const st = route(s);
  for (const id of Object.keys(st.deals)) {
    const d = st.deals[id];
    const tour = s.tours.find((x) => x.id === id);
    if (tour && (tour.status === 'planned' || tour.status === 'running')) continue;
    const rep = tour ? buildReport(s, d) : null;
    delete st.deals[id];
    if (!rep) continue;
    for (const x of tour!.stops) if (x.status === 'cancelled') st.rel[x.cityId] = clamp((st.rel[x.cityId] ?? 50) - 3, 0, 100);
    s.player.reputation.artistic = clamp(s.player.reputation.artistic + clamp(rep.press / 15, -3, 3), 0, 100);
    st.reports.unshift(rep);
    if (st.reports.length > 8) st.reports.length = 8;
    const a = s.acts[rep.actId];
    remember(s, 'tour_report', fmtL(l('Balanço de {t} ({a}): {f} fãs novos, {c} cidades novas, imprensa {p}.', '{t} wrap-up ({a}): {f} new fans, {c} new cities, press {p}.'), { t: rep.name, a: a?.name ?? '', f: rep.newFans, c: rep.newCities, p: rep.press }), { actId: rep.actId });
  }
}

registerSimHook('week', 'route8', (s, r) => routeWeek(s, r));
