// Rodada 9 — empreendimentos (selo ou pessoal), gestão de artistas, prestígio dos selos e sucessão
// que só continua passando o selo a outra pessoa.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { offerMods } from '../src/sim/ext4';
import { ownerOf, succession } from '../src/sim/sys/people/owner';
import { life } from '../src/sim/sys/life';
import { applyHeir, beginSuccession, heirCandidates } from '../src/sim/sys/heirs8';
import { standingOf, standingRanking } from '../src/sim/sys/standing9';
import {
  autoLineup, foundVenture, inviteAct, kindsAvailable, mgCandidates, pitchClient, placeSong, signWriter, transferVenture, ventures, writerCandidates,
} from '../src/sim/sys/ventures9';
import { money, post, rngOf } from '../src/sim/util';
import type { GameState, RunConfig } from '../src/sim/types';

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
const mk = (seed: string, over: Partial<RunConfig> = {}) => createGame(defaultConfig(seed, over));
const rich = (s: GameState) => { ownerOf(s).wealth = money(s, 5_000_000); post(s, 'r9test', money(s, 5_000_000), 'business', 'teste'); };

describe('empreendimentos', () => {
  it('funda no selo ou no nome próprio, transfere e gera P&L mensal', () => {
    const s = mk('r9-v1', { startYear: 1990 });
    rich(s);
    const cash0 = s.player.cash;
    const w0 = ownerOf(s).wealth;
    expect(kindsAvailable(s)).not.toContain('platform');
    expect(foundVenture(s, 'platform', 'personal')).not.toBeNull();
    expect(foundVenture(s, 'studio', 'personal', { name: 'Estúdio X' })).toBeNull();
    expect(ownerOf(s).wealth).toBeLessThan(w0);
    expect(s.player.cash).toBe(cash0);
    expect(foundVenture(s, 'media', 'personal', { media: 'radio' })).toBeNull();
    const st = ventures(s);
    expect(st.list.length).toBe(2);
    const v = st.list[0];
    expect(transferVenture(s, v.id)).toBeNull();
    expect(v.owner).toBe('label');
    expect(s.player.cash).toBeLessThan(cash0);
    for (let i = 0; i < 3; i++) advanceMonth(s);
    expect(v.pl.length).toBeGreaterThan(0);
    expect(v.pl.at(-1)!.cost).toBeGreaterThan(0);
    invariant(s);
  });

  it('festival monta line-up com artistas de qualquer selo e realiza a edição no mês marcado', () => {
    const s = mk('r9-v2', { startYear: 1985 });
    rich(s);
    expect(foundVenture(s, 'festival', 'personal')).toBeNull();
    const v = ventures(s).list[0];
    v.rep = 90;
    v.month = (s.month + 1) % 12;
    const r = rngOf(s);
    expect(autoLineup(s, r, v.id) + v.lineup!.length).toBeGreaterThan(0);
    expect(inviteAct(s, r, v.id, 'nope').ok).toBe(false);
    for (let i = 0; i < 2; i++) advanceMonth(s);
    expect(v.editions!.length).toBe(1);
    expect(v.lineup!.length).toBe(0);
    invariant(s);
  });

  it('editora contrata compositor e coloca música com artista de outro selo', () => {
    const s = mk('r9-v3', { startYear: 1975 });
    rich(s);
    expect(foundVenture(s, 'publisher', 'label')).toBeNull();
    const v = ventures(s).list[0];
    v.rep = 100;
    const r = rngOf(s);
    const c = writerCandidates(s, v.id);
    expect(c.length).toBeGreaterThan(0);
    let ok = false;
    for (const w of c) if (signWriter(s, r, v.id, w.pid).ok) { ok = true; break; }
    expect(ok).toBe(true);
    const target = Object.values(s.acts).find((a) => a.owner && a.owner !== 'player' && a.fame >= 10 && a.status !== 'retired' && a.status !== 'split')!;
    for (let i = 0; i < 20 && !v.cat!.length; i++) { v.cool = 0; placeSong(s, r, v.id, v.writers![0].pid, target.id); }
    expect(v.cat!.length).toBeGreaterThan(0);
    advanceMonth(s);
    expect(v.pl.at(-1)!.rev).toBeGreaterThan(0);
    invariant(s);
  });
});

describe('gestão de artistas', () => {
  it('empresaria artista de outro selo e recebe comissão no patrimônio pessoal', () => {
    const s = mk('r9-m1', { startYear: 1990 });
    const mg = ventures(s).mg;
    mg.rep = 100;
    const r = rngOf(s);
    const a = mgCandidates(s).find((x) => x.owner && x.owner !== 'player') ?? mgCandidates(s)[0];
    let ok = false;
    for (let i = 0; i < 30 && !ok; i++) ok = pitchClient(s, r, a.id, 0.1).ok;
    expect(ok).toBe(true);
    const w = ownerOf(s).wealth;
    advanceMonth(s);
    expect(mg.clients[0]?.earned ?? mg.total).toBeGreaterThan(0);
    expect(ownerOf(s).wealth).not.toBe(w);
    invariant(s);
  });
});

describe('prestígio dos selos', () => {
  it('todo selo ganha reconhecimento, popularidade e momento, e o prestígio pesa nas propostas', () => {
    const s = mk('r9-s1', { startYear: 1980 });
    for (let i = 0; i < 3; i++) advanceMonth(s);
    const rank = standingRanking(s);
    expect(rank.some((x) => x.id === 'player')).toBe(true);
    expect(rank.length).toBeGreaterThan(3);
    for (const x of rank) for (const k of ['rec', 'pop', 'mom', 'crit', 'trust'] as const) expect(x.st[k]).toBeGreaterThanOrEqual(0);
    const me = standingOf(s, 'player');
    me.trust = 95; me.rec = 95; me.mom = 95;
    const mod = offerMods().find((m) => m.id === 'standing9')!;
    const act = Object.values(s.acts)[0];
    expect(mod.fn(s, act, {} as never)!.delta).toBeGreaterThan(0);
  });
});

describe('sucessão só passando o selo', () => {
  it('funcionário de confiança e artista próximo viram sucessores; o jogador passa a ser essa pessoa', () => {
    const s = mk('r9-h1', { startYear: 1990 });
    const o = ownerOf(s);
    o.kids = []; o.spouse = undefined; life(s).partner = null;
    s.player.staff.push({ id: 'stf9', name: 'Gerente Fiel', role: 'manager', skill: 80, salary: 100000, hiredWeek: s.week - 200 });
    const cands = heirCandidates(s);
    expect(cands.some((c) => c.key === 'staff:stf9' && c.rel === 'staff')).toBe(true);
    expect(applyHeir(s, rngOf(s), 'staff:stf9', 'retire')).toBe(true);
    expect(ownerOf(s).name).toBe('Gerente Fiel');
    expect(ownerOf(s).generation).toBe(2);
    expect(s.player.staff.some((x) => x.id === 'stf9')).toBe(false);
    expect(s.ended).toBeFalsy();
  });

  it('sem ninguém para assumir, morte e sucessão antiga encerram a run', () => {
    const s = mk('r9-h2', { startYear: 1990 });
    const o = ownerOf(s);
    o.kids = []; o.spouse = undefined; o.heir = undefined; life(s).partner = null; s.player.staff = [];
    for (const a of Object.values(s.acts)) a.trust = Math.min(a.trust, 50);
    expect(heirCandidates(s).length).toBe(0);
    succession(s, rngOf(s), 'death');
    expect(s.ended?.ending).toBe('end_of_line');
    const s2 = mk('r9-h3', { startYear: 1990 });
    const o2 = ownerOf(s2);
    o2.kids = []; o2.spouse = undefined; life(s2).partner = null; s2.player.staff = [];
    for (const a of Object.values(s2.acts)) a.trust = Math.min(a.trust, 50);
    beginSuccession(s2, rngOf(s2), 'death');
    expect(s2.ended).toBeTruthy();
  });
});
