// Rodada 20 (B9/B10) — ELEGIBILIDADE DE SCOUTING num lugar só, e pedido de scout sem "fallback" que viola filtro.
//
// B9: geração de sinais, card do radar, proposta e aceite liam status/dono cada um do seu jeito (um ato 'split'
// podia ficar no radar e ser contratado; 'retired' sumia sem explicação). Regra única:
//   - contratável: sem dono (ou dono = o próprio jogador já tem) e status emerging/active;
//   - 'hiatus' é contratável como VOLTA explícita (o card avisa; o aceite reativa o ato);
//   - 'retired', 'split' ou sem integrante vivo: não contratável (o card mostra o motivo).
// B10: o pedido de scout (formato/gênero/mercado/nível) não "relaxa" mais filtros: quando não há ninguém no
// mundo, o selo pode encontrar um ato NOVO que obedece a todos os filtros; se nem isso é possível (gênero sem
// ninguém popular nessa época, nível "estabelecido" que não nasce do nada), o retorno é "sem resultado".
import { CITIES, cityById, familyOf, l, type L } from '../data/world';
import type { Rng } from '../core/rng';
import { genreAvailable20 } from './genretime20';
import type { Act, GameState } from './types';

export interface ScoutReq20 { genreFamily: string; market: string; level: string; role: string }

/** Elegibilidade central (sinal, card, proposta, aceite). */
export function scoutEligible20(s: GameState, act: Act | undefined): { ok: boolean; why?: L; comeback?: boolean } {
  if (!act) return { ok: false, why: l('Ato inexistente.', 'Unknown act.') };
  if (act.owner === 'player') return { ok: false, why: l('Já é do seu selo.', 'Already on your label.') };
  if (act.owner) return { ok: false, why: l('Tem contrato com outro selo.', 'Signed to another label.') };
  { const b = scoutBlock29().f?.(s, act); if (b) return { ok: false, why: b }; } // R29 (contratos+): contrato de produção com produtora NPC
  if (act.status === 'retired') return { ok: false, why: l('Aposentado: não aceita contrato.', 'Retired: not taking deals.') };
  if (act.status === 'split') return { ok: false, why: l('A formação acabou: não há ato para contratar.', 'The act broke up: nobody left to sign.') };
  if (!act.members.some((id) => s.persons[id]?.alive)) return { ok: false, why: l('Sem integrantes vivos.', 'No living members.') };
  if (act.status === 'hiatus') return { ok: true, comeback: true, why: l('Em hiato: assinar é propor a volta (o ato volta à ativa).', 'On hiatus: signing means proposing a comeback (the act becomes active).') };
  return { ok: true };
}

/** Elegível para aparecer como sinal novo (além da regra central: ainda não conhecido). Hiato não gera sinal espontâneo. */
export const signalEligible20 = (s: GameState, a: Act): boolean => scoutEligible20(s, a).ok && a.status !== 'hiatus' && !s.knowledge[a.id];

/** O ato bate com o pedido (mesmos filtros para o mundo e para o ato novo). */
export function matchesReq20(a: Act, req: ScoutReq20): boolean {
  if (req.genreFamily !== 'any' && familyOf(a.genre) !== req.genreFamily) return false;
  if (req.market !== 'any' && cityById[a.city]?.market !== req.market) return false;
  if (req.level === 'beginner' && a.fame > 8) return false;
  if (req.level === 'promising' && (a.fame < 3 || a.fame > 25)) return false;
  if (req.level === 'established' && a.fame < 15) return false;
  if (req.role === 'band' && a.members.length < 2) return false;
  if (req.role === 'solo' && a.members.length !== 1) return false;
  return true;
}

/** Parâmetros de um ato novo que obedece ao pedido — ou null ("sem resultado"). */
export function spawnPlanForReq20(s: GameState, r: Rng, req: ScoutReq20): { city?: string; genre?: string; members?: number; fame?: number } | null {
  if (req.level === 'established') return null; // um nome estabelecido não surge do nada
  let city: string | undefined;
  if (req.market !== 'any') {
    const cs = CITIES.filter((c) => c.market === req.market);
    if (!cs.length) return null;
    city = r.pick(cs).id;
  }
  let genre: string | undefined;
  if (req.genreFamily !== 'any') {
    const gs = Object.keys(s.genrePop).filter((g) => familyOf(g) === req.genreFamily && (s.genrePop[g] ?? 0) > 0.3 && genreAvailable20(s, g)).sort();
    if (!gs.length) return null;
    genre = r.pick(gs);
  }
  const members = req.role === 'band' ? r.int(2, 4) : req.role === 'solo' ? 1 : undefined;
  const fame = req.level === 'promising' ? r.float(3, 6) : req.level === 'beginner' ? r.float(0, 5) : undefined;
  return { city, genre, members, fame };
}

/** R29 (contratos+): bloqueio extra de contratação (sys/npc29: ato com contrato de produção NPC). Hoisted (ciclo de imports). */
export function scoutBlock29(): { f?: (s: GameState, act: Act) => L | null } { const g = scoutBlock29 as unknown as { o?: { f?: (s: GameState, act: Act) => L | null } }; return (g.o ??= {}); }
