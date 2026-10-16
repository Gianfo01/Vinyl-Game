// R31 · UNI-4 (B.19) — ESTADO ÚNICO DOS RIVAIS atrás da fachada (rivals19). Antes eram cinco estados em x4: rivals8
// (jogadas, interesse, cenas, aposta tecnológica), rivals12 (disputas na tela, lances, acordos de distribuição),
// rivalmind18 (memória estratégica), rv27 (mágoa pessoal e cópias) e rs28 (contadores da reserva própria). Agora:
//   lb[selo] — o que é de cada rival, num registro só: mind (memória estratégica), mem (mágoa pessoal com lembranças),
//              moves (últimas jogadas) e tech (aposta tecnológica);
//   o resto é do circuito de rivais inteiro (disputas, lances, cópias, contadores), em partes do mesmo estado.
// Módulo leve (só tipos e o estado), importável sem ciclo de carga; os sistemas são as regras.

import { registerExt4 } from '../ext4';
import type { GameState } from '../types';
import type { Mind18, RM18 } from './rivalmind18';
import type { Riv27, Rv27State } from './rivals27';
import type { Move, Rivals8State } from './rivals8';
import type { Rivals12State } from './rivals12';
import type { Rs28State } from './rivalsense28';

export interface Rival31 { mind?: Mind18; mem?: Riv27; moves?: Move[]; tech?: { id: string; until: number } }
export interface Rivals31 {
  lb: Record<string, Rival31>;
  r8: Rivals8State; r12: Rivals12State; m18: RM18; r27: Rv27State; r28: Rs28State;
}
declare module '../ext4' { interface Ext4 { rivals: Rivals31 } }
const fresh = (): Rivals31 => ({
  lb: {},
  r8: { interest: {}, scene: {}, clash: {}, lastClash: -999 },
  r12: { c: [], bids: {}, deals: [], push: {}, seenAu: {}, seen: [], cl: {}, cd: {}, seq: 0 },
  m18: { bids: {}, au: {} },
  r27: { au: {}, k: {}, hit: {}, copies: [], seq: 0 },
  r28: { live: 0, contests: 0, wins: 0, counters: 0, backoffs: 0 },
});
registerExt4('rivals', fresh);
export function rivals31(s: GameState): Rivals31 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  return (x.rivals ??= fresh()) as Rivals31;
}
/** Registro de um rival (cria). */
export const rivalRec = (s: GameState, lbId: string): Rival31 => (rivals31(s).lb[lbId] ??= {});
/** Registro de um rival, só leitura (não cria). */
export const rivalOf = (s: GameState, lbId: string): Rival31 | undefined => rivals31(s).lb[lbId];
/** Rivais que têm uma parte (na ordem em que entraram no registro). */
export function rivalsWith<K extends keyof Rival31>(s: GameState, k: K): [string, NonNullable<Rival31[K]>][] {
  return Object.entries(rivals31(s).lb).filter(([, x]) => x[k] !== undefined).map(([id, x]) => [id, x[k] as NonNullable<Rival31[K]>]);
}
