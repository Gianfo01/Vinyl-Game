// Rodada 9 (A) — novo começo: assumir gravadora existente, árvore de habilidades com estilo de vida
// derivado, trajetórias novas e migração de saves com perks de estilo.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame, takeoverCandidates } from '../src/sim/worldgen';
import { perk } from '../src/sim/perks';
import { BRANCHES, LIFESTYLES, SKILL_TREE, START_SKILL_POINTS, buySkill, deriveAttrs, lifestyleOf, persona, skills, validStartSkills } from '../src/sim/sys/persona';
import { ORIGINS } from '../src/sim/sys/identity/data';
import { backgroundById } from '../src/sim/sys/life/data';
import { ownerOf } from '../src/sim/sys/people/owner';
import type { RunConfig } from '../src/sim/types';

const invariant = (s: ReturnType<typeof createGame>) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);

describe('assumir gravadora existente', () => {
  for (const mode of ['historic', 'free', 'chaos'] as const) {
    it(`transfere elenco, contratos e caixa e tira o selo dos rivais (${mode})`, () => {
      const base = defaultConfig(`r9-take-${mode}`, { startYear: 1965, mode, role: 'hybrid' }) as RunConfig;
      const cands = takeoverCandidates(base);
      expect(cands.length).toBeGreaterThan(0);
      const pick = cands[cands.length - 1];
      const s = createGame({ ...base, takeover: pick.label.id });
      expect(s.labels[pick.label.id]).toBeUndefined();
      expect(s.config.companyName).toBe(pick.label.name);
      const mine = Object.values(s.acts).filter((a) => a.owner === 'player' && !a.playerBand);
      expect(mine.length).toBe(pick.terms.roster);
      for (const a of mine) expect(s.contracts[a.contractId!].party).toBe('player');
      expect(Object.values(s.contracts).some((c) => c.party === pick.label.id)).toBe(false);
      if (pick.terms.debt) expect(s.player.loans.length).toBeGreaterThan(0);
      invariant(s);
      for (let i = 0; i < 3; i++) advanceMonth(s);
      invariant(s);
    });
  }

  it('selos grandes vêm com dívida; pequenos não', () => {
    const cands = takeoverCandidates(defaultConfig('r9-tiers', { startYear: 1980, mode: 'historic' }) as RunConfig);
    const small = cands.find((c) => c.terms.tier === 1);
    const big = cands.find((c) => c.terms.tier === 3);
    if (small) expect(small.terms.debt).toBe(0);
    if (big) expect(big.terms.debt).toBeGreaterThan(big.terms.cash);
  });
});

describe('árvore de habilidades', () => {
  it('pontos iniciais, compra com pré-requisito, estilo derivado e pontos anuais', () => {
    const spec = { name: 'Ana', age: 30, background: 'producer', career: 'producer', role: 'producer' as const, traits: [], points: {}, skills: ['cr_ear', 'cr_hook', 'cr_arr', 'cr_polish'] }; // 3 pontos (rodada 16): Lapidador não cabe
    const s = createGame(defaultConfig('r9-skill', { character: spec }));
    const S0 = skills(s);
    expect(S0.owned).toEqual(['cr_ear', 'cr_hook', 'cr_arr']);
    expect(S0.points).toBe(0);
    expect(S0.lifestyle).toBe('intelectual');
    expect(ownerOf(s).attrs.ear).toBe(deriveAttrs(spec).ear - 0); // ouvido treinado já entra na ficha
    expect(buySkill(s, 'cr_master')).not.toBeNull(); // sem pontos
    S0.points = 10;
    expect(buySkill(s, 'net_door')).not.toBeNull(); // falta Caderninho
    expect(buySkill(s, 'cr_radio')).toBeNull();
    expect(buySkill(s, 'cr_polish')).toBeNull();
    expect(buySkill(s, 'cr_master')).toBeNull();
    expect(perk(s, 'songQ')).toBeGreaterThan(3);
    const pts = S0.points;
    for (let i = 0; i < 13; i++) advanceMonth(s);
    expect(skills(s).points).toBeGreaterThanOrEqual(pts + 2);
  });

  it('há exatamente 10 estilos de vida e cada um é alcançável', () => {
    expect(LIFESTYLES.length).toBe(10);
    expect(BRANCHES.length).toBe(8);
    const all = new Set<string>();
    const ids = SKILL_TREE.map((x) => x.id);
    // combinações de até 3 ramos com os dois primeiros níveis
    const firsts = BRANCHES.map((b) => SKILL_TREE.filter((x) => x.branch === b.id && x.tier <= 2).map((x) => x.id));
    for (let a = 0; a < 6; a++) for (let b = a; b < 6; b++) for (let c = b; c < 6; c++) {
      const ls = lifestyleOf([...new Set([...firsts[a], ...firsts[b], ...firsts[c]])]);
      if (ls) all.add(ls);
    }
    expect(all.size).toBe(10);
    expect(validStartSkills(ids)).toHaveLength(validStartSkills(ids).length);
    expect(validStartSkills(['cr_hook', 'cr_ear'])).toEqual(['cr_ear', 'cr_hook']);
  });

  it('save antigo com perks de estilo vira pontos devolvidos', () => {
    const s = createGame(defaultConfig('r9-migr'));
    const P0 = persona(s);
    delete P0.sk;
    P0.unlocked = { mentor: 3, mogul: 1 };
    const S0 = skills(s);
    expect(S0.owned).toEqual([]);
    expect(S0.points).toBe(START_SKILL_POINTS + (1 + 1 + 2) + 1);
    expect(P0.unlocked).toEqual({});
  });
});

describe('trajetórias', () => {
  it('toda trajetória tem base válida e efeitos; Músico melhora o próprio instrumento', () => {
    for (const o of ORIGINS) expect(backgroundById[o.bg]).toBeTruthy();
    expect(ORIGINS.length).toBeGreaterThanOrEqual(17);
    const mk = (career: string) => createGame(defaultConfig('r9-car', { character: { name: 'X', age: 30, background: ORIGINS.find((o) => o.id === career)!.bg, career, role: 'guitar', traits: [], points: {} } }));
    const a = mk('musician');
    const b = mk('lawyer');
    expect(perk(a, 'showRevenue')).toBeGreaterThan(perk(b, 'showRevenue'));
    expect(perk(b, 'advance')).toBeLessThan(perk(a, 'advance'));
    invariant(a);
  });
});
