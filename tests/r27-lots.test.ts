// Rodada 27 (LOTS): o "Nosso mundo" sempre tem lotes vazios à venda e cresce em bairros novos (DIST18).
//   • partidas novas (1889/1962/1985/2010) e cidades lotadas (prédios seus + vizinhos): sempre ≥ 3 placas;
//   • sem caixa a placa fica, bloqueada com o motivo;
//   • lotes novos: sem sobreposição, fora da rua, dentro da grade e do canvas do bairro;
//   • crescer não mexe no resto: vizinhos e prédios de sempre ficam no mesmo lote; funções puras não mudam o estado.
import { afterEach, describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth, advanceWeek } from '../src/sim/tick';
import { BLD19, DIST18, HOME_LOT18, LOTS18, MIN_FREE18, buildings18, campus18, dist18, freeLots18, layout18, lotsOpen18, sync18 } from '../src/sim/sys/campus18';
import { nb19 } from '../src/sim/sys/hood19';
import { lotPop19 } from '../src/sim/sys/world19';
import { SALE_MAX27, fillerLots27, forSale27 } from '../src/ui/pixel/city27';
import { geoDist18, isoAt18, roadAt18, unstackSigns27, type SaleSign27 } from '../src/ui/pixel/campus18px';
import type { GameState } from '../src/sim/types';

const game = (year: number, city = 'london', seed = 'lots27') => {
  const cfg = defaultConfig(`${seed}-${city}-${year}`, { startYear: year, homeCity: city });
  (cfg as { dbSize?: string }).dbSize = 'small';
  const g = createGame(cfg);
  advanceWeek(g);
  return g;
};
/** Enche a cidade com `n` prédios seus (provedor de prédios do BLD19, o mesmo gancho dos sistemas r19). */
const fake = { n: 0 };
const filler = (s: GameState) => Array.from({ length: fake.n }, (_, i) => ({ id: `t27:${i}`, kind: 'studio' as const, name: `Teste ${i}`, city: s.config.homeCity, lvl: 1, since: 1800 + i }));
BLD19.f.push(filler);
afterEach(() => { fake.n = 0; });

const YEARS = [1889, 1962, 1985, 2010];

describe('r27 LOTS: sempre há lotes à venda', () => {
  for (const y of YEARS) it(`partida nova em ${y}: pelo menos 3 placas, cabendo ou não no caixa`, () => {
    const g = game(y);
    expect(freeLots18(g).length).toBeGreaterThanOrEqual(MIN_FREE18);
    const sale = forSale27(g);
    expect(sale.length).toBe(SALE_MAX27);
    const cash = g.player.cash;
    g.player.cash = 0;
    expect(forSale27(g).length).toBe(SALE_MAX27);
    g.player.cash = cash;
  });

  for (const y of YEARS) it(`${y}: cidade lotada de prédios seus + vizinhos → a cidade cresce e continua à venda`, () => {
    const g = game(y);
    const d0 = dist18(g);
    for (const n of [5, 10, 15, 20, 25]) {
      fake.n = n;
      const bs = buildings18(g);
      const lots = layout18(g, bs);
      const open = lotsOpen18(g, bs);
      // todo prédio do campus tem lote, sem repetir, dentro dos bairros abertos
      const camp = bs.filter((b) => b.zone === 'campus');
      expect(lots.size).toBe(camp.length);
      expect(new Set(lots.values()).size).toBe(lots.size);
      for (const v of lots.values()) expect(v).toBeLessThan(open);
      // regra: nunca menos de MIN_FREE18 lotes livres (enquanto houver bairro para abrir) → vizinhos deixam 3 → placas
      expect(freeLots18(g).length).toBeGreaterThanOrEqual(MIN_FREE18);
      const nbs = nb19(g);
      const sale = forSale27(g);
      expect(sale.length, `${y} com ${n} prédios`).toBeGreaterThanOrEqual(3);
      for (const x of sale) { expect([...lots.values()]).not.toContain(x.lot); expect(nbs.some((q) => q.lot === x.lot)).toBe(false); }
      // o resto vira cidade comum: cada lote aberto é de alguém, à venda ou cidade
      const fill = fillerLots27(g, sale);
      const all = new Set([0, ...lots.values(), ...nbs.map((q) => q.lot), ...sale.map((x) => x.lot), ...fill, ...campus18(g).proj.map((p) => p.lot)]);
      expect(all.size).toBe(open);
    }
    if (d0 < DIST18.length - 1) expect(dist18(g)).toBeGreaterThan(d0); // 2010 já começa com a cidade inteira
    // a cidade não encolhe: o bairro aberto fica gravado (sync mensal) mesmo quando os prédios somem
    sync18(g);
    const grown = campus18(g).dist!;
    fake.n = 0;
    expect(dist18(g)).toBe(grown);
  });

  it('vizinhos crescendo junto não tomam os últimos lotes', () => {
    const g = game(1962);
    for (let n = 0; n <= 26; n += 2) {
      fake.n = n;
      const free = freeLots18(g).length, nbs = nb19(g).length;
      expect(free - nbs).toBeGreaterThanOrEqual(Math.min(3, free));
      expect(forSale27(g).length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('r27 LOTS: fora do caixa = à venda bloqueado, com o motivo', () => {
  it('sem caixa, todas as placas vêm com o motivo; as opções do lote ficam desabilitadas', () => {
    const g = game(1985);
    g.player.cash = 0;
    const sale = forSale27(g);
    expect(sale.length).toBeGreaterThanOrEqual(2);
    for (const x of sale) {
      expect(x.dis?.pt.length, 'motivo em português').toBeGreaterThan(0);
      expect(x.dis?.en.length, 'motivo em inglês').toBeGreaterThan(0);
      expect(x.price).toBeGreaterThan(0);
      const p = lotPop19(g, x.lot)!;
      expect(p.opts.length).toBeGreaterThan(0);
      expect(p.opts.every((o) => !!o.dis)).toBe(true);
    }
  });
  it('com caixa, as que cabem vêm primeiro e sem bloqueio', () => {
    const g = game(1985);
    g.player.cash = 5e9;
    const sale = forSale27(g);
    expect(sale.length).toBe(SALE_MAX27);
    for (const x of sale) expect(x.dis).toBeUndefined();
  });
});

describe('r27 LOTS: mapa maior sem sobreposição', () => {
  it('índices antigos intactos: o centro tem os 14 lotes de sempre (sede no 0, casa no 11) e o mapa de 300×226', () => {
    expect(DIST18[0].end).toBe(14);
    expect(LOTS18[0]).toMatchObject({ gx: 11, gy: 1, w: 6, d: 6 });
    expect(LOTS18[HOME_LOT18]).toMatchObject({ gx: 0, gy: 13, w: 4, d: 3 });
    expect(LOTS18[13]).toMatchObject({ gx: 0, gy: 0, w: 4, d: 3 });
    expect(geoDist18(0)).toMatchObject({ gw: 20, gh: 16, mw: 300, mh: 226 });
    expect(LOTS18.length).toBe(DIST18[DIST18.length - 1].end);
    expect(LOTS18.length).toBeGreaterThanOrEqual(30);
  });
  it('lotes não se sobrepõem, não caem na rua e cabem na grade e no canvas do seu bairro', () => {
    for (let i = 0; i < LOTS18.length; i++) {
      const a = LOTS18[i];
      const d = DIST18.findIndex((x) => i < x.end), D = DIST18[d], geo = geoDist18(d);
      expect(a.gx + a.w, `lote ${i}`).toBeLessThanOrEqual(D.gw);
      expect(a.gy + a.d, `lote ${i}`).toBeLessThanOrEqual(D.gh);
      for (let x = a.gx + 0.25; x < a.gx + a.w; x += 0.5) for (let y = a.gy + 0.25; y < a.gy + a.d; y += 0.5) expect(roadAt18(x, y), `lote ${i} na rua (${x},${y})`).toBe(false);
      for (const [x, y] of [[a.gx, a.gy], [a.gx + a.w, a.gy], [a.gx, a.gy + a.d], [a.gx + a.w, a.gy + a.d]]) {
        const [px, py] = isoAt18(geo, x, y);
        expect(px).toBeGreaterThanOrEqual(0); expect(px).toBeLessThanOrEqual(geo.mw);
        expect(py).toBeGreaterThanOrEqual(0); expect(py).toBeLessThanOrEqual(geo.mh);
      }
      for (let j = i + 1; j < LOTS18.length; j++) {
        const b = LOTS18[j];
        const over = a.gx < b.gx + b.w && b.gx < a.gx + a.w && a.gy < b.gy + b.d && b.gy < a.gy + a.d;
        expect(over, `lotes ${i} e ${j} se sobrepõem`).toBe(false);
      }
      expect(a.name.pt.length && a.name.en.length).toBeTruthy();
    }
    expect(new Set(LOTS18.map((x) => x.name.pt)).size).toBe(LOTS18.length);
    // bairros só crescem (grade e canvas)
    for (let d = 1; d < DIST18.length; d++) {
      expect(DIST18[d].end).toBeGreaterThan(DIST18[d - 1].end);
      expect(geoDist18(d).mw).toBeGreaterThanOrEqual(geoDist18(d - 1).mw);
      expect(geoDist18(d).mh).toBeGreaterThanOrEqual(geoDist18(d - 1).mh);
    }
  });
  it('placas "À venda" de lotes vizinhos não se cobrem (nem a etiqueta de preço por cima)', () => {
    const sign = (lot: number, x: number, y: number, d: number): SaleSign27 => ({ lot, c: { width: 44, height: 19 } as HTMLCanvasElement, x, y, d, base: [x + 22, y + 18] });
    // lado a lado (lotes 26 e 27), um atrás do outro (2 e 6) e três empilhadas
    for (const set of [[sign(26, 100, 150, 30), sign(27, 128, 150, 31)], [sign(2, 120, 120, 13), sign(6, 94, 133, 16)], [sign(1, 60, 80, 10), sign(2, 64, 84, 11), sign(3, 68, 88, 12)]]) {
      unstackSigns27(set);
      for (const a of set) for (const b of set) if (a !== b) {
        const over = a.x < b.x + 44 && b.x < a.x + 44 && a.y - 12 < b.y + 11 && b.y - 12 < a.y + 11;
        expect(over, `placas ${a.lot} e ${b.lot}`).toBe(false);
      }
    }
  });
  it('a cidade cresce com as décadas e com o tamanho do selo', () => {
    expect(dist18(game(1889))).toBe(0);
    expect(dist18(game(2010))).toBe(DIST18.length - 1);
    const g = game(1889);
    g.player.hq = 4;
    expect(dist18(g)).toBeGreaterThanOrEqual(3);
  });
});

describe('r27 LOTS: crescer não mexe no resto', () => {
  it('funções do mapa são puras (o estado não muda)', () => {
    const g = game(1962);
    fake.n = 18;
    const before = JSON.stringify(g);
    dist18(g); freeLots18(g); forSale27(g); fillerLots27(g); nb19(g); layout18(g, buildings18(g));
    expect(JSON.stringify(g)).toBe(before);
  });
  it('quando um bairro abre, vizinhos e prédios de sempre ficam no mesmo lote', () => {
    const g = game(1889);
    const nb0 = nb19(g).map((x) => [x.lot, x.k]);
    const lay0 = [...layout18(g, buildings18(g))];
    for (const x of nb0) expect(x[0]).toBeLessThan(DIST18[0].end);
    campus18(g).dist = DIST18.length - 1; // como se a cidade tivesse crescido toda
    expect(lotsOpen18(g)).toBe(LOTS18.length);
    expect(nb19(g).map((x) => [x.lot, x.k])).toEqual(nb0);
    expect([...layout18(g, buildings18(g))]).toEqual(lay0);
    expect(forSale27(g).length).toBe(SALE_MAX27);
  });
  it('save antigo (sem `dist`, com prédio num lote novo) abre o bairro desse lote e roda o mês', () => {
    const g = game(1889);
    const st = campus18(g);
    delete st.dist;
    st.lot['t27:0'] = 20;
    fake.n = 1;
    expect(lotsOpen18(g)).toBeGreaterThan(20);
    expect(layout18(g, buildings18(g)).get('t27:0')).toBe(20);
    expect(() => advanceMonth(g)).not.toThrow();
    expect(campus18(g).dist).toBeGreaterThanOrEqual(1);
  }, 120000);
  it('determinístico: mesma semente → mesmos bairros, placas e vizinhos', () => {
    const a = game(1985, 'rio', 'det'), b = game(1985, 'rio', 'det');
    fake.n = 12;
    expect(dist18(a)).toBe(dist18(b));
    expect(forSale27(a)).toEqual(forSale27(b));
    expect(nb19(a)).toEqual(nb19(b));
  });
});
