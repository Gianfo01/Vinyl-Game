// Rodada 20c (N2): preço com moeda/base de tempo, gastos contra o caixa livre e o saldo perdoado pelo teto da trava.
// Rápido: um jogo, sem simulação longa.
import { describe, expect, it } from 'vitest';
import { toReal } from '../src/core/money';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer, makeOffer } from '../src/sim/contracts';
import { buyEquipment, availableEquipment } from '../src/sim/economy';
import { explain18 } from '../src/sim/explain18';
import { freeCash20, reservedAdvances20 } from '../src/sim/oblig20';
import { revertWeek } from '../src/sim/rights';
import { runSimHooks } from '../src/sim/ext4';
import { priceBasis20 } from '../src/sim/sys/price20';
import type { Act, GameState, Offer } from '../src/sim/types';
import { money } from '../src/sim/util';
import { createGame } from '../src/sim/worldgen';
import '../src/sim/hooks';
import { rng19 } from '../src/sim/rng19';

const game = (y = 1998): GameState => createGame(defaultConfig('r20cn2', { startYear: y }));
const freeAct = (s: GameState, skip: string[] = []): Act => Object.values(s.acts).find((x) => !x.owner && !x.playerBand && !x.catalogNo && !skip.includes(x.id))!;

describe('r20c N2', () => {
  it('preço explica US$ do ano e equivalente de 2020', () => {
    const s = game(1962);
    const v = money(s, 1000);
    const b = priceBasis20(s, v);
    expect(b.pt).toContain('US$ de 1962');
    expect(b.en).toContain('2020');
    const w = explain18(s, 'price20', { v, k: 'rent' })!;
    expect(w).toBeTruthy();
    const eq = w.parts.find((p) => typeof p.label !== 'string' && p.label.en.startsWith('Equivalent'))!;
    expect(Math.round(Number(eq.value) / 100)).toBe(Math.round(toReal(v, 1962)));
    expect(w.parts.some((p) => typeof p.label !== 'string' && p.label.en.includes('Per year'))).toBe(true);
  });

  it('compra de equipamento respeita o caixa reservado para ofertas pendentes, com motivo claro', () => {
    const s = game();
    const e = availableEquipment(s).filter((x) => !s.player.equipment.includes(x.id)).sort((a, b) => a.cost - b.cost)[0];
    const cost = money(s, e.cost);
    const a = freeAct(s);
    s.player.cash = cost + 1000;
    const o = makeOffer(s, { ...defaultOffer(s, a), advance: 5000 });
    expect(o).toBeTruthy();
    expect(reservedAdvances20(s)).toBe(5000);
    expect(freeCash20(s)).toBeLessThan(cost);
    const cash0 = s.player.cash;
    const why = buyEquipment(s, e.id);
    expect(why?.pt).toContain('reservad');
    expect(s.player.cash).toBe(cash0);
    expect(s.player.equipment.includes(e.id)).toBe(false);
    // sem a reserva, a mesma compra passa
    o!.status = 'rejected';
    expect(buyEquipment(s, e.id)).toBeNull();
    expect(s.player.cash).toBe(cash0 - cost);
  });

  it('teto da trava libera o master e perdoa de fato o saldo não recuperado (com linha no razão)', () => {
    const s = game();
    const a = freeAct(s);
    s.player.cash = 10_000_000;
    const o: Offer = { ...defaultOffer(s, a), advance: 2_000_000, id: 'o-n2', week: s.week, status: 'pending' };
    acceptOffer(s, a, o);
    const c = s.contracts[a.contractId!];
    c.rights = { ...c.rights!, master: 'label', reversionYears: 1, reversionNeedsRecoup: true, recoupCapYears: 1 };
    c.recoupBalance = 1_234_500;
    c.endWeek = s.week - 200;
    expect(revertWeek(c) + 52).toBeLessThanOrEqual(s.week);
    const cash0 = s.player.cash;
    runSimHooks('month', s, rng19(s, 'tick'));
    expect(c.reverted).toBe(true);
    expect(c.recoupBalance).toBe(0);
    expect(c.recoupWrittenOff20).toBe(1_234_500);
    const row = s.ledger.find((x) => x.cat === 'writeoff');
    expect(row?.amount).toBe(0);
    expect(row?.memo).toContain('perdoado');
    // o perdão não mexe no caixa (só os outros sistemas do mês mexem)
    expect(s.ledger.filter((x) => x.cat === 'writeoff').reduce((t, x) => t + x.amount, 0)).toBe(0);
    void cash0;
  });
});
