// R31 · onda 4 (PRED) — tipo de ARTE de cada lugar do bairro (place27 + loja da época da frente H + porte da casa do
// LOTE). Separado de pred31.ts para o desenho (campus18px) não puxar o módulo da cidade da simulação (city31 registra
// ganchos ao carregar); quem usa é a página do mapa (ui/sys/campus18), que já carrega a cidade.

import type { Place27 } from '../../sim/sys/place27';
import { INT2_ART33 } from '../../sim/r33/int2';
import { bizAt31 } from '../../sim/r31/city31';
import type { GameState } from '../../sim/types';
import { BIZART31, DECOART31, artOfKind31, type Art31 } from './pred31';

export const PLART31: Record<Place27['k'], Art31> = {
  venue: 'venue', records: 'records', radio: 'radio', studio: 'studio', bar: 'bar', press: 'press', rehearsal: 'rehearsal', label: 'label', office: 'office',
  apartments: 'apart', hotel: 'hotel', instruments: 'instruments', facade: 'facade', police: 'police', market: 'alley', home: 'house', vacant: 'house', int2: 'office',
};
/** Lugar do bairro (cidade comum, vizinho ou lugar real já convertido em Place27). Loja da época e porte da casa contam. */
export function artOfPlace31(s: GameState, p: Place27): Art31 {
  if (p.deco31) return DECOART31[p.deco31];
  if (p.k === 'int2' && p.int2) return (INT2_ART33[p.int2] ?? 'office') as Art31; // r33 (INT-2): fachada isométrica do registro
  if (p.lot31?.k === 'home') return p.lot31.tier === 2 ? 'mansion' : p.lot31.tier === 1 ? 'house' : 'apart';
  if (p.fam31) return 'house';
  if (p.src === 'fill' && p.lot >= 0 && (p.k === 'office' || p.k === 'hotel' || p.k === 'instruments' || p.k === 'apartments')) {
    // loja da época (frente H): o place27 troca o lugar comum pelo negócio do terreno — o nome casa com o do negócio
    const b = bizAt31(s.config.seed, s.config.homeCity, p.lot, s.year);
    if (b.name.pt === p.name.pt && BIZART31[b.id]) return BIZART31[b.id];
  }
  return PLART31[p.k] ?? artOfKind31(p.draw);
}
