// Rodada 15 — visual real dos artistas famosos por fase (modo nomes reais).

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { realLook15, REAL_LOOK_NAMES } from '../src/data/looks15';
import { applyRealLooks15 } from '../src/sim/sys/looks15';
import { per13 } from '../src/sim/sys/persona13';
import { HAIR_COLORS, HAIR_STYLES, OUTFIT_COLORS } from '../src/ui/pixel/avatar';

describe('r15 visuais reais', () => {
  it('tabela compacta com fases (Michael Jackson muda 70s → 80s → 90s)', () => {
    expect(REAL_LOOK_NAMES().length).toBeGreaterThanOrEqual(80);
    const a = realLook15('Michael Jackson', 1972)!, b = realLook15('Michael Jackson', 1984)!, c = realLook15('Michael Jackson', 1993)!;
    expect([a.hair, b.hair, c.hair]).toEqual([6, 20, 7]);
    expect(a.skin).toBeGreaterThan(c.skin);
    expect(realLook15('Slash', 1988)).toMatchObject({ hat: true, hatT: 1, hair: 20 });
    expect(realLook15('Thomas Bangalter', 2001)!.helm).toBe(1);
    expect(realLook15('Paul Stanley', 1977)!.paint).toBe(1);
    expect(realLook15('Paul Stanley', 1985)!.paint).toBeUndefined();
    expect(realLook15('Madonna', 1990)!.sx).toBe('f');
    expect(realLook15('Fulano de Tal', 1990)).toBeNull();
    for (const n of REAL_LOOK_NAMES()) for (const y of [1930, 1975, 2025]) {
      const L = realLook15(n, y)!;
      expect(L.hair).toBeLessThan(HAIR_STYLES);
      expect(L.hairColor).toBeLessThan(HAIR_COLORS.length);
      expect(L.outfitColor).toBeLessThan(OUTFIT_COLORS.length);
    }
  });

  it('aplica no modo nomes reais, troca de fase e respeita edição do jogador', () => {
    const s = createGame(defaultConfig('r15-looks', { startYear: 1964, realNames: true, mode: 'historic' }));
    const john = Object.values(s.persons).find((p) => p.name === 'John Lennon')!;
    expect(john.look?.rl).toBe('John Lennon@0');
    expect(john.look?.hair).toBe(5);
    s.year = 1970;
    applyRealLooks15(s);
    expect(john.look?.hair).toBe(7);
    expect(john.look?.beard).toBe(true);
    const paul = Object.values(s.persons).find((p) => p.name === 'Paul McCartney')!;
    paul.look = { ...paul.look!, hair: 0 };
    delete paul.look.rl;
    s.year = 1981;
    applyRealLooks15(s);
    expect(paul.look.hair).toBe(0);
    // pele real alimenta a ficha (persona13)
    const elvis = Object.values(s.persons).find((p) => p.name === 'Elvis Presley');
    if (elvis) expect(per13(s, `p:${elvis.id}`)!.skin).toBe(0);
  });

  it('modo ficcional não grava visuais reais', () => {
    const s = createGame(defaultConfig('r15-looks', { startYear: 1964, realNames: false, mode: 'historic' }));
    expect(Object.values(s.persons).filter((p) => p.look?.rl).length).toBe(0);
  });
});
