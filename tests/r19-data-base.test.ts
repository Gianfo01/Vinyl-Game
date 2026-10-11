// Rodada 19 (Frente 10, WP0) — validador da base de dados real. Os pacotes da onda 2 (src/data/more19/wp_*.ts)
// dependem deste teste: toda pessoa, cidade, gênero, casa, festival etc. precisa ter ids que existem, país com ficha
// (CountryInfo), datas coerentes e nome (normalizado) sem duplicata. Rode: npx vitest run tests/r19-data-base.test.ts

import { describe, expect, it } from 'vitest';
import { FESTIVALS, STUDIOS } from '../src/data/catalog';
import { AWARDS, CHARTS } from '../src/data/content';
import { COUNTRY_INFO, countryInfoByA3 } from '../src/data/countries';
import { countryName, countryOfCity, marketOfCountry } from '../src/data/geo';
import { EXTRA_LABELS, REAL_EXECS } from '../src/data/labels10';
import { REAL_MGRS } from '../src/data/managers14';
import { REAL_PRODS } from '../src/data/producers15';
import { SOCS18 } from '../src/data/rights18';
import { subOfA3_18, subById18 } from '../src/data/regions18';
import { CITIES, FAMILIES, GENRES, MARKETS, cityById, genreById } from '../src/data/world';
import { C19, G19 } from '../src/data/world19';
import { ARTISTS19, FESTS19, FORERUNNERS19, GEAR19, MILESTONES19, PACKS19, PRODS19, STUDIOS19, VENUES19, norm19 } from '../src/data/more19';
import { REAL_ALL } from '../src/sim/sys/realworld';
import { VENUES17 } from '../src/sim/sys/venues17';
import { MILESTONES } from '../src/sim/sys/world4/milestones';
import { CATALOG_LABELS } from '../src/data/catalog';

/** Ano real de hoje: nada de estreia/fundação depois disso nos dados reais. */
const NOW = 2026;
/** Estreia até FORE anos antes do "nascimento" oficial do gênero é aceita (pioneiros); antes disso só com precursor declarado. */
const FORE = 6;
const fams = new Set(FAMILIES.map((f) => f.id));
const mks = new Set(MARKETS.map((m) => m.id));
const hasCountry = (cityId: string) => { const a3 = countryOfCity(cityId); return !!a3 && !!countryInfoByA3[a3]; };
/** Lista de problemas (um teste por coleção mostra todos de uma vez). */
const bag = () => { const out: string[] = []; return { out, chk: (ok: unknown, msg: string) => { if (!ok) out.push(msg); } }; };
const dupes = (names: string[]) => { const seen = new Set<string>(), d: string[] = []; for (const n of names) { const k = norm19(n); if (seen.has(k)) d.push(n); seen.add(k); } return d; };

describe('r19 base de dados: cidades, gêneros e países (WP0)', () => {
  it('~80 cidades novas com mercado, idioma, cenas, coordenadas e país com ficha', () => {
    expect(C19.length).toBeGreaterThanOrEqual(80);
    const { out, chk } = bag();
    for (const c of CITIES) {
      chk(mks.has(c.market), `${c.id}: mercado`);
      chk(c.scenes.length && c.scenes.every((g) => genreById[g]), `${c.id}: cena inexistente`);
      chk(c.lat !== 0 || c.lon !== 0, `${c.id}: coordenadas`);
      chk(hasCountry(c.id), `${c.id}: país ${countryOfCity(c.id)} sem CountryInfo`);
      chk(subOfA3_18(countryOfCity(c.id)), `${c.id}: país ${countryOfCity(c.id)} sem submercado (regions18)`);
    }
    for (const [id, , , mk, , , , , a3] of C19) {
      chk(cityById[id]?.a3 === a3 && countryOfCity(id) === a3, `${id}: countryOfCity`);
      chk(countryName(a3).en !== a3, `${id}: ${a3} sem nome`);
      chk(countryInfoByA3[a3].market === mk || marketOfCountry(a3) === mk, `${id}: mercado ${mk} ≠ país ${a3}`);
    }
    expect(out).toEqual([]);
    expect(new Set(CITIES.map((c) => c.id)).size).toBe(CITIES.length);
    expect(dupes(CITIES.map((c) => c.name.en))).toEqual([]);
  });

  it('~50 gêneros novos: família, ano, pais, afinidade em regions18 e cidade-cena; nada do futuro', () => {
    expect(G19.length).toBeGreaterThanOrEqual(50);
    const { out, chk } = bag();
    for (const [id, , , fam, born, parents, cities, aff] of G19) {
      const g = genreById[id];
      chk(g && g.family === fam && g.born === born && fams.has(fam), `${id}: definição`);
      for (const p of parents) chk(genreById[p] && genreById[p].born <= born + 5, `${id} <- ${p}`);
      chk(cities.length && cities.every((c) => cityById[c]?.scenes.includes(id)), `${id}: cidade-cena`);
      chk(Object.keys(aff).length && Object.keys(aff).every((sub) => subById18[sub]?.taste.every((era) => era[1][id] !== undefined)), `${id}: afinidade`);
    }
    expect(out).toEqual([]);
    expect(new Set(GENRES.map((g) => g.id)).size).toBe(GENRES.length);
    // gating: num jogo de 1960 nenhum gênero novo de depois de 1960 aparece nas cenas vivas
    const alive1960 = (c: { scenes: string[] }) => c.scenes.filter((g) => genreById[g].born <= 1960);
    expect(alive1960(cityById.kingston)).not.toContain('rocksteady');
    expect(alive1960(cityById.lagos)).not.toContain('afro_fusion');
  });

  it('fichas de país: todo país com artista ou cidade tem CountryInfo completa', () => {
    const { out, chk } = bag();
    const a3s = new Set(COUNTRY_INFO.map((c) => c.a3));
    expect(a3s.size).toBe(COUNTRY_INFO.length);
    expect(COUNTRY_INFO.length).toBeGreaterThanOrEqual(68);
    for (const c of COUNTRY_INFO) {
      chk(mks.has(c.market), `${c.a3}: mercado`);
      chk(c.pop.length >= 5 && c.pop.every((p, i) => p[1] > 0 && (i === 0 || p[0] > c.pop[i - 1][0])), `${c.a3}: população`);
      chk(c.buy.length >= 5 && c.buy.every((p) => p[1] > 0 && p[1] <= 1.5), `${c.a3}: poder de compra`);
      chk(c.taste.length && c.taste.every(([, t]) => Object.keys(t).every((f) => fams.has(f as never))), `${c.a3}: gosto`);
      chk(c.lang.length && c.chart[0] && c.chart[1], `${c.a3}: idioma/parada`);
      chk(!c.award || (c.award[0] && c.award[1] && c.award[2] >= 1889 && c.award[2] <= NOW), `${c.a3}: prêmio`);
    }
    for (const a of REAL_ALL) chk(countryInfoByA3[a.cn], `${a.n}: país ${a.cn} sem ficha`);
    expect([...new Set(out)]).toEqual([]);
  });
});

describe('r19 base de dados: pessoas, selos, lugares e eventos (validador da onda 2)', () => {
  it('artistas reais: ids, país, datas e gênero existente na estreia (ou precursor)', () => {
    const { out, chk } = bag();
    for (const a of REAL_ALL) {
      const g = genreById[a.g];
      chk(g, `${a.n}: gênero ${a.g}`);
      chk(cityById[a.c], `${a.n}: cidade ${a.c}`);
      chk(countryInfoByA3[a.cn], `${a.n}: país ${a.cn}`);
      chk(a.d >= 1880 && a.d <= NOW, `${a.n}: estreia ${a.d}`);
      chk(!a.e || a.e >= a.d, `${a.n}: fim ${a.e} < estreia ${a.d}`);
      chk(!a.b || a.b < a.d, `${a.n}: nasceu depois da estreia`);
      chk(!a.x || !a.b || a.x > a.b, `${a.n}: morte antes do nascimento`);
      chk(!a.x || a.x >= a.d - 1, `${a.n}: estreia depois da morte`);
      for (const [y0, y1] of a.rj ?? []) chk(y0 >= a.d && (!y1 || y1 >= y0), `${a.n}: volta ${y0}-${y1}`);
      for (const m of a.m ?? []) chk((!m[2] || !m[3] || m[3] > m[2]) && (!m[4] || !m[5] || m[5] >= m[4]), `${a.n}: integrante ${m[0]}`);
      if (g) chk(g.born <= a.d + FORE || FORERUNNERS19.has(norm19(a.n)), `${a.n}: estreia ${a.d} antes do gênero ${a.g} (${g.born})`);
    }
    expect(out).toEqual([]);
    expect(dupes(REAL_ALL.map((a) => a.n))).toEqual([]);
  });

  it('produtores, empresários, executivos e selos: cidade com país, datas coerentes, sem duplicata', () => {
    const { out, chk } = bag();
    for (const [kind, list] of [['prod', REAL_PRODS], ['mgr', REAL_MGRS]] as const) {
      for (const p of list) {
        chk(cityById[p.city] && hasCountry(p.city), `${kind} ${p.name}: cidade ${p.city}`);
        chk(p.from <= p.to && p.from <= NOW, `${kind} ${p.name}: ${p.from}-${p.to}`);
        chk(!p.born || p.born < p.from, `${kind} ${p.name}: nasceu ${p.born} depois de começar ${p.from}`);
        chk(!p.died || !p.born || p.died > p.born, `${kind} ${p.name}: morte`);
        chk(p.fam.every((f) => fams.has(f)), `${kind} ${p.name}: família`);
      }
      chk(new Set(list.map((p) => p.id)).size === list.length, `${kind}: id duplicado`);
      for (const d of dupes(list.map((p) => p.name))) out.push(`${kind}: nome duplicado ${d}`);
    }
    const labelIds = new Set([...CATALOG_LABELS, ...EXTRA_LABELS].map((x) => x.id));
    for (const x of EXTRA_LABELS) {
      chk(cityById[x.city] && hasCountry(x.city), `selo ${x.name}: cidade ${x.city}`);
      chk(x.founded >= 1880 && x.founded <= NOW, `selo ${x.name}: fundação`);
    }
    chk(labelIds.size === CATALOG_LABELS.length + EXTRA_LABELS.length, 'selo: id duplicado');
    for (const e of REAL_EXECS) {
      chk(labelIds.has(e.label), `exec ${e.name}: selo ${e.label}`);
      chk(e.born < e.y && (!e.died || e.died > e.born), `exec ${e.name}: datas`);
    }
    // a mesma pessoa pode ter duas passagens (mesmo rid, selos diferentes); nomes iguais com rid diferente, não
    const rid = new Map<string, string>();
    for (const e of REAL_EXECS) { const k = norm19(e.name); chk(!rid.has(k) || rid.get(k) === e.rid, `exec: nome duplicado ${e.name}`); rid.set(k, e.rid); }
    expect(out).toEqual([]);
  });

  it('casas, estúdios, festivais, prêmios, paradas, sociedades, marcos e equipamento', () => {
    const { out, chk } = bag();
    for (const v of VENUES17) {
      chk(cityById[v.city] && hasCountry(v.city), `casa ${v.name}: cidade ${v.city}`);
      chk(!v.to || v.to >= v.from, `casa ${v.name}: datas`);
      chk(fams.has(v.fam as never), `casa ${v.name}: família ${v.fam}`);
    }
    chk(new Set(VENUES17.map((v) => v.id)).size === VENUES17.length, 'casa: id duplicado');
    for (const d of dupes(VENUES17.map((v) => v.name + '@' + v.city))) out.push(`casa duplicada ${d}`);
    for (const st of STUDIOS) {
      chk(cityById[st.city] && hasCountry(st.city), `estúdio ${st.name}: cidade`);
      chk(!st.to || !st.from || st.to >= st.from, `estúdio ${st.name}: datas`);
    }
    for (const d of dupes(STUDIOS.map((x) => x.name))) out.push(`estúdio duplicado ${d}`);
    for (const f of FESTIVALS) {
      chk(cityById[f.city] && hasCountry(f.city), `festival ${f.name}: cidade ${f.city}`);
      chk(f.start >= 1880 && (!f.realRef || f.start <= NOW) && (!f.end || f.end >= f.start), `festival ${f.name}: datas`); // fictícios do futuro (2030+) valem
      chk((f.genres ?? []).every((g) => genreById[g]), `festival ${f.name}: gênero`);
    }
    for (const d of dupes(FESTIVALS.map((x) => x.name))) out.push(`festival duplicado ${d}`);
    for (const [kind, list] of [['prêmio', AWARDS], ['parada', CHARTS]] as const) {
      chk(new Set(list.map((x) => x.id)).size === list.length, `${kind}: id duplicado`);
      for (const x of list) chk(!x.end || x.end >= x.start, `${kind} ${x.id}: datas`);
    }
    chk(new Set(SOCS18.map((x) => x.id)).size === SOCS18.length, 'sociedade: id duplicado');
    for (const x of SOCS18) chk(!x.to || x.to >= x.from, `sociedade ${x.id}: datas`);
    chk(new Set(MILESTONES.map((x) => x.id)).size === MILESTONES.length, 'marco: id duplicado');
    for (const m of MILESTONES) chk((m.month === undefined || (m.month >= 0 && m.month <= 11)) && (!m.until || m.until >= m.year), `marco ${m.id}: datas`);
    for (const m of MILESTONES19) chk(!m.appeal && !m.onFire, `marco ${m.id}: pacote só com dados`);
    for (const x of GEAR19) chk(x.fam.every((f) => fams.has(f)) && (!x.to || x.to >= x.from), `gear ${x.id}`);
    chk(new Set(GEAR19.map((x) => x.id)).size === GEAR19.length, 'gear: id duplicado');
    expect(out).toEqual([]);
  });

  it('more19: 12 vagas ligadas; o que entra nos pacotes chega às tabelas do jogo', () => {
    expect(PACKS19.map((p) => p.id)).toEqual(['wp_a', 'wp_b', 'wp_c', 'wp_d1', 'wp_d2', 'wp_d3', 'wp_e', 'wp_f', 'wp_g', 'wp_h', 'wp_i', 'wp_j']);
    for (const a of ARTISTS19) expect(REAL_ALL.some((x) => norm19(x.n) === norm19(a.n)), a.n).toBe(true);
    for (const p of PRODS19) expect(REAL_PRODS.some((x) => x.id === p.id), p.id).toBe(true);
    for (const v of VENUES19) expect(VENUES17.some((x) => x.id === v.id), v.id).toBe(true);
    for (const st of STUDIOS19) expect(STUDIOS.some((x) => x.name === st.name), st.name).toBe(true);
    for (const f of FESTS19) expect(FESTIVALS.some((x) => x.name === f.name), f.name).toBe(true);
    for (const m of MILESTONES19) expect(MILESTONES.some((x) => x.id === m.id), m.id).toBe(true);
  });
});
