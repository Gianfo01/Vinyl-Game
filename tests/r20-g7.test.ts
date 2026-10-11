// Rodada 20 (G7): livro regional de fãs (B17) e preço por mercado (B18).
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { CITIES, cityById, type MarketId } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { runSimHooks } from '../src/sim/ext4';
import { explain18 } from '../src/sim/explain18';
import '../src/sim/sys';
import { MK20, apportion20, demandMult20, fansIn20, priceAdj20, setOv20, settle20, share20, terr20, unitsRatio20 } from '../src/sim/sys/terr20';
import { advanceMonth } from '../src/sim/tick';
import type { Act, GameState } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';

function setup(): { s: GameState; a: Act } {
  const s = createGame(defaultConfig('r20g7', { startYear: 1975 }));
  const a = Object.values(s.acts).find((x) => !x.playerBand && !x.catalogNo && x.status !== 'retired' && x.status !== 'split' && cityById[x.city]?.market === 'na')!;
  a.owner = 'player'; a.fans = { casual: 40000, active: 9000, core: 1200 }; a.fame = 30;
  return { s, a };
}
const sums = (s: GameState, a: Act) => [0, 1, 2].map((k) => MK20.reduce((t, m) => t + fansIn20(s, a, m)[k], 0));

describe('r20 G7 terr20', () => {
  it('restos maiores fecham exatamente', () => {
    expect(apportion20([1, 1, 1], 10).reduce((a, b) => a + b, 0)).toBe(10);
    expect(apportion20([0, 0], 7)).toEqual([4, 3]);
  });

  it('soma regional == global e show converte só na praça compatível', () => {
    const { s, a } = setup();
    settle20(s, a);
    expect(sums(s, a)).toEqual([a.fans.casual, a.fans.active, a.fans.core]);
    const before = share20(s, a);
    const city = CITIES.find((c) => c.market === 'br')!;
    for (let i = 0; i < 3; i++) runSimHooks('show', s, Rng.fromSeed('x'), { show: { actId: a.id, cityId: city.id, sold: 3000, capacity: 3000, revenue: 0, tourId: 't' } });
    a.fans.casual += 1440; a.fans.active += 450; a.fans.core += 63; // o acerto do show soma no global
    settle20(s, a);
    expect(sums(s, a)).toEqual([a.fans.casual, a.fans.active, a.fans.core]);
    const after = share20(s, a);
    expect(after.br).toBeGreaterThan(before.br);
    for (const m of MK20.filter((x) => x !== 'br')) expect(after[m]).toBeLessThanOrEqual(before[m] + 1e-9);
    expect(demandMult20(s, a, city.id)).toBeGreaterThan(1);
    expect(explain18(s, 'terr20.demand', { act: a.id, city: city.id })?.parts.length).toBe(3);
  });

  it('preço por mercado: só o mercado alvo muda e a margem não duplica', () => {
    const { s, a } = setup();
    s.x4.industry.pricing = 'normal';
    s.player.territories = ['na', 'eu'] as MarketId[];
    settle20(s, a);
    expect(priceAdj20(s, 10000)).toBe(0);
    setOv20(s, 'eu', 'premium');
    const sh = share20(s, a);
    expect(unitsRatio20(s, ['na'], sh)).toBe(1);
    expect(unitsRatio20(s, ['eu'], sh)).toBeCloseTo(0.82, 5);
    const adj = priceAdj20(s, 10000);
    expect(adj).toBeGreaterThan(0);
    expect(adj).toBeLessThan(2800); // só a fatia da Europa recebe a margem premium
    setOv20(s, 'eu', 'normal'); // igual ao global = sem sobreposição
    expect(terr20(s).ov.eu).toBeUndefined();
  });

  it('virada de mês cria o livro (fecha com o global no momento do acerto)', () => {
    const { s, a } = setup();
    advanceMonth(s);
    expect(terr20(s).a[a.id], `${a.owner} ${a.status} ${a.catalogNo}`).toBeTruthy();
    const g = [a.fans.casual, a.fans.active, a.fans.core];
    sums(s, a).forEach((v, k) => expect(Math.abs(v - g[k]) / Math.max(1, g[k])).toBeLessThan(0.1)); // fãs ainda mudam depois do gancho no mesmo mês
  });
});
