// r27 (D1): a Sede em pixel art — planta pura (nível → salas, ano → equipamento/luz, cidade → horizonte) e
// pintura determinística num buffer Px (sem canvas do DOM).

import { describe, expect, it } from 'vitest';
import { HQ_LEVELS } from '../src/data/rules';
import { landmarksAt19 } from '../src/data/landmarks19';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import type { GameState } from '../src/sim/types';
import { hqModel25 } from '../src/ui/ps/hq25model';
import { GEAR27, gearOf27, hash27, lightOf27, paint27, place27, plan27, roomsForLevel27, shellOf27 } from '../src/ui/ps/hqpx27';

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
    const fl = [0, 1, 2, 3, 4].map((hq) => plan27({ hq, year: 1980 }).floors);
    expect(fl).toEqual([1, 2, 2, 3, 5]);
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
