// Rodada 19 (Frente 3, T2 "money-b") — MERCADO DE CONTRATOS, EMPRESÁRIOS E BRIGAS DE GESTÃO.
//  • N2  vender o contrato de uma estrela (Sun → RCA, 1955): lance de selo rival a qualquer momento (mais provável no aperto de caixa); vender, vender
//        com override (% das vendas futuras por 5 anos), pedir mais ou segurar. Se a estrela explode longe de você → arrependimento.
//  • M1  mercado de contratos aberto o ano todo (sem janelas de transferência; empréstimos de artista removidos na r27).
//  • M2  cláusula de saída/recompra por ato, com preço de mercado visível (fama × prazo × embalo): barata fideliza e fecha a
//        assinatura, mas o rival "paga a cláusula" e leva o astro; você também pode pagar a cláusula de um rival.
//  • N3  o empresário total (Coronel Parker): fica com 25–50% do que o artista ganha, traz cinema/TV/merch (renda certa), não
//        deixa o artista tocar fora do país (procura de shows no exterior cai) e guarda um segredo — exposto, vira escândalo;
//        a corda estica até a revolta (demitir, auditar ou aguentar).
//  • N4  disco de cumprimento de contrato (Prince × Warner): artista insatisfeito entrega lixo de propósito; engavetar, lançar,
//        processar ou liberar — e às vezes ele troca o nome por um símbolo. Na carreira de artista você mesmo pode entregar.
//  • N16 o administrador que toma os masters (Klein): a banda vota (dyn18: o mais influente puxa os amigos); acordo vende os
//        masters antigos e os prende por 35 anos (até a rescisão); brigar contra a maioria racha a banda (lineup16 + feud18).
// Modo "Vida real exata": casos reais só como crônica documentada (datas reais); empresários e administradores do jogo são
// fictícios e nenhum ato real de selo NPC é emprestado.

import { clamp, Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { countryOfCity } from '../../data/geo';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { registerExplain, type WhyPart } from '../explain18';
import { emitFact, onFact } from '../facts17';
import { exactHist, histLocked } from '../history15';
import { grantHold } from '../holds17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { langForCity, personName } from '../people';
import { rng19 } from '../rng19';
import { addHeat19, coolHeat19, rm18 } from '../rivals19';
import { scandal } from '../scandal17';
import { addStress } from '../stress17';
import { endContract } from '../contracts';
import { fileLawsuit } from '../business';
import { registerConseq18 } from '../decide18';
import type { Act, Contract, GameState, Label } from '../types';
import { fmtL, money, playerActs, post, remember } from '../util';
import { dynBand } from './dyn18';
import { headline19 } from './factlink19';
import { startFeud18 } from './feud18';
import { LINKS18, lk18 } from './links18';
import { goSolo16, l16, leaveBand16, newBand16 } from './lineup16';
import { activeMgrs, mgrName } from './managers14';
import { cashWhy20, freeCash20 } from '../oblig20';
import { joinDelegated31 } from '../deleg31';

// ---------------------------------------------------------------- estado
export interface Sold19 { act: string; lb: string; w: number; y: number; price: number; pct: number; until: number; fame0: number; n10: number; u: Record<string, number>; paid: number; regret?: 1 }
export interface Mgr19 { name: string; mid?: string; cut: number; since: number; secret: number; exposed?: 1; revolt: number; took: number; last: number; audited?: number }
export interface Tk19 { name: string; y: number; rels: string[]; until: number; done?: 1 }
export interface Mb19State { sold: Sold19[]; mgr: Record<string, Mgr19>; tk: Record<string, Tk19>; junk: Record<string, number>; cd: Record<string, number>; chron: Record<string, 1>; seq: number; log: { w: number; t: L }[] }
declare module '../ext4' { interface Ext4 { mb19: Mb19State } }
const fresh = (): Mb19State => ({ sold: [], mgr: {}, tk: {}, junk: {}, cd: {}, chron: {}, seq: 0, log: [] });
registerExt4('mb19', fresh);
export function mb19(s: GameState): Mb19State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.mb19 ??= fresh()) as Mb19State;
  for (const [k, v] of Object.entries(fresh())) (st as unknown as Record<string, unknown>)[k] ??= v;
  return st;
}
const log = (s: GameState, t: L): void => { const st = mb19(s); st.log.push({ w: s.week, t }); if (st.log.length > 30) st.log.shift(); };
const link = (s: GameState, id: string, t: L): void => { const st = lk18(s); st.log.unshift([s.week, id, t]); if (st.log.length > 40) st.log.length = 40; };
const usd = (c: number): string => `$${Math.round(c / 100).toLocaleString('en-US')}`;
const kOf = (s: GameState, a: Act): Contract | undefined => (a.contractId ? s.contracts[a.contractId] : undefined);
const live = (a?: Act): a is Act => !!a && a.status !== 'retired' && a.status !== 'split';
const cool = (s: GameState, key: string): boolean => (mb19(s).cd[key] ?? -1) > s.week;
const setCd = (s: GameState, key: string, weeks: number): void => { mb19(s).cd[key] = s.week + weeks; };
/** ato do selo do jogador com contrato próprio (não a banda do jogador) */
const labelAct = (s: GameState, a?: Act): a is Act => live(a) && a.owner === 'player' && !a.playerBand && kOf(s, a)?.party === 'player';
const N = l;

export const LINKS19MB = [
  { id: 'transfer', a: N('Mercado de contratos', 'Contract market'), b: N('Selos rivais', 'Rival labels'), how: N('A qualquer momento os rivais podem fazer lances pelos seus astros ou pagar cláusulas de saída baratas; vender esquenta a rivalidade e o elenco lembra quem foi vendido.', 'At any time rivals may bid for your stars or pay cheap exit clauses; selling heats the rivalry and the roster remembers who was sold.') },
  { id: 'colonel', a: N('Empresário total', 'Total manager'), b: N('Turnês no exterior', 'Tours abroad'), how: N('O empresário total traz cinema, TV e merch, mas não deixa o artista sair do país: a procura de shows fora de casa despenca enquanto ele manda.', 'The total manager brings film, TV and merch but keeps the artist at home: demand for shows abroad collapses while he is in charge.') },
  { id: 'takeover', a: N('Briga de gestão', 'Management fight'), b: N('Banda e masters', 'Band and masters'), how: N('Quem administra decide o destino dos masters: a banda vota puxada pelo mais influente; brigar contra a maioria racha a banda e a rixa vai a público; o acordo prende os masters por 35 anos.', 'Whoever manages decides the masters\' fate: the band votes led by its most influential member; fighting the majority splits the band and the feud goes public; the deal locks the masters for 35 years.') },
];
for (const d of LINKS19MB) if (!LINKS18.some((x) => x.id === d.id)) LINKS18.push(d);

// ---------------------------------------------------------------- valor de mercado (M1/M2)
/** Preço de mercado do contrato de um ato: fama ao quadrado × embalo × prazo restante × saldo a recuperar. */
export function value19(s: GameState, a: Act): { v: number; parts: WhyPart[] } {
  const k = kOf(s, a);
  const left = k ? Math.max(0, k.endWeek - s.week) / 52 : 0;
  const base = money(s, 4000 + a.fame * a.fame * 45);
  const mom = 1 + clamp(a.momentum, -60, 100) / 200;
  const term = 0.55 + 0.45 * Math.min(1, left / 3);
  const rec = k ? Math.round(Math.max(0, k.recoupBalance) * 0.4) : 0;
  const v = Math.round(base * mom * term + rec);
  return { v, parts: [
    { label: fmtL(l('Fama {f} (ao quadrado)', 'Fame {f} (squared)'), { f: Math.round(a.fame) }), value: base, fmt: 'money' },
    { label: l('Embalo', 'Momentum'), value: Math.round(mom * 100) / 100, fmt: 'mult', tone: mom >= 1 ? 'good' : 'bad' },
    { label: fmtL(l('Prazo restante: {y} ano(s)', 'Term left: {y} year(s)'), { y: Math.round(left * 10) / 10 }), value: Math.round(term * 100) / 100, fmt: 'mult', tone: term < 0.8 ? 'bad' : '' },
    ...(rec ? [{ label: l('Adiantamento a recuperar (o comprador assume)', 'Unrecouped advance (buyer takes it over)'), value: rec, fmt: 'money' as const }] : []),
  ] };
}
/** Cláusula de saída de um ato de selo NPC (fixa pela semente: selo agressivo pede mais). */
export function npcClause19(s: GameState, a: Act): number {
  const k = kOf(s, a), lb = a.owner ? s.labels[a.owner] : undefined;
  if (k?.exitFee) return k.exitFee;
  const h = Rng.fromSeed(`${s.config.seed}|mb19cl|${a.id}`).next();
  return Math.round(value19(s, a).v * (1.35 + (lb?.aggression ?? 50) / 150 + h * 0.4));
}

/** Move o contrato de um ato para outro dono (selo NPC ou o jogador). */
function moveAct19(s: GameState, a: Act, to: string): void {
  const k = kOf(s, a);
  if (a.owner && a.owner !== 'player') { const lb = s.labels[a.owner]; if (lb) lb.roster = lb.roster.filter((x) => x !== a.id); }
  if (k) k.party = to;
  a.owner = to;
  if (to === 'player') s.delegated[a.id] = joinDelegated31(s, a);
  else { const lb = s.labels[to]; if (lb && !lb.roster.includes(a.id)) lb.roster.push(a.id); delete s.agenda[a.id]; }
}
/** Comprador: selo ativo com caixa, preferindo quem tem o ato na mira (rivalmind18). */
function buyer19(s: GameState, a: Act, price: number, r: Rng): Label | undefined {
  const ok = Object.values(s.labels).filter((x) => x.active && x.cash >= price);
  const tgt = ok.find((x) => (rm18(s).m[x.id]?.target?.k === 'act' && rm18(s).m[x.id]?.target?.id === a.id));
  if (tgt) return tgt;
  return ok.sort((x, y) => y.cash * (1 + y.aggression / 100) - x.cash * (1 + x.aggression / 100)).slice(0, 3)[r.int(0, Math.min(2, ok.length - 1))];
}

// ---------------------------------------------------------------- N2: vender o contrato
/** Vende o contrato de um ato a um selo (override = % das vendas futuras por 5 anos). */
export function sellContract19(s: GameState, actId: string, lbId: string, price: number, pct = 0): L | null {
  const a = s.acts[actId], lb = s.labels[lbId];
  if (!labelAct(s, a) || !lb?.active) return l('Venda inválida.', 'Invalid sale.');
  lb.cash -= price;
  post(s, `mb19sell:${a.id}`, price, 'transfers', `Venda do contrato de ${a.name} a ${lb.name}`);
  moveAct19(s, a, lb.id);
  const st = mb19(s);
  st.sold.push({ act: a.id, lb: lb.id, w: s.week, y: s.year, price, pct, until: s.year + 5, fame0: a.fame, n10: a.hits, u: {}, paid: 0 });
  if (st.sold.length > 30) st.sold.shift();
  const t = fmtL(pct ? l('{c} vende o contrato de {a} a {b} por {p}, com {o}% das vendas futuras por 5 anos.', '{c} sells {a}\'s contract to {b} for {p}, keeping a {o}% override on future sales for 5 years.') : l('{c} vende o contrato de {a} a {b} por {p}.', '{c} sells {a}\'s contract to {b} for {p}.'), { c: s.config.companyName, a: a.name, b: lb.name, p: usd(price), o: Math.round(pct * 100) });
  emitFact(s, { kind: 'contract_sold', actors: [a.id, lb.id, 'player'], severity: 25 + a.fame / 3, visibility: 'public', tags: ['deal', 'transfer', ...(pct ? ['override'] : [])], text: t, src: 'moneyb19', data: { price, pct } });
  log(s, t);
  link(s, 'transfer', t);
  return null;
}

/** Lance de um selo rival (a qualquer momento; no aperto de caixa, mais provável e com desconto). */
function bids(s: GameState, r: Rng): void {
  if (cool(s, 'bid')) return;
  const crunch = s.player.cash < 0 && s.player.insolvencyMonths >= 1;
  // r22: sem janela — a chance mensal equivale às 3 janelas de antes espalhadas pelo ano
  if (!r.chance(crunch ? 0.6 : 0.075)) return;
  const stars = playerActs(s).map((id) => s.acts[id]).filter((a) => labelAct(s, a) && a.fame >= 35 && !cool(s, `bid:${a.id}`)).sort((x, y) => y.fame - x.fame);
  const a = stars[0];
  if (!a) return;
  const v = value19(s, a).v;
  const price = Math.round(v * (0.9 + r.next() * 0.25) * (crunch ? 0.85 : 1));
  const lb = buyer19(s, a, price, r);
  if (!lb) return;
  setCd(s, 'bid', 8); setCd(s, `bid:${a.id}`, 40);
  pushInbox18(s, 'mb19_bid', { from: lb.name, weeks: 4, tone: crunch ? 'bad' : 'info',
    subject: fmtL(l('{b} quer o contrato de {a}', '{b} wants {a}\'s contract'), { b: lb.name, a: a.name }),
    body: fmtL(l('Oferta: {p} pelo contrato de {a} (valor de mercado {v}). Com override: {q} agora e 5% das vendas dele por 5 anos. {c}A Sun vendeu Elvis à RCA por US$ 35 mil em 1955 — e nunca teve outro Elvis.', 'Offer: {p} for {a}\'s contract (market value {v}). With override: {q} now plus 5% of their sales for 5 years. {c}Sun sold Elvis to RCA for $35,000 in 1955 — and never had another Elvis.'),
      { p: usd(price), v: usd(v), q: usd(Math.round(price * 0.7)), a: a.name, c: crunch ? l('Seu caixa está no vermelho: é uma venda de aperto. ', 'Your cash is in the red: this is a distress sale. ') : '' }),
    ref: { act: a.id, lb: lb.id, price }, actions: [
      { id: 'sell', label: fmtL(l('Vender ({p})', 'Sell ({p})'), { p: usd(price) }) },
      { id: 'override', label: l('Vender com override (70% + 5% por 5 anos)', 'Sell with override (70% + 5% for 5 years)') },
      { id: 'counter', label: l('Pedir 25% a mais', 'Ask 25% more') },
      { id: 'keep', label: l('Segurar o astro', 'Keep the star') }] });
}
registerInboxKind('mb19_bid', { label: l('Lance por contrato', 'Contract bid'), cat: 'deals', icon: 'handshake', prio: 2, goto: () => ({ area: 'contracts19' }),
  handle: (s, m, act, r) => {
    const a = s.acts[String(m.ref?.act)], lb = s.labels[String(m.ref?.lb)], price = Number(m.ref?.price ?? 0);
    if (!labelAct(s, a) || !lb?.active) return l('O negócio caiu.', 'The deal fell through.');
    if (act === 'sell') return sellContract19(s, a.id, lb.id, price) ?? l('Vendido. O caixa respira; o elenco comenta.', 'Sold. Cash breathes; the roster talks.');
    if (act === 'override') return sellContract19(s, a.id, lb.id, Math.round(price * 0.7), 0.05) ?? l('Vendido com override: uma fatia do futuro continua sua.', 'Sold with an override: a slice of the future stays yours.');
    if (act === 'counter') {
      const p = Math.round(price * 1.25), yes = lb.cash >= p && r.chance(0.35 + lb.aggression / 250);
      if (yes) return sellContract19(s, a.id, lb.id, p) ?? fmtL(l('{b} topou {p}.', '{b} agreed to {p}.'), { b: lb.name, p: usd(p) });
      addHeat19(s, lb.id, 4, 100);
      return fmtL(l('{b} recusou e saiu irritado da mesa.', '{b} refused and left the table annoyed.'), { b: lb.name });
    }
    a.trust = clamp(a.trust + (a.trust >= 40 ? 6 : -4), 0, 100);
    return a.trust >= 40 ? l('O artista soube que você recusou: sente-se valorizado.', 'The artist heard you refused: they feel valued.') : l('O artista queria ir: confiança cai.', 'The artist wanted to go: trust drops.');
  } });

/** Override: % da receita das vendas do ato no novo selo; arrependimento se o vendido explodir. */
function overrides(s: GameState): void {
  for (const x of mb19(s).sold) {
    const a = s.acts[x.act];
    if (!a) continue;
    if (x.pct && s.year < x.until) {
      let d = 0;
      for (const id of a.releases ?? []) {
        const rel = s.releases[id];
        if (!rel || rel.owner === 'player' || rel.week < x.w) continue;
        d += Math.max(0, rel.revenue - (x.u[id] ?? 0));
        x.u[id] = rel.revenue;
      }
      const pay = Math.round(d * x.pct);
      if (pay > 0) { post(s, `mb19ovr:${x.act}`, pay, 'royalties', `Override de ${a.name}`); x.paid += pay; }
    }
    if (!x.regret && s.year <= x.y + 12 && (a.fame >= x.fame0 + 20 || a.hits >= x.n10 + 3) && a.fame >= 55) {
      x.regret = 1;
      const t = fmtL(l('{a}, vendido por {p} em {y}, virou astro em {b}. No selo, ninguém fala nisso.', '{a}, sold for {p} in {y}, became a star at {b}. At the label, nobody mentions it.'), { a: a.name, p: usd(x.price), y: x.y, b: s.labels[x.lb]?.name ?? '?' });
      emitFact(s, { kind: 'sale_regret', actors: ['player', a.id], severity: 35, visibility: 'public', tags: ['regret', 'transfer'], text: t, src: 'moneyb19' });
    }
  }
}

// ---------------------------------------------------------------- M2: cláusula de saída
export type Clause19 = 'cheap' | 'fair' | 'none';
export const CLAUSE19: Record<Clause19, { k: number; trust: number; name: L; desc: L }> = {
  cheap: { k: 0.6, trust: 8, name: l('Barata (60% do valor)', 'Cheap (60% of value)'), desc: l('O artista confia mais e assina mais fácil — mas um rival rico pode pagar e levar.', 'The artist trusts you more and signs easier — but a rich rival may pay it and take them.') },
  fair: { k: 1.3, trust: 3, name: l('Justa (130% do valor)', 'Fair (130% of value)'), desc: l('Protege o selo; quem pagar, pagou caro.', 'Protects the label; whoever pays, pays dearly.') },
  none: { k: 0, trust: -5, name: l('Sem cláusula', 'No clause'), desc: l('Contrato blindado: o artista desconfia.', 'Locked-down contract: the artist is wary.') },
};
export function setClause19(s: GameState, actId: string, c: Clause19): L | null {
  const a = s.acts[actId], k = a && kOf(s, a);
  if (!labelAct(s, a) || !k) return l('Só para atos do seu selo.', 'Only for your label\'s acts.');
  if (cool(s, `cl:${a.id}`)) return l('Mudou a cláusula há pouco: espere alguns meses.', 'Changed the clause recently: wait a few months.');
  const had = !!k.exitFee;
  k.exitFee = c === 'none' ? 0 : Math.round(value19(s, a).v * CLAUSE19[c].k);
  a.trust = clamp(a.trust + (c === 'none' && !had ? 0 : CLAUSE19[c].trust), 0, 100);
  setCd(s, `cl:${a.id}`, 26);
  return null;
}
/** A qualquer momento: rival rico paga a cláusula barata e leva o ato (chance mensal = 1/4 da antiga, de janela). */
function clausePaid(s: GameState, r: Rng): void {
  for (const id of playerActs(s)) {
    const a = s.acts[id], k = a && kOf(s, a);
    if (!labelAct(s, a) || !k?.exitFee || a.fame < 20) continue;
    const v = value19(s, a).v;
    if (k.exitFee >= v * 0.95) continue;
    const lb = Object.values(s.labels).filter((x) => x.active && x.cash >= k.exitFee! * 1.3).sort((x, y) => y.aggression - x.aggression)[0];
    if (!lb || !r.chance(clamp(0.12 + (1 - k.exitFee / v) * 0.5 + lb.aggression / 400, 0, 0.6) / 4)) continue;
    const fee = k.exitFee;
    lb.cash -= fee;
    post(s, `mb19clause:${a.id}`, fee, 'transfers', `Cláusula de saída de ${a.name} paga por ${lb.name}`);
    moveAct19(s, a, lb.id);
    const t = fmtL(l('{b} paga a cláusula de saída de {a} ({p}, valor de mercado {v}) e leva o artista.', '{b} pays {a}\'s exit clause ({p}, market value {v}) and takes the act.'), { b: lb.name, a: a.name, p: usd(fee), v: usd(v) });
    emitFact(s, { kind: 'release_clause', actors: [a.id, lb.id, 'player'], severity: 30 + a.fame / 3, visibility: 'public', tags: ['transfer', 'clause', 'poach'], text: t, src: 'moneyb19', data: { fee } });
    log(s, t); link(s, 'transfer', t);
    return;
  }
}
/** Pagar a cláusula de um ato de selo rival (a qualquer momento; garantido, mas esquenta a rivalidade). */
export function payClause19(s: GameState, actId: string): L | null {
  const a = s.acts[actId], lb = a?.owner ? s.labels[a.owner] : undefined;
  if (!live(a) || !lb || !kOf(s, a)) return l('Sem contrato rival.', 'No rival contract.');
  if (exactHist(s) && histLocked(s, a)) return l('Modo "Vida real exata": este artista segue a história real.', '"Exact real life" mode: this act follows real history.');
  const p = npcClause19(s, a);
  if (freeCash20(s) < p) return cashWhy20(s, p, l('Caixa insuficiente.', 'Not enough cash.'));
  post(s, `mb19buy:${a.id}`, -p, 'transfers', `Cláusula de ${a.name} paga a ${lb.name}`);
  lb.cash += p;
  moveAct19(s, a, 'player');
  a.trust = clamp(a.trust + 5, 0, 100);
  const t = fmtL(l('{c} paga a cláusula de {a} ({p}) e tira o artista de {b}.', '{c} pays {a}\'s clause ({p}) and takes the act from {b}.'), { c: s.config.companyName, a: a.name, p: usd(p), b: lb.name });
  emitFact(s, { kind: 'release_clause', actors: [a.id, 'player', lb.id], severity: 30 + a.fame / 3, visibility: 'public', tags: ['transfer', 'clause', 'mine'], text: t, src: 'moneyb19', data: { fee: p } });
  log(s, t);
  return null;
}

// ---------------------------------------------------------------- N3: o empresário total
const mineOrBand = (s: GameState, a?: Act): a is Act => live(a) && (a.owner === 'player' || !!a.playerBand);
function mgrFor(s: GameState, a: Act, r: Rng): { name: string; mid?: string } {
  if (!exactHist(s)) {
    const pool = activeMgrs(s).filter((m) => m.style === 'shark' || m.style === 'muscle');
    if (pool.length && r.chance(0.6)) { const m = r.pick(pool); return { name: mgrName(s, m), mid: m.id }; }
  }
  return { name: personName(r, langForCity(a.city, r)) };
}
function mgrOffer(s: GameState, r: Rng): void {
  if (s.year < 1945 || cool(s, 'mgr') || !r.chance(0.05)) return;
  const st = mb19(s);
  const a = playerActs(s).map((id) => s.acts[id]).filter((x) => mineOrBand(s, x) && x.fame >= 25 && x.fame <= 75 && !st.mgr[x.id] && !cool(s, `mgr:${x.id}`)).sort((x, y) => y.fame - x.fame)[0];
  if (!a) return;
  setCd(s, 'mgr', 26); setCd(s, `mgr:${a.id}`, 104);
  const m = mgrFor(s, a, r);
  const cut = Math.round((0.25 + r.next() * 0.25) * 100) / 100;
  pushInbox18(s, 'mb19_mgr', { from: m.name, weeks: 5,
    subject: fmtL(l('{n} quer ser o empresário exclusivo de {a}', '{n} wants to be {a}\'s exclusive manager'), { n: m.name, a: a.name }),
    body: fmtL(l('"Deixa comigo: cinema, TV, merchandising — tudo." Ele quer {c}% de tudo o que {a} ganhar e controle da carreira. Renda certa todo mês e fama em alta, mas ele não gosta de turnê fora do país e tem um passado que ninguém conhece.', '"Leave it to me: films, TV, merchandise — everything." He wants {c}% of everything {a} earns and control of the career. Steady income every month and rising fame, but he dislikes tours abroad and has a past nobody knows.'), { c: Math.round(cut * 100), a: a.name }),
    ref: { act: a.id, n: m.name, mid: m.mid ?? '', cut }, actions: [
      { id: 'accept', label: fmtL(l('Aceitar ({c}%)', 'Accept ({c}%)'), { c: Math.round(cut * 100) }) },
      { id: 'limit', label: l('Negociar teto de 25%', 'Negotiate a 25% cap') },
      { id: 'refuse', label: l('Recusar', 'Refuse') }] });
}
function signMgr(s: GameState, a: Act, name: string, mid: string | undefined, cut: number): void {
  const r = Rng.fromSeed(`${s.config.seed}|mb19sec|${a.id}|${s.week}`);
  mb19(s).mgr[a.id] = { name, ...(mid ? { mid } : {}), cut, since: s.week, secret: 30 + r.int(0, 50), revolt: 0, took: 0, last: a.cash };
  const t = fmtL(l('{n} vira o empresário total de {a}: {c}% de tudo, cinema e TV no contrato.', '{n} becomes {a}\'s total manager: {c}% of everything, films and TV in the deal.'), { n: name, a: a.name, c: Math.round(cut * 100) });
  emitFact(s, { kind: 'total_manager', actors: [a.id, 'player'], severity: 30 + a.fame / 4, visibility: 'public', tags: ['manager', 'deal'], text: t, src: 'moneyb19', data: { cut } });
  log(s, t);
}
registerInboxKind('mb19_mgr', { label: l('Empresário total', 'Total manager'), cat: 'people', icon: 'user', prio: 2, goto: (_s, m) => ({ act: String(m.ref?.act ?? '') }),
  handle: (s, m, act, r) => {
    const a = s.acts[String(m.ref?.act)];
    if (!mineOrBand(s, a)) return l('O artista já não está com você.', 'The act is no longer with you.');
    const name = String(m.ref?.n ?? '?'), mid = String(m.ref?.mid ?? '') || undefined, cut = Number(m.ref?.cut ?? 0.3);
    if (act === 'accept') { signMgr(s, a, name, mid, cut); return l('Contrato assinado. A máquina começa a girar.', 'Deal signed. The machine starts turning.'); }
    if (act === 'limit') {
      if (r.chance(0.5)) { signMgr(s, a, name, mid, 0.25); return l('Ele aceitou o teto de 25%, de cara amarrada.', 'He accepted the 25% cap, scowling.'); }
      a.trust = clamp(a.trust - 3, 0, 100);
      return l('Ele riu e foi embora: "tem quem pague".', 'He laughed and left: "others will pay".');
    }
    if (mid) grantHold(s, { holder: `e:${mid}`, target: 'player', kind: 'grievance', strength: 25, text: fmtL(l('{c} recusou {n} como empresário de {a}.', '{c} turned {n} down as {a}\'s manager.'), { c: s.config.companyName, n: name, a: a.name }), months: 36, src: 'moneyb19' });
    return l('Recusado. Ele não esquece rosto.', 'Refused. He never forgets a face.');
  } });
function mgrMonth(s: GameState, r: Rng): void {
  const st = mb19(s);
  for (const [id, m] of Object.entries(st.mgr)) {
    const a = s.acts[id];
    if (!mineOrBand(s, a)) { delete st.mgr[id]; continue; }
    const d = a.cash - m.last;
    if (d > 0) { const take = Math.round(d * m.cut); a.cash -= take; m.took += take; }
    m.last = a.cash;
    // cinema, TV e merch: renda certa para o selo e fama em alta
    post(s, `mb19mgr:${id}`, money(s, 120 + a.fame * 15), 'brands', `Cinema/TV/merch de ${a.name} (empresário)`);
    a.fame = clamp(a.fame + 0.3, 0, 100);
    m.revolt = clamp(m.revolt + (m.cut - 0.2) * 14 + (m.exposed ? 2 : 0) + (a.trust < 35 ? 1 : 0), 0, 100);
    for (const pid of a.members) { const p = s.persons[pid]; if (p) p.resentment = clamp(p.resentment + (m.cut - 0.2) * 3, 0, 100); }
    if (!m.exposed && r.chance(m.secret / 2500)) expose(s, a, m);
    if (m.revolt >= 60 && !cool(s, `rev:${id}`)) {
      setCd(s, `rev:${id}`, 26);
      pushInbox18(s, 'mb19_revolt', { from: a.name, weeks: 5, tone: 'bad',
        subject: fmtL(l('{a} não aguenta mais {n}', '{a} has had enough of {n}'), { a: a.name, n: m.name }),
        body: fmtL(l('{n} já levou {t} e controla tudo. A banda quer sair do país, quer as contas abertas, quer ar. Demitir custa 12 meses da parte dele ({p}); auditar revela quanto sumiu.', '{n} has taken {t} and controls everything. The band wants to tour abroad, wants open books, wants air. Firing costs 12 months of his cut ({p}); an audit reveals what went missing.'), { n: m.name, a: a.name, t: usd(m.took), p: usd(fireCost19(s, a)) }),
        ref: { act: a.id }, actions: [{ id: 'fire', label: l('Demitir o empresário', 'Fire the manager') }, { id: 'audit', label: l('Auditar as contas', 'Audit the books') }, { id: 'keep', label: l('Aguentar', 'Put up with it') }] });
    }
  }
}
function expose(s: GameState, a: Act, m: Mgr19): void {
  m.exposed = 1;
  m.revolt = clamp(m.revolt + 25, 0, 100);
  const t = fmtL(l('Vem à tona o passado de {n}, empresário de {a}: nome falso, dívidas e nenhum passaporte — por isso o artista nunca tocou fora do país.', '{n}, {a}\'s manager, has his past exposed: a false name, debts and no passport — which is why the act never played abroad.'), { n: m.name, a: a.name });
  emitFact(s, { kind: 'manager_exposed', actors: [a.id, 'player'], severity: 45, visibility: 'public', tags: ['bad', 'manager', 'secret_exposed'], text: t, src: 'moneyb19' });
}
export const fireCost19 = (s: GameState, a: Act): number => { const m = mb19(s).mgr[a.id]; return m ? Math.max(money(s, 3000), Math.round(m.took / Math.max(1, (s.week - m.since) / 4.35) * 12)) : 0; };
export function fireMgr19(s: GameState, actId: string): L | null {
  const a = s.acts[actId], m = mb19(s).mgr[actId];
  if (!a || !m) return l('Sem empresário total.', 'No total manager.');
  const c = fireCost19(s, a);
  if (freeCash20(s) < c) return cashWhy20(s, c, l('Caixa insuficiente para pagar a saída.', 'Not enough cash to buy him out.'));
  post(s, `mb19fire:${actId}`, -c, 'legal', `Saída do empresário de ${a.name}`);
  delete mb19(s).mgr[actId];
  a.trust = clamp(a.trust + 10, 0, 100);
  for (const pid of a.members) { const p = s.persons[pid]; if (p) p.morale = clamp(p.morale + 8, 0, 100); }
  if (m.mid) grantHold(s, { holder: `e:${m.mid}`, target: 'player', kind: 'grievance', strength: 35, text: fmtL(l('{n} foi demitido por {c}.', '{n} was fired by {c}.'), { n: m.name, c: s.config.companyName }), months: 60, src: 'moneyb19' });
  log(s, fmtL(l('{a} se livra de {n} ({p}).', '{a} gets rid of {n} ({p}).'), { a: a.name, n: m.name, p: usd(c) }));
  return null;
}
export const auditCost19 = (s: GameState): number => money(s, 2500);
export function auditMgr19(s: GameState, actId: string): L | null {
  const a = s.acts[actId], m = mb19(s).mgr[actId];
  if (!a || !m) return l('Sem empresário total.', 'No total manager.');
  if (m.audited && s.week - m.audited < 52) return l('Auditado há menos de um ano.', 'Audited less than a year ago.');
  if (freeCash20(s) < auditCost19(s)) return cashWhy20(s, auditCost19(s), l('Caixa insuficiente.', 'Not enough cash.'));
  post(s, `mb19audit:${actId}`, -auditCost19(s), 'legal', `Auditoria do empresário de ${a.name}`);
  m.audited = s.week;
  const back = Math.round(m.took * (0.15 + m.secret / 400));
  a.cash += back;
  m.revolt = clamp(m.revolt - 15, 0, 100);
  if (!m.exposed && m.secret >= 50) expose(s, a, m);
  log(s, fmtL(l('Auditoria em {n}: {p} voltam para {a}.', 'Audit on {n}: {p} returns to {a}.'), { n: m.name, p: usd(back), a: a.name }));
  return null;
}
registerInboxKind('mb19_revolt', { label: l('Revolta contra o empresário', 'Revolt against the manager'), cat: 'people', icon: 'alert', prio: 3, goto: (_s, m) => ({ act: String(m.ref?.act ?? '') }),
  handle: (s, m, act) => {
    const id = String(m.ref?.act), a = s.acts[id];
    if (!a || !mb19(s).mgr[id]) return l('Já resolvido.', 'Already settled.');
    if (act === 'fire') return fireMgr19(s, id) ?? l('Empresário fora. A banda respira.', 'Manager out. The band breathes.');
    if (act === 'audit') return auditMgr19(s, id) ?? l('Auditoria feita: parte do dinheiro volta.', 'Audit done: part of the money comes back.');
    a.trust = clamp(a.trust - 10, 0, 100);
    const k = kOf(s, a);
    if (a.trust < 15 && k?.party === 'player' && !a.playerBand) { endContract(s, a, 'left'); return l('O artista não aguentou e foi embora.', 'The act couldn\'t take it and left.'); }
    return l('Você mantém o empresário. A banda guarda.', 'You keep the manager. The band remembers.');
  } });
/** Empresário total segura o artista no país: procura de shows no exterior despenca. */
registerMod('cityDemand', 'moneyb19:colonel', (s, v, c) => {
  const a = c.act as Act | undefined, city = c.cityId as string | undefined;
  if (!a || !city || !mb19(s).mgr[a.id]) return null;
  const home = countryOfCity(a.city), here = countryOfCity(city);
  if (!home || !here || home === here) return null;
  return { value: v * 0.35, label: N('Empresário não deixa sair do país', 'Manager keeps the act at home') };
});

// ---------------------------------------------------------------- N4: disco de cumprimento de contrato
function junkOffer(s: GameState, r: Rng): void {
  if (cool(s, 'junk')) return;
  for (const id of playerActs(s)) {
    const a = s.acts[id], k = a && kOf(s, a);
    if (!labelAct(s, a) || !k || a.trust >= 25 || k.releasesOwed - k.releasesDone < 1 || k.endWeek - s.week < 26 || cool(s, `junk:${id}`) || !r.chance(0.08)) continue;
    setCd(s, 'junk', 13); setCd(s, `junk:${id}`, 52);
    pushInbox18(s, 'mb19_junk', { from: a.name, weeks: 6, tone: 'bad',
      subject: fmtL(l('{a} entregou um disco de cumprimento de contrato', '{a} delivered a contract-filler album'), { a: a.name }),
      body: fmtL(l('Faixas de improviso, ruído, uma hora de bateria eletrônica. {a} quer sair e escolheu a saída mais barata: cumprir a obrigação com lixo. Faltam {n} disco(s) no contrato. (Prince escreveu "slave" no rosto contra a Warner em 1993.)', 'Jam sketches, noise, an hour of drum machine. {a} wants out and chose the cheapest exit: fulfil the obligation with junk. {n} record(s) left on the deal. (Prince wrote "slave" on his face against Warner in 1993.)'), { a: a.name, n: k.releasesOwed - k.releasesDone }),
      ref: { act: a.id }, actions: [
        { id: 'release', label: l('Lançar assim mesmo', 'Release it anyway') },
        { id: 'sue', label: l('Processar por quebra de contrato', 'Sue for breach of contract') },
        { id: 'free', label: l('Liberar o artista (fica com os masters)', 'Release the act (keep the masters)') },
        { id: 'shelve', label: l('Engavetar e contar como entregue', 'Shelve it and count it as delivered') }] });
    return;
  }
}
function junkFact(s: GameState, a: Act, how: string, t: L): void {
  mb19(s).junk[a.id] = (mb19(s).junk[a.id] ?? 0) + 1;
  emitFact(s, { kind: 'junk_record', actors: [a.id, a.owner ?? 'player'], severity: 25 + a.fame / 4, visibility: how === 'shelved' ? 'rumor' : 'public', tags: ['contract', 'junk', how], text: t, src: 'moneyb19' });
  log(s, t);
}
/** Protesto com nome: o artista troca o nome por um símbolo (fora do modo exato). */
function nameProtest(s: GameState, a: Act, r: Rng): void {
  if (exactHist(s) || !r.chance(0.35)) return;
  const old = a.name;
  (l16(s).names[a.id] ??= []).push([s.year, old]);
  a.name = `⚲ ${old}`;
  const t = fmtL(l('{o} troca o nome por um símbolo ("⚲") em protesto contra o selo.', '{o} changes their name to a symbol ("⚲") in protest against the label.'), { o: old });
  emitFact(s, { kind: 'name_protest', actors: [a.id, a.owner ?? 'player'], severity: 35, visibility: 'public', tags: ['contract', 'protest'], text: t, src: 'moneyb19' });
}
registerInboxKind('mb19_junk', { label: l('Disco de cumprimento', 'Contract-filler album'), cat: 'decision', icon: 'disc', prio: 2, goto: (_s, m) => ({ act: String(m.ref?.act ?? '') }),
  handle: (s, m, act, r) => {
    const a = s.acts[String(m.ref?.act)], k = a && kOf(s, a);
    if (!labelAct(s, a) || !k) return l('O artista já não está com você.', 'The act is no longer with you.');
    if (act === 'release') {
      k.releasesDone += 1;
      a.fame = clamp(a.fame - 3, 0, 100); a.momentum = clamp(a.momentum - 15, -100, 100);
      a.fans.core = Math.round(a.fans.core * 1.03); a.fans.casual = Math.round(a.fans.casual * 0.92);
      s.player.reputation.artistic = clamp(s.player.reputation.artistic - 1, 0, 100);
      post(s, `mb19junk:${a.id}`, money(s, 400 + a.fame * 25), 'sales', `Disco de cumprimento de ${a.name}`);
      junkFact(s, a, 'released', fmtL(l('{c} lança o disco-lixo de {a}: a crítica ri, os fãs fiéis compram por solidariedade.', '{c} releases {a}\'s junk album: critics laugh, loyal fans buy out of solidarity.'), { c: s.config.companyName, a: a.name }));
      return l('Lançado. Ninguém sai bem na foto.', 'Released. Nobody looks good.');
    }
    if (act === 'sue') {
      fileLawsuit(s, { kind: 'contract', plaintiff: s.config.companyName, defendant: a.name, actId: a.id, claim: money(s, 8000 + a.fame * 400), odds: 0.45, text: fmtL(l('{c} processa {a} por entregar um disco feito para não vender.', '{c} sues {a} for delivering a record made not to sell.'), { c: s.config.companyName, a: a.name }) });
      a.trust = clamp(a.trust - 20, 0, 100);
      junkFact(s, a, 'sued', fmtL(l('{c} vai à Justiça contra {a} pelo disco de cumprimento.', '{c} takes {a} to court over the contract-filler album.'), { c: s.config.companyName, a: a.name }));
      nameProtest(s, a, r);
      return l('Processo aberto. O artista vai a público.', 'Lawsuit filed. The act goes public.');
    }
    if (act === 'free') {
      junkFact(s, a, 'freed', fmtL(l('{c} libera {a} do contrato e fica com os masters.', '{c} releases {a} from the contract and keeps the masters.'), { c: s.config.companyName, a: a.name }));
      endContract(s, a, 'terminated');
      s.player.reputation.artists = clamp(s.player.reputation.artists + 3, 0, 100);
      return l('Liberado. Os masters ficam; a fama de selo decente também.', 'Released. The masters stay; so does a reputation as a decent label.');
    }
    k.releasesDone += 1;
    a.trust = clamp(a.trust + 3, 0, 100);
    junkFact(s, a, 'shelved', fmtL(l('{c} engaveta o disco de cumprimento de {a} e conta como entregue.', '{c} shelves {a}\'s contract-filler album and counts it as delivered.'), { c: s.config.companyName, a: a.name }));
    if (k.releasesDone >= k.releasesOwed) { endContract(s, a, 'expired'); return l('Engavetado: com a obrigação cumprida, o artista está livre.', 'Shelved: with the obligation met, the act is free.'); }
    return l('Engavetado. Menos um disco devido.', 'Shelved. One record fewer owed.');
  } });
/** Carreira de artista: entregar um disco de cumprimento ao selo NPC (o selo engaveta, lança enterrado ou processa). */
export function deliverJunk19(s: GameState, actId: string): L | null {
  const a = s.acts[actId], k = a && kOf(s, a), lb = k ? s.labels[k.party] : undefined;
  if (!live(a) || !a.playerBand || !k || !lb) return l('Só para a sua banda com contrato em selo.', 'Only for your band under a label deal.');
  if (k.releasesOwed - k.releasesDone < 1) return l('Nenhum disco devido.', 'No records owed.');
  if (cool(s, `djunk:${a.id}`)) return l('Você acabou de entregar um: espere.', 'You just delivered one: wait.');
  setCd(s, `djunk:${a.id}`, 26);
  k.releasesDone += 1;
  const r = rng19(s, 'mb19');
  const x = r.next();
  if (x < lb.aggression / 160) {
    const c = money(s, 4000 + a.fame * 200);
    a.cash -= c;
    post(s, `mb19djs:${a.id}`, -c, 'legal', `Processo de ${lb.name} pelo disco de cumprimento`);
    junkFact(s, a, 'sued', fmtL(l('{b} processa {a} pelo disco de cumprimento e cobra {p}.', '{b} sues {a} over the contract-filler album and claims {p}.'), { b: lb.name, a: a.name, p: usd(c) }));
    nameProtest(s, a, r);
  } else if (x < 0.65) junkFact(s, a, 'shelved', fmtL(l('{b} engaveta o disco de cumprimento de {a}.', '{b} shelves {a}\'s contract-filler album.'), { b: lb.name, a: a.name }));
  else { a.fame = clamp(a.fame - 2, 0, 100); junkFact(s, a, 'released', fmtL(l('{b} lança o disco-lixo de {a} sem divulgação.', '{b} releases {a}\'s junk album with no promotion.'), { b: lb.name, a: a.name })); }
  if (k.releasesDone >= k.releasesOwed) endContract(s, a, 'expired');
  return null;
}

// ---------------------------------------------------------------- N16: o administrador que toma os masters (Klein)
/** Votação da banda (dyn18): cada um pela ambição e pelo objetivo; o mais influente puxa os amigos e afasta os desafetos. */
export function vote19(s: GameState, a: Act): { yes: string[]; no: string[]; lead?: string; why: L[] } {
  const d = dynBand(s, a);
  const sc: Record<string, number> = {};
  for (const n of d.nodes) {
    const p = s.persons[n.key.slice(2)];
    if (!p) continue;
    const h = Rng.fromSeed(`${s.config.seed}|mb19v|${p.id}`).next();
    sc[n.key] = (p.persona?.ambition ?? 50) + (p.goal === 'security' ? 15 : 0) - (p.persona?.discipline ?? 50) * 0.3 + (h - 0.5) * 30 + (p.resentment > 50 ? 8 : 0);
  }
  const lead = d.nodes[0];
  const why: L[] = [];
  if (lead && sc[lead.key] !== undefined) {
    const side = sc[lead.key] >= 40 ? 1 : -1;
    for (const f of lead.friends) if (sc[f] !== undefined) sc[f] += 15 * side;
    for (const f of lead.foes) if (sc[f] !== undefined) sc[f] -= 15 * side;
    why.push(fmtL(l('{n} (o mais influente) puxa os amigos para o lado dele.', '{n} (the most influential) pulls friends to their side.'), { n: lead.name }));
  }
  const yes = Object.keys(sc).filter((k) => sc[k] >= 40).map((k) => k.slice(2)), no = Object.keys(sc).filter((k) => sc[k] < 40).map((k) => k.slice(2));
  return { yes, no, lead: lead?.key.slice(2), why };
}
const tkRels = (s: GameState, a: Act): string[] => (a.releases ?? []).map((id) => s.releases[id]).filter((r) => r && r.owner === 'player').sort((x, y) => x.week - y.week).slice(0, 4).map((r) => r.id);
export const tkPrice19 = (s: GameState, a: Act, n: number): number => money(s, n * (2000 + a.fame * 80));
function kleinOffer(s: GameState, r: Rng): void {
  if (s.year < 1955 || cool(s, 'klein') || !r.chance(0.04)) return;
  const st = mb19(s);
  const a = playerActs(s).map((id) => s.acts[id]).filter((x) => labelAct(s, x) && x.members.length >= 3 && x.fame >= 35 && !st.tk[x.id] && !cool(s, `kl:${x.id}`) && tkRels(s, x).length >= 1).sort((x, y) => y.fame - x.fame)[0];
  if (!a) return;
  setCd(s, 'klein', 52); setCd(s, `kl:${a.id}`, 156);
  let name = personName(r, langForCity(a.city, r)), mid = '';
  const kl = !exactHist(s) ? activeMgrs(s).find((m) => m.id === 'klein') : undefined;
  if (kl && r.chance(0.7)) { name = mgrName(s, kl); mid = kl.id; }
  const v = vote19(s, a), nm = (ids: string[]) => ids.map((id) => s.persons[id]?.name ?? '?').join(', ') || '—';
  const rels = tkRels(s, a);
  pushInbox18(s, 'mb19_klein', { from: name, weeks: 6,
    subject: fmtL(l('{n} quer administrar os negócios de {a}', '{n} wants to run {a}\'s business'), { n: name, a: a.name }),
    body: fmtL(l('Promete renegociar tudo (royalty +3 pontos para a banda) e cobra em masters: quer os {k} primeiros discos de {a} por {p}. A banda está dividida — a favor: {y}; contra: {no}. Quem fica com os masters agora fica por décadas (só a rescisão de 35 anos os devolve).', 'He promises to renegotiate everything (+3 royalty points for the band) and wants payment in masters: {a}\'s first {k} records for {p}. The band is split — for: {y}; against: {no}. Whoever takes the masters now keeps them for decades (only the 35-year termination brings them back).'), { n: name, a: a.name, k: rels.length, p: usd(Math.round(tkPrice19(s, a, rels.length) * 0.6)), y: nm(v.yes), no: nm(v.no) }),
    ref: { act: a.id, n: name, mid }, actions: [
      { id: 'deal', label: l('Fechar com ele (vende os masters)', 'Deal with him (sell the masters)') },
      { id: 'fight', label: l('Apoiar o outro lado da banda', 'Back the other side of the band') },
      { id: 'unanimous', label: l('Exigir unanimidade', 'Require unanimity') }] });
}
function takeover(s: GameState, a: Act, name: string, price: number): void {
  const rels = tkRels(s, a), k = kOf(s, a);
  for (const id of rels) s.releases[id].owner = 'indie';
  post(s, `mb19tk:${a.id}`, price, 'asset_sales', `Masters de ${a.name} vendidos a ${name}`);
  if (k) k.royalty = Math.min(0.5, k.royalty + 0.03);
  mb19(s).tk[a.id] = { name, y: s.year, rels, until: s.year + 35 };
  const v = vote19(s, a);
  const t = fmtL(l('{n} assume os negócios de {a} e leva {k} master(s) — presos até {y}.', '{n} takes over {a}\'s business and takes {k} master(s) — locked until {y}.'), { n: name, a: a.name, k: rels.length, y: s.year + 35 });
  emitFact(s, { kind: 'mgmt_takeover', actors: [a.id, 'player', ...v.no], severity: 35 + a.fame / 4, visibility: 'public', tags: ['manager', 'masters', 'deal'], text: t, src: 'moneyb19', data: { n: rels.length } });
  log(s, t); link(s, 'takeover', t);
}
/** A minoria sai: nova banda (2+) ou carreira solo, e a rixa vai a público. */
function splitBand(s: GameState, a: Act, leave: string[], name: string, r: Rng): Act | undefined {
  const ps = leave.map((id) => s.persons[id]).filter((p) => p?.alive);
  if (!ps.length || ps.length >= a.members.length) return undefined;
  for (const p of ps) leaveBand16(s, a, p, 'feud');
  const nb = ps.length >= 2 ? newBand16(s, r, ps[0], a, ps.slice(1)) : goSolo16(s, r, ps[0], a);
  const t = fmtL(l('A briga por {n} racha {a}: {p} sai(em) e forma(m) {b}.', 'The fight over {n} splits {a}: {p} leave(s) and form(s) {b}.'), { n: name, a: a.name, p: ps.map((p) => p.name).join(', '), b: nb.name });
  emitFact(s, { kind: 'mgmt_split', actors: [a.id, nb.id, 'player'], severity: 45 + a.fame / 4, visibility: 'public', tags: ['split', 'manager', 'feud'], text: t, src: 'moneyb19' });
  log(s, t); link(s, 'takeover', t);
  return nb;
}
registerInboxKind('mb19_klein', { label: l('Briga de gestão', 'Management fight'), cat: 'decision', icon: 'briefcase', prio: 2, goto: (_s, m) => ({ act: String(m.ref?.act ?? '') }),
  handle: (s, m, act, r) => {
    const a = s.acts[String(m.ref?.act)], name = String(m.ref?.n ?? '?'), mid = String(m.ref?.mid ?? '');
    if (!labelAct(s, a)) return l('O artista já não está com você.', 'The act is no longer with you.');
    const v = vote19(s, a), rels = tkRels(s, a);
    if (!rels.length) return l('Não há mais masters a negociar.', 'No masters left to negotiate.');
    if (act === 'deal') {
      takeover(s, a, name, Math.round(tkPrice19(s, a, rels.length) * 0.6));
      a.trust = clamp(a.trust + (v.yes.length >= v.no.length ? 5 : -5), 0, 100);
      return l('Fechado. Os masters saem do seu catálogo por décadas.', 'Done. The masters leave your catalog for decades.');
    }
    if (act === 'fight') {
      if (v.yes.length > v.no.length && v.no.length) {
        a.trust = clamp(a.trust - 10, 0, 100);
        if (mid) grantHold(s, { holder: `e:${mid}`, target: 'player', kind: 'grievance', strength: 40, text: fmtL(l('{c} ficou contra {n} na briga de {a}.', '{c} sided against {n} in the {a} fight.'), { c: s.config.companyName, n: name, a: a.name }), months: 60, src: 'moneyb19' });
        splitBand(s, a, v.no, name, r);
        return l('A maioria fica com ele; a minoria que você apoiou sai da banda.', 'The majority sides with him; the minority you backed leaves the band.');
      }
      if (v.yes.length && v.no.length) { splitBand(s, a, v.yes, name, r); return l('A minoria segue o administrador e sai da banda.', 'The minority follows the manager and leaves the band.'); }
      a.trust = clamp(a.trust + (v.yes.length ? -12 : 6), 0, 100);
      return v.yes.length ? l('A banda inteira queria ele: você vira o vilão.', 'The whole band wanted him: you become the villain.') : l('Ele vai embora; a banda fica unida.', 'He walks away; the band stays united.');
    }
    if (!v.no.length) { takeover(s, a, name, Math.round(tkPrice19(s, a, rels.length) * 0.9)); return l('Unanimidade: ele leva os masters por um preço justo.', 'Unanimous: he takes the masters at a fair price.'); }
    for (const x of v.yes) for (const y of v.no) { const p = s.persons[x], q = s.persons[y]; if (p) p.rel[y] = clamp((p.rel[y] ?? 0) - 10, -100, 100); if (q) q.rel[x] = clamp((q.rel[x] ?? 0) - 10, -100, 100); }
    return l('Sem unanimidade, nada se assina — e a banda sai da reunião sem se olhar.', 'No unanimity, nothing is signed — and the band leaves the meeting without looking at each other.');
  } });
function locksMonth(s: GameState): void {
  for (const [id, x] of Object.entries(mb19(s).tk)) {
    if (x.done || s.year < x.until) continue;
    x.done = 1;
    const a = s.acts[id];
    const t = fmtL(l('Rescisão de 35 anos: os masters de {a} levados por {n} em {y} voltam ao artista.', '35-year termination: the {a} masters taken by {n} in {y} return to the artist.'), { a: a?.name ?? '?', n: x.name, y: x.y });
    headline19(s, t, 2); log(s, t);
  }
}

// ---------------------------------------------------------------- crônica documentada (modo exato)
const CHRON19: { id: string; y: number; m: number; t: L }[] = [
  { id: 'sun_rca', y: 1955, m: 10, t: l('Sam Phillips vende o contrato de Elvis Presley e as gravações da Sun à RCA Victor por US$ 35 mil (21/11/1955).', 'Sam Phillips sells Elvis Presley\'s contract and Sun recordings to RCA Victor for $35,000 (21 Nov 1955).') },
  { id: 'parker', y: 1956, m: 2, t: l('Tom Parker assina como empresário exclusivo de Elvis Presley (março de 1956).', 'Tom Parker signs as Elvis Presley\'s exclusive manager (March 1956).') },
  { id: 'klein_stones', y: 1965, m: 7, t: l('Allen Klein passa a empresariar os Rolling Stones (agosto de 1965).', 'Allen Klein becomes the Rolling Stones\' manager (August 1965).') },
  { id: 'klein_beatles', y: 1969, m: 1, t: l('Lennon, Harrison e Starr escolhem Allen Klein como administrador; McCartney prefere os Eastman (fevereiro de 1969).', 'Lennon, Harrison and Starr pick Allen Klein as business manager; McCartney favours the Eastmans (February 1969).') },
  { id: 'prince_symbol', y: 1993, m: 5, t: l('Prince troca o nome por um símbolo em plena disputa com a Warner Bros. (7/6/1993).', 'Prince changes his name to a symbol amid his dispute with Warner Bros. (7 Jun 1993).') },
  { id: 'prince_masters', y: 2014, m: 3, t: l('Prince e a Warner Bros. fecham acordo: os masters voltam ao artista (abril de 2014).', 'Prince and Warner Bros. reach a deal: the masters return to the artist (April 2014).') },
];
export const chron19 = (s: GameState) => CHRON19.filter((c) => c.y * 12 + c.m <= s.year * 12 + s.month);
function chronMonth(s: GameState): void {
  if (!exactHist(s)) return;
  const st = mb19(s);
  for (const c of CHRON19) {
    if (st.chron[c.id] || c.y !== s.year || c.m !== s.month) continue;
    st.chron[c.id] = 1;
    headline19(s, c.t, 3);
    emitFact(s, { kind: 'real_history', actors: ['player'], severity: 25, visibility: 'public', tags: ['moneyb19', c.id], text: c.t, src: 'moneyb19' });
  }
}

// ---------------------------------------------------------------- mês
registerSimHook('month', 'moneyb19', (s) => {
  const r = rng19(s, 'mb19');
  chronMonth(s);
  overrides(s);
  mgrMonth(s, r);
  locksMonth(s);
  if (s.config.role === 'artist') { mgrOffer(s, r); return; }
  bids(s, r);
  clausePaid(s, r);
  mgrOffer(s, r);
  junkOffer(s, r);
  kleinOffer(s, r);
});

// ---------------------------------------------------------------- ouvintes (fatos)
onFact('contract_sold', (s, f) => {
  const lb = f.actors[1];
  if (!f.actors.includes('player')) return;
  s.player.reputation.artists = clamp(s.player.reputation.artists - 2, 0, 100);
  for (const id of playerActs(s)) { const a = s.acts[id]; if (a && !a.playerBand) a.trust = clamp(a.trust - 2, 0, 100); }
  if (lb && s.labels[lb]) coolHeat19(s, lb, 5);
  remember(s, 'contract_sold', f.text, { actId: f.actors[0], important: true });
  if (Number(f.severity) >= 40) headline19(s, f.text, 2);
}, 'moneyb19:sold');
onFact('sale_regret', (s, f) => {
  s.player.reputation.commercial = clamp(s.player.reputation.commercial - 1, 0, 100);
  remember(s, 'regret', f.text, { actId: f.actors[1], important: true });
  headline19(s, f.text, 2);
}, 'moneyb19:regret');
onFact('release_clause', (s, f) => {
  const [aId, b, c] = f.actors;
  const other = b === 'player' ? c : b;
  if (other && s.labels[other]) addHeat19(s, other, 12, 100);
  if (b !== 'player') { s.player.reputation.commercial = clamp(s.player.reputation.commercial - 1, 0, 100); remember(s, 'release_clause', f.text, { actId: aId, important: true }); }
  headline19(s, f.text, 2);
}, 'moneyb19:clause');
onFact('total_manager', (s, f) => {
  const a = s.acts[f.actors[0]];
  if (!a) return;
  a.momentum = clamp(a.momentum + 6, -100, 100);
  a.trust = clamp(a.trust + 3, 0, 100);
  link(s, 'colonel', f.text);
}, 'moneyb19:mgr');
onFact('manager_exposed', (s, f) => {
  const a = s.acts[f.actors[0]];
  if (!a) return;
  scandal(s, a.id, 'money', 40, f.text, { text: f.text });
  headline19(s, f.text, 3);
}, 'moneyb19:exposed');
onFact('junk_record', (s, f) => {
  const a = s.acts[f.actors[0]];
  if (!a) return;
  for (const pid of a.members) { const p = s.persons[pid]; if (p) p.morale = clamp(p.morale + (f.tags.includes('freed') ? 10 : -4), 0, 100); }
  if (!f.tags.includes('shelved')) headline19(s, f.text, 1);
}, 'moneyb19:junk');
onFact('name_protest', (s, f) => {
  const a = s.acts[f.actors[0]];
  if (!a) return;
  a.fame = clamp(a.fame - 4, 0, 100);
  a.fans.core = Math.round(a.fans.core * 1.06);
  headline19(s, f.text, 2);
}, 'moneyb19:name');
onFact('mgmt_takeover', (s, f) => {
  for (const pid of f.actors.slice(2)) { const p = s.persons[pid]; if (!p) continue; p.morale = clamp(p.morale - 10, 0, 100); addStress(s, pid, 5, l('Masters vendidos contra a vontade', 'Masters sold against their will')); }
  headline19(s, f.text, 2);
}, 'moneyb19:takeover');
onFact('mgmt_split', (s, f) => {
  const [a, b] = f.actors;
  startFeud18(s, a, b, l('Briga de gestão e masters', 'Management and masters fight'), 30);
  headline19(s, f.text, 3);
}, 'moneyb19:split');

// ---------------------------------------------------------------- ecos (toda opção nova volta)
const actOf = (f: { s: GameState; c: Record<string, unknown> }) => f.s.acts[String(f.c.act ?? '')];
registerConseq18('ib:mb19_bid:sell', { now: l('Caixa agora; o astro vira do rival.', 'Cash now; the star becomes the rival\'s.'), later: [{ in: [6, 24], p: 0.4, tone: 'bad', hint: l('Quem vende uma lenda às vezes assiste de longe.', 'Whoever sells a legend sometimes watches from afar.'),
  fx: (f) => { const a = actOf(f); f.rep('artists', -1); return fmtL(l('Nos bastidores, {a} conta como foi vendido como mercadoria.', 'Backstage, {a} tells how they were sold like goods.'), { a: a?.name ?? '?' }); } }] });
registerConseq18('ib:mb19_bid:override', { later: [{ in: [6, 18], p: 0.5, tone: 'good', hint: l('Uma fatia do futuro pode render.', 'A slice of the future may pay off.'),
  fx: (f) => { f.rep('commercial', 1); return l('O mercado elogia a cláusula de override: venda inteligente.', 'The market praises the override clause: a smart sale.'); } }] });
registerConseq18('ib:mb19_bid:counter', { later: [{ in: [2, 8], p: 0.35, tone: 'mixed', hint: l('Rival que ouve "não" volta com outra tática.', 'A rival told "no" comes back with another tactic.'),
  fx: (f) => { const lb = f.s.labels[String(f.c.lb ?? '')]; if (lb) addHeat19(f.s, lb.id, 5, 100); return fmtL(l('{b} passa a cortejar seu elenco às claras.', '{b} starts openly courting your roster.'), { b: lb?.name ?? '?' }); } }] });
registerConseq18('ib:mb19_bid:keep', { later: [{ in: [4, 14], p: 0.45, tone: 'good', hint: l('Segurar o astro é aposta na lealdade.', 'Keeping the star bets on loyalty.'),
  when: (s, c) => s.acts[String(c.act)]?.owner === 'player', fx: (f) => f.trust(5).momentum(4).lines[0] ?? l('O astro retribui a confiança.', 'The star repays the trust.') }] });
registerConseq18('ib:mb19_mgr:accept', { now: l('Renda certa; o artista fica no país.', 'Steady income; the act stays at home.'), later: [{ in: [8, 30], p: 0.5, tone: 'bad', hint: l('Todo empresário total tem um segredo.', 'Every total manager has a secret.'),
  when: (s, c) => !!mb19(s).mgr[String(c.act)], fx: (f) => { const a = actOf(f), m = a && mb19(f.s).mgr[a.id]; if (a && m && !m.exposed) expose(f.s, a, m); return l('O passado do empresário vem à tona.', 'The manager\'s past comes out.'); } }] });
registerConseq18('ib:mb19_mgr:limit', { later: [{ in: [4, 12], p: 0.3, tone: 'mixed', hint: l('Teto na comissão não muda o caráter de ninguém.', 'A cap on commission changes nobody\'s character.'),
  fx: (f) => f.trust(-2).lines[0] ?? l('O empresário cobra a diferença em controle.', 'The manager takes the difference in control.') }] });
registerConseq18('ib:mb19_mgr:refuse', { later: [{ in: [6, 18], p: 0.35, tone: 'bad', hint: l('Ele não esquece rosto.', 'He never forgets a face.'),
  fx: (f) => f.trust(-3).mood('morale', -3).lines[0] ?? l('O empresário recusado envenena a relação com o artista.', 'The refused manager poisons the act\'s trust.') }] });
registerConseq18('ib:mb19_revolt:fire', { later: [{ in: [3, 10], p: 0.5, tone: 'good', hint: l('Banda livre costuma voltar a viajar.', 'A freed band usually travels again.'), fx: (f) => f.momentum(5).mood('morale', 5).lines[0] ?? l('Liberdade!', 'Freedom!') }] });
registerConseq18('ib:mb19_revolt:audit', { later: [{ in: [3, 10], p: 0.4, tone: 'mixed', hint: l('Auditoria acha dinheiro — e segredos.', 'Audits find money — and secrets.'), fx: (f) => f.trust(3).lines[0] ?? l('As contas abertas acalmam a banda.', 'Open books calm the band.') }] });
registerConseq18('ib:mb19_revolt:keep', { later: [{ in: [2, 8], p: 0.5, tone: 'bad', hint: l('Revolta engolida volta maior.', 'A swallowed revolt comes back bigger.'), fx: (f) => f.trust(-5).mood('resentment', 6).lines[0] ?? l('A banda guarda.', 'The band remembers.') }] });
registerConseq18('ib:mb19_junk:release', { later: [{ in: [6, 24], p: 0.3, tone: 'good', hint: l('Disco maldito às vezes vira cult.', 'A cursed record sometimes turns cult.'), fx: (f) => f.fans(4).lines[0] ?? l('O disco-lixo vira objeto de culto.', 'The junk album becomes a cult object.') }] });
registerConseq18('ib:mb19_junk:sue', { later: [{ in: [3, 12], p: 0.4, tone: 'bad', hint: l('Processar artista vira pauta de imprensa.', 'Suing an artist becomes a press story.'), fx: (f) => f.rep('artists', -2).lines[0] ?? l('A imprensa toma o lado do artista.', 'The press takes the artist\'s side.') }] });
registerConseq18('ib:mb19_junk:free', { later: [{ in: [6, 18], p: 0.4, tone: 'good', hint: l('Quem solta bem é lembrado.', 'A clean release is remembered.'), fx: (f) => f.rep('artists', 2).lines[0] ?? l('Artistas comentam que seu selo sabe deixar ir.', 'Artists say your label knows how to let go.') }] });
registerConseq18('ib:mb19_junk:shelve', { later: [{ in: [12, 40], p: 0.3, tone: 'mixed', hint: l('Gaveta de selo um dia é aberta.', 'A label\'s vault gets opened one day.'), fx: (f) => f.cash(3000, 'Disco engavetado vira raridade', 'sales').lines[0] ?? l('O disco engavetado vaza e vira raridade.', 'The shelved album leaks and becomes a rarity.') }] });
registerConseq18('ib:mb19_klein:deal', { now: l('Masters vendidos; royalty +3 pontos.', 'Masters sold; royalty +3 points.'), later: [{ in: [6, 24], p: 0.45, tone: 'bad', hint: l('Quem fica com os masters dita os relançamentos.', 'Whoever holds the masters dictates the reissues.'),
  fx: (f) => f.mood('resentment', 5).lines[0] ?? l('A minoria da banda não perdoa a venda.', 'The band\'s minority never forgives the sale.') }] });
registerConseq18('ib:mb19_klein:fight', { later: [{ in: [4, 16], p: 0.4, tone: 'mixed', hint: l('Briga de gestão deixa cicatriz.', 'A management fight leaves scars.'), fx: (f) => f.rep('institutional', 1).lines[0] ?? l('Você sai da briga com fama de duro.', 'You leave the fight with a reputation for toughness.') }] });
registerConseq18('ib:mb19_klein:unanimous', { later: [{ in: [3, 12], p: 0.45, tone: 'bad', hint: l('Banda dividida não esquece a reunião.', 'A split band never forgets the meeting.'),
  when: (s, c) => (s.acts[String(c.act)]?.members.length ?? 0) >= 3, fx: (f) => { const a = actOf(f); const v = a ? vote19(f.s, a) : { yes: [], no: [] }; if (a && v.yes.length && v.no.length && f.r.chance(0.5)) { splitBand(f.s, a, v.yes.length < v.no.length ? v.yes : v.no, l('a gestão', 'management').pt, f.r); return l('A ferida da reunião abre: a banda racha.', 'The meeting\'s wound opens: the band splits.'); } return f.mood('morale', -4).lines[0] ?? l('Clima pesado nos ensaios.', 'Heavy mood at rehearsals.'); } }] });

// ---------------------------------------------------------------- calendário, porquê, conselheiro
registerExplain('mb19.value', (s, c) => {
  const a = s.acts[String(c.act)];
  if (!a) return null;
  const v = value19(s, a), k = kOf(s, a);
  return { title: fmtL(l('{a}: valor de mercado do contrato', '{a}: contract market value'), { a: a.name }), value: v.v, fmt: 'money', parts: [...v.parts,
    ...(k?.exitFee ? [{ label: l('Cláusula de saída atual', 'Current exit clause'), value: k.exitFee, fmt: 'money' as const, tone: (k.exitFee < v.v * 0.95 ? 'bad' : 'good') as 'bad' | 'good' }] : [])],
    note: l('Valor = (US$ 4 mil + fama² × 45) × embalo × prazo + 40% do adiantamento a recuperar. Cláusula abaixo de 95% do valor atrai rival rico.', 'Value = ($4k + fame² × 45) × momentum × term + 40% of the unrecouped advance. A clause under 95% of value lures a rich rival.') };
});
registerExplain('mb19.vote', (s, c) => {
  const a = s.acts[String(c.act)];
  if (!a) return null;
  const v = vote19(s, a);
  return { title: fmtL(l('{a}: votação da banda', '{a}: band vote'), { a: a.name }), value: v.yes.length, fmt: 'num', parts: [
    { label: l('A favor do administrador', 'For the manager'), value: v.yes.map((id) => s.persons[id]?.name ?? '?').join(', ') || '—', fmt: 'text' },
    { label: l('Contra', 'Against'), value: v.no.map((id) => s.persons[id]?.name ?? '?').join(', ') || '—', fmt: 'text' },
    ...v.why.map((w) => ({ label: w })),
  ], note: l('Cada integrante pesa ambição, objetivo de segurança, disciplina e mágoa; o mais influente (Dinâmica) puxa os amigos e afasta os desafetos.', 'Each member weighs ambition, a security goal, discipline and resentment; the most influential (Dynamics) pulls friends and pushes foes away.') };
});
registerAdvisorTip('moneyb19', (s) => {
  const out: ReturnType<Parameters<typeof registerAdvisorTip>[1]> = [];
  const st = mb19(s);
  const rev = Object.entries(st.mgr).filter(([, m]) => m.revolt >= 45).sort((x, y) => y[1].revolt - x[1].revolt)[0];
  if (rev) { const a = s.acts[rev[0]]; if (a) out.push({ id: 'mb19-revolt', level: 'warn', cat: 'people', score: 55, text: fmtL(l('{a} está cansado do empresário total (revolta {r}).', '{a} is tired of the total manager (revolt {r}).'), { a: a.name, r: Math.round(rev[1].revolt) }), why: [fmtL(l('Ele já levou {t}.', 'He has taken {t}.'), { t: usd(rev[1].took) })], effect: fmtL(l('Auditoria: {c}, parte do dinheiro volta.', 'Audit: {c}, part of the money returns.'), { c: usd(auditCost19(s)) }), goto: { area: 'contracts19' }, run: { label: l('Auditar', 'Audit'), fn: (s2) => auditMgr19(s2, a.id) ?? l('Feito.', 'Done.') } }); }
  if (s.config.role !== 'artist') {
    const cheap = playerActs(s).map((id) => s.acts[id]).find((a) => labelAct(s, a) && !!kOf(s, a)?.exitFee && kOf(s, a)!.exitFee! < value19(s, a).v * 0.95 && a.fame >= 30);
    if (cheap) out.push({ id: 'mb19-clause', level: 'warn', cat: 'opportunity', score: 50, text: fmtL(l('A cláusula de {a} está abaixo do valor de mercado.', '{a}\'s clause is below market value.'), { a: cheap.name }), why: [l('Um rival rico pode pagar e levar o artista a qualquer momento.', 'A rich rival may pay it and take the act at any time.')], effect: l('Subir para cláusula justa (130%).', 'Raise to a fair clause (130%).'), goto: { area: 'contracts19' }, run: { label: l('Subir cláusula', 'Raise clause'), fn: (s2) => setClause19(s2, cheap.id, 'fair') ?? l('Feito.', 'Done.') } });
  }
  return out;
});

/** Para a interface e os testes. */
export const myClauseActs19 = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a) => labelAct(s, a));
export const rivalStars19 = (s: GameState, n = 12): Act[] => Object.values(s.acts).filter((a) => live(a) && a.owner && a.owner !== 'player' && s.labels[a.owner]?.active && kOf(s, a) && !(exactHist(s) && histLocked(s, a))).sort((x, y) => y.fame - x.fame).slice(0, n);
export const _mb19 = { bids, clausePaid, overrides, mgrOffer, mgrMonth, junkOffer, kleinOffer, takeover, splitBand, chronMonth, locksMonth, moveAct19, signMgr, expose };
