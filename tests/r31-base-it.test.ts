// R31 · onda 4 (BASE-IT) — base italiana: todo ato com fonte, gênero e cidade válidos, anos coerentes, sem duplicata com
// a base anterior, nomes reais registrados, contagem mínima, e o interruptor base31.it (desligado = mundo de antes).
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { BASE31_IT, IT31, itSources31 } from '../src/data/base31it';
import { CUR31, slug31 } from '../src/data/cur31';
import { REALNAMES31 } from '../src/data/realnames31';
import { REAL_ACTS } from '../src/data/realnames';
import { CITIES, genreById } from '../src/data/world';
import { BASE31IT_FROM, BASE31IT_TO, REAL_ALL, dedupKey27 } from '../src/sim/sys/realworld';
import { sw } from '../src/sim/r31/switches';
import type { GameState } from '../src/sim/types';

const IT_CITIES = new Set(['milan', 'rome', 'naples']);
/** Contagem mínima da base nova (o máximo que deu com dados conferidos — docs/r31/base-it.md). */
const MIN31IT = 280;
const NOW = 2026;

describe('base italiana: dados', () => {
  it('contagem mínima e todos entram no fim de REAL_ALL', () => {
    expect(BASE31_IT.length).toBeGreaterThanOrEqual(MIN31IT);
    expect(BASE31IT_TO - BASE31IT_FROM).toBe(BASE31_IT.length);
    expect(REAL_ALL.slice(BASE31IT_FROM, BASE31IT_TO)).toEqual(BASE31_IT);
    expect(REAL_ALL.filter((a) => a.cn === 'ITA').length).toBeGreaterThanOrEqual(205 + MIN31IT);
  });
  it('todo ato tem fonte, gênero e cidade válidos, país Itália, obra marcante', () => {
    for (const x of IT31) {
      const a = x.a;
      expect(itSources31(x).length, a.n).toBeGreaterThanOrEqual(2);
      expect(genreById[a.g], `${a.n}: gênero ${a.g}`).toBeDefined();
      expect(CITIES.some((c) => c.id === a.c), a.n).toBe(true);
      expect(IT_CITIES.has(a.c), a.n).toBe(true);
      expect(a.cn, a.n).toBe('ITA');
      expect(a.al?.length ?? 0, a.n).toBeGreaterThanOrEqual(1);
      expect(a.al!.length, a.n).toBeLessThanOrEqual(4);
      expect(genreById[a.g].born, `${a.n}: estreia antes do gênero`).toBeLessThanOrEqual(a.d + 6);
    }
  });
  it('anos coerentes: estreia ≤ obra ≤ fim; nascimento/morte; integrantes vivos e crescidos na estreia', () => {
    const bad: string[] = [];
    for (const a of BASE31_IT) {
      if (a.d < 1889 || a.d > NOW) bad.push(`${a.n}: estreia ${a.d}`);
      if (a.e !== undefined && a.e < a.d) bad.push(`${a.n}: fim antes da estreia`);
      for (const [t, y] of a.al ?? []) {
        if (y < a.d) bad.push(`${a.n}: "${t}" (${y}) antes da estreia ${a.d}`);
        if (a.e !== undefined && y > a.e) bad.push(`${a.n}: "${t}" (${y}) depois do fim ${a.e}`);
        if (y > NOW) bad.push(`${a.n}: "${t}" no futuro`);
      }
      if (a.b !== undefined && a.d - a.b < 12) bad.push(`${a.n}: estreia aos ${a.d - a.b}`);
      if (a.x !== undefined && (a.x < a.d || (a.b !== undefined && a.x <= a.b))) bad.push(`${a.n}: morte`);
      for (const m of a.m ?? []) {
        const join = m[4] ?? a.d;
        if (m[2] !== undefined && join - m[2] < 12) bad.push(`${a.n}/${m[0]}: entra aos ${join - m[2]}`);
        if (m[3] !== undefined && m[3] < join) bad.push(`${a.n}/${m[0]}: morto antes de entrar`);
        if (m[5] !== undefined && m[5] < join) bad.push(`${a.n}/${m[0]}: sai antes de entrar`);
      }
    }
    expect(bad).toEqual([]);
  });
  it('sem duplicata: nem entre si nem com o que já existia (dedupKey27)', () => {
    const before = new Set([...REAL_ALL.slice(0, BASE31IT_FROM).map((a) => dedupKey27(a.n)), ...Object.values(REAL_ACTS).map((a) => dedupKey27(a.name))]);
    const mine = BASE31_IT.map((a) => dedupKey27(a.n));
    expect(new Set(mine).size).toBe(mine.length);
    expect(BASE31_IT.filter((a) => before.has(dedupKey27(a.n))).map((a) => a.n)).toEqual([]);
  });
  it('curadoria em CUR31 e nome real registrado (espaço cur)', () => {
    for (const a of BASE31_IT) {
      const id = slug31(a.n);
      const c = CUR31.find((x) => x.id === id);
      expect(c, a.n).toBeDefined();
      expect(c!.ref, a.n).toBe(`base31it:${a.n}`);
      expect(c!.lingua).toBe('it');
      const r = REALNAMES31[`cur:${id}`];
      expect(r, a.n).toBeDefined();
      expect(r.real).toBe(a.n);
      expect(r.substituto).not.toBe(a.n);
    }
  });
});

const itActs = (s: GameState) => Object.values(s.acts).filter((a) => a.catalogNo !== undefined && a.catalogNo >= 1000 + BASE31IT_FROM && a.catalogNo < 1000 + BASE31IT_TO);

describe('base italiana: interruptor base31.it', () => {
  it('ligado por padrão: atos da base nascem (no início e na fila); desligado: nenhum', () => {
    const on = createGame(defaultConfig('r31it-sw', { startYear: 1975, realNames: true }));
    expect(sw(on, 'base31.it')).toBe(true);
    expect(itActs(on).length).toBeGreaterThan(20);
    const off = createGame(defaultConfig('r31it-sw', { startYear: 1975, realNames: true, base31it: false }));
    expect(sw(off, 'base31.it')).toBe(false);
    expect(itActs(off)).toEqual([]);
    for (let i = 0; i < 14; i++) advanceMonth(off);
    expect(itActs(off)).toEqual([]);
  });
});
