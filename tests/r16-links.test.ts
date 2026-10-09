// Rodada 16 — conexões entre sistemas (links16).

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { resolveDecision } from '../src/sim/events';
import { applyMods } from '../src/sim/ext4';
import type { Act, GameState } from '../src/sim/types';
import { sy15 } from '../src/sim/sys/sync15';
import { careers } from '../src/sim/sys/careers12';
import { noto } from '../src/sim/sys/notoriety14';
import { aw15 } from '../src/sim/sys/awards15';
import { kin15 } from '../src/sim/sys/kin15';
import { cap14, roleLoads } from '../src/sim/sys/capacity14';
import { crew } from '../src/sim/sys/crew8';
import { careerOf } from '../src/sim/sys/people/staff';
import { fameToNoto, friendTips, juryMem16, kinLinks, labelDemos, lk16, prodFit16, snubLinks, staffStrain } from '../src/sim/sys/links16';
import { Rng } from '../src/core/rng';

const free = (s: GameState): Act => Object.values(s.acts).find((x) => x.status !== 'retired' && x.status !== 'split' && x.members.length >= 2 && !x.owner)!;
function adopt(s: GameState): Act {
  const a = free(s);
  a.owner = 'player';
  const tpl = Object.values(s.releases)[0];
  const base = Object.values(s.songs)[0];
  const rid = 'rL', sid = 'sL';
  s.releases[rid] = { ...tpl, id: rid, actId: a.id, owner: 'player', songs: [sid], year: s.year, title: 'L' };
  s.songs[sid] = { ...base, id: sid, actId: a.id, releaseId: rid, recorded: true, q: 60, title: 'SongL', coverOf: undefined };
  a.songs.push(sid); a.releases.push(rid);
  return a;
}

describe('r16 conexões', () => {
  it('sync ganho empurra paradas e procura de shows, com rótulo', () => {
    const s = createGame(defaultConfig('r16-a', { startYear: 1980 }));
    const a = adopt(s);
    const rel = s.releases.rL;
    const base = applyMods(s, 'chartUnits', 1000, { release: rel }).value;
    sy15(s).briefs.push({ id: 'sbL', medium: 'film', client: 'X', mood: 'joy', old: false, budget: 9000, until: s.week + 6, rival: '', rv: 0.1, status: 'won', week: s.week, song: 'sL', fit: 0.8 } as never);
    s.week += 1; // cache por semana
    const m = applyMods(s, 'chartUnits', 1000, { release: rel });
    expect(m.value).toBeGreaterThan(base);
    expect(m.factors.some((f) => f.label.pt.includes('sync'))).toBe(true);
    const d = applyMods(s, 'cityDemand', 1000, { act: a });
    expect(d.factors.some((f) => f.label.pt.includes('público novo'))).toBe(true);
  });

  it('fama do elenco sobe a notoriedade da Gravadora; demos chegam com nome', () => {
    const s = createGame(defaultConfig('r16-b', { startYear: 1975 }));
    const a = adopt(s);
    if (!careers(s).active.includes('label')) careers(s).active.push('label');
    a.fame = 30; fameToNoto(s);
    const v0 = noto(s).v.label ?? 0;
    a.fame = 55; fameToNoto(s);
    expect(noto(s).v.label).toBeGreaterThan(v0);
    expect(noto(s).log.some((x) => x.t.pt.includes(a.name))).toBe(true);
    noto(s).v.label = 60; // Continental+
    const known0 = Object.keys(s.knowledge).length;
    for (let i = 0; i < 40 && Object.keys(s.knowledge).length === known0; i++) { s.month = i % 12; s.year += i % 12 === 11 ? 1 : 0; labelDemos(s, Rng.fromSeed(`d${i}`)); }
    expect(Object.values(s.knowledge).some((k) => k.source === 'demo')).toBe(true);
  });

  it('amizade de um músico seu vira sinal de scouting com fonte própria', () => {
    const s = createGame(defaultConfig('r16-c', { startYear: 1990 }));
    const a = adopt(s);
    const other = Object.values(s.acts).find((x) => !x.owner && x.id !== a.id && (x.status === 'active' || x.status === 'emerging') && x.members.length)!;
    delete s.knowledge[other.id];
    s.persons[a.members[0]].rel[other.members[0]] = 70;
    for (let i = 0; i < 120 && !Object.values(s.knowledge).some((k) => k.source === 'friend'); i++) friendTips(s, Rng.fromSeed(`f${i}`));
    const k = Object.values(s.knowledge).find((x) => x.source === 'friend');
    expect(k).toBeTruthy();
    expect(lk16(s).log[0][2].pt).toMatch(/indica|amigo/);
  });

  it('luto de familiar vira decisão, arco e efeito nas faixas', () => {
    const s = createGame(defaultConfig('r16-d', { startYear: 1985 }));
    const a = adopt(s);
    kinLinks(s); // inicializa
    const q = s.persons[a.members[0]];
    const dead = Object.values(s.persons).find((p) => p.alive && !a.members.includes(p.id) && !p.isPlayer)!;
    kin15(s).g.push([q.id, dead.id, 'parent']);
    dead.alive = false; dead.died = s.year;
    kin15(s).dead.push(dead.id);
    kinLinks(s);
    const d = s.decisions.find((x) => x.eventId === 'lk16_grief');
    expect(d).toBeTruthy();
    resolveDecision(s, d!.id, 'record');
    expect(lk16(s).gr[a.id][1]).toBe('s');
    const so = s.songs.sL;
    const q2 = applyMods(s, 'songQ', 60, { song: so, act: a }).value;
    expect(q2).toBeGreaterThan(60);
  });

  it('produtor × conceito: casa, briga ou neutro', () => {
    expect(prodFit16('roots', 'organic')).toBe(1);
    expect(prodFit16('budget', 'wall_of_sound')).toBe(-1);
    expect(prodFit16('art', 'organic')).toBe(0);
  });

  it('sobrecarga prolongada derruba lealdade e atrai proposta de rival', () => {
    const s = createGame(defaultConfig('r16-e', { startYear: 1990 }));
    const rl = roleLoads(s).find((x) => x.staff.length);
    if (!rl) return;
    cap14(s).strain[rl.role] = 3;
    const m = rl.staff[0];
    m.skill = 80;
    const l0 = careerOf(s, m).loyalty;
    for (let i = 0; i < 25 && !crew(s).poach; i++) staffStrain(s, Rng.fromSeed(`p${i}`));
    expect(careerOf(s, m).loyalty).toBeLessThan(l0);
    expect(crew(s).poach?.id).toBeTruthy();
  });

  it('esnobada: moral cai, arco registra e o júri lembra no ano seguinte', () => {
    const s = createGame(defaultConfig('r16-f', { startYear: 1990 }));
    const a = adopt(s);
    const p = s.persons[a.members[0]];
    const m0 = p.morale;
    aw15(s).snubs.unshift([s.year, a.id, 'BRA', 'Rival']);
    snubLinks(s);
    expect(p.morale).toBeLessThan(m0);
    expect(juryMem16(s, a.id, 'BRA').k).toBe(1);
    s.year += 1;
    expect(juryMem16(s, a.id, 'BRA').k).toBeCloseTo(1.1);
    lk16(s).jy[a.id] = [s.year - 1, 'grace'];
    expect(juryMem16(s, a.id, 'BRA').k).toBeCloseTo(1.2);
    s.year += 2;
    expect(juryMem16(s, a.id, 'BRA').k).toBe(1);
  });
});
