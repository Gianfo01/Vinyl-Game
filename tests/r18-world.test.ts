// Rodada 18 (world18) — história alternativa fora do modo exato, segunda carreira de aposentados, voltas,
// estreantes sem selo (cortejo), mais produtores/empresários e rivais que aprendem (memória estratégica + sinais).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { REAL_MGRS } from '../src/data/managers14';
import { REAL_PRODS } from '../src/data/producers15';
import { scriptedReal } from '../src/sim/history15';
import { inboxKind18 } from '../src/sim/inbox18';
import { availableProducers } from '../src/sim/studio';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { Rng } from '../src/core/rng';
import { rw } from '../src/sim/sys/realworld';
import { DEST18, career18, courtNewcomer18, destWeights18, genProds18, secondCareer18, w18, type Dest18 } from '../src/sim/sys/world18';
import { dependence18, mind18, observed18, rm18 } from '../src/sim/sys/rivalmind18';
import type { Act, GameState } from '../src/sim/types';
import '../src/sim/sys';

const mk = (seed: string, o: Record<string, unknown> = {}) => createGame(defaultConfig(seed, { startYear: 1980, realNames: true, ...o }));
const retiree = (s: GameState, n = 0): Act => {
  const a = Object.values(s.acts).filter((x) => !x.catalogNo && x.owner !== 'player' && !x.playerBand && x.members.length >= 1 && s.persons[x.members[0]]?.alive).sort((x, y) => y.fame - x.fame)[n];
  a.status = 'retired';
  a.fame = Math.max(a.fame, 40);
  return a;
};

describe('r18 world18', () => {
  it('história alternativa: só o modo exato agenda fatos reais depois do início', () => {
    const alt = mk('w18h', { history: 'loose', mode: 'free' });
    const ex = mk('w18h', { history: 'strict', mode: 'historic', realFates: true });
    expect(rw(alt).sched.filter((x) => x.year >= 1980).length).toBe(0);
    expect(rw(ex).sched.filter((x) => x.year >= 1980).length).toBeGreaterThan(0);
    expect(scriptedReal(alt, 1979)).toBe(true);
    expect(scriptedReal(alt, 1985)).toBe(false);
    expect(scriptedReal(ex, 1985)).toBe(true);
  });

  it('mais produtores e empresários reais + produtores gerados só na partida certa', () => {
    expect(REAL_PRODS.some((p) => p.id === 'tubby') && REAL_PRODS.some((p) => p.id === 'teddy') && REAL_PRODS.some((p) => p.id === 'donjazzy')).toBe(true);
    expect(REAL_MGRS.some((m) => m.id === 'bangsh') && REAL_MGRS.some((m) => m.id === 'stig')).toBe(true);
    const a = mk('w18p1'), b = mk('w18p2');
    expect(genProds18(a).length).toBeGreaterThan(30);
    const ids = (s: GameState) => availableProducers(s).map((p) => p.id);
    expect(ids(a).some((id) => id.startsWith('rp_g18'))).toBe(true);
    const tagB = genProds18(b)[0].id.split('_')[0];
    expect(ids(a).some((id) => id.startsWith(`rp_${tagB}_`))).toBe(false);
  });

  it('segunda carreira: cada destino tem peso e efeito visível', () => {
    const s = mk('w18c', { history: 'loose', mode: 'free' });
    const r = Rng.fromSeed('t');
    const a0 = retiree(s);
    const p0 = s.persons[a0.members[0]];
    const ws = destWeights18(s, p0, a0);
    expect(ws.length).toBe(Object.keys(DEST18).length);
    expect(ws.every((x) => x.w >= 0)).toBe(true);
    const ks: Dest18[] = ['producer', 'anr', 'label', 'radio', 'teacher'];
    const made = ks.map((k, i) => { const a = retiree(s, i); return [k, a, secondCareer18(s, r, s.persons[a.members[0]], a, k, DEST18[k][0])] as const; });
    const prod = made[0][1];
    expect(availableProducers(s).some((p) => p.id === `rp_x18_${prod.members[0]}`)).toBe(true);
    const anr = made[1][2];
    if (anr.lb) expect(s.labels[anr.lb].focus).toContain(anr.fam);
    expect(made[2][2].lb && s.labels[made[2][2].lb!]).toBeTruthy();
    expect(career18(s, `p:${made[3][1].members[0]}`)?.k).toBe('radio');
  });

  it('estreante/volta começa sem selo e o rival corteja até decidir', () => {
    const s = mk('w18court');
    const a = Object.values(s.acts).find((x) => !x.owner && (x.status === 'active' || x.status === 'emerging') && !x.playerBand)!;
    courtNewcomer18(s, a);
    const c = w18(s).court[a.id];
    expect(c).toBeTruthy();
    for (let i = 0; i < 4; i++) advanceMonth(s);
    expect(w18(s).court[a.id]).toBeUndefined();
    expect(a.owner === null || a.owner === undefined || a.owner === c.lb || !!s.labels[a.owner]).toBe(true);
  }, 120000);

  it('rivais aprendem: perder leilões leva a desenvolver talento; alvo aparece só como sinal', () => {
    const s = mk('w18rm');
    const lb = Object.values(s.labels).find((x) => x.active)!;
    const m = mind18(s, lb.id);
    m.lost = [s.week, s.week, s.week];
    advanceMonth(s);
    expect(mind18(s, lb.id).dev).toBeGreaterThan(s.week);
    expect(lb.strategy).toBe('develop');
    expect(observed18(s, lb.id).read.length).toBeGreaterThan(0);
    expect(observed18(s, lb.id).signs.some((x) => x.k === 'develop')).toBe(true);
    expect(dependence18(s).total).toBeGreaterThanOrEqual(0);
    expect(inboxKind18('rivalmind18_pact')).toBeTruthy();
  }, 120000);

  it('modo exato não muda a carreira de gente real; determinístico', () => {
    const run = () => { const s = mk('w18det', { history: 'strict', mode: 'historic', realFates: true }); for (let i = 0; i < 18; i++) advanceMonth(s); return s; };
    const a = run(), b = run();
    expect(JSON.stringify(w18(a))).toBe(JSON.stringify(w18(b)));
    expect(JSON.stringify(rm18(a))).toBe(JSON.stringify(rm18(b)));
    for (const [pid, c] of Object.entries(w18(a).car)) expect(a.acts[c.act]?.catalogNo, pid).toBeFalsy();
  }, 240000);
});
