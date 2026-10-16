// R31 · onda 3 (Z) — família Fossati: sempre presente (1889, 1955, 1990, 2030), papéis por época (uma pessoa, vários
// papéis), não envelhece nem morre, Sonia só se aposenta, violino Mítico que volta se roubado, efeitos pequenos e
// opcionais (interruptor 'fam31').
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import type { GameState } from '../src/sim/types';
import { FAMILY31, SONIA_RETIRE31, famKey31 } from '../src/data/fossati31';
import { RELIC_TIER31 } from '../src/data/relics31';
import {
  HOMAGE31, LUNCH_CD31, METALMAC_DEFECT31, antonellaPress31, efroFlight31, fam31, famMet31, famNow31, famRoleLabel31, langSchool31, luciaLunch31, metalmac31,
  soniaPromo31, syncFam31, tennisClub31, violin31,
} from '../src/sim/sys/fossati31';
import { rolesOf } from '../src/sim/r31/role';
import { setSw } from '../src/sim/r31/switches';
import { relicMeasure31 } from '../src/sim/r31/relic31';
import { negotiateRelic } from '../src/sim/sys/relics9';
import { pressDefect31 } from '../src/sim/sys/industry/supply';
import { playerActs } from '../src/sim/util';

const game = (y: number, seed = 'r31fam'): GameState => createGame(defaultConfig(`${seed}-${y}`, { startYear: y, scenario: 'established' }));
const kinds = (s: GameState, id: string) => rolesOf(s, famKey31(id as never), s.year).map((r) => `${r.kind}:${r.org ?? ''}`);
const jump = (s: GameState, y: number) => { s.year = y; syncFam31(s); };

describe('família Fossati sempre presente, papéis por época', () => {
  for (const y of [1889, 1955, 1990, 2030]) {
    it(`presente em ${y}, com papéis que fazem sentido para a época`, () => {
      const s = game(y);
      const now = famNow31(s);
      expect(now.map((n) => n.m.id)).toEqual(FAMILY31.map((m) => m.id));
      for (const n of now) {
        expect(n.roles.some((r) => r.kind === 'family'), n.m.id).toBe(true);
        expect(n.age).toBe(n.m.age);
      }
      expect(kinds(s, 'efro')).toContain('owner:metalmac');
      const sonia = kinds(s, 'sonia');
      if (y === 1889) expect(sonia).toContain('media:salao_jornal');
      if (y === 1955 || y === 1990) expect(sonia).toContain('media:radio');
      if (y === 2030) expect(sonia).toContain('manager:sonia_mgmt');
      const ant = kinds(s, 'antonella');
      if (y < 1997) expect(ant).toEqual(expect.arrayContaining(['producer:teatro', 'media:jornal']));
      else expect(ant).toContain('owner:escola_idiomas');
      // uma pessoa, um papel de trabalho por vez no mesmo ramo (a Metalmac da época, não duas)
      expect(kinds(s, 'efro').filter((k) => k === 'owner:metalmac')).toHaveLength(1);
      // a família não é gente mortal do banco de pessoas
      expect(Object.values(s.persons).some((p) => /Fossati$/.test(p.name) && !p.isPlayer)).toBe(false);
      // o violino existe desde o início
      expect(violin31(s)).toBeDefined();
    });
  }

  it('papéis mudam com o tempo; histórico fica; idade nunca muda; ninguém morre; Sonia só se aposenta', () => {
    const s = game(1990);
    const ages = famNow31(s).map((n) => n.age);
    jump(s, 2003);
    expect(kinds(s, 'sonia')).toContain('media:89fm');
    expect(kinds(s, 'antonella')).toContain('owner:escola_idiomas');
    expect(kinds(s, 'antonella')).not.toContain('producer:teatro');
    jump(s, 2025);
    expect(kinds(s, 'sonia')).toContain('manager:sonia_mgmt');
    jump(s, SONIA_RETIRE31 + 2);
    const sonia = kinds(s, 'sonia');
    expect(sonia).toContain('retired:');
    expect(sonia).toContain('family:fossati');
    expect(sonia.some((k) => k.startsWith('manager') || k.startsWith('media'))).toBe(false);
    for (const id of ['efro', 'lucia', 'antonella', 'gianluca']) expect(kinds(s, id).some((k) => k.startsWith('retired')), id).toBe(false);
    expect(famNow31(s).map((n) => n.age)).toEqual(ages);
    expect(famNow31(s)).toHaveLength(FAMILY31.length);
    // histórico das épocas (mesma pessoa): rádio, FMs, empresária, aposentada
    const all = rolesOf(s, famKey31('sonia')).map((r) => r.org ?? r.kind);
    expect(all).toEqual(expect.arrayContaining(['radio', '89fm', 'virgin', 'gazeta_fm', 'sonia_mgmt', 'retired']));
    expect(famRoleLabel31(s, 'sonia').pt).toBe('Aposentada');
  });

  it('no motor de verdade: a virada do ano troca o papel e a idade não muda', () => {
    const s = game(2035, 'r31fam-run');
    const ages = famNow31(s).map((n) => n.age);
    for (let i = 0; i < 13; i++) advanceMonth(s);
    expect(s.year).toBe(2036);
    expect(kinds(s, 'sonia')).toContain('retired:');
    expect(famNow31(s).map((n) => n.age)).toEqual(ages);
  });

  it('marca real só com "Nomes e obras reais" ligado', () => {
    const s = game(2003);
    s.config.realNames = true;
    expect(famRoleLabel31(s, 'sonia').pt).toContain('89 FM');
    s.config.realNames = false;
    expect(famRoleLabel31(s, 'sonia').pt).not.toContain('89');
  });
});

describe('o violino do Efro', () => {
  it('Mítico, nunca à venda e volta se roubado', () => {
    const s = game(1990, 'r31fam-v');
    const rl = violin31(s)!;
    expect(RELIC_TIER31.rl_efro_violin).toBe('mitica');
    expect(relicMeasure31(s, rl).tier).toBe(5);
    expect(typeof negotiateRelic(s, rl.id, 2.5)).toBe('object'); // recusa (texto), nunca acordo
    expect((negotiateRelic(s, rl.id, 2.5) as { r?: string }).r).toBeUndefined();
    rl.st = 'stolen';
    advanceMonth(s);
    advanceMonth(s);
    expect(violin31(s)!.st).toBe('kept');
    expect(violin31(s)!.own[0][0]).toBe('Efro Fossati');
  });
});

describe('efeitos pequenos, opcionais e medidos', () => {
  it('ações têm efeito pequeno, tempo de espera e respeitam o interruptor', () => {
    const s = game(1990, 'r31fam-fx');
    const acts = playerActs(s);
    expect(acts.length).toBeGreaterThan(0);
    const a = s.acts[acts[0]];
    const p = s.persons[a.members[0]];
    p.stress = 50; p.morale = 50;
    expect(luciaLunch31(s).ok).toBe(true);
    expect(p.stress).toBe(44);
    expect(p.morale).toBe(53);
    expect(luciaLunch31(s).ok).toBe(false); // espera
    expect(fam31(s).cd.lunch).toBe(s.week + LUNCH_CD31);
    s.player.cash += 1e9;
    const m0 = a.momentum, f0 = a.fame;
    expect(soniaPromo31(s, a.id).ok).toBe(true);
    expect(a.momentum - m0).toBeLessThanOrEqual(4);
    expect(a.fame - f0).toBeLessThanOrEqual(1);
    expect(antonellaPress31(s, a.id).ok).toBe(true);
    expect(langSchool31(s, a.id, 'en').ok).toBe(false); // escola só a partir de 1997
    expect(pressDefect31.f(s)).toBe(0);
    expect(metalmac31(s).ok).toBe(true);
    expect(pressDefect31.f(s)).toBe(METALMAC_DEFECT31);
    expect(METALMAC_DEFECT31).toBeLessThan(0.01);
    const insp = s.persons[a.members[0]].inspiration;
    expect(efroFlight31(s, a.id).ok).toBe(true);
    expect(s.persons[a.members[0]].inspiration - insp).toBeLessThanOrEqual(10);
    expect(efroFlight31(s, a.id).ok).toBe(false); // uma vez por partida
    expect(tennisClub31(s).ok).toBe(true);
    expect(famMet31(s).famiglia).toBe(true);
    expect(famMet31(s).met).toEqual(expect.arrayContaining(HOMAGE31));
    // desligado: a família fica, os efeitos não
    setSw(s, 'fam31', false);
    expect(pressDefect31.f(s)).toBe(0);
    expect(tennisClub31(s).ok).toBe(false);
    expect(famNow31(s)).toHaveLength(FAMILY31.length);
  });

  it('a escola de idiomas (desde 1997) ensina e não repete', () => {
    const s = game(2000, 'r31fam-lang');
    const a = s.acts[playerActs(s)[0]];
    s.player.cash += 1e9;
    expect(antonellaPress31(s, a.id).ok).toBe(false);
    expect(langSchool31(s, a.id, 'it').ok).toBe(true);
    expect(langSchool31(s, a.id, 'it').ok).toBe(false);
    expect(fam31(s).langs[a.id]).toEqual(['it']);
  });
});
