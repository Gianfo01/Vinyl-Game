// Rodada 27 (D2): "Nosso mundo" vivo — estado do jogo → decisões visuais (funções puras de ui/pixel/city27.ts).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceWeek } from '../src/sim/tick';
import { startSession } from '../src/sim/studio';
import { scandal17 } from '../src/sim/scandal17';
import { LOTS18, buildings18, campus18, layout18, startProj18, freeLots18 } from '../src/sim/sys/campus18';
import { nb19 } from '../src/sim/sys/hood19';
import { VENUES17, v17 } from '../src/sim/sys/venues17';
import {
  GLASS_FROM27, HQ_FLOORS27, ICON27, SALE_MAX27, bldVis27, cityLook27, climate27, env27, era27, fillerLots27, forSale27, hqExt27, life27, lmPop27, mapLms27, nbInfo27, panel27, season27,
} from '../src/ui/pixel/city27';
import { plan27, shellOf27 } from '../src/ui/ps/hqpx27';
import { hasBespoke27 } from '../src/ui/pixel/lmiso27';
import { liftSign27, type SaleSign27 } from '../src/ui/pixel/campus18px';

const game = (city: string, year: number, seed = 'r27') => {
  const cfg = defaultConfig(`${seed}-${city}-${year}`, { scenario: 'established', startYear: year, homeCity: city });
  (cfg as { dbSize?: string }).dbSize = 'small';
  const g = createGame(cfg);
  advanceWeek(g);
  return g;
};
const mine = (g: ReturnType<typeof game>) => Object.values(g.acts).filter((a) => a.owner === 'player');

describe('r27 clima e estação', () => {
  it('clima por cidade: trópico, ameno, frio, árido', () => {
    expect(climate27('rio', -22.9)).toBe('tropical');
    expect(climate27('london', 51.5)).toBe('mild');
    expect(climate27('new_york', 40.7)).toBe('cold');
    expect(climate27('cairo', 30)).toBe('arid');
  });
  it('estação pelo hemisfério', () => {
    expect(season27(0, -22.9)).toBe('summer');
    expect(season27(0, 51.5)).toBe('winter');
    expect(season27(6, -22.9)).toBe('winter');
  });
  it('neve só onde há inverno: nunca no Rio, sempre em NY no inverno, rara em Londres', () => {
    let rioSnow = 0, nySnow = 0, lonSnow = 0, lonRain = 0;
    for (let y = 1950; y < 2050; y++) {
      for (const m of [0, 1, 6, 7, 11]) if (env27(y, m, -22.9, 'rio').snow) rioSnow++;
      if (env27(y, 0, 40.7, 'new_york').snow) nySnow++;
      const e = env27(y, 0, 51.5, 'london');
      if (e.snow) lonSnow++;
      if (e.rain) lonRain++;
    }
    expect(rioSnow).toBe(0);
    expect(nySnow).toBe(100);
    expect(lonSnow).toBeGreaterThan(0);
    expect(lonSnow).toBeLessThan(35);
    expect(lonRain).toBeGreaterThan(30);
    expect(env27(2005, 6, 40.7, 'new_york').snow).toBe(false); // verão
    expect(env27(1985, 0, -22.9, 'rio').vivid || env27(1985, 0, -22.9, 'rio').rain).toBe(true);
  });
  it('determinístico', () => {
    expect(env27(1962, 0, 51.5, 'london')).toEqual(env27(1962, 0, 51.5, 'london'));
  });
});

describe('r27 época e cidade', () => {
  it('postes e letreiros por época', () => {
    expect([era27(1900).lamp, era27(1930).lamp, era27(1962).lamp, era27(2015).lamp]).toEqual(['gas', 'iron', 'sodium', 'led']);
    expect([era27(1910).sign, era27(1962).sign, era27(1985).sign, era27(2005).sign, era27(2035).sign]).toEqual(['painted', 'neon', 'neon80', 'screen', 'holo']);
    expect(era27(1950).hats).toBe(true);
    expect(era27(1985).outfit).toContain('#ff48c8'); // neon dos anos 80 nas roupas
  });
  it('cara da cidade: Rio (morro + mar), Nova York (torres), Londres (tijolo)', () => {
    const rio = cityLook27('rio', -22.9, 1985), ny = cityLook27('new_york', 40.7, 2005), lon = cityLook27('london', 51.5, 1962);
    expect(rio.k).toBe('bay'); expect(rio.hill && rio.sea && rio.palms).toBe(true);
    expect(ny.k).toBe('towers'); expect(ny.tall).toBe(true);
    expect(lon.k).toBe('brick'); expect(lon.brick).toBe(true);
    expect(cityLook27('nashville', 36, 1960).k).toBe('plain');
  });
  it('ícone distinto para cada tipo de prédio', () => {
    const ks = Object.keys(ICON27) as (keyof typeof ICON27)[];
    const ics = new Set(ks.map((k) => ICON27[k].ic));
    expect(ics.size).toBe(ks.length);
  });
});

describe('r27 estado dos prédios', () => {
  it('sessão gravando: sede (sem estúdio próprio) acesa com fila de músicos', () => {
    const g = game('london', 1962);
    const a = mine(g).find((x) => Object.values(g.songs).some((sg) => sg.actId === x.id && !sg.recorded));
    expect(a).toBeTruthy();
    const songs = Object.values(g.songs).filter((x) => x.actId === a!.id && !x.recorded).map((x) => x.id).slice(0, 2);
    const r = startSession(g, a!.id, songs, 0, 'balanced');
    expect((r as { id?: string }).id).toBeTruthy();
    const v = bldVis27(g).get('hq')!;
    expect(v.lit).toBe(true);
    expect(v.queue).toBeGreaterThan(0);
    expect(v.queueK).toBe('musicians');
    expect(v.why.length).toBeGreaterThan(0);
  });
  it('obra: andaime + prazo em meses; noite de show: marquise acesa + fila', () => {
    const g = game('rio', 1985);
    g.player.cash += 5e9;
    const lot = freeLots18(g)[0];
    expect(startProj18(g, 'dorm', lot, 1)).toBeNull();
    const vis = bldVis27(g);
    const w = vis.get('c:dorm')!;
    expect(w.scaffold).toBe(true);
    expect(w.eta).toBeGreaterThan(0);
    const d = VENUES17.find((x) => x.city === 'rio' && x.from <= 1985 && (!x.to || x.to > 1985))!;
    v17(g).own.push({ id: d.id, y: 1980, cond: 80, rep: 50, policy: 'curated', price: 'mid', maint: true, paid: 0, booked: [], total: 0, last: { nights: 8, att: 3000, net: 1000, why: [] } });
    const vv = bldVis27(g).get(`ve:${d.id}`)!;
    expect(vv.marquee).toBe(true);
    expect(vv.queue).toBeGreaterThan(0);
    expect(vv.icon).toBe(ICON27.venue.ic);
  });
  it('alertas: prédio danificado conta no ícone', () => {
    const g = game('london', 1962);
    campus18(g).dmg.hq = { y: g.year, why: { pt: 'Incêndio.', en: 'Fire.' } } as never;
    const v = bldVis27(g).get('hq')!;
    expect(v.alerts).toBeGreaterThan(0);
  });
});

describe('r27 lotes à venda', () => {
  it('só aparecem quando cabem no caixa; no máximo 3; o resto vira cidade comum', () => {
    const g = game('new_york', 2005);
    g.player.cash = 0;
    expect(forSale27(g)).toEqual([]);
    g.player.cash = 5e9;
    const sale = forSale27(g);
    expect(sale.length).toBeGreaterThan(0);
    expect(sale.length).toBeLessThanOrEqual(SALE_MAX27);
    const used = new Set(layout18(g, buildings18(g)).values()), nbl = new Set(nb19(g).map((x) => x.lot));
    for (const x of sale) { expect(used.has(x.lot)).toBe(false); expect(nbl.has(x.lot)).toBe(false); expect(x.price).toBeGreaterThan(0); expect(ICON27[x.kind]).toBeTruthy(); }
    const filler = fillerLots27(g, sale);
    const all = new Set([...used, ...nbl, ...sale.map((x) => x.lot), ...filler, ...campus18(g).proj.map((p) => p.lot), 0]);
    expect(all.size).toBe(LOTS18.length);
    for (const f of filler) expect(sale.some((x) => x.lot === f)).toBe(false);
  });
});

describe('r27 vida na rua', () => {
  it('turnê → ônibus; disco na parada → fãs; escândalo → imprensa', () => {
    const g = game('rio', 1985);
    const a = mine(g)[0];
    let lf = life27(g);
    expect(lf.bus).toBeUndefined();
    g.tours.push({ id: 't27', actId: a.id, name: 'Turnê 27', stops: [], setlist: [], minutes: 60, production: 1, role: 'headline', crew: 3, pay: 'door', costReserved: 0, revenue: 0, costs: 0, status: 'running', log: [], accidents: 0 });
    const any = Object.values(g.releases)[0];
    g.releases.r27 = { ...any, id: 'r27', owner: 'player', actId: a.id, title: 'Teste' };
    g.charts.singles.unshift({ releaseId: 'r27', units: 1, pos: 1, last: 2, weeks: 1 });
    scandal17(g).last[a.id] = { w: g.week, kind: 'drugs', sev: 3, eff: 1, why: [] };
    lf = life27(g);
    expect(lf.bus?.tour).toBe('Turnê 27');
    expect(lf.fans).toBeGreaterThanOrEqual(12);
    expect(lf.fansWhy?.pt).toContain('#1');
    expect(lf.press).toBeGreaterThan(0);
    scandal17(g).last[a.id].w = g.week - 30; // escândalo antigo: imprensa já foi embora
    expect(life27(g).press).toBe(0);
  });
});

describe('r27 vizinhos e painel', () => {
  it('vizinhos com nome: quem são e o que estão fazendo', () => {
    const g = game('london', 1962);
    const ns = nbInfo27(g);
    expect(ns.length).toBe(nb19(g).length);
    for (const n of ns) { expect(n.who.pt.length).toBeGreaterThan(0); expect(n.doing.en.length).toBeGreaterThan(0); }
  });
  it('painel da sede: entrar, custo, quem está lá, até 3 ações principais', () => {
    const g = game('london', 1962);
    const p = panel27(g, 'hq')!;
    expect(p.enter).toBe(true);
    expect(p.cost).toBeDefined();
    expect(p.who.length).toBeGreaterThan(0);
    expect(p.main.length).toBeLessThanOrEqual(3);
    for (const a of p.main) expect(['go', 'up', 'sell', 'reno', 'rush']).toContain(a.id);
    expect(panel27(g, 'nada')).toBeNull();
  });
  it('não mexe no estado nem no sorteio', () => {
    const g = game('new_york', 2005);
    g.player.cash += 1e9;
    const rng = JSON.stringify(g.rng), cash = g.player.cash;
    bldVis27(g); forSale27(g); life27(g); nbInfo27(g); panel27(g, 'hq');
    expect(JSON.stringify(g.rng)).toBe(rng);
    expect(g.player.cash).toBe(cash);
  });
});

// ---------------------------------------------------------------- r27 (I2): direção de arte (docs/art27-city.md)

describe('r27 (I2) sede por fora = sede por dentro', () => {
  it('mesma casca e mesmo número de andares do corte do interior', () => {
    for (let hq = 0; hq <= 5; hq++) for (const year of [1925, 1962, 1990, 2020]) {
      const x = hqExt27({ level: hq, year });
      expect(x.shell).toBe(shellOf27(hq));
      expect(x.floors).toBe(HQ_FLOORS27[x.shell]);
      expect(x.floors).toBe(plan27({ hq, year }).floors);
    }
  });
  it('sem pele de vidro antes de 1968 (nem se o jogador escolher vidro)', () => {
    for (let hq = 0; hq <= 5; hq++) for (let year = 1890; year < GLASS_FROM27; year += 3) {
      expect(hqExt27({ level: hq, year }).glass).toBe(false);
      expect(hqExt27({ level: hq, year, style: 'glass' }).facade).not.toBe('glass');
    }
    expect(hqExt27({ level: 4, year: 2005 }).glass).toBe(true);
    expect(hqExt27({ level: 4, year: 1962 }).facade).toBe('midcentury');
    expect(hqExt27({ level: 4, year: 1935 }).roof).toBe('crown');
  });
  it('andares comprados (I1) e obra: mais andares, andaime no topo, guindaste só a partir do prédio', () => {
    const a = hqExt27({ level: 3, year: 1990, floorsOpen: 3 }) /* r27: último andar ainda à venda */, b = hqExt27({ level: 3, year: 1990, floorsOpen: 4, building: true });
    expect(b.floors).toBe(4);
    expect(b.H).toBeGreaterThan(a.H + a.fh);
    expect(b.crane).toBe(true);
    expect(hqExt27({ level: 0, year: 1990, building: true }).crane).toBe(false);
    expect(hqExt27({ level: 2, year: 1990 }).facade).toBe('loft');
  });
});

describe('r27 (I2) marcos no mapa', () => {
  const ids = (c: string, y: number) => mapLms27(c, y).map((x) => x.id);
  it('respeitam o ano de construção e demolição', () => {
    expect(ids('sydney', 1965)).not.toContain('syd_opera');
    expect(ids('sydney', 1980)).toContain('syd_opera');
    expect(ids('berlin', 1965)).not.toContain('ber_tv');
    expect(ids('berlin', 1975)).toContain('ber_tv');
    expect(ids('berlin', 1995)).not.toContain('ber_wall');
    expect(ids('sao_paulo', 1960)).not.toContain('sp_masp');
    expect(ids('sao_paulo', 1995)).toContain('sp_masp');
    expect(ids('new_york', 1990)).toContain('ny_wtc');
    expect(ids('new_york', 2005)).not.toContain('ny_wtc');
    expect(ids('rio', 1925)).toContain('rio_corcovado');
    expect(ids('rio', 1985)).toEqual(expect.arrayContaining(['rio_christ', 'rio_cable']));
  });
  it('os mais icônicos primeiro (Big Ben e Tower Bridge em Londres, mesmo depois de 1965)', () => {
    for (const y of [1962, 1975, 2010]) expect(ids('london', y)).toEqual(expect.arrayContaining(['lon_bigben', 'lon_tbridge']));
    expect(ids('paris', 1975)).toContain('par_eiffel');
    expect(ids('tokyo', 2015)).toEqual(expect.arrayContaining(['tok_tower', 'tok_sky']));
  });
  it('no máximo 4, bastidores distintos; cidade sem cadastro usa genéricos', () => {
    for (const c of ['london', 'new_york', 'rio', 'tokyo', 'lagos', 'goiania']) {
      const m = mapLms27(c, 2000);
      expect(m.length).toBeLessThanOrEqual(4);
      expect(new Set(m.map((x) => x.slot)).size).toBe(m.length);
    }
    expect(mapLms27('goiania', 1990).length).toBeGreaterThan(0);
    expect(mapLms27('goiania', 1990)[0].id.startsWith('gen_')).toBe(true);
  });
  it('as 15+ cidades mais comuns têm desenho próprio para pelo menos um marco', () => {
    const cities = ['new_york', 'london', 'rio', 'sao_paulo', 'memphis', 'nashville', 'liverpool', 'manchester', 'detroit', 'paris', 'tokyo', 'berlin', 'sydney', 'los_angeles', 'chicago', 'seattle', 'toronto', 'washington'];
    for (const c of cities) expect(mapLms27(c, 2000).some((x) => hasBespoke27(x.id)), c).toBe(true);
  });
  it('popup de marco só do mapa (MASP) com ano e fato', () => {
    const p = lmPop27('sao_paulo', 'sp_masp', 1990)!;
    expect(p.rows[0].v).toBe('1968');
    expect(lmPop27('sao_paulo', 'sp_masp', 1960)).toBeNull();
  });
  it('favela só no Rio; Sydney tem porto baixo', () => {
    expect(cityLook27('rio', -22.9, 1985).favela).toBe(true);
    expect(cityLook27('sydney', -33.9, 1985).favela).toBe(false);
    expect(cityLook27('sydney', -33.9, 1985).hillAmp).toBeLessThan(0.5);
    expect(cityLook27('paris', 48.9, 1975).k).toBe('stone');
  });
});

describe('r27 (I2) placa À venda não some atrás do prédio da frente', () => {
  const sign = (): SaleSign27 => ({ lot: 4, c: { width: 30, height: 19 } as HTMLCanvasElement, x: 100, y: 100, d: 12, base: [115, 118] });
  it('prédio da frente cobrindo: a placa sobe acima do telhado dele', () => {
    const sg = sign();
    liftSign27(sg, [{ depth: 14, box: [95, 60, 140, 130] }]);
    expect(sg.lift).toBe(true);
    expect(sg.y + sg.c.height).toBeLessThanOrEqual(60);
  });
  it('prédio de trás (ou longe) não mexe na placa', () => {
    const sg = sign();
    liftSign27(sg, [{ depth: 10, box: [95, 60, 140, 130] }, { depth: 14, box: [200, 60, 240, 130] }]);
    expect(sg.lift).toBeUndefined();
    expect(sg.y).toBe(100);
  });
});
