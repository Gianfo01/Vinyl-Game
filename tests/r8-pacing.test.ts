// Rodada 8 — eras que mudam a estratégia (posturas com modificadores duradouros, rivais também
// escolhem), avançar até algo relevante com critérios, resumo agrupado, delegação com prioridade,
// teto de gasto, nível de atenção e registro das decisões da equipe; sede como painel.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { applyMods } from '../src/sim/ext4';
import { resolveDecision } from '../src/sim/events';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { activeStances, chooseStance, currentEra, era8, pivotStance, rivalStances, stanceOf } from '../src/sim/sys/eras8';
import { advanceUntil, checkStop, DEFAULT_STOP, describeEntry, overCapacity, pace8, policyOf, setPolicy, teamCapacity } from '../src/sim/sys/pacing8';
import { actStatus, hq8, hqChanges } from '../src/sim/sys/hq8';
import { agendaById } from '../src/data/people';
import { money, playerActs, post } from '../src/sim/util';
import type { GameState, Release, RunConfig } from '../src/sim/types';

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
const mk = (seed: string, over: Partial<RunConfig> = {}) => createGame(defaultConfig(seed, { mode: 'historic', scenario: 'established', ...over }));
const fakeRel = (s: GameState, type: Release['type'], owner = 'player'): Release => {
  const actId = owner === 'player' ? playerActs(s)[0] : Object.values(s.acts).find((a) => a.owner === owner)?.id ?? playerActs(s)[0];
  return { id: 'fake', actId, owner, type, title: 'x', songs: [], week: s.week, year: s.year, q: 60, appeal: 1, formats: [], stock: 0, pressed: 0, marketing: [], marketingE: 0, territories: [], weekly: [], totalUnits: 0, revenue: 0, peak: 0, weeksOnChart: 0, lastPos: 0, coverSeed: 1, shortage: 0, live: true };
};
const appeal = (s: GameState, rel: Release) => applyMods(s, 'appeal', 100, { release: rel, act: s.acts[rel.actId] }).value;

describe('eras que mudam a estratégia', () => {
  it('na virada do LP o selo escolhe uma postura e os modificadores mudam singles e LPs', () => {
    const s = mk('r8-era-lp', { startYear: 1950 });
    expect(currentEra(s).id).toBe('albums');
    advanceMonth(s);
    const d = s.decisions.find((x) => x.eventId === 'era8_albums');
    expect(d).toBeTruthy();
    expect(d!.options.map((o) => o.id)).toEqual(['hits', 'works', 'both']);
    const before = { lp: appeal(s, fakeRel(s, 'lp')), single: appeal(s, fakeRel(s, 'single')) };
    resolveDecision(s, d!.id, 'works');
    expect(era8(s).chosen.albums?.s).toBe('works');
    expect(stanceOf(s, 'player', 'albums')?.id).toBe('works');
    const after = { lp: appeal(s, fakeRel(s, 'lp')), single: appeal(s, fakeRel(s, 'single')) };
    expect(after.lp).toBeGreaterThan(before.lp);
    expect(after.single).toBeLessThan(before.single);
    invariant(s);
  });

  it('eras já passadas no início ficam com a postura padrão; só a atual é perguntada', () => {
    const s = mk('r8-era-90', { startYear: 1990 });
    advanceMonth(s);
    const st = era8(s);
    expect(st.chosen.albums?.auto).toBe(true);
    expect(st.chosen.video?.auto).toBe(true);
    expect(s.decisions.some((x) => x.eventId === 'era8_cd')).toBe(true);
    // posturas antigas pesam menos que a atual
    const act = activeStances(s, 'player');
    expect(act.find((x) => x.era.id === 'cd')?.weight).toBe(1);
    expect(act.find((x) => x.era.id === 'albums')?.weight).toBeLessThan(1);
  });

  it('catálogo no CD: discos velhos vendem mais; pivô custa caro e tem carência', () => {
    const s = mk('r8-era-cd', { startYear: 1990 });
    advanceMonth(s);
    const old = { ...fakeRel(s, 'lp'), week: s.week - 80 } as Release;
    const base = applyMods(s, 'chartUnits', 1000, { release: old }).value;
    chooseStance(s, 'cd', 'catalog');
    expect(applyMods(s, 'chartUnits', 1000, { release: old }).value).toBeGreaterThan(base * 1.3);
    const cash = s.player.cash;
    expect(pivotStance(s, 'fresh')).toBeNull();
    expect(s.player.cash).toBeLessThan(cash);
    expect(stanceOf(s, 'player', 'cd')?.id).toBe('fresh');
    expect(pivotStance(s, 'catalog')).not.toBeNull(); // carência
    invariant(s);
  });

  it('selos rivais adotam posturas conforme o arquétipo e isso afeta os discos deles', () => {
    const s = mk('r8-era-npc', { startYear: 2010 });
    expect(currentEra(s).id).toBe('streaming');
    const counts = rivalStances(s, 'streaming');
    const active = Object.values(s.labels).filter((x) => x.active).length;
    expect(counts.reduce((t, c) => t + c.labels.length, 0)).toBe(active);
    const lb = Object.values(s.labels).find((x) => x.active && Object.values(s.acts).some((a) => a.owner === x.id));
    expect(lb).toBeTruthy();
    expect(stanceOf(s, lb!.id, 'streaming')).toBeTruthy();
    // determinístico: a mesma pergunta dá a mesma resposta
    expect(stanceOf(s, lb!.id, 'streaming')?.id).toBe(stanceOf(s, lb!.id, 'streaming')?.id);
  });

  it('imagem é tudo na TV de clipes cobra por artista todo mês', () => {
    const s = mk('r8-era-video', { startYear: 1984 });
    advanceMonth(s);
    chooseStance(s, 'video', 'image');
    chooseStance(s, 'cd', 'mixed');
    const before = s.player.totals.marketing ?? 0;
    advanceMonth(s);
    expect(s.ledger.some((e) => e.key.includes('era8:video'))).toBe(true);
    expect((s.player.totals.marketing ?? 0)).toBeLessThan(before);
    invariant(s);
  });
});

describe('avançar até algo relevante', () => {
  it('sem critérios, para no limite de meses e devolve um resumo agrupado', () => {
    const s = mk('r8-until-limit', { startYear: 1970 });
    const res = advanceUntil(s, { ...DEFAULT_STOP, decision: false, offer: false, cash: false, crisis: false, release: false, chart: false, maxMonths: 2 });
    expect(res.stop).toBe('limit');
    expect(res.months).toBe(2);
    expect(res.digest.toWeek).toBeGreaterThan(res.digest.fromWeek);
    expect(res.digest.cats.length).toBeGreaterThan(0);
    expect(res.digest.groups.length).toBeGreaterThan(0);
    invariant(s);
  });

  it('para quando surge uma decisão nova', () => {
    const s = mk('r8-until-dec', { startYear: 1975 });
    const res = advanceUntil(s, { ...DEFAULT_STOP, offer: false, crisis: false, cash: false, chart: false, maxMonths: 12 });
    expect(['decision', 'limit']).toContain(res.stop);
    if (res.stop === 'decision') expect(s.decisions.length).toBeGreaterThan(0);
  });

  it('critério de caixa: dispara só ao cruzar o piso', () => {
    const s = mk('r8-until-cash', { startYear: 1975 });
    const base = { decisions: new Set<string>(), crises: new Set<string>(), counters: new Set<string>(), releases: s.player.stats.releases, insolvency: 0, cashBelow: false, cashNeg: false };
    const crit = { ...DEFAULT_STOP, decision: false, offer: false, crisis: false, chart: false, cashFloor: 1000 };
    expect(checkStop(s, crit, base)).toBeNull();
    post(s, 'test:drain', -(s.player.cash - money(s, 500)), 'test', 'teste');
    expect(checkStop(s, crit, base)).toBe('cash');
    expect(checkStop(s, crit, { ...base, cashBelow: true })).toBeNull();
    invariant(s);
  });
});

describe('delegação com orçamento, prioridade e registro', () => {
  it('teto de gasto por carreira corta ações pagas e a equipe explica por quê', () => {
    const s = mk('r8-deleg-cap', { startYear: 1975 });
    const id = playerActs(s)[0];
    expect(id).toBeTruthy();
    s.delegated[id] = true;
    setPolicy(s, id, { p: 'develop', cap: 1 });
    advanceMonth(s);
    advanceMonth(s);
    const slots = s.agenda[id] ?? [];
    expect(slots.every((x) => !(agendaById[x.action]?.cost ?? 0))).toBe(true);
    expect(pace8(s).spent[id] ?? 0).toBeLessThanOrEqual(money(s, 1));
    const e = pace8(s).log.filter((x) => x.a === id && x.k === 'ag').pop();
    expect(e?.y).toContain('cap:1');
    expect(e?.y).toContain('p:develop');
    const txt = describeEntry(s, e!);
    expect(txt.why.pt).toContain('prioridade');
    invariant(s);
  });

  it('prioridade turnê põe shows na agenda; descanso não lança nada', () => {
    const s = mk('r8-deleg-tour', { startYear: 1975 });
    const id = playerActs(s)[0];
    s.delegated[id] = true;
    for (const m of s.acts[id].members) { const p = s.persons[m]; if (p) { p.fatigue = 10; p.stress = 10; } }
    setPolicy(s, id, { p: 'tour' });
    advanceMonth(s);
    expect((s.agenda[id] ?? []).some((x) => x.action === 'gigs')).toBe(true);
    setPolicy(s, id, { p: 'rest' });
    const rel = s.player.stats.releases;
    advanceMonth(s);
    expect((s.agenda[id] ?? []).some((x) => x.action === 'rest')).toBe(true);
    expect(s.pendingReleases.some((p) => p.actId === id && p.week > s.week + 1)).toBe(false);
    void rel;
  });

  it('com mais carreiras que a capacidade da equipe, as de menor prioridade ficam no mínimo', () => {
    const s = mk('r8-deleg-many', { startYear: 1975 });
    const ids = playerActs(s);
    expect(teamCapacity(s)).toBeGreaterThanOrEqual(3);
    for (const id of ids) s.delegated[id] = true;
    // nível mínimo explícito
    setPolicy(s, ids[0], { tier: 2 });
    expect(policyOf(s, ids[0]).tier).toBe(2);
    advanceMonth(s);
    expect(pace8(s).log.some((e) => e.a === ids[0] && e.k === 'min')).toBe(true);
    expect((s.agenda[ids[0]] ?? []).length).toBeLessThanOrEqual(3);
    // capacidade estourada
    s.player.hq = 0;
    s.player.staff = [];
    const fake = Array.from({ length: 6 }, (_, i) => `x${i}`);
    expect(overCapacity(s).size).toBe(0 + Math.max(0, ids.filter((x) => s.delegated[x] !== false).length - teamCapacity(s)));
    void fake;
  });

  it('orçamento da equipe é compartilhado e o jogo continua determinístico', () => {
    const run = () => {
      const s = mk('r8-deleg-det', { startYear: 1980 });
      pace8(s).team = 300;
      for (const id of playerActs(s)) { s.delegated[id] = true; setPolicy(s, id, { p: 'commercial' }); }
      for (let i = 0; i < 4; i++) advanceMonth(s);
      const spent = Object.values(pace8(s).spent).reduce((a, b) => a + b, 0);
      expect(spent).toBeLessThanOrEqual(money(s, 300) + money(s, 50));
      invariant(s);
      return s.player.cash;
    };
    expect(run()).toBe(run());
  });
});

describe('sede como painel', () => {
  it('cada carreira tem estado, atenção, projeto e próxima decisão; a sede guarda o crescimento', () => {
    const s = mk('r8-hq', { startYear: 1975 });
    const id = playerActs(s)[0];
    for (let i = 0; i < 3; i++) advanceMonth(s);
    const st = actStatus(s, s.acts[id]);
    expect(['record', 'write', 'tour', 'rehearse', 'rest', 'idle', 'hiatus']).toContain(st.kind);
    expect(st.next.label.pt.length).toBeGreaterThan(0);
    for (const m of s.acts[id].members) { const p = s.persons[m]; if (p) p.fatigue = 90; }
    expect(actStatus(s, s.acts[id]).attention).toContain('tired');
    const h = hq8(s).hist;
    expect(h.length).toBeGreaterThan(0);
    s.player.hq += 1;
    advanceMonth(s);
    const h2 = hq8(s).hist;
    expect(hqChanges(h2[h2.length - 2], h2[h2.length - 1]).map((x) => x.pt).join(' ')).toContain('Sede ampliada');
  });
});
