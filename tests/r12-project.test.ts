// Rodada 12: projeto musical como centro (intenção, compromissos, problemas, próximo passo) e estúdio sob medida.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { runSimHooks } from '../src/sim/ext4';
import { composeSongs } from '../src/sim/production';
import { createProject, type MusicProject } from '../src/sim/sys/project8';
import { chooseNext, commitProject, planOf12, problemOptions, resolveProblem } from '../src/sim/sys/project12';
import { focusIdeal, studioContext } from '../src/sim/sys/studio12';
import { playerActs, rngOf } from '../src/sim/util';
import { createGame } from '../src/sim/worldgen';
import type { Release } from '../src/sim/types';

function setup(seed: string) {
  const s = createGame(defaultConfig(seed, { scenario: 'emerging' }));
  const act = s.acts[playerActs(s)[0]];
  for (const id of act.songs) if (!s.songs[id].releaseId) s.songs[id].vault = true;
  composeSongs(s, rngOf(s), act, 3);
  return { s, act };
}

describe('projeto musical (rodada 12)', () => {
  it('compromissos mudam meta, orçamento e estúdio; atraso vira decisão com consequência', () => {
    const { s, act } = setup('r12-proj');
    const p = createProject(s, act.id, { type: 'ep', concept: 'art' }) as MusicProject;
    expect(commitProject(s, p, { intent: 'audience', dir: 'bold', aud: 'young', budget: 'lavish', deadline: 'tight' })).toBeNull();
    const pl = planOf12(s, p)!;
    expect(p.goal).toBe('hit');
    expect(p.tier).toBe(2);
    expect(p.budget).toBeGreaterThan(0);
    // prazo vencido → problema de atraso com três saídas
    pl.deadline = s.week;
    runSimHooks('week', s, rngOf(s));
    expect(pl.problem?.kind).toBe('late');
    expect(problemOptions(s, p).map((o) => o.id)).toEqual(['cut', 'outside', 'delay']);
    const mom = act.momentum;
    expect(resolveProblem(s, p, 'delay')).toBeNull();
    expect(pl.problem).toBeUndefined();
    expect(pl.deadline).toBe(s.week + 6);
    expect(act.momentum).toBeLessThanOrEqual(mom);
    expect(pl.log.length).toBeGreaterThanOrEqual(2);
  });

  it('o foco ideal do estúdio depende do público-alvo e do conceito, não só do gênero', () => {
    const { s, act } = setup('r12-focus');
    const p = createProject(s, act.id, { type: 'single', concept: 'radio' }) as MusicProject;
    commitProject(s, p, { intent: 'audience', dir: 'safe', aud: 'young', budget: 'standard', deadline: 'normal' });
    const a = focusIdeal(s, studioContext(s, act.id)!).ideal;
    commitProject(s, p, { intent: 'prestige', dir: 'safe', aud: 'critics', budget: 'standard', deadline: 'normal' });
    p.concept = 'roots';
    const b = focusIdeal(s, studioContext(s, act.id)!).ideal;
    expect(a).not.toEqual(b);
    expect(a.mix).toBeGreaterThan(b.mix);
  });

  it('próximo passo: pausa dá folga ao artista e fica registrada', () => {
    const { s, act } = setup('r12-next');
    const p = createProject(s, act.id, { type: 'single' }) as MusicProject;
    s.releases.rx = { id: 'rx', actId: act.id, week: s.week, songs: [], type: 'single', title: 'X' } as unknown as Release;
    p.releaseId = 'rx';
    expect(chooseNext(s, p, 'pause').err).toBeUndefined();
    expect(act.hiatusUntil).toBe(s.week + 8);
    expect(planOf12(s, p)?.next).toBe('pause');
    expect(chooseNext(s, p, 'tour').err).toBeTruthy();
  });
});
