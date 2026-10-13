// Mutators da rodada 6. Os efeitos numéricos entram como perks; o que é dinâmico (modas relâmpago, impostos,
// carreiras curtas, fãs volúveis) roda em ganchos. (As Cartas do selo saíram na r22; o código delas foi apagado na r27.)

import { clamp } from '../../core/rng';
import { toReal } from '../../core/money';
import { l } from '../../data/world';
import { MUTATORS } from '../../data/rules';
import { registerSimHook } from '../ext4';
import { registerPerkSource, type PerkEntry, type PerkValues } from '../perks';
import { fmtL, hasMutator, money, notify, post } from '../util';

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

registerSimHook('newgame', 'cards6', (s) => {
  if (hasMutator(s, 'short_careers')) for (const a of Object.values(s.acts)) if (a.careerEnd - a.debutYear > 18) a.careerEnd = a.debutYear + 18;
});

// ---------------------------------------------------------------- dinâmicos

registerSimHook('month', 'cards6', (s, r) => {
  if (hasMutator(s, 'fast_trends')) for (const g of Object.keys(s.genrePop)) if (s.genrePop[g] > 0) s.genrePop[g] = clamp(s.genrePop[g] + r.normal(0, 0.06), 0.05, 2.2);
  if (hasMutator(s, 'fickle_fans')) for (const a of Object.values(s.acts)) if (a.momentum > 10) a.momentum *= 0.96;
  if (hasMutator(s, 'short_careers')) for (const a of Object.values(s.acts)) if (a.careerEnd - a.debutYear > 18) a.careerEnd = a.debutYear + 18;
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
