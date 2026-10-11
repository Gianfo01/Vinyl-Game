// Rodada 20 (B11) — SAÍDA DE INTEGRANTE num lugar só. Antes, cada sistema tirava a pessoa de act.members por conta
// própria (aposentadoria, demissão, briga, morte, luto…) e só alguns trocavam o líder: a banda podia ficar com
// leaderId de um ex-integrante (créditos, votações e leituras usavam quem já saiu) e facções com gente de fora.
// Regra: depois de qualquer saída, leaderId é um integrante VIVO (o atual, se continuar; senão o primeiro vivo)
// ou fica vazio quando não sobra ninguém; facções perdem a pessoa e grupos vazios somem.
// Módulo puro (só tipos): importável de qualquer sistema sem ciclo.
import type { Act, GameState } from './types';

/** Garante leaderId = integrante vivo (ou nenhum). Devolve true se mudou. */
export function fixLeader20(s: GameState, act: Act): boolean {
  const cur = act.leaderId;
  if (cur && act.members.includes(cur) && s.persons[cur]?.alive) return false;
  const next = act.members.find((id) => s.persons[id]?.alive);
  if (next) act.leaderId = next; else delete act.leaderId;
  const f = s.factions?.[act.id];
  if (f) f.leaderId = act.leaderId;
  return act.leaderId !== cur;
}

/** Tira a pessoa das facções do ato (grupos vazios somem). */
export function dropFromFactions20(s: GameState, actId: string, personId: string): void {
  const f = s.factions?.[actId];
  if (!f) return;
  f.groups = f.groups.map((g) => g.filter((x) => x !== personId)).filter((g) => g.length > 0);
}

/** Saída comum: membros, liderança e facções de uma vez. */
export function exitMember20(s: GameState, act: Act, personId: string): void {
  act.members = act.members.filter((x) => x !== personId);
  dropFromFactions20(s, act.id, personId);
  fixLeader20(s, act);
}
