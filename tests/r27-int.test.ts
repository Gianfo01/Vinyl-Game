// r27 INT: ganchos de integração — gramofone clicável e vaga da garagem na sede em pixel, cena nova de traição.
import { describe, expect, it } from 'vitest';
import { paint27, plan27, slotXY27 } from '../src/ui/ps/hqpx27';
import { CUT27, CUT_KEYS27, onceKey27, type CutData27 } from '../src/ui/ps/cut27model';

describe('r27 INT — sede em pixel', () => {
  it('o toca-discos do lounge devolve a caixa clicável em toda casca e época', () => {
    for (const hq of [0, 1, 2, 3, 4, 5]) for (const year of [1925, 1958, 1978, 1995, 2020]) {
      const pl = plan27({ hq, year });
      paint27(pl);
      if (!pl.cells.some((c) => c.kind === 'lounge')) continue;
      expect(pl.gramo, `${hq}/${year}`).toBeDefined();
      const [x, y, w, h] = pl.gramo!;
      expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(pl.W); expect(y + h).toBeLessThanOrEqual(pl.H);
    }
  });
  it('a vaga da garagem fica dentro da porta (garagem) ou na rua (outras cascas), sempre dentro do quadro', () => {
    for (const hq of [0, 1, 2, 3, 4, 5]) {
      const pl = plan27({ hq, year: 1978 });
      const at = slotXY27(pl, 'garage', 26, 16)!;
      expect(at).not.toBeNull();
      expect(at[0]).toBeGreaterThanOrEqual(0); expect(at[0] + 26).toBeLessThanOrEqual(pl.W);
      expect(at[1] + 16).toBeLessThanOrEqual(pl.H);
      if (hq === 0) { const lob = pl.cells.find((c) => c.kind === 'lobby')!; expect(at[0]).toBeGreaterThanOrEqual(lob.x); expect(at[1] + 16).toBeLessThanOrEqual(lob.y + lob.h); }
      else expect(at[1] + 16).toBeGreaterThan(pl.gy);
    }
    expect(slotXY27(plan27({ hq: 2, year: 1978 }), 'roof', 10, 10)).toBeNull();
  });
});

describe('r27 INT — cenas das atividades', () => {
  it('traição é uma cena maior, sem escolhas, com chave "uma vez" por trimestre como a batida', () => {
    expect(CUT_KEYS27).toContain('betray');
    expect(CUT27.betray.tier).toBe('major');
    expect(CUT27.betray.choices.length).toBe(0);
    const d = (week: number): CutData27 => ({ key: 'betray', ref: 'x', year: 1978, week });
    expect(onceKey27('betray', d(10))).toBe(onceKey27('betray', d(11)));
    expect(onceKey27('betray', d(10))).not.toBe(onceKey27('betray', d(30)));
  });
});
