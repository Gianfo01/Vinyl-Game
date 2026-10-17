// R33 · POL33-A — outdoors espalhados, aluguel e compra (exp33.pol.outdoors) e anúncio de rádio e TV: desligado nada nasce nem
// muda; ligado o aluguel cobra, dá hype no alvo e ocupa o ponto, a compra rende renda mês a mês e a venda devolve 80%.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import type { GameState } from '../src/sim/types';
import { setSw, switchDef } from '../src/sim/r31/switches';
import { hy } from '../src/sim/sys/hype12';
import {
  SITES33, SW_OUT33, boards33, buyAir33, buySite33, buyPrice33, outOn, peek33o, rentOf33, rentSite33, sellSite33, sellPrice33, site33, slot33, sitesNow33, target33, targets33,
} from '../src/sim/r33/outdoor33';
import { LOTS18 } from '../src/sim/sys/campus18';

const game = (seed: string, year = 1962): GameState => createGame(defaultConfig(seed, { scenario: 'established', startYear: year, dbSize: 'small', homeCity: 'london' } as Parameters<typeof defaultConfig>[1]));
/** um ponto livre agora (nem marca nem você) */
const freeSite = (s: GameState): string => SITES33.find((x) => s.year >= x.from && slot33(s, x).who === 'free')!.id;

describe('R33 POL33-A · outdoors', () => {
  it('nasce ligado; desligado: nada de estado, sem pontos no mapa e a ação trava com motivo', () => {
    expect(switchDef(SW_OUT33)?.def).toBe(true);
    const s = game('ob-off');
    setSw(s, SW_OUT33, false);
    expect(outOn(s)).toBe(false);
    expect(boards33(s, new Set(SITES33.map((x) => `fl:${x.lot}`)))).toEqual([]);
    expect(rentSite33(s, 'avenida', 1)).toBeTruthy();
    advanceMonth(s);
    expect(peek33o(s)).toBeUndefined();
  });

  it('18+ pontos espalhados, em lotes diferentes e que existem no mapa', () => {
    expect(SITES33.length).toBeGreaterThanOrEqual(18);
    expect(new Set(SITES33.map((x) => x.lot)).size).toBe(SITES33.length);
    for (const x of SITES33) expect(LOTS18[x.lot], x.id).toBeTruthy();
    const zonas = new Set(SITES33.map((x) => Math.floor(LOTS18[x.lot].gx / 11) + 10 * Math.floor(LOTS18[x.lot].gy / 9)));
    expect(zonas.size).toBeGreaterThanOrEqual(6);
    const s = game('ob-sites');
    expect(sitesNow33(s).length).toBeGreaterThan(8);
  });

  it('alugar: cobra à vista, dá hype ao alvo, ocupa o ponto e não aluga duas vezes', () => {
    const s = game('ob-rent');
    setSw(s, SW_OUT33, true);
    expect(targets33(s).length).toBeGreaterThan(0);
    const t = target33(s)!, id = freeSite(s), cash = s.player.cash;
    const before = Object.values(hy(s).e).reduce((n, e) => n + e.s.length, 0);
    expect(rentSite33(s, id, 3)).toBeNull();
    expect(s.player.cash).toBeLessThan(cash);
    expect(rentOf33(s, id)?.actId).toBe(t.actId);
    expect(Object.values(hy(s).e).reduce((n, e) => n + e.s.length, 0)).toBeGreaterThanOrEqual(before);
    expect(slot33(s, site33(id)!).who).toBe('player');
    expect(rentSite33(s, id, 1)).toBeTruthy();
  });

  it('comprar: preço 60× o aluguel, renda quando uma marca ocupa, vender devolve 80%', () => {
    const s = game('ob-buy');
    setSw(s, SW_OUT33, true);
    s.player.cash = 5e9;
    const x = SITES33.find((q) => slot33(s, q).who !== 'player')!;
    const c0 = s.player.cash;
    expect(buySite33(s, x.id)).toBeNull();
    expect(c0 - s.player.cash).toBe(buyPrice33(s, x));
    expect(buySite33(s, x.id)).toBeTruthy();
    for (let i = 0; i < 12; i++) advanceMonth(s);
    expect(peek33o(s)!.own[x.id].income).toBeGreaterThan(0);
    const c1 = s.player.cash;
    expect(sellSite33(s, x.id)).toBeNull();
    expect(s.player.cash - c1).toBe(sellPrice33(s, x));
    expect(sellPrice33(s, x)).toBe(Math.round(buyPrice33(s, x) * 0.8));
  });

  it('rádio e TV: só na época e cobram; 1889 não tem nenhum dos dois', () => {
    const s = game('ob-air', 1962);
    setSw(s, SW_OUT33, true);
    const c = s.player.cash;
    expect(buyAir33(s, 'tv')).toBeNull();
    expect(s.player.cash).toBeLessThan(c);
    expect(buyAir33(s, 'tv')).toBeTruthy();
    const o = game('ob-air2', 1889);
    setSw(o, SW_OUT33, true);
    expect(buyAir33(o, 'radio')).toBeTruthy();
    expect(buyAir33(o, 'tv')).toBeTruthy();
  });
});
