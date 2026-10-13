// R29 (DEMO) — pontos de encaixe puros entre o núcleo (market/eras18/charts7/tours/fests8/fanscandal28/revival19) e o
// sistema de público por IDADE e REGIÃO (sys/demo29.ts). Mesmo padrão de media18hook: o núcleo chama se estiver ligado;
// desligado, as fórmulas antigas valem. Sem imports de sistemas (evita ciclo e TDZ no bundle).

import type { Festival } from '../data/catalog';
import type { Act, GameState, Label, Release } from './types';

export interface Demo29Hooks {
  /** multiplicador da fatia física de um lançamento pela idade do público (eras18.physShareRel18) */
  phys?: (s: GameState, rel: Release) => number;
  /** multiplicadores por país (ordem de COUNTRY_INFO) para a divisão das unidades nas paradas (charts7); null = neutro */
  cw?: (s: GameState, rel: Release, act: Act) => Float64Array | null;
  /** multiplicador do expoente da elasticidade do ingresso (tours.ts): jovem sente mais o preço */
  elast?: (s: GameState, act: Act, cityId: string) => number;
  /** desvio da postura de uma facção num escândalo pela idade da base (fanscandal28) */
  scandal?: (s: GameState, act: Act, kind: string, fac: string) => number;
  /** peso de uma faixa antiga na escolha do revival (ciclo de nostalgia de ~25 anos; revival19) */
  revW?: (s: GameState, rel: Release) => number;
  /** encaixe da idade do público do ato com a do festival (fests8, montagem do line-up) */
  fest?: (s: GameState, f: Festival, act: Act) => number;
  /** selo rival × idade do público do ato: peso na escolha de quem contratar (rivals.ts) */
  label?: (s: GameState, lb: Label, act: Act) => number;
  /** disputa de oferta: vantagem do rival por falar com a geração do ato, contra o seu elenco (rivalsense28) */
  rivalOffer?: (s: GameState, lb: Label, act: Act) => number;
}
export const DEMO29: Demo29Hooks = {};

/** Gancho do submundo (fazendas de bots / fraude de streams, outra sessão): devolve o multiplicador (≥ 1) de streams
 *  falsos de um lançamento nesta semana. A conta de público credita o excedente às faixas 13–17 e 18–24 do streaming
 *  (é onde a fraude se esconde) e NÃO converte em fã. Sem registros, nada muda. */
export type Fraud29 = (s: GameState, rel: Release) => number;
export const FRAUD29: { id: string; f: Fraud29 }[] = [];
export function registerFraud29(id: string, f: Fraud29): void {
  const i = FRAUD29.findIndex((x) => x.id === id);
  if (i >= 0) FRAUD29[i] = { id, f }; else FRAUD29.push({ id, f });
}
export function fraud29(s: GameState, rel: Release): number {
  let k = 1;
  for (const x of FRAUD29) { const v = x.f(s, rel); if (Number.isFinite(v) && v > 1) k *= v; }
  return k;
}
