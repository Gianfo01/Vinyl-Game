// Rodada 22 — Nova run: sugestão de gravadoras que acompanha ano/cidade, novos começos das gravadoras, limite de 100,
// sem Carta do selo e origem neutra.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame, LABELS_MAX22, suggestLabels22 } from '../src/sim/worldgen';
import { defaultCareers20 } from '../src/sim/past20';
import type { GameState } from '../src/sim/types';
const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);

describe('r22 gravadoras', () => {
  it('a sugestão muda com o ano e com a cidade-sede', () => {
    const a = suggestLabels22(defaultConfig('s1', { startYear: 1962, homeCity: 'london' }));
    const b = suggestLabels22(defaultConfig('s1', { startYear: 2005, homeCity: 'london' }));
    const c = suggestLabels22(defaultConfig('s1', { startYear: 1962, homeCity: 'rio' }));
    expect(a.ids).not.toEqual(b.ids);
    expect(a.ids).not.toEqual(c.ids);
    expect(new Set(a.ids).size).toBe(a.ids.length);
    expect(suggestLabels22(defaultConfig('s1', { startYear: 1900 })).parts.some((p) => p.why === 'acoustic')).toBe(true);
  });

  it('começos novos geram mundos válidos; todas novatas não têm elenco no começo', () => {
    expect(LABELS_MAX22).toBe(400); // R29: sem limite de gravadoras depois de 1950 (teto prático 400)
    for (const start of ['random', 'inverted', 'giants', 'startups'] as const) {
      const s = createGame(defaultConfig(`lb22-${start}`, { startYear: 1975, labels: { start } }));
      expect(Object.values(s.labels).filter((x) => x.active).length).toBeGreaterThan(5);
      if (start === 'startups') expect(Object.values(s.labels).every((x) => x.roster.length === 0)).toBe(true);
      invariant(s);
    }
  });

  it('pede até 100 rivais', () => {
    const s = createGame(defaultConfig('lb22-100', { startYear: 1990, labels: { count: 100 } }));
    expect(Object.values(s.labels).filter((x) => x.founded <= 1990).length).toBeGreaterThanOrEqual(100);
  });
});

describe('r22 carta e origem', () => {
  it('uma Carta antiga na config não tem efeito e a origem padrão é neutra', () => {
    const s = createGame(defaultConfig('c22', { card: 'gambler' }));
    expect(s.player.cash).toBe(createGame(defaultConfig('c22')).player.cash);
    expect(defaultCareers20().origin).toBe('none');
    const g = createGame(defaultConfig('o22', { careers: defaultCareers20() }));
    invariant(g);
  });
});

import { SONGS22 } from '../src/data/songs22';
import { realSongTitle22 } from '../src/sim/sys/realworld';
describe('r22 músicas das curtidas', () => {
  it('dados válidos e títulos reais só com nomes reais e depois do ano', () => {
    for (const [a, xs] of Object.entries(SONGS22)) for (const [t, y] of xs) { expect(t.length, a).toBeGreaterThan(0); expect(y).toBeGreaterThanOrEqual(1950); expect(y).toBeLessThanOrEqual(2026); }
    const s = createGame(defaultConfig('sg22', { startYear: 1972, realNames: true }));
    const doors = Object.values(s.acts).find((a) => a.name === 'The Doors');
    if (doors) {
      const t = realSongTitle22(s, doors);
      expect(SONGS22['The Doors'].some(([x, y]) => x === t && y <= 1973)).toBe(true);
      s.config.realNames = false;
      expect(realSongTitle22(s, doors)).toBeUndefined();
    }
  });
});
