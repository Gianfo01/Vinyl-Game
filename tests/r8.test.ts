// Rodada 8 — correções do início personalizado, paradas preenchidas no início, ficha do disco, capas,
// festivais com line-up e negociação, premiações com indicados e campanha, críticos regionais e peso
// mundial dos países.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { board } from '../src/sim/sys/charts7';
import { criticScore, trackList } from '../src/sim/relinfo';
import { coverOptions, coverById } from '../src/sim/covers';
import { scheduleRelease, unreleasedRecorded } from '../src/sim/production';
import { FESTIVALS } from '../src/data/catalog';
import { acceptInvite, editionOf, fest8, festFee, festTierFor, pitchAct } from '../src/sim/sys/fests8';
import { cer8, nominees, runCampaign } from '../src/sim/sys/ceremonies8';
import { activeCritics, reviewRelease } from '../src/sim/media';
import { criticAction, relWith } from '../src/sim/criticrel';
import { reachMult } from '../src/sim/sys/relevance8';
import { localPref, softPower } from '../src/data/relevance';
import { instrumentsOf } from '../src/sim/sys/instruments';
import { playerActs, rngOf } from '../src/sim/util';
import type { GameState, RunConfig } from '../src/sim/types';

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
const mk = (seed: string, over: Partial<RunConfig> = {}) => createGame(defaultConfig(seed, over));

describe('início e correções', () => {
  it('caixa personalizado é o valor exato da tela e os atos contratados entram em qualquer papel', () => {
    const s = mk('r8-cash', { role: 'artist', startYear: 1962, custom: { cash: 200000, roster: 3 } });
    expect(s.player.cash).toBe(200000 * 100);
    expect(playerActs(s).length).toBe(4);
    invariant(s);
  });

  it('ninguém toca instrumento sem nome', () => {
    const s = mk('r8-inst', { startYear: 1980 });
    for (const p of Object.values(s.persons).slice(0, 400)) for (const x of instrumentsOf(s, p)) expect(x.id).toBeTruthy();
  });

  it('paradas já começam preenchidas (mundo e países)', () => {
    const s = mk('r8-warm', { startYear: 1975, realNames: true, mode: 'historic' });
    expect(s.charts.singles.length).toBeGreaterThan(10);
    expect(board(s, 'USA', 'songs').length).toBeGreaterThan(5);
    expect(board(s, 'BRA', 'albums').length).toBeGreaterThan(0);
    invariant(s);
  });

  it('ficha do disco: faixas com duração (até de discos antes da run) e nota da crítica', () => {
    const s = mk('r8-rel', { startYear: 1985, realNames: true, mode: 'historic' });
    const hist = Object.values(s.releases).find((r) => r.hist && r.type === 'lp')!;
    const tl = trackList(s, hist);
    expect(tl.length).toBeGreaterThanOrEqual(8);
    expect(tl[0].title).toBe(hist.title);
    expect(tl.every((x) => x.secs > 60)).toBe(true);
    const cs = criticScore(s, hist);
    expect(cs.score).toBeGreaterThan(0);
    expect(cs.estimated).toBe(true);
  });
});

describe('capas', () => {
  it('três propostas com estilos diferentes; a escolhida vai para o lançamento e cobra o custo', () => {
    const s = mk('r8-cover', { role: 'artist', startYear: 1990 });
    const band = s.acts[s.player.bandActId!];
    const opts = coverOptions(s, band.id);
    expect(opts.length).toBe(3);
    expect(new Set(opts.map((o) => o.style)).size).toBe(3);
    s.agenda[band.id] = [{ action: 'compose', params: { week: 1 } }, { action: 'compose', params: { week: 2 } }, { action: 'record', params: { week: 3, tier: 1, approach: 'balanced' } }];
    s.delegated[band.id] = false;
    for (let i = 0; i < 3 && !unreleasedRecorded(s, band).length; i++) advanceMonth(s);
    const ready = unreleasedRecorded(s, band);
    if (!ready.length) return;
    const cash0 = s.player.cash;
    const pr = scheduleRelease(s, rngOf(s), { actId: band.id, type: 'single', songs: [ready[0].id], formats: ['streaming', 'download', 'cd'].filter(() => true) as never, press: 0, marketing: [], territories: [...s.player.territories], weeksAhead: 1, cover: { ...opts[1] } });
    expect('id' in pr).toBe(true);
    expect(s.player.cash).toBeLessThan(cash0);
    advanceMonth(s);
    const rel = Object.values(s.releases).find((r) => r.actId === band.id && !r.hist && r.coverChoice);
    if (rel) {
      expect(rel.coverChoice).toBe(opts[1].style);
      expect(coverById[rel.coverChoice as never]).toBeTruthy();
    }
    invariant(s);
  });
});

describe('festivais', () => {
  it('line-up do ano, negociação na hora, convite aceito e cachê na data', () => {
    const s = mk('r8-fest', { startYear: 1975, scenario: 'established', realNames: true, mode: 'historic' });
    const st = fest8(s);
    expect(st.editions.length).toBeGreaterThan(5);
    const big = st.editions.find((e) => e.lineup.length >= 5)!;
    expect(big.lineup.some((x) => x.tier === 'headline')).toBe(true);
    // nosso artista mais famoso, num festival que combina e ainda vai acontecer
    const act = playerActs(s).map((id) => s.acts[id]).sort((a, b) => b.fame - a.fame)[0];
    act.fame = 60;
    const target = st.editions.find((e) => !e.done && e.month > s.month + 1 && festTierFor(s, FESTIVALS[e.fi], e.fi, act));
    if (target) {
      const f = FESTIVALS[target.fi];
      const tier = festTierFor(s, f, target.fi, act)!;
      const res = pitchAct(s, rngOf(s), target.fi, act.id, 'headline', festFee(s, f, act, 'headline') * 3);
      expect(['accepted', 'counter', 'rejected']).toContain(res.result);
      const ok = pitchAct(s, rngOf(s), target.fi, act.id, tier, festFee(s, f, act, tier));
      if (ok.result === 'accepted') expect(editionOf(s, target.fi)!.lineup.some((x) => x.actId === act.id)).toBe(true);
      // convite manual
      st.invites.push({ id: 'fi-test', fi: target.fi, actId: playerActs(s)[1] ?? act.id, tier: 'opening', fee: 100, expires: s.week + 4 });
      expect(acceptInvite(s, 'fi-test')).toBeNull();
      const fest0 = s.player.stats.festivals;
      for (let i = 0; i < 12 && !editionOf(s, target.fi)?.done; i++) advanceMonth(s);
      if (editionOf(s, target.fi)?.lineup.some((x) => playerActs(s).includes(x.actId))) expect(s.player.stats.festivals).toBeGreaterThan(fest0);
      expect(st.past[target.fi]?.length ?? 0).toBeGreaterThan(0);
    }
    invariant(s);
  });
});

describe('premiações', () => {
  it('indicados saem em outubro, campanha custa e soma pontos; a cerimônia escolhe entre os indicados', () => {
    const s = mk('r8-cer', { startYear: 1990, scenario: 'established' });
    while (s.month <= 9) advanceMonth(s);
    expect(cer8(s).noms?.year).toBe(s.year);
    const recs = nominees(s, 'record') ?? [];
    expect(recs.length).toBeGreaterThan(0);
    const mine = Object.values(s.releases).find((r) => r.owner === 'player' && r.year === s.year && r.totalUnits > 0 && !r.hist);
    if (mine) {
      const cash0 = s.player.cash;
      const err = runCampaign(s, rngOf(s), mine.id, 'performance', 1);
      if (!err) expect(s.player.cash).toBeLessThan(cash0);
    }
    const year = s.year;
    while (s.year === year) advanceMonth(s);
    const won = s.awards.filter((a) => a.year === year && a.category === 'record');
    if (won.length && recs.length) expect(recs).toContain(won[0].releaseId);
    invariant(s);
  });
});

describe('críticos regionais', () => {
  it('cada região tem críticos; resenhas puxam críticos da casa; relação pesa', () => {
    const s = mk('r8-crit', { startYear: 1995, homeCity: 'rio', scenario: 'established' });
    const regions = new Set(activeCritics(s).map((c) => c.region));
    for (const m of ['br', 'na', 'eu', 'latam', 'asia', 'africa', 'oceania']) expect(regions.has(m as never)).toBe(true);
    const act = Object.values(s.acts).find((a) => a.city === 'rio' && a.status === 'active')!;
    const rel = Object.values(s.releases).find((r) => r.actId === act?.id) ?? Object.values(s.releases)[0];
    let br = 0;
    for (let i = 0; i < 10; i++) { delete s.reviews[rel.id]; br += reviewRelease(s, rngOf(s), rel).filter((x) => activeCritics(s).find((c) => c.name === x.critic)?.region === 'br').length; }
    if (act) expect(br).toBeGreaterThan(0);
    const name = activeCritics(s)[0].name;
    expect(criticAction(s, rngOf(s), name, 'advance')).toBeNull();
    expect(relWith(s, name)).toBeGreaterThan(0);
    expect(criticAction(s, rngOf(s), name, 'advance')).not.toBeNull(); // cedo demais
    invariant(s);
  });
});

describe('peso mundial dos países', () => {
  it('artista brasileiro domina em casa mas viaja menos que um americano', () => {
    expect(softPower('USA', 1990)).toBeGreaterThan(softPower('BRA', 1990));
    expect(softPower('KOR', 2020)).toBeGreaterThan(softPower('KOR', 1995));
    expect(localPref('BRA')).toBeGreaterThan(localPref('USA'));
    const s = mk('r8-rel8', { startYear: 1990, realNames: true, mode: 'historic' });
    const br = Object.values(s.acts).find((a) => a.city === 'rio' || a.city === 'sao_paulo')!;
    const us = Object.values(s.acts).find((a) => a.city === 'new_york' || a.city === 'los_angeles')!;
    const rel = (actId: string, territories: string[]) => ({ ...Object.values(s.releases)[0], actId, territories } as never);
    const brWorld = reachMult(s, rel(br.id, ['br', 'na', 'eu', 'latam', 'asia'])).mult;
    const usWorld = reachMult(s, rel(us.id, ['br', 'na', 'eu', 'latam', 'asia'])).mult;
    const brHome = reachMult(s, rel(br.id, ['br'])).mult;
    expect(usWorld).toBeGreaterThan(brWorld);
    expect(brHome).toBeGreaterThan(1);
  });
});
