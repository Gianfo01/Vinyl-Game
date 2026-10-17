// R33 · MAPA33 — cidade expandida (periferia leste e orla sul) e lote coerente para cada tipo de prédio novo.
//   • com exp33.mapa desligado o mapa é o de sempre (7 bairros, nada reservado, mesmo layout);
//   • lotes novos: sem sobreposição, fora da rua, dentro da grade, em terra em todas as cidades;
//   • registro "tipo → onde": banco no centro, estádio na periferia, porto só com água, escola de samba só no Rio;
//   • ligado: o lote do tipo pedido fica reservado e o bairro certo abre quando falta lote.
import { describe, expect, it } from 'vitest';
import { off33c } from './helpers/off33';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceWeek } from '../src/sim/tick';
import { DIST18, DIST_BASE18, LOTS18, buildings18, campus18, dist18, layout18, lotsOpen18 } from '../src/sim/sys/campus18';
import { GEO31, mapGeo31, terrainAt31 } from '../src/data/geo31';
import { SW_MAPA33, assign33, lotFor33, mapaOn33, registerSite33, reserved33, setWant33, siteHere33, sitesTable33 } from '../src/sim/r33/mapa33';
import { setSw } from '../src/sim/r31/switches';
import { roadAt18 } from '../src/ui/pixel/campus18px';
import { forSale27 } from '../src/ui/pixel/city27';

const game = (year: number, city: string) => {
  const cfg = defaultConfig(`mapa33-${city}-${year}`, { startYear: year, homeCity: city });
  (cfg as { dbSize?: string }).dbSize = 'small';
  const g = createGame(off33c(cfg)); // QA33: 33 ligada por padrão
  advanceWeek(g);
  return g;
};

describe('r33 MAPA33: desligado = mapa de sempre', () => {
  it('padrão desligado; mesmo com tudo aberto e pedidos ligados só os 7 bairros de sempre existem e nada é reservado', () => {
    const g = game(2036, 'london');
    expect(mapaOn33(g)).toBe(false);
    campus18(g).dist = DIST18.length - 1;
    setWant33('stadium', () => true);
    expect(dist18(g)).toBe(DIST_BASE18 - 1);
    expect(lotsOpen18(g)).toBe(DIST18[DIST_BASE18 - 1].end);
    expect(reserved33(g).size).toBe(0);
    setWant33('stadium', undefined);
    expect(DIST18[DIST_BASE18 - 1].end).toBe(58);
  });
});

describe('r33 MAPA33: lotes novos', () => {
  const ext = LOTS18.slice(58);
  it('26 lotes novos: não se sobrepõem a nenhum outro, não caem na rua, cabem na grade do bairro', () => {
    expect(LOTS18.length).toBe(84);
    expect(DIST18.map((d) => d.end).slice(-2)).toEqual([66, 84]);
    ext.forEach((a, k) => {
      const i = 58 + k, D = DIST18.find((x) => i < x.end)!;
      expect(a.gx + a.w, `lote ${i}`).toBeLessThanOrEqual(D.gw);
      expect(a.gy + a.d, `lote ${i}`).toBeLessThanOrEqual(D.gh);
      for (let x = a.gx + 0.25; x < a.gx + a.w; x += 0.5) for (let y = a.gy + 0.25; y < a.gy + a.d; y += 0.5) expect(roadAt18(x, y), `lote ${i} na rua`).toBe(false);
      LOTS18.forEach((b, j) => { if (j !== i) expect(a.gx < b.gx + b.w && b.gx < a.gx + a.w && a.gy < b.gy + b.d && b.gy < a.gy + a.d, `${i} x ${j}`).toBe(false); });
    });
  });
  it('em terra em todas as cidades da tabela de geografia, nos dois mapas novos', () => {
    for (const g of [...Object.values(GEO31), ...Object.keys(GEO31).map(mapGeo31)]) for (const [gw, gh] of [[56, 32], [56, 40]]) for (const lot of ext) {
      if (lot.gx + lot.w > gw || lot.gy + lot.d > gh) continue;
      expect(terrainAt31(g, lot.gx + lot.w / 2, lot.gy + lot.d / 2, gw, gh).t, `${g.city} ${gw}x${gh}`).toBe('land');
    }
  });
});

describe('r33 MAPA33: tipo → onde pode ficar', () => {
  it('cada tipo no seu lugar: banco no centro, estádio na periferia, porto só com água, escola de samba só no Rio', () => {
    const lon = game(1962, 'london'), rio = game(1962, 'rio'), sp = game(1962, 'sao_paulo');
    expect(lotFor33(lon, 'bank')).toBeLessThan(14);
    expect(lotFor33(lon, 'stadium')).toBeGreaterThanOrEqual(14);
    expect(LOTS18[lotFor33(lon, 'stadium')!].gx).toBeGreaterThanOrEqual(22);
    expect(siteHere33(rio, 'samba_school')).toBe(true);
    expect(LOTS18[lotFor33(rio, 'samba_school')!].name.pt).toBe('Quadra do samba');
    expect(siteHere33(lon, 'samba_school')).toBe(false);
    expect(siteHere33(rio, 'harbor')).toBe(true);
    expect(siteHere33(lon, 'harbor')).toBe(true); // Tâmisa
    expect(siteHere33(sp, 'harbor')).toBe(false); // sem água
    expect(sitesTable33('sao_paulo').some((r) => r.kind === 'harbor')).toBe(false);
  });
  it('cada tipo tem um lote só dele na cidade', () => {
    for (const c of ['london', 'rio', 'sao_paulo', 'new_york']) {
      const lots = [...assign33(c).values()];
      expect(new Set(lots).size).toBe(lots.length);
      expect(lots.every((n) => LOTS18[n])).toBe(true);
    }
  });
});

describe('r33 MAPA33: ligado, com tipos de exemplo', () => {
  it('tipo pedido reserva o lote (fora do preenchimento e das placas) e abre o bairro quando falta lote', () => {
    const g = game(1962, 'london');
    setSw(g, SW_MAPA33, true);
    registerSite33({ kind: 'teste_periferia', label: { pt: 'Exemplo', en: 'Example' }, zones: ['periferia'] });
    const lot = lotFor33(g, 'teste_periferia')!;
    expect(lot).toBeGreaterThanOrEqual(58);
    expect(reserved33(g).has(lot)).toBe(false); // ainda não pedido
    const d0 = dist18(g);
    setWant33('teste_periferia', () => true);
    expect(reserved33(g).has(lot)).toBe(true);
    expect(dist18(g)).toBeGreaterThanOrEqual(7); // pedido no bairro 7: a cidade cresce até lá
    expect(d0).toBeLessThan(7);
    expect(lotsOpen18(g)).toBeGreaterThan(lot);
    const bs = buildings18(g);
    expect([...layout18(g, bs).values()]).not.toContain(lot);
    expect(forSale27(g).every((x) => x.lot !== lot)).toBe(true);
    setWant33('teste_periferia', undefined);
  });
  it('tipo pedido no centro não é tomado pelo preenchimento automático', () => {
    const g = game(1962, 'london');
    setSw(g, SW_MAPA33, true);
    const lot = lotFor33(g, 'bank')!;
    const before = [...layout18(g, buildings18(g)).values()];
    setWant33('bank', () => true);
    const after = [...layout18(g, buildings18(g)).values()];
    expect(after).not.toContain(lot);
    expect(before.length).toBe(after.length);
    setWant33('bank', undefined);
  });
});
