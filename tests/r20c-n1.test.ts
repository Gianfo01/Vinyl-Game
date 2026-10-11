// Rodada 20c (N1): bloco "Passado profissional" — a mesma escolha gera a mesma config de antes, e o resumo
// somado (cada bônus uma vez) bate com os perks que o motor realmente aplica. Testes rápidos (base pequena).
import { describe, expect, it } from 'vitest';
import { newRunConfig20 } from '../src/sim/start17';
import { createGame } from '../src/sim/worldgen';
import { perkEntries } from '../src/sim/perks';
import { backgroundById } from '../src/sim/sys/life/data';
import { originById, type OriginId } from '../src/sim/sys/identity/data';
import { ownerOf } from '../src/sim/sys/people/owner';
import { defaultCareers20, defaultCharacter20, pastOf20, setTrajectory20 } from '../src/sim/past20';
import type { RunConfig } from '../src/sim/types';

const base = (seed: string): RunConfig => ({ ...newRunConfig20({ seed, companyName: 'Selo' }), dbSize: 'small' } as RunConfig);

describe('r20c N1 — passado profissional', () => {
  it('trajetória escolhida pelo bloco novo = mesma config que a ficha antiga gerava', () => {
    for (const id of ['radio', 'majorExec', 'dj', 'lawyer'] as OriginId[]) {
      const neu = base('n1'); neu.character = defaultCharacter20(); neu.careers = defaultCareers20();
      setTrajectory20(neu.character, id); neu.careers.origin = 'heir';
      // caminho antigo (charCreate.drawCareer + careerCard 'identity')
      const old = base('n1');
      old.character = { name: '', age: 30, background: 'musician', career: 'musician', role: 'guitar', traits: [], style: 'mentor', visual: 'casual', pronoun: 'they', points: {}, sex: 'x', skills: [] };
      old.careers = { main: ['label'], origin: 'musician', ambition: 'legacy' };
      const o = originById[id];
      old.character.career = o.id; old.character.background = o.bg; old.character.role = backgroundById[o.bg].role; old.careers.origin = 'heir';
      expect(neu).toEqual(old);
    }
    const a = base('n1-g'); a.character = defaultCharacter20(); setTrajectory20(a.character, 'radio'); a.careers = { ...defaultCareers20(), origin: 'dj' };
    const b = JSON.parse(JSON.stringify(a)) as RunConfig;
    const ga = createGame(a), gb = createGame(b);
    expect(ownerOf(ga).attrs).toEqual(ownerOf(gb).attrs);
    expect(ga.player.cash).toBe(gb.player.cash);
  });

  it('resumo somado: cada perk uma vez e igual à soma das fontes de passado no motor', () => {
    for (const [traj, origin] of [['exMusician', 'musician'], ['radio', 'dj'], ['manager', 'lawyer']] as [OriginId, string][]) {
      const c = base(`n1-${traj}`); c.character = defaultCharacter20(); setTrajectory20(c.character, traj); c.careers = { ...defaultCareers20(), origin };
      const P = pastOf20(c);
      expect(new Set(P.perks.map((x) => x.key)).size).toBe(P.perks.length);
      const g = createGame(c);
      const eng: Record<string, number> = {};
      for (const e of perkEntries(g)) {
        if (e.act || !/^(Origem|Trajetória): /.test(e.label.pt)) continue;
        for (const [k, v] of Object.entries(e.values)) if (v) eng[k] = Math.round(((eng[k] ?? 0) + v) * 1000) / 1000;
      }
      const ui = Object.fromEntries(P.perks.map((x) => [x.key, x.total]));
      expect(ui).toEqual(eng);
      for (const x of P.perks) expect(x.parts.reduce((t, p) => t + p.v, 0)).toBeCloseTo(x.total, 6);
    }
  });
});
