// Revisão 21 (G-12) — MOTOR MÍNIMO DE CARTÃO para quem não passa por events.emitEvent: aplica a voz do narrador
// (narrator13), os filtros de conteúdo/regra RS (allowed21) e uma recarga por chave. Usado por situations17, dm18,
// lifeevents10, inbox18 (mensagens com ações), rivals12.add e crimenpc17 (avisos).

import type { L } from '../data/world';
import { allowed21 } from './allowed21';
import { narrate } from './narrator13';
import type { GameState } from './types';

export interface Card21 {
  /** chave estável (ex.: 'sit17:burnout') — semente da voz do narrador e da recarga */
  key: string;
  text: L;
  tone?: 'good' | 'bad' | 'neutral' | 'info' | 'mixed';
  /** tags de conteúdo; qualquer uma filtrada (ou sensível com ato RS) cancela o cartão */
  tags?: string[];
  /** ato envolvido (regra RS) */
  act?: string;
  /** meses de recarga para esta chave (0/ausente = sem recarga) */
  cooldown?: number;
}

/** Texto narrado do cartão, ou null quando ele não deve aparecer (filtro/RS/recarga). */
export function emitCard21(s: GameState, c: Card21): L | null {
  if (c.tags?.some((t) => !allowed21(s, t, c.act))) return null;
  if (c.cooldown) {
    const k = `card21:${c.key}`;
    if ((s.eventCooldowns[k] ?? -1) > s.week) return null;
    s.eventCooldowns[k] = s.week + Math.round(c.cooldown * 4.35);
  }
  const tone = c.tone === 'good' ? 'good' : c.tone === 'bad' ? 'bad' : 'neutral';
  return narrate(s, c.text, tone, c.key);
}
