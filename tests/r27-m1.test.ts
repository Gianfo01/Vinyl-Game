// Rodada 27 (M1): compor e gravar jogáveis — determinismo, modo rápido intacto, cada decisão puxa para o lado
// esperado, sem NaN, e o valor esperado de quem joga bem fica um pouco acima do modo rápido.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceWeek } from '../src/sim/tick';
import { composeSongs, songQ, unrecorded } from '../src/sim/production';
import { startSession } from '../src/sim/studio';
import { Rng } from '../src/core/rng';
import { processPlayerAgendas } from '../src/sim/agenda';
import { playerActs } from '../src/sim/util';
import type { GameState } from '../src/sim/types';
import { borrowedRisk27, composeBlock27, finishCompose27, playRound27, startCompose27, totals27, type Card27, type Comp27 } from '../src/sim/sys/compose27';
import { bars27, mixPreview27, mixRecord27, moveRecord27, startRecord27, takeBase27, type Rec27 } from '../src/sim/sys/record27';

const game = (seed = 'm1', year = 1975): GameState => {
  const cfg = defaultConfig(`${seed}-${year}`, { scenario: 'established', startYear: year });
  (cfg as { dbSize?: string }).dbSize = 'small';
  const g = createGame(cfg);
  advanceWeek(g);
  return g;
};
const firstAct = (s: GameState) => s.acts[playerActs(s)[0]];
const clone = (s: GameState): GameState => structuredClone(s);
const score = (x: Card27) => (x.fx.me ?? 0) * 0.25 + (x.fx.ly ?? 0) * 0.2 + (x.fx.or ?? 0) * 0.1 - (x.fx.risk ?? 0) * 3;

/** Joga a sessão inteira com uma estratégia. */
function play(s: GameState, c: Comp27, how: 'greedy' | 'random' | 'worst' | 'single'): void {
  let i = 0;
  while (!c.done && i++ < 10) {
    const hand = c.log[c.log.length - 1].hand;
    const sorted = [...hand].sort((a, b) => score(b) - score(a));
    let ids: string[];
    if (how === 'random') ids = [hand[(c.round * 7 + 3) % hand.length].id];
    else if (how === 'worst') ids = [sorted[sorted.length - 1].id];
    else if (how === 'single') ids = [sorted[0].id];
    else ids = c.energy > 0 && sorted.length > 1 && score(sorted[1]) > 0.4 ? [sorted[0].id, sorted[1].id] : [sorted[0].id];
    expect(playRound27(s, c, ids)).toBeNull();
  }
}

describe('r27 M1 — compor jogável', () => {
  it('mesma semente, mesmas escolhas → mesma sessão e mesmo resultado (sem NaN)', () => {
    const a = game(), b = game();
    const ca = startCompose27(a, firstAct(a).id) as Comp27, cb = startCompose27(b, firstAct(b).id) as Comp27;
    expect(JSON.stringify(ca)).toBe(JSON.stringify(cb));
    play(a, ca, 'greedy'); play(b, cb, 'greedy');
    const ra = finishCompose27(a, ca), rb = finishCompose27(b, cb);
    expect('songs' in ra && 'songs' in rb).toBe(true);
    if (!('songs' in ra) || !('songs' in rb)) return;
    expect(ra.songs.map((x) => [x.title, x.melody, x.lyrics, x.originality, x.q])).toEqual(rb.songs.map((x) => [x.title, x.melody, x.lyrics, x.originality, x.q]));
    for (const so of ra.songs) for (const k of ['melody', 'lyrics', 'originality', 'q'] as const) expect(Number.isFinite(so[k])).toBe(true);
    expect(ra.why.length).toBeGreaterThan(1);
  });

  it('não sorteia do fluxo compartilhado (s.rng intacto) e bloqueia a segunda sessão do mês', () => {
    const s = game('m1b');
    const rng0 = JSON.stringify(s.rng);
    const act = firstAct(s);
    const c = startCompose27(s, act.id) as Comp27;
    play(s, c, 'single');
    finishCompose27(s, c);
    expect(JSON.stringify(s.rng)).toBe(rng0);
    expect(composeBlock27(s, act.id)).not.toBeNull();
  });

  it('modo rápido intacto: composeSongs com a mesma semente dá as mesmas músicas de antes', () => {
    const s = game('m1q');
    const act = firstAct(s);
    const r = Rng.fromSeed('quick');
    const songs = composeSongs(s, r, act, 2);
    const t = clone(game('m1q'));
    const songs2 = composeSongs(t, Rng.fromSeed('quick'), t.acts[act.id], 2);
    expect(songs.map((x) => x.q)).toEqual(songs2.map((x) => x.q));
  });

  it('jogar bem rende mais que jogar mal; o bom jogador fica ~+5–25% acima do modo rápido', () => {
    let gain = 0, bad = 0, rnd = 0, n = 0;
    for (const seed of ['a1', 'b2', 'c3', 'd4', 'e5', 'f6']) {
      for (const year of [1965, 1995]) {
        const base = game(seed, year);
        const act = firstAct(base);
        if (!act || composeBlock27(base, act.id)) continue;
        const run = (how: 'greedy' | 'worst' | 'random') => {
          const s = clone(base);
          const c = startCompose27(s, act.id) as Comp27;
          play(s, c, how);
          const r = finishCompose27(s, c);
          return 'songs' in r ? r : null;
        };
        const g = run('greedy'), w = run('worst'), x = run('random');
        if (!g || !w || !x) continue;
        rnd += (x.q1 - x.q0) / Math.max(1, x.q0);
        gain += (g.q1 - g.q0) / Math.max(1, g.q0);
        bad += (w.q1 - w.q0) / Math.max(1, w.q0);
        n++;
      }
    }
    expect(n).toBeGreaterThan(5);
    console.log(`[m1] compor: ganho médio do bom jogador ${(100 * gain / n).toFixed(1)}%, do pior ${(100 * bad / n).toFixed(1)}%, ao acaso ${(100 * rnd / n).toFixed(1)}% (n=${n})`);
    expect(gain / n).toBeGreaterThan(0.05);
    expect(gain / n).toBeLessThan(0.22);
    expect(bad / n).toBeLessThan(0);
    expect(rnd / n).toBeLessThan(gain / n);
  });

  it('ideia emprestada: marca risco na faixa; carta de bloqueio/discussão encolhem a mão', () => {
    let sawBorrow = false, sawSmall = false;
    for (const seed of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10']) {
      const s = game(seed, 1990);
      const act = firstAct(s);
      const c = startCompose27(s, act.id) as Comp27;
      if (typeof c !== 'object' || !('log' in c)) continue;
      let guard = 0;
      while (!c.done && guard++ < 8) {
        const rd = c.log[c.log.length - 1];
        if (rd.ev === 'block') { expect(rd.hand.length).toBeLessThanOrEqual(2); sawSmall = true; }
        const b = rd.hand.find((x) => x.src === 'borrowed');
        playRound27(s, c, [b ? b.id : rd.hand[0].id]);
      }
      if (c.picked.some((x) => x.src === 'borrowed')) {
        expect(totals27(c).risk).toBeGreaterThan(0);
        const r = finishCompose27(s, c);
        if ('main' in r && r.main) { expect(borrowedRisk27(s, r.main.id)).toBeGreaterThan(0); sawBorrow = true; }
      }
    }
    expect(sawBorrow || sawSmall).toBe(true);
  });

  it('descansar devolve energia; duas cartas custam energia', () => {
    const s = game('m1e');
    const c = startCompose27(s, firstAct(s).id) as Comp27;
    const e0 = c.energy;
    const hand = c.log[0].hand;
    playRound27(s, c, [hand[0].id, hand[1].id]);
    expect(c.energy).toBeLessThan(e0);
    const e1 = c.energy;
    playRound27(s, c, []);
    expect(c.energy).toBe(Math.min(c.energyMax, e1 + 1));
  });

  it('agenda: a "Compor" marcada como jogada é pulada uma vez (sem compor de novo) e volta ao normal depois', () => {
    const s = game('m1ag');
    const act = firstAct(s);
    s.agenda[act.id] = [{ action: 'compose', params: { week: 1, played27: 1 } }];
    s.delegated[act.id] = false;
    const n0 = act.songs.length;
    processPlayerAgendas(s, Rng.fromSeed('ag'));
    expect(act.songs.length).toBe(n0);
    expect(s.agenda[act.id][0].params?.played27).toBeUndefined();
    processPlayerAgendas(s, Rng.fromSeed('ag2'));
    expect(act.songs.length).toBeGreaterThan(n0);
  });
});

// ---------------------------------------------------------------- gravar

function session(s: GameState): string | null {
  const act = firstAct(s);
  let songs = unrecorded(s, act);
  if (!songs.length) { composeSongs(s, Rng.fromSeed('w'), act, 2); songs = unrecorded(s, act); }
  s.player.cash += 1e7;
  const res = startSession(s, act.id, songs.slice(0, 2).map((x) => x.id), 1, 'balanced');
  return 'id' in res ? res.id : null;
}

describe('r27 M1 — gravar jogável', () => {
  it('determinístico, não usa s.rng, sem NaN; fecha as faixas e a mixagem', () => {
    const run = () => {
      const s = game('r1');
      const id = session(s)!;
      const rng0 = JSON.stringify(s.rng);
      const rc = startRecord27(s, id) as Rec27;
      let guard = 0;
      while (rc.phase === 'takes' && guard++ < 20) moveRecord27(s, rc, rc.takes.length >= 2 ? 'keep' : 'another');
      expect(rc.phase).toBe('mix');
      expect(mixRecord27(s, rc, 'raw')).toBeNull();
      expect(JSON.stringify(s.rng)).toBe(rng0);
      for (const x of rc.results) { const so = s.songs[x.songId]; expect(so.recorded).toBe(true); for (const k of ['performance', 'production', 'originality', 'q'] as const) expect(Number.isFinite(so[k])).toBe(true); }
      return rc.results.map((x) => [x.songId, x.q, x.perf]);
    };
    expect(run()).toEqual(run());
  });

  it('pausa reduz cansaço; insistir cansa; músico de sessão sobe a base do take e cobra cachê', () => {
    const s = game('r2');
    const id = session(s)!;
    const rc = startRecord27(s, id) as Rec27;
    const act = firstAct(s);
    const f0 = bars27(s, act.id).fatigue;
    moveRecord27(s, rc, 'another');
    expect(bars27(s, act.id).fatigue).toBeGreaterThan(f0);
    const f1 = bars27(s, act.id).fatigue;
    moveRecord27(s, rc, 'relax');
    expect(bars27(s, act.id).fatigue).toBeLessThan(f1);
    const b0 = takeBase27(s, rc), cash0 = s.player.cash;
    moveRecord27(s, rc, 'musician');
    expect(takeBase27(s, rc)).toBeGreaterThan(b0);
    expect(s.player.cash).toBeLessThan(cash0);
  });

  it('mixagem: "mais rádio" sobe produção e baixa originalidade; "mais crua" o contrário', () => {
    const s = game('r3');
    const id = session(s)!;
    const rc = startRecord27(s, id) as Rec27;
    let guard = 0;
    while (rc.phase === 'takes' && guard++ < 20) moveRecord27(s, rc, 'keep');
    const sid = rc.results[0].songId;
    const t = clone(s);
    const p0 = s.songs[sid].production, o0 = s.songs[sid].originality;
    expect(mixPreview27(s, rc, 'radio').length).toBe(rc.results.length);
    mixRecord27(s, rc, 'radio');
    expect(s.songs[sid].production).toBeGreaterThan(p0);
    expect(s.songs[sid].originality).toBeLessThan(o0);
    const rc2 = { ...rc, phase: 'mix' as const, results: rc.results.map((x) => ({ ...x })) };
    mixRecord27(t, rc2, 'raw');
    expect(t.songs[sid].production).toBeLessThan(p0);
    expect(t.songs[sid].originality).toBeGreaterThan(o0);
    expect(songQ(t.songs[sid])).toBeGreaterThan(0);
  });

  it('valor esperado: jogar com cuidado ≥ modo rápido (keep após N takes), sem passar de ~+25%', () => {
    let gain = 0, perf = 0, n = 0;
    for (const seed of ['x1', 'x2', 'x3', 'x4', 'x5', 'x6']) {
      const base = game(seed, 1985);
      const id = session(base);
      if (!id) continue;
      const quick = (() => {
        const s = clone(base);
        const rc = startRecord27(s, id) as Rec27;
        let g = 0;
        while (rc.phase === 'takes' && g++ < 20) moveRecord27(s, rc, rc.takes.length >= 2 ? 'keep' : 'another');
        return [rc.results.reduce((t, x) => t + x.q, 0) / rc.results.length, rc.results.reduce((t, x) => t + x.perf, 0) / rc.results.length];
      })();
      const good = (() => {
        const s = clone(base);
        const rc = startRecord27(s, id) as Rec27;
        let g = 0;
        while (rc.phase === 'takes' && g++ < 30) {
          const best = Math.max(...rc.takes.map((x) => x.q));
          const b = takeBase27(s, rc);
          if (bars27(s, rc.actId).fatigue > 60) moveRecord27(s, rc, 'relax');
          else if (best >= b + 4 || rc.takes.length >= 3) moveRecord27(s, rc, 'keep');
          else if (!rc.arranged) moveRecord27(s, rc, 'arrange');
          else moveRecord27(s, rc, 'another');
        }
        mixRecord27(s, rc, 'raw');
        return [rc.results.reduce((t, x) => t + x.q, 0) / rc.results.length, rc.results.reduce((t, x) => t + x.perf, 0) / rc.results.length];
      })();
      gain += (good[0] - quick[0]) / quick[0];
      perf += (good[1] - quick[1]) / quick[1];
      n++;
    }
    console.log(`[m1] gravar: quem joga com cuidado — Q ${(100 * gain / n).toFixed(1)}%, performance ${(100 * perf / n).toFixed(1)}% (n=${n})`);
    expect(n).toBeGreaterThan(3);
    expect(gain / n).toBeGreaterThan(0);
    expect(gain / n).toBeLessThan(0.25);
    expect(perf / n).toBeGreaterThan(0.03);
    expect(perf / n).toBeLessThan(0.3);
  });
});
