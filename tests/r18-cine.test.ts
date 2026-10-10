// Rodada 18 (cine18): storyboards compostos pelo estado/decisões (cerimônia completa, grandes momentos) e carreiras
// póstumas (espólio, era da tecnologia, polêmica, aprovação, receita, crônica real só no modo exato).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { emitFact } from '../src/sim/facts17';
import { advanceMonth } from '../src/sim/tick';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { OFF_S17, choose17 } from '../src/sim/sys/scene17';
import { awardScene17 } from '../src/sim/sys/scenedefs17';
import { awardBoard18, board18, chooseFit18, crowd18, momentBoard18, type Aw18, type Kind18 } from '../src/sim/sys/cine18';
import { PK18, ask18, back18, block18, estate18, kindsNow18, post18, start18, tech18 } from '../src/sim/sys/post18';
import type { GameState } from '../src/sim/types';

OFF_S17.auto = true;
const game = (y: number, seed = 'cine18', history?: 'strict' | 'loose') => { const s = createGame(defaultConfig(seed, { startYear: y, ...(history ? { history } : {}) })); s.player.cash += 5e9; return s; };
const myAct = (s: GameState, fame = 60) => { const a = spawnProceduralAct(s, rngOf(s), { city: s.config.homeCity, fame }); a.owner = 'player'; a.fame = fame; a.fans.core = 20000; a.fans.casual = 200000; return a; };
const awOf = (s: GameState, actId: string, won: boolean): Aw18 => ({ cs: `cs-test-${won ? 'w' : 'l'}`, year: s.year, won: won ? 1 : 0, actId: won ? actId : null, rivalId: null, rivalName: 'Rival Records',
  cats: [{ id: 'album', name: { pt: 'Álbum do ano', en: 'Album of the year' }, winner: won ? 0 : 1, nominees: [{ name: s.acts[actId].name, mine: true, actId }, { name: 'Outro Ato', mine: false }, { name: 'Terceiro', mine: false }] }] });
const csOf = (aw: Aw18) => ({ id: aw.cs, data: { cats: aw.cats, won: aw.won, actId: aw.actId, rivalId: null, year: aw.year } as Record<string, unknown> });

describe('cine18: composição de cenas', () => {
  it('cerimônia completa: tapete, indicados, apresentador, envelope, vencedor, subida, discurso e festa; o tema escolhido vira balão', () => {
    const s = game(2015);
    const a = myAct(s);
    const aw = awOf(s, a.id, true);
    let b = awardBoard18(s, aw);
    expect(b.frames.map((f) => f.id)).toEqual(['carpet', 'noms', 'host', 'env', 'win', 'walk', 'speech', 'after']);
    expect(b.frames.find((f) => f.id === 'noms')!.noms!.length).toBe(3);
    expect(b.frames.find((f) => f.id === 'env')!.env!.win).toBe(true);
    expect(b.frames[0].slot).toBe('outfit');
    // figurino: decisão de imagem muda o visual em todos os quadros
    const r = chooseFit18(s, `aw:${aw.cs}`, 'bold', a.id);
    expect(r?.lines.length).toBeGreaterThan(0);
    expect(chooseFit18(s, `aw:${aw.cs}`, 'classic', a.id)).toBeNull();
    const key = awardScene17(s, csOf(aw))!;
    expect(key).toBe(`aw:${aw.cs}`);
    expect(choose17(s, key, 'political').res).toBeTruthy();
    b = awardBoard18(s, aw);
    expect(b.frames[0].actors[0].outfit).toEqual([3, 9]);
    const sp = b.frames.find((f) => f.id === 'speech')!;
    expect(sp.actors[0].bubble?.en).toMatch(/silent/);
    expect(sp.slot).toBeUndefined();
  });

  it('perder: a reação escolhida (sair) vira pose e caminhada; o protesto do escândalo aparece no tapete', () => {
    const s = game(2015, 'c18b');
    const a = myAct(s);
    emitFact(s, { kind: 'scandal', actors: [a.id], severity: 60, visibility: 'public', tags: ['bad'], text: { pt: 'Briga no hotel', en: 'Hotel brawl' } });
    expect(crowd18(s, a).mood).toBe('mixed');
    const aw = awOf(s, a.id, false);
    const key = awardScene17(s, csOf(aw))!;
    expect(choose17(s, key, 'walkout').res).toBeTruthy();
    const b = awardBoard18(s, aw);
    expect(b.frames.some((f) => f.id === 'speech')).toBe(false);
    const me = b.frames.find((f) => f.id === 'win')!.actors.find((x) => x.mark && x.mood === 'angry')!;
    expect(me.to).toBeTruthy();
    expect(me.bubble?.en).toMatch(/out/);
    expect(b.frames[0].props).toContain('protest');
    expect(b.frames[0].crowd.signs?.length).toBeGreaterThan(0);
  });

  it('todos os grandes momentos viram storyboard de 2+ quadros com legenda; holograma usa ator fantasma', () => {
    const s = game(2016, 'c18c');
    const a = myAct(s);
    const ks: Kind18[] = ['number1', 'signing', 'soldout', 'premiere', 'verdict', 'funeral', 'musicshow', 'festival', 'hall', 'hologram', 'avatar', 'ghost', 'tribute'];
    for (const k of ks) {
      const b = momentBoard18(s, { id: `t-${k}`, k, y: s.year, m: 0, w: s.week, act: a.id, pid: a.members[0] });
      expect(b.frames.length, k).toBeGreaterThanOrEqual(2);
      expect(b.frames.every((f) => f.caption.pt && f.caption.en && f.ms > 0), k).toBe(true);
    }
    const holo = board18(s, { id: 'h', k: 'hologram', y: 2013, m: 0, w: 0, act: a.id, pid: a.members[0], d: { q: 0.55, back: 70 } });
    expect(holo.frames.some((f) => f.actors.some((x) => x.ghost === 2) && f.fx.includes('flicker'))).toBe(true);
    expect(holo.frames.at(-1)!.crowd.mood).toBe('mixed');
  });
});

describe('post18: carreiras póstumas', () => {
  it('a era decide o que existe e a qualidade técnica', () => {
    const s = game(2005, 'p18a');
    expect(kindsNow18(s, true)).toContain('ghost');
    expect(kindsNow18(s, true)).not.toContain('holo_show');
    s.year = 2013;
    expect(kindsNow18(s, true)).toContain('holo_show');
    expect(kindsNow18(s, true)).not.toContain('holo_tour');
    expect(kindsNow18(s, true)).not.toContain('ghost');
    s.year = 2023;
    expect(kindsNow18(s, true)).toEqual(expect.arrayContaining(['avatar', 'ai_album', 'holo_tour']));
    expect(kindsNow18(s, false)).toEqual(expect.arrayContaining(['avatar', 'box', 'remaster', 'biopic']));
    expect(kindsNow18(s, false)).not.toContain('holo_tour');
    expect(tech18(2012, 'holo_show').q).toBeLessThan(tech18(2028, 'holo_show').q);
  });

  it('espólio com herdeiros: chance e polêmica explicadas; tributo aprovado rende, sobe o legado e vira cena', () => {
    const s = game(2014, 'p18b');
    const a = myAct(s, 70);
    const pid = a.members[0];
    s.persons[pid].alive = false; s.persons[pid].died = 2010;
    const e = estate18(s, pid)!;
    expect(e.heirs.length).toBeGreaterThan(0);
    const leg0 = e.legacy;
    const od = ask18(s, pid, 'holo_show', 'fair');
    expect(od.why.length).toBeGreaterThan(2);
    const bk = back18(s, pid, 'holo_show');
    expect(bk.v).toBeGreaterThan(back18(s, pid, 'tribute', 'charity').v);
    expect(bk.why.some((w) => /uncanny/i.test(w.en))).toBe(true);
    e.heirs.forEach((h) => (h.st = 'cash'));
    e.unity = 90;
    let r = start18(s, pid, 'tribute', 'high', 'ticketed');
    for (let i = 0; i < 8 && !r.ok; i++) { post18(s).cd[pid] = 0; s.week += 1; r = start18(s, pid, 'tribute', 'high', 'ticketed'); }
    expect(r.ok).toBe(true);
    expect(r.shot).toBeTruthy();
    expect(block18(s, pid, 'tribute')).toBeTruthy(); // já em andamento
    const cash0 = s.player.cash;
    advanceMonth(s);
    const pj = post18(s).proj.find((x) => x.k === 'tribute')!;
    expect(pj.st).toBe('done');
    expect(pj.rev).toBeGreaterThan(0);
    expect(s.player.cash).not.toBe(cash0);
    expect(estate18(s, pid)!.legacy).toBeGreaterThanOrEqual(leg0);
  });

  it('modo exato: artista real bloqueado e a crônica real aparece na data', () => {
    const s = game(2012, 'p18c', 'strict');
    const real = Object.values(s.acts).find((a) => a.catalogNo && a.members.length);
    if (real) { const pid = real.members[0]; s.persons[pid].alive = false; expect(block18(s, pid, 'tribute')?.en).toMatch(/Exact history/); }
    while (s.month < 4) advanceMonth(s);
    expect(post18(s).log.some(([, , t]) => /Tupac/.test(t.en))).toBe(true);
    expect(PK18.holo_show.from).toBe(2012);
  });
});
