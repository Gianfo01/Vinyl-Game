// Rodada 20b (Z) — show ↔ notícia pelo id exato do show; alterar turnê depois de marcar (prévia = lançamento).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { CITIES } from '../src/data/world';
import { changeTour20, factShow20, futureStops20, showFacts20, showKey20, showOf20, tourChangeQuote20 } from '../src/sim/sys/showops20';
import { finishLiveShow, liveIncidents20, playLiveCard20, resolveCard, showTour20 } from '../src/sim/sys/live/notes';
import type { Tour, TourStop } from '../src/sim/xtypes';

const stop = (cityId: string, day: number, status: TourStop['status'] = 'scheduled'): TourStop => ({ cityId, day, tier: 2, price: 4500, capacity: 1500, sold: status === 'played' ? 900 : 0, merch: 0, status, travelDays: 1 });
const tour = (id: string, actId: string, stops: TourStop[], status: Tour['status'], sec: 0 | 1 | 2, crew: number): Tour =>
  ({ id, actId, name: id, stops, setlist: [], minutes: 60, production: 1, role: 'headline', crew, pay: 'door', costReserved: 100000, revenue: 0, costs: 100000, status, log: [], accidents: 0, kit18: { move: 'bus', bed: 'std', diem: 1, gear: 'own', reh: 0, ins: 0, sec, prom: 'local' } }) as Tour;

describe('r20b Z', () => {
  const s = createGame(defaultConfig('r20bz', { startYear: 1985 }));
  const act = Object.values(s.acts).filter((a) => a.status === 'active' && a.members.length > 1).sort((a, b) => b.fame - a.fame)[0];
  act.owner = 'player';
  const city = CITIES[0].id, city2 = CITIES[1].id;
  const now = s.day + s.clock.dayInMonth;
  // turnê ANTERIOR encerrada na mesma cidade (segurança reforçada, equipe grande) vem antes no array
  const old = tour('trOld', act.id, [stop(city, now - 200, 'played')], 'done', 2, 16);
  const cur = tour('trCur', act.id, [stop(city, now, 'played'), stop(city2, now + 10), stop(city, now + 20)], 'running', 0, 1);
  s.tours.push(old, cur);
  const key = showKey20(cur.id, now);
  const oldKey = showKey20(old.id, now - 200);

  it('incidente resolve a turnê e a data EXATAS (não a anterior na mesma cidade)', () => {
    expect(showTour20(s, act.id, key)?.id).toBe('trCur');
    expect(showTour20(s, act.id, oldKey)?.id).toBe('trOld');
    expect(showOf20(s, key)?.stop.day).toBe(now);
    const card = { label: { pt: '', en: '' }, hint: { pt: '', en: '' }, stat: 'security' as const, gain: 10, risk: 0.1 };
    const cCur = resolveCard(s, act.id, card, 0, key).chance, cOld = resolveCard(s, act.id, card, 0, oldKey).chance;
    expect(cCur).toBeLessThan(cOld); // kit da turnê atual (casa), não o da antiga (reforçada)
    expect(resolveCard(s, act.id, card, 0).chance).toBe(cCur); // sem chave: a turnê em curso
  });

  it('show ao vivo vira fato com o id do show; o fato aponta de volta para a data', () => {
    const inc = liveIncidents20(s, key);
    for (let i = 0; i < inc.length; i++) playLiveCard20(s, key, act.id, i, inc[i], 0);
    expect(finishLiveShow(s, key, act.id, 900, 90)).not.toBeNull();
    const fs = showFacts20(s, key);
    expect(fs.length).toBe(1);
    expect(fs[0].place).toBe(city);
    expect(factShow20(fs[0])).toBe(key);
    expect(fs[0].data?.inc).toBe(inc.length);
    expect(showFacts20(s, oldKey)).toHaveLength(0);
  });

  it('alterar depois de marcar: só datas futuras, caixa = prévia, sem caixa nada muda', () => {
    expect(futureStops20(s, cur).map((x) => x.day)).toEqual([now + 10, now + 20]);
    const playedPrice = cur.stops[0].price;
    const ch = { kit: { sec: 2 as const, ins: 1 as const }, crew: 4, priceMult: 1.25 };
    const q = tourChangeQuote20(s, cur.id, ch);
    expect(q.delta).toBeGreaterThan(0);
    s.player.cash = Math.max(0, -q.cash - 1);
    const snap = JSON.stringify(cur);
    const e = changeTour20(s, cur.id, ch);
    expect('pt' in e).toBe(true);
    expect(JSON.stringify(cur)).toBe(snap);
    s.player.cash = 10_000_000;
    const before = s.player.cash;
    const q2 = tourChangeQuote20(s, cur.id, ch);
    const r = changeTour20(s, cur.id, ch);
    expect('ok' in r && r.ok).toBe(true);
    expect(s.player.cash - before).toBe(q2.cash);
    expect(cur.kit18?.sec).toBe(2);
    expect(cur.crew).toBe(4);
    expect(cur.stops[0].price).toBe(playedPrice);
    expect(cur.stops[1].price).not.toBe(4500);
    // reduzir de volta: devolve só metade da economia
    const q3 = tourChangeQuote20(s, cur.id, { kit: { sec: 0, ins: 0 }, crew: 1 });
    expect(q3.delta).toBeLessThan(0);
    expect(q3.fee).toBe(Math.round(-q3.delta / 2));
    expect(q3.cash).toBe(-q3.delta - q3.fee);
    expect(tourChangeQuote20(s, cur.id, { kit: { prom: 'giant' } }).ok).toBe(false);
    expect(tourChangeQuote20(s, old.id, { crew: 2 }).ok).toBe(false);
  });
});
