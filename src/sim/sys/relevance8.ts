// Peso mundial no total de vendas (rodada 8): o apelo de um lançamento é a média entre o mercado da
// casa (onde o público local pode preferir o artista até aos astros globais) e o resto dos
// territórios (onde vale o quanto a música do país viaja). Um artista brasileiro domina o Brasil com
// mais facilidade, mas estoura no mundo com mais dificuldade que um americano.

import { COUNTRY_INFO, countryInfoByA3, countryMarketSize } from '../../data/countries';
import { countryOfCity } from '../../data/geo';
import { localPref, softPower } from '../../data/relevance';
import { reachHook17 } from './reachhook17';
import { clamp } from '../../core/rng';
import { l } from '../../data/world';
import { registerMod } from '../ext4';
import type { GameState, Release } from '../types';

const sizeCache: { year: number; byMarket: Record<string, number> } = { year: -1, byMarket: {} };

function marketSize(year: number, market: string): number {
  if (sizeCache.year !== year) { sizeCache.year = year; sizeCache.byMarket = {}; }
  return (sizeCache.byMarket[market] ??= COUNTRY_INFO.filter((c) => c.market === market).reduce((t, c) => t + countryMarketSize(c, year), 0));
}

/** Multiplicador de alcance (≈0,4 a ≈1,5) e a fatia do mercado da casa. */
export function reachMult(s: GameState, rel: Release): { mult: number; homeFrac: number; home: string | null } {
  const act = s.acts[rel.actId];
  const home = act ? countryOfCity(act.city) : null;
  const info = home ? countryInfoByA3[home] : undefined;
  if (!info) return { mult: 1, homeFrac: 0, home };
  const total = rel.territories.reduce((t, m) => t + marketSize(s.year, m), 0);
  const homeSize = rel.territories.includes(info.market) ? countryMarketSize(info, s.year) : 0;
  const homeFrac = total > 0 ? clamp(homeSize / total, 0, 1) : 0;
  const local = clamp(localPref(home) / 1.6, 0.75, 1.35);
  const abroad = 0.35 + 0.65 * Math.max(softPower(home, s.year), act ? reachHook17.f(s, act) : 0); // r17: exceções globais
  return { mult: homeFrac * local + (1 - homeFrac) * abroad, homeFrac, home };
}

registerMod('appeal', 'relevance8', (s, value, ctx) => {
  if (!ctx.release) return null;
  const { mult } = reachMult(s, ctx.release);
  if (Math.abs(mult - 1) < 0.02) return null;
  return { value: value * mult, label: mult > 1 ? l('Público local prefere artistas da casa', 'Local audience favours home acts') : l('Peso mundial do país de origem', 'Global weight of the home country') };
});
