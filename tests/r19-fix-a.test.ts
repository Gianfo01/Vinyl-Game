// Rodada 19 (onda 5, A): carreiras que sustentam a partida desde o mês 1 e economia interna sem dinheiro criado.
import { describe, expect, it } from 'vitest';
import type { Rng } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { monthlyCosts } from '../src/sim/economy';
import { resolveDecision } from '../src/sim/events';
import { consolOp18, fin18, opProfit18 } from '../src/sim/ledger18';
import '../src/sim/sys';
import { careers, roleFromMain } from '../src/sim/sys/careers12';
import { GROUND19, car19, festQ19, groundOf19, growGround19, starterCost19 } from '../src/sim/sys/careers19';
import { f12, festOf, proj12, sync12 } from '../src/sim/sys/fest12';
import { holdsBetween } from '../src/sim/holds17';
import { bizLabel19, bizProd19, intraPay19, intraTotal19, setHouse19 } from '../src/sim/sys/intra19';
import { festModel } from '../src/sim/sys/live/festival';
import { liveOf } from '../src/sim/sys/live/state';
import { c12, mgRenew12 } from '../src/sim/sys/manager12';
import { ownerOf } from '../src/sim/sys/people/owner';
import { prodOwn19 } from '../src/sim/sys/studio12';
import { mgCandidates, pitchClient, refusedWait9, upkeep, ventures } from '../src/sim/sys/ventures9';
import type { Act, GameState } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';

const no = { chance: () => false, next: () => 0.9, int: (a: number) => a, pick: <T>(x: T[]) => x[0], normal: () => 0 } as unknown as Rng;
const game = (main: string[], seed = 'r19-fa') => { const s = createGame(defaultConfig(seed, { startYear: 1975, role: roleFromMain(main), careers: { main, origin: 'roadie', ambition: 'legacy' } })); careers(s); return s; };
const purse = (s: GameState) => s.player.cash + ownerOf(s).wealth;
const actFor = (s: GameState, fame: number): Act => Object.values(s.acts).filter((a) => a.status !== 'retired' && a.status !== 'split' && a.members.length).sort((a, b) => Math.abs(a.fame - fame) - Math.abs(b.fame - fame))[0];

describe('r19 A — carreiras sem selo', () => {
  const label = game(['label']);
  const fest = game(['festival']);
  const mgr = game(['manager']);

  it('sede de selo só cobra com a carreira de selo; festival nasce com pacote pago do caixa (sem dinheiro do nada)', () => {
    expect(monthlyCosts(label).rent).toBeGreaterThan(0);
    expect(monthlyCosts(mgr).rent).toBe(0);
    expect(monthlyCosts(fest).rent).toBe(0);
    const v = ventures(fest).list.find((x) => x.kind === 'festival')!;
    expect(v).toBeTruthy();
    expect(car19(fest).starter[v.id]).toBe('festival');
    expect(label.player.cash - fest.player.cash).toBe(starterCost19(fest, 'festival'));
    expect(upkeep(fest, v)).toBeLessThan(upkeep(fest, { ...v, id: 'x' }));
    sync12(fest);
    const f = liveOf(fest).fests[0];
    expect(groundOf19(fest, f.id)).toBe(0);
    expect(festModel(fest, f).capacity).toBeLessThanOrEqual(GROUND19[0].cap);
    expect(growGround19(fest, f.id)).toBeTruthy(); // precisa de 1 edição
  });

  it('procura do festival cai abaixo da capacidade com line-up fraco e sobe com line-up forte', () => {
    const s = fest;
    const f = liveOf(s).fests[0];
    car19(s).ground[f.id] = 2; // terreno próprio: o teto é o portão
    const x = f12(s, f);
    x.cyc.phase = 'onsale';
    const weak = Object.values(s.acts).filter((a) => a.status !== 'retired' && a.status !== 'split' && a.fame < 8).slice(0, 2);
    f.lineup = weak.map((a) => ({ actId: a.id, fee: 0 }));
    const pw = proj12(s, f);
    expect(festQ19(s, f, weak).k).toBeLessThan(0.75);
    expect(pw.demand).toBeLessThan(pw.cap);
    const strong = Object.values(s.acts).filter((a) => a.status !== 'retired' && a.status !== 'split').sort((a, b) => b.fame - a.fame).slice(0, 3);
    f.lineup = strong.map((a) => ({ actId: a.id, fee: 0 }));
    expect(proj12(s, f).demand).toBeGreaterThan(pw.demand);
    expect(proj12(s, f).why.some((w) => w.pt.includes('Qualidade do line-up'))).toBe(true);
    f.lineup = [];
  });

  it('empresário: candidatos na faixa da reputação, espera após recusa, sem proposta do próprio selo vazio', () => {
    const s = mgr;
    const mg = ventures(s).mg;
    for (const a of mgCandidates(s)) expect(a.fame).toBeLessThanOrEqual(mg.rep + 30);
    const a = mgCandidates(s)[0];
    const r1 = pitchClient(s, no, a.id, 0.15);
    expect(r1.ok).toBe(false);
    expect(refusedWait9(s, a.id)).toBeGreaterThan(20);
    const r2 = pitchClient(s, no, a.id, 0.15);
    expect(r2.text.pt).toContain('semanas');
  });

  it('renovação do mandato vira cartão; liberar em bons termos deixa um favor', () => {
    const s = mgr;
    const a = actFor(s, 15);
    ventures(s).mg.clients.push({ actId: a.id, rate: 0.15, since: s.week, earned: 0 });
    c12(s, a.id);
    expect(mgRenew12.f(s, a.id, 0.5)).toBe(true);
    const d = s.decisions.find((x) => x.eventId === 'c19_mg_renew' && x.ctx.act === a.id)!;
    expect(d).toBeTruthy();
    expect(d.options.map((o) => o.id)).toEqual(['cut', 'promise', 'free', 'same']);
    resolveDecision(s, d.id, 'free');
    expect(ventures(s).mg.clients.some((c) => c.actId === a.id)).toBe(false);
    expect(holdsBetween(s, 'player', a.id).some((h) => h.kind === 'favor')).toBe(true);
  });
});

describe('r19 A — economia interna', () => {
  it('transferência interna não cria dinheiro e some no consolidado', () => {
    const s = game(['label', 'studio'], 'r19-fa2');
    const p0 = purse(s);
    const op0 = opProfit18(fin18(s).y[s.year]), c0 = consolOp18(fin18(s).y[s.year]);
    intraPay19(s, bizLabel19, bizProd19, 123456, 'test', 'Teste');
    expect(purse(s)).toBe(p0);
    expect(intraTotal19(s)).toBe(123456);
    const o = fin18(s).y[s.year];
    expect(opProfit18(o) - op0).toBe(-123456); // a DRE do selo vê o custo
    expect(consolOp18(o)).toBe(c0); // o consolidado elimina
  });

  it('produtor (você) no disco do próprio selo: débito no selo, crédito no produtor, recuperável e desconto da casa', () => {
    const s = game(['label', 'studio'], 'r19-fa3');
    const a = actFor(s, 20);
    const id = `k19${a.id}`;
    s.contracts[id] = { id, actId: a.id, party: 'player', model: 'classic', advance: 0, royalty: 0.15, termMonths: 48, startWeek: s.week, endWeek: s.week + 208, releasesOwed: 4, releasesDone: 0, creativeControl: false, publishing: false, share360: 0, recoupBalance: 0, promises: [] };
    a.owner = 'player'; a.contractId = id;
    const p0 = purse(s), w0 = ownerOf(s).wealth;
    const paid = prodOwn19.f(s, a, 500000, []);
    expect(purse(s)).toBe(p0);
    expect(ownerOf(s).wealth - w0).toBe(paid);
    expect(s.contracts[id].recoupBalance).toBe(paid);
    setHouse19(s, 'prod', 'discount');
    const half = prodOwn19.f(s, a, 500000, []);
    expect(half).toBe(250000);
    expect(purse(s)).toBe(p0);
    expect(holdsBetween(s, 'player', a.id).some((h) => h.kind === 'favor')).toBe(true);
  });

  it('cachê da própria banda no próprio festival é interno (soma do caixa não muda)', async () => {
    const s = game(['festival', 'musician'], 'r19-fa4');
    sync12(s);
    const f = liveOf(s).fests[0];
    const band = Object.values(s.acts).find((x) => x.playerBand)!;
    expect(band).toBeTruthy();
    const { ownPaid19 } = await import('../src/sim/sys/fest12');
    const p0 = purse(s);
    ownPaid19.f(s, f, band, 300000);
    expect(purse(s)).toBe(p0);
    expect(festOf(s, f.id)).toBe(f);
  });
});
