// Rodada 16 — formações reais: carreiras solo (paralelas ou depois da banda), bandas novas e supergrupos formados
// por quem saiu de outra banda, e renomes de bandas. As pessoas são as MESMAS dos outros atos (realworld.canonical
// une pelo nome real + nascimento), então a fama e o histórico seguem a pessoa.
// A lista entra no FIM de REAL_ALL (catalogNo estável); nomes que já existem nas listas anteriores são descartados.
import type { RealArtist, RealMember, RealRole } from './realtypes';

const R: Record<string, RealRole> = { v: 'vocal', g: 'guitar', b: 'bass', d: 'drums', k: 'keys', h: 'horns', j: 'dj', p: 'producer', m: 'mc', s: 'strings' };
const U = undefined;
const al = (a: string[]): RealArtist['al'] => a.map((x) => { const [t, y, k] = x.split('|'); return (k ? [t, +y, k === 's' ? 'single' : 'ep'] : [t, +y]) as NonNullable<RealArtist['al']>[number]; });
/** solo: nome, gênero, cidade, país, estreia, fim (0 = ativo), fama t, nascimento, morte (0), papel, discos "Título|ano[|s|e]" */
const so = (n: string, g: string, c: string, cn: string, d: number, e: number, t: 1 | 2 | 3, b: number, x: number, r: string, a: string[]): RealArtist =>
  ({ n, g, c, cn, d, ...(e ? { e } : {}), t, b, ...(x ? { x } : {}), r: R[r], al: al(a) });
/** integrante: "Nome:papel:nasc:morte:entrou:saiu" (campos vazios = desconhecido) */
const mm = (x: string): RealMember => { const p = x.split(':'); const n = (i: number) => (p[i] ? +p[i] : U); return [p[0], R[p[1]], n(2), n(3), n(4), n(5)]; };
const bd = (n: string, g: string, c: string, cn: string, d: number, e: number, t: 1 | 2 | 3, m: string, a: string[], rj?: [number, number?][]): RealArtist =>
  ({ n, g, c, cn, d, ...(e ? { e } : {}), ...(rj ? { rj } : {}), t, m: m.split('|').map(mm), al: al(a) });

export const REAL_L16: RealArtist[] = [
  // ---- quem saiu (ou seguiu em paralelo) de bandas globais
  so('Phil Collins', 'pop_rock', 'london', 'GBR', 1981, 0, 1, 1951, 0, 'd', ['Face Value|1981', 'Hello, I Must Be Going!|1982', 'No Jacket Required|1985', '...But Seriously|1989']),
  so('Ozzy Osbourne', 'heavy_metal', 'birmingham', 'GBR', 1980, 2025, 1, 1948, 2025, 'v', ['Blizzard of Ozz|1980', 'Diary of a Madman|1981', 'No More Tears|1991']),
  so('Gwen Stefani', 'dance_pop', 'los_angeles', 'USA', 2004, 0, 1, 1969, 0, 'v', ['Love. Angel. Music. Baby.|2004', 'The Sweet Escape|2006']),
  so('John Lennon', 'pop_rock', 'liverpool', 'GBR', 1970, 1980, 1, 1940, 1980, 'v', ['John Lennon/Plastic Ono Band|1970', 'Imagine|1971', 'Double Fantasy|1980']),
  so('Paul McCartney', 'pop_rock', 'liverpool', 'GBR', 1970, 0, 1, 1942, 0, 'b', ['McCartney|1970', 'Ram|1971', 'McCartney II|1980', 'Tug of War|1982', 'Flaming Pie|1997', 'Egypt Station|2018']),
  bd('Wings', 'pop_rock', 'london', 'GBR', 1971, 1981, 1, 'Paul McCartney:b:1942|Linda McCartney:k:1941:1998|Denny Laine:g:1944:2023', ['Wild Life|1971', 'Band on the Run|1973', 'Venus and Mars|1975', 'Mull of Kintyre|1977|s']),
  so('George Harrison', 'pop_rock', 'liverpool', 'GBR', 1970, 2001, 1, 1943, 2001, 'g', ['All Things Must Pass|1970', 'Living in the Material World|1973', 'Cloud Nine|1987']),
  so('Ringo Starr', 'pop_rock', 'liverpool', 'GBR', 1970, 0, 2, 1940, 0, 'd', ['Sentimental Journey|1970', 'Ringo|1973']),
  so('Mick Jagger', 'pop_rock', 'london', 'GBR', 1985, 0, 2, 1943, 0, 'v', ["She's the Boss|1985", 'Primitive Cool|1987', 'Wandering Spirit|1993']),
  so('Robert Plant', 'blues_rock', 'birmingham', 'GBR', 1982, 0, 2, 1948, 0, 'v', ['Pictures at Eleven|1982', 'The Principle of Moments|1983', 'Now and Zen|1988']),
  so('Freddie Mercury', 'pop_rock', 'london', 'GBR', 1985, 1991, 2, 1946, 1991, 'v', ['Mr. Bad Guy|1985', 'Barcelona|1988']),
  so('Diana Ross', 'soul', 'detroit', 'USA', 1970, 0, 1, 1944, 0, 'v', ['Diana Ross|1970', "Ain't No Mountain High Enough|1970|s", 'Diana|1980']),
  so('Jermaine Jackson', 'soul', 'los_angeles', 'USA', 1972, 0, 3, 1954, 0, 'b', ['Jermaine|1972', "Let's Get Serious|1980"]),
  so('Stevie Nicks', 'soft_rock', 'los_angeles', 'USA', 1981, 0, 2, 1948, 0, 'v', ['Bella Donna|1981', 'The Wild Heart|1983']),
  so('Morrissey', 'indie', 'manchester', 'GBR', 1988, 0, 2, 1959, 0, 'v', ['Viva Hate|1988', 'Vauxhall and I|1994', 'You Are the Quarry|2004']),
  bd('Dio', 'heavy_metal', 'los_angeles', 'USA', 1983, 2010, 2, 'Ronnie James Dio:v:1942:2010|Vivian Campbell:g:1962::1983:1986|Jimmy Bain:b:1947:2016|Vinny Appice:d:1957', ['Holy Diver|1983', 'The Last in Line|1984']),
  bd('Commodores', 'funk', 'detroit', 'USA', 1974, 0, 2, 'Lionel Richie:v:1949::1968:1982|Walter Orange:d:1946|Milan Williams:k:1948:2006::1989|William King:h:1949|Thomas McClary:g:1949::1968:1983|Ronald LaPread:b:1946::1968:1986', ['Machine Gun|1974', 'Easy|1977|s', 'Three Times a Lady|1978|s', 'Nightshift|1985|s']),
  so('Art Garfunkel', 'soft_rock', 'new_york', 'USA', 1973, 0, 2, 1941, 0, 'v', ['Angel Clare|1973', 'Breakaway|1975']),
  so('Annie Lennox', 'synthpop', 'london', 'GBR', 1992, 0, 2, 1954, 0, 'v', ['Diva|1992', 'Medusa|1995']),
  so('Kelly Rowland', 'pop_rnb', 'houston', 'USA', 2002, 0, 2, 1981, 0, 'v', ['Simply Deep|2002', 'Ms. Kelly|2007']),
  so('Fergie', 'pop_rnb', 'los_angeles', 'USA', 2006, 0, 2, 1975, 0, 'v', ['The Dutchess|2006']),
  so('Bruce Dickinson', 'heavy_metal', 'london', 'GBR', 1990, 0, 3, 1958, 0, 'v', ['Tattooed Millionaire|1990', 'The Chemical Wedding|1998']),
  so('David Lee Roth', 'hard_rock', 'los_angeles', 'USA', 1985, 0, 2, 1954, 0, 'v', ['Crazy from the Heat|1985|e', "Eat 'Em and Smile|1986"]),
  so('Zayn', 'pop_rnb', 'london', 'GBR', 2016, 0, 1, 1993, 0, 'v', ['Mind of Mine|2016', 'Icarus Falls|2018']),
  so('Niall Horan', 'pop_rock', 'dublin', 'IRL', 2017, 0, 2, 1993, 0, 'v', ['Flicker|2017', 'The Show|2023']),
  so('Louis Tomlinson', 'pop_rock', 'london', 'GBR', 2020, 0, 2, 1991, 0, 'v', ['Walls|2020', 'Faith in the Future|2022']),
  so('Liam Payne', 'pop_rnb', 'london', 'GBR', 2019, 2024, 2, 1993, 2024, 'v', ['LP1|2019']),
  so('Geri Halliwell', 'dance_pop', 'london', 'GBR', 1999, 0, 2, 1972, 0, 'v', ['Schizophonic|1999']),
  so('Melanie C', 'pop_rock', 'liverpool', 'GBR', 1999, 0, 2, 1974, 0, 'v', ['Northern Star|1999']),
  bd('Soulfly', 'nu_metal', 'los_angeles', 'USA', 1998, 0, 2, 'Max Cavalera:v:1969|Marc Rizzo:g:1977::2003:2022|Zyon Cavalera:d:1993::2012:2022', ['Soulfly|1998', 'Primitive|2000']),
  bd('Public Image Ltd', 'post_punk', 'london', 'GBR', 1978, 0, 2, 'John Lydon:v:1956|Keith Levene:g:1957:2022::1983|Jah Wobble:b:1958:::1980', ['First Issue|1978', 'Metal Box|1979']),
  bd('Stone Temple Pilots', 'grunge', 'los_angeles', 'USA', 1992, 0, 2, 'Scott Weiland:v:1967:2015::2013|Dean DeLeo:g:1961|Robert DeLeo:b:1966|Eric Kretz:d:1966', ['Core|1992', 'Purple|1994']),
  bd('Audioslave', 'alt_rock', 'los_angeles', 'USA', 2002, 2007, 1, 'Chris Cornell:v:1964:2017|Tom Morello:g:1964|Tim Commerford:b:1968|Brad Wilk:d:1968', ['Audioslave|2002', 'Out of Exile|2005', 'Revelations|2006'], [[2017, 2017]]),
  bd('Velvet Revolver', 'hard_rock', 'los_angeles', 'USA', 2004, 2008, 1, 'Scott Weiland:v:1967:2015|Slash:g:1965|Duff McKagan:b:1964|Matt Sorum:d:1960|Dave Kushner:g:1966', ['Contraband|2004', 'Libertad|2007']),
  so('Chris Cornell', 'alt_rock', 'seattle', 'USA', 1999, 2017, 2, 1964, 2017, 'v', ['Euphoria Morning|1999', 'Higher Truth|2015']),
  so('Gustavo Cerati', 'rock_latino', 'buenos_aires', 'ARG', 1993, 2010, 2, 1959, 2014, 'v', ['Amor Amarillo|1993', 'Bocanada|1999', 'Fuerza natural|2009']),
  so('Thom Yorke', 'idm', 'london', 'GBR', 2006, 0, 2, 1968, 0, 'v', ['The Eraser|2006', 'Anima|2019']),
  bd('The Smile', 'alt_rock', 'london', 'GBR', 2022, 0, 2, 'Thom Yorke:v:1968|Jonny Greenwood:g:1971|Tom Skinner:d:1979', ['A Light for Attracting Attention|2022', 'Wall of Eyes|2024']),
  so('Liam Gallagher', 'britpop', 'manchester', 'GBR', 2017, 0, 1, 1972, 0, 'v', ['As You Were|2017', 'Why Me? Why Not.|2019']),
  bd('Beady Eye', 'britpop', 'manchester', 'GBR', 2011, 2014, 2, 'Liam Gallagher:v:1972|Gem Archer:g:1966|Andy Bell:g:1970|Chris Sharrock:d:1964', ['Different Gear, Still Speeding|2011', 'BE|2013']),
  bd("Noel Gallagher's High Flying Birds", 'britpop', 'manchester', 'GBR', 2011, 0, 2, 'Noel Gallagher:g:1967', ["Noel Gallagher's High Flying Birds|2011", 'Chasing Yesterday|2015']),
  so('Ian Brown', 'britpop', 'manchester', 'GBR', 1998, 0, 2, 1963, 0, 'v', ['Unfinished Monkey Business|1998']),
  so('Jack White', 'garage_rock', 'detroit', 'USA', 2012, 0, 2, 1975, 0, 'g', ['Blunderbuss|2012', 'Lazaretto|2014']),
  bd('The Raconteurs', 'garage_rock', 'detroit', 'USA', 2006, 0, 2, 'Jack White:g:1975|Brendan Benson:v:1970|Jack Lawrence:b:1976|Patrick Keeler:d:1977', ['Broken Boy Soldiers|2006', 'Consolers of the Lonely|2008']),
  so('Iggy Pop', 'punk', 'detroit', 'USA', 1977, 0, 2, 1947, 0, 'v', ['The Idiot|1977', 'Lust for Life|1977', 'Blah-Blah-Blah|1986']),
  so('Syd Barrett', 'psychedelic', 'london', 'GBR', 1970, 1972, 3, 1946, 2006, 'g', ['The Madcap Laughs|1970', 'Barrett|1970']),
  so('Roger Waters', 'art_rock', 'london', 'GBR', 1984, 0, 2, 1943, 0, 'b', ['The Pros and Cons of Hitch Hiking|1984', 'Amused to Death|1992']),
  so('David Gilmour', 'art_rock', 'london', 'GBR', 1978, 0, 2, 1946, 0, 'g', ['David Gilmour|1978', 'On an Island|2006']),
  so('Bryan Ferry', 'art_rock', 'london', 'GBR', 1973, 0, 2, 1945, 0, 'v', ['These Foolish Things|1973', 'Boys and Girls|1985']),
  so('John Cale', 'art_rock', 'new_york', 'GBR', 1970, 0, 3, 1942, 0, 's', ['Vintage Violence|1970', 'Paris 1919|1973']),
  so('Peter Tosh', 'reggae', 'kingston', 'JAM', 1976, 1987, 2, 1944, 1987, 'g', ['Legalize It|1976', 'Equal Rights|1977']),
  so('Bunny Wailer', 'reggae', 'kingston', 'JAM', 1976, 2021, 3, 1947, 2021, 'v', ['Blackheart Man|1976']),
  bd('The Sugarcubes', 'indie', 'reykjavik', 'ISL', 1986, 1992, 2, 'Björk:v:1965|Einar Örn Benediktsson:h:1962|Þór Eldon:g:1962|Bragi Ólafsson:b:1962|Sigtryggur Baldursson:d:1962', ["Life's Too Good|1988", 'Stick Around for Joy|1992']),
  // ---- k-pop: solos paralelos ao grupo
  so('G-Dragon', 'kpop', 'seoul', 'KOR', 2009, 0, 1, 1988, 0, 'm', ['Heartbreaker|2009', 'Übermensch|2025']),
  so('Taeyang', 'kpop', 'seoul', 'KOR', 2008, 0, 2, 1988, 0, 'v', ['Hot|2008|e', 'Solar|2010']),
  so('Jungkook', 'kpop', 'seoul', 'KOR', 2023, 0, 1, 1997, 0, 'v', ['Golden|2023']),
  so('Jimin', 'kpop', 'seoul', 'KOR', 2023, 0, 1, 1995, 0, 'v', ['Face|2023|e', 'Muse|2024']),
  so('V', 'kpop', 'seoul', 'KOR', 2023, 0, 2, 1995, 0, 'v', ['Layover|2023|e']),
  so('Rosé', 'kpop', 'seoul', 'KOR', 2021, 0, 1, 1997, 0, 'v', ['R|2021|e', 'Rosie|2024']),
  so('Jennie', 'kpop', 'seoul', 'KOR', 2018, 0, 1, 1996, 0, 'm', ['Solo|2018|s', 'Ruby|2025']),
  so('Lisa', 'kpop', 'seoul', 'THA', 2021, 0, 1, 1997, 0, 'm', ['Lalisa|2021|e', 'Alter Ego|2025']),
  // ---- América Latina e Brasil
  bd('Menudo', 'teen_pop', 'san_juan', 'PRI', 1977, 1997, 2, 'Ricky Meléndez:v:1967:::1983|Johnny Lozada:v:1967::1980:1985|Charlie Massó:v:1969::1983:1987|Ricky Martin:v:1971::1984:1989|Robi Draco Rosa:v:1969::1984:1987', ['Reaching Out|1984', 'Menudo|1985']),
  so('Arnaldo Antunes', 'mpb', 'sao_paulo', 'BRA', 1993, 0, 2, 1960, 0, 'v', ['Nome|1993', 'O Silêncio|1996', 'Paradeiro|2001']),
  so('Renato Russo', 'rock_br', 'brasilia', 'BRA', 1994, 1996, 2, 1960, 1996, 'v', ['The Stonewall Celebration Concert|1994', 'Equilíbrio Distante|1995']),
  so('Nando Reis', 'rock_br', 'sao_paulo', 'BRA', 1995, 0, 2, 1963, 0, 'b', ['12 de Janeiro|1995', 'Para Quando o Arco-Íris Encontrar o Pote de Ouro|2000', 'A Letra A|2003']),
  so('Frejat', 'rock_br', 'rio', 'BRA', 2001, 0, 2, 1962, 0, 'g', ['Amor pra Recomeçar|2001']),
  so('Paulo Ricardo', 'rock_br', 'sao_paulo', 'BRA', 1989, 0, 3, 1962, 0, 'v', ['Paulo Ricardo|1989']),
  so('Moraes Moreira', 'mpb', 'salvador', 'BRA', 1975, 2020, 2, 1947, 2020, 'v', ['Moraes Moreira|1975', 'Pombo Correio|1977|s']),
  so('Baby do Brasil', 'mpb', 'rio', 'BRA', 1978, 0, 2, 1952, 0, 'v', ['O Que Vier Eu Traço|1978', 'Menino do Rio|1979|s']),
  so('Pepeu Gomes', 'rock_br', 'salvador', 'BRA', 1978, 0, 3, 1952, 0, 'g', ['Geração de Som|1978']),
  bd('Vímana', 'rock_br', 'rio', 'BRA', 1974, 1978, 3, 'Lulu Santos:g:1953|Lobão:d:1957|Fernando Gama:b|Ritchie:k:1952::1975', ['Zebra|1977|s']),
  bd('Doces Bárbaros', 'mpb', 'salvador', 'BRA', 1976, 1976, 2, 'Caetano Veloso:v:1942|Gilberto Gil:v:1942|Gal Costa:v:1945:2022|Maria Bethânia:v:1946', ['Doces Bárbaros|1976']),
];

/** Bandas que mudaram de nome (nome antigo, ano, nome novo). Nome antigo = `n` dos dados reais. */
export const RENAMES16: [string, number, string][] = [
  ['The Jackson 5', 1975, 'The Jacksons'],
];

/** Grafias diferentes da mesma pessoa (somadas aos apelidos de realworld). */
export const ALIASES16: Record<string, string> = {
  'melanie chisholm': 'melanie c',
  'john lydon': 'johnny rotten',
  'baby consuelo': 'baby do brasil',
  'zayn malik': 'zayn',
  'robi rosa': 'robi draco rosa',
};
