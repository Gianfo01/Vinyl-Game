// Rodada 20c (N3): mercados ligados às coortes regionais, validação rápida (direitos, contratos, saves legados,
// nuvem, matriz modo × era × semente) e as duas dinâmicas novas (residência entre cenas, negociação coletiva).
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { cloudLoad17, cloudSave17, memDb17 } from '../src/core/cloud17';
import { cityById, type MarketId } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer, makeOffer, resolveOne } from '../src/sim/contracts';
import { applyMods, runSimHooks } from '../src/sim/ext4';
import { explain18 } from '../src/sim/explain18';
import { inboxKind18 } from '../src/sim/inbox18';
import { freeCash20, reservedAdvances20 } from '../src/sim/oblig20';
import { recoupTail20, revertWeek } from '../src/sim/rights';
import { applyWorld17, newRunConfig20 } from '../src/sim/start17';
import '../src/sim/sys';
import { P } from '../src/sim/sys/people/state';
import { exch20, hosts20, resCost20, startRes20 } from '../src/sim/sys/exch20';
import { rivals12 } from '../src/sim/sys/rivals12';
import { MK20, fansIn20, pushedTarget20, relConv20, relGains20, setOv20, settle20, target20, terr20 } from '../src/sim/sys/terr20';
import { answerUnion20, eligible20, openDemand20, union20 } from '../src/sim/sys/union20';
import { w4 } from '../src/sim/sys/world4/state';
import { advanceWeek } from '../src/sim/tick';
import type { Act, GameState, Offer, Release, RunConfig } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';
import { migrate } from '../src/ui/store';

const game = (y = 1975, seed = 'r20c'): GameState => createGame(defaultConfig(seed, { startYear: y }));
const freeAct = (s: GameState, skip: string[] = []): Act => Object.values(s.acts).find((x) => !x.owner && !x.playerBand && !x.catalogNo && x.status !== 'retired' && x.status !== 'split' && !skip.includes(x.id))!;
function mineAct(s: GameState): Act {
  const a = Object.values(s.acts).find((x) => !x.playerBand && !x.catalogNo && x.status !== 'retired' && x.status !== 'split' && cityById[x.city]?.market === 'na')!;
  a.owner = 'player'; a.fans = { casual: 40000, active: 9000, core: 1200 }; a.fame = 30;
  return a;
}
function rel(s: GameState, a: Act, terr: MarketId[], mk = 0.5): Release {
  const base = Object.values(s.releases)[0];
  const r = { ...base, id: 'r20c-rel', actId: a.id, owner: 'player', territories: terr, totalUnits: 0, live: true, marketingE: mk, week: s.week, weekly: [] } as Release;
  s.releases[r.id] = r;
  return r;
}
const sums = (s: GameState, a: Act) => [0, 1, 2].map((k) => MK20.reduce((t, m) => t + fansIn20(s, a, m)[k], 0));

describe('N3.1 mercados ligados às coortes', () => {
  it('vendas/streams/campanha nascem nos mercados do lançamento; preço e ofensiva mexem; conservação', () => {
    const s = game();
    s.x4.industry.pricing = 'normal';
    const a = mineAct(s);
    settle20(s, a);
    const r = rel(s, a, ['na', 'br']);
    relGains20(s); // linha de base
    r.totalUnits += 100_000;
    relGains20(s);
    const p = terr20(s).p[a.id]!;
    expect(Object.keys(p).sort()).toEqual(['br', 'na']);
    a.fans.casual += 10_000; a.fans.active += 600;
    settle20(s, a);
    expect(sums(s, a)).toEqual([a.fans.casual, a.fans.active, a.fans.core]);
    // preço regional mais baixo no br → peso maior lá; ofensiva rival no br → peso menor e alvo menor
    const w0 = relConv20(s, r, a).find((x) => x.m === 'br')!.w;
    setOv20(s, 'br', 'budget');
    const w1 = relConv20(s, r, a).find((x) => x.m === 'br')!.w;
    expect(w1).toBeGreaterThan(w0);
    setOv20(s, 'br', null);
    const lb = Object.values(s.labels)[0];
    rivals12(s).push.br = { lb: lb.id, until: s.week + 52 };
    expect(relConv20(s, r, a).find((x) => x.m === 'br')!.w).toBeLessThan(w0);
    expect(pushedTarget20(s, a).br).toBeLessThan(target20(s, a).br);
    rivals12(s).push.br.fought = 1;
    expect(relConv20(s, r, a).find((x) => x.m === 'br')!.push).toBe(0.95);
    // mais campanha puxa para o maior mercado-alvo pelo porte; total sempre 1
    expect(relConv20(s, r, a).reduce((t, x) => t + x.w, 0)).toBeCloseTo(1, 9);
    expect(explain18(s, 'terr20.demand', { act: a.id, mk: 'br' })!.parts.length).toBeGreaterThan(3);
  });
});

describe('N3.2 validação rápida', () => {
  it('direitos: teto da trava de recoupment', () => {
    const s = game(1998);
    const a = freeAct(s);
    s.player.cash = 10_000_000;
    const o: Offer = { ...defaultOffer(s, a), advance: 2_000_000, id: 'o-n3', week: s.week, status: 'pending' };
    expect(acceptOffer(s, a, o)).toBe(true);
    const c = s.contracts[a.contractId!];
    c.rights = { ...c.rights!, master: 'label', reversionYears: 5, reversionNeedsRecoup: true };
    expect(recoupTail20(s, c).revertAt).toBe(Infinity);
    c.rights.recoupCapYears = 7;
    expect(recoupTail20(s, c).revertAt).toBe(revertWeek(c) + 7 * 52);
  });
  it('contratos: oferta reserva caixa; recusa por caixa libera a reserva sem debitar', () => {
    const s = game(1998);
    const a = freeAct(s);
    s.player.cash = 2_000_000;
    const o = makeOffer(s, { ...defaultOffer(s, a), advance: 1_500_000 })!;
    expect(reservedAdvances20(s)).toBe(1_500_000);
    expect(freeCash20(s)).toBe(500_000);
    expect(makeOffer(s, { ...defaultOffer(s, freeAct(s, [a.id])), advance: 1_000_000 })).toBeNull();
    s.player.cash = 100_000;
    a.fame = 0; o.thinkUntil = -1;
    for (let i = 0; i < 40; i++) { o.status = 'pending'; o.note = undefined; expect(resolveOne(s, Rng.fromSeed(`n3|${i}`), o as Offer, false)).not.toBe('accepted'); }
    expect(s.player.cash).toBe(100_000);
    expect(reservedAdvances20(s)).toBe(0);
  });
  it('save legado (sem política nem estados novos) carrega e avança', () => {
    const s = game(1980, 'r20c-legacy');
    const raw = JSON.parse(JSON.stringify(s)) as GameState & { x4: Record<string, unknown> };
    for (const k of ['configSchemaVersion', 'worldPolicyVersion', 'initialWorldPolicy', 'futureCareerPolicy', 'futureDebutPolicy', 'identityPolicy'] as const) delete (raw.config as Partial<RunConfig>)[k];
    const x4 = raw.x4 as Record<string, unknown>; delete x4.exch20; delete x4.union20;
    const t = x4.terr20 as { ru?: unknown; lc?: unknown }; if (t) { delete t.ru; delete t.lc; }
    const g = migrate(raw);
    expect(g.x4.exch20).toBeTruthy();
    expect(g.x4.union20).toBeTruthy();
    for (let i = 0; i < 5; i++) advanceWeek(g);
    expect(g.week).toBeGreaterThan(s.week);
  });
  it('nuvem: publicar nova geração troca o ponteiro e não deixa pedaços órfãos', async () => {
    const db = memDb17();
    await cloudSave17(db, 'u', 's1', JSON.stringify({ v: 1 }), { name: 'a', year: 1, label: 'L' });
    const g1 = (db.store.get('data/users/u/saves/index/s1') as { gen: string }).gen;
    await cloudSave17(db, 'u', 's1', JSON.stringify({ v: 2 }), { name: 'a', year: 2, label: 'L' });
    const meta = db.store.get('data/users/u/saves/index/s1') as { gen: string; chunks: number };
    expect(meta.gen).not.toBe(g1);
    expect(await cloudLoad17(db, 'u', 's1')).toBe(JSON.stringify({ v: 2 }));
    expect([...db.store.keys()].filter((k) => k.includes('/saves/s1/')).length).toBe(meta.chunks);
  });
  it('matriz modo × era × semente: cria sem erro e sem nada datado no futuro', () => {
    for (const w of ['random', 'exact', 'real', 'snap', 'fiction', 'chaos']) for (const y of [1889, 1962, 2005]) for (const seed of w === 'random' ? ['m1', 'm2'] : ['m1']) {
      const c = newRunConfig20({ seed: `${seed}-${w}-${y}`, companyName: 'Selo' });
      applyWorld17(c, w);
      c.startYear = y; (c as RunConfig & { dbSize?: string }).dbSize = 'small';
      const s = createGame(c);
      expect(s.year).toBe(y);
      const bad = [
        ...Object.values(s.acts).filter((a) => a.formed > s.year || a.debutYear > s.year).map((a) => `act ${a.name} ${a.formed}`),
        ...Object.values(s.releases).filter((r) => r.year > s.year || r.week > s.week).map((r) => `rel ${r.title} ${r.year}`),
        ...Object.values(s.persons).filter((p) => p.born > s.year).map((p) => `person ${p.name} ${p.born}`),
      ];
      expect(bad, `${w} ${y} ${seed}`).toEqual([]);
    }
  });
});

describe('N3.3 dinâmicas novas', () => {
  it('residência: custo/bolsa pela época, qualidade, risco fora do mercado, fim com inspiração', () => {
    const s = game(1975);
    const a = mineAct(s);
    const h = hosts20(s, a)[0];
    expect(h.city).not.toBe(a.city);
    expect(resCost20(game(1920), 'act', a.id, h.city, 6).grant).toBe(0);
    s.player.cash = 50_000_000;
    const c0 = s.player.cash;
    const { cost, grant } = resCost20(s, 'act', a.id, h.city, 6);
    startRes20(s, 'act', a.id, h.city, h.genre, 6);
    expect(c0 - s.player.cash).toBe(cost - grant);
    expect(exch20(s).cur?.city).toBe(h.city);
    const song = { id: 'x', actId: a.id, genre: h.genre, q: 50 } as never;
    expect(applyMods(s, 'songQ', 50, { song, act: a }).value).toBeGreaterThan(50);
    const far = Object.values(cityById).find((c) => c.market !== cityById[h.city].market)!;
    const base = applyMods(s, 'tourRisk', 0.01, { act: a, cityId: far.id }).value;
    expect(base).toBeGreaterThan(0.01 - 1e-9);
    expect(startRes20(s, 'act', a.id, h.city, h.genre, 6).pt).toContain('Já há');
    s.week += 7;
    const insp = s.persons[a.members[0]].inspiration;
    runSimHooks('month', s, Rng.fromSeed('m'), {});
    expect(exch20(s).cur).toBeUndefined();
    expect(s.persons[a.members[0]].inspiration).toBeGreaterThanOrEqual(insp);
    expect(explain18(s, 'exch20.res', { act: a.id, city: h.city })).toBeTruthy();
  });
  it('negociação coletiva: quatro escolhas com efeitos; fatos; greve real suspende pautas; antes de 1900 nada', () => {
    const s = game(1975);
    const a = mineAct(s);
    const song = { id: 'y', actId: a.id, genre: a.genre, q: 50 } as never;
    openDemand20(s, 'session', 'credits');
    expect(P(s).inbox.some((m) => m.ref?.k18 === 'union20')).toBe(true);
    answerUnion20(s, 'accept', Rng.fromSeed('a'));
    expect(union20(s).credits).toBe(true);
    expect(applyMods(s, 'songQ', 50, { song, act: a }).value).toBeGreaterThan(50);
    openDemand20(s, 'road', 'safety');
    answerUnion20(s, 'lockout', Rng.fromSeed('b'));
    expect(union20(s).trust).toBeLessThan(60);
    const risk = applyMods(s, 'tourRisk', 0.01, { act: a, cityId: a.city }).value;
    expect(risk).toBeGreaterThan(0.01);
    openDemand20(s, 'session', 'pay');
    answerUnion20(s, 'nonunion', Rng.fromSeed('c'));
    expect(applyMods(s, 'songQ', 50, { song, act: a }).value).toBeLessThan(51);
    openDemand20(s, 'session', 'pay');
    const k = inboxKind18('union20')!.handle!(s, P(s).inbox[P(s).inbox.length - 1], 'negotiate', Rng.fromSeed('d'));
    expect(k.pt.length).toBeGreaterThan(5);
    expect(union20(s).pay.session).toBeGreaterThan(0);
    expect(explain18(s, 'union20.terms')).toBeTruthy();
    // greve real em vigor: sem pauta nova; antes de 1900 também não
    const t = game(1975, 'r20c-strike'); mineAct(t);
    union20(t).next = 0;
    expect(eligible20(t)).toBe(true);
    w4(t).strike = { from: t.week - 1, to: t.week + 100, name: 'Petrillo' } as never;
    expect(eligible20(t)).toBe(false);
    const o = game(1889, 'r20c-old'); mineAct(o);
    expect(eligible20(o)).toBe(false);
  });
});
