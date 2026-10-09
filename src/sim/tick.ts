// Loop do mês: agenda → semanas (lançamentos, mercado, paradas) → fechamento
// (finanças, contratos, pessoas, rivais, mundo, eventos, legado). GDD §6, §7.

import { clamp, type Rng } from '../core/rng';
import { dailyStep, directorMonth, monthlyExt, startPlans, weeklyExt, yearlyExt } from './hooks';
import { formatMoney } from '../core/money';
import { TECHS, techById } from '../data/rules';
import { GENRES, genreById, l, type L } from '../data/world';
import { processPlayerAgendas } from './agenda';
import { registerMovementGenres } from './culture';
import { checkPromises, endContract, resolveOffers } from './contracts';
import { checkInsolvency, payMonth, refreshProfessionals } from './economy';
import { resolveDecision, storyteller } from './events';
import { checkCardGoal, finishArc, updateLegacy, yearlyAwards } from './legacy';
import { monthlyPeople, newRivalLabel, npcProduction, prune, worldSpawns } from './lifecycle';
import { launchPending, marketWeek } from './market';
import { rivalYearEnd, rivalsMonth } from './rivals';
import { monthlySignals, syncPipeline } from './scouting';
import type { GameState, Notification } from './types';
import { dateOfDay, fmtL, money, notify, playerActs, post, remember, rngOf } from './util';

export const END_YEAR = 2040;

export interface AdvanceResult {
  months: number;
  stopReason?: L;
}

/** Abertura do mês: decisões vencidas, extrato, agendas e planos que começam. */
function openMonth(s: GameState, r: Rng): void {
  // decisões não respondidas seguem o padrão (o jogador teve o mês inteiro)
  for (const d of [...s.decisions]) resolveDecision(s, d.id, d.defaultOption);
  s.ledgerKeys = {};
  s.lastMonthLedger = s.monthLedger;
  s.monthLedger = {};
  s.notifications = s.notifications.filter((n) => s.week - n.week < 26);
  s.clock.monthStartWeek = s.week;
  s.clock.dayInMonth = 0;
  s.clock.opened = true;
  startPlans(s, r);
  processPlayerAgendas(s, r);
}

function daysInCurrentMonth(s: GameState): number {
  const { year, month } = dateOfDay(s.config.startYear, s.day);
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Avança até o próximo fechamento semanal de paradas (ou o fim do mês).
 * Granularidade diária para turnês, estúdio e crises. Retorna true se o mês fechou.
 */
export function advanceWeek(s: GameState): boolean {
  if (s.ended && !s.flags.sandbox) return true;
  const r = rngOf(s);
  // gêneros de movimentos são globais: garante que pertençam a este jogo (várias partidas no mesmo processo)
  registerMovementGenres(s);
  if (!s.clock.opened) openMonth(s, r);
  const dim = daysInCurrentMonth(s);
  while (s.clock.dayInMonth < dim) {
    const day = s.day + s.clock.dayInMonth;
    dailyStep(s, r, day);
    s.clock.dayInMonth += 1;
    if ((day + 1) % 7 === 0) {
      s.week += 1;
      for (const pr of [...s.pendingReleases]) {
        if (pr.week <= s.week) {
          s.pendingReleases.splice(s.pendingReleases.indexOf(pr), 1);
          if (s.acts[pr.actId]) launchPending(s, r, pr);
        }
      }
      marketWeek(s, r);
      weeklyExt(s, r);
      if (s.clock.dayInMonth < dim) return false;
    }
  }
  closeMonth(s, r, dim);
  return true;
}

export function advanceMonth(s: GameState): void {
  if (s.ended && !s.flags.sandbox) return;
  for (let i = 0; i < 8; i++) if (advanceWeek(s)) return;
}

function closeMonth(s: GameState, r: Rng, daysInMonth: number): void {
  const monthStartWeek = s.clock.monthStartWeek;
  s.day += daysInMonth;
  s.clock.dayInMonth = 0;
  s.clock.opened = false;

  // ---------- fechamento do mês ----------
  payMonth(s);
  resolveOffers(s, r);
  syncPipeline(s);
  checkPromises(s);
  contractsMonth(s);
  monthlyPeople(s, r);
  npcProduction(s, r);
  rivalsMonth(s, r);
  newRivalLabel(s, r);
  worldSpawns(s, r);
  monthlySignals(s, r);
  genresMonth(s, r);
  economyMonth(s);
  monthlyExt(s, r);
  const share = s.stats.marketUnitsYear > 0 ? s.stats.playerUnitsYear / s.stats.marketUnitsYear : 0;
  s.stats.marketShare = share;
  updateLegacy(s);
  checkCardGoal(s);

  const closingYear = s.year;
  if (s.month === 11) {
    yearlyAwards(s, r);
    yearlyExt(s, r);
    rivalYearEnd(s);
    s.stats.marketUnitsYear = 0;
    s.stats.playerUnitsYear = 0;
    prune(s);
    yearSummary(s, closingYear);
    payTaxes(s, closingYear);
  }
  if (s.month % 3 === 2) refreshProfessionals(s, r);

  // avança o calendário
  const nd = dateOfDay(s.config.startYear, s.day);
  s.year = nd.year;
  s.month = nd.month;
  techMonth(s);

  const monthIndex = (s.year - s.config.startYear) * 12 + s.month;
  storyteller(s, r, monthIndex);
  directorMonth(s, r);
  checkInsolvency(s, r);
  s.scoutActionsUsed = 0;
  if (s.year > END_YEAR && !s.ended) finishArc(s);
  buildBriefing(s, monthStartWeek);
}

function contractsMonth(s: GameState): void {
  for (const id of playerActs(s)) {
    const act = s.acts[id];
    const c = act.contractId ? s.contracts[act.contractId] : undefined;
    if (!c || act.playerBand) continue;
    if (c.party !== 'player') continue;
    const left = c.endWeek - s.week;
    if (left <= 0) {
      endContract(s, act, s.flags[`leaving:${act.id}`] ? 'left' : 'expired');
      delete s.flags[`leaving:${act.id}`];
    } else if (left <= 13 && left > 8) {
      notify(s, fmtL(l('Contrato de {a} vence em ~3 meses.', '{a}\'s contract ends in ~3 months.'), { a: act.name }), 'event');
    }
    // confiança muito baixa: o ato pede saída negociada
    if (act.trust < 12 && act.contractId) {
      endContract(s, act, 'left');
    }
  }
  // banda do jogador assinada com selo rival: fim do termo
  const band = s.player.bandActId ? s.acts[s.player.bandActId] : undefined;
  if (band?.contractId) {
    const c = s.contracts[band.contractId];
    if (c && c.party !== 'player' && c.endWeek <= s.week) {
      const lb = s.labels[c.party];
      if (lb) lb.roster = lb.roster.filter((x) => x !== band.id);
      band.contractId = undefined;
      notify(s, l('O contrato da sua banda com o selo terminou. Vocês voltam a ser independentes.', 'Your band\'s label deal ended. You are independent again.'), 'event');
    }
  }
}

function genresMonth(s: GameState, r: ReturnType<typeof rngOf>): void {
  const counts: Record<string, number> = {};
  for (const e of s.charts.singles.concat(s.charts.albums)) {
    const rel = s.releases[e.releaseId];
    const g = rel ? s.acts[rel.actId]?.genre : undefined;
    if (g) counts[g] = (counts[g] ?? 0) + (101 - e.pos) / 100;
  }
  // gêneros de movimento de outra partida aberta na mesma sessão não contam (GENRES é global)
  const alive = GENRES.filter((g) => g.born <= s.year && (!g.id.startsWith('mv_') || s.movements.some((m) => m.genreId === g.id)));
  const total = Object.values(counts).reduce((t, x) => t + x, 0) || 1;
  for (const g of alive) {
    if (g.born === s.year && s.month === 0) {
      s.genrePop[g.id] = 0.55;
      remember(s, 'genre_born', fmtL(l('Surge um novo gênero: {g}.', 'A new genre emerges: {g}.'), { g: g.name }), { important: true });
    }
    const share = (counts[g.id] ?? 0) / total;
    const target = clamp(0.5 + share * alive.length * 0.45, 0.25, 2);
    let pop = s.genrePop[g.id] ?? 0.6;
    pop += (target - pop) * 0.03 + r.normal(0, 0.015);
    // envelhecimento lento e revivals
    if (s.year - g.born > 30) pop -= 0.002;
    if (r.chance(s.config.mutators.includes('strong_nostalgia') ? 0.003 : 0.001)) {
      pop += 0.4;
      remember(s, 'revival', fmtL(l('Revival de {g}!', '{g} revival!'), { g: g.name }));
    }
    s.genrePop[g.id] = clamp(pop, 0.15, 2.2);
  }
  for (const k of Object.keys(s.scenes)) s.scenes[k] *= 0.97;
}

function economyMonth(s: GameState): void {
  if (s.economy.recession && s.week >= s.economy.recessionUntil) {
    s.economy.recession = false;
    notify(s, l('A recessão terminou.', 'The recession is over.'), 'good');
    remember(s, 'recovery', l('A economia se recupera.', 'The economy recovers.'));
  }
}

function techMonth(s: GameState): void {
  for (const t of TECHS) {
    const y = s.techDates[t.id];
    if (y === undefined) continue;
    if (s.year === y && s.month === 0) {
      notify(s, fmtL(l('Nova tecnologia: {t}.', 'New technology: {t}.'), { t: t.name }), 'event');
      remember(s, 'tech', fmtL(l('Chega {t}.', '{t} arrives.'), { t: t.name }), { important: true });
    }
    if (s.year === y - 2 && s.month === 0) {
      s.rumors.push({ id: t.id, text: fmtL(l('Rumor: engenheiros testam {t}. Ninguém sabe quando chega.', 'Rumor: engineers are testing {t}. Nobody knows when it lands.'), { t: t.name }), week: s.week, resolvesYear: y });
    }
  }
  s.rumors = s.rumors.filter((x) => x.resolvesYear >= s.year);
  if (s.divergence.clipnet === 'no' && s.year === techById.clipnet.base && s.month === 0) {
    remember(s, 'divergence', l('A rede de clipes nunca decolou nesta história.', 'The music-video network never took off in this history.'), { important: true });
  }
}

/** Impostos sobre o resultado positivo do ano (cascata do GDD §18). */
function payTaxes(s: GameState, year: number): void {
  const profit = s.player.profitByYear[year] ?? 0;
  if (profit <= 0) return;
  const rate = profit > money(s, 1_000_000) ? 0.32 : 0.22;
  post(s, `tax:${year}`, -Math.round(profit * rate), 'taxes', `Impostos ${year}`);
}

function yearSummary(s: GameState, year: number): void {
  const rev = s.player.revenueByYear[year] ?? 0;
  const profit = s.player.profitByYear[year] ?? 0;
  const m = (v: number) => ({ pt: formatMoney(v, 'pt-BR'), en: formatMoney(v, 'en-US') });
  remember(s, 'year', fmtL(l('Fim de {y}: receita {r}, resultado {p}.', 'End of {y}: revenue {r}, result {p}.'), { y: year, r: m(rev), p: m(profit) }));
}

/** Briefing de até 5 itens (GDD §6). */
function buildBriefing(s: GameState, sinceWeek: number): void {
  const items: Notification[] = [];
  if (s.player.cash < 0) items.push({ week: s.week, kind: 'bad', text: l('Caixa negativo: veja Empresa → Finanças.', 'Negative cash: see Company → Finances.') });
  if (s.decisions.length) items.push({ week: s.week, kind: 'event', text: fmtL(l('{n} decisão(ões) na mesa.', '{n} decision(s) on the desk.'), { n: s.decisions.length }) });
  const recent = s.notifications.filter((n) => n.week >= sinceWeek);
  const prio = (n: Notification) => (n.kind === 'bad' ? 0 : n.kind === 'good' ? 1 : n.kind === 'event' ? 2 : 3);
  items.push(...recent.sort((a, b) => prio(a) - prio(b)).slice(0, 5 - items.length));
  s.briefing = items.slice(0, 5);
}

/** Interrupções do avanço longo: insolvência, decisões, contrato vencendo, rival, lançamento. */
function interruptReason(s: GameState, sinceWeek: number): L | undefined {
  if (s.ended) return l('Fim da run.', 'Run ended.');
  if (s.player.cash < 0) return l('Insolvência à vista.', 'Insolvency looming.');
  if (s.decisions.length) return l('Há decisões na mesa.', 'Decisions on the desk.');
  if (s.offers.some((o) => o.status === 'counter')) return l('Contraproposta recebida.', 'Counter-offer received.');
  const n = s.notifications.find((x) => x.week >= sinceWeek && (x.kind === 'bad' || x.kind === 'event'));
  if (n) return n.text;
  return undefined;
}

export function advance(s: GameState, mode: 'week' | 'month' | 'quarter' | 'event'): AdvanceResult {
  if (mode === 'week') {
    const closed = advanceWeek(s);
    return { months: closed ? 1 : 0 };
  }
  const max = mode === 'month' ? 1 : mode === 'quarter' ? 3 : 12;
  let months = 0;
  for (let i = 0; i < max; i++) {
    const since = s.week;
    advanceMonth(s);
    months += 1;
    if (mode !== 'month') {
      const why = interruptReason(s, since);
      if (why) return { months, stopReason: why };
    }
    if (s.ended && !s.flags.sandbox) break;
  }
  return { months };
}

export function genreName(id: string): L {
  return genreById[id]?.name ?? l(id);
}

