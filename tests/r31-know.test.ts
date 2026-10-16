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
    // perto das bordas e com v ≈ w/2, em várias larguras: nem o centro nem o palpite caem no valor real
    for (const w of [3, 6, 8, 10, 15, 18, 20, 24, 26, 30]) for (const v of [0, 0.5, 1, 2, w / 2 - 1, w / 2 - 0.5, w / 2, w / 2 + 0.5, w / 2 + 1, 50, 100 - w / 2, 98, 99, 100]) for (const id of ['a', 'b', 'c', 'd']) {
      const b = band(s, id, `edge2.${v}`, v, w)!;
      expect(b.mid).not.toBe(Math.round(v));
      expect(Math.abs((b.lo + b.hi) / 2 - v)).toBeGreaterThanOrEqual(0.5);
      expect(b.lo).toBeGreaterThanOrEqual(0);
      expect(b.hi).toBeLessThanOrEqual(100);
    }
    // combinar duas leituras de larguras diferentes (extrapolação linear v = (c1·w2 − c2·w1)/(w2 − w1)) não devolve
    // mais o valor real: com a fração fixa por alvo (W0) o erro era ~0 em 100% dos casos. Limite matemático: com sinal
    // estável e |desvio| em 20–45% de w, a faixa mais estreita sozinha já prende o valor em 0,45·w — por isso a medida
    // é feita com larguras ≥ 10 (a faixa estreita de grau alto é de propósito quase exata).
    let hit3 = 0, hit1 = 0, n = 0, err = 0;
    const pairs: [number, number][] = [[26, 15], [30, 18], [18, 10], [20, 11], [24, 13]];
    for (let i = 0; i < 200; i++) for (const [w1, w2] of pairs) {
      const v = 20 + (i * 37) % 60;
      const b1 = band(s, `t${i}`, 'talent', v, w1)!, b2 = band(s, `t${i}`, 'talent', v, w2)!;
      for (const [c1, c2] of [[(b1.lo + b1.hi) / 2, (b2.lo + b2.hi) / 2], [b1.mid, b2.mid]]) {
        const e = Math.abs((c1 * w2 - c2 * w1) / (w2 - w1) - v);
        n++; err += e;
        if (e < 3) hit3++;
        if (e < 1) hit1++;
      }
    }
    expect(hit1 / n).toBeLessThan(0.35);
    expect(hit3 / n).toBeLessThan(0.75);
    expect(err / n).toBeGreaterThanOrEqual(2);
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
