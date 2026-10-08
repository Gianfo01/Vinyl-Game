// Rodada 4 — criação: temas, receita sonora, críticas, encomendas, divisões, parcerias.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { composeSongs, recordSongs } from '../src/sim/production';
import { releaseSingle } from '../src/sim/repertoire';
import { advanceMonth } from '../src/sim/tick';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { acceptCommission, effectsOf, openDivision, setRecipe, songTheme, themeTrend } from '../src/sim/sys/creation/core';
import type { GameState } from '../src/sim/types';

function withAct(seed: string, over = {}) {
  const s = createGame(defaultConfig(seed, over));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  s.player.cash += 900_000_000_00;
  s.player.initialCash += 900_000_000_00;
  return { s, r, act };
}
const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);

describe('criação', () => {
  it('toda música composta ganha um tema e a tendência fica no intervalo', () => {
    const { s, r, act } = withAct('cr-1');
    const songs = composeSongs(s, r, act, 3);
    for (const so of songs) expect(songTheme(s, so)).toBeTruthy();
    const tr = themeTrend(s, 'love');
    expect(tr).toBeGreaterThanOrEqual(0.7);
    expect(tr).toBeLessThanOrEqual(1.35);
  });

  it('receita gera efeitos e o lançamento recebe críticas e enfileira a cena', () => {
    const { s, r, act } = withAct('cr-2');
    const [so] = composeSongs(s, r, act, 1);
    expect(setRecipe(s, so.id, ['percussion', 'horns'])).toBeNull();
    expect(effectsOf(['percussion', 'horns'])).toContain('danceable');
    recordSongs(s, r, act, [so.id], 1, 'balanced');
    expect(releaseSingle(s, r, so.id)).toBeNull();
    advanceMonth(s);
    const rel = Object.values(s.releases).find((x) => x.songs.includes(so.id))!;
    expect(s.reviews[rel.id]?.length).toBeGreaterThan(0);
    expect(s.cutscenes.some((c) => c.kind === 'review')).toBe(true);
    invariant(s);
  });

  it('encomendas e divisões pagam e cobram sem quebrar o caixa, de forma determinística', () => {
    const run = () => {
      const { s } = withAct('cr-3', { startYear: 1985 });
      openDivision(s, 'soundtrack');
      for (let i = 0; i < 18; i++) {
        for (const c of s.x4.creation.commissions) if (c.status === 'offered') acceptCommission(s, c.id, Object.keys(s.acts).find((id) => s.acts[id].owner === 'player')!);
        advanceMonth(s);
      }
      invariant(s);
      return { cash: s.player.cash, done: s.x4.creation.commissions.filter((c) => c.status === 'done').length };
    };
    const a = run();
    expect(run()).toEqual(a);
  });
});
