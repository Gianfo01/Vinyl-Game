// Rodada 27 (D2) — "Nosso mundo" vivo: funções PURAS que traduzem o estado do jogo em decisões visuais da cidade
// (sem DOM, sem sorteio; testadas em tests/r27-city.test.ts). Quem desenha é campus18px.ts; quem mostra o painel
// lateral é ui/sys/campus18.ts.
//   • clima por cidade e hemisfério (neve só onde há inverno de verdade; trópico sempre verde e saturado);
//   • cara da época (postes, letreiros, roupas, carros) e da cidade (morro + mar no Rio, torres em Nova York,
//     tijolo + chuva em Londres…);
//   • estado de cada prédio (estúdio aceso + fila de músicos, marquise acesa + fila em noite de show, fumaça na
//     fábrica que prensa, andaime + prazo na obra, ícone próprio por tipo + contador de alertas);
//   • lotes "À venda" (sempre ≥3: os que cabem no caixa primeiro, os outros bloqueados com o motivo; com o tipo
//     sugerido); a cidade cresce em bairros novos quando falta terreno; o resto vira cidade comum;
//   • vida na rua (artistas e equipe indo da sede ao estúdio, ônibus da turnê saindo, fãs quando um disco
//     entra na parada, imprensa na porta durante um escândalo);
//   • vizinhos com nome (gravadoras rivais, rádio, bar com palco): quem são e o que estão fazendo;
//   • modelo do painel lateral (o que é, custo/mês, receita, quem está lá, 2–3 ações).

import { tourList } from '../../sim/tours';
import { builtVenue, realVenues } from '../../sim/sys/venuestore27';
import { CLIMATE19 } from '../../data/hood19';
import { LANDMARKS19, landmarksAt19, type Landmark19, type LmShape } from '../../data/landmarks19';
import type { Pop19 } from '../../sim/sys/world19';
import type { Style18 } from '../../sim/sys/campus18';
import { cityById, l, type L } from '../../data/world';
import type { GameState } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';
import { KIND18, LOTS18, buildings18, campus18, dormPeople, layout18, lotsOpen18, storeIncome18, type BKind, type Bld18 } from '../../sim/sys/campus18';
import { NB19, live19ev, nb19, type Nb19 } from '../../sim/sys/hood19';
import { rel18 } from '../../sim/sys/relics18';
import { school18 } from '../../sim/sys/school18';
import { sess18 } from '../../sim/sys/session18';
import { ventures } from '../../sim/sys/ventures9';
import { bldPop19, lotPop19, upkeep19, type PopAct19 } from '../../sim/sys/world19';
import { scandal17 } from '../../sim/scandal17';
import { LMW27B, LMX27B } from './lmdata27';

// ---------------------------------------------------------------- utilidades determinísticas

/** Hash 0..1 estável (sem tocar no RNG do jogo). */
export function h27(...xs: (number | string)[]): number {
  let h = 2166136261;
  for (const x of xs) for (const c of String(x)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- clima e estação

export type Climate27 = 'tropical' | 'arid' | 'mild' | 'cold';
export type Season27 = 'winter' | 'spring' | 'summer' | 'autumn';
const COLD27 = new Set(['new_york', 'chicago', 'detroit', 'boston', 'toronto', 'montreal', 'moscow', 'st_petersburg', 'stockholm', 'berlin', 'minneapolis', 'cleveland', 'kyiv', 'warsaw', 'prague', 'vienna', 'budapest', 'helsinki', 'oslo', 'reykjavik', 'copenhagen', 'munich', 'hamburg', 'seoul', 'beijing', 'kansas_city', 'philadelphia', 'washington']);
const ARID27 = new Set(['cairo', 'las_vegas', 'dubai', 'karachi', 'lahore', 'tehran', 'casablanca', 'algiers', 'oran', 'tunis', 'mexico_city', 'monterrey', 'lima', 'brasilia', 'goiania']);
/** Clima da cidade: trópico (sem inverno), árido, temperado ameno (chuva, neve rara) ou frio (neve todo inverno). */
export function climate27(city: string, lat: number): Climate27 {
  const cl = CLIMATE19[city];
  if (COLD27.has(city) || cl?.snow) return 'cold';
  if (ARID27.has(city)) return 'arid';
  if (Math.abs(lat) < 23.6 || (cl?.sun && Math.abs(lat) < 35)) return 'tropical';
  return Math.abs(lat) >= 50 && !cl ? 'cold' : 'mild';
}
/** Estação astronômica pelo hemisfério (mês 0 = janeiro). */
export function season27(month: number, lat: number): Season27 {
  const m = lat < 0 ? (month + 6) % 12 : month;
  return m === 11 || m <= 1 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn';
}
export interface Env27 { year: number; month: number; lat: number; city: string; climate: Climate27; season: Season27; snow: boolean; rain: boolean; vivid: boolean }
/** Tempo do mês: neve só onde há inverno (frio sempre; ameno em ~1 de 6 meses de inverno; nunca no trópico). */
export function env27(year: number, month: number, lat: number, city = ''): Env27 {
  const climate = climate27(city, lat);
  const season = season27(month, lat);
  const winter = season === 'winter' && climate !== 'tropical' && climate !== 'arid';
  const snow = winter && (climate === 'cold' || h27(city, year, month, 'snow') < 0.16);
  const cl = CLIMATE19[city];
  const pRain = cl ? cl.rain : climate === 'tropical' ? (season === 'summer' ? 0.5 : 0.25) : climate === 'arid' ? 0.04 : 0.3;
  const rain = !snow && h27(city, year, month, 'rain') < pRain;
  return { year, month, lat, city, climate, season, snow, rain, vivid: !snow && !rain };
}

// ---------------------------------------------------------------- cara da época e da cidade

export type Lamp27 = 'gas' | 'iron' | 'sodium' | 'led';
export type Sign27 = 'painted' | 'neon' | 'neon80' | 'screen' | 'holo';
export interface Era27 { lamp: Lamp27; sign: Sign27; outfit: string[]; cars: string[]; hats: boolean }
export function era27(year: number): Era27 {
  const lamp: Lamp27 = year < 1920 ? 'gas' : year < 1960 ? 'iron' : year < 2010 ? 'sodium' : 'led';
  const sign: Sign27 = year < 1925 ? 'painted' : year < 1978 ? 'neon' : year < 1996 ? 'neon80' : year < 2028 ? 'screen' : 'holo';
  const outfit = year < 1920 ? ['#2a2a30', '#4a3a2c', '#5a4a3a', '#1e2a40', '#e4dccb', '#6a2a2a']
    : year < 1955 ? ['#2c3a5e', '#5a4a3a', '#7a2a2a', '#3a4a3a', '#d8cfb8', '#2a2a30']
    : year < 1968 ? ['#2c4a7e', '#c83c3c', '#e8c040', '#3a8a5a', '#f0ece0', '#222226']
    : year < 1980 ? ['#d8692a', '#a87838', '#6a8a3a', '#c84a7a', '#e8c070', '#5e3c26']
    : year < 1992 ? ['#ff48c8', '#3ae0ff', '#f0e040', '#6a45d0', '#f04848', '#202024']
    : year < 2015 ? ['#2a2a30', '#5a6a80', '#e4e0d8', '#3a5a9a', '#9a2a3a', '#7a7a80']
    : ['#e8e4dc', '#2a2a30', '#5ac8a0', '#f0b040', '#6a7aa0', '#c05a5a'];
  const cars = year < 1935 ? ['#202024', '#3a2a24', '#2a3a2a'] : year < 1960 ? ['#7aa8c0', '#e0c8a0', '#a03030', '#4a6a4a', '#202024']
    : year < 1975 ? ['#e8d8b0', '#c83030', '#40a0a0', '#f0e8e0', '#2c4a7e'] : year < 1990 ? ['#a8682a', '#d8b860', '#7a2a2a', '#3a5a3a', '#e8e4d8']
    : year < 2025 ? ['#c8ccd0', '#2a2a30', '#e8e8ec', '#3a4a6a', '#8a2a2a'] : ['#f0f4f8', '#60e0ff', '#c8d0d8', '#2a2a30'];
  return { lamp, sign, outfit, cars, hats: year < 1960 };
}

export type CityK27 = 'bay' | 'towers' | 'brick' | 'stone' | 'plain';
const BAY27 = new Set(['rio', 'salvador', 'florianopolis', 'cape_town', 'honolulu', 'sydney', 'havana', 'san_juan', 'naples', 'lisbon', 'recife', 'fortaleza', 'kingston', 'cartagena', 'zanzibar', 'wellington', 'vancouver', 'hong_kong', 'santo_domingo', 'port_of_spain', 'barcelona', 'marseille', 'istanbul', 'athens', 'beirut', 'dakar', 'durban', 'miami', 'sao_luis', 'belem', 'auckland', 'suva']);
const TOWERS27 = new Set(['new_york', 'chicago', 'hong_kong', 'shanghai', 'tokyo', 'sao_paulo', 'toronto', 'dubai', 'singapore', 'seoul', 'osaka', 'kuala_lumpur', 'houston', 'atlanta', 'philadelphia', 'san_francisco', 'bangkok', 'jakarta', 'mumbai']);
/** r27 (I2): cidades de pedra clara e mansarda (Paris e afins). */
const STONE27 = new Set(['paris', 'madrid', 'vienna', 'budapest', 'prague', 'rome', 'milan', 'buenos_aires', 'brussels', 'bordeaux', 'lyon', 'turin', 'montevideo', 'santiago']);
/** r27 (I2): morro com favela só onde existe (Rio, Salvador); o resto da baía tem encosta verde. */
const FAVELA27 = new Set(['rio', 'salvador']);
/** r27 (I2): altura dos morros da baía (Rio = 1; porto baixo como Sydney ~0,35). */
const HILLS27: Record<string, number> = { rio: 1, salvador: 0.55, cape_town: 1, hong_kong: 0.9, wellington: 0.7, naples: 0.8, sydney: 0.32, miami: 0, recife: 0.15, fortaleza: 0.15, havana: 0.25, barcelona: 0.55, lisbon: 0.5, istanbul: 0.45, vancouver: 0.9, honolulu: 0.7, kingston: 0.75 };
const BRICK27 = new Set(['london', 'manchester', 'liverpool', 'dublin', 'glasgow', 'bristol', 'birmingham', 'sheffield', 'boston', 'amsterdam', 'rotterdam', 'hamburg', 'copenhagen', 'brussels', 'cleveland', 'detroit']);
export interface CityLook27 { k: CityK27; hill: boolean; sea: boolean; tall: boolean; brick: boolean; palms: boolean; wall: string[];
  /** r27 (I2): favela nas encostas (só Rio/Salvador, a partir de 1940) e altura relativa dos morros */ favela: boolean; hillAmp: number }
/** Cara da cidade: morro + mar (Rio), torres (Nova York), tijolo e chaminés (Londres) ou genérica. */
export function cityLook27(city: string, lat: number, year: number): CityLook27 {
  const k: CityK27 = BAY27.has(city) ? 'bay' : TOWERS27.has(city) ? 'towers' : BRICK27.has(city) ? 'brick' : STONE27.has(city) ? 'stone' : 'plain';
  const trop = Math.abs(lat) < 30;
  const wall = k === 'brick' ? ['#8a4430', '#7a3a2a', '#9a5a40', '#6a4a40'] : k === 'bay' ? ['#f0d8a8', '#e8a888', '#a8d0c8', '#f4ecdc', '#e8c868'] : k === 'towers' ? (year < 1950 ? ['#a87a5a', '#8a6a5a', '#c8b8a0'] : ['#8a9aa8', '#5a6a80', '#c8ccd0', '#a87a5a']) : k === 'stone' ? ['#e4d6b8', '#d8c8a6', '#ece2cc', '#cdbb98'] : ['#d0c0a0', '#b8a888', '#a0a8b0', '#c89878'];
  const hillAmp = k === 'bay' ? HILLS27[city] ?? 0.6 : 0;
  return { k, hill: hillAmp > 0.2, sea: k === 'bay', tall: k === 'towers' && year >= 1915, brick: k === 'brick', palms: k === 'bay' && trop || (trop && Math.abs(lat) < 26), wall, favela: FAVELA27.has(city) && year >= 1940, hillAmp };
}

// ---------------------------------------------------------------- ícone por tipo

/** Ícone e cor distintos por tipo (o selo é dourado; o vizinho é cinza). */
export const ICON27: Record<BKind, { ic: string; col: string }> = {
  hq: { ic: 'star', col: '#d0a030' }, branch: { ic: 'bank', col: '#4a70a8' }, studio: { ic: 'mic', col: '#d04040' }, venue: { ic: 'stage', col: '#b02868' },
  fest: { ic: 'ticket', col: '#d87018' }, school: { ic: 'book', col: '#2a68b0' }, museum: { ic: 'vault', col: '#8a7a5a' }, publisher: { ic: 'note', col: '#6a48b8' },
  plant: { ic: 'disc', col: '#5a6470' }, office: { ic: 'globe', col: '#3a7a9a' }, media: { ic: 'radio', col: '#c89a18' }, platform: { ic: 'stream', col: '#20a0a8' },
  booking: { ic: 'tour-bus', col: '#2a80c8' }, rehearsal: { ic: 'drums', col: '#c06028' }, imprint: { ic: 'flag', col: '#3a8a50' }, sublabel: { ic: 'platinum-disc', col: '#b04888' },
  home: { ic: 'house', col: '#4a8a3a' }, store: { ic: 'cd', col: '#d84848' }, sign: { ic: 'bulb', col: '#d0a020' }, dorm: { ic: 'sleep', col: '#7a5ab0' }, park: { ic: 'fans', col: '#3a9a48' },
};
export const NBICON27: Record<Nb19['k'], { ic: string; kind: BKind }> = {
  rival: { ic: 'contract', kind: 'branch' }, records: { ic: 'cd', kind: 'store' }, bar: { ic: 'stage', kind: 'venue' }, rehearsal: { ic: 'drums', kind: 'rehearsal' }, radio: { ic: 'radio', kind: 'media' },
};

// ---------------------------------------------------------------- estado visual de cada prédio

export interface BVis27 {
  id: string; kind: BKind;
  /** janelas acesas mesmo de dia (sessão rolando, show) */
  lit: boolean;
  /** fila na porta (músicos com estojo no estúdio, público na casa de shows) */
  queue: number; queueK?: 'musicians' | 'crowd';
  /** marquise acesa (casa de shows em noite de show) */
  marquee: boolean;
  /** fumaça da chaminé (fábrica prensando) */
  smoke: boolean;
  /** andaime + prazo (meses) */
  scaffold: boolean; eta?: number;
  icon: string; col: string;
  /** contador no ícone: coisas pedindo atenção */
  alerts: number; why: L[];
}

const activeSessions = (s: GameState) => { const mine = new Set(playerActs(s)); return s.sessions.filter((x) => !x.done && mine.has(x.actId)); };

/** Estado visual de todos os prédios do campus (por id). */
export function bldVis27(s: GameState, bs: Bld18[] = buildings18(s)): Map<string, BVis27> {
  const out = new Map<string, BVis27>();
  const st = campus18(s);
  const ses = activeSessions(s);
  const studioV = bs.find((b) => b.zone === 'campus' && b.kind === 'studio' && b.st === 'open');
  const evAt = new Map<string, number>();
  for (const e of live19ev(s)) evAt.set(e.at, (evAt.get(e.at) ?? 0) + 1);
  for (const b of bs) {
    if (b.zone !== 'campus') continue;
    const ic = ICON27[b.kind] ?? ICON27.branch;
    const v: BVis27 = { id: b.id, kind: b.kind, lit: false, queue: 0, marquee: false, smoke: false, scaffold: false, icon: ic.ic, col: ic.col, alerts: 0, why: [] };
    const open = b.st === 'open';
    // estúdio: sessão do selo (no estúdio próprio; sem ele, na sala da sede) ou clientes reservados
    const sesHere = open && (b.kind === 'studio' ? b.id === studioV?.id : b.kind === 'hq' && !studioV) ? ses : [];
    if (sesHere.length) {
      v.lit = true; v.queueK = 'musicians';
      v.queue = Math.min(6, sesHere.reduce((t, x) => t + Math.max(1, s.acts[x.actId]?.members.length ?? 1), 0));
      v.why.push(fmtL(l('Gravando: {a}', 'Recording: {a}'), { a: sesHere.map((x) => s.acts[x.actId]?.name ?? '?').slice(0, 2).join(', ') }));
    } else if (open && b.kind === 'studio' && b.now) { v.lit = true; v.queue = 2; v.queueK = 'musicians'; v.why.push(b.now); }
    // casa de shows: noite de show
    if (open && b.kind === 'venue') {
      const o = b.id.startsWith('ve:') ? realVenues(s).find((x) => `ve:${x.id}` === b.id) : undefined;
      const lv = b.id === 'lv:venue' ? builtVenue(s) : undefined;
      const nights = o?.last?.nights ?? (lv?.history.length ? Math.round((lv.history[lv.history.length - 1].occupancy ?? 0) * 10) : 0);
      if (nights > 0) { v.marquee = true; v.lit = true; v.queueK = 'crowd'; v.queue = Math.min(12, 3 + Math.round(nights / 2)); v.why.push(l('Noite de show: marquise acesa e fila na porta.', 'Show night: marquee lit and a queue at the door.')); }
    }
    if (open && b.kind === 'fest' && b.now) { v.lit = true; v.marquee = true; }
    // fábrica prensando
    if (open && b.kind === 'plant' && b.now) { v.smoke = true; v.lit = true; v.why.push(b.now); }
    // obra
    if (b.st === 'building' || b.st === 'planned' || b.st === 'renovating') {
      v.scaffold = true;
      const p = st.proj.find((x) => x.target === b.id || `c:${x.kind}` === b.id);
      if (p) v.eta = p.left;
      else if (b.prog !== undefined) v.eta = Math.max(1, Math.round((1 - b.prog) * 3));
    }
    // alertas
    if (b.st === 'damaged') { v.alerts++; v.why.push(b.note ?? l('Danificado.', 'Damaged.')); }
    if (b.worn) { v.alerts++; v.why.push(l('Conservação baixa.', 'Poor condition.')); }
    if (b.note && b.st !== 'damaged' && b.kind === 'sublabel') { v.alerts++; v.why.push(b.note); }
    if (b.kind === 'rehearsal' && sess18(s).hb?.strike) { v.alerts++; v.why.push(l('Banda da casa em greve.', 'House band on strike.')); }
    if (v.eta !== undefined && v.eta <= 1) { v.alerts++; v.why.push(l('Obra termina este mês.', 'Works finish this month.')); }
    const ne = evAt.get(b.id) ?? 0;
    if (ne) { v.alerts += ne; v.why.push(l('Evento do bairro esperando decisão.', 'Neighbourhood event awaiting a decision.')); }
    out.set(b.id, v);
  }
  return out;
}

// ---------------------------------------------------------------- lotes à venda

/** r27 (LOTS): `dis` = nenhuma obra cabe no caixa (ou todas já existem): a placa aparece igual, com o preço e o
 *  motivo, e a compra fica bloqueada até dar (antes o lote sumia e virava cidade comum). */
export interface Sale27 { lot: number; price: number; kind: BKind; opt: string; name: L; dis?: L }
/** Lotes livres À VENDA com o tipo sugerido (melhor vizinhança, depois o mais barato). Os que cabem no caixa vêm
 *  primeiro; os outros aparecem bloqueados com o motivo. A cidade cresce (sim/sys/campus18 `dist18`) e os vizinhos
 *  deixam 3 lotes livres: sempre há pelo menos 3 placas enquanto houver bairro para abrir. */
export function forSale27(s: GameState): Sale27[] {
  const bs = buildings18(s);
  const open = lotsOpen18(s, bs);
  const used = new Set(layout18(s, bs).values());
  const st = campus18(s);
  const nbl = new Set(nb19(s).map((x) => x.lot));
  const busy = new Set(st.proj.map((p) => p.lot));
  const out: Sale27[] = [];
  LOTS18.forEach((_, lot) => {
    if (lot === 0 || lot >= open || used.has(lot) || nbl.has(lot) || busy.has(lot)) return;
    const p = lotPop19(s, lot);
    if (!p || !p.opts.length) return;
    const ok = p.opts.filter((o) => !o.dis);
    const pool = ok.length ? ok : [...p.opts];
    const score = (o: (typeof pool)[number]) => o.syn.reduce((t, x) => t + (tx(x).startsWith('−') ? -1 : 1), 0);
    pool.sort((a, b) => score(b) - score(a) || a.cost - b.cost);
    const o = pool[0];
    const kind: BKind = o.id.startsWith('p:') ? (o.id.slice(2) as BKind) : o.id === 'v:festival' ? 'fest' : (o.id.slice(2) as BKind);
    out.push({ lot, price: o.cost, kind: KIND18[kind] ? kind : 'store', opt: o.id, name: o.name, ...(ok.length ? {} : { dis: o.dis }) });
  });
  // no máximo SALE_MAX27 placas (as que cabem no caixa; depois as de lote mais visível; depois as mais baratas): o resto é cidade comum
  return out.sort((a, b) => Number(!!a.dis) - Number(!!b.dis) || LOTS18[b.lot].vis - LOTS18[a.lot].vis || a.price - b.price || a.lot - b.lot).slice(0, SALE_MAX27);
}
export const SALE_MAX27 = 3;
const tx = (x: L | string): string => (typeof x === 'string' ? x : x.pt);
/** Lotes livres (nos bairros abertos) que NÃO estão à venda: viram cidade comum (prédios genéricos). */
export function fillerLots27(s: GameState, sale: Sale27[] = forSale27(s)): number[] {
  const bs = buildings18(s);
  const open = lotsOpen18(s, bs);
  const used = new Set(layout18(s, bs).values());
  const nbl = new Set(nb19(s).map((x) => x.lot));
  const busy = new Set(campus18(s).proj.map((p) => p.lot));
  const sl = new Set(sale.map((x) => x.lot));
  return LOTS18.map((_, i) => i).filter((i) => i !== 0 && i < open && !used.has(i) && !nbl.has(i) && !busy.has(i) && !sl.has(i));
}

// ---------------------------------------------------------------- vida na rua

export interface Walker27 { who: string; k: 'artist' | 'staff'; from: string; to: string }
export interface Life27 {
  walkers: Walker27[];
  /** ônibus da turnê saindo da sede */
  bus?: { act: string; tour: string };
  /** fãs na porta (disco na parada): quantidade e por quê */
  fans: number; fansWhy?: L;
  /** imprensa na porta (escândalo recente) */
  press: number; pressWhy?: L;
}
const WEEKS_SCANDAL27 = 8;
export function life27(s: GameState, bs: Bld18[] = buildings18(s)): Life27 {
  const mine = playerActs(s);
  const mineSet = new Set(mine);
  const camp = bs.filter((b) => b.zone === 'campus' && b.st === 'open');
  const studio = camp.find((b) => b.kind === 'studio');
  const walkers: Walker27[] = [];
  // artistas em sessão: da sede (ou da casa dos artistas) ao estúdio
  const dorm = camp.find((b) => b.kind === 'dorm');
  for (const x of activeSessions(s)) {
    const a = s.acts[x.actId];
    if (!a) continue;
    const from = dorm ? dorm.id : 'hq', to = studio ? studio.id : 'hq';
    if (from !== to) for (const m of a.members.slice(0, 3)) walkers.push({ who: s.persons[m]?.name ?? a.name, k: 'artist', from, to });
    if (walkers.length >= 6) break;
  }
  // equipe: da sede para os prédios com gente (estúdio, casa de shows, editora…)
  const dest = camp.filter((b) => b.kind !== 'hq' && b.kind !== 'home' && b.kind !== 'sign' && b.kind !== 'park');
  const staff = s.player.staff.slice(0, 4);
  staff.forEach((p, i) => { if (dest.length) walkers.push({ who: p.name, k: 'staff', from: 'hq', to: dest[i % dest.length].id }); });
  // ônibus da turnê: turnê rodando (ou que começa em até 2 semanas)
  const tr = tourList(s).find((t) => mineSet.has(t.actId) && (t.status === 'running' || (t.status === 'planned' && (t.stops[0]?.day ?? 1e9) - s.day <= 14)));
  const bus = tr ? { act: s.acts[tr.actId]?.name ?? '?', tour: tr.name } : undefined;
  // fãs: disco seu na parada (mais perto do topo = mais gente)
  let fans = 0, fansWhy: L | undefined;
  for (const [list, kind] of [[s.charts.singles, l('single', 'single')], [s.charts.albums, l('álbum', 'album')]] as const) {
    list.slice(0, 40).forEach((e, i) => {
      const r = s.releases[e.releaseId];
      if (r?.owner !== 'player') return;
      const n = i < 1 ? 18 : i < 5 ? 12 : i < 10 ? 8 : i < 20 ? 5 : 3;
      if (n > fans) { fans = n; fansWhy = fmtL(l('{t} ({k}) em #{p} na parada: fãs na porta da sede.', '{t} ({k}) at #{p} in the charts: fans at the HQ door.'), { t: r.title, k: kind, p: i + 1 }); }
    });
  }
  // imprensa: escândalo de um artista seu nas últimas semanas
  let press = 0, pressWhy: L | undefined;
  for (const [id, m] of Object.entries(scandal17(s).last)) {
    if (!mineSet.has(id) || s.week - m.w > WEEKS_SCANDAL27) continue;
    const n = Math.min(8, 3 + Math.round(m.sev));
    if (n > press) { press = n; pressWhy = fmtL(l('Escândalo com {a}: imprensa na porta.', 'Scandal involving {a}: press at the door.'), { a: s.acts[id]?.name ?? '?' }); }
  }
  return { walkers, bus, fans, fansWhy, press, pressWhy };
}

// ---------------------------------------------------------------- vizinhos com nome

export interface NbInfo27 { lot: number; k: Nb19['k']; name: L; who: L; doing: L; icon: string; sale: boolean; price: number }
/** Quem é o vizinho e o que está fazendo agora (rival: reputação, elenco, última jogada; rádio: o que toca…). */
export function nbInfo27(s: GameState): NbInfo27[] {
  const top = s.charts.singles[0] ? s.releases[s.charts.singles[0].releaseId] : undefined;
  const topAlb = s.charts.albums[0] ? s.releases[s.charts.albums[0].releaseId] : undefined;
  return nb19(s).map((x) => {
    let who: L = NB19[x.k].n, doing: L = l('Movimento normal na rua.', 'Business as usual.');
    if (x.k === 'rival') {
      const rv = x.who ? s.labels[x.who] : undefined; // r27 (CITY2): sem rival local = escritório genérico (nunca um estrangeiro)
      if (rv) {
        who = fmtL(l('{n} — reputação {r}, {k} artistas', '{n} — reputation {r}, {k} acts'), { n: rv.name, r: Math.round(rv.reputation), k: rv.roster.length });
        doing = rv.lastDecision ?? (rv.strategy === 'buy_catalog' ? l('Comprando catálogos antigos.', 'Buying old catalogues.') : rv.strategy === 'stars' ? l('Caçando estrelas para contratar.', 'Hunting for stars to sign.') : rv.strategy === 'niche' ? l('Cuidando do seu nicho.', 'Tending its niche.') : l('Desenvolvendo artistas novos.', 'Developing new acts.'));
      } else doing = l('Escritório pequeno, poucos contratos.', 'Small office, few contracts.');
    } else if (x.k === 'radio') {
      doing = top ? fmtL(l('No ar agora: "{t}" ({a}).', 'On air now: "{t}" ({a}).'), { t: top.title, a: s.acts[top.actId]?.name ?? '?' }) : l('Programa de variedades no ar.', 'Variety show on air.');
      if (top?.owner === 'player') doing = fmtL(l('Tocando o SEU disco: "{t}".', 'Playing YOUR record: "{t}".'), { t: top.title });
    } else if (x.k === 'records') {
      doing = topAlb ? fmtL(l('Vitrine: "{t}" ({a}).', 'Window display: "{t}" ({a}).'), { t: topAlb.title, a: s.acts[topAlb.actId]?.name ?? '?' }) : l('Saldão de discos usados.', 'Used-records sale.');
    } else if (x.k === 'bar') {
      const local = Object.values(s.acts).find((a) => a.city === s.config.homeCity && a.owner !== 'player' && a.status !== 'retired' && h27(s.config.seed, a.id, s.year, s.month) < 0.2);
      doing = local ? fmtL(l('Hoje no palco: {a}.', 'On stage tonight: {a}.'), { a: local.name }) : l('Noite de jam aberta.', 'Open jam night.');
    } else if (x.k === 'rehearsal') doing = l('Bandas da cidade ensaiando até tarde.', 'Local bands rehearsing late.');
    return { lot: x.lot, k: x.k, name: x.name, who, doing, icon: NBICON27[x.k].ic, sale: x.sale, price: x.price };
  });
}

// ---------------------------------------------------------------- painel lateral

export interface Panel27 {
  id: string; title: string; icon: string; col: string;
  what: L; desc?: L;
  cost?: number; income?: number;
  who: string[];
  now: L[];
  /** 2–3 ações principais (ir para a tela, ampliar, vender) — ids das ações de bldPop19 */
  main: PopAct19[];
  /** sede: entrar na sede (interior) */
  enter?: boolean;
}
const names = (s: GameState, ids: string[], n = 6) => ids.map((id) => s.persons[id]?.name ?? s.acts[id]?.name).filter((x): x is string => !!x).slice(0, n);
/** Painel de um prédio seu: o que é, custo/mês, receita/mês, quem está lá, ações principais. */
export function panel27(s: GameState, id: string, bs: Bld18[] = buildings18(s)): Panel27 | null {
  const b = bs.find((x) => x.id === id);
  if (!b) return null;
  const p = bldPop19(s, id);
  const ic = ICON27[b.kind] ?? ICON27.branch;
  const up = upkeep19(s, b);
  let income: number | undefined;
  const who: string[] = [];
  const now: L[] = [];
  if (b.now) now.push(b.now);
  if (b.kind === 'hq') {
    income = Object.values(s.lastMonthLedger ?? {}).reduce((t, v) => t + (v > 0 ? v : 0), 0);
    who.push(...s.player.staff.slice(0, 4).map((x) => x.name));
    who.push(...playerActs(s).map((a) => s.acts[a]?.name).filter((x): x is string => !!x).slice(0, 4));
  } else if (b.id.startsWith('v:')) {
    const v = ventures(s).list.find((x) => `v:${x.id}` === b.id);
    const last = v?.pl[v.pl.length - 1];
    if (last) income = last.rev;
    if (v?.kind === 'studio') {
      for (const x of activeSessions(s)) { const a = s.acts[x.actId]; if (a) who.push(a.name, ...names(s, a.members, 3)); }
      for (const bk of v.booked ?? []) who.push(s.labels[bk.lab]?.name ?? bk.lab);
    }
    if (v) who.push(fmtL(l('{n} funcionário(s)', '{n} staff'), { n: v.staff }).pt);
  } else if (b.id.startsWith('ve:')) {
    const o = realVenues(s).find((x) => `ve:${x.id}` === b.id);
    if (o?.last) income = Math.max(0, o.last.net);
    if (o?.actId && s.acts[o.actId]) who.push(s.acts[o.actId].name);
    if (o?.last?.att) now.push(fmtL(l('{a} pessoas no último mês', '{a} people last month'), { a: o.last.att }));
  } else if (b.id === 'lv:venue') {
    const h = builtVenue(s)?.history.slice(-1)[0];
    if (h) income = h.revenue;
  } else if (b.id === 'c:store') income = storeIncome18(s);
  else if (b.kind === 'museum') income = Math.round(rel18(s).inc / 12);
  else if (b.kind === 'dorm') who.push(...names(s, dormPeople(s), 8));
  else if (b.kind === 'school') { const so = school18(s).own; if (so?.teacher) who.push(s.persons[so.teacher]?.name ?? '?'); if (so) now.push(fmtL(l('{n} alunos', '{n} students'), { n: so.students })); }
  else if (b.kind === 'rehearsal') { const hb = sess18(s).hb; if (hb) who.push(...names(s, hb.players, 6)); }
  if (!who.length && b.staff) who.push(fmtL(l('{n} funcionário(s)', '{n} staff'), { n: b.staff }).pt);
  // ações principais: ir para a tela, ampliar, vender (na ordem), só as que existem
  const acts = p?.acts ?? [];
  const pick = (k: string) => acts.find((a) => a.id === k);
  const main = (['go', 'up', 'sell'] as const).map(pick).filter((a): a is PopAct19 => !!a);
  if (main.length < 2) { const r = pick('reno') ?? pick('rush'); if (r) main.push(r); }
  return { id, title: b.name, icon: ic.ic, col: ic.col, what: KIND18[b.kind].name, cost: up?.v, income, who: [...new Set(who)].slice(0, 8), now, main: main.slice(0, 3), enter: b.kind === 'hq' };
}

/** Nome curto de cidade (para legendas). */
export const cityName27 = (id: string): L => cityById[id]?.name ?? l(id, id);

// ---------------------------------------------------------------- r27 (I2): a sede por fora = a sede por dentro

/** Casca da sede — a MESMA de `shellOf27` (ui/ps/hqpx27.ts, corte do interior); os testes conferem. */
export type HqShell27 = 'garage' | 'shop' | 'loft' | 'building' | 'tower' | 'campus';
const SHELLS27: HqShell27[] = ['garage', 'shop', 'loft', 'building', 'tower', 'campus'];
/** Andares do corte do interior por casca (SPEC de hqpx27: garagem 1, sala alugada 2, loft 2, prédio 3, torre 5, campus 5). */
export const HQ_FLOORS27: Record<HqShell27, number> = { garage: 1, shop: 2, loft: 3, building: 4, tower: 5, campus: 5 }; // r27: = LEVELS27 (hqrooms27) com todos os andares comprados
/** Sem pele de vidro antes deste ano (bíblia de arte, docs/art27-city.md). */
export const GLASS_FROM27 = 1968;
/** Fachada (mesmos materiais do mapa: Style18 de sim/sys/campus18). */
export type Facade27 = Style18;
export interface HqIn27 {
  /** nível da sede (s.player.hq: 0 garagem … 5 campus) */
  level: number; year: number;
  /** andares abertos (I1: salas/andares compráveis — `hqRooms27(s)`); sem isso, os andares do corte */
  floorsOpen?: number;
  /** um andar (ou a ampliação) em obra: andaime no topo */
  building?: boolean;
  /** estilo escolhido pelo jogador (world19); ignorado se for vidro antes de 1968 */
  style?: Facade27;
}
export interface HqExt27 {
  shell: HqShell27; floors: number; building: boolean; facade: Facade27; glass: boolean;
  /** pegada (células) e altura de um andar (px); H = altura total (com o andar em obra) */
  w: number; d: number; fh: number; H: number;
  roof: 'gable' | 'flat' | 'tank' | 'crown' | 'antenna' | 'garden';
  sign: Sign27; crane: boolean; rooftopSign: boolean;
}
const FH27: Record<HqShell27, number> = { garage: 9, shop: 7, loft: 9, building: 7, tower: 9, campus: 7 };
const FP27: Record<HqShell27, [number, number]> = { garage: [2.2, 2], shop: [2.4, 2.1], loft: [3.2, 2.6], building: [3.2, 2.8], tower: [2.6, 2.6], campus: [4.6, 4] };
/** Fachada da época para cada casca (sem vidro antes de 1968). */
export function hqFacade27(shell: HqShell27, year: number): Facade27 {
  switch (shell) {
    case 'garage': return year < 1925 ? 'victorian' : year < 1960 ? 'brick' : 'midcentury';
    case 'shop': return year < 1920 ? 'victorian' : year < 1955 ? 'brick' : year < 1985 ? 'midcentury' : 'postmod';
    case 'loft': return 'loft';
    case 'building': return year < 1905 ? 'victorian' : year < 1925 ? 'beaux' : year < 1946 ? 'deco' : year < GLASS_FROM27 ? 'midcentury' : year < 1985 ? 'brutal' : year < 2000 ? 'postmod' : 'glass';
    case 'tower': return year < 1946 ? 'deco' : year < GLASS_FROM27 ? 'midcentury' : 'glass';
    case 'campus': return year < GLASS_FROM27 ? 'midcentury' : year < 2010 ? 'glass' : 'eco';
  }
}
/** A sede vista de fora: mesma casca, andares e época do interior; obra = andaime no andar de cima.
 *  Gancho para I1: `hqExt27({ level: s.player.hq, year: s.year, floorsOpen: hqRooms27(s).floors, building: hqRooms27(s).building })`. */
export function hqExt27(o: HqIn27): HqExt27 {
  const shell = SHELLS27[Math.max(0, Math.min(5, Math.floor(o.level)))];
  const floors = Math.max(1, Math.round(o.floorsOpen ?? HQ_FLOORS27[shell]));
  const glassOk = (f: Facade27) => !(f === 'glass' || f === 'neon' || f === 'eco') || o.year >= GLASS_FROM27;
  const facade = o.style && glassOk(o.style) && shell !== 'garage' && shell !== 'loft' ? o.style : hqFacade27(shell, o.year);
  const [w, d] = FP27[shell], fh = FH27[shell];
  const building = !!o.building;
  const H = (floors + (building ? 1 : 0)) * fh + (shell === 'garage' ? 0 : 2);
  const roof = shell === 'garage' || (shell === 'shop' && o.year < 1960) ? 'gable' : shell === 'loft' ? 'tank' : shell === 'tower' ? (facade === 'deco' ? 'crown' : 'antenna') : shell === 'campus' ? 'garden' : o.year < 1960 ? 'tank' : 'flat';
  return { shell, floors, building, facade, glass: facade === 'glass', w, d, fh, H, roof, sign: era27(o.year).sign, crane: building && (shell === 'building' || shell === 'tower' || shell === 'campus'), rooftopSign: shell === 'building' || shell === 'tower' || shell === 'campus' };
}

// ---------------------------------------------------------------- r27 (I2): marcos no mapa (até 4, os mais icônicos do ano)

/** Peso de ícone: quanto mais alto, mais cedo entra no mapa (Big Ben antes de Abbey Road). */
export const LMW27: Record<string, number> = {
  lon_bigben: 10, lon_tbridge: 9, lon_eye: 6, lon_bt: 5, lon_rah: 4, lon_abbey: 3,
  par_eiffel: 10, par_arc: 8, par_olympia: 3,
  ny_empire: 10, ny_liberty: 9, ny_wtc: 8, ny_brooklyn: 7, ny_carnegie: 3, ny_apollo: 3,
  rio_christ: 10, rio_corcovado: 9, rio_cable: 9, rio_sugar: 9, rio_maracana: 6,
  sp_masp: 9, sp_italia: 8, sp_municipal: 7,
  liv_liver: 10, liv_cavern: 6, man_trafford: 6, man_fth: 5,
  mem_sun: 9, mem_bridge: 7, mem_pyramid: 6, nash_ryman: 9, nash_opry: 8, nash_batman: 7,
  tok_tower: 10, tok_sky: 9, tok_budokan: 6, ber_tv: 10, ber_gate: 9, ber_wall: 7,
  syd_opera: 10, syd_bridge: 9, la_sign: 9, la_griffith: 7, la_bowl: 6, chi_sears: 9, chi_chess: 4,
  sf_gate: 10, sea_needle: 10, tor_cn: 10, was_capitol: 9, was_monument: 8, det_ambassador: 7, det_hitsville: 8,
  ...LMW27B, // r27 (I2b): marcos novos do mapa (lmdata27.ts)
};
/** Marcos que só existem no mapa (relevo natural e prédios fora do horizonte do jogo — não mexem na simulação). */
export const LMX27: Landmark19[] = [
  { id: 'sp_masp', city: 'sao_paulo', n: l('MASP', 'MASP'), from: 1968, sh: 'hall', fact: l('O museu da Avenida Paulista, suspenso sobre um vão livre de 74 m, foi inaugurado em 1968.', 'The Avenida Paulista museum, hung over a 74 m open span, opened in 1968.') },
  { id: 'rio_sugar', city: 'rio', n: l('Pão de Açúcar', 'Sugarloaf Mountain'), from: -9999, to: 1912, sh: 'cable', fact: l('O morro de granito na entrada da baía; o bondinho só chega em 1912.', 'The granite peak at the mouth of the bay; the cable car only arrives in 1912.') },
  { id: 'rio_corcovado', city: 'rio', n: l('Corcovado', 'Corcovado'), from: -9999, to: 1931, sh: 'statue', fact: l('O pico ainda sem o Cristo (inaugurado em 1931).', 'The peak still without the Christ (inaugurated in 1931).') },
  { id: 'mem_pyramid', city: 'memphis', n: l('Pirâmide de Memphis', 'Memphis Pyramid'), from: 1991, sh: 'pyramid', fact: l('Arena em forma de pirâmide aberta em 1991 à beira do Mississippi.', 'Pyramid-shaped arena opened in 1991 on the Mississippi.') },
  { id: 'nash_batman', city: 'nashville', n: l('Torre de duas pontas', 'Twin-spired tower'), from: 1994, sh: 'spire', fact: l('O arranha-céu de duas pontas do centro foi concluído em 1994.', 'Downtown\'s twin-spired skyscraper was completed in 1994.') },
  ...LMX27B, // r27 (I2b): marcos novos do mapa (lmdata27.ts)
];
/** Marco no mapa: bastidor 0–1 = altos (fundo), 2–3 = largos (laterais). */
export interface MapLm27 extends Landmark19 { slot: number; w: number }
const WIDE27 = new Set<LmShape>(['bridge', 'tbridge', 'arch', 'shell', 'cable', 'stadium', 'wall', 'gate', 'colosseum', 'temple', 'hall', 'sign', 'studio', 'pyramid', 'wheel']);
/** Até 4 marcos de pé no ano (construídos e não demolidos), os mais icônicos primeiro. Cidade sem marco
 *  cadastrado: os genéricos de landmarksAt19 (catedral, ponte, estádio, torre de TV, pela época). */
export function mapLms27(city: string, year: number): MapLm27[] {
  const all = [...LANDMARKS19, ...LMX27].filter((x) => x.city === city);
  const up = (x: Landmark19) => x.from <= year && (x.to === undefined || year < x.to);
  const src = all.length ? all.filter(up) : landmarksAt19(city, year);
  const w = (x: Landmark19) => LMW27[x.id] ?? (x.music ? 4 : 5);
  const pick = [...src].sort((a, b) => w(b) - w(a) || a.from - b.from || (a.id < b.id ? -1 : 1)).slice(0, 4);
  const tall = pick.filter((x) => !WIDE27.has(x.sh)), wide = pick.filter((x) => WIDE27.has(x.sh));
  const slots: (Landmark19 | undefined)[] = [tall[0], tall[1], wide[0], wide[1]];
  const rest = [...tall.slice(2), ...wide.slice(2)];
  for (let i = 0; i < 4 && rest.length; i++) if (!slots[i]) slots[i] = rest.shift();
  return slots.flatMap((x, i) => (x ? [{ ...x, slot: i, w: w(x) }] : []));
}
/** Popup de um marco do mapa (inclusive os que não estão entre os 4 do horizonte do jogo). */
export function lmPop27(city: string, id: string, year: number): Pop19 | null {
  const x = mapLms27(city, year).find((m) => m.id === id);
  if (!x) return null;
  const rows: Pop19['rows'] = x.from > -9999 ? [{ k: l('Desde', 'Since'), v: x.from < 0 ? `${-x.from} a.C.` : String(x.from) }] : [];
  if (x.to && x.from > -9999) rows.push({ k: l('Até', 'Until'), v: String(x.to) });
  return { kind: 'lot', id: `lm:${x.id}`, title: x.n, icon: 'star', tags: [l('Marco da cidade', 'City landmark')], rows, notes: [{ t: x.fact }], acts: [], opts: [] };
}
