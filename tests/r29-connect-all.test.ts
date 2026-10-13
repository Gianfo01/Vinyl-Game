// R29 (CONECTAR TUDO): toda aresta que o jogo deve ter entre os 13 sistemas é medida (sonda A × B, mediana de 3
// sementes) e, quando o sinal é conhecido, anda na direção certa. Ver src/sim/probe29all.ts e docs/connect29.md.
import { beforeAll, describe, expect, it } from 'vitest';
import '../src/sim/sys/index';
import { base29, EDGES29, matrix29, median29, run29, strength29, type Cell29, type Run29 } from '../src/sim/probe29all';
import { CONNMAP29 } from '../src/sim/connmap29';

let RUN: Run29;
let CELLS: Map<string, Cell29>;
beforeAll(() => {
  RUN = median29(['r29all', 'r29all-b', 'r29all-c'].map((sd) => run29(base29(sd))));
  CELLS = new Map(matrix29(RUN).map((c) => [`${c.a}>${c.b}`, c]));
}, 600_000);

describe('R29 — conectar tudo', () => {
  it('toda aresta esperada existe (efeito medido)', () => {
    const missing = EDGES29.filter((e) => !CELLS.get(`${e.a}>${e.b}`)?.str).map((e) => `${e.a}→${e.b}`);
    expect(missing).toEqual([]);
  });
  it('as arestas com sinal conhecido andam na direção certa', () => {
    const wrong: string[] = [];
    for (const e of EDGES29) {
      if (!e.check) continue;
      const [n, m, sign] = e.check;
      const r = RUN.rows.find((x) => x.nudge === n && x.metric === m);
      if (!r || !strength29(r.d) || Math.sign(r.d) !== sign) wrong.push(`${e.a}→${e.b} (${n}→${m}: ${r ? (r.d * 100).toFixed(2) : '?'}%)`);
    }
    expect(wrong).toEqual([]);
  });
  it('o mapa da wiki (connmap29) tem as arestas esperadas', () => {
    const have = new Set(CONNMAP29.map((e) => `${e.a}>${e.b}`));
    expect(EDGES29.filter((e) => !have.has(`${e.a}>${e.b}`)).map((e) => `${e.a}→${e.b}`)).toEqual([]);
  });
});
