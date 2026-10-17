// R33 · PESSOAS: interruptores desligados não mudam nada; ego/química (crise do jogador → decisão "dar um tempo";
// real travado na vida real exata não rompe); mentor; abertura; despedida e homenagem póstuma (fallback do catálogo e
// gancho da CATÁLOGO). Poucos casos, sem jogo longo.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceWeek } from '../src/sim/tick';
import { resolveDecision } from '../src/sim/events';
import { applyMods } from '../src/sim/ext4';
import { Rng, seedState } from '../src/core/rng';
import { setSw } from '../src/sim/r31/switches';
import {
  SW33, chem33, openingShow33, pes33Month, farewell33, mentorLock33, mentorOf33, mentorPair33, pes33, phase33, setCatalogSurge33,
} from '../src/sim/r33/pessoas33';
import type { Act, GameState } from '../src/sim/types';

const game = (over = {}): GameState => createGame(defaultConfig('r33-pessoas', { startYear: 1975, ...over }));
const band = (s: GameState): Act => Object.values(s.acts).find((a) => a.members.length >= 2 && a.status === 'active')!;
const allOn = (s: GameState) => { for (const id of Object.values(SW33)) setSw(s, id, true); };
const R = new Rng(seedState('r33m'));
const month = (s: GameState) => pes33Month(s, R);

describe('r33 pessoas', () => {
  it('desligado: nenhum estado novo e o mesmo jogo', () => {
    const a = game(), b = game();
    for (let i = 0; i < 4; i++) { advanceWeek(a); advanceWeek(b); }
    expect((a as unknown as { x4: Record<string, unknown> }).x4.pes33).toBeUndefined();
    expect(JSON.stringify(a.acts)).toBe(JSON.stringify(b.acts));
  });

  it('crise de ego no ato do jogador vira decisão; "dar um tempo" pausa e sobe a química', () => {
    const s = game(); allOn(s);
    const a = band(s); a.owner = 'player'; a.fame = 50;
    const [p, q] = a.members.map((id) => s.persons[id]);
    p.persona = { openness: 50, perfectionism: 50, ambition: 100, sociability: 0, discipline: 50, resilience: 50 };
    p.goal = 'solo'; p.ambition = 'fame' as never; a.leaderId = p.id;
    for (const x of a.members) { s.persons[x].resentment = 90; for (const y of a.members) if (x !== y) s.persons[x].rel[y] = -90; }
    void q;
    for (let i = 0; i < 40 && !s.decisions.some((d) => d.eventId === 'ego33_crisis'); i++) month(s);
    const d = s.decisions.find((x) => x.eventId === 'ego33_crisis')!;
    expect(d).toBeTruthy();
    const before = chem33(s, a.id)!;
    expect(before).toBeLessThan(28);
    resolveDecision(s, d.id, 'break');
    expect(a.status).toBe('hiatus');
    expect(chem33(s, a.id)!).toBeGreaterThan(before);
  });

  it('vida real exata: ato real travado não rompe nem sai em solo', () => {
    const s = game({ history: 'strict' }); allOn(s);
    const a = Object.values(s.acts).find((x) => x.catalogNo && x.members.length >= 2 && x.status === 'active' && x.owner !== 'player')!;
    expect(a).toBeTruthy();
    for (const x of a.members) { s.persons[x].resentment = 100; s.persons[x].goal = 'solo'; for (const y of a.members) if (x !== y) s.persons[x].rel[y] = -100; }
    const members = [...a.members];
    for (let i = 0; i < 30; i++) month(s);
    expect(a.status).toBe('active');
    expect(a.members).toEqual(members);
  });

  it('mentor: só com o interruptor; aprendiz melhora', () => {
    const s = game();
    const acts = Object.values(s.acts).filter((a) => a.status === 'active').slice(0, 2);
    for (const a of acts) a.owner = 'player';
    const m = s.persons[acts[0].members[0]], ap = s.persons[acts[1].members[0]];
    m.born = s.year - 60; ap.born = s.year - 20;
    for (const k of Object.keys(m.skills) as (keyof typeof m.skills)[]) { m.skills[k] = 90; ap.skills[k] = 20; }
    ap.potential = 95;
    expect(mentorLock33(s, m.id, ap.id)).toBeTruthy();
    allOn(s);
    expect(mentorPair33(s, m.id, ap.id)).toBeUndefined();
    expect(mentorOf33(s, ap.id)).toBe(m.id);
    const sum0 = Object.values(ap.skills).reduce((x, y) => x + y, 0);
    for (let i = 0; i < 6; i++) month(s);
    expect(Object.values(ap.skills).reduce((x, y) => x + y, 0)).toBeGreaterThan(sum0);
  });

  it('abertura: novato ganha fãs, veterano ganha momento', () => {
    const s = game(); allOn(s);
    const [nov, vet] = Object.values(s.acts).filter((a) => a.status === 'active').slice(0, 2);
    nov.fame = 10; vet.fame = 70; vet.momentum = 30; nov.formed = vet.formed + 5;
    s.tours.push({ id: 'tr33', actId: nov.id, name: 't', stops: [], setlist: [], minutes: 30, production: 0, role: 'opening', partnerActId: vet.id, crew: 0, pay: 'door', costReserved: 0, revenue: 0, costs: 0, status: 'running', log: [], accidents: 0 });
    const f0 = nov.fans.casual, m0 = vet.momentum;
    openingShow33(s, { sold: 5000, tourId: 'tr33' });
    expect(nov.fans.casual).toBeGreaterThan(f0);
    expect(vet.momentum).toBeGreaterThan(m0);
  });

  it('despedida aumenta a demanda e aposenta como lenda; morte gera homenagem com o catálogo disparando', () => {
    const s = game(); allOn(s);
    const a = band(s); a.owner = 'player'; a.debutYear = s.year - 20; a.fame = 60;
    const d0 = applyMods(s, 'cityDemand', 1000, { act: a, cityId: a.city }).value;
    expect(farewell33(s, a)).toBeUndefined();
    expect(phase33(s, a.id)).toBe('farewell');
    expect(applyMods(s, 'cityDemand', 1000, { act: a, cityId: a.city }).value).toBeGreaterThan(d0);
    pes33(s).farewell[a.id] = s.week;
    month(s);
    expect(a.status).toBe('retired');
    expect(a.legend).toBe(true);
    // homenagem: fallback (sem gancho) multiplica as vendas do catálogo
    const rel = Object.values(s.releases).find((x) => s.acts[x.actId] && s.acts[x.actId] !== a && s.acts[x.actId].members.length >= 1)!;
    const b = s.acts[rel.actId];
    b.fame = 60;
    const p = s.persons[b.members[0]]; p.alive = false; p.died = s.year;
    month(s);
    expect(pes33(s).surge[b.id]).toBeTruthy();
    const on = applyMods(s, 'chartUnits', 100, { release: rel }).value;
    setSw(s, SW33.life, false);
    const off = applyMods(s, 'chartUnits', 100, { release: rel }).value;
    setSw(s, SW33.life, true);
    expect(on).toBeGreaterThan(off * 1.5);
    // com o gancho da CATÁLOGO, ele recebe a chamada e o fallback não é usado
    const calls: string[] = [];
    setCatalogSurge33((_s, id) => { calls.push(id); return true; });
    const c = Object.values(s.acts).find((x) => x !== a && x !== b && x.status === 'active')!;
    c.fame = 60; const pc = s.persons[c.members[0]]; pc.alive = false; pc.died = s.year;
    month(s);
    setCatalogSurge33(null);
    expect(calls).toContain(c.id);
    expect(pes33(s).surge[c.id]).toBeUndefined();
  });
});
