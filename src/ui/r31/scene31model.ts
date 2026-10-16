// R31 · onda 2 (J) — CENAS INTERATIVAS: núcleo comum, sem DOM.
// Cada cena (Mesa do chefe, Turnê, Projeto musical) monta um modelo PURO a partir do estado: as áreas clicáveis
// (objetos da cena), o que cada uma mostra (número + símbolo + texto, nunca só cor) e para onde leva. A pintura e os
// botões leem só este modelo — a lista acessível de pontos sai do mesmo registro que desenha a cena.
// Explorar não muda o mundo: montar o modelo só lê (os testes conferem estado e sorteio antes/depois).

import { l, type L } from '../../data/world';
import { fmtL } from '../../sim/util';
import type { QuickTarget31 } from './lock31';

/** Quatro níveis de alerta que não brigam entre si; só o crítico pulsa. */
export type Alert31 = 'crit' | 'soon' | 'normal' | 'info';
export const ALERT31: Record<Alert31, { sym: string; name: L; rank: number }> = {
  crit: { sym: '‼', name: l('bloqueio crítico', 'critical block'), rank: 3 },
  soon: { sym: '⏱', name: l('prazo próximo', 'deadline soon'), rank: 2 },
  normal: { sym: '●', name: l('decisão', 'decision'), rank: 1 },
  info: { sym: 'i', name: l('informação', 'information'), rank: 0 },
};
export const maxAlert31 = (xs: Alert31[]): Alert31 | undefined => xs.reduce<Alert31 | undefined>((a, x) => (!a || ALERT31[x].rank > ALERT31[a].rank ? x : a), undefined);
/** Nível de uma pendência: vence nesta semana ou urgente = crítico; até 2 semanas = prazo próximo. */
export function alertOf31(due: number | undefined, week: number, prio = 0): Alert31 {
  if (prio >= 3 || (due !== undefined && due - week <= 0)) return 'crit';
  if (due !== undefined && due - week <= 2) return 'soon';
  return 'normal';
}

/** Para onde um ponto leva. `panel` = painel curto DENTRO da cena (a ação se resolve ali). */
export interface Go31s {
  area?: string;
  tab?: [string, string];
  act?: string;
  hub?: { actId: string; pid: string };
  panel?: string;
  quick?: QuickTarget31;
  /** foco da ação no painel rápido */
  focus?: string;
}
export interface Badge31 { text: string | L; level: Alert31 }
/** Uma área clicável da cena (coordenadas em pixels lógicos do desenho). */
export interface Spot31 {
  id: string;
  x: number; y: number; w: number; h: number;
  /** rótulo curto (aparece sobre o objeto quando "rótulos" está ligado) */
  label: L;
  /** dica curta: o estado e o que o clique faz */
  tip: L;
  badge?: Badge31;
  go: Go31s;
  /** alvo do painel rápido (clique direito / tecla de menu) */
  quick?: QuickTarget31;
}

/** Rótulos curtos: sempre no primeiro ano da partida, opcionais depois. */
export const LABELS_WEEKS31 = 52;
export const labelsDefault31 = (s: { week: number }): boolean => s.week < LABELS_WEEKS31;

export const MON31: L[] = [
  l('JAN', 'JAN'), l('FEV', 'FEB'), l('MAR', 'MAR'), l('ABR', 'APR'), l('MAI', 'MAY'), l('JUN', 'JUN'),
  l('JUL', 'JUL'), l('AGO', 'AUG'), l('SET', 'SEP'), l('OUT', 'OCT'), l('NOV', 'NOV'), l('DEZ', 'DEC'),
];

export const plural31 = (n: number, one: L, many: L): L => fmtL(n === 1 ? one : many, { n });

/** Toda área tem destino (área, aba, painel na cena, painel rápido ou projeto) e cabe no desenho. */
export function spotOk31(sp: Spot31, W: number, H: number): boolean {
  const g = sp.go;
  const dest = !!(g.area || g.tab || g.panel || g.quick || g.hub || g.act);
  return dest && sp.w > 0 && sp.h > 0 && sp.x >= -4 && sp.y >= -4 && sp.x + sp.w <= W + 4 && sp.y + sp.h <= H + 4 && !!sp.label.pt && !!sp.tip.pt;
}
