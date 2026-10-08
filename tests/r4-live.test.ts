// Rodada 4 — sistema "live": notas do show, setlist, show ao vivo, ingressos, festival próprio,
// casa de shows, residência, megaeventos, cenários, desafio da semana, pacote de universo e conquistas.

import { describe, expect, it } from 'vitest';
import { defaultConfig, simulate } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { composeSongs, recordSongs } from '../src/sim/production';
import { advanceMonth } from '../src/sim/tick';
import { planTour } from '../src/sim/tours';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { resolveDecision } from '../src/sim/events';
import type { GameState } from '../src/sim/types';
import {
  ACHIEVEMENTS, INCIDENTS, SCENARIOS, addToLineup, applySetlistOrder, autoLiveEnergy, autoOrder, buyVenue, challengeScore, checkAchievements, createFestival,
  curveFor, festModel, finishLiveShow, liveOf, placeTile, previewShowRevenue, resolveCard, residencyEligible, scenarioConfig, scenarioProgress, scoreCurve,
  setNextGameSetup, startResidency, validatePack, weekKeyOf, weeklyChallenge, SAMPLE_PACK, runEdition, setFestival,
} from '../src/sim/sys/live';

function withAct(seed: string, over = {}, fame = 30) {
  const s = createGame(defaultConfig(seed, over));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity, fame });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  act.fans = { casual: 400000, active: 60000, core: 12000 };
  s.player.cash += 50_000_000_00;
  s.player.initialCash += 50_000_000_00;
  return { s, r, act };
}

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);

describe('live: determinismo e invariante', () => {
  it('mesma seed = mesma história com os ganchos do palco', () => {
    const a = simulate(defaultConfig('live-det'), 2).state;
    const b = simulate(defaultConfig('live-det'), 2).state;
    expect(JSON.stringify(a.x4.live)).toBe(JSON.stringify(b.x4.live));
    expect(a.player.cash).toBe(b.player.cash);
    invariant(a);
  });
});

describe('curva do setlist', () => {
  it('curva ideal pontua mais que uma curva plana e invertida', () => {
    const good = scoreCurve([85, 72, 64, 50, 45, 60, 78, 92, 88]);
    const bad = scoreCurve([30, 35, 40, 90, 95, 92, 40, 35, 30]);
    expect(good.score).toBeGreaterThan(bad.score);
    expect(good.bonus).toBeGreaterThan(0);
    expect(good.bonus).toBeLessThanOrEqual(0.1);
    expect(good.why.length).toBeGreaterThan(0);
  });

  it('ordem automática melhora a ordem pior e grava bônus na turnê', () => {
    const { s, r, act } = withAct('live-set');
    const songs = composeSongs(s, r, act, 10);
    recordSongs(s, r, act, songs.map((x) => x.id), 1, 'balanced');
    const ids = songs.map((x) => x.id);
    const auto = autoOrder(s, ids);
    const worst = [...auto].reverse();
    expect(curveFor(s, auto).score).toBeGreaterThanOrEqual(curveFor(s, worst).score);
    const tour = planTour(s, { actId: act.id, cities: [s.config.homeCity, 'manchester'], startInDays: 10, priceMult: 1, minutes: 45, setlist: ids, production: 1, role: 'headline', crew: 4, pay: 'door' });
    expect('id' in tour).toBe(true);
    if (!('id' in tour)) return;
    const res = applySetlistOrder(s, tour.id, auto);
    expect('score' in res).toBe(true);
    expect(liveOf(s).curves[tour.id]).toBeDefined();
    expect(tour.setlist).toEqual(auto);
  });
});

describe('notas do show e show ao vivo', () => {
  it('cada show da turnê recebe empolgação, intensidade e cansaço; arenas enfileiram a cena', () => {
    const { s, r, act } = withAct('live-notes', {}, 70);
    const songs = composeSongs(s, r, act, 8);
    recordSongs(s, r, act, songs.map((x) => x.id), 1, 'balanced');
    for (const id of act.members) s.persons[id].fatigue = 0;
    const tour = planTour(s, { actId: act.id, cities: [s.config.homeCity, 'manchester', 'liverpool'], startInDays: 7, tier: 3, priceMult: 1, minutes: 60, setlist: songs.map((x) => x.id), production: 2, role: 'headline', crew: 6, pay: 'door' });
    expect('id' in tour).toBe(true);
    if (!('id' in tour)) return;
    for (let i = 0; i < 3; i++) advanceMonth(s);
    const notes = liveOf(s).notes[tour.id] ?? [];
    const played = tour.stops.filter((x) => x.status === 'played').length;
    expect(notes.length).toBe(played);
    for (const n of notes) {
      for (const v of [n.ex, n.int, n.fat]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
    expect(played).toBeGreaterThan(0);
    expect((s.cutscenes ?? []).some((c) => c.kind === 'liveShow')).toBe(true);
    invariant(s);
  });

  it('incidentes e resolução limitam o bônus a +10%', () => {
    const { s, act } = withAct('live-inc');
    expect(INCIDENTS.length).toBeGreaterThanOrEqual(5);
    const card = INCIDENTS[0].cards[0];
    const ok = resolveCard(s, act.id, card, 0);
    const bad = resolveCard(s, act.id, card, 0.999);
    expect(ok.delta).toBeGreaterThan(bad.delta);
    const e = autoLiveEnergy(s, act.id, 60);
    expect(e).toBeGreaterThan(0);
    const fans = act.fans.casual;
    const res = finishLiveShow(s, 'k1', act.id, 10000, 100);
    expect(res?.bonus).toBeCloseTo(0.1);
    expect(act.fans.casual - fans).toBeLessThanOrEqual(10000 * 0.15 + 1);
    expect(finishLiveShow(s, 'k1', act.id, 10000, 100)).toBeNull();
  });
});

describe('ingressos', () => {
  it('VIP e preço dinâmico sobem a bilheteria; meia-entrada reduz no Brasil', () => {
    const { s, act } = withAct('live-tix', { startYear: 2010 });
    const base = previewShowRevenue(s, act.id, 'london', 3, 2, 1_000_000);
    // a presença de palco dos integrantes (atributos, rodada 5) já mexe um pouco na base
    expect(base).toBeGreaterThan(900_000);
    expect(base).toBeLessThan(1_100_000);
    liveOf(s).tickets = { vip: true, dynamic: true };
    expect(previewShowRevenue(s, act.id, 'london', 3, 2, 1_000_000)).toBeGreaterThan(base);
    liveOf(s).tickets = { vip: false, dynamic: false };
    expect(previewShowRevenue(s, act.id, 'sao_paulo', 3, 2, 1_000_000)).toBeLessThan(base);
  });
});

describe('festival próprio', () => {
  it('monta terreno, line-up e roda a edição com caixa, notas e pensamentos', () => {
    const { s, r, act } = withAct('live-fest', { startYear: 1970 });
    const f = createFestival(s, 'Festival Agulha', s.config.homeCity, (s.month + 2) % 12, 2);
    expect('id' in f).toBe(true);
    if (!('id' in f)) return;
    for (let x = 0; x < 4; x++) placeTile(s, f.id, x, 1, 'toilet');
    placeTile(s, f.id, 6, 1, 'security');
    placeTile(s, f.id, 7, 1, 'camp');
    placeTile(s, f.id, 8, 1, 'bar');
    setFestival(s, f.id, { price: 25 });
    expect(addToLineup(s, f.id, act.id)).toBeNull();
    const m = festModel(s, f);
    expect(m.capacity).toBeGreaterThan(0);
    const ed = runEdition(s, r, f);
    expect(ed).not.toBeNull();
    expect(ed!.thoughts.length).toBeGreaterThan(0);
    expect(ed!.rating).toBeGreaterThanOrEqual(0);
    expect(f.editions.length).toBe(1);
    invariant(s);
  });

  it('sem segurança a nota de segurança despenca; sem palco a edição é cancelada', () => {
    const { s, r, act } = withAct('live-fest2', { startYear: 1990 });
    const f = createFestival(s, 'Sem Estrutura', s.config.homeCity, 6);
    if (!('id' in f)) throw new Error('falhou');
    addToLineup(s, f.id, act.id);
    expect(festModel(s, f).safety).toBeLessThan(40);
    placeTile(s, f.id, 5, 0, '');
    expect(runEdition(s, r, f)).toBeNull();
    invariant(s);
  });
});

describe('casa de shows, residência e megaevento', () => {
  it('casa própria rende por mês e conta como conquista', () => {
    const { s } = withAct('live-venue', { startYear: 1980 });
    const v = buyVenue(s, 'theater', s.config.homeCity, 'Teatro Agulha');
    expect('kind' in v).toBe(true);
    const before = s.player.totals.live ?? 0;
    advanceMonth(s);
    expect((s.player.totals.live ?? 0)).toBeGreaterThan(before);
    expect(liveOf(s).venue!.history.length).toBe(1);
    checkAchievements(s);
    expect(liveOf(s).ach.venue).toBeDefined();
    invariant(s);
  });

  it('residência para veteranos ocupa capacidade e paga todo mês', () => {
    const { s, act } = withAct('live-res', { startYear: 1980 }, 50);
    act.debutYear = s.year - 20;
    expect(residencyEligible(s, act)).toBeNull();
    const res = startResidency(s, act.id, 3);
    expect('id' in res).toBe(true);
    expect(s.plans.some((p) => p.action === 'residency' && p.actId === act.id)).toBe(true);
    advanceMonth(s);
    advanceMonth(s);
    if ('id' in res) expect(res.earned).toBeGreaterThan(0);
    invariant(s);
  });

  it('megaevento de 1985 convida o ato mais famoso; aceitar dá impulso ao catálogo', () => {
    const { s, act } = withAct('live-mega', { startYear: 1985 }, 60);
    for (let i = 0; i < 6; i++) advanceMonth(s);
    const lv = liveOf(s);
    expect(lv.mega.some((x) => x.year === 1985)).toBe(true);
    const d = s.decisions.find((x) => x.eventId === 'live_mega_benefit');
    expect(d).toBeDefined();
    if (d) {
      resolveDecision(s, d.id, 'accept');
      expect(lv.boosts[act.id]).toBeGreaterThan(s.week);
    }
    invariant(s);
  });
});

describe('cenários, desafio e universo', () => {
  it('cenário prepara o mundo, mede a meta e dá medalha no prazo', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(10);
    const def = SCENARIOS.find((x) => x.id === 'soul_1972')!;
    setNextGameSetup({ scenarioId: def.id });
    const s = createGame(scenarioConfig(def, defaultConfig('live-scen')));
    expect(s.year).toBe(1972);
    const run = liveOf(s).scenario!;
    expect(run.id).toBe('soul_1972');
    expect(Object.values(s.acts).filter((a) => a.owner === 'player').length).toBeGreaterThanOrEqual(2);
    invariant(s);
    run.endYear = s.year;
    for (let i = 0; i < 12 && !run.done; i++) advanceMonth(s);
    expect(run.done).toBeDefined();
    expect(scenarioProgress(s)?.medal).toBe(run.done!.medal);
    expect((s.cutscenes ?? []).some((c) => c.kind === 'scenarioResult')).toBe(true);
    // a configuração não vaza para a próxima partida
    const s2 = createGame(defaultConfig('live-scen-2'));
    expect(liveOf(s2).scenario).toBeNull();
  });

  it('desafio da semana: mesma semana, mesmas regras', () => {
    expect(weekKeyOf(new Date(2026, 9, 8))).toBe('2026-W41');
    const a = weeklyChallenge('2026-W41', defaultConfig('x'));
    const b = weeklyChallenge('2026-W41', defaultConfig('y'));
    const c = weeklyChallenge('2026-W42', defaultConfig('x'));
    expect(a.cfg).toEqual({ ...b.cfg, companyName: a.cfg.companyName });
    expect(a.cfg.seed).not.toBe(c.cfg.seed);
    setNextGameSetup({ challenge: { code: a.code, week: '2026-W41', years: 8, rules: a.rules } });
    const s = createGame(a.cfg);
    expect(liveOf(s).challenge?.endYear).toBe(s.year + 7);
    expect(challengeScore(s)).toBeGreaterThanOrEqual(0);
  });

  it('pacote de universo: valida, aplica no newgame e dispara eventos com caixa via post', () => {
    expect('pt' in (validatePack({}) as object)).toBe(true);
    const pack = validatePack({ ...SAMPLE_PACK, acts: [...SAMPLE_PACK.acts, { name: 'Banda Própria', genre: 'rnr', city: 'london', members: 4, fame: 20, signed: true }], events: [{ year: 1960, month: 0, title: { pt: 'Bônus', en: 'Bonus' }, text: 'x', cash: 1000 }] });
    if ('pt' in pack) throw new Error(pack.pt);
    setNextGameSetup({ pack });
    const s = createGame(defaultConfig('live-pack'));
    expect(Object.values(s.labels).some((x) => x.name === 'Mangue Discos')).toBe(true);
    expect(Object.values(s.acts).some((x) => x.name === 'Banda Própria' && x.owner === 'player')).toBe(true);
    advanceMonth(s);
    expect(liveOf(s).events[0].fired).toBe(true);
    invariant(s);
  });

  it('conquistas têm ids únicos e algumas escondidas', () => {
    expect(new Set(ACHIEVEMENTS.map((x) => x.id)).size).toBe(ACHIEVEMENTS.length);
    expect(ACHIEVEMENTS.filter((x) => x.hidden).length).toBeGreaterThanOrEqual(3);
  });
});
