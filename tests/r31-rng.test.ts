// R31 · W0-RNG — fim do sorteio único antigo. Trava: nenhum `rngOf(` em src/, `rng19` sem caminho legado
// (sem `perSystem19`, sem 3º parâmetro), nenhum `Math.random` na simulação, chaves usadas registradas em STREAMS19,
// e determinismo: mesma semente + mesmas ações → mesmo estado depois de alguns meses.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { playMonth } from '../src/sim/playbot16';
import { RNG_VERSION19, STREAMS19, rng19, rngSnapshot19 } from '../src/sim/rng19';
import { hashString } from '../src/core/rng';
import type { GameState } from '../src/sim/types';

const SRC = path.join(__dirname, '..', 'src');
function files(d: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) files(p, out); else if (/\.(ts|mjs|js)$/.test(p)) out.push(p);
  }
  return out;
}
/** tira comentários de linha e de bloco (grosso, suficiente para varredura) */
const code = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const rel = (p: string): string => path.relative(path.join(SRC, '..'), p);

describe('r31 W0-RNG — fluxo único removido', () => {
  it('nenhum rngOf( em src/', () => {
    const bad = files(SRC).filter((p) => /\brngOf\s*\(/.test(code(fs.readFileSync(p, 'utf8')))).map(rel);
    expect(bad).toEqual([]);
  });

  it('rng19 sem caminho legado (sem perSystem19, sem 3º parâmetro, sem s.rng)', () => {
    const t = fs.readFileSync(path.join(SRC, 'sim/rng19.ts'), 'utf8');
    expect(t).not.toMatch(/perSystem19/);
    expect(code(t)).toMatch(/export function rng19\(s: GameState, key: string\): Rng \{/);
    expect(rng19.length).toBe(2);
    // ninguém chama rng19 com um gerador legado a mais
    const extra: string[] = [];
    for (const p of files(SRC)) for (const m of code(fs.readFileSync(p, 'utf8')).matchAll(/\brng19\(\s*\w+\s*,\s*'[^']+'\s*,/g)) extra.push(`${rel(p)}: ${m[0]}`);
    expect(extra).toEqual([]);
    // o estado único antigo saiu do tipo e do estado inicial
    expect(fs.readFileSync(path.join(SRC, 'sim/types.ts'), 'utf8')).not.toMatch(/^\s*rng: RngState;/m);
    const s = createGame(defaultConfig('r31-rng-shape'));
    expect((s as unknown as { rng?: unknown }).rng).toBeUndefined();
    expect(s.rngVersion).toBe(RNG_VERSION19);
  });

  it('nenhum Math.random em src/sim', () => {
    const bad = files(path.join(SRC, 'sim')).filter((p) => /\bMath\.random\b/.test(code(fs.readFileSync(p, 'utf8')))).map(rel);
    expect(bad).toEqual([]);
  });

  it('toda chave usada em rng19(s, chave) está registrada em STREAMS19 com descrição', () => {
    const used = new Set<string>();
    for (const p of files(SRC)) for (const m of code(fs.readFileSync(p, 'utf8')).matchAll(/\brng19\(\s*\w+\s*,\s*'([^']+)'\s*\)/g)) used.add(m[1]);
    const missing = [...used].filter((k) => !STREAMS19[k]);
    expect(missing).toEqual([]);
    for (const k of ['world', 'tick', 'act']) expect(STREAMS19[k]?.length ?? 0).toBeGreaterThan(10);
  });
});

describe('r31 W0-RNG — determinismo', () => {
  const run = (seed: string): GameState => {
    const s = createGame(defaultConfig(seed));
    for (let m = 0; m < 4; m++) { playMonth(s); advanceMonth(s); }
    return s;
  };
  it('mesma semente + mesmas ações → mesmo estado após alguns meses', () => {
    const a = run('r31-det'), b = run('r31-det');
    expect(a.week).toBeGreaterThan(12);
    expect(rngSnapshot19(b)).toBe(rngSnapshot19(a));
    expect(hashString(JSON.stringify(b))).toBe(hashString(JSON.stringify(a)));
  });
  it('outra semente conta outra história', () => {
    const a = createGame(defaultConfig('r31-det')), c = createGame(defaultConfig('r31-det-2'));
    expect(rngSnapshot19(c, 'world')).not.toBe(rngSnapshot19(a, 'world'));
  });
  it('sorteio a mais nas ações do jogador não desloca o motor nem a geração do mundo', () => {
    const a = createGame(defaultConfig('r31-iso')), b = createGame(defaultConfig('r31-iso'));
    for (let i = 0; i < 5; i++) rng19(b, 'act').next();
    advanceMonth(a); advanceMonth(b);
    expect(rngSnapshot19(b, 'tick')).toBe(rngSnapshot19(a, 'tick'));
    expect(rngSnapshot19(b, 'world')).toBe(rngSnapshot19(a, 'world'));
    expect(rngSnapshot19(b, 'market')).toBe(rngSnapshot19(a, 'market'));
  });
});
