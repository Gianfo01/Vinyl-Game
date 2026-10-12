// Rodada 20 — G3 integridade da simulação: testes rápidos (sem simulação longa).
import { describe, expect, it, vi } from 'vitest';
import '../src/sim/sys';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { cityById, CITIES } from '../src/data/world';
import type { Act, GameState } from '../src/sim/types';
import { liveIncidents20, playLiveCard20, liveRoll20, resolveCard, INCIDENTS } from '../src/sim/sys/live/notes';
import { liveOf } from '../src/sim/sys/live/state';
import { effectiveKit18 } from '../src/sim/sys/live18';
import { TOUR18 } from '../src/sim/tourhook18';
import { pp18 } from '../src/sim/sys/fans18';
import { cal17, clashOf, weekOfDay } from '../src/sim/sys/clash17';
import { estimateTour } from '../src/sim/tours';
import { matchesReq20, scoutEligible20, spawnPlanForReq20 } from '../src/sim/scout20';
import { makeOffer } from '../src/sim/contracts';
import { spawnProceduralAct } from '../src/sim/worldgen';
import { exitMember20 } from '../src/sim/members20';
import { factionGroups20, hostileEdges20 } from '../src/sim/dynasty';
import { livePublic20 } from '../src/sim/livesnap20';
import { pushTargets20 } from '../src/sim/sys/rivals12';
import { genreAvailable20, genreRel20, lintGenreEdges20 } from '../src/sim/genretime20';
import { setSongTheme20, songX, themeSuggest20 } from '../src/sim/sys/creation/core';
import { unlimitedStock20 } from '../src/sim/stock20';
import { careerEndSoon20 } from '../src/sim/sys/life20';
import { Rng } from '../src/core/rng';

const game = (seed = 'r20g3'): GameState => createGame(defaultConfig(seed));
const someAct = (s: GameState, pred: (a: Act) => boolean = () => true): Act => Object.values(s.acts).filter((a) => a.members.length && pred(a)).sort((a, b) => (a.id < b.id ? -1 : 1))[0];
const own = (a: Act) => { a.owner = 'player'; a.status = 'active'; };

describe('r20 G3', () => {
  it('B7: show ao vivo determinístico por show/decisão, sem Math.random, com log', () => {
    const s = game();
    const a = someAct(s);
    const spy = vi.spyOn(Math, 'random');
    const i1 = liveIncidents20(s, 't1:100'), i2 = liveIncidents20(s, 't1:100');
    expect(i1.map((x) => x.id)).toEqual(i2.map((x) => x.id));
    expect(new Set(i1.map((x) => x.id)).size).toBe(3);
    expect(liveRoll20(s, 't1:100', 0)).toBe(liveRoll20(s, 't1:100', 0));
    const r1 = playLiveCard20(s, 't1:100', a.id, 0, i1[0], 0);
    const r2 = playLiveCard20(s, 't1:100', a.id, 0, i1[0], 0);
    expect(r1).toEqual(r2);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    expect(liveOf(s).liveLog20?.['t1:100']?.[0]).toMatchObject({ i: i1[0].id, c: 0, ok: r1.ok, d: r1.delta });
    // keys diferentes podem dar noites diferentes
    const many = new Set(Array.from({ length: 12 }, (_, k) => liveIncidents20(s, `t${k}:1`).map((x) => x.id).join()));
    expect(many.size).toBeGreaterThan(1);
  });

  it('B15: segurança do kit melhora só as cartas de segurança de público', () => {
    const s = game();
    const a = someAct(s);
    const fight = INCIDENTS.find((x) => x.id === 'fight')!;
    const secCard = fight.cards.find((c) => c.stat === 'security')!;
    const crewCard = INCIDENTS.find((x) => x.id === 'mic')!.cards.find((c) => c.stat === 'crew')!;
    const tour = { id: 'tz', actId: a.id, status: 'running', crew: 3, stops: [], kit18: { sec: 0 } } as unknown as GameState['tours'][number];
    s.tours.push(tour);
    const sec0 = resolveCard(s, a.id, secCard, 0).chance, crew0 = resolveCard(s, a.id, crewCard, 0).chance;
    (tour as unknown as { kit18: { sec: number } }).kit18.sec = 2;
    expect(resolveCard(s, a.id, secCard, 0).chance).toBeGreaterThan(sec0);
    expect(resolveCard(s, a.id, crewCard, 0).chance).toBe(crew0);
  });

  it('B13: kit efetivo (van com >9 pessoas vira ônibus; ≤9 mantém)', () => {
    const s = game();
    expect(effectiveKit18(s, { move: 'van' }, 12).move).toBe('bus');
    expect(effectiveKit18(s, { move: 'van' }, 6).move).toBe('van');
    const info = { people: 12, km: 1000, travel: 5000, shows: 4, days: 10, tiers: [1, 1, 1, 1], gross: 50000, fame: 30, members: 4 };
    const big = TOUR18.kit!(s, { ...effectiveKit18(s, {}, 1), move: 'van' }, info);
    expect(big.warn.length).toBeGreaterThan(0);
    expect(big.parts.some(([, v]) => v < 0 && v === Math.round(-0.3 * info.travel))).toBe(false);
  });

  it('B20: poder de compra do destino muda a curva da parada', () => {
    const s = game();
    const a = someAct(s);
    const rich = CITIES.find((c) => c.market === 'na')!.id;
    const other = CITIES.find((c) => c.market !== 'na' && Math.abs(pp18(s, a, c.id) - pp18(s, a, rich)) > 0.01);
    expect(other).toBeTruthy();
  });

  it('B16: previsão e acerto usam a mesma concorrência (semana do dia do show)', () => {
    const s = game();
    const a = someAct(s, (x) => x.fame >= 0);
    own(a);
    const rival = someAct(s, (x) => x.id !== a.id && x.status !== 'retired' && x.status !== 'split');
    rival.fame = 90;
    const plan = { actId: a.id, cities: [a.city], startInDays: 7, priceMult: 1, minutes: 60 as const, setlist: [], production: 0, role: 'headline' as const, crew: 2, pay: 'door' as const };
    const base = estimateTour(s, plan);
    const day = base.stops[0].day;
    cal17(s).npc.push({ a: rival.id, c: a.city, w: weekOfDay(day), cap: 5000 });
    const k = clashOf(s, a, a.city, weekOfDay(day)).mult;
    expect(k).toBeLessThan(1);
    expect(TOUR18.clash!(s, a, a.city, day)).toBeCloseTo(k, 6);
    const withRival = estimateTour(s, plan);
    expect(withRival.expectedRevenue).toBe(Math.round(base.expectedRevenue * k));
  });

  it('B9: elegibilidade central (status × dono) em card e proposta', () => {
    const s = game();
    const a = someAct(s, (x) => !x.owner && x.members.some((id) => s.persons[id]?.alive)); // r23: mundo mudou (pesos de gênero × cidade); precisa de integrante vivo
    for (const st of ['emerging', 'active', 'hiatus', 'retired', 'split'] as const) {
      a.status = st;
      const e = scoutEligible20(s, a);
      expect(e.ok).toBe(st !== 'retired' && st !== 'split');
      if (st === 'hiatus') expect(e.comeback).toBe(true);
    }
    a.status = 'retired';
    expect(makeOffer(s, { actId: a.id, model: 'classic', advance: 0, royalty: 0.15, termMonths: 24, releasesOwed: 1, creativeControl: false, publishing: false, share360: 0, promises: [] } as never)).toBeNull();
    a.status = 'active';
    a.owner = Object.keys(s.labels)[0];
    expect(scoutEligible20(s, a).ok).toBe(false);
  });

  it('B10: pedido de scout nunca viola formato; sem candidato possível = sem resultado', () => {
    const s = game();
    const r = new Rng([1, 2, 3, 4]);
    for (const role of ['band', 'solo']) {
      const req = { genreFamily: 'any', market: 'any', level: 'any', role };
      const plan = spawnPlanForReq20(s, r, req)!;
      const act = spawnProceduralAct(s, r, plan);
      expect(matchesReq20(act, req)).toBe(true);
    }
    expect(spawnPlanForReq20(s, r, { genreFamily: 'any', market: 'any', level: 'established', role: 'any' })).toBeNull();
  });

  it('B11: saída de integrante mantém líder vivo/integrante e limpa facções', () => {
    const s = game();
    const a = someAct(s, (x) => x.members.length >= 2);
    a.leaderId = a.members[0];
    s.factions[a.id] = { actId: a.id, groups: [[a.members[0]], a.members.slice(1)], leaderId: a.leaderId, tension: 10 };
    const gone = a.members[0];
    exitMember20(s, a, gone);
    expect(a.members).not.toContain(gone);
    expect(a.members).toContain(a.leaderId);
    expect(s.factions[a.id].groups.flat()).not.toContain(gone);
    for (const id of [...a.members]) exitMember20(s, a, id);
    expect(a.leaderId).toBeUndefined();
  });

  it('B12: facções independentes da ordem do elenco (estrela, triângulo, hostis)', () => {
    const s = game();
    const ids = Object.keys(s.persons).slice(0, 5);
    const rel = (x: string, y: string, v: number) => { s.persons[x].rel[y] = v; s.persons[y].rel[x] = v; };
    for (const x of ids) for (const y of ids) if (x !== y) s.persons[x].rel[y] = 0;
    rel(ids[0], ids[1], 50); rel(ids[1], ids[2], 50); // cadeia 0-1-2 (0 e 2 neutros entre si)
    rel(ids[3], ids[4], -50);
    const g1 = factionGroups20(s, ids), g2 = factionGroups20(s, [...ids].reverse());
    expect(g1).toEqual(g2);
    expect(g1.find((g) => g.includes(ids[0]))).toContain(ids[2]);
    expect(hostileEdges20(s, ids)).toEqual(hostileEdges20(s, [...ids].reverse()));
    expect(hostileEdges20(s, ids).length).toBe(1);
  });

  it('B14: Ato ao Vivo do ano soma só paradas do ano, inclusive de turnê em curso', () => {
    const s = game();
    const a = someAct(s);
    const y0 = s.config.startYear;
    s.tours.push({ id: 'tx', actId: a.id, status: 'running', stops: [
      { cityId: a.city, day: 360, sold: 1000, status: 'played' }, { cityId: a.city, day: 370, sold: 5000, status: 'played' }, { cityId: a.city, day: 380, sold: 0, status: 'scheduled' },
    ] } as unknown as GameState['tours'][number]);
    expect(livePublic20(s, y0)[a.id]).toBe(1000);
    expect(livePublic20(s, y0 + 1)[a.id]).toBe(5000);
  });

  it('B19: alvo da ofensiva rival independe da ordem do array de territórios', () => {
    const s = game();
    const lb = Object.values(s.labels)[0];
    s.player.territories = ['na', 'uk', 'br', 'jp'].filter((m) => !!m) as typeof s.player.territories;
    const t1 = pushTargets20(s, lb).map((x) => x.m);
    s.player.territories = [...s.player.territories].reverse();
    expect(pushTargets20(s, lb).map((x) => x.m)).toEqual(t1);
    expect(pushTargets20(s, lb)[0].why.pt.length).toBeGreaterThan(0);
  });

  it('B30/B31: predicado temporal comum e lint de arestas causais invertidas', () => {
    const s = game();
    expect(genreAvailable20(s, 'trap', 1980)).toBe(false);
    expect(genreAvailable20(s, 'trap', 2010)).toBe(true);
    expect(lintGenreEdges20()).toEqual([]);
    expect(genreRel20('art_rock', 'psychedelic')).not.toBe('influence');
    expect(genreRel20('delta_blues', 'classic_blues')).toBe('influence');
  });

  it('B32: sugestão de tema muda com a cidade e é editável', () => {
    const s = game();
    const a = someAct(s);
    own(a);
    const sug = (city: string) => { a.city = city; return themeSuggest20(s, a, 14).map((x) => x.id).join(); };
    const variants = new Set(CITIES.filter((c, i, arr) => arr.findIndex((z) => z.market === c.market) === i).map((c) => sug(c.id)));
    expect(variants.size).toBeGreaterThan(1);
    const so = Object.values(s.songs).find((x) => x.actId === a.id && !x.releaseId);
    if (so) { expect(setSongTheme20(s, so.id, 'protest')).toBeNull(); expect((songX(s, so.id) as { theme?: string }).theme).toBe('protest'); }
    expect(themeSuggest20(s, a)[0].why.pt).toContain(cityById[a.city].name.pt);
  });

  it('B25: sentinela Infinity sobrevive ao round-trip como o mesmo sentinela', () => {
    const rel = { stock: Infinity };
    const back = JSON.parse(JSON.stringify(rel)) as { stock: number };
    expect(back.stock).toBeNull();
    expect(unlimitedStock20(rel)).toBe(true);
    expect(unlimitedStock20(back)).toBe(true);
    expect(unlimitedStock20({ stock: 0 })).toBe(false);
  });

  it('B28: fim de carreira do ato do jogador aparece um ano antes', () => {
    const s = game();
    const a = someAct(s);
    own(a);
    a.careerEnd = s.year + 1;
    expect(careerEndSoon20(s).some((x) => x.actId === a.id)).toBe(true);
    a.careerEnd = s.year + 5;
    expect(careerEndSoon20(s).some((x) => x.actId === a.id)).toBe(false);
  });
});
