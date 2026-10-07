// Traços, origens, ambições, ações de agenda e listas de nomes (GDD §9, Catálogo §9).

import { l, type L, type NameGroup } from './world';

export type SkillId = 'comp' | 'lyr' | 'voice' | 'instr' | 'prod' | 'stage' | 'biz';
export const SKILLS: { id: SkillId; name: L }[] = [
  { id: 'comp', name: l('Composição', 'Composition') },
  { id: 'lyr', name: l('Escrita', 'Lyrics') },
  { id: 'voice', name: l('Voz', 'Voice') },
  { id: 'instr', name: l('Instrumento', 'Instrument') },
  { id: 'prod', name: l('Produção', 'Production') },
  { id: 'stage', name: l('Palco', 'Stage') },
  { id: 'biz', name: l('Negócios', 'Business') },
];

export type TraitGroup = 'creative' | 'social' | 'professional' | 'emotional' | 'public';

export interface TraitDef {
  id: string;
  group: TraitGroup;
  name: L;
  /** Modificadores suaves: tendências, nunca regras */
  mod: Partial<{
    quality: number; originality: number; output: number; morale: number; stress: number;
    trust: number; fatigue: number; scandal: number; media: number; stage: number; greed: number; loyalty: number;
  }>;
}

const t = (id: string, group: TraitGroup, pt: string, en: string, mod: TraitDef['mod']): TraitDef => ({ id, group, name: l(pt, en), mod });

export const TRAITS: TraitDef[] = [
  t('experimental', 'creative', 'Experimental', 'Experimental', { originality: 12, quality: -2 }),
  t('perfectionist', 'creative', 'Perfeccionista', 'Perfectionist', { quality: 6, output: -0.3, stress: 5 }),
  t('intuitive', 'creative', 'Intuitivo', 'Intuitive', { originality: 5, quality: 2 }),
  t('prolific', 'creative', 'Prolífico', 'Prolific', { output: 0.5 }),
  t('blocked', 'creative', 'Bloqueado', 'Blocked', { output: -0.4, quality: -3 }),
  t('chameleon', 'creative', 'Camaleão', 'Chameleon', { originality: 3 }),
  t('purist', 'creative', 'Purista', 'Purist', { originality: -3, quality: 3, trust: -3 }),
  t('charismatic', 'social', 'Carismático', 'Charismatic', { stage: 10, media: 8 }),
  t('loyal', 'social', 'Leal', 'Loyal', { loyalty: 15, trust: 5 }),
  t('competitive', 'social', 'Competitivo', 'Competitive', { stress: 3, quality: 2 }),
  t('diplomatic', 'social', 'Diplomático', 'Diplomatic', { morale: 3, trust: 3 }),
  t('manipulative', 'social', 'Manipulador', 'Manipulative', { scandal: 0.4, trust: -5, greed: 5 }),
  t('loner', 'social', 'Solitário', 'Loner', { media: -5, stage: -3 }),
  t('quarrelsome', 'social', 'Briguento', 'Quarrelsome', { scandal: 0.5, morale: -3 }),
  t('generous', 'social', 'Generoso', 'Generous', { trust: 4, greed: -6 }),
  t('disciplined', 'professional', 'Disciplinado', 'Disciplined', { quality: 3, fatigue: -3 }),
  t('punctual', 'professional', 'Pontual', 'Punctual', { stage: 2 }),
  t('workaholic', 'professional', 'Workaholic', 'Workaholic', { output: 0.3, fatigue: 6, stress: 4 }),
  t('lazy', 'professional', 'Preguiçoso', 'Lazy', { output: -0.3, fatigue: -3 }),
  t('opportunist', 'professional', 'Oportunista', 'Opportunist', { loyalty: -12, greed: 6 }),
  t('ambitious', 'professional', 'Ambicioso', 'Ambitious', { greed: 4, quality: 1 }),
  t('frugal', 'professional', 'Frugal', 'Frugal', { greed: -4 }),
  t('spendthrift', 'professional', 'Perdulário', 'Spendthrift', { greed: 6, scandal: 0.2 }),
  t('insecure', 'emotional', 'Inseguro', 'Insecure', { stress: 5, morale: -3 }),
  t('big_ego', 'emotional', 'Ego grande', 'Big ego', { greed: 5, trust: -3, media: 4, scandal: 0.2 }),
  t('resilient', 'emotional', 'Resiliente', 'Resilient', { stress: -5, morale: 4 }),
  t('anxious', 'emotional', 'Ansioso', 'Anxious', { stress: 6, stage: -4 }),
  t('impulsive', 'emotional', 'Impulsivo', 'Impulsive', { scandal: 0.4, originality: 3 }),
  t('melancholic', 'emotional', 'Melancólico', 'Melancholic', { quality: 3, morale: -3 }),
  t('optimist', 'emotional', 'Otimista', 'Optimist', { morale: 5 }),
  t('resentful', 'emotional', 'Rancoroso', 'Resentful', { trust: -4, loyalty: -5 }),
  t('media_savvy', 'public', 'Midiático', 'Media-savvy', { media: 12 }),
  t('shy', 'public', 'Tímido', 'Shy', { media: -8, stage: -4 }),
  t('controversial', 'public', 'Polêmico', 'Controversial', { scandal: 0.6, media: 6 }),
  t('engaged', 'public', 'Engajado', 'Engaged', { media: 3, trust: 2 }),
  t('reserved', 'public', 'Reservado', 'Reserved', { scandal: -0.3, media: -3 }),
];

export const traitById = Object.fromEntries(TRAITS.map((x) => [x.id, x])) as Record<string, TraitDef>;

export type AmbitionId = 'art' | 'fame' | 'money' | 'freedom' | 'critics' | 'security' | 'status' | 'legacy';
export const AMBITIONS: { id: AmbitionId; name: L }[] = [
  { id: 'art', name: l('Arte', 'Art') },
  { id: 'fame', name: l('Fama', 'Fame') },
  { id: 'money', name: l('Dinheiro', 'Money') },
  { id: 'freedom', name: l('Liberdade', 'Freedom') },
  { id: 'critics', name: l('Crítica', 'Critics') },
  { id: 'security', name: l('Segurança', 'Security') },
  { id: 'status', name: l('Status', 'Status') },
  { id: 'legacy', name: l('Legado', 'Legacy') },
];
export const ambitionName = Object.fromEntries(AMBITIONS.map((x) => [x.id, x.name])) as Record<AmbitionId, L>;

export interface OriginDef {
  id: string;
  name: L;
  bonus: Partial<Record<SkillId, number>>;
}

export const ORIGINS: OriginDef[] = [
  { id: 'self_taught', name: l('Autodidata', 'Self-taught'), bonus: { comp: 6, instr: 4, biz: -4 } },
  { id: 'conservatory', name: l('Conservatório', 'Conservatory'), bonus: { instr: 12, comp: 6, stage: -4 } },
  { id: 'church', name: l('Igreja e gospel', 'Church & gospel'), bonus: { voice: 12, stage: 4 } },
  { id: 'street', name: l('Escola de samba ou cena de rua', 'Samba school or street scene'), bonus: { stage: 10, instr: 4, biz: -2 } },
  { id: 'garage', name: l('Banda de garagem', 'Garage band'), bonus: { instr: 6, stage: 4 } },
  { id: 'talent_show', name: l('Festival de calouros', 'Talent contest'), bonus: { voice: 8, stage: 6 } },
  { id: 'family', name: l('Família de músicos', 'Musical family'), bonus: { instr: 8, comp: 4, biz: 3 } },
];

export interface AgendaAction {
  id: string;
  name: L;
  desc: L;
  cost: number; // dólares reais
}

const ag = (id: string, pt: string, en: string, dpt: string, den: string, cost = 0): AgendaAction => ({ id, name: l(pt, en), desc: l(dpt, den), cost });

/** 12 ações de agenda (GDD §9) + 2 de produção */
export const AGENDA_ACTIONS: AgendaAction[] = [
  ag('train', 'Treino', 'Training', 'Sobe voz/instrumento; retorno decrescente.', 'Raises voice/instrument; diminishing returns.', 300),
  ag('workshop', 'Oficina', 'Workshop', 'Sobe composição e escrita.', 'Raises composition and lyrics.', 400),
  ag('rehearse', 'Ensaio', 'Rehearsal', 'Melhora a próxima gravação e o palco.', 'Improves next recording and stage.', 150),
  ag('opening', 'Abertura', 'Opening slot', 'Abre shows de um ato maior: fama e fãs.', 'Open for a bigger act: fame and fans.', 0),
  ag('networking', 'Networking', 'Networking', 'Contatos: melhora ofertas de festivais e mídia.', 'Contacts: better festival and media offers.', 200),
  ag('interview', 'Entrevista', 'Interview', 'Momento e fama, risco de declaração polêmica.', 'Momentum and fame; risk of a controversial remark.', 0),
  ag('residency_art', 'Residência artística', 'Art residency', 'Inspiração e originalidade.', 'Inspiration and originality.', 800),
  ag('side_job', 'Trabalho paralelo', 'Side job', 'Dinheiro para o artista; cansa.', 'Money for the artist; tiring.', 0),
  ag('feat', 'Feat', 'Feature', 'Participação com outro ato: alcance cruzado.', 'Guest spot with another act: cross reach.', 0),
  ag('rest', 'Pausa', 'Rest', 'Recupera fadiga e estresse.', 'Recovers fatigue and stress.', 0),
  ag('social', 'Projeto social', 'Social project', 'Reputação e moral.', 'Reputation and morale.', 500),
  ag('reposition', 'Reposicionamento', 'Repositioning', 'Move entre underground e crossover.', 'Moves between underground and crossover.', 1500),
  ag('compose', 'Compor', 'Write songs', 'Escreve 1–2 músicas.', 'Writes 1–2 songs.', 0),
  ag('record', 'Gravar', 'Record', 'Grava músicas escritas (2 slots).', 'Records written songs (2 slots).', 0),
  ag('gigs', 'Shows', 'Gigs', 'Faz shows no mês (casa e datas).', 'Plays shows this month (venue and dates).', 0),
];

export const agendaById = Object.fromEntries(AGENDA_ACTIONS.map((x) => [x.id, x])) as Record<string, AgendaAction>;

// ---------- Nomes ----------
export const FIRST_NAMES: Record<NameGroup, string[]> = {
  en: ['James', 'Ruth', 'Otis', 'Mabel', 'Floyd', 'Hazel', 'Ray', 'Dolores', 'Eddie', 'June', 'Clyde', 'Irene', 'Wes', 'Lorna', 'Dean', 'Carla', 'Nate', 'Tess', 'Grady', 'Opal', 'Miles', 'Vera', 'Silas', 'Harriet', 'Calvin', 'Nora', 'Reggie', 'Ivy', 'Toby', 'Sadie', 'Abe', 'Lula', 'Marty', 'Cora', 'Jody', 'Rex', 'Della', 'Kit', 'Quinn', 'Jade', 'Ezra', 'Maya', 'Leon', 'Skye', 'Owen', 'Piper', 'Dex', 'Wren'],
  pt: ['João', 'Maria', 'Benedito', 'Aurora', 'Severino', 'Iracema', 'Moacir', 'Dalva', 'Joaquim', 'Celeste', 'Wilson', 'Nair', 'Raimundo', 'Clementina', 'Otávio', 'Glória', 'Paulinho', 'Zélia', 'Tião', 'Rosa', 'Caetano', 'Beatriz', 'Renato', 'Marina', 'Diogo', 'Luana', 'Thiago', 'Jéssica', 'Rafa', 'Duda', 'Heitor', 'Iara', 'Vinícius', 'Cida', 'Ivo', 'Tereza'],
  es: ['Carlos', 'Rosario', 'Ernesto', 'Lupita', 'Andrés', 'Pilar', 'Mateo', 'Ximena', 'Rafael', 'Inés', 'Tomás', 'Celia', 'Diego', 'Paloma', 'Julio', 'Marisol', 'Hugo', 'Valeria', 'Ramón', 'Soledad', 'Nico', 'Luz'],
  fr: ['Jacques', 'Simone', 'Émile', 'Colette', 'Lucien', 'Odile', 'Marcel', 'Juliette', 'Théo', 'Camille', 'Hugo', 'Léa', 'Raoul', 'Margaux'],
  de: ['Klaus', 'Ingrid', 'Florian', 'Greta', 'Ralf', 'Ute', 'Jürgen', 'Heike', 'Stefan', 'Anke', 'Lukas', 'Lena'],
  it: ['Gino', 'Ornella', 'Lucio', 'Rita', 'Franco', 'Patrizia', 'Marco', 'Giulia', 'Enzo', 'Chiara'],
  sv: ['Björn', 'Agneta', 'Lasse', 'Frida', 'Max', 'Linnea', 'Sven', 'Elsa', 'Nils', 'Saga'],
  ja: ['Haruomi', 'Akiko', 'Kenji', 'Yumi', 'Takashi', 'Mariya', 'Ryo', 'Hana', 'Sora', 'Rin', 'Daiki', 'Mei'],
  ko: ['Min-jun', 'Seo-yeon', 'Ji-hoon', 'Ha-eun', 'Tae-yang', 'Yuna', 'Jin', 'Soo-ah', 'Hyun', 'Da-eun'],
  hi: ['Arjun', 'Lata', 'Kishore', 'Asha', 'Rahul', 'Shreya', 'Vikram', 'Anaya', 'Dev', 'Kavya'],
  zh: ['Wing', 'Faye', 'Ka-ho', 'Mei-ling', 'Jacky', 'Anita', 'Leon', 'Shirley'],
  th: ['Somchai', 'Pimchanok', 'Anan', 'Siriporn', 'Niran', 'Ploy'],
  ar: ['Karim', 'Fairuza', 'Omar', 'Leila', 'Tarek', 'Yasmin', 'Nabil', 'Samira'],
  tr: ['Barış', 'Sezen', 'Cem', 'Ajda', 'Emre', 'Zeynep'],
  yo: ['Kayode', 'Folake', 'Tunde', 'Yemisi', 'Femi', 'Bisi', 'Seun', 'Tiwa', 'Dayo', 'Ayo'],
  zu: ['Sipho', 'Thandi', 'Bongani', 'Lerato', 'Themba', 'Nomsa'],
  wo: ['Moussa', 'Awa', 'Ibrahima', 'Fatou', 'Cheikh', 'Aminata'],
};

export const LAST_NAMES: Record<NameGroup, string[]> = {
  en: ['Hollis', 'Mercer', 'Talbot', 'Graves', 'Whitlock', 'Bramble', 'Danvers', 'Pryor', 'Lowell', 'Sutter', 'Keene', 'Ashby', 'Rourke', 'Vance', 'Fairley', 'Calloway', 'Marsh', 'Teller', 'Brennan', 'Holloway', 'Crane', 'Barlow', 'Hatch', 'Ridley', 'Stroud', 'Quill', 'Winslow', 'Gale'],
  pt: ['Silva', 'Nogueira', 'Bastos', 'Ribeiro', 'Viana', 'Monteiro', 'Lacerda', 'Prado', 'Batista', 'Moura', 'Cardoso', 'Teles', 'Aragão', 'Brito', 'Falcão', 'Peixoto', 'Rangel', 'Sampaio', 'Valente', 'Quintela', 'Barreto', 'Leal'],
  es: ['Morales', 'Iriarte', 'Cifuentes', 'Ocampo', 'Valdés', 'Robles', 'Salcedo', 'Fuentes', 'Arriaga', 'Montaner', 'Quiroga', 'Bustos'],
  fr: ['Delorme', 'Marchand', 'Fournier', 'Lacombe', 'Vautrin', 'Beaumont', 'Charrier', 'Moreau'],
  de: ['Hartmann', 'Brandt', 'Kessler', 'Vogt', 'Lindner', 'Albers', 'Wendt'],
  it: ['Ferraro', 'Bellini', 'Marchetti', 'Caruso', 'Rinaldi', 'Gallo'],
  sv: ['Lindqvist', 'Berglund', 'Ekström', 'Sandberg', 'Holm', 'Nyström'],
  ja: ['Hosono', 'Takeuchi', 'Mori', 'Sakai', 'Fujita', 'Ishikawa', 'Kaneko', 'Ono'],
  ko: ['Kim', 'Park', 'Lee', 'Choi', 'Jung', 'Kang', 'Yoon', 'Han'],
  hi: ['Sharma', 'Kapoor', 'Iyer', 'Mehta', 'Rao', 'Desai', 'Bhatt'],
  zh: ['Chan', 'Leung', 'Wong', 'Lau', 'Cheung', 'Tam'],
  th: ['Srisuk', 'Chaiyasit', 'Boonmee', 'Kittisak'],
  ar: ['Haddad', 'Nassar', 'Khoury', 'Mansour', 'Saleh', 'Darwish'],
  tr: ['Yılmaz', 'Demir', 'Aksoy', 'Kaya', 'Şahin'],
  yo: ['Adeyemi', 'Okafor', 'Balogun', 'Adebayo', 'Olatunji', 'Ogunleye'],
  zu: ['Dlamini', 'Nkosi', 'Mokoena', 'Khumalo', 'Zulu'],
  wo: ['Ndiaye', 'Diop', 'Sow', 'Fall', 'Seck'],
};

export const BAND_WORDS = {
  enAdj: ['Iron', 'Velvet', 'Silver', 'Hollow', 'Crimson', 'Electric', 'Paper', 'Static', 'Golden', 'Midnight', 'Neon', 'Broken', 'Wild', 'Quiet', 'Atomic', 'Lunar', 'Rusty', 'Glass', 'Faded', 'Copper', 'Savage', 'Gentle', 'Tidal', 'Feral'],
  enNoun: ['Falcon', 'Harbor', 'Engine', 'Garden', 'Signal', 'Parade', 'Lantern', 'Orchard', 'Machine', 'Comet', 'Avenue', 'Mirror', 'Canyon', 'Cathedral', 'Circuit', 'Ember', 'Tide', 'Prophet', 'Monarch', 'Satellite', 'Fever', 'Atlas'],
  enPlural: ['Ramblers', 'Drifters', 'Wanderers', 'Kings', 'Sparrows', 'Outlaws', 'Rockets', 'Saints', 'Strangers', 'Vipers', 'Dreamers', 'Hornets', 'Ravens', 'Echoes', 'Mavericks', 'Shadows', 'Pilots', 'Comets'],
  ptPlural: ['Os Vagalumes', 'Os Corsários', 'Os Brasas', 'Os Lunáticos', 'Os Andarilhos', 'Os Trovadores', 'Os Cometas', 'Os Faroleiros', 'Os Retirantes', 'Os Malandros'],
  ptNoun: ['Planalto', 'Sertão', 'Farol', 'Asfalto', 'Mangue', 'Garoa', 'Cerrado', 'Litoral', 'Concreto', 'Sereno'],
  ptColor: ['Vermelho', 'Azul', 'Dourado', 'Elétrico', 'Neon', 'Cinza', 'Selvagem', 'Noturno'],
  esPlural: ['Los Cometas', 'Los Viajeros', 'Los Halcones', 'Los Fantasmas', 'Los Corsarios', 'Los Relámpagos'],
  deWord: ['Lichtstrom', 'Nachtzug', 'Eisenherz', 'Kaltfront', 'Tonwelle', 'Funkturm', 'Stahlregen'],
  frWord: ['Verre Noir', 'Ciel Rouge', 'Lune Froide', 'Nuit Bleue', 'Écho Blanc', 'Onde Douce'],
  idolNoun: ['Crescent', 'Prism', 'Stellar', 'Blossom', 'Nova', 'Aurora', 'Galaxy', 'Velvet', 'Comet'],
  synthPrefix: ['Aiko', 'Lumi', 'Nyx', 'Vela', 'Iro', 'Kiri', 'Sola', 'Yume'],
  synthNoun: ['Prism', 'Halo', 'Glow', 'Shine', 'Lux', 'Spark', 'Ray', 'Beam'],
  collective: ['Collective', 'Orchestra', 'Ensemble', 'Sound System', 'Society'],
};

export const SONG_WORDS = {
  en: {
    a: ['Midnight', 'Blue', 'Lonely', 'Golden', 'Electric', 'Broken', 'Sweet', 'Wild', 'Silver', 'Neon', 'Burning', 'Paper', 'Velvet', 'Restless', 'Endless', 'Quiet', 'Crazy', 'Last', 'Little', 'Heavy'],
    b: ['Train', 'Heart', 'River', 'Highway', 'Dream', 'Rain', 'Night', 'Fire', 'Love', 'Moon', 'Road', 'Summer', 'Shadow', 'Radio', 'Kiss', 'Avenue', 'Ghost', 'Garden', 'Signal', 'Dance'],
    solo: ['Stay', 'Runaway', 'Hold On', 'Tonight', 'Gravity', 'Echo', 'Wildfire', 'Fever', 'Satellite', 'Home', 'Overdrive', 'Daydream'],
  },
  pt: {
    a: ['Coração', 'Noite', 'Saudade', 'Lua', 'Estrada', 'Chuva', 'Samba', 'Asfalto', 'Mar', 'Rosa', 'Sol', 'Tempo', 'Vento', 'Morena', 'Cidade', 'Fogo'],
    b: ['de Papel', 'Azul', 'Sem Fim', 'do Sertão', 'Vadia', 'de Verão', 'Elétrica', 'Perdida', 'de Neon', 'Serena', 'do Morro', 'Proibida', 'Bandida', 'de Cristal'],
    solo: ['Fica', 'Madrugada', 'Desatino', 'Balanço', 'Primavera', 'Partida', 'Aquarela', 'Miragem', 'Cais', 'Ventania'],
  },
  es: {
    a: ['Corazón', 'Noche', 'Luna', 'Camino', 'Fuego', 'Amor', 'Lluvia', 'Sol', 'Ciudad'],
    b: ['Perdido', 'de Plata', 'Sin Fin', 'Salvaje', 'Eterno', 'de Cristal', 'Azul', 'Callejero'],
    solo: ['Quédate', 'Bésame', 'Tormenta', 'Locura', 'Madrugada', 'Fuego'],
  },
};
