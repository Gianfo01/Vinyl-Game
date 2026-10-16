// R31 · onda 3 (P / UNI-3 · B.17) — DINHEIRO PESSOAL COM REGISTRO. O caixa da empresa tem porta única (`post`, util.ts);
// o bolso do dono (`Owner.wealth`) era alterado direto em ~90 lugares, sem extrato. Agora toda mudança passa por
// `purse` (soma) ou `purseSet` (valor absoluto: começo de partida, herança, editor), que:
//   • aplica exatamente a mesma conta de antes (sem arredondar: os números do jogo não mudam);
//   • grava uma linha do extrato pessoal com pagador, dono (de quem é o bolso) e beneficiário separados;
//   • acumula totais duráveis por categoria e por ano (não somem quando o extrato corta linhas).
// `tests/r31-pessoal.test.ts` varre o código: escrita direta em `.wealth` fora deste arquivo só diminui.
//
// Bem pago pela empresa que fica com você (`drawFor`): conta como RETIRADA (pró-labore/dividendo) — a empresa lança
// `owner_draw` (financiamento, não custo) e o extrato pessoal mostra a retirada entrando e o gasto saindo, com a
// empresa como pagadora e você como dono e beneficiário. Interruptor `purse31.draws` (desligado = classificação
// antiga: o gasto entra como custo da empresa) para medir.

import { l, type L } from '../../data/world';
import { registerExt4 } from '../ext4';
import { ownerOf } from '../sys/people/owner';
import type { Owner } from '../sys/people/state';
import type { GameState } from '../types';
import { money, post } from '../util';
import { registerSwitch, sw } from './switches';
import { withTxn } from './txn';

export type PCat =
  | 'salary' | 'dividend' | 'draw' | 'capital' | 'living' | 'home' | 'goods' | 'upkeep' | 'staff' | 'leisure'
  | 'family' | 'business' | 'health' | 'vice' | 'loan' | 'invest' | 'income' | 'gift' | 'legal' | 'tax' | 'event' | 'inherit' | 'edit' | 'start';
export const PCATS: Record<PCat, L> = {
  salary: l('Pró-labore', 'Owner salary'),
  dividend: l('Dividendos', 'Dividends'),
  draw: l('Retirada da empresa', 'Draw from the company'),
  capital: l('Aporte na empresa', 'Capital into the company'),
  living: l('Custo de vida', 'Cost of living'),
  home: l('Casa', 'Home'),
  goods: l('Bens', 'Belongings'),
  upkeep: l('Manutenção de bens', 'Upkeep of belongings'),
  staff: l('Equipe pessoal', 'Personal staff'),
  leisure: l('Lazer e viagens', 'Leisure and travel'),
  family: l('Família e relações', 'Family and relationships'),
  business: l('Negócios em seu nome', 'Businesses in your name'),
  health: l('Saúde', 'Health'),
  vice: l('Vícios', 'Vices'),
  loan: l('Empréstimos pessoais', 'Personal loans'),
  invest: l('Investimentos', 'Investments'),
  income: l('Trabalhos e cachês', 'Jobs and fees'),
  gift: l('Presentes e prêmios', 'Gifts and prizes'),
  legal: l('Advogados e acordos', 'Lawyers and settlements'),
  tax: l('Impostos', 'Taxes'),
  event: l('Acasos da vida', 'Life events'),
  inherit: l('Herança e sucessão', 'Inheritance and succession'),
  edit: l('Editor', 'Editor'),
  start: l('Começo de partida', 'Game start'),
};

/** Quem paga / de quem é / quem se beneficia: 'me' (você), 'label' (sua empresa), 'ext' (terceiros), ou um id. */
export interface PTxn { w: number; y: number; amt: number; cat: PCat; src: string; payer: string; owner: string; ben: string; memo?: L }
export interface Purse31 {
  /** totais duráveis por categoria: entradas e saídas */
  tot: Partial<Record<PCat, { i: number; o: number }>>;
  /** líquido por ano e categoria */
  y: Record<number, Partial<Record<PCat, number>>>;
  /** retiradas por bem/gasto pago pela empresa (durável) */
  drawn: number;
  n: number;
  last: PTxn[];
}
export const PURSE_LAST31 = 80;
const fresh = (): Purse31 => ({ tot: {}, y: {}, drawn: 0, n: 0, last: [] });
declare module '../ext4' { interface Ext4 { purse31: Purse31 } }
registerExt4('purse31', fresh);
export function purse31(s: GameState): Purse31 {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  return (x.purse31 ??= fresh()) as Purse31;
}

registerSwitch({
  id: 'purse31.draws', def: true, scope: 'game',
  desc: l('Bem ou gasto pessoal pago com o caixa da empresa conta como retirada do dono (não como custo da empresa).',
    'A personal good or expense paid with company cash counts as an owner draw (not a company cost).'),
});

export interface PurseOpts { payer?: string; owner?: string; ben?: string; memo?: L; floor?: number; who?: Owner }

/** Gasto cujo beneficiário padrão é outra pessoa (família, presente, advogado, imposto, credor) ou a empresa (aporte). */
const BEN_EXT = new Set<PCat>(['family', 'gift', 'legal', 'tax', 'loan', 'capital']);

function log(s: GameState, amt: number, cat: PCat, src: string, o: PurseOpts): void {
  if (!amt) return;
  const st = purse31(s);
  const t = (st.tot[cat] ??= { i: 0, o: 0 });
  if (amt > 0) t.i += amt; else t.o += amt;
  const Y = (st.y[s.year] ??= {});
  Y[cat] = (Y[cat] ?? 0) + amt;
  st.n++;
  st.last.push({
    w: s.week, y: s.year, amt, cat, src,
    payer: o.payer ?? (amt > 0 ? 'ext' : 'me'),
    owner: o.owner ?? 'me',
    ben: o.ben ?? (amt > 0 || !BEN_EXT.has(cat) ? 'me' : cat === 'capital' ? 'label' : 'ext'),
    ...(o.memo ? { memo: o.memo } : {}),
  });
  if (st.last.length > PURSE_LAST31) st.last.splice(0, st.last.length - PURSE_LAST31);
}

/** Soma `amount` ao bolso do dono (negativo = gasto). `floor`: o saldo não fica abaixo dele (a diferença não aplicada
 *  não entra no extrato). Devolve o quanto de fato mudou. */
export function purse(s: GameState, amount: number, cat: PCat, src: string, o: PurseOpts = {}): number {
  const who = o.who ?? ownerOf(s);
  const before = who.wealth;
  who.wealth = o.floor === undefined ? before + amount : Math.max(o.floor, before + amount);
  const d = who.wealth - before;
  log(s, d, cat, src, o);
  return d;
}

/** Fixa o bolso num valor (começo de partida, sucessão, editor). A diferença entra no extrato. */
export function purseSet(s: GameState, value: number, cat: PCat, src: string, o: PurseOpts = {}): number {
  const who = o.who ?? ownerOf(s);
  const d = value - who.wealth;
  who.wealth = value;
  log(s, d, cat, src, o);
  return d;
}

/** A empresa paga algo que fica com você. Com `purse31.draws` ligado: retirada do dono (owner_draw, financiamento) e,
 *  no extrato pessoal, a retirada entrando e o gasto saindo (o bolso não muda). Desligado: custo da empresa na
 *  categoria antiga. */
export function drawFor(s: GameState, key: string, cost: number, cat: PCat, oldCat: string, memo: string, why?: L): void {
  if (cost <= 0) return;
  if (!sw<boolean>(s, 'purse31.draws')) { post(s, key, -cost, oldCat, memo); return; }
  withTxn({ payer: 'label', owner: 'me', beneficiary: 'me' }, () => post(s, key, -cost, 'owner_draw', `Retirada do dono: ${memo}`));
  // mesma conta da retirada comum (owner.withdraw): tirar dinheiro da empresa pesa na confiança dos artistas
  s.player.reputation.artists = Math.max(0, Math.min(100, s.player.reputation.artists - Math.min(3, cost / Math.max(1, money(s, 50000)))));
  const st = purse31(s);
  st.drawn += cost;
  purse(s, cost, 'draw', key, { payer: 'label', ben: 'me' });
  purse(s, -cost, cat, key, { payer: 'label', ben: 'me', memo: why });
}

/** Extrato: entradas, saídas e líquido do ano (ou de tudo). */
export function purseSummary(s: GameState, year?: number): { cat: PCat; amt: number }[] {
  const st = purse31(s);
  const out: { cat: PCat; amt: number }[] = [];
  if (year !== undefined) {
    const Y = st.y[year] ?? {};
    for (const k of Object.keys(Y) as PCat[]) if (Y[k]) out.push({ cat: k, amt: Y[k]! });
  } else for (const k of Object.keys(st.tot) as PCat[]) { const t = st.tot[k]!; if (t.i + t.o) out.push({ cat: k, amt: t.i + t.o }); }
  return out.sort((a, b) => a.amt - b.amt);
}

export const partyLabel31 = (who: string): L =>
  who === 'me' ? l('você', 'you') : who === 'label' ? l('sua empresa', 'your company') : who === 'ext' ? l('terceiros', 'third parties') : l('outra pessoa', 'someone else');
