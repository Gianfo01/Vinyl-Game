// Rodada 12/13 — hype unificado: fatos sobem, semana derruba, estreia converte, bolha estoura, sleeper cresce,
// relíquia encarece e alavancas respeitam a época.

import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { applyMods, runSimHooks } from '../src/sim/ext4';
import { addHype, actHype, hy, hypeOf, levers, useLever } from '../src/sim/sys/hype12';
import { addRelic, relicPrice } from '../src/sim/sys/relics9';
import type { Release } from '../src/sim/types';
import { money, post, remember } from '../src/sim/util';
import { createGame } from '../src/sim/worldgen';

const mk = (seed: string, y = 1985) => createGame(defaultConfig(seed, { startYear: y }));
const fakeRel = (s: ReturnType<typeof mk>, actId: string, q: number): Release => {
  const rel = { id: `rx${q}`, actId, owner: 'player', type: 'lp', title: 'Teste', songs: [], week: s.week, year: s.year, q, appeal: 1, formats: [], stock: 0, pressed: 0, marketing: [], marketingE: 0, territories: [], weekly: [], totalUnits: 0, revenue: 0, peak: 999, weeksOnChart: 0, lastPos: 0, coverSeed: 1, shortage: 0, live: true, critic: 70 } as unknown as Release;
  s.releases[rel.id] = rel;
  return rel;
};

describe('hype r12', () => {
  it('fatos sobem o hype e a semana derruba', () => {
    const s = mk('hy-ev');
    const a = Object.values(s.acts).find((x) => !x.deceased && x.status === 'active')!;
    const before = actHype(s, a.id);
    remember(s, 'number1', { pt: 'x', en: 'x' }, { actId: a.id });
    const up = actHype(s, a.id);
    expect(up).toBeGreaterThan(before + 15);
    for (let i = 0; i < 8; i++) runSimHooks('week', s, Rng.fromSeed(`w${i}`));
    expect(actHype(s, a.id)).toBeLessThan(up - 8);
    expect(hypeOf(s, `a:${a.id}`).parts.length).toBeGreaterThan(0);
  });

  it('bolha: expectativa alta e disco fraco estreiam bem e despencam; disco ótimo sem barulho cresce', () => {
    const s = mk('hy-bl');
    const a = Object.values(s.acts).find((x) => !x.deceased && x.status === 'active')!;
    a.owner = 'player';
    addHype(s, `n:${a.id}`, 'teaser', { pt: 't', en: 't' }, 60);
    const bad = fakeRel(s, a.id, 35);
    runSimHooks('launch', s, Rng.fromSeed('l'), { release: bad });
    expect(hy(s).rel[bad.id].bl).toBeGreaterThan(0);
    expect(applyMods(s, 'chartUnits', 100, { release: bad }).value).toBeGreaterThan(100);
    const b = Object.values(s.acts).find((x) => x.id !== a.id && !x.deceased && x.fame < 30)!;
    const good = fakeRel(s, b.id, 90);
    runSimHooks('launch', s, Rng.fromSeed('l2'), { release: good });
    expect(hy(s).rel[good.id].sl).toBeGreaterThan(0);
    const fame0 = a.fame;
    s.week += 4;
    expect(applyMods(s, 'chartUnits', 100, { release: bad }).value).toBeLessThan(85);
    s.week += 4;
    expect(applyMods(s, 'chartUnits', 100, { release: good }).value).toBeGreaterThan(115);
    runSimHooks('week', s, Rng.fromSeed('w'));
    expect(a.fame).toBeLessThan(fame0);
    expect(bad.critic!).toBeLessThan(70);
    expect(hy(s).log.some((x) => x.k === `bl:${bad.id}`)).toBe(true);
  });

  it('relíquia encarece com hype; alavancas custam e respeitam a época', () => {
    const s = mk('hy-lv', 1950);
    const a = Object.values(s.acts).find((x) => !x.deceased && x.status === 'active')!;
    const rl = addRelic(s, 'guitar', { pt: 'Guitarra', en: 'Guitar' }, a.id, undefined, 20000);
    const p0 = relicPrice(s, rl);
    addHype(s, `o:${rl.id}`, 'death', { pt: 'm', en: 'm' }, 40);
    expect(relicPrice(s, rl)).toBeGreaterThan(p0 * 1.2);
    a.owner = 'player';
    post(s, 'hy', money(s, 100000), 'business', 'teste');
    const ids = levers(s, a.id).map((x) => x.id);
    expect(ids).not.toContain('leak');
    expect(ids).not.toContain('feud');
    const cash = s.player.cash, h0 = actHype(s, a.id);
    useLever(s, a.id, 'teaser');
    expect(s.player.cash).toBeLessThan(cash);
    expect(actHype(s, a.id)).toBeGreaterThan(h0);
    expect(levers(s, a.id).find((x) => x.id === 'teaser')!.ok).toBe(false);
  });
});
