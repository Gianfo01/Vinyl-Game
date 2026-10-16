// Rodada 19 (Frente 10) — WP-D2/WP-D3: FRA/DEU/AUT/CHE/Benelux/Ibéria/GRC, Oceania e anos 2020.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { PACK as D2 } from '../src/data/more19/wp_d2';
import { PACK as D3 } from '../src/data/more19/wp_d3';
import { ARTISTS19, norm19 } from '../src/data/more19';
import { REAL_ALL } from '../src/sim/sys/realworld';

const mine = [...(D2.artists ?? []), ...(D3.artists ?? [])];
const inGame = (startYear: number, months: number) => {
  const s = createGame(defaultConfig('r19-d-' + startYear, { startYear, mode: 'historic', realNames: true, dbSize: 'large' }));
  for (let i = 0; i < months; i++) advanceMonth(s);
  return new Set(Object.values(s.acts).map((a) => a.name));
};

describe('r19 WP-D2/D3: pacotes de artistas', () => {
  it('contagens e nenhuma duplicata (nem entre os dois pacotes nem contra a base)', () => {
    expect(D2.artists!.length).toBeGreaterThanOrEqual(60);
    expect(D3.artists!.length).toBeGreaterThanOrEqual(80);
    const names = mine.map((a) => norm19(a.n));
    expect(new Set(names).size).toBe(names.length);
    const packed = new Set(ARTISTS19);
    const base = new Set(REAL_ALL.filter((a) => !packed.has(a)).map((a) => norm19(a.n)));
    expect(names.filter((n) => base.has(n))).toEqual([]);
    for (const a of mine) expect(REAL_ALL).toContain(a);
  });

  it('sem artistas com condenação/crime (regra de pessoas reais) e nada além de 2026', () => {
    const banned = ['rolfharris', 'vybzkartel'];
    expect(mine.filter((a) => banned.includes(norm19(a.n)))).toEqual([]);
    expect(mine.every((a) => a.d <= 2026 && (!a.e || a.e <= 2026))).toBe(true);
  });

  it('entradas aparecem no jogo no ano real e não antes (gating por estreia)', () => {
    const at77 = inGame(1977, 0);
    expect(at77.has('Yello')).toBe(false);
    expect(at77.has('The Saints')).toBe(true);
    expect(at77.has('Powderfinger')).toBe(false);
    expect(at77.has('ILLIT')).toBe(false);
    const at2023 = inGame(2023, 0);
    expect(at2023.has('ILLIT')).toBe(false);
    expect(at2023.has('RIIZE')).toBe(true);
    // estreia durante a partida: aparece só depois do ano real
    const run = inGame(2022, 30);
    expect(run.has('ILLIT')).toBe(true);
  }, 240000); // R31 onda 4 (BASE-HITS): +1 044 atos reais no mundo de 2022 deixam as 30 viradas de mês mais lentas (docs/r31/base-hits.md)
});
