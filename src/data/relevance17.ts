// Rodada 17 — relevância cultural/musical por país e exceções globais.
// 1) MUSIC: quanto do "população × poder de compra" vira mercado formal de música gravada. A China tem 1,4 bi de
//    pessoas, mas pirataria, controle estatal e streaming barato a deixam atrás do Japão e do Reino Unido (IFPI:
//    EUA ~40% da receita mundial; Japão 2º; China só entra no top 10 nos anos 2010). Índia, Indonésia, Nigéria:
//    enormes, mas gasto por pessoa minúsculo e mercado informal. Japão e Reino Unido gastam acima do esperado.
// 2) GLOBAL: artistas de fora dos EUA que de fato viraram mainstream mundial — carreira consolidada (Shakira, ABBA,
//    Bob Marley, BTS) ou um único hit planetário (Gangnam Style, Despacito, Macarena, Lambada). Só nesses anos.

type Pts = [number, number][];
const interp = (pts: Pts, y: number): number => {
  if (y <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (y <= pts[i][0]) { const [y0, v0] = pts[i - 1]; const [y1, v1] = pts[i]; return v0 + ((v1 - v0) * (y - y0)) / Math.max(1, y1 - y0); }
  return pts[pts.length - 1][1];
};

const MUSIC: Record<string, Pts> = {
  GBR: [[1920, 1.1], [1990, 1.2], [2040, 1.15]],
  JPN: [[1920, 0.8], [1970, 1.2], [1990, 1.5], [2040, 1.35]],
  SWE: [[1920, 1], [2008, 1.2], [2040, 1.2]],
  AUS: [[1920, 1.05], [2040, 1.1]],
  FRA: [[1920, 0.9], [2040, 0.9]],
  ITA: [[1920, 0.8], [2000, 0.7], [2040, 0.75]],
  ESP: [[1920, 0.7], [2000, 0.75], [2040, 0.75]],
  PRT: [[1920, 0.6], [2040, 0.65]],
  KOR: [[1920, 0.4], [1990, 0.7], [2010, 0.9], [2040, 1]],
  CHN: [[1920, 0.35], [1949, 0.12], [1978, 0.08], [1995, 0.1], [2015, 0.14], [2030, 0.25], [2040, 0.3]],
  IND: [[1920, 0.3], [2000, 0.25], [2040, 0.3]],
  IDN: [[1920, 0.3], [2040, 0.35]],
  PHL: [[1920, 0.45], [2040, 0.5]],
  RUS: [[1920, 0.5], [1930, 0.25], [1991, 0.22], [2010, 0.3], [2040, 0.3]],
  POL: [[1920, 0.7], [1948, 0.3], [1990, 0.55], [2040, 0.7]],
  TUR: [[1920, 0.5], [2040, 0.5]],
  EGY: [[1920, 0.8], [1970, 0.6], [1990, 0.4], [2040, 0.4]],
  NGA: [[1920, 0.35], [2015, 0.45], [2040, 0.55]],
  GHA: [[1920, 0.35], [2040, 0.45]],
  KEN: [[1920, 0.35], [2040, 0.45]],
  ZAF: [[1920, 0.8], [2040, 0.8]],
  BRA: [[1920, 0.7], [2000, 0.6], [2040, 0.7]],
  MEX: [[1920, 0.65], [2000, 0.55], [2040, 0.65]],
  ARG: [[1920, 0.8], [2000, 0.65], [2040, 0.65]],
  COL: [[1920, 0.55], [2040, 0.6]],
  CHL: [[1920, 0.7], [2040, 0.7]],
  CUB: [[1920, 0.9], [1958, 0.9], [1962, 0.25], [2040, 0.25]],
  JAM: [[1920, 0.75], [2040, 0.75]],
};

/** Fator de gasto formal com música (1 = proporcional a população × renda). */
export function musicSpend17(a3: string, year: number): number {
  const p = MUSIC[a3];
  return p ? interp(p, year) : 1;
}

export const SPEND_WHY17: Record<string, [string, string]> = {
  CHN: ['Pirataria, censura e streaming barato: mercado formal pequeno para o tamanho do país.', 'Piracy, censorship and cheap streaming: a small formal market for the size of the country.'],
  IND: ['Gasto por pessoa minúsculo; trilhas de cinema dominam e o informal é enorme.', 'Tiny spend per person; film soundtracks dominate and the informal market is huge.'],
  JPN: ['Fãs compram CD e edições especiais por décadas: o 2º maior mercado do mundo.', 'Fans buy CDs and special editions for decades: the world\'s 2nd biggest market.'],
  GBR: ['Público que gasta muito com música para o seu tamanho.', 'An audience that spends a lot on music for its size.'],
  RUS: ['Indústria estatal soviética e pirataria depois de 1991.', 'Soviet state industry, then piracy after 1991.'],
  CUB: ['Depois de 1959, gravadoras estatizadas e embargo.', 'After 1959, nationalised labels and embargo.'],
  NGA: ['Pirataria nas ruas; o streaming só formaliza o mercado nos anos 2010.', 'Street piracy; streaming only formalises the market in the 2010s.'],
};

/** Exceções: [nome real, de, até (0 = sem fim), peso mundial 0..1, motivo PT, motivo EN] */
export type Global17 = [string, number, number, number, string, string];
export const GLOBAL17: Global17[] = [
  ['Carmen Miranda', 1940, 1950, 0.75, 'Hollywood a transforma em estrela mundial', 'Hollywood makes her a worldwide star'],
  ['Édith Piaf', 1946, 1963, 0.7, '"La Vie en rose" roda o mundo', '"La Vie en rose" travels the world'],
  ['Domenico Modugno', 1958, 1959, 0.9, '"Volare" chega ao nº 1 nos EUA', '"Volare" hits No. 1 in the US'],
  ['Kyu Sakamoto', 1963, 1963, 0.9, '"Sukiyaki": único nº 1 americano cantado em japonês', '"Sukiyaki": the only US No. 1 sung in Japanese'],
  ['Astrud Gilberto', 1964, 1966, 0.8, '"The Girl from Ipanema" vira padrão mundial', '"The Girl from Ipanema" becomes a global standard'],
  ['João Gilberto', 1963, 1966, 0.7, 'Getz/Gilberto leva a bossa nova ao mundo', 'Getz/Gilberto takes bossa nova worldwide'],
  ['Sérgio Mendes', 1966, 1970, 0.75, '"Mas que nada" com o Brasil \'66', '"Mas que nada" with Brasil \'66'],
  ['ABBA', 1974, 1982, 0.95, 'Do Eurovision ("Waterloo") ao topo do mundo', 'From Eurovision ("Waterloo") to the top of the world'],
  ['Bob Marley & The Wailers', 1975, 0, 0.9, 'O reggae vira linguagem global', 'Reggae becomes a global language'],
  ['Julio Iglesias', 1978, 2000, 0.85, 'O latino que mais vendeu no mundo', 'The best-selling Latin artist worldwide'],
  ['Nena', 1983, 1984, 0.85, '"99 Luftballons" em alemão nas paradas do mundo', '"99 Luftballons", in German, on charts worldwide'],
  ['a-ha', 1985, 1986, 0.85, '"Take On Me" e o clipe em rotoscopia', '"Take On Me" and its rotoscoped video'],
  ['Falco', 1986, 1986, 0.85, '"Rock Me Amadeus", nº 1 nos EUA', '"Rock Me Amadeus", No. 1 in the US'],
  ['U2', 1987, 0, 0.95, 'The Joshua Tree: a maior banda do mundo', 'The Joshua Tree: the biggest band in the world'],
  ['Gipsy Kings', 1988, 1992, 0.65, 'Rumba flamenca em trilhas e comerciais do mundo todo', 'Flamenco rumba in soundtracks and ads worldwide'],
  ['Enya', 1988, 2002, 0.8, '"Orinoco Flow" e milhões de discos', '"Orinoco Flow" and millions of records'],
  ['Kaoma', 1989, 1990, 0.85, '"Lambada" toma o verão europeu', '"Lambada" takes over the European summer'],
  ['Roxette', 1989, 1992, 0.85, 'Quatro nº 1 nos EUA', 'Four US No. 1s'],
  ['Celine Dion', 1990, 0, 0.95, 'Diva global (Titanic, 1997)', 'Global diva (Titanic, 1997)'],
  ['Björk', 1993, 0, 0.65, 'Debut e a vanguarda pop mundial', 'Debut and the global pop avant-garde'],
  ['Los del Río', 1995, 1997, 1, '"Macarena": 14 semanas no nº 1 nos EUA', '"Macarena": 14 weeks at No. 1 in the US'],
  ['Andrea Bocelli', 1996, 0, 0.85, '"Con te partirò" / "Time to Say Goodbye"', '"Con te partirò" / "Time to Say Goodbye"'],
  ['Daft Punk', 1997, 2021, 0.85, 'Da French touch ao Grammy', 'From French touch to the Grammys'],
  ['Buena Vista Social Club', 1997, 2003, 0.8, 'O disco e o filme de Wim Wenders', 'The record and the Wim Wenders film'],
  ['Aqua', 1997, 1998, 0.85, '"Barbie Girl" em todas as rádios', '"Barbie Girl" on every radio'],
  ['Ricky Martin', 1999, 2001, 0.9, '"Livin\' la Vida Loca" abre a explosão latina', '"Livin\' la Vida Loca" opens the Latin explosion'],
  ['Enrique Iglesias', 1999, 2014, 0.8, 'Hits bilíngues em todos os continentes', 'Bilingual hits on every continent'],
  ['Eiffel 65', 1999, 2000, 0.85, '"Blue (Da Ba Dee)"', '"Blue (Da Ba Dee)"'],
  ['Lou Bega', 1999, 1999, 0.85, '"Mambo No. 5"', '"Mambo No. 5"'],
  ['Shakira', 2001, 0, 0.95, 'Laundry Service e "Hips Don\'t Lie": carreira mundial consolidada', 'Laundry Service and "Hips Don\'t Lie": a consolidated global career'],
  ['Rammstein', 2001, 0, 0.6, 'Metal em alemão lotando estádios no mundo', 'German-language metal filling stadiums worldwide'],
  ['Las Ketchup', 2002, 2002, 0.85, '"Aserejé" em dezenas de países', '"Aserejé" in dozens of countries'],
  ['Daddy Yankee', 2004, 0, 0.7, '"Gasolina" leva o reggaeton ao mundo; "Despacito" (2017)', '"Gasolina" takes reggaeton worldwide; "Despacito" (2017)'],
  ['Michel Teló', 2011, 2012, 0.8, '"Ai se eu te pego" vira febre europeia', '"Ai se eu te pego" becomes a European craze'],
  ['Gotye', 2011, 2012, 0.9, '"Somebody That I Used to Know"', '"Somebody That I Used to Know"'],
  ['PSY', 2012, 2013, 1, '"Gangnam Style": primeiro vídeo com 1 bilhão de views', '"Gangnam Style": first video to hit a billion views'],
  ['Stromae', 2013, 2015, 0.65, '"Papaoutai" e "Formidable"', '"Papaoutai" and "Formidable"'],
  ['Luis Fonsi', 2017, 2018, 1, '"Despacito": recorde de streams e de views', '"Despacito": streaming and video records'],
  ['BTS', 2017, 0, 1, 'K-pop no topo da Billboard e nos estádios', 'K-pop at the top of the Billboard and in stadiums'],
  ['J Balvin', 2017, 0, 0.8, 'Reggaeton global ("Mi Gente")', 'Global reggaeton ("Mi Gente")'],
  ['Blackpink', 2018, 0, 0.9, 'Coachella e recordes no YouTube', 'Coachella and YouTube records'],
  ['Bad Bunny', 2018, 0, 0.95, 'O artista mais ouvido do mundo, cantando em espanhol', 'The world\'s most streamed artist, singing in Spanish'],
  ['Rosalía', 2018, 0, 0.75, 'El mal querer e o flamenco pop', 'El mal querer and flamenco pop'],
  ['Wizkid', 2016, 0, 0.7, '"One Dance" com Drake abre o afrobeats', '"One Dance" with Drake opens afrobeats'],
  ['Burna Boy', 2019, 0, 0.75, 'Afrobeats em estádios e Grammy', 'Afrobeats in stadiums and a Grammy'],
  ['Måneskin', 2021, 0, 0.75, 'Do Eurovision às paradas americanas', 'From Eurovision to the US charts'],
  ['Anitta', 2022, 0, 0.6, '"Envolver" no topo global do Spotify', '"Envolver" at the top of Spotify global'],
];

const norm = (n: string) => n.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
const BY = new Map<string, Global17[]>();
for (const g of GLOBAL17) { const k = norm(g[0]); BY.set(k, [...(BY.get(k) ?? []), g]); }
/** Peso mundial próprio de um artista real naquele ano (0 = sem exceção). */
export function globalOf17(name: string | undefined, year: number): { v: number; g?: Global17 } {
  if (!name) return { v: 0 };
  for (const g of BY.get(norm(name)) ?? []) if (year >= g[1] && (!g[2] || year <= g[2] + 1)) return { v: year > (g[2] || 9999) ? g[3] * 0.6 : g[3], g };
  return { v: 0 };
}
