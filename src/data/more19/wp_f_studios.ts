// WP-F — estúdios reais nomeados (STUDIOS19 → catalog.STUDIOS; docs/db19.md §3.6). Cada estúdio traz salas (ids de studio12.ROOMS),
// equipamento padrão (ids de GEAR19: só vale a partir do lançamento do modelo) e as dimensões de quality18 que a casa favorece.
// O tipo Studio19 não tem campos para isso; o sidecar STUDIO_KIT19 (mesmo id) leva os três para a session19/studio12.
import { l } from '../world';
import type { FamilyId } from '../world';
import type { Dim18 } from '../../sim/sys/quality18';
import type { Studio19 } from './types';

export type RoomKind19 = 'live' | 'booth' | 'control' | 'wood';
export interface StudioKit19 { rooms: RoomKind19[]; gear: string[]; dims: Dim18[] }
const F: Record<string, FamilyId> = { bj: 'blues_jazz', cf: 'country_folk', rn: 'rnb', rk: 'rock', pp: 'pop', hh: 'hiphop', el: 'electronic', ca: 'caribbean', la: 'latin', br: 'brazil', af: 'africa', am: 'asia_me', eu: 'europe', sa: 'sacred' };
const R: Record<string, RoomKind19> = { l: 'live', b: 'booth', c: 'control', w: 'wood' };
/** [id, nome, cidade, famílias, de, até(0), prestígio, salas(l/b/c/w), gear, dimensões, nota pt, nota en, exata?] */
type Row = [string, string, string, string, number, number, number, string, string, string, string, string, boolean?];

const ROWS: Row[] = [
  // EUA
  ['sun_studio', 'Sun Studio', 'memphis', 'rk,rn,cf,bj', 1950, 0, 90, 'lw', 'shure_55,ampex_200,fender_champ', 'emo,imm,orig', 'Sala pequena, eco de fita e gente crua: onde o rock nasce.', 'Small room, tape slapback and raw players: where rock is born.'],
  ['stax_studio', 'Stax Studio', 'memphis', 'rn,rk', 1959, 0, 88, 'lc', 'fender_precision,hammond_b3,ampex_200', 'emo,coh,imm', 'Um cinema com piso inclinado: soul de banda de casa.', 'A converted cinema with a sloped floor: house-band soul.'],
  ['hitsville', 'Hitsville U.S.A. (Studio A)', 'detroit', 'rn,pp', 1959, 0, 92, 'lc', 'fender_precision,ampex_200,emt_140', 'acc,sgl,coh', 'A "fábrica de hits": banda fixa, câmara de eco no porão.', 'The hit factory: house band, echo chamber in the basement.'],
  ['chess_studio', 'Chess Studios', 'chicago', 'bj,rn,rk', 1957, 0, 88, 'lc', 'shure_55,fender_bassman,ampex_200', 'emo,orig,dur', 'Blues elétrico de Chicago, ao vivo na sala.', 'Chicago electric blues, live in the room.'],
  ['fame_studios', 'FAME Studios', 'muscle_shoals', 'rn,rk', 1961, 0, 90, 'lc', 'fender_precision,wurlitzer_140b,hammond_b3', 'emo,coh,imm', 'Banda de Muscle Shoals: soul sulista de primeira.', 'The Muscle Shoals rhythm section: first-rate Southern soul.'],
  ['muscle_shoals_sound', 'Muscle Shoals Sound Studio', 'muscle_shoals', 'rn,rk', 1969, 0, 89, 'lc', 'fender_precision,fender_rhodes,ampex_200', 'emo,coh', 'Os "Swampers" montam a própria casa.', 'The Swampers build their own house.'],
  ['rca_studio_b', 'RCA Studio B', 'nashville', 'cf,pp', 1957, 1977, 88, 'lc', 'neumann_u47,ampex_200,martin_d28', 'coh,emo,sgl', 'O "Nashville Sound": músicos de estúdio e arranjo enxuto.', 'The "Nashville Sound": session players and lean arrangements.'],
  ['capitol_studios', 'Capitol Studios', 'los_angeles', 'pp,bj', 1956, 0, 93, 'lbc', 'neumann_u47,ampex_200,emt_140', 'tech,acc,dur', 'Câmaras de eco subterrâneas e cordas de cinema.', 'Underground echo chambers and film-grade strings.'],
  ['gold_star', 'Gold Star Studios', 'los_angeles', 'pp,rk', 1950, 1984, 90, 'lc', 'emt_140,ampex_200,neumann_u47', 'imm,sgl,orig', 'Sala apertada, eco denso: a "parede de som".', 'Cramped room, dense echo: the Wall of Sound.'],
  ['sound_city', 'Sound City Studios', 'los_angeles', 'rk', 1969, 2011, 86, 'lc', 'neve_1073,studer_a80,shure_sm57', 'imm,emo,tech', 'Console Neve e sala seca: bateria de arena.', 'A Neve console and a dry room: arena-size drums.'],
  ['sunset_sound', 'Sunset Sound', 'los_angeles', 'rk,pp', 1958, 0, 90, 'lbc', 'neumann_u67,emt_140,studer_a80', 'tech,emo,dur', 'Salas pequenas com som grande.', 'Small rooms with a big sound.'],
  ['electric_lady', 'Electric Lady Studios', 'new_york', 'rk,rn,hh', 1970, 0, 92, 'lc', 'studer_a80,neve_1073,fender_stratocaster', 'orig,emo,tech', 'Feito para músicos: curvas, luzes e acústica sem ângulos retos.', 'Built for musicians: curves, lights and no right angles.'],
  ['record_plant_ny', 'Record Plant (Nova York)', 'new_york', 'rk,pp', 1968, 0, 88, 'lc', 'neve_1073,studer_a80,neumann_u87', 'imm,tech,coh', 'Estúdio de sala quente e equipe jovem.', 'Warm-room studio with a young crew.'],
  ['record_plant_la', 'Record Plant (Los Angeles)', 'los_angeles', 'rk,pp', 1969, 0, 89, 'lwc', 'neve_1073,studer_a80,shure_sm57', 'imm,emo,tech', 'Quarto-estúdio: vida e disco no mesmo lugar.', 'Studio-as-hangout: life and record in one place.'],
  ['sigma_sound', 'Sigma Sound Studios', 'philadelphia', 'rn,pp', 1968, 0, 88, 'lc', 'fender_precision,fender_rhodes,emt_140', 'acc,coh,sgl', 'Cordas orquestrais e ritmo de disco: o Philly Sound.', 'Orchestral strings and dance rhythm: the Philly Sound.'],
  ['criteria', 'Criteria Studios', 'miami', 'rk,rn,pp', 1958, 0, 88, 'lc', 'neve_1073,studer_a80,hammond_b3', 'coh,imm,emo', 'Sala enorme à beira-mar: rock, soul e disco.', 'A huge room by the sea: rock, soul and disco.'],
  ['power_station', 'Power Station', 'new_york', 'rk,pp', 1977, 1995, 90, 'lc', 'ssl_4000,studer_a800,shure_sm57', 'imm,tech,sgl', 'Sala de bateria famosa: o rock de arena dos anos 80.', 'Famous drum room: 80s arena rock.'],
  ['avatar_studios', 'Avatar Studios', 'new_york', 'rk,pp,hh,bj', 1996, 0, 86, 'lbc', 'ssl_9000j,pro_tools,neumann_u87', 'tech,coh,dur', 'A antiga Power Station reaberta: mesa SSL e salas grandes.', 'The old Power Station reborn: SSL desk and big rooms.', false],
  ['columbia_30th', 'Columbia 30th Street Studio', 'new_york', 'bj,pp', 1949, 1981, 90, 'l', 'neumann_u47,ampex_200,steinway_model_d', 'dur,emo,coh', 'Uma igreja convertida: reverberação natural de catedral.', 'A converted church: natural cathedral reverb.'],
  ['van_gelder', 'Van Gelder Studio', 'new_york', 'bj', 1959, 0, 92, 'l', 'neumann_u47,ampex_200,steinway_model_d', 'dur,emo,coh', 'Teto abobadado e piano afinado: o som do jazz da Blue Note.', 'Vaulted ceiling and a tuned piano: the Blue Note jazz sound.'],
  ['hit_factory', 'The Hit Factory', 'new_york', 'pp,rn,hh', 1969, 0, 87, 'lbc', 'ssl_4000,studer_a800,neumann_u87', 'acc,sgl,tech', 'Hits de pop e R&B em linha de montagem.', 'Pop and R&B hits on an assembly line.'],
  ['wally_heider', 'Wally Heider Studios', 'san_francisco', 'rk', 1969, 0, 84, 'lw', 'neve_1073,ampex_200,neumann_u67', 'emo,orig,coh', 'O som da Bay Area: ao vivo e psicodélico.', 'The Bay Area sound: live and psychedelic.', false],
  // Reino Unido e Irlanda
  ['abbey_road', 'Abbey Road Studios', 'london', 'rk,pp,sa', 1931, 0, 99, 'lbcw', 'emi_redd37,neumann_u47,ampex_200', 'tech,coh,dur', 'O Studio Two e a câmara de eco: o estúdio mais famoso do mundo.', 'Studio Two and the echo chamber: the most famous studio in the world.'],
  ['olympic_studios', 'Olympic Studios', 'london', 'rk', 1957, 2009, 90, 'lc', 'neve_1073,neumann_u67,fender_stratocaster', 'imm,emo,orig', 'Estúdio Um enorme, rock de britânicos em alta.', 'A huge Studio One, the British rock heavyweights.'],
  ['trident', 'Trident Studios', 'london', 'rk,pp', 1968, 1981, 88, 'lc', 'trident_a_range,neumann_u67,steinway_model_d', 'tech,orig,imm', 'Console próprio, piano famoso, glam e prog.', 'Home-built desk, a famous piano, glam and prog.', false],
  ['air_london', 'AIR Studios', 'london', 'pp,rk', 1969, 0, 88, 'lbc', 'neve_1073,ssl_4000,steinway_model_d', 'tech,coh,sgl', 'George Martin sai da EMI e monta a sua casa.', 'George Martin leaves EMI and builds his own house.'],
  ['rockfield', 'Rockfield Studios', 'bristol', 'rk', 1963, 0, 87, 'wl', 'neve_1073,gibson_les_paul,vox_ac30', 'emo,orig,imm', 'Fazenda no País de Gales: o primeiro estúdio residencial.', 'A Welsh farm: the first residential studio.'],
  ['strawberry', 'Strawberry Studios', 'manchester', 'rk,pp', 1967, 1993, 82, 'lc', 'ampex_200,neumann_u67,fender_jazz_bass', 'acc,coh', 'O estúdio de Stockport: pop inglês de interior.', 'The Stockport studio: provincial English pop.', false],
  ['real_world', 'Real World Studios', 'bristol', 'rk,pp,af', 1988, 0, 85, 'lw', 'ssl_4000,kora,talking_drum', 'orig,emo,dur', 'Rio, salas de madeira e músicos do mundo todo.', 'A river, wooden rooms and musicians from everywhere.'],
  ['windmill_lane', 'Windmill Lane Studios', 'dublin', 'rk', 1978, 0, 85, 'lc', 'ssl_4000,lexicon_224,vox_ac30', 'imm,orig,tech', 'Dublin entra no mapa: o som amplo do pós-punk irlandês.', 'Dublin hits the map: the wide sound of Irish post-punk.'],
  ['sarm_west', 'Sarm West Studios', 'london', 'pp,rk', 1975, 0, 87, 'lbc', 'ssl_4000,linn_lm1,fairlight_cmi', 'sgl,acc,tech', 'Estúdio do pop dos anos 80 e dos "supergrupos de caridade".', 'Home of 80s pop and charity supergroups.', false],
  // Caribe
  ['studio_one', 'Studio One', 'kingston', 'ca', 1963, 0, 94, 'lc', 'ampex_200,fender_precision,hammond_b3', 'orig,coh,dur', 'A "Motown da Jamaica": ska, rocksteady e reggae em tempo recorde.', 'Jamaica\'s Motown: ska, rocksteady and reggae in record time.'],
  ['black_ark', 'Black Ark', 'kingston', 'ca', 1973, 1979, 85, 'w', 'teac_a3340,roland_re201,echoplex_ep1', 'orig,emo', 'Quintal convertido, 4 pistas e muita fita: dub sem igual.', 'A converted backyard, four tracks and lots of tape: peerless dub.'],
  ['dynamic_sounds', 'Dynamic Sounds', 'kingston', 'ca,rn', 1966, 0, 86, 'lc', 'ampex_200,hammond_b3,fender_precision', 'tech,coh', 'O estúdio mais equipado da ilha.', 'The best-equipped studio on the island.', false],
  ['tuff_gong', 'Tuff Gong Studios', 'kingston', 'ca', 1976, 0, 90, 'lc', 'studer_a80,fender_precision,roland_re201', 'emo,dur,orig', 'Casa de Bob Marley: gravação, prensagem e distribuição no mesmo lote.', 'Bob Marley\'s house: recording, pressing and distribution on one lot.', false],
  ['compass_point', 'Compass Point Studios', 'nassau', 'ca,rk,el', 1977, 2010, 90, 'lwc', 'studer_a800,roland_re201,linn_lm1', 'orig,imm,tech', 'Fuga tropical de Chris Blackwell: dub, funk e rock num só lugar.', 'Chris Blackwell\'s tropical retreat: dub, funk and rock in one place.'],
  ['air_montserrat', 'AIR Studios Montserrat', 'pointe_a_pitre', 'rk,pp', 1979, 1989, 88, 'wl', 'ssl_4000,yamaha_dx7,fender_stratocaster', 'emo,tech,orig', 'Ilha vulcânica, estúdio com vista (Montserrat; cidade mais próxima do jogo).', 'A volcanic island with a view (Montserrat; nearest in-game city).'],
  // Europa
  ['hansa_berlin', 'Hansa Tonstudio', 'berlin', 'rk,el', 1973, 0, 90, 'l', 'roland_jupiter8,neve_1073,minimoog', 'orig,imm,emo', 'A "Hansa by the Wall": salão de baile à sombra do Muro.', '"Hansa by the Wall": a ballroom in the shadow of the Wall.'],
  ['conny_studio', 'Conny\'s Studio', 'cologne', 'el,rk', 1971, 1987, 86, 'lw', 'revox_a77,moog_modular,studer_a80', 'orig,coh', 'Conny Plank e o krautrock: estúdio como instrumento.', 'Conny Plank and krautrock: the studio as instrument.'],
  ['polar_studios', 'Polar Studios', 'stockholm', 'pp', 1978, 1985, 87, 'lbc', 'neve_1073,studer_a800,yamaha_cp70', 'sgl,acc,tech', 'Estúdio do ABBA: polimento de pop sueco.', 'ABBA\'s studio: Swedish pop polish.', false],
  ['cheiron', 'Cheiron Studios', 'stockholm', 'pp', 1992, 2000, 90, 'bc', 'cubase,akai_s900,yamaha_dx7', 'sgl,acc,imm', 'A fábrica sueca de refrões: produção pop de precisão.', 'The Swedish hook factory: precision pop production.', false],
  ['pathe_marconi', 'Pathé-Marconi (Boulogne)', 'paris', 'eu,pp', 1936, 0, 84, 'lc', 'neumann_u47,ampex_200,steinway_model_d', 'tech,dur', 'O grande estúdio da chanson.', 'The big studio of French chanson.', false],
  // Brasil e América Latina
  ['odeon_rio', 'Estúdios Odeon (Rio)', 'rio', 'br', 1927, 0, 85, 'lc', 'neumann_u47,ampex_200,viola_caipira', 'dur,coh,emo', 'A casa da bossa e do samba de disco.', 'The home of bossa and recorded samba.', false],
  ['eldorado_sp', 'Estúdio Eldorado', 'sao_paulo', 'br', 1975, 0, 80, 'lc', 'studer_a80,neve_1073,fender_rhodes', 'coh,tech', 'MPB e rock paulistano.', 'MPB and São Paulo rock.', false],
  ['transamerica_sp', 'Estúdio Transamérica', 'sao_paulo', 'br,pp', 1980, 0, 78, 'lc', 'ssl_4000,yamaha_dx7,linndrum', 'sgl,acc', 'Pop e rock brasileiro dos anos 80.', 'Brazilian pop and rock of the 80s.', false],
  ['egrem', 'EGREM (Estudios Areíto)', 'havana', 'la', 1964, 0, 88, 'lc', 'tres_cubano,ampex_200,neumann_u47', 'emo,dur,coh', 'Gravadora estatal cubana: son, trova e jazz latino.', 'The Cuban state label: son, trova and Latin jazz.'],
  ['discos_fuentes', 'Discos Fuentes', 'cartagena', 'la', 1934, 0, 80, 'lw', 'ampex_200,neumann_u47,sanfona', 'emo,imm,dur', 'A cumbia colombiana gravada em escala industrial.', 'Colombian cumbia recorded at industrial scale.'],
  // África e Ásia/Oceania
  ['gallo_studios', 'Gallo Studios', 'johannesburg', 'af', 1926, 0, 84, 'lc', 'ampex_200,fender_precision,neumann_u47', 'emo,dur', 'A gravadora sul-africana que registrou mbaqanga e jazz.', 'The South African label that recorded mbaqanga and jazz.', false],
  ['kalakuta_studio', 'Kalakuta (estúdio)', 'lagos', 'af', 1970, 0, 82, 'lw', 'fender_precision,hammond_b3,talking_drum', 'orig,emo', 'Estúdio e comunidade criativa do afrobeat (somente o estúdio).', 'Studio and creative commune of afrobeat (studio only).', false],
  ['victor_studio', 'Victor Studio (Tóquio)', 'tokyo', 'am', 1927, 0, 82, 'lc', 'neumann_u47,shamisen,steinway_model_d', 'tech,coh', 'Casa do kayokyoku e do enka.', 'Home of kayokyoku and enka.', false],
  ['sony_studio_tokyo', 'Sony Studio (Tóquio)', 'tokyo', 'am,pp', 1968, 0, 85, 'lbc', 'studer_a80,ssl_4000,yamaha_dx7', 'tech,sgl,acc', 'Pioneiro do digital: city pop e J-pop de precisão.', 'A digital pioneer: precision city pop and J-pop.', false],
  ['sm_studio', 'SM Studio', 'seoul', 'pp,am', 1995, 0, 80, 'bc', 'pro_tools,ssl_9000j,neumann_u87', 'sgl,acc,tech', 'Linha de produção de pop coreano.', 'The K-pop production line.', false],
  ['armstrong_melbourne', 'Armstrong Studios', 'melbourne', 'rk,pp', 1964, 0, 80, 'lc', 'neve_1073,studer_a80,vox_ac30', 'imm,emo', 'Rock australiano dos pubs ao disco.', 'Australian pub rock to record.', false],
  ['studio_301', 'EMI Studios 301', 'sydney', 'rk,pp', 1966, 0, 82, 'lc', 'ssl_4000,studer_a800,neumann_u87', 'tech,imm,sgl', 'O estúdio grande de Sydney.', 'Sydney\'s big studio.', false],
];

const mk = (r: Row): Studio19 => ({
  id: r[0], name: r[1], city: r[2], specialty: r[3].split(',').map((c) => F[c]), from: r[4], ...(r[5] ? { to: r[5] } : {}),
  prestige: r[6], note: l(r[10], r[11]), ...(r[12] === false ? { exact: false } : {}),
});
export const STUDIOS_F: Studio19[] = ROWS.map(mk);
export const STUDIO_KIT19: Record<string, StudioKit19> = Object.fromEntries(ROWS.map((r) => [r[0], { rooms: r[7].split('').map((c) => R[c]), gear: r[8].split(','), dims: r[9].split(',') as Dim18[] }]));
