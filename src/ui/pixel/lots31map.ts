// R31 · onda 4 (LOTE) — O MAPA DA CIDADE LOTE A LOTE (puro, sem DOM): junta o que cada lote aberto é agora e mede
// quantos prédios têm FUNÇÃO (negócio que existe, com dono · terreno à venda ou seu · casa de quem mora na cidade).
// O mapa ("Nosso mundo") monta a cena com isto: terrenos vagos viram placas "VENDE-SE" (com preço e motivo de bloqueio)
// e o terreno seu ganha a placa "SEU"; as casas são lugares clicáveis. O teste de varredura usa a mesma função.

import { l, type L } from '../../data/world';
import type { GameState } from '../../sim/types';
import { LOTS18, buildings18, campus18, layout18, lotsOpen18 } from '../../sim/sys/campus18';
import { nb19 } from '../../sim/sys/hood19';
import { places27, type Place27, type PlaceK27 } from '../../sim/sys/place27';
import { lotLock31, lotsOn31, lotPrice31, noPurpose31 } from '../../sim/sys/lots31';
import { fillerLots27, forSale27, type Sale27 } from './city27';

export type LotFn31 = 'hq' | 'mine' | 'business' | 'sale' | 'own' | 'home' | 'none';
export interface LotCell31 { lot: number; fn: LotFn31; k?: PlaceK27; name: L; who?: string }
export interface CityLots31 { sale: Sale27[]; filler: number[]; places: Place27[]; cells: LotCell31[]; /** fração dos prédios com função (0..1) */ cover: number }
export const FN31: Record<LotFn31, L> = {
  hq: l('Sua sede', 'Your HQ'), mine: l('Prédio seu', 'Your building'), business: l('Negócio com dono', 'Business with an owner'), sale: l('Terreno à venda', 'Plot for sale'),
  own: l('Terreno seu', 'Your plot'), home: l('Casa de quem mora na cidade', 'Home of a local'), none: l('Sem função', 'No purpose'),
};

/** Tudo o que o mapa precisa (placas, cidade comum, lugares) + a função de cada lote aberto. */
export function cityLots31(s: GameState, txt: { sale: string; own: string } = { sale: 'VENDE-SE', own: 'SEU' }): CityLots31 {
  const bs = buildings18(s);
  const open = lotsOpen18(s, bs);
  const lay = layout18(s, bs);
  const mine = new Set(lay.values());
  for (const p of campus18(s).proj) mine.add(p.lot);
  let sale = forSale27(s);
  let filler = fillerLots27(s, sale);
  let places = places27(s, filler, nb19(s), (n) => LOTS18[n]?.vis ?? 1);
  const on = lotsOn31(s);
  if (on) {
    // terreno vago (à venda ou seu) sai da cidade comum e vira placa: o fluxo de sempre do lote (construir) + comprar o terreno
    const vac = places.filter((p) => p.k === 'vacant');
    const vl = new Set(vac.map((p) => p.lot));
    sale = [
      ...sale.map((x) => ({ ...x, txt: txt.sale })),
      ...vac.map((p): Sale27 => p.lot31?.k === 'own'
        ? { lot: p.lot, price: 0, kind: 'store', opt: 'lot31', name: l('Seu terreno', 'Your plot'), own: true, txt: txt.own }
        : { lot: p.lot, price: lotPrice31(s, p.lot), kind: 'store', opt: 'lot31', name: l('Terreno vago', 'Vacant plot'), txt: txt.sale, ...(lotLock31(s, p.lot) ? { dis: lotLock31(s, p.lot)! } : {}) }),
    ];
    filler = filler.filter((x) => !vl.has(x));
    places = places.filter((p) => p.k !== 'vacant');
  }
  const bad = noPurpose31(places);
  const byLot = new Map(places.map((p) => [p.lot, p]));
  const saleAt = new Map(sale.map((x) => [x.lot, x]));
  const cells: LotCell31[] = [];
  for (let lot = 0; lot < open; lot++) {
    if (!LOTS18[lot]) continue;
    const nm = LOTS18[lot].name;
    if (lot === 0) { cells.push({ lot, fn: 'hq', name: nm }); continue; }
    if (mine.has(lot)) { cells.push({ lot, fn: 'mine', name: nm }); continue; }
    const sl = saleAt.get(lot);
    if (sl) { cells.push({ lot, fn: sl.own ? 'own' : 'sale', name: nm }); continue; }
    const p = byLot.get(lot);
    if (p) { cells.push({ lot, fn: p.k === 'home' ? 'home' : bad.has(lot) ? 'none' : 'business', k: p.k, name: p.name, who: p.lot31?.who }); continue; }
    cells.push({ lot, fn: 'none', name: nm }); // lote fora das listas (não deveria acontecer)
  }
  const n = cells.length || 1;
  return { sale, filler, places, cells, cover: cells.filter((c) => c.fn !== 'none').length / n };
}
