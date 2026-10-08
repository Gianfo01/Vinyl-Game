// Países com mercado musical próprio (rodada 7): população, poder de compra, gosto musical por época,
// preferência por formato físico, idiomas, paradas e prêmios nacionais. Valores aproximados por ano-chave e
// interpolados; servem para as paradas por país, os prêmios nacionais e a ficha de país no Mundo.
//
// População em milhões. Poder de compra relativo aos EUA (1 = EUA no mesmo ano). Gosto: peso 0..2 por
// família de gênero (ausente = 0,5).

import type { FamilyId, MarketId } from './world';

type Curve = [number, number][];
type Taste = [number, Partial<Record<FamilyId, number>>][];

export interface CountryInfo {
  a3: string;
  market: MarketId;
  pop: Curve;
  buy: Curve;
  taste: Taste;
  /** multiplicador da fatia física (Japão e Alemanha compram CD por mais tempo) */
  physical?: number;
  /** idiomas principais */
  lang: string[];
  /** parada: [nome fictício, nome real] */
  chart: [string, string];
  /** prêmio nacional: [nome fictício, nome real, ano de criação] */
  award?: [string, string, number];
  /** fato curto por época */
  notes?: [number, string, string][];
}

const P = (...v: number[]): Curve => [1920, 1950, 1980, 2000, 2020, 2040].map((y, i) => [y, v[i]]);
const B = (...v: number[]): Curve => [1920, 1960, 1990, 2020, 2040].map((y, i) => [y, v[i]]);

export const COUNTRY_INFO: CountryInfo[] = [
  {
    a3: 'USA', market: 'na', pop: P(106, 152, 227, 282, 331, 355), buy: B(1, 1, 1, 1, 1), lang: ['en'],
    taste: [[1920, { blues_jazz: 1.6, country_folk: 1.1, sacred: 1 }], [1955, { rnb: 1.3, rock: 1.4, country_folk: 1.2, pop: 1.2 }], [1975, { rock: 1.5, rnb: 1.4, pop: 1.2, country_folk: 1.1 }], [1995, { hiphop: 1.5, pop: 1.4, rock: 1.2, rnb: 1.4, country_folk: 1.2 }], [2015, { hiphop: 1.7, pop: 1.4, country_folk: 1.2, latin: 0.9, electronic: 0.9 }], [2030, { hiphop: 1.5, pop: 1.4, latin: 1.1, country_folk: 1.2 }]],
    chart: ['WorldSound 100 EUA', 'Billboard Hot 100'], award: ['Gramófono Americano', 'Grammy Awards', 1959],
    notes: [[1920, 'Era do fonógrafo e das big bands.', 'Phonograph and big-band era.'], [1955, 'Rock\'n\'roll e o adolescente consumidor.', 'Rock\'n\'roll and the teenage consumer.'], [1991, 'SoundScan muda a parada: rap e country sobem.', 'SoundScan changes the chart: rap and country rise.'], [2017, 'Hip hop vira o gênero mais consumido.', 'Hip hop becomes the most consumed genre.']],
  },
  {
    a3: 'CAN', market: 'na', pop: P(8.8, 14, 24.5, 30.7, 38, 44), buy: B(0.8, 0.85, 0.85, 0.85, 0.85), lang: ['en', 'fr'],
    taste: [[1920, { country_folk: 1.1, blues_jazz: 1 }], [1965, { rock: 1.4, country_folk: 1.2, pop: 1.1 }], [1995, { rock: 1.2, pop: 1.3, hiphop: 1.1 }], [2015, { hiphop: 1.4, pop: 1.4, rock: 1 }]],
    chart: ['Parada do Canadá', 'Canadian Hot 100'], award: ['Prêmio Bordo', 'Juno Awards', 1970],
  },
  {
    a3: 'MEX', market: 'latam', pop: P(14.5, 28, 69, 98, 128, 143), buy: B(0.15, 0.2, 0.25, 0.28, 0.32), lang: ['es'],
    taste: [[1920, { latin: 1.8 }], [1960, { latin: 1.7, pop: 1 }], [1985, { latin: 1.6, rock: 1, pop: 1.2 }], [2010, { latin: 1.8, caribbean: 1.3, pop: 1.1 }], [2020, { latin: 1.9, caribbean: 1.5 }]],
    chart: ['Parada do México', 'Monitor Latino México'], award: ['Prêmio Águia Asteca', 'Premios Lo Nuestro', 1989],
    notes: [[1940, 'Era de ouro do cinema e da ranchera.', 'Golden age of film and ranchera.'], [2022, 'Corridos tumbados dominam o streaming.', 'Corridos tumbados dominate streaming.']],
  },
  {
    a3: 'BRA', market: 'br', pop: P(30, 54, 121, 175, 213, 224), buy: B(0.12, 0.15, 0.18, 0.24, 0.27), lang: ['pt'],
    taste: [[1920, { brazil: 1.9, europe: 0.7 }], [1958, { brazil: 1.8, rock: 0.8, pop: 0.9 }], [1980, { brazil: 1.7, rock: 1.1, pop: 1.1 }], [2000, { brazil: 1.9, pop: 1, hiphop: 0.8 }], [2015, { brazil: 2, hiphop: 1, pop: 1, electronic: 0.9 }]],
    chart: ['Parada Brasil', 'Hot 100 Brasil (Crowley)'], award: ['Prêmio Sabiá', 'Prêmio da Música Brasileira', 1987],
    notes: [[1930, 'Rádio Nacional e a era de ouro do samba.', 'Rádio Nacional and the golden age of samba.'], [1965, 'Festivais da TV lançam a MPB.', 'TV festivals launch MPB.'], [1990, 'Sertanejo explode nas rádios.', 'Sertanejo explodes on radio.'], [2016, 'Sertanejo universitário e funk lideram o streaming.', 'Sertanejo universitário and funk lead streaming.']],
  },
  {
    a3: 'ARG', market: 'latam', pop: P(8.9, 17, 28, 37, 45, 48), buy: B(0.45, 0.35, 0.25, 0.25, 0.25), lang: ['es'],
    taste: [[1920, { latin: 1.9, europe: 1 }], [1965, { latin: 1.4, rock: 1.1, pop: 1 }], [1985, { rock: 1.5, latin: 1.3 }], [2015, { latin: 1.5, caribbean: 1.4, hiphop: 1.2 }]],
    chart: ['Parada Argentina', 'Billboard Argentina Hot 100'], award: ['Prêmio Bandoneón', 'Premios Gardel', 1999],
  },
  {
    a3: 'COL', market: 'latam', pop: P(6, 12, 27, 40, 51, 55), buy: B(0.08, 0.12, 0.16, 0.2, 0.24), lang: ['es'],
    taste: [[1920, { latin: 1.8 }], [1970, { latin: 1.8, caribbean: 1 }], [2000, { latin: 1.7, caribbean: 1.4, pop: 1.1 }], [2015, { caribbean: 1.9, latin: 1.6 }]],
    chart: ['Parada da Colômbia', 'Monitor Latino Colombia'], award: ['Prêmio Cumbia', 'Premios Nuestra Tierra', 2007],
  },
  {
    a3: 'CHL', market: 'latam', pop: P(3.7, 6, 11, 15.2, 19.2, 20), buy: B(0.2, 0.2, 0.2, 0.35, 0.4), lang: ['es'],
    taste: [[1920, { latin: 1.6, europe: 0.9 }], [1965, { latin: 1.4, country_folk: 1, rock: 1 }], [2000, { latin: 1.3, rock: 1.1, pop: 1.2 }], [2018, { caribbean: 1.6, latin: 1.4, hiphop: 1.3 }]],
    chart: ['Parada do Chile', 'Monitor Latino Chile'], award: ['Prêmio Andes', 'Premios Pulsar', 2015],
  },
  {
    a3: 'CUB', market: 'latam', pop: P(3, 5.9, 9.8, 11.1, 11.3, 10.8), buy: B(0.25, 0.2, 0.08, 0.06, 0.06), lang: ['es'],
    taste: [[1920, { latin: 2 }], [1960, { latin: 2, caribbean: 1 }], [2000, { latin: 1.9, caribbean: 1.5 }]],
    chart: ['Parada de Cuba', 'Lucas (Cuba)'], award: ['Prêmio Habanero', 'Premios Lucas', 1997],
  },
  {
    a3: 'JAM', market: 'latam', pop: P(0.86, 1.4, 2.1, 2.6, 2.8, 2.8), buy: B(0.12, 0.12, 0.12, 0.12, 0.13), lang: ['en'],
    taste: [[1920, { caribbean: 1.6, sacred: 1 }], [1960, { caribbean: 2, rnb: 1.2 }], [1990, { caribbean: 2, hiphop: 1.1 }]],
    chart: ['Parada da Jamaica', 'JARIA Charts'], award: ['Prêmio Kingston', 'JARIA Honour Awards', 2014],
  },
  {
    a3: 'GBR', market: 'eu', pop: P(44, 50, 56, 59, 67, 70), buy: B(0.8, 0.75, 0.8, 0.82, 0.8), lang: ['en'],
    taste: [[1920, { europe: 1.2, blues_jazz: 1.1, sacred: 1 }], [1957, { rock: 1.3, pop: 1.3 }], [1963, { rock: 1.7, pop: 1.4, rnb: 1.1 }], [1978, { rock: 1.6, pop: 1.4, electronic: 1, caribbean: 1.1 }], [1990, { electronic: 1.4, rock: 1.4, pop: 1.5 }], [2005, { pop: 1.5, rock: 1.2, hiphop: 1.1, electronic: 1.3 }], [2018, { hiphop: 1.4, pop: 1.5, electronic: 1.2, africa: 1 }]],
    chart: ['Parada Britânica', 'UK Singles Chart'], award: ['Prêmio Leão', 'BRIT Awards', 1977],
    notes: [[1952, 'Primeira parada de singles do país.', 'First national singles chart.'], [1964, 'A invasão britânica conquista o mundo.', 'The British Invasion conquers the world.'], [1994, 'Britpop e cultura rave.', 'Britpop and rave culture.']],
  },
  {
    a3: 'IRL', market: 'eu', pop: P(3.1, 3, 3.4, 3.8, 5, 5.6), buy: B(0.45, 0.5, 0.6, 0.95, 1), lang: ['en'],
    taste: [[1920, { europe: 1.2, country_folk: 1.3 }], [1965, { rock: 1.3, country_folk: 1.3, pop: 1.1 }], [2000, { pop: 1.4, rock: 1.3 }]],
    chart: ['Parada da Irlanda', 'Irish Singles Chart'], award: ['Prêmio Trevo', 'Choice Music Prize', 2005],
  },
  {
    a3: 'FRA', market: 'eu', pop: P(39, 42, 54, 59, 65, 68), buy: B(0.6, 0.6, 0.75, 0.75, 0.75), lang: ['fr'],
    taste: [[1920, { europe: 1.9, blues_jazz: 1.2 }], [1960, { europe: 1.8, pop: 1.2, rock: 1 }], [1985, { europe: 1.4, pop: 1.3, electronic: 1, africa: 1 }], [2000, { hiphop: 1.5, europe: 1.2, electronic: 1.4, pop: 1.2 }], [2015, { hiphop: 1.9, electronic: 1.2, africa: 1.3, pop: 1.1 }]],
    chart: ['Parada da França', 'SNEP Top Singles'], award: ['Prêmio Marianne', 'Victoires de la Musique', 1985],
    notes: [[1935, 'Chanson e cabarés de Paris.', 'Chanson and Paris cabarets.'], [1994, 'Lei de cotas de música em francês no rádio.', 'Radio quota law for French-language music.']],
  },
  {
    a3: 'DEU', market: 'eu', pop: P(61, 70, 78, 82, 83, 82), buy: B(0.55, 0.6, 0.85, 0.85, 0.82), lang: ['de'], physical: 1.4,
    taste: [[1920, { europe: 1.6, sacred: 1.3 }], [1955, { europe: 1.8, pop: 1.1 }], [1975, { europe: 1.5, electronic: 1.3, rock: 1.3, pop: 1.2 }], [1992, { electronic: 1.7, pop: 1.3, rock: 1.3 }], [2015, { hiphop: 1.6, pop: 1.3, electronic: 1.3, europe: 1.1 }]],
    chart: ['Parada da Alemanha', 'GfK Entertainment Charts'], award: ['Prêmio Águia de Ouro', 'ECHO / Deutscher Musikpreis', 1992],
  },
  {
    a3: 'ITA', market: 'eu', pop: P(37, 47, 56, 57, 59, 56), buy: B(0.4, 0.45, 0.7, 0.68, 0.66), lang: ['it'],
    taste: [[1920, { europe: 1.9, sacred: 1.2 }], [1958, { europe: 1.9, pop: 1.1 }], [1975, { europe: 1.6, rock: 1.2, pop: 1.2 }], [1985, { europe: 1.6, electronic: 1.2, pop: 1.3 }], [2015, { hiphop: 1.6, europe: 1.5, pop: 1.2 }]],
    chart: ['Parada da Itália', 'Classifica FIMI'], award: ['Prêmio Leão Alado', 'Targa Tenco', 1984],
    notes: [[1951, 'Nasce o Festival de Sanremo.', 'The Sanremo Festival is born.'], [1970, 'Era de ouro dos cantautori.', 'Golden age of the cantautori.'], [2017, 'Rap e trap italianos tomam o streaming.', 'Italian rap and trap take over streaming.']],
  },
  {
    a3: 'ESP', market: 'eu', pop: P(21, 28, 37.5, 40.5, 47, 47), buy: B(0.3, 0.3, 0.55, 0.6, 0.6), lang: ['es'],
    taste: [[1920, { europe: 1.5, latin: 1.2 }], [1970, { europe: 1.3, pop: 1.2, latin: 1.3 }], [1985, { rock: 1.3, pop: 1.3, latin: 1.3 }], [2015, { caribbean: 1.8, latin: 1.5, pop: 1.2 }]],
    chart: ['Parada da Espanha', 'PROMUSICAE'], award: ['Prêmio Touro', 'Premios de la Música', 1997],
  },
  {
    a3: 'PRT', market: 'eu', pop: P(6, 8.4, 9.8, 10.3, 10.3, 10), buy: B(0.2, 0.2, 0.4, 0.45, 0.45), lang: ['pt'],
    taste: [[1920, { europe: 1.9 }], [1975, { europe: 1.5, pop: 1.2, brazil: 1.2 }], [2010, { pop: 1.2, brazil: 1.4, africa: 1.3, hiphop: 1.2 }]],
    chart: ['Parada de Portugal', 'AFP Top Singles'], award: ['Prêmio Guitarra', 'Globos de Ouro', 1996],
  },
  {
    a3: 'NLD', market: 'eu', pop: P(6.8, 10, 14, 16, 17.4, 18), buy: B(0.6, 0.7, 0.85, 0.95, 0.95), lang: ['nl'],
    taste: [[1920, { europe: 1.3, blues_jazz: 1.1 }], [1965, { pop: 1.3, rock: 1.3 }], [1995, { electronic: 1.8, pop: 1.3 }], [2015, { electronic: 1.6, hiphop: 1.4, pop: 1.2 }]],
    chart: ['Parada da Holanda', 'Dutch Top 40'], award: ['Prêmio Tulipa', 'Edison Award', 1960],
  },
  {
    a3: 'SWE', market: 'eu', pop: P(5.9, 7, 8.3, 8.9, 10.3, 11), buy: B(0.6, 0.8, 0.85, 0.95, 0.95), lang: ['sv'],
    taste: [[1920, { europe: 1.5 }], [1972, { europe: 1.6, pop: 1.5 }], [1995, { pop: 1.7, rock: 1.2, electronic: 1.2 }], [2010, { pop: 1.6, electronic: 1.5, hiphop: 1.2 }]],
    chart: ['Parada da Suécia', 'Sverigetopplistan'], award: ['Prêmio Aurora', 'Grammis', 1969],
  },
  {
    a3: 'RUS', market: 'eu', pop: P(90, 103, 139, 146, 145, 140), buy: B(0.12, 0.2, 0.15, 0.25, 0.25), lang: ['ru'],
    taste: [[1920, { europe: 1.6, sacred: 1.3 }], [1980, { europe: 1.6, rock: 1.3, pop: 1.2 }], [2000, { pop: 1.4, europe: 1.3, rock: 1.1 }], [2015, { hiphop: 1.6, pop: 1.3 }]],
    chart: ['Parada da Rússia', 'TopHit'], award: ['Prêmio Estrela Vermelha', 'Muz-TV Awards', 2003],
  },
  {
    a3: 'POL', market: 'eu', pop: P(26, 25, 35.6, 38.3, 38, 35), buy: B(0.2, 0.2, 0.2, 0.45, 0.5), lang: ['pl'],
    taste: [[1920, { europe: 1.6, sacred: 1.2 }], [1980, { rock: 1.4, europe: 1.3 }], [2010, { pop: 1.3, hiphop: 1.4, rock: 1.1 }]],
    chart: ['Parada da Polônia', 'OLiS'], award: ['Prêmio Fryderyk', 'Fryderyk', 1995],
  },
  {
    a3: 'TUR', market: 'asia', pop: P(13, 21, 44, 64, 84, 90), buy: B(0.12, 0.15, 0.2, 0.3, 0.32), lang: ['tr'],
    taste: [[1920, { asia_me: 1.9 }], [1970, { asia_me: 1.8, rock: 1.1 }], [1995, { asia_me: 1.5, pop: 1.5 }], [2015, { pop: 1.4, hiphop: 1.4, asia_me: 1.3 }]],
    chart: ['Parada da Turquia', 'Türkiye Resmi Listesi'], award: ['Prêmio Bósforo', 'Altın Kelebek', 1972],
  },
  {
    a3: 'EGY', market: 'africa', pop: P(13, 21, 44, 69, 107, 130), buy: B(0.08, 0.08, 0.08, 0.1, 0.12), lang: ['ar'],
    taste: [[1920, { asia_me: 2 }], [1980, { asia_me: 1.9, pop: 1 }], [2015, { asia_me: 1.7, hiphop: 1.2, pop: 1.1 }]],
    chart: ['Parada do Egito', 'Billboard Arabia (Egito)'], award: ['Prêmio Nilo', 'Murex d\'Or', 2000],
  },
  {
    a3: 'NGA', market: 'africa', pop: P(18, 37, 74, 122, 206, 300), buy: B(0.03, 0.04, 0.04, 0.06, 0.09), lang: ['en', 'yo'],
    taste: [[1920, { africa: 1.8, sacred: 1.3 }], [1970, { africa: 2, rnb: 1.2 }], [2000, { africa: 1.8, hiphop: 1.3, rnb: 1.2 }], [2010, { africa: 2, caribbean: 1.2, hiphop: 1.3 }]],
    chart: ['Parada da Nigéria', 'TurnTable Top 100'], award: ['Prêmio Tambor Falante', 'The Headies', 2006],
    notes: [[1970, 'Afrobeat de Lagos.', 'Lagos afrobeat.'], [2010, 'Afrobeats vira exportação global.', 'Afrobeats becomes a global export.']],
  },
  {
    a3: 'GHA', market: 'africa', pop: P(2.3, 5, 11, 19, 31, 42), buy: B(0.04, 0.05, 0.05, 0.07, 0.09), lang: ['en', 'ak'],
    taste: [[1920, { africa: 1.9 }], [1990, { africa: 1.8, hiphop: 1.1 }], [2010, { africa: 2, caribbean: 1.1 }]],
    chart: ['Parada de Gana', 'Ghana Top 50'], award: ['Prêmio Ashanti', 'Ghana Music Awards', 2000],
  },
  {
    a3: 'ZAF', market: 'africa', pop: P(7, 13.6, 29, 45, 59, 67), buy: B(0.15, 0.15, 0.15, 0.17, 0.2), lang: ['en', 'zu'],
    taste: [[1920, { africa: 1.6, sacred: 1.4 }], [1965, { africa: 1.8, blues_jazz: 1.2 }], [1995, { africa: 1.6, electronic: 1.4, pop: 1.1 }], [2015, { africa: 1.9, electronic: 1.6 }]],
    chart: ['Parada da África do Sul', 'RiSA Top 100'], award: ['Prêmio Protea', 'SAMA Awards', 1995],
  },
  {
    a3: 'KEN', market: 'africa', pop: P(2.5, 6, 16, 31, 54, 73), buy: B(0.03, 0.04, 0.04, 0.06, 0.08), lang: ['sw', 'en'],
    taste: [[1920, { africa: 1.8 }], [1990, { africa: 1.8, caribbean: 1.2 }], [2015, { africa: 1.9, hiphop: 1.2 }]],
    chart: ['Parada do Quênia', 'Kenya Top 50'], award: ['Prêmio Savana', 'Groove Awards', 2004],
  },
  {
    a3: 'IND', market: 'asia', pop: P(250, 360, 700, 1050, 1400, 1560), buy: B(0.02, 0.02, 0.03, 0.07, 0.12), lang: ['hi'],
    taste: [[1920, { asia_me: 2 }], [1950, { asia_me: 2 }], [2000, { asia_me: 1.9, pop: 1, hiphop: 0.9 }], [2018, { asia_me: 1.8, hiphop: 1.3, pop: 1.1 }]],
    chart: ['Parada da Índia', 'IMI International Top 20'], award: ['Prêmio Lótus', 'Filmfare Awards (música)', 1954],
    notes: [[1950, 'As trilhas de Bollywood são a música popular do país.', 'Bollywood soundtracks are the nation\'s pop music.']],
  },
  {
    a3: 'JPN', market: 'asia', pop: P(56, 84, 117, 127, 126, 115), buy: B(0.25, 0.3, 0.95, 0.75, 0.7), lang: ['ja'], physical: 1.9,
    taste: [[1920, { asia_me: 1.8, europe: 1, sacred: 1 }], [1955, { asia_me: 1.8, pop: 1.1, blues_jazz: 1.1 }], [1975, { asia_me: 1.6, pop: 1.5, rock: 1.1 }], [1990, { pop: 1.8, asia_me: 1.2, rock: 1.2 }], [2015, { pop: 1.8, asia_me: 1, rock: 1.2 }]],
    chart: ['Parada do Japão', 'Oricon'], award: ['Prêmio Sakura', 'Japan Record Award', 1959],
    notes: [[1980, 'City pop e o walkman.', 'City pop and the Walkman.'], [2010, 'O CD resiste: maior mercado físico do mundo.', 'The CD holds on: biggest physical market in the world.']],
  },
  {
    a3: 'KOR', market: 'asia', pop: P(17, 20, 38, 47, 52, 50), buy: B(0.04, 0.05, 0.3, 0.6, 0.65), lang: ['ko'], physical: 1.5,
    taste: [[1920, { asia_me: 1.8 }], [1970, { asia_me: 1.7, pop: 1.1 }], [1995, { pop: 1.7, asia_me: 1.3, hiphop: 1.1 }], [2010, { pop: 2, hiphop: 1.3 }]],
    chart: ['Parada da Coreia', 'Circle Chart'], award: ['Prêmio Tigre', 'Golden Disc Awards', 1986],
  },
  {
    a3: 'CHN', market: 'asia', pop: P(470, 550, 980, 1260, 1410, 1350), buy: B(0.02, 0.02, 0.03, 0.2, 0.3), lang: ['zh'],
    taste: [[1920, { asia_me: 1.9 }], [1950, { asia_me: 1.9 }], [1985, { asia_me: 1.7, pop: 1.2, rock: 1 }], [2010, { pop: 1.6, asia_me: 1.4 }]],
    chart: ['Parada da China', 'Tencent Music Chart'], award: ['Prêmio Dragão', 'Chinese Music Awards', 2001],
  },
  {
    a3: 'IDN', market: 'asia', pop: P(50, 70, 148, 214, 274, 300), buy: B(0.03, 0.03, 0.05, 0.1, 0.14), lang: ['id'],
    taste: [[1920, { asia_me: 1.8 }], [1975, { asia_me: 1.7, pop: 1.1, rock: 1 }], [2010, { pop: 1.4, asia_me: 1.5 }]],
    chart: ['Parada da Indonésia', 'Billboard Indonesia'], award: ['Prêmio Garuda', 'Anugerah Musik Indonesia', 1997],
  },
  {
    a3: 'PHL', market: 'asia', pop: P(10, 19, 48, 78, 110, 128), buy: B(0.05, 0.05, 0.05, 0.08, 0.1), lang: ['tl', 'en'],
    taste: [[1920, { asia_me: 1.5, pop: 1 }], [1970, { pop: 1.4, asia_me: 1.3, rnb: 1.1 }], [2010, { pop: 1.6, rnb: 1.2, asia_me: 1.1 }]],
    chart: ['Parada das Filipinas', 'Billboard Philippines'], award: ['Prêmio Sampaguita', 'Awit Awards', 1969],
  },
  {
    a3: 'AUS', market: 'oceania', pop: P(5.4, 8.2, 14.7, 19, 25.7, 30), buy: B(0.8, 0.8, 0.8, 0.9, 0.9), lang: ['en'],
    taste: [[1920, { europe: 1.1, country_folk: 1.1 }], [1965, { rock: 1.5, pop: 1.3 }], [1990, { rock: 1.4, pop: 1.4 }], [2015, { pop: 1.4, hiphop: 1.3, electronic: 1.2 }]],
    chart: ['Parada da Austrália', 'ARIA Charts'], award: ['Prêmio Cruzeiro', 'ARIA Music Awards', 1987],
  },
  {
    a3: 'NZL', market: 'oceania', pop: P(1.2, 1.9, 3.1, 3.9, 5.1, 5.8), buy: B(0.8, 0.8, 0.65, 0.7, 0.7), lang: ['en'],
    taste: [[1920, { europe: 1.1 }], [1970, { rock: 1.3, pop: 1.3 }], [2000, { pop: 1.3, caribbean: 1.2, hiphop: 1.2 }]],
    chart: ['Parada da Nova Zelândia', 'Official NZ Music Chart'], award: ['Prêmio Kiwi', 'Aotearoa Music Awards', 1965],
  },
];

export const countryInfoByA3: Record<string, CountryInfo> = Object.fromEntries(COUNTRY_INFO.map((c) => [c.a3, c]));

function interp(curve: Curve, year: number): number {
  if (year <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    if (year <= curve[i][0]) {
      const [y0, v0] = curve[i - 1];
      const [y1, v1] = curve[i];
      return v0 + ((v1 - v0) * (year - y0)) / (y1 - y0);
    }
  }
  return curve[curve.length - 1][1];
}

export function countryPop(c: CountryInfo, year: number): number {
  return interp(c.pop, year);
}

export function countryBuy(c: CountryInfo, year: number): number {
  return interp(c.buy, year);
}

/** Gosto por família no ano (interpolado entre épocas; ausente = 0,5). */
export function countryTaste(c: CountryInfo, fam: FamilyId, year: number): number {
  const eras = c.taste;
  let i = 0;
  while (i + 1 < eras.length && eras[i + 1][0] <= year) i++;
  const a = eras[i];
  const b = eras[i + 1];
  const va = a[1][fam] ?? 0.5;
  if (!b || year <= a[0]) return va;
  const vb = b[1][fam] ?? 0.5;
  return va + ((vb - va) * (year - a[0])) / (b[0] - a[0]);
}

/** Tamanho do mercado musical do país (unidade relativa: milhões de "consumidores equivalentes"). */
export function countryMarketSize(c: CountryInfo, year: number): number {
  return countryPop(c, year) * countryBuy(c, year);
}
