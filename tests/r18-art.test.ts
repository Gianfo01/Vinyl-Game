// Rodada 18 (art18): trajetória artística (cada disco muda o próximo) e qualidade multidimensional.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { explain18 } from '../src/sim/explain18';
import { playMonth } from '../src/sim/playbot16';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import type { Act, GameState, Release, Song } from '../src/sim/types';
import { PRODUCERS } from '../src/sim/studio';
import { DIMS18, appealMult18, bestOrder18, criticAdj18, curveMult18, dims18, prodFit18, rawness18, sequence18 } from '../src/sim/sys/quality18';
import { ensureT18, expectCritic18, outcome18, trajView18, suggestDir18 } from '../src/sim/sys/traj18';

const song = (s: GameState, act: Act, id: string, q: number, melody: number, lyrics: number, orig: number): Song => {
  const so = { id, actId: act.id, title: id, genre: act.genre, writers: [], melody, lyrics, performance: q, production: q, originality: orig, q, recorded: true, createdWeek: 0 } as Song;
  s.songs[id] = so;
  return so;
};

describe('r18 art: qualidade multidimensional', () => {
  const s = createGame(defaultConfig('r18-art', { startYear: 1975 }));
  const act = Object.values(s.acts).find((a) => a.members.length && !a.deceased)!; act.owner = 'player';

  it('sequência: a ordem sugerida nunca é pior que a original', () => {
    const ids = [song(s, act, 'x1', 40, 35, 40, 40), song(s, act, 'x2', 45, 40, 45, 50), song(s, act, 'x3', 80, 85, 70, 60), song(s, act, 'x4', 42, 38, 44, 45), song(s, act, 'x5', 70, 75, 80, 55)].map((x) => x.id);
    const best = bestOrder18(s, ids);
    expect(best.slice().sort()).toEqual(ids.slice().sort());
    expect(sequence18(s, best).v).toBeGreaterThanOrEqual(sequence18(s, ids).v);
    expect(sequence18(s, ids).why.length).toBeGreaterThan(1);
  });

  it('produtor certo depende do projeto: estrela tira crueza, o da cena soma emoção', () => {
    const raw = { ...act, genre: 'delta_blues', positioning: 20 } as Act;
    const pop = { ...act, genre: 'dance_pop', positioning: 85 } as Act;
    expect(rawness18(raw)).toBeGreaterThan(rawness18(pop));
    const star = PRODUCERS.reduce((a, b) => (b.fee > a.fee ? b : a));
    const emo = (a: Act) => prodFit18(s, a, star).adj.filter((x) => x.d === 'emo').reduce((t, x) => t + x.v, 0);
    expect(emo(raw)).toBeLessThan(emo(pop));
  });

  it('dimensões alimentam consumidores diferentes (e o Q geral continua o resumo)', () => {
    const base = Object.fromEntries(DIMS18.map((d) => [d, 55])) as Record<(typeof DIMS18)[number], number>;
    const rel = { type: 'lp' } as Release;
    const pop = { ...base, acc: 90, sgl: 90, orig: 30, dur: 35, imm: 85 };
    const art = { ...base, acc: 30, sgl: 35, orig: 90, emo: 85, coh: 85, dur: 85, imm: 35 };
    expect(appealMult18(rel, pop).m).toBeGreaterThan(appealMult18(rel, art).m);
    const crit = (v: typeof base) => criticAdj18(rel, v).reduce((t, x) => t + x[1], 0);
    expect(crit(art)).toBeGreaterThan(crit(pop));
    expect(curveMult18(pop, 2)).toBeGreaterThan(curveMult18(art, 2)); // estreia
    expect(curveMult18(art, 40)).toBeGreaterThan(curveMult18(pop, 40)); // catálogo
  });
});

describe('r18 art: trajetória', () => {
  it('resultado contra a previsão: cult, hit e fracasso', () => {
    const r = (o: Partial<Release>) => ({ type: 'lp', fc: 1000, fa: 1000, totalUnits: 1000, critic: 60, peak: 50, ...o }) as Release;
    const s = createGame(defaultConfig('r18-art2', { startYear: 1975 }));
    expect(outcome18(s, r({ fa: 500, critic: 80 })).o).toBe('cult');
    expect(outcome18(s, r({ fa: 2500 })).o).toBe('hit');
    expect(outcome18(s, r({ fa: 300, critic: 50 })).o).toBe('flop');
    expect(outcome18(s, r({})).o).toBe('solid');
  });

  it('expectativa sufocante: crítica compara com o melhor disco', () => {
    const s = createGame(defaultConfig('r18-art3', { startYear: 1975 }));
    const act = Object.values(s.acts).find((a) => a.members.length && !a.deceased)!; act.owner = 'player';
    const t = ensureT18(s, act);
    t.expect = 90;
    const mk = (id: string, q: number, week: number) => { const x = { id, actId: act.id, owner: 'player', type: 'lp', songs: [], week, year: s.year, q, title: id } as unknown as Release; s.releases[id] = x; act.releases.push(id); return x; };
    mk('rA', 80, 1);
    const worse = mk('rB', 60, 50);
    expect(expectCritic18(s, worse)!.v).toBeLessThan(0);
    t.expect = 30;
    expect(expectCritic18(s, worse)).toBeNull();
    t.exp = 90; t.pres = 0;
    expect(suggestDir18(s, act)).toBe('bold');
    expect(trajView18(s, act).expect).toBe(30);
  });

  it('jogo real: discos do jogador ganham perfil congelado, explicações e trajetória', { timeout: 60000 }, () => {
    const s = createGame(defaultConfig('r18-art4', { startYear: 1990 }));
    for (let m = 0; m < 14 && !s.ended; m++) { playMonth(s, 'balanced'); advanceMonth(s); }
    const mine = Object.values(s.releases).filter((r) => r.owner === 'player' && !r.reissueOf);
    expect(mine.length).toBeGreaterThan(0);
    const rel = mine[0];
    const v = dims18(s, rel)!;
    for (const d of DIMS18) if (d !== 'chem') { expect(v[d]).toBeGreaterThanOrEqual(0); expect(v[d]).toBeLessThanOrEqual(100); }
    expect(s.x4.q18.q[rel.id]).toBeDefined();
    expect(explain18(s, 'q18.rel', { rel: rel.id })?.parts.length).toBeGreaterThan(5);
    expect(explain18(s, 'q18.dim', { rel: rel.id, d: 'emo' })?.parts.length).toBeGreaterThan(0);
    const act = s.acts[rel.actId];
    const tv = trajView18(s, act);
    expect(tv.mine).toBe(true);
    expect(tv.eras[0]?.k).toBe('debut');
    expect(s.x4.traj18.a[act.id].n).toBeGreaterThan(0);
  });
});
