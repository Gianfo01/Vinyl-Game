import type { RngState } from '../core/rng';
import type { AmbitionId, SkillId } from '../data/people';
import type { ContractModel, FormatId, RoleId } from '../data/rules';
import type { L, MarketId } from '../data/world';
import type { ExtState } from './xtypes';

export type Mode = 'historic' | 'free' | 'chaos';
export type StorytellerId = 'maestro' | 'brisa' | 'acaso' | 'cronista' | 'tabloide' | 'poeta' | 'cinico' | 'locutor';
export type ScenarioId = 'from_zero' | 'emerging' | 'established';

export interface RunConfig {
  seed: string;
  role: RoleId;
  scenario: ScenarioId;
  startYear: number;
  mode: Mode;
  storyteller: StorytellerId;
  card: string;
  mutators: string[];
  difficulty: 'easy' | 'normal' | 'hard';
  ironman: boolean;
  homeCity: string;
  companyName: string;
  /** para Artista/Híbrido */
  bandName?: string;
  bandGenre?: string;
  contentFilters: string[]; // tags desligadas
  /** rodada 6: artistas, selos, festivais e mídia com nomes reais */
  realNames?: boolean;
  /** rodada 7: no modo histórico, pessoas reais morrem perto do ano real */
  realFates?: boolean;
  /** rodada 7: início personalizado (tudo opcional; ausente = padrão do cenário) */
  custom?: StartCustom;
  /** personagem do jogador (rodada 5); ausente = gerado */
  character?: CharacterSpec;
  /** rodada 9: id de uma gravadora rival gerada que o jogador assume no começo */
  takeover?: string;
  /** rodada 10: quais gravadoras rivais existem e como começam (ausente = comportamento histórico de sempre) */
  labels?: LabelSetup;
  /** rodada 14: tamanho da base de dados (artistas reais + gerados); ausente = médio */
  dbSize?: 'small' | 'medium' | 'large' | 'huge';
  /** rodada 12: carreiras escolhidas no começo (atividades principais, origem profissional, ambição) */
  careers?: { main: string[]; origin?: string; ambition?: string };
  /** rodada 15: história dos artistas reais — exata, com variações (padrão) ou aleatória */
  history?: 'strict' | 'loose' | 'free';
  /** rodada 17: liberdade do diretor criativo (mundo dos NPCs); ausente = normal */
  freedom17?: 'tight' | 'normal' | 'wild';
  /** rodada 17 (novo jogo): modo de mundo (exato/real/foto/aleatório/ficcional/caos), "real até o início" (sem estreias
   * reais depois do ano inicial), dificuldade detalhada (−2..2), prazo da partida em anos (0 = sem fim), cenário
   * histórico escolhido no próprio Novo Jogo e predefinição usada */
  world17?: string;
  snap17?: boolean;
  diff17?: { market?: number; costs?: number; rivals?: number; talent?: number };
  runYears17?: number;
  scenario17?: string;
  preset17?: string;
}

export interface LabelSetup {
  /** ids de definição escolhidos (catálogo + extras); ausente = conjunto padrão */
  ids?: string[];
  /** número de rivais (0–60); ausente = o tamanho da lista escolhida */
  count?: number;
  /** 'history' = tamanhos e elencos pela história (padrão); 'equal' = todos (inclusive o jogador) começam iguais */
  start?: 'history' | 'equal';
  /** gravadoras fundadas depois do ano de início: 'default' = as da lista escolhida; 'all' = todas; 'none' = nenhuma */
  future?: 'default' | 'all' | 'none';
}

export interface StartCustom {
  /** caixa inicial da empresa em dólares de 1960 (valor real; vira nominal no ano de início) */
  cash?: number;
  /** patrimônio pessoal do personagem (dólares de 1960) */
  personalCash?: number;
  /** nível da sede 0..3 */
  hq?: number;
  /** equipamento e mobília iniciais */
  studio?: 'none' | 'basic' | 'pro';
  /** integrantes da banda do jogador (1 = carreira solo) */
  members?: number;
  /** estágio da carreira do artista do jogador */
  level?: 'garage' | 'local' | 'rising' | 'established' | 'star';
  /** atos já contratados pelo selo */
  roster?: number;
  /** funcionários iniciais */
  staff?: number;
  /** mercados abertos */
  markets?: 'home' | 'region' | 'world';
  /** reputação inicial 0..100 */
  reputation?: number;
}

export interface CharacterSpec {
  name: string;
  age: number;
  background: string;
  role?: Person['role'];
  look?: Appearance;
  /** rodada 6: personalização e personalidade */
  nickname?: string;
  pronoun?: 'he' | 'she' | 'they';
  hometown?: string;
  favGenre?: string;
  visual?: string;
  motto?: string;
  traits?: string[];
  style?: string;
  points?: Partial<Record<'ear' | 'negotiation' | 'charisma' | 'management', number>>;
  /** rodada 8: trajetória profissional (vazio = deduzida da origem) */
  career?: string;
  /** rodada 9: sexo do personagem (filtra opções de aparência) */
  sex?: 'm' | 'f' | 'x';
  /** rodada 9: habilidades iniciais (árvore; até START_SKILL_POINTS) */
  skills?: string[];
  /** rodada 10: visão política e religião (ids de src/sim/beliefs.ts; vazio = derivado do mundo) */
  politics?: string;
  religion?: string;
  /** rodada 17: orientação ('het' padrão), vida no armário, filhos e estado civil no início */
  orient?: 'het' | 'gay' | 'bi' | 'ace';
  closet?: boolean;
  kids?: number;
  marital?: 'single' | 'married' | 'divorced' | 'widowed';
}

/** Aparência combinável (GDD §44): 3 corpos × 3 rostos × 4 peles × 16 cabelos × 8 cores × 4 roupas × 8 cores × acessórios. */
export interface Appearance {
  body: number; // 0..2
  face: number; // 0..2
  skin: number; // 0..3
  hair: number; // 0..15 (0 = sem cabelo)
  hairColor: number; // 0..7
  outfit: number; // 0..3
  outfitColor: number; // 0..7
  glasses: boolean;
  hat: boolean;
  beard: boolean;
  /** rodada 15 (opcionais; ausente = padrão da era): tipo de chapéu 1 cartola 2 caubói 3 boina 4 gorro 5 faixa 6 boné 7 fedora 8 bandana */
  hatT?: number;
  /** cor do chapéu (índice de OUTFIT_COLORS) */
  hatC?: number;
  /** óculos 1 redondos 2 escuros 3 extravagantes */
  glT?: number;
  /** barba 1 bigode 2 cavanhaque 3 por fazer */
  bdT?: number;
  /** pintura facial 1 estrela 2 demônio 3 gato 4 espacial 5 raio 6 delineador 7 máscara branca */
  paint?: number;
  /** capacete 1 prateado 2 dourado */
  helm?: number;
  /** cor da raiz (cabelo bicolor) */
  roots?: number;
  /** sexo conhecido (artistas reais) */
  sx?: 'm' | 'f';
  /** visual real aplicado automaticamente (rodada 15); some quando o jogador edita */
  rl?: string;
  /** rodada 17 (derivados da idade, nunca gravados): rugas 0..3, grisalho 0..10, calvície 0..2, peso extra */
  ag?: number;
  gy?: number;
  bl?: number;
}

export interface Person {
  id: string;
  name: string;
  born: number;
  role: 'vocal' | 'guitar' | 'bass' | 'drums' | 'keys' | 'horns' | 'dj' | 'producer' | 'mc' | 'strings' | 'synthetic';
  skills: Record<SkillId, number>;
  potential: number; // oculto
  traits: string[];
  ambition: AmbitionId;
  origin: string;
  morale: number;
  inspiration: number;
  fatigue: number;
  stress: number;
  resentment: number;
  health: 'ok' | 'voice_strain' | 'burnout' | 'addiction' | 'recovering' | 'ill';
  alive: boolean;
  /** rodada 7: ano da morte */
  died?: number;
  /** relações direcionais −100..100 */
  rel: Record<string, number>;
  lowMoraleMonths: number;
  /** aparência escolhida no editor; ausente = derivada deterministicamente do id */
  look?: Appearance;
  /** personalidade 0–100 (GDD §45.2) */
  persona?: { openness: number; perfectionism: number; ambition: number; sociability: number; discipline: number; resilience: number };
  /** objetivo pessoal (GDD §46.5) */
  goal?: 'security' | 'credit' | 'family' | 'leadership' | 'solo';
  parentId?: string;
  retireAge?: number;
  /** personagem do jogador (rodada 5) */
  isPlayer?: boolean;
}

export type ActStatus = 'emerging' | 'active' | 'hiatus' | 'retired' | 'split';

export interface Act {
  id: string;
  name: string;
  catalogNo?: number;
  genre: string;
  city: string;
  members: string[];
  formed: number;
  debutYear: number;
  status: ActStatus;
  /** Alcance 0..100 */
  fame: number;
  /** Momento 0..100 */
  momentum: number;
  /** Posicionamento 0 (underground) .. 100 (crossover) */
  positioning: number;
  fans: { casual: number; active: number; core: number };
  owner: string | null; // 'player' | labelId | null (independente)
  contractId?: string;
  trust: number; // confiança no jogador
  potential: number; // oculto 0..100 (nível de pico)
  archetype?: 'genius' | 'phoenix' | 'synthetic';
  playerBand?: boolean;
  logoSeed: number;
  songs: string[];
  releases: string[];
  lastRelease: number; // semana absoluta
  hiatusUntil?: number;
  careerEnd: number; // ano previsto de aposentadoria
  peakChart: number; // melhor posição
  hits: number; // top 10
  number1s: number;
  awards: number;
  legend: boolean;
  scandals: number;
  /** contatos e preparação */
  networking: number;
  rehearsed: number;
  /** saturação de público por shows recentes */
  gigSat?: number;
  feats: number;
  /** dinheiro próprio do ato (independentes e artistas), centavos */
  cash: number;
  history: string[]; // ids de memória
  rs?: boolean;
  leaderId?: string;
  /** reputação da carreira em 4 eixos (GDD §46.6) */
  image?: { artistic: number; popularity: number; professionalism: number; publicImage: number };
  cancelledUntil?: number;
  movementId?: string;
  deceased?: boolean;
}

export interface Song {
  id: string;
  actId: string;
  title: string;
  genre: string;
  writers: string[];
  melody: number;
  lyrics: number;
  performance: number;
  production: number;
  originality: number;
  q: number;
  recorded: boolean;
  createdWeek: number;
  releaseId?: string;
  studioTier?: number;
  approach?: string;
  synthetic?: boolean;
  /** participação autoral por pessoa (soma 1) */
  splits?: { personId: string; share: number }[];
  sampleOf?: string;
  coverOf?: string;
  remixOf?: string;
  translationOf?: string;
  lang?: string;
  minutes?: number;
  vault?: boolean; // inédita guardada
  posthumous?: boolean;
  aiVoice?: boolean;
  producerId?: string;
  /** revisões de composição feitas (máx. 4) */
  revisions?: number;
  /** tema tirado do caderno de ideias */
  theme?: L;
  /** rodada 8: direção sonora (ver src/sim/sys/sound.ts) */
  sound?: SongSound;
  /** rodada 10: faixa sem voz (o ato não tem quem cante e não houve feat/cantor de estúdio); a letra não conta */
  instrumental?: boolean;
  /** rodada 10: voz gravada por um cantor de estúdio contratado */
  sessionVocal?: boolean;
}

/** Som de uma faixa: 6 eixos 0–100 (energia, densidade, eletrônico, foco vocal, polimento, experimentação). */
export interface SongSound {
  /** valores (camada escrita; depois de gravada, inclui a gravação) */
  v: number[];
  /** direção pretendida pelo jogador (−1 = livre) */
  a?: number[];
  /** camada de gravação já aplicada */
  r?: 1;
  /** valor final congelado no lançamento (inclui o arranjo) */
  f?: 1;
  /** momento de vida de quem compôs (códigos curtos) */
  m?: string[];
  /** timbres da faixa (rodada 9) */
  t?: string[];
  /** subgênero do ato na composição */
  sg?: string;
}

export type ReleaseType = 'single' | 'ep' | 'lp';

export interface Release {
  id: string;
  actId: string;
  owner: string; // 'player' | labelId | 'indie'
  type: ReleaseType;
  title: string;
  songs: string[];
  week: number; // semana absoluta de lançamento
  year: number;
  q: number;
  appeal: number;
  formats: FormatId[];
  stock: number;
  pressed: number;
  marketing: { channel: string; budget: number }[]; // budget em centavos
  marketingE: number;
  territories: MarketId[];
  weekly: number[]; // unidades por semana
  totalUnits: number;
  revenue: number; // centavos para o dono
  peak: number;
  weeksOnChart: number;
  lastPos: number;
  coverSeed: number;
  shortage: number; // unidades perdidas por falta
  autopsy?: AutopsyFactor[];
  reissueOf?: string;
  certified?: 'gold' | 'platinum' | 'diamond';
  live: boolean;
  kind?: 'standard' | 'demo' | 'deluxe' | 'limited' | 'anniversary' | 'tribute' | 'remix' | 'live' | 'compilation' | 'posthumous' | 'translation';
  returns?: number;
  hypeBoost?: number;
  rolloutId?: string;
  /** rodada 7: discografia anterior ao início da run (real ou simulada) */
  hist?: boolean;
  /** rodada 8: nota agregada da crítica (0–100) e nº de resenhas; capa escolhida */
  critic?: number;
  criticN?: number;
  coverChoice?: string;
  /** rodada 8: previsão de unidades em 10 semanas guardada no lançamento, unidades reais nessas 10 semanas e leitura já enviada */
  fc?: number;
  fa?: number;
  expl?: boolean;
}

export interface AutopsyFactor {
  key: string;
  label: L;
  value: number; // multiplicador
  confidence: 'high' | 'medium' | 'low';
}

export interface ContractPromise {
  kind: 'priority' | 'tour' | 'freedom';
  dueWeek: number;
  kept?: boolean;
}

export interface Contract {
  id: string;
  actId: string;
  party: string; // 'player' | labelId
  model: ContractModel;
  advance: number; // centavos
  royalty: number; // 0..1 sobre receita líquida do master
  termMonths: number;
  startWeek: number;
  endWeek: number;
  releasesOwed: number;
  releasesDone: number;
  creativeControl: boolean; // true = artista tem controle
  publishing: boolean;
  share360: number;
  recoupBalance: number; // centavos ainda a recuperar
  promises: ContractPromise[];
  distributionFee?: number; // 0..1 para modelo distribuição
  /** territórios cobertos (vazio = mundo) e cessão parcial a terceiros */
  territories?: MarketId[];
  ceded?: { party: string; share: number; markets: MarketId[] }[];
  crossCollat?: boolean;
  options?: number; // períodos de opção restantes
  exitFee?: number; // cláusula de saída (centavos)
  buyout?: number; // valor de compra do contrato
  /** rodada 8: ficha de direitos negociada (ausente = padrão do modelo; ver sim/rights.ts) */
  rights?: RightsTerms;
  /** alcance do ato ao assinar (mede o poder de barganha que ele ganhou depois) */
  fameAtSign?: number;
  /** total já recuperado do adiantamento (centavos) */
  recouped?: number;
  lastRenegWeek?: number;
  /** masters deste contrato já voltaram ao artista */
  reverted?: boolean;
  revertWarned?: boolean;
  /** r18: cláusulas negociadas (recuperável, base do royalty, prestação de contas, compromissos) */
  clauses18?: import('./sys/contracts18').Clauses18;
}

/** Direitos de um acordo (rodada 8, §3.3): propriedade, divisão, território, opções e reversão. */
export interface RightsTerms {
  /** dono do master: selo, coproprietário (50/50 do lucro) ou artista (selo só licencia) */
  master: 'label' | 'shared' | 'artist';
  /** fatia do selo na edição das composições (0, 0.25 ou 0.5) */
  pubShare: number;
  /** pontos do produtor e dos convidados (fração da receita bruta) */
  producerPts: number;
  guestPts: number;
  /** true = o selo paga os pontos desde o primeiro disco; false = saem da parte do artista (all-in) */
  pointsFromLabel: boolean;
  /** territórios cobertos */
  scope: 'home' | 'region' | 'world';
  /** opções de discos futuros (anos extras a critério do selo) */
  options: number;
  exclusive: boolean;
  /** direitos de exploração que ficam com o selo */
  sync: boolean;
  reissue: boolean;
  remaster: boolean;
  license: boolean;
  /** anos após o fim do contrato até o master voltar ao artista (0 = perpétuo, salvo master do artista) */
  reversionYears: number;
  /** a reversão só acontece com o adiantamento recuperado */
  reversionNeedsRecoup: boolean;
}

export interface Label {
  id: string;
  name: string;
  family: 'A' | 'B' | 'C' | 'D';
  city: string;
  founded: number;
  focus: string[];
  cash: number;
  reputation: number;
  roster: string[];
  active: boolean;
  aggression: number;
  strategy: 'develop' | 'buy_catalog' | 'niche' | 'stars';
  territories: MarketId[];
  revenueYear: number;
  revenueLastYear: number;
  procedural?: boolean;
  closedYear?: number;
  lastDecision?: L;
  archetype?: 'empire' | 'scene_hunter' | 'hitmaker' | 'catalog' | 'boutique';
  ceo?: string;
  debt?: number;
  parentLabel?: string;
  /** rodada 10: manual de estratégia escolhido (PlaybookId); ausente = derivado do arquétipo */
  playbook?: string;
  /** rodada 10: id do líder atual (ver sys/leaders10.ts) */
  leaderId?: string;
  /** rodada 10: nome do CEO veio dos líderes antes do 1º mês (rivals2 ainda sorteia um nome, para não mudar o fluxo do acaso) */
  ceoSeed10?: 1;
}

export interface Knowledge {
  actId: string;
  degree: number; // 1..5
  stage: 'signal' | 'monitoring' | 'investigating' | 'offer' | 'negotiation';
  bias: number; // erro sistemático do relatório
  updatedWeek: number;
  source: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  skill: number;
  salary: number; // centavos/mês
  hiredWeek: number;
  trait?: string;
}

export interface LedgerEntry {
  key: string;
  week: number;
  amount: number;
  cat: string;
  memo: string;
}

export interface Loan {
  id: string;
  principal: number;
  balance: number;
  rate: number; // ao ano
  monthly: number;
  startWeek: number;
}

export interface Offer {
  id: string;
  actId: string;
  model: ContractModel;
  advance: number;
  royalty: number;
  termMonths: number;
  releasesOwed: number;
  creativeControl: boolean;
  publishing: boolean;
  share360: number;
  promises: ContractPromise['kind'][];
  distributionFee?: number;
  week: number;
  status: 'pending' | 'accepted' | 'rejected' | 'sniped' | 'counter';
  note?: string;
  /** rodada 7: o artista pediu tempo para pensar até esta semana */
  thinkUntil?: number;
  /** rodada 8: ficha de direitos proposta (ausente = padrão do modelo) */
  rights?: RightsTerms;
  /** r18: cláusulas propostas (ver sim/sys/contracts18.ts) */
  clauses18?: import('./sys/contracts18').Clauses18;
}

export interface AgendaSlot {
  action: string;
  params?: Record<string, number | string | boolean>;
}

export interface PendingRelease {
  id: string;
  actId: string;
  type: 'single' | 'ep' | 'lp';
  songs: string[];
  title: string;
  formats: FormatId[];
  press: number;
  marketing: { channel: string; budget: number }[];
  territories: MarketId[];
  week: number;
  reissueOf?: string;
  kind?: Release['kind'];
  hype?: number;
  rolloutId?: string;
  cover?: { style: string; seed: number };
}

export interface DecisionOption {
  id: string;
  label: L;
  hint?: L;
}

export interface Decision {
  id: string;
  eventId: string;
  cat: string;
  title: L;
  text: L;
  options: DecisionOption[];
  ctx: Record<string, string | number>;
  week: number;
  defaultOption: string;
  tags: string[];
}

export interface MemoryEntry {
  id: string;
  week: number;
  year: number;
  month: number;
  kind: string;
  text: L;
  actId?: string;
  causeIds?: string[];
  important?: boolean;
}

export interface ChartEntry {
  releaseId: string;
  units: number;
  pos: number;
  last: number;
  weeks: number;
}

export interface Notification {
  week: number;
  text: L;
  kind: 'info' | 'good' | 'bad' | 'event';
}

export interface GameState extends ExtState {
  version: number;
  config: RunConfig;
  signature: string;
  rng: RngState;
  week: number; // semanas desde o início
  day: number; // dias desde 1/jan do ano inicial
  year: number;
  month: number; // 0..11
  idSeq: number;
  techDates: Record<string, number>;
  divergence: Record<string, string>;
  rumors: { id: string; text: L; week: number; resolvesYear: number }[];
  persons: Record<string, Person>;
  acts: Record<string, Act>;
  songs: Record<string, Song>;
  releases: Record<string, Release>;
  contracts: Record<string, Contract>;
  labels: Record<string, Label>;
  knowledge: Record<string, Knowledge>;
  offers: Offer[];
  pendingReleases: PendingRelease[];
  agenda: Record<string, AgendaSlot[]>; // actId -> slots do mês
  delegated: Record<string, boolean>;
  scoutRequests: { genreFamily: string; market: string; level: string; role: string; week: number }[];
  scoutActionsUsed: number;
  player: {
    cash: number;
    initialCash: number;
    totalPosted: number;
    hq: number;
    staff: StaffMember[];
    equipment: string[];
    reputation: { artistic: number; commercial: number; artists: number; institutional: number };
    territories: MarketId[];
    loans: Loan[];
    legacy: Record<string, number>;
    neural: { synthActs: number; voiceLicenses: number; consentPolicy: 'none' | 'consent' | 'no_consent'; catalogTraining: boolean; neuralAdopted: boolean | null; voiceScandal: boolean; ghostVoice: boolean; humanFocus: number };
    insolvencyMonths: number;
    revenueByYear: Record<number, number>;
    profitByYear: Record<number, number>;
    stats: { releases: number; number1s: number; top10s: number; gold: number; platinum: number; awards: number; headlines: number; festivals: number; reissues: number; signed: number; leftUnhappy: number; scandalsSurvived: number; marketsPresent: number; influential: number };
    goalsDone: string[];
    bandActId?: string;
    reissues: number;
    totals: Record<string, number>;
    /** r18: DRE, fluxo de caixa, contas a receber/pagar (sim/ledger18.ts) */
    fin18?: import('./ledger18').Fin18;
  };
  ledger: LedgerEntry[];
  ledgerKeys: Record<string, 1>;
  monthLedger: Record<string, number>;
  lastMonthLedger: Record<string, number>;
  charts: { singles: ChartEntry[]; albums: ChartEntry[]; number1History: { week: number; releaseId: string; title: string; act: string }[] };
  decisions: Decision[];
  eventCooldowns: Record<string, number>;
  tension: number;
  memory: MemoryEntry[];
  notifications: Notification[];
  briefing: Notification[];
  genrePop: Record<string, number>; // popularidade 0..2
  scenes: Record<string, number>; // força da cena "cidade:gênero"
  economy: { cycle: number; recession: boolean; recessionUntil: number; rightsMult: number; strikeUntil: number; investorShare: number; investorUntil: number };
  awards: { year: number; category: string; releaseId?: string; actId?: string; name: string; byPlayer: boolean }[];
  professionals: StaffMember[];
  /** atos do catálogo que ainda vão surgir nesta run */
  upcoming: { no: number; name: string; genre: string; city: string; members: number; debut: number; potential: number; rs?: boolean; synthetic?: boolean }[];
  flags: Record<string, number>;
  ended?: { ending: string; year: number; reason: 'arc' | 'insolvency' };
  undo?: string; // snapshot do início do mês (modo recarga)
  stats: { weeklyPool: number; marketUnitsYear: number; playerUnitsYear: number; marketShare: number; lastH?: number };
}
