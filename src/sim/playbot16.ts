// Rodada 16 — jogador automático "de verdade" para testes de equilíbrio: joga como um humano competente,
// usando só as mesmas funções que os botões da interface chamam (scouting, propostas, projeto musical com
// conceito/produtor/verba, gravação, lançamento com marketing e rollout, turnês, festivais, sync, equipe com
// ordens delegadas, empréstimo, cortes, renovações, cartas de decisão, vida pessoal com o tempo livre).
// Respeita os mesmos limites do jogador (tempo livre, cota de reuniões, ações de scouting, vagas da sede).
// Três perfis: cauteloso, equilibrado, agressivo. Sem aleatoriedade própria: o acaso é o do jogo.

import { botClauses18, botPolicy18 } from './sys/contracts18';
import { botRights18 } from './sys/rights18';
import { liquid18 } from './sys/econ18';
import { toReal } from '../core/money';
import { FESTIVALS } from '../data/catalog';
import { MARKETS, cityById, type MarketId } from '../data/world';
import { hqCaps } from './branches';
import { acceptCounter, careerSlotsUsed, defaultOffer, evaluateOffer, expectedAdvance, offerNow } from './contracts';
import { fireStaff, hireStaff, loanOffer, monthlyCosts, openTerritory, takeLoan, territoryCost, upgradeCost, upgradeHq } from './economy';
import { estimateMonthlyBurn, resolveDecision } from './events';
import { availableChannels } from './market';
import { respondDemand, rst } from './rights';
import { canScout, estimate, requestScout, scoutAct } from './scouting';
import { availableProducers, producerFit, sessionCost } from './studio';
import { acceptCommission } from './sys/creation/core';
import { addOrder, d16, ordersOf } from './sys/deleg16';
import { renewChance, renewWithReading } from './sys/explain12';
import { acceptInvite, editionOf, festFee, festTierFor, fest8, pitchAct } from './sys/fests8';
import { energyLeft, industryParty, mentorAct, therapy } from './sys/life';
import { createProject, openProjects, projectSession, projectStage, recordNow, rolloutProject, scheduleProject, type MusicProject } from './sys/project8';
import { commitProject } from './sys/project12';
import { setProjectSongs } from './sys/project8';
import { bestOrder18, bestProducer18 } from './sys/quality18';
import { suggestDir18 } from './sys/traj18';
import { commit13, DEFAULT13 } from './sys/project13';
import { candidates as syncCands, pitch15, sy15 } from './sys/sync15';
import { scoutInPerson } from './sys/capacity14';
import { oh } from './sys/overhead13';
import { cityDemand, estimateTour, planTour, type TourPlan } from './tours';
import { labelTourNet16, sizedDraft16, suggestRoute16 } from './route16';
import { advanceMonth } from './tick';
import type { Act, GameState, RunConfig } from './types';
import { money, playerActs, rngOf } from './util';
import { createGame } from './worldgen';
import { unreleasedRecorded } from './production';
import { freshLog17, play17, type Log17 } from './playbot17';
import { ability18, prospect18 } from './sys/ability18';
import { doPersonAction18, personActions18 } from './personact18';

export type Profile = 'cautious' | 'balanced' | 'aggressive';

interface Knobs {
  /** meses de fôlego (caixa / custo mensal) abaixo dos quais corta gastos */
  cut: number;
  /** meses de fôlego abaixo dos quais pega empréstimo */
  loanAt: number;
  maxLoans: number;
  /** elenco máximo desejado */
  roster: number;
  /** adiantamento × o esperado */
  adv: number;
  /** fração do caixa que um adiantamento pode consumir */
  advCash: number;
  /** verba do projeto */
  budget: 'lean' | 'standard' | 'lavish';
  /** fração do caixa para marketing de um lançamento */
  mkt: number;
  /** logística de turnê: fração do caixa */
  tourCash: number;
  /** semanas mínimas entre turnês do mesmo ato */
  tourGap: number;
  /** contrata equipe quando caixa > N × salários anuais */
  hireMult: number;
  /** aceita opções de risco nas cartas */
  risk: number;
}

export const PROFILES: Record<Profile, Knobs> = {
  cautious: { cut: 4, loanAt: 1.5, maxLoans: 1, roster: 3, adv: 0.9, advCash: 0.15, budget: 'lean', mkt: 0.05, tourCash: 0.08, tourGap: 40, hireMult: 1.6, risk: 0.2 },
  balanced: { cut: 2.5, loanAt: 2, maxLoans: 2, roster: 5, adv: 1, advCash: 0.25, budget: 'standard', mkt: 0.09, tourCash: 0.14, tourGap: 30, hireMult: 1.1, risk: 0.5 },
  aggressive: { cut: 1.5, loanAt: 3, maxLoans: 3, roster: 8, adv: 1.2, advCash: 0.4, budget: 'lavish', mkt: 0.16, tourCash: 0.22, tourGap: 22, hireMult: 0.7, risk: 0.85 },
};

/** O que o bot fez (para relatórios e testes). */
export interface PlayLog {
  signs: number; offers: number; scouts: number; projects: number; recordings: number; releases: number; rollouts: number;
  tours: number; festivals: number; syncPitches: number; syncWins: number; hires: number; fires: number; orders: number;
  loans: number; renewals: number; drops: number; decisions: number; personal: number; commissions: number; demands: number;
  /** rodada 17: canais, merch, casas, imprensa, cenas, envolvimento */
  r17: Log17;
}
const freshLog = (): PlayLog => ({ signs: 0, offers: 0, scouts: 0, projects: 0, recordings: 0, releases: 0, rollouts: 0, tours: 0, festivals: 0, syncPitches: 0, syncWins: 0, hires: 0, fires: 0, orders: 0, loans: 0, renewals: 0, drops: 0, decisions: 0, personal: 0, commissions: 0, demands: 0, r17: freshLog17() });

interface Mem { log: PlayLog; cash: number[]; tourW: Record<string, number>; party: number; refused: Record<string, number>; req?: number }
const MEM = new WeakMap<GameState, Mem>();
const mem = (s: GameState): Mem => {
  let m = MEM.get(s);
  if (!m) MEM.set(s, (m = { log: freshLog(), cash: [], tourW: {}, party: -99, refused: {} }));
  return m;
};
export const playLog = (s: GameState): PlayLog => mem(s).log;

/** Custo mensal real: o maior entre a estimativa da interface e o que o caixa vem caindo. */
function burn(s: GameState): number {
  const c = monthlyCosts(s);
  const ohLast = (oh(s).last?.lines ?? []).reduce((t, x) => t + x.amount, 0);
  return Math.max(estimateMonthlyBurn(s), c.rent + c.salaries + c.outsourcing + c.loans + c.equipment + ohLast);
}
const runway = (s: GameState): number => s.player.cash / Math.max(1, burn(s));

// ---------------------------------------------------------------- cartas de decisão

const BAD = /risk|risco|collapse|colapso|resent|lose|perde|blow up|explod|lawsuit|processo|scandal|escând|burnout|crash|fight|briga|anger|raiva|refuse|recus|fine\b|multa|damage|dano|leave|sai\b|quit/i;
const GOOD = /recover|recupera|fans|fãs|revenue|receita|cash in|entra dinheiro|gain|ganha|trust|confiança|morale|moral|reputation|reputação|hit|prestige|prestígio|bonus|bônus|free|grátis|stronger|mais forte|loyal|fiel/i;
const COST = /cost|custo|expensive|caro|pay|paga|\$\s?[\d.,]+/i;

function moneyIn(text: string): number {
  const m = text.match(/\$\s?([\d.,]+)/);
  if (!m) return 0;
  return Number(m[1].replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')) || 0;
}

/** Lê cada opção como um jogador: custo cabe no caixa? ganho? risco aceitável para o perfil? */
export function pickOption(s: GameState, d: GameState['decisions'][number], k: Knobs): string {
  if (d.eventId === 'distress_sale') return s.player.cash < 0 ? 'sell_catalog' : d.defaultOption;
  const tight = runway(s) < k.cut;
  let best = d.defaultOption, bestV = -Infinity;
  for (const o of d.options) {
    const txt = `${o.label.en} ${o.hint?.en ?? ''} ${o.label.pt} ${o.hint?.pt ?? ''}`;
    let v = o.id === d.defaultOption ? 0.15 : 0;
    if (GOOD.test(txt)) v += 1;
    if (BAD.test(txt)) v -= 1.4 * (1 - k.risk) + 0.3;
    const usd = moneyIn(txt);
    if (COST.test(txt)) {
      const cost = usd ? money(s, usd) : money(s, 3000);
      const share = cost / Math.max(1, s.player.cash);
      v -= tight ? 2 : share > 0.2 ? 1.5 : share * 3;
    }
    if (/cash in|entra dinheiro|sell|vender/i.test(txt)) v += tight ? 1.5 : -0.3;
    if (v > bestV) { bestV = v; best = o.id; }
  }
  return best;
}

// ---------------------------------------------------------------- dinheiro

function finances(s: GameState, k: Knobs): void {
  const L = mem(s).log;
  const rw = runway(s);
  if (playerActs(s).length && rw < k.loanAt && s.player.loans.length < k.maxLoans && loanOffer(s) && takeLoan(s)) L.loans++;
  // cortar custos: primeiro a equipe mais cara que não é essencial; nunca o último agente de shows com ordens ativas
  if (runway(s) < k.cut * 0.6 && s.player.staff.length) {
    const keep = new Set(['anr']);
    const st = [...s.player.staff].filter((x) => !keep.has(x.role) || s.player.staff.length > 3).sort((a, b) => b.salary - a.salary)[0];
    if (st) { fireStaff(s, st.id); L.fires++; for (const o of d16(s).orders.filter((x) => x.staffId === st.id)) o.on = false; }
  }
}

// ---------------------------------------------------------------- scouting e contratos

function scoutAndSign(s: GameState, k: Knobs, p: Profile): void {
  const L = mem(s).log;
  // r18 (ability18): promessa = espaço estimado entre a habilidade atual e o potencial × juventude
  const score = (id: string) => (estimate(s, id, 'potential')?.mid ?? 0) * 0.6 + (estimate(s, id, 'talent')?.mid ?? s.acts[id].fame) * 0.6 - s.acts[id].fame * 0.25 + prospect18(s, s.acts[id]);
  // quem cabe no bolso vale mais a pena aprofundar (estrela cara só atrapalha a fila do scouting)
  const cheap = (id: string) => defaultOffer(s, s.acts[id]).advance * k.adv <= s.player.cash * k.advCash;
  const ks = Object.values(s.knowledge).filter((x) => s.acts[x.actId] && !s.acts[x.actId].owner && x.degree < 4)
    .map((x) => ({ ...x, v: score(x.actId) + x.degree * 4 + (cheap(x.actId) ? 25 : 0) })).sort((a, b) => b.v - a.v);
  // pedido de scout (formulário da interface) quando não há ninguém acessível no radar e há vaga no elenco
  const want = Math.min(k.roster, hqCaps(s).careers) > careerSlotsUsed(s);
  if (want && !ks.some((x) => cheap(x.actId)) && s.month !== mem(s).req) {
    const home = (cityById[s.config.homeCity]?.market ?? 'any') as string;
    if (requestScout(s, { genreFamily: 'any', market: home, level: p === 'aggressive' ? 'promising' : 'beginner', role: 'any' })) { L.scouts++; mem(s).req = s.month; }
  }
  for (const x of ks.slice(0, 4)) {
    if (!canScout(s, x.actId).ok) {
      // o agressivo vai pessoalmente quando a equipe esgota as ações (custa tempo livre)
      if (p === 'aggressive' && energyLeft(s) >= 3 && !scoutInPerson(s) && canScout(s, x.actId).ok) { scoutAct(s, x.actId); L.scouts++; L.personal++; }
      break;
    }
    scoutAct(s, x.actId); L.scouts++;
  }
  const cap = Math.min(k.roster, hqCaps(s).careers);
  if (careerSlotsUsed(s) >= cap || runway(s) < k.cut) return;
  if (s.offers.some((o) => o.status === 'pending')) return;
  const cands = Object.values(s.knowledge)
    .filter((x) => x.degree >= 2 && s.acts[x.actId] && !s.acts[x.actId].owner && !s.acts[x.actId].deceased && (mem(s).refused[x.actId] ?? -99) < s.week - 26)
    .map((x) => ({ id: x.actId, v: score(x.actId) }))
    .sort((a, b) => b.v - a.v);
  // como um jogador: olha o adiantamento pedido antes de sonhar alto — só disputa quem cabe no caixa
  const minV = p === 'cautious' ? 36 : p === 'balanced' ? 32 : 28;
  const fits = cands.filter((c) => c.v >= minV).map((c) => ({ ...c, o: defaultOffer(s, s.acts[c.id]) }))
    .filter((c) => Math.round(c.o.advance * k.adv / 100) * 100 <= s.player.cash * k.advCash);
  for (const c of fits.slice(0, 4)) {
    const act = s.acts[c.id];
    const o = c.o;
    o.advance = Math.round(o.advance * k.adv / 100) * 100;
    botClauses18(s, act, o, p); // r18: cláusulas (recuperável, base, contas, garantias) conforme o perfil
    let ev = evaluateOffer(s, act, o);
    // r17: o agressivo tenta o 360 (parte de shows/merch) depois que o modelo existe na indústria; volta ao clássico se não cola
    if (p === 'aggressive' && s.year >= 2002) {
      const c360 = { ...o, model: '360' as const, share360: 0.15, royalty: Math.min(0.3, o.royalty + 0.02) };
      const e360 = evaluateOffer(s, act, c360);
      if (e360.band !== 'unlikely') { Object.assign(o, c360); ev = e360; }
    }
    // negocia como na ficha: se a leitura é ruim, sobe royalty / dá controle criativo antes de desistir
    if (ev.band === 'unlikely') { o.royalty = Math.min(0.3, o.royalty + 0.03); ev = evaluateOffer(s, act, o); }
    if (ev.band === 'unlikely' && p !== 'cautious') { o.creativeControl = true; ev = evaluateOffer(s, act, o); }
    if (ev.band === 'unlikely') continue;
    if (o.advance > s.player.cash * k.advCash || s.player.cash - o.advance < burn(s) * k.cut * 1.5) continue;
    const { offer, result } = offerNow(s, rngOf(s), o);
    if (!offer && result === 'invalid') break; // sem reunião disponível (cota/tempo livre)
    L.offers++;
    if (result === 'accepted') L.signs++;
    else if (result === 'counter' && offer) {
      if (offer.advance <= s.player.cash * k.advCash * 1.3 && acceptCounter(s, offer.id)) L.signs++;
      else s.offers = s.offers.filter((x) => x.id !== offer.id);
    } else if (result === 'rejected') { mem(s).refused[c.id] = s.week; if (offer) s.offers = s.offers.filter((x) => x.id !== offer.id); }
    break;
  }
  for (const o of s.offers) if (o.status === 'counter' && o.advance <= s.player.cash * k.advCash * 1.3 && acceptCounter(s, o.id)) L.signs++;
}

// ---------------------------------------------------------------- disco: projeto, gravação, lançamento

function bestProducer(s: GameState, act: Act, songs: number, cap: number): string | undefined {
  let best: string | undefined, bv = 0;
  for (const pr of availableProducers(s)) {
    const c = sessionCost(s, songs, 1, 'balanced', pr.id) - sessionCost(s, songs, 1, 'balanced');
    if (c > cap) continue;
    const v = pr.skill * producerFit(pr, act.genre);
    if (v > bv) { bv = v; best = pr.id; }
  }
  return best;
}

function marketingFor(s: GameState, act: Act, p: MusicProject, k: Knobs): { channel: string; budget: number }[] {
  const ch = availableChannels(s).slice().sort((a, b) => b.sales / b.reachCost - a.sales / a.reachCost);
  if (!ch.length) return [];
  const total = Math.max(money(s, 400), Math.min(s.player.cash * k.mkt, money(s, (p.type === 'lp' ? 9000 : 3000) * (1 + act.fame / 25))));
  const n = k.mkt >= 0.15 ? 2 : 1;
  return ch.slice(0, n).map((c, i) => ({ channel: c.id, budget: Math.round(total * (n === 1 ? 1 : i === 0 ? 0.65 : 0.35) / 100) * 100 }));
}

function records(s: GameState, k: Knobs, prof: Profile): void {
  const L = mem(s).log;
  for (const id of playerActs(s)) {
    const act = s.acts[id];
    if (!act || act.hiatusUntil && act.hiatusUntil > s.week) continue;
    const mine = openProjects(s, id).filter((p) => !p.releaseId);
    let p = mine[0];
    if (!p) {
      const avail = act.songs.map((x) => s.songs[x]).filter((so) => so && !so.releaseId && !so.vault).length;
      const gap = prof === 'aggressive' ? 8 : prof === 'balanced' ? 12 : 16;
      if (avail < 1 || runway(s) < k.cut || s.week - act.lastRelease < gap) continue;
      const singles = Object.values(s.releases).filter((r) => r.actId === id && r.type === 'single' && r.week > s.week - 52).length;
      const type = avail >= 8 && (singles >= 2 || act.fame >= 12) ? 'lp' : avail >= 4 && singles >= 2 ? 'ep' : 'single';
      const concept = act.fame < 8 ? 'debut' : prof === 'cautious' ? 'budget' : act.fame >= 25 || prof === 'aggressive' ? 'radio' : 'roots';
      const r = createProject(s, id, { type, concept });
      if ('pt' in r) continue;
      p = r;
      L.projects++;
      const budget = runway(s) < k.cut * 2 ? 'lean' : k.budget;
      commitProject(s, p, { intent: act.fame < 15 ? 'audience' : 'career', dir: prof === 'aggressive' ? 'bold' : suggestDir18(s, act), aud: act.fame < 15 ? 'young' : 'core', budget, deadline: 'normal' });
      // escolhas de lançamento (rodada 13): o agressivo paga single de trabalho e edição limitada; os outros ficam no padrão
      if (prof === 'aggressive' && p.type !== 'single') commit13(s, p, { ...DEFAULT13, single: 'lead', ed: s.year >= 1975 ? 'limited' : 'standard' });
      p.marketing = marketingFor(s, act, p, k);
      const cap = s.player.cash * (prof === 'aggressive' ? 0.08 : prof === 'balanced' ? 0.04 : 0.015);
      // r18 (art18): o produtor certo para ESTE projeto (encaixe, crueza do gênero, química), não só o mais hábil
      p.producerId = bestProducer18(s, act, Math.max(1, p.songIds.length), cap) ?? bestProducer(s, act, Math.max(1, p.songIds.length), cap * 0.5);
    }
    const st = projectStage(s, p);
    if (st === 'recording' && !projectSession(s, p)) {
      const unrec = p.songIds.filter((x) => s.songs[x] && !s.songs[x].recorded).length;
      if (unrec && sessionCost(s, unrec, p.tier, p.approach, p.producerId) < s.player.cash * 0.2 && runway(s) > k.cut) {
        if (!recordNow(s, p)) L.recordings++;
        else if (p.producerId) { p.producerId = undefined; if (!recordNow(s, p)) L.recordings++; }
      }
    } else if (st === 'finishing') {
      if (p.songIds.length >= 3) setProjectSongs(s, p, bestOrder18(s, p.songIds)); // r18: sequência das faixas
      p.marketing = marketingFor(s, act, p, k);
      if (runway(s) < k.cut) for (const m of p.marketing) m.budget = Math.round(m.budget / 3);
      const lp = p.type === 'lp' && prof !== 'cautious' && runway(s) > k.cut * 2;
      if (lp && !rolloutProject(s, p)) { L.rollouts++; L.releases++; }
      else if (!scheduleProject(s, rngOf(s), p)) L.releases++;
    } else if ((st === 'writing' || st === 'concept') && s.week - (p.created ?? s.week) > 26 && unreleasedRecorded(s, act).length === 0 && p.type !== 'single') {
      // projeto empacado: vira single com o que há
      p.type = 'single';
      p.songIds = p.songIds.slice(0, 1);
    }
  }
}

// ---------------------------------------------------------------- estrada: turnês e festivais

function road(s: GameState, k: Knobs, prof: Profile): void {
  const L = mem(s).log, M = mem(s);
  for (const id of playerActs(s)) {
    const act = s.acts[id];
    if (!act || act.fame < 6 || (act.hiatusUntil ?? 0) > s.week) continue;
    if (s.week - (M.tourW[id] ?? -999) < k.tourGap) continue;
    if (s.tours.some((t) => t.actId === id && (t.status === 'planned' || t.status === 'running'))) continue;
    const recorded = act.songs.map((x) => s.songs[x]).filter((x) => x?.recorded).sort((a, b) => b.q - a.q);
    if (recorded.length < 4 || runway(s) < k.cut * 1.5) continue;
    // a mesma rota sugerida do planejador (botão "Sugerir rota"), só com cidades de procura real
    const want = prof === 'aggressive' ? 10 : prof === 'balanced' ? 7 : 5;
    const pool = suggestRoute16(s, id, want).ids.filter((ci) => cityDemand(s, act, ci) >= 60);
    const n = pool.length;
    if (n < 3) continue;
    const plan: TourPlan = { actId: id, cities: pool, startInDays: 21, priceMult: 1, setlist: recorded.slice(0, 15).map((x) => x.id), role: 'headline', pay: 'door', ...sizedDraft16(s, id) };
    const est = estimateTour(s, plan);
    // selo clássico só paga a logística (bilheteria é do artista): vale como investimento se não pesa no caixa
    const cost = -labelTourNet16(s, id, est).net; // a mesma linha "Para o selo" do planejador
    // ato grande vende mais disco depois da estrada: aceita investir mais nele
    if (cost > liquid18(s) * k.tourCash * (1 + act.fame / 40)) continue; // r18: conta o que entra nos próximos 2 meses
    const r = planTour(s, plan);
    if (!('pt' in r)) { L.tours++; M.tourW[id] = s.week; }
  }
  // festivais do ano: oferece cada artista na faixa que o festival topa (a interface mostra a leitura antes)
  let pitches = 0;
  for (const id of playerActs(s)) {
    const act = s.acts[id];
    if (!act || act.fame < 5) continue;
    FESTIVALS.forEach((f, fi) => {
      if (pitches >= (prof === 'cautious' ? 1 : 3)) return;
      const ed = editionOf(s, fi);
      if (!ed || ed.done || ed.month <= s.month || ed.lineup.some((x) => x.actId === id)) return;
      if ((fest8(s).cooldown[`${fi}:${id}`] ?? 0) > s.week) return;
      const tier = festTierFor(s, f, fi, act);
      if (!tier) return;
      pitches++;
      const res = pitchAct(s, rngOf(s), fi, id, tier, festFee(s, f, act, tier));
      if (res.result === 'accepted') L.festivals++;
      else if (res.result === 'counter' && res.tier && res.fee) { const r2 = pitchAct(s, rngOf(s), fi, id, res.tier, res.fee); if (r2.result === 'accepted') L.festivals++; }
    });
  }
  for (const inv of [...fest8(s).invites]) if (!acceptInvite(s, inv.id)) L.festivals++;
}

// ---------------------------------------------------------------- sync

function sync(s: GameState, prof: Profile): void {
  const L = mem(s).log;
  for (const b of sy15(s).briefs) {
    if (b.status !== 'open' || b.until < s.week) continue;
    const c = syncCands(s, b, 3)[0];
    if (!c || c.fit.v < 0.4) continue;
    const res = pitch15(s, b.id, c.song.id, prof === 'cautious');
    L.syncPitches++;
    if (res.ok) L.syncWins++;
  }
}

// ---------------------------------------------------------------- equipe e delegação

function team(s: GameState, k: Knobs): void {
  const L = mem(s).log;
  const acts = playerActs(s);
  const salaries = s.player.staff.reduce((t, x) => t + x.salary, 0);
  const have = new Set(s.player.staff.map((x) => x.role));
  const yearRev = s.player.revenueByYear[s.year - 1] ?? 0;
  const want: string[] = [];
  if (acts.length >= 1) want.push('anr');
  if (acts.length >= 2) want.push('publicist', 'booking_agent', 'booking', 'manager');
  if (acts.length >= 3) want.push('producer', 'promoter', 'tour_manager', 'analyst');
  if (acts.length >= 4) want.push('admin', 'sync', 'rights', 'manufacturing');
  // o mercado só tem alguns profissionais por vez: contrata a primeira função desejada que aparece
  const role = want.find((r) => !have.has(r) && s.professionals.some((p) => p.role === r));
  if (role && s.player.staff.length < hqCaps(s).staff && liquid18(s, 2) / Math.max(1, burn(s)) > k.cut * 2.5) { // r18: conta recebíveis próximos
    const pro = s.professionals.filter((p) => p.role === role).sort((a, b) => b.skill / Math.max(1, b.salary) - a.skill / Math.max(1, a.salary))[0];
    const liq = liquid18(s, 3); // r18: caixa + recebíveis dos próximos 3 meses
    const afford = pro && liq > (salaries + pro.salary) * 12 * k.hireMult && (yearRev > (salaries + pro.salary) * 8 || liq > (salaries + pro.salary) * 24 * k.hireMult);
    if (pro && afford && !hireStaff(s, pro.id)) L.hires++;
  }
  // ordens permanentes para os delegados (como no painel de equipe)
  for (const st of s.player.staff) {
    if (st.role !== 'booking_agent' && st.role !== 'promoter') continue;
    const os = ordersOf(s, st.id);
    if (os.length >= 3) continue;
    const top = [...acts].map((id) => s.acts[id]).filter((a) => a && a.fame >= 5).sort((a, b) => b.fame - a.fame);
    if (st.role === 'booking_agent') {
      if (!os.some((o) => o.kind === 'fees') && !addOrder(s, st.id, 'fees', {})) L.orders++;
      const a = top.find((x) => !os.some((o) => o.kind === 'tour' && o.actId === x.id));
      if (a && !addOrder(s, st.id, 'tour', { actId: a.id, market: (cityById[a.city]?.market ?? '') as MarketId, tier: -1, floor: 0, per: 1 })) L.orders++;
    } else {
      const a = top.find((x) => !os.some((o) => o.kind === 'radio' && o.actId === x.id));
      if (a && !addOrder(s, st.id, 'radio', { actId: a.id, budget: Math.round(money(s, 400) / 100), per: 1 })) L.orders++;
    }
  }
}

// ---------------------------------------------------------------- elenco: renovações, pedidos, cortes

function roster(s: GameState, k: Knobs): void {
  const L = mem(s).log;
  for (const d of [...rst(s).demands]) {
    const act = s.acts[d.actId];
    const good = !!act && act.fame >= 15;
    const ans = s.player.cash > d.bonus * 6 && good ? 'accept' : good || runway(s) > k.cut * 2 ? 'counter' : 'refuse';
    respondDemand(s, rngOf(s), d.id, ans); L.demands++;
  }
  for (const id of playerActs(s)) {
    const act = s.acts[id];
    const c = act?.contractId ? s.contracts[act.contractId] : undefined;
    if (!act || !c || c.party !== 'player' || act.playerBand) continue;
    const left = c.endWeek - s.week;
    if (left > 10 || left < 0) continue;
    const rev = Object.values(s.releases).filter((r) => r.actId === id && r.owner === 'player').reduce((t, r) => t + r.revenue, 0);
    const grew = act.fame >= (c.fameAtSign ?? 0) + 3 || rev > c.advance * 1.5;
    if (!grew) { if (!mem(s).refused[`drop:${id}`]) { mem(s).refused[`drop:${id}`] = s.week; L.drops++; } continue; } // deixa o contrato acabar
    const bonus = Math.round(money(s, expectedAdvance(s, act) * 0.35) / 100) * 100;
    if (bonus > s.player.cash * k.advCash || renewChance(s, act, bonus) < 0.35) continue;
    if (renewWithReading(s, id, 36, bonus)) L.renewals++;
  }
}

// ---------------------------------------------------------------- crescimento, vida pessoal

function grow(s: GameState, k: Knobs): void {
  const yearRev = s.player.revenueByYear[s.year - 1] ?? 0;
  const up = upgradeCost(s);
  if (up !== null && careerSlotsUsed(s) >= hqCaps(s).careers && careerSlotsUsed(s) < k.roster && s.player.cash > up * 3 && runway(s) > k.cut * 3) upgradeHq(s);
  for (const m of MARKETS) {
    if (s.player.territories.includes(m.id)) continue;
    if (yearRev > territoryCost(s, m.id) * 12 && s.player.cash > territoryCost(s, m.id) * 4 && runway(s) > k.cut * 3) { openTerritory(s, m.id); break; }
  }
}

function personal(s: GameState): void {
  const L = mem(s).log, M = mem(s);
  const acts = playerActs(s).map((id) => s.acts[id]).filter(Boolean);
  // mentoria: quem vai gravar (estúdio) ou está com pouca confiança (conversa)
  for (const a of acts) {
    if (energyLeft(s) < 2) break;
    const rec = openProjects(s, a.id).some((p) => projectStage(s, p) === 'recording');
    const kind = a.trust < 50 ? 'talk' : rec ? 'studio' : a.rehearsed < 10 ? 'stage' : null;
    if (kind && !mentorAct(s, a.id, kind)) L.personal++;
  }
  if (energyLeft(s) >= 2 && s.month % 3 === 0 && M.party !== s.month + s.year * 12) {
    const r = industryParty(s, rngOf(s));
    if (!('pt' in r)) { L.personal++; M.party = s.month + s.year * 12; }
  }
  if (energyLeft(s) >= 1 && s.month % 4 === 1 && !therapy(s)) L.personal++;
  develop18(s);
}

/** r18 (ability18): aulas para a jovem promessa do elenco (uma por semestre) e mentor quando há veterano. */
function develop18(s: GameState): void {
  if (s.month % 6 !== 2 || runway(s) < 8) return;
  for (const id of playerActs(s)) for (const pid of s.acts[id]?.members ?? []) {
    const A = ability18(s, `p:${pid}`);
    if (!A || A.kind !== 'artist' || (A.age ?? 30) > 25 || A.pa - A.ca < 30) continue;
    for (const act of ['mentor18', 'train18']) if (personActions18(s, `p:${pid}`).some((r) => r.def.id === act && !r.block)) { doPersonAction18(s, act, `p:${pid}`); mem(s).log.personal++; return; }
  }
}

// ---------------------------------------------------------------- o mês

export function playMonth(s: GameState, prof: Profile = 'balanced'): void {
  const k = PROFILES[prof];
  const M = mem(s), L = M.log;
  M.cash.push(s.player.cash);
  if (M.cash.length > 6) M.cash.shift();
  botPolicy18(s, prof);
  botRights18(s, prof);
  for (const d of [...s.decisions]) if (resolveDecision(s, d.id, pickOption(s, d, k))) L.decisions++;
  finances(s, k);
  const acts = playerActs(s);
  for (const c of s.x4?.creation?.commissions ?? []) if (c.status === 'offered' && acts.length && !acceptCommission(s, c.id, acts[c.id.length % acts.length])) L.commissions++;
  if (s.config.role === 'artist') return;
  roster(s, k);
  scoutAndSign(s, k, prof);
  records(s, k, prof);
  road(s, k, prof);
  sync(s, prof);
  team(s, k);
  grow(s, k);
  play17(s, prof, { cash: s.player.cash, burn: burn(s), energy: energyLeft(s) }, L.r17);
  personal(s);
}

export interface PlayerSummary { seed: string; profile: Profile; startYear: number; endYear: number; cash: number; realCash: number; ended?: string; endedYear?: number;
  /** menor caixa real (US$ de hoje) e caixa real ao fim do 1º e 2º anos: mede o aperto do começo */
  low: number; y1: number; y2: number; acts: number; releases: number; number1s: number; log: PlayLog }

/** Joga `years` anos com o perfil escolhido. */
export function simulatePlayer(cfg: RunConfig, years: number, profile: Profile = 'balanced'): { state: GameState; summary: PlayerSummary } {
  const s = createGame(cfg);
  let low = Infinity, y1 = 0, y2 = 0;
  for (let m = 0; m < years * 12 && !s.ended; m++) {
    playMonth(s, profile);
    advanceMonth(s);
    const r = toReal(s.player.cash, s.year);
    low = Math.min(low, r);
    if (m === 11) y1 = r;
    if (m === 23) y2 = r;
  }
  return {
    state: s,
    summary: {
      seed: cfg.seed, profile, startYear: cfg.startYear, endYear: s.year, cash: s.player.cash, realCash: Math.round(toReal(s.player.cash, s.year)), ended: s.ended?.ending, endedYear: s.ended ? s.year : undefined, low: Math.round(low), y1: Math.round(y1), y2: Math.round(y2),
      acts: playerActs(s).length, releases: s.player.stats.releases, number1s: s.player.stats.number1s, log: { ...playLog(s), r17: { ...playLog(s).r17 } },
    },
  };
}
