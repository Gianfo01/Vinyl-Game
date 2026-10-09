// Rodada 8 — direitos como economia jogável (§3.3) e A&R como aposta informada (§3.4).

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth, advanceWeek } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { acceptOffer, defaultOffer, evaluateOffer } from '../src/sim/contracts';
import { marketWeek } from '../src/sim/market';
import { scheduleAnniversary } from '../src/sim/rollout';
import {
  artistRate, buyExploitPermission, renewalAdj, catalogValue, dealOfRelease, defaultRights, extendMasters, respondDemand, revertWeek, rightsOf, rightsScore, rst, splitPreview,
} from '../src/sim/rights';
import { DIMS, SOURCES8, anrRecord, dos, passOnAct, readsFor, research, synthesis, trueSignal, type Src } from '../src/sim/sys/dossier8';
import { runSimHooks } from '../src/sim/ext4';
import { mainAmbition } from '../src/sim/people';
import { money, nextId, rngOf } from '../src/sim/util';
import type { Act, GameState, Offer, Release, RightsTerms, RunConfig } from '../src/sim/types';

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
const mk = (seed: string, over: Partial<RunConfig> = {}) => createGame(defaultConfig(seed, over));
const freeAct = (s: GameState, skip = 0) => Object.values(s.acts).filter((a) => !a.owner && !a.playerBand && a.status !== 'retired' && a.status !== 'split' && a.members.length)[skip];

function sign(s: GameState, act: Act, over: Partial<Offer> = {}, rights?: Partial<RightsTerms>): string {
  const o = { ...defaultOffer(s, act), ...over } as Offer;
  if (rights) o.rights = { ...defaultRights(o.model), ...rights };
  o.id = nextId(s, 'o');
  o.week = s.week;
  o.status = 'pending';
  acceptOffer(s, act, o);
  return act.contractId!;
}

function release(s: GameState, act: Act, over: Partial<Release> = {}): Release {
  const rel: Release = {
    id: nextId(s, 'r'), actId: act.id, owner: 'player', type: 'lp', title: 'Teste', songs: [], week: s.week, year: s.year, q: 70, appeal: 40,
    formats: [], stock: 0, pressed: 0, marketing: [], marketingE: 0.5, territories: [...s.player.territories], weekly: [], totalUnits: 0, revenue: 0,
    peak: 999, weeksOnChart: 0, lastPos: 0, coverSeed: 1, shortage: 0, live: true, ...over,
  };
  s.releases[rel.id] = rel;
  act.releases.push(rel.id);
  return rel;
}

const sumLedger = (s: GameState, prefix: string, relId: string) => s.ledger.filter((e) => e.key.includes(`${prefix}:${relId}`)).reduce((t, e) => t + e.amount, 0);

describe('ficha de direitos negociável', () => {
  it('a ficha padrão do modelo não muda a avaliação; termos generosos ajudam e duros atrapalham', () => {
    const s = mk('r8-eval', { startYear: 1985 });
    const act = freeAct(s);
    const base = defaultOffer(s, act);
    const e0 = evaluateOffer(s, act, base).score;
    expect(evaluateOffer(s, act, { ...base, rights: defaultRights('classic') }).score).toBeCloseTo(e0, 6);
    const kind = evaluateOffer(s, act, { ...base, rights: { ...defaultRights('classic'), master: 'shared', reversionYears: 10, exclusive: false, pointsFromLabel: true } }).score;
    const hard = evaluateOffer(s, act, { ...base, publishing: true, rights: { ...defaultRights('classic'), pubShare: 0.5, options: 3 } }).score;
    expect(kind).toBeGreaterThan(e0 + 0.1);
    expect(hard).toBeLessThan(e0);
    const amb = mainAmbition(s, act);
    expect(rightsScore({ ...defaultRights('classic'), master: 'artist' }, 'classic', amb).reasons.length).toBeGreaterThan(0);
  });

  it('assinar grava a ficha: territórios, opções, confiança e alcance na assinatura', () => {
    const s = mk('r8-sign', { startYear: 1985 });
    const act = freeAct(s);
    const t0 = act.trust;
    const id = sign(s, act, {}, { scope: 'home', options: 2, master: 'shared', reversionYears: 0 });
    const c = s.contracts[id];
    expect(c.rights?.master).toBe('shared');
    expect(c.options).toBe(2);
    expect(c.territories?.length).toBe(1);
    expect(c.fameAtSign).toBeDefined();
    expect(act.trust).toBeGreaterThan(t0);
    expect(revertWeek(c)).toBe(Infinity);
    // master compartilhado: o artista leva metade do líquido
    expect(artistRate(c, 0.2)).toBeCloseTo(0.4, 5);
    const sp = splitPreview(c, 0.2);
    expect(sp.label + sp.artist + sp.producer + sp.guests + sp.distributor).toBeCloseTo(1, 5);
    invariant(s);
  });
});

describe('royalties, recoupment e catálogo', () => {
  it('pontos de produtor saem do caixa, o adiantamento é recuperado antes de pagar o artista e o caixa fecha', () => {
    const s = mk('r8-money', { startYear: 1985, scenario: 'established' });
    const r = rngOf(s);
    const act = freeAct(s);
    const id = sign(s, act, { advance: money(s, 400), royalty: 0.2 }, { pointsFromLabel: true, producerPts: 0.04 });
    const c = s.contracts[id];
    const rel = release(s, act, { appeal: 400 });
    const cash0 = act.cash;
    for (let i = 0; i < 6; i++) { marketWeek(s, r); s.week += 1; }
    expect(sumLedger(s, 'sales', rel.id)).toBeGreaterThan(0);
    expect(sumLedger(s, 'pts', rel.id)).toBeLessThan(0); // selo paga os pontos desde o primeiro disco
    expect(c.recouped ?? 0).toBeGreaterThan(0);
    if (c.recoupBalance > 0) expect(sumLedger(s, 'roy', rel.id)).toBe(0);
    else expect(act.cash).toBeGreaterThan(cash0);
    expect(dealOfRelease(s, rel)?.id).toBe(id);
    expect(catalogValue(s).value).toBeGreaterThan(0);
    invariant(s);
  });

  it('o master segue o acordo da época: o artista sai e o selo continua recebendo o catálogo', () => {
    const s = mk('r8-keep', { startYear: 1985 });
    const r = rngOf(s);
    const act = freeAct(s);
    const id = sign(s, act, { advance: 0 });
    const rel = release(s, act, { appeal: 300 });
    s.contracts[id].endWeek = s.week;
    act.owner = null;
    act.contractId = undefined;
    s.week += 1;
    marketWeek(s, r);
    expect(sumLedger(s, 'sales', rel.id)).toBeGreaterThan(0);
    invariant(s);
  });

  it('reversão anos depois: os masters voltam ao artista e passam a pagar só a ele; dá para recomprar antes', () => {
    const s = mk('r8-revert', { startYear: 1985 });
    const r = rngOf(s);
    const act = freeAct(s);
    const id = sign(s, act, { advance: 0 }, { reversionYears: 1, reversionNeedsRecoup: false });
    const c = s.contracts[id];
    const rel = release(s, act, { appeal: 300, week: s.week });
    // o contrato acabou há meio ano: aviso e opção de estender
    c.endWeek = s.week + 1;
    act.owner = null;
    act.contractId = undefined;
    s.week += 30;
    runSimHooks('month', s, r);
    expect(c.revertWarned).toBe(true);
    act.trust = 60;
    const cash0 = s.player.cash;
    expect(extendMasters(s, id)).toBeNull();
    expect(s.player.cash).toBeLessThan(cash0);
    expect(rightsOf(c).reversionYears).toBe(11);
    // sem extensão, outro contrato reverte de fato
    const act2 = freeAct(s, 1);
    const id2 = sign(s, act2, { advance: 0 }, { reversionYears: 1, reversionNeedsRecoup: false });
    const c2 = s.contracts[id2];
    const rel2 = release(s, act2, { appeal: 300 });
    c2.endWeek = s.week + 1;
    act2.owner = null;
    act2.contractId = undefined;
    s.week += 60;
    runSimHooks('month', s, r);
    expect(c2.reverted).toBe(true);
    expect(rel2.owner).toBe('indie');
    expect(rel.owner).toBe('player');
    const artistCash = act2.cash;
    marketWeek(s, r);
    expect(sumLedger(s, 'sales', rel2.id)).toBe(0);
    expect(act2.cash).toBeGreaterThan(artistCash);
    expect(rst(s).reversions.some((x) => x.contractId === id2)).toBe(true);
    invariant(s);
  });

  it('sem direito de reedição o aniversário é bloqueado até comprar a autorização', () => {
    const s = mk('r8-reissue', { startYear: 1985, scenario: 'established' });
    const r = rngOf(s);
    const act = freeAct(s);
    sign(s, act, { advance: 0 }, { reissue: false });
    const rel = release(s, act, { year: s.year - 10, type: 'lp' });
    rel.songs = [];
    const err = scheduleAnniversary(s, r, rel.id, 0);
    expect(err?.pt).toMatch(/reedição/);
    act.trust = 70;
    expect(buyExploitPermission(s, rel.id, 'reissue')).toBeNull();
    const err2 = scheduleAnniversary(s, r, rel.id, 0);
    expect(err2?.pt ?? '').not.toMatch(/não cede/);
    invariant(s);
  });

  it('artista que cresceu pede renegociação; aceitar paga bônus e sobe o royalty, ignorar custa confiança', () => {
    const s = mk('r8-reneg', { startYear: 1985, scenario: 'established' });
    const r = rngOf(s);
    const act = freeAct(s);
    const id = sign(s, act, { advance: 0, termMonths: 60 });
    const c = s.contracts[id];
    c.fameAtSign = 2;
    act.fame = 60;
    c.lastRenegWeek = s.week - 200;
    for (let i = 0; i < 20 && !rst(s).demands.length; i++) runSimHooks('month', s, r);
    const d = rst(s).demands[0];
    expect(d).toBeTruthy();
    expect(d.royalty).toBeGreaterThan(c.royalty);
    const roy0 = c.royalty;
    expect(respondDemand(s, r, d.id, 'accept')).toBeNull();
    expect(c.royalty).toBeGreaterThan(roy0);
    expect(c.fameAtSign).toBe(60);
    // renovar com poder de barganha: o ajuste pesa contra quando o artista cresceu
    c.fameAtSign = 10;
    const tough = renewalAdj(s, c);
    expect(tough).toBeLessThan(0);
    c.rights = { ...defaultRights('classic'), master: 'shared', reversionYears: 10 };
    expect(renewalAdj(s, c)).toBeGreaterThan(tough);
    invariant(s);
  });
});

describe('dossiê de descoberta', () => {
  it('cada fonte é enviesada: o crítico supervaloriza novidade, o agente local minimiza riscos; ninguém mostra o valor verdadeiro', () => {
    const s = mk('r8-bias', { startYear: 1990, scenario: 'established' });
    s.player.cash = money(s, 1e7);
    s.player.initialCash = s.player.cash - s.player.totalPosted;
    const acts = Object.values(s.acts).filter((a) => !a.owner && !a.playerBand && a.status !== 'retired' && a.status !== 'split' && a.members.length).slice(0, 24);
    let critic = 0;
    let local = 0;
    for (const a of acts) {
      s.scoutActionsUsed = 0;
      expect(research(s, a.id, 'critic')).toBeNull();
      expect(research(s, a.id, 'local')).toBeNull();
      critic += readsFor(s, a.id, 'orig').find((x) => x.src === 'critic')!.mid - trueSignal(s, a, 'orig');
      local += readsFor(s, a.id, 'risk').find((x) => x.src === 'local')!.mid - trueSignal(s, a, 'risk');
    }
    expect(critic / acts.length).toBeGreaterThan(4);
    expect(local / acts.length).toBeLessThan(-2);
    // o crítico não lê o risco; a síntese existe mas carrega os vieses
    expect(readsFor(s, acts[0].id, 'risk').some((x) => x.src === 'critic')).toBe(false);
    expect(synthesis(s, acts[0].id, 'orig')).toBeTruthy();
    expect(DIMS.length).toBe(7);
    invariant(s);
  });

  it('pagar mais pesquisa estreita o intervalo; demo e residência levam semanas e a residência expõe o ato', () => {
    const s = mk('r8-narrow', { startYear: 1990, scenario: 'established' });
    s.player.cash = money(s, 1e6);
    s.player.initialCash = s.player.cash - s.player.totalPosted;
    const a = freeAct(s, 3);
    s.knowledge[a.id] ??= { actId: a.id, degree: 1, stage: 'signal', bias: 0, updatedWeek: s.week, source: 'watch' };
    research(s, a.id, 'producer');
    const w1 = readsFor(s, a.id, 'live').find((x) => x.src === 'producer')!.w;
    s.scoutActionsUsed = 0;
    research(s, a.id, 'producer');
    s.scoutActionsUsed = 0;
    research(s, a.id, 'producer');
    const w3 = readsFor(s, a.id, 'live').find((x) => x.src === 'producer')!.w;
    expect(w3).toBeLessThan(w1);
    expect(research(s, a.id, 'residency')).toBeNull();
    expect(research(s, a.id, 'residency')?.pt).toMatch(/andamento/);
    const fame0 = a.fame;
    for (let i = 0; i < 9 && !a.owner; i++) advanceWeek(s);
    if (!a.owner) {
      expect(readsFor(s, a.id, 'fans').some((x) => x.src === 'residency')).toBe(true);
      expect(a.fame).toBeGreaterThan(fame0);
      expect(dos(s).d[a.id].pending).toBeUndefined();
    }
    expect(SOURCES8.residency.weeks).toBe(8);
    invariant(s);
  });

  it('o histórico de A&R julga as apostas: deixar passar quem estourou e acertar antes do mercado', () => {
    const s = mk('r8-calls', { startYear: 1990, scenario: 'established' });
    const r = rngOf(s);
    const passed = freeAct(s, 4);
    s.knowledge[passed.id] ??= { actId: passed.id, degree: 2, stage: 'monitoring', bias: 0, updatedWeek: s.week, source: 'watch' };
    passOnAct(s, passed.id);
    expect(s.knowledge[passed.id]).toBeUndefined();
    const signed = freeAct(s, 5);
    signed.fame = 3;
    sign(s, signed, { advance: 0 });
    runSimHooks('month', s, r);
    const st = dos(s);
    expect(st.calls.some((c) => c.actId === signed.id && c.kind === 'sign')).toBe(true);
    for (const c of st.calls) c.week -= 120;
    passed.fame += 30;
    signed.fame = 40;
    const rep0 = s.player.reputation.artists;
    runSimHooks('month', s, r);
    expect(st.calls.find((c) => c.actId === passed.id)?.judged).toBe('missed');
    expect(st.calls.find((c) => c.actId === signed.id)?.judged).toBe('early');
    expect(s.player.reputation.artists).toBeGreaterThan(rep0);
    const rec = anrRecord(s);
    expect(rec.early).toBe(1);
    expect(rec.missed).toBe(1);
    invariant(s);
  });

  it('um ano de jogo com o sistema rodando não quebra o caixa', () => {
    const s = mk('r8-year', { startYear: 1995, scenario: 'established' });
    const act = freeAct(s);
    sign(s, act, { advance: money(s, 500) }, { reversionYears: 5, exclusive: false, sync: false });
    for (let i = 0; i < 12; i++) advanceMonth(s);
    invariant(s);
    void (['producer'] as Src[]);
  });
});
