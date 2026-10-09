// Rodada 13 — ficha unificada: mesmos atributos para todos, usados no jogo; barreiras históricas; opinião com motivo.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { defaultOffer, endContract, evaluateOffer } from '../src/sim/contracts';
import { createGame } from '../src/sim/worldgen';
import { ATTR13_IDS, JOBS13, barriers13, imageWeight, opinionOf, p13, per13, sendGift, staffAdj13 } from '../src/sim/sys/persona13';
import { leaders } from '../src/sim/sys/leaders10';
import { FACETS } from '../src/sim/sys/soul9';
import { money, staffSkill } from '../src/sim/util';
import { advanceMonth } from '../src/sim/tick';
import { opine, syncPlayerPerson13 } from '../src/sim/sys/persona13';
import { playerPerson } from '../src/sim/sys/life';
import { ownerOf } from '../src/sim/sys/people/owner';
import { l } from '../src/data/world';

describe('r13 persona unificada', () => {
  it('todo tipo de pessoa tem o mesmo esquema, determinístico', () => {
    const s = createGame(defaultConfig('r13-p', { startYear: 1975 }));
    advanceMonth(s);
    const pid = Object.values(s.persons).find((p) => !p.isPlayer)!.id;
    const lid = Object.keys(leaders(s).L)[0];
    s.player.staff.push({ id: 'stx', name: 'Ana Teste', role: 'anr', skill: 60, salary: 1, hiredWeek: 0 });
    const keys = [`p:${pid}`, `l:${lid}`, 's:stx', 'c:Lester Test', 'player'];
    for (const k of keys) {
      const P = per13(s, k)!;
      expect(P, k).toBeTruthy();
      for (const a of ATTR13_IDS) expect(P.attrs[a]).toBeGreaterThan(0);
      for (const j of JOBS13) expect(P.prof[j.id]).toBeGreaterThan(0);
      for (const f of FACETS) expect(P.facets[f]).toBeGreaterThanOrEqual(0);
      expect(P.views.pol).toBeTruthy();
      expect(['m', 'f', 'x']).toContain(P.sex);
    }
    const s2 = createGame(defaultConfig('r13-p', { startYear: 1975 }));
    expect(per13(s2, `p:${pid}`)!.attrs).toEqual(per13(s, `p:${pid}`)!.attrs);
    // aptidão e ouvido entram no desempenho efetivo da equipe
    const st = s.player.staff.find((x) => x.id === 'stx')!;
    expect(staffSkill(s, 'anr')).toBe(st.skill + staffAdj13(s, st).v);
  });

  it('barreiras da época: segregação nos EUA dos anos 50 e o peso da imagem na era da MTV', () => {
    const s = createGame(defaultConfig('r13-b', { startYear: 1955 }));
    const a = Object.values(s.acts).find((x) => x.members.length && s.persons[x.members[0]])!;
    a.city = 'memphis'; a.genre = 'rnr';
    for (const id of a.members) { const p = s.persons[id]; p.look = { body: 1, face: 1, skin: 3, hair: 2, hairColor: 0, outfit: 1, outfitColor: 1, glasses: false, hat: false, beard: true }; }
    const race55 = barriers13(s, a).find((b) => b.k === 'race')!;
    expect(race55.m).toBeLessThan(0.9);
    expect(race55.why.en).toMatch(/Segregated/);
    a.genre = 'soul';
    expect(barriers13(s, a).find((b) => b.k === 'race')!.m).toBeGreaterThan(race55.m); // a cena acolhe
    s.year = 2020;
    s.week += 1;
    expect(barriers13(s, a).find((b) => b.k === 'race')?.m ?? 1).toBeGreaterThan(0.98);
    expect(imageWeight(1985).w).toBeGreaterThan(imageWeight(1940).w);
  });

  it('dispensar um artista deixa marca com motivo e pesa na proposta; presente melhora líder', () => {
    const s = createGame(defaultConfig('r13-o', { startYear: 1980 }));
    const a = Object.values(s.acts).find((x) => !x.owner && x.members.length && x.status !== 'retired')!;
    a.owner = 'player';
    endContract(s, a, 'terminated');
    const k = `p:${a.members[0]}`;
    expect(p13(s).op[k].v).toBeLessThan(-10);
    expect(p13(s).op[k].w.slice(-1)[0][3].en).toMatch(/dropped/);
    const ev = evaluateOffer(s, a, defaultOffer(s, a));
    expect(ev.reasons.some((r) => r.en.includes('dropped'))).toBe(true);
    const lid = Object.keys(leaders(s).L)[0];
    s.player.cash = money(s, 100000);
    const before = opinionOf(s, `l:${lid}`);
    sendGift(s, `l:${lid}`);
    expect(opinionOf(s, `l:${lid}`)).toBeGreaterThan(before);
  });

  it('a pessoa do jogador espelha o personagem (fonte única) e não tem opinião sobre si', () => {
    const s = createGame(defaultConfig('r13-me', { startYear: 1970, character: { name: 'Rita Teste', age: 28, background: 'musician', traits: ['visionary', 'calm'], sex: 'f' } }));
    advanceMonth(s);
    syncPlayerPerson13(s);
    const p = playerPerson(s)!;
    expect(p).toBeTruthy();
    expect(p.born).toBe(ownerOf(s).born);
    expect(p.traits).toContain('experimental');
    expect(p.traits).toContain('resilient');
    const P = per13(s, `p:${p.id}`)!;
    expect(P.kind).toBe('player');
    expect(P.sex).toBe('f');
    expect(P.attrs.neg).toBe(ownerOf(s).attrs.negotiation);
    expect(opine(s, `p:${p.id}`, 10, l('x', 'x'))).toBe(0);
  });
});
