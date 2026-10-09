// Rodada 5 — personagem do jogador: criação, tempo livre, romance, filhos, carreira musical.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { rngOf } from '../src/sim/util';
import { createGame } from '../src/sim/worldgen';
import {
  ENERGY_PER_MONTH, energyLeft, goOnDate, joinableActs, leaveBand, life, marry, meetPeople, playBar, playerAct, playerPerson, practice, propose, startDating,
  startProject, tryForBaby,
} from '../src/sim/sys/life';
import { ownerOf } from '../src/sim/sys/people/owner';

const mk = (seed: string, over = {}) => createGame(defaultConfig(seed, { character: { name: 'Ana Teste', age: 28, background: 'musician', role: 'vocal' }, ...over }));

describe('personagem', () => {
  it('criação aplica nome, idade, origem e cria a pessoa do jogador', () => {
    const s = mk('l5-a');
    const o = ownerOf(s);
    expect(o.name).toBe('Ana Teste');
    expect(s.year - o.born).toBe(28);
    const p = playerPerson(s)!;
    expect(p.isPlayer).toBe(true);
    expect(p.role).toBe('vocal');
    expect(p.name).toBe('Ana Teste');
  });

  it('artista: o personagem lidera a própria banda', () => {
    const s = mk('l5-b', { role: 'artist' });
    const band = s.acts[s.player.bandActId!];
    expect(band.members).toContain(playerPerson(s)!.id);
  });

  it('tempo livre limita ações por mês e renova', () => {
    const s = mk('l5-c');
    for (let i = 0; i < ENERGY_PER_MONTH; i++) expect(practice(s)).toBeNull();
    expect(practice(s)).not.toBeNull();
    advanceMonth(s);
    expect(energyLeft(s)).toBe(ENERGY_PER_MONTH);
  });

  it('namoro, pedido, casamento e filho', () => {
    const s = mk('l5-d');
    const r = rngOf(s);
    ownerOf(s).wealth += 50_000_000;
    const c = meetPeople(s, r);
    expect(Array.isArray(c)).toBe(true);
    expect(startDating(s, (c as { id: string }[])[0].id)).toBeNull();
    life(s).partner!.affinity = 95;
    life(s).partner!.since -= 40;
    let ok = false;
    for (let i = 0; i < 6 && !ok; i++) {
      const res = propose(s, r);
      ok = typeof res === 'object' && 'ok' in res && res.ok;
      if (!ok) { advanceMonth(s); life(s).partner!.affinity = 95; }
    }
    expect(ok).toBe(true);
    advanceMonth(s);
    expect(marry(s, 'simple')).toBeNull();
    expect(ownerOf(s).spouse).toBe(life(s).partner!.name);
    let born = false;
    for (let i = 0; i < 24 && !born; i++) {
      advanceMonth(s);
      life(s).partner!.affinity = 90;
      const res = tryForBaby(s, r);
      born = typeof res === 'object' && 'ok' in res && res.ok;
    }
    expect(born).toBe(true);
    expect(ownerOf(s).kids.length).toBe(1);
    expect(goOnDate(s, r, 'home')).toBeNull();
  });

  it('carreira solo, bar e sair do projeto; caixa da empresa fecha', () => {
    const s = mk('l5-e');
    const r = rngOf(s);
    const act = startProject(s, r, 'solo', 'rnr', 'Ana');
    expect(typeof act === 'object' && 'members' in act).toBe(true);
    expect(playerAct(s)?.name).toBe('Ana');
    expect(playBar(s, r)).toBeNull();
    // a trajetória de ex-músico já traz contatos: só não pode oferecer o próprio projeto
    expect(joinableActs(s).some((a) => a.id === playerAct(s)?.id)).toBe(false);
    expect(leaveBand(s)).toBeNull();
    expect(playerAct(s)).toBeUndefined();
    for (let i = 0; i < 3; i++) advanceMonth(s);
    expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
  });

  it('mesma seed, mesmo personagem', () => {
    const a = mk('l5-f');
    const b = mk('l5-f');
    expect(JSON.stringify(playerPerson(a))).toBe(JSON.stringify(playerPerson(b)));
  });
});
