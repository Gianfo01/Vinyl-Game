// R17 balanço: insolvência em 4 meses seguidos no vermelho; fatia 360 encolhe com a fama e tem teto anual por ato.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { checkInsolvency, INSOLVENT_AT } from '../src/sim/economy';
import { cap360, eff360, lever360, take360 } from '../src/sim/sys/deal360_17';
import { Rng } from '../src/core/rng';

describe('r17 balanço', () => {
  it('quebra no 4º mês seguido de caixa negativo', () => {
    const s = createGame(defaultConfig('r17bal', { startYear: 1990 }));
    const r = Rng.fromSeed('r17bal');
    expect(INSOLVENT_AT).toBe(4);
    s.player.cash = -100;
    for (let i = 1; i < INSOLVENT_AT; i++) { checkInsolvency(s, r); s.player.cash = -100; expect(s.ended).toBeFalsy(); }
    checkInsolvency(s, r);
    expect(s.ended?.reason).toBe('insolvency');
  });
  it('360: estrela paga fatia menor e o selo tem teto anual por ato', () => {
    const s = createGame(defaultConfig('r17bal-3', { startYear: 2012 }));
    const a = Object.values(s.acts)[0];
    expect(lever360(30)).toBe(1);
    expect(lever360(90)).toBeLessThan(0.5);
    a.fame = 90;
    expect(eff360(a, 0.15)).toBeLessThan(0.075);
    const big = cap360(s) * 100;
    const first = take360(s, a, big, 0.15);
    expect(first).toBe(cap360(s));
    expect(take360(s, a, big, 0.15)).toBe(0);
    s.year += 1;
    expect(take360(s, a, 1000, 0.15)).toBeGreaterThan(0);
  });
});
