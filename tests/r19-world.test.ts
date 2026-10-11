// Rodada 19 (world19/hood19): lotes, vizinhança, ampliação em estágios, mudança de lote, popups (modelos puros),
// bairro, vizinhos, eventos e marcos da cidade (nada antes de existir nem depois de demolido).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { LANDMARKS19, landmarksAt19 } from '../src/data/landmarks19';
import { STYLE_CAT18, buildings18, campus18, decode18, encode18, freeLots18, layout18, startProj18, stylesAt18 } from '../src/sim/sys/campus18';
import { act19, bldPop19, lotPop19, near19, placeFor19, startPlace19, syn19, synAt19, world19 } from '../src/sim/sys/world19';
import { HOODS19, histAge19 } from '../src/data/hood19';
import { actEv19, evPop19, hood19, rollEv19, hoodStats19, lmPop19, nb19, nbPop19 } from '../src/sim/sys/hood19';
import { ventures } from '../src/sim/sys/ventures9';

const rich = (y: number, seed = 'w19', city?: string) => { const s = createGame(defaultConfig(seed, { startYear: y, ...(city ? { homeCity: city } : {}) })); s.player.cash += 5e9; s.player.initialCash += 5e9; return s; };
const freeLot = (s: ReturnType<typeof rich>, not: number[] = []) => freeLots18(s).find((n) => !not.includes(n) && !nb19(s).some((x) => x.lot === n))!;

describe('world19', () => {
  it('marcos: nunca antes de construído nem depois de demolido', () => {
    for (const lm of LANDMARKS19) {
      expect(landmarksAt19(lm.city, lm.from - 1).some((x) => x.id === lm.id)).toBe(false);
      if (lm.to) expect(landmarksAt19(lm.city, lm.to).some((x) => x.id === lm.id)).toBe(false);
    }
    expect(landmarksAt19('new_york', 1990).some((x) => x.id === 'ny_wtc')).toBe(true);
    expect(landmarksAt19('new_york', 2005).some((x) => x.id === 'ny_wtc')).toBe(false);
    expect(landmarksAt19('berlin', 1975).some((x) => x.id === 'ber_wall')).toBe(true);
    expect(landmarksAt19('berlin', 1995).some((x) => x.id === 'ber_wall')).toBe(false);
    expect(landmarksAt19('rio', 1925).some((x) => x.id === 'rio_christ')).toBe(false);
    expect(landmarksAt19('nowhere', 1900).length).toBeGreaterThan(0); // silhuetas genéricas
    for (let y = 1889; y <= 2040; y += 7) for (const c of ['rio', 'london', 'tokyo', 'xx']) expect(landmarksAt19(c, y).length).toBeLessThanOrEqual(4);
  });

  it('lote vazio: construir aqui (popup + ação), obra com prazo; vizinhança e popup do prédio', () => {
    const s = rich(1965);
    const lot = freeLot(s);
    const p = lotPop19(s, lot)!;
    expect(p.opts.some((o) => o.id === 'p:store' && !o.dis)).toBe(true);
    expect(p.opts.some((o) => o.id === 'v:platform')).toBe(false); // nada do futuro em 1965
    expect(act19(s, `lot:${lot}`, 'p:store', { q: 1 })).toBeNull();
    expect(buildings18(s).find((b) => b.id === 'c:store')?.st).toBe('planned');
    expect(bldPop19(s, 'c:store')!.acts.some((a) => a.id === 'cancel')).toBe(true);
    // fundar estúdio num lote ao lado da sede → sinergia estúdio×sede
    const near = freeLots18(s).find((n) => near19(0, n) && !nb19(s).some((x) => x.lot === n));
    expect(near).toBeDefined();
    expect(synAt19(s, 'studio', near!).some((x) => x.rule.id === 'studio-hq')).toBe(true);
    expect(act19(s, `lot:${near}`, 'v:studio')).toBeNull();
    const v = ventures(s).list.find((x) => x.kind === 'studio')!;
    expect(layout18(s, buildings18(s)).get(`v:${v.id}`)).toBe(near);
    expect(buildings18(s).find((b) => b.id === `v:${v.id}`)?.st).toBe('building');
    for (let i = 0; i < 4; i++) advanceMonth(s);
    expect(syn19(s).some((x) => x.rule.id === 'studio-hq')).toBe(true);
    const hp = bldPop19(s, `v:${v.id}`)!;
    expect(hp.rows.some((r) => r.why?.[0] === 'w19.syn')).toBe(true);
    expect(hp.rows.some((r) => r.why?.[0] === 'w19.upk')).toBe(true);
    expect(hp.acts.some((a) => a.id === 'up')).toBe(true);
    expect(bldPop19(s, 'hq')!.rows.some((r) => r.why?.[0] === 'h19.hood')).toBe(true);
  });

  it('ampliação em estágios, mudança de lote, renomear e vender', () => {
    const s = rich(1970, 'w19b');
    const lot = freeLot(s);
    expect(startProj18(s, 'sign', lot, 2)).toBeNull();
    for (let i = 0; i < 6 && campus18(s).proj.length; i++) advanceMonth(s);
    expect(campus18(s).built.sign).toBeTruthy();
    const lv0 = buildings18(s).find((b) => b.id === 'c:sign')!.lvl;
    expect(act19(s, 'c:sign', 'up', { q: 1 })).toBeNull();
    expect(buildings18(s).find((b) => b.id === 'c:sign')!.st).toBe('renovating');
    for (let i = 0; i < 8 && campus18(s).proj.length; i++) advanceMonth(s);
    expect(campus18(s).upl['c:sign']).toBe(1);
    expect(buildings18(s).find((b) => b.id === 'c:sign')!.lvl).toBe(lv0 + 1);
    const dest = freeLot(s, [lot]);
    expect(act19(s, 'c:sign', 'move', { lot: dest })).toBeNull();
    expect(campus18(s).built.sign!.lot).toBe(dest);
    expect(buildings18(s).find((b) => b.id === 'c:sign')!.st).toBe('renovating');
    expect(act19(s, 'c:sign', 'rename', { name: 'Neon do Selo' })).toBeNull();
    expect(buildings18(s).find((b) => b.id === 'c:sign')!.name).toBe('Neon do Selo');
    for (let i = 0; i < 3; i++) advanceMonth(s);
    const cash = s.player.cash;
    expect(act19(s, 'c:sign', 'sell')).toBeNull();
    expect(s.player.cash).toBeGreaterThan(cash);
    expect(campus18(s).built.sign).toBeUndefined();
  });

  it('bairro, vizinhos (compra), eventos com decisão e marcos clicáveis; saves antigos', () => {
    const s = rich(1962, 'w19c', 'london');
    const hs = hoodStats19(s);
    expect(hs.h.n.pt).toBe('Soho');
    expect(hoodStats19(s, 1966).hist).toBeGreaterThan(hs.hist); // Swinging London
    expect(hoodStats19(s, 1977).hist).toBeLessThan(hoodStats19(s, 1966).hist); // anos 70: Soho decadente
    const nbs = nb19(s);
    expect(nbs.length).toBeGreaterThan(0);
    expect(nbPop19(s, nbs[0].lot)?.acts.some((a) => a.id === 'buy')).toBe(true);
    expect(act19(s, `lot:${nbs[0].lot}`, 'p:park')).not.toBeNull(); // lote de vizinho não aceita obra
    expect(lmPop19(s, 'lon_bigben')).not.toBeNull();
    expect(lmPop19(s, 'lon_bt')).toBeNull(); // a torre é de 1965
    expect(lmPop19(s, 'lon_rah')!.acts.some((a) => a.go)).toBe(true);
    let e = null as null | { id: string; k: string };
    for (let i = 0; i < 90 && !e; i++) { s.month = (s.month + 1) % 12; if (!s.month) s.year++; rollEv19(s); e = hood19(s).evs.find((x) => !x.done) ?? null; }
    if (e) {
      expect(evPop19(s, e.id)!.acts.length).toBe(2);
      const c = evPop19(s, e.id)!.acts[1].id.slice(3);
      expect(actEv19(s, e.id, c)).toBeNull();
      expect(hood19(s).evs.find((x) => x.id === e!.id)!.done).toBe(c);
    }
    // save antigo: sem world19/hood19/upl
    const x4 = s.x4 as unknown as Record<string, unknown>;
    delete x4.world19; delete x4.hood19; delete (campus18(s) as unknown as Record<string, unknown>).upl;
    expect(world19(s).alias).toEqual({});
    expect(campus18(s).upl).toEqual({});
    expect(() => advanceMonth(s)).not.toThrow();
  }, 240000);

  it('determinístico: mesma semente, mesmo bairro e mesmos eventos', () => {
    const a = rich(1980, 'det'), b = rich(1980, 'det');
    for (let i = 0; i < 6; i++) { advanceMonth(a); advanceMonth(b); }
    for (const x of [a, b]) for (let m = 0; m < 30; m++) { x.month = m % 12; x.year = 1981 + Math.floor(m / 12); rollEv19(x); }
    expect(hood19(a).evs.map((e) => e.k)).toEqual(hood19(b).evs.map((e) => e.k));
    expect(nb19(a).map((x) => x.lot)).toEqual(nb19(b).map((x) => x.lot));
  }, 240000);

  it('começo pequeno: o lugarzinho da época e da carreira; some depois da 1ª ampliação', () => {
    expect(placeFor19(1900, 'label')).toBe('parlour');
    expect(placeFor19(1935, 'label')).toBe('backroom');
    expect(placeFor19(1955, 'artist')).toBe('garage');
    expect(placeFor19(1995, 'artist')).toBe('bedroom');
    expect(placeFor19(2022, 'label')).toBe('homestudio');
    const s = rich(1955, 'w19p');
    const hq = buildings18(s).find((b) => b.kind === 'hq')!;
    expect(hq.place).toBe('garage');
    expect(s.player.hq).toBeLessThanOrEqual(1);
    expect(bldPop19(s, 'hq')!.notes.some((n) => typeof n.t !== 'string' && n.t.pt.startsWith('Começo modesto'))).toBe(true);
    s.player.hq += 1;
    expect(startPlace19(s)).toBeNull();
    expect(buildings18(s).find((b) => b.kind === 'hq')!.place).toBeUndefined();
    // save antigo (sem h0) com sede já grande: nada de garagem
    const o = rich(1990, 'w19o'); o.player.hq = 3; delete world19(o).h0;
    expect(buildings18(o).find((b) => b.kind === 'hq')!.place).toBeUndefined();
  });

  it('estilos: só os que já existiam, ≥5 em qualquer ano; escolhido persiste, custa e aparece no retrato', () => {
    for (let y = 1889; y <= 2040; y += 5) expect(stylesAt18(y).length).toBeGreaterThanOrEqual(5);
    expect(stylesAt18(1900).map((x) => x.id)).not.toContain('brutal');
    expect(stylesAt18(1960).map((x) => x.id)).toContain('brutal');
    expect(stylesAt18(1970).map((x) => x.id)).not.toContain('postmod');
    expect(stylesAt18(1990).map((x) => x.id)).toContain('glass');
    expect(stylesAt18(1995).map((x) => x.id)).not.toContain('eco');
    expect(stylesAt18(1915).map((x) => x.id)).not.toContain('deco');
    expect(new Set(STYLE_CAT18.map((x) => x.id)).size).toBe(STYLE_CAT18.length);
    const s = rich(1972, 'w19s');
    const lot = freeLot(s);
    expect(act19(s, `lot:${lot}`, 'p:store', { q: 1, sty: 'neon' })).not.toBeNull(); // 1980+: do futuro
    expect(lotPop19(s, lot)!.sty!.list.some((x) => x.id === 'neon')).toBe(false);
    const c0 = lotPop19(s, lot, 1, undefined, 'brick')!.opts.find((o) => o.id === 'p:store')!.cost;
    const c1 = lotPop19(s, lot, 1, undefined, 'gothic')!.opts.find((o) => o.id === 'p:store')!.cost;
    expect(c1).toBeGreaterThan(c0);
    expect(act19(s, `lot:${lot}`, 'p:store', { q: 1, sty: 'loft' })).toBeNull();
    for (let i = 0; i < 8 && campus18(s).proj.length; i++) advanceMonth(s);
    advanceMonth(s);
    const b = buildings18(s).find((x) => x.id === 'c:store')!;
    expect(b.style).toBe('loft');
    expect(decode18(encode18(s, buildings18(s))).find((x) => x.id === 'c:store')!.style).toBe('loft');
    // reforma troca o estilo
    expect(act19(s, 'c:store', 'reno', { q: 1, sty: 'brutal' })).toBeNull();
    expect(buildings18(s).find((x) => x.id === 'c:store')!.style).toBe('loft'); // até a obra acabar
    for (let i = 0; i < 9 && campus18(s).proj.length; i++) advanceMonth(s);
    advanceMonth(s);
    expect(buildings18(s).find((x) => x.id === 'c:store')!.style).toBe('brutal');
  }, 240000);

  it('bairro segue a história real década a década (exato = só história; outros modos desviam)', () => {
    const gs: Record<string, ReturnType<typeof createGame>> = {};
    const at = (city: string, y: number) => hoodStats19((gs[city] ??= createGame(defaultConfig('h19h', { startYear: 1960, homeCity: city, history: 'strict' }))), y);
    const harlem = at('new_york', 1955);
    expect(harlem.h.n.pt).toBe('Harlem');
    expect(harlem.stage).not.toBe('pricey');
    expect(harlem.stage).toBe('artsy');
    const soho75 = at('new_york', 1975), soho01 = at('new_york', 2001);
    expect(soho75.h.n.pt).toBe('SoHo'); expect(soho75.stage).toBe('artsy');
    expect(soho01.h.n.pt).toBe('SoHo'); expect(soho01.stage).toBe('pricey');
    expect(at('new_york', 1964).stage).toBe('hip'); // Greenwich Village no boom do folk
    expect(at('berlin', 1980).stage).toBe('artsy'); // Kreuzberg à sombra do Muro
    expect(at('rio', 1965).stage).toBe('hip'); // Copacabana da bossa nova
    expect(at('rio', 1993).stage).toBe('artsy'); // Lapa abandonada antes do renascimento
    expect(at('detroit', 1975).stage).toBe('artsy'); // Motown já foi embora
    expect(at('tokyo', 1995).h.n.pt).toBe('Shimokitazawa');
    expect(at('nashville', 2018).stage).toBe('pricey');
    // nada do futuro: nomes e notas só a partir do ano em que valem
    expect(at('new_york', 1890).h.n.pt).not.toBe('Tin Pan Alley');
    expect(at('london', 1900).h.n.pt).not.toBe('Denmark Street');
    expect(at('new_york', 1932).note?.pt ?? '').not.toContain('Apollo');
    expect(at('new_york', 1936).note?.pt ?? '').toContain('Apollo');
    for (const xs of Object.values(HOODS19)) for (const h of xs) {
      expect(h.k.length).toBeGreaterThan(0);
      for (const [y, a] of h.k) { expect(a).toBeGreaterThanOrEqual(0); expect(a).toBeLessThanOrEqual(1); if (h.from > 0) expect(y).toBeGreaterThanOrEqual(h.from); if (h.to < 9999) expect(y).toBeLessThan(h.to); }
      expect(histAge19(h, h.k[0][0])).toBeCloseTo(h.k[0][1]);
    }
    // aluguel sempre dentro do teto (0,85..1,30)
    for (let y = 1889; y <= 2040; y += 3) for (const c of ['new_york', 'london', 'rio', 'boston']) { const r = at(c, y).rent; expect(r).toBeGreaterThanOrEqual(0.85); expect(r).toBeLessThanOrEqual(1.3); }
    // exato ignora o jogador; modo livre deixa os prédios desviarem a curva
    const ex = createGame(defaultConfig('h19d', { startYear: 1975, homeCity: 'new_york', history: 'strict' }));
    const lo = createGame(defaultConfig('h19d', { startYear: 1975, homeCity: 'new_york', history: 'loose' }));
    const sty = { a: 'glass', b: 'glass', c: 'glass', d: 'glass', e: 'glass' } as const;
    world19(ex).sty = { ...sty }; world19(lo).sty = { ...sty };
    expect(hoodStats19(ex).age).toBeCloseTo(hoodStats19(ex).hist);
    expect(hoodStats19(lo).age).not.toBeCloseTo(hoodStats19(lo).hist);
  }, 240000);
});
