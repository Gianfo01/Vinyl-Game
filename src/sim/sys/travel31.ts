// R31 · onda 4 (T) — AEROPORTO, TRANSPORTE POR ÉPOCA, CRUZEIROS E O FUTURO. Plano: docs/r31/plano-pagina.md,
// "Aeroporto" e "Transporte por época, cruzeiros e o futuro".
//
//  • AEROPORTO POR ÉPOCA (puro): até 1919 a cidade tem só estação de trem e porto; campo de pouso em 1919–1929;
//    terminal a partir de 1930; jatos a partir de 1958; hangar de jatinhos a partir de 1965. A cena lê daqui:
//    partidas (para onde seus artistas vão), desembarque (estrangeiros que vêm tocar na sua cidade; seu artista
//    voltando famoso), alfândega (importações da casa de leilões), sala VIP (intermediário das facções de fora,
//    executivos estrangeiros) e hangar (avião fretado = logística "avião" da turnê).
//  • NOTÍCIAS DA AVIAÇÃO (fato 'aviation_news', manchete do jornal): primeiro voo motorizado (1903), primeira linha
//    aérea comercial (1914), primeiro voo transatlântico de passageiros (1939), era do jato (1958), rádio pirata num
//    navio (1964), hyperloop (2035) e o boato do teletransporte (2040, sem efeito). Uma vez cada; partida começada
//    depois só noticia o que é do último ano.
//  • TEMPORADAS NO MAR (interruptor 'cruise31'): orquestra do transatlântico (1900–1950: cachê pequeno, o ato
//    desembarca no destino da turnê), navio de cruzeiro (1970+: pagamento fixo, pouca fama, bom para veteranos) e
//    cruzeiro temático (2000+: festival no mar de uma semana).
//  • SHOW POR HOLOGRAMA (interruptor 'holo31', 2027+): um show transmitido para várias cidades ao mesmo tempo, com
//    menos receita e menos fama que o ao vivo. Não há teletransporte (apagaria a logística da turnê).
// Sorte: nenhuma (tudo determinístico pelas contas do jogo). Estado: x4.travel31.

import { clamp } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { cityById, l, type L } from '../../data/world';
import { registerDeadline } from '../calendar19';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { cashWhy20, freeCash20 } from '../oblig20';
import { lock31, lockOf31, UNLOCK31, type Lock31 } from '../r31/lock';
import { registerEditable, registerRunnable } from '../r31/editor';
import { registerSwitch, sw } from '../r31/switches';
import { addStress } from '../stress17';
import { cityDemand } from '../tours';
import type { Act, GameState } from '../types';
import type { Tour } from '../xtypes';
import { fmtL, money, playerActs, post } from '../util';
import { headline19 } from './factlink19';

// ---------------------------------------------------------------- interruptores

registerSwitch({
  id: 'cruise31', def: true, scope: 'game',
  desc: l('Temporadas no mar (onda 4): orquestra do transatlântico, navio de cruzeiro e cruzeiro temático, com cachê fixo.',
    'Seasons at sea (wave 4): ocean-liner orchestra, cruise ship and theme cruise, with a fixed fee.'),
});
registerSwitch({
  id: 'holo31', def: true, scope: 'game',
  desc: l('Show por holograma (onda 4, 2027+): transmitido para várias cidades ao mesmo tempo, menos receita e fama que o ao vivo.',
    'Hologram show (wave 4, 2027+): broadcast to several cities at once, less revenue and fame than live.'),
});
export const cruiseOn31 = (s: GameState): boolean => sw<boolean>(s, 'cruise31');
export const holoOn31 = (s: GameState): boolean => sw<boolean>(s, 'holo31');

// ---------------------------------------------------------------- estado

export type CruiseK31 = 'liner' | 'cruise' | 'theme';
export interface Cruise31 { id: string; act: string; k: CruiseK31; from: number; until: number; fee: number; dest?: string; earned: number }
export interface Travel31State {
  /** notícias da aviação já dadas */
  news: Record<string, 1>;
  cr: Cruise31[];
  /** último show por holograma por ato (semana) */
  holo: Record<string, number>;
  seq: number;
  log: [number, L][];
  /** editor: multiplicador dos cachês no mar */
  feeX?: number;
}
declare module '../ext4' { interface Ext4 { travel31: Travel31State } }
const fresh = (): Travel31State => ({ news: {}, cr: [], holo: {}, seq: 0, log: [] });
registerExt4('travel31', fresh);
export function travel31(s: GameState): Travel31State {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.travel31 ??= fresh()) as Travel31State;
  st.news ??= {}; st.cr ??= []; st.holo ??= {}; st.seq ??= 0; st.log ??= [];
  return st;
}
const peek = (s: GameState): Travel31State | undefined => (s.x4 as unknown as { travel31?: Travel31State }).travel31;
const logT = (s: GameState, t: L): void => { const st = travel31(s); st.log.push([s.week, t]); if (st.log.length > 30) st.log.splice(0, st.log.length - 30); };

// ---------------------------------------------------------------- aeroporto por época (puro)

export type Airport31 = 'rail' | 'field' | 'terminal' | 'jet';
export const AIRPORT_NAME31: Record<Airport31, L> = {
  rail: l('Estação de trem e porto', 'Railway station and port'),
  field: l('Campo de pouso', 'Airfield'),
  terminal: l('Aeroporto com terminal', 'Airport with a terminal'),
  jet: l('Aeroporto internacional (jatos)', 'International airport (jets)'),
};
export const airportOf31 = (y: number): Airport31 => (y < 1919 ? 'rail' : y < 1930 ? 'field' : y < 1958 ? 'terminal' : 'jet');
/** O hangar de jatinhos chega com os jatos executivos. */
export const HANGAR_FROM31 = 1965;
/** Onde fica a sala VIP do intermediário (como em broker31: porto, hotel, aeroporto). */
export const vipPlace31 = (y: number): L => (y < 1919 ? l('Sala de espera do porto', 'Port waiting room') : y < 1950 ? l('Saguão do hotel do aeroporto', 'Airport hotel lobby') : l('Sala VIP', 'VIP lounge'));

/** Ato seu (elenco ou banda do jogador). */
const mineAct = (s: GameState, id: string): boolean => { const a = s.acts[id]; return !!a && (a.owner === 'player' || !!a.playerBand || playerActs(s).includes(id)); };
const homeA3 = (s: GameState): string => countryOfCity(s.config.homeCity) ?? '';
const weekOfDay = (s: GameState, day: number): number => s.week + Math.round((day - (s.day + s.clock.dayInMonth)) / 7);
const abroad = (s: GameState, city: string): boolean => (countryOfCity(city) ?? '') !== homeA3(s);

export interface Flight31 { tour: string; act: string; city: string; w: number; mine: boolean; fame: number }
/** Partidas: os próximos destinos fora do país das turnês dos seus artistas (até 8 semanas). */
export function departures31(s: GameState, weeks = 8): Flight31[] {
  const mine = new Set(playerActs(s));
  const out: Flight31[] = [];
  for (const t of s.tours) {
    if (!mine.has(t.actId) || (t.status !== 'planned' && t.status !== 'running')) continue;
    const st = t.stops.find((x) => x.status === 'scheduled' && abroad(s, x.cityId));
    if (!st) continue;
    const w = weekOfDay(s, st.day);
    if (w <= s.week + weeks) out.push({ tour: t.id, act: t.actId, city: st.cityId, w: Math.max(s.week, w), mine: true, fame: s.acts[t.actId]?.fame ?? 0 });
  }
  return out.sort((a, b) => a.w - b.w || (a.tour < b.tour ? -1 : 1)).slice(0, 8);
}
/** Desembarque: artistas de fora com show marcado na sua cidade (até 6 semanas) e os seus voltando de turnê
 *  internacional nas últimas 3 semanas (a multidão no portão é do tamanho da fama). */
export function arrivals31(s: GameState): Flight31[] {
  const home = s.config.homeCity;
  const mine = new Set(playerActs(s));
  const out: Flight31[] = [];
  for (const t of s.tours) {
    const a = s.acts[t.actId];
    if (!a) continue;
    if (mine.has(t.actId)) {
      if (t.status !== 'done' || !t.stops.some((x) => abroad(s, x.cityId))) continue;
      const last = t.stops.filter((x) => x.status === 'played').at(-1);
      const w = last ? weekOfDay(s, last.day) : s.week - 99;
      if (w >= s.week - 3 && w <= s.week) out.push({ tour: t.id, act: t.actId, city: last!.cityId, w, mine: true, fame: a.fame });
      continue;
    }
    if (t.status !== 'planned' && t.status !== 'running') continue;
    if ((countryOfCity(a.city) ?? '') === homeA3(s)) continue;
    const st = t.stops.find((x) => x.status === 'scheduled' && x.cityId === home);
    if (!st) continue;
    const w = weekOfDay(s, st.day);
    if (w >= s.week && w <= s.week + 6) out.push({ tour: t.id, act: t.actId, city: home, w, mine: false, fame: a.fame });
  }
  return out.sort((a, b) => b.fame - a.fame).slice(0, 8);
}
/** Tamanho da multidão no portão (0–4) pela fama. */
export const crowd31 = (fame: number): number => (fame >= 85 ? 4 : fame >= 70 ? 3 : fame >= 50 ? 2 : fame >= 30 ? 1 : 0);
/** Acontecimentos da época no aeroporto: vistos negados das turnês dos seus artistas (mais recentes primeiro). */
export function airportEvents31(s: GameState): { tour: Tour; city: string }[] {
  const mine = new Set(playerActs(s));
  const out: { tour: Tour; city: string }[] = [];
  for (const t of s.tours) {
    if (!mine.has(t.actId)) continue;
    for (const st of t.stops) if (st.status === 'cancelled' && st.visa && st.note?.en === 'visa denied') out.push({ tour: t, city: st.cityId });
  }
  return out.slice(-5).reverse();
}

// ---------------------------------------------------------------- notícias da aviação

export const AVIATION31: { id: string; y: number; m: number; t: L }[] = [
  { id: 'flight', y: 1903, m: 11, t: l('Dois irmãos fabricantes de bicicletas voam 12 segundos numa máquina com motor, numa praia da Carolina do Norte.', 'Two bicycle-making brothers fly for 12 seconds in a powered machine on a North Carolina beach.') },
  { id: 'airline', y: 1914, m: 0, t: l('Nasce a primeira linha aérea comercial: um hidroavião leva um passageiro por vez através da baía de Tampa.', 'The first commercial airline is born: a flying boat carries one passenger at a time across Tampa Bay.') },
  { id: 'airfield', y: 1919, m: 7, t: l('Começam as primeiras linhas regulares de passageiros entre capitais: as cidades ganham campos de pouso.', 'The first scheduled passenger routes between capitals begin: cities get airfields.') },
  { id: 'atlantic', y: 1939, m: 5, t: l('Primeiro voo transatlântico com passageiros pagantes: um hidroavião gigante cruza o oceano em menos de 30 horas.', 'First transatlantic flight with paying passengers: a giant flying boat crosses the ocean in under 30 hours.') },
  { id: 'jet', y: 1958, m: 9, t: l('Começa a era do jato: Nova York e Londres ficam a sete horas de distância. Turnê mundial vira coisa de um mês.', 'The jet age begins: New York and London are seven hours apart. A world tour becomes a month-long affair.') },
  { id: 'pirate', y: 1964, m: 2, t: l('Uma rádio pirata transmite rock de um navio ancorado em águas internacionais, fora do alcance da lei.', 'A pirate radio station broadcasts rock from a ship anchored in international waters, beyond the law\'s reach.') },
  { id: 'hyperloop', y: 2035, m: 3, t: l('Abre a primeira linha comercial de hyperloop: cápsulas a 1.000 km/h entre cidades do mesmo continente.', 'The first commercial hyperloop line opens: pods at 1,000 km/h between cities on the same continent.') },
  { id: 'teleport', y: 2040, m: 4, t: l('Boato da semana: um laboratório diz ter "teletransportado" um átomo. Produtores de turnê respiram aliviados — não serve para bandas.', 'Rumour of the week: a lab claims to have "teleported" an atom. Tour promoters breathe again — it does not work for bands.') },
];
function newsMonth(s: GameState): void {
  const st = travel31(s);
  const now = s.year * 12 + s.month;
  for (const n of AVIATION31) {
    if (st.news[n.id]) continue;
    const at = n.y * 12 + n.m;
    if (at > now) continue;
    st.news[n.id] = 1;
    if (now - at > 12) continue; // partida começada depois: só o que é recente vira notícia
    emitFact(s, { kind: 'aviation_news', actors: [], severity: n.id === 'teleport' ? 10 : 35, visibility: n.id === 'teleport' ? 'rumor' : 'public', tags: ['travel31', n.id], src: 'travel31', text: n.t, data: { id: n.id } });
  }
}
onFact('aviation_news', (s, f) => { headline19(s, f.text, f.tags.includes('teleport') ? 1 : 2); }, 'travel31:press');

// ---------------------------------------------------------------- temporadas no mar

export const CRUISE31: Record<CruiseK31, { name: L; desc: L; from: number; to?: number; weeks: number; fee: number; fame: number; stress: number }> = {
  liner: { name: l('Orquestra do transatlântico', 'Ocean-liner orchestra'), desc: l('Uma travessia tocando no salão do navio; o ato desembarca no destino escolhido (bom para começar uma turnê lá).', 'A crossing playing in the ship\'s ballroom; the act lands at the chosen destination (good to start a tour there).'), from: 1900, to: 1950, weeks: 3, fee: 900, fame: 0.2, stress: 0.5 },
  cruise: { name: l('Temporada em navio de cruzeiro', 'Cruise-ship season'), desc: l('Três meses de shows a bordo: pagamento fixo, pouca fama. Bom para veteranos.', 'Three months of shows on board: a fixed fee, little fame. Good for veterans.'), from: 1970, weeks: 13, fee: 5000, fame: 0.1, stress: 0.8 },
  theme: { name: l('Cruzeiro temático', 'Theme cruise'), desc: l('Uma semana de festival no mar com fãs do gênero: cachê alto e fãs fiéis.', 'A week-long festival at sea with genre fans: a high fee and loyal fans.'), from: 2000, weeks: 1, fee: 25000, fame: 1.2, stress: 1.5 },
};
const feeX = (s: GameState): number => peek(s)?.feeX ?? 1;
/** Veterano (15+ anos de estrada) recebe mais no navio de cruzeiro. */
export const veteran31 = (s: GameState, a: Act): boolean => s.year - (a.debutYear || a.formed || s.year) >= 15;
/** Cachê da temporada (dinheiro do jogo): por mês na temporada de cruzeiro, total nas outras. */
export function cruiseFee31(s: GameState, a: Act, k: CruiseK31): number {
  const d = CRUISE31[k];
  const vet = k === 'cruise' && veteran31(s, a) ? 1.3 : 1;
  return Math.round(money(s, d.fee * (0.4 + a.fame / 80) * vet) * feeX(s));
}
export const cruiseOpen31 = (s: GameState): CruiseK31[] => (Object.keys(CRUISE31) as CruiseK31[]).filter((k) => s.year >= CRUISE31[k].from && (!CRUISE31[k].to || s.year <= CRUISE31[k].to!));
export const atSea31 = (s: GameState, actId: string): Cruise31 | undefined => peek(s)?.cr.find((x) => x.act === actId && x.until > s.week);
const touring = (s: GameState, actId: string): boolean => s.tours.some((t) => t.actId === actId && (t.status === 'planned' || t.status === 'running'));
/** Portos de destino da travessia (outro continente, com cena). */
export function linerPorts31(s: GameState): string[] {
  const home = cityById[s.config.homeCity];
  const ports = ['new_york', 'london', 'rio', 'buenos_aires', 'lisbon', 'havana', 'paris', 'new_orleans'].filter((c) => cityById[c] && c !== s.config.homeCity);
  return home ? ports.filter((c) => cityById[c].market !== home.market) : ports;
}
/** Motivo do bloqueio antes do clique (null = pode). */
export function cruiseLock31(s: GameState, actId: string, k: CruiseK31): Lock31 | null {
  const a = s.acts[actId];
  if (!cruiseOn31(s)) return lock31(l('Temporadas no mar estão desligadas nesta partida.', 'Seasons at sea are off in this game.'), l('Ligue o interruptor no editor.', 'Turn the switch on in the editor.'));
  if (!a || !mineAct(s, actId)) return lockOf31(l('Só para artistas do seu elenco.', 'Only for acts on your roster.'));
  if (!cruiseOpen31(s).includes(k)) return lock31(fmtL(l('{n} não existe nesta época.', '{n} does not exist in this era.'), { n: CRUISE31[k].name }), fmtL(l('Abre em {y}.', 'Opens in {y}.'), { y: CRUISE31[k].from }));
  if (atSea31(s, actId)) return lock31(l('O ato já está no mar.', 'The act is already at sea.'), UNLOCK31.generic);
  if (touring(s, actId)) return lock31(l('O ato tem turnê marcada ou em andamento.', 'The act has a tour booked or under way.'), l('Espere a turnê acabar ou cancele-a.', 'Wait for the tour to end or cancel it.'));
  return null;
}
/** Fechar a temporada. `dest` = porto de chegada (travessia). */
export function bookCruise31(s: GameState, actId: string, k: CruiseK31, dest?: string): L | null {
  const lk = cruiseLock31(s, actId, k);
  if (lk) return lk.why;
  const a = s.acts[actId];
  const st = travel31(s);
  if (k === 'liner' && (!dest || !linerPorts31(s).includes(dest))) return l('Escolha o porto de chegada.', 'Pick the arrival port.');
  const d = CRUISE31[k];
  const x: Cruise31 = { id: `cr${++st.seq}`, act: actId, k, from: s.week, until: s.week + d.weeks, fee: cruiseFee31(s, a, k), dest: k === 'liner' ? dest : undefined, earned: 0 };
  st.cr.push(x);
  if (st.cr.length > 30) st.cr.splice(0, st.cr.length - 30);
  const t = fmtL(l('{a} embarca: {n}.', '{a} sets sail: {n}.'), { a: a.name, n: d.name });
  logT(s, t);
  emitFact(s, { kind: 'show', actors: [a.id, 'player'], severity: 12 + Math.round(d.fame * 10), visibility: 'public', tags: ['live', 'cruise31', k], src: 'travel31', text: t });
  // cachê: a temporada de cruzeiro paga por mês; travessia e cruzeiro temático pagam na hora
  if (k !== 'cruise') { post(s, `cr31:${x.id}`, x.fee, 'live', `${d.name.pt}: ${a.name}`); x.earned = x.fee; a.fame = clamp(a.fame + d.fame, 0, 100); }
  if (k === 'theme') a.fans.core += Math.round(150 + a.fame * 8);
  return null;
}
function cruiseMonth(s: GameState): void {
  const st = peek(s);
  if (!st) return;
  for (const x of st.cr) {
    const a = s.acts[x.act];
    if (!a || x.until <= s.week - 5) continue;
    if (x.k === 'cruise' && x.until > s.week - 4) {
      x.earned += x.fee;
      post(s, `cr31m:${x.id}:${s.year}-${s.month}`, x.fee, 'live', `${CRUISE31.cruise.name.pt}: ${a.name}`);
      a.fame = clamp(a.fame + CRUISE31.cruise.fame, 0, 100);
    }
    for (const p of a.members) if (s.persons[p]?.alive && x.until > s.week - 4) addStress(s, p, CRUISE31[x.k].stress, l('Temporada no mar', 'Season at sea'));
    // a travessia termina com o ato no porto de chegada (a turnê pode começar dali)
    if (x.dest && x.until <= s.week && s.location[x.act] !== x.dest) { s.location[x.act] = x.dest; logT(s, fmtL(l('{a} desembarca em {c}.', '{a} lands in {c}.'), { a: a.name, c: cityById[x.dest]?.name ?? l(x.dest) })); }
  }
}

// ---------------------------------------------------------------- show por holograma

export const HOLO_FROM31 = 2027;
export const HOLO_GAP31 = 8;
export interface HoloQuote31 { cost: number; revenue: number; fame: number; viewers: number; why: { label: L; value: string }[] }
/** Orçamento do show por holograma (puro): ~40% do público do ao vivo em cada cidade, ingresso de casa média. */
export function holoQuote31(s: GameState, actId: string, cities: string[]): HoloQuote31 {
  const a = s.acts[actId];
  const cs = [...new Set(cities)].filter((c) => cityById[c]).slice(0, 8);
  const viewers = a ? Math.round(cs.reduce((t, c) => t + cityDemand(s, a, c) * 0.4, 0)) : 0;
  const revenue = Math.round(viewers * money(s, 25));
  const cost = money(s, 40000 + 15000 * cs.length);
  const fame = Math.round((0.3 + 0.15 * cs.length) * 10) / 10;
  return { cost, revenue, fame, viewers, why: [
    { label: l('Cidades na transmissão', 'Cities in the broadcast'), value: String(cs.length) },
    { label: l('Público por cidade', 'Audience per city'), value: l('40% do que iria ao show ao vivo', '40% of what a live show would draw').pt },
    { label: l('Fama', 'Fame'), value: `+${fame}` },
  ] };
}
export function holoLock31(s: GameState, actId: string): Lock31 | null {
  if (!holoOn31(s)) return lock31(l('O show por holograma está desligado nesta partida.', 'Hologram shows are off in this game.'), l('Ligue o interruptor no editor.', 'Turn the switch on in the editor.'));
  if (s.year < HOLO_FROM31) return lock31(l('A tecnologia do holograma volumétrico ainda não existe.', 'Volumetric hologram technology does not exist yet.'), fmtL(l('Chega em {y}.', 'Arrives in {y}.'), { y: HOLO_FROM31 }));
  if (!mineAct(s, actId)) return lockOf31(l('Só para artistas do seu elenco.', 'Only for acts on your roster.'));
  const last = peek(s)?.holo[actId];
  if (last !== undefined && s.week - last < HOLO_GAP31) return lock31(l('Este ato fez um show por holograma há pouco.', 'This act did a hologram show recently.'), fmtL(l('Libera em {n} semana(s).', 'Unlocks in {n} week(s).'), { n: HOLO_GAP31 - (s.week - last) }));
  return null;
}
export function holoShow31(s: GameState, actId: string, cities: string[]): L | null {
  const lk = holoLock31(s, actId);
  if (lk) return lk.why;
  const q = holoQuote31(s, actId, cities);
  if (!q.viewers) return l('Escolha ao menos uma cidade.', 'Pick at least one city.');
  if (freeCash20(s) < q.cost) return cashWhy20(s, q.cost, l('Caixa insuficiente para a produção.', 'Not enough cash for the production.'));
  const a = s.acts[actId];
  post(s, `holo31c:${actId}:${s.week}`, -q.cost, 'live_costs', `Produção do holograma: ${a.name}`);
  post(s, `holo31r:${actId}:${s.week}`, q.revenue, 'live', `Show por holograma: ${a.name}`);
  a.fame = clamp(a.fame + q.fame, 0, 100);
  travel31(s).holo[actId] = s.week;
  const t = fmtL(l('{a} faz um show por holograma em {n} cidade(s) ao mesmo tempo: {v} espectadores.', '{a} plays a hologram show in {n} cities at once: {v} viewers.'), { a: a.name, n: [...new Set(cities)].length, v: q.viewers.toLocaleString('en-US') });
  logT(s, t);
  emitFact(s, { kind: 'show', actors: [a.id, 'player'], severity: 25, visibility: 'public', tags: ['live', 'hologram31'], src: 'travel31', text: t });
  return null;
}

// ---------------------------------------------------------------- ganchos, calendário, editor

registerSimHook('month', 'travel31', (s) => { newsMonth(s); cruiseMonth(s); });
registerDeadline('travel31', (s, from, to) => (peek(s)?.cr ?? []).filter((x) => x.until >= from && x.until <= to && playerActs(s).includes(x.act)).map((x) => ({
  id: `travel31:${x.id}`, w: x.until, kind: 'tour' as const, tone: 'info' as const, goto: { area: 'airport31' },
  t: fmtL(l('{a} volta do mar ({n})', '{a} is back from sea ({n})'), { a: s.acts[x.act]?.name ?? '?', n: CRUISE31[x.k].name }),
})));
registerEditable({
  id: 'travel31.feeX', area: 'world', kind: 'number', label: l('Cachês das temporadas no mar (×)', 'Fees for seasons at sea (×)'),
  min: 0, max: 5, step: 0.1, get: (s) => feeX(s), set: (s, v) => { travel31(s).feeX = clamp(Number(v), 0, 5); },
});
registerRunnable({
  id: 'travel31.news', area: 'world', label: l('Dar agora as notícias da aviação já acontecidas', 'Run the aviation news that already happened'),
  run: (s) => { newsMonth(s); return l('Feito.', 'Done.'); },
});
