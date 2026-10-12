// r23: cenários de outras profissões e novos selos — criam o jogo, o setup roda, a meta é número finito e o negócio
// da profissão já está aberto no início.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { liveOf, scenarioById, scenarioConfig, setNextGameSetup } from '../src/sim/sys/live';
import { SCENARIOS23 } from '../src/sim/sys/scenarios23';
import { ventures } from '../src/sim/sys/ventures9';
import type { GameState } from '../src/sim/types';

const start = (id: string): GameState => {
  const d = scenarioById[id];
  setNextGameSetup({ scenarioId: id });
  return createGame(scenarioConfig(d, defaultConfig(`r23-${id}`)));
};
const open: Record<string, (s: GameState) => boolean> = {
  festival: (s) => ventures(s).list.some((v) => v.kind === 'festival'),
  publisher: (s) => ventures(s).list.some((v) => v.kind === 'publisher' && (v.cat?.length ?? 0) > 0),
  studio: (s) => ventures(s).list.some((v) => v.kind === 'studio'),
  media: (s) => ventures(s).list.some((v) => v.kind === 'media'),
  booking: (s) => ventures(s).list.some((v) => v.kind === 'booking'),
  platform: (s) => ventures(s).list.some((v) => v.kind === 'platform'),
  venue: (s) => !!liveOf(s).venue,
  manager: (s) => ventures(s).mg.clients.length > 0,
  musician: (s) => Object.values(s.acts).some((a) => a.playerBand),
  label: () => true,
};

describe('r23 cenários', () => {
  it('todos os novos estão na lista e têm medalhas crescentes', () => {
    expect(SCENARIOS23.length).toBe(18);
    for (const d of SCENARIOS23) {
      expect(scenarioById[d.id]).toBe(d);
      expect(d.tiers[0]).toBeGreaterThan(0);
      expect(d.tiers[1]).toBeGreaterThan(d.tiers[0]);
      expect(d.tiers[2]).toBeGreaterThan(d.tiers[1]);
    }
  });

  it('config de profissão: carreiras e papel', () => {
    const c = scenarioConfig(scenarioById.funk_1989, defaultConfig('x'));
    expect(c.careers?.main).toEqual(['musician']);
    expect(c.role).toBe('artist');
    expect(scenarioConfig(scenarioById.festival_king, defaultConfig('x')).careers?.main).toEqual(['label', 'festival']);
    expect(scenarioConfig(scenarioById.tinpan_1910, defaultConfig('x')).careers?.main).toEqual(['label', 'publisher']);
    expect(scenarioById.sun_1954.scenario).toBe('emerging');
    expect(scenarioById.grunge_1989.scenario).toBe('emerging');
  });

  for (const d of [...SCENARIOS23, scenarioById.festival_king, scenarioById.tinpan_1910]) {
    it(`${d.id}: começa, abre o negócio e mede`, () => {
      const s = start(d.id);
      const run = liveOf(s).scenario;
      expect(run?.id).toBe(d.id);
      for (const c of d.careers ?? []) expect(open[c]?.(s), `${d.id}: ${c} aberto`).toBe(true);
      advanceMonth(s);
      const v = d.metric(s, run!.base);
      expect(Number.isFinite(v)).toBe(true);
      if (d.id === 'chitlin_1955') expect(v).toBeGreaterThanOrEqual(1);
      if (d.id === 'djrock_1951') expect(ventures(s).list.find((x) => x.kind === 'media')?.media).toBe('radio');
    }, 60_000);
  }
});
