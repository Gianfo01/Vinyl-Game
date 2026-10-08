// Estado do sistema "world4" (história da indústria, jabá, feiras, paradas, fã-clubes, leis,
// sindicatos, pirataria, mercados com regras próprias e cenas históricas). Fica em s.x4.world4.

import { registerExt4 } from '../../ext4';
import type { GameState } from '../../types';

export type Society = 'scae' | 'rmr';
export type PiracyStance = 'none' | 'sue' | 'cheap' | 'drm' | 'license';
export type FormatBet = 'lp' | 'single45' | 'both';

export interface SceneLook {
  label: { pt: string; en: string };
  outfit: string;
  hair: string;
  accessory: string;
  palette: string[];
}

export interface FanClub {
  since: number; // semana
  tier: 0 | 1 | 2; // mensalidade baixa, média, alta
  members: number;
  magazine: boolean;
  income: number; // centavos no último mês (receita líquida)
}

export interface LawState {
  status: 'pending' | 'passed' | 'failed';
  year: number;
  vote?: 'yes' | 'no';
  lobby: number; // influência comprada
  closes?: number; // semana em que a votação fecha
}

export interface World4State {
  init: boolean;
  /** marcos disparados: id → ano (negativo = já tinha acontecido antes do início) */
  ms: Record<string, number>;
  formatBet?: FormatBet;
  qc?: boolean; // reunião semanal de controle de qualidade
  autotune?: boolean;
  deal360?: boolean;
  liveAid?: { actId: string; until: number };
  bankrupt?: { until: number; monthly: number }; // acervo de selo falido comprado na crise
  catalogFund?: { until: number; monthly: number }; // venda de participação no catálogo
  nft?: number;
  // jabá e curadores
  payola: { level: number; heat: number; dj: number; curator: number; spent: number; caught: number; lastWeek: number; pitchWeek: number };
  // manipulação de paradas
  manip: { heat: number; boosts: Record<string, { until: number; mult: number; kind: string }>; caught: number; lastRev: Record<string, number> };
  // feiras e hype
  hype: number;
  fairs: { booked: Record<string, number>; log: { fair: string; year: number; income: number; deals: number; hype: number }[] };
  // fã-clubes oficiais
  clubs: Record<string, FanClub>;
  // sindicato e sociedades
  union: boolean;
  strike?: { from: number; to: number; name: string };
  scabSongs: number;
  society?: Society;
  societyLog: { year: number; amount: number }[];
  lastSales: number;
  // associação do setor e leis
  assoc: boolean;
  laws: Record<string, LawState>;
  // selo de conteúdo explícito
  advisory: Record<string, 'sticker' | 'clean' | 'both'>;
  // pirataria
  piracy: { stance: PiracyStance; since: number; lost: number; recovered: number; scandals: number };
  // mercados com regras próprias
  trainees: Record<string, { from: number; until: number }>; // actId → semanas
  // cenas históricas
  scenes: Record<string, { signed?: number; announced?: number }>;
  looks: Record<string, SceneLook>;
  backlash: { genre: string; from: number; until: number; kind: 'burning' | 'death' | 'panic' }[];
  sat: Record<string, number>;
  // paradas extras
  yearUnits: Record<string, number>;
  yearEnd: { year: number; top: { id: string; title: string; act: string; units: number }[] }[];
  allTime: { id: string; title: string; act: string; units: number; year: number }[];
}

registerExt4('world4', (): World4State => ({
  init: false,
  ms: {},
  payola: { level: 0, heat: 0, dj: 20, curator: 10, spent: 0, caught: 0, lastWeek: -99, pitchWeek: -99 },
  manip: { heat: 0, boosts: {}, caught: 0, lastRev: {} },
  hype: 10,
  fairs: { booked: {}, log: [] },
  clubs: {},
  union: false,
  scabSongs: 0,
  societyLog: [],
  lastSales: 0,
  assoc: false,
  laws: {},
  advisory: {},
  piracy: { stance: 'none', since: 0, lost: 0, recovered: 0, scandals: 0 },
  trainees: {},
  scenes: {},
  looks: {},
  backlash: [],
  sat: {},
  yearUnits: {},
  yearEnd: [],
  allTime: [],
}));

declare module '../../ext4' {
  interface Ext4 {
    world4: World4State;
  }
}

/** Atalho para o estado (cria campos novos em saves antigos). */
export function w4(s: GameState): World4State {
  const st = s as unknown as { x4: { world4: World4State } };
  const w = st.x4.world4;
  w.payola ??= { level: 0, heat: 0, dj: 20, curator: 10, spent: 0, caught: 0, lastWeek: -99, pitchWeek: -99 };
  w.manip ??= { heat: 0, boosts: {}, caught: 0, lastRev: {} };
  w.fairs ??= { booked: {}, log: [] };
  w.clubs ??= {};
  w.laws ??= {};
  w.advisory ??= {};
  w.piracy ??= { stance: 'none', since: 0, lost: 0, recovered: 0, scandals: 0 };
  w.trainees ??= {};
  w.scenes ??= {};
  w.looks ??= {};
  w.backlash ??= [];
  w.sat ??= {};
  w.yearUnits ??= {};
  w.yearEnd ??= [];
  w.allTime ??= [];
  w.societyLog ??= [];
  return w;
}

export const isMine = (s: GameState, owner: string, actId?: string): boolean => owner === 'player' || (!!actId && !!s.acts[actId]?.playerBand);
