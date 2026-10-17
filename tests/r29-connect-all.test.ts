// R29 (CONECTAR TUDO): toda aresta que o jogo deve ter entre os 13 sistemas é medida (sonda A × B, mediana de 3
// sementes) e, quando o sinal é conhecido, anda na direção certa. Ver src/sim/probe29all.ts e docs/connect29.md.
import { beforeAll, describe, expect, it } from 'vitest';
import '../src/sim/sys/index';
import { base29, EDGES29, matrix29, median29, NUDGES29, run29, strength29, type Cell29, type Run29 } from '../src/sim/probe29all';
import { CONNMAP29 } from '../src/sim/connmap29';

let RUN: Run29;
let CELLS: Map<string, Cell29>;
beforeAll(async () => {
  // r31 (W0-RNG): o ato da sonda sai do fluxo 'act' e o mundo do fluxo 'world'. Com 'r29all-b'/'r29all-c' só uma sonda
  // tinha gênero de rua e a aresta submundo → público (calor → jovens, só para gênero de rua) sumia na mediana; 'r29all-q'
  // (two tone) e 'r29all-x' (punk) no lugar — conferido: todas as arestas e sinais (também em 3 outros trios de 7 sementes)
  // r31 (W3-FIX): a base nova da onda 3 (Z) muda o mundo de 'r29all-x': o ato dela vira solo e já começa estressado
  // acima do limiar da terapia nos dois braços, e a aresta vida → dinheiro (estresse → despesas) zerava na mediana;
  // 'r29all-d' (punk, dupla) no lugar — conferido: todas as arestas e sinais também em [d,q,w], [d,q,z] e [q,r,r29all]
  // W5-FIX2: a mesma sonda, um empurrão por chamada (o run29 já roda controle + empurrão por empurrão: mesma sequência de
  // braços), devolvendo o controle ao vitest entre eles — 180 s síncronos travavam o worker ("Timeout calling onTaskUpdate")
  const runs: Run29[] = [];
  for (const sd of ['r29all', 'r29all-q', 'r29all-d']) {
    const b = base29(sd);
    const rows: Run29['rows'] = [];
    for (const n of NUDGES29) { rows.push(...run29(b, (x) => x.id === n.id).rows); await new Promise<void>((r) => setTimeout(r, 0)); }
    runs.push({ rows });
  }
  RUN = median29(runs);
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
