// Rodada 16 — formações: Michael Jackson nas Jacksons até 1984 e solo em paralelo (mesma pessoa); saída genérica vira solo ou banda nova.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { departNpc16, freeStep16, l16, path16, stints16 } from '../src/sim/sys/lineup16';
import { rw } from '../src/sim/sys/realworld';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { Rng, seedState } from '../src/core/rng';
import type { Act, GameState } from '../src/sim/types';

const byName = (s: GameState, n: string) => Object.values(s.acts).find((a) => a.name === n);

describe('formações r16', () => {
  it('Michael: nas Jacksons até 1984, solo em paralelo, mesma pessoa; Jermaine volta', () => {
    const s = createGame(defaultConfig('r16line', { startYear: 1983, realNames: true, realFates: true, mode: 'historic', history: 'strict' }));
    const band = byName(s, 'The Jacksons')!;
    expect(band, 'The Jackson 5 já se chama The Jacksons em 1983').toBeTruthy();
    const solo = byName(s, 'Michael Jackson')!;
    expect(solo.members.length).toBe(1);
    const mj = solo.members[0];
    expect(band.members).toContain(mj);
    expect(path16(s, mj).map((x) => x.act.name)).toEqual(expect.arrayContaining(['The Jacksons', 'Michael Jackson']));
    while (s.year < 1985) advanceMonth(s);
    expect(band.members).not.toContain(mj);
    expect(rw(s).former[band.id].some((f) => f.personId === mj && f.year === 1984)).toBe(true);
    expect(solo.status).toBe('active');
    const st = stints16(s, band).find((x) => x.pid === mj)!;
    expect(st.segs[st.segs.length - 1].to).toBe(1984);
    const jermaine = band.members.map((id) => s.persons[id]).find((p) => p.name === 'Jermaine Jackson');
    expect(jermaine, 'Jermaine volta em 1984').toBeTruthy();
    expect(stints16(s, band).find((x) => x.pid === jermaine!.id)!.segs.length).toBe(2);
  });

  it('saída genérica vira carreira solo ou banda nova com a mesma pessoa', () => {
    const s = createGame(defaultConfig('r16gen', { startYear: 1990, mode: 'free' }));
    const r = new Rng(seedState('r16t'));
    const bands = Object.values(s.acts).filter((a) => a.members.length >= 3 && a.status === 'active' && a.owner !== 'player' && !a.catalogNo).sort((a, b) => b.fame - a.fame);
    expect(bands.length).toBeGreaterThan(2);
    const made: Act[] = [];
    for (const a of bands.slice(0, 3)) {
      const p = s.persons[a.members.find((id) => s.persons[id].role === 'vocal') ?? a.members[0]];
      departNpc16(s, r, a, p, 'solo');
      expect(a.members).not.toContain(p.id);
      const next = freeStep16(s, r, p.id, true);
      expect(next, 'decidiu um destino').toBeTruthy();
      expect(next!.members).toContain(p.id);
      made.push(next!);
      expect(path16(s, p.id).some((x) => x.act.id === a.id && !x.current)).toBe(true);
    }
    expect(made.some((x) => x.members.length === 1), 'ambição solo costuma virar carreira solo').toBe(true);
    expect(Object.keys(l16(s).free)).not.toContain(made[0].members[0]);
  });
});
