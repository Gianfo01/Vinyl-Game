// Rodada 5 — críticas completas e entrevistas com respostas para cada pergunta.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import type { Cutscene } from '../src/sim/ext4';
import { reviewRelease } from '../src/sim/media';
import { composeSongs, recordSongs } from '../src/sim/production';
import { fanScore, reviewBody } from '../src/sim/reviews';
import { TONES, reaction, resolveInterview, startInterview, type Question } from '../src/sim/sys/scenes/interview';
import type { Release } from '../src/sim/types';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';

function withAct(seed: string) {
  const s = createGame(defaultConfig(seed, { startYear: 1980 }));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity, fame: 30 });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  return { s, r, act };
}

describe('críticas', () => {
  it('cada crítica tem notas por aspecto, faixas citadas e texto com veredito', () => {
    const { s, r, act } = withAct('rv5');
    const songs = composeSongs(s, r, act, 5);
    recordSongs(s, r, act, songs.map((x) => x.id), 1, 'balanced');
    const rel = { id: 'rtest', actId: act.id, owner: 'player', type: 'album', title: 'Teste', songs: songs.map((x) => x.id), week: s.week, year: s.year, q: songs.reduce((t, x) => t + x.q, 0) / songs.length, appeal: 1, peak: 999, weekly: [], territories: [] } as unknown as Release;
    s.releases[rel.id] = rel;
    const rv = reviewRelease(s, r, rel);
    expect(rv.length).toBeGreaterThan(1);
    for (const x of rv) {
      expect(x.aspects).toBeDefined();
      expect(x.best).toBeDefined();
      const body = reviewBody(s, rel, x);
      expect(body.length).toBeGreaterThanOrEqual(3);
      expect(body[body.length - 1].pt.startsWith('Veredito')).toBe(true);
      expect(reviewBody(s, rel, x)).toEqual(body); // determinístico
    }
    const f = fanScore(s, rel);
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThanOrEqual(10);
  });
});

describe('entrevistas', () => {
  it('cada pergunta traz quatro respostas escritas para ela, e a transcrição sai no resultado', () => {
    const { s, r, act } = withAct('iv5');
    const cs = startInterview(s, r, act.id) as Cutscene;
    const qs = cs.data.questions as Question[];
    expect(qs.length).toBe(4);
    for (const q of qs) {
      for (const tn of TONES) expect(q.answers?.[tn]?.pt.length).toBeGreaterThan(5);
      expect(new Set(TONES.map((tn) => q.answers![tn].pt)).size).toBe(4);
      expect(q.text.pt).not.toMatch(/\{\w+\}/);
      for (const tn of TONES) expect(q.answers![tn].pt).not.toMatch(/\{\w+\}/);
      expect(reaction(q, q.ideal).mood).toBe('good');
    }
    const res = resolveInterview(s, r, cs.id, qs.map((q) => q.ideal));
    expect('transcript' in res && res.transcript?.length).toBe(4);
  });
});
