// R31 · UNI-4 (B.4) — RELAÇÃO COM A PRAÇA: um número por cidade, fonte única.
// Antes eram três: `tour12.rel` (promotores do agente, padrão 30), `route8.rel` (promotor da turnê roteada, padrão 50)
// e `exch20.rel` (cena local da residência, padrão 0). A mesma cidade podia gostar e não gostar de você ao mesmo tempo.
// Agora todos leem e escrevem `x4.city.rel[cidade]` (0..100, padrão 30, esfria de volta a 30). Os três campos saíram.
// Escrita só por `cityRelAdd`/`cityRelPut`/`cityRelEach` (teste r31-uni4 trava escrita fora daqui).

import { clamp } from '../core/rng';
import { l } from '../data/world';
import { registerExt4 } from './ext4';
import { registerEditable } from './r31/editor';
import type { GameState } from './types';

export const CITY_REL0 = 30;
export interface City31 { rel: Record<string, number> }
declare module './ext4' { interface Ext4 { city: City31 } }
registerExt4('city', () => ({ rel: {} }));

function st(s: GameState): City31 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  return (x.city ??= { rel: {} }) as City31;
}

/** Como a praça (promotores e cena local) vê você: 0..100, 30 = neutro. */
export const cityRel = (s: GameState, city: string): number => st(s).rel[city] ?? CITY_REL0;
/** Há registro para a cidade (já houve contato)? */
export const cityRelKnown = (s: GameState, city: string): boolean => st(s).rel[city] !== undefined;
/** Leitura de todas as cidades com registro (cópia). */
export const cityRels = (s: GameState): Record<string, number> => ({ ...st(s).rel });

export function cityRelPut(s: GameState, city: string, v: number): number {
  if (!city) return CITY_REL0;
  return (st(s).rel[city] = clamp(v, 0, 100));
}
export const cityRelAdd = (s: GameState, city: string, d: number): number => cityRelPut(s, city, cityRel(s, city) + d);
/** Aplica `f` a todas as cidades com registro (esfriar tudo, locaute etc.). */
export function cityRelEach(s: GameState, f: (v: number, city: string) => number): void {
  const r = st(s).rel;
  for (const k of Object.keys(r)) r[k] = clamp(f(r[k], k), 0, 100);
}

registerEditable({
  id: 'city.rel', area: 'world', kind: 'number', min: 0, max: 100, step: 1, raw: true,
  label: l('Relação com a praça (cidade da sede)', 'Relationship with the local scene (home city)'),
  get: (s) => Math.round(cityRel(s, s.config.homeCity)),
  set: (s, v) => { cityRelPut(s, s.config.homeCity, Number(v)); },
});
