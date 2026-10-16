// R31 · revisão da onda 2 (W2-REV): travas e correções achadas pelo revisor.
//   1. teclas 1–9 da cena só com a cena por cima e o foco dentro dela;
//   2. "Agenda do elenco: Eu decido" vale para quem assina depois;
//   3. turnês/festival passam pelo orçamento e pelo "me pergunte acima de";
//   4. A&R delegado respeita "Gastos da equipe" (teto e reserva sobre o caixa livre);
//   5. desfazer grava "não repetir" (ato + responsabilidade) e estorna o gasto;
//   6. rescindir só clássico/360; 7. opção de formação sem casar prefixo; 8. a tela de delegação não grava ao abrir;
//   9. contraproposta devolve o motivo; 10. proposta recusada pela cena sai das ofertas; 11. textos; 12. um diário só.
import { ownFests } from '../src/sim/sys/feststore';
import { describe, expect, it } from 'vitest';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, counterWhy, defaultOffer, makeOffer, offerEligible29 } from '../src/sim/contracts';
import {
  RESP31, asks31, autoLog31, blocked31, excs31, lockWhy31, logWho31, qualified31, set31, setDir31, setMode31, spent31, stat31, staffFor31, undo31, usd31,
} from '../src/sim/deleg31';
import { agendaCount31, anrMonth31, setAgendaMode31 } from '../src/sim/sys/deleg31run';
import { addOrder, d16, quality, runStaff } from '../src/sim/sys/deleg16';
import { roleLoads } from '../src/sim/sys/capacity14';
import { budgetLeft, overCapacity, pace8 } from '../src/sim/sys/pacing8';
import { shows12 } from '../src/sim/sys/tour12';
import { createFestival } from '../src/sim/sys/live/festival';
import { myContract31, rescind31, rescindQuote31 } from '../src/sim/r31/rescind31';
import { rng19 } from '../src/sim/rng19';
import { advanceMonth } from '../src/sim/tick';
import { playerActs } from '../src/sim/util';
import type { Act, GameState, StaffMember } from '../src/sim/types';
import { decideScene31, joinOf31, sceneKeyOk31, sceneTargets31 } from '../src/ui/r31/scene31core';

const game = (seed: string, y = 1975): GameState => {
  const s = createGame(defaultConfig(seed, { startYear: y, scenario: 'established' }));
  s.player.cash = 50_000_000_00;
  return s;
};
const hire = (s: GameState, role: string, skill = 70, id = `st-${role}`): StaffMember => {
  s.player.staff = s.player.staff.filter((x) => x.role !== role);
  const st: StaffMember = { id, name: `Teste ${role}`, role, skill, salary: 100_000, hiredWeek: s.week };
  s.player.staff.push(st);
  return st;
};
const scoutSome = (s: GameState, n = 30): Act[] => {
  const free = Object.values(s.acts).filter((a) => offerEligible29(s, a, 'classic').ok && !s.knowledge[a.id]).sort((a, b) => (a.id < b.id ? -1 : 1)).slice(0, n);
  for (const a of free) s.knowledge[a.id] = { actId: a.id, degree: 3, stage: 'investigating', bias: 0, updatedWeek: s.week, source: 'test' };
  return free;
};
/** Um ato do elenco para receber ordens de turnê (como no r16-delegate). */
const tourAct = (s: GameState): Act => {
  const act = spawnProceduralAct(s, rng19(s, 'act'), { city: s.config.homeCity });
  act.owner = 'player'; act.fame = 45; act.momentum = 60;
  return act;
};

describe('W2-REV · cena: teclas e confirmação', () => {
  it('1–9 só com a cena na janela de cima e o alvo dentro dela', () => {
    const inside = {}, outside = {};
    const own = { contains: (n: unknown) => n === inside };
    const other = { contains: () => true };
    expect(sceneKeyOk31(own, [own], inside)).toBe(true);
    expect(sceneKeyOk31(own, [own, other], inside)).toBe(false); // Ficha aberta por cima
    expect(sceneKeyOk31(own, [own], outside)).toBe(false); // foco fora da cena
    expect(sceneKeyOk31(null, [own], inside)).toBe(false);
  });
  it('opção de formação: igualdade de id, não prefixo (a1 × a1z)', () => {
    expect(joinOf31('mo.join:a1', 'a1')).toBe(true);
    expect(joinOf31('mo.join:a1:p7', 'a1')).toBe(true);
    expect(joinOf31('mo.join:a1z', 'a1')).toBe(false);
    expect(joinOf31('mo.join:a1z:p7', 'a1')).toBe(false);
  });
});

describe('W2-REV · delegação', () => {
  it('"Agenda do elenco: Eu decido" vale para quem assina depois', () => {
    const s = game('w2rev-ag');
    expect(setAgendaMode31(s, 'me')).toBeNull();
    const a = scoutSome(s, 1)[0];
    const o = makeOffer(s, defaultOffer(s, a))!;
    expect(o).toBeTruthy();
    expect(acceptOffer(s, a, o)).toBe(true);
    expect(s.delegated[a.id]).toBe(false);
    expect(agendaCount31(s).team).toBe(0);
    // e com a regra, quem assina fica com a equipe (como antes)
    const s2 = game('w2rev-ag');
    const b = scoutSome(s2, 1)[0];
    const o2 = makeOffer(s2, defaultOffer(s2, b))!;
    expect(acceptOffer(s2, b, o2)).toBe(true);
    expect(s2.delegated[b.id]).toBe(true);
  });

  it('festival: "me pergunte acima de" trava o cachê da atração (exceção) e o orçamento conta o gasto', () => {
    const run = (ask: number): { s: GameState; signed: number } => {
      const s = game('w2rev-fest');
      const ag = hire(s, 'booking_agent', 80);
      const f = createFestival(s, 'Teste Fest', s.config.homeCity, (s.month + 3) % 12);
      if (!('id' in f)) throw new Error('festival');
      expect(addOrder(s, ag.id, 'festival', { per: 3, budget: 0 })).toBeNull();
      if (ask) { expect(setMode31(s, 'tour', 'partial')).toBeNull(); setDir31(s, 'tour', { ask }); }
      const n0 = f.lineup.length;
      runStaff(s, rng19(s, 'deleg16'), ag);
      return { s, signed: ownFests(s)[0].lineup.length - n0 };
    };
    const free = run(0);
    expect(free.signed).toBeGreaterThan(0);
    expect(spent31(free.s, 'tour')).toBeGreaterThan(0); // o cachê entra no gasto do mês
    const capped = run(1);
    expect(capped.signed).toBe(0);
    expect(excs31(capped.s).some((e) => e.r === 'tour' && e.k === 'ask')).toBe(true);
  });

  it('A&R delegado respeita "Gastos da equipe": teto por gasto e reserva sobre o caixa livre', () => {
    const s = game('w2rev-anr');
    scoutSome(s);
    hire(s, 'anr');
    expect(setMode31(s, 'anr', 'staff')).toBeNull();
    setDir31(s, 'anr', { per: 3 });
    setDir31(s, 'finance', { cap: 1 });
    const n0 = s.offers.length;
    anrMonth31(s);
    expect(s.offers.length).toBe(n0);
    expect(autoLog31(s, { r: 'anr' }).some((e) => e.x === 'gate')).toBe(true);
    expect(excs31(s).some((e) => e.k === 'spend')).toBe(true);
    // reserva: caixa livre baixo trava mesmo sem teto
    const s2 = game('w2rev-anr');
    scoutSome(s2);
    hire(s2, 'anr');
    setMode31(s2, 'anr', 'staff');
    setDir31(s2, 'finance', { reserve: 24 });
    s2.player.cash = 1;
    anrMonth31(s2);
    expect(s2.offers.length).toBe(0);
    expect(excs31(s2).some((e) => e.k === 'reserve')).toBe(true);
  });

  it('desfazer: não repete o mesmo ato por 12 semanas e estorna o gasto do mês', () => {
    const s = game('w2rev-undo');
    scoutSome(s);
    hire(s, 'anr');
    setMode31(s, 'anr', 'staff');
    anrMonth31(s);
    const e = autoLog31(s, { r: 'anr' }).find((x) => x.x === 'offer')!;
    expect(e).toBeTruthy();
    expect(spent31(s, 'anr')).toBeGreaterThan(0);
    expect(undo31(s, e.id)).toBeNull();
    expect(spent31(s, 'anr')).toBe(0);
    expect(blocked31(s, 'anr', e.act)).toBe(true);
    anrMonth31(s); // o ciclo seguinte não refaz a proposta desfeita
    expect(s.offers.some((o) => o.actId === e.act && o.status === 'pending')).toBe(false);
    s.week += 13;
    expect(blocked31(s, 'anr', e.act)).toBe(false);
  });

  it('desfazer um show do agente: o agente não marca outro para o mesmo ato', () => {
    const s = game('w2rev-show');
    const act = tourAct(s);
    advanceMonth(s);
    const ag = hire(s, 'booking_agent', 85);
    expect(addOrder(s, ag.id, 'tour', { actId: act.id, per: 2, floor: 0 })).toBeNull();
    runStaff(s, rng19(s, 'deleg16'), ag);
    const e = autoLog31(s, { r: 'tour', act: act.id }).find((x) => x.undo?.k === 'show');
    expect(e).toBeTruthy();
    expect(undo31(s, e!.id)).toBeNull();
    const n = shows12(s).filter((x) => x.actId === act.id && x.status === 'planned').length;
    runStaff(s, rng19(s, 'deleg16'), ag);
    expect(shows12(s).filter((x) => x.actId === act.id && x.status === 'planned').length).toBe(n);
    expect(autoLog31(s, { r: 'tour', act: act.id, n: 1 })[0].t.pt).toContain('desfez');
  });

  it('abrir a tela de delegação (as leituras dela) não muda o save', () => {
    const s = game('w2rev-ro');
    hire(s, 'anr'); hire(s, 'booking_agent'); hire(s, 'promoter');
    delete (s.x4 as unknown as { cap14?: unknown }).cap14;
    const p = pace8(s);
    p.spentMonth = -5; p.spent = { x: 123 };
    const before = JSON.stringify(s);
    roleLoads(s);
    for (const id of playerActs(s)) budgetLeft(s, id);
    for (const st of s.player.staff) quality(s, st);
    overCapacity(s); agendaCount31(s); asks31(s); excs31(s, s.week - 5); autoLog31(s, { n: 60 });
    for (const def of RESP31) { set31(s, def.id); stat31(s, def.id); qualified31(s, def.id); staffFor31(s, def.id); for (const m of def.modes) lockWhy31(s, def.id, m); }
    expect(JSON.stringify(s)).toBe(before);
    void d16;
  });

  it('textos: quem decidiu traduzido na tela; dinheiro e cargos no idioma certo', () => {
    const s = game('w2rev-txt');
    s.player.staff = s.player.staff.filter((x) => x.role !== 'anr');
    setMode31(s, 'agenda', 'me');
    const e = autoLog31(s, { n: 1 })[0];
    expect(e.who).toBe('player');
    expect(logWho31(e)).toEqual({ pt: 'Você', en: 'You' });
    const why = lockWhy31(s, 'anr', 'staff')!;
    expect(why.en).not.toContain('Executivo'); // cargo em inglês no texto em inglês
    expect(why.en).toMatch(/A&R|scout/i);
    expect(usd31(12500).pt).toBe('$12,5 mil');
    expect(usd31(12500).en).toBe('$12.5k');
  });
});

describe('W2-REV · contratos', () => {
  it('rescindir: só clássico/360 (produção e JV têm a saída própria); uma entrada no diário', () => {
    const s = game('w2rev-resc');
    const ids = playerActs(s).filter((id) => myContract31(s, s.acts[id]));
    expect(ids.length).toBeGreaterThan(1);
    const [a, b] = ids;
    const c = s.contracts[s.acts[a].contractId!];
    c.model = 'production';
    expect(myContract31(s, s.acts[a])).toBeUndefined();
    const q = rescindQuote31(s, a);
    expect(q.lock?.why.pt).toContain('produção');
    expect(rescind31(s, a).ok).toBe(false);
    c.model = 'jv';
    expect(rescindQuote31(s, a).lock?.why.pt).toContain('Joint venture');
    // clássico: rescinde e escreve UMA entrada no diário
    const m0 = s.memory.length;
    const r = rescind31(s, b);
    expect(r.ok).toBe(true);
    expect(s.memory.slice(m0).filter((x) => x.actId === b).length).toBe(1);
  });

  it('contraproposta: o motivo volta quando não fecha', () => {
    const s = game('w2rev-ctr');
    expect(counterWhy(s, 'nada')).not.toBeNull();
    const a = scoutSome(s, 1)[0];
    const o = makeOffer(s, defaultOffer(s, a))!;
    o.status = 'counter';
    expect(counterWhy(s, o.id)).toBeNull();
    s.player.cash = 0;
    expect(counterWhy(s, o.id)?.pt).toMatch(/[Cc]aixa/);
  });

  it('proposta padrão pela cena: recusada sai das ofertas, como no formulário', () => {
    let seen = 0;
    for (const seed of ['w2rev-n1', 'w2rev-n2', 'w2rev-n3', 'w2rev-n4', 'w2rev-n5', 'w2rev-n6']) { // UNI-4: mundo novo (registros únicos) — mais sementes para achar uma recusa
      const s0 = game(seed);
      scoutSome(s0, 40);
      for (const t of sceneTargets31(s0, 'nego').slice(0, 25)) {
        const s = structuredClone(s0);
        const out = decideScene31(s, 'nego', { id: t.id }, 'offer');
        if (out.ok || !/recusou/.test(out.text.pt)) continue;
        seen++;
        expect(s.offers.some((x) => x.actId === t.id)).toBe(false);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});
