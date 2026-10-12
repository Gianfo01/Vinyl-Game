// Rodada 27 (F) — pesquisa da fila do usuário (/aud27/research.json: P004–P043 + 17 formações). Só entra o que a pesquisa
// deu como confiança alta/média; o de confiança baixa fica marcado (exact:false ou procedência 'u' = "não conferido") e some
// do modo exato. Datas que a pesquisa marcou como "background" ficam como aproximadas (procedência 'a', ver model27).
// Formato das correções = Fix27 (audit27): upsert de integrantes por nome, agora com o 7º campo (passagens).
import type { Fix27 } from './audit27';
import type { KinRow } from './kin15';
import type { RealArtist } from './realtypes';

const U = undefined;

export const FIXR27: Record<string, Fix27> = {
  // ---- P005–P007, P041–P043: discos
  'The Beatles': { al: [['The Beatles (White Album)', 1968], ['Magical Mystery Tour', 1967, 'ep'], ['Yellow Submarine', 1969, 'lp', 'soundtrack']] },
  BTS: { alKind: { Proof: [U, 'compilation'], '2 Cool 4 Skool': ['single'] } }, // "single album" coreano (a imprensa chama de EP)
  '3T': { set: { f: 1994, ap: ['f'] }, del: ['exact'] }, // formação incerta (1992–95): aproximada; estreia em disco 1995 confirmada
  'Elis Regina': { al: [['Elis', 1972]] }, // P013: Philips, produção de Roberto Menescal ("Casa no Campo")
  'Jorge Ben Jor': { al: [['Ben', 1972]] }, // P015: "Fio Maravilha" (depois "Filho Maravilha")
  // ---- P018–P026: formações
  'Pink Floyd': { set: { f: 1965 }, m: [['Richard Wright', 'keys', 1943, 2008, U, U, [[U, 1979], [1987]]], ['Bob Klose', 'guitar', U, U, 1964, 1965]] },
  'Titãs': {
    set: { f: 1982 },
    m: [['Ciro Pessoa', 'vocal', U, 2020, U, 1984], ['André Jung', 'drums', U, U, U, 1984], ['Charles Gavin', 'drums', 1960, U, 1984, 2010], ['Beto Lee', 'guitar', 1977, U, 2016]],
  },
  'AC/DC': {
    m: [['Bon Scott', 'vocal', 1946, 1980, 1974, 1980], ['Brian Johnson', 'vocal', 1947, U, 1980, U, [[1980, 2016], [2018]]],
      ['Cliff Williams', 'bass', 1949, U, 1977, U, [[1977, 2016], [2018, 2024]]], ['Phil Rudd', 'drums', 1954, U, 1975, U, [[1975, 1983], [1994, 2015], [2018]]],
      ['Simon Wright', 'drums', 1963, U, 1983, 1989], ['Chris Slade', 'drums', 1946, U, 1989, U, [[1989, 1994], [2015, 2016]]], ['Stevie Young', 'guitar', 1956, U, 2014],
      ['Dave Evans', 'vocal', 1953, U, U, 1974]],
  },
  'Fleetwood Mac': {
    set: { f: 1967 },
    m: [['Christine McVie', 'keys', 1943, 2022, 1970, U, [[1970, 1998], [2014]]], ['Lindsey Buckingham', 'guitar', 1949, U, 1975, U, [[1975, 1987], [1997, 2018]]],
      ['Stevie Nicks', 'vocal', 1948, U, 1975, U, [[1975, 1991], [1997]]], ['Dave Walker', 'vocal', 1945, U, 1971, 1972], ['Bob Weston', 'guitar', 1947, 2012, 1972, 1973],
      ['Neil Finn', 'guitar', 1958, U, 2018], ['Mike Campbell', 'guitar', 1950, U, 2018]],
  },
  'Spice Girls': { m: [['Geri Halliwell', 'vocal', 1972, U, U, U, [[U, 1998], [2007]]]] },
  Radiohead: { set: { f: 1985 } }, // "On a Friday" (1985); Phil = Philip Selway (apelido em model27)
  // ---- formações pesquisadas (lineup:*)
  Molejo: {
    del: ['exact'], set: { f: 1988 },
    m: [['Willian Araújo', 'vocal', 1966, 2026, 1988, 1999], ['Lúcio Nascimento', 'drums', U, U, 2015], ['Jimmy Batera', 'drums', U, U, 2015], ['Robson Calazans', 'drums', U, U, 2015],
      ['Marquinhos Pato', 'drums', U, U, 2015], ['Claumirzinho', 'drums', U, U, 2015]],
  },
  'Comunidade Nin-jitsu': { m: [['Mano Changes', 'vocal']] }, // baixa: segue não conferido
  'Furacão 2000': { del: ['exact'], set: { f: 1975 }, m: [['Rômulo Costa', 'producer', 1953, U, 1975], ['Gilberto Guarani', 'producer']] }, // equipe de som/produtora, não banda
  BNK48: {
    m: [['Cherprang Areekul', 'vocal', 1996, U, 2017, 2023], ['Jennis Oprasert', 'vocal', 2000, U, 2017], ['Music', 'vocal', U, U, 2017], ['Pun', 'vocal', U, U, 2017],
      ['Pupe', 'vocal', U, U, 2017], ['Mobile', 'vocal', U, U, 2017], ['Jane', 'vocal', U, U, 2017], ['Kaew', 'vocal', U, U, 2017], ['Namneung', 'vocal', U, U, 2017],
      ['Orn', 'vocal', U, U, 2017], ['Noey', 'vocal', U, U, 2017], ['Nink', 'vocal', U, U, 2017], ['Izurina', 'vocal', U, U, 2017, 2019]],
  },
  'Turma do Pagode': { m: [['Leiz', 'vocal'], ['Rubinho', 'vocal'], ['Neni', 'vocal'], ['Marcelinho', 'vocal'], ['Thiagão', 'drums'], ['Fabiano', 'vocal'], ['Caramelo', 'vocal'], ['Leandro Filé', 'vocal']] }, // baixa
  'Academia da Berlinda': {
    m: [['Alexandre Urêa', 'vocal', U, U, 2004], ['Tiné', 'vocal', U, U, 2004], ['Yuri Rabid', 'bass', U, U, 2004], ['Gabriel Melo', 'guitar', U, U, 2004], ['Hugo Gila', 'keys', U, U, 2004],
      ['Irandê Naguê', 'drums', U, U, 2004], ['Tom Rocha', 'drums', U, U, 2004]],
  },
  'Les Ballets Africains': { set: { f: 1952 }, del: ['r'], m: [['Keita Fodeba', 'vocal', 1921, 1969, 1952, 1958], ['Mañana Cissé', 'vocal']] },
  'Síntese': { m: [['Neto', 'mc', U, U, 2008], ['Léo', 'mc', U, U, 2008, 2012]], al: [['Sem Cortesia', 2012], ['Amem', 2016]] }, // baixa
  'Vera Loca': { del: ['exact'], set: { f: 2001 }, m: [['Fabrício Beck', 'vocal', U, U, 2001], ['Mumu', 'bass', U, U, 2001], ['Diego Dias', 'keys', U, U, 2001], ['Hernan Gonzalez', 'guitar', U, U, 2001], ['Luigi Vieira', 'drums', U, U, 2001]] },
  'A Outra Banda Da Lua': { del: ['exact'], set: { f: 2015 }, m: [['André Oliva', 'guitar', U, U, 2015], ['Matheus Bragança', 'guitar', U, U, 2015]] },
  Deluxe: {
    del: ['exact'], set: { d: 2011, f: 2007 },
    m: [['Pietre', 'guitar', U, U, 2007], ['Kaya', 'bass', U, U, 2007], ['Kilo', 'drums', U, U, 2007], ['Soubri', 'horns', U, U, 2007], ['Pépé', 'keys', U, U, 2007], ['Lili Boy', 'vocal', U, U, 2010]],
    al: [['The Deluxe Family Show', 2013]], alYear: { 'Polishing Peanuts': 2011 },
  },
  Sports: { m: [['Cale Chronister', 'vocal', U, U, 2015], ['Christian Theriot', 'guitar', U, U, 2015]] }, // baixa
  Cambriana: { set: { cn: 'BRA', c: 'goiania' }, m: [['Luis Calil', 'vocal', U, U, 2010], ['Wassily Brasil', 'keys', U, U, 2012], ['Pedro Falcão', 'bass', U, U, 2012], ['Heloísa Cassimiro', 'drums', U, U, 2012], ['Rafael Morihisa', 'guitar', U, U, 2012], ['Israel Santiago', 'guitar', U, U, 2012]], al: [['House of Tolerance', 2012]] }, // baixa: Goiânia (BRA), não Milão
  'I Virtuosi Italiani': { del: ['exact'], set: { f: 1989 }, m: [['Alberto Martini', 'strings', U, U, 2006], ['Corrado Rovaris', 'strings']] },
};

/** r27 (F): correções achadas pelo validador de consistência (src/data/check27.ts, tests/r27-consistency.test.ts). */
export const FIXV27: Record<string, Fix27> = {
  // "Grupo Revelação" e "Revelação" eram o mesmo grupo: a cópia sem dados fica com os dados da outra (dedupKey27 descarta a 2ª)
  'Grupo Revelação': { set: { f: 1991, d: 1998, t: 2 }, del: ['exact'], m: [['Xande de Pilares', 'vocal', 1971, U, U, 2014], ['Sérgio Rufino', 'strings'], ['Beloba', 'drums']], al: [['Ao Vivo no Olimpo', 2002]] },
  'Gary Decarlo': { set: { x: 2010 } }, // mesma pessoa do Steam
  // banda com campos de solo (b, r) e fundadores marcados como se tivessem entrado em 2022 (só Payo Solís e Brian Ortega entraram depois)
  'Grupo Frontera': { del: ['b', 'r'], set: { ap: ['m'] }, m: [['Juan Javier Cantú', 'keys', U, U, U, U, [[U]]], ['Julian Peña Jr.', 'drums', U, U, U, U, [[U]]], ['Alberto "Beto" Acosta', 'guitar', U, U, U, U, [[U]]], ['Carlos Guerrero', 'drums', U, U, U, U, [[U]]], ['Carlos Zamora', 'guitar', U, U, U, U, [[U]]]] },
  // integrantes "entraram depois da estreia" em grupos que estrearam já com eles
  tripleS: { set: { ap: ['m'] }, m: ['Kim YooYeon', 'Mayu', 'Xinyu', 'Kim NaKyoung', 'Park SoHyun', 'Seo DaHyun', 'Nien', 'Yoon SeoYeon', 'JiYeon', 'Kotone'].map((n) => [n, 'vocal', U, U, U, U, [[U]]]) },
  Casuarina: { set: { f: 2001, d: 2005 } }, // formado em 2001 na Lapa; 1º disco 2005 (segue não conferido)
  // fundadores "nascidos depois da estreia" ou crianças na estreia: entraram depois (datas aproximadas, MEMBER_PROV27)
  'Franco & TPOK Jazz': { m: [['Madilu System', 'vocal', 1952, 2007, 1980]] },
  Exaltasamba: { m: [['Thiaguinho', 'vocal', 1983, U, 2003, 2012]] },
  'La Sonora Matancera': { m: [['Valentín Cané', 'guitar'], ['Rogelio Martínez', 'vocal', 1915, 2002, 1926], ['Celio González', 'vocal', 1924, 2004, 1955]] }, // Cané: fundador (tres)
  'The Red Army Choir': { m: [['Valery Khalilov', 'vocal', 1952, 2016, 2016]] },
  APRE: { m: [['Charlie Brown', 'vocal', U, U, U, U, [[U]]], ['Jules Konieczny', 'guitar', U, U, U, U, [[U]]]] },
};

/** P027–P035: artistas novos (entram no fim de REAL_ALL, no sorteio próprio do acervo; nomes já presentes são descartados). */
export const NEW27_F: RealArtist[] = [
  // Eumir Deodato: pianista/arranjador; "Also Sprach Zarathustra (2001)" de "Prelude" (CTI, 1973), Grammy 1974
  { n: 'Eumir Deodato', g: 'fusion', c: 'rio', cn: 'BRA', d: 1964, b: 1942, r: 'keys', t: 2, z: 1,
    al: [['Inútil Paisagem', 1964], ['Prelude', 1973], ['Deodato 2', 1973], ['Whirlwinds', 1974], ['Very Together', 1976], ['Love Island', 1978]] },
  // Itamar Assumpção (Vanguarda Paulista), com a banda Isca de Polícia; anos de disco divergem entre fontes (mais citados)
  { n: 'Itamar Assumpção', g: 'mpb', c: 'sao_paulo', cn: 'BRA', d: 1980, e: 2003, b: 1949, x: 2003, r: 'vocal', t: 3, z: 1, ap: ['d'],
    al: [['Beleléu, Leléu, Eu', 1980], ['Às Próprias Custas S.A.', 1983], ['Sampa Midnight', 1985], ['Intercontinental! Quem Diria! Era Só o Que Faltava...', 1988]] },
  // Jards Macalé: morte em 2025 de fonte única (aproximada)
  { n: 'Jards Macalé', g: 'mpb', c: 'rio', cn: 'BRA', d: 1972, e: 2025, b: 1943, x: 2025, r: 'vocal', t: 3, z: 1, ap: ['x'],
    al: [['Jards Macalé', 1972], ['Aprender a Nadar', 1974], ['Banquete dos Mendigos', 1979], ["Let's Play That", 1994]] },
  { n: 'Arrigo Barnabé', g: 'mpb', c: 'sao_paulo', cn: 'BRA', d: 1980, b: 1951, r: 'keys', t: 3, z: 1,
    al: [['Clara Crocodilo', 1980], ['Tubarões Voadores', 1984], ['Suspeito', 1987], ['Façanhas', 1992]] },
  // Rosinha de Valença (Maria Rosa Canellas): 1º disco em 1963 (título não conferido — fora da lista)
  { n: 'Rosinha de Valença', g: 'bossa', c: 'rio', cn: 'BRA', d: 1963, e: 2004, b: 1941, x: 2004, r: 'guitar', t: 3, z: 1,
    al: [['Um Violão em Primeiro Plano', 1971], ['Cheiro de Mato', 1976], ['Violões em Dois Estilos', 1980]] },
  // Caymmi: os três filhos de Dorival e Stella Maris (laços em KINR27)
  { n: 'Nana Caymmi', g: 'mpb', c: 'rio', cn: 'BRA', d: 1960, e: 2025, b: 1941, x: 2025, r: 'vocal', t: 2, z: 1 },
  { n: 'Dori Caymmi', g: 'mpb', c: 'rio', cn: 'BRA', f: 1959, d: 1964, b: 1943, r: 'guitar', t: 2, z: 1, al: [['Caymmi Visita Tom', 1964], ['Dori Caymmi', 1972]] },
  { n: 'Danilo Caymmi', g: 'mpb', c: 'rio', cn: 'BRA', d: 1964, b: 1948, r: 'horns', t: 3, z: 1, al: [['Caymmi Visita Tom', 1964]] },
  // J Dilla: a MESMA pessoa do produtor (producers15 'dilla'); "The Shining" é póstumo (lançamento póstumo vale; trabalho novo não)
  { n: 'J Dilla', g: 'hiphop', c: 'detroit', cn: 'USA', d: 2001, e: 2006, b: 1974, x: 2006, r: 'producer', t: 2, z: 1,
    al: [['Welcome 2 Detroit', 2001], ['Ruff Draft', 2003, 'ep'], ['Donuts', 2006], ['The Shining', 2006]] },
];

/** Laços da pesquisa (P024, P032–P040) que não estavam em kin15/kin27 — os que estavam ganharam período/subtipo lá mesmo. */
export const KINR27: KinRow[] = [
  // P036: Gonzaguinha — filho biológico de Gonzaga (kin15; versão oficial, paternidade discutida em biografias) e de Odaléia;
  // criado pelos padrinhos Henrique Xavier e Dina (de criação, não adoção formal conferida)
  ['P', 'Odaléia Guedes dos Santos', 'Gonzaguinha', { sub: 'biological' }],
  ['P', 'Henrique Xavier', 'Gonzaguinha', { sub: 'adoptive', src: 'a' }], ['P', 'Dina de Castro', 'Gonzaguinha', { sub: 'adoptive', src: 'a' }],
  // P037: Joe e Katherine Jackson (ano do casamento: background)
  ['M', 'Joe Jackson', 'Katherine Jackson', { from: 1949, src: 'a' }],
  // P038/P039: mães (meio-irmãos pelo pai: Julian × Sean Lennon, Norah Jones × Anoushka Shankar)
  ['P', 'Cynthia Lennon', 'Julian Lennon', { sub: 'biological' }], ['P', 'Sue Jones', 'Norah Jones', { sub: 'biological' }], ['P', 'Sukanya Rajan', 'Anoushka Shankar', { sub: 'biological' }],
  // P032–P034: Caymmi
  ['P', 'Stella Maris', 'Nana Caymmi', 'Dori Caymmi', 'Danilo Caymmi', { sub: 'biological' }], ['M', 'Dorival Caymmi', 'Stella Maris'],
];
