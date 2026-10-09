// Rodada 16 — rota sugerida para o planejador de turnê: as cidades de maior procura do ato no mercado de origem
// e nos territórios do selo (o mesmo cálculo de público que a previsão usa). Antes o jogador tinha de adivinhar no mapa.
import { CITIES, cityById, l, type L } from '../data/world';
import { cityDemand } from './tours';
import type { GameState } from './types';
import { fmtL } from './util';

export interface RouteHint { ids: string[]; why: L }

export function suggestRoute16(s: GameState, actId: string, n = 6): RouteHint {
  const act = s.acts[actId];
  if (!act) return { ids: [], why: l('Ato desconhecido.', 'Unknown act.') };
  const home = cityById[act.city]?.market;
  const pool = CITIES.filter((c) => c.id !== s.config.homeCity && (c.market === home || s.player.territories.includes(c.market)))
    .map((c) => ({ id: c.id, d: cityDemand(s, act, c.id) })).filter((x) => x.d > 0).sort((a, b) => b.d - a.d);
  const ids = pool.slice(0, n).map((x) => x.id);
  if (!ids.length) return { ids, why: l('Ainda sem público fora da sede: lance discos e faça shows locais (agenda) antes de cair na estrada.', 'No audience outside the home city yet: release records and play local gigs (agenda) before touring.') };
  return { ids, why: fmtL(l('{n} cidades com mais procura por {a} (mercado de origem e territórios do selo); a 1ª tem ~{d} interessados.', '{n} cities with the most demand for {a} (home market and label territories); the top one has ~{d} interested fans.'), { n: ids.length, a: act.name, d: pool[0].d }) };
}
