// Rodada 27 (D2) — "Nosso mundo" vivo: funções PURAS que traduzem o estado do jogo em decisões visuais da cidade
// (sem DOM, sem sorteio; testadas em tests/r27-city.test.ts). Quem desenha é campus18px.ts; quem mostra o painel
// lateral é ui/sys/campus18.ts.
//   • clima por cidade e hemisfério (neve só onde há inverno de verdade; trópico sempre verde e saturado);
//   • cara da época (postes, letreiros, roupas, carros) e da cidade (morro + mar no Rio, torres em Nova York,
//     tijolo + chuva em Londres…);
//   • estado de cada prédio (estúdio aceso + fila de músicos, marquise acesa + fila em noite de show, fumaça na
//     fábrica que prensa, andaime + prazo na obra, ícone próprio por tipo + contador de alertas);
//   • lotes "À venda" (só os que você pode pagar, com o tipo sugerido); o resto vira cidade comum;
//   • vida na rua (artistas e equipe indo da sede ao estúdio, ônibus da turnê saindo, fãs quando um disco
//     entra na parada, imprensa na porta durante um escândalo);
//   • vizinhos com nome (gravadoras rivais, rádio, bar com palco): quem são e o que estão fazendo;
//   • modelo do painel lateral (o que é, custo/mês, receita, quem está lá, 2–3 ações).

import { CLIMATE19 } from '../../data/hood19';
import { cityById, l, type L } from '../../data/world';
import type { GameState } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';
import { KIND18, LOTS18, buildings18, campus18, dormPeople, layout18, storeIncome18, type BKind, type Bld18 } from '../../sim/sys/campus18';
import { NB19, live19ev, nb19, nbRivals19, type Nb19 } from '../../sim/sys/hood19';
import { liveOf } from '../../sim/sys/live/state';
import { rel18 } from '../../sim/sys/relics18';
import { school18 } from '../../sim/sys/school18';
import { sess18 } from '../../sim/sys/session18';
import { ventures } from '../../sim/sys/ventures9';
import { v17 } from '../../sim/sys/venues17';
import { bldPop19, lotPop19, upkeep19, type PopAct19 } from '../../sim/sys/world19';
import { scandal17 } from '../../sim/scandal17';

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

export type CityK27 = 'bay' | 'towers' | 'brick' | 'plain';
const BAY27 = new Set(['rio', 'salvador', 'florianopolis', 'cape_town', 'honolulu', 'sydney', 'havana', 'san_juan', 'naples', 'lisbon', 'recife', 'fortaleza', 'kingston', 'cartagena', 'zanzibar', 'wellington', 'vancouver', 'hong_kong', 'santo_domingo', 'port_of_spain', 'barcelona', 'marseille', 'istanbul', 'athens', 'beirut', 'dakar', 'durban', 'miami', 'sao_luis', 'belem', 'auckland', 'suva']);
const TOWERS27 = new Set(['new_york', 'chicago', 'hong_kong', 'shanghai', 'tokyo', 'sao_paulo', 'toronto', 'dubai', 'singapore', 'seoul', 'osaka', 'kuala_lumpur', 'houston', 'atlanta', 'philadelphia', 'san_francisco', 'bangkok', 'jakarta', 'mumbai']);
const BRICK27 = new Set(['london', 'manchester', 'liverpool', 'dublin', 'glasgow', 'bristol', 'birmingham', 'sheffield', 'boston', 'amsterdam', 'rotterdam', 'hamburg', 'copenhagen', 'brussels', 'cleveland', 'detroit']);
export interface CityLook27 { k: CityK27; hill: boolean; sea: boolean; tall: boolean; brick: boolean; palms: boolean; wall: string[] }
/** Cara da cidade: morro + mar (Rio), torres (Nova York), tijolo e chaminés (Londres) ou genérica. */
export function cityLook27(city: string, lat: number, year: number): CityLook27 {
  const k: CityK27 = BAY27.has(city) ? 'bay' : TOWERS27.has(city) ? 'towers' : BRICK27.has(city) ? 'brick' : 'plain';
  const trop = Math.abs(lat) < 30;
  const wall = k === 'brick' ? ['#8a4430', '#7a3a2a', '#9a5a40', '#6a4a40'] : k === 'bay' ? ['#f0d8a8', '#e8a888', '#a8d0c8', '#f4ecdc', '#e8c868'] : k === 'towers' ? (year < 1950 ? ['#a87a5a', '#8a6a5a', '#c8b8a0'] : ['#8a9aa8', '#5a6a80', '#c8ccd0', '#a87a5a']) : ['#d0c0a0', '#b8a888', '#a0a8b0', '#c89878'];
  return { k, hill: k === 'bay', sea: k === 'bay', tall: k === 'towers' && year >= 1915, brick: k === 'brick', palms: k === 'bay' && trop || (trop && Math.abs(lat) < 26), wall };
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
      const o = b.id.startsWith('ve:') ? v17(s).own.find((x) => `ve:${x.id}` === b.id) : undefined;
      const lv = b.id === 'lv:venue' ? liveOf(s).venue : undefined;
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

export interface Sale27 { lot: number; price: number; kind: BKind; opt: string; name: L }
/** Lotes livres que você PODE pagar agora, com o tipo sugerido (melhor vizinhança, depois o mais barato). */
export function forSale27(s: GameState): Sale27[] {
  const bs = buildings18(s);
  const used = new Set(layout18(s, bs).values());
  const st = campus18(s);
  const nbl = new Set(nb19(s).map((x) => x.lot));
  const busy = new Set(st.proj.map((p) => p.lot));
  const out: Sale27[] = [];
  LOTS18.forEach((_, lot) => {
    if (lot === 0 || used.has(lot) || nbl.has(lot) || busy.has(lot)) return;
    const p = lotPop19(s, lot);
    if (!p) return;
    const ok = p.opts.filter((o) => !o.dis);
    if (!ok.length) return;
    const score = (o: (typeof ok)[number]) => o.syn.reduce((t, x) => t + (tx(x).startsWith('−') ? -1 : 1), 0);
    ok.sort((a, b) => score(b) - score(a) || a.cost - b.cost);
    const o = ok[0];
    const kind: BKind = o.id.startsWith('p:') ? (o.id.slice(2) as BKind) : o.id === 'v:festival' ? 'fest' : (o.id.slice(2) as BKind);
    out.push({ lot, price: o.cost, kind: KIND18[kind] ? kind : 'store', opt: o.id, name: o.name });
  });
  // no máximo SALE_MAX27 placas (as de lote mais visível; depois as mais baratas): o resto é cidade comum
  return out.sort((a, b) => LOTS18[b.lot].vis - LOTS18[a.lot].vis || a.price - b.price || a.lot - b.lot).slice(0, SALE_MAX27);
}
export const SALE_MAX27 = 3;
const tx = (x: L | string): string => (typeof x === 'string' ? x : x.pt);
/** Lotes livres que NÃO estão à venda para você: viram cidade comum (prédios genéricos). */
export function fillerLots27(s: GameState, sale: Sale27[] = forSale27(s)): number[] {
  const bs = buildings18(s);
  const used = new Set(layout18(s, bs).values());
  const nbl = new Set(nb19(s).map((x) => x.lot));
  const busy = new Set(campus18(s).proj.map((p) => p.lot));
  const sl = new Set(sale.map((x) => x.lot));
  return LOTS18.map((_, i) => i).filter((i) => i !== 0 && !used.has(i) && !nbl.has(i) && !busy.has(i) && !sl.has(i));
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
  const tr = s.tours.find((t) => mineSet.has(t.actId) && (t.status === 'running' || (t.status === 'planned' && (t.stops[0]?.day ?? 1e9) - s.day <= 14)));
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
  const rivals = nbRivals19(s);
  return nb19(s).map((x) => {
    let who: L = NB19[x.k].n, doing: L = l('Movimento normal na rua.', 'Business as usual.');
    if (x.k === 'rival') {
      const rv = (x.who ? s.labels[x.who] : undefined) ?? rivals[0];
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
    const o = v17(s).own.find((x) => `ve:${x.id}` === b.id);
    if (o?.last) income = Math.max(0, o.last.net);
    if (o?.actId && s.acts[o.actId]) who.push(s.acts[o.actId].name);
    if (o?.last?.att) now.push(fmtL(l('{a} pessoas no último mês', '{a} people last month'), { a: o.last.att }));
  } else if (b.id === 'lv:venue') {
    const h = liveOf(s).venue?.history.slice(-1)[0];
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
