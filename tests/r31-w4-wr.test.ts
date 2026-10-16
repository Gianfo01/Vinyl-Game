// R31 · onda 4 (W + R) — mecânicas em cena, lote 2 (quadro do lançamento, banco, compra/sociedade, jabá dado e
// recebido) e resultados/aprendizados (amostras, coortes, biblioteca rotulada como correlação).
//   W: (1) a cena decide pela MESMA função do formulário (mesmo estado final, mesma semente); (2) abrir/olhar não muda
//      o mundo nem sorteia; (3) jabá recusado/denunciado e antitruste atrás de interruptor (desligado = como antes).
//   R: amostras só na leitura de 10 semanas, sem sorteio; coortes somam as amostras; aprendizado exige amostra mínima
//      dos dois lados e traz tamanho e contexto.
import { beforeAll, describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import type { GameState } from '../src/sim/types';
import { playerActs } from '../src/sim/util';
import { takeLoan } from '../src/sim/economy';
import { rngSnapshot19 } from '../src/sim/rng19';
import { ensureStations18 } from '../src/sim/sys/radio18';
import { payDJs } from '../src/sim/sys/world4/charts';
import { w4 } from '../src/sim/sys/world4/state';
import { buy31, buyLock31, socio31, targets31, TOTAL31 } from '../src/sim/sys/socio31';
import { createProject, openProjects, projectStage } from '../src/sim/sys/project8';
import { setSw } from '../src/sim/r31/switches';
import { SW_ANTI31, SW_JABA31, antitrust31, jabaRisk31, withJabaStation31 } from '../src/sim/r31/w31';
import { cohorts31, collect31, learn31, lessons31, ratio31, type Samp31 } from '../src/sim/r31/learn31';
import { runnables } from '../src/sim/r31/editor';
import { decideScene31, sceneModel31, sceneTargets31, SCENE_KINDS_W31 } from '../src/ui/r31/scene31core';
import { cardBudget31 } from '../src/ui/r31/scene31w';

const game = (seed: string, y = 1975): GameState => createGame(defaultConfig(`${seed}-${y}`, { startYear: y, scenario: 'established' }));
const clone = (s: GameState): GameState => structuredClone(s);
const snap = (s: GameState): string => JSON.stringify(s);
function diff(a: unknown, b: unknown, path = '', out: string[] = []): string[] {
  if (out.length > 12) return out;
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a as object), ...Object.keys(b as object)])) diff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`, out);
    return out;
  }
  out.push(path);
  return out;
}
const same = (a: GameState, b: GameState): string[] => diff(JSON.parse(snap(a)), JSON.parse(snap(b)));
const filled = (x: { pt: string; en: string } | string | null | undefined): boolean => typeof x === 'string' ? x.trim().length > 0 : !!x && x.pt.trim().length > 1 && x.en.trim().length > 1;

let base: GameState;
beforeAll(() => {
  base = game('r31w4');
  base.player.cash += 50_000_000;
  ensureStations18(base);
  const a = playerActs(base).find((id) => base.acts[id]?.status !== 'retired');
  if (a) createProject(base, a);
});

describe('W · explorar não muda o mundo', () => {
  it('montar o modelo de cada cena do lote 2 não muda o estado nem consome sorteio', () => {
    const g = clone(base);
    const before = clone(g);
    const rng0 = rngSnapshot19(g);
    const seen = new Set<string>();
    for (const kind of SCENE_KINDS_W31) for (const x of sceneTargets31(g, kind).slice(0, 6)) {
      const m = sceneModel31(g, kind, { id: x.id });
      if (!m) continue;
      seen.add(kind);
      expect(m.cast.some((c) => c.side === 'you')).toBe(true);
      expect(m.cast.some((c) => c.side === 'them')).toBe(true);
      for (const v of m.nums) { expect(filled(v.label)).toBe(true); expect(filled(v.value)).toBe(true); expect(JSON.stringify(v.value)).not.toMatch(/NaN|undefined/); }
      for (const c of m.choices) { expect(filled(c.label)).toBe(true); if (c.lock) { expect(filled(c.lock.why)).toBe(true); expect(filled(c.lock.unlock)).toBe(true); } }
    }
    for (const k of ['bank', 'buy', 'jaba']) expect(seen.has(k), k).toBe(true);
    expect(rngSnapshot19(g)).toBe(rng0);
    expect(same(g, before)).toEqual([]);
  });
});

describe('W · a cena é a frente do mesmo cálculo', () => {
  it('banco: "pedir o empréstimo" = takeLoan', () => {
    const a = clone(base), b = clone(base);
    const out = decideScene31(a, 'bank', { id: 'bank' }, 'loan');
    takeLoan(b);
    expect(out.ok).toBe(true);
    expect(same(a, b)).toEqual([]);
  });

  it('compra: fatia pela cena = buy31 do formulário', () => {
    const g = clone(base);
    const t = sceneTargets31(g, 'buy').find((x) => !x.id.startsWith('lb:') && sceneModel31(g, 'buy', { id: x.id })?.choices.some((c) => !c.lock));
    expect(t).toBeTruthy();
    const c = sceneModel31(g, 'buy', { id: t!.id })!.choices.find((x) => !x.lock)!;
    const [, bp, h] = c.id.split(':');
    const a = clone(g), b = clone(g);
    expect(decideScene31(a, 'buy', { id: t!.id }, c.id).ok).toBe(true);
    expect(buy31(b, t!.id, Number(bp), h as 'label' | 'personal')).toBeNull();
    expect(same(a, b)).toEqual([]);
  });

  it('jabá: envelope pela cena = payDJs com a mesma estação', () => {
    const g = clone(base);
    const id = sceneTargets31(g, 'jaba')[0].id;
    const a = clone(g), b = clone(g);
    decideScene31(a, 'jaba', { id }, 'env:1');
    withJabaStation31(id, () => payDJs(b, 1));
    expect(same(a, b)).toEqual([]);
  });

  it('quadro: cartão na linha do tempo = o mesmo p.marketing do projeto', () => {
    const g = clone(base);
    const t = sceneTargets31(g, 'release')[0];
    if (!t) return; // sem projeto pronto nesta semente
    const m = sceneModel31(g, 'release', { id: t.id })!;
    const card = m.choices.find((c) => c.id.startsWith('card:') && c.stay)!;
    const out = decideScene31(g, 'release', { id: t.id }, card.id);
    expect(out.ok).toBe(true);
    const p = openProjects(g).find((x) => x.id === t.id)!;
    const ch = card.id.slice(5);
    const was = sceneModel31(base, 'release', { id: t.id })!.choices.find((c) => c.id === card.id)!.label.pt.startsWith('Tirar');
    expect(p.marketing.some((x) => x.channel === ch && x.budget === cardBudget31(g))).toBe(!was);
    expect(['recording', 'finishing']).toContain(projectStage(g, p));
  });
});

describe('W · jabá recusado ou denunciado (w31.jaba)', () => {
  it('desligado = todo envelope aceito como antes; ligado = decide por chave fixa (mesmo resultado sempre)', () => {
    const off = clone(base);
    setSw(off, SW_JABA31, false);
    w4(off).payola.heat = 90;
    expect(payDJs(off, 2)).toBeNull();
    // ligado, com calor alto e relação zerada: em várias semanas aparece recusa ou denúncia, sempre igual na repetição
    const res: string[] = [];
    for (let k = 0; k < 2; k++) {
      const out: string[] = [];
      for (let w = 0; w < 30; w++) {
        const g = clone(base);
        g.week += w;
        w4(g).payola.heat = 90;
        for (const x of (g.x4 as unknown as { radio18: { st: { rel: number }[] } }).radio18.st) x.rel = 0;
        const e = payDJs(g, 2);
        out.push(e ? (/denunci/.test(e.pt) ? 'den' : 'rec') : 'ok');
      }
      res.push(out.join('|'));
    }
    expect(res[0]).toBe(res[1]);
    expect(res[0]).toMatch(/rec|den/);
    expect(res[0]).toMatch(/ok/);
    const [r, d] = jabaRisk31(base, 2);
    expect(r).toBeGreaterThan(0); expect(d).toBeGreaterThan(0);
  });
});

describe('W · antitruste nas compras (w31.antitrust)', () => {
  it('controlar rádios demais no mesmo país trava a compra do controle; desligado, não', () => {
    const g = clone(base);
    const radios = targets31(g).filter((x) => x.kind === 'radio');
    if (radios.length < 2) return;
    const [keep, ...rest] = radios;
    // você já controla o teto de rádios no país (estado montado à mão para o teste)
    const st = socio31(g);
    for (let i = 0; i < 3; i++) {
      const r = rest[i] ?? { ...rest[0], id: `ra:fake${i}` };
      st.b[r.id] = { id: r.id, kind: 'radio', name: r.name, city: keep.city, h: 'label', me: TOTAL31, p: [], rules: { price: 'vote', prog: 'vote', date: 'vote', invest: 'vote' }, exit: 'free', set: { price: 1, prog: 1, month: 0, pr: 50 }, debt: 0, since: g.week, paid: 0, got: 0, ten: 0, lastVote: {}, months: [], log: [] };
    }
    const a = antitrust31(g, keep.id, 5100)!;
    expect(a.blocked).toBe(true);
    expect(buyLock31(g, keep.id, 5100, 'label')?.why.pt).toMatch(/antitruste/);
    expect(buyLock31(g, keep.id, 4000, 'label')?.why.pt ?? '').not.toMatch(/antitruste/);
    setSw(g, SW_ANTI31, false);
    expect(buyLock31(g, keep.id, 5100, 'label')?.why.pt ?? '').not.toMatch(/antitruste/);
  });
});

describe('W · editor (regra 10)', () => {
  it('cada cena do lote 2 tem um executável no editor', async () => {
    await import('../src/ui/r31/scene31reg');
    const ids = runnables().map((r) => r.id);
    for (const k of SCENE_KINDS_W31) expect(ids).toContain(`scene31.${k}`);
  });
});

// ================================================================ R

const fake = (i: number, f: string[], r: number, g = 'rock', y = 1975): Samp31 => ({ id: `x${i}`, n: `Disco ${i}`, a: 'a', an: 'A', y, m: 0, g, t: 'lp', u: Math.round(1000 * r), e: 1000, pk: r > 1 ? 8 : 40, cr: 0, fa: 30, cash: 0, f });

describe('R · amostras, coortes e biblioteca', () => {
  it('coletar só lê o lançamento (sem sorteio) e não repete a mesma amostra', () => {
    const g = clone(base);
    const actId = playerActs(g)[0];
    const rel = Object.values(g.releases).find((r) => r.owner === 'player') ?? Object.values(g.releases)[0];
    rel.owner = 'player'; rel.actId = actId;
    if (!g.acts[actId].releases.includes(rel.id)) g.acts[actId].releases.push(rel.id);
    const id = rel.id;
    rel.fc = 1000; rel.fa = 1500;
    const rng0 = rngSnapshot19(g);
    const before = clone(g);
    expect(collect31(g)).toBeGreaterThanOrEqual(1);
    expect(collect31(g)).toBe(0);
    expect(rngSnapshot19(g)).toBe(rng0);
    expect(same(g, before).every((p) => p.startsWith('.x4.learn31'))).toBe(true);
    const x = learn31(g).s.find((y) => y.id === id)!;
    expect(ratio31(x)).toBeGreaterThan(0);
  });

  it('aprendizado: só com amostra mínima dos dois lados, com tamanho e contexto', () => {
    const g = clone(base);
    const st = learn31(g);
    st.s = [
      ...[0, 1, 2, 3].map((i) => fake(i, ['rollout'], 1.6)),
      ...[4, 5, 6, 7, 8].map((i) => fake(i, [], 0.8)),
      fake(9, ['hype'], 2), fake(10, ['hype'], 2),
    ];
    const ls = lessons31(g);
    const ro = ls.find((x) => x.trait === 'rollout')!;
    expect(ro.nWith).toBe(4);
    expect(ro.nWithout).toBe(7);
    expect(ro.diff).toBeGreaterThan(0.3);
    expect(ro.small).toBe(true);
    expect(ro.years).toEqual([1975, 1975]);
    expect(ls.find((x) => x.trait === 'hype')).toBeUndefined(); // só 2 com o traço
    const c = cohorts31(g, 'decade');
    expect(c.reduce((t, x) => t + x.n, 0)).toBe(st.s.length);
  });
});
