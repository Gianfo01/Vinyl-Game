// Rodada 17 (F) — Vender a gravadora em vez de abandoná-la. Avaliação = catálogo (receita anual estimada ×
// múltiplo da época: 5× no pós-guerra, 9× no boom do CD, 4,5× na pirataria, 15× com juro baixo e streaming,
// 11× na ressaca de 2022+) + elenco (fama) + prestígio (prêmios, nº 1) + caixa − dívidas. Compradores com
// perfis: rival (paga para tirar você do jogo), conglomerado (paga caro, mantém tudo, cláusula longa), fundo
// (só quer o catálogo, corta elenco) e abutre (rápido, barato, quando o caixa está no vermelho). Termos
// visíveis: à vista × earn-out, não-concorrência, consultoria, cortes no elenco. Depois da venda o mundo
// continua: o selo vendido vira um rival com o seu nome; você pode abrir outro selo, comprar um, seguir
// outra carreira ou se aposentar. Também: fundos de catálogo que fazem lances por masters antigos (extra).
// Aleatoriedade: geradores próprios (semente + mês).

import { Rng, clamp } from '../../core/rng';
import { MARKETS, cityById, l, type L, type MarketId } from '../../data/world';
import { labelValuation, transferLabel } from '../business';
import { endContract } from '../contracts';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { grantHold } from '../holds17';
import type { Act, GameState, Label } from '../types';
import { fmtL, money, nextId, notify, post, remember } from '../util';
import { careers, registerLoad } from './careers12';
import { ownerOf } from './people/owner';
import { labelValue } from './stakes8';

export type BuyerKind = 'rival' | 'conglomerate' | 'fund' | 'vulture';
export interface Bid17 { id: string; kind: BuyerKind; buyer: string; name: string; price: number; cashPct: number; nonCompete: number; consult: number; cut: number; keepStaff: boolean; expires: number; why: L[] }
export interface CatBid17 { id: string; relId: string; fund: string; price: number; expires: number }
export interface Sale17 {
  bids: Bid17[]; bidY: number; bidM: number;
  sold?: { y: number; m: number; lb: string; name: string; price: number; kind: BuyerKind };
  earn?: { left: number; next: number; lb: string; base: number; pays: number };
  nc?: { until: number; markets: MarketId[] };
  consult?: { monthly: number; until: number };
  cat: CatBid17[]; catSold: number;
  log: { y: number; t: L }[];
  refounds: number;
}
declare module '../ext4' { interface Ext4 { sale17: Sale17 } }
registerExt4('sale17', () => ({ bids: [], bidY: 0, bidM: -1, cat: [], catSold: 0, log: [], refounds: 0 }));
export const sale17 = (s: GameState): Sale17 => {
  const x = s.x4 as unknown as { sale17?: Sale17 };
  return (x.sale17 ??= { bids: [], bidY: 0, bidM: -1, cat: [], catSold: 0, log: [], refounds: 0 });
};
const log = (s: GameState, t: L) => { const st = sale17(s); st.log.unshift({ y: s.year, t }); if (st.log.length > 20) st.log.pop(); };
export const hasLabel = (s: GameState): boolean => careers(s).active.includes('label');
const mineActs = (s: GameState): Act[] => {
  const subs = new Set((s.subLabels ?? []).flatMap((x) => x.roster));
  return Object.values(s.acts).filter((a) => a.owner === 'player' && !a.playerBand && !subs.has(a.id));
};

// ---------------------------------------------------------------- avaliação

/** Múltiplo da receita do catálogo por época (juros, formato dominante, pirataria). */
export function eraMultiple(s: GameState, y = s.year): { m: number; why: L } {
  const rec = s.economy.recession ? 0.85 : 1;
  const [m, why] = y < 1960 ? [5, l('pós-guerra: catálogo vale pouco além do disco novo', 'post-war: catalog is worth little beyond the new record')]
    : y < 1980 ? [6, l('LP e rádio: catálogo começa a ter valor', 'LP and radio: catalog starts to matter')]
    : y < 1990 ? [7, l('reedições em CD começam', 'CD reissues begin')]
    : y < 2000 ? [9, l('boom do CD: todo mundo recompra a discoteca', 'CD boom: everyone rebuys their collection')]
    : y < 2010 ? [4.5, l('pirataria derruba o valor das gravações', 'piracy crushes recording values')]
    : y < 2015 ? [8, l('streaming estabiliza a receita', 'streaming steadies revenue')]
    : y < 2022 ? [15, l('juro baixo + streaming: fundos pagam 15–20× pela receita', 'low rates + streaming: funds pay 15–20× revenue')]
    : [11, l('juros sobem: a festa dos catálogos esfria', 'rates rise: the catalog party cools')];
  return { m: (m as number) * rec, why: why as L };
}
/** Receita anual estimada de um lançamento (decai com a idade). */
export const relIncome = (s: GameState, relId: string): number => { const r = s.releases[relId]; return r ? r.revenue / Math.max(1, s.year - r.year + 1) : 0; };

export interface Val17 { total: number; cat: number; mult: number; roster: number; prestige: number; cash: number; debt: number; why: [L, number][] }
export function valuation17(s: GameState): Val17 {
  const rels = Object.values(s.releases).filter((r) => r.owner === 'player' && !s.acts[r.actId]?.playerBand);
  const catInc = rels.reduce((t, r) => t + relIncome(s, r.id), 0);
  const em = eraMultiple(s);
  const cat = Math.round(catInc * em.m);
  const roster = Math.round(mineActs(s).reduce((t, a) => t + a.fame * a.fame * money(s, 160) * (a.status === 'emerging' ? 1.3 : 1), 0));
  const prestige = Math.round((s.player.stats.awards + s.player.stats.number1s * 2 + s.player.stats.platinum) * money(s, 15000));
  const cash = s.player.cash;
  const debt = s.player.loans.reduce((t, x) => t + x.balance, 0) + (s.creditors ?? []).reduce((t, c) => t + Math.max(0, c.owed), 0);
  const total = Math.max(money(s, 20000), cat + roster + prestige + cash - debt);
  return { total, cat, mult: em.m, roster, prestige, cash, debt, why: [
    [fmtL(l('Catálogo: {n} lançamentos × {m}× ({w})', 'Catalog: {n} releases × {m}× ({w})'), { n: rels.length, m: Math.round(em.m * 10) / 10, w: em.why }), cat],
    [fmtL(l('Elenco: {n} artistas (fama)', 'Roster: {n} acts (fame)'), { n: mineActs(s).length }), roster],
    [l('Prestígio: prêmios, nº 1, platinas', 'Prestige: awards, No. 1s, platinum'), prestige],
    [l('Caixa (vai junto)', 'Cash (goes with it)'), cash],
    [l('Dívidas assumidas pelo comprador', 'Debts the buyer assumes'), -debt],
  ] };
}

// ---------------------------------------------------------------- propostas

const FUNDS = ['Meridian Capital', 'Northgate Partners', 'Harbor Songs Fund', 'Atlas Catalog Trust', 'Bluewater Equity', 'Cobalt Rights'];
const CONGLOS = ['Consolidated Electric', 'Pacific Entertainment Group', 'Kensai Electronics', 'Granite Spirits & Media', 'Oriental Broadcasting', 'Federal Pictures'];
const VULTS = ['Liquidators Inc.', 'Rapid Asset Recovery', 'Silverline Turnaround'];

export function makeBids(s: GameState): Bid17[] {
  const st = sale17(s);
  if (st.bidY === s.year && st.bidM === s.month) return st.bids;
  const r = Rng.fromSeed(`${s.config.seed}:sale17:${s.year}:${s.month}`);
  const v = valuation17(s);
  const out: Bid17[] = [];
  const add = (b: Omit<Bid17, 'id' | 'expires'>) => out.push({ ...b, id: `b17:${s.year}:${s.month}:${out.length}`, expires: s.week + 8, price: Math.max(money(s, 15000), Math.round(b.price)) });
  // rivais que podem pagar (ou financiar)
  const rivals = Object.values(s.labels).filter((x) => x.active && x.cash > v.total * 0.25).sort((a, b) => b.cash - a.cash).slice(0, 3);
  for (const lb of rivals.slice(0, 2)) {
    const grudge = (s.rivalries?.[lb.id] ?? 0) > 30;
    add({ kind: 'rival', buyer: lb.id, name: lb.name, price: v.total * r.float(0.88, 1.12) * (grudge ? 1.1 : 1), cashPct: 0.75, nonCompete: 3, consult: 0, cut: lb.archetype === 'empire' || grudge ? 0.3 : 0.1, keepStaff: false,
      why: [l('Concorrente direto: quer seu elenco e seu mercado.', 'Direct competitor: wants your roster and your market.'), ...(grudge ? [l('Rivalidade antiga: paga a mais para tirar você do caminho — e corta quem você protegia.', 'Old rivalry: pays extra to get you out of the way — and cuts the acts you protected.')] : [])] });
  }
  if (s.year >= 1958 && s.year < 2005) add({ kind: 'conglomerate', buyer: '', name: r.pick(CONGLOS), price: v.total * r.float(1.08, 1.3), cashPct: 1, nonCompete: 5, consult: Math.round(v.total * 0.004), cut: 0, keepStaff: true,
    why: [l('Conglomerado comprando música para a vitrine: paga caro, mantém todos e quer você como consultor — mas a cláusula de não-concorrência é longa.', 'A conglomerate buying music for its showcase: pays a lot, keeps everyone and wants you as a consultant — but the non-compete is long.')] });
  if (s.year >= 1985) add({ kind: 'fund', buyer: '', name: r.pick(FUNDS), price: (v.cat * (s.year >= 2012 ? 1.3 : 1.1) + v.roster * 0.4 + v.prestige + v.cash - v.debt) * r.float(0.95, 1.15), cashPct: 0.65, nonCompete: 2, consult: 0, cut: 0.5, keepStaff: false,
    why: [l('Fundo de investimento: paga pelo catálogo, não pelos artistas — metade do elenco será dispensada. Parte do preço é earn-out (depende do selo manter a receita).', 'Investment fund: pays for the catalog, not the artists — half the roster will be dropped. Part of the price is an earn-out (depends on the label keeping its revenue).')] });
  if (s.player.cash < 0 || s.player.insolvencyMonths > 0 || out.length === 0) add({ kind: 'vulture', buyer: '', name: r.pick(VULTS), price: Math.max(v.total * r.float(0.55, 0.75), money(s, 15000)), cashPct: 1, nonCompete: 1, consult: 0, cut: 0.7, keepStaff: false,
    why: [l('Comprador de ocasião: fecha em dias e paga à vista, mas desmonta o selo.', 'Opportunistic buyer: closes in days and pays cash, but strips the label.')] });
  st.bids = out; st.bidY = s.year; st.bidM = s.month;
  return out;
}

export const CAP_GAINS = 0.15;
/** Prévia do que cai no seu bolso agora (o earn-out vem depois). */
export function bidNet(s: GameState, b: Bid17): { now: number; later: number; tax: number } {
  const now = Math.round(b.price * b.cashPct), later = b.price - now, tax = Math.round(Math.max(0, now) * CAP_GAINS);
  return { now: now - tax, later, tax };
}

/** Quem sai se o comprador cortar: os de menor fama primeiro; empresário com cláusula de pessoa-chave leva o cliente. */
export function cutList(s: GameState, b: Bid17): { cut: Act[]; keyman: Act[] } {
  const acts = mineActs(s).sort((a, c) => a.fame - c.fame);
  const cut = acts.slice(0, Math.round(acts.length * b.cut));
  const m14 = (s.x4 as unknown as { m14?: { rep: Record<string, { m: string }> } }).m14;
  const keyman = b.kind === 'fund' || b.kind === 'vulture' ? acts.filter((a) => !cut.includes(a) && m14?.rep[a.id] && a.trust >= 55) : [];
  return { cut, keyman };
}

export function sellLabel(s: GameState, bidId: string): L | null {
  if (!hasLabel(s)) return l('Você não tem gravadora para vender.', 'You have no label to sell.');
  const st = sale17(s);
  const b = st.bids.find((x) => x.id === bidId);
  if (!b || b.expires < s.week) return l('Proposta expirada.', 'Offer expired.');
  const v = valuation17(s);
  const { cut, keyman } = cutList(s, b);
  const oldName = s.config.companyName;
  // o comprador: rival existente ou um novo selo (o seu, com outro dono)
  let lb: Label | undefined = b.buyer ? s.labels[b.buyer] : undefined;
  if (!lb) {
    const genres = [...new Set(mineActs(s).map((a) => a.genre))].slice(0, 3);
    lb = { id: nextId(s, 'lb'), name: oldName, family: b.kind === 'conglomerate' ? 'B' : 'C', city: s.config.homeCity, founded: s.config.startYear ?? s.year, focus: genres.length ? genres : ['pop'], cash: Math.max(0, v.cash), reputation: Math.round((s.player.reputation.artistic + s.player.reputation.commercial) / 2),
      roster: [], active: true, aggression: b.kind === 'fund' ? 30 : 50, strategy: b.kind === 'fund' ? 'buy_catalog' : 'develop', territories: [...s.player.territories], revenueYear: 0, revenueLastYear: s.player.revenueByYear[s.year - 1] ?? 0, procedural: true, ceo: b.name };
    s.labels[lb.id] = lb;
  } else lb.cash -= Math.round(b.price * 0.5);
  for (const a of mineActs(s)) {
    const c = a.contractId ? s.contracts[a.contractId] : undefined;
    if (cut.includes(a) || keyman.includes(a)) {
      endContract(s, a, 'terminated');
      a.trust = clamp(a.trust - 15, 0, 100);
      grantHold(s, { holder: a.id, target: 'player', kind: 'grievance', strength: 45, months: 60, src: 'sale17', text: fmtL(l('{a} foi dispensado(a) quando {c} foi vendida.', '{a} was dropped when {c} was sold.'), { a: a.name, c: oldName }) });
      continue;
    }
    if (c) c.party = lb.id;
    a.owner = lb.id;
    a.trust = clamp(a.trust - (b.kind === 'conglomerate' ? 3 : 8), 0, 100);
    if (!lb.roster.includes(a.id)) lb.roster.push(a.id);
  }
  const subs = new Set((s.subLabels ?? []).flatMap((x) => x.roster));
  for (const rel of Object.values(s.releases)) if (rel.owner === 'player' && !s.acts[rel.actId]?.playerBand && !subs.has(rel.actId)) rel.owner = lb.id;
  // dinheiro: caixa e dívidas vão com a empresa; o preço vai para o seu bolso
  if (s.player.cash) post(s, 'sale17:cash', -s.player.cash, 'acquisitions', 'Caixa transferido ao comprador');
  s.player.loans = [];
  if (s.creditors) s.creditors.length = 0;
  const net = bidNet(s, b);
  ownerOf(s).wealth += net.now;
  if (net.later > 0) st.earn = { left: net.later, next: s.year + 1, lb: lb.id, base: Math.max(1, lb.revenueLastYear), pays: 2 };
  st.nc = { until: s.year + b.nonCompete, markets: [...s.player.territories] };
  if (b.consult) st.consult = { monthly: b.consult, until: s.week + 104 };
  // estrutura que fica com você: garagem própria, sem equipe nem equipamento
  if (!b.keepStaff) for (const x of s.player.staff) notify(s, fmtL(l('{n} fica sem emprego com a venda.', '{n} loses their job in the sale.'), { n: x.name }), 'bad');
  s.player.staff = [];
  s.player.equipment = [];
  s.player.hq = 0;
  s.flags.ownBuildingHq = 0;
  s.player.territories = [];
  s.player.reputation.artists = clamp(s.player.reputation.artists - Math.round(b.cut * 20), 0, 100);
  const cs = careers(s);
  cs.active = cs.active.filter((x) => x !== 'label');
  st.sold = { y: s.year, m: s.month, lb: lb.id, name: b.name, price: b.price, kind: b.kind };
  st.bids = [];
  const t = fmtL(l('{c} é vendida para {b} por {p}. {n} artistas dispensados.', '{c} is sold to {b} for {p}. {n} acts dropped.'), { c: oldName, b: b.name, p: `$${Math.round(b.price / 100).toLocaleString('en-US')}`, n: cut.length + keyman.length });
  log(s, t);
  remember(s, 'label_sold', t, { important: true });
  emitFact(s, { kind: 'label_sold', actors: ['player', lb.id], place: s.config.homeCity, severity: 75, visibility: 'public', tags: ['deal', b.cut >= 0.5 ? 'bad' : 'good'], text: t, src: 'sale17', data: { price: Math.round(b.price / 100), kind: b.kind } });
  for (const a of keyman) notify(s, fmtL(l('{a}: o empresário acionou a cláusula de pessoa-chave e tirou o cliente do selo.', '{a}: the manager triggered the key-man clause and pulled the client.'), { a: a.name }), 'bad');
  s.player.legacy.industry = (s.player.legacy.industry ?? 0) + 3;
  return null;
}

// ---------------------------------------------------------------- depois da venda

export const minRefound = (s: GameState) => money(s, 15000);
export function refoundBlock(s: GameState, city: string): { blocked: boolean; buyout: number } {
  const st = sale17(s);
  const mk = cityById[city]?.market;
  const blocked = !!st.nc && st.nc.until >= s.year && !!mk && st.nc.markets.includes(mk);
  return { blocked, buyout: blocked ? Math.round((st.sold?.price ?? 0) * 0.2) : 0 };
}
/** Abrir um selo novo (do seu bolso). Não-concorrência: outra região ou pague a multa. */
export function refound(s: GameState, name: string, city: string, capital: number, payBuyout = false): L | null {
  if (hasLabel(s)) return l('Você já tem uma gravadora.', 'You already run a label.');
  const o = ownerOf(s);
  const nb = refoundBlock(s, city);
  if (nb.blocked && !payBuyout) return l('A cláusula de não-concorrência proíbe essa região. Escolha outra ou pague a multa.', 'The non-compete forbids that region. Pick another or pay the penalty.');
  const need = capital + (nb.blocked ? nb.buyout : 0);
  if (capital < minRefound(s)) return l('Capital inicial baixo demais.', 'Starting capital too low.');
  if (o.wealth < need) return l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.');
  if (!cityById[city]) return l('Cidade inválida.', 'Invalid city.');
  o.wealth -= need;
  if (nb.blocked) { sale17(s).nc = undefined; log(s, l('Você pagou para se livrar da não-concorrência.', 'You paid to escape the non-compete.')); }
  s.config.companyName = name.trim() || `${o.name.split(' ').pop()} Records`;
  s.config.homeCity = city;
  post(s, `sale17:found:${sale17(s).refounds}`, capital, 'investment', 'Aporte do fundador');
  s.player.territories = [cityById[city].market];
  s.player.hq = 0;
  const cs = careers(s);
  if (!cs.active.includes('label')) cs.active.push('label');
  cs.started.label = s.year;
  sale17(s).refounds += 1;
  const t = fmtL(l('{o} recomeça: funda {c} em {city}.', '{o} starts again: founds {c} in {city}.'), { o: o.name, c: s.config.companyName, city: cityById[city].name });
  log(s, t);
  emitFact(s, { kind: 'deal', actors: ['player'], place: city, severity: 50, visibility: 'public', tags: ['deal', 'good'], text: t, src: 'sale17' });
  return null;
}
export const buyPrice = (s: GameState, lb: Label): number => Math.round(labelValue(s, lb).value * 1.05);
export function buyableLabels(s: GameState): Label[] {
  return Object.values(s.labels).filter((x) => x.active && x.roster.length > 0 && x.family !== 'A').sort((a, b) => buyPrice(s, a) - buyPrice(s, b)).slice(0, 8);
}
/** Comprar um selo inteiro com o seu patrimônio (elenco, catálogo e dívidas). */
export function buyLabel17(s: GameState, labelId: string): L | null {
  if (hasLabel(s)) return l('Você já tem uma gravadora.', 'You already run a label.');
  const lb = s.labels[labelId];
  if (!lb?.active) return l('Selo indisponível.', 'Label unavailable.');
  const price = buyPrice(s, lb), o = ownerOf(s);
  if (o.wealth < price) return l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.');
  const nb = refoundBlock(s, lb.city);
  if (nb.blocked) return l('A não-concorrência ainda vale nessa região.', 'The non-compete still applies in that region.');
  o.wealth -= price;
  const cash = Math.max(0, lb.cash);
  transferLabel(s, lb, labelValuation(s, lb), price);
  if (cash) post(s, `sale17:buycash:${lb.id}`, cash, 'acquisitions', `Caixa de ${lb.name}`);
  lb.cash = 0;
  s.config.companyName = lb.name;
  s.player.territories = [...new Set([...lb.territories, cityById[lb.city]?.market ?? 'na'])] as MarketId[];
  const cs = careers(s);
  if (!cs.active.includes('label')) cs.active.push('label');
  const t = fmtL(l('{o} compra {lb} e volta ao jogo das gravadoras.', '{o} buys {lb} and is back in the label game.'), { o: o.name, lb: lb.name });
  log(s, t);
  emitFact(s, { kind: 'deal', actors: ['player', lb.id], place: lb.city, severity: 60, visibility: 'public', tags: ['deal'], text: t, src: 'sale17', data: { price: Math.round(price / 100) } });
  return null;
}

// ---------------------------------------------------------------- fundos de catálogo (extra)

export function catFundBid(s: GameState, relId: string): number {
  return Math.round(relIncome(s, relId) * eraMultiple(s).m * 1.1);
}
export function sellMaster17(s: GameState, bidId: string): L | null {
  const st = sale17(s);
  const b = st.cat.find((x) => x.id === bidId);
  const rel = b && s.releases[b.relId];
  if (!b || !rel || rel.owner !== 'player' || b.expires < s.week) return l('Lance expirado.', 'Bid expired.');
  post(s, `sale17:cat:${rel.id}`, b.price, 'asset_sales', `Master vendido: ${rel.title}`);
  const buyer = Object.values(s.labels).find((x) => x.active && x.strategy === 'buy_catalog');
  rel.owner = buyer?.id ?? 'indie';
  const a = s.acts[rel.actId];
  // vender o master tira poder de veto do artista e mexe na confiança (audit17 §3.7 #42)
  if (a && a.owner === 'player') { a.trust = clamp(a.trust - 8, 0, 100); grantHold(s, { holder: a.id, target: 'player', kind: 'grievance', strength: 25, months: 36, src: 'sale17', text: fmtL(l('{a} soube pelos jornais que "{t}" foi vendido a um fundo.', '{a} read in the papers that "{t}" was sold to a fund.'), { a: a.name, t: rel.title }) }); }
  st.cat = st.cat.filter((x) => x.id !== bidId);
  st.catSold += 1;
  const t = fmtL(l('Master de "{t}" vendido a {f} por {p}.', 'Master of "{t}" sold to {f} for {p}.'), { t: rel.title, f: b.fund, p: `$${Math.round(b.price / 100).toLocaleString('en-US')}` });
  log(s, t);
  emitFact(s, { kind: 'deal', actors: ['player', rel.actId], severity: 45, visibility: 'public', tags: ['deal', 'catalog'], text: t, src: 'sale17' });
  return null;
}

// ---------------------------------------------------------------- mês

registerLoad('sale17', (s) => { const c = sale17(s).consult; return c && c.until > s.week ? 0.12 : 0; });

registerSimHook('month', 'sale17', (s) => {
  const st = sale17(s);
  const o = ownerOf(s);
  // consultoria paga ao ex-dono
  if (st.consult && st.consult.until > s.week) o.wealth += st.consult.monthly;
  // earn-out: em janeiro, metade do restante se o selo vendido manteve ≥ 80% da receita
  if (st.earn && s.month === 0 && s.year >= st.earn.next) {
    const lb = s.labels[st.earn.lb];
    const ratio = lb ? lb.revenueLastYear / st.earn.base : 0;
    const part = Math.round(st.earn.left / st.earn.pays);
    const paid = ratio >= 0.8 ? part : ratio >= 0.5 ? Math.round(part * 0.5) : 0;
    if (paid) o.wealth += Math.round(paid * (1 - CAP_GAINS));
    log(s, fmtL(paid ? l('Earn-out: o selo vendido manteve {r}% da receita; você recebe {p}.', 'Earn-out: the sold label kept {r}% of revenue; you receive {p}.') : l('Earn-out perdido: o selo vendido caiu para {r}% da receita.', 'Earn-out lost: the sold label fell to {r}% of revenue.'), { r: Math.round(ratio * 100), p: `$${Math.round(paid / 100).toLocaleString('en-US')}` }));
    st.earn.left -= part; st.earn.pays -= 1; st.earn.next += 1;
    if (st.earn.pays <= 0) st.earn = undefined;
  }
  // sem gravadora: o caixa residual não pode afundar você (os outros negócios pagam do bolso)
  if (!hasLabel(s) && s.player.cash < 0 && o.wealth > 0) { const x = Math.min(o.wealth, -s.player.cash); o.wealth -= x; post(s, `sale17:cover:${s.month}`, x, 'investment', 'Aporte pessoal'); }
  // lances de fundos por masters antigos (mais fortes na era do streaming)
  st.cat = st.cat.filter((x) => x.expires >= s.week);
  if (hasLabel(s) && st.cat.length < 2) {
    const r = Rng.fromSeed(`${s.config.seed}:cat17:${s.year}:${s.month}`);
    const p = s.year >= 2012 ? 0.3 : s.year >= 1985 ? 0.12 : 0.05;
    const old = Object.values(s.releases).filter((x) => x.owner === 'player' && s.year - x.year >= 5 && x.revenue > money(s, 20000) && !s.acts[x.actId]?.playerBand);
    if (old.length && r.chance(p)) {
      const rel = r.pick(old);
      if (!st.cat.some((x) => x.relId === rel.id)) {
        const price = Math.round(catFundBid(s, rel.id) * r.float(0.85, 1.2));
        st.cat.push({ id: `cb17:${s.week}`, relId: rel.id, fund: r.pick(FUNDS), price, expires: s.week + 10 });
        notify(s, fmtL(l('Um fundo quer comprar o master de "{t}" por {p} (Negócios → Venda & catálogo).', 'A fund wants to buy the master of "{t}" for {p} (Business → Sale & catalog).'), { t: rel.title, p: `$${Math.round(price / 100).toLocaleString('en-US')}` }), 'info');
      }
    }
  }
});

export const MARKET_NAME = (m: MarketId): L => MARKETS.find((x) => x.id === m)?.name ?? l(m);
