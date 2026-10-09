// Rodada 15: fama por pessoa/ato com degraus e efeitos, histórico, e visibilidade (knownLevel).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { estimate } from '../src/sim/scouting';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { canSee, f15, fameHistory, fameText, fameTier, feeMult, knownLevel, personFame, scandalAmp } from '../src/sim/sys/fame15';

describe('fama 15', () => {
  it('degraus, efeitos e histórico', () => {
    expect(fameTier(0)).toBe(0); expect(fameTier(35)).toBe(2); expect(fameTier(95)).toBe(5);
    const s = createGame(defaultConfig('r15-fame'));
    const star = Object.values(s.acts).filter((a) => a.owner !== 'player' && !a.playerBand && a.members.length > 1).sort((a, b) => b.fame - a.fame)[0];
    star.fame = 80;
    expect(feeMult(star)).toBeGreaterThan(1.1);
    expect(scandalAmp(star)).toBeGreaterThan(1);
    // integrante: líder/voz mais famoso que o resto
    const pf = star.members.map((id) => personFame(s, id).v);
    expect(Math.max(...pf)).toBeGreaterThan(30);
    // escândalo amplificado mexe no momento
    for (let i = 0; i < 3; i++) advanceMonth(s);
    const m0 = star.momentum; star.scandals += 1; star.fame = 80;
    advanceMonth(s);
    expect(star.momentum).toBeLessThan(m0 + 8);
    expect(f15(s).log.some((x) => x[2] === star.id)).toBe(true);
    for (let i = 0; i < 4; i++) advanceMonth(s);
    expect(fameHistory(s, star.id).length).toBeGreaterThanOrEqual(2);
  });
  it('visibilidade: famoso é público, desconhecido não, privado exige olheiro', () => {
    const s = createGame(defaultConfig('r15-vis'));
    const others = Object.values(s.acts).filter((a) => a.owner !== 'player' && !a.playerBand && !s.knowledge[a.id]);
    const big = others[0], small = others[1];
    big.fame = 78; small.fame = 3;
    expect(canSee(s, big.id, 'bio')).toBe(true);
    expect(canSee(s, big.id, 'life')).toBe(true);
    expect(canSee(s, big.id, 'attrs')).toBe(false);
    expect(canSee(s, big.id, 'potential')).toBe(false);
    expect(fameText(s, big.id)).toBe('78');
    expect(estimate(s, big.id, 'fame')?.mid).toBe(78);
    expect(canSee(s, small.id, 'bio')).toBe(false);
    expect(fameText(s, small.id)).toBe('?');
    s.knowledge[small.id] = { actId: small.id, degree: 3, stage: 'investigating', bias: 0, updatedWeek: s.week, source: 'watch' };
    expect(canSee(s, small.id, 'attrs')).toBe(true);
    expect(canSee(s, small.id, 'potential')).toBe(true);
    expect(canSee(s, small.id, 'mood')).toBe(false);
    const mine = Object.values(s.acts).find((a) => a.owner === 'player' || a.playerBand);
    if (mine) { expect(knownLevel(s, mine.id).mine).toBe(true); expect(canSee(s, mine.members[0], 'mood')).toBe(true); }
  });
});
