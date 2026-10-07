// IA dos rivais baseada em regras, estado e seed; registra o motivo de cada decisão (GDD §19).

import { clamp, type Rng } from '../core/rng';
import { familyOf, l } from '../data/world';
import { signWithRival, endContract, expectedAdvance } from './contracts';
import type { GameState, Label } from './types';
import { fmtL, money, notify, remember } from './util';
import { talentScore } from './worldgen';
import { emitEvent } from './events';

const ROSTER_CAP: Record<Label['family'], number> = { A: 32, B: 14, C: 20, D: 12 };

export function rivalsMonth(s: GameState, r: Rng): void {
  for (const lb of Object.values(s.labels)) {
    if (!lb.active) {
      if (!lb.closedYear && lb.founded <= s.year) {
        lb.active = true;
        remember(s, 'label_founded', fmtL(l('{n} é fundada.', '{n} is founded.'), { n: lb.name }));
      }
      continue;
    }
    // despesas fixas
    lb.cash -= money(s, 4000 + lb.roster.length * 1800) * (lb.family === 'A' ? 2 : 1);
    lb.roster = lb.roster.filter((id) => s.acts[id] && s.acts[id].owner === lb.id);
    const cap = ROSTER_CAP[lb.family];
    // contratação: atos públicos (fama visível) ou estreias do catálogo
    if (lb.roster.length < cap && lb.cash > money(s, 40000) && r.chance(0.07 + lb.aggression * 0.16)) {
      const pool = Object.values(s.acts).filter(
        (a) => !a.owner && (a.status === 'active' || a.status === 'emerging') && (a.fame > 6 || (a.catalogNo && s.year >= a.debutYear)),
      );
      const best = pool
        .map((a) => {
          const fit = lb.focus.length === 0 || lb.focus.includes(familyOf(a.genre)) ? 1 : 0.35;
          const strat = lb.strategy === 'stars' ? a.fame * 1.5 : lb.strategy === 'develop' ? talentScore(s, a) : a.fame + talentScore(s, a) * 0.5;
          return { a, v: strat * fit * r.float(0.7, 1.3) };
        })
        .sort((x, y) => y.v - x.v)[0];
      if (best && best.v > 12 && lb.cash > money(s, expectedAdvance(s, best.a))) {
        signWithRival(s, best.a, lb.id, r);
        lb.lastDecision = `signed ${best.a.name}: ${lb.strategy}`;
        if ((s.knowledge[best.a.id]?.degree ?? 0) >= 2 && s.config.role !== 'artist') {
          notify(s, fmtL(l('{lb} contratou {a}, que estava no seu radar.', '{lb} signed {a}, who was on your radar.'), { lb: lb.name, a: best.a.name }), 'bad');
        }
        if (best.a.catalogNo) remember(s, 'rival_sign', fmtL(l('{lb} contrata {a}.', '{lb} signs {a}.'), { lb: lb.name, a: best.a.name }), { actId: best.a.id });
      }
    }
    // corte de elenco: atos sem resultado
    for (const id of [...lb.roster]) {
      const a = s.acts[id];
      if (!a) continue;
      const c = a.contractId ? s.contracts[a.contractId] : undefined;
      if (c && c.endWeek < s.week) {
        if (a.fame > 25 && r.chance(0.7)) {
          c.endWeek = s.week + 156;
          c.releasesOwed += 3;
        } else endContract(s, a, 'expired');
      } else if (a.fame < 4 && a.hits === 0 && c && s.week - c.startWeek > 156 && r.chance(0.2)) {
        endContract(s, a, 'terminated');
        lb.lastDecision = `dropped ${a.name}: no results`;
      }
    }
    // estratégia muda com caixa e mercado
    if (r.chance(0.02)) {
      const prev = lb.strategy;
      lb.strategy = lb.cash < money(s, 200000) ? 'niche' : r.pick(['develop', 'buy_catalog', 'niche', 'stars'] as const);
      if (prev !== lb.strategy) lb.lastDecision = `strategy ${prev} → ${lb.strategy}`;
    }
    // expansão de territórios
    if (lb.cash > money(s, 2_000_000) && lb.territories.length < 7 && r.chance(0.05)) {
      const add = (['na', 'eu', 'br', 'latam', 'asia', 'africa', 'oceania'] as const).find((m) => !lb.territories.includes(m));
      if (add) lb.territories.push(add);
    }
    // falência
    if (lb.cash < -money(s, 300000)) closeLabel(s, r, lb);
  }
  // aquisições: família D/A compra selos fracos
  if (r.chance(0.04)) {
    const buyers = Object.values(s.labels).filter((x) => x.active && (x.family === 'A' || x.family === 'D') && x.cash > money(s, 3_000_000));
    const targets = Object.values(s.labels).filter((x) => x.active && x.cash < money(s, 100000) && x.roster.length > 0);
    if (buyers.length && targets.length) {
      const b = r.pick(buyers);
      const t = r.pick(targets);
      if (b !== t) {
        emitEvent(s, r, 'rival_merger', { buyer: b.id, target: t.id });
      }
    }
  }
}

function closeLabel(s: GameState, r: Rng, lb: Label): void {
  lb.active = false;
  lb.closedYear = s.year;
  for (const id of [...lb.roster]) {
    const a = s.acts[id];
    if (a) endContract(s, a, 'terminated');
  }
  // catálogo vendido para quem tem caixa
  const buyer = Object.values(s.labels).filter((x) => x.active && x.cash > money(s, 500000)).sort((a, b) => b.cash - a.cash)[0];
  if (buyer) for (const rel of Object.values(s.releases)) if (rel.owner === lb.id) rel.owner = buyer.id;
  remember(s, 'label_closed', fmtL(l('{n} fecha as portas{b}.', '{n} closes its doors{b}.'), { n: lb.name, b: buyer ? ` (catálogo → ${buyer.name})` : '' }), { important: true });
  notify(s, fmtL(l('{n} faliu. Os atos do selo estão livres.', '{n} went bankrupt. Its acts are free agents.'), { n: lb.name }), 'event');
  lb.reputation = clamp(lb.reputation - 30, 0, 100);
  void r;
}

export function rivalYearEnd(s: GameState): void {
  for (const lb of Object.values(s.labels)) {
    lb.revenueLastYear = lb.revenueYear;
    lb.revenueYear = 0;
  }
}
