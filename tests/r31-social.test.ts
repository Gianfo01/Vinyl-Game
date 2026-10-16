// Masters 31 (31.3 · F) — grafo social de todos com todos (sim/social31.ts + sys/social31sys.ts).

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { playMonth } from '../src/sim/playbot16';
import { advanceMonth } from '../src/sim/tick';
import { emitFact } from '../src/sim/facts17';
import { l } from '../src/data/world';
import { rngSnapshot19 } from '../src/sim/rng19';
import { SOC31, SOC31_PERF, coolMonth31, edgeCount31, meNode31, meet31, neighbors31, shiftTie31, soc31, storedTie31, tie31 } from '../src/sim/social31';
import { askIntro31, howMet31, introVia31, knowsMe31, myKnown31, socialMonth31, tieLabel31 } from '../src/sim/sys/social31sys';

const npcs = (s: ReturnType<typeof createGame>) => Object.values(s.persons).filter((p) => p.alive && !p.isPlayer);

describe('r31 social — conhecidos, amigos e rivais', () => {
  it('nunca se viram = sem laço; conhecer guarda o par uma vez só (sem direção duplicada), com como e quando', () => {
    const s = createGame(defaultConfig('r31-soc-a', { startYear: 1975 }));
    const [a, b, c] = npcs(s).filter((p) => !Object.values(s.acts).some((x) => x.members.includes(p.id))).slice(0, 3);
    const [x, y, z] = a && b && c ? [a.id, b.id, c.id] : npcs(s).slice(-3).map((p) => p.id);
    const before = tie31(s, x, z);
    expect(before?.derived ? true : before === undefined).toBe(true);
    expect(meet31(s, x, y, 'festival')).toBe(true);
    expect(meet31(s, y, x, 'festival')).toBe(false); // mesmo par, outra ordem
    expect(Object.keys(soc31(s).e).filter((k) => k.includes(x) && k.includes(y)).length).toBe(1);
    const t = tie31(s, x, y)!;
    expect(t.how).toBe('festival');
    expect(t.since).toBe(s.week);
    expect(howMet31(s, t).pt).toMatch(/festival/);
    // dimensões separadas e orientadas: respeito de x por y ≠ de y por x
    shiftTie31(s, x, y, { r: 10, t: -5, v: 30 });
    expect(tie31(s, x, y)!.r).toBe(10);
    expect(tie31(s, y, x)!.r).toBe(0);
    expect(tie31(s, y, x)!.rBack).toBe(10);
    expect(tie31(s, x, y)!.v).toBe(30);
    expect(tieLabel31(s, x, y).pt).toBe('rivais');
  });

  it('apresentação por amigo em comum (NPC↔NPC e para você) e limite por pessoa (o mais frio sai)', () => {
    const s = createGame(defaultConfig('r31-soc-b', { startYear: 1975 }));
    const me = meNode31(s);
    const ps = npcs(s).slice(0, SOC31.cap + 10).map((p) => p.id);
    const [f, t0] = [ps[0], ps[1]];
    meet31(s, me, f, 'visit', { i: 60 });
    meet31(s, f, t0, 'record', { i: 50 });
    expect(introVia31(s, t0)).toBe(f);
    expect(askIntro31(s, t0)).toBeNull();
    const t = tie31(s, me, t0)!;
    expect(t.how).toBe('intro');
    expect(t.by).toBe(f);
    // limite: um NPC com laços demais perde o mais frio
    const hub = ps[2];
    for (const o of ps.slice(3)) meet31(s, hub, o, 'stage');
    expect(neighbors31(s, hub).length).toBeLessThanOrEqual(SOC31.cap);
  });

  it('fatos fazem gente se conhecer (assinatura, palco dividido, briga) e "não te conhece" é um estado', () => {
    const s = createGame(defaultConfig('r31-soc-c', { startYear: 1980 }));
    const acts = Object.values(s.acts).filter((a) => a.owner !== 'player' && !a.playerBand && a.members.length >= 1 && a.status !== 'retired' && a.status !== 'split');
    const [a1, a2] = acts;
    emitFact(s, { kind: 'show', actors: [a1.id, a2.id], severity: 10, text: l('show', 'show') });
    const h1 = a1.leaderId && a1.members.includes(a1.leaderId) ? a1.leaderId : a1.members[0];
    const h2 = a2.leaderId && a2.members.includes(a2.leaderId) ? a2.leaderId : a2.members[0];
    expect(tie31(s, h1, h2)?.how).toBe('stage');
    emitFact(s, { kind: 'feud', actors: [a1.id, a2.id], severity: 30, text: l('briga', 'feud') });
    expect(tie31(s, h1, h2)!.v).toBeGreaterThanOrEqual(20);
    // alguém do outro lado do mundo, sem contato nem opinião: não te conhece
    const far = npcs(s).find((p) => !tie31(s, meNode31(s), p.id));
    expect(far).toBeTruthy();
    expect(knowsMe31(s, `p:${far!.id}`)).toBe('none');
  });

  it('o tempo esfria a intimidade com piso e limpa laços frios de quem saiu de cena; o mês social não sorteia do motor', () => {
    const s = createGame(defaultConfig('r31-soc-d', { startYear: 1975 }));
    const [a, b] = npcs(s).slice(0, 2).map((p) => p.id);
    meet31(s, a, b, 'stage', { i: 40 });
    const w0 = s.week;
    s.week = w0 + 52 * 3;
    for (let i = 0; i < 40; i++) coolMonth31(s, () => false);
    expect(storedTie31(s, a, b)!.i).toBe(SOC31.floor);
    s.week = w0 + 52 * 10;
    coolMonth31(s, (id) => id === a);
    expect(storedTie31(s, a, b)).toBeUndefined();
    s.week = w0;
    const snap = rngSnapshot19(s);
    socialMonth31(s);
    expect(rngSnapshot19(s)).toBe(snap);
  });

  it('24 meses de robô: o grafo cresce com contato real, fica dentro do limite e custa pouco por mês', () => {
    const s = createGame(defaultConfig('r31-soc-e', { startYear: 1990, role: 'label' }));
    SOC31_PERF.ms = 0; SOC31_PERF.months = 0; SOC31_PERF.max = 0; SOC31_PERF.factMs = 0;
    let t = 0;
    for (let i = 0; i < 24; i++) { playMonth(s, 'balanced'); const t0 = performance.now(); advanceMonth(s); t += performance.now() - t0; }
    const n = edgeCount31(s);
    expect(n).toBeGreaterThan(20);
    const counts = new Map<string, number>();
    for (const k of Object.keys(soc31(s).e)) for (const x of k.split('|')) counts.set(x, (counts.get(x) ?? 0) + 1);
    const me = meNode31(s);
    for (const [x, c] of counts) expect(c).toBeLessThanOrEqual(x === me ? SOC31.capMe : SOC31.cap);
    expect(SOC31_PERF.months).toBe(24);
    const per = (SOC31_PERF.ms + SOC31_PERF.factMs) / SOC31_PERF.months;
    // o mês social é uma fração pequena do mês inteiro
    expect(per).toBeLessThan(Math.max(25, (t / 24) * 0.1));
    expect(myKnown31(s).length).toBeGreaterThan(0);
    console.log(`[r31-social] laços guardados: ${n} · mês social + ouvinte de fatos: média ${per.toFixed(2)} ms, máx ${SOC31_PERF.max.toFixed(2)} ms · mês inteiro: ${(t / 24).toFixed(0)} ms`);
  }, 240000);
});
