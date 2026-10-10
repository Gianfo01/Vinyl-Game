// Rodada 17 — fundação da integração: barramento de fatos (com pontes de remember/chron), livro de obrigações
// (com adaptadores dos segredos antigos), estresse único, pipeline de escândalo (mesmo contador, reação regional)
// e situações do diretor (NPC escolhe pelos traços; você recebe cartão). Determinismo.
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { l } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { offerMods } from '../src/sim/ext4';
import { emitFact, factsAbout, facts17, onFact, recentFacts } from '../src/sim/facts17';
import { allHolds, grantHold, holdsOf, leverage, useHold } from '../src/sim/holds17';
import { scandal, scandalReaction, lastScandal } from '../src/sim/scandal17';
import { addStress, stress17, stressOf } from '../src/sim/stress17';
import { advanceMonth } from '../src/sim/tick';
import { remember } from '../src/sim/util';
import { createGame } from '../src/sim/worldgen';
import { chron } from '../src/sim/sys/chron9';
import { f16 } from '../src/sim/sys/fame16';
import { intrigue } from '../src/sim/sys/intrigue';
import { _bridge17 } from '../src/sim/sys/bridge17';
import { SITS, npcChoice, runSituations, sit17 } from '../src/sim/sys/situations17';
import '../src/sim/sys/sits17';
import type { Act, GameState } from '../src/sim/types';

const npcAct = (s: GameState): Act => Object.values(s.acts).filter((a) => a.owner !== 'player' && !a.playerBand && a.status !== 'retired' && a.status !== 'split' && a.members.length >= 2).sort((a, b) => b.fame - a.fame)[0];

describe('r17 fundação', () => {
  it('fatos: emitir, ouvir, consultar e pontes de remember/chron sem duplicar', () => {
    const s = createGame(defaultConfig('r17-f1'));
    const a = npcAct(s);
    const seen: string[] = [];
    onFact('arrest', (_s, f) => seen.push(f.id), 'test:arrest');
    const f = emitFact(s, { kind: 'arrest', actors: [a.members[0], a.id], place: a.city, severity: 60, visibility: 'rumor', tags: ['crime', 'bad'], text: l('Preso.', 'Arrested.') });
    expect(seen).toEqual([f.id]);
    // onda 1: o selo do ato reage na hora (npc17: banca ou rescinde) com um fato causado pela prisão
    expect(factsAbout(s, a.id).find((x) => x.kind === 'arrest')?.id).toBe(f.id);
    expect(factsAbout(s, a.id).filter((x) => x.id !== f.id).every((x) => x.cause?.includes(f.id))).toBe(true);
    expect(factsAbout(s, `p:${a.members[0]}`).find((x) => x.kind === 'arrest')?.id).toBe(f.id);
    expect(recentFacts(s, { kind: 'arrest', months: 1 })).toHaveLength(1);
    const n0 = facts17(s).f.length;
    chron(s, { k: 'award', i: 3, a: [a.id], t: l('Prêmio X.', 'Award X.') });
    expect(facts17(s).f.length).toBe(n0 + 1);
    expect(facts17(s).f.at(-1)!.kind).toBe('award');
    // remember de tipo da crônica vira um fato só (pela crônica)
    remember(s, 'death', l('Morreu alguém.', 'Someone died.'), { actId: a.id, important: true });
    expect(facts17(s).f.filter((x) => x.text.pt === 'Morreu alguém.')).toHaveLength(1);
    remember(s, 'signed', l('Assinou.', 'Signed.'), { actId: a.id });
    expect(facts17(s).f.at(-1)!.kind).toBe('signing');
  });

  it('escândalo: mesmo contador, Fact tipado e reação por país (religião/época) e patrocínio', () => {
    const s = createGame(defaultConfig('r17-sc', { startYear: 1965 }));
    const a = npcAct(s);
    const before = a.scandals;
    const r = scandal(s, a.id, 'sex', 60, undefined, { person: a.members[0] });
    expect(a.scandals).toBe(before + 1);
    expect(r.fact?.kind).toBe('scandal');
    expect(r.fact?.tags).toContain('sex');
    expect(r.why.length).toBeGreaterThan(0);
    expect(lastScandal(s, a.id)?.eff).toBe(r.eff);
    if (r.a3) expect(f16(s).d[a.id]?.[r.a3]).toBeLessThan(0);
    // mais religioso e mais cedo dói mais (mesmo ato)
    const early = scandalReaction(s, a, 'sex', 60);
    s.year = 2030;
    const late = scandalReaction(s, a, 'sex', 60);
    expect(early.eff).toBeGreaterThanOrEqual(late.eff);
    // patrocínio família rompe
    s.deals.push({ id: 'bdx', actId: a.id, brand: 'Cola Estrela', kind: 'sponsor', fee: 1, untilWeek: s.week + 50, exclusive: true, status: 'active', boost: 0.3 });
    const r2 = scandal(s, a.id, 'drugs', 100);
    if (r2.eff >= 35) expect(s.deals.find((d) => d.id === 'bdx')!.status).toBe('done');
  });

  it('obrigações: conceder, alavancar oferta, usar, perdoar; adaptadores dos segredos antigos', () => {
    const s = createGame(defaultConfig('r17-h'));
    const a = npcAct(s);
    const h0 = grantHold(s, { holder: 'player', target: a.id, kind: 'favor', strength: 50, months: 12, text: l('Favor', 'Favor') });
    expect(holdsOf(s, a.id).owes.map((x) => x.id)).toContain(h0.id);
    expect(leverage(s, 'player', a.id).v).toBeGreaterThan(0);
    const mod = offerMods().find((m) => m.id === 'holds17')!;
    expect(mod.fn(s, a, { actId: a.id, royalty: 0.12, advance: 0, termMonths: 24, albums: 1, creativeControl: false } as never)?.delta).toBeGreaterThan(0);
    const t0 = a.trust;
    expect(useHold(s, h0.id, 'call').ok).toBe(true);
    expect(a.trust).toBeGreaterThan(t0);
    expect(useHold(s, h0.id, 'call').ok).toBe(false); // fraco: uma vez
    const g = grantHold(s, { holder: a.members[0], target: 'player', kind: 'grievance', strength: 50, text: l('Mágoa', 'Grudge') });
    expect(leverage(s, 'player', a.members[0]).v).toBeLessThan(0);
    expect(useHold(s, g.id, 'call').ok).toBe(false);
    expect(useHold(s, g.id, 'forgive').ok).toBe(true);
    // segredo antigo (intrigue) aparece como hold virtual do jogador
    intrigue(s).secrets[`act:${a.id}`] = [{ id: `act:${a.id}:affair`, target: { kind: 'act', id: a.id }, kind: 'affair', known: true, exposed: false }];
    expect(allHolds(s).some((x) => x.src === 'intrigue' && x.target === a.id && x.kind === 'secret')).toBe(true);
  });

  it('estresse: curto + longo, porquê e quebra que usa mecânicas existentes', () => {
    const s = createGame(defaultConfig('r17-st'));
    const a = npcAct(s);
    const p = s.persons[a.members[0]];
    addStress(s, p.id, 90, l('Teste', 'Test'));
    stress17(s).l[p.id] = 80;
    const x = stressOf(s, p.id);
    expect(x.short).toBeGreaterThan(65);
    expect(x.level).toBe('breaking');
    expect(x.risk).toBeGreaterThan(0);
    expect(x.why.map((w) => w.en)).toContain('Test');
    const sc0 = a.scandals, h0 = p.health, hi0 = a.hiatusUntil ?? 0, f0 = facts17(s).f.length;
    _bridge17.breakdown17(s, Rng.fromSeed('t17'), p, a, false);
    expect(stress17(s).lb[p.id]).toBe(s.year);
    expect(a.scandals > sc0 || p.health !== h0 || (a.hiatusUntil ?? 0) > hi0).toBe(true);
    expect(facts17(s).f.length).toBeGreaterThan(f0);
  });

  it('situações: NPC escolhe pelos traços; orçamento e calma; determinismo de meses', () => {
    const s = createGame(defaultConfig('r17-sit'));
    expect(SITS.length).toBeGreaterThanOrEqual(10);
    const a = npcAct(s);
    const p = s.persons[a.members[0]];
    addStress(s, p.id, 95);
    stress17(s).l[p.id] = 60;
    sit17(s).b = 6;
    const res = runSituations(s);
    expect(res.npc.length + res.mine.length).toBeGreaterThan(0);
    expect(recentFacts(s, { kind: 'situation', months: 1 }).length).toBe(res.npc.length);
    const def = SITS.find((d) => d.id === 'burnout')!;
    const ctx = { hero: p.id, act: a.id, cast: { person: p.id }, data: {} };
    expect(def.options.map((o) => o.id)).toContain(npcChoice(s, def, ctx, Rng.fromSeed('x')).id);
    const run = () => { const g = createGame(defaultConfig('r17-det')); for (let i = 0; i < 6; i++) advanceMonth(g); return [facts17(g).seq, sit17(g).log.length, Object.keys(stress17(g).l).length, Object.values(g.acts).reduce((t, x) => t + x.scandals, 0)]; };
    expect(run()).toEqual(run());
  }, 120000);
});
