// Rodada 16: o bot jogador usa as mesmas ações da interface e joga de verdade (assina, grava, lança, sai em turnê, oferece sync).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { simulatePlayer } from '../src/sim/playbot16';

describe('playbot16', () => {
  it('uma run curta tem ações variadas de jogador e é determinística', () => {
    const cfg = defaultConfig('r16pb-3', { startYear: 1975, realNames: true }); // r18: economia (econ18) e mídia (media18) mudaram a trajetória das sementes 1 e 2
    const a = simulatePlayer(cfg, 2, 'balanced').summary;
    const L = a.log;
    expect(L.signs).toBeGreaterThan(0);
    expect(L.projects).toBeGreaterThan(0);
    expect(L.recordings).toBeGreaterThan(0);
    expect(L.releases).toBeGreaterThan(0);
    expect(L.tours).toBeGreaterThan(0);
    expect(L.festivals).toBeGreaterThan(0);
    expect(L.syncPitches).toBeGreaterThan(0);
    expect(L.scouts).toBeGreaterThan(0);
    expect(L.decisions).toBeGreaterThan(0);
    expect(L.hires).toBeGreaterThan(0);
    const b = simulatePlayer(cfg, 2, 'balanced').summary;
    expect(b.cash).toBe(a.cash);
    expect(b.log).toEqual(a.log);
  }, 240000);
});
