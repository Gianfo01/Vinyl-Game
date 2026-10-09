// Rodada 6 — scouting/pipeline, persona do jogador, perks, temperamento × gênero, cartas e mutators,
// capital (transferências, sócios, IPO, conselho).

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { familyOf } from '../src/data/world';
import { traitAffinity, traitById } from '../src/data/people';
import { createGame } from '../src/sim/worldgen';
import { perk } from '../src/sim/perks';
import { scoutActionsPerMonth, setStage, syncPipeline, watchAct } from '../src/sim/scouting';
import { makeOffer, defaultOffer } from '../src/sim/contracts';
import { deriveAttrs, persona, skills } from '../src/sim/sys/persona';
import { ownerOf } from '../src/sim/sys/people/owner';
import { acceptInvestor, capital, goPublic6, injectCapital, opinion, ownerShare, payDividend, seekInvestors, valuation, withdrawFromCompany } from '../src/sim/sys/capital';
import { rngOf } from '../src/sim/util';
import type { RunConfig } from '../src/sim/types';

const spec = { name: 'Rita Teste', age: 30, background: 'street', role: 'mc' as const, traits: ['rebel', 'charismatic', 'workaholic'], style: 'curator', visual: 'street', favGenre: 'rnr', points: { ear: 4 } };
const mk = (seed: string, over: Partial<RunConfig> = {}) => createGame(defaultConfig(seed, { character: spec, ...over }));
const invariant = (s: ReturnType<typeof mk>) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);

describe('scouting e pipeline', () => {
  it('há pelo menos 3 ações de scouting por mês e o pipeline segue as ofertas', () => {
    const s = mk('r6-scout');
    expect(scoutActionsPerMonth(s)).toBeGreaterThanOrEqual(3);
    const a = Object.values(s.acts).find((x) => !x.owner && x.status !== 'retired' && !s.knowledge[x.id])!;
    expect(watchAct(s, a.id)).toBe(true);
    expect(s.knowledge[a.id].stage).toBe('monitoring');
    expect(setStage(s, a.id, 'investigating')).toBe(true);
    expect(setStage(s, a.id, 'offer')).toBe(false);
    makeOffer(s, defaultOffer(s, a));
    syncPipeline(s);
    expect(s.knowledge[a.id].stage).toBe('offer');
    s.offers.find((o) => o.actId === a.id)!.status = 'counter';
    syncPipeline(s);
    expect(s.knowledge[a.id].stage).toBe('negotiation');
  });
});

describe('persona', () => {
  it('atributos derivam de origem, traços, estilo, visual e pontos', () => {
    const a = deriveAttrs(spec);
    expect(a.charisma).toBeGreaterThan(40 + 12);
    const s = mk('r6-persona');
    expect(ownerOf(s).attrs.charisma).toBe(a.charisma);
    expect(persona(s).traits).toEqual(['rebel', 'charismatic', 'workaholic']);
    expect(persona(s).style).toBe('curator');
  });

  it('origem e traços viram perks; estilo desbloqueia perks com o tempo', () => {
    const s = mk('r6-perks');
    expect(perk(s, 'energy')).toBeGreaterThanOrEqual(1); // workaholic
    expect(perk(s, 'scoutActions')).toBeGreaterThanOrEqual(1); // cria da periferia
    const rock = Object.values(s.acts).find((x) => familyOf(x.genre) === 'rock')!;
    const sacred = Object.values(s.acts).find((x) => familyOf(x.genre) === 'sacred') ?? Object.values(s.acts).find((x) => familyOf(x.genre) !== 'rock' && familyOf(x.genre) !== 'hiphop')!;
    expect(perk(s, 'appeal', rock)).toBeGreaterThan(perk(s, 'appeal', sacred));
    // rodada 9: o estilo antigo vira habilidades iniciais no ramo equivalente (Garimpeiro → Rede)
    expect(skills(s).owned).toContain('net_book');
    expect(skills(s).lifestyle).not.toBeNull();
  });
});

describe('temperamento × gênero', () => {
  it('atos de rock tendem a ter rebeldes; hip hop, gente da rua', () => {
    const s = mk('r6-temper', { startYear: 1980 });
    const avg = (fam: string) => {
      const ps = Object.values(s.acts).filter((a) => familyOf(a.genre) === fam).flatMap((a) => a.members.map((m) => s.persons[m]).filter(Boolean));
      return ps.length ? ps.reduce((t, p) => t + traitAffinity(p!.traits, fam), 0) / ps.length : 0;
    };
    expect(avg('rock')).toBeGreaterThan(0.15);
    expect(traitById.rebel.group).toBe('temper');
  });
});

describe('cartas e mutators novos', () => {
  it('perks de carta e mutator aparecem', () => {
    const s = mk('r6-cards', { card: 'hit_factory', mutators: ['harsh_critics', 'talent_flood'] });
    expect(perk(s, 'appeal')).toBeGreaterThan(0.07);
    expect(perk(s, 'critics')).toBeLessThan(-1);
    expect(perk(s, 'signals')).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < 6; i++) advanceMonth(s);
    invariant(s);
  });
});

describe('capital', () => {
  it('aporte, retirada, sócios, dividendos e IPO mantêm o caixa fechando', () => {
    const s = mk('r6-cap', { startYear: 1980 });
    const r = rngOf(s);
    const o = ownerOf(s);
    o.wealth += 100000_00;
    const w0 = o.wealth;
    expect(injectCapital(s, 2000)).toBeNull();
    expect(o.wealth).toBeLessThan(w0);
    invariant(s);
    expect(seekInvestors(s, r)).toBeNull();
    const off = capital(s).offers[0];
    expect(off).toBeTruthy();
    expect(acceptInvestor(s, off.id)).toBeNull();
    expect(ownerShare(s)).toBeLessThan(1);
    const inv = capital(s).investors[0];
    const before = opinion(inv);
    expect(withdrawFromCompany(s, r, 1000)).toBeNull();
    expect(opinion(inv)).toBeLessThan(before);
    expect(payDividend(s, 0.05)).toBeNull();
    invariant(s);
    for (let i = 0; i < 6; i++) advanceMonth(s);
    invariant(s);
    expect(valuation(s)).toBeGreaterThan(0);
    s.player.hq = Math.max(s.player.hq, 2);
    s.player.revenueByYear[s.year - 1] = 5_000_000_00;
    expect(goPublic6(s, 0.2, 'local', false)).toBeNull();
    expect(s.listing.listed).toBe(true);
    invariant(s);
  });
});

describe('nomes reais', () => {
  it('atos históricos, selos, festivais e textos fixos aparecem com nomes reais', async () => {
    const { applyRealNames } = await import('../src/data/realnames');
    const { FESTIVALS } = await import('../src/data/catalog');
    const { t } = await import('../src/i18n/strings');
    const s = mk('r6-real', { startYear: 1965, mode: 'historic', realNames: true });
    const names = Object.values(s.acts).map((a) => a.name);
    expect(names).toContain('The Beatles');
    const beatles = Object.values(s.acts).find((a) => a.name === 'The Beatles')!;
    expect(beatles.members.map((m) => s.persons[m].name)).toContain('Paul McCartney');
    expect(Object.values(s.labels).map((x) => x.name)).toContain('Motown');
    expect(FESTIVALS.map((f) => f.name)).toContain('Woodstock');
    expect(t({ pt: 'Top 10 da WorldSound 100', en: 'WorldSound 100 top 10' })).toContain('Billboard Hot 100');
    applyRealNames(false);
    expect(FESTIVALS.map((f) => f.name)).toContain('Timberfield Rock');
    expect(t({ pt: 'WorldSound 100', en: 'WorldSound 100' })).toBe('WorldSound 100');
  });
});

describe('intriga e decisões (CK3)', () => {
  it('trama de investigação termina, decisões aplicam perks e o caixa fecha', async () => {
    const I = await import('../src/sim/sys/intrigue');
    const s = mk('r6-intrigue', { startYear: 1970 });
    const lb = Object.values(s.labels).find((x) => x.active)!;
    expect(I.startScheme(s, 'dig', { kind: 'label', id: lb.id }, 2)).toBeNull();
    expect(I.intrigue(s).schemes.length).toBe(1);
    for (let i = 0; i < 8; i++) advanceMonth(s);
    expect(I.intrigue(s).schemes.length).toBe(0);
    expect(I.intrigue(s).log.length).toBeGreaterThan(1);
    s.player.reputation.institutional = 60;
    s.player.hq = Math.max(s.player.hq, 2);
    s.player.cash += 0;
    const before = perk(s, 'signals');
    if (s.player.cash > 100000_00) {
      expect(I.takeDecision(s, rngOf(s), 'music_school')).toBeNull();
      expect(perk(s, 'signals')).toBeGreaterThan(before);
    }
    expect(I.takeDecision(s, rngOf(s), 'artistic_manifesto')).toBeNull();
    expect(I.takeDecision(s, rngOf(s), 'commercial_pact')).not.toBeNull();
    expect(perk(s, 'critics')).toBeGreaterThan(0.2);
    invariant(s);
  });
});
