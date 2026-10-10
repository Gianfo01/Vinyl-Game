// Rodada 17 — índice nome real → ato do jogo (para relíquias, épocas, covers/samples, alcance mundial).
import { REAL_ACTS } from '../../data/realnames';
import type { Act, GameState } from '../types';
import { realDataOf } from './realworld';

export const norm17 = (n: string): string => n.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
const IDX = new WeakMap<GameState, { n: number; m: Map<string, string> }>();

/** Nome real canônico do ato (mesmo no modo de nomes ficcionais). */
export function realName17(act: Act | undefined): string | undefined {
  if (!act?.catalogNo) return undefined;
  if (act.catalogNo < 1000) return REAL_ACTS[act.catalogNo]?.name;
  return realDataOf(act)?.n;
}

/** Ato do jogo que corresponde ao artista real (ou undefined se ainda não existe nesta partida). */
export function realAct17(s: GameState, name: string): Act | undefined {
  const n = Object.keys(s.acts).length;
  let x = IDX.get(s);
  if (!x || x.n !== n) {
    x = { n, m: new Map() };
    for (const a of Object.values(s.acts)) { const rn = realName17(a); if (rn) x.m.set(norm17(rn), a.id); }
    IDX.set(s, x);
  }
  const id = x.m.get(norm17(name));
  return id ? s.acts[id] : undefined;
}

/** Nome para mostrar: real com nomes reais ligados; senão o nome que o ato tem nesta partida. */
export const shownName17 = (s: GameState, name: string): string => (s.config.realNames ? name : realAct17(s, name)?.name ?? name);
