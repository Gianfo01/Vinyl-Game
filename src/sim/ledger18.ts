// Rodada 18 (econ18): livro contábil de verdade. Cada lançamento cai numa seção da DRE / fluxo de caixa:
// receita operacional, custos e despesas, resultado não operacional, impostos, investimento (ativos) e financiamento.
// Só receita/custo operacional entram em revenueByYear/profitByYear (conselho, metas, avaliação, IA de conselheiro).
// Contas a receber e a pagar (prazos de distribuidor, sociedade arrecadadora, prestação de contas de royalties)
// separam competência (quando a receita é reconhecida) de caixa (quando o dinheiro entra).
// Sem imports de runtime: util.ts importa este módulo.
import type { GameState } from './types';

export type Sect18 = 'rev' | 'cost' | 'nonop' | 'tax' | 'inv' | 'fin';
export interface Bucket18 { due: number; amt: number; cat: string; who: string; act?: string; mk?: string; memo?: string }
export interface Lost18 { y: number; m: number; what: string; cash: number; perYear: number }
export interface Fin18 {
  /** linhas por ano e por mês (índice ano*12+mês): `${seção}:${grupo}` (competência) e `cf:op|cf:inv|cf:fin` (caixa) */
  y: Record<number, Record<string, number>>;
  m: Record<number, Record<string, number>>;
  ar: Bucket18[];
  ap: Bucket18[];
  /** antecipação automática de recebíveis quando o caixa fica negativo */
  auto: boolean;
  /** atrasar prestação de contas de royalties quando o caixa aperta (custa confiança) */
  delayRoy: boolean;
  lost: Lost18[];
  /** prestações atrasadas por ato */
  late: Record<string, number>;
  /** renda perdida projetada por vendas de catálogo (centavos/ano) */
  lostPerYear: number;
}

const FIN = new Set(['financing', 'loans', 'ipo', 'investment', 'investor_share', 'owner_capital', 'owner_draw', 'securitization', 'factoring_fin']);
const INV = new Set(['acquisitions', 'asset_sales', 'investments', 'transfers', 'capex']);
const NONOP = new Set(['other_income', 'other', 'fx', 'finexp', 'idglitch']);
/** chaves que, mesmo em categoria operacional, são compra/venda de ativo (capex) */
const INV_KEY = /^(eq:|x4gear|plant:|plantup:|hq:|building:|branch:|branchup:|dept:|furn:|furnsell:|item:|roomswap:|subsetup:|streamlaunch:|streamlic:|outlet:|venture:|divest:|venuebuy|venueup|v12up|v12br|v12big|v17buy|idcatsell)/;
/** chaves que, em categoria de investimento/financiamento, são despesa corrente */
const OP_KEY = /^(deptup:|relicbrw:|owner_salary)/;

export function sect18(cat: string, amount: number, key = ''): Sect18 {
  if (OP_KEY.test(key)) return amount >= 0 ? 'rev' : 'cost';
  if (INV_KEY.test(key)) return 'inv';
  if (cat === 'taxes') return 'tax';
  if (FIN.has(cat)) return 'fin';
  if (INV.has(cat) || cat === 'hq') return 'inv';
  if (NONOP.has(cat)) return 'nonop';
  if (cat === 'dividends') return amount >= 0 ? 'nonop' : 'fin';
  if (cat === 'misc' || cat === 'legal' || cat === 'advances') return amount >= 0 ? 'nonop' : 'cost';
  return amount >= 0 ? 'rev' : 'cost';
}

const G_REC = new Set(['sales', 'distribution', 'royalties', 'retail', 'plant', 'manufacturing', 'release', 'neural', 'recording', 'production']);
const G_LIVE = new Set(['live', 'live_costs', 'touring', 'shows', 'clubs', 'w4_fairs', 'security']);
const G_PUB = new Set(['publishing', 'publishing_arm', 'sync', 'licensing', 'rights', 'w4_rights', 'w4society', 'w4levy']);
const G_MERCH = new Set(['merch', 'brands']);
const G_MKT = new Set(['marketing', 'promo', 'pr_agency', 'w4_payola', 'w4pitch', 'w4_release']);
const G_AR = new Set(['advances', 'artist_dev', 'scouting']);
const G_PAY = new Set(['salaries', 'staff_training', 'owner_salary']);

/** grupo da linha na DRE */
export function group18(cat: string, sect: Sect18, key = ''): string {
  if (sect === 'rev') return G_REC.has(cat) ? 'rec' : G_LIVE.has(cat) ? 'live' : G_PUB.has(cat) ? 'pub' : G_MERCH.has(cat) ? 'merch' : 'svc';
  if (sect === 'cost') {
    if (key.startsWith('owner_salary')) return 'pay';
    return G_REC.has(cat) || G_LIVE.has(cat) || G_PUB.has(cat) || G_MERCH.has(cat) ? 'cogs' : G_MKT.has(cat) ? 'mkt' : G_AR.has(cat) ? 'ar' : G_PAY.has(cat) ? 'pay' : 'ovh';
  }
  if (sect === 'inv' || sect === 'fin') return 'x';
  return cat === 'fx' ? 'fx' : cat === 'finexp' ? 'int' : 'oth';
}

export function fin18(s: GameState): Fin18 {
  const p = s.player as unknown as { fin18?: Fin18 };
  const f = (p.fin18 ??= { y: {}, m: {}, ar: [], ap: [], auto: true, delayRoy: false, lost: [], late: {}, lostPerYear: 0 });
  f.lost ??= []; f.late ??= {}; f.lostPerYear ??= 0;
  return f;
}

export const mIdx18 = (s: GameState): number => s.year * 12 + s.month;

function add(o: Record<string, number>, k: string, v: number): void { o[k] = (o[k] ?? 0) + v; }

/** Registra competência (accrual) e/ou caixa. `cash=false`: reconhecido agora, caixa depois (bucket). */
export function book18(s: GameState, sect: Sect18, cat: string, key: string, amount: number, cash: boolean, accrual = true): void {
  const f = fin18(s);
  const mi = mIdx18(s);
  const Y = (f.y[s.year] ??= {});
  let M = f.m[mi];
  if (!M) {
    M = f.m[mi] = {};
    // guarda 48 meses
    for (const k of Object.keys(f.m)) if (Number(k) < mi - 48) delete f.m[Number(k)];
  }
  if (accrual) {
    const line = `${sect}:${group18(cat, sect, key)}`;
    add(Y, line, amount); add(M, line, amount);
  }
  if (cash) {
    const cf = sect === 'inv' ? 'cf:inv' : sect === 'fin' ? 'cf:fin' : 'cf:op';
    add(Y, cf, amount); add(M, cf, amount);
  }
}

/** soma de linhas com prefixo num registro */
export function sumP18(o: Record<string, number> | undefined, prefix: string): number {
  if (!o) return 0;
  let t = 0;
  for (const k in o) if (k.startsWith(prefix)) t += o[k];
  return t;
}
/** lucro operacional, resultado líquido (op + não operacional + impostos) */
export const opProfit18 = (o: Record<string, number> | undefined): number => sumP18(o, 'rev:') + sumP18(o, 'cost:');
export const netProfit18 = (o: Record<string, number> | undefined): number => opProfit18(o) + sumP18(o, 'nonop:') + sumP18(o, 'tax:');
export const arTotal18 = (s: GameState): number => fin18(s).ar.reduce((t, b) => t + b.amt, 0);
export const apTotal18 = (s: GameState): number => -fin18(s).ap.reduce((t, b) => t + b.amt, 0);

/** agrega no bucket (mesmo vencimento, categoria, devedor, ato e mercado) — poucos buckets vivos */
export function bucket18(list: Bucket18[], b: Bucket18): void {
  const x = list.find((y) => y.due === b.due && y.cat === b.cat && y.who === b.who && y.act === b.act && y.mk === b.mk);
  if (x) x.amt += b.amt;
  else list.push(b);
}

/** observadores de lançamentos (ex.: cláusulas que mandam custos de um ato para o recuperável). Função içada. */
export function postHooks18(): ((s: GameState, key: string, amount: number, cat: string) => void)[] {
  const f = postHooks18 as unknown as { l?: ((s: GameState, key: string, amount: number, cat: string) => void)[] };
  return (f.l ??= []);
}
