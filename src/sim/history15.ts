// Rodada 15 — modos de história para artistas reais (RunConfig.history), escolhidos no Novo Jogo:
// - strict ("Vida real exata"): atos reais seguem o roteiro real — discos reais nas datas reais, mortes,
//   separações, voltas e trocas de formação com 100% de chance; sem mortes/separações sorteadas nem discos
//   inventados. Se o jogador interfere (contrata, rouba, monta a banda), a história DAQUELE ato diverge.
// - loose ("Vida real com variações", padrão = comportamento antigo): roteiro real de discos e formação,
//   mortes reais só com "Mortes nos anos reais" (85%), e a simulação ainda inventa discos e separações.
// - free ("Personagens reais, história aleatória"): pessoas e estreias reais, mas a carreira é simulada:
//   discos/formação reais viram probabilidades, mortes reais são ignoradas e as mortes são sorteadas.
// Sem estado de RNG próprio: as decisões extras usam um hash da semente (determinístico, não mexe na sequência).

import type { Act, GameState, RunConfig } from './types';

export type HistoryMode = NonNullable<RunConfig['history']>;
export const histMode = (s: GameState): HistoryMode => s.config.history ?? 'loose';

/** Normaliza a configuração (Vida real exata força nomes reais, datas reais e mortes reais). */
export function normalizeHistory(cfg: RunConfig): void {
  if (cfg.history !== 'strict') return;
  cfg.mode = 'historic';
  cfg.realNames = true;
  cfg.realFates = true;
}

/** O jogador alterou a história deste ato (contratou, roubou ou é a própria banda). */
export const histAltered = (s: GameState, a: Act): boolean => a.owner === 'player' || !!a.playerBand || !!(s.flags as Record<string, number>)[`h15alt:${a.id}`];

/** Modo exato e ato real intocado: nada de sorteio de separação, aposentadoria, solo ou disco inventado. */
export const histLocked = (s: GameState, a: Act): boolean => histMode(s) === 'strict' && !!a.catalogNo && !histAltered(s, a);

/** O roteiro real não vale mais para este ato (comportamento antigo: só se for do jogador). */
export const histDiverged = (s: GameState, a: Act): boolean => a.owner === 'player' || (histMode(s) === 'strict' && histAltered(s, a));

/** Número em [0,1) fixo para (semente, chave) — sorteios do modo livre sem consumir o RNG do jogo. */
export function histRoll(s: GameState, key: string): number {
  let h = 2166136261;
  const str = `${s.config.seed}|${key}`;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}
