// Peso mundial de cada país (rodada 8). "softPower": quanto a música de um país viaja para fora
// (EUA e Reino Unido no topo; Brasil, Itália, Japão… viajam menos; K-pop e reggaeton sobem nos anos
// 2010). "localPref": quanto o público do país prefere artistas da casa (no Brasil, Japão, Coreia e
// Índia os locais dominam as paradas, às vezes acima dos astros globais).

import { BLOCK19 } from './countries19';

type Pts = [number, number][];

const SOFT: Record<string, Pts> = {
  USA: [[1920, 1], [2040, 1]],
  GBR: [[1920, 0.55], [1962, 0.7], [1964, 0.95], [2040, 0.9]],
  CAN: [[1920, 0.45], [1990, 0.65], [2015, 0.75]],
  AUS: [[1920, 0.3], [1975, 0.5], [2040, 0.55]],
  NZL: [[1920, 0.2], [2040, 0.35]],
  IRL: [[1920, 0.25], [1985, 0.6], [2040, 0.55]],
  JAM: [[1920, 0.15], [1968, 0.35], [1975, 0.55], [2040, 0.45]],
  SWE: [[1920, 0.2], [1974, 0.55], [2040, 0.6]],
  FRA: [[1920, 0.45], [1960, 0.4], [1998, 0.45], [2040, 0.4]],
  DEU: [[1920, 0.3], [1975, 0.4], [2040, 0.4]],
  ITA: [[1920, 0.35], [1958, 0.45], [1990, 0.35], [2021, 0.45]],
  ESP: [[1920, 0.25], [1995, 0.4], [2040, 0.5]],
  PRT: [[1920, 0.15], [2040, 0.2]],
  NLD: [[1920, 0.2], [2000, 0.45], [2040, 0.5]],
  BRA: [[1920, 0.2], [1959, 0.25], [1962, 0.5], [1970, 0.3], [2040, 0.32]],
  MEX: [[1920, 0.3], [2000, 0.35], [2018, 0.5]],
  CUB: [[1920, 0.35], [1959, 0.3], [1997, 0.4], [2040, 0.3]],
  COL: [[1920, 0.15], [2000, 0.35], [2017, 0.65]],
  ARG: [[1920, 0.3], [1960, 0.22], [2040, 0.3]],
  CHL: [[1920, 0.12], [2040, 0.18]],
  RUS: [[1920, 0.15], [2040, 0.15]],
  POL: [[1920, 0.1], [2040, 0.12]],
  TUR: [[1920, 0.1], [2040, 0.15]],
  EGY: [[1920, 0.2], [2040, 0.18]],
  NGA: [[1920, 0.08], [1975, 0.2], [2015, 0.35], [2020, 0.6]],
  GHA: [[1920, 0.08], [2040, 0.25]],
  ZAF: [[1920, 0.1], [1986, 0.3], [2040, 0.3]],
  KEN: [[1920, 0.05], [2040, 0.12]],
  IND: [[1920, 0.1], [2000, 0.2], [2040, 0.25]],
  JPN: [[1920, 0.12], [1980, 0.25], [2040, 0.35]],
  KOR: [[1920, 0.05], [2000, 0.15], [2012, 0.5], [2018, 0.75]],
  CHN: [[1920, 0.05], [2040, 0.15]],
  IDN: [[1920, 0.05], [2040, 0.12]],
  PHL: [[1920, 0.08], [2040, 0.18]],
  PRI: [[1920, 0.15], [2004, 0.2], [2010, 0.45], [2040, 0.5]], // r21: reggaeton
};
/** r21 (J-10): soft power por bloco (countries19 sem curva própria; padrão antigo era 0,2 para todos). */
const SOFT_BLOCK: Record<string, Pts> = {
  nordic: [[1920, 0.15], [1990, 0.3], [2040, 0.3]], central: [[1920, 0.2], [2040, 0.2]], east: [[1920, 0.1], [2040, 0.1]], balkan: [[1920, 0.08], [2040, 0.1]],
  arab: [[1920, 0.12], [2040, 0.12]], persian: [[1920, 0.1], [2040, 0.08]], israel: [[1920, 0.1], [1990, 0.2], [2040, 0.2]], maghreb: [[1920, 0.1], [1990, 0.15], [2040, 0.15]],
  westaf: [[1920, 0.08], [2015, 0.15], [2040, 0.2]], congo: [[1920, 0.1], [1960, 0.2], [2040, 0.15]], eastaf: [[1920, 0.05], [2040, 0.08]], southaf: [[1920, 0.08], [2040, 0.1]],
  caribEs: [[1920, 0.2], [2040, 0.25]], caribEn: [[1920, 0.15], [2040, 0.2]], andes: [[1920, 0.1], [2040, 0.12]], sea: [[1920, 0.05], [2040, 0.1]],
  southAs: [[1920, 0.08], [2040, 0.1]], sino: [[1920, 0.1], [1980, 0.25], [2040, 0.2]], pacific: [[1920, 0.05], [2040, 0.08]],
};
/** r21 (J-10): preferência local por bloco (padrão antigo 1,6 para todos). */
const LOCAL_BLOCK: Record<string, number> = {
  nordic: 1.4, central: 1.5, east: 2, balkan: 2, arab: 2.3, persian: 2.4, israel: 1.8, maghreb: 2.1, westaf: 2, congo: 2.2, eastaf: 1.9, southaf: 1.8,
  caribEs: 2, caribEn: 1.5, andes: 1.9, sea: 2, southAs: 2.6, sino: 2.3, pacific: 1.4,
};

const LOCAL: Record<string, number> = {
  USA: 1.6, GBR: 1.6, CAN: 1.25, AUS: 1.3, NZL: 1.2, IRL: 1.3, JAM: 1.5, SWE: 1.4, FRA: 1.9, DEU: 1.5, ITA: 2, ESP: 1.7, PRT: 1.6, NLD: 1.3,
  BRA: 2.4, MEX: 1.9, CUB: 2, COL: 1.9, ARG: 1.9, CHL: 1.6, RUS: 2.2, POL: 1.8, TUR: 2.4, EGY: 2.3, NGA: 2.1, GHA: 1.9, ZAF: 1.7, KEN: 1.6,
  IND: 2.8, JPN: 2.7, KOR: 2.5, CHN: 2.6, IDN: 2.2, PHL: 1.7,
};

const interp = (pts: Pts, year: number): number => {
  if (year <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [y1, v1] = pts[i];
    const [y0, v0] = pts[i - 1];
    if (year <= y1) return v0 + ((v1 - v0) * (year - y0)) / Math.max(1, y1 - y0);
  }
  return pts[pts.length - 1][1];
};

/** 0..1: quanto a música do país viaja (EUA = 1). */
export function softPower(a3: string | null | undefined, year: number): number {
  const p = a3 ? SOFT[a3] ?? SOFT_BLOCK[BLOCK19[a3]] : undefined;
  return p ? interp(p, year) : 0.2;
}

/** Preferência do público do país por artistas locais (1 = neutro). */
export function localPref(a3: string | null | undefined): number {
  return a3 ? LOCAL[a3] ?? LOCAL_BLOCK[BLOCK19[a3]] ?? 1.6 : 1.6;
}
