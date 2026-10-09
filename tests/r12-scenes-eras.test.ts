// Rodada 12 — cenas locais como redes (investir, explorar, rejeição e selo concorrente, parceiro da
// filial) e estrutura da empresa que precisa se reorganizar a cada virada de era.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { openBranch } from '../src/sim/branches';
import { CITIES } from '../src/data/world';
import { choosePartner, cultivate, netOf } from '../src/sim/sys/scenes12';
import { DEMAND, applyChoice, fitOf, moveStaff, org12 } from '../src/sim/sys/eras12';
import { currentEra } from '../src/sim/sys/eras8';
import { money, post } from '../src/sim/util';

describe('cenas r12', () => {
  it('investir cresce a cena; explorar demais gera rejeição e um selo local rival', () => {
    const s = createGame(defaultConfig('r12-sc', { startYear: 1990 }));
    post(s, 'r12', money(s, 500000), 'business', 'teste');
    const home = s.config.homeCity;
    const n = netOf(s, home);
    const h0 = n.health, t0 = n.ties.venue;
    expect(cultivate(s, home, 'venue')).toBeNull();
    expect(n.health).toBeGreaterThan(h0);
    expect(n.ties.venue).toBeGreaterThan(t0);
    expect(cultivate(s, home, 'venue')).not.toBeNull(); // uma vez por mês
    n.exploit = 80;
    advanceMonth(s);
    expect(n.rival && s.labels[n.rival]).toBeTruthy();
    expect(n.rivalStr).toBeGreaterThan(0);
    s.player.hq = 2;
    const other = CITIES.find((c) => c.id !== home && c.market === CITIES.find((x) => x.id === home)!.market) ?? CITIES.find((c) => c.id !== home)!;
    expect(openBranch(s, other.id)).toBeNull();
    expect(choosePartner(s, other.id, 'producer')).toBeNull();
    expect(netOf(s, other.id).partner).toBe('producer');
    expect(choosePartner(s, other.id, 'media')).not.toBeNull(); // troca só depois de um ano
  });
});

describe('eras r12', () => {
  it('virada de era derruba o encaixe e a reorganização restaura', () => {
    const s = createGame(defaultConfig('r12-era', { startYear: 2012 }));
    post(s, 'r12', money(s, 900000), 'business', 'teste');
    advanceMonth(s);
    const o = org12(s);
    expect(fitOf(s)).toBeGreaterThan(0.95);
    o.era = 'radio';
    o.alloc = { ...DEMAND.radio };
    advanceMonth(s);
    expect(o.era).toBe(currentEra(s).id);
    expect(o.log.length).toBe(1);
    expect(fitOf(s)).toBeLessThan(0.5);
    applyChoice(s, 'overhaul');
    expect(fitOf(s)).toBeGreaterThan(0.99);
    expect(o.disrupt).toBeGreaterThan(s.week);
    const before = o.alloc.data;
    expect(moveStaff(s, 'data', 'studio')).toBeNull();
    expect(o.alloc.data).toBeLessThan(before);
  });
});
