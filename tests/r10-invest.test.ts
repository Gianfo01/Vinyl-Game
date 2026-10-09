// Rodada 10 — bolsa de valores (ações avulsas ligadas ao mundo do jogo) e aluguel só de imóveis próprios.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { ownerOf } from '../src/sim/sys/people/owner';
import { bolsa, buyShares, buyValue, holdingsOf, listed, sellShares, sharesOf } from '../src/sim/sys/bolsa10';
import { buyGood, goods, netWorth, rentOf, setLet } from '../src/sim/sys/goods8';
import { money } from '../src/sim/util';
import type { GameState, RunConfig } from '../src/sim/types';

const mk = (seed: string, over: Partial<RunConfig> = {}) => createGame(defaultConfig(seed, over));
const rich = (s: GameState) => { ownerOf(s).wealth = money(s, 5_000_000); };
const names = (s: GameState) => listed(s).map((r) => r.id);

describe('bolsa: só o que existe na época', () => {
  it('1960 não tem streaming nem selos fundidos depois; 2022 não tem jukebox de 1950', () => {
    const s = mk('r10-b1', { startYear: 1960 });
    advanceMonth(s);
    const ids = names(s);
    expect(ids).toContain('rca');
    expect(ids).toContain('sony');
    expect(ids).not.toContain('spotify');
    expect(ids).not.toContain('timewarner');
    const s2 = mk('r10-b2', { startYear: 2022 });
    advanceMonth(s2);
    const ids2 = names(s2);
    expect(ids2).not.toContain('seeburg');
    expect(ids2).not.toContain('rca');
    expect(ids2).toContain('alphabet');
  });

  it('preços andam, têm histórico e os nomes mudam sem nomes reais', () => {
    const s = mk('r10-b3', { startYear: 1990, realNames: false });
    for (let i = 0; i < 6; i++) advanceMonth(s);
    const rows = listed(s);
    expect(rows.length).toBeGreaterThan(8);
    expect(rows.every((r) => r.q.p >= 100 && r.q.hist.length >= 2)).toBe(true);
    expect(rows.some((r) => r.name === 'Sony')).toBe(false);
  });
});

describe('negociar ações', () => {
  it('compra, vende com corretagem e entra no patrimônio líquido', () => {
    const s = mk('r10-t1', { startYear: 1990 });
    rich(s);
    advanceMonth(s);
    const w0 = ownerOf(s).wealth;
    const nw0 = netWorth(s);
    expect(buyValue(s, 'sony', money(s, 10_000))).toBeNull();
    expect(ownerOf(s).wealth).toBeLessThan(w0);
    expect(holdingsOf(s).length).toBe(1);
    expect(netWorth(s)).toBeLessThanOrEqual(nw0);
    expect(netWorth(s)).toBeGreaterThan(nw0 - money(s, 200));
    expect(sellShares(s, 'sony', 1)).toBeNull();
    expect(holdingsOf(s).length).toBe(0);
    expect(buyShares(s, 'spotify', 10)).not.toBeNull();
  });

  it('selo rival: teto de participação; fechamento zera a ação e quita a posição', () => {
    const s = mk('r10-t2', { startYear: 1990 });
    rich(s);
    advanceMonth(s);
    ownerOf(s).wealth = money(s, 900_000_000);
    const id = names(s).find((x) => x.startsWith('lb:'));
    expect(id).toBeTruthy();
    const q = bolsa(s).q[id!];
    expect(buyShares(s, id!, sharesOf(s, id!) * 0.3)).not.toBeNull();
    expect(buyShares(s, id!, Math.floor(sharesOf(s, id!) * 0.06))).toBeNull();
    const lb = s.labels[id!.slice(3)];
    const w0 = ownerOf(s).wealth;
    lb.active = false;
    lb.closedYear = s.year;
    advanceMonth(s);
    expect(q.dead?.kind).toBe('bankrupt');
    expect(holdingsOf(s).length).toBe(0);
    expect(ownerOf(s).wealth).toBeGreaterThanOrEqual(w0);
  });
});

describe('imóveis: aluguel só do que você possui', () => {
  it('sem imóvel não há aluguel nem como alugar', () => {
    const s = mk('r10-p1', { startYear: 1970 });
    rich(s);
    expect(setLet(s, 'g999', true)).not.toBeNull();
    for (let i = 0; i < 3; i++) advanceMonth(s);
    expect(goods(s).owned.length).toBe(0);
  });

  it('com imóvel: aluga e rende', () => {
    const s = mk('r10-p2', { startYear: 1990 });
    rich(s);
    expect(buyGood(s, 'flat_london')).toBeNull();
    const it = goods(s).owned[0];
    expect(rentOf(s, it)).toBeGreaterThan(0);
    expect(setLet(s, it.uid, true)).toBeNull();
    for (let i = 0; i < 18; i++) advanceMonth(s);
    expect(it.rented ?? 0).toBeGreaterThan(0);
    expect(setLet(s, it.uid, false)).toBeNull();
  });

  it('saves antigos: imóveis para alugar viram um bem alugado pelo valor justo', () => {
    const s = mk('r10-p3', { startYear: 1990 });
    const st = goods(s);
    (st.inv as Record<string, { principal: number; value: number }>).realestate = { principal: 100_000, value: 123_456 };
    const again = goods(s);
    expect((again.inv as Record<string, unknown>).realestate).toBeUndefined();
    const legacy = again.owned.find((x) => x.id === 'legacy_rentals');
    expect(legacy?.value).toBe(123_456);
    expect(legacy?.let).toBe(true);
  });
});
