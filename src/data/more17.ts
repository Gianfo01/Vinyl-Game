// Rodada 17 — mais artistas reais: one-hit wonders globais (Despacito, Macarena, Lambada…), donos de músicas que
// viraram covers e samples famosos, cenas locais (Seattle, Manchester, Bristol, Bronx, BH) e nomes que faltavam
// (prog, synthpop, punk/hardcore, soft rock, pop dos anos 2010). Entra no FIM de REAL_ALL (catalogNo estável).
// Mesmo formato compacto da rodada 14; integrantes aceitam "Nome:papel[:nasc[:morte[:entrou[:saiu]]]]".
// Datas conferidas; quando havia dúvida sobre nascimento/morte, o campo ficou vazio (melhor faltar que inventar).
import type { RealArtist, RealMember } from './realtypes';
import { so } from './more14/h';

const R: Record<string, RealMember[1]> = { v: 'vocal', g: 'guitar', b: 'bass', d: 'drums', k: 'keys', h: 'horns', j: 'dj', p: 'producer', m: 'mc', s: 'strings' };
const al = (a?: string[]): RealArtist['al'] => a?.map((x) => { const [t, y, k] = x.split('|'); return (k ? [t, +y, k === 's' ? 'single' : 'ep'] : [t, +y]) as NonNullable<RealArtist['al']>[number]; });
const n0 = (x?: string) => (x && x !== '0' ? +x : undefined);
/** grupo com entradas/saídas: "Nome:papel[:nasc[:morte[:entrou[:saiu]]]]" */
const bx = (n: string, g: string, c: string, cn: string, d: number, e: number, t: 1 | 2 | 3, m: string, a?: string[], rj?: [number, number?][]): RealArtist =>
  ({ n, g, c, cn, d, ...(e ? { e } : {}), ...(rj ? { rj } : {}), t, z: t, m: m.split('|').map((x) => { const p = x.split(':'); return [p[0], R[p[1]], n0(p[2]), n0(p[3]), n0(p[4]), n0(p[5])] as RealMember; }), ...(a ? { al: al(a) } : {}) });
const s1 = (n: string, g: string, c: string, cn: string, d: number, e: number, t: 1 | 2 | 3, b: number, x: number, r: string, a?: string[]) => so(n, g, c, cn, d, e, t, t, b, x, r, a);

/** one-hit wonders e hits planetários de fora dos EUA (ver data/relevance17 GLOBAL17) */
export const OHW17 = new Set(['Luis Fonsi', 'Kaoma', 'Las Ketchup', 'Lou Bega', 'Gotye', 'Carly Rae Jepsen', 'Dexys Midnight Runners', 'Soft Cell', 'Vanilla Ice', 'Bobby McFerrin', 'Survivor', 'Haddaway', 'Los Bravos', 'Mungo Jerry', 'Right Said Fred', 'Dead or Alive', 'Baauer', 'Gilbert O\'Sullivan', 'The Winstons', 'Desmond Dekker', 'Coolio', 'Robin Thicke']);

export const REAL_17: RealArtist[] = [
  // ——— hits planetários / one-hit wonders ———
  s1('Luis Fonsi', 'pop_latino', 'san_juan', 'PRI', 1998, 0, 2, 1978, 0, 'v', ['Comenzaré|1998', 'Despacito|2017|s']),
  bx('Kaoma', 'zouk', 'paris', 'FRA', 1989, 1998, 2, 'Loalwa Braz:v:1953:2017', ['Worldbeat|1989', 'Lambada|1989|s']),
  bx('Las Ketchup', 'nuevo_flamenco', 'sevilla', 'ESP', 2002, 2006, 2, 'Lola Muñoz:v|Lucía Muñoz:v|Pilar Muñoz:v|Rocío Muñoz:v', ['Hijas del Tomate|2002', 'Aserejé|2002|s']),
  s1('Lou Bega', 'mambo', 'munich', 'DEU', 1999, 0, 2, 1975, 0, 'v', ['A Little Bit of Mambo|1999', 'Mambo No. 5|1999|s']),
  s1('Gotye', 'indie', 'melbourne', 'AUS', 2003, 0, 2, 1980, 0, 'v', ['Making Mirrors|2011', 'Somebody That I Used to Know|2011|s']),
  s1('Carly Rae Jepsen', 'dance_pop', 'vancouver', 'CAN', 2008, 0, 2, 1985, 0, 'v', ['Call Me Maybe|2011|s', 'Emotion|2015']),
  bx('Dexys Midnight Runners', 'new_wave', 'birmingham', 'GBR', 1980, 1987, 3, 'Kevin Rowland:v:1953', ['Searching for the Young Soul Rebels|1980', 'Come On Eileen|1982|s'], [[2003]]),
  bx('Soft Cell', 'synthpop', 'london', 'GBR', 1981, 1984, 2, 'Marc Almond:v:1957|Dave Ball:k:1959', ['Tainted Love|1981|s', 'Non-Stop Erotic Cabaret|1981'], [[2001, 2004], [2018]]),
  s1('Vanilla Ice', 'hiphop', 'miami', 'USA', 1989, 0, 2, 1967, 0, 'm', ['To the Extreme|1990', 'Ice Ice Baby|1990|s']),
  s1('MC Hammer', 'hiphop', 'san_francisco', 'USA', 1987, 0, 2, 1962, 0, 'm', ['Please Hammer, Don\'t Hurt \'Em|1990', 'U Can\'t Touch This|1990|s']),
  s1('Bobby McFerrin', 'vocal_jazz', 'new_york', 'USA', 1982, 0, 2, 1950, 0, 'v', ['Don\'t Worry, Be Happy|1988|s']),
  bx('Survivor', 'arena_rock', 'chicago', 'USA', 1979, 1989, 3, 'Jim Peterik:k:1950|Frankie Sullivan:g:1955|Dave Bickler:v:1953', ['Eye of the Tiger|1982|s']),
  s1('Haddaway', 'eurodance', 'cologne', 'DEU', 1993, 0, 3, 1965, 0, 'v', ['What Is Love|1993|s']),
  bx('Los Bravos', 'beat', 'madrid', 'ESP', 1966, 1970, 3, 'Mike Kennedy:v:1944', ['Black Is Black|1966|s']),
  bx('Mungo Jerry', 'skiffle', 'london', 'GBR', 1970, 0, 3, 'Ray Dorset:v:1946', ['In the Summertime|1970|s']),
  bx('Right Said Fred', 'dance_pop', 'london', 'GBR', 1991, 0, 3, 'Richard Fairbrass:v:1953|Fred Fairbrass:g:1956', ['I\'m Too Sexy|1991|s']),
  bx('Dead or Alive', 'hi_nrg', 'liverpool', 'GBR', 1980, 2011, 3, 'Pete Burns:v:1959:2016', ['You Spin Me Round (Like a Record)|1984|s']),
  s1('Baauer', 'edm', 'new_york', 'USA', 2012, 0, 3, 1989, 0, 'p', ['Harlem Shake|2012|s']),
  s1('Rick Astley', 'dance_pop', 'liverpool', 'GBR', 1987, 0, 2, 1966, 0, 'v', ['Whenever You Need Somebody|1987', 'Never Gonna Give You Up|1987|s']),
  // ——— donos de covers e samples famosos ———
  s1('Big Mama Thornton', 'rnb', 'houston', 'USA', 1951, 1984, 2, 1926, 1984, 'v', ['Hound Dog|1953|s', 'Ball and Chain|1968|s']),
  s1('Gloria Jones', 'soul', 'los_angeles', 'USA', 1964, 0, 3, 1945, 0, 'v', ['Tainted Love|1964|s']),
  bx('Chic', 'disco', 'new_york', 'USA', 1977, 1983, 1, 'Nile Rodgers:g:1952|Bernard Edwards:b:1952:1996|Tony Thompson:d:1954:2003', ['Le Freak|1978|s', 'Good Times|1979|s', 'Risqué|1979'], [[1992]]),
  bx('The Sugarhill Gang', 'hiphop', 'new_york', 'USA', 1979, 1985, 2, 'Master Gee:m|Wonder Mike:m|Big Bank Hank:m:1956:2014', ['Rapper\'s Delight|1979|s']),
  s1('Biz Markie', 'hiphop', 'new_york', 'USA', 1988, 2021, 3, 1964, 2021, 'm', ['Goin\' Off|1988', 'Just a Friend|1989|s', 'I Need a Haircut|1991']),
  s1('Gilbert O\'Sullivan', 'soft_rock', 'london', 'IRL', 1967, 0, 2, 1946, 0, 'k', ['Alone Again (Naturally)|1972|s', 'Clair|1972|s']),
  bx('The Winstons', 'soul', 'washington', 'USA', 1969, 1970, 3, 'Richard Lewis Spencer:h|Gregory Coleman:d:1944:2006', ['Color Him Father|1969|s', 'Amen, Brother|1969|s']),
  s1('Coolio', 'hiphop', 'los_angeles', 'USA', 1994, 2022, 2, 1963, 2022, 'm', ['It Takes a Thief|1994', 'Gangsta\'s Paradise|1995|s']),
  s1('Robin Thicke', 'pop_rnb', 'los_angeles', 'USA', 2003, 0, 3, 1977, 0, 'v', ['Blurred Lines|2013|s']),
  s1('Mark Ronson', 'dance_pop', 'london', 'GBR', 2003, 0, 2, 1975, 0, 'p', ['Version|2007', 'Uptown Funk|2014|s']),
  s1('Roberta Flack', 'soul', 'washington', 'USA', 1969, 2022, 2, 1937, 2025, 'v', ['First Take|1969', 'Killing Me Softly with His Song|1973|s']),
  s1('Desmond Dekker', 'ska', 'kingston', 'JAM', 1963, 2006, 2, 1941, 2006, 'v', ['Israelites|1968|s']),
  s1('Jimmy Cliff', 'reggae', 'kingston', 'JAM', 1962, 0, 2, 1944, 0, 'v', ['Many Rivers to Cross|1969|s', 'The Harder They Come|1972']),
  bx('Los Lobos', 'rock_latino', 'los_angeles', 'USA', 1978, 0, 2, 'David Hidalgo:v:1954|Louie Pérez:d:1953|Cesar Rosas:g:1954|Conrad Lozano:b:1951', ['La Bamba|1987|s', 'Kiko|1992']),
  bx('UB40', 'reggae', 'birmingham', 'GBR', 1980, 0, 2, 'Ali Campbell:v:1959:0:1979:2008|Robin Campbell:g:1954|Astro:m:1957:2021:1979:2013', ['Signing Off|1980', 'Red Red Wine|1983|s']),
  bx('Procol Harum', 'art_rock', 'london', 'GBR', 1967, 1977, 2, 'Gary Brooker:k:1945:2022|Matthew Fisher:k:1946:0:1967:1969|Robin Trower:g:1945:0:1967:1971', ['A Whiter Shade of Pale|1967|s'], [[1991]]),
  // ——— cenas locais ———
  bx('Mudhoney', 'grunge', 'seattle', 'USA', 1988, 0, 3, 'Mark Arm:v:1962|Steve Turner:g:1965|Dan Peters:d:1967|Matt Lukin:b:1964:0:1988:1999', ['Superfuzz Bigmuff|1988', 'Touch Me I\'m Sick|1988|s']),
  bx('The Stone Roses', 'indie', 'manchester', 'GBR', 1985, 1996, 2, 'Ian Brown:v:1963|John Squire:g:1962|Mani:b:1962|Reni:d:1964', ['The Stone Roses|1989', 'Second Coming|1994'], [[2011, 2017]]),
  bx('Happy Mondays', 'indie', 'manchester', 'GBR', 1987, 1993, 3, 'Shaun Ryder:v:1962|Paul Ryder:b:1964:2022|Bez:d:1964', ['Pills \'n\' Thrills and Bellyaches|1990'], [[1999, 2001], [2012]]),
  s1('Tricky', 'trip_hop', 'bristol', 'GBR', 1995, 0, 3, 1968, 0, 'm', ['Maxinquaye|1995']),
  s1('Roni Size', 'dnb', 'bristol', 'GBR', 1997, 0, 3, 1969, 0, 'p', ['New Forms|1997']),
  s1('DJ Kool Herc', 'hiphop', 'new_york', 'USA', 1973, 0, 2, 1955, 0, 'j'),
  s1('Lô Borges', 'mpb', 'bh', 'BRA', 1972, 0, 3, 1952, 0, 'v', ['Clube da Esquina|1972', 'Lô Borges|1972']),
  bx('MC5', 'garage_rock', 'detroit', 'USA', 1969, 1972, 3, 'Rob Tyner:v:1944:1991|Wayne Kramer:g:1948:2024|Fred "Sonic" Smith:g:1948:1994|Michael Davis:b:1943:2012|Dennis Thompson:d:1948:2024', ['Kick Out the Jams|1969']),
  bx('Hüsker Dü', 'hardcore_punk', 'minneapolis', 'USA', 1981, 1988, 3, 'Bob Mould:g:1960|Grant Hart:d:1961:2017|Greg Norton:b:1959', ['Zen Arcade|1984']),
  bx('Fugazi', 'hardcore_punk', 'washington', 'USA', 1988, 2003, 3, 'Ian MacKaye:v:1962|Guy Picciotto:g:1965', ['Repeater|1990']),
  bx('Bad Religion', 'hardcore_punk', 'los_angeles', 'USA', 1981, 0, 3, 'Greg Graffin:v:1964|Brett Gurewitz:g:1962', ['Suffer|1988']),
  bx('The Offspring', 'punk', 'los_angeles', 'USA', 1989, 0, 2, 'Dexter Holland:v:1965|Noodles:g:1963', ['Smash|1994', 'Americana|1998']),
  bx('The Runaways', 'punk', 'los_angeles', 'USA', 1976, 1979, 3, 'Cherie Currie:v:1959:0:1975:1977|Joan Jett:g:1958|Lita Ford:g:1958|Sandy West:d:1959:2006', ['The Runaways|1976']),
  s1('Joan Jett', 'hard_rock', 'new_york', 'USA', 1980, 0, 2, 1958, 0, 'v', ['I Love Rock \'n\' Roll|1981|s']),
  // ——— nomes que faltavam ———
  s1('Johnny Mathis', 'trad_pop', 'san_francisco', 'USA', 1956, 0, 2, 1935, 0, 'v', ['Chances Are|1957|s', 'Johnny\'s Greatest Hits|1958']),
  s1('Perry Como', 'trad_pop', 'new_york', 'USA', 1943, 1994, 2, 1912, 2001, 'v', ['Catch a Falling Star|1957|s']),
  bx('The Four Seasons', 'doo_wop', 'new_york', 'USA', 1962, 0, 2, 'Frankie Valli:v:1934|Bob Gaudio:k:1942|Tommy DeVito:g:1928:2020:1960:1970|Nick Massi:b:1927:2000:1960:1965', ['Sherry|1962|s', 'Big Girls Don\'t Cry|1962|s']),
  s1('Herb Alpert', 'exotica', 'los_angeles', 'USA', 1962, 0, 2, 1935, 0, 'h', ['Whipped Cream & Other Delights|1965']),
  s1('Gil Scott-Heron', 'soul', 'new_york', 'USA', 1970, 2011, 3, 1949, 2011, 'v', ['The Revolution Will Not Be Televised|1971|s']),
  s1('Captain Beefheart', 'art_rock', 'los_angeles', 'USA', 1966, 1982, 3, 1941, 2010, 'v', ['Trout Mask Replica|1969']),
  s1('Tom Waits', 'folk', 'los_angeles', 'USA', 1973, 0, 2, 1949, 0, 'v', ['Closing Time|1973', 'Rain Dogs|1985']),
  s1('Jackson Browne', 'soft_rock', 'los_angeles', 'USA', 1972, 0, 2, 1948, 0, 'v', ['Late for the Sky|1974', 'Running on Empty|1977']),
  bx('The Doobie Brothers', 'soft_rock', 'san_francisco', 'USA', 1971, 0, 2, 'Tom Johnston:v:1948|Patrick Simmons:g:1948|Michael McDonald:k:1952:0:1975:1982', ['Listen to the Music|1972|s', 'Minute by Minute|1978']),
  bx('Styx', 'arena_rock', 'chicago', 'USA', 1972, 0, 2, 'Dennis DeYoung:k:1947:0:1972:1999|James Young:g:1949|Tommy Shaw:g:1953:0:1975', ['The Grand Illusion|1977']),
  bx('Kansas', 'prog', 'kansas_city', 'USA', 1974, 0, 2, 'Steve Walsh:v:1951:0:1973:2014|Kerry Livgren:g:1949:0:1973:1983', ['Carry On Wayward Son|1976|s', 'Dust in the Wind|1977|s']),
  s1('Meat Loaf', 'arena_rock', 'new_york', 'USA', 1977, 2022, 2, 1947, 2022, 'v', ['Bat Out of Hell|1977']),
  bx('Huey Lewis and the News', 'pop_rock', 'san_francisco', 'USA', 1980, 0, 2, 'Huey Lewis:v:1950', ['Sports|1983']),
  bx('King Crimson', 'prog', 'london', 'GBR', 1969, 2021, 2, 'Robert Fripp:g:1946|Greg Lake:b:1947:2016:1968:1970|Ian McDonald:h:1946:2022:1968:1969', ['In the Court of the Crimson King|1969']),
  bx('Emerson, Lake & Palmer', 'prog', 'london', 'GBR', 1970, 1979, 2, 'Keith Emerson:k:1944:2016|Greg Lake:b:1947:2016|Carl Palmer:d:1950', ['Tarkus|1971', 'Brain Salad Surgery|1973'], [[1991, 1998]]),
  bx('Jethro Tull', 'prog', 'london', 'GBR', 1968, 0, 2, 'Ian Anderson:h:1947|Martin Barre:g:1946:0:1969:2012', ['Aqualung|1971', 'Thick as a Brick|1972']),
  bx('Traffic', 'psychedelic', 'birmingham', 'GBR', 1967, 1974, 3, 'Steve Winwood:k:1948|Jim Capaldi:d:1944:2005|Dave Mason:g:1946:0:1967:1968', ['Mr. Fantasy|1967', 'John Barleycorn Must Die|1970']),
  bx('The Moody Blues', 'prog', 'birmingham', 'GBR', 1965, 0, 2, 'Justin Hayward:g:1946:0:1966|John Lodge:b:1943:0:1966|Ray Thomas:h:1941:2018|Graeme Edge:d:1941:2021|Mike Pinder:k:1941:2024:1964:1978', ['Days of Future Passed|1967', 'Nights in White Satin|1967|s']),
  bx('The Hollies', 'beat', 'manchester', 'GBR', 1963, 0, 2, 'Allan Clarke:v:1942:0:1962:1999|Graham Nash:g:1942:0:1962:1968|Tony Hicks:g:1945|Bobby Elliott:d:1941', ['Bus Stop|1966|s', 'He Ain\'t Heavy, He\'s My Brother|1969|s']),
  bx('Small Faces', 'beat', 'london', 'GBR', 1965, 1969, 2, 'Steve Marriott:v:1947:1991|Ronnie Lane:b:1946:1997|Kenney Jones:d:1948|Ian McLagan:k:1945:2014', ['Ogdens\' Nut Gone Flake|1968']),
  bx('Slade', 'glam', 'birmingham', 'GBR', 1969, 0, 2, 'Noddy Holder:v:1946:0:1966:1992|Dave Hill:g:1946|Jim Lea:b:1949:0:1966:1992|Don Powell:d:1946:0:1966:2019', ['Merry Xmas Everybody|1973|s']),
  bx('Status Quo', 'hard_rock', 'london', 'GBR', 1968, 0, 2, 'Francis Rossi:g:1949|Rick Parfitt:g:1948:2016', ['Rockin\' All Over the World|1977|s']),
  bx('Frankie Goes to Hollywood', 'synthpop', 'liverpool', 'GBR', 1983, 1987, 2, 'Holly Johnson:v:1960|Paul Rutherford:v:1959', ['Relax|1983|s', 'Welcome to the Pleasuredome|1984']),
  bx('Erasure', 'synthpop', 'london', 'GBR', 1985, 0, 2, 'Andy Bell:v:1964|Vince Clarke:k:1960', ['The Innocents|1988']),
  bx('Yazoo', 'synthpop', 'london', 'GBR', 1982, 1983, 3, 'Alison Moyet:v:1961|Vince Clarke:k:1960', ['Upstairs at Eric\'s|1982'], [[2008, 2008]]),
  bx('Orchestral Manoeuvres in the Dark', 'synthpop', 'liverpool', 'GBR', 1979, 0, 2, 'Andy McCluskey:v:1959|Paul Humphreys:k:1960:0:1978:1989', ['Architecture & Morality|1981', 'Enola Gay|1980|s']),
  s1('Gary Numan', 'synthpop', 'london', 'GBR', 1978, 0, 2, 1958, 0, 'v', ['The Pleasure Principle|1979', 'Cars|1979|s']),
  bx('Simple Minds', 'new_wave', 'glasgow', 'GBR', 1979, 0, 2, 'Jim Kerr:v:1959|Charlie Burchill:g:1959', ['New Gold Dream (81–82–83–84)|1982', 'Don\'t You (Forget About Me)|1985|s']),
  bx('The Pretenders', 'new_wave', 'london', 'GBR', 1979, 0, 2, 'Chrissie Hynde:v:1951|James Honeyman-Scott:g:1956:1982|Pete Farndon:b:1952:1983:1978:1982|Martin Chambers:d:1951', ['Pretenders|1980', 'Brass in Pocket|1979|s']),
  s1('Billy Idol', 'new_wave', 'london', 'GBR', 1981, 0, 2, 1955, 0, 'v', ['White Wedding|1982|s', 'Rebel Yell|1983']),
  s1('Seal', 'pop_rnb', 'london', 'GBR', 1990, 0, 2, 1963, 0, 'v', ['Seal|1991', 'Kiss from a Rose|1994|s']),
  s1('Lisa Stansfield', 'soul', 'manchester', 'GBR', 1989, 0, 3, 1966, 0, 'v', ['All Around the World|1989|s']),
  bx('Girls Aloud', 'teen_pop', 'london', 'GBR', 2002, 2013, 2, 'Cheryl:v:1983|Nadine Coyle:v:1985|Sarah Harding:v:1981:2021|Nicola Roberts:v:1985|Kimberley Walsh:v:1981', ['Sound of the Underground|2002|s'], [[2024, 2024]]),
  s1('M.I.A.', 'hiphop', 'london', 'GBR', 2004, 0, 2, 1975, 0, 'm', ['Arular|2005', 'Paper Planes|2008|s']),
  bx('LCD Soundsystem', 'indie', 'new_york', 'USA', 2002, 2011, 3, 'James Murphy:v:1970', ['Losing My Edge|2002|s', 'Sound of Silver|2007'], [[2015]]),
  s1('Pitbull', 'pop_latino', 'miami', 'USA', 2004, 0, 2, 1981, 0, 'm', ['Planet Pit|2011', 'Timber|2013|s']),
  s1('Halsey', 'dance_pop', 'new_york', 'USA', 2015, 0, 2, 1994, 0, 'v', ['Badlands|2015']),
  s1('Shawn Mendes', 'pop_rock', 'toronto', 'CAN', 2014, 0, 2, 1998, 0, 'v', ['Handwritten|2015', 'Stitches|2015|s']),
  s1('Camila Cabello', 'dance_pop', 'miami', 'USA', 2017, 0, 2, 1997, 0, 'v', ['Camila|2018', 'Havana|2017|s']),
];
