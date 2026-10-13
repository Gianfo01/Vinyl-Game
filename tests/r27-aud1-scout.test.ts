// r27 (AUD1) — motor único de scouting (scout23 absorveu missões, pedido com filtros e o aprofundar na hora) e a
// noite de olheiro jogável (night27): determinismo, mapa puro, cada escolha mexe no resultado na direção certa,
// rival no bar vira disputa, sem NaN, e o modo Rápido (viagem à cena) segue igual.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { matchesReq20 } from '../src/sim/scout20';
import { nextStep23, scout23, scout23Week, startSceneTrip23, startStep23 } from '../src/sim/sys/scout23';
import { nightBlock27, nightCost27, nightPlan27, playNight27, type NightPick27, type NightPlan27 } from '../src/sim/sys/night27';
import { disc18 } from '../src/sim/sys/discover18';
import { energyLeft } from '../src/sim/sys/life';
import { money, post } from '../src/sim/util';
import { ownerOf } from '../src/sim/sys/people/owner';
import type { GameState } from '../src/sim/types';

const mk = (seed: string, startYear = 1990) => { const s = createGame(defaultConfig(seed, { startYear })); post(s, 'aud1', money(s, 300000), 'business', 'teste'); return s; };
const weeks = (s: GameState, n: number) => { for (let i = 0; i < n; i++) { s.week += 1; scout23Week(s); } };
const firstScoutable = (s: GameState, p: NightPlan27) => { for (const v of p.venues) for (const a of v.acts) if (!a.signedTo && !a.known) return { v, a }; return null; };

describe('r27 AUD1 — scouting num motor só', () => {
  it('viagem com filtro de nível (ex-pedido de scout) só traz quem obedece — e nunca relaxa', () => {
    const s = mk('aud1-req');
    expect(startSceneTrip23(s, s.config.homeCity, 'any', undefined, { level: 'beginner', role: 'band' })).toBeNull();
    const tr = scout23(s).trips[0];
    expect(tr.req).toEqual({ level: 'beginner', role: 'band' });
    weeks(s, 6);
    for (const id of tr.found) expect(matchesReq20(s.acts[id], { genreFamily: 'any', market: tr.market, level: 'beginner', role: 'band' })).toBe(true);
    // sem filtro, nada muda no objeto da viagem (modo de sempre)
    expect(startSceneTrip23(s, s.config.homeCity, 'rock')).toBeNull();
    expect(scout23(s).trips.at(-1)!.req).toBeUndefined();
  });

  it('o próximo passo do funil é o único "aprofundar": custo, cota de A&R e relatório depois', () => {
    const s = mk('aud1-step');
    const k = Object.values(s.knowledge).find((x) => x.degree === 1 && !s.acts[x.actId]?.owner) ?? (() => { const a = Object.values(s.acts).find((x) => !x.owner && x.status === 'emerging' && !s.knowledge[x.id])!; s.knowledge[a.id] = { actId: a.id, degree: 1, stage: 'signal', bias: 0, updatedWeek: s.week, source: 'watch' }; return s.knowledge[a.id]; })();
    const used = s.scoutActionsUsed;
    expect(startStep23(s, k.actId)).toBeNull();
    expect(s.scoutActionsUsed).toBe(used + 1);
    expect(k.degree).toBe(1);
    weeks(s, 1);
    expect(k.degree).toBe(2);
    expect(nextStep23(s, k.actId)!.to).toBe(3);
  });
});

describe('r27 AUD1 — noite de olheiro', () => {
  it('o mapa é determinístico e não mexe no estado', () => {
    const s = mk('aud1-night');
    const snap = JSON.stringify([Object.keys(s.knowledge).length, s.player.cash, s.week, Object.keys(s.acts).length]);
    const a = nightPlan27(s), b = nightPlan27(s);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify([Object.keys(s.knowledge).length, s.player.cash, s.week, Object.keys(s.acts).length])).toBe(snap);
    expect(a.venues.length).toBeGreaterThan(0);
    for (const v of a.venues) { expect(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.fee)).toBe(true); for (const x of v.acts) expect([1, 2, 3]).toContain(x.buzz); }
  });

  it('ver o show põe no funil como Observado; ficar o show inteiro vai mais fundo; custa 1 bolinha e caixa', () => {
    const s1 = mk('aud1-night2'), s2 = mk('aud1-night2');
    const p1 = nightPlan27(s1), p2 = nightPlan27(s2);
    const f = firstScoutable(s1, p1)!;
    expect(f).toBeTruthy();
    const e0 = energyLeft(s1), c0 = s1.player.cash;
    const r1 = playNight27(s1, p1, [{ venue: f.v.id, act: f.a.actId }]);
    if ('pt' in r1) throw new Error(r1.pt);
    const id1 = r1.lines[0].actId;
    expect(energyLeft(s1)).toBe(e0 - 1);
    expect(s1.player.cash).toBe(c0 - nightCost27(s1, p1, [{ venue: f.v.id, act: f.a.actId }]));
    expect(s1.knowledge[id1].degree).toBe(2);
    expect(s1.knowledge[id1].origin?.src).toBe('night27');
    const both: NightPick27[] = [{ venue: f.v.id, act: f.a.actId }, { venue: f.v.id, act: f.a.actId }];
    const r2 = playNight27(s2, p2, both);
    if ('pt' in r2) throw new Error(r2.pt);
    expect(r2.lines[1].actId).toBe(id1); // o mesmo ato (a abertura nasce igual nas duas semente iguais)
    expect(s2.knowledge[id1].degree).toBe(3);
    // uma noite por mês
    expect(nightBlock27(s1)).not.toBeNull();
    expect('pt' in (playNight27(s1, p1, [{ venue: f.v.id, act: f.a.actId }]) as object)).toBe(true);
  });

  it('puxar conversa nunca piora e, com carisma alto, aprofunda', () => {
    let deeper = 0;
    for (let i = 0; i < 5; i++) {
      const s = mk(`aud1-talk-${i}`);
      ownerOf(s).attrs.charisma = 95;
      const p = nightPlan27(s);
      const f = firstScoutable(s, p);
      if (!f) continue;
      const res = playNight27(s, p, [{ venue: f.v.id, act: f.a.actId, talk: true }]);
      expect('pt' in res).toBe(false);
      if ('pt' in res) continue;
      for (const x of res.lines) { expect(x.after).toBeGreaterThanOrEqual(x.before); expect(x.why.pt.length).toBeGreaterThan(5); }
      if (s.knowledge[res.lines[0].actId].degree >= 3) deeper++;
    }
    expect(deeper).toBeGreaterThanOrEqual(3);
  });

  it('rival no bar pode virar disputa (aviso de rival de sempre); determinístico por semente', () => {
    let saw = false;
    for (let i = 0; i < 12 && !saw; i++) {
      const s = mk(`aud1-rival-${i}`);
      const p = nightPlan27(s);
      const v = p.venues.find((x) => x.rival && x.acts.some((a) => !a.signedTo));
      if (!v) continue;
      const a = v.acts.find((x) => !x.signedTo)!;
      const res = playNight27(s, p, [{ venue: v.id, act: a.actId }, { venue: v.id, act: a.actId }, { venue: v.id, act: a.actId }]);
      if ('pt' in res) continue;
      const hit = res.lines.find((x) => x.rival);
      if (hit) { saw = true; expect(disc18(s).hot[hit.actId]?.lb).toBe(v.rival!.id); }
    }
    expect(saw).toBe(true);
  });

  it('modo Rápido intacto: olhar o mapa da noite não muda a viagem à cena', () => {
    const a = mk('aud1-quick'), b = mk('aud1-quick');
    nightPlan27(b); nightPlan27(b, b.config.homeCity);
    for (const s of [a, b]) { expect(startSceneTrip23(s, s.config.homeCity, 'any')).toBeNull(); weeks(s, 4); }
    const names = (s: GameState) => Object.values(s.knowledge).filter((k) => k.origin?.src === 'scene23').map((k) => s.acts[k.actId].name).sort();
    expect(names(a).length).toBeGreaterThan(0);
    expect(names(a)).toEqual(names(b));
  });
});
