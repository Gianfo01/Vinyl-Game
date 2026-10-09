// Rodada 11 — bolsa: pregão já existe no 1º dia, carteira do selo, IPO de selos e blocos de NPCs no seu selo.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { ownerOf } from '../src/sim/sys/people/owner';
import { bolsa, buyValue, holders, holdingsOf, listed, OWN, raiders, repelRaider, sellShares } from '../src/sim/sys/bolsa10';
import { money } from '../src/sim/util';
import type { RunConfig } from '../src/sim/types';

const mk = (seed: string, over: Partial<RunConfig> = {}) => createGame(defaultConfig(seed, over));

describe('bolsa r11', () => {
  it('pregão cheio no início em qualquer ano, com histórico e sem empresas do futuro', () => {
    for (const y of [1920, 1935, 1975, 2005, 2030]) {
      const s = mk(`r11-b${y}`, { startYear: y });
      const rows = listed(s);
      expect(rows.length).toBeGreaterThan(2);
      expect(rows.filter((r) => r.q.born < y).every((r) => r.q.hist.length > 6)).toBe(true);
      const ids = rows.map((r) => r.id);
      if (y < 2000) { expect(ids).not.toContain('spotify'); expect(ids).not.toContain('netflix'); expect(ids).not.toContain('alphabet'); }
      if (y >= 1975) expect(ids.some((x) => x.startsWith('lb:'))).toBe(true);
      expect(rows.every((r) => holders(s, r.id).length > 0)).toBe(true);
    }
  });

  it('o selo investe no mesmo mercado com o caixa da empresa', () => {
    const s = mk('r11-co', { startYear: 1990 });
    s.player.cash = money(s, 1_000_000);
    const c0 = s.player.cash;
    const w0 = ownerOf(s).wealth;
    expect(buyValue(s, 'sony', money(s, 50_000), 'c')).toBeNull();
    expect(s.player.cash).toBeLessThan(c0);
    expect(ownerOf(s).wealth).toBe(w0);
    expect(holdingsOf(s, 'c').map((h) => h.id)).toEqual(['sony']);
    expect(holdingsOf(s, 'p').length).toBe(0);
    expect(bolsa(s).cpos.sony.sh).toBeGreaterThan(0);
    expect(sellShares(s, 'sony', 1, 'c')).toBeNull();
    expect(holdingsOf(s, 'c').length).toBe(0);
  });

  it('IPO do seu selo vira ação; rival acumula bloco, há aviso e dá para recomprar', () => {
    const s = mk('r11-own', { startYear: 1990 });
    s.listing = { ...s.listing, listed: true, floatShare: 0.4, price: 500, history: [480, 500] };
    advanceMonth(s);
    expect(listed(s).some((r) => r.id === OWN)).toBe(true);
    const rival = Object.values(s.labels).find((x) => x.active)!;
    rival.cash = money(s, 900_000_000);
    s.rivalries[rival.id] = 80;
    for (let i = 0; i < 24 && !raiders(s).some((x) => x.k === `L:${rival.id}`); i++) advanceMonth(s);
    // garante o cenário mesmo se o sorteio não ajudar
    const own = (bolsa(s).own[OWN] ??= {});
    own[`L:${rival.id}`] = Math.max(own[`L:${rival.id}`] ?? 0, 0.12);
    const r = raiders(s).find((x) => x.k === `L:${rival.id}`)!;
    expect(r.hostile).toBe(true);
    s.player.cash = r.cost + money(s, 1000);
    const f0 = s.listing.floatShare;
    expect(repelRaider(s, r.k)).toBeNull();
    expect(s.listing.floatShare).toBeLessThan(f0);
    expect(bolsa(s).own[OWN][r.k]).toBeUndefined();
  });
});
