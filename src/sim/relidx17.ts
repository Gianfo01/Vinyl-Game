// Índice ano → lançamentos (rodada 17, desempenho): montado uma vez por partida (WeakMap) varrendo s.releases e
// atualizado nos pontos que inserem lançamentos (noteRelease17). Mesma ordem de s.releases; apagados são pulados.
import type { GameState, Release } from './types';

interface RIx { y: Map<number, Release[]>; at: Map<string, [number, number]> }
const RX = new WeakMap<GameState, RIx>();

function add(x: RIx, rel: Release): void {
  const pos = x.at.get(rel.id);
  if (pos) { x.y.get(pos[0])![pos[1]] = rel; return; }
  let l = x.y.get(rel.year);
  if (!l) x.y.set(rel.year, (l = []));
  x.at.set(rel.id, [rel.year, l.length]);
  l.push(rel);
}
/** Chamar logo depois de `s.releases[rel.id] = rel`. */
export function noteRelease17(s: GameState, rel: Release): void {
  const x = RX.get(s);
  if (x) add(x, rel);
  AL.delete(s);
}
/** Chamar depois de apagar lançamentos de s.releases. */
export function releasesTouched17(s: GameState): void { AL.delete(s); }

// Object.values(s.releases) compartilhado: vale enquanto nenhum lançamento entra/sai (e por semana, por segurança).
// O array devolvido é somente leitura (os objetos são os vivos, então campos como live/owner estão sempre atuais);
// inserir/apagar no meio de um laço não muda o array em uso (vira um novo na próxima chamada), como antes.
const AL = new WeakMap<GameState, { w: number; list: readonly Release[] }>();
export function allReleases17(s: GameState): readonly Release[] {
  const c = AL.get(s);
  if (c && c.w === s.week) return c.list;
  const list = Object.values(s.releases);
  AL.set(s, { w: s.week, list });
  return list;
}
/** Lançamentos do ano (só os que ainda existem em s.releases), na ordem de inserção. */
export function* releasesOfYear17(s: GameState, year: number): Generator<Release> {
  let x = RX.get(s);
  if (!x) {
    x = { y: new Map(), at: new Map() };
    for (const id in s.releases) add(x, s.releases[id]);
    RX.set(s, x);
  }
  for (const r of x.y.get(year) ?? []) if (s.releases[r.id] === r) yield r;
}
