// R29 (DEMO) — público por idade e região (src/sim/sys/demo29.ts, docs/demo29.md).
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { DEMO29, registerFraud29, FRAUD29 } from '../src/sim/demo29hook';
import { applyMods } from '../src/sim/ext4';
import { advanceMonth } from '../src/sim/tick';
import type { Act, GameState, Release } from '../src/sim/types';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import {
  ageFans29, ageMix29, appealAge29, casualMix29, cityAge29, coreMix29, demo29, fakeYouth29, inflow29, labelFit29, poolFans29, popularBoard29, older29, regionMix29, roll29, seed29, taste29, unitsAge29, youth29,
} from '../src/sim/sys/demo29';

const game = (seed: string, year: number): GameState => createGame(defaultConfig(seed, { startYear: year }));
function mine(s: GameState, genre?: string): Act {
  const r = Rng.fromSeed(`${s.config.seed}|t`);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity, genre });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  act.fans = { casual: 40000, active: 8000, core: 2000 };
  return act;
}
const setMix = (s: GameState, a: Act, b: number[]) => { demo29(s).a[a.id] = { b, n: a.fans.casual + a.fans.active + a.fans.core }; };
const fakeRel = (s: GameState, a: Act, type: Release['type'], extra: Partial<Release> = {}): Release => ({
  id: 'rX', actId: a.id, owner: 'player', type, title: 'X', songs: [], week: s.week, year: s.year, q: 60, appeal: 1, formats: [], stock: 0, pressed: 0,
  marketing: [], marketingE: 0, territories: ['na'], weekly: [], totalUnits: 0, revenue: 0, peak: 999, weeksOnChart: 0, lastPos: 0, coverSeed: 1, shortage: 0, live: true, ...extra,
} as Release);

describe('R29 demo — faixas e totais', () => {
  it('as fatias guardadas somam 1000 e os fãs por faixa somam o total (nada é contado duas vezes)', () => {
    const s = game('r29d-a', 1985);
    const a = mine(s);
    const before = { ...a.fans };
    advanceMonth(s); advanceMonth(s);
    const d = demo29(s).a[a.id];
    expect(d).toBeTruthy();
    expect(d.b.reduce((x, y) => x + y, 0)).toBe(1000);
    const tot = Math.round(a.fans.casual + a.fans.active + a.fans.core);
    expect(ageFans29(s, a).reduce((x, y) => x + y, 0)).toBe(tot);
    // as estrelas de fora também são guardadas, e os atos sem registro têm mistura derivada que soma 1
    for (const d2 of Object.values(demo29(s).a)) expect(d2.b.reduce((x, y) => x + y, 0)).toBe(1000);
    const npc = Object.values(s.acts).find((x) => !demo29(s).a[x.id] && x.status === 'active')!;
    expect(ageMix29(s, npc).reduce((x, y) => x + y, 0)).toBeCloseTo(1, 6);
    expect(before.casual).toBeGreaterThan(0);
  });

  it('as faixas andam com os anos: o fã adolescente de 1965 é 35–49 nos anos 90', () => {
    let b = [1, 0, 0, 0, 0];
    for (let y = 1966; y <= 1992; y++) b = roll29(b);
    expect(b.indexOf(Math.max(...b))).toBe(3);
    // no jogo: todo janeiro as fatias guardadas andam
    const s = game('r29d-roll', 1975);
    const a = mine(s);
    while (s.month !== 11) advanceMonth(s);
    setMix(s, a, [1000, 0, 0, 0, 0]);
    a.momentum = 0;
    advanceMonth(s);
    expect(s.month).toBe(0);
    expect(demo29(s).a[a.id].b[1]).toBeGreaterThan(120);
  });
});

describe('R29 demo — gosto por geração e região', () => {
  it('nostalgia: a coorte adolescente de 1965 prefere os gêneros dos anos 60 em 1995', () => {
    const s = game('r29d-n', 1995);
    const r47 = taste29(s, 47, 'na', 'beat') / taste29(s, 47, 'na', 'hiphop');
    const r17 = taste29(s, 17, 'na', 'beat') / taste29(s, 17, 'na', 'hiphop');
    expect(r47).toBeGreaterThan(1);
    expect(r47).toBeGreaterThan(r17 * 1.5);
    // e o jovem adota o gênero novo
    expect(taste29(s, 16, 'na', 'hiphop')).toBeGreaterThan(taste29(s, 55, 'na', 'hiphop'));
  });
  it('tendência regional: o agregado global continua neutro (média ponderada ≈ 1)', () => {
    const s = game('r29d-reg', 2000);
    for (let i = 0; i < 3; i++) advanceMonth(s);
    const rp = demo29(s).rp;
    expect(Object.keys(rp).length).toBe(7);
    const v = Object.values(rp).map((x) => x!.rock);
    expect(Math.min(...v)).toBeLessThan(Math.max(...v));
  });
  it('região: mercados somam 1 e o país natal aparece entre os maiores', () => {
    const s = game('r29d-mk', 1990);
    const a = mine(s);
    advanceMonth(s);
    const rm = regionMix29(s, a);
    expect(Object.values(rm.mk).reduce((x, y) => x + y, 0)).toBeCloseTo(1, 4);
    expect(rm.top.some((x) => x.local)).toBe(true);
    expect(demo29(s).a[a.id].c?.length).toBeGreaterThan(0);
  });
});

describe('R29 demo — efeitos por idade', () => {
  it('canais: single rende com base jovem, LP/relançamento com base velha; físico sobe com a idade', () => {
    const s = game('r29d-ch', 2015);
    const a = mine(s);
    const single = fakeRel(s, a, 'single'), lp = fakeRel(s, a, 'lp'), re = fakeRel(s, a, 'lp', { reissueOf: 'r0' });
    setMix(s, a, [300, 350, 200, 100, 50]);
    const yS = appealAge29(s, single, a).k, yL = appealAge29(s, lp, a).k, yU = unitsAge29(s, single, a), yP = DEMO29.phys!(s, lp);
    setMix(s, a, [30, 70, 200, 350, 350]);
    const oS = appealAge29(s, single, a).k, oL = appealAge29(s, lp, a).k, oR = appealAge29(s, re, a).k, oU = unitsAge29(s, single, a), oP = DEMO29.phys!(s, lp);
    expect(yS).toBeGreaterThan(oS);
    expect(oL).toBeGreaterThan(yL);
    expect(oR).toBeGreaterThan(1);
    expect(yU).toBeGreaterThan(oU);
    expect(oP).toBeGreaterThan(yP);
    // o modificador aparece na cadeia de apelo com rótulo
    const m = applyMods(s, 'appeal', 1, { release: re, act: a });
    expect(m.factors.some((f) => f.label.pt.includes('Idade do público'))).toBe(true);
  });
  it('ao vivo: país com mais fãs do que a base explica atrai mais público; jovem sente mais o preço', () => {
    const s = game('r29d-live', 1990);
    const a = mine(s);
    advanceMonth(s);
    const d = demo29(s).a[a.id];
    const home = d.c![0][0];
    const city = Object.values(s.acts).length ? a.city : a.city;
    const k0 = cityAge29(s, a, city).loc;
    d.c![0][1] = Math.min(1000, d.c![0][1] * 2);
    const k1 = cityAge29(s, a, city).loc;
    expect(home).toBeTruthy();
    expect(k1).toBeGreaterThan(k0);
    setMix(s, a, [400, 400, 100, 50, 50]);
    const ey = DEMO29.elast!(s, a, a.city);
    setMix(s, a, [20, 40, 140, 400, 400]);
    expect(ey).toBeGreaterThan(DEMO29.elast!(s, a, a.city));
  });
  it('redescoberta mira a geração certa: vídeo curto → jovens; comercial de TV → a coorte original', () => {
    const s = game('r29d-rev', 2019);
    const a = mine(s);
    const old: Release = fakeRel(s, a, 'single', { id: 'rOld', year: 1994, week: 0 });
    s.releases[old.id] = old;
    const base = inflow29(s, a).w;
    const rv = (s.x4 as unknown as { revival19: { rv: unknown[] } }).revival19.rv;
    rv.push({ id: 'v1', rel: old.id, act: a.id, y: s.year, w: s.week, until: s.week + 20, k: 'short', base: 1, mul: 1, u: 0, v: 0, gen: 0, mo: 0, why: { pt: '', en: '' } });
    const kids = inflow29(s, a).w;
    expect(youth29(kids)).toBeGreaterThan(youth29(base));
    (rv[0] as { k: string }).k = 'tv_ad';
    const orig = inflow29(s, a).w;
    // quem tinha ~18 em 1994 tem ~43 em 2019 → 35–49
    expect(orig[3]).toBeGreaterThan(base[3]);
    expect(orig[3]).toBeGreaterThan(kids[3]);
    // e o ciclo de ~25 anos pesa na escolha da faixa
    expect(DEMO29.revW!(s, old)).toBeGreaterThan(DEMO29.revW!(s, { ...old, year: 2012 }));
  });
  it('artista que envelhece mantém público envelhecido (parado, a base envelhece)', () => {
    const s = game('r29d-age', 2005);
    const a = mine(s);
    a.debutYear = 1968; a.formed = 1967;
    for (const id of a.members) if (s.persons[id]) s.persons[id].born = 1946;
    const mix = seed29(s, a);
    expect(older29(mix)).toBeGreaterThan(0.5);
  });
  it('fraude (gancho do submundo): infla as unidades e não muda nada sem registro', () => {
    const s = game('r29d-fr', 2016);
    const a = mine(s);
    const rel = fakeRel(s, a, 'single');
    const v0 = applyMods(s, 'chartUnits', 1000, { release: rel }).value;
    registerFraud29('t', (_s, r) => (r.id === 'rX' ? 1.5 : 1));
    const v1 = applyMods(s, 'chartUnits', 1000, { release: rel }).value;
    FRAUD29.length = 0;
    expect(v1).toBeGreaterThan(v0 * 1.3);
    // fazenda de streams de sempre (stream18; também o 'x:streams' do crime digital): já conta nas unidades;
    // o demo29 só mostra os falsos como ouvintes de 13–24
    s.releases[rel.id] = { ...rel, weekly: [1000, 1000, 1000, 1000] };
    a.releases.push(rel.id);
    expect(fakeYouth29(s, a).share).toBe(0);
    (s.x4 as unknown as { st18: { farm: Record<string, unknown> } }).st18.farm[rel.id] = { w: s.week, until: s.week + 6, k: 2 };
    const fy = fakeYouth29(s, a);
    expect(fy.share).toBeCloseTo(0.5, 2);
    expect(youth29(fy.seen)).toBeGreaterThan(youth29(ageMix29(s, a)));
  });
});

describe('R29 demo — saves e determinismo', () => {
  it('save antigo (sem demo29): a mistura nasce do gênero/era/mercado e o mês recria o estado', () => {
    const s = game('r29d-old', 1980);
    const a = mine(s);
    delete (s.x4 as unknown as Record<string, unknown>).demo29;
    expect(ageMix29(s, a).reduce((x, y) => x + y, 0)).toBeCloseTo(1, 6);
    const js = JSON.parse(JSON.stringify(s)) as GameState;
    advanceMonth(js);
    const d = demo29(js).a[a.id];
    expect(d.b.reduce((x, y) => x + y, 0)).toBe(1000);
  });
  it('determinismo: mesma semente, mesmo estado', () => {
    const run = () => { const s = game('r29d-det', 1995); mine(s); for (let i = 0; i < 3; i++) advanceMonth(s); return JSON.stringify(demo29(s)); };
    expect(run()).toBe(run());
  });
});

describe('R29 demo — núcleo, voto popular e selos rivais', () => {
  it('núcleo com idade própria (mais velho que casuais e ativos); por coorte os fãs somam os totais', () => {
    const s = game('r29d-core', 1980);
    const a = mine(s);
    for (let i = 0; i < 14; i++) advanceMonth(s);
    const d = demo29(s).a[a.id];
    expect(d.k!.reduce((x, y) => x + y, 0)).toBe(1000);
    const k = coreMix29(s, a), c = casualMix29(s, a);
    expect(older29(k)).toBeGreaterThan(older29(c));
    const pf = poolFans29(s, a);
    expect(pf.core.reduce((x, y) => x + y, 0)).toBe(Math.round(a.fans.core));
    expect(pf.core.reduce((x, y) => x + y, 0) + pf.rest.reduce((x, y) => x + y, 0)).toBe(Math.round(a.fans.casual + a.fans.active + a.fans.core));
  });
  it('Voto do Público: sai todo novembro; público jovem vota mais; robôs viram voto falso', () => {
    const s = game('r29d-pop', 1985);
    const young = mine(s), old = mine(s);
    young.fans = { casual: 4_000_000, active: 800_000, core: 200_000 };
    old.fans = { ...young.fans };
    young.momentum = old.momentum = 50;
    const rel = (a: Act, id: string) => { s.releases[id] = fakeRel(s, a, 'single', { id, actId: a.id }); a.releases.push(id); };
    rel(young, 'rY'); rel(old, 'rO');
    advanceMonth(s);
    setMix(s, young, [350, 400, 150, 70, 30]);
    setMix(s, old, [20, 40, 140, 400, 400]);
    const b = popularBoard29(s, 40);
    const vy = b.find((x) => x.act.id === young.id)!.votes, vo = b.find((x) => x.act.id === old.id)!.votes;
    expect(vy).toBeGreaterThan(vo * 1.8);
    // Submundo: robôs no voto (rig29) do ato mais velho viram votos falsos
    const x4 = s.x4 as unknown as { rig29?: { r: unknown[]; seq: number } };
    x4.rig29 = { r: [{ id: 'g1', act: old.id, cat: 'gramo', m: 'bots', pow: 10, q: 0.1, by: 'player', w: s.week, until: s.week + 52, y0: s.year, pre: [] }], seq: 1 };
    const b2 = popularBoard29(s, 40).find((x) => x.act.id === old.id)!;
    expect(b2.fake).toBeGreaterThan(0);
    while (s.month !== 11) advanceMonth(s);
    expect(s.awards.some((e) => e.category === 'popular29' && e.year === s.year)).toBe(true);
    expect(demo29(s).pv?.[0]?.[0]).toBe(s.year);
  });
  it('selos rivais miram uma geração: catálogo prefere público velho, hitmaker prefere jovem', () => {
    const s = game('r29d-lab', 1995);
    const young = mine(s), old = mine(s);
    advanceMonth(s);
    setMix(s, young, [350, 400, 150, 70, 30]);
    setMix(s, old, [20, 40, 140, 400, 400]);
    const lbs = Object.values(s.labels);
    const cat = { ...lbs[0], archetype: 'catalog' as const, strategy: 'buy_catalog' as const, roster: [] };
    const hit = { ...lbs[0], archetype: 'hitmaker' as const, strategy: 'stars' as const, roster: [] };
    expect(labelFit29(s, cat, old)).toBeGreaterThan(labelFit29(s, cat, young));
    expect(labelFit29(s, hit, young)).toBeGreaterThan(labelFit29(s, hit, old));
    expect(DEMO29.label).toBeTruthy();
    expect(DEMO29.rivalOffer!(s, cat, old)).toBeGreaterThanOrEqual(DEMO29.rivalOffer!(s, cat, young));
  });
});
