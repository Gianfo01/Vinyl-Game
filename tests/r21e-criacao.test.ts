// Rodada 21e (criação): (1) master da época muda as dimensões (quality18) e a crítica; (2) single de trabalho escolhido
// altera as unidades das primeiras semanas (mod chartUnits); (3) o erro previsão × realizado é acumulado e o analista
// estreita a faixa mostrada.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { applyMods, runSimHooks } from '../src/sim/ext4';
import { launchPending } from '../src/sim/market';
import { reviewRelease } from '../src/sim/media';
import { composeSongs, recordSongs, scheduleRelease } from '../src/sim/production';
import { songProfile } from '../src/sim/repertoire';
import '../src/sim/sys';
import { dir21, forecastBias21, leadMult21 } from '../src/sim/sys/dir21';
import { defaultMaster21, masterOptions21, type Master21 } from '../src/sim/sys/master21';
import { computeDims18 } from '../src/sim/sys/quality18';
import type { GameState } from '../src/sim/types';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';

function withAlbum(seed: string, startYear: number, master?: Master21) {
  const s = createGame(defaultConfig(seed, { startYear }));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  s.player.cash += 5_000_000_00;
  s.player.initialCash += 5_000_000_00;
  const songs = composeSongs(s, r, act, 8);
  recordSongs(s, r, act, songs.map((x) => x.id), 2, 'balanced');
  const res = scheduleRelease(s, r, { actId: act.id, type: 'lp', songs: songs.map((x) => x.id), title: 'Disco', formats: ['lp'], press: 2000, marketing: [], territories: [...s.player.territories], weeksAhead: 1, dir21: master ? { master } : undefined });
  expect('id' in res).toBe(true);
  if (!('id' in res)) throw new Error('schedule');
  const rel = launchPending(s, r, res);
  return { s, r, act, rel, songs };
}

describe('r21e (1) — mixagem e master como decisão', () => {
  it('a janela de decisão depende da era e o padrão é sensato', () => {
    expect(masterOptions21(1962)).toEqual(['mono', 'stereo']);
    expect(masterOptions21(2001)).toEqual(['loud', 'dyn']);
    expect(masterOptions21(2022)).toEqual(['std', 'atmos']);
    expect(masterOptions21(1980)).toEqual([]);
    expect(defaultMaster21(1960)).toBe('mono');
    expect(defaultMaster21(2001)).toBe('loud');
  });
  it('loud × dinâmico (1998): técnica/durabilidade e crítica mudam; quem não decide recebe o padrão', () => {
    const A = withAlbum('r21e-m', 1998, 'loud');
    const B = withAlbum('r21e-m', 1998, 'dyn');
    const C = withAlbum('r21e-m', 1998);
    expect(C.rel.dir21?.master).toBe('loud');
    const da = computeDims18(A.s, A.rel)!, db = computeDims18(B.s, B.rel)!;
    expect(db.v.tech).toBeGreaterThan(da.v.tech);
    expect(db.v.dur).toBeGreaterThan(da.v.dur);
    expect(da.v.imm).toBeGreaterThan(db.v.imm);
    expect(da.parts.tech.some(([w]) => w.pt.includes('Master'))).toBe(true);
    const ca = reviewRelease(A.s, rngOf(A.s), A.rel).reduce((t, x) => t + x.score, 0);
    const cb = reviewRelease(B.s, rngOf(B.s), B.rel).reduce((t, x) => t + x.score, 0);
    expect(cb).toBeGreaterThan(ca);
    // o master alto vende mais na estreia (rádio)
    const ua = applyMods(A.s, 'chartUnits', 10_000, { release: A.rel }).value;
    const ub = applyMods(B.s, 'chartUnits', 10_000, { release: B.rel }).value;
    expect(ua).toBeGreaterThan(ub);
  });
});

describe('r21e (2) — direção do álbum: single de trabalho', () => {
  it('single mais forte que a média rende mais unidades nas primeiras semanas; o mais fraco, menos', () => {
    const { s, rel, songs } = withAlbum('r21e-lead', 1985);
    const score = (id: string) => songProfile(s.songs[id]).hook * 0.5 + s.songs[id].q * 0.5;
    const sorted = [...songs.map((x) => x.id)].sort((a, b) => score(b) - score(a));
    const base = applyMods(s, 'chartUnits', 10_000, { release: rel }).value;
    rel.dir21 = { ...rel.dir21, lead: sorted[0] };
    const strong = applyMods(s, 'chartUnits', 10_000, { release: rel }).value;
    rel.dir21 = { ...rel.dir21, lead: sorted[sorted.length - 1] };
    const weak = applyMods(s, 'chartUnits', 10_000, { release: rel }).value;
    expect(leadMult21(s, { ...rel, dir21: { lead: sorted[0] } }).m).toBeGreaterThan(1);
    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeGreaterThanOrEqual(base);
    // depois de 8 semanas o efeito some
    s.week = rel.week + 20;
    expect(applyMods(s, 'chartUnits', 10_000, { release: { ...rel, dir21: { lead: sorted[0] } } }).factors.some((f) => f.label.pt.includes('single'))).toBe(false);
  });
  it('o single escolhido vira a faixa de trabalho das dimensões (força do single)', () => {
    const { s, rel, songs } = withAlbum('r21e-sgl', 1985);
    const ids = songs.map((x) => x.id);
    const hooks = ids.map((id) => songProfile(s.songs[id]).hook + s.songs[id].q);
    const hi = ids[hooks.indexOf(Math.max(...hooks))], lo = ids[hooks.indexOf(Math.min(...hooks))];
    const a = computeDims18(s, { ...rel, dir21: { lead: hi } })!.v.sgl;
    const b = computeDims18(s, { ...rel, dir21: { lead: lo } })!.v.sgl;
    expect(a).toBeGreaterThan(b);
  });
});

describe('r21e (3) — previsão × realizado', () => {
  it('acumula o erro das vendas e das turnês e o analista estreita a faixa', () => {
    const s: GameState = createGame(defaultConfig('r21e-fc', { startYear: 1990 }));
    const r = rngOf(s);
    const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
    acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
    s.player.cash += 5_000_000_00; s.player.initialCash += 5_000_000_00;
    const songs = composeSongs(s, r, act, 2);
    recordSongs(s, r, act, songs.map((x) => x.id), 1, 'balanced');
    const res = scheduleRelease(s, r, { actId: act.id, type: 'single', songs: [songs[0].id], formats: ['lp'], press: 500, marketing: [], territories: [...s.player.territories], weeksAhead: 1 });
    if (!('id' in res)) throw new Error('schedule');
    const rel = launchPending(s, r, res);
    expect(rel.fc).toBeDefined();
    rel.fc = 2000; rel.fa = 1000; // previu o dobro
    s.week = rel.week + 12;
    s.tours.push({ id: 'tr1', actId: act.id, name: 'T', stops: [], setlist: [], minutes: 45, production: 0, role: 'headline', crew: 1, pay: 'door', costReserved: 0, revenue: 500_00, costs: 0, status: 'done', log: [], accidents: 0, fc21: 400_00 });
    expect(forecastBias21(s, 'sales').n).toBe(0);
    runSimHooks('week', s, r);
    runSimHooks('week', s, r); // sem duplicar
    expect(dir21(s).err.filter((x) => x.k === 'sales').length).toBe(1);
    expect(dir21(s).err.filter((x) => x.k === 'tour').length).toBe(1);
    const b0 = forecastBias21(s, 'sales');
    expect(b0.n).toBe(1);
    expect(b0.bias).toBeCloseTo(1, 2); // superestima em 100 %
    expect(forecastBias21(s, 'tour').bias).toBeCloseTo(-0.2, 2); // subestimou a turnê
    s.player.staff.push({ id: 'an1', name: 'Ana', role: 'analyst', skill: 60, salary: 1, hiredWeek: 0 });
    expect(forecastBias21(s, 'sales').band).toBeLessThan(b0.band);
    // fora da janela de 12 meses o registro não conta
    s.week += 60;
    expect(forecastBias21(s, 'sales').n).toBe(0);
  });
});
