// Rodada 17 (onda 1, B) — diretor criativo = narrador (perfis + liberdade), 40+ situações para todos os personagens e
// o mundo orgânico dos NPCs (rompimentos, selos novos, carreiras, estratégias) com o porquê, respeitando os modos de
// história e o determinismo.
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { familyOf, l } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { DIR17, dir17 } from '../src/sim/director17';
import { applyMods } from '../src/sim/ext4';
import { facts17 } from '../src/sim/facts17';
import { histLocked } from '../src/sim/history15';
import { advanceMonth } from '../src/sim/tick';
import type { GameState } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';
import '../src/sim/sys/index';
import { rivalSignOk } from '../src/sim/sys/gate14';
import { foundLabel17, indieByChoice, leaveLabel17, npc17, npcWorld17 } from '../src/sim/sys/npc17';
import { SITS, situationById } from '../src/sim/sys/situations17';

const months = (s: GameState, n: number) => { for (let i = 0; i < n; i++) { advanceMonth(s); s.decisions.length = 0; } };

describe('r17 diretor criativo e mundo dos NPCs', () => {
  it('narrador = diretor: perfis diferentes e liberdade escala o mundo', () => {
    const s = createGame(defaultConfig('r17d-1'));
    s.config.storyteller = 'tabloide';
    const tab = dir17(s);
    s.config.storyteller = 'brisa';
    const bri = dir17(s);
    expect(tab.npc).toBeGreaterThan(bri.npc);
    expect(tab.drama).toBeGreaterThan(bri.drama);
    expect(tab.tone).toBeLessThan(bri.tone);
    s.config.freedom17 = 'wild';
    const w = dir17(s).world;
    s.config.freedom17 = 'tight';
    expect(w).toBeGreaterThan(dir17(s).world * 2);
    expect(Object.keys(DIR17)).toHaveLength(8);
  });

  it('40+ situações; escolha do NPC segue os traços', () => {
    expect(SITS.length).toBeGreaterThanOrEqual(40);
    const def = situationById('creative_clash')!;
    const ego = { facets: { ego: 95, teimosia: 95, empatia: 5, paciencia: 5, curiosidade: 30, humor: 30 } } as never;
    const kind = { facets: { ego: 5, teimosia: 5, empatia: 95, paciencia: 95, curiosidade: 30, humor: 30 } } as never;
    const w = (P: never, id: string) => def.options.find((o) => o.id === id)!.weightByTraits!(P, null as never, null as never);
    expect(w(ego, 'impose')).toBeGreaterThan(w(ego, 'compromise'));
    expect(w(kind, 'compromise')).toBeGreaterThan(w(kind, 'impose'));
  });

  it('selo fundado por NPC entra na lista; independente por opção recusa rivais', () => {
    const s = createGame(defaultConfig('r17d-2', { startYear: 1980 }));
    const r = Rng.fromSeed('t');
    const n0 = Object.keys(s.labels).length;
    const lb = foundLabel17(s, r, { by: 'p:x', name: 'Ana Teste', city: s.config.homeCity, genre: 'rock', cash: 50000, k: 'artist', why: l('teste', 'test') });
    expect(Object.keys(s.labels).length).toBe(n0 + 1);
    expect(lb.active && lb.leaderId).toBeTruthy();
    const a = Object.values(s.acts).find((x) => x.owner && x.owner !== 'player' && s.labels[x.owner] && !histLocked(s, x))!;
    leaveLabel17(s, r, a, s.labels[a.owner!], [l('teste', 'test')], undefined, 'indie');
    expect(a.owner).toBeNull();
    expect(indieByChoice(s, a.id)).toBe(true);
    expect(rivalSignOk(s, lb.id, a)).toBe(false);
    expect(npc17(s).log[0].t.pt).toContain('independente');
    expect(facts17(s).f.at(-1)!.src).toBe('npc17');
  });

  it('guerra de preços aparece no apelo com o porquê', () => {
    const s = createGame(defaultConfig('r17d-3', { startYear: 1985 }));
    const rel = Object.values(s.releases).find((x) => s.acts[x.actId] && x.territories.length)!;
    const act = s.acts[rel.actId];
    const ls = Object.values(s.labels).filter((x) => x.active);
    npc17(s).war.push({ a: ls[0].id, b: ls[1].id, fam: familyOf(act.genre), mk: rel.territories[0], from: s.week, until: s.week + 30 });
    const m = applyMods(s, 'appeal', 100, { release: rel, act });
    expect(m.factors.some((f) => f.label.en.includes('Price war'))).toBe(true);
  });

  it('mundo solto gera jogadas com porquê, é determinístico e respeita a vida real exata', () => {
    const run = (seed: string, history?: 'strict') => {
      const s = createGame(defaultConfig(seed, { startYear: 1972, realNames: true, ...(history ? { history } : {}) }));
      s.config.freedom17 = 'wild';
      s.config.storyteller = 'cronista';
      months(s, 18);
      for (let i = 0; i < 18; i++) npcWorld17(s); // mais meses de mundo sem o resto da simulação (rápido)
      return s;
    };
    const a = run('r17d-4');
    const b = run('r17d-4');
    const la = npc17(a).log;
    expect(la.length).toBeGreaterThan(3);
    expect(la.map((x) => x.t.en)).toEqual(npc17(b).log.map((x) => x.t.en));
    expect(facts17(a).f.some((f) => f.src === 'npc17')).toBe(true);
    const st = run('r17d-5', 'strict');
    for (const m of npc17(st).log) if (m.a && st.acts[m.a]?.catalogNo ) expect(histLocked(st, st.acts[m.a])).toBe(false);
  }, 240000);
});
