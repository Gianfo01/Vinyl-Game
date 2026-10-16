// Rodada 19 (Frente 1, grupo B + 11.10 + 11.11): cada ligação tem regra, gancho, "porquê" e fato com ouvinte.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { conseq18 } from '../src/sim/decide18';
import { explain18 } from '../src/sim/explain18';
import { offerMods } from '../src/sim/ext4';
import { LINKS19B } from '../src/sim/factmatrix19';
import { emitFact, factListeners19 } from '../src/sim/facts17';
import { inboxKind18 } from '../src/sim/inbox18';
import { fin18, mIdx18 } from '../src/sim/ledger18';
import { heat19, mind18 } from '../src/sim/rivals19';
import { STREAMS19 } from '../src/sim/rng19';
import { l } from '../src/data/world';
import { ag17 } from '../src/sim/sys/agenda17';
import { A18_HOOK19 } from '../src/sim/sys/artist18';
import { CAMPUS19, campus18 } from '../src/sim/sys/campus18';
import { GRAMO_ADJ } from '../src/sim/sys/ceremonies8';
import { dec18 } from '../src/sim/sys/decide18';
import { betray19, buyIns19, campusScore19, fxCrises19, fxSub19, l19b, labelEye19, pathJury19, sessAdj19, sessPts19 } from '../src/sim/sys/links19b';
import { choosePath18 } from '../src/sim/sys/paths18';
import { P } from '../src/sim/sys/people/state';
import { makeReport18 } from '../src/sim/sys/report18';
import type { GameState, Release } from '../src/sim/types';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { rng19 } from '../src/sim/rng19';

const game = (y = 1990, over = {}) => createGame(defaultConfig('l19b', { startYear: y, ...over }));
const myAct = (s: GameState) => { const a = spawnProceduralAct(s, rng19(s, 'act'), { city: s.config.homeCity, fame: 30 }); a.owner = 'player'; return a; };
const rival = (s: GameState) => Object.values(s.labels).find((x) => x.active)!;
const msgs = (s: GameState, k: string) => P(s).inbox.filter((m) => m.ref?.k18 === k);
const fakeRel = (s: GameState, actId: string, o: Partial<Release> = {}) => ({ id: 'rx', actId, owner: 'player', week: s.week, year: s.year, title: 'X', songs: [], type: 'lp', ...o }) as unknown as Release;

describe('registro', () => {
  it('todo tipo novo tem ouvinte com efeito; fluxo de sorteio próprio registrado', () => {
    const ls = factListeners19();
    for (const k of Object.keys(LINKS19B)) expect(ls.some((x) => x.kind === k && x.id.startsWith('links19b')), k).toBe(true);
    expect(STREAMS19.l19b).toBeTruthy();
  });
});

describe('1. sessão × qualidade × CA/PA', () => {
  it('músico forte sobe a dimensão certa; fraco derruba; porquê explicado', () => {
    const s = game(1965);
    const a = myAct(s);
    const m = s.year * 12 + s.month;
    ag17(s).sess.push({ crew: 'funk', actId: a.id, start: m, until: m + 5, q: 0.92, kind: 'studio', monthly: 0, fam: [] });
    ag17(s).sess.push({ crew: 'locals', actId: a.id, start: m, until: m + 5, q: 0.3, kind: 'studio', monthly: 0, fam: [] });
    const adj = sessAdj19(s, fakeRel(s, a.id), a);
    expect(adj.find((x) => x.d === 'imm')!.v).toBe(sessPts19(0.92));
    expect(adj.find((x) => x.d === 'tech')!.v).toBeLessThan(0);
    s.releases.rx = fakeRel(s, a.id);
    expect(explain18(s, 'l19b.session', { rel: 'rx' })?.parts.length).toBe(2);
    const p = s.persons[a.members[0]], mo = p.morale;
    emitFact(s, { kind: 'session_mark', actors: [a.id, 'player'], severity: 20, tags: ['good'], text: l('t', 't') });
    expect(p.morale).toBe(Math.min(100, mo + 2));
  });
});

describe('2. câmbio por submercado', () => {
  it('crise da tequila (modo exato) cobra a receita faturada no México e o fato atinge quem depende', () => {
    const s = game(1994, { history: 'strict' });
    expect(fxCrises19(s).some((c) => c.sub === 'mx')).toBe(true);
    (fin18(s).m[mIdx18(s)] ??= {})['mk:latam'] = 10_000_000;
    expect(fxSub19(s, 'mx', 0.25).loss).toBeGreaterThan(0);
    const lb = rival(s), cash = lb.cash;
    emitFact(s, { kind: 'fx_crisis', actors: [lb.id], severity: 40, tags: ['fx', 'mx'], text: l('crise', 'crisis') });
    expect(lb.cash).toBeLessThan(cash);
    expect(explain18(s, 'fx19.sub', { sub: 'mx' })).not.toBeNull();
  });
  it('fora do modo exato, depois do início, a tabela real não roteiriza', () => {
    const s = game(1990, { history: 'loose' });
    s.year = 1994;
    expect(fxCrises19(s).some((c) => c.sub === 'mx' && c.from === 1994)).toBe(false);
  });
});

describe('3. inteligência de rivais, pactos e traições', () => {
  it('intenção revelada vira nota do relatório e carta; pacto pode virar traição com carta', () => {
    const s = game(1985);
    const a = myAct(s), lb = rival(s);
    const m = mind18(s, lb.id);
    m.target = { k: 'act', id: a.id, since: s.week, until: s.week + 52, why: l('teste', 'test') };
    l19b(s).rv[lb.id] = s.week;
    expect(makeReport18(s).notes.some((n) => n.pt.startsWith('Inteligência'))).toBe(true);
    emitFact(s, { kind: 'rival_intel', actors: [lb.id, a.id], severity: 20, tags: [], text: l('x', 'x') });
    const msg = msgs(s, 'l19b_intel')[0];
    expect(msg).toBeTruthy();
    inboxKind18('l19b_intel')!.handle!(s, msg, 'pact', rng19(s, 'act'));
    expect(m.pact).toBeTruthy();
    expect(m.target).toBeUndefined();
    expect(conseq18('ib:l19b_intel:pact')?.later?.length).toBe(1);
    const h = heat19(s, lb.id);
    betray19(s, lb);
    expect(m.pact).toBeUndefined();
    expect(heat19(s, lb.id)).toBeGreaterThan(h);
    expect(msgs(s, 'l19b_betray').length).toBe(1);
  });
});

describe('4/6. campus: moral, qualidade, atração; obra atrasada e seguro como cartas', () => {
  it('placar do campus mexe em propostas; investimento destrava bônus', () => {
    const s = game(1980);
    const c = campus18(s);
    c.built.dorm = { lot: 0, y: s.year, q: 1 }; c.built.store = { lot: 1, y: s.year, q: 1 };
    expect(campusScore19(s).v).toBeGreaterThanOrEqual(3);
    const free = spawnProceduralAct(s, rng19(s, 'act'), {});
    const mod = offerMods().find((x) => x.id === 'links19b:campus')!;
    expect(mod.fn(s, free, {} as never)!.delta).toBeGreaterThan(0);
    emitFact(s, { kind: 'campus_invest', actors: ['player'], severity: 20, tags: ['good', 'studio'], text: l('x', 'x') });
    expect(dec18(s).unl['campus19:studio']).toBe(s.week);
  });
  it('atraso e dano viram cartas com ecos', () => {
    const s = game(1980);
    expect(CAMPUS19.delay!(s, { id: 'cp1', kind: 'store', lot: 0, q: 0, start: 0, months: 4, left: 3, cost: 100000, paid: 30000, over: 0, delays: 1 }, l('chuva', 'rain'))).toBe(true);
    expect(msgs(s, 'l19b_delay')[0].actions!.map((a) => a.id)).toEqual(['rush', 'swap', 'accept']);
    for (const k of ['rush', 'swap', 'accept']) expect(conseq18(`ib:l19b_delay:${k}`)?.later?.length).toBe(1);
    buyIns19(s);
    CAMPUS19.dmg!(s, { kind: 'disaster', tags: ['crime'], text: l('Incêndio', 'Fire'), src: 'crime17' } as never, 'hq');
    const m = msgs(s, 'l19b_ins')[0];
    expect(m.actions!.map((a) => a.id)).toEqual(['claim', 'rebuild', 'wait']);
    expect(m.ref?.ars).toBe(1);
  });
});

describe('5. júri lê o caminho', () => {
  it('selo de paradas com crítica fraca perde pontos; ajuste entra no placar de indicação', () => {
    const s = game(1990);
    const a = myAct(s);
    choosePath18(s, 'major');
    const rel = fakeRel(s, a.id, { critic: 40, criticN: 5 });
    expect(pathJury19(s, rel, 'album').v).toBe(-3);
    s.releases[rel.id] = rel;
    const tot = () => GRAMO_ADJ.reduce((t, f) => t + f(s, rel.id, 'album'), 0);
    const major = tot();
    choosePath18(s, 'indie');
    expect(tot() - major).toBeCloseTo(3, 9); // indie com crítica fraca: neutro (R29: outros ajustes do júri somam frações)
    expect(pathJury19(s, fakeRel(s, a.id, { critic: 95, criticN: 5 }), 'album').v).toBe(2);
  });
});

describe('7. PA e olho do A&R nas ofertas; corrida pelo jovem', () => {
  it('ofertas registram a aposta e o olho fica entre 0,2 e 0,95', () => {
    const s = game(1990, { role: 'artist' });
    const band = Object.values(s.acts).find((x) => x.playerBand) ?? (() => { const a = myAct(s); a.playerBand = true; return a; })();
    const lb = rival(s);
    const e = labelEye19(s, lb);
    expect(e).toBeGreaterThanOrEqual(0.2); expect(e).toBeLessThanOrEqual(0.95);
    const o = { id: 'ao1', k: 'record', lb: lb.id, adv: 100000, why: [] } as never as Parameters<NonNullable<typeof A18_HOOK19.adj>>[1];
    A18_HOOK19.adj!(s, o);
    expect(l19b(s).bet.ao1).toBeTruthy();
    expect(o.adv).toBeGreaterThanOrEqual(85000); expect(o.adv).toBeLessThanOrEqual(130000);
    expect(A18_HOOK19.dev!(s, { ...lb, strategy: 'develop' }, band)).toBeGreaterThanOrEqual(0.25);
    const h = heat19(s, lb.id);
    emitFact(s, { kind: 'talent_race', actors: [band.id, lb.id], severity: 20, tags: [], text: l('x', 'x') });
    expect(heat19(s, lb.id)).toBe(h + 3);
  });
});
