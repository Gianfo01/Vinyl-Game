// R31 · onda 3 (Z) — BASE NOVA: artistas e bandas reais que faltavam (docs/r31/artistas-reliquias.md, A1 e A2).
// Entram no FIM de REAL_ALL (sim/sys/realworld.ts), depois de todos os lotes anteriores: o número de catálogo dos atos que
// já existiam não muda. Nome já presente na base é descartado no carregamento (dedupKey27).
// A curadoria de cada um (apelidos, tipo, anos, cidade, língua, fontes e campos a confirmar) fica em src/data/cur31.ts;
// o nome real tem registro em src/data/realnames31.ts (espaço 'cur'). Dado incerto: `ap` (aproximado, o ato continua no
// modo exato com a ficha dizendo "aproximado") ou `exact: false` (some do modo "Vida real exata").
// Gênero "infantil" ainda não existe (criar um gênero muda os sorteios do mundo inteiro): Xuxa, Balão Mágico, Trem da
// Alegria e Galinha Pintadinha ficam em teen_pop; Palavra Cantada e Bia Bedran em mpb — ver DECISOES (Z).
import type { RealArtist } from './realtypes';

export const BASE31_ACTS: RealArtist[] = [
  // ---------------------------------------------------------------- A1 · pedidos (TV, infantil, boy bands, axé, pop)
  { n: 'Eliana', g: 'teen_pop', c: 'sao_paulo', d: 1991, t: 3, cn: 'BRA', b: 1973, r: 'vocal', ap: ['d'], al: [['Os Dedinhos', 1993, 'single']] },
  { n: 'Angélica', g: 'teen_pop', c: 'rio', d: 1988, t: 3, cn: 'BRA', b: 1973, r: 'vocal', al: [['Angélica', 1988], ['Vou de Táxi', 1988, 'single']] },
  { n: 'Mara Maravilha', g: 'teen_pop', c: 'sao_paulo', d: 1987, t: 3, cn: 'BRA', b: 1968, r: 'vocal', ap: ['d'] },
  { n: 'Simony', g: 'teen_pop', c: 'sao_paulo', d: 1987, t: 3, cn: 'BRA', b: 1976, r: 'vocal', ap: ['d'] },
  { n: 'Turma do Balão Mágico', g: 'teen_pop', c: 'sao_paulo', d: 1982, e: 1986, t: 3, cn: 'BRA', ap: ['m'],
    m: [['Simony', 'vocal', 1976, undefined, 1982, 1986], ['Tob', 'vocal', undefined, undefined, 1982, 1986], ['Mike Biggs', 'vocal', 1974, undefined, 1982, 1986], ['Jairzinho', 'vocal', 1975, undefined, 1984, 1986]],
    al: [['A Turma do Balão Mágico', 1982]] },
  { n: 'Trem da Alegria', g: 'teen_pop', c: 'sao_paulo', d: 1985, e: 1992, t: 3, cn: 'BRA', exact: false, ap: ['m'],
    m: [['Patrícia Marx', 'vocal', 1974, undefined, 1985, 1988], ['Juninho Bill', 'vocal', undefined, undefined, 1985], ['Luciano Nassyn', 'vocal', undefined, undefined, 1985], ['Amanda Acosta', 'vocal', undefined, undefined, 1987]],
    al: [['Trem da Alegria', 1985]] },
  { n: 'Paquitas', g: 'teen_pop', c: 'rio', d: 1989, t: 3, cn: 'BRA', exact: false, al: [['Paquitas', 1989]] },
  { n: 'Netinho', g: 'axe', c: 'salvador', d: 1994, t: 3, cn: 'BRA', b: 1966, r: 'vocal', ap: ['d'], al: [['Milla', 1996, 'single']] },
  { n: 'KLB', g: 'boy_band', c: 'sao_paulo', d: 2000, t: 3, cn: 'BRA',
    m: [['Kiko', 'vocal'], ['Leandro', 'vocal'], ['Bruno', 'vocal']], al: [['KLB', 2000]] },
  { n: "Br'oz", g: 'boy_band', c: 'sao_paulo', d: 2003, e: 2005, t: 3, cn: 'BRA', exact: false, al: [["Br'oz", 2003]] },
  { n: 'Chiquititas', g: 'teen_pop', c: 'sao_paulo', d: 1997, e: 2001, t: 3, cn: 'BRA', exact: false, al: [['Chiquititas', 1997, 'lp', 'soundtrack']] },
  { n: 'Sérgio Mallandro', g: 'teen_pop', c: 'rio', d: 1986, t: 3, cn: 'BRA', b: 1955, r: 'vocal', ap: ['d'], al: [['Glu-Glu', 1986, 'single']] },
  { n: 'Patati Patatá', g: 'teen_pop', c: 'sao_paulo', d: 1990, t: 3, cn: 'BRA', exact: false, m: [['Patati', 'vocal'], ['Patatá', 'vocal']] },
  { n: 'Galinha Pintadinha', g: 'teen_pop', c: 'sao_paulo', d: 2006, t: 3, cn: 'BRA',
    m: [['Juliano Prado', 'producer'], ['Marcos Luporini', 'producer']], al: [['Galinha Pintadinha', 2009, 'lp', 'soundtrack']] },
  { n: 'Palavra Cantada', g: 'mpb', c: 'sao_paulo', d: 1994, t: 3, cn: 'BRA',
    m: [['Sandra Peres', 'vocal'], ['Paulo Tatit', 'guitar']], al: [['Canções de Ninar', 1994]] },
  { n: 'Bia Bedran', g: 'mpb', c: 'rio', d: 1984, t: 3, cn: 'BRA', r: 'vocal', ap: ['d', 'b'], exact: false },
  { n: 'Dominó', g: 'boy_band', c: 'sao_paulo', d: 1984, e: 1997, t: 3, cn: 'BRA', ap: ['m'],
    m: [['Afonso Nigro', 'vocal', undefined, undefined, 1984], ['Nill', 'vocal', undefined, undefined, 1984], ['Marcos Quintela', 'vocal', undefined, undefined, 1984], ['Marcelo Rodrigues', 'vocal', undefined, undefined, 1984]],
    al: [['Dominó', 1985]] },
  { n: 'Polegar', g: 'boy_band', c: 'sao_paulo', d: 1988, e: 1993, t: 3, cn: 'BRA', ap: ['m'],
    m: [['Rafael Ilha', 'vocal'], ['Alex Gill', 'vocal'], ['Ricardo Costa', 'vocal'], ['Ângelo Dimitri', 'vocal']],
    al: [['Polegar', 1989]] },
  { n: 'Milton Guedes', g: 'pop_rock', c: 'rio', d: 1993, t: 3, cn: 'BRA', b: 1963, r: 'horns', ap: ['d', 'b'] },
  // apresentadores: pessoas da TV; discografia só onde gravaram de fato (Gugu não grava — fica só como pessoa da TV)
  { n: 'Chacrinha', g: 'samba', c: 'rio', d: 1980, e: 1988, t: 3, cn: 'BRA', b: 1917, x: 1988, r: 'vocal', exact: false, al: [['Maria Sapatão', 1980, 'single']] },
  { n: 'Silvio Santos', g: 'samba', c: 'sao_paulo', d: 1968, e: 1987, t: 3, cn: 'BRA', b: 1930, x: 2024, r: 'vocal', exact: false, ap: ['d'] },

  // ---------------------------------------------------------------- A2 · Brasil
  { n: 'Luiz Caldas', g: 'axe', c: 'salvador', d: 1985, t: 3, cn: 'BRA', b: 1963, r: 'vocal', al: [['Magia', 1985], ['Fricote', 1985, 'single']] },
  { n: 'Sarajane', g: 'axe', c: 'salvador', d: 1986, t: 3, cn: 'BRA', b: 1964, r: 'vocal', ap: ['d', 'b'], al: [['A Roda', 1986, 'single']] },
  { n: 'Asa de Águia', g: 'axe', c: 'salvador', d: 1987, t: 3, cn: 'BRA', m: [['Durval Lelys', 'vocal']] },
  { n: 'Mastruz com Leite', g: 'baiao', c: 'fortaleza', d: 1990, t: 3, cn: 'BRA' },
  { n: 'Roberta Miranda', g: 'sertanejo', c: 'sao_paulo', d: 1986, t: 3, cn: 'BRA', b: 1956, r: 'vocal', al: [['Majestade, o Sabiá', 1986, 'single']] },
  { n: 'Chrystian & Ralf', g: 'sertanejo', c: 'goiania', d: 1982, t: 3, cn: 'BRA', ap: ['d'], m: [['Chrystian', 'vocal'], ['Ralf', 'vocal']] },
  { n: 'Wando', g: 'brega', c: 'bh', d: 1973, e: 2012, t: 3, cn: 'BRA', b: 1945, x: 2012, r: 'vocal', al: [['Fogo e Paixão', 1988, 'single']] },
  { n: 'Waldick Soriano', g: 'brega', c: 'rio', d: 1960, e: 2008, t: 3, cn: 'BRA', b: 1933, x: 2008, r: 'vocal', al: [['Eu Não Sou Cachorro, Não', 1972, 'single']] },
  { n: 'Evaldo Braga', g: 'brega', c: 'rio', d: 1970, e: 1973, t: 3, cn: 'BRA', b: 1945, x: 1973, r: 'vocal', al: [['Sorria, Sorria', 1971, 'single']] },
  { n: 'Nelson Ned', g: 'bolero', c: 'sao_paulo', d: 1965, e: 2014, t: 3, cn: 'BRA', b: 1947, x: 2014, r: 'vocal', ap: ['d'] },
  { n: 'Agnaldo Timóteo', g: 'jovem_guarda', c: 'rio', d: 1965, e: 2021, t: 3, cn: 'BRA', b: 1936, x: 2021, r: 'vocal' },
  { n: 'Agepê', g: 'samba', c: 'rio', d: 1975, e: 1995, t: 3, cn: 'BRA', b: 1942, x: 1995, r: 'vocal', al: [['Deixa Eu Te Amar', 1984, 'single']] },
  { n: 'Benito di Paula', g: 'samba', c: 'sao_paulo', d: 1971, t: 3, cn: 'BRA', b: 1941, r: 'keys', al: [['Retalhos de Cetim', 1973, 'single']] },
  { n: 'Gretchen', g: 'disco', c: 'rio', d: 1979, t: 3, cn: 'BRA', b: 1959, r: 'vocal', al: [['Conga, Conga, Conga', 1979, 'single']] },
  { n: 'Ritchie', g: 'new_wave', c: 'rio', d: 1983, t: 3, cn: 'BRA', b: 1952, r: 'vocal', al: [['Vôo de Coração', 1983], ['Menina Veneno', 1983, 'single']] },
  { n: 'Angela Ro Ro', g: 'mpb', c: 'rio', d: 1979, t: 3, cn: 'BRA', b: 1949, r: 'keys', al: [['Angela Ro Ro', 1979]] },
  { n: 'Leo Jaime', g: 'rock_br', c: 'rio', d: 1985, t: 3, cn: 'BRA', b: 1960, r: 'vocal' },
  { n: 'Negritude Júnior', g: 'pagode', c: 'sao_paulo', d: 1993, t: 3, cn: 'BRA', ap: ['d'], m: [['Netinho de Paula', 'vocal']] },
  { n: 'Kelly Key', g: 'teen_pop', c: 'rio', d: 2001, t: 3, cn: 'BRA', b: 1983, r: 'vocal', al: [['Baba', 2001, 'single']] },
  { n: 'Wanessa Camargo', g: 'teen_pop', c: 'goiania', d: 2000, t: 3, cn: 'BRA', b: 1982, r: 'vocal' },
  { n: 'Tati Quebra-Barraco', g: 'funk_carioca', c: 'rio', d: 2004, t: 3, cn: 'BRA', b: 1979, r: 'mc', ap: ['d'] },
  { n: 'MC Guimê', g: 'funk_ostentacao', c: 'sao_paulo', d: 2011, t: 3, cn: 'BRA', b: 1992, r: 'mc', al: [['Plaque de 100', 2012, 'single']] },
  { n: 'Banda Uó', g: 'tecnobrega', c: 'goiania', d: 2010, e: 2018, t: 3, cn: 'BRA',
    m: [['Mateus Carrilho', 'vocal'], ['Davi Sabbag', 'vocal'], ['Candy Mel', 'vocal']] },

  // ---------------------------------------------------------------- A2 · América Latina
  { n: 'Timbiriche', g: 'teen_pop', c: 'mexico_city', d: 1982, t: 3, cn: 'MEX', ap: ['m'],
    m: [['Paulina Rubio', 'vocal', 1971, undefined, 1982, 1991], ['Sasha Sokol', 'vocal', 1970, undefined, 1982, 1986], ['Benny Ibarra', 'vocal', 1970, undefined, 1982, 1986], ['Diego Schoening', 'vocal', 1969, undefined, 1982],
      ['Mariana Garza', 'vocal', 1970, undefined, 1982], ['Alix Bauer', 'vocal', 1971, undefined, 1982], ['Thalía', 'vocal', 1971, undefined, 1986, 1989], ['Erik Rubín', 'vocal', 1971, undefined, 1985]] },
  { n: 'Gloria Trevi', g: 'pop_latino', c: 'monterrey', d: 1989, t: 3, cn: 'MEX', b: 1968, r: 'vocal', al: [['...Qué hago aquí?', 1989], ['Dr. Psiquiatra', 1989, 'single']] },
  { n: 'Los Bukis', g: 'bolero', c: 'guadalajara', d: 1975, e: 1996, rj: [[2021]], t: 3, cn: 'MEX',
    m: [['Marco Antonio Solís', 'vocal', 1959], ['Joel Solís', 'guitar']] },
  { n: 'Los Ángeles Azules', g: 'cumbia', c: 'mexico_city', d: 1983, t: 3, cn: 'MEX' },
  { n: 'Olga Tañón', g: 'merengue', c: 'san_juan', d: 1992, t: 3, cn: 'PRI', b: 1967, r: 'vocal', al: [['Mujer de Fuego', 1993]] },
  { n: 'Leo Dan', g: 'pop_latino', c: 'buenos_aires', d: 1962, t: 3, cn: 'ARG', b: 1942, r: 'vocal' },
  { n: 'Ricardo Arjona', g: 'pop_latino', c: 'mexico_city', d: 1985, t: 3, cn: 'MEX', b: 1964, r: 'vocal' },

  // ---------------------------------------------------------------- A2 · Europa
  { n: 'Demis Roussos', g: 'chanson_pop', c: 'paris', d: 1971, e: 2015, t: 3, cn: 'GRC', b: 1946, x: 2015, r: 'vocal', al: [['Forever and Ever', 1973]] },
  { n: 'Vicky Leandros', g: 'schlager', c: 'hamburg', d: 1965, t: 3, cn: 'GRC', b: 1949, r: 'vocal', al: [['Après toi', 1972, 'single']] },
  { n: 'Dschinghis Khan', g: 'schlager', c: 'munich', d: 1979, e: 1985, t: 3, cn: 'DEU',
    m: [['Wolfgang Heichel', 'vocal'], ['Henriette Heichel', 'vocal'], ['Edina Pop', 'vocal'], ['Leslie Mándoki', 'vocal'], ['Louis Potgieter', 'vocal'], ['Steve Bender', 'vocal']],
    al: [['Dschinghis Khan', 1979, 'single']] },
  { n: 'Isabel Pantoja', g: 'copla', c: 'sevilla', d: 1974, t: 3, cn: 'ESP', b: 1956, r: 'vocal' },
  { n: 'André Rieu', g: 'classical', c: 'amsterdam', d: 1987, t: 3, cn: 'NLD', b: 1949, r: 'strings' },

  // ---------------------------------------------------------------- A2 · Ásia
  { n: 'Momoe Yamaguchi', g: 'kayokyoku', c: 'tokyo', d: 1973, e: 1980, t: 3, cn: 'JPN', b: 1959, r: 'vocal' },
  { n: 'Akina Nakamori', g: 'kayokyoku', c: 'tokyo', d: 1982, t: 3, cn: 'JPN', b: 1965, r: 'vocal' },
  { n: 'Pink Lady', g: 'kayokyoku', c: 'tokyo', d: 1976, e: 1981, t: 3, cn: 'JPN', m: [['Mie', 'vocal', 1958], ['Kei', 'vocal', 1957]] },
  { n: 'Dreams Come True', g: 'jpop', c: 'tokyo', d: 1989, t: 3, cn: 'JPN',
    m: [['Miwa Yoshida', 'vocal', 1965], ['Masato Nakamura', 'bass', 1958], ['Takahiro Nishikawa', 'keys', 1964, undefined, undefined, 2002]] },
  { n: 'Wonder Girls', g: 'kpop', c: 'seoul', d: 2007, e: 2017, t: 3, cn: 'KOR', al: [['Tell Me', 2007, 'single'], ['Nobody', 2008, 'single']] },
  { n: 'Kumar Sanu', g: 'bollywood', c: 'kolkata', d: 1989, t: 3, cn: 'IND', b: 1957, r: 'vocal', al: [['Aashiqui', 1990, 'lp', 'soundtrack']] },
  { n: 'Alka Yagnik', g: 'bollywood', c: 'mumbai', d: 1980, t: 3, cn: 'IND', b: 1966, r: 'vocal' },
  { n: 'Sharon Cuneta', g: 'opm', c: 'manila', d: 1978, t: 3, cn: 'PHL', b: 1966, r: 'vocal', al: [['Mr. DJ', 1978, 'single']] },

  // ---------------------------------------------------------------- A2 · África
  { n: 'Awilo Longomba', g: 'ndombolo', c: 'kinshasa', d: 1995, t: 3, cn: 'COD', b: 1962, r: 'vocal' },
  { n: 'Yemi Alade', g: 'afrobeats', c: 'lagos', d: 2014, t: 3, cn: 'NGA', b: 1989, r: 'vocal', al: [['Johnny', 2014, 'single']] },
  { n: 'Mafikizolo', g: 'kwaito', c: 'johannesburg', d: 1997, t: 3, cn: 'ZAF',
    m: [['Theo Kgosinkwe', 'vocal'], ['Nhlanhla Nciza', 'vocal'], ['Tebogo Madingoane', 'vocal', undefined, 2004, undefined, 2004]] },
  { n: 'Sam Mangwana', g: 'rumba_congolaise', c: 'kinshasa', d: 1963, t: 3, cn: 'COD', b: 1945, r: 'vocal' },
];
// "Ilariê" (1988), faixa do "Xou da Xuxa 3": entrou como single no al da Xuxa (realacts_world.ts).
