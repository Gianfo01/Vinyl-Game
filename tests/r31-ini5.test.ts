// R31 · onda 5 (INI) — tela inicial com palco (EXP-10) e nova run em ficha (EXP-9):
// a ficha nova gera a MESMA configuração que a tela antiga geraria com as mesmas escolhas; a prévia não mexe no jogo;
// a cena desenha em todas as eras e nas principais cidades; países desligados tiram os artistas reais de lá.

import { describe, expect, it } from 'vitest';
import { Px } from '../src/ui/pixel/px';
import { createGame } from '../src/sim/worldgen';
import { applyWorld17 } from '../src/sim/start17';
import { rngSnapshot19 } from '../src/sim/rng19';
import { cityById } from '../src/data/world';
import { buildRun27, quickDefaults27, quickRunConfig27, type QuickRun27 } from '../src/ui/ps/home27model';
import { charDefaults29 } from '../src/ui/ps/char29model';
import { setRealNames31 } from '../src/ui/newgame17';
import { quickRun5Config, story5, SIZES5, durOf5, yearsOfDur5, histOn5, realOn5, type QuickRun5 } from '../src/ui/r31/newrun5model';
import { scene5, paintScene5, sign5 } from '../src/ui/r31/stage5px';
import { realAllowed, realCountry31 } from '../src/sim/dbsize14';
import { REAL_ALL } from '../src/sim/sys/realworld';
import { setSw, switchDef, sw, swUi, setSwUi } from '../src/sim/r31/switches';
import { editables } from '../src/sim/r31/editor';
import '../src/sim/r31/exp5ini';
import type { RunConfig } from '../src/sim/types';

// no node não há canvas: o sprite e as camadas devolvem o próprio buffer
(Px.prototype as unknown as { canvas: () => unknown }).canvas = function (this: Px) { return this; };

/** O caminho ANTIGO: Nova run rápida de sempre e, para o que ela não tinha, os handlers da configuração completa
 *  (rádio do modo de mundo, caixa "Nomes e obras reais", clique no traço). */
function oldConfig(q: QuickRun5): RunConfig {
  const cfg = quickRunConfig27(q);
  if (q.hist5 !== undefined) applyWorld17(cfg, q.hist5 ? 'exact' : 'random');
  if (q.real5 !== undefined && q.real5 !== (cfg.showReal31 ?? !!cfg.realNames)) setRealNames31(cfg, q.real5);
  if (q.trait5) cfg.character!.traits = [...(cfg.character!.traits ?? []), q.trait5];
  return cfg;
}
const base = (seed: string, o: Partial<QuickRun5> = {}): QuickRun5 => {
  const q: QuickRun5 = { ...quickDefaults27(seed, 'Selo Teste'), ...o };
  q.char29 = { ...charDefaults29(q), ...(o.char29 ?? {}) };
  return q;
};
const COMBOS: [string, Partial<QuickRun5>][] = [
  ['padrão', {}],
  ['1905 rio artista', { startYear: 1905, homeCity: 'rio', career: 'musician', start29: 'zero', scenario: 'from_zero', difficulty: 'easy' }],
  ['1962 londres selo, traço e história real', { startYear: 1962, homeCity: 'london', career: 'label', trait5: 'charismatic', hist5: true }],
  ['1984 nova york empresário em crise, sem nomes reais', { startYear: 1984, homeCity: 'new_york', career: 'manager', start29: 'fallen', scenario: 'established', real5: false, runYears: 0 }],
  ['2025 tóquio festival até 2040', { startYear: 2025, homeCity: 'tokyo', career: 'festival', start29: 'leader', scenario: 'established', difficulty: 'hard', runYears: yearsOfDur5('y2040', 2025), trait5: 'greedy' }],
  ['1956 memphis estúdio, história real sem nomes reais', { startYear: 1956, homeCity: 'memphis', career: 'studio', hist5: true, real5: false, trait5: 'visionary' }],
];

describe('r31 onda 5 · nova run em ficha', () => {
  it('sem as escolhas novas, a ficha dá exatamente a configuração da Nova run rápida antiga', () => {
    for (const seed of ['ini5-a', 'ini5-b']) {
      const q = base(seed, { startYear: 1971, homeCity: 'paris', career: 'booking' });
      expect(quickRun5Config(q)).toEqual(quickRunConfig27(q as QuickRun27));
    }
  });
  it.each(COMBOS)('mesma configuração nova × antiga: %s', (_n, o) => {
    const q = base(`ini5-${_n}`, o);
    const nova = quickRun5Config(q), antiga = oldConfig(q);
    expect(nova).toEqual(antiga);
    expect(buildRun27(nova)).toEqual(buildRun27(antiga));
  });
  it('as escolhas da ficha chegam ao rascunho (traço, nomes reais, história real, duração, tamanho)', () => {
    const q = base('ini5-x', COMBOS[5][1]);
    const c = quickRun5Config(q);
    expect(c.character!.traits).toContain('visionary');
    expect(histOn5(c)).toBe(true);
    expect(realOn5(c)).toBe(false);
    expect(c.world17).toBe('exact');
    const d = quickRun5Config(base('ini5-y', { runYears: 0, start29: 'fallen', scenario: 'established' }));
    expect(d.runYears17).toBe(0);
    expect(d.start29).toBe('fallen');
    expect(durOf5({ startYear: 1962, runYears: undefined })).toBe('rec');
    expect(durOf5({ startYear: 1962, runYears: yearsOfDur5('y2040', 1962) })).toBe('y2040');
    expect(SIZES5[0]).toBe('zero');
  });
  it('mesma ficha → mesmo mundo gerado (createGame igual)', () => {
    const q = base('ini5-mundo', COMBOS[2][1]);
    const a = createGame(buildRun27(quickRun5Config(q)));
    const b = createGame(buildRun27(oldConfig(q)));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it('a prévia não muda o estado do jogo (nem sorteio)', () => {
    const g = createGame(buildRun27(quickRun5Config(base('ini5-prev'))));
    const before = JSON.stringify(g), rng = rngSnapshot19(g);
    for (const [, o] of COMBOS) {
      const cfg = quickRun5Config(base('ini5-prev', o));
      const st = story5(cfg, (id) => cityById[id]?.name.pt ?? id);
      expect(st.length.pt.length).toBeGreaterThan(0);
      expect(JSON.stringify(st)).not.toMatch(/NaN|undefined/);
      scene5({ year: cfg.startYear, city: cfg.homeCity, career: cfg.careers?.main?.[0], player: cfg.character?.look });
    }
    scene5({ year: g.year, city: g.config.homeCity, career: 'label' });
    expect(JSON.stringify(g)).toBe(before);
    expect(rngSnapshot19(g)).toBe(rng);
  });
});

describe('r31 onda 5 · cena do palco', () => {
  const YEARS = [1889, 1905, 1915, 1925, 1935, 1950, 1962, 1975, 1985, 1995, 2005, 2015, 2025, 2035, 2040];
  const CITIES = ['london', 'new_york', 'rio', 'sao_paulo', 'tokyo', 'paris', 'memphis', 'los_angeles', 'kingston', 'nashville', 'buenos_aires', 'nada_disso'];
  const CAREERS = ['label', 'musician', 'studio', 'festival', 'media', 'platform'];
  it('desenha sem erro em todas as eras e nas principais cidades', () => {
    const calls: string[] = [];
    const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? null : typeof k === 'string' && /^(fill|draw|clear|begin|move|line|close|save|restore)/.test(k) ? (..._a: unknown[]) => { calls.push(k); } : undefined), set: () => true }) as unknown as CanvasRenderingContext2D;
    let i = 0;
    for (const year of YEARS) for (const city of CITIES) {
      const career = CAREERS[i++ % CAREERS.length];
      const sc = scene5({ year, city, career, player: charDefaults29(quickDefaults27(`p${i}`, 'X')).look, lang: i % 2 ? 'en' : 'pt' });
      expect(sc.W).toBe(320);
      expect(sc.actors.length).toBeGreaterThanOrEqual(3);
      expect(sc.actors.some((a) => a.player)).toBe(true);
      expect(sc.base.d.some((c) => (c >>> 24) > 0)).toBe(true);
      paintScene5(ctx, sc, i);
    }
    expect(calls.filter((c) => c === 'drawImage').length).toBeGreaterThan(YEARS.length * CITIES.length * 4);
  });
  it('mesmas entradas → mesma cena; letreiro e equipamento pela época', () => {
    const a = scene5({ year: 1962, city: 'london' }), b = scene5({ year: 1962, city: 'london' });
    expect([...a.base.d]).toEqual([...b.base.d]);
    expect(sign5(1905)).toBe('RÁDIO');
    expect(sign5(1962, 'en')).toBe('LIVE');
    expect(sign5(2025)).toBe('STREAM');
    expect(scene5({ year: 2025, city: 'new_york' }).screens.length).toBe(2);
    expect(scene5({ year: 1962, city: 'london' }).screens.length).toBe(0);
    expect(scene5({ year: 2025, city: 'new_york' }).actors.some((x) => x.role === 'dj')).toBe(true);
    expect(scene5({ year: 1905, city: 'rio' }).actors.some((x) => x.pose === 'sitplay')).toBe(true);
  });
});

describe('r31 onda 5 · artistas reais por país e interruptor', () => {
  it('país desligado: nenhum artista real de lá; nada muda quando a lista está vazia', () => {
    const bra = REAL_ALL.filter((a) => realCountry31(a) === 'BRA');
    expect(bra.length).toBeGreaterThan(50);
    expect(bra.every((a) => !realAllowed({ dbSize: 'huge', realOff31: ['BRA'] }, a))).toBe(true);
    expect(REAL_ALL.every((a) => realAllowed({ dbSize: 'huge' }, a) === realAllowed({ dbSize: 'huge', realOff31: [] }, a))).toBe(true);
    // a base Enorme aceita todos os artistas da base
    expect(REAL_ALL.filter((a) => a.exact !== false).every((a) => realAllowed({ dbSize: 'huge' }, a))).toBe(true);
    const names = new Set(bra.map((a) => a.n));
    const count = (off?: string[]) => {
      const cfg = quickRun5Config(base('ini5-bra', { startYear: 1975, homeCity: 'rio' }));
      if (off) cfg.realOff31 = off;
      return Object.values(createGame(buildRun27(cfg)).acts).filter((x) => names.has(x.name)).length;
    };
    expect(count()).toBeGreaterThan(10);
    expect(count(['BRA'])).toBe(0);
  });
  it('exp5.ini: ligado por padrão, vale sem partida e está no editor', () => {
    expect(switchDef('exp5.ini')?.def).toBe(true);
    expect(swUi('exp5.ini')).toBe(true);
    setSwUi('exp5.ini', false);
    expect(swUi('exp5.ini')).toBe(false);
    const g = { config: {}, x4: {} } as never;
    expect(sw(g, 'exp5.ini')).toBe(false);
    setSw(g, 'exp5.ini', true);
    expect(swUi('exp5.ini')).toBe(true);
    expect(editables('tools').some((e) => e.id === 'sw.exp5.ini')).toBe(true);
  });
});
