// Rodada 21 (F) — shows e turnês: previsão = acerto com ruído 1 (F-1), cidade em mercado bloqueado recusada e
// América do Norte livre em 1970 (F-3), banca de merch vende do estoque do merch17 e não vende sem lote (F-8).
import { describe, expect, it } from 'vitest';
import '../src/sim/sys';
import { defaultConfig } from '../src/sim/bot';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { rngOf } from '../src/sim/util';
import { estimateTour, planTour, tourDay, type TourPlan } from '../src/sim/tours';
import { expectedSold, merchStand, roleFactor } from '../src/sim/showmath';
import { liveBlocked } from '../src/sim/culture';
import { produceMerch } from '../src/sim/brands';
import { m17 } from '../src/sim/sys/merch17';
import { tourPM18 } from '../src/sim/sys/live18';
import type { Rng } from '../src/core/rng';
import type { GameState } from '../src/sim/types';

function withAct(seed: string, over = {}, fame = 40) {
  const s = createGame(defaultConfig(seed, { homeCity: 'new_york', ...over }));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity, fame });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  act.fans = { casual: 400000, active: 60000, core: 12000 };
  s.player.cash += 50_000_000_00;
  s.player.initialCash += 50_000_000_00;
  return { s, r, act };
}
const plan = (s: GameState, actId: string, cities: string[], over: Partial<TourPlan> = {}): TourPlan =>
  ({ actId, cities, startInDays: 21, priceMult: 1, minutes: 60, setlist: [], production: 1, role: 'headline', crew: 4, pay: 'door', ...over });
/** "Sorte da noite" neutra: ruído 1, nenhum acidente — o acerto vira a previsão. */
const calm = (): Rng => ({ float: () => 1, chance: () => false, pick: <T,>(a: readonly T[]) => a[0], next: () => 0.5, int: (a: number) => a, normal: () => 0, weighted: <T,>(a: readonly T[]) => a[0], shuffle: <T,>(a: T[]) => a, fork: () => calm() } as unknown as Rng);
const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);

describe('r21 F-1: a previsão é a conta do acerto com ruído 1', () => {
  it('público previsto no planejamento = público do dia (setlist de covers, palco, clube e modificadores incluídos)', () => {
    const { s, act } = withAct('r21-f1', { startYear: 1985 });
    const p = plan(s, act.id, ['new_york', 'chicago', 'los_angeles'], { setlist: [], production: 2 });
    const est = estimateTour(s, p);
    expect(est.expectedSold).toBeGreaterThan(0);
    const t = planTour(s, p);
    expect('id' in t).toBe(true);
    if (!('id' in t)) return;
    const pm = tourPM18(s, t.id)!;
    // o post-mortem guarda a mesma previsão que o planejador mostrou
    expect(pm.shows.reduce((a, x) => a + x.e, 0)).toBe(est.expectedSold);
    for (const st of t.stops) {
      s.day = st.day; s.clock.dayInMonth = 0; // o dia do show
      const e = expectedSold(s, act, t, st);
      tourDay(s, calm(), st.day);
      expect(st.status).toBe('played');
      expect(st.sold).toBe(e);
    }
    expect(t.stops.reduce((a, x) => a + x.sold, 0)).toBe(est.expectedSold);
    invariant(s);
  });

  it('F-2: um só roleFactor; cachê de abertura previsto = pago (150 + fama·20)', () => {
    expect(roleFactor('opening').partner).toBe(0.5);
    expect(roleFactor('headline').partner).toBe(0);
    const { s, r, act } = withAct('r21-f2', { startYear: 1985 });
    const head = spawnProceduralAct(s, r, { city: 'new_york', fame: 80 });
    const p = plan(s, act.id, ['new_york'], { role: 'opening', partnerActId: head.id });
    const est = estimateTour(s, p);
    const t = planTour(s, p);
    if (!('id' in t)) throw new Error('tour');
    expect(tourPM18(s, t.id)!.shows[0].ep).toBe(est.expectedPay);
    s.day = t.stops[0].day; s.clock.dayInMonth = 0;
    tourDay(s, calm(), t.stops[0].day);
    expect(t.stops[0].status).toBe('played');
    // cachê fixo da abertura (sem merch: não há lote)
    expect(t.revenue).toBe(est.expectedPay);
  });
});

describe('r21 F-3: cidades bloqueadas', () => {
  it('América do Norte livre em 1970 (a Guerra do Vietnã só suspende shows na Ásia)', () => {
    const { s, act } = withAct('r21-f3a', { startYear: 1970 });
    expect(liveBlocked(s, 'new_york')).toBeUndefined();
    expect(liveBlocked(s, 'ho_chi_minh')).toBeDefined();
    const est = estimateTour(s, plan(s, act.id, ['new_york', 'chicago']));
    expect(Object.keys(est.blocked)).toEqual([]);
    expect('id' in planTour(s, plan(s, act.id, ['new_york', 'chicago']))).toBe(true);
  });
  it('planejador recusa cidade em mercado com shows suspensos, com o motivo', () => {
    const { s, act } = withAct('r21-f3b', { startYear: 1970 });
    const p = plan(s, act.id, ['new_york', 'ho_chi_minh'], { startInDays: 180 });
    const est = estimateTour(s, p);
    expect(est.blocked.ho_chi_minh).toBeDefined();
    const res = planTour(s, p);
    expect('pt' in res).toBe(true);
    if ('pt' in res) expect(res.pt).toContain('suspensos');
    expect(s.tours.length).toBe(0);
  });
});

describe('r21 F-8: banca de merch = estoque do merch17', () => {
  it('sem lote não vende; com lote (produceMerch alimenta o merch17) a banca baixa o estoque', () => {
    const { s, act } = withAct('r21-f8', { startYear: 1985 });
    act.playerBand = true;
    expect(merchStand(s, act, 1000, false)).toBe(0);
    const err = produceMerch(s, act.id, 2000, 60);
    expect(err).toBeNull();
    const ln = m17(s).lines.find((x) => x.act === act.id)!;
    expect(ln.stock).toBe(2000);
    expect(s.merch[act.id].stock).toBe(2000);
    const preview = merchStand(s, act, 1000, false);
    expect(preview).toBeGreaterThan(0);
    expect(ln.stock).toBe(2000);
    expect(merchStand(s, act, 1000, true)).toBe(preview);
    expect(ln.stock).toBeLessThan(2000);
    expect(ln.sold).toBe(2000 - ln.stock);
    invariant(s);
  });
});
