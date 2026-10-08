// Geografia do mapa: contornos de países (Natural Earth 1:110m, domínio público) e fronteiras históricas
// por ano (uniões, colônias, partições e blocos da Guerra Fria). Ver src/data/geo/PROVENANCE.md.
//
// As formas (~100 KB) são carregadas sob demanda com loadGeo(); nomes e o país de cada cidade conhecida
// vêm de meta.json (pequeno, estático), de modo que a lógica de viagem funciona sem as formas.

import meta from './geo/meta.json';
import { cityById, l, type L, type MarketId } from './world';

// ---------------------------------------------------------------- formato do arquivo e decodificação

export interface GeoFile {
  v: 1;
  /** graus por unidade quantizada (origem em lon −180, lat −90) */
  q: number;
  /** arcos com coordenadas inteiras em delta: [x0, y0, dx1, dy1, …] */
  arcs: number[][];
  /** países à esquerda/direita de cada arco (−1 = mar) */
  sides: number[][];
  /** p = polígonos → anéis → referências de arco (~i = arco invertido) */
  countries: { id: string; a3: string; en: string; pt: string; p: number[][][] }[];
}

export interface GeoCountry {
  idx: number;
  /** ISO 3166 numérico (ou alpha-3 quando ausente) */
  id: string;
  a3: string;
  name: L;
  /** anéis em [lon, lat, lon, lat, …]; cada polígono = [externo, buracos…] */
  polys: Float64Array[][];
  bbox: [number, number, number, number];
  /** centro do maior polígono (para rótulos) */
  center: [number, number];
  /** área aproximada em graus² (para decidir rótulos) */
  area: number;
  /** cruza o antimeridiano: anéis "desembrulhados" passam de lon 180 (desenhar também deslocado −360°) */
  wraps: boolean;
}

export interface Geo {
  countries: GeoCountry[];
  byA3: Record<string, GeoCountry>;
  /** arcos decodificados em [lon, lat, …] */
  arcs: Float64Array[];
  sides: [number, number][];
}

function decodeArcs(file: GeoFile): Float64Array[] {
  return file.arcs.map((enc) => {
    const out = new Float64Array(enc.length);
    let x = 0;
    let y = 0;
    for (let i = 0; i < enc.length; i += 2) {
      x += enc[i];
      y += enc[i + 1];
      out[i] = x * file.q - 180;
      out[i + 1] = y * file.q - 90;
    }
    return out;
  });
}

function ringFromArcs(arcs: Float64Array[], refs: number[]): Float64Array {
  const pts: number[] = [];
  for (const ref of refs) {
    const a = arcs[ref < 0 ? ~ref : ref];
    const n = a.length / 2;
    const start = pts.length ? 1 : 0; // o primeiro ponto repete o último do arco anterior
    for (let k = start; k < n; k++) {
      const i = ref < 0 ? n - 1 - k : k;
      pts.push(a[i * 2], a[i * 2 + 1]);
    }
  }
  return Float64Array.from(pts);
}

/**
 * Anéis que cruzam o antimeridiano (Chukotka, Fiji) vêm com saltos de 360°; desembrulha para lon contínua.
 * Anéis polares (Antártida, que dão a volta ao mundo) ficam como estão: o salto fecha a borda do mapa.
 */
function unwrapRing(r: Float64Array): Float64Array {
  let jumps = 0;
  let wind = 0;
  for (let i = 2; i < r.length; i += 2) {
    const d = r[i] - r[i - 2];
    if (Math.abs(d) > 180) jumps++;
    else wind += d;
  }
  if (!jumps || Math.abs(wind) > 180) return r;
  const out = Float64Array.from(r);
  for (let i = 2; i < out.length; i += 2) {
    while (out[i] - out[i - 2] > 180) out[i] -= 360;
    while (out[i] - out[i - 2] < -180) out[i] += 360;
  }
  // mantém a maior parte do anel no intervalo [−180, 180]
  let mean = 0;
  for (let i = 0; i < out.length; i += 2) mean += out[i];
  mean /= out.length / 2;
  if (mean < -180) for (let i = 0; i < out.length; i += 2) out[i] += 360;
  return out;
}

function ringArea(r: Float64Array): number {
  let s = 0;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) s += (r[j] - r[i]) * (r[j + 1] + r[i + 1]);
  return s / 2;
}

function ringCentroid(r: Float64Array): [number, number] {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const f = r[j] * r[i + 1] - r[i] * r[j + 1];
    a += f;
    cx += (r[j] + r[i]) * f;
    cy += (r[j + 1] + r[i + 1]) * f;
  }
  if (Math.abs(a) < 1e-9) return [r[0], r[1]];
  return [cx / (3 * a), cy / (3 * a)];
}

export function decodeGeo(file: GeoFile): Geo {
  const arcs = decodeArcs(file);
  const countries: GeoCountry[] = file.countries.map((c, idx) => {
    const polys = c.p.map((poly) => poly.map((ring) => unwrapRing(ringFromArcs(arcs, ring))));
    let minX = 180, minY = 90, maxX = -180, maxY = -90;
    let best = 0;
    let center: [number, number] = [0, 0];
    let area = 0;
    for (const poly of polys) {
      const outer = poly[0];
      for (let i = 0; i < outer.length; i += 2) {
        minX = Math.min(minX, outer[i]); maxX = Math.max(maxX, outer[i]);
        minY = Math.min(minY, outer[i + 1]); maxY = Math.max(maxY, outer[i + 1]);
      }
      const ar = Math.abs(ringArea(outer));
      area += ar;
      if (ar > best) {
        best = ar;
        center = ringCentroid(outer);
      }
    }
    return { idx, id: c.id, a3: c.a3, name: l(c.pt, c.en), polys, bbox: [minX, minY, maxX, maxY], center, area, wraps: maxX > 180 || minX < -180 };
  });
  const byA3: Record<string, GeoCountry> = {};
  for (const c of countries) byA3[c.a3] = c;
  return { countries, byA3, arcs, sides: file.sides.map((s) => [s[0], s[1]] as [number, number]) };
}

function inRing(r: Float64Array, x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Índice do país que contém o ponto, ou −1. */
export function countryIndexAt(geo: Geo, lon: number, lat: number): number {
  for (const c of geo.countries) {
    const [x0, y0, x1, y1] = c.bbox;
    if (lat < y0 || lat > y1) continue;
    for (const x of c.wraps ? [lon, lon + 360, lon - 360] : [lon]) {
      if (x < x0 || x > x1) continue;
      for (const poly of c.polys) {
        if (!inRing(poly[0], x, lat)) continue;
        let hole = false;
        for (let k = 1; k < poly.length; k++) if (inRing(poly[k], x, lat)) hole = true;
        if (!hole) return c.idx;
      }
    }
  }
  return -1;
}

function segDist2(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len = dx * dx + dy * dy;
  let t = len > 0 ? ((px - ax) * dx + (py - ay) * dy) / len : 0;
  t = Math.max(0, Math.min(1, t));
  const ex = ax + t * dx - px, ey = ay + t * dy - py;
  return ex * ex + ey * ey;
}

/** País que contém o ponto; se cair no mar (cidades costeiras na escala 1:110m), o de borda mais próxima. */
export function locateCountry(geo: Geo, lon: number, lat: number): number {
  const hit = countryIndexAt(geo, lon, lat);
  if (hit >= 0) return hit;
  let best = -1;
  let bestD = Infinity;
  const k = Math.cos((lat * Math.PI) / 180);
  for (const c of geo.countries) {
    const [x0, y0, x1, y1] = c.bbox;
    if (lon < x0 - 6 || lon > x1 + 6 || lat < y0 - 6 || lat > y1 + 6) continue;
    for (const poly of c.polys) {
      const r = poly[0];
      for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
        const d = segDist2(lon * k, lat, r[j] * k, r[j + 1], r[i] * k, r[i + 1]);
        if (d < bestD) {
          bestD = d;
          best = c.idx;
        }
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------- carregamento

let GEO: Geo | null = null;
let loading: Promise<Geo> | null = null;
const cityCache = new Map<string, string | null>();

export function setGeoData(file: GeoFile): Geo {
  GEO = decodeGeo(file);
  cityCache.clear();
  return GEO;
}

/** Formas decodificadas, se já carregadas. */
export function geoData(): Geo | null {
  return GEO;
}

/** Carrega as formas sob demanda (chunk separado). */
export function loadGeo(): Promise<Geo> {
  if (GEO) return Promise.resolve(GEO);
  loading ??= import('./geo/countries.json').then((m) => setGeoData((m.default ?? m) as unknown as GeoFile));
  return loading;
}

const META = meta as unknown as { names: Record<string, [string, string]>; cities: Record<string, string> };

export function countryName(a3: string | null | undefined): L {
  if (!a3) return l('?');
  const n = META.names[a3];
  return n ? l(n[1], n[0]) : l(a3);
}

export function allCountryCodes(): string[] {
  return Object.keys(META.names);
}

/**
 * País (ISO alpha-3) de uma cidade. Usa a tabela gerada por tools/build-geo.ts; para cidades novas,
 * ponto-em-polígono (com fallback pela borda mais próxima) quando as formas estão carregadas.
 */
export function countryOfCity(cityId: string): string | null {
  const known = META.cities[cityId];
  if (known) return known;
  if (cityCache.has(cityId)) return cityCache.get(cityId)!;
  const c = cityById[cityId];
  if (!c || !GEO) return null;
  const idx = locateCountry(GEO, c.lon, c.lat);
  const a3 = idx >= 0 ? GEO.countries[idx].a3 : null;
  cityCache.set(cityId, a3);
  return a3;
}

// ---------------------------------------------------------------- fronteiras históricas

export type Bloc = 'west' | 'east' | 'nonaligned';

export interface PoliticalUnit {
  id: string;
  name: L;
  /** países modernos (ISO alpha-3) que compõem a unidade neste ano */
  members: string[];
  /** bloco da Guerra Fria (1947–1991), senão null */
  bloc: Bloc | null;
  kind: 'state' | 'union' | 'colony' | 'partition';
  /** potência colonial (alpha-3), quando colônia */
  colonialPower?: string;
  /** soberania para efeito de vistos (colônias = potência colonial) */
  sovereign: string;
}

interface Member { a3: string; from?: number; to?: number }
interface UnionDef { id: string; name: L; members: (string | Member)[]; from: number; to: number; power?: string; sovereign?: string }

/** Uniões e federações históricas que juntam países modernos (anos: [from, to) ). */
export const UNIONS: UnionDef[] = [
  { id: 'SUN', name: l('União Soviética', 'Soviet Union'), from: 1922, to: 1991, members: ['RUS', 'UKR', 'BLR', 'UZB', 'KAZ', 'GEO', 'AZE', 'KGZ', 'TJK', 'ARM', 'TKM', { a3: 'LTU', from: 1940 }, { a3: 'LVA', from: 1940 }, { a3: 'EST', from: 1940 }, { a3: 'MDA', from: 1940 }] },
  { id: 'YUG', name: l('Iugoslávia', 'Yugoslavia'), from: 1918, to: 1992, members: ['SRB', 'MNE', 'HRV', 'SVN', 'BIH', 'MKD', 'XKX'] },
  { id: 'SCG', name: l('Sérvia e Montenegro', 'Serbia and Montenegro'), from: 1992, to: 2006, members: ['SRB', 'MNE', 'XKX'] },
  { id: 'SRBK', name: l('Sérvia', 'Serbia'), from: 2006, to: 2008, members: ['SRB', 'XKX'] },
  { id: 'CSK', name: l('Tchecoslováquia', 'Czechoslovakia'), from: 1918, to: 1993, members: ['CZE', 'SVK'] },
  { id: 'UKI', name: l('Reino Unido da Grã-Bretanha e Irlanda', 'United Kingdom of GB and Ireland'), from: 1801, to: 1922, members: ['GBR', 'IRL'], sovereign: 'GBR' },
  { id: 'BRI', name: l('Índia Britânica', 'British India'), from: 1858, to: 1947, power: 'GBR', members: ['IND', 'PAK', 'BGD', { a3: 'MMR', to: 1937 }] },
  { id: 'PAKU', name: l('Paquistão (Ocidental e Oriental)', 'Pakistan (West and East)'), from: 1947, to: 1971, members: ['PAK', 'BGD'] },
  { id: 'IDC', name: l('Indochina Francesa', 'French Indochina'), from: 1887, to: 1954, power: 'FRA', members: ['VNM', 'LAO', 'KHM'] },
  { id: 'AOF', name: l('África Ocidental Francesa', 'French West Africa'), from: 1895, to: 1958, power: 'FRA', members: ['SEN', 'MLI', 'MRT', 'GIN', 'CIV', 'BFA', 'NER', 'BEN'] },
  { id: 'AEF', name: l('África Equatorial Francesa', 'French Equatorial Africa'), from: 1910, to: 1958, power: 'FRA', members: ['GAB', 'COG', 'CAF', 'TCD'] },
  { id: 'RUU', name: l('Ruanda-Urundi', 'Ruanda-Urundi'), from: 1922, to: 1962, power: 'BEL', members: ['RWA', 'BDI'] },
  { id: 'FRN', name: l('Federação da Rodésia e Niassalândia', 'Federation of Rhodesia and Nyasaland'), from: 1953, to: 1964, power: 'GBR', members: ['ZMB', 'ZWE', 'MWI'] },
  { id: 'PAL', name: l('Palestina sob Mandato', 'Mandatory Palestine'), from: 1920, to: 1948, power: 'GBR', members: ['ISR', 'PSE'] },
  { id: 'KORJ', name: l('Coreia sob domínio japonês', 'Korea under Japanese rule'), from: 1910, to: 1945, power: 'JPN', members: ['KOR', 'PRK'] },
  { id: 'KORO', name: l('Coreia (ocupação aliada)', 'Korea (Allied occupation)'), from: 1945, to: 1948, members: ['KOR', 'PRK'] },
  { id: 'ROC', name: l('República da China', 'Republic of China'), from: 1945, to: 1949, members: ['CHN', 'TWN'] },
  { id: 'ETHE', name: l('Etiópia (com Eritreia)', 'Ethiopia (with Eritrea)'), from: 1952, to: 1993, members: ['ETH', 'ERI'] },
  { id: 'SDNU', name: l('Sudão', 'Sudan'), from: 1956, to: 2011, members: ['SDN', 'SSD'] },
  { id: 'ASUD', name: l('Sudão Anglo-Egípcio', 'Anglo-Egyptian Sudan'), from: 1899, to: 1956, power: 'GBR', members: ['SDN', 'SSD'] },
  { id: 'SOMU', name: l('Somália', 'Somalia'), from: 1960, to: 9999, members: ['SOM', 'XSL'] },
  { id: 'CYPU', name: l('Chipre', 'Cyprus'), from: 1960, to: 1983, members: ['CYP', 'XNC'] },
  { id: 'CYPC', name: l('Chipre Britânico', 'British Cyprus'), from: 1878, to: 1960, power: 'GBR', members: ['CYP', 'XNC'] },
  { id: 'UAR', name: l('República Árabe Unida', 'United Arab Republic'), from: 1958, to: 1961, members: ['EGY', 'SYR'] },
];

/** Colônias e territórios dependentes: [potência, ano da independência]. */
export const COLONIES: Record<string, [string, number]> = {
  // África
  EGY: ['GBR', 1922], LBY: ['ITA', 1951], ERI: ['ITA', 1952], TUN: ['FRA', 1956], MAR: ['FRA', 1956], DZA: ['FRA', 1962],
  GHA: ['GBR', 1957], NGA: ['GBR', 1960], SLE: ['GBR', 1961], GMB: ['GBR', 1965], KEN: ['GBR', 1963], UGA: ['GBR', 1962],
  TZA: ['GBR', 1961], ZMB: ['GBR', 1964], MWI: ['GBR', 1964], ZWE: ['GBR', 1980], BWA: ['GBR', 1966], LSO: ['GBR', 1966],
  SWZ: ['GBR', 1968], SOM: ['ITA', 1960], XSL: ['GBR', 1960], MDG: ['FRA', 1960], TGO: ['FRA', 1960], CMR: ['FRA', 1960],
  DJI: ['FRA', 1977], GNQ: ['ESP', 1968], ESH: ['ESP', 1976], GNB: ['PRT', 1974], AGO: ['PRT', 1975], MOZ: ['PRT', 1975],
  NAM: ['ZAF', 1990], COD: ['BEL', 1960], SEN: ['FRA', 1960], MLI: ['FRA', 1960], MRT: ['FRA', 1960], GIN: ['FRA', 1958],
  CIV: ['FRA', 1960], BFA: ['FRA', 1960], NER: ['FRA', 1960], BEN: ['FRA', 1960], GAB: ['FRA', 1960], COG: ['FRA', 1960],
  CAF: ['FRA', 1960], TCD: ['FRA', 1960], RWA: ['BEL', 1962], BDI: ['BEL', 1962], SDN: ['GBR', 1956], SSD: ['GBR', 1956],
  // Ásia e Oriente Médio
  IND: ['GBR', 1947], PAK: ['GBR', 1947], BGD: ['GBR', 1947], LKA: ['GBR', 1948], MMR: ['GBR', 1948], MYS: ['GBR', 1957],
  BRN: ['GBR', 1984], IDN: ['NLD', 1949], PHL: ['USA', 1946], VNM: ['FRA', 1954], LAO: ['FRA', 1954], KHM: ['FRA', 1954],
  KOR: ['JPN', 1945], PRK: ['JPN', 1945], TWN: ['JPN', 1945], JOR: ['GBR', 1946], ISR: ['GBR', 1948], PSE: ['GBR', 1948],
  SYR: ['FRA', 1946], LBN: ['FRA', 1943], IRQ: ['GBR', 1932], KWT: ['GBR', 1961], ARE: ['GBR', 1971], QAT: ['GBR', 1971],
  CYP: ['GBR', 1960], XNC: ['GBR', 1960], TLS: ['PRT', 1975],
  // Oceania
  PNG: ['AUS', 1975], FJI: ['GBR', 1970], SLB: ['GBR', 1978], VUT: ['FRA', 1980], NCL: ['FRA', 9999], ATF: ['FRA', 9999],
  // Américas e Atlântico
  JAM: ['GBR', 1962], TTO: ['GBR', 1962], BHS: ['GBR', 1973], BLZ: ['GBR', 1981], GUY: ['GBR', 1966], SUR: ['NLD', 1975],
  PRI: ['USA', 9999], FLK: ['GBR', 9999], GRL: ['DNK', 9999], ISL: ['DNK', 1944],
};

const POWER_ADJ: Record<string, L> = {
  GBR: l('britânica', 'British'), FRA: l('francesa', 'French'), PRT: l('portuguesa', 'Portuguese'), BEL: l('belga', 'Belgian'),
  NLD: l('neerlandesa', 'Dutch'), ESP: l('espanhola', 'Spanish'), ITA: l('italiana', 'Italian'), JPN: l('japonesa', 'Japanese'),
  USA: l('dos EUA', 'US'), DNK: l('dinamarquesa', 'Danish'), AUS: l('australiana', 'Australian'), ZAF: l('sul-africana', 'South African'),
};

/** Partições de um país moderno em dois estados (regiões aproximadas em lon/lat). */
export interface Partition {
  country: string;
  from: number;
  to: number;
  /** estado que ocupa a região descrita por `region` */
  inside: { id: string; name: L; bloc: Bloc | null };
  /** estado que ocupa o restante do país */
  outside: { id: string; name: L; bloc: Bloc | null };
  /** polígono [lon, lat, …] que cobre a parte "inside" (pode extrapolar o país; o mapa recorta) */
  region: number[];
  /** enclaves do "outside" dentro da região (ex.: Berlim Ocidental), em círculos [lon, lat, raio°] */
  enclaves?: [number, number, number][];
}

export const PARTITIONS: Partition[] = [
  {
    country: 'DEU', from: 1949, to: 1990,
    inside: { id: 'DDR', name: l('Alemanha Oriental (RDA)', 'East Germany (GDR)'), bloc: 'east' },
    outside: { id: 'BRD', name: l('Alemanha Ocidental (RFA)', 'West Germany (FRG)'), bloc: 'west' },
    // fronteira interalemã aproximada (baía de Lübeck → tríplice fronteira com a Tchecoslováquia)
    region: [10.9, 54.4, 10.88, 53.96, 10.75, 53.55, 11.25, 53.12, 10.95, 52.85, 10.62, 52.55, 11.0, 52.2, 10.55, 51.95, 10.6, 51.65, 10.2, 51.35, 9.95, 50.95, 10.05, 50.6, 10.6, 50.35, 11.25, 50.38, 11.9, 50.42, 12.1, 50.32, 13.5, 49.0, 17, 49.0, 17, 55.5, 10.9, 55.5],
    enclaves: [[13.3, 52.5, 0.22]],
  },
  {
    country: 'VNM', from: 1954, to: 1976,
    inside: { id: 'VDR', name: l('Vietnã do Norte', 'North Vietnam'), bloc: 'east' },
    outside: { id: 'RVN', name: l('Vietnã do Sul', 'South Vietnam'), bloc: 'west' },
    region: [100, 17.0, 107.2, 17.0, 112, 17.0, 112, 25, 100, 25],
  },
  {
    country: 'YEM', from: 1967, to: 1990,
    inside: { id: 'YMD', name: l('Iêmen do Sul', 'South Yemen'), bloc: 'east' },
    outside: { id: 'YAR', name: l('Iêmen do Norte', 'North Yemen'), bloc: 'nonaligned' },
    region: [43.45, 12.7, 44.0, 13.4, 44.8, 13.8, 45.4, 14.4, 46.4, 15.1, 47.1, 16.4, 47.5, 17.5, 48.5, 18.5, 56, 18.5, 56, 11, 43.45, 11],
  },
];

/** Zonas especiais pontuais (cidades-território que a escala 1:110m não mostra). */
interface SpecialZone { id: string; lon: number; lat: number; r: number; within: string; from: number; to: number; name: L; power?: string; bloc: Bloc | null }
const ZONES: SpecialZone[] = [
  { id: 'HKG', lon: 114.17, lat: 22.32, r: 0.6, within: 'CHN', from: 1842, to: 1997, name: l('Hong Kong (britânica)', 'Hong Kong (British)'), power: 'GBR', bloc: 'west' },
  { id: 'HKS', lon: 114.17, lat: 22.32, r: 0.6, within: 'CHN', from: 1997, to: 9999, name: l('Hong Kong (RAE da China)', 'Hong Kong (China SAR)'), bloc: null },
  { id: 'MAC', lon: 113.55, lat: 22.2, r: 0.12, within: 'CHN', from: 1557, to: 1999, name: l('Macau (portuguesa)', 'Macau (Portuguese)'), power: 'PRT', bloc: 'west' },
  { id: 'SGP', lon: 103.82, lat: 1.35, r: 0.3, within: 'MYS', from: 1819, to: 1963, name: l('Singapura (britânica)', 'Singapore (British)'), power: 'GBR', bloc: 'west' },
  { id: 'SGI', lon: 103.82, lat: 1.35, r: 0.3, within: 'MYS', from: 1965, to: 9999, name: l('Singapura', 'Singapore'), bloc: 'west' },
];

const inYears = (y: number, from: number, to: number) => y >= from && y < to;

// Blocos da Guerra Fria (1947–1991). Ausente = não alinhado/neutro.
const WEST: Record<string, [number, number]> = {};
const EAST: Record<string, [number, number]> = {};
const add = (tbl: Record<string, [number, number]>, list: string, from = 1947, to = 1992) => { for (const a3 of list.split(' ')) tbl[a3] = [from, to]; };
add(WEST, 'USA CAN GBR FRA ITA BEL NLD LUX NOR DNK ISL PRT GRC TUR ESP JPN KOR AUS NZL PHL THA ISR SAU PRI GRL');
add(WEST, 'BRA ARG CHL COL PER VEN MEX URY PRY BOL ECU GTM HND SLV PAN CRI DOM HTI JAM TTO BHS BLZ GUY SUR FLK');
add(WEST, 'ZAF MAR TWN MYS'); add(WEST, 'DEU', 1949); add(WEST, 'PAK', 1954, 1972); add(WEST, 'IRN', 1947, 1979);
add(WEST, 'NIC', 1947, 1979); add(WEST, 'NIC', 1990); add(WEST, 'CUB', 1947, 1959); add(WEST, 'LAO KHM', 1954, 1975);
add(EAST, 'RUS UKR BLR UZB KAZ GEO AZE KGZ TJK ARM TKM LTU LVA EST MDA POL CZE SVK HUN ROU BGR ALB MNG');
add(EAST, 'CHN', 1949); add(EAST, 'PRK', 1948); add(EAST, 'CUB', 1961); add(EAST, 'VNM LAO KHM', 1975);
add(EAST, 'AGO MOZ', 1975); add(EAST, 'ETH ERI', 1977); add(EAST, 'AFG', 1978); add(EAST, 'NIC', 1979, 1990);

function blocOfCountry(a3: string, year: number): Bloc | null {
  if (year < 1947 || year > 1991) return null;
  const e = EAST[a3];
  if (e && inYears(year, e[0], e[1])) return 'east';
  const w = WEST[a3];
  if (w && inYears(year, w[0], w[1])) return 'west';
  return 'nonaligned';
}

function memberActive(m: string | Member, year: number): string | null {
  if (typeof m === 'string') return m;
  if (m.from !== undefined && year < m.from) return null;
  if (m.to !== undefined && year >= m.to) return null;
  return m.a3;
}

function unionOf(a3: string, year: number): UnionDef | null {
  for (const u of UNIONS) {
    if (!inYears(year, u.from, u.to)) continue;
    for (const m of u.members) if (memberActive(m, year) === a3) return u;
  }
  return null;
}

function unionMembers(u: UnionDef, year: number): string[] {
  return u.members.map((m) => memberActive(m, year)).filter((x): x is string => !!x);
}

const unitCache = new Map<string, PoliticalUnit>();

/** Unidade política (no ano) de um país moderno inteiro, ignorando partições internas. */
export function unitOfCountry(a3: string, year: number): PoliticalUnit {
  const key = `${a3}@${year}`;
  const hit = unitCache.get(key);
  if (hit) return hit;
  let unit: PoliticalUnit;
  const u = unionOf(a3, year);
  if (u) {
    const members = unionMembers(u, year);
    const bloc = blocOfCountry(u.power ?? (u.id === 'SUN' ? 'RUS' : members[0]), year);
    unit = { id: u.id, name: u.name, members, bloc, kind: u.power ? 'colony' : 'union', colonialPower: u.power, sovereign: u.power ?? u.sovereign ?? u.id };
  } else {
    const col = COLONIES[a3];
    if (col && year < col[1]) {
      const adj = POWER_ADJ[col[0]];
      const n = countryName(a3);
      unit = { id: a3, name: adj ? { pt: `${n.pt} (${adj.pt})`, en: `${n.en} (${adj.en})` } : n, members: [a3], bloc: blocOfCountry(col[0], year), kind: 'colony', colonialPower: col[0], sovereign: col[0] };
    } else {
      unit = { id: a3, name: countryName(a3), members: [a3], bloc: blocOfCountry(a3, year), kind: 'state', sovereign: a3 };
    }
  }
  if (unitCache.size > 4000) unitCache.clear();
  unitCache.set(key, unit);
  return unit;
}

export function partitionOf(a3: string, year: number): Partition | null {
  return PARTITIONS.find((p) => p.country === a3 && inYears(year, p.from, p.to)) ?? null;
}

function inPoly(flat: number[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = flat.length - 2; i < flat.length; j = i, i += 2) {
    const xi = flat[i], yi = flat[i + 1], xj = flat[j], yj = flat[j + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function partUnit(p: Partition, side: 'inside' | 'outside'): PoliticalUnit {
  const s = p[side];
  return { id: s.id, name: s.name, members: [p.country], bloc: s.bloc, kind: 'partition', sovereign: s.id };
}

/** Unidade política num ponto específico (considera partições e zonas especiais). */
export function unitAtPoint(a3: string, lon: number, lat: number, year: number): PoliticalUnit {
  for (const z of ZONES) {
    if (z.within !== a3 || !inYears(year, z.from, z.to)) continue;
    if (Math.hypot(lon - z.lon, lat - z.lat) <= z.r) {
      return { id: z.id, name: z.name, members: [a3], bloc: year >= 1947 && year <= 1991 ? z.bloc : null, kind: z.power ? 'colony' : 'state', colonialPower: z.power, sovereign: z.power ?? z.id };
    }
  }
  const p = partitionOf(a3, year);
  if (p) {
    const enclave = p.enclaves?.some(([x, y, r]) => Math.hypot(lon - x, lat - y) <= r);
    return partUnit(p, inPoly(p.region, lon, lat) && !enclave ? 'inside' : 'outside');
  }
  return unitOfCountry(a3, year);
}

/** Unidade política de uma cidade no ano (null se o país for desconhecido). */
export function unitOfCity(cityId: string, year: number): PoliticalUnit | null {
  const a3 = countryOfCity(cityId);
  const c = cityById[cityId];
  if (!a3 || !c) return null;
  return unitAtPoint(a3, c.lon, c.lat, year);
}

/** Observação de fronteira para cidades especiais (Berlim Ocidental etc.). */
export function cityBorderNote(cityId: string, year: number): L | null {
  const a3 = countryOfCity(cityId);
  const c = cityById[cityId];
  if (!a3 || !c) return null;
  const p = partitionOf(a3, year);
  if (p?.enclaves?.some(([x, y, r]) => Math.hypot(c.lon - x, c.lat - y) <= r)) {
    return l('Berlim Ocidental: acesso por corredores de trânsito através da RDA.', 'West Berlin: reached through transit corridors across the GDR.');
  }
  return null;
}

/** Todas as unidades políticas do ano (partições aparecem como duas unidades). */
export function politicalUnitsAt(year: number): PoliticalUnit[] {
  const codes = GEO ? GEO.countries.map((c) => c.a3) : allCountryCodes();
  const seen = new Map<string, PoliticalUnit>();
  for (const a3 of codes) {
    const p = partitionOf(a3, year);
    if (p) {
      seen.set(p.inside.id, partUnit(p, 'inside'));
      seen.set(p.outside.id, partUnit(p, 'outside'));
      continue;
    }
    const u = unitOfCountry(a3, year);
    if (!seen.has(u.id)) seen.set(u.id, u);
  }
  return [...seen.values()];
}

// ---------------------------------------------------------------- mercados do jogo por país

const MKT: Partial<Record<MarketId, string>> = {
  na: 'USA CAN GRL PRI',
  br: 'BRA',
  oceania: 'AUS NZL PNG FJI SLB VUT NCL',
  latam: 'MEX GTM BLZ HND SLV NIC CRI PAN CUB JAM HTI DOM BHS TTO COL VEN GUY SUR ECU PER BOL CHL ARG URY PRY FLK',
  eu: 'GBR IRL ISL NOR SWE FIN DNK EST LVA LTU POL DEU NLD BEL LUX FRA ESP PRT ITA CHE AUT CZE SVK HUN SVN HRV BIH SRB MNE XKX MKD ALB GRC BGR ROU MDA UKR BLR RUS',
  africa: 'MAR DZA TUN LBY EGY SDN SSD ESH MRT MLI NER TCD SEN GMB GNB GIN SLE LBR CIV BFA GHA TGO BEN NGA CMR CAF GNQ GAB COG COD AGO ZMB ZWE MWI MOZ TZA KEN UGA RWA BDI ETH ERI DJI SOM XSL NAM BWA ZAF LSO SWZ MDG',
};
const MARKET_OF: Record<string, MarketId> = {};
for (const [m, list] of Object.entries(MKT)) for (const a3 of list!.split(' ')) MARKET_OF[a3] = m as MarketId;

/** Mercado do jogo (as 7 regiões de MARKETS) ao qual um país pertence; padrão: Ásia e Oriente Médio. */
export function marketOfCountry(a3: string): MarketId {
  return MARKET_OF[a3] ?? (a3 === 'ATA' ? 'oceania' : 'asia');
}
