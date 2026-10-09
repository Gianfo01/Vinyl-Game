// Rodada 14 — base de dados: mais artistas reais (todas as épocas/regiões) e "Tamanho da base de dados".

import { describe, expect, it } from 'vitest';
import { GENRES, CITIES } from '../src/data/world';
import { REAL_MORE } from '../src/data/realacts_more14';
import { REAL_ALL } from '../src/sim/sys/realworld';
import { DB_SIZES, realAllowed } from '../src/sim/dbsize14';
import { defaultConfig, simulate } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { realCount } from '../src/ui/newgame14db';

const mk = (dbSize: 'small' | 'medium' | 'large' | 'huge', year = 2005, seed = 'r14db') => createGame(defaultConfig(seed, { startYear: year, realNames: true, dbSize }));
const count = (s: ReturnType<typeof mk>) => Object.keys(s.acts).length;

describe('base de dados r14', () => {
  it('lote novo é consistente: ids válidos, cobre décadas, países e continentes, sem futuro', () => {
    const g = new Set(GENRES.map((x) => x.id)), c = new Set(CITIES.map((x) => x.id));
    expect(REAL_MORE.length).toBeGreaterThan(350);
    const names = new Set<string>();
    for (const a of REAL_MORE) {
      expect(g.has(a.g), a.n + ' gênero').toBe(true);
      expect(c.has(a.c), a.n + ' cidade').toBe(true);
      expect(names.has(a.n.toLowerCase()), 'duplicado ' + a.n).toBe(false);
      names.add(a.n.toLowerCase());
      expect(a.z).toBe(a.t);
      expect(a.d).toBeGreaterThanOrEqual(1920);
      expect(a.d).toBeLessThanOrEqual(2023);
      if (a.e) expect(a.e).toBeGreaterThanOrEqual(a.d);
      if (a.x && a.b) expect(a.x).toBeGreaterThan(a.b + 15);
      for (const r of a.al ?? []) { expect(r[1]).toBeGreaterThanOrEqual(a.d - 1); expect(r[1]).toBeLessThanOrEqual(a.x ?? 2024); }
      for (const m of a.m ?? []) if (m[2] && m[3]) expect(m[3]).toBeGreaterThan(m[2]);
    }
    const decades = new Set(REAL_MORE.map((a) => Math.floor(a.d / 10) * 10));
    for (const d of [1920, 1950, 1960, 1970, 1980, 1990, 2000, 2010]) expect(decades.has(d), 'década ' + d).toBe(true);
    const cn = new Set(REAL_MORE.map((a) => a.cn));
    for (const k of ['BRA', 'MEX', 'ARG', 'COL', 'FRA', 'DEU', 'JPN', 'KOR', 'IND', 'NGA', 'ZAF', 'EGY', 'AUS']) expect(cn.has(k), k).toBe(true);
    // índices antigos continuam estáveis: o lote novo só vem no fim
    const i0 = REAL_ALL.indexOf(REAL_MORE[0]); // r16: formações vêm depois do lote r14
    expect(i0).toBeGreaterThan(0);
    expect(REAL_ALL[i0 + REAL_MORE.length - 1]).toBe(REAL_MORE[REAL_MORE.length - 1]);
  });

  it('tamanhos crescem: pequeno < médio < grande < enorme (reais e total de atos)', () => {
    const r = DB_SIZES.map((d) => realCount(d.id));
    expect(r[0]).toBeLessThan(r[1]); expect(r[1]).toBeLessThan(r[2]); expect(r[2]).toBeLessThan(r[3]);
    expect(r[3]).toBeGreaterThan(1000);
    const n = (['small', 'medium', 'large', 'huge'] as const).map((k) => count(mk(k)));
    expect(n[0]).toBeLessThan(n[1]); expect(n[1]).toBeLessThan(n[2]); expect(n[2]).toBeLessThan(n[3]);
    expect(realAllowed({ dbSize: 'small' }, REAL_MORE.find((a) => a.t === 1)!)).toBe(false);
    expect(realAllowed({ dbSize: 'huge' }, REAL_MORE[0])).toBe(true);
  });

  it('médio mantém o comportamento anterior (mesma semente: nada de gerados extras)', () => {
    const a = mk('medium'), b = createGame(defaultConfig('r14db', { startYear: 2005, realNames: true }));
    expect(count(a)).toBe(count(b));
  });

  it('artistas do lote novo só existem a partir do ano real (nada do futuro)', () => {
    const s = mk('huge', 1975);
    for (const a of Object.values(s.acts)) if (a.catalogNo && a.catalogNo >= 1000) expect(REAL_ALL[a.catalogNo - 1000].d, a.name).toBeLessThanOrEqual(1975 + 3);
    const names = Object.values(s.acts).map((a) => a.name);
    expect(names).not.toContain('Billie Eilish');
  });

  it('enorme: criar o jogo < 3s e avançar meses continua rápido', () => {
    const t0 = Date.now();
    const s = mk('huge', 2010, 'r14perf');
    const created = Date.now() - t0;
    expect(created).toBeLessThan(3000);
    const t1 = Date.now();
    const { state } = simulate(defaultConfig('r14perf', { startYear: 2010, realNames: true, dbSize: 'huge' }), 1);
    const perMonth = (Date.now() - t1) / 12;
    console.log(`huge: acts=${count(s)} criar=${created}ms simulate(1 ano)/mês=${perMonth.toFixed(0)}ms`);
    expect(perMonth).toBeLessThan(1500);
    expect(Object.keys(state.acts).length).toBeGreaterThan(count(mk('small', 2010)));
  }, 60000);
});
