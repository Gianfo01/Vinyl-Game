// Revisão 21 — D (mercado, paradas e mídia): impulso pós-lançamento real (D-1), série semanal com zeros (D-2),
// previsão com os tetos do mercado (D-3) e fãs por região que fecham o total (D-7).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { applyMods } from '../src/sim/ext4';
import { fanTotal19, fansByRegion19 } from '../src/sim/fandom19';
import { forecastUnits, marketWeek, maxShare, weeklyPool } from '../src/sim/market';
import { addBoost21, b21 } from '../src/sim/sys/boost21';
import '../src/sim/sys';
import type { Act, GameState, Release } from '../src/sim/types';
import { rngOf } from '../src/sim/util';
import { noteRelease17 } from '../src/sim/relidx17';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';

const game = (seed: string, y = 1985): GameState => createGame(defaultConfig(seed, { startYear: y }));
const myAct = (s: GameState, fame = 30): Act => { const a = spawnProceduralAct(s, rngOf(s), { city: s.config.homeCity, fame }); a.owner = 'player'; return a; };
let n = 0;
const rel = (s: GameState, a: Act, o: Partial<Release> = {}): Release => {
  const r: Release = { id: `r21d${++n}`, actId: a.id, owner: 'player', type: 'single', title: `Disco ${n}`, songs: [], week: s.week, year: s.year, q: 60, appeal: 1,
    formats: [], stock: 0, pressed: 0, marketing: [], marketingE: 0, territories: ['na'], weekly: [], totalUnits: 0, revenue: 0, peak: 999, weeksOnChart: 0, lastPos: 0, coverSeed: 1, shortage: 0, live: true, ...o };
  s.releases[r.id] = r; a.releases.push(r.id); noteRelease17(s, r);
  return r;
};

describe('r21 D-1 — boost21: impulso pós-lançamento com janela', () => {
  it('multiplica as unidades enquanto a janela dura e fica na autópsia', () => {
    const s = game('r21d-b');
    const a = myAct(s);
    const r = rel(s, a, { week: s.week - 30 });
    const why = { pt: 'Vitrine de teste', en: 'Test showcase' };
    addBoost21(s, r, 1.3, 4, why);
    expect(b21(s)[r.id]).toHaveLength(1);
    const f = applyMods(s, 'chartUnits', 1000, { release: r }).factors.find((x) => x.label.en === why.en);
    expect(f?.ratio).toBeCloseTo(1.3, 5);
    expect(r.autopsy?.some((x) => x.key.startsWith('boost21:') && Math.abs(x.value - 1.3) < 1e-9)).toBe(true);
    // janelas somam (produto) e vencem
    addBoost21(s, r, 1.1, 2, { pt: 'Outra', en: 'Other' });
    const both = applyMods(s, 'chartUnits', 1000, { release: r }).factors.filter((x) => x.label.en === why.en || x.label.en === 'Other');
    expect(both.reduce((t, x) => t * x.ratio, 1)).toBeCloseTo(1.43, 3);
    s.week += 5;
    expect(applyMods(s, 'chartUnits', 1000, { release: r }).factors.some((x) => x.label.en === why.en)).toBe(false);
  });
});

describe('r21 D-2 — rel.weekly registra semanas sem unidades', () => {
  it('lançamento vivo sem apelo ganha zeros (índice = semana)', () => {
    const s = game('r21d-w');
    const a = myAct(s);
    const r = rel(s, a, { appeal: 0 });
    const before = r.totalUnits;
    marketWeek(s, rngOf(s));
    s.week += 1;
    marketWeek(s, rngOf(s));
    expect(r.weekly).toEqual([0, 0]);
    expect(r.totalUnits).toBe(before);
  });
});

describe('r21 D-3 — previsão com os tetos do mercado', () => {
  it('superastro em 2015: a previsão não passa de 10 semanas no teto por lançamento', () => {
    const s = game('r21d-f', 2015);
    const a = myAct(s, 100);
    a.fans = { casual: 50e6, active: 10e6, core: 5e6 }; a.momentum = 100;
    const mk = [{ channel: 'playlists', budget: 500_000_00 }, { channel: 'social', budget: 500_000_00 }, { channel: 'radio_plug', budget: 500_000_00 }];
    const fc = forecastUnits(s, a, 'single', 99, mk, ['na', 'eu', 'br', 'latam', 'asia', 'africa', 'oceania']);
    const cap = 10 * weeklyPool(s) * maxShare(s.year);
    expect(fc.mid).toBeGreaterThan(0);
    expect(fc.mid).toBeLessThanOrEqual(cap);
    expect(fc.lo).toBeLessThanOrEqual(fc.mid);
    expect(fc.hi).toBeGreaterThanOrEqual(fc.mid);
  });
});

describe('r21 D-7 — fãs por região fecham o total', () => {
  it('a soma por mercado é exatamente o total de fãs de cada ato', () => {
    const s = game('r21d-r', 1995);
    let checked = 0;
    for (const a of Object.values(s.acts)) {
      const tot = fanTotal19(a);
      if (tot <= 0) continue;
      const by = fansByRegion19(s, a.id);
      const sum = Object.values(by).reduce((t, x) => t + x, 0);
      if (sum === 0) continue; // sem fama em lugar nenhum: nada a repartir
      expect(sum).toBe(tot);
      checked++;
    }
    expect(checked).toBeGreaterThan(50);
  });
});
