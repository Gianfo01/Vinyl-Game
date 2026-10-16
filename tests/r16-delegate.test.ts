// Rodada 16: agentes de shows e promotores com ordens permanentes.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { hireStaff } from '../src/sim/economy';
import { advanceMonth } from '../src/sim/tick';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { addOrder, d16, delegates, handlersOf, log16, matchOffer, ordersOf, quality } from '../src/sim/sys/deleg16';
import { roleLoads } from '../src/sim/sys/capacity14';
import { shows12 } from '../src/sim/sys/tour12';
import { rng19 } from '../src/sim/rng19';

const setup = (seed: string) => {
  const s = createGame(defaultConfig(seed));
  const r = rng19(s, 'act');
  s.player.cash = 5_000_000_00;
  advanceMonth(s); // o mercado de profissionais passa a ter agentes e promotores
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
  act.owner = 'player'; act.fame = 45; act.momentum = 60;
  return { s, act };
};
const hire = (s: ReturnType<typeof setup>['s'], role: string) => {
  const pro = s.professionals.find((x) => x.role === role)!;
  expect(pro).toBeTruthy();
  expect(hireStaff(s, pro.id)).toBeNull();
  return s.player.staff.find((x) => x.id === pro.id)!;
};

describe('delegar 16', () => {
  it('mercado tem agentes e promotores; contratar, delegar turnê e ver resultado explicado', () => {
    const { s, act } = setup('r16-deleg-a');
    const ag = hire(s, 'booking_agent');
    expect(addOrder(s, ag.id, 'tour', { actId: act.id, per: 2, floor: 0 })).toBeNull();
    expect(addOrder(s, ag.id, 'radio', { actId: act.id })).not.toBeNull(); // função errada
    const n0 = shows12(s).length;
    advanceMonth(s);
    expect(shows12(s).length).toBeGreaterThan(n0);
    expect(log16(s, { staffId: ag.id }).some((x) => x.x === 'tour' && x.t.pt.length > 10 && x.t.en.length > 10)).toBe(true);
    expect(handlersOf(s, act.id).length).toBe(1);
    expect(quality(s, ag).q).toBeGreaterThan(0);
  });
  it('promotor: rádio gasta orçamento; capacidade limita a 3 ordens por mês', () => {
    const { s, act } = setup('r16-deleg-b');
    const pr = hire(s, 'promoter');
    const cash = s.player.cash;
    for (let i = 0; i < 5; i++) expect(addOrder(s, pr.id, 'radio', { actId: act.id, budget: 300 })).toBeNull();
    expect(addOrder(s, pr.id, 'radio', { actId: act.id, budget: 300 })).not.toBeNull(); // 5 no máximo
    advanceMonth(s);
    expect(s.player.cash).toBeLessThan(cash);
    expect(log16(s, { staffId: pr.id }).some((x) => x.t.pt.includes('não deu conta'))).toBe(true);
    expect(roleLoads(s).some((r) => r.role === 'promoter' && r.demand === 5)).toBe(true);
    expect(ordersOf(s, pr.id).length).toBe(5);
  });
  it('proposta de rival: cobrir mantém, ignorar perde a pessoa e as ordens', () => {
    const { s, act } = setup('r16-deleg-c');
    const ag = hire(s, 'booking_agent');
    addOrder(s, ag.id, 'tour', { actId: act.id });
    const lb = Object.values(s.labels).find((x) => x.active && x.id !== 'player')!;
    d16(s).pend.push({ staffId: ag.id, lb: lb.id, raise: 500, until: s.year * 12 + s.month });
    const sal = ag.salary;
    expect(matchOffer(s, ag.id)).toBeNull();
    expect(ag.salary).toBe(sal + 500);
    d16(s).pend.push({ staffId: ag.id, lb: lb.id, raise: 500, until: 0 });
    advanceMonth(s);
    expect(delegates(s).length).toBe(0);
    expect(ordersOf(s, ag.id).length).toBe(0);
  });
});
