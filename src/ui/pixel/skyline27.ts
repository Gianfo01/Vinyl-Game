// Rodada 27 (I2b) — céu e horizonte do "Nosso mundo" por cidade e época (bíblia: docs/art27-city.md §12).
// Camadas de trás para a frente: céu em faixas pontilhadas → nuvens → serras distantes (perspectiva aérea:
// mais longe = mais clara e azulada) → horizonte distante → água (baía, rio, lagoa) → morros → horizonte médio
// (com os prédios-assinatura da cidade: Chrysler, St Paul's, Sacré-Cœur, Fuji…) → casario perto → linha de
// árvores. Janelas acesas, luzes de aviação, estrelas e lua vão para a camada de luzes (`gl`, só aparece à noite).
//
// Duas metades:
//   • skyPlan27 (PURA, testada): o que existe no horizonte da cidade no ano — prédios (com material da época:
//     sem pele de vidro antes de 1968), relevo, água e assinaturas (cada uma com ano de construção/demolição);
//   • paintSky27: pinta o plano numa faixa W × H (escala para qualquer largura), com cache por
//     (cidade, ano, tamanho, tempo, semente) — o chão do mapa é refeito a cada cena e o horizonte não muda.
// Tudo determinístico (noise por coordenada, sem Math.random).

import { cityById } from '../../data/world';
import { C, Px, dith, mix, noise, shade, withAlpha, type Col } from './px';
import { ramp20 } from './cenas20';

/** Tom n da rampa de 6 tons do estilo oficial (0–2 sombra arroxeada, 3 base, 4 luz quente, 5 brilho). */
const tn = (c: Col, n: number): Col => ramp20(c)[n];

/** O que o horizonte precisa do ambiente (é um recorte de Env27, de city27.ts). */
export interface SkyEnv27 { year: number; month: number; city: string; lat: number; climate: 'tropical' | 'arid' | 'mild' | 'cold'; season: 'winter' | 'spring' | 'summer' | 'autumn'; snow: boolean; rain: boolean }
/** O que o horizonte precisa da cara da cidade (recorte de CityLook27). */
export interface SkyLook27 { sea: boolean; hillAmp: number; favela: boolean; wall: string[] }

// ---------------------------------------------------------------- regiões, alturas e relevo (dados)

export type Reg27 = 'us' | 'br' | 'latam' | 'carib' | 'uk' | 'eu' | 'med' | 'nordic' | 'east' | 'mena' | 'asia' | 'south' | 'africa' | 'oceania';
const S = (s: string) => new Set(s.split(' '));
const CARIB = S('kingston havana san_juan santo_domingo port_of_spain port_au_prince pointe_a_pitre cartagena panama');
const UK = S('london manchester liverpool dublin glasgow bristol birmingham sheffield');
const NORDIC = S('stockholm copenhagen oslo helsinki reykjavik');
const EAST = S('moscow st_petersburg kyiv warsaw belgrade budapest prague');
const MED = S('lisbon madrid barcelona sevilla ibiza rome naples athens marseille porto');
const MENA = S('beirut istanbul tehran tel_aviv dubai karachi lahore cairo casablanca algiers oran tunis');
const SOUTH = S('mumbai delhi kolkata chennai');
/** Cidades com casario de tijolo e chaminés (indústria do século XIX). */
const INDUSTRY = S('london manchester liverpool glasgow birmingham sheffield bristol detroit chicago cleveland philadelphia new_york boston hamburg rotterdam cologne kyiv warsaw moscow st_petersburg montreal toronto minneapolis kansas_city memphis');
/** Bairros de cúpulas e minaretes (mesquitas). */
const MOSQUE = S('cairo istanbul tehran karachi lahore casablanca algiers oran tunis dakar bamako beirut dubai delhi kolkata zanzibar dar_es_salaam abidjan kano');
const ONION = S('moscow st_petersburg kyiv belgrade');
const PAGODA = S('tokyo osaka seoul busan beijing shanghai bangkok taipei ho_chi_minh hong_kong');

export function region27(city: string): Reg27 {
  if (CARIB.has(city)) return 'carib';
  if (UK.has(city)) return 'uk';
  if (NORDIC.has(city)) return 'nordic';
  if (EAST.has(city)) return 'east';
  if (MED.has(city)) return 'med';
  if (MENA.has(city)) return 'mena';
  if (SOUTH.has(city)) return 'south';
  switch (cityById[city]?.market) {
    case 'na': return 'us';
    case 'br': return 'br';
    case 'latam': return 'latam';
    case 'eu': return 'eu';
    case 'asia': return 'asia';
    case 'africa': return 'africa';
    case 'oceania': return 'oceania';
  }
  return 'eu';
}

type KF = [number, number][];
const kf = (k: KF, y: number): number => {
  if (y <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (y < k[i][0]) { const [a, va] = k[i - 1], [b, vb] = k[i]; return va + (vb - va) * ((y - a) / (b - a)); }
  return k[k.length - 1][1];
};
/** Altura máxima (px) do centro da cidade por época — o horizonte cresce década a década. */
const HK27: Record<string, KF> = {
  new_york: [[1889, 16], [1900, 26], [1913, 36], [1931, 52], [1960, 54], [1973, 60], [2010, 64]],
  chicago: [[1889, 16], [1900, 24], [1925, 34], [1931, 40], [1965, 44], [1974, 54], [2010, 58]],
  los_angeles: [[1889, 9], [1928, 12], [1957, 14], [1966, 32], [1990, 46]], // limite de altura até 1957
  san_francisco: [[1889, 12], [1930, 24], [1972, 40], [2018, 50]],
  detroit: [[1889, 12], [1915, 20], [1929, 34], [1977, 40]],
  sao_paulo: [[1889, 9], [1929, 20], [1947, 30], [1965, 40], [1990, 44], [2010, 46]],
  tokyo: [[1889, 9], [1923, 12], [1964, 16], [1971, 36], [1991, 48], [2010, 54]], // 31 m de limite até os anos 60
  osaka: [[1889, 9], [1964, 14], [1975, 28], [1995, 40]],
  london: [[1889, 11], [1960, 14], [1966, 26], [1980, 32], [2000, 36], [2012, 44]],
  paris: [[1889, 11], [2040, 13]],
  hong_kong: [[1889, 10], [1960, 20], [1980, 40], [1990, 52], [2003, 60]],
  shanghai: [[1889, 10], [1930, 20], [1990, 26], [2000, 48], [2015, 60]],
  singapore: [[1889, 8], [1970, 20], [1986, 44], [2010, 52]],
  dubai: [[1889, 5], [1979, 14], [1999, 36], [2008, 54]],
  toronto: [[1889, 10], [1930, 20], [1967, 34], [1990, 46]],
  houston: [[1889, 8], [1960, 22], [1982, 50]], atlanta: [[1889, 8], [1960, 18], [1987, 46]], philadelphia: [[1889, 14], [1987, 46]],
  seattle: [[1889, 8], [1914, 22], [1969, 34], [1985, 46]],
  washington: [[1889, 8], [2040, 12]], // lei de altura de 1899
  kuala_lumpur: [[1889, 6], [1980, 24], [1998, 46]], bangkok: [[1889, 6], [1985, 30], [2000, 44]], seoul: [[1889, 7], [1970, 22], [1990, 40], [2010, 48]],
  mexico_city: [[1889, 8], [1956, 24], [1990, 32], [2010, 40]], buenos_aires: [[1889, 10], [1936, 22], [1980, 30], [2010, 38]],
  rio: [[1889, 8], [1929, 16], [1950, 22], [1975, 28]], lagos: [[1889, 6], [1963, 22], [1979, 32], [2010, 36]],
  johannesburg: [[1889, 6], [1936, 18], [1970, 34]], mumbai: [[1889, 8], [1970, 24], [2010, 44]],
  sydney: [[1889, 9], [1962, 18], [1980, 34], [2000, 40]], melbourne: [[1889, 9], [1970, 26], [2006, 42]],
  moscow: [[1889, 10], [1953, 30], [2010, 50]], kingston: [[1889, 6], [1970, 14], [1990, 18]],
  nashville: [[1889, 8], [1957, 16], [1985, 26], [1994, 30]], memphis: [[1889, 8], [1924, 16], [1965, 24]],
};
const RK27: Record<Reg27, KF> = {
  us: [[1889, 10], [1910, 18], [1930, 26], [1960, 28], [1975, 36], [1990, 42]],
  br: [[1889, 8], [1940, 16], [1960, 24], [1980, 30], [2000, 34]],
  latam: [[1889, 8], [1950, 16], [1970, 24], [1990, 30], [2010, 36]],
  carib: [[1889, 6], [1960, 12], [1980, 18], [2010, 22]],
  uk: [[1889, 10], [1960, 12], [1966, 22], [1990, 26], [2010, 32]],
  eu: [[1889, 10], [1960, 13], [1970, 22], [2000, 28]],
  med: [[1889, 9], [1960, 14], [1975, 22], [2005, 28]],
  nordic: [[1889, 9], [1960, 12], [1970, 20], [2005, 28]],
  east: [[1889, 9], [1950, 16], [1965, 22], [2005, 30]],
  mena: [[1889, 8], [1970, 18], [2000, 28], [2015, 34]],
  asia: [[1889, 7], [1960, 14], [1980, 28], [2000, 40], [2015, 46]],
  south: [[1889, 7], [1970, 20], [2000, 30], [2015, 40]],
  africa: [[1889, 6], [1960, 14], [1980, 24], [2010, 30]],
  oceania: [[1889, 8], [1960, 14], [1980, 28], [2000, 34]],
};
/** Centro (fração da largura) e meia-largura do miolo de prédios altos. */
const CBD27: Record<string, [number, number]> = { tokyo: [0.36, 0.28], paris: [0.5, 0.5], los_angeles: [0.56, 0.16], sao_paulo: [0.5, 0.42], new_york: [0.5, 0.4], chicago: [0.55, 0.3], rio: [0.5, 0.18], kingston: [0.5, 0.14], nashville: [0.5, 0.16], memphis: [0.46, 0.18], lagos: [0.48, 0.2], london: [0.56, 0.3], detroit: [0.46, 0.2], sydney: [0.5, 0.18] };

export type TerK27 = 'ridge' | 'cone' | 'table' | 'roll' | 'loaf' | 'dumps';
/** Relevo: x = centro (fração da largura), w = meia-largura (px), h = altura (px); far = serra distante (azulada). */
export interface Ter27 { k: TerK27; x: number; w: number; h: number; far: boolean; snow?: 'always' | 'winter' | 'never'; col?: string }
const T = (k: TerK27, x: number, w: number, h: number, far: boolean, snow?: Ter27['snow'], col?: string): Ter27 => ({ k, x, w, h, far, snow, col });
const TER27: Record<string, Ter27[]> = {
  rio: [T('ridge', 0.3, 90, 34, true), T('ridge', 0.82, 70, 26, true)],
  los_angeles: [T('ridge', 0.42, 150, 30, true, 'winter', '#7a8296'), T('roll', 0, 0, 9, false, undefined, '#8a8a58')],
  kingston: [T('ridge', 0.5, 180, 40, true, 'never', '#3e6a6a'), T('roll', 0, 0, 7, false)],
  tokyo: [T('cone', 0.76, 46, 30, true, 'always', '#6a7aa0')],
  seattle: [T('cone', 0.74, 42, 30, true, 'always', '#7a88a8'), T('ridge', 0.2, 80, 14, true, 'always', '#7a88a8')],
  vancouver: [T('ridge', 0.5, 200, 34, true, 'winter', '#4a6070')],
  cape_town: [T('table', 0.42, 64, 36, false, 'never', '#6a7468'), T('cone', 0.16, 20, 26, false, 'never', '#6a7468')],
  naples: [T('cone', 0.72, 50, 26, true, 'never', '#7a7480')],
  mexico_city: [T('cone', 0.78, 34, 30, true, 'always', '#7a84a0'), T('ridge', 0.56, 40, 24, true, 'always', '#7a84a0')],
  santiago: [T('ridge', 0.5, 220, 44, true, 'always', '#7a7f9a')],
  bogota: [T('ridge', 0.5, 200, 30, true, 'never', '#4a6a5a')], medellin: [T('ridge', 0.5, 200, 30, true, 'never', '#4a6a5a')],
  caracas: [T('ridge', 0.5, 200, 32, true, 'never', '#3e6a5a')], cali: [T('ridge', 0.5, 200, 26, true, 'never', '#4a6a5a')],
  hong_kong: [T('ridge', 0.3, 110, 30, true, 'never', '#3e6a5a'), T('ridge', 0.8, 70, 22, true, 'never', '#3e6a5a')],
  honolulu: [T('table', 0.82, 34, 16, false, 'never', '#7a8a5a'), T('ridge', 0.35, 110, 28, true, 'never', '#3e6a5a')],
  wellington: [T('roll', 0, 0, 14, false)], auckland: [T('cone', 0.8, 30, 10, true, 'never', '#4a6a5a')],
  barcelona: [T('ridge', 0.5, 200, 20, true, 'never', '#506a5a')], lisbon: [T('roll', 0, 0, 10, false)], porto: [T('roll', 0, 0, 10, false)],
  athens: [T('cone', 0.4, 18, 22, false, 'never', '#8a8a70'), T('ridge', 0.7, 120, 22, true, 'never', '#8a8a96')],
  istanbul: [T('roll', 0, 0, 9, false)], tehran: [T('ridge', 0.5, 220, 40, true, 'winter', '#8a8496')],
  beirut: [T('ridge', 0.5, 220, 34, true, 'winter', '#7a8296')], seoul: [T('ridge', 0.4, 140, 30, true, 'winter', '#5a6a7a')],
  busan: [T('ridge', 0.5, 200, 26, true, 'never', '#4a6a5a')], taipei: [T('ridge', 0.5, 200, 28, true, 'never', '#4a6a5a')],
  osaka: [T('ridge', 0.5, 220, 18, true, 'never', '#5a6a7a')], beijing: [T('ridge', 0.2, 120, 20, true, 'winter', '#7a8296')],
  oslo: [T('roll', 0, 0, 12, false)], reykjavik: [T('table', 0.5, 140, 22, true, 'always', '#6a7a8a')],
  nairobi: [T('roll', 0, 0, 9, false)], kampala: [T('roll', 0, 0, 10, false)], addis_ababa: [T('ridge', 0.5, 200, 24, true, 'never', '#5a6a5a')],
  johannesburg: [T('dumps', 0.25, 26, 9, false, 'never', '#d8c070'), T('dumps', 0.72, 20, 7, false, 'never', '#d8c070')],
  las_vegas: [T('ridge', 0.5, 220, 26, true, 'winter', '#9a8070')], salvador: [T('roll', 0, 0, 6, false)], florianopolis: [T('roll', 0, 0, 12, false)],
  nashville: [T('roll', 0, 0, 14, true, 'never', '#4a7a50')], sheffield: [T('roll', 0, 0, 10, false)], bristol: [T('roll', 0, 0, 9, false)], glasgow: [T('roll', 0, 0, 8, false)],
  vienna: [T('roll', 0, 0, 10, false)], budapest: [T('roll', 0, 0, 11, false)], prague: [T('roll', 0, 0, 9, false)], kyiv: [T('roll', 0, 0, 8, false)],
  munich: [T('ridge', 0.5, 240, 16, true, 'always', '#8a92aa')], milan: [T('ridge', 0.5, 240, 16, true, 'always', '#8a92aa')],
  bh: [T('ridge', 0.5, 200, 22, true, 'never', '#5a6a5a')], port_of_spain: [T('ridge', 0.5, 200, 24, true, 'never', '#3e6a5a')],
  port_au_prince: [T('ridge', 0.5, 200, 28, true, 'never', '#4a6a5a')], pointe_a_pitre: [T('cone', 0.7, 50, 24, true, 'never', '#4a6a5a')],
  santo_domingo: [T('roll', 0, 0, 5, false)], havana: [T('roll', 0, 0, 5, false)], san_juan: [T('ridge', 0.5, 200, 16, true, 'never', '#4a6a5a')],
  montevideo: [T('cone', 0.8, 30, 9, false, 'never', '#6a8a5a')], dunedin: [T('roll', 0, 0, 14, false)], suva: [T('ridge', 0.5, 200, 20, true, 'never', '#3e6a5a')],
  algiers: [T('roll', 0, 0, 12, false)], oran: [T('ridge', 0.3, 80, 18, false, 'never', '#9a8a6a')], tunis: [T('roll', 0, 0, 6, false)],
  manila: [], jakarta: [T('cone', 0.8, 40, 16, true, 'never', '#5a6a7a')], kuala_lumpur: [T('roll', 0, 0, 10, false)], singapore: [],
};
/** Água entre o horizonte e a cidade (px): baías (look.sea), rios e lagoas. */
const WATER27: Record<string, number> = { new_york: 5, memphis: 5, detroit: 4, lagos: 5, seattle: 5, san_francisco: 6, toronto: 4, cleveland: 4, montreal: 4, budapest: 4, kolkata: 4, shanghai: 5, bangkok: 4, cairo: 4, st_petersburg: 4, belem: 5, manaus: 5, porto_alegre: 4, hamburg: 4, cologne: 4, kinshasa: 5, abidjan: 5, ho_chi_minh: 4 };

// ---------------------------------------------------------------- plano (PURO)

export type Mat27 = 'brick' | 'stone' | 'stucco' | 'deco' | 'modern' | 'concrete' | 'bronze' | 'blue' | 'teal' | 'dark' | 'white' | 'adobe' | 'panel';
/** Pele de vidro (só a partir de 1968 — regra dura da bíblia de arte). */
export const GLASS_MATS27: ReadonlySet<Mat27> = new Set<Mat27>(['bronze', 'blue', 'teal']);
export const GLASS_YEAR27 = 1968;
export type Top27 = 'flat' | 'pitch' | 'chim' | 'mansard' | 'tank' | 'setback' | 'crown' | 'slant' | 'antenna' | 'pyr' | 'dome' | 'steep' | 'gable' | 'tile';
export type Acc27 = 'spire' | 'domech' | 'twin' | 'onion' | 'minaret' | 'pagoda' | 'gasholder' | 'stack' | 'crane' | 'palm' | 'tvmast';
export interface SkyB27 { x: number; w: number; h: number; mat: Mat27; top: Top27; layer: 0 | 1 | 2; tone: number }
export interface SkyA27 { x: number; k: Acc27; h: number; layer: 0 | 1 | 2 }
export interface SkyPlan27 { reg: Reg27; blds: SkyB27[]; acc: SkyA27[]; sigs: Sig27[]; terr: Ter27[]; water: number; trees: boolean; palms: boolean; hmax: number }

const hashS = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % 100003; };
const TROPIC_PALMS = S('los_angeles miami honolulu rio salvador recife fortaleza kingston havana san_juan santo_domingo port_of_spain cartagena lagos accra abidjan dakar dar_es_salaam zanzibar mumbai chennai singapore bangkok manila jakarta ho_chi_minh dubai tel_aviv beirut cairo sevilla ibiza barcelona panama brisbane perth suva belem manaus sao_luis florianopolis luanda maputo durban');

/** Material de um prédio do horizonte pela região, época e altura (vidro só ≥ 1968). */
export function mat27(reg: Reg27, year: number, tall: boolean, r: number): Mat27 {
  const warm = reg === 'br' || reg === 'latam' || reg === 'carib' || reg === 'med' || reg === 'africa' || reg === 'south';
  if (!tall) {
    if (reg === 'mena') return r < 0.6 ? 'adobe' : 'stucco';
    if (reg === 'east' && year >= 1960 && r < 0.45) return 'panel';
    if (year >= 1960 && r < 0.25) return 'concrete';
    if (reg === 'uk' || (reg === 'us' && year < 1950)) return r < 0.7 ? 'brick' : 'stone';
    return warm ? (r < 0.75 ? 'stucco' : 'white') : r < 0.5 ? 'stone' : r < 0.8 ? 'stucco' : 'brick';
  }
  if (year < 1920) return reg === 'us' ? (r < 0.5 ? 'stone' : 'brick') : 'stone';
  if (year < 1946) return reg === 'us' || reg === 'br' || reg === 'latam' ? (r < 0.65 ? 'deco' : 'stone') : 'stone';
  if (year < GLASS_YEAR27) return reg === 'east' ? (r < 0.6 ? 'panel' : 'stone') : r < 0.55 ? 'modern' : r < 0.85 ? 'concrete' : 'deco';
  if (year < 1990) return r < 0.32 ? 'bronze' : r < 0.6 ? 'concrete' : r < 0.85 ? 'modern' : 'dark';
  if (year < 2020) return r < 0.45 ? 'blue' : r < 0.6 ? 'dark' : r < 0.78 ? 'concrete' : r < 0.9 ? 'stone' : 'bronze';
  return r < 0.4 ? 'teal' : r < 0.65 ? 'blue' : r < 0.85 ? 'white' : 'concrete';
}
function top27(reg: Reg27, year: number, mat: Mat27, h: number, layer: number, r: number, city: string): Top27 {
  if (layer === 2 || h < 14) {
    if (reg === 'uk') return year < 1965 || r < 0.6 ? 'chim' : 'flat';
    if (city === 'paris' || reg === 'eu' && r < 0.3) return 'mansard';
    if (reg === 'nordic') return 'steep';
    if (city === 'amsterdam' || city === 'brussels' || city === 'copenhagen') return 'gable';
    if (reg === 'med' || (reg === 'latam' && r < 0.4) || (reg === 'br' && year < 1950 && r < 0.4)) return 'tile';
    if (reg === 'eu' || reg === 'east') return r < 0.6 ? 'pitch' : 'flat';
    if (reg === 'us') return year < 1950 && r < 0.35 ? 'chim' : city === 'new_york' && r < 0.45 ? 'tank' : 'flat';
    if (reg === 'oceania') return r < 0.5 ? 'pitch' : 'flat';
    return 'flat';
  }
  if (mat === 'deco') return r < 0.5 ? 'setback' : r < 0.75 ? 'crown' : 'flat';
  if (city === 'new_york' && year < 1990 && r < 0.4) return 'tank';
  if (year >= 1985 && year < 2010 && h > 30 && r < 0.3) return r < 0.12 ? 'pyr' : 'crown';
  if (year >= 1950 && h > 34 && r > 0.82) return 'antenna';
  if (mat === 'stone' && year < 1940 && r < 0.3) return 'mansard';
  return 'flat';
}

export interface Sig27 { id: string; from: number; to?: number; x: number; layer: 0 | 1 | 2; d: SigDraw }
type SigDraw = (P: Paint, x: number) => void;

/** Assinaturas de horizonte de pé no ano (construídas e não demolidas). */
export function sigs27(city: string, year: number): Sig27[] {
  return (SIGS27[city] ?? []).filter((s) => s.from <= year && (s.to === undefined || year < s.to));
}
/** Todas as assinaturas cadastradas (para os testes). */
export const allSigs27 = (): [string, Sig27][] => Object.entries(SIGS27).flatMap(([c, xs]) => xs.map((x) => [c, x] as [string, Sig27]));

/** O plano do horizonte: puro (mesmo resultado para os mesmos argumentos). */
export function skyPlan27(city: string, year: number, W: number, seed: number, look?: SkyLook27, lat?: number): SkyPlan27 {
  const reg = region27(city);
  const s = (seed * 131 + hashS(city)) % 99991;
  const sc = SC27[city] ?? 1;
  const hmax = Math.round(kf(HK27[city] ?? RK27[reg], year) * (HK27[city] ? 1 : sc));
  const [cc, cw] = CBD27[city] ?? [0.3 + noise(hashS(city), 3) * 0.4, 0.22];
  const cx = cc * W, cwp = Math.max(46, cw * W);
  const env = (x: number) => { const t = (x - cx) / cwp; return Math.exp(-t * t * 1.4); };
  const low = Math.max(6, Math.min(14, hmax * 0.5));
  const water = look?.sea ? 6 : WATER27[city] ?? 0;
  const sigs = sigs27(city, year);
  const blds: SkyB27[] = [];
  const isTall = (h: number) => h > low * 1.25;
  for (const L of [0, 1, 2] as const) {
    if (L === 2 && water) break; // cidade do outro lado da água: sem casario perto
    let x = -3 - Math.floor(noise(L, 1, s) * 6);
    while (x < W + 3) {
      const r1 = noise(x, 11 + L, s), r2 = noise(x, 13 + L, s), r3 = noise(x, 17 + L, s), r4 = noise(x, 19 + L, s);
      const e = env(x);
      let w: number, h: number;
      if (L === 0) { w = 4 + Math.floor(r1 * 6); h = Math.round(4 + (hmax * 0.8 - 4) * e * (0.35 + 0.65 * r2) + low * 0.5 * r4); }
      else if (L === 1) { w = 5 + Math.floor(r1 * 7); h = Math.round(3 + (hmax - 3) * e * (0.2 + 0.8 * r2 * r2) + low * 0.6 * r4); }
      else { w = 7 + Math.floor(r1 * 8); h = Math.round(low * (0.55 + 0.55 * r2)); }
      if (look?.sea && L > 0 && Math.abs(x - W / 2) > W * 0.26) { x += w + 2; continue; } // baía: só o centro tem prédios
      const tall = L < 2 && isTall(h);
      let mat = mat27(reg, year, tall, r3);
      if (year < GLASS_YEAR27 && GLASS_MATS27.has(mat)) mat = 'modern';
      blds.push({ x, w, h, mat, top: top27(reg, year, mat, h, L, r4, city), layer: L, tone: noise(x, 23 + L, s) });
      x += w + (L === 0 ? 0 : r3 < 0.2 ? 1 + Math.floor(r3 * 10) : 0);
    }
  }
  // acentos da época: torres de igreja, cúpulas, minaretes, pagodes, gasômetros, chaminés de fábrica, guindastes
  const acc: SkyA27[] = [];
  const n = Math.max(2, Math.round(W / 64));
  for (let i = 0; i < n; i++) {
    const x = Math.round(((i + 0.3 + noise(i, 5, s) * 0.4) / n) * W);
    if (sigs.some((g) => Math.abs(g.x * W - x) < 14)) continue;
    const r = noise(i, 7, s);
    const k: Acc27 | null = MOSQUE.has(city) ? (r < 0.65 ? 'minaret' : 'domech')
      : ONION.has(city) ? (r < 0.6 ? 'onion' : 'spire')
      : PAGODA.has(city) ? (year < 1990 || r < 0.4 ? (r < 0.6 ? 'pagoda' : null) : null)
      : reg === 'latam' || reg === 'br' || reg === 'carib' ? (r < 0.4 ? 'twin' : r < 0.7 ? 'domech' : null)
      : reg === 'med' ? (r < 0.5 ? 'domech' : 'spire')
      : reg === 'uk' && r < 0.3 && year < 2012 ? 'gasholder'
      : INDUSTRY.has(city) && r < 0.45 && year < 1975 ? 'stack'
      : reg === 'south' || reg === 'africa' || reg === 'asia' || reg === 'mena' ? (r < 0.3 ? 'domech' : null)
      : r < 0.7 ? 'spire' : null;
    if (k) acc.push({ x, k, h: 0, layer: 1 });
  }
  if (INDUSTRY.has(city) && year < 1975) for (let i = 0; i < 2; i++) acc.push({ x: Math.round(W * (0.12 + 0.7 * noise(i, 31, s))), k: 'stack', h: 0, layer: 0 });
  const boom = (reg === 'asia' && year >= 1985 && year < 2020) || (city === 'dubai' && year >= 1995 && year < 2016) || (city === 'london' && year >= 2004) || ((reg === 'br' || reg === 'latam') && year >= 1955 && year < 1982) || (city === 'shanghai' && year >= 1992) || (reg === 'us' && year >= 1980 && year < 1990);
  if (boom) for (let i = 0; i < 2; i++) acc.push({ x: Math.round(cx + (noise(i, 41, s) - 0.5) * cwp * 1.4), k: 'crane', h: Math.round(hmax * 0.7), layer: 1 });
  if (year >= 1955 && year < 1990 && reg !== 'carib' && hmax > 18 && noise(3, 51, s) < 0.5) acc.push({ x: Math.round(W * (0.15 + 0.7 * noise(4, 51, s))), k: 'tvmast', h: Math.round(hmax * 0.9 + 6), layer: 0 });
  const climate = lat !== undefined && Math.abs(lat) < 30;
  const palms = TROPIC_PALMS.has(city) || (climate && (reg === 'carib' || reg === 'africa' || reg === 'br'));
  const terr = TER27[city] ?? defaultTerr27(reg, s);
  return { reg, blds, acc, sigs, terr, water, trees: !water, palms, hmax };
}
/** Relevo genérico por região: colinas suaves ao longe, nunca nada colado no topo. */
function defaultTerr27(reg: Reg27, s: number): Ter27[] {
  if (reg === 'carib' || reg === 'latam') return [T('ridge', 0.5, 220, 18 + Math.round(noise(s, 1) * 10), true, 'never', '#4a6a5a')];
  if (reg === 'mena' || reg === 'africa') return [T('roll', 0, 0, 5, false, 'never', reg === 'mena' ? '#b8a070' : undefined)];
  if (reg === 'br' || reg === 'med' || reg === 'oceania') return [T('roll', 0, 0, 7, false)];
  if (reg === 'south' || reg === 'asia') return [];
  return [T('roll', 0, 0, 5, false)];
}
/** Cidades menores que a média da região (o horizonte genérico encolhe). */
const SC27: Record<string, number> = { liverpool: 0.8, manchester: 0.9, glasgow: 0.8, bristol: 0.7, sheffield: 0.7, birmingham: 0.85, dublin: 0.7, new_orleans: 0.8, austin: 0.8, minneapolis: 0.95, cleveland: 0.85, kansas_city: 0.8, honolulu: 0.8, las_vegas: 0.8, miami: 1, boston: 1, montreal: 0.9, vancouver: 0.9,
  salvador: 0.85, recife: 0.85, fortaleza: 0.8, bh: 0.9, porto_alegre: 0.85, curitiba: 0.85, belem: 0.7, brasilia: 0.6, goiania: 0.7, manaus: 0.7, florianopolis: 0.6, sao_luis: 0.6, campinas: 0.7,
  havana: 0.9, san_juan: 0.9, santo_domingo: 0.8, port_of_spain: 0.7, cartagena: 0.8, port_au_prince: 0.6, pointe_a_pitre: 0.5, panama: 1.2, ibiza: 0.4, reykjavik: 0.5, dunedin: 0.5, suva: 0.5, zanzibar: 0.4, bamako: 0.6 };

// ---------------------------------------------------------------- céu

export interface SkyCols27 { top: Col; mid: Col; bot: Col; cloud: Col; cloudSh: Col; overcast: boolean }
/** Cores do céu: clima, estação, tempo e época (fumaça de carvão nas cidades industriais antes de 1960). */
export function skyCols27(e: SkyEnv27): SkyCols27 {
  let top: Col, mid: Col, bot: Col;
  if (e.snow) { top = C('#8aa8c8'); mid = C('#b8cadc'); bot = C('#e6eef6'); }
  else if (e.rain) { top = C('#66768e'); mid = C('#8a98ac'); bot = C('#bcc6d2'); }
  else if (e.climate === 'tropical') { top = C('#2a86e0'); mid = C('#5cb4f0'); bot = C('#d2f0fc'); }
  else if (e.climate === 'arid') { top = C('#4294dc'); mid = C('#86c0e8'); bot = C('#f0dcb4'); }
  else if (e.climate === 'cold') { top = C('#4a8ed8'); mid = C('#86bae8'); bot = C('#dcecf8'); }
  else { top = C('#3e8cdc'); mid = C('#7cbaec'); bot = C('#d6ecfa'); }
  if (!e.rain && !e.snow && e.season === 'autumn' && e.climate !== 'tropical') bot = mix(bot, C('#f8e0c0'), 0.35);
  if (!e.rain && !e.snow && e.season === 'winter' && e.climate !== 'tropical') { top = mix(top, C('#8aa8c8'), 0.25); bot = mix(bot, C('#eef2f6'), 0.3); }
  if (INDUSTRY.has(e.city) && e.year < 1960) { const k = e.year < 1925 ? 0.32 : 0.2; bot = mix(bot, C('#c8b48c'), k); mid = mix(mid, C('#b0a890'), k * 0.6); } // fuligem
  else if (e.year < 1946) { bot = mix(bot, C('#f0e4c8'), 0.12); top = mix(top, C('#c8b890'), 0.06); }
  if (!e.rain && !e.snow) bot = mix(bot, C('#fff0d8'), 0.18); // estilo oficial: luz quente no horizonte
  const overcast = e.rain || e.snow;
  const cloud = e.rain ? C('#9aa4b4') : e.snow ? C('#dce4ee') : C('#fbfcff');
  const cloudSh = e.rain ? C('#6e7a8e') : e.snow ? C('#b4c2d4') : mix(C('#c8d4e6'), mid, 0.3);
  return { top, mid, bot, cloud, cloudSh, overcast };
}
const BANDS = 9;
function skyAt(c: SkyCols27, H: number, x: number, y: number): Col {
  const t = Math.max(0, Math.min(1, y / Math.max(1, H - 1)));
  const f = t * BANDS, i = Math.floor(f), fr = f - i;
  const q = (i + (dith(x, y, fr) ? 1 : 0)) / BANDS;
  return q < 0.55 ? mix(c.top, c.mid, q / 0.55) : mix(c.mid, c.bot, Math.min(1, (q - 0.55) / 0.45));
}

// ---------------------------------------------------------------- pintura

/** Contexto de pintura de uma faixa W × H (linha de base = H − 1). */
export interface Paint {
  p: Px; g: Px; W: number; H: number; year: number; seed: number;
  /** névoa da camada atual (0 = perto, ~0,55 = longe) e cor da névoa */
  k: number; haze: Col; occ: Uint8Array;
  /** chance de janela acesa e luz das janelas */
  lit: number; win: Col; snow: boolean; base: number; layer: number;
}
const put = (P: Paint, x: number, y: number, c: Col) => {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= P.W || y >= P.H || !c) return;
  P.p.d[y * P.W + x] = (P.k > 0 ? mix(c, P.haze, P.k) : c) | 0xff000000;
  P.occ[y * P.W + x] = 2;
};
const light = (P: Paint, x: number, y: number, c: Col) => {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= P.W || y >= P.H) return;
  P.g.d[y * P.W + x] = P.layer === 0 ? withAlpha(c, 150) : P.layer === 1 ? withAlpha(c, 215) : c;
};
/** Retângulo apoiado em z0 (altura acima da base), largura w e altura h. */
const R = (P: Paint, x0: number, z0: number, w: number, h: number, c: Col | ((i: number, j: number) => Col)) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(P, x0 + i, P.base - z0 - j, typeof c === 'number' ? c : c(i, j));
};
/** Triângulo (telhado, pirâmide) de x0..x1 com ápice em ax a h px acima de z0. */
const tri = (P: Paint, x0: number, x1: number, z0: number, h: number, c: Col, cr?: Col, ax = (x0 + x1) / 2) => {
  for (let x = x0; x <= x1; x++) {
    const t = x <= ax ? (x - x0 + 0.5) / Math.max(0.5, ax - x0 + 0.5) : (x1 - x + 0.5) / Math.max(0.5, x1 - ax + 0.5);
    const hh = Math.round(h * Math.min(1, t));
    for (let j = 0; j < hh; j++) put(P, x, P.base - z0 - j, x > ax && cr !== undefined ? cr : c);
  }
};
/** Meia-cúpula (rx, ry) apoiada em z0, luz à esquerda. */
const domeAt = (P: Paint, cx: number, z0: number, rx: number, ry: number, c: Col) => {
  for (let j = 0; j < ry + 0.5; j++) { const w = rx * Math.sqrt(Math.max(0, 1 - (j / (ry + 0.5)) ** 2)); for (let i = -Math.round(w); i <= Math.round(w) - 1; i++) put(P, cx + i, P.base - z0 - j, i < -w * 0.35 ? tn(c, 4) : i >= w * 0.3 ? tn(c, 2) : c); }
};
const mastAt = (P: Paint, x: number, z0: number, h: number, c: Col, red = true) => { R(P, x, z0, 1, h, c); if (red && P.year >= 1950) light(P, x, P.base - z0 - h + 1, C('#ff3a30')); };
const winDark = (c: Col) => tn(mix(c, C('#28303e'), 0.35), 1);
const WIN = C('#ffd77a'), WIN2 = C('#fff0b8'), WINC = C('#e8f0ff');

/** Bloco de prédio com face clara, quina direita sombreada, cornija e janelas do material. */
function block(P: Paint, x0: number, z0: number, w: number, h: number, mat: Mat27, wall: Col, salt = 0): void {
  const side = w >= 7 ? 2 : 1, dark = winDark(wall), glass = GLASS_MATS27.has(mat);
  const litC = glass && P.year >= 1968 ? WINC : WIN;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const right = i >= w - side, y = P.base - z0 - j;
    let c = right ? tn(wall, 2) : wall;
    let win = false;
    const ii = i, jj = j;
    if (jj === h - 1) c = tn(c, 4);
    else if (jj >= 2 && ii >= 1 && ii < w - 1) {
      switch (mat) {
        case 'brick': case 'stone': case 'stucco': case 'adobe': case 'white': win = jj % 3 === 1 && ii % 2 === 1; break;
        case 'deco': if (ii % 2 === 0) c = shade(c, 0.07); else win = jj % 2 === 0; break;
        case 'modern': win = jj % 3 === 1; break;
        case 'concrete': win = jj % 3 === 1 && ii % 2 === 1; if (ii % 4 === 0) c = shade(c, -0.06); break;
        case 'panel': win = jj % 2 === 1 && ii % 2 === 1; if (jj % 4 === 0) c = shade(c, 0.06); break;
        case 'dark': win = jj % 2 === 0 && ii % 2 === 1; break;
        case 'bronze': case 'blue': case 'teal':
          if (jj % 3 === 0) c = shade(c, 0.1);
          if ((ii + jj + salt) % 13 < 2) c = tn(c, 5); // reflexo diagonal (vidro = material brilhante)
          win = jj % 3 === 1 && ii % 2 === 0;
          break;
      }
    }
    if (win) {
      const wc = glass ? shade(c, -0.15) : mat === 'dark' ? shade(wall, 0.22) : dark;
      put(P, x0 + ii, y, right ? shade(wc, -0.1) : wc);
      if (noise(x0 + ii + salt * 7, jj + z0, P.seed + 11) < P.lit) light(P, x0 + ii, y, noise(ii, jj, P.seed) < 0.18 ? WIN2 : litC);
    } else put(P, x0 + ii, y, c);
  }
}
const MATC27: Record<Mat27, string> = { brick: '#8c4c38', stone: '#cdbf9e', stucco: '#e0d0ae', deco: '#d6c6a0', modern: '#e2e0d6', concrete: '#a29e94', panel: '#c8c4b8', bronze: '#6e5c42', blue: '#4f80b0', teal: '#5aa6a6', dark: '#3e424c', white: '#efebe0', adobe: '#c8a878' };
const ROOF = { slate: C('#5c6070'), tile: C('#b8583a'), lead: C('#6a7484'), cu: C('#6aa890'), gold: C('#d8b048') };

/** Prédio genérico do plano: corpo + coroamento. */
function building(P: Paint, b: SkyB27, wallPal: Col[]): void {
  let wall = C(MATC27[b.mat]);
  if (b.mat === 'stucco' || b.mat === 'brick' || b.mat === 'stone') { const pc = wallPal[Math.floor(b.tone * wallPal.length) % Math.max(1, wallPal.length)]; if (pc !== undefined && b.layer === 2) wall = mix(wall, pc, 0.6); }
  wall = shade(wall, (b.tone - 0.5) * 0.14);
  const { x, w, h } = b;
  let H = h;
  if (b.top === 'setback' && h > 18) {
    const h1 = Math.round(h * 0.68), h2 = Math.round(h * 0.18);
    block(P, x, 0, w, h1, b.mat, wall, x);
    block(P, x + 1, h1, w - 2, h2, b.mat, shade(wall, 0.04), x);
    const w3 = Math.max(1, w - 4);
    block(P, x + 2, h1 + h2, w3, Math.round(h * 0.1), b.mat, shade(wall, 0.08), x);
    mastAt(P, x + Math.floor(w / 2), h1 + h2 + Math.round(h * 0.1), Math.max(3, Math.round(h * 0.14)), shade(wall, 0.1), false);
    return;
  }
  block(P, x, 0, w, H, b.mat, wall, x);
  const snowy = P.snow;
  switch (b.top) {
    case 'pitch': case 'chim': case 'tile': case 'steep': {
      const rc = b.top === 'tile' ? ROOF.tile : b.top === 'steep' ? (b.tone < 0.5 ? C('#7a3a30') : ROOF.slate) : ROOF.slate;
      const rh = b.top === 'steep' ? Math.ceil(w / 2) : Math.ceil(w / 3.2);
      tri(P, x, x + w - 1, H, rh, snowy ? C('#eef4fa') : rc, snowy ? C('#c8d8ec') : shade(rc, -0.2));
      if (b.top === 'chim') { R(P, x + 1, H, 2, rh + 1, shade(wall, -0.25)); if (w > 8) R(P, x + w - 3, H, 2, rh, shade(wall, -0.25)); put(P, x + 1, P.base - H - rh - 1, C('#b86a4a')); }
      break;
    }
    case 'mansard': {
      const rc = snowy ? C('#e8eef6') : C('#5c6a80');
      for (let j = 0; j < 4; j++) for (let i = j; i < w - j; i++) put(P, x + i, P.base - H - j, j === 3 ? shade(rc, 0.15) : i >= w - j - 2 ? shade(rc, -0.15) : rc);
      for (let i = 2; i < w - 2; i += 3) { put(P, x + i, P.base - H - 1, C('#e8e0cc')); if (noise(x + i, 3, P.seed) < P.lit * 0.8) light(P, x + i, P.base - H - 1, WIN); }
      if (w > 9) R(P, x + w - 4, H + 3, 2, 3, C('#9a7a6a'));
      break;
    }
    case 'gable': { for (let j = 0; j < 5; j++) { const inset = Math.floor(j / 2) * 2; R(P, x + inset, H + j, Math.max(1, w - inset * 2), 1, shade(wall, j % 2 ? 0.05 : 0)); } break; }
    case 'tank': { const tx = x + 1 + Math.floor(b.tone * Math.max(1, w - 4)); R(P, tx, H, 1, 2, C('#4a3a30')); R(P, tx + 2, H, 1, 2, C('#4a3a30')); R(P, tx, H + 2, 3, 3, C('#7a5a40')); put(P, tx + 1, P.base - H - 5, C('#5a4a40')); break; }
    case 'crown': { tri(P, x, x + w - 1, H, Math.max(3, Math.round(w * 0.6)), shade(wall, 0.12), shade(wall, -0.1)); if (P.year >= 1985) light(P, x + Math.floor(w / 2), P.base - H - 1, WINC); break; }
    case 'pyr': { tri(P, x + 1, x + w - 2, H, Math.ceil(w / 2), C('#b8c0c8'), C('#8a929c')); light(P, x + Math.floor((w - 1) / 2), P.base - H - Math.ceil(w / 2) + 1, C('#ffffff')); break; }
    case 'antenna': mastAt(P, x + Math.floor(w / 2), H, Math.max(4, Math.round(h * 0.16)), C('#c8ccd0')); break;
    case 'dome': domeAt(P, x + w / 2, H, w / 2 - 0.5, w / 3, ROOF.cu); break;
    case 'slant': tri(P, x, x + w - 1, H, Math.round(w * 0.8), shade(wall, 0.1), undefined, x); break;
    default: if (h > 24 && P.year >= 1950) light(P, x + Math.floor(w / 2), P.base - H, C('#ff3a30'));
  }
}

/** Acentos: igreja, cúpula, minarete, pagode, gasômetro, chaminé de fábrica, guindaste, palmeira, mastro de TV. */
function accent(P: Paint, a: SkyA27, era: number): void {
  const x = a.x, st = C('#c8bca4'), gr = C('#8a8a92');
  switch (a.k) {
    case 'spire': { block(P, x - 2, 0, 5, 14, 'stone', st); tri(P, x - 2, x + 2, 14, 14, C('#5a5e6c'), C('#464a58')); put(P, x, P.base - 28, C('#c8a040')); light(P, x, P.base - 10, WIN); break; }
    case 'domech': { block(P, x - 5, 0, 11, 9, 'stone', C('#e0d6bc')); R(P, x - 3, 9, 7, 3, shade(C('#e0d6bc'), -0.04)); domeAt(P, x, 12, 4, 4, era < 1900 ? C('#8a9aa0') : C('#7a9ab0')); R(P, x, 16, 1, 3, C('#d8c8a0')); break; }
    case 'twin': { block(P, x - 6, 0, 13, 9, 'stucco', C('#f0e6cc')); for (const dx of [-6, 4]) { block(P, x + dx, 0, 3, 17, 'stucco', C('#f0e6cc')); domeAt(P, x + dx + 1.5, 17, 1.5, 2, C('#c86a4a')); } tri(P, x - 3, x + 3, 9, 3, C('#f0e6cc')); break; }
    case 'onion': { block(P, x - 2, 0, 5, 16, 'stucco', C('#e8dcc4')); const c = era % 2 ? ROOF.gold : C('#4a8a6a'); for (let j = 0; j < 7; j++) { const w = [2, 3, 3, 2.5, 2, 1, 0.5][j]; for (let i = -Math.round(w); i < Math.round(w); i++) put(P, x + i + (i >= 0 ? 1 : 0) - 0.5, P.base - 16 - j, i < 0 ? shade(c, 0.12) : shade(c, -0.12)); } R(P, x, 23, 1, 3, ROOF.gold); break; }
    case 'minaret': { const c = C('#e8dcc0'); block(P, x - 8, 0, 9, 7, 'stucco', c); domeAt(P, x - 3.5, 7, 3.5, 3.5, C('#a0b4b4')); R(P, x + 2, 0, 2, 22, c); R(P, x + 1, 16, 4, 1, shade(c, -0.15)); tri(P, x + 2, x + 3, 22, 4, C('#7a9a9a')); light(P, x + 2, P.base - 17, C('#d8ff9a')); break; }
    case 'pagoda': { const c = C('#9a3a2a'); let z = 0; for (let k = 0; k < 4; k++) { const w = 7 - k; R(P, x - Math.floor(w / 2), z, w, 3, c); R(P, x - Math.floor(w / 2) - 2, z + 3, w + 4, 1, C('#3a3a42')); z += 4; } R(P, x, z, 1, 4, ROOF.gold); break; }
    case 'gasholder': { const c = C('#6a7a5a'); for (let i = 0; i < 14; i++) for (let j = 0; j < 9; j++) put(P, x - 7 + i, P.base - j, j === 8 ? shade(c, 0.14) : i > 10 ? shade(c, -0.18) : c); for (let i = 0; i <= 14; i += 3) R(P, x - 7 + i, 0, 1, 13, C('#4a4e52')); R(P, x - 7, 12, 15, 1, C('#4a4e52')); break; }
    case 'stack': { const hh = 22 + Math.round(noise(x, 3, P.seed) * 8); R(P, x, 0, 2, hh, (i, j) => (i ? C('#6a3a2a') : j % 6 === 0 ? C('#7a4a3a') : C('#8a4c36'))); R(P, x - 1, hh, 4, 1, C('#4a3028')); for (let i = 0; i < 6; i++) { const px = x + 2 + i * 1.6, py = P.base - hh - 2 - i * 0.8; put(P, px, py, withAlpha(C('#c8c4c0'), 255)); if (i % 2) put(P, px + 1, py - 1, C('#d8d4d0')); } break; }
    case 'crane': { const hh = Math.max(20, a.h), c = C('#e8b830'); for (let j = 0; j < hh; j++) put(P, x, P.base - j, j % 3 ? c : shade(c, -0.3)); R(P, x - 4, hh, 18, 1, c); R(P, x - 4, hh - 1, 3, 1, gr); put(P, x, P.base - hh - 1, c); put(P, x, P.base - hh - 2, c); for (let j = 1; j < 6; j++) put(P, x + 10, P.base - hh + j, C('#3a3a40')); light(P, x + 13, P.base - hh, C('#ff3a30')); break; }
    case 'tvmast': { const hh = Math.max(24, a.h); for (let j = 0; j < hh; j++) { put(P, x, P.base - j, Math.floor(j / 4) % 2 ? C('#e85a40') : C('#f0ece4')); if (j % 3 === 0 && j < hh - 4) { put(P, x - 1, P.base - j, C('#9a9a9a')); put(P, x + 1, P.base - j, C('#9a9a9a')); } } light(P, x, P.base - hh + 1, C('#ff3a30')); light(P, x, P.base - Math.round(hh / 2), C('#ff3a30')); break; }
    case 'palm': palm(P, x, a.h); break;
  }
}
function palm(P: Paint, x: number, h: number): void {
  const lean = noise(x, 9, P.seed) < 0.5 ? 1 : -1, tr = C('#7a6040');
  for (let j = 0; j < h; j++) put(P, x + Math.round((j * j * lean) / (h * h * 1.6)), P.base - j, j % 3 ? tr : shade(tr, -0.2));
  const tx = x + Math.round(lean * 0.6), ty = P.base - h, g = C('#2e8a3a'), gd = C('#1e5a2a');
  for (const [dx, dy] of [[-5, 2], [5, 2], [-4, -1], [4, -1], [-1, -3], [2, -3]] as [number, number][]) for (let k = 1; k <= 4; k++) put(P, tx + Math.round((dx * k) / 4), ty + Math.round((dy * k) / 4 + (k * k) / 8), k > 2 ? gd : g);
}

/** Relevo: perfil + tons (encosta que olha para a esquerda iluminada), neve no cume quando cabe. */
function terrain(P: Paint, t: Ter27, e: SkyEnv27, s: number, amp = 1): void {
  const W = P.W, cx = t.x * W;
  const hAt = (x: number): number => {
    const dx = x - cx, fb = (noise(Math.floor(x / 3), 7, s) - 0.5) * 2;
    switch (t.k) {
      case 'roll': return t.h * amp * (0.55 + 0.25 * Math.sin(x / 23 + s) + 0.2 * Math.cos(x / 41 + s * 0.3)) + fb * 0.6;
      case 'ridge': { const a = Math.max(0, 1 - (dx / t.w) ** 2); if (a <= 0) return 0; const j = 0.55 + 0.22 * Math.sin(x / 9 + s) + 0.18 * Math.sin(x / 4.3 + s * 2) + 0.12 * Math.abs(Math.sin(x / 17 + s)); return t.h * amp * Math.pow(a, 0.5) * j + fb; }
      case 'cone': { const a = 1 - Math.abs(dx) / t.w; if (a <= 0) return 0; const hh = t.h * amp * Math.pow(a, 1.35); return Math.min(hh, t.h * amp * 0.94) + fb * 0.3; }
      case 'table': { const a = Math.abs(dx) / t.w; if (a >= 1.25) return 0; return a < 0.62 ? t.h * amp + fb * 0.4 : t.h * amp * Math.pow(Math.max(0, 1 - (a - 0.62) / 0.63), 0.7); }
      case 'loaf': { const a = Math.abs(dx) / t.w; return a >= 1 ? 0 : t.h * amp * Math.pow(1 - a ** 2.2, 0.42); }
      case 'dumps': { const a = Math.abs(dx) / t.w; return a >= 1 ? 0 : a < 0.6 ? t.h * amp : t.h * amp * (1 - (a - 0.6) / 0.4); }
    }
  };
  const green = e.snow ? C('#e6eef6') : e.climate === 'arid' ? C('#a89a68') : e.climate === 'tropical' ? C('#3a8a46') : e.season === 'autumn' ? C('#8a8a3a') : e.season === 'winter' ? C('#6a7a5a') : C('#4e8a44');
  const base = t.col ? C(t.col) : t.far ? (e.climate === 'arid' ? C('#9a8a78') : e.climate === 'tropical' ? C('#3e6a6a') : C('#5a6a86')) : green;
  const snowLine = t.snow === 'always' ? 0.62 : t.snow === 'winter' && (e.season === 'winter' || e.snow) ? 0.5 : e.snow && t.far ? 0.4 : 2;
  for (let x = 0; x < W; x++) {
    const h = Math.round(hAt(x));
    if (h < 1) continue;
    const sl = hAt(x + 1.5) - hAt(x - 1.5);
    for (let j = 0; j < h; j++) {
      let c = sl > 0.35 ? tn(base, 4) : sl < -0.35 ? tn(base, 2) : base;
      if (j >= h - 1) c = tn(c, 4);
      if (j > h * snowLine && j >= h - Math.max(2, Math.round((h * (1 - snowLine)) * (0.7 + 0.3 * noise(x, 2, s))))) c = sl < -0.35 ? C('#c4d4ea') : C('#f6faff');
      else if (!t.far && dith(x, j, 0.16)) c = shade(c, -0.07);
      else if (!t.far && t.k !== 'dumps' && noise(x, j, s + 5) < 0.06) c = shade(c, -0.16); // copas e pedras
      put(P, x, P.base - j, c);
    }
  }
}

/** Nuvens de pixel: cúmulos de 3–6 bolhas com base reta (luz no alto à esquerda); garoa = camadas de estrato. */
function clouds(P: Paint, c: SkyCols27, e: SkyEnv27, s: number): void {
  const W = P.W, H = P.H, mark = (x: number, y: number, col: Col) => { if (x < 0 || y < 0 || x >= W || y >= H) return; P.p.d[y * W + x] = col | 0xff000000; P.occ[y * W + x] = 1; };
  if (c.overcast) {
    // teto contínuo com base em festões (bolhas), e bancos soltos mais baixos (luz por cima, sombra só na base)
    const scal = (x: number, L: number, p0: number) => { const p = p0 + Math.floor(noise(Math.floor(x / p0), L, s) * 4), t = ((x % p) / p) * 2 - 1; return Math.sqrt(Math.max(0, 1 - t * t)); };
    const yb0 = Math.round(H * 0.2);
    for (let x = 0; x < W; x++) {
      const edge = yb0 + Math.round(scal(x, 1, 9) * 3);
      for (let y = 0; y <= edge; y++) mark(x, y, y === edge ? c.cloudSh : y >= edge - 2 && dith(x, y, 0.5) ? mix(c.cloud, c.cloudSh, 0.5) : c.cloud);
    }
    const nb = Math.max(2, Math.round(W / 80));
    for (let i = 0; i < nb; i++) {
      const cx = (i + 0.15 + noise(i, 51, s) * 0.7) * (W / nb), hw = 22 + noise(i, 52, s) * 22, yb = Math.round(H * (0.36 + noise(i, 53, s) * 0.16));
      for (let x = Math.round(cx - hw); x <= cx + hw; x++) {
        const t = (x - cx) / hw, th = Math.round(5 * Math.sqrt(Math.max(0, 1 - t * t)) + scal(x + 40, 2, 7) * 2);
        if (th < 1) continue;
        for (let y = yb - th; y <= yb; y++) mark(x, y, y === yb - th ? shade(c.cloud, 0.12) : y >= yb - 1 ? c.cloudSh : mix(c.cloud, c.cloudSh, 0.25));
      }
    }
    return;
  }
  const n = e.climate === 'arid' ? 1 : Math.max(2, Math.round(W / (e.climate === 'tropical' ? 70 : 90)));
  for (let i = 0; i < n; i++) {
    const cx = Math.round((i + 0.2 + noise(i, 61, s) * 0.6) * (W / n)), far = noise(i, 62, s);
    const cy = Math.round(H * (0.14 + far * 0.4)), sz = Math.round((e.climate === 'arid' ? 5 : 7) + (1 - far) * 6);
    const blobs: [number, number, number][] = [];
    const nb = 3 + Math.floor(noise(i, 63, s) * 3);
    for (let b = 0; b < nb; b++) { const t = nb === 1 ? 0 : b / (nb - 1) - 0.5; blobs.push([cx + t * sz * 2.1, cy - (1 - Math.abs(t) * 1.6) * sz * 0.45, sz * (0.55 + 0.35 * (1 - Math.abs(t) * 1.5)) + noise(b, i, s) * 2]); }
    const bot = cy + Math.round(sz * 0.18);
    const inC = (x: number, y: number) => y <= bot && blobs.some(([bx, by, r]) => ((x - bx) / r) ** 2 + ((y - by) / (r * 0.78)) ** 2 <= 1);
    const air = 0.15 + far * 0.35;
    for (let y = Math.round(cy - sz * 1.4); y <= bot; y++) for (let x = Math.round(cx - sz * 2.4); x <= cx + sz * 2.4; x++) {
      if (!inC(x, y)) continue;
      const hi = !inC(x - 1, y - 1) && !inC(x, y - 2), lo = y >= bot - 1 || !inC(x + 1, y + 2);
      let col = lo ? c.cloudSh : hi ? C('#ffffff') : c.cloud;
      if (!lo && !hi && dith(x, y, 0.12)) col = mix(c.cloud, c.cloudSh, 0.3);
      mark(x, y, mix(col, skyAt(c, H, x, y), air));
    }
  }
}

export interface SkyOpts27 { W: number; H: number; env: SkyEnv27; look: SkyLook27; seed: number; /** x (px) dos marcos altos na frente: as assinaturas desviam deles */ avoid?: number[] }
/** Posição final de uma assinatura: desvia dos marcos altos desenhados na frente (até ±40 px). */
export function sigX27(fx: number, W: number, avoid: number[] = []): number {
  const x0 = Math.round(fx * W), free = (x: number) => avoid.every((a) => Math.abs(a - x) >= 16);
  for (let d = 0; d <= 40; d += 4) for (const x of [x0 + d, x0 - d]) if (x > 8 && x < W - 8 && free(x)) return x;
  return x0;
}
/** Pinta céu + horizonte numa faixa nova W × H (cor, luzes). */
export function renderSky27(o: SkyOpts27): { p: Px; g: Px } {
  const { W, H, env: e, look, seed } = o, av = o.avoid ?? [];
  const p = new Px(W, H), g = new Px(W, H), occ = new Uint8Array(W * H);
  const cols = skyCols27(e), y = e.year;
  for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) p.d[yy * W + x] = skyAt(cols, H, x, yy) | 0xff000000;
  const s = (seed * 131 + hashS(e.city)) % 99991;
  const P: Paint = { p, g, W, H, year: y, seed: s, k: 0, haze: mix(cols.bot, C('#b4a4cc'), 0.24) /* violeta de distância */, occ, lit: y < 1920 ? 0.22 : y < 1950 ? 0.34 : 0.42, win: WIN, snow: e.snow, base: H - 1, layer: 0 };
  clouds(P, cols, e, s);
  const plan = skyPlan27(e.city, y, W, seed, look, e.lat);
  const wallPal = look.wall.map((h) => C(h));
  const rainK = e.rain || e.snow ? 0.1 : 0;
  // serras distantes
  P.layer = 0;
  for (const t of plan.terr) if (t.far) { P.k = 0.5 + rainK; terrain(P, t, e, s); }
  // relevo genérico de baía (morros do Rio, encostas verdes) atrás da água
  const wH = plan.water;
  P.base = H - 1 - wH;
  if (look.sea && look.hillAmp > 0) bayHills(P, look, e, s);
  // horizonte distante
  P.k = 0.5 + rainK; P.layer = 0;
  for (const b of plan.blds) if (b.layer === 0) building(P, b, wallPal);
  for (const a of plan.acc) if (a.layer === 0) accent(P, a, y);
  P.k = 0.36 + rainK;
  for (const g0 of plan.sigs) if (g0.layer === 0) g0.d(P, sigX27(g0.x, W, av));
  // morros perto (sem água: no chão; com água: na outra margem)
  for (const t of plan.terr) if (!t.far) { P.k = 0.22 + rainK; terrain(P, t, e, s, t.k === 'roll' ? 1 : 1); }
  // horizonte médio + assinaturas
  P.k = 0.3 + rainK; P.layer = 1;
  for (const b of plan.blds) if (b.layer === 1) building(P, b, wallPal);
  for (const a of plan.acc) if (a.layer === 1) accent(P, a, y);
  P.k = 0.22 + rainK;
  for (const g1 of plan.sigs) if (g1.layer === 1) g1.d(P, sigX27(g1.x, W, av));
  // água (na frente da outra margem)
  if (wH) water(P, e, wH, cols);
  P.base = H - 1;
  // casario perto + linha de árvores/palmeiras
  P.k = 0.14 + rainK * 0.6; P.layer = 2;
  for (const b of plan.blds) if (b.layer === 2) building(P, b, wallPal);
  for (const g2 of plan.sigs) if (g2.layer === 2) g2.d(P, sigX27(g2.x, W, av));
  if (plan.trees) treeline(P, e, s, plan.palms);
  else if (plan.palms) { P.base = H - 1 - Math.max(0, wH - 2); for (let i = 0; i < W / 40; i++) palm(P, Math.round((i + noise(i, 71, s)) * 40), 7 + Math.round(noise(i, 72, s) * 4)); P.base = H - 1; }
  // estrelas e lua (só luz: aparecem à noite, nunca atrás de prédio ou nuvem)
  if (!cols.overcast) {
    for (let yy = 0; yy < H * 0.7; yy++) for (let x = 0; x < W; x++) if (!occ[yy * W + x] && noise(x, yy, s + 99) < 0.006) g.d[yy * W + x] = withAlpha(noise(x, yy, 3) < 0.3 ? C('#ffe8c0') : C('#dfe8ff'), 120 + Math.round(noise(yy, x, 4) * 120));
    const mx = Math.round(W * 0.84), my = 9;
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const d = i * i + j * j, cut = (i + 1.6) ** 2 + (j - 1) ** 2; if (d <= 9.5 && cut > 7 && !occ[(my + j) * W + mx + i]) g.d[(my + j) * W + mx + i] = withAlpha(C('#fff6dc'), 240); }
  }
  return { p, g };
}

/** Morros da baía (Rio: sinos com costão de pedra e favela nas encostas; outras: encosta verde). */
function bayHills(P: Paint, look: SkyLook27, e: SkyEnv27, s: number): void {
  const W = P.W, amp = look.hillAmp;
  const HILLS: [number, number, number][] = [[0.07, 48, 30], [0.24, 30, 24], [0.81, 40, 26], [0.97, 54, 24]];
  const hAt = (x: number) => Math.max(0, ...HILLS.map(([c, hh, w]) => hh * amp * Math.exp(-(((x - c * W) / w) ** 2) * 1.6))) + (amp > 0 ? (noise(x >> 2, 1, s) - 0.5) * 1.6 : 0);
  const roofs = [C('#c8603c'), C('#e8c070'), C('#f0ece0'), C('#d88a6a'), C('#b8b0a0')];
  P.k = 0.2 + (e.rain ? 0.1 : 0); P.layer = 1;
  const g0 = e.climate === 'tropical' ? C('#3e8c46') : C('#4e8a44');
  for (let x = 0; x < W; x++) {
    const hh = Math.round(hAt(x));
    if (hh < 2) continue;
    const slope = hAt(x + 2) - hAt(x - 2);
    for (let j = 0; j < hh; j++) {
      let c = slope > 0 ? g0 : shade(g0, -0.22);
      if (j >= hh - 1) c = shade(c, 0.16);
      else if (Math.abs(slope) > 3.2 && j > hh * 0.45 && noise(x, j, s + 5) < 0.6) c = slope > 0 ? C('#8e8a7e') : C('#6e6a62');
      else if (noise(x >> 1, j >> 1, s + 3) < 0.18) c = shade(c, -0.12); // copas
      if (look.favela && j < hh * 0.5 && hh > 9 && Math.abs(slope) < 3) { // casinhas em degraus (blocos de 3×2, não confete)
        const row = Math.floor(j / 3), col = Math.floor((x + row * 2) / 4);
        if (noise(col, row, s + 9) < 0.62 && (x + row * 2) % 4 !== 3) {
          const rc = roofs[Math.floor(noise(col, row, s + 1) * roofs.length)];
          c = j % 3 === 2 ? shade(rc, 0.1) : j % 3 === 0 ? shade(rc, -0.25) : rc;
          if (j % 3 === 1 && (x + row * 2) % 4 === 1 && noise(col, row, s + 2) < 0.5) light(P, x, P.base - j, WIN);
        }
      }
      put(P, x, P.base - j, c);
    }
  }
}

/** Água: mais clara ao longe (reflete o céu), traços de brilho de 2 px; à noite, reflexos quentes. */
function water(P: Paint, e: SkyEnv27, wH: number, c: SkyCols27): void {
  const W = P.W, H = P.H;
  const deep = e.rain ? C('#3a6a8e') : e.climate === 'tropical' ? C('#2a86c4') : C('#2e78b4');
  const k0 = P.k; P.k = 0; P.layer = 2;
  for (let j = 0; j < wH; j++) {
    const y = H - wH + j, t = j / Math.max(1, wH - 1);
    for (let x = 0; x < W; x++) {
      let col = mix(mix(deep, c.bot, 0.42), deep, t);
      if (j === 0) col = mix(c.bot, deep, 0.25);
      else if ((Math.floor(x / 2) * 7 + j * 13 + (x >> 4)) % 29 === 0) col = shade(col, 0.3);
      P.p.d[y * W + x] = col | 0xff000000; P.occ[y * W + x] = 2;
      if (j > 0 && noise(x >> 1, j, P.seed + 17) < 0.05 * P.lit) P.g.d[y * W + x] = withAlpha(WIN, 150);
    }
  }
  P.k = k0;
}

/** Linha de árvores no pé do horizonte (copas em 3 tons; palmeiras no trópico; galhos nus no inverno frio). */
function treeline(P: Paint, e: SkyEnv27, s: number, palms: boolean): void {
  const W = P.W;
  const bare = e.season === 'winter' && (e.climate === 'cold' || e.climate === 'mild');
  const base = e.snow ? C('#5a6a5a') : e.climate === 'arid' ? C('#7a8a48') : e.climate === 'tropical' ? C('#2a7a36') : e.season === 'autumn' ? C('#b0782a') : bare ? C('#6a5a4a') : C('#3a7a3a');
  for (let x = 0; x < W; x++) {
    const cl = Math.floor(x / 6), r = noise(cl, 81, s);
    if (e.climate === 'arid' && r < 0.55) continue;
    if (r < 0.15) continue;
    const dx = (x % 6) - 2.5, hh = Math.max(0, Math.round((2 + r * 3) * Math.sqrt(Math.max(0, 1 - (dx / 3.6) ** 2))));
    for (let j = 0; j < hh; j++) {
      let c = j === hh - 1 ? shade(base, 0.18) : dx > 1 ? shade(base, -0.2) : base;
      if (bare && (x + j) % 2) continue;
      if (e.snow && j === hh - 1) c = C('#f0f6fc');
      put(P, x, P.base - j, c);
    }
  }
  if (palms) for (let i = 0; i < W / 34; i++) palm(P, Math.round((i + noise(i, 73, s)) * 34), 8 + Math.round(noise(i, 74, s) * 6));
}

// ---------------------------------------------------------------- cache e entrada (campus18px)

const CACHE27 = new Map<string, { p: Px; g: Px }>();
/** Pinta céu e horizonte nas linhas [0, H) de `p` e `gl` (mesma largura). Cacheado por cidade/ano/tamanho/tempo. */
export function paintSky27(p: Px, gl: Px, H: number, env: SkyEnv27, look: SkyLook27, seed: number, avoid: number[] = []): void {
  const W = p.w;
  const key = `${env.city}|${env.year}|${env.climate}|${env.season}|${env.snow ? 1 : 0}${env.rain ? 1 : 0}|${W}x${H}|${seed}|${look.sea ? 1 : 0}${look.favela ? 1 : 0}${look.hillAmp}|${avoid.map(Math.round).join(',')}`;
  let hit = CACHE27.get(key);
  if (!hit) {
    hit = renderSky27({ W, H, env, look, seed, avoid });
    CACHE27.set(key, hit);
    if (CACHE27.size > 10) CACHE27.delete(CACHE27.keys().next().value!);
  }
  p.d.set(hit.p.d.subarray(0, W * H), 0);
  if (gl.w === W) gl.d.set(hit.g.d.subarray(0, W * H), 0);
}

/** Céu do entardecer/amanhecer (ciclo do mapa): brilho laranja no horizonte, lilás no alto. */
export function dusk27(ctx: CanvasRenderingContext2D, W: number, H: number, night: number): void {
  const f = Math.max(0, 1 - Math.abs(night - 0.32) / 0.26);
  if (f <= 0.01) return;
  const g = ctx.createLinearGradient(0, 0, 0, H + 14);
  g.addColorStop(0, `rgba(110,70,150,${(0.16 * f).toFixed(3)})`);
  g.addColorStop(0.7, `rgba(255,130,70,${(0.22 * f).toFixed(3)})`);
  g.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H + 14);
}

// ---------------------------------------------------------------- assinaturas por cidade (prédios-ícone do horizonte)

const G = (id: string, from: number, x: number, layer: 0 | 1 | 2, d: SigDraw, to?: number): Sig27 => ({ id, from, to, x, layer, d });
const WH = C('#f2eee4'), SILV = C('#d0d6dc');

const SIGS27: Record<string, Sig27[]> = {
  new_york: [
    G('ny_woolworth', 1913, 0.24, 1, (P, x) => { block(P, x - 5, 0, 11, 26, 'stone', C('#d8d0bc')); block(P, x - 3, 26, 7, 12, 'stone', C('#dcd4c0')); tri(P, x - 3, x + 3, 38, 7, C('#6aa890'), C('#4a8870')); mastAt(P, x, 45, 3, C('#c8a040'), false); }),
    G('ny_chrysler', 1930, 0.62, 1, (P, x) => { block(P, x - 4, 0, 9, 34, 'deco', C('#cfc8b6')); block(P, x - 3, 34, 7, 6, 'deco', C('#d4ccb8')); for (let k = 0; k < 5; k++) { const w = 7 - k * 1.3; R(P, Math.round(x - w / 2), 40 + k * 3, Math.max(1, Math.round(w)), 3, (i, j) => (j === 2 && i % 2 === 0 ? C('#2a2e38') : i >= w - 1.5 ? C('#a8b0b8') : SILV)); if (P.year >= 1981) light(P, x, P.base - 41 - k * 3, WINC); } mastAt(P, x, 55, 7, SILV, false); }),
    G('ny_citicorp', 1977, 0.74, 1, (P, x) => { block(P, x - 4, 0, 9, 44, 'modern', C('#dcdcd8')); tri(P, x - 4, x + 4, 44, 8, C('#e8e8e4'), undefined, x - 4); }),
    G('ny_onewtc', 2014, 0.16, 0, (P, x) => { for (let j = 0; j < 58; j++) { const w = Math.round(8 - (j / 58) * 4); for (let i = 0; i < w; i++) put(P, x - Math.floor(w / 2) + i, P.base - j, i < w / 2 ? ((i + j) % 9 < 2 ? C('#a8c8e8') : C('#6a98c8')) : C('#4a78a8')); } mastAt(P, x, 58, 12, C('#e0e4e8')); }),
    G('ny_432', 2015, 0.47, 0, (P, x) => block(P, x - 1, 0, 4, 60, 'concrete', C('#e8e6e0'))),
  ],
  london: [
    G('lon_stpauls', 1711, 0.36, 1, (P, x) => { block(P, x - 10, 0, 21, 9, 'stone', C('#d8d0bc')); for (const dx of [-10, 8]) { block(P, x + dx, 9, 3, 6, 'stone', C('#d8d0bc')); tri(P, x + dx, x + dx + 2, 15, 3, ROOF.lead); } R(P, x - 4, 9, 9, 5, (i) => (i % 2 ? C('#c8c0ac') : C('#e0d8c4'))); domeAt(P, x + 0.5, 14, 5.5, 6, C('#7a8494')); R(P, x, 20, 1, 4, C('#d8d0bc')); put(P, x, P.base - 24, ROOF.gold); light(P, x, P.base - 12, WIN); }),
    G('lon_battersea', 1935, 0.84, 1, (P, x) => { block(P, x - 11, 0, 23, 12, 'brick', C('#9a5a40')); const ch = P.year >= 1955 ? [-11, -8, 8, 11] : [8, 11]; for (const dx of ch) { R(P, x + dx - 1, 12, 2, 13, (i, j) => (j > 10 ? C('#5a5a60') : i ? C('#d8d4cc') : C('#f2eee4'))); } }),
    G('lon_natwest', 1980, 0.53, 0, (P, x) => { block(P, x - 3, 0, 7, 40, 'dark', C('#4a4e58')); R(P, x - 3, 40, 7, 1, C('#6a6e78')); }),
    G('lon_canary', 1991, 0.94, 0, (P, x) => { block(P, x - 3, 0, 7, 42, 'concrete', C('#b8c0c8')); tri(P, x - 3, x + 3, 42, 4, C('#d0d8e0'), C('#a0a8b0')); light(P, x, P.base - 45, C('#ffffff')); }),
    G('lon_gherkin', 2004, 0.62, 0, (P, x) => { for (let j = 0; j < 34; j++) { const t = j / 34, w = Math.max(1, Math.round(6.5 * Math.sin(Math.PI * (0.18 + t * 0.82)) ** 0.7)); for (let i = 0; i < w; i++) put(P, x - Math.floor(w / 2) + i, P.base - j, (i + j) % 4 === 0 ? C('#3a5a6a') : i >= w / 2 ? C('#4a6e80') : C('#6a92a6')); } }),
    G('lon_shard', 2012, 0.46, 0, (P, x) => { for (let j = 0; j < 62; j++) { const w = Math.max(1, Math.round(11 * (1 - j / 64))); for (let i = 0; i < w; i++) put(P, x - Math.floor(w / 2) + i, P.base - j, i < w * 0.45 ? ((j + i * 3) % 11 < 2 ? C('#e0eaf2') : C('#b4c8d8')) : C('#8aa0b4')); } light(P, x, P.base - 60, WINC); light(P, x, P.base - 56, WINC); }),
    G('lon_walkie', 2014, 0.57, 0, (P, x) => { for (let j = 0; j < 32; j++) { const w = Math.round(6 + (j / 32) ** 1.5 * 4); for (let i = 0; i < w; i++) put(P, x - 3 + i, P.base - j, i >= w - 2 ? C('#5a7088') : (i + j) % 5 === 0 ? C('#9ab4c8') : C('#7a94ac')); } }),
  ],
  paris: [
    G('par_notre', 1345, 0.66, 1, (P, x) => { block(P, x - 8, 0, 17, 10, 'stone', C('#c8bca0')); tri(P, x - 2, x + 8, 10, 4, ROOF.lead); for (const dx of [-8, -4]) block(P, x + dx, 0, 3, 17, 'stone', C('#cfc3a6')); const y = P.year; if (y < 1786 || (y >= 1859 && y < 2019) || y >= 2024) R(P, x + 3, 10, 1, 13, C('#5a6070')); }),
    G('par_invalides', 1706, 0.46, 1, (P, x) => { block(P, x - 6, 0, 13, 9, 'stone', C('#d8ccae')); R(P, x - 3, 9, 7, 4, C('#d0c4a6')); domeAt(P, x + 0.5, 13, 4, 6, C('#c8a848')); R(P, x, 19, 1, 6, ROOF.gold); }),
    G('par_montparnasse', 1973, 0.8, 0, (P, x) => block(P, x - 3, 0, 8, 40, 'dark', C('#3e3e46'))),
    G('par_defense', 1966, 0.94, 0, (P, x) => { const y = P.year; const towers: [number, number, number, Mat27][] = [[-10, 22, 5, 'concrete']]; if (y >= 1974) towers.push([-4, 34, 5, 'bronze'], [8, 30, 4, 'dark']); if (y >= 1985) towers.push([2, 40, 5, 'blue']); if (y >= 2001) towers.push([-14, 44, 4, 'blue']); if (y >= 2011) towers.push([13, 50, 4, 'teal']); for (const [dx, h, w, m] of towers) block(P, x + dx, 0, w, h, m, C(MATC27[m])); if (y >= 1989) { R(P, x - 22, 0, 9, 9, (i, j) => (i > 1 && i < 7 && j < 7 ? 0 as Col : WH)); } }),
  ],
  berlin: [
    G('ber_siegess', 1873, 0.26, 1, (P, x) => { block(P, x - 3, 0, 7, 4, 'stone', C('#c8bca4')); R(P, x - 1, 4, 3, 20, (i) => (i === 2 ? C('#b09a78') : C('#c8b490'))); R(P, x - 1, 24, 3, 3, ROOF.gold); put(P, x - 2, P.base - 26, ROOF.gold); put(P, x + 2, P.base - 26, ROOF.gold); }),
    G('ber_reichstag', 1894, 0.5, 1, (P, x) => { block(P, x - 11, 0, 23, 10, 'stone', C('#c4b89c')); for (const dx of [-11, 9]) block(P, x + dx, 0, 3, 13, 'stone', C('#c8bca0')); const y = P.year; if (y < 1945) { domeAt(P, x + 0.5, 10, 5, 5, C('#6a8a80')); R(P, x, 15, 1, 3, ROOF.gold); } else if (y >= 1999) { for (let j = 0; j < 6; j++) { const w = Math.round(5 * Math.sqrt(1 - (j / 6) ** 2)); for (let i = -w; i < w; i++) { put(P, x + i, P.base - 10 - j, (i + j) % 2 ? C('#c8dcec') : C('#9ab8d0')); if ((i + j) % 3 === 0) light(P, x + i, P.base - 10 - j, WINC); } } } }),
    G('ber_kwgc', 1895, 0.72, 1, (P, x) => { const y = P.year; block(P, x - 5, 0, 9, 12, 'stone', C('#a89a88')); if (y < 1943) { block(P, x - 2, 12, 4, 14, 'stone', C('#a89a88')); tri(P, x - 2, x + 1, 26, 12, C('#5a6070')); } else { for (let i = 0; i < 4; i++) R(P, x - 2 + i, 12, 1, 9 + [3, 1, 4, 0][i], C('#8a7c6c')); } if (y >= 1961) { block(P, x + 6, 0, 4, 18, 'panel', C('#3a5a9a')); for (let j = 2; j < 17; j += 2) light(P, x + 7, P.base - j, C('#5a8aff')); } }),
    G('ber_rathaus', 1869, 0.4, 1, (P, x) => { block(P, x - 7, 0, 15, 9, 'brick', C('#a85a40')); block(P, x - 2, 9, 5, 14, 'brick', C('#a85a40')); R(P, x - 2, 23, 5, 1, C('#7a3a2a')); R(P, x, 24, 1, 3, C('#3a3a3a')); }),
    G('ber_potsdamer', 1998, 0.88, 0, (P, x) => { block(P, x - 8, 0, 5, 36, 'dark', C('#3e4048')); block(P, x - 2, 0, 5, 38, 'brick', C('#6a3a2e')); block(P, x + 4, 0, 6, 32, 'blue', C('#5a88b0')); }),
  ],
  tokyo: [
    G('tok_tmgb', 1991, 0.26, 0, (P, x) => { block(P, x - 9, 0, 19, 30, 'concrete', C('#b8b4ac')); for (const dx of [-8, 3]) { block(P, x + dx, 30, 6, 16, 'concrete', C('#c0bcb4')); R(P, x + dx + 1, 46, 4, 2, C('#9a968e')); } }),
    G('tok_docomo', 2000, 0.5, 0, (P, x) => { block(P, x - 3, 0, 7, 46, 'concrete', C('#b0aca4')); tri(P, x - 3, x + 3, 46, 6, C('#8a8a90')); mastAt(P, x, 52, 7, C('#c8ccd0')); put(P, x, P.base - 40, WH); }),
    G('tok_roppongi', 2003, 0.64, 0, (P, x) => block(P, x - 4, 0, 9, 44, 'dark', C('#4a4e58'))),
    G('tok_wako', 1932, 0.44, 1, (P, x) => { block(P, x - 5, 0, 11, 9, 'stone', C('#d0c4a8')); R(P, x - 2, 9, 5, 5, C('#d0c4a8')); put(P, x, P.base - 11, WH); domeAt(P, x + 0.5, 14, 2.5, 3, C('#8a9a98')); }),
  ],
  chicago: [
    G('chi_wrigley', 1924, 0.4, 1, (P, x) => { block(P, x - 4, 0, 9, 24, 'stone', C('#f0ece2')); block(P, x - 1, 24, 3, 8, 'stone', C('#f0ece2')); put(P, x, P.base - 27, C('#2a2a30')); light(P, x, P.base - 27, WIN); domeAt(P, x + 0.5, 32, 1.5, 3, C('#c8b890')); }),
    G('chi_tribune', 1925, 0.48, 1, (P, x) => { block(P, x - 3, 0, 7, 28, 'stone', C('#d0c8b0')); for (let i = 0; i < 7; i += 2) R(P, x - 3 + i, 28, 1, 4 + (i === 2 || i === 4 ? 2 : 0), C('#c4bca4')); R(P, x - 1, 30, 3, 3, C('#c4bca4')); }),
    G('chi_marina', 1964, 0.58, 1, (P, x) => { for (const dx of [-6, 1]) for (let j = 0; j < 30; j++) for (let i = 0; i < 5; i++) put(P, x + dx + i, P.base - j, j % 2 ? (i === 0 || i === 4 ? C('#a8a49c') : C('#e8e4dc')) : C('#7a7670')); }),
    G('chi_hancock', 1969, 0.68, 0, (P, x) => { for (let j = 0; j < 50; j++) { const w = Math.round(9 - (j / 50) * 3.5); for (let i = 0; i < w; i++) { const xx = i - (w - 1) / 2, xb = ((j % 16) / 16) * w - w / 2; put(P, x + Math.round(xx), P.base - j, Math.abs(xx - xb) < 0.6 || Math.abs(xx + xb) < 0.6 ? C('#5a5e66') : C('#2e3038')); } } for (const dx of [-1, 1]) mastAt(P, x + dx, 50, 10, C('#e0e0e0')); }),
    G('chi_aon', 1973, 0.8, 0, (P, x) => block(P, x - 3, 0, 7, 50, 'modern', C('#ecebe6'))),
    G('chi_trump', 2009, 0.34, 0, (P, x) => { block(P, x - 3, 0, 7, 40, 'blue', C('#8ab0cc')); block(P, x - 2, 40, 5, 8, 'blue', C('#8ab0cc')); block(P, x - 1, 48, 3, 4, 'blue', C('#8ab0cc')); mastAt(P, x, 52, 8, C('#c8ccd0')); }),
  ],
  los_angeles: [
    G('la_cityhall', 1928, 0.5, 1, (P, x) => { block(P, x - 7, 0, 15, 10, 'stone', C('#ece6d6')); block(P, x - 3, 10, 7, 18, 'stone', C('#f0eadc')); tri(P, x - 3, x + 3, 28, 7, C('#e0d8c4'), C('#c4bca8')); mastAt(P, x, 35, 3, C('#c8a040'), false); light(P, x, P.base - 33, C('#ff3a30')); }),
    G('la_usbank', 1989, 0.58, 0, (P, x) => { block(P, x - 4, 0, 9, 48, 'concrete', C('#c4bca8')); block(P, x - 3, 48, 7, 3, 'blue', C('#6a8ab0')); block(P, x - 2, 51, 5, 2, 'blue', C('#6a8ab0')); light(P, x, P.base - 52, WINC); }),
  ],
  nashville: [
    G('nash_capitol', 1859, 0.26, 1, (P, x) => { for (let i = -18; i <= 18; i++) R(P, x + i, 0, 1, Math.round(5 * Math.cos((i / 18) * Math.PI / 2)), i < 0 ? C('#4e8a44') : C('#3e7a3a')); block(P, x - 7, 4, 15, 7, 'stone', C('#e0d8c4')); for (let i = -6; i <= 6; i += 2) R(P, x + i, 5, 1, 5, C('#a89e8a')); tri(P, x - 7, x + 7, 11, 3, C('#e8e0cc')); block(P, x - 1, 13, 3, 6, 'stone', C('#e8e0cc')); domeAt(P, x + 0.5, 19, 1.5, 2, C('#e8e0cc')); }),
    G('nash_lc', 1957, 0.52, 1, (P, x) => { block(P, x - 3, 0, 7, 24, 'modern', C('#d8d6cc')); R(P, x - 2, 24, 5, 2, C('#7a7a80')); }),
  ],
  memphis: [
    G('mem_lincoln', 1924, 0.36, 1, (P, x) => { block(P, x - 3, 0, 6, 20, 'stone', C('#dcd2bc')); tri(P, x - 3, x + 2, 20, 5, C('#6aa890')); }),
    G('mem_sterick', 1930, 0.46, 1, (P, x) => { block(P, x - 4, 0, 9, 22, 'stone', C('#ece6d6')); block(P, x - 3, 22, 7, 5, 'stone', C('#ece6d6')); tri(P, x - 3, x + 3, 27, 5, C('#5a7a7a'), C('#4a6a6a')); }),
    G('mem_100main', 1965, 0.55, 1, (P, x) => { block(P, x - 3, 0, 7, 26, 'modern', C('#d8d4c8')); domeAt(P, x + 0.5, 26, 4, 2, C('#a8a8a0')); }),
  ],
  detroit: [
    G('det_penobscot', 1928, 0.44, 1, (P, x) => { block(P, x - 5, 0, 11, 24, 'deco', C('#cfc2a8')); block(P, x - 4, 24, 9, 6, 'deco', C('#d4c8ae')); block(P, x - 3, 30, 7, 4, 'deco', C('#d8ccb2')); block(P, x - 1, 34, 3, 3, 'deco', C('#d8ccb2')); R(P, x, 37, 1, 3, C('#9a9a9a')); put(P, x, P.base - 40, C('#e83a2a')); light(P, x, P.base - 40, C('#ff4a3a')); light(P, x - 1, P.base - 40, C('#ff4a3a')); }),
    G('det_fisher', 1928, 0.22, 0, (P, x) => { block(P, x - 3, 0, 7, 26, 'stone', C('#d8cdb4')); tri(P, x - 3, x + 3, 26, 6, C('#c8a848'), C('#a08838')); light(P, x, P.base - 28, ROOF.gold); }),
    G('det_guardian', 1929, 0.53, 1, (P, x) => { block(P, x - 3, 0, 7, 30, 'brick', C('#c86a3a')); for (const dx of [-3, 2]) { block(P, x + dx, 30, 2, 4, 'brick', C('#c86a3a')); put(P, x + dx, P.base - 34, C('#c8a040')); } }),
  ],
  sao_paulo: [
    G('sp_martinelli', 1929, 0.4, 1, (P, x) => { block(P, x - 5, 0, 11, 22, 'stucco', C('#e0b8a0')); block(P, x - 3, 22, 7, 4, 'stucco', C('#e0b8a0')); tri(P, x - 3, x + 3, 26, 2, C('#b85a3a')); }),
    G('sp_banespa', 1947, 0.5, 1, (P, x) => { block(P, x - 4, 0, 9, 24, 'deco', C('#d8ccb0')); block(P, x - 3, 24, 7, 6, 'deco', C('#d8ccb0')); block(P, x - 2, 30, 5, 4, 'deco', C('#d8ccb0')); mastAt(P, x, 34, 10, C('#c8ccd0')); }),
    G('sp_copan', 1966, 0.28, 1, (P, x) => { for (let i = 0; i < 24; i++) { const h = 24 + Math.round(Math.sin((i / 23) * Math.PI) * 2); for (let j = 0; j < h; j++) put(P, x - 12 + i, P.base - j, j % 2 ? C('#f2f0ea') : i > 18 ? C('#b8b4ac') : C('#d0ccc4')); } }),
    G('sp_antena1', 1970, 0.7, 0, (P, x) => accent(P, { x, k: 'tvmast', h: 46, layer: 0 }, P.year)),
    G('sp_antena2', 1978, 0.84, 0, (P, x) => accent(P, { x, k: 'tvmast', h: 40, layer: 0 }, P.year)),
  ],
  rio: [
    G('rio_anoite', 1929, 0.46, 1, (P, x) => { block(P, x - 3, 0, 7, 20, 'deco', C('#e0d6c0')); block(P, x - 2, 20, 5, 3, 'deco', C('#e0d6c0')); }),
  ],
  lagos: [
    G('lag_independence', 1963, 0.4, 1, (P, x) => { block(P, x - 4, 0, 9, 28, 'modern', C('#e4e2d8')); R(P, x - 4, 28, 9, 1, C('#8a8a88')); }),
    G('lag_necom', 1979, 0.55, 1, (P, x) => { block(P, x - 3, 0, 7, 34, 'concrete', C('#c8c4b8')); for (let j = 0; j < 12; j++) { put(P, x, P.base - 34 - j, Math.floor(j / 3) % 2 ? C('#e85a40') : C('#f0ece4')); if (j % 3 === 0) { put(P, x - 1, P.base - 34 - j, C('#9a9a9a')); put(P, x + 1, P.base - 34 - j, C('#9a9a9a')); } } light(P, x, P.base - 45, C('#ff3a30')); }),
  ],
  sydney: [
  ],
  liverpool: [
    G('liv_anglican', 1942, 0.72, 1, (P, x) => { block(P, x - 9, 0, 19, 12, 'stone', C('#b87a60')); block(P, x - 3, 0, 7, 30, 'stone', C('#b87a60')); for (const dx of [-3, 3]) put(P, x + dx, P.base - 30, C('#a86a50')); }),
    G('liv_beacon', 1969, 0.4, 0, (P, x) => { R(P, x, 0, 2, 30, C('#c8c4bc')); block(P, x - 2, 30, 6, 4, 'concrete', C('#9a968e')); mastAt(P, x, 34, 4, C('#c8ccd0')); }),
  ],
  manchester: [
    G('man_townhall', 1877, 0.42, 1, (P, x) => { block(P, x - 7, 0, 15, 10, 'stone', C('#c8b48c')); block(P, x - 1, 10, 4, 10, 'stone', C('#c8b48c')); tri(P, x - 1, x + 2, 20, 9, C('#5a6070')); }),
    G('man_cis', 1962, 0.6, 0, (P, x) => block(P, x - 3, 0, 6, 32, 'modern', C('#b8bcc4'))),
    G('man_beetham', 2006, 0.7, 0, (P, x) => { block(P, x - 2, 0, 5, 44, 'blue', C('#8aa4bc')); block(P, x - 3, 30, 1, 14, 'blue', C('#8aa4bc')); }),
  ],
  seattle: [
    G('sea_smith', 1914, 0.38, 1, (P, x) => { block(P, x - 2, 0, 5, 22, 'stone', C('#f0ece0')); tri(P, x - 2, x + 2, 22, 6, C('#e0dcd0'), C('#bcb8ae')); }),
    G('sea_columbia', 1985, 0.56, 0, (P, x) => { block(P, x - 4, 0, 9, 50, 'dark', C('#2e3238')); block(P, x - 3, 50, 7, 2, 'dark', C('#2e3238')); }),
  ],
  moscow: [
    G('mos_msu', 1953, 0.3, 0, stalin), G('mos_ukraina', 1957, 0.68, 1, stalin),
  ],
  dubai: [
    G('dxb_arab', 1999, 0.2, 1, (P, x) => { for (let j = 0; j < 30; j++) { const w = Math.round(8 * Math.sin(((30 - j) / 30) * Math.PI / 2) ** 0.8); R(P, x - 1, j, Math.max(1, w), 1, (i) => (i === 0 ? C('#9a9aa0') : i % 2 ? C('#f2f2f0') : C('#e2e2e0'))); } R(P, x - 2, 0, 1, 32, C('#b0b0b8')); }),
    G('dxb_khalifa', 2010, 0.56, 0, (P, x) => { for (let j = 0; j < 66; j++) { const w = Math.max(1, Math.round(9 * Math.pow(1 - j / 66, 1.4))); R(P, x - Math.floor(w / 2), j, w, 1, (i) => (i < w / 2 ? C('#c8d4e0') : C('#9aaabb'))); } light(P, x, P.base - 66, C('#ff3a30')); }),
  ],
  shanghai: [
    G('sh_pearl', 1994, 0.42, 0, (P, x) => { R(P, x - 1, 0, 3, 50, (i) => (i === 1 ? C('#d0ccc8') : C('#b0aca8'))); for (const [z, r] of [[14, 5], [36, 3.5], [50, 1.5]] as [number, number][]) { for (let j = -r; j <= r; j++) { const w = Math.sqrt(r * r - j * j); for (let i = -Math.round(w); i <= Math.round(w); i++) put(P, x + i, P.base - z - j, i < 0 ? C('#e878a8') : C('#c85888')); } light(P, x, P.base - z, C('#ff80c0')); } mastAt(P, x, 52, 8, C('#c8ccd0')); }),
    G('sh_jinmao', 1999, 0.54, 0, (P, x) => { let z = 0; for (let k = 0; k < 7; k++) { const w = 8 - k; block(P, x - Math.floor(w / 2), z, w, 7, 'blue', C('#7a8a9a')); z += 7; } mastAt(P, x, z, 6, C('#c8ccd0')); }),
    G('sh_swfc', 2008, 0.62, 0, (P, x) => { block(P, x - 4, 0, 9, 58, 'blue', C('#8aa8c4')); R(P, x - 2, 52, 5, 4, 0); for (let j = 52; j < 56; j++) for (let i = -2; i <= 2; i++) put(P, x + i, P.base - j, mix(C('#8aa8c4'), C('#d8ecfa'), 0.7)); }),
    G('sh_tower', 2015, 0.7, 0, (P, x) => { for (let j = 0; j < 64; j++) { const w = Math.max(2, Math.round(9 * (1 - j / 80))); R(P, x - Math.floor(w / 2) + (j % 20 < 10 ? 0 : 1) - 0.5, j, w, 1, (i) => (i < w / 2 ? C('#a8c4d4') : C('#7a98ac'))); } }),
  ],
  kuala_lumpur: [G('kl_petronas', 1998, 0.5, 0, (P, x) => { for (const dx of [-6, 3]) { for (let j = 0; j < 58; j++) { const w = j < 44 ? 4 : Math.max(1, Math.round(4 - (j - 44) / 4)); R(P, x + dx + Math.floor((4 - w) / 2), j, w, 1, (i) => (i < w / 2 ? C('#e0e4ea') : C('#a8b0bc'))); } mastAt(P, x + dx + 1, 58, 6, C('#e0e4ea')); } R(P, x - 2, 26, 5, 1, C('#c0c8d0')); })],
  taipei: [G('tpe_101', 2004, 0.5, 0, (P, x) => { block(P, x - 4, 0, 9, 16, 'teal', C('#5a9a98')); let z = 16; for (let k = 0; k < 8; k++) { for (let j = 0; j < 5; j++) { const w = 7 + Math.round(j / 2); R(P, x - Math.floor(w / 2), z + j, w, 1, (i) => (i < w / 2 ? C('#6aaaa8') : C('#4a8a88'))); } z += 5; } mastAt(P, x, z, 10, C('#c8ccd0')); })],
  seoul: [G('seo_63', 1985, 0.36, 0, (P, x) => { block(P, x - 3, 0, 7, 40, 'bronze', C('#c8a048')); tri(P, x - 3, x + 3, 40, 3, C('#c8a048'), undefined, x + 3); })],
  hong_kong: [G('hk_ifc', 2003, 0.36, 0, (P, x) => { block(P, x - 4, 0, 9, 50, 'blue', C('#9ab0c4')); block(P, x - 3, 50, 7, 4, 'blue', C('#9ab0c4')); for (let k = 0; k < 4; k++) put(P, x - 3 + k * 2, P.base - 55, C('#c8d4e0')); })],
  cape_town: [], kingston: [], toronto: [],
  mexico_city: [G('mx_angel', 1910, 0.62, 1, (P, x) => { block(P, x - 3, 0, 7, 4, 'stone', C('#d8ccb0')); R(P, x - 1, 4, 2, 20, C('#d8ccb0')); R(P, x - 1, 24, 3, 3, ROOF.gold); })],
  buenos_aires: [G('ba_barolo', 1923, 0.38, 1, (P, x) => { block(P, x - 4, 0, 9, 18, 'stone', C('#d8ccae')); block(P, x - 2, 18, 5, 6, 'stone', C('#d8ccae')); domeAt(P, x + 0.5, 24, 2.5, 3, C('#c8b890')); mastAt(P, x, 27, 4, C('#e0e0e0'), false); light(P, x, P.base - 30, WIN); })],
};
function stalin(P: Paint, x: number): void {
  const c = C('#d8ccb0');
  block(P, x - 9, 0, 19, 14, 'stone', c); block(P, x - 5, 14, 11, 12, 'stone', c); block(P, x - 3, 26, 7, 10, 'stone', c); block(P, x - 2, 36, 5, 4, 'stone', shade(c, 0.05));
  tri(P, x - 2, x + 2, 40, 6, c); R(P, x, 46, 1, 6, ROOF.gold); put(P, x, P.base - 52, C('#e83a2a')); light(P, x, P.base - 52, C('#ff4a3a'));
  for (const dx of [-9, 8]) { block(P, x + dx, 14, 2, 4, 'stone', c); tri(P, x + dx, x + dx + 1, 18, 3, c); }
}
