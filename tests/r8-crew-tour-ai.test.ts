// Rodada 8 — especialistas com química, turnês roteadas com promotor e IA/consentimento/autoria.

import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { GENRES, familyOf } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { applyMods } from '../src/sim/ext4';
import { advanceMonth } from '../src/sim/tick';
import type { GameState, Release, RunConfig, Song } from '../src/sim/types';
import { rngOf } from '../src/sim/util';
import { createGame, genStaff, spawnProceduralAct } from '../src/sim/worldgen';
import { chemistry, crew, crewMonth, crewSongDelta, influence, matchPoach, profileOf } from '../src/sim/sys/crew8';
import { bookRoutedTour, negotiateTour, route, routeLegs, suggestRoute, type DealTerms } from '../src/sim/sys/route8';
import {
  acceptAiOffer, ai, aiAppealMult, aiMonth, applyCert, askConsent, certBlocker, checkBlocks, consentChance, lawLevel, lobby, makeOffer, scaleIncome, setUse,
} from '../src/sim/sys/consent8';

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
const rich = (s: GameState) => { s.player.cash += 500_000_000; s.player.initialCash += 500_000_000; };

function setup(seed: string, over: Partial<RunConfig> = {}, fame = 40) {
  const s = createGame(defaultConfig(seed, over));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity, fame });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  act.fans = { casual: 300000, active: 50000, core: 10000 };
  rich(s);
  return { s, r, act };
}

/** Contrata alguém de uma função com a especialização pedida. */
function hire(s: GameState, r: Rng, role: string, skill: number, spec: string, yearsAgo = 0) {
  const st = genStaff(s, r, role, skill);
  st.hiredWeek = s.week - Math.round(yearsAgo * 52);
  s.player.staff.push(st);
  crew(s).over[st.id] = spec as never;
  return st;
}

const song = (genre: string): Song => ({ id: 'x', actId: '', title: 't', genre, writers: [], melody: 60, lyrics: 60, performance: 60, production: 60, originality: 60, q: 60, recorded: true, createdWeek: 0 });

describe('especialistas: trade-offs e química', () => {
  it('produtor autoral brilha no gênero dele e briga com quem quer controle; o facilitador não', () => {
    const { s, r, act } = setup('r8-prod', { startYear: 1990 });
    const pr = hire(s, r, 'producer', 80, 'auteur');
    const fam = profileOf(s, pr).fam!;
    const inG = GENRES.find((g) => familyOf(g.id) === fam)!.id;
    const outG = GENRES.find((g) => familyOf(g.id) !== fam)!.id;
    for (const id of act.members) s.persons[id].traits = s.persons[id].traits.filter((x) => x !== 'big_ego');
    const c = s.contracts[act.contractId!];
    c.creativeControl = false;
    crew(s).infl = 60;
    const free = crewSongDelta(s, song(inG), act);
    const out = crewSongDelta(s, song(outG), act);
    c.creativeControl = true;
    const ctl = crewSongDelta(s, song(inG), act);
    expect(free.prod).toBeGreaterThan(6);
    expect(out.prod).toBeLessThan(0);
    expect(ctl.clash).toBe(true);
    expect(ctl.prod).toBeLessThan(free.prod);
    expect(ctl.perf).toBeLessThan(0);
    // habilidade amplia os dois lados: não é uma escada linear
    pr.skill = 40;
    const lowCtl = crewSongDelta(s, song(inG), act);
    expect(lowCtl.perf).toBeGreaterThan(ctl.perf);
    pr.skill = 80;
    // facilitador: sem atrito mesmo com controle criativo, mas ganho de produção pequeno
    crew(s).over[pr.id] = 'facilitator';
    const fac = crewSongDelta(s, song(inG), act);
    expect(fac.clash).toBe(false);
    expect(fac.perf).toBeGreaterThan(0);
    expect(fac.prod).toBeLessThan(free.prod);
    invariant(s);
  });

  it('engenheiro de assinatura troca originalidade por identidade; equipe de estrada cautelosa custa fixo e reduz risco', () => {
    const { s, r, act } = setup('r8-eng', { startYear: 1990 });
    hire(s, r, 'engineer', 70, 'signature');
    const d = crewSongDelta(s, song(act.genre), act);
    expect(d.prod).toBeGreaterThan(0);
    expect(d.orig).toBeLessThan(0);
    for (let i = 0; i < 6; i++) crewMonth(s, r);
    expect(crew(s).sig).toBeGreaterThan(10);
    const tm = hire(s, r, 'tour_manager', 60, 'safety');
    const before = s.player.cash;
    crewMonth(s, r);
    expect(s.player.cash).toBeLessThan(before);
    expect(s.ledger.some((e) => e.memo.startsWith('Seguro'))).toBe(true);
    const safeRisk = applyMods(s, 'tourRisk', 0.02, { act }).value;
    crew(s).over[tm.id] = 'lean';
    const leanRisk = applyMods(s, 'tourRisk', 0.02, { act }).value;
    expect(safeRisk).toBeLessThan(0.02);
    expect(leanRisk).toBeGreaterThan(safeRisk);
    invariant(s);
  });

  it('empresário independente ganha confiança e reduz a influência do selo; química de anos cai com a saída da pessoa-chave', () => {
    const { s, r, act } = setup('r8-chem', { startYear: 1990 });
    hire(s, r, 'manager', 70, 'independent', 4);
    const key = hire(s, r, 'producer', 85, 'facilitator', 6);
    hire(s, r, 'engineer', 50, 'technician', 3);
    act.trust = 50;
    for (let i = 0; i < 18; i++) crewMonth(s, r);
    expect(act.trust).toBeGreaterThan(55);
    expect(influence(s)).toBeLessThan(45);
    const chem = chemistry(s);
    expect(chem).toBeGreaterThan(30);
    expect(crew(s).key).toBe(key.id);
    // proposta de rival coberta
    crew(s).poach = { id: key.id, until: s.week + 6, rival: 'X' };
    const sal = key.salary;
    expect(matchPoach(s)).toBeNull();
    expect(key.salary).toBeGreaterThan(sal);
    // saída da pessoa-chave
    s.player.staff = s.player.staff.filter((x) => x !== key);
    crewMonth(s, r);
    expect(chemistry(s)).toBeLessThan(chem * 0.6);
    expect(crew(s).shock).toBeGreaterThan(0);
    invariant(s);
  });
});

describe('turnê roteada com promotor', () => {
  const terms = (o: Partial<DealTerms> = {}): DealTerms => ({ format: 'standard', fee: 1, split: 1, support: 1, rider: 1, intensity: 'normal', price: 1, ...o });

  it('rota compacta é mais curta e barata; a de expansão abre mercados', () => {
    const { s, act } = setup('r8-route', { startYear: 1988 });
    const compact = suggestRoute(s, act.id, 'compact', 6);
    const expand = suggestRoute(s, act.id, 'expand', 6);
    expect(compact.length).toBeGreaterThan(2);
    expect(expand.length).toBeGreaterThan(2);
    const c = routeLegs(s, act.id, compact);
    const e = routeLegs(s, act.id, expand);
    expect(c.legs.slice(1).every((x) => x.km > 0)).toBe(true);
    expect(c.km).toBeLessThan(e.km);
    expect(c.travel).toBeLessThan(e.travel);
    expect(e.newMarkets).toBeGreaterThan(c.newMarkets);
  });

  it('promotor contrapropõe pedidos altos; linha-dura negocia mais e azeda o humor', () => {
    const { s, r, act } = setup('r8-neg', { startYear: 1988 }, 20);
    const cities = suggestRoute(s, act.id, 'compact', 5);
    const greedy = negotiateTour(s, act.id, cities, terms({ fee: 2, split: 2, support: 2, rider: 2, format: 'arena' }));
    expect(greedy.countered.length).toBeGreaterThan(0);
    expect(greedy.terms.format).toBe('standard');
    act.fame = 70;
    const law = hire(s, r, 'legal', 80, 'mediator');
    const med = negotiateTour(s, act.id, cities, terms());
    crew(s).over[law.id] = 'hardball';
    const hard = negotiateTour(s, act.id, cities, terms());
    expect(hard.leverage).toBeGreaterThan(med.leverage);
    expect(hard.mood).toBeLessThan(med.mood);
    expect(hard.doorShare).toBeGreaterThan(med.doorShare);
  });

  it('turnê fechada gera relatório com várias métricas e respeita a invariante do caixa', () => {
    const { s, act } = setup('r8-tour', { startYear: 1988 }, 45);
    const c = s.contracts[act.contractId!];
    c.model = '360';
    c.share360 = 0.3;
    for (const id of act.members) s.persons[id].fatigue = 0;
    const cities = suggestRoute(s, act.id, 'compact', 5);
    const res = bookRoutedTour(s, act.id, cities, terms({ support: 2, intensity: 'rest' }), 10);
    expect('tourId' in res).toBe(true);
    if (!('tourId' in res)) return;
    expect(route(s).deals[res.tourId]).toBeDefined();
    invariant(s);
    for (let i = 0; i < 4 && !route(s).reports.length; i++) advanceMonth(s);
    const rep = route(s).reports.find((x) => x.tourId === res.tourId);
    expect(rep).toBeDefined();
    expect(rep!.shows + rep!.cancelled).toBe(cities.length);
    expect(rep!.shows).toBeGreaterThan(0);
    expect(rep!.attendance).toBeGreaterThan(0);
    for (const k of ['profit', 'labelNet', 'newFans', 'catalogUnits', 'press', 'rel', 'fatigue', 'accidents'] as const) expect(Number.isFinite(rep![k])).toBe(true);
    expect(Object.keys(route(s).rel).length).toBeGreaterThan(0);
    invariant(s);
  });
});

describe('IA, consentimento e autoria', () => {
  function aiGame(seed: string) {
    const g = setup(seed, { startYear: 2026 }, 45);
    g.s.player.territories = ['eu'];
    return g;
  }

  it('leis por país diferem e o lobby antecipa ou atrasa', () => {
    const { s } = aiGame('r8-law');
    expect(lawLevel(s, 'FRA', 2029)).toBeGreaterThanOrEqual(2);
    expect(lawLevel(s, 'NGA', 2029)).toBeLessThanOrEqual(1);
    expect(lawLevel(s, 'XXX', 2040)).toBe(0);
    const before = lawLevel(s, 'BRA', 2027);
    const after0 = lawLevel(s, 'BRA', 2026);
    expect(lobby(s, 'BRA', 1)).toBeNull();
    expect(lawLevel(s, 'BRA', 2026)).toBeGreaterThanOrEqual(after0);
    expect(lawLevel(s, 'BRA', 2027)).toBeGreaterThanOrEqual(before);
    expect(lobby(s, 'BRA', 1)).not.toBeNull(); // uma vez por ano
    invariant(s);
  });

  it('consentimento por artista: fatia e crédito importam; voz licenciada paga o artista e o selo', () => {
    const { s, r, act } = aiGame('r8-consent');
    expect(consentChance(s, act, 'v', 0.5, true)).toBeGreaterThan(consentChance(s, act, 'v', 0.1, false));
    act.trust = 100;
    let granted = false;
    for (let i = 0; i < 6 && !granted; i++) {
      ai(s).consent[act.id] = { sh: 0.5, cr: true, w: -999 };
      askConsent(s, r, act.id, 'v', 0.5, true);
      granted = ai(s).consent[act.id].v === 'g';
    }
    expect(granted).toBe(true);
    const cash = act.cash;
    const label = s.player.cash;
    aiMonth(s, r);
    expect(act.cash).toBeGreaterThan(cash);
    expect(ai(s).last.voice).toBeGreaterThan(0);
    expect(s.player.cash - label).toBeGreaterThanOrEqual(ai(s).last.voice - 1);
    invariant(s);
  });

  it('licenciar o catálogo sem consentimento dá caixa e custa confiança, valor de catálogo e a certificação', () => {
    const a = aiGame('r8-deal-a');
    const b = aiGame('r8-deal-b');
    expect(certBlocker(a.s)).toBeNull();
    expect(applyCert(a.s)).toBeNull();
    const certMult = aiAppealMult(a.s, { actId: a.act.id, songs: [] } as unknown as Release);
    expect(certMult).toBeGreaterThan(1);
    const o = makeOffer(a.s, a.r);
    o.consentOnly = false;
    const trust = ai(a.s).trust;
    const artistTrust = a.act.trust;
    const cash = a.s.player.cash;
    expect(acceptAiOffer(a.s, o.id)).toBeNull();
    expect(a.s.player.cash).toBeGreaterThan(cash);
    expect(ai(a.s).trust).toBeLessThan(trust);
    expect(a.act.trust).toBeLessThan(artistTrust);
    expect(ai(a.s).dil).toBeGreaterThan(0);
    expect(ai(a.s).cert).toBeUndefined();
    expect(certBlocker(a.s)).not.toBeNull();
    // só com obras autorizadas: confiança sobe
    const o2 = makeOffer(b.s, b.r);
    o2.consentOnly = true;
    const t2 = ai(b.s).trust;
    acceptAiOffer(b.s, o2.id);
    expect(ai(b.s).trust).toBeGreaterThan(t2);
    invariant(a.s);
    invariant(b.s);
  });

  it('escala sintética rende margem e corrói a confiança; humano mantém', () => {
    const a = aiGame('r8-scale-a');
    const b = aiGame('r8-scale-b');
    expect(setUse(b.s, 2)).toBeNull();
    expect(scaleIncome(b.s)).toBeGreaterThan(0);
    expect(certBlocker(b.s)).not.toBeNull();
    for (let i = 0; i < 8; i++) { aiMonth(a.s, a.r); aiMonth(b.s, b.r); }
    expect(ai(b.s).trust).toBeLessThan(ai(a.s).trust - 5);
    expect(b.s.player.totals.neural ?? 0).toBeGreaterThan(a.s.player.totals.neural ?? 0);
    invariant(a.s);
    invariant(b.s);
  });

  it('voz sem consentimento é bloqueada em país de lei dura e passa onde não há lei', () => {
    const { s, act } = aiGame('r8-block');
    s.year = 2029;
    const sg = { ...song(act.genre), id: 'sgx', actId: act.id, aiVoice: true, synthetic: true };
    s.songs[sg.id] = sg;
    const mk = (id: string, terr: Release['territories']) => { s.releases[id] = { id, actId: act.id, owner: 'player', songs: [sg.id], week: s.week, territories: terr } as unknown as Release; return s.releases[id]; };
    const eu = mk('rel-eu', ['eu']);
    const af = mk('rel-af', ['africa']);
    const r = new Rng([1, 2, 3, 4]);
    const blocked: string[] = [];
    for (let i = 0; i < 24; i++) blocked.push(...checkBlocks(s, r));
    const euCountries = ['FRA', 'DEU', 'ITA', 'ESP', 'PRT', 'NLD', 'SWE', 'IRL', 'GBR', 'POL', 'RUS'];
    expect(blocked.some((x) => euCountries.includes(x))).toBe(true);
    expect(blocked.some((x) => ['NGA', 'GHA', 'ZAF', 'KEN', 'EGY'].includes(x))).toBe(false);
    expect(applyMods(s, 'chartUnits', 1000, { release: eu }).value).toBeLessThan(applyMods(s, 'chartUnits', 1000, { release: af }).value);
    invariant(s);
  });
});
