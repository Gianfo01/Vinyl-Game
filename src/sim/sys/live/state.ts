// Estado do sistema "live" (rodada 4): palco, festival próprio, casa de shows, residências,
// megaeventos, cenários históricos, desafio da semana, pacote de universo e conquistas.

import type { L } from '../../../data/world';
import { registerExt4 } from '../../ext4';
import type { GameState } from '../../types';

/** Notas de um show (como empolgação/intensidade/náusea das montanhas-russas). */
export interface ShowNote {
  day: number;
  cityId: string;
  tier: number;
  sold: number;
  cap: number;
  /** empolgação 0–100 */
  ex: number;
  /** intensidade 0–100 */
  int: number;
  /** cansaço 0–100 */
  fat: number;
  /** esgotou em minutos (notícia) */
  soldOutMin?: number;
}

export interface CurveResult {
  score: number;
  /** bônus aplicado aos próximos shows (0..0.10) */
  bonus: number;
  why: L[];
  energies: number[];
}

export type FestTile = '' | 'stage' | 'gate' | 'toilet' | 'food' | 'bar' | 'camp' | 'security' | 'medic' | 'merch';

export interface FestThought {
  text: L;
  tone: 'good' | 'bad' | 'neutral';
  x: number;
  y: number;
}

export interface FestEdition {
  year: number;
  attendance: number;
  capacity: number;
  demand: number;
  excitement: number;
  safety: number;
  comfort: number;
  rating: number;
  queueMin: number;
  revenue: number;
  costs: number;
  weather: 'sun' | 'rain' | 'storm';
  disaster?: L;
  thoughts: FestThought[];
  lineup: string[];
  grew?: boolean;
}

export interface OwnFestival {
  id: string;
  name: string;
  cityId: string;
  month: number;
  days: number;
  /** preço do ingresso por dia, em dólares reais */
  price: number;
  w: number;
  h: number;
  grid: FestTile[];
  lineup: { actId: string; fee: number }[];
  rep: number;
  founded: number;
  nextYear: number;
  editions: FestEdition[];
}

export interface OwnVenue {
  kind: 'club' | 'theater' | 'arena';
  cityId: string;
  name: string;
  bar: number;
  acoustics: number;
  rentalNights: number;
  ownActId?: string;
  ownNights: number;
  boughtYear: number;
  price: number;
  history: { year: number; month: number; revenue: number; costs: number; occupancy: number }[];
}

export interface Residency {
  id: string;
  actId: string;
  cityId: string;
  startMonth: number;
  months: number;
  nights: number;
  earned: number;
  status: 'active' | 'done' | 'cancelled';
}

export interface ScenarioRun {
  id: string;
  startYear: number;
  endYear: number;
  base: Record<string, number>;
  value: number;
  done?: { medal: 'gold' | 'silver' | 'bronze' | 'none'; value: number; year: number; failed?: boolean };
}

export interface ChallengeRun {
  code: string;
  week: string;
  endYear: number;
  rules: L[];
  done?: { score: number; year: number };
}

export interface CustomEvent {
  year: number;
  month: number;
  title: L;
  text: L;
  cash?: number;
  genre?: string;
  genreMult?: number;
  fame?: number;
  fired?: boolean;
}

export interface LiveState {
  notes: Record<string, ShowNote[]>;
  curves: Record<string, CurveResult>;
  liveQueued: Record<string, number>;
  liveDone: Record<string, number>;
  fests: OwnFestival[];
  venue: OwnVenue | null;
  tickets: { vip: boolean; dynamic: boolean };
  residencies: Residency[];
  mega: { year: number; name: string; actId: string; accepted?: boolean }[];
  boosts: Record<string, number>;
  scenario: ScenarioRun | null;
  challenge: ChallengeRun | null;
  events: CustomEvent[];
  pack?: string;
  ach: Record<string, number>;
  achNew: string[];
  counters: Record<string, number>;
  /** contexto do show em curso (lido pelo modificador de bilheteria) */
  cur?: { actId: string; cityId: string; tier: number; ratio: number } | null;
}

declare module '../../ext4' {
  interface Ext4 {
    live: LiveState;
  }
}

registerExt4('live', () => ({
  notes: {}, curves: {}, liveQueued: {}, liveDone: {}, fests: [], venue: null, tickets: { vip: false, dynamic: false }, residencies: [], mega: [], boosts: {},
  scenario: null, challenge: null, events: [], ach: {}, achNew: [], counters: {}, cur: null,
}));

export function liveOf(s: GameState): LiveState {
  const st = s as unknown as { x4: Record<string, unknown> };
  st.x4 ??= {};
  let x = st.x4.live as LiveState | undefined;
  if (!x) {
    x = { notes: {}, curves: {}, liveQueued: {}, liveDone: {}, fests: [], venue: null, tickets: { vip: false, dynamic: false }, residencies: [], mega: [], boosts: {}, scenario: null, challenge: null, events: [], ach: {}, achNew: [], counters: {}, cur: null };
    st.x4.live = x;
  }
  return x;
}

export function bump(s: GameState, key: string, n = 1): void {
  const c = liveOf(s).counters;
  c[key] = (c[key] ?? 0) + n;
}

export function isMine(s: GameState, actId: string): boolean {
  const a = s.acts[actId];
  return !!a && (a.owner === 'player' || !!a.playerBand);
}

/** Parte da bilheteria que é do selo (banda própria e 360 recebem; contrato clássico não). */
export function liveShare(s: GameState, actId: string): number {
  const a = s.acts[actId];
  if (!a) return 0;
  if (a.playerBand) return 1;
  const c = a.contractId ? s.contracts[a.contractId] : undefined;
  if (c && c.party === 'player' && c.model === '360') return c.share360;
  return 0;
}
