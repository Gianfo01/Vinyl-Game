// Rodada 18 (ability18): habilidade atual e potencial (CA/PA estilo FM) para todas as pessoas.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { explain18 } from '../src/sim/explain18';
import { offerMods } from '../src/sim/ext4';
import { defaultOffer } from '../src/sim/contracts';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import type { Act, GameState, Person } from '../src/sim/types';
import { _ab18, ab18, ability18, caOf18, est18, genPA18, npDelta18, prospect18 } from '../src/sim/sys/ability18';
import { PRODUCERS } from '../src/sim/studio';

const clone = (p: Person, id: string): Person => ({ ...p, id, skills: { ...p.skills }, rel: {}, traits: [], persona: { ...(p.persona ?? { openness: 50, perfectionism: 50, ambition: 50, sociability: 50, discipline: 50, resilience: 50 }) } });
const stepN = (s: GameState, p: Person, a: Act, n: number) => { for (let i = 0; i < n; i++) _ab18.stepPerson(s, p, a, 1, false, {}); };

describe('r18 ability: CA/PA', () => {
  const s = createGame(defaultConfig('r18-ab', { startYear: 1975 }));
  const act = Object.values(s.acts).find((a) => a.members.length && !a.deceased && a.status !== 'retired')!;
  const base = s.persons[act.members[0]];

  it('todo mundo tem CA (0–200) e PA ≥ CA: artistas, você, equipe, produtores', () => {
    for (const p of Object.values(s.persons).slice(0, 200)) {
      if (!p.alive) continue;
      const A = ability18(s, `p:${p.id}`)!;
      expect(A.ca).toBeGreaterThan(0); expect(A.ca).toBeLessThanOrEqual(200); expect(A.pa).toBeGreaterThanOrEqual(Math.round(A.ca) - 1);
    }
    const keys = ['player', ...s.player.staff.map((x) => `s:${x.id}`)];
    const pd = PRODUCERS.find((x) => x.real)?.real;
    if (pd) { keys.push(`pd:${pd}`); expect(ability18(s, `pd:${pd}`)?.kind).toBe('pro'); }
    for (const k of keys) { const A = ability18(s, k); if (!A) continue; expect(A.pa).toBeGreaterThanOrEqual(Math.round(A.ca)); expect(A.pa).toBeLessThanOrEqual(200); }
    expect(Object.keys(ab18(s).p).length).toBeGreaterThan(50); // gerado no novo jogo
  });

  it('jovens: faixa −1..−10 resolvida na geração, dentro da faixa', () => {
    const y = clone(base, 'young1'); y.born = s.year - 18; y.potential = 70;
    const r = genPA18(s, y);
    if (r.b) { expect(r.b).toBeGreaterThanOrEqual(1); expect(r.b).toBeLessThanOrEqual(10); expect(r.pa).toBeLessThanOrEqual(Math.max(r.b * 20, Math.round(caOf18(y)) + 3)); }
    expect(genPA18(s, y)).toEqual(r); // determinístico
  });

  it('cresce com juventude e personalidade; idade derruba a voz; doença trava', () => {
    const mk = (id: string, age: number, disc: number) => {
      const p = clone(base, id); p.born = s.year - age; p.role = 'vocal';
      for (const k of Object.keys(p.skills) as (keyof Person['skills'])[]) p.skills[k] = 35;
      p.persona!.discipline = disc; p.persona!.ambition = disc; p.persona!.perfectionism = disc;
      s.persons[id] = p; ab18(s).p[id] = { pa: 170 }; return p;
    };
    const young = mk('ab_y', 19, 90), lazy = mk('ab_l', 19, 5), sick = mk('ab_s', 19, 90);
    sick.health = 'burnout';
    const c0 = caOf18(young);
    stepN(s, young, act, 24); stepN(s, lazy, act, 24); stepN(s, sick, act, 24);
    expect(caOf18(young)).toBeGreaterThan(c0 + 8);
    expect(caOf18(young)).toBeGreaterThan(caOf18(lazy));
    expect(caOf18(sick)).toBeLessThanOrEqual(c0 + 0.5);
    const old = mk('ab_o', 60, 50); old.skills.voice = 80; old.skills.lyr = 60;
    stepN(s, old, act, 24);
    expect(old.skills.voice).toBeLessThan(80);
    expect(80 - old.skills.voice).toBeGreaterThan(60 - old.skills.lyr); // voz cai antes da escrita
  });

  it('visibilidade: elenco próprio exato, desconhecido com faixa larga; relatório em texto', () => {
    const other = Object.values(s.acts).find((a) => a.owner !== 'player' && !s.knowledge[a.id] && a.members.length && a.fame < 10)!;
    const e = est18(s, `p:${other.members[0]}`)!;
    expect(e.paHi - e.paLo).toBeGreaterThan(15);
    expect(e.report.length).toBeGreaterThan(0);
    act.owner = 'player';
    const m = est18(s, `p:${act.members[0]}`)!;
    expect(m.mine).toBe(true);
    expect(m.caHi - m.caLo).toBe(0);
    expect(explain18(s, 'ability.ca', { key: `p:${act.members[0]}` })?.parts.length).toBeGreaterThan(0);
    act.owner = null;
  });

  it('promessa custa mais para comprador informado (proposta) e pesa no bot', () => {
    const a = act; a.owner = null; a.fame = 25;
    s.knowledge[a.id] = { actId: a.id, degree: 4, stage: 'investigating', bias: 0, updatedWeek: s.week, source: 'scout' };
    for (const id of a.members) { const p = s.persons[id]; p.born = s.year - 19; p.skills = { comp: 25, lyr: 25, voice: 30, instr: 20, prod: 15, stage: 25, biz: 10 }; ab18(s).p[id] = { pa: 190 }; }
    const mod = offerMods().find((x) => x.id === 'ability18')!.fn;
    const o = defaultOffer(s, a);
    const r = mod(s, a, o);
    expect(r?.delta ?? 0).toBeLessThan(0);
    expect(mod(s, a, { ...o, advance: o.advance * 3 })).toBeNull();
    expect(prospect18(s, a)).toBeGreaterThan(3);
  });

  it('quem não é artista: juventude pesa, experiência soma (sem varredura)', () => {
    const young = npDelta18(s, 's:x1', s.year - 20, {}, 'anr', 'staff');
    const vet = npDelta18(s, 's:x1', s.year - 45, {}, 'anr', 'staff');
    expect(vet.delta).toBeGreaterThan(young.delta);
    ab18(s).x['s:x1'] = 10;
    expect(npDelta18(s, 's:x1', s.year - 45, {}, 'anr', 'staff').delta).toBeGreaterThan(vet.delta);
  });

  it('determinístico mês a mês', () => {
    const g = () => { const x = createGame(defaultConfig('r18-ab2', { startYear: 1990 })); for (let i = 0; i < 6; i++) advanceMonth(x); return Object.values(x.persons).slice(0, 60).map((p) => Math.round(caOf18(p) * 100)); };
    expect(g()).toEqual(g());
  });
});
