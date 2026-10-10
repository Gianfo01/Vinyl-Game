// Rodada 17 — dados de sexualidade. Aceitação social (0..1) por país e época, ano em que o casamento entre
// pessoas do mesmo sexo virou lei, períodos de criminalização/censura e as declarações PÚBLICAS e documentadas
// de artistas reais. Regra de história estrita: quem não está aqui fica "não declarado" (privado) — o jogo
// nunca inventa orientação, armário ou exposição para pessoas reais.

import type { MarketId } from './world';

/** Marcos [ano, aceitação 0..1] — vale o último marco ≤ ano. */
export const ACCEPT17: Record<string, [number, number][]> = {
  USA: [[1920, 0.1], [1950, 0.07], [1969, 0.16], [1977, 0.22], [1983, 0.18], [1993, 0.25], [1997, 0.33], [2003, 0.45], [2009, 0.55], [2015, 0.7], [2020, 0.74]],
  GBR: [[1920, 0.06], [1967, 0.18], [1980, 0.24], [1988, 0.22], [1997, 0.38], [2003, 0.5], [2014, 0.74], [2020, 0.78]],
  BRA: [[1920, 0.14], [1964, 0.12], [1979, 0.2], [1985, 0.24], [1995, 0.3], [2004, 0.4], [2011, 0.5], [2013, 0.56], [2019, 0.6]],
  CAN: [[1920, 0.08], [1969, 0.2], [1985, 0.3], [1996, 0.45], [2005, 0.72], [2015, 0.8]],
  NLD: [[1920, 0.12], [1971, 0.4], [1990, 0.6], [2001, 0.85]],
  SWE: [[1920, 0.1], [1944, 0.2], [1979, 0.45], [1995, 0.6], [2009, 0.85]],
  DNK: [[1920, 0.12], [1933, 0.22], [1989, 0.65], [2012, 0.85]],
  DEU: [[1920, 0.12], [1933, 0.02], [1946, 0.06], [1969, 0.2], [1994, 0.4], [2001, 0.55], [2017, 0.78]],
  FRA: [[1920, 0.14], [1960, 0.12], [1982, 0.32], [1999, 0.52], [2013, 0.7]],
  ESP: [[1920, 0.1], [1939, 0.04], [1979, 0.26], [1995, 0.45], [2005, 0.76]],
  ITA: [[1920, 0.1], [1945, 0.14], [1980, 0.25], [2000, 0.38], [2016, 0.55]],
  PRT: [[1920, 0.08], [1974, 0.18], [2001, 0.4], [2010, 0.66]],
  IRL: [[1920, 0.05], [1993, 0.25], [2015, 0.74]],
  RUS: [[1920, 0.12], [1934, 0.03], [1993, 0.18], [2006, 0.14], [2013, 0.08], [2023, 0.03]],
  POL: [[1920, 0.1], [1990, 0.18], [2019, 0.22]],
  JPN: [[1920, 0.22], [1990, 0.3], [2010, 0.42], [2020, 0.5]],
  KOR: [[1920, 0.1], [2000, 0.18], [2015, 0.3], [2020, 0.35]],
  CHN: [[1920, 0.08], [1997, 0.12], [2001, 0.18], [2016, 0.12], [2021, 0.08]],
  IND: [[1920, 0.08], [2009, 0.16], [2018, 0.3]],
  ZAF: [[1920, 0.06], [1994, 0.3], [1996, 0.42], [2006, 0.52]],
  NGA: [[1920, 0.05], [2014, 0.02]],
  JAM: [[1920, 0.06], [1992, 0.04], [2010, 0.08]],
  MEX: [[1920, 0.12], [1990, 0.2], [2010, 0.4], [2022, 0.55]],
  ARG: [[1920, 0.12], [1976, 0.05], [1983, 0.2], [2010, 0.65]],
  CHL: [[1920, 0.08], [1999, 0.2], [2015, 0.45], [2022, 0.6]],
  COL: [[1920, 0.08], [1981, 0.15], [2016, 0.5]],
  CUB: [[1920, 0.08], [1965, 0.04], [1979, 0.1], [2010, 0.3], [2022, 0.45]],
  AUS: [[1920, 0.08], [1975, 0.18], [1997, 0.42], [2017, 0.76]],
  NZL: [[1920, 0.08], [1986, 0.3], [2013, 0.78]],
  TUR: [[1920, 0.12], [2003, 0.2], [2015, 0.08]],
  EGY: [[1920, 0.05], [2001, 0.03]],
  SAU: [[1920, 0.02]],
  IRN: [[1920, 0.05], [1979, 0.01]],
};
/** Padrão por mercado (quando o país não está na tabela). */
export const ACCEPT17_MKT: Record<MarketId, [number, number][]> = {
  na: [[1920, 0.09], [1969, 0.16], [1983, 0.18], [1997, 0.33], [2005, 0.6], [2015, 0.72]],
  eu: [[1920, 0.1], [1967, 0.18], [1982, 0.3], [1999, 0.5], [2013, 0.66]],
  br: [[1920, 0.14], [1964, 0.12], [1985, 0.24], [2004, 0.4], [2013, 0.56]],
  latam: [[1920, 0.1], [1970, 0.08], [1985, 0.18], [2005, 0.3], [2015, 0.45]],
  asia: [[1920, 0.1], [1990, 0.14], [2010, 0.2], [2020, 0.25]],
  africa: [[1920, 0.05], [1994, 0.06], [2010, 0.06]],
  oceania: [[1920, 0.08], [1980, 0.2], [1997, 0.42], [2017, 0.76]],
} as Record<MarketId, [number, number][]>;

/** Casamento igualitário (ano em que virou lei nacional). União civil/simbólica antes disso. */
export const MARRIAGE17: Record<string, number> = {
  NLD: 2001, BEL: 2003, ESP: 2005, CAN: 2005, ZAF: 2006, NOR: 2009, SWE: 2009, PRT: 2010, ISL: 2010, ARG: 2010, DNK: 2012, BRA: 2013, FRA: 2013,
  URY: 2013, NZL: 2013, GBR: 2014, LUX: 2015, USA: 2015, IRL: 2015, COL: 2016, FIN: 2017, MLT: 2017, DEU: 2017, AUS: 2017, AUT: 2019, TWN: 2019,
  ECU: 2019, CRI: 2020, CHL: 2022, CHE: 2022, SVN: 2022, MEX: 2022, CUB: 2022, AND: 2023, EST: 2024, GRC: 2024, THA: 2025,
};

/** Criminalização (ou lei de "propaganda") vigente: [de, até]; até ausente = ainda vale. Show de artista assumido vira risco. */
export const CRIM17: Record<string, [number, number?][]> = {
  GBR: [[1920, 1967]], DEU: [[1920, 1969]], ESP: [[1939, 1979]], RUS: [[1934, 1993], [2013]], AUS: [[1920, 1975]], ZAF: [[1920, 1994]],
  IND: [[1920, 2018]], NGA: [[1920]], JAM: [[1920]], SAU: [[1920]], IRN: [[1920]], EGY: [[2001]], KEN: [[1920]], UGA: [[1920]], MYS: [[1920]],
  SGP: [[1920, 2022]], CHN: [[2016]], TUR: [[2015]], USA: [[1920, 1962]], CHL: [[1920, 1999]], CUB: [[1965, 1979]], NZL: [[1920, 1986]], IRL: [[1920, 1993]],
};

export type Orient17 = 'het' | 'gay' | 'bi' | 'ace';
/** Declarações públicas documentadas: nome da pessoa → [orientação, ano em que se tornou pública, foi exposto(a) contra a vontade?, nota]. */
export const REAL_SEX17: Record<string, [Orient17, number, 0 | 1, string]> = {
  'Dusty Springfield': ['bi', 1970, 0, 'entrevista ao Evening Standard (1970)'],
  'Elton John': ['gay', 1976, 0, 'Rolling Stone: bissexual (1976); gay (1988)'],
  'Ney Matogrosso': ['gay', 1973, 0, 'nunca escondeu, desde os Secos & Molhados'],
  'Cazuza': ['bi', 1984, 0, 'falava abertamente em entrevistas nos anos 1980'],
  'Renato Russo': ['gay', 1990, 0, 'declarou-se gay em entrevistas (c. 1990)'],
  'Cássia Eller': ['gay', 1990, 0, 'lésbica assumida desde a estreia'],
  'Neil Tennant': ['gay', 1994, 0, 'revista Attitude (1994)'],
  'Michael Stipe': ['bi', 1994, 0, 'declarou atração por homens e mulheres (1994); "queer"'],
  'Billie Joe Armstrong': ['bi', 1995, 0, 'The Advocate (1995)'],
  'Boy George': ['gay', 1995, 0, 'autobiografia Take It Like a Man (1995)'],
  'George Michael': ['gay', 1998, 1, 'exposto após prisão em Beverly Hills (1998); confirmou na TV'],
  'Rob Halford': ['gay', 1998, 0, 'MTV (1998)'],
  'Lance Bass': ['gay', 2006, 0, 'revista People (2006)'],
  'Lady Gaga': ['bi', 2009, 0, 'entrevista a Barbara Walters (2009)'],
  'Ricky Martin': ['gay', 2010, 0, 'carta em seu site (2010)'],
  'Tiziano Ferro': ['gay', 2010, 0, 'Vanity Fair Italia (2010)'],
  'Frank Ocean': ['bi', 2012, 0, 'carta no Tumblr (2012)'],
  'Daniela Mercury': ['bi', 2013, 0, 'anunciou o casamento com Malu Verçosa (2013)'],
  'Sam Smith': ['gay', 2014, 0, 'entrevista à Fader (2014)'],
  'Christine and the Queens': ['bi', 2014, 0, 'declarou-se pansexual (2014)'],
  'Miley Cyrus': ['bi', 2015, 0, 'declarou-se pansexual (2015)'],
  'Pabllo Vittar': ['gay', 2015, 0, 'drag queen assumida desde a estreia'],
  'Gloria Groove': ['gay', 2016, 0, 'drag queen assumida desde a estreia'],
  'Janelle Monáe': ['bi', 2018, 0, 'Rolling Stone (2018): pansexual'],
  'Lil Nas X': ['gay', 2019, 0, 'Twitter (2019)'],
  'Chappell Roan': ['gay', 2020, 0, 'artista queer assumida desde a estreia'],
};
