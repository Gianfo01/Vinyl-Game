// Rodada 21 (C — pessoas e ciclo de vida): pessoa real única por ato, mortalidade de reais sem data, dependência de quem
// chega viciado, teto de habilidade = potencial, sexo pelo nome.
import { describe, expect, it } from 'vitest';
import { Rng, seedState } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { deathRisk, realSafe } from '../src/sim/dynasty';
import { makePerson, personName } from '../src/sim/people';
import { healthOf } from '../src/sim/sys/people/state';
import { DUP21, canonKey } from '../src/sim/sys/realworld';
import { createGame } from '../src/sim/worldgen';
import { FIRST_NAMES, FIRST_NAMES_F, FIRST_NAMES_M, sexByName } from '../src/data/people';
import type { GameState, Person } from '../src/sim/types';

const dupNames = (s: GameState) => Object.values(s.acts).filter((a) => {
  const ks = a.members.map((id) => s.persons[id]).filter(Boolean).map((p) => canonKey(p.name));
  return new Set(ks).size !== ks.length || new Set(a.members).size !== a.members.length;
});

describe('r21 C — pessoas', () => {
  it('C-1: nenhum ato nasce com duas pessoas de mesmo nome (Black Sabbath tem um Tony Iommi; Brubeck sem "The" duplicado)', () => {
    const s = createGame(defaultConfig('r21c1', { startYear: 1995, realNames: true, realFates: true, mode: 'historic', history: 'strict' }));
    expect(dupNames(s).map((a) => a.name)).toEqual([]);
    const sab = Object.values(s.acts).find((a) => a.name === 'Black Sabbath')!;
    expect(sab).toBeTruthy();
    expect(sab.members.map((id) => s.persons[id].name).filter((n) => n === 'Tony Iommi').length).toBe(1);
    const t = createGame(defaultConfig('r21c1b', { startYear: 1963, realNames: true, mode: 'historic', history: 'strict' }));
    expect(dupNames(t).map((a) => a.name)).toEqual([]);
    expect(Object.values(t.acts).filter((a) => canonKey(a.name).replace(/^the /, '') === 'dave brubeck quartet').length).toBe(1);
    expect(DUP21.size).toBeGreaterThan(0);
  });

  it('C-2: realSafe só protege quem tem morte documentada no futuro; ≥ 95 anos morre em poucos anos', () => {
    const s = createGame(defaultConfig('r21c2', { startYear: 1995, realNames: true, realFates: true, mode: 'historic', history: 'strict' }));
    const act = { catalogNo: 5 };
    const p = { ...Object.values(s.persons)[0], fate: undefined } as Person;
    expect(realSafe(s, act)).toBe(true);
    expect(realSafe(s, act, p)).toBe(false);
    expect(realSafe(s, act, { ...p, fate: 2010 })).toBe(true);
    expect(realSafe(s, act, { ...p, fate: 1990 })).toBe(false);
    // quem tem morte real agendada ficou marcado na criação
    const fated = Object.values(s.persons).filter((q) => q.fate !== undefined && q.fate > s.year);
    expect(fated.length).toBeGreaterThan(0);
    expect(deathRisk(96, p)).toBeGreaterThanOrEqual(0.06);
    expect(deathRisk(70, p)).toBeLessThan(0.01);
  });

  it('C-3: quem chega viciado entra com dependência 60–75 e histórico (não sara no primeiro mês)', () => {
    const s = createGame(defaultConfig('r21c3', { startYear: 1980, mode: 'free' }));
    const p = Object.values(s.persons).find((q) => q.alive && !q.isPlayer)!;
    p.health = 'addiction';
    const h = healthOf(s, p.id);
    expect(h.dependency).toBeGreaterThanOrEqual(60);
    expect(h.dependency).toBeLessThanOrEqual(75);
    expect(h.history).toBe(true);
    const q = Object.values(s.persons).find((x) => x.alive && !x.isPlayer && x !== p)!;
    expect(healthOf(s, q.id).dependency).toBe(0);
  });

  it('C-4: habilidade gerada nunca passa do potencial (nem de 100)', () => {
    const s = createGame(defaultConfig('r21c4', { startYear: 1980, mode: 'free' }));
    const r = new Rng(seedState('r21c4'));
    for (let i = 0; i < 200; i++) {
      const pot = r.int(60, 99);
      const p = makePerson(s, r, { lang: 'en', role: 'vocal', potential: pot, born: 1950, startFrac: 0.95 });
      for (const v of Object.values(p.skills)) { expect(v).toBeLessThanOrEqual(pot); expect(v).toBeLessThanOrEqual(100); }
    }
  });

  it('C-9: nome feminino → sex f; listas por sexo e união consistentes', () => {
    const s = createGame(defaultConfig('r21c9', { startYear: 1980, mode: 'free' }));
    const r = new Rng(seedState('r21c9'));
    const f = makePerson(s, r, { lang: 'pt', role: 'vocal', potential: 70, born: 1950, startFrac: 0.5, name: 'Maria Silva' });
    expect(f.sex).toBe('f');
    const m = makePerson(s, r, { lang: 'es', role: 'vocal', potential: 70, born: 1950, startFrac: 0.5, name: 'Ernesto Reyes' });
    expect(m.sex).toBe('m');
    expect(sexByName('Simone Dupont')).toBe('f');
    expect(sexByName('Zyxx Q')).toBeUndefined();
    for (let i = 0; i < 30; i++) {
      expect(FIRST_NAMES_F.en).toContain(personName(r, 'en', 'f').split(' ')[0]);
      expect(FIRST_NAMES_M.pt).toContain(personName(r, 'pt', 'm').split(' ')[0]);
      const p = makePerson(s, r, { lang: 'en', role: 'guitar', potential: 70, born: 1950, startFrac: 0.5 });
      expect(p.sex).toBe(FIRST_NAMES_F.en.includes(p.name.split(' ')[0]) ? 'f' : 'm');
    }
    for (const lang of Object.keys(FIRST_NAMES) as (keyof typeof FIRST_NAMES)[]) {
      expect(FIRST_NAMES[lang].length).toBe(FIRST_NAMES_M[lang].length + FIRST_NAMES_F[lang].length);
    }
  });
});
