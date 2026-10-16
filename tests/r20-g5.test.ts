// Rodada 20 (G5) — Shows por intenção: conflitos duros × brandos (mesma conta do acerto) e turnê em rascunho.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { CITIES } from '../src/data/world';
import { cal17, clashOf, playerShows, weekOfDay } from '../src/sim/sys/clash17';
import { draftConflicts20, hardConflictCount20, showConflict20 } from '../src/sim/sys/shows20';
import type { Tour } from '../src/sim/xtypes';
import { addShow12 } from '../src/sim/sys/tour12';

describe('r20 G5 shows20', () => {
  const s = createGame(defaultConfig('r20g5', { startYear: 1975 }));
  const acts = Object.values(s.acts).filter((a) => a.status === 'active' && a.members.length > 0).sort((a, b) => b.fame - a.fame);
  const mine = acts[acts.length - 1];
  const rival = acts[0];
  mine.owner = 'player';
  const [c1, c2] = [CITIES[0].id, CITIES[1].id];
  const day = s.week * 7 + 21;
  const w = weekOfDay(day);
  s.tours.push({ id: 't20', actId: mine.id, name: 'T20', stops: [{ cityId: c1, day, tier: 1, price: 500, capacity: 800, sold: 0, merch: 0, status: 'scheduled', travelDays: 1 }], setlist: [], minutes: 60, production: 1, role: 'headline', crew: 4, pay: 'door', costReserved: 0, revenue: 0, costs: 0, status: 'planned', log: [], accidents: 0 } as Tour);

  it('sem segunda data: nenhum conflito duro', () => {
    expect(hardConflictCount20(s)).toBe(0);
    expect(draftConflicts20(s, mine.id, [{ cityId: c2, day: day + 21 }]).hard).toHaveLength(0);
  });

  it('mesma semana em outra cidade = conflito duro (dos dois lados e no rascunho)', () => {
    addShow12(s, { id: 'sh20', actId: mine.id, by: 'agent', city: c2, week: w, tier: 1, deal: 'guarantee', fee: 0, pct: 0.85, pmult: 1, promo: 1, rate: 0, deposit: 0 }); // UNI-4: show avulso = turnê de 1 data
    expect(playerShows(s).filter((x) => x.w === w)).toHaveLength(2);
    expect(hardConflictCount20(s)).toBe(2);
    const d = draftConflicts20(s, mine.id, [{ cityId: c1, day: day + 1 }]);
    expect(d.hard.length).toBe(1);
    expect(d.hard[0].city).toBe(c1);
  });

  it('conflito brando usa exatamente a conta de clash17 (a que o acerto aplica)', () => {
    cal17(s).npc.push({ a: rival.id, c: c1, w, cap: 2000 });
    const x = playerShows(s).find((y) => y.city === c1 && y.w === w)!;
    const c = showConflict20(s, x);
    const k = clashOf(s, mine, c1, w);
    expect(c.soft).toBeCloseTo(1 - k.mult, 10);
    expect(c.why.length).toBe(k.why.length);
  });
});
