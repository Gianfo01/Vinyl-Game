// R33 · POL33-A item 6 — tela de escolher candidato do GENTE33: a lista, o custo e a trava saem das funções do GENTE33, e
// contratar o candidato marcado (não o primeiro da busca) usa a chave dele; montar a lista não muda o estado.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import type { GameState } from '../src/sim/types';
import { CREW33, cands33, crew33, gente33On, peek33 } from '../src/sim/r33/gente33';
import { costOf33, listFor33, lockOf33 } from '../src/ui/r33/cand33ui';
import { hireCrew33 } from '../src/sim/r33/gente33';
import { ownerOf } from '../src/sim/sys/people/owner';

const game = (seed: string): GameState => createGame(defaultConfig(seed, { scenario: 'established', startYear: 1985, dbSize: 'small', homeCity: 'london' } as Parameters<typeof defaultConfig>[1]));

describe('R33 POL33-A · tela de candidatos', () => {
  it('lista de equipe pessoal: vários candidatos, custo do bolso e nenhuma trava de graça', () => {
    const s = game('cand-crew');
    expect(gente33On(s)).toBe(true);
    const sp = { k: 'crew', crew: 'driver' } as const, xs = listFor33(s, sp);
    expect(xs.length).toBeGreaterThan(1);
    expect(new Set(xs.map((x) => x.k)).size).toBe(xs.length);
    const cost = costOf33(s, sp, xs[0]);
    expect(cost.own).toBe(true);
    expect(cost.sign).toBe(0);
    expect(cost.month).toBeGreaterThan(0);
  });

  it('montar a lista não muda o estado (nem cria o estado do GENTE33)', () => {
    const s = game('cand-ro');
    const before = JSON.stringify(s.x4);
    listFor33(s, { k: 'crew', crew: 'doctor' });
    listFor33(s, { k: 'ceo' });
    lockOf33(s, { k: 'crew', crew: 'doctor' }, cands33(s, { n: 1 })[0]);
    expect(JSON.stringify(s.x4)).toBe(before);
    expect(peek33(s)).toBeUndefined();
  });

  it('contratar o candidato marcado: quem entra é ele, não o primeiro da busca', () => {
    const s = game('cand-pick');
    ownerOf(s).wealth = 1e12;
    const xs = listFor33(s, { k: 'crew', crew: 'trainer' });
    expect(xs.length).toBeGreaterThan(1);
    const pick = xs[1];
    expect(hireCrew33(s, 'trainer', pick.k)).toBeNull();
    expect(crew33(s, 'trainer')?.k).toBe(pick.k);
    expect(lockOf33(s, { k: 'crew', crew: 'trainer' }, xs[0])).toBeTruthy(); // já tem esse posto
    expect(CREW33.trainer.n.pt).toBeTruthy();
  });

  it('CEO: candidato abaixo de 55 de competência trava com motivo', () => {
    const s = game('cand-ceo');
    const fraco = cands33(s, { n: 99 }).find((c) => c.q < 0.55);
    if (fraco) expect(lockOf33(s, { k: 'ceo' }, fraco)).toBeTruthy();
    for (const c of listFor33(s, { k: 'ceo' })) expect(c.q).toBeGreaterThanOrEqual(0.55);
  });
});
