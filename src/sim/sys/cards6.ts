// Cartas do selo e mutators da rodada 6. Os efeitos numéricos entram como perks; o que é dinâmico
// (golpes de sorte, modas relâmpago, impostos, carreiras curtas, fãs volúveis) roda em ganchos.
// Também dá perks às cartas antigas que só tinham efeito pontual (Globalista, Pioneiro Sintético).

import { clamp } from '../../core/rng';
import { toReal } from '../../core/money';
import { l } from '../../data/world';
import { cardById, MUTATORS } from '../../data/rules';
import { registerSimHook } from '../ext4';
import { EXTRA_CARD_GOALS } from '../legacy';
import { registerPerkSource, type PerkEntry, type PerkValues } from '../perks';
import type { GameState } from '../types';
import { ownerOf } from './people/owner';
import { fmtL, hasCard, hasMutator, money, notify, playerActs, post } from '../util';
import { allReleases17 } from '../relidx17';

const CARD_PERKS: Record<string, PerkValues> = {
  indie_spirit: { trust: 8, critics: 0.3, chartUnits: -0.05 },
  hit_factory: { appeal: 0.08, chartUnits: 0.05, critics: -0.4, morale: -0.5 },
  family_business: { energy: 1, wealth: 100, morale: 0.5, valuation: -0.1 },
  gambler: { offer: 0.06, advance: 0.1 },
  tastemaker: { critics: 0.5, signals: 1, showRevenue: -0.05 },
  road_warrior: { showRevenue: 0.12, energy: 1, pressingCost: 0.1 },
  conglomerate: { valuation: 0.25, staffCost: -0.08, trust: -6 },
  underdog: { xp: 0.25 },
  provocateur: { appeal: 0.07, reputation: -2 },
  activist: { reputation: 2, critics: 0.2, trust: 4, staffCost: 0.05 },
  inventor: { pressingCost: -0.12, chartUnits: 0.04, songQ: -0.5 },
  dynast: { morale: 0.5, stress: -0.1 },
  globalist: { signals: 1 },
  synthetic_pioneer: { chartUnits: 0.03, critics: -0.2 },
};

const MUT_PERKS: Record<string, PerkValues> = {
  expensive_plants: { pressingCost: 0.25 },
  generous_critics: { critics: 0.6 },
  harsh_critics: { critics: -0.7 },
  stage_fever: { showRevenue: 0.2, chartUnits: -0.1 },
  hustle_culture: { energy: 1, stress: 0.4 },
  talent_flood: { signals: 2, scoutActions: 1 },
  galloping_inflation: { advance: 0.15, staffCost: 0.15 },
  loyal_artists: { trust: 10, morale: 0.5 },
};

registerPerkSource('cards6', (s) => {
  const out: PerkEntry[] = [];
  const card = cardById[s.config.card];
  const cp = CARD_PERKS[s.config.card];
  if (card && cp) out.push({ label: fmtL(l('Carta: {c}', 'Card: {c}'), { c: card.name }), values: cp });
  if (s.config.card === 'underdog') out.push({ label: fmtL(l('Carta: {c}', 'Card: {c}'), { c: card.name }), values: { appeal: 0.06, offer: 0.05 }, act: (_s, a) => a.fame < 20 });
  for (const id of s.config.mutators) {
    const m = MUTATORS.find((x) => x.id === id);
    if (!m) continue;
    const mp = MUT_PERKS[id];
    if (mp) out.push({ label: fmtL(l('Mutator: {m}', 'Mutator: {m}'), { m: m.name }), values: mp });
    if (id === 'superstar_economy') {
      out.push({ label: fmtL(l('Mutator: {m}', 'Mutator: {m}'), { m: m.name }), values: { appeal: 0.15 }, act: (_s, a) => a.fame >= 40 });
      out.push({ label: fmtL(l('Mutator: {m}', 'Mutator: {m}'), { m: m.name }), values: { appeal: -0.05 }, act: (_s, a) => a.fame < 40 });
    }
    if (id === 'beginners_luck' && s.year - s.config.startYear < 3) out.push({ label: fmtL(l('Mutator: {m}', 'Mutator: {m}'), { m: m.name }), values: { appeal: 0.12 } });
  }
  return out;
});

// ---------------------------------------------------------------- começo do jogo

registerSimHook('newgame', 'cards6', (s, r) => {
  if (hasCard(s, 'underdog')) post(s, 'card:underdog', -Math.round(s.player.cash * 0.3), 'misc', 'Começo de azarão');
  if (hasCard(s, 'gambler')) post(s, 'card:gambler', money(s, r.chance(0.5) ? 4000 : -2000), 'misc', 'Aposta inicial');
  if (hasMutator(s, 'short_careers')) for (const a of Object.values(s.acts)) if (a.careerEnd - a.debutYear > 18) a.careerEnd = a.debutYear + 18;
});

// ---------------------------------------------------------------- dinâmicos

registerSimHook('month', 'cards6', (s, r) => {
  if (hasCard(s, 'gambler') && r.chance(0.06)) {
    const win = r.chance(0.55);
    const amt = money(s, r.int(1500, 9000)) * (win ? 1 : -1);
    post(s, `gamble:${s.month}`, amt, 'misc', win ? 'Golpe de sorte' : 'Azar');
    notify(s, win ? fmtL(l('O Apostador acertou: +{v}.', 'The Gambler hit it: +{v}.'), { v: Math.round(toReal(amt, s.year)) }) : fmtL(l('A sorte virou: −{v}.', 'Luck turned: −{v}.'), { v: Math.round(toReal(-amt, s.year)) }), win ? 'good' : 'bad');
  }
  if (hasMutator(s, 'fast_trends')) for (const g of Object.keys(s.genrePop)) if (s.genrePop[g] > 0) s.genrePop[g] = clamp(s.genrePop[g] + r.normal(0, 0.06), 0.05, 2.2);
  if (hasMutator(s, 'fickle_fans')) for (const a of Object.values(s.acts)) if (a.momentum > 10) a.momentum *= 0.96;
  if (hasMutator(s, 'short_careers')) for (const a of Object.values(s.acts)) if (a.careerEnd - a.debutYear > 18) a.careerEnd = a.debutYear + 18;
  if (hasCard(s, 'underdog')) for (const id of playerActs(s)) if (s.acts[id].fame <= 5 && !s.flags[`underdog:${id}`]) s.flags[`underdog:${id}`] = 1;
});

registerSimHook('year', 'cards6', (s) => {
  if (hasMutator(s, 'wealth_tax')) {
    const floor = money(s, 100000);
    if (s.player.cash > floor) {
      const tax = Math.round((s.player.cash - floor) * 0.03);
      post(s, `wealthtax:${s.year}`, -tax, 'taxes', 'Imposto sobre fortunas');
      notify(s, fmtL(l('Imposto sobre fortunas: −{v}.', 'Wealth tax: −{v}.'), { v: Math.round(toReal(tax, s.year)) }), 'info');
    }
  }
});

registerSimHook('show', 'cards6', (s, _r, arg) => {
  if (arg.show && s.acts[arg.show.actId]?.owner === 'player') s.flags.rosterShows = (s.flags.rosterShows ?? 0) + 1;
});

// ---------------------------------------------------------------- metas das cartas novas

const avgScore = (s: GameState, relId: string) => {
  const rv = s.reviews[relId];
  return rv?.length ? rv.reduce((t, x) => t + x.score, 0) / rv.length : 0;
};
const myReleases = (s: GameState) => allReleases17(s).filter((r) => r.owner === 'player');

EXTRA_CARD_GOALS.indie_spirit = (s) => myReleases(s).filter((r) => avgScore(s, r.id) >= 8).length >= 3;
EXTRA_CARD_GOALS.hit_factory = (s) => s.player.stats.top10s >= 10;
EXTRA_CARD_GOALS.family_business = (s) => ownerOf(s).generation >= 2;
EXTRA_CARD_GOALS.gambler = (s) => s.player.cash >= money(s, 1_000_000);
EXTRA_CARD_GOALS.tastemaker = (s) => myReleases(s).filter((r) => avgScore(s, r.id) >= 9).length >= 5;
EXTRA_CARD_GOALS.road_warrior = (s) => (s.flags.rosterShows ?? 0) >= 200;
EXTRA_CARD_GOALS.conglomerate = (s) => !!s.flags.ipoDone;
EXTRA_CARD_GOALS.underdog = (s) => playerActs(s).some((id) => s.flags[`underdog:${id}`] && s.acts[id].number1s > 0);
EXTRA_CARD_GOALS.provocateur = (s) => s.player.stats.scandalsSurvived >= 3;
EXTRA_CARD_GOALS.activist = (s) => s.player.reputation.institutional >= 80;
EXTRA_CARD_GOALS.inventor = (s) => s.player.equipment.includes('own_plant') && s.player.equipment.length >= 3;
EXTRA_CARD_GOALS.dynast = (s) => ownerOf(s).generation >= 3;
