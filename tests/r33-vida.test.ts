// R33 · VIDA — poucos casos, sem jogo longo: tudo desligado por padrão e, ligado, cada regra mexe só no que diz.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen';
import { defaultConfig } from '../src/sim/bot';
import { setSw } from '../src/sim/r31/switches';
import { Rng } from '../src/core/rng';
import { energyLeft, maxEnergy } from '../src/sim/sys/life';
import { ownerBonus, ownerOf, HOUSES } from '../src/sim/sys/people/owner';
import { rollLifeEvents, defOf } from '../src/sim/sys/lifeevents10';
import { setSw as _s } from '../src/sim/r31/switches';
import { card5 } from '../src/ui/r31/acoes5model';
import { SW33, takeTrip33, tripOptions33, buildWall33, donate33, foundFoundation33, frail33, papChance33, repLevel33, scandal33, treatOwner33, vida33, vidaMonth33, setRoutine33, kidInterest33 } from '../src/sim/r33/vida33';

const mk = (seed: string) => createGame(defaultConfig(seed));

describe('R33 VIDA', () => {
  it('desligado por padrão: nada muda', () => {
    const s = mk('vida33a'); const o = ownerOf(s);
    o.stress = 95; o.health = 10;
    expect(frail33(s)).toBe(0);
    expect(maxEnergy(s)).toBe(maxEnergy(mk('vida33a')));
    expect(papChance33(s, 8)).toBeGreaterThan(0); // regra pura; o mês só a usa ligada
    vidaMonth33(s, Rng.fromSeed('x'));
    expect(vida33(s).rep).toBe(0);
  });
  it('saúde/estresse pesam e o tratamento recupera', () => {
    const s = mk('vida33b'); const o = ownerOf(s);
    const base = maxEnergy(s), nb = ownerBonus(s, 'negotiation');
    setSw(s, SW33.saude, true);
    o.stress = 80; o.health = 20;
    expect(maxEnergy(s)).toBe(base - 1);
    expect(energyLeft(s)).toBeLessThanOrEqual(maxEnergy(s));
    expect(ownerBonus(s, 'negotiation')).toBeLessThan(nb);
    o.wealth = 1e9;
    expect(treatOwner33(s, 'rehab')).toBeNull();
    expect(o.stress).toBe(50); expect(o.health).toBe(40);
  });
  it('mansão atrai paparazzi, muro e segurança cortam; rotina alivia', () => {
    const s = mk('vida33c'); const o = ownerOf(s);
    setSw(s, SW33.paparazzi, true); setSw(s, SW33.rotina, true);
    const mansion = HOUSES.findIndex((h) => h.prestige >= 6);
    o.house = mansion; o.wealth = 1e9;
    const a = papChance33(s, HOUSES[mansion].prestige);
    expect(buildWall33(s)).toBeNull();
    expect(papChance33(s, HOUSES[mansion].prestige)).toBeCloseTo(a / 2);
    vida33(s).guard = 2;
    expect(papChance33(s, HOUSES[mansion].prestige)).toBeLessThan(a / 4);
    expect(papChance33(s, 2)).toBe(0);
    o.stress = 60; setRoutine33(s, 'travel'); vida33(s).guard = 0; vida33(s).wall = true;
    const before = o.stress; vidaMonth33(s, Rng.fromSeed('rot')); expect(o.stress).toBeLessThan(before + 4);
  });
  it('reputação pessoal separada: escândalo, caridade, fundação', () => {
    const s = mk('vida33d'); const o = ownerOf(s); o.wealth = 1e9;
    scandal33(s, 10); expect(repLevel33(s)).toBe(0);
    setSw(s, SW33.rep, true);
    const rc = s.player.reputation.artists;
    scandal33(s, 10); expect(vida33(s).rep).toBe(-10);
    expect(donate33(s, 4000)).toBeNull(); expect(vida33(s).rep).toBeGreaterThan(-10);
    expect(foundFoundation33(s)).toBeNull(); const r0 = vida33(s).rep;
    scandal33(s, 10); expect(vida33(s).rep).toBeCloseTo(r0 - 6);
    expect(s.player.reputation.artists).toBe(rc);
  });
  it('filhos herdam interesse e talento do dono', () => {
    const s = mk('vida33e'); const o = ownerOf(s);
    o.attrs = { ear: 90, negotiation: 40, charisma: 40, management: 40 };
    o.kids = [{ name: 'Kid', born: s.year - 5, aptitude: 20 }];
    setSw(s, SW33.herdeiros, true);
    vidaMonth33(s, Rng.fromSeed('k'));
    expect(kidInterest33(s, 0)).toBe('ear');
    expect(o.kids[0].aptitude).toBeGreaterThan(20);
  });
  it('viagem de lazer: destino do mapa, paga do bolso, alivia o estresse', () => {
    const s = mk('vida33f'); const o = ownerOf(s); o.wealth = 1e9; o.stress = 70;
    expect(takeTrip33(s, 'x')).not.toBeNull(); // desligado
    setSw(s, SW33.rotina, true);
    const opts = tripOptions33(s); expect(opts.length).toBe(4);
    expect(takeTrip33(s, opts[0].city)).toBeNull();
    expect(o.stress).toBeLessThan(70); expect(o.vacationUntil).toBeGreaterThan(s.week);
  });
  it('escândalo pessoal: evento existe e só pesa ligado', () => {
    const s = mk('vida33g'); const d = defOf('r33_scandal')!;
    expect(d).toBeTruthy();
    const env = { s, fame: 60, stress: 80 } as never;
    expect(d.w(env)).toBe(0);
    setSw(s, SW33.rep, true);
    expect(d.w(env)).toBeGreaterThan(0);
    expect(typeof rollLifeEvents).toBe('function');
  });
  it('cartões de ação: ações da vida só com o interruptor', () => {
    const s = mk('vida33h'); _s(s, 'exp5.nav', true);
    const ids = (c: string) => card5(s, c)!.acts.map((a) => a.id);
    expect(ids('cofrecasa')).not.toContain('v33.doar');
    setSw(s, SW33.rep, true); setSw(s, SW33.paparazzi, true);
    expect(ids('cofrecasa')).toContain('v33.doar');
    expect(ids('casa.porta')).toContain('v33.muro');
  });
});
