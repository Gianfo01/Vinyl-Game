// Rodada 12 — dono de festival (festival unificado, ciclo de edição, cancelamento) e dono de casa de shows.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { advanceMonth } from '../src/sim/tick';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { buyVenue, createFestival, liveOf, placeTile } from '../src/sim/sys/live';
import { foundVenture, ventures } from '../src/sim/sys/ventures9';
import { announce12, ask12, cancelChoice, clashes12, f12, festOf, found12, offer12, openEarly12, proj12, sync12, ventureOf } from '../src/sim/sys/fest12';
import { addNight12, corp, dropNight12, nightEst, v12 } from '../src/sim/sys/venue12';
import type { GameState } from '../src/sim/types';

function withAct(seed: string, fame = 30) {
  const s = createGame(defaultConfig(seed, { startYear: 1985 }));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity, fame });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  act.fans = { casual: 400000, active: 60000, core: 12000 };
  s.player.cash += 50_000_000_00;
  s.player.initialCash += 50_000_000_00;
  return { s, r, act };
}
const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
const guests = (s: GameState, n: number) => Object.values(s.acts).filter((a) => a.owner !== 'player' && (a.status === 'active' || a.status === 'emerging') && a.members.length && a.fame > 5 && a.fame < 40).slice(0, n);

describe('festival unificado', () => {
  it('Empreendimentos e terreno são o mesmo festival', () => {
    const { s } = withAct('r12-uni');
    expect(foundVenture(s, 'festival', 'label')).toBeNull();
    const f0 = createFestival(s, 'Terreno', s.config.homeCity, 5);
    expect('id' in f0).toBe(true);
    sync12(s);
    const fx = ventures(s).list.filter((v) => v.kind === 'festival');
    expect(fx.length).toBe(2);
    expect(liveOf(s).fests.length).toBe(2);
    for (const v of fx) expect(festOf(s, v.fx!)?.name).toBe(v.name);
    invariant(s);
  });

  it('ciclo completo: identidade, contratação, early bird, anúncio, venda em lotes e edição com memória', () => {
    const { s, act } = withAct('r12-loop');
    const f = found12(s, 'label', { name: 'Agulha', month: (s.month + 5) % 12, ident: 'discovery' });
    if ('pt' in f) throw new Error('falhou');
    expect(offer12(s, f.id, act.id, { stage: 0, time: 3, len: 60, excl: false, fee: 0 }).res).toBe('yes');
    let booked = 0;
    for (let x = 0; x < 6; x++) { placeTile(s, f.id, x, 3, 'toilet'); placeTile(s, f.id, x + 6, 3, x % 2 ? 'security' : 'food'); }
    for (const [i, g] of guests(s, 3).entries()) {
      const o = { stage: 0, time: i % 3, len: 45, excl: false };
      if (offer12(s, f.id, g.id, { ...o, fee: ask12(s, f, g, o).fee }).res === 'yes') booked++;
    }
    expect(booked).toBeGreaterThan(0);
    expect(f12(s, f).commits.some((c) => c.kind === 'advance')).toBe(true);
    f.rep = 60;
    expect(openEarly12(s, f.id)).toBeNull();
    advanceMonth(s);
    expect(f12(s, f).cyc.early).toBeGreaterThan(0);
    expect(announce12(s, f.id)).toBeNull();
    expect(proj12(s, f).why.length).toBeGreaterThan(0);
    for (let i = 0; i < 7 && !f12(s, f).hist.length; i++) advanceMonth(s);
    const x = f12(s, f);
    expect(x.hist.length).toBe(1);
    expect(x.hist[0].why.length).toBeGreaterThan(0);
    expect(ventureOf(s, f.id)!.editions!.length).toBe(1);
    expect(f.editions.length).toBe(1);
    expect(x.loyal).toBeGreaterThan(0);
    invariant(s);
  });

  it('dois grandes no mesmo horário frustram; headliner cancela e a troca é paga ou compensada', () => {
    const { s, act } = withAct('r12-cxl', 70);
    const f = found12(s, 'label', { month: (s.month + 6) % 12, ident: 'mega' });
    if ('pt' in f) throw new Error('falhou');
    f.grid[2] = 'stage';
    f.rep = 100;
    const big = Object.values(s.acts).find((a) => a.owner !== 'player' && a.fame >= 60 && a.status !== 'retired' && a.status !== 'split' && a.members.length)!;
    big.fame = Math.max(big.fame, 60);
    expect(offer12(s, f.id, act.id, { stage: 0, time: 3, len: 60, excl: false, fee: 0 }).res).toBe('yes');
    expect(offer12(s, f.id, big.id, { stage: 1, time: 3, len: 60, excl: false, fee: 1e8 }).res).toBe('yes');
    expect(clashes12(s, f).ex).toBeLessThan(0);
    const n = f.lineup.length;
    cancelChoice(s, f.id, big.id, 'promote', '');
    expect(f.lineup.length).toBe(n - 1);
    expect(f12(s, f).cyc.notes.length).toBeGreaterThan(0);
    invariant(s);
  });
});

describe('casa de shows', () => {
  it('noites fixas criam frequentadores; festa corporativa e fim de noite antiga cobram o preço', () => {
    const { s, act } = withAct('r12-venue');
    expect('kind' in buyVenue(s, 'club', s.config.homeCity, 'Porão')).toBe(true);
    expect(addNight12(s, { k: 'residency', day: 'fri', deal: 'door', actId: act.id })).toBeNull();
    expect(addNight12(s, { k: 'original', day: 'thu', deal: 'own' })).toBeNull();
    expect(addNight12(s, { k: 'party', day: 'fri', deal: 'door' })).not.toBeNull();
    const x = v12(s)!;
    const r0 = x.regulars;
    for (let i = 0; i < 6; i++) advanceMonth(s);
    expect(x.regulars).toBeGreaterThan(r0);
    const fri = x.prog.find((n) => n.day === 'fri')!;
    expect(nightEst(s, liveOf(s).venue!, x, fri).att).toBeGreaterThan(0);
    const reg = x.regulars;
    corp(s, 'take', fri.id, 5000);
    expect(x.regulars).toBeLessThan(reg);
    const reg2 = x.regulars;
    dropNight12(s, fri.id);
    expect(x.regulars).toBeLessThanOrEqual(reg2);
    expect(x.notes.length).toBeGreaterThan(0);
    invariant(s);
  });
});
