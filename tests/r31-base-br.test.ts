// R31 · onda 4 (BASE-BR) — base brasileira ampliada (src/data/base31br.ts, gerado de docs/r31/base-br/*.jsonl).
// Todo ato tem fonte, gênero e cidade que existem, anos coerentes (estreia ≤ obra ≤ fim; integrante vivo e nascido antes
// de entrar), nenhuma duplicata com a base anterior, nome real registrado ('br31') e o interruptor 'base31.br' manda de fato.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { BASE31BR_ACTS, BR31_NOTES, CURBR31 } from '../src/data/base31br';
import { REALNAMES31 } from '../src/data/realnames31';
import { REAL_ACTS } from '../src/data/realnames';
import { FICTION31 } from '../src/data/fiction31';
import { cityById, genreById } from '../src/data/world';
import { BASE31BR_FROM, BASE31BR_TO, REAL_ALL, REAL_BASE, brOff31, dedupKey27, rw } from '../src/sim/sys/realworld';
import { sw } from '../src/sim/r31/switches';

const NOW = 2026, FORE = 6;

describe('BASE-BR · fichas', () => {
  it('fonte, gênero, cidade e país válidos; gênero já existe na estreia', () => {
    const bad: string[] = [];
    BASE31BR_ACTS.forEach((a, i) => {
      const n = BR31_NOTES[i], g = genreById[a.g];
      if (!n || !n.f.length || !n.f.every((u) => /^https?:\/\/\S+\.\S+/.test(u))) bad.push(`${a.n}: fonte`);
      if (!g) bad.push(`${a.n}: gênero ${a.g}`);
      else if (g.born > a.d + FORE) bad.push(`${a.n}: estreia ${a.d} antes do gênero ${a.g}`);
      if (!cityById[a.c]) bad.push(`${a.n}: cidade ${a.c}`);
      if (a.cn !== 'BRA') bad.push(`${a.n}: país ${a.cn}`);
      if (a.t !== 2 && a.t !== 3) bad.push(`${a.n}: porte ${a.t}`);
    });
    expect(bad).toEqual([]);
  });

  it('anos coerentes: estreia ≤ obra ≤ fim; solo nasce antes e morre depois da estreia; integrantes vivos ao entrar', () => {
    const bad: string[] = [];
    for (const a of BASE31BR_ACTS) {
      if (a.d < 1880 || a.d > NOW) bad.push(`${a.n}: estreia ${a.d}`);
      if (a.e !== undefined && a.e < a.d) bad.push(`${a.n}: fim ${a.e}`);
      if (a.f !== undefined && a.f > a.d) bad.push(`${a.n}: formação ${a.f}`);
      if (a.b !== undefined && a.b >= a.d) bad.push(`${a.n}: nascimento ${a.b}`);
      if (a.x !== undefined && (a.x < a.d - 1 || (a.b !== undefined && a.x <= a.b) || (a.e !== undefined && a.e > a.x))) bad.push(`${a.n}: morte ${a.x}`);
      for (const [t, y] of a.al ?? []) if (y < a.d || y > (a.e ?? NOW)) bad.push(`${a.n}: obra "${t}" ${y}`);
      for (const m of a.m ?? []) {
        const join = m[4] ?? a.d;
        if (m[2] !== undefined && m[2] >= join) bad.push(`${a.n}/${m[0]}: nasceu ${m[2]} depois de entrar ${join}`);
        if (m[3] !== undefined && m[3] < join) bad.push(`${a.n}/${m[0]}: morreu ${m[3]} antes de entrar ${join}`);
        if (m[5] !== undefined && m[5] < join) bad.push(`${a.n}/${m[0]}: saída ${m[5]}`);
      }
      for (const [y0, y1] of a.rj ?? []) if (y0 < a.d || (y1 !== undefined && y1 < y0)) bad.push(`${a.n}: volta ${y0}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('BASE-BR · sem duplicata e no lugar certo', () => {
  it('nenhum nome repete a base anterior, o catálogo clássico, as bandas de ficção ou o próprio lote', () => {
    const before = new Set([...REAL_ALL.slice(0, BASE31BR_FROM).map((a) => dedupKey27(a.n)), ...Object.values(REAL_ACTS).map((a) => dedupKey27(a.name)), ...FICTION31.map((f) => dedupKey27(f.n))]);
    const mine = BASE31BR_ACTS.map((a) => dedupKey27(a.n));
    expect(new Set(mine).size).toBe(mine.length);
    expect(BASE31BR_ACTS.filter((a) => before.has(dedupKey27(a.n))).map((a) => a.n)).toEqual([]);
    // todos entraram, em bloco, logo depois do lote Z (números de catálogo de quem já existia não mudam)
    expect(BASE31BR_TO - BASE31BR_FROM).toBe(BASE31BR_ACTS.length);
    expect(REAL_ALL.slice(BASE31BR_FROM, BASE31BR_TO)).toEqual(BASE31BR_ACTS);
  });

  it('contagem: base brasileira cresce (meta de 1 000 em andamento — ver docs/r31/base-br.md)', () => {
    const br = REAL_ALL.filter((a) => a.cn === 'BRA').length;
    expect(BASE31BR_ACTS.length).toBeGreaterThanOrEqual(330);
    expect(br).toBeGreaterThanOrEqual(880);
  });

  it('curadoria e nome real registrado no espaço br31 (homenagem ≠ real)', () => {
    expect(CURBR31.length).toBe(BASE31BR_ACTS.length);
    for (const c of CURBR31) {
      const r = REALNAMES31[`br31:${c.id}`];
      expect(r, c.id).toBeDefined();
      expect(r.real).toBe(c.nome);
      expect(r.substituto).not.toBe(r.real);
      expect(c.fontes.length, c.id).toBeGreaterThan(0);
    }
  });
});

describe('BASE-BR · interruptor', () => {
  const brInWorld = (s: ReturnType<typeof createGame>) =>
    Object.values(s.acts).filter((a) => a.catalogNo !== undefined && a.catalogNo >= REAL_BASE + BASE31BR_FROM && a.catalogNo < REAL_BASE + BASE31BR_TO).length
    + rw(s).upcoming.filter((i) => i >= BASE31BR_FROM && i < BASE31BR_TO).length;
  it('ligado por padrão: atos brasileiros novos no mundo (ativos ou na fila de estreia)', () => {
    const s = createGame(defaultConfig('r31br-on', { startYear: 1960, realNames: true, dbSize: 'huge' }));
    expect(sw(s, 'base31.br')).toBe(true);
    expect(brInWorld(s)).toBeGreaterThan(BASE31BR_ACTS.length * 0.5);
  });
  it('desligado na criação: nenhum ato do lote estreia', () => {
    const s = createGame(defaultConfig('r31br-off', { startYear: 1960, realNames: true, base31br: false }));
    expect(sw(s, 'base31.br')).toBe(false);
    expect(brOff31(s, BASE31BR_FROM)).toBe(true);
    expect(brInWorld(s)).toBe(0);
  });
});
