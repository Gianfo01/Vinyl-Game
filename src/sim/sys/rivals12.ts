// Rivais respondem à vista (rodada 12). Os selos disputam os mesmos recursos que você — e cada resposta
// vira notícia e aviso na tela certa, com escolha e consequência:
//  - talento: guerra de lances ("subiu a oferta depois da sua"), em ofertas pendentes e leilões;
//  - janela de lançamento: antecipa um single para a semana do seu (estende o date_move do rivals8);
//  - produtor disputado: reserva o produtor que você usa (fica ocupado — furar a fila custa);
//  - mercado regional: ofensiva num mercado onde você está (apelo menor lá até você reagir);
//  - catálogo à venda: selos de catálogo cobrem o seu lance no leilão;
//  - vaga de festival: um artista do rival disputa a sua faixa no line-up.
// Relações ambíguas: o mesmo rival pode distribuir seus discos num mercado onde você não está (paga um
// mínimo garantido) e ao mesmo tempo disputar artistas — cada confronto com o parceiro sobe a tensão,
// e a 100 ele rompe o acordo. Usa o manual (rivals8), o líder (leaders10) e o prestígio (standing9).

import { clamp, Rng } from '../../core/rng';
import { FESTIVALS } from '../../data/catalog';
import { cityById, familyOf, l, marketById, type L, type MarketId } from '../../data/world';
import { bidCatalog } from '../business';
import { signWithRival } from '../contracts';
import { raiseBid, withdrawAuction } from '../discovery';
import { registerExt4, registerMod, registerOfferMod, registerSimHook } from '../ext4';
import { launchNpcRelease } from '../market';
import { unreleasedRecorded } from '../production';
import { PRODUCERS } from '../studio';
import type { GameState, Label } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { chron } from './chron9';
import { editionOf, fest8, TIER_ORDER } from './fests8';
import { leaderOf } from './leaders10';
import { logMove, moveText as moveTxt, playbookOf, rivals8, type PlaybookId } from './rivals8';
import { standingOf, standingScore } from './standing9';
import { skipBlockedLog } from './gate14';

export type ContestKind = 'bid' | 'auction' | 'date' | 'producer' | 'market' | 'catalog' | 'fest' | 'deal' | 'deal_end' | 'info';
export type Screen = 'market' | 'releases' | 'studio' | 'world' | 'catalog' | 'shows' | 'hq';
export interface Contest {
  id: string; k: ContestKind; lb: string; w: number; t: L; why?: L; scr: Screen;
  a?: string; ref?: string; until?: number; opts?: string[]; done?: string;
}
export interface Bid12 { lb: string; adv: number; w: number; n: number; ref: string }
export interface Deal12 { id: string; lb: string; m: MarketId; fee: number; from: number; until: number; ten: number; st: 'offer' | 'on' | 'off'; exp: number }
export interface Rivals12State {
  c: Contest[]; bids: Record<string, Bid12>; deals: Deal12[];
  push: Record<string, { lb: string; until: number; fought?: 1 }>;
  seenAu: Record<string, number>; seen: string[]; cl: Record<string, 1>; cd: Record<string, number>; seq: number;
}

declare module '../ext4' { interface Ext4 { rivals12: Rivals12State } }
const init = (): Rivals12State => ({ c: [], bids: {}, deals: [], push: {}, seenAu: {}, seen: [], cl: {}, cd: {}, seq: 0 });
registerExt4('rivals12', init);
export const rivals12 = (s: GameState): Rivals12State => {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  return (x.rivals12 ??= init()) as Rivals12State;
};

const rngFor = (s: GameState, k: string): Rng => Rng.fromSeed(`${s.config.seed}|riv12|${k}|${s.week}`);

export const OPT_TXT: Record<string, [L, L]> = {
  cover: [l('Cobrir o lance (+10%)', 'Cover the bid (+10%)'), l('Sobe o seu adiantamento acima do deles; eles podem subir de novo.', 'Raises your advance above theirs; they may raise again.')],
  yield: [l('Deixar ir', 'Let it go'), l('Retira a oferta; o rival assina e lembra do gesto.', 'Withdraws your offer; the rival signs and remembers the gesture.')],
  raise: [l('Subir o lance (+10%)', 'Raise the bid (+10%)'), l('Volta à frente no leilão.', 'Back in front at the auction.')],
  drop: [l('Desistir', 'Drop out'), l('Sai do leilão.', 'Leaves the auction.')],
  shift: [l('Adiar 2 semanas', 'Delay 2 weeks'), l('Foge do confronto direto; o público fica para você depois.', 'Avoids the head-on clash; the audience is yours later.')],
  push: [l('Reforçar a divulgação', 'Boost promotion'), l('Paga para ganhar a semana: +15% de expectativa.', 'Pay to win the week: +15% hype.')],
  hold: [l('Manter a data', 'Keep the date'), l('Encara a disputa pelo mesmo público.', 'Face the fight for the same audience.')],
  jump: [l('Furar a fila', 'Jump the queue'), l('Paga um extra ao produtor e ele volta a ficar livre para você.', 'Pay the producer extra and they are free for you again.')],
  wait: [l('Esperar', 'Wait'), l('Use outro produtor ou espere a reserva acabar.', 'Use another producer or wait out the booking.')],
  fight: [l('Contra-atacar', 'Fight back'), l('Investe em divulgação local: anula quase toda a ofensiva.', 'Invest in local promotion: cancels most of the push.')],
  cede: [l('Ceder espaço', 'Give ground'), l('Sem custo, mas seus discos perdem apelo nesse mercado por um ano.', 'No cost, but your records lose appeal there for a year.')],
  defend: [l('Defender a vaga', 'Defend the slot'), l('Aceita cachê 30% menor para manter a faixa.', 'Accept a 30% lower fee to keep the slot.')],
  give: [l('Aceitar descer de faixa', 'Accept a lower slot'), l('O artista do rival sobe; você desce uma faixa e o cachê cai.', 'The rival act moves up; you drop a slot and the fee falls.')],
  accept: [l('Aceitar a distribuição', 'Accept distribution'), l('Seus lançamentos chegam ao mercado deles com a rede deles (+4% de apelo lá) e eles pagam um mínimo mensal.', 'Your releases reach their market through their network (+4% appeal there) and they pay a monthly minimum.')],
  decline: [l('Recusar', 'Decline'), l('Fica sem o mercado.', 'Stay out of that market.')],
};

/** Nome do rival com o líder (leaders10), se houver. */
export function rivalWho(s: GameState, lbId: string): L {
  const lb = s.labels[lbId];
  const ld = leaderOf(s, lbId);
  if (!lb) return l('?', '?');
  return ld ? fmtL(l('{l}, de {b}', '{l} of {b}'), { l: ld.name, b: lb.name }) : l(lb.name, lb.name);
}

export const dealWith = (s: GameState, lbId: string): Deal12 | undefined => rivals12(s).deals.find((d) => d.lb === lbId && d.st === 'on');

function why(s: GameState, lbId: string): L | undefined {
  const d = dealWith(s, lbId);
  return d ? fmtL(l('Eles distribuem você em {m} (tensão {t}/100): enfrentá-los sobe a tensão.', 'They distribute you in {m} (tension {t}/100): facing them raises tension.'), { m: marketById[d.m].name, t: Math.round(d.ten) }) : undefined;
}

function add(s: GameState, c: Omit<Contest, 'id' | 'w'>, tone: 'bad' | 'event' | 'info' = 'bad'): Contest {
  const st = rivals12(s);
  const x: Contest = { ...c, id: `c${++st.seq}`, w: s.week, why: c.why ?? why(s, c.lb) };
  st.c.push(x);
  if (st.c.length > 40) {
    const open = st.c.filter((y) => !y.done && y.opts);
    st.c = [...st.c.filter((y) => y.done || !y.opts).slice(-(40 - open.length)), ...open].sort((p, q) => p.w - q.w || p.id.localeCompare(q.id));
  }
  notify(s, x.t, tone);
  chron(s, { k: 'rival_contest', t: x.t, i: x.k === 'deal' || x.k === 'deal_end' ? 2 : 1, a: x.a ? [x.a] : undefined });
  return x;
}

/** Tensão com o parceiro de distribuição (e relação do líder com você). */
export function tension(s: GameState, lbId: string, d: number): void {
  const ld = leaderOf(s, lbId);
  if (ld) ld.rel.player = clamp((ld.rel.player ?? 0) - d / 4, -100, 100);
  const deal = dealWith(s, lbId);
  if (!deal) return;
  deal.ten = clamp(deal.ten + d, 0, 100);
  if (deal.ten >= 100) {
    deal.st = 'off';
    s.rivalries[lbId] = (s.rivalries[lbId] ?? 0) + 10;
    add(s, { k: 'deal_end', lb: lbId, scr: 'world', t: fmtL(l('{b} rompeu a distribuição dos seus discos em {m}: "não dá para ser sócio de quem nos ataca toda semana".', '{b} broke off distributing your records in {m}: "we cannot partner with someone who attacks us every week".'), { b: rivalWho(s, lbId), m: marketById[deal.m].name }) });
  }
}

const mineAct = (s: GameState, id: string) => { const a = s.acts[id]; return !!a && (a.owner === 'player' || !!a.playerBand); };
const BIDDERS: PlaybookId[] = ['vulture', 'scene', 'viral', 'copycat', 'idol', 'conglomerate', 'school', 'agitator'];

// ---------------------------------------------------------------- talento: guerra de lances

function bidWar(s: GameState): void {
  const st = rivals12(s);
  const r = rngFor(s, 'bid');
  for (const o of s.offers) {
    if (o.status !== 'pending') continue;
    const act = s.acts[o.actId];
    if (!act || act.owner || act.fame < 8) continue;
    const b = st.bids[act.id];
    if (!b) {
      const it = rivals8(s).interest[act.id];
      const cand = it && s.labels[it.lb]?.active ? s.labels[it.lb] : r.shuffle(Object.values(s.labels).filter((x) => x.active && x.cash > o.advance * 2 && (BIDDERS.includes(playbookOf(x)) || x.aggression > 0.6)).sort((x, y) => y.aggression - x.aggression).slice(0, 3))[0];
      if (!cand || cand.cash < o.advance * 1.5 || !r.chance(it ? 0.45 : 0.1 + cand.aggression * 0.12)) continue;
      const ratio = 1.08 + standingScore(standingOf(s, cand.id)) / 500 + r.float(0, 0.1);
      st.bids[act.id] = { lb: cand.id, adv: Math.round(o.advance * ratio), w: s.week, n: 1, ref: o.id };
      s.rivalries[cand.id] = (s.rivalries[cand.id] ?? 0) + 3;
      add(s, { k: 'bid', lb: cand.id, scr: 'market', a: act.id, ref: o.id, until: s.week + 4, opts: ['cover', 'yield'],
        t: fmtL(l('{b} subiu a oferta por {a} depois da sua: +{p}% de adiantamento.', '{b} raised the offer for {a} after yours: +{p}% advance.'), { b: rivalWho(s, cand.id), a: act.name, p: Math.round((ratio - 1) * 100) }) });
    } else if (b.n < 3 && o.advance >= b.adv && b.w < s.week) {
      const lb = s.labels[b.lb];
      if (!lb?.active || lb.cash < o.advance * 1.6 || !r.chance(0.2 + lb.aggression * 0.3)) continue;
      b.adv = Math.round(o.advance * r.float(1.08, 1.18));
      b.n += 1;
      b.w = s.week;
      add(s, { k: 'bid', lb: lb.id, scr: 'market', a: act.id, ref: o.id, until: s.week + 3, opts: ['cover', 'yield'],
        t: fmtL(l('{b} subiu de novo por {a} depois que você cobriu (rodada {n}).', '{b} raised again for {a} after you covered (round {n}).'), { b: rivalWho(s, lb.id), a: act.name, n: b.n }) });
    }
  }
  for (const [actId, b] of Object.entries(st.bids)) {
    const o = s.offers.find((x) => x.id === b.ref);
    if (o && (o.status === 'pending' || o.status === 'counter')) continue;
    const act = s.acts[actId];
    const lb = s.labels[b.lb];
    if (act && lb?.active && !act.owner && (!o || o.status === 'rejected') && r.chance(0.7)) {
      signWithRival(s, act, lb.id, r);
      if (act.owner !== lb.id) { skipBlockedLog(s, lb.id, act.name); delete st.bids[actId]; continue; }
      logMove(s, lb, { k: 'outbid', a: act.name });
      add(s, { k: 'info', lb: lb.id, scr: 'market', a: actId, t: fmtL(l('{b} assinou {a}: a oferta deles era maior que a sua.', '{b} signed {a}: their offer was bigger than yours.'), { b: rivalWho(s, lb.id), a: act.name }) });
    }
    delete st.bids[actId];
  }
}

registerOfferMod('rivals12bid', (s, act, o) => {
  const b = rivals12(s).bids[act.id];
  const lb = b && s.labels[b.lb];
  if (!b || !lb) return null;
  if (o.advance < b.adv) return { delta: -0.22, reason: fmtL(l('{b} subiu a oferta depois da sua — cubra o lance ou perca força.', '{b} raised the offer after yours — cover the bid or lose ground.'), { b: lb.name }) };
  return { delta: 0.04, reason: fmtL(l('Você cobriu o lance de {b}.', 'You covered {b}\'s bid.'), { b: lb.name }) };
});

// ---------------------------------------------------------------- leilões (talento e catálogo)

function auctions(s: GameState): void {
  const st = rivals12(s);
  for (const au of s.auctions) {
    if (au.status !== 'open' || !au.bids.some((b) => b.party === 'player')) continue;
    const n = au.bids.length;
    if ((st.seenAu[au.id] ?? 0) >= n) continue;
    st.seenAu[au.id] = n;
    const last = au.bids[n - 1];
    const act = s.acts[au.actId];
    if (last.party === 'player' || !s.labels[last.party] || !act) continue;
    add(s, { k: 'auction', lb: last.party, scr: 'market', a: act.id, ref: au.id, until: au.endsWeek, opts: ['raise', 'drop'],
      t: fmtL(l('{b} cobriu o seu lance no leilão por {a}.', '{b} topped your bid in the auction for {a}.'), { b: rivalWho(s, last.party), a: act.name }) });
  }
  for (const au of s.catalogAuctions) {
    if (au.status !== 'open' || !au.bids.some((b) => b.party === 'player')) continue;
    const n = au.bids.length;
    if ((st.seenAu[au.id] ?? 0) >= n) continue;
    st.seenAu[au.id] = n;
    const last = au.bids[n - 1];
    if (last.party === 'player' || !s.labels[last.party]) continue;
    add(s, { k: 'catalog', lb: last.party, scr: 'catalog', ref: au.id, until: au.endsWeek, opts: ['raise', 'drop'],
      t: fmtL(l('{b} cobriu o seu lance pelo catálogo de {x} ({n} discos).', '{b} topped your bid for {x}\'s catalog ({n} records).'), { b: rivalWho(s, last.party), x: s.labels[au.seller]?.name ?? '?', n: au.releaseIds.length }) });
  }
  for (const id of Object.keys(st.seenAu)) if (!s.auctions.some((a) => a.id === id && a.status === 'open') && !s.catalogAuctions.some((a) => a.id === id && a.status === 'open')) delete st.seenAu[id];
}

/** Selos de catálogo (manuais catalog/royalty/fund) também disputam leilões de catálogo onde você deu lance. */
function catalogRivals(s: GameState): void {
  const r = rngFor(s, 'cat');
  for (const au of s.catalogAuctions) {
    if (au.status !== 'open' || s.week >= au.endsWeek) continue;
    const top = Math.max(au.ask, ...au.bids.map((b) => b.amount));
    const lead = au.bids.find((b) => b.amount === top);
    if (lead?.party !== 'player') continue;
    const lb = Object.values(s.labels).find((x) => x.active && x.id !== au.seller && ['catalog', 'royalty', 'fund'].includes(playbookOf(x)) && x.cash > top * 1.4);
    if (lb && r.chance(0.4)) au.bids.push({ party: lb.id, amount: Math.round(top * r.float(1.05, 1.15)) });
  }
}

// ---------------------------------------------------------------- jogadas do rivals8 viram avisos

function fromRivals8(s: GameState): void {
  const st = rivals12(s);
  const seen = new Set(st.seen);
  for (const [lbId, moves] of Object.entries(rivals8(s).log)) {
    for (const m of moves) {
      if (s.week - m.w > 2) continue;
      const key = `${lbId}:${m.w}:${m.k}:${m.a ?? ''}`;
      if (seen.has(key)) continue;
      if (m.k === 'date_move') {
        const pr = s.pendingReleases.find((p) => p.title === m.x && mineAct(s, p.actId));
        add(s, { k: 'date', lb: lbId, scr: 'releases', a: pr?.actId, ref: pr?.id, until: pr ? pr.week - 1 : undefined, opts: pr ? ['shift', 'push', 'hold'] : undefined,
          t: fmtL(l('{b} mudou o lançamento de {a} para disputar o mesmo público do seu "{t}".', '{b} moved {a}\'s release to compete for the same audience as your "{t}".'), { b: rivalWho(s, lbId), a: m.a ?? '', t: m.x ?? '' }) });
      } else if (m.k === 'buy_offer' || m.k === 'abandon' || m.k === 'producer') {
        add(s, { k: 'info', lb: lbId, scr: m.k === 'producer' ? 'studio' : m.k === 'abandon' ? 'world' : 'market', t: fmtL(l('{b} {m}.', '{b} {m}.'), { b: rivalWho(s, lbId), m: moveTxt(m) }) }, 'info');
      } else continue;
      st.seen.push(key);
      seen.add(key);
    }
  }
  if (st.seen.length > 60) st.seen.splice(0, st.seen.length - 60);
}

// ---------------------------------------------------------------- janela de lançamento (rivais com rixa)

function releaseWindow(s: GameState): void {
  const st = rivals12(s);
  if (s.week < (st.cd.date ?? 0)) return;
  const r = rngFor(s, 'date');
  for (const pr of s.pendingReleases) {
    const d = pr.week - s.week;
    if (d < 2 || d > 4 || st.cl[pr.id] || rivals8(s).clash[pr.id] === 1 && rivals8(s).lastClash === s.week) continue;
    const mine = s.acts[pr.actId];
    if (!mine || !mineAct(s, pr.actId)) continue;
    st.cl[pr.id] = 1;
    const fam = familyOf(mine.genre);
    const labels = Object.values(s.labels).filter((lb) => lb.active && (s.rivalries[lb.id] ?? 0) >= 15 && lb.cash > money(s, 60000));
    if (!labels.length || !r.chance(0.25)) continue;
    for (const lb of r.shuffle(labels)) {
      const act = lb.roster.map((id) => s.acts[id]).filter((a) => a && a.status === 'active' && familyOf(a.genre) === fam && unreleasedRecorded(s, a).length > 0).sort((x, y) => y.fame - x.fame)[0];
      if (!act) continue;
      const song = unreleasedRecorded(s, act).sort((x, y) => y.q - x.q)[0];
      const budget = 10000 * (0.5 + act.fame / 40);
      lb.cash -= money(s, budget);
      launchNpcRelease(s, r, act, lb.id, [song.id], 'single', budget);
      logMove(s, lb, { k: 'date_move', a: act.name, x: pr.title });
      st.seen.push(`${lb.id}:${s.week}:date_move:${act.name}`);
      st.cd.date = s.week + 10;
      s.rivalries[lb.id] = (s.rivalries[lb.id] ?? 0) + 3;
      add(s, { k: 'date', lb: lb.id, scr: 'releases', a: pr.actId, ref: pr.id, until: pr.week - 1, opts: ['shift', 'push', 'hold'],
        t: fmtL(l('{b} mudou o lançamento de {a} para disputar o mesmo público do seu "{t}" — é a rixa entre vocês.', '{b} moved {a}\'s release to compete for the same audience as your "{t}" — it is your feud.'), { b: rivalWho(s, lb.id), a: act.name, t: pr.title }) });
      return;
    }
  }
  for (const id of Object.keys(st.cl)) if (!s.pendingReleases.some((p) => p.id === id)) delete st.cl[id];
}

// ---------------------------------------------------------------- produtor disputado (mensal)

function producerFight(s: GameState): void {
  const st = rivals12(s);
  if (s.week < (st.cd.prod ?? 0)) return;
  const r = rngFor(s, 'prod');
  if (!r.chance(0.18)) return;
  const used = s.sessions.filter((x) => x.producerId && mineAct(s, x.actId)).map((x) => x.producerId!);
  const pr = PRODUCERS.filter((p) => p.from <= s.year && p.to >= s.year && used.includes(p.id) && (s.producerBusy[p.id] ?? 0) <= s.week)[0];
  if (!pr) return;
  const lb = Object.values(s.labels).filter((x) => x.active && ['tech', 'vulture', 'prestige', 'visionary', 'idol'].includes(playbookOf(x)) && x.cash > money(s, 80000)).sort((a, b) => standingScore(standingOf(s, b.id)) - standingScore(standingOf(s, a.id)))[0];
  if (!lb) return;
  s.producerBusy[pr.id] = s.week + 8;
  lb.cash -= money(s, pr.fee * 8);
  st.cd.prod = s.week + 20;
  add(s, { k: 'producer', lb: lb.id, scr: 'studio', ref: pr.id, until: s.week + 8, opts: ['jump', 'wait'],
    t: fmtL(l('{b} reservou o produtor {p} por 8 semanas — o mesmo das suas últimas sessões.', '{b} booked producer {p} for 8 weeks — the one from your recent sessions.'), { b: rivalWho(s, lb.id), p: pr.name }) });
}

// ---------------------------------------------------------------- ofensiva num mercado regional (mensal)

function marketPush(s: GameState): void {
  const st = rivals12(s);
  for (const [m, p] of Object.entries(st.push)) if (p.until < s.week || !s.labels[p.lb]?.active) delete st.push[m];
  if (s.week < (st.cd.mkt ?? 0) || !playerActs(s).length) return;
  const r = rngFor(s, 'mkt');
  if (!r.chance(0.08)) return;
  const m = s.player.territories.find((x) => !st.push[x]);
  if (!m) return;
  const lb = Object.values(s.labels).filter((x) => x.active && ['regional', 'importer', 'conglomerate', 'vulture', 'live'].includes(playbookOf(x)) && x.cash > money(s, 120000)).sort((a, b) => (s.rivalries[b.id] ?? 0) - (s.rivalries[a.id] ?? 0))[0];
  if (!lb) return;
  if (!lb.territories.includes(m)) lb.territories.push(m);
  st.push[m] = { lb: lb.id, until: s.week + 52 };
  st.cd.mkt = s.week + 30;
  add(s, { k: 'market', lb: lb.id, scr: 'world', ref: m, until: s.week + 6, opts: ['fight', 'cede'],
    t: fmtL(l('{b} lançou uma ofensiva em {m}, seu mercado: rádio comprada, lojas lotadas com os discos deles.', '{b} launched a push into {m}, your market: bought radio, stores packed with their records.'), { b: rivalWho(s, lb.id), m: marketById[m].name }) });
}

registerMod('appeal', 'rivals12push', (s, v, c) => {
  const rel = c.release;
  if (!rel || (rel.owner !== 'player' && !s.acts[rel.actId]?.playerBand)) return null;
  const st = rivals12(s);
  const p = rel.territories.map((m) => st.push[m]).find((x) => x && x.until >= s.week);
  const d = st.deals.find((x) => x.st === 'on' && rel.territories.includes(x.m));
  if (!p && !d) return null;
  if (!p) return { value: v * 1.04, label: fmtL(l('Distribuição de {b} em {m}', '{b}\'s distribution in {m}'), { b: s.labels[d!.lb]?.name ?? '?', m: marketById[d!.m].name }) };
  const lb = s.labels[p.lb];
  return { value: v * (p.fought ? 0.99 : 0.94) * (d ? 1.04 : 1), label: fmtL(l('Ofensiva de {b} no seu mercado', '{b}\'s push into your market'), { b: lb?.name ?? '?' }) };
});

// ---------------------------------------------------------------- vaga de festival (mensal)

function festSlot(s: GameState): void {
  const st = rivals12(s);
  if (s.week < (st.cd.fest ?? 0)) return;
  const r = rngFor(s, 'fest');
  const mine = new Set(playerActs(s));
  for (const ed of fest8(s).editions) {
    if (ed.done || ed.month <= s.month + 0 || ed.year !== s.year) continue;
    const slot = ed.lineup.find((x) => mine.has(x.actId) && x.tier !== 'opening');
    if (!slot || !r.chance(0.25)) continue;
    const act = s.acts[slot.actId];
    const fam = familyOf(act.genre);
    const inLine = new Set(ed.lineup.map((x) => x.actId));
    let best: { lb: Label; id: string } | null = null;
    for (const lb of Object.values(s.labels)) {
      if (!lb.active) continue;
      for (const id of lb.roster) {
        const a = s.acts[id];
        if (a && !inLine.has(id) && a.status === 'active' && familyOf(a.genre) === fam && a.fame >= act.fame * 0.8 && (!best || a.fame > s.acts[best.id].fame)) best = { lb, id };
      }
    }
    if (!best) continue;
    st.cd.fest = s.week + 26;
    add(s, { k: 'fest', lb: best.lb.id, scr: 'shows', a: slot.actId, ref: `${ed.fi}:${best.id}`, until: s.week + 3, opts: ['defend', 'give'],
      t: fmtL(l('{b} quer a vaga de {a} no {f}: oferece {x} na mesma faixa por menos.', '{b} wants {a}\'s slot at {f}: offering {x} for the same slot for less.'), { b: rivalWho(s, best.lb.id), a: act.name, f: FESTIVALS[ed.fi]?.name ?? '?', x: s.acts[best.id].name }) });
    return;
  }
}

// ---------------------------------------------------------------- distribuição com rivais (mensal)

function dealsMonth(s: GameState): void {
  const st = rivals12(s);
  for (const d of st.deals) {
    if (d.st === 'offer' && d.exp < s.week) d.st = 'off';
    if (d.st !== 'on') continue;
    const lb = s.labels[d.lb];
    if (!lb?.active || d.until < s.week) {
      d.st = 'off';
      add(s, { k: 'deal_end', lb: d.lb, scr: 'world', t: fmtL(l('Terminou o acordo de distribuição com {b} em {m}.', 'The distribution deal with {b} in {m} ended.'), { b: lb?.name ?? '?', m: marketById[d.m].name }) }, 'info');
      continue;
    }
    post(s, `riv12deal:${d.id}`, d.fee, 'licensing', `Distribuição por ${lb.name} (${d.m})`);
    lb.cash -= d.fee;
    d.ten = Math.max(0, d.ten - 3);
    if ((s.rivalries[d.lb] ?? 0) > 0) s.rivalries[d.lb] = Math.max(0, (s.rivalries[d.lb] ?? 0) - 1);
  }
  st.deals = st.deals.filter((d) => d.st !== 'off' || s.week - d.until < 52).slice(-12);
  if (st.deals.some((d) => d.st === 'offer') || st.deals.filter((d) => d.st === 'on').length >= 2) return;
  const r = rngFor(s, 'deal');
  const acts = playerActs(s).map((id) => s.acts[id]).filter(Boolean);
  if (!acts.length || !r.chance(0.07)) return;
  const fame = acts.reduce((t, a) => t + a.fame, 0);
  for (const lb of r.shuffle(Object.values(s.labels).filter((x) => x.active && (s.rivalries[x.id] ?? 0) < 45))) {
    const home = cityById[lb.city]?.market;
    const free = (x: MarketId) => !st.deals.some((d) => d.m === x && d.st === 'on');
    const m = lb.territories.find((x) => !s.player.territories.includes(x) && free(x)) ?? (home && lb.territories.includes(home) && free(home) ? home : undefined);
    if (!m) continue;
    const fee = money(s, 500 + Math.min(4000, fame * 20));
    const d: Deal12 = { id: `d${++st.seq}`, lb: lb.id, m, fee, from: s.week, until: s.week + 104, ten: clamp((s.rivalries[lb.id] ?? 0) / 2, 0, 60), st: 'offer', exp: s.week + 6 };
    st.deals.push(d);
    const rival = (s.rivalries[lb.id] ?? 0) > 10;
    add(s, { k: 'deal', lb: lb.id, scr: 'world', ref: d.id, until: d.exp, opts: ['accept', 'decline'],
      t: fmtL(rival ? l('{b} — que disputa artistas com você — propõe distribuir seus discos em {m} por 2 anos, com mínimo garantido mensal.', '{b} — who fights you for artists — offers to distribute your records in {m} for 2 years, with a monthly guarantee.')
        : l('{b} propõe distribuir seus discos em {m} por 2 anos, com mínimo garantido mensal.', '{b} offers to distribute your records in {m} for 2 years, with a monthly guarantee.'), { b: rivalWho(s, lb.id), m: marketById[m].name }),
      why: l('Parceiro e rival ao mesmo tempo: cada disputa com eles sobe a tensão; a 100, rompem.', 'Partner and rival at once: every fight with them raises tension; at 100 they break it off.') }, 'event');
    return;
  }
}

registerSimHook('launch', 'rivals12', (s, _r, { release }) => {
  if (!release || (release.owner !== 'player' && !s.acts[release.actId]?.playerBand)) return;
  for (const d of rivals12(s).deals) if (d.st === 'on' && !release.territories.includes(d.m)) release.territories.push(d.m);
});

/** Encerrar um acordo de distribuição (o parceiro não gosta). */
export function endDeal(s: GameState, id: string): void {
  const d = rivals12(s).deals.find((x) => x.id === id && x.st === 'on');
  if (!d) return;
  d.st = 'off';
  d.until = s.week;
  s.rivalries[d.lb] = (s.rivalries[d.lb] ?? 0) + 5;
}

// ---------------------------------------------------------------- respostas do jogador

export function respond(s: GameState, id: string, opt: string): L | null {
  const st = rivals12(s);
  const c = st.c.find((x) => x.id === id);
  if (!c || c.done || !c.opts?.includes(opt)) return l('Já resolvido.', 'Already settled.');
  const lb = s.labels[c.lb];
  const fail = (e: L | null) => e;
  switch (c.k) {
    case 'bid': {
      const o = s.offers.find((x) => x.id === c.ref && x.status === 'pending');
      const b = c.a ? st.bids[c.a] : undefined;
      if (!o || !b) { c.done = 'gone'; return l('A negociação já terminou.', 'The negotiation is over.'); }
      if (opt === 'cover') {
        const adv = Math.round(b.adv * 1.1);
        if (s.player.cash < adv) return l('Caixa insuficiente para cobrir.', 'Not enough cash to cover.');
        o.advance = adv;
        b.w = s.week;
        tension(s, c.lb, 25);
      } else {
        s.offers = s.offers.filter((x) => x.id !== o.id);
        const act = s.acts[o.actId];
        if (act && lb?.active && !act.owner) { signWithRival(s, act, lb.id, rngFor(s, 'yield')); logMove(s, lb, { k: 'outbid', a: act.name }); }
        delete st.bids[o.actId];
        s.rivalries[c.lb] = Math.max(0, (s.rivalries[c.lb] ?? 0) - 5);
        tension(s, c.lb, -15);
      }
      break;
    }
    case 'auction': {
      const au = s.auctions.find((x) => x.id === c.ref && x.status === 'open');
      if (!au) { c.done = 'gone'; return l('Leilão encerrado.', 'Auction closed.'); }
      if (opt === 'raise') {
        const top = Math.max(...au.bids.map((x) => x.advance));
        const roy = au.bids.filter((x) => x.party === 'player').slice(-1)[0]?.royalty ?? 0.15;
        const e = raiseBid(s, au.id, Math.round(top * 1.1), roy);
        if (e) return fail(e);
        rivals12(s).seenAu[au.id] = au.bids.length;
        tension(s, c.lb, 20);
      } else { withdrawAuction(s, au.id); tension(s, c.lb, -10); }
      break;
    }
    case 'catalog': {
      const au = s.catalogAuctions.find((x) => x.id === c.ref && x.status === 'open');
      if (!au) { c.done = 'gone'; return l('Leilão encerrado.', 'Auction closed.'); }
      if (opt === 'raise') {
        const top = Math.max(au.ask, ...au.bids.map((x) => x.amount));
        const e = bidCatalog(s, au.id, Math.round(top * 1.1));
        if (e) return fail(e);
        rivals12(s).seenAu[au.id] = au.bids.length;
        tension(s, c.lb, 15);
      } else { au.bids = au.bids.filter((x) => x.party !== 'player'); tension(s, c.lb, -10); }
      break;
    }
    case 'date': {
      const pr = s.pendingReleases.find((x) => x.id === c.ref);
      if (!pr) { c.done = 'gone'; return l('O lançamento já saiu.', 'The release is already out.'); }
      if (opt === 'shift') pr.week += 2;
      else if (opt === 'push') {
        const cost = money(s, 3000 + (s.acts[pr.actId]?.fame ?? 0) * 150);
        if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
        post(s, `riv12push:${pr.id}`, -cost, 'marketing', `Divulgação contra ${lb?.name ?? 'rival'}`);
        pr.hype = (pr.hype ?? 0) + 0.15;
        tension(s, c.lb, 10);
      }
      break;
    }
    case 'producer': {
      const pr = PRODUCERS.find((x) => x.id === c.ref);
      if (opt === 'jump' && pr) {
        const cost = money(s, pr.fee * 10);
        if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
        post(s, `riv12prod:${pr.id}`, -cost, 'recording', `Prioridade com ${pr.name}`);
        s.producerBusy[pr.id] = s.week;
        s.rivalries[c.lb] = (s.rivalries[c.lb] ?? 0) + 3;
        tension(s, c.lb, 15);
      }
      break;
    }
    case 'market': {
      const p = rivals12(s).push[c.ref ?? ''];
      if (opt === 'fight' && p) {
        const cost = money(s, 8000 + s.player.territories.length * 2000);
        if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
        post(s, `riv12mkt:${c.ref}`, -cost, 'marketing', `Contra-ataque em ${c.ref}`);
        p.fought = 1;
        s.rivalries[c.lb] = (s.rivalries[c.lb] ?? 0) + 5;
        tension(s, c.lb, 20);
      } else if (opt === 'cede') { s.rivalries[c.lb] = Math.max(0, (s.rivalries[c.lb] ?? 0) - 4); tension(s, c.lb, -10); }
      break;
    }
    case 'fest': {
      const [fi, rivalAct] = (c.ref ?? '').split(':');
      const ed = editionOf(s, Number(fi));
      const slot = ed?.lineup.find((x) => x.actId === c.a);
      if (!ed || ed.done || !slot) { c.done = 'gone'; return l('A edição já aconteceu.', 'The edition already happened.'); }
      if (opt === 'defend') { slot.fee = Math.round(slot.fee * 0.7); tension(s, c.lb, 15); s.rivalries[c.lb] = (s.rivalries[c.lb] ?? 0) + 3; }
      else {
        const tier = slot.tier;
        slot.tier = TIER_ORDER[Math.min(TIER_ORDER.length - 1, TIER_ORDER.indexOf(tier) + 1)];
        slot.fee = Math.round(slot.fee * 0.6);
        if (!ed.lineup.some((x) => x.actId === rivalAct)) ed.lineup.push({ actId: rivalAct, tier, fee: slot.fee });
        ed.lineup.sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
        tension(s, c.lb, -10);
      }
      break;
    }
    case 'deal': {
      const d = rivals12(s).deals.find((x) => x.id === c.ref && x.st === 'offer');
      if (!d) { c.done = 'gone'; return l('A proposta expirou.', 'The proposal expired.'); }
      if (opt === 'accept') {
        d.st = 'on'; d.from = s.week; d.until = s.week + 104;
        const ld = leaderOf(s, d.lb);
        if (ld) ld.rel.player = clamp((ld.rel.player ?? 0) + 10, -100, 100);
      } else d.st = 'off';
      break;
    }
    default: break;
  }
  c.done = opt;
  return null;
}

/** O que acontece se o jogador ignora. */
const DEFAULT: Partial<Record<ContestKind, string>> = { fest: 'give', date: 'hold', producer: 'wait', market: 'cede', deal: 'decline' };

function expire(s: GameState): void {
  for (const c of rivals12(s).c) {
    if (c.done || !c.opts || c.until === undefined || c.until >= s.week) continue;
    const d = DEFAULT[c.k];
    if (d && respond(s, c.id, d) === null) c.done = `auto:${d}`;
    else c.done = 'expired';
  }
}

export const openContests = (s: GameState, scr?: Screen[]): Contest[] => rivals12(s).c.filter((c) => !c.done && c.opts && (!scr || scr.includes(c.scr)));
export const recentContests = (s: GameState, scr?: Screen[], weeks = 12): Contest[] => rivals12(s).c.filter((c) => s.week - c.w <= weeks && (!scr || scr.includes(c.scr)));

registerSimHook('week', 'rivals12', (s) => {
  if (s.config.role === 'artist') return;
  bidWar(s);
  auctions(s);
  fromRivals8(s);
  releaseWindow(s);
  expire(s);
});

registerSimHook('month', 'rivals12', (s) => {
  if (s.config.role === 'artist') return;
  catalogRivals(s);
  producerFight(s);
  marketPush(s);
  festSlot(s);
  dealsMonth(s);
});
