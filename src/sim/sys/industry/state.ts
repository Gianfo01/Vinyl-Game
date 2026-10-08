// Estado do sistema de indústria e negócios (rodada 4).

import type { L } from '../../../data/world';
import type { MarketId } from '../../../data/world';
import { registerExt4 } from '../../ext4';

export type Material = 'shellac' | 'vinyl' | 'tape' | 'polycarbonate' | 'paper';
export type PriceTier = 'budget' | 'normal' | 'premium';
export type StoreCell = 'empty' | 'shelf' | 'vinyl_wall' | 'booth' | 'window' | 'register' | 'stage' | 'cafe';

export interface Plant {
  id: string;
  city: string;
  level: number; // 1..3
  opened: number; // semana
  /** unidades de capacidade por semana */
  capacity: number;
  /** pedidos de terceiros aceitos neste mês (receita) */
  contractUnits: number;
}

export interface PressOrder {
  releaseId: string;
  units: number;
  /** semana em que fica pronto */
  ready: number;
  own: boolean;
}

export interface Store {
  id: string;
  city: string;
  name: string;
  opened: number;
  /** grade 6×4 */
  layout: StoreCell[];
  revenueMonth: number;
  visitorsMonth: number;
  signings: number;
}

export interface Distributor {
  id: string;
  market: MarketId;
  name: string;
  commission: number; // 0..1
  stores: number; // lojas na carteira
  since: number;
}

export interface Outlet {
  id: string;
  kind: 'radio' | 'tv' | 'magazine';
  name: string;
  market: MarketId;
  audience: number; // 0..100
  bought: number;
  /** quanto toca/mostra artistas da casa (0..1) — mais ajuda, mais arrisca */
  favoritism: number;
}

export interface Board {
  active: boolean;
  since: number;
  satisfaction: number; // 0..100
  goals: { id: string; text: L; target: number; metric: 'profit' | 'releases' | 'awards' | 'top10' | 'catalog' }[];
  year: number;
  warnings: number;
  bonusPaid: number;
  offers: { label: string; week: number }[];
}

export interface IndustryState {
  matPrice: Record<Material, number>; // multiplicador sobre o custo base do formato
  plants: Plant[];
  orders: PressOrder[];
  defectsYear: number;
  stores: Store[];
  distributors: Distributor[];
  streetTeams: Partial<Record<MarketId, number>>; // nível 0..3
  pricing: PriceTier;
  jukebox: Partial<Record<MarketId, number>>; // rotas de jukebox por mercado (0..3)
  mailClub: { active: boolean; members: number; since: number };
  streaming: { active: boolean; subs: number; since: number; licenses: string[]; name: string };
  roomKinds: Record<string, Record<string, string>>; // nível da sede -> roomId -> tipo
  items: Record<string, number>; // itemId -> quantidade comprada
  research: { points: number; done: string[]; current: string | null; progress: number };
  board: Board;
  outlets: Outlet[];
  promoter: { active: boolean; since: number; revenue: number };
  ticketing: { active: boolean; since: number; revenue: number };
  instruments: { active: boolean; since: number; endorsements: string[]; revenue: number };
  fx: Partial<Record<MarketId, number>>; // índice de valor da moeda (1 = estável)
  fxLossYear: number;
  mergers: { year: number; text: L }[];
  log: { week: number; text: L }[];
}

declare module '../../ext4' {
  interface Ext4 {
    industry: IndustryState;
  }
}

export function emptyIndustry(): IndustryState {
  return {
    matPrice: { shellac: 1, vinyl: 1, tape: 1, polycarbonate: 1, paper: 1 },
    plants: [],
    orders: [],
    defectsYear: 0,
    stores: [],
    distributors: [],
    streetTeams: {},
    pricing: 'normal',
    jukebox: {},
    mailClub: { active: false, members: 0, since: 0 },
    streaming: { active: false, subs: 0, since: 0, licenses: [], name: '' },
    roomKinds: {},
    items: {},
    research: { points: 0, done: [], current: null, progress: 0 },
    board: { active: false, since: 0, satisfaction: 60, goals: [], year: 0, warnings: 0, bonusPaid: 0, offers: [] },
    outlets: [],
    promoter: { active: false, since: 0, revenue: 0 },
    ticketing: { active: false, since: 0, revenue: 0 },
    instruments: { active: false, since: 0, endorsements: [], revenue: 0 },
    fx: {},
    fxLossYear: 0,
    mergers: [],
    log: [],
  };
}

registerExt4('industry', emptyIndustry);
