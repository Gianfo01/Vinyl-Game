// R18 live18: logística de turnê (kit), seguro e post-mortem, fãs com motivos (virada comercial gradual), festival.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { estimateTour, planTour, type TourPlan } from '../src/sim/tours';
import { KIT0 } from '../src/sim/tourhook18';
import { liveMonth18, tourPM18, botKit18 } from '../src/sim/sys/live18';
import { fan18, fansLaunch18, fansMonth18, factions18 } from '../src/sim/sys/fans18';
import type { Release } from '../src/sim/types';
import '../src/sim/sys';

const mk = (seed: string, y = 1990) => createGame(defaultConfig(seed, { startYear: y }));
function setup(seed: string) {
  const s = mk(seed);
  const act = Object.values(s.acts).find((a) => a.members.length >= 3 && a.members.length <= 5 && !a.deceased)!;
  act.owner = 'player'; act.fame = 40; act.fans = { casual: 60000, active: 20000, core: 5000 };
  s.player.cash = 1e10;
  const cities = Object.keys(s.scenes).map((k) => k.split(':')[0]).filter((c, i, a) => a.indexOf(c) === i && c !== act.city).slice(0, 4);
  const plan: TourPlan = { actId: act.id, cities: cities.length ? cities : [act.city], startInDays: 21, priceMult: 1, minutes: 45, setlist: [], production: 1, role: 'headline', crew: 4, pay: 'door' };
  return { s, act, plan };
}

describe('r18 live: turnê', () => {
  it('kit muda o custo: van mais barata, seguro e avião mais caros', () => {
    const { s, plan } = setup('r18l-1');
    const base = estimateTour(s, plan).logistics;
    expect(estimateTour(s, { ...plan, kit: { ...KIT0, move: 'van', bed: 'cheap', diem: 0 } }).logistics).toBeLessThan(base);
    expect(estimateTour(s, { ...plan, kit: { ...KIT0, ins: 1, reh: 2, sec: 2 } }).logistics).toBeGreaterThan(base);
    expect(estimateTour(s, { ...plan, kit: { ...KIT0 } }).logistics).toBe(base);
  });

  it('marcação guarda a previsão; cancelamento por acidente com seguro paga e fecha o post-mortem', () => {
    const { s, plan } = setup('r18l-2');
    const t = planTour(s, { ...plan, kit: { ...KIT0, ins: 1 } });
    expect('pt' in t).toBe(false);
    const tour = t as Exclude<typeof t, { pt: string }>;
    const pm = tourPM18(s, tour.id)!;
    expect(pm.shows.length).toBe(tour.stops.length);
    expect(pm.shows[0].e).toBeGreaterThanOrEqual(0);
    const cash = s.player.cash;
    for (const st of tour.stops) { st.status = 'cancelled'; st.note = { pt: 'tempestade', en: 'storm' }; }
    tour.status = 'cancelled';
    liveMonth18(s);
    expect(s.player.cash).toBeGreaterThan(cash);
    expect(pm.shows.every((x) => x.st === 'cancelled' && (x.ins ?? 0) > 0)).toBe(true);
    expect(pm.fin?.verdict).toBeTruthy();
  });

  it('bot: contrato clássico não segura bilheteria que não é do selo', () => {
    const { s, act } = setup('r18l-3');
    act.fame = 20;
    const k = botKit18(s, act.id, 1e9, 8, 3000);
    expect(k.ins).toBe(0);
    expect(k.prom).toBe('local');
  });
});

describe('r18 live: fãs', () => {
  it('virada comercial: casuais sobem e núcleo cai aos poucos; puristas se irritam', () => {
    const { s, act } = setup('r18l-4');
    const f = fan18(s, act.id)!;
    const core0 = act.fans.core, cas0 = act.fans.casual, mood0 = f.fac[0];
    act.positioning = Math.min(100, f.pos + 25);
    fansLaunch18(s, { id: 'rx', actId: act.id, title: 'Pop', songs: [], type: 'album', kind: 'standard' } as unknown as Release);
    expect(f.dr.length).toBe(1);
    expect(f.fac[0]).toBeLessThan(mood0);
    fansMonth18(s);
    expect(act.fans.casual).toBeGreaterThan(cas0);
    expect(act.fans.core).toBeLessThan(core0);
    const fac = factions18(s, act, f);
    expect(Math.abs(fac.purist + fac.main + fac.coll + fac.comm - 1)).toBeLessThan(1e-6);
  });
});
