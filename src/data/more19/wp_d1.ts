// WP-D1 — artistas do Leste Europeu e nórdicos (docs/db19.md §5). Edite só este arquivo (ou crie vizinhos wp_d1_*.ts e concatene-os aqui).
// Formato e regras: docs/db19.md "## Formato more19" e ./types.ts (import de valor só de '../world').
// Contexto de bloco: atos do bloco soviético/Iugoslávia saem pelos selos estatais (Melodiya, Supraphon, Hungaroton, Jugoton,
// Polskie Nagrania, Electrecord, Balkanton, Amiga — entram via WP-E); aqui só os artistas. Estreias † a conferir no WP-J;
// RealArtist não tem `exact`, então anos de t:3 e de formações antigas (Plastic People, Mashina Vremeni etc.) são aproximados.
// Sem casos criminais: black metal norueguês só com bandas sem o episódio dos anos 90.
import type { Pack19 } from './types';
import type { RealArtist, RealRelease } from '../realtypes';

type Row = [n: string, g: string, c: string, d: number, t: 1 | 2 | 3, cn: string, e?: number];
const mk = (rows: Row[], al: Record<string, RealRelease[]> = {}): RealArtist[] =>
  rows.map(([n, g, c, d, t, cn, e]) => ({ n, g, c, d, t, cn, z: t, ...(e ? { e } : {}), ...(al[n] ? { al: al[n] } : {}) }));

const EAST: Row[] = [
  // Polônia
  ['Czesław Niemen', 'beat', 'warsaw', 1962, 2, 'POL'],
  ['Maryla Rodowicz', 'trad_pop', 'warsaw', 1967, 2, 'POL'],
  ['Skaldowie', 'beat', 'krakow', 1965, 3, 'POL'],
  ['Czerwone Gitary', 'beat', 'gdansk', 1965, 3, 'POL'],
  ['Budka Suflera', 'pop_rock', 'warsaw', 1975, 3, 'POL'],
  ['Perfect', 'pop_rock', 'warsaw', 1981, 3, 'POL'],
  ['Lady Pank', 'new_wave', 'warsaw', 1983, 2, 'POL'],
  ['Kult', 'punk', 'warsaw', 1987, 3, 'POL'],
  ['Behemoth', 'black_metal', 'gdansk', 1995, 3, 'POL'],
  ['Dawid Podsiadło', 'indie', 'gdansk', 2013, 2, 'POL'],
  // Tchéquia e Eslováquia
  ['Karel Gott', 'trad_pop', 'prague', 1960, 1, 'CZE'],
  ['Marta Kubišová', 'beat', 'prague', 1965, 3, 'CZE'],
  ['Olympic', 'beat', 'prague', 1965, 3, 'CZE'],
  ['Plastic People of the Universe', 'psychedelic', 'prague', 1968, 3, 'CZE'],
  ['Lucie', 'pop_rock', 'prague', 1990, 3, 'CZE'],
  ['Elán', 'pop_rock', 'bratislava', 1980, 3, 'SVK'],
  // Hungria
  ['Omega', 'beat', 'budapest', 1962, 2, 'HUN'],
  ['Locomotiv GT', 'prog', 'budapest', 1971, 3, 'HUN'],
  ['Illés', 'beat', 'budapest', 1964, 3, 'HUN', 1973],
  ['Hobo Blues Band', 'blues_rock', 'budapest', 1981, 3, 'HUN'],
  ['Muzsikás', 'folk', 'budapest', 1973, 3, 'HUN'],
  ['Republic', 'pop_rock', 'budapest', 1990, 3, 'HUN'],
  // Romênia, Moldávia, Bulgária
  ['Holograf', 'pop_rock', 'bucharest', 1983, 3, 'ROU'],
  ['Iris', 'hard_rock', 'bucharest', 1983, 3, 'ROU'],
  ['Gheorghe Zamfir', 'folk', 'bucharest', 1970, 3, 'ROU'],
  ['O-Zone', 'eurodance', 'bucharest', 2002, 2, 'ROU', 2005],
  ['Inna', 'dance_pop', 'bucharest', 2008, 2, 'ROU'],
  ['Lili Ivanova', 'trad_pop', 'sofia', 1962, 3, 'BGR'],
  ['Valya Balkanska', 'folk', 'sofia', 1968, 3, 'BGR'],
  ['Le Mystère des Voix Bulgares', 'folk', 'sofia', 1975, 3, 'BGR'],
  ['Azis', 'chalga', 'sofia', 1993, 3, 'BGR'],
  // Iugoslávia e sucessores
  ['Zdravko Čolić', 'trad_pop', 'sarajevo', 1970, 2, 'BIH'],
  ['Riblja Čorba', 'hard_rock', 'belgrade', 1979, 2, 'SRB'],
  ['Parni Valjak', 'hard_rock', 'zagreb', 1975, 2, 'HRV'],
  ['Azra', 'new_wave', 'zagreb', 1980, 3, 'HRV'],
  ['Idoli', 'new_wave', 'belgrade', 1981, 3, 'SRB', 1985],
  ['Lepa Brena', 'trad_pop', 'belgrade', 1982, 2, 'SRB'],
  ['Ceca', 'turbo_folk', 'belgrade', 1988, 2, 'SRB'],
  ['Laibach', 'post_punk', 'ljubljana', 1980, 2, 'SVN'],
  ['Zabranjeno Pušenje', 'new_wave', 'sarajevo', 1984, 3, 'BIH'],
  ['Bajaga i Instruktori', 'pop_rock', 'belgrade', 1984, 3, 'SRB'],
  // Bálticos
  ['Raimonds Pauls', 'trad_pop', 'riga', 1964, 3, 'LVA'],
  ['Prāta Vētra', 'pop_rock', 'riga', 1994, 3, 'LVA'],
  ['Ruja', 'prog', 'tallinn', 1978, 3, 'EST'],
  // URSS, Rússia, Ucrânia, RDA
  ['Mashina Vremeni', 'russian_rock', 'moscow', 1979, 2, 'RUS'],
  ['DDT', 'russian_rock', 'st_petersburg', 1987, 2, 'RUS'],
  ['Nautilus Pompilius', 'russian_rock', 'moscow', 1985, 2, 'RUS', 1997],
  ['Zemfira', 'alt_rock', 'moscow', 1999, 2, 'RUS'],
  ['Leningrad', 'punk', 'st_petersburg', 1997, 2, 'RUS'],
  ['Alisa', 'russian_rock', 'st_petersburg', 1985, 3, 'RUS'],
  ['Grazhdanskaya Oborona', 'punk', 'moscow', 1984, 3, 'RUS'],
  ['Mumiy Troll', 'alt_rock', 'moscow', 1997, 3, 'RUS'],
  ['Sofia Rotaru', 'trad_pop', 'kyiv', 1968, 1, 'UKR'],
  ['Okean Elzy', 'pop_rock', 'lviv', 1998, 2, 'UKR'],
  ['Ruslana', 'dance_pop', 'lviv', 1996, 2, 'UKR'],
  ['Jamala', 'pop_rnb', 'kyiv', 2011, 2, 'UKR'],
  ['Kalush Orchestra', 'hiphop', 'kyiv', 2019, 2, 'UKR'],
  ['Puhdys', 'pop_rock', 'berlin', 1973, 3, 'DEU'],
  ['City', 'art_rock', 'berlin', 1977, 3, 'DEU'],
];

const NORDIC: Row[] = [
  // Suécia
  ['Cornelis Vreeswijk', 'folk', 'stockholm', 1964, 3, 'SWE'],
  ['Ulf Lundell', 'pop_rock', 'stockholm', 1975, 3, 'SWE'],
  ['The Cardigans', 'indie', 'malmo', 1994, 2, 'SWE'],
  ['The Hives', 'garage_rock', 'stockholm', 1997, 2, 'SWE'],
  ['Refused', 'hardcore_punk', 'stockholm', 1994, 3, 'SWE'],
  ['First Aid Kit', 'folk', 'stockholm', 2008, 2, 'SWE'],
  ['Lykke Li', 'indie', 'stockholm', 2008, 2, 'SWE'],
  ['Neneh Cherry', 'hiphop', 'stockholm', 1988, 2, 'SWE'],
  ['Dr. Alban', 'eurodance', 'stockholm', 1990, 3, 'SWE'],
  ['Opeth', 'death_metal', 'stockholm', 1995, 2, 'SWE'],
  ['In Flames', 'death_metal', 'gothenburg', 1994, 2, 'SWE'],
  ['At the Gates', 'death_metal', 'gothenburg', 1991, 3, 'SWE'],
  ['Meshuggah', 'death_metal', 'stockholm', 1991, 3, 'SWE'],
  ['Ghost', 'heavy_metal', 'stockholm', 2010, 2, 'SWE'],
  ['Lasse Stefanz', 'dansband', 'malmo', 1975, 3, 'SWE'],
  // Noruega
  ['Röyksopp', 'house', 'tromso', 1998, 2, 'NOR'],
  ['Turbonegro', 'punk', 'oslo', 1989, 3, 'NOR'],
  ['Jan Garbarek', 'cool_jazz', 'oslo', 1967, 2, 'NOR'],
  ['Sigrid', 'dance_pop', 'bergen', 2017, 2, 'NOR'],
  ['Susanne Sundfør', 'synthpop', 'oslo', 2007, 3, 'NOR'],
  ['Wardruna', 'folk', 'bergen', 2009, 3, 'NOR'],
  ['Darkthrone', 'black_metal', 'oslo', 1991, 3, 'NOR'],
  ['Enslaved', 'black_metal', 'bergen', 1991, 3, 'NOR'],
  // Dinamarca
  ['Volbeat', 'heavy_metal', 'copenhagen', 2005, 2, 'DNK'],
  ['Mew', 'indie', 'copenhagen', 1997, 3, 'DNK'],
  ['D-A-D', 'hard_rock', 'copenhagen', 1986, 3, 'DNK'],
  ["Gasolin'", 'pop_rock', 'copenhagen', 1971, 2, 'DNK', 1978],
  ['Kim Larsen', 'pop_rock', 'copenhagen', 1973, 2, 'DNK'],
  ['Alphabeat', 'dance_pop', 'copenhagen', 2007, 3, 'DNK'],
  ['Medina', 'dance_pop', 'copenhagen', 2007, 3, 'DNK'],
  ['King Diamond', 'heavy_metal', 'copenhagen', 1985, 3, 'DNK'],
  // Finlândia
  ['HIM', 'hard_rock', 'helsinki', 1997, 2, 'FIN', 2017],
  ['Apocalyptica', 'heavy_metal', 'helsinki', 1996, 2, 'FIN'],
  ['Hanoi Rocks', 'glam', 'helsinki', 1981, 2, 'FIN'],
  ['Children of Bodom', 'death_metal', 'helsinki', 1997, 2, 'FIN', 2019],
  ['Eppu Normaali', 'pop_rock', 'tampere', 1979, 3, 'FIN'],
  ["Bomfunk MC's", 'hiphop', 'helsinki', 1999, 3, 'FIN'],
  ['Darude', 'trance', 'helsinki', 1999, 2, 'FIN'],
  ['Käärijä', 'dance_pop', 'helsinki', 2019, 3, 'FIN'],
  // Islândia
  ['Of Monsters and Men', 'indie', 'reykjavik', 2011, 2, 'ISL'],
  ['Kaleo', 'blues_rock', 'reykjavik', 2012, 2, 'ISL'],
  ['Ólafur Arnalds', 'minimalism', 'reykjavik', 2007, 3, 'ISL'],
  ['Hatari', 'synthpop', 'reykjavik', 2017, 3, 'ISL'],
  ['Emilíana Torrini', 'indie', 'reykjavik', 1995, 3, 'ISL'],
  ['Mezzoforte', 'fusion', 'reykjavik', 1979, 3, 'ISL'],
  ['Laufey', 'vocal_jazz', 'reykjavik', 2021, 2, 'ISL'],
  ['GusGus', 'house', 'reykjavik', 1995, 3, 'ISL'],
];

const AL: Record<string, RealRelease[]> = {
  Omega: [['10000 lépés', 1969]],
  Laibach: [['Opus Dei', 1987]],
  'Riblja Čorba': [['Kost u grlu', 1979]],
  Zemfira: [['Zemfira', 1999]],
  'Okean Elzy': [['Tam, de nas nemaye', 1998]],
  'The Cardigans': [['First Band on the Moon', 1996], ['Gran Turismo', 1998]],
  'The Hives': [['Veni Vidi Vicious', 2000]],
  Opeth: [['Blackwater Park', 2001]],
  'In Flames': [['The Jester Race', 1996]],
  Röyksopp: [['Melody A.M.', 2001]],
  Darkthrone: [['A Blaze in the Northern Sky', 1992]],
  Volbeat: [['Rock the Rebel / Metal the Devil', 2007]],
  HIM: [['Love Metal', 2003]],
  Apocalyptica: [['Plays Metallica by Four Cellos', 1996]],
  'Of Monsters and Men': [['My Head Is an Animal', 2011]],
  Kaleo: [['A/B', 2016]],
  Ghost: [['Opus Eponymous', 2010]],
  'Jan Garbarek': [['Officium', 1994]],
  'Ólafur Arnalds': [['Eulogy for Evolution', 2007]],
};

export const PACK: Pack19 = { id: 'wp_d1', artists: [...mk(EAST, AL), ...mk(NORDIC, AL)] };
