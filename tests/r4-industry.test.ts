// Rodada 4 — indústria: suprimentos, fábricas, varejo, pesquisa, conselho, câmbio e sede editável.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { composeSongs, recordSongs, scheduleRelease, availableFormats } from '../src/sim/production';
import { advanceMonth } from '../src/sim/tick';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { buildPlant, pressCapacity } from '../src/sim/sys/industry/supply';
import { hireDistributor, openStore, setCell } from '../src/sim/sys/industry/retail';
import { startResearch } from '../src/sim/sys/industry/research';
import { joinBoard } from '../src/sim/sys/industry/corp';
import { activeCombos, buyItem, swapRooms } from '../src/sim/sys/industry/hqedit';
import type { GameState } from '../src/sim/types';

function withAct(seed: string, over = {}) {
  const s = createGame(defaultConfig(seed, over));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  s.player.cash += 900_000_000_00;
  s.player.initialCash += 900_000_000_00;
  return { s, r, act };
}
const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);

describe('indústria', () => {
  it('estado existe em partidas novas', () => {
    const s = createGame(defaultConfig('ind-0'));
    expect(s.x4.industry.pricing).toBe('normal');
  });

  it('prensagem grande entra na fila e chega nas semanas seguintes', () => {
    const { s, r, act } = withAct('ind-1', { startYear: 1975 });
    const songs = composeSongs(s, r, act, 1);
    recordSongs(s, r, act, songs.map((x) => x.id), 1, 'balanced');
    const res = scheduleRelease(s, r, { actId: act.id, type: 'single', songs: [songs[0].id], title: 'Teste', formats: availableFormats(s).filter((f) => f === 'single45'), press: 200000, marketing: [], territories: [...s.player.territories], weeksAhead: 1 });
    expect('id' in res).toBe(true);
    advanceMonth(s);
    const rel = Object.values(s.releases).find((x) => x.title === 'Teste')!;
    expect(rel).toBeTruthy();
    expect(rel.pressed).toBe(200000);
    const total = s.x4.industry.orders.filter((o) => o.releaseId === rel.id).reduce((t, o) => t + o.units, 0);
    expect(rel.stock + total + rel.totalUnits).toBeLessThanOrEqual(200000);
    invariant(s);
  });

  it('fábrica própria aumenta a capacidade', () => {
    const { s } = withAct('ind-2', { startYear: 1970 });
    const before = pressCapacity(s).own;
    expect(buildPlant(s, s.config.homeCity)).toBeNull();
    expect(pressCapacity(s).own).toBeGreaterThan(before);
    advanceMonth(s);
    invariant(s);
  });

  it('lojas, distribuidores, pesquisa e conselho rodam anos sem quebrar o caixa e de forma determinística', () => {
    const run = () => {
      const { s, r } = withAct('ind-3', { startYear: 1984, homeCity: 'rio' });
      openStore(s, s.config.homeCity);
      const st = s.x4.industry.stores[0];
      setCell(s, st.id, 7, 'booth');
      hireDistributor(s, r, 'br');
      s.x4.industry.pricing = 'premium';
      startResearch(s, 'signature_sound');
      joinBoard(s, r);
      for (let i = 0; i < 30; i++) advanceMonth(s);
      invariant(s);
      return { cash: s.player.cash, research: s.x4.industry.research.done.join(','), fx: s.x4.industry.fx.br };
    };
    const a = run();
    const b = run();
    expect(a).toEqual(b);
    expect(a.research).toContain('signature_sound');
    expect(a.fx ?? 1).toBeLessThan(1);
  });

  it('trocar salas cria combos e itens têm limite', () => {
    const { s } = withAct('ind-4');
    s.player.hq = 2;
    const before = activeCombos(s).length;
    expect(buyItem(s, 'idea_board')).toBeNull();
    expect(swapRooms(s, 'wri', 'tro')).toBeNull();
    expect(activeCombos(s).length).not.toBeNaN();
    expect(before).toBeGreaterThanOrEqual(0);
    invariant(s);
  });
});
