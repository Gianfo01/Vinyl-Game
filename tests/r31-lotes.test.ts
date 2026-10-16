// R31 · onda 4 (LOTE) — registro único de lotes da cidade: quase todo prédio do mapa tem função (negócio que existe,
// terreno à venda ou seu, casa de quem mora na cidade). Varredura por cidade e época (falha abaixo de 90%), compra de
// terreno (transação atribuída, bem no balanço, placa "seu"), casa que muda de dono na virada do mês, cena da casa,
// editor e interruptor, determinismo, e abrir não muda o mundo.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceWeek } from '../src/sim/tick';
import type { GameState } from '../src/sim/types';
import { setSw } from '../src/sim/r31/switches';
import { applyEdit, setEditorOn } from '../src/sim/r31/editor';
import { txnTotal } from '../src/sim/r31/txn';
import { buyLot31, homeLog31, homesMonth31, lotLock31, lotPrice31, lots31, ownsLot31, peekLots31, residents31 } from '../src/sim/sys/lots31';
import { placeActs27 } from '../src/sim/sys/place27';
import { cityLots31 } from '../src/ui/pixel/lots31map';
import { auditInside31, insideModel31 } from '../src/ui/r31/inside31model';

const game = (seed: string, year: number, city: string): GameState => {
  const s = createGame(defaultConfig(seed, { scenario: 'established', startYear: year, dbSize: 'small', homeCity: city } as Parameters<typeof defaultConfig>[1]));
  for (let i = 0; i < 5; i++) advanceWeek(s); // passa uma virada de mês
  return s;
};
const CITIES = ['new_york', 'sao_paulo', 'london', 'rio'];
const YEARS = [1925, 1975, 2012, 2036];
const META = 0.9;

describe('r31 LOTE: varredura — prédios do mapa com função, por cidade e época', () => {
  it(`≥ ${META * 100}% com o registro ligado (4 cidades × 4 épocas); desligado mede menos ou igual`, () => {
    const rows: string[] = [];
    for (const city of CITIES) for (const y of YEARS) {
      const s = game(`lote-scan-${city}-${y}`, y, city);
      const on = cityLots31(s);
      expect(on.cells.length, `${city} ${y}`).toBeGreaterThan(10);
      expect(on.cover, `${city} ${y}: ${on.cells.filter((c) => c.fn === 'none').map((c) => c.k ?? c.lot).join(',')}`).toBeGreaterThanOrEqual(META);
      setSw(s, 'lots31', false);
      const off = cityLots31(s);
      expect(off.cover).toBeLessThanOrEqual(on.cover);
      expect(off.places.some((p) => p.k === 'home' || p.k === 'vacant')).toBe(false);
      rows.push(`${city} ${y}: ${Math.round(on.cover * 100)}% (desligado ${Math.round(off.cover * 100)}%)`);
    }
    expect(rows.length).toBe(16);
  }, 240000);

  it('casas de quem mora na cidade aparecem no mapa (família Fossati em São Paulo; CEO ou artista com porte)', () => {
    const s = game('lote-homes', 2036, 'sao_paulo');
    const c = cityLots31(s);
    const homes = c.places.filter((p) => p.k === 'home');
    expect(homes.length).toBeGreaterThan(0);
    // a Casa Fossati: da frente FOS quando ela existe (fam31), senão uma das casas do registro
    expect(c.places.some((p) => p.fam31 || p.lot31?.who === 'fam')).toBe(true);
    expect(c.places.filter((p) => p.fam31 || p.lot31?.who === 'fam').length).toBe(1);
    expect(c.cells.some((x) => x.who === 'fam' && x.fn === 'home')).toBe(true);
    for (const p of homes) {
      expect([0, 1, 2]).toContain(p.lot31?.tier);
      expect(p.people.length).toBeGreaterThan(0);
      expect(JSON.stringify(p.name)).not.toMatch(/undefined|NaN|p:|l:/);
    }
    const r = residents31(s);
    expect(r.some((x) => x.kind === 'artist')).toBe(true);
  }, 60000);
});

describe('r31 LOTE: comprar terreno', () => {
  const vacant = (s: GameState) => cityLots31(s).sale.find((x) => !x.own)!;
  it('motivo de bloqueio antes do clique; compra é transação atribuída, vira bem e o lote aparece como seu', () => {
    const s = game('lote-buy', 1975, 'new_york');
    const sl = vacant(s);
    expect(sl).toBeTruthy();
    const price = lotPrice31(s, sl.lot);
    expect(price).toBeGreaterThan(0);
    s.player.cash = 0;
    expect(lotLock31(s, sl.lot)).not.toBeNull();
    expect(buyLot31(s, sl.lot).ok).toBe(false);
    s.player.cash = price * 3;
    expect(lotLock31(s, sl.lot)).toBeNull();
    const assets0 = s.assets.length;
    const r = buyLot31(s, sl.lot);
    expect(r.ok).toBe(true);
    expect(s.player.cash).toBe(price * 2);
    expect(s.assets.length).toBe(assets0 + 1);
    expect(s.assets[s.assets.length - 1].lifeMonths).toBe(0);
    expect(txnTotal(s, 'project', `lot31:${sl.lot}`, 'inv')).toBe(-price);
    expect(ownsLot31(s, sl.lot)).toBe(true);
    const after = cityLots31(s);
    expect(after.cells.find((c) => c.lot === sl.lot)?.fn).toBe('own');
    expect(after.sale.find((x) => x.lot === sl.lot)?.own).toBe(true);
    expect(buyLot31(s, sl.lot).ok).toBe(false); // já é seu
    expect(after.cover).toBeGreaterThanOrEqual(META);
  }, 60000);

  it('interruptor desligado: não compra; editor dá e tira terreno', () => {
    const s = game('lote-sw', 1975, 'london');
    const sl = vacant(s);
    setSw(s, 'lots31', false);
    s.player.cash = 1e12;
    expect(buyLot31(s, sl.lot).ok).toBe(false);
    setSw(s, 'lots31', true);
    setEditorOn(s, true);
    expect(applyEdit(s, 'lots31.give', sl.lot).ok).toBe(true);
    expect(ownsLot31(s, sl.lot)).toBe(true);
    expect(applyEdit(s, 'lots31.take', sl.lot).ok).toBe(true);
    expect(ownsLot31(s, sl.lot)).toBe(false);
  }, 60000);
});

describe('r31 LOTE: a casa muda de dono na virada do mês', () => {
  it('morreu → deixa a casa (com o motivo) e a fila entra; determinístico', () => {
    const s = game('lote-owner', 2012, 'new_york');
    const st = lots31(s);
    const [slot, hm] = Object.entries(st.h).map(([k, v]) => [+k, v] as const).find(([, v]) => v.who.startsWith('p:'))!;
    s.persons[hm.who.slice(2)].alive = false;
    const r = homesMonth31(s);
    expect(r.out).toBeGreaterThanOrEqual(1);
    expect(st.h[slot]?.who).not.toBe(hm.who);
    expect(homeLog31(s, 10).some((e) => !e.in && e.why?.pt === 'morreu')).toBe(true);
    // editor: mudar o morador da 1ª casa
    setEditorOn(s, true);
    const other = residents31(s).find((x) => x.who !== st.h[0]?.who)!;
    expect(applyEdit(s, 'lots31.owner', other.who).ok).toBe(true);
    expect(lots31(s).h[0].who).toBe(other.who);
  }, 60000);

  it('mesma semente → mesmos moradores', () => {
    const a = game('lote-det', 1975, 'london'), b = game('lote-det', 1975, 'london');
    for (let i = 0; i < 9; i++) { advanceWeek(a); advanceWeek(b); }
    expect(JSON.stringify(peekLots31(a))).toBe(JSON.stringify(peekLots31(b)));
  }, 60000);
});

describe('r31 LOTE: casa por dentro e explorar não muda o mundo', () => {
  it('cena da casa: objetos e pessoas clicáveis, ações que já existem; abrir mapa, casa e ações não muda o estado', () => {
    const s = game('lote-open', 2036, 'sao_paulo');
    const before = JSON.stringify(s);
    const c = cityLots31(s);
    const homes = c.places.filter((p) => p.k === 'home');
    for (const p of homes) {
      const m = insideModel31(s, { id: p.id, k: 'home', name: p.name.pt, what: p.what.pt, people: p.people, year: s.year, city: s.config.homeCity, seed: s.config.seed, place: p });
      expect(auditInside31(m)).toEqual([]);
      expect(m.spots.some((x) => !x.id.startsWith('who:') && x.id !== 'you')).toBe(true);
      expect(m.spots.some((x) => x.id.startsWith('who:'))).toBe(m.people.some((x) => !x.you)); // quem está em casa (agenda) é clicável
      placeActs27(s, p);
    }
    expect(homes.some((p) => p.people.some((x) => !x.away))).toBe(true);
    const art = homes.find((p) => p.lot31?.who?.startsWith('p:'));
    if (art) expect(placeActs27(s, art).map((a) => a.id)).toEqual(expect.arrayContaining(['visit', 'scout', 'deal']));
    for (const x of c.sale) lotLock31(s, x.lot);
    expect(JSON.stringify(s)).toBe(before);
  }, 60000);
});
