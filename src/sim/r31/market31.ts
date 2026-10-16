// R31 · onda 3 (D · Mercado e Y · Paradas por país) — interruptores, a pressão de mercado da era digital e os ganchos
// leves que market.ts e charts7 chamam (preenchidos por sys/mercado31.ts, que conhece a fama por país). Sem ganchos de
// simulação aqui: este módulo é importado cedo (market.ts) e não pode mudar a ordem dos sistemas.
//
// D · Mercado
//   d31.pressure     tira a penalização pós-1990 que só o jogador sofria ("todo mundo grava bem": −0,75 de qualidade por
//                    ano, até −15) e põe no lugar uma pressão de mercado IGUAL PARA TODOS: a demanda total da semana
//                    encolhe na era digital (mercado saturado: catálogo infinito, playlists, atenção dividida). Mexe no
//                    absoluto (o tamanho do mercado), porque um fator igual numa fatia relativa se anularia.
//   d31.pressureMin  quanto da demanda sobra no auge da pressão (de 1990 até 2005 desce de 1 até este valor)
//   d31.forecast     a previsão de vendas usa a mesma conta das vendas reais (marketWeek), sem erro sistemático
//   d31.transport    turnê: transporte escolhido por trecho (padrão automático pela época)
// Y · Paradas por país (cada um com interruptor próprio; ver sys/mercado31.ts)
//   y31.local  fama no país pesa nas vendas ali (e soma na demanda total); y31.lang língua; y31.laws leis e cotas só no
//   país da lei; y31.domino nº 1 puxa vizinhos e mesma língua; y31.fame fama menos uniforme (teto fora de mercado e
//   língua, parada nacional soma à fama global, NPCs guardam picos); y31.reserve parte da parada reservada ao artista
//   local (último recurso; ligado porque a medição mostrou necessidade — Japão 53% → 86%, ver docs/r31/dy.md).

import { l, type L } from '../../data/world';
import type { Act, GameState, Release } from '../types';
import { registerSwitch, sw } from './switches';

registerSwitch({ id: 'd31.pressure', def: true, scope: 'game',
  desc: l('Mercado: sem a penalização de qualidade pós-1990 só do jogador; no lugar, pressão de mercado da era digital igual para todos, mostrada na explicação das vendas.',
    'Market: no post-1990 quality penalty on the player only; instead an equal digital-era market pressure for everyone, shown in the sales breakdown.') });
registerSwitch({ id: 'd31.pressureMin', def: 0.8, scope: 'game',
  desc: l('Pressão de mercado no auge da era digital: fração da demanda que sobra (1 = sem pressão).', 'Market pressure at the height of the digital era: share of demand left (1 = no pressure).') });
registerSwitch({ id: 'd31.forecast', def: true, scope: 'game',
  desc: l('Previsão de vendas pela mesma conta das vendas reais.', 'Sales forecast uses the same math as real sales.') });
registerSwitch({ id: 'd31.transport', def: true, scope: 'game',
  desc: l('Turnê: escolher o transporte de cada trecho (padrão automático pela época).', 'Tour: choose the transport of each leg (automatic by era by default).') });
registerSwitch({ id: 'y31.local', def: true, scope: 'game',
  desc: l('Paradas: a fama num país pesa nas vendas ali (turnê e divulgação chegam às paradas do país).', 'Charts: fame in a country weighs on sales there (tours and promotion reach that country\'s charts).') });
registerSwitch({ id: 'y31.lang', def: true, scope: 'game',
  desc: l('Paradas: mesma língua vende mais, língua diferente vende menos (pesa menos com streaming e vídeo curto).', 'Charts: same language sells more, a foreign language less (weighs less with streaming and short video).') });
registerSwitch({ id: 'y31.laws', def: true, scope: 'game',
  desc: l('Paradas: leis e cotas de rádio valem só no país da lei.', 'Charts: radio laws and quotas apply only in the law\'s country.') });
registerSwitch({ id: 'y31.domino', def: true, scope: 'game',
  desc: l('Paradas: nº 1 num país puxa os vizinhos e quem fala a mesma língua.', 'Charts: a No. 1 in one country pulls neighbours and same-language countries.') });
registerSwitch({ id: 'y31.fame', def: true, scope: 'game',
  desc: l('Fama por país menos uniforme: teto mais baixo fora dos mercados e da língua do artista; parada nacional soma à fama global; artistas do mundo guardam picos de parada.',
    'Less uniform fame by country: lower ceiling outside the act\'s markets and language; national charts add to global fame; world acts keep chart peaks.') });
registerSwitch({ id: 'y31.reserve', def: true, scope: 'game',
  desc: l('Paradas: parte de cada parada nacional fica reservada aos artistas do país, conforme a preferência local (último recurso).',
    'Charts: part of each national chart is reserved for the country\'s artists, by local preference (last resort).') });

export const on31 = (s: GameState, id: string): boolean => !!sw<boolean>(s, id);

// ---------------------------------------------------------------- D · pressão de mercado

/** Fração da demanda que sobra no ano (1 até 1990; desce até `d31.pressureMin` em 2005 e fica). */
export function marketPressure31(s: GameState, year = s.year): number {
  if (!on31(s, 'd31.pressure')) return 1;
  const min = Math.max(0.3, Math.min(1, Number(sw<number>(s, 'd31.pressureMin'))));
  if (year <= 1990) return 1;
  if (year >= 2005) return min;
  return 1 + ((min - 1) * (year - 1990)) / 15;
}
/** A penalização antiga (só jogador) segue valendo com o interruptor desligado. */
export const commodOn31 = (s: GameState): boolean => !on31(s, 'd31.pressure');
export const PRESSURE_LABEL31: L = l('Mercado saturado (era digital), igual para todos', 'Saturated market (digital era), same for everyone');

// ---------------------------------------------------------------- Y · ganchos (preenchidos por sys/mercado31.ts)

export interface Y31Why { k: number; label: L }
export interface Y31Hooks {
  /** abre/fecha o cache da semana (o mercado abre antes de vender; as paradas fecham depois de repartir) */
  begin?: (s: GameState) => void;
  end?: (s: GameState) => void;
  /** fator da demanda total do lançamento (fama local, leis do país, efeito dominó); 1 = neutro */
  demand?: (s: GameState, rel: Release, act: Act) => number;
  /** partes do fator, para a explicação das vendas */
  why?: (s: GameState, rel: Release, act: Act) => Y31Why[];
  /** multiplica os pesos por país (mesma ordem de COUNTRY_INFO) usados para repartir as unidades */
  weights?: (s: GameState, rel: Release, act: Act, w: number[]) => void;
  /** paradas por país depois de repartir: U[j·nC + i] = unidades do lançamento j no país i (ajusta no lugar) */
  reserve?: (s: GameState, rels: Release[], U: Float64Array, nC: number) => void;
}
export const Y31: Y31Hooks = {};
