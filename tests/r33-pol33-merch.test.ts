// R33 · POL33-A — merch e itens exclusivos pelo sistema de relíquias (exp33.pol.merch): desligado nada nasce; ligado a peça vira
// Relic sua (dono registrado, valor, tipo), o artista seu dá a peça de graça uma vez por mês, e as 6 ideias funcionam.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import type { GameState } from '../src/sim/types';
import { playerActs } from '../src/sim/util';
import { relics } from '../src/sim/sys/relics9';
import { setSw, switchDef } from '../src/sim/r31/switches';
import {
  SW_MERCH33, WHERE33, buyOffer33, merchOn, offers33, openLine33, peekM33, setWindow33, myRelics33, lineIncome33, reportPirate33, stockStand33, tourOf33, type Where33,
} from '../src/sim/r33/merch33';
import { INT33, placeActs27 } from '../src/sim/sys/place27';

const game = (seed: string, year = 1990): GameState => createGame(defaultConfig(seed, { scenario: 'established', startYear: year, dbSize: 'small', homeCity: 'london' } as Parameters<typeof defaultConfig>[1]));
const WH = Object.keys(WHERE33) as Where33[];

describe('R33 POL33-A · merch', () => {
  it('nasce desligado: sem ofertas, sem estado e o mês passa igual', () => {
    expect(switchDef(SW_MERCH33)?.def).toBe(false);
    const s = game('mc-off');
    expect(merchOn(s)).toBe(false);
    for (const w of WH) expect(offers33(s, w)).toEqual([]);
    advanceMonth(s);
    expect(peekM33(s)).toBeUndefined();
  });

  it('ofertas estáveis por mês e por lugar, com peça por época; comprar vira Relic sua com histórico', () => {
    const s = game('mc-buy', 1990);
    setSw(s, SW_MERCH33, true);
    s.player.cash = 5e9;
    const a = offers33(s, 'festival'), b = offers33(s, 'festival');
    expect(a.length).toBeGreaterThan(2);
    expect(a.map((x) => x.key)).toEqual(b.map((x) => x.key));
    expect(a.every((x) => x.item.from <= s.year)).toBe(true);
    const o = a.find((x) => !x.free)!;
    const n = relics(s).list.length;
    expect(buyOffer33(s, o.key)).toBeNull();
    const rl = relics(s).list.find((r) => r.id === peekM33(s)!.bought[o.key])!;
    expect(relics(s).list.length).toBe(n + 1);
    expect(rl.st).toBe('player');
    expect(rl.own.at(-1)?.[0]).toBe(s.config.companyName);
    expect(rl.k).toBe(o.item.kind);
    expect(buyOffer33(s, o.key)).toBeTruthy();
    expect(myRelics33(s).some((r) => r.id === rl.id)).toBe(true);
  });

  it('1889 não tem pulseira nem passe; estádio e boate só quando existem', () => {
    const s = game('mc-1889', 1889);
    setSw(s, SW_MERCH33, true);
    expect(offers33(s, 'nightclub')).toEqual([]);
    expect(offers33(s, 'stadium')).toEqual([]);
    for (const w of WH) for (const o of offers33(s, w)) expect(['wrist', 'pass', 'jacket', 'toy', 'hist']).not.toContain(o.item.id);
  });

  it('artista seu: a peça é ganha, uma por mês e artista', () => {
    const s = game('mc-gift', 1990);
    setSw(s, SW_MERCH33, true);
    const mine = new Set(playerActs(s));
    const free = WH.flatMap((w) => offers33(s, w)).filter((o) => o.free);
    if (!free.length) return; // sem artista seu nas bancas desta semente
    const cash = s.player.cash;
    expect(buyOffer33(s, free[0].key)).toBeNull();
    expect(s.player.cash).toBe(cash);
    expect(mine.has(free[0].act!.id)).toBe(true);
    expect(WH.flatMap((w) => offers33(s, w)).filter((o) => o.free && o.act!.id === free[0].act!.id).length).toBe(0);
  });

  it('marca própria rende todo mês; vitrine rende; colecionador rival oferece', () => {
    const s = game('mc-line', 1990);
    setSw(s, SW_MERCH33, true);
    s.player.cash = 5e9;
    const aid = playerActs(s)[0];
    expect(openLine33(s, aid)).toBeNull();
    expect(openLine33(s, aid)).toBeTruthy();
    expect(lineIncome33(s, s.acts[aid])).toBeGreaterThan(0);
    for (const o of offers33(s, 'festival').filter((x) => !x.free)) buyOffer33(s, o.key);
    const rl = myRelics33(s)[0];
    expect(setWindow33(s, rl.id)).toBeNull();
    const c0 = s.player.cash;
    for (let i = 0; i < 8; i++) advanceMonth(s);
    expect(peekM33(s)!.lines[aid].earned).toBeGreaterThan(0);
    expect(s.player.cash).not.toBe(c0);
    expect(reportPirate33(s, aid)).toBeTruthy(); // sem falsificação: trava com motivo
  });

  it('banca na turnê trava sem turnê; place27 mostra as peças no cartão da casa de shows', () => {
    const s = game('mc-stand', 1990);
    setSw(s, SW_MERCH33, true);
    const aid = playerActs(s)[0];
    if (!tourOf33(s, aid)) expect(stockStand33(s, aid, 200)).toBeTruthy();
    expect(INT33.acts).toBeTruthy();
    const acts = placeActs27(s, { id: 'pl:test', k: 'venue', name: { pt: 'x', en: 'x' } } as never, aid);
    expect(acts.some((x) => x.id.startsWith('m33:'))).toBe(true);
    setSw(s, SW_MERCH33, false);
    expect(placeActs27(s, { id: 'pl:test', k: 'venue', name: { pt: 'x', en: 'x' } } as never, aid).some((x) => x.id.startsWith('m33:'))).toBe(false);
  });
});
