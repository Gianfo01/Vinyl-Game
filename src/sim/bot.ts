// Jogador automático simples para o simulador sem interface (GDD §26, §27).
// Usa as mesmas ações e validadores da interface.

import { HQ_LEVELS } from '../data/rules';
import { MARKETS } from '../data/world';
import { acceptCounter, careerSlotsUsed, defaultOffer, evaluateOffer, makeOffer } from './contracts';
import { hireStaff, openTerritory, takeLoan, territoryCost, upgradeCost, upgradeHq } from './economy';
import { estimateMonthlyBurn } from './events';
import { canScout, estimate, scoutAct } from './scouting';
import type { GameState } from './types';
import { money } from './util';
import { createGame } from './worldgen';
import type { RunConfig } from './types';
import { advanceMonth } from './tick';

export function botMonth(s: GameState): void {
  if (s.player.cash < estimateMonthlyBurn(s) * 2 && s.player.loans.length === 0) takeLoan(s);
  if (s.config.role !== 'artist') {
    // scouting: aprofunda os sinais mais promissores
    const ks = Object.values(s.knowledge)
      .filter((k) => s.acts[k.actId] && !s.acts[k.actId].owner && k.degree < 4)
      .sort((a, b) => (s.acts[b.actId].fame + b.degree * 5) - (s.acts[a.actId].fame + a.degree * 5));
    for (const k of ks) {
      if (!canScout(s, k.actId).ok) break;
      scoutAct(s, k.actId);
    }
    // oferta: potencial estimado alto e vaga na sede
    const cap = HQ_LEVELS[s.player.hq].careers;
    if (careerSlotsUsed(s) < cap) {
      const cands = Object.values(s.knowledge)
        .filter((k) => k.degree >= 3 && s.acts[k.actId] && !s.acts[k.actId].owner && !s.offers.some((o) => o.actId === k.actId && (o.status === 'pending' || o.status === 'counter')))
        .map((k) => ({ k, pot: estimate(s, k.actId, 'potential')?.mid ?? 0 }))
        .sort((a, b) => b.pot - a.pot);
      const best = cands[0];
      if (best && best.pot >= 55) {
        const act = s.acts[best.k.actId];
        const o = defaultOffer(s, act);
        if (evaluateOffer(s, act, o).band !== 'unlikely' && s.player.cash > o.advance * 3) makeOffer(s, o);
      }
    }
    for (const o of s.offers) if (o.status === 'counter' && s.player.cash > o.advance * 4) acceptCounter(s, o.id);
    // crescimento
    const up = upgradeCost(s);
    if (up !== null && s.player.cash > up * 4) upgradeHq(s);
    if (s.player.cash > money(s, 80000) && s.player.staff.length < HQ_LEVELS[s.player.hq].staff) {
      const want = ['producer', 'anr', 'publicist', 'engineer', 'analyst', 'booking'];
      const have = new Set(s.player.staff.map((x) => x.role));
      const pro = s.professionals.filter((p) => want.includes(p.role) && !have.has(p.role)).sort((a, b) => b.skill - a.skill)[0];
      if (pro) hireStaff(s, pro.id);
    }
    for (const m of MARKETS) {
      if (s.player.territories.includes(m.id)) continue;
      if (s.player.cash > territoryCost(s, m.id) * 6) openTerritory(s, m.id);
    }
  }
}

export interface SimSummary {
  seed: string;
  endYear: number;
  cash: number;
  ended?: string;
  number1s: number;
  releases: number;
  legacy: number;
  topActsByDecade: Record<number, string[]>;
}

export function simulate(cfg: RunConfig, years: number, bot = true): { state: GameState; summary: SimSummary } {
  const s = createGame(cfg);
  const topActsByDecade: Record<number, Set<string>> = {};
  for (let m = 0; m < years * 12 && !s.ended; m++) {
    if (bot) botMonth(s);
    advanceMonth(s);
    const dec = Math.floor(s.year / 10) * 10;
    const set = (topActsByDecade[dec] ??= new Set());
    for (const e of s.charts.singles.slice(0, 100)) {
      const rel = s.releases[e.releaseId];
      if (rel && s.acts[rel.actId]) set.add(s.acts[rel.actId].name);
    }
  }
  const legacy = Object.values(s.player.legacy).reduce((t, x) => t + x, 0);
  return {
    state: s,
    summary: {
      seed: cfg.seed,
      endYear: s.year,
      cash: s.player.cash,
      ended: s.ended?.ending,
      number1s: s.player.stats.number1s,
      releases: s.player.stats.releases,
      legacy: Math.round(legacy),
      topActsByDecade: Object.fromEntries(Object.entries(topActsByDecade).map(([k, v]) => [Number(k), [...v]])),
    },
  };
}

export function defaultConfig(seed: string, over: Partial<RunConfig> = {}): RunConfig {
  return {
    seed,
    role: 'label',
    scenario: 'from_zero',
    startYear: 1960,
    mode: 'free',
    storyteller: 'maestro',
    card: 'none',
    mutators: [],
    difficulty: 'normal',
    ironman: false,
    homeCity: 'london',
    companyName: 'Selo Teste',
    contentFilters: [],
    ...over,
  };
}
