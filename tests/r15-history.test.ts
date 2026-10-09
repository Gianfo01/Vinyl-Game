// Rodada 15 — modos de história: exata (roteiro real a 100%), com variações (padrão) e aleatória.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { histLocked } from '../src/sim/history15';
import { realDataOf, rw } from '../src/sim/sys/realworld';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import type { GameState } from '../src/sim/types';

const mk = (history: 'strict' | 'loose' | 'free', seed = 'r15hist') => createGame(defaultConfig(seed, { startYear: 1975, realNames: true, realFates: true, mode: 'historic', history }));
const runTo = (s: GameState, year: number) => { while (s.year <= year && !s.ended) advanceMonth(s); };

describe('modos de história r15', () => {
  it('exata: disco real sai no ano real com o título real e a morte real acontece', () => {
    const s = mk('strict');
    expect(s.config.mode).toBe('historic');
    const st = rw(s);
    const rel = st.sched.filter((x) => x.kind === 'release' && x.year <= 1977 && s.acts[x.actId]?.owner !== 'player').sort((a, b) => a.year - b.year)[0];
    const fate = st.sched.filter((x) => x.kind === 'fate' && x.year <= 1980 && x.personId && s.persons[x.personId]?.alive).sort((a, b) => a.year - b.year)[0];
    expect(rel, 'algum disco real agendado').toBeTruthy();
    expect(fate, 'alguma morte real agendada').toBeTruthy();
    expect(rel.mo).toBeGreaterThanOrEqual(0);
    const act = s.acts[rel.actId];
    expect(histLocked(s, act)).toBe(true);
    runTo(s, Math.max(rel.year, fate.year));
    const titles = act.releases.map((id) => s.releases[id]).filter((r) => r && r.year === rel.year).map((r) => r.title);
    expect(titles).toContain(rel.rel![0]);
    const p = s.persons[fate.personId!];
    expect(p.alive).toBe(false);
    expect(p.died).toBe(fate.year);
    // nenhum disco inventado para atos reais intocados
    const invented = Object.values(s.releases).filter((r) => {
      const a = s.acts[r.actId];
      if (!a || !histLocked(s, a) || r.hist || r.year <= 1975) return false;
      return !(realDataOf(a)?.al ?? []).some((x) => x[0] === r.title);
    });
    expect(invented.map((r) => `${s.acts[r.actId].name}: ${r.title}`)).toEqual([]);
  });

  it('aleatória: fatos reais não são forçados (sem mortes agendadas, parte dos discos some)', () => {
    const free = mk('free'), loose = mk('loose');
    expect(rw(free).sched.some((x) => x.kind === 'fate')).toBe(false);
    expect(rw(loose).sched.some((x) => x.kind === 'fate')).toBe(true);
    const n = (s: GameState) => rw(s).sched.filter((x) => x.kind === 'release').length;
    expect(n(free)).toBeLessThan(n(loose));
  });

  it('determinístico: mesma semente, mesmo roteiro', () => {
    const a = mk('strict', 'det15'), b = mk('strict', 'det15');
    expect(JSON.stringify(rw(a).sched)).toBe(JSON.stringify(rw(b).sched));
    const c = mk('free', 'det15'), d = mk('free', 'det15');
    expect(JSON.stringify(rw(c).sched)).toBe(JSON.stringify(rw(d).sched));
  });
});
