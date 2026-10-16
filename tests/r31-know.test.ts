// Masters 31 (onda 0, W0-KN) — conhecimento em fonte única (src/sim/know.ts).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame, talentScore } from '../src/sim/worldgen';
import { KNOW_WIDTHS, band, know, know3 } from '../src/sim/know';
import { estimate } from '../src/sim/scouting';
import { fameText, knownLevel } from '../src/sim/sys/fame15';

const ROOT = join(__dirname, '..');

describe('r31 know — o que se sabe vem de um lugar só', () => {
  it('o meio da faixa nunca é o valor real (desvio determinístico e estável)', () => {
    const s = createGame(defaultConfig('r31-know', { startYear: 1980 }));
    const others = Object.values(s.acts).filter((a) => a.owner !== 'player' && !a.playerBand).slice(0, 40);
    expect(others.length).toBeGreaterThan(10);
    let ranges = 0;
    for (const a of others) {
      s.knowledge[a.id] = { actId: a.id, degree: 3, stage: 'investigating', bias: 0, updatedWeek: s.week, source: 'watch' };
      const pot = estimate(s, a.id, 'potential')!;
      const tal = estimate(s, a.id, 'talent')!;
      expect(pot).not.toBeNull();
      expect(tal).not.toBeNull();
      expect(pot.mid).not.toBe(Math.round(a.potential));
      expect((pot.lo + pot.hi) / 2).not.toBe(a.potential);
      expect(tal.mid).not.toBe(Math.round(talentScore(s, a)));
      // estável: a mesma pergunta dá a mesma faixa
      expect(estimate(s, a.id, 'potential')).toEqual(pot);
      ranges++;
    }
    expect(ranges).toBeGreaterThan(10);
    // valores nas bordas também saem do centro
    for (const v of [0, 1, 50, 99, 100]) for (const w of [3, 10, 30]) {
      const b = band(s, 'x', `edge.${v}.${w}`, v, w)!;
      expect(b.mid).not.toBe(v);
      expect(b.lo).toBeLessThanOrEqual(b.hi);
    }
    // oculto e exato
    expect(band(s, 'x', 'f', 40, 99)).toBeNull();
    expect(band(s, 'x', 'f', 40, 0)).toEqual({ lo: 40, hi: 40, mid: 40, exact: true });
  });

  it('a mesma pessoa mostra o mesmo grau em estimate e fameText (regra do país do jogador, sem atalho de fama ≥ 30)', () => {
    const s = createGame(defaultConfig('r31-know2', { startYear: 1990 }));
    const acts = Object.values(s.acts).filter((a) => a.owner !== 'player' && !a.playerBand);
    let exact = 0, range = 0, hidden = 0;
    for (const a of acts.slice(0, 300)) {
      const e = estimate(s, a.id, 'fame');
      const ft = fameText(s, a.id);
      if (!e) { expect(ft).toBe('?'); hidden++; continue; }
      if (e.lo === e.hi) { expect(ft).toBe(String(e.lo)); exact++; } else { expect(ft).toBe(`${e.lo}–${e.hi}`); range++; }
      // exato ⇔ público no país do jogador (pub ≥ 2), não a fama global
      expect(e.lo === e.hi).toBe(knownLevel(s, a.id).pub >= 2);
    }
    expect(exact + range + hidden).toBeGreaterThan(50);
    // fama global alta não basta: sem exposição no país do jogador, nada de número exato
    const far = acts.find((a) => knownLevel(s, a.id).pub < 2);
    if (far) { far.fame = Math.max(far.fame, 35); if (knownLevel(s, far.id).pub < 2) expect(estimate(s, far.id, 'fame')?.lo === estimate(s, far.id, 'fame')?.hi).toBe(false); }
  });

  it('larguras vêm de uma tabela só (sim), e a UI não guarda a sua', () => {
    const s = createGame(defaultConfig('r31-know3', { startYear: 1980 }));
    const a = Object.values(s.acts).find((x) => x.owner !== 'player' && !x.playerBand)!;
    for (let d = 0; d <= 5; d++) {
      s.knowledge[a.id] = { actId: a.id, degree: d, stage: 'investigating', bias: 0, updatedWeek: s.week, source: 'watch' };
      const k = know(s, a.id);
      expect(k.width('attrs')).toBe(KNOW_WIDTHS.attrs.byDeg[k.priv]);
      expect(know3(k)).toBe(know3(know(s, a.id))); // mesma conta para a página de conhecidos
      const e = estimate(s, a.id, 'potential');
      expect(e === null).toBe(k.width('potential') >= 99);
    }
    // as tabelas antigas saíram dos consumidores
    const ui = readFileSync(join(ROOT, 'src/ui/sys/persona13.ts'), 'utf8');
    expect(ui).not.toMatch(/\[99,\s*30,\s*18,\s*10,\s*4,\s*0\]/);
    const sc = readFileSync(join(ROOT, 'src/sim/scouting.ts'), 'utf8');
    expect(sc).not.toMatch(/\[40,\s*26,\s*15,\s*8,\s*3\]|\[16,\s*10,\s*6,\s*4,\s*2\]/);
    const f15 = readFileSync(join(ROOT, 'src/sim/sys/fame15.ts'), 'utf8');
    expect(f15).not.toMatch(/k\.deg >= 3 \? 6 : 12/);
  });
});
