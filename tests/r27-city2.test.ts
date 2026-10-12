// Rodada 27 (CITY2): a cidade inteira é clicável — lugares básicos da música por época, toda construção com
// interação, nada de escritório estrangeiro no bairro, interior por tipo.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceWeek } from '../src/sim/tick';
import { buildings18 } from '../src/sim/sys/campus18';
import { localRivals19, nb19 } from '../src/sim/sys/hood19';
import { MUSIC27, covered27, doPlace27, eraWhat27, placeActs27, places27, required27, type PlaceK27 } from '../src/sim/sys/place27';
import { LOTS18 } from '../src/sim/sys/campus18';
import { fillerLots27, forSale27, nbInfo27 } from '../src/ui/pixel/city27';
import { INTERIOR_KINDS27, interior27 } from '../src/ui/pixel/interior27';
import { countryOfCity } from '../src/data/geo';

const game = (city: string, year: number, seed = 'c2') => {
  const cfg = defaultConfig(`${seed}-${city}-${year}`, { scenario: 'established', startYear: year, homeCity: city });
  (cfg as { dbSize?: string }).dbSize = 'small';
  const g = createGame(cfg);
  advanceWeek(g);
  return g;
};
const placesOf = (g: ReturnType<typeof game>) => places27(g, fillerLots27(g, forSale27(g)), nb19(g), (n) => LOTS18[n]?.vis ?? 1);

describe('r27 CITY2 lugares básicos por época', () => {
  const cases: [string, number][] = [['london', 1962], ['rio', 1985], ['new_york', 2005], ['london', 1905], ['paris', 1930]];
  for (const [city, year] of cases) it(`${city} ${year}: todo lugar básico da época existe (seu ou NPC)`, () => {
    const g = game(city, year);
    const ps = placesOf(g);
    const have = covered27(g, ps);
    for (const k of required27(g)) expect(have.has(k), `${city} ${year} sem ${k}`).toBe(true);
  });
  it('rádio só depois de 1922; partituras antes de 1920, CD nos anos 90, vinil depois', () => {
    expect(required27(game('london', 1905))).not.toContain('radio');
    expect(required27(game('london', 1962))).toContain('radio');
    expect(eraWhat27('records', 1910).en).toMatch(/Sheet music/);
    expect(eraWhat27('records', 1995).en).toMatch(/CD/);
    expect(eraWhat27('records', 2015).en).toMatch(/Vinyl/);
    expect(eraWhat27('bar', 1962, 'london').en).toMatch(/Pub/);
  });
  it('mesmo sem lote livre o básico existe (divide um prédio)', () => {
    const g = game('london', 1962);
    const ps = places27(g, [], nb19(g).slice(0, 1));
    const have = covered27(g, ps);
    for (const k of required27(g)) expect(have.has(k)).toBe(true);
  });
});

describe('r27 CITY2 toda construção é interativa', () => {
  for (const [city, year] of [['london', 1962], ['rio', 1985], ['new_york', 2005]] as [string, number][]) it(`${city} ${year}: cada lote ocupado tem lugar ou prédio seu com ações`, () => {
    const g = game(city, year);
    const ps = placesOf(g);
    const sale = forSale27(g).map((x) => x.lot);
    const fill = fillerLots27(g, forSale27(g));
    // todo lote de cidade comum e todo vizinho virou lugar
    for (const lot of fill) expect(ps.some((p) => p.lot === lot && p.id === `pl:${lot}`)).toBe(true);
    for (const nb of nb19(g)) expect(ps.some((p) => p.id === `nb:${nb.lot}`)).toBe(true);
    // cada lugar tem dono, gente dentro, interior e pelo menos uma ação
    for (const p of ps) {
      expect(p.owner.length).toBeGreaterThan(0);
      expect(p.people.length).toBeGreaterThan(0);
      expect(placeActs27(g, p).length, `${p.id} ${p.k}`).toBeGreaterThan(0);
      expect(interior27(p.k, g.year, p.people.length).props.length).toBeGreaterThan(0);
    }
    // os lugares não pisam nos lotes à venda
    for (const lot of sale) expect(ps.some((p) => p.lot === lot)).toBe(false);
  });
  it('ações com efeito real: show na casa vira turnê de uma data; ensaio afia a banda', () => {
    const g = game('london', 1962);
    g.player.cash += 5_000_000;
    const ps = placesOf(g);
    const venue = ps.find((p) => p.k === 'venue') ?? { id: 'pl:99', k: 'venue' as PlaceK27, src: 'fill' as const, name: { pt: 'Casa', en: 'Venue' } };
    const a = Object.values(g.acts).find((x) => x.owner === 'player' && !g.tours.some((t) => t.actId === x.id))!;
    const n0 = g.tours.length;
    const r = doPlace27(g, venue, 'show', a.id);
    if (r.ok) expect(g.tours.length).toBe(n0 + 1);
    else expect(r.text.pt.length).toBeGreaterThan(0);
    const reh = { id: 'pl:98', k: 'rehearsal' as PlaceK27, src: 'fill' as const, name: { pt: 'Sala', en: 'Room' } };
    const before = a.rehearsed;
    const r2 = doPlace27(g, reh, 'rehearse', a.id);
    expect(r2.ok).toBe(true);
    expect(a.rehearsed).toBeGreaterThan(before);
    // segunda vez no mesmo mês: bloqueado
    expect(doPlace27(g, reh, 'rehearse', a.id).ok).toBe(false);
  });
  it('vitrine na loja: custa, dá fãs e entra em espera', () => {
    const g = game('rio', 1985);
    g.player.cash += 5_000_000;
    const a = Object.values(g.acts).find((x) => x.owner === 'player')!;
    const shop = { id: 'pl:97', k: 'records' as PlaceK27, src: 'fill' as const, name: { pt: 'Loja', en: 'Shop' } };
    const cash = g.player.cash, fans = a.fans.casual;
    expect(doPlace27(g, shop, 'instore', a.id).ok).toBe(true);
    expect(g.player.cash).toBeLessThan(cash);
    expect(a.fans.casual).toBeGreaterThan(fans);
    expect(placeActs27(g, shop, a.id).find((x) => x.id === 'instore')?.dis).toBeTruthy();
  });
});

describe('r27 CITY2 filial/escritório estrangeiro fora do bairro', () => {
  it('rival vizinho é sempre da cidade (ou do país) da sede', () => {
    for (const [city, year] of [['london', 1962], ['london', 1985], ['rio', 1985], ['new_york', 2005]] as [string, number][]) {
      const g = game(city, year);
      // uma gravadora brasileira grande no mundo não pode virar escritório no bairro de Londres
      g.labels.br27 = { ...Object.values(g.labels)[0], id: 'br27', name: 'Discos do Brasil', city: city === 'rio' ? 'paris' : 'rio', founded: 1900, active: true, closedYear: undefined, roster: [] };
      const c = countryOfCity(city);
      for (const r of localRivals19(g)) expect(r.city === city || countryOfCity(r.city) === c).toBe(true);
      for (const nb of nb19(g)) if (nb.k === 'rival' && nb.who) { const lb = g.labels[nb.who]; expect(lb.city === city || countryOfCity(lb.city) === c, `${city}: ${lb.name} (${lb.city})`).toBe(true); }
      for (const x of nbInfo27(g)) expect(x.who.pt).not.toMatch(/Discos do Brasil/);
      for (const p of placesOf(g)) expect(p.owner).not.toBe('Discos do Brasil');
    }
  });
  it('filial em outra cidade não entra no mapa da sede', () => {
    const g = game('london', 1985);
    g.branches = [...(g.branches ?? []), { id: 'brX', city: 'rio', level: 0, name: `${g.config.companyName} Rio de Janeiro`, opened: g.week } as (typeof g.branches)[number]];
    const b = buildings18(g).find((x) => x.id === 'br:brX')!;
    expect(b.zone).toBe('world');
  });
});

describe('r27 CITY2 interior por tipo', () => {
  it('cada tipo tem modelo próprio com mobília da época', () => {
    for (const k of INTERIOR_KINDS27) {
      const m = interior27(k, 1962, 4);
      expect(m.props.length, k).toBeGreaterThan(1);
      expect(m.spots.length, k).toBeGreaterThanOrEqual(4);
    }
    const v = interior27('venue', 1962, 3);
    expect(v.props.some((p) => p.t === 'stage')).toBe(true);
    expect(v.props.some((p) => p.t === 'crowd')).toBe(true);
    expect(interior27('records', 1995, 2).props.some((p) => p.t === 'bins' && p.media === 'cds')).toBe(true);
    expect(interior27('records', 1910, 2).props.some((p) => p.t === 'bins' && p.media === 'sheets')).toBe(true);
    expect(interior27('radio', 1962, 2).props.some((p) => p.t === 'booth')).toBe(true);
    expect(interior27('studio', 1962, 2).props.some((p) => p.t === 'console')).toBe(true);
    expect(interior27('press', 1930, 2).props.some((p) => p.t === 'typewriters')).toBe(true);
    expect(interior27('press', 2010, 2).props.some((p) => p.t === 'screens')).toBe(true);
  });
  it('determinístico', () => {
    expect(JSON.stringify(interior27('bar', 1985, 5))).toBe(JSON.stringify(interior27('bar', 1985, 5)));
  });
  it('todo tipo básico tem interior', () => {
    for (const k of MUSIC27) expect(INTERIOR_KINDS27).toContain(k);
  });
});
