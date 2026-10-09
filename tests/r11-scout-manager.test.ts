// Rodada 11 — missões de olheiro com pistas semanais (névoa que estreita), observação/comparação e o
// ofício de empresário (comissão, propostas de gravadora, conflitos, relatórios).

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { ownerOf } from '../src/sim/sys/people/owner';
import { hireScout, scoutPool } from '../src/sim/discovery';
import { estimate } from '../src/sim/scouting';
import { scout11, startMission, toggleCompare, toggleWatch } from '../src/sim/sys/scout11';
import { acceptDeal, conflictsOf, mgr11, renegotiateRate, shopDeal } from '../src/sim/sys/manager11';
import { ventures } from '../src/sim/sys/ventures9';
import { money, post, rngOf } from '../src/sim/util';

const mk = (seed: string) => createGame(defaultConfig(seed, { startYear: 1990 }));

describe('scouting r11', () => {
  it('missão revela pistas aos poucos e consolida no fim', () => {
    const s = mk('r11-sc');
    post(s, 'r11', money(s, 500000), 'business', 'teste');
    const sc = { ...scoutPool(s, rngOf(s))[0], skill: 90 };
    expect(hireScout(s, sc)).toBeNull();
    const me = s.scouts[0];
    expect(startMission(s, me.id, me.region, 'any', 12)).toBeNull();
    expect(me.mission!.depth).toBe(4);
    for (let i = 0; i < 4 && me.mission; i++) advanceMonth(s);
    expect(me.mission).toBeUndefined();
    expect(me.found).toBeGreaterThan(0);
    const scouted = Object.values(s.knowledge).filter((k) => k.source === 'scout');
    expect(scouted.some((k) => k.degree >= 2)).toBe(true);
    const id = scouted[0].actId;
    expect(toggleWatch(s, id)).toBe(true);
    toggleCompare(s, id);
    expect(scout11(s).compare).toContain(id);
    const e = estimate(s, id, 'fame');
    expect(e && e.hi >= e.lo).toBe(true);
  });
});

describe('empresário r11', () => {
  it('renegocia comissão, leva ao mercado, fecha contrato e gera relatório', () => {
    const s = mk('r11-mg');
    ownerOf(s).wealth = money(s, 1_000_000);
    post(s, 'r11', money(s, 5_000_000), 'business', 'teste');
    const a = Object.values(s.acts).find((x) => !x.owner && x.status !== 'retired' && x.status !== 'split' && x.members.length > 0 && x.fame >= 5)!;
    const mg = ventures(s).mg;
    mg.clients.push({ actId: a.id, rate: 0.15, since: s.week, sat: 60, earned: 0 });
    const r = rngOf(s);
    expect(renegotiateRate(s, r, a.id, 0.12).ok).toBe(true);
    expect(mg.clients[0].rate).toBe(0.12);
    expect(shopDeal(s, r, a.id).ok).toBe(true);
    const p = mgr11(s).pitches[0];
    const own = p.offers.findIndex((o) => o.party === 'player');
    expect(own).toBeGreaterThanOrEqual(0);
    expect(acceptDeal(s, r, a.id, own).ok).toBe(true);
    expect(a.owner).toBe('player');
    expect(conflictsOf(s, a.id).length).toBeGreaterThan(0);
    advanceMonth(s);
    advanceMonth(s);
    expect(mgr11(s).reports.length).toBeGreaterThan(0);
    expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
  });
});
