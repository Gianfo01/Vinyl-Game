// Rodada 12 — rivais respondem à vista (lances, acordos com tensão) e a sede reflete o negócio.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { defaultOffer, evaluateOffer, makeOffer } from '../src/sim/contracts';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { respond, rivals12, tension } from '../src/sim/sys/rivals12';
import { money, post } from '../src/sim/util';

const mk = (seed: string) => createGame(defaultConfig(seed, { startYear: 1985 }));

describe('rivais r12', () => {
  it('lance rival depois do seu derruba a oferta; cobrir recupera', () => {
    const s = mk('r12-bid');
    post(s, 'r12', money(s, 2_000_000), 'business', 'teste');
    const act = Object.values(s.acts).find((a) => !a.owner && !a.playerBand && a.status === 'active' && !a.deceased)!;
    const lb = Object.values(s.labels).find((x) => x.active)!;
    const o = makeOffer(s, { ...defaultOffer(s, act), actId: act.id })!;
    const before = evaluateOffer(s, act, o).score;
    const st = rivals12(s);
    st.bids[act.id] = { lb: lb.id, adv: Math.round(o.advance * 1.3), w: s.week, n: 1, ref: o.id };
    st.c.push({ id: 'cx', k: 'bid', lb: lb.id, w: s.week, t: { pt: 'x', en: 'x' }, scr: 'market', a: act.id, ref: o.id, until: s.week + 3, opts: ['cover', 'yield'] });
    const hit = evaluateOffer(s, act, o);
    expect(hit.score).toBeLessThan(before - 0.15);
    expect(hit.reasons.some((r) => r.pt.includes(lb.name))).toBe(true);
    expect(respond(s, 'cx', 'cover')).toBeNull();
    expect(o.advance).toBeGreaterThan(st.bids[act.id].adv);
    expect(evaluateOffer(s, act, o).score).toBeGreaterThan(hit.score);
  });

  it('acordo de distribuição com rival: aceito, rende e rompe com tensão', () => {
    const s = mk('r12-deal');
    const lb = Object.values(s.labels).find((x) => x.active)!;
    const st = rivals12(s);
    st.deals.push({ id: 'dx', lb: lb.id, m: 'eu', fee: money(s, 1000), from: s.week, until: s.week + 104, ten: 10, st: 'offer', exp: s.week + 6 });
    st.c.push({ id: 'cd', k: 'deal', lb: lb.id, w: s.week, t: { pt: 'x', en: 'x' }, scr: 'world', ref: 'dx', until: s.week + 6, opts: ['accept', 'decline'] });
    expect(respond(s, 'cd', 'accept')).toBeNull();
    expect(st.deals[0].st).toBe('on');
    tension(s, lb.id, 95);
    expect(st.deals[0].st).toBe('off');
    expect(st.c.some((c) => c.k === 'deal_end' && c.lb === lb.id)).toBe(true);
  });

  it('simulação longa gera respostas visíveis sem quebrar', () => {
    const s = mk('r12-run');
    for (let i = 0; i < 36; i++) advanceMonth(s);
    const st = rivals12(s);
    expect(Array.isArray(st.c)).toBe(true);
    for (const c of st.c) expect(c.t.pt.length).toBeGreaterThan(5);
  });
});
