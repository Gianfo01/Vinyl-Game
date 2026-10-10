// Rodada 18 (regions18): Américas abertas em submercados (Brasil inteiro + circuitos; América Latina em quatro; América do Norte em dois).
import { l } from '../world';
import type { Sub18 } from './types';

export const AMERICAS18: Sub18[] = [
  {
    id: 'br', mk: 'br', name: l('Brasil', 'Brazil'), a3: ['BRA'], hub: 'sao_paulo', entry: 1,
    share: [[1920, 1], [2040, 1]], pp: [[1920, 0.1], [1960, 0.12], [1990, 0.15], [2020, 0.15], [2040, 0.2]], langs: ['pt'],
    taste: [[1920, { samba: 2.4, marchinha: 2.2, brazil: 2.2 }], [1960, { bossa: 2, jovem_guarda: 2.3, brazil: 2.2 }], [1975, { mpb: 2.4, sertanejo: 2.2, brazil: 2.2, rock: 0.9 }],
      [1990, { axe: 2.5, pagode: 2.4, sertanejo: 2.5, funk_carioca: 2, brazil: 2.2 }], [2010, { sertanejo_univ: 2.8, funk_carioca: 2.4, piseiro: 2.4, brega_funk: 2.2, brazil: 2.3, pop: 1 }]],
    plats: [
      { name: 'Programa do Chacrinha', alt: l('Programa de auditório', 'Variety show'), from: 1956, to: 1988, kind: 'tv', boost: 0.06, note: l('Auditório, buzina e jabá: quem toca lá vende.', 'Studio crowd, horn and payola: whoever plays there sells.') },
      { name: 'Trilha de novela (Som Livre)', alt: l('Trilha da novela das oito', 'Prime-time soap soundtrack'), from: 1969, kind: 'tv', boost: 0.08, note: l('Uma música na novela vale um ano de rádio.', 'A song in the soap is worth a year of radio.') },
      { name: 'Palco MP3', alt: l('Portal de MP3 de artistas independentes', 'Indie-artist MP3 portal'), from: 2000, kind: 'download', boost: 0.05, note: l('Download grátis: o forró e o sertanejo do interior circulam sem gravadora.', 'Free downloads: backcountry forró and sertanejo travel without a label.') },
      { name: 'Sua Música', alt: l('Portal de CDs promocionais', 'Promo-CD portal'), from: 2011, kind: 'download', boost: 0.05, note: l('CDs promocionais de vaquejada viram hits do piseiro.', 'Rodeo promo CDs turn into piseiro hits.') },
      { name: 'Kondzilla (YouTube)', alt: l('Canal de clipes de funk', 'Funk video channel'), from: 2012, kind: 'mobile', boost: 0.05, note: l('O maior canal musical do país é de funk.', 'The country\'s biggest music channel is funk.') },
    ],
    partners: [
      { name: 'Odeon', alt: l('Gravadora carioca', 'Rio record company'), from: 1920, to: 1990, adv: 6000, note: l('Casa de bossa e MPB.', 'Home of bossa and MPB.') },
      { name: 'Som Livre', alt: l('Gravadora da TV', 'TV network label'), from: 1969, adv: 15000, note: l('Põe sua faixa na novela.', 'Gets your track in the soap.') },
    ],
    bars: [],
    note: l('Mercado que ouve 70% de música nacional; o interior paga os maiores cachês.', 'A market where 70% of listening is domestic; the backcountry pays the biggest fees.'),
  },
  {
    id: 'mx', mk: 'latam', name: l('México e América Central', 'Mexico & Central America'), a3: ['MEX', 'GTM', 'HND', 'SLV', 'NIC', 'CRI', 'PAN', 'BLZ'], hub: 'mexico_city', entry: 1,
    share: [[1920, 0.35], [1980, 0.4], [2040, 0.38]], pp: [[1920, 0.1], [1980, 0.2], [2020, 0.2], [2040, 0.24]], langs: ['es'],
    taste: [[1920, { ranchera: 2.6, bolero: 2.2, latin: 2.2 }], [1960, { ranchera: 2.4, norteno: 2.2, bolero_ranchero: 2.4, latin: 2.2 }], [1990, { pop_latino: 2.2, norteno: 2.3, latin: 2.2, rock_latino: 1.8 }],
      [2018, { corridos_tumbados: 2.6, norteno: 2.4, reggaeton: 2.1, latin: 2.3, pop: 1 }]],
    plats: [
      { name: 'XEW "La Voz de la América Latina"', alt: l('Rádio-gigante da capital', 'Capital mega-radio'), from: 1930, to: 1970, kind: 'radio', boost: 0.06, note: l('A rádio que fez Agustín Lara e Pedro Infante.', 'The station that made Agustín Lara and Pedro Infante.') },
      { name: 'Televisa — Siempre en Domingo', alt: l('Domingo de auditório', 'Sunday variety show'), from: 1969, to: 1998, kind: 'tv', boost: 0.07, note: l('Raúl Velasco decidia carreiras no continente.', 'Raúl Velasco decided careers across the continent.') },
      { name: 'Palenques e bailes', alt: l('Circuito de palenques', 'Palenque circuit'), from: 1950, kind: 'store', boost: 0.04, note: l('Feiras regionais pagam mais que disco.', 'Regional fairs pay more than records.') },
    ],
    partners: [
      { name: 'Peerless', alt: l('Gravadora mexicana', 'Mexican label'), from: 1933, to: 1990, adv: 6000, note: l('Rancheras e boleros.', 'Rancheras and boleros.') },
      { name: 'Fonovisa', alt: l('Selo do regional mexicano', 'Regional Mexican label'), from: 1984, adv: 15000, note: l('Domina norteño e banda dos dois lados da fronteira.', 'Rules norteño and banda on both sides of the border.') },
    ],
    bars: [
      { id: 'mx_narco', kind: 'censor', from: 2010, hit: ['corridos_tumbados', 'norteno'], mult: 0.85, name: l('Veto a narcocorridos', 'Narcocorrido bans'), why: l('Estados como Chihuahua e Baja California proíbem corridos que exaltam cartéis em shows e rádios.', 'States such as Chihuahua and Baja California ban cartel-praising corridos at shows and on radio.') },
    ],
    note: l('Regional mexicano domina; a fronteira é um mercado só.', 'Regional Mexican rules; the border is one market.'),
  },
  {
    id: 'carib', mk: 'latam', name: l('Caribe (Jamaica, Cuba, Rep. Dominicana, Porto Rico)', 'Caribbean (Jamaica, Cuba, DR, Puerto Rico)'), a3: ['JAM', 'CUB', 'DOM', 'HTI', 'TTO', 'BHS', 'PRI', 'BRB'], hub: 'kingston', entry: 0.7,
    share: [[1920, 0.15], [1960, 0.14], [1990, 0.12], [2040, 0.12]], pp: [[1920, 0.08], [1960, 0.12], [2020, 0.15], [2040, 0.18]], langs: ['es', 'en', 'fr'],
    taste: [[1920, { son: 2.4, calypso: 2.2, caribbean: 2, latin: 2 }], [1960, { ska: 2.4, reggae: 2, merengue: 2.2, caribbean: 2.2, latin: 2 }],
      [1980, { dancehall: 2.4, reggae: 2.4, bachata: 2.2, salsa: 2.2, caribbean: 2.3 }], [2005, { reggaeton: 2.8, dancehall: 2.4, bachata: 2.3, latin_trap: 2.2, caribbean: 2.3 }]],
    plats: [
      { name: 'Sound systems (Kingston)', alt: l('Equipes de som de rua', 'Street sound systems'), from: 1950, kind: 'radio', boost: 0.06, note: l('Coxsone, Duke Reid, King Tubby: quem toca na equipe faz o hit.', 'Coxsone, Duke Reid, King Tubby: the sound system makes the hit.') },
      { name: 'Mixtapes de perreo (San Juan)', alt: l('Fitas do underground', 'Underground tapes'), from: 1992, to: 2008, kind: 'piracy', boost: 0.04, note: l('O reggaeton nasceu em fita pirata e foi caçado pela polícia em 1995.', 'Reggaeton was born on bootleg tapes and raided by police in 1995.') },
    ],
    partners: [
      { name: 'Studio One', alt: l('Estúdio-selo de Kingston', 'Kingston studio-label'), from: 1954, to: 1990, adv: 3000, note: l('A "Motown jamaicana".', 'The "Jamaican Motown".') },
      { name: 'VP Records', alt: l('Distribuidora caribenha', 'Caribbean distributor'), from: 1979, adv: 8000, note: l('Leva reggae e dancehall para Nova York e Londres.', 'Takes reggae and dancehall to New York and London.') },
    ],
    bars: [
      { id: 'cu_embargo', kind: 'ban', from: 1962, to: 2040, hit: [], foreign: true, mult: 0.85, name: l('Embargo a Cuba', 'Cuban embargo'), why: l('Selo de fora não pode pagar nem receber de Cuba; a música cubana sai por terceiros.', 'Foreign labels cannot pay or be paid by Cuba; Cuban music leaves via third parties.') },
    ],
    note: l('Ilhas pequenas que exportam gêneros inteiros: ska, reggae, salsa, bachata, reggaeton.', 'Small islands exporting whole genres: ska, reggae, salsa, bachata, reggaeton.'),
  },
  {
    id: 'andes', mk: 'latam', name: l('Colômbia, Venezuela e Andes', 'Colombia, Venezuela & the Andes'), a3: ['COL', 'VEN', 'ECU', 'PER', 'BOL'], hub: 'medellin', entry: 0.8,
    share: [[1920, 0.2], [1980, 0.22], [2040, 0.24]], pp: [[1920, 0.08], [1980, 0.12], [2020, 0.12], [2040, 0.15]], langs: ['es'],
    taste: [[1920, { cumbia: 2.2, latin: 2.1 }], [1960, { cumbia: 2.4, vallenato: 2.3, salsa: 2, latin: 2.2 }], [1990, { vallenato: 2.3, salsa: 2.2, chicha: 1.8, pop_latino: 2, latin: 2.2 }],
      [2010, { reggaeton: 2.7, champeta: 2, vallenato: 2.1, pop_latino: 2.2, latin: 2.3 }]],
    plats: [
      { name: 'Discos Fuentes', alt: l('Distribuição de cumbia', 'Cumbia distribution'), from: 1934, kind: 'store', boost: 0.03, note: l('Cumbia e porro para o continente.', 'Cumbia and porro for the continent.') },
      { name: 'Medellín urbano', alt: l('Polo urbano de Medellín', 'Medellín urban hub'), from: 2010, kind: 'mobile', boost: 0.06, note: l('J Balvin e Maluma tornam Medellín a capital do reggaeton.', 'J Balvin and Maluma make Medellín the reggaeton capital.') },
    ],
    partners: [{ name: 'Sonolux / Codiscos', alt: l('Gravadora de Medellín', 'Medellín label'), from: 1950, adv: 5000, note: l('Selo nacional colombiano.', 'National Colombian label.') }],
    bars: [{ id: 'ven_fx', kind: 'approval', from: 2003, foreign: true, mult: 0.85, name: l('Controle de câmbio (Venezuela)', 'Currency controls (Venezuela)'), why: l('Desde 2003, dinheiro de vendas fica preso no país.', 'Since 2003, sales money gets stuck in the country.') }],
    note: l('Fábrica de ritmos que viajam: cumbia, vallenato e o reggaeton colombiano.', 'A factory of travelling rhythms: cumbia, vallenato and Colombian reggaeton.'),
  },
  {
    id: 'cone', mk: 'latam', name: l('Cone Sul (Argentina, Chile, Uruguai, Paraguai)', 'Southern Cone (Argentina, Chile, Uruguay, Paraguay)'), a3: ['ARG', 'CHL', 'URY', 'PRY'], hub: 'buenos_aires', entry: 0.9,
    share: [[1920, 0.3], [1980, 0.24], [2040, 0.26]], pp: [[1920, 0.4], [1960, 0.3], [1990, 0.25], [2020, 0.2], [2040, 0.22]], langs: ['es'],
    taste: [[1920, { tango: 2.6, latin: 2, europe: 0.8 }], [1965, { nueva_cancion: 2, rock_latino: 1.6, tango: 2, latin: 2 }], [1985, { rock_latino: 2.4, pop_latino: 1.8, latin: 2, rock: 1.2 }],
      [2005, { cumbia_villera: 2.2, rock_latino: 2, reggaeton: 2.2, latin_trap: 2.2, latin: 2.1 }]],
    plats: [
      { name: 'Rádio Belgrano', alt: l('Rádio de Buenos Aires', 'Buenos Aires radio'), from: 1924, to: 1970, kind: 'radio', boost: 0.05, note: l('A era de ouro do tango no rádio.', 'Tango\'s radio golden age.') },
      { name: 'Festival de Viña del Mar', alt: l('Festival da costa chilena', 'Chilean coastal festival'), from: 1960, kind: 'tv', boost: 0.06, note: l('O "monstro" do público: aplauso ou vaia ao vivo para o continente.', 'The crowd "monster": live cheers or boos for the whole continent.') },
    ],
    partners: [{ name: 'Odeón Argentina', alt: l('Gravadora portenha', 'Buenos Aires label'), from: 1920, adv: 6000, note: l('Tango e rock nacional.', 'Tango and rock nacional.') }],
    bars: [],
    note: l('Mais rico no começo do século; o "rock nacional" virou resistência na ditadura.', 'Richer early in the century; "rock nacional" became resistance under the dictatorship.'),
  },
  {
    id: 'us', mk: 'na', name: l('Estados Unidos (mercado geral)', 'United States (general market)'), a3: ['USA', 'GRL'], hub: 'new_york', entry: 1.5,
    share: [[1920, 0.85], [1980, 0.82], [2020, 0.74], [2040, 0.7]], pp: [[1920, 1], [2040, 1]], langs: ['en'],
    taste: [],
    plats: [
      { name: 'Top 40 radio', alt: l('Rádio Top 40', 'Top 40 radio'), from: 1955, kind: 'radio', boost: 0.05, note: l('Quem entra no rodízio vende no país todo.', 'Getting into rotation sells nationwide.') },
      { name: 'MTV', alt: l('Canal de clipes', 'Music video channel'), from: 1981, to: 2008, kind: 'tv', boost: 0.06, note: l('Até 1983 quase não tocava artista negro.', 'Until 1983 it barely played Black artists.') },
      { name: 'Spotify RapCaviar', alt: l('Playlist de rap', 'Rap playlist'), from: 2015, kind: 'stream', boost: 0.05, note: l('A playlist que decidia o rap.', 'The playlist that decided rap.') },
    ],
    partners: [{ name: 'Distribuidora independente (ADA/RED)', alt: l('Distribuidora independente', 'Independent distributor'), from: 1960, adv: 20000, note: l('Leva o disco às lojas sem major.', 'Gets the record into stores without a major.') }],
    bars: [{ id: 'us_visa', kind: 'visa', from: 2001, foreign: true, mult: 0.9, name: l('Visto O-1/P-1 pós-2001', 'Post-2001 O-1/P-1 visa'), why: l('Depois de 2001, meses de espera e negativas cancelam turnês estrangeiras.', 'After 2001, months of waiting and denials cancel foreign tours.') }],
    note: l('O maior mercado do mundo e o mais caro de conquistar.', 'The world\'s biggest market and the costliest to win.'),
  },
  {
    id: 'latino', mk: 'na', name: l('Circuito latino dos EUA', 'US Latin circuit'), a3: ['USA'], hub: 'miami', entry: 0.8,
    share: [[1920, 0.03], [1970, 0.05], [2000, 0.1], [2020, 0.16], [2040, 0.2]], pp: [[1920, 0.6], [2040, 0.75]], langs: ['es', 'en'],
    taste: [[1920, { latin: 2.2, caribbean: 1.4 }], [1970, { salsa: 2.6, tejano: 2.2, latin: 2.3 }], [2000, { reggaeton: 2.4, pop_latino: 2.4, norteno: 2.3, latin: 2.4, caribbean: 1.6 }],
      [2017, { reggaeton: 2.8, latin_trap: 2.6, corridos_tumbados: 2.4, latin: 2.5, caribbean: 1.8 }]],
    plats: [
      { name: 'Fania (Nova York)', alt: l('Selo da salsa', 'Salsa label'), from: 1964, to: 1990, kind: 'store', boost: 0.04, note: l('A salsa nasce no Bronx.', 'Salsa is born in the Bronx.') },
      { name: 'Univision / Premio Lo Nuestro', alt: l('TV hispânica', 'Hispanic TV'), from: 1989, kind: 'tv', boost: 0.06, note: l('A TV em espanhol fala com 60 milhões.', 'Spanish-language TV speaks to 60 million.') },
    ],
    partners: [{ name: 'Sony Discos (Miami)', alt: l('Divisão latina de Miami', 'Miami Latin division'), from: 1980, adv: 20000, note: l('Miami: capital da indústria latina.', 'Miami: capital of the Latin industry.') }],
    bars: [],
    note: l('Um país dentro do país: diáspora mexicana, porto-riquenha, cubana e colombiana.', 'A country within the country: Mexican, Puerto Rican, Cuban and Colombian diaspora.'),
  },
  {
    id: 'ca', mk: 'na', name: l('Canadá', 'Canada'), a3: ['CAN'], hub: 'toronto', entry: 0.8,
    share: [[1920, 0.12], [2040, 0.1]], pp: [[1920, 0.85], [2040, 0.85]], langs: ['en', 'fr'],
    taste: [],
    plats: [{ name: 'MuchMusic', alt: l('Canal de clipes canadense', 'Canadian video channel'), from: 1984, to: 2010, kind: 'tv', boost: 0.04, note: l('Vitrine canadense.', 'Canadian showcase.') }],
    partners: [{ name: 'Distribuidora de Toronto', alt: l('Distribuidora de Toronto', 'Toronto distributor'), from: 1950, adv: 8000, note: l('Selo local cumpre a cota.', 'A local label meets the quota.') }],
    bars: [{ id: 'cancon', kind: 'quota', from: 1971, foreign: true, mult: 0.85, name: l('Cota CanCon (35% nacional)', 'CanCon quota (35% domestic)'), why: l('Desde 1971 as rádios tocam ao menos 30-35% de conteúdo canadense (sistema MAPL).', 'Since 1971 radio must play at least 30-35% Canadian content (MAPL system).') }],
    note: l('Rádio com cota nacional e Quebec francófono.', 'Radio with a domestic quota and French-speaking Quebec.'),
  },
];
