// Rodada 29 — GRAVADORAS NO INÍCIO e SELOS NOVOS DURANTE A RUN (config.labels29; src/sim/labels29data.ts,
// src/sim/sys/labels29start.ts, src/sim/sys/labels29ven.ts). Atalhos na faixa por era, reais primeiro, inventadas no
// estilo da época, padrão idêntico, rápida == completa, controles finos da completa, frequência de selos novos medida e
// determinismo.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { newRunConfig20 } from '../src/sim/start17';
import { setStart29, type Sit29 } from '../src/sim/start29data';
import { setRivals29, type Riv29 } from '../src/sim/rivals29data';
import { FREQS29, NS29, count29, eraCap29, eraWave29, labelsTag29, range29, runPace29, setLabels29, statusAll29, ven29, yearPlan29, type Freq29, type N29, type Vn29 } from '../src/sim/labels29data';
import { LB29, labelsOn29 } from '../src/sim/labels29gate';
import { labels29Month, labels29St, rankReal29 } from '../src/sim/sys/labels29start';
import { roleFromMain } from '../src/sim/sys/careers12';
import { ventures } from '../src/sim/sys/ventures9';
import { cityById } from '../src/data/world';
import type { GameState, RunConfig } from '../src/sim/types';
import { buildRun27, draftDefaults27, quickDefaults27, quickRunConfig27 } from '../src/ui/ps/home27model';

const pt = (x: { pt: string }) => x.pt;
const ERAS = [1889, 1962, 1990, 2020];
const cfgOf = (seed: string, year: number, l29?: RunConfig['labels29'], over: Partial<RunConfig> = {}): RunConfig =>
  defaultConfig(seed, { startYear: year, scenario: 'emerging', realNames: true, ...(l29 ? { labels29: l29 } : {}), ...over });
const active = (s: GameState) => Object.values(s.labels).filter((x) => x.active);
const strip = (s: GameState) => JSON.stringify({ ...s, config: { ...s.config, labels29: undefined } });

describe('r29 — gravadoras no início: atalhos e escolha', () => {
  it('cada atalho dá um número na faixa, limitado pela era, e o mundo nasce com esse número', () => {
    for (const year of ERAS) for (const d of NS29) {
      const cfg = cfgOf(`r29l-${year}-${d.id}`, year, { n: d.id });
      const n = count29(cfg)!;
      const [lo, hi] = range29(d.id, year);
      expect(n).toBeGreaterThanOrEqual(lo);
      expect(n).toBeLessThanOrEqual(hi);
      expect(hi).toBeLessThanOrEqual(eraCap29(year));
      expect(active(createGame(cfg))).toHaveLength(n);
    }
    expect(range29('crowded', 1889)).toEqual([8, 8]);
    expect(range29('crowded', 1990)).toEqual([21, 40]);
  });

  it('reais primeiro (as que existiam na data, pelo porte); faltando gente, inventadas no estilo da época', () => {
    const c62 = cfgOf('r29l-real', 1962, { n: 'some' });
    const s62 = createGame(c62);
    const want = rankReal29(c62).slice(0, count29(c62)!).map((d) => d.id).sort();
    expect(active(s62).map((x) => x.id).sort()).toEqual(want);
    expect(active(s62).some((x) => x.procedural)).toBe(false);
    // 1889: quase não havia gravadoras — o resto é inventado com nomes da era fonográfica
    const c89 = cfgOf('r29l-real', 1889, { n: 'many' });
    const s89 = createGame(c89);
    const real = rankReal29(c89).length;
    expect(active(s89).filter((x) => !x.procedural)).toHaveLength(real);
    const inv = active(s89).filter((x) => x.procedural);
    expect(inv.length).toBe(count29(c89)! - real);
    for (const lb of inv) expect(lb.name).toMatch(/Phonograph|Talking Machine|Disc Company|Gramophone|Discos/);
    // metade reais: metade inventadas (estilo dos anos 90)
    const c90 = cfgOf('r29l-half', 1990, { count: 12, real: 50 });
    const s90 = createGame(c90);
    expect(active(s90)).toHaveLength(12);
    expect(active(s90).filter((x) => x.procedural)).toHaveLength(6);
  });

  it('padrão (sem campo, campo vazio ou "padrão" na rápida) é idêntico ao mundo de sempre — inclusive meses jogados', () => {
    const a = createGame(cfgOf('r29l-def', 1975));
    const b = createGame(cfgOf('r29l-def', 1975, {}));
    expect(strip(b)).toBe(strip(a));
    expect(labels29St(a)).toBeUndefined();
    for (let m = 0; m < 2; m++) { advanceMonth(a); advanceMonth(b); }
    expect(strip(b)).toBe(strip(a));
    const c = draftDefaults27(newRunConfig20({ seed: 'r29l-x', companyName: 'X' }));
    const before = JSON.stringify(c);
    setLabels29(c, { n: undefined, vn: undefined });
    expect(JSON.stringify(c)).toBe(before);
    expect(quickRunConfig27({ ...quickDefaults27('r29l-q', 'Selo'), labels29n: undefined })).toEqual(quickRunConfig27(quickDefaults27('r29l-q', 'Selo')));
  });

  it('a Nova run rápida e a completa dão a mesma RunConfig e o status mostra as gravadoras', () => {
    const cases: [string, Sit29, Riv29, N29 | undefined, Vn29 | undefined][] = [
      ['label', 'emerging', 'giants', 'some', undefined], ['studio', 'top5', 'mix', 'crowded', 'many'], ['musician', 'zero', 'hipster', 'few', undefined],
      ['festival', 'mid', 'leader', undefined, 'some'], ['label', 'established', 'mix', 'many', undefined]];
    for (const [career, sit, riv, n, vn] of cases) {
      const quick = quickRunConfig27({ ...quickDefaults27('r29l-q', 'Selo'), career, start29: sit, rivals29: riv === 'mix' ? undefined : riv, labels29n: n, labels29vn: vn });
      const full = draftDefaults27(newRunConfig20({ seed: 'r29l-q', companyName: 'Selo' }));
      if (career !== 'label') { full.careers!.main = [career]; full.role = roleFromMain(full.careers!.main); }
      setStart29(full, sit);
      setRivals29(full, riv);
      setLabels29(full, { n });
      setLabels29(full, { vn });
      expect(quick).toEqual(draftDefaults27(full));
      if (n) expect(pt(statusAll29(quick))).toContain(`· ${count29(quick)} gravadoras`);
    }
    const q = quickRunConfig27({ ...quickDefaults27('r29l-s', 'Selo'), labels29n: 'some', start29: 'emerging', rivals29: 'giants' });
    expect(pt(statusAll29(q))).toBe(`Selo emergente · rivais gigantes · ${count29(q)} gravadoras`);
    const st = quickRunConfig27({ ...quickDefaults27('r29l-s', 'Selo'), career: 'studio', labels29vn: 'few' });
    expect(pt(labelsTag29(st))).toMatch(/^ · (1 estúdio rival|2 estúdios rivais)$/);
    // cenário histórico tem as próprias gravadoras
    const sc = quickRunConfig27({ ...quickDefaults27('r29l-s', 'Selo'), labels29n: 'crowded' });
    sc.scenario17 = 'soul_1972';
    expect(buildRun27(sc).labels29).toBeUndefined();
    expect(labelsOn29({ labels29: { n: 'few' }, scenario17: 'soul_1972' })).toBe(false);
  });
});

describe('r29 — gravadoras no início: controles finos da completa', () => {
  it('porte, região, incluir/excluir, fechamentos e "nenhuma" fazem efeito', () => {
    const A = (s: GameState) => active(s).filter((x) => x.family === 'A').length;
    const maj = createGame(cfgOf('r29l-size', 1990, { count: 20, size: 'majors' }));
    const mix = createGame(cfgOf('r29l-size', 1990, { count: 20 }));
    const ind = createGame(cfgOf('r29l-size', 1990, { count: 20, size: 'indies' }));
    expect(A(maj)).toBeGreaterThan(A(mix));
    expect(A(mix)).toBeGreaterThan(A(ind));
    expect(A(ind)).toBeLessThanOrEqual(1);
    // região: todas na praça de casa (Londres → Europa)
    const home = createGame(cfgOf('r29l-home', 1990, { count: 15, spread: 'home' }, { homeCity: 'london' }));
    for (const lb of active(home)) expect(cityById[lb.city]?.market).toBe('eu');
    const world = createGame(cfgOf('r29l-home', 1990, { count: 15 }, { homeCity: 'london' }));
    expect(active(world).some((lb) => cityById[lb.city]?.market !== 'eu')).toBe(true);
    // incluir uma pequena, excluir a primeira da fila
    const base = cfgOf('r29l-inc', 1975, { count: 6 });
    const rank = rankReal29(base);
    const small = rank[rank.length - 1].id, first = rank[0].id;
    const ie = createGame(cfgOf('r29l-inc', 1975, { count: 6, inc: [small], exc: [first] }));
    expect(ie.labels[small]?.active).toBe(true);
    expect(ie.labels[first]).toBeUndefined();
    // fechamentos e fusões desligados; frequência "nenhuma" corta as do futuro e as aberturas de NPCs
    const off = createGame(cfgOf('r29l-off', 1975, { count: 8, life: 'off', freq: 'none' }));
    expect(LB29.noClose!(off)).toBe(true);
    expect(LB29.noFound!(off)).toBe(true);
    expect(off.config.labels!.future).toBe('none');
    expect(Object.values(off.labels).filter((x) => !x.active && !x.closedYear)).toHaveLength(0);
    const on = createGame(cfgOf('r29l-off', 1975, { count: 8 }));
    expect(LB29.noClose!(on)).toBe(false);
    expect(LB29.noFound!(on)).toBe(false);
    expect(Object.values(on.labels).filter((x) => !x.active && !x.closedYear).length).toBeGreaterThan(0); // as reais do futuro seguem chegando
    expect(LB29.newRival!(on)).toBe(true);
    expect(LB29.newRival!(createGame(cfgOf('r29l-off', 1975)))).toBe(false);
  });

  it('concorrentes da carreira no início: atalho na faixa e número exato vence o nível dos rivais', () => {
    const st = (s: GameState) => ventures(s).npc.filter((x) => x.kind === 'studio').length;
    const many = createGame(cfgOf('r29l-ven', 1990, { vn: 'many' }, { careers: { main: ['studio'], origin: 'none', ambition: 'legacy' } }));
    expect(st(many)).toBe(ven29(many.config));
    expect(st(many)).toBeGreaterThanOrEqual(5);
    expect(st(many)).toBeLessThanOrEqual(8);
    const zero = createGame(cfgOf('r29l-ven', 1990, { ven: 0 }, { careers: { main: ['studio'], origin: 'none', ambition: 'legacy' }, rivals29: 'giants' }));
    expect(st(zero)).toBe(0);
    // só o "vn" não mexe nas gravadoras
    expect(labelsOn29({ labels29: { vn: 'many' } })).toBe(false);
    // estúdio não existe em 1905: nada é criado
    const old = createGame(cfgOf('r29l-ven', 1905, { vn: 'many' }, { careers: { main: ['studio'], origin: 'none', ambition: 'legacy' } }));
    expect(st(old)).toBe(0);
  });
});

describe('r29 — selos novos durante a run (sorteio próprio por ano)', () => {
  it('a frequência muda quantos selos aparecem em 40 anos (medido, média de 4 runs); ondas e secas da época', () => {
    const born = (seed: string, f: Freq29) => {
      const s = createGame(cfgOf(seed, 1950, { n: 'some', freq: f }));
      for (let y = 1950; y < 1990; y++) for (let m = 0; m < 12; m++) { s.year = y; s.month = m; labels29Month(s); }
      return labels29St(s)!.born.length;
    };
    const seeds = ['r29l-f1', 'r29l-f2', 'r29l-f3', 'r29l-f4'];
    const avg = Object.fromEntries((['none', 'rare', 'normal', 'frequent'] as Freq29[]).map((f) => [f, seeds.reduce((t, sd) => t + born(sd, f), 0) / seeds.length])) as Record<Freq29, number>;
    expect(avg.none).toBe(0);
    expect(avg.rare).toBeGreaterThan(0);
    expect(avg.rare).toBeLessThan(avg.normal);
    expect(avg.normal).toBeLessThan(avg.frequent);
    // cada run tem o seu ritmo
    expect(new Set(seeds.map(runPace29)).size).toBe(seeds.length);
    // ondas: boom indie dos 50 e digital 2005+ acima de depressão/guerra (média de 30 sementes, plano puro)
    const perYear = (a: number, b: number) => { let t = 0, k = 0; for (let i = 0; i < 30; i++) for (let y = a; y <= b; y++) { t += yearPlan29(`w${i}`, y, 'normal').n; k++; } return t / k; };
    expect(perYear(1950, 1962)).toBeGreaterThan(perYear(1930, 1945) * 2);
    expect(perYear(2005, 2020)).toBeGreaterThan(perYear(2000, 2004));
    expect(eraWave29(1980)).toBeGreaterThan(1);
    // secas acontecem; o caótico varia mais que o normal
    const plans = (f: Freq29) => Array.from({ length: 60 }, (_, i) => yearPlan29('r29l-var', 1950 + i, f));
    expect(plans('normal').some((p) => p.mood === 'drought')).toBe(true);
    const sd = (xs: number[]) => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length) / Math.max(0.01, m); };
    expect(sd(plans('chaotic').map((p) => p.n))).toBeGreaterThan(sd(plans('normal').map((p) => p.n)));
    expect(FREQS29.map((f) => f.id)).toEqual(['none', 'rare', 'normal', 'frequent', 'chaotic']);
  });

  it('no jogo de verdade: 12 meses com frequência alta abrem selos (e o selo de sempre do lifecycle sai de cena)', () => {
    const s = createGame(cfgOf('r29l-live', 2008, { n: 'few', freq: 'frequent' }));
    const plan = yearPlan29('r29l-live', 2008, 'frequent');
    for (let m = 0; m < 12; m++) advanceMonth(s);
    const born = labels29St(s)!.born.filter(([y]) => y === 2008);
    expect(born.length).toBe(plan.n);
    for (const [, id] of born) { expect(s.labels[id].procedural).toBe(true); expect(s.labels[id].founded).toBe(2008); }
    expect(s.memory.filter((x) => x.kind === 'label_new' && /^Novo selo independente/.test(x.text?.pt ?? ''))).toHaveLength(0);
  });

  it('determinismo: mesma semente + mesmas escolhas = mesmo mundo e mesmo plano', () => {
    const c = { n: 'many' as const, real: 70, size: 'indies' as const, spread: 'region' as const };
    expect(JSON.stringify(createGame(cfgOf('r29l-det', 1984, c)))).toBe(JSON.stringify(createGame(cfgOf('r29l-det', 1984, c))));
    expect(yearPlan29('r29l-det', 1984, 'chaotic')).toEqual(yearPlan29('r29l-det', 1984, 'chaotic'));
    expect(count29(cfgOf('r29l-det', 1984, { n: 'many' }))).toBe(count29(cfgOf('r29l-det', 1984, { n: 'many' })));
  });
});
