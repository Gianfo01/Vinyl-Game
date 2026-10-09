// Rodada 11 — opiniões: ninguém opina sobre si mesmo (banda atual, antiga ou solo), sem repetir ato nem frase.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { isOwnAct, opinionLines, opinionsOf } from '../src/sim/sys/bonds9';

describe('opiniões dos artistas', () => {
  it('sem auto-opinião, sem duplicatas, com teto e frases variadas', () => {
    const s = createGame(defaultConfig('r11-op', { startYear: 1985, mode: 'historic', realNames: true }));
    for (let i = 0; i < 6; i++) advanceMonth(s);
    const mj = Object.values(s.persons).find((p) => p.name === 'Michael Jackson');
    const pids = [...new Set(Object.values(s.acts).filter((a) => a.fame > 25).flatMap((a) => a.members))].slice(0, 60);
    if (mj) pids.unshift(mj.id);
    let total = 0;
    for (const pid of pids) {
      const op = opinionsOf(s, pid);
      const all = [...op.top, ...op.low];
      expect(op.top.length).toBeLessThanOrEqual(4);
      expect(op.low.length).toBeLessThanOrEqual(4);
      for (const x of all) {
        expect(x.act.members.includes(pid)).toBe(false);
        expect(isOwnAct(s, pid, x.act)).toBe(false);
        expect(x.act.name).not.toBe(s.persons[pid].name);
      }
      expect(new Set(all.map((x) => x.act.id)).size).toBe(all.length);
      expect(new Set(all.map((x) => x.act.name)).size).toBe(all.length);
      const lines = opinionLines(s, pid).map((x) => x.txt.pt);
      expect(new Set(lines).size).toBe(lines.length);
      total += all.length;
    }
    expect(total).toBeGreaterThan(20);
    if (mj) {
      const solo = Object.values(s.acts).find((a) => a.name === 'Michael Jackson');
      if (solo) expect(isOwnAct(s, mj.id, solo)).toBe(true);
    }
  });
});
