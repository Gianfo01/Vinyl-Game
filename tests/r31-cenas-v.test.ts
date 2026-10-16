// R31 · onda 2 (V) — mecânicas em cena, lote 1: negociar, renovar, rescindir, contratar, demitir, punir e montar formação.
// Para cada mecânica: (1) a decisão pela cena dá o MESMO resultado que o formulário de sempre, com a mesma semente;
// (2) abrir/olhar/cancelar a cena não muda o estado nem consome sorteio; (3) o modo de 2 cliques decide sem a cena.
import { beforeAll, describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import type { GameState } from '../src/sim/types';
import { playerActs } from '../src/sim/util';
import { defaultOffer, offerNow } from '../src/sim/contracts';
import { fireStaff, hireStaff } from '../src/sim/economy';
import { talk } from '../src/sim/sys/people/talks';
import { runMemberOption29 } from '../src/sim/sys/member29';
import { rng19, rngSnapshot19 } from '../src/sim/rng19';
import { rescindQuote31 } from '../src/sim/r31/rescind31';
import { runAction20 } from '../src/ui/actions20';
import { runnables } from '../src/sim/r31/editor';
import {
  decideScene31, sceneMode31, sceneModel31, sceneTargets31, SCENE_KINDS31, type SceneKind31, type SceneTarget31,
} from '../src/ui/r31/scene31core';

const game = (seed: string, y = 1975): GameState => createGame(defaultConfig(`${seed}-${y}`, { startYear: y, scenario: 'established' }));
const clone = (s: GameState): GameState => structuredClone(s);
const snap = (s: GameState): string => JSON.stringify(s);
/** Caminhos que diferem entre dois estados (mensagem curta em vez de um diff de megabytes). */
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
  base = game('r31v');
  base.player.cash += 50_000_000; // caixa folgado: as travas de caixa não escondem a comparação
});

/** Primeiro alvo da cena com uma escolha livre (sem trava). */
function pick(s: GameState, kind: SceneKind31, prefer?: string): { t: SceneTarget31; choice: string } | null {
  for (const x of sceneTargets31(s, kind)) {
    const m = sceneModel31(s, kind, { id: x.id });
    if (!m || m.lock) continue;
    const c = m.choices.find((y) => !y.lock && !y.opens && (!prefer || y.id === prefer)) ?? m.choices.find((y) => !y.lock && !y.opens);
    if (c) return { t: { id: x.id }, choice: c.id };
  }
  return null;
}

/** A função do formulário de sempre para cada mecânica. */
const FORM: Partial<Record<SceneKind31, (s: GameState, t: SceneTarget31, choice: string) => unknown>> = { // W (onda 4): o lote 2 tem o próprio teste (r31-w4-wr)
  nego: (s, t) => { const o = defaultOffer(s, s.acts[t.id]); return offerNow(s, rng19(s, 'act'), { ...o, promises: [...o.promises], rights: o.rights ? { ...o.rights } : undefined }).result; },
  renew: (s, t) => runAction20(s, 'contract.renew', { act: t.id }).ok,
  rescind: (s, t) => runAction20(s, 'contract.rescind', { act: t.id }).ok,
  hire: (s, t) => hireStaff(s, t.id),
  fire: (s, t) => fireStaff(s, t.id),
  punish: (s, t, c) => talk(s, t.id, c as 'demand' | 'fine').ok,
  lineup: (s, _t, c) => { const [pid, opt] = c.split('|'); return runMemberOption29(s, pid, opt).ok; },
};

describe('V · cenas = o mesmo cálculo do formulário', () => {
  for (const kind of SCENE_KINDS31) {
    it(`${kind}: cena e formulário dão o mesmo estado final com a mesma semente`, () => {
      const g = clone(base);
      const p = pick(g, kind, kind === 'punish' ? 'fine' : undefined);
      expect(p, `sem alvo livre para ${kind}`).not.toBeNull();
      const a = clone(g), b = clone(g);
      const out = decideScene31(a, kind, p!.t, p!.choice);
      expect(filled(out.text)).toBe(true);
      FORM[kind]!(b, p!.t, p!.choice);
      expect(same(a, b)).toEqual([]);
      // e mudou alguma coisa (a decisão foi tomada de fato)
      expect(snap(a)).not.toBe(snap(g));
    });
  }
});

describe('V · explorar, abrir e cancelar não mudam o mundo', () => {
  it('montar o modelo de cada cena (todas os alvos) não muda o estado nem consome sorteio', () => {
    const g = clone(base);
    const before = clone(g);
    const rng0 = rngSnapshot19(g);
    let n = 0;
    for (const kind of SCENE_KINDS31) for (const x of sceneTargets31(g, kind).slice(0, 6)) {
      const m = sceneModel31(g, kind, { id: x.id });
      if (!m) continue;
      n++;
      expect(m.cast.some((c) => c.side === 'you')).toBe(true);
      expect(m.cast.some((c) => c.side === 'them') || kind === 'lineup').toBe(true);
      expect(m.nums.length).toBeGreaterThan(0);
      for (const v of m.nums) { expect(filled(v.label)).toBe(true); expect(filled(v.value)).toBe(true); expect(JSON.stringify(v.value)).not.toMatch(/NaN|undefined/); }
      for (const c of m.choices) if (c.lock) { expect(filled(c.lock.why)).toBe(true); expect(filled(c.lock.unlock)).toBe(true); }
      sceneMode31(g, kind, { id: x.id }, 'key');
    }
    expect(n).toBeGreaterThanOrEqual(SCENE_KINDS31.length);
    expect(rngSnapshot19(g)).toBe(rng0);
    expect(same(g, before)).toEqual([]);
  });

  it('escolha travada não decide nada (o motivo volta como texto)', () => {
    const g = clone(base);
    g.player.cash = 0;
    const id = sceneTargets31(g, 'rescind')[0]?.id;
    expect(id).toBeTruthy();
    const q = rescindQuote31(g, id);
    if (q.fee > 0) {
      const before = clone(g);
      const out = decideScene31(g, 'rescind', { id }, 'rescind');
      expect(out.ok).toBe(false);
      expect(filled(out.text)).toBe(true);
      expect(same(g, before)).toEqual([]);
    }
  });

  it('a escolha "sentar à mesa" só abre a mesa completa: não decide', () => {
    const g = clone(base);
    const id = sceneTargets31(g, 'nego')[0]?.id;
    const before = clone(g);
    const out = decideScene31(g, 'nego', { id }, 'table');
    expect(out.ok).toBe(false);
    expect(same(g, before)).toEqual([]);
  });
});

describe('V · modo de 2 cliques e preferência de atividades', () => {
  it('"Sempre rápido" nunca abre a cena; "Todas jogáveis" sempre abre; "Só as importantes" segue a importância', () => {
    for (const kind of SCENE_KINDS31) {
      const x = sceneTargets31(base, kind)[0];
      if (!x) continue;
      const t = { id: x.id };
      expect(sceneMode31(base, kind, t, 'quick')).toBe('quick');
      expect(sceneMode31(base, kind, t, 'play')).toBe('scene');
      expect(sceneMode31(base, kind, t, 'key')).toBe(sceneModel31(base, kind, t)!.important ? 'scene' : 'quick');
    }
  });

  it('2 cliques: abrir o painel rápido (modelo) e escolher decide sem a cena', () => {
    for (const kind of SCENE_KINDS31) {
      const g = clone(base);
      const p = pick(g, kind);
      if (!p) continue;
      const m = sceneModel31(g, kind, p.t)!; // clique 1: painel com números-chave e motivos
      expect(m.choices.length).toBeGreaterThan(0);
      const out = decideScene31(g, kind, p.t, p.choice); // clique 2
      expect(filled(out.text)).toBe(true);
    }
  });
});

describe('V · rescisão: regra única com reação', () => {
  it('rescindir tira o artista do elenco e cobra a multa mostrada antes', () => {
    const g = clone(base);
    const id = sceneTargets31(g, 'rescind')[0].id;
    const q = rescindQuote31(g, id);
    const cash0 = g.player.cash;
    const out = decideScene31(g, 'rescind', { id }, 'rescind');
    expect(out.ok).toBe(true);
    expect(out.react).toBeTruthy();
    expect(playerActs(g)).not.toContain(id);
    expect(cash0 - g.player.cash).toBeGreaterThanOrEqual(q.fee);
  });
});

describe('V · editor (regra 10)', () => {
  it('cada cena tem um executável no editor', async () => {
    await import('../src/ui/r31/scene31reg');
    const ids = runnables().map((r) => r.id);
    for (const k of SCENE_KINDS31) expect(ids).toContain(`scene31.${k}`);
  });
});
