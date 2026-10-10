// Rodada 18 (live18) — ganchos leves da turnê (sem imports de runtime: tours.ts chama, sys/live18.ts preenche).
// Kit18 = as escolhas de logística da turnê (transporte, hospedagem, diárias, equipamento, ensaio, seguro,
// segurança de público e promotor). O padrão não muda nada em relação às regras antigas.
import type { Rng } from '../core/rng';
import type { L } from '../data/world';
import type { GameState } from './types';
import type { Tour, TourStop } from './xtypes';

export interface Kit18 {
  move: 'van' | 'bus' | 'fly';
  bed: 'cheap' | 'std' | 'good';
  diem: 0 | 1 | 2;
  gear: 'own' | 'rent';
  reh: 0 | 1 | 2;
  ins: 0 | 1;
  sec: 0 | 1 | 2;
  prom: 'local' | 'giant';
}
export const KIT0: Kit18 = { move: 'bus', bed: 'std', diem: 1, gear: 'own', reh: 0, ins: 0, sec: 0, prom: 'local' };

/** O que o estimador sabe da rota para custear o kit. */
export interface KitInfo { people: number; km: number; travel: number; shows: number; days: number; tiers: number[]; gross: number; fame: number; members: number }
export interface KitCost { total: number; parts: [L, number][]; warn: L[] }
/** Contexto do acerto de um show (depois da bilheteria, antes do caixa). */
export interface SettleCtx { gross: number; pay: number; merch: number; demand: number; quality: number; cover: number; fatigue: number; priceMult: number; clim: L; forecast: number }

export const TOUR18: {
  kit?: (s: GameState, kit: Kit18 | undefined, info: KitInfo) => KitCost;
  planned?: (s: GameState, t: Tour, kit: Kit18 | undefined, info: KitInfo) => void;
  /** multiplicador da qualidade do show (ensaio, entrosamento, palco testado, preço × poder de compra) */
  q?: (s: GameState, t: Tour, st: TourStop) => number;
  /** acerto: devolve cachê e merch finais (porta x garantia x "o maior", contestação, merch × poder de compra) */
  settle?: (s: GameState, r: Rng, t: Tour, st: TourStop, c: SettleCtx) => { pay: number; merch: number };
  /** lança o dinheiro do show (no ato ou a prazo, conforme o promotor); false = usa post() */
  book?: (s: GameState, t: Tour, key: string, amount: number, memo: string) => boolean;
} = {};
