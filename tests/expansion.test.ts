// Invariantes dos sistemas da expansão (GDD §27, §46.8).

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { composeSongs, recordSongs } from '../src/sim/production';
import { advanceMonth, advanceWeek } from '../src/sim/tick';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { cancelPlan, checkCapacity, monthIndex, reservePlan } from '../src/sim/capacity';
import { setSplits } from '../src/sim/finance';
import { assignAct, foundSubLabel, transferToSub } from '../src/sim/sublabels';
import { resolveTake, startSession } from '../src/sim/studio';
import { cancelTour, planTour } from '../src/sim/tours';
import { planRollout } from '../src/sim/rollout';
import { negotiateImageRights, startHologramShow } from '../src/sim/neural';
import { personDies } from '../src/sim/dynasty';
import { startAuction } from '../src/sim/discovery';
import { l } from '../src/data/world';
import type { GameState } from '../src/sim/types';

function withAct(seed: string, over = {}) {
  const s = createGame(defaultConfig(seed, over));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  s.player.cash += 5_000_000_00;
  s.player.initialCash += 5_000_000_00;
  return { s, r, act };
}

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);

describe('tempo', () => {
  it('avançar semana a semana dá o mesmo resultado que avançar o mês', () => {
    const a = createGame(defaultConfig('wk-1'));
    const b = createGame(defaultConfig('wk-1'));
    for (let i = 0; i < 3; i++) advanceMonth(a);
    let months = 0;
    while (months < 3) if (advanceWeek(b)) months++;
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });
});

describe('capacidade', () => {
  it('reserva futura não cobra, respeita 100% e cancelar libera', () => {
    const { s, act } = withAct('cap-1');
    const cash = s.player.cash;
    const now = monthIndex(s);
    const p1 = reservePlan(s, act.id, 'residency_art', now + 2);
    expect('id' in p1).toBe(true);
    expect(s.player.cash).toBe(cash);
    const p2 = reservePlan(s, act.id, 'side_job', now + 2);
    expect('pt' in p2).toBe(true); // 75% + 75% > 100%
    if ('id' in p1) cancelPlan(s, p1.id);
    expect(checkCapacity(s, act.members, now + 2, 1, 75)).toBeNull();
  });
});

describe('autoria', () => {
  it('participações precisam somar 100%', () => {
    const { s, r, act } = withAct('split-1');
    const [song] = composeSongs(s, r, act, 1);
    expect(setSplits(s, song.id, [{ personId: act.members[0], share: 0.6 }])).not.toBeNull();
    expect(setSplits(s, song.id, [{ personId: act.members[0], share: 0.6 }, { personId: 'outro', share: 0.4 }])).toBeNull();
  });
});

describe('subselos', () => {
  it('aporte é transferência (não receita) e o extrato da matriz fecha', () => {
    const { s, r, act } = withAct('sub-1');
    s.player.hq = 2;
    const sub = foundSubLabel(s, r, 'Selo Filho', act.genre, 1_000_000, 'catalog');
    expect('id' in sub).toBe(true);
    if (!('id' in sub)) return;
    expect(transferToSub(s, sub.id, 500_000)).toBeNull();
    expect(assignAct(s, sub.id, act.id)).toBeNull();
    for (let i = 0; i < 6; i++) advanceMonth(s);
    invariant(s);
    expect(sub.log.length).toBeGreaterThan(0);
  });
});

describe('estúdio', () => {
  it('sessão grava por takes ao longo dos dias', () => {
    const { s, r, act } = withAct('studio-1');
    s.delegated[act.id] = false;
    const songs = composeSongs(s, r, act, 2);
    const sess = startSession(s, act.id, songs.map((x) => x.id), 1, 'balanced');
    expect('id' in sess).toBe(true);
    if (!('id' in sess)) return;
    for (let i = 0; i < 2; i++) {
      advanceWeek(s);
      if (sess.decision) resolveTake(s, r, sess.id, 'keep');
    }
    advanceMonth(s);
    expect(songs.every((x) => s.songs[x.id].recorded)).toBe(true);
    invariant(s);
  });
});

describe('turnê', () => {
  it('cancelar devolve metade da logística não executada', () => {
    const { s, act } = withAct('tour-1');
    act.fans = { casual: 50000, active: 8000, core: 1500 };
    const before = s.player.cash;
    const t = planTour(s, { actId: act.id, cities: [s.config.homeCity, 'london', 'paris'], startInDays: 30, priceMult: 1, minutes: 60, setlist: [], production: 1, role: 'headline', crew: 4, pay: 'door' });
    expect('id' in t).toBe(true);
    if (!('id' in t)) return;
    const spent = before - s.player.cash;
    cancelTour(s, t.id);
    expect(before - s.player.cash).toBe(spent - Math.round(spent * 0.5));
    invariant(s);
  });
});

describe('rollout', () => {
  it('exige ao menos 6 faixas e no máximo 3 singles', () => {
    const { s, r, act } = withAct('ro-1', { startYear: 2015 });
    const songs = composeSongs(s, r, act, 7);
    recordSongs(s, r, act, songs.map((x) => x.id), 1, 'balanced');
    const ids = songs.map((x) => x.id);
    expect('pt' in planRollout(s, { actId: act.id, title: 'X', albumSongs: ids.slice(0, 4), singles: [], teaser: false, presave: false, video: false, deluxeSongs: [], limitedUnits: 0, budget: 0 })).toBe(true);
    const ok = planRollout(s, { actId: act.id, title: 'Disco', albumSongs: ids.slice(0, 6), singles: ids.slice(0, 2), teaser: true, presave: true, video: true, deluxeSongs: ids.slice(6), limitedUnits: 500, budget: 100000 });
    expect('id' in ok).toBe(true);
    for (let i = 0; i < 12; i++) advanceMonth(s);
    expect(Object.values(s.releases).some((x) => x.actId === act.id && x.type === 'lp')).toBe(true);
    invariant(s);
  });
});

describe('neural', () => {
  it('holograma autorizado exige direitos do espólio', () => {
    const { s, r, act } = withAct('holo-1', { startYear: 2034, scenario: 'established' });
    s.techDates.hologram = 2030;
    act.fame = 60;
    const p = s.persons[act.members[0]];
    personDies(s, p, l('causas naturais'));
    expect('pt' in startHologramShow(s, r, p.id, 6, true)).toBe(true);
    let res;
    for (let i = 0; i < 20 && s.imageRights[p.id].holder !== 'player'; i++) res = negotiateImageRights(s, r, p.id, s.imageRights[p.id].feeAsk * 2);
    void res;
    expect(s.imageRights[p.id].holder).toBe('player');
    expect('id' in startHologramShow(s, r, p.id, 6, true)).toBe(true);
    for (let i = 0; i < 3; i++) advanceMonth(s);
    invariant(s);
  });
});

describe('leilão', () => {
  it('leilão termina com um vencedor e o extrato fecha', () => {
    const { s, r } = withAct('auc-1');
    const target = spawnProceduralAct(s, r, { city: s.config.homeCity });
    target.fame = 20;
    const au = startAuction(s, r, target.id, 500_000, 0.16);
    expect('id' in au).toBe(true);
    for (let i = 0; i < 2; i++) advanceMonth(s);
    if ('id' in au) expect(['won', 'lost']).toContain(au.status);
    invariant(s);
  });
});
