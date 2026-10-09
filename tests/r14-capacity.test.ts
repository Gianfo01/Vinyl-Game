// Rodada 14: capacidade mensal por pessoa — você, banda, equipe e rivais.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer, makeOffer, signWithRival } from '../src/sim/contracts';
import { advanceMonth } from '../src/sim/tick';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { actCapacity, busyWhy, cap14, meetingCap, rivalSignCap, roleLoads, scoutInPerson } from '../src/sim/sys/capacity14';
import { energyLeft } from '../src/sim/sys/life';
import { scoutActionsPerMonth } from '../src/sim/scouting';

const mk = (seed: string) => {
  const s = createGame(defaultConfig(seed));
  return { s, r: rngOf(s) };
};

describe('capacidade 14', () => {
  it('ofertas: cota da equipe, depois o seu tempo, depois bloqueio explicado', () => {
    const { s, r } = mk('r14-cap-a');
    const cap = meetingCap(s);
    const e0 = energyLeft(s);
    let made = 0;
    for (let i = 0; i < cap + e0 + 2; i++) {
      const a = spawnProceduralAct(s, r, { city: s.config.homeCity });
      if (makeOffer(s, { ...defaultOffer(s, a) })) made++;
    }
    expect(made).toBe(cap + e0);
    expect(energyLeft(s)).toBe(0);
    expect(cap14(s).why?.pt).toMatch(/reuniões/);
  });

  it('selo rival não contrata sem limite no mês', () => {
    const { s, r } = mk('r14-cap-b');
    const lb = Object.values(s.labels).find((x) => x.active)!;
    lb.cash = 1e12;
    const before = lb.roster.length;
    for (let i = 0; i < 8; i++) signWithRival(s, spawnProceduralAct(s, r, { city: s.config.homeCity }), lb.id, r);
    expect(lb.roster.length - before).toBe(rivalSignCap(lb));
    // forçado (venda negociada) passa
    signWithRival(s, spawnProceduralAct(s, r, { city: s.config.homeCity }), lb.id, r, true);
    expect(lb.roster.length - before).toBe(rivalSignCap(lb) + 1);
  });

  it('banda sobrecarregada mostra quem está ocupado e acumula cansaço', () => {
    const { s, r } = mk('r14-cap-c');
    const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
    acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
    s.delegated[act.id] = false;
    s.agenda[act.id] = [{ action: 'gigs', params: { dates: 12 } }, { action: 'gigs', params: { dates: 12 } }];
    const c = actCapacity(s, act);
    expect(c.max).toBeGreaterThan(100);
    expect(c.free).toBe(0);
    expect(busyWhy(s, act, 10)?.pt).toMatch(/não o seu/);
    const id = act.members[0];
    advanceMonth(s);
    expect(cap14(s).over[id]).toBeGreaterThan(0);
    expect(cap14(s).log.some((x) => x.t.pt.includes(act.name))).toBe(true);
  });

  it('scouting em pessoa só depois da equipe e custa tempo livre', () => {
    const { s } = mk('r14-cap-d');
    expect(scoutInPerson(s)).not.toBeNull();
    s.scoutActionsUsed = scoutActionsPerMonth(s);
    const e = energyLeft(s);
    expect(scoutInPerson(s)).toBeNull();
    expect(energyLeft(s)).toBe(e - 1);
    expect(s.scoutActionsUsed).toBe(scoutActionsPerMonth(s) - 1);
  });

  it('equipe: carreiras delegadas pesam em empresários e administração', () => {
    const { s, r } = mk('r14-cap-e');
    s.player.staff.push({ id: 'st1', name: 'Ana', role: 'manager', skill: 40, salary: 1, hiredWeek: 0 });
    for (let i = 0; i < 6; i++) { const a = spawnProceduralAct(s, r, { city: s.config.homeCity }); acceptOffer(s, a, { ...defaultOffer(s, a), id: `o${i}`, week: 0, status: 'pending', advance: 0 }); }
    const m = roleLoads(s).find((x) => x.role === 'manager')!;
    expect(m.supply).toBe(3);
    expect(m.demand).toBeGreaterThanOrEqual(3);
  });
});
