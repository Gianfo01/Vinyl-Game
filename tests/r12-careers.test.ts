// Rodada 12 — carreiras de editora, mídia e plataforma.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { Rng } from '../src/core/rng';
import { money, post } from '../src/sim/util';
import { foundVenture, ventures } from '../src/sim/sys/ventures9';
import { activeAct, keyOf, pubOf, profOf, resolveAd, serveReq, answerOffer, setStance, v12, revive, adConflict } from '../src/sim/sys/ventures12';
import { medOf, resolveReview, setSlot, setLine, hireStaff } from '../src/sim/sys/media12';
import { platOf, resolveRenewal, termOf, configure } from '../src/sim/sys/platform12';

const mk = (seed: string) => { const s = createGame(defaultConfig(seed, { startYear: 2010 })); post(s, 'r12', money(s, 50_000_000), 'business', 'teste'); return s; };

describe('carreiras r12', () => {
  it('editora: anúncio polêmico, recusa, estoque e vidas da obra', () => {
    const s = mk('r12-pub'); const r = Rng.fromSeed('r12');
    expect(foundVenture(s, 'publisher', 'label')).toBeNull();
    const v = ventures(s).list[0];
    const person = Object.values(s.persons).find((p) => p.alive && !p.isPlayer)!;
    v.writers!.push({ pid: person.id, name: person.name, skill: 70, until: s.year + 5 });
    const a = Object.values(s.acts).find(activeAct)!;
    v.cat!.push({ title: 'Velha', actId: a.id, y: s.year - 10, v: money(s, 50), wp: person.id });
    const x = pubOf(s, v.id);
    profOf(s, v, person.id).ethic = 95;
    x.reqs.push({ id: 'q1', kind: 'ad', genre: a.genre, who: 'Cigarros', fee: money(s, 20000), until: s.week + 20, brand: { name: { pt: 'Cigarros', en: 'Cigs' }, edge: 90 } });
    expect(adConflict(s, v, x.reqs[0], person.id)).toBe(true);
    expect(serveReq(s, r, v.id, 'q1', person.id).ok).toBe(false);
    expect(x.reqs[0].conflict).toBe(person.id);
    const mood = profOf(s, v, person.id).mood;
    expect(resolveAd(s, r, v.id, 'q1', 'refuse').ok).toBe(true);
    expect(x.reqs.length).toBe(0);
    expect(profOf(s, v, person.id).mood).toBeGreaterThan(mood);
    setStance(s, v.id, keyOf(v.cat![0]), 'protect');
    expect(v.cat![0].x!.stance).toBe('protect');
    const before = v.cat![0].v;
    for (let i = 0; i < 6; i++) advanceMonth(s);
    expect(v.cat![0].v).toBeGreaterThan(before * 0.999);
    expect(typeof revive(s, r, v.id, keyOf(v.cat![0])).ok).toBe('boolean');
    x.offers.push({ id: 'o1', key: keyOf(v.cat![0]), title: 'Velha', kind: 'cover', by: a.name, fee: money(s, 5000), excl: 0, until: s.week + 10, actId: a.id });
    const res = answerOffer(s, r, v.id, 'o1', 'decline');
    expect(res.ok).toBe(true);
  });

  it('mídia: programação, dilema do anunciante e credibilidade', () => {
    const s = mk('r12-med'); const r = Rng.fromSeed('r12');
    expect(foundVenture(s, 'media', 'label', { media: 'radio' })).toBeNull();
    const v = ventures(s).list[0], x = medOf(s, v.id);
    setLine(s, v.id, 'underground', 'niche');
    const a = Object.values(s.acts).find(activeAct)!;
    setSlot(s, v.id, 0, 'interview', a.id);
    expect(x.prog[0].actId).toBe(a.id);
    const c = { id: 'c1', name: 'Crítica', role: 'critic' as const, skill: 80, integrity: 90, salary: money(s, 500) };
    expect(hireStaff(s, v.id, c).ok).toBe(true);
    for (let i = 0; i < 3; i++) advanceMonth(s);
    const lb = Object.values(s.labels).find((z) => z.active && z.roster.some((id) => activeAct(s.acts[id])))!;
    x.dil = { labelId: lb.id, actId: lb.roster.find((id) => activeAct(s.acts[id]))!, ad: 1000, until: s.week + 6, critic: 'c1' };
    const cred = x.cred;
    expect(resolveReview(s, r, v.id, 'publish').ok).toBe(true);
    expect(x.cred).toBeGreaterThan(cred);
    expect(x.dil).toBeUndefined();
  });

  it('plataforma: renovação exigida por uma major e escolhas de descoberta', () => {
    const s = mk('r12-plat'); const r = Rng.fromSeed('r12');
    expect(foundVenture(s, 'platform', 'label')).toBeNull();
    const v = ventures(s).list[0], x = platOf(s, v.id);
    const lb = Object.values(s.labels).find((z) => z.active)!;
    v.deals!.push(lb.id);
    termOf(s, v, x, lb.id).until = s.year;
    expect(configure(s, v.id, { crit: 'diverse', human: 80 }).ok).toBe(true);
    for (let i = 0; i < 8 && !x.dil; i++) advanceMonth(s);
    expect(v12(s).plat[v.id]).toBeDefined();
    expect(x.picks.length).toBeGreaterThan(0);
    if (x.dil) { expect(resolveRenewal(s, r, v.id, 'counter').text).toBeDefined(); expect(x.dil).toBeUndefined(); }
    expect(Object.keys(x.churn).length).toBeGreaterThan(0);
  });
});
