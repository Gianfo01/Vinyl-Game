// R31 · onda 4 (ART2) — assets novos dos interiores e das salas: aparecem por lugar e época, cada ponto abre a ação certa
// (função que já existe no jogo), a pintura e o clique usam a mesma caixa, e explorar não muda o estado.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { playerActs } from '../src/sim/util';
import type { GameState } from '../src/sim/types';
import { places27, type PlaceK27 } from '../src/sim/sys/place27';
import { crew31 } from '../src/sim/sys/gente31';
import { jailPerson } from '../src/sim/sys/crime17';
import { addRelic } from '../src/sim/sys/relics9';
import { INTERIOR_KINDS27 } from '../src/ui/pixel/interior27';
import { ART_TYPES31, variant31, variants31 } from '../src/ui/pixel/props31';
import { auditInside31, insideModel31, type InsideT31 } from '../src/ui/r31/inside31model';
import { artDefs31, artPanel31, artSpots31, type ArtRun31 } from '../src/ui/r31/art31model';

const game = (seed: string, year = 1975, city = 'rio'): GameState => createGame(defaultConfig(seed, { scenario: 'established', startYear: year, dbSize: 'small', homeCity: city } as Parameters<typeof defaultConfig>[1]));
const LOTS = Array.from({ length: 18 }, (_, i) => 40 + i);
const tgt = (s: GameState, k: PlaceK27 | 'baile', year = s.year): InsideT31 => {
  const p = places27(s, LOTS).find((x) => x.k === k);
  return { id: p?.id ?? `t:${k}`, k, name: p ? p.name.pt : k, what: p?.what.pt, people: p?.people ?? crew31(s, k as PlaceK27) ?? [{ name: 'Gerente', role: { pt: 'Gerente', en: 'Manager' } }], year, city: s.config.homeCity, seed: s.config.seed, place: p, org: p?.org };
};
const RUNS: ArtRun31['k'][] = ['place', 'go', 'panel', 'listen', 'relic', 'lawyer', 'quick', 'person', 'ficha'];

describe('r31 ART2: objetos novos aparecem em cada lugar e época', () => {
  it('cada tipo tem variações por época, em ordem', () => {
    for (const t of ART_TYPES31) {
      expect(variants31(t).length, t).toBeGreaterThanOrEqual(3);
      expect(variant31(t, 1900)).toBe(variants31(t)[0]);
      expect(variant31(t, 2100)).toBe(variants31(t)[variants31(t).length - 1]);
    }
    expect(variant31('jukebox', 1955)).toBe('arch');
    expect(variant31('phone', 1985)).toBe('hood');
  });
  it('interiores do Nosso mundo e do submundo ganham pontos art:* que cabem no desenho (3 épocas)', () => {
    for (const year of [1930, 1985, 2030]) {
      const s = game(`art-all-${year}`, year);
      let total = 0;
      for (const k of [...INTERIOR_KINDS27, 'police', 'market', 'facade'] as PlaceK27[]) {
        const x = tgt(s, k);
        const m = insideModel31(s, x);
        expect(auditInside31(m), `${k} ${year}`).toEqual([]);
        const arts = m.spots.filter((y) => y.id.startsWith('art:'));
        total += arts.length;
        for (const a of arts) expect(a.go.panel).toMatch(/^(art:|info:)/);
      }
      expect(total, `${year}`).toBeGreaterThanOrEqual(16);
    }
  });
  it('a tabela: jukebox no bar, parada na loja, audiência na rádio, rack no estúdio, recados no ensaio, fliperama no hotel', () => {
    const s = game('art-table', 1985);
    const has = (k: PlaceK27, id: string) => artDefs31(s, tgt(s, k)).some((d) => d.id === id);
    expect(has('bar', 'jukebox')).toBe(true);
    expect(has('records', 'charts')).toBe(true);
    expect(has('records', 'relic')).toBe(true);
    expect(has('radio', 'ratings')).toBe(true);
    expect(has('studio', 'rack')).toBe(true);
    expect(has('rehearsal', 'flyers')).toBe(true);
    expect(has('hotel', 'arcade')).toBe(true);
    expect(has('venue', 'pa')).toBe(true);
    expect(has('police', 'wanted')).toBe(true);
    expect(has('police', 'phone')).toBe(true);
    // a parada substitui o cartaz genérico do mesmo lugar
    const m = insideModel31(s, tgt(s, 'records'));
    expect(m.room.props.filter((p) => p.t === 'poster').length).toBe(1);
  });
});

describe('r31 ART2: cada ponto abre a ação certa', () => {
  it('os botões só rodam funções que já existem e o painel tem texto limpo', () => {
    const s = game('art-panels', 1985);
    for (const k of [...INTERIOR_KINDS27, 'police', 'market', 'facade'] as PlaceK27[]) {
      const x = tgt(s, k);
      for (const d of artDefs31(s, x)) {
        const p = artPanel31(s, x, d.id);
        expect(p, `${k}/${d.id}`).not.toBeNull();
        for (const b of p!.btns) expect(RUNS).toContain(b.run.k);
        for (const t of [...p!.lines, ...p!.btns.map((b) => b.label)]) for (const v of [t.pt, t.en]) expect(v, `${k}/${d.id}`).not.toMatch(/NaN|undefined|\[object/);
      }
    }
  });
  it('rádio → pitch/jantar; redação → entrevista; delegacia → advogado do seu preso; vitrine → arrematar', () => {
    const s = game('art-acts', 1985);
    const runs = (k: PlaceK27, id: string) => artPanel31(s, tgt(s, k), id)!.btns.map((b) => b.run);
    expect(runs('radio', 'ratings').some((r) => r.k === 'place' && r.act === 'pitch')).toBe(true);
    expect(runs('press', 'phone').some((r) => r.k === 'place' && r.act === 'interview')).toBe(true);
    expect(runs('records', 'charts').some((r) => r.k === 'go' && r.area === 'charts')).toBe(true);
    const mine = playerActs(s)[0];
    jailPerson(s, s.acts[mine].members[0], 'BRA', 3, { pt: 'Briga', en: 'Fight' });
    expect(runs('police', 'phone').some((r) => r.k === 'lawyer' && r.pid === s.acts[mine].members[0])).toBe(true);
    const r = addRelic(s, 'guitar', { pt: 'Guitarra', en: 'Guitar' }, undefined, undefined, 5000);
    r.st = 'auction'; r.au = s.week + 4;
    expect(runs('records', 'relic').some((y) => y.k === 'relic' && y.id === r.id)).toBe(true);
    expect(runs('instruments', 'relic').some((y) => y.k === 'relic' && y.id === r.id)).toBe(true);
    // o carro do beco leva ao painel do mercado negro que já existe
    expect(artSpots31(s, tgt(s, 'market'), insideModel31(s, tgt(s, 'market')).room, 360).find((y) => y.id === 'art:car')?.go.panel).toBe('info:bm');
  });
});

describe('r31 ART2: explorar não muda o mundo', () => {
  it('montar cenas, pontos e painéis não mexe no estado', () => {
    const s = game('art-pure', 1985);
    const before = JSON.stringify(s);
    for (const k of [...INTERIOR_KINDS27, 'police', 'market', 'facade'] as PlaceK27[]) {
      const x = tgt(s, k);
      insideModel31(s, x);
      for (const d of artDefs31(s, x)) artPanel31(s, x, d.id);
    }
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('r31 ART2: salas da sede ganham o objeto novo', () => {
  it('Estúdio, Elenco, Equipe, Catálogo, Talentos e Troféus: um ponto art:* com destino, sem mudar o estado', async () => {
    await import('../src/ui/r31/salaart31');
    const { salaModel31, auditSala31 } = await import('../src/ui/r31/salas31model');
    const s = game('art-salas', 1985);
    const before = JSON.stringify(s);
    for (const id of ['studio', 'roster', 'team', 'catalog', 'talent', 'trophy'] as const) {
      const m = salaModel31(s, id);
      expect(auditSala31(m)).toEqual([]);
      const a = m.hots.find((h) => h.id.startsWith('art:'));
      expect(a, id).toBeDefined();
      expect(a!.acts?.length ?? 0, id).toBeGreaterThan(0);
    }
    expect(JSON.stringify(s)).toBe(before);
  });
});
