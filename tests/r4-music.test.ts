// Sistema "music" (mini-jogos retirados na rodada 5): pistas por era, foco, equipamentos e a
// partitura do motor de áudio.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { composeSongs, recordSongs } from '../src/sim/production';
import { advanceMonth, advanceWeek } from '../src/sim/tick';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { startSession } from '../src/sim/studio';
import { GEAR, buyGear, focusFit, ms, setFocus, trackLimit, FOCUS_IDEAL } from '../src/sim/sys/music';
import { buildActDemoSpec, buildSongSpec, specSeconds } from '../src/audio/spec';
import type { GameState } from '../src/sim/types';

function withAct(seed: string, over = {}) {
  const s = createGame(defaultConfig(seed, over));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  s.player.cash += 5_000_000_00;
  s.player.initialCash += 5_000_000_00;
  return { s, r, act };
}

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);

describe('music: estúdio', () => {
  it('pistas por era: 1 antes da fita multipista, ilimitado com DAW', () => {
    const a = withAct('mu-4', { startYear: 1925 }).s;
    expect(trackLimit(a)).toBe(1);
    const b = withAct('mu-5', { startYear: 2005 }).s;
    expect(trackLimit(b)).toBe(99);
  });
  it('foco e equipamento entram na gravação; compra respeita o caixa', () => {
    const { s, r, act } = withAct('mu-6');
    const [so] = composeSongs(s, r, act, 1);
    const g = GEAR.find((x) => s.year >= x.from)!;
    expect(buyGear(s, g.id)).toBeNull();
    expect(buyGear(s, g.id)).not.toBeNull();
    invariant(s);
    const fam = Object.keys(FOCUS_IDEAL)[0];
    void fam;
    setFocus(s, act.id, { comp: 25, arr: 25, rec: 25, mix: 25 });
    recordSongs(s, r, act, [so.id], 1, 'balanced');
    const rec = ms(s).songs[so.id];
    expect(rec.recSeen).toBe(true);
    expect(rec.b.focus).toBeDefined();
    expect(rec.b.gear).toBeDefined();
    invariant(s);
  });

  it('sessão aplica bônus pendentes ao fechar a faixa (varredura diária)', () => {
    const { s, r, act } = withAct('mu-8');
    const songs = composeSongs(s, r, act, 1);
    startSession(s, act.id, [songs[0].id], 1, 'balanced');
    advanceMonth(s);
    expect(s.songs[songs[0].id].recorded).toBe(true);
    expect(ms(s).songs[songs[0].id].recSeen).toBe(true);
    invariant(s);
  });
  it('foco: encaixe perfeito com a distribuição ideal', () => {
    expect(focusFit('rock', FOCUS_IDEAL.rock)).toBe(1);
    expect(focusFit('rock', { comp: 100, arr: 0, rec: 0, mix: 0 })).toBeLessThan(0.5);
  });
});

describe('music: partitura e determinismo', () => {
  it('a partitura é determinística', () => {
    const { s, r, act } = withAct('mu-13');
    const [so] = composeSongs(s, r, act, 1);
    const a = buildSongSpec(s, so);
    const b = buildSongSpec(s, so);
    expect(a).toEqual(b);
    expect(specSeconds(a)).toBeGreaterThan(10);
    const demo = buildActDemoSpec(s, act);
    expect(demo.melody.length).toBe(16);
  });

  it('mesma seed, mesma história com o sistema ligado', () => {
    const run = () => {
      const { s } = withAct('mu-det');
      for (let i = 0; i < 3; i++) advanceMonth(s);
      advanceWeek(s);
      return JSON.stringify({ cash: s.player.cash, music: s.x4.music, week: s.week });
    };
    expect(run()).toBe(run());
  });
});
