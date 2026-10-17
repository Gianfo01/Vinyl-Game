// R33 · INT-1 — interiores próprios (escola, fábrica, museu, plataforma, agência, filial) e ações no hotel, apartamentos e
// sede rival, atrás de exp33.int1: desligado por padrão, a pintura é diferente por lugar e por época, os pontos cabem na
// cena recortada e explorar não muda o estado. Poucos casos, sem jogo longo.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import type { GameState } from '../src/sim/types';
import { playerActs } from '../src/sim/util';
import { freeCash20 } from '../src/sim/oblig20';
import { setSw, switchDef } from '../src/sim/r31/switches';
import { INT33_KINDS, crew33, int1On, int1Lines, ownKind33 } from '../src/sim/r33/int1';
import { doPlace27, placeActs27, type IntK33 } from '../src/sim/sys/place27';
import { paintInterior27 } from '../src/ui/pixel/interior27';
import { LAY33, cropSize33, interior33, paintInt33 } from '../src/ui/r33/int1px';
import { OBJS33 } from '../src/ui/r33/int1model';
import { auditInside31, insideModel31, type InsideT31 } from '../src/ui/r31/inside31model';
import { ownPlace27 } from '../src/ui/sys/place27ui';
import type { Bld18 } from '../src/sim/sys/campus18';

const game = (seed: string, year = 1962): GameState => createGame(defaultConfig(seed, { scenario: 'established', startYear: year, dbSize: 'small', homeCity: 'rio' } as Parameters<typeof defaultConfig>[1]));
const colors = (d: Uint32Array): number => { const s = new Set<number>(); for (const c of d) if (c >>> 24 > 40) s.add(c); return s.size; };
const paint = (k: IntK33, year: number) => paintInterior27(interior33(k, year, 4), [], { minW: 360, seed: `t|${k}`, city: 'rio', name: k, extra: (g, sd) => paintInt33(k, year)(g, sd) });
const YEARS = [1889, 1962, 2025];

describe('R33 INT-1 · interruptor', () => {
  it('exp33.int1 nasce desligado e o prédio seu só troca de interior com ele ligado', () => {
    expect(switchDef('exp33.int1')?.def).toBe(false);
    const s = game('int1-sw');
    expect(int1On(s)).toBe(false);
    const b = { id: 'school', kind: 'school', name: 'Escola', city: 'rio' } as unknown as Bld18;
    expect(ownPlace27(s, b)?.k).toBe('office');
    setSw(s, 'exp33.int1', true);
    expect(ownPlace27(s, b)?.k).toBe('school');
    expect(ownKind33('booking')).toBe('agency');
    expect(ownKind33('hq')).toBeNull();
  });
});

describe('R33 INT-1 · arte', () => {
  it('cada lugar pinta no tamanho do corte, com desenho de verdade, e muda com a época e de lugar para lugar', () => {
    const seen = new Set<string>();
    for (const k of INT33_KINDS) {
      const per: Uint32Array[] = [];
      for (const y of YEARS) {
        const pt = paint(k, y);
        expect(pt.W, `${k} ${y}`).toBe(360);
        expect(colors(pt.px.d), `${k} ${y} cores`).toBeGreaterThan(40);
        per.push(pt.px.d);
      }
      // 1889, 1962 e 2025 são três épocas diferentes (a cena muda de forma e material)
      for (let i = 0; i < per.length; i++) for (let j = i + 1; j < per.length; j++) expect(per[i].some((c, n) => c !== per[j][n]), `${k} ${YEARS[i]} x ${YEARS[j]}`).toBe(true);
      seen.add(per[1].join(',').length + ':' + per[1].slice(20000, 20040).join(','));
    }
    expect(seen.size).toBe(INT33_KINDS.length);
  });
  it('todo objeto clicável tem lugar na tabela de posições e cabe na sala', () => {
    for (const k of INT33_KINDS) for (const o of OBJS33[k]) {
      const p = LAY33[k][o.lay];
      expect(p, `${k}.${o.id}`).toBeTruthy();
      expect(p[0] + p[1], `${k}.${o.id}`).toBeLessThanOrEqual(1.001);
      expect(o.go).toMatch(/^(info|go|own):/);
    }
  });
});

describe('R33 INT-1 · cena e ações', () => {
  it('com o interruptor ligado, cada interior próprio tem pontos que cabem na cena recortada e explorar não muda o estado', () => {
    const s = game('int1-scene');
    setSw(s, 'exp33.int1', true);
    const before = JSON.stringify(s);
    for (const k of INT33_KINDS) {
      const x: InsideT31 = { id: k === 'plant' ? 'pl:x' : k, k, name: k, people: crew33(s, { id: k }, k), year: s.year, city: s.config.homeCity, seed: s.config.seed, own: true };
      const m = insideModel31(s, x);
      const cs = cropSize33(360);
      expect(m.crop && m.W === cs.W && m.H === cs.H, k).toBe(true);
      expect(auditInside31(m), k).toEqual([]);
      expect(m.spots.filter((y) => OBJS33[k].some((o) => o.id === y.id)).length, k).toBe(OBJS33[k].length);
      for (const o of OBJS33[k]) if (o.go.startsWith('info:') || o.go.startsWith('own:')) expect(int1Lines(s, k, o.go.slice(o.go.indexOf(':') + 1), x.id).length >= 0).toBe(true);
    }
    expect(JSON.stringify(s)).toBe(before);
  });
  it('hotel e apartamentos ganham ação só com o interruptor; a suíte baixa o estresse e custa caixa', () => {
    const s = game('int1-acts');
    const hotel = { k: 'hotel' as const, id: 'pl:1', venue: undefined, outlet: undefined, sale: undefined, src: 'fill' as const, name: { pt: 'Hotel', en: 'Hotel' } };
    expect(placeActs27(s, hotel).some((a) => a.id === 'suite')).toBe(false);
    setSw(s, 'exp33.int1', true);
    const suite = placeActs27(s, hotel).find((a) => a.id === 'suite');
    expect(suite).toBeTruthy();
    expect(placeActs27(s, { ...hotel, k: 'apartments' }).some((a) => a.id === 'wall')).toBe(true);
    expect(suite?.dis).toBeUndefined();
    const stress = (): number => playerActs(s).flatMap((id) => s.acts[id].members).reduce((t, m) => t + (s.persons[m]?.stress ?? 0), 0);
    for (const id of playerActs(s)) for (const m of s.acts[id].members) if (s.persons[m]) s.persons[m].stress = 40;
    const st0 = stress(), cash0 = freeCash20(s);
    const r = doPlace27(s, hotel, 'suite');
    expect(r.ok).toBe(true);
    expect(stress()).toBeLessThan(st0);
    expect(freeCash20(s)).toBeLessThan(cash0);
    expect(placeActs27(s, hotel).find((a) => a.id === 'suite')?.dis).toBeTruthy(); // espera de 8 semanas
  });
});
