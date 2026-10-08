// Rodada 4 — sistema "music": mini-jogos de composição/estúdio, foco, equipamentos, audição às cegas,
// jam, volume na masterização e a partitura do motor de áudio.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { composeSongs, recordSongs } from '../src/sim/production';
import { advanceMonth, advanceWeek } from '../src/sim/tick';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { startSession, sessionDay } from '../src/sim/studio';
import { applyMods } from '../src/sim/ext4';
import {
  GEAR, applyArrange, applyBeat, applyChords, applyLyrics, applyMaster, applyMelody, applyTake, autoBeat, autoChords, autoJam, autoLyrics, autoMelody,
  blindBet, blindCandidates, buyGear, focusFit, ms, pendingTake, setFocus, setGameBonus, trackLimit, useSignatureBeat, FOCUS_IDEAL,
} from '../src/sim/sys/music';
import { buildActDemoSpec, buildSongSpec, specSeconds } from '../src/audio/spec';
import type { GameState, Release } from '../src/sim/types';

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

describe('music: composição', () => {
  it('estado existe e acordes aplicam bônus limitado, sem acumular ao repetir', () => {
    const { s, r, act } = withAct('mu-1');
    expect(s.x4.music).toBeDefined();
    const [so] = composeSongs(s, r, act, 1);
    so.genre = 'teen_pop';
    const m0 = so.melody;
    const res = applyChords(s, so.id, ['I', 'V', 'vi', 'IV'], ['vi', 'IV', 'I', 'V']);
    expect('score' in res).toBe(true);
    const m1 = s.songs[so.id].melody;
    expect(Math.abs(m1 - m0)).toBeLessThanOrEqual(6.01);
    applyChords(s, so.id, ['I', 'V', 'vi', 'IV'], ['vi', 'IV', 'I', 'V']);
    expect(s.songs[so.id].melody).toBeCloseTo(m1, 5);
    expect(ms(s).songs[so.id].chords?.classic).toBe('axis');
  });

  it('total de bônus por atributo fica em ±10', () => {
    const { s, r, act } = withAct('mu-2');
    const [so] = composeSongs(s, r, act, 1);
    const base = so.lyrics;
    for (const g of ['chords', 'melody', 'lyrics', 'arrange'] as const) setGameBonus(s, so.id, g, { lyrics: 6 });
    expect(s.songs[so.id].lyrics - base).toBeLessThanOrEqual(10.01);
  });

  it('melodia, letra e arranjo automáticos aplicam e guardam dados', () => {
    const { s, r, act } = withAct('mu-3');
    const [so] = composeSongs(s, r, act, 1);
    expect('score' in (applyMelody(s, so.id, autoMelody(s, r, so)) as object)).toBe(true);
    const ly = autoLyrics(s, r, so);
    expect('score' in (applyLyrics(s, so.id, ly.lines, ly.scheme) as object)).toBe(true);
    const ar = applyArrange(s, so.id, ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus'], ['vox', 'drums', 'bass', 'gtr', 'piano', 'strings', 'horns']);
    expect('score' in ar).toBe(true);
    if ('lanes' in ar) expect(ar.lanes.length).toBeLessThanOrEqual(trackLimit(s));
    const rec = ms(s).songs[so.id];
    expect(rec.melody?.notes.length).toBe(16);
    expect(rec.lyrics?.lines.length).toBeGreaterThan(1);
    expect(rec.arrange?.blocks.length).toBe(7);
  });

  it('pistas por era: 1 antes da fita multipista, ilimitado com DAW', () => {
    const a = withAct('mu-4', { startYear: 1925 }).s;
    expect(trackLimit(a)).toBe(1);
    const b = withAct('mu-5', { startYear: 2005 }).s;
    expect(trackLimit(b)).toBe(99);
  });
});

describe('music: estúdio', () => {
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

  it('take no tempo melhora o take pendente da sessão', () => {
    const { s, r, act } = withAct('mu-7');
    s.delegated[act.id] = false;
    const songs = composeSongs(s, r, act, 1);
    const sess = startSession(s, act.id, songs.map((x) => x.id), 1, 'balanced');
    expect('id' in sess).toBe(true);
    for (let d = 0; d < 10 && !pendingTake(s); d++) sessionDay(s, r, s.day + s.clock.dayInMonth + d);
    const p = pendingTake(s);
    expect(p).toBeDefined();
    const id = p!.decision!.songId;
    const before = p!.takes[id].at(-1)!.quality;
    const res = applyTake(s, id, 24, 20, 24);
    expect('score' in res && res.applied).toBe('take');
    expect(p!.takes[id].at(-1)!.quality).toBeGreaterThan(before);
    invariant(s);
  });

  it('sessão aplica bônus pendentes ao fechar a faixa (varredura diária)', () => {
    const { s, r, act } = withAct('mu-8');
    const songs = composeSongs(s, r, act, 1);
    applyTake(s, songs[0].id, 24, 24, 24);
    startSession(s, act.id, [songs[0].id], 1, 'balanced');
    advanceMonth(s);
    expect(s.songs[songs[0].id].recorded).toBe(true);
    expect(ms(s).songs[songs[0].id].recSeen).toBe(true);
    expect(ms(s).songs[songs[0].id].applied.performance).toBeGreaterThan(0);
    invariant(s);
  });

  it('volume ajuda no rádio antes da normalização e não depois', () => {
    for (const [year, helps] of [[1990, true], [2020, false]] as const) {
      const { s, r, act } = withAct(`mu-9-${year}`, { startYear: year });
      const [so] = composeSongs(s, r, act, 1);
      recordSongs(s, r, act, [so.id], 1, 'balanced');
      applyMaster(s, so.id, 70);
      const rel = { id: 'x', actId: act.id, songs: [so.id] } as unknown as Release;
      const v = applyMods(s, 'appeal', 100, { release: rel, act }).value;
      if (helps) expect(v).toBeGreaterThan(100);
      else expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('batida vira assinatura e pode ser reaproveitada', () => {
    const { s, r, act } = withAct('mu-10', { startYear: 1990 });
    const [a, b] = composeSongs(s, r, act, 2);
    const res = applyBeat(s, a.id, autoBeat(s, r, a), 'Groove da casa');
    expect('score' in res).toBe(true);
    expect(ms(s).beats.length).toBe(1);
    expect(useSignatureBeat(s, b.id, ms(s).beats[0].id)).toBeNull();
    expect(ms(s).songs[b.id].beat?.sig).toBe(ms(s).beats[0].id);
  });
});

describe('music: ouvido e banda', () => {
  it('audição às cegas: acertar aumenta o ouvido', () => {
    const { s, r } = withAct('mu-11');
    const c = blindCandidates(s);
    expect(c.length).toBe(3);
    const best = [...c].sort((x, y) => s.acts[y.actId].potential - s.acts[x.actId].potential)[0];
    const res = blindBet(s, r, best.actId);
    expect('correct' in res && res.correct).toBe(true);
    expect(ms(s).ear).toBe(1);
    expect('pt' in (blindBet(s, r, best.actId) as object)).toBe(true); // só a cada 4 semanas
  });

  it('jam gera ideias no caderno uma vez por mês', () => {
    const { s, r, act } = withAct('mu-12');
    if (act.members.length < 2) return;
    const before = (s.ideas[act.id] ?? []).length;
    const res = autoJam(s, r, act.id);
    expect('score' in res).toBe(true);
    expect((s.ideas[act.id] ?? []).length).toBeGreaterThanOrEqual(Math.min(8, before + (('ideas' in res && res.ideas.length) || 0)));
    expect('pt' in (autoJam(s, r, act.id) as object)).toBe(true);
  });

  it('foco: encaixe perfeito com a distribuição ideal', () => {
    expect(focusFit('rock', FOCUS_IDEAL.rock)).toBe(1);
    expect(focusFit('rock', { comp: 100, arr: 0, rec: 0, mix: 0 })).toBeLessThan(0.5);
  });
});

describe('music: partitura e determinismo', () => {
  it('a partitura usa os acordes salvos e é determinística', () => {
    const { s, r, act } = withAct('mu-13');
    const [so] = composeSongs(s, r, act, 1);
    const ch = autoChords(s, r, so);
    applyChords(s, so.id, ch.verse, ch.chorus);
    const a = buildSongSpec(s, so);
    const b = buildSongSpec(s, so);
    expect(a).toEqual(b);
    expect(specSeconds(a)).toBeGreaterThan(10);
    expect(a.bars.some((x) => ch.verse.includes(x.chord) || ch.chorus.includes(x.chord))).toBe(true);
    const demo = buildActDemoSpec(s, act);
    expect(demo.melody.length).toBe(16);
  });

  it('mesma seed, mesma história com o sistema ligado', () => {
    const run = () => {
      const { s, r, act } = withAct('mu-det');
      const [so] = composeSongs(s, r, act, 1);
      applyChords(s, so.id, ['I', 'IV', 'V', 'I'], ['vi', 'IV', 'I', 'V']);
      for (let i = 0; i < 3; i++) advanceMonth(s);
      advanceWeek(s);
      return JSON.stringify({ cash: s.player.cash, music: s.x4.music, week: s.week });
    };
    expect(run()).toBe(run());
  });
});
