// WP-B — artistas do Caribe e da África (docs/db19.md §3.1 B e C e §5). Nomes já existentes no catálogo/realacts são
// descartados pela deduplicação de REAL_ALL. Excluídos de propósito (regras do doc): Vybz Kartel (condenação por homicídio),
// Saad Lamjarred (condenação por estupro) e casos de morte violenta tratados como crime. Formato das linhas: ver ./ab_util.ts.
import type { Pack19 } from './types';
import { rows } from './ab_util';

const JAM = `
The Skatalites|ska|kingston|JAM|1964|2||||Tommy McCook:h:1927:1998;Roland Alphonso:h:1931:1998;Lester Sterling:h;Jackie Mittoo:k:1948:1990;Lloyd Knibb:d:1931:2011|
Toots and the Maytals|ska|kingston|JAM|1962|2|||||Toots Hibbert:v:1942:2020;Raleigh Gordon:v;Jerry Matthias:v|Funky Kingston:1973;Reggae Got Soul:1976
Prince Buster|ska|kingston|JAM|1958|2|1938|2016|v
Derrick Morgan|ska|kingston|JAM|1959|3|1940||v
Laurel Aitken|ska|kingston|JAM|1958|3|1927|2005|v
Lee "Scratch" Perry|ska|kingston|JAM|1961|2|1936|2021|p
Alton Ellis|rocksteady|kingston|JAM|1965|3|1938|2008|v
Burning Spear|reggae|kingston|JAM|1969|2|1948||v|||Marcus Garvey:1975;Man in the Hills:1976
Dennis Brown|reggae|kingston|JAM|1969|2|1957|1999|v
Gregory Isaacs|reggae|kingston|JAM|1970|2|1951|2010|v
Black Uhuru|reggae|kingston|JAM|1972|2
Third World|reggae|kingston|JAM|1973|3
Culture|reggae|kingston|JAM|1976|3|||||Joseph Hill:v:1949:2006
Barrington Levy|dancehall|kingston|JAM|1979|3|1964||v
Yellowman|dancehall|kingston|JAM|1982|2|1956||v
Sister Nancy|dancehall|kingston|JAM|1982|3|1962||v
Shabba Ranks|dancehall|kingston|JAM|1989|2|1966||v
Buju Banton|dancehall|kingston|JAM|1992|2|1973||v
Bounty Killer|dancehall|kingston|JAM|1992|3|1972||v
Shaggy|reggae_fusion|kingston|JAM|1993|1|1968||v
Beenie Man|dancehall|kingston|JAM|1993|2|1973||v
Damian Marley|reggae|kingston|JAM|1996|2|1978||v
Sean Paul|dancehall|kingston|JAM|1996|1|1973||v
Chronixx|reggae|kingston|JAM|2012|2|1992||v
Koffee|reggae|kingston|JAM|2018|2|2000||v
Protoje|reggae|kingston|JAM|2008|3|1978||v
Steel Pulse|reggae|birmingham|GBR|1975|2
Aswad|reggae|london|GBR|1975|3
`;

const CAR = `
Mighty Sparrow|calypso|port_of_spain|TTO|1955|2|1935||v
Calypso Rose|calypso|port_of_spain|TTO|1964|3|1940||v
Machel Montano|soca|port_of_spain|TTO|1986|2|1974||v
Tabou Combo|kompa|port_au_prince|HTI|1968|2
Nemours Jean-Baptiste|kompa|port_au_prince|HTI|1955|3|1918|1985|g
Boukman Eksperyans|world_fusion|port_au_prince|HTI|1978|3
Johnny Ventura|merengue|santo_domingo|DOM|1962|3|1940||v
Wilfrido Vargas|merengue|santo_domingo|DOM|1970|3|1949||v
Prince Royce|bachata|new_york|USA|2010|2|1989||v
Cheo Feliciano|salsa|new_york|PRI|1962|3|1935|2014|v
Ismael Rivera|salsa|san_juan|PRI|1954|2|1931|1987|v
Tego Calderón|reggaeton|san_juan|PRI|2002|3|1972||m
Baha Men|junkanoo|nassau|BHS|1977|3
Irakere|fusion|havana|CUB|1973|2
Orishas|hiphop|havana|CUB|1999|3
Gente de Zona|reggaeton|havana|CUB|2000|2
`;

const ZAF = `
Mahlathini and the Mahotella Queens|mbaqanga|johannesburg|ZAF|1964|2
Johnny Clegg|mbaqanga|johannesburg|ZAF|1986|2|1953|2019|v
Lucky Dube|reggae|johannesburg|ZAF|1984|2|1964|2007|v
Yvonne Chaka Chaka|mbaqanga|johannesburg|ZAF|1985|3|1965||v
Arthur Mafokate|kwaito|johannesburg|ZAF|1992|3
Boom Shaka|kwaito|johannesburg|ZAF|1993|3
TKZee|kwaito|johannesburg|ZAF|1996|3
Mandoza|kwaito|johannesburg|ZAF|2000|3|1978|2016|m
Die Antwoord|hiphop|cape_town|ZAF|2008|2
DJ Maphorisa|amapiano|johannesburg|ZAF|2014|2|1985||j
Nasty C|hiphop|durban|ZAF|2014|2|1997||m
Sho Madjozi|gqom|johannesburg|ZAF|2018|3|1992||m
Focalistic|amapiano|johannesburg|ZAF|2019|3|1992||m
Musa Keys|amapiano|johannesburg|ZAF|2021|3|1999||k
Uncle Waffles|amapiano|johannesburg|ZAF|2022|2|1999||j
`;

const WAF = `
Victor Olaiya|highlife|lagos|NGA|1950|3|1930|2020|h
Haruna Ishola|juju|lagos|NGA|1950|3|1919|1983|v
Ebo Taylor|highlife|accra|GHA|1960|3|1936||g
Pat Thomas|highlife|accra|GHA|1967|3|1951||v
Sir Victor Uwaifo|highlife|lagos|NGA|1966|3|1941|2021|g
Orlando Julius|highlife|lagos|NGA|1965|3|1943||h
Prince Nico Mbarga|highlife|lagos|CMR|1976|3|1950|1997|g|||Sweet Mother:1976:s
Daddy Lumba|highlife|accra|GHA|1987|2|1964||v
Femi Kuti|afrobeat|lagos|NGA|1986|2|1962||h
Seun Kuti|afrobeat|lagos|NGA|2008|3|1983||h
D'banj|afrobeats|lagos|NGA|2004|2|1980||v
Stonebwoy|dancehall|accra|GHA|2010|3|1988||v
Shatta Wale|dancehall|accra|GHA|2010|3|1984||v
Olamide|hiphop|lagos|NGA|2011|2|1989||m
Fuse ODG|afrobeats|london|GBR|2011|3|1988||v
Mr Eazi|afrobeats|lagos|NGA|2014|2|1991||v
Fireboy DML|afrobeats|lagos|NGA|2019|2|1995||v
CKay|afrobeats|lagos|NGA|2019|2|1995||v
Omah Lay|afrobeats|lagos|NGA|2020|2|1997||v
Victony|afrobeats|lagos|NGA|2020|3|2001||v
Ruger|afrobeats|lagos|NGA|2021|3|2001||v
Black Sherif|drill_afro|accra|GHA|2021|2|2002||m
Manu Dibango|makossa|douala|CMR|1962|2|1933|2020|h|||Soul Makossa:1972:s
Francis Bebey|makossa|douala|CMR|1969|3|1929|2001|g
Alpha Blondy|reggae|abidjan|CIV|1982|2|1953||v
Tiken Jah Fakoly|reggae|abidjan|CIV|1996|3|1968||v
Magic System|coupe_decale|abidjan|CIV|1997|2||||||Premier Gaou:2002
`;

const SAH = `
Les Ballets Africains|mande_pop|conakry|GIN|1958|3
Bembeya Jazz National|mande_pop|conakry|GIN|1961|2
Super Rail Band|mande_pop|bamako|MLI|1970|3
Les Ambassadeurs|mande_pop|bamako|MLI|1970|3
Omar Pene|mbalax|dakar|SEN|1976|3|1956||v
Positive Black Soul|hiphop|dakar|SEN|1989|3
Ismaël Lô|mbalax|dakar|SEN|1985|3|1956||g
Cheikh Lô|mbalax|dakar|SEN|1990|3|1955||v
Toumani Diabaté|world_fusion|bamako|MLI|1987|2|1965||s
Rokia Traoré|desert_blues|bamako|MLI|1998|3|1974||v
Bassekou Kouyaté|desert_blues|bamako|MLI|2007|3|1966||s
Fatoumata Diawara|wassoulou|bamako|MLI|2011|3|1982||v
`;

const CEA = `
Grand Kallé et l'African Jazz|rumba_congolaise|kinshasa|COD|1953|2||||Joseph Kabasele:v:1930:1983
Dr Nico Kasanda|rumba_congolaise|kinshasa|COD|1955|3|1939|1985|g
Zaïko Langa Langa|soukous|kinshasa|COD|1969|2
Pépé Kallé|soukous|kinshasa|COD|1972|3|1951|1998|v
Mbilia Bel|soukous|kinshasa|COD|1981|3|1959||v
Kanda Bongo Man|soukous|kinshasa|COD|1981|3|1955||v
Werrason|soukous|kinshasa|COD|1981|2|1964||v
Fally Ipupa|ndombolo|kinshasa|COD|2006|2|1977||v
Mbaraka Mwinshehe|soukous|dar_es_salaam|TZA|1964|3|1944|1979|g
Remmy Ongala|soukous|dar_es_salaam|TZA|1988|3|1947|2010|v
Samba Mapangala|soukous|nairobi|COD|1976|3|||v
D.O. Misiani|benga|nairobi|KEN|1967|3|1940|2006|g
Harmonize|bongo_flava|dar_es_salaam|TZA|2015|2|1994||v
Eddy Kenzo|afrobeats|kampala|UGA|2008|3|1990||v
Mahmoud Ahmed|ethio_jazz|addis_ababa|ETH|1964|3|1941||v
Alemayehu Eshete|ethio_jazz|addis_ababa|ETH|1963|3|1941|2021|v
Teddy Afro|ethio_jazz|addis_ababa|ETH|2001|2|1976||v
Mohammed Wardi|arabic_classical|khartoum|SDN|1957|3|1932|2012|v
`;

const NAF = `
Nass El Ghiwane|gnawa|casablanca|MAR|1971|2
Jil Jilala|gnawa|casablanca|MAR|1972|3
Cheikha Rimitti|rai|oran|DZA|1952|2|1923|2006|v
Lili Boniche|chaabi|algiers|DZA|1936|3|1921|2008|g
Idir|folk|algiers|DZA|1973|2|1949|2020|v
Souad Massi|folk|algiers|DZA|1999|3|1972||v
Gnawa Diffusion|world_fusion|lyon|FRA|1992|3
Warda|arabic_pop|cairo|DZA|1960|2|1939|2012|v
Saliha|arabic_classical|tunis|TUN|1936|3|1914|1958|v
Emel Mathlouthi|world_fusion|tunis|TUN|2012|3|1982||v
`;

const LUS = `
Ngola Ritmos|semba|luanda|AGO|1947|3
Waldemar Bastos|semba|luanda|AGO|1983|3|1954||v
Paulo Flores|semba|luanda|AGO|1990|2|1972||v
Anselmo Ralph|kizomba|luanda|AGO|2003|2|1981||v
Bana|morna|mindelo|CPV|1962|3|1932|2013|v
Tito Paris|funana|lisbon|CPV|1984|3|1963||g
`;

export const PACK: Pack19 = {
  id: 'wp_b',
  artists: [JAM, CAR, ZAF, WAF, SAH, CEA, NAF, LUS].flatMap(rows),
  // estreias antes do gênero da carreira: Les Ballets Africains (1958, mande_pop 1960 ✓), Prince Nico Mbarga etc. já cabem na janela
  forerunners: [],
};
