// Revisão 21 (G-5) — UM SÓ LUGAR para a regra de conteúdo: filtros de conteúdo da partida (`config.contentFilters`) e a
// regra de separação reforçada de um ato (`act.rs`, Catálogo regra 2) valem para TODOS os motores (feud18, crimenpc17,
// dmsits18, sitsworld17, npc17…), não só para events.ts/sits17.

import type { Act, GameState } from './types';

/** Tags que nunca recaem sobre atos com regra RS (events.SENSITIVE_TAGS + romance/sexo). */
export const SENSITIVE21 = ['drugs', 'death', 'crime', 'violence', 'controversy', 'health', 'sex', 'romance'];

/** Pode acontecer conteúdo com a tag `tag` (opcionalmente envolvendo o ato)? */
export function allowed21(s: GameState, tag: string, act?: Act | string | null): boolean {
  if (s.config.contentFilters.includes(tag)) return false;
  const a = typeof act === 'string' ? s.acts[act] : act;
  return !(a?.rs && SENSITIVE21.includes(tag));
}

/** Todas as tags permitidas. */
export const allowedAll21 = (s: GameState, tags: string[], act?: Act | string | null): boolean => tags.every((t) => allowed21(s, t, act));
