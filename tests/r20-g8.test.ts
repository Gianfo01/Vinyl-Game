// Rodada 20 (G8 — nova run): padrão "Reais em mundo aleatório" com estado inicial simulado (política versionada),
// seis modos preservados, configuração resolvida e compatibilidade de códigos/saves antigos. Testes rápidos.
import { describe, expect, it } from 'vitest';
import { applyPreset17, applyWorld17, codeStatus20, newRunConfig20, notes17, presetDiff20, readSetupCode17, resolveWorld20, setupCode17, worldOf17, WORLDS17 } from '../src/sim/start17';
import { simulatedStartCfg20 } from '../src/sim/worldpolicy20';
import { scriptedReal } from '../src/sim/history15';
import { createGame } from '../src/sim/worldgen';
import { realDataOf, REAL_BASE } from '../src/sim/sys/realworld';
import type { GameState, RunConfig } from '../src/sim/types';

const fresh = (seed = 'g8') => newRunConfig20({ seed, companyName: 'Selo' });
/** Títulos reais (anteriores ao início) que viraram lançamentos de atos reais. */
const realTitles = (g: GameState) => Object.values(g.acts).filter((a) => (a.catalogNo ?? 0) >= REAL_BASE).reduce((n, a) => {
  const al = new Set((realDataOf(a)?.al ?? []).map((x) => x[0]));
  return n + a.releases.filter((id) => al.has(g.releases[id]?.title)).length;
}, 0);

describe('r20 G8 — nova run', () => {
  it('config nova resolve para random com política inicial simulada; outros defaults intactos', () => {
    const c = fresh();
    expect(c.world17).toBe('random');
    expect(worldOf17(c)).toBe('random');
    expect(c).toMatchObject({ realNames: true, history: 'free', mode: 'free', realFates: false, initialWorldPolicy: 'simulated', worldPolicyVersion: 2, configSchemaVersion: 2, startYear: 1962, homeCity: 'london', scenario: 'from_zero', difficulty: 'normal', preset17: 'rec' });
    expect(simulatedStartCfg20(c)).toBe(true);
    expect(resolveWorld20(c).custom).toBe(false);
    expect(WORLDS17.map((w) => w.id)).toEqual(['random', 'exact', 'real', 'snap', 'fiction', 'chaos']);
    expect(presetDiff20(c, 'rec')).toEqual([]);
    expect(presetDiff20(c, 'hist')).toContain('history');
  });

  it('modo exato inalterado; override de tecnologia vira "Personalizado"; presets mantêm contratos', () => {
    const c = fresh();
    applyWorld17(c, 'exact');
    expect(c).toMatchObject({ realNames: true, history: 'strict', mode: 'historic', realFates: true, initialWorldPolicy: 'historical' });
    expect(simulatedStartCfg20(c)).toBe(false);
    c.mode = 'free';
    const r = resolveWorld20(c);
    expect(r.custom).toBe(true);
    expect(notes17(c).some((n) => n.level === 'warn')).toBe(true);
    const h = fresh(); applyPreset17(h, 'hist'); expect(h.world17).toBe('exact');
    const d = fresh(); applyPreset17(d, 'challenge'); expect(d.world17).toBe('snap'); expect(d.ironman).toBe(true);
    const sc = newRunConfig20({ seed: 's', companyName: 'x', kind: 'scenario' });
    expect(sc.mode).toBe('historic');
    expect(simulatedStartCfg20(sc)).toBe(false);
  });

  it('hook do mundo real não restaura lançamentos/fins reais anteriores ao início no random v2', () => {
    const c = { ...fresh('g8-hook'), startYear: 1975, dbSize: 'small' } as RunConfig;
    const g = createGame(c);
    expect(realTitles(g)).toBe(0);
    expect(scriptedReal(g, 1970)).toBe(false);
    // atos reais ativos têm catálogo simulado (não começam do zero)
    const real = Object.values(g.acts).filter((a) => (a.catalogNo ?? 0) >= REAL_BASE && a.status === 'active' && a.debutYear < 1972);
    expect(real.length).toBeGreaterThan(0);
    expect(real.some((a) => a.releases.length > 0)).toBe(true);
    // a mesma configuração sem a política nova (legado) ainda restaura a discografia real
    const legacy = { ...c } as RunConfig;
    delete legacy.initialWorldPolicy; delete legacy.worldPolicyVersion; delete legacy.configSchemaVersion;
    const gl = createGame(legacy);
    expect(realTitles(gl)).toBeGreaterThan(0);
    expect(scriptedReal(gl, 1970)).toBe(true);
  });

  it('código/save antigo mantém a semântica; versão futura é recusada', () => {
    const old = { ...fresh('old'), world17: 'random' } as RunConfig;
    delete old.initialWorldPolicy; delete old.worldPolicyVersion; delete old.configSchemaVersion;
    const back = readSetupCode17(setupCode17(old))!;
    expect(back.world17).toBe('random');
    expect(back.initialWorldPolicy).toBeUndefined();
    expect(simulatedStartCfg20(back)).toBe(false);
    expect(codeStatus20(back)).toBe('legacy');
    expect(notes17(back).some((n) => n.text.pt.includes('legada'))).toBe(true);
    const cur = readSetupCode17(setupCode17(fresh()))!;
    expect(codeStatus20(cur)).toBe('current');
    expect(simulatedStartCfg20(cur)).toBe(true);
    expect(readSetupCode17(setupCode17({ ...fresh(), configSchemaVersion: 99 }))).toBeNull();
  });
});
