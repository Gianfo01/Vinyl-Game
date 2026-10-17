// R33 · CIDADE — lojas, base de turnê, terrenos e cenas atrás dos interruptores exp33.cidade.* (desligados por padrão).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { applyMods } from '../src/sim/ext4';
import { setSw, sw } from '../src/sim/r31/switches';
import { createGame } from '../src/sim/worldgen';
import { lots31 } from '../src/sim/sys/lots31';
import {
  SW_BASE33, SW_CENAS33, SW_LOJAS33, SW_TERRENOS33, baseFatigueRelief33, cidade33, formatShopMult33, lotRent33, lotValue33, openOffice33, openShop33,
  rentLot33, sceneAt33, sellLot33,
} from '../src/sim/r33/cidade33';
import { homes31 } from '../src/sim/r31/city31';
import type { Act, GameState, Release } from '../src/sim/types';

const game = (over = {}) => createGame(defaultConfig('r33-cidade', over));
const rel = (s: GameState, owner = 'player'): Release => ({ ...Object.values(s.releases)[0], owner, formats: ['lp'] });

describe('R33 · cidade', () => {
  it('desligado de fábrica: nada muda nas vendas, nas turnês nem na demanda', () => {
    const s = game();
    for (const id of [SW_LOJAS33, SW_BASE33, SW_TERRENOS33, SW_CENAS33]) expect(sw(s, id)).toBe(false);
    expect(applyMods(s, 'chartUnits', 1000, { release: rel(s) }).factors.some((f) => f.label.pt === 'Lojas da cidade')).toBe(false);
    expect(applyMods(s, 'tourRisk', 1, { cityId: 'rio' }).value).toBe(1);
  });

  it('lojas: a oferta da época pesa nas vendas físicas e a loja própria soma; digital fica neutro', () => {
    const s = game();
    s.year = 1975;
    setSw(s, SW_LOJAS33, true);
    const m = formatShopMult33(s, 'lp');
    expect(m).toBeGreaterThanOrEqual(0.93);
    expect(m).toBeLessThanOrEqual(1.15);
    expect(formatShopMult33(s, 'streaming')).toBe(1);
    const base = applyMods(s, 'chartUnits', 1000, { release: rel(s) }).value;
    const lot = 5;
    lots31(s).own[lot] = { w: s.week, price: 1000 };
    s.player.cash += 1e9;
    expect(openShop33(s, lot).ok).toBe(true);
    expect(cidade33(s).shops[lot]).toBeDefined();
    expect(applyMods(s, 'chartUnits', 1000, { release: rel(s) }).value).toBeGreaterThan(base);
  });

  it('terrenos: valoriza com os anos, aluga, rende e vende', () => {
    const s = game();
    setSw(s, SW_TERRENOS33, true);
    const lot = 5;
    lots31(s).own[lot] = { w: s.week, price: 100000 };
    const v0 = lotValue33(s, lot);
    s.week += 52 * 5;
    expect(lotValue33(s, lot)).toBeGreaterThan(v0);
    expect(rentLot33(s, lot, true).ok).toBe(true);
    expect(lotRent33(s, lot)).toBeGreaterThan(0);
    const cash = s.player.cash;
    expect(sellLot33(s, lot).ok).toBe(true);
    expect(s.player.cash).toBeGreaterThan(cash);
    expect(lots31(s).own[lot]).toBeUndefined();
  });

  it('base: imóvel em outra cidade reduz o risco e o cansaço; escritório regional pede imóvel', () => {
    const s = game();
    setSw(s, SW_BASE33, true);
    s.player.cash += 1e9;
    expect(openOffice33(s, 'rio').ok).toBe(false);
    expect(baseFatigueRelief33(s, 'rio')).toBe(0);
    const city = s.config.homeCity === 'rio' ? 'london' : 'rio';
    (s as any).x4.city31 = { homes: [{ city, house: 0, y: s.year, paid: 0 }] };
    expect(homes31(s).length).toBe(1);
    expect(baseFatigueRelief33(s, city)).toBeGreaterThan(0);
    expect(applyMods(s, 'tourRisk', 1, { cityId: city }).value).toBeLessThan(1);
    expect(openOffice33(s, city).ok).toBe(true);
  });

  it('cenas: o gênero da cena da época puxa a demanda; outro gênero não', () => {
    const s = game();
    s.year = 1992;
    setSw(s, SW_CENAS33, true);
    expect(sceneAt33('seattle', 1992)?.genres).toContain('grunge');
    expect(sceneAt33('seattle', 1975)).toBeNull();
    const act = (genre: string): Act => ({ ...Object.values(s.acts)[0], genre });
    const dem = (genre: string) => applyMods(s, 'cityDemand', 100, { act: act(genre), cityId: 'seattle' }).value;
    const on = [dem('grunge'), dem('samba')];
    setSw(s, SW_CENAS33, false);
    const off = [dem('grunge'), dem('samba')];
    expect(on[0]).toBeGreaterThan(off[0] * 1.1);
    expect(on[1]).toBeCloseTo(off[1], 6);
  });
});
