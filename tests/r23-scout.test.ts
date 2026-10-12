// Rodada 23 — Talentos: viagem a uma cena traz nomes da cena ao longo das semanas, a origem fica gravada,
// o próximo passo do funil tem custo/tempo e só sobe de grau quando o relatório chega.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { CITIES, cityById, familyOf } from '../src/data/world';
import { scoutCost, watchAct } from '../src/sim/scouting';
import { column23, nextStep23, openDemoCall23, originText23, rivalWatch23, scout23, scout23Week, sceneQuote23, startSceneTrip23, startStep23, unc23, uncText23 } from '../src/sim/sys/scout23';
import { disc18 } from '../src/sim/sys/discover18';
import { money, post } from '../src/sim/util';

const mk = (seed: string) => {
  const s = createGame(defaultConfig(seed, { startYear: 1990 }));
  post(s, 'r23', money(s, 500000), 'business', 'teste');
  return s;
};

describe('r23 talentos', () => {
  it('olheiro numa cena traz nomes daquela cena ao longo das semanas, com origem', () => {
    const s = mk('r23-scene');
    const city = s.config.homeCity;
    const fam = 'rock';
    const q = sceneQuote23(s, city, fam);
    expect(q.cost).toBeGreaterThan(0);
    expect(q.weeks).toBeGreaterThanOrEqual(3);
    expect(startSceneTrip23(s, city, fam)).toBeNull();
    const tr = scout23(s).trips[0];
    const seen: number[] = [];
    for (let i = 0; i < q.weeks; i++) {
      s.week += 1;
      scout23Week(s);
      seen.push(tr.found.length);
    }
    // chega aos poucos, não tudo de uma vez
    expect(seen[0]).toBeLessThan(q.n);
    expect(tr.found.length).toBe(q.n);
    expect(scout23(s).trips.length).toBe(0);
    for (const id of tr.found) {
      const a = s.acts[id];
      expect(a.city).toBe(city);
      expect(familyOf(a.genre)).toBe(fam);
      const k = s.knowledge[id];
      expect(k.degree).toBeGreaterThanOrEqual(2);
      expect(k.origin?.src).toBe('scene23');
      expect(k.origin?.city).toBe(city);
      expect(k.origin?.by).toBeTruthy();
      expect(k.origin!.w).toBeGreaterThan(0);
      expect(originText23(s, k).pt).toContain(cityById[city].name.pt);
      expect(originText23(s, k).pt).toMatch(/semana \d+ de \d{4}/);
    }
  });

  it('próximo passo: custo e tempo, grau só sobe quando o relatório chega', () => {
    const s = mk('r23-step');
    const a = Object.values(s.acts).find((x) => !x.owner && x.status === 'emerging' && x.members.length && !s.knowledge[x.id])!;
    expect(watchAct(s, a.id)).toBe(true);
    const k = s.knowledge[a.id];
    expect(column23(s, k)).toBe('rumor');
    const st = nextStep23(s, a.id)!;
    expect(st.cost).toBe(scoutCost(s, 1));
    expect(st.weeks).toBe(1);
    expect(st.ok).toBe(true);
    expect(startStep23(s, a.id)).toBeNull();
    expect(k.degree).toBe(1);
    expect(nextStep23(s, a.id)!.ok).toBe(false);
    s.week += 1;
    scout23Week(s);
    expect(k.degree).toBe(2);
    expect(column23(s, k)).toBe('observed');
    expect(uncText23(unc23(s, a.id, 'potential'))).toBe('?');
    expect(nextStep23(s, a.id)!.cost).toBe(scoutCost(s, 2));
    expect(nextStep23(s, a.id)!.weeks).toBe(2);
    k.degree = 3;
    const aud = nextStep23(s, a.id)!;
    expect(aud.balls).toBe(1);
    expect(startStep23(s, a.id)).toBeNull();
    expect(column23(s, k)).toBe('audition');
    s.week += 1;
    scout23Week(s);
    expect(column23(s, k)).toBe('ready');
    expect(nextStep23(s, a.id)).toBeNull();
    expect(uncText23(unc23(s, a.id, 'talent'))).toMatch(/^(~|✓) /);
  });

  it('chamada de demos e aviso de rival', () => {
    const s = mk('r23-demo');
    expect(openDemoCall23(s, 'any')).toBeNull();
    expect(openDemoCall23(s, 'any')).not.toBeNull();
    for (let i = 0; i < 3; i++) { s.week += 1; scout23Week(s); }
    const got = Object.values(s.knowledge).filter((k) => k.origin?.src === 'demo');
    expect(got.length).toBeGreaterThanOrEqual(2);
    const id = got[0].actId;
    const lb = Object.values(s.labels).find((x) => x.active)!;
    disc18(s).hot[id] = { lb: lb.id, w: s.week + 5 };
    const rv = rivalWatch23(s, id)!;
    expect(rv.hard).toBe(true);
    expect(rv.label).toBe(lb.name);
    expect(CITIES.length).toBeGreaterThan(0);
  });
});
