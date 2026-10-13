// r28 F8: facções de fãs × escândalo (I13), escândalo do fundador-instituição (N25) e reputação de selo NPC nas ofertas.
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { l } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { emitFact, facts17 } from '../src/sim/facts17';
import { leaderOf } from '../src/sim/sys/leaders10';
import { founderOdds28, founderScandal28, labelRepAdj28, labelRepParts28, lrep28 } from '../src/sim/sys/labelrep28';
import { fs28, stance28 } from '../src/sim/sys/fanscandal28';
import { fan18 } from '../src/sim/sys/fans18';
import { labelClout } from '../src/sim/sys/offers12';
import type { Act, GameState } from '../src/sim/types';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';

const game = (seed = 'r28sys', y = 1995): GameState => { const c = defaultConfig(seed, { startYear: y } as Parameters<typeof defaultConfig>[1]); (c as { dbSize?: string }).dbSize = 'small'; return createGame(c); };
const myAct = (s: GameState, genre?: string): Act => { const a = spawnProceduralAct(s, rngOf(s), { city: s.config.homeCity, fame: 40 }); a.owner = 'player'; if (genre) a.genre = genre; a.fans.core = 5000; a.fans.active = 20000; a.fans.casual = 60000; return a; };
const sc = (s: GameState, a: Act, kind: string, sev = 70) => emitFact(s, { kind: 'scandal', actors: [a.id], severity: sev, visibility: 'public', tags: [kind, 'bad'], text: l(`Escândalo ${kind} de ${a.name}`, `${a.name} ${kind} scandal`), src: 'test', data: { kind, sev } });

describe('r28 F8 — facções × escândalo', () => {
  it('cada tipo tem uma régua diferente por facção', () => {
    const s = game(); const a = myAct(s, 'pop_rock');
    const pol = stance28(s, a, 'politics'), mon = stance28(s, a, 'money'), vio = stance28(s, a, 'violence');
    expect(pol.comm).toBeGreaterThan(0); expect(pol.main).toBeLessThan(0); // comunidade defende a causa, mainstream foge
    expect(mon.purist).toBeLessThan(pol.purist); // puristas não perdoam dinheiro
    expect(vio.comm).toBeLessThan(pol.comm);
    expect(JSON.stringify(pol)).not.toBe(JSON.stringify(mon));
  });
  it('escândalo real gera reação registrada, racha ou defesa vira fato; determinístico', () => {
    const run = () => {
      const s = game(); const a = myAct(s);
      fan18(s, a.id);
      sc(s, a, 'politics'); sc(s, a, 'money'); sc(s, a, 'violence');
      return { log: fs28(s).log.map((r) => [r.kind, r.out]), facts: facts17(s).f.filter((f) => f.src === 'fs28').map((f) => f.kind), core: a.fans.core, act: a.fans.active };
    };
    const x = run(), y = run();
    expect(x).toEqual(y);
    expect(x.log.length).toBe(3);
    expect(new Set(x.log.map((r) => r[1])).size).toBeGreaterThan(1); // reações diferentes
  });
  it('ato de NPC não usa o fans18 do jogador', () => {
    const s = game(); const n = Object.values(s.acts).find((a) => a.owner && a.owner !== 'player')!;
    sc(s, n, 'drugs');
    expect(fs28(s).log.length).toBe(0);
  });
});

describe('r28 F8 — fundador e reputação de selo nas ofertas', () => {
  it('escândalo do fundador derruba reputação, confiança do elenco e o peso do selo para o artista', () => {
    const s = game();
    const lb = Object.values(s.labels).find((x) => x.active && leaderOf(s, x.id))!;
    expect(lb).toBeTruthy();
    const L0 = leaderOf(s, lb.id)!; L0.founder = true;
    const rep0 = lb.reputation, clout0 = labelClout(s, lb.id);
    expect(founderOdds28(s, lb)).toBeGreaterThan(0);
    expect(founderScandal28(s, lb.id, Rng.fromSeed('t'))).toBe(true);
    expect(founderScandal28(s, lb.id, Rng.fromSeed('t'))).toBe(false); // uma vez por fundador
    expect(lb.reputation).toBeLessThan(rep0);
    expect(labelClout(s, lb.id)).toBeLessThan(clout0);
    expect(labelRepParts28(s, lb.id).map((p) => p.k)).toContain('founder');
    expect(facts17(s).f.some((f) => f.kind === 'scandal' && f.tags.includes('founder') && f.actors[0] === lb.id)).toBe(true);
  });
  it('processos e falências do CEO pesam; o desconto some com o tempo', () => {
    const s = game();
    const lb = Object.values(s.labels).find((x) => x.active && leaderOf(s, x.id))!;
    const a = Object.values(s.acts)[0];
    emitFact(s, { kind: 'case_ruling', actors: [a.id, lb.id], severity: 35, visibility: 'public', tags: ['strike', 'lawsuit'], text: l('Processo', 'Suit'), src: 'test' });
    expect(lrep28(s).lb[lb.id].suits.length).toBe(1);
    leaderOf(s, lb.id)!.jobs.unshift({ lb: 'outro', n: 'Outro', from: 1980, to: 1985, end: 'closed' });
    const ks = labelRepParts28(s, lb.id).map((p) => p.k);
    expect(ks).toContain('suits'); expect(ks).toContain('ceo');
    expect(labelRepAdj28(s, lb.id)).toBeLessThan(-0.1);
    s.week += 52 * 6;
    expect(labelRepParts28(s, lb.id).map((p) => p.k)).not.toContain('suits');
  });
  it('mês roda sem erro com o gancho', () => {
    const s = game('r28sys-m', 2018);
    for (let i = 0; i < 3; i++) advanceMonth(s);
    expect(lrep28(s)).toBeTruthy();
  });
});

import { CRAFT28, craftAwards28, dimScore28 } from '../src/sim/sys/awards28';
import { gramoScore } from '../src/sim/sys/ceremonies8';
import { dims18 } from '../src/sim/sys/quality18';

describe('r28 F8 — prêmios pelas dimensões de qualidade (I18)', () => {
  it('Gramófonos: duas gravações iguais em q e vendas, a de dimensões melhores pontua mais', () => {
    const s = game('r28aw', 1975);
    for (let i = 0; i < 14; i++) advanceMonth(s);
    const rels = Object.values(s.releases).filter((x) => x.type === 'single' && dims18(s, x));
    expect(rels.length).toBeGreaterThan(2);
    const sc = rels.map((x) => ({ x, d: dimScore28(s, x, 'record')!, g: gramoScore(s, 'record', x) - (x.q * 1.2 + Math.log10(1 + x.totalUnits) * 8) }));
    const hi = sc.reduce((a, b) => (b.d > a.d ? b : a)), lo = sc.reduce((a, b) => (b.d < a.d ? b : a));
    expect(hi.g).toBeGreaterThan(lo.g);
  });
  it('Prêmios do Ofício em dezembro: um por dimensão, com a nota na citação, uma vez por ano', () => {
    const s = game('r28aw2', 1975);
    for (let i = 0; i < 13 && !s.awards.some((a) => a.category.startsWith('craft_')); i++) advanceMonth(s);
    const n0 = s.awards.filter((a) => a.category.startsWith('craft_')).length;
    expect(n0).toBeGreaterThanOrEqual(3); // o gancho mensal já entregou
    s.month = 11; expect(craftAwards28(s)).toEqual([]); // não repete no mesmo ano
    const a = s.awards.find((x) => x.category === 'craft_tech')!;
    expect(a.name).toMatch(/técnica \d+/);
    expect(CRAFT28.length).toBe(4);
  });
});
