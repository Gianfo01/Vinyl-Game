// Rodada 18 (dm18) — o Mestre (fios, ganchos, curva), qualquer um contra qualquer um, rixas até a violência para
// qualquer um fora do modo exato; determinismo; modo exato nunca machuca gente real; modo livre permite.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { facts17 } from '../src/sim/facts17';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { crimeOdds, isReal } from '../src/sim/sys/crime17';
import { ag18 } from '../src/sim/sys/agency18';
import { dm18, THREADS18 } from '../src/sim/sys/dm18';
import { DMSITS18 } from '../src/sim/sys/dmsits18';
import { feud18, feudMonth18, shield18, startFeud18, cap18 } from '../src/sim/sys/feud18';
import { Rng } from '../src/core/rng';
import type { GameState } from '../src/sim/types';
import '../src/sim/sys';

const realActs = (s: GameState) => Object.values(s.acts).filter((a) => a.catalogNo && a.status === 'active' && a.members.some((m) => s.persons[m]?.alive)).sort((a, b) => b.fame - a.fame);
const realPerson = (s: GameState, id: string) => isReal(s, id) || (!!s.acts[id] && (!!s.acts[id].catalogNo || s.acts[id].members.some((m) => isReal(s, m))));

describe('r18 dm18', () => {
  it('modelos: 30+ situações combináveis e 10+ fios', () => {
    expect(DMSITS18.length).toBeGreaterThanOrEqual(30);
    expect(THREADS18.length).toBeGreaterThanOrEqual(10);
  });

  it('determinístico: mesma semente, mesmo Mestre, mesmas rixas e iniciativas', () => {
    const run = () => {
      const s = createGame(defaultConfig('r18-dm1', { startYear: 1990, mode: 'historic', realNames: true, history: 'loose', storyteller: 'tabloide' }));
      for (let i = 0; i < 24; i++) advanceMonth(s);
      return s;
    };
    const a = run(), b = run();
    expect(JSON.stringify(dm18(a))).toEqual(JSON.stringify(dm18(b)));
    expect(JSON.stringify(feud18(a))).toEqual(JSON.stringify(feud18(b)));
    expect(JSON.stringify(ag18(a).log)).toEqual(JSON.stringify(ag18(b).log));
    expect(dm18(a).curve.length).toBe(24);
    expect(dm18(a).th.length).toBeGreaterThan(0);
    expect(ag18(a).log.length).toBeGreaterThan(0);
  }, 240000);

  it('modo exato: ninguém real age, sofre, entra em rixa ou morre por estes sistemas', () => {
    const s = createGame(defaultConfig('r18-dm2', { startYear: 1985, mode: 'historic', realNames: true, history: 'strict', storyteller: 'tabloide' }));
    const [x, y] = realActs(s);
    expect(x && y).toBeTruthy();
    expect(shield18(s, x.id)).toBe(true);
    expect(startFeud18(s, x.id, y.id, { pt: 't', en: 't' }, 90)).toBeNull();
    const pid = x.members.find((m) => s.persons[m]?.alive)!;
    expect(crimeOdds(s, { actor: 'player', target: pid, partners: [] }, 'murder').block).not.toBeNull();
    for (let i = 0; i < 30; i++) advanceMonth(s);
    for (const f of feud18(s).f) { expect(realPerson(s, f.a)).toBe(false); expect(realPerson(s, f.b)).toBe(false); }
    const key = (k: string) => (k.startsWith('p:') ? k.slice(2) : k);
    for (const r of ag18(s).log) { expect(isReal(s, key(r.a))).toBe(false); expect(isReal(s, key(r.t))).toBe(false); }
    for (const f of facts17(s).f.filter((f) => ['feud18', 'agency18', 'dmsits18', 'dm18'].includes(f.src ?? ''))) for (const id of f.actors) expect(realPerson(s, id), `${f.src} ${f.kind} ${id} ${f.text.pt}`).toBe(false);
  }, 240000);

  it('história alternativa (modo livre): gente real entra na escada e pode chegar à violência', () => {
    const s = createGame(defaultConfig('r18-dm3', { startYear: 1985, mode: 'historic', realNames: true, history: 'free' }));
    const [x, y] = realActs(s);
    const pid = x.members.find((m) => s.persons[m]?.alive)!;
    s.player.cash = 1e9;
    expect(crimeOdds(s, { actor: 'player', target: pid, partners: [] }, 'murder').block).toBeNull();
    const f = startFeud18(s, x.id, y.id, { pt: 'teste', en: 'test' }, 30)!;
    expect(f).not.toBeNull();
    expect(cap18(s, f)).toBeGreaterThanOrEqual(4);
    const r = Rng.fromSeed('r18-dm3');
    for (let i = 0; i < 8 && !f.end; i++) { f.h = 100; feudMonth18(s, r); }
    expect(f.hist.some((h) => h.st >= 4)).toBe(true);
    expect(facts17(s).f.some((x) => x.src === 'feud18' && x.tags.includes('feud'))).toBe(true);
  }, 240000);
});
