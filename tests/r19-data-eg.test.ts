// Rodada 19 (Frente 10, WP-E + WP-G) — pessoas, selos, festivais, prêmios, paradas, sociedades e leis chegam ao jogo.
import { describe, expect, it } from 'vitest';
import { FESTIVALS } from '../src/data/catalog';
import { AWARDS, CHARTS } from '../src/data/content';
import { EXTRA_LABELS, REAL_EXECS } from '../src/data/labels10';
import { REAL_MGRS } from '../src/data/managers14';
import { REAL_PRODS } from '../src/data/producers15';
import { SOCS18 } from '../src/data/rights18';
import { PACKS19 } from '../src/data/more19';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { activeProds, prodName } from '../src/sim/sys/producers15';
import { activeMgrs, mgrName } from '../src/sim/sys/managers14';
import { MILESTONES, milestoneDue } from '../src/sim/sys/world4/milestones';

const pk = (id: string) => PACKS19.find((p) => p.id === id)!;
const E = pk('wp_e'), G = pk('wp_g');
const game = (year: number) => createGame(defaultConfig('r19eg', { startYear: year, realNames: true, dbSize: 'huge' }));

describe('r19 WP-E: pessoas e selos', () => {
  it('volumes e chegada às tabelas do jogo', () => {
    expect(E.producers!.length).toBeGreaterThanOrEqual(85);
    expect(E.managers!.length).toBeGreaterThanOrEqual(55);
    expect(E.execs!.length).toBeGreaterThanOrEqual(24);
    expect(E.labels!.length).toBeGreaterThanOrEqual(110);
    for (const p of E.producers!) expect(REAL_PRODS.some((x) => x.id === p.id), p.id).toBe(true);
    for (const m of E.managers!) expect(REAL_MGRS.some((x) => x.id === m.id), m.id).toBe(true);
    for (const x of E.labels!) expect(EXTRA_LABELS.some((y) => y.id === x.id), x.id).toBe(true);
    for (const x of E.execs!) expect(REAL_EXECS.some((y) => y.rid === x.rid && y.label === x.label), x.rid).toBe(true);
  });
  it('maioria fora de EUA/UK/Brasil: Jamaica, Ásia, África, Oceania, Canadá e Europa continental', () => {
    const cities = new Set(E.producers!.map((p) => p.city));
    for (const c of ['kingston', 'tokyo', 'mumbai', 'accra', 'sydney', 'toronto', 'paris', 'stockholm', 'seoul', 'beirut']) expect(cities.has(c), c).toBe(true);
  });
  it('produtor, empresário e selo aparecem no ano certo, e só nele', () => {
    const s75 = game(1975), s30 = game(1930);
    expect(activeProds(s75).map((p) => p.id)).toEqual(expect.arrayContaining(['reid', 'sdburman', 'hadjidakis', 'dudgeon']));
    expect(activeProds(s75).map((p) => p.id)).not.toContain('stargate');
    expect(activeProds(s30).map((p) => p.id)).not.toContain('reid');
    const dib = REAL_PRODS.find((p) => p.id === 'dibango')!;
    expect(prodName(s75, dib)).toBe('Manu Dibango');
    expect(activeMgrs(s75).map((m) => m.id)).toEqual(expect.arrayContaining(['cohl', 'gudinski', 'goldsmith']));
    expect(activeMgrs(s30).map((m) => m.id)).not.toContain('gudinski');
    expect(activeMgrs(s30).map((m) => m.id)).toContain('hylton');
    expect(mgrName(s75, REAL_MGRS.find((m) => m.id === 'eavis')!)).toBe('Michael Eavis');
    // selos só existem depois da fundação
    const fania = EXTRA_LABELS.find((x) => x.id === 'x_fania')!;
    expect(fania.founded).toBe(1964);
    expect(Object.values(s30.labels).some((l) => l.name === fania.real && l.founded <= 1930)).toBe(false);
  });
  it('sem pessoa real morta em atividade e sem crime ligado a pessoa real', () => {
    for (const p of E.producers!) if (p.died) expect(p.to, p.id).toBeLessThanOrEqual(p.died + 1);
    for (const m of E.managers!) if (m.died) expect(m.to, m.id).toBeLessThanOrEqual(m.died + 1);
    const txt = JSON.stringify([E.managers, E.execs]).toLowerCase();
    for (const w of ['assassin', 'murder', 'assassinato', 'preso por', 'convicted']) expect(txt.includes(w), w).toBe(false);
  });
});

describe('r19 WP-G: festivais, prêmios, paradas, sociedades e leis', () => {
  it('volumes e chegada às tabelas', () => {
    expect(G.festivals!.length).toBeGreaterThanOrEqual(65);
    expect(G.awards!.length).toBeGreaterThanOrEqual(40);
    expect(G.charts!.length).toBeGreaterThanOrEqual(16);
    expect(G.societies!.length).toBeGreaterThanOrEqual(18);
    expect(G.milestones!.length).toBeGreaterThanOrEqual(19);
    for (const f of G.festivals!) expect(FESTIVALS.some((x) => x.name === f.name), f.name).toBe(true);
    for (const a of G.awards!) expect(AWARDS.some((x) => x.id === a.id), a.id).toBe(true);
    for (const c of G.charts!) expect(CHARTS.some((x) => x.id === c.id), c.id).toBe(true);
    for (const x of G.societies!) expect(SOCS18.some((y) => y.id === x.id), x.id).toBe(true);
    for (const m of G.milestones!) expect(MILESTONES.some((y) => y.id === m.id), m.id).toBe(true);
  });
  it('datas reais: WOMAD 1982, Sónar 1994, Mercury/Polar/Ivor, rebatismo do R&B em 1949, Toubon 1994', () => {
    const fest = (re: string) => FESTIVALS.find((f) => f.realRef?.startsWith(re))!;
    expect(fest('WOMAD').start).toBe(1982);
    expect(fest('WOMAD').month).toBe(6);
    expect(fest('Sónar').start).toBe(1994);
    expect(fest('Sónar').month).toBe(5);
    expect(fest('Reggae Sunsplash').start).toBe(1978);
    expect(fest('North Sea Jazz').start).toBe(1976);
    expect(fest('Zaire 74').end).toBe(1974);
    expect(fest('Kōhaku').start).toBe(1951);
    const aw = (re: string) => AWARDS.find((a) => a.realRef?.startsWith(re))!;
    expect(aw('Ivor Novello').start).toBe(1956);
    expect(aw('Polar Music').start).toBe(1992);
    expect(AWARDS.find((a) => a.id === 'latin_gramofone')!.start).toBe(2000);
    expect(AWARDS.find((a) => a.id === 'japao_disco')!.start).toBe(1959);
    expect(aw('Mnet').start).toBe(1999);
    const rb = CHARTS.find((c) => c.id === 'ws_rb49')!;
    expect(rb.start).toBe(1949);
    expect(rb.realRef).toContain('25/6/1949');
    const toubon = MILESTONES.find((m) => m.id === 'law_toubon')!;
    expect([toubon.year, toubon.month]).toEqual([1994, 7]);
    expect(MILESTONES.find((m) => m.id === 'law_free_radios_fr')).toMatchObject({ year: 1981, month: 10 });
    expect(MILESTONES.find((m) => m.id === 'law_cancon')).toMatchObject({ year: 1971, month: 0 });
  });
  it('leis: só dados (sem appeal/onFire) e disparam no calendário real', () => {
    for (const m of G.milestones!) { expect(m.appeal).toBeUndefined(); expect(m.onFire).toBeUndefined(); expect(m.id.startsWith('law_')).toBe(true); }
    const toubon = MILESTONES.find((m) => m.id === 'law_toubon')!;
    expect(milestoneDue(game(1993), toubon)).toBe(false);
    expect(milestoneDue(game(1995), toubon)).toBe(true);
  });
  it('sociedades e paradas têm época coerente por mercado', () => {
    for (const s of G.societies!) expect(['na', 'latam', 'eu', 'asia', 'africa', 'oceania', 'br']).toContain(s.mk);
    expect(SOCS18.find((s) => s.id === 'vaap')!.to).toBe(1993);
    expect(SOCS18.find((s) => s.id === 'rao')!.from).toBe(1993);
    expect(CHARTS.find((c) => c.id === 'kent_austral')!.end).toBe(1988);
  });
});
