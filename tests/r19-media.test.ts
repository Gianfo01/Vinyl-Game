import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { Rng } from '../src/core/rng';
import { EVENTS } from '../src/sim/events';
import { ownConseq18 } from '../src/sim/decide18';
import { emitFact, recentFacts } from '../src/sim/facts17';
import { COVERS19, FR19, OUTLETS19, SCENES19, SHOWS19 } from '../src/data/media19';
import { DOC19, ORGS19, RELICS19 } from '../src/data/media19b';
import { cityById, genreById, l } from '../src/data/world';
import { media19Counts } from '../src/sim/sys/media19';
import { MEDIA19_EVENTS } from '../src/sim/sys/media19ev';
import { MEDIA19_SITS } from '../src/sim/sys/media19sit';
import { SITS } from '../src/sim/sys/situations17';
import { SCENE_HEAT19, buyOutlet19, foundZine19, zn19 } from '../src/sim/sys/zines19';
import { expose19, fk19, lawIn19, spawnGhost19, startLip19 } from '../src/sim/sys/fakes19';
import { explain18 } from '../src/sim/explain18';
import { recordAward } from '../src/sim/util';
import type { GameState } from '../src/sim/types';

const game = (seed: string, year = 1977, history?: 'strict' | 'free'): GameState => {
  const cfg = defaultConfig(seed);
  cfg.startYear = year;
  if (history) (cfg as { history?: string }).history = history;
  return createGame(cfg);
};
const myAct = (s: GameState) => Object.values(s.acts).find((a) => a.owner === 'player' && !a.playerBand)!;

describe('r19 T9 — banco de mídia', () => {
  it('chega às metas da Frente 10 (eventos, situações, veículos, formatos, covers, cenas, relíquias, crime)', () => {
    game('m19-count');
    const c = media19Counts();
    expect(c.events).toBeGreaterThanOrEqual(600);
    expect(c.situations).toBeGreaterThanOrEqual(130);
    expect(c.outlets).toBeGreaterThanOrEqual(65);
    expect(c.formats).toBeGreaterThanOrEqual(35);
    expect(c.covers).toBeGreaterThanOrEqual(85);
    expect(c.scenes).toBeGreaterThanOrEqual(60);
    expect(c.relics).toBeGreaterThanOrEqual(105);
    expect(c.orgs).toBeGreaterThanOrEqual(26);
    expect(c.chronicles).toBeGreaterThanOrEqual(25);
    expect(MEDIA19_EVENTS.length).toBeGreaterThanOrEqual(120);
    expect(MEDIA19_SITS()).toBe(44);
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
    expect(new Set(SITS.map((x) => x.id)).size).toBe(SITS.length);
  });
  it('dados válidos: cidades e gêneros existem, ids únicos, nada depois de 2026, crime sem mortos', () => {
    for (const x of SCENES19) { expect(cityById[x[1]], x[0]).toBeTruthy(); expect(genreById[x[2]], x[0]).toBeTruthy(); expect(x[3]).toBeLessThanOrEqual(x[4]); }
    for (const x of COVERS19) { expect(x[0]).toBeLessThanOrEqual(2026); expect(x[1]).toBeGreaterThanOrEqual(0); expect(x[1]).toBeLessThan(12); }
    for (const arr of [OUTLETS19.map((x) => x.id), FR19.map((x) => x.id), SHOWS19.map((x) => x.id), RELICS19.map((x) => x.id), ORGS19.map((x) => x.id)]) expect(new Set(arr).size).toBe(arr.length);
    for (const r of RELICS19) for (const st of r.steps ?? []) expect(st[0]).toBeLessThanOrEqual(2026);
    for (const d of DOC19) expect(d.dead).toBeUndefined();
    for (const o of ORGS19) { expect(cityById[o.city], o.id).toBeTruthy(); if (!o.real) expect(o.power).toBeLessThanOrEqual(40); }
  });
  it('toda opção dos eventos novos tem eco escrito; situações também', () => {
    for (const e of MEDIA19_EVENTS) for (const o of e.options) expect(ownConseq18(`ev:${e.id}:${o.id}`), `${e.id}:${o.id}`).toBeTruthy();
    for (const d of SITS.filter((x) => x.id.startsWith('m19'))) for (const o of d.options) expect(ownConseq18(`ev:sit17:${d.id}:${o.id}`), `${d.id}:${o.id}`).toBeTruthy();
    for (const id of ['fk19_ghostvoice', 'zn19_interview']) { const e = EVENTS.find((x) => x.id === id)!; for (const o of e.options) expect(ownConseq18(`ev:${id}:${o.id}`), `${id}:${o.id}`).toBeTruthy(); }
  });
  it('nada do futuro: programa e estúdio só aparecem na janela real', () => {
    const s = game('m19-fut', 1950);
    const r = Rng.fromSeed('x');
    const totp = MEDIA19_EVENTS.find((e) => e.id === 'm19w_totp')!;
    const cp = MEDIA19_EVENTS.find((e) => e.id === 'm19t_compass_point')!;
    for (let i = 0; i < 50; i++) { expect(totp.find!(s, r)).toBeNull(); expect(cp.find!(s, r)).toBeNull(); }
  });
});

describe('r19 9.10/9.11 — fanzines e fraudes', () => {
  it('fanzine próprio esquenta a cidade e acende uma cena (zine_scene); o porquê explica o calor', () => {
    const s = game('m19-zine', 1977);
    const a = myAct(s);
    s.player.cash += 1e9;
    expect(foundZine19(s, a.city, a.genre, 'Grito')).toBeNull();
    expect(recentFacts(s, { kinds: ['zine_founded'] }).length).toBeGreaterThan(0);
    zn19(s).heat[`${a.city}|${a.genre}`] = SCENE_HEAT19 - 0.5;
    for (let i = 0; i < 3 && !zn19(s).sc.length; i++) advanceMonth(s);
    expect(zn19(s).sc.length).toBeGreaterThan(0);
    expect(recentFacts(s, { kinds: ['zine_scene'] }).length).toBeGreaterThan(0);
    expect(explain18(s, 'zn19.heat', { c: a.city, g: a.genre })).toBeTruthy();
  });
  it('voz-fantasma exposta: escândalo, fãs e prêmios cassados (award_revoked)', () => {
    const s = game('m19-lip', 1988);
    const a = myAct(s);
    expect(startLip19(s, a.id)).toBeNull();
    recordAward(s, { year: s.year, category: 'new', actId: a.id, name: 'Revelação', byPlayer: true });
    const n0 = s.awards.length, fans0 = a.fans.casual + a.fans.active + a.fans.core;
    expose19(s, fk19(s).lip[0], 'leak');
    expect(s.awards.length).toBe(n0 - 1);
    expect(recentFacts(s, { kinds: ['lipsync_exposed'] }).length).toBe(1);
    expect(recentFacts(s, { kinds: ['award_revoked'] }).length).toBe(1);
    expect(a.fans.casual + a.fans.active + a.fans.core).toBeLessThan(fans0);
  });
  it('modo exato: revista real não está à venda e ato real não vira banda-fantasma', () => {
    const s = game('m19-exact', 1977, 'strict');
    s.player.cash += 1e9;
    expect(buyOutlet19(s, 'rolling_stone')).not.toBeNull();
    const real = Object.values(s.acts).find((x) => x.catalogNo && x.owner !== 'player' && x.fame >= 30);
    if (real) expect(spawnGhost19(s, Rng.fromSeed('g'), { of: real, k: 'name' })).toBeNull();
  });

  it('cadeia 6 forçada: fanzine → cena → corrida do ouro (scene_boom) → bandas-fantasma → lei nova', () => {
    const s = game('m19-chain6', 1979, 'free');
    const a = myAct(s);
    s.player.cash += 1e9;
    // 1) fanzine cria a cena
    expect(foundZine19(s, a.city, a.genre, 'Faísca')).toBeNull();
    zn19(s).heat[`${a.city}|${a.genre}`] = SCENE_HEAT19 + 1;
    for (let i = 0; i < 3 && !zn19(s).sc.length; i++) advanceMonth(s);
    const zsc = recentFacts(s, { kinds: ['zine_scene'] });
    expect(zsc.length).toBeGreaterThan(0);
    // 2) a corrida do ouro (Frente 7) chega pelo nome do fato
    emitFact(s, { kind: 'scene_boom', actors: [], place: a.city, severity: 40, visibility: 'public', tags: ['scene', a.genre], src: 'test', text: l('corrida do ouro', 'gold rush'), data: { g: a.genre } });
    expect(fk19(s).hot[`${a.city}|${a.genre}`]).toBeGreaterThan(s.week);
    // 3) bandas-fantasma aparecem na cena quente (sorteio do mês, até 24 meses)
    for (let i = 0; i < 24 && !recentFacts(s, { kinds: ['ghost_band'], months: 36 }).length; i++) { fk19(s).hot[`${a.city}|${a.genre}`] = s.week + 52; advanceMonth(s); }
    const gb = recentFacts(s, { kinds: ['ghost_band'], months: 36 });
    expect(gb.length).toBeGreaterThan(0);
    // 4) mais duas fraudes no mesmo mercado → lei de propaganda enganosa
    const r = Rng.fromSeed('c6');
    spawnGhost19(s, r, { city: a.city, g: a.genre, k: 'scene' });
    spawnGhost19(s, r, { city: a.city, g: a.genre, k: 'scene' });
    const mk = cityById[a.city].market;
    expect(lawIn19(s, mk)).toBe(true);
    expect(recentFacts(s, { kinds: ['law'], months: 36 }).some((f) => f.tags.includes('truth_ads'))).toBe(true);
  }, 120000);
});
