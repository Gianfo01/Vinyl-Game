// Rodada 19 (cenas) — "isso é seu?" para cenas e prêmios em TODOS os papéis: selo (seus atos), artista (a sua banda)
// e empresário (os clientes de outros selos). Sem imports pesados (lê o estado do ventures9 direto) para não criar ciclos.

import type { GameState, Release } from './types';

export type Rel19 = 'own' | 'client' | 'former' | null;
const clients = (s: GameState): { actId: string }[] => ((s as unknown as { x4?: { ventures9?: { mg?: { clients?: { actId: string }[] } } } }).x4?.ventures9?.mg?.clients) ?? [];

/** Relação do jogador com o ato: seu (selo/banda), cliente (empresário), ex-artista do selo (catálogo seu) ou nenhuma. */
export function relAct19(s: GameState, actId?: string | null): Rel19 {
  const a = actId ? s.acts[actId] : undefined;
  if (!a) return null;
  if (a.owner === 'player' || a.playerBand) return 'own';
  if (clients(s).some((c) => c.actId === a.id)) return 'client';
  if (a.releases.some((id) => s.releases[id]?.owner === 'player')) return 'former';
  return null;
}
/** Ato que conta como "seu" numa cena de prêmio ou nº 1 (seu ou cliente). */
export const mineAct19 = (s: GameState, actId?: string | null): boolean => { const r = relAct19(s, actId); return r === 'own' || r === 'client'; };
export const mineRel19 = (s: GameState, rel?: Release): boolean => !!rel && (rel.owner === 'player' || mineAct19(s, rel.actId));
/** Ato próximo o bastante para um velório virar cena: seu, cliente ou ex-artista do selo. */
export const closeAct19 = (s: GameState, actId?: string | null): boolean => !!relAct19(s, actId);
