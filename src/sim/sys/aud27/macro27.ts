// Rodada 27 (AUD2) — CHOQUES MACRO QUE CHEGAM NO DINHEIRO. Juros (money19 `rate_shift`), calote de título
// (`bond_default`), quebra de selo (`label_bankrupt`) e crise cambial (links19b `fx_crisis`) só mexiam no próprio
// sistema. Agora uma crise se sente em todo lugar ao mesmo tempo:
//  • JUROS (Δ pp no ano): empréstimos de taxa flutuante da empresa (banco comercial e conversível; não fomento nem
//    agiota) e o empréstimo pessoal do banco andam 40% do Δ; a bolsa (bolsa10) cai/sobe 1,2% por ponto (selos
//    listados 1,5%; o seu também); os fundos do goods8 reprecificam (ações/tecnologia/cripto −1,5%/ponto,
//    catálogos −1%/ponto; títulos +0,5%/ponto quando o juro sobe).
//  • CALOTE DO SEU TÍTULO: sua ação −15% (se listada) e o banco cobra +1 pp nos empréstimos flutuantes (risco).
//  • QUEBRA DE SELO LISTADO: a ação dele afunda 60% (e o ruído derruba 3% dos outros selos).
//  • CRISE CAMBIAL num submercado: selos listados de lá −8%; estrada lá fica mais cara por 12 meses (receita líquida
//    dos seus shows ×0,92, mod showRevenue com rótulo); quem tem fundo de ações perde 2%.
// Sem sorteio: efeitos proporcionais ao choque.

import { clamp } from '../../../core/rng';
import { countryOfCity } from '../../../data/geo';
import { subOfA3_18 } from '../../../data/regions18';
import { l, type L } from '../../../data/world';
import { registerExt4, registerMod } from '../../ext4';
import { onFact, type Fact } from '../../facts17';
import type { GameState } from '../../types';
import { fmtL } from '../../util';
import { bolsa, OWN } from '../bolsa10';
import { goods } from '../goods8';
import { vices } from '../vices';
import { OFF_AUD27 } from './off';

const N = (pt: string, en: string): L => l(pt, en);
export interface Macro27State { fx: Record<string, number>; log: [number, number, L][] }
declare module '../../ext4' { interface Ext4 { macro27: Macro27State } }
registerExt4('macro27', () => ({ fx: {}, log: [] }));
export function macro27(s: GameState): Macro27State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.macro27 ??= { fx: {}, log: [] }) as Macro27State;
  st.fx ??= {}; st.log ??= [];
  return st;
}
const logIt = (s: GameState, t: L): void => { const st = macro27(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 30) st.log.length = 30; };
const news = (s: GameState, t: L, tone: 'good' | 'bad' | 'info'): void => { const b = bolsa(s); b.news.unshift({ y: s.year, m: s.month, t, tone }); if (b.news.length > 40) b.news.length = 40; };

/** Credores de taxa flutuante (empresa). */
const FLOAT27 = new Set(['bank', 'angel', undefined]);
/** Move os juros dos empréstimos flutuantes (em pontos percentuais). Devolve quantos mudaram. */
export function shiftLoanRates27(s: GameState, pp: number): number {
  let n = 0;
  const co = vices(s).coLenders;
  for (const ln of s.player.loans) { if (!FLOAT27.has(co[ln.id])) continue; ln.rate = clamp(Math.round((ln.rate + pp / 100) * 10000) / 10000, 0.01, 0.6); n++; }
  for (const ln of vices(s).loans) { if (ln.lender !== 'bank') continue; ln.rate = clamp(Math.round((ln.rate + pp / 100) * 10000) / 10000, 0.01, 0.6); n++; }
  return n;
}
/** Reprecifica a bolsa: `k` = variação (−0,05 = −5%); `pred` filtra ações. */
export function shockStocks27(s: GameState, k: number, pred: (id: string) => boolean = () => true): number {
  const b = bolsa(s);
  let n = 0;
  for (const [id, q] of Object.entries(b.q)) {
    if (q.dead || !pred(id)) continue;
    q.p = Math.max(100, Math.round(q.p * (1 + k)));
    n++;
  }
  if (s.listing?.listed && pred(OWN)) s.listing.price = Math.max(1, Math.round(s.listing.price * (1 + k)));
  return n;
}
const isLabelQ = (s: GameState, id: string): boolean => id.startsWith('lb:') || !!s.labels[id] || id === OWN;
const labelOfQ = (id: string): string => id.replace(/^lb:/, '');

onFact('rate_shift', (s, f) => {
  if (OFF_AUD27.macro) return;
  const d = Number(f.data?.d ?? (f.tags.includes('up') ? 2.5 : -2.5));
  if (!d) return;
  const n = shiftLoanRates27(s, d * 0.4);
  shockStocks27(s, -0.012 * d, (id) => !isLabelQ(s, id));
  shockStocks27(s, -0.015 * d, (id) => isLabelQ(s, id));
  const inv = goods(s).inv;
  const fx: Record<string, number> = { stocks: -0.015, tech: -0.015, crypto: -0.015, catalogs: -0.01, savings: d > 0 ? 0.005 : 0 };
  for (const [k, pos] of Object.entries(inv)) if (pos && fx[k]) pos.value = Math.max(0, Math.round(pos.value * (1 + fx[k] * d)));
  const t = fmtL(d > 0 ? N('Juros sobem {d} pontos: parcelas flutuantes mais caras ({n} empréstimos), bolsa e fundos recuam.', 'Rates rise {d} points: floating payments cost more ({n} loans), stocks and funds pull back.')
    : N('Juros caem {d} pontos: parcelas flutuantes aliviam ({n} empréstimos), bolsa e fundos sobem.', 'Rates fall {d} points: floating payments ease ({n} loans), stocks and funds rise.'), { d: Math.abs(d), n });
  news(s, t, d > 0 ? 'bad' : 'good');
  logIt(s, t);
}, 'macro27:rates');

onFact('bond_default', (s) => {
  if (OFF_AUD27.macro) return;
  shockStocks27(s, -0.15, (id) => id === OWN);
  shiftLoanRates27(s, 1);
  logIt(s, N('Calote do título: o mercado pune a sua ação e o banco cobra mais caro.', 'Bond default: the market punishes your stock and the bank charges more.'));
}, 'macro27:default');

onFact('label_bankrupt', (s, f) => {
  if (OFF_AUD27.macro) return;
  const lb = String(f.data?.lb ?? f.actors[0] ?? '');
  if (!lb) return;
  const hit = shockStocks27(s, -0.6, (id) => labelOfQ(id) === lb);
  if (!hit) return;
  shockStocks27(s, -0.03, (id) => isLabelQ(s, id) && labelOfQ(id) !== lb && id !== OWN);
  news(s, fmtL(N('{l} quebra: a ação afunda e arrasta o setor.', '{l} goes bust: the stock sinks and drags the sector.'), { l: s.labels[lb]?.name ?? lb }), 'bad');
}, 'macro27:bankrupt');

const subOfCity = (city: string): string | undefined => subOfA3_18(countryOfCity(city));
onFact('fx_crisis', (s, f: Fact) => {
  if (OFF_AUD27.macro) return;
  const sub = f.tags.find((t) => t !== 'fx' && t !== 'bad');
  if (!sub) return;
  macro27(s).fx[sub] = s.week + 52;
  shockStocks27(s, -0.08, (id) => { const lb = s.labels[labelOfQ(id)]; return !!lb && subOfCity(lb.city) === sub; });
  const inv = goods(s).inv;
  if (inv.stocks) inv.stocks.value = Math.round(inv.stocks.value * 0.98);
  logIt(s, fmtL(N('Crise cambial ({s}): estrada mais cara por 12 meses; selos de lá caem na bolsa.', 'Currency crisis ({s}): touring there costs more for 12 months; labels from there fall on the exchange.'), { s: sub }));
}, 'macro27:fx');

/** Crise cambial ativa na cidade (para shows). */
export const fxHit27 = (s: GameState, city: string): boolean => { const sub = subOfCity(city); return !!sub && (macro27(s).fx[sub] ?? 0) > s.week; };
registerMod('showRevenue', 'macro27:fx', (s, v, c) => {
  if (OFF_AUD27.macro || !c.act || c.act.owner !== 'player' || !c.cityId || !fxHit27(s, c.cityId)) return null;
  return { value: v * 0.92, label: N('Crise cambial: estrada paga em moeda forte', 'Currency crisis: touring costs paid in hard currency') };
});
