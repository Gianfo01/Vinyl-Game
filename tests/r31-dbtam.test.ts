// R31 · frente DBTAM — bases de artistas divididas pelos tamanhos de base de dados: a estimativa da Nova run bate com o
// mundo gerado; país desligado sai de TODAS as bases (originais, Z, BR, IT, HITS e catálogo clássico), no início e nas
// estreias futuras; os tamanhos crescem de forma monotônica (no total e em cada país); orçamento de tempo por tamanho.

import { describe, expect, it } from 'vitest';
import { defaultConfig, simulate } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { playMonth } from '../src/sim/playbot16';
import { advanceMonth } from '../src/sim/tick';
import { DB_SIZES, realAllowed, realCountry31, type DbSize } from '../src/sim/dbsize14';
import { cast31, countries31 } from '../src/sim/dbcast31';
import { BASE31_FROM, BASE31BR_FROM, BASE31BR_TO, BASE31IT_FROM, BASE31IT_TO, BASE31H_FROM, BASE31H_TO, REAL_ALL, REAL_BASE, rw } from '../src/sim/sys/realworld';
import { countryOfCity } from '../src/data/geo';
import type { GameState, RunConfig } from '../src/sim/types';

const SIZES = DB_SIZES.map((d) => d.id);
const mk = (dbSize: DbSize, startYear: number, extra: Partial<RunConfig> = {}, seed = 'dbtam') =>
  createGame(defaultConfig(seed, { startYear, realNames: true, dbSize, ...extra }));
const realActs = (s: GameState) => Object.values(s.acts).filter((a) => (a.catalogNo ?? 0) >= REAL_BASE);
const group = (i: number) => (i >= BASE31H_FROM && i < BASE31H_TO ? 'HITS' : i >= BASE31IT_FROM && i < BASE31IT_TO ? 'IT' : i >= BASE31BR_FROM && i < BASE31BR_TO ? 'BR' : i >= BASE31_FROM ? 'Z' : 'orig');
/** país de cada ato real do mundo (listas) e do catálogo clássico (cidade do arquétipo) */
const countryOfAct = (a: GameState['acts'][string]): string => (a.catalogNo! >= REAL_BASE ? realCountry31(REAL_ALL[a.catalogNo! - REAL_BASE]) : countryOfCity(a.city) ?? '');

describe('r31 DBTAM · tamanhos', () => {
  it('cada ato das bases novas tem tamanho; cada base tem núcleo na Média e cauda na Enorme', () => {
    const z: Record<string, number[]> = {};
    for (let i = BASE31BR_FROM; i < BASE31H_TO; i++) {
      const a = REAL_ALL[i];
      expect([1, 2, 3], a.n).toContain(a.z);
      (z[group(i)] ??= [0, 0, 0, 0])[a.z!]++;
    }
    for (const g of ['BR', 'IT', 'HITS']) { expect(z[g][1], g).toBeGreaterThan(30); expect(z[g][3], g).toBeGreaterThan(30); }
  });

  it('crescem de forma monotônica: no total, por base e em cada país', () => {
    const n = SIZES.map((d) => REAL_ALL.filter((a) => realAllowed({ dbSize: d }, a)).length);
    for (let k = 1; k < n.length; k++) expect(n[k]).toBeGreaterThan(n[k - 1]);
    for (const g of ['orig', 'Z', 'BR', 'IT', 'HITS']) {
      const c = SIZES.map((d) => REAL_ALL.filter((a, i) => group(i) === g && realAllowed({ dbSize: d }, a)).length);
      for (let k = 1; k < c.length; k++) expect(c[k], g).toBeGreaterThanOrEqual(c[k - 1]);
    }
    const by = SIZES.map((d) => new Map(countries31({ dbSize: d, realNames: true }).map((x) => [x.a3, x.n])));
    for (let k = 1; k < by.length; k++) for (const [a3, v] of by[k - 1]) expect(by[k].get(a3) ?? 0, a3).toBeGreaterThanOrEqual(v);
    // o cartão de países muda com o tamanho (Brasil e Itália crescem da Média para a Enorme)
    expect(by[3].get('BRA')!).toBeGreaterThan(by[1].get('BRA')! + 100);
    expect(by[3].get('ITA')!).toBeGreaterThan(by[1].get('ITA')! + 100);
  });

  it('desligando as chaves base31.* nenhum ato de BR/IT/HITS entra (mundo de antes das bases)', () => {
    const s = mk('medium', 1990, { base31br: false, base31it: false, base31hits: false });
    const idx = [...realActs(s).map((a) => a.catalogNo! - REAL_BASE), ...rw(s).upcoming];
    expect(idx.some((i) => ['BR', 'IT', 'HITS'].includes(group(i)))).toBe(false);
    const on = mk('medium', 1990);
    const idx2 = [...realActs(on).map((a) => a.catalogNo! - REAL_BASE), ...rw(on).upcoming];
    for (const g of ['BR', 'IT', 'HITS']) expect(idx2.some((i) => group(i) === g), g).toBe(true);
  });
});

describe('r31 DBTAM · estimativa da Nova run × mundo gerado', () => {
  const CASES: [DbSize, number, string[] | undefined][] = [
    ['small', 2030, undefined], ['medium', 1925, undefined], ['medium', 1975, ['BRA']], ['medium', 2012, undefined],
    ['large', 2012, ['USA']], ['huge', 1975, ['ITA']], ['huge', 2030, ['GBR']],
  ];
  for (const [size, y, off] of CASES) it(`${size} ${y}${off ? ' sem ' + off[0] : ''}: total ±5%, reais ±6%`, () => {
    const s = mk(size, y, off ? { realOff31: off } : {});
    const e = cast31(s.config, y);
    const all = Object.values(s.acts);
    const real = all.filter((a) => a.catalogNo).length;
    expect(Math.abs(e.acts - all.length) / all.length).toBeLessThan(0.05);
    expect(Math.abs(e.real - real) / real).toBeLessThan(0.06);
  }, 30000);
});

describe('r31 DBTAM · países desligados saem de todas as bases', () => {
  // Brasil, Itália, EUA e Reino Unido, um de cada vez, na Enorme (todas as bases) em 1990: nem no início, nem na fila de estreia
  for (const off of ['BRA', 'ITA', 'USA', 'GBR']) it(`sem ${off}`, () => {
    const s = mk('huge', 1990, { realOff31: [off] });
    expect(Object.values(s.acts).filter((a) => a.catalogNo && countryOfAct(a) === off).map((a) => a.name)).toEqual([]);
    expect(rw(s).upcoming.filter((i) => realCountry31(REAL_ALL[i]) === off)).toEqual([]);
    expect(s.upcoming.filter((u) => countryOfCity(u.city) === off)).toEqual([]);
    // com o país ligado ele existe (no mundo ou na fila) em todas as bases que o têm
    const on = mk('huge', 1990);
    const has = (st: GameState) => new Set([...realActs(st).map((a) => a.catalogNo! - REAL_BASE), ...rw(st).upcoming].filter((i) => realCountry31(REAL_ALL[i]) === off).map(group));
    const gOn = has(on), gOff = has(s);
    expect(gOn.size).toBeGreaterThanOrEqual(2);
    expect(gOff.size).toBe(0);
  }, 60000);

  it('estreias futuras também respeitam o filtro (dois anos depois, sem Brasil)', () => {
    const { state } = simulate(defaultConfig('dbtam-f', { startYear: 1990, realNames: true, dbSize: 'medium', realOff31: ['BRA'] }), 2);
    const br = Object.values(state.acts).filter((a) => a.catalogNo && countryOfAct(a) === 'BRA');
    expect(br.map((a) => a.name)).toEqual([]);
  }, 120000);

  it('"Desligar todos": nenhum artista real; "Ligar todos" (lista vazia) = mundo de sempre', () => {
    const all = countries31({ dbSize: 'medium', realNames: true }).map((x) => x.a3);
    const s = mk('medium', 1975, { realOff31: all });
    expect(Object.values(s.acts).filter((a) => a.catalogNo).map((a) => a.name)).toEqual([]);
    expect(rw(s).upcoming.length + s.upcoming.length).toBe(0);
    const a = mk('medium', 1975), b = mk('medium', 1975, { realOff31: [] });
    expect(Object.keys(b.acts).length).toBe(Object.keys(a.acts).length);
  }, 60000);
});

describe('r31 DBTAM · orçamento de tempo por tamanho (2012, criar + 2 meses)', () => {
  // tetos com folga para máquinas lentas (medidos em docs/r31/dbtam.md: Média ~1,5 s/mês, Enorme ~3 s/mês)
  const CEIL: Partial<Record<DbSize, number>> = { medium: 3000, huge: 5000 };
  for (const [size, ceil] of Object.entries(CEIL) as [DbSize, number][]) it(`${size}: < ${ceil} ms/mês`, () => {
    const t0 = performance.now();
    const s = createGame(defaultConfig('dbtam-t', { startYear: 2012, role: 'label', dbSize: size }));
    const t1 = performance.now();
    for (let m = 0; m < 2; m++) { playMonth(s); advanceMonth(s); }
    const per = (performance.now() - t1) / 2;
    console.log(`${size} 2012: criar ${(t1 - t0).toFixed(0)} ms, ${per.toFixed(0)} ms/mês`);
    expect(per).toBeLessThan(ceil);
  }, 180000);
});
