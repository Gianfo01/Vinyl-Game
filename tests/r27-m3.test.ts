// Rodada 27 (M3) — operações jogáveis do Submundo (heist27): determinismo, modo rápido igual ao de antes, cada
// decisão empurra o resultado na direção esperada, encobrimento mexe nos sistemas existentes, sem NaN.
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { facts17 } from '../src/sim/facts17';
import { holds17 } from '../src/sim/holds17';
import { commitCrime, crime17, crimeById, crimeOdds, famOf, targetsFor } from '../src/sim/sys/crime17';
import { money } from '../src/sim/util';
import {
  COVER27, RISK27, coverUp27, crewPool27, event27, heistEvents27, planMods27, planOdds27, playable27, quickPlan27, runHeist27, upOptions27,
  type Ev27, type Plan27, type Res27,
} from '../src/sim/sys/heist27';
import type { GameState } from '../src/sim/types';
import { createGame, genStaff } from '../src/sim/worldgen';

function setup(seed: string): GameState {
  const s = createGame(defaultConfig(seed, { startYear: 1975 }));
  s.player.cash = 1e8;
  const a = Object.values(s.acts).filter((x) => !x.catalogNo && !x.owner && x.status !== 'retired' && x.status !== 'split' && x.members.filter((m) => s.persons[m]?.alive).length >= 2).sort((x, y) => x.id.localeCompare(y.id))[0];
  if (a) a.owner = 'player';
  const r = Rng.fromSeed(`${seed}|staff`);
  s.player.staff.push(genStaff(s, r, 'manufacturing', 75), genStaff(s, r, 'legal', 60), genStaff(s, r, 'admin', 35));
  return s;
}
const bootPlan = (s: GameState): Plan27 => quickPlan27('bootleg', { actor: 'player', target: targetsFor(s, crimeById('bootleg')!, 3)[0].id, partners: [] });
const finite = (o: unknown): boolean => JSON.stringify(o, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? 'NaN!' : v)).includes('NaN!') === false;

describe('r27 M3 — operações jogáveis do Submundo', () => {
  it('só operações do negócio da música são jogáveis; violência fica no modo rápido', () => {
    expect(playable27('bootleg')).toBe(true);
    expect(playable27('chart_rig')).toBe(true);
    expect(playable27('murder')).toBe(false);
    expect(playable27('assault')).toBe(false);
  });

  it('equipe visível (lealdade, habilidade, calor) e determinismo do plano inteiro', () => {
    const run = () => {
      const s = setup('r27m3-det');
      const plan = bootPlan(s);
      const pool = crewPool27(s, plan);
      expect(pool.length).toBeGreaterThanOrEqual(3);
      for (const c of pool) { expect(c.loy).toBeGreaterThanOrEqual(0); expect(c.loy).toBeLessThanOrEqual(100); expect(c.skill).toBeGreaterThan(0); expect(c.heat).toBeGreaterThanOrEqual(0); expect(c.fee).toBeGreaterThan(0); }
      plan.crew = pool.slice(0, 2).map((c) => c.key);
      plan.risk = 'high'; plan.cover = 'books';
      const evs = heistEvents27(s, plan);
      expect(evs.length).toBeGreaterThanOrEqual(2);
      expect(evs.length).toBeLessThanOrEqual(3);
      const picks = Object.fromEntries(evs.map((e) => [e.id, e.choices.find((c) => !c.block)!.id]));
      const r = runHeist27(s, plan, picks) as Res27;
      expect('out' in r).toBe(true);
      expect(finite(r)).toBe(true);
      return JSON.stringify({ evs: evs.map((e) => e.id), ok: r.out.ok, ex: r.out.ex, loot: r.loot, sig: r.sig.map((x) => x.t.pt), cash: s.player.cash, heat: crime17(s).heat });
    };
    expect(run()).toBe(run());
  });

  it('modo rápido igual ao de antes (commitCrime sem plano; sem dq nada muda)', () => {
    const out: string[] = [];
    for (const seed of ['r27m3-q1', 'r27m3-q2']) {
      const s = createGame(defaultConfig(seed, { startYear: 1975 }));
      s.player.cash = 1e7;
      const tg = targetsFor(s, crimeById('bootleg')!, 3)[0].id;
      const ctx = { actor: 'player', target: tg, partners: [] };
      const a = crimeOdds(s, ctx, 'bootleg'), b = crimeOdds(s, { ...ctx, dq: 0 }, 'bootleg');
      expect([a.p, a.q, a.cost]).toEqual([b.p, b.q, b.cost]);
      const r = commitCrime(s, 'bootleg', ctx);
      if (typeof r === 'object' && 'ok' in r) out.push(`${r.ok ? 1 : 0}${r.ex ? 1 : 0}:${a.p.toFixed(2)}/${a.q.toFixed(2)}:${s.player.cash}`);
    }
    expect(out).toEqual(QUICK_SNAPSHOT);
  });

  it('cada decisão empurra na direção esperada', () => {
    const s = setup('r27m3-dir');
    const plan = bootPlan(s);
    const pool = crewPool27(s, plan);
    const base = planOdds27(s, plan);
    // risco
    const at = (f: (p: Plan27) => void) => { const p = structuredClone(plan); f(p); return planOdds27(s, p); };
    const lo = at((p) => { p.risk = 'low'; }), hi = at((p) => { p.risk = 'high'; });
    expect(lo.q).toBeLessThan(base.q); expect(hi.q).toBeGreaterThan(base.q);
    expect(lo.p).toBeLessThan(hi.p);
    expect(lo.m.loot).toBeLessThan(hi.m.loot);
    expect(RISK27.mid.dp).toBe(0);
    // cobertura: menos exposição, custa dinheiro
    const al = at((p) => { p.cover = 'alibi'; });
    expect(al.q).toBeLessThan(base.q); expect(al.cost).toBeGreaterThan(base.cost);
    expect(COVER27.books.dq).toBeLessThan(0);
    // equipe: a função certa ajuda a chance, mas é mais uma boca
    const fit = pool.find((c) => c.fit)!;
    expect(fit).toBeTruthy();
    const wc = at((p) => { p.crew = [fit.key]; });
    expect(wc.p).toBeGreaterThan(base.p); expect(wc.q).toBeGreaterThan(base.q); expect(wc.cost).toBeGreaterThan(base.cost);
    // complicações
    plan.crew = pool.slice(0, 3).map((c) => c.key);
    const mods = (id: Ev27, ch: string) => planMods27(s, plan, { [id]: ch }, pool, [event27(s, plan, id, pool)]);
    expect(mods('tip', 'push').dq).toBeGreaterThan(mods('tip', 'delay').dq);
    expect(mods('tip', 'delay').cash).toBeGreaterThan(mods('tip', 'push').cash);
    expect(mods('witness', 'ignore').dq).toBeGreaterThan(mods('witness', 'buy').dq);
    expect(mods('witness', 'buy').cash).toBeGreaterThan(mods('witness', 'ignore').cash);
    expect(mods('snag', 'force').dp).toBeGreaterThan(mods('snag', 'retreat').dp - 0.04);
    expect(mods('snag', 'force').dq).toBeGreaterThan(mods('snag', 'retreat').dq);
    expect(mods('snag', 'retreat').loot).toBeLessThan(mods('snag', 'force').loot);
    expect(mods('betray', 'pay').loot).toBeLessThan(mods('betray', 'threaten').loot);
    expect(mods('betray', 'cut').cash).toBeLessThan(mods('betray', 'pay').cash); // tirar do plano devolve o pagamento
    for (const id of ['tip', 'betray', 'witness', 'snag'] as Ev27[]) for (const c of event27(s, plan, id, pool).choices) expect(finite(mods(id, c.id))).toBe(true);
  });

  it('valor esperado: jogar bem rende um pouco mais que o modo rápido (≈ +10–20%), jogar mal rende menos', () => {
    // valor = chance × ganho − custo − exposição × ganho (o resto da exposição — escândalo, caso, mágoas — fica de fora)
    let gross = 0, gain = 0, loss = 0;
    for (const seed of ['e1', 'e2']) {
      const s = setup(`r27m3-${seed}`);
      for (let w = 0; w < 2; w++) {
        s.week += 1;
        for (const cid of ['bootleg', 'blackmail', 'royalty_skim']) {
          const tg = targetsFor(s, crimeById(cid)!, 3)[0]?.id;
          if (!tg) continue;
          const plan = quickPlan27(cid, { actor: 'player', target: tg, partners: [] });
          const f = famOf(s, tg);
          const L = money(s, cid === 'bootleg' ? 2500 + f * 160 : cid === 'blackmail' ? 4000 + f * 450 : 3000 + f * 260);
          const EV = (o: { p: number; q: number; cost: number; m?: { loot: number } }) => o.p * L * (o.m?.loot ?? 1) - o.cost - o.q * L;
          const q0 = crimeOdds(s, plan.ctx, cid);
          const ev0 = EV(q0);
          gross += q0.p * L;
          // bom: procura a melhor combinação (equipe de 0–1 com função certa, risco, cobertura, escolha a escolha)
          const pool = crewPool27(s, plan);
          let best = -Infinity;
          for (const crew of [[], ...pool.filter((c) => c.fit).slice(0, 2).map((c) => [c.key])]) for (const risk of ['low', 'mid', 'high'] as const) for (const cover of ['none', 'books'] as const) {
            const p: Plan27 = { ...plan, crew, risk, cover };
            const picks: Record<string, string> = {};
            for (const e of heistEvents27(s, p, pool)) {
              let bv = -Infinity;
              for (const c of e.choices) { const v = EV(planOdds27(s, p, { ...picks, [e.id]: c.id })); if (v > bv) { bv = v; picks[e.id] = c.id; } }
            }
            best = Math.max(best, EV(planOdds27(s, p, picks)));
          }
          gain += best - ev0;
          // mal: ousado, equipe inteira sem critério, ignorar todos os avisos
          const b0: Plan27 = { ...plan, risk: 'high', cover: 'none', crew: pool.slice(-3).map((c) => c.key) };
          const worst: Record<string, string> = { tip: 'push', betray: 'threaten', rival: 'race', witness: 'ignore', snag: 'force' };
          loss += EV(planOdds27(s, b0, Object.fromEntries(heistEvents27(s, b0, pool).map((e) => [e.id, worst[e.id]])))) - ev0;
        }
      }
    }
    expect(gain / gross).toBeGreaterThan(0.05);
    expect(gain / gross).toBeLessThan(0.35);
    expect(loss).toBeLessThan(0);
  });

  it('encobrir: bode expiatório, pagar e sumir do mapa mexem em provas, calor e mágoas', () => {
    const s = setup('r27m3-cov');
    crime17(s).heat.USA = 90; crime17(s).heat.GBR = 90; // a polícia já está de olho
    let res: Res27 | undefined;
    for (let i = 0; i < 40 && !res; i++) {
      s.week += 1;
      const plan = bootPlan(s);
      const pool = crewPool27(s, plan);
      plan.crew = pool.slice(0, 2).map((c) => c.key); plan.risk = 'high';
      const evs = heistEvents27(s, plan, pool);
      const r = runHeist27(s, plan, Object.fromEntries(evs.map((e) => [e.id, e.id === 'tip' ? 'push' : e.choices.find((c) => !c.block)!.id])));
      if (typeof r === 'object' && 'out' in r && r.out.ex && r.caseId && r.info.some((c) => !r.betrayed.includes(c.key))) res = r;
    }
    expect(res).toBeTruthy();
    const r = res!;
    expect(r.sig.some((x) => x.k === 'scandal')).toBe(true);
    const cs = crime17(s).cases.find((c) => c.id === r.caseId)!;
    const ev0 = cs.ev;
    const opts = upOptions27(s, r);
    expect(opts.find((o) => o.id === 'scapegoat')!.block).toBeNull();
    const sig = coverUp27(s, r, 'scapegoat');
    expect(Array.isArray(sig)).toBe(true);
    expect(cs.ev).toBe(Math.max(0, ev0 - 25));
    const goat = r.info.filter((c) => !r.betrayed.includes(c.key)).sort((a, b) => a.loy - b.loy || a.key.localeCompare(b.key))[0];
    const gid = goat.key.startsWith('p:') ? goat.key.slice(2) : goat.key;
    expect(crime17(s).cases.some((c) => c.who === gid && c.stage !== 'closed')).toBe(true);
    expect(holds17(s).h.some((h) => h.holder === gid && h.target === 'player' && h.kind === 'grievance' && h.strength >= 80)).toBe(true);
    // sumir do mapa: calor −30%
    const h0 = crime17(s).heat[r.a3];
    expect(Array.isArray(coverUp27(s, r, 'lielow'))).toBe(true);
    expect(crime17(s).heat[r.a3]).toBeCloseTo(h0 - Math.round(h0 * 0.3), 5);
    expect(facts17(s).f.some((f) => f.kind === 'cover_up')).toBe(true);
  });

  it('traição: quem tem lealdade baixa e é ameaçado pode entregar você (caso com informante, boato)', () => {
    const s = setup('r27m3-bet');
    let hit: Res27 | undefined;
    for (let i = 0; i < 60 && !hit; i++) {
      s.week += 1;
      const plan = bootPlan(s);
      const pool = crewPool27(s, plan);
      plan.crew = pool.slice().sort((a, b) => a.loy - b.loy).slice(0, 1).map((c) => c.key);
      const ev = event27(s, plan, 'betray', pool);
      const r = runHeist27(s, plan, { betray: 'threaten' });
      // só conta quando o evento de traição saiu na mão
      if (typeof r === 'object' && 'out' in r && r.betrayed.length) hit = r;
      expect(ev.choices.map((c) => c.id)).toEqual(['pay', 'threaten', 'cut']);
    }
    expect(hit).toBeTruthy();
    expect(hit!.raid).toBe(true);
    expect(facts17(s).f.some((f) => f.kind === 'betrayal' && f.tags.includes('heist27'))).toBe(true);
    expect(crime17(s).cases.some((c) => c.who === 'player' && c.inf.length > 0)).toBe(true);
  });
});

// r27 INT: rebaselinado depois dos merges do mundo; commitCrime com e sem a linha do dq (o único toque do M3 no
// modo rápido) dá o mesmo resultado neste mundo (4 sementes conferidas).
const QUICK_SNAPSHOT: string[] = ["10:0.70/0.22:10331206", "00:0.70/0.16:9926500"];
