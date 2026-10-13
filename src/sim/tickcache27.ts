// r27 (desempenho): listas de s.acts / s.releases compartilhadas DENTRO de um passo do relógio (advanceWeek).
// Object.values/for-in num objeto com milhares de chaves custa 0,4–3 ms por chamada (o V8 refaz a lista de chaves);
// dezenas de sistemas fazem isso várias vezes por semana. Aqui a lista é montada uma vez por passo e refeita quando
// um ato/lançamento entra ou sai (actsTouched17 / noteRelease17 / releasesTouched17 — os mesmos pontos que já
// mantêm os índices da r17). Fora do passo (interface, testes que mexem no estado à mão) nada é guardado: devolve
// a lista na hora, como antes. Mesma ordem de Object.values; os objetos são os vivos (owner/status sempre atuais).
// Os arrays devolvidos são somente leitura (nunca ordenar/alterar no lugar).
import type { Act, GameState, Release } from './types';
import { actsVersion17 } from './actidx17';

let TICK: GameState | null = null;
let SEQ = 0; // identidade do passo (nunca entra no estado do jogo)

/** Roda `fn` como um passo do relógio: dentro dele as listas abaixo ficam guardadas. */
export function tickScope27<T>(s: GameState, fn: () => T): T {
  const prev = TICK;
  if (prev !== s) { TICK = s; SEQ++; }
  try { return fn(); } finally { if (prev !== s) { TICK = prev; SEQ++; } }
}

export const inTick27 = (s: GameState): boolean => TICK === s;

const AC = new WeakMap<GameState, { q: number; v: number; ks: string[]; vs: Act[] }>();
function actsEntry(s: GameState): { ks: string[]; vs: Act[] } | null {
  if (TICK !== s) return null;
  const v = actsVersion17(s);
  let c = AC.get(s);
  if (!c || c.q !== SEQ || c.v !== v) {
    const ks = Object.keys(s.acts);
    c = { q: SEQ, v, ks, vs: ks.map((k) => s.acts[k]) };
    AC.set(s, c);
  }
  return c;
}
/** Object.values(s.acts), guardado durante o passo. */
export function actsNow27(s: GameState): readonly Act[] {
  return actsEntry(s)?.vs ?? Object.values(s.acts);
}
/** Ids dos atos do jogador (mesmo resultado e ordem do for-in em util.playerActs), ou null fora do passo. */
export function playerActIds27(s: GameState): string[] | null {
  const c = actsEntry(s);
  if (!c) return null;
  const out: string[] = [];
  const { ks, vs } = c;
  for (let i = 0; i < vs.length; i++) {
    const a = vs[i];
    if (a.owner === 'player' && a.status !== 'retired' && a.status !== 'split') out.push(ks[i]);
  }
  return out;
}

const RC = new WeakMap<GameState, { q: number; vs: Release[]; at?: Map<string, number> }>();
/** Object.values(s.releases), guardado durante o passo. */
export function releasesNow27(s: GameState): readonly Release[] {
  if (TICK !== s) return Object.values(s.releases);
  let c = RC.get(s);
  if (!c || c.q !== SEQ) { c = { q: SEQ, vs: Object.values(s.releases) }; RC.set(s, c); }
  return c.vs;
}
/** relidx17.noteRelease17: lançamento entrou (ou foi regravado) em s.releases — cópia nova com ele no fim (ou no
 *  mesmo lugar), como Object.values faria; laços em andamento seguem no array antigo. */
export function releaseNoted27(s: GameState, rel: Release): void {
  const c = RC.get(s);
  if (!c || c.q !== SEQ || TICK !== s) { RC.delete(s); return; }
  c.at ??= new Map(c.vs.map((r, i) => [r.id, i]));
  const i = c.at.get(rel.id), vs = c.vs.slice();
  if (i === undefined) { c.at.set(rel.id, vs.length); vs.push(rel); } else vs[i] = rel;
  c.vs = vs;
}
/** relidx17.releasesTouched17: lançamentos saíram de s.releases. */
export function releasesGone27(s: GameState): void { RC.delete(s); }
