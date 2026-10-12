// Rodada 27 (C1): auditoria dos personagens que JÁ existem (Masters_25, arquivos 01/03/05 + "confirmadas" 1–2 do usuário,
// cada item com fonte na auditoria). Correções por NOME, aplicadas a REAL_ALL e ao catálogo clássico (REAL_CLASSIC) quando
// realworld monta o banco — no estilo de lineups25. Formato RealMember: [nome, papel, nasc, morte, entrou, saiu].
// Itens "a conferir" ficam marcados nos comentários (ou com exact:false) — não viram fato sem pesquisa.
import type { RealArtist, RealMember, RealRelease } from './realtypes';
import type { ClassicExtra } from './realacts_classic';

const U = undefined;
/** nome sem acento, caixa e pontuação (mesma ideia de realworld.canonKey, sem os apelidos) */
export const key27 = (n: string): string => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Mortes 2025–2026 que faltavam (pessoa → ano). Valem para solos (x, e) e integrantes de qualquer ato. */
export const DEATHS27: Record<string, number> = {
  // 2026 (NPR, Reuters, G1, BBC, EL PAÍS, "2026 in music")
  'Bob Weir': 2026, 'Dolly Parton': 2026, 'Asha Bhosle': 2026, 'Willie Colón': 2026, 'Victor Willis': 2026,
  'Totó la Momposina': 2026, 'Abdullah Ibrahim': 2026, 'Chuck Negron': 2026, 'Rob Hirst': 2026, 'Sly Dunbar': 2026,
  // 2025 ("2025 in music") — os que ainda estavam vivos em alguma cópia
  'Sly Stone': 2025, 'Garth Hudson': 2025, 'Ace Frehley': 2025, 'Brian Wilson': 2025, 'Clem Burke': 2025, 'Mani': 2025,
  'Ornella Vanoni': 2025, 'Arlindo Cruz': 2025, 'Jerry Butler': 2025, 'Preta Gil': 2025, 'Freddie Aguilar': 2025,
  'Sam Rivers': 2025, 'Amadou Bagayoko': 2025, 'Steve Cropper': 2025, 'Sam Moore': 2025, 'Hermeto Pascoal': 2025,
  'Donna Jean Godchaux': 2025,
  // também produtores com carreira de artista no banco
  'Ebo Taylor': 2026,
};
/** Mortes erradas: pessoa → ano certo (null = está vivo). */
export const DEATH_FIX27: Record<string, number | null> = {
  'Bill Kreutzmann': null, // Grateful Dead: uma cópia o dava morto em 2024
  'Aston Barrett': 2024, // "Family Man" (The Wailers): 2016 → 2024
  'Georgy Guryanov': 2013, 'Georgy Gurianov': 2013, // Kino: 1991 → 2013
};

/** Nascimentos que faltavam (vindos das cópias duplicadas removidas e da auditoria): ato → integrante → ano. */
export const BORN27: Record<string, Record<string, number>> = {
  Olodum: { 'Neguinho do Samba': 1953 }, 'Barão Vermelho': { 'Maurício Barros': 1961 }, 'Kid Abelha': { 'Bruno Fortunato': 1962 },
  'Capital Inicial': { 'Fê Lemos': 1962, 'Flávio Lemos': 1964 }, 'Engenheiros do Hawaii': { 'Augusto Licks': 1964 }, 'Raça Negra': { 'Luiz Carlos': 1960 },
  "Racionais MC's": { 'Ice Blue': 1970, 'Edi Rock': 1971, 'KL Jay': 1969 }, Skank: { 'Henrique Portugal': 1966, 'Lelo Zaneti': 1965, 'Haroldo Ferretti': 1965 },
  Raimundos: { 'Digão': 1970, Canisso: 1966 }, 'O Rappa': { 'Xandão': 1970, 'Lauro Farias': 1969 }, 'Bruno & Marrone': { Bruno: 1970, Marrone: 1969 },
  'Jota Quest': { 'Marco Túlio': 1972, PJ: 1972 }, 'Los Hermanos': { 'Rodrigo Barba': 1976 }, 'CPM 22': { 'Badauí': 1976, Wally: 1976 },
  'Jorge & Mateus': { Mateus: 1985 }, 'Henrique & Juliano': { Henrique: 1992, Juliano: 1994 }, 'Os Mutantes': { 'Sérgio Dias': 1950 },
  'Maná': { 'Juan Calleros': 1959, 'Sergio Vallín': 1971 }, 'Café Tacvba': { 'Joselo Rangel': 1970, 'Quique Rangel': 1970, 'Emmanuel del Real': 1971 },
  'Seo Taiji and Boys': { 'Yang Hyun-suk': 1970, 'Lee Juno': 1970 }, Toto: { 'David Hungate': 1948 }, 'Titãs': { 'Charles Gavin': 1960 },
  'Maroon 5': { 'Matt Flynn': 1970 }, 'Charlie Brown Jr.': { 'Marcão': 1972, 'Renato Pelado': 1972 },
};

export interface Fix27 {
  /** campos trocados (n, d, e, rj, cn, f, b, x, r, t, exact…) */
  set?: Partial<RealArtist>;
  /** campos apagados */
  del?: ('e' | 'rj' | 'x' | 'exact')[];
  /** integrantes: upsert por nome (com várias passagens, casa pelo ano de entrada); campos undefined não mexem */
  m?: RealMember[];
  /** novas passagens de quem já está na lista (saiu e voltou) — sempre acrescentadas */
  again?: RealMember[];
  /** integrantes que não são da banda (colaboradores, artista visual) */
  mdel?: string[];
  /** discos que faltavam / anos de disco corrigidos */
  al?: RealRelease[];
  alYear?: Record<string, number>;
}

export const FIX27: Record<string, Fix27> = {
  // ---- país: Hong Kong (HKG) em vez de China
  'Jacky Cheung': { set: { cn: 'HKG' } }, 'Andy Lau': { set: { cn: 'HKG' } }, 'Eason Chan': { set: { cn: 'HKG' } }, Beyond: { set: { cn: 'HKG' } },
  'Leslie Cheung': { set: { cn: 'HKG' } }, 'Anita Mui': { set: { cn: 'HKG' } },
  // Nicki Minaj: uma entrada só (nasceu em Trinidad e Tobago — mesmo critério de Rihanna/BRB; carreira nos EUA, cidade new_york)
  'Nicki Minaj': { set: { cn: 'TTO' } },
  // ---- fim / voltas
  'Jonas Brothers': { set: { rj: [[2019]] } },
  Oasis: { set: { rj: [[2024, 2025]] } }, // volta anunciada em ago/2024; turnê 2025
  'Crowded House': { set: { rj: [[2006]] } },
  'Alice in Chains': { del: ['e', 'rj'] }, // ativo desde 2005 (com William DuVall); o hiato 2002–05 não é fim
  // Rush 2026: turnê com Anika Nilles na bateria — A CONFERIR (auditoria pede confirmação); a volta já estava em rj
  Rush: { m: [['Anika Nilles', 'drums', 1983, U, 2026]] },
  'A Tribe Called Quest': { set: { rj: [[2006, 2008], [2015, 2017]] } },
  // ---- formação (f) e estreia (d)
  'X Japan': { set: { f: 1982 }, al: [['Vanishing Vision', 1988]] }, // formada em 1982; 1º álbum (indie) 1988
  AKB48: { set: { f: 2005 } },
  Arashi: { set: { f: 1999 }, alYear: { 'Arashi No.1: Ichigou': 2001 } }, // 1º álbum: 2001
  '5 Seconds of Summer': { set: { f: 2011, d: 2012 }, al: [['Unplugged', 2012, 'ep']] },
  'The Doors': { set: { f: 1965 } }, Aerosmith: { set: { f: 1970 } },
  // Cliff Williams: a auditoria marca a saída em 2016 (voltou para "Power Up", 2020 — a conferir)
  'AC/DC': { set: { f: 1973 }, m: [['Cliff Williams', 'bass', 1949, U, 1977, 2016], ['Mark Evans', 'bass', 1956, U, 1975, 1977]] },
  // ---- saídas não marcadas / integrantes que faltavam
  'Little Mix': { m: [['Jesy Nelson', 'vocal', 1991, U, U, 2020]] },
  'Big Bang': { m: [['T.O.P', 'mc', 1987, U, U, 2023]] },
  'Mötley Crüe': { m: [['John 5', 'guitar', 1970, U, 2023]] },
  'Linkin Park': { m: [['Rob Bourdon', 'drums', 1979, U, U, 2017], ['Joe Hahn', 'dj', 1977, U, 1996], ['Dave "Phoenix" Farrell', 'bass', 1977, U, 1999], ['Colin Brittain', 'drums', 1986, U, 2024]] },
  'Eagles': { m: [['Don Felder', 'guitar', 1947, U, 1974, 2001], ['Timothy B. Schmit', 'bass', 1947, U, 1977], ['Vince Gill', 'guitar', 1957, U, 2017]] },
  'Van Halen': { m: [['Wolfgang Van Halen', 'bass', 1991, U, 2006, 2020]] },
  'Red Hot Chili Peppers': { m: [['Jack Irons', 'drums', 1962, U, 1983, 1988], ['John Frusciante', 'guitar', 1970, U, 1988, 1992], ['Josh Klinghoffer', 'guitar', 1979, U, 2009, 2019]],
    again: [['John Frusciante', 'guitar', 1970, U, 1998, 2009], ['John Frusciante', 'guitar', 1970, U, 2019]] },
  'Iron Maiden': { m: [['Clive Burr', 'drums', 1957, 2013, 1979, 1982], ['Janick Gers', 'guitar', 1957, U, 1990]] },
  'Maroon 5': { m: [['James Valentine', 'guitar', 1978, U, 2006]] },
  "Destiny's Child": { m: [['LeToya Luckett', 'vocal', 1981, U, 1993, 2000], ['LaTavia Roberson', 'vocal', 1981, U, 1993, 2000], ['Farrah Franklin', 'vocal', 1981, U, 2000, 2000]] },
  'N.W.A': { m: [['Dr. Dre', 'producer', 1965], ['Arabian Prince', 'producer', 1965, U, 1987, 1988]] },
  'Fleetwood Mac': { m: [['Jeremy Spencer', 'guitar', 1948, U, 1967, 1971], ['Danny Kirwan', 'guitar', 1950, 2018, 1968, 1972], ['Bob Welch', 'guitar', 1945, 2012, 1971, 1974]] },
  Ramones: { m: [['Marky Ramone', 'drums', 1956, U, 1978, 1983], ['Richie Ramone', 'drums', 1957, U, 1983, 1987]], again: [['Marky Ramone', 'drums', 1956, U, 1987]] },
  'The Jimi Hendrix Experience': { m: [['Billy Cox', 'bass', 1941, U, 1969, 1970]] },
  'Grateful Dead': { m: [['Mickey Hart', 'drums', 1943, U, 1967, 1995], ['Keith Godchaux', 'keys', 1948, 1980, 1971, 1979], ['Donna Jean Godchaux', 'vocal', 1947, 2025, 1972, 1979], ['Brent Mydland', 'keys', 1952, 1990, 1979, 1990]] },
  EXO: { m: [['Kai', 'vocal', 1994], ['Sehun', 'vocal', 1994], ['Lay', 'vocal', 1991], ['Chen', 'vocal', 1992, U, U, 2024], ['Kris', 'vocal', 1990, U, U, 2014], ['Luhan', 'vocal', 1990, U, U, 2014], ['Tao', 'vocal', 1993, U, U, 2015]] },
  TWICE: { m: [['Jeongyeon', 'vocal', 1996], ['Mina', 'vocal', 1997], ['Dahyun', 'vocal', 1998], ['Chaeyoung', 'vocal', 1999]] },
  'Stray Kids': { m: [['Changbin', 'mc', 1999], ['Han', 'mc', 2000], ['Seungmin', 'vocal', 2000], ['I.N', 'vocal', 2001]] },
  Sepultura: { m: [['Derrick Green', 'vocal', 1971, U, 1997], ['Eloy Casagrande', 'drums', 1991, U, 2011, 2024]] },
  'Titãs': { m: [['Marcelo Fromer', 'guitar', 1961, 2001, U, 2001]] },
  'Os Mutantes': { m: [['Liminha', 'bass', 1951, U, 1969, 1974], ['Dinho Leme', 'drums', 1950, U, 1969, 1973]] },
  // Marcão e Thiago Castanho voltaram em 2011 (a conferir; fora da auditoria)
  'Charlie Brown Jr.': { m: [['Marcão', 'guitar', 1972, U, U, 2005], ['Thiago Castanho', 'guitar', 1977, U, U, 2005], ['Renato Pelado', 'drums', 1972, U, U, 2005]] },
  'Capital Inicial': { m: [['Loro Jones', 'guitar', 1963, U, U, 2002]] },
  'Calle 13': { m: [['PG-13 (Ileana Cabra)', 'vocal', 1989, U, 2005, 2014]] },
  'The Four Seasons': { m: [['Tommy DeVito', 'guitar', 1928, 2020, U, 1970], ['Nick Massi', 'bass', 1927, 2000, U, 1965]] },
  Toto: { al: [['Toto', 1978], ['Hydra', 1979], ['Isolation', 1984]] },
  // ---- outros erros
  'Dr. Dre': { mdel: ['Snoop Dogg', 'Nate Dogg'] }, // colaboradores, não integrantes
  Gorillaz: { mdel: ['Jamie Hewlett'] }, // artista visual (o jogo não tem papel "visual"; segue como cocriador nos textos)
  // Zé Dantas era parceiro de composição de Gonzaga, não integrante (a pessoa fica em AUTHORS27 até existir cadastro de compositor)
  'Luiz Gonzaga': { mdel: ['Zé Dantas'] },
  // ---- arquivo 2 (conteúdo verificado)
  'The Beatles': { al: [['With the Beatles', 1963], ['Beatles for Sale', 1964], ['Help!', 1965], ['Let It Be', 1970]] },
  'Nara Leão': { al: [['Os Meus Amigos São um Barato', 1977]] }, // Philips/Phonogram, produção de Roberto Santana
  'Carlos Gardel': { set: { b: 1890 } },
};

/** Composições (só autoria, sem datas) — ainda sem lugar no modelo (composição × gravação fica para a próxima rodada). */
export const AUTHORS27: Record<string, string[]> = {
  'Baião': ['Luiz Gonzaga', 'Humberto Teixeira'], 'No Meu Pé de Serra': ['Luiz Gonzaga', 'Humberto Teixeira'],
  'Que Nem Jiló': ['Luiz Gonzaga', 'Humberto Teixeira'], 'Assum Preto': ['Luiz Gonzaga', 'Humberto Teixeira'],
  'ABC do Sertão': ['Luiz Gonzaga', 'Zé Dantas'], 'Vozes da Seca': ['Luiz Gonzaga', 'Zé Dantas'], 'Forró de Mané Vito': ['Luiz Gonzaga', 'Zé Dantas'],
  'João e Maria': ['Chico Buarque', 'Sivuca'],
};

/** Músicas (mapa SONGS22): anos de relançamento/streaming → ano original; títulos errados. Itens da fila de pesquisa
 *  (Don't Let Me Down, Tiro ao Álvaro, Casa no Campo, Xote das Meninas, California Dreamin' dos Beach Boys) ficam para a
 *  próxima rodada. "I Should Have Known Better" (Beach Boys) fica: é a versão de "Beach Boys' Party!" (1965). */
export const SONGFIX27: Record<string, { year?: Record<string, number>; drop?: string[]; add?: [string, number][] }> = {
  'The Beach Boys': { add: [['Surfin\' U.S.A.', 1963], ['I Get Around', 1964], ['California Girls', 1965], ['Wouldn\'t It Be Nice', 1966], ['God Only Knows', 1966], ['Good Vibrations', 1966]] },
  Cartola: { year: { 'O Mundo É Um Moinho': 1976 } },
  'Joy Division': { year: { 'Love Will Tear Us Apart': 1980 } },
  'Édith Piaf': { year: { 'Non, je ne regrette rien': 1960 } },
  'João Gilberto': { year: { 'Chega de Saudade': 1958, Desafinado: 1959, 'O Barquinho': 1961 } },
  'Ray Charles': { year: { 'Hit the Road Jack': 1961, 'Georgia on My Mind': 1960 } },
  'James Brown': { year: { 'I Got You (I Feel Good)': 1965 } },
  'Tom Jobim': { year: { Wave: 1967 } },
  'Domenico Modugno': { year: { "Nel blu dipinto di blu' (Volare)": 1958 }, drop: ['Nel Blu Dipinto Di Blu'] },
  'Jacques Brel': { year: { 'Ne me quitte pas': 1959 } },
  'Jim Croce': { year: { 'Time in a Bottle': 1972 } },
  'Bee Gees': { drop: ['Stayin Alive'], year: { 'More Than A Woman': 1977, 'Night Fever': 1977, 'How Deep Is Your Love': 1977 } },
  'Chitãozinho & Xororó': { year: { 'Evidências': 1990, 'Fio de Cabelo': 1982 } },
  'Amy Winehouse': { year: { 'Love Is A Losing Game': 2006 } },
  'Nara Leão': { year: { 'João E Maria': 1977 } }, // de "Os Meus Amigos São um Barato" (Chico Buarque e Sivuca)
  'Baden Powell': { year: { 'Canto de Yemanjá': 1966 } },
  'Wilson Simonal': { year: { 'Mamãe Passou Açúcar Em Mim': 1966 } },
  Sabotage: { year: { 'Rap É Compromisso': 2000, 'Um Bom Lugar': 2000, 'Respeito É pra Quem Tem': 2000, 'Mun Rá': 2000 } }, // "Rap É Compromisso!" (2000); "Canão Foi Tão Bom" é do póstumo (2016)
};

type AnyArtist = { n: string; m?: RealMember[]; al?: RealRelease[]; b?: number; x?: number; e?: number; rj?: [number, number?][]; exact?: false } & Record<string, unknown>;

function fixMembers(a: AnyArtist, add: RealMember[]): void {
  const ms = (a.m ??= []);
  for (const p of add) {
    const k = key27(p[0]);
    const same = ms.filter((m) => key27(m[0]) === k);
    const hit = same.length === 1 ? same[0] : same.find((m) => m[4] === p[4]);
    if (hit) {
      for (let i = 2; i < 6; i++) if (p[i] !== undefined) hit[i] = p[i];
      hit[1] = p[1];
    } else ms.push([...p] as RealMember);
  }
}

function applyOne(a: AnyArtist): void {
  const fx = FIX27[a.n];
  if (fx) {
    if (fx.set) Object.assign(a, fx.set);
    for (const k of fx.del ?? []) delete a[k];
    if (fx.mdel && a.m) a.m = a.m.filter((m) => !fx.mdel!.some((x) => key27(x) === key27(m[0])));
    if (fx.m) fixMembers(a, fx.m);
    if (fx.again) a.m = [...(a.m ?? []), ...fx.again.map((m) => [...m] as RealMember)];
    if (fx.al) { const have = new Set((a.al ?? []).map((r) => key27(r[0]))); a.al = [...(a.al ?? []), ...fx.al.filter((r) => !have.has(key27(r[0])))]; }
    if (fx.alYear) for (const r of a.al ?? []) { const y = fx.alYear[r[0]]; if (y !== undefined) r[1] = y; }
  }
  const born = BORN27[a.n];
  if (born) for (const m of a.m ?? []) { const y = born[m[0]]; if (y !== undefined && m[2] === undefined) m[2] = y; }
  // mortes: integrantes e solos (o fim de carreira do solo acompanha a morte)
  for (const m of a.m ?? []) {
    const k = m[0];
    if (k in DEATH_FIX27) { const y = DEATH_FIX27[k]; m[3] = y ?? undefined; }
    else if (DEATHS27[k] !== undefined && m[3] === undefined) m[3] = DEATHS27[k];
  }
  if (!a.m?.length || (a.m.length === 1 && key27(a.m[0][0]) === key27(a.n))) {
    const y = a.n in DEATH_FIX27 ? DEATH_FIX27[a.n] : DEATHS27[a.n];
    if (y !== undefined && a.x === undefined && y !== null) { a.x = y; if (a.e === undefined || a.e > y) a.e = y; }
  }
  // remove a sobra de undefined no fim (mantém o formato curto)
  for (const m of a.m ?? []) while (m.length > 2 && m[m.length - 1] === undefined) m.pop();
}

/** Aplica a auditoria às listas de artistas reais e ao catálogo clássico (por nome em REAL_ACTS). */
export function applyAudit27(xs: AnyArtist[] | RealArtist[], classic?: { extra: Record<number, ClassicExtra>; names: Record<number, { name: string }> }): void {
  for (const a of xs as AnyArtist[]) applyOne(a);
  if (classic) for (const [no, ex] of Object.entries(classic.extra)) {
    const n = classic.names[+no]?.name;
    if (!n) continue;
    const tmp = ex as unknown as AnyArtist;
    tmp.n = n; applyOne(tmp); delete (tmp as Partial<AnyArtist>).n;
  }
}

/** Corrige o mapa de músicas (SONGS22) no lugar. */
export function applySongs27(songs: Record<string, [string, number][]>): void {
  for (const [artist, fx] of Object.entries(SONGFIX27)) {
    const xs = songs[artist];
    if (!xs) continue;
    let out = xs.filter(([t]) => !fx.drop?.includes(t)).map(([t, y]) => [t, fx.year?.[t] ?? y] as [string, number]);
    const have = new Set(out.map(([t]) => key27(t)));
    out = [...out, ...(fx.add ?? []).filter(([t]) => !have.has(key27(t)))];
    songs[artist] = out.sort((p, q) => p[1] - q[1]);
  }
}
