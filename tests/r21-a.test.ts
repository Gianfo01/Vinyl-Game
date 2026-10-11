// Revisão 21 (A) — núcleo de tempo e capacidade: uma fórmula só de carga (A-1/A-2), reserva com o mês
// aberto (A-3) e cancelar plano iniciado (A-4).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { advanceMonth, advanceWeek } from '../src/sim/tick';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { cancelPlan, checkCapacity, monthIndex, personLoad, reservePlan } from '../src/sim/capacity';
import { freeCapacity, setAgenda } from '../src/sim/agenda';
import { ag7 } from '../src/sim/sys/agenda7';
import type { Plan } from '../src/sim/xtypes';

function withAct(seed: string) {
  const s = createGame(defaultConfig(seed));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  s.player.cash += 5_000_000_00;
  s.player.initialCash += 5_000_000_00;
  s.delegated[act.id] = false;
  return { s, r, act };
}

/** Fecha o mês corrente e abre o seguinte (planos começam na abertura). */
function nextMonthOpen(s: ReturnType<typeof createGame>): void {
  advanceMonth(s);
  advanceWeek(s);
  expect(s.clock.opened).toBe(true);
}

describe('r21 A — carga única', () => {
  it('A-1: agenda manual + plano iniciado nunca passa de 100% (antes dava 131%)', () => {
    const { s, act } = withAct('r21a-1');
    s.agenda[act.id] = [{ action: 'gigs', params: { dates: 12 } }, { action: 'interview' }]; // 71 + 10
    const p = reservePlan(s, act.id, 'record', monthIndex(s) + 1) as Plan; // 50%
    expect('id' in p).toBe(true);
    nextMonthOpen(s);
    expect(p.status).toBe('started');
    expect(s.loadNow[act.id]).toBeGreaterThanOrEqual(50);
    expect(s.loadNow[act.id]).toBeLessThanOrEqual(100);
  });

  it('A-2: personLoad/checkCapacity/freeCapacity/setAgenda veem o plano iniciado no mês corrente', () => {
    const { s, act } = withAct('r21a-2');
    s.agenda[act.id] = [{ action: 'interview' }, { action: 'gigs', params: { dates: 4 } }]; // 10 + 29
    const p = reservePlan(s, act.id, 'record', monthIndex(s) + 1) as Plan;
    expect('id' in p).toBe(true);
    nextMonthOpen(s);
    const now = monthIndex(s);
    const pl = personLoad(s, act.members[0], now);
    expect(pl.parts.some((x) => x.label.pt.startsWith('Plano'))).toBe(true);
    expect(pl.total).toBe(s.loadNow[act.id]); // mesma conta que a agenda real do mês
    expect(freeCapacity(s, act)).toBe(100 - 50);
    expect(checkCapacity(s, act.members, now, 1, 100 - pl.total + 1)).not.toBeNull();
    expect(checkCapacity(s, act.members, now, 1, 100 - pl.total)).toBeNull();
    expect(setAgenda(s, act.id, [{ action: 'gigs', params: { dates: 12 } }])).toBe(false); // 71 > 50 livres
    expect(setAgenda(s, act.id, [{ action: 'gigs', params: { dates: 4 } }])).toBe(true);
  });
});

describe('r21 A — reservas', () => {
  it('A-3: com o mês já aberto a reserva para o mês corrente é recusada com mensagem', () => {
    const { s, act } = withAct('r21a-3');
    advanceWeek(s); // abre o mês (janeiro não fecha na 1.ª semana)
    expect(s.clock.opened).toBe(true);
    const now = monthIndex(s);
    const bad = reservePlan(s, act.id, 'record', now);
    expect('pt' in bad && /em curso/.test(bad.pt)).toBe(true);
    const ok = reservePlan(s, act.id, 'record', now + 1);
    expect('id' in ok).toBe(true);
  });

  it('A-4: cancelar plano iniciado tira as semanas seguintes da fila e mantém o mês corrente contado', () => {
    const { s, act } = withAct('r21a-4');
    const p = reservePlan(s, act.id, 'record', monthIndex(s) + 1, { months: 3, params: { week: 3 } }) as Plan;
    expect('id' in p).toBe(true);
    nextMonthOpen(s);
    const now = monthIndex(s);
    expect(p.status).toBe('started');
    expect(ag7(s).queue.some((q) => q.slot.params?.plan === p.id)).toBe(true);
    expect(cancelPlan(s, p.id)).toBe(true);
    expect(ag7(s).queue.some((q) => q.slot.params?.plan === p.id)).toBe(false);
    expect(p.months).toBe(1);
    expect(personLoad(s, act.members[0], now).total).toBeGreaterThanOrEqual(50); // o mês atual não volta
    expect(personLoad(s, act.members[0], now + 1).total).toBeLessThan(50); // os seguintes voltam
    advanceMonth(s);
    advanceWeek(s);
    expect(p.status).toBe('done');
  });
});
