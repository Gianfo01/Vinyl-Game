// R31 · onda 4 (BASE-HITS) — formato dos atos de sucesso de 1992 até hoje (src/data/base31hits.ts).
// Cada entrada é um RealArtist (realtypes.ts) mais o hit documentado que justifica a entrada: música, ano, parada oficial
// e posição máxima. O hit também vira o primeiro item da discografia (`al`, single). Fonte: o verbete da Wikipedia em
// inglês (`w`, título; ausente = o próprio nome) + o arquivo oficial da parada (CHART31_SRC).
import type { RealArtist, RealMember, RealRelease, RealRole } from './realtypes';

/** Paradas aceitas (oficiais e grandes) e 'WW' (hit mundial documentado: várias paradas / certificação multi-platina). */
export type Chart31 = 'US' | 'UK' | 'DE' | 'FR' | 'AU' | 'CA' | 'NL' | 'SE' | 'ES' | 'JP' | 'KR' | 'MX' | 'AR' | 'WW'
  | 'AT' | 'CH' | 'BE' | 'IE' | 'NZ' | 'NO' | 'DK' | 'FI';

/** Arquivo oficial de cada parada (fonte do hit). */
export const CHART31_SRC: Record<Chart31, string> = {
  US: 'Billboard Hot 100 (billboard.com/charts/hot-100)',
  UK: 'UK Singles Chart (officialcharts.com)',
  DE: 'GfK Offizielle Deutsche Charts (offiziellecharts.de)',
  FR: 'SNEP Top Singles (snepmusique.com / lescharts.com)',
  AU: 'ARIA Singles Chart (aria.com.au / australian-charts.com)',
  CA: 'RPM / Canadian Hot 100 (Library and Archives Canada / billboard.com)',
  NL: 'Dutch Top 40 / Single Top 100 (top40.nl / dutchcharts.nl)',
  SE: 'Sverigetopplistan (sverigetopplistan.se / swedishcharts.com)',
  ES: 'PROMUSICAE / Los 40 (promusicae.es / spanishcharts.com)',
  JP: 'Oricon Singles Chart (oricon.co.jp)',
  KR: 'Gaon / Circle Digital Chart (circlechart.kr)',
  MX: 'Billboard México / AMPROFON (billboard.com)',
  AR: 'Billboard Argentina Hot 100 (billboard.com)',
  WW: 'IFPI / certificações multi-platina em vários países (Wikipedia: tabela de paradas do single)',
  AT: 'Ö3 Austria Top 40 (austriancharts.at)',
  CH: 'Schweizer Hitparade (hitparade.ch)',
  BE: 'Ultratop (ultratop.be)',
  IE: 'Irish Singles Chart (irishcharts.ie)',
  NZ: 'Official NZ Music Chart (nztop40.co.nz / charts.nz)',
  NO: 'VG-lista (vglista.no / norwegiancharts.com)',
  DK: 'Tracklisten (hitlisten.nu / danishcharts.dk)',
  FI: 'Suomen virallinen lista (ifpi.fi / finnishcharts.com)',
};

/** [música, ano, parada, posição máxima 1–10] */
export type Hit31 = [string, number, Chart31, number];

/** Entrada compacta: o carregador completa t (3), al (hit como single) e r (vocal para solo). */
export interface HitSrc31 {
  n: string; g: string; c: string; d: number; cn: string;
  h: Hit31;
  /** outros hits documentados (opcional) */
  h2?: Hit31[];
  e?: number; f?: number; rj?: [number, number?][]; b?: number; x?: number; r?: RealRole; m?: RealMember[];
  al?: RealRelease[]; t?: 1 | 2 | 3;
  /** título do verbete na Wikipedia (en) quando difere do nome */
  w?: string;
  /** 1 = cidade do jogo mais próxima (a de origem não existe no jogo) */
  ca?: 1;
  /** one-hit wonder (um único top 10 nas grandes paradas) */
  o?: 1;
  /** apelidos */
  nk?: string[];
  ap?: RealArtist['ap'];
  exact?: false;
  /** 1 = hit (música, ano, parada, posição) conferido por busca na web durante a curadoria desta rodada */
  v?: 1;
}

export const hitAct31 = (h: HitSrc31): RealArtist => {
  const solo = !h.m?.length;
  const al: RealRelease[] = [[h.h[0], h.h[1], 'single'], ...(h.h2 ?? []).map((x): RealRelease => [x[0], x[1], 'single']), ...(h.al ?? [])];
  const seen = new Set<string>();
  const a: RealArtist = {
    n: h.n, g: h.g, c: h.c, d: h.d, t: h.t ?? 3, cn: h.cn,
    al: al.filter((r) => { const k = r[0].toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 4),
  };
  if (h.f !== undefined) a.f = h.f;
  if (h.e !== undefined) a.e = h.e;
  if (h.rj) a.rj = h.rj;
  if (h.b !== undefined) a.b = h.b;
  if (h.x !== undefined) a.x = h.x;
  if (solo) a.r = h.r ?? 'vocal';
  if (!solo) a.m = h.m;
  if (h.ap) a.ap = h.ap;
  if (h.exact === false) a.exact = false;
  return a;
};

/** Fontes de uma entrada: verbete + arquivo da parada de cada hit. */
export const hitSources31 = (h: HitSrc31): string[] => [
  `https://en.wikipedia.org/wiki/${encodeURIComponent((h.w ?? h.n).replace(/ /g, '_'))}`,
  ...[...new Set([h.h, ...(h.h2 ?? [])].map((x) => CHART31_SRC[x[2]]))],
];
