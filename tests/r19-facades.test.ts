// Rodada 19 (Frente 0.6): fachadas únicas de fandom, rivais e prêmios — fonte única por número, leitura sem efeito
// colateral, aliases da API antiga, fatos-índice com ouvinte real.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { indexFacts as recentFacts } from '../src/sim/facts17';
import { advanceMonth } from '../src/sim/tick';
import { recordAward } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import * as fandomOld from '../src/sim/fandom';
import { fandomOf, fandomView19, fanEvents19, fanTotal19, fansByRegion19, loyalty19, mobilization19, scaleFans19 } from '../src/sim/fandom19';
import { addHeat19, coolHeat19, heat19, heatBand19, intents19, rivalActs19, rivalLabels19, rivalView19, spyOnRival } from '../src/sim/rivals19';
import * as rivals2 from '../src/sim/rivals2';
import { awOfCs18 } from '../src/sim/sys/cine18';
import { ceremonies19, ceremonyOfCutscene19, isPosthumous19, juryMemory19, nominations19, recordAward19, winners19 } from '../src/sim/awards19';
import { FACTS19, f19, juryLedger19 } from '../src/sim/sys/facades19';
import { Fx18 } from '../src/sim/decide18';
import type { GameState } from '../src/sim/types';
import { rng19 } from '../src/sim/rng19';

const game = (y = 1990, seed = 'fac19') => createGame(defaultConfig(seed, { startYear: y }));
const myAct = (s: GameState) => { const a = spawnProceduralAct(s, rng19(s, 'act'), { city: s.config.homeCity, fame: 50 }); a.owner = 'player'; a.fans.core = 2000; a.fans.active = 3000; a.fans.casual = 10000; return a; };
const rival = (s: GameState) => Object.values(s.labels).find((x) => x.active)!;

describe('fandom19', () => {
  it('lê sem criar estado e soma por região o mesmo total', () => {
    const s = game();
    const a = myAct(s);
    const before = JSON.stringify([s.fandoms[a.id] ?? null, (s.x4 as Record<string, any>).fans18?.a?.[a.id] ?? null]);
    const v = fandomView19(s, a.id)!;
    expect(v.total).toBe(15000);
    expect(loyalty19(s, a.id)).toBeGreaterThan(0);
    expect(mobilization19(s, a.id)).toBeGreaterThanOrEqual(0);
    expect(Object.values(v.motivation).reduce((x, y) => x + y, 0)).toBeCloseTo(1, 5);
    expect(JSON.stringify([s.fandoms[a.id] ?? null, (s.x4 as Record<string, any>).fans18?.a?.[a.id] ?? null])).toBe(before);
    const reg = Object.values(fansByRegion19(s, a.id)).reduce((x, y) => x + y, 0);
    expect(Math.abs(reg - 15000)).toBeLessThanOrEqual(7);
    expect(fandomOf).toBe(fandomOld.fandomOf); // alias
  });
  it('escala de fãs é a mesma do decide18 (Fx18.fans) e fan_wave tem ouvinte', () => {
    const s = game();
    const a = myAct(s);
    const b = { ...a, fans: { ...a.fans } };
    scaleFans19(b, 20);
    new Fx18(s, { act: a.id }, rng19(s, 'act')).fans(20);
    expect(a.fans).toEqual(b.fans);
    advanceMonth(s);
    a.fans.casual *= 2; a.fans.active *= 2;
    advanceMonth(s);
    expect(recentFacts(s, { kind: 'fan_wave', actor: a.id }).length).toBeGreaterThanOrEqual(1);
    expect(f19(s).waves.some((w) => w[2] === a.id)).toBe(true);
    expect(fanEvents19(s, a.id).some((e) => /Onda de fãs/.test(e.t.pt))).toBe(true);
    expect(fanTotal19(a)).toBe(a.fans.casual + a.fans.active + a.fans.core);
  });
});

describe('rivals19', () => {
  it('calor: fonte única s.rivalries, faixas e fatos rivalry_flare/rivalry_cool com ouvinte', () => {
    const s = game();
    const lb = rival(s);
    s.rivalries[lb.id] = 10;
    advanceMonth(s);
    expect(addHeat19(s, lb.id, 45)).toBe(heat19(s, lb.id));
    expect(heatBand19(heat19(s, lb.id))).toBe(heat19(s, lb.id) >= 75 ? 'war' : 'feud');
    advanceMonth(s);
    expect(recentFacts(s, { kind: 'rivalry_flare', actor: lb.id }).length).toBe(1);
    advanceMonth(s); // sem repetir
    expect(recentFacts(s, { kind: 'rivalry_flare', actor: lb.id }).length).toBe(1);
    coolHeat19(s, lb.id, 200);
    expect(heat19(s, lb.id)).toBe(0);
    advanceMonth(s);
    expect(recentFacts(s, { kind: 'rivalry_cool', actor: lb.id }).length).toBe(1);
    expect(f19(s).flares.filter((x) => x[2] === lb.id).length).toBe(2);
    expect(rivalLabels19(s)[0].id).toBeDefined();
    expect(spyOnRival).toBe(rivals2.spyOnRival);
  });
  it('intenções e retrato não criam memória nem fixam arquétipo', () => {
    const s = game();
    const lb = rival(s);
    const had = !!(s.x4 as Record<string, any>).rivals?.lb?.[lb.id]?.mind; // UNI-4: estado único dos rivais
    const arch = lb.archetype;
    const it19 = intents19(s, lb.id)!;
    expect(it19.lbId).toBe(lb.id);
    expect(rivalView19(s, lb.id)!.playbook).toBe(it19.playbook);
    expect(!!(s.x4 as Record<string, any>).rivals?.lb?.[lb.id]?.mind).toBe(had);
    expect(lb.archetype).toBe(arch);
    expect(rivalActs19(s, lb.id).every((a) => a.owner === lb.id)).toBe(true);
  });
});

describe('awards19', () => {
  it('livro único, vencedores normalizados, póstumo, memória do júri e fatos award_win/award_posthumous', () => {
    const s = game(2000);
    const a = myAct(s);
    advanceMonth(s);
    expect(recordAward19).toBe(recordAward);
    const n0 = a.awards, p0 = s.player.stats.awards;
    recordAward19(s, { year: s.year, category: 'record', actId: a.id, name: `${a.name} — X`, byPlayer: true });
    expect([a.awards - n0, s.player.stats.awards - p0]).toEqual([1, 1]);
    for (const id of a.members) { const p = s.persons[id]; if (p) { p.alive = false; p.died = s.year; } }
    recordAward19(s, { year: s.year, category: 'reg_eu', actId: a.id, name: 'Y', byPlayer: true });
    advanceMonth(s);
    expect(recentFacts(s, { kind: 'award_win', actor: a.id }).length).toBe(2);
    expect(recentFacts(s, { kind: 'award_posthumous', actor: a.id }).length).toBe(a.members.length ? 2 : 0);
    expect(juryLedger19(s, a.id).length).toBe(2);
    const w = winners19(s, { actId: a.id });
    expect(w.map((x) => x.src).sort()).toEqual(['gramo', 'regional']);
    expect(isPosthumous19(s, a.id)).toBe(a.members.length > 0);
    expect(juryMemory19(s, a.id).fatigue).toBe(2);
    expect(ceremonies19(s).some((c) => c.id === 'hall')).toBe(true);
    expect(ceremonies19(game(1970)).some((c) => c.id === 'hall')).toBe(false); // nada do futuro
    expect(nominations19(s, 'album')).toEqual([]);
  });
  it('cerimônia do envelope (cine18) usa a fachada e todo fato da fachada tem ouvinte', () => {
    const s = game(2010);
    const cs = { id: 'cs1', data: { year: 2010, won: 1, actId: 'x', cats: [] } as Record<string, unknown> };
    expect(awOfCs18(s, cs)).toEqual(ceremonyOfCutscene19(s, cs));
    for (const f of FACTS19) expect(f.listeners.length).toBeGreaterThan(0);
    expect(FACTS19.map((f) => f.kind)).toEqual(expect.arrayContaining(['fan_wave', 'rivalry_flare', 'award_win']));
  });
});
