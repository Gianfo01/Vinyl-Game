// Revisão 21 — E (criação, produção e direitos): a sessão dispara o gancho 'record' (E-1), deluxe paga a verba
// uma vez (E-2), cover paga o dono da obra original (E-3) e cancelar lançamento devolve a capa (E-11).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { registerSimHook, replaceSimHook } from '../src/sim/ext4';
import { marketWeek } from '../src/sim/market';
import { cancelRelease, composeSongs, recordSongs, releaseCost, scheduleRelease } from '../src/sim/production';
import { rolloutsWeek } from '../src/sim/rollout';
import { makeCover, resolveTake, startSession } from '../src/sim/studio';
import '../src/sim/sys';
import { advanceWeek } from '../src/sim/tick';
import type { GameState, Release } from '../src/sim/types';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';

function withAct(seed: string) {
  const s = createGame(defaultConfig(seed, { startYear: 1972 }));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  s.player.cash += 5_000_000_00;
  s.player.initialCash += 5_000_000_00;
  return { s, r, act };
}
const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);

describe('r21 E-1 — sessão de estúdio dispara o gancho record', () => {
  it('cada faixa fechada na sessão passa por runSimHooks("record") com semana de gravação', () => {
    const { s, r, act } = withAct('r21e-1');
    const seen: string[] = [];
    registerSimHook('record', 'r21e-test', (_s, _r, a) => { if (a.song) seen.push(a.song.id); });
    s.delegated[act.id] = false;
    const songs = composeSongs(s, r, act, 2);
    const sess = startSession(s, act.id, songs.map((x) => x.id), 1, 'balanced');
    expect('id' in sess).toBe(true);
    if (!('id' in sess)) return;
    for (let i = 0; i < 6 && !songs.every((x) => s.songs[x.id].recorded); i++) {
      advanceWeek(s);
      if (sess.decision) resolveTake(s, r, sess.id, 'keep');
    }
    expect(songs.every((x) => s.songs[x.id].recorded)).toBe(true);
    for (const so of songs) {
      expect(seen).toContain(so.id);
      expect(s.songs[so.id].recordedWeek).toBeGreaterThanOrEqual(so.createdWeek);
      expect(s.songs[so.id].studioTier).toBe(1);
    }
    replaceSimHook('record', 'r21e-test', () => {});
    invariant(s);
  });
});

describe('r21 E-2 — fase deluxe do rollout paga a verba uma vez', () => {
  it('o custo da fase é só o releaseCost (prensagem + marketing), sem pay() duplicado', () => {
    const { s, r, act } = withAct('r21e-2');
    const songs = composeSongs(s, r, act, 8);
    recordSongs(s, r, act, songs.map((x) => x.id), 1, 'balanced');
    const album: Release = {
      id: 'ralb', actId: act.id, owner: 'player', type: 'lp', title: 'Alb', songs: songs.slice(0, 6).map((x) => x.id), week: s.week - 30, year: s.year, q: 60, appeal: 40,
      formats: ['lp'], stock: 1000, pressed: 1000, marketing: [], marketingE: 0.2, territories: [...s.player.territories], weekly: [], totalUnits: 0, revenue: 0,
      peak: 999, weeksOnChart: 0, lastPos: 0, coverSeed: 1, shortage: 0, live: true, kind: 'standard', rolloutId: 'ro1', autopsy: [],
    };
    s.releases[album.id] = album;
    act.releases.push(album.id);
    for (const id of album.songs) s.songs[id].releaseId = album.id;
    const budget = 40_000_00;
    s.rollouts.push({ id: 'ro1', actId: act.id, title: 'Alb', songIds: album.songs, singles: [], phases: [{ kind: 'deluxe', week: s.week, done: false, budget }], presaves: 0, hype: 0, status: 'active', deluxe: songs.slice(6).map((x) => x.id) } as never);
    const before = s.player.cash;
    rolloutsWeek(s, r);
    const pr = s.pendingReleases.find((x) => x.kind === 'deluxe');
    expect(pr).toBeDefined();
    const cost = releaseCost(s, { actId: act.id, type: 'lp', songs: pr!.songs, formats: pr!.formats, press: pr!.press, marketing: pr!.marketing, territories: pr!.territories, weeksAhead: 1 });
    expect(pr!.marketing.reduce((t, m) => t + m.budget, 0)).toBe(budget);
    expect(before - s.player.cash).toBe(cost);
    expect(album.autopsy?.find((f) => f.key === 'deluxe')?.value).toBeCloseTo(1.15);
    invariant(s);
  });
});

describe('r21 E-3 — cover paga o dono da obra original', () => {
  const npcSong = (s: GameState) => {
    const npc = Object.values(s.acts).find((a) => a.owner && a.owner !== 'player' && s.labels[a.owner] && a.songs.some((id) => s.songs[id]?.releaseId))!;
    const src = npc.songs.map((id) => s.songs[id]).find((x) => x?.releaseId)!;
    return { npc, src, lb: s.labels[npc.owner!] };
  };
  it('a licença mecânica vai para autores e selo do original, não para o ato que gravou', () => {
    const { s, act } = withAct('r21e-3a');
    const { npc, src, lb } = npcSong(s);
    const lbBefore = lb.cash, actBefore = act.cash;
    const authorsBefore = src.writers.reduce((t, w) => t + (s.personalCash[w] ?? 0), 0);
    const cashBefore = s.player.cash;
    const cover = makeCover(s, act.id, src.id);
    expect('id' in cover).toBe(true);
    if (!('id' in cover)) return;
    const fee = cashBefore - s.player.cash;
    expect(fee).toBeGreaterThan(0);
    expect(lb.cash - lbBefore + (src.writers.reduce((t, w) => t + (s.personalCash[w] ?? 0), 0) - authorsBefore)).toBe(fee);
    expect(act.cash).toBe(actBefore);
    expect(cover.coverOf).toBe(src.id);
    expect(npc.owner).not.toBe('player');
    // cover de obra do próprio elenco não cobra licença
    const { r } = { r: rngOf(s) };
    const own = composeSongs(s, r, act, 1)[0];
    const c2 = s.player.cash;
    expect('id' in makeCover(s, act.id, own.id)).toBe(true);
    expect(s.player.cash).toBe(c2);
    invariant(s);
  });
  it('na distribuição, a metade "editora" da obra alheia vai ao selo original (não ao contrato do ato que gravou)', () => {
    const { s, r, act } = withAct('r21e-3b');
    const { src, lb } = npcSong(s);
    const songs = composeSongs(s, r, act, 1);
    recordSongs(s, r, act, [songs[0].id], 1, 'balanced');
    const mk = (cover: boolean): GameState => {
      const t = structuredClone(s);
      const so = t.songs[songs[0].id];
      if (cover) { so.coverOf = src.id; so.writers = [...src.writers]; so.splits = undefined; }
      const rel: Release = {
        id: 'rcov', actId: act.id, owner: 'player', type: 'single', title: 'Cov', songs: [so.id], week: t.week, year: t.year, q: 70, appeal: 60,
        formats: ['lp'], stock: 5000, pressed: 5000, marketing: [], marketingE: 0.3, territories: [...t.player.territories], weekly: [], totalUnits: 0, revenue: 0,
        peak: 999, weeksOnChart: 0, lastPos: 0, coverSeed: 1, shortage: 0, live: true, kind: 'standard', autopsy: [],
      };
      t.releases[rel.id] = rel;
      t.acts[act.id].releases.push(rel.id);
      so.releaseId = rel.id;
      marketWeek(t, rngOf(t));
      return t;
    };
    const a = mk(false), b = mk(true);
    expect(b.releases.rcov.totalUnits).toBeGreaterThan(0);
    expect(b.labels[lb.id].cash).toBeGreaterThan(a.labels[lb.id].cash); // selo original recebe a parte da editora
    expect(b.acts[act.id].cash).toBeLessThanOrEqual(a.acts[act.id].cash); // o ato que gravou não fica com a edição alheia
  });
});

describe('r21 E-11 — cancelar lançamento devolve a capa', () => {
  it('prensagem + marketing + capa voltam ao caixa', () => {
    const { s, r, act } = withAct('r21e-11');
    const songs = composeSongs(s, r, act, 1);
    recordSongs(s, r, act, [songs[0].id], 1, 'balanced');
    const cash = s.player.cash;
    const pr = scheduleRelease(s, r, { actId: act.id, type: 'single', songs: [songs[0].id], formats: ['lp'], press: 1000, marketing: [{ channel: 'press', budget: 50000 }], territories: s.player.territories, weeksAhead: 2, cover: { style: 'illustrated', seed: 7 } });
    expect('id' in pr).toBe(true);
    if (!('id' in pr)) return;
    expect(cash - s.player.cash).toBeGreaterThan(50000 + 1); // inclui a capa
    cancelRelease(s, pr.id);
    expect(s.player.cash).toBe(cash);
    invariant(s);
  });
});
