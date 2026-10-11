import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { emitFact, recentFacts } from '../src/sim/facts17';
import { LINKFACTS19, WHITELIST19, factMatrix19 } from '../src/sim/factmatrix19';
import { STREAMS19 } from '../src/sim/rng19';
import { explain18 } from '../src/sim/explain18';
import { NEURAL19 } from '../src/sim/neural';
import { SUP19 } from '../src/sim/sys/supply18';
import { cal19 } from '../src/sim/calendar19';
import { hypeOf } from '../src/sim/sys/hype12';
import { radio18 } from '../src/sim/sys/radio18';
import { soc18 } from '../src/sim/sys/society18';
import { live18 } from '../src/sim/sys/live18';
import { cine18, chooseFit18, momentBoard18 } from '../src/sim/sys/cine18';
import { dec18 } from '../src/sim/sys/decide18';
import { cityById, l } from '../src/data/world';
import { estShare19, l19a, month19a, regionDemand19, strongEcho19, tragedyOdds19 } from '../src/sim/sys/links19a';
import '../src/sim/sys/index';
import type { Act, GameState } from '../src/sim/types';

function setup(seed: string): { s: GameState; a: Act } {
  const s = createGame(defaultConfig(seed));
  const a = Object.values(s.acts).filter((x) => x.members.length && !x.catalogNo).sort((x, y) => y.fame - x.fame)[0];
  a.owner = 'player';
  return { s, a };
}
const relOf = (s: GameState, a: Act, weeksAgo = 2) => {
  const id = `rl19a-${a.id}`;
  s.releases[id] = { ...Object.values(s.releases)[0], id, actId: a.id, owner: 'player', title: 'Teste', week: s.week - weeksAgo, revenue: 0, kind: 'standard' } as GameState['releases'][string];
  a.releases = [...a.releases, id];
  return s.releases[id];
};

describe('r19 links A — matriz e registro', () => {
  it('tipos novos têm ouvinte direto e saíram da lista de exceções', () => {
    for (const k of Object.keys(LINKFACTS19)) expect(factMatrix19([k])[0].listeners.some((x) => x.startsWith('links19a:')), k).toBe(true);
    expect(WHITELIST19.crowd_incident).toBeUndefined();
    expect(WHITELIST19.video_banned).toBeUndefined();
    expect(STREAMS19.links19a).toBeTruthy();
  });
  it('porquê de cada ligação existe', () => {
    const { s } = setup('l19a-why');
    for (const id of ['estate', 'delay', 'banned', 'crowd', 'echo', 'region']) expect(explain18(s, 'link18', { id }), id).not.toBeNull();
  });
});

describe('r19 links A — espólio × hologramas', () => {
  it('uso sem aval: fato, escândalo e herdeiros; exato bloqueia reais', () => {
    const { s, a } = setup('l19a-est');
    const pid = a.members[0];
    s.persons[pid].alive = false; s.persons[pid].died = s.year - 3;
    const sc = a.scandals;
    NEURAL19.used!(s, pid, 'holo', false);
    const f = recentFacts(s, { kind: 'estate_rights' })[0];
    expect(f.tags).toContain('unauthorized');
    expect(a.scandals).toBeGreaterThan(sc);
    const sh = estShare19(s, pid);
    expect(sh).toBeGreaterThanOrEqual(0.05); expect(sh).toBeLessThanOrEqual(0.15);
    expect(NEURAL19.gate!(s, pid, false)).toBeNull();
    a.owner = 'npc' as Act['owner']; a.playerBand = undefined; a.catalogNo = 7 as Act['catalogNo']; s.config.history = 'strict';
    expect(NEURAL19.gate!(s, pid, false)).not.toBeNull();
  });
});

describe('r19 links A — fábrica → hype, rádio, calendário', () => {
  it('atraso esfria hype, tira rotação e entra no calendário', () => {
    const { s, a } = setup('l19a-sup');
    const rel = relOf(s, a);
    radio18(s).rot[rel.id] = [{ st: 'x', lvl: 2, w: s.week }];
    SUP19.late!(s, { id: 'pr1', act: a.id, title: 'Disco', weeks: 6, how: 'postpone', w: s.week + 6 });
    expect(recentFacts(s, { kind: 'release_delayed' }).length).toBe(1);
    expect(hypeOf(s, `n:${a.id}`).parts.some((p) => p.v < 0) || hypeOf(s, `n:${a.id}`).v <= 0).toBe(true);
    expect(radio18(s).rot[rel.id][0].lvl).toBe(1);
    expect(cal19(s).n.some((d) => d.id === 'links19a:delay:pr1' && d.kind === 'supply')).toBe(true);
  });
});

describe('r19 links A — censura → pirataria', () => {
  it('música proibida vira banned_song e fãs crescem', () => {
    const { s, a } = setup('l19a-ban');
    const rel = relOf(s, a);
    const c0 = a.fans.casual;
    soc18(s).banned[rel.id] = s.year;
    month19a(s);
    expect(recentFacts(s, { kind: 'banned_song' }).length).toBe(1);
    expect(a.fans.casual).toBeGreaterThan(c0);
    month19a(s);
    expect(recentFacts(s, { kind: 'banned_song' }).length).toBe(1);
  });
});

describe('r19 links A — festival × segurança × crime', () => {
  it('tragédia: processo e lei; exato nunca', () => {
    const { s } = setup('l19a-fest');
    expect(tragedyOdds19(s, 10000, 10000, 8000, 20).p).toBeGreaterThan(tragedyOdds19(s, 5000, 10000, 8000, 70).p);
    const n0 = s.lawsuits.length, i0 = live18(s).inc.length;
    emitFact(s, { kind: 'crowd_incident', actors: ['player'], severity: 85, tags: ['festival', 'safety', 'tragedy'], text: l('Tragédia teste', 'Test tragedy'), data: { sev: 3, att: 20000 }, src: 'links19a' });
    expect(s.lawsuits.length).toBe(n0 + 1);
    expect(s.lawsuits[s.lawsuits.length - 1].kind).toBe('safety');
    expect(live18(s).inc.length).toBe(i0 + 1);
    expect(recentFacts(s, { kind: 'law' }).some((f) => f.tags.includes('links19a'))).toBe(true);
    s.config.history = 'strict';
    expect(tragedyOdds19(s, 10000, 10000, 8000, 20).p).toBe(0);
  });
});

describe('r19 links A — ecos e cenas (11.7)', () => {
  it('eco forte abre cena curta; roupa do tapete agenda eco', () => {
    const { s, a } = setup('l19a-echo');
    const f = emitFact(s, { kind: 'echo', actors: [a.id], severity: 35, tags: ['echo18', 'bad', 'x'], text: l('Voltou', 'Came back'), data: { o: 'Mentir', n: 3, thr: 't9' }, src: 'decide18' });
    expect(strongEcho19(f)).toBe(true);
    const sh = cine18(s).log.find((x) => x.k === 'echo');
    expect(sh).toBeTruthy();
    expect(momentBoard18(s, sh!).frames[0].caption.pt).toContain('Mentir');
    const q0 = dec18(s).q.length;
    chooseFit18(s, 'aw:test', 'bold', a.id);
    expect(dec18(s).q.length).toBeGreaterThan(q0);
    expect(dec18(s).q.some((e) => e.k === 'fit18:bold')).toBe(true);
  });
});

describe('r19 links A — fãs por região', () => {
  it('procura fora de casa fica na faixa; base nova dá bônus', () => {
    const { s, a } = setup('l19a-reg');
    const home = cityById[a.city].market;
    const city = Object.values(cityById).find((c) => c.market !== home)!;
    const r = regionDemand19(s, a, city.id)!;
    expect(r.k).toBeGreaterThanOrEqual(0.9); expect(r.k).toBeLessThanOrEqual(1.5);
    emitFact(s, { kind: 'fan_region', actors: [a.id, 'player'], severity: 30, tags: ['fans'], text: l('Base nova', 'New base'), data: { mk: city.market }, src: 'links19a' });
    expect(l19a(s).rb[`${a.id}:${city.market}`]).toBeGreaterThan(s.week);
    expect(regionDemand19(s, a, city.id)!.buzz).toBe(true);
  });
});
