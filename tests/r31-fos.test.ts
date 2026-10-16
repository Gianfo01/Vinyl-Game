// R31 · onda 4 (FOS) — a família Fossati em cena: a Casa Fossati é um prédio da cidade de início do jogador (Nosso
// mundo) e a praça Efro e Lucia Fossati fica ao lado da sede. Abrir as cenas não muda o estado; cada ponto da casa leva à
// ação certa (o motivo do bloqueio é o mesmo que a ação devolve); a família está presente em qualquer ano; quem está na
// praça é decidido pela virada do mês (não pelo abrir).
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import type { GameState } from '../src/sim/types';
import { FAMILY31, FAM_CITY31 } from '../src/data/fossati31';
import { rngSnapshot19 } from '../src/sim/rng19';
import {
  famCity31, famLock31, famMeet31, famMet31, famSquare31, famTalk31, luciaLunch31, metalmac31, syncFam31, tennisClub31, soniaPromo31, type FamAct31,
} from '../src/sim/sys/fossati31';
import { places27 } from '../src/sim/sys/place27';
import { setSw } from '../src/sim/r31/switches';
import { playerActs } from '../src/sim/util';
import { HOME_SPOTS31, homeModel31, homeObjs31, squareModel31 } from '../src/ui/r31/fos31model';
import { spotOk31 } from '../src/ui/r31/scene31model';

const game = (y: number, seed = 'r31fos'): GameState => createGame(defaultConfig(`${seed}-${y}`, { startYear: y, scenario: 'established' }));
const LOTS = Array.from({ length: 14 }, (_, i) => 40 + i);
const snap = (s: GameState) => JSON.stringify({ x4: s.x4, persons: s.persons, acts: s.acts, cash: s.player.cash, facts: (s as unknown as { facts17?: unknown }).facts17, rng: rngSnapshot19(s) });

describe('r31 FOS: a casa no mundo e a praça', () => {
  it('a família mora na cidade de início do jogador e a Casa Fossati é um prédio do Nosso mundo', () => {
    const s = game(1975);
    expect(FAM_CITY31.id).toBe('');
    expect(famCity31(s)).toBe(s.config.homeCity);
    const home = places27(s, LOTS).filter((p) => p.fam31);
    expect(home.length).toBe(1);
    expect(home[0].k).toBe('apartments');
    expect(home[0].name.pt).toBe('Casa Fossati');
    expect(home[0].people.map((p) => p.key)).toEqual(FAMILY31.map((m) => `fam:${m.id}`));
  });

  it('abrir a casa e a praça (montar os modelos) não muda o estado nem o sorteio', () => {
    const s = game(1962);
    const before = snap(s);
    for (let i = 0; i < 3; i++) { homeModel31(s); squareModel31(s); places27(s, LOTS); }
    for (const k of ['lunch', 'lasagna', 'promo', 'press', 'lang', 'metalmac', 'flight', 'tennis'] as FamAct31[]) famLock31(s, k, playerActs(s)[0] ?? '', 'en');
    expect(snap(s)).toBe(before);
  });

  for (const y of [1889, 1935, 1985, 2024, 2040]) {
    it(`a família está em casa em ${y} (sempre os quatro, com a idade fixa), e cada ponto cabe na cena`, () => {
      const s = game(y);
      const m = homeModel31(s);
      for (const id of ['efro', 'lucia', 'sonia', 'antonella'] as const) {
        const p = m.people.find((x) => x.fam === id);
        expect(p, `${id} em ${y}`).toBeTruthy();
        expect(p!.look.age).toBe(FAMILY31.find((f) => f.id === id)!.age);
        expect(famTalk31(s, id).pt.length).toBeGreaterThan(5);
      }
      for (const sp of m.spots) expect(spotOk31(sp, m.W, m.H), sp.id).toBe(true);
      // a época muda a casa: cartaz de teatro até 1996, lousa da escola depois; papagaio de papel antes do aeroclube
      const objs = homeObjs31(y);
      expect(objs.find((o) => o.id === 'antonella')!.kind).toBe(y >= 1997 ? 'blackboard' : 'theatre');
      expect(objs.find((o) => o.id === 'flight')!.v).toBe(y >= 1911 ? 'plane' : 'kite');
    });
  }

  it('cada objeto da casa leva à ação certa e o motivo de bloqueio é o mesmo que a ação devolve', () => {
    const map = Object.fromEntries(HOME_SPOTS31.map((d) => [d.id, d.act]));
    expect(map).toEqual({ kitchen: 'lasagna', lunch: 'lunch', tennis: 'tennis', violin: undefined, flight: 'flight', promo: 'promo', antonella: 'press', metalmac: 'metalmac' });
    const s = game(1985);
    const act = playerActs(s)[0];
    expect(act).toBeTruthy();
    // livre → a ação acontece; depois, o motivo da trava aparece antes do clique e é o mesmo da ação
    expect(famLock31(s, 'lunch')).toBeNull();
    expect(luciaLunch31(s).ok).toBe(true);
    const why = famLock31(s, 'lunch');
    expect(why).not.toBeNull();
    expect(luciaLunch31(s).text).toEqual(why);
    expect(tennisClub31(s).ok).toBe(true);
    expect(tennisClub31(s).text).toEqual(famLock31(s, 'tennis'));
    s.player.cash = 0;
    expect(metalmac31(s).text).toEqual(famLock31(s, 'metalmac'));
    expect(soniaPromo31(s, act).text).toEqual(famLock31(s, 'promo', act));
    // interruptor desligado: a família continua no mundo, as ações dizem por quê
    setSw(s, 'fam31', false);
    expect(famLock31(s, 'lunch')?.pt).toMatch(/desligados/);
    expect(homeModel31(s).people.filter((p) => p.fam).length).toBeGreaterThanOrEqual(4);
  });

  it('conhecer na cena marca a pessoa e os quatro dão a conquista "Famiglia"', () => {
    const s = game(1990);
    for (const id of ['efro', 'lucia', 'sonia'] as const) expect(famMeet31(s, id).ok).toBe(true);
    expect(famMet31(s).famiglia).toBe(false);
    expect(famMeet31(s, 'efro').ok).toBe(false);
    expect(famMeet31(s, 'antonella').ok).toBe(true);
    expect(famMet31(s).famiglia).toBe(true);
  });

  it('a família na praça é decidida pelo mês (igual dentro do mês, muda na virada) e aparece na cena', () => {
    const s = game(1970);
    const seen = new Set<string>();
    for (let m = 0; m < 24; m++) {
      s.month = m % 12; s.year = 1970 + Math.floor(m / 12);
      const a = famSquare31(s), b = famSquare31(s);
      expect(a).toEqual(b);
      seen.add(a.join(','));
      const sq = squareModel31(s);
      expect(sq.people.filter((p) => p.fam).map((p) => p.fam)).toEqual(a);
      for (const sp of sq.spots) expect(spotOk31(sp, sq.W, sq.H), sp.id).toBe(true);
    }
    expect(seen.size).toBeGreaterThan(1); // às vezes sim, às vezes não
    syncFam31(s);
  });
});
