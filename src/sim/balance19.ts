// Rodada 19 (frentes 0.3 e 11.4) — lote de equilíbrio com o bot que joga de verdade (playbot16.simulatePlayer) e
// bots ADVERSÁRIOS que caçam estratégias dominantes. Cada adversário é o playbot equilibrado + uma estratégia
// levada ao extremo (ou só ela, no caso do crime). O runner paralelo fica em tools/balance19.ts; aqui só a
// partida e as métricas, para o teste r19-bots e para quem quiser chamar de outro lugar.
//
//   runBot19({ bot: 'balanced', start: 1975, seed: 'b19-1', years: 5 }) → Row19 (caixa real, patrimônio, fama, histórias)
//
// Patrimônio ("worth") = valor de venda do selo (ou caixa − dívidas, se quebrou/vendeu) + ganho no bolso do dono, em
// US$ de 2020. É ele que decide se um adversário "vence" o equilibrado: caixa sozinho premiaria empréstimo e venda de ativos.

import { defaultConfig } from './bot';
import { PROFILES, pickOption, playMonth, type Profile } from './playbot16';
import { toReal } from '../core/money';
import { defaultOffer, evaluateOffer, makeOffer, acceptCounter, careerSlotsUsed } from './contracts';
import { takeLoan } from './economy';
import { resolveDecision } from './events';
import { onFact } from './facts17';
import { releaseDemo } from './repertoire';
import { advanceMonth } from './tick';
import type { GameState } from './types';
import { playerActs, rngOf } from './util';
import { createGame } from './worldgen';
import { hqCaps } from './branches';
import { commitCrime, crimeById, crimeOdds, targetsFor } from './sys/crime17';
import { playerFame } from './sys/love17';
import { ownerOf } from './sys/people/owner';
import { bidNet, hasLabel, makeBids, sale17, sellLabel, sellMaster17, valuation17 } from './sys/sale17';

export type Base19 = 'balanced' | 'cautious' | 'aggressive' | 'artist';
export type Adv19 = 'spam' | 'loans' | 'flip' | 'signall' | 'catalog' | 'crime';
export type Bot19 = Base19 | Adv19;
export const BASE19: Base19[] = ['balanced', 'cautious', 'aggressive', 'artist'];
export const ADV19: { id: Adv19; pt: string; en: string }[] = [
  { id: 'spam', pt: 'lança toda música como demo barata', en: 'releases every song as a cheap demo' },
  { id: 'loans', pt: 'pega todo empréstimo que o banco der', en: 'takes every loan the bank offers' },
  { id: 'flip', pt: 'hype máximo (agressivo) e vende o selo no 3º ano', en: 'max hype (aggressive) and sells the label in year 3' },
  { id: 'signall', pt: 'faz proposta a todo artista conhecido', en: 'offers a deal to every known act' },
  { id: 'catalog', pt: 'vende todo master/catálogo que alguém quiser', en: 'sells every master/catalog anyone bids on' },
  { id: 'crime', pt: 'só crime: pirataria, chantagem, desvio', en: 'crime only: bootlegs, blackmail, skimming' },
];
export const START19 = [1889, 1955, 1975, 2005];

export interface Row19 {
  bot: Bot19; seed: string; start: number; years: number; endYear: number;
  bankrupt: boolean; ended?: string;
  /** caixa, líquido (caixa − dívida + bolso do dono) e patrimônio (com valor de venda do selo) em US$ de 2020 */
  cash: number; liquid: number; worth: number;
  fame: number; prestige: number;
  no1: number; scandals: number; deaths: number; echoes: number; crimes: number;
  /** ações do adversário (quantas vezes a estratégia rodou) */
  moves: number; ms: number;
}

// ---------------------------------------------------------------- contagem de histórias (por partida)

interface Cnt { scandals: number; deaths: number; echoes: number; crimes: number }
const CNT = new WeakMap<GameState, Cnt>();
let hooked = false;
function hookFacts(): void {
  if (hooked) return;
  hooked = true;
  onFact('*', (s, f) => {
    const c = CNT.get(s);
    if (!c) return;
    if (f.kind === 'scandal') c.scandals++;
    else if (f.kind === 'death') c.deaths++;
    else if (f.kind === 'echo') c.echoes++;
    else if (f.kind === 'crime' && f.actors[0] === 'player') c.crimes++;
  }, 'balance19:count');
}

// ---------------------------------------------------------------- estratégias adversárias (rodam antes do mês do playbot)

function spam(s: GameState): number {
  let n = 0;
  for (const id of playerActs(s)) for (const sid of s.acts[id]?.songs ?? []) if (!releaseDemo(s, rngOf(s), sid)) n++;
  return n;
}
function loans(s: GameState): number {
  let n = 0;
  while (takeLoan(s)) n++;
  return n;
}
/** agressivo até o mês 30; depois aceita o maior lance líquido pelo selo. Vendido: só cuida das cartas. */
function flip(s: GameState, m: number): number {
  if (m < 30 || sale17(s).sold) return 0;
  const b = makeBids(s).filter((x) => x.expires >= s.week).sort((a, c) => bidNet(s, c).now + bidNet(s, c).later - bidNet(s, a).now - bidNet(s, a).later)[0];
  return b && !sellLabel(s, b.id) ? 1 : 0;
}
function signall(s: GameState): number {
  let n = 0;
  for (const o of s.offers) if (o.status === 'counter' && s.player.cash > o.advance) { acceptCounter(s, o.id); n++; }
  for (const k of Object.values(s.knowledge)) {
    if (careerSlotsUsed(s) >= hqCaps(s).careers + 4) break;
    const a = s.acts[k.actId];
    if (!a || a.owner || s.offers.some((o) => o.actId === a.id && (o.status === 'pending' || o.status === 'counter'))) continue;
    const o = defaultOffer(s, a);
    if (o.advance > s.player.cash * 0.5 || evaluateOffer(s, a, o).band === 'unlikely') continue;
    if (makeOffer(s, o)) n++;
  }
  return n;
}
function catalog(s: GameState): number {
  let n = 0;
  for (const b of [...sale17(s).cat]) if (!sellMaster17(s, b.id)) n++;
  for (const d of [...s.decisions]) if (d.eventId === 'distress_sale' && d.options.some((o) => o.id === 'sell_catalog') && resolveDecision(s, d.id, 'sell_catalog')) n++;
  return n;
}
/** só crime: pirataria contra os 3 atos mais famosos de fora, chantagem no mais famoso, desvio dos próprios. */
function crime(s: GameState): number {
  let n = 0;
  const go = (cid: string, ids: string[]) => {
    for (const target of ids) {
      const ctx = { actor: 'player', target, partners: [] };
      const o = crimeOdds(s, ctx, cid);
      if (o.block || s.player.cash < o.cost * 2) continue;
      const r = commitCrime(s, cid, ctx);
      if (typeof r === 'object' && 'ok' in r) n++;
    }
  };
  go('bootleg', targetsFor(s, crimeById('bootleg')!, 3).map((x) => x.id));
  go('blackmail', targetsFor(s, crimeById('blackmail')!, 1).map((x) => x.id).slice(0, 1));
  go('royalty_skim', playerActs(s));
  return n;
}

// ---------------------------------------------------------------- a partida

/** Patrimônio: valor de venda do selo (valuation17: catálogo + elenco + prestígio + caixa − dívida) se ainda é seu e
 *  não quebrou; senão caixa − dívida. Mais o que entrou no bolso do dono. Assim "vender no 3º ano" (flip) é comparado
 *  com o que o equilibrado conseguiria vendendo, e não só com o caixa dele. */
export function worth19(s: GameState, w0: number, liquid = false): number {
  const debt = s.player.loans.reduce((t, x) => t + x.balance, 0) + (s.creditors ?? []).reduce((t, c) => t + Math.max(0, c.owed), 0);
  const firm = !liquid && hasLabel(s) && !s.ended ? valuation17(s).total : s.player.cash - debt;
  return Math.round(toReal(firm + (ownerOf(s).wealth - w0), s.year));
}

export const runBot19 = (o: { bot: Bot19; start: number; seed: string; years: number }): Row19 => playBot19(o).row;
/** A partida inteira (estado final + linha), para diagnóstico. */
export function playBot19(o: { bot: Bot19; start: number; seed: string; years: number }): { s: GameState; row: Row19 } {
  hookFacts();
  const t = Date.now();
  const role = o.bot === 'artist' ? 'artist' : 'label';
  const s = createGame(defaultConfig(o.seed, { startYear: o.start, role, bandGenre: 'rnr', bandName: 'Banda Teste' }));
  const c: Cnt = { scandals: 0, deaths: 0, echoes: 0, crimes: 0 };
  CNT.set(s, c);
  const w0 = ownerOf(s).wealth;
  const prof: Profile = o.bot === 'cautious' || o.bot === 'aggressive' ? o.bot : o.bot === 'flip' ? 'aggressive' : 'balanced';
  let moves = 0;
  for (let m = 0; m < o.years * 12 && !s.ended; m++) {
    switch (o.bot) {
      case 'spam': moves += spam(s); break;
      case 'loans': moves += loans(s); break;
      case 'flip': moves += flip(s, m); break;
      case 'signall': moves += signall(s); break;
      case 'catalog': moves += catalog(s); break;
      case 'crime': moves += crime(s); break;
    }
    if (o.bot === 'crime' || (o.bot === 'flip' && sale17(s).sold)) { for (const d of [...s.decisions]) resolveDecision(s, d.id, pickOption(s, d, PROFILES.cautious)); }
    else playMonth(s, prof);
    advanceMonth(s);
  }
  return { s, row: {
    bot: o.bot, seed: o.seed, start: o.start, years: o.years, endYear: s.year, ended: s.ended?.ending, bankrupt: !!s.ended && s.ended.ending !== 'arc',
    cash: Math.round(toReal(s.player.cash, s.year)), liquid: worth19(s, w0, true), worth: worth19(s, w0),
    fame: Math.round(playerFame(s)), prestige: Math.round(s.player.reputation.artistic),
    no1: s.player.stats.number1s, ...c, moves, ms: Date.now() - t,
  } };
}

// ---------------------------------------------------------------- resumo

export const q19 = (xs: number[], p: number): number => {
  if (!xs.length) return 0;
  const a = [...xs].sort((x, y) => x - y);
  const i = (a.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return Math.round(a[lo] + (a[hi] - a[lo]) * (i - lo));
};
export interface Sum19 { bot: Bot19; n: number; bankrupt: number; cash: [number, number, number]; liquid: [number, number, number]; worth: [number, number, number]; fame: number; prestige: number; no1: number; scandals: number; deaths: number; echoes: number; crimes: number; moves: number }
export function summarize19(rows: Row19[]): Sum19 {
  const m = (f: (r: Row19) => number) => q19(rows.map(f), 0.5);
  const tri = (f: (r: Row19) => number): [number, number, number] => [q19(rows.map(f), 0.25), q19(rows.map(f), 0.5), q19(rows.map(f), 0.75)];
  return { bot: rows[0]?.bot ?? 'balanced', n: rows.length, bankrupt: rows.filter((r) => r.bankrupt).length / Math.max(1, rows.length),
    cash: tri((r) => r.cash), liquid: tri((r) => r.liquid), worth: tri((r) => r.worth), fame: m((r) => r.fame), prestige: m((r) => r.prestige),
    no1: m((r) => r.no1), scandals: m((r) => r.scandals), deaths: m((r) => r.deaths), echoes: m((r) => r.echoes), crimes: m((r) => r.crimes), moves: m((r) => r.moves) };
}
/** Exploit = patrimônio mediano ≥ 2× o do equilibrado (mesmas sementes/inícios) e +US$ 50 mil, sem quebrar mais.
 *  `cash` = alerta mais fraco: o LÍQUIDO (dinheiro na mão) ≥ 2× e +US$ 100 mil — pega quem enriquece sem construir selo
 *  (crime, empréstimo); vender o selo sempre acende este alerta, por isso o veredito usa o patrimônio. */
export function exploit19(adv: Sum19, base: Sum19): { flag: boolean; ratio: number; cash: boolean; cratio: number } {
  const r = (a: number, b: number) => Math.round((b > 0 ? a / b : a > 0 ? 99 : 0) * 100) / 100;
  const ok = adv.bankrupt <= base.bankrupt + 0.01;
  const b = base.worth[1], a = adv.worth[1], bl = base.liquid[1], al = adv.liquid[1];
  return { flag: ok && a - b > 50000 && (b <= 0 || a >= 2 * b), ratio: r(a, b), cash: ok && al - bl > 100000 && (bl <= 0 || al >= 2 * bl), cratio: r(al, bl) };
}
