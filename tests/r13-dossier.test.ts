// Rodada 13 — dossiês (selo, artista, pessoa) e números do mapa por país.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import {
  actLabelHistory, actMilestones, isFlop, labelShareHistory, labelStats13, personExtraFacts, personLife, splitAwardName,
} from '../src/sim/sys/dossier13';
import { countryStats, formatMix, paintAll, paintAvailable, piracyOf } from '../src/sim/sys/map13';
import type { Release } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';

const mk = (seed: string, y = 1985) => createGame(defaultConfig(seed, { startYear: y }));
const rel = (s: ReturnType<typeof mk>, id: string, actId: string, owner: string, year: number, units: number, peak: number): Release => {
  const r = { id, actId, owner, type: 'lp', title: id, songs: [], week: 0, year, q: 50, appeal: 1, formats: [], stock: 0, pressed: 0, marketing: [], marketingE: 0, territories: [], weekly: [], totalUnits: units, revenue: 0, peak, weeksOnChart: 0, lastPos: 0, coverSeed: 1, shortage: 0, live: false } as unknown as Release;
  s.releases[id] = r;
  return r;
};

describe('dossiê r13', () => {
  it('fatia do selo por ano, histórico de selos e nada do futuro', () => {
    const s = mk('dos-1');
    const lb = Object.values(s.labels).find((x) => x.active)!;
    const a = Object.values(s.acts).find((x) => !x.deceased)!;
    rel(s, 'zz1', a.id, lb.id, s.year - 1, 900000, 1);
    rel(s, 'zz2', a.id, 'player', s.year - 1, 100000, 30);
    rel(s, 'zz3', a.id, lb.id, s.year + 3, 9e9, 1); // futuro: nunca aparece
    const h = labelShareHistory(s, lb.id);
    expect(h.some((x) => x.y > s.year)).toBe(false);
    const ly = h.find((x) => x.y === s.year - 1)!;
    expect(ly.share).toBeGreaterThan(0);
    expect(ly.share).toBeLessThanOrEqual(1);
    expect(labelStats13(s, lb.id).no1).toBeGreaterThanOrEqual(1);
    const hist = actLabelHistory(s, a);
    expect(hist.map((x) => x.owner)).toContain(lb.id);
    expect(hist.every((x) => x.to <= s.year)).toBe(true);
  });

  it('marcos: fracassos e prêmios do artista', () => {
    const s = mk('dos-2');
    const a = Object.values(s.acts).find((x) => !x.deceased)!;
    const flop = rel(s, 'fl1', a.id, 'player', s.year - 2, 3000, 999);
    rel(s, 'hit1', a.id, 'player', s.year - 2, 800000, 1);
    s.awards.push({ year: s.year - 1, category: 'x', releaseId: 'hit1', actId: a.id, name: 'Disco do ano / Album of the year: Teste', byPlayer: true });
    expect(isFlop(s, flop)).toBe(true);
    const m = actMilestones(s, a);
    expect(m.flops.map((r) => r.id)).toContain('fl1');
    expect(m.no1).toBeGreaterThanOrEqual(1);
    expect(m.awards.some((x) => x.relId === 'hit1')).toBe(true);
    expect(splitAwardName('Disco do ano / Album of the year: Teste').name.en).toBe('Album of the year');
  });

  it('pessoa: campos novos de outros sistemas aparecem sozinhos', () => {
    const s = mk('dos-3');
    const p = Object.values(s.persons).find((x) => x.alive)!;
    (p as unknown as Record<string, unknown>).married = true;
    ((s as unknown as { x4: Record<string, unknown> }).x4).chars13 = { by: { [p.id]: { vices: ['drink'], kids: 2 } } };
    const f = personExtraFacts(s, p);
    expect(f.some((x) => x.k === 'married')).toBe(true);
    expect(f.some((x) => x.group.startsWith('chars13') && x.k === 'kids' && x.v === '2')).toBe(true);
    expect(personLife(s, p).health).toBe(p.health);
  });

  it('mapa: números por país e camadas da época', () => {
    const s = mk('dos-4', 1965);
    const st = countryStats(s, 'USA')!;
    expect(st.sizePct).toBeGreaterThan(0.05);
    expect(st.genres.length).toBeGreaterThan(0);
    expect(formatMix(s, 'USA').stream).toBe(0); // sem streaming em 1965
    expect(paintAvailable(s, 'piracy')).toBe(!!s.techDates.cassette && s.year >= s.techDates.cassette);
    const m = paintAll(s, 'market');
    expect(m.v.size).toBeGreaterThan(10);
    expect(m.max).toBeGreaterThan(m.min);
    const late = mk('dos-5', 2005);
    expect(piracyOf(late, 'BRA')).toBeGreaterThan(piracyOf(late, 'USA'));
  });
});
