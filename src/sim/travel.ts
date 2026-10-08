// Viagens, vistos e clima para turnês (mapa e planejador de turnês).
// Puro e determinístico: nada de RNG aqui. Quem chama sorteia com as probabilidades devolvidas
// (denyChance, cancelRisk) usando o próprio Rng. Custos em dólares reais (2020); converta com nominal().

import { countryOfCity, unitOfCity, cityBorderNote, type PoliticalUnit } from '../data/geo';
import { cityById, l, type City, type L } from '../data/world';

export type TransportMode = 'train' | 'bus' | 'ship' | 'prop_plane' | 'jet' | 'hyperloop';

export interface Transport {
  mode: TransportMode;
  /** dias de viagem (múltiplos de 0,5) */
  days: number;
  /** custo por pessoa em dólares reais (2020) */
  costReal: number;
}

export interface Visa {
  needed: boolean;
  processingDays: number;
  /** custo total para a equipe, dólares reais */
  costReal: number;
  /** chance de negativa (0..1) */
  denyChance: number;
  reason: L;
  /** turnê sujeita a boicote cultural (ex.: África do Sul do apartheid, 1980–1991): custa reputação */
  boycott?: boolean;
}

export interface Leg {
  from: string;
  to: string;
  km: number;
  mode: TransportMode;
  days: number;
  /** custo total da equipe (passagens + frete de equipamento), dólares reais */
  costReal: number;
  visa: Visa;
  borderNote?: L;
}

// ---------------------------------------------------------------- distâncias

const R_EARTH = 6371;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function cityDistanceKm(a: string, b: string): number {
  const ca = cityById[a];
  const cb = cityById[b];
  if (!ca || !cb) return 0;
  return haversineKm(ca.lat, ca.lon, cb.lat, cb.lon);
}

// ---------------------------------------------------------------- massas de terra (para trem/ônibus × navio/avião)

const LANDMASS: Record<string, string> = {};
const land = (id: string, list: string) => { for (const a3 of list.split(' ')) LANDMASS[a3] = id; };
land('nam', 'USA CAN MEX GTM BLZ HND SLV NIC CRI PAN');
land('sam', 'BRA COL VEN GUY SUR ECU PER BOL CHL ARG URY PRY');
land('afr', 'MAR DZA TUN LBY EGY SDN SSD ESH MRT MLI NER TCD SEN GMB GNB GIN SLE LBR CIV BFA GHA TGO BEN NGA CMR CAF GNQ GAB COG COD AGO ZMB ZWE MWI MOZ TZA KEN UGA RWA BDI ETH ERI DJI SOM XSL NAM BWA ZAF LSO SWZ');
land('eur', 'GBR IRL FRA ESP PRT ITA CHE AUT DEU NLD BEL LUX DNK NOR SWE FIN EST LVA LTU POL CZE SVK HUN SVN HRV BIH SRB MNE XKX MKD ALB GRC BGR ROU MDA UKR BLR RUS TUR GEO ARM AZE KAZ UZB TKM KGZ TJK AFG IRN IRQ SYR LBN ISR PSE JOR SAU YEM OMN ARE QAT KWT PAK IND NPL BTN BGD MMR THA LAO KHM VNM MYS CHN MNG PRK KOR');
land('oce', 'AUS');

function landmassOf(city: City): string {
  const a3 = countryOfCity(city.id);
  if (a3) return LANDMASS[a3] ?? a3; // ilhas: o próprio país
  switch (city.market) {
    case 'na': return 'nam';
    case 'br': return 'sam';
    case 'latam': return city.lat < 8 ? 'sam' : city.lon > -85 && city.lat < 24 ? `isl:${city.id}` : 'nam';
    case 'eu': case 'asia': return 'eur';
    case 'africa': return 'afr';
    default: return 'oce';
  }
}

export function sameLandmass(a: string, b: string): boolean {
  const ca = cityById[a];
  const cb = cityById[b];
  if (!ca || !cb) return false;
  return landmassOf(ca) === landmassOf(cb);
}

// ---------------------------------------------------------------- transporte por era

const lerp = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
};
const halfDays = (d: number) => Math.max(0.5, Math.ceil(d * 2) / 2);

/** Meio de transporte típico da era para um trecho (custo por pessoa, dólares reais). */
export function transportAt(year: number, km: number, sameContinent: boolean): Transport {
  if (km < 40) return { mode: 'bus', days: 0.5, costReal: Math.round(10 + km * 0.2) };
  // antes da aviação comercial, trechos terrestres muito longos (ex.: Londres–Bombaim) também iam de navio
  if (sameContinent && !(year < 1946 && km > 4500)) {
    if (year >= 2035 && km >= 250 && km <= 2500) {
      return { mode: 'hyperloop', days: 0.5, costReal: Math.round(25 + km * 0.11) };
    }
    if (km > 1500 && year >= 1958) {
      const perKm = lerp([[1958, 0.5], [1970, 0.3], [1980, 0.2], [2000, 0.12], [2020, 0.09], [2040, 0.08]], year);
      const base = lerp([[1958, 160], [1980, 110], [2000, 70], [2040, 55]], year);
      return { mode: 'jet', days: km > 6000 ? 1.5 : 1, costReal: Math.round(base + km * perKm) };
    }
    if (km > 2500 && year >= 1946) {
      return { mode: 'prop_plane', days: halfDays(1 + km / 6000), costReal: Math.round(150 + km * lerp([[1946, 0.85], [1957, 0.6]], year)) };
    }
    const useBus = year >= 1950 && (km <= 900 || year >= 1970);
    if (useBus) {
      const perDay = year >= 1980 ? 750 : 600;
      return { mode: 'bus', days: halfDays(km / perDay), costReal: Math.round(km * lerp([[1950, 0.12], [2000, 0.09], [2040, 0.07]], year)) };
    }
    const speed = lerp([[1920, 700], [1950, 900], [1990, 1200], [2040, 1500]], year);
    const days = halfDays(km / speed);
    const perKm = lerp([[1920, 0.3], [1960, 0.18], [2000, 0.12], [2040, 0.1]], year);
    return { mode: 'train', days, costReal: Math.round(km * perKm + days * 40) };
  }
  if (year < 1946) {
    // rota marítima ~1,25× a ortodrômica, mais embarque
    const perDay = lerp([[1920, 620], [1939, 760]], year);
    return { mode: 'ship', days: halfDays(1 + (km * 1.25) / perDay), costReal: Math.round(km * lerp([[1920, 0.45], [1945, 0.38]], year) + 200) };
  }
  if (year < 1958) {
    return { mode: 'prop_plane', days: halfDays(1 + Math.floor(km / 6000)), costReal: Math.round(200 + km * lerp([[1946, 0.85], [1957, 0.6]], year)) };
  }
  const perKm = lerp([[1958, 0.55], [1970, 0.35], [1980, 0.22], [2000, 0.12], [2020, 0.09], [2040, 0.075]], year);
  return { mode: 'jet', days: km > 11000 ? 2 : 1, costReal: Math.round(100 + km * perKm) };
}

// ---------------------------------------------------------------- vistos

const inY = (y: number, a: number, b: number) => y >= a && y < b;
const set = (s: string) => new Set(s.split(' '));

const AXIS = set('DEU ITA JPN');
const ARAB_HOSTILE = set('LBN SYR IRQ SAU LBY KWT YEM DZA SDN');
/** livre circulação (aproximação): grupo → [ano de início, membros com ano de adesão] */
const FREE_ZONES: { from: number; members: Record<string, number> }[] = [
  { from: 1954, members: { NOR: 1954, SWE: 1954, DNK: 1954, FIN: 1954, ISL: 1965 } },
  { from: 1968, members: { BEL: 1968, NLD: 1968, LUX: 1968, FRA: 1968, DEU: 1968, ITA: 1968, BRD: 1968, GBR: 1973, IRL: 1973, DNK: 1973, GRC: 1981, ESP: 1992, PRT: 1992, AUT: 1995, SWE: 1995, FIN: 1995, NOR: 1996, ISL: 1996, CHE: 2008, POL: 2007, CZE: 2007, SVK: 2007, HUN: 2007, SVN: 2007, EST: 2007, LVA: 2007, LTU: 2007, HRV: 2023 } },
  { from: 1991, members: { BRA: 1991, ARG: 1991, URY: 1991, PRY: 1991, CHL: 1996, BOL: 1996, PER: 2003, COL: 2004, ECU: 2004 } },
  { from: 1979, members: Object.fromEntries('SEN GMB GNB GIN SLE LBR CIV BFA GHA TGO BEN NGA NER MLI'.split(' ').map((x) => [x, 1979])) },
];
const PAIRS_FREE: [string, string, number][] = [['USA', 'CAN', 1900], ['GBR', 'IRL', 1922], ['AUS', 'NZL', 1973]];

function key(u: PoliticalUnit): string {
  return u.kind === 'partition' ? u.id : u.members.length > 1 ? u.id : u.members[0];
}

function inFreeZone(a: string, b: string, year: number): boolean {
  for (const z of FREE_ZONES) {
    if (year < z.from) continue;
    const ja = z.members[a];
    const jb = z.members[b];
    if (ja !== undefined && jb !== undefined && year >= ja && year >= jb) return true;
  }
  return PAIRS_FREE.some(([x, y, from]) => year >= from && ((a === x && b === y) || (a === y && b === x)));
}

const WESTERN_EUROPE = set('GBR IRL FRA BEL NLD LUX DEU BRD ITA CHE AUT DNK NOR SWE FIN ISL ESP PRT GRC');

const NONE = (reason: L): Visa => ({ needed: false, processingDays: 0, costReal: 0, denyChance: 0, reason });

/** Regras de visto entre duas unidades políticas no ano (custo por pessoa). */
export function visaBetween(ua: PoliticalUnit | null, ub: PoliticalUnit | null, year: number): Omit<Visa, 'costReal'> & { perPerson: number } {
  const wrap = (v: Visa) => ({ ...v, perPerson: v.costReal });
  if (!ua || !ub) return wrap({ needed: true, processingDays: 14, costReal: 120, denyChance: 0.04, reason: l('Fronteira internacional.', 'International border.') });
  if (ua.id === ub.id || ua.sovereign === ub.sovereign) return wrap(NONE(l('Mesmo país: sem visto.', 'Same country: no visa.')));
  const a = key(ua);
  const b = key(ub);
  const has = (x: string, y: string) => (a === x && b === y) || (a === y && b === x);

  // Segunda Guerra Mundial
  if (inY(year, 1939, 1946)) {
    const axA = AXIS.has(ua.sovereign) || AXIS.has(a);
    const axB = AXIS.has(ub.sovereign) || AXIS.has(b);
    if (axA !== axB) return wrap({ needed: true, processingDays: 120, costReal: 500, denyChance: 0.97, reason: l('Segunda Guerra Mundial: fronteira fechada entre lados em guerra.', 'World War II: border closed between warring sides.') });
  }
  // Embargos e fronteiras hostis
  if (has('USA', 'CUB') && year >= 1961) {
    return year < 2015
      ? wrap({ needed: true, processingDays: 120, costReal: 600, denyChance: 0.92, reason: l('Embargo EUA–Cuba: viagens praticamente proibidas.', 'US–Cuba embargo: travel effectively banned.') })
      : wrap({ needed: true, processingDays: 45, costReal: 400, denyChance: 0.3, reason: l('Reaproximação EUA–Cuba: licença especial.', 'US–Cuba thaw: special license required.') });
  }
  if (has('KOR', 'PRK') && year >= 1948) return wrap({ needed: true, processingDays: 180, costReal: 800, denyChance: 0.98, reason: l('Coreias: fronteira desmilitarizada.', 'Koreas: demilitarized border.') });
  if ((a === 'ISR' && ARAB_HOSTILE.has(b)) || (b === 'ISR' && ARAB_HOSTILE.has(a)) || ((has('ISR', 'EGY') && inY(year, 1948, 1980)) || (has('ISR', 'JOR') && inY(year, 1948, 1994)))) {
    if (year >= 1948) return wrap({ needed: true, processingDays: 120, costReal: 500, denyChance: 0.9, reason: l('Estados em conflito: entrada recusada a quem vem de Israel.', 'States in conflict: entry refused to travellers from Israel.') });
  }
  if (has('CHN', 'TWN') && year >= 1949) {
    if (year < 1987) return wrap({ needed: true, processingDays: 150, costReal: 600, denyChance: 0.95, reason: l('Estreito de Taiwan: sem relações.', 'Taiwan Strait: no relations.') });
    if (year < 2008) return wrap({ needed: true, processingDays: 40, costReal: 250, denyChance: 0.35, reason: l('Estreito de Taiwan: permissões especiais.', 'Taiwan Strait: special permits.') });
  }
  if (has('USA', 'CHN') && inY(year, 1949, 1972)) return wrap({ needed: true, processingDays: 150, costReal: 600, denyChance: 0.9, reason: l('EUA e China sem relações diplomáticas.', 'US and China without diplomatic relations.') });

  // Apartheid: boicote cultural da ONU
  const apartheid = inY(year, 1980, 1992) && (a === 'ZAF' || b === 'ZAF' || ua.sovereign === 'ZAF' || ub.sovereign === 'ZAF');

  // Livre circulação
  if (!apartheid && inFreeZone(a, b, year)) return wrap(NONE(l('Livre circulação entre os dois países.', 'Free movement between both countries.')));

  // Cortina de Ferro
  if (ua.bloc && ub.bloc && ((ua.bloc === 'west' && ub.bloc === 'east') || (ua.bloc === 'east' && ub.bloc === 'west'))) {
    const [days, deny] = year < 1956 ? [75, 0.5] : year < 1969 ? [50, 0.35] : year < 1980 ? [30, 0.15] : year < 1986 ? [45, 0.28] : [25, 0.1];
    return wrap({ needed: true, processingDays: days, costReal: 400, denyChance: deny, reason: year >= 1969 && year < 1980 ? l('Cortina de Ferro (détente): visto e convite oficial.', 'Iron Curtain (détente): visa and official invitation.') : l('Cortina de Ferro: visto, convite oficial e escolta.', 'Iron Curtain: visa, official invitation and minders.') });
  }
  if (ua.bloc === 'east' && ub.bloc === 'east') return wrap({ needed: true, processingDays: 20, costReal: 80, denyChance: 0.05, reason: l('Bloco socialista: visto de saída e intercâmbio cultural.', 'Socialist bloc: exit visa and cultural exchange.') });
  if (apartheid) {
    return wrap({ needed: true, processingDays: 30, costReal: 250, denyChance: 0.12, reason: l('Boicote cultural ao apartheid: tocar aqui custa reputação.', 'Cultural boycott of apartheid: playing here costs reputation.'), boycott: true });
  }
  if (ua.bloc === 'east' || ub.bloc === 'east') return wrap({ needed: true, processingDays: 40, costReal: 250, denyChance: 0.15, reason: l('País socialista: visto e convite oficial.', 'Socialist country: visa and official invitation.') });

  // Regras gerais por era
  if (year >= 2030) return wrap({ needed: true, processingDays: 3, costReal: 60, denyChance: 0.02, reason: l('Visto eletrônico de artista.', 'Electronic artist visa.') });
  const toUSA = a === 'USA' || b === 'USA';
  if (year >= 1950 && WESTERN_EUROPE.has(a) && WESTERN_EUROPE.has(b)) return wrap(NONE(l('Europa Ocidental: isenção de visto.', 'Western Europe: visa waiver.')));
  if (toUSA && year >= 1990) return wrap({ needed: true, processingDays: 30, costReal: 500, denyChance: 0.05, reason: l('Visto de artista dos EUA (P-1/O-1).', 'US artist visa (P-1/O-1).') });
  if (year >= 1990) return wrap({ needed: true, processingDays: 10, costReal: 150, denyChance: 0.04, reason: l('Visto de trabalho artístico.', 'Artist work visa.') });
  if (year >= 1947 && ua.bloc === 'west' && ub.bloc === 'west') return wrap({ needed: true, processingDays: 14, costReal: 120, denyChance: 0.03, reason: l('Visto de trabalho artístico entre aliados.', 'Artist work visa between allies.') });
  if (year >= 1947) return wrap({ needed: true, processingDays: 21, costReal: 150, denyChance: 0.06, reason: l('Visto de trabalho artístico (consulado).', 'Artist work visa (consulate).') });
  return wrap({ needed: true, processingDays: 14, costReal: 120, denyChance: 0.04, reason: l('Passaporte e visto consular.', 'Passport and consular visa.') });
}

// ---------------------------------------------------------------- trecho

/**
 * Um trecho de turnê entre duas cidades no ano, para uma equipe de `crewSize` pessoas.
 * O visto depende da nacionalidade da equipe: `homeCityId` (padrão: a cidade de origem do trecho).
 */
export function travelLeg(fromCityId: string, toCityId: string, year: number, crewSize: number, homeCityId = fromCityId): Leg {
  const crew = Math.max(1, Math.round(crewSize));
  const km = Math.round(cityDistanceKm(fromCityId, toCityId));
  const tr = transportAt(year, km, sameLandmass(fromCityId, toCityId));
  const ua = unitOfCity(homeCityId, year);
  const ub = unitOfCity(toCityId, year);
  const v = visaBetween(ua, ub, year);
  const visa: Visa = { needed: v.needed, processingDays: v.processingDays, costReal: v.perPerson * crew, denyChance: v.denyChance, reason: v.reason, boycott: v.boycott };
  // equipamento: frete ~25% das passagens (navio e avião), 10% por terra
  const freight = tr.mode === 'ship' || tr.mode === 'prop_plane' || tr.mode === 'jet' ? 1.25 : 1.1;
  const leg: Leg = { from: fromCityId, to: toCityId, km, mode: tr.mode, days: tr.days, costReal: Math.round(tr.costReal * crew * freight), visa };
  const note = cityBorderNote(toCityId, year) ?? cityBorderNote(fromCityId, year);
  if (note) leg.borderNote = note;
  else if (tr.mode === 'ship' && inY(year, 1940, 1946)) leg.borderNote = l('Guerra no mar: travessias civis raras e perigosas.', 'War at sea: civilian crossings rare and dangerous.');
  return leg;
}

// ---------------------------------------------------------------- clima

export type ClimateKind = 'mild' | 'hot' | 'cold' | 'snow' | 'rain' | 'monsoon' | 'storm';
export type ClimateIcon = 'sun' | 'heat' | 'cloud' | 'snow' | 'rain' | 'monsoon' | 'storm';

export interface Climate {
  kind: ClimateKind;
  /** temperatura média aproximada do mês, °C */
  tempC: number;
  /** multiplicador de público para shows ao ar livre/festivais (0,5–1,1) */
  outdoorFactor: number;
  /** risco de cancelamento por clima (0–0,15) */
  cancelRisk: number;
  icon: ClimateIcon;
  name: L;
}

const box = (lat: number, lon: number, la0: number, la1: number, lo0: number, lo1: number) => lat >= la0 && lat <= la1 && lon >= lo0 && lon <= lo1;

/** Altitude aproximada (m) por planaltos conhecidos (a escala do jogo não traz relevo). */
function altitudeM(lat: number, lon: number): number {
  if (box(lat, lon, 18, 23, -104, -97)) return 2100; // planalto mexicano
  if (box(lat, lon, -20, 12, -80, -72) && !box(lat, lon, 8, 12, -76, -72)) return 2500; // Andes do norte
  if (box(lat, lon, -23, -14, -70, -64)) return 3000; // altiplano
  if (box(lat, lon, 5, 15, 36, 42)) return 2300; // Etiópia
  if (box(lat, lon, -3, 1, 34, 38.5)) return 1700; // Quênia
  if (box(lat, lon, -27.5, -24.5, 26, 30)) return 1600; // Highveld
  if (box(lat, lon, -24.5, -18, -50, -42)) return 800; // planalto brasileiro (SP, BH)
  if (box(lat, lon, 38.5, 41, -106, -104)) return 1600; // Denver
  if (box(lat, lon, 33, 37, 49, 53)) return 1200; // Teerã
  if (box(lat, lon, 34, 35, 68, 70)) return 1800; // Cabul
  return 0;
}

function tempModel(lat: number, lon: number, month: number): number {
  const alat = Math.abs(lat);
  const continental = (lat > 25 && lon > -110 && lon < -50) || (lat > 45 && lon > 20 && lon < 150) || (lat > 30 && lon > 100 && lon < 145);
  const maritime = (lat > 35 && lon > -12 && lon < 5) || (lat > 30 && lon < -115 && lon > -130);
  const midEurope = lat > 40 && lon >= 5 && lon <= 20;
  const med = box(lat, lon, 29, 45, -10, 40) && !maritime;
  let t0 = 27.5 - 0.45 * Math.max(0, alat - 15) - (continental ? 3.5 : 0) + (med ? 1.5 : 0);
  t0 -= (altitudeM(lat, lon) / 1000) * 4.5;
  const c = continental ? 1.35 : maritime ? 0.6 : midEurope ? 0.85 : lat < 0 ? 0.7 : 1;
  const amp = Math.min(15, 0.28 * Math.max(0, alat - 8) * c);
  const m = lat < 0 ? (month + 6) % 12 : month;
  return t0 + amp * Math.cos((2 * Math.PI * (m - 6.5)) / 12);
}

const CLIMATE_NAMES: Record<ClimateKind, L> = {
  mild: l('Ameno', 'Mild'), hot: l('Calor forte', 'Heat'), cold: l('Frio', 'Cold'), snow: l('Neve', 'Snow'),
  rain: l('Chuvas', 'Rainy'), monsoon: l('Monção', 'Monsoon'), storm: l('Temporada de furacões/tufões', 'Hurricane/typhoon season'),
};
const ICONS: Record<ClimateKind, ClimateIcon> = { mild: 'sun', hot: 'heat', cold: 'cloud', snow: 'snow', rain: 'rain', monsoon: 'monsoon', storm: 'storm' };

/** Clima típico do mês (0 = janeiro) num ponto. */
export function climateAtPoint(lat: number, lon: number, month: number): Climate {
  const mo = ((Math.round(month) % 12) + 12) % 12;
  const tempC = Math.round(tempModel(lat, lon, mo) * 10) / 10;
  const inMonths = (...ms: number[]) => ms.includes(mo);
  let kind: ClimateKind;
  if (box(lat, lon, 10, 33, -98, -58) && inMonths(7, 8, 9)) kind = 'storm'; // furacões Caribe/Golfo
  else if (box(lat, lon, 12, 36, 105, 145) && inMonths(7, 8)) kind = 'storm'; // tufões
  else if (box(lat, lon, 5, 30, 66, 125) && inMonths(5, 6, 7, 8)) kind = 'monsoon'; // sul e sudeste asiático
  else if (box(lat, lon, 25, 42, 115, 145) && inMonths(5, 6)) kind = 'rain'; // tsuyu / jangma
  else if (box(lat, lon, 4, 16, -18, 16) && inMonths(5, 6, 7, 8)) kind = 'rain'; // monção da África Ocidental
  else if (box(lat, lon, -16, -3, -41, -34) && inMonths(3, 4, 5, 6)) kind = 'rain'; // litoral nordestino
  else if ((box(lat, lon, -26, -5, -60, -38) || box(lat, lon, -27, -10, 20, 40) || box(lat, lon, -20, -10, 120, 150)) && inMonths(11, 0, 1)) kind = 'rain'; // chuvas de verão austral
  else if (box(lat, lon, 8, 23, -106, -80) && inMonths(5, 6, 7, 8)) kind = 'rain'; // México/América Central
  else if (box(lat, lon, 0, 12, -80, -70) && inMonths(3, 4, 9, 10)) kind = 'rain'; // Andes colombianos
  else if (tempC <= 0.5) kind = 'snow';
  else if (((box(lat, lon, 45, 61, -11, 15) && inMonths(9, 10, 11, 0)) || (box(lat, lon, 42, 50, -128, -120) && inMonths(10, 11, 0, 1))) && tempC >= 4) kind = 'rain'; // garoa atlântica/Pacífico NW
  else if (tempC < 7) kind = 'cold';
  else if (tempC >= 29) kind = 'hot';
  else kind = 'mild';
  let outdoorFactor: number;
  switch (kind) {
    case 'mild': outdoorFactor = 1 + 0.1 * Math.max(0, 1 - Math.abs(tempC - 22) / 10); break;
    case 'hot': outdoorFactor = tempC >= 33 ? 0.75 : 0.85; break;
    case 'cold': outdoorFactor = 0.75; break;
    case 'snow': outdoorFactor = 0.55; break;
    case 'rain': outdoorFactor = 0.8; break;
    case 'monsoon': outdoorFactor = 0.6; break;
    default: outdoorFactor = 0.65;
  }
  const cancelRisk = { mild: 0.01, hot: 0.03, cold: 0.02, rain: 0.05, snow: 0.08, monsoon: 0.12, storm: 0.15 }[kind];
  return { kind, tempC, outdoorFactor: Math.round(outdoorFactor * 100) / 100, cancelRisk, icon: ICONS[kind], name: CLIMATE_NAMES[kind] };
}

/** Clima típico de uma cidade no mês (0 = janeiro). */
export function climateAt(cityId: string, month: number): Climate {
  const c = cityById[cityId];
  return climateAtPoint(c?.lat ?? 0, c?.lon ?? 0, month);
}

// ---------------------------------------------------------------- rota

export interface RouteStop {
  cityId: string;
  /** dia (desde a partida) em que a equipe chega */
  day: number;
  month: number;
  year: number;
  climate: Climate;
}

export interface RoutePlan {
  legs: Leg[];
  stops: RouteStop[];
  totals: {
    km: number;
    days: number;
    costReal: number;
    visaCostReal: number;
    /** trechos que exigem visto (com a unidade de destino) */
    visas: { from: string; to: string; processingDays: number; denyChance: number; reason: L }[];
    maxDenyChance: number;
    /** maior prazo de processamento (vistos correm em paralelo antes da partida) */
    leadDays: number;
    boycott: boolean;
  };
}

/** Dias de palco em cada parada (show + passagem de som). */
export const DAYS_PER_STOP = 2;

/**
 * Planeja uma rota: start → cityIds[0] → cityIds[1] → …
 * O mês de cada parada avança conforme os dias acumulados (30 dias por mês).
 */
export function planRoute(cityIds: string[], startCityId: string, year: number, month: number, crewSize: number): RoutePlan {
  const legs: Leg[] = [];
  const stops: RouteStop[] = [];
  let prev = startCityId;
  let day = 0;
  const visited = new Set<string>([unitOfCity(startCityId, year)?.sovereign ?? startCityId]);
  for (const id of cityIds) {
    if (!cityById[id]) continue;
    if (id !== prev) {
      const leg = travelLeg(prev, id, year, crewSize, startCityId);
      // visto só uma vez por país na mesma turnê
      const sov = unitOfCity(id, year)?.sovereign ?? id;
      if (visited.has(sov) && leg.visa.needed && !leg.visa.boycott) leg.visa = { ...leg.visa, needed: false, costReal: 0, denyChance: 0, processingDays: 0, reason: l('Visto já obtido nesta turnê.', 'Visa already obtained on this tour.') };
      visited.add(sov);
      legs.push(leg);
      day += leg.days;
    }
    const abs = month + Math.floor(day / 30);
    stops.push({ cityId: id, day, month: abs % 12, year: year + Math.floor(abs / 12), climate: climateAt(id, abs % 12) });
    day += DAYS_PER_STOP;
    prev = id;
  }
  const visas = legs.filter((g) => g.visa.needed).map((g) => ({ from: g.from, to: g.to, processingDays: g.visa.processingDays, denyChance: g.visa.denyChance, reason: g.visa.reason }));
  return {
    legs,
    stops,
    totals: {
      km: legs.reduce((a, g) => a + g.km, 0),
      days: day,
      costReal: legs.reduce((a, g) => a + g.costReal, 0),
      visaCostReal: legs.reduce((a, g) => a + g.visa.costReal, 0),
      visas,
      maxDenyChance: visas.reduce((a, v) => Math.max(a, v.denyChance), 0),
      leadDays: visas.reduce((a, v) => Math.max(a, v.processingDays), 0),
      boycott: legs.some((g) => !!g.visa.boycott),
    },
  };
}
