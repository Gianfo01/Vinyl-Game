// Adaptador de viagem/clima usado pela simulação: delega a travel.ts (fronteiras históricas,
// vistos, transporte por era, clima) e converte para centavos da era.

import { type L } from '../data/world';
import { climateAt, travelLeg } from './travel';
import type { GameState } from './types';
import { money } from './util';

export interface LegInfo {
  km: number;
  days: number;
  cost: number; // centavos
  mode: string;
  visa?: { needed: boolean; cost: number; denyChance: number; reason: L; boycott?: boolean };
  borderNote?: L;
}

export function legInfo(s: GameState, from: string, to: string, people: number): LegInfo {
  if (!from || !to || from === to) return { km: 0, days: 0, cost: 0, mode: 'none' };
  const leg = travelLeg(from, to, s.year, people, s.config.homeCity);
  return {
    km: leg.km,
    days: leg.days,
    cost: money(s, leg.costReal),
    mode: leg.mode,
    visa: leg.visa.needed ? { needed: true, cost: money(s, leg.visa.costReal), denyChance: leg.visa.denyChance, reason: leg.visa.reason, boycott: leg.visa.boycott } : undefined,
    borderNote: leg.borderNote,
  };
}

export function climateInfo(_s: GameState, cityId: string, month: number): { label: L; outdoorFactor: number; cancelRisk: number; icon: string } {
  const c = climateAt(cityId, month);
  return { label: c.name, outdoorFactor: c.outdoorFactor, cancelRisk: c.cancelRisk, icon: c.icon };
}
