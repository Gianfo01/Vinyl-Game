// R33 · BUGS33 item 6 — nos interiores (e na sede da casca nova) a pessoa tem prioridade de clique sobre o móvel que a
// cobre: a área dela é marcada como pessoa e ganha camada acima de qualquer objeto, mesmo do objeto com o mouse em cima.
// Antes, na sala dos fundos da fachada (Londres 1962), clicar na chefe sentada atrás da mesa abria "Mesa".

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import type { GameState } from '../src/sim/types';
import { places27, type PlaceK27 } from '../src/sim/sys/place27';
import { crew31 } from '../src/sim/sys/gente31';
import { INTERIOR_KINDS27 } from '../src/ui/pixel/interior27';
import { insideModel31, type InsideT31 } from '../src/ui/r31/inside31model';
import { personSpot31, type Spot31 } from '../src/ui/r31/scene31model';

const game = (seed: string, year: number, city: string): GameState => createGame(defaultConfig(seed, { scenario: 'established', startYear: year, dbSize: 'small', homeCity: city } as Parameters<typeof defaultConfig>[1]));
const LOTS = Array.from({ length: 14 }, (_, i) => 40 + i);
const tgt = (s: GameState, k: PlaceK27): InsideT31 => {
  const p = places27(s, LOTS).find((x) => x.k === k);
  return { id: p?.id ?? `t:${k}`, k, name: p ? p.name.pt : k, what: p?.what.pt, people: p?.people ?? crew31(s, k) ?? [{ name: 'Gerente', role: { pt: 'Gerente', en: 'Manager' } }], year: s.year, city: s.config.homeCity, seed: s.config.seed, place: p, org: p?.org };
};
const overlap = (a: Spot31, b: Spot31): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('BUGS33 item 6: pessoa clicável por cima do móvel', () => {
  it('personSpot31 reconhece pessoa pela marca e pela convenção de id', () => {
    const sp = (id: string, person?: boolean) => ({ id, person });
    expect(personSpot31(sp('who:0'))).toBe(true);
    expect(personSpot31(sp('you'))).toBe(true);
    expect(personSpot31(sp('n:boss', true))).toBe(true);
    expect(personSpot31(sp('desk'))).toBe(false);
    expect(personSpot31(sp('table'))).toBe(false);
    expect(personSpot31(sp('vit:3'))).toBe(false);
  });

  it('em todo interior (Londres 1962 e 2012) as pessoas vêm marcadas, e há pessoa em cima de móvel (o caso do dono)', () => {
    let covered = 0;
    for (const year of [1962, 2012]) {
      const s = game(`b6-${year}`, year, 'london');
      for (const k of INTERIOR_KINDS27) {
        const m = insideModel31(s, tgt(s, k));
        const who = m.spots.filter((x) => x.id.startsWith('who:'));
        for (const p of who) expect(p.person, `${k} ${year} ${p.id}`).toBe(true);
        covered += who.filter((p) => m.spots.some((o) => !personSpot31(o) && overlap(p, o))).length;
      }
    }
    expect(covered).toBeGreaterThan(0);
  });

  it('a camada da pessoa fica acima do móvel com o mouse em cima (CSS)', () => {
    const css = readFileSync('src/ui/r31/scene31.css', 'utf8');
    const z = (re: RegExp) => Number(re.exec(css)?.[1] ?? NaN);
    const objHover = z(/\.sc31-spot:hover, \.sc31-spot:focus-visible \{[^}]*z-index: (\d+)/);
    const person = z(/\.sc31-spot\.sc31-person \{ z-index: (\d+)/);
    expect(person).toBeGreaterThan(objHover);
    const vitCss = readFileSync('src/ui/r31/inside31.css', 'utf8');
    expect(person).toBeGreaterThan(Number(/\[data-spot\^="vit:"\] \{ z-index: (\d+)/.exec(vitCss)?.[1] ?? 0));
  });
});
