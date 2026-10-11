// WP-A — artistas 1920–49 (docs/db19.md §3.1 A e §5). Complementa era1889 (1889–1919) sem repetir nomes; nomes já
// presentes no catálogo/realacts são descartados pela deduplicação de REAL_ALL (norm16). Itens marcados † no doc estão
// com estreia aproximada ("primeiros discos"): o schema RealArtist não tem flag `exact`, por isso só entram datas
// defensáveis. Formato das linhas: ver ./ab_util.ts.
import type { Pack19 } from './types';
import { rows } from './ab_util';

const USA = `
Mamie Smith|classic_blues|new_york|USA|1920|3|1891|1946|v|||Crazy Blues:1920:s
Ethel Waters|classic_blues|new_york|USA|1921|3|1896|1977|v
Fletcher Henderson|hot_jazz|new_york|USA|1923|3|1897|1952|k
King Oliver|nola_jazz|chicago|USA|1923|3|1881|1938|h
Bix Beiderbecke|hot_jazz|chicago|USA|1924|3|1903|1931|h
Sidney Bechet|nola_jazz|new_orleans|USA|1923|2|1897|1959|h
Paul Whiteman|tin_pan_alley|new_york|USA|1920|3|1890|1967|s
Blind Lemon Jefferson|classic_blues|houston|USA|1925|3|1893|1929|g
Blind Willie Johnson|gospel|houston|USA|1927|3|1897|1945|g
Charley Patton|delta_blues|memphis|USA|1929|3|1891|1934|g
Memphis Minnie|delta_blues|memphis|USA|1929|3|1897|1973|g
Son House|delta_blues|memphis|USA|1930|3|1902|1988|g
Mills Brothers|vocal_jazz|new_york|USA|1931|2||||Herbert Mills:v:1912:1989;Harry Mills:v:1913:1982;Donald Mills:v:1915:1999;John Mills Jr.:v:1910:1936
Boswell Sisters|vocal_jazz|new_orleans|USA|1930|3||||1936|Connee Boswell:v:1907:1976;Martha Boswell:v:1905:1958;Vet Boswell:v:1911:1988
Art Tatum|stride|new_york|USA|1932|3|1909|1956|k
Lionel Hampton|big_band|new_york|USA|1936|2|1908|2002|d
Artie Shaw|big_band|new_york|USA|1936|2|1910|2004|h|1954
Roy Acuff|country|nashville|USA|1936|2|1903|1992|v
Ernest Tubb|honky_tonk|nashville|USA|1936|2|1914|1984|v
Sons of the Pioneers|cowboy_song|los_angeles|USA|1934|3
Tommy Dorsey|big_band|new_york|USA|1934|2|1905|1956|h
Woody Herman|big_band|chicago|USA|1936|3|1913|1987|h
Chick Webb|hot_jazz|new_york|USA|1926|3|1905|1939|d
Coleman Hawkins|hot_jazz|new_york|USA|1922|2|1904|1969|h
Lester Young|big_band|kansas_city|USA|1936|2|1909|1959|h
Big Bill Broonzy|classic_blues|chicago|USA|1927|3|1903|1958|g
Tampa Red|classic_blues|chicago|USA|1928|3|1904|1981|g
Sonny Boy Williamson I|delta_blues|chicago|USA|1937|3|1914|1948|v
Lonnie Johnson|classic_blues|st_louis|USA|1925|3|1899|1970|g
Earl Hines|stride|chicago|USA|1923|3|1903|1983|k
Meade Lux Lewis|boogie_woogie|chicago|USA|1927|3|1905|1964|k
Albert Ammons|boogie_woogie|chicago|USA|1936|3|1907|1949|k
Jimmy Yancey|boogie_woogie|chicago|USA|1939|3|1894|1951|k
Eddy Arnold|country|nashville|USA|1944|2|1918|2008|v
Tex Ritter|cowboy_song|los_angeles|USA|1933|3|1905|1974|v
Roy Rogers|cowboy_song|los_angeles|USA|1935|2|1911|1998|v
Golden Gate Quartet|gospel_quartet|new_york|USA|1934|3
Thomas A. Dorsey|gospel|chicago|USA|1928|3|1899|1993|k
Big Joe Turner|jump_blues|kansas_city|USA|1938|3|1911|1985|v
Wynonie Harris|jump_blues|los_angeles|USA|1944|3|1915|1969|v
T-Bone Walker|classic_blues|houston|USA|1929|2|1910|1975|g
Charles Brown|rnb|los_angeles|USA|1945|3|1922|1999|k
Johnny Otis|jump_blues|los_angeles|USA|1945|3|1921|2012|d
Spike Jones|tin_pan_alley|los_angeles|USA|1942|3|1911|1965|d
Rudy Vallée|tin_pan_alley|new_york|USA|1928|3|1901|1986|v
Kate Smith|torch_song|new_york|USA|1926|2|1907|1986|v
Helen Morgan|torch_song|new_york|USA|1927|3|1900|1941|v
Ruth Etting|torch_song|chicago|USA|1926|3|1896|1978|v
Lena Horne|vocal_jazz|new_york|USA|1936|2|1917|2010|v
Hoagy Carmichael|tin_pan_alley|new_york|USA|1927|2|1899|1981|k
Josephine Baker|cabaret|paris|FRA|1926|2|1906|1975|v
Django Reinhardt|gypsy_jazz|paris|FRA|1934|1|1910|1953|g||Stéphane Grappelli:s:1908:1997;Django Reinhardt:g:1910:1953;Joseph Reinhardt:g:1911:1982
`;

const BRA = `
Sílvio Caldas|samba_cancao|rio|BRA|1930|3|1908|1998|v
Lamartine Babo|marchinha|rio|BRA|1929|3|1904|1963|v
Assis Valente|samba_cancao|rio|BRA|1932|3|1911|1958|v
Aracy de Almeida|samba|rio|BRA|1935|3|1914|1988|v
Wilson Batista|samba|rio|BRA|1933|3|1913|1968|v
Ataulfo Alves|samba|rio|BRA|1933|3|1909|1969|v
Elizeth Cardoso|samba_cancao|rio|BRA|1936|2|1920|1990|v
Dick Farney|samba_cancao|rio|BRA|1945|3|1921|1987|k
Vicente Celestino|modinha|rio|BRA|1920|3|1894|1968|v
`;

const LAT = `
Libertad Lamarque|tango|buenos_aires|ARG|1926|2|1908|2000|v
Aníbal Troilo|tango|buenos_aires|ARG|1937|2|1914|1975|k
Osvaldo Pugliese|tango|buenos_aires|ARG|1939|2|1905|1995|k
Francisco Canaro|tango|buenos_aires|ARG|1913|3|1888|1964|s
Juan D'Arienzo|tango|buenos_aires|ARG|1928|3|1900|1976|s
Carlos Di Sarli|tango|buenos_aires|ARG|1928|3|1903|1960|k
Hugo del Carril|tango|buenos_aires|ARG|1936|3|1912|1989|v
Agustín Lara|bolero|mexico_city|MEX|1930|2|1897|1970|k
Trío Los Panchos|bolero|new_york|MEX|1944|2||||Chucho Navarro:g:1913:1993;Alfredo Gil:g:1915:1999;Hernando Avilés:v:1914:1986
Tito Guízar|ranchera|mexico_city|MEX|1930|3|1908|1999|v
Pedro Vargas|bolero|mexico_city|MEX|1930|3|1906|1989|v
Ernesto Lecuona|danzon|havana|CUB|1920|2|1895|1963|k
Rita Montaner|son|havana|CUB|1926|3|1900|1958|v
Miguelito Valdés|son|havana|CUB|1936|3|1912|1978|v
Trío Matamoros|son|havana|CUB|1925|2||||Miguel Matamoros:g:1894:1971;Rafael Cueto:g:1900:1991;Siro Rodríguez:v:1899:1981
Septeto Nacional|son|havana|CUB|1927|3|||||Ignacio Piñeiro:b:1888:1969
Arsenio Rodríguez|son|havana|CUB|1940|2|1911|1970|g
Pérez Prado|mambo|mexico_city|CUB|1948|1|1916|1989|k
Machito and His Afro-Cubans|son|new_york|CUB|1940|3
Orquesta Aragón|danzon|havana|CUB|1939|3
`;

const CAR = `
Wilmoth Houdini|calypso|port_of_spain|TTO|1927|3|1895|1973|v
Sam Manning|calypso|port_of_spain|TTO|1924|3|1897|1960|v
Atilla the Hun|calypso|port_of_spain|TTO|1934|3|1892|1962|v
Roaring Lion|calypso|port_of_spain|TTO|1934|3|1908|1999|v
Growling Tiger|calypso|port_of_spain|TTO|1934|3|1891|1977|v
Lord Beginner|calypso|port_of_spain|TTO|1936|3|1904|1967|v
Lord Invader|calypso|port_of_spain|TTO|1943|3|1914|1961|v
Lord Kitchener|calypso|port_of_spain|TTO|1938|2|1922|2000|v
Lord Flea|mento|kingston|JAM|1954|3|1917|1967|v
Count Lasher|mento|kingston|JAM|1952|3|||v
`;

const EUR = `
Zarah Leander|cabaret|berlin|SWE|1936|2|1907|1981|v
Hans Albers|cabaret|berlin|DEU|1930|2|1891|1960|v
Richard Tauber|operetta|vienna|AUT|1920|2|1891|1948|v
Jessie Matthews|vaudeville|london|GBR|1927|3|1907|1981|v
George Formby|vaudeville|manchester|GBR|1932|2|1904|1961|g
Jack Hylton|hot_jazz|london|GBR|1924|3|1892|1965|k
Henry Hall|big_band|london|GBR|1932|3|1898|1989|h
Beniamino Gigli|opera|milan|ITA|1920|2|1890|1957|v
Tito Schipa|opera|milan|ITA|1920|3|1888|1965|v
Carlo Buti|canzone_napoletana|rome|ITA|1933|3|1902|1963|v
Natalino Otto|big_band|milan|ITA|1938|3|1912|1969|v
Concha Piquer|copla|madrid|ESP|1926|2|1906|1990|v
Imperio Argentina|copla|madrid|ESP|1930|3|1910|2003|v
Manolo Caracol|flamenco|sevilla|ESP|1939|3|1909|1973|v
Alfredo Marceneiro|fado|lisbon|PRT|1930|3|1891|1982|v
Vassilis Tsitsanis|rebetiko|athens|GRC|1936|2|1915|1984|g
Markos Vamvakaris|rebetiko|athens|GRC|1932|2|1905|1972|g
Roza Eskenazi|rebetiko|athens|GRC|1933|3|1895|1980|v
Maria Tănase|cabaret|bucharest|ROU|1934|2|1913|1963|v
Olavi Virta|tango|helsinki|FIN|1938|3|1915|1972|v
Jussi Björling|opera|stockholm|SWE|1930|2|1911|1960|v
Münir Nurettin Selçuk|arabic_classical|istanbul|TUR|1931|3|1900|1981|v
Safiye Ayla|arabic_classical|istanbul|TUR|1934|3|1907|1998|v
Damia|chanson|paris|FRA|1920|3|1889|1978|v
Jean Sablon|chanson|paris|FRA|1931|3|1906|1994|v
Lucienne Boyer|chanson|paris|FRA|1930|3|1901|1983|v
Ray Ventura|big_band|paris|FRA|1931|3|1908|1979|h
Tino Rossi|chanson|marseille|FRA|1934|2|1907|1983|v
`;

const ASIA = `
K. L. Saigal|bollywood|kolkata|IND|1933|1|1904|1947|v
Pankaj Mullick|bollywood|kolkata|IND|1931|3|1905|1978|v
Kanan Devi|bollywood|kolkata|IND|1935|3|1916|1992|v
Mukesh|bollywood|mumbai|IND|1941|2|1923|1976|v
Talat Mahmood|ghazal_pop|kolkata|IND|1944|2|1924|1998|v
Shamshad Begum|bollywood|lahore|IND|1941|2|1919|2013|v
Li Jinhui|shidaiqu|shanghai|CHN|1927|3|1891|1967|v
Bai Hong|shidaiqu|shanghai|CHN|1940|3|1920|1992|v
Li Xianglan|shidaiqu|shanghai|JPN|1938|2|1920|2014|v
Yao Lee|shidaiqu|shanghai|CHN|1941|3|1922|2019|v
Noriko Awaya|kayokyoku|tokyo|JPN|1930|3|1907|1999|v
Shizuko Kasagi|kayokyoku|tokyo|JPN|1938|2|1914|1985|v
Lee Nan-young|trot|seoul|KOR|1935|3|1916|1962|v
Gesang|kroncong|jakarta|IDN|1940|2|1917|2010|v|||Bengawan Solo:1940:s
Ismail Marzuki|kroncong|jakarta|IDN|1936|3|1914|1958|k
Suntaraporn|big_band|bangkok|THA|1939|3|1910|1981|h
P. Ramlee|malay_pop|singapore|MYS|1948|1|1929|1973|v
Asmahan|arabic_classical|cairo|SYR|1933|2|1912|1944|v
Layla Murad|arabic_classical|cairo|EGY|1938|3|1918|1995|v
`;

const AFR = `
Solomon Linda and the Evening Birds|isicathamiya|johannesburg|ZAF|1939|2|1909|1962|v|||Mbube:1939:s
Reuben Caluza|marabi|johannesburg|ZAF|1930|3|1895|1969|k
The Manhattan Brothers|marabi|johannesburg|ZAF|1947|3
Bobby Benson|highlife|lagos|NGA|1946|3|1921|1983|g
Wendo Kolosoy|rumba_congolaise|kinshasa|COD|1948|2|1925|2008|v
Siti binti Saad|taarab|zanzibar|TZA|1928|3|1880|1950|v
`;

export const PACK: Pack19 = {
  id: 'wp_a',
  artists: [USA, BRA, LAT, CAR, EUR, ASIA, AFR].flatMap(rows),
  // estreia anterior ao nascimento do gênero (P. Ramlee: primeiro filme 1948; malay_pop nasce em 1955)
  forerunners: ['P. Ramlee'],
};
