// Construtor de festival (inspiração: RollerCoaster Tycoon). O jogador monta um terreno em grade com
// palcos, acessos, banheiros, comida, bar, camping, segurança, posto médico e merch; escolhe line-up,
// data e preço. Na data, a simulação calcula lotação, empolgação, conforto, segurança, filas,
// pensamentos do público e desastres. O festival cresce a cada edição bem-sucedida.
// r27 (AUD1): aqui fica o TERRENO (grade, peças, line-up, modelo de lotação/conforto); o ciclo e a edição são do fest12.

import { addOwnFest, ownFests } from '../feststore';
import { clamp } from '../../../core/rng';
import { cityById, l, type L } from '../../../data/world';
import { registerSimHook } from '../../ext4';
import type { Act, GameState } from '../../types';
import { fmtL, money, nextId, post, remember } from '../../util';
import { isMine, type FestTile, type OwnFestival } from './state';
import { cashWhy20, freeCash20 } from '../../oblig20';

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
  if (ownFests(s).length >= MAX_FESTS) return l('Limite de dois festivais próprios.', 'Limit of two own festivals.');
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
  if (freeCash20(s) < cost) return cashWhy20(s, cost, l('Caixa insuficiente para a licença e o terreno.', 'Not enough cash for the permit and the land.'));
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
  addOwnFest(s, f);
  remember(s, 'fest_founded', fmtL(l('Nasce o festival {f} em {c}.', 'The {f} festival is born in {c}.'), { f: f.name, c: cityById[cityId].name }), { important: true });
  return f;
}

export function placeTile(s: GameState, festId: string, x: number, y: number, tile: FestTile): L | null {
  const f = ownFests(s).find((x2) => x2.id === festId);
  if (!f) return l('Festival inválido.', 'Invalid festival.');
  if (x < 0 || y < 0 || x >= f.w || y >= f.h) return l('Fora do terreno.', 'Outside the grounds.');
  f.grid[y * f.w + x] = tile;
  return null;
}

export function setFestival(s: GameState, festId: string, patch: Partial<Pick<OwnFestival, 'price' | 'days' | 'month' | 'name'>>): void {
  const f = ownFests(s).find((x) => x.id === festId);
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
  const f = ownFests(s).find((x) => x.id === festId);
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
  const f = ownFests(s).find((x) => x.id === festId);
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

/** r19 (careers19): teto de público do terreno (alugado na edição 0; cresce por passo explícito). Injetado: sem ciclo. */
export const festCap19: { f: (s: GameState, f: OwnFestival) => number } = { f: () => Infinity };
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
  const capacity = Math.min(groundCap, gateCap, festCap19.f(s, f)); // r19 (careers19): terreno alugado limita o público
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

// r27 (AUD1): a edição antiga daqui (runEdition, mesmo gancho 'live-festival') era sombra do ciclo do fest12 e saiu:
// toda edição de festival próprio roda em fest12.runEdition12 (uma fonte só para line-up, caixa e histórico).
// O lugar do gancho fica reservado aqui (fest12 registra o mesmo id e o substitui na mesma posição da ordem).
registerSimHook('month', 'live-festival', () => {});
