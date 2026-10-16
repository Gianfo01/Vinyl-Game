// R31 · onda 4 (BASE-IT) — BASE ITALIANA: artistas e bandas reais da Itália que faltavam, de 1902 (primeiros discos de
// ópera) a 2026 (Sanremo de Sal Da Vinci). Entram no FIM de REAL_ALL (sim/sys/realworld.ts), depois de BASE31_ACTS e do
// lote BR (ordem BR, IT, HITS): o número de catálogo dos atos que já existiam não muda. Nome já presente na base é
// descartado no carregamento (dedupKey27). Ficam atrás do interruptor `base31.it` (ligado por padrão; desligado, nenhum
// destes atos nasce e o mundo é o de antes — goldens iguais).
//
// Curadoria por ato (fontes, cidade real quando o jogo não tem, apelidos, campos a confirmar): `IT31` abaixo; a ficha
// entra em CUR31 (src/data/cur31.ts) e o nome real em realnames31 (espaço 'cur', chave = slug31 do nome).
//
// Regras desta base (docs/r31/base-it.md):
// - Nada inventado. Campo incerto fica de fora (nascimento, integrantes) ou vai em `ap`; ato sem obra conferida não entra.
// - Gênero: só os que já existem (swing → big_band/vocal_jazz; urlatori → rnr; italo dance → eurodance/dance_pop;
//   cantautori; canzone; canzone_napoletana; prog; italo; trap; indie; soundtrack…). Nenhum gênero novo.
// - Cidade: o jogo só tem Milão, Roma e Nápoles na Itália. Cada ato vai para a mais próxima em linha reta da cidade real
//   (Norte, Emília e litoral toscano → Milão; Florença, Toscana do sul, Marcas, Romanha a leste de Ravena, Úmbria,
//   Lácio, Abruzos e Sardenha → Roma; Campânia, Molise, Apúlia, Basilicata, Calábria, Sicília e Formia → Nápoles).
//   A cidade real fica em `rc` na curadoria.
// - Fontes (códigos em `FO31`): Wikipedia (it) do artista e Discogs para todos; albo d'oro de Sanremo/Eurovision quando
//   o ato venceu; "ws" = conferido por busca nesta sessão (a rede da sessão não alcança Wikidata/MusicBrainz/Wikipedia
//   direto — ver relatório).
import type { RealArtist, RealMember, RealRelease, RealRole } from './realtypes';

export interface It31 {
  a: RealArtist;
  /** códigos de fonte (FO31) e anos de Sanremo/Eurovision vencidos ("sr1958") */
  fo: string[];
  /** cidade real quando o jogo não tem (ex.: "Gênova") */
  rc?: string;
  /** apelidos/nome de batismo */
  nick?: string[];
  /** campos a confirmar */
  cf?: string[];
}

/** Fontes por código. "sr<ano>" e "ev<ano>" são montados na curadoria. */
export const FO31: Record<string, string> = {
  wi: 'Wikipedia (it): verbete do artista',
  dc: 'Discogs: discografia do artista',
  hpi: 'Hit Parade Italia (classifiche annuali)',
  fimi: 'FIMI (classifiche e certificazioni)',
  ws: 'Conferido por busca na web (sessão BASE-IT, 2026-10-16)',
};

type O = Partial<RealArtist> & { rc?: string; nick?: string[]; cf?: string[] };
const u = undefined;
const IT: It31[] = [];
const pack = (a: RealArtist, fo: string, o: O): void => {
  const { rc, nick, cf, ...rest } = o;
  IT.push({ a: { ...a, ...rest }, fo: ['wi', 'dc', ...fo.split(' ').filter(Boolean)], rc, nick, cf });
};
/** solo: nome, gênero, cidade, estreia, nascimento, morte, obras, fontes extras, opções (papel padrão: voz) */
function s(n: string, g: string, c: string, d: number, b: number | undefined, x: number | undefined, al: RealRelease[], fo = '', o: O = {}): void {
  const r: RealRole = o.r ?? 'vocal';
  pack({ n, g, c, d, t: 3, cn: 'ITA', ...(b !== u ? { b } : {}), ...(x !== u ? { x, e: x } : {}), r, al }, fo, o);
}
/** banda/dupla: nome, gênero, cidade, estreia, fim, integrantes, obras, fontes extras, opções */
function bd(n: string, g: string, c: string, d: number, e: number | undefined, m: RealMember[], al: RealRelease[], fo = '', o: O = {}): void {
  pack({ n, g, c, d, t: 3, cn: 'ITA', ...(e !== u ? { e } : {}), ...(m.length ? { m } : {}), al }, fo, o);
}

// ================================================================ 1902–1945 · ópera em disco, napolitana, café-concerto, swing
s('Francesco Tamagno', 'opera', 'milan', 1903, 1850, 1905, [['Otello: Esultate!', 1903, 'single']], '', { rc: 'Turim' });
s('Ezio Pinza', 'opera', 'rome', 1915, 1892, 1957, [['Some Enchanted Evening', 1949, 'single']], '', { ap: ['d'] });
s('Toti Dal Monte', 'opera', 'milan', 1916, 1893, 1975, [['Madama Butterfly', 1939]], '', { rc: 'Mogliano Veneto', nick: ['Antonietta Meneghel'], ap: ['d'] });
s('Armando Gill', 'canzone_napoletana', 'naples', 1918, 1877, 1945, [['Come pioveva', 1918, 'single']], '', { nick: ['Michele Testa'], ap: ['d'] });
s('Nino Taranto', 'canzone_napoletana', 'naples', 1940, 1907, 1986, [['Ciccio Formaggio', 1940, 'single']], '', { ap: ['d'] });
s('Odoardo Spadaro', 'trad_pop', 'rome', 1938, 1893, 1965, [['La porti un bacione a Firenze', 1938, 'single']], '', { rc: 'Florença', ap: ['d'] });
s('Alberto Rabagliati', 'trad_pop', 'milan', 1940, 1906, 1974, [['Ba-ba-baciami piccina', 1940, 'single']], '', { ap: ['d'] });
s('Gorni Kramer', 'big_band', 'milan', 1936, 1913, 1995, [['Crapa pelada', 1936, 'single']], '', { r: 'keys', rc: 'Rivarolo Mantovano', nick: ['Francesco Kramer Gorni'], ap: ['d'] });
bd('Quartetto Cetra', 'big_band', 'rome', 1941, 1988, [['Virgilio Savona', 'keys', 1919, 2009], ['Tata Giacobetti', 'vocal', 1922, 1988], ['Felice Chiusano', 'vocal', 1922, 1990], ['Lucia Mannucci', 'vocal', 1920, 2012, 1947]],
  [['Nella vecchia fattoria', 1949, 'single'], ['Un bacio a mezzanotte', 1952, 'single']], '', { f: 1940, ap: ['m'] });
s('Renato Rascel', 'trad_pop', 'rome', 1941, 1912, 1991, [['Arrivederci Roma', 1955, 'single'], ['Romantica', 1960, 'single']], 'sr1960', { t: 2, nick: ['Renato Ranucci'], ap: ['d'] });
s('Tito Gobbi', 'opera', 'milan', 1938, 1913, 1984, [['Tosca', 1953]], '', { rc: 'Bassano del Grappa', ap: ['d'] });
s('Giuseppe Di Stefano', 'opera', 'naples', 1946, 1921, 2008, [['Tosca', 1953]], '', { t: 2, rc: 'Motta Sant\'Anastasia (Catânia)', ap: ['d'] });
s('Renata Tebaldi', 'opera', 'rome', 1944, 1922, 2004, [['Otello', 1954], ['Aida', 1959]], '', { t: 2, rc: 'Pesaro', ap: ['d'] });
s('Mario Del Monaco', 'opera', 'rome', 1941, 1915, 1982, [['Otello', 1954]], '', { rc: 'Florença', ap: ['d'] });
s('Carlo Bergonzi', 'opera', 'milan', 1951, 1924, 2014, [['Aida', 1959], ['Madama Butterfly', 1966]], '', { rc: 'Polesine Parmense', ap: ['d'] });
s('Renata Scotto', 'opera', 'milan', 1953, 1934, 2023, [['Madama Butterfly', 1966]], '', { rc: 'Savona', ap: ['d'] });
s('Mirella Freni', 'opera', 'milan', 1955, 1935, 2020, [['La bohème', 1972]], '', { t: 2, rc: 'Módena', ap: ['d'] });
s('Cecilia Bartoli', 'opera', 'rome', 1988, 1966, u, [['The Vivaldi Album', 1999]], '', { t: 2, ap: ['d'] });
s('Vittorio Grigolo', 'opera', 'rome', 2010, 1977, u, [['The Italian Tenor', 2010]], '', { rc: 'Arezzo (criado em Roma)' });
bd('Il Volo', 'canzone', 'rome', 2010, u, [['Piero Barone', 'vocal', 1993], ['Ignazio Boschetto', 'vocal', 1994], ['Gianluca Ginoble', 'vocal', 1995]],
  [['Il Volo', 2010], ['Grande amore', 2015, 'single']], 'sr2015', { t: 2, f: 2009, rc: 'formado no programa "Ti lascio una canzone"' });
s('Maurizio Pollini', 'classical', 'milan', 1960, 1942, 2024, [['Chopin: Études', 1972]], '', { r: 'keys', ap: ['d'] });
s('Arturo Benedetti Michelangeli', 'classical', 'milan', 1939, 1920, 1995, [['Debussy: Images, Children\'s Corner', 1971]], '', { r: 'keys', rc: 'Brescia', ap: ['d'] });
bd('I Musici', 'classical', 'rome', 1955, u, [], [['Le quattro stagioni', 1955]], '', { f: 1951, ap: ['f'] });
s('Giovanni Allevi', 'classical', 'rome', 2005, 1969, u, [['Joy', 2006]], '', { r: 'keys', rc: 'Ascoli Piceno', ap: ['d'] });
s('Ezio Bosso', 'classical', 'milan', 2004, 1971, 2020, [['The 12th Room', 2015]], '', { r: 'keys', rc: 'Turim', ap: ['d'] });

// ================================================================ trilhas sonoras (compositores como artistas de disco)
s('Nino Rota', 'soundtrack', 'milan', 1933, 1911, 1979, [['La dolce vita', 1960, 'lp', 'soundtrack'], ['Il padrino', 1972, 'lp', 'soundtrack']], '', { t: 2, r: 'keys' });
s('Armando Trovajoli', 'soundtrack', 'rome', 1950, 1917, 2013, [['Roma nun fa\' la stupida stasera', 1962, 'single']], '', { r: 'keys', ap: ['d'] });
s('Riz Ortolani', 'soundtrack', 'rome', 1955, 1926, 2014, [['Mondo cane (More)', 1962, 'lp', 'soundtrack']], '', { r: 'keys', rc: 'Pesaro', ap: ['d'] });
s('Piero Umiliani', 'soundtrack', 'rome', 1958, 1926, 2001, [['Mah nà mah nà', 1968, 'single']], '', { r: 'keys', rc: 'Florença', ap: ['d'] });
s('Stelvio Cipriani', 'soundtrack', 'rome', 1966, 1937, 2018, [['Anonimo veneziano', 1970, 'lp', 'soundtrack']], '', { r: 'keys', ap: ['d'] });
s('Fabio Frizzi', 'soundtrack', 'milan', 1975, 1951, u, [['Zombi 2', 1979, 'lp', 'soundtrack']], '', { r: 'keys', rc: 'Bolonha', ap: ['d'] });
s('Nicola Piovani', 'soundtrack', 'rome', 1970, 1946, u, [['La vita è bella', 1997, 'lp', 'soundtrack']], '', { r: 'keys', ap: ['d'] });
s('Dario Marianelli', 'soundtrack', 'milan', 1997, 1963, u, [['Atonement', 2007, 'lp', 'soundtrack']], '', { r: 'keys', rc: 'Pisa', ap: ['d'] });
bd('Oliver Onions', 'soundtrack', 'rome', 1974, u, [['Guido De Angelis', 'vocal', 1944], ['Maurizio De Angelis', 'keys', 1947]], [['Dune Buggy', 1974, 'single']], '', { nick: ['Guido & Maurizio De Angelis'] });
bd('Goblin', 'prog', 'rome', 1975, u, [['Claudio Simonetti', 'keys', 1952], ['Massimo Morante', 'guitar'], ['Fabio Pignatelli', 'bass']],
  [['Profondo rosso', 1975, 'lp', 'soundtrack'], ['Suspiria', 1977, 'lp', 'soundtrack']], '', { t: 2, f: 1972, ap: ['m'] });
s('Pino Donaggio', 'canzone', 'milan', 1961, 1941, u, [['Io che non vivo (senza te)', 1965, 'single'], ['Carrie', 1976, 'lp', 'soundtrack']], '', { rc: 'Burano (Veneza)', ap: ['d'] });
bd('Calibro 35', 'soundtrack', 'milan', 2008, u, [], [['Calibro 35', 2008]], '', { f: 2007 });

// ================================================================ 1945–1959 · canção napolitana, crooners, primeiros Sanremos
s('Sergio Bruni', 'canzone_napoletana', 'naples', 1944, 1921, 2003, [['Carmela', 1976, 'single']], '', { nick: ['Guglielmo Chianese'], ap: ['d'] });
s('Aurelio Fierro', 'canzone_napoletana', 'naples', 1951, 1923, 2005, [['Guaglione', 1956, 'single'], ['Lazzarella', 1957, 'single']], '', { ap: ['d'] });
s('Nunzio Gallo', 'canzone_napoletana', 'naples', 1952, 1928, 2008, [['Corde della mia chitarra', 1957, 'single']], 'sr1957', { ap: ['d'] });
s('Tullio Pane', 'canzone_napoletana', 'naples', 1948, u, u, [['Buongiorno tristezza', 1955, 'single']], 'sr1955', { ap: ['d'], cf: ['anos de nascimento e morte'] });
s('Gino Latilla', 'canzone', 'naples', 1950, 1924, 2011, [['Tutte le mamme', 1954, 'single']], 'sr1954', { rc: 'Bari', ap: ['d'] });
s('Giorgio Consolini', 'canzone', 'milan', 1949, 1920, 2012, [['Tutte le mamme', 1954, 'single']], 'sr1954', { rc: 'Bolonha', ap: ['d'] });
s('Carla Boni', 'canzone', 'milan', 1951, 1925, 2009, [['Viale d\'autunno', 1953, 'single']], 'sr1953', { rc: 'Ferrara', ap: ['d'] });
s('Flo Sandon\'s', 'canzone', 'milan', 1950, 1924, 2006, [['Viale d\'autunno', 1953, 'single']], 'sr1953', { rc: 'Vigevano', nick: ['Mafalda Minnozzi'], ap: ['d'] });
s('Franca Raimondi', 'canzone', 'naples', 1955, 1932, 1988, [['Aprite le finestre', 1956, 'single']], 'sr1956 ws', { rc: 'Monopoli (Bari)', ap: ['d'] });
s('Fred Buscaglione', 'big_band', 'milan', 1955, 1921, 1960, [['Che bambola!', 1956, 'single'], ['Eri piccola così', 1958, 'single'], ['Guarda che luna', 1959, 'single']], '', { t: 2, rc: 'Turim', ap: ['d'] });
s('Teddy Reno', 'trad_pop', 'milan', 1948, 1926, u, [['Piccolissima serenata', 1957, 'single']], '', { rc: 'Trieste', nick: ['Ferruccio Merk Ricordi'], ap: ['d'] });
s('Johnny Dorelli', 'canzone', 'milan', 1957, 1937, u, [['Nel blu dipinto di blu', 1958, 'single'], ['Piove', 1959, 'single']], 'sr1958 sr1959', { rc: 'Meda', nick: ['Giorgio Guidi'] });
s('Tony Dallara', 'rnr', 'naples', 1957, 1936, u, [['Come prima', 1957, 'single'], ['Romantica', 1960, 'single']], 'sr1960', { rc: 'Campobasso', nick: ['Antonio Lardera'] });
s('Jula de Palma', 'canzone', 'milan', 1957, 1932, u, [['Tua', 1959, 'single']], '', { ap: ['d'] });
s('Bruno Martino', 'vocal_jazz', 'rome', 1958, 1925, 2000, [['Estate', 1960, 'single']], '', { r: 'keys', ap: ['d'] });
s('Betty Curtis', 'canzone', 'milan', 1957, 1936, 2006, [['Al di là', 1961, 'single']], 'sr1961', { nick: ['Roberta Corti'], ap: ['d'] });
s('Luciano Tajoli', 'trad_pop', 'milan', 1940, 1920, 1996, [['Al di là', 1961, 'single']], 'sr1961', { ap: ['d'] });
s('Gino Paoli', 'cantautori', 'milan', 1959, 1934, u, [['Senza fine', 1961, 'single'], ['Sapore di sale', 1963, 'single']], '', { t: 2, rc: 'Gênova (nascido em Monfalcone)' });
s('Umberto Bindi', 'cantautori', 'milan', 1959, 1932, 2002, [['Il nostro concerto', 1960, 'single']], '', { rc: 'Gênova' });
s('Giorgio Gaber', 'cantautori', 'milan', 1958, 1939, 2003, [['Non arrossire', 1960, 'single'], ['La libertà', 1972, 'single']], 'ws', { t: 2, nick: ['Giorgio Gaberscik', 'Il Signor G'] });
s('Enzo Jannacci', 'cantautori', 'milan', 1959, 1935, 2013, [['Vengo anch\'io. No, tu no', 1968, 'single']], 'ws', { t: 2 });

// ================================================================ 1960–1969 · urlatori, beat, Sanremo, primeiros cantautori
s('Milva', 'canzone', 'milan', 1960, 1939, 2021, [['Milord', 1960, 'single'], ['La filanda', 1972, 'single']], '', { t: 2, rc: 'Goro (Ferrara)', nick: ['Maria Ilva Biolcati', 'La Pantera di Goro'] });
s('Nico Fidenco', 'canzone', 'rome', 1960, 1933, 2022, [['What a Sky (Su nel cielo)', 1960, 'single'], ['Legata a un granello di sabbia', 1961, 'single']], '', { nick: ['Domenico Colarossi'] });
s('Gianni Meccia', 'canzone', 'milan', 1959, 1931, u, [['Il barattolo', 1960, 'single']], '', { rc: 'Ferrara', cf: ['cidade de nascimento'] });
s('Tony Renis', 'canzone', 'milan', 1959, 1938, u, [['Quando quando quando', 1962, 'single'], ['Uno per tutte', 1963, 'single']], 'sr1963', { nick: ['Elio Cesari'], ap: ['d'] });
s('Emilio Pericoli', 'canzone', 'rome', 1958, 1928, 2013, [['Al di là', 1962, 'single'], ['Uno per tutte', 1963, 'single']], 'sr1963', { rc: 'Cesenatico', ap: ['d'] });
s('Claudia Mori', 'canzone', 'rome', 1960, 1944, u, [['Chi non lavora non fa l\'amore', 1970, 'single']], 'sr1970', { nick: ['Claudia Moroni'], ap: ['d'], cf: ['ano do 1º disco'] });
s('Peppino di Capri', 'canzone', 'naples', 1958, 1939, u, [['St. Tropez Twist', 1962, 'single'], ['Roberta', 1963, 'single'], ['Un grande amore e niente più', 1973, 'single'], ['Non lo faccio più', 1976, 'single']], 'sr1973 sr1976', { t: 2, rc: 'Capri', nick: ['Giuseppe Faiella'] });
s('Sergio Endrigo', 'cantautori', 'milan', 1959, 1933, 2005, [['Io che amo solo te', 1962, 'single'], ['Canzone per te', 1968, 'single']], 'sr1968', { t: 2, rc: 'Pola (Ístria)', cf: ['cidade de origem no jogo (viveu em Veneza, Milão e Roma)'] });
s('Bruno Lauzi', 'cantautori', 'milan', 1962, 1937, 2006, [['Ritornerai', 1963, 'single']], '', { rc: 'Gênova (nascido em Asmara)', ap: ['d'] });
s('Gigliola Cinquetti', 'canzone', 'milan', 1963, 1947, u, [['Non ho l\'età', 1964, 'single'], ['Dio, come ti amo', 1966, 'single'], ['La pioggia', 1969, 'single']], 'sr1964 sr1966 ev1964', { t: 2, rc: 'Verona' });
s('Bobby Solo', 'rnr', 'rome', 1964, 1945, u, [['Una lacrima sul viso', 1964, 'single'], ['Se piangi, se ridi', 1965, 'single'], ['Zingara', 1969, 'single']], 'sr1965 sr1969', { t: 2, nick: ['Roberto Satti'] });
s('Jimmy Fontana', 'canzone', 'rome', 1960, 1934, 2013, [['Il mondo', 1965, 'single']], '', { rc: 'Camerino', nick: ['Enrico Sbriccoli'], ap: ['d'] });
s('Iva Zanicchi', 'canzone', 'milan', 1963, 1940, u, [['Non pensare a me', 1967, 'single'], ['Zingara', 1969, 'single'], ['Ciao cara come stai?', 1974, 'single']], 'sr1967 sr1969 sr1974', { t: 2, rc: 'Ligonchio (Reggio Emília)', nick: ['L\'aquila di Ligonchio'] });
s('Caterina Caselli', 'beat', 'milan', 1963, 1946, u, [['Nessuno mi può giudicare', 1966, 'single'], ['Perdono', 1966, 'single']], '', { t: 2, rc: 'Sassuolo (Módena)', nick: ['Casco d\'oro'] });
s('Orietta Berti', 'canzone', 'milan', 1965, 1943, u, [['Io, tu e le rose', 1967, 'single'], ['Finché la barca va', 1970, 'single']], '', { t: 2, rc: 'Cavriago (Reggio Emília)' });
s('Fausto Leali', 'canzone', 'milan', 1962, 1944, u, [['A chi', 1967, 'single'], ['Ti lascerò', 1989, 'single']], 'sr1989', { rc: 'Nuvolento (Brescia)', ap: ['d'] });
s('Don Backy', 'canzone', 'milan', 1962, 1939, u, [['L\'immensità', 1967, 'single']], '', { rc: 'Santa Croce sull\'Arno', nick: ['Aldo Caponi'], ap: ['d'] });
s('Gabriella Ferri', 'canzone', 'rome', 1964, 1942, 2004, [['Remedios', 1974, 'single']], 'ws', { ap: ['d'] });
s('Mino Reitano', 'canzone', 'naples', 1961, 1944, 2009, [['Italia', 1988, 'single']], 'ws', { rc: 'Fiumara (Reggio Calábria)', ap: ['d'] });
s('Nicola Di Bari', 'canzone', 'naples', 1964, 1940, u, [['Il cuore è uno zingaro', 1971, 'single'], ['I giorni dell\'arcobaleno', 1972, 'single']], 'sr1971 sr1972', { rc: 'Zapponeta (Foggia)', nick: ['Michele Scommegna'], ap: ['d'] });
s('Memo Remigi', 'canzone', 'milan', 1963, 1938, u, [['Innamorati a Milano', 1965, 'single']], '', { rc: 'Erba', ap: ['d'] });
s('Mario Merola', 'canzone_napoletana', 'naples', 1963, 1934, 2006, [['So\' nnato carcerato', 1963, 'single']], 'ws', { t: 2, nick: ['Re della sceneggiata'] });
bd('I Camaleonti', 'beat', 'milan', 1965, u, [], [['L\'ora dell\'amore', 1968, 'single'], ['Applausi', 1968, 'single']], '', { f: 1963, ap: ['d'] });
bd('I Corvi', 'beat', 'milan', 1966, 1970, [], [['Un ragazzo di strada', 1966, 'single']], '', { rc: 'Parma', ap: ['d'] });
bd('Cochi e Renato', 'cabaret', 'milan', 1965, u, [['Cochi Ponzoni', 'vocal', 1941], ['Renato Pozzetto', 'vocal', 1940]], [['E la vita, la vita', 1974, 'single']], '', { ap: ['d'] });
s('Franco Califano', 'cantautori', 'rome', 1965, 1938, 2013, [['Tutto il resto è noia', 1977, 'single']], '', { nick: ['Il Califfo'], rc: 'Roma (nascido em Trípoli)', ap: ['d'] });
bd('Nuova Compagnia di Canto Popolare', 'folk', 'naples', 1971, u, [], [['Nuova Compagnia di Canto Popolare', 1971], ['Tammurriata nera', 1974, 'single']], 'ws', { f: 1967, nick: ['NCCP'] });

// ================================================================ 1970–1979 · Sanremo, cantautori, prog, napolitanos
bd('Le Orme', 'prog', 'milan', 1967, u, [['Aldo Tagliapietra', 'vocal'], ['Toni Pagliuca', 'keys'], ['Michi Dei Rossi', 'drums']], [['Collage', 1971], ['Felona e Sorona', 1973]], '', { t: 2, f: 1966, rc: 'Marghera (Veneza)', ap: ['m'] });
bd('New Trolls', 'prog', 'milan', 1967, u, [['Vittorio De Scalzi', 'guitar'], ['Nico Di Palo', 'guitar']], [['Senza orario senza bandiera', 1968], ['Concerto grosso per i New Trolls', 1971]], '', { t: 2, f: 1966, rc: 'Gênova', ap: ['m'] });
bd('Banco del Mutuo Soccorso', 'prog', 'rome', 1972, u, [['Francesco Di Giacomo', 'vocal', 1947, 2014], ['Vittorio Nocenzi', 'keys', 1951], ['Gianni Nocenzi', 'keys']],
  [['Banco del Mutuo Soccorso', 1972], ['Darwin!', 1972], ['Io sono nato libero', 1973]], '', { t: 2, f: 1969, nick: ['Banco'] });
bd('Area', 'prog', 'milan', 1973, u, [['Demetrio Stratos', 'vocal', 1945, 1979, u, 1979], ['Giulio Capiozzo', 'drums'], ['Patrizio Fariselli', 'keys'], ['Ares Tavolazzi', 'bass'], ['Paolo Tofani', 'guitar']],
  [['Arbeit macht frei', 1973], ['Crac!', 1975]], '', { f: 1972, nick: ['Area – International POPular Group'], ap: ['m'] });
bd('Osanna', 'prog', 'naples', 1971, u, [], [['L\'uomo', 1971], ['Palepoli', 1973]], '', { f: 1971 });
bd('Il Balletto di Bronzo', 'prog', 'naples', 1970, u, [], [['Ys', 1972]], '', { ap: ['d'] });
bd('Museo Rosenbach', 'prog', 'milan', 1973, u, [], [['Zarathustra', 1973]], '', { rc: 'Bordighera' });
bd('Napoli Centrale', 'fusion', 'naples', 1975, u, [['James Senese', 'horns', 1945]], [['Napoli Centrale', 1975]], '');
bd('Il Giardino dei Semplici', 'canzone', 'naples', 1974, u, [], [['M\'innamorai', 1975, 'single']], '', { ap: ['d'] });
bd('I Cugini di Campagna', 'canzone', 'rome', 1970, u, [], [['Anima mia', 1973, 'single']], '', { ap: ['d'] });
bd('I Santo California', 'canzone', 'naples', 1974, u, [], [['Tornerò', 1975, 'single']], '', { rc: 'Torre del Greco', ap: ['d'] });
s('Marcella Bella', 'canzone', 'naples', 1969, 1952, u, [['Montagne verdi', 1972, 'single']], '', { rc: 'Catânia', ap: ['d'] });
s('Gianni Bella', 'canzone', 'naples', 1970, 1947, u, [['Non si può morire dentro', 1976, 'single']], '', { rc: 'Catânia', ap: ['d'] });
s('Mia Martini', 'canzone', 'naples', 1963, 1947, 1995, [['Piccolo uomo', 1972, 'single'], ['Minuetto', 1973, 'single'], ['Almeno tu nell\'universo', 1989, 'single']], '', { t: 2, rc: 'Bagnara Calabra', nick: ['Domenica Bertè', 'Mimì'], ap: ['d'] });
s('Drupi', 'canzone', 'milan', 1973, 1947, u, [['Vado via', 1973, 'single']], '', { rc: 'Pavia', nick: ['Giampiero Anelli'] });
s('Riccardo Cocciante', 'cantautori', 'rome', 1972, 1946, u, [['Bella senz\'anima', 1974, 'single'], ['Margherita', 1976, 'single'], ['Se stiamo insieme', 1991, 'single']], 'sr1991', { t: 2, rc: 'Roma (nascido em Saigon)' });
s('Claudio Baglioni', 'cantautori', 'rome', 1969, 1951, u, [['Questo piccolo grande amore', 1972], ['Strada facendo', 1981], ['La vita è adesso', 1985]], 'hpi', { t: 2 });
s('Antonello Venditti', 'cantautori', 'rome', 1972, 1949, u, [['Roma capoccia', 1972, 'single'], ['Notte prima degli esami', 1984, 'single'], ['Ci vorrebbe un amico', 1984, 'single']], 'hpi', { t: 2 });
s('Renato Zero', 'canzone', 'rome', 1967, 1950, u, [['Il cielo', 1977, 'single'], ['Triangolo', 1978, 'single'], ['I migliori anni della nostra vita', 1995, 'single']], 'hpi', { t: 2, nick: ['Renato Fiacchini'] });
s('Roberto Vecchioni', 'cantautori', 'milan', 1971, 1943, u, [['Luci a San Siro', 1971, 'single'], ['Samarcanda', 1977, 'single'], ['Chiamami ancora amore', 2011, 'single']], 'sr2011', { t: 2 });
s('Angelo Branduardi', 'folk', 'milan', 1974, 1950, u, [['Alla fiera dell\'est', 1976]], '', { r: 'strings', rc: 'Cuggiono' });
s('Eugenio Finardi', 'cantautori', 'milan', 1975, 1952, u, [['Musica ribelle', 1976, 'single'], ['Extraterrestre', 1978, 'single']], '');
s('Pierangelo Bertoli', 'cantautori', 'milan', 1974, 1942, 2002, [['Pescatore', 1985, 'single'], ['Spunta la luna dal monte', 1991, 'single']], '', { rc: 'Sassuolo (Módena)', ap: ['d'] });
s('Claudio Lolli', 'cantautori', 'milan', 1972, 1950, 2018, [['Ho visto anche degli zingari felici', 1976]], '', { rc: 'Bolonha' });
s('Ivan Graziani', 'cantautori', 'rome', 1973, 1945, 1997, [['Lugano addio', 1977, 'single'], ['Pigro', 1978]], '', { r: 'guitar', rc: 'Teramo', ap: ['d'] });
s('Eugenio Bennato', 'folk', 'naples', 1976, 1949, u, [['Brigante se more', 1980]], 'ws', { ap: ['d'], cf: ['ano de "Brigante se more" (1979 ou 1980 conforme a fonte)'] });
s('Angela Luce', 'canzone_napoletana', 'naples', 1958, 1938, u, [['Ipocrisia', 1975, 'single']], '', { nick: ['Angela Savino'], ap: ['d'] });
s('Pupo', 'canzone', 'rome', 1975, 1955, u, [['Gelato al cioccolato', 1979, 'single'], ['Su di noi', 1980, 'single']], '', { rc: 'Ponticino (Arezzo)', nick: ['Enzo Ghinazzi'] });
s('Riccardo Fogli', 'canzone', 'milan', 1973, 1947, u, [['Storie di tutti i giorni', 1982, 'single']], 'sr1982', { rc: 'Pontedera', cf: ['ex-Pooh (1966–1973)'] });
s('Gianni Togni', 'cantautori', 'rome', 1975, 1956, u, [['Luna', 1980, 'single']], '', { ap: ['d'] });
s('Ron', 'cantautori', 'milan', 1970, 1953, u, [['Una città per cantare', 1980, 'single'], ['Vorrei incontrarti fra cent\'anni', 1996, 'single']], 'sr1996', { rc: 'Dorno (Pavia)', nick: ['Rosalino Cellamare'] });
s('Adriano Pappalardo', 'canzone', 'naples', 1972, 1945, u, [['Ricominciamo', 1979, 'single']], '', { rc: 'Copertino (Lecce)', ap: ['d'] });
s('Eduardo De Crescenzo', 'canzone', 'naples', 1978, 1951, u, [['Ancora', 1981, 'single']], '', { ap: ['d'] });
s('Tullio De Piscopo', 'canzone_napoletana', 'naples', 1974, 1946, u, [['Andamento lento', 1988, 'single']], '', { r: 'drums', ap: ['d'] });

// ================================================================ 1980–1989 · Sanremo, new wave, italo disco, cantautori
s('Alice', 'canzone', 'rome', 1971, 1954, u, [['Per Elisa', 1981, 'single'], ['I treni di Tozeur', 1984, 'single']], 'sr1981', { t: 2, rc: 'Forlì', nick: ['Carla Bissi'], ap: ['d'] });
s('Tiziana Rivale', 'canzone', 'naples', 1983, 1958, u, [['Sarà quel che sarà', 1983, 'single']], 'sr1983', { rc: 'Formia' });
s('Fiorella Mannoia', 'canzone', 'rome', 1968, 1954, u, [['Caffè nero bollente', 1981, 'single'], ['Quello che le donne non dicono', 1987, 'single'], ['Che sia benedetta', 2017, 'single']], 'hpi', { t: 2, ap: ['d'] });
s('Loretta Goggi', 'canzone', 'rome', 1969, 1950, u, [['Maledetta primavera', 1981, 'single']], '', { ap: ['d'] });
s('Fiordaliso', 'canzone', 'milan', 1981, 1956, u, [['Non voglio mica la luna', 1984, 'single']], '', { rc: 'Piacenza', nick: ['Marilena Fiordaliso'], ap: ['d'] });
s('Fabio Concato', 'cantautori', 'milan', 1977, 1953, u, [['Domenica bestiale', 1982, 'single']], '', { ap: ['d'] });
s('Sergio Caputo', 'cantautori', 'rome', 1983, 1954, u, [['Un sabato italiano', 1983]], '');
s('Alberto Camerini', 'new_wave', 'milan', 1976, 1951, u, [['Rock\'n\'roll robot', 1981, 'single']], '', { rc: 'Milão (nascido em São Paulo)', ap: ['d'] });
s('Garbo', 'new_wave', 'milan', 1981, 1958, u, [['A Berlino... va bene', 1981, 'single']], '', { nick: ['Renato Abate'] });
bd('Decibel', 'punk', 'milan', 1978, u, [['Enrico Ruggeri', 'vocal', 1957, u, u, 1981]], [['Contessa', 1980, 'single']], '', { f: 1977, ap: ['m'] });
s('Enrico Ruggeri', 'cantautori', 'milan', 1981, 1957, u, [['Si può dare di più', 1987, 'single'], ['Mistero', 1993, 'single']], 'sr1987 sr1993', { t: 2 });
bd('Gaznevada', 'new_wave', 'milan', 1979, u, [], [['I.C. Love Affair', 1983, 'single']], '', { f: 1977, rc: 'Bolonha', ap: ['d'] });
bd('Diaframma', 'new_wave', 'rome', 1982, u, [['Federico Fiumani', 'guitar']], [['Siberia', 1984]], '', { f: 1980, rc: 'Florença', ap: ['d'] });
bd('CCCP – Fedeli alla linea', 'punk', 'milan', 1984, 1990, [['Giovanni Lindo Ferretti', 'vocal', 1953], ['Massimo Zamboni', 'guitar', 1957]],
  [['Affinità-divergenze fra il compagno Togliatti e noi', 1986]], '', { f: 1982, rc: 'Reggio Emília (formados em Berlim)', nick: ['CCCP'] });
bd('Righeira', 'italo', 'milan', 1983, u, [['Johnson Righeira', 'vocal'], ['Michael Righeira', 'vocal']], [['Vamos a la playa', 1983, 'single'], ['L\'estate sta finendo', 1985, 'single']], 'hpi', { t: 2, rc: 'Turim' });
s('Gazebo', 'italo', 'rome', 1982, 1960, u, [['Masterpiece', 1982, 'single'], ['I Like Chopin', 1983, 'single']], 'hpi', { t: 2, rc: 'Roma (nascido em Beirute)', nick: ['Paul Mazzolini'] });
s('Ryan Paris', 'italo', 'rome', 1983, 1953, u, [['Dolce vita', 1983, 'single']], '', { nick: ['Fabio Roscioli'] });
s('Den Harrow', 'italo', 'milan', 1984, 1962, u, [['Future Brain', 1985, 'single'], ['Don\'t Break My Heart', 1987, 'single']], '', { rc: 'Nova Milanese', nick: ['Stefano Zandri'], cf: ['ano de "Future Brain"'] });
s('Savage', 'italo', 'milan', 1983, u, u, [['Don\'t Cry Tonight', 1983, 'single'], ['Only You', 1984, 'single']], '', { rc: 'Massa', nick: ['Roberto Zanetti'], cf: ['ano de nascimento'] });
bd('Baltimora', 'italo', 'milan', 1985, 1987, [['Jimmy McShane', 'vocal', 1957, 1995], ['Maurizio Bassi', 'keys']], [['Tarzan Boy', 1985, 'single']], '', { t: 2, f: 1984 });
s('Mike Francis', 'italo', 'rome', 1984, 1961, 2009, [['Survivor', 1984, 'single']], '', { rc: 'Florença', nick: ['Francesco Puccioni'] });
s('Pino D\'Angiò', 'italo', 'naples', 1980, 1952, 2024, [['Ma quale idea', 1980, 'single']], '', { rc: 'Pompeia', nick: ['Giuseppe Chierchia'] });
s('Sabrina', 'italo', 'milan', 1986, 1968, u, [['Boys (Summertime Love)', 1987, 'single'], ['Sexy Girl', 1987, 'single']], 'hpi', { t: 2, rc: 'Gênova', nick: ['Sabrina Salerno'] });
s('Spagna', 'italo', 'milan', 1986, 1954, u, [['Easy Lady', 1986, 'single'], ['Call Me', 1987, 'single'], ['Gente come noi', 1995, 'single']], 'hpi', { t: 2, rc: 'Verona', nick: ['Ivana Spagna'] });
s('Raf', 'canzone', 'naples', 1984, 1959, u, [['Self Control', 1984, 'single'], ['Cosa resterà degli anni \'80', 1989, 'single'], ['Infinito', 2001, 'single']], 'hpi', { t: 2, rc: 'Margherita di Savoia', nick: ['Raffaele Riefoli'] });
s('Mango', 'canzone', 'naples', 1976, 1954, 2014, [['Bella d\'estate', 1987, 'single']], '', { rc: 'Lagonegro', nick: ['Giuseppe Mango'], ap: ['d'] });
s('Luca Carboni', 'cantautori', 'milan', 1984, 1962, u, [['Silvia lo sai', 1987, 'single'], ['Mare mare', 1992, 'single']], '', { rc: 'Bolonha' });
bd('Stadio', 'pop_rock', 'milan', 1982, u, [], [['Chiedi chi erano i Beatles', 1984, 'single'], ['Un giorno mi dirai', 2016, 'single']], 'sr2016', { f: 1977, rc: 'Bolonha', ap: ['f'] });
s('Anna Oxa', 'canzone', 'naples', 1978, 1961, u, [['Un\'emozione da poco', 1978, 'single'], ['Ti lascerò', 1989, 'single'], ['Senza pietà', 1999, 'single']], 'sr1989 sr1999', { t: 2, rc: 'Bari', nick: ['Iliriana Hoxha'] });
s('Paola Turci', 'cantautori', 'rome', 1986, 1964, u, [['Bambini', 1989, 'single']], '');
s('Antonella Ruggiero', 'canzone', 'milan', 1996, 1952, u, [['Amore lontanissimo', 1998, 'single']], '', { rc: 'Gênova', cf: ['voz do Matia Bazar (1975–1989), já na base'] });
s('Nino D\'Angelo', 'canzone_napoletana', 'naples', 1976, 1957, u, [['Nu jeans e \'na maglietta', 1982, 'single'], ['Senza giacca e cravatta', 1999, 'single']], '', { t: 2, ap: ['d'] });
s('Amedeo Minghi', 'cantautori', 'rome', 1973, 1947, u, [['Vattene amore', 1990, 'single']], '', { ap: ['d'] });
s('Mietta', 'canzone', 'naples', 1988, 1969, u, [['Vattene amore', 1990, 'single']], '', { rc: 'Taranto', nick: ['Daniela Miglietta'] });
s('Michele Zarrillo', 'canzone', 'rome', 1981, 1957, u, [['Cinque giorni', 1994, 'single']], '', { ap: ['d'] });
s('Jo Squillo', 'new_wave', 'milan', 1980, 1962, u, [['Siamo donne', 1991, 'single']], '', { nick: ['Giovanna Coletti'], ap: ['d'] });
bd('Elio e le Storie Tese', 'pop_rock', 'milan', 1989, u, [['Elio', 'vocal', 1961]], [['Elio Samaga Hukapan Kariyana Turu', 1989], ['La terra dei cachi', 1996, 'single']], '', { t: 2, f: 1980, nick: ['Elii'] });
bd('Black Box', 'house', 'milan', 1989, u, [['Daniele Davoli', 'producer'], ['Mirko Limoni', 'keys'], ['Valerio Semplici', 'producer']], [['Ride on Time', 1989, 'single']], '', { t: 2, f: 1988, rc: 'Reggio Emília' });

// ================================================================ 1990–1999 · Sanremo, italo dance/eurodance, rock, rap, posse
s('Luca Barbarossa', 'cantautori', 'rome', 1981, 1961, u, [['Portami a ballare', 1992, 'single']], 'sr1992', { ap: ['d'] });
s('Aleandro Baldi', 'canzone', 'rome', 1986, 1959, u, [['Passerà', 1994, 'single']], 'sr1994', { rc: 'Greve in Chianti', ap: ['d'] });
s('Tosca', 'canzone', 'rome', 1992, 1967, u, [['Vorrei incontrarti fra cent\'anni', 1996, 'single']], 'sr1996', { nick: ['Tiziana Donati'], ap: ['d'] });
bd('Jalisse', 'canzone', 'milan', 1997, u, [['Alessandra Drusian', 'vocal', 1969], ['Fabio Ricci', 'guitar']], [['Fiumi di parole', 1997, 'single']], 'sr1997', { rc: 'Vêneto', ap: ['b'] });
s('Annalisa Minetti', 'canzone', 'milan', 1998, 1976, u, [['Senza te o con te', 1998, 'single']], 'sr1998', { rc: 'Rho' });
bd('Piccola Orchestra Avion Travel', 'canzone', 'naples', 1990, u, [['Peppe Servillo', 'vocal', 1960]], [['Sentimento', 2000, 'single']], 'sr2000', { f: 1980, rc: 'Caserta', nick: ['Avion Travel'], ap: ['d'] });
s('Marco Masini', 'cantautori', 'rome', 1990, 1964, u, [['Disperato', 1990, 'single'], ['L\'uomo volante', 2004, 'single']], 'sr2004', { rc: 'Florença' });
s('Paolo Vallesi', 'canzone', 'rome', 1991, 1964, u, [['La forza della vita', 1992, 'single']], '', { rc: 'Florença' });
s('Mario Biondi', 'vocal_jazz', 'naples', 2004, 1971, u, [['This Is What You Are', 2006, 'single']], '', { rc: 'Catânia', ap: ['d'] });
s('Gianluca Grignani', 'pop_rock', 'milan', 1994, 1972, u, [['Destinazione paradiso', 1995, 'single'], ['La mia storia tra le dita', 1995, 'single']], 'hpi');
s('Irene Grandi', 'pop_rock', 'rome', 1994, 1969, u, [['Prima di partire per un lungo viaggio', 2003, 'single'], ['Bruci la città', 2010, 'single']], '', { rc: 'Florença' });
s('Syria', 'canzone', 'rome', 1996, 1977, u, [['Non ci sto', 1996, 'single']], '', { nick: ['Cecilia Cipressi'] });
bd('Paola e Chiara', 'dance_pop', 'milan', 1997, u, [['Paola Iezzi', 'vocal', 1974], ['Chiara Iezzi', 'vocal', 1973]], [['Vamos a bailar (Esta vida nueva)', 2000, 'single'], ['Furore', 2023, 'single']], 'hpi', { t: 2 });
s('Carmen Consoli', 'cantautori', 'naples', 1996, 1974, u, [['Amore di plastica', 1996, 'single'], ['Confusa e felice', 1997, 'single']], 'hpi', { t: 2, r: 'guitar', rc: 'Catânia', nick: ['La cantantessa'] });
s('Samuele Bersani', 'cantautori', 'rome', 1992, 1970, u, [['Giudizi universali', 1997, 'single']], '', { rc: 'Rimini' });
s('Niccolò Fabi', 'cantautori', 'rome', 1996, 1968, u, [['Capelli', 1996, 'single']], '');
s('Alex Baroni', 'canzone', 'milan', 1997, 1966, 2002, [['Cambiare', 1997, 'single']], '');
bd('Neri per Caso', 'canzone', 'naples', 1995, u, [], [['Le ragazze', 1995, 'single']], '', { rc: 'Salerno' });
s('Max Pezzali', 'pop_rock', 'milan', 2004, 1967, u, [['Il mondo insieme a te', 2004]], 'hpi', { t: 2, rc: 'Pavia', cf: ['voz do 883 (já na base); carreira com o próprio nome desde 2004'] });
s('Alexia', 'eurodance', 'milan', 1995, 1967, u, [['Summer Is Crazy', 1995, 'single'], ['Uh La La La', 1997, 'single'], ['Per dire di no', 2003, 'single']], 'sr2003', { t: 2, rc: 'La Spezia', nick: ['Alessia Aquilani'] });
bd('Corona', 'eurodance', 'milan', 1993, u, [['Olga de Souza', 'vocal', 1965], ['Francesco Bontempi', 'producer']], [['The Rhythm of the Night', 1993, 'single'], ['Baby Baby', 1994, 'single']], '', { t: 2, rc: 'Brescia (projeto)', ap: ['b'] });
bd('Cappella', 'eurodance', 'milan', 1987, u, [['Gianfranco Bortolotti', 'producer']], [['U Got 2 Know', 1993, 'single'], ['Move On Baby', 1994, 'single']], '', { rc: 'Brescia' });
s('Gala', 'eurodance', 'milan', 1996, 1975, u, [['Freed from Desire', 1996, 'single']], '', { t: 2, nick: ['Gala Rizzatto'] });
s('Robert Miles', 'trance', 'milan', 1995, 1969, 2017, [['Children', 1995, 'single'], ['Fable', 1996, 'single']], '', { t: 2, r: 'producer', rc: 'Fagagna (Friul; nascido em Fleurier, Suíça)', nick: ['Roberto Concina'] });
s('Mo-Do', 'eurodance', 'milan', 1994, 1966, 2013, [['Eins, Zwei, Polizei', 1994, 'single']], '', { rc: 'Údine', nick: ['Fabio Frittelli'] });
s('Molella', 'eurodance', 'milan', 1993, u, u, [['If You Wanna Party', 1995, 'single']], '', { r: 'dj', nick: ['Maurizio Molella'], cf: ['ano de nascimento'], ap: ['d'] });
s('Gabry Ponte', 'eurodance', 'milan', 2001, 1973, u, [['Geordie', 2001, 'single']], 'ws', { r: 'dj', rc: 'Turim', cf: ['DJ do Eiffel 65 (já na base)'] });
s('Mauro Picotto', 'trance', 'milan', 1999, 1966, u, [['Komodo (Save a Soul)', 2000, 'single']], 'ws', { r: 'dj', rc: 'Turim', ap: ['d'] });
bd('Timoria', 'alt_rock', 'milan', 1988, 2002, [['Francesco Renga', 'vocal', 1968, u, 1985, 1998], ['Omar Pedrini', 'guitar', 1967]], [['Viaggio senza vento', 1993]], '', { f: 1985, rc: 'Brescia', ap: ['d', 'm'] });
s('Francesco Renga', 'canzone', 'milan', 2000, 1968, u, [['Angelo', 2005, 'single']], 'sr2005', { rc: 'Brescia (nascido em Údine)' });
bd('Afterhours', 'alt_rock', 'milan', 1987, u, [['Manuel Agnelli', 'vocal', 1966]], [['Hai paura del buio?', 1997], ['Quello che non c\'è', 2002]], '', { t: 2, f: 1985, ap: ['d'] });
bd('Marlene Kuntz', 'alt_rock', 'milan', 1994, u, [['Cristiano Godano', 'vocal']], [['Catartica', 1994]], '', { f: 1990, rc: 'Cuneo' });
bd('Verdena', 'alt_rock', 'milan', 1999, u, [['Alberto Ferrari', 'vocal'], ['Luca Ferrari', 'drums'], ['Roberta Sammarelli', 'bass']], [['Verdena', 1999], ['Valvonauta', 1999, 'single']], '', { f: 1995, rc: 'Albino (Bérgamo)' });
bd('CSI', 'alt_rock', 'milan', 1994, 2002, [['Giovanni Lindo Ferretti', 'vocal', 1953], ['Massimo Zamboni', 'guitar', 1957]], [['Linea gotica', 1996]], '', { f: 1992, nick: ['Consorzio Suonatori Indipendenti'] });
bd('Bluvertigo', 'synthpop', 'milan', 1995, u, [['Morgan', 'vocal', 1972], ['Andy', 'keys', 1971]], [['Acidi e basi', 1995], ['Metallo non metallo', 1997]], '', { f: 1991, rc: 'Monza' });
s('Morgan', 'cantautori', 'milan', 2003, 1972, u, [['Canzoni dell\'appartamento', 2003]], '', { nick: ['Marco Castoldi'], cf: ['voz do Bluvertigo'] });
bd('Prozac+', 'alt_rock', 'milan', 1996, u, [], [['Acido acida', 1998]], '', { f: 1995, rc: 'Pordenone' });
bd('Lacuna Coil', 'heavy_metal', 'milan', 1997, u, [['Cristina Scabbia', 'vocal', 1972], ['Andrea Ferro', 'vocal', 1973]], [['Comalies', 2002], ['Heaven\'s a Lie', 2002, 'single']], '', { t: 2, f: 1994 });
bd('Modena City Ramblers', 'celtic_rock', 'milan', 1994, u, [], [['Riportando tutto a casa', 1994], ['I cento passi', 2000, 'single']], '', { f: 1991, rc: 'Módena' });
bd('Pitura Freska', 'reggae', 'milan', 1991, u, [], [['Papa nero', 1997, 'single']], '', { f: 1987, rc: 'Veneza', ap: ['d'] });
bd('Almamegretta', 'reggae', 'naples', 1992, u, [], [['Animamigrante', 1993]], '', { f: 1988, ap: ['d'] });
bd('99 Posse', 'hiphop', 'naples', 1993, u, [], [['Curre curre guagliò', 1993]], '', { f: 1991 });
bd('Sud Sound System', 'reggae', 'naples', 1991, u, [], [['Comu na petra', 1996]], 'ws', { f: 1989, rc: 'Salento (Lecce)' });
bd('Assalti Frontali', 'hiphop', 'rome', 1992, u, [], [['Terra di nessuno', 1992]], '', { f: 1990 });
bd('Colle der Fomento', 'boom_bap', 'rome', 1996, u, [], [['Odio pieno', 1996]], '', { f: 1994 });
bd('Sottotono', 'hiphop', 'milan', 1994, u, [['Big Fish', 'producer'], ['Tormento', 'mc']], [['Soprattutto sotto', 1994], ['Solo lei ha quel che voglio', 1996, 'single']], 'ws', { f: 1994 });
s('Frankie hi-nrg mc', 'hiphop', 'milan', 1992, 1969, u, [['Quelli che benpensano', 1997, 'single']], '', { r: 'mc', rc: 'Turim', nick: ['Francesco Di Gesù'], ap: ['d'] });
s('Piotta', 'hiphop', 'rome', 1998, 1973, u, [['Supercafone', 1999, 'single']], '', { r: 'mc', nick: ['Tommaso Zanello'], ap: ['d'] });
bd('Tazenda', 'folk', 'rome', 1988, u, [], [['Spunta la luna dal monte', 1991, 'single']], '', { rc: 'Sardenha (Sassari)' });
s('Enzo Gragnaniello', 'canzone_napoletana', 'naples', 1983, 1954, u, [['Cu\'mme', 1992, 'single']], '', { r: 'guitar', ap: ['d'] });

// ================================================================ 2000–2026 · Sanremo, talent shows, pop, rock, eletrônica, rap e trap, indie
bd('Tiromancino', 'pop_rock', 'rome', 1992, u, [['Federico Zampaglione', 'vocal', 1968]], [['La descrizione di un attimo', 2000]], '', { f: 1989, ap: ['d'] });
s('Dolcenera', 'canzone', 'naples', 2002, 1977, u, [['Siamo tutti là fuori', 2003, 'single']], '', { rc: 'Galatina (Lecce)', nick: ['Emanuela Trane'] });
s('Sergio Cammariere', 'cantautori', 'naples', 2002, 1960, u, [['Tutto quello che un uomo', 2003, 'single']], '', { r: 'keys', rc: 'Crotone' });
s('Povia', 'cantautori', 'milan', 2005, 1972, u, [['Quando i bambini fanno "oh"', 2005, 'single'], ['Vorrei avere il becco', 2006, 'single']], 'sr2006', { nick: ['Giuseppe Povia'] });
s('Simone Cristicchi', 'cantautori', 'rome', 2005, 1977, u, [['Vorrei cantare come Biagio', 2005, 'single'], ['Ti regalerò una rosa', 2007, 'single']], 'sr2007');
s('Giò Di Tonno', 'canzone', 'rome', 2002, 1973, u, [['Colpo di fulmine', 2008, 'single']], 'sr2008', { rc: 'Pescara', ap: ['d'] });
s('Marco Carta', 'canzone', 'rome', 2008, 1985, u, [['La forza mia', 2009, 'single']], 'sr2009', { rc: 'Cagliari' });
s('Valerio Scanu', 'canzone', 'rome', 2009, 1990, u, [['Per tutte le volte che...', 2010, 'single']], 'sr2010', { rc: 'La Maddalena' });
s('Emma', 'pop_rock', 'naples', 2010, 1984, u, [['Arriverà', 2011, 'single'], ['Non è l\'inferno', 2012, 'single']], 'sr2012 fimi', { t: 2, rc: 'Aradeo (Lecce; nascida em Florença)', nick: ['Emma Marrone'] });
bd('Modà', 'pop_rock', 'milan', 2004, u, [['Kekko Silvestre', 'vocal']], [['Arriverà', 2011, 'single']], 'fimi', { f: 2002, ap: ['d'] });
bd('Finley', 'pop_rock', 'milan', 2005, u, [], [['Diventerai una star', 2006, 'single']], '', { f: 2002, rc: 'Legnano' });
bd('Sugarfree', 'pop_rock', 'naples', 2004, u, [], [['Cleptomania', 2004, 'single']], '', { rc: 'Catânia' });
s('Giusy Ferreri', 'pop_rock', 'naples', 2008, 1979, u, [['Non ti scordar mai di me', 2008, 'single']], 'fimi', { t: 2, rc: 'Palermo' });
s('Alessandra Amoroso', 'canzone', 'naples', 2009, 1989, u, [['Stupida', 2009, 'single']], 'fimi', { t: 2, rc: 'Galatina (Lecce)' });
s('Malika Ayane', 'canzone', 'milan', 2008, 1984, u, [['Come foglie', 2009, 'single']], '');
s('Raphael Gualazzi', 'vocal_jazz', 'rome', 2005, 1981, u, [['Follia d\'amore', 2011, 'single']], '', { r: 'keys', rc: 'Urbino', ap: ['d'] });
s('Anna Tatangelo', 'canzone', 'rome', 2002, 1987, u, [['Ragazza di periferia', 2006, 'single']], '', { rc: 'Sora' });
s('Francesca Michielin', 'pop_rock', 'milan', 2012, 1995, u, [['Nessun grado di separazione', 2016, 'single']], '', { rc: 'Bassano del Grappa' });
s('Francesco Gabbani', 'pop_rock', 'milan', 2014, 1982, u, [['Amen', 2016, 'single'], ['Occidentali\'s Karma', 2017, 'single']], 'sr2017 fimi', { t: 2, rc: 'Carrara', ap: ['d'] });
s('Diodato', 'cantautori', 'naples', 2013, 1981, u, [['Fai rumore', 2020, 'single']], 'sr2020', { rc: 'Taranto (nascido em Aosta)', nick: ['Antonio Diodato'] });
s('Sal Da Vinci', 'canzone_napoletana', 'naples', 1994, 1969, u, [['Rossetto e caffè', 2024, 'single'], ['Per sempre sì', 2026, 'single']], 'sr2026 ws', { nick: ['Salvatore Michael Sorrentino'], ap: ['d'] });
bd('The Kolors', 'pop_rock', 'naples', 2015, u, [['Stash', 'vocal', 1989]], [['Out', 2015], ['Italodisco', 2023, 'single']], 'fimi', { f: 2010, nick: ['Stash Fiordispino'] });
s('Damiano David', 'pop_rock', 'rome', 2024, 1999, u, [['Silverlines', 2024, 'single'], ['Born with a Broken Heart', 2025, 'single']], '', { cf: ['voz do Måneskin (já na base)'] });
s('Sangiovanni', 'pop_rnb', 'milan', 2021, 2003, u, [['Malibu', 2021, 'single']], 'fimi', { rc: 'Vicenza', nick: ['Giovanni Pietro Damian'] });
s('Rosa Chemical', 'trap', 'milan', 2019, 1998, u, [['Made in Italy', 2023, 'single']], '', { r: 'mc', rc: 'Grugliasco (Turim)', nick: ['Manuel Franco Rocati'], ap: ['d'] });
s('Gaia', 'pop_rnb', 'milan', 2016, 1997, u, [['Sesso e samba', 2024, 'single']], 'fimi', { rc: 'Guastalla', nick: ['Gaia Gozzi'], ap: ['d'] });
s('Mr. Rain', 'pop_rnb', 'milan', 2011, 1991, u, [['Supereroi', 2023, 'single']], 'fimi', { r: 'mc', rc: 'Desenzano del Garda', nick: ['Mattia Balardi'], ap: ['d'] });
s('Tony Effe', 'trap', 'rome', 2014, 1991, u, [['Sesso e samba', 2024, 'single']], 'fimi', { r: 'mc', nick: ['Nicolò Rapisarda'], cf: ['ex-Dark Polo Gang (já na base)'], ap: ['d'] });
s('Baby Gang', 'drill', 'milan', 2020, 2001, u, [['Casablanca', 2021, 'single'], ['Mentalité', 2022, 'single']], 'ws', { r: 'mc', rc: 'Lecco', nick: ['Zaccaria Mouhib'], ap: ['d'] });
s('Kid Yugi', 'trap', 'naples', 2022, 2001, u, [['The Globe', 2023]], 'fimi', { r: 'mc', rc: 'Massafra (Taranto)', ap: ['d'] });
s('Mara Sattei', 'pop_rnb', 'rome', 2019, 1995, u, [['La dolce vita', 2022, 'single']], 'fimi', { nick: ['Sara Mattei'], ap: ['d'] });
s('Baby K', 'dance_pop', 'rome', 2008, 1983, u, [['Roma-Bangkok', 2015, 'single']], 'fimi', { rc: 'Roma (nascida em Singapura)', nick: ['Claudia Nahum'], ap: ['d'] });
s('Mondo Marcio', 'hiphop', 'milan', 2004, 1986, u, [['Dentro alla scatola', 2006, 'single']], '', { r: 'mc', nick: ['Gian Marco Marcello'] });
s('Fred De Palma', 'reggaeton', 'milan', 2010, 1989, u, [['D\'estate non vale', 2018, 'single']], 'fimi', { r: 'mc', rc: 'Turim', ap: ['d'] });
s('Elettra Lamborghini', 'dance_pop', 'milan', 2018, 1994, u, [['Pem Pem', 2018, 'single'], ['Musica (e il resto scompare)', 2020, 'single']], 'fimi', { rc: 'Bolonha' });
bd('Benji & Fede', 'pop_rock', 'milan', 2014, 2020, [['Benjamin Mascolo', 'vocal'], ['Federico Rossi', 'vocal']], [['Amore wi-fi', 2016, 'single']], 'ws', { rc: 'Módena', ap: ['d'] });
s('Riki', 'pop_rnb', 'milan', 2017, 1992, u, [['Perdo le parole', 2017, 'single']], 'fimi', { nick: ['Riccardo Marcuzzo'] });
s('Ditonellapiaga', 'dance_pop', 'rome', 2021, 1997, u, [['Chimica', 2022, 'single']], '', { nick: ['Margherita Carducci'] });
bd('Colapesce Dimartino', 'cantautori', 'naples', 2020, u, [['Colapesce', 'vocal', 1983], ['Dimartino', 'vocal', 1982]], [['Musica leggerissima', 2021, 'single']], 'fimi', { rc: 'Sicília', nick: ['Lorenzo Urciullo', 'Antonio Di Martino'] });
bd('La Rappresentante di Lista', 'indie', 'naples', 2014, u, [['Veronica Lucchesi', 'vocal'], ['Dario Mangiaracina', 'guitar']], [['Ciao ciao', 2022, 'single']], '', { f: 2011, rc: 'Palermo', ap: ['d'] });
bd('Coma_Cose', 'indie', 'milan', 2017, u, [['California', 'vocal'], ['Fausto Lama', 'vocal']], [['Fiamme negli occhi', 2021, 'single'], ['L\'addio', 2023, 'single']], '', { f: 2016, nick: ['Francesca Mesiano', 'Fausto Zanardelli'] });
s('Levante', 'indie', 'naples', 2013, 1987, u, [['Alfonso', 2013, 'single']], '', { r: 'guitar', rc: 'Caltagirone', nick: ['Claudia Lagona'] });
s('Lucio Corsi', 'cantautori', 'rome', 2014, 1993, u, [['Volevo essere un duro', 2025, 'single']], '', { rc: 'Grosseto', ap: ['d'] });
s('Brunori Sas', 'cantautori', 'naples', 2009, 1977, u, [['Vol. 1', 2009], ['La verità', 2017, 'single'], ['L\'albero delle noci', 2025, 'single']], '', { rc: 'Cosenza', nick: ['Dario Brunori'] });
s('Motta', 'cantautori', 'milan', 2016, 1986, u, [['La fine dei vent\'anni', 2016]], '', { rc: 'Pisa', nick: ['Francesco Motta'] });
s('Iosonouncane', 'indie', 'rome', 2010, 1983, u, [['DIE', 2015]], '', { rc: 'Buggerru (Sardenha)', nick: ['Jacopo Incani'], ap: ['d'] });
bd('Le luci della centrale elettrica', 'indie', 'milan', 2008, 2018, [['Vasco Brondi', 'vocal', 1984]], [['Canzoni da spiaggia deturpata', 2008]], '', { rc: 'Ferrara' });
s('Dente', 'indie', 'milan', 2006, 1976, u, [['L\'amore non è bello', 2009]], '', { rc: 'Fidenza', nick: ['Giuseppe Peveri'], ap: ['d'] });
bd('Baustelle', 'indie', 'rome', 2000, u, [['Francesco Bianconi', 'vocal'], ['Rachele Bastreghi', 'keys'], ['Claudio Brasini', 'guitar']], [['La malavita', 2005], ['Amen', 2008]], '', { f: 1996, rc: 'Montepulciano' });
bd('Lo Stato Sociale', 'indie', 'milan', 2010, u, [], [['Una vita in vacanza', 2018, 'single']], 'fimi', { f: 2009, rc: 'Bolonha' });
bd('The Zen Circus', 'indie', 'milan', 2001, u, [['Andrea Appino', 'vocal']], [['Andate tutti affanculo', 2009]], '', { f: 1994, rc: 'Pisa', ap: ['d'] });
bd('Ministri', 'alt_rock', 'milan', 2006, u, [], [['Tempi bui', 2009]], '', { f: 2003, ap: ['d'] });
bd('I Cani', 'indie', 'rome', 2011, u, [['Niccolò Contessa', 'vocal']], [['Il sorprendente album d\'esordio dei Cani', 2011]], '', { f: 2010 });
bd('Il Teatro degli Orrori', 'alt_rock', 'milan', 2007, u, [['Pierpaolo Capovilla', 'vocal']], [['Dell\'impero delle tenebre', 2007]], '', { f: 2005, rc: 'Veneza (Mestre)' });
bd('Fleshgod Apocalypse', 'death_metal', 'rome', 2009, u, [], [['Agony', 2011]], '', { f: 2007, rc: 'Perúgia' });
bd('Crookers', 'edm', 'milan', 2007, u, [['Phra', 'dj'], ['Bot', 'dj']], [['Day \'n\' Nite (Crookers remix)', 2008, 'single']], '', { f: 2003, ap: ['d'] });
s('The Bloody Beetroots', 'edm', 'milan', 2007, 1977, u, [['Warp 1.9', 2009, 'single']], '', { r: 'producer', rc: 'Bassano del Grappa', nick: ['Sir Bob Cornelius Rifo'], ap: ['d', 'b'] });
s('Benny Benassi', 'house', 'milan', 2002, 1967, u, [['Satisfaction', 2002, 'single']], '', { t: 2, r: 'dj', ap: ['d'] });
s('Liberato', 'indie', 'naples', 2017, u, u, [['Nove maggio', 2017, 'single'], ['Tu t\'e scurdat\' \'e me', 2017, 'single']], '', { cf: ['identidade anônima (sem nascimento)'] });
s('Enrico Rava', 'cool_jazz', 'milan', 1964, 1939, u, [['Tribe', 2011]], '', { r: 'horns', rc: 'Trieste', ap: ['d'] });
s('Paolo Fresu', 'cool_jazz', 'rome', 1984, 1961, u, [['Mare nostrum', 2007]], '', { r: 'horns', rc: 'Berchidda (Sardenha)', ap: ['d'] });
s('Stefano Bollani', 'cool_jazz', 'milan', 1996, 1972, u, [['Stone in the Water', 2009]], '', { r: 'keys', ap: ['d'] });

// ================================================================ complemento (60s–2020s)
s('Wilma Goich', 'canzone', 'milan', 1963, 1945, u, [['In un fiore', 1965, 'single']], '', { rc: 'Cairo Montenotte (Savona)', ap: ['d'] });
s('Gianni Pettenati', 'beat', 'milan', 1965, 1945, u, [['Bandiera gialla', 1966, 'single']], '', { rc: 'Piacenza', ap: ['d'] });
s('Marisa Sannia', 'canzone', 'rome', 1966, 1947, 2008, [['Casa bianca', 1968, 'single']], '', { rc: 'Iglesias (Sardenha)', ap: ['d'] });
s('Rosanna Fratello', 'canzone', 'naples', 1968, 1951, u, [['Sono una donna, non sono una santa', 1971, 'single']], '', { rc: 'Bitonto (Bari)', ap: ['d'] });
s('Alberto Fortis', 'cantautori', 'milan', 1979, 1955, u, [['Milano e Vincenzo', 1979, 'single']], '', { rc: 'Domodossola' });
s('Marco Ferradini', 'cantautori', 'milan', 1978, 1949, u, [['Teorema', 1981, 'single']], '', { rc: 'Como', ap: ['d'] });
bd('Ladri di Biciclette', 'pop_rock', 'milan', 1989, u, [], [['Sotto questo sole', 1990, 'single']], '', { rc: 'Novara', ap: ['d'] });
s('Massimo Di Cataldo', 'canzone', 'rome', 1995, 1968, u, [['Se adesso te ne vai', 1996, 'single']], '', { ap: ['d'] });
s('Daniele Groff', 'pop_rock', 'milan', 1999, u, u, [['Daisy', 1999, 'single']], '', { rc: 'Trento', cf: ['ano de nascimento'] });
s('Chiara Galiazzo', 'canzone', 'milan', 2012, 1986, u, [['Due respiri', 2013, 'single']], '', { rc: 'Pádua', nick: ['Chiara'] });
s('Lorenzo Fragola', 'pop_rock', 'naples', 2014, 1995, u, [['The Reason Why', 2014, 'single']], '', { rc: 'Catânia' });
s('Michele Bravi', 'canzone', 'rome', 2013, 1994, u, [['Il diario degli errori', 2017, 'single']], '', { rc: 'Città di Castello', ap: ['d'] });
s('Clara', 'pop_rnb', 'milan', 2022, 1999, u, [['Diamanti grezzi', 2024, 'single']], '', { rc: 'Varese', nick: ['Clara Soccini'], ap: ['d'] });
s('Rhove', 'trap', 'milan', 2021, u, u, [['Shakerando', 2022, 'single']], 'fimi', { r: 'mc', rc: 'Rho', nick: ['Samuel Roveda'], cf: ['ano de nascimento'], ap: ['d'] });
s('Andrea Laszlo De Simone', 'indie', 'milan', 2012, u, u, [['Uomo donna', 2017]], '', { rc: 'Turim', cf: ['ano de nascimento'], ap: ['d'] });

/** Curadoria completa da base italiana (ato + fontes + cidade real + apelidos + a confirmar). */
export const IT31: readonly It31[] = IT;
/** Os atos (formato RealArtist), na ordem em que entram no fim de REAL_ALL. */
export const BASE31_IT: RealArtist[] = IT.map((x) => x.a);
/** Texto das fontes de um ato (códigos expandidos). */
export const itSources31 = (x: It31): string[] => x.fo.map((k) =>
  k.startsWith('sr') ? `Festival di Sanremo ${k.slice(2)} (albo d'oro dos vencedores)` : k.startsWith('ev') ? `Eurovision Song Contest ${k.slice(2)} (vencedores)` : FO31[k] ?? k);
