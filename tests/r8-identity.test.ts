// Rodada 8 — identidade mecânica do selo (§3.1) e biografia/liderança do dono (§3.8).
// Perfis nascem de decisões repetidas e mudam oportunidades, custo/risco e reações; trajetórias dão
// contatos e cobram dívidas, rivalidades, preconceitos e lacunas; estilos de liderança se consolidam
// e mexem em negociação, retenção, confiança e estresse.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { applyMods } from '../src/sim/ext4';
import { acceptOffer, defaultOffer, evaluateOffer } from '../src/sim/contracts';
import { bumpPerks, perk } from '../src/sim/perks';
import { ownerOf } from '../src/sim/sys/people/owner';
import {
  PROFILES, PROFILE_ACTIONS, actionBlock, ident, identityMonth, leadOfferEffect, noteDecision, originOfferEffect, pressReaction,
  profileOfferEffect, retentionBonus, runProfileAction, trackLaunch, type CoreProfileId, type ProfileId,
} from '../src/sim/sys/identity';
import { cityById } from '../src/data/world';
import { money, rngOf } from '../src/sim/util';
import type { Act, CharacterSpec, GameState, Offer, Release, RunConfig } from '../src/sim/types';

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
const mk = (seed: string, over: Partial<RunConfig> = {}) => createGame(defaultConfig(seed, { startYear: 1985, ...over }));
const charOf = (career: string, background = 'fan'): CharacterSpec => ({ name: 'Teste', age: 32, background, career });

/** Zera a identidade para a partida começar "sem passado" nos testes de emergência. */
function blank(s: GameState): void {
  const st = ident(s);
  for (const k of Object.keys(st.acc) as ProfileId[]) st.acc[k] = 0;
  for (const k of Object.keys(st.lacc) as (keyof typeof st.lacc)[]) st.lacc[k] = 0;
  st.cur = null; st.lean = null; st.leanMonths = 0; st.lead = null; st.llean = null; st.lleanMonths = 0;
  st.scan = s.week - 1;
}

let relN = 0;
function fakeRel(s: GameState, actId: string, over: Partial<Release> = {}): Release {
  const home = cityById[s.config.homeCity].market;
  return {
    id: `fake${relN++}`, actId, owner: 'player', type: 'lp', title: 'Teste', songs: [], week: s.week, year: s.year, q: 60, appeal: 1,
    formats: ['lp'], stock: 0, pressed: 0, marketing: [], marketingE: 0.2, territories: [home], weekly: [], totalUnits: 0, revenue: 0,
    peak: 999, weeksOnChart: 0, lastPos: 0, coverSeed: 1, shortage: 0, live: true, ...over,
  } as Release;
}

function anyAct(s: GameState, f: (a: Act) => boolean = () => true): Act {
  const a = Object.values(s.acts).find((x) => !x.owner && !x.playerBand && x.members.length > 0 && (x.status === 'active' || x.status === 'emerging') && f(x));
  if (!a) throw new Error('sem ato');
  return a;
}

function setAmbition(s: GameState, a: Act, amb: string): void {
  for (const id of a.members) if (s.persons[id]) (s.persons[id] as { ambition: string }).ambition = amb;
}

function forceProfile(s: GameState, p: ProfileId | null): void {
  const st = ident(s);
  st.cur = p;
  if (p) st.acc[p] = 40;
  bumpPerks();
}

describe('perfis do selo emergem das decisões', () => {
  it('reedições repetidas consolidam o selo de catálogo; depois, lançar sem parar vira selo de hits (com estranhamento do elenco)', () => {
    const s = mk('r8-cat');
    blank(s);
    const r = rngOf(s);
    const act = anyAct(s);
    for (let m = 0; m < 7; m++) {
      trackLaunch(s, fakeRel(s, act.id, { reissueOf: 'x', kind: 'anniversary' }));
      trackLaunch(s, fakeRel(s, act.id, { kind: 'compilation' }));
      s.week += 4;
      identityMonth(s, r);
    }
    expect(ident(s).cur).toBe('catalog');
    // virada: cadência semanal de singles por meses
    act.owner = 'player';
    act.trust = 50;
    for (let m = 0; m < 14; m++) {
      for (let w = 0; w < 4; w++) { s.week += 1; trackLaunch(s, fakeRel(s, act.id, { type: 'single', marketingE: 0.6 })); }
      identityMonth(s, r);
    }
    expect(ident(s).cur).toBe('hits');
    expect(ident(s).hist.some((x) => x.text.pt.includes('deixou de ser'))).toBe(true);
    invariant(s);
  });

  it('contratar artistas da cidade-sede faz nascer o selo de cena', () => {
    const s = mk('r8-scene');
    blank(s);
    const r = rngOf(s);
    const locals = Object.values(s.acts).filter((a) => !a.owner && !a.playerBand && a.city === s.config.homeCity && a.members.length && (a.status === 'active' || a.status === 'emerging')).slice(0, 3);
    expect(locals.length).toBeGreaterThan(0);
    s.player.cash += 0; // assinaturas via contrato real (adiantamento lançado no extrato)
    for (const a of locals) {
      const o = { ...defaultOffer(s, a), advance: money(s, 500) } as Offer;
      acceptOffer(s, a, { ...o, id: `o-${a.id}`, week: s.week, status: 'pending' });
    }
    for (let m = 0; m < 8; m++) { s.week += 4; identityMonth(s, r); }
    expect(ident(s).cur, JSON.stringify(ident(s).acc) + locals.length).toBe('scene');
    invariant(s);
  });

  it('cada perfil muda oportunidades, custo/risco e reações (nunca só um bônus passivo)', () => {
    const s = mk('r8-effects', { startYear: 1995 });
    blank(s);
    const r = rngOf(s);
    const home = cityById[s.config.homeCity].market;
    const foreignM = (['us', 'uk', 'br', 'jp', 'de', 'fr'] as string[]).find((m) => m !== home) ?? 'us';
    const act = anyAct(s);
    const local = anyAct(s, (a) => a.city === s.config.homeCity);
    act.owner = 'player';
    s.player.cash += 0;
    const base = (fn: () => number) => { forceProfile(s, null); const v = fn(); return v; };
    const ratio = (p: ProfileId, fn: () => number) => { const b = base(fn); forceProfile(s, p); const v = fn(); forceProfile(s, null); return v / b; };
    const diff = (p: ProfileId, fn: () => number) => { const b = base(fn); forceProfile(s, p); const v = fn(); forceProfile(s, null); return v - b; };
    const appeal = (rel: Release) => () => applyMods(s, 'appeal', 100, { release: rel, act }).value;
    const units = (rel: Release) => () => applyMods(s, 'chartUnits', 100, { release: rel }).value;
    const newRel = fakeRel(s, act.id);
    const reRel = fakeRel(s, act.id, { reissueOf: 'x' });
    const foreignRel = fakeRel(s, act.id, { territories: [foreignM as Release['territories'][number]] });
    const liveRel = fakeRel(s, act.id, { kind: 'live' });
    const digRel = fakeRel(s, act.id, { formats: ['streaming'] });
    const offer = (p: ProfileId, a: Act, amb: string) => { setAmbition(s, a, amb); forceProfile(s, p); const v = profileOfferEffect(s, a)?.score ?? 0; forceProfile(s, null); return v; };
    const rivalSum = () => Object.values(s.rivalries).reduce((t, x) => t + x, 0);
    const monthDelta = (p: ProfileId) => { forceProfile(s, p); const r0 = rivalSum(); const c0 = s.player.cash; s.week += 1; identityMonth(s, r); const out = { rival: rivalSum() - r0, cash: s.player.cash - c0 }; forceProfile(s, null); return out; };
    const oppOpen = (p: ProfileId) => {
      const a = PROFILE_ACTIONS.find((x) => x.profile === p)!;
      forceProfile(s, null);
      const closed = actionBlock(s, a.id)?.pt.startsWith('Só para') ?? false;
      forceProfile(s, p);
      const open = !(actionBlock(s, a.id)?.pt.startsWith('Só para') ?? false);
      forceProfile(s, null);
      return closed && open;
    };
    s.player.territories = [home, foreignM as Release['territories'][number]];
    const kinds: Record<CoreProfileId, { opp: boolean; cost: boolean; reaction: boolean }> = {
      hits: {
        opp: oppOpen('hits') && ratio('hits', appeal(newRel)) > 1.05,
        cost: ratio('hits', appeal(reRel)) < 0.95 && diff('hits', () => perk(s, 'advance')) > 0.05,
        reaction: offer('hits', act, 'fame') > 0 && offer('hits', act, 'art') < 0 && diff('hits', () => pressReaction(s, newRel)) < 0,
      },
      catalog: {
        opp: oppOpen('catalog') && ratio('catalog', appeal(reRel)) > 1.15,
        cost: (() => { ident(s).lastLaunch = s.week - 1; return ratio('catalog', appeal(newRel)) < 0.95; })(),
        reaction: offer('catalog', act, 'security') > 0 && offer('catalog', act, 'fame') < 0 && diff('catalog', () => pressReaction(s, reRel)) > 0,
      },
      scene: {
        opp: oppOpen('scene') && (forceProfile(s, 'scene'), (profileOfferEffect(s, local)?.score ?? 0) > 0.05) && (forceProfile(s, null), true) && ratio('scene', () => applyMods(s, 'cityDemand', 100, { act, cityId: s.config.homeCity }).value) > 1.1,
        cost: ratio('scene', appeal(foreignRel)) < 0.95,
        reaction: monthDelta('scene').rival >= 0 && (() => { act.positioning = 80; const v = offer('scene', act, 'art'); act.positioning = 50; return v < 0; })(),
      },
      export: {
        opp: oppOpen('export') && ratio('export', () => applyMods(s, 'cityDemand', 100, { act, cityId: Object.values(cityById).find((c) => c.market !== home)!.id }).value) > 1.08,
        cost: monthDelta('export').cash < 0,
        reaction: offer('export', act, 'status') > 0 && (forceProfile(s, 'export'), (profileOfferEffect(s, local)?.score ?? 0) < 0) && (forceProfile(s, null), true),
      },
      dev: {
        opp: oppOpen('dev') && (() => { const small = anyAct(s, (a) => a.fame < 10); forceProfile(s, 'dev'); const v = perk(s, 'songQ', small) > 1 && perk(s, 'trust', small) > 4; forceProfile(s, null); return v; })(),
        cost: (() => { const f = act.fame; act.fame = 60; const v = offer('dev', act, 'money'); act.fame = f; return v < 0; })(),
        reaction: diff('dev', () => pressReaction(s, fakeRel(s, anyAct(s, (a) => a.releases.length === 0).id))) > 0 && diff('dev', () => retentionBonus(s, act)) > 0,
      },
      tech: {
        opp: oppOpen('tech') && ratio('tech', units(digRel)) > 1.05 && ratio('tech', () => applyMods(s, 'pressingCost', 100, {}).value) < 0.95,
        cost: offer('tech', act, 'art') < 0,
        reaction: (() => { const g = act.genre; act.genre = 'rock'; const v = diff('tech', () => pressReaction(s, newRel)) < 0; act.genre = g; return v; })(),
      },
      live: {
        opp: oppOpen('live') && ratio('live', () => applyMods(s, 'showRevenue', 100, { act }).value) > 1.08 && ratio('live', units(liveRel)) > 1.1,
        cost: ratio('live', units(newRel)) < 0.97 && diff('live', () => perk(s, 'stress')) > 0,
        reaction: diff('live', () => pressReaction(s, liveRel)) > 0 && diff('live', () => perk(s, 'trust', act)) > 0,
      },
    };
    for (const p of PROFILES.filter((x) => x.id in kinds)) expect(kinds[p.id as CoreProfileId], p.id).toEqual({ opp: true, cost: true, reaction: true });
    invariant(s);
  });

  it('trade-off: o selo de catálogo não ganha o bônus do selo de hits ao lançar toda semana; a cena domina em casa, não fora', () => {
    const s = mk('r8-trade');
    blank(s);
    const act = anyAct(s);
    act.owner = 'player';
    ident(s).lastLaunch = s.week - 1;
    const rel = fakeRel(s, act.id, { type: 'single' });
    const f = (p: ProfileId | null) => { forceProfile(s, p); return applyMods(s, 'appeal', 100, { release: rel, act }).value; };
    const none = f(null);
    expect(f('hits')).toBeGreaterThan(none);
    expect(f('catalog')).toBeLessThan(none);
    const home = cityById[s.config.homeCity].market;
    const foreign = Object.values(cityById).find((c) => c.market !== home)!.market;
    const homeRel = fakeRel(s, act.id);
    const abroad = fakeRel(s, act.id, { territories: [foreign] });
    forceProfile(s, 'scene');
    const hHome = applyMods(s, 'appeal', 100, { release: homeRel, act }).value;
    const hAbroad = applyMods(s, 'appeal', 100, { release: abroad, act }).value;
    forceProfile(s, null);
    expect(hHome).toBeGreaterThan(applyMods(s, 'appeal', 100, { release: homeRel, act }).value);
    expect(hAbroad).toBeLessThan(applyMods(s, 'appeal', 100, { release: abroad, act }).value);
  });

  it('as oportunidades exclusivas custam e rendem pelo extrato, com recarga', () => {
    const s = mk('r8-opps');
    const r = rngOf(s);
    s.player.cash += 0;
    const act = anyAct(s, (a) => a.city === s.config.homeCity);
    act.owner = 'player';
    act.fans.core = 4000;
    forceProfile(s, 'live');
    const c0 = s.player.cash;
    expect(runProfileAction(s, r, 'festival')).toBeNull();
    expect(s.player.cash).not.toBe(c0);
    expect(act.fans.core).toBeGreaterThan(4000);
    expect(runProfileAction(s, r, 'festival')?.pt).toContain('semanas');
    forceProfile(s, 'scene');
    expect(runProfileAction(s, r, 'night')).toBeNull();
    expect(runProfileAction(s, r, 'blitz')?.pt).toContain('Só para');
    invariant(s);
  });
});

describe('trajetória profissional: contatos e preço', () => {
  it('a mesma pessoa com trajetórias diferentes começa com lacunas e vantagens diferentes', () => {
    const a = mk('r8-orig', { character: charOf('majorExec') });
    const b = mk('r8-orig', { character: charOf('exMusician') });
    expect(ident(a).origin).toBe('majorExec');
    expect(ident(b).origin).toBe('exMusician');
    expect(ownerOf(a).attrs.negotiation - ownerOf(b).attrs.negotiation).toBe(12);
    // rivalidade com o antigo empregador e adiantamentos menores
    const ex = ident(a).exEmployer!;
    expect(a.rivalries[ex]).toBeGreaterThanOrEqual(35);
    expect(perk(a, 'advance')).toBeLessThan(perk(b, 'advance'));
    // ex-músico: contatos (velhos companheiros) e confiança dos artistas; a indústria o acha amador
    expect(Object.values(b.knowledge).filter((k) => k.source === 'contact').length).toBeGreaterThan(0);
    expect(perk(b, 'trust')).toBeGreaterThan(perk(a, 'trust'));
    // preconceito: artistas underground desconfiam do ex-executivo
    const und = anyAct(a, (x) => x.positioning < 40);
    expect(originOfferEffect(a, und)!.score).toBeLessThan(0);
    invariant(a); invariant(b);
  });

  it('jornalista: imprensa a favor, mas artistas detonados e um rival com rancor', () => {
    const s = mk('r8-journo', { character: charOf('journalist') });
    const st = ident(s);
    expect(st.burned.length).toBeGreaterThan(0);
    const burned = s.acts[st.burned[0]];
    const ev = originOfferEffect(s, burned)!;
    expect(ev.score).toBeLessThan(-0.1);
    expect(ev.reason?.pt).toContain('resenha');
    expect(perk(s, 'critics')).toBeGreaterThanOrEqual(0.4);
    expect(Math.max(...Object.values(s.rivalries))).toBeGreaterThanOrEqual(25);
  });

  it('promotor de shows: casas de casa cheias, mas parcelas de dívida todo mês', () => {
    const s = mk('r8-promo', { character: charOf('promoter', 'roadie') });
    const st = ident(s);
    expect(st.origin).toBe('promoter');
    const left = st.debtLeft;
    expect(left).toBe(24);
    const act = anyAct(s);
    act.owner = 'player';
    const inHome = applyMods(s, 'cityDemand', 100, { act, cityId: s.config.homeCity }).value;
    st.origin = 'recordStore';
    const other = applyMods(s, 'cityDemand', 100, { act, cityId: s.config.homeCity }).value;
    st.origin = 'promoter';
    expect(inHome).toBeGreaterThan(other);
    const c0 = s.player.totalPosted;
    s.week += 1;
    identityMonth(s, rngOf(s));
    expect(st.debtLeft).toBe(left - 1);
    expect(s.player.totalPosted).toBeLessThan(c0);
    invariant(s);
  });

  it('sem trajetória escolhida, ela vem da origem antiga (saves e criação rápida)', () => {
    const s = mk('r8-map', { character: { name: 'X', age: 30, background: 'dj' } });
    expect(ident(s).origin).toBe('radio');
  });
});

describe('estilo de liderança consolidado pelas decisões', () => {
  it('apoiar artistas nas crises consolida "artista em primeiro lugar": melhores ofertas para quem quer liberdade e mais retenção', () => {
    const s = mk('r8-lead');
    blank(s);
    const r = rngOf(s);
    const act = anyAct(s, (a) => a.fame < 30);
    setAmbition(s, act, 'art');
    const o = { ...defaultOffer(s, act), creativeControl: false };
    const before = evaluateOffer(s, act, o).score;
    const retBefore = retentionBonus(s, act);
    for (let m = 0; m < 6; m++) {
      noteDecision(s, 'crisis', 'support');
      noteDecision(s, 'crisis', 'credit');
      s.week += 4;
      identityMonth(s, r);
    }
    expect(ident(s).lead).toBe('artistFirst');
    const after = evaluateOffer(s, act, o);
    expect(after.score).toBeGreaterThan(before);
    expect(after.reasons.some((x) => x.pt.includes('liberdade'))).toBe(true);
    expect(retentionBonus(s, act)).toBeGreaterThan(retBefore);
  });

  it('controlador: artistas de arte fogem, retenção cai e o dono se estressa mais que o delegador', () => {
    const s = mk('r8-ctrl');
    blank(s);
    const r = rngOf(s);
    const act = anyAct(s);
    setAmbition(s, act, 'freedom');
    const o = defaultOffer(s, act);
    const neutral = evaluateOffer(s, act, o).score;
    for (let m = 0; m < 6; m++) {
      noteDecision(s, 'poach_attempt', 'hold');
      noteDecision(s, 'x', 'force');
      s.week += 4;
      identityMonth(s, r);
    }
    expect(ident(s).lead).toBe('controller');
    expect(evaluateOffer(s, act, o).score).toBeLessThan(neutral);
    expect(leadOfferEffect(s, act, o)!.reason?.pt).toContain('controlar');
    expect(retentionBonus(s, act)).toBeLessThan(0);
    // confiança do elenco escorre e o estresse do dono sobe; o delegador alivia
    const mine = anyAct(s, (a) => a.id !== act.id);
    mine.owner = 'player';
    mine.trust = 50;
    const own = ownerOf(s);
    own.stress = 40;
    s.week += 1;
    identityMonth(s, r);
    expect(mine.trust).toBeLessThan(50);
    const ctrlStress = own.stress;
    const st = ident(s);
    st.lead = 'delegator';
    st.lacc.delegator = 30;
    own.stress = 40;
    s.week += 1;
    identityMonth(s, r);
    expect(own.stress).toBeLessThan(ctrlStress);
    expect(perk(s, 'stress')).toBeLessThan(0);
  });

  it('o estado cabe num save pequeno', () => {
    const s = mk('r8-save');
    for (let m = 0; m < 3; m++) { s.week += 4; identityMonth(s, rngOf(s)); }
    expect(JSON.stringify(ident(s)).length).toBeLessThan(3000);
  });
});
