// r27 (AUD1) — CASAS DE SHOWS NUM MODELO SÓ. Havia três camadas que se sobrepunham:
//  - a "casa própria" da carreira de shows (live/venue.ts: clube/teatro/arena construído, aluguel, bar, artista da casa);
//  - a carreira de dono de casa (venue12.ts: programação por noite, fiéis, vizinhança, metas) EM CIMA da mesma casa,
//    lançando o próprio caixa;
//  - as casas reais compradas (venues17.ts: Cavern, CBGB…, linha de programação, preço, prestígio).
// Agora: (1) uma lista só de casas suas — myVenues27 — com a mesma chave que o mapa da cidade usa ('lv:venue' para a
// construída, 've:<id>' para as reais); (2) um teto só (4 casas no total, venues17.MAX_VENUES27); (3) um FECHAMENTO
// MENSAL só: a casa construída lança UMA linha de receita e UMA de custo (base + programação juntas) e as reais
// lançam uma linha cada. Os dados de cada casa continuam onde nasceram (uma fonte por dado); as telas, o mapa
// (campus18/city27), o mundo (world19) e as carreiras seguem lendo os mesmos campos.

import { cityById, l, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import type { GameState } from '../types';
import { fmtL, post } from '../util';
import { venueBaseMonth27, venueKind } from './live/venue';
import { liveOf } from './live/state';
import { programmeMonth12, v12 } from './venue12';
import { POLICY, realVenuesMonth17, v17, vdef } from './venues17';

export { MAX_VENUES27, venueCount27 } from './venues17';

export interface Venue27 {
  /** mesma chave do mapa da cidade: 'lv:venue' (construída) ou 've:<id>' (real comprada) */
  key: string;
  src: 'built' | 'real';
  name: string;
  city: string;
  cap: number;
  /** prestígio/reputação 0–100 (real: rep; construída: fiéis da programação) */
  rep: number;
  /** conservação 0–100 */
  cond: number;
  /** como a casa é tocada (linha de programação) */
  line: L;
  /** último mês: público e resultado (receita − custo) */
  last?: { att: number; net: number };
}

/** Todas as casas do jogador, das duas origens, num formato só. */
export function myVenues27(s: GameState): Venue27[] {
  const out: Venue27[] = [];
  const v = liveOf(s).venue;
  if (v) {
    const x = v12(s);
    const h = v.history[v.history.length - 1];
    const prog = x?.prog.length ? fmtL(l('{n} noite(s) de programação', '{n} programmed night(s)'), { n: x.prog.length }) : l('aluguel e bar', 'rentals and bar');
    out.push({ key: 'lv:venue', src: 'built', name: v.name, city: v.cityId, cap: venueKind(v.kind).cap, rep: Math.round(x?.regulars ?? 15), cond: Math.round(x?.cond ?? 80), line: prog,
      last: h ? { att: Math.round(h.occupancy / 100 * venueKind(v.kind).cap * v.rentalNights), net: h.revenue - h.costs } : undefined });
  }
  for (const o of v17(s).own) {
    const d = vdef(o.id);
    if (!d) continue;
    out.push({ key: `ve:${o.id}`, src: 'real', name: d.name, city: d.city, cap: d.cap, rep: Math.round(o.rep), cond: Math.round(o.cond), line: POLICY[o.policy].name, last: o.last ? { att: o.last.att, net: o.last.net } : undefined });
  }
  return out;
}
export const hasVenue27 = (s: GameState): boolean => !!liveOf(s).venue || v17(s).own.length > 0;
export const venueByKey27 = (s: GameState, key: string): Venue27 | undefined => myVenues27(s).find((x) => x.key === key);

/** Fechamento único do mês das casas. */
export function venuesMonth27(s: GameState, r: Parameters<typeof venueBaseMonth27>[1]): void {
  const v = liveOf(s).venue;
  if (v) {
    const base = venueBaseMonth27(s, r);
    const prog = programmeMonth12(s);
    const rev = (base?.rev ?? 0) + (prog?.rev ?? 0), cost = (base?.cost ?? 0) + (prog?.cost ?? 0);
    const city = cityById[v.cityId]?.name.pt ?? v.cityId;
    if (rev) post(s, 'venue27:rev', rev, 'live', `Casa de shows ${v.name} (${city})`);
    if (cost) post(s, 'venue27:cost', -cost, 'live_costs', `Manutenção, equipe e cachês ${v.name}`);
    // o histórico da casa (mapa, notas, carreira) passa a mostrar o resultado inteiro, não só a base
    const h = v.history[v.history.length - 1];
    if (h && h.year === s.year && h.month === s.month) { h.revenue = rev; h.costs = cost; }
  }
  realVenuesMonth17(s);
}

registerSimHook('month', 'venues27', (s, r) => venuesMonth27(s, r));
