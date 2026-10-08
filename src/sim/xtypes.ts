// Estado da expansão (GDD v11, capítulos 41–46 + pedidos do criador).
// Todos os campos são inicializados por ensureExt() — saves antigos migram sem perder nada.

import type { L, MarketId } from '../data/world';
import type { Loan } from './types';

// ---------- Tempo ----------
export interface Clock {
  /** dias já processados do mês corrente (avanço semanal) */
  dayInMonth: number;
  /** o mês corrente já teve abertura (agendas processadas)? */
  opened: boolean;
  monthStartWeek: number;
}

export interface DailyEntry {
  day: number; // dia absoluto
  kind: 'tour' | 'studio' | 'crisis' | 'travel' | 'world';
  text: L;
  actId?: string;
  tone?: 'good' | 'bad' | 'neutral';
}

// ---------- Agenda com capacidade ----------
export type PlanStatus = 'planned' | 'started' | 'done' | 'blocked' | 'cancelled';

export interface Plan {
  id: string;
  actId: string;
  /** pessoas reservadas (formação inteira ou uma pessoa) */
  personIds: string[];
  action: string;
  /** índice absoluto do mês de início (ano*12+mês) */
  startMonth: number;
  months: number;
  /** % da capacidade mensal de cada participante */
  load: number;
  status: PlanStatus;
  costEst: number; // centavos
  params?: Record<string, number | string | boolean>;
  reason?: L;
}

// ---------- Economia ----------
export interface Asset {
  id: string;
  kind: 'equipment' | 'building' | 'plant' | 'catalog' | 'company' | 'stake' | 'hologram' | 'voice';
  name: L | string;
  cost: number;
  bookValue: number;
  lifeMonths: number;
  boughtMonth: number;
  refId?: string;
}

export interface Creditor {
  id: string;
  name: string;
  kind: 'bank' | 'investor' | 'supplier' | 'tax' | 'artist';
  patience: number; // 0..100
  owed: number; // centavos vencidos
}

// ---------- Narrativa ----------
export interface Arc {
  id: string;
  kind: 'rivalry' | 'comeback' | 'rise_fall' | 'feud_label' | 'underdog' | 'legacy' | 'reunion' | 'betrayal' | 'dynasty' | 'scene';
  title: L;
  actors: string[]; // ids de atos/selos/pessoas
  stage: number;
  stages: number;
  startedWeek: number;
  nextWeek: number;
  memoryIds: string[];
  done?: boolean;
  outcome?: L;
}

// ---------- Subselos ----------
export interface BoardMember {
  name: string;
  share: number; // 0..1
  goal: 'return' | 'growth' | 'culture';
}

export interface SubLabel {
  id: string;
  name: string;
  logoSeed: number;
  genreFocus: string;
  cash: number;
  reserve: number;
  budget: number; // teto mensal de decisões delegadas
  strategy: 'development' | 'commercial' | 'catalog';
  roster: string[];
  managerSalary: number;
  founderShare: number;
  board: BoardMember[];
  loans: Loan[];
  creditors: Creditor[];
  status: 'active' | 'distress' | 'bankrupt' | 'closed';
  distressMonths: number;
  retained: number;
  revenueYear: number;
  revenueLastYear: number;
  log: { week: number; amount: number; memo: string }[];
  history: { week: number; text: L }[];
  pendingProposal?: { kind: 'capital' | 'dividend' | 'policy'; amount: number; week: number; votesFor?: number };
  founded: number;
}

// ---------- Descoberta ----------
export interface Scout {
  id: string;
  name: string;
  region: MarketId;
  family: string;
  skill: number;
  bias: number; // erro sistemático −15..15
  salary: number;
  mission?: { region: MarketId; family: string; untilWeek: number };
  found: number;
}

export interface Contest {
  id: string;
  name: L;
  city: string;
  week: number;
  entrants: string[];
  prize: number; // centavos
  winner?: string;
  attended?: boolean;
  kind: 'contest' | 'showcase';
}

export interface Demo {
  id: string;
  actId: string;
  week: number;
  hint: number; // nota percebida da demo (com ruído)
  expires: number;
  heard?: boolean;
}

export interface Auction {
  id: string;
  actId: string;
  bids: { party: string; advance: number; royalty: number }[];
  round: number;
  endsWeek: number;
  status: 'open' | 'won' | 'lost' | 'closed';
}

// ---------- Criação ----------
export interface Take {
  n: number;
  quality: number;
  note: L;
}

export interface StudioSession {
  id: string;
  actId: string;
  songIds: string[];
  producerId?: string;
  approach: string;
  tier: number;
  startDay: number;
  days: number;
  dayDone: number;
  takes: Record<string, Take[]>; // songId -> takes
  decision?: { songId: string; options: ('keep' | 'another' | 'comp')[] };
  costPaid: number;
  done?: boolean;
  log: L[];
}

export interface SampleRequest {
  id: string;
  songId: string; // nova música
  sourceSongId: string; // música sampleada
  kind: 'sample' | 'interpolation';
  fee: number;
  share: number; // fração da edição cedida
  status: 'pending' | 'cleared' | 'denied' | 'uncleared';
}

// ---------- Lançamento ----------
export interface RolloutPhase {
  kind: 'teaser' | 'presave' | 'single' | 'video' | 'album' | 'deluxe' | 'limited' | 'anniversary';
  week: number;
  done: boolean;
  budget: number;
  refId?: string;
}

export interface Rollout {
  id: string;
  actId: string;
  title: string;
  songIds: string[];
  singles: string[];
  phases: RolloutPhase[];
  presaves: number;
  hype: number; // 0..1, acumulado pelas fases
  status: 'active' | 'done' | 'cancelled';
}

// ---------- Mídia ----------
export interface Review {
  critic: string;
  outlet: string;
  score: number; // 0..10
  quote: L;
}

export interface Crisis {
  id: string;
  actId: string;
  kind: 'scandal' | 'remark' | 'censorship' | 'cancel' | 'leak' | 'accident';
  severity: number; // 0..100
  startDay: number;
  deadlineDay: number;
  response?: 'apologize' | 'deny' | 'silence' | 'counter' | 'charity';
  resolved?: boolean;
  text: L;
}

// ---------- Shows ----------
export interface TourStop {
  cityId: string;
  day: number;
  tier: number;
  price: number; // centavos
  capacity: number;
  sold: number;
  merch: number;
  status: 'scheduled' | 'played' | 'cancelled';
  note?: L;
  travelDays: number;
  visa?: boolean;
}

export interface Tour {
  id: string;
  actId: string;
  name: string;
  stops: TourStop[];
  setlist: string[]; // songIds; vazio = covers
  minutes: 30 | 45 | 60 | 90;
  production: number; // 0..3
  role: 'headline' | 'co' | 'opening';
  partnerActId?: string;
  crew: number;
  pay: 'door' | 'guarantee' | 'hybrid';
  costReserved: number;
  revenue: number;
  costs: number;
  status: 'planned' | 'running' | 'done' | 'cancelled';
  log: L[];
  accidents: number;
}

// ---------- Marcas ----------
export interface BrandDeal {
  id: string;
  actId: string;
  brand: string;
  kind: 'sponsor' | 'merch' | 'license' | 'sync_film' | 'sync_tv' | 'sync_game' | 'sync_ad';
  fee: number;
  songId?: string;
  untilWeek: number;
  exclusive: boolean;
  status: 'offered' | 'active' | 'done' | 'declined';
  boost: number;
}

export interface MerchLine {
  actId: string;
  stock: number;
  designs: number;
  sold: number;
  revenue: number;
  quality: number;
}

// ---------- Negócios ----------
export interface Company {
  id: string;
  name: string;
  kind: 'label' | 'plant' | 'publisher' | 'studio' | 'distributor' | 'agency';
  stake: number; // fração do jogador
  partner?: string; // joint venture
  value: number;
  liabilities: number;
  monthlyRevenue: number;
  monthlyCost: number;
  acquiredWeek: number;
  catalog: string[]; // releaseIds
}

export interface Lawsuit {
  id: string;
  kind: 'plagiarism' | 'sample' | 'audit' | 'contract' | 'image';
  plaintiff: string;
  defendant: string;
  actId?: string;
  songId?: string;
  claim: number;
  odds: number; // chance do jogador vencer
  stage: 'filed' | 'discovery' | 'trial' | 'settled' | 'won' | 'lost';
  nextWeek: number;
  text: L;
}

export interface Listing {
  listed: boolean;
  shares: number; // total
  floatShare: number; // fração vendida ao mercado
  price: number; // centavos por ação
  history: number[];
  ipoWeek?: number;
}

export interface Securitization {
  id: string;
  advance: number;
  share: number; // fração da receita de catálogo cedida
  untilWeek: number;
  paid: number;
}

export interface CatalogAuction {
  id: string;
  seller: string;
  releaseIds: string[];
  ask: number;
  bids: { party: string; amount: number }[];
  endsWeek: number;
  status: 'open' | 'sold' | 'withdrawn';
}

// ---------- Neural ----------
export interface HologramShow {
  id: string;
  actId: string;
  personId: string;
  rights: 'owned' | 'licensed';
  estateFee: number;
  shows: number;
  revenue: number;
  untilWeek: number;
}

export interface ImageRights {
  personId: string;
  holder: string; // 'estate' | 'player' | labelId
  feeAsk: number;
  consent: boolean;
}

// ---------- Pessoas ----------
export interface Family {
  personId: string;
  partner?: { name: string; job: L; trust: number; wellbeing: number; agenda: L };
  kids: { id: string; name: string; born: number; bond: number; musical: number; personId?: string }[];
  householdCash: number;
  separated?: boolean;
  lastTalk?: number;
}

export interface Faction {
  actId: string;
  groups: string[][]; // ids de pessoas por facção
  leaderId?: string;
  tension: number;
}

export interface Documentary {
  id: string;
  actId: string;
  title: string;
  week: number;
  quality: number;
  views: number;
}

// ---------- Cultura ----------
export interface Movement {
  id: string;
  name: L;
  city: string;
  parent: string;
  genreId: string;
  born: number;
  strength: number;
  fashion: L;
  acts: string[];
}

export interface Club {
  id: string;
  name: string;
  city: string;
  genre: string;
  capacity: number;
  prestige: number;
  owner?: string;
  opened: number;
  closed?: number;
}

// ---------- Rivais ----------
export interface RivalReportItem {
  labelId: string;
  text: L;
}

// ---------- Charts ----------
export interface ChartRecords {
  longestNo1?: { releaseId: string; weeks: number; title: string; act: string };
  biggestWeek?: { releaseId: string; units: number; title: string; act: string; week: number };
  mostNo1sAct?: { actId: string; n: number; name: string };
  longestRun?: { releaseId: string; weeks: number; title: string; act: string };
}

// ---------- Fandom ----------
export interface Fandom {
  name?: string;
  superfans: number;
  haters: number;
  toxicity: number; // 0..100
  ritual?: L;
  clubOrganized?: boolean;
}

export interface ExtState {
  clock: Clock;
  daily: DailyEntry[];
  plans: Plan[];
  /** carga já reservada no mês corrente por pessoa (%) */
  loadNow: Record<string, number>;
  /** cidade onde cada ato está (deslocamento) */
  location: Record<string, string>;
  assets: Asset[];
  creditors: Creditor[];
  personalCash: Record<string, number>; // royalties autorais por pessoa (centavos)
  arcs: Arc[];
  subLabels: SubLabel[];
  scouts: Scout[];
  contests: Contest[];
  demos: Demo[];
  auctions: Auction[];
  sessions: StudioSession[];
  samples: SampleRequest[];
  producerBusy: Record<string, number>; // producerId -> semana livre
  rollouts: Rollout[];
  reviews: Record<string, Review[]>; // releaseId
  crises: Crisis[];
  prAgency?: { name: string; tier: number; monthly: number };
  bans: { releaseId: string; market: MarketId; reason: L; week: number }[];
  tours: Tour[];
  deals: BrandDeal[];
  merch: Record<string, MerchLine>;
  companies: Company[];
  lawsuits: Lawsuit[];
  listing: Listing;
  securitizations: Securitization[];
  catalogAuctions: CatalogAuction[];
  ownPublishing: boolean;
  holograms: HologramShow[];
  imageRights: Record<string, ImageRights>;
  vault: Record<string, string[]>; // personId -> songIds inéditas
  families: Record<string, Family>;
  factions: Record<string, Faction>;
  mentors: Record<string, string>; // aprendiz -> mentor
  lineage: Record<string, string[]>; // pessoa -> filhos (personIds músicos)
  soloOf: Record<string, string>; // actId solo -> actId de origem
  documentaries: Documentary[];
  hallOfFame: { actId: string; year: number; name: string }[];
  movements: Movement[];
  clubs: Club[];
  geo: { active: string[]; censorship: Record<string, number> };
  rivalReport: { month: number; items: RivalReportItem[] };
  rivalries: Record<string, number>; // labelId -> intensidade da rivalidade pessoal
  genreCharts: Record<string, string[]>; // família -> releaseIds top 10
  regionCharts: Record<string, string[]>; // mercado -> releaseIds top 10
  records: ChartRecords;
  fandoms: Record<string, Fandom>;
  tutorial: { step: number; done: boolean; seen: string[] };
  /** voto/diálogo de autonomia criativa pendente */
  votes: { id: string; actId: string; topic: L; options: { id: string; label: L }[]; votes: Record<string, string>; week: number }[];
}
