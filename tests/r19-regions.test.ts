// Rodada 19 (Frente 6, T5): regiões, sociedade e política + 9.9 celeiros. Cada mecânica: regra, decisão com eco, fato com
// ouvinte, porquê e (quando datada) calendário. Cadeia 3, passo 1: formando do coro vira ghostwriter (writers19).
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { conseq18 } from '../src/sim/decide18';
import { explain18 } from '../src/sim/explain18';
import { factListeners19, recentFacts } from '../src/sim/facts17';
import { inboxKind18 } from '../src/sim/inbox18';
import { STREAMS19 } from '../src/sim/rng19';
import { CH18 } from '../src/sim/sys/discover18';
import { buildings18 } from '../src/sim/sys/campus18';
import { LINKS18 } from '../src/sim/sys/links18';
import { P } from '../src/sim/sys/people/state';
import {
  IND19, applyVisa19, campaignAns19, clashOdds19, communeBlock19, foundCommune19, foundInd19, indAction19, indYield19, lawAppeal19, lawOn19, needle19,
  radioSession19, raid19, raidAnswer19, reg19, regionsMonth19, strikeAns19, visaKey19, visaMult19, visaOdds19, VISA19,
} from '../src/sim/sys/regions19';
import { SCHOOLS18, school18 } from '../src/sim/sys/school18';
import { foundChoir19, sch19, schoolsYear19 } from '../src/sim/sys/schools19';
import { soc18 } from '../src/sim/sys/society18';
import { strikeActive } from '../src/sim/sys/world4/common';
import { fireMilestone, milestoneById } from '../src/sim/sys/world4/milestones';
import { w4 } from '../src/sim/sys/world4/state';
import { hireGhost19, wr19 } from '../src/sim/sys/writers19';
import type { Act, GameState, Release } from '../src/sim/types';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';

const game = (y: number) => { const s = createGame(defaultConfig('reg19', { startYear: y })); s.player.cash += 1e9; return s; };
const myAct = (s: GameState, city: string, genre?: string) => { const a = spawnProceduralAct(s, rngOf(s), { city, genre, fame: 40 }); a.owner = 'player'; return a; };
const facts = (s: GameState, k: string) => recentFacts(s, { kind: k, months: 600 });
const msgs = (s: GameState, k: string) => P(s).inbox.filter((m) => m.ref?.k18 === k);
const heard = (k: string) => factListeners19().some((x) => x.kind === k);

describe('r19 T5 regions19 — selos regionais', () => {
  it('sound system: abrir, render, clash com dubplates, fato com ouvinte e eco', () => {
    const s = game(1975);
    const a = myAct(s, 'kingston', 'reggae');
    expect(foundInd19(s, 'sound')).toBeNull();
    expect(facts(s, 'industry_born').length).toBe(1);
    expect(indYield19(s, 'sound').v).toBeGreaterThan(0);
    const p0 = clashOdds19(s);
    indAction19(s, 'sound', 'dub');
    expect(reg19(s).ind.sound!.dub).toBe(1);
    expect(clashOdds19(s)).toBeGreaterThan(p0);
    s.week += 5;
    indAction19(s, 'sound');
    expect(facts(s, 'sound_clash').length).toBe(1);
    expect(heard('sound_clash') && heard('industry_born')).toBe(true);
    expect(conseq18('ib:reg19_ind:clash_win')?.later?.length).toBeGreaterThan(0);
    expect(explain18(s, 'reg19.ind', { id: 'sound' })?.value).toBeGreaterThan(0);
    expect(a.genre).toBe('reggae');
  });
  it('cassete fora da época antes de 1979; selo de rua "de rua" acumula mágoa e vira processo', () => {
    expect(foundInd19(game(1970), 'cassette')).not.toBeNull();
    const s = game(1985);
    myAct(s, 'new_york', 'hiphop');
    expect(foundInd19(s, 'street')).toBeNull();
    const x = reg19(s).ind.street!;
    for (let i = 0; i < 30 && !facts(s, 'industry_suit').length; i++) { s.week += 5; indAction19(s, 'street', 'cheap'); }
    expect(x.fair).toBe(false);
    expect(facts(s, 'street_hit').length).toBeGreaterThan(0);
    expect(facts(s, 'industry_suit').length).toBeGreaterThan(0);
    expect(heard('street_hit') && heard('industry_suit')).toBe(true);
    expect(Object.keys(IND19)).toEqual(['cassette', 'sound', 'street', 'salsa']);
  });
});

describe('r19 T5 — comuna-república e exílio (N10)', () => {
  it('comuna sob a ditadura brasileira: calor, batida não gráfica, exílio pelo society18', () => {
    const s = game(1969);
    const a = myAct(s, 'rio', 'mpb');
    expect(communeBlock19(game(1960), a)).not.toBeNull(); // antes de 1965
    expect(foundCommune19(s, a.id)).toBeNull();
    expect(soc18(s).heat[a.id]).toBeGreaterThanOrEqual(10); // ouvinte commune_founded
    const core = a.fans.core;
    raid19(s, a);
    expect(facts(s, 'commune_raid')[0].text.pt).not.toMatch(/mort|kill/i);
    expect(a.fans.core).toBeGreaterThan(core);
    const m = msgs(s, 'reg19_raid')[0];
    expect(m.actions!.map((x) => x.id)).toEqual(['exile', 'rebuild', 'disband']);
    raidAnswer19(s, a.id, 'exile', new Rng([1, 2, 3, 4]));
    expect(soc18(s).exile[a.id]).toBeDefined();
    expect(reg19(s).com[a.id]).toBeUndefined();
    expect(inboxKind18('reg19_raid')).toBeDefined();
    expect(conseq18('ib:reg19_raid:exile')?.later?.length).toBe(1);
    expect(explain18(s, 'reg19.raid', { act: a.id })).toBeNull(); // comuna encerrada
  });
});

describe('r19 T5 — vistos (M11), needle time (M9), leis', () => {
  it('proibição britânica 1935–55: banda americana em Londres ×0,6; visto libera; prisão derruba a chance', () => {
    const s = game(1950);
    const a = myAct(s, 'new_york', 'big_band');
    const v = VISA19.find((x) => x.id === 'uk_mu')!;
    expect(visaMult19(s, a, 'london').k).toBe(0.6);
    const p0 = visaOdds19(s, a, v).p;
    s.x4.facts17.f.push({ id: 'fx', y: 1950, m: 0, w: s.week, kind: 'arrest', actors: [a.members[0]], severity: 50, visibility: 'public', tags: [], text: { pt: 'x', en: 'x' } });
    expect(visaOdds19(s, a, v).p).toBeLessThan(p0);
    reg19(s).visa[visaKey19(a.id, 'uk_mu')] = s.week + 52;
    expect(visaMult19(s, a, 'london').k).toBe(1);
    expect(applyVisa19(s, a.id, 'uk_mu').pt).toMatch(/Já tem/);
    expect(visaMult19(s, a, 'new_york').k).toBe(1); // em casa
    expect(heard('visa_denied')).toBe(true);
  });
  it('needle time por fase; sessão de rádio; leis disparam com fato e efeito (CanCon, MMA)', () => {
    expect([needle19(1930), needle19(1960), needle19(1975), needle19(1995)]).toEqual([0, 2, 1, 0]);
    const s = game(1970);
    const a = myAct(s, 'toronto', 'folk');
    expect(radioSession19(s, a.id)).toBeNull();
    expect(radioSession19(s, a.id)).not.toBeNull(); // 1 por trimestre
    expect(facts(s, 'radio_session').length).toBe(1);
    const rel = { territories: ['na', 'eu'] } as unknown as Release;
    expect(lawAppeal19(s, rel, a).length).toBe(0);
    fireMilestone(s, Rng.fromSeed('x'), milestoneById.law_cancon);
    expect(lawOn19(s, 'cancon')).toBe(true);
    expect(reg19(s).laws.cancon).toBe(1970);
    expect(facts(s, 'law').some((f) => f.tags.includes('cancon'))).toBe(true);
    expect(lawAppeal19(s, rel, a).map(([k]) => k)).toContain(1.08);
    const rm = s.economy.rightsMult;
    fireMilestone(s, Rng.fromSeed('x'), milestoneById.law_mma);
    expect(s.economy.rightsMult).toBeCloseTo(rm * 1.03);
    expect(explain18(s, 'reg19.law', { act: a.id })).toBeNull(); // sem lançamento ainda
  });
});

describe('r19 T5 — greve 1948 (M10) e campanhas (M29)', () => {
  it('janeiro de 1948: greve começa, cartão com 4 saídas; acordo → fundo (MPTF) e fato', () => {
    const s = game(1947);
    myAct(s, 'new_york', 'big_band');
    s.year = 1948; s.month = 0;
    regionsMonth19(s);
    expect(strikeActive(s)).not.toBeNull();
    expect(msgs(s, 'reg19_strike')[0].actions!.map((x) => x.id)).toEqual(['acappella', 'abroad', 'settle', 'hold']);
    strikeAns19(s, 'settle');
    expect(w4(s).union).toBe(true);
    expect(reg19(s).mptf).toBeDefined();
    expect(facts(s, 'strike_settled').length).toBe(1);
    expect(heard('strike_settled')).toBe(true);
    for (const k of ['acappella', 'abroad', 'settle', 'hold']) expect(conseq18(`ib:reg19_strike:${k}`)?.later?.length, k).toBeGreaterThan(0);
  });
  it('canção em campanha: licenciar paga e mexe na facção; fato e eco', () => {
    const s = game(1984);
    const a = myAct(s, 'new_york', 'rock');
    const rel = { id: 'rc1', actId: a.id, owner: 'player', type: 'single', title: 'Hino', songs: [], week: 0, year: 1983, q: 60, appeal: 30, formats: [], stock: 0, pressed: 0, marketing: [], marketingE: 0, territories: ['na'], weekly: [], totalUnits: 1, revenue: 0, peak: 2, weeksOnChart: 5, lastPos: 0, coverSeed: 1, shortage: 0, live: false } as unknown as Release;
    s.releases[rel.id] = rel;
    const cash = s.player.cash;
    campaignAns19(s, rel.id, 'right', 'license');
    expect(s.player.cash).toBeGreaterThan(cash);
    expect(facts(s, 'campaign_song')[0].tags).toContain('license');
    expect(heard('campaign_song')).toBe(true);
    expect(conseq18('ib:reg19_campaign:protest')?.later?.length).toBe(1);
  });
});

describe('r19 9.9 schools19 — celeiros e cadeia 3 (passo 1)', () => {
  it('coro e escola de "Fama" nas bolsas, canal "Culto de domingo"; programa do selo no campus; prodígio; ghostwriter vem do coro', () => {
    expect(SCHOOLS18.some((x) => x.id === 'church') && SCHOOLS18.some((x) => x.id === 'fame')).toBe(true);
    expect(CH18.some((c) => c.id === 'church')).toBe(true);
    const s = game(1962);
    const mine: Act = myAct(s, s.config.homeCity, 'soul');
    expect(foundChoir19(s)).toBeNull();
    expect(facts(s, 'school_founded').length).toBe(1);
    expect(buildings18(s).some((b) => b.id === 'sch19')).toBe(true);
    schoolsYear19(s);
    const al = facts(s, 'choir_alumni').find((f) => f.actors.includes('player'))!;
    expect(al).toBeDefined();
    expect(s.persons[al.actors[0]]).toBeDefined(); // pessoa primeiro: writers19 lê
    // prodígio
    const aid = al.actors[1];
    s.acts[aid].potential = 85;
    const pot = s.acts[aid].potential;
    s.year++;
    schoolsYear19(s);
    expect(facts(s, 'prodigy_found').some((f) => f.actors.includes(aid))).toBe(true);
    expect(s.acts[aid].potential).toBe(pot + 3);
    expect(['school_founded', 'choir_alumni', 'prodigy_found'].every(heard)).toBe(true);
    // cadeia 3, passo 1: o ghostwriter do selo sai do coro
    expect(hireGhost19(s, mine.id, false)).toBeNull();
    const g = wr19(s).gh[wr19(s).gh.length - 1];
    expect(['choir_alumni', 'prodigy_found']).toContain(g.from);
    expect(Object.keys(sch19(s).alumni)).toContain(aid);
    void school18;
  });
});

describe('r19 T5 — infra', () => {
  it('rng, ligações, caixa, ecos e calendário registrados', () => {
    expect(STREAMS19.reg19 && STREAMS19.sch19).toBeTruthy();
    expect(LINKS18.some((x) => x.id === 'visa') && LINKS18.some((x) => x.id === 'commune')).toBe(true);
    for (const k of ['reg19_raid', 'reg19_strike', 'reg19_strike_warn', 'reg19_campaign']) expect(inboxKind18(k), k).toBeDefined();
    for (const k of ['ib:reg19_strike_warn:stock', 'ib:reg19_campaign:ignore', 'ib:reg19_ind:version', 'ib:reg19_ind:allstars', 'ib:sch19_prog:found']) expect(conseq18(k)?.later?.length, k).toBeGreaterThan(0);
  });
});
