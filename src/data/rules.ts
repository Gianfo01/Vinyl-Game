// Regras de dados: tecnologias, formatos, canais, sede, equipe, mutators,
// Cartas do Selo, narradores, modelos de contrato e finais (GDD §5, 7, 11, 13, 14, 21, 22).

import { l, type L } from './world';

// ---------- Tecnologias e pontos de divergência ----------
export interface TechDef {
  id: string;
  name: L;
  base: number;
  deps: string[];
  /** amplitude de variação no modo Livre/Caos */
  spread: number;
  divergence?: boolean;
}

export const TECHS: TechDef[] = [
  { id: 'radio', name: l('Rádio', 'Radio'), base: 1920, deps: [], spread: 0 },
  { id: 'electric_rec', name: l('Gravação elétrica', 'Electrical recording'), base: 1925, deps: [], spread: 2 },
  { id: 'lp', name: l('LP 33 rpm', 'LP 33 rpm'), base: 1948, deps: ['electric_rec'], spread: 4 },
  { id: 'single45', name: l('Single 45 rpm', '45 rpm single'), base: 1949, deps: ['electric_rec'], spread: 4 },
  { id: 'tv_music', name: l('TV musical', 'Music TV'), base: 1950, deps: ['radio'], spread: 4 },
  { id: 'multitrack', name: l('Fita multipista', 'Multitrack tape'), base: 1955, deps: ['lp'], spread: 4 },
  { id: 'cassette', name: l('Fita cassete', 'Cassette'), base: 1964, deps: ['multitrack'], spread: 4 },
  { id: 'fm', name: l('Rádio FM', 'FM radio'), base: 1966, deps: ['radio'], spread: 4 },
  { id: 'synth', name: l('Sintetizadores', 'Synthesizers'), base: 1970, deps: ['multitrack'], spread: 4 },
  { id: 'clipnet', name: l('Rede de clipes', 'Music video network'), base: 1981, deps: ['tv_music'], spread: 4, divergence: true },
  { id: 'cd', name: l('CD', 'CD'), base: 1983, deps: ['synth'], spread: 4 },
  { id: 'daw', name: l('Gravação digital e DAW', 'Digital recording & DAW'), base: 1992, deps: ['cd'], spread: 4 },
  { id: 'internet', name: l('Internet doméstica', 'Home internet'), base: 1995, deps: ['cd'], spread: 3 },
  { id: 'p2p', name: l('Compartilhamento P2P', 'P2P sharing'), base: 1999, deps: ['internet'], spread: 3 },
  { id: 'download', name: l('Loja de downloads', 'Download store'), base: 2003, deps: ['internet'], spread: 3 },
  { id: 'streaming', name: l('Streaming', 'Streaming'), base: 2008, deps: ['download'], spread: 4 },
  { id: 'short_video', name: l('Vídeo curto', 'Short video'), base: 2018, deps: ['streaming'], spread: 3 },
  { id: 'hologram', name: l('Hologramas de palco', 'Stage holograms'), base: 2027, deps: ['short_video'], spread: 3 },
  { id: 'synthetic_voice', name: l('Vozes sintéticas', 'Synthetic voices'), base: 2030, deps: ['short_video'], spread: 3 },
  { id: 'neural', name: l('Interface neural', 'Neural interface'), base: 2036, deps: ['synthetic_voice'], spread: 2, divergence: true },
];

export const techById = Object.fromEntries(TECHS.map((x) => [x.id, x])) as Record<string, TechDef>;

// ---------- Formatos ----------
export type FormatId = 'shellac' | 'single45' | 'lp' | 'cassette' | 'cd' | 'download' | 'streaming' | 'airplay';

export interface FormatDef {
  id: FormatId;
  name: L;
  physical: boolean;
  tech?: string;
  until?: string; // tech que o substitui
  /** receita líquida do selo por unidade (dólares reais 2020) por tipo de lançamento */
  net: { single: number; ep: number; lp: number };
  /** custo de fabricação por unidade (dólares reais) */
  unitCost: number;
}

export const FORMATS: FormatDef[] = [
  { id: 'shellac', name: l('Goma-laca 78 rpm', 'Shellac 78 rpm'), physical: true, until: 'single45', net: { single: 3.6, ep: 6, lp: 11 }, unitCost: 0.9 },
  { id: 'single45', name: l('Vinil 45 rpm', '45 rpm vinyl'), physical: true, tech: 'single45', until: 'cd', net: { single: 3.4, ep: 6, lp: 11 }, unitCost: 0.55 },
  { id: 'lp', name: l('LP', 'LP'), physical: true, tech: 'lp', net: { single: 3.4, ep: 8, lp: 14 }, unitCost: 1.6 },
  { id: 'cassette', name: l('Cassete', 'Cassette'), physical: true, tech: 'cassette', until: 'download', net: { single: 2.8, ep: 6, lp: 10 }, unitCost: 0.8 },
  { id: 'cd', name: l('CD', 'CD'), physical: true, tech: 'cd', net: { single: 3.5, ep: 7, lp: 12 }, unitCost: 0.7 },
  { id: 'download', name: l('Download', 'Download'), physical: false, tech: 'download', net: { single: 0.6, ep: 1.8, lp: 4 }, unitCost: 0 },
  { id: 'streaming', name: l('Streaming', 'Streaming'), physical: false, tech: 'streaming', net: { single: 0.6, ep: 1.6, lp: 3.2 }, unitCost: 0 },
  { id: 'airplay', name: l('Execução e rádio', 'Airplay & performance'), physical: false, net: { single: 0.25, ep: 0.5, lp: 0.8 }, unitCost: 0 },
];

export const formatById = Object.fromEntries(FORMATS.map((x) => [x.id, x])) as Record<FormatId, FormatDef>;

// ---------- Canais de marketing ----------
export interface ChannelDef {
  id: string;
  name: L;
  from?: string; // tech
  fromYear?: number;
  untilYear?: number;
  untilTech?: string;
  reachCost: number; // dólares reais para E ≈ 63%
  sales: number;
  fame: number;
  prestige: number;
}

export const CHANNELS: ChannelDef[] = [
  { id: 'radio_plug', name: l('Divulgação em rádio', 'Radio plugging'), from: 'radio', reachCost: 9000, sales: 1, fame: 0.8, prestige: 0.2 },
  { id: 'press', name: l('Imprensa e críticos', 'Press & critics'), reachCost: 5000, sales: 0.4, fame: 0.5, prestige: 1 },
  { id: 'sheet_music', name: l('Partituras e lojas', 'Sheet music & shops'), untilYear: 1955, reachCost: 4000, sales: 0.8, fame: 0.3, prestige: 0.2 },
  { id: 'tv_show', name: l('Programa de TV', 'TV show'), from: 'tv_music', reachCost: 20000, sales: 1.1, fame: 1.2, prestige: 0.3 },
  { id: 'jukebox', name: l('Jukebox e bailes', 'Jukebox & dances'), from: 'single45', untilYear: 1978, reachCost: 6000, sales: 0.9, fame: 0.5, prestige: 0 },
  { id: 'music_video', name: l('Clipe', 'Music video'), from: 'clipnet', reachCost: 30000, sales: 1.3, fame: 1.4, prestige: 0.4 },
  { id: 'street_team', name: l('Cena local e clubes', 'Local scene & clubs'), reachCost: 2500, sales: 0.5, fame: 0.4, prestige: 0.6 },
  { id: 'web_forums', name: l('Sites e fóruns', 'Websites & forums'), from: 'internet', untilYear: 2014, reachCost: 5000, sales: 0.7, fame: 0.6, prestige: 0.5 },
  { id: 'playlists', name: l('Playlists', 'Playlists'), from: 'streaming', reachCost: 12000, sales: 1.3, fame: 0.7, prestige: 0.1 },
  { id: 'social', name: l('Redes sociais', 'Social media'), from: 'streaming', reachCost: 9000, sales: 1, fame: 1.1, prestige: 0.1 },
  { id: 'short_clips', name: l('Vídeo curto e creators', 'Short video & creators'), from: 'short_video', reachCost: 10000, sales: 1.4, fame: 1.3, prestige: 0 },
  { id: 'neural_feed', name: l('Feeds personalizados', 'Personalized feeds'), from: 'synthetic_voice', reachCost: 15000, sales: 1.5, fame: 1, prestige: 0 },
];

// ---------- Sede (GDD §21) ----------
export interface HqLevel {
  id: string;
  name: L;
  careers: number;
  staff: number;
  sessions: number;
  equipment: number;
  reach: L;
  upgradeCost: number; // dólares reais para chegar a este nível
  rent: number; // dólares reais/mês
  /** mercados que a sede alcança sem distribuidor */
  freeMarkets: number;
  /** ano mínimo (a arquitetura e a tecnologia precisam existir) */
  minYear?: number;
  /** tecnologia exigida (id de TECHS) */
  tech?: string;
  /** exige esta reputação comercial mínima */
  minReputation?: number;
  desc?: L;
}

export const HQ_LEVELS: HqLevel[] = [
  { id: 'garage', name: l('Garagem', 'Garage'), careers: 1, staff: 1, sessions: 1, equipment: 3, reach: l('Cena local', 'Local scene'), upgradeCost: 0, rent: 150, freeMarkets: 1 },
  { id: 'small_studio', name: l('Estúdio pequeno', 'Small studio'), careers: 3, staff: 3, sessions: 1, equipment: 6, reach: l('Circuito regional', 'Regional circuit'), upgradeCost: 25000, rent: 900, freeMarkets: 1 },
  { id: 'loft', name: l('Loft', 'Loft'), careers: 6, staff: 6, sessions: 2, equipment: 9, reach: l('Operação nacional', 'National operation'), upgradeCost: 140000, rent: 4500, freeMarkets: 1 },
  { id: 'complex', name: l('Complexo', 'Complex'), careers: 12, staff: 12, sessions: 4, equipment: 12, reach: l('Operação internacional', 'International operation'), upgradeCost: 700000, rent: 18000, freeMarkets: 2 },
  { id: 'tower', name: l('Torre multinacional', 'Multinational tower'), careers: 20, staff: 20, sessions: 6, equipment: 16, reach: l('Multinacional', 'Multinational'), upgradeCost: 3000000, rent: 60000, freeMarkets: 3, minYear: 1968, minReputation: 55, desc: l('Andares de A&R, jurídico e marketing; estúdios A e B; sala de imprensa.', 'Floors of A&R, legal and marketing; studios A and B; a press room.') },
  { id: 'campus', name: l('Campus futurista', 'Futuristic campus'), careers: 30, staff: 28, sessions: 8, equipment: 20, reach: l('Global e neural', 'Global and neural'), upgradeCost: 9000000, rent: 120000, freeMarkets: 4, minYear: 2026, tech: 'hologram', minReputation: 65, desc: l('Palco holográfico, laboratório neural, estúdios imersivos e jardim suspenso.', 'Holographic stage, neural lab, immersive studios and a hanging garden.') },
];

export interface BranchLevel {
  name: L;
  careers: number;
  staff: number;
  sessions: number;
  cost: number; // dólares reais
  rent: number; // dólares reais/mês
}

/** Filiais em outras cidades: ampliam a capacidade e abrem o mercado local. */
export const BRANCH_LEVELS: BranchLevel[] = [
  { name: l('Escritório regional', 'Regional office'), careers: 2, staff: 2, sessions: 0, cost: 25000, rent: 1200 },
  { name: l('Estúdio regional', 'Regional studio'), careers: 3, staff: 3, sessions: 1, cost: 90000, rent: 3500 },
  { name: l('Sede regional', 'Regional headquarters'), careers: 5, staff: 5, sessions: 2, cost: 320000, rent: 11000 },
];

// ---------- Equipe ----------
export interface StaffRole {
  id: string;
  name: L;
  desc: L;
  salary: number; // dólares reais/mês para habilidade 50
}

export const STAFF_ROLES: StaffRole[] = [
  { id: 'producer', name: l('Produtor', 'Producer'), desc: l('Eleva a produção das gravações.', 'Raises recording production.'), salary: 3200 },
  { id: 'engineer', name: l('Engenheiro', 'Engineer'), desc: l('Reduz problemas técnicos; opera equipamento.', 'Reduces technical problems; operates gear.'), salary: 2600 },
  { id: 'anr', name: l('A&R', 'A&R'), desc: l('+1 ação de scouting por mês e relatórios mais precisos.', '+1 scouting action per month and sharper reports.'), salary: 2800 },
  { id: 'publicist', name: l('Assessoria', 'Publicist'), desc: l('Campanhas mais eficientes; gestão de crise.', 'More efficient campaigns; crisis handling.'), salary: 2500 },
  { id: 'tour_manager', name: l('Gerente de turnê', 'Tour manager'), desc: l('Menos fadiga e custo nos shows.', 'Less fatigue and cost on the road.'), salary: 2400 },
  { id: 'analyst', name: l('Analista', 'Analyst'), desc: l('Previsões com intervalo mais estreito.', 'Narrower forecast ranges.'), salary: 2700 },
  { id: 'rights', name: l('Gestor de direitos', 'Rights manager'), desc: l('Cobra execução e mecânicos com menos perda.', 'Collects performance and mechanicals with less leakage.'), salary: 2600 },
  { id: 'admin', name: l('Administração', 'Administration'), desc: l('Reduz carga de gestão.', 'Reduces management load.'), salary: 2000 },
  { id: 'booking', name: l('Booking', 'Booking agent'), desc: l('Casas melhores e festivais.', 'Better venues and festivals.'), salary: 2500 },
  { id: 'manufacturing', name: l('Fabricação', 'Manufacturing'), desc: l('Prensagem mais barata e previsão de estoque.', 'Cheaper pressing and stock forecasts.'), salary: 2200 },
  { id: 'legal', name: l('Jurídico', 'Legal'), desc: l('Disputas e contratos mais seguros.', 'Safer disputes and contracts.'), salary: 3500 },
  { id: 'designer', name: l('Designer', 'Designer'), desc: l('Capas e imagem: pequeno bônus de vendas.', 'Covers and image: small sales bonus.'), salary: 2100 },
  { id: 'manager', name: l('Empresário', 'Artist manager'), desc: l('Confiança dos artistas e cachês de marca maiores.', 'Artist trust and bigger brand fees.'), salary: 3000 },
  { id: 'agent', name: l('Agente internacional', 'International agent'), desc: l('Vistos, rotas e vagas em festivais estrangeiros.', 'Visas, routes and foreign festival slots.'), salary: 2800 },
  { id: 'sync', name: l('Agente de sync', 'Sync agent'), desc: l('Mais ofertas de cinema, TV, jogos e comerciais.', 'More film, TV, game and ad offers.'), salary: 2400 },
];

export const staffRoleById = Object.fromEntries(STAFF_ROLES.map((x) => [x.id, x])) as Record<string, StaffRole>;

// ---------- Equipamento por era ----------
export interface EquipmentDef {
  id: string;
  name: L;
  branch: 'audio' | 'manufacturing' | 'marketing' | 'comfort' | 'archive';
  tech?: string;
  cost: number;
  effect: Partial<{ production: number; performance: number; pressing: number; marketing: number; fatigue: number; catalog: number }>;
  needsEngineer?: boolean;
}

export const EQUIPMENT: EquipmentDef[] = [
  { id: 'ribbon_mic', name: l('Microfone de fita', 'Ribbon microphone'), branch: 'audio', tech: 'electric_rec', cost: 1500, effect: { production: 3 } },
  { id: 'mixing_desk', name: l('Mesa de som', 'Mixing desk'), branch: 'audio', tech: 'electric_rec', cost: 4000, effect: { production: 4 } },
  { id: 'tape_machine', name: l('Gravador multipista', 'Multitrack recorder'), branch: 'audio', tech: 'multitrack', cost: 12000, effect: { production: 6 }, needsEngineer: true },
  { id: 'echo_chamber', name: l('Câmara de eco', 'Echo chamber'), branch: 'audio', tech: 'multitrack', cost: 6000, effect: { production: 3, performance: 1 } },
  { id: 'synth_rack', name: l('Rack de sintetizadores', 'Synth rack'), branch: 'audio', tech: 'synth', cost: 18000, effect: { production: 5 }, needsEngineer: true },
  { id: 'digital_console', name: l('Console digital e DAW', 'Digital console & DAW'), branch: 'audio', tech: 'daw', cost: 25000, effect: { production: 7 }, needsEngineer: true },
  { id: 'plugin_suite', name: l('Plugins e loops', 'Plugins & loops'), branch: 'audio', tech: 'streaming', cost: 8000, effect: { production: 4 } },
  { id: 'ai_tools', name: l('Ferramentas de IA', 'AI tools'), branch: 'audio', tech: 'synthetic_voice', cost: 30000, effect: { production: 6 }, needsEngineer: true },
  { id: 'press_contract', name: l('Contrato com prensagem', 'Pressing plant contract'), branch: 'manufacturing', cost: 5000, effect: { pressing: 0.12 } },
  { id: 'own_plant', name: l('Fábrica própria', 'Own pressing plant'), branch: 'manufacturing', cost: 90000, effect: { pressing: 0.3 } },
  { id: 'mail_list', name: l('Mala direta e fã-clube', 'Mailing list & fan club'), branch: 'marketing', cost: 3000, effect: { marketing: 0.08 } },
  { id: 'video_suite', name: l('Ilha de edição de vídeo', 'Video edit suite'), branch: 'marketing', tech: 'clipnet', cost: 20000, effect: { marketing: 0.12 } },
  { id: 'analytics', name: l('Painel de dados', 'Analytics dashboard'), branch: 'marketing', tech: 'internet', cost: 12000, effect: { marketing: 0.1 } },
  { id: 'lounge', name: l('Sala de descanso', 'Lounge'), branch: 'comfort', cost: 3500, effect: { fatigue: 3 } },
  { id: 'tour_bus', name: l('Ônibus de turnê', 'Tour bus'), branch: 'comfort', tech: 'tv_music', cost: 40000, effect: { fatigue: 5 } },
  { id: 'tape_vault', name: l('Cofre de masters', 'Master tape vault'), branch: 'archive', cost: 6000, effect: { catalog: 0.1 } },
  { id: 'digital_archive', name: l('Arquivo digital', 'Digital archive'), branch: 'archive', tech: 'daw', cost: 15000, effect: { catalog: 0.15 } },
];

export const equipmentById = Object.fromEntries(EQUIPMENT.map((x) => [x.id, x])) as Record<string, EquipmentDef>;

// ---------- Estúdios externos por nível ----------
export const STUDIO_TIERS: { id: number; name: L; cost: number; production: number }[] = [
  { id: 0, name: l('Garagem / home studio', 'Garage / home studio'), cost: 0, production: 0 },
  { id: 1, name: l('Estúdio regional', 'Regional studio'), cost: 2500, production: 8 },
  { id: 2, name: l('Estúdio profissional', 'Professional studio'), cost: 9000, production: 16 },
  { id: 3, name: l('Estúdio de elite', 'Elite studio'), cost: 28000, production: 24 },
];

export const APPROACHES: { id: 'spontaneous' | 'balanced' | 'meticulous'; name: L; costMult: number; perf: number; prod: number; originality: number }[] = [
  { id: 'spontaneous', name: l('Espontânea', 'Spontaneous'), costMult: 0.6, perf: 4, prod: -6, originality: 6 },
  { id: 'balanced', name: l('Equilibrada', 'Balanced'), costMult: 1, perf: 0, prod: 0, originality: 0 },
  { id: 'meticulous', name: l('Minuciosa', 'Meticulous'), costMult: 1.7, perf: -2, prod: 8, originality: -3 },
];

// ---------- Casas de show ----------
export const VENUE_TIERS: { id: number; name: L; cap: [number, number]; fameMin: number; cost: number }[] = [
  { id: 0, name: l('Bar ou clube pequeno', 'Bar or small club'), cap: [50, 300], fameMin: 0, cost: 150 },
  { id: 1, name: l('Casa média', 'Mid-size venue'), cap: [300, 1500], fameMin: 12, cost: 1200 },
  { id: 2, name: l('Teatro', 'Theatre'), cap: [1500, 5000], fameMin: 30, cost: 6000 },
  { id: 3, name: l('Arena', 'Arena'), cap: [5000, 20000], fameMin: 55, cost: 30000 },
  { id: 4, name: l('Estádio', 'Stadium'), cap: [20000, 80000], fameMin: 78, cost: 140000 },
];

// ---------- Modelos de contrato (GDD §11) ----------
export type ContractModel = 'classic' | '360' | 'licensing' | 'distribution' | 'publishing' | 'management' | 'production' | 'jv';

export const CONTRACT_MODELS: { id: ContractModel; name: L; desc: L; available: boolean }[] = [
  { id: 'classic', name: l('Gravação clássico', 'Classic recording'), desc: l('Selo financia e fica com o master; artista recebe royalties após recoupment.', 'Label funds and owns the master; artist earns royalties after recoupment.'), available: true },
  { id: '360', name: l('360', '360'), desc: l('Selo participa de shows, merch e edição, com mais apoio e menos autonomia.', 'Label shares in live, merch and publishing; more support, less autonomy.'), available: true },
  { id: 'licensing', name: l('Licenciamento', 'Licensing'), desc: l('Artista mantém o master; selo licencia por prazo e território.', 'Artist keeps the master; label licenses it for a term and territory.'), available: true },
  { id: 'distribution', name: l('Distribuição', 'Distribution'), desc: l('Artista independente paga taxa para chegar ao varejo e às plataformas.', 'Independent artist pays a fee to reach retail and platforms.'), available: true },
  { id: 'publishing', name: l('Edição (publishing)', 'Publishing'), desc: l('Editora administra composições: mecânicos, execução, sync.', 'Publisher administers compositions: mechanicals, performance, sync.'), available: true },
  { id: 'management', name: l('Empresariamento', 'Management'), desc: l('Comissão sobre receitas em troca de gestão de carreira (papel Empresário, fase 4).', 'Commission on income for career management (Manager role, phase 4).'), available: false },
  { id: 'production', name: l('Produção (P&D)', 'Production deal'), desc: l('Produtor entrega masters ao selo (papel Estúdio, fase 4).', 'Producer delivers masters to the label (Studio role, phase 4).'), available: false },
  { id: 'jv', name: l('Joint venture', 'Joint venture'), desc: l('Selo subsidiário com co-propriedade e metas (fase 5).', 'Subsidiary label with co-ownership and targets (phase 5).'), available: false },
];

// ---------- Mutators (GDD §5.5) ----------
export interface MutatorDef { id: string; name: L; desc: L }
const mu = (id: string, pt: string, en: string, dpt: string, den: string): MutatorDef => ({ id, name: l(pt, en), desc: l(dpt, den) });

export const MUTATORS: MutatorDef[] = [
  mu('fragile_market', 'Mercado Frágil', 'Fragile Market', 'Menos atenção por segmento.', 'Less attention per segment.'),
  mu('cruel_industry', 'Indústria Cruel', 'Cruel Industry', 'Rivais agressivos; contratos duros.', 'Aggressive rivals; tough contracts.'),
  mu('golden_age', 'Era de Ouro dos Selos', 'Golden Age of Labels', 'Adiantamentos altos; competição por talentos.', 'High advances; talent wars.'),
  mu('hostile_radio', 'Rádio Hostil', 'Hostile Radio', 'Acesso editorial difícil.', 'Hard editorial access.'),
  mu('early_streaming', 'Streaming Precoce', 'Early Streaming', 'Adoção digital adiantada.', 'Digital adoption arrives early.'),
  mu('heavy_piracy', 'Pirataria Pesada', 'Heavy Piracy', 'Perda de receita no físico e no digital.', 'Revenue loss in physical and digital.'),
  mu('rare_talent', 'Talentos Raros', 'Rare Talent', 'Menos atos de alto potencial.', 'Fewer high-potential acts.'),
  mu('difficult_artists', 'Artistas Difíceis', 'Difficult Artists', 'Traços mais extremos.', 'More extreme traits.'),
  mu('small_world', 'Mundo Pequeno', 'Small World', 'Menos atos procedurais.', 'Fewer procedural acts.'),
  mu('giant_world', 'Mundo Gigante', 'Giant World', 'Mais atos procedurais.', 'More procedural acts.'),
  mu('permanent_crisis', 'Crise Permanente', 'Permanent Crisis', 'Recessões frequentes.', 'Frequent recessions.'),
  mu('censorship', 'Censura', 'Censorship', 'Restrições de conteúdo por mercado.', 'Content restrictions by market.'),
  mu('strong_nostalgia', 'Nostalgia Forte', 'Strong Nostalgia', 'Revivals mais frequentes.', 'More frequent revivals.'),
  mu('no_stars', 'Sem Estrelas', 'No Stars', 'Poucos superstars; mercado pulverizado.', 'Few superstars; fragmented market.'),
  mu('strong_fanclubs', 'Fã-Clubes Fortes', 'Strong Fan Clubs', 'Comunidades mobilizam mais.', 'Communities mobilize more.'),
  mu('early_synthetic', 'Voz Sintética Precoce', 'Early Synthetic Voice', 'Era neural adiantada.', 'Neural era arrives early.'),
  mu('no_safety_net', 'Sem Rede de Segurança', 'No Safety Net', 'Sem crédito emergencial.', 'No emergency credit.'),
  // rodada 6
  mu('superstar_economy', 'Economia de Superstars', 'Superstar Economy', 'Atos famosos (★40+) vendem 15% mais; o resto, 5% menos.', 'Famous acts (★40+) sell 15% more; everyone else 5% less.'),
  mu('fast_trends', 'Modas Relâmpago', 'Flash Trends', 'A popularidade dos gêneros sobe e desce duas vezes mais rápido.', 'Genre popularity rises and falls twice as fast.'),
  mu('expensive_plants', 'Fábricas Caras', 'Expensive Plants', 'Fabricação 25% mais cara.', 'Manufacturing 25% more expensive.'),
  mu('generous_critics', 'Crítica Generosa', 'Generous Critics', '+0,6 nas notas da crítica.', '+0.6 on critics\' scores.'),
  mu('harsh_critics', 'Crítica Implacável', 'Merciless Critics', '−0,7 nas notas da crítica.', '−0.7 on critics\' scores.'),
  mu('stage_fever', 'Febre dos Palcos', 'Stage Fever', 'Shows rendem 20% mais; discos vendem 10% menos.', 'Shows earn 20% more; records sell 10% less.'),
  mu('short_careers', 'Carreiras Curtas', 'Short Careers', 'Os atos encerram a carreira bem antes.', 'Acts end their careers much sooner.'),
  mu('hustle_culture', 'Cultura do Corre', 'Hustle Culture', '+1 tempo livre por mês, +40% de estresse.', '+1 free time a month, +40% stress.'),
  mu('wealth_tax', 'Imposto sobre Fortunas', 'Wealth Tax', 'Todo ano, 3% do caixa acima de $100 mil (corrigido) vai para o fisco.', 'Every year, 3% of cash above $100k (adjusted) goes to the taxman.'),
  mu('fickle_fans', 'Fãs Volúveis', 'Fickle Fans', 'O momento dos atos esfria mais rápido.', 'Act momentum cools faster.'),
  mu('talent_flood', 'Enxurrada de Talentos', 'Talent Flood', '+2 sinais e +1 ação de scouting por mês.', '+2 signals and +1 scouting action a month.'),
  mu('galloping_inflation', 'Inflação Galopante', 'Galloping Inflation', 'Adiantamentos e salários 15% mais caros.', 'Advances and salaries 15% more expensive.'),
  mu('loyal_artists', 'Artistas Leais', 'Loyal Artists', '+10 de confiança e moral melhor no elenco.', '+10 trust and better morale on the roster.'),
  mu('beginners_luck', 'Sorte de Principiante', "Beginner's Luck", '+12% de apelo nos três primeiros anos.', '+12% appeal in the first three years.'),
];

// ---------- Cartas do Selo (GDD §5.6) ----------
export interface CardDef { id: string; name: L; passive: L; goal: L }
const cd = (id: string, pt: string, en: string, ppt: string, pen: string, gpt: string, gen: string): CardDef => ({ id, name: l(pt, en), passive: l(ppt, pen), goal: l(gpt, gen) });

export const CARDS: CardDef[] = [
  cd('none', 'Sem carta', 'No card', 'Nenhum modificador.', 'No modifiers.', 'Nenhuma meta pessoal.', 'No personal goal.'),
  cd('prospector', 'O Garimpeiro', 'The Prospector', '+ precisão de scouting / − caixa inicial', '+ scouting accuracy / − starting cash', '5 artistas que viram influência', '5 artists who become influential'),
  cd('emperor', 'O Imperador', 'The Emperor', '+ distribuição / − confiança dos artistas', '+ distribution / − artist trust', 'Maior receita da era', 'Highest revenue of the era'),
  cd('artists_house', 'A Casa do Artista', "The Artist's House", '+ confiança / − margem', '+ trust / − margin', 'Ninguém sai por insatisfação em 10 anos', 'Nobody leaves unhappy in 10 years'),
  cd('archivist', 'O Arquivista', 'The Archivist', '+ valor de catálogo / − ritmo de lançamento', '+ catalog value / − release pace', 'Reativar 10 obras', 'Reactivate 10 works'),
  cd('manufacturer', 'O Fabricante', 'The Manufacturer', '+ fabricação própria / − flexibilidade digital', '+ own manufacturing / − digital flexibility', 'Controlar a fabricação em 3 mercados', 'Control manufacturing in 3 markets'),
  cd('showman', 'O Showman', 'The Showman', '+ palco e festivais / − estúdio', '+ stage and festivals / − studio', 'Ser headline em 3 festivais', 'Headline 3 festivals'),
  cd('digital_native', 'O Digital Nativo', 'The Digital Native', '+ plataformas / − físico', '+ platforms / − physical', 'Liderar a transição digital', 'Lead the digital transition'),
  cd('publisher', 'O Editor', 'The Publisher', '+ publishing / − master', '+ publishing / − master', 'Maior catálogo de composições', 'Largest song catalog'),
  cd('patron', 'O Mecenas', 'The Patron', '+ cenas locais / − lucro', '+ local scenes / − profit', 'Fundar um movimento cultural', 'Found a cultural movement'),
  cd('corsair', 'O Corsário', 'The Corsair', '+ eficiência em práticas questionáveis / − reputação institucional', '+ efficiency in questionable practices / − institutional reputation', 'Sobreviver a um escândalo', 'Survive a scandal'),
  cd('globalist', 'O Globalista', 'The Globalist', '+ mercados externos / − cena local', '+ foreign markets / − local scene', 'Presença nos 7 mercados', 'Presence in all 7 markets'),
  // rodada 6
  cd('indie_spirit', 'O Independente', 'The Indie', '+ confiança e crítica / − vendas', '+ trust and critics / − sales', '3 lançamentos com média 8+ na crítica', '3 releases averaging 8+ with critics'),
  cd('hit_factory', 'A Fábrica de Hits', 'The Hit Factory', '+ apelo e vendas / − crítica e moral', '+ appeal and sales / − critics and morale', '10 entradas no Top 10', '10 Top 10 entries'),
  cd('family_business', 'O Negócio de Família', 'The Family Business', '+ tempo livre, renda pessoal e moral / − valor de mercado', '+ free time, personal income and morale / − market value', 'Um filho(a) assumir a empresa', 'A child takes over the company'),
  cd('gambler', 'O Apostador', 'The Gambler', '+ ofertas irresistíveis e golpes de sorte / − adiantamentos caros e azares', '+ irresistible offers and windfalls / − costly advances and bad luck', 'Chegar a $1 milhão (corrigido) em caixa', 'Reach $1 million (adjusted) in cash'),
  cd('tastemaker', 'O Formador de Opinião', 'The Tastemaker', '+ crítica e sinais / − bilheteria', '+ critics and signals / − box office', '5 lançamentos com nota 9+', '5 releases scoring 9+'),
  cd('road_warrior', 'O Guerreiro da Estrada', 'The Road Warrior', '+ bilheteria e tempo livre / − fabricação cara', '+ box office and free time / − costly manufacturing', '200 shows do elenco', '200 roster shows'),
  cd('conglomerate', 'O Conglomerado', 'The Conglomerate', '+ valor de mercado e salários baixos / − confiança', '+ market value and low salaries / − trust', 'Abrir o capital', 'Go public'),
  cd('underdog', 'O Azarão', 'The Underdog', '+ aprendizado e apelo de atos pequenos / − caixa inicial', '+ learning and appeal for small acts / − starting cash', 'Um número 1 com um ato que começou com ★5 ou menos', 'A number one with an act that started at ★5 or less'),
  cd('provocateur', 'O Provocador', 'The Provocateur', '+ apelo / − reputação institucional todo ano', '+ appeal / − institutional reputation every year', 'Sobreviver a 3 escândalos', 'Survive 3 scandals'),
  cd('activist', 'O Engajado', 'The Activist', '+ reputação, crítica e confiança / − salários maiores', '+ reputation, critics and trust / − higher salaries', 'Reputação institucional 80+', 'Institutional reputation 80+'),
  cd('inventor', 'O Inventor', 'The Inventor', '+ fabricação barata e vendas / − qualidade crua', '+ cheap manufacturing and sales / − rough quality', 'Ter a fábrica própria e 3 equipamentos', 'Own the plant and 3 pieces of equipment'),
  cd('dynast', 'O Dinasta', 'The Dynast', '+ legado familiar: herdeiros mais talentosos, + moral / − estresse', '+ family legacy: more gifted heirs, + morale / − stress', 'Três gerações no comando', 'Three generations in charge'),
  cd('synthetic_pioneer', 'O Pioneiro Sintético', 'The Synthetic Pioneer', '+ vozes sintéticas / − credibilidade humana', '+ synthetic voices / − human credibility', 'Um final sintético', 'A synthetic ending'),
];

export const cardById = Object.fromEntries(CARDS.map((x) => [x.id, x])) as Record<string, CardDef>;

// ---------- Narradores (GDD §20) ----------
export const STORYTELLERS: { id: 'maestro' | 'brisa' | 'acaso' | 'cronista' | 'tabloide' | 'poeta' | 'cinico' | 'locutor'; name: L; desc: L }[] = [
  { id: 'maestro', name: l('Maestro', 'Maestro'), desc: l('Tensão em ondas: oportunidade, crise, recuperação.', 'Tension in waves: opportunity, crisis, recovery.') },
  { id: 'brisa', name: l('Brisa', 'Breeze'), desc: l('Ritmo calmo; crises raras e brandas.', 'Calm pace; rare, mild crises.') },
  { id: 'acaso', name: l('Acaso', 'Chance'), desc: l('Aleatório puro, sem curva.', 'Pure randomness, no curve.') },
  // rodada 13: narradores com voz (reescrevem notícias e decisões; ver sim/narrator13.ts)
  { id: 'cronista', name: l('Cronista', 'Chronicler'), desc: l('Marés longas de bonança e crise (ciclos de ~2,5 anos); narra como livro de história: "Crônica de março de 1962: …".', 'Long tides of boom and bust (~2.5-year cycles); narrates like a history book: "Chronicle, March 1962: …".') },
  { id: 'tabloide', name: l('Tabloide', 'Tabloid'), desc: l('Mais eventos por mês e crises 50% mais prováveis; manchetes em caixa-alta ("BOMBA!", "EXCLUSIVO:").', 'More events a month and crises 50% likelier; all-caps headlines ("SHOCKER!", "EXCLUSIVE:").') },
  { id: 'poeta', name: l('Poeta', 'Poet'), desc: l('Menos eventos, crises mais raras e boas notícias mais frequentes; fecha cada notícia com um verso.', 'Fewer events, rarer crises and more good news; ends every story with a line of verse.') },
  { id: 'cinico', name: l('Veterano cínico', 'Jaded veteran'), desc: l('Crises mais frequentes e sem piedade: não alivia quando o caixa aperta (mais difícil). Comenta tudo com sarcasmo.', 'More frequent crises and no mercy: does not ease off when cash runs low (harder). Comments on everything sarcastically.') },
  { id: 'locutor', name: l('Locutor de rádio', 'Radio host'), desc: l('Ondas curtas e rápidas (~8 meses) e boas notícias um pouco mais comuns; narra tudo como plantão no ar ("Alô, ouvintes!").', 'Short, fast waves (~8 months) and slightly more good news; narrates everything like a live bulletin ("Hello, listeners!").') },
];

// ---------- Papéis (GDD §4) ----------
export type RoleId = 'label' | 'artist' | 'hybrid' | 'manager' | 'publisher' | 'studio';
export const ROLES: { id: RoleId; name: L; desc: L; available: boolean }[] = [
  { id: 'label', name: l('Gravadora', 'Record label'), desc: l('Contrate, produza, lance e distribua. Receita de masters.', 'Sign, produce, release and distribute. Master revenue.'), available: true },
  { id: 'artist', name: l('Artista / banda', 'Artist / band'), desc: l('Carreira, arte e autonomia. Receita de shows e royalties.', 'Career, art and autonomy. Live and royalty income.'), available: true },
  { id: 'hybrid', name: l('Híbrido', 'Hybrid'), desc: l('Sua banda + seu selo. Equilibre prioridades.', 'Your band + your label. Balance priorities.'), available: true },
  { id: 'manager', name: l('Empresário', 'Manager'), desc: l('Comissão sobre carreiras (fase 4).', 'Commission on careers (phase 4).'), available: false },
  { id: 'publisher', name: l('Editora musical', 'Music publisher'), desc: l('Administra composições (fase 4).', 'Administers compositions (phase 4).'), available: false },
  { id: 'studio', name: l('Estúdio / produtor', 'Studio / producer'), desc: l('Diárias e pontos de produção (fase 4).', 'Day rates and production points (phase 4).'), available: false },
];

// ---------- Finais do Arco Neural (GDD §22) ----------
export const ENDINGS: { id: string; name: L; text: L }[] = [
  { id: 'fired_by_board', name: l('Demitido pelo Conselho', 'Fired by the Board'), text: l('Os investidores queriam números que você não entregou. A placa com o seu nome sai da porta; os discos ficam.', "The investors wanted numbers you didn't deliver. The plate with your name comes off the door; the records stay.") },
  { id: 'last_vinyl', name: l('O Último Vinil', 'The Last Vinyl'), text: l('Enquanto o mundo trocava discos por feeds, sua casa continuou prensando. O último vinil saiu da sua fábrica — e esgotou.', 'While the world swapped records for feeds, your house kept pressing. The last vinyl came out of your plant — and sold out.') },
  { id: 'house_of_masters', name: l('Casa dos Mestres', 'House of Masters'), text: l('Seus artistas viraram referência. Cada geração nova aprende com quem passou pela sua casa.', 'Your artists became the reference. Every new generation learns from those who passed through your house.') },
  { id: 'live_stage', name: l('Palco Vivo', 'Living Stage'), text: l('Quando gravar ficou fácil demais, o valor voltou ao palco. Você estava lá.', 'When recording became too easy, value returned to the stage. You were there.') },
  { id: 'analog_manifesto', name: l('Manifesto Analógico', 'Analog Manifesto'), text: l('Você recusou a interface neural e escreveu um manifesto. Um movimento inteiro assinou embaixo.', 'You refused the neural interface and wrote a manifesto. A whole movement signed it.') },
  { id: 'end_of_bar', name: l('Fim do Compasso', 'End of the Bar'), text: l('A empresa chegou a 2040 cansada e pequena. Algumas músicas ainda tocam, sem que ninguém lembre do selo.', 'The company reached 2040 tired and small. A few songs still play, though no one remembers the label.') },
  { id: 'silenced_voice', name: l('Voz Calada', 'Silenced Voice'), text: l('Vozes copiadas sem consentimento tomaram as paradas. Os artistas pararam de cantar para você.', 'Voices copied without consent took over the charts. Artists stopped singing for you.') },
  { id: 'perfect_duet', name: l('Dueto Perfeito', 'Perfect Duet'), text: l('Humanos e vozes sintéticas cantaram juntos, com consentimento e crédito. O dueto virou gênero.', 'Humans and synthetic voices sang together, with consent and credit. The duet became a genre.') },
  { id: 'the_bridge', name: l('A Ponte', 'The Bridge'), text: l('Você ligou as duas margens: artistas humanos fortes e inovação sem atropelo.', 'You joined both shores: strong human artists and innovation without trampling.') },
  { id: 'licensed_choir', name: l('Coro Licenciado', 'Licensed Choir'), text: l('Seu catálogo de vozes licenciadas virou o coro do mundo — e cada titular recebe.', 'Your catalog of licensed voices became the world\'s choir — and every owner gets paid.') },
  { id: 'two_worlds', name: l('Dois Mundos', 'Two Worlds'), text: l('Você manteve duas casas: uma analógica, outra neural. Elas quase não se falam.', 'You kept two houses: one analog, one neural. They barely speak.') },
  { id: 'fragile_balance', name: l('Equilíbrio Frágil', 'Fragile Balance'), text: l('Nem império nem ruína. Um selo que atravessou a virada neural na ponta dos pés.', 'Neither empire nor ruin. A label that tiptoed through the neural turn.') },
  { id: 'voice_scandal', name: l('Escândalo da Voz', 'The Voice Scandal'), text: l('Uma voz usada sem permissão virou manchete. O escândalo define como lembram de você.', 'A voice used without permission made headlines. The scandal defines how you are remembered.') },
  { id: 'neural_empire', name: l('Império Neural', 'Neural Empire'), text: l('Você dominou feeds, vozes e interfaces. A música agora passa pelos seus servidores.', 'You dominated feeds, voices and interfaces. Music now runs through your servers.') },
  { id: 'infinite_catalog', name: l('Catálogo Infinito', 'Infinite Catalog'), text: l('Seu catálogo treinou modelos que geram variações sem fim. Cada uma paga um centavo.', 'Your catalog trained models that generate endless variations. Each one pays a cent.') },
  { id: 'famous_ghost', name: l('Fantasma Famoso', 'Famous Ghost'), text: l('Uma voz que já tinha partido voltou às paradas. O público não sabe se chora ou dança.', 'A voice long gone returned to the charts. The public does not know whether to cry or dance.') },
  { id: 'white_noise', name: l('Ruído Branco', 'White Noise'), text: l('Música demais, atenção de menos. Seu selo virou parte do ruído.', 'Too much music, too little attention. Your label became part of the noise.') },
  { id: 'human_renaissance', name: l('Renascimento Humano', 'Human Renaissance'), text: l('O mundo rejeitou a interface e redescobriu a imperfeição. Você liderou o renascimento.', 'The world rejected the interface and rediscovered imperfection. You led the renaissance.') },
  { id: 'creative_singularity', name: l('Singularidade Criativa', 'Creative Singularity'), text: l('Um ato sintético seu chegou ao topo e mudou o que chamamos de criar.', 'One of your synthetic acts hit the top and changed what we call creating.') },
  { id: 'eternal_archivist', name: l('O Arquivista Eterno', 'The Eternal Archivist'), text: l('Você guardou tudo. Em 2040, a história da música passa pelo seu arquivo.', 'You kept everything. In 2040, music history runs through your archive.') },
  { id: 'the_silence', name: l('O Silêncio', 'The Silence'), text: l('O selo fechou as portas na era neural. Fica o silêncio entre duas faixas.', 'The label closed its doors in the neural era. What remains is the silence between two tracks.') },
  // rodada 8: fim da linhagem (sem herdeiros)
  { id: 'end_of_line', name: l('Fim da Linhagem', 'End of the Line'), text: l('Não sobrou ninguém da família para abrir a porta de manhã. Os discos continuam tocando; o nome na fachada, não.', 'No one in the family was left to open the door in the morning. The records keep playing; the name on the front does not.') },
  { id: 'quiet_retirement', name: l('Aposentadoria Tranquila', 'Quiet Retirement'), text: l('Você pendurou os fones sem herdeiros e vendeu as chaves. Uma varanda, uma vitrola e histórias demais para contar.', 'You hung up the headphones without heirs and sold the keys. A porch, a turntable and too many stories to tell.') },
];

export const endingById = Object.fromEntries(ENDINGS.map((x) => [x.id, x])) as Record<string, (typeof ENDINGS)[number]>;

export const LEGACY_DIMS: { id: 'commercial' | 'cultural' | 'artists' | 'innovation' | 'industry' | 'catalog' | 'reputation'; name: L }[] = [
  { id: 'commercial', name: l('Comercial', 'Commercial') },
  { id: 'cultural', name: l('Cultural', 'Cultural') },
  { id: 'artists', name: l('Artistas', 'Artists') },
  { id: 'innovation', name: l('Inovação', 'Innovation') },
  { id: 'industry', name: l('Indústria', 'Industry') },
  { id: 'catalog', name: l('Catálogo', 'Catalog') },
  { id: 'reputation', name: l('Reputação', 'Reputation') },
];
