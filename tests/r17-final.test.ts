// R17 final: perks sem recursão, margem de canais laterais só na fatia deles, repasse do streaming, crédito realista.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { perk, perkEntries, registerPerkSource, bumpPerks } from '../src/sim/perks';
import { outDef, shareOf } from '../src/sim/sys/outlets17';
import { streamPayout } from '../src/sim/market';
import { loanOffer } from '../src/sim/economy';

describe('r17 final', () => {
  it('uma fonte de perks que consulta perk() não recursa (antes estourava a pilha)', () => {
    const s = createGame(defaultConfig('r17fin', { startYear: 1990 }));
    let calls = 0;
    registerPerkSource('r17fin-test', (g) => { calls++; void perk(g, 'energy'); return []; });
    bumpPerks();
    perkEntries(s);
    expect(calls).toBe(1);
    registerPerkSource('r17fin-test', () => []);
    bumpPerks();
  });
  it('canais: streaming vale para a venda toda, loja própria só para a fatia dela; streaming paga menos ao selo', () => {
    expect(shareOf(outDef('streaming')!)).toBe(1);
    expect(shareOf(outDef('direct')!)).toBeLessThan(0.2);
    expect(shareOf(outDef('record_club')!)).toBeLessThan(0.6);
    expect(streamPayout(['download'])).toBe(1);
    expect(streamPayout(['download', 'streaming'])).toBeLessThan(1);
  });
  it('crédito: cada empréstimo encolhe o próximo; no vermelho há 2 meses o banco não empresta', () => {
    const s = createGame(defaultConfig('r17fin-l', { startYear: 1990 }));
    const a = loanOffer(s)!;
    s.player.loans.push({ id: 'x', principal: 1, balance: 1, rate: 0.1, monthly: 1, startWeek: s.week });
    const b = loanOffer(s)!;
    expect(b.amount).toBeLessThan(a.amount);
    expect(b.rate).toBeGreaterThan(a.rate);
    s.player.insolvencyMonths = 2;
    expect(loanOffer(s)).toBeNull();
  });
});
