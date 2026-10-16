// R31 · onda 3 (U) — FACÇÕES POR PAÍS. Completa o submundo para que todo país com cena musical tenha ao menos uma
// facção em cada época (plano-pagina.md, "Submundo no mundo"). Duas camadas:
//  1. FAC31: facções escritas à mão para os países e épocas que faltavam (França, Jamaica, Rússia, Argentina, Nigéria,
//     Canadá, Austrália, Alemanha, Espanha…). TODAS INVENTADAS (ids 'f…', real: false): nomes genéricos inspirados no
//     tipo de crime da época e do lugar (apaches de Paris, milieu de Marselha, barras do futebol, piratas de mercado),
//     sem nenhuma pessoa ou grupo real — por isso nada entra no registro de nomes reais (realnames31.ts).
//  2. facGen31: para cada país com cidade no jogo, os anos (1889–2040) que nenhuma facção cobre ganham uma facção
//     genérica da época (contrabandistas antes de 1950, donos da noite depois), com nome montado da cidade principal.
// Como o crime digital (cyber29), ficam FORA da lista padrão orgs17(s): NPCs e o mundo sem interação continuam iguais.
// Quem as usa: fac31 (presença no país, expansão) e broker31 (intermediário). Não vão todas para o mapa.

import { countryOfCity } from './geo';
import { ORGS19 } from './media19b';
import { ORGS17, type OrgDef17, type OrgKind17, type Racket17 } from './orgs17';
import { CYBER29, STREET29 } from './cyber29';
import { CITIES, cityById, l, type L } from './world';

const F = (id: string, pt: string, en: string, kind: OrgKind17, city: string, from: number, to: number, power: number, rackets: Racket17[], dpt: string, den: string,
  f: OrgDef17['f']): OrgDef17 => ({ id, name: l(pt, en), kind, city, from, to, real: false, power, rackets, desc: l(dpt, den), f });
const BOLD = { coragem: 80, empatia: 20, ambicao: 70, impulsividade: 70, lealdade: 65, disciplina: 35 };
const COLD = { coragem: 60, empatia: 25, ambicao: 80, impulsividade: 30, lealdade: 60, disciplina: 80 };
const SLY = { coragem: 50, empatia: 30, ambicao: 85, impulsividade: 35, lealdade: 40, disciplina: 70 };

/** Facções inventadas por país e época (os buracos do mapa antigo). */
export const FAC31: OrgDef17[] = [
  // Estados Unidos (antes da Lei Seca e na Lei Seca)
  F('fcinco', 'Gangue dos Cinco Cantos', 'Five Corners Gang', 'gang', 'new_york', 1889, 1925, 45, ['protection', 'violence', 'clubs'],
    'Brigões de taverna que "protegem" os salões de dança e os cafés-concerto do Baixo Manhattan.', 'Saloon brawlers who "protect" the dance halls and concert saloons of Lower Manhattan.', BOLD),
  F('frum', 'Os Contrabandistas do Lago', 'The Lake Rumrunners', 'syndicate', 'detroit', 1919, 1934, 55, ['clubs', 'laundering', 'jukebox'],
    'Uísque pelo rio na Lei Seca; donos de bares clandestinos onde as bandas de jazz tocam até de manhã.', 'Whiskey across the river during Prohibition; owners of speakeasies where jazz bands play till dawn.', COLD),
  // Reino Unido
  F('frace', 'Gangue dos Hipódromos', 'The Racecourse Gang', 'gang', 'london', 1910, 1953, 45, ['protection', 'tickets', 'violence'],
    'Cobram dos bookmakers e dos teatros de variedades; navalha no bolso e ingresso na mão.', 'They squeeze bookmakers and variety theatres; a razor in the pocket and a ticket in hand.', BOLD),
  F('fsoho', 'Os Senhorios do Soho', 'The Soho Landlords', 'firm', 'london', 1968, 2012, 50, ['clubs', 'protection', 'laundering'],
    'Herdeiros da noite do West End: aluguel caro, porteiros de confiança e caixa que não fecha.', 'Heirs to the West End night: steep rents, trusted doormen and a till that never balances.', SLY),
  F('fnorte', 'A Firma do Norte', 'The Northern Firm', 'gang', 'manchester', 1985, 2100, 40, ['clubs', 'protection', 'violence'],
    'A "segurança" das casas de rave e dos clubes do norte da Inglaterra — quem entra com droga paga a eles.', 'The "security" of northern England\'s rave clubs — whoever brings drugs in pays them.', BOLD),
  F('fliffey', 'A Firma do Liffey', 'The Liffey Firm', 'gang', 'dublin', 1980, 2100, 40, ['protection', 'laundering', 'clubs'],
    'Rixa de famílias de Dublin que lava dinheiro em bares e boates da cidade.', 'A Dublin family feud that launders money through the city\'s pubs and clubs.', BOLD),
  // França
  F('fapache', 'Os Apaches de Belleville', 'The Belleville Apaches', 'gang', 'paris', 1889, 1935, 40, ['clubs', 'protection', 'violence'],
    'Bandos dos bailes populares de Paris: dança, faca e "proteção" dos cabarés da colina.', 'Gangs of the Paris dance halls: dancing, knives and "protection" for the hilltop cabarets.', BOLD),
  F('fmilieu', 'O Milieu do Porto Velho', 'The Old Port Milieu', 'syndicate', 'marseille', 1930, 2100, 60, ['clubs', 'laundering', 'protection', 'bootleg'],
    'O submundo do porto de Marselha: boates, cassinos clandestinos e discos que chegam sem nota.', 'The Marseille harbour underworld: nightclubs, back-room casinos and records that arrive without paperwork.', COLD),
  F('fcite', 'Os da Cité', 'The Estate Crew', 'gang', 'paris', 1990, 2100, 35, ['violence', 'protection'],
    'Turma de um conjunto habitacional da periferia; o rap do bairro passa pela aprovação deles.', 'A crew from a suburban housing estate; the neighbourhood\'s rap goes through their approval.', BOLD),
  // Itália
  F('fmanonera', 'A Mão Negra', 'The Black Hand', 'mafia', 'naples', 1889, 1950, 45, ['protection', 'violence'],
    'Cartas com uma mão desenhada a carvão: pague ou o teatro pega fogo.', 'Letters with a hand drawn in charcoal: pay up or the theatre burns.', BOLD),
  F('ftibre', 'A Banda do Tibre', 'The Tiber Gang', 'gang', 'rome', 1975, 2100, 45, ['clubs', 'laundering', 'protection'],
    'Bando romano que entrou na noite da capital e nos camarotes dos estádios.', 'A Roman gang that moved into the capital\'s night and the stadium boxes.', BOLD),
  // Alemanha, Países Baixos, Escandinávia
  F('fring', 'Os Anéis de Berlim', 'The Berlin Rings', 'syndicate', 'berlin', 1898, 1934, 45, ['clubs', 'protection'],
    '"Clubes de lutadores" que mandam nos salões de baile e nos cabarés da cidade.', '"Wrestlers\' clubs" that run the city\'s ballrooms and cabarets.', COLD),
  F('fkiez', 'O Clã da Reeperbahn', 'The Reeperbahn Clan', 'gang', 'hamburg', 1960, 2100, 45, ['clubs', 'protection', 'violence'],
    'Donos dos porões do bairro do porto onde bandas estrangeiras tocam oito horas por noite.', 'Owners of the harbour-district cellars where foreign bands play eight hours a night.', BOLD),
  F('fpenose', 'A Penose do Porto', 'The Harbour Penose', 'syndicate', 'amsterdam', 1950, 2100, 45, ['clubs', 'laundering', 'bootleg'],
    'Crime organizado de Amsterdã: boates, contrabando pelo porto e prensagens sem selo.', 'Amsterdam organised crime: clubs, smuggling through the port and unlabelled pressings.', SLY),
  F('fnorr', 'A Irmandade do Norte', 'The Northern Brotherhood', 'gang', 'stockholm', 1980, 2100, 40, ['protection', 'violence', 'laundering'],
    'Motoqueiros que vendem "segurança" a festivais e casas de show escandinavas.', 'Bikers who sell "security" to Scandinavian festivals and venues.', BOLD),
  F('fhavn', 'Os do Porto Livre', 'The Free Port Crew', 'gang', 'copenhagen', 1975, 2100, 35, ['clubs', 'protection'],
    'Bando do porto de Copenhague que cobra pedágio das festas e dos clubes alternativos.', 'A Copenhagen harbour gang that charges tolls on parties and alternative clubs.', BOLD),
  // Espanha e Portugal
  F('frastro', 'Os do Rastro', 'The Rastro Crew', 'gang', 'madrid', 1900, 1975, 35, ['bootleg', 'protection'],
    'Vendedores da feira de Madri que copiam partituras, depois discos, e cobram dos cafés com música.', 'Madrid flea-market traders who copy sheet music, then records, and charge the music cafés.', SLY),
  F('fcosta', 'O Clã da Costa', 'The Coast Clan', 'syndicate', 'ibiza', 1975, 2100, 50, ['clubs', 'laundering'],
    'Dinheiro de fora lavado nas boates da ilha; quem toca no verão sabe de quem é a casa.', 'Foreign money laundered through the island\'s clubs; whoever plays in summer knows whose house it is.', SLY),
  F('fmouraria', 'Os da Mouraria', 'The Mouraria Crew', 'gang', 'lisbon', 1889, 2100, 30, ['clubs', 'protection'],
    'Os donos das tascas do bairro velho de Lisboa: quem canta fado lá paga a mesa deles.', 'The owners of old Lisbon\'s taverns: whoever sings fado there pays their table.', BOLD),
  // Leste da Europa e Grécia
  F('fodessa', 'Os de Odessa', 'The Odessa Mob', 'gang', 'odesa', 1889, 1940, 40, ['bootleg', 'protection', 'clubs'],
    'Contrabandistas do porto do Mar Negro, padrinhos das bandas de restaurante e dos cantores de rua.', 'Black Sea harbour smugglers, godfathers of restaurant bands and street singers.', BOLD),
  F('fvory', 'Os Ladrões da Lei', 'The Thieves-in-Law', 'syndicate', 'moscow', 1920, 1991, 50, ['bootleg', 'protection'],
    'Código dos presos: fitas de canções proibidas copiadas de mão em mão, e "teto" para quem toca nos restaurantes.', 'A prison code: tapes of banned songs copied hand to hand, and a "roof" for anyone who plays the restaurants.', COLD),
  F('fneva', 'A Bratva do Neva', 'The Neva Bratva', 'syndicate', 'st_petersburg', 1991, 2100, 55, ['clubs', 'protection', 'laundering'],
    'Nos anos 90, boates e gravadoras da cidade pagavam o "teto" a eles para abrir as portas.', 'In the 1990s the city\'s clubs and labels paid them the "roof" to open their doors.', COLD),
  F('fvistula', 'O Grupo do Vístula', 'The Vistula Group', 'gang', 'warsaw', 1990, 2100, 40, ['protection', 'clubs', 'laundering'],
    'Gangue dos subúrbios de Varsóvia que tomou as discotecas depois da queda do regime.', 'A Warsaw suburban gang that took over the discos after the regime fell.', BOLD),
  F('fpireu', 'Os Mangas do Pireu', 'The Piraeus Toughs', 'gang', 'athens', 1900, 1965, 35, ['clubs', 'protection'],
    'Valentões das tavernas do porto onde nasceu o rebetiko; o dono da mesa escolhe a música.', 'Toughs of the harbour taverns where rebetiko was born; whoever owns the table picks the song.', BOLD),
  F('fbabas', 'Os Babas de Istambul', 'The Istanbul Babas', 'syndicate', 'istanbul', 1950, 2100, 50, ['clubs', 'laundering', 'protection'],
    'Os "pais" da noite de Istambul: casas de música arabesk, cassinos e cobranças.', 'The "fathers" of Istanbul nights: arabesk music halls, casinos and collections.', COLD),
  // Ásia e Oceania
  F('fbund', 'A Irmandade do Bund', 'The Bund Brotherhood', 'syndicate', 'shanghai', 1900, 1949, 60, ['clubs', 'protection', 'laundering'],
    'Mandam nos salões de baile e nas orquestras de jazz da Xangai dos anos 30.', 'They run the ballrooms and jazz orchestras of 1930s Shanghai.', COLD),
  F('fbambu', 'A Sociedade do Bambu', 'The Bamboo Society', 'syndicate', 'taipei', 1956, 2100, 50, ['clubs', 'protection', 'tickets'],
    'Sociedade secreta de Taipé com dinheiro nas casas de karaokê e na promoção de shows.', 'A Taipei secret society with money in karaoke houses and concert promotion.', COLD),
  F('fbusan', 'Os Kkangpae de Busan', 'The Busan Kkangpae', 'gang', 'busan', 1950, 2100, 40, ['clubs', 'protection', 'tickets'],
    'Bando do porto que cobra das casas noturnas e dos cantores de trot que passam pela cidade.', 'A harbour gang that squeezes nightclubs and the trot singers passing through town.', BOLD),
  F('ftekiya', 'Os Tekiya de Asakusa', 'The Asakusa Tekiya', 'syndicate', 'tokyo', 1889, 1950, 40, ['tickets', 'protection'],
    'Mascates das feiras e teatros populares de Tóquio; quem monta palco paga a eles.', 'Peddlers of Tokyo\'s fairs and popular theatres; whoever puts up a stage pays them.', COLD),
  F('fbhai', 'Os Bhai de Bombaim', 'The Bombay Bhai', 'syndicate', 'mumbai', 1970, 2100, 60, ['bootleg', 'laundering', 'protection'],
    'O submundo que financia filmes e suas trilhas — e cobra quando o disco faz sucesso.', 'The underworld that bankrolls films and their soundtracks — and collects when the record hits.', COLD),
  F('ftondo', 'Os de Tondo', 'The Tondo Crew', 'gang', 'manila', 1950, 2100, 35, ['protection', 'clubs'],
    'Bando do porto de Manila que cobra das bandas de bar e das casas de show.', 'A Manila harbour gang that squeezes bar bands and music halls.', BOLD),
  F('fpreman', 'Os Preman do Porto', 'The Harbour Preman', 'gang', 'jakarta', 1965, 2100, 40, ['protection', 'tickets'],
    'Valentões que "organizam" os estacionamentos, a bilheteria e a segurança dos shows de dangdut.', 'Toughs who "organise" parking, the box office and security at dangdut shows.', BOLD),
  F('fcross', 'Os de Kings Cross', 'The Kings Cross Mob', 'syndicate', 'sydney', 1920, 2100, 50, ['clubs', 'protection', 'laundering'],
    'A noite de Sydney: boates, bares de jazz e depois casas de rock, todas com um sócio oculto.', 'Sydney\'s night: nightclubs, jazz bars and later rock venues, each with a silent partner.', SLY),
  F('fcarlton', 'Os Senhores de Carlton', 'The Carlton Lords', 'gang', 'melbourne', 1960, 2100, 40, ['clubs', 'violence'],
    'Guerra de bairro pela noite de Melbourne: portas de boate e "seguranças" de festival.', 'A turf war over Melbourne nights: club doors and festival "security".', BOLD),
  F('fmotosul', 'O Clube de Motoqueiros do Sul', 'The Southern Motorcycle Club', 'gang', 'auckland', 1970, 2100, 35, ['clubs', 'protection', 'violence'],
    'Motoqueiros que cuidam da porta dos pubs com música ao vivo — e de quem não paga.', 'Bikers who mind the door at live-music pubs — and anyone who doesn\'t pay.', BOLD),
  // América do Norte (Canadá) e do Sul, Caribe
  F('fportmtl', 'O Clã do Porto de Montreal', 'The Montreal Harbour Clan', 'mafia', 'montreal', 1920, 1990, 50, ['clubs', 'bootleg', 'laundering'],
    'Contrabando de bebida para os EUA na Lei Seca e, depois, os cabarés de jazz da cidade.', 'Liquor smuggled into the US during Prohibition and, later, the city\'s jazz cabarets.', COLD),
  F('fmotomtl', 'Os Motoqueiros do Rio', 'The River Bikers', 'gang', 'montreal', 1977, 2100, 50, ['clubs', 'protection', 'violence', 'laundering'],
    'Clube de motoqueiros que manda nos bares e na segurança dos shows de Quebec a Toronto.', 'A biker club that runs bars and show security from Quebec to Toronto.', BOLD),
  F('ftijuana', 'Os Contrabandistas de Tijuana', 'The Tijuana Smugglers', 'syndicate', 'tijuana', 1920, 1988, 45, ['clubs', 'laundering'],
    'Cassinos e cabarés da fronteira, onde os americanos vinham beber e ouvir orquestras na Lei Seca.', 'Border casinos and cabarets where Americans came to drink and hear orchestras during Prohibition.', SLY),
  F('fpacifico', 'A Nova Geração do Pacífico', 'The New Pacific Generation', 'cartel', 'guadalajara', 2010, 2100, 75, ['corridos', 'violence', 'laundering'],
    'Cartel novo que encomenda corridos "bélicos" e disputa os bailes com os antigos.', 'A new cartel that commissions "warlike" corridos and fights the old guard over the dances.', COLD),
  F('fvalle', 'Os do Norte do Vale', 'The Northern Valley Crew', 'cartel', 'cali', 1996, 2100, 60, ['laundering', 'violence', 'clubs'],
    'Herdeiros dos cartéis: dinheiro passando por boates de salsa e produtoras de shows.', 'Heirs to the cartels: money moving through salsa clubs and concert promoters.', COLD),
  F('fhavana', 'Os Senhores dos Cassinos', 'The Casino Lords', 'mafia', 'havana', 1933, 1959, 65, ['clubs', 'laundering', 'protection'],
    'Os cassinos e cabarés de Havana antes da revolução: orquestras, dinheiro de fora e silêncio.', 'Havana\'s casinos and cabarets before the revolution: orchestras, foreign money and silence.', SLY),
  F('frudeboy', 'Os Rude Boys de Trenchtown', 'The Trenchtown Rude Boys', 'gang', 'kingston', 1962, 1980, 40, ['violence', 'protection', 'clubs'],
    'Jovens das ruas de Kingston que "cuidam" dos bailes de sound system — e brigam pelos melhores discos.', 'Kingston street youths who "look after" the sound-system dances — and fight over the best records.', BOLD),
  F('fguarnicao', 'Os Donos da Guarnição', 'The Garrison Dons', 'gang', 'kingston', 2010, 2100, 45, ['clubs', 'protection', 'violence'],
    'Depois da grande operação, novos chefes de bairro decidem quem faz festa de rua e quem canta nela.', 'After the big operation, new neighbourhood bosses decide who throws street dances and who sings at them.', BOLD),
  F('fcaserio', 'Os do Caserío', 'The Projects Crew', 'gang', 'san_juan', 1980, 2100, 40, ['clubs', 'protection'],
    'Bando de um conjunto habitacional de San Juan; as primeiras fitas de reggaeton passavam pela mão deles.', 'A San Juan housing-project gang; the first reggaeton tapes went through their hands.', BOLD),
  F('fpran', 'Os do Pran', 'The Pran Crew', 'gang', 'caracas', 1990, 2100, 45, ['protection', 'violence'],
    'Chefes de presídio que mandam nos bairros de fora para dentro: festa só com autorização.', 'Prison bosses who run neighbourhoods from the inside out: no party without permission.', BOLD),
  F('fpolacas', 'Os Cafetões do Porto', 'The Harbour Pimps', 'syndicate', 'buenos_aires', 1889, 1935, 45, ['clubs', 'protection'],
    'Donos dos cabarés do porto onde o tango nasceu; a orquestra toca para quem paga a casa.', 'Owners of the harbour cabarets where tango was born; the band plays for whoever pays the house.', SLY),
  F('fbarra', 'A Barra do Bairro', 'The Neighbourhood Barra', 'gang', 'buenos_aires', 1960, 2100, 45, ['tickets', 'violence', 'protection'],
    'Torcida organizada que revende ingressos de estádio e cobra dos shows de rock "nacional".', 'An organised football firm that resells stadium tickets and squeezes "rock nacional" concerts.', BOLD),
  F('flapa', 'Os Malandros da Lapa', 'The Lapa Hustlers', 'gang', 'rio', 1900, 1950, 35, ['clubs', 'protection', 'violence'],
    'Navalha e chapéu de palha: os bambas da Lapa mandam nos cabarés e nas rodas de samba.', 'Razor and straw hat: the Lapa hustlers run the cabarets and the samba circles.', BOLD),
  // África e Oriente Médio
  F('flagoa', 'A Confraria da Lagoa', 'The Lagoon Brotherhood', 'syndicate', 'lagos', 1980, 2100, 50, ['laundering', 'protection', 'bootleg'],
    'Confraria nascida nos campi que virou rede de golpes e "proteção" na noite de Lagos.', 'A brotherhood born on campuses that turned into a network of scams and "protection" in Lagos nights.', COLD),
  F('falaba', 'Os Piratas do Mercado', 'The Market Pirates', 'syndicate', 'lagos', 1975, 2100, 40, ['bootleg'],
    'Fitas e CDs copiados aos milhares no grande mercado de eletrônicos; o artista vê o disco na rua antes do dinheiro.', 'Tapes and CDs copied by the thousand at the big electronics market; artists see the record on the street before the money.', SLY),
  F('fnumero', 'Os do Número do Cabo', 'The Cape Number Gang', 'gang', 'cape_town', 1960, 2100, 45, ['protection', 'violence', 'clubs'],
    'Gangue nascida nas prisões que manda nos bairros do Cabo e nas festas de fim de semana.', 'A prison-born gang that runs Cape neighbourhoods and the weekend parties.', BOLD),
  F('fmarabi', 'Os do Quintal Marabi', 'The Marabi Yard Gang', 'gang', 'johannesburg', 1920, 1960, 35, ['clubs', 'bootleg'],
    'Donos dos bares clandestinos dos bairros negros, onde o marabi e o jazz sul-africano tocam a noite toda.', 'Owners of the township shebeens where marabi and South African jazz play all night.', BOLD),
  F('fbaltagi', 'Os Baltagiya', 'The Baltagiya', 'gang', 'cairo', 1950, 2100, 40, ['protection', 'tickets'],
    'Valentões de aluguel que "organizam" os casamentos com orquestra e a porta das casas de shaabi.', 'Hired toughs who "organise" weddings with orchestras and the door of shaabi halls.', BOLD),
];

// ---------------------------------------------------------------- facções genéricas (os buracos que sobram)

export const FAC31_Y0 = 1889;
export const FAC31_Y1 = 2040;
/** As cidades de cada país (ordem da lista do jogo: a primeira é a principal). */
export function citiesByCountry31(): Record<string, string[]> {
  const by: Record<string, string[]> = {};
  for (const c of CITIES) { const a = countryOfCity(c.id); if (a) (by[a] ??= []).push(c.id); }
  return by;
}
const hash = (x: string): number => { let h = 2166136261; for (let i = 0; i < x.length; i++) h = Math.imul(h ^ x.charCodeAt(i), 16777619); return h >>> 0; };
const OLD: [string, string, OrgKind17, Racket17[], string, string][] = [
  ['Contrabandistas de {c}', 'The {c} Smugglers', 'syndicate', ['bootleg', 'clubs'], 'Contrabando pelo porto e pela estrada; donos dos cafés onde a orquestra toca.', 'Smuggling by port and road; owners of the cafés where the band plays.'],
  ['Os Valentões de {c}', 'The {c} Toughs', 'gang', ['protection', 'clubs'], 'Brigões das tavernas e dos bailes; cobram de quem monta palco no bairro.', 'Tavern and dance-hall brawlers; they charge whoever builds a stage in the district.'],
];
const NEW: [string, string, OrgKind17, Racket17[], string, string][] = [
  ['Os Donos da Noite de {c}', 'The {c} Night Bosses', 'syndicate', ['clubs', 'protection', 'laundering'], 'Sócios ocultos das boates e casas de show; o dinheiro do bar não é só do bar.', 'Silent partners in the clubs and venues; the bar money is not just the bar\'s.'],
  ['A Gangue do Mercado de {c}', 'The {c} Market Gang', 'gang', ['bootleg', 'protection', 'tickets'], 'Discos copiados na banca, ingressos revendidos na porta e "taxa" das barracas.', 'Copied records at the stall, tickets resold at the door and a "fee" from every stand.'],
  ['O Bando do Porto de {c}', 'The {c} Harbour Crew', 'gang', ['protection', 'violence', 'clubs'], 'Turma da zona portuária que vende "segurança" a quem faz festa.', 'A dockside crew that sells "security" to anyone throwing a party.'],
];
const genName = (t: [string, string, ...unknown[]], c: L): L => l(t[0].replace('{c}', c.pt), t[1].replace('{c}', c.en));

/** Facções que contam para a cobertura de um país (com sede fixa; as de cidade vazia nascem na base do jogador). */
export const fixedOrgs31 = (): OrgDef17[] => [...ORGS17, ...ORGS19.filter((x) => !ORGS17.some((y) => y.id === x.id)), ...STREET29, ...FAC31].filter((o) => !!o.city);

let GEN: OrgDef17[] | null = null;
/** Para cada país com cidade no jogo, uma facção genérica da época em cada buraco de anos sem facção (1889–2040). */
export function facGen31(): OrgDef17[] {
  if (GEN) return GEN;
  const by = citiesByCountry31();
  const fixed = fixedOrgs31();
  const out: OrgDef17[] = [];
  for (const a3 of Object.keys(by).sort()) {
    const mine = fixed.filter((o) => countryOfCity(o.city) === a3);
    const gaps: [number, number][] = [];
    let g0 = -1;
    for (let y = FAC31_Y0; y <= FAC31_Y1 + 1; y++) {
      const hole = y <= FAC31_Y1 && !mine.some((o) => o.from <= y && y <= o.to);
      if (hole && g0 < 0) g0 = y;
      if (!hole && g0 >= 0) { gaps.push([g0, y - 1]); g0 = -1; }
    }
    // buraco muito longo: velha guarda até 1959, nova geração depois (cada uma com a sua época)
    const split: [number, number][] = gaps.flatMap(([a, b]) => (a < 1950 && b > 1965 ? [[a, 1959], [1955, b]] as [number, number][] : [[a, b]]));
    split.forEach(([a, b], i) => {
      const city = by[a3][hash(`${a3}|${i}`) % Math.min(2, by[a3].length)];
      const cy = cityById[city];
      const pool = a < 1950 ? OLD : NEW;
      const t = pool[hash(`${a3}|${a}`) % pool.length];
      const power = 25 + (hash(`${a3}|p|${a}`) % 21);
      out.push({ id: `fg_${a3.toLowerCase()}${i ? i + 1 : ''}`, name: genName(t, cy?.name ?? l(city)), kind: t[2], city, from: a, to: b >= FAC31_Y1 ? 2100 : b, real: false, power,
        rackets: [...t[3]], desc: l(t[4], t[5]), f: t[2] === 'gang' ? BOLD : SLY });
    });
  }
  GEN = out;
  return out;
}

/** Todas as facções novas da R31 (escritas + genéricas). */
export const allFac31 = (): OrgDef17[] => [...FAC31, ...facGen31()];
/** O crime digital (sem fronteira depois da internet). */
export const DIGITAL31 = CYBER29;
