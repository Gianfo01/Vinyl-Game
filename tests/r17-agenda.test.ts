// Rodada 17 (H) — agenda: carreiras ocupam bolinhas (expediente 2 + pessoais 5, banda não conta), delegação a
// diretor contratado, sobrecarga com estresse, negócio sem a carreira, contratação negociada, freelancers e
// músicos de estúdio por época.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { perk } from '../src/sim/perks';
import { recentFacts } from '../src/sim/facts17';
import { advanceMonth } from '../src/sim/tick';
import { money } from '../src/sim/util';
import { createGame } from '../src/sim/worldgen';
import { ag17, balls, bookCrew, careerQ, crewsNow, freelancers, headCands, hireFreelancer, negotiate, overbooked, overflow, setInv, staffCands } from '../src/sim/sys/agenda17';
import { careers, startCareer } from '../src/sim/sys/careers12';
import { energyLeft, maxEnergy, spendEnergy } from '../src/sim/sys/life';
import { foundVenture, ventures } from '../src/sim/sys/ventures9';

describe('r17 agenda', () => {
  it('bolinhas: 5 pessoais sem desconto da banda; carreiras usam expediente e depois as pessoais', () => {
    const s = createGame(defaultConfig('r17-ag-1', { startYear: 1975 }));
    expect(maxEnergy(s)).toBe(5);
    expect(careers(s).active).toEqual(['label']);
    expect(energyLeft(s)).toBe(5);
    for (const id of ['manager', 'festival', 'booking']) startCareer(s, id);
    expect(overflow(s)).toBe(2);
    expect(energyLeft(s)).toBe(3);
    const b = balls(s);
    expect(b.office.every((x) => x.k === 'career')).toBe(true);
    expect(b.personal.filter((x) => x.k === 'career').length).toBe(2);
    // o gasto fica registrado com o rótulo
    expect(spendEnergy(s, 1)).toBeNull();
    expect(balls(s).personal.filter((x) => x.k === 'spent').length).toBe(1);
    // à frente custa 2 e rende mais; delegar exige diretor
    expect(setInv(s, 'festival', 'deleg').ok).toBe(false);
    setInv(s, 'label', 'lead');
    expect(careerQ(s, 'label').f).toBeGreaterThan(1.1);
    expect(perk(s, 'songQ')).toBeGreaterThan(0.3);
    expect(energyLeft(s)).toBe(1);
  });

  it('sobrecarga gera estresse; diretor contratado libera a bolinha', () => {
    const s = createGame(defaultConfig('r17-ag-2', { startYear: 1980 }));
    s.player.cash += money(s, 500000);
    for (const id of ['manager', 'festival', 'booking', 'studio', 'publisher', 'media', 'venue']) startCareer(s, id);
    for (const id of ['label', 'manager']) setInv(s, id, 'lead');
    expect(overbooked(s)).toBeGreaterThan(0);
    const p = s.persons[Object.values(s.persons).find((x) => x.isPlayer)?.id ?? ''];
    const st0 = p?.stress ?? 0;
    advanceMonth(s);
    if (p) expect(p.stress).toBeGreaterThan(st0);
    expect(recentFacts(s, { kind: 'stress', months: 2 }).some((f) => f.src === 'agenda17')).toBe(true);
    // contrata diretor de festival (oferta generosa até alguém aceitar)
    let ok = false;
    for (const c of headCands(s, 'festival')) { if (negotiate(s, c.id, 1.2).ok) { ok = true; break; } }
    expect(ok).toBe(true);
    const before = overflow(s);
    expect(setInv(s, 'festival', 'deleg').ok).toBe(true);
    expect(overflow(s)).toBe(before - 1);
  });

  it('festival sem a carreira: sem diretor a reputação cai; contratação de equipe e freelancer', () => {
    const s = createGame(defaultConfig('r17-ag-3', { startYear: 1970 }));
    s.player.cash += money(s, 800000);
    expect(foundVenture(s, 'festival', 'label', {})).toBeNull();
    const v = ventures(s).list[0];
    v.rep = 50;
    for (let i = 0; i < 3; i++) advanceMonth(s);
    expect(v.rep).toBeLessThan(50);
    // candidatos: filtro por função e gente real do período
    expect(staffCands(s, 'anr').every((c) => c.role === 'anr')).toBe(true);
    const n0 = s.player.staff.length;
    for (const c of staffCands(s, 'publicist')) if (negotiate(s, c.id, 1.2).ok) break;
    expect(s.player.staff.length).toBeGreaterThanOrEqual(n0);
    const act = Object.values(s.acts).find((a) => a.owner === 'player' && a.members.length) ?? Object.values(s.acts).find((a) => a.members.length && a.status !== 'retired')!;
    act.owner = 'player';
    const f = freelancers(s, 'booker').find((x) => !x.busy);
    if (f) { hireFreelancer(s, f.id, act.id); expect(ag17(s).rep.length).toBeGreaterThan(0); }
    // músicos de estúdio só na época: Wrecking Crew em 1970, não em 1990
    expect(crewsNow(s).some((c) => c.id === 'wrecking')).toBe(true);
    expect(bookCrew(s, 'wrecking', act.id).ok).toBe(true);
    expect(perk(s, 'songQ', act)).toBeGreaterThan(0.5);
    const s2 = createGame(defaultConfig('r17-ag-4', { startYear: 1990 }));
    expect(crewsNow(s2).some((c) => c.id === 'wrecking')).toBe(false);
  });
});
