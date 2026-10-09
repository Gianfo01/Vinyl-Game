// Bens e vida pessoal ampliada (rodada 8): o personagem compra coisas com o PRÓPRIO patrimônio (nunca o
// caixa do selo). Casas em outras cidades, carros e motos, instrumentos de uso pessoal, estúdio em casa,
// arte, guarda-roupa, joias, barcos e avião (por época). Cada bem tem manutenção mensal, valoriza ou
// deprecia (arte e imóveis oscilam), pode ser vendido e mexe com atributos, estresse, saúde, fama,
// traços e perks — e alguns liberam ações (festa no iate, sessão no estúdio caseiro, exposição, voo
// particular no mapa). Também: investimentos com crises reais (1929, 1987, 2000, 2008), equipe pessoal
// (assistente, chef, treinador, segurança, estilista, motorista, babá), fundação, cursos com diploma,
// rotina de saúde, aparições públicas, noites em clubes e palestras.

import { clamp, Rng } from '../../core/rng';
import { cityById, l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { growPerson } from '../people';
import { bumpPerks, registerPerkSource, type PerkEntry, type PerkValues } from '../perks';
import type { GameState } from '../types';
import { fmtL, money, notify, remember } from '../util';
import { addSignal } from '../worldgen';
import { energyLeft, life, playerAct, playerPerson, spendEnergy } from './life';
import { P } from './people/state';
import { gainXp, ownerOf, type OwnerAttr } from './people/owner';
import { grow } from './talent';
import { gainTrait } from './vices';

// ---------------------------------------------------------------- catálogo de bens

export type GoodCat = 'home' | 'vehicle' | 'gear' | 'studio' | 'art' | 'style' | 'jewelry' | 'boat' | 'plane' | 'collect';

export const CAT_NAMES: Record<GoodCat, L> = {
  home: l('Imóveis', 'Property'),
  vehicle: l('Carros e motos', 'Cars and bikes'),
  gear: l('Instrumentos', 'Instruments'),
  studio: l('Estúdio em casa', 'Home studio'),
  art: l('Arte', 'Art'),
  style: l('Estilo', 'Style'),
  jewelry: l('Joias e relógios', 'Jewelry and watches'),
  boat: l('Barcos', 'Boats'),
  plane: l('Aviões', 'Planes'),
  collect: l('Coleções', 'Collections'),
};

export type GoodUnlock = 'yachtParty' | 'homeSession' | 'artExhibit' | 'privateFlight';

export interface GoodDef {
  id: string;
  cat: GoodCat;
  name: L;
  desc: L;
  from: number;
  to?: number;
  /** dólares reais (convertidos pela época com money) */
  price: number;
  /** manutenção mensal (dólares reais) */
  upkeep: number;
  /** variação anual média do valor (−0,15 = deprecia 15% ao ano) */
  drift: number;
  /** volatilidade anual do valor */
  vol: number;
  city?: string;
  perks?: PerkValues;
  /** estresse a menos por mês */
  relief?: number;
  /** saúde por mês */
  health?: number;
  /** fama pessoal por mês */
  fame?: number;
  xp?: [OwnerAttr, number];
  /** habilidade musical do personagem por mês */
  skill?: ['comp' | 'instr' | 'voice' | 'prod' | 'lyr' | 'stage', number];
  /** traço que pode ser conquistado (chance anual) */
  trait?: string;
  unlock?: GoodUnlock;
  /** risco de acidente (veículos rápidos) */
  risky?: boolean;
  /** pode ser roubado sem segurança */
  stealable?: boolean;
}

const g = (d: GoodDef) => d;

export const GOODS: GoodDef[] = [
  // imóveis por cidade e época: presença local (público, sinais da cena, viagem mais barata)
  g({ id: 'beach_rio', cat: 'home', city: 'rio', name: l('Casa de praia no Rio', 'Beach house in Rio'), desc: l('Samba, mar e descanso. Alivia muito o estresse.', 'Samba, sea and rest. Relieves a lot of stress.'), from: 1925, price: 60000, upkeep: 250, drift: 0.04, vol: 0.06, relief: 4, health: 0.3 }),
  g({ id: 'flat_london', cat: 'home', city: 'london', name: l('Flat em Londres', 'London flat'), desc: l('Um pé na capital do pop britânico.', 'A foothold in the capital of British pop.'), from: 1920, price: 120000, upkeep: 450, drift: 0.05, vol: 0.06, relief: 1, perks: { offer: 0.01 } }),
  g({ id: 'apt_paris', cat: 'home', city: 'paris', name: l('Apartamento em Paris', 'Paris apartment'), desc: l('Cafés, museus e chanson: inspiração e prestígio.', 'Cafés, museums and chanson: inspiration and prestige.'), from: 1920, price: 95000, upkeep: 380, drift: 0.04, vol: 0.05, relief: 2, perks: { critics: 0.1 }, trait: 'intellectual' }),
  g({ id: 'farm_nashville', cat: 'home', city: 'nashville', name: l('Fazenda perto de Nashville', 'Farm near Nashville'), desc: l('Varanda, violão e compositores vizinhos.', 'A porch, a guitar and songwriter neighbours.'), from: 1945, price: 150000, upkeep: 500, drift: 0.03, vol: 0.05, relief: 3, xp: ['ear', 1] }),
  g({ id: 'house_la', cat: 'home', city: 'los_angeles', name: l('Casa em Laurel Canyon', 'Laurel Canyon house'), desc: l('Vizinhos famosos e festas no quintal.', 'Famous neighbours and backyard parties.'), from: 1962, price: 220000, upkeep: 700, drift: 0.05, vol: 0.08, relief: 2, fame: 0.15, trait: 'bohemian' }),
  g({ id: 'loft_ny', cat: 'home', city: 'new_york', name: l('Loft no SoHo, Nova York', 'SoHo loft, New York'), desc: l('Galerias, clubes e a indústria inteira a dez quarteirões.', 'Galleries, clubs and the whole industry ten blocks away.'), from: 1968, price: 280000, upkeep: 900, drift: 0.06, vol: 0.09, relief: 1, perks: { signals: 1 } }),
  g({ id: 'apt_tokyo', cat: 'home', city: 'tokyo', name: l('Apartamento em Tóquio', 'Tokyo apartment'), desc: l('Lojas de discos e tecnologia: o futuro primeiro.', 'Record shops and tech: the future first.'), from: 1965, price: 210000, upkeep: 650, drift: 0.04, vol: 0.12, relief: 1, perks: { scoutAccuracy: 0.02 } }),
  g({ id: 'villa_ibiza', cat: 'home', city: 'ibiza', name: l('Villa em Ibiza', 'Ibiza villa'), desc: l('DJs, sol e noites sem fim. Relaxa — e tenta.', 'DJs, sun and endless nights. Relaxing — and tempting.'), from: 1975, price: 320000, upkeep: 1000, drift: 0.05, vol: 0.08, relief: 3, health: -0.2, fame: 0.2, trait: 'bohemian' }),
  g({ id: 'apt_berlin', cat: 'home', city: 'berlin', name: l('Apartamento em Berlim', 'Berlin apartment'), desc: l('Clubes em fábricas e aluguel barato (por enquanto).', 'Clubs in factories and cheap rent (for now).'), from: 1990, price: 70000, upkeep: 250, drift: 0.07, vol: 0.06, relief: 1, xp: ['ear', 1] }),
  g({ id: 'house_lisbon', cat: 'home', city: 'lisbon', name: l('Casa em Lisboa', 'Lisbon house'), desc: l('Fado, luz e calma atlântica.', 'Fado, light and Atlantic calm.'), from: 1960, price: 90000, upkeep: 300, drift: 0.05, vol: 0.05, relief: 3 }),
  g({ id: 'flat_kingston', cat: 'home', city: 'kingston', name: l('Casa em Kingston', 'Kingston house'), desc: l('Sound systems na rua de trás.', 'Sound systems on the street behind.'), from: 1960, price: 45000, upkeep: 180, drift: 0.03, vol: 0.06, relief: 2, perks: { signals: 1 } }),
  g({ id: 'legacy_rentals', cat: 'home', name: l('Carteira de imóveis alugados', 'Rented property portfolio'), desc: l('Imóveis que você tinha como investimento (antigo fundo de aluguéis).', 'Property you held as an investment (the old rental fund).'), from: 9999, price: 100000, upkeep: 0, drift: 0.025, vol: 0.05 }),
  g({ id: 'chalet', cat: 'home', name: l('Chalé nas montanhas', 'Mountain chalet'), desc: l('Lareira, neve e silêncio. Ótimo para compor.', 'Fireplace, snow and silence. Great for writing.'), from: 1925, price: 85000, upkeep: 300, drift: 0.03, vol: 0.04, relief: 5, health: 0.3, skill: ['comp', 0.15] }),
  // veículos
  g({ id: 'car_family', cat: 'vehicle', name: l('Carro popular', 'Everyday car'), desc: l('Liberdade para ir e vir. Deprecia rápido.', 'Freedom to come and go. Depreciates fast.'), from: 1920, price: 3500, upkeep: 40, drift: -0.12, vol: 0.02, relief: 1 }),
  g({ id: 'motorcycle', cat: 'vehicle', name: l('Motocicleta', 'Motorcycle'), desc: l('Vento na cara e fama de rebelde. Cuidado na estrada.', 'Wind in your face and a rebel image. Careful on the road.'), from: 1925, price: 5000, upkeep: 50, drift: -0.1, vol: 0.03, relief: 3, trait: 'rebel', risky: true }),
  g({ id: 'car_classic', cat: 'vehicle', name: l('Conversível clássico', 'Classic convertible'), desc: l('Carro de cinema. Valoriza com os anos se bem cuidado.', 'A movie car. Gains value over the years if kept well.'), from: 1950, price: 35000, upkeep: 180, drift: 0.03, vol: 0.08, relief: 2, fame: 0.15 }),
  g({ id: 'limo', cat: 'vehicle', name: l('Limusine', 'Limousine'), desc: l('Chegar de limusine impressiona artistas e banqueiros.', 'Arriving by limo impresses artists and bankers.'), from: 1930, price: 90000, upkeep: 900, drift: -0.1, vol: 0.03, perks: { offer: 0.015 }, fame: 0.1 }),
  g({ id: 'car_sports', cat: 'vehicle', name: l('Esportivo italiano', 'Italian sports car'), desc: l('Vermelho, barulhento e caro. Fotos garantidas — e riscos.', 'Red, loud and pricey. Guaranteed photos — and risks.'), from: 1960, price: 140000, upkeep: 600, drift: -0.08, vol: 0.06, relief: 2, fame: 0.35, xp: ['charisma', 1], risky: true }),
  g({ id: 'tour_bus', cat: 'vehicle', name: l('Ônibus de turnê próprio', 'Your own tour bus'), desc: l('Você empresta aos seus artistas: estrada mais barata e confortável.', 'You lend it to your acts: cheaper, comfier road.'), from: 1955, price: 160000, upkeep: 900, drift: -0.09, vol: 0.02, perks: { showRevenue: 0.03, morale: 0.2 } }),
  g({ id: 'car_electric', cat: 'vehicle', name: l('Carro elétrico', 'Electric car'), desc: l('Silencioso e bem-visto pela imprensa.', 'Quiet and well regarded by the press.'), from: 2012, price: 60000, upkeep: 120, drift: -0.15, vol: 0.03, relief: 1, perks: { reputation: 0.5 } }),
  // instrumentos de uso pessoal
  g({ id: 'guitar_vintage', cat: 'gear', name: l('Guitarra vintage', 'Vintage guitar'), desc: l('Timbre lendário. Treina seus dedos e valoriza.', 'Legendary tone. Trains your fingers and gains value.'), from: 1952, price: 9000, upkeep: 15, drift: 0.06, vol: 0.1, skill: ['instr', 0.25] }),
  g({ id: 'piano_grand', cat: 'gear', name: l('Piano de cauda', 'Grand piano'), desc: l('Harmonia na sala de estar: compõe e educa o ouvido.', 'Harmony in the living room: writes songs and trains your ear.'), from: 1920, price: 28000, upkeep: 60, drift: 0.01, vol: 0.03, skill: ['comp', 0.25], xp: ['ear', 1] }),
  g({ id: 'violin_rare', cat: 'gear', name: l('Violino raro', 'Rare violin'), desc: l('Um instrumento de museu. Valoriza bem.', 'A museum piece. Appreciates well.'), from: 1920, price: 70000, upkeep: 40, drift: 0.07, vol: 0.05, xp: ['ear', 2], perks: { critics: 0.05 } }),
  g({ id: 'synth_modular', cat: 'gear', name: l('Sintetizador modular', 'Modular synthesizer'), desc: l('Cabos, osciladores e sons que ninguém ouviu.', 'Cables, oscillators and sounds nobody has heard.'), from: 1968, price: 16000, upkeep: 30, drift: -0.03, vol: 0.1, skill: ['prod', 0.25], trait: 'visionary' }),
  g({ id: 'turntables', cat: 'gear', name: l('Toca-discos de DJ', 'DJ turntables'), desc: l('Dois pratos e um mixer: você entende a pista.', 'Two decks and a mixer: you understand the dancefloor.'), from: 1975, price: 5000, upkeep: 20, drift: -0.05, vol: 0.05, skill: ['prod', 0.15], xp: ['ear', 1] }),
  // estúdio em casa
  g({ id: 'home_studio', cat: 'studio', name: l('Estúdio no porão', 'Basement studio'), desc: l('Gravador, microfones e um sofá. Libera sessões em casa.', 'Tape machine, mics and a sofa. Unlocks home sessions.'), from: 1955, price: 40000, upkeep: 200, drift: -0.05, vol: 0.03, perks: { songQ: 0.5 }, skill: ['prod', 0.2], unlock: 'homeSession' }),
  g({ id: 'pro_studio', cat: 'studio', name: l('Estúdio profissional em casa', 'Pro home studio'), desc: l('Sala tratada, console grande. Seus artistas adoram gravar aqui.', 'Treated room, big console. Your acts love recording here.'), from: 1975, price: 260000, upkeep: 1200, drift: -0.04, vol: 0.03, perks: { songQ: 1.2, critics: 0.15, morale: 0.2 }, skill: ['prod', 0.35], unlock: 'homeSession' }),
  // arte
  g({ id: 'art_prints', cat: 'art', name: l('Gravuras de artistas locais', 'Prints by local artists'), desc: l('Começo de coleção: barato e simpático.', 'A start of a collection: cheap and friendly.'), from: 1920, price: 2500, upkeep: 5, drift: 0.02, vol: 0.12, relief: 1, unlock: 'artExhibit' }),
  g({ id: 'art_modern', cat: 'art', name: l('Tela modernista', 'Modernist canvas'), desc: l('A crítica repara em quem tem bom gosto.', 'Critics notice people with good taste.'), from: 1920, price: 45000, upkeep: 40, drift: 0.06, vol: 0.25, perks: { critics: 0.15 }, trait: 'intellectual', unlock: 'artExhibit', stealable: true }),
  g({ id: 'art_pop', cat: 'art', name: l('Serigrafia pop art', 'Pop art silkscreen'), desc: l('Cores fortes, nome famoso, preço volátil.', 'Bold colours, a famous name, volatile price.'), from: 1965, price: 30000, upkeep: 30, drift: 0.08, vol: 0.3, fame: 0.1, unlock: 'artExhibit', stealable: true }),
  g({ id: 'art_street', cat: 'art', name: l('Obra de arte de rua', 'Street art piece'), desc: l('Do muro para a galeria: aposta de alto risco.', 'From the wall to the gallery: a high-risk bet.'), from: 1985, price: 18000, upkeep: 20, drift: 0.09, vol: 0.45, unlock: 'artExhibit' }),
  g({ id: 'art_digital', cat: 'art', name: l('Arte digital tokenizada', 'Tokenized digital art'), desc: l('Moda ou revolução? O mercado decide toda semana.', 'Fad or revolution? The market decides every week.'), from: 2021, price: 12000, upkeep: 0, drift: -0.12, vol: 0.8, unlock: 'artExhibit' }),
  // estilo
  g({ id: 'tailor', cat: 'style', name: l('Guarda-roupa sob medida', 'Tailored wardrobe'), desc: l('Terno certo, reunião certa.', 'The right suit, the right meeting.'), from: 1920, price: 6000, upkeep: 120, drift: -0.35, vol: 0.02, perks: { offer: 0.01 }, xp: ['negotiation', 1] }),
  g({ id: 'designer', cat: 'style', name: l('Peças de estilista', 'Designer pieces'), desc: l('Capa de revista e tapete vermelho.', 'Magazine covers and red carpets.'), from: 1950, price: 18000, upkeep: 350, drift: -0.3, vol: 0.05, fame: 0.25, xp: ['charisma', 1], perks: { appeal: 0.01 } }),
  g({ id: 'stage_look', cat: 'style', name: l('Figurino de palco icônico', 'Iconic stage outfit'), desc: l('Brilho, plumas ou couro: você vira imagem.', 'Sequins, feathers or leather: you become an image.'), from: 1960, price: 9000, upkeep: 60, drift: 0.02, vol: 0.15, skill: ['stage', 0.2], fame: 0.15 }),
  // joias
  g({ id: 'watch_gold', cat: 'jewelry', name: l('Relógio de ouro', 'Gold watch'), desc: l('Discreto, pesado, sinal de poder.', 'Discreet, heavy, a sign of power.'), from: 1920, price: 12000, upkeep: 10, drift: 0.03, vol: 0.05, xp: ['negotiation', 1], stealable: true }),
  g({ id: 'jewels', cat: 'jewelry', name: l('Joias de brilhante', 'Diamond jewelry'), desc: l('Flashes garantidos. Ladrões também gostam.', 'Guaranteed flashes. Thieves like them too.'), from: 1920, price: 45000, upkeep: 30, drift: 0.04, vol: 0.06, fame: 0.25, stealable: true }),
  g({ id: 'gold_chain', cat: 'jewelry', name: l('Corrente de ouro', 'Gold chain'), desc: l('Ícone da cultura hip hop.', 'An icon of hip hop culture.'), from: 1982, price: 15000, upkeep: 10, drift: 0.02, vol: 0.06, fame: 0.2, perks: { trust: 1 }, stealable: true }),
  // barcos
  g({ id: 'sailboat', cat: 'boat', name: l('Veleiro', 'Sailboat'), desc: l('Mar aberto e cabeça limpa.', 'Open sea and a clear head.'), from: 1920, price: 55000, upkeep: 450, drift: -0.06, vol: 0.03, relief: 4, health: 0.3 }),
  g({ id: 'yacht', cat: 'boat', name: l('Iate', 'Yacht'), desc: l('O lugar onde os grandes negócios acontecem. Libera festas no iate.', 'Where the big deals happen. Unlocks yacht parties.'), from: 1950, price: 1500000, upkeep: 11000, drift: -0.07, vol: 0.04, relief: 5, fame: 0.5, unlock: 'yachtParty' }),
  // aviões
  g({ id: 'prop_plane', cat: 'plane', name: l('Avião bimotor', 'Twin-prop plane'), desc: l('Voos particulares: viagens pelo mapa sem gastar tempo livre.', 'Private flights: map travel without spending free time.'), from: 1948, price: 420000, upkeep: 5500, drift: -0.08, vol: 0.03, fame: 0.2, unlock: 'privateFlight' }),
  g({ id: 'jet', cat: 'plane', name: l('Jatinho particular', 'Private jet'), desc: l('O mundo fica pequeno: mais tempo livre e viagens quase de graça.', 'The world gets small: more free time and near-free travel.'), from: 1965, price: 4200000, upkeep: 38000, drift: -0.07, vol: 0.03, fame: 0.5, perks: { energy: 1 }, unlock: 'privateFlight' }),
  // coleções
  g({ id: 'rare_records', cat: 'collect', name: l('Coleção de discos raros', 'Rare record collection'), desc: l('Prensagens originais: ouvido afiado e valor que sobe.', 'Original pressings: a sharp ear and rising value.'), from: 1920, price: 4000, upkeep: 10, drift: 0.05, vol: 0.08, xp: ['ear', 2], perks: { scoutAccuracy: 0.02 } }),
  g({ id: 'memorabilia', cat: 'collect', name: l('Memorabilia musical', 'Music memorabilia'), desc: l('Guitarras quebradas, letras manuscritas, ingressos históricos.', 'Smashed guitars, handwritten lyrics, historic tickets.'), from: 1970, price: 25000, upkeep: 20, drift: 0.06, vol: 0.2, fame: 0.1 }),
  g({ id: 'wine', cat: 'collect', name: l('Adega de vinhos', 'Wine cellar'), desc: l('Jantares de negócio memoráveis.', 'Memorable business dinners.'), from: 1920, price: 15000, upkeep: 100, drift: 0.05, vol: 0.06, relief: 1, health: -0.1, xp: ['negotiation', 1] }),
  g({ id: 'racehorse', cat: 'collect', name: l('Cavalo de corrida', 'Racehorse'), desc: l('Prestígio no hipódromo e prêmios (às vezes).', 'Prestige at the track and prizes (sometimes).'), from: 1920, price: 80000, upkeep: 2200, drift: -0.05, vol: 0.4, fame: 0.2 }),
];

export const goodById: Record<string, GoodDef> = Object.fromEntries(GOODS.map((x) => [x.id, x]));

// ---------------------------------------------------------------- equipe pessoal

export type PStaffId = 'assistant' | 'chef' | 'trainer' | 'bodyguard' | 'stylist' | 'driver' | 'nanny';

export const PSTAFF: Record<PStaffId, { name: L; desc: L; from: number; salary: number; perks?: PerkValues; relief?: number; health?: number; need?: (s: GameState) => L | null }> = {
  assistant: { name: l('Assistente pessoal', 'Personal assistant'), desc: l('Cuida da agenda: +1 de tempo livre por mês.', 'Runs your diary: +1 free time a month.'), from: 1920, salary: 2600, perks: { energy: 1 } },
  chef: { name: l('Chef particular', 'Private chef'), desc: l('Comida boa todo dia: saúde e humor.', 'Good food every day: health and mood.'), from: 1925, salary: 2200, relief: 2, health: 0.8 },
  trainer: { name: l('Personal trainer', 'Personal trainer'), desc: l('Treino em casa: saúde e fôlego de palco.', 'Training at home: health and stage stamina.'), from: 1960, salary: 1300, health: 1 },
  bodyguard: { name: l('Segurança', 'Bodyguard'), desc: l('Protege seus bens e afasta fãs e paparazzi.', 'Protects your belongings and keeps fans and paparazzi away.'), from: 1950, salary: 2400, relief: 1, need: (s) => (life(s).fame < 15 ? l('Só faz sentido com alguma fama pessoal (15+).', 'Only makes sense with some personal fame (15+).') : null) },
  stylist: { name: l('Estilista pessoal', 'Personal stylist'), desc: l('Imagem impecável: carisma e apelo.', 'Impeccable image: charisma and appeal.'), from: 1955, salary: 1600, perks: { appeal: 0.01 } },
  driver: { name: l('Motorista', 'Driver'), desc: l('Menos trânsito na sua cabeça.', 'Less traffic in your head.'), from: 1920, salary: 1200, relief: 2, need: (s) => (owned(s).some((x) => goodById[x.id]?.cat === 'vehicle') ? null : l('Precisa de um carro.', 'Needs a car.')) },
  nanny: { name: l('Babá', 'Nanny'), desc: l('Ajuda com os filhos: menos estresse e vínculo preservado.', 'Helps with the kids: less stress, bond preserved.'), from: 1920, salary: 1100, relief: 3, need: (s) => (ownerOf(s).kids.some((k) => s.year - k.born < 14) ? null : l('Precisa de filhos pequenos.', 'Needs young children.')) },
};

// ---------------------------------------------------------------- investimentos

export type InvId = 'savings' | 'stocks' | 'gold' | 'tech' | 'catalogs' | 'crypto';

export const INVEST: Record<InvId, { name: L; desc: L; from: number; drift: number; vol: number; rent?: number }> = {
  savings: { name: l('Títulos e poupança', 'Bonds and savings'), desc: l('Seguro e lento.', 'Safe and slow.'), from: 1920, drift: 0.03, vol: 0.01 },
  stocks: { name: l('Fundo de índice', 'Index fund'), desc: l('Uma cesta de ações: cresce no longo prazo e despenca nas crises. Ações avulsas de selos e plataformas ficam na aba Bolsa.', 'A basket of shares: grows in the long run and crashes in crises. Single shares of labels and platforms are in the Stock market tab.'), from: 1920, drift: 0.07, vol: 0.16 },
  gold: { name: l('Ouro', 'Gold'), desc: l('Sobe quando o mundo tem medo.', 'Rises when the world is afraid.'), from: 1920, drift: 0.02, vol: 0.12 },
  tech: { name: l('Fundo de tecnologia', 'Tech fund'), desc: l('Bolhas e foguetes.', 'Bubbles and rockets.'), from: 1980, drift: 0.11, vol: 0.32 },
  catalogs: { name: l('Fundo de catálogos musicais', 'Music catalog fund'), desc: l('Royalties de canções alheias.', 'Royalties from other people\'s songs.'), from: 2014, drift: 0.04, vol: 0.08, rent: 0.003 },
  crypto: { name: l('Criptomoedas', 'Cryptocurrencies'), desc: l('Montanha-russa. Só o que você aceita perder.', 'A roller coaster. Only what you can afford to lose.'), from: 2011, drift: 0.15, vol: 0.9 },
};

/** Quebra da bolsa por ano (variação anual extra; 0 fora das crises históricas). */
export function crashOf(year: number): number {
  return year >= 1929 && year <= 1932 ? -0.3 : year === 1937 ? -0.15 : year === 1973 || year === 1974 ? -0.18 : year === 1987 ? -0.2 : year === 2008 ? -0.35 : year === 2020 ? -0.08 : 0;
}

/** Choques históricos por ano (variação anual extra). */
function shock(id: InvId, year: number): number {
  const crash = crashOf(year);
  if (id === 'gold') return crash < 0 ? 0.12 : year === 1980 ? 0.3 : 0;
  if (id === 'savings') return 0;
  if (id === 'tech') return year >= 2000 && year <= 2002 ? -0.45 : crash * 1.1;
  if (id === 'crypto') return year === 2018 || year === 2022 ? -0.6 : year === 2017 || year === 2021 ? 0.8 : 0;
  if (id === 'catalogs') return crash * 0.2;
  return crash;
}

// ---------------------------------------------------------------- cursos e rotinas

export type CourseId = 'business' | 'law' | 'theory' | 'languages' | 'marketing' | 'engineering';

export const COURSES: Record<CourseId, { name: L; desc: L; from: number; sessions: number; cost: number; xp: OwnerAttr; perks: PerkValues; skill?: 'comp' | 'prod' | 'lyr' }> = {
  business: { name: l('Administração (MBA)', 'Business (MBA)'), desc: l('Equipe mais barata e selo mais valioso.', 'Cheaper staff and a more valuable label.'), from: 1920, sessions: 6, cost: 900, xp: 'management', perks: { staffCost: -0.03, valuation: 0.03 } },
  law: { name: l('Direito autoral', 'Copyright law'), desc: l('Contratos melhores: adiantamentos menores.', 'Better contracts: smaller advances.'), from: 1920, sessions: 6, cost: 800, xp: 'negotiation', perks: { advance: -0.03, offer: 0.01 } },
  theory: { name: l('Teoria musical', 'Music theory'), desc: l('Ouvido e composição: músicas um pouco melhores.', 'Ear and composition: slightly better songs.'), from: 1920, sessions: 5, cost: 450, xp: 'ear', perks: { songQ: 0.5 }, skill: 'comp' },
  languages: { name: l('Idiomas', 'Languages'), desc: l('Negocia com estrangeiros e entende cenas de fora.', 'Deals with foreigners and understands foreign scenes.'), from: 1920, sessions: 4, cost: 350, xp: 'charisma', perks: { offer: 0.015, scoutAccuracy: 0.02 } },
  marketing: { name: l('Marketing e mídia', 'Marketing and media'), desc: l('Lançamentos com mais apelo.', 'Releases with more appeal.'), from: 1950, sessions: 5, cost: 700, xp: 'charisma', perks: { appeal: 0.02 } },
  engineering: { name: l('Engenharia de som', 'Sound engineering'), desc: l('Gravações mais limpas e crítica atenta.', 'Cleaner recordings and attentive critics.'), from: 1950, sessions: 5, cost: 650, xp: 'ear', perks: { songQ: 0.4, critics: 0.1 }, skill: 'prod' },
};

export type RoutineId = 'none' | 'walks' | 'gym' | 'yoga' | 'sport' | 'spa';

export const ROUTINES: Record<RoutineId, { name: L; desc: L; from: number; cost: number; health: number; relief: number; trait?: string }> = {
  none: { name: l('Nenhuma', 'None'), desc: l('Nada em especial.', 'Nothing in particular.'), from: 1920, cost: 0, health: 0, relief: 0 },
  walks: { name: l('Caminhadas', 'Walks'), desc: l('Grátis e honesto.', 'Free and honest.'), from: 1920, cost: 0, health: 0.4, relief: 1 },
  gym: { name: l('Academia regular', 'Regular gym'), desc: l('Mensalidade e disciplina.', 'Membership and discipline.'), from: 1950, cost: 80, health: 1, relief: 2, trait: 'disciplined' },
  yoga: { name: l('Ioga e meditação', 'Yoga and meditation'), desc: l('Cabeça no lugar.', 'A settled mind.'), from: 1965, cost: 60, health: 0.5, relief: 4, trait: 'spiritual' },
  sport: { name: l('Esporte com amigos', 'Sport with friends'), desc: l('Saúde e contatos.', 'Health and contacts.'), from: 1920, cost: 50, health: 0.8, relief: 2 },
  spa: { name: l('Spa e massagens', 'Spa and massages'), desc: l('Caro e delicioso.', 'Pricey and lovely.'), from: 1930, cost: 600, health: 0.6, relief: 5 },
};

export type AppearId = 'radio' | 'magazine' | 'tv' | 'podcast' | 'gala';

export const APPEARANCES: Record<AppearId, { name: L; desc: L; from: number; to?: number; fameReq: number; fame: number; rep: number; fee: number }> = {
  radio: { name: l('Entrevista no rádio', 'Radio interview'), desc: l('Voz no ar para o país inteiro.', 'Your voice on air nationwide.'), from: 1922, fameReq: 0, fame: 1, rep: 0.5, fee: 0 },
  magazine: { name: l('Capa de revista', 'Magazine cover'), desc: l('Foto, perfil e fofoca.', 'Photo, profile and gossip.'), from: 1920, fameReq: 15, fame: 2, rep: 0.5, fee: 800 },
  tv: { name: l('Programa de TV', 'TV talk show'), desc: l('Milhões assistindo. Um deslize custa caro.', 'Millions watching. A slip costs dearly.'), from: 1950, fameReq: 10, fame: 3, rep: 1, fee: 1500 },
  podcast: { name: l('Podcast famoso', 'Popular podcast'), desc: l('Três horas de conversa franca.', 'Three hours of frank talk.'), from: 2006, fameReq: 5, fame: 2, rep: 0.5, fee: 500 },
  gala: { name: l('Gala beneficente', 'Charity gala'), desc: l('Black tie, doações e manchetes.', 'Black tie, donations and headlines.'), from: 1920, fameReq: 20, fame: 1.5, rep: 2, fee: -2000 },
};

export type FoundationFocus = 'schools' | 'health' | 'scene';
export const FOUNDATION: Record<FoundationFocus, { name: L; desc: L }> = {
  schools: { name: l('Música nas escolas', 'Music in schools'), desc: l('Reputação institucional e cena local mais forte.', 'Institutional reputation and a stronger local scene.') },
  health: { name: l('Saúde de músicos', 'Musicians\' health'), desc: l('Artistas confiam mais e o elenco fica mais animado.', 'Artists trust you more and the roster is happier.') },
  scene: { name: l('Fomento à cena', 'Scene fund'), desc: l('Mais sinais de talentos e cenas aquecidas na sua cidade.', 'More talent signals and hotter scenes in your city.') },
};

// ---------------------------------------------------------------- estado

/** `let`: alugado a terceiros (rende aluguel, mas você deixa de usar); `vac`: meses vagos restantes; `rented`: aluguel acumulado. */
export interface Owned { uid: string; id: string; week: number; paid: number; value: number; unpaid?: number; let?: boolean; vac?: number; rented?: number; since?: number }
export interface Goods8State {
  seq: number;
  owned: Owned[];
  staff: Partial<Record<PStaffId, number>>;
  inv: Partial<Record<InvId, { principal: number; value: number }>>;
  study: Partial<Record<CourseId, number>>;
  diplomas: CourseId[];
  routine: RoutineId;
  foundation?: { focus: FoundationFocus; since: number; given: number };
  /** semana até a qual o dono está "em evidência" (aparição pública) */
  spotlight: number;
  cd: Record<string, number>;
  log: { year: number; text: L; tone: 'good' | 'bad' | 'info' }[];
}

declare module '../ext4' { interface Ext4 { goods8: Goods8State } }
const fresh = (): Goods8State => ({ seq: 0, owned: [], staff: {}, inv: {}, study: {}, diplomas: [], routine: 'none', spotlight: 0, cd: {}, log: [] });
registerExt4('goods8', fresh);

export function goods(s: GameState): Goods8State {
  const x = s.x4 as unknown as { goods8?: Goods8State };
  x.goods8 ??= fresh();
  migrateInv(x.goods8);
  return x.goods8;
}

/** Saves antigos: "Imóveis para alugar" (que rendia sem imóvel nenhum) vira um bem alugado, pelo valor justo. */
function migrateInv(st: Goods8State): void {
  const inv = st.inv as Record<string, { principal: number; value: number } | undefined>;
  const old = inv.realestate;
  if (!old) return;
  delete inv.realestate;
  if (old.value <= 0) return;
  st.seq += 1;
  st.owned.push({ uid: `g${st.seq}`, id: 'legacy_rentals', week: 0, paid: old.principal, value: old.value, let: true });
}

export const owned = (s: GameState): Owned[] => goods(s).owned;
export const hasUnlock = (s: GameState, u: GoodUnlock): boolean => owned(s).some((x) => !x.let && goodById[x.id]?.unlock === u);
export const residences = (s: GameState): string[] => owned(s).filter((x) => !x.let).map((x) => goodById[x.id]?.city).filter((c): c is string => !!c);

function glog(s: GameState, text: L, tone: 'good' | 'bad' | 'info' = 'info', important = false): void {
  const st = goods(s);
  st.log.unshift({ year: s.year, text, tone });
  if (st.log.length > 30) st.log.length = 30;
  if (important) remember(s, 'goods', text, { important: true });
}

const noWealth = l('Patrimônio pessoal insuficiente (sai do seu bolso, não da empresa).', 'Not enough personal wealth (it comes out of your pocket, not the company).');

function pay(s: GameState, cents: number): L | null {
  const o = ownerOf(s);
  if (o.wealth < cents) return noWealth;
  o.wealth -= cents;
  return null;
}

/** Gasta tempo livre e dinheiro juntos (devolve o tempo se faltar dinheiro). */
function spendBoth(s: GameState, energy: number, cents: number): L | null {
  if (energy && energyLeft(s) < energy) return l('Sem tempo livre este mês. Volte no mês que vem.', 'No free time left this month. Come back next month.');
  if (ownerOf(s).wealth < cents) return noWealth;
  if (energy) spendEnergy(s, energy);
  ownerOf(s).wealth -= cents;
  return null;
}

// ---------------------------------------------------------------- comprar e vender

export function goodAvailable(s: GameState, d: GoodDef): boolean {
  return s.year >= d.from && (!d.to || s.year <= d.to);
}

export const goodPrice = (s: GameState, d: GoodDef): number => money(s, d.price);
export const goodUpkeep = (s: GameState, d: GoodDef): number => money(s, d.upkeep);

export function buyGood(s: GameState, id: string): L | null {
  const d = goodById[id];
  if (!d) return l('Item desconhecido.', 'Unknown item.');
  if (!goodAvailable(s, d)) return l('Ainda não existe nesta época.', 'Not available in this era.');
  const st = goods(s);
  if (st.owned.some((x) => x.id === id) && d.cat !== 'art' && d.cat !== 'collect') return l('Você já tem um desses.', 'You already own one.');
  if (st.owned.length >= 24) return l('Bens demais para cuidar: venda algo antes.', 'Too many things to look after: sell something first.');
  const price = goodPrice(s, d);
  const e = pay(s, price);
  if (e) return e;
  st.seq += 1;
  st.owned.push({ uid: `g${st.seq}`, id, week: s.week, paid: price, value: price });
  ownerOf(s).stress = clamp(ownerOf(s).stress - 3, 0, 100);
  bumpPerks();
  glog(s, fmtL(l('Comprou: {n}.', 'Bought: {n}.'), { n: d.name }), 'good', price >= money(s, 100000));
  return null;
}

/** Valor de venda: o valor atual menos 6% de corretagem/comissão. */
export function saleValue(o: Owned): number {
  return Math.round(o.value * 0.94);
}

export function sellGood(s: GameState, uid: string): L | null {
  const st = goods(s);
  const o = st.owned.find((x) => x.uid === uid);
  if (!o) return l('Item não encontrado.', 'Item not found.');
  const v = saleValue(o);
  ownerOf(s).wealth += v;
  st.owned = st.owned.filter((x) => x !== o);
  bumpPerks();
  const d = goodById[o.id];
  glog(s, fmtL(l('Vendeu {n}: {g}.', 'Sold {n}: {g}.'), { n: d?.name ?? l(o.id), g: v >= o.paid ? l('lucro', 'profit') : l('prejuízo', 'loss') }), v >= o.paid ? 'good' : 'info');
  return null;
}

export function upkeepTotal(s: GameState): number {
  let t0 = 0;
  for (const o of owned(s)) { const d = goodById[o.id]; if (d) t0 += goodUpkeep(s, d); }
  for (const k of Object.keys(goods(s).staff) as PStaffId[]) t0 += money(s, PSTAFF[k].salary);
  const r = ROUTINES[goods(s).routine];
  if (r) t0 += money(s, r.cost);
  if (goods(s).foundation) t0 += money(s, 1500);
  return t0;
}

export function netWorth(s: GameState): number {
  const st = goods(s);
  const b = (s.x4 as unknown as { bolsa10?: { pos: Record<string, { sh: number }>; q: Record<string, { p: number }> } }).bolsa10;
  const shares = b ? Object.keys(b.pos).reduce((a, id) => a + Math.round(b.pos[id].sh * (b.q[id]?.p ?? 0)), 0) : 0;
  return ownerOf(s).wealth + st.owned.reduce((a, o) => a + o.value, 0) + Object.values(st.inv).reduce((a, x) => a + (x?.value ?? 0), 0) + shares;
}

// ---------------------------------------------------------------- equipe pessoal

export function staffBlocker(s: GameState, id: PStaffId): L | null {
  const d = PSTAFF[id];
  if (!d) return l('Função inválida.', 'Invalid role.');
  if (s.year < d.from) return l('Ainda não existe nesta época.', 'Not available in this era.');
  if (goods(s).staff[id] !== undefined) return l('Já contratado.', 'Already hired.');
  const n = d.need?.(s);
  if (n) return n;
  if (ownerOf(s).wealth < money(s, d.salary) * 2) return l('Precisa de dois meses de salário no bolso.', 'You need two months of salary in your pocket.');
  return null;
}

export function hirePStaff(s: GameState, id: PStaffId): L | null {
  const e = staffBlocker(s, id);
  if (e) return e;
  ownerOf(s).wealth -= money(s, PSTAFF[id].salary);
  goods(s).staff[id] = s.week;
  bumpPerks();
  glog(s, fmtL(l('Contratou: {n}.', 'Hired: {n}.'), { n: PSTAFF[id].name }), 'good');
  return null;
}

export function firePStaff(s: GameState, id: PStaffId): L | null {
  if (goods(s).staff[id] === undefined) return l('Não está contratado.', 'Not hired.');
  delete goods(s).staff[id];
  bumpPerks();
  return null;
}

// ---------------------------------------------------------------- investimentos

export function invest(s: GameState, id: InvId, cents: number): L | null {
  const d = INVEST[id];
  if (!d || s.year < d.from) return l('Investimento indisponível nesta época.', 'Investment not available in this era.');
  if (cents <= 0) return l('Valor inválido.', 'Invalid amount.');
  const e = pay(s, cents);
  if (e) return e;
  const pos = (goods(s).inv[id] ??= { principal: 0, value: 0 });
  pos.principal += cents;
  pos.value += cents;
  return null;
}

/** Resgata uma fração (0..1) da posição; 1% de taxa. */
export function redeem(s: GameState, id: InvId, frac = 1): L | null {
  const pos = goods(s).inv[id];
  if (!pos || pos.value <= 0) return l('Nada investido aqui.', 'Nothing invested here.');
  const f = clamp(frac, 0, 1);
  const out = Math.round(pos.value * f);
  ownerOf(s).wealth += Math.round(out * 0.99);
  pos.value -= out;
  pos.principal = Math.round(pos.principal * (1 - f));
  if (pos.value <= 0 || f >= 1) delete goods(s).inv[id];
  return null;
}

// ---------------------------------------------------------------- cursos, rotina e ações pessoais

export function courseBlocker(s: GameState, id: CourseId): L | null {
  const c = COURSES[id];
  if (!c || s.year < c.from) return l('Curso indisponível nesta época.', 'Course not available in this era.');
  if (goods(s).diplomas.includes(id)) return l('Você já se formou nisso.', 'You already graduated in this.');
  return null;
}

export function study(s: GameState, id: CourseId): { text: L; done: boolean } | L {
  const e0 = courseBlocker(s, id);
  if (e0) return e0;
  const c = COURSES[id];
  const e = spendBoth(s, 1, money(s, c.cost));
  if (e) return e;
  const st = goods(s);
  const n = (st.study[id] = (st.study[id] ?? 0) + 1);
  gainXp(s, c.xp, 3);
  ownerOf(s).stress = clamp(ownerOf(s).stress + 2, 0, 100);
  const p = playerPerson(s);
  if (p && c.skill) growPerson(p, c.skill, 0.6);
  if (n >= c.sessions) {
    st.diplomas.push(id);
    delete st.study[id];
    gainXp(s, c.xp, 12);
    bumpPerks();
    const text = fmtL(l('Diploma: {c}!', 'Diploma: {c}!'), { c: c.name });
    glog(s, text, 'good', true);
    if (st.diplomas.length >= 3) gainTrait(s, 'intellectual');
    return { text, done: true };
  }
  return { text: fmtL(l('Aula de {c} ({n}/{t}).', '{c} class ({n}/{t}).'), { c: c.name, n, t: c.sessions }), done: false };
}

export function setRoutine(s: GameState, id: RoutineId): L | null {
  const r = ROUTINES[id];
  if (!r || s.year < r.from) return l('Rotina indisponível nesta época.', 'Routine not available in this era.');
  goods(s).routine = id;
  return null;
}

/** Aparição pública: fama, reputação e destaque por algumas semanas; risco de gafe (carisma ajuda). */
export function appear(s: GameState, r: Rng, id: AppearId): { text: L; ok: boolean } | L {
  const d = APPEARANCES[id];
  if (!d || s.year < d.from || (d.to && s.year > d.to)) return l('Indisponível nesta época.', 'Not available in this era.');
  const L0 = life(s);
  if (L0.fame < d.fameReq && s.player.reputation.institutional < 50 + d.fameReq) return fmtL(l('Precisa de mais fama pessoal ({n}+).', 'Needs more personal fame ({n}+).'), { n: d.fameReq });
  const st = goods(s);
  const key = `appear:${id}`;
  if (st.cd[key] && s.week - st.cd[key] < 8) return l('Cedo demais para repetir (espere dois meses).', 'Too soon to repeat (wait two months).');
  const cost = d.fee < 0 ? money(s, -d.fee) : 0;
  const e = spendBoth(s, 1, cost);
  if (e) return e;
  st.cd[key] = s.week;
  const o = ownerOf(s);
  const ch = (o.attrs.charisma - 50) / 50;
  const gaffe = r.chance(clamp(0.2 - ch * 0.15 - (st.staff.stylist !== undefined ? 0.04 : 0), 0.03, 0.4));
  if (d.fee > 0) o.wealth += money(s, d.fee);
  if (gaffe) {
    L0.fame = clamp(L0.fame + d.fame * 0.5, 0, 100);
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100);
    o.stress = clamp(o.stress + 6, 0, 100);
    const text = fmtL(l('{a}: você falou demais e virou meme. Pelo menos todo mundo comentou.', '{a}: you said too much and became a meme. At least everyone talked about it.'), { a: d.name });
    glog(s, text, 'bad');
    return { text, ok: false };
  }
  L0.fame = clamp(L0.fame + d.fame, 0, 100);
  s.player.reputation.institutional = clamp(s.player.reputation.institutional + d.rep, 0, 100);
  st.spotlight = Math.max(st.spotlight, s.week + 6);
  gainXp(s, 'charisma', 3);
  const act = playerAct(s);
  if (act) act.fans.casual += Math.round(150 + L0.fame * 30);
  const text = fmtL(l('{a}: boa repercussão. Você está em evidência.', '{a}: well received. You are in the spotlight.'), { a: d.name });
  glog(s, text, 'good');
  return { text, ok: true };
}

/** Noite num clube: networking, sinais de talentos locais e carisma. */
export function venueNight(s: GameState, r: Rng, clubId: string): { text: L } | L {
  const club = s.clubs.find((c) => c.id === clubId && !c.closed);
  if (!club) return l('Clube fechado ou inexistente.', 'Club closed or missing.');
  if (!canReachCity(s, club.city)) return l('Você precisa estar na cidade (viaje pelo mapa) ou ter casa/filial lá.', 'You need to be in the city (travel on the map) or have a home/branch there.');
  const st = goods(s);
  const key = `club:${club.id}`;
  if (st.cd[key] && s.week - st.cd[key] < 4) return l('Você já esteve lá este mês.', 'You were there this month.');
  const e = spendBoth(s, 1, money(s, 150 + club.prestige * 4));
  if (e) return e;
  st.cd[key] = s.week;
  gainXp(s, 'charisma', 2);
  gainXp(s, 'ear', 1);
  const o = ownerOf(s);
  o.stress = clamp(o.stress - 3, 0, 100);
  const locals = Object.values(s.acts).filter((a) => a.city === club.city && !a.owner && (a.status === 'active' || a.status === 'emerging') && !s.knowledge[a.id]);
  const pref = locals.filter((a) => a.genre === club.genre);
  const pool = pref.length ? pref : locals;
  if (pool.length) {
    const a = r.pick(pool);
    addSignal(s, r, a.id, 'network');
    const text = fmtL(l('Noite no {c}: {a} tocou e você anotou o nome.', 'Night at {c}: {a} played and you took note.'), { c: club.name, a: a.name });
    glog(s, text, 'good');
    return { text };
  }
  if (club.prestige > 60) s.player.reputation.artists = clamp(s.player.reputation.artists + 0.5, 0, 100);
  const text = fmtL(l('Noite no {c}: contatos novos.', 'Night at {c}: new contacts.'), { c: club.name });
  glog(s, text, 'info');
  return { text };
}

/** Palestra ou aula magna: cachê, reputação e gestão. */
export function lecture(s: GameState): { text: L } | L {
  const o = ownerOf(s);
  const age = s.year - o.born;
  if (age < 35) return l('Ninguém quer ouvir conselhos de quem tem menos de 35.', 'Nobody wants advice from someone under 35.');
  if (s.player.reputation.institutional < 40 && life(s).fame < 20) return l('Falta reputação ou fama para ser convidado.', 'Not enough reputation or fame to be invited.');
  const st = goods(s);
  if (st.cd.lecture && s.week - st.cd.lecture < 8) return l('Uma palestra a cada dois meses.', 'One lecture every two months.');
  const e = spendBoth(s, 1, 0);
  if (e) return e;
  st.cd.lecture = s.week;
  const fee = money(s, 600 + life(s).fame * 50 + s.player.reputation.institutional * 15);
  o.wealth += fee;
  gainXp(s, 'management', 3);
  gainXp(s, 'charisma', 1);
  s.player.reputation.artists = clamp(s.player.reputation.artists + 0.5, 0, 100);
  s.player.reputation.institutional = clamp(s.player.reputation.institutional + 0.5, 0, 100);
  const text = l('Palestra lotada: jovens querendo entrar na indústria.', 'Packed lecture: young people wanting into the industry.');
  glog(s, text, 'good');
  return { text };
}

// ---------------------------------------------------------------- ações liberadas por bens

export function yachtParty(s: GameState, r: Rng): { text: L } | L {
  if (!hasUnlock(s, 'yachtParty')) return l('Precisa de um iate.', 'Needs a yacht.');
  const st = goods(s);
  if (st.cd.yacht && s.week - st.cd.yacht < 12) return l('Uma festa no iate por trimestre.', 'One yacht party per quarter.');
  const e = spendBoth(s, 2, money(s, 4000));
  if (e) return e;
  st.cd.yacht = s.week;
  const L0 = life(s);
  L0.fame = clamp(L0.fame + 2, 0, 100);
  gainXp(s, 'negotiation', 3);
  gainXp(s, 'charisma', 3);
  s.player.reputation.artists = clamp(s.player.reputation.artists + 2, 0, 100);
  // artistas de rivais e independentes famosos aparecem no radar
  const stars = Object.values(s.acts).filter((a) => a.owner !== 'player' && !a.playerBand && a.status === 'active' && a.fame > 30 && !s.knowledge[a.id]).sort((a, b) => b.fame - a.fame).slice(0, 12);
  for (const a of r.shuffle(stars).slice(0, 2)) addSignal(s, r, a.id, 'network');
  if (r.chance(0.15)) {
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 3, 0, 100);
    const text = l('A festa no iate saiu nos tabloides — com fotos.', 'The yacht party made the tabloids — with photos.');
    glog(s, text, 'bad', true);
    return { text };
  }
  const text = l('Festa no iate: estrelas a bordo e conversas que valem contratos.', 'Yacht party: stars on board and talks worth contracts.');
  glog(s, text, 'good');
  return { text };
}

export function homeSession(s: GameState): { text: L } | L {
  if (!hasUnlock(s, 'homeSession')) return l('Precisa de um estúdio em casa.', 'Needs a home studio.');
  const e = spendBoth(s, 1, 0);
  if (e) return e;
  const p = playerPerson(s);
  if (p) {
    p.inspiration = clamp(p.inspiration + 10, 0, 100);
    growPerson(p, 'prod', 0.6);
    growPerson(p, 'comp', 0.4);
  }
  gainXp(s, 'ear', 2);
  ownerOf(s).stress = clamp(ownerOf(s).stress - 3, 0, 100);
  const text = l('Madrugada no estúdio de casa: ideias gravadas e cabeça leve.', 'Late night in the home studio: ideas recorded and a light head.');
  glog(s, text, 'good');
  return { text };
}

export function artExhibit(s: GameState): { text: L } | L {
  if (!hasUnlock(s, 'artExhibit')) return l('Precisa de obras de arte.', 'Needs artworks.');
  const st = goods(s);
  if (st.cd.exhibit && s.week - st.cd.exhibit < 52) return l('Uma exposição por ano.', 'One exhibition a year.');
  const e = spendBoth(s, 1, money(s, 1500));
  if (e) return e;
  st.cd.exhibit = s.week;
  const art = st.owned.filter((o) => goodById[o.id]?.cat === 'art');
  for (const o of art) o.value = Math.round(o.value * 1.05);
  const n = art.length;
  life(s).fame = clamp(life(s).fame + 1 + n * 0.3, 0, 100);
  s.player.reputation.institutional = clamp(s.player.reputation.institutional + 1 + n * 0.5, 0, 100);
  const text = fmtL(l('Exposição da sua coleção ({n} obras): a crítica elogiou e as obras valorizaram.', 'Exhibition of your collection ({n} works): critics praised it and the works gained value.'), { n });
  glog(s, text, 'good', true);
  return { text };
}

// ---------------------------------------------------------------- fundação

export function createFoundation(s: GameState, focus: FoundationFocus): L | null {
  const st = goods(s);
  if (st.foundation) return l('Você já tem uma fundação.', 'You already have a foundation.');
  const e = pay(s, money(s, 50000));
  if (e) return e;
  st.foundation = { focus, since: s.year, given: money(s, 50000) };
  s.player.reputation.institutional = clamp(s.player.reputation.institutional + 3, 0, 100);
  life(s).fame = clamp(life(s).fame + 2, 0, 100);
  bumpPerks();
  glog(s, fmtL(l('Nasce a Fundação {n}: {f}.', 'The {n} Foundation is born: {f}.'), { n: ownerOf(s).name.split(' ').slice(-1)[0], f: FOUNDATION[focus].name }), 'good', true);
  return null;
}

export function closeFoundation(s: GameState): L | null {
  const st = goods(s);
  if (!st.foundation) return l('Sem fundação.', 'No foundation.');
  st.foundation = undefined;
  s.player.reputation.institutional = clamp(s.player.reputation.institutional - 3, 0, 100);
  bumpPerks();
  return null;
}

// ---------------------------------------------------------------- presença (para o mapa)

/** O dono "alcança" uma cidade: sede, filial, casa lá ou viagem em curso (mapa). */
export function canReachCity(s: GameState, cityId: string): boolean {
  if (cityId === s.config.homeCity) return true;
  if (s.branches.some((b) => b.city === cityId)) return true;
  if (residences(s).includes(cityId)) return true;
  const here = (s.x4 as unknown as { mapx8?: { here?: { city: string; until: number } } }).mapx8?.here;
  return !!here && here.city === cityId && here.until >= s.week;
}

// ---------------------------------------------------------------- perks e modificadores

registerPerkSource('goods8', (s) => {
  const st = (s.x4 as unknown as { goods8?: Goods8State }).goods8;
  if (!st) return [];
  const out: PerkEntry[] = [];
  const seen = new Set<string>();
  for (const o of st.owned) {
    const d = goodById[o.id];
    if (!d?.perks || seen.has(d.id) || o.let) continue; // alugados não dão efeitos; repetidos (arte, coleções) não somam perks
    seen.add(d.id);
    out.push({ label: d.name, values: d.perks });
  }
  for (const k of Object.keys(st.staff) as PStaffId[]) if (PSTAFF[k]?.perks) out.push({ label: PSTAFF[k].name, values: PSTAFF[k].perks! });
  for (const c of st.diplomas) out.push({ label: COURSES[c].name, values: COURSES[c].perks });
  if (st.foundation?.focus === 'health') out.push({ label: FOUNDATION.health.name, values: { morale: 0.3, trust: 2 } });
  if (st.foundation?.focus === 'scene') out.push({ label: FOUNDATION.scene.name, values: { signals: 1 } });
  return out;
});

/** Em evidência (aparição pública): lançamentos do selo com um pouco mais de apelo. */
registerMod('appeal', 'goods8-spotlight', (s, value, ctx) => {
  const st = (s.x4 as unknown as { goods8?: Goods8State }).goods8;
  if (!st || st.spotlight < s.week || !ctx.release || ctx.release.owner !== 'player') return null;
  return { value: value * 1.03, label: l('Dono em evidência', 'Owner in the spotlight') };
});

/** Morar numa cidade (segunda casa): o público local te conhece. */
registerMod('cityDemand', 'goods8-home', (s, value, ctx) => {
  if (!ctx.cityId) return null;
  const st = (s.x4 as unknown as { goods8?: Goods8State }).goods8;
  if (!st?.owned.length || !residences(s).includes(ctx.cityId)) return null;
  return { value: value * 1.06, label: l('Você tem casa aqui', 'You have a home here') };
});

// ---------------------------------------------------------------- mês

export function goodsMonth(s: GameState, r: Rng): void {
  if (!P(s).owner) return;
  const st = goods(s);
  const o = ownerOf(s);
  const L0 = life(s);
  const p = playerPerson(s);
  let relief = 0;
  let health = 0;
  let fame = 0;
  // bens: manutenção, valor e efeitos
  for (const it of [...st.owned]) {
    const d = goodById[it.id];
    if (!d) { st.owned = st.owned.filter((x) => x !== it); continue; }
    const up = goodUpkeep(s, d);
    if (o.wealth >= up) { o.wealth -= up; it.unpaid = 0; }
    else {
      it.unpaid = (it.unpaid ?? 0) + 1;
      o.stress = clamp(o.stress + 2, 0, 100);
      it.value = Math.round(it.value * 0.97);
      if (it.unpaid >= 3) {
        const v = Math.round(it.value * 0.6);
        o.wealth += v;
        st.owned = st.owned.filter((x) => x !== it);
        const text = fmtL(l('Sem pagar a manutenção, {n} foi tomado e leiloado.', 'With upkeep unpaid, {n} was repossessed and auctioned.'), { n: d.name });
        notify(s, text, 'bad');
        glog(s, text, 'bad', true);
        continue;
      }
    }
    const m = d.drift / 12 + r.normal(0, d.vol / Math.sqrt(12));
    it.value = Math.max(Math.round(it.paid * 0.05), Math.round(it.value * (1 + clamp(m, -0.5, 0.6))));
    if (it.let) continue; // imóvel alugado: ninguém da casa usa
    relief += d.relief ?? 0;
    health += d.health ?? 0;
    fame += d.fame ?? 0;
    if (d.xp) gainXp(s, d.xp[0], d.xp[1]);
    if (p && d.skill) growPerson(p, d.skill[0], d.skill[1]);
  }
  // equipe pessoal
  for (const k of Object.keys(st.staff) as PStaffId[]) {
    const d = PSTAFF[k];
    const sal = money(s, d.salary);
    if (o.wealth >= sal) o.wealth -= sal;
    else {
      delete st.staff[k];
      bumpPerks();
      const text = fmtL(l('{n} pediu demissão: salário atrasado.', '{n} quit: salary not paid.'), { n: d.name });
      notify(s, text, 'bad');
      glog(s, text, 'bad');
      continue;
    }
    relief += d.relief ?? 0;
    health += d.health ?? 0;
    if (k === 'trainer' && p) grow(s, p, 'fitness', 0.4);
    if (k === 'stylist') gainXp(s, 'charisma', 2);
    if (k === 'nanny') o.kids.forEach((_, i) => { const kx = L0.kidsX[i]; if (kx) kx.bond = clamp(kx.bond + 0.4, 0, 100); });
  }
  // rotina de saúde
  const rt = ROUTINES[st.routine] ?? ROUTINES.none;
  if (rt.cost) {
    const c = money(s, rt.cost);
    if (o.wealth >= c) { o.wealth -= c; relief += rt.relief; health += rt.health; } else st.routine = 'none';
  } else { relief += rt.relief; health += rt.health; }
  if (rt.trait && s.month === 11 && r.chance(0.2)) gainTrait(s, rt.trait);
  // fundação
  if (st.foundation) {
    const c = money(s, 1500);
    if (o.wealth >= c) {
      o.wealth -= c;
      st.foundation.given += c;
      fame += 0.1;
      if (st.foundation.focus === 'schools') {
        s.player.reputation.institutional = clamp(s.player.reputation.institutional + 0.15, 0, 100);
        const key = Object.keys(s.scenes).filter((k) => k.startsWith(s.config.homeCity + ':')).sort((a, b) => s.scenes[b] - s.scenes[a])[0];
        if (key) s.scenes[key] += 0.05;
      } else if (st.foundation.focus === 'scene') {
        for (const k of Object.keys(s.scenes)) if (k.startsWith(s.config.homeCity + ':')) s.scenes[k] += 0.03;
      }
      if (s.month === 11 && r.chance(0.15)) gainTrait(s, 'generous');
    } else {
      notify(s, l('A fundação ficou sem repasses e suspendeu atividades.', 'The foundation ran out of funding and suspended activities.'), 'bad');
      st.foundation = undefined;
      bumpPerks();
    }
  }
  // efeitos somados, com teto (ninguém compra a paz infinita)
  o.stress = clamp(o.stress - Math.min(12, relief), 0, 100);
  o.health = clamp(o.health + clamp(health, -2, 3), 0, 100);
  L0.fame = clamp(L0.fame + Math.min(1.5, fame), 0, 100);
  // segundas casas: a cena local chega até você
  for (const c of residences(s)) {
    if (!r.chance(0.12)) continue;
    const locals = Object.values(s.acts).filter((a) => a.city === c && !a.owner && (a.status === 'active' || a.status === 'emerging') && !s.knowledge[a.id]);
    if (locals.length) addSignal(s, r, r.pick(locals).id, 'network');
  }
  // traços conquistados com o tempo (uma chance por ano)
  if (s.month === 6) for (const it of st.owned) { const d = goodById[it.id]; if (!it.let && d?.trait && r.chance(0.12)) gainTrait(s, d.trait); }
  // investimentos
  for (const id of Object.keys(st.inv) as InvId[]) {
    const pos = st.inv[id];
    const d = INVEST[id];
    if (!pos || !d) continue;
    const m = (d.drift + shock(id, s.year)) / 12 + r.normal(0, d.vol / Math.sqrt(12));
    pos.value = Math.max(0, Math.round(pos.value * (1 + clamp(m, -0.6, 0.8))));
    if (d.rent) o.wealth += Math.round(pos.value * d.rent);
  }
  // acasos
  events(s, r);
  if (Object.keys(st.cd).length > 40) for (const k of Object.keys(st.cd)) if (s.week - st.cd[k] > 60) delete st.cd[k];
}

function events(s: GameState, r: Rng): void {
  const st = goods(s);
  const o = ownerOf(s);
  const risky = st.owned.find((x) => goodById[x.id]?.risky);
  if (risky && r.chance(o.stress > 60 ? 0.03 : 0.01)) {
    risky.value = Math.round(risky.value * 0.4);
    o.health = clamp(o.health - 12, 0, 100);
    const text = fmtL(l('Acidente com {n}: hospital, susto e conserto caro.', 'Accident with {n}: hospital, a scare and a costly repair.'), { n: goodById[risky.id].name });
    notify(s, text, 'bad');
    glog(s, text, 'bad', true);
  }
  const loot = st.owned.filter((x) => goodById[x.id]?.stealable).sort((a, b) => b.value - a.value)[0];
  if (loot && st.staff.bodyguard === undefined && r.chance(0.012 + life(s).fame / 4000)) {
    st.owned = st.owned.filter((x) => x !== loot);
    bumpPerks();
    o.stress = clamp(o.stress + 8, 0, 100);
    const text = fmtL(l('Assalto! Levaram {n}. Um segurança teria ajudado.', 'Robbery! They took {n}. A bodyguard would have helped.'), { n: goodById[loot.id].name });
    notify(s, text, 'bad');
    glog(s, text, 'bad', true);
  }
  const art = st.owned.filter((x) => goodById[x.id]?.cat === 'art');
  if (art.length && r.chance(0.01 * art.length)) {
    const a = r.pick(art);
    const good = r.chance(0.6);
    a.value = Math.round(a.value * (good ? 2.2 : 0.25));
    const text = good
      ? fmtL(l('Especialistas reavaliaram {n}: vale muito mais do que você pagou!', 'Experts reappraised {n}: worth far more than you paid!'), { n: goodById[a.id].name })
      : fmtL(l('{n} era falsificação. O valor despencou.', '{n} was a forgery. The value collapsed.'), { n: goodById[a.id].name });
    notify(s, text, good ? 'good' : 'bad');
    glog(s, text, good ? 'good' : 'bad', true);
  }
  if (st.owned.some((x) => x.id === 'racehorse') && r.chance(0.06)) {
    const prize = money(s, 25000);
    o.wealth += prize;
    life(s).fame = clamp(life(s).fame + 1, 0, 100);
    glog(s, l('Seu cavalo venceu um grande prêmio!', 'Your horse won a major race!'), 'good', true);
  }
}

registerSimHook('month', 'goods8', (s, r) => goodsMonth(s, r));

/** Nome curto de cidade (para a interface). */
export const cityLabel = (id: string): L => cityById[id]?.name ?? l(id);

// ---------------------------------------------------------------- aluguel de imóveis (só de imóveis que você TEM)

/** Rendimento bruto anual do aluguel por cidade (fração do valor do imóvel). */
const RENT_YIELD: Record<string, number> = { new_york: 0.062, london: 0.058, tokyo: 0.048, paris: 0.054, berlin: 0.072, rio: 0.07, kingston: 0.09, los_angeles: 0.055, ibiza: 0.075, lisbon: 0.065, nashville: 0.05 };
const AGENCY = 0.08; // taxa da imobiliária sobre o aluguel

export const canLet = (d: GoodDef | undefined): boolean => !!d && d.cat === 'home';

/** Aluguel mensal cheio de um imóvel (centavos). */
export function rentOf(s: GameState, it: Owned): number {
  const d = goodById[it.id];
  if (!d) return 0;
  const y = (d.city ? RENT_YIELD[d.city] : undefined) ?? 0.05;
  const era = s.year >= 2012 && d.city && ['london', 'new_york', 'berlin', 'lisbon', 'paris'].includes(d.city) ? 1.12 : 1;
  return Math.round((it.value * y * era) / 12);
}

/** Põe o imóvel para alugar (ou volta a morar nele). Só vale para imóveis que você possui. */
export function setLet(s: GameState, uid: string, on: boolean): L | null {
  const it = goods(s).owned.find((x) => x.uid === uid);
  if (!it) return l('Você não possui este imóvel.', 'You do not own this property.');
  if (!canLet(goodById[it.id])) return l('Só imóveis residenciais podem ser alugados.', 'Only residential property can be let.');
  if (!!it.let === on) return null;
  it.let = on;
  it.vac = on ? 1 : 0;
  bumpPerks();
  glog(s, fmtL(on ? l('{n} foi colocado para alugar.', '{n} was put up for rent.') : l('Você voltou a usar {n}.', 'You moved back into {n}.'), { n: goodById[it.id].name }), 'info');
  return null;
}

/** Aluguéis do mês: vacância, inquilino que atrasa, reformas e taxa da imobiliária. */
function rentMonth(s: GameState): void {
  const st = goods(s);
  const r = Rng.fromSeed(`${s.config.seed}:rent10:${s.year}:${s.month}`);
  const o = ownerOf(s);
  for (const it of st.owned) {
    if (!it.let) continue;
    const d = goodById[it.id];
    if (!d) continue;
    const full = rentOf(s, it);
    if (it.vac && it.vac > 0) {
      it.vac -= 1;
      if (it.vac === 0 && r.chance(0.35)) it.vac = 1; // mais um mês sem achar inquilino
      continue;
    }
    if (r.chance(0.05)) { it.vac = r.int(1, 4); glog(s, fmtL(l('O inquilino de {n} saiu: o imóvel fica vago por algum tempo.', 'The tenant of {n} left: the property sits empty for a while.'), { n: d.name }), 'info'); continue; }
    if (r.chance(0.03)) { glog(s, fmtL(l('O inquilino de {n} atrasou o aluguel deste mês.', 'The tenant of {n} was late with this month\'s rent.'), { n: d.name }), 'bad'); continue; }
    const net = Math.round(full * (1 - AGENCY));
    o.wealth += net;
    it.rented = (it.rented ?? 0) + net;
    if (r.chance(0.04)) {
      const fix = Math.min(o.wealth, Math.round(full * 1.5));
      o.wealth -= fix;
      glog(s, fmtL(l('Reforma urgente em {n}: o aluguel de um mês e meio foi para o conserto.', 'Urgent repairs at {n}: a month and a half of rent went to the fix.'), { n: d.name }), 'bad');
    }
  }
}
registerSimHook('month', 'goods8-rent', (s) => rentMonth(s));
