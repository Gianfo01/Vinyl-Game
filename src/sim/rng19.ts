// Rodada 19 (0.1) — UM FLUXO DE SORTEIO POR SISTEMA. Antes, quase tudo puxava do mesmo s.rng: um evento a mais
// (ou um sistema novo que sorteia uma vez) deslocava todos os sorteios seguintes de todos os outros sistemas, e
// um A/B de equilíbrio media ruído. Agora cada chave tem seu próprio estado sfc32 (semeado por seed+chave e
// guardado no save em s.x4.rng19), então o mercado, os eventos e o diretor sorteiam sempre a mesma sequência,
// não importa o que os outros fizeram. Saves antigos (sem s.rngVersion) seguem no fluxo único: mesma história.
//
//   const r2 = rng19(s, 'events', r);                       // fluxo persistente da chave (ou `r` em save antigo)
//   const r3 = rng19(s, 'ag18', () => Rng.fromSeed(...));   // legado preguiçoso (sistemas que já semeavam por semana)
//
// Módulo puro (só ext4 e core/rng): importável de qualquer lugar sem ciclo.

import { Rng, seedState, type RngState } from '../core/rng';
import { registerExt4 } from './ext4';
import type { GameState } from './types';

export const RNG_VERSION19 = 19;
export interface Rng19State { st: Record<string, RngState> }
declare module './ext4' { interface Ext4 { rng19: Rng19State } }
registerExt4('rng19', () => ({ st: {} }));

/** Chaves em uso (documentação + teste): quem tem fluxo próprio. */
export const STREAMS19: Record<string, string> = {
  events: 'storyteller: quais eventos/decisões aparecem no mês (events.ts)',
  decide: 'resolução das opções escolhidas nas decisões (events.ts resolveDecision)',
  director: 'diretor de arcos e lembranças (director.ts)',
  market: 'ruído semanal das paradas (market.ts marketWeek)',
  launch: 'sorte do lançamento no apelo (market.ts computeAppeal)',
  dm18: 'mestre de drama: fases e fios (dm18)',
  sit17: 'situações do mês (situations17)',
  ag18: 'agência dos NPCs (agency18)',
  disc18: 'demos e descobertas do mês (discover18)',
  links19a: 'ligações R19 grupo A: tragédia em festival lotado (links19a)',
};

export const perSystem19 = (s: GameState): boolean => (s.rngVersion ?? 0) >= RNG_VERSION19;

function stream(s: GameState, key: string): Rng {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.rng19 ??= { st: {} }) as Rng19State;
  st.st ??= {};
  // o array do estado é o mesmo do save: Rng.next muta no lugar
  return new Rng((st.st[key] ??= seedState(`${s.config.seed}|rng19|${key}`)));
}

/** Gerador do sistema `key`. Em save antigo devolve o legado (o `Rng` passado ou o criado pela função). */
export function rng19(s: GameState, key: string, legacy: Rng | (() => Rng)): Rng {
  if (perSystem19(s)) return stream(s, key);
  return typeof legacy === 'function' ? legacy() : legacy;
}
