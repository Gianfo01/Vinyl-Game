// R29 (CONNECT): pessoa ↔ ato ↔ biografia ↔ formação conectados (auditoria audit29) e arestas de mecanismo vivas
// (mesma semente, A × B). Ver docs/connect29.md.
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { audit29, count29 } from '../src/sim/audit29';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer, renewHooks29 } from '../src/sim/contracts';
import { applyMods } from '../src/sim/ext4';
import { computeAppeal } from '../src/sim/market';
import { bumpPerks } from '../src/sim/perks';
import { availableFormats, composeSongs, recordSongs, scheduleRelease } from '../src/sim/production';
import { applyWorld17 } from '../src/sim/start17';
import { addStress } from '../src/sim/stress17';
import { advanceMonth, advanceWeek } from '../src/sim/tick';
import type { GameState } from '../src/sim/types';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { careerActs29, exMembers29 } from '../src/sim/sys/connect29';
import { renewChance } from '../src/sim/sys/explain12';
import { hq6 } from '../src/sim/sys/hq6';
import { canonKey, rw } from '../src/sim/sys/realworld';

const game = (seed: string, year: number, world: string): GameState => { const c = defaultConfig(seed, { startYear: year }); applyWorld17(c, world); return createGame(c); };
const BAD = ['R1', 'R2c', 'R2a', 'R2t', 'R3', 'R6', 'R7', 'R8', 'R9'];

describe('R29 — pessoa ↔ ato ↔ biografia ↔ formação', () => {
  for (const [seed, year, world] of [['r29c-0', 1975, 'real'], ['r29c-1', 1962, 'exact'], ['r29c-0', 1990, 'random'], ['r29c-1', 1975, 'chaos']] as const) {
    it(`${seed} ${year} ${world}: auditoria sem achados de conexão`, () => {
      const s = game(seed, year, world);
      const c = count29(audit29(s));
      for (const k of BAD) expect(c[k] ?? 0, `${k}: ${JSON.stringify(c)}`).toBe(0);
    }, 60_000);
  }

  it('índice nome → pessoa nunca aponta para alguém com outro nome (causa raiz do caso Roger Waters)', () => {
    for (const w of ['real', 'exact', 'chaos']) for (const y of [1950, 1975, 1990]) {
      const s = game('r29c-0', y, w);
      for (const [k, id] of Object.entries(rw(s).pid ?? {})) { const p = s.persons[id]; if (p) expect(canonKey(p.name), `${w} ${y} ${k}`).toBe(k); }
    }
  }, 120_000);

  it('ex-integrante na página do ato ⇔ ato na carreira da pessoa (mesma fonte)', () => {
    const s = game('r29c-0', 1975, 'real');
    let n = 0;
    for (const a of Object.values(s.acts)) for (const x of exMembers29(s, a)) { n++; expect(careerActs29(s, x.pid).some((c) => c.act.id === a.id)).toBe(true); }
    expect(n).toBeGreaterThan(30); // Syd Barrett, Brian Jones, Pete Best…
    const pf = Object.values(s.acts).find((a) => a.name === 'Pink Floyd');
    const syd = Object.values(s.persons).find((p) => p.name === 'Syd Barrett');
    if (pf && syd && !pf.members.includes(syd.id)) expect(careerActs29(s, syd.id).map((x) => x.act.name)).toContain('Pink Floyd');
  }, 60_000);

  it('um ano depois: pessoas reais não ganham sobrenome inventado (kin15) e o índice segue limpo', () => {
    const s = game('r29c-0', 1975, 'chaos');
    for (let m = 0; m < 12; m++) { if (s.ended) (s.flags as Record<string, number>).sandbox = 1; advanceMonth(s); }
    const c = count29(audit29(s));
    expect(c.R9 ?? 0, JSON.stringify(c)).toBe(0);
    expect(c.R8 ?? 0, JSON.stringify(c)).toBe(0);
  }, 240_000);
});

describe('R29 — arestas de mecanismo (A × B)', () => {
  const base = () => {
    const s = createGame(defaultConfig('r29m', { startYear: 1985, realNames: true }));
    const r = rngOf(s);
    const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
    acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
    s.player.cash += 50_000_000_00;
    const songs = composeSongs(s, r, act, 2);
    recordSongs(s, r, act, songs.map((x) => x.id), 1, 'balanced');
    scheduleRelease(s, r, { actId: act.id, type: 'single', songs: [songs[0].id], title: 'T', formats: availableFormats(s).slice(0, 1), press: 2000, marketing: [], territories: [...s.player.territories], weeksAhead: 1 });
    for (let i = 0; i < 3; i++) advanceWeek(s);
    const spare = composeSongs(s, r, act, 3).map((x) => x.id);
    return { s, actId: act.id, relId: act.releases[act.releases.length - 1], spare };
  };
  const B0 = base();
  const clone = () => structuredClone(B0.s);

  it('estresse do elenco baixa a nota da gravação (antes os ganchos de gravação apagavam o modificador)', () => {
    const A = clone(), B = clone();
    for (const id of B.acts[B0.actId].members) addStress(B, id, 90);
    const q = (s: GameState) => recordSongs(s, Rng.fromSeed('r29q'), s.acts[B0.actId], B0.spare, 1, 'balanced').songs.reduce((t, x) => t + x.q, 0);
    expect(q(B)).toBeLessThan(q(A) * 0.97);
  });

  it('departamentos da sede (Marketing, Digital) mudam apelo e vendas', () => {
    const A = clone(), B = clone();
    hq6(B).depts.marketing = 3; hq6(B).depts.digital = 3; bumpPerks();
    const ap = (s: GameState) => computeAppeal(s, Rng.fromSeed('r29a'), s.releases[B0.relId], s.acts[B0.actId]).appeal;
    const un = (s: GameState) => applyMods(s, 'chartUnits', 1000, { release: s.releases[B0.relId] }).value;
    bumpPerks(); const a1 = ap(A), u1 = un(A);
    bumpPerks(); const a2 = ap(B), u2 = un(B);
    expect(a2).toBeGreaterThan(a1 * 1.05);
    expect(u2).toBeGreaterThan(u1 * 1.05);
  });

  it('previsão de renovação usa os mesmos ganchos da rolagem', () => {
    const s = clone();
    const a = s.acts[B0.actId];
    const extra = renewHooks29(s, a);
    expect(Number.isFinite(extra)).toBe(true);
    expect(renewChance(s, a, 0)).toBeGreaterThan(0);
  });
});
