// Rodada 12 — negociação por pacote (comparação com rivais, pesos do artista, verba prometida) e
// "Por que deu nisso?" ampliado (previsão antes, leitura depois).

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { acceptOffer, defaultOffer, evaluateOffer } from '../src/sim/contracts';
import { artistWeights, comparePackages, off12, packageFromOffer, rivalPackages, scorePackage } from '../src/sim/sys/offers12';
import { ex12, forecastRenewal, forecastSigning, infoQuality, renewWithReading } from '../src/sim/sys/explain12';
import { money, nextId, post } from '../src/sim/util';
import type { Offer } from '../src/sim/types';

const mk = (seed: string) => createGame(defaultConfig(seed, { startYear: 1990 }));

describe('r12 pacotes e leituras', () => {
  it('compara pacotes, pesa autonomia/verba e cumpre a verba prometida', () => {
    const s = mk('r12-pk');
    post(s, 'r12', money(s, 2_000_000), 'business', 'teste');
    const act = Object.values(s.acts).filter((a) => !a.owner && a.status !== 'retired' && a.members.length).sort((a, b) => b.fame - a.fame)[0];
    const base = defaultOffer(s, act);
    const plain = { ...base, pk12: { ar: 'label' as const, tour: 0, mkt: 0 } };
    const rich = { ...base, pk12: { ar: 'artist' as const, tour: money(s, 20000), mkt: money(s, 30000) } };
    const wi = artistWeights(s, act);
    expect(Object.values(wi.w).reduce((x, y) => x + y, 0)).toBeCloseTo(1, 5);
    expect(scorePackage(s, act, packageFromOffer(s, rich)).total).toBeGreaterThan(scorePackage(s, act, packageFromOffer(s, plain)).total);
    expect(evaluateOffer(s, act, rich).score).toBeGreaterThan(evaluateOffer(s, act, plain).score);
    const cmp = comparePackages(s, act, [packageFromOffer(s, rich), ...rivalPackages(s, act)]);
    expect(cmp.rows[0].rank).toBe(1);
    expect(cmp.mine).toBeDefined();
    const fc = forecastSigning(s, act, rich);
    expect(fc.lo).toBeLessThanOrEqual(fc.hi);
    expect(fc.info.q).toBeGreaterThan(0);
    // assina com verba prometida: 12 parcelas viram despesa e apoio
    const o: Offer = { ...rich, id: nextId(s, 'o'), week: s.week, status: 'pending' };
    s.offers.push(o);
    acceptOffer(s, act, o);
    const fame0 = act.fame;
    for (let i = 0; i < 3; i++) advanceMonth(s);
    const p = off12(s).pledges.find((x) => x.actId === act.id);
    expect(p).toBeDefined();
    expect(p!.months).toBeGreaterThan(0);
    expect(act.fame).toBeGreaterThanOrEqual(fame0 - 2);
    expect(ex12(s).log.some((d) => d.kind === 'signing' && d.actId === act.id)).toBe(true);
    // renovação com previsão e leitura
    const fr = forecastRenewal(s, act, money(s, 5000));
    expect(fr.hi).toBeGreaterThanOrEqual(fr.lo);
    renewWithReading(s, act.id, 36, money(s, 5000));
    expect(ex12(s).log.some((d) => d.kind === 'renewal')).toBe(true);
    expect(infoQuality(s, 'tour').q).toBeGreaterThan(0);
  });
});
