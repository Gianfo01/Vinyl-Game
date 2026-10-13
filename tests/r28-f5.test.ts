// r28 (fase 5, C7): contratação com escolha — promessas com verba/prazo/multa, rival na oferta ao vivo de ato com
// fama > 10, reserva própria do rival, contraproposta do rival com sorteio, rival sem estado privado.
import { beforeAll, describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, checkPromises, defaultOffer, resolveOne } from '../src/sim/contracts';
import { freeCash20 } from '../src/sim/oblig20';
import { scoutEligible20 } from '../src/sim/scout20';
import { bringRival27, propose27, startNego27, type Nego27 } from '../src/sim/sys/nego27';
import { committed28, prom28, promiseMet28, promiseRows28, promiseTerms28, tickPromises28, TOUR_GIG_WEEKS28 } from '../src/sim/sys/promises28';
import { contender28, perceivedDependence28, perceivedTrust28, rivalContest28, rivalReserve28, rs28 } from '../src/sim/sys/rivalsense28';
import type { Act, GameState, Offer } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';
import { familyOf } from '../src/data/world';
import { Rng } from '../src/core/rng';

let BASE: GameState;
const clone = (s: GameState): GameState => structuredClone(s);
const free = (s: GameState, minFame: number, maxFame = 100): Act[] =>
  Object.values(s.acts).filter((a) => !a.owner && a.fame > minFame && a.fame <= maxFame && scoutEligible20(s, a).ok).sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1));
const offerFor = (s: GameState, a: Act, extra: Partial<Offer> = {}): Offer => ({ ...defaultOffer(s, a), id: `o-t-${a.id}`, week: s.week, status: 'pending', ...extra });

beforeAll(() => {
  BASE = createGame(defaultConfig('r28f5', { startYear: 1975, scenario: 'emerging' }));
  BASE.player.cash = Math.max(BASE.player.cash, 50_000_00);
}, 120000);

describe('r28 C7 — promessas com verba, prazo e multa', () => {
  it('termos: turnê e prioridade têm verba e multa; liberdade só multa; prazos de sempre', () => {
    const a = free(BASE, 0)[0];
    const tour = promiseTerms28(BASE, a, 'tour');
    const pri = promiseTerms28(BASE, a, 'priority');
    const fr = promiseTerms28(BASE, a, 'freedom', 150);
    expect(tour.budget).toBeGreaterThan(0);
    expect(tour.penalty).toBeGreaterThan(0);
    expect(tour.weeks).toBe(26);
    expect(pri.weeks).toBe(52);
    expect(fr.budget).toBe(0);
    expect(fr.penalty).toBeGreaterThan(0);
    expect(fr.weeks).toBe(150);
  });

  it('assinar com promessa compromete a verba: o caixa livre cai, a linha aparece na ficha/Cockpit', () => {
    const s = clone(BASE);
    const a = free(s, 0)[0];
    const before = freeCash20(s);
    const o = offerFor(s, a, { promises: ['tour', 'priority'] });
    acceptOffer(s, a, o);
    const c = s.contracts[a.contractId!];
    expect(c.promises.every((p) => p.budget !== undefined && p.penalty !== undefined)).toBe(true);
    const com = committed28(s);
    expect(com).toBe(c.promises.reduce((t, p) => t + (p.budget ?? 0), 0));
    expect(before - o.advance - freeCash20(s)).toBe(com);
    const rows = promiseRows28(s, a.id);
    expect(rows.map((r) => r.kind).sort()).toEqual(['priority', 'tour']);
    expect(rows.every((r) => r.state === 'open' && r.weeksLeft > 0)).toBe(true);
  });

  it('descumprir no prazo: multa vai para o artista, sai do caixa, confiança cai, verba liberada', () => {
    const s = clone(BASE);
    const a = free(s, 0)[0];
    acceptOffer(s, a, offerFor(s, a, { promises: ['tour'] }));
    const c = s.contracts[a.contractId!];
    const p = c.promises[0];
    s.week = p.dueWeek;
    const cash0 = s.player.cash, actCash0 = a.cash, trust0 = a.trust;
    checkPromises(s);
    expect(p.kept).toBe(false);
    expect(p.paidPenalty).toBe(p.penalty);
    expect(s.player.cash).toBe(cash0 - p.penalty!);
    expect(a.cash).toBe(actCash0 + p.penalty!);
    expect(a.trust).toBeLessThan(trust0);
    expect(committed28(s)).toBe(0);
    expect(prom28(s).penalties).toBe(p.penalty);
  });

  it('cumprir antes do prazo: a verba sai na semana (apoio ao ato), sem multa', () => {
    const s = clone(BASE);
    const a = free(s, 0)[0];
    acceptOffer(s, a, offerFor(s, a, { promises: ['tour'] }));
    const c = s.contracts[a.contractId!];
    const p = c.promises[0];
    s.week += 3;
    a.history.push({ week: s.week } as never);
    // r28: turnê cumprida = turnê do selo encerrada (ou 6+ semanas de shows); uma semana de bar não basta mais
    s.memory.push({ week: s.week, year: s.year, kind: 'tour_done', text: { pt: 'turnê', en: 'tour' }, actId: a.id } as never);
    const cash0 = s.player.cash, fans0 = a.fans.casual;
    tickPromises28(s);
    expect(p.kept).toBe(true);
    expect(p.spent).toBe(p.budget);
    expect(s.player.cash).toBe(cash0 - p.budget!);
    expect(a.fans.casual).toBeGreaterThan(fans0);
    expect(p.paidPenalty).toBeUndefined();
    expect(committed28(s)).toBe(0);
  });
});

describe('r28 C7 — rival na oferta ao vivo, reserva própria e contraproposta', () => {
  it('oferta ao vivo de ato com fama > 10 passa pelo teste do rival; fama ≤ 10 ao vivo nunca', () => {
    let sniped = 0, contests = 0;
    for (const a of free(BASE, 10).slice(0, 6)) for (let k = 0; k < 6; k++) {
      const s = clone(BASE);
      s.config.seed = `r28f5-live-${k}`;
      const o = offerFor(s, s.acts[a.id], { id: `o-live-${k}` });
      s.offers.push(o);
      const res = resolveOne(s, Rng.fromSeed(`r28f5|${a.id}|${k}`), o, true);
      if (res === 'sniped') sniped++;
      contests = Math.max(contests, rs28(s).live);
    }
    expect(contests).toBeGreaterThan(0);
    expect(sniped).toBeGreaterThan(0);
    for (const a of free(BASE, 0, 10).filter((x) => !x.catalogNo).slice(0, 6)) {
      const s = clone(BASE);
      const o = offerFor(s, s.acts[a.id]);
      s.offers.push(o);
      expect(resolveOne(s, Rng.fromSeed(`r28f5|low|${a.id}`), o, true)).not.toBe('sniped');
      expect(rs28(s).live).toBe(0);
    }
  });

  it('reserva do rival não depende do seu lance nem do estado privado (confiança, receita)', () => {
    const s = clone(BASE);
    const a = free(s, 10)[0];
    const lb = contender28(s)!;
    const r0 = rivalReserve28(s, lb, a);
    a.trust = 5;
    s.offers.push(offerFor(s, a, { advance: 1 }));
    expect(rivalReserve28(s, lb, a)).toBe(r0);
    expect(r0).toBeGreaterThan(0);
  });

  it('um lance muito melhor que a reserva faz o rival recuar; um lance ruim perde para ele', () => {
    const a0 = free(BASE, 10)[0];
    let lost = 0, won = 0;
    for (let k = 0; k < 20; k++) {
      const s = clone(BASE);
      s.config.seed = `r28f5-c-${k}`;
      const a = s.acts[a0.id];
      const lb = contender28(s)!;
      lb.aggression = 1; // sempre entra (interesse) — o desfecho é da reserva e do sorteio
      const rich = offerFor(s, a, { id: `o-rich-${k}`, advance: rivalReserve28(s, lb, a) * 4, royalty: 0.3, creativeControl: true });
      const resR = rivalContest28(clone(s), Rng.fromSeed(`i|${k}`), a, rich, 2, false);
      if (!resR) won++;
      const poor = offerFor(s, a, { id: `o-poor-${k}`, advance: 0, royalty: 0.05 });
      const s2 = clone(s);
      const resP = rivalContest28(s2, Rng.fromSeed(`i|${k}`), s2.acts[a.id], poor, -1, false);
      if (resP) lost++;
    }
    expect(won).toBeGreaterThanOrEqual(18);
    expect(lost).toBeGreaterThanOrEqual(10);
  });

  it('determinismo: mesma semente, mesma disputa', () => {
    const a = free(BASE, 10)[0];
    const run = () => {
      const s = clone(BASE);
      const o = offerFor(s, s.acts[a.id], { id: 'o-det' });
      s.offers.push(o);
      const res = resolveOne(s, Rng.fromSeed('det'), o, true);
      return JSON.stringify([res, s.acts[a.id].owner, rs28(s), s.acts[a.id].contractId ? s.contracts[s.acts[a.id].contractId!].advance : 0]);
    };
    expect(run()).toBe(run());
  });

  it('mesa r27: o rival entra com lance da reserva dele e, se você passa, cobre ou recua (sorteio)', () => {
    const outs = new Set<string>();
    for (const a of free(BASE, 10).slice(0, 8)) {
      const s = clone(BASE);
      const st = startNego27(s, a.id, defaultOffer(s, a));
      if (!('actId' in st)) continue;
      const n: Nego27 = st;
      bringRival27(s, n, true);
      if (!n.rival) continue;
      expect(n.rival.reserve).toBeGreaterThan(0);
      expect(n.rival.bid).toBeLessThanOrEqual(n.rival.reserve!);
      const o = { ...n.ours, promises: [...n.ours.promises], advance: n.rival.reserve! * 3, royalty: 0.3 };
      propose27(s, n, o);
      outs.add(n.rival.out ? 'out' : n.rival.counters ? 'counter' : 'none');
      expect(n.log.some((x) => x.who === 'rival')).toBe(true);
    }
    expect(outs.size).toBeGreaterThan(0);
    expect(outs.has('none')).toBe(false);
  });
});

describe('r28 C7 — rival sem estado privado', () => {
  it('confiança percebida ignora a confiança real; reage a boato público (promessa quebrada)', () => {
    const s = clone(BASE);
    const a = free(s, 0)[0];
    acceptOffer(s, a, offerFor(s, a));
    const lb = contender28(s)!;
    a.trust = 95;
    const hi = perceivedTrust28(s, lb.id, a);
    a.trust = 3;
    expect(perceivedTrust28(s, lb.id, a)).toBe(hi);
    s.memory.push({ week: s.week, year: s.year, kind: 'broken_promise', text: { pt: 'x', en: 'x' }, actId: a.id } as never);
    expect(perceivedTrust28(s, lb.id, a)).toBeLessThan(hi);
  });

  it('dependência percebida não lê release.revenue', () => {
    const s = clone(BASE);
    const a = free(s, 0)[0];
    acceptOffer(s, a, offerFor(s, a));
    const rel = Object.values(s.releases).find((r) => !r.hist);
    if (rel) {
      a.releases.push(rel.id);
      rel.week = s.week;
      rel.totalUnits = Math.max(rel.totalUnits, 5000);
    }
    const d0 = perceivedDependence28(s, familyOf);
    if (rel) rel.revenue = rel.revenue * 50 + 1_000_000_00;
    expect(perceivedDependence28(s, familyOf)).toEqual(d0);
  });
});

describe('r28 C7 — cumprimento antecipado sem caixa', () => {
  it('atendida mas sem caixa para a verba: espera (sem multa); no prazo, sem caixa, quebra e paga o que der', () => {
    const s = clone(BASE);
    const a = free(s, 0)[0];
    acceptOffer(s, a, offerFor(s, a, { promises: ['tour'] }));
    const p = s.contracts[a.contractId!].promises[0];
    a.history.push({ week: s.week } as never);
    // r28: turnê cumprida = turnê do selo encerrada (ou 6+ semanas de shows); uma semana de bar não basta mais
    s.memory.push({ week: s.week, year: s.year, kind: 'tour_done', text: { pt: 'turnê', en: 'tour' }, actId: a.id } as never);
    s.player.cash = 0;
    tickPromises28(s);
    expect(p.kept).toBeUndefined();
    expect(p.paidPenalty).toBeUndefined();
    expect(prom28(s).broken).toBe(0);
    s.week = p.dueWeek;
    checkPromises(s);
    expect(p.kept).toBe(false);
    expect(prom28(s).broken).toBe(1);
  });
});

describe('r28 C7 — turnê prometida exige estrada de verdade', () => {
  it('uma semana de show da agenda não cumpre; 6 semanas ou uma turnê encerrada cumprem', () => {
    const s = clone(BASE);
    const a = free(s, 0)[0];
    acceptOffer(s, a, offerFor(s, a, { promises: ['tour'] }));
    const c = s.contracts[a.contractId!];
    const p = c.promises[0];
    a.history.push({ week: s.week } as never);
    const gig = (w: number) => s.memory.push({ week: w, year: s.year, kind: 'gigs', text: { pt: 'shows', en: 'gigs' }, actId: a.id } as never);
    gig(s.week);
    expect(promiseMet28(s, c, a, p)).toBe(false);
    for (let i = 1; i < TOUR_GIG_WEEKS28; i++) gig(s.week + i);
    expect(promiseMet28(s, c, a, p)).toBe(true);
    s.memory = s.memory.filter((m) => !(m.actId === a.id && m.kind === 'gigs'));
    expect(promiseMet28(s, c, a, p)).toBe(false);
    s.memory.push({ week: s.week, year: s.year, kind: 'tour_done', text: { pt: 'turnê', en: 'tour' }, actId: a.id } as never);
    expect(promiseMet28(s, c, a, p)).toBe(true);
  });
});
