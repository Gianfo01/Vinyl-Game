// Rodada 19, onda 3, T6 (Frente 7, mercado A): certificações por país/época, pesquisa de mercado, faixas sem rosto,
// 360 de promotora, remédio antitruste e ciclo de vida da cena (cadeia 6: scene_boom → scene_bust).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { conseq18 } from '../src/sim/decide18';
import { explain18 } from '../src/sim/explain18';
import { applyMods, offerMods } from '../src/sim/ext4';
import { MARKETA19 } from '../src/sim/factmatrix19';
import { factListeners19, recentFacts } from '../src/sim/facts17';
import { inboxKind18 } from '../src/sim/inbox18';
import { STREAMS19 } from '../src/sim/rng19';
import { calendar19 } from '../src/sim/calendar19';
import { P } from '../src/sim/sys/people/state';
import { press } from '../src/sim/sys/press9';
import {
  CB19, answer360, antiMonth19, audit19, bid19, bodyOf19, certMonth19, certUnits19, ghost19, ghostMonth19, mka19, pickTest19, review19, revoke19,
  scenesMonth19, star360Month19, streamYear19, test19, testBonus19, thOf19, tierOf19,
} from '../src/sim/sys/market19a';
import type { Act, GameState, Release, Song } from '../src/sim/types';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';

const game = (y = 1995) => { const s = createGame(defaultConfig(`mka-${y}`, { startYear: y })); s.config.history = 'loose'; return s; };
const myAct = (s: GameState, o: { city?: string; genre?: string; fame?: number } = {}): Act => { const a = spawnProceduralAct(s, rngOf(s), { city: o.city ?? s.config.homeCity, genre: o.genre, fame: o.fame ?? 30 }); a.owner = 'player'; return a; };
let nRel = 0;
function rel(s: GameState, a: Act, o: Partial<Release> = {}): Release {
  const r: Release = { id: `mr${++nRel}`, actId: a.id, owner: 'player', type: 'lp', title: `Disco ${nRel}`, songs: [], week: s.week, year: s.year, q: 60, appeal: 30,
    formats: [], stock: 0, pressed: 0, marketing: [], marketingE: 0, territories: ['na', 'eu', 'br', 'latam', 'asia', 'africa', 'oceania'], weekly: [1000], totalUnits: 0, revenue: 0, peak: 5, weeksOnChart: 0, lastPos: 0, coverSeed: 1, shortage: 0, live: false, ...o };
  s.releases[r.id] = r; a.releases.push(r.id);
  return r;
}
const msgs = (s: GameState, k: string) => P(s).inbox.filter((m) => m.ref?.k18 === k);
const listens = (k: string) => factListeners19().filter((x) => x.kind === k).length;

describe('r19 T6 M8 — certificações por país e época', () => {
  it('patamares da época e fórmula de streams (EUA: singles 2013, álbuns 2016)', () => {
    const na = bodyOf19('na')!;
    expect(thOf19(na, 1985, 'single')[0]).toBe(1e6);
    expect(thOf19(na, 1990, 'single')[0]).toBe(5e5);
    expect(thOf19(na, 1995, 'lp')[2]).toBe(0);
    expect(thOf19(na, 2000, 'lp')[2]).toBe(1e7);
    expect(streamYear19(na, 'single')).toBe(2013);
    expect(streamYear19(na, 'lp')).toBe(2016);
    expect(tierOf19(2.4e6, [5e5, 1e6, 1e7])).toBe(3); // 2× platina
    expect(tierOf19(1.1e7, [5e5, 1e6, 1e7])).toBe(99);
    expect(CB19.length).toBeGreaterThanOrEqual(7);
    const s = game(2014), a = myAct(s), r = rel(s, a, { totalUnits: 3e6 });
    expect(certUnits19(s, r, na).counts).toBe(false);
    s.year = 2016;
    expect(certUnits19(s, r, na).counts).toBe(true);
  });
  it('disco do jogador espera auditoria; pagar entrega a placa, vira fato, manchete e prestígio', () => {
    const s = game(1995), a = myAct(s, { fame: 50 }), r = rel(s, a, { totalUnits: 4e6 });
    certMonth19(s);
    const st = mka19(s);
    const keys = Object.keys(st.pend).filter((k) => k.startsWith(`${r.id}|`));
    expect(keys.length).toBeGreaterThan(1);
    expect(msgs(s, 'mka19_cert').length).toBe(1);
    const plat = s.player.stats.platinum;
    s.player.cash += 1e9;
    for (const k of keys) expect(audit19(s, k)).toBeNull();
    expect(Object.keys(st.c[r.id] ?? {}).length).toBe(keys.length);
    expect(recentFacts(s, { kind: 'cert_award' }).length).toBeGreaterThan(0);
    expect(s.player.stats.platinum).toBeGreaterThan(plat);
    expect(press(s).hl.some((h) => h.t.pt.includes(r.title))).toBe(true);
    expect(explain18(s, 'mka19.cert', { rel: r.id, mk: 'na' })?.parts.length).toBeGreaterThanOrEqual(4);
  });
  it('contar pacotes sobe um degrau e pode ser revogado (eco)', () => {
    const s = game(2000), a = myAct(s), r = rel(s, a, { totalUnits: 8e6 });
    certMonth19(s);
    const k = Object.keys(mka19(s).pend).find((x) => x === `${r.id}|na`)!;
    expect(k).toBeDefined();
    const n0 = mka19(s).pend[k];
    s.player.cash += 1e9;
    audit19(s, k, true);
    expect(mka19(s).c[r.id].na).toBe(n0 + 1);
    expect(revoke19(s)).not.toBeNull();
    expect(mka19(s).c[r.id].na).toBe(n0);
    for (const x of ['audit', 'inflate', 'skip']) expect(conseq18(`ib:mka19_cert:${x}`)?.later?.length).toBe(1);
  });
});

describe('r19 T6 M7 — pesquisa de mercado', () => {
  const song = (s: GameState, a: Act, i: number, q: number, orig: number): Song => {
    const x = { id: `ms${i}${a.id}`, actId: a.id, title: `Faixa ${i}`, genre: a.genre, writers: [], melody: q, lyrics: 50, performance: 50, production: 50, originality: orig, q, recorded: true, createdWeek: s.week - i } as Song;
    s.songs[x.id] = x; return x;
  };
  it('teste custa, tem erro, deixa escolher e dá bônus nas paradas ao single escolhido', () => {
    const s = game(2015), a = myAct(s);
    const xs = [song(s, a, 1, 80, 30), song(s, a, 2, 50, 90), song(s, a, 3, 40, 60)];
    const cash = s.player.cash;
    const res = test19(s, a.id, 'ab');
    expect(res.ok).toBe(true);
    expect(s.player.cash).toBeLessThan(cash);
    expect(res.t!.best).toBe(xs[0].id);
    expect(msgs(s, 'mka19_test').length).toBe(1);
    pickTest19(s, res.t!.id, 'follow');
    const r = rel(s, a, { songs: [res.t!.pick!], week: s.week + 4 });
    expect(testBonus19(s, r).k).toBeGreaterThan(1);
    expect(recentFacts(s, { kind: 'track_test' }).length).toBe(1);
    expect(explain18(s, 'mka19.test', { t: res.t!.id })).not.toBeNull();
    expect(test19(s, a.id, 'callout').ok).toBe(true);
    const s2 = game(1960), b = myAct(s2); song(s2, b, 1, 60, 50); song(s2, b, 2, 55, 50);
    expect(test19(s2, b.id, 'ab').ok).toBe(false); // A/B só 2012+
  });
});

describe('r19 T6 N12/N15/N21 — playlists, promotora 360, antitruste', () => {
  it('faixas sem rosto: compra fechada paga; vazamento custa reputação; denúncia rende reputação', () => {
    const s = game(2018);
    const cash = s.player.cash;
    ghost19(s, 'accept');
    expect(s.player.cash).toBeGreaterThan(cash);
    const art = s.player.reputation.artistic;
    mka19(s).gh!.from = s.year - 1;
    for (let i = 0; i < 400 && !mka19(s).gh!.out; i++) ghostMonth19(s);
    expect(mka19(s).gh!.out).toBeDefined();
    expect(s.player.reputation.artistic).toBeLessThan(art);
    const ins = s.player.reputation.institutional;
    ghost19(s, 'expose');
    expect(s.player.reputation.institutional).toBeGreaterThan(ins);
    expect(listens('ghost_tracks')).toBeGreaterThanOrEqual(2);
  });
  it('estrela com contrato acabando recebe oferta 360; "deixar sair" vira saída no fim do contrato', () => {
    const s = game(2009), a = myAct(s, { fame: 80 });
    const c = { id: 'kx', actId: a.id, party: 'player', model: 'classic', advance: 0, royalty: 0.18, termMonths: 36, startWeek: s.week - 100, endWeek: s.week + 20, releasesOwed: 3, releasesDone: 3, creativeControl: false, publishing: false, share360: 0, recoupBalance: 0, promises: [] };
    s.contracts.kx = c as never; a.contractId = 'kx';
    star360Month19(s);
    expect(msgs(s, 'mka19_360').length).toBe(1);
    answer360(s, a.id, 'let');
    s.week += 25;
    star360Month19(s);
    expect(a.owner).not.toBe('player');
    expect(recentFacts(s, { kind: 'star_360' }).length).toBeGreaterThan(0);
    expect(calendar19(s, { weeks: 4 }).filter((d) => d.id.startsWith('market19a-360')).length).toBe(0);
  });
  it('fusão acima do limiar → remédio, leilão, lote vai para alguém', () => {
    const s = game(2005);
    const lb = Object.values(s.labels).find((x) => x.active)!;
    for (let i = 0; i < 80; i++) { const a = spawnProceduralAct(s, rngOf(s), { fame: 20 }); a.owner = lb.id; lb.roster.push(a.id); rel(s, a, { owner: lb.id, totalUnits: 20000 + i * 1000 }); }
    const x = review19(s, lb.id, { pt: 'teste', en: 'test' })!;
    expect(x).not.toBeNull();
    expect(msgs(s, 'mka19_divest').length).toBe(1);
    expect(recentFacts(s, { kind: 'antitrust_remedy' }).length).toBe(1);
    s.player.cash += 1e10;
    bid19(s, x.id, 'high');
    expect(x.bid).toBeGreaterThan(0);
    s.week = x.w;
    antiMonth19(s);
    expect(x.st).not.toBe('open');
    const owners = new Set(x.rels.map((r) => s.releases[r].owner));
    expect(owners.has(lb.id)).toBe(false);
    if (x.st === 'won') expect([...owners]).toEqual(['player']);
  });
});

describe('r19 T6 N23+E7 — ciclo da cena (cadeia 6: corrida → ressaca)', () => {
  it('cena forçada: hype → corrida (scene_boom) → saturação → ressaca (scene_bust) com efeitos', () => {
    const s = game(1990);
    const k = 'seattle:grunge';
    s.scenes[k] = 60;
    for (let i = 0; i < 6; i++) { const a = spawnProceduralAct(s, rngOf(s), { city: 'seattle', genre: 'grunge', fame: 10 }); a.owner = null; }
    scenesMonth19(s);
    const x = mka19(s).sc[k];
    expect(x?.ph).toBe(1);
    x.sg = 2; x.w = s.week - 20;
    scenesMonth19(s);
    expect(x.ph).toBe(2);
    expect(recentFacts(s, { kind: 'scene_boom' }).length).toBe(1);
    const local = spawnProceduralAct(s, rngOf(s), { city: 'seattle', genre: 'grunge', fame: 20 });
    const mod = offerMods().find((m) => m.id === 'mka19:rush')!;
    expect(mod.fn(s, local, { actId: local.id, model: 'classic', advance: 0, royalty: 0.15, termMonths: 36, releasesOwed: 3, creativeControl: false, publishing: false, share360: 0, promises: [] })?.delta).toBeLessThan(0);
    x.sg = 6; x.w = s.week - 120;
    scenesMonth19(s);
    expect(x.ph).toBe(3);
    const pop = s.genrePop.grunge ?? 1;
    x.w = s.week - 60;
    scenesMonth19(s);
    expect(x.ph).toBe(4);
    expect(recentFacts(s, { kind: 'scene_bust' }).length).toBe(1);
    expect(s.genrePop.grunge).toBeLessThan(pop);
    expect(applyMods(s, 'cityDemand', 100, { cityId: 'seattle', act: local }).value).toBeGreaterThan(100);
    expect(explain18(s, 'mka19.scene', { k })).not.toBeNull();
  });
});

describe('r19 T6 — malha', () => {
  it('todo tipo novo tem ouvinte; cartas com ecos; rng próprio', () => {
    for (const k of Object.keys(MARKETA19)) expect(listens(k), k).toBeGreaterThan(0);
    for (const k of ['mka19_cert', 'mka19_test', 'mka19_ghost', 'mka19_360', 'mka19_divest', 'mka19_rush']) expect(inboxKind18(k), k).toBeTruthy();
    for (const k of ['ib:mka19_test:follow', 'ib:mka19_ghost:accept', 'ib:mka19_360:let', 'ib:mka19_divest:high', 'ib:mka19_rush:indie']) expect(conseq18(k)?.later?.length, k).toBeGreaterThan(0);
    expect(STREAMS19.mka19).toBeTruthy();
  });
});
