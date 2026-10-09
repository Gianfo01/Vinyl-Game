// Mapa jogável (rodada 8): ações direto na ficha da cidade. Viajar até lá (do bolso, com tempo livre ou de
// avião particular), mandar um olheiro avulso garimpar a cena local, fazer uma turnê de divulgação com um
// artista (público maior na cidade e vizinhança por três meses), fechar um teste de um ano com uma
// distribuidora local (abre o mercado; depois efetiva ou perde) e conhecer a cena pessoalmente.
// Também calcula as camadas do mapa: seus fãs por país, calor de um gênero, força dos rivais e paradas.

import { clamp, type Rng } from '../../core/rng';
import { CITIES, MARKETS, cityById, familyOf, l, type L, type MarketId } from '../../data/world';
import { countryOfCity } from '../../data/geo';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { territoryCost } from '../economy';
import { legInfo } from '../travelAdapter';
import { cityDemand } from '../tours';
import type { GameState } from '../types';
import { fmtL, money, notify, playerActs, post, remember } from '../util';
import { addSignal, spawnProceduralAct } from '../worldgen';
import { hasUnlock, residences } from './goods8';
import { energyLeft, life, playerPerson, spendEnergy } from './life';
import { gainXp, ownerOf } from './people/owner';
import { gainTrait } from './vices';

export interface MapX8State {
  /** onde o dono está (viagem pelo mapa) */
  here?: { city: string; until: number };
  promos: { city: string; actId: string; until: number }[];
  scoutJobs: { city: string; due: number; strong: boolean }[];
  /** testes de distribuição local: mercado → semana final */
  trials: Partial<Record<MarketId, number>>;
  visited: string[];
  log: { year: number; text: L }[];
}

declare module '../ext4' { interface Ext4 { mapx8: MapX8State } }
const fresh = (): MapX8State => ({ promos: [], scoutJobs: [], trials: {}, visited: [], log: [] });
registerExt4('mapx8', fresh);

export function mapx(s: GameState): MapX8State {
  const x = s.x4 as unknown as { mapx8?: MapX8State };
  x.mapx8 ??= fresh();
  return x.mapx8;
}

function mlog(s: GameState, text: L): void {
  const m = mapx(s);
  m.log.unshift({ year: s.year, text });
  if (m.log.length > 20) m.log.length = 20;
}

export function ownerCity(s: GameState): string {
  const h = mapx(s).here;
  return h && h.until >= s.week ? h.city : s.config.homeCity;
}

export const isHere = (s: GameState, cityId: string): boolean => {
  const h = mapx(s).here;
  return !!h && h.city === cityId && h.until >= s.week;
};

// ---------------------------------------------------------------- viajar

export interface TravelQuote { cost: number; days: number; energy: number; mode: string; km: number; visa: boolean; deny: number; plane: boolean }

export function travelQuote(s: GameState, cityId: string): TravelQuote {
  const from = ownerCity(s);
  const leg = legInfo(s, from, cityId, 1);
  const plane = hasUnlock(s, 'privateFlight');
  const sameMarket = cityById[from]?.market === cityById[cityId]?.market;
  const base = leg.cost + (leg.visa?.cost ?? 0) + money(s, 250); // hotel e despesas
  return {
    cost: plane ? Math.round(base * 0.3) : base,
    days: leg.days,
    energy: plane ? 0 : sameMarket ? 1 : 2,
    mode: plane ? 'jet' : leg.mode,
    km: leg.km,
    visa: !!leg.visa?.needed,
    deny: leg.visa?.denyChance ?? 0,
    plane,
  };
}

export function travelBlocker(s: GameState, cityId: string): L | null {
  if (!cityById[cityId]) return l('Cidade inválida.', 'Invalid city.');
  if (isHere(s, cityId)) return l('Você já está aqui.', 'You are already here.');
  if (cityId === s.config.homeCity && !mapx(s).here) return l('Você já está na sua cidade.', 'You are already in your city.');
  const q = travelQuote(s, cityId);
  if (q.energy && energyLeft(s) < q.energy) return fmtL(l('Precisa de {n} de tempo livre.', 'Needs {n} free time.'), { n: q.energy });
  if (ownerOf(s).wealth < q.cost) return l('Patrimônio pessoal insuficiente para a viagem.', 'Not enough personal wealth for the trip.');
  return null;
}

/** Viaja até a cidade (paga do bolso). Fica lá três semanas: ações locais liberadas e mais fortes. */
export function travelTo(s: GameState, r: Rng, cityId: string): { text: L } | L {
  const err = travelBlocker(s, cityId);
  if (err) return err;
  const q = travelQuote(s, cityId);
  const m = mapx(s);
  const o = ownerOf(s);
  if (q.visa && r.chance(q.deny * 0.5)) {
    // visto negado: perde metade da passagem
    o.wealth -= Math.round(q.cost * 0.5);
    const text = fmtL(l('Visto negado para {c}. Metade da viagem perdida.', 'Visa denied for {c}. Half the trip lost.'), { c: cityById[cityId].name });
    mlog(s, text);
    return text;
  }
  if (q.energy) spendEnergy(s, q.energy);
  o.wealth -= q.cost;
  if (cityId === s.config.homeCity) {
    m.here = undefined;
    const text = l('De volta para casa.', 'Back home.');
    mlog(s, text);
    return { text };
  }
  m.here = { city: cityId, until: s.week + 3 };
  const first = !m.visited.includes(cityId);
  const p = playerPerson(s);
  if (first) {
    m.visited.push(cityId);
    if (m.visited.length > 60) m.visited.shift();
    o.stress = clamp(o.stress - 5, 0, 100);
    if (p) p.inspiration = clamp(p.inspiration + 6, 0, 100);
    if (m.visited.length >= 8) gainTrait(s, 'worldly');
  } else o.stress = clamp(o.stress - 2, 0, 100);
  const locals = Object.values(s.acts).filter((a) => a.city === cityId && !a.owner && (a.status === 'active' || a.status === 'emerging') && !s.knowledge[a.id]);
  if (locals.length) addSignal(s, r, r.pick(locals).id, 'trip');
  const text = fmtL(l('Você chegou em {c}. Três semanas para conhecer a cena.', 'You arrived in {c}. Three weeks to get to know the scene.'), { c: cityById[cityId].name });
  mlog(s, text);
  return { text };
}

/** Conhecer a cena pessoalmente (só estando na cidade): dois sinais fortes e ouvido. */
export function meetScene(s: GameState, r: Rng, cityId: string): { text: L } | L {
  if (!isHere(s, cityId)) return l('Você precisa estar na cidade.', 'You need to be in the city.');
  const key = `scene8:${cityId}`;
  if (s.flags[key] && s.week - s.flags[key] < 3) return l('Você já rodou a cena nesta viagem.', 'You already toured the scene on this trip.');
  if (energyLeft(s) < 1) return l('Sem tempo livre este mês. Volte no mês que vem.', 'No free time left this month. Come back next month.');
  spendEnergy(s, 1);
  s.flags[key] = s.week;
  const locals = Object.values(s.acts).filter((a) => a.city === cityId && !a.owner && (a.status === 'active' || a.status === 'emerging') && !s.knowledge[a.id]);
  const found = r.shuffle(locals).slice(0, 2);
  if (!found.length) found.push(spawnProceduralAct(s, r, { city: cityId }));
  for (const a of found) {
    addSignal(s, r, a.id, 'trip');
    const k = s.knowledge[a.id];
    if (k) k.degree = Math.max(k.degree, 2);
  }
  gainXp(s, 'ear', 3);
  const text = fmtL(l('Você rodou bares e estúdios de {c}: {n} nome(s) no radar.', 'You toured {c}\'s bars and studios: {n} name(s) on the radar.'), { c: cityById[cityId].name, n: found.length });
  mlog(s, text);
  return { text };
}

// ---------------------------------------------------------------- olheiro avulso

export function scoutCityCost(s: GameState, cityId: string): number {
  const home = cityById[s.config.homeCity]?.market;
  const near = cityById[cityId]?.market === home || s.branches.some((b) => b.city === cityId);
  return money(s, near ? 600 : 1500);
}

export function scoutCity(s: GameState, cityId: string): L | null {
  if (!cityById[cityId]) return l('Cidade inválida.', 'Invalid city.');
  const m = mapx(s);
  if (m.scoutJobs.some((j) => j.city === cityId)) return l('Já há um olheiro trabalhando aqui.', 'A scout is already working here.');
  if (m.scoutJobs.length >= 4) return l('No máximo quatro missões avulsas ao mesmo tempo.', 'At most four freelance missions at once.');
  const cost = scoutCityCost(s, cityId);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `mapscout:${cityId}`, -cost, 'scouting', `Olheiro avulso em ${cityById[cityId].name.pt}`);
  m.scoutJobs.push({ city: cityId, due: s.week + (isHere(s, cityId) ? 1 : 3), strong: isHere(s, cityId) || residences(s).includes(cityId) });
  return null;
}

function resolveScouts(s: GameState, r: Rng): void {
  const m = mapx(s);
  for (const j of m.scoutJobs.filter((x) => x.due <= s.week)) {
    const locals = Object.values(s.acts).filter((a) => a.city === j.city && !a.owner && (a.status === 'active' || a.status === 'emerging') && !s.knowledge[a.id]);
    const found = r.shuffle(locals).slice(0, j.strong ? 3 : 2);
    if (!found.length) found.push(spawnProceduralAct(s, r, { city: j.city }));
    for (const a of found) {
      addSignal(s, r, a.id, 'scout');
      const k = s.knowledge[a.id];
      if (k) k.degree = Math.max(k.degree, j.strong ? 3 : 2);
    }
    notify(s, fmtL(l('Olheiro avulso em {c}: {n} nome(s) no radar.', 'Freelance scout in {c}: {n} name(s) on the radar.'), { c: cityById[j.city]?.name ?? l(j.city), n: found.length }), 'info');
  }
  m.scoutJobs = m.scoutJobs.filter((x) => x.due > s.week);
}

// ---------------------------------------------------------------- turnê de divulgação

export function promoCost(s: GameState, cityId: string): number {
  const mk = MARKETS.find((x) => x.id === cityById[cityId]?.market);
  return money(s, 1200 + (mk ? mk.size(s.year) * 4000 : 1000));
}

export function promoBlocker(s: GameState, cityId: string, actId: string): L | null {
  const act = s.acts[actId];
  if (!cityById[cityId]) return l('Cidade inválida.', 'Invalid city.');
  if (!act || (act.owner !== 'player' && !act.playerBand)) return l('Escolha um artista do selo.', 'Pick an act on the label.');
  if (act.status === 'retired' || act.status === 'split' || act.deceased) return l('Artista inativo.', 'Inactive act.');
  if (mapx(s).promos.some((p) => p.city === cityId && p.actId === actId && p.until > s.week)) return l('Já há divulgação desse artista aqui.', 'This act is already being promoted here.');
  if (s.player.cash < promoCost(s, cityId)) return l('Caixa insuficiente.', 'Not enough cash.');
  return null;
}

/** Rádios, lojas e imprensa local por três meses: fãs agora e público maior nos shows. */
export function promoTrip(s: GameState, cityId: string, actId: string): { text: L; fans: number } | L {
  const err = promoBlocker(s, cityId, actId);
  if (err) return err;
  const act = s.acts[actId];
  const cost = promoCost(s, cityId);
  post(s, `mappromo:${cityId}:${actId}`, -cost, 'marketing', `Divulgação de ${act.name} em ${cityById[cityId].name.pt}`);
  const m = mapx(s);
  m.promos.push({ city: cityId, actId, until: s.week + 12 });
  if (m.promos.length > 24) m.promos = m.promos.filter((p) => p.until > s.week).slice(-24);
  const scene = s.scenes[`${cityId}:${act.genre}`] ?? 0;
  const present = isHere(s, cityId) ? 1.5 : 1;
  const fans = Math.round((300 + act.fame * 25 + scene * 40) * present * (1 + Math.min(0.5, life(s).fame / 100)));
  act.fans.casual += fans;
  act.fans.active += Math.round(fans / 6);
  act.momentum = clamp(act.momentum + 2, 0, 100);
  const text = fmtL(l('Divulgação de {a} em {c}: +{n} fãs e casas mais cheias por três meses.', '{a} promo in {c}: +{n} fans and fuller venues for three months.'), { a: act.name, c: cityById[cityId].name, n: fans });
  mlog(s, text);
  return { text, fans };
}

registerMod('cityDemand', 'mapx8-promo', (s, value, ctx) => {
  if (!ctx.cityId || !ctx.act) return null;
  const m = (s.x4 as unknown as { mapx8?: MapX8State }).mapx8;
  if (!m?.promos.length) return null;
  const mine = m.promos.filter((p) => p.actId === ctx.act!.id && p.until > s.week);
  if (!mine.length) return null;
  if (mine.some((p) => p.city === ctx.cityId)) return { value: value * 1.3, label: l('Divulgação local', 'Local promo') };
  const mk = cityById[ctx.cityId]?.market;
  if (mine.some((p) => cityById[p.city]?.market === mk)) return { value: value * 1.06, label: l('Divulgação na região', 'Regional promo') };
  return null;
});

// ---------------------------------------------------------------- distribuidora local (teste)

export const trialCost = (s: GameState, mk: MarketId): number => Math.round(territoryCost(s, mk) * 0.3);
export const convertCost = (s: GameState, mk: MarketId): number => Math.round(territoryCost(s, mk) * 0.8);

/** Teste de um ano com uma distribuidora local: o mercado abre já, por 30% do preço. */
export function localDistribution(s: GameState, cityId: string): L | null {
  const mk = cityById[cityId]?.market;
  if (!mk) return l('Cidade inválida.', 'Invalid city.');
  if (s.player.territories.includes(mk)) return l('Você já distribui neste mercado.', 'You already distribute in this market.');
  const cost = trialCost(s, mk);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `maptrial:${mk}`, -cost, 'distribution', `Teste de distribuição ${mk}`);
  s.player.territories.push(mk);
  s.player.stats.marketsPresent = s.player.territories.length;
  mapx(s).trials[mk] = s.week + 52;
  remember(s, 'territory', fmtL(l('Teste de distribuição local (um ano): {m}.', 'Local distribution trial (one year): {m}.'), { m: MARKETS.find((x) => x.id === mk)!.name }));
  return null;
}

/** Efetiva o teste: o mercado fica de vez (80% do preço cheio). */
export function convertTrial(s: GameState, mk: MarketId): L | null {
  const m = mapx(s);
  if (m.trials[mk] === undefined) return l('Sem teste em andamento.', 'No trial running.');
  const cost = convertCost(s, mk);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `mapconvert:${mk}`, -cost, 'distribution', `Distribuição ${mk}`);
  delete m.trials[mk];
  return null;
}

function trialsWeek(s: GameState): void {
  const m = mapx(s);
  for (const mk of Object.keys(m.trials) as MarketId[]) {
    const until = m.trials[mk]!;
    if (until - s.week === 4) notify(s, fmtL(l('O teste de distribuição em {m} acaba em um mês: efetive na ficha do mapa.', 'The distribution trial in {m} ends in a month: confirm it on the map card.'), { m: MARKETS.find((x) => x.id === mk)!.name }), 'info');
    if (until > s.week) continue;
    delete m.trials[mk];
    // filial no mercado segura a distribuição
    if (s.branches.some((b) => cityById[b.city]?.market === mk)) continue;
    s.player.territories = s.player.territories.filter((x) => x !== mk);
    s.player.stats.marketsPresent = s.player.territories.length;
    notify(s, fmtL(l('Acabou o teste de distribuição em {m}: o mercado fechou.', 'The distribution trial in {m} ended: the market closed.'), { m: MARKETS.find((x) => x.id === mk)!.name }), 'bad');
  }
}

// ---------------------------------------------------------------- camadas do mapa

/** Seus fãs potenciais por país (soma das cidades). */
export function fansByCountry(s: GameState): Map<string, number> {
  const out = new Map<string, number>();
  const acts = playerActs(s).map((id) => s.acts[id]).filter(Boolean);
  if (!acts.length) return out;
  for (const c of CITIES) {
    let v = 0;
    for (const a of acts) v += cityDemand(s, a, c.id);
    if (v <= 0) continue;
    const a3 = countryOfCity(c.id);
    if (a3) out.set(a3, (out.get(a3) ?? 0) + v);
  }
  return out;
}

/** Calor de uma família de gêneros por cidade (força das cenas). */
export function genreHeat(s: GameState, family: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const [k, v] of Object.entries(s.scenes)) {
    const i = k.indexOf(':');
    const city = k.slice(0, i);
    if (v <= 0 || familyOf(k.slice(i + 1)) !== family) continue;
    out.set(city, (out.get(city) ?? 0) + v);
  }
  return out;
}

/** Força dos rivais por cidade (tamanho do elenco ativo). */
export function rivalPower(s: GameState): Map<string, number> {
  const out = new Map<string, number>();
  for (const lb of Object.values(s.labels)) if (lb.active) out.set(lb.city, (out.get(lb.city) ?? 0) + lb.roster.length + lb.reputation / 20);
  return out;
}

// ---------------------------------------------------------------- semana

registerSimHook('week', 'mapx8', (s, r) => {
  const m = (s.x4 as unknown as { mapx8?: MapX8State }).mapx8;
  if (!m) return;
  if (m.scoutJobs.length) resolveScouts(s, r);
  if (Object.keys(m.trials).length) trialsWeek(s);
  if (m.here && m.here.until < s.week) m.here = undefined;
  if (m.promos.length && s.week % 8 === 0) m.promos = m.promos.filter((p) => p.until > s.week);
});
