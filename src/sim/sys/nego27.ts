// r27 (M2) — NEGOCIAÇÃO JOGÁVEL. A proposta de contrato vira rodadas de proposta ↔ contraproposta sobre
// adiantamento, royalty, prazo, discos devidos e controle criativo.
//   • Limite escondido: o artista tem um mínimo aceitável (no placar de evaluateOffer). Ele é sorteado de uma
//     logística centrada em 0,58 com escala 1/8 — exatamente a curva de aceite do modo rápido (p = logística),
//     então UMA proposta "na lata" tem a mesma chance dos dois jeitos. O ganho do jogável é ler o outro lado.
//   • O que se sabe: uma faixa onde o mínimo está, mais estreita com conhecimento do ato (olheiro/pesquisa),
//     analista, jurídico e empresário; a ambição aparece com conhecimento ≥ 3; traços mudam paciência e ganância.
//   • Táticas: blefar (outro artista na mira), dar prazo (decide agora), trazer rival (selos disputam ao vivo),
//     sair da mesa (às vezes ligam de volta). Confiança e paciência sobem e descem com cada jogada.
//   • Saída: um contrato NORMAL pelo caminho de sempre (makeOffer → acceptOffer, mesma estrutura) ou fracasso.
// Puro e determinístico: sorte de Rng.fromSeed(semente|nego27v1|ato|semana|tentativa|parte); nunca s.rng.

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { acceptOffer, evaluateOffer, expectedAdvance, makeOffer, pending29 } from '../contracts';
import { actHasTrait, mainAmbition } from '../people';
import type { Act, GameState, Offer } from '../types';
import { fmtL, money, staffCount, staffSkill } from '../util';
import { scoutEligible20 } from '../scout20';
import { freeCash20 } from '../oblig20';
import { cap14 } from './gate14';
import { respondDemand, rst, settleDemand } from '../rights';
import { rivalCounter28, rivalReserve28, rivalScore28, rivalSign28, rivalTerms28 } from './rivalsense28';

export type Draft27 = Omit<Offer, 'id' | 'week' | 'status'>;
export const NEGO27_RNG = 'nego27v1';

export type Tactic27 = 'plain' | 'bluff' | 'deadline';
export interface Line27 { who: 'you' | 'them' | 'rival' | 'note'; t: L; tone?: 'good' | 'bad' | 'warn' }
export interface Rival27 { id: string; name: string; score: number; terms: Draft27;
  /** r28 (C7): reserva própria do rival (escondida), lance atual, quantas vezes cobriu e se já recuou */
  reserve?: number; bid?: number; counters?: number; out?: boolean }
export interface Nego27 {
  actId: string; week: number; attempt: number;
  round: number; maxRounds: number;
  /** 0–100: quando zera, o artista levanta da mesa */
  patience: number;
  /** variação de confiança acumulada (aplicada no fim) */
  trust: number;
  ours: Draft27; theirs: Draft27 | null;
  /** mínimo aceitável (escondido) e aspiração atual (escondida) no placar de evaluateOffer */
  res: number; asp: number;
  /** faixa conhecida do mínimo */
  lo: number; hi: number;
  greed: number;
  rival: Rival27 | null;
  rivalAsked?: boolean; bluffs: number; deadline?: boolean;
  log: Line27[];
  status: 'open' | 'deal' | 'walked' | 'lost' | 'sniped';
  contractId?: string;
}

const rng27 = (s: GameState, n: Nego27, part: string) => Rng.fromSeed(`${s.config.seed}|${NEGO27_RNG}|${n.actId}|${n.week}|${n.attempt}|${part}`);
const scoreOf = (s: GameState, act: Act, o: Draft27) => evaluateOffer(s, act, o).score;
export const copyDraft27 = (o: Draft27): Draft27 => ({ ...o, promises: [...o.promises], rights: o.rights ? { ...o.rights } : undefined, pk12: o.pk12 ? { ...o.pk12 } : undefined, clauses18: o.clauses18 ? { ...o.clauses18 } : undefined });

const GREEDY = ['manipulative', 'opportunist', 'ambitious', 'spendthrift', 'big_ego'];
const EASY = ['generous', 'frugal', 'loyal', 'diplomatic'];

/** Por que não dá para negociar agora (ou null). */
export function negoGate27(s: GameState, actId: string): L | null {
  const act = s.acts[actId];
  if (!act || act.owner) return l('Este ato já tem contrato.', 'This act is already signed.');
  const el = scoutEligible20(s, act);
  if (!el.ok) return el.why ?? l('Não contratável agora.', 'Not signable now.');
  if (s.offers.some((x) => x.actId === actId && (x.status === 'pending' || x.status === 'counter'))) return l('Já existe uma oferta em aberto para este artista.', 'There is already an open offer for this act.');
  return null;
}

/** Qualidade da leitura do outro lado: 0 (às cegas) … 1 (lê tudo). */
export function insight27(s: GameState, act: Act): number {
  const deg = s.knowledge[act.id]?.degree ?? 0;
  return clamp(deg / 7 + (staffCount(s, 'analyst') ? 0.12 : 0) + staffSkill(s, 'legal') / 400 + staffSkill(s, 'manager') / 400 + staffSkill(s, 'scout') / 600, 0, 1);
}

/** Abre a mesa: sorteia o mínimo escondido, a faixa revelada, a paciência e (talvez) um rival à espreita. */
export function startNego27(s: GameState, actId: string, draft: Draft27): Nego27 | L {
  const gate = negoGate27(s, actId);
  if (gate) return gate;
  const act = s.acts[actId];
  const x = s.x4 as unknown as { nego27?: Record<string, { w: number; n: number }> };
  const mem = ((x.nego27 ??= {})[actId] ??= { w: s.week, n: 0 });
  if (s.week - mem.w > 8) { mem.w = s.week; mem.n = 0; }
  mem.n += 1;
  const n: Nego27 = {
    actId, week: s.week, attempt: mem.n, round: 0, maxRounds: 5, patience: 0, trust: 0, ours: copyDraft27(draft), theirs: null,
    res: 0, asp: 0, lo: 0, hi: 0, greed: 0, rival: null, bluffs: 0, log: [], status: 'open',
  };
  const r = rng27(s, n, 'open');
  // mínimo ~ logística(0,58; 1/8): P(placar ≥ mínimo) = chance do modo rápido
  const u = clamp(r.next(), 0.03, 0.97);
  const greed = GREEDY.filter((t) => actHasTrait(s, act, t)).length * 0.03 - EASY.filter((t) => actHasTrait(s, act, t)).length * 0.02;
  n.greed = greed;
  n.res = 0.58 + Math.log(u / (1 - u)) / 8 + greed + (mem.n - 1) * 0.03; // voltar à mesa no mesmo mês sai mais caro
  n.asp = n.res + 0.16 + Math.max(0, greed);
  // faixa revelada: largura cai com a leitura; a posição do mínimo dentro dela é sorteada (não é o meio)
  const w = 0.04 + (1 - insight27(s, act)) * 0.3;
  const pos = r.float(0.15, 0.85);
  n.lo = n.res - w * pos;
  n.hi = n.res + w * (1 - pos);
  n.patience = Math.round(clamp(55 + act.trust * 0.35 - (actHasTrait(s, act, 'big_ego') || actHasTrait(s, act, 'quarrelsome') ? 15 : 0) + (actHasTrait(s, act, 'diplomatic') || actHasTrait(s, act, 'loyal') ? 10 : 0), 25, 95));
  n.maxRounds = 4 + (staffSkill(s, 'manager') > 40 ? 1 : 0);
  n.log.push({ who: 'note', t: fmtL(l('{a} senta à mesa. Paciência {p}/100. Rodadas: até {r}.', '{a} sits down at the table. Patience {p}/100. Rounds: up to {r}.'), { a: act.name, p: n.patience, r: n.maxRounds }) });
  // C14: abrir a mesa é uma reunião — a mesma cota de makeOffer (cobrada no fechamento pelo caminho normal)
  void cap14;
  return n;
}

export interface Read27 { ambition: string | null; traits: string[]; insight: number; lo: number; hi: number; score: number; band: 'below' | 'inside' | 'above' }
/** O que você sabe do outro lado e onde a proposta atual cai na faixa revelada. */
export function read27(s: GameState, n: Nego27, o: Draft27 = n.ours): Read27 {
  const act = s.acts[n.actId];
  const deg = s.knowledge[n.actId]?.degree ?? 0;
  const traits = deg >= 2 ? [...new Set(act.members.flatMap((id) => s.persons[id]?.traits ?? []))].filter((t) => GREEDY.includes(t) || EASY.includes(t) || t === 'impulsive' || t === 'anxious' || t === 'insecure' || t === 'quarrelsome') : [];
  const score = scoreOf(s, act, o);
  return { ambition: deg >= 3 ? mainAmbition(s, act) : null, traits, insight: insight27(s, act), lo: n.lo, hi: n.hi, score, band: score < n.lo ? 'below' : score > n.hi ? 'above' : 'inside' };
}

// ---------------------------------------------------------------- contraproposta do artista

interface Step27 { k: string; cost: number; f: (o: Draft27) => boolean }
function steps27(s: GameState, act: Act): Step27[] {
  const exp = money(s, expectedAdvance(s, act));
  const da = Math.max(money(s, 200), Math.round(exp * 0.15 / 100) * 100);
  const sec = mainAmbition(s, act) === 'security';
  return [
    { k: 'advance', cost: 1, f: (o) => { o.advance += da; return true; } },
    { k: 'royalty', cost: 1.2, f: (o) => { if (o.model === 'distribution') { if ((o.distributionFee ?? 0.2) <= 0.06) return false; o.distributionFee = Math.round(((o.distributionFee ?? 0.2) - 0.02) * 100) / 100; return true; } if (o.royalty >= 0.5) return false; o.royalty = Math.round((o.royalty + 0.01) * 100) / 100; return true; } },
    { k: 'control', cost: 1, f: (o) => { if (o.creativeControl) return false; o.creativeControl = true; return true; } },
    { k: 'term', cost: 0.6, f: (o) => { if (sec) { if (o.termMonths >= 84) return false; o.termMonths += 6; return true; } if (o.termMonths <= 12) return false; o.termMonths -= 6; return true; } },
    { k: 'albums', cost: 0.8, f: (o) => { if (o.releasesOwed <= 1) return false; o.releasesOwed -= 1; return true; } },
  ];
}

/** O artista melhora a SUA proposta no que mais valoriza até chegar na aspiração (no máx. 8 passos). */
export function counter27(s: GameState, n: Nego27): Draft27 {
  const act = s.acts[n.actId];
  const o = copyDraft27(n.ours);
  const st = steps27(s, act);
  let cur = scoreOf(s, act, o);
  for (let i = 0; i < 8 && cur < n.asp; i++) {
    let best: { o: Draft27; g: number; sc: number } | null = null;
    for (const x of st) {
      const c = copyDraft27(o);
      if (!x.f(c)) continue;
      const sc = scoreOf(s, act, c);
      const g = (sc - cur) / x.cost;
      if (g > 0.0005 && (!best || g > best.g)) best = { o: c, g, sc };
    }
    if (!best) break;
    Object.assign(o, best.o);
    cur = best.sc;
  }
  return o;
}

/** Aspiração da rodada: cede rumo ao mínimo (mais devagar se ganancioso). */
function concede(n: Nego27): void {
  const left = Math.max(0, n.asp - n.res);
  n.asp = n.res + left * (0.62 + Math.max(0, n.greed) * 2);
}

// ---------------------------------------------------------------- jogadas

/** Uma rodada: você manda `o` (com uma tática). O artista aceita, contrapropõe ou levanta. */
export function propose27(s: GameState, n: Nego27, o: Draft27, tactic: Tactic27 = 'plain'): Nego27 {
  if (n.status !== 'open') return n;
  const act = s.acts[n.actId];
  n.ours = copyDraft27(o);
  n.round += 1;
  const r = rng27(s, n, `r${n.round}`);
  const sc = scoreOf(s, act, n.ours);
  n.log.push({ who: 'you', t: fmtL(l('Proposta: {a} de adiantamento, {r}% de royalty, {m} meses, {d} disco(s){c}.', 'Offer: {a} advance, {r}% royalty, {m} months, {d} record(s){c}.'), { a: usd(n.ours.advance), r: Math.round((n.ours.model === 'distribution' ? 1 - (n.ours.distributionFee ?? 0.2) : n.ours.royalty) * 100), m: n.ours.termMonths, d: n.ours.releasesOwed, c: n.ours.creativeControl ? l(', controle criativo', ', creative control').pt : '' }) });
  if (tactic === 'bluff') {
    n.bluffs += 1;
    const p = clamp(0.5 + (s.player.reputation.artists - 50) / 200 - (n.rival ? 0.2 : 0) - (actHasTrait(s, act, 'manipulative') ? 0.2 : 0) + (actHasTrait(s, act, 'insecure') || actHasTrait(s, act, 'anxious') ? 0.15 : 0) - (n.bluffs - 1) * 0.2, 0.1, 0.85);
    if (r.next() < p) {
      n.res -= 0.05; n.asp -= 0.09;
      n.log.push({ who: 'note', tone: 'good', t: l('Blefe colou: eles acham que você tem outro artista na mira e baixam a pedida.', 'The bluff worked: they think you have another act lined up and lower their ask.') });
    } else {
      n.res += 0.03; n.trust -= 6; n.patience -= 20;
      n.log.push({ who: 'note', tone: 'bad', t: l('Blefe descoberto: o empresário deles checou. Confiança −6, paciência −20.', 'Bluff called: their manager checked. Trust −6, patience −20.') });
    }
  }
  if (tactic === 'deadline') {
    n.deadline = true;
    const push = actHasTrait(s, act, 'impulsive') || actHasTrait(s, act, 'anxious') ? 0.05 : 0.02;
    n.trust -= 3;
    if (sc >= n.res - push) return deal27(s, n, n.ours, l('Sob prazo, eles assinam.', 'Under the deadline, they sign.'));
    n.log.push({ who: 'them', tone: 'bad', t: l('"Prazo? Então é não." Eles levantam da mesa.', '"A deadline? Then it\'s a no." They leave the table.') });
    return fail27(s, n, 'walked');
  }
  // rival entra na disputa (ato visível, a partir da 2ª rodada, ou se você chamou)
  if (!n.rival && n.round >= 2 && (act.fame > 10 || !!act.catalogNo) && r.next() < clamp(0.12 + act.fame / 150, 0, 0.55)) bringRival27(s, n, false);
  if (n.rival && !n.rival.out && sc > n.rival.score) rivalCounter27(s, n, r);
  if (sc >= n.asp || (n.round >= n.maxRounds && sc >= n.res)) return deal27(s, n, n.ours, l('"Fechado." Eles aceitam a sua proposta.', '"Deal." They accept your offer.'));
  // paciência: proposta longe do mínimo ofende
  const gap = n.res - sc;
  n.patience -= Math.round(Math.min(35, 12 + Math.max(0, gap) * 100));
  if (n.patience <= 0 || n.round >= n.maxRounds) {
    n.log.push({ who: 'them', tone: 'bad', t: n.patience <= 0 ? l('"Estamos perdendo tempo." Eles levantam da mesa.', '"We are wasting time." They leave the table.') : l('Acabaram as rodadas sem acordo.', 'Rounds ran out with no deal.') });
    return fail27(s, n, 'walked');
  }
  concede(n);
  n.theirs = counter27(s, n);
  n.log.push({ who: 'them', tone: 'warn', t: fmtL(l('Contraproposta: {a} de adiantamento, {r}% de royalty, {m} meses, {d} disco(s){c}. Paciência {p}/100.', 'Counter: {a} advance, {r}% royalty, {m} months, {d} record(s){c}. Patience {p}/100.'), { a: usd(n.theirs.advance), r: Math.round((n.theirs.model === 'distribution' ? 1 - (n.theirs.distributionFee ?? 0.2) : n.theirs.royalty) * 100), m: n.theirs.termMonths, d: n.theirs.releasesOwed, c: n.theirs.creativeControl ? l(', controle criativo', ', creative control').pt : '', p: Math.max(0, n.patience) }) });
  return n;
}

/** Aceitar a contraproposta deles: contrato nos termos deles. */
export function acceptTheirs27(s: GameState, n: Nego27): Nego27 {
  if (n.status !== 'open' || !n.theirs) return n;
  n.trust += 2;
  return deal27(s, n, n.theirs, l('Você aceita a contraproposta. Aperto de mãos.', 'You accept their counter. Handshake.'), 'you');
}

/** Trazer um rival à mesa (ou ele chega sozinho): sobe o mínimo deles até um pouco acima do lance rival. */
export function bringRival27(s: GameState, n: Nego27, asked = true): Nego27 {
  if (n.status !== 'open' || n.rival) return n;
  if (s.acts[n.actId] && pending29(s, s.acts[n.actId])) { // R29 (integrante B): a banda ainda não existe — ninguém a disputa
    if (asked) n.log.push({ who: 'note', t: l('Nenhum selo disputa uma banda que ainda está sendo montada.', 'No label bids on a band that is still being formed.') });
    n.rivalAsked = asked || n.rivalAsked;
    return n;
  }
  const act = s.acts[n.actId];
  const r = rng27(s, n, 'rival');
  const labels = Object.values(s.labels).filter((x) => x.active && x.cash > money(s, 50000)).sort((a, b) => b.aggression - a.aggression || (a.id < b.id ? -1 : 1)).slice(0, 3);
  if (!labels.length) { if (asked) n.log.push({ who: 'note', t: l('Nenhum selo rival com caixa para entrar na disputa.', 'No rival label has the cash to join the bidding.') }); n.rivalAsked = asked || n.rivalAsked; return n; }
  const lb = labels[r.int(0, labels.length - 1)];
  // r28 (C7): o lance sai da reserva PRÓPRIA do rival (fama percebida, agressividade, caixa) — não do seu lance
  // nem do mínimo escondido do artista; o placar soma a diferença de força entre os selos
  const reserve = rivalReserve28(s, lb, act);
  const bid = Math.round(reserve * r.float(0.7, 0.9) / 100) * 100;
  const o: Draft27 = copyDraft27(rivalTerms28(s, act, bid));
  const sc = rivalScore28(s, act, lb, bid);
  n.rival = { id: lb.id, name: lb.name, score: sc, terms: o, reserve, bid, counters: 0 };
  n.rivalAsked = asked;
  n.res = Math.max(n.res, sc + 0.01);
  n.asp = Math.max(n.asp, sc + 0.05);
  if (asked) {
    // chamar o rival: a disputa esquenta, mas o artista gosta de ser cortejado (paciência +15, mais uma rodada)
    n.patience += 15;
    n.maxRounds += 1;
  }
  n.log.push({ who: 'rival', tone: 'warn', t: fmtL(asked ? l('Você abre a disputa: {l} entra com {a} de adiantamento. Eles ganham fôlego (+1 rodada, paciência +15), mas agora você precisa cobrir o lance.', 'You open the bidding: {l} comes in with a {a} advance. They get breathing room (+1 round, patience +15), but now you must top the bid.') : l('{l} fica sabendo e entra na disputa com {a} de adiantamento.', '{l} hears about it and joins the bidding with a {a} advance.'), { l: lb.name, a: usd(o.advance) }) });
  return n;
}

/** r28 (C7): você passou o rival — ele cobre (sorteio pela agressividade, até a reserva dele) ou recua de vez. */
function rivalCounter27(s: GameState, n: Nego27, r: Rng): void {
  const rv = n.rival!;
  const lb = s.labels[rv.id];
  const act = s.acts[n.actId];
  const bid = rv.bid ?? rv.terms.advance;
  const nb = lb ? rivalCounter28(lb, bid, rv.reserve ?? bid, r) : null;
  if (nb === null || !lb) {
    rv.out = true;
    n.log.push({ who: 'rival', tone: 'good', t: fmtL(l('{l} não cobre: chegou no limite dele.', '{l} won\'t go higher: they hit their limit.'), { l: rv.name }) });
    return;
  }
  rv.bid = nb;
  rv.counters = (rv.counters ?? 0) + 1;
  rv.terms = copyDraft27(rivalTerms28(s, act, nb));
  rv.score = rivalScore28(s, act, lb, nb);
  n.res = Math.max(n.res, rv.score + 0.01);
  n.asp = Math.max(n.asp, rv.score + 0.05);
  n.log.push({ who: 'rival', tone: 'warn', t: fmtL(l('{l} sobe o lance: {a} de adiantamento.', '{l} raises its bid: a {a} advance.'), { l: rv.name, a: usd(nb) }) });
}

/** Sair da mesa. Sem rival e com proposta perto do mínimo, às vezes eles ligam de volta e topam a sua última. */
export function walk27(s: GameState, n: Nego27): Nego27 {
  if (n.status !== 'open') return n;
  const act = s.acts[n.actId];
  const sc = scoreOf(s, act, n.ours);
  const r = rng27(s, n, 'walk');
  if (!n.rival && n.round >= 1 && sc >= n.res - 0.05 && r.next() < 0.5) {
    n.trust -= 1;
    return deal27(s, n, n.ours, l('Você levanta… e o telefone toca: "Espera. Topamos a sua última proposta."', 'You get up… and the phone rings: "Wait. We\'ll take your last offer."'));
  }
  n.trust -= 2;
  n.log.push({ who: 'you', t: l('Você sai da mesa.', 'You walk away from the table.') });
  return fail27(s, n, 'walked');
}

/** Valor esperado do placar da proposta em "chance" (para a interface comparar com o modo rápido). */
export const quickChance27 = (s: GameState, n: Nego27, o: Draft27 = n.ours): number => evaluateOffer(s, s.acts[n.actId], o).p;

// ---------------------------------------------------------------- desfechos

function deal27(s: GameState, n: Nego27, o: Draft27, why: L, who: Line27['who'] = 'them'): Nego27 {
  const act = s.acts[n.actId];
  if (o.advance > 0 && freeCash20(s) < o.advance) {
    n.log.push({ who: 'note', tone: 'bad', t: l('Eles topam, mas o caixa livre não cobre o adiantamento: o acordo cai.', 'They agree, but free cash does not cover the advance: the deal falls through.') });
    return fail27(s, n, 'lost');
  }
  // o caminho normal: makeOffer (reunião, caixa reservado, elegibilidade) → acceptOffer (contrato idêntico)
  const offer = makeOffer(s, copyDraft27(o));
  if (!offer) {
    n.log.push({ who: 'note', tone: 'bad', t: cap14(s).why ?? l('Não foi possível registrar a proposta.', 'Could not register the offer.') });
    return fail27(s, n, 'lost');
  }
  acceptOffer(s, act, offer);
  act.trust = clamp(act.trust + n.trust, 0, 100);
  n.contractId = act.contractId;
  n.status = 'deal';
  n.log.push({ who, tone: 'good', t: why });
  return n;
}

function fail27(s: GameState, n: Nego27, st: 'walked' | 'lost'): Nego27 {
  const act = s.acts[n.actId];
  act.trust = clamp(act.trust + n.trust - 3, 0, 100);
  const k = s.knowledge[act.id];
  if (k) k.stage = 'investigating';
  n.status = st;
  if (n.rival && !act.owner) {
    const lb = s.labels[n.rival.id];
    if (lb) rivalSign28(s, act, lb, n.rival.bid ?? n.rival.terms.advance, rng27(s, n, 'snipe'));
    if (act.owner) {
      n.status = 'sniped';
      s.rivalries[n.rival.id] = (s.rivalries[n.rival.id] ?? 0) + 10;
      n.log.push({ who: 'rival', tone: 'bad', t: fmtL(l('{l} fecha com {a}.', '{l} signs {a}.'), { l: n.rival.name, a: act.name }) });
    }
  }
  return n;
}

function usd(c: number): string { return `$${Math.round(c / 100).toLocaleString('en-US')}`; }

// ================================================================ RENEGOCIAÇÃO (pedido de artista que cresceu)
// O pedido (rights8) traz royalty e bônus desejados. No modo rápido: aceitar tudo, meio-termo (chance
// 0,3 + confiança/200) ou recusar. Na mesa: o mínimo escondido é a fração do pedido que eles aceitam,
// sorteada de forma que "meio-termo" (fração 0,5) passe com A MESMA chance do modo rápido.

export interface RenegTerms27 { royalty: number; bonus: number; rev: boolean }
export interface Reneg27 {
  demandId: string; actId: string; week: number;
  round: number; maxRounds: number; patience: number; trust: number;
  roy0: number; royD: number; bonusD: number; revD: number;
  /** mínimo (fração do pedido) e aspiração, escondidos; faixa revelada */
  min: number; asp: number; lo: number; hi: number;
  ours: RenegTerms27; theirs: RenegTerms27 | null;
  bluffs: number; log: Line27[]; status: 'open' | 'deal' | 'walked' | 'refused';
}

const rngR = (s: GameState, n: Reneg27, part: string) => Rng.fromSeed(`${s.config.seed}|${NEGO27_RNG}|reneg|${n.demandId}|${part}`);

/** Fração do pedido atendida (1 = tudo; reversão concedida vale +0,1, negada −0,05). */
export function renegValue27(n: Reneg27, o: RenegTerms27): number {
  const dr = Math.max(0.005, n.royD - n.roy0);
  const v = 0.6 * clamp((o.royalty - n.roy0) / dr, 0, 1.5) + 0.4 * clamp(o.bonus / Math.max(1, n.bonusD), 0, 1.5);
  return v + (n.revD > 0 ? (o.rev ? 0.1 : -0.05) : 0);
}

export function startReneg27(s: GameState, demandId: string): Reneg27 | L {
  const d = rst(s).demands.find((x) => x.id === demandId);
  if (!d) return l('Pedido expirado.', 'Request expired.');
  const c = s.contracts[d.contractId];
  const act = s.acts[d.actId];
  if (!c || !act) return l('Contrato inválido.', 'Invalid contract.');
  const n: Reneg27 = {
    demandId, actId: act.id, week: s.week, round: 0, maxRounds: 4, patience: 0, trust: 0,
    roy0: c.royalty, royD: d.royalty, bonusD: d.bonus, revD: d.reversionYears,
    min: 0, asp: 1, lo: 0, hi: 0, ours: { royalty: c.royalty, bonus: 0, rev: false }, theirs: null, bluffs: 0, log: [], status: 'open',
  };
  const r = rngR(s, n, 'open');
  const pc = clamp(0.3 + act.trust / 200, 0.1, 0.8);
  n.min = clamp(0.5 + (r.next() - pc) * 0.8, 0.1, 0.95);
  const w = 0.06 + (1 - insight27(s, act)) * 0.35;
  const pos = r.float(0.15, 0.85);
  n.lo = n.min - w * pos;
  n.hi = n.min + w * (1 - pos);
  n.patience = Math.round(clamp(50 + act.trust * 0.4, 25, 95));
  n.log.push({ who: 'them', t: fmtL(l('{a} pede royalty de {r}% e bônus de {b}{v}.', '{a} asks for a {r}% royalty and a {b} bonus{v}.'), { a: act.name, r: Math.round(d.royalty * 100), b: usd(d.bonus), v: d.reversionYears ? fmtL(l(', e os masters de volta em {y} anos', ', and the masters back in {y} years'), { y: d.reversionYears }).pt : '' }) });
  return n;
}

export function proposeReneg27(s: GameState, n: Reneg27, o: RenegTerms27, tactic: Tactic27 = 'plain'): Reneg27 {
  if (n.status !== 'open') return n;
  const act = s.acts[n.actId];
  n.ours = { ...o };
  n.round += 1;
  const r = rngR(s, n, `r${n.round}`);
  const v = renegValue27(n, o);
  n.log.push({ who: 'you', t: fmtL(l('Você oferece royalty de {r}% e bônus de {b}{v}.', 'You offer a {r}% royalty and a {b} bonus{v}.'), { r: Math.round(o.royalty * 100), b: usd(o.bonus), v: o.rev ? l(' (com reversão)', ' (with reversion)').pt : '' }) });
  if (tactic === 'bluff') {
    n.bluffs += 1;
    const p = clamp(0.45 + (s.player.reputation.artists - 50) / 200 - (actHasTrait(s, act, 'manipulative') ? 0.2 : 0) - (n.bluffs - 1) * 0.2, 0.1, 0.8);
    if (r.next() < p) {
      n.min -= 0.1; n.asp -= 0.15;
      n.log.push({ who: 'note', tone: 'good', t: l('Blefe colou ("o disco ainda não se pagou"): eles baixam a pedida.', 'The bluff worked ("the record hasn\'t paid off yet"): they lower their ask.') });
    } else {
      n.min += 0.05; n.trust -= 6; n.patience -= 20;
      n.log.push({ who: 'note', tone: 'bad', t: l('Blefe descoberto: eles viram os números. Confiança −6, paciência −20.', 'Bluff called: they saw the numbers. Trust −6, patience −20.') });
    }
  }
  if (tactic === 'deadline') {
    n.trust -= 3;
    if (v >= n.min - 0.05) return renegDeal(s, n, o, l('Sob prazo, eles topam.', 'Under the deadline, they agree.'));
    n.log.push({ who: 'them', tone: 'bad', t: l('"Prazo? Então não." O pedido volta daqui a um ano.', '"A deadline? Then no." They will ask again in a year.') });
    return renegFail(s, n);
  }
  if (v >= n.asp - 1e-6 || (n.round >= n.maxRounds && v >= n.min)) return renegDeal(s, n, o, l('"Fechado."', '"Deal."'));
  n.patience -= Math.round(14 + Math.max(0, n.min - v) * 60);
  if (n.patience <= 0 || n.round >= n.maxRounds) {
    n.log.push({ who: 'them', tone: 'bad', t: l('Sem acordo: eles levantam da mesa e voltam a pedir daqui a um ano.', 'No deal: they leave the table and will ask again in a year.') });
    return renegFail(s, n);
  }
  n.asp = n.min + Math.max(0, n.asp - n.min) * 0.6;
  // contraproposta: a fração aspirada, dividida entre royalty e bônus
  const f = clamp(n.asp, 0, 1.2);
  n.theirs = { royalty: Math.round((n.roy0 + (n.royD - n.roy0) * f) * 100) / 100, bonus: Math.round(n.bonusD * f / 100) * 100, rev: n.revD > 0 };
  n.log.push({ who: 'them', tone: 'warn', t: fmtL(l('Contraproposta: royalty de {r}% e bônus de {b}. Paciência {p}/100.', 'Counter: {r}% royalty and a {b} bonus. Patience {p}/100.'), { r: Math.round(n.theirs.royalty * 100), b: usd(n.theirs.bonus), p: Math.max(0, n.patience) }) });
  return n;
}

export function acceptRenegTheirs27(s: GameState, n: Reneg27): Reneg27 {
  if (n.status !== 'open' || !n.theirs) return n;
  n.trust += 2;
  return renegDeal(s, n, n.theirs, l('Você aceita a contraproposta.', 'You accept their counter.'), 'you');
}

/** Sair da mesa = recusar o pedido (mesmos efeitos do "Recusar" de sempre). */
export function walkReneg27(s: GameState, n: Reneg27): Reneg27 {
  if (n.status !== 'open') return n;
  respondDemand(s, rngR(s, n, 'walk'), n.demandId, 'refuse');
  n.status = 'refused';
  n.log.push({ who: 'you', tone: 'bad', t: l('Você recusa o pedido. A confiança cai.', 'You refuse the request. Trust drops.') });
  return n;
}

function renegDeal(s: GameState, n: Reneg27, o: RenegTerms27, why: L, who: Line27['who'] = 'them'): Reneg27 {
  const v = renegValue27(n, o);
  const err = settleDemand(s, n.demandId, Math.max(n.roy0, o.royalty), o.bonus, o.rev ? n.revD : 0, n.trust + (v >= 1 ? 12 : 4));
  if (err) { n.log.push({ who: 'note', tone: 'bad', t: err }); return n; }
  n.status = 'deal';
  n.log.push({ who, tone: 'good', t: why });
  return n;
}

function renegFail(s: GameState, n: Reneg27): Reneg27 {
  // mesmo desfecho do meio-termo recusado no modo rápido
  const st = rst(s);
  const d = st.demands.find((x) => x.id === n.demandId);
  const act = s.acts[n.actId];
  if (act) act.trust = clamp(act.trust - 8 + n.trust, 0, 100);
  if (d) {
    const c = s.contracts[d.contractId];
    if (c) c.lastRenegWeek = s.week - 52;
    st.demands = st.demands.filter((x) => x !== d);
  }
  n.status = 'walked';
  return n;
}
