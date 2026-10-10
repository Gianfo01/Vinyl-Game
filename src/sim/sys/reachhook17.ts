// Rodada 17 — gancho sem dependências (evita ciclo charts7 ↔ reach17): peso mundial próprio de um ato
// (exceção real tipo Shakira/BTS ou hit viral global tipo Gangnam Style). 0 = usa só o peso do país.
import type { Act, GameState } from '../types';

export const reachHook17: { f: (s: GameState, act: Act) => number } = { f: () => 0 };
