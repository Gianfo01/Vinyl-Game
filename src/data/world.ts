// Mercados, cidades, famílias e gêneros (Catálogo §1, GDD §8).

export type L = { pt: string; en: string };
export const l = (pt: string, en = pt): L => ({ pt, en });

export type MarketId = 'br' | 'na' | 'latam' | 'eu' | 'asia' | 'africa' | 'oceania';

export interface Market {
  id: MarketId;
  name: L;
  /** Tamanho relativo do mercado por ano (0..1+) */
  size: (year: number) => number;
  lang: NameGroup[];
}

export type NameGroup = 'en' | 'pt' | 'es' | 'fr' | 'de' | 'it' | 'sv' | 'ja' | 'ko' | 'hi' | 'zh' | 'th' | 'ar' | 'tr' | 'yo' | 'zu' | 'wo';

const ramp = (pts: [number, number][]) => (y: number) => {
  if (y <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (y <= pts[i][0]) {
      const [y0, v0] = pts[i - 1];
      const [y1, v1] = pts[i];
      return v0 + ((v1 - v0) * (y - y0)) / (y1 - y0);
    }
  }
  return pts[pts.length - 1][1];
};

export const MARKETS: Market[] = [
  { id: 'na', name: l('América do Norte', 'North America'), size: ramp([[1920, 1], [2040, 1]]), lang: ['en'] },
  { id: 'eu', name: l('Europa', 'Europe'), size: ramp([[1920, 0.8], [1960, 0.9], [2040, 0.85]]), lang: ['en', 'fr', 'de', 'it', 'sv', 'pt'] },
  { id: 'br', name: l('Brasil', 'Brazil'), size: ramp([[1920, 0.08], [1970, 0.18], [2010, 0.25], [2040, 0.3]]), lang: ['pt'] },
  { id: 'latam', name: l('América Latina e Caribe', 'Latin America & Caribbean'), size: ramp([[1920, 0.1], [1980, 0.2], [2015, 0.32], [2040, 0.4]]), lang: ['es', 'en'] },
  { id: 'asia', name: l('Ásia e Oriente Médio', 'Asia & Middle East'), size: ramp([[1920, 0.15], [1970, 0.35], [1990, 0.6], [2020, 0.9], [2040, 1.1]]), lang: ['ja', 'ko', 'hi', 'zh', 'th', 'ar', 'tr'] },
  { id: 'africa', name: l('África', 'Africa'), size: ramp([[1920, 0.03], [1970, 0.06], [2010, 0.15], [2040, 0.4]]), lang: ['yo', 'zu', 'ar', 'wo'] },
  { id: 'oceania', name: l('Oceania', 'Oceania'), size: ramp([[1920, 0.05], [2040, 0.08]]), lang: ['en'] },
];

export const marketById = Object.fromEntries(MARKETS.map((m) => [m.id, m])) as Record<MarketId, Market>;

export type FamilyId =
  | 'blues_jazz' | 'country_folk' | 'rnb' | 'rock' | 'pop' | 'hiphop' | 'electronic'
  | 'caribbean' | 'latin' | 'brazil' | 'africa' | 'asia_me' | 'europe' | 'sacred';

export const FAMILIES: { id: FamilyId; name: L; hue: number }[] = [
  { id: 'blues_jazz', name: l('Blues e jazz', 'Blues & jazz'), hue: 220 },
  { id: 'country_folk', name: l('Country e folk', 'Country & folk'), hue: 35 },
  { id: 'rnb', name: l('R&B, soul, funk e disco', 'R&B, soul, funk & disco'), hue: 300 },
  { id: 'rock', name: l('Rock'), hue: 0 },
  { id: 'pop', name: l('Pop'), hue: 330 },
  { id: 'hiphop', name: l('Hip hop'), hue: 45 },
  { id: 'electronic', name: l('Eletrônica', 'Electronic'), hue: 185 },
  { id: 'caribbean', name: l('Caribe e reggae', 'Caribbean & reggae'), hue: 110 },
  { id: 'latin', name: l('Latina', 'Latin'), hue: 15 },
  { id: 'brazil', name: l('Brasil', 'Brazil'), hue: 140 },
  { id: 'africa', name: l('África', 'Africa'), hue: 60 },
  { id: 'asia_me', name: l('Ásia e Oriente Médio', 'Asia & Middle East'), hue: 265 },
  { id: 'europe', name: l('Europa', 'Europe'), hue: 200 },
  { id: 'sacred', name: l('Sagrado e clássico', 'Sacred & classical'), hue: 50 },
];

/** Preferência de cada mercado por família (multiplicador de demanda). */
export const MARKET_PREF: Record<MarketId, Partial<Record<FamilyId, number>>> = {
  na: { blues_jazz: 1.1, country_folk: 1.3, rnb: 1.3, rock: 1.2, pop: 1.2, hiphop: 1.3, electronic: 0.9, latin: 0.7, caribbean: 0.6, brazil: 0.3, africa: 0.3, asia_me: 0.3, europe: 0.4, sacred: 0.8 },
  eu: { blues_jazz: 1, country_folk: 0.6, rnb: 1, rock: 1.3, pop: 1.2, hiphop: 0.9, electronic: 1.4, latin: 0.6, caribbean: 0.8, brazil: 0.5, africa: 0.6, asia_me: 0.4, europe: 1.5, sacred: 1.1 },
  br: { blues_jazz: 0.6, country_folk: 0.5, rnb: 0.8, rock: 0.9, pop: 1, hiphop: 0.7, electronic: 0.7, latin: 0.7, caribbean: 0.6, brazil: 2.2, africa: 0.4, asia_me: 0.2, europe: 0.4, sacred: 0.9 },
  latam: { blues_jazz: 0.6, country_folk: 0.4, rnb: 0.7, rock: 0.9, pop: 1.1, hiphop: 0.8, electronic: 0.7, latin: 2.2, caribbean: 1.5, brazil: 0.7, africa: 0.3, asia_me: 0.2, europe: 0.4, sacred: 0.8 },
  asia: { blues_jazz: 0.6, country_folk: 0.3, rnb: 0.8, rock: 0.8, pop: 1.3, hiphop: 0.8, electronic: 1, latin: 0.4, caribbean: 0.3, brazil: 0.3, africa: 0.3, asia_me: 2.3, europe: 0.5, sacred: 0.8 },
  africa: { blues_jazz: 0.6, country_folk: 0.3, rnb: 1, rock: 0.5, pop: 1, hiphop: 1, electronic: 0.8, latin: 0.5, caribbean: 1.2, brazil: 0.5, africa: 2.4, asia_me: 0.5, europe: 0.4, sacred: 1.2 },
  oceania: { blues_jazz: 0.8, country_folk: 1, rnb: 0.9, rock: 1.4, pop: 1.2, hiphop: 0.9, electronic: 1.1, latin: 0.4, caribbean: 0.6, brazil: 0.3, africa: 0.3, asia_me: 0.4, europe: 0.6, sacred: 0.7 },
};

export interface City {
  id: string;
  name: L;
  market: MarketId;
  lang: NameGroup;
  scenes: string[]; // gêneros
  lat: number;
  lon: number;
}

const c = (id: string, pt: string, en: string, market: MarketId, lang: NameGroup, scenes: string[], lat = 0, lon = 0): City => ({ id, name: l(pt, en), market, lang, scenes, lat, lon });

export const CITIES: City[] = [
  c('sao_paulo', 'São Paulo', 'São Paulo', 'br', 'pt', ['rock_br', 'mpb', 'sertanejo', 'tropicalia', 'funk_carioca'], -23.55, -46.63),
  c('rio', 'Rio de Janeiro', 'Rio de Janeiro', 'br', 'pt', ['samba', 'bossa', 'samba_cancao', 'funk_carioca', 'jovem_guarda', 'soul_br'], -22.91, -43.17),
  c('salvador', 'Salvador', 'Salvador', 'br', 'pt', ['axe', 'tropicalia', 'samba'], -12.97, -38.5),
  c('recife', 'Recife', 'Recife', 'br', 'pt', ['baiao', 'frevo', 'mangue'], -8.05, -34.9),
  c('bh', 'Belo Horizonte', 'Belo Horizonte', 'br', 'pt', ['mpb', 'heavy_metal'], -19.92, -43.94),
  c('new_york', 'Nova York', 'New York', 'na', 'en', ['big_band', 'vocal_jazz', 'bebop', 'cool_jazz', 'punk', 'hiphop', 'disco', 'folk', 'trad_pop', 'funk', 'jazz_rap', 'dance_pop'], 40.71, -74.0),
  c('los_angeles', 'Los Angeles', 'Los Angeles', 'na', 'en', ['pop_rock', 'surf', 'soft_rock', 'gfunk', 'thrash', 'hard_rock', 'bedroom_pop', 'edm', 'pop_rnb'], 34.05, -118.24),
  c('nashville', 'Nashville', 'Nashville', 'na', 'en', ['country', 'honky_tonk', 'bluegrass', 'country_pop'], 36.16, -86.78),
  c('new_orleans', 'Nova Orleans', 'New Orleans', 'na', 'en', ['nola_jazz', 'rnb', 'rnr'], 29.95, -90.07),
  c('detroit', 'Detroit', 'Detroit', 'na', 'en', ['soul', 'techno', 'girl_group', 'funk'], 42.33, -83.05),
  c('chicago', 'Chicago', 'Chicago', 'na', 'en', ['delta_blues', 'house', 'rnr', 'hyperpop'], 41.88, -87.63),
  c('memphis', 'Memphis', 'Memphis', 'na', 'en', ['classic_blues', 'delta_blues', 'rnr', 'soul'], 35.15, -90.05),
  c('seattle', 'Seattle', 'Seattle', 'na', 'en', ['grunge', 'indie'], 47.61, -122.33),
  c('mexico_city', 'Cidade do México', 'Mexico City', 'latam', 'es', ['ranchera', 'bolero', 'rock_latino'], 19.43, -99.13),
  c('buenos_aires', 'Buenos Aires', 'Buenos Aires', 'latam', 'es', ['tango', 'rock_latino'], -34.6, -58.38),
  c('havana', 'Havana', 'Havana', 'latam', 'es', ['son', 'salsa', 'bolero', 'reggaeton'], 23.11, -82.37),
  c('bogota', 'Bogotá', 'Bogotá', 'latam', 'es', ['cumbia', 'pop_latino'], 4.71, -74.07),
  c('kingston', 'Kingston', 'Kingston', 'latam', 'en', ['ska', 'reggae', 'dancehall'], 17.97, -76.79),
  c('london', 'Londres', 'London', 'eu', 'en', ['blues_rock', 'punk', 'britpop', 'psychedelic', 'prog', 'glam', 'hard_rock', 'synthpop', 'alt_rock', 'grime', 'ambient'], 51.51, -0.13),
  c('manchester', 'Manchester', 'Manchester', 'eu', 'en', ['post_punk', 'indie', 'heavy_metal', 'britpop', 'disco'], 53.48, -2.24),
  c('liverpool', 'Liverpool', 'Liverpool', 'eu', 'en', ['pop_rock', 'beat'], 53.41, -2.98),
  c('paris', 'Paris', 'Paris', 'eu', 'fr', ['chanson', 'gypsy_jazz', 'french_house', 'chanson_pop'], 48.86, 2.35),
  c('berlin', 'Berlim', 'Berlin', 'eu', 'de', ['krautrock', 'techno', 'schlager'], 52.52, 13.4),
  c('stockholm', 'Estocolmo', 'Stockholm', 'eu', 'sv', ['nordic_pop', 'eurodance'], 59.33, 18.07),
  c('milan', 'Milão', 'Milan', 'eu', 'it', ['canzone', 'italo'], 45.46, 9.19),
  c('dublin', 'Dublin', 'Dublin', 'eu', 'en', ['celtic_rock', 'arena_rock', 'folk'], 53.35, -6.26),
  c('lisbon', 'Lisboa', 'Lisbon', 'eu', 'pt', ['fado'], 38.72, -9.14),
  c('tokyo', 'Tóquio', 'Tokyo', 'asia', 'ja', ['enka', 'city_pop', 'jpop', 'synthpop', 'synthetic'], 35.68, 139.69),
  c('seoul', 'Seul', 'Seoul', 'asia', 'ko', ['kpop', 'trot'], 37.57, 126.98),
  c('mumbai', 'Mumbai', 'Mumbai', 'asia', 'hi', ['bollywood', 'indian_classical'], 19.08, 72.88),
  c('hong_kong', 'Hong Kong', 'Hong Kong', 'asia', 'zh', ['cantopop'], 22.32, 114.17),
  c('bangkok', 'Bangkok', 'Bangkok', 'asia', 'th', ['luk_thung'], 13.76, 100.5),
  c('beirut', 'Beirute', 'Beirut', 'asia', 'ar', ['arabic_pop'], 33.89, 35.5),
  c('istanbul', 'Istambul', 'Istanbul', 'asia', 'tr', ['arabesk', 'anatolian_rock'], 41.01, 28.98),
  c('lagos', 'Lagos', 'Lagos', 'africa', 'yo', ['highlife', 'juju', 'afrobeat', 'afrobeats'], 6.52, 3.38),
  c('johannesburg', 'Joanesburgo', 'Johannesburg', 'africa', 'zu', ['mbaqanga', 'kwaito', 'amapiano'], -26.2, 28.05),
  c('cairo', 'Cairo', 'Cairo', 'africa', 'ar', ['arabic_classical'], 30.04, 31.24),
  c('dakar', 'Dacar', 'Dakar', 'africa', 'wo', ['mbalax'], 14.72, -17.47),
  c('sydney', 'Sydney', 'Sydney', 'oceania', 'en', ['pub_rock'], -33.87, 151.21),
  c('melbourne', 'Melbourne', 'Melbourne', 'oceania', 'en', ['indie', 'post_punk'], -37.81, 144.96),
];

export const cityById = Object.fromEntries(CITIES.map((x) => [x.id, x])) as Record<string, City>;

export interface Genre {
  id: string;
  name: L;
  family: FamilyId;
  born: number;
  parents: string[];
}

const g = (id: string, pt: string, family: FamilyId, born: number, parents: string[] = [], en?: string): Genre => ({ id, name: l(pt, en ?? pt), family, born, parents });

export const GENRES: Genre[] = [
  // Blues e jazz
  g('classic_blues', 'Blues clássico', 'blues_jazz', 1920, [], 'Classic blues'),
  g('nola_jazz', 'Jazz de Nova Orleans', 'blues_jazz', 1920, [], 'New Orleans jazz'),
  g('delta_blues', 'Blues do Delta', 'blues_jazz', 1928, ['classic_blues'], 'Delta blues'),
  g('big_band', 'Swing e big band', 'blues_jazz', 1930, ['nola_jazz'], 'Swing & big band'),
  g('gypsy_jazz', 'Jazz manouche', 'blues_jazz', 1934, ['big_band'], 'Gypsy jazz'),
  g('vocal_jazz', 'Jazz vocal', 'blues_jazz', 1933, ['big_band'], 'Vocal jazz'),
  g('bebop', 'Bebop', 'blues_jazz', 1944, ['big_band']),
  g('cool_jazz', 'Cool jazz', 'blues_jazz', 1949, ['bebop']),
  g('fusion', 'Fusão', 'blues_jazz', 1969, ['cool_jazz', 'funk'], 'Fusion'),
  // Country e folk
  g('country', 'Country', 'country_folk', 1922),
  g('honky_tonk', 'Honky-tonk', 'country_folk', 1941, ['country']),
  g('bluegrass', 'Bluegrass', 'country_folk', 1946, ['country']),
  g('folk', 'Folk', 'country_folk', 1958, ['country']),
  g('outlaw', 'Outlaw country', 'country_folk', 1972, ['honky_tonk']),
  g('country_pop', 'Country pop', 'country_folk', 1998, ['country', 'teen_pop']),
  // R&B
  g('rnb', 'R&B', 'rnb', 1945, ['classic_blues', 'big_band']),
  g('soul', 'Soul', 'rnb', 1958, ['rnb', 'gospel']),
  g('girl_group', 'Girl group soul', 'rnb', 1960, ['soul']),
  g('funk', 'Funk', 'rnb', 1965, ['soul']),
  g('disco', 'Disco', 'rnb', 1973, ['funk', 'soul']),
  g('new_jack', 'New jack swing', 'rnb', 1986, ['rnb', 'hiphop']),
  g('neo_soul', 'Neo-soul', 'rnb', 1995, ['soul', 'hiphop']),
  g('pop_rnb', 'Pop e R&B', 'rnb', 1984, ['rnb', 'dance_pop'], 'Pop & R&B'),
  // Rock
  g('rnr', "Rock'n'roll", 'rock', 1953, ['rnb', 'country']),
  g('surf', 'Surf', 'rock', 1960, ['rnr']),
  g('beat', 'Beat', 'rock', 1960, ['rnr']),
  g('pop_rock', 'Pop rock', 'rock', 1961, ['rnr', 'beat']),
  g('blues_rock', 'Blues rock', 'rock', 1962, ['rnr', 'delta_blues']),
  g('psychedelic', 'Psicodelia', 'rock', 1965, ['pop_rock'], 'Psychedelic rock'),
  g('art_rock', 'Art rock', 'rock', 1964, ['psychedelic']),
  g('prog', 'Rock progressivo', 'rock', 1967, ['psychedelic'], 'Progressive rock'),
  g('hard_rock', 'Hard rock', 'rock', 1967, ['blues_rock']),
  g('heavy_metal', 'Heavy metal', 'rock', 1969, ['hard_rock']),
  g('glam', 'Glam', 'rock', 1970, ['art_rock']),
  g('soft_rock', 'Soft rock', 'rock', 1970, ['folk', 'pop_rock']),
  g('punk', 'Punk', 'rock', 1974, ['rnr', 'art_rock']),
  g('post_punk', 'Post-punk', 'rock', 1978, ['punk']),
  g('new_wave', 'New wave', 'rock', 1978, ['punk', 'synthpop']),
  g('arena_rock', 'Rock de arena', 'rock', 1978, ['hard_rock'], 'Arena rock'),
  g('thrash', 'Thrash metal', 'rock', 1981, ['heavy_metal', 'punk']),
  g('indie', 'Indie', 'rock', 1982, ['post_punk']),
  g('alt_rock', 'Rock alternativo', 'rock', 1985, ['indie'], 'Alternative rock'),
  g('grunge', 'Grunge', 'rock', 1987, ['alt_rock', 'heavy_metal']),
  g('britpop', 'Britpop', 'rock', 1991, ['indie', 'beat']),
  g('emo', 'Emo', 'rock', 1995, ['punk', 'indie']),
  g('celtic_rock', 'Rock celta', 'rock', 1970, ['folk', 'pop_rock'], 'Celtic rock'),
  g('pub_rock', 'Pub rock', 'rock', 1973, ['hard_rock']),
  g('anatolian_rock', 'Rock anatólio', 'rock', 1968, ['psychedelic', 'arabesk'], 'Anatolian rock'),
  // Pop
  g('trad_pop', 'Pop tradicional (crooner)', 'pop', 1935, ['big_band', 'vocal_jazz'], 'Traditional pop (crooner)'),
  g('teen_pop', 'Teen pop', 'pop', 1957, ['trad_pop', 'rnr']),
  g('synthpop', 'Synth-pop', 'pop', 1978, ['krautrock', 'new_wave']),
  g('dance_pop', 'Dance-pop', 'pop', 1982, ['disco', 'synthpop']),
  g('boy_band', 'Boy band', 'pop', 1988, ['teen_pop', 'dance_pop']),
  g('jpop', 'J-pop', 'pop', 1988, ['city_pop']),
  g('kpop', 'K-pop', 'pop', 1996, ['dance_pop', 'hiphop']),
  g('bedroom_pop', 'Bedroom pop', 'pop', 2012, ['indie', 'synthpop']),
  g('hyperpop', 'Hyperpop', 'pop', 2015, ['bedroom_pop', 'edm']),
  // Hip hop
  g('hiphop', 'Hip hop', 'hiphop', 1977, ['funk', 'disco']),
  g('jazz_rap', 'Jazz rap', 'hiphop', 1988, ['hiphop', 'cool_jazz']),
  g('gfunk', 'G-funk', 'hiphop', 1991, ['hiphop', 'funk']),
  g('trap', 'Trap', 'hiphop', 2003, ['hiphop']),
  g('grime', 'Grime', 'hiphop', 2002, ['hiphop', 'dancehall']),
  g('drill', 'Drill', 'hiphop', 2012, ['trap']),
  // Eletrônica
  g('krautrock', 'Krautrock e eletrônica', 'electronic', 1968, ['psychedelic', 'art_rock'], 'Krautrock & electronic'),
  g('techno', 'Techno', 'electronic', 1985, ['krautrock', 'funk']),
  g('house', 'House', 'electronic', 1984, ['disco']),
  g('ambient', 'Ambient', 'electronic', 1975, ['krautrock']),
  g('trance', 'Trance', 'electronic', 1991, ['techno']),
  g('dnb', 'Drum and bass', 'electronic', 1993, ['house', 'dancehall']),
  g('french_house', 'French house', 'electronic', 1994, ['house', 'disco']),
  g('edm', 'EDM e dubstep', 'electronic', 2008, ['trance', 'house'], 'EDM & dubstep'),
  g('synthetic', 'Música sintética', 'electronic', 2030, ['edm', 'hyperpop'], 'Synthetic music'),
  // Caribe
  g('calypso', 'Calypso', 'caribbean', 1930),
  g('ska', 'Ska', 'caribbean', 1959, ['calypso', 'rnb']),
  g('reggae', 'Reggae', 'caribbean', 1968, ['ska']),
  g('dancehall', 'Dancehall', 'caribbean', 1979, ['reggae']),
  g('reggaeton', 'Reggaeton e trap latino', 'caribbean', 1995, ['dancehall', 'hiphop'], 'Reggaeton & Latin trap'),
  // Latina
  g('tango', 'Tango canção', 'latin', 1920, [], 'Tango song'),
  g('bolero', 'Bolero', 'latin', 1925),
  g('son', 'Son cubano', 'latin', 1920, [], 'Cuban son'),
  g('ranchera', 'Ranchera e mariachi', 'latin', 1930, [], 'Ranchera & mariachi'),
  g('salsa', 'Salsa e guaracha', 'latin', 1950, ['son'], 'Salsa & guaracha'),
  g('cumbia', 'Cumbia', 'latin', 1940),
  g('rock_latino', 'Rock latino', 'latin', 1980, ['pop_rock', 'post_punk'], 'Latin rock'),
  g('pop_latino', 'Pop latino', 'latin', 1990, ['dance_pop', 'cumbia'], 'Latin pop'),
  // Brasil
  g('samba', 'Samba', 'brazil', 1920),
  g('samba_cancao', 'Samba-canção', 'brazil', 1930, ['samba']),
  g('baiao', 'Baião e forró', 'brazil', 1940, [], 'Baião & forró'),
  g('frevo', 'Frevo', 'brazil', 1920),
  g('bossa', 'Bossa nova', 'brazil', 1957, ['samba', 'cool_jazz']),
  g('jovem_guarda', 'Jovem guarda e romântico', 'brazil', 1963, ['rnr'], 'Jovem guarda & romantic'),
  g('tropicalia', 'Tropicália', 'brazil', 1966, ['psychedelic', 'bossa']),
  g('mpb', 'MPB', 'brazil', 1965, ['bossa', 'samba']),
  g('soul_br', 'Soul e funk brasileiro', 'brazil', 1969, ['soul', 'samba'], 'Brazilian soul & funk'),
  g('sertanejo', 'Sertanejo', 'brazil', 1960, ['country']),
  g('rock_br', 'Rock brasileiro', 'brazil', 1980, ['post_punk', 'new_wave'], 'Brazilian rock'),
  g('axe', 'Axé', 'brazil', 1985, ['frevo', 'reggae']),
  g('mangue', 'Manguebeat', 'brazil', 1991, ['baiao', 'hiphop']),
  g('funk_carioca', 'Funk carioca', 'brazil', 1989, ['hiphop']),
  // África
  g('highlife', 'Highlife', 'africa', 1925),
  g('juju', 'Jùjú', 'africa', 1932, ['highlife']),
  g('afrobeat', 'Afrobeat', 'africa', 1968, ['highlife', 'funk']),
  g('mbaqanga', 'Mbaqanga', 'africa', 1960),
  g('mbalax', 'Mbalax', 'africa', 1975, ['son']),
  g('kwaito', 'Kwaito', 'africa', 1992, ['house']),
  g('afrobeats', 'Afrobeats', 'africa', 2008, ['afrobeat', 'dancehall', 'hiphop']),
  g('amapiano', 'Amapiano', 'africa', 2014, ['kwaito', 'house']),
  // Ásia e Oriente Médio
  g('indian_classical', 'Clássica indiana', 'asia_me', 1920, [], 'Indian classical'),
  g('bollywood', 'Bollywood', 'asia_me', 1935, ['indian_classical']),
  g('enka', 'Enka', 'asia_me', 1950),
  g('arabic_classical', 'Música árabe clássica', 'asia_me', 1920, [], 'Classical Arabic music'),
  g('arabic_pop', 'Pop árabe', 'asia_me', 1960, ['arabic_classical'], 'Arabic pop'),
  g('arabesk', 'Arabesk', 'asia_me', 1965, ['arabic_classical']),
  g('city_pop', 'City pop', 'asia_me', 1976, ['soft_rock', 'funk']),
  g('cantopop', 'Canto-pop', 'asia_me', 1974, ['trad_pop']),
  g('luk_thung', 'Luk thung', 'asia_me', 1950),
  g('trot', 'Trot', 'asia_me', 1930),
  // Europa
  g('chanson', 'Chanson realista', 'europe', 1920, [], 'Chanson réaliste'),
  g('fado', 'Fado', 'europe', 1920),
  g('schlager', 'Schlager', 'europe', 1950),
  g('canzone', 'Canzone e pop italiano', 'europe', 1950, ['trad_pop'], 'Canzone & Italian pop'),
  g('chanson_pop', 'Chanson pop', 'europe', 1958, ['chanson', 'teen_pop']),
  g('nordic_pop', 'Pop nórdico', 'europe', 1972, ['teen_pop'], 'Nordic pop'),
  g('italo', 'Italo disco', 'europe', 1978, ['disco', 'synthpop']),
  g('eurodance', 'Eurodance', 'europe', 1990, ['house', 'italo']),
  // Sagrado e clássico
  g('gospel', 'Gospel', 'sacred', 1920),
  g('classical', 'Clássica', 'sacred', 1920, [], 'Classical'),
  g('soundtrack', 'Trilha sonora', 'sacred', 1933, ['classical'], 'Soundtrack'),
  g('minimalism', 'Minimalismo', 'sacred', 1964, ['classical'], 'Minimalism'),
];

export const genreById = Object.fromEntries(GENRES.map((x) => [x.id, x])) as Record<string, Genre>;

export function familyOf(genreId: string): FamilyId {
  return genreById[genreId]?.family ?? 'pop';
}
