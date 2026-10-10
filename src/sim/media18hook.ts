// Rodada 18 (media18) — pontos de encaixe puros entre market.ts e os sistemas de mídia (sys/mkt18, sys/stream18).
// market.ts chama estas funções se estiverem ligadas; os sistemas as ligam ao carregar. Sem imports de sistemas
// (evita ciclo e TDZ no bundle). Desligadas, o mercado usa as fórmulas antigas.

import type { Act, GameState, Release } from './types';

export interface Media18Hooks {
  /** eficiência do canal para o ato (saturação × aprendizado da equipe); 1 = neutro */
  eff?: (s: GameState, actId: string, ch: string) => number;
  /** termo de marketing do calor semanal (substitui 1 + 2,5·E·e^(−idade/9) + 0,3·E) */
  term?: (s: GameState, rel: Release, age: number) => number | null;
  /** termo de marketing da previsão (mesma conta, a partir da lista de canais) */
  fterm?: (s: GameState, marketing: { channel: string; budget: number }[], E: number, age: number, type: Release['type'], q: number) => number | null;
  /** repasse por unidade digital do selo (pró-rata por território, modalidade e plataforma) */
  payout?: (s: GameState, rel: Release, digital: string[]) => number | null;
  /** conversão de ouvintes em fãs (devolve true quando tratou) */
  fans?: (s: GameState, rel: Release, act: Act, units: number) => boolean;
}
export const MEDIA18: Media18Hooks = {};
