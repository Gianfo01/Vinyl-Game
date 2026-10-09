// Rodada 13: números por país para o mapa — tamanho do mercado, crescimento, seus fãs, sua fatia,
// domínio dos rivais, pirataria estimada, mistura de formatos e gostos. Tudo respeita a época
// (formatos e pirataria só aparecem quando a tecnologia existe) e só lê o estado.

import { clamp } from '../../core/rng';
import { COUNTRY_INFO, countryBuy, countryInfoByA3, countryMarketSize, countryTaste } from '../../data/countries';
import { FAMILIES, l, type L } from '../../data/world';
import { physicalShare } from '../production';
import type { GameState } from '../types';
import { hasMutator, hasTech } from '../util';
import { ch7 } from './charts7';
import { fansByCountry } from './mapx8';

export type Paint = 'none' | 'market' | 'growth' | 'fans' | 'share' | 'rivaldom' | 'piracy' | 'physical' | 'afame';
export const PAINTS: Paint[] = ['none', 'market', 'growth', 'fans', 'share', 'rivaldom', 'piracy', 'physical', 'afame'];

export const PAINT_INFO: Record<Paint, { name: L; unit: L; why: L }> = {
  none: { name: l('Nada', 'Nothing'), unit: l('', ''), why: l('', '') },
  market: { name: l('Tamanho do mercado', 'Market size'), unit: l('% do consumo mundial', '% of world consumption'),
    why: l('População × poder de compra no ano. Mercado grande = mais vendas possíveis, mas também mais rivais.', 'Population × buying power this year. Big market = more possible sales, but more rivals too.') },
  growth: { name: l('Tendência de crescimento', 'Growth trend'), unit: l('% em 10 anos', '% over 10 years'),
    why: l('Quanto o mercado cresceu na última década. Verde = mercado subindo (chegue cedo); vermelho = encolhendo.', 'How much the market grew over the last decade. Green = rising (get in early); red = shrinking.') },
  fans: { name: l('Seus fãs', 'Your fans'), unit: l('fãs potenciais', 'potential fans'),
    why: l('Soma do público potencial dos seus artistas nas cidades do país (fama, gênero, gosto local e divulgação).', 'Sum of your acts\' potential audience in the country\'s cities (fame, genre, local taste and promotion).') },
  share: { name: l('Sua fatia', 'Your share'), unit: l('% das unidades no ano', '% of units this year'),
    why: l('Das unidades vendidas/ouvidas no país neste ano, quanto foi de lançamentos seus.', 'Of the units sold/played in the country this year, how much came from your releases.') },
  rivaldom: { name: l('Domínio dos rivais', 'Rival dominance'), unit: l('% do maior rival', '% held by the top rival'),
    why: l('Fatia do selo rival mais forte no país neste ano. Acima de 40%: mercado fechado, entrar custa caro.', 'Share of the strongest rival label in the country this year. Above 40%: a locked market, costly to enter.') },
  piracy: { name: l('Pirataria', 'Piracy'), unit: l('% das vendas perdidas (est.)', '% of sales lost (est.)'),
    why: l('Estimativa: perda da época (fita de rua, troca de arquivos, streaming) ajustada pelo poder de compra local.', 'Estimate: the era\'s leakage (street tapes, file sharing, streaming) adjusted by local buying power.') },
  physical: { name: l('Formato físico', 'Physical format'), unit: l('% do consumo em físico', '% of consumption on physical'),
    why: l('Quanto do consumo ainda é disco/fita/CD. Alto = tiragem e fábrica importam; baixo = digital manda.', 'How much consumption is still records/tapes/CDs. High = pressing and plants matter; low = digital rules.') },
  // r16: fama regional do artista selecionado (calculada na interface: depende da seleção)
  afame: { name: l('Fama do artista selecionado', 'Selected artist\'s fame'), unit: l('fama local 0–100', 'local fame 0–100'),
    why: l('Fama no país: origem, idioma e mercado, alcance do degrau e gosto pelo gênero, mais paradas, prêmios, shows e divulgação lá. Sem atividade, volta devagar à base.', 'Fame in the country: origin, language and market, tier reach and genre taste, plus charts, awards, shows and promotion there. Without activity it slowly returns to base.') },
};

export function paintAvailable(s: GameState, p: Paint): boolean {
  if (p === 'piracy') return hasTech(s, 'cassette');
  if (p === 'share' || p === 'rivaldom') return s.year >= s.config.startYear;
  return true;
}

let sizeCache: { y: number; v: Map<string, number>; tot: number } | null = null;
function sizes(y: number): { v: Map<string, number>; tot: number } {
  if (sizeCache?.y === y) return sizeCache;
  const v = new Map<string, number>();
  let tot = 0;
  for (const c of COUNTRY_INFO) { const x = countryMarketSize(c, y); v.set(c.a3, x); tot += x; }
  sizeCache = { y, v, tot };
  return sizeCache;
}

/** Perda para a pirataria na época (mesma régua do mercado) × poder de compra do país. */
export function piracyOf(s: GameState, a3: string): number {
  if (!hasTech(s, 'cassette')) return 0;
  const p2p = s.techDates.p2p, st = s.techDates.streaming;
  let loss = st !== undefined && s.year >= st + 3 ? 0.1 : 0.03;
  if (p2p !== undefined && s.year >= p2p && (st === undefined || s.year < st + 3)) loss = 0.38;
  if (hasMutator(s, 'heavy_piracy')) loss += 0.18;
  const c = countryInfoByA3[a3];
  const buy = c ? countryBuy(c, s.year) : 0.7;
  return clamp(loss * (1.6 - 0.8 * Math.min(1, buy)), 0, 0.8);
}

export function formatMix(s: GameState, a3: string): { phys: number; dl: number; stream: number; physName: L } {
  const c = countryInfoByA3[a3];
  const phys = clamp(physicalShare(s) * (c?.physical ?? 1), 0.02, 0.97);
  const rest = 1 - phys;
  const dlOk = hasTech(s, 'download'), stOk = hasTech(s, 'streaming');
  const stream = stOk ? rest * (s.year >= (s.techDates.streaming ?? 2008) + 6 ? 0.92 : 0.65) : 0;
  const dl = dlOk || stOk ? rest - stream : 0;
  const physName = hasTech(s, 'streaming') && s.year >= (s.techDates.streaming ?? 2008) + 4 ? l('vinil e CD', 'vinyl and CD')
    : hasTech(s, 'cd') ? l('CD, fita e vinil', 'CD, tape and vinyl') : hasTech(s, 'cassette') ? l('vinil e fita', 'vinyl and tape') : l('discos', 'records');
  // sem formatos digitais, o resto é rádio/execução (não vira venda)
  return { phys: dlOk || stOk ? phys : 1, dl, stream, physName };
}

export interface CountryStats {
  a3: string; size: number; sizePct: number; growth: number; fans: number;
  units: number; mine: number; share: number; top?: { owner: string; share: number }; owners: { owner: string; share: number }[];
  piracy: number; mix: ReturnType<typeof formatMix>; genres: { fam: string; name: L; v: number }[];
}

export function countryStats(s: GameState, a3: string, fans?: Map<string, number>): CountryStats | null {
  const c = countryInfoByA3[a3];
  if (!c) return null;
  const sz = sizes(s.year);
  const size = sz.v.get(a3) ?? 0;
  const old = countryMarketSize(c, s.year - 10);
  const yu = ch7(s)?.yearUnits?.[a3] ?? {};
  let units = 0, mine = 0;
  const by: Record<string, number> = {};
  for (const [rid, u] of Object.entries(yu)) {
    const r = s.releases[rid];
    if (!r) continue;
    units += u;
    if (r.owner === 'player') mine += u;
    else if (s.labels[r.owner]) by[r.owner] = (by[r.owner] ?? 0) + u;
  }
  const owners = Object.entries(by).map(([owner, u]) => ({ owner, share: units ? u / units : 0 })).sort((a, b) => b.share - a.share);
  return {
    a3, size, sizePct: sz.tot ? size / sz.tot : 0, growth: old > 0 ? size / old - 1 : 0,
    fans: (fans ?? fansByCountry(s)).get(a3) ?? 0, units, mine, share: units ? mine / units : 0, top: owners[0], owners: owners.slice(0, 5),
    piracy: piracyOf(s, a3), mix: formatMix(s, a3),
    genres: FAMILIES.map((f) => ({ fam: f.id, name: f.name, v: countryTaste(c, f.id, s.year) })).sort((a, b) => b.v - a.v).slice(0, 4),
  };
}

/** Valor bruto de uma camada por país (null = sem dado). */
export function paintRaw(st: CountryStats, p: Paint): number | null {
  switch (p) {
    case 'market': return st.sizePct;
    case 'growth': return st.growth;
    case 'fans': return st.fans || null;
    case 'share': return st.units ? st.share : null;
    case 'rivaldom': return st.top ? st.top.share : null;
    case 'piracy': return st.piracy;
    case 'physical': return st.mix.phys;
    default: return null;
  }
}

/** Valores de todos os países + escala (mín/máx) para a legenda. */
export function paintAll(s: GameState, p: Paint): { v: Map<string, number>; min: number; max: number } {
  const v = new Map<string, number>();
  if (p === 'none' || !paintAvailable(s, p)) return { v, min: 0, max: 0 };
  const fans = p === 'fans' ? fansByCountry(s) : undefined;
  for (const c of COUNTRY_INFO) {
    const st = countryStats(s, c.a3, fans);
    const x = st ? paintRaw(st, p) : null;
    if (x !== null && Number.isFinite(x)) v.set(c.a3, x);
  }
  const xs = [...v.values()];
  return { v, min: xs.length ? Math.min(...xs) : 0, max: xs.length ? Math.max(...xs) : 0 };
}
