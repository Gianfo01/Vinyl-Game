// Rodada 5 — atributos detalhados (talent): derivação estável, aulas, efeitos na gravação.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { composeSongs, recordSongs } from '../src/sim/production';
import { advanceMonth } from '../src/sim/tick';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { attrsOf, groupAvg, lessonFor, otherInstruments, overall, startLessons, tal } from '../src/sim/sys/talent';

function withAct(seed: string) {
  const s = createGame(defaultConfig(seed));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  s.player.cash += 1_000_000_00;
  s.player.initialCash += 1_000_000_00;
  return { s, r, act };
}

describe('talent', () => {
  it('atributos estáveis, por função, entre 1 e 99', () => {
    const { s, act } = withAct('t5-a');
    const p = s.persons[act.members[0]];
    const a = attrsOf(s, p).map((x) => x.value);
    const b = attrsOf(s, p).map((x) => x.value);
    expect(a).toEqual(b);
    expect(a.every((v) => v >= 1 && v <= 99)).toBe(true);
    expect(attrsOf(s, p).some((x) => x.def.group === 'tech')).toBe(true);
    const o = overall(s, p);
    expect(o).toBeGreaterThan(0);
    expect(o).toBeLessThan(100);
    expect(Array.isArray(otherInstruments(s, p))).toBe(true);
  });

  it('aulas custam, duram três meses e sobem o grupo', () => {
    const { s, act } = withAct('t5-b');
    const p = s.persons[act.members[0]];
    expect(startLessons(s, p.id, 'tech')).toBeNull();
    expect(startLessons(s, p.id, 'tech')).not.toBeNull();
    const cash = s.player.cash;
    for (let i = 0; i < 4; i++) advanceMonth(s);
    // a voz pode cair por saúde no meio do caminho; a evolução das aulas fica registrada
    expect(tal(s).g[p.id]?.[attrsOf(s, p).find((x) => x.def.group === 'tech')!.def.id] ?? 0).toBeGreaterThan(3);
    expect(groupAvg(s, p, 'tech')).toBeGreaterThan(0);
    expect(s.player.cash).toBeLessThan(cash);
    expect(lessonFor(s, p.id)).toBeUndefined();
    expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
  });

  it('gravação e composição registram evolução e mantêm notas válidas', () => {
    const { s, r, act } = withAct('t5-c');
    const songs = composeSongs(s, r, act, 2);
    recordSongs(s, r, act, songs.map((x) => x.id), 1, 'balanced');
    for (const so of songs) {
      expect(so.performance).toBeGreaterThanOrEqual(5);
      expect(so.performance).toBeLessThanOrEqual(100);
    }
    expect(Object.keys(tal(s).g).length).toBeGreaterThan(0);
  });
});
