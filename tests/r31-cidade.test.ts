// R31 · onda 4 (H · Loja e cidade): lugares reais da música por cidade (3 níveis, nomes no registro único, terrenos
// reservados), lojas por época (abrem e fecham; registro da cidade avisa), festival no terreno do mês, outdoors das
// paradas, neon por época, veículos pela borda certa, mapa até 44×32 em 7 bairros, casa desde 1889 (terreno e imóveis
// em outras cidades) e as cenas da loja/casa (pontos dentro do desenho). Explorar não muda o mundo.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth, advanceWeek } from '../src/sim/tick';
import { CAPITALS31, MEDIUM31, PLACES31, tierOf31 } from '../src/data/places31';
import { REALNAMES31 } from '../src/data/realnames31';
import { LANDMARKS19 } from '../src/data/landmarks19';
import { CITIES } from '../src/data/world';
import {
  BIZ31, RES_LOTS31, billboards31, bizAt31, buyHome31, chooseHomeLot31, city31, commonLots31, fest31, festLot31, homes31, housesAt31, minGw31, neon31, placeName31,
  placesOf31, realLots31, slotsOf31, yearLog31,
} from '../src/sim/r31/city31';
import { DIST18, LOTS18, buildings18, campus18, homeLot18, layout18 } from '../src/sim/sys/campus18';
import { HOUSES, ownerOf } from '../src/sim/sys/people/owner';
import { places27 } from '../src/sim/sys/place27';
import { setSw } from '../src/sim/r31/switches';
import { editableById, runnableById } from '../src/sim/r31/editor';
import { laneAt31, roadAt18 } from '../src/ui/pixel/campus18px';
import { paintHouse31, paintShop31, SH31, SW31 } from '../src/ui/r31/shop31px';
import { spotOk31 } from '../src/ui/r31/scene31model';
import { l } from '../src/data/world';
import type { GameState } from '../src/sim/types';

const game = (year: number, city = 'rio', seed = 'h31') => {
  const cfg = defaultConfig(`${seed}-${city}-${year}`, { startYear: year, homeCity: city });
  (cfg as { dbSize?: string }).dbSize = 'small';
  const g = createGame(cfg);
  advanceWeek(g);
  return g;
};
const snap = (g: GameState) => JSON.stringify(g);

describe('H · lugares reais da música', () => {
  it('cerca de 650+ lugares em todas as cidades do banco, em três níveis', () => {
    expect(PLACES31.length).toBeGreaterThanOrEqual(650);
    const by = new Map<string, number>();
    for (const p of PLACES31) by.set(p.city, (by.get(p.city) ?? 0) + 1);
    for (const c of CITIES) expect(by.get(c.id) ?? 0, c.id).toBeGreaterThanOrEqual(1);
    expect(CAPITALS31.length).toBe(20);
    expect(MEDIUM31.length).toBeGreaterThanOrEqual(45);
    for (const c of CAPITALS31) { expect(tierOf31(c)).toBe(1); expect(by.get(c), c).toBeGreaterThanOrEqual(10); expect(by.get(c), c).toBeLessThanOrEqual(20); }
    for (const c of MEDIUM31) { expect(by.get(c), c).toBeGreaterThanOrEqual(3); expect(by.get(c), c).toBeLessThanOrEqual(6); }
    for (const c of CITIES) if (tierOf31(c.id) === 3) expect(by.get(c.id), c.id).toBeLessThanOrEqual(3);
  });
  it('ids únicos, anos coerentes, marcos existentes e nome real registrado e trocável', () => {
    expect(new Set(PLACES31.map((p) => p.id)).size).toBe(PLACES31.length);
    for (const p of PLACES31) {
      expect(p.to === 0 || p.to > p.from, p.id).toBe(true);
      if (p.lm) expect(LANDMARKS19.some((m) => m.id === p.lm), p.id).toBe(true);
      const r = REALNAMES31[`place:${p.id}`];
      expect(r, p.id).toBeDefined();
      expect(r.real).toBe(p.real);
      expect(r.substituto).not.toBe(r.real);
    }
    const g = game(1975);
    const gazeta = PLACES31.find((p) => p.id === 'sp_gazeta_fm')!;
    g.config.realNames = true; expect(placeName31(g, gazeta)).toBe('Gazeta FM');
    g.config.realNames = false; expect(placeName31(g, gazeta)).toBe('Rádio Folha FM');
  });
  it('cada lugar só existe nos anos certos: o Canecão abre em 1967 e some depois de 2010', () => {
    const g = game(1975);
    const ids = (y: number) => realLots31(g, y).map((x) => x.p.id);
    expect(ids(1975)).toContain('rio_canecao');
    expect(ids(1960)).not.toContain('rio_canecao');
    expect(ids(2015)).not.toContain('rio_canecao');
    expect(ids(2015)).toContain('rio_circo_voador');
  });
  it('terrenos reservados: fora da rua, sem brigar com os lotes compráveis, um lugar por terreno em cada época', () => {
    for (const r of RES_LOTS31) {
      for (let x = r.gx + 0.25; x < r.gx + r.w; x += 0.5) for (let y = r.gy + 0.25; y < r.gy + r.d; y += 0.5) expect(roadAt18(x, y)).toBe(false);
      expect(r.gx + r.w).toBeLessThanOrEqual(44); expect(r.gy + r.d).toBeLessThanOrEqual(32);
      for (const a of LOTS18) expect(a.gx < r.gx + r.w && r.gx < a.gx + a.w && a.gy < r.gy + r.d && r.gy < a.gy + a.d).toBe(false);
    }
    for (const city of ['rio', 'london', 'new_york', 'sao_paulo']) {
      const sl = slotsOf31(city);
      const ps = placesOf31(city).filter((p) => sl.has(p.id));
      for (const a of ps) for (const b of ps) if (a !== b && sl.get(a.id) === sl.get(b.id)) {
        const overlap = a.from < (b.to || 99999) && b.from < (a.to || 99999);
        expect(overlap, `${a.id} × ${b.id}`).toBe(false);
      }
    }
    const g = game(1975);
    expect(minGw31(g)).toBeGreaterThan(29);
    setSw(g, 'h31.real', false);
    expect(realLots31(g)).toEqual([]);
    expect(minGw31(g)).toBe(0);
  });
});

describe('H · mapa maior (só acrescentando)', () => {
  it('7 bairros, até 44×32, ~70 terrenos (58 compráveis + 12 reservados); os 34 de sempre intactos', () => {
    expect(DIST18.length).toBe(7);
    expect(DIST18[3].end).toBe(34);
    expect(LOTS18.length + RES_LOTS31.length).toBe(70);
    expect(Math.max(...DIST18.map((d) => d.gw))).toBe(44);
    expect(Math.max(...DIST18.map((d) => d.gh))).toBe(32);
    expect(LOTS18[0]).toMatchObject({ gx: 11, gy: 1, w: 6, d: 6 });
    expect(LOTS18[33]).toMatchObject({ gx: 26, gy: 21, w: 3, d: 3 });
  });
});

describe('H · lojas por época', () => {
  it('cada negócio só aparece entre a abertura e o fechamento; o terreno troca de negócio com os anos', () => {
    const seen = new Set<string>();
    for (let lot = 1; lot < 40; lot++) for (let y = 1889; y <= 2040; y += 3) {
      const b = bizAt31('seed', 'rio', lot, y);
      expect(y >= b.from && y < b.to, `${b.id} em ${y}`).toBe(true);
      seen.add(b.id);
    }
    expect(seen.has('sheet') && seen.has('cd_mega') && seen.has('lan') && seen.has('phones')).toBe(true);
    expect(bizAt31('seed', 'rio', 5, 1990)).toBe(bizAt31('seed', 'rio', 5, 1990)); // fixo por semente/lote/ano
    let changes = 0;
    for (let y = 1890; y <= 2040; y++) if (bizAt31('seed', 'rio', 7, y).id !== bizAt31('seed', 'rio', 7, y - 1).id) changes++;
    expect(changes).toBeGreaterThan(8);
    expect(BIZ31.find((b) => b.id === 'lan')).toMatchObject({ from: 1998, to: 2015 });
  });
  it('a cidade comum mostra a loja da época; o registro da cidade avisa "fechou / abriu" na virada do ano', () => {
    const g = game(1925, 'sao_paulo');
    const fill = commonLots31(g);
    const pl = places27(g, fill);
    expect(pl.some((p) => BIZ31.some((b) => b.name.pt === p.what.pt))).toBe(true);
    const n0 = campus18(g).log.length;
    let wrote = 0;
    for (let y = 0; y < 6; y++) { g.year++; wrote += yearLog31(g); }
    expect(wrote).toBeGreaterThan(0);
    expect(campus18(g).log.length).toBeGreaterThan(n0);
    expect(campus18(g).log.some((x) => /Fechou|Abriu/.test(x.t.pt))).toBe(true);
  });
});

describe('H · festival, outdoors, neon e veículos', () => {
  it('festival do calendário aparece no mês em que acontece e some depois', () => {
    const g = game(1990);
    g.month = 0; const f = fest31(g);
    expect(f?.name).toBe('Rock na Baía Dourada');
    expect(f?.acts.length).toBeGreaterThan(0);
    g.month = 3; expect(fest31(g)).toBeNull();
    expect(festLot31([3, 1, 12])).toBe(3); // o maior e mais visível (4×4)
  });
  it('outdoors: um por parada que existe na época (nada de streaming antes da internet), com o nome da parada', () => {
    const g = game(1975);
    for (let i = 0; i < 3; i++) advanceMonth(g);
    const bb = billboards31(g);
    expect(bb.length).toBeGreaterThan(0);
    for (const b of bb) { expect(g.releases[b.relId]).toBeDefined(); expect(b.label.pt).not.toMatch(/streaming/i); }
    expect(new Set(bb.map((b) => b.relId)).size).toBe(bb.length);
    expect(billboards31(game(1895))).toEqual([]);
  });
  it('neon: começa nos anos 20, auge 1930–60, volta nos 80, LED depois de 2000', () => {
    expect(neon31(1910).f).toBe(0);
    expect(neon31(1945).f).toBe(1);
    expect(neon31(1970).f).toBeLessThan(neon31(1985).f);
    expect(neon31(2010).k).toBe('led');
  });
  it('veículos entram e saem pela borda certa e apontam para onde andam', () => {
    for (const [GW, GH] of [[20, 16], [29, 24], [44, 32]]) for (const horiz of [true, false]) for (const dir of [1, -1]) {
      const a = laneAt31(GW, GH, horiz, 7.5, dir, -3), b = laneAt31(GW, GH, horiz, 7.5, dir, GW + 3);
      const [p0, p1] = horiz ? [a.gx, b.gx] : [a.gy, b.gy], max = horiz ? GW : GH;
      expect(Math.min(p0, p1)).toBeLessThanOrEqual(-2.9); expect(Math.max(p0, p1)).toBeGreaterThanOrEqual(max + 2.9);
      const sx = (q: { gx: number; gy: number }) => q.gx - q.gy; // x de tela na isométrica
      const mid = laneAt31(GW, GH, horiz, 7.5, dir, GW / 2), nx = laneAt31(GW, GH, horiz, 7.5, dir, GW / 2 + 1);
      expect(Math.sign(sx(nx) - sx(mid))).toBe(mid.face);
    }
  });
});

describe('H · casa', () => {
  it('tipos desde 1889 com o interruptor; desligado, nada antes de 1920', () => {
    const g = game(1889);
    expect(housesAt31(g).map((i) => HOUSES[i].id)).toEqual(expect.arrayContaining(['tenement', 'townhouse', 'chalet', 'palacete']));
    setSw(g, 'h31.casas', false);
    expect(housesAt31(g)).toEqual([]);
    expect(buyHome31(g, 'london', 0)?.pt).toMatch(/desligad/);
  });
  it('escolher o terreno da casa e ter imóvel em outra cidade (faixa "pelo mundo", manutenção do bolso)', () => {
    const g = game(1975);
    const o = ownerOf(g);
    o.wealth = 1e12;
    o.house = 0;
    const free = commonLots31(g).filter((x) => x !== homeLot18(g));
    expect(chooseHomeLot31(g, free[0])).toBeNull();
    expect(homeLot18(g)).toBe(free[0]);
    expect(layout18(g, buildings18(g)).get('home')).toBe(free[0]);
    expect(buyHome31(g, 'london', housesAt31(g)[0])).toBeNull();
    expect(buyHome31(g, 'london', housesAt31(g)[0])?.pt).toMatch(/já tem/);
    expect(homes31(g)).toHaveLength(1);
    expect(buildings18(g).some((b) => b.id === 'h31:london' && b.zone === 'world')).toBe(true);
    const w0 = o.wealth;
    advanceMonth(g);
    expect(o.wealth).toBeLessThan(w0 + 1); // manutenção (e o resto do mês) sai do bolso
    expect(city31(g).homes[0].city).toBe('london');
  });
});

describe('H · explorar não muda o mundo; editor', () => {
  it('as consultas da cidade só leem', () => {
    const g = game(1985);
    const before = snap(g);
    realLots31(g); minGw31(g); fest31(g); billboards31(g); commonLots31(g); places27(g, commonLots31(g)); housesAt31(g);
    expect(snap(g)).toBe(before);
  });
  it('registro no editor (regra 10)', () => {
    expect(editableById('city31.homeLot')).toBeDefined();
    expect(runnableById('city31.yearLog')).toBeDefined();
    expect(runnableById('city31.giveHome')).toBeDefined();
  });
});

describe('H · cenas da loja e da casa', () => {
  it('pontos clicáveis dentro do desenho, com destino e textos', () => {
    const shop = paintShop31({ year: 1975, head: 'Novidades JUL', when: 'muda em 2 sem', gar: 'Garagem', weeks: 2, clerk: true,
      items: [1, 2, 3, 4, 5, 6].map((i) => ({ offer: `o${i}`, fam: 'guitar' as const, price: '$900', gift: i % 2 === 0, name: l('Guitarra', 'Guitar') })),
      news: ['+ sintetizador'], relic: { name: l('Violão', 'Guitar'), stars: 3, price: '$40k', offer: 'r' }, garage: { price: '$6k', n: 1, car: 1 } });
    expect(shop.px.w).toBe(SW31); expect(shop.px.h).toBe(SH31);
    for (const sp of shop.spots) expect(spotOk31(sp, SW31, SH31), sp.id).toBe(true);
    for (const id of ['news', 'garage', 'counter', 'relic', 'item:o1']) expect(shop.spots.some((x) => x.id === id), id).toBe(true);
    const house = paintHouse31({ year: 1905, gar: 'Garagem', house: 'chalet', prestige: 3, cars: 2, carNames: [], piano: true, gold: 2, pool: false });
    for (const sp of house.spots) expect(spotOk31(sp, SW31, SH31), sp.id).toBe(true);
    expect(house.spots.some((x) => x.id === 'garage')).toBe(true);
  });
});
