// R31 · UNI-4 (B.11) — REGISTRO ÚNICO DE FESTIVAIS: `x4.festivals.f[id]`, do mundo e seus, num formato só.
// Antes eram cinco estados: live.fests (terreno do seu festival), fest12.f (negócio/ciclo da edição), fest18.f
// (curadoria, patrocínio, vizinhos, licença), fest8 (festivais do mundo: edição do ano, histórico, convites, recusas)
// e circ17.snub (festival magoado na guerra de headliners). Agora cada festival é UM registro com partes:
//   seu  (src 'own', id do terreno):  land (terreno, line-up, edições), biz (ciclo do fest12), x18 (regras do fest18);
//   mundo (src 'world', id 'w:<índice>'): ed (edição deste ano com line-up), past (edições passadas), snub (até quando
//         guarda mágoa de você — regra da guerra de headliners do circuit17).
// Convites e recusas recentes do circuito do mundo ficam em `w8` (são do circuito, não de um festival só).
// Módulo leve (só tipos e o estado), importável sem ciclo de carga; fest12/fest18/fests8/circuit17 são as regras.

import { registerExt4 } from '../ext4';
import type { GameState } from '../types';
import type { OwnFestival } from './live/state';
import type { F12 } from './fest12';
import type { F18 } from './fest18';
import type { FestEdition8, FestInvite8, FestPast } from './fests8';

export interface Fest31 {
  id: string; src: 'own' | 'world';
  land?: OwnFestival; biz?: F12; x18?: F18;
  fi?: number; ed?: FestEdition8; past?: FestPast[]; snub?: number;
}
export interface Fests31 {
  f: Record<string, Fest31>;
  /** fest12: mês e cidade de cada festival de Empreendimentos na última sincronização */
  snap: Record<string, { m: number; c: string }>;
  /** circuito do mundo: ano montado, convites em aberto, recusas recentes ("fi:actId" → semana) */
  w8: { year: number; invites: FestInvite8[]; cooldown: Record<string, number> };
}
declare module '../ext4' { interface Ext4 { festivals: Fests31 } }
const fresh = (): Fests31 => ({ f: {}, snap: {}, w8: { year: 0, invites: [], cooldown: {} } });
registerExt4('festivals', fresh);
export function fests31(s: GameState): Fests31 {
  const x = s.x4 as unknown as { festivals?: Fests31 };
  return (x.festivals ??= fresh());
}
export const festRec = (s: GameState, id: string): Fest31 | undefined => fests31(s).f[id];

// ---------------------------------------------------------------- seus festivais

/** Seus festivais (terrenos), na ordem de criação (era live.fests). */
export const ownFests = (s: GameState): OwnFestival[] => Object.values(fests31(s).f).filter((x) => x.land).map((x) => x.land!);
export function addOwnFest(s: GameState, land: OwnFestival): void { fests31(s).f[land.id] = { id: land.id, src: 'own', land }; }
/** Registro de um festival seu (cria se o terreno existe). */
export const ownRec = (s: GameState, fid: string): Fest31 | undefined => { const r = fests31(s).f[fid]; return r?.land ? r : undefined; };

// ---------------------------------------------------------------- festivais do mundo

export const worldKey = (fi: number): string => `w:${fi}`;
export function worldRec(s: GameState, fi: number): Fest31 {
  const st = fests31(s), k = worldKey(fi);
  return (st.f[k] ??= { id: k, src: 'world', fi });
}
/** Edições do ano dos festivais do mundo, em ordem do catálogo (era fest8.editions). */
export const editions8 = (s: GameState): FestEdition8[] => Object.values(fests31(s).f).filter((x) => x.ed).map((x) => x.ed!).sort((a, b) => a.fi - b.fi);
export function clearEditions8(s: GameState): void { for (const x of Object.values(fests31(s).f)) delete x.ed; }
export const pastOf8 = (s: GameState, fi: number): FestPast[] => fests31(s).f[worldKey(fi)]?.past ?? [];
export const w8 = (s: GameState): Fests31['w8'] => fests31(s).w8;
