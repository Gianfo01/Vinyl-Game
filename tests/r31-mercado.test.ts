// R31 · onda 3 (D · Mercado): a penalização pós-1990 só do jogador sai; no lugar, pressão de mercado igual para todos
// (absoluta: o tamanho da semana) e visível na explicação das vendas; a previsão usa a mesma conta das vendas reais e
// não muda o mundo; transporte escolhido por trecho de turnê (automático por padrão).
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { computeAppeal, forecastUnits, weeklyPool, LUCK_MEAN31 } from '../src/sim/market';
import { marketPressure31, PRESSURE_LABEL31 } from '../src/sim/r31/market31';
import { setSw, sw } from '../src/sim/r31/switches';
import { rngSnapshot19 } from '../src/sim/rng19';
import { advanceMonth } from '../src/sim/tick';
import { playMonth } from '../src/sim/playbot16';
import { estimateTour, legOptions31, travelFatigue31, type TourPlan } from '../src/sim/tours';
import { transportAt, transportOptions, FATIGUE_PER_DAY31 } from '../src/sim/travel';
import { playerActs } from '../src/sim/util';
import { editableById } from '../src/sim/r31/editor';
import type { Act, GameState, Release } from '../src/sim/types';

const game = (seed: string, y: number): GameState => {
  const s = createGame(defaultConfig(seed, { startYear: y, scenario: 'established' }));
  s.player.cash = 50_000_000_00;
  return s;
};
const myAct = (s: GameState): Act => s.acts[playerActs(s)[0]];
const fakeRel = (s: GameState, a: Act, q = 70): Release => ({
  id: 'tst', actId: a.id, owner: 'player', prov: 'sim', type: 'single', title: 'x', songs: [], week: s.week, year: s.year, q, appeal: 0,
  formats: [], stock: 0, pressed: 0, marketing: [], marketingE: 0.2, territories: ['na', 'eu'], weekly: [], totalUnits: 0, revenue: 0,
  peak: 999, weeksOnChart: 0, lastPos: 0, coverSeed: 1, shortage: 0, live: false,
});

describe('R31 D · pressão de mercado no lugar da penalização pós-1990', () => {
  it('a pressão é 1 até 1990, desce até o mínimo em 2005 e muda o tamanho do mercado de todos', () => {
    const s = game('r31d-p', 2010);
    expect(marketPressure31(s, 1985)).toBe(1);
    expect(marketPressure31(s, 1990)).toBe(1);
    const min = sw<number>(s, 'd31.pressureMin');
    expect(marketPressure31(s, 2010)).toBeCloseTo(min, 6);
    expect(marketPressure31(s, 1998)).toBeGreaterThan(min);
    expect(marketPressure31(s, 1998)).toBeLessThan(1);
    const on = weeklyPool(s, 2010);
    setSw(s, 'd31.pressure', false);
    expect(marketPressure31(s, 2010)).toBe(1);
    expect(on / weeklyPool(s, 2010)).toBeCloseTo(min, 6);
    expect(PRESSURE_LABEL31.pt.length).toBeGreaterThan(5);
    expect(PRESSURE_LABEL31.en.length).toBeGreaterThan(5);
  });

  it('sem a penalização: a qualidade do jogador não perde até 15 pontos (desligado volta a regra antiga)', () => {
    const s = game('r31d-q', 2012);
    const a = myAct(s);
    const on = computeAppeal(s, null, fakeRel(s, a), a, { luck: 1 }).appeal;
    setSw(s, 'd31.pressure', false);
    const off = computeAppeal(s, null, fakeRel(s, a), a, { luck: 1 }).appeal;
    expect(on).toBeGreaterThan(off * 1.3); // −15 de qualidade com Q 70 ≈ ×0,56 no fator de qualidade
  });

  it('a previsão não sorteia nem grava nada (explorar não muda o mundo) e segue a pressão do mercado', () => {
    const s = game('r31d-f', 2008);
    const a = myAct(s);
    const core = () => JSON.stringify([s.acts, s.releases, s.player, s.persons, s.labels, s.stats, s.week]);
    const core0 = core(), rng0 = rngSnapshot19(s);
    const f = forecastUnits(s, a, 'single', 70, [], ['na', 'eu']);
    expect(core()).toBe(core0);
    // 1ª leitura pode completar estados vazios de sistemas (campos padrão criados por quem lê); daí em diante, nada muda
    const before = JSON.stringify(s);
    forecastUnits(s, a, 'lp', 80, [], ['na', 'eu', 'br']);
    expect(forecastUnits(s, a, 'single', 70, [], ['na', 'eu']).mid).toBe(f.mid);
    expect(JSON.stringify(s)).toBe(before);
    expect(rngSnapshot19(s)).toBe(rng0);
    expect(f.mid).toBeGreaterThan(0);
    expect(f.lo).toBeLessThan(f.mid);
    expect(f.hi).toBeGreaterThan(f.mid);
    setSw(s, 'd31.pressureMin', 0.5);
    const g = forecastUnits(s, a, 'single', 70, [], ['na', 'eu']);
    expect(g.mid).toBeLessThan(f.mid * 0.8);
    expect(LUCK_MEAN31).toBeGreaterThan(1);
  });

  it('previsão × procura real das 10 primeiras semanas: sem erro sistemático (robô, 2008)', () => {
    const s = createGame(defaultConfig('r31-fc-0', { startYear: 2008, role: 'label', bandGenre: 'rnr', bandName: 'Banda Teste' }));
    for (let m = 0; m < 20 && !s.ended; m++) { playMonth(s, 'balanced'); advanceMonth(s); }
    const r = Object.values(s.releases).filter((x) => x.fc && x.fc >= 20 && x.dem10 !== undefined && s.week - x.week >= 11).map((x) => x.dem10! / x.fc!);
    expect(r.length).toBeGreaterThanOrEqual(5);
    const gm = Math.exp(r.reduce((t, x) => t + Math.log(x), 0) / r.length);
    expect(gm).toBeGreaterThan(0.75);
    expect(gm).toBeLessThan(1.35);
  }, 600_000);

  it('interruptores da onda 3 aparecem no editor', () => {
    for (const id of ['d31.pressure', 'd31.pressureMin', 'd31.forecast', 'd31.transport', 'y31.local', 'y31.lang', 'y31.laws', 'y31.domino', 'y31.fame', 'y31.reserve']) expect(editableById(`sw.${id}`)).toBeTruthy();
  });
});

describe('R31 D · transporte por trecho', () => {
  it('opções reais da época: navio antes do avião; jato depois de 1958; hyperloop em 2035; a 1ª é a automática', () => {
    const o1930 = transportOptions(1930, 5600, false).map((x) => x.mode);
    expect(o1930[0]).toBe(transportAt(1930, 5600, false).mode);
    expect(o1930).toContain('ship');
    expect(o1930).not.toContain('jet');
    const o1965 = transportOptions(1965, 5600, false).map((x) => x.mode);
    expect(o1965[0]).toBe('jet');
    expect(o1965).toContain('ship');
    expect(transportOptions(2036, 800, true).map((x) => x.mode)).toContain('hyperloop');
    expect(transportOptions(1980, 800, true).map((x) => x.mode)).not.toContain('hyperloop');
    // navio: lento, barato e descansa
    const ship = transportOptions(1965, 5600, false).find((x) => x.mode === 'ship')!;
    const jet = transportOptions(1965, 5600, false).find((x) => x.mode === 'jet')!;
    expect(ship.days).toBeGreaterThan(jet.days);
    expect(FATIGUE_PER_DAY31.ship).toBeLessThan(FATIGUE_PER_DAY31.jet);
  });

  it('a escolha muda datas e custo da turnê; sem escolha = automático (igual a antes)', () => {
    const s = game('r31d-t', 1965);
    const a = myAct(s);
    const from = s.location[a.id] ?? a.city;
    const far = from === 'london' ? 'new_york' : 'london';
    const base: TourPlan = { actId: a.id, cities: [far], startInDays: 21, priceMult: 1, minutes: 60, setlist: [], production: 0, role: 'headline', crew: 2, pay: 'door' };
    const ops = legOptions31(s, from, far, 6);
    expect(ops[0].auto).toBe(true);
    const slow = ops.find((o) => o.mode === 'ship');
    if (!slow) return; // cidade de origem no mesmo continente: sem travessia
    const auto = estimateTour(s, base);
    const byShip = estimateTour(s, { ...base, legModes: [slow.mode] });
    expect(byShip.stops[0].day).toBeGreaterThan(auto.stops[0].day);
    expect(byShip.stops[0].mode).toBe('ship');
    expect(travelFatigue31(s, byShip.stops[0])).toBe(FATIGUE_PER_DAY31.ship);
    setSw(s, 'd31.transport', false);
    expect(estimateTour(s, { ...base, legModes: [slow.mode] }).stops[0].day).toBe(auto.stops[0].day);
  });
});
