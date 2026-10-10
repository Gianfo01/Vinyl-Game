// Rodada 13: despesas escalam com porte e época.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { launchPromo, oh, overheadPlan, tierOf } from '../src/sim/sys/overhead13';
import { toReal } from '../src/core/money';
import { money } from '../src/sim/util';

const mk = (year: number) => createGame(defaultConfig('r13-oh', { startYear: year }));

describe('overhead13', () => {
  it('selo pequeno quase não paga e tiers sobem', () => {
    const s = mk(1990);
    oh(s).ema = 0;
    expect(overheadPlan(s, 50e3).total).toBe(0);
    expect(tierOf(100e3).id).toBe('indie');
    expect(tierOf(5e6).id).toBe('mid');
    expect(tierOf(30e6).id).toBe('major');
  });
  it('major paga 10-38% da receita (streaming: +8 p.p. de playlists/anúncios; 2010+: +5 p.p. da corrida por playlists) e mais que o pequeno', () => {
    const s = mk(2018);
    const R = 20e6;
    oh(s).ema = Math.round(money(s, R) / 12); // receita mensal em centavos nominais
    const small = overheadPlan(s, 1.5e6);
    const big = overheadPlan(s, R);
    expect(big.total).toBeGreaterThan(small.total);
    const rate = big.total / oh(s).ema;
    expect(rate).toBeGreaterThan(0.1);
    expect(rate).toBeLessThanOrEqual(0.39);
  });
  it('promoção do lançamento depende da época e do tamanho do mercado', () => {
    const a = mk(1970), b = mk(2018);
    const t = { type: 'lp' as const, territories: ['na', 'eu'] as never };
    const one = { type: 'lp' as const, territories: ['br'] as never };
    const R = 5e6;
    const pa = toReal(launchPromo(a, t, R).amount, a.year), pb = toReal(launchPromo(b, t, R).amount, b.year);
    expect(pb).toBeGreaterThan(pa);
    expect(launchPromo(b, t, R).amount).toBeGreaterThan(launchPromo(b, one, R).amount);
    expect(launchPromo(b, t, 50e3).amount).toBe(0);
  });
});
