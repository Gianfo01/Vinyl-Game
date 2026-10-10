// R18 era1889: começar em 1889 e jogar a era acústica inteira (formatos, gêneros e selos reais nas datas certas).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { availableFormats } from '../src/sim/production';
import { aliveGenres } from '../src/sim/worldgen';
import { priceIndex } from '../src/core/money';
import { readSetupCode17, setupCode17 } from '../src/sim/start17';
import { acoustic1889, formatWar1889, marks1889, plugSong1889 } from '../src/sim/sys/era1889';
import { START_YEARS13 } from '../src/ui/ngdata13';
import type { GameState } from '../src/sim/types';

const actByName = (s: GameState, n: string) => Object.values(s.acts).find((a) => a.name === n);

describe('era1889', () => {
  it('começa em 1889, joga 30 anos sem erro, com formatos, gêneros e selos reais nas datas', () => {
    const cfg = defaultConfig('era1889-a', { startYear: 1889, mode: 'historic', realNames: true, homeCity: 'new_york' });
    expect(readSetupCode17(setupCode17(cfg))?.startYear).toBe(1889);
    expect(START_YEARS13.some((y) => y.year === 1889)).toBe(true);
    const s = createGame(cfg);
    s.player.cash += 1e10; s.player.initialCash += 1e10; // só para atravessar a era sem falir
    expect(priceIndex(1889)).toBeLessThan(priceIndex(1919));
    expect(availableFormats(s)).toContain('cylinder');
    expect(availableFormats(s)).not.toContain('shellac');
    expect(availableFormats(s)).not.toContain('lp');
    expect(aliveGenres(s, 1889)).toContain('parlor_song');
    expect(aliveGenres(s, 1889)).not.toContain('nola_jazz');
    expect(acoustic1889(s)).toBe(true);
    expect(s.labels.x_columbia_ph?.active).toBe(true);
    expect(s.labels.x_victor?.active).toBe(false);
    const seen: Record<string, number> = {};
    while (s.year < 1919 || s.month < 11) {
      advanceMonth(s);
      if (s.labels.x_victor?.active && !seen.victor) seen.victor = s.year;
      if (availableFormats(s).includes('shellac') && !seen.disc) seen.disc = s.year;
      if (actByName(s, 'Enrico Caruso') && !seen.caruso) seen.caruso = s.year;
      if (aliveGenres(s, s.year).includes('nola_jazz') && !seen.jazz) seen.jazz = s.year;
      if (s.year === 1905 && s.month === 0) {
        const a = Object.values(s.acts).find((x) => x.owner === 'player') ?? Object.values(s.acts)[0];
        expect(plugSong1889(s, a.id)).toBeNull();
      }
    }
    expect(seen.victor).toBe(1901);
    expect(seen.disc).toBe(1895);
    expect(seen.caruso).toBeLessThanOrEqual(1902);
    expect(seen.jazz).toBe(1917);
    expect(s.year).toBe(1919);
    expect(marks1889(s).some((m) => m.id === 'odjb')).toBe(true);
    expect(s.memory.some((m) => m.kind === 'world' && m.text.en.includes('Titanic'))).toBe(true);
    // rádio ainda não existe; disco venceu o cilindro
    expect(s.techDates.radio).toBeGreaterThanOrEqual(1920);
    const rel = { formats: ['cylinder'] } as never;
    expect(formatWar1889(s, rel)?.k).toBeLessThan(1);
  }, 600_000);
});
