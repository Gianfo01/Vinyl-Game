// Rodada 19 (onda 4) — equilíbrio final: divisão do lucro da banda (carreira de artista) e componente de lucro na
// avaliação do selo.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { fin18, mIdx18, opProfit18 } from '../src/sim/ledger18';
import { explain18 } from '../src/sim/explain18';
import { createGame } from '../src/sim/worldgen';
import { band18 } from '../src/sim/sys/artist18';
import { bandMates19, bandMonth19, bandpay19, fundShare19 } from '../src/sim/sys/bandpay19';
import { marginFactor19, valuation17 } from '../src/sim/sys/sale17';
import { post } from '../src/sim/util';

describe('r19 onda 4 — equilíbrio', () => {
  it('banda divide o lucro do mês em partes iguais; prejuízo é abatido antes', () => {
    const s = createGame(defaultConfig('r19-bal-1', { startYear: 1975, role: 'artist', bandGenre: 'rnr', bandName: 'Banda Teste' }));
    const a = band18(s)!;
    while (bandMates19(s).length < 3) a.members.push(Object.values(s.persons).find((p) => p.alive && !p.isPlayer && !a.members.includes(p.id))!.id);
    const k = bandMates19(s).length;
    // mês com prejuízo: nada é dividido e fica a recuperar
    post(s, 't:loss', -10000000, 'live_costs', 'teste');
    let c0 = s.player.cash;
    bandMonth19(s);
    expect(s.player.cash).toBe(c0);
    const carry = bandpay19(s).carry;
    expect(carry).toBeLessThan(0);
    // mês seguinte com lucro: abate o prejuízo e divide o resto em k+1 partes
    s.month = (s.month + 1) % 12; if (s.month === 0) s.year++;
    post(s, 't:gain', 50000000, 'live', 'teste');
    const profit = opProfit18(fin18(s).m[mIdx18(s)]);
    c0 = s.player.cash;
    bandMonth19(s);
    expect(c0 - s.player.cash).toBe(Math.round((profit + carry) * (1 - fundShare19(k))));
    expect(fundShare19(3)).toBeCloseTo(0.25);
    expect(bandpay19(s).carry).toBe(0);
    expect(explain18(s, 'bandpay19')?.parts?.length).toBeGreaterThan(1);
  });

  it('selo no zero a zero vale menos que um lucrativo com o mesmo catálogo', () => {
    expect(marginFactor19(0)).toBeCloseTo(0.6);
    expect(marginFactor19(0.25)).toBeCloseTo(1);
    expect(marginFactor19(-0.5)).toBe(0.35);
    const s = createGame(defaultConfig('r19-bal-2', { startYear: 1995 }));
    const f = fin18(s), mi = mIdx18(s);
    for (const k of Object.keys(f.m)) delete f.m[Number(k)];
    expect(valuation17(s).profit ?? 0).toBe(0); // histórico curto: sem ajuste
    for (let k = 1; k <= 12; k++) f.m[mi - k] = { 'rev:rec': 1000000, 'cost:cogs': -1000000 };
    const even = valuation17(s);
    for (let k = 1; k <= 12; k++) f.m[mi - k] = { 'rev:rec': 1000000, 'cost:cogs': -700000 };
    const good = valuation17(s);
    expect(even.margin).toBeCloseTo(0);
    expect(good.margin).toBeCloseTo(0.3);
    expect(good.total).toBeGreaterThanOrEqual(even.total);
    if (even.cat + even.roster > 0) expect(good.total).toBeGreaterThan(even.total);
    expect(even.why.some(([t]) => t.pt.startsWith('Lucro'))).toBe(true);
  });
});
