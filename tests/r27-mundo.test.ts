// r27 (E1, Mundo): modelos puros das telas novas — resumo do mês, ficha da cidade, linha das eras, "O que sabemos"
// e linha da parada. Só leem o estado (nada muda a simulação).

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { emitFact } from '../src/sim/facts17';
import { playerActs } from '../src/sim/util';
import type { GameState } from '../src/sim/types';
import { CITIES } from '../src/data/world';
import { VENUES17 } from '../src/sim/sys/venues17';
import {
  KIND_INFO27, KINDS27, LAYERS27, chartRow27, citySheet27, closedCountries27, eraTimeline27, known27, monthlyDigest27, pioneerOf27, sceneGlow27, sceneTier27,
} from '../src/ui/sys/mundo27model';

const game = (seed: string, year: number): GameState => createGame(defaultConfig(seed, { scenario: 'established', startYear: year, dbSize: 'small' } as Parameters<typeof defaultConfig>[1]));
const AREAS = new Set(['charts', 'world', 'labels', 'news17', 'known27', 'mundo27', 'world17']);

describe('r27 resumo do mês (Este mês no mundo)', () => {
  it('só itens do período, com categoria conhecida, destino válido e limite por categoria', () => {
    const s = game('r27-a', 1985);
    for (let i = 0; i < 3; i++) advanceMonth(s);
    const d = monthlyDigest27(s);
    expect(d.since).toBe(s.week - 4);
    expect(d.items.length).toBeLessThanOrEqual(16);
    for (const it of d.items) {
      expect(KINDS27).toContain(it.kind);
      expect(AREAS.has(it.go.area)).toBe(true);
      expect(it.title.pt.length).toBeGreaterThan(2);
      expect(it.title.en.length).toBeGreaterThan(2);
      expect(it.week).toBeGreaterThanOrEqual(d.since);
    }
    for (const k of KINDS27) expect(d.items.filter((x) => x.kind === k).length).toBeLessThanOrEqual(KIND_INFO27[k].cap);
  });
  it('um fato público novo (lei, escândalo, morte) entra na categoria certa e leva à tela certa; fato velho não entra', () => {
    const s = game('r27-b', 1962);
    advanceMonth(s);
    // o anel de fatos é cronológico: o fato "velho" vem antes
    const old = emitFact(s, { kind: 'death', actors: [], severity: 80, visibility: 'public', tags: ['t27'], text: { pt: 'Morte antiga', en: 'Old death' } });
    old.w = s.week - 10;
    emitFact(s, { kind: 'law', actors: [], severity: 50, visibility: 'public', tags: ['t27'], text: { pt: 'Lei de teste aprovada', en: 'Test law passed' } });
    emitFact(s, { kind: 'scandal', actors: [], severity: 60, visibility: 'public', tags: ['t27'], text: { pt: 'Escândalo de teste', en: 'Test scandal' } });
    const d = monthlyDigest27(s);
    const law = d.items.find((x) => x.title.pt === 'Lei de teste aprovada');
    const sc = d.items.find((x) => x.title.pt === 'Escândalo de teste');
    expect(law?.kind).toBe('law');
    expect(law?.go).toEqual({ area: 'world', tab: ['worldHub', 'history'] });
    expect(sc?.kind).toBe('scandal');
    expect(sc?.go.area).toBe('known27');
    expect(d.items.some((x) => x.title.pt === 'Morte antiga')).toBe(false);
  });
  it('seus atos vêm primeiro; segredo nunca aparece', () => {
    const s = game('r27-c', 1985);
    advanceMonth(s);
    const mine = playerActs(s)[0];
    emitFact(s, { kind: 'signing', actors: [mine, 'player'], severity: 5, visibility: 'public', tags: ['t27'], text: { pt: 'Contrato do meu ato', en: 'My act signs' } });
    emitFact(s, { kind: 'scandal', actors: [], severity: 90, visibility: 'secret', tags: ['t27'], text: { pt: 'Segredo absoluto', en: 'Top secret' } });
    const d = monthlyDigest27(s);
    const it = d.items.find((x) => x.title.pt === 'Contrato do meu ato');
    expect(it?.mine).toBe(true);
    expect(it?.kind).toBe('rival');
    expect(d.items.findIndex((x) => x === it)).toBeLessThanOrEqual(d.items.filter((x) => x.mine).length - 1);
    expect(d.items.some((x) => x.title.pt === 'Segredo absoluto')).toBe(false);
  });
  it('janeiro: tecnologia que chega no ano aparece como marco de era', () => {
    const s = game('r27-d', 1982);
    const y = s.techDates.cd;
    if (y === undefined) return;
    while (s.year < Math.floor(y) || s.month !== 0) advanceMonth(s);
    if (s.year !== Math.floor(y)) return; // data deslocada para trás do início (modo livre): nada a checar
    const d = monthlyDigest27(s);
    expect(d.items.some((x) => x.kind === 'era' && x.id === 't:cd' && x.go.anchor === 'era27')).toBe(true);
  });
});

describe('r27 mapa e ficha da cidade', () => {
  it('ficha de Nova York: cena, casas abertas no ano, rádios, público, quem domina', () => {
    const s = game('r27-e', 1962);
    const c = citySheet27(s, 'new_york')!;
    expect(c.name.pt).toBe('Nova York');
    expect(c.a3).toBe('USA');
    expect(c.venues.some((v) => v.name === 'Apollo Theater')).toBe(true);
    for (const v of c.venues) { const d = VENUES17.find((x) => x.id === v.id); if (d) expect(d.from).toBeLessThanOrEqual(1962); }
    expect(c.scene.tier).toBe(sceneTier27(c.scene.strength));
    expect(c.scene.genres.length).toBeLessThanOrEqual(5);
    for (const r of c.radios) expect(['radio', 'tv']).toContain(r.kind);
    expect(c.audience.popM).toBeGreaterThan(100);
    expect(c.dominates.acts).toBeGreaterThanOrEqual(0);
    if (c.dominates.label) expect(c.dominates.label.share).toBeGreaterThan(0);
    expect(citySheet27(s, 'nowhere')).toBeNull();
  });
  it('brilho das cenas entre 0 e 1 (a cena mais forte = 1); faixas de força', () => {
    const s = game('r27-f', 1985);
    const g = sceneGlow27(s);
    expect(g.size).toBeGreaterThan(0);
    expect(Math.max(...g.values())).toBeCloseTo(1, 5);
    for (const v of g.values()) { expect(v).toBeGreaterThan(0); expect(v).toBeLessThanOrEqual(1); }
    expect([sceneTier27(0), sceneTier27(1.5), sceneTier27(4), sceneTier27(9)]).toEqual([0, 1, 2, 3]);
    expect(LAYERS27.map((x) => x.id)).toEqual(['glow', 'hot', 'tour', 'festivals', 'rivals', 'closed']);
  });
  it('países fechados: Cortina de Ferro em 1962 (selo no Ocidente), aberta em 2005', () => {
    const s = game('r27-g', 1962);
    const home = s.config.homeCity;
    const west = CITIES.find((c) => c.id === home)?.market !== 'asia';
    const m62 = closedCountries27(s);
    if (west) expect(m62.get('POL')?.hard).toBe(true);
    const s2 = game('r27-g2', 2005);
    expect(closedCountries27(s2).get('POL')).toBeUndefined();
    // regra por mercado só marca o país onde vale: guerra no Líbano (1985) não fecha o Japão; Cortina de Ferro não fecha Londres
    const s3 = game('r27-g3', 1985);
    const m85 = closedCountries27(s3);
    expect(m85.get('JPN')).toBeUndefined();
    expect(m85.get('GBR')).toBeUndefined();
    if (m85.has('LBN')) expect(m85.get('LBN')!.hard).toBe(true);
  });
});

describe('r27 linha das eras', () => {
  it('1962: rádio e LP no passado; nada do futuro aparece; cada passo diz o que muda', () => {
    const s = game('r27-h', 1962);
    const tl = eraTimeline27(s);
    const st = (id: string) => tl.steps.find((x) => x.id === id)!;
    expect(st('radio').status).toBe('past');
    expect(st('lp').status).toBe('past');
    expect(tl.next).toBeUndefined();
    expect(tl.steps.every((x) => x.year <= s.year && s.techDates[x.id] !== undefined)).toBe(true);
    expect(tl.steps.find((x) => x.id === 'cassette')).toBeUndefined();
    for (const x of tl.steps) expect(x.fx.pt.length).toBeGreaterThan(5);
    // ordenada por ano; o marco do cassete descreve a cópia caseira
    for (let i = 1; i < tl.steps.length; i++) expect(tl.steps[i].year).toBeGreaterThanOrEqual(tl.steps[i - 1].year);
    expect(st('lp').changes.length + st('lp').formats.length + st('radio').changes.length).toBeGreaterThan(0);
  });
  it('2005: CD no passado; streaming só aparece se já chegou neste save', () => {
    const s = game('r27-i', 2005);
    const tl = eraTimeline27(s);
    expect(tl.steps.find((x) => x.id === 'cd')!.status).toBe('past');
    const st = tl.steps.find((x) => x.id === 'streaming');
    expect(st === undefined || (s.techDates.streaming !== undefined && st.year <= s.year)).toBe(true);
  });
});

describe('r27 O que sabemos e paradas', () => {
  it('separa públicos, confirmados, boatos e suspeitas sem repetir', () => {
    const s = game('r27-j', 1985);
    for (let i = 0; i < 6; i++) advanceMonth(s);
    const k = known27(s);
    const all = [...k.pub, ...k.confirmed, ...k.rumor, ...k.suspicion];
    expect(new Set(all.map((x) => x.id)).size).toBe(all.length);
    for (const r of k.pub) expect(r.lv >= 4 || r.press >= 4).toBe(true);
    for (const r of k.rumor) expect(r.lv).toBe(2);
    for (const r of k.suspicion) expect(r.lv).toBe(1);
    for (const f of k.facts) expect(f.visibility).toBe('public');
    for (const f of k.rumorFacts) expect(f.visibility).toBe('rumor');
  });
  it('linha da parada: estreia, sobe, desce; seu disco marcado; pioneiro', () => {
    const s = game('r27-k', 1985);
    advanceMonth(s);
    const e = s.charts.singles[0];
    if (e) {
      const r = chartRow27(s, { ...e, last: 0 });
      expect(r.move).toBe('new');
      expect(chartRow27(s, { ...e, pos: 3, last: 9 })).toMatchObject({ move: 'up', delta: 6 });
      expect(chartRow27(s, { ...e, pos: 9, last: 3 })).toMatchObject({ move: 'down', delta: 6 });
      const rel = s.releases[e.releaseId];
      expect(r.mine).toBe(rel.owner === 'player' || !!s.acts[rel.actId]?.playerBand);
    }
    // grunge nasce em 1987: um ato de grunge em 1984 é "pioneiro de grunge"; em 1989, se já existia em 1987, ainda é
    expect(pioneerOf27({ year: 1984 }, 'grunge', 1980)).toBe('grunge');
    expect(pioneerOf27({ year: 1989 }, 'grunge', 1985)).toBe('grunge');
    expect(pioneerOf27({ year: 1989 }, 'grunge', 1988)).toBeUndefined();
    expect(pioneerOf27({ year: 2010 }, 'grunge', 1980)).toBeUndefined();
  });
});
