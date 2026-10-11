// Rodada 19 (Frente 9.2/9.3): session19 (músicos de estúdio) e writers19 (créditos, ghostwriters, plágio).
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { recentFacts } from '../src/sim/facts17';
import { holdsOf } from '../src/sim/holds17';
import { composeSongs } from '../src/sim/production';
import '../src/sim/sys';
import { r18 } from '../src/sim/sys/rights18';
import { _ses19, collectives19, hireAce19, market19, ses19 } from '../src/sim/sys/session19';
import { computeDims18 } from '../src/sim/sys/quality18';
import { _wr19, answerSuit19, hireGhost19, negotiateSplit19, wr19 } from '../src/sim/sys/writers19';
import type { Act, GameState, Release } from '../src/sim/types';
import { playerActs } from '../src/sim/util';
import { createGame } from '../src/sim/worldgen';

const game = (over: Parameters<typeof defaultConfig>[1] = {}) => {
  const s = createGame(defaultConfig('r19-ses', { startYear: 1966, realNames: true, ...over }));
  s.player.cash += 10_000_000;
  return s;
};
const myAct = (s: GameState): Act => {
  const id = playerActs(s)[0];
  if (id) return s.acts[id];
  const a = Object.values(s.acts).find((x) => !x.owner && x.members.length > 1)!;
  a.owner = 'player';
  return a;
};
const hitRel = (s: GameState, act: Act, songs: string[], peak = 3): Release => {
  const rel = { id: `rx${songs[0]}`, actId: act.id, owner: 'player', title: 'X', songs, week: s.week, peak, weekly: [], totalUnits: 200000, kind: 'single' } as unknown as Release;
  s.releases[rel.id] = rel;
  for (const id of songs) { s.songs[id].releaseId = rel.id; s.songs[id].recorded = true; }
  return rel;
};

describe('r19 session19 — músicos de estúdio', () => {
  it('coletivos reais por época; fictícios só fora do modo exato', () => {
    const loose = game({ history: 'loose' });
    const strict = game({ history: 'strict', mode: 'historic' });
    const ids = (s: GameState) => collectives19(s, true).map((c) => c.id);
    expect(ids(strict)).toEqual(expect.arrayContaining(['wrecking', 'funk', 'ateam', 'andantes']));
    expect(ids(strict).some((x) => x.startsWith('f_'))).toBe(false);
    expect(ids(loose)).toContain('f_feras');
    expect(market19(strict).some((a) => a.name === 'Carol Kaye' && a.inst === 'bass')).toBe(true);
  });

  it('contratar: vira pessoa, toca nas faixas, sobe a dimensão do disco e cresce', () => {
    const s = game();
    const act = myAct(s);
    const ace = market19(s).find((a) => a.crew === 'funk' && a.inst === 'drums')!;
    const cash = s.player.cash;
    expect(hireAce19(s, ace.id, act.id, false)).toBeNull();
    expect(s.player.cash).toBeLessThan(cash);
    expect(ace.pid && s.persons[ace.pid]).toBeTruthy();
    const so = composeSongs(s, Rng.fromSeed(`t${1}`), act, 1)[0];
    so.recorded = true;
    const sk0 = s.persons[ace.pid!].skills.instr;
    _ses19.playMonth(s);
    expect(ses19(s).on[so.id]).toContain(ace.id);
    expect(ace.unc).toBe(1);
    expect(s.persons[ace.pid!].skills.instr).toBeGreaterThanOrEqual(sk0);
    const rel = hitRel(s, act, [so.id]);
    const d = computeDims18(s, rel)!;
    expect(d.parts.imm.some(([w]) => w.pt.includes(ace.name))).toBe(true);
    _ses19.playMonth(s);
    expect(ace.hits).toBe(1);
    expect(ace.grudge).toBeGreaterThan(0);
  });

  it('documentário → processo por crédito (rights18 + holds17); modo exato não inventa processo de gente real', () => {
    const s = game({ history: 'loose', realNames: false });
    const act = myAct(s);
    const ace = market19(s).find((a) => a.crew === 'funk')!;
    hireAce19(s, ace.id, act.id, false);
    const so = composeSongs(s, Rng.fromSeed(`t${2}`), act, 1)[0];
    so.recorded = true;
    _ses19.playMonth(s);
    hitRel(s, act, [so.id], 2);
    _ses19.playMonth(s);
    ses19(s).docs.funk = s.year;
    ace.grudge = 90;
    _ses19.sue(s, ace, Rng.fromSeed(`t${3}`));
    expect(r18(s).disp.some((d) => d.song === so.id && d.who === `p:${ace.pid}`)).toBe(true);
    expect(holdsOf(s, ace.pid!).has.some((h) => h.kind === 'grievance')).toBe(true);
    expect(recentFacts(s, { kind: 'session_lawsuit' }).length).toBe(1);

    const ex = game({ history: 'strict', mode: 'historic' });
    const real = market19(ex).find((a) => a.real)!;
    ses19(ex).docs[real.crew] = ex.year; real.grudge = 100; real.fame = 90;
    for (let i = 0; i < 40; i++) _ses19.aftermath(ex, Rng.fromSeed(`t${i}`));
    expect(real.sued).toBeUndefined();
    expect(real.star).toBeUndefined();
  });

  it('fama do documentário pode virar carreira própria (fato session_star)', () => {
    const s = game({ history: 'loose', realNames: false });
    const ace = market19(s).find((a) => a.crew === 'wrecking')!;
    ace.fame = 60;
    _ses19.becomeStar(s, ace, Rng.fromSeed(`t${5}`));
    expect(ace.star && s.acts[ace.star]).toBeTruthy();
    expect(recentFacts(s, { kind: 'session_star' }).length).toBe(1);
  });
});

describe('r19 writers19 — créditos, ghostwriters e plágio', () => {
  it('divisão negociada: banda inteira em partes iguais', () => {
    const s = game();
    const act = myAct(s);
    const so = composeSongs(s, Rng.fromSeed(`t${7}`), act, 1)[0];
    expect(negotiateSplit19(s, so.id, 'band')).toBeNull();
    const alive = act.members.filter((id) => s.persons[id]?.alive);
    expect(so.splits?.length).toBe(alive.length);
    expect(Math.abs(so.splits!.reduce((t, x) => t + x.share, 0) - 1)).toBeLessThan(0.001);
    expect(recentFacts(s, { kind: 'cowrite_split' }).length).toBe(1);
  });

  it('ghostwriter escreve, guarda rancor e, ao revelar, vira escândalo e carreira solo', () => {
    const s = game({ history: 'loose', realNames: false });
    const act = myAct(s);
    expect(hireGhost19(s, act.id, false)).toBeNull();
    const g = wr19(s).gh[0];
    s.month = 0;
    _wr19.ghostWrite(s, g, Rng.fromSeed(`t${9}`));
    expect(g.songs.length).toBe(1);
    hitRel(s, act, g.songs, 4);
    _wr19.ghostWrite(s, g, Rng.fromSeed(`t${10}`));
    expect(g.hits).toBe(1);
    _wr19.reveal(s, g, Rng.fromSeed(`t${11}`));
    expect(recentFacts(s, { kind: 'ghostwriter_revealed' }).length).toBe(1);
    expect(recentFacts(s, { kind: 'scandal' }).some((f) => f.actors.includes(act.id))).toBe(true);
    expect(Object.values(s.acts).some((a) => a.members.includes(g.pid) && a.id !== act.id)).toBe(true);
    expect(s.songs[g.songs[0]].splits?.some((x) => x.personId === g.pid)).toBe(true);
  });

  it('plágio contra você: acordo cobra; tribunal resolve com fato case_ruling', () => {
    const s = game();
    const act = myAct(s);
    const so = composeSongs(s, Rng.fromSeed(`t${12}`), act, 1)[0];
    hitRel(s, act, [so.id], 1);
    const other = Object.values(s.acts).find((a) => a.owner && a.owner !== 'player')!;
    const st = wr19(s);
    st.suits.push({ id: 'plA', dir: 'in', song: so.id, other: other.id, st: 'open', odds: 0.5, amt: 100000 }, { id: 'plB', dir: 'in', song: so.id, other: other.id, st: 'open', odds: 0.5, amt: 100000 });
    const c0 = s.player.cash;
    answerSuit19(s, 'plA', 'settle');
    expect(s.player.cash).toBe(c0 - 100000);
    answerSuit19(s, 'plB', 'fight');
    s.week += 14;
    _wr19.courts(s, Rng.fromSeed(`t${13}`));
    expect(st.suits.find((x) => x.id === 'plB')!.st).toBe('done');
    expect(recentFacts(s, { kind: 'case_ruling' }).some((f) => f.src === 'writers19')).toBe(true);
  });

  it('meses seguidos rodam sem erro e são determinísticos', () => {
    const run = () => { const s = game({ history: 'loose' }); for (let m = 0; m < 6; m++) { _ses19.ensureAces(s); _ses19.npcHits(s, Rng.fromSeed(`t${m}`)); _ses19.documentaries(s, Rng.fromSeed(`t${m}`)); _wr19.npcGhosts(s, Rng.fromSeed(`t${m}`)); _wr19.offers(s, Rng.fromSeed(`t${m}`)); _wr19.plagiarism(s, Rng.fromSeed(`t${m}`)); } return JSON.stringify([ses19(s).aces.map((a) => a.hits), wr19(s).offers.length]); };
    expect(run()).toBe(run());
  });
});
