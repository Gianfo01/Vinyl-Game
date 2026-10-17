// R33 (DADOS33) — vida real das gravadoras e selo histórico dos atos reais.
// • LABEL_END33: ano em que a gravadora real deixou de existir com aquele nome (fechou, foi comprada e renomeada,
//   foi estatizada). [fim, volta?] — `volta` = ano em que o nome voltou (Stax 2006, Casablanca 2000…). Só entram fins
//   documentados e sem ambiguidade; selo que continuou como marca de uma major (Okeh, HMV, Odeon) não "acaba".
//   Vale em todos os modos: gravadora que já não existia no ano de começo não começa a partida (fato anterior ao início).
// • HIST_LABEL33: gravadora de cada ato real do catálogo nos anos documentados [de, até (exclusivo), nome real].
//   No começo da partida o ato real ativo assina com ela se ela estiver no mundo (todos os modos; se não estiver, o
//   sorteio de sempre). O nome é o real (REAL_LABELS / EXTRA_LABELS.real): a mesma gravadora pode ter dois ids no
//   catálogo (Fania = southern_cross e x_fania).

export const LABEL_END33: Record<string, [number, number?]> = {
  x_napc: [1896], // North American Phonograph Co.: falência (1894) e liquidação
  x_berliner: [1901], // Berliner Gramophone (EUA) vira Victor Talking Machine Co.
  x_victor: [1929], // comprada pela RCA: vira RCA Victor (x_rca)
  x_edison: [1929], // Edison Records para de prensar discos
  x_columbia_ph: [1925], // Columbia Phonograph Co. comprada pela Columbia Graphophone: segue como Columbia Records (imperial)
  x_casa_edison: [1932], // Casa Edison (Fred Figner) fecha
  x_gennett: [1934],
  x_pathe: [1936], // Pathé Frères vira Pathé-Marconi (x_pathe_marconi)
  x_telefunken: [1950], // Telefunken Schallplatten vira Teldec
  x_panart: [1961], // estatizada na Revolução Cubana (a EGREM nasce em 1964)
  x_veejay: [1966],
  x_immediate: [1970],
  x_dicap: [1973], // fechada pelo golpe no Chile
  x_chess: [1975],
  x_stax: [1975, 2006],
  x_track: [1978],
  x_capricorn: [1979, 1990],
  x_pye: [1980], // vira PRT
  x_postcard: [1981],
  x_fast: [1981],
  x_tk: [1981],
  x_stiff: [1986],
  x_charisma: [1986],
  x_casablanca: [1986, 2000],
  foundry_wave: [1992], // Factory Records
  x_amiga: [1994],
  x_polygram: [1999], // incorporada à Universal
  x_creation: [1999],
  x_rmm: [2001],
  x_toshiba_emi: [2007], // vira EMI Music Japan
  x_arista: [2011, 2018],
};

/** A gravadora (id do catálogo) existe com esse nome no ano `y`? (fundação é conferida à parte, pelo `founded`) */
export function labelAliveAt33(id: string, y: number): boolean {
  const e = LABEL_END33[id];
  if (!e) return true;
  return y < e[0] || (e[1] !== undefined && y >= e[1]);
}

type H = [number, number, string];
export const HIST_LABEL33: Record<string, H[]> = {
  'Bessie Smith': [[1923, 1934, 'Columbia Records']],
  'Louis Armstrong': [[1925, 1932, 'Okeh Records'], [1935, 1954, 'Decca Records']],
  'Duke Ellington Orchestra': [[1956, 1962, 'Columbia Records']],
  'Carlos Gardel': [[1917, 1936, 'Discos Nacional (Max Glücksmann)']],
  'Carmen Miranda': [[1935, 1940, 'Odeon (Brasil)'], [1940, 1950, 'Decca Records']],
  'Jimmie Rodgers': [[1927, 1934, 'Victor Talking Machine Co.']],
  'Édith Piaf': [[1936, 1946, 'Polydor'], [1946, 1964, 'Pathé-Marconi (EMI France)']],
  'Frank Sinatra': [[1943, 1953, 'Columbia Records'], [1953, 1962, 'Capitol Records'], [1962, 1989, 'Reprise Records']],
  'Billie Holiday': [[1944, 1951, 'Decca Records']],
  'Elvis Presley': [[1954, 1956, 'Sun Records'], [1956, 1978, 'RCA Victor']],
  'Chuck Berry': [[1955, 1966, 'Chess Records']],
  'Johnny Cash & the Tennessee Two': [[1955, 1958, 'Sun Records'], [1958, 1987, 'Columbia Records']],
  'João Gilberto': [[1958, 1963, 'Odeon (Brasil)']],
  'Celia Cruz': [[1974, 1990, 'Fania Records']],
  'Ray Charles': [[1952, 1960, 'Atlantic Records']],
  'Luiz Gonzaga': [[1941, 1972, 'RCA Victor']],
  'The Beatles': [[1962, 1971, 'Parlophone']],
  'The Rolling Stones': [[1963, 1971, 'Decca Records']],
  'Bob Dylan': [[1962, 1974, 'Columbia Records'], [1975, 2027, 'Columbia Records']],
  'The Beach Boys': [[1962, 1970, 'Capitol Records']],
  'The Jimi Hendrix Experience': [[1967, 1971, 'Track Records']],
  'Janis Joplin': [[1968, 1971, 'Columbia Records']],
  'Aretha Franklin': [[1961, 1967, 'Columbia Records'], [1967, 1980, 'Atlantic Records'], [1980, 2004, 'Arista Records']],
  'James Brown': [[1956, 1971, 'King Records (EUA)'], [1971, 1982, 'Polydor']],
  'Os Mutantes': [[1968, 1973, 'Polydor']],
  'Elis Regina': [[1965, 1979, 'Philips Records']],
  'Serge Gainsbourg': [[1958, 1991, 'Philips Records']],
  'The Velvet Underground': [[1967, 1970, 'Verve Records']],
  'Pink Floyd': [[1967, 1988, 'EMI']],
  'The Supremes': [[1961, 1978, 'Motown']],
  'Led Zeppelin': [[1969, 1983, 'Atlantic Records']],
  'Roberto Carlos': [[1961, 2020, 'Columbia Records']],
  'David Bowie': [[1971, 1983, 'RCA Victor']],
  Queen: [[1973, 2011, 'EMI']],
  'Black Sabbath': [[1970, 1981, 'Vertigo Records']],
  'Bob Marley & The Wailers': [[1972, 1982, 'Island Records']],
  'Marvin Gaye': [[1961, 1982, 'Motown']],
  ABBA: [[1972, 1983, 'Polar Music']],
  'Donna Summer': [[1975, 1981, 'Casablanca Records'], [1981, 1988, 'Geffen Records']],
  'Bee Gees': [[1967, 1974, 'Polydor']],
  Ramones: [[1976, 1993, 'Sire Records']],
  'Sex Pistols': [[1977, 1980, 'Virgin Records']],
  'The Clash': [[1977, 1986, 'Columbia Records']],
  'Patti Smith': [[1975, 1980, 'Arista Records']],
  Kraftwerk: [[1975, 2000, 'EMI']],
  'Joni Mitchell': [[1968, 1972, 'Reprise Records'], [1972, 1982, 'Asylum Records'], [1982, 1995, 'Geffen Records']],
  'Parliament-Funkadelic': [[1974, 1981, 'Casablanca Records']],
  'Tim Maia': [[1970, 1973, 'Polydor']],
  'Fleetwood Mac': [[1969, 1977, 'Reprise Records']],
  'Milton Nascimento': [[1969, 1984, 'Odeon (Brasil)']],
  'Michael Jackson': [[1979, 2010, 'Epic Records']],
  Madonna: [[1982, 2009, 'Sire Records'], [2009, 2020, 'Interscope Records']],
  Prince: [[1978, 1997, 'Warner Bros. Records']],
  'Whitney Houston': [[1985, 2013, 'Arista Records']],
  U2: [[1980, 2018, 'Island Records']],
  'The Smiths': [[1983, 1988, 'Rough Trade Records']],
  'Joy Division': [[1978, 1981, 'Factory Records']],
  'Depeche Mode': [[1981, 2018, 'Mute Records']],
  'Public Enemy': [[1987, 1999, 'Def Jam Recordings']],
  Metallica: [[1984, 2008, 'Elektra Records']],
  "Guns N' Roses": [[1987, 2009, 'Geffen Records']],
  'Legião Urbana': [[1985, 1997, 'Odeon (Brasil)']],
  'Yellow Magic Orchestra': [[1978, 1984, 'Alfa Records']],
  Nirvana: [[1989, 1991, 'Sub Pop'], [1991, 1995, 'Geffen Records']],
  Radiohead: [[1993, 2004, 'Parlophone'], [2008, 2027, 'XL Recordings']],
  Oasis: [[1994, 2000, 'Creation Records']],
  'Spice Girls': [[1996, 2002, 'Virgin Records']],
  'Dr. Dre': [[1992, 1997, 'Death Row Records']],
  'Daft Punk': [[1996, 2014, 'Virgin Records']],
  Shakira: [[1991, 2009, 'Sony Music']],
  'Buena Vista Social Club': [[1997, 2010, 'World Circuit Records']],
  'Beyoncé': [[2003, 2027, 'Columbia Records']],
  'Kendrick Lamar': [[2011, 2023, 'Interscope Records']],
  'Billie Eilish': [[2017, 2027, 'Interscope Records']],
  BTS: [[2013, 2027, 'Big Hit Entertainment']],
  "Girls' Generation": [[2007, 2027, 'SM Entertainment']],
  'Brian Eno': [[1973, 1979, 'Island Records']],
};

/** Nome real da gravadora histórica do ato no ano `y` (ou nada, se a base não tem o selo dessa época). */
export function histLabelAt33(actName: string, y: number): string | undefined {
  return HIST_LABEL33[actName]?.find(([a, b]) => a <= y && y < b)?.[2];
}
