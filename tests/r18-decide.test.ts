// Rodada 18 (decide18) — consequências agora × depois: ecos atrasados com Rng próprio, condição no disparo, fio na
// Caixa, portões (bloqueada vira padrão), prazos curtos, aposta com odds, desbloqueio, 40+ decisões convertidas.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { conseq18, conseqKeys18, unlocked18 } from '../src/sim/decide18';
import { emitEvent, resolveDecision } from '../src/sim/events';
import { facts17 } from '../src/sim/facts17';
import { advanceMonth, advanceWeek } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { dec18, fire18, pending18 } from '../src/sim/sys/decide18';
import { P } from '../src/sim/sys/people/state';
import { playerActs, rngOf } from '../src/sim/util';
import type { GameState } from '../src/sim/types';
import '../src/sim/sys';

const myAct = (s: GameState) => {
  const id = playerActs(s).find((x) => s.acts[x].members.length >= 2);
  if (id) return s.acts[id];
  const a = Object.values(s.acts).filter((x) => x.members.length >= 2 && x.status !== 'retired' && x.status !== 'split').sort((x, y) => x.id.localeCompare(y.id))[0];
  a.owner = 'player';
  return a;
};
const ask = (s: GameState, id: string, ctx: Record<string, string | number>) => { emitEvent(s, rngOf(s), id, ctx); return s.decisions.find((d) => d.eventId === id)!; };

describe('r18 decide', () => {
  it('40+ decisões existentes têm ecos atrasados com dica sem spoiler', () => {
    const keys = conseqKeys18().filter((k) => k.startsWith('ev:') && !k.startsWith('ev:d18_') && conseq18(k)!.later?.length);
    expect(keys.length).toBeGreaterThanOrEqual(40);
    for (const k of keys) for (const e of conseq18(k)!.later!) { expect(e.hint.pt.length).toBeGreaterThan(5); expect(e.in[0]).toBeLessThanOrEqual(e.in[1]); }
  });

  it('escolha agenda eco; dispara depois com Fato, fio na Caixa e efeito', () => {
    const s = createGame(defaultConfig('r18-dec-1'));
    advanceMonth(s);
    const a = myAct(s);
    s.decisions = [];
    const d = ask(s, 'royalty_audit', { act: a.id });
    expect(d).toBeTruthy();
    resolveDecision(s, d.id, 'stall');
    const st = dec18(s);
    const e = st.q.find((x) => x.k === 'ev:royalty_audit:stall')!;
    expect(e).toBeTruthy();
    expect(e.due).toBeGreaterThan(s.week);
    expect(pending18(s).some((p) => p.hint.pt.includes('processo'))).toBe(true);
    e.p = 1;
    const trust0 = a.trust;
    const out = fire18(s, e)!;
    expect(out.tone).toBe('bad');
    expect(a.trust).toBeLessThan(trust0);
    const m = P(s).inbox.find((x) => x.ref?.thr === e.id.split('.')[0])!;
    expect(m.subject.pt).toContain('↳');
    expect(facts17(s).f.some((f) => f.kind === 'echo' && f.tags.includes('echo18'))).toBe(true);
  });

  it('eco com condição: promessa cumprida ou quebrada; determinístico por semente', () => {
    const run = (morale: number) => {
      const s = createGame(defaultConfig('r18-dec-2'));
      advanceMonth(s);
      const a = myAct(s);
      s.decisions = [];
      const pid = a.members[0];
      const d = ask(s, 'member_leaves', { act: a.id, person: pid });
      resolveDecision(s, d.id, 'convince');
      const e = dec18(s).q.find((x) => x.k === 'ev:member_leaves:convince')!;
      s.persons[pid].morale = morale;
      e.p = 1;
      return fire18(s, e)!;
    };
    expect(run(90).tone).toBe('mixed');
    expect(run(10).tone).toBe('miss');
    expect(run(10).text.pt).toBe(run(10).text.pt);
  });

  it('portão: opção travada vira a padrão; desbloqueio abre a opção depois', () => {
    const s = createGame(defaultConfig('r18-dec-3'));
    advanceMonth(s);
    const a = myAct(s);
    s.decisions = [];
    let d = ask(s, 'd18_press_lie', { act: a.id });
    resolveDecision(s, d.id, 'goodwill');
    expect(dec18(s).q.some((x) => x.k === 'ev:d18_press_lie:noco')).toBe(true); // travada → padrão
    d = ask(s, 'd18_charity', { act: a.id, city: s.config.homeCity });
    resolveDecision(s, d.id, 'donate');
    expect(unlocked18(s, 'goodwill18')).toBe(true);
    d = ask(s, 'd18_press_lie', { act: a.id });
    resolveDecision(s, d.id, 'goodwill');
    expect(dec18(s).q.filter((x) => x.k === 'ev:d18_press_lie:noco').length).toBe(1);
  });

  it('prazo curto vence na semana; aposta tem odds visíveis; etapa seguinte vira cartão', () => {
    const s = createGame(defaultConfig('r18-dec-4'));
    advanceMonth(s);
    const a = myAct(s);
    s.decisions = [];
    const d = ask(s, 'd18_flash_gig', { act: a.id, fee: 2000, dl18: s.week + 1 });
    advanceWeek(s);
    advanceWeek(s);
    expect(s.decisions.includes(d)).toBe(false);
    const od = conseq18('ev:d18_flash_gig:haggle')!.odds!(s, {});
    expect(od.p).toBeGreaterThan(0);
    expect(od.why.length).toBeGreaterThan(1);
    s.decisions = [];
    const pr = ask(s, 'd18_promise_solo', { act: a.id, person: a.members[0] });
    resolveDecision(s, pr.id, 'promise');
    const e = dec18(s).q.find((x) => x.k === 'ev:d18_promise_solo:promise')!;
    fire18(s, e);
    expect(s.decisions.some((x) => x.eventId === 'd18_promise_due')).toBe(true);
  });

  it('pulso do mês guarda séries e deltas', () => {
    const s = createGame(defaultConfig('r18-dec-5'));
    for (let i = 0; i < 3; i++) advanceMonth(s);
    const pl = dec18(s).pl;
    expect(pl.cash.length).toBeGreaterThanOrEqual(3);
    expect(pl.last).toBeTruthy();
  });
});
