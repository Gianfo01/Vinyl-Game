// Rodada 16 — rota sugerida para o planejador de turnê: as cidades de maior procura do ato no mercado de origem
// e nos territórios do selo (o mesmo cálculo de público que a previsão usa). Antes o jogador tinha de adivinhar no mapa.
import { CITIES, cityById, l, type L } from '../data/world';
import { cityDemand, type TourPlan } from './tours';
import type { GameState } from './types';
import { fmtL } from './util';

export interface RouteHint { ids: string[]; why: L }

export function suggestRoute16(s: GameState, actId: string, n = 6): RouteHint {
  const act = s.acts[actId];
  if (!act) return { ids: [], why: l('Ato desconhecido.', 'Unknown act.') };
  const home = cityById[act.city]?.market;
  const pool = CITIES.filter((c) => c.id !== s.config.homeCity && (c.market === home || s.player.territories.includes(c.market)))
    .map((c) => ({ id: c.id, d: cityDemand(s, act, c.id) })).filter((x) => x.d > 0).sort((a, b) => b.d - a.d);
  // só cidades que valem a viagem: pelo menos 40% da melhor (e um piso), senão a rota vira prejuízo
  const ids = pool.filter((x, i) => i < 3 || x.d >= Math.max(40, pool[0].d * 0.4)).slice(0, n).map((x) => x.id);
  if (!ids.length) return { ids, why: l('Ainda sem público fora da sede: lance discos e faça shows locais (agenda) antes de cair na estrada.', 'No audience outside the home city yet: release records and play local gigs (agenda) before touring.') };
  return { ids, why: fmtL(l('{n} cidades com mais procura por {a} (mercado de origem e territórios do selo); a 1ª tem ~{d} interessados.', '{n} cities with the most demand for {a} (home market and label territories); the top one has ~{d} interested fans.'), { n: ids.length, a: act.name, d: pool[0].d }) };
}

/** Produção e equipe proporcionais ao tamanho do ato (o rascunho padrão era caro demais para estreantes). */
export function sizedDraft16(s: GameState, actId: string): Pick<TourPlan, 'production' | 'crew' | 'minutes'> {
  const f = s.acts[actId]?.fame ?? 0;
  return { production: f >= 45 ? 2 : f >= 25 ? 1 : 0, crew: f >= 45 ? 6 : f >= 20 ? 4 : 2, minutes: f >= 20 ? 60 : 45 };
}

/** O que a turnê deixa no caixa do SELO (não do artista): no contrato clássico a bilheteria é do artista. */
export function labelTourNet16(s: GameState, actId: string, est: { logistics: number; expectedRevenue: number; expectedMerch: number }): { net: number; why: L } {
  const act = s.acts[actId];
  const c = act?.contractId ? s.contracts[act.contractId] : undefined;
  const share = act?.playerBand ? 1 : c?.model === '360' ? c.share360 : 0;
  const back = Math.round((est.expectedRevenue * 0.65 + est.expectedMerch) * share);
  const net = back - est.logistics;
  const usd = (v: number) => `${v < 0 ? '−' : ''}$${Math.round(Math.abs(v) / 100).toLocaleString('en-US')}`;
  const why = share === 0
    ? fmtL(l('Para o selo: {n}. Contrato clássico: bilheteria e merch ficam com o artista; você paga a logística em troca de fãs, fama e vendas de disco.', 'For the label: {n}. Classic deal: box office and merch go to the act; you pay logistics in exchange for fans, fame and record sales.'), { n: usd(net) })
    : fmtL(l('Para o selo: {n} (sua parte de {p}% da bilheteria líquida e do merch, menos a logística).', 'For the label: {n} (your {p}% of net box office and merch, minus logistics).'), { n: usd(net), p: Math.round(share * 100) });
  return { net, why };
}
