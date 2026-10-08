// Integridade do conteúdo expandido: cidades, gêneros, catálogo, dados de content.ts e eventos extras.

import { describe, expect, it } from 'vitest';
import { CATALOG_ACTS, CATALOG_LABELS, FESTIVALS, MEDIA, STUDIOS, VENUES } from '../src/data/catalog';
import { FIRST_NAMES, LAST_NAMES } from '../src/data/people';
import { CITIES, FAMILIES, GENRES, MARKETS, cityById, genreById } from '../src/data/world';
import {
  AWARDS, BRANDS, CHARTS, CRITICS, GEOPOLITICS, MOVEMENTS, OUTLETS, PLATFORMS, PRODUCERS, TECH_ERAS,
} from '../src/data/content';
import { defaultConfig, simulate } from '../src/sim/bot';
import { EVENTS } from '../src/sim/events';
import { MORE_EVENTS } from '../src/sim/events_more';

const familyIds = new Set(FAMILIES.map((f) => f.id));
const marketIds = new Set(MARKETS.map((m) => m.id));

describe('cidades', () => {
  it('mais de 110 cidades, ids únicos', () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(110);
    expect(new Set(CITIES.map((c) => c.id)).size).toBe(CITIES.length);
  });
  it('mercado, idioma, coordenadas e cenas válidos', () => {
    for (const c of CITIES) {
      expect(marketIds.has(c.market), c.id).toBe(true);
      expect(FIRST_NAMES[c.lang]?.length, `${c.id} first names`).toBeGreaterThan(3);
      expect(LAST_NAMES[c.lang]?.length, `${c.id} last names`).toBeGreaterThan(3);
      expect(c.lat).toBeGreaterThanOrEqual(-90);
      expect(c.lat).toBeLessThanOrEqual(90);
      expect(c.lon).toBeGreaterThanOrEqual(-180);
      expect(c.lon).toBeLessThanOrEqual(180);
      expect(c.lat !== 0 || c.lon !== 0, c.id).toBe(true);
      expect(c.scenes.length, c.id).toBeGreaterThan(0);
      for (const g of c.scenes) expect(genreById[g], `${c.id}:${g}`).toBeDefined();
      expect(c.name.pt && c.name.en).toBeTruthy();
    }
  });
  it('todos os mercados têm várias cidades', () => {
    for (const m of MARKETS) expect(CITIES.filter((c) => c.market === m.id).length, m.id).toBeGreaterThanOrEqual(7);
  });
});

describe('gêneros', () => {
  it('ids únicos, famílias válidas e pais existentes nascidos antes', () => {
    expect(new Set(GENRES.map((g) => g.id)).size).toBe(GENRES.length);
    for (const g of GENRES) {
      expect(familyIds.has(g.family), g.id).toBe(true);
      expect(g.born).toBeGreaterThanOrEqual(1920);
      expect(g.born).toBeLessThanOrEqual(2040);
      for (const p of g.parents) {
        expect(genreById[p], `${g.id} <- ${p}`).toBeDefined();
        expect(g.born, `${g.id} <- ${p}`).toBeGreaterThanOrEqual(genreById[p].born - 5);
      }
    }
  });
  it('eras 1920–59 e 2030–40 bem servidas', () => {
    expect(GENRES.filter((g) => g.born < 1960).length).toBeGreaterThanOrEqual(60);
    expect(GENRES.filter((g) => g.born >= 2030).length).toBeGreaterThanOrEqual(15);
  });
});

describe('catálogo', () => {
  it('gêneros e cidades do catálogo existem', () => {
    for (const a of CATALOG_ACTS) {
      expect(genreById[a.genre], a.name).toBeDefined();
      expect(cityById[a.city], a.name).toBeDefined();
    }
    for (const lb of CATALOG_LABELS) {
      expect(cityById[lb.city], lb.name).toBeDefined();
      for (const f of lb.focus) expect(familyIds.has(f as never), lb.name).toBe(true);
    }
    for (const f of FESTIVALS) {
      expect(cityById[f.city], f.name).toBeDefined();
      for (const fam of f.focus) expect(familyIds.has(fam as never), f.name).toBe(true);
      for (const g of f.genres ?? []) expect(genreById[g], `${f.name}:${g}`).toBeDefined();
    }
    for (const v of VENUES) expect(cityById[v.city], v.name).toBeDefined();
    for (const st of STUDIOS) expect(cityById[st.city], st.name).toBeDefined();
    expect(MEDIA.filter((m) => m.realRef).length).toBeGreaterThan(20);
  });
});

describe('content.ts', () => {
  const uniq = (xs: { id: string }[]) => new Set(xs.map((x) => x.id)).size === xs.length;
  it('quantidades mínimas e ids únicos', () => {
    expect(PRODUCERS.length).toBeGreaterThanOrEqual(40);
    expect(CRITICS.length).toBeGreaterThanOrEqual(30);
    expect(BRANDS.length).toBeGreaterThanOrEqual(40);
    expect(AWARDS.length).toBeGreaterThanOrEqual(12);
    for (const arr of [PLATFORMS, OUTLETS, CRITICS, PRODUCERS, BRANDS, AWARDS, MOVEMENTS, GEOPOLITICS, TECH_ERAS, CHARTS]) expect(uniq(arr)).toBe(true);
  });
  it('referências cruzadas válidas', () => {
    const outletIds = new Set(OUTLETS.map((o) => o.id));
    for (const c of CRITICS) expect(outletIds.has(c.outlet), c.id).toBe(true);
    for (const p of PRODUCERS) {
      expect(cityById[p.city], p.id).toBeDefined();
      for (const f of p.families) expect(familyIds.has(f), p.id).toBe(true);
      expect(p.skill).toBeGreaterThanOrEqual(40);
      expect(p.skill).toBeLessThanOrEqual(95);
    }
    for (const o of OUTLETS) for (const f of [...o.bias.favored, ...o.bias.disfavored]) expect(familyIds.has(f), o.id).toBe(true);
    for (const m of MOVEMENTS) {
      for (const g of m.parents) expect(genreById[g], `${m.id}:${g}`).toBeDefined();
      for (const c of m.cities) expect(cityById[c], `${m.id}:${c}`).toBeDefined();
    }
    for (const g of GEOPOLITICS) for (const mk of g.markets) expect(marketIds.has(mk), g.id).toBe(true);
    for (const a of AWARDS) expect(a.categories.length, a.id).toBeGreaterThan(1);
  });
});

describe('eventos extras', () => {
  it('pelo menos 120 eventos novos, ids únicos em EVENTS', () => {
    expect(MORE_EVENTS.length).toBeGreaterThanOrEqual(120);
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
    for (const e of MORE_EVENTS) expect(EVENTS.includes(e), e.id).toBe(true);
  });
  it('textos PT/EN e pelo menos 2 opções', () => {
    for (const e of MORE_EVENTS) {
      expect(e.title.pt && e.title.en && e.text.pt && e.text.en, e.id).toBeTruthy();
      expect(e.options.length, e.id).toBeGreaterThanOrEqual(2);
      expect(e.find, e.id).toBeDefined();
      for (const o of e.options) expect(o.label.pt && o.label.en, `${e.id}:${o.id}`).toBeTruthy();
      expect(new Set(e.options.map((o) => o.id)).size, e.id).toBe(e.options.length);
    }
  });
});

describe('simulação longa com o conteúdo novo', () => {
  for (const [seed, start] of [['content-a', 1920], ['content-b', 1960], ['content-c', 2005]] as const) {
    it(`30 anos sem exceção e caixa fechando (${seed}, ${start})`, () => {
      const { state } = simulate(defaultConfig(seed, { startYear: start, storyteller: 'acaso' }), 30);
      expect(state.player.cash).toBe(state.player.initialCash + state.player.totalPosted);
    }, 120000);
  }
});
