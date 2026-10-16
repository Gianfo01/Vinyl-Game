// R31 · UNI-4 (B.12) — REGISTRO ÚNICO DAS SUAS CASAS DE SHOWS: `x4.venues27.v[chave]`, com a mesma chave do mapa
// ('lv:venue' para a casa construída, 've:<id>' para a casa real comprada). Antes eram três estados (live/state.venue,
// x4.venue12.v e x4.venues17.own); agora cada casa é UM registro com partes:
//   built — a casa construída (clube/teatro/arena: aluguel, bar, acústica, artista da casa, histórico);
//   real  — a casa real comprada (prestígio, linha de programação, preço, conservação);
//   prog  — a programação noite a noite (venue12), guardada na própria casa (pela chave; hoje a construída).
// Módulo leve (só tipos e o estado), importável de qualquer sistema sem ciclo de carga.

import { registerExt4 } from '../ext4';
import type { GameState } from '../types';
import type { L } from '../../data/world';
import type { OwnVenue } from './live/state';
import type { Own17 } from './venues17';
import type { V12 } from './venue12';

export interface House27 { key: string; built?: OwnVenue; real?: Own17; prog?: V12 }
export interface Houses27 { v: Record<string, House27>; log: { y: number; m: number; t: L }[] }
declare module '../ext4' { interface Ext4 { venues27: Houses27 } }
registerExt4('venues27', () => ({ v: {}, log: [] }));
export function houses27(s: GameState): Houses27 {
  const x = s.x4 as unknown as { venues27?: Houses27 };
  return (x.venues27 ??= { v: {}, log: [] });
}
export const BUILT27 = 'lv:venue';
export const realKey27 = (id: string): string => `ve:${id}`;
export const house27 = (s: GameState, key: string): House27 | undefined => houses27(s).v[key];

/** A casa construída (era liveOf(s).venue). */
export const builtVenue = (s: GameState): OwnVenue | null => houses27(s).v[BUILT27]?.built ?? null;
/** Põe (ou tira, com null) a casa construída. Trocar de casa recomeça a programação. */
export function setBuiltVenue(s: GameState, v: OwnVenue | null): void {
  const st = houses27(s);
  if (v) st.v[BUILT27] = { key: BUILT27, built: v };
  else delete st.v[BUILT27];
}
/** As casas reais compradas, na ordem de compra (era v17(s).own). */
export const realVenues = (s: GameState): Own17[] => Object.values(houses27(s).v).filter((h) => h.real).map((h) => h.real!);
export const realVenue = (s: GameState, id: string): Own17 | undefined => houses27(s).v[realKey27(id)]?.real;
export function addRealVenue(s: GameState, o: Own17): void { houses27(s).v[realKey27(o.id)] = { key: realKey27(o.id), real: o }; }
export function dropRealVenue(s: GameState, id: string): void { delete houses27(s).v[realKey27(id)]; }
/** Quantas casas você tem (teto único de 4). */
export const houseCount27 = (s: GameState): number => Object.keys(houses27(s).v).length;
