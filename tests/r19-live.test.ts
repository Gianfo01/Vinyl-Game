import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { emitFact, factListeners19, recentFacts } from '../src/sim/facts17';
import { fandomRec19 } from '../src/sim/fandom19';
import { calendar19 } from '../src/sim/calendar19';
import { explain18 } from '../src/sim/explain18';
import { rngOf } from '../src/sim/util';
import { P } from '../src/sim/sys/people/state';
import { GIANT19, giant18 } from '../src/sim/sys/live18';
import { crime17 } from '../src/sim/sys/crime17';
import { disc18 } from '../src/sim/sys/discover18';
import { feudOf18 } from '../src/sim/sys/feud18';
import { hireGhost19, wr19 } from '../src/sim/sys/writers19';
import { activeBoy19, freeFest19, hearing19, liveMonth19, lv19, rsdPick19, season19, startBoy19, vinylIdx19 } from '../src/sim/sys/live19';
import { answerCrisis19, ch19, crisis19, npcShow19, stage19 } from '../src/sim/sys/charity19';
import { ctPick19, ctNow19, final19 } from '../src/sim/sys/contests19';
import type { Act, GameState, Release } from '../src/sim/types';

const facts = (s: GameState, k: string) => recentFacts(s, { kind: k, months: 600 });
function game(y: number, seed: string, mode: 'loose' | 'strict' = 'loose'): GameState {
  const s = createGame(defaultConfig(seed, { startYear: y }));
  s.config.history = mode;
  s.player.cash += 5e8;
  return s;
}
const myAct = (s: GameState, fame = 60): Act => { const a = spawnProceduralAct(s, rngOf(s), { city: s.config.homeCity, fame }); a.owner = 'player'; a.status = 'active'; a.fans.core = 2000; a.fans.active = 5000; a.fans.casual = 20000; return a; };
const npcAct = (s: GameState, lb: string): Act => { const a = spawnProceduralAct(s, rngOf(s), { city: s.config.homeCity, fame: 55 }); a.owner = lb; a.status = 'active'; return a; };
function rel(s: GameState, a: Act, year: number): Release {
  const r: Release = { id: `rl-${a.id}-${year}`, actId: a.id, owner: 'player', type: 'lp', title: `Disco de ${year}`, songs: a.songs.slice(0, 1), week: 0, year, q: 70, appeal: 30,
    formats: [], stock: 0, pressed: 0, marketing: [], marketingE: 0, territories: ['na'], weekly: [], totalUnits: 200000, revenue: 0, peak: 3, weeksOnChart: 0, lastPos: 0, coverSeed: 1, shortage: 0, live: false };
  s.releases[r.id] = r; a.releases.push(r.id);
  return r;
}

describe('r19 T4 live19 — ingressos, festival grátis, vinil, temporada', () => {
  it('N9: boicote ao gigante → audiência antitruste corta a taxa; modo exato arquiva', () => {
    const s = game(1994, 'r19-live-boy');
    const a = myAct(s);
    const fee0 = giant18(s)!.fee;
    expect(startBoy19(s, a.id)).toBeNull();
    expect(facts(s, 'boycott').some((f) => f.tags.includes('tickets'))).toBe(true);
    expect(GIANT19.ok!(s, a)).toBe(false);
    const b = activeBoy19(s, a.id)[0];
    expect(calendar19(s, { weeks: 40 }).some((d) => d.id === `live19-hear-${b.id}`)).toBe(true);
    expect(explain18(s, 'lv19.hear', { boy: b.id })?.parts.length).toBeGreaterThan(1);
    hearing19(s, b.id, 'win');
    expect(facts(s, 'antitrust_ruling')[0].tags).toContain('win');
    expect(giant18(s)!.fee).toBeLessThan(fee0);
    const x = game(1994, 'r19-live-boy-x', 'strict');
    const ax = myAct(x);
    startBoy19(x, ax.id);
    hearing19(x, activeBoy19(x, ax.id)[0].id);
    expect(lv19(x).boy[0].res).toBe('lose');
  });

  it('N26: festival gratuito lotado sem segurança → incidente, processo e lei; modo exato sem tragédia', () => {
    const s = game(1975, 'r19-live-ff');
    myAct(s, 70);
    expect(freeFest19(s, 'farm', 0, false, 3)).toBeNull();
    expect(facts(s, 'free_fest').length).toBe(1);
    expect(facts(s, 'crowd_incident').some((f) => f.src === 'live19')).toBe(true);
    expect(s.lawsuits.some((x) => x.kind === 'safety')).toBe(true);
    expect(facts(s, 'law').some((f) => f.tags.includes('safety'))).toBe(true);
    expect(freeFest19(s, 'park', 2, false)).not.toBeNull(); // 1 por ano
    const x = game(1975, 'r19-live-ffx', 'strict');
    myAct(x, 90);
    freeFest19(x, 'park', 0, false);
    expect(lv19(x).ff[0].inc).toBe(0);
  });

  it('N22: curva do vinil e Record Store Day → superfãs e vendas', () => {
    expect(vinylIdx19(2005)).toBeLessThan(vinylIdx19(1978));
    expect(vinylIdx19(2020)).toBeGreaterThan(vinylIdx19(2007));
    const s = game(2012, 'r19-live-rsd');
    const a = myAct(s, 50), r = rel(s, a, 2004);
    const sf = fandomRec19(s, a.id).superfans, u0 = r.totalUnits;
    s.month = 1;
    rsdPick19(s, 'cat');
    expect(lv19(s).rsd.length).toBe(1);
    s.month = 3;
    liveMonth19(s);
    expect(facts(s, 'rsd_exclusive').length).toBe(1);
    expect(r.totalUnits).toBeGreaterThan(u0);
    expect(fandomRec19(s, a.id).superfans).toBeGreaterThan(sf);
  });

  it('M6: Natal > janeiro, média do ano ≈ 1, streaming sente menos, marcos no calendário', () => {
    expect(season19(1990, 11).units).toBeGreaterThan(1.3);
    expect(season19(1990, 0).units).toBeLessThan(0.85);
    const avg = Array.from({ length: 12 }, (_, m) => season19(1990, m).units).reduce((x, y) => x + y, 0) / 12;
    expect(avg).toBeGreaterThan(0.97); expect(avg).toBeLessThan(1.04);
    expect(season19(2020, 11).units).toBeLessThan(season19(1990, 11).units);
    expect(season19(1975, 6).live).toBeGreaterThan(1);
    const s = game(2010, 'r19-live-cal');
    expect(calendar19(s, { weeks: 60 }).some((d) => d.id.startsWith('live19-'))).toBe(true);
    for (let i = 0; i < 3; i++) advanceMonth(s);
  });
});

describe('r19 9.8 charity19 — cadeia 4', () => {
  it('crise → beneficente → rivais no palco → pacto ou briga → dinheiro some → investigação', () => {
    const s = game(1990, 'r19-live-ch');
    const me = myAct(s, 65);
    const lbs = Object.values(s.labels).filter((x) => x.active);
    const a = npcAct(s, lbs[0].id), b = npcAct(s, lbs[1].id);
    const c = crisis19(s, { cause: 'famine', fmt: 'concert' });
    expect(facts(s, 'world_crisis').length).toBe(1);
    expect(P(s).inbox.some((m) => m.ref?.k18 === 'ch19_crisis')).toBe(true);
    answerCrisis19(s, c.id, 'join');
    expect(ch19(s).cr[0].join).toBe(me.id);
    npcShow19(s, c.id, { vanish: true, stars: [a.id, b.id] });
    const show = facts(s, 'charity_show')[0];
    expect(show.actors).toContain(me.id);
    expect(ch19(s).st.length).toBeGreaterThan(0); // rivais no palco (ouvinte)
    stage19(s, [a.id, b.id], 'feud');
    expect(feudOf18(s, a.id, b.id)).toBeTruthy();
    expect(facts(s, 'charity_scandal').length).toBe(1);
    expect(crime17(s).cases.some((x) => x.who === ch19(s).cr[0].org)).toBe(true);
    const pact = stage19(s, [a.id, me.id], 'pact');
    expect(pact[0].k).toBe('pact');
  });
});

describe('r19 9.12 contests19 — concursos', () => {
  it('festival da canção: inscrição, patrocínio, júri → final, vencedor vira pista e ghostwriter (cadeia 3)', () => {
    const s = game(1967, 'r19-live-ct');
    const a = myAct(s, 30), j = myAct(s, 60);
    const c = ctNow19(s).find((x) => x.kind === 'song')!;
    expect(c).toBeTruthy();
    ctPick19(s, c.id, 'enter', a.id); ctPick19(s, c.id, 'sponsor'); ctPick19(s, c.id, 'judge');
    const e = final19(s, c.id, { win: 'new', feud: true })!;
    expect(e.done && e.win).toBeTruthy();
    expect(facts(s, 'contest_final').length).toBe(1);
    const w = facts(s, 'contest_winner')[0];
    expect(s.persons[w.actors[0]]).toBeTruthy();
    expect(disc18(s).leads.some((x) => x.a === w.actors[1])).toBe(true);
    expect(P(s).inbox.some((m) => m.ref?.k18 === 'ct19_sign')).toBe(true);
    expect(facts(s, 'judge_feud').length).toBe(1);
    expect(feudOf18(s, j.id, facts(s, 'judge_feud')[0].actors[1])).toBeTruthy();
    hireGhost19(s, j.id, false);
    expect(wr19(s).gh.at(-1)?.from).toBe('contest_winner');
  });
  it('final do tv18 vira contest_final/contest_winner; ouvintes registrados', () => {
    const s = game(2005, 'r19-live-tv');
    const x = npcAct(s, Object.values(s.labels).find((l) => l.active)!.id);
    emitFact(s, { kind: 'award', actors: [x.id], severity: 50, tags: ['tv', 'talent_show', 'winner'], src: 'tv18', text: { pt: 'v', en: 'w' } });
    expect(facts(s, 'contest_final').length).toBe(1);
    expect(facts(s, 'contest_winner').length).toBe(1);
    const ls = factListeners19();
    for (const k of ['charity_show', 'charity_single', 'charity_scandal', 'contest_final', 'contest_winner', 'judge_feud', 'world_crisis', 'antitrust_ruling', 'free_fest', 'rsd_exclusive']) expect(ls.some((y) => y.kind === k), k).toBe(true);
  });
});
