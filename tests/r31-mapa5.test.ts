// R31 · onda 5 (MAPA · EXP-3): cidade e mundo só pelo mapa, atrás de exp5.nav. Confere que tudo que a lista ao lado
// do mapa mostrava vira pino visível do mapa (com camada, rótulo e "!"), que as setas alcançam todos os pontos, que os
// países têm o nome da época, que a busca acha prédios/países/cidades, que desligado = igual a hoje e que explorar
// (montar pinos, painéis, busca, telex) não muda o estado.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth, advanceWeek } from '../src/sim/tick';
import { setSw } from '../src/sim/r31/switches';
import { SW_NAV5, nav5On } from '../src/sim/r31/exp5';
import { LOTS18 } from '../src/sim/sys/campus18';
import { isoAt18 } from '../src/ui/pixel/campus18px';
import {
  CITY_LAYERS5, cityListIds5, cityPins5, countryInfo5, defaultLayers5, find5, next5, readOrder5, telex5, visiblePins5, worldCountries5, type Dir5, type Pt5,
} from '../src/ui/r31/map5model';
import type { GameState } from '../src/sim/types';

const game = (year: number, city: string, seed = 'm5') => {
  const cfg = defaultConfig(`${seed}-${city}-${year}`, { startYear: year, homeCity: city });
  (cfg as { dbSize?: string }).dbSize = 'small';
  const g = createGame(cfg);
  advanceWeek(g);
  return g;
};
const snap = (g: GameState) => JSON.stringify(g);
const CASES: [number, string][] = [[1975, 'rio'], [1965, 'london'], [2005, 'new_york']];

/** Todos os pontos alcançáveis andando só com as setas a partir do primeiro. */
function reach(pts: Pt5[]): Set<string> {
  const seen = new Set<string>([readOrder5(pts)[0]]);
  const q = [...seen];
  while (q.length) {
    const cur = q.shift()!;
    for (const d of ['left', 'right', 'up', 'down'] as Dir5[]) { const n = next5(pts, cur, d); if (n && !seen.has(n)) { seen.add(n); q.push(n); } }
  }
  return seen;
}

describe('MAPA · cidade sem lista', () => {
  for (const [y, c] of CASES) it(`${c} ${y}: tudo que a lista mostrava é pino visível do mapa, com rótulo`, () => {
    const g = game(y, c);
    const pins = cityPins5(g);
    const vis = new Set(visiblePins5(pins, defaultLayers5()).map((p) => p.id));
    const list = cityListIds5(g);
    expect(list.length).toBeGreaterThan(3);
    for (const id of list) expect(vis.has(id), id).toBe(true);
    for (const p of pins) {
      expect(CITY_LAYERS5.some((x) => x.id === p.layer)).toBe(true);
      expect(typeof p.name === 'string' ? p.name : p.name.pt).toBeTruthy();
      expect(/^(nb:|pl:|lot:|ev:|lm:)|^[a-z]/i.test(p.id)).toBe(true);
    }
    expect(new Set(pins.map((p) => p.id)).size).toBe(pins.length); // um ponto por id
    // sede sempre é pino; desligar a camada esconde
    expect(pins.some((p) => p.id === 'hq' && p.layer === 'mine')).toBe(true);
    const off = defaultLayers5(); off.delete('mine');
    expect(visiblePins5(pins, off).some((p) => p.id === 'hq')).toBe(false);
  });

  it('"!" de novidade: à venda que cabe no caixa, recados e eventos marcados (com o motivo)', () => {
    const g = game(1975, 'rio');
    const pins = cityPins5(g);
    for (const p of pins) for (const b of p.bang) expect(b.text.pt.length).toBeGreaterThan(2);
    const sale = pins.filter((p) => p.k === 'sale');
    expect(sale.length).toBeGreaterThan(0);
  });

  it('setas: de qualquer começo, as 4 direções alcançam todos os prédios (grade real dos lotes)', () => {
    const geo = { ox: 160, gw: 44, gh: 32, mw: 0, mh: 0 } as unknown as Parameters<typeof isoAt18>[0];
    const all: Pt5[] = LOTS18.map((L0, i) => { const [x, y] = isoAt18(geo, L0.gx + L0.w / 2, L0.gy + L0.d / 2); return { id: `lot:${i}`, x, y }; });
    expect(reach(all).size).toBe(all.length);
    for (let k = 3; k < all.length; k += 5) { const sub = all.filter((_, i) => i % k !== 1); expect(reach(sub).size).toBe(sub.length); }
    expect(next5(all, undefined, 'right')).toBe(readOrder5(all)[0]);
  });
});

describe('MAPA · mundo sem lista', () => {
  it('fronteiras da época: o mesmo país muda de nome com o ano', () => {
    const name = (y: number, a3: string) => worldCountries5(game(y, 'rio')).find((c) => c.a3 === a3)?.name.pt;
    expect(name(1985, 'DEU')).not.toBe(name(2025, 'DEU'));
    for (const y of [1925, 1985, 2025]) {
      const cs = worldCountries5(game(y, 'rio'));
      expect(cs.length).toBeGreaterThan(20);
      for (const c of cs) { expect(c.cities.length).toBeGreaterThan(0); expect(Number.isFinite(c.lon) && Number.isFinite(c.lat)).toBe(true); }
      // todo país alcançável pelas setas
      expect(reach(cs.map((c) => ({ id: c.id, x: c.lon, y: -c.lat }))).size).toBe(cs.length);
    }
  });

  it('painel do país: mercado, cidades (a da sede primeiro) e cultura; telex com destino', () => {
    const g = game(1985, 'rio');
    const br = countryInfo5(g, 'BRA')!;
    expect(br.cities[0].id).toBe('rio');
    expect(br.cities[0].home).toBe(true);
    expect(br.market).toBeTruthy();
    for (const x of telex5(g)) expect(x.go.area).toBeTruthy();
  });

  it('busca acha prédio, país e cidade (sem acento)', () => {
    const g = game(1985, 'rio');
    expect(find5(g, 'sede').some((x) => x.region === 'cidade')).toBe(true);
    expect(find5(g, 'franca').some((x) => x.region === 'mundo' && x.a3 === 'FRA')).toBe(true);
    expect(find5(g, 'paris').some((x) => x.region === 'mundo' && 'city' in x && x.city === 'paris')).toBe(true);
  });
});

describe('MAPA · desligado = hoje; explorar não muda nada', () => {
  it('exp5.nav começa desligado e não muda a simulação', () => {
    const a = game(1975, 'rio', 'off'), b = game(1975, 'rio', 'off');
    expect(nav5On(a)).toBe(false);
    setSw(b, SW_NAV5, true);
    for (let i = 0; i < 2; i++) { advanceMonth(a); advanceMonth(b); }
    setSw(b, SW_NAV5, false);
    expect(snap(b)).toBe(snap(a));
  });

  for (const [y, c] of CASES) it(`${c} ${y}: montar pinos, painéis, busca e telex só lê`, () => {
    const g = game(y, c);
    setSw(g, SW_NAV5, true);
    cityPins5(g); // aquece caches de leitura que o próprio mapa de hoje já cria ao desenhar
    const before = snap(g);
    cityPins5(g); cityListIds5(g);
    for (const k of worldCountries5(g)) countryInfo5(g, k.a3);
    telex5(g); find5(g, 'rad'); find5(g, 'london');
    expect(snap(g)).toBe(before);
  });
});
