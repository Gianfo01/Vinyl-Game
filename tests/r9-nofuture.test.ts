// Rodada 9 — nada do futuro nas telas, novidades no noticiário e mais eras de negócio.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { ERA_SHIFTS, currentEra, era8, eraYear, erasSoFar, stanceOf } from '../src/sim/sys/eras8';
import { noveltiesBetween } from '../src/sim/sys/novelty9';
import { existsNow, visibleAct } from '../src/sim/future';
import { FESTIVALS } from '../src/data/catalog';
import type { GameState, RunConfig } from '../src/sim/types';

const mk = (seed: string, over: Partial<RunConfig> = {}) => createGame(defaultConfig(seed, { mode: 'historic', scenario: 'established', ...over }));

describe('mais eras', () => {
  it('há pelo menos 12 eras, cada uma com modelo, pergunta e três posturas', () => {
    expect(ERA_SHIFTS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(ERA_SHIFTS.map((e) => e.id)).size).toBe(ERA_SHIFTS.length);
    for (const e of ERA_SHIFTS.slice(1)) {
      expect(e.stances.length).toBe(3);
      expect(e.model.pt && e.model.en && e.question.pt && e.question.en).toBeTruthy();
      expect(new Set(e.stances.map((x) => x.id)).size).toBe(3);
    }
  });

  it('as eras seguem a ordem cronológica e cobrem de 1920 até depois de 2040', () => {
    const s = mk('r9-eras-order', { startYear: 1960 });
    const years = ERA_SHIFTS.map((e) => eraYear(s, e.id)).filter((y): y is number => y !== undefined && Number.isFinite(y));
    expect([...years].sort((a, b) => a - b)).toEqual(years);
    expect(eraYear(s, 'jukebox')).toBe(1935);
    expect(eraYear(s, 'disco')).toBe(s.techDates.synth + 5);
    expect(Math.max(...years)).toBeGreaterThan(2040);
    for (const [y, id] of [[1930, 'radio'], [1940, 'jukebox'], [1957, 'rocknroll'], [1968, 'fm'], [1977, 'disco'], [2005, 'download'], [2020, 'viral']] as const) {
      s.year = y;
      expect(currentEra(s).id).toBe(id);
    }
  });

  it('a era das discotecas pergunta a postura; eras antigas ficam no padrão', () => {
    const s = mk('r9-era-disco', { startYear: 1977 });
    advanceMonth(s);
    expect(currentEra(s).id).toBe('disco');
    expect(s.decisions.some((d) => d.eventId === 'era8_disco')).toBe(true);
    expect(era8(s).chosen.fm?.auto).toBe(true);
    expect(era8(s).chosen.jukebox?.auto).toBe(true);
  });

  it('saves antigos: posturas já escolhidas continuam valendo', () => {
    const s = mk('r9-era-save', { startYear: 1990 });
    era8(s).chosen = { albums: { s: 'works', w: 0 }, cd: { s: 'catalog', w: 10 } };
    expect(stanceOf(s, 'player', 'albums')?.id).toBe('works');
    expect(stanceOf(s, 'player', 'cd')?.id).toBe('catalog');
    // eras novas que já passaram contam com a postura padrão
    expect(stanceOf(s, 'player', 'disco')?.id).toBe('remix');
    expect(erasSoFar(s).map((e) => e.id)).not.toContain('streaming');
  });
});

describe('nada do futuro', () => {
  it('artistas que ainda não estrearam ficam escondidos, a não ser que você já saiba deles', () => {
    const s = mk('r9-nofuture-acts', { startYear: 1960 });
    const a = Object.values(s.acts).find((x) => x.owner !== 'player' && !x.playerBand && !s.knowledge[x.id])!;
    expect(visibleAct(s, a)).toBe(true);
    const saved = a.debutYear;
    a.debutYear = s.year + 2;
    expect(visibleAct(s, a)).toBe(false);
    s.knowledge[a.id] = { actId: a.id, degree: 1, stage: 'signal', bias: 0, updatedWeek: s.week, source: 'scene' } as GameState['knowledge'][string];
    expect(visibleAct(s, a)).toBe(true);
    a.debutYear = saved;
    expect(existsNow(s, s.year + 1)).toBe(false);
    expect(existsNow(s, s.year)).toBe(true);
    expect(existsNow(s, undefined)).toBe(true);
  });

  it('o que nasce no ano sai no noticiário — sem inundar o início da partida', () => {
    const s = mk('r9-novelty', { startYear: 1966 });
    const fest = FESTIVALS.find((f) => f.start === 1967 || f.start === 1968);
    expect(fest).toBeTruthy();
    expect(noveltiesBetween(s, 1966, 1968).some((x) => x.pt.includes(fest!.name))).toBe(true);
    advanceMonth(s);
    const startNews = s.notifications.filter((n) => /Novidades de|Novo festival/.test(n.text.pt)).length;
    expect(startNews).toBe(0);
    let seen = 0;
    while (s.year < 1969) {
      const w0 = s.week;
      advanceMonth(s);
      seen += s.notifications.filter((n) => n.week >= w0 && /Novidades de|Novo festival/.test(n.text.pt)).length;
    }
    expect(seen).toBeGreaterThan(0);
    expect(s.memory.some((m) => m.kind === 'novelty' && m.text.pt.includes(fest!.name))).toBe(true);
  });
});
