// Rodada 27 (E2) — CIDADES COM ECONOMIA PRÓPRIA. Uma ficha por cidade, com dados reais quando existem
// (data/countries.ts: população e poder de compra por época; data/content.ts: veículos de imprensa por mercado e
// censura por geopolítica; society18: regimes com datas reais; map13: pirataria por país):
//   • poder de compra (1 = EUA no mesmo ano) → INGRESSO MÉDIO e receita de show (mod 'showRevenue');
//   • força da mídia local (veículos ativos no mercado × prestígio) → procura por ingressos (mod 'cityDemand');
//   • leis e clima político (regime, censura, pirataria) → procura e notas na ficha;
//   • tamanho do mercado de discos do país (o motor de vendas já usa; aqui só aparece na ficha).
// Para não deixar a partida mais difícil para quem começa num país pobre, os fatores são RELATIVOS À SEDE do selo:
// tocar em casa é neutro (×1); excursionar por praças mais ricas paga mais, por praças mais pobres paga menos.
// Módulo sem estado e sem sorteio.

import { clamp } from '../../core/rng';
import { OUTLETS, censorshipIn } from '../../data/content';
import { COUNTRY_INFO, countryBuy, countryInfoByA3, countryMarketSize } from '../../data/countries';
import { countryName, countryOfCity } from '../../data/geo';
import { cityById, familyOf, l, type L, type MarketId } from '../../data/world';
import { registerExplain, type WhyPart } from '../explain18';
import { registerMod } from '../ext4';
import { TICKET } from '../tours';
import type { GameState } from '../types';
import { fmtL, money } from '../util';
import { piracyOf } from './map13';
import { regimeAt18 } from './society18';

/** poder de compra médio por mercado quando o país não tem ficha */
const MK_BUY: Record<MarketId, number> = { na: 1, eu: 0.8, br: 0.3, latam: 0.3, asia: 0.5, africa: 0.15, oceania: 0.85 } as Record<MarketId, number>;
const PROTEST = new Set(['rock', 'hiphop', 'brazil', 'latin', 'africa', 'country_folk']);
export const OFF_CITY27: { on?: boolean } = {};

export interface CityEcon27 {
  city: string; a3: string | null; country: L; market: MarketId;
  /** poder de compra (EUA = 1, mesmo ano) */
  buy: number;
  /** fator de preço de ingresso relativo à sede (×) */
  price: number;
  /** ingresso médio nominal (centavos) num clube médio */
  ticket: number;
  /** força da mídia local 0..100 e fator de procura relativo à sede */
  media: number; mediaK: number; outlets: string[];
  /** tamanho do mercado de discos do país (unidade relativa) e pirataria 0..1 */
  size: number; piracy: number;
  /** leis / clima político */
  censor: number; regime?: L; hard: boolean;
  laws: L[];
}

function buyOf(s: GameState, city: string): { a3: string | null; buy: number } {
  const a3 = countryOfCity(city);
  const ci = a3 ? countryInfoByA3[a3] : undefined;
  const mk = (cityById[city]?.market ?? 'na') as MarketId;
  return { a3, buy: ci ? countryBuy(ci, s.year) : MK_BUY[mk] ?? 0.6 };
}
function mediaOf(s: GameState, mk: MarketId): { v: number; names: string[] } {
  const outs = OUTLETS.filter((o) => o.market === mk && o.start <= s.year && (o.end === undefined || o.end > s.year));
  const v = outs.reduce((t, o) => t + o.bias.prestige, 0);
  return { v: clamp(Math.round(v / 4), 0, 100), names: outs.sort((a, b) => b.bias.prestige - a.bias.prestige).slice(0, 3).map((o) => o.name) };
}
const home = (s: GameState) => s.config.homeCity;

/** Ficha econômica da cidade (pura). */
export function cityEcon27(s: GameState, city: string): CityEcon27 {
  const c = cityById[city];
  const mk = (c?.market ?? 'na') as MarketId;
  const { a3, buy } = buyOf(s, city);
  const hb = buyOf(s, home(s)).buy;
  const price = clamp(Math.pow(Math.max(0.02, buy) / Math.max(0.02, hb), 0.2), 0.82, 1.22);
  const md = mediaOf(s, mk);
  const hm = mediaOf(s, (cityById[home(s)]?.market ?? 'na') as MarketId).v;
  const mediaK = clamp(1 + (md.v - hm) / 1200, 0.95, 1.06);
  const ci = a3 ? countryInfoByA3[a3] : undefined;
  const cz = censorshipIn(s.year, mk);
  const reg = regimeAt18(s, a3);
  const hard = !!reg?.hard && s.year >= reg.hard[0] && s.year <= reg.hard[1];
  const laws: L[] = [];
  if (reg) laws.push(fmtL(hard ? l('{r}: censura dura ({c})', '{r}: harsh censorship ({c})') : l('{r} ({c})', '{r} ({c})'), { r: reg.name, c: reg.censor }));
  if (cz.level >= 0.3) laws.push(fmtL(l('Censura {v}% no mercado', 'Censorship {v}% in the market'), { v: Math.round(cz.level * 100) }));
  const pir = a3 ? piracyOf(s, a3) : 0;
  if (pir >= 0.25) laws.push(fmtL(l('Pirataria alta ({v}% das vendas)', 'High piracy ({v}% of sales)'), { v: Math.round(pir * 100) }));
  return {
    city, a3, country: a3 ? countryName(a3) : c?.name ?? l(city, city), market: mk, buy: Math.round(buy * 100) / 100, price: Math.round(price * 100) / 100,
    ticket: Math.round(money(s, TICKET[1]) * price), media: md.v, mediaK: Math.round(mediaK * 1000) / 1000, outlets: md.names,
    size: ci ? Math.round(countryMarketSize(ci, s.year) * 10) / 10 : 0, piracy: Math.round(pir * 100) / 100,
    censor: Math.round(cz.level * 100) / 100, ...(reg ? { regime: reg.name } : {}), hard, laws,
  };
}

/** Países com ficha, do maior mercado ao menor (interface: ranking de praças). */
export function topMarkets27(s: GameState, n = 12): { a3: string; size: number; buy: number }[] {
  return COUNTRY_INFO.map((c) => ({ a3: c.a3, size: countryMarketSize(c, s.year), buy: countryBuy(c, s.year) })).sort((a, b) => b.size - a.size).slice(0, n);
}

// ---------------------------------------------------------------- efeitos

registerMod('showRevenue', 'city27', (s, v, c) => {
  if (OFF_CITY27.on || !c.cityId || !cityById[c.cityId]) return null;
  const e = cityEcon27(s, c.cityId);
  if (Math.abs(e.price - 1) < 0.01) return null;
  return { value: v * e.price, label: fmtL(l('Poder de compra em {c} (ingresso ×{k})', 'Purchasing power in {c} (ticket ×{k})'), { c: e.country, k: e.price.toFixed(2) }) };
});
registerMod('cityDemand', 'city27', (s, v, c) => {
  if (OFF_CITY27.on || !c.cityId || !cityById[c.cityId]) return null;
  const e = cityEcon27(s, c.cityId);
  let k = e.mediaK;
  if (e.hard && c.act && PROTEST.has(familyOf(c.act.genre))) k *= 0.9;
  if (Math.abs(k - 1) < 0.005) return null;
  return { value: v * k, label: e.hard && k < e.mediaK ? fmtL(l('Regime em {c}: shows vigiados', 'Regime in {c}: shows under watch'), { c: e.country }) : k > 1 ? fmtL(l('Mídia local forte em {c}', 'Strong local media in {c}'), { c: e.country }) : fmtL(l('Pouca mídia local em {c}', 'Little local media in {c}'), { c: e.country }) };
});

registerExplain('city27', (s, c) => {
  const id = String(c.id ?? c.city ?? '');
  if (!cityById[id]) return null;
  const e = cityEcon27(s, id);
  const parts: WhyPart[] = [
    { label: l('Poder de compra (EUA = 1)', 'Purchasing power (USA = 1)'), value: e.buy },
    { label: l('Ingresso médio (clube)', 'Average ticket (club)'), value: e.ticket, fmt: 'money' },
    { label: l('Receita de show × (relativo à sede)', 'Show revenue × (relative to HQ)'), value: e.price, fmt: 'mult', tone: e.price >= 1 ? 'good' : 'bad' },
    { label: l('Força da mídia local', 'Local media strength'), value: e.media, note: e.outlets.join(', ') },
    { label: l('Procura × (mídia, regime)', 'Demand × (media, regime)'), value: e.mediaK, fmt: 'mult', tone: e.mediaK >= 1 ? 'good' : 'bad' },
    { label: l('Mercado de discos do país', 'Country record market'), value: e.size },
  ];
  for (const x of e.laws) parts.push({ label: x, tone: 'bad' });
  return { title: cityById[id].name, value: e.ticket, fmt: 'money', parts, note: l('Dados reais por época (população, poder de compra, imprensa, regimes). Fatores relativos à sede: tocar em casa é neutro.', 'Real data by era (population, purchasing power, press, regimes). Factors relative to HQ: playing at home is neutral.') };
});
