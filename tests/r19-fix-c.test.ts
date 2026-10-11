// Rodada 19 (onda 5, C — auditoria 8 §2, §6, §8): regras de contexto, vitórias pequenas e ctxFx nas decisões.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { emitEvent, resolveDecision } from '../src/sim/events';
import { credDelta19, crisisP19, rivalFest19, satur19, verdict19, renewP19, CTX19 } from '../src/sim/ctx19';
import { explain18 } from '../src/sim/explain18';
import { grantHold } from '../src/sim/holds17';
import { ag17, careerQ } from '../src/sim/sys/agenda17';
import { careers } from '../src/sim/sys/careers12';
import { ctxFx19 } from '../src/sim/sys/ctxsys19';
import { answerIssue, c12, mgr12 } from '../src/sim/sys/manager12';
import { PATHS18, pathScore18 } from '../src/sim/sys/paths18';
import { classics19, mgRel19 } from '../src/sim/sys/wins19';
import { ventures } from '../src/sim/sys/ventures9';
import { CTXFX19 } from '../src/sim/ext4';
import { playerActs, rngOf } from '../src/sim/util';
import type { Act, GameState } from '../src/sim/types';
import '../src/sim/sys';

const myAct = (s: GameState): Act => {
  const id = playerActs(s)[0];
  if (id) return s.acts[id];
  const a = Object.values(s.acts).filter((x) => x.members.length >= 1 && x.status !== 'retired' && x.status !== 'split').sort((x, y) => x.id.localeCompare(y.id))[0];
  a.owner = 'player';
  return a;
};

describe('r19 fix C — regras de contexto (§2)', () => {
  it('diretor × dedicação dependem de porte, energia e frentes', () => {
    const s = createGame(defaultConfig('r19-fc-1'));
    const st = careers(s);
    st.active = ['label'];
    ag17(s).inv.label = 'lead';
    const solo = careerQ(s, 'label').f;
    st.active = ['label', 'festival', 'publisher', 'studio'];
    for (const c of ['festival', 'publisher', 'studio']) ag17(s).inv[c] = 'normal';
    const busy = careerQ(s, 'label').f;
    expect(busy).toBeLessThan(solo);
    // diretor excelente vence a dedicação de quem toca várias frentes; diretor fraco não
    ag17(s).heads.label = { id: 'h1', name: 'Dir', skill: 100, salary: 1, since: 0, trait: '' };
    ag17(s).inv.label = 'deleg';
    const exc = careerQ(s, 'label').f;
    expect(exc).toBeGreaterThan(busy);
    ag17(s).heads.label.skill = 20;
    expect(careerQ(s, 'label').f).toBeLessThan(1);
    expect(explain18(s, 'agenda.careerQ', { id: 'label' })?.parts.length).toBeGreaterThan(0);
  });

  it('saturação depende do tipo da obra e do espaçamento', () => {
    const cat = [{ v: 100, y: 1950 }, { v: 10, y: 1970 }, { v: 20, y: 1971 }, { v: 30, y: 1972 }, { v: 40, y: 1973 }];
    // standard (clássico, alto valor, 15+ anos) aguenta 6 vidas seguidas; obra de nicho não
    expect(satur19(1975, cat, cat[0], 'cover', { lives: 6, last: 1975 }).v).toBeGreaterThan(1);
    expect(satur19(1975, cat, cat[1], 'cover', { lives: 6, last: 1975 }).v).toBeLessThan(1);
    // espaçamento: a mesma obra de nicho, 12 anos sem uso, volta a render (e ganha redescoberta)
    expect(satur19(1987, cat, cat[1], 'cover', { lives: 6, last: 1975 }).v).toBeGreaterThan(1.1);
  });

  it('credibilidade é julgada pelo consenso posterior, não pela qualidade oculta; quem viu antes ganha bônus', () => {
    const s = createGame(defaultConfig('r19-fc-2'));
    const rel = Object.values(s.releases)[0] ?? ({ id: 'x', critic: 80, peak: 3, totalUnits: 500000, certified: 'gold' } as never);
    const a = verdict19(s, { ...rel, q: 5 }).v, b = verdict19(s, { ...rel, q: 95 }).v;
    expect(a).toBe(b);
    const ahead = credDelta19(85, 80, 50), herd = credDelta19(50, 80, 50);
    expect(ahead.ahead).toBe(true);
    expect(ahead.d).toBeGreaterThan(herd.d);
  });

  it('festival rival pesa por distância, mês, gênero e porte', () => {
    const s = createGame(defaultConfig('r19-fc-3'));
    const lb = Object.values(s.labels)[0];
    const n = { kind: 'festival', labelId: lb.id, name: 'Rival Fest', city: lb.city, rep: 60, y: s.year };
    const vs = Array.from({ length: 12 }, (_, k) => rivalFest19(s, [n], { city: lb.city, month: k, rep: 50 }).v);
    const same = Math.min(...vs), mk = vs.indexOf(same);
    expect(same).toBeLessThan(0.95); // mesmo mês, mesma cidade
    expect(Math.max(...vs)).toBe(1); // meses longe: nenhum efeito
    // porte: rival grande contra festival pequeno pesa mais
    expect(rivalFest19(s, [{ ...n, rep: 100 }], { city: lb.city, month: mk, rep: 20 }).v).toBeLessThan(same);
    // cidade distante: nenhum efeito
    const far = Object.values(s.labels).find((x) => x.city !== lb.city && !rivalFest19(s, [{ ...n, city: x.city }], { city: lb.city, month: mk, rep: 50 }).rows.length);
    if (far) expect(rivalFest19(s, [{ ...n, city: far.city }], { city: lb.city, month: mk, rep: 50 }).v).toBe(1);
  });

  it('plano: sem plano −2, plano respeitado perdoa (0), plano quebrado −5', () => {
    const s = createGame(defaultConfig('r19-fc-4'));
    const a = Object.values(s.acts).find((x) => x.members.length && x.status !== 'retired' && !x.playerBand)!;
    ventures(s).mg.clients.push({ actId: a.id, rate: 0.15, since: s.week, sat: 70, earned: 0 });
    const x = c12(s, a.id);
    const run = (plan: 'none' | 'ok' | 'broken') => {
      x.trust = 50; x.issue = { w: s.week, t: { pt: 'p', en: 'p' } };
      x.plan = plan === 'none' ? undefined : ({ goals: [], steps: 1, w: s.week, broken: plan === 'broken' ? 1 : 0 } as never);
      answerIssue(s, a.id, 'explain');
      return x.trust - 50;
    };
    expect([run('none'), run('ok'), run('broken')]).toEqual([-2, 0, -5]);
  });

  it('crise e renovação dependem do temperamento', () => {
    const s = createGame(defaultConfig('r19-fc-5'));
    const a = myAct(s);
    const f0 = CTX19.facet;
    CTX19.facet = () => 90;
    const hot = crisisP19(s, a).v, loyal = renewP19(s, a, { trust: 50, pressured: 0, broken: 0, fame0: a.fame, since: s.week }).v;
    CTX19.facet = () => 10;
    const calm = crisisP19(s, a).v, fickle = renewP19(s, a, { trust: 50, pressured: 0, broken: 0, fame0: a.fame, since: s.week }).v;
    CTX19.facet = f0;
    expect(hot).toBeGreaterThan(calm);
    expect(loyal).toBeGreaterThan(fickle);
  });
});

describe('r19 fix C — ctxFx nas decisões (§8)', () => {
  const run = (hist: 'none' | 'grudge' | 'favor') => {
    const s = createGame(defaultConfig('r19-fc-ctx'));
    const a = myAct(s);
    a.trust = 50;
    const lead = a.members.map((id) => s.persons[id]).find((p) => p?.alive)!;
    if (hist === 'grudge') grantHold(s, { holder: lead.id, target: 'player', kind: 'grievance', strength: 70, months: 24, text: { pt: 'Mágoa', en: 'Grudge' } });
    if (hist === 'favor') grantHold(s, { holder: 'player', target: lead.id, kind: 'favor', strength: 80, months: 24, text: { pt: 'Favor', en: 'Favor' } });
    emitEvent(s, rngOf(s), 'controversial_remark', { act: a.id });
    const d = s.decisions.find((x) => x.eventId === 'controversial_remark');
    expect(d).toBeTruthy();
    const fx = ctxFx19(s, { act: a.id });
    resolveDecision(s, d!.id, 'support');
    return { dt: a.trust - 50, fx, s, a };
  };
  it('a mesma opção rende diferente com históricos diferentes', () => {
    const none = run('none'), grudge = run('grudge'), favor = run('favor');
    expect(grudge.fx.loss).toBeGreaterThan(none.fx.loss);
    expect(favor.fx.loss).toBeLessThan(none.fx.loss);
    expect(new Set([none.dt, grudge.dt, favor.dt]).size).toBeGreaterThan(1);
    // apoiar quem guardava mágoa amolece a mágoa (desfecho próprio)
    expect(grudge.s.memory.some((m) => m.kind === 'ctx19')).toBe(true);
    expect(explain18(grudge.s, 'ctx19.ctxfx', { act: grudge.a.id })?.parts.length).toBeGreaterThan(0);
  });
  it('quem tem mágoa aberta é sorteado com mais peso', () => {
    const s = createGame(defaultConfig('r19-fc-pick'));
    const a = myAct(s);
    expect(CTXFX19.pickW!(s, a)).toBe(1);
    grantHold(s, { holder: a.members[0], target: 'player', kind: 'grievance', strength: 80, months: 24, text: { pt: 'x', en: 'x' } });
    s.week += 1;
    expect(CTXFX19.pickW!(s, a)).toBeGreaterThan(1);
  });
});

describe('r19 fix C — vitórias pequenas (§6)', () => {
  it('caminhos novos e KPIs relativos do empresário', () => {
    const s = createGame(defaultConfig('r19-fc-6'));
    for (const id of ['mentor', 'house', 'outlet', 'nichepub', 'platform', 'free']) expect(PATHS18.some((p) => p.id === id)).toBe(true);
    const acts = Object.values(s.acts).filter((x) => x.members.length && x.status !== 'retired' && !x.playerBand).slice(0, 4);
    for (const a of acts) { ventures(s).mg.clients.push({ actId: a.id, rate: 0.15, since: s.week - 52 * 20, sat: 80, earned: 0 }); c12(s, a.id).trust = 85; }
    mgr12(s).ren = [8, 0];
    ventures(s).mg.rep = 70;
    const r = mgRel19(s);
    expect(r.years).toBeGreaterThan(19);
    expect(r.renew).toBe(100);
    // 4 clientes felizes por 20 anos chegam ao 2º marco mesmo sem estrelas
    expect(pathScore18(s, 'manager').score).toBeGreaterThanOrEqual(65);
    const got = classics19(s);
    expect(got).toContain('c19:first_client');
    expect(got).toContain('c19:first_renewal');
    expect(classics19(s)).toEqual([]);
  });
});
