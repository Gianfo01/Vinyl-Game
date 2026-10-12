// r27 (I1): salas e andares compráveis da sede — catálogo por nível (bate com o desenho), preço por época e cidade,
// compra → obra → aberta, efeitos reais (vagas da sede e perks), manutenção mensal, andar antes das salas dele,
// salas que acompanham o selo na mudança e estado versionado.

import { describe, expect, it } from 'vitest';
import { HQ_LEVELS } from '../src/data/rules';
import { hqCaps } from '../src/sim/branches';
import { defaultConfig } from '../src/sim/bot';
import { perk } from '../src/sim/perks';
import {
  BUY27, LEVELS27, ROOM_DEFS27, buyBlocker27, buyRoom27, cityMul27, floorId27, grantRoom27, hqRooms27, hqr27, month27, roomCost27, upkeep27,
} from '../src/sim/sys/hqrooms27';
import type { GameState } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';
import { specFloors27 } from '../src/ui/ps/hqpx27';

const game = (seed: string, year = 1975, city = 'new_york'): GameState => {
  const s = createGame(defaultConfig(seed, { scenario: 'established', startYear: year, dbSize: 'small' } as Parameters<typeof defaultConfig>[1]));
  s.config.homeCity = city;
  return s;
};
/** Avança o mês da simulação só para as obras (sem rodar o resto do tick). */
const nextMonth = (s: GameState): void => {
  s.week += 4;
  if (s.month >= 11) { s.month = 0; s.year += 1; } else s.month += 1;
  month27(s);
};
const unit = (s: GameState, id: string) => hqRooms27(s).find((u) => u.id === id)!;

describe('r27 I1 catálogo por nível', () => {
  it('andares e salas da simulação batem com a planta desenhada (hqpx27)', () => {
    for (let hq = 0; hq < HQ_LEVELS.length; hq++) {
      const lv = LEVELS27[hq];
      const spec = specFloors27(hq);
      expect(spec.length).toBe(lv.floors);
      for (const r of lv.rooms) {
        const want = r.id === 'loungeVip' ? 'lounge' : r.id;
        expect(spec[r.floor]).toContain(want);
      }
      // andar comprável só tem salas compráveis (as salas do jogo nunca ficam trancadas atrás de um andar)
      for (const f of lv.buyFloors) for (const k of spec[f.floor]) expect((BUY27 as string[]).includes(k)).toBe(true);
      // toda sala extra desenhada é comprável neste nível
      for (const [i, fl] of spec.entries()) for (const k of fl) if ((BUY27 as string[]).includes(k)) expect(lv.rooms.some((r) => r.id === k && r.floor === i)).toBe(true);
    }
    expect(LEVELS27[0].rooms.length + LEVELS27[0].buyFloors.length).toBe(0); // garagem: nada a comprar
    expect(LEVELS27[4].buyFloors.length).toBeGreaterThanOrEqual(2); // torre: andares inteiros a montar
  });
  it('toda sala tem efeito real (vaga da sede ou perk), custo, manutenção e obra', () => {
    for (const d of Object.values(ROOM_DEFS27)) {
      expect(Object.keys(d.fx.caps ?? {}).length + Object.keys(d.fx.perks ?? {}).length).toBeGreaterThan(0);
      expect(d.cost).toBeGreaterThan(0); expect(d.upkeep).toBeGreaterThan(0); expect(d.months).toBeGreaterThanOrEqual(1);
      expect(d.fxText.pt).toBeTruthy(); expect(d.fxText.en).toBeTruthy();
    }
  });
});

describe('r27 I1 leitura pura e preço', () => {
  it('nível novo vem com salas e andares fechados; sala de andar fechado espera o andar', () => {
    const s = game('hqr-a');
    s.player.hq = 4;
    const before = JSON.stringify(s.x4);
    const us = hqRooms27(s);
    expect(JSON.stringify(s.x4)).toBe(before); // pura
    expect(us.every((u) => u.status === 'locked')).toBe(true);
    expect(us.filter((u) => u.kind === 'floor').map((u) => u.id)).toEqual([floorId27(4, 3), floorId27(4, 4)]);
    expect(unit(s, 'legal').blocked?.pt).toMatch(/andar/);
    expect(unit(s, 'studioB').blocked).toBeNull(); // estúdio B fica num andar já pronto
    for (const u of us) { expect(u.cost).toBeGreaterThan(0); expect(u.upkeep).toBeGreaterThan(0); expect(u.eta).toBe(u.months); expect(u.effect.pt).toBeTruthy(); }
  });
  it('custo segue a época (nominal) e a cidade (mercado × bairro)', () => {
    const a = game('hqr-b', 1975, 'new_york'); a.player.hq = 3;
    const b = game('hqr-b', 2005, 'new_york'); b.player.hq = 3;
    const c = game('hqr-b', 2005, 'sao_paulo'); c.player.hq = 3;
    expect(roomCost27(b, 'studioB')).toBeGreaterThan(roomCost27(a, 'studioB'));
    expect(cityMul27(c)).toBeLessThan(cityMul27(b));
    expect(roomCost27(c, 'studioB')).toBeLessThan(roomCost27(b, 'studioB'));
    // sala maior em prédio maior custa mais
    const t = game('hqr-b', 2005, 'new_york'); t.player.hq = 4;
    expect(roomCost27(t, 'studioB')).toBeGreaterThan(roomCost27(b, 'studioB'));
  });
});

describe('r27 I1 compra → obra → aberta', () => {
  it('estúdio B: paga, fica em obra pelos meses certos, abre e soma uma sessão; manutenção mensal', () => {
    const s = game('hqr-c');
    s.player.hq = 3;
    s.player.cash = 1e12;
    grantRoom27(s, floorId27(3, 3));
    const caps0 = hqCaps(s);
    const cost = unit(s, 'studioB').cost;
    const cash0 = s.player.cash;
    expect(buyRoom27(s, 'studioB')).toBeNull();
    expect(s.player.cash).toBe(cash0 - cost);
    expect(unit(s, 'studioB').status).toBe('building');
    expect(unit(s, 'studioB').eta).toBe(ROOM_DEFS27.studioB.months);
    expect(buyBlocker27(s, 'studioB')?.pt).toMatch(/obra/i);
    expect(hqCaps(s).sessions).toBe(caps0.sessions); // em obra: sem efeito ainda
    for (let i = 1; i < ROOM_DEFS27.studioB.months; i++) { nextMonth(s); expect(unit(s, 'studioB').status).toBe('building'); expect(unit(s, 'studioB').eta).toBe(ROOM_DEFS27.studioB.months - i); }
    nextMonth(s);
    expect(unit(s, 'studioB').status).toBe('open');
    expect(hqCaps(s).sessions).toBe(caps0.sessions + 1);
    // manutenção: andar + estúdio B, todo mês
    const up = upkeep27(s);
    expect(up).toBe(unit(s, 'studioB').upkeep + unit(s, floorId27(3, 3)).upkeep);
    const c1 = s.player.cash;
    nextMonth(s);
    expect(c1 - s.player.cash).toBe(up);
  });
  it('andar: libera as salas dele e soma vagas de equipe', () => {
    const s = game('hqr-d');
    s.player.hq = 4;
    s.player.cash = 1e12;
    const staff0 = hqCaps(s).staff;
    expect(buyRoom27(s, 'legal')?.pt).toMatch(/andar/); // sala antes do andar: não
    expect(buyRoom27(s, floorId27(4, 3))).toBeNull();
    expect(unit(s, floorId27(4, 3)).status).toBe('building');
    for (let i = 0; i < LEVELS27[4].buyFloors[0].months; i++) nextMonth(s);
    expect(unit(s, floorId27(4, 3)).status).toBe('open');
    expect(hqCaps(s).staff).toBe(staff0 + LEVELS27[4].buyFloors[0].staff);
    expect(unit(s, 'legal').blocked).toBeNull();
    expect(buyRoom27(s, 'legal')).toBeNull();
  });
  it('efeitos: perks e vagas das salas abertas (imprensa, ensaio, reunião, arquivo, reforma do lounge)', () => {
    const s = game('hqr-e');
    s.player.hq = 4;
    const p0 = { appeal: perk(s, 'appeal'), signals: perk(s, 'signals'), morale: perk(s, 'morale') };
    const car0 = hqCaps(s).careers;
    grantRoom27(s, floorId27(4, 3)); grantRoom27(s, floorId27(4, 4));
    for (const id of ['press', 'meeting', 'archive', 'loungeVip']) grantRoom27(s, id);
    expect(perk(s, 'appeal')).toBeCloseTo(p0.appeal + 0.03, 5);
    expect(perk(s, 'signals')).toBeCloseTo(p0.signals + 0.5, 5);
    expect(perk(s, 'morale')).toBeCloseTo(p0.morale + 0.3, 5);
    expect(hqCaps(s).careers).toBe(car0 + 2);
    // ensaio no estúdio pequeno: bilheteria
    const t = game('hqr-e2'); t.player.hq = 1;
    const sr = perk(t, 'showRevenue');
    grantRoom27(t, 'rehearsal');
    expect(perk(t, 'showRevenue')).toBeCloseTo(sr + 0.04, 5);
  });
  it('sem caixa: não compra e explica', () => {
    const s = game('hqr-f');
    s.player.hq = 3;
    s.player.cash = 0;
    expect(buyRoom27(s, 'meeting')?.pt).toMatch(/[Cc]aixa/);
    expect(unit(s, 'meeting').status).toBe('locked');
  });
  it('mudança de sede: sala comprada vai junto; andar é do prédio', () => {
    const s = game('hqr-g');
    s.player.hq = 4;
    grantRoom27(s, 'studioB');
    expect(unit(s, 'studioB').status).toBe('open');
    s.player.hq = 3; // o estúdio B do prédio fica no último andar, ainda vazio
    expect(unit(s, 'studioB').status).toBe('locked');
    expect(unit(s, 'studioB').owned).toBe(true);
    expect(unit(s, 'studioB').cost).toBe(0);
    grantRoom27(s, floorId27(3, 3));
    expect(unit(s, 'studioB').status).toBe('open');
    s.player.hq = 5;
    expect(unit(s, floorId27(5, 3)).status).toBe('locked'); // andares novos vêm vazios
  });
  it('estado versionado: versão antiga recomeça do zero', () => {
    const s = game('hqr-h');
    (s.x4 as unknown as Record<string, unknown>).hqr27 = { v: 0, own: { studioB: true } };
    expect(hqr27(s).v).toBe(1);
    expect(hqr27(s).own.studioB).toBeUndefined();
  });
});
