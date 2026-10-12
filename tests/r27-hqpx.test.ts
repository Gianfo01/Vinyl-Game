// r27 (D1): a Sede em pixel art — planta pura (nível → salas, ano → equipamento/luz, cidade → horizonte) e
// pintura determinística num buffer Px (sem canvas do DOM).

import { describe, expect, it } from 'vitest';
import { HQ_LEVELS } from '../src/data/rules';
import { landmarksAt19 } from '../src/data/landmarks19';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import type { GameState } from '../src/sim/types';
import { hqModel25 } from '../src/ui/ps/hq25model';
import { GEAR27, facadeOf27, gearOf27, hash27, isNarrow27, lightOf27, lmSpots27, paint27, pickLms27, place27, plan27, roomsForLevel27, shellOf27 } from '../src/ui/ps/hqpx27';

const game = (seed: string, year = 1975): GameState => createGame(defaultConfig(seed, { scenario: 'established', startYear: year, dbSize: 'small' } as Parameters<typeof defaultConfig>[1]));
const sig = (hq: number, year: number, city = 'london', minW = 0) => { const p = paint27(plan27({ hq, year, city, brand: 'Selo', seedKey: 'k', minW })); return hash27(Array.from(p.d.slice(0, p.d.length).filter((_, i) => i % 7 === 0)).join(',')); };

describe('r27 nível da sede → casca e salas', () => {
  it('cada nível de HQ_LEVELS tem a sua casca', () => {
    expect(HQ_LEVELS.map((_, i) => shellOf27(i))).toEqual(['garage', 'shop', 'loft', 'building', 'tower', 'campus']);
  });
  it('salas desenhadas = salas abertas no modelo (minHq), por nível', () => {
    expect(roomsForLevel27(0).sort()).toEqual(['lobby', 'lounge', 'office', 'studio']);
    expect(roomsForLevel27(1).sort()).toEqual(['lobby', 'lounge', 'office', 'stage', 'studio']);
    for (let hq = 2; hq <= 5; hq++) expect(roomsForLevel27(hq).sort()).toEqual(['anr', 'lobby', 'lounge', 'office', 'stage', 'studio']);
    const s = game('r27-a');
    for (let hq = 0; hq <= 5; hq++) {
      s.player.hq = hq;
      const m = hqModel25(s);
      expect(roomsForLevel27(hq).sort()).toEqual(m.rooms.filter((r) => r.open).map((r) => r.id).sort());
    }
  });
  it('andares crescem com a sede; a torre tem salas de enfeite (imprensa, jurídico, estúdio B)', () => {
    const fl = [0, 1, 2, 3, 4, 5].map((hq) => plan27({ hq, year: 1980 }).floors);
    expect(fl).toEqual([1, 2, 3, 4, 5, 5]); // r27 I1: loft com mezanino, prédio com último andar (compráveis)
    const kinds = plan27({ hq: 4, year: 1980 }).cells.map((c) => c.kind);
    for (const k of ['press', 'legal', 'studioB']) expect(kinds).toContain(k);
    const deco = plan27({ hq: 4, year: 1980 }).cells.filter((c) => !c.room);
    for (const c of deco) expect(c.name?.pt).toBeTruthy();
    // garagem: um vão só (zonas sem parede), prédio pequeno ao lado de uma casa
    const g = plan27({ hq: 0, year: 1980 });
    for (let i = 1; i < g.cells.length; i++) expect(g.cells[i].x).toBe(g.cells[i - 1].x + g.cells[i - 1].w);
  });
});

describe('r27 ano → equipamento e luz', () => {
  it('gramofone/78 → rolo → mesa analógica → digital → laptop', () => {
    expect([1925, 1950, 1962, 1975, 1985, 1995, 2005, 2015, 2030].map(gearOf27)).toEqual(['shellac', 'shellac', 'reel', 'console', 'console', 'digital', 'digital', 'laptop', 'laptop']);
    expect(GEAR27.shellac.studio).toContain('lathe');
    expect(GEAR27.shellac.lounge).toContain('shellac_78s');
    expect(GEAR27.reel.studio).toContain('reel_to_reel');
    expect(GEAR27.console.studio).toContain('analog_console');
    expect(GEAR27.digital.studio).toContain('daw_screen');
    expect(GEAR27.laptop.studio).toContain('laptop');
    // nenhuma geração repete o estúdio da anterior
    const gs = Object.values(GEAR27).map((x) => x.studio.join());
    expect(new Set(gs).size).toBe(gs.length);
  });
  it('garagem tem uma lâmpada só; o resto segue a época', () => {
    expect(lightOf27('garage', 2020)).toBe('bulb');
    expect([1950, 1975, 2005, 2020].map((y) => lightOf27('loft', y))).toEqual(['pendant', 'globe', 'tube', 'led']);
  });
  it('horizonte da cidade-sede: marcos de pé no ano', () => {
    const p = plan27({ hq: 2, year: 2005, city: 'rio' });
    expect(p.lms).toEqual(landmarksAt19('rio', 2005).map((x) => x.sh));
    expect(p.lms.length).toBeGreaterThan(0);
  });
});

describe('r27 desenho determinístico', () => {
  it('mesma entrada → mesmos pixels; nível, ano, cidade e largura mudam o desenho', () => {
    expect(sig(2, 1975)).toBe(sig(2, 1975));
    const set = new Set([sig(2, 1975), sig(2, 1950), sig(2, 2005), sig(0, 1975), sig(4, 1975), sig(2, 1975, 'rio')]);
    expect(set.size).toBe(6);
    const p = plan27({ hq: 3, year: 1990, minW: 700 });
    expect(p.W).toBe(700);
    expect(p.bx + p.bw).toBeLessThanOrEqual(p.W);
    expect(plan27({ hq: 3, year: 1990, minW: 10 }).W).toBeGreaterThan(400); // nunca menor que o prédio (celular rola)
  });
  it('bonecos: pés no chão da sala certa, dentro dela, "+N" quando passa do limite', () => {
    const s = game('r27-b');
    s.player.hq = 2;
    for (let i = 0; i < 7; i++) s.player.staff.push({ id: `z${i}`, name: `P${i}`, role: 'admin', skill: 50, salary: 0, hiredWeek: 0 });
    const m = hqModel25(s);
    const p = plan27({ hq: m.hq, year: m.year });
    const { spots, more } = place27(p, m.rooms);
    expect(spots.length).toBe(m.rooms.reduce((a, r) => a + r.sprites.length, 0));
    for (const sp of spots) {
      const c = p.cells.find((x) => x.room === sp.room)!;
      expect(sp.x).toBeGreaterThan(c.x); expect(sp.x).toBeLessThan(c.x + c.w);
      expect(sp.y).toBe(c.y + c.h - 3);
    }
    expect(more.find((x) => x.room === 'office')?.n).toBeGreaterThan(0);
    // garagem: quem estaria no A&R (fechado) não aparece no desenho
    s.player.hq = 0;
    const m0 = hqModel25(s);
    const p0 = plan27({ hq: 0, year: m0.year });
    expect(place27(p0, m0.rooms).spots.every((x) => p0.rooms.includes(x.room))).toBe(true);
  });
});

describe('r27 I1 fachada por época, marcos visíveis, salas fechadas e rótulos', () => {
  it('torre de vidro só a partir de 1968 (antes pedra/art déco; depois contemporânea)', () => {
    for (const shell of ['tower', 'campus'] as const) {
      for (const y of [1925, 1950, 1967]) expect(['stone', 'deco']).toContain(facadeOf27(shell, y));
      expect(facadeOf27(shell, 1968)).toBe('glass');
      expect(facadeOf27(shell, 1994)).toBe('glass');
      expect(['contemporary', 'future']).toContain(facadeOf27(shell, 2005));
    }
    expect(facadeOf27('campus', 2030)).toBe('future');
    expect(plan27({ hq: 4, year: 1950 }).facade).toBe('deco');
    // a coroa (parte acima do corte) muda com a época
    const a = paint27(plan27({ hq: 4, year: 1960, city: 'london' })), b = paint27(plan27({ hq: 4, year: 1975, city: 'london' }));
    const pa = plan27({ hq: 4, year: 1960 });
    const crown = (p: typeof a) => hash27(Array.from({ length: 30 }, (_, i) => p.get(pa.crown![0] + 10 + i * 3, 30)).join());
    expect(crown(a)).not.toBe(crown(b));
  });
  it('marcos em dobro, inteiros no desenho, acima do telhado e fora da coroa da torre', () => {
    for (const [hq, city, year] of [[0, 'london', 1950], [2, 'paris', 1975], [4, 'new_york', 1975], [5, 'rio', 2005], [3, 'tokyo', 2005]] as const) {
      const p = plan27({ hq, year, city });
      const roof = p.gy - 4 - p.floors * 70 - 6;
      const sp = lmSpots27(p);
      expect(sp.length).toBeGreaterThan(0);
      expect(sp.some((x) => x.k === 2)).toBe(true);
      for (const m of sp) {
        expect(m.box[0]).toBeGreaterThanOrEqual(0); expect(m.box[2]).toBeLessThanOrEqual(p.W);
        expect(m.box[1]).toBeGreaterThanOrEqual(0);
        expect(m.box[1]).toBeLessThan(roof - 10); // a silhueta aparece acima do telhado
        if (p.crown) expect(m.box[2] < p.crown[0] || m.box[0] > p.crown[1]).toBe(true);
      }
      for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) expect(sp[i].box[2] < sp[j].box[0] || sp[j].box[2] < sp[i].box[0]).toBe(true);
    }
    expect(pickLms27(['hall', 'hall', 'spire', 'bridge'])).toEqual(['spire', 'bridge', 'hall']);
  });
  it('salas e andares fechados ou em obra vêm marcados na planta e mudam o desenho', () => {
    const open = plan27({ hq: 4, year: 1980, units: {} });
    const lock = plan27({ hq: 4, year: 1980, units: { 'floor:4:3': 'locked', 'floor:4:4': 'building', studioB: 'locked', loungeVip: 'building' } });
    expect(open.cells.every((c) => !c.lock)).toBe(true);
    expect(lock.flock).toEqual({ 3: 'locked', 4: 'building' });
    expect(lock.cells.filter((c) => c.floor === 3).every((c) => c.lock === 'locked')).toBe(true);
    expect(lock.cells.filter((c) => c.floor === 4).every((c) => c.lock === 'building')).toBe(true);
    expect(lock.cells.find((c) => c.kind === 'studioB')?.lock).toBe('locked');
    expect(lock.cells.filter((c) => c.room).every((c) => !c.lock)).toBe(true); // salas do jogo nunca trancam
    expect(lock.vip).toBe('building');
    const h = (p: ReturnType<typeof plan27>) => hash27(Array.from(paint27(p).d.filter((_, i) => i % 5 === 0)).join());
    expect(h(open)).not.toBe(h(lock));
  });
  it('garagem: salas estreitas usam o rótulo curto (sem etiquetas vazando para a vizinha)', () => {
    const g = plan27({ hq: 0, year: 1980 });
    const narrow = g.cells.filter((c) => isNarrow27(c, 2)).map((c) => c.kind).sort();
    expect(narrow).toEqual(['lobby', 'lounge', 'office']);
    expect(g.cells.filter((c) => isNarrow27(c, 3)).length).toBeLessThan(narrow.length);
  });
});
