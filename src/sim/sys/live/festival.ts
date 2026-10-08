// Construtor de festival (inspiração: RollerCoaster Tycoon). O jogador monta um terreno em grade com
// palcos, acessos, banheiros, comida, bar, camping, segurança, posto médico e merch; escolhe line-up,
// data e preço. Na data, a simulação calcula lotação, empolgação, conforto, segurança, filas,
// pensamentos do público e desastres. O festival cresce a cada edição bem-sucedida.

import { clamp, type Rng } from '../../../core/rng';
import { cityById, l, type L } from '../../../data/world';
import { queueCutscene, registerSimHook } from '../../ext4';
import { climateInfo } from '../../travelAdapter';
import type { Act, GameState } from '../../types';
import { fmtL, money, nextId, notify, post, remember } from '../../util';
import { bump, isMine, liveOf, type FestEdition, type FestThought, type FestTile, type OwnFestival } from './state';

export interface TileDef {
  id: Exclude<FestTile, ''>;
  name: L;
  /** custo de aluguel por edição (dólares reais) */
  cost: number;
  desc: L;
  color: string;
}

export const FEST_TILES: TileDef[] = [
  { id: 'stage', name: l('Palco', 'Stage'), cost: 9000, desc: l('Até 4 atrações por palco. Mais palcos, mais empolgação.', 'Up to 4 acts per stage. More stages, more excitement.'), color: '#c04848' },
  { id: 'gate', name: l('Acesso', 'Gate'), cost: 1500, desc: l('Cada acesso passa ~7 mil pessoas. Sem acesso, sem festival.', 'Each gate lets in ~7k people. No gate, no festival.'), color: '#e0b040' },
  { id: 'toilet', name: l('Banheiros', 'Toilets'), cost: 500, desc: l('Atende ~800 pessoas. Falta = fila e reclamação.', 'Serves ~800 people. Too few = queues and complaints.'), color: '#4a8ae0' },
  { id: 'food', name: l('Comida', 'Food'), cost: 900, desc: l('Atende ~1.500 pessoas e vende.', 'Serves ~1,500 people and sells.'), color: '#f08a2c' },
  { id: 'bar', name: l('Bar', 'Bar'), cost: 1100, desc: l('Receita alta; ajuda pouco na fome.', 'High revenue; helps a little with hunger.'), color: '#a05ad0' },
  { id: 'camp', name: l('Camping', 'Camping'), cost: 1200, desc: l('~1.500 barracas. Necessário em festivais de 2+ dias.', '~1,500 tents. Needed for 2+ day festivals.'), color: '#48b85c' },
  { id: 'security', name: l('Segurança', 'Security'), cost: 1600, desc: l('Cobre ~2.500 pessoas. Evita superlotação e brigas.', 'Covers ~2,500 people. Prevents crushes and fights.'), color: '#2a2a30' },
  { id: 'medic', name: l('Posto médico', 'First aid'), cost: 1400, desc: l('Reduz o estrago de chuva, calor e acidentes.', 'Reduces the damage of rain, heat and accidents.'), color: '#f8f4ec' },
  { id: 'merch', name: l('Merch', 'Merch'), cost: 700, desc: l('Vende camisetas das suas atrações.', 'Sells your acts\' shirts.'), color: '#2ec8c0' },
];
export const tileDef = Object.fromEntries(FEST_TILES.map((x) => [x.id, x])) as Record<Exclude<FestTile, ''>, TileDef>;

/** Pessoas que cabem por quadrado livre (área de público). */
export const PEOPLE_PER_TILE = 900;
export const MAX_FESTS = 2;

export function countTiles(f: OwnFestival): Record<Exclude<FestTile, ''> | 'free', number> {
  const c = { stage: 0, gate: 0, toilet: 0, food: 0, bar: 0, camp: 0, security: 0, medic: 0, merch: 0, free: 0 };
  for (const t of f.grid) c[t || 'free'] += 1;
  return c;
}

export function guestFee(s: GameState, act: Act): number {
  return Math.round(400 + act.fame * act.fame * 28);
}

/** Atração convidada aceita se o prestígio do festival comporta a fama dela. */
export function guestAccepts(f: OwnFestival, act: Act): boolean {
  const stages = countTiles(f).stage;
  return act.fame <= f.rep + 30 + stages * 4;
}

export function canFoundFestival(s: GameState): L | null {
  if (liveOf(s).fests.length >= MAX_FESTS) return l('Limite de dois festivais próprios.', 'Limit of two own festivals.');
  if (s.year < 1950) return l('Festivais de música ao ar livre só surgem nos anos 1950.', 'Open-air music festivals only appear in the 1950s.');
  return null;
}

export function foundCost(s: GameState): number {
  return money(s, 12000);
}

export function createFestival(s: GameState, name: string, cityId: string, month: number, days = 1): OwnFestival | L {
  const why = canFoundFestival(s);
  if (why) return why;
  if (!cityById[cityId]) return l('Cidade inválida.', 'Invalid city.');
  const cost = foundCost(s);
  if (s.player.cash < cost) return l('Caixa insuficiente para a licença e o terreno.', 'Not enough cash for the permit and the land.');
  const w = 12;
  const h = 8;
  const grid: FestTile[] = new Array(w * h).fill('');
  // layout inicial mínimo: um palco, um acesso e banheiros
  grid[0 * w + 5] = 'stage';
  grid[(h - 1) * w + 5] = 'gate';
  grid[(h - 1) * w + 0] = 'toilet';
  grid[(h - 1) * w + 11] = 'food';
  const f: OwnFestival = {
    id: nextId(s, 'fx'), name: name.trim() || 'Festival', cityId, month: clamp(Math.round(month), 0, 11), days: clamp(Math.round(days), 1, 3), price: 30,
    w, h, grid, lineup: [], rep: 20, founded: s.year, nextYear: month > s.month ? s.year : s.year + 1, editions: [],
  };
  post(s, `festfound:${f.id}`, -cost, 'live_costs', `Licença do festival ${f.name}`);
  liveOf(s).fests.push(f);
  remember(s, 'fest_founded', fmtL(l('Nasce o festival {f} em {c}.', 'The {f} festival is born in {c}.'), { f: f.name, c: cityById[cityId].name }), { important: true });
  return f;
}

export function placeTile(s: GameState, festId: string, x: number, y: number, tile: FestTile): L | null {
  const f = liveOf(s).fests.find((x2) => x2.id === festId);
  if (!f) return l('Festival inválido.', 'Invalid festival.');
  if (x < 0 || y < 0 || x >= f.w || y >= f.h) return l('Fora do terreno.', 'Outside the grounds.');
  f.grid[y * f.w + x] = tile;
  return null;
}

export function setFestival(s: GameState, festId: string, patch: Partial<Pick<OwnFestival, 'price' | 'days' | 'month' | 'name'>>): void {
  const f = liveOf(s).fests.find((x) => x.id === festId);
  if (!f) return;
  if (patch.price !== undefined) f.price = clamp(Math.round(patch.price), 5, 400);
  if (patch.days !== undefined) f.days = clamp(Math.round(patch.days), 1, 3);
  if (patch.name !== undefined) f.name = patch.name.trim() || f.name;
  if (patch.month !== undefined) {
    f.month = clamp(Math.round(patch.month), 0, 11);
    f.nextYear = Math.max(f.nextYear, f.month > s.month ? s.year : s.year + 1);
  }
}

export function lineupMax(f: OwnFestival): number {
  return countTiles(f).stage * 4;
}

export function addToLineup(s: GameState, festId: string, actId: string): L | null {
  const f = liveOf(s).fests.find((x) => x.id === festId);
  const act = s.acts[actId];
  if (!f || !act) return l('Inválido.', 'Invalid.');
  if (f.lineup.some((x) => x.actId === actId)) return l('Já está no line-up.', 'Already on the bill.');
  if (f.lineup.length >= lineupMax(f)) return l('Faltam palcos: até 4 atrações por palco.', 'Not enough stages: up to 4 acts per stage.');
  if (act.status === 'retired' || act.status === 'split') return l('Ato encerrado.', 'Act is over.');
  const mine = isMine(s, actId);
  if (!mine && !guestAccepts(f, act)) return l('Recusou: o festival ainda não tem prestígio para essa atração.', 'Declined: the festival lacks prestige for this act.');
  f.lineup.push({ actId, fee: mine ? 0 : guestFee(s, act) });
  return null;
}

export function removeFromLineup(s: GameState, festId: string, actId: string): void {
  const f = liveOf(s).fests.find((x) => x.id === festId);
  if (f) f.lineup = f.lineup.filter((x) => x.actId !== actId);
}

export interface FestModel {
  stages: number;
  lineup: Act[];
  demand: number;
  capacity: number;
  attendance: number;
  overflow: number;
  ratios: { toilet: number; food: number; camp: number; security: number; medic: number; gate: number };
  excitement: number;
  comfort: number;
  safety: number;
  queueMin: number;
  priceTooHigh: boolean;
  revenue: { tickets: number; food: number; bar: number; merch: number };
  costs: { tiles: number; fees: number; production: number };
}

/** Modelo determinístico (sem clima e desastres) — usado na previsão e na edição real. */
export function festModel(s: GameState, f: OwnFestival): FestModel {
  const c = countTiles(f);
  const lineup = f.lineup.map((x) => s.acts[x.actId]).filter((a): a is Act => !!a && a.status !== 'retired' && a.status !== 'split').slice(0, c.stage * 4);
  const city = cityById[f.cityId];
  let fans = 0;
  for (const a of lineup) {
    const draw = (a.fans.core * 0.6 + a.fans.active * 0.25 + a.fans.casual * 0.02) * (1 + a.fame / 80);
    fans += draw * (cityById[a.city]?.market === city?.market ? 1 : 0.35);
  }
  const fames = lineup.map((a) => a.fame).sort((a, b) => b - a);
  const top = fames[0] ?? 0;
  const avg = fames.length ? fames.reduce((t, x) => t + x, 0) / fames.length : 0;
  const fair = 25 + top * 0.5;
  const elastic = Math.pow(Math.max(0.3, f.price / fair), 1.3);
  const demand = Math.round((fans * 0.5 + f.rep * 150 + (lineup.length ? 400 : 0)) * (0.6 + f.rep / 100) / elastic);
  const groundCap = c.free * PEOPLE_PER_TILE;
  const gateCap = c.gate * 7000;
  const capacity = Math.min(groundCap, gateCap);
  const attendance = Math.max(0, Math.min(demand, capacity));
  const overflow = Math.max(0, demand - capacity);
  const att = Math.max(1, attendance);
  const ratios = {
    toilet: Math.min(1, (c.toilet * 800) / att),
    food: Math.min(1, (c.food * 1500 + c.bar * 500) / att),
    camp: f.days > 1 ? Math.min(1, (c.camp * 1500) / (att * 0.6)) : 1,
    security: Math.min(1, (c.security * 2500) / att),
    medic: Math.min(1, (c.medic * 10000) / att),
    gate: gateCap ? attendance / gateCap : 1,
  };
  const excitement = clamp(15 + top * 0.45 + avg * 0.2 + c.stage * 5 + Math.min(10, lineup.length * 1.5) - (ratios.food < 0.6 ? 5 : 0), 0, 100);
  const comfort = clamp(100 * (ratios.toilet * 0.35 + ratios.food * 0.35 + ratios.camp * 0.3) - (ratios.gate > 0.9 ? 8 : 0), 0, 100);
  const safety = clamp(100 * (ratios.security * 0.7 + ratios.medic * 0.3) - Math.min(20, (overflow / Math.max(1, capacity)) * 40), 0, 100);
  const queueMin = Math.round(5 + Math.max(0, att / Math.max(1, c.toilet * 800) - 1) * 20);
  const d = f.days;
  const tickets = attendance * money(s, f.price) * d;
  const food = Math.min(attendance, c.food * 1500) * money(s, 9) * d;
  const bar = Math.min(attendance, c.bar * 1500) * money(s, 7) * d * 0.6;
  const ownShare = lineup.length ? lineup.filter((a) => isMine(s, a.id)).length / lineup.length : 0;
  const merch = Math.min(attendance, c.merch * 4000) * money(s, 4) * (0.3 + ownShare * 0.7);
  let tiles = 0;
  for (const t of f.grid) if (t) tiles += money(s, tileDef[t].cost);
  tiles = Math.round(tiles * (0.5 + 0.5 * d));
  const fees = f.lineup.filter((x) => lineup.some((a) => a.id === x.actId)).reduce((t, x) => t + money(s, x.fee), 0);
  const production = money(s, 6000 + c.stage * 3000 * d);
  return {
    stages: c.stage, lineup, demand, capacity, attendance, overflow, ratios, excitement, comfort, safety, queueMin, priceTooHigh: elastic > 1.4,
    revenue: { tickets: Math.round(tickets), food: Math.round(food), bar: Math.round(bar), merch: Math.round(merch) },
    costs: { tiles, fees, production },
  };
}

function freeSpot(f: OwnFestival, r: Rng): { x: number; y: number } {
  for (let i = 0; i < 20; i++) {
    const x = r.int(0, f.w - 1);
    const y = r.int(0, f.h - 1);
    if (!f.grid[y * f.w + x]) return { x, y };
  }
  return { x: r.int(0, f.w - 1), y: r.int(0, f.h - 1) };
}

function grow(f: OwnFestival): void {
  const nw = Math.min(24, f.w + 2);
  const nh = Math.min(12, f.h + 1);
  if (nw === f.w && nh === f.h) return;
  const grid: FestTile[] = new Array(nw * nh).fill('');
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) grid[y * nw + x] = f.grid[y * f.w + x];
  f.grid = grid;
  f.w = nw;
  f.h = nh;
}

/** Uma edição do festival. Devolve a edição ou null se cancelada por falta de estrutura. */
export function runEdition(s: GameState, r: Rng, f: OwnFestival): FestEdition | null {
  const m = festModel(s, f);
  f.nextYear = s.year + 1;
  if (!m.stages || !countTiles(f).gate || !m.lineup.length) {
    notify(s, fmtL(l('{f}: edição cancelada — falta palco, acesso ou line-up.', '{f}: edition cancelled — missing stage, gate or line-up.'), { f: f.name }), 'bad');
    f.rep = clamp(f.rep - 5, 0, 100);
    return null;
  }
  const clim = climateInfo(s, f.cityId, f.month);
  const storm = r.chance(clamp(clim.cancelRisk * 4 + 0.02, 0, 0.4));
  const rain = !storm && r.chance(clamp(0.15 + (1 - clim.outdoorFactor) * 0.6, 0, 0.7));
  const c = countTiles(f);
  let { excitement, comfort, safety } = m;
  if (rain) {
    excitement -= 5;
    comfort -= c.medic ? 6 : 12;
  }
  if (storm) {
    excitement -= 12;
    safety -= c.medic ? 5 : 20;
  }
  let revenueMult = 1;
  let disaster: L | undefined;
  let fine = 0;
  let repHit = 0;
  if (m.overflow > m.capacity * 0.2 && safety < 55 && r.chance(0.55)) {
    disaster = l('Superlotação: grades derrubadas e feridos na frente do palco.', 'Overcrowding: barriers down and people injured in front of the stage.');
    fine = money(s, 15000) + Math.round(m.attendance * money(s, 0.5));
    repHit = 15;
    safety -= 20;
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 5, 0, 100);
  } else if (storm && !c.medic && r.chance(0.6)) {
    disaster = l('Tempestade: o palco principal foi evacuado.', 'Storm: the main stage was evacuated.');
    revenueMult = 0.75;
    repHit = 8;
  } else if (rain && comfort < 30) {
    disaster = l('Lamaçal: o festival virou um pântano.', 'Mudbath: the festival turned into a swamp.');
    repHit = 5;
  }
  excitement = Math.round(clamp(excitement, 0, 100));
  comfort = Math.round(clamp(comfort, 0, 100));
  safety = Math.round(clamp(safety, 0, 100));
  const rating = Math.round(excitement * 0.45 + comfort * 0.25 + safety * 0.3);
  const rv = m.revenue;
  const revenue = Math.round((rv.tickets + rv.food + rv.bar + rv.merch) * revenueMult);
  const costs = m.costs.tiles + m.costs.fees + m.costs.production + fine;
  post(s, `fest:${f.id}:${s.year}:rev`, revenue, 'live', `Festival ${f.name} ${s.year}`);
  post(s, `fest:${f.id}:${s.year}:cost`, -costs, 'live_costs', `Custos do festival ${f.name} ${s.year}`);
  // atrações
  for (const a of m.lineup) {
    const e = f.lineup.find((x) => x.actId === a.id);
    if (!isMine(s, a.id)) {
      a.cash += money(s, e?.fee ?? 0);
      a.fans.casual += Math.round(m.attendance * 0.02);
      continue;
    }
    a.fans.casual += Math.round(m.attendance * 0.08 * (excitement / 70));
    a.fans.active += Math.round(m.attendance * 0.015 * (excitement / 70));
    a.fame = clamp(a.fame + 1 + excitement / 100, 0, 100);
    a.momentum = clamp(a.momentum + 3, 0, 100);
    s.player.stats.festivals += 1;
  }
  // pensamentos do público
  const th: { text: L; tone: FestThought['tone'] }[] = [];
  const head = m.lineup.slice().sort((a, b) => b.fame - a.fame)[0];
  if (m.ratios.toilet < 0.7) th.push({ text: l('Fila do banheiro enorme!', 'The toilet queue is huge!'), tone: 'bad' });
  if (m.ratios.food < 0.7) th.push({ text: l('Uma hora de fila pra comer…', 'An hour in line for food…'), tone: 'bad' });
  if (m.ratios.camp < 0.7) th.push({ text: l('Não tem onde armar a barraca.', 'Nowhere to pitch my tent.'), tone: 'bad' });
  if (m.ratios.gate > 0.9) th.push({ text: l('Duas horas para entrar!', 'Two hours to get in!'), tone: 'bad' });
  if (safety < 50) th.push({ text: l('Tá apertado demais aqui, dá medo.', 'It\'s way too packed, scary.'), tone: 'bad' });
  if (m.priceTooHigh) th.push({ text: l('Ingresso caro demais pra esse line-up.', 'Ticket way too pricey for this line-up.'), tone: 'bad' });
  if (rain) th.push({ text: l('Encharcado, mas valeu!', 'Soaked, but worth it!'), tone: 'neutral' }, { text: l('Lama até o joelho.', 'Mud up to my knees.'), tone: 'bad' });
  if (storm) th.push({ text: l('Pararam tudo por causa dos raios…', 'They stopped everything for the lightning…'), tone: 'bad' });
  if (disaster && repHit >= 15) th.push({ text: l('Socorro, a grade caiu!', 'Help, the barrier fell!'), tone: 'bad' });
  if (excitement >= 70) th.push({ text: l('Melhor show da vida!', 'Best show of my life!'), tone: 'good' }, { text: l('Ano que vem eu volto!', 'Coming back next year!'), tone: 'good' });
  if (head) th.push({ text: fmtL(l('{a} no palco principal é surreal!', '{a} on the main stage is unreal!'), { a: head.name }), tone: excitement >= 50 ? 'good' : 'neutral' });
  if (comfort >= 75) th.push({ text: l('Banheiro limpo em festival? Milagre!', 'Clean toilets at a festival? Miracle!'), tone: 'good' });
  if (c.merch && m.attendance > 0) th.push({ text: l('Comprei a camiseta da turnê.', 'Got the tour shirt.'), tone: 'good' });
  if (c.bar >= 2) th.push({ text: l('O bar tá ótimo.', 'The bar is great.'), tone: 'good' });
  if (excitement < 40) th.push({ text: l('Meio parado esse line-up…', 'This line-up is kind of dull…'), tone: 'bad' });
  const thoughts: FestThought[] = th.slice(0, 10).map((x) => ({ ...x, ...freeSpot(f, r) }));
  const edition: FestEdition = {
    year: s.year, attendance: m.attendance, capacity: m.capacity, demand: m.demand, excitement, safety, comfort, rating, queueMin: m.queueMin, revenue, costs,
    weather: storm ? 'storm' : rain ? 'rain' : 'sun', disaster, thoughts, lineup: m.lineup.map((a) => a.name),
  };
  f.rep = Math.round(clamp(f.rep + (rating - 55) / 3 - repHit, 0, 100));
  s.player.reputation.commercial = clamp(s.player.reputation.commercial + (rating - 50) / 25, 0, 100);
  if (rating >= 60 && !disaster) {
    grow(f);
    edition.grew = true;
    bump(s, 'festGood');
  }
  bump(s, 'festEditions');
  if (disaster) bump(s, 'festDisasters');
  bump(s, 'festPeople', m.attendance);
  f.editions.push(edition);
  if (f.editions.length > 12) f.editions.splice(0, f.editions.length - 12);
  remember(s, 'own_festival', fmtL(l('{f} {y}: {n} pessoas, nota {r}.{d}', '{f} {y}: {n} people, rating {r}.{d}'), { f: f.name, y: s.year, n: m.attendance, r: rating, d: disaster ? fmtL(l(' {x}', ' {x}'), { x: disaster }) : '' }), { important: !!disaster || f.editions.length === 1 || rating >= 80 });
  notify(s, fmtL(l('{f}: {n} pessoas, nota {r}.', '{f}: {n} people, rating {r}.'), { f: f.name, n: m.attendance, r: rating }), disaster ? 'bad' : rating >= 60 ? 'good' : 'info');
  queueCutscene(s, 'festivalDay', { title: fmtL(l('{f} {y}', '{f} {y}'), { f: f.name, y: s.year }), festId: f.id, year: s.year });
  return edition;
}

registerSimHook('month', 'live-festival', (s, r) => {
  for (const f of liveOf(s).fests) if (s.month === f.month && s.year >= f.nextYear) runEdition(s, r, f);
});
