// Rodada 19 (WP-F): casas de show, estúdios nomeados e equipamento reais (src/data/more19/wp_f*.ts).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { STUDIOS } from '../src/data/catalog';
import { genreById, cityById, FAMILIES } from '../src/data/world';
import { DIMS18 } from '../src/sim/sys/quality18';
import { GEAR19, STUDIOS19, VENUES19 } from '../src/data/more19';
import { GEAR_META19, STUDIO_KIT19, gearAvailable19 } from '../src/data/more19/wp_f';
import { marketVenues, VENUES17, vdef, buyVenue17 } from '../src/sim/sys/venues17';

const fams = new Set(FAMILIES.map((f) => f.id));
const ROOMS = new Set(['live', 'booth', 'control', 'wood']);
const game = (y: number) => createGame(defaultConfig('wpf19', { startYear: y }));

describe('r19 WP-F: lugares e equipamento', () => {
  it('contagens mínimas por categoria', () => {
    expect(VENUES19.length).toBeGreaterThanOrEqual(60);
    expect(STUDIOS19.length).toBeGreaterThanOrEqual(50);
    expect(GEAR19.length).toBeGreaterThanOrEqual(130);
  });

  it('casas: ids de cidade/família, lotação e preço coerentes; estádios e salões icônicos não são comprados', () => {
    const bad: string[] = [];
    for (const v of VENUES19) {
      if (!cityById[v.city]) bad.push(`${v.id}: cidade`);
      if (!fams.has(v.fam as never)) bad.push(`${v.id}: família`);
      if (v.cap <= 0 || v.prestige < 0 || v.prestige > 100) bad.push(`${v.id}: números`);
      if (v.buyable === false ? v.price !== 0 || !v.note : v.price <= 0) bad.push(`${v.id}: preço/buyable`);
    }
    expect(bad).toEqual([]);
    for (const id of ['albert_hall', 'tropicana_havana', 'carnegie_hall', 'sydney_opera_house', 'stade_20_mai']) expect(vdef(id)!.buyable).toBe(false);
    for (const id of ['star_club', 'indra', 'kaiserkeller', 'ronnie_scotts']) expect(vdef(id)!.buyable).not.toBe(false);
    expect(vdef('star_club')).toMatchObject({ city: 'hamburg', from: 1962 });
    expect(vdef('tropicana_havana')).toMatchObject({ city: 'havana', from: 1939 });
  });

  it('casa só aparece no seu ano e em jogo de 1961 o Star-Club ainda não existe', () => {
    const s61 = game(1961), s63 = game(1963);
    expect(marketVenues(s61).some((v) => v.id === 'star_club')).toBe(false);
    expect(marketVenues(s61).some((v) => v.id === 'indra')).toBe(true);
    expect(marketVenues(s63).some((v) => v.id === 'star_club')).toBe(true);
    expect(marketVenues(s63).some((v) => v.id === 'fabric')).toBe(false);
    expect(String(buyVenue17(s63, 'albert_hall') ? 'blocked' : 'ok')).toBe('blocked');
    expect(VENUES17.filter((v) => v.id === 'albert_hall').length).toBe(1);
  });

  it('estúdios: chegam a catalog.STUDIOS, com salas, gear padrão e dimensões do quality18', () => {
    const bad: string[] = [];
    for (const st of STUDIOS19) {
      const k = STUDIO_KIT19[st.id];
      if (!cityById[st.city]) bad.push(`${st.id}: cidade`);
      if (!st.specialty.length || !st.specialty.every((f) => fams.has(f as never))) bad.push(`${st.id}: especialidade`);
      if (!k || !k.rooms.length || !k.rooms.every((r) => ROOMS.has(r))) bad.push(`${st.id}: salas`);
      if (k && !k.dims.length) bad.push(`${st.id}: dims`);
      if (k && !k.dims.every((d) => (DIMS18 as readonly string[]).includes(d))) bad.push(`${st.id}: dim inválida`);
      for (const g of k?.gear ?? []) if (!GEAR19.some((x) => x.id === g)) bad.push(`${st.id}: gear ${g}`);
      if (k && k.gear.length < 2) bad.push(`${st.id}: gear padrão`);
      if (!STUDIOS.some((x) => x.name === st.name)) bad.push(`${st.id}: não entrou em STUDIOS`);
    }
    expect(bad).toEqual([]);
    const names = STUDIOS19.map((s) => s.name);
    for (const n of ['FAME Studios', 'Muscle Shoals Sound Studio', 'RCA Studio B', 'Capitol Studios', 'Electric Lady Studios', 'Abbey Road Studios', 'Olympic Studios', 'Trident Studios', 'Sigma Sound Studios', 'Criteria Studios', 'Hansa Tonstudio', 'Studio One', 'Tuff Gong Studios', 'Avatar Studios', 'Compass Point Studios', 'AIR Studios Montserrat']) expect(names, n).toContain(n);
    expect(names.some((n) => n.startsWith('Record Plant'))).toBe(true);
  });

  it('gear: ids únicos, famílias, gêneros e dimensões válidos; nada antes do lançamento', () => {
    const bad: string[] = [];
    for (const g of GEAR19) {
      const m = GEAR_META19[g.id];
      if (!m) { bad.push(`${g.id}: sem meta`); continue; }
      if (!m.genres.length || !m.genres.every((id) => genreById[id])) bad.push(`${g.id}: gênero ${m.genres.filter((id) => !genreById[id])}`);
      if (!m.dims.length || !m.dims.every((d) => (DIMS18 as readonly string[]).includes(d))) bad.push(`${g.id}: dims`);
      if (!g.fam.length || !g.fam.every((f) => fams.has(f))) bad.push(`${g.id}: fam`);
      if (!g.fx || g.fx.some((n) => n < -3 || n > 3)) bad.push(`${g.id}: fx`);
      if (g.to && g.to < g.from) bad.push(`${g.id}: datas`);
    }
    expect(bad).toEqual([]);
    expect(new Set(GEAR19.map((g) => g.id)).size).toBe(GEAR19.length);
    const kinds = new Set(GEAR19.map((g) => g.kind));
    for (const k of ['guitar', 'bass', 'keys', 'amp', 'synth', 'drum_machine', 'mic', 'console', 'tape', 'daw', 'sampler', 'effect', 'other']) expect(kinds.has(k as never), k).toBe(true);
    const at = (y: number) => new Set(gearAvailable19(GEAR19, y).map((g) => g.id));
    expect(at(1949).has('fender_telecaster')).toBe(false);
    expect(at(1950).has('fender_telecaster')).toBe(true);
    expect(at(1979).has('roland_tr808')).toBe(false);
    expect(at(1980).has('roland_tr808')).toBe(true);
    expect(at(1990).has('pro_tools')).toBe(false);
    expect(at(1997).has('antares_auto_tune')).toBe(true);
    for (let y = 1900; y <= 2026; y += 7) for (const g of gearAvailable19(GEAR19, y)) expect(g.from <= y).toBe(true);
  });
});
