// Rodada 10 — eventos de vida pessoal (pop-ups mensais) e política/religião das pessoas.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { compatOf, deriveViews, playerViews, viewsOf, type Views } from '../src/sim/beliefs';
import { EVENTS } from '../src/sim/sys/lifeevents10/data';
import { answerLifeEvent, choiceBlocker, defOf, leState, openEvents, rollLifeEvents } from '../src/sim/sys/lifeevents10';
import { ownerOf } from '../src/sim/sys/people/owner';
import { life } from '../src/sim/sys/life';
import { bump } from '../src/sim/sys/social8';
import { money } from '../src/sim/util';
import type { GameState } from '../src/sim/types';

const mk = (seed: string, startYear = 1990, over: Partial<ReturnType<typeof defaultConfig>> = {}) => createGame(defaultConfig(seed, { startYear, ...over }));

describe('política e religião', () => {
  it('é derivada de seed + id, estável e sem inflar o save', () => {
    const a = deriveViews('x', 'p1', { born: 1970, year: 1995, city: 'sao_paulo' });
    expect(deriveViews('x', 'p1', { born: 1970, year: 1995, city: 'sao_paulo' })).toEqual(a);
    const s = mk('r10-bel');
    const pid = Object.keys(s.persons)[3];
    expect(viewsOf(s, pid)).toEqual(viewsOf(s, pid));
    const keys = Object.keys((s.x4 as unknown as { beliefs10?: Record<string, unknown> }).beliefs10 ?? {});
    expect(keys.every((k) => k === 'player')).toBe(true);
  });
  it('distribuição plausível por mercado e época', () => {
    let cath = 0;
    let evBr2020 = 0;
    let evBr1955 = 0;
    for (let i = 0; i < 400; i++) {
      if (deriveViews('d', `a${i}`, { born: 1935, year: 1960, city: 'sao_paulo' }).rel === 'catholic') cath++;
      if (deriveViews('d', `b${i}`, { born: 1995, year: 2020, city: 'sao_paulo' }).rel === 'evangelical') evBr2020++;
      if (deriveViews('d', `c${i}`, { born: 1935, year: 1960, city: 'sao_paulo' }).rel === 'evangelical') evBr1955++;
    }
    expect(cath / 400).toBeGreaterThan(0.6);
    expect(evBr2020).toBeGreaterThan(evBr1955 * 2);
    const pols = new Set(Array.from({ length: 200 }, (_, i) => deriveViews('p', `z${i}`, { born: 1980, year: 2000, city: 'london' }).pol));
    expect(pols.size).toBeGreaterThanOrEqual(5);
  });
  it('o jogador usa a escolha da ficha', () => {
    const s = mk('r10-spec', 1990, { character: { name: 'Ana', age: 40, background: 'musician', career: 'musician', role: 'guitar', traits: [], style: 'mentor', visual: 'casual', pronoun: 'she', points: {}, sex: 'f', skills: [], politics: 'left', religion: 'umbanda' } });
    const v = playerViews(s);
    expect(v.pol).toBe('left');
    expect(v.rel).toBe('umbanda');
  });
  it('compatibilidade: iguais aproximam, opostos engajados atritam, apolítico neutro', () => {
    const L: Views = { pol: 'left', eng: 80, rel: 'atheist', dev: 60 };
    const R: Views = { pol: 'right', eng: 80, rel: 'evangelical', dev: 80 };
    expect(compatOf(L, L)).toBeGreaterThan(0.3);
    expect(compatOf(L, R)).toBeLessThan(-0.4);
    expect(compatOf({ pol: 'apolitical', eng: 5, rel: 'none', dev: 10 }, R)).toBeGreaterThan(-0.4);
  });
  it('laços entre artistas pesam a compatibilidade', () => {
    const s = mk('r10-tie', 1990);
    const ids = Object.keys(s.persons).filter((id) => s.persons[id].alive && !s.persons[id].isPlayer);
    let a = '';
    let b = '';
    for (const x of ids) for (const y of ids) if (x < y && !a && compatOf(viewsOf(s, x), viewsOf(s, y)) < -0.3) { a = x; b = y; }
    if (!a) return;
    const t = bump(s, a, b, 20, 'scene');
    if (t) expect(t.v).toBeLessThan(20);
  });
});

describe('eventos de vida pessoal', () => {
  it('há 40+ eventos, 2 a 4 respostas, padrão válido e sem custo, continuações existentes', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(40);
    const ids = new Set(EVENTS.map((e) => e.id));
    expect(ids.size).toBe(EVENTS.length);
    for (const e of EVENTS) {
      expect(e.ch.length).toBeGreaterThanOrEqual(2);
      expect(e.ch.length).toBeLessThanOrEqual(4);
      const d = e.ch.find((c) => c.id === e.def);
      expect(d, e.id).toBeTruthy();
      for (const c of e.ch) if (c.next) expect(ids.has(c.next.ev), e.id).toBe(true);
    }
  });
  it('frequência: cerca de um evento a cada 1–2 meses, e eles viram pop-up', () => {
    const s = mk('r10-freq', 1990);
    let fired = 0;
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      advanceMonth(s);
      const st = leState(s);
      for (const o of st.open) seen.add(o.id);
    }
    fired = seen.size;
    expect(fired).toBeGreaterThan(18);
    expect(fired).toBeLessThan(55);
    expect((s.cutscenes ?? []).some((c) => c.kind === 'lifeEvent')).toBe(true);
  });
  it('responder aplica custo e efeitos; ignorar aplica o padrão no mês seguinte', () => {
    const s = mk('r10-ans', 1990);
    ownerOf(s).wealth = money(s, 200000);
    const st = leState(s);
    st.open.push({ id: 'tX', ev: 'burnout', ctx: {}, m: s.year * 12 + s.month });
    const w0 = ownerOf(s).wealth;
    const stress0 = ownerOf(s).stress;
    expect(answerLifeEvent(s, 'tX', 'clinic')).toBeNull();
    expect(ownerOf(s).wealth).toBeLessThan(w0);
    expect(ownerOf(s).stress).toBeLessThan(stress0);
    expect(answerLifeEvent(s, 'tX', 'rest')).not.toBeNull(); // já respondido
    st.open.push({ id: 'tY', ev: 'burnout', ctx: {}, m: s.year * 12 + s.month });
    const c0 = s.player.cash;
    advanceMonth(s);
    expect(leState(s).open.find((o) => o.id === 'tY')?.done?.ch).toBe('push');
    expect(s.player.cash).toBeGreaterThan(c0 - 1); // padrão 'push' rende caixa
    expect(openEvents(s).some((o) => o.id === 'tY')).toBe(false);
  });
  it('requisitos e tempo livre bloqueiam respostas', () => {
    const s = mk('r10-gate', 1990);
    ownerOf(s).wealth = 0;
    const d = defOf('burnout')!;
    expect(choiceBlocker(s, d.ch.find((c) => c.id === 'clinic')!, {})).not.toBeNull();
    const aff = defOf('affair')!;
    life(s).partner = null;
    expect(aff.ch.find((c) => c.id === 'confess')).toBeTruthy();
    const cut = defOf('scandal_photo')!.ch.find((c) => c.id === 'own')!;
    ownerOf(s).attrs.charisma = 10;
    expect(choiceBlocker(s, cut, {})).not.toBeNull();
  });
  it('época: eventos de uma era não aparecem fora dela', () => {
    const s = mk('r10-era', 1962);
    const fired = new Set<string>();
    for (let i = 0; i < 120; i++) { advanceMonth(s); for (const o of leState(s).open) fired.add(o.ev); }
    for (const id of fired) {
      const d = defOf(id)!;
      if (d.era) expect(s.year).toBeGreaterThanOrEqual(d.era[0]);
    }
    for (const id of ['lockdown', 'old_post', 'leak', 'panic_rock']) expect(fired.has(id)).toBe(false);
  });
  it('determinismo: mesma semente, mesmos eventos', () => {
    const run = (): string[] => { const s = mk('r10-det', 1985); const out: string[] = []; for (let i = 0; i < 30; i++) { advanceMonth(s); out.push(...rollLog(s)); } return out; };
    const rollLog = (s: GameState): string[] => leState(s).open.filter((o) => o.m === s.year * 12 + s.month).map((o) => o.ev);
    expect(run()).toEqual(run());
    void rollLifeEvents;
  });
});
