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

export type TraitGroup = 'creative' | 'social' | 'professional' | 'emotional' | 'public' | 'temper';

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
  // temperamento (rodada 6): puxa para certos gêneros (ver GENRE_AFFINITY)
  t('rebel', 'temper', 'Rebelde', 'Rebel', { originality: 4, scandal: 0.3, trust: -2 }),
  t('romantic', 'temper', 'Romântico', 'Romantic', { quality: 1, morale: 2 }),
  t('spiritual', 'temper', 'Espiritual', 'Spiritual', { stress: -3, scandal: -0.2 }),
  t('party', 'temper', 'Festeiro', 'Party animal', { stage: 4, fatigue: 3, scandal: 0.2 }),
  t('intellectual', 'temper', 'Intelectual', 'Intellectual', { originality: 4, media: -2 }),
  t('street', 'temper', 'Cria da rua', 'Street-raised', { originality: 3, trust: -2, media: 2 }),
  t('rooted', 'temper', 'Raiz', 'Rooted', { quality: 2, originality: -2, loyalty: 5 }),
  t('dreamer', 'temper', 'Sonhador', 'Dreamer', { originality: 5, output: -0.1 }),
  t('virtuoso', 'temper', 'Virtuoso', 'Virtuoso', { quality: 5, stress: 2 }),
];

/** Afinidade de traços com famílias de gênero (rodada 6): rebeldia puxa para o rock, espiritualidade
 *  para o sagrado e o reggae, festa para a eletrônica e a disco… −1..+1 por família. */
export const GENRE_AFFINITY: Record<string, Partial<Record<string, number>>> = {
  rebel: { rock: 1, hiphop: 0.8, caribbean: 0.4, electronic: 0.3, latin: 0.2, sacred: -0.8, pop: -0.3, europe: -0.2 },
  romantic: { latin: 0.8, pop: 0.7, rnb: 0.6, brazil: 0.6, europe: 0.4, country_folk: 0.3, hiphop: -0.2 },
  spiritual: { sacred: 1, caribbean: 0.6, africa: 0.5, rnb: 0.4, asia_me: 0.5, electronic: -0.2 },
  party: { electronic: 0.9, rnb: 0.6, latin: 0.6, pop: 0.5, brazil: 0.5, caribbean: 0.4, sacred: -0.7, country_folk: -0.2 },
  intellectual: { blues_jazz: 0.8, sacred: 0.6, europe: 0.6, electronic: 0.3, brazil: 0.3, rock: 0.2, pop: -0.4 },
  street: { hiphop: 1, caribbean: 0.6, rnb: 0.4, latin: 0.4, africa: 0.4, brazil: 0.4, sacred: -0.5, europe: -0.3 },
  rooted: { country_folk: 0.9, blues_jazz: 0.6, brazil: 0.5, africa: 0.5, europe: 0.4, sacred: 0.3, electronic: -0.6 },
  dreamer: { electronic: 0.5, pop: 0.4, rock: 0.4, europe: 0.3, asia_me: 0.2 },
  virtuoso: { blues_jazz: 0.8, sacred: 0.8, rock: 0.3, latin: 0.3, hiphop: -0.3 },
  experimental: { electronic: 0.5, blues_jazz: 0.4, rock: 0.3, pop: -0.3 },
  melancholic: { blues_jazz: 0.6, country_folk: 0.5, rock: 0.3, europe: 0.3 },
  charismatic: { pop: 0.5, rnb: 0.3, latin: 0.3 },
  perfectionist: { sacred: 0.4, blues_jazz: 0.3, electronic: 0.2 },
  controversial: { hiphop: 0.4, rock: 0.4, pop: 0.2 },
};

export const TEMPER_TRAITS = TRAITS.filter((x) => x.group === 'temper').map((x) => x.id);

/** Afinidade (−1..+1 aprox.) de um conjunto de traços com uma família de gênero. */
export function traitAffinity(traits: string[], family: string): number {
  let v = 0;
  for (const tr of traits) v += GENRE_AFFINITY[tr]?.[family] ?? 0;
  return v;
}

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
// r21 (C-9): nomes separados por sexo e idioma. `FIRST_NAMES` continua exportado como união (intercalada m/f,
// a mesma ordem de antes para quase todos os idiomas) — quem sorteia sem sexo consome o Rng exatamente como antes.
export const FIRST_NAMES_M: Record<NameGroup, string[]> = {
  en: ['James', 'Otis', 'Floyd', 'Ray', 'Eddie', 'Clyde', 'Wes', 'Dean', 'Nate', 'Grady', 'Miles', 'Silas', 'Calvin', 'Reggie', 'Toby', 'Abe', 'Marty', 'Rex', 'Ezra', 'Leon', 'Owen', 'Dex'],
  pt: ['João', 'Benedito', 'Severino', 'Moacir', 'Joaquim', 'Wilson', 'Raimundo', 'Otávio', 'Paulinho', 'Tião', 'Caetano', 'Renato', 'Diogo', 'Thiago', 'Rafa', 'Heitor', 'Vinícius', 'Ivo'],
  es: ['Carlos', 'Ernesto', 'Andrés', 'Mateo', 'Rafael', 'Tomás', 'Diego', 'Julio', 'Hugo', 'Ramón', 'Nico'],
  fr: ['Jacques', 'Émile', 'Lucien', 'Marcel', 'Théo', 'Hugo', 'Raoul'],
  de: ['Klaus', 'Florian', 'Ralf', 'Jürgen', 'Stefan', 'Lukas'],
  it: ['Gino', 'Lucio', 'Franco', 'Marco', 'Enzo'],
  sv: ['Björn', 'Lasse', 'Max', 'Sven', 'Nils'],
  ja: ['Haruomi', 'Kenji', 'Takashi', 'Ryo', 'Sora', 'Daiki'],
  ko: ['Min-jun', 'Ji-hoon', 'Tae-yang', 'Jin', 'Hyun'],
  hi: ['Arjun', 'Kishore', 'Rahul', 'Vikram', 'Dev'],
  zh: ['Wing', 'Ka-ho', 'Jacky', 'Leon'],
  th: ['Somchai', 'Anan', 'Niran'],
  ar: ['Karim', 'Omar', 'Tarek', 'Nabil'],
  tr: ['Barış', 'Cem', 'Emre'],
  yo: ['Kayode', 'Tunde', 'Femi', 'Seun', 'Dayo'],
  zu: ['Sipho', 'Bongani', 'Themba'],
  wo: ['Moussa', 'Ibrahima', 'Cheikh'],
  ru: ['Mikhail', 'Viktor', 'Sergei', 'Dmitri', 'Pavel'],
  pl: ['Krzysztof', 'Tomasz', 'Piotr', 'Jakub'],
  nl: ['Joost', 'Sander', 'Ruud', 'Bram'],
  el: ['Giorgos', 'Nikos', 'Kostas', 'Yannis'],
  fa: ['Reza', 'Kourosh', 'Arash', 'Babak'],
  he: ['Avi', 'Eitan', 'Omer', 'Ido'],
  sw: ['Juma', 'Baraka', 'Hamisi', 'Rashidi'],
  am: ['Yonas', 'Tesfaye', 'Dawit', 'Bereket'],
  vi: ['Minh', 'Tuan', 'Quang', 'Duc'],
  id: ['Budi', 'Agus', 'Rizky', 'Eko'],
  tl: ['Jose', 'Ramon', 'Paolo', 'Carlo'],
  ms: ['Ahmad', 'Hafiz', 'Faizal', 'Zul'],
  ln: ['Jean', 'Didier', 'Héritier', 'Patrick'],
  hu: ['László', 'Gábor', 'Attila'],
  cs: ['Jiří', 'Pavel', 'Tomáš'],
  da: ['Søren', 'Mads', 'Anders'],
  no: ['Ola', 'Håkon', 'Espen'],
  fi: ['Mikko', 'Jari', 'Ville'],
  is: ['Jón', 'Sigurður', 'Einar'],
  ur: ['Ali', 'Imran', 'Fawad', 'Bilal'],
  bn: ['Sourav', 'Anupam', 'Arnab'],
  ak: ['Kwame', 'Kofi', 'Yaw', 'Kojo'],
  sr: ['Dragan', 'Miloš', 'Nemanja'],
  uk: ['Taras', 'Andriy', 'Bohdan'],
  // r19 WP0: idiomas das cidades novas
  ro: ['Andrei', 'Mihai', 'Florin', 'Radu'],
  bg: ['Georgi', 'Ivan', 'Dimitar', 'Petar'],
  hr: ['Ivan', 'Josip', 'Tomislav', 'Darko'],
  ka: ['Giorgi', 'Davit', 'Levan', 'Irakli'],
  hy: ['Aram', 'Tigran', 'Gor', 'Vardan'],
  lt: ['Jonas', 'Mindaugas', 'Raimonds', 'Andris'],
  et: ['Tõnu', 'Jaan', 'Margus', 'Rein'],
  my: ['Aung', 'Min', 'Kyaw', 'Zaw'],
  km: ['Sinn', 'Pen', 'Sovann', 'Dara'],
  si: ['Nimal', 'Sunil', 'Ruwan', 'Pradeep'],
  sq: ['Arben', 'Besnik', 'Genc', 'Ilir'],
};

export const FIRST_NAMES_F: Record<NameGroup, string[]> = {
  en: ['Ruth', 'Mabel', 'Hazel', 'Dolores', 'June', 'Irene', 'Lorna', 'Carla', 'Tess', 'Opal', 'Vera', 'Harriet', 'Nora', 'Ivy', 'Sadie', 'Lula', 'Cora', 'Jody', 'Della', 'Kit', 'Quinn', 'Jade', 'Maya', 'Skye', 'Piper', 'Wren'],
  pt: ['Maria', 'Aurora', 'Iracema', 'Dalva', 'Celeste', 'Nair', 'Clementina', 'Glória', 'Zélia', 'Rosa', 'Beatriz', 'Marina', 'Luana', 'Jéssica', 'Duda', 'Iara', 'Cida', 'Tereza'],
  es: ['Rosario', 'Lupita', 'Pilar', 'Ximena', 'Inés', 'Celia', 'Paloma', 'Marisol', 'Valeria', 'Soledad', 'Luz'],
  fr: ['Simone', 'Colette', 'Odile', 'Juliette', 'Camille', 'Léa', 'Margaux'],
  de: ['Ingrid', 'Greta', 'Ute', 'Heike', 'Anke', 'Lena'],
  it: ['Ornella', 'Rita', 'Patrizia', 'Giulia', 'Chiara'],
  sv: ['Agneta', 'Frida', 'Linnea', 'Elsa', 'Saga'],
  ja: ['Akiko', 'Yumi', 'Mariya', 'Hana', 'Rin', 'Mei'],
  ko: ['Seo-yeon', 'Ha-eun', 'Yuna', 'Soo-ah', 'Da-eun'],
  hi: ['Lata', 'Asha', 'Shreya', 'Anaya', 'Kavya'],
  zh: ['Faye', 'Mei-ling', 'Anita', 'Shirley'],
  th: ['Pimchanok', 'Siriporn', 'Ploy'],
  ar: ['Fairuza', 'Leila', 'Yasmin', 'Samira'],
  tr: ['Sezen', 'Ajda', 'Zeynep'],
  yo: ['Folake', 'Yemisi', 'Bisi', 'Tiwa', 'Ayo'],
  zu: ['Thandi', 'Lerato', 'Nomsa'],
  wo: ['Awa', 'Fatou', 'Aminata'],
  ru: ['Anna', 'Olga', 'Tatiana', 'Irina', 'Yelena'],
  pl: ['Agnieszka', 'Ewa', 'Magda', 'Zofia'],
  nl: ['Marieke', 'Femke', 'Anouk', 'Lieke'],
  el: ['Eleni', 'Maria', 'Despina', 'Sofia'],
  fa: ['Parisa', 'Shirin', 'Mahsa', 'Nasrin'],
  he: ['Noa', 'Yael', 'Tamar', 'Shira'],
  sw: ['Neema', 'Zawadi', 'Amani', 'Imani'],
  am: ['Tigist', 'Meskerem', 'Selam', 'Hiwot'],
  vi: ['Lan', 'Huong', 'Thao', 'Mai'],
  id: ['Sari', 'Dewi', 'Putri', 'Ayu'],
  tl: ['Luzviminda', 'Imelda', 'Liza', 'Bea'],
  ms: ['Siti', 'Nurul', 'Aisyah', 'Mira'],
  ln: ['Mamie', 'Esther', 'Nathalie', 'Grace'],
  hu: ['Zsuzsa', 'Katalin', 'Eszter'],
  cs: ['Marta', 'Hana', 'Lenka'],
  da: ['Mette', 'Line', 'Freja'],
  no: ['Ingrid', 'Kari', 'Sigrid'],
  fi: ['Aino', 'Liisa', 'Satu'],
  is: ['Guðrún', 'Katrín', 'Hrafnhildur'],
  ur: ['Ayesha', 'Nazia', 'Sanam', 'Hina'],
  bn: ['Rupa', 'Mousumi', 'Ritu'],
  ak: ['Ama', 'Efua', 'Akosua', 'Abena'],
  sr: ['Vesna', 'Jelena', 'Ana'],
  uk: ['Oksana', 'Nataliya', 'Iryna'],
  ro: ['Ioana', 'Elena', 'Ana', 'Corina'],
  bg: ['Maria', 'Desislava', 'Lili', 'Vasilka'],
  hr: ['Ana', 'Marija', 'Lana', 'Neda'],
  ka: ['Nino', 'Tamar', 'Ketevan', 'Mariam'],
  hy: ['Anahit', 'Lilit', 'Siranush', 'Arpi'],
  lt: ['Rūta', 'Ieva', 'Laima', 'Inga'],
  et: ['Kristiina', 'Liis', 'Kadri', 'Anu'],
  my: ['Thida', 'Hnin', 'Su', 'Nilar'],
  km: ['Ros', 'Sophea', 'Chanthy', 'Bopha'],
  si: ['Kumari', 'Chandrika', 'Dilani', 'Ishara'],
  sq: ['Elira', 'Dua', 'Rita', 'Era'],
};

/** União intercalada (m, f, m, f…) — compatibilidade com quem sorteia sem sexo. */
export const FIRST_NAMES: Record<NameGroup, string[]> = Object.fromEntries(
  (Object.keys(FIRST_NAMES_M) as NameGroup[]).map((lang) => {
    const m = FIRST_NAMES_M[lang], f = FIRST_NAMES_F[lang], out: string[] = [];
    for (let i = 0; i < Math.max(m.length, f.length); i++) { if (m[i]) out.push(m[i]); if (f[i]) out.push(f[i]); }
    return [lang, out];
  }),
) as Record<NameGroup, string[]>;

/** Mapa primeiro nome → sexo (nomes que aparecem nos dois sexos ficam de fora). */
const SEX_BY_NAME: Record<string, 'm' | 'f' | 'x'> = {};
for (const [sx, tab] of [['m', FIRST_NAMES_M], ['f', FIRST_NAMES_F]] as const) {
  for (const list of Object.values(tab)) for (const n of list) {
    const k = n.toLowerCase();
    SEX_BY_NAME[k] = SEX_BY_NAME[k] && SEX_BY_NAME[k] !== sx ? 'x' : sx;
  }
}
/** Sexo provável pelo primeiro nome (listas geradas); `undefined` = desconhecido/ambíguo. */
export function sexByName(name: string): 'm' | 'f' | undefined {
  const first = name.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  const v = SEX_BY_NAME[first];
  return v === 'm' || v === 'f' ? v : undefined;
}

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
  ru: ['Volkov', 'Orlova', 'Belov', 'Sokolov', 'Kuznetsov', 'Morozov', 'Lebedev'],
  pl: ['Nowak', 'Kowalczyk', 'Wiśniewski', 'Zieliński', 'Lewandowski', 'Mazur'],
  nl: ['de Vries', 'Jansen', 'Bakker', 'Visser', 'Smit', 'van Dijk'],
  el: ['Papadopoulos', 'Nikolaou', 'Georgiou', 'Dimitriou', 'Kostopoulos', 'Vlachou'],
  fa: ['Tehrani', 'Karimi', 'Moradi', 'Rahimi', 'Jafari', 'Ahmadi'],
  he: ['Cohen', 'Levi', 'Mizrahi', 'Peretz', 'Biton', 'Friedman'],
  sw: ['Mwangi', 'Otieno', 'Kamau', 'Odhiambo', 'Mrisho', 'Salim'],
  am: ['Bekele', 'Tadesse', 'Haile', 'Girma', 'Alemu', 'Kebede'],
  vi: ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Vu'],
  id: ['Santoso', 'Wijaya', 'Hidayat', 'Kusuma', 'Pratama', 'Saputra'],
  tl: ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Mendoza', 'Villanueva'],
  ms: ['Rahman', 'Ismail', 'Hassan', 'Abdullah', 'Yusof', 'Osman'],
  ln: ['Mbemba', 'Mukendi', 'Tshibangu', 'Kalonji', 'Nzeza', 'Ilunga'],
  hu: ['Nagy', 'Kovács', 'Tóth', 'Szabó', 'Horváth'],
  cs: ['Novák', 'Dvořák', 'Svoboda', 'Černý', 'Procházka'],
  da: ['Jensen', 'Nielsen', 'Hansen', 'Larsen', 'Kristensen'],
  no: ['Johansen', 'Olsen', 'Berg', 'Haugen', 'Dahl'],
  fi: ['Virtanen', 'Korhonen', 'Mäkinen', 'Nieminen', 'Laine'],
  is: ['Jónsdóttir', 'Sigurðsson', 'Magnússon', 'Einarsdóttir', 'Gunnarsson'],
  ur: ['Khan', 'Qureshi', 'Siddiqui', 'Malik', 'Chaudhry', 'Hashmi'],
  bn: ['Banerjee', 'Chatterjee', 'Sen', 'Bose', 'Ghosh', 'Das'],
  ak: ['Mensah', 'Owusu', 'Boateng', 'Asante', 'Osei', 'Amoako'],
  sr: ['Petrović', 'Jovanović', 'Nikolić', 'Marković', 'Đorđević'],
  uk: ['Shevchenko', 'Kovalenko', 'Bondarenko', 'Tkachenko', 'Melnyk'],
  ro: ['Popescu', 'Ionescu', 'Dumitrescu', 'Stan', 'Constantin', 'Georgescu'],
  bg: ['Ivanov', 'Petrova', 'Dimitrov', 'Georgieva', 'Stoyanov', 'Todorova'],
  hr: ['Horvat', 'Kovačević', 'Babić', 'Novak', 'Jurić', 'Knežević'],
  ka: ['Beridze', 'Kapanadze', 'Gelashvili', 'Maisuradze', 'Tsiklauri', 'Lomidze'],
  hy: ['Grigoryan', 'Sargsyan', 'Hakobyan', 'Petrosyan', 'Avetisyan', 'Harutyunyan'],
  lt: ['Kazlauskas', 'Petrauskaitė', 'Bērziņš', 'Ozola', 'Jankauskas', 'Kalniņš'],
  et: ['Tamm', 'Saar', 'Sepp', 'Mägi', 'Kask', 'Kukk'],
  my: ['Win', 'Myint', 'Htun', 'Oo', 'Naing', 'Thein'],
  km: ['Sok', 'Chea', 'Sam', 'Heng', 'Keo', 'Meas'],
  si: ['Perera', 'Fernando', 'de Silva', 'Jayasuriya', 'Bandara', 'Wickramasinghe'],
  sq: ['Hoxha', 'Shehu', 'Krasniqi', 'Gashi', 'Berisha', 'Leka'],
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
    a: ['Midnight', 'Blue', 'Lonely', 'Golden', 'Electric', 'Broken', 'Sweet', 'Wild', 'Silver', 'Neon', 'Burning', 'Paper', 'Velvet', 'Restless', 'Endless', 'Quiet', 'Crazy', 'Last', 'Little', 'Heavy', 'Hollow', 'Crimson', 'Distant', 'Secret', 'Fading', 'Starlit', 'Northern', 'Lucky', 'Dirty', 'Holy', 'Radio', 'Glass', 'Cherry', 'Diamond', 'Lost', 'Hungry', 'Faded', 'Purple', 'Sunday', 'Brave', 'Gentle', 'Strange', 'Wicked', 'Tender', 'Cosmic'],
    b: ['Train', 'Heart', 'River', 'Highway', 'Dream', 'Rain', 'Night', 'Fire', 'Love', 'Moon', 'Road', 'Summer', 'Shadow', 'Radio', 'Kiss', 'Avenue', 'Ghost', 'Garden', 'Signal', 'Dance', 'Letter', 'Mirror', 'Paradise', 'Thunder', 'Window', 'Angel', 'Lullaby', 'Promise', 'Ocean', 'Season', 'Stranger', 'Morning', 'Boulevard', 'Waltz', 'Machine', 'Horizon', 'Memory', 'Carousel', 'Hurricane', 'Telephone', 'Valentine', 'Rodeo', 'Parade', 'Lantern', 'Sermon'],
    solo: ['Stay', 'Runaway', 'Hold On', 'Tonight', 'Gravity', 'Echo', 'Wildfire', 'Fever', 'Satellite', 'Home', 'Overdrive', 'Daydream', 'Breathe', 'Sugar', 'Heroes', 'Gasoline', 'Halo', 'Lightning', 'Wanderlust', 'Unchained', 'Oblivion', 'Magnolia', 'Kaleidoscope', 'Afterglow', 'Undertow', 'Resurrection', 'Vertigo', 'Monsoon', 'Serenade', 'Tightrope', 'Elegy', 'Jubilee'],
  },
  pt: {
    a: ['Coração', 'Noite', 'Saudade', 'Lua', 'Estrada', 'Chuva', 'Samba', 'Asfalto', 'Mar', 'Rosa', 'Sol', 'Tempo', 'Vento', 'Morena', 'Cidade', 'Fogo', 'Janela', 'Ciranda', 'Varanda', 'Areia', 'Sereia', 'Canção', 'Tarde', 'Menina', 'Ladeira', 'Promessa', 'Estrela', 'Flor', 'Carta', 'Viola', 'Maré', 'Alegria', 'Ilusão', 'Pandeiro'],
    b: ['de Papel', 'Azul', 'Sem Fim', 'do Sertão', 'Vadia', 'de Verão', 'Elétrica', 'Perdida', 'de Neon', 'Serena', 'do Morro', 'Proibida', 'Bandida', 'de Cristal', 'Dourada', 'do Cais', 'Calada', 'de Abril', 'Morena', 'do Interior', 'Distante', 'de Fevereiro', 'Imensa', 'do Subúrbio', 'Sincera', 'de Algodão', 'Encantada', 'da Serra', 'Inquieta'],
    solo: ['Fica', 'Madrugada', 'Desatino', 'Balanço', 'Primavera', 'Partida', 'Aquarela', 'Miragem', 'Cais', 'Ventania', 'Cafuné', 'Maresia', 'Batucada', 'Travessia', 'Sereno', 'Tropicália', 'Recomeço', 'Cantiga', 'Feitiço', 'Quimera', 'Fim de Tarde', 'Guarânia', 'Xodó', 'Desencontro', 'Arrebol'],
  },
  es: {
    a: ['Corazón', 'Noche', 'Luna', 'Camino', 'Fuego', 'Amor', 'Lluvia', 'Sol', 'Ciudad', 'Sueño', 'Ventana', 'Tarde', 'Estrella', 'Guitarra', 'Mar', 'Flor', 'Río', 'Sombra', 'Carta'],
    b: ['Perdido', 'de Plata', 'Sin Fin', 'Salvaje', 'Eterno', 'de Cristal', 'Azul', 'Callejero', 'de Fuego', 'Dormido', 'Lejano', 'de Mayo', 'Rebelde', 'Herido', 'Dorado', 'del Sur', 'Prohibido'],
    solo: ['Quédate', 'Bésame', 'Tormenta', 'Locura', 'Madrugada', 'Fuego', 'Despacio', 'Volver', 'Contigo', 'Mentiras', 'Bailando', 'Olvido', 'Destino', 'Nostalgia', 'Mariposa', 'Tequila'],
  },
};
