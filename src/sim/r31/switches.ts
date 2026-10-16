// R31 · W0-CON — INTERRUPTORES. Registro único de chaves de produção/jogo (id, padrão, descrição bilíngue) com leitura
// `sw(s, id)`. O valor gravado na partida fica em `s.x4.sw31` (só o que difere do padrão); um interruptor pode, em vez
// disso, ler de um campo que já existe (`read`, ex.: o modo nomes reais em `s.config.realNames`) para não haver duas
// fontes. O editor dentro da partida (onda 1) lista `switchDefs()` e grava com `setSw`.

import { l, type L } from '../../data/world';
import { registerExt4 } from '../ext4';
import type { GameState } from '../types';

export type SwVal = boolean | number | string;
/** prod: chave de produção (build/diagnóstico); game: regra de jogo que o jogador ou o editor podem trocar. */
export type SwScope = 'prod' | 'game';
export interface SwitchDef<V extends SwVal = SwVal> {
  id: string;
  def: V;
  desc: L;
  scope: SwScope;
  /** quando o valor já mora noutro lugar do estado: lê de lá (e `write` grava lá) — sem cópia em `sw31` */
  read?: (s: GameState) => V;
  write?: (s: GameState, v: V) => void;
}

declare module '../ext4' { interface Ext4 { sw31: Record<string, SwVal> } }
registerExt4('sw31', () => ({}));

const DEFS = new Map<string, SwitchDef>();

export function registerSwitch<V extends SwVal>(d: SwitchDef<V>): void { DEFS.set(d.id, d as unknown as SwitchDef); }
export const switchDefs = (): SwitchDef[] => [...DEFS.values()];
export const switchDef = (id: string): SwitchDef | undefined => DEFS.get(id);

function store(s: GameState): Record<string, SwVal> {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  return (x.sw31 ??= {}) as Record<string, SwVal>;
}

/** Valor do interruptor nesta partida (padrão quando nunca foi trocado). Id desconhecido é erro de programação. */
export function sw<V extends SwVal = SwVal>(s: GameState, id: string): V {
  const d = DEFS.get(id);
  if (!d) throw new Error(`switch desconhecido: ${id}`);
  if (d.read) return d.read(s) as V;
  const v = store(s)[id];
  return (v === undefined || typeof v !== typeof d.def ? d.def : v) as V;
}

/** Troca o valor (editor/opções). Valor igual ao padrão apaga a entrada (o save guarda só diferenças). */
export function setSw(s: GameState, id: string, v: SwVal): void {
  const d = DEFS.get(id);
  if (!d) throw new Error(`switch desconhecido: ${id}`);
  if (typeof v !== typeof d.def) throw new Error(`switch ${id}: tipo ${typeof v}, esperado ${typeof d.def}`);
  if (d.write) { d.write(s, v); return; }
  const st = store(s);
  if (v === d.def) delete st[id];
  else st[id] = v;
}

// ---------------------------------------------------------------- interruptores de base

registerSwitch({
  id: 'realNames', def: false, scope: 'game',
  desc: l('Nomes e obras reais: ligado mostra nomes reais; desligado mostra as homenagens (troca só na exibição).',
    'Real names and works: on shows real names; off shows the tributes (display only).'),
  read: (s) => !!s.config.realNames,
  write: (s, v) => { s.config.realNames = !!v; },
});
registerSwitch({
  id: 'contracts31.strict', def: false, scope: 'prod',
  desc: l('Contratos da R31 em modo estrito: violação de invariante vira erro em vez de aviso no relatório.',
    'R31 contracts in strict mode: an invariant violation becomes an error instead of a report warning.'),
});
