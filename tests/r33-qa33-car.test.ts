// R33 · QA33 — desafios de fim de carreira (sys/car31prog): a condição faz o que o texto promete. Cada caso reproduz o
// furo antigo (passava sem cumprir o texto) e confere que agora não passa — e que passa quando o texto é cumprido.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { newRunConfig20 } from '../src/sim/start17';
import { DEF31, FEST_NOTE31, type End31 } from '../src/sim/sys/car31prog';
import { ventures } from '../src/sim/sys/ventures9';
import type { GameState } from '../src/sim/types';

const game = (y = 1985): GameState => { const c = newRunConfig20({ seed: 'qa33-car', companyName: 'Selo Teste' }); c.startYear = y; return createGame(c); };
/** Começa o desafio como o mês faz: mede, guarda, aplica o choque. */
function start(s: GameState, c: keyof typeof DEF31): End31 {
  const d = DEF31[c].end, base = d.metric(s), keep = d.keep?.(s);
  d.shock(s);
  return { c, w0: s.week, due: s.week + 52, base, ...(keep ? { keep } : {}) };
}
const ok = (s: GameState, e: End31) => DEF31[e.c].end.ok(s, e.base, e);
const actIds = (s: GameState, n: number) => Object.keys(s.acts).slice(0, n);
const vent = (s: GameState, kind: string, x: Record<string, unknown>) => { const v = { id: `t-${kind}`, kind, level: 2, rep: 60, name: kind, city: 'london', founded: s.year, staff: 1, pl: [], ...x }; ventures(s).list.push(v as never); return v as unknown as Record<string, unknown>; };

describe('QA33 · desafios de fim de carreira cumprem o texto', () => {
  it('empresário: "não perca ninguém" — perder o cliente original e repor com outro não vale mais', () => {
    const s = game(), [a, b, c] = actIds(s, 3);
    ventures(s).mg.clients = [a, b].map((actId) => ({ actId }) as never);
    const e = start(s, 'manager');
    ventures(s).mg.clients = [a, c].map((actId) => ({ actId }) as never); // perdeu b, assinou c
    expect(ventures(s).mg.clients.length >= e.base).toBe(true); // a regra antiga (contagem) passaria
    expect(ok(s, e)).toBe(false);
    ventures(s).mg.clients = [a, b, c].map((actId) => ({ actId }) as never);
    expect(ok(s, e)).toBe(true);
  });
  it('agência e plataforma: mesmos clientes / mesmos acordos', () => {
    const s = game(2010), [a, b, c] = actIds(s, 3);
    const bk = vent(s, 'booking', { clients: [{ actId: a }, { actId: b }] });
    const pf = vent(s, 'platform', { deals: ['lb1', 'lb2'], subs: 10 });
    const eb = start(s, 'booking'), ep = start(s, 'platform');
    bk.clients = [{ actId: a }, { actId: c }]; pf.deals = ['lb1', 'lb3'];
    expect(ok(s, eb)).toBe(false);
    expect(ok(s, ep)).toBe(false);
    bk.clients = [{ actId: a }, { actId: b }]; pf.deals = ['lb1', 'lb2', 'lb3'];
    expect(ok(s, eb)).toBe(true);
    expect(ok(s, ep)).toBe(true);
  });
  it('festival: edição do mesmo ano ANTES do desafio não vale; a nova precisa de nota 60+ e sem desastre', () => {
    const s = game();
    const f = vent(s, 'festival', { editions: [{ y: s.year, w: s.week - 4, rating: 80, crowd: 5000, profit: 1, verdict: 'ok', head: 'x' }] });
    const e = start(s, 'festival');
    expect(ok(s, e)).toBe(false); // antes passava (e.y >= ano do início)
    s.week += 20;
    (f.editions as unknown[]).push({ y: s.year, w: s.week, rating: 50, crowd: 5000, profit: 1, verdict: 'ok', head: 'x' });
    expect(ok(s, e)).toBe(false); // nota 50: antes passava (verdict 'ok')
    (f.editions as unknown[]).push({ y: s.year, w: s.week + 1, rating: FEST_NOTE31, crowd: 5000, profit: 1, verdict: 'ok', head: 'x' });
    expect(ok(s, e)).toBe(true);
  });
  it('estúdio: o choque derruba a reputação — o desafio não começa cumprido', () => {
    const s = game();
    const st = vent(s, 'studio', { sound: 60, rep: 70 });
    const e = start(s, 'studio');
    expect(e.base).toBe(70);
    expect(st.rep).toBeLessThan(70);
    expect(ok(s, e)).toBe(false); // antes: rep intacta, já cumprido no início
    st.rep = 70;
    expect(ok(s, e)).toBe(true);
  });
});
