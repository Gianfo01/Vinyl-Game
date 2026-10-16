// R31 · onda 3 (Y · Paradas por país): fama local vende (e nunca diminui a demanda do próprio artista), língua, leis
// e cotas só no país da lei (uma vez cada), efeito dominó, fama menos uniforme, picos dos artistas do mundo, mercado
// reservado (último recurso) — cada parte com interruptor.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { COUNTRY_INFO } from '../src/data/countries';
import { countryOfCity } from '../src/data/geo';
import { Y31 } from '../src/sim/r31/market31';
import { setSw } from '../src/sim/r31/switches';
import { ch7 } from '../src/sim/sys/charts7';
import { f16, fameIn, nudge16 } from '../src/sim/sys/fame16';
import { QUOTAS31, actPeaks31, langEra31, reserveShare31, y31 } from '../src/sim/sys/mercado31';
import { lawAppeal19 } from '../src/sim/sys/regions19';
import { advanceMonth } from '../src/sim/tick';
import type { Act, GameState, Release } from '../src/sim/types';

const NC = COUNTRY_INFO.length;
const IX = (a3: string) => COUNTRY_INFO.findIndex((c) => c.a3 === a3);
// a demanda por país é dividida pela média da semana (s.stats.lastKn31); aqui a média fica neutra para ler o fator cru
const game = (seed: string, y: number): GameState => { const s = createGame(defaultConfig(seed, { startYear: y, scenario: 'established' })); s.stats.lastKn31 = 1; return s; };
const actFrom = (s: GameState, a3: string, minFame = 0): Act | undefined =>
  Object.values(s.acts).filter((a) => countryOfCity(a.city) === a3 && a.fame >= minFame).sort((x, y) => y.fame - x.fame || (x.id < y.id ? -1 : 1))[0];
const rel = (s: GameState, a: Act, id = 'tsty'): Release => ({
  id, actId: a.id, owner: 'indie', prov: 'sim', type: 'single', title: 'x', songs: [], week: s.week, year: s.year, q: 70, appeal: 1,
  formats: [], stock: 0, pressed: 0, marketing: [], marketingE: 0.2, territories: ['na', 'eu', 'br', 'latam', 'asia', 'africa', 'oceania'],
  weekly: [], totalUnits: 0, revenue: 0, peak: 999, weeksOnChart: 0, lastPos: 0, coverSeed: 1, shortage: 0, live: true,
});
const weights = (s: GameState, r: Release, a: Act): number[] => { const w = new Array(NC).fill(1); Y31.weights!(s, r, a, w); return w; };

describe('R31 Y · fama local vende', () => {
  it('mais fama local, com o resto igual, nunca diminui a demanda nem a fatia do país', () => {
    const s = game('r31y-a', 1985);
    setSw(s, 'y31.laws', false); // só a fama aqui (a CanCon mexe na demanda de quem é dos EUA)
    const a = actFrom(s, 'USA', 30)!;
    const r = rel(s, a);
    for (const a3 of ['JPN', 'BRA', 'GBR', 'USA']) {
      const k0 = Y31.demand!(s, r, a), w0 = weights(s, r, a), sh0 = w0[IX(a3)] / w0.reduce((t, x) => t + x, 0);
      nudge16(s, a.id, a3, 15);
      const k1 = Y31.demand!(s, r, a), w1 = weights(s, r, a), sh1 = w1[IX(a3)] / w1.reduce((t, x) => t + x, 0);
      expect(k1).toBeGreaterThanOrEqual(k0);
      expect(sh1).toBeGreaterThanOrEqual(sh0);
      expect(k1 * sh1).toBeGreaterThan(k0 * sh0); // unidades no país = demanda × fatia
    }
    delete f16(s).d[a.id];
    expect(Y31.demand!(s, r, a)).toBeCloseTo(1, 6); // sem desvio local: demanda total como antes
  });

  it('a demanda por país redistribui: a média da semana (pelo apelo) fica em 1', () => {
    const s = game('r31y-n', 1985);
    advanceMonth(s);
    const live = Object.values(s.releases).filter((r) => r.live && s.acts[r.actId] && r.appeal > 0);
    let num = 0, den = 0;
    // o fator do mês fica gravado no lançamento (r.y31k) pelo mercado; a média dele, dividida pela da semana, é 1
    for (const r of live) { num += r.appeal * (r.y31k?.[1] ?? 1) / (s.stats.lastKn31 ?? 1); den += r.appeal; }
    expect(live.filter((r) => r.y31k).length).toBeGreaterThan(live.length * 0.9);
    expect(num / den).toBeGreaterThan(0.97);
    expect(num / den).toBeLessThan(1.03);
  });

  it('desligado, nada muda na repartição nem na demanda', () => {
    const s = game('r31y-b', 1985);
    for (const id of ['y31.local', 'y31.lang', 'y31.laws', 'y31.domino']) setSw(s, id, false);
    const a = actFrom(s, 'BRA', 10)!;
    nudge16(s, a.id, 'PRT', 20);
    expect(Y31.demand!(s, rel(s, a), a)).toBe(1);
    expect(weights(s, rel(s, a), a).every((x) => x === 1)).toBe(true);
  });
});

describe('R31 Y · língua, leis e dominó', () => {
  it('mesma língua vende mais, língua estrangeira menos; o peso cai com o streaming', () => {
    const s = game('r31y-c', 1985);
    setSw(s, 'y31.local', false); setSw(s, 'y31.laws', false); setSw(s, 'y31.domino', false);
    const a = actFrom(s, 'BRA', 5)!;
    const w = weights(s, rel(s, a), a);
    expect(w[IX('PRT')]).toBeGreaterThan(1);
    expect(w[IX('JPN')]).toBeLessThan(1);
    expect(w[IX('JPN')]).toBeLessThan(w[IX('NLD')]); // o Japão prefere mais o local que a Holanda
    const late = game('r31y-c2', 2024);
    expect(langEra31(late)).toBeLessThan(langEra31(s));
  });

  it('cotas valem só no país da lei, uma vez cada (CanCon: regions18 e regions19 não somam no apelo global)', () => {
    const s = game('r31y-d', 1985);
    setSw(s, 'y31.local', false); setSw(s, 'y31.lang', false); setSw(s, 'y31.domino', false);
    const us = actFrom(s, 'USA', 10)!;
    const w = weights(s, rel(s, us), us);
    expect(w[IX('CAN')]).toBeLessThan(1);
    for (let i = 0; i < NC; i++) if (!['CAN', 'AUS', 'IND', 'KOR', 'FRA', 'ARG', 'IDN', 'GBR'].includes(COUNTRY_INFO[i].a3)) expect(w[i]).toBe(1);
    expect(w[IX('USA')]).toBe(1);
    const ca = actFrom(s, 'CAN', 1);
    if (ca) expect(weights(s, rel(s, ca), ca)[IX('CAN')]).toBeGreaterThan(1);
    expect(lawAppeal19(s, rel(s, us), us)).toEqual([]);
    expect(new Set(QUOTAS31.map((q) => q.id)).size).toBe(QUOTAS31.length);
  });

  it('nº 1 num país puxa vizinhos e mesma língua', () => {
    const s = game('r31y-e', 1985);
    setSw(s, 'y31.local', false); setSw(s, 'y31.lang', false); setSw(s, 'y31.laws', false);
    const a = actFrom(s, 'GBR', 10)!;
    const r = rel(s, a, 'tst-dom');
    expect(Y31.demand!(s, r, a)).toBe(1);
    (ch7(s).no1.GBR ??= []).push({ week: s.week, relId: r.id, title: 'x', act: a.name });
    const w = weights(s, r, a);
    expect(w[IX('IRL')]).toBeGreaterThan(1); // vizinho e mesma língua
    expect(w[IX('AUS')]).toBeGreaterThan(1); // mesma língua
    expect(w[IX('GBR')]).toBe(1);
    expect(Y31.demand!(s, r, a)).toBeGreaterThan(1);
  });
});

describe('R31 Y · fama menos uniforme, picos e mercado reservado', () => {
  it('estrela fora do seu mercado e língua tem teto mais baixo', () => {
    const s = game('r31y-f', 1985);
    const a = actFrom(s, 'USA', 70)!;
    const on = fameIn(s, a, 'JPN');
    setSw(s, 'y31.fame', false);
    const off = fameIn(s, a, 'JPN');
    expect(on).toBeLessThan(off);
    expect(on).toBeLessThanOrEqual(a.fame * 0.6 + 0.5);
  });

  it('artistas do mundo guardam picos de parada por país; a parada nacional soma à fama', () => {
    const s = game('r31y-g', 1985);
    advanceMonth(s);
    const pk = y31(s).pk;
    const npc = Object.keys(pk).filter((id) => s.acts[id] && s.acts[id].owner !== 'player' && !s.acts[id].playerBand);
    expect(npc.length).toBeGreaterThan(5);
    const p = actPeaks31(s, npc[0]);
    expect(p[0].pos).toBeGreaterThanOrEqual(1);
    expect(p[0].pos).toBeLessThanOrEqual(10);
  });

  it('mercado reservado leva a fatia local ao mínimo do país sem mudar o total da parada', () => {
    const s = game('r31y-h', 1985);
    const jp = actFrom(s, 'JPN', 0)!, us = actFrom(s, 'USA', 0)!;
    const rels = [rel(s, jp, 'r-jp'), rel(s, us, 'r-us')];
    const U = new Float64Array(2 * NC);
    const i = IX('JPN');
    U[i] = 200; U[NC + i] = 800;
    Y31.reserve!(s, rels, U, NC);
    expect(U[i] + U[NC + i]).toBeCloseTo(1000, 6);
    expect(U[i] / 1000).toBeCloseTo(reserveShare31('JPN'), 6);
    expect(reserveShare31('JPN')).toBeGreaterThan(reserveShare31('NLD'));
    setSw(s, 'y31.reserve', false);
    U[i] = 200; U[NC + i] = 800;
    Y31.reserve!(s, rels, U, NC);
    expect(U[i]).toBe(200);
  });
});
