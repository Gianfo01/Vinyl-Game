import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { resolveDecision } from '../src/sim/events';
import { ownConseq18 } from '../src/sim/decide18';
import { explain18 } from '../src/sim/explain18';
import { factListeners19, recentFacts } from '../src/sim/facts17';
import { realAllowed } from '../src/sim/dbsize14';
import { FAMILIES, cityById, genreById } from '../src/data/world';
import { GEOPOLITICS, censorshipIn, geoActive, geoById } from '../src/data/content';
import { H19, GEO19 } from '../src/data/hist19';
import type { RealArtist } from '../src/data/realtypes';
import { MILESTONES } from '../src/sim/sys/world4/milestones';
import { w4 } from '../src/sim/sys/world4/state';
import { dec18, fire18 } from '../src/sim/sys/decide18';
import { OPTS19, active19, cards19, fits19, hist19, histParts19, mech19, tribProne19, H19_BY_ID } from '../src/sim/sys/history19';
import { REGIMES18, regimeAt18 } from '../src/sim/sys/society18';
import { REAL_ALL } from '../src/sim/sys/realworld';
import type { Act, GameState } from '../src/sim/types';

const fams = new Set<string>(FAMILIES.map((f) => f.id));
const mineAct = (s: GameState): Act => {
  const a = Object.values(s.acts).filter((x) => x.status !== 'retired' && x.status !== 'split' && x.members.length >= 1 && !x.catalogNo).sort((x, y) => x.id.localeCompare(y.id))[0];
  a.owner = 'player'; a.status = 'active';
  return a;
};
function until(s: GameState, y: number, m: number): void { let n = 0; while ((s.year < y || (s.year === y && s.month < m)) && n++ < 400) { s.player.cash = Math.max(s.player.cash, 5e6); advanceMonth(s); } }

describe('r19 T8 history19 — marcos 1925–2026 com decisão e ecos', () => {
  it('~150 marcos, todos os anos 1925–2026 cobertos, dados válidos', () => {
    expect(MILESTONES.length).toBeGreaterThanOrEqual(150);
    const ys = new Set(MILESTONES.map((m) => m.year));
    for (let y = 1925; y <= 2026; y++) expect(ys.has(y), `ano ${y}`).toBe(true);
    expect(new Set(MILESTONES.map((m) => m.id)).size).toBe(MILESTONES.length);
    for (const h of H19) {
      for (const g of h.g ?? []) expect(fams.has(g) || !!genreById[g], `${h.id} ${g}`).toBe(true);
      expect(h.y).toBeLessThanOrEqual(2026);
      expect(h.x.pt.length > 40 && h.x.en.length > 40, h.id).toBe(true);
      expect(h.ref.length).toBeGreaterThan(4);
      expect(mech19(h).en.length).toBeGreaterThan(10);
      // toda opção do cartão tem eco escrito à mão
      for (const o of OPTS19[h.k]) expect(ownConseq18(`ev:${h.id}:${o.id}`)?.later?.length, `${h.id}:${o.id}`).toBeGreaterThan(0);
    }
  });

  it('nada do futuro: começo em 1975 marca o passado em silêncio e não dispara o que vem depois', () => {
    const s = createGame(defaultConfig('r19-h-1', { startYear: 1975 }));
    advanceMonth(s);
    const ms = w4(s).ms;
    for (const h of H19) {
      if (h.y > 1975) expect(ms[h.id], h.id).toBeUndefined();
      else if (h.y < 1975 && !h.tech) expect(ms[h.id], h.id).toBeLessThan(0);
    }
    expect(cards19(s).every((c) => c.h.y <= 1975)).toBe(true);
    expect(s.decisions.some((d) => d.eventId === 'h19_autobahn')).toBe(false);
  });

  it('o marco dispara na data: fato com ouvinte, apelo para o estilo, cartão com decisão, eco e "na sua partida"', () => {
    const s = createGame(defaultConfig('r19-h-2', { startYear: 1955 }));
    s.config.history = 'loose';
    const a = mineAct(s);
    a.genre = 'rockabilly'; a.city = 'memphis';
    until(s, 1955, 7);
    const h = H19_BY_ID.h19_rock_clock;
    expect(w4(s).ms[h.id]).toBe(1955);
    expect(active19(s, h)).toBe(true);
    expect(recentFacts(s, { kind: 'milestone_turn', months: 24 }).some((f) => f.tags.includes(h.id))).toBe(true);
    expect(factListeners19().some((x) => x.kind === 'milestone_turn')).toBe(true);
    expect(fits19(h, a)).toBe(true);
    const rel = { type: 'single' } as never;
    expect(histParts19(s, rel, a).some((p) => p.h.id === h.id && p.k > 1)).toBe(true);
    const why = explain18(s, 'hist19.ap', { act: a.id });
    expect(why && why.parts.length).toBeGreaterThan(0);
    const d = s.decisions.find((x) => x.eventId === h.id)!;
    expect(d).toBeTruthy();
    expect(d.ctx.act).toBe(a.id);
    resolveDecision(s, d.id, 'ride');
    expect(hist19(s).run[h.id]?.opt).toBe('ride');
    expect(recentFacts(s, { kind: 'real_history', months: 2 }).some((f) => f.tags.includes(h.id))).toBe(true);
    const e = dec18(s).q.find((x) => x.k === `ev:${h.id}:ride`)!;
    expect(e).toBeTruthy();
    e.p = 1;
    const fame0 = a.fame;
    fire18(s, e);
    expect(a.fame).toBeGreaterThan(fame0);
    const card = cards19(s).find((c) => c.h.id === h.id)!;
    expect(card.alt).toBe(true);
    expect(card.run?.out?.pt).toContain(a.name);
  });

  it('geopolítica 37 → ~60 e regimes novos no society18', () => {
    expect(GEOPOLITICS.length).toBeGreaterThanOrEqual(60);
    for (const g of GEO19) { expect(geoById[g.id], g.id).toBeTruthy(); for (const c of g.cities ?? []) expect(cityById[c], `${g.id} ${c}`).toBeTruthy(); }
    expect(geoActive(1970, 'asia').some((g) => g.id === 'geo19_cultural_rev')).toBe(true);
    expect(censorshipIn(1970, 'asia').level).toBeGreaterThanOrEqual(0.9);
    expect(geoActive(1985, 'asia').some((g) => g.id === 'geo19_cultural_rev')).toBe(false);
    expect(REGIMES18.some((r) => r.id === 'cn19')).toBe(true);
    const s = createGame(defaultConfig('r19-h-3', { startYear: 1970 }));
    expect(regimeAt18(s, 'CHN')?.id).toBe('cn19');
  });

  it('flags de dados: exact:false some do modo exato; T marca tributo', () => {
    const a: RealArtist = { n: 'Teste †', g: 'pop', c: 'london', d: 1990, t: 3, cn: 'GBR', z: 1, exact: false };
    expect(realAllowed({ dbSize: 'medium', history: 'strict' }, a)).toBe(false);
    expect(realAllowed({ dbSize: 'medium', history: 'loose' }, a)).toBe(true);
    expect(REAL_ALL.find((x) => x.n === 'AC/DC')?.T).toBe(true);
    const s = createGame(defaultConfig('r19-h-4', { startYear: 1980, realNames: true }));
    const abba = Object.values(s.acts).find((x) => x.name === 'ABBA');
    if (abba) expect(tribProne19(abba)).toBe(true);
    const plain = Object.values(s.acts).find((x) => !x.catalogNo)!;
    expect(tribProne19(plain)).toBe(false);
  });
});
