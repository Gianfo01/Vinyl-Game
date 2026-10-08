// Perks (rodada 6): um registro único de bônus numéricos vindos de origem do personagem, traços,
// estilo de vida, cartas do selo, mutators, sócios e decisões. Cada fonte devolve valores por chave;
// o código da simulação pergunta `perk(s, 'offer')` sem saber de onde veio.
//
// Convenções das chaves:
//  - aditivas em pontos: offer (score da oferta, ~0.05 = bom), critics (pontos na nota), songQ (pontos),
//    trust (confiança inicial do artista), morale (por mês no elenco), scoutActions, signals, energy,
//    demos (demos extras/mês), reputation (por ano)
//  - fracionárias (0.1 = +10%): appeal, showRevenue, chartUnits, pressingCost (negativo = mais barato),
//    scoutAccuracy (estreita intervalos), stress (mais estresse), xp, valuation, staffCost, wealth (renda
//    pessoal mensal em dólares reais, não fração), advance (adiantamento esperado pelos artistas)

import type { L } from '../data/world';
import type { Act, GameState } from './types';

export type PerkKey =
  | 'offer' | 'critics' | 'songQ' | 'trust' | 'morale' | 'scoutActions' | 'signals' | 'energy' | 'demos' | 'reputation'
  | 'appeal' | 'showRevenue' | 'chartUnits' | 'pressingCost' | 'scoutAccuracy' | 'stress' | 'xp' | 'valuation'
  | 'staffCost' | 'wealth' | 'advance' | 'scheme';

export type PerkValues = Partial<Record<PerkKey, number>>;

export interface PerkEntry {
  label: L;
  values: PerkValues;
  /** restringe o efeito a atos que passam no filtro (só para chaves com ato: appeal, songQ, showRevenue, chartUnits, critics) */
  act?: (s: GameState, a: Act) => boolean;
}

type Source = (s: GameState) => PerkEntry[];
const SOURCES: { id: string; fn: Source }[] = [];

export function registerPerkSource(id: string, fn: Source): void {
  const i = SOURCES.findIndex((x) => x.id === id);
  if (i >= 0) SOURCES[i] = { id, fn };
  else SOURCES.push({ id, fn });
}

const cache = new WeakMap<GameState, { week: number; ver: number; entries: PerkEntry[] }>();
let version = 0;
/** Invalida o cache depois de uma escolha do jogador (traço, perk, carta, sócio). */
export function bumpPerks(): void {
  version += 1;
}

export function perkEntries(s: GameState): PerkEntry[] {
  const c = cache.get(s);
  if (c && c.week === s.week && c.ver === version) return c.entries;
  const entries = computeEntries(s);
  cache.set(s, { week: s.week, ver: version, entries });
  return entries;
}

function computeEntries(s: GameState): PerkEntry[] {
  const out: PerkEntry[] = [];
  for (const src of SOURCES) {
    try {
      out.push(...src.fn(s));
    } catch {
      /* fonte com estado ausente não derruba a simulação */
    }
  }
  return out;
}

/** Soma de uma chave; com `act`, inclui as entradas restritas que valem para ele. */
export function perk(s: GameState, key: PerkKey, act?: Act): number {
  let v = 0;
  for (const e of perkEntries(s)) {
    const x = e.values[key];
    if (!x) continue;
    if (e.act && (!act || !e.act(s, act))) continue;
    v += x;
  }
  return v;
}

/** Detalhe de uma chave para tooltips: [rótulo, valor]. */
export function perkBreakdown(s: GameState, key: PerkKey, act?: Act): { label: L; value: number }[] {
  return perkEntries(s).filter((e) => e.values[key] && (!e.act || (act && e.act(s, act)))).map((e) => ({ label: e.label, value: e.values[key]! }));
}
