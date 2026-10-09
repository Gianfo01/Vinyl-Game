// Rodada 13 — Novo Jogo: nomes de época únicos, origens/ambições novas com efeito, narradores com voz.

import { describe, expect, it } from 'vitest';
import { STORYTELLERS } from '../src/data/rules';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { ownerOf } from '../src/sim/sys/people/owner';
import { AMBITIONS, ORIGINS, ORIGIN_FX, careers, type Origin } from '../src/sim/sys/careers12';
import { perk } from '../src/sim/perks';
import { PACES, narrate } from '../src/sim/narrator13';
import { HELP, START_YEARS13 } from '../src/ui/ngdata13';

const mk = (seed: string, origin?: string, extra = {}) => createGame(defaultConfig(seed, { startYear: 1975, ...(origin ? { careers: { main: ['label'], origin, ambition: 'legacy' } } : {}), ...extra }));

describe('novo jogo r13', () => {
  it('cada ano de início tem nome único (pt e en)', () => {
    const pt = START_YEARS13.map((y) => y.label.pt.replace(/^\d+ — /, ''));
    const en = START_YEARS13.map((y) => y.label.en.replace(/^\d+ — /, ''));
    expect(new Set(pt).size).toBe(pt.length);
    expect(new Set(en).size).toBe(en.length);
    expect(START_YEARS13.length).toBeGreaterThan(30);
  });

  it('origens novas existem e têm efeito real', () => {
    for (const id of ['musicKid', 'session', 'anr', 'teacher', 'engineer', 'adman'] as Origin[]) {
      expect(ORIGINS[id]?.name.pt).toBeTruthy();
      expect(Object.keys(ORIGIN_FX[id]).length).toBeGreaterThan(1);
    }
    expect(Object.keys(AMBITIONS).length).toBeGreaterThanOrEqual(10);
    const base = mk('r13-o');
    const kid = mk('r13-o', 'musicKid');
    expect(careers(kid).origin).toBe('musicKid');
    expect(kid.player.reputation.artists).toBeGreaterThan(base.player.reputation.artists);
    expect(perk(kid, 'trust')).toBeGreaterThan(perk(base, 'trust'));
    const ad = mk('r13-o', 'adman');
    expect(ad.player.cash).toBeGreaterThan(base.player.cash);
    expect(ownerOf(ad).attrs.charisma).toBeGreaterThan(ownerOf(base).attrs.charisma);
  });

  it('narradores novos têm ritmo e voz próprios', () => {
    expect(STORYTELLERS.length).toBeGreaterThanOrEqual(7);
    for (const st of STORYTELLERS) expect(PACES[st.id]).toBeTruthy();
    const txt = { pt: 'Algo aconteceu.', en: 'Something happened.' };
    const outs = new Set<string>();
    for (const id of ['tabloide', 'poeta', 'cinico', 'locutor', 'cronista'] as const) {
      const s = mk('r13-n', undefined, { storyteller: id });
      const v = narrate(s, txt, 'bad', 'ev');
      expect(v.pt).not.toBe(txt.pt);
      expect(v.en).toContain('Something happened.');
      outs.add(v.en);
    }
    expect(outs.size).toBe(5);
    const m = mk('r13-n');
    expect(narrate(m, txt, 'bad', 'ev')).toEqual(txt);
  });

  it('toda seção tem ajuda bilíngue', () => {
    for (const k of ['storyteller', 'origin', 'ambition', 'traits', 'path', 'year', 'mode', 'rivals', 'card', 'mutators']) {
      expect(HELP[k]?.pt).toBeTruthy();
      expect(HELP[k]?.en).toBeTruthy();
    }
  });
});
