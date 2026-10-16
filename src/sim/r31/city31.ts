// R31 · onda 4 (H · Loja e cidade) — A CIDADE DE CADA ÉPOCA, sem DOM. A tela (ui/sys/campus18 + ui/r31/city31px) só lê.
//
//  • Lugares reais da música (src/data/places31.ts): cada um só existe nos anos certos e ocupa um TERRENO RESERVADO
//    (faixa leste de cima, RES_LOTS31) — nunca briga com os lotes que você compra. Vira um lugar do bairro (Place27)
//    com o papel do seu tipo (rádio, casa de shows, estúdio, loja…). Quando fecha, o terreno vira outro negócio.
//    Nome real ou homenagem pelo interruptor "Nomes e obras reais" (registro único src/data/realnames31.ts, `place:`).
//  • Lojas por época (BIZ31): cada tipo tem ano de abertura e de fechamento (partituras, gramofones, discos, rádios e
//    TVs, megastore de CD, locadora, lan house, celulares…). Os terrenos da cidade comum trocam de negócio a cada poucos
//    anos (fixo por semente e lote, sem sorteio do jogo); o registro da cidade avisa "fechou / abriu" na virada do ano.
//  • Festival na cidade: no mês em que há festival (seu, de rival ou do calendário), ele ocupa um terreno com palcos,
//    público e cartaz; festival com terreno fixo (Cidade do Rock) usa o dele.
//  • Outdoors das paradas: os nº 1 de cada parada do seu país (com o nome da parada, só as que existem na época) e o
//    anúncio do seu lançamento em campanha; estilo do painel pela época. Neon das fachadas pela época.
//  • Casa: tipos desde 1889 (interruptor h31.casas), escolher o terreno da casa e imóveis em outras cidades (na faixa
//    "pelo mundo"), com manutenção mensal do bolso.

import { hashString } from '../../core/rng';
import { FESTIVALS } from '../../data/catalog';
import { countryOfCity } from '../../data/geo';
import { PLACES31, RKINDS31, type RKind31, type RealPlace31 } from '../../data/places31';
import { realName31 } from '../../data/realnames31';
import { CITIES, cityById, familyOf, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import type { GameState } from '../types';
import { fmtL, money, remember } from '../util';
import { BLD19, LOTS18, buildings18, campus18, homeLot18, layout18, log18, lotsOpen18, type BKind, type Lot18 } from '../sys/campus18';
import { board, kindAvailable, type ChartKind } from '../sys/charts7';
import { HOUSES, ownerOf } from '../sys/people/owner';
import { P as people } from '../sys/people/state';
import { nb19 } from '../sys/hood19';
import { npcMonth19 } from '../ctx19';
import { PLACE_X27, npcName27, type Place27, type PlaceK27 } from '../sys/place27';
import { registerBaseSection31 } from './base31';
import { registerEditable, registerRunnable } from './editor';
import { purse } from './purse31';
import { registerSwitch, sw } from './switches';

// ---------------------------------------------------------------- interruptores

registerSwitch({ id: 'h31.real', def: true, scope: 'game',
  desc: l('Lugares reais da música no mapa da cidade (rádios, casas de show, estúdios…). Só exibição e lugares para agir.',
    'Real music places on the city map (radios, venues, studios…). Display and places to act only.') });
export const casasOn31 = (s: GameState): boolean => !!sw<boolean>(s, 'h31.casas');
export const realOn31 = (s: GameState): boolean => !!sw<boolean>(s, 'h31.real');

// ---------------------------------------------------------------- utilidades estáveis

const hash = (str: string): number => (hashString(str) >>> 0) / 4294967296;
const ro = <T>(s: GameState, k: string): T | undefined => (s as unknown as { x4?: Record<string, unknown> }).x4?.[k] as T | undefined;

// ---------------------------------------------------------------- terrenos reservados (lugares reais)

/** 12 terrenos reservados na faixa leste de cima (gx 31–43, gy 0–15), coluna por coluna (o mapa só alarga o necessário). */
export const RES_LOTS31: Lot18[] = [31, 35, 39].flatMap((gx, c) => [[3, 4], [9, 4], [0, 3], [13, 3]].map(([gy, d], r) => ({
  gx, gy, w: 4, d, name: l(`Terreno reservado ${c * 4 + r + 1}`, `Reserved plot ${c * 4 + r + 1}`), pm: 1, vis: 1.2 - c * 0.1,
})));
export const RES_N31 = RES_LOTS31.length;

/** Lugares reais extras do editor de base (`b.ext.places31`). */
const EXTRA: RealPlace31[] = [];
const all = (): RealPlace31[] => (EXTRA.length ? [...PLACES31, ...EXTRA] : PLACES31);
let byCity: Map<string, RealPlace31[]> | null = null;
let slotCache = new Map<string, Map<string, number>>();
const reindex = () => { byCity = null; slotCache = new Map(); };
export function placesOf31(city: string): RealPlace31[] {
  if (!byCity) { byCity = new Map(); for (const p of all()) { const a = byCity.get(p.city) ?? []; a.push(p); byCity.set(p.city, a); } }
  return byCity.get(city) ?? [];
}
export const placeOpen31 = (p: RealPlace31, year: number): boolean => year >= p.from && (p.to === 0 || year < p.to);
/** Nome mostrado: real (interruptor ligado) ou homenagem. */
export const placeName31 = (s: GameState, p: RealPlace31): string => realName31(`place:${p.id}`, !!s.config.realNames) ?? (s.config.realNames ? p.real : p.sub);

/** Terreno de cada lugar da cidade: mais antigo primeiro, no menor terreno livre que ninguém ocupa NO MESMO PERÍODO —
 *  o terreno fica com o lugar enquanto ele existir. Lugar sem terreno (capital lotada) aparece só na lista. */
export function slotsOf31(city: string): Map<string, number> {
  const hit = slotCache.get(city);
  if (hit) return hit;
  const m = new Map<string, number>();
  const held: { slot: number; from: number; to: number }[] = [];
  const ps = [...placesOf31(city)].sort((a, b) => Number(!!b.u) - Number(!!a.u) || a.from - b.from || (a.id < b.id ? -1 : 1));
  for (const p of ps) {
    const to = p.to || 99999;
    for (let k = 0; k < RES_N31; k++) {
      if (held.some((x) => x.slot === k && x.from < to && p.from < x.to)) continue;
      held.push({ slot: k, from: p.from, to }); m.set(p.id, k); break;
    }
  }
  slotCache.set(city, m);
  return m;
}
export interface RealLot31 { p: RealPlace31; slot: number; lot: Lot18 }
/** Lugares reais abertos no ano, com terreno (PURO). */
export function realLots31(s: GameState, year = s.year, city = s.config.homeCity): RealLot31[] {
  if (!realOn31(s)) return [];
  const sl = slotsOf31(city);
  return placesOf31(city).filter((p) => placeOpen31(p, year) && sl.has(p.id)).map((p) => ({ p, slot: sl.get(p.id)!, lot: RES_LOTS31[sl.get(p.id)!] }))
    .sort((a, b) => a.slot - b.slot);
}
/** Largura mínima da grade para mostrar os terrenos reservados em uso (0 = nenhum). */
export function minGw31(s: GameState, year = s.year): number {
  const xs = realLots31(s, year);
  return xs.length ? Math.max(...xs.map((x) => x.lot.gx + x.lot.w)) + 1 : 0;
}

const RK27: Record<RKind31, PlaceK27> = { radio: 'radio', tv: 'radio', venue: 'venue', theatre: 'venue', arena: 'venue', store: 'records', studio: 'studio', label: 'label', fest: 'venue', bar: 'bar' };
export const RDRAW31: Record<RKind31, BKind> = { radio: 'media', tv: 'media', venue: 'venue', theatre: 'museum', arena: 'venue', store: 'store', studio: 'studio', label: 'branch', fest: 'fest', bar: 'venue' };
export const RKIND_NAME31: Record<RKind31, L> = {
  radio: l('Rádio', 'Radio station'), tv: l('Emissora de TV', 'TV station'), venue: l('Casa de shows', 'Live venue'), theatre: l('Teatro e sala de concerto', 'Theatre and concert hall'),
  arena: l('Arena de shows', 'Concert arena'), store: l('Loja de discos e instrumentos', 'Record and instrument store'), studio: l('Estúdio de gravação', 'Recording studio'),
  label: l('Sede de gravadora', 'Record label HQ'), fest: l('Terreno de festival', 'Festival grounds'), bar: l('Bar com música ao vivo', 'Bar with live music'),
};
const NOW31: Record<RKind31, L> = {
  radio: l('No ar: programação musical; aceita disco para tocar.', 'On air: music programming; takes records to play.'), tv: l('Programa de auditório e clipes: vitrine para lançamentos.', 'Variety show and videos: a showcase for releases.'),
  venue: l('Agenda aberta: dá para marcar datas.', 'Open calendar: dates can be booked.'), theatre: l('Temporada de concertos e espetáculos.', 'Concert and show season.'),
  arena: l('Grandes shows em datas marcadas.', 'Big shows on set dates.'), store: l('Vitrine de lançamentos e garimpo de usados.', 'New releases in the window and used crates.'),
  studio: l('Salas para alugar por sessão.', 'Rooms for hire by the session.'), label: l('Escritórios da gravadora: reuniões e caça a talentos.', 'Label offices: meetings and talent hunting.'),
  fest: l('Terreno vazio fora do mês do festival.', 'Empty grounds outside festival month.'), bar: l('Música ao vivo quase toda noite.', 'Live music most nights.'),
};
/** O lugar real como lugar do bairro (mesmas ações e interiores de place27; "pele" própria: nome e tipo). */
export function realPlace27(s: GameState, x: RealLot31): Place27 {
  const p = x.p, key = `rp${p.id}`;
  const k = RK27[p.kind];
  const nm = placeName31(s, p);
  const role = p.kind === 'radio' || p.kind === 'tv' ? l('Diretor de programação', 'Programme director') : p.kind === 'studio' ? l('Técnico de gravação', 'Recording engineer') : l('Gerente', 'Manager');
  return { id: `pl:${p.id}`, lot: -1, k, name: l(nm, nm), what: RKIND_NAME31[p.kind], owner: nm, ownerK: k === 'label' ? 'rival' : p.kind === 'radio' || p.kind === 'tv' ? 'media' : 'venue',
    now: fest31(s)?.at === p.id ? l('Festival neste mês: palcos montados e cartaz na entrada.', 'Festival this month: stages up and the poster at the gate.') : NOW31[p.kind],
    people: [{ name: npcName27(s, `${key}|o`), role }, { name: npcName27(s, `${key}|s`), role: l('Equipe da casa', 'House staff') }], also: [], src: 'fill', draw: RDRAW31[p.kind] };
}

// ---------------------------------------------------------------- lojas por época

export interface Biz31 { id: string; name: L; from: number; to: number; draw: BKind; /** fachada com neon/letreiro */ neon?: boolean; /** abre a loja de instrumentos */ shop?: boolean }
const B = (id: string, pt: string, en: string, from: number, to: number, draw: BKind, x: Partial<Biz31> = {}): Biz31 => ({ id, name: l(pt, en), from, to, draw, ...x });
/** Tipos de loja com anos de abertura e de fechamento (fim exclusivo). */
export const BIZ31: Biz31[] = [
  B('sheet', 'Partituras', 'Sheet music', 1880, 1936, 'store'),
  B('piano', 'Pianos e harmônios', 'Pianos and harmoniums', 1880, 1950, 'store'),
  B('telegraph', 'Telégrafo', 'Telegraph office', 1880, 1935, 'office'),
  B('gramophone', 'Gramofones', 'Gramophones', 1898, 1950, 'store'),
  B('tailor', 'Alfaiataria', 'Tailor', 1880, 1975, 'store'),
  B('instruments', 'Loja de instrumentos', 'Instrument shop', 1880, 9999, 'store', { shop: true }),
  B('cinema', 'Cinema', 'Picture house', 1908, 1990, 'venue', { neon: true }),
  B('radio_tv', 'Rádios e TVs', 'Radios and TVs', 1925, 1992, 'store', { neon: true }),
  B('records', 'Discos', 'Records', 1925, 1996, 'store', { neon: true }),
  B('diner', 'Lanchonete', 'Diner', 1940, 9999, 'store', { neon: true }),
  B('jukebox_bar', 'Bar da jukebox', 'Jukebox bar', 1950, 1985, 'venue', { neon: true }),
  B('hifi', 'Som e hi-fi', 'Hi-fi store', 1962, 2005, 'store'),
  B('arcade', 'Fliperama', 'Arcade', 1975, 1998, 'store', { neon: true }),
  B('video', 'Videolocadora', 'Video rental', 1982, 2012, 'store', { neon: true }),
  B('cd_mega', 'Megastore de CD', 'CD megastore', 1988, 2010, 'store', { neon: true }),
  B('pager', 'Bipes e celulares', 'Pagers and phones', 1992, 2004, 'store'),
  B('lan', 'Lan house', 'Internet café', 1998, 2015, 'store', { neon: true }),
  B('phones', 'Celulares', 'Mobile phones', 2002, 9999, 'store', { neon: true }),
  B('games', 'Games', 'Video games', 1990, 9999, 'store', { neon: true }),
  B('vinyl', 'Vinil e colecionadores', 'Vinyl and collectors', 2008, 9999, 'store'),
  B('cowork', 'Café com wi-fi', 'Wi-fi café', 2006, 9999, 'store'),
  B('holo', 'Hologramas', 'Hologram studio', 2030, 9999, 'store', { neon: true }),
  B('bakery', 'Padaria', 'Bakery', 1880, 9999, 'store'),
];
const alive = (y: number) => BIZ31.filter((b) => y >= b.from && y < b.to);
/** Negócio de um terreno no ano (PURO, fixo por semente e lote): troca a cada 5–11 anos e quando o tipo fecha. */
export function bizAt31(seed: string, city: string, lot: number, year: number): Biz31 {
  const per = 5 + Math.floor(hash(`${seed}|biz|per|${city}|${lot}`) * 7);
  const off = Math.floor(hash(`${seed}|biz|off|${city}|${lot}`) * per);
  let y0 = Math.floor((year + off) / per) * per - off;
  let k = `${seed}|biz|${city}|${lot}|${y0}`;
  let pool = alive(Math.max(1889, y0));
  let b = pool[Math.floor(hash(k) * pool.length) % pool.length];
  for (let i = 0; i < 8 && year >= b.to; i++) { y0 = b.to; k = `${k}|${y0}`; pool = alive(y0); b = pool[Math.floor(hash(k) * pool.length) % pool.length]; }
  return b;
}
/** Terrenos de cidade comum (abertos, sem dono, sem vizinho, sem obra) — os que mudam de negócio. */
export function commonLots31(s: GameState): number[] {
  const bs = buildings18(s);
  const open = lotsOpen18(s, bs);
  const used = new Set(layout18(s, bs).values());
  const nbl = new Set(nb19(s).map((x) => x.lot));
  const busy = new Set(campus18(s).proj.map((p) => p.lot));
  return LOTS18.map((_, i) => i).filter((i) => i !== 0 && i < open && !used.has(i) && !nbl.has(i) && !busy.has(i) && i !== homeLot18(s));
}
// place27 consulta o negócio da época para os prédios de cidade comum (não-música)
PLACE_X27.biz = (s, lot, k) => { if (k === 'apartments' && lot % 2 === 0) return null; /* metade dos prédios de moradia continua moradia */ const b = bizAt31(s.config.seed, s.config.homeCity, lot, s.year); return { name: b.name, what: b.name, draw: b.draw, shop: !!b.shop }; };

/** Mudanças de negócio entre dois anos (para o registro da cidade e as etiquetas "abriu/fechou"). */
export function bizChanges31(s: GameState, lots: number[], y0: number, y1: number): { lot: number; was: Biz31; now: Biz31 }[] {
  const out: { lot: number; was: Biz31; now: Biz31 }[] = [];
  for (const lot of lots) {
    const a = bizAt31(s.config.seed, s.config.homeCity, lot, y0), b = bizAt31(s.config.seed, s.config.homeCity, lot, y1);
    if (a.id !== b.id) out.push({ lot, was: a, now: b });
  }
  return out;
}
/** Lugar real que fechou/abriu no ano (para o registro). */
export function realChanges31(s: GameState, year: number): { p: RealPlace31; open: boolean }[] {
  if (!realOn31(s)) return [];
  return placesOf31(s.config.homeCity).filter((p) => p.from === year || p.to === year).map((p) => ({ p, open: p.from === year }));
}

// ---------------------------------------------------------------- festival num terreno

export interface Fest31 { name: string; src: 'mine' | 'rival' | 'world'; /** id do lugar real com terreno fixo, se houver */ at?: string; acts: string[] }
/** Festival da sua cidade neste mês (PURO). Os seus próprios já têm terreno (prédio do festival); aqui entram o do
 *  calendário mundial e o de rival. Festival fixo usa o terreno real de festival da cidade, se houver. */
export function fest31(s: GameState, month = s.month, year = s.year): Fest31 | null {
  const city = s.config.homeCity;
  const w = FESTIVALS.find((f) => f.city === city && (f.month ?? -1) === month && year >= f.start && (f.end === undefined || year <= f.end));
  const vs = ro<{ npc?: { kind: string; labelId: string; name: string; city: string; y: number }[] }>(s, 'ventures9');
  const rv = (vs?.npc ?? []).find((n) => n.kind === 'festival' && n.city === city && n.y <= year && npcMonth19(n) === month);
  if (!w && !rv) return null;
  const fixed = realLots31(s, year).find((x) => x.p.kind === 'fest');
  const fam = new Set(w?.focus ?? []);
  const acts = Object.values(s.acts).filter((a) => a.status === 'active' && !a.deceased && (!fam.size || fam.has(familyOf(a.genre)) || fam.has(a.genre)))
    .sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1)).slice(0, 4).map((a) => a.name);
  return { name: w ? w.name : rv!.name, src: w ? 'world' : 'rival', at: fixed?.p.id, acts };
}
/** Terreno de cidade comum para o festival sem terreno fixo: o maior e mais visível (PURO sobre a lista dada). */
export const festLot31 = (fillers: number[]): number | undefined => { const sz = (n: number) => (LOTS18[n] ? LOTS18[n].w * LOTS18[n].d * (0.5 + LOTS18[n].vis) : 0); return [...fillers].sort((a, b) => sz(b) - sz(a) || a - b)[0]; };

// ---------------------------------------------------------------- outdoors e neon

export type Board31Style = 'painted' | 'neon' | 'backlit' | 'led';
export const boardStyle31 = (y: number): Board31Style => (y < 1950 ? 'painted' : y < 1990 ? 'neon' : y < 2000 ? 'backlit' : 'led');
/** `kind` (R31 POL2): chart = nº 1 de uma parada (capa do disco); paid = seu lançamento em campanha; release = lançamento
 *  recente de rival/seu; hot = artista em alta (retrato); tour = turnê com show marcado na sua cidade (retrato). Todo
 *  outdoor aponta para um lançamento que existe (`relId`); os de artista também para o ato (`actId`). */
export interface Billboard31 { relId: string; title: string; act: string; label: L; mine: boolean; paid?: boolean; kind?: 'chart' | 'paid' | 'release' | 'hot' | 'tour'; actId?: string }
const BOARD_NAME31: Record<ChartKind, L> = {
  songs: l('Nº 1 em músicas', 'No. 1 in songs'), albums: l('Nº 1 em álbuns', 'No. 1 in albums'), stream: l('Nº 1 no streaming', 'No. 1 in streaming'),
  sales: l('Nº 1 em vendas', 'No. 1 in sales'), video: l('Nº 1 em clipes', 'No. 1 in videos'),
};
/** Anúncios (no máximo 4, misturados): até 2 nº 1 das paradas do seu país que existem na época (cada um com o nome da
 *  parada; nada somado), o artista em alta (maior momento entre os ativos com fama), um lançamento recente (o seu em
 *  campanha = anúncio pago; senão o de rival mais famoso das últimas 8 semanas), uma turnê com show marcado na sua
 *  cidade nos próximos 30 dias e, se sobrar lugar, as outras paradas. Um artista/disco aparece uma vez só. Só lê o
 *  estado (sem sorteio). Antes de 1900 não há outdoor. */
export function billboards31(s: GameState): Billboard31[] {
  if (s.year < 1900) return [];
  const a3 = countryOfCity(s.config.homeCity);
  const charts: Billboard31[] = [];
  const seen = new Set<string>(), acts = new Set<string>();
  const rel = (r: { id: string; title: string; actId: string; owner: string }, label: L, kind: Billboard31['kind'], extra: Partial<Billboard31> = {}): Billboard31 =>
    ({ relId: r.id, title: r.title, act: s.acts[r.actId]?.name ?? '', label, mine: r.owner === 'player', kind, ...extra });
  if (a3) for (const k of ['songs', 'albums', 'stream', 'sales', 'video'] as ChartKind[]) {
    if (!kindAvailable(s, k)) continue;
    const r = board(s, a3, k)[0];
    const rl = r ? s.releases[r.relId] : undefined;
    if (!rl || charts.some((x) => x.relId === rl.id)) continue;
    charts.push(rel(rl, BOARD_NAME31[k], 'chart'));
  }
  if (!charts.length) { // sem parada da semana ainda: a parada geral do jogo
    const top = s.charts.singles[0] ? s.releases[s.charts.singles[0].releaseId] : undefined;
    if (top) charts.push(rel(top, BOARD_NAME31.songs, 'chart'));
  }
  const out: Billboard31[] = [];
  const add = (b: Billboard31 | undefined) => {
    if (!b || seen.has(b.relId) || acts.has(s.releases[b.relId]?.actId ?? '')) return;
    seen.add(b.relId); acts.add(s.releases[b.relId]?.actId ?? ''); out.push(b);
  };
  const rels = Object.values(s.releases);
  const lastOf = new Map<string, (typeof rels)[number]>();
  for (const r of rels) { const o = lastOf.get(r.actId); if ((r.week ?? -1) <= s.week && (!o || (r.week ?? 0) > (o.week ?? 0) || ((r.week ?? 0) === (o.week ?? 0) && r.id < o.id))) lastOf.set(r.actId, r); }
  charts.slice(0, 2).forEach(add);
  // artista em alta: maior momento entre os atos ativos com fama (desempate pela fama e pelo id)
  const hot = Object.values(s.acts).filter((a) => (a.status === 'active' || a.status === 'emerging') && a.fame >= 20 && lastOf.has(a.id) && !acts.has(a.id))
    .sort((a, b) => b.momentum - a.momentum || b.fame - a.fame || (a.id < b.id ? -1 : 1))[0];
  if (hot) add(rel(lastOf.get(hot.id)!, l('Em alta', 'Hot right now'), 'hot', { actId: hot.id }));
  const ad = rels.filter((r) => r.owner === 'player' && !seen.has(r.id) && (r.marketing?.length ?? 0) > 0 && s.week - (r.week ?? -99) <= 8 && (r.week ?? 0) <= s.week)
    .sort((a, b) => (b.week ?? 0) - (a.week ?? 0) || (a.id < b.id ? -1 : 1))[0];
  if (ad) add(rel(ad, l('Lançamento: anúncio pago', 'New release: paid ad'), 'paid', { mine: true, paid: true }));
  else {
    const nw = rels.filter((r) => r.owner !== 'player' && !seen.has(r.id) && s.week - (r.week ?? -99) <= 8 && (r.week ?? 0) <= s.week && s.acts[r.actId])
      .sort((a, b) => s.acts[b.actId].fame - s.acts[a.actId].fame || (b.week ?? 0) - (a.week ?? 0) || (a.id < b.id ? -1 : 1))[0];
    if (nw) add(rel(nw, l('Lançamento', 'New release'), 'release'));
  }
  // turnê chegando: show marcado na sua cidade nos próximos 30 dias (o mais próximo)
  let tour: { actId: string; day: number } | undefined;
  for (const t of s.tours ?? []) {
    if (t.status === 'cancelled' || t.status === 'done') continue;
    for (const st of t.stops) if (st.cityId === s.config.homeCity && st.status === 'scheduled' && st.day >= s.day && st.day - s.day <= 30 && lastOf.has(t.actId) && (!tour || st.day < tour.day || (st.day === tour.day && t.actId < tour.actId))) tour = { actId: t.actId, day: st.day };
  }
  if (tour) add(rel(lastOf.get(tour.actId)!, l('Turnê chega à cidade', 'Tour coming to town'), 'tour', { actId: tour.actId }));
  charts.slice(2).forEach(add);
  return out.slice(0, 4);
}
/** Força do neon nas fachadas (0..1): começa nos anos 1920, auge de 1930 a 1960, volta nos 80 e vira LED depois de 2000. */
export function neon31(y: number): { k: 'none' | 'neon' | 'led'; f: number } {
  if (y < 1920) return { k: 'none', f: 0 };
  if (y < 1930) return { k: 'neon', f: 0.45 };
  if (y <= 1960) return { k: 'neon', f: 1 };
  if (y < 1980) return { k: 'neon', f: 0.5 };
  if (y < 1990) return { k: 'neon', f: 0.95 };
  if (y < 2000) return { k: 'neon', f: 0.6 };
  return { k: 'led', f: 0.85 };
}

// ---------------------------------------------------------------- casa: terreno e imóveis em outras cidades

/** Tipos de casa desde 1889 (os 8 de sempre continuam nos mesmos índices). */
export const HOUSES_1889_31 = ['tenement', 'townhouse', 'chalet', 'palacete'];
export const houseOk31 = (s: GameState, idx: number): boolean => { const h = HOUSES[idx]; return !!h && (h.from >= 1920 || casasOn31(s)); };
export const housesAt31 = (s: GameState, year = s.year): number[] => HOUSES.map((_, i) => i).filter((i) => houseOk31(s, i) && HOUSES[i].from <= year && HOUSES[i].to >= year);

/** Terrenos que podem receber a sua casa: abertos e livres (ou o atual). */
export function homeLots31(s: GameState): number[] {
  const free = commonLots31(s);
  const cur = homeLot18(s);
  return [cur, ...free.filter((x) => x !== cur)];
}
/** Escolher o terreno da casa (a casa se muda; custo de mudança do bolso). */
export function chooseHomeLot31(s: GameState, lot: number): L | null {
  const o = ownerOf(s);
  if (o.house < 0) return l('Você ainda não tem casa própria: compre uma primeiro.', 'You do not own a home yet: buy one first.');
  if (lot === homeLot18(s)) return l('A casa já está neste terreno.', 'The house is already on this plot.');
  if (!commonLots31(s).includes(lot)) return l('Terreno ocupado ou ainda fechado.', 'Plot taken or not open yet.');
  const cost = money(s, 4000 + HOUSES[o.house].price * 0.05);
  if (o.wealth < cost) return fmtL(l('Falta dinheiro pessoal para a mudança ({c}).', 'Not enough personal money for the move ({c}).'), { c: formatUsd(cost) });
  purse(s, -cost, 'home', 'moveHome31', { who: o });
  campus18(s).home = lot;
  log18(s, fmtL(l('Você muda a casa para {n}.', 'You move your house to {n}.'), { n: LOTS18[lot].name }));
  return null;
}
const formatUsd = (c: number): string => `$${Math.round(c / 100).toLocaleString('en-US')}`;
export const moveHomeCost31 = (s: GameState): number => { const o = people(s).owner; return o && o.house >= 0 ? money(s, 4000 + HOUSES[o.house].price * 0.05) : 0; };

export interface Home31 { city: string; house: number; y: number; paid: number }
export interface City31St { homes: Home31[]; /** último ano já registrado no registro da cidade */ ly?: number }
declare module '../ext4' { interface Ext4 { city31: City31St } }
const fresh = (): City31St => ({ homes: [] });
registerExt4('city31', fresh);
export function city31(s: GameState): City31St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.city31 ??= fresh()) as City31St;
  st.homes ??= [];
  return st;
}
export const homes31 = (s: GameState): Home31[] => ro<City31St>(s, 'city31')?.homes ?? [];
/** Preço de um imóvel em outra cidade: o tipo, ajustado pelo tamanho da cidade. */
export function homePrice31(s: GameState, city: string, house: number): number {
  const c = cityById[city] as unknown as { w?: number } | undefined;
  const k = 0.8 + Math.min(0.6, (c?.w ?? 1) * 0.1);
  return money(s, HOUSES[house].price * k);
}
export const homeUpkeep31 = (s: GameState, h: Home31): number => money(s, 60 + HOUSES[h.house].price * 0.0012);
export function buyHome31(s: GameState, city: string, house: number): L | null {
  if (!casasOn31(s)) return l('Imóveis em outras cidades estão desligados nesta partida.', 'Homes in other cities are switched off in this game.');
  if (!cityById[city]) return l('Cidade desconhecida.', 'Unknown city.');
  if (city === s.config.homeCity) return l('Na sua cidade, a casa é a principal (compre em "Casa").', 'In your own city, use your main home ("Home").');
  if (!housesAt31(s).includes(house)) return l('Esse tipo de casa não existe nesta época.', 'That kind of house does not exist in this era.');
  const st = city31(s);
  if (st.homes.some((x) => x.city === city)) return l('Você já tem um imóvel nesta cidade.', 'You already own a home in this city.');
  const o = ownerOf(s), price = homePrice31(s, city, house);
  if (o.wealth < price) return l('Patrimônio pessoal insuficiente (o imóvel sai do seu bolso, não da empresa).', 'Not enough personal wealth (the home comes out of your pocket, not the company).');
  purse(s, -price, 'home', 'buyHome31', { who: o });
  st.homes.push({ city, house, y: s.year, paid: price });
  remember(s, 'owner_house', fmtL(l('{o} compra {h} em {c}.', '{o} buys {h} in {c}.'), { o: o.name, h: HOUSES[house].name, c: cityById[city].name }));
  return null;
}
export function sellHome31(s: GameState, city: string): L | null {
  const st = city31(s), i = st.homes.findIndex((x) => x.city === city);
  if (i < 0) return l('Você não tem imóvel nesta cidade.', 'You have no home in this city.');
  const h = st.homes[i], o = ownerOf(s);
  purse(s, Math.round(homePrice31(s, city, h.house) * 0.75), 'home', 'sellHome31', { who: o });
  st.homes.splice(i, 1);
  return null;
}
// imóveis fora da sede na faixa "pelo mundo"
BLD19.f.push((s) => homes31(s).map((h) => ({ id: `h31:${h.city}`, kind: 'home' as BKind, name: `${HOUSES[h.house].name.pt} · ${cityById[h.city]?.name.pt ?? h.city}`, city: h.city, zone: 'world' as const,
  lvl: Math.max(1, Math.min(4, Math.ceil(HOUSES[h.house].prestige / 2))), since: h.y, sy: h.y, goto: { area: 'casa31' },
  kpi: [[l('Manutenção/mês', 'Upkeep/mo'), formatUsd(homeUpkeep31(s, h))] as [L, string]] })));

// ---------------------------------------------------------------- motor: manutenção e registro da cidade

registerSimHook('month', 'city31', (s) => {
  const st = ro<City31St>(s, 'city31');
  if (st?.homes.length && casasOn31(s)) { const o = ownerOf(s); for (const h of st.homes) purse(s, -homeUpkeep31(s, h), 'upkeep', 'home31', { who: o }); }
});
/** Registro da cidade na virada do ano: lojas que fecharam/abriram e lugares reais que abriram/fecharam. */
export function yearLog31(s: GameState): number {
  const st = city31(s);
  if (st.ly === s.year) return 0;
  st.ly = s.year;
  let n = 0;
  for (const c of bizChanges31(s, commonLots31(s), s.year - 1, s.year).slice(0, 3)) {
    log18(s, fmtL(l('Fechou: {a} ({n}). Abriu: {b}.', 'Closed: {a} ({n}). Opened: {b}.'), { a: c.was.name, b: c.now.name, n: LOTS18[c.lot].name })); n++;
  }
  for (const c of realChanges31(s, s.year)) {
    const nm = placeName31(s, c.p);
    log18(s, c.open ? fmtL(l('Abriu: {n} ({k}).', 'Opened: {n} ({k}).'), { n: nm, k: RKIND_NAME31[c.p.kind] }) : fmtL(l('Fechou: {n}. O terreno vai virar outro negócio.', 'Closed: {n}. The plot will become another business.'), { n: nm })); n++;
  }
  return n;
}
registerSimHook('year', 'city31', (s) => { yearLog31(s); });

// ---------------------------------------------------------------- editor (regra 10) e base

registerEditable({ id: 'city31.homeLot', area: 'world', label: l('Terreno da sua casa (nº do lote)', 'Your house plot (lot number)'), kind: 'number', min: 1, max: LOTS18.length - 1,
  get: (s) => homeLot18(s), set: (s, v) => chooseHomeLot31(s, Math.round(Number(v))) ?? undefined });
registerRunnable({ id: 'city31.yearLog', area: 'world', label: l('Registrar agora as lojas que abriram e fecharam', 'Log the shops that opened and closed now'),
  run: (s) => { city31(s).ly = undefined; return fmtL(l('{n} aviso(s) no registro da cidade.', '{n} note(s) in the city log.'), { n: yearLog31(s) }); } });
registerRunnable({ id: 'city31.giveHome', area: 'world', label: l('Dar um imóvel numa cidade (grátis)', 'Give a home in a city (free)'), raw: true,
  arg: { kind: 'select', label: l('Cidade', 'City'), options: () => CITIES.slice(0, 60).map((c) => ({ value: c.id, label: c.name })) },
  run: (s, _t, arg) => { const c = String(arg ?? ''); if (!cityById[c] || c === s.config.homeCity) return l('Escolha outra cidade.', 'Pick another city.'); const st = city31(s); if (!st.homes.some((x) => x.city === c)) st.homes.push({ city: c, house: housesAt31(s)[0] ?? 0, y: s.year, paid: 0 }); return l('Imóvel registrado.', 'Home registered.'); } });

interface PlacesBase31 { add?: RealPlace31[] }
const placesBase = (b: { ext?: Record<string, unknown> } | undefined): PlacesBase31 | undefined => b?.ext?.places31 as PlacesBase31 | undefined;
registerBaseSection31({
  id: 'places31', label: l('Lugares reais da música', 'Real music places'),
  validate: (b) => (placesBase(b as never)?.add ?? []).flatMap((p) => {
    const e: L[] = [];
    if (!p || typeof p.id !== 'string' || !p.id) e.push(l('Lugar sem id.', 'Place without an id.'));
    else if (PLACES31.some((x) => x.id === p.id)) e.push(fmtL(l('Lugar "{i}" já existe.', 'Place "{i}" already exists.'), { i: p.id }));
    if (p && !cityById[p.city]) e.push(fmtL(l('Lugar "{i}": cidade desconhecida.', 'Place "{i}": unknown city.'), { i: String(p.id) }));
    if (p && !RKINDS31.includes(p.kind)) e.push(fmtL(l('Lugar "{i}": tipo desconhecido.', 'Place "{i}": unknown kind.'), { i: String(p.id) }));
    return e;
  }),
  apply: (b) => {
    EXTRA.length = 0;
    for (const p of placesBase(b as never)?.add ?? []) if (p?.id && cityById[p.city] && RKINDS31.includes(p.kind) && !PLACES31.some((x) => x.id === p.id))
      EXTRA.push({ id: p.id, city: p.city, kind: p.kind, from: Math.round(+p.from || 1889), to: Math.round(+p.to || 0), real: String(p.real ?? p.id), sub: String(p.sub ?? p.real ?? p.id) });
    reindex();
  },
});
