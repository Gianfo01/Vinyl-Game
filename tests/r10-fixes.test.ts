// Rodada 10 — correções: identidade única de pessoas reais, vocalista obrigatório para letras,
// opiniões variadas e integrantes clicáveis.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import type { GameState, RunConfig } from '../src/sim/types';
import { composeSongs, songQ } from '../src/sim/production';
import { rngOf } from '../src/sim/util';
import { rw } from '../src/sim/sys/realworld';
import { hasSinger, hireSessionSinger } from '../src/sim/sys/vocals10';
import { opinionText, opinionsOf } from '../src/sim/sys/bonds9';

const mk = (seed: string, over: Partial<RunConfig> = {}) => createGame(defaultConfig(seed, over));
const personsNamed = (s: GameState, name: string) => Object.values(s.persons).filter((p) => p.name === name);
const actsWith = (s: GameState, pid: string) => Object.values(s.acts).filter((a) => a.members.includes(pid));

describe('identidade única de pessoas reais', () => {
  it('Michael Jackson é uma pessoa só, no Jackson 5 e na carreira solo', () => {
    const s = mk('r10-mj', { startYear: 1985, mode: 'historic', realNames: true });
    const mj = personsNamed(s, 'Michael Jackson');
    expect(mj.length).toBe(1);
    const names = actsWith(s, mj[0].id).map((a) => a.name);
    // r16: em 1985 já é ex-integrante (saiu depois da turnê Victory, 1984) do grupo renomeado The Jacksons
    const band = Object.values(s.acts).find((a) => a.name === 'The Jacksons')!;
    expect(band.members).not.toContain(mj[0].id);
    expect(rw(s).former[band.id].some((f) => f.personId === mj[0].id)).toBe(true);
    expect(names).toContain('Michael Jackson');
    expect(mj[0].born).toBe(1958);
  });

  it('quem estreia solo durante a run reaproveita a pessoa da banda (Beyoncé)', () => {
    const s = mk('r10-bey', { startYear: 2001, mode: 'historic', realNames: true });
    for (let i = 0; i < 36; i++) advanceMonth(s);
    const solo = Object.values(s.acts).find((a) => a.name === 'Beyoncé');
    const dc = Object.values(s.acts).find((a) => a.name === "Destiny's Child");
    expect(solo && dc).toBeTruthy();
    const pid = solo!.members[0];
    expect(dc!.members.includes(pid) || (s as unknown as { x4: { rw: { former: Record<string, { personId: string }[]> } } }).x4.rw.former[dc!.id]?.some((x) => x.personId === pid)).toBe(true);
  });
});

describe('vocalista e faixas instrumentais', () => {
  it('a banda do jogador começa com alguém que canta, mesmo que o personagem toque bateria', () => {
    const character = { name: 'Teste', age: 25, background: 'musician', career: 'musician', role: 'drums', traits: [], style: 'mentor', visual: 'casual', pronoun: 'they', points: {}, sex: 'x', skills: [] };
    const s = mk('r10-vox', { role: 'artist', custom: { members: 1 }, character } as unknown as Partial<RunConfig>);
    const band = s.acts[s.player.bandActId!];
    expect(band.members.some((id) => s.persons[id]?.isPlayer)).toBe(true);
    expect(hasSinger(s, band)).toBe(true);
    const s3 = mk('r10-vox3', { role: 'artist', custom: { members: 3 }, character } as unknown as Partial<RunConfig>);
    expect(hasSinger(s3, s3.acts[s3.player.bandActId!])).toBe(true);
  });

  it('sem vocalista a música sai instrumental (letra não conta); cantor de estúdio resolve', () => {
    const s = mk('r10-instr');
    const r = rngOf(s);
    const act = Object.values(s.acts).find((a) => a.members.length >= 2 && a.archetype !== 'synthetic')!;
    const inst = (s.x4 as unknown as { inst: { people: Record<string, { list: { id: string; lvl: number }[] }> } }).inst;
    for (const id of act.members) {
      s.persons[id].role = 'drums';
      s.persons[id].skills.voice = 10;
      inst.people[id] = { list: [{ id: 'drums', lvl: 50 }] };
    }
    expect(hasSinger(s, act)).toBe(false);
    const [so] = composeSongs(s, r, act, 1);
    expect(so.instrumental).toBe(true);
    expect(songQ(so)).toBeCloseTo((0.25 * so.melody + 0.25 * so.performance + 0.2 * so.production + 0.1 * so.originality) / 0.8, 5);
    s.player.cash += 10_000_000;
    hireSessionSinger(s, so.id);
    expect(so.instrumental).toBeFalsy();
    expect(so.sessionVocal).toBe(true);
  });
});

describe('opiniões variadas', () => {
  it('pessoas diferentes admiram listas diferentes, com frases diferentes', () => {
    const s = mk('r10-op', { startYear: 1975, realNames: true, mode: 'historic' });
    const leads = Object.values(s.acts).filter((a) => a.status === 'active' && a.fame > 30).slice(0, 8).map((a) => a.members[0]);
    const tops = leads.map((pid) => opinionsOf(s, pid).top.map((x) => x.act.id).join(','));
    expect(new Set(tops).size).toBeGreaterThanOrEqual(6);
    const target = Object.values(s.acts).find((a) => a.status === 'active' && a.fame > 40)!;
    const texts = leads.filter((pid) => !target.members.includes(pid)).map((pid) => opinionText(s, pid, target.id).pt);
    expect(new Set(texts).size).toBeGreaterThanOrEqual(4);
  });
});
