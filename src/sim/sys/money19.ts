// Rodada 19 (Frente 3, onda 3 — T1 money-a): DÍVIDA E CATÁLOGO.
//  N1+J3  Falência de selo vira LEILÃO DE MASTERS (Stax 1975: o banco pediu a falência; Fantasy arrematou em 1977):
//         rivais, fundos e você dão lances. O BANCO CHAMA A DÍVIDA quando o covenant quebra (dívida > receita de 12
//         meses ou 3 trimestres seguidos no prejuízo): pagar, empenhar masters (juro +3 pp), vender masters ao fundo ou
//         aceitar a aceleração (padrão). Quebrar de novo no vermelho = pedido de falência pelo banco (e masters
//         empenhados vão a leilão).
//  N5     Direito de preferência (o artista cobre o lance quando você vende os masters dele) e "Versão do artista":
//         quem perde os masters para um dono que detesta jura regravar; os fãs escolhem um lado (fandom19) e o master
//         antigo perde demanda (rights18.rr).
//  N6     Título lastreado em catálogo (Bowie Bonds 1997, cupom 7,9%): rating (report18), cupom = juro + spread,
//         cobertura trimestral; Napster (2000) rebaixa catálogo físico, streaming (2015+) reabilita; inadimplência
//         entrega os masters lastreados aos credores (leilão).
//  M13    Juros por época (rates19) inclinam os múltiplos (sale17/rights18), o crédito e o apetite dos fundos.
// Fatos: debt_called, label_bankrupt, master_auction, rerecord_vow, rofr_used, bond_issued, bond_rating, bond_default,
// rate_shift — todos com ouvinte de efeito real (abaixo). Rng próprio `money19` (rng19).

import { clamp, Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerConseq18 } from '../decide18';
import { INSOLVENT_AT } from '../economy';
import { registerExt4, registerSimHook } from '../ext4';
import { registerExplain, type WhyPart } from '../explain18';
import { emitFact, onFact } from '../facts17';
import { exactHist, scriptedReal } from '../history15';
import { grantHold } from '../holds17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { fin18, mIdx18, netProfit18, sumP18 } from '../ledger18';
import { fundAppetite19, PUB_PREMIUM19, rate19, rateWord19 } from '../rates19';
import { rng19 } from '../rng19';
import { CLOSE19, closeLabel } from '../rivals';
import { addHeat19 } from '../rivals19';
import type { Act, GameState, Label, Release } from '../types';
import { fmtL, money, notify, playerActs, post, remember } from '../util';
import { registerDeadline, type Deadline19 } from '../calendar19';
import { bolsa } from './bolsa10';
import { schedule18 } from './decide18';
import { headline19 } from './factlink19';
import { fan18, setTeam18 } from './fans18';
import { REP_NOTES19 } from './report18';
import { r18 } from './rights18';
import { eraMultiple, relIncome, SALE19, sale17 } from './sale17';

// ---------------------------------------------------------------- estado

export interface Bid19 { who: string; name: string; amt: number; w: number }
export interface Auc19 { id: string; from: string; name: string; rels: string[]; fair: number; ask: number; bids: Bid19[]; ends: number; st: 'open' | 'sold' | 'void'; cause: 'bankrupt' | 'bank' | 'bond'; win?: string; winName?: string; price?: number; y: number }
export interface Bond19 { id: string; amt: number; left: number; coupon: number; rating: number; rels: string[]; y: number; start: number; ends: number; weak: number; miss: number; st: 'live' | 'paid' | 'default'; tech?: number }
export interface Call19 { w: number; why: L; st: 'open' | 'pledge' | 'accel' | 'paid' | 'sold' | 'petition' }
export interface Vow19 { act: string; rels: string[]; w: number; due: number; share: number; done?: boolean }
export interface Money19 {
  auc: Auc19[]; bonds: Bond19[]; call?: Call19; lien: string[]; q: number[]; rofr: Record<string, number>; vows: Vow19[];
  funds: Record<string, string>; log: { y: number; m: number; t: L }[]; seq: number; pet: number; stax?: number;
}
declare module '../ext4' { interface Ext4 { money19: Money19 } }
const fresh = (): Money19 => ({ auc: [], bonds: [], lien: [], q: [], rofr: {}, vows: [], funds: {}, log: [], seq: 0, pet: 0 });
registerExt4('money19', fresh);
export const m19 = (s: GameState): Money19 => { const x = s.x4 as unknown as { money19?: Money19 }; return (x.money19 ??= fresh()); };
const logIt = (s: GameState, t: L) => { const st = m19(s); st.log.unshift({ y: s.year, m: s.month, t }); if (st.log.length > 30) st.log.length = 30; };
const rng = (s: GameState) => rng19(s, 'money19', () => Rng.fromSeed(`${s.config.seed}|money19|${s.week}`));
const usd = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;
const isLabel = (s: GameState) => s.config.role !== 'artist';
const FUNDS19 = ['Meridian Capital', 'Harbor Songs Fund', 'Atlas Catalog Trust', 'Cobalt Rights', 'Evergreen Royalty Partners', 'Northgate Music Income'];
export const RATING19 = ['AAA', 'AA', 'A', 'BBB', 'BB', 'D'];
const SPREAD19 = [1.5, 2, 2.6, 4, 6.5, 12];
const LTV19 = [0.6, 0.55, 0.5, 0.4, 0.3, 0];

// ---------------------------------------------------------------- M13: juros e múltiplos

export interface Rates19 { rate: number; prev: number; masters: number; pub: number; appetite: number; word: L; why: L }
export function rates19(s: GameState): Rates19 {
  const em = eraMultiple(s), rate = rate19(s);
  return { rate, prev: rate19(s, s.year - 1), masters: em.m, pub: em.m * PUB_PREMIUM19, appetite: fundAppetite19(s), word: rateWord19(rate), why: em.why };
}

// ---------------------------------------------------------------- J3: covenants e o banco

export const debt19 = (s: GameState): number => s.player.loans.reduce((t, x) => t + x.balance, 0) + (s.creditors ?? []).filter((c) => c.kind === 'bank').reduce((t, c) => t + Math.max(0, c.owed), 0);
export function rev12_19(s: GameState): number {
  const F = fin18(s), m = mIdx18(s);
  let t = 0;
  for (let i = 1; i <= 12; i++) t += sumP18(F.m[m - i], 'rev:');
  return t;
}
const quarterNet = (s: GameState): number => { const F = fin18(s), m = mIdx18(s); return netProfit18(F.m[m]) + netProfit18(F.m[m - 1]) + netProfit18(F.m[m - 2]); };
export interface Cov19 { debt: number; rev: number; ratio: number; losing: number; breach: boolean; why: L[]; parts: WhyPart[] }
/** Covenants do banco: dívida ≤ 1× a receita de 12 meses; não mais que 2 trimestres seguidos no prejuízo. */
export function cov19(s: GameState): Cov19 {
  const st = m19(s), debt = debt19(s), rev = rev12_19(s);
  const months = (s.year - (s.config.startYear ?? s.year)) * 12 + s.month;
  const ratio = debt && months >= 12 ? debt / Math.max(1, rev) : 0;
  let losing = 0;
  for (let i = st.q.length - 1; i >= 0 && st.q[i] < 0; i--) losing++;
  const why: L[] = [];
  if (ratio > 1) why.push(fmtL(l('dívida de {d} acima da receita de 12 meses ({r})', 'debt of {d} above 12-month revenue ({r})'), { d: usd(debt), r: usd(rev) }));
  if (losing >= 3 && ratio > 0.5) why.push(fmtL(l('{n} trimestres seguidos no prejuízo com dívida acima de metade da receita', '{n} losing quarters in a row with debt above half of revenue'), { n: losing }));
  // carência: o banco só cobra covenant de empréstimo com 1 ano+ e de selo com 2 anos+ de vida
  const seasoned = months >= 24 && s.player.loans.some((x) => s.week - x.startWeek >= 52);
  const breach = debt > 0 && seasoned && why.length > 0;
  return { debt, rev, ratio, losing, breach, why, parts: [
    { label: l('Dívida bancária', 'Bank debt'), value: debt, fmt: 'money' },
    { label: l('Receita dos últimos 12 meses', 'Revenue, last 12 months'), value: rev, fmt: 'money' },
    { label: l('Dívida ÷ receita (limite 1,0)', 'Debt ÷ revenue (limit 1.0)'), value: Math.round(ratio * 100) / 100, fmt: 'num', tone: ratio > 1 ? 'bad' : ratio > 0.75 ? 'bad' : undefined },
    { label: l('Trimestres seguidos no prejuízo (limite 2)', 'Losing quarters in a row (limit 2)'), value: losing, fmt: 'num', tone: losing >= 2 ? 'bad' : undefined },
    { label: l('Juro básico do ano (%)', 'Base rate this year (%)'), value: rate19(s), fmt: 'num' },
  ] };
}
const pledgeable = (s: GameState): Release[] => Object.values(s.releases).filter((r) => r.owner === 'player' && !s.acts[r.actId]?.playerBand && s.year - r.year >= 1).sort((a, b) => relIncome(s, b.id) - relIncome(s, a.id));

function callDebt(s: GameState, why: L[]): void {
  const st = m19(s);
  const reason = why.length ? why.map((x) => x.pt).join('; ') : '';
  const w: L = fmtL(l('Covenant quebrado: {w}.', 'Covenant breached: {w}.'), { w: { pt: reason, en: why.map((x) => x.en).join('; ') } });
  // já em acordo (empenho ou aceleração) e no vermelho de novo: o banco pede a falência (Stax, 1975)
  if (st.call && (st.call.st === 'pledge' || st.call.st === 'accel') && s.week - st.call.w <= 52 && s.player.cash < 0) {
    st.call = { w: s.week, why: w, st: 'petition' };
    st.pet += 1;
    s.player.insolvencyMonths = Math.max(s.player.insolvencyMonths, INSOLVENT_AT - 1);
    s.flags.m19nolend = s.week + 52;
    const t = fmtL(l('O banco pede a falência de {c}: {w} Mais um mês no vermelho e o selo fecha; os masters empenhados vão a leilão.', 'The bank petitions {c} into bankruptcy: {w} One more month in the red and the label closes; pledged masters go to auction.'), { c: s.config.companyName, w });
    emitFact(s, { kind: 'debt_called', actors: ['player'], severity: 80, visibility: 'public', tags: ['money', 'bank', 'petition', 'bad'], text: t, src: 'money19' });
    notify(s, t, 'bad');
    if (st.lien.length) seize19(s, 'bank');
    return;
  }
  if (st.call && st.call.st === 'open') return;
  if (st.call && s.week - st.call.w < 26) return; // carência depois de um acordo
  st.call = { w: s.week, why: w, st: 'open' };
  s.flags.m19nolend = s.week + 26;
  const debt = debt19(s);
  const t = fmtL(l('O banco chama a dívida de {c} ({d}): {w}', 'The bank calls {c}\'s debt ({d}): {w}'), { c: s.config.companyName, d: usd(debt), w });
  emitFact(s, { kind: 'debt_called', actors: ['player'], severity: 55, visibility: 'rumor', tags: ['money', 'bank', 'bad'], text: t, src: 'money19' });
  pushInbox18(s, 'm19_call', { from: l('Gerente do banco', 'Bank manager').pt, tone: 'bad', weeks: 6, ref: { w: s.week }, subject: l('O banco chamou a dívida', 'The bank called the loan'), body: t,
    actions: [
      { id: 'pay', label: fmtL(l('Quitar tudo agora ({d})', 'Pay it all now ({d})'), { d: usd(debt) }) },
      { id: 'pledge', label: l('Empenhar masters (juro +3 pp; quebrar de novo = leilão)', 'Pledge masters (+3 pp rate; breach again = auction)') },
      { id: 'sell', label: l('Vender os 2 melhores masters a um fundo e amortizar', 'Sell the 2 best masters to a fund and pay down') },
      { id: 'accept', label: l('Aceitar a aceleração (24 meses para quitar, juro +1,5 pp)', 'Accept acceleration (24 months to repay, +1.5 pp rate)') },
    ] });
}
/** Resposta do jogador ao banco (também usada pela Caixa). */
export function answerCall19(s: GameState, how: 'pay' | 'pledge' | 'sell' | 'accept'): L {
  const st = m19(s);
  if (!st.call || st.call.st !== 'open') return l('Não há dívida chamada.', 'No called debt.');
  const debt = debt19(s);
  if (how === 'pay') {
    if (s.player.cash < debt) return answerCall19(s, 'accept');
    for (const ln of s.player.loans) { post(s, `m19:pay:${ln.id}`, -ln.balance, 'loans', 'Quitação antecipada (banco chamou)'); ln.balance = 0; }
    s.player.loans = [];
    st.call.st = 'paid';
    s.player.reputation.institutional = clamp(s.player.reputation.institutional + 2, 0, 100);
    return l('Dívida quitada: o banco volta a sorrir.', 'Debt cleared: the bank smiles again.');
  }
  if (how === 'pledge') {
    const lots = pledgeable(s).slice(0, Math.max(2, Math.ceil(pledgeable(s).length * 0.3)));
    if (!lots.length) return answerCall19(s, 'accept');
    st.lien = lots.map((r) => r.id);
    for (const ln of s.player.loans) ln.rate += 0.03;
    st.call.st = 'pledge';
    return fmtL(l('{n} masters empenhados ao banco; juro +3 pp. Outro covenant quebrado com caixa negativo = leilão.', '{n} masters pledged to the bank; rate +3 pp. Another breach with negative cash = auction.'), { n: lots.length });
  }
  if (how === 'sell') {
    const lots = pledgeable(s).slice(0, 2);
    if (!lots.length) return answerCall19(s, 'accept');
    let got = 0;
    for (const rel of lots) {
      const p = Math.round(relIncome(s, rel.id) * eraMultiple(s).m * fundAppetite19(s) * 0.7);
      got += p;
      rel.owner = 'indie';
      m19(s).funds[rel.id] = FUNDS19[rel.id.length % FUNDS19.length];
      post(s, `m19:fire:${rel.id}`, p, 'asset_sales', `Venda forçada de master: ${rel.title}`);
    }
    payDown(s, got);
    st.call.st = 'sold';
    return fmtL(l('Masters vendidos por {p} (deságio de 30%) e a dívida amortizada.', 'Masters sold for {p} (30% haircut) and the debt paid down.'), { p: usd(got) });
  }
  for (const ln of s.player.loans) {
    ln.rate += 0.015;
    const i = Math.round((ln.balance * ln.rate) / 12);
    ln.monthly = Math.max(ln.monthly, Math.round(ln.balance / 24) + i);
  }
  st.call.st = 'accel';
  return l('Aceleração aceita: as prestações sobem para quitar em 24 meses.', 'Acceleration accepted: payments rise to clear the debt in 24 months.');
}
function payDown(s: GameState, amt: number): number {
  let left = amt;
  for (const ln of s.player.loans) {
    const x = Math.min(ln.balance, left);
    if (x <= 0) continue;
    post(s, `m19:paydown:${ln.id}:${s.week}`, -x, 'loans', 'Amortização com venda de masters');
    ln.balance -= x; left -= x;
  }
  s.player.loans = s.player.loans.filter((x) => x.balance > 0);
  return amt - left;
}
function covenantQuarter(s: GameState): void {
  const st = m19(s);
  st.q.push(quarterNet(s));
  if (st.q.length > 8) st.q.shift();
  if (!isLabel(s) || !s.player.loans.length) return;
  const c = cov19(s);
  if (c.breach) callDebt(s, c.why);
}

// ---------------------------------------------------------------- N1: leilão de masters

const fairOf = (s: GameState, rels: string[]) => Math.round(rels.reduce((t, id) => t + relIncome(s, id), 0) * eraMultiple(s).m * 0.75);
export function openAuction19(s: GameState, from: string, name: string, rels: Release[], cause: Auc19['cause']): Auc19 | null {
  const ids = rels.filter((r) => r && r.totalUnits > 0).sort((a, b) => relIncome(s, b.id) - relIncome(s, a.id)).slice(0, 12).map((r) => r.id);
  const fair = fairOf(s, ids);
  if (!ids.length || fair < money(s, 4000)) return null;
  const st = m19(s);
  const a: Auc19 = { id: `au19:${++st.seq}`, from, name, rels: ids, fair, ask: Math.round(fair * 0.45), bids: [], ends: s.week + 9, st: 'open', cause, y: s.year };
  st.auc.unshift(a);
  if (st.auc.length > 16) st.auc.length = 16;
  return a;
}
export const topBid19 = (a: Auc19): number => Math.max(a.ask, ...a.bids.map((b) => b.amt));
export function bidAuc19(s: GameState, id: string, amt: number): L | null {
  const a = m19(s).auc.find((x) => x.id === id && x.st === 'open');
  if (!a) return l('Leilão encerrado.', 'Auction closed.');
  if (!isLabel(s)) return l('Só gravadoras arrematam masters.', 'Only labels buy masters.');
  if (amt <= topBid19(a)) return l('O lance precisa superar o atual.', 'The bid must beat the current one.');
  if (s.player.cash < amt) return l('Caixa insuficiente.', 'Not enough cash.');
  a.bids.push({ who: 'player', name: s.config.companyName, amt, w: s.week });
  schedule18(s, 'm19:bid', { auc: a.id, act: s.releases[a.rels[0]]?.actId ?? '' }, fmtL(l('Lance no leilão de {n}', 'Bid at the {n} auction'), { n: a.name }), l('Dar lance', 'Bid'));
  return null;
}
function auctionMonth(s: GameState, r: Rng): void {
  const st = m19(s), app = fundAppetite19(s);
  for (const a of st.auc) {
    if (a.st !== 'open') continue;
    const fair = a.fair;
    for (const lb of Object.values(s.labels)) {
      if (!lb.active || lb.id === a.from || !(lb.strategy === 'buy_catalog' || lb.family === 'A' || lb.strategy === 'stars')) continue;
      const cap = Math.min(lb.cash * 0.6, fair * (lb.strategy === 'buy_catalog' ? 1.15 : 0.95) * r.float(0.8, 1.25));
      const top = topBid19(a);
      if (cap > top * 1.03 && r.chance(0.35) && a.bids[a.bids.length - 1]?.who !== lb.id) a.bids.push({ who: lb.id, name: lb.name, amt: Math.round(Math.min(cap, top * r.float(1.03, 1.12))), w: s.week });
    }
    if (r.chance(0.3 * app)) {
      const top = topBid19(a), cap = fair * app * r.float(0.85, 1.15);
      if (cap > top * 1.03) { const f = FUNDS19[r.int(0, FUNDS19.length - 1)]; a.bids.push({ who: `fund:${f}`, name: f, amt: Math.round(Math.min(cap, top * r.float(1.04, 1.1))), w: s.week }); }
    }
    if (s.week >= a.ends) closeAuction(s, a);
  }
}
function closeAuction(s: GameState, a: Auc19): void {
  const order = [...a.bids].sort((x, y) => y.amt - x.amt);
  let win: Bid19 | undefined;
  for (const b of order) {
    if (b.who === 'player' && s.player.cash < b.amt) continue;
    if (s.labels[b.who] && s.labels[b.who].cash < b.amt * 0.5) continue;
    win = b; break;
  }
  if (!win) { a.st = 'void'; for (const id of a.rels) if (s.releases[id]) s.releases[id].owner = 'indie'; return; } // sem lance: o credor guarda as fitas
  a.st = 'sold'; a.win = win.who; a.winName = win.name; a.price = win.amt;
  for (const id of a.rels) {
    const rel = s.releases[id];
    if (!rel) continue;
    if (win.who === 'player') {
      rel.owner = 'player';
      if (!rel.live) { rel.live = true; rel.week = s.week - 60; rel.appeal *= 0.15; }
    } else if (s.labels[win.who]) rel.owner = win.who;
    else { rel.owner = 'indie'; m19(s).funds[id] = win.name; }
  }
  if (win.who === 'player') post(s, `m19:auc:${a.id}`, -win.amt, 'acquisitions', `Leilão de masters: ${a.name}`);
  else if (s.labels[win.who]) s.labels[win.who].cash -= win.amt;
  if (a.cause === 'bankrupt' && s.labels[a.from]) s.labels[a.from].cash += win.amt;
  if (a.cause === 'bank') { const paid = payDownSilent(s, win.amt); if (win.amt > paid) post(s, `m19:aucrest:${a.id}`, win.amt - paid, 'asset_sales', 'Sobra do leilão dos masters empenhados'); }
  const t = fmtL(l('Leilão dos masters de {n}: {w} arremata {k} gravações por {p} (valor justo {f}).', 'Auction of {n}\'s masters: {w} takes {k} recordings for {p} (fair value {f}).'), { n: a.name, w: win.name, k: a.rels.length, p: usd(win.amt), f: usd(a.fair) });
  logIt(s, t);
  emitFact(s, { kind: 'master_auction', actors: [win.who === 'player' ? 'player' : win.who, ...new Set(a.rels.map((id) => s.releases[id]?.actId).filter(Boolean) as string[])].slice(0, 4), severity: win.amt > money(s, 200000) ? 55 : 40, visibility: 'public', tags: ['money', 'catalog', a.cause, ...(a.bids.some((b) => b.who === 'player') ? ['player_bid'] : [])], text: t, src: 'money19', data: { auc: a.id, win: win.who, from: a.from } });
}
function payDownSilent(s: GameState, amt: number): number {
  let left = amt;
  for (const ln of s.player.loans) { const x = Math.min(ln.balance, left); ln.balance -= x; left -= x; }
  s.player.loans = s.player.loans.filter((x) => x.balance > 0);
  return amt - left;
}
/** Credor executa os masters empenhados (banco) ou lastreados (título) e leva a leilão. */
function seize19(s: GameState, cause: 'bank' | 'bond'): Auc19 | null {
  const st = m19(s);
  const ids = cause === 'bank' ? st.lien : st.bonds.find((b) => b.st === 'default' && b.rels.length)?.rels ?? [];
  const rels = ids.map((id) => s.releases[id]).filter((r) => r && r.owner === 'player');
  for (const r of rels) r.owner = 'indie'; // saem do seu catálogo já na execução
  if (cause === 'bank') st.lien = [];
  return openAuction19(s, cause === 'bank' ? 'bank' : 'bondholders', s.config.companyName, rels, cause);
}

// N1: rival quebra → leilão (substitui "catálogo vai para o mais rico")
CLOSE19.f = (s, lb) => {
  const rels = Object.values(s.releases).filter((r) => r.owner === lb.id);
  if (!rels.length) return false;
  const t = fmtL(l('{n} quebra: o banco executa a dívida e os masters vão a leilão.', '{n} goes bust: the bank forecloses and the masters go to auction.'), { n: lb.name });
  emitFact(s, { kind: 'label_bankrupt', actors: [lb.id], place: lb.city, severity: 60, visibility: 'public', tags: ['money', 'bankrupt'], text: t, src: 'money19', data: { lb: lb.id } });
  return m19(s).auc.some((a) => a.from === lb.id && a.st === 'open');
};
function npcBank(s: GameState, r: Rng): void {
  // banco pede a falência de selo NPC muito endividado (antes do limite antigo de −300 mil)
  for (const lb of Object.values(s.labels)) {
    if (!lb.active || lb.family === 'A' || lb.cash > -money(s, 150000)) continue;
    if (lb.revenueLastYear > -lb.cash * 2 || !r.chance(0.2)) continue;
    closeLabel(s, r, lb);
  }
  // modo exato / antes do início: o Union Planters Bank pede a falência da Stax em dezembro de 1975
  const stax = s.labels.x_stax ?? Object.values(s.labels).find((x) => /stax|soulsville/i.test(x.name));
  if (stax?.active && s.year === 1975 && s.month === 11 && scriptedReal(s, 1975) && !m19(s).stax) { m19(s).stax = 1; closeLabel(s, r, stax); }
}

// ---------------------------------------------------------------- N5: direito de preferência e "Versão do artista"

export function setRofr19(s: GameState, actId: string, on: boolean): L | null {
  const a = s.acts[actId];
  if (!a || a.owner !== 'player' || a.playerBand) return l('Só artistas do seu elenco.', 'Only your roster.');
  const st = m19(s);
  if (on) { st.rofr[actId] = s.week + 1; a.trust = clamp(a.trust + 4, 0, 100); schedule18(s, 'm19:rofr', { act: actId }, fmtL(l('Preferência a {a}', 'First refusal for {a}'), { a: a.name }), l('Dar direito de preferência', 'Grant first refusal')); }
  else { delete st.rofr[actId]; a.trust = clamp(a.trust - 6, 0, 100); }
  return null;
}
/** Chance de o artista jurar regravar quando os masters dele caem nas mãos de quem ele não escolheu. */
export function vowOdds19(s: GameState, a: Act): number {
  if (a.playerBand || a.status === 'retired' || a.fame < 30 || s.year < 1965) return 0;
  if (exactHist(s) && a.catalogNo && !a.owner?.startsWith('player')) return 0; // modo exato: reais só com fato documentado
  return clamp(0.12 + (a.fame - 30) / 200 + (s.year >= 2019 ? 0.3 : 0) + (a.trust < 40 ? 0.1 : 0), 0, 0.75);
}
/** Parcela dos fãs que segue o artista para a regravação (fandom19: lealdade e mobilização). */
export function sideShare19(s: GameState, actId: string): number {
  const f = fan18(s, actId, false);
  return clamp(0.25 + (f?.loy ?? 40) / 250 + (f?.mob ?? 20) / 300, 0.2, 0.75);
}
function vow(s: GameState, a: Act, rels: Release[], why: L): void {
  if (!rels.length || m19(s).vows.some((v) => v.act === a.id && !v.done)) return;
  const share = sideShare19(s, a.id), r = rng(s);
  const t = fmtL(l('{a} jura regravar {n} disco(s) antigo(s) — "Versão do artista": {w}', '{a} vows to re-record {n} old record(s) — "Artist\'s Version": {w}'), { a: a.name, n: rels.length, w: why });
  m19(s).vows.push({ act: a.id, rels: rels.map((x) => x.id), w: s.week, due: s.week + Math.round(r.float(6, 18) * 4.35), share });
  emitFact(s, { kind: 'rerecord_vow', actors: [a.id, rels[0].owner], severity: a.fame >= 60 ? 60 : 45, visibility: 'public', tags: ['rights', 'rerecord'], text: t, src: 'money19', data: { share: Math.round(share * 100) } });
}
SALE19.rofr = (s, rel) => {
  const a = s.acts[rel.actId];
  if (!a || !m19(s).rofr[a.id]) return false;
  if (a.fame < 25 && a.trust < 50) return false; // artista pequeno e desconfiado não levanta o dinheiro
  const t = fmtL(l('{a} usa o direito de preferência e compra o próprio master "{t}".', '{a} uses first refusal and buys their own master "{t}".'), { a: a.name, t: rel.title });
  emitFact(s, { kind: 'rofr_used', actors: [a.id, 'player'], severity: 45, visibility: 'public', tags: ['rights', 'good'], text: t, src: 'money19' });
  return true;
};
SALE19.sold = (s, rel, _p, rofr) => {
  const a = s.acts[rel.actId];
  if (rofr || !a || !rng(s).chance(vowOdds19(s, a))) return;
  vow(s, a, [rel], l('vendido sem consulta a um fundo', 'sold to a fund without asking'));
};
SALE19.label = (s, lbId) => {
  const lb = s.labels[lbId];
  if (!lb) return;
  const by: Record<string, Release[]> = {};
  for (const rel of Object.values(s.releases)) if (rel.owner === lbId) (by[rel.actId] ??= []).push(rel);
  for (const [aid, rels] of Object.entries(by)) {
    const a = s.acts[aid];
    if (!a) continue;
    if (m19(s).rofr[aid]) {
      const v = fairOf(s, rels.map((x) => x.id));
      for (const x of rels) x.owner = 'indie';
      lb.cash += v;
      emitFact(s, { kind: 'rofr_used', actors: [aid, 'player'], severity: 50, visibility: 'public', tags: ['rights', 'good', 'label_sale'], text: fmtL(l('{a} cobre a oferta e leva os próprios masters na venda de {c}.', '{a} matches the offer and takes their own masters in the sale of {c}.'), { a: a.name, c: lb.name }), src: 'money19' });
    } else if (!lb.roster.includes(aid) && rng(s).chance(vowOdds19(s, a))) vow(s, a, rels, fmtL(l('os masters foram vendidos junto com o selo para {b}', 'the masters were sold with the label to {b}'), { b: lb.name }));
  }
};
/** Seu artista regravou faixas de masters alheios: campanha dos fãs para migrar a audiência (fandom19). */
export function campaignable19(s: GameState): { act: Act; old: Release[] }[] {
  const out: { act: Act; old: Release[] }[] = [];
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || m19(s).vows.some((v) => v.act === id && !v.done)) continue;
    const old = new Set<Release>();
    for (const so of Object.values(s.songs)) {
      if (so.actId !== id || !so.coverOf || !so.releaseId) continue;
      const src = s.songs[so.coverOf], o = src && src.actId === id ? s.releases[src.releaseId ?? ''] : undefined;
      if (o && o.owner !== 'player') old.add(o);
    }
    if (old.size) out.push({ act: a, old: [...old] });
  }
  return out;
}
export function fanCampaign19(s: GameState, actId: string): L | null {
  const c = campaignable19(s).find((x) => x.act.id === actId);
  if (!c) return l('Lance primeiro uma "Versão do artista" de um master que é de outro selo.', 'Release an "Artist\'s Version" of a master owned by another label first.');
  vow(s, c.act, c.old, l('campanha aberta: "ouçam a minha versão"', 'open campaign: "stream my version"'));
  const v = m19(s).vows.find((x) => x.act === actId && !x.done);
  if (v) v.due = s.week + 4;
  if (s.year >= 1980) setTeam18(s, actId, true);
  schedule18(s, 'm19:campaign', { act: actId }, fmtL(l('Campanha de {a} pela regravação', '{a}\'s re-record campaign'), { a: c.act.name }), l('Chamar os fãs', 'Rally the fans'));
  return null;
}
function vowsMonth(s: GameState): void {
  const R = r18(s);
  for (const v of m19(s).vows) {
    if (v.done || s.week < v.due) continue;
    v.done = true;
    const a = s.acts[v.act];
    for (const id of v.rels) R.rr[id] = Math.min(R.rr[id] ?? 1, Math.round((1 - v.share) * 100) / 100);
    const t = fmtL(l('A "Versão do artista" de {a} chega: {p}% dos fãs migram e os masters antigos perdem demanda.', '{a}\'s "Artist\'s Version" arrives: {p}% of fans switch and the old masters lose demand.'), { a: a?.name ?? '?', p: Math.round(v.share * 100) });
    logIt(s, t);
    headline19(s, t, 2);
    if (a) a.momentum = clamp(a.momentum + 6, -100, 100);
  }
  m19(s).vows = m19(s).vows.filter((v) => !v.done || s.week - v.due < 104);
}

// ---------------------------------------------------------------- N6: título lastreado em catálogo (Bowie Bonds)

export const bondYear19 = (s: GameState): number => (exactHist(s) ? 1997 : 1990);
export const liveBond19 = (s: GameState): Bond19 | undefined => m19(s).bonds.find((b) => b.st === 'live');
/** Rating do catálogo como lastro: diversificação, idade (receita provada), concentração e risco de formato. */
export function rating19(s: GameState): { idx: number; parts: WhyPart[] } {
  const rels = pledgeable(s).filter((r) => s.year - r.year >= 3);
  const inc = rels.map((r) => relIncome(s, r.id)), tot = inc.reduce((t, x) => t + x, 0) || 1;
  const acts = new Set(rels.map((r) => r.actId)).size;
  const by: Record<string, number> = {};
  rels.forEach((r, i) => { by[r.actId] = (by[r.actId] ?? 0) + inc[i]; });
  const top = Math.max(0, ...Object.values(by)) / tot;
  const age = rels.length ? rels.reduce((t, r, i) => t + (s.year - r.year) * inc[i], 0) / tot : 0;
  const div = acts >= 6 ? -1 : acts <= 2 ? 1 : 0, conc = top > 0.5 ? 1 : 0, old = age >= 10 ? -1 : 0;
  const tech = s.year >= 1999 && s.year < 2008 ? 1 : 0;
  const idx = clamp(2 + div + conc + old + tech, 0, 4);
  return { idx, parts: [
    { label: fmtL(l('Diversificação: {n} artistas no lastro', 'Diversification: {n} acts in the pool'), { n: acts }), value: div, fmt: 'signed', tone: div > 0 ? 'bad' : div < 0 ? 'good' : undefined },
    { label: fmtL(l('Concentração: o maior artista é {p}% da renda', 'Concentration: the top act is {p}% of income'), { p: Math.round(top * 100) }), value: conc, fmt: 'signed', tone: conc ? 'bad' : undefined },
    { label: fmtL(l('Idade média ponderada: {y} anos (renda provada)', 'Weighted average age: {y} years (proven income)'), { y: Math.round(age) }), value: old, fmt: 'signed', tone: old ? 'good' : undefined },
    { label: l('Risco tecnológico (pirataria digital 1999–2007)', 'Technology risk (digital piracy 1999–2007)'), value: tech, fmt: 'signed', tone: tech ? 'bad' : undefined },
    { label: l('Juro básico + spread do rating = cupom', 'Base rate + rating spread = coupon'), value: rate19(s) + SPREAD19[idx], fmt: 'num' },
  ] };
}
export function bondTerms19(s: GameState, years = 10): { amt: number; coupon: number; idx: number; rels: Release[]; ok: L | null } {
  const rels = pledgeable(s).filter((r) => s.year - r.year >= 3);
  const { idx } = rating19(s);
  const cat = Math.round(rels.reduce((t, r) => t + relIncome(s, r.id), 0) * eraMultiple(s).m * 0.75);
  const amt = Math.round(cat * LTV19[idx] * (years >= 15 ? 1.1 : 1));
  const coupon = (rate19(s) + SPREAD19[idx]) / 100;
  const ok = s.year < bondYear19(s) ? fmtL(l('Títulos lastreados em royalties só a partir de {y}.', 'Royalty-backed bonds only from {y}.'), { y: bondYear19(s) })
    : !isLabel(s) ? l('Só a gravadora emite.', 'Only the label can issue.') : liveBond19(s) ? l('Já há um título vivo.', 'A bond is already live.')
    : amt < money(s, 50000) ? l('Catálogo com 3+ anos pequeno demais para lastro (mínimo ~$50 mil).', 'Catalog of 3+ years too small to back a bond (min ~$50k).') : null;
  return { amt, coupon, idx, rels, ok };
}
export function issueBond19(s: GameState, years = 10): L | null {
  const t = bondTerms19(s, years);
  if (t.ok) return t.ok;
  const st = m19(s);
  const b: Bond19 = { id: `bd19:${++st.seq}`, amt: t.amt, left: t.amt, coupon: t.coupon, rating: t.idx, rels: t.rels.map((r) => r.id), y: s.year, start: s.week, ends: s.week + Math.round(years * 52), weak: 0, miss: 0, st: 'live' };
  st.bonds.unshift(b);
  if (st.bonds.length > 6) st.bonds.length = 6;
  post(s, `m19:bond:${b.id}`, t.amt, 'securitization', 'Título lastreado em catálogo');
  const txt = fmtL(l('{c} lança um título de {a} lastreado em {n} masters: rating {r}, cupom {k}% por {y} anos.', '{c} issues a {a} bond backed by {n} masters: rated {r}, {k}% coupon for {y} years.'), { c: s.config.companyName, a: usd(t.amt), n: b.rels.length, r: RATING19[t.idx], k: Math.round(t.coupon * 1000) / 10, y: years });
  emitFact(s, { kind: 'bond_issued', actors: ['player'], severity: 45, visibility: 'public', tags: ['money', 'bond'], text: txt, src: 'money19', data: { amt: Math.round(t.amt / 100), r: t.idx } });
  schedule18(s, 'm19:bond', { b: b.id }, l('Título lastreado em catálogo', 'Catalog-backed bond'), fmtL(l('Emitir {a}', 'Issue {a}'), { a: usd(t.amt) }));
  return null;
}
export function repayBond19(s: GameState): L | null {
  const b = liveBond19(s);
  if (!b) return l('Nenhum título vivo.', 'No live bond.');
  const cost = Math.round(b.left * 1.02);
  if (s.player.cash < cost) return l('Caixa insuficiente para resgatar (saldo + 2%).', 'Not enough cash to redeem (balance + 2%).');
  post(s, `m19:redeem:${b.id}`, -cost, 'securitization', 'Resgate antecipado do título');
  b.left = 0; b.st = 'paid';
  return null;
}
const RAT = (i: number) => RATING19[clamp(i, 0, 5)];
function rate(s: GameState, b: Bond19, d: number, why: L, tag: string): void {
  const before = b.rating;
  b.rating = clamp(b.rating + d, 0, 5);
  if (b.rating === before) return;
  const t = fmtL(l('Agência {d} o título de {c}: {a} → {b} ({w}).', 'Agency {d} {c}\'s bond: {a} → {b} ({w}).'), { d: d > 0 ? l('rebaixa', 'downgrades') : l('eleva', 'upgrades'), c: s.config.companyName, a: RAT(before), b: RAT(b.rating), w: why });
  emitFact(s, { kind: 'bond_rating', actors: ['player'], severity: d > 0 ? 50 : 35, visibility: 'public', tags: ['money', 'bond', tag, d > 0 ? 'bad' : 'good'], text: t, src: 'money19', data: { r: b.rating, d } });
}
function bondsMonth(s: GameState): void {
  const b = liveBond19(s);
  if (!b) return;
  const term = Math.max(1, Math.round((b.ends - b.start) / 4.35));
  const prin = Math.min(b.left, Math.round(b.amt / term)), int = Math.round((b.left * b.coupon) / 12);
  if (s.player.cash < 0) b.miss += 1;
  else b.miss = 0;
  post(s, `m19:coupon:${b.id}:${s.week}`, -int, 'finexp', 'Cupom do título lastreado');
  post(s, `m19:amort:${b.id}:${s.week}`, -prin, 'securitization', 'Amortização do título lastreado');
  b.left -= prin;
  if (s.month % 3 === 2) {
    const L = s.monthLedger;
    const cat = 3 * ((L.sales ?? 0) + (L.publishing ?? 0) + (L.sync ?? 0));
    const cover = cat / Math.max(1, 3 * (prin + int));
    b.weak = cover < 1 ? b.weak + 1 : Math.max(0, b.weak - 1);
    if (b.weak >= 2) { b.weak = 0; rate(s, b, 1, fmtL(l('cobertura de {c}× no trimestre', '{c}× coverage this quarter'), { c: Math.round(cover * 100) / 100 }), 'cover'); }
  }
  if (s.month === 0) {
    if (s.year === 2000 && b.y < 2000 && !b.tech) { b.tech = 1; rate(s, b, 1, l('Napster: o lastro em discos físicos vale menos', 'Napster: physical-record collateral is worth less'), 'tech'); }
    if (s.year >= 2015 && b.tech === 1) { b.tech = 2; rate(s, b, -1, l('streaming dá vida nova ao catálogo', 'streaming gives the catalog new life'), 'tech'); }
  }
  if (b.left <= 0) {
    b.st = 'paid';
    const t = fmtL(l('{c} quita o título lastreado ({a}) sem atraso.', '{c} pays off its catalog-backed bond ({a}) on time.'), { c: s.config.companyName, a: usd(b.amt) });
    logIt(s, t); remember(s, 'bond19', t, { important: true });
    return;
  }
  if (b.miss >= 2 || b.rating >= 5) {
    b.st = 'default';
    const t = fmtL(l('{c} deixa de pagar o título lastreado: os credores executam {n} masters.', '{c} defaults on its catalog-backed bond: creditors seize {n} masters.'), { c: s.config.companyName, n: b.rels.length });
    emitFact(s, { kind: 'bond_default', actors: ['player'], severity: 70, visibility: 'public', tags: ['money', 'bond', 'bad'], text: t, src: 'money19', data: { b: b.id } });
  }
}

// ---------------------------------------------------------------- mês

registerSimHook('month', 'money19', (s) => {
  const r = rng(s), st = m19(s);
  if (s.month === 0 && Math.abs(rate19(s) - rate19(s, s.year - 1)) >= 2.5) {
    const d = rate19(s) - rate19(s, s.year - 1);
    const t = fmtL(l('Juros {d} para {r}% ({w}): os múltiplos de catálogo {m}.', 'Rates {d} to {r}% ({w}): catalog multiples {m}.'), { d: d > 0 ? l('sobem', 'rise') : l('caem', 'fall'), r: rate19(s), w: rateWord19(rate19(s)), m: d > 0 ? l('encolhem', 'shrink') : l('incham', 'swell') });
    emitFact(s, { kind: 'rate_shift', actors: ['market'], severity: 40, visibility: 'public', tags: ['money', 'rates', d > 0 ? 'up' : 'down'], text: t, src: 'money19', data: { r: rate19(s), d: Math.round(d * 10) / 10 } });
  }
  npcBank(s, r);
  auctionMonth(s, r);
  vowsMonth(s);
  bondsMonth(s);
  if (s.month % 3 === 2) covenantQuarter(s);
  if (st.call?.st === 'open' && s.week - st.call.w > 8) answerCall19(s, 'accept');
  // fundos compram quando o dinheiro é barato (M13): lance extra por master antigo seu
  const app = fundAppetite19(s), sc = sale17(s);
  if (isLabel(s) && app > 1.1 && sc.cat.length < 2 && r.chance((app - 1) * 0.25)) {
    const old = Object.values(s.releases).filter((x) => x.owner === 'player' && s.year - x.year >= 5 && x.revenue > money(s, 20000) && !s.acts[x.actId]?.playerBand && !sc.cat.some((c) => c.relId === x.id));
    if (old.length) { const rel = r.pick(old); sc.cat.push({ id: `cb19:${s.week}`, relId: rel.id, fund: r.pick(FUNDS19), price: Math.round(relIncome(s, rel.id) * eraMultiple(s).m * app), expires: s.week + 10 }); }
  }
});

// ---------------------------------------------------------------- ouvintes (efeitos reais)

onFact('debt_called', (s, f) => {
  // o boato de que o selo está quebrado corre: elenco desconfia, rival abutre fareja
  for (const id of playerActs(s)) { const a = s.acts[id]; if (a) a.trust = clamp(a.trust - (f.tags.includes('petition') ? 6 : 3), 0, 100); }
  const vult = Object.values(s.labels).filter((x) => x.active && x.cash > money(s, 500000)).sort((a, b) => b.aggression - a.aggression)[0];
  if (vult) addHeat19(s, vult.id, 5, 100);
  if (f.tags.includes('petition')) headline19(s, f.text, 3);
}, 'money19:called');
onFact('label_bankrupt', (s, f) => {
  const lb = s.labels[String(f.data?.lb ?? f.actors[0])];
  if (!lb) return;
  const a = openAuction19(s, lb.id, lb.name, Object.values(s.releases).filter((r) => r.owner === lb.id), 'bankrupt');
  if (!a) { const buyer = Object.values(s.labels).filter((x) => x.active && x.cash > money(s, 500000)).sort((x, y) => y.cash - x.cash)[0]; if (buyer) for (const r of Object.values(s.releases)) if (r.owner === lb.id) r.owner = buyer.id; return; }
  // o resto do catálogo (fora do lote) fica com o banco e sai do mercado
  for (const r of Object.values(s.releases)) if (r.owner === lb.id && !a.rels.includes(r.id)) r.owner = 'indie';
  headline19(s, f.text, 2);
  remember(s, 'label_closed', f.text, { important: true });
  if (isLabel(s)) pushInbox18(s, 'm19_auc', { from: l('Leiloeiro judicial', 'Court auctioneer').pt, ref: { auc: a.id }, weeks: 8, subject: fmtL(l('Leilão: masters de {n}', 'Auction: {n}\'s masters'), { n: lb.name }), body: fmtL(l('{k} gravações, valor justo {f}, lance mínimo {m}. Lances em Finanças › Dívida e catálogo.', '{k} recordings, fair value {f}, minimum bid {m}. Bid in Finance › Debt & catalog.'), { k: a.rels.length, f: usd(a.fair), m: usd(a.ask) }),
    actions: [{ id: 'bid', label: fmtL(l('Dar o lance mínimo +10% ({v})', 'Bid the minimum +10% ({v})'), { v: usd(Math.round(a.ask * 1.1)) }) }, { id: 'pass', label: l('Passar', 'Pass') }] });
}, 'money19:auction');
onFact('master_auction', (s, f) => {
  const win = String(f.data?.win ?? '');
  // perdeu para um rival: rivalidade esquenta; ganhou masters de artista ativo: risco de regravação
  if (f.tags.includes('player_bid') && s.labels[win]) addHeat19(s, win, 6, 100);
  if (win === 'player') {
    const a = m19(s).auc.find((x) => x.id === f.data?.auc);
    const byAct: Record<string, Release[]> = {};
    for (const id of a?.rels ?? []) { const r = s.releases[id]; if (r) (byAct[r.actId] ??= []).push(r); }
    for (const [aid, rels] of Object.entries(byAct)) { const act = s.acts[aid]; if (act && act.owner !== 'player' && rng(s).chance(vowOdds19(s, act) * 0.6)) vow(s, act, rels, l('não aceita o novo dono dos masters', 'rejects the new owner of the masters')); }
    s.player.reputation.commercial = clamp(s.player.reputation.commercial + 1, 0, 100);
  }
}, 'money19:won');
onFact('rerecord_vow', (s, f) => {
  const a = s.acts[f.actors[0]], owner = f.actors[1];
  if (!a) return;
  // fãs escolhem um lado: seu artista → time de rua; dono dos masters é você → mágoa e reputação
  if (a.owner === 'player') { a.momentum = clamp(a.momentum + 4, -100, 100); const fa = fan18(s, a.id); if (fa) fa.mob = clamp(fa.mob + 10, 0, 100); }
  if (owner === 'player') {
    s.player.reputation.artists = clamp(s.player.reputation.artists - 2, 0, 100);
    grantHold(s, { holder: a.id, target: 'player', kind: 'grievance', strength: 35, months: 48, src: 'money19', text: fmtL(l('{a} regrava para tirar os fãs dos masters que ficaram com você.', '{a} re-records to pull fans off the masters you kept.'), { a: a.name }) });
  } else if (s.labels[owner]) addHeat19(s, owner, 4, 100);
  if (a.fame >= 50) headline19(s, f.text, 2);
}, 'money19:vow');
onFact('rofr_used', (s, f) => {
  const a = s.acts[f.actors[0]];
  if (a) a.trust = clamp(a.trust + 6, 0, 100);
  s.player.reputation.artists = clamp(s.player.reputation.artists + 2, 0, 100);
  logIt(s, f.text);
}, 'money19:rofr');
const bolsaNews = (s: GameState, t: L, tone: 'good' | 'bad' | 'info') => { const b = bolsa(s); b.news.unshift({ y: s.year, m: s.month, t, tone }); if (b.news.length > 40) b.news.length = 40; };
onFact('bond_issued', (s, f) => { bolsaNews(s, f.text, 'info'); s.player.reputation.commercial = clamp(s.player.reputation.commercial + 1, 0, 100); logIt(s, f.text); }, 'money19:bond');
onFact('bond_rating', (s, f) => {
  const d = Number(f.data?.d ?? 0);
  bolsaNews(s, f.text, d > 0 ? 'bad' : 'good');
  s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2 * d, 0, 100);
  logIt(s, f.text);
}, 'money19:rating');
onFact('bond_default', (s, f) => {
  seize19(s, 'bond');
  s.player.reputation.institutional = clamp(s.player.reputation.institutional - 8, 0, 100);
  s.flags.m19nolend = s.week + 52;
  bolsaNews(s, f.text, 'bad');
  headline19(s, f.text, 3);
}, 'money19:default');
onFact('rate_shift', (s, f) => {
  // juro sobe: selos NPC endividados pagam mais; juro cai: fundos entram atrás de catálogo (lance extra acima)
  const up = f.tags.includes('up');
  for (const lb of Object.values(s.labels)) if (lb.active && lb.cash < 0) lb.cash = Math.round(lb.cash * (up ? 1.04 : 0.98));
  bolsaNews(s, f.text, up ? 'bad' : 'good');
  logIt(s, f.text);
}, 'money19:rates');

// ---------------------------------------------------------------- caixa, ecos, porquês, calendário, conselheiro

registerInboxKind('m19_call', { label: l('Banco', 'Bank'), cat: 'money', icon: 'bank', prio: 3, goto: () => ({ area: 'finance', tab: ['business-finance', 'debt19'], label: l('Dívida e catálogo', 'Debt & catalog') }),
  handle: (s, _m, act) => answerCall19(s, act as 'pay' | 'pledge' | 'sell' | 'accept') });
registerInboxKind('m19_auc', { label: l('Leilão', 'Auction'), cat: 'deals', icon: 'gavel', prio: 2, goto: () => ({ area: 'finance', tab: ['business-finance', 'debt19'], label: l('Dívida e catálogo', 'Debt & catalog') }),
  handle: (s, m, act) => {
    const a = m19(s).auc.find((x) => x.id === m.ref?.auc);
    if (!a || act !== 'bid') return l('Você passa a vez.', 'You pass.');
    return bidAuc19(s, a.id, Math.max(Math.round(a.ask * 1.1), Math.round(topBid19(a) * 1.05))) ?? l('Lance registrado.', 'Bid placed.');
  } });
registerConseq18('ib:m19_call:pay', { now: l('Dívida zerada; caixa fica curto.', 'Debt cleared; cash runs short.'), later: [{ in: [3, 9], p: 0.5, tone: 'good', hint: l('Banco lembra de quem paga em dia.', 'The bank remembers who pays on time.'), fx: (f) => { f.rep('institutional', 2); return l('O banco volta a oferecer crédito com juro melhor.', 'The bank offers credit again at a better rate.'); } }] });
registerConseq18('ib:m19_call:pledge', { now: l('Masters empenhados, juro +3 pp.', 'Masters pledged, +3 pp rate.'), later: [{ in: [6, 15], p: (s) => (s.player.cash < 0 ? 0.6 : 0.25), tone: 'bad', hint: l('Empenho é promessa com data.', 'A pledge is a promise with a date.'), when: (s) => m19(s).lien.length > 0, fx: (f) => { f.rep('commercial', -1); return l('Concorrentes sabem que seus masters estão no banco.', 'Rivals know your masters are at the bank.'); } }] });
registerConseq18('ib:m19_call:sell', { now: l('Dinheiro agora, renda futura perdida.', 'Cash now, future income lost.'), later: [{ in: [4, 12], p: 0.45, tone: 'bad', hint: l('O artista pode não gostar de saber pelos jornais.', 'The artist may not like reading it in the papers.'), fx: (f) => { f.rep('artists', -2); return l('Artistas comentam que você vende o catálogo na primeira crise.', 'Artists say you sell the catalog at the first crisis.'); } }] });
registerConseq18('ib:m19_call:accept', { now: l('Prestações sobem por 24 meses.', 'Payments rise for 24 months.'), later: [{ in: [3, 12], p: (s) => (s.player.cash < 0 ? 0.55 : 0.2), tone: 'bad', hint: l('Se o covenant quebrar de novo no vermelho, o banco pede a falência.', 'If the covenant breaks again in the red, the bank files for bankruptcy.'), fx: (f) => { f.mood('stress', 6); return l('A diretoria perde o sono com as prestações.', 'The board loses sleep over the payments.'); } }] });
registerConseq18('ib:m19_auc:bid', { later: [{ in: [2, 6], p: 0.4, tone: 'mixed', hint: l('Quem compra masters herda o humor do artista.', 'Whoever buys masters inherits the artist\'s mood.'), fx: (f) => { f.rep('commercial', 1); return l('O mercado comenta sua compra.', 'The market talks about your purchase.'); } }] });
registerConseq18('ib:m19_auc:pass', { later: [{ in: [3, 9], p: 0.3, tone: 'mixed', hint: l('Outro selo pode crescer com esse catálogo.', 'Another label may grow on that catalog.'), fx: () => l('O rival que arrematou ganhou fôlego.', 'The rival who won it gained breathing room.') }] });
registerConseq18('m19:bid', { later: [{ in: [2, 8], p: 0.35, tone: 'mixed', hint: l('Lance público vira informação para os rivais.', 'A public bid is information for rivals.'), fx: (f) => { f.rep('commercial', 1); return l('Seu lance sinaliza que você tem caixa.', 'Your bid signals you have cash.'); } }] });
registerConseq18('m19:rofr', { later: [{ in: [6, 24], p: 0.4, tone: 'good', hint: l('Artista que se sente dono do próprio trabalho fica.', 'An artist who feels they own their work stays.'), fx: (f) => { f.trust(5); return l('O artista cita a cláusula numa entrevista.', 'The artist mentions the clause in an interview.'); } }] });
registerConseq18('m19:campaign', { later: [{ in: [3, 10], p: 0.5, tone: 'good', hint: l('Fãs mobilizados viram notícia.', 'Mobilised fans make news.'), fx: (f) => { f.fans(3).momentum(4); return l('Os fãs abraçam a regravação.', 'Fans embrace the re-recording.'); } }, { in: [4, 12], p: 0.25, tone: 'bad', hint: l('O dono dos masters antigos pode revidar.', 'The old masters\' owner may hit back.'), fx: (f) => { f.mood('stress', 6); return l('O antigo selo relança a versão original com desconto.', 'The old label reissues the original at a discount.'); } }] });
registerConseq18('m19:bond', { later: [{ in: [12, 36], p: (s) => (s.year >= 1999 && s.year < 2008 ? 0.5 : 0.2), tone: 'bad', hint: l('Lastro em disco depende de como as pessoas vão ouvir música.', 'Record-backed collateral depends on how people will listen.'), fx: (f) => { f.rep('institutional', -1); return l('Analistas questionam o lastro do seu título.', 'Analysts question your bond\'s collateral.'); } }] });

registerExplain('m19.rate', (s) => {
  const r = rates19(s);
  return { title: l('Juros e múltiplos de catálogo', 'Rates and catalog multiples'), value: r.rate, fmt: 'num', parts: [
    { label: fmtL(l('Juro básico em {y} ({w})', 'Base rate in {y} ({w})'), { y: s.year, w: r.word }), value: r.rate, fmt: 'num' },
    { label: l('Múltiplo dos masters (receita líquida)', 'Masters multiple (net revenue)'), value: Math.round(r.masters * 10) / 10, fmt: 'mult' },
    { label: l('Múltiplo da edição (×1,65 sobre masters)', 'Publishing multiple (×1.65 over masters)'), value: Math.round(r.pub * 10) / 10, fmt: 'mult' },
    { label: l('Apetite dos fundos de catálogo', 'Catalog fund appetite'), value: Math.round(r.appetite * 100) / 100, fmt: 'mult', tone: r.appetite > 1 ? 'good' : 'bad' },
  ], note: fmtL(l('Época: {w}. Juro baixo infla o múltiplo e traz fundos; juro alto comprime (1981: 16,5%; 2009–2021: quase zero). Fora do modo exato, os juros derivam depois do início.', 'Era: {w}. Low rates inflate multiples and bring funds; high rates compress them (1981: 16.5%; 2009–2021: near zero). Outside exact mode, rates drift after the start.'), { w: r.why }) };
});
registerExplain('m19.cov', (s) => { const c = cov19(s); return { title: l('Covenants do banco', 'Bank covenants'), value: c.breach ? 1 : 0, fmt: 'num', parts: c.parts, note: l('Quebrou: o banco chama a dívida (pagar, empenhar, vender ou acelerar). Quebrar de novo no vermelho em 12 meses = pedido de falência.', 'Breach: the bank calls the loan (pay, pledge, sell or accelerate). Breach again in the red within 12 months = bankruptcy petition.') }; });
registerExplain('m19.rating', (s) => { const r = rating19(s), b = liveBond19(s); return { title: fmtL(l('Rating do lastro: {r}', 'Collateral rating: {r}'), { r: RATING19[b?.rating ?? r.idx] }), value: b?.rating ?? r.idx, fmt: 'num', parts: r.parts, note: l('Base A; −1 é melhor. Cobertura trimestral < 1× duas vezes rebaixa; Napster (2000) rebaixa lastro físico; streaming (2015+) reabilita.', 'Base A; −1 is better. Quarterly coverage < 1× twice downgrades; Napster (2000) downgrades physical collateral; streaming (2015+) restores it.') }; });
registerExplain('m19.auc', (s, c) => {
  const a = m19(s).auc.find((x) => x.id === c.auc);
  if (!a) return null;
  return { title: fmtL(l('Leilão: {n}', 'Auction: {n}'), { n: a.name }), value: a.fair, fmt: 'money', parts: [
    { label: l('Receita anual das gravações do lote', 'Annual revenue of the lot'), value: a.rels.reduce((t, id) => t + relIncome(s, id), 0), fmt: 'money' },
    { label: l('Múltiplo da época (com juros)', 'Era multiple (with rates)'), value: Math.round(eraMultiple(s).m * 10) / 10, fmt: 'mult' },
    { label: l('Fatia líquida do comprador', 'Buyer\'s net share'), value: 0.75, fmt: 'mult' },
    { label: l('Lance mínimo (45% do justo)', 'Minimum bid (45% of fair)'), value: a.ask, fmt: 'money' },
    { label: l('Maior lance', 'Top bid'), value: topBid19(a), fmt: 'money' },
  ], note: l('Rivais com estratégia de catálogo, conglomerados e fundos (mais fortes com juro baixo) disputam.', 'Catalog-strategy rivals, conglomerates and funds (stronger with low rates) compete.') };
});

registerDeadline('money19', (s, from, to) => {
  const out: Deadline19[] = [];
  for (const a of m19(s).auc) if (a.st === 'open' && a.ends >= from && a.ends <= to) out.push({ id: `money19:${a.id}`, w: a.ends, kind: 'money', act: isLabel(s), t: fmtL(l('Fecha o leilão dos masters de {n}', '{n} masters auction closes'), { n: a.name }), d: fmtL(l('Maior lance: {v}', 'Top bid: {v}'), { v: usd(topBid19(a)) }), goto: { area: 'finance' } });
  const b = liveBond19(s);
  if (b) { const q = s.week + ((2 - (s.month % 3) + 3) % 3) * 4 + 4; if (q >= from && q <= to) out.push({ id: `money19:cov:${b.id}`, w: q, kind: 'money', t: l('Teste trimestral de cobertura do título', 'Quarterly bond coverage test'), tone: b.weak ? 'bad' : 'info' }); }
  if (s.player.loans.length && isLabel(s)) { const q = s.week + ((2 - (s.month % 3) + 3) % 3) * 4 + 4; const c = cov19(s); if (q >= from && q <= to && (c.ratio > 0.75 || c.losing >= 2)) out.push({ id: 'money19:cov', w: q, kind: 'money', tone: 'bad', t: l('Revisão dos covenants do banco', 'Bank covenant review'), d: l('Quebrar = banco chama a dívida.', 'Breach = the bank calls the loan.') }); }
  for (const v of m19(s).vows) if (!v.done && v.due >= from && v.due <= to) out.push({ id: `money19:vow:${v.act}`, w: v.due, w0: v.due - 13, kind: 'release', t: fmtL(l('"Versão do artista" de {a}', '{a}\'s "Artist\'s Version"'), { a: s.acts[v.act]?.name ?? '?' }) });
  return out;
});

registerAdvisorTip('money19', (s) => {
  if (!isLabel(s) || !s.player.loans.length) return [];
  const c = cov19(s);
  if (c.ratio <= 0.8 && c.losing < 2) return [];
  return [{ id: 'm19-cov', level: 'warn', cat: 'cash', score: 64, text: l('Covenant do banco perto de quebrar.', 'Bank covenant close to breaking.'),
    why: [fmtL(l('Dívida ÷ receita {r} (limite 1,0); {n} trimestre(s) no prejuízo (limite 2).', 'Debt ÷ revenue {r} (limit 1.0); {n} losing quarter(s) (limit 2).'), { r: Math.round(c.ratio * 100) / 100, n: c.losing })],
    effect: l('Amortizar agora evita a chamada da dívida.', 'Paying down now avoids the loan call.'), goto: { area: 'finance' } }];
});

REP_NOTES19.push((s) => {
  const out: L[] = [];
  const r = rates19(s), b = liveBond19(s);
  out.push(fmtL(l('Juros {r}% ({w}): masters a {m}×, edição a {p}×.', 'Rates {r}% ({w}): masters at {m}×, publishing at {p}×.'), { r: r.rate, w: r.word, m: Math.round(r.masters * 10) / 10, p: Math.round(r.pub * 10) / 10 }));
  if (b) out.push(fmtL(l('Seu título lastreado: rating {r}, saldo {v}.', 'Your catalog bond: rated {r}, balance {v}.'), { r: RATING19[b.rating], v: usd(b.left) }));
  const open = m19(s).auc.filter((a) => a.st === 'open');
  if (open.length) out.push(fmtL(l('{n} leilão(ões) de masters aberto(s).', '{n} master auction(s) open.'), { n: open.length }));
  return out;
});

// usado pelo teste e pela UI
export const _test19 = { callDebt, seize19, closeAuction, covenantQuarter, vowsMonth, bondsMonth, auctionMonth };
export type { Label };
