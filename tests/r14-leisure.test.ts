// Rodada 14 — vida fora do trabalho para todos: hobbies, pontos de encontro, encontros, vida pessoal e musa.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { registerSimHook } from '../src/sim/ext4';
import { goOut14, leisureMonth14, lz14, pool14, regulars14, spotsHere14, CAP14, HOB14 } from '../src/sim/sys/leisure14';
import { ownerOf } from '../src/sim/sys/people/owner';
import { advanceMonth } from '../src/sim/tick';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';

const mk = (seed: string, y = 1985) => {
  const s = createGame(defaultConfig(seed, { startYear: y }));
  const act = spawnProceduralAct(s, rngOf(s), { city: s.config.homeCity });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  s.player.cash *= 3; // rodada 16: o começo do zero ficou mais apertado; aqui o selo fica parado 2 anos e não pode quebrar
  return s;
};

describe('lazer r14', () => {
  it('simula artistas, executivos e equipe com teto mensal, sem futuro e de forma determinística', () => {
    const a = mk('lz-1');
    const b = mk('lz-1');
    for (let i = 0; i < 24; i++) { advanceMonth(a); advanceMonth(b); }
    expect(JSON.stringify(lz14(a))).toBe(JSON.stringify(lz14(b)));
    const st = lz14(a);
    const keys = Object.keys(st.r);
    expect(keys.some((k) => k.startsWith('p:'))).toBe(true);
    expect(keys.some((k) => k.startsWith('l:'))).toBe(true);
    const { fixed, rot } = pool14(a);
    expect(fixed.length).toBeGreaterThan(0);
    expect(keys.length).toBeLessThanOrEqual(24 * CAP14 + fixed.length);
    expect(rot.length).toBeGreaterThan(0);
    // hobbies só da época (videogame não existe em 1955)
    const old = mk('lz-2', 1955);
    for (let i = 0; i < 6; i++) leisureMonth14(old);
    expect(Object.values(lz14(old).r).some((r) => r.h.includes('games'))).toBe(false);
    expect(HOB14.find((h) => h.id === 'games')!.from).toBeGreaterThan(1955);
    expect(spotsHere14(old)).not.toContain('arcade');
    // vida pessoal e encontros deixam rastro na linha do tempo
    const logs = Object.values(st.r).reduce((n, r) => n + r.log.length, 0);
    expect(logs).toBeGreaterThan(0);
    expect(CAP14).toBeLessThanOrEqual(40);
  });

  it('jogador vai a um ponto de encontro: gasta tempo e dinheiro, muda opiniões com motivo', () => {
    const s = mk('lz-3');
    for (let i = 0; i < 6; i++) advanceMonth(s);
    ownerOf(s).wealth += 1e9;
    const k = spotsHere14(s).sort((x, y) => regulars14(s, y).length - regulars14(s, x).length)[0];
    const w0 = ownerOf(s).wealth;
    const res = goOut14(s, k);
    expect(res.ok).toBe(true);
    expect(ownerOf(s).wealth).toBeLessThan(w0);
    expect(goOut14(s, k).ok).toBe(false); // uma vez por mês por lugar
    if (regulars14(s, k).length) expect(res.met.length).toBeGreaterThan(0);
  });

  it('custo de CPU baixo (< 15% a mais por mês)', () => {
    const s = mk('lz-perf');
    let hook = 0;
    registerSimHook('month', 'leisure14', (x) => { const t = performance.now(); leisureMonth14(x); hook += performance.now() - t; });
    const t0 = performance.now();
    for (let i = 0; i < 12; i++) advanceMonth(s);
    const all = performance.now() - t0;
    registerSimHook('month', 'leisure14', (x) => leisureMonth14(x));
    console.log(`lazer14: ${hook.toFixed(0)}ms de ${all.toFixed(0)}ms (${((hook / (all - hook)) * 100).toFixed(1)}%)`);
    expect(hook / (all - hook)).toBeLessThan(0.15);
  }, 60000);
});
