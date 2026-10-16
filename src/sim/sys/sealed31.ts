// R31 · onda 4 (T2) — LEILÃO DE CATÁLOGOS E MASTERS COM PROPOSTA FECHADA (envelope). Interruptor 't31.sealed'.
//
// De onde vêm os lotes (fontes únicas do jogo; nada de catálogo paralelo — o dono de um master é sempre `release.owner`):
//  • DONO QUEBRA / banco executa / títulos em calote → o leilão de masters do money19 (Auc19) vira proposta fechada:
//    o seu lance é um envelope secreto que só entra na mesa na abertura (gancho SEAL19), e o envelope de cada rival é o
//    maior valor que ele decidiu pôr no prazo (a regra de sempre do money19, no fluxo rng19 'money19'). Sem o seu
//    envelope, o resultado é idêntico ao de antes (mesmo fluxo, mesmo vencedor).
//  • MORRE SEM HERDEIRO → masters independentes de quem morreu sem parente vivo (a mesma regra de herdeiros do espólio,
//    post18/kin15) vão a proposta fechada pelo juízo; o dinheiro fica com o Estado.
//  • VENDE O CATÁLOGO → você põe masters seus em proposta fechada (a sala de abertura); recebe o maior envelope.
//  • EMPRESA DESMONTADA → o desinvestimento sem comprador (industry/corp) manda o catálogo para a proposta fechada.
//  Nas três últimas, rivais NPC decidem o envelope por regra determinística no fluxo rng19 'sealed31' (só na abertura,
//  na virada do mês): selo que compra catálogo paga acima do justo, conglomerado e selo de astros perto do justo, fundos
//  conforme o apetite dos juros (rates19); ninguém põe mais que 60% do caixa.
// O jogador vê só pistas sobre quem está na mesa, conforme quem conhece (know.ts) e a opinião deles (opinion.ts).
// O antitruste de compra (w31.antitrust) vale: a partir de 1950, um envelope que faria você passar de 40% do catálogo
// do mercado (unidades vendidas) é anulado — o motivo aparece antes de entregar.
// Geração e abertura no motor (virada do mês); a cena só lê. Estado: x4.sealed31.

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerDeadline } from '../calendar19';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { know, know3 } from '../know';
import { cashWhy20, freeCash20 } from '../oblig20';
import { opinionOf, shiftOpinion } from '../opinion';
import { fundAppetite19 } from '../rates19';
import { rng19 } from '../rng19';
import { registerEditable, registerRunnable } from '../r31/editor';
import { SPLIT31 } from '../r31/hooks31t2';
import { registerSwitch, sw } from '../r31/switches';
import { ANTI_SHARE31, SW_ANTI31 } from '../r31/w31';
import { releasesNow27 } from '../tickcache27';
import type { GameState, Release } from '../types';
import { fmtL, money, notify, post } from '../util';
import { kinOf15 } from './kin15';
import { leaderOf } from './leaders10';
import { m19, SEAL19, type Auc19 } from './money19';
import { EST_HEIRS29 } from './post18';
import { eraMultiple, relIncome } from './sale17';

// ---------------------------------------------------------------- interruptor e estado

export const SW_SEALED31 = 't31.sealed';
registerSwitch({
  id: SW_SEALED31, def: true, scope: 'game',
  desc: l('Proposta fechada (onda 4): catálogos e masters vão a leilão por envelope secreto — dono que quebra, morre sem herdeiro, vende o catálogo ou empresa desmontada; abertura em cena, com pistas de quem você conhece.',
    'Sealed bids (wave 4): catalogs and masters go to auction by secret envelope — an owner who goes bust, dies without an heir, sells the catalog or a dismantled company; opening on stage, with hints from people you know.'),
});
export const sealedOn31 = (s: GameState): boolean => sw<boolean>(s, SW_SEALED31);

export type Cause31 = Auc19['cause'] | 'estate' | 'sale' | 'split';
export const CAUSE31: Record<Cause31, L> = {
  bankrupt: l('o dono quebrou', 'the owner went bust'),
  bank: l('o banco executou a dívida', 'the bank foreclosed'),
  bond: l('títulos em calote', 'defaulted bonds'),
  estate: l('morreu sem herdeiro', 'died without an heir'),
  sale: l('venda do catálogo', 'catalog sale'),
  split: l('empresa desmontada', 'dismantled company'),
};
export interface Env31 {
  /** 'player', id de selo ou 'fund:<nome>' */
  who: string;
  name: string;
  amt: number;
  /** anulado: antitruste ou caixa */
  dq?: 'anti' | 'cash';
  win?: 1;
}
export interface Tender31 {
  id: string;
  /** 'auc19' = leilão do money19 em envelope; 'own' = aberto por esta regra */
  src: 'auc19' | 'own';
  cause: Cause31;
  /** dono de origem: id do selo, 'player', 'estate:<pid>' ou o credor */
  from: string;
  name: string;
  rels: string[];
  fair: number;
  /** preço mínimo publicado no edital */
  ask: number;
  /** semana da abertura */
  ends: number;
  y: number;
  st: 'open' | 'done';
  /** envelopes na ordem em que foram abertos (do menor para o maior) */
  env?: Env31[];
  win?: string;
  winName?: string;
  price?: number;
}
export interface Sealed31State {
  own: Tender31[];
  /** seu envelope por edital (valor secreto; um só) */
  mine: Record<string, { amt: number; w: number }>;
  /** atas de abertura (as últimas 16) */
  done: Tender31[];
  /** mortos à espera da checagem de herdeiros na virada do mês */
  dead: string[];
  seq: number;
  log: [number, L][];
  /** editor: semanas entre o edital e a abertura */
  weeks?: number;
}
declare module '../ext4' { interface Ext4 { sealed31: Sealed31State } }
const fresh = (): Sealed31State => ({ own: [], mine: {}, done: [], dead: [], seq: 0, log: [] });
registerExt4('sealed31', fresh);
export function sealed31(s: GameState): Sealed31State {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.sealed31 ??= fresh()) as Sealed31State;
  st.own ??= []; st.mine ??= {}; st.done ??= []; st.dead ??= []; st.seq ??= 0; st.log ??= [];
  return st;
}
const peek = (s: GameState): Sealed31State | undefined => (s.x4 as unknown as { sealed31?: Sealed31State }).sealed31;
const logS = (s: GameState, t: L): void => { const st = sealed31(s); st.log.push([s.week, t]); if (st.log.length > 30) st.log.splice(0, st.log.length - 30); };
export const WEEKS31 = 8;
const isLabel = (s: GameState): boolean => s.config.role !== 'artist';
const fairOf = (s: GameState, ids: string[]): number => Math.round(ids.reduce((t, id) => t + relIncome(s, id), 0) * eraMultiple(s).m * 0.75);
const FUNDS31 = ['Meridian Capital', 'Harbor Songs Fund', 'Atlas Catalog Trust', 'Cobalt Rights', 'Evergreen Royalty Partners', 'Northgate Music Income'];

// ---------------------------------------------------------------- editais abertos (leitura)

const fromAuc = (s: GameState, a: Auc19): Tender31 => ({ id: a.id, src: 'auc19', cause: a.cause, from: a.from, name: a.name, rels: a.rels, fair: a.fair, ask: a.ask, ends: a.ends, y: a.y, st: 'open' });
/** Editais abertos agora (leilões do money19 em envelope + os desta regra), do mais próximo da abertura. */
export function tenders31(s: GameState): Tender31[] {
  if (!sealedOn31(s)) return [];
  const a = m19(s).auc.filter((x) => x.st === 'open').map((x) => fromAuc(s, x));
  const o = (peek(s)?.own ?? []).filter((x) => x.st === 'open');
  return [...a, ...o].sort((x, y) => x.ends - y.ends || (x.id < y.id ? -1 : 1));
}
export const tender31 = (s: GameState, id: string): Tender31 | undefined =>
  tenders31(s).find((x) => x.id === id) ?? peek(s)?.done.find((x) => x.id === id);
export const myEnvelope31 = (s: GameState, id: string): number => peek(s)?.mine[id]?.amt ?? 0;

// ---------------------------------------------------------------- antitruste (w31.antitrust)

export interface CatAnti31 { before: number; after: number; blocked: boolean }
/** Sua fatia do catálogo do mercado (unidades vendidas de masters com dono) antes e depois de levar `rels`. */
export function catAnti31(s: GameState, rels: string[]): CatAnti31 {
  let tot = 0, mine = 0;
  for (const r of releasesNow27(s)) {
    if (r.owner === 'indie') continue;
    tot += r.totalUnits;
    if (r.owner === 'player') mine += r.totalUnits;
  }
  const add = rels.reduce((t, id) => { const r = s.releases[id]; return t + (r && r.owner !== 'player' ? r.totalUnits : 0); }, 0);
  const extra = rels.reduce((t, id) => { const r = s.releases[id]; return t + (r && r.owner === 'indie' ? r.totalUnits : 0); }, 0);
  const before = tot > 0 ? mine / tot : 0;
  const after = tot + extra > 0 ? (mine + add) / (tot + extra) : 0;
  return { before, after, blocked: sw<boolean>(s, SW_ANTI31) && s.year >= 1950 && after > ANTI_SHARE31 && after > before };
}
export const antiWhy31 = (a: CatAnti31): L => fmtL(l('O órgão antitruste anularia o envelope: você passaria a ter {p}% do catálogo do mercado (teto 40%).', 'The antitrust authority would void the envelope: you would hold {p}% of the market\'s catalog (cap 40%).'), { p: Math.round(a.after * 100) });

// ---------------------------------------------------------------- seu envelope

/** Motivo para não poder entregar o envelope (null = pode). */
export function envLock31(s: GameState, id: string, amt: number): L | null {
  if (!sealedOn31(s)) return l('A proposta fechada está desligada nesta partida.', 'Sealed bids are off in this game.');
  if (!isLabel(s)) return l('Só gravadoras compram masters.', 'Only labels buy masters.');
  const t = tenders31(s).find((x) => x.id === id);
  if (!t) return l('Edital encerrado.', 'Tender closed.');
  if (t.from === 'player') return l('O catálogo é seu: você não entrega envelope no próprio edital.', 'The catalog is yours: you cannot bid on your own tender.');
  if (peek(s)?.mine[id]) return l('Você já entregou o seu envelope: a proposta é única e não volta.', 'You already delivered your envelope: the bid is single and final.');
  if (amt < t.ask) return fmtL(l('Abaixo do mínimo do edital ({m}).', 'Below the tender minimum ({m}).'), { m: money$(t.ask) });
  const an = catAnti31(s, t.rels);
  if (an.blocked) return antiWhy31(an);
  return freeCash20(s) >= amt ? null : cashWhy20(s, amt, l('Caixa livre não cobre o envelope.', 'Free cash does not cover the envelope.'));
}
const money$ = (c: number): string => `$${Math.round(c / 100).toLocaleString('en-US')}`;
/** Entregar o envelope (único e secreto). */
export function deliver31(s: GameState, id: string, amt: number): L | null {
  const a = Math.round(amt);
  const lk = envLock31(s, id, a);
  if (lk) return lk;
  sealed31(s).mine[id] = { amt: a, w: s.week };
  const t = tenders31(s).find((x) => x.id === id)!;
  logS(s, fmtL(l('Envelope entregue no edital de {n}.', 'Envelope delivered for the {n} tender.'), { n: t.name }));
  return null;
}
SEAL19.bid = (s, a, amt) => (sealedOn31(s) ? deliver31(s, a.id, amt) : undefined);

// ---------------------------------------------------------------- pistas (know.ts + opinion.ts)

export interface Party31 { who: string; name: L; kind: 'label' | 'fund'; key?: string; k: 0 | 1 | 2 | 3; hints: L[] }
const leaderKey = (s: GameState, lbId: string): string | undefined => { const x = leaderOf(s, lbId); return x ? `l:${x.id}` : undefined; };
const k3 = (s: GameState, key?: string): 0 | 1 | 2 | 3 => { if (!key) return 0; try { return know3(know(s, key)); } catch { return 0; } };
/** Quem tende a disputar um edital (puro): selos que compram catálogo, conglomerados e selos de astros com caixa, e fundos. */
function eligible(s: GameState, t: Pick<Tender31, 'from' | 'ask'>): { who: string; name: string; kind: 'label' | 'fund'; strat: string; cash: number }[] {
  const out: { who: string; name: string; kind: 'label' | 'fund'; strat: string; cash: number }[] = [];
  for (const lb of Object.values(s.labels)) {
    if (!lb.active || lb.id === t.from || !(lb.strategy === 'buy_catalog' || lb.family === 'A' || lb.strategy === 'stars')) continue;
    if (lb.cash * 0.6 < t.ask) continue;
    out.push({ who: lb.id, name: lb.name, kind: 'label', strat: lb.strategy, cash: lb.cash });
  }
  out.sort((a, b) => b.cash - a.cash || (a.who < b.who ? -1 : 1));
  return out.slice(0, 5); // os cinco com mais caixa disputam (mesa de abertura com lugar para todos)
}
/** Quem está na mesa (sem valores): no leilão do money19, quem já pôs envelope; nos demais, quem costuma disputar. */
export function parties31(s: GameState, t: Tender31): Party31[] {
  const ws: { who: string; name: string; kind: 'label' | 'fund' }[] = [];
  if (t.src === 'auc19') {
    const a = m19(s).auc.find((x) => x.id === t.id);
    for (const b of a?.bids ?? []) if (b.who !== 'player' && !ws.some((x) => x.who === b.who)) ws.push({ who: b.who, name: b.name, kind: s.labels[b.who] ? 'label' : 'fund' });
  } else for (const x of eligible(s, t).slice(0, 5)) ws.push(x);
  if (t.src === 'own' && fundAppetite19(s) >= 0.9) ws.push({ who: 'fund:*', name: '', kind: 'fund' });
  return ws.map((x) => {
    if (x.kind === 'fund') {
      const ap = fundAppetite19(s);
      return { who: x.who, name: x.name ? l(x.name, x.name) : l('Um fundo de catálogo', 'A catalog fund'), kind: 'fund', k: 0, hints: [ap >= 1.15 ? l('Juros baixos: os fundos estão com apetite.', 'Low rates: the funds are hungry.') : ap <= 0.85 ? l('Juros altos: os fundos pagam pouco.', 'High rates: the funds pay little.') : l('Fundos pagam pelo rendimento do catálogo.', 'Funds pay for the catalog\'s income.')] } as Party31;
    }
    const lb = s.labels[x.who];
    const key = leaderKey(s, x.who);
    const k = k3(s, key);
    const hints: L[] = [];
    const lead = key ? leaderOf(s, x.who) : undefined;
    if (k === 0) hints.push(l('Você não conhece quem manda lá: só um envelope com timbre.', 'You do not know who runs it: just an envelope with a letterhead.'));
    if (k >= 1 && lb) hints.push(lb.strategy === 'buy_catalog' ? l('Vive de comprar catálogo: costuma pagar acima do justo.', 'Lives off buying catalogs: usually pays above fair.') : l('Costuma pagar perto do justo.', 'Usually pays close to fair.'));
    if (k >= 2 && lb) hints.push(lb.cash * 0.6 >= t.fair * 1.2 ? l('Tem caixa de sobra para este lote.', 'Has plenty of cash for this lot.') : l('O caixa está apertado para este lote.', 'Cash is tight for this lot.'));
    if (k >= 1 && key) { const op = opinionOf(s, key); if (op <= -20) hints.push(l('Quer muito ver você perder.', 'Really wants to see you lose.')); else if (op >= 30) hints.push(l('Gosta de você: não vai brigar por centavos.', 'Likes you: will not fight over pennies.')); }
    return { who: x.who, name: k >= 1 && lead ? l(`${lead.name} (${lb?.name ?? ''})`, `${lead.name} (${lb?.name ?? ''})`) : l(lb?.name ?? x.name, lb?.name ?? x.name), kind: 'label', key, k, hints };
  });
}

// ---------------------------------------------------------------- abertura (motor)

/** Envelope de um rival (regra determinística no fluxo 'sealed31'); 0 = não disputa. */
function npcEnvelopes(s: GameState, t: Tender31): Env31[] {
  const r = rng19(s, 'sealed31');
  const out: Env31[] = [];
  for (const x of eligible(s, t)) {
    if (!r.chance(x.strat === 'buy_catalog' ? 0.8 : 0.45)) continue;
    const f = x.strat === 'buy_catalog' ? r.float(0.95, 1.2) : r.float(0.75, 1.05);
    const amt = Math.round(Math.min(x.cash * 0.6, t.fair * f));
    if (amt >= t.ask) out.push({ who: x.who, name: x.name, amt });
  }
  const ap = fundAppetite19(s);
  if (r.chance(clamp(0.25 * ap + 0.15, 0.1, 0.6))) {
    const amt = Math.round(t.fair * ap * r.float(0.8, 1.05));
    const name = FUNDS31[r.int(0, FUNDS31.length - 1)];
    if (amt >= t.ask) out.push({ who: `fund:${name}`, name, amt });
  }
  return out;
}
/** O seu envelope na hora da abertura (anulado se o caixa não cobre ou se o antitruste veta). */
function playerEnv(s: GameState, t: Tender31): Env31 | null {
  const e = peek(s)?.mine[t.id];
  if (!e) return null;
  const env: Env31 = { who: 'player', name: s.config.companyName, amt: e.amt };
  if (catAnti31(s, t.rels).blocked) env.dq = 'anti';
  else if (s.player.cash < e.amt) env.dq = 'cash';
  return env;
}
function record(s: GameState, t: Tender31, env: Env31[], win?: Env31): void {
  const st = sealed31(s);
  const order = [...env].sort((a, b) => a.amt - b.amt || (a.who < b.who ? -1 : 1));
  if (win) { const w = order.find((x) => x === win); if (w) w.win = 1; }
  const done: Tender31 = { ...t, st: 'done', env: order, win: win?.who, winName: win?.name, price: win?.amt };
  st.done.unshift(done);
  if (st.done.length > 16) st.done.length = 16;
  delete st.mine[t.id];
  if (env.some((x) => x.who === 'player')) {
    const me = env.find((x) => x.who === 'player')!;
    if (me.dq === 'anti') notify(s, fmtL(l('Envelope anulado pelo antitruste no edital de {n}.', 'Envelope voided by antitrust in the {n} tender.'), { n: t.name }), 'bad');
    else if (me.dq === 'cash') notify(s, fmtL(l('Envelope anulado: o caixa não cobria a proposta ({n}).', 'Envelope voided: cash did not cover the bid ({n}).'), { n: t.name }), 'bad');
    else if (win?.who === 'player') notify(s, fmtL(l('Abertura dos envelopes: o catálogo de {n} é seu por {v}.', 'Envelope opening: the {n} catalog is yours for {v}.'), { n: t.name, v: money$(win.amt) }), 'good');
    else notify(s, fmtL(l('Abertura dos envelopes: o catálogo de {n} foi para {w}.', 'Envelope opening: the {n} catalog went to {w}.'), { n: t.name, w: win?.name ?? l('ninguém', 'nobody') }), 'info');
  }
  // quem queria muito e perdeu para você: opinião pior (o líder do selo que deu o segundo maior envelope)
  if (win?.who === 'player') {
    const second = order.filter((x) => x.who !== 'player' && !x.dq && s.labels[x.who]).pop();
    const key = second ? leaderKey(s, second.who) : undefined;
    if (key) shiftOpinion(s, key, -6, { why: fmtL(l('Perdeu o catálogo de {n} para você na abertura dos envelopes', 'Lost the {n} catalog to you at the envelope opening'), { n: t.name }) });
  }
}

/** money19: entra o seu envelope na mesa (os rivais não o viram) e anota a ordem de abertura. */
const PEND = new WeakMap<GameState, Map<string, Env31[]>>();
SEAL19.close = (s, a) => {
  if (!sealedOn31(s)) return;
  const t = fromAuc(s, a);
  const best = new Map<string, Env31>();
  for (const b of a.bids) if (b.who !== 'player') { const o = best.get(b.who); if (!o || b.amt > o.amt) best.set(b.who, { who: b.who, name: b.name, amt: b.amt }); }
  const env = [...best.values()];
  const me = playerEnv(s, t);
  if (me) { env.push(me); if (!me.dq) a.bids.push({ who: 'player', name: me.name, amt: me.amt, w: s.week }); }
  let m = PEND.get(s);
  if (!m) { m = new Map(); PEND.set(s, m); }
  m.set(a.id, env);
};
SEAL19.after = (s, a) => {
  const env = PEND.get(s)?.get(a.id);
  if (!env) return;
  PEND.get(s)!.delete(a.id);
  const win = a.st === 'sold' ? env.find((x) => x.who === a.win && x.amt === a.price) ?? env.find((x) => x.who === a.win) : undefined;
  record(s, fromAuc(s, a), env, win);
};

/** Abre um edital desta regra: rivais decidem o envelope agora; o maior leva (paga o que escreveu). */
export function openEnvelopes31(s: GameState, t: Tender31): Env31 | undefined {
  if (t.src !== 'own' || t.st !== 'open') return undefined;
  const env = npcEnvelopes(s, t);
  const me = playerEnv(s, t);
  if (me) env.push(me);
  const valid = env.filter((x) => !x.dq && x.amt >= t.ask).sort((a, b) => b.amt - a.amt || (a.who === 'player' ? -1 : b.who === 'player' ? 1 : a.who < b.who ? -1 : 1));
  const win = valid[0];
  t.st = 'done';
  sealed31(s).own = sealed31(s).own.filter((x) => x !== t);
  const rels = t.rels.map((id) => s.releases[id]).filter((r): r is Release => !!r);
  if (win) {
    for (const rel of rels) {
      if (win.who === 'player') { rel.owner = 'player'; if (!rel.live) { rel.live = true; rel.week = s.week - 60; rel.appeal *= 0.15; } }
      else if (s.labels[win.who]) rel.owner = win.who;
      else { rel.owner = 'indie'; m19(s).funds[rel.id] = win.name; }
    }
    if (win.who === 'player') post(s, `sealed31:${t.id}`, -win.amt, 'acquisitions', `Proposta fechada: ${t.name}`);
    else if (s.labels[win.who]) s.labels[win.who].cash -= win.amt;
    if (t.from === 'player') post(s, `sealed31sale:${t.id}`, win.amt, 'asset_sales', `Venda do catálogo por envelope (${rels.length} masters)`);
    else if (s.labels[t.from]) s.labels[t.from].cash += win.amt;
  } else if (t.cause === 'split') for (const rel of rels) if (rel.owner === t.from) rel.owner = 'indie';
  record(s, t, env, win);
  const tx = win
    ? fmtL(l('Abertura dos envelopes ({c}): {w} leva {k} master(s) de {n} por {p} (valor justo {f}).', 'Envelope opening ({c}): {w} takes {k} master(s) from {n} for {p} (fair value {f}).'), { c: CAUSE31[t.cause], w: win.name, k: rels.length, n: t.name, p: money$(win.amt), f: money$(t.fair) })
    : fmtL(l('Abertura dos envelopes ({c}): nenhum envelope chegou ao mínimo; os masters de {n} ficam onde estão.', 'Envelope opening ({c}): no envelope reached the minimum; {n}\'s masters stay where they are.'), { c: CAUSE31[t.cause], n: t.name });
  logS(s, tx);
  if (win || env.some((x) => x.who === 'player') || t.from === 'player')
    emitFact(s, { kind: 'master_auction', actors: [win?.who === 'player' ? 'player' : win?.who ?? t.from, ...new Set(rels.map((r) => r.actId))].slice(0, 4), severity: win && win.amt > money(s, 200000) ? 55 : 40, visibility: 'public',
      tags: ['money', 'catalog', 'sealed31', t.cause, ...(env.some((x) => x.who === 'player') ? ['player_bid'] : [])], text: tx, src: 'sealed31', data: { auc: t.id, win: win?.who ?? '', from: t.from } });
  return win;
}

/** Abre um edital desta regra (lote de até 12 masters, ordenados pelo rendimento). */
export function openTender31(s: GameState, cause: Exclude<Cause31, Auc19['cause']>, from: string, name: string, rels: Release[]): Tender31 | null {
  const st = sealed31(s);
  const ids = rels.filter((r) => r && r.totalUnits > 0).sort((a, b) => relIncome(s, b.id) - relIncome(s, a.id) || (a.id < b.id ? -1 : 1)).slice(0, 12).map((r) => r.id);
  const fair = fairOf(s, ids);
  if (!ids.length || fair < money(s, 4000)) return null;
  if (st.own.some((x) => x.st === 'open' && x.rels.some((id) => ids.includes(id)))) return null;
  const t: Tender31 = { id: `t31:${++st.seq}`, src: 'own', cause, from, name, rels: ids, fair, ask: Math.round(fair * (cause === 'sale' ? 0.6 : 0.45)), ends: s.week + (st.weeks ?? WEEKS31), y: s.year, st: 'open' };
  st.own.push(t);
  const tx = fmtL(l('Edital de proposta fechada ({c}): {k} master(s) de {n}, valor justo {f}; abertura em {w} semanas.', 'Sealed tender ({c}): {k} master(s) from {n}, fair value {f}; opening in {w} weeks.'), { c: CAUSE31[cause], k: ids.length, n: name, f: money$(fair), w: t.ends - s.week });
  logS(s, tx);
  if (cause !== 'sale') emitFact(s, { kind: 'deal', actors: [from.startsWith('estate:') ? 'market' : from], severity: 30, visibility: 'public', tags: ['catalog', 'sealed31', cause], text: tx, src: 'sealed31', data: { t: t.id } });
  return t;
}

// ---------------------------------------------------------------- fontes: morre sem herdeiro · vende o catálogo · empresa desmontada

/** Sem herdeiro: nenhum parente vivo (filho, cônjuge, irmão, pai/mãe) nem herdeiro registrado pela família (a regra do espólio). */
export function noHeir31(s: GameState, pid: string): boolean {
  const kin = kinOf15(s, pid).filter((k) => k.p.alive && ['child', 'spouse', 'sibling', 'parent'].includes(k.rel));
  return !kin.length && !(EST_HEIRS29.f?.(s, pid) ?? []).length;
}
/** Masters independentes de um morto sem herdeiro (ato em que todos já morreram; master sem dono de selo nem de fundo). */
export function heirless31(s: GameState, pid: string): Release[] {
  const p = s.persons[pid];
  if (!p || p.alive || p.isPlayer || !noHeir31(s, pid)) return [];
  const funds = m19(s).funds;
  const acts = Object.values(s.acts).filter((a) => a.members.includes(pid) && a.owner !== 'player' && !a.playerBand && a.members.every((m) => !s.persons[m]?.alive));
  return acts.flatMap((a) => a.releases.map((id) => s.releases[id])).filter((r): r is Release => !!r && r.owner === 'indie' && !funds[r.id]);
}
onFact('death', (s, f) => {
  if (!sealedOn31(s)) return;
  const st = sealed31(s);
  for (const a of f.actors) if (s.persons[a] && !st.dead.includes(a)) st.dead.push(a);
  if (st.dead.length > 40) st.dead.splice(0, st.dead.length - 40);
}, 'sealed31:death');

/** Masters seus que podem ir a proposta fechada (fora de penhor, título e banda própria). */
export function sellable31(s: GameState): Release[] {
  const st = m19(s);
  const tied = new Set([...st.lien, ...st.bonds.filter((b) => b.st === 'live').flatMap((b) => b.rels)]);
  const busy = new Set((peek(s)?.own ?? []).filter((x) => x.st === 'open').flatMap((x) => x.rels));
  return releasesNow27(s).filter((r) => r.owner === 'player' && r.totalUnits > 0 && !tied.has(r.id) && !busy.has(r.id) && !s.acts[r.actId]?.playerBand)
    .sort((a, b) => relIncome(s, b.id) - relIncome(s, a.id) || (a.id < b.id ? -1 : 1));
}
export function sellLock31(s: GameState, ids: string[]): L | null {
  if (!sealedOn31(s)) return l('A proposta fechada está desligada nesta partida.', 'Sealed bids are off in this game.');
  if (!isLabel(s)) return l('Na carreira de artista você não tem catálogo para vender.', 'As an artist you have no catalog to sell.');
  const ok = new Set(sellable31(s).map((r) => r.id));
  if (!ids.length || ids.some((id) => !ok.has(id))) return l('Escolha masters seus fora de penhor e de títulos.', 'Pick masters of yours that are not pledged or bonded.');
  if (fairOf(s, ids) < money(s, 4000)) return l('Lote pequeno demais para um edital.', 'Lot too small for a tender.');
  return null;
}
/** Vender o catálogo por envelope: abre o edital agora; a abertura é no motor. */
export function sellCatalog31(s: GameState, ids: string[]): L | null {
  const lk = sellLock31(s, ids);
  if (lk) return lk;
  const t = openTender31(s, 'sale', 'player', s.config.companyName, ids.map((id) => s.releases[id]));
  return t ? null : l('Lote pequeno demais para um edital.', 'Lot too small for a tender.');
}
SPLIT31.f = (s, lbId, rels) => {
  if (!sealedOn31(s)) return false;
  return !!openTender31(s, 'split', lbId, s.labels[lbId]?.name ?? lbId, rels.map((id) => s.releases[id]).filter((r): r is Release => !!r));
};

/** Virada do mês: checa herdeiros dos mortos e abre os envelopes vencidos. */
export function sealedMonth31(s: GameState): void {
  const st = peek(s);
  if (!st || !sealedOn31(s)) return;
  for (const pid of st.dead.splice(0)) {
    const rels = heirless31(s, pid);
    if (rels.length) openTender31(s, 'estate', `estate:${pid}`, s.persons[pid]?.name ?? pid, rels);
  }
  for (const t of [...st.own]) if (t.st === 'open' && s.week >= t.ends) openEnvelopes31(s, t);
}
registerSimHook('month', 'sealed31', (s) => { sealedMonth31(s); });

// ---------------------------------------------------------------- calendário e editor

registerDeadline('sealed31', (s, from, to) => {
  if (!peek(s) && !m19(s).auc.length) return [];
  return tenders31(s).filter((t) => t.ends >= from && t.ends <= to).map((t) => {
    const mine = !!peek(s)?.mine[t.id] || t.from === 'player';
    return { id: `sealed31:${t.id}`, w: t.ends, kind: 'other' as const, tone: mine ? 'bad' as const : 'info' as const, act: mine || undefined,
      t: fmtL(l('Abertura dos envelopes: {n}', 'Envelope opening: {n}'), { n: t.name }),
      d: mine ? l('Você tem envelope ou catálogo neste edital.', 'You have an envelope or a catalog in this tender.') : fmtL(l('{k} master(s) · {c}', '{k} master(s) · {c}'), { k: t.rels.length, c: CAUSE31[t.cause] }),
      goto: { area: 'sealed31' } };
  });
});
registerEditable({
  id: 'sealed31.weeks', area: 'companies', kind: 'number', min: 2, max: 26, step: 1, label: l('Proposta fechada: semanas até a abertura', 'Sealed bids: weeks until opening'),
  help: l('Prazo dos editais abertos por esta regra (morte sem herdeiro, venda do catálogo, empresa desmontada).', 'Deadline of the tenders opened by this rule (death without an heir, catalog sale, dismantled company).'),
  get: (s) => peek(s)?.weeks ?? WEEKS31, set: (s, v) => { sealed31(s).weeks = clamp(Math.round(Number(v)), 2, 26); },
});
registerRunnable({
  id: 'sealed31.open', area: 'companies', label: l('Proposta fechada: abrir os envelopes do próximo edital agora', 'Sealed bids: open the next tender\'s envelopes now'),
  run: (s) => {
    const t = (peek(s)?.own ?? []).find((x) => x.st === 'open');
    if (!t) return { ok: false, text: l('Nenhum edital desta regra aberto (os do banco abrem no fechamento do mês).', 'No tender of this rule is open (the bank\'s open at the month close).') };
    const w = openEnvelopes31(s, t);
    return fmtL(l('Envelopes abertos: {w}.', 'Envelopes opened: {w}.'), { w: w?.name ?? l('sem vencedor', 'no winner') });
  },
});
