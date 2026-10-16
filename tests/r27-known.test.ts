// Rodada 27 (KNOWN) — "Artistas conhecidos": quem a empresa do jogador conhece e por quê (modelo puro).
import { describe, expect, it } from 'vitest';
import { countryOfCity } from '../src/data/geo';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceWeek } from '../src/sim/tick';
import { watchAct } from '../src/sim/scouting';
import '../src/sim/sys/fame16';
import { countWhy27, knownArtists27, limits27 } from '../src/sim/sys/knownacts27';
import type { GameState } from '../src/sim/types';

const game = (year: number, db: 'small' | 'medium' | 'large' | 'huge' = 'small', seed = 'r27known'): GameState => {
  const cfg = defaultConfig(`${seed}-${year}`, { scenario: 'established', startYear: year });
  (cfg as { dbSize?: string }).dbSize = db;
  return createGame(cfg);
};

describe('r27 knownArtists27', () => {
  it('inclui o seu elenco (a fundo) e as superestrelas; cada linha tem ao menos um motivo', () => {
    const s = game(2005);
    advanceWeek(s);
    const list = knownArtists27(s);
    const ids = new Set(list.map((k) => k.id));
    const own = Object.values(s.acts).filter((a) => a.owner === 'player' || a.playerBand);
    expect(own.length).toBeGreaterThan(0);
    for (const a of own) {
      const k = list.find((x) => x.id === a.id)!;
      expect(k?.why).toContain('own');
      expect(k.know).toBe(3);
    }
    expect(list[0].why[0]).toBe('own'); // seu elenco abre a lista
    const stars = list.filter((k) => k.why.includes('star'));
    expect(stars.length).toBeGreaterThan(0);
    for (const k of stars) expect(s.acts[k.id].fame).toBeGreaterThanOrEqual(limits27(s.year).star);
    // o ato mais famoso do mundo em atividade é conhecido
    const top = Object.values(s.acts).filter((a) => a.debutYear <= s.year && a.status !== 'retired' && a.status !== 'split').sort((a, b) => b.fame - a.fame)[0];
    expect(ids.has(top.id)).toBe(true);
    for (const k of list) { expect(k.why.length).toBeGreaterThan(0); expect(k.know).toBeGreaterThanOrEqual(0); expect(k.know).toBeLessThanOrEqual(3); }
    const c = countWhy27(list);
    expect(c.own).toBe(own.length);
  });

  it('deixa de fora atos pequenos e distantes sem laço nenhum', () => {
    const s = game(1985, 'medium');
    const list = knownArtists27(s);
    const ids = new Set(list.map((k) => k.id));
    const my = countryOfCity(s.config.homeCity);
    const far = Object.values(s.acts).filter((a) => !a.owner && a.fame < 10 && countryOfCity(a.city) !== my && !s.knowledge[a.id] && a.debutYear <= s.year);
    expect(far.length).toBeGreaterThan(20);
    const leaked = far.filter((a) => ids.has(a.id));
    expect(leaked.length / far.length).toBeLessThan(0.05);
    // e o conhecido é bem menos que o mundo inteiro
    expect(list.length).toBeLessThan(Object.keys(s.acts).length * 0.6);
  });

  it('olheiro/radar entra na lista com o motivo certo (e o memo da semana se renova)', () => {
    const s = game(1975, 'small', 'r27known-c'); // r31 (W0-RNG): 'r27known' ficou sem candidato estrangeiro desconhecido
    const before = knownArtists27(s);
    expect(knownArtists27(s)).toBe(before); // mesma semana, nada mudou: memo
    const ids = new Set(before.map((k) => k.id));
    const my = countryOfCity(s.config.homeCity);
    const cand = Object.values(s.acts).find((a) => !a.owner && !ids.has(a.id) && a.status === 'active' && a.debutYear <= s.year && countryOfCity(a.city) !== my)!;
    expect(cand).toBeTruthy();
    watchAct(s, cand.id);
    const after = knownArtists27(s);
    expect(after).not.toBe(before);
    expect(after.find((k) => k.id === cand.id)?.why).toContain('scout');
  });

  it('é determinístico (mesma semente → mesma lista) e não escreve no estado', () => {
    const a = game(1962), b = game(1962);
    const before = JSON.stringify(a.acts).length;
    const x = knownArtists27(a), y = knownArtists27(b);
    expect(x.map((k) => `${k.id}:${k.why.join(',')}:${k.know}`)).toEqual(y.map((k) => `${k.id}:${k.why.join(',')}:${k.know}`));
    expect(JSON.stringify(a.acts).length).toBe(before);
    expect(x.some((k) => k.why.includes('local'))).toBe(true); // a cena da cidade
  });

  it("aguenta o banco 'huge' (e a segunda chamada na semana sai do memo)", () => {
    const s = game(2005, 'huge', 'r27knownhuge');
    const t0 = performance.now();
    const list = knownArtists27(s);
    const t1 = performance.now();
    knownArtists27(s);
    const t2 = performance.now();
    expect(list.length).toBeGreaterThan(20);
    expect(t1 - t0).toBeLessThan(3000);
    expect(t2 - t1).toBeLessThan(20);
  });
});
