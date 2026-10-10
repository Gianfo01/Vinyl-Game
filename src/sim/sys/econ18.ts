// Rodada 18 (econ18): prazos de pagamento, contas a receber/pagar, antecipação de recebíveis, prestação de contas
// de royalties, câmbio por exposição real e renda futura perdida em vendas de catálogo.
// O lançamento contábil está em sim/ledger18.ts + util.post (competência × caixa).
import { l, type L, type MarketId, MARKETS, MARKET_PREF, cityById, familyOf } from '../../data/world';
import { clamp } from '../../core/rng';
import { registerSimHook } from '../ext4';
import { arTotal18, apTotal18, bucket18, fin18, mIdx18, opProfit18, type Bucket18 } from '../ledger18';
import { monthlyCosts } from '../economy';
import type { Act, GameState, Release } from '../types';
import { fmtL, notify, post, remember, settleCash } from '../util';
import { physShareRel18 } from './eras18';

export { fin18 } from '../ledger18';

// ---------------------------------------------------------------- prazos por época e país

/** Prazo (meses) do distribuidor físico: 120 dias antes de 1970, 90 depois; streaming paga mensal com ~2 meses de defasagem. */
export function physLag18(year: number): number { return year < 1970 ? 4 : 3; }
export const DIGITAL_LAG18 = 2;
/** países onde o distribuidor demora mais (e mais ainda em crise cambial) */
export function mkExtra18(mk: string, year: number): number {
  const slow = mk === 'br' || mk === 'latam' || mk === 'africa' ? 1 : 0;
  return slow + (fxRate18(mk as MarketId, year) > 0 ? 1 : 0);
}
/** Sociedade arrecadadora (edição/execução): semestral antes de 1985, trimestral depois; paga ~1 trimestre após fechar. */
export function proDue18(s: GameState): number {
  const semi = s.year < 1985;
  const per = semi ? 6 : 3;
  const end = Math.floor(s.month / per) * per + per - 1; // último mês do período
  return s.year * 12 + end + 3;
}

/** Perda de valor da moeda local por ano (hiperinflação, crises cambiais) — a mesma tabela histórica de corp.ts. */
export function fxRate18(market: MarketId, year: number): number {
  if (market === 'br' && year >= 1980 && year <= 1994) return year >= 1986 ? 0.22 : 0.12;
  if (market === 'latam' && year >= 1982 && year <= 1991) return 0.15;
  if (market === 'latam' && year >= 2001 && year <= 2002) return 0.12;
  if (market === 'asia' && year >= 1997 && year <= 1998) return 0.1;
  if (market === 'africa' && year >= 1990 && year <= 2008) return 0.06;
  return 0;
}

/** Peso de cada mercado na receita de um lançamento (território × tamanho × gosto do gênero). */
export function mkWeights18(s: GameState, rel: Release): [string, number][] {
  const fam = familyOf(s.acts[rel.actId]?.genre ?? '');
  const terr = rel.territories?.length ? rel.territories : s.player.territories;
  const out: [string, number][] = [];
  let tot = 0;
  for (const m of MARKETS) {
    if (!terr.includes(m.id)) continue;
    const w = m.size(s.year) * (MARKET_PREF[m.id][fam] ?? 0.6);
    if (w > 0) { out.push([m.id, w]); tot += w; }
  }
  if (!tot) return [[s.player.territories[0] ?? 'na', 1]];
  return out.map(([m, w]) => [m, w / tot]);
}

/** Receita de vendas reconhecida agora; caixa por mercado no prazo do distribuidor (físico) e da plataforma (digital). */
export function postSalesAR18(s: GameState, rel: Release, key: string, amount: number, cat: string, memo: string): void {
  if (!amount) return;
  if (!post(s, key, amount, cat, memo, false)) return;
  const f = fin18(s);
  const mi = mIdx18(s);
  const phys = physShareRel18(s, rel);
  const fast = (s.flags.fastPay18 ?? 0) > 0 ? 1 : 0;
  const M = (f.m[mi] ??= {});
  for (const [mk, w] of mkWeights18(s, rel)) {
    const extra = mkExtra18(mk, s.year);
    const a = amount * w;
    // r18 supply18: prazo extra e reserva de devolução do distribuidor escolhido (s.flags.distLag18 / distRes18)
    const pa = Math.round(a * phys), dl = s.flags.distLag18 ?? 0, rs = a > 0 ? s.flags.distRes18 ?? 0 : 0;
    if (phys > 0) bucket18(f.ar, { due: mi + Math.max(1, physLag18(s.year) + extra - fast + dl), amt: Math.round(pa * (1 - rs)), cat: 'sales', who: 'dist', mk });
    if (phys > 0 && rs > 0) bucket18(f.ar, { due: mi + Math.max(1, physLag18(s.year) + extra - fast + dl) + 6, amt: pa - Math.round(pa * (1 - rs)), cat: 'sales', who: 'dist', mk });
    if (phys < 1) bucket18(f.ar, { due: mi + Math.max(1, DIGITAL_LAG18 + Math.min(1, extra) - fast), amt: Math.round(a * (1 - phys)), cat: 'sales', who: 'dsp', mk });
    M[`mk:${mk}`] = (M[`mk:${mk}`] ?? 0) + Math.round(a);
  }
}

/** Receita de terceiros (edição, sync, licenças) com prazo fixo em meses ou no calendário da arrecadadora. */
export function postAR18(s: GameState, key: string, amount: number, cat: string, memo: string, who: string, due: number, mk?: string): void {
  if (!amount) return;
  if (!post(s, key, amount, cat, memo, false)) return;
  bucket18(fin18(s).ar, { due, amt: Math.round(amount), cat, who, mk });
}

/** Royalties devidos ao artista: custo agora, pagos na prestação de contas do contrato (cláusula `stmt`). */
export function postRoyAP18(s: GameState, act: Act | undefined, key: string, amount: number, memo: string, due?: number): boolean {
  if (!post(s, key, -Math.abs(amount), 'royalties', memo, false)) return false;
  const mk = act ? cityById[act.city]?.market : undefined;
  bucket18(fin18(s).ap, { due: due ?? stmtDue18(s, act), amt: -Math.round(Math.abs(amount)), cat: 'royalties', who: act ? 'roy' : 'pts', act: act?.id, mk });
  return true;
}

/** Próxima prestação de contas do contrato do ato (padrão da indústria: semestral, 90 dias depois). */
export function stmtDue18(s: GameState, act?: Act): number {
  const c = act?.contractId ? s.contracts[act.contractId] : undefined;
  const st = (c as unknown as { clauses18?: { stmt?: 'q' | 's' | 'a'; lag?: number } } | undefined)?.clauses18;
  const per = st?.stmt === 'q' ? 3 : st?.stmt === 'a' ? 12 : 6;
  const lag = st?.lag ?? 3;
  const end = Math.floor(s.month / per) * per + per - 1;
  return s.year * 12 + end + lag;
}

// ---------------------------------------------------------------- liquidação mensal

const WHO: Record<string, L> = {
  dist: l('distribuidor', 'distributor'), dsp: l('plataformas digitais', 'digital platforms'), pro: l('sociedade arrecadadora', 'collection society'),
  sync: l('cliente de sync', 'sync client'), lic: l('licenciado', 'licensee'), roy: l('royalties ao artista', 'artist royalties'), pts: l('pontos de produção', 'producer points'),
};
export const whoName18 = (w: string): L => WHO[w] ?? l(w);

/** Desconto para antecipar um título (factoring): 3% + 1,5% por mês até o vencimento; +2 p.p. em país em crise. */
export function factorRate18(s: GameState, b: Bucket18): number {
  const months = Math.max(0, b.due - mIdx18(s));
  return clamp(0.03 + 0.015 * months + (b.mk && fxRate18(b.mk as MarketId, s.year) > 0 ? 0.02 : 0), 0.02, 0.15);
}

/** Antecipa recebíveis até cobrir `need` (centavos). Retorna o que entrou no caixa. */
export function factor18(s: GameState, need: number, why: L): number {
  const f = fin18(s);
  const ar = [...f.ar].filter((b) => b.amt > 0).sort((a, b) => a.due - b.due);
  let got = 0, cost = 0;
  for (const b of ar) {
    if (got >= need) break;
    const d = factorRate18(s, b);
    const take = Math.min(b.amt, Math.ceil((need - got) / (1 - d)));
    b.amt -= take;
    const fee = Math.round(take * d);
    settleCash(s, take, b.cat, `Antecipação de recebíveis (${whoName18(b.who).pt})`);
    cost += fee; got += take - fee;
  }
  f.ar = f.ar.filter((b) => b.amt !== 0);
  if (cost) {
    post(s, `factor18:${s.month}:${f.ar.length}:${got}`, -cost, 'finexp', 'Desconto da antecipação de recebíveis');
    notify(s, fmtL(l('{w}: antecipamos {g} de recebíveis pagando {c} de desconto.', '{w}: we advanced {g} of receivables, paying a {c} discount.'), { w: why, g: `$${Math.round(got / 100).toLocaleString('en-US')}`, c: `$${Math.round(cost / 100).toLocaleString('en-US')}` }), 'info');
  }
  return got;
}

export function settleMonth18(s: GameState): void {
  const f = fin18(s);
  const mi = mIdx18(s);
  // recebimentos
  let inAr = 0;
  for (const b of f.ar) if (b.due <= mi) { settleCash(s, b.amt, b.cat, `Recebimento: ${whoName18(b.who).pt}${b.mk ? ` (${b.mk.toUpperCase()})` : ''}`); inAr += b.amt; b.amt = 0; }
  f.ar = f.ar.filter((b) => b.amt !== 0);
  // prestação de contas: paga royalties devidos (ou atrasa, se a política deixar e o caixa não aguentar)
  for (const b of f.ap) {
    if (b.due > mi) continue;
    const act = b.act ? s.acts[b.act] : undefined;
    if (f.delayRoy && s.player.cash + b.amt < 0 && act && b.due > mi - 6) {
      b.due = mi + 2;
      f.late[act.id] = (f.late[act.id] ?? 0) + 1;
      act.trust = clamp(act.trust - 4, 0, 100);
      if (f.late[act.id] === 1 || f.late[act.id] % 3 === 0) notify(s, fmtL(l('Prestação de contas de {a} atrasada: a confiança cai e um auditor pode ser chamado.', '{a}\'s royalty statement is late: trust drops and an auditor may be called.'), { a: act.name }), 'bad');
      continue;
    }
    settleCash(s, b.amt, b.cat, `Prestação de contas: ${act?.name ?? whoName18(b.who).pt}`);
    if (act) act.cash += -b.amt;
    b.amt = 0;
  }
  f.ap = f.ap.filter((b) => b.amt !== 0);
  void inAr;
  // caixa negativo com recebíveis na fila: antecipa (com desconto) antes que o banco e os credores percebam
  if (f.auto && s.player.cash < 0 && f.ar.length) factor18(s, -s.player.cash + Math.round(-s.player.cash * 0.1), l('Caixa negativo', 'Negative cash'));
  s.flags.receivables = arTotal18(s);
  s.flags.payables18 = apTotal18(s);
}

// ---------------------------------------------------------------- câmbio por exposição real

export interface Fx18 { mk: string; rate: number; flow: number; ar: number; ap: number; cash: number; loss: number }
/** Exposição da empresa a cada moeda: receita do mês faturada lá, títulos a receber e a pagar lá, caixa na moeda da casa. */
export function fxExposure18(s: GameState, home: string): Fx18[] {
  const f = fin18(s);
  const M = f.m[mIdx18(s)] ?? {};
  const out: Fx18[] = [];
  for (const m of MARKETS) {
    const rate = fxRate18(m.id, s.year);
    if (!rate) continue;
    const flow = Math.max(0, M[`mk:${m.id}`] ?? 0);
    const ar = f.ar.filter((b) => b.mk === m.id).reduce((t, b) => t + Math.max(0, b.amt), 0);
    const ap = -f.ap.filter((b) => b.mk === m.id).reduce((t, b) => t + Math.min(0, b.amt), 0);
    const cash = m.id === home ? Math.max(0, s.player.cash) : 0;
    // fluxo do mês perde parte até ser convertido; títulos perdem pelo tempo parado; dívidas na moeda fraca protegem (hedge natural)
    const loss = Math.max(0, rate * (0.25 * flow + ar / 12 + cash * 0.3 / 12 - ap / 12));
    if (flow || ar || cash) out.push({ mk: m.id, rate, flow, ar, ap, cash, loss: Math.round(loss) });
  }
  return out;
}

/** última leitura de exposição (para o "por quê" da perda cambial na tela de Finanças) */
export const fxWhy18 = {
  set: (s: GameState, ex: Fx18[]): void => { (fin18(s) as { fx?: Fx18[] }).fx = ex; },
  get: (s: GameState): Fx18[] => (fin18(s) as { fx?: Fx18[] }).fx ?? [],
};

// ---------------------------------------------------------------- venda de catálogo: renda futura perdida

/** Renda anual estimada de um master (média da vida, com decaimento), em centavos. */
export function relYearly18(s: GameState, rel: Release): number {
  const age = Math.max(1, s.year - rel.year + 1);
  const recent = rel.weekly.slice(-12).reduce((t, u) => t + u, 0);
  const life = rel.revenue / age;
  return Math.round(Math.max(life * 0.7, rel.totalUnits ? (rel.revenue / Math.max(1, rel.totalUnits)) * recent * 4.3 : 0));
}
/** Registra a renda futura que sai com a venda e avisa o jogador (10 anos com queda de 12%/ano). */
export function noteLost18(s: GameState, relIds: string[], price: number, what: string): number {
  const f = fin18(s);
  let per = 0;
  for (const id of relIds) { const r = s.releases[id]; if (r) per += relYearly18(s, r); }
  if (!per) return 0;
  const ten = Math.round(per * (1 - Math.pow(0.88, 10)) / 0.12);
  f.lost.push({ y: s.year, m: s.month, what, cash: price, perYear: per });
  if (f.lost.length > 30) f.lost.splice(0, f.lost.length - 30);
  f.lostPerYear += per;
  const $ = (v: number) => `$${Math.round(v / 100).toLocaleString('en-US')}`;
  remember(s, 'catsale18', fmtL(l('Venda de {w}: {p} no caixa hoje; deixam de entrar ~{y}/ano (≈{t} em 10 anos).', 'Sold {w}: {p} in cash today; ~{y}/year stops coming in (≈{t} over 10 years).'), { w: what, p: $(price), y: $(per), t: $(ten) }));
  notify(s, fmtL(l('Catálogo vendido: +{p} agora, −{y}/ano de renda futura (investimento, não lucro).', 'Catalog sold: +{p} now, −{y}/year of future income (investing, not profit).'), { p: $(price), y: $(per) }), 'info');
  return per;
}

/** Caixa + recebíveis que vencem nos próximos `months` meses (liquidez de curto prazo). */
export function liquid18(s: GameState, months = 2): number {
  const lim = mIdx18(s) + months;
  return s.player.cash + fin18(s).ar.reduce((t, b) => t + (b.due <= lim ? b.amt : 0), 0);
}

// ---------------------------------------------------------------- previsão de caixa e "por quê" (para conselheiro/explain18)

/** Caixa projetado mês a mês: caixa + títulos que vencem − royalties a pagar − custo fixo mensal. */
export function cashForecast18(s: GameState, months = 6): { mi: number; cash: number; inn: number; out: number }[] {
  const f = fin18(s);
  const mi = mIdx18(s);
  const c = monthlyCosts(s);
  const burn = c.rent + c.salaries + c.outsourcing + c.loans + c.equipment;
  let cash = s.player.cash;
  const out: { mi: number; cash: number; inn: number; out: number }[] = [];
  for (let k = 1; k <= months; k++) {
    const m = mi + k;
    const inn = f.ar.filter((b) => b.due === m || (k === 1 && b.due < m)).reduce((t, b) => t + b.amt, 0);
    const pay = f.ap.filter((b) => b.due === m || (k === 1 && b.due < m)).reduce((t, b) => t + b.amt, 0);
    cash += inn + pay - burn;
    out.push({ mi: m, cash, inn, out: pay - burn });
  }
  return out;
}
/** Frases curtas que explicam lucro × caixa agora (o explain18/conselheiro pode mostrar). */
export function econWhy18(s: GameState): L[] {
  const f = fin18(s);
  const Y = f.y[s.year] ?? {};
  const why: L[] = [];
  const $ = (v: number) => `$${Math.round(v / 100).toLocaleString('en-US')}`;
  const op = opProfit18(Y), cf = Y['cf:op'] ?? 0, ar = arTotal18(s);
  if (op > 0 && cf < op * 0.6 && ar > 0) why.push(fmtL(l('Lucro operacional de {p} no ano, mas só {c} viraram caixa: {a} ainda estão com distribuidores e plataformas.', 'Operating profit of {p} this year, but only {c} became cash: {a} is still with distributors and platforms.'), { p: $(op), c: $(cf), a: $(ar) }));
  if ((Y['cf:fin'] ?? 0) > Math.max(0, op)) why.push(fmtL(l('O caixa do ano veio mais de financiamento ({v}) do que da operação.', 'This year\'s cash came more from financing ({v}) than from operations.'), { v: $(Y['cf:fin'] ?? 0) }));
  const low = cashForecast18(s, 6).find((x) => x.cash < 0);
  if (low) why.push(fmtL(l('Projeção: caixa negativo em {m} meses se nada mudar.', 'Forecast: cash goes negative in {m} months if nothing changes.'), { m: low.mi - mIdx18(s) }));
  if (f.lostPerYear > 0) why.push(fmtL(l('Vendas de catálogo tiraram ~{v}/ano de receita futura.', 'Catalog sales removed ~{v}/year of future revenue.'), { v: $(f.lostPerYear) }));
  return why;
}

registerSimHook('month', 'econ18', (s) => { settleMonth18(s); });
