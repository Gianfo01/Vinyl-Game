// Rodada 23 (B) — CONTADORES QUE CONTAM PROBLEMA. Número só para o que pede ação (tom 'bad'); itens informativos
// ganham no máximo um ponto neutro; a linha de "tudo bem" (tom 'good', ex.: "Nada exige você agora") não conta.

import type { GameState } from './types';
import { items18 } from './sys/inbox18';

export interface Tone23 { tone: 'good' | 'bad' | 'info' | string }
export interface Badge23 { n: number; dot: boolean }

/** Contagem do cabeçalho: n = problemas reais; dot = há só informação (sem problema). */
export function badge23(qs: readonly Tone23[]): Badge23 {
  const n = qs.filter((q) => q.tone === 'bad').length;
  return { n, dot: n === 0 && qs.some((q) => q.tone === 'info') };
}

/** A lista é só a linha de "tudo bem" (ou vazia)? */
export const allClear23 = (qs: readonly Tone23[]): boolean => qs.every((q) => q.tone === 'good');

/** Selo do Cockpit no menu: decisões na mesa + mensagens que pedem resposta (não conta notícia lida/não lida). */
export function cockpitBadge23(s: GameState): number {
  const ask = items18(s).filter((x) => x.msg?.actions?.length && !x.msg.resolved).length;
  return s.decisions.length + ask;
}
