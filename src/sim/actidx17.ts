// Índice pessoa → atos compartilhado (rodada 17, desempenho). Vale por semana e é refeito quando entra/sai ato
// (s.idSeq mudou e a contagem de atos também). Guardado por partida (WeakMap), nunca entre jogos.
import type { Act, GameState } from './types';

interface ActIx { w: number; seq: number; n: number; m: Map<string, Act[]>; v: number }
const IX = new WeakMap<GameState, ActIx>();
let VER = 0; // só identidade de versão (nunca entra no estado do jogo)

function ix(s: GameState): ActIx {
  let x = IX.get(s);
  const seq = s.idSeq ?? 0;
  if (x && x.w === s.week && x.seq === seq) return x;
  const n = Object.keys(s.acts).length;
  if (x && x.w === s.week && x.n === n) { x.seq = seq; return x; }
  const m = new Map<string, Act[]>();
  for (const a of Object.values(s.acts)) for (const id of a.members) { const xs = m.get(id); if (xs) xs.push(a); else m.set(id, [a]); }
  x = { w: s.week, seq, n, m, v: ++VER };
  IX.set(s, x);
  return x;
}
/** Atos (vivos ou não) em que a pessoa está na formação atual. */
export const actsOfPerson17 = (s: GameState, pid: string): Act[] => ix(s).m.get(pid) ?? [];
/** Versão do índice (muda a cada reconstrução): serve de chave para caches derivados. */
export const actIxVersion17 = (s: GameState): number => ix(s).v;
/** Força reconstrução (ex.: mudança de formação no meio da semana). */
export const dropActIx17 = (s: GameState): void => { IX.delete(s); };
