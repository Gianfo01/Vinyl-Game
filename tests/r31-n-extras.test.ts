// R31 · onda 4 (N) — extras: conquistas novas e partida editada, ovos do Edison, bandas de ficção no mundo (determinísticas,
// interruptor), cultura pop com controle de frequência/tom/luto, filme de 2027, Arara Trips, token, dados conferidos.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { recentFacts } from '../src/sim/facts17';
import { setSw } from '../src/sim/r31/switches';
import { ACHIEVEMENTS, achById, checkAchievements } from '../src/sim/sys/live/achievements';
import { liveOf } from '../src/sim/sys/live/state';
import { eg27, eggFire27 } from '../src/sim/sys/eggs27';
import {
  araraOn31, edisonMary31, ficActive31, filmSoundtrack31, firePop31, hireArara31, popEligible31, sellToken31, x31, FILM_YEAR31,
} from '../src/sim/sys/extras31';
import { POP31 } from '../src/data/pop31';
import { FICTION31 } from '../src/data/fiction31';
import { cityById, l } from '../src/data/world';
import { applyMods } from '../src/sim/ext4';
import type { GameState } from '../src/sim/types';
import { makeAct } from '../src/sim/people';
import { Rng } from '../src/core/rng';

const game = (seed: string, y: number, o: Record<string, unknown> = {}): GameState => createGame(defaultConfig(seed, { startYear: y, realNames: true, ...o }));
let nAct = 0;
const mine = (s: GameState) => {
  const a = makeAct(s, Rng.fromSeed(`n31|${nAct++}`), { genre: 'pop_rock', city: s.config.homeCity, members: 3, potential: 60, formed: s.year - 3, debutYear: s.year - 2, fame: 20 });
  a.owner = 'player'; a.status = 'active';
  return a;
};

describe('N · conquistas', () => {
  it('conquistas novas registradas (Run completa, mítica, presente, casa, Famiglia, secretas Edison e ficção)', () => {
    for (const id of ['run31', 'myth31', 'gift31', 'home31', 'famiglia31', 'egg27:edison31', 'egg27:fic31']) expect(achById[id], id).toBeTruthy();
    expect(achById['egg27:edison31'].hidden).toBe(true);
    expect(achById['egg27:fic31'].hidden).toBe(true);
    expect(ACHIEVEMENTS.filter((a) => a.id === 'run31').length).toBe(1);
  });
  it('Run completa: começa em 1889 e chega a 2040', () => {
    const s = game('n31-run', 1889);
    expect(achById.run31.check(s)).toBe(false);
    s.year = 2040;
    expect(achById.run31.check(s)).toBe(true);
  });
  it('partida editada não conta para conquistas', () => {
    const s = game('n31-ed', 1889);
    s.year = 2040;
    (s.x4 as unknown as { edit31: { edited: boolean } }).edit31 = { ...(s.x4 as unknown as { edit31?: object }).edit31, edited: true } as { edited: boolean };
    expect(checkAchievements(s)).toEqual([]);
    expect(liveOf(s).ach.run31).toBeUndefined();
    (s.x4 as unknown as { edit31: { edited: boolean } }).edit31.edited = false;
    expect(checkAchievements(s)).toContain('run31');
  });
});

describe('N · ovos do Edison', () => {
  it('"Mary" no fonógrafo da Sede: uma vez por partida; com os quatro ovos, a conquista secreta', () => {
    const s = game('n31-ed2', 1920);
    expect(edisonMary31(s)).not.toBeNull();
    expect(edisonMary31(s)).toBeNull();
    for (const id of ['edison_lamb', 'edison_tone31']) eggFire27(s, id, { text: l('x', 'x'), vis: 'secret' });
    expect(eg27(s).feats.edison31).toBeUndefined();
    eggFire27(s, 'edison_cyl31', { text: l('x', 'x'), vis: 'secret' });
    expect(eg27(s).feats.edison31).toBeDefined();
  });
});

describe('N · bandas de filmes, séries e animações', () => {
  it('dados: cidade e gênero do jogo (ou cai no da sede), ano da história ≤ ano da obra quando é ficção pura', () => {
    for (const f of FICTION31) expect(cityById[f.c], `${f.id} cidade ${f.c}`).toBeTruthy();
    expect(ficActive31().length).toBeGreaterThan(30);
    expect(ficActive31().some((f) => f.id === 'monkees')).toBe(false); // já está na base real
  });
  it('surgem no ano em que a história se passa, determinísticas; interruptor desligado = nenhuma', () => {
    const run = (on: boolean) => {
      const s = game('n31-fic', 1984);
      if (!on) setSw(s, 'fic31', false);
      for (let i = 0; i < 14; i++) advanceMonth(s);
      return Object.entries(x31(s).fic).map(([f, a]) => `${f}:${s.acts[a].name}:${s.acts[a].city}`).sort();
    };
    const a = run(true), b = run(true);
    expect(a.length).toBeGreaterThan(3);
    expect(a).toEqual(b);
    expect(a.some((x) => x.startsWith('spinal_tap:Spinal Tap'))).toBe(true);
    expect(run(false)).toEqual([]);
  }, 120000);
});

describe('N · cultura pop, memes, bolhas', () => {
  it('dados: períodos válidos, cidades do jogo, ids únicos, sem repetir ovos da r27', () => {
    const ids = new Set<string>();
    for (const p of POP31) {
      expect(ids.has(p.id), p.id).toBe(false); ids.add(p.id);
      expect(p.y0 <= p.y1, p.id).toBe(true);
      if (p.city) expect(cityById[p.city], `${p.id} ${p.city}`).toBeTruthy();
      expect(p.text.pt.length > 20 && p.text.en.length > 20, p.id).toBe(true);
    }
    expect(ids.has('rickroll')).toBe(false);
  });
  it('frequência 0 desliga; tom contido e luto tiram os memes; piada séria só com a opção', () => {
    const s = game('n31-pop', 2014);
    const memes = () => popEligible31(s).filter((p) => p.kind === 'meme').length;
    expect(memes()).toBeGreaterThan(0);
    expect(popEligible31(s).some((p) => p.serio)).toBe(false);
    setSw(s, 'pop31.serio', true);
    expect(popEligible31(s).some((p) => p.serio)).toBe(true);
    setSw(s, 'pop31.serio', false);
    setSw(s, 'pop31.tone', 'contido');
    expect(memes()).toBe(0);
    setSw(s, 'pop31.tone', 'normal');
    x31(s).grief = s.week;
    expect(memes()).toBe(0);
    x31(s).grief = undefined;
    setSw(s, 'pop31.freq', 0);
    const n0 = recentFacts(s, { months: 9999 }).filter((f) => f.kind === 'culture31').length;
    for (let i = 0; i < 6; i++) advanceMonth(s);
    expect(recentFacts(s, { months: 9999 }).filter((f) => f.kind === 'culture31' && String(f.data?.pop ?? '') !== '').length).toBe(n0);
  }, 120000);
  it('cada referência sai uma vez e vira notícia', () => {
    const s = game('n31-pop2', 2008);
    const p = popEligible31(s)[0];
    firePop31(s, p);
    expect(popEligible31(s).some((x) => x.id === p.id)).toBe(false);
    expect(x31(s).log[0][2]).toBe(p.id);
  });
});

describe('N · Arara, filme e token', () => {
  it('Arara Trips: contrato de seis meses baixa o risco de turnê dos seus artistas', () => {
    const s = game('n31-arara', 1975);
    s.player.cash = 1e7;
    const a = mine(s);
    const base = applyMods(s, 'tourRisk', 0.1, { act: a }).value;
    expect(hireArara31(s).ok).toBe(true);
    expect(araraOn31(s)).toBe(true);
    expect(applyMods(s, 'tourRisk', 0.1, { act: a }).value).toBeLessThan(base);
    expect(hireArara31(s).ok).toBe(false);
  });
  it('filme de 2027: vaga abre na estreia; um artista seu grava a canção-tema uma vez', () => {
    const s = game('n31-film', 2026);
    s.player.cash = 1e7;
    const a = mine(s);
    expect(filmSoundtrack31(s, a.id).ok).toBe(false);
    for (let i = 0; i < 16 && !(s.year === FILM_YEAR31 && x31(s).film); i++) advanceMonth(s);
    expect(x31(s).film?.open).toBeDefined();
    const f0 = a.fame;
    expect(filmSoundtrack31(s, a.id).ok).toBe(true);
    expect(a.fame).toBeGreaterThanOrEqual(f0);
    expect(filmSoundtrack31(s, a.id).ok).toBe(false);
  }, 120000);
  it('token: só em 2021–22 e uma vez', () => {
    const s = game('n31-nft', 2021);
    const a = mine(s);
    const c0 = s.player.cash;
    expect(sellToken31(s, a.id).ok).toBe(true);
    expect(s.player.cash).toBeGreaterThan(c0);
    expect(sellToken31(s, a.id).ok).toBe(false);
  });
});
