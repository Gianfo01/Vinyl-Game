// R31 · onda 4 (S) — submundo no Nosso mundo: fachadas só das facções do país (as de outra cidade viram emissário),
// polícia pelo calor, sala dos fundos com chefe e pedidos, mural de ligações, delegacia com as celas e as saídas,
// mercado negro com estoque que gira e risco, baile com as três saídas. Explorar não muda o mundo.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import type { GameState } from '../src/sim/types';
import { playerActs } from '../src/sim/util';
import { setSw } from '../src/sim/r31/switches';
import { obj31 } from '../src/sim/r31/object';
import { CO31 } from '../src/sim/r31/relic31';
import { places27 } from '../src/sim/sys/place27';
import { crime17, jailPerson, orgById } from '../src/sim/sys/crime17';
import { _mob29, asks29 } from '../src/sim/sys/mob29';
import {
  bail31, baile31, bailes31, bmMonth31, bmRows31, buyBm31, cellLock31, cells31, emissaries31, localOrgs31, mural31, police31, restockBm31, room31,
  under31, underPlaces31, visitCell31,
} from '../src/sim/sys/under31';
import { auditInside31, insideModel31 } from '../src/ui/r31/inside31model';

const game = (seed: string, year: number, city: string): GameState => createGame(defaultConfig(seed, { scenario: 'established', startYear: year, dbSize: 'small', homeCity: city } as Parameters<typeof defaultConfig>[1]));
const LOTS = Array.from({ length: 16 }, (_, i) => 40 + i);

describe('r31 S: só as facções do país da sede têm fachada', () => {
  it('Rio 1985: facções brasileiras com fachada; nenhuma de fora; as demais do país viram emissário', () => {
    const s = game('s-rio', 1985, 'rio');
    const { here, via } = localOrgs31(s);
    expect(here.length).toBeGreaterThanOrEqual(1);
    expect(here.length).toBeLessThanOrEqual(3);
    for (const o of [...here, ...via]) expect(o.a3).toBe('BRA');
    expect(here.some((o) => o.id === 'cv' || o.id === 'bicho')).toBe(true);
    const ps = underPlaces31(s);
    expect(ps.filter((p) => p.k === 'facade').length).toBe(here.length);
    expect(ps.some((p) => p.k === 'police')).toBe(true);
    expect(ps.some((p) => p.k === 'market')).toBe(true);
    if (via.length) expect(emissaries31(s)[0].key).toMatch(/^o:/);
  });
  it('mudar a sede de país muda quem aparece', () => {
    const s = game('s-move', 1985, 'rio');
    const a = localOrgs31(s).here.map((o) => o.id);
    s.config.homeCity = 'new_york';
    const b = [...localOrgs31(s).here, ...localOrgs31(s).via];
    expect(b.every((o) => o.a3 === 'USA')).toBe(true);
    expect(b.map((o) => o.id)).not.toEqual(a);
  });
  it('no mapa: delegacia, beco e fachadas ocupam prédios da cidade comum', () => {
    const s = game('s-map', 1985, 'rio');
    const ps = places27(s, LOTS);
    expect(ps.some((p) => p.k === 'police')).toBe(true);
    expect(ps.filter((p) => p.k === 'facade').every((p) => !!p.org)).toBe(true);
  });
});

describe('r31 S: polícia, sala dos fundos e baile', () => {
  it('mais calor = mais viaturas e paradas', () => {
    const s = game('s-heat', 1985, 'rio');
    crime17(s).heat.BRA = 5;
    const a = police31(s);
    crime17(s).heat.BRA = 80;
    const b = police31(s);
    expect(b.cars).toBeGreaterThan(a.cars);
    expect(b.stops).toBe(true);
  });
  it('sala dos fundos: chefe com ficha, pedido na mesa; baile com as três saídas (sair antes = recusar)', () => {
    const s = game('s-room', 1985, 'rio');
    const o = localOrgs31(s).here[0];
    const r0 = room31(s, o.id)!;
    expect(r0.boss.key).toBe(`o:${o.id}`);
    const act = playerActs(s)[0];
    _mob29.ask29(s, orgById(s, o.id)!, 'baile', undefined, act);
    expect(room31(s, o.id)!.rows.some((x) => x.kind === 'ask')).toBe(true);
    const b = bailes31(s).find((x) => x.o.id === o.id)!;
    expect(b).toBeTruthy();
    const r = baile31(s, b.askId, 'leave');
    expect(r.ok).toBe(true);
    expect(asks29(s).some((a) => a.id === b.askId)).toBe(false);
  });
  it('mural: facções do país, você e os fios de laço de rua', () => {
    const s = game('s-mural', 1985, 'rio');
    const o = localOrgs31(s).here[0];
    const a = Object.values(s.acts).find((x) => x.owner !== 'player' && x.status !== 'retired' && x.status !== 'split')!;
    crime17(s).ties[a.id] = o.id;
    const m = mural31(s);
    expect(m.nodes.some((n) => n.k === 'you')).toBe(true);
    expect(m.edges.some((e) => e.k === 'tie' && e.b === `a:${a.id}`)).toBe(true);
    for (const e of m.edges) expect(e.story.pt).not.toMatch(/undefined|NaN/);
  });
});

describe('r31 S: delegacia com cadeia', () => {
  it('as celas mostram quem está preso, com o tempo que falta; visitar, fiança (interruptor)', () => {
    const s = game('s-jail', 1985, 'rio');
    const pid = Object.values(s.acts).find((x) => x.owner !== 'player' && x.members.length)!.members[0];
    jailPerson(s, pid, 'BRA', 6, { pt: 'Teste', en: 'Test' });
    const c = cells31(s).find((x) => x.pid === pid)!;
    expect(c.weeks).toBeGreaterThan(20);
    expect(visitCell31(s, pid).ok).toBe(true);
    expect(cellLock31(s, pid, 'visit')?.pt).toMatch(/visitou/);
    s.player.cash = 1e10;
    setSw(s, 'under31', false);
    expect(cellLock31(s, pid, 'bail')?.pt).toMatch(/desligad/);
    setSw(s, 'under31', true);
    expect(bail31(s, pid).ok).toBe(true);
    expect(cells31(s).some((x) => x.pid === pid)).toBe(false);
  });
});

describe('r31 S: mercado negro', () => {
  it('estoque gira na virada do mês (determinístico); comprar equipamento entra no acervo com a história', () => {
    const s = game('s-bm', 1985, 'rio');
    s.player.cash = 1e10;
    delete under31(s).bm[s.config.homeCity];
    restockBm31(s);
    const a = JSON.stringify(bmRows31(s).map((r) => [r.k, r.name.pt]));
    const s2 = game('s-bm', 1985, 'rio');
    delete under31(s2).bm[s2.config.homeCity];
    restockBm31(s2);
    expect(JSON.stringify(bmRows31(s2).map((r) => [r.k, r.name.pt]))).toBe(a);
    const gear = bmRows31(s).find((r) => r.k === 'gear');
    if (gear) {
      const r = buyBm31(s, gear.id);
      expect(r.ok).toBe(true);
      const mine = Object.values(obj31(s).objs).filter((o) => o.owner === CO31 && o.origin === 'stolen');
      expect(mine.length).toBe(1);
    }
    const cp = bmRows31(s).find((r) => r.k === 'copies');
    if (cp) {
      expect(buyBm31(s, cp.id).ok).toBe(true);
      expect(under31(s).lots.length).toBe(1);
      const res = bmMonth31(s);
      expect(res.sold + res.seized).toBeGreaterThanOrEqual(1);
      expect(under31(s).lots.length).toBe(0);
    }
  });
});

describe('r31 S: explorar não muda o mundo', () => {
  it('modelos do submundo e as cenas (fachada, fundos, baile, delegacia, beco) só leem', () => {
    const s = game('s-pure', 1985, 'rio');
    places27(s, LOTS);
    const before = JSON.stringify(s);
    const o = localOrgs31(s).here[0];
    underPlaces31(s); mural31(s); cells31(s); bmRows31(s); police31(s); room31(s, o.id); bailes31(s);
    for (const k of ['facade', 'backroom', 'baile', 'police', 'market'] as const) {
      const m = insideModel31(s, { id: `t:${k}`, k, name: k, people: [{ name: 'X', role: { pt: 'x', en: 'x' } }], year: s.year, city: s.config.homeCity, seed: s.config.seed, org: o.id, v: 'club' });
      expect(auditInside31(m)).toEqual([]);
      expect(m.spots.length).toBeGreaterThanOrEqual(2);
    }
    expect(JSON.stringify(s)).toBe(before);
  });
});
