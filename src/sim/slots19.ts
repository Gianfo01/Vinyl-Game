// Rodada 19 (onda 5) — ganchos injetados de módulos centrais (economy, …) que estão num ciclo de import com src/sim/sys.
// Folha: só tipos. Quem define o comportamento (sys/careers19) atribui `.f` ao carregar, sem zona morta temporal.
import type { GameState } from './types';

/** A sede de selo cobra aluguel? (careers19: só com a carreira de selo ou músico ativa) */
export const rentOn19: { f: (s: GameState) => boolean } = { f: () => true };
