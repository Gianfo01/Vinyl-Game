// Rodada 9 — laços duradouros entre artistas (duplas, casais, supergrupos, alianças, cruzamentos,
// padrinhos), admiração e movimentos completos (camadas, ciclo de vida, cenas históricas, fundação).

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { applyMods } from '../src/sim/ext4';
import { answerMsg } from '../src/sim/sys/people/inbox';
import { P } from '../src/sim/sys/people/state';
import { admiration, bondInvite, bonds, endBond, formBond, opinionsOf, proposeBond } from '../src/sim/sys/bonds9';
import { foundChance, foundMovement, members, mov9, movX, requestJoin, tierOf } from '../src/sim/sys/movements9';
import { playerActs, rngOf } from '../src/sim/util';
import type { Act, GameState, RunConfig } from '../src/sim/types';

const mk = (seed: string, over: Partial<RunConfig> = {}) => createGame(defaultConfig(seed, over));
const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
const npcs = (s: GameState) => Object.values(s.acts).filter((a) => a.owner !== 'player' && !a.playerBand && (a.status === 'active' || a.status === 'emerging') && a.members.length && !a.deceased).sort((a, b) => b.fame - a.fame);
const lead = (a: Act) => a.members[0];

describe('laços duradouros', () => {
  it('dupla de composição melhora as músicas; morte encerra com tributo póstumo', () => {
    const s = mk('r9-duo', { startYear: 1975 });
    const [A, B] = npcs(s);
    const b = formBond(s, 'duo', [lead(A), lead(B)])!;
    expect(b).toBeTruthy();
    expect(formBond(s, 'duo', [lead(A), lead(B)])).toBeNull();
    const song = Object.values(s.songs).find((so) => so.actId === A.id);
    const v = applyMods(s, 'songQ', 60, { act: A, song }).value;
    expect(v).toBeGreaterThan(60);
    s.persons[lead(B)].alive = false;
    endBond(s, rngOf(s), b, 'death');
    expect(b.end?.ep).toBe('tribute');
  });

  it('supergrupo cria um ato paralelo com prazo; o jogador propõe e recebe convites', () => {
    const s = mk('r9-super', { startYear: 1990, scenario: 'emerging' });
    const top = npcs(s).slice(0, 4);
    const sg = formBond(s, 'super', top.map(lead), { term: s.year + 3 })!;
    expect(sg.act && s.acts[sg.act]?.members.length).toBe(4);
    const mine = playerActs(s)[0];
    expect(mine).toBeTruthy();
    s.player.cash += 10_000_000_00;
    s.player.initialCash += 10_000_000_00;
    const r = rngOf(s);
    let ok = false;
    for (const o of npcs(s).slice(5, 40)) { if (proposeBond(s, r, 'ally', mine, [o.id]).ok) { ok = true; break; } }
    expect(ok).toBe(true);
    invariant(s);
    expect(bondInvite(s, r, mine, 'duo')).toBe(true);
    const msg = P(s).inbox.find((m) => m.ref?.sys === 'bond9' && !m.resolved)!;
    const n0 = bonds(s).list.length;
    answerMsg(s, msg.id, 'accept', r);
    expect(bonds(s).list.length).toBe(n0 + 1);
  });

  it('o mundo forma laços sozinho e a admiração tem opinião', () => {
    const s = mk('r9-alive', { startYear: 1980 });
    // laços são raros e o selo parado quebra em ~4 anos: caixa folgado e até 10 anos de mundo
    for (let i = 0; i < 120 && !bonds(s).list.length; i++) { s.player.cash = Math.max(s.player.cash, 1e9); advanceMonth(s); }
    expect(bonds(s).list.length).toBeGreaterThan(0);
    const A = npcs(s)[0];
    const op = opinionsOf(s, lead(A));
    expect(op.top.length + op.low.length).toBeGreaterThan(0);
    expect(Math.abs(admiration(s, lead(A), npcs(s)[1].id))).toBeLessThanOrEqual(100);
    expect(JSON.stringify(bonds(s)).length).toBeLessThan(120_000);
  });

  it('modo histórico: Run-DMC e Aerosmith cruzam gêneros e nasce um subgênero', () => {
    const s = mk('r9-real', { startYear: 1986, mode: 'historic', realNames: true });
    for (let i = 0; i < 3; i++) advanceMonth(s);
    const b = bonds(s).list.find((x) => x.real && x.k === 'cross');
    expect(bonds(s).seeded).toContain('rundmc_aerosmith');
    expect(b?.hybrid).toBeTruthy();
  });
});

describe('movimentos', () => {
  it('a Tropicália vira movimento com fundadores e morre pela censura', () => {
    const s = mk('r9-tropicalia', { startYear: 1967, mode: 'historic', realNames: true });
    advanceMonth(s);
    const id = mov9(s).scene.tropicalia;
    expect(id).toBeTruthy();
    const mv = s.movements.find((m) => m.id === id)!;
    const x = movX(s, mv);
    const names = members(x).map((a) => s.acts[a]?.name);
    expect(names).toContain('Caetano Veloso');
    expect(tierOf(s, s.acts[x.founders[0]].id)?.tier).toBe('founder');
    while (s.year < 1970 || s.month < 2) advanceMonth(s);
    expect(x.phase).toBe('death');
    expect(x.end?.c).toBe('censorship');
  });

  it('o jogador funda um movimento (pode falhar) e outros pedem para entrar com votação', () => {
    const s = mk('r9-found', { startYear: 1995, scenario: 'emerging' });
    const mine = s.acts[playerActs(s)[0]];
    s.player.cash += 1_000_000_00;
    s.player.initialCash += 1_000_000_00;
    const spec = { name: 'Movimento Teste', idea: 'Tudo ao mesmo tempo agora.', city: mine.city, genre: mine.genre, acts: [mine.id], allies: [] as string[] };
    const p = foundChance(s, spec);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
    const r = rngOf(s);
    const res = foundMovement(s, r, spec);
    invariant(s);
    expect(foundMovement(s, r, spec).ok).toBe(false); // espera entre tentativas / já está
    let id = res.id;
    for (let i = 0; i < 300 && !id; i++) id = foundMovement(s, r, spec, true).id;
    expect(id).toBeTruthy();
    expect(tierOf(s, mine.id)?.tier).toBe('founder');
    const other = npcs(s).find((a) => !tierOf(s, a.id))!;
    const v = requestJoin(s, id!, other.id);
    expect(v.yes! + v.no!).toBeGreaterThan(0);
    expect(requestJoin(s, id!, other.id).ok).toBe(false);
  });

  it('saves antigos sem as camadas novas carregam', () => {
    const s = mk('r9-old', { startYear: 1980 });
    const x4 = s.x4 as unknown as Record<string, unknown>;
    delete x4.bonds9;
    delete x4.mov9;
    const s2 = JSON.parse(JSON.stringify(s)) as GameState;
    for (let i = 0; i < 3; i++) advanceMonth(s2);
    expect(bonds(s2).list).toBeTruthy();
    expect(mov9(s2).m).toBeTruthy();
  });
});
