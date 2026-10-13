// Rodada 9 (A) — novo começo: assumir gravadora existente, árvore de habilidades com estilo de vida
// derivado, trajetórias novas e migração de saves com perks de estilo.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame, takeoverCandidates } from '../src/sim/worldgen';
import { perk, perkEntries } from '../src/sim/perks';
import { deriveAttrs } from '../src/sim/sys/persona';
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

describe('árvore de habilidades (apagada na r27)', () => {
  it('a ficha deriva os atributos sem habilidades e nenhum perk de Habilidade aparece', () => {
    const spec = { name: 'Ana', age: 30, background: 'producer', career: 'producer', role: 'producer' as const, traits: [], points: {} };
    const s = createGame(defaultConfig('r9-skill', { character: spec }));
    expect(ownerOf(s).attrs.ear).toBe(deriveAttrs(spec).ear);
    for (let i = 0; i < 13; i++) advanceMonth(s);
    expect(perkEntries(s).some((e) => /Habilidade|Estilo de vida/.test(e.label.pt))).toBe(false);
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
