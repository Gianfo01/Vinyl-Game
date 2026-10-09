// Rodada 11: no Novo Jogo dá para assumir qualquer gravadora que exista no ano de início.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame, labelPool, takeoverCandidates } from '../src/sim/worldgen';
import type { RunConfig } from '../src/sim/types';

describe('assumir qualquer gravadora do ano', () => {
  it('lista rivais e todo o catálogo fundado até o ano; as de fora entram no mundo com elenco mínimo', () => {
    const base = defaultConfig('r11-tk', { startYear: 1975, mode: 'historic', labels: { ids: ['imperial'] } }) as RunConfig;
    const cands = takeoverCandidates(base);
    const ids = new Set(cands.map((c) => c.label.id));
    for (const d of labelPool().filter((x) => x.founded <= 1975)) expect(ids.has(d.id), d.id).toBe(true);
    expect(cands.some((c) => c.label.id === 'imperial' && !c.extra)).toBe(true);
    const pick = cands.find((c) => c.extra && c.label.id === 'x_sire')!;
    expect(pick).toBeDefined();
    expect(pick.terms.roster).toBeGreaterThan(0);
    const s = createGame({ ...base, takeover: 'x_sire' });
    expect(s.config.takeover).toBe('x_sire');
    expect(s.labels.x_sire).toBeUndefined();
    expect(s.config.companyName).toBe(pick.label.name);
    expect(Object.values(s.acts).filter((a) => a.owner === 'player' && !a.playerBand).length).toBe(pick.terms.roster);
    // o resto do mundo não muda (Rng própria)
    expect(Object.keys(createGame({ ...base }).labels).sort()).toEqual(Object.keys(s.labels).sort());
    for (let i = 0; i < 2; i++) advanceMonth(s);
    expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
  });

  it('não lista gravadoras fundadas depois do ano de início', () => {
    const cands = takeoverCandidates(defaultConfig('r11-tk2', { startYear: 1950 }) as RunConfig);
    const pool = new Map(labelPool().map((d) => [d.id, d]));
    for (const c of cands) if (pool.has(c.label.id) && c.extra) expect(pool.get(c.label.id)!.founded).toBeLessThanOrEqual(1950);
  });
});
