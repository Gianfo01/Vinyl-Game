// WP-E — empresários, promotores e impresários reais (docs/db19.md §3.3) e executivos de selo (REAL_EXECS).
// M('id|Nome|nasc|morte(0=vivo/desconhecido)|cidade|de|até|estilo|comissão', 'fam,fam', 'bio pt~en', [[ato real, de, até]]).
// Só import de valor: `l` de '../world'. Casos sensíveis (Kitagawa, Gulshan Kumar) ficam só com o fato institucional.
import { l } from '../world';
import type { FamilyId } from '../world';
import type { RealExec } from '../labels10';
import type { MgrStyle, RealMgr } from '../managers14';

const t = (s: string) => { const [p, e] = s.split('~'); return l(p, e ?? p); };
/** perfil de atributos [ouvido, negociação, carisma, gestão, imagem] por estilo */
const ATT: Record<MgrStyle, RealMgr['a']> = {
  shark: [60, 88, 70, 75, 55], muscle: [50, 85, 75, 70, 40], svengali: [78, 75, 85, 70, 88], guardian: [82, 70, 72, 80, 60], impresario: [72, 82, 80, 84, 68],
};
const M = (spec: string, fam: string, bio: string, cl: RealMgr['cl'] = []): RealMgr => {
  const [id, name, b, d, city, from, to, style, rate] = spec.split('|');
  const st = style as MgrStyle;
  return { id, name, born: +b || undefined, died: +d || undefined, city, from: +from, to: +to, style: st, fam: fam.split(',') as FamilyId[], a: ATT[st], rate: +rate, bio: t(bio), cl };
};

export const MGRS_E: RealMgr[] = [
  // ---- França, Alemanha, Itália, Benelux
  M('coquatrix|Bruno Coquatrix|1910|1979|paris|1954|1979|impresario|0.1', 'europe,pop', 'Diretor do Olympia de Paris a partir de 1954: o palco que consagrou a canção francesa.~Director of the Olympia in Paris from 1954: the stage that crowned French chanson.'),
  M('filipacchi|Daniel Filipacchi|1928|0|paris|1959|1975|impresario|0.1', 'europe,pop,rock', 'Apresentou "Salut les copains" na Europe 1 (1959) e fundou a revista homônima: o yé-yé ganhou um palanque.~Presented "Salut les copains" on Europe 1 (1959) and founded the magazine: yé-yé got a platform.'),
  M('tenot|Frank Ténot|1925|2004|paris|1959|1990|impresario|0.1', 'europe,blues_jazz', 'Jornalista de jazz, parceiro de Filipacchi na Europe 1 e na revista Jazz Magazine.~Jazz journalist, Filipacchi\'s partner at Europe 1 and Jazz Magazine.'),
  M('barclay|Eddie Barclay|1921|2005|paris|1953|1990|impresario|0.12', 'europe,pop,blues_jazz', 'Pianista de jazz que fundou o selo Barclay (1953) e lançou o disco de qualidade na França.~Jazz pianist who founded the Barclay label (1953) and brought quality records to France.'),
  M('canetti|Jacques Canetti|1909|1997|paris|1947|1980|impresario|0.1', 'europe,pop', 'Diretor artístico da Philips e dono do Trois Baudets: descobriu Brassens, Brel e Gainsbourg.~Philips artistic director and owner of the Trois Baudets: discovered Brassens, Brel and Gainsbourg.', [['Georges Brassens', 1952, 1960], ['Jacques Brel', 1953, 1960]]),
  M('rau|Fritz Rau|1930|2013|frankfurt|1963|2008|impresario|0.1', 'europe,rock,blues_jazz', 'Promotor da Lippmann+Rau: trouxe o blues, o rock e os Stones à Alemanha.~Promoter at Lippmann+Rau: brought blues, rock and the Stones to Germany.'),
  M('lippmann|Horst Lippmann|1927|1997|frankfurt|1962|1990|impresario|0.1', 'europe,blues_jazz', 'Criou o American Folk Blues Festival (1962), que levou o blues de Chicago à Europa.~Created the American Folk Blues Festival (1962), bringing Chicago blues to Europe.'),
  M('lieberberg|Marek Lieberberg|1946|0|frankfurt|1969|2040|impresario|0.1', 'europe,rock', 'Promotor alemão; fundou o Rock am Ring (1985) com mega-turnês no país.~German promoter; founded Rock am Ring (1985) with nationwide mega-tours.'),
  M('cecchetto|Claudio Cecchetto|1952|0|milan|1976|2020|svengali|0.15', 'europe,pop,electronic', 'DJ e fundador da Radio Deejay (1982); lançou Jovanotti.~DJ and founder of Radio Deejay (1982); launched Jovanotti.', [['Jovanotti', 1987, 1990]]),
  M('acket|Paul Acket|1919|1992|amsterdam|1958|1990|impresario|0.1', 'europe,blues_jazz', 'Fundou o North Sea Jazz Festival (1976), maior festival de jazz da Europa.~Founded the North Sea Jazz Festival (1976), Europe\'s biggest jazz festival.'),
  M('schueremans|Herman Schueremans|0|0|brussels|1979|2040|impresario|0.1', 'europe,rock', 'Promotor belga que construiu o Rock Werchter e a Live Nation belga.~Belgian promoter who built Rock Werchter and Belgian live music.'),
  // ---- Reino Unido, Irlanda
  M('goldsmith|Harvey Goldsmith|1946|0|london|1968|2040|impresario|0.1', 'rock,pop', 'Promotor britânico; produziu o Live Aid de Wembley (1985).~British promoter; produced Live Aid at Wembley (1985).'),
  M('eavis|Michael Eavis|1935|0|bristol|1970|2040|guardian|0.05', 'rock,country_folk,pop', 'Fazendeiro de Pilton: fundou o Glastonbury em 1970 e o mantém em terra da família.~Pilton farmer: founded Glastonbury in 1970 and keeps it on family land.'),
  M('jenner|Peter Jenner|1943|0|london|1966|2000|guardian|0.15', 'rock,country_folk', 'Sócio do Blackhill: cuidou do primeiro Pink Floyd de Syd Barrett.~Blackhill partner: looked after Syd Barrett\'s first Pink Floyd.', [['Pink Floyd', 1966, 1968]]),
  M('tonysmith|Tony Smith|1940|0|london|1969|2040|guardian|0.15', 'rock,pop', 'Empresário do Genesis e de Phil Collins por décadas (Hit & Run).~Genesis and Phil Collins\' manager for decades (Hit & Run).', [['Genesis', 1975, 2007], ['Phil Collins', 1980, 2010]]),
  M('copeland|Miles Copeland III|1944|0|london|1977|2000|shark|0.2', 'rock,pop', 'Americano em Londres, fundou o selo IRS e levou o The Police ao mundo.~American in London, founded IRS and took The Police to the world.', [['The Police', 1977, 1984]]),
  M('napierbell|Simon Napier-Bell|1939|0|london|1966|1990|svengali|0.2', 'pop,rock', 'Empresário dos Yardbirds e do Wham!, com a lição do primeiro show na China (1985).~Manager of the Yardbirds and Wham!, with the first China show lesson (1985).', [['The Yardbirds', 1966, 1967], ['Wham!', 1982, 1986]]),
  M('walsh|Louis Walsh|1952|0|dublin|1991|2040|svengali|0.15', 'pop', 'Irlandês; boy bands Boyzone e Westlife.~Irishman; the boy bands Boyzone and Westlife.', [['Boyzone', 1993, 2000], ['Westlife', 1998, 2012]]),
  M('bron|Gerry Bron|1933|2014|london|1968|1990|shark|0.2', 'rock', 'Dono do selo Bronze; empresário do Uriah Heep e do Motörhead.~Bronze label owner; manager of Uriah Heep and Motörhead.', [['Uriah Heep', 1970, 1982], ['Motörhead', 1976, 1982]]),
  M('secunda|Tony Secunda|1940|1995|london|1966|1990|svengali|0.2', 'rock', 'Empresário de truques de imprensa: The Move e Procol Harum.~A manager of press stunts: The Move and Procol Harum.', [['The Move', 1966, 1968], ['Procol Harum', 1967, 1968]]),
  M('ellis|Terry Ellis|1943|0|london|1967|1990|shark|0.15', 'rock', 'Empresário do Jethro Tull e cofundador da Chrysalis.~Jethro Tull\'s manager and Chrysalis co-founder.', [['Jethro Tull', 1968, 1978]]),
  M('riviera|Jake Riviera|0|0|london|1976|2000|guardian|0.15', 'rock,pop', 'Cofundador da Stiff e empresário de Elvis Costello e Nick Lowe.~Stiff co-founder and manager of Elvis Costello and Nick Lowe.', [['Elvis Costello', 1977, 1986], ['Nick Lowe', 1976, 1986]]),
  M('rhodes|Bernard Rhodes|0|0|london|1976|1983|svengali|0.2', 'rock', 'Empresário punk do The Clash em sua fase inicial.~Punk manager of The Clash in their early phase.', [['The Clash', 1976, 1978]]),
  M('bicknell|Ed Bicknell|0|0|london|1978|1995|guardian|0.15', 'rock', 'Baterista de jazz que virou empresário do Dire Straits.~Jazz drummer turned manager of Dire Straits.', [['Dire Straits', 1978, 1995]]),
  M('drummond|Bill Drummond|1953|0|liverpool|1978|1987|svengali|0.2', 'rock,electronic', 'Selo Zoo em Liverpool; depois KLF e performances de arte.~Zoo label in Liverpool; later the KLF and art performances.'),
  M('rudge|Peter Rudge|1944|0|london|1968|1990|shark|0.2', 'rock', 'Tour manager do The Who e dos Rolling Stones nos anos 70.~Tour manager of The Who and the Rolling Stones in the 70s.', [['The Who', 1968, 1971], ['The Rolling Stones', 1972, 1975]]),
  M('curbishley|Bill Curbishley|1943|0|london|1970|2040|muscle|0.15', 'rock', 'Ex-gerente de empresa e empresário do The Who e de Robert Plant.~Ex-company manager turned The Who\'s and Robert Plant\'s manager.', [['The Who', 1975, 2020], ['Robert Plant', 1982, 2000]]),
  M('stamp|Chris Stamp|1942|2012|london|1964|1985|svengali|0.2', 'rock', 'Cofundador da Track Records e empresário do The Who ao lado de Kit Lambert.~Track Records co-founder and The Who\'s manager alongside Kit Lambert.', [['The Who', 1964, 1970]]),
  M('grade|Lew Grade|1906|1998|london|1955|1990|impresario|0.1', 'pop', 'Magnata da TV britânica (ATV) e impresário de shows.~British TV mogul (ATV) and show impresario.'),
  M('delfont|Bernard Delfont|1909|1994|london|1941|1991|impresario|0.1', 'pop', 'Impresário do West End e do London Palladium.~West End and London Palladium impresario.'),
  M('hylton|Jack Hylton|1892|1965|london|1920|1965|impresario|0.1', 'pop,blues_jazz', 'Líder de orquestra que virou o maior impresário de variedades britânico.~Bandleader turned Britain\'s biggest variety impresario.'),
  M('davison|Harold Davison|1925|2012|london|1948|2000|impresario|0.1', 'pop,blues_jazz', 'Agente e promotor britânico de turnês de artistas americanos.~British agent and promoter of American artists\' tours.'),
  M('howes|Arthur Howes|1927|1995|london|1958|1995|impresario|0.1', 'pop,rock', 'Promotor das turnês-pacote dos anos 60, incluindo os Beatles.~Promoter of the 60s package tours, including the Beatles.'),
  M('dickjames|Dick James|1920|1986|london|1961|1980|impresario|0.12', 'pop,rock', 'Editor musical dos Beatles, via Northern Songs.~The Beatles\' music publisher, via Northern Songs.'),
  M('ronniescott|Ronnie Scott|1927|1996|london|1959|1996|impresario|0.1', 'blues_jazz', 'Saxofonista que fundou o clube de jazz mais famoso de Londres (1959).~Saxophonist who founded London\'s most famous jazz club (1959).'),
  // ---- Jamaica e Caribe
  M('sims|Danny Sims|0|0|kingston|1964|1980|shark|0.2', 'caribbean,pop', 'Dono da Cayman Music; contratou os Wailers em 1966 e vendeu o resto do contrato a Chris Blackwell em 1972.~Owner of Cayman Music; signed the Wailers in 1966 and sold the remainder of their contract to Chris Blackwell in 1972.', [['The Wailers', 1966, 1972]]),
  M('cowan|Tommy Cowan|0|0|kingston|1968|2040|impresario|0.1', 'caribbean', 'Cofundador do Reggae Sunsplash (1978) e produtor de shows.~Co-founder of Reggae Sunsplash (1978) and show producer.'),
  M('mercado|Ralph Mercado|1941|2009|new_york|1966|2005|impresario|0.1', 'latin,caribbean', 'Promotor do circuito salsero de Nova York; fundou a RMM em 1987.~Promoter of New York\'s salsa circuit; founded RMM in 1987.'),
  // ---- América Latina
  M('velasco|Raúl Velasco|1934|2006|mexico_city|1969|2000|impresario|0.1', 'latin,pop', 'Apresentador de "Siempre en Domingo": palanque do pop latino por três décadas.~Host of "Siempre en Domingo": a stage for Latin pop for three decades.'),
  M('llano|Luis de Llano Palmer|0|0|mexico_city|1950|1990|impresario|0.1', 'latin,rock', 'Produtor de TV; ligado ao festival de Avándaro (setembro de 1971), maior encontro de rock do México.~TV producer tied to the Avándaro festival (Sept 1971), Mexico\'s biggest rock gathering.'),
  M('grinbank|Daniel Grinbank|0|0|buenos_aires|1980|2040|impresario|0.1', 'latin,rock', 'Produtor argentino de shows e vitrine do rock nacional.~Argentine concert producer and showcase of national rock.'),
  M('medina|Roberto Medina|0|0|rio|1980|2040|impresario|0.1', 'brazil,rock,pop', 'Publicitário que criou o Rock in Rio (1985).~Advertising man who created Rock in Rio (1985).'),
  // ---- Oceania
  M('gudinski|Michael Gudinski|1952|2021|melbourne|1972|2021|impresario|0.12', 'rock,pop', 'Fundou a Mushroom (1972) e a Frontier Touring (1979).~Founded Mushroom (1972) and Frontier Touring (1979).', [['Skyhooks', 1974, 1980], ['Split Enz', 1975, 1984]]),
  M('wheatley|Glenn Wheatley|1948|2022|melbourne|1975|2020|svengali|0.15', 'rock,pop', 'Baixista que virou empresário do Little River Band e de John Farnham.~Bassist turned manager of Little River Band and John Farnham.', [['Little River Band', 1975, 1982], ['John Farnham', 1979, 2000]]),
  M('chugg|Michael Chugg|1953|0|sydney|1975|2040|impresario|0.1', 'rock', 'Promotor de pub rock e festivais australianos.~Australian pub rock and festival promoter.'),
  M('davies|Roger Davies|1951|0|sydney|1975|2040|guardian|0.15', 'pop,rock', 'Empresário australiano de Tina Turner, Cher e Sade.~Australian manager of Tina Turner, Cher and Sade.', [['Tina Turner', 1982, 2020], ['Cher', 1987, 1998], ['Sade', 1983, 1990]]),
  // ---- América do Norte (fora do eixo de artistas, mas de impacto global)
  M('finkelstein|Bernie Finkelstein|1946|0|toronto|1969|2040|guardian|0.15', 'rock,country_folk', 'Fundou a True North (1969); empresário de Bruce Cockburn por décadas.~Founded True North (1969); Bruce Cockburn\'s manager for decades.', [['Bruce Cockburn', 1969, 2040]]),
  M('cohl|Michael Cohl|1949|0|toronto|1972|2020|shark|0.1', 'rock,pop', 'Promotor de megaturnês: Stones e U2.~Mega-tour promoter: the Stones and U2.', [['The Rolling Stones', 1989, 2007], ['U2', 2009, 2011]]),
  M('bruceallen|Bruce Allen|1950|0|vancouver|1976|2040|shark|0.15', 'rock,pop', 'Empresário canadense de Bryan Adams desde 1976.~Canadian manager of Bryan Adams since 1976.', [['Bryan Adams', 1976, 2040]]),
  M('wein|George Wein|1925|2021|new_york|1950|2021|impresario|0.1', 'blues_jazz,country_folk', 'Pianista e promotor: criou o Newport Jazz (1954) e o Newport Folk (1959).~Pianist and promoter: created Newport Jazz (1954) and Newport Folk (1959).'),
  M('granz|Norman Granz|1918|2001|los_angeles|1944|1990|guardian|0.1', 'blues_jazz', 'Criou o Jazz at the Philharmonic (1944), integrou plateias e fundou a Verve.~Created Jazz at the Philharmonic (1944), integrated audiences and founded Verve.', [['Ella Fitzgerald', 1954, 1990], ['Oscar Peterson', 1950, 1990]]),
  M('hurok|Sol Hurok|1888|1974|new_york|1913|1974|impresario|0.15', 'pop,blues_jazz', 'Impresário russo-americano de música clássica, dança e artistas estrangeiros em turnê.~Russian-American impresario of classical music, dance and touring foreign artists.'),
  // ---- Ásia e África
  M('parkjy|Park Jin-young|1971|0|seoul|1997|2040|svengali|0.2', 'asia_me,pop', 'Fundador da JYP (1997): modelo de agência de ídolos com compositor-chefe.~Founder of JYP (1997): the idol agency model with a head composer.', [['Wonder Girls', 2007, 2017], ['2PM', 2008, 2040], ['TWICE', 2015, 2040], ['Stray Kids', 2018, 2040]]),
  M('minheejin|Min Hee-jin|1979|0|seoul|2021|2040|svengali|0.1', 'asia_me,pop', 'Diretora criativa de longa data no k-pop; fundou a ADOR em 2021.~Long-time k-pop creative director; founded ADOR in 2021.'),
  M('kitagawa|Johnny Kitagawa|1931|2019|tokyo|1962|2019|svengali|0.3', 'asia_me,pop', 'Fundou a Johnny & Associates (1962) e o modelo de ídolos masculinos; a agência foi reestruturada em 2023 após revelações póstumas.~Founded Johnny & Associates (1962) and the male idol model; the agency was restructured in 2023 after posthumous revelations.', [['SMAP', 1991, 2016], ['Arashi', 1999, 2019]]),
  M('gulshan|Gulshan Kumar|1956|1997|delhi|1983|1997|impresario|0.1', 'asia_me', 'Fundador da T-Series (1983): fitas cassete baratas que massificaram a música indiana. Morreu em 1997.~Founder of T-Series (1983): cheap cassettes that mass-marketed Indian music. Died in 1997.'),
  M('lombard|Rashid Lombard|0|0|cape_town|1999|2040|impresario|0.1', 'blues_jazz,africa', 'Fotógrafo e produtor; cofundador do Cape Town International Jazz Festival (2000).~Photographer and producer; co-founder of the Cape Town International Jazz Festival (2000).'),
];

const e = (rid: string, name: string, born: number, died: number | undefined, label: string, y: number, bg: string, style: string, pt: string, en: string): RealExec =>
  ({ rid, name, born, died, label, y, bg, style, pt, en });

export const EXECS_E: RealExec[] = [
  e('coxsone_dodd', 'Coxsone Dodd', 1932, 2004, 'x_studio_one', 1962, 'dj', 'mentor', 'Dono de sound system que transformou um estúdio em escola do ska e do rocksteady.', 'Sound system owner who turned a studio into the school of ska and rocksteady.'),
  e('duke_reid', 'Duke Reid', 1915, 1975, 'x_treasure_isle', 1963, 'promoter', 'autocrat', 'Ex-policial e dono de sound system; estúdio sobre a loja de bebidas.', 'Ex-policeman and sound system owner; studio above the liquor store.'),
  e('jerry_masucci', 'Jerry Masucci', 1934, 1997, 'x_fania', 1964, 'lawyer', 'dealmaker', 'Advogado e cofundador da Fania: fez a salsa virar indústria.', 'Lawyer and Fania co-founder: turned salsa into an industry.'),
  e('johnny_pacheco', 'Johnny Pacheco', 1935, 2021, 'x_fania', 1964, 'artist', 'mentor', 'Dominicano e cofundador da Fania; criou os Fania All-Stars (1968).', 'Dominican and Fania co-founder; created the Fania All-Stars (1968).'),
  e('alan_mcgee', 'Alan McGee', 1960, undefined, 'x_creation', 1983, 'artist', 'showman', 'Escocês de Londres que fundou a Creation e apostou no Oasis.', 'Scot in London who founded Creation and bet on Oasis.'),
  e('roger_shepherd', 'Roger Shepherd', 1957, undefined, 'x_flying_nun', 1981, 'dj', 'consensus', 'Lojista de discos que fundou a Flying Nun em Christchurch (1981).', 'Record-shop clerk who founded Flying Nun in Christchurch (1981).'),
  e('michael_gudinski', 'Michael Gudinski', 1952, 2021, 'x_mushroom', 1972, 'promoter', 'showman', 'Promotor de Melbourne que fundou a Mushroom (1972).', 'Melbourne promoter who founded Mushroom (1972).'),
  e('lucian_grainge', 'Lucian Grainge', 1960, undefined, 'x_universal', 2010, 'promoter', 'dealmaker', 'Editor musical que chegou ao comando da maior major do mundo.', 'Music publisher who rose to run the world\'s biggest major.'),
  e('doug_morris', 'Doug Morris', 1938, undefined, 'x_universal', 2004, 'artist', 'dealmaker', 'Compositor de pop que virou chefe de gravadoras (Atlantic, Universal, Sony).', 'Pop songwriter turned label chief (Atlantic, Universal, Sony).'),
  e('tommy_mottola', 'Tommy Mottola', 1949, undefined, 'x_sony', 1988, 'promoter', 'autocrat', 'Empresário que presidiu a Sony Music nos EUA de 1988 a 2003.', 'Manager who ran Sony Music US from 1988 to 2003.'),
  e('la_reid', 'L.A. Reid', 1956, undefined, 'x_epic', 2011, 'producer', 'showman', 'Produtor e baterista que virou executivo de grandes selos.', 'Producer and drummer turned executive at major labels.'),
  e('sylvia_rhone', 'Sylvia Rhone', 1952, undefined, 'x_atlantic', 1994, 'lawyer', 'dealmaker', 'Primeira mulher negra a presidir uma major americana (Elektra/Atlantic).', 'First Black woman to head a major US label group (Elektra/Atlantic).'),
  e('lyor_cohen', 'Lyor Cohen', 1959, undefined, 'cipher_street', 1988, 'promoter', 'dealmaker', 'Empresário de turnês que virou sócio do Def Jam e de seu salto.', 'Tour manager who became Def Jam\'s partner and drove its leap.'),
  e('eddie_barclay', 'Eddie Barclay', 1921, 2005, 'x_barclay', 1953, 'artist', 'showman', 'Pianista e festeiro de Saint-Tropez, fundador do selo Barclay.', 'Pianist and Saint-Tropez party host, founder of the Barclay label.'),
  e('ralph_peer', 'Ralph Peer', 1892, 1960, 'x_okeh', 1920, 'engineer', 'dealmaker', 'Gravou o blues e o country em campo; criou o modelo de editora sobre direitos.', 'Recorded blues and country in the field; built the publishing-rights model.'),
  e('tony_stratton_smith', 'Tony Stratton-Smith', 1933, 1987, 'x_charisma', 1969, 'journalist', 'showman', 'Jornalista esportivo que fundou a Charisma (Genesis, Monty Python).', 'Sports journalist who founded Charisma (Genesis, Monty Python).'),
  e('chris_wright', 'Chris Wright', 1943, undefined, 'x_chrysalis', 1969, 'promoter', 'dealmaker', 'Agente de shows que fundou a Chrysalis com Terry Ellis.', 'Booking agent who founded Chrysalis with Terry Ellis.'),
  e('dave_robinson', 'Dave Robinson', 1944, undefined, 'x_stiff', 1976, 'promoter', 'showman', 'Irlandês que fundou a Stiff: "Se não é estranho, não é Stiff".', 'Irishman who founded Stiff: "If it ain\'t Stiff, it ain\'t worth a fuck".'),
  e('ivo_watts_russell', 'Ivo Watts-Russell', 1954, undefined, 'x_4ad', 1980, 'dj', 'visionary', 'Lojista de discos que fundou a 4AD como obra de arte total.', 'Record-shop clerk who founded 4AD as total art.'),
  e('martin_mills', 'Martin Mills', 1952, undefined, 'x_beggars', 1977, 'dj', 'consensus', 'Fundou a Beggars Banquet: de loja de discos a grupo independente global.', 'Founded Beggars Banquet: from record shop to a global independent group.'),
  e('tom_silverman', 'Tom Silverman', 1953, undefined, 'x_tommyboy', 1981, 'journalist', 'visionary', 'Fundador do Tommy Boy: do rap ao dance de Nova York.', 'Founder of Tommy Boy: from rap to New York dance.'),
  e('richard_russell', 'Richard Russell', 1971, undefined, 'x_xl', 1991, 'dj', 'visionary', 'Chefe da XL: de rave a Adele e Radiohead.', 'XL chief: from rave to Adele and Radiohead.'),
  e('akio_morita', 'Akio Morita', 1921, 1999, 'x_sony', 1968, 'engineer', 'visionary', 'Cofundador da Sony; abriu a CBS/Sony Japão em 1968.', 'Sony co-founder; opened CBS/Sony Japan in 1968.'),
  e('norio_ohga', 'Norio Ohga', 1930, 2011, 'x_sony', 1982, 'artist', 'visionary', 'Barítono que presidiu a Sony e impôs o CD.', 'Baritone who presided over Sony and pushed the CD.'),
  e('max_matsuura', 'Max Matsuura', 1964, undefined, 'x_avex', 1988, 'dj', 'dealmaker', 'Cofundador da Avex: do eurobeat às divas do J-pop.', 'Avex co-founder: from Eurobeat to J-pop divas.'),
];
