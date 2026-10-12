// r23 — fechamento do mês: a barra do topo mostra o mês que ACABOU de fechar (não o anterior a ele).

import { describe, expect, it } from 'vitest';
import { botMonth, defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { closedList23, lastClosed23, lastMonthView23, ledgerNet23, CLOSED23_MAX } from '../src/sim/close23';
import { post } from '../src/sim/util';

describe('r23 fechamento do mês', () => {
  it('último mês exibido = caixa final − inicial do mês recém-fechado = soma do extrato', () => {
    const s = createGame(defaultConfig('r23-fin', { startYear: 1975 }));
    let adjMonths = 0;
    for (let i = 1; i <= 8; i++) {
      botMonth(s);
      const y0 = s.year, m0 = s.month;
      advanceMonth(s);
      const c = lastClosed23(s)!;
      expect(closedList23(s).length).toBe(i);
      expect([c.y, c.m]).toEqual([y0, m0]); // o mês que acabou de fechar, não o anterior
      expect(c.cashEnd).toBe(s.player.cash);
      if (i > 1) expect(c.cashStart).toBe(closedList23(s).at(-2)!.cashEnd);
      const v = lastMonthView23(s);
      expect(v.delta).toBe(c.cashEnd - c.cashStart);
      expect(v.net).toBe(ledgerNet23(s.lastMonthLedger));
      expect(v.net).toBe(ledgerNet23(c.byCat));
      // caixa = extrato + ajustes de competência (a receber/a pagar); sem títulos, idênticos
      expect(v.delta).toBe(v.net + v.adj);
      if (v.adj) adjMonths++;
      else expect(v.delta).toBe(v.net);
      expect(s.monthLedger).toEqual({});
    }
    expect(adjMonths).toBeLessThan(8);
  });

  it('extrato do mês fechado é imutável; lançamento entre meses vai para o mês novo', () => {
    const s = createGame(defaultConfig('r23-imm'));
    advanceMonth(s);
    const c = lastClosed23(s)!;
    const before = ledgerNet23(c.byCat);
    post(s, 'r23test', 1000, 'other_income', 'teste');
    expect(ledgerNet23(c.byCat)).toBe(before);
    expect(s.monthLedger.other_income).toBe(1000);
    advanceMonth(s);
    expect(lastClosed23(s)!.byCat.other_income).toBeGreaterThanOrEqual(1000);
  });

  it('save antigo (sem campos r23) gira o extrato uma vez na abertura e segue', () => {
    const s = createGame(defaultConfig('r23-old'));
    advanceMonth(s);
    const x = s as unknown as Record<string, unknown>;
    // simula save r22: extrato do mês fechado ainda em monthLedger
    s.monthLedger = { ...s.lastMonthLedger };
    delete x.cashOpen23; delete x.closed23; delete x.monthSect23;
    advanceMonth(s);
    expect(closedList23(s).length).toBe(2);
    const v = lastMonthView23(s);
    expect(v.delta).toBe(lastClosed23(s)!.cashEnd - lastClosed23(s)!.cashStart);
  });

  it('histórico limitado a 24 meses', () => {
    const s = createGame(defaultConfig('r23-hist'));
    advanceMonth(s);
    const list = closedList23(s);
    for (let i = 0; i < CLOSED23_MAX; i++) list.unshift({ ...list[0], y: 1900 + i });
    advanceMonth(s);
    expect(closedList23(s).length).toBe(CLOSED23_MAX);
    expect(closedList23(s).at(-1)!.m).toBe(1);
  });
});
