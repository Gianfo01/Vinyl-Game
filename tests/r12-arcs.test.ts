// Rodada 12 — arcos (memória → decisão), rotinas pessoais e história do selo.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { defaultOffer, evaluateOffer } from '../src/sim/contracts';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { arcAdd, arcTitle, arcWeight, mediateChance } from '../src/sim/sys/arcs12';
import { life12, runRoutines } from '../src/sim/sys/life12';
import { labelStory } from '../src/sim/sys/story12';
import { ownerOf } from '../src/sim/sys/people/owner';
import { money } from '../src/sim/util';
import { l } from '../src/data/world';

describe('r12 arcos, rotinas e história', () => {
  it('o histórico pesa na proposta com o motivo à vista', () => {
    const s = createGame(defaultConfig('r12-arc', { startYear: 1975 }));
    const act = Object.values(s.acts).find((a) => !a.owner && a.status !== 'retired' && a.members.length)!;
    const o = defaultOffer(s, act);
    const before = evaluateOffer(s, act, o).score;
    arcAdd(s, act.id, 'backed', l('você bancou "Teste" em 1975.', 'you backed "Teste" in 1975.'), 0.35);
    expect(arcWeight(s, act).v).toBeGreaterThan(0.1);
    const ev = evaluateOffer(s, act, o);
    expect(ev.score).toBeGreaterThan(before);
    expect(ev.reasons.some((r) => r.en.includes('backed "Teste"'))).toBe(true);
    expect(arcTitle(s, act).en).toBe('The bet that became loyalty');
    const m0 = mediateChance(s, act.id);
    arcAdd(s, act.id, 'promise_broken', l('quebrou', 'broke'), -0.9);
    expect(mediateChance(s, act.id)).toBeLessThan(m0);
  });

  it('rotinas rodam sozinhas com o tempo livre e custam do bolso', () => {
    const s = createGame(defaultConfig('r12-rt', { startYear: 1980 }));
    const o = ownerOf(s);
    o.wealth = money(s, 50000); o.stress = 80; o.health = 60;
    const st = life12(s);
    st.rt = { therapy: 'need', gym: 'always', hobby: 'off' };
    const rep = runRoutines(s);
    expect(rep.done.length).toBe(2);
    expect(o.stress).toBeLessThan(80);
    expect(rep.w).toBeLessThan(0);
  });

  it('a história do selo junta capítulos e fotografias anuais', () => {
    const s = createGame(defaultConfig('r12-st', { startYear: 1990 }));
    for (let i = 0; i < 14; i++) advanceMonth(s);
    const st = labelStory(s);
    expect(st.snaps.length).toBeGreaterThanOrEqual(2);
    expect(st.years[1]).toBe(s.year);
    expect(st.chapters.every((c) => c.items.every((x) => x.y <= s.year))).toBe(true);
  });
});
