// Rodada 11 — o ofício de empresário, por cima da gestão de artistas da rodada 9 (ventures9): renegociar
// a comissão, metas de carreira de cada agenciado, turnês marcadas por você, levar o artista ao mercado
// (propostas de gravadoras, inclusive rivais e o seu próprio selo), campanhas de imagem, conflitos de
// interesse quando você também é dono do selo/agência/mídia, empresários rivais tentando roubar
// clientes (e você roubando os deles) e um relatório mensal. Gerador próprio (semente + ano + mês).

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { acceptOffer, defaultOffer, expectedAdvance, signWithRival } from '../contracts';
import { registerExt4, registerSimHook } from '../ext4';
import { langForCity, personName } from '../people';
import type { Act, GameState, Offer } from '../types';
import { fmtL, money, nextId, notify, post, remember } from '../util';
import { ownerOf } from './people/owner';
import { funds, grossShows, mgCap, mgChance, mgGross, ventures, type Client } from './ventures9';

export type Goal = 'deal' | 'tour' | 'fame' | 'image';
export const GOAL_NAME: Record<Goal, L> = {
  deal: l('Um contrato melhor', 'A better record deal'),
  tour: l('Cair na estrada', 'Hit the road'),
  fame: l('Ficar mais conhecido (+5 de fama)', 'Get better known (+5 fame)'),
  image: l('Cuidar da imagem', 'Polish the image'),
};
export interface CX { goal?: Goal; goalW?: number; goalBase?: number; goalK?: string; tourW?: number; prW?: number; rateW?: number; poach?: { by: string; rate: number; until: number }; prevEarned?: number; prevSat?: number; notes?: L[] }
export interface DealOffer { party: string; advance: number; royalty: number; term: number }
export interface Pitch { actId: string; w: number; offers: DealOffer[] }
export interface ReportLine { actId: string; fee: number; sat: number; dsat: number; notes: L[] }
export interface Report { y: number; m: number; total: number; lines: ReportLine[] }
export interface Mgr11 { cx: Record<string, CX>; pitches: Pitch[]; reports: Report[]; exposed: number }

declare module '../ext4' { interface Ext4 { manager11: Mgr11 } }
const fresh = (): Mgr11 => ({ cx: {}, pitches: [], reports: [], exposed: 0 });
registerExt4('manager11', fresh);
export const mgr11 = (s: GameState): Mgr11 => {
  const x = s.x4 as unknown as { manager11?: Mgr11 };
  x.manager11 ??= fresh();
  return x.manager11;
};
export const cxOf = (s: GameState, actId: string): CX => (mgr11(s).cx[actId] ??= {});
const clientOf = (s: GameState, actId: string): Client | undefined => ventures(s).mg.clients.find((c) => c.actId === actId);
const bad = (t: L) => ({ ok: false, text: t });
const INVALID = l('Inválido.', 'Invalid.');
const note = (s: GameState, actId: string, t: L) => (cxOf(s, actId).notes ??= []).push(t);

/** Comissão: vai para o caixa do selo (livro-caixa) ou para o patrimônio pessoal, conforme o escritório. */
function pay(s: GameState, amount: number, key: string, memo: string, c?: Client): void {
  amount = Math.round(amount);
  if (!amount) return;
  const mg = ventures(s).mg;
  if (mg.owner === 'label') post(s, `m11:${key}`, amount, 'business', memo);
  else ownerOf(s).wealth += amount;
  if (c && amount > 0) { c.earned += amount; mg.total += amount; }
}

// ---------------------------------------------------------------- comissão

export function rateChance(s: GameState, c: Client, rate: number): number {
  if (rate <= c.rate) return 1;
  return clamp(0.25 + (c.sat - 50) / 80 + (ownerOf(s).attrs.negotiation - 50) / 250 + ventures(s).mg.rep / 400 - (rate - c.rate) * 7, 0.03, 0.9);
}

/** Renegocia a comissão com o próprio agenciado: baixar sempre passa e agrada; subir depende da satisfação. */
export function renegotiateRate(s: GameState, r: Rng, actId: string, rate: number): { ok: boolean; text: L } {
  const c = clientOf(s, actId);
  const a = s.acts[actId];
  if (!c || !a) return bad(INVALID);
  const x = cxOf(s, actId);
  rate = clamp(Math.round(rate * 100) / 100, 0.08, 0.25);
  if (rate === c.rate) return bad(l('Essa já é a comissão atual.', 'That is already the current commission.'));
  if (x.rateW && s.week - x.rateW < 26) return bad(l('Vocês conversaram sobre isso há pouco.', 'You talked about this recently.'));
  x.rateW = s.week;
  if (rate < c.rate) {
    c.sat = clamp(c.sat + (c.rate - rate) * 150, 0, 100);
    c.rate = rate;
    return { ok: true, text: fmtL(l('{a} agradece: comissão cai para {p}%.', '{a} is grateful: commission drops to {p}%.'), { a: a.name, p: Math.round(rate * 100) }) };
  }
  if (!r.chance(rateChance(s, c, rate))) {
    c.sat = clamp(c.sat - 6, 0, 100);
    return bad(fmtL(l('{a} recusa pagar mais e fica ressentido.', '{a} refuses to pay more and resents it.'), { a: a.name }));
  }
  c.sat = clamp(c.sat - (rate - c.rate) * 80, 0, 100);
  c.rate = rate;
  return { ok: true, text: fmtL(l('{a} aceita {p}% de comissão.', '{a} accepts a {p}% commission.'), { a: a.name, p: Math.round(rate * 100) }) };
}

// ---------------------------------------------------------------- turnê

export function tourCost(s: GameState): number { return money(s, 1500); }
export const tourReady = (s: GameState, actId: string) => !cxOf(s, actId).tourW || s.week - cxOf(s, actId).tourW! >= 26;

/** Turnê marcada pelo empresário. Se a agência de shows também é sua, ela cobra a parte dela — e o artista percebe. */
export function bookTour(s: GameState, r: Rng, actId: string): { ok: boolean; text: L } {
  const c = clientOf(s, actId);
  const a = s.acts[actId];
  if (!c || !a) return bad(INVALID);
  if (!tourReady(s, actId)) return bad(l('Esse artista ainda está na estrada ou descansando.', 'That act is still on the road or resting.'));
  const mg = ventures(s).mg;
  const cost = tourCost(s);
  if (funds(s, mg.owner) < cost) return bad(l('Sem dinheiro para a produção.', 'Not enough money for production.'));
  pay(s, -cost, `tourprod:${actId}`, `Produção de turnê ${a.name}`);
  const x = cxOf(s, actId);
  x.tourW = s.week;
  if (r.chance(clamp(0.14 - mg.rep / 1000, 0.04, 0.14))) {
    c.sat = clamp(c.sat - 8, 0, 100);
    return bad(fmtL(l('A turnê de {a} foi cancelada: casas vazias e promotor sumido.', '{a}\'s tour fell apart: empty rooms and a vanished promoter.'), { a: a.name }));
  }
  const gross = grossShows(s, a) * 4 * (0.7 + r.next() * 0.6);
  pay(s, gross * c.rate, `tour:${actId}`, `Comissão de turnê ${a.name}`, c);
  const own = ventures(s).list.find((v) => v.kind === 'booking' && v.clients?.some((k) => k.actId === actId));
  if (own) {
    const cut = own.clients!.find((k) => k.actId === actId)!.rate;
    pay(s, gross * cut, `tourbook:${actId}`, `Agência ${own.name}: turnê ${a.name}`);
    c.sat = clamp(c.sat - 4, 0, 100);
    note(s, actId, l('Comissão dupla (empresário + sua agência).', 'Double commission (manager + your agency).'));
  }
  a.cash += Math.round(gross * (1 - c.rate) * 0.3);
  a.fame = clamp(a.fame + 2, 0, 100);
  a.momentum = clamp(a.momentum + 8, 0, 100);
  a.fans.casual += Math.round(gross / money(s, 20));
  c.sat = clamp(c.sat + 6, 0, 100);
  mg.rep = clamp(mg.rep + 1, 0, 100);
  return { ok: true, text: fmtL(l('Turnê de {a} fechada: {g} de bilheteria.', '{a}\'s tour wrapped: {g} gross.'), { a: a.name, g: `$${Math.round(gross / 100).toLocaleString()}` }) };
}

// ---------------------------------------------------------------- contrato de gravadora

const hasPlayerLabel = (s: GameState) => s.config.role !== 'artist';
export const canShop = (s: GameState, a?: Act) => !!a && !a.owner;

/** Leva o agenciado sem gravadora ao mercado: até três propostas (rivais e, se você tem selo, o seu). */
export function shopDeal(s: GameState, r: Rng, actId: string): { ok: boolean; text: L } {
  const c = clientOf(s, actId);
  const a = s.acts[actId];
  if (!c || !a) return bad(INVALID);
  if (!canShop(s, a)) return bad(l('Já tem gravadora: renegocie em vez de procurar outra.', 'Already signed: renegotiate instead.'));
  const st = mgr11(s);
  if (st.pitches.some((p) => p.actId === actId)) return bad(l('As propostas já estão na mesa.', 'Offers are already on the table.'));
  const mg = ventures(s).mg;
  const exp = money(s, expectedAdvance(s, a));
  const lift = 1 + mg.rep / 250 + (ownerOf(s).attrs.negotiation - 50) / 300;
  const labs = Object.values(s.labels).filter((lb) => lb.active && lb.cash > exp * 1.2);
  r.shuffle(labs);
  const offers: DealOffer[] = labs.slice(0, 2 + (mg.rep > 50 ? 1 : 0)).filter(() => r.chance(0.35 + a.fame / 100 + mg.rep / 300)).map((lb) => ({
    party: lb.id, advance: Math.round(exp * (0.7 + r.next() * 0.6) * lift / 100) * 100, royalty: Math.round(clamp((0.12 + r.next() * 0.08) * lift, 0.1, 0.3) * 100) / 100, term: 36 + 12 * r.int(0, 2),
  }));
  if (hasPlayerLabel(s)) {
    const d = defaultOffer(s, a);
    offers.push({ party: 'player', advance: d.advance, royalty: d.royalty, term: d.termMonths });
  }
  if (!offers.length) { c.sat = clamp(c.sat - 4, 0, 100); return bad(fmtL(l('Nenhuma gravadora mordeu a isca por {a}.', 'No label bit for {a}.'), { a: a.name })); }
  st.pitches.push({ actId, w: s.week, offers });
  return { ok: true, text: fmtL(l('{n} proposta(s) para {a}. Decida em até 8 semanas.', '{n} offer(s) for {a}. Decide within 8 weeks.'), { n: offers.length, a: a.name }) };
}

const dealValue = (o: DealOffer) => o.advance * (1 + o.royalty * 4);

/** Fecha uma das propostas. Assinar com o seu próprio selo quando havia proposta melhor é conflito de interesse. */
export function acceptDeal(s: GameState, r: Rng, actId: string, idx: number): { ok: boolean; text: L } {
  const st = mgr11(s);
  const p = st.pitches.find((x) => x.actId === actId);
  const c = clientOf(s, actId);
  const a = s.acts[actId];
  const o = p?.offers[idx];
  if (!p || !o || !c || !a || !canShop(s, a)) return bad(INVALID);
  const mg = ventures(s).mg;
  const best = Math.max(...p.offers.filter((x) => x.party !== 'player').map(dealValue), 0);
  if (o.party === 'player') {
    if (s.player.cash < o.advance) return bad(l('O selo não tem caixa para o adiantamento.', 'The label lacks cash for the advance.'));
    const d = defaultOffer(s, a);
    const off: Offer = { ...d, advance: o.advance, royalty: o.royalty, termMonths: o.term, id: nextId(s, 'of'), week: s.week, status: 'pending' };
    acceptOffer(s, a, off);
    const worse = best > dealValue(o) * 1.05;
    c.sat = clamp(c.sat - (worse ? 18 : 4), 0, 100);
    if (worse) {
      mg.rep = clamp(mg.rep - 4, 0, 100);
      st.exposed += 1;
      note(s, actId, l('Conflito: assinou com o seu selo havendo proposta melhor.', 'Conflict: signed to your label despite a better offer.'));
    }
  } else {
    const lb = s.labels[o.party];
    if (!lb?.active) return bad(l('Essa gravadora saiu da mesa.', 'That label left the table.'));
    signWithRival(s, a, lb.id, r, true);
    const k = s.contracts[a.contractId!];
    lb.cash += k.advance - o.advance;
    Object.assign(k, { advance: o.advance, royalty: o.royalty, termMonths: o.term, endWeek: s.week + Math.round(o.term * 4.35), recoupBalance: o.advance });
    a.cash += o.advance;
    c.sat = clamp(c.sat + (dealValue(o) >= best ? 12 : 6), 0, 100);
    mg.rep = clamp(mg.rep + 2, 0, 100);
  }
  pay(s, o.advance * c.rate, `deal:${actId}`, `Comissão sobre adiantamento ${a.name}`, c);
  const x = cxOf(s, actId);
  if (x.goal === 'deal') x.goalBase = -1;
  st.pitches = st.pitches.filter((q) => q !== p);
  remember(s, 'manager9', fmtL(l('Como empresário, você leva {a} a assinar com {b}.', 'As manager, you take {a} to sign with {b}.'), { a: a.name, b: o.party === 'player' ? s.config.companyName : s.labels[o.party]?.name ?? '?' }));
  return { ok: true, text: fmtL(l('{a} assinou. Sua comissão: {p}% do adiantamento.', '{a} signed. Your cut: {p}% of the advance.'), { a: a.name, p: Math.round(c.rate * 100) }) };
}

// ---------------------------------------------------------------- imagem

export type Campaign = 'press' | 'rebrand' | 'charity';
export const CAMPAIGN_NAME: Record<Campaign, L> = { press: l('Blitz de imprensa', 'Press blitz'), rebrand: l('Repaginar o visual', 'Image makeover'), charity: l('Show beneficente', 'Charity show') };
export function campaignCost(s: GameState, k: Campaign): number { return money(s, k === 'rebrand' ? 5000 : k === 'press' ? 2500 : 3000); }
export const prReady = (s: GameState, actId: string) => !cxOf(s, actId).prW || s.week - cxOf(s, actId).prW! >= 13;

export function imageCampaign(s: GameState, r: Rng, actId: string, k: Campaign): { ok: boolean; text: L } {
  const c = clientOf(s, actId);
  const a = s.acts[actId];
  if (!c || !a) return bad(INVALID);
  if (!prReady(s, actId)) return bad(l('Uma campanha por trimestre.', 'One campaign per quarter.'));
  const mg = ventures(s).mg;
  const cost = campaignCost(s, k);
  if (funds(s, mg.owner) < cost) return bad(l('Sem dinheiro.', 'Not enough money.'));
  pay(s, -cost, `pr:${actId}:${k}`, `${CAMPAIGN_NAME[k].pt} ${a.name}`);
  cxOf(s, actId).prW = s.week;
  if (k === 'press') {
    if (r.chance(0.12)) { a.scandals += 1; c.sat = clamp(c.sat - 6, 0, 100); return bad(fmtL(l('A blitz saiu pela culatra: entrevista desastrosa de {a}.', 'The blitz backfired: {a} gave a disastrous interview.'), { a: a.name })); }
    a.momentum = clamp(a.momentum + 15, 0, 100);
    a.fame = clamp(a.fame + 1, 0, 100);
  } else if (k === 'rebrand') {
    const liked = r.chance(0.6 + mg.rep / 300);
    a.momentum = clamp(a.momentum + (liked ? 10 : 2), 0, 100);
    a.fame = clamp(a.fame + (liked ? 2 : 0), 0, 100);
    c.sat = clamp(c.sat + (liked ? 4 : -8), 0, 100);
    if (!liked) return bad(fmtL(l('{a} odiou o visual novo.', '{a} hated the new look.'), { a: a.name }));
  } else {
    a.scandals = Math.max(0, a.scandals - 1);
    c.sat = clamp(c.sat + 6, 0, 100);
    mg.rep = clamp(mg.rep + 1, 0, 100);
  }
  return { ok: true, text: fmtL(l('{k}: a imagem de {a} melhorou.', '{k}: {a}\'s image improved.'), { k: CAMPAIGN_NAME[k], a: a.name }) };
}

// ---------------------------------------------------------------- conflitos de interesse

export function conflictsOf(s: GameState, actId: string): L[] {
  const a = s.acts[actId];
  if (!a) return [];
  const out: L[] = [];
  if (a.owner === 'player') out.push(l('Contratado pelo seu próprio selo: você negocia dos dois lados.', 'Signed to your own label: you sit on both sides of the table.'));
  for (const v of ventures(s).list) {
    if (v.kind === 'booking' && v.clients?.some((k) => k.actId === actId)) out.push(fmtL(l('Agenciado também pela sua agência {n} (comissão dupla).', 'Also booked by your agency {n} (double commission).'), { n: v.name }));
    if (v.kind === 'media' && v.favored === actId) out.push(fmtL(l('Favorecido pelo seu veículo {n}.', 'Favored by your outlet {n}.'), { n: v.name }));
    if (v.kind === 'festival' && v.lineup?.some((x) => x.actId === actId)) out.push(fmtL(l('No line-up do seu festival {n}: você paga o cachê e cobra comissão.', 'On your festival {n}: you pay the fee and take a commission.'), { n: v.name }));
  }
  return out;
}

// ---------------------------------------------------------------- empresários rivais (roubo de clientes)

export type PoachMove = 'match' | 'bonus' | 'ignore';
export function poachBonus(s: GameState, a: Act): number { return Math.round(mgGross(s, a) * 2); }

export function answerPoach(s: GameState, r: Rng, actId: string, m: PoachMove): { ok: boolean; text: L } {
  const c = clientOf(s, actId);
  const a = s.acts[actId];
  const x = cxOf(s, actId);
  if (!c || !a || !x.poach) return bad(INVALID);
  const by = x.poach.by;
  if (m === 'match') {
    c.rate = Math.min(c.rate, x.poach.rate);
    c.sat = clamp(c.sat + 5, 0, 100);
  } else if (m === 'bonus') {
    const b = poachBonus(s, a);
    if (funds(s, ventures(s).mg.owner) < b) return bad(l('Sem dinheiro.', 'Not enough money.'));
    pay(s, -b, `keep:${actId}`, `Bônus de permanência ${a.name}`);
    a.cash += b;
    c.sat = clamp(c.sat + 10, 0, 100);
  }
  x.poach = undefined;
  if (m === 'ignore' && r.chance(clamp((60 - c.sat) / 60, 0, 0.9))) return bad(leave(s, c, a, by));
  return { ok: true, text: fmtL(l('{a} fica com você.', '{a} stays with you.'), { a: a.name }) };
}

function leave(s: GameState, c: Client, a: Act, by: string): L {
  const mg = ventures(s).mg;
  mg.clients = mg.clients.filter((k) => k !== c);
  mg.fired.push({ actId: a.id, y: s.year });
  if (mg.fired.length > 20) mg.fired.shift();
  mg.rep = clamp(mg.rep - 3, 0, 100);
  const t = fmtL(l('{a} trocou você pelo empresário {b}.', '{a} left you for manager {b}.'), { a: a.name, b: by });
  remember(s, 'manager9', t);
  return t;
}

/** Você rouba o cliente de outro empresário: bônus de assinatura aumenta a chance. */
export function poachChance(s: GameState, a: Act, rate: number): number { return clamp(mgChance(s, a, rate) + 0.15, 0.03, 0.97); }
export function poachClient(s: GameState, r: Rng, actId: string, rate: number): { ok: boolean; text: L } {
  const mg = ventures(s).mg;
  const a = s.acts[actId];
  if (!a || mg.clients.some((c) => c.actId === actId) || a.status === 'retired' || a.status === 'split') return bad(INVALID);
  if (mg.clients.length >= mgCap(s)) return bad(l('Você não dá conta de mais artistas.', 'You cannot handle more acts.'));
  const b = poachBonus(s, a);
  if (funds(s, mg.owner) < b) return bad(l('Sem dinheiro para o bônus.', 'Not enough money for the bonus.'));
  pay(s, -b, `poach:${actId}`, `Bônus de assinatura ${a.name}`);
  a.cash += b;
  rate = clamp(rate, 0.1, 0.2);
  if (!r.chance(poachChance(s, a, rate))) return bad(fmtL(l('{a} embolsou o agrado e ficou com o empresário atual.', '{a} pocketed the gift and stayed with their manager.'), { a: a.name }));
  mg.clients.push({ actId, rate, since: s.week, sat: 55, earned: 0 });
  mg.rep = clamp(mg.rep - 1, 0, 100);
  remember(s, 'manager9', fmtL(l('Você tira {a} de outro empresário.', 'You poach {a} from another manager.'), { a: a.name }));
  return { ok: true, text: fmtL(l('{a} agora é seu cliente.', '{a} is now your client.'), { a: a.name }) };
}

// ---------------------------------------------------------------- mês

function goalMet(s: GameState, a: Act, x: CX): boolean {
  const k = a.contractId ? s.contracts[a.contractId] : undefined;
  if (x.goal === 'deal') return x.goalBase === -1 || (!!k && k.endWeek > s.week && (k.id !== x.goalK || k.royalty > (x.goalBase ?? 0) + 0.005));
  if (x.goal === 'tour') return (x.tourW ?? -1) >= (x.goalW ?? 0);
  if (x.goal === 'image') return (x.prW ?? -1) >= (x.goalW ?? 0);
  return a.fame >= (x.goalBase ?? 0) + 5;
}

function setGoal(s: GameState, r: Rng, a: Act, x: CX): void {
  const k = a.contractId ? s.contracts[a.contractId] : undefined;
  x.goal = r.pick(['deal', 'tour', 'fame', 'image'] as Goal[]);
  x.goalW = s.week;
  x.goalBase = x.goal === 'fame' ? a.fame : x.goal === 'deal' ? (k && k.endWeek > s.week ? k.royalty : 0) : 0;
  x.goalK = x.goal === 'deal' ? k?.id ?? '' : undefined;
}

function managerMonth(s: GameState, r: Rng): void {
  const st = mgr11(s);
  const mg = ventures(s).mg;
  st.pitches = st.pitches.filter((p) => s.week - p.w <= 8 && canShop(s, s.acts[p.actId]) && mg.clients.some((c) => c.actId === p.actId));
  const lines: ReportLine[] = [];
  for (const c of mg.clients.slice()) {
    const a = s.acts[c.actId];
    if (!a) continue;
    const x = cxOf(s, a.id);
    const notes = x.notes ?? [];
    x.notes = undefined;
    if (!x.goal) setGoal(s, r, a, x);
    else if (goalMet(s, a, x)) {
      c.sat = clamp(c.sat + 12, 0, 100);
      mg.rep = clamp(mg.rep + 1, 0, 100);
      notes.push(fmtL(l('Meta cumprida: {g}.', 'Goal met: {g}.'), { g: GOAL_NAME[x.goal] }));
      setGoal(s, r, a, x);
    } else if (s.week - (x.goalW ?? s.week) > 52) {
      c.sat = clamp(c.sat - 8, 0, 100);
      notes.push(fmtL(l('Meta esquecida há um ano: {g}.', 'Goal ignored for a year: {g}.'), { g: GOAL_NAME[x.goal] }));
      setGoal(s, r, a, x);
    }
    // conflitos: o artista desconfia; a imprensa pode expor
    const cf = conflictsOf(s, a.id);
    if (cf.length) {
      if (a.owner === 'player' && mg.owner === 'label') c.sat = clamp(c.sat - 0.5, 0, 100);
      if (r.chance(0.025 * cf.length)) {
        c.sat = clamp(c.sat - 6, 0, 100);
        mg.rep = clamp(mg.rep - 3, 0, 100);
        st.exposed += 1;
        notes.push(l('A imprensa expôs o conflito de interesse.', 'The press exposed the conflict of interest.'));
        notify(s, fmtL(l('Imprensa: "empresário de {a} joga dos dois lados".', 'Press: "{a}\'s manager plays both sides".'), { a: a.name }), 'bad');
      }
    }
    // empresários rivais
    if (x.poach && x.poach.until <= s.week) {
      const by = x.poach.by;
      x.poach = undefined;
      if (r.chance(clamp((60 - c.sat) / 60, 0, 0.9))) { const t = leave(s, c, a, by); notify(s, t, 'bad'); notes.push(t); }
    } else if (!x.poach && r.chance(0.02 + a.fame / 1500 + (c.sat < 50 ? 0.03 : 0))) {
      x.poach = { by: personName(r, langForCity(a.city, r)), rate: Math.max(0.08, Math.round((c.rate - 0.03) * 100) / 100), until: s.week + 4 };
      notify(s, fmtL(l('O empresário {b} está cercando {a} ({p}% de comissão). Responda em Gestão de artistas.', 'Manager {b} is courting {a} ({p}% commission). Respond in Artist management.'), { b: x.poach.by, a: a.name, p: Math.round(x.poach.rate * 100) }), 'bad');
      notes.push(fmtL(l('Assédio do empresário {b}.', 'Courted by manager {b}.'), { b: x.poach.by }));
    }
    const fee = c.earned - (x.prevEarned ?? c.earned);
    lines.push({ actId: a.id, fee, sat: Math.round(c.sat), dsat: Math.round(c.sat - (x.prevSat ?? c.sat)), notes });
    x.prevEarned = c.earned;
    x.prevSat = c.sat;
  }
  for (const id of Object.keys(st.cx)) if (!mg.clients.some((c) => c.actId === id)) delete st.cx[id];
  if (lines.length) {
    st.reports.push({ y: s.year, m: s.month, total: lines.reduce((t, x) => t + x.fee, 0), lines });
    if (st.reports.length > 12) st.reports.shift();
  }
}

registerSimHook('month', 'manager11', (s) => managerMonth(s, Rng.fromSeed(`${s.config.seed}:manager11:${s.year}:${s.month}`)));
