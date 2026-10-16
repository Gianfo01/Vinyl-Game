// R31 · onda 4 (POL2) — retrato do artista para os outdoors do mapa ("em alta", "turnê chega à cidade"): o busto do
// jogo (avatar.portraitPx, o mesmo sprite das fichas) reduzido a 13×13 pelo vizinho mais próximo (rosto e ombros).
import type { GameState } from '../../sim/types';
import { portraitPx } from '../pixel/avatar';
import { Px } from '../pixel/px';

const CACHE = new Map<string, HTMLCanvasElement>();
/** Rosto do líder do ato (1º integrante) na época atual; null sem integrante ou sem canvas. */
export function portrait31(s: GameState, actId: string): HTMLCanvasElement | null {
  const a = s.acts[actId];
  const p = a ? s.persons[a.members[0]] : undefined;
  if (!p || typeof document === 'undefined') return null;
  const key = `${p.id}|${s.year}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  const big = portraitPx(p, s.year), q = new Px(13, 13);
  for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) q.set(x, y, big.get(3 + x * 2, 4 + y * 2));
  const c = q.canvas();
  CACHE.set(key, c);
  if (CACHE.size > 40) CACHE.delete(CACHE.keys().next().value!);
  return c;
}
