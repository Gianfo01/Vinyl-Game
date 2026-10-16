// R31 · onda 4 (BASE-HITS) — sucessos de 1992 até hoje (src/data/base31hits.ts): cada ato tem fonte, gênero, cidade e
// país válidos, anos coerentes (estreia ≤ hit ≤ fim; integrantes vivos na estreia), hit no top 10 de parada aceita,
// nenhuma duplicata com a base anterior, nome real registrado ('hit:<id>'), contagem mínima e interruptor 'base31.hits'.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { setSw, sw } from '../src/sim/r31/switches';
import { BASE31_HITS, HITS31_SRC } from '../src/data/base31hits';
import { CHART31_SRC } from '../src/data/hits31types';
import { CUR31, CUR31_HITS, cur31 } from '../src/data/cur31';
import { REALNAMES31 } from '../src/data/realnames31';
import { REAL_ACTS } from '../src/data/realnames';
import { countryInfoByA3 } from '../src/data/countries';
import { cityById, genreById } from '../src/data/world';
import { BASE31H_FROM, BASE31H_TO, REAL_ALL, REAL_BASE, SW_HITS31, dedupKey27 } from '../src/sim/sys/realworld';
import { actsNow27 } from '../src/sim/tickcache27';

/** meta mínima da frente (atos novos de fato na base) */
const MIN31H = 1000;

describe('base de sucessos: dados', () => {
  it('contagem mínima e todos entram no fim de REAL_ALL, na ordem', () => {
    expect(HITS31_SRC.length).toBeGreaterThanOrEqual(MIN31H);
    expect(BASE31H_TO - BASE31H_FROM).toBe(BASE31_HITS.length);
    expect(REAL_ALL.slice(BASE31H_FROM, BASE31H_TO).every((a, i) => a === BASE31_HITS[i])).toBe(true);
  });

  it('sem duplicata com a base anterior (dedupKey27) nem entre si; nada do Brasil ou da Itália (outras frentes)', () => {
    const before = new Set([...REAL_ALL.slice(0, BASE31H_FROM).map((a) => dedupKey27(a.n)), ...Object.values(REAL_ACTS).map((a) => dedupKey27(a.name))]);
    const mine = BASE31_HITS.map((a) => dedupKey27(a.n));
    expect(new Set(mine).size).toBe(mine.length);
    expect(BASE31_HITS.filter((a) => before.has(dedupKey27(a.n))).map((a) => a.n)).toEqual([]);
    expect(BASE31_HITS.filter((a) => a.cn === 'BRA' || a.cn === 'ITA').map((a) => a.n)).toEqual([]);
  });

  it('gênero, cidade e país existem; gênero nascido até a estreia (+6, como o validador r19)', () => {
    const bad: string[] = [];
    for (const a of BASE31_HITS) {
      const g = genreById[a.g];
      if (!g) bad.push(`${a.n}: gênero ${a.g}`);
      else if (g.born > a.d + 6) bad.push(`${a.n}: gênero ${a.g} (${g.born}) depois da estreia ${a.d}`);
      if (!cityById[a.c]) bad.push(`${a.n}: cidade ${a.c}`);
      if (!countryInfoByA3[a.cn]) bad.push(`${a.n}: país ${a.cn}`);
    }
    expect(bad).toEqual([]);
  });

  it('hit documentado: música, ano, parada aceita e posição 1–10; sucesso a partir de 1992', () => {
    const bad: string[] = [];
    for (const h of HITS31_SRC) {
      const hs = [h.h, ...(h.h2 ?? [])];
      for (const [song, y, ch, pos] of hs) {
        if (!song.trim()) bad.push(`${h.n}: música vazia`);
        if (!CHART31_SRC[ch]) bad.push(`${h.n}: parada ${ch}`);
        if (!(Number.isInteger(pos) && pos >= 1 && pos <= 10)) bad.push(`${h.n}: posição ${pos}`);
        if (y > 2026) bad.push(`${h.n}: hit no futuro`);
      }
      if (Math.max(h.d, ...hs.map((x) => x[1])) < 1992) bad.push(`${h.n}: nada desde 1992`);
      if (h.o && h.h2?.length) bad.push(`${h.n}: one-hit wonder com mais de um hit`);
    }
    expect(bad).toEqual([]);
  });

  it('anos coerentes: estreia ≤ hit ≤ fim (ou volta); nascimento antes da estreia; integrantes vivos na estreia', () => {
    const bad: string[] = [];
    for (const h of HITS31_SRC) {
      for (const [song, y] of [h.h, ...(h.h2 ?? [])]) {
        if (y < h.d) bad.push(`${h.n}: "${song}" (${y}) antes da estreia ${h.d}`);
        const inRun = h.e === undefined || y <= h.e || (h.rj ?? []).some(([a, b]) => y >= a && (b === undefined || y <= b));
        if (!inRun) bad.push(`${h.n}: "${song}" (${y}) depois do fim ${h.e}`);
      }
      if (h.e !== undefined && h.e < h.d) bad.push(`${h.n}: fim antes da estreia`);
      if (h.b !== undefined && h.b >= h.d) bad.push(`${h.n}: nasceu depois da estreia`);
      if (h.x !== undefined && (h.x < h.d - 1 || (h.b !== undefined && h.x <= h.b))) bad.push(`${h.n}: morte`);
      for (const m of h.m ?? []) {
        const join = m[4] ?? h.d;
        if (m[2] !== undefined && m[2] >= join) bad.push(`${h.n}: ${m[0]} nasceu ${m[2]}, entrou ${join}`);
        if (m[3] !== undefined && m[3] < join) bad.push(`${h.n}: ${m[0]} morreu antes de entrar`);
        if (m[4] !== undefined && m[5] !== undefined && m[5] < m[4]) bad.push(`${h.n}: ${m[0]} saiu antes de entrar`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('base de sucessos: curadoria e nomes reais', () => {
  it('toda ficha tem fonte verificável (verbete + arquivo oficial da parada), cidade, língua e "a confirmar"', () => {
    expect(CUR31_HITS.length).toBe(HITS31_SRC.length);
    const ids = CUR31_HITS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CUR31_HITS) {
      expect(c.fontes[0], c.id).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\/./);
      expect(c.fontes.length, c.id).toBeGreaterThanOrEqual(2);
      expect(c.cidade.trim(), c.id).not.toBe('');
      expect(c.lingua, c.id).toMatch(/^[a-z]{2}$/);
      expect(Array.isArray(c.confirmar), c.id).toBe(true);
      expect(cur31(c.id), c.id).toBeDefined();
    }
    // não colide com as fichas da onda 3
    const z = new Set(CUR31.map((c) => c.id));
    expect(ids.filter((id) => z.has(id))).toEqual([]);
  });

  it('cada nome tem registro "hit:<id>" com o nome real e homenagem diferente', () => {
    const missing: string[] = [];
    for (const c of CUR31_HITS) {
      const r = REALNAMES31[`hit:${c.id}`];
      if (!r || r.real !== c.nome || r.substituto === r.real) missing.push(c.id);
    }
    expect(missing).toEqual([]);
  });
});

describe('base de sucessos: interruptor base31.hits', () => {
  const isHit = (no?: number) => no !== undefined && no >= REAL_BASE + BASE31H_FROM && no < REAL_BASE + BASE31H_TO;
  it('ligado por padrão: atos da base estreiam no mundo; desligado depois de criar, quem ainda não surgiu não surge', () => {
    const on = createGame(defaultConfig('r31hits-a', { startYear: 1990, realNames: true }));
    expect(sw(on, SW_HITS31)).toBe(true);
    const off = createGame(defaultConfig('r31hits-a', { startYear: 1990, realNames: true }));
    setSw(off, SW_HITS31, false);
    for (let i = 0; i < 40; i++) { advanceMonth(on); advanceMonth(off); }
    const nOn = actsNow27(on).filter((a) => isHit(a.catalogNo)).length;
    const preOff = actsNow27(off).filter((a) => isHit(a.catalogNo)).length;
    expect(nOn).toBeGreaterThan(preOff);
    // ligado de novo: os que esperavam voltam a surgir
    setSw(off, SW_HITS31, true);
    for (let i = 0; i < 3; i++) advanceMonth(off);
    expect(actsNow27(off).filter((a) => isHit(a.catalogNo)).length).toBeGreaterThan(preOff);
  }, 240_000);
});
