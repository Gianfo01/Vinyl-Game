// Rodada 21 (revisão B — dinheiro): lançamentos duplicados não criam nem destroem dinheiro (B-1), a retomada por
// credor abate a dívida em vez de pagar o jogador (B-2) e o caixa negativo não vira credor (dívida contada duas vezes, B-3).
import { describe, expect, it } from 'vitest';
import { rngOf } from '../src/sim/util';
import { defaultConfig } from '../src/sim/bot';
import { creditorsMonth } from '../src/sim/finance';
import { position20 } from '../src/sim/oblig20';
import { foundSubLabel, transferToSub } from '../src/sim/sublabels';
import { capital, payDividend } from '../src/sim/sys/capital';
import { ownerOf } from '../src/sim/sys/people/owner';
import type { GameState } from '../src/sim/types';
import type { SubLabel } from '../src/sim/xtypes';
import { createGame } from '../src/sim/worldgen';
import '../src/sim/hooks';

const game = (): GameState => createGame(defaultConfig('r21b', { startYear: 1998 }));

describe('r21 B — dinheiro que nasce ou some', () => {
  it('B-1a: dois aportes ao subselo na mesma semana saem os dois do caixa da matriz', () => {
    const s = game();
    s.player.hq = 2;
    s.player.cash = 50_000_00;
    const sl = foundSubLabel(s, rngOf(s), 'Sub', 'rock', 3_000_00, 'development') as SubLabel;
    expect('id' in sl).toBe(true);
    const c0 = s.player.cash, sc0 = sl.cash;
    expect(transferToSub(s, sl.id, 5_000_00)).toBeNull();
    expect(transferToSub(s, sl.id, 5_000_00)).toBeNull();
    expect(c0 - s.player.cash).toBe(10_000_00);
    expect(sl.cash - sc0).toBe(10_000_00);
  });

  it('B-1c: dois dividendos na mesma semana debitam o caixa duas vezes (nada nasce no bolso do dono)', () => {
    const s = game();
    s.player.cash = 100_000_00;
    const w0 = ownerOf(s).wealth;
    expect(payDividend(s, 0.1)).toBeNull();
    const c1 = s.player.cash, w1 = ownerOf(s).wealth;
    expect(payDividend(s, 0.1)).toBeNull();
    const c2 = s.player.cash, w2 = ownerOf(s).wealth;
    // o segundo também saiu do caixa, e o bolso do dono só cresceu por dinheiro que saiu da empresa
    expect(100_000_00 - c1).toBeGreaterThan(0);
    expect(c1 - c2).toBeGreaterThan(0);
    expect(w2 - w0).toBeLessThanOrEqual(100_000_00 - c2);
    expect(w2 - w1).toBeGreaterThan(0);
    expect(capital(s).dividendsYear[s.year]).toBe(100_000_00 - c2);
  });

  it('B-2: a retomada abate o que é devido ao credor; o caixa só recebe a sobra', () => {
    const s = game();
    s.player.cash = 0;
    s.assets = [{ id: 'as-t', kind: 'equipment', name: 'Mesa', cost: 50_000_00, bookValue: 50_000_00, lifeMonths: 60, boughtMonth: 0 }];
    s.creditors = [{ id: 'cr-t', name: 'Prensa & Cia.', kind: 'supplier', patience: -10, owed: 100_000_00 }];
    creditorsMonth(s, rngOf(s));
    expect(s.assets.length).toBe(0);
    expect(s.creditors[0].owed).toBe(100_000_00 - 30_000_00); // 60% do valor contábil abate a dívida
    expect(s.player.cash).toBe(0); // nada entra no caixa
    // dívida menor que o valor retomado: a sobra volta ao caixa
    const s2 = game();
    s2.player.cash = 0;
    s2.assets = [{ id: 'as-u', kind: 'equipment', name: 'Mesa', cost: 50_000_00, bookValue: 50_000_00, lifeMonths: 60, boughtMonth: 0 }];
    s2.creditors = [{ id: 'cr-u', name: 'Prensa & Cia.', kind: 'supplier', patience: -10, owed: 10_000_00 }];
    creditorsMonth(s2, rngOf(s2));
    expect(s2.creditors.find((c) => c.id === 'cr-u')?.owed ?? 0).toBe(0);
    expect(s2.player.cash).toBe(20_000_00);
  });

  it('B-3: caixa negativo não vira credor — o patrimônio não cai só por rodar o mês dos credores', () => {
    const s = game();
    s.creditors = [];
    s.player.cash = -80_700_00;
    const eq0 = position20(s).equity;
    creditorsMonth(s, rngOf(s));
    const sup = s.creditors.find((c) => c.kind === 'supplier');
    expect(sup?.owed ?? 0).toBe(0);
    expect(position20(s).equity).toBe(eq0);
  });
});
