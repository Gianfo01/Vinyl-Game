// Rodada 14: notoriedade por carreira e papel derivado das atividades principais.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { roleFromMain } from '../src/sim/sys/careers12';
import { noto, notoTier, notoriety, tierOf } from '../src/sim/sys/notoriety14';

describe('notoriedade', () => {
  it('papel sai das atividades principais', () => {
    expect(roleFromMain(['label'])).toBe('label');
    expect(roleFromMain(['musician'])).toBe('artist');
    expect(roleFromMain(['label', 'musician'])).toBe('hybrid');
    expect(roleFromMain(['manager', 'festival'])).toBe('label');
  });
  it('degraus, ganho por sucesso, decaimento e motivo', () => {
    expect(tierOf(0)).toBe(0); expect(tierOf(40)).toBe(2); expect(tierOf(90)).toBe(4);
    const s = createGame(defaultConfig('r14-noto'));
    advanceMonth(s);
    const v0 = notoriety(s, 'label');
    s.player.stats.number1s += 3; s.player.stats.awards += 2;
    advanceMonth(s);
    expect(notoriety(s, 'label')).toBeGreaterThan(v0);
    expect(noto(s).log.some((x) => x.c === 'label' && x.d > 0)).toBe(true);
    const hi = notoriety(s, 'label');
    advanceMonth(s); advanceMonth(s);
    expect(notoriety(s, 'label')).toBeLessThan(hi + 0.01);
    expect(notoTier(s, 'label')).toBeGreaterThanOrEqual(0);
  });
});
