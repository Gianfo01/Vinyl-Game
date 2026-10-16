// R31 · onda 4 (T2) — LEILÃO SILENCIOSO DO BECO: modelo PURO (sem DOM). Sala dos fundos do Beco do Mercado: a lâmpada
// pendurada sobre o caixote com os lotes, a folha de lances na prancheta (passa de mão em mão; ninguém tem nome), o
// vendedor atrás do caixote (com nome só se você o conhece), o olheiro na porta e a janela gradeada onde a viatura
// pisca quando o calor está alto. Lê de sim/sys/bauc31 e under31. Montar o modelo nunca muda o estado nem gira sorteio.
import { cityById, l, type L } from '../../data/world';
import {
  baucOn31, fakeOdds31, lastSheet31, sellerHint31, sellerK31, sheet31, top31, traceP31, visibleLines31, type BLine31, type BLot31, type Sheet31,
} from '../../sim/sys/bauc31';
import { customsOn31 } from '../../sim/sys/customs31';
import { police31 } from '../../sim/sys/under31';
import { countryOfCity } from '../../data/geo';
import type { GameState } from '../../sim/types';
import { fmtL } from '../../sim/util';
import type { Spot31 } from './scene31model';

export const BAUC_W31 = 320;
export const BAUC_H31 = 180;
/** onde cada lote fica no caixote (centro x) */
export const LOT_XS31 = [122, 148, 174];
export const CRATE_TOP31 = 122;
export interface LotV31 {
  lot: BLot31;
  x: number;
  lines: BLine31[];
  top: number;
  need: number;
  mineTop: boolean;
  /** quanto você conhece o vendedor (0..3) */
  k: number;
  seller: L;
  hint: L;
  abroad: boolean;
  /** risco de falsificação em palavras (só para quem conhece o vendedor) */
  fake?: L;
  trace: number;
}
export interface Bauc31 {
  W: number; H: number; year: number; on: boolean;
  sheet?: Sheet31;
  last?: Sheet31;
  lots: LotV31[];
  heat: number;
  hot: boolean;
  spots: Spot31[];
  title: L;
}
export function bauc31Model(s: GameState): Bauc31 {
  const on = baucOn31(s);
  const sheet = on ? sheet31(s) : undefined;
  const last = on ? lastSheet31(s) : undefined;
  const home = countryOfCity(s.config.homeCity) ?? '';
  const lots: LotV31[] = (sheet?.lots ?? []).slice(0, LOT_XS31.length).map((lot, i) => {
    const t = top31(s, lot);
    const k = sellerK31(s, lot);
    const p = fakeOdds31(s, lot);
    return { lot, x: LOT_XS31[i], lines: visibleLines31(s, lot), top: t.top, need: t.need, mineTop: t.mineTop, k,
      seller: k >= 1 ? l(lot.seller, lot.seller) : l('Um vendedor que você não conhece', 'A seller you do not know'), hint: sellerHint31(s, lot),
      abroad: customsOn31(s) && (countryOfCity(lot.city) ?? '') !== home,
      fake: k >= 2 ? (p < 0.08 ? l('quase certo que é verdadeira', 'almost certainly genuine') : p < 0.2 ? l('provavelmente verdadeira', 'probably genuine') : l('pode muito bem ser falsa', 'may well be fake')) : undefined,
      trace: traceP31(s, lot) };
  });
  const pol = police31(s);
  const spots: Spot31[] = [];
  const sp = (x: Omit<Spot31, 'go'> & { panel: string }): void => { const { panel, ...rest } = x; spots.push({ ...rest, go: { panel } }); };
  sp({ id: 'door', x: 2, y: 52, w: 22, h: 44, label: l('Saída', 'Exit'), tip: l('Volta ao submundo da cidade.', 'Back to the city\'s underworld.'), panel: 'door' });
  sp({ id: 'sheet', x: 226, y: 112, w: 40, h: 26, label: l('Folha de lances', 'Bid sheet'), tip: sheet ? fmtL(l('Passa de mão em mão; ninguém assina. Recolhida na virada do mês ({n} lote(s)).', 'Goes from hand to hand; nobody signs. Collected at the turn of the month ({n} lot(s)).'), { n: lots.length }) : l('Nenhuma folha circulando este mês.', 'No sheet going around this month.'), panel: 'sheet',
    badge: lots.some((x) => x.lot.mine) ? { text: lots.some((x) => x.lot.mine && !x.mineTop) ? l('superado', 'outbid') : l('seu lance', 'your bid'), level: lots.some((x) => x.lot.mine && !x.mineTop) ? 'soon' : 'info', sym: '✎' } : undefined });
  for (const [i, x] of lots.entries()) sp({ id: `lot:${i}`, x: x.x - 14, y: CRATE_TOP31 - 28, w: 28, h: 30, label: x.lot.n, quiet: true,
    tip: x.abroad ? l('A peça está fora do país: vem pela alfândega, sem nota.', 'The piece is abroad: it comes through customs, without an invoice.') : l('Peça roubada ou falsa: veja quem vende.', 'Stolen or fake piece: see who is selling.'), panel: `lot:${i}`,
    badge: x.lot.mine ? { text: x.mineTop ? l('na frente', 'leading') : l('superado', 'outbid'), level: x.mineTop ? 'info' : 'soon', sym: '✎' } : undefined });
  if (lots.length) sp({ id: 'seller', x: 189, y: 80, w: 22, h: 40, label: l('Vendedor', 'Seller'), tip: l('Conhecer quem vende reduz o risco de levar uma falsificação.', 'Knowing the seller lowers the risk of buying a forgery.'), panel: 'seller' });
  sp({ id: 'window', x: 232, y: 12, w: 60, h: 28, label: l('Janela gradeada', 'Barred window'), tip: pol.text, panel: 'window',
    badge: pol.stops ? { text: l('viatura', 'patrol car'), level: 'soon', sym: '!' } : undefined });
  sp({ id: 'last', x: 98, y: 26, w: 34, h: 34, label: l('Folha do mês passado', 'Last month\'s sheet'), tip: last ? l('Quem levou o quê (pelo número da mão).', 'Who took what (by hand number).') : l('Nenhuma folha recolhida ainda.', 'No sheet collected yet.'), panel: 'last' });
  const city = cityById[s.config.homeCity]?.name ?? l(s.config.homeCity, s.config.homeCity);
  return { W: BAUC_W31, H: BAUC_H31, year: s.year, on, sheet, last, lots, heat: pol.heat, hot: pol.stops, spots,
    title: fmtL(l('Leilão silencioso · {c}', 'Silent auction · {c}'), { c: city }) };
}
