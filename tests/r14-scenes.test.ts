// Rodada 14 — cenas ilustradas: especificação pura por era (equipamento, moda, porte da casa,
// marcos datados e pontos clicáveis dentro do quadro).

import { describe, expect, it } from 'vitest';
import { landmarks14, mediaPlace14, sceneOfCat14, sceneSpec14, venueTier14, type Scene14 } from '../src/ui/pixel/spec14';

const KINDS: Scene14[] = ['studio_control', 'studio_live', 'venue', 'media', 'store', 'pressing', 'home', 'garage', 'city', 'awards', 'press'];

describe('cenas r14', () => {
  it('equipamento e moda mudam por década; pontos ficam dentro do quadro', () => {
    for (const k of KINDS) for (const y of [1925, 1955, 1972, 1985, 1995, 2005, 2015, 2025, 2035]) {
      const sp = sceneSpec14(k, { year: y, attendance: 800, cityId: 'london' });
      expect(sp.hotspots.length).toBeGreaterThan(0);
      for (const h of sp.hotspots) {
        expect(h.x).toBeGreaterThanOrEqual(0); expect(h.y).toBeGreaterThanOrEqual(0);
        expect(h.x + h.w).toBeLessThanOrEqual(256); expect(h.y + h.h).toBeLessThanOrEqual(144);
        expect(h.label.pt && h.label.en && h.tip.pt && h.tip.en).toBeTruthy();
      }
    }
    const g = (y: number) => sceneSpec14('studio_control', { year: y }).gear.en;
    expect(new Set([1925, 1955, 1972, 1985, 1995, 2005, 2015, 2025].map(g)).size).toBe(8);
    expect(sceneSpec14('home', { year: 1925 }).fashion.en).not.toBe(sceneSpec14('home', { year: 1985 }).fashion.en);
    // trocar de sala: controle ↔ gravação
    expect(sceneSpec14('studio_control', { year: 1970 }).hotspots.some((h) => h.to && 'swap' in h.to && h.to.swap === 'studio_live')).toBe(true);
    expect(sceneSpec14('studio_live', { year: 1970 }).hotspots.some((h) => h.to && 'swap' in h.to && h.to.swap === 'studio_control')).toBe(true);
  });

  it('casa de show: porte e lotação pelo público, respeitando o ano', () => {
    expect(venueTier14(80, 1990)).toBe(0);
    expect(venueTier14(900, 1990)).toBe(1);
    expect(venueTier14(60000, 1990)).toBe(4);
    expect(venueTier14(60000, 1930)).toBe(2); // sem estádio nem arena antes da hora
    const half = sceneSpec14('venue', { year: 1990, attendance: 150, capacity: 300 });
    expect(half.place).toBe('venue_bar');
    expect(half.fill).toBeCloseTo(0.5);
    expect(sceneSpec14('venue', { year: 1970, attendance: 10000 }).place).toBe('venue_gym');
    expect(sceneSpec14('venue', { year: 1990, attendance: 10000 }).place).toBe('venue_arena');
    expect(sceneSpec14('venue', { year: 1990, attendance: 1 }).fill).toBeGreaterThan(0);
  });

  it('mídia por era e marcos de cidade só depois de construídos', () => {
    expect(mediaPlace14(1930)).toBe('radio_am');
    expect(mediaPlace14(1955)).toBe('tv_variety');
    expect(mediaPlace14(1985)).toBe('tv_clips');
    expect(mediaPlace14(2015)).toBe('curators');
    expect(mediaPlace14(2025)).toBe('livestream');
    expect(landmarks14('new_york', 1925)).not.toContain('empire');
    expect(landmarks14('new_york', 1980)).toEqual(expect.arrayContaining(['empire', 'twins']));
    expect(landmarks14('new_york', 2005)).not.toContain('twins');
    expect(landmarks14('berlin', 1975)).toContain('wall');
    expect(landmarks14('berlin', 1995)).not.toContain('wall');
    expect(landmarks14('tokyo', 1950)).toEqual([]);
    expect(sceneOfCat14('manufacturing')).toBe('pressing');
    expect(sceneOfCat14('???')).toBe('city');
  });
});
