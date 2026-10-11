// Rodada 20b (Y — novarun §9.2): procedência dos lançamentos (Documentado × Simulado) e Referência real × Nesta partida.
import { describe, expect, it } from 'vitest';
import { applyWorld17, newRunConfig20 } from '../src/sim/start17';
import { createGame } from '../src/sim/worldgen';
import { REAL_BASE, realDataOf } from '../src/sim/sys/realworld';
import { provOf20, realRef20, thisRun20 } from '../src/sim/prov20';
import type { GameState } from '../src/sim/types';

const realActs = (g: GameState) => Object.values(g.acts).filter((a) => (a.catalogNo ?? 0) >= REAL_BASE);

describe('r20b Y — procedência', () => {
  it('modo exato: discos reais anteriores ao início saem "doc"; o resto "sim"; ref só até o ano corrente', () => {
    const c = newRunConfig20({ seed: 'y1', companyName: 'Selo' });
    applyWorld17(c, 'exact');
    const g = createGame(c);
    const rels = Object.values(g.releases);
    expect(rels.every((r) => r.prov === 'doc' || r.prov === 'sim')).toBe(true);
    const docs = rels.filter((r) => r.prov === 'doc');
    expect(docs.length).toBeGreaterThan(0);
    for (const r of docs.slice(0, 50)) {
      const al = realDataOf(g.acts[r.actId])?.al ?? [];
      expect(al.some((x) => x[0] === r.title)).toBe(true);
    }
    for (const a of realActs(g).slice(0, 80)) {
      const ref = realRef20(g, a);
      expect(ref).not.toBeNull();
      expect(ref!.hits.every((x) => x.year <= g.year)).toBe(true);
      if (ref!.died !== undefined) expect(ref!.died).toBeLessThanOrEqual(g.year);
      expect(ref!.infoOnly).toBe(false);
      const run = thisRun20(g, a);
      expect(run.doc + run.sim).toBe(a.releases.filter((id) => g.releases[id]).length);
    }
  });

  it('reais em mundo aleatório: nada real anterior vira "doc"; referência só informativa', () => {
    const g = createGame(newRunConfig20({ seed: 'y2', companyName: 'Selo' }));
    expect(Object.values(g.releases).every((r) => provOf20(g, r) === 'sim')).toBe(true);
    const a = realActs(g)[0];
    expect(realRef20(g, a)?.infoOnly).toBe(true);
  });

  it('saves antigos sem prov: "sim", salvo título real do próprio ato; nomes reais desligados → sem referência', () => {
    const c = newRunConfig20({ seed: 'y3', companyName: 'Selo' });
    applyWorld17(c, 'exact');
    const g = createGame(c);
    const doc = Object.values(g.releases).find((r) => r.prov === 'doc')!;
    const sim = Object.values(g.releases).find((r) => r.prov === 'sim')!;
    delete doc.prov; delete sim.prov;
    expect(provOf20(g, doc)).toBe('doc');
    expect(provOf20(g, sim)).toBe('sim');
    g.config.realNames = false;
    expect(provOf20(g, doc)).toBe('sim');
    expect(realRef20(g, g.acts[doc.actId])).toBeNull();
  });
});
