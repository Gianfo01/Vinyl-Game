// Rodada 20 (G7, análise B17/B18 + §6 fãs↔território↔turnê): LIVRO REGIONAL DE FÃS e PREÇO POR MERCADO.
// • B17 — cada ato do jogador guarda coortes casual/ativo/núcleo por região (7 mercados). Conservação: em toda
//   virada de mês a soma regional de cada coorte é IGUAL ao total global (act.fans), por restos maiores.
//   O alvo de cada região é a fama regional (fame16 por país × tamanho do mercado); os shows deixam a conversão
//   NA praça onde aconteceram (gancho 'show'); núcleo muda devagar, casual deriva rápido para o alvo.
//   Cada número é estimativa com confiança: alta (show lá nos últimos 12 meses), média (sinal local de fama ou
//   território aberto), baixa (só a fama global distribuída).
// • Turnê: o modificador 'cityDemand' lê o livro — praça onde o ato tem mais fãs do que a fama "explica" atrai
//   mais público (0,92–1,12), com rótulo para a autópsia/por quê.
// • B18 — preço de gravação continua sendo a política global (indústria › Preço); aqui só há SOBREPOSIÇÃO opcional
//   por mercado. Unidades: 'chartUnits' recebe a razão (preço local ÷ global) ponderada pelo livro do ato nos
//   territórios do lançamento. Receita: depois do ajuste global da indústria, posta-se só a DIFERENÇA de margem
//   (local − global) sobre a fatia estimada das vendas desse mercado — nada é contado duas vezes.
import { clamp } from '../../core/rng';
import { COUNTRY_INFO, countryMarketSize } from '../../data/countries';
import { MARKETS, cityById, l, type L, type MarketId } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact } from '../facts17';
import type { Act, GameState } from '../types';
import { fmtL, playerActs, post } from '../util';
import { f16, fameIn, mkOf } from './fame16';
import { PRICE_TIERS } from './industry/retail';
import type { PriceTier } from './industry/state';

export const MK20: MarketId[] = MARKETS.map((m) => m.id);
export type Coh20 = [number, number, number]; // casual, ativo, núcleo
export interface Terr20 {
  /** ato → mercado → coortes */
  a: Record<string, Partial<Record<MarketId, Coh20>>>;
  /** conversão local pendente (fãs ganhos em shows) até a virada do mês */
  p: Record<string, Partial<Record<MarketId, Coh20>>>;
  /** última semana com show do ato no mercado (confiança) */
  sw: Record<string, Partial<Record<MarketId, number>>>;
  /** sobreposição de preço por mercado (ausente = segue a política global) */
  ov: Partial<Record<MarketId, PriceTier>>;
  /** maior praça fora de casa já anunciada (fato) */
  top: Record<string, MarketId>;
  log: [number, number, L][];
}
declare module '../ext4' { interface Ext4 { terr20: Terr20 } }
const fresh = (): Terr20 => ({ a: {}, p: {}, sw: {}, ov: {}, top: {}, log: [] });
registerExt4('terr20', fresh);
export function terr20(s: GameState): Terr20 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const t = (x.terr20 ??= fresh()) as Terr20;
  t.a ??= {}; t.p ??= {}; t.sw ??= {}; t.ov ??= {}; t.top ??= {}; t.log ??= [];
  return t;
}
const mine = (a?: Act): a is Act => !!a && (a.owner === 'player' || !!a.playerBand) && a.status !== 'retired' && a.status !== 'split';
const glob = (a: Act): Coh20 => [Math.max(0, Math.round(a.fans.casual)), Math.max(0, Math.round(a.fans.active)), Math.max(0, Math.round(a.fans.core))];
/** retenção mensal da distribuição anterior por coorte (o resto deriva para o alvo da fama regional) */
const KEEP: Coh20 = [0.8, 0.9, 0.97];

/** Alvo regional (soma 1): fama do ato em cada país × tamanho do mercado do país. */
export function target20(s: GameState, a: Act): Record<MarketId, number> {
  const w = Object.fromEntries(MK20.map((m) => [m, 0])) as Record<MarketId, number>;
  for (const c of COUNTRY_INFO) { const mk = mkOf(c.a3); if (mk in w) w[mk] += countryMarketSize(c, s.year) * (0.5 + fameIn(s, a, c.a3)); }
  const tot = MK20.reduce((t, m) => t + w[m], 0) || 1;
  for (const m of MK20) w[m] /= tot;
  return w;
}

/** Restos maiores: inteiros ≥ 0 proporcionais a `v` que somam exatamente `n`. */
export function apportion20(v: number[], n: number): number[] {
  const t = v.reduce((a, b) => a + Math.max(0, b), 0);
  if (n <= 0) return v.map(() => 0);
  const raw = t > 0 ? v.map((x) => (Math.max(0, x) / t) * n) : v.map(() => n / v.length);
  const out = raw.map(Math.floor);
  let rest = n - out.reduce((a, b) => a + b, 0);
  const ord = raw.map((x, i) => [x - Math.floor(x), i] as [number, number]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; rest > 0; k = (k + 1) % ord.length, rest--) out[ord[k][1]]++;
  return out;
}

/** Recalcula o livro de um ato: anterior × retenção + conversão local + deriva para o alvo; fecha com o global. */
export function settle20(s: GameState, a: Act): void {
  const st = terr20(s), g = glob(a), tg = target20(s, a);
  const prev = st.a[a.id], pend = st.p[a.id] ?? {};
  const next: Partial<Record<MarketId, Coh20>> = {};
  for (let k = 0; k < 3; k++) {
    const pSum = prev ? MK20.reduce((t, m) => t + (prev[m]?.[k] ?? 0), 0) : 0;
    const v = MK20.map((m) => {
      const base = prev && pSum > 0 ? (prev[m]?.[k] ?? 0) / pSum : tg[m];
      return KEEP[k] * base + (1 - KEEP[k]) * tg[m];
    });
    // conversão local: fatia que os shows trouxeram no mês (no máximo metade da coorte se mexe por show)
    const loc = MK20.map((m) => Math.max(0, pend[m]?.[k] ?? 0));
    const lt = Math.min(loc.reduce((x, y) => x + y, 0), g[k] * 0.5);
    const ls = loc.reduce((x, y) => x + y, 0) || 1;
    const share = v.map((x, i) => x * (g[k] - lt) + (loc[i] / ls) * lt);
    apportion20(share, g[k]).forEach((n, i) => { (next[MK20[i]] ??= [0, 0, 0])[k] = n; });
  }
  st.a[a.id] = next;
  delete st.p[a.id];
}

export const fansIn20 = (s: GameState, a: Act, mk: MarketId): Coh20 => terr20(s).a[a.id]?.[mk] ?? [0, 0, 0];
const wt = (c: Coh20) => c[0] * 0.3 + c[1] + c[2] * 2;
/** Fatia ponderada do ato em cada mercado (livro, ou alvo se ainda não há livro). */
export function share20(s: GameState, a: Act): Record<MarketId, number> {
  const led = terr20(s).a[a.id];
  if (!led) return target20(s, a);
  const t = MK20.reduce((x, m) => x + wt(led[m] ?? [0, 0, 0]), 0);
  if (t <= 0) return target20(s, a);
  return Object.fromEntries(MK20.map((m) => [m, wt(led[m] ?? [0, 0, 0]) / t])) as Record<MarketId, number>;
}

/** Confiança da estimativa: 2 alta (show lá ≤ 52 sem.), 1 média (sinal local de fama / território aberto), 0 baixa. */
export function conf20(s: GameState, a: Act, mk: MarketId): { lv: 0 | 1 | 2; pm: number; name: L } {
  const w = terr20(s).sw[a.id]?.[mk];
  if (w !== undefined && s.week - w <= 52) return { lv: 2, pm: 0.1, name: l('alta', 'high') };
  const d = f16(s).d[a.id] ?? {};
  const local = Object.keys(d).some((k) => (k.startsWith('r:') ? k.slice(2) === mk : mkOf(k) === mk) && Math.abs(d[k]) >= 1);
  if (local || s.player.territories.includes(mk) || cityById[a.city]?.market === mk) return { lv: 1, pm: 0.25, name: l('média', 'medium') };
  return { lv: 0, pm: 0.5, name: l('baixa', 'low') };
}

/** Multiplicador de procura local (turnê): fãs no livro ÷ o que a fama regional explica, suavizado. */
export function demandMult20(s: GameState, a: Act, cityId: string): number {
  const mk = cityById[cityId]?.market;
  if (!mk || !terr20(s).a[a.id]) return 1;
  const sh = share20(s, a)[mk], tg = target20(s, a)[mk];
  if (!(tg > 0)) return 1;
  return clamp(Math.pow(sh / tg, 0.35), 0.92, 1.12);
}

registerMod('cityDemand', 'terr20', (s, v, c) => {
  if (!c.act || !c.cityId || !mine(c.act)) return null;
  const m = demandMult20(s, c.act, c.cityId);
  return Math.abs(m - 1) < 0.005 ? null : { value: v * m, label: l('Fãs locais (livro regional)', 'Local fans (regional ledger)') };
});

registerSimHook('show', 'terr20', (s, _r, arg) => {
  const sh = arg.show; const a = sh ? s.acts[sh.actId] : undefined;
  const mk = sh ? cityById[sh.cityId]?.market : undefined;
  if (!sh || !mine(a) || !mk) return;
  const st = terr20(s), p = ((st.p[a.id] ??= {})[mk] ??= [0, 0, 0]);
  // mesmas taxas de conversão do acerto do show (tours.ts): os fãs novos nascem nesta praça
  p[0] += Math.round(sh.sold * 0.16); p[1] += Math.round(sh.sold * 0.05); p[2] += Math.round(sh.sold * 0.007);
  (st.sw[a.id] ??= {})[mk] = s.week;
});

// ---------------------------------------------------------------- B18: preço por mercado

export const tierOf20 = (s: GameState, mk: MarketId): PriceTier => terr20(s).ov[mk] ?? s.x4.industry.pricing;
export function setOv20(s: GameState, mk: MarketId, tier: PriceTier | null): void {
  const st = terr20(s);
  if (!tier || tier === s.x4.industry.pricing) delete st.ov[mk]; else st.ov[mk] = tier;
}
/** Fatia estimada das vendas do selo por mercado: livro de fãs do elenco nos territórios abertos (fallback: tamanho). */
export function salesSplit20(s: GameState): Record<MarketId, number> {
  const terr = s.player.territories.length ? s.player.territories : MK20;
  const w: Record<string, number> = {};
  for (const id of playerActs(s)) { const a = s.acts[id]; if (!mine(a)) continue; const sh = share20(s, a), f = wt(glob(a)); for (const m of terr) w[m] = (w[m] ?? 0) + sh[m] * f; }
  let t = terr.reduce((x, m) => x + (w[m] ?? 0), 0);
  if (t <= 0) { for (const m of terr) w[m] = MARKETS.find((x) => x.id === m)!.size(s.year); t = terr.reduce((x, m) => x + w[m], 0) || 1; }
  return Object.fromEntries(MK20.map((m) => [m, terr.includes(m) ? (w[m] ?? 0) / t : 0])) as Record<MarketId, number>;
}
/** Razão de unidades (local ÷ global) num conjunto de mercados, ponderada pela fatia. */
export function unitsRatio20(s: GameState, mks: MarketId[], sh: Record<MarketId, number>): number {
  const g = PRICE_TIERS[s.x4.industry.pricing].units;
  let w = 0, v = 0;
  for (const m of mks) { const k = sh[m] > 0 ? sh[m] : 1e-6; w += k; v += k * (PRICE_TIERS[tierOf20(s, m)].units / g); }
  return w > 0 ? v / w : 1;
}
registerMod('chartUnits', 'terr20:price', (s, v, c) => {
  const rel = c.release;
  if (!rel || rel.owner !== 'player' || !Object.keys(terr20(s).ov).length) return null;
  const a = s.acts[rel.actId];
  const m = unitsRatio20(s, rel.territories, a ? share20(s, a) : salesSplit20(s));
  return Math.abs(m - 1) < 0.001 ? null : { value: v * m, label: l('Preço por mercado', 'Per-market pricing') };
});
/** Diferença de margem do mês (local − global) sobre a fatia de cada mercado; base = vendas sem o ajuste global. */
export function priceAdj20(s: GameState, sales: number): number {
  const ov = terr20(s).ov, g = s.x4.industry.pricing;
  if (!Object.keys(ov).length || sales <= 0) return 0;
  const base = sales / (1 + PRICE_TIERS[g].revenue), sp = salesSplit20(s);
  let d = 0;
  for (const [m, tier] of Object.entries(ov) as [MarketId, PriceTier][]) d += (sp[m] ?? 0) * (PRICE_TIERS[tier].revenue - PRICE_TIERS[g].revenue);
  return Math.round(base * d);
}

// ---------------------------------------------------------------- virada do mês

registerSimHook('month', 'terr20', (s) => {
  const st = terr20(s);
  const adj = priceAdj20(s, s.monthLedger.sales ?? 0);
  if (adj) post(s, `terr20:price:${s.year}:${s.month}`, adj, 'sales', adj > 0 ? 'Margem premium regional' : 'Desconto regional');
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!mine(a)) continue;
    settle20(s, a);
    // evidência → resumo: nova praça forte fora de casa vira fato (uma vez por troca)
    const home = cityById[a.city]?.market, sh = share20(s, a);
    const best = MK20.filter((m) => m !== home).sort((x, y) => sh[y] - sh[x])[0];
    if (best && sh[best] >= 0.25 && st.top[a.id] !== best && (a.fans.core + a.fans.active) >= 500) {
      st.top[a.id] = best;
      const mn = MARKETS.find((m) => m.id === best)!.name;
      const text = fmtL(l('{a} já tem {p}% dos fãs em {m} — a maior praça fora de casa.', '{a} now has {p}% of its fans in {m} — its biggest market abroad.'), { a: a.name, p: Math.round(sh[best] * 100), m: mn });
      st.log.unshift([s.year, s.month, text]); if (st.log.length > 20) st.log.length = 20;
      emitFact(s, { kind: 'fans_region', actors: [a.id, 'player'], severity: 20, visibility: 'public', tags: ['good', 'region', best], text, src: 'terr20', data: { mk: best, share: Math.round(sh[best] * 100) } });
    }
  }
  for (const k of Object.keys(st.a)) if (!mine(s.acts[k])) { delete st.a[k]; delete st.p[k]; delete st.sw[k]; delete st.top[k]; }
});

registerExplain('terr20.demand', (s, c) => {
  const a = s.acts[String(c.act)], city = String(c.city ?? '');
  const mk = (cityById[city]?.market ?? c.mk) as MarketId | undefined;
  if (!a || !mk) return null;
  const sh = share20(s, a)[mk], tg = target20(s, a)[mk], cf = conf20(s, a, mk);
  return {
    title: l('Procura local pelo livro de fãs', 'Local demand from the fan ledger'), value: city ? demandMult20(s, a, city) : sh, fmt: city ? 'mult' : 'pct',
    parts: [
      { label: l('Fatia dos fãs nesta região', 'Share of fans in this region'), value: sh, fmt: 'pct' },
      { label: l('Fatia que a fama regional explica', 'Share explained by regional fame'), value: tg, fmt: 'pct' },
      { label: fmtL(l('Confiança da estimativa: {c}', 'Estimate confidence: {c}'), { c: cf.name }), value: `±${Math.round(cf.pm * 100)}%`, fmt: 'text' },
    ],
    note: l('Shows convertem fãs na praça onde acontecem; sem atividade, a distribuição volta aos poucos para a fama regional. A soma das regiões é sempre o total global.', 'Shows convert fans where they happen; without activity, the split drifts back to regional fame. Regions always add up to the global total.'),
  };
});
