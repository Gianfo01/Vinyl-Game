// Rodada 15 — laços familiares: grafo real por nome (datado), luto, gerados e determinismo.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { kin15, kinMonth15, kinOf15 } from '../src/sim/sys/kin15';
import { personDies } from '../src/sim/dynasty';
import { l } from '../src/data/world';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';

const mk = (y: number, seed = 'r15kin') => createGame(defaultConfig(seed, { startYear: y, realNames: true, dbSize: 'small' }));
const byName = (s: ReturnType<typeof mk>, n: string) => Object.values(s.persons).find((p) => p.name === n);

describe('família r15', () => {
  it('liga irmãos e filhos reais por nome, sem mostrar quem ainda não nasceu', () => {
    const s = mk(1990);
    const mj = byName(s, 'Michael Jackson'), jan = byName(s, 'Janet Jackson');
    expect(mj && jan).toBeTruthy();
    expect(kinOf15(s, mj!.id).some((k) => k.id === jan!.id && k.rel === 'sibling')).toBe(true);
    for (const p of Object.values(s.persons)) for (const k of kinOf15(s, p.id)) expect(k.p.born).toBeLessThanOrEqual(s.year);
    const old = mk(1960);
    const marley = byName(old, 'Bob Marley');
    if (marley) expect(kinOf15(old, marley.id).every((k) => k.rel !== 'child' || k.p.born <= 1960)).toBe(true);
  });

  it('morte de um parente derruba a moral de quem fica, com rastro no registro', () => {
    const s = mk(1990);
    const mj = byName(s, 'Michael Jackson')!, jan = byName(s, 'Janet Jackson')!;
    kinMonth15(s);
    jan.morale = 80;
    personDies(s, mj, l('teste', 'test'));
    kinMonth15(s);
    expect(jan.morale).toBeLessThan(80);
    expect(kin15(s).log.length).toBeGreaterThan(0);
  });

  it('simulação é determinística e gera famílias de procedurais', { timeout: 240000 }, () => {
    const a = mk(1985, 'kin-det'), b = mk(1985, 'kin-det');
    for (let i = 0; i < 24; i++) { advanceMonth(a); advanceMonth(b); }
    expect(JSON.stringify(kin15(a))).toBe(JSON.stringify(kin15(b)));
    expect(kin15(a).g.length).toBeGreaterThan(0);
  });
});
