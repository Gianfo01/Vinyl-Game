// r27 (LIN): dois complementos dos integrantes reais, fora das tuplas (que continuam como estavam):
// 1. MONTHS27 — mês documentado de entradas/saídas famosas. Os dados de formação só têm o ano; numa partida que começa
//    em janeiro do ano da troca, o mês decide quem já está na banda (Pete Best até agosto de 1962, Ringo depois).
//    Sem mês aqui, o jogo sorteia um mês fixo pela semente (determinístico).
// 2. ROLES27 — todas as funções de uma pessoa na banda além da principal (Hendrix guitarra · vocal, McCartney
//    baixo · vocal). Só exibição: a função principal (Person.role) continua sendo a que a simulação usa.
//    Chave = nome real da pessoa (vale em banda, solo e supergrupo); `[função, ano]` = só a partir daquele ano
//    (Phil Collins canta no Genesis desde 1975).

import type { RealMember, RealRole } from './realtypes';

/** ato → integrante → [mês de entrada 1–12?, mês de saída 1–12?] */
export const MONTHS27: Record<string, Record<string, [number | undefined, number?]>> = {
  'The Beatles': { 'Ringo Starr': [8], 'Pete Best': [undefined, 8], 'Stuart Sutcliffe': [undefined, 7] },
  'The Rolling Stones': { 'Brian Jones': [undefined, 6], 'Mick Taylor': [6, 12], 'Charlie Watts': [1] },
  'Nirvana': { 'Dave Grohl': [9], 'Chad Channing': [undefined, 5] },
  'Rush': { 'Neil Peart': [7], 'John Rutsey': [undefined, 7] },
  'Genesis': { 'Peter Gabriel': [undefined, 8] },
  'The Jimi Hendrix Experience': { 'Noel Redding': [undefined, 6] },
};

/** Mês (0–11) documentado de uma entrada ('j') ou saída ('l'); undefined = não documentado. */
export function lineupMonth27(act: string, member: string, k: 'j' | 'l'): number | undefined {
  const v = MONTHS27[act]?.[member]?.[k === 'j' ? 0 : 1];
  return v === undefined ? undefined : v - 1;
}

/** Funções extras só de exibição (não existem como função principal na simulação). */
export type ExtraRole27 = 'harmonica' | 'piano' | 'rhythm';
export type Role27 = RealRole | ExtraRole27;
export type RoleSpec27 = Role27 | [Role27, number];

/** pessoa → funções além da principal (a principal é tirada da lista na exibição) */
export const ROLES27: Record<string, RoleSpec27[]> = {
  // The Beatles
  'John Lennon': ['rhythm', 'piano', 'harmonica'], 'Paul McCartney': ['vocal', 'bass', 'piano'], 'George Harrison': ['guitar', 'vocal'], 'Ringo Starr': ['drums', 'vocal'],
  // The Rolling Stones
  'Mick Jagger': ['vocal', 'harmonica'], 'Keith Richards': ['guitar', 'vocal'], 'Brian Jones': ['guitar', 'harmonica', 'keys'],
  // The Jimi Hendrix Experience
  'Jimi Hendrix': ['guitar', 'vocal'],
  // Queen
  'Freddie Mercury': ['vocal', 'piano'], 'Brian May': ['guitar', 'vocal'], 'Roger Taylor': ['drums', 'vocal'],
  // Led Zeppelin
  'Robert Plant': ['vocal', 'harmonica'], 'Jimmy Page': ['guitar', 'producer'], 'John Paul Jones': ['bass', 'keys'],
  // The Who
  'Pete Townshend': ['guitar', 'vocal', 'keys'], 'John Entwistle': ['bass', 'vocal', 'horns'], 'Roger Daltrey': ['vocal', 'harmonica'],
  // Creedence Clearwater Revival
  'John Fogerty': ['vocal', 'guitar'], 'Tom Fogerty': ['rhythm'],
  // Nirvana
  'Kurt Cobain': ['vocal', 'guitar'],
  // The Police
  'Sting': ['bass', 'vocal'],
  // Rush
  'Geddy Lee': ['bass', 'vocal', 'keys'],
  // Genesis
  'Phil Collins': ['drums', ['vocal', 1975]], 'Mike Rutherford': ['bass', 'guitar'], 'Peter Gabriel': ['vocal', 'horns'],
  // Eagles
  'Glenn Frey': ['vocal', 'guitar', 'keys'], 'Don Henley': ['drums', 'vocal'], 'Randy Meisner': ['bass', 'vocal'], 'Joe Walsh': ['guitar', 'vocal'],
  'Timothy B. Schmit': ['bass', 'vocal'], 'Bernie Leadon': ['guitar', 'strings', 'vocal'],
  // Fleetwood Mac
  'Lindsey Buckingham': ['guitar', 'vocal'], 'Christine McVie': ['keys', 'vocal'], 'Peter Green': ['guitar', 'vocal'], 'Bob Welch': ['guitar', 'vocal'],
  'Jeremy Spencer': ['guitar', 'vocal'], 'Danny Kirwan': ['guitar', 'vocal'],
  // ABBA
  'Björn Ulvaeus': ['guitar', 'vocal'], 'Benny Andersson': ['keys', 'vocal'],
  // Os Mutantes
  'Arnaldo Baptista': ['keys', 'bass', 'vocal'], 'Sérgio Dias': ['guitar', 'vocal'],
  // Titãs
  'Sérgio Britto': ['keys', 'vocal'], 'Nando Reis': ['bass', 'vocal'], 'Paulo Miklos': ['vocal', 'horns'],
  // Legião Urbana
  'Renato Russo': ['vocal', 'bass'],
  // Os Paralamas do Sucesso
  'Herbert Vianna': ['guitar', 'vocal'],
  // outros casos bem conhecidos (frontman listado pelo instrumento, ou cantor que toca)
  'Bob Dylan': ['vocal', 'guitar', 'harmonica'], 'Neil Young': ['vocal', 'guitar', 'harmonica'], 'Bruce Springsteen': ['vocal', 'guitar', 'harmonica'],
  'Elton John': ['vocal', 'piano'], 'Billy Joel': ['vocal', 'piano'], 'Stevie Wonder': ['vocal', 'keys', 'harmonica'], 'Ray Charles': ['vocal', 'piano'],
  'Prince': ['vocal', 'guitar', 'keys', 'producer'], 'Chuck Berry': ['vocal', 'guitar'], 'B.B. King': ['vocal', 'guitar'], 'Eric Clapton': ['guitar', 'vocal'],
  'Mark Knopfler': ['guitar', 'vocal'], 'Lemmy': ['bass', 'vocal'], 'James Hetfield': ['vocal', 'rhythm'], 'Dave Grohl': ['drums', 'vocal', 'guitar'],
  'Billy Corgan': ['vocal', 'guitar'], 'Jack White': ['vocal', 'guitar'], 'Thom Yorke': ['vocal', 'guitar', 'keys'], 'Chris Martin': ['vocal', 'piano'],
  'Noel Gallagher': ['guitar', 'vocal'], 'Damon Albarn': ['vocal', 'keys'], 'Brian Wilson': ['bass', 'vocal', 'keys'], 'Carl Wilson': ['guitar', 'vocal'],
  'Gilberto Gil': ['vocal', 'guitar'], 'Caetano Veloso': ['vocal', 'guitar'], 'João Gilberto': ['vocal', 'guitar'], 'Jorge Ben Jor': ['vocal', 'guitar'],
  'Tom Jobim': ['piano', 'vocal'], 'Djavan': ['vocal', 'guitar'], 'Raul Seixas': ['vocal', 'guitar'], 'Frejat': ['guitar', 'vocal'],
  'Lulu Santos': ['vocal', 'guitar'], 'Humberto Gessinger': ['vocal', 'bass'], 'Samuel Rosa': ['vocal', 'guitar'],
};

const norm = (n: string) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const ROLES27N = new Map(Object.entries(ROLES27).map(([k, v]) => [norm(k), v]));

/** Funções documentadas de uma pessoa real (pelo nome), ou undefined. */
export const realRoles27 = (name: string): RoleSpec27[] | undefined => ROLES27N.get(norm(name));

/** Heurística conservadora: banda sem ninguém listado como 'vocal' — o primeiro da lista (o frontman, que nos dados
 *  vem pelo instrumento) também canta. Só para gêneros cantados; bandas instrumentais e líderes que não cantam (conferidos
 *  um a um na lista de casos que a regra pegava) ficam de fora. */
const INSTRUMENTAL27 = /jazz|fusion|bossa|salsa|danzon|instrumental|surf|electronic|techno|house|trance|ambient|classical|minimalism|trip_hop|dub|edm|idm|big_band|lounge|soundtrack|afrobeat|krautrock|post_rock|math/;
const NOT_SINGING27 = new Set(['Robbie Robertson', 'Carlos Santana', 'Duane Allman', 'Nile Rodgers', 'Hank Marvin', 'Booker T. Jones', 'Robert Fripp',
  'Keith Emerson', 'Ivar Bjørnson', 'Zé Pedro', 'Alessandro Merli', 'Damian McKee', 'Evan Mast', 'Billy Talbot', 'Thomas Brenneck', 'Laura Lee',
  'Alan Parsons', 'Haruomi Hosono', 'Thijs van Leer', 'Ricardo Fischmann', 'Ruben Camillas', 'Louie Swain']);
export function frontmanSings27(genre: string, m: RealMember[]): string | undefined {
  if (m.length < 2 || INSTRUMENTAL27.test(genre)) return undefined;
  if (m.some((x) => x[1] === 'vocal' || x[1] === 'mc')) return undefined;
  const f = m[0];
  return (f[1] === 'guitar' || f[1] === 'bass' || f[1] === 'keys') && !NOT_SINGING27.has(f[0]) ? f[0] : undefined;
}
