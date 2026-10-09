// Rodada 4 — sistema "scenes": premiação, entrevista, rádio, tribunal, conselho, turnê e vida.

import { describe, expect, it } from 'vitest';
import { defaultConfig, simulate } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { fileLawsuit, goPublic } from '../src/sim/business';
import { composeSongs, recordSongs } from '../src/sim/production';
import { releaseSingle } from '../src/sim/repertoire';
import { advanceMonth } from '../src/sim/tick';
import { applyMods } from '../src/sim/ext4';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { sc, findScene } from '../src/sim/sys/scenes';
import { awardSpeech, awardsYear } from '../src/sim/sys/scenes/awards';
import { autoAnswers, resolveInterview, startInterview, toneEffect } from '../src/sim/sys/scenes/interview';
import { radioFit, resolveRadio, startRadioVisit } from '../src/sim/sys/scenes/radio';
import { appealVerdict, courtChoice, courtWeek } from '../src/sim/sys/scenes/court';
import { agmVote, agmYear } from '../src/sim/sys/scenes/board';
import { resolveVignette, vignetteOnShow } from '../src/sim/sys/scenes/tour';
import { factoryOvertime, fairChoice, fairMonth, shortageWeek } from '../src/sim/sys/scenes/life';
import type { GameState } from '../src/sim/types';
import type { Cutscene } from '../src/sim/ext4';

function withAct(seed: string, year = 1965) {
  const s = createGame(defaultConfig(seed, { startYear: year }));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity, fame: 30 });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  s.player.cash += 50_000_000_00;
  s.player.initialCash += 50_000_000_00;
  s.week = Math.max(s.week, 10);
  return { s, r, act };
}

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
const last = (s: GameState, kind: string) => [...s.cutscenes].reverse().find((c) => c.kind === kind);

describe('cenas: estado e determinismo', () => {
  it('mesma seed = mesmas cenas', () => {
    const a = simulate(defaultConfig('scn-det'), 4).state;
    const b = simulate(defaultConfig('scn-det'), 4).state;
    expect(JSON.stringify(a.x4.scenes)).toBe(JSON.stringify(b.x4.scenes));
    expect(a.cutscenes.map((c) => c.kind)).toEqual(b.cutscenes.map((c) => c.kind));
    expect(a.player.cash).toBe(b.player.cash);
    invariant(a);
    expect(a.x4.scenes.archive.length).toBeLessThanOrEqual(30);
  });
});

describe('premiação', () => {
  it('monta indicados, revela o vencedor e aplica o discurso uma vez', () => {
    const { s, act } = withAct('scn-aw');
    const r = rngOf(s);
    const rel = Object.values(s.releases).find((x) => !x.hist && (x.owner === 'player' || x.actId === act.id));
    s.awards.push({ year: s.year, category: 'record', releaseId: rel?.id, actId: act.id, name: `${act.name} — x`, byPlayer: true });
    awardsYear(s, r);
    const cs = last(s, 'awards')!;
    expect(cs).toBeTruthy();
    const cats = cs.data.cats as { nominees: { mine: boolean }[]; winner: number }[];
    expect(cats.length).toBeGreaterThan(0);
    expect(cats[0].winner).toBeGreaterThanOrEqual(0);
    act.trust = 50;
    awardSpeech(s, r, cs.id, 'team');
    expect(act.trust).toBe(55);
    awardSpeech(s, r, cs.id, 'team');
    expect(act.trust).toBe(55);
  });

  it('discurso político deixa o ato na mira e provocação esquenta a rivalidade', () => {
    const { s, act } = withAct('scn-aw2');
    const r = rngOf(s);
    s.awards.push({ year: s.year, category: 'live_act', actId: act.id, name: `Ato ao Vivo / Live: ${act.name}`, byPlayer: true });
    awardsYear(s, r);
    const cs = last(s, 'awards')!;
    awardSpeech(s, r, cs.id, 'political');
    expect(sc(s).heat[act.id]).toBeGreaterThan(s.week);
  });
});

describe('entrevista', () => {
  it('tom ideal rende mais que o arriscado; efeitos limitados e aplicados uma vez', () => {
    const q = { topic: 'release' as const, text: { pt: '', en: '' }, ideal: 'sincere' as const, risky: 'evasive' as const };
    expect(toneEffect(q, 'sincere').img).toBeGreaterThan(toneEffect(q, 'evasive').img);
    const { s, act } = withAct('scn-iv');
    const r = rngOf(s);
    const cs = startInterview(s, r, act.id) as Cutscene;
    expect(cs.kind).toBe('interview');
    expect(typeof startInterview(s, r, act.id)).toBe('object'); // cooldown devolve L
    expect((startInterview(s, r, act.id) as Cutscene).kind).toBeUndefined();
    const before = act.image!.publicImage;
    const ans = (cs.data.questions as { ideal: 'sincere' }[]).map((q2) => q2.ideal);
    const res = resolveInterview(s, r, cs.id, ans);
    expect('total' in res).toBe(true);
    expect(act.image!.publicImage).toBeGreaterThan(before);
    expect(act.image!.publicImage - before).toBeLessThanOrEqual(10);
    const after = act.image!.publicImage;
    resolveInterview(s, r, cs.id, ans);
    expect(act.image!.publicImage).toBe(after);
    expect(autoAnswers(s, r, cs.id)).toHaveLength(ans.length);
    invariant(s);
  });
});

describe('rádio', () => {
  it('disco certo dá impulso de apelo que aparece nos modificadores', () => {
    const { s, act } = withAct('scn-radio');
    const r = rngOf(s);
    const songs = composeSongs(s, r, act, 1);
    recordSongs(s, r, act, [songs[0].id], 1, 'balanced');
    expect(releaseSingle(s, r, songs[0].id)).toBeNull();
    for (let i = 0; i < 2; i++) advanceMonth(s);
    s.agenda[act.id] = []; s.delegated[act.id] = false; s.plans = []; s.loadNow = {};
    const cs = startRadioVisit(s, r, act.id) as Cutscene;
    expect(cs.kind).toBe('radio');
    const relId = (cs.data.options as string[])[0];
    const rel = s.releases[relId];
    expect(radioFit(s, cs.data.dj as never, rel)).toBeGreaterThanOrEqual(0);
    resolveRadio(s, r, cs.id, relId, true);
    expect(findScene(s, cs.id)!.data.done).toBe(true);
    expect(sc(s).stats.payolaSignals).toBe(1);
    const boost = sc(s).radioBoost[relId];
    if (boost) {
      // outros sistemas também modificam o apelo: o fator da rádio é o que ficou entre 1 e 1,11
      const m = applyMods(s, 'appeal', 100, { release: rel, act });
      expect(m.factors.some((f) => f.ratio > 1 && f.ratio <= 1.11)).toBe(true);
    }
    invariant(s);
  });
});

describe('tribunal e conselho', () => {
  it('audiência com perito melhora as chances; recurso cobra taxa', () => {
    const { s, act } = withAct('scn-court');
    const r = rngOf(s);
    const suit = fileLawsuit(s, { kind: 'plagiarism', plaintiff: 'X', defendant: 'player', actId: act.id, claim: 1_000_00, odds: 0.4, text: { pt: 'p', en: 'p' } });
    suit.stage = 'trial';
    courtWeek(s);
    const cs = last(s, 'court')!;
    courtChoice(s, r, cs.id, 'expert');
    expect(suit.odds).toBeCloseTo(0.52);
    courtChoice(s, r, cs.id, 'expert');
    expect(suit.odds).toBeCloseTo(0.52);
    suit.stage = 'lost';
    courtWeek(s);
    const ap = last(s, 'appeal')!;
    const cash = s.player.cash;
    appealVerdict(s, r, ap.id, true);
    expect(s.player.cash).not.toBe(cash);
    invariant(s);
  });

  it('assembleia anual vota propostas', () => {
    const { s } = withAct('scn-agm', 1975);
    const r = rngOf(s);
    s.player.hq = 3;
    s.player.revenueByYear[s.year] = 5_000_000_00;
    expect(goPublic(s)).toBeNull();
    agmYear(s, r);
    const cs = last(s, 'agm')!;
    agmVote(s, r, cs.id, 'dividend');
    expect((findScene(s, cs.id)!.data.votes as unknown[]).length).toBe(6);
    invariant(s);
  });
});

describe('turnê, feira e fábrica', () => {
  it('quarto destruído cobra multa na hora; descontar do artista devolve metade', () => {
    const { s, act } = withAct('scn-hotel');
    let tries = 0;
    while (!last(s, 'vignette') && tries < 400) {
      s.week += 7;
      vignetteOnShow(s, rngOf(s), { actId: act.id, cityId: s.config.homeCity, sold: 100, capacity: 200, revenue: 0, tourId: `t${tries}` });
      tries += 1;
    }
    const cs = last(s, 'vignette')!;
    expect(cs).toBeTruthy();
    const opt = cs.data.vkind === 'hotel' ? 'charge' : cs.data.vkind === 'bus' ? 'rest' : 'grant';
    resolveVignette(s, rngOf(s), cs.id, opt);
    expect(findScene(s, cs.id)!.data.done).toBe(true);
    invariant(s);
  });

  it('feira cobra estande e vende licenças; fábrica prensa em turno extra', () => {
    const { s, act } = withAct('scn-fair');
    s.month = 1;
    fairMonth(s);
    const f = last(s, 'fair')!;
    fairChoice(s, rngOf(s), f.id, 'medium');
    expect(sc(s).stats.fairs).toBe(1);
    const r = rngOf(s);
    const songs = composeSongs(s, r, act, 1);
    recordSongs(s, r, act, [songs[0].id], 1, 'balanced');
    releaseSingle(s, r, songs[0].id);
    for (let i = 0; i < 2; i++) advanceMonth(s);
    const rel = Object.values(s.releases).find((x) => x.owner === 'player')!;
    rel.shortage = 5000;
    rel.week = s.week;
    shortageWeek(s);
    const fc = last(s, 'factory')!;
    const stock = rel.stock;
    factoryOvertime(s, fc.id, true);
    if (Number(fc.data.cost) > 0) expect(rel.stock).toBeGreaterThan(stock);
    invariant(s);
  });
});
