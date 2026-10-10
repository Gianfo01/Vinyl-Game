// Índice pessoa → atos compartilhado (rodada 17, desempenho). Refeito a cada semana e quando um ato entra ou sai
// de s.acts (actsTouched17, chamado nos pontos que criam/apagam atos). Cada consulta confere a formação atual,
// então quem saiu de um ato no meio da semana já some; quem entrou aparece na reconstrução seguinte.
// Guardado por partida (WeakMap), nunca entre jogos.
import type { Act, GameState } from './types';

interface ActIx { w: number; av: number; m: Map<string, Act[]>; v: number }
const IX = new WeakMap<GameState, ActIx>();
const AV = new WeakMap<GameState, number>();
let VER = 0; // só identidade de versão (nunca entra no estado do jogo)

/** Avisa que s.acts ganhou ou perdeu atos (invalida o índice). */
export const actsTouched17 = (s: GameState): void => { AV.set(s, (AV.get(s) ?? 0) + 1); };

function ix(s: GameState): ActIx {
  let x = IX.get(s);
  const av = AV.get(s) ?? 0;
  if (x && x.w === s.week && x.av === av) return x;
  const m = new Map<string, Act[]>();
  for (const a of Object.values(s.acts)) for (const id of a.members) { const xs = m.get(id); if (xs) xs.push(a); else m.set(id, [a]); }
  x = { w: s.week, av, m, v: ++VER };
  IX.set(s, x);
  return x;
}
/** Atos (vivos ou não) em que a pessoa está na formação atual, na ordem de s.acts. */
export function actsOfPerson17(s: GameState, pid: string): Act[] {
  const xs = ix(s).m.get(pid);
  if (!xs) return [];
  for (const a of xs) if (s.acts[a.id] !== a || !a.members.includes(pid)) return xs.filter((b) => s.acts[b.id] === b && b.members.includes(pid));
  return xs;
}
/** Versão do índice (muda a cada reconstrução): serve de chave para caches derivados. */
export const actIxVersion17 = (s: GameState): number => ix(s).v;
