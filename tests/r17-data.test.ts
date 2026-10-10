// Rodada 17 (E) — dados reais: população por década, relevância cultural (exceções globais e hit viral),
// gêneros em alta = estilos das paradas, mais artistas/visuais reais, relíquias reais com datas, épocas e cenas.
import { describe, expect, it } from 'vitest';
import { COUNTRY_INFO, countryInfoByA3, countryMarketSize, countryPop } from '../src/data/countries';
import { COVERS17, ERAS17, SCENES17 } from '../src/data/heritage17';
import { LOOKS17 } from '../src/data/looks17';
import { REAL_17 } from '../src/data/more17';
import { REAL_ACTS } from '../src/data/realnames';
import { GLOBAL17, globalOf17 } from '../src/data/relevance17';
import { softPower } from '../src/data/relevance';
import { realLook15 } from '../src/data/looks15';
import { CITIES, GENRES } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { DB_SIZES } from '../src/sim/dbsize14';
import { RELICS17, realRelics17, relic9Of17 } from '../src/sim/relics17';
import { sampleSuitChance17 } from '../src/sim/sys/heritage17';
import { ch7 } from '../src/sim/sys/charts7';
import { reach17 } from '../src/sim/sys/reach17';
import { reachHook17 } from '../src/sim/sys/reachhook17';
import { REAL_ALL } from '../src/sim/sys/realworld';
import { norm17 } from '../src/sim/sys/realidx17';
import { chartShare17, hotList17 } from '../src/sim/sys/trends17';
import { runSimHooks } from '../src/sim/ext4';
import { advanceMonth } from '../src/sim/tick';
import type { GameState } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';
import { Rng } from '../src/core/rng';
import { realCount } from '../src/ui/newgame14db';

const runTo = (s: GameState, y: number, m = 0) => { while ((s.year < y || (s.year === y && s.month < m)) && !s.ended) { s.player.cash = Math.max(s.player.cash, 1e9); advanceMonth(s); } };
const ALL = new Set([...REAL_ALL.map((a) => norm17(a.n)), ...Object.values(REAL_ACTS).map((a) => norm17(a.name))]);

describe('r17 dados reais', () => {
  it('população por década e mercado: EUA dominante, China não engole o mundo', () => {
    const c = (a3: string) => countryInfoByA3[a3];
    expect(Math.round(countryPop(c('USA'), 2020))).toBe(331);
    expect(Math.round(countryPop(c('IND'), 1950))).toBe(357);
    expect(Math.round(countryPop(c('BRA'), 1970))).toBe(93);
    for (const x of COUNTRY_INFO) for (let y = 1920; y <= 2040; y += 10) expect(countryPop(x, y), x.a3).toBeGreaterThan(0);
    const m = (a3: string, y: number) => countryMarketSize(c(a3), y);
    expect(m('USA', 2020)).toBeGreaterThan(m('JPN', 2020));
    expect(m('JPN', 2020)).toBeGreaterThan(m('CHN', 2020));
    expect(m('GBR', 2010)).toBeGreaterThan(m('CHN', 2010));
    expect(m('JPN', 1990)).toBeGreaterThan(m('IND', 1990) * 3);
  });

  it('exceções globais: Shakira/BTS viajam, Gangnam Style só no seu tempo; nomes existem no banco', () => {
    expect(globalOf17('Shakira', 2005).v).toBeGreaterThan(softPower('COL', 2005));
    expect(globalOf17('PSY', 2012).v).toBe(1);
    expect(globalOf17('PSY', 2016).v).toBe(0);
    expect(globalOf17('BTS', 2010).v).toBe(0);
    const miss = GLOBAL17.map((g) => g[0]).filter((n) => !ALL.has(norm17(n)));
    expect(miss, miss.join(', ')).toEqual([]);
  });

  it('lote novo de artistas e visuais: válido, sem duplicar, no fim de REAL_ALL; base de dados cresce', () => {
    const g = new Set(GENRES.map((x) => x.id)), ci = new Set(CITIES.map((x) => x.id));
    for (const a of REAL_17) {
      expect(g.has(a.g), a.n).toBe(true); expect(ci.has(a.c), a.n).toBe(true);
      expect(a.d).toBeGreaterThanOrEqual(1920); expect(a.d).toBeLessThanOrEqual(2023);
      if (a.x && a.b) expect(a.x).toBeGreaterThan(a.b + 15);
      for (const m of a.m ?? []) { expect(m[1], `${a.n}/${m[0]}`).toBeTruthy(); if (m[3]) expect(m[3]).toBeGreaterThan(m[2] ?? 0); }
    }
    const tail = REAL_ALL.slice(-20).map((a) => a.n);
    expect(tail).toContain('Jeff Buckley');
    expect(REAL_ALL.filter((a) => a.n === 'Luis Fonsi').length).toBe(1);
    const r = DB_SIZES.map((d) => realCount(d.id));
    expect(r[0]).toBeLessThan(r[1]); expect(r[2]).toBeLessThan(r[3]);
    expect(Object.keys(LOOKS17).length).toBeGreaterThan(250);
    for (const n of Object.keys(LOOKS17)) expect(realLook15(n, 1990), n).not.toBeNull();
    expect(realLook15('Jimi Hendrix', 1969)?.hair).toBe(6); // looks15 não é sobrescrito
  });

  it('épocas, relíquias e covers apontam para artistas reais do banco', () => {
    const miss = [...ERAS17.flatMap((e) => e[1]), ...RELICS17.map((r) => r.owner), ...COVERS17.flatMap((c) => [c[4], c[5]]).filter(Boolean)].filter((n) => !ALL.has(norm17(n)));
    expect(miss, miss.join(', ')).toEqual([]);
    for (const x of SCENES17) expect(CITIES.some((c) => c.id === x[1]) && GENRES.some((gg) => gg.id === x[2]), x[0]).toBe(true);
    for (const r of RELICS17) for (const st of r.steps ?? []) expect(st[0] * 12 + st[1]).toBeGreaterThanOrEqual(r.year * 12 + r.month);
  });

  it('relíquias reais só aparecem depois do fato e seguem a história (com nomes reais)', () => {
    const s = createGame(defaultConfig('r17rel', { startYear: 1966, realNames: true, history: 'strict', mode: 'historic', realFates: true }));
    runTo(s, 1966, 2);
    expect(relic9Of17(s, 'my_happiness')).toBeTruthy(); // 1953: já aconteceu
    expect(relic9Of17(s, 'woodstock_strat')).toBeUndefined(); // 1969: futuro
    expect(relic9Of17(s, 'lennon_j160e')?.st).toBe('stolen'); // sumiu em 1963
    runTo(s, 1969, 9);
    expect(relic9Of17(s, 'woodstock_strat')).toBeTruthy();
    expect(realRelics17(s).every((r) => r.year <= s.year)).toBe(true);
    // r18: história alternativa — relíquias reais posteriores ao início não nascem pelo roteiro
    const alt = createGame(defaultConfig('r17rel', { startYear: 1969, realNames: true, history: 'loose' }));
    runTo(alt, 1969, 9);
    expect(relic9Of17(alt, 'my_happiness')).toBeTruthy();
    expect(relic9Of17(alt, 'woodstock_strat')).toBeUndefined();
    const f = createGame(defaultConfig('r17rel', { startYear: 1966, realNames: false }));
    runTo(f, 1966, 2);
    expect(relic9Of17(f, 'my_happiness')).toBeUndefined();
  }, 240000);

  it('gêneros em alta saem das paradas e hit viral global dá alcance de astro americano', () => {
    const s = createGame(defaultConfig('r17trend', { startYear: 1995 }));
    runTo(s, 1996, 6);
    const { share } = chartShare17(s);
    const top = Object.entries(share).sort((a, b) => b[1] - a[1])[0]?.[0];
    const hot = hotList17(s, 5);
    expect(hot[0]?.g).toBe(top);
    const median = [...Object.values(s.genrePop)].sort((a, b) => a - b)[Math.floor(Object.keys(s.genrePop).length / 2)];
    expect(s.genrePop[top!]).toBeGreaterThan(median);
    // hit viral: um ato de país de pouco peso no topo de 5 países
    const act = Object.values(s.acts).find((a) => a.city === 'seoul' || a.city === 'sao_paulo')!;
    const rel = Object.values(s.releases).find((r) => r.actId === act.id) ?? Object.values(s.releases)[0];
    rel.actId = act.id;
    const c = ch7(s);
    for (const a3 of ['USA', 'GBR', 'FRA', 'DEU', 'ESP']) (c.no1[a3] ??= []).push({ week: s.week, relId: rel.id, title: rel.title, act: act.name });
    runSimHooks('month', s, Rng.fromSeed('t'), {});
    expect(reach17(s).viral[act.id]).toBeTruthy();
    expect(reachHook17.f(s, act)).toBeGreaterThan(0.9);
    expect(sampleSuitChance17({ ...s, year: 1995 } as GameState, false)).toBeGreaterThan(sampleSuitChance17({ ...s, year: 1985 } as GameState, false) * 3);
  });
});
