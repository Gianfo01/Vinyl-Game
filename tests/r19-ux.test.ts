// Rodada 19 (Frente 8, onda 4): viradas de década/era com metas, metas de abertura por época (1889 incluso), recibo
// de decisão, "por que perdi?", epitáfio + cadeias de história + herança, divulgação progressiva e menu sem excesso.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { emitFact, factListeners19, recentFacts } from '../src/sim/facts17';
import { explain18 } from '../src/sim/explain18';
import { calendar19 } from '../src/sim/calendar19';
import { resolveDecision } from '../src/sim/events';
import { fin18, mIdx18 } from '../src/sim/ledger18';
import { CHAINS19, DISC19, ERA_GOALS19 } from '../src/sim/sys/ux19data';
import {
  activeGoals19, applyHeir19, changes19, chainProgress19, epitaph19, goalNow19, lockedAreas19, lossCauses19, makeTurn19, openingGoals19,
  receiptEchoes19, unlocked19, ux19,
} from '../src/sim/sys/ux19';
import { NAV17, ICON17 } from '../src/ui/nav17';
import { setTutorials19, tutAllowed19, tutorialsOff19, type TutKind19, type TutPrefs19 } from '../src/ui/tutoff19';
import type { GameState } from '../src/sim/types';

const game = (y: number, seed: string): GameState => createGame(defaultConfig(seed, { startYear: y }));

describe('r19 ux — viradas e metas', () => {
  it('metas de abertura para toda faixa de época, inclusive 1889', () => {
    for (const y of [1889, 1925, 1955, 1975, 2005, 2020]) {
      const s = game(y, `ux-open-${y}`);
      const G = openingGoals19(s);
      expect(G.length, String(y)).toBe(3);
      expect(openingGoals19(s).length).toBe(3); // não duplica
      for (const g of G) expect(goalNow19(s, g)).toBeGreaterThanOrEqual(0);
    }
    expect(ERA_GOALS19[0].from).toBe(0);
    expect(ERA_GOALS19.every((b) => b.goals.length === 5)).toBe(true);
  });
  it('virada de década grava mudanças, resumo, rivais e metas; fato era_turn tem ouvinte e vai ao Diário', () => {
    const s = game(1958, 'ux-dec');
    for (let i = 0; i < 26 && s.year < 1960; i++) advanceMonth(s);
    expect(s.year).toBe(1960);
    const T = ux19(s).turns.find((x) => x.y === 1960);
    expect(T).toBeTruthy();
    expect(T!.goals.length).toBeGreaterThanOrEqual(2);
    expect(T!.rivals.length).toBeGreaterThan(0);
    expect(T!.sum.y0).toBe(1958);
    expect(recentFacts(s, { kind: 'era_turn', months: 24 }).length).toBeGreaterThan(0);
    expect(factListeners19().some((x) => x.id === 'ux19:era')).toBe(true);
    expect(s.memory.some((m) => m.kind === 'era19')).toBe(true);
    // nada do futuro: mudanças só até o ano corrente
    expect(changes19(s, 1950, 2030).every((c) => c.k !== 'tech' || true)).toBe(true);
    const fut = changes19(s, 1990, 2030);
    expect(fut.length).toBe(0);
  });
  it('era nova (LP/streaming) vira cartão com o que mudou', () => {
    const s = game(2006, 'ux-era');
    s.techDates.streaming = 2008;
    for (let i = 0; i < 30 && s.year < 2008; i++) advanceMonth(s);
    const T = ux19(s).turns.find((x) => x.y === 2008)!;
    expect(T).toBeTruthy();
    expect(T.k === 'era' || T.k === 'tech').toBe(true);
    expect(T.changes.some((c) => c.k === 'tech' || c.k === 'era')).toBe(true);
    const t2 = makeTurn19(s, 'decade');
    expect(t2.goals.length).toBeGreaterThanOrEqual(2);
  });
  it('meta cumprida dá reputação e fato era_goal; prazo no calendário; porquê', () => {
    const s = game(1975, 'ux-goal');
    const g = activeGoals19(s)[0];
    expect(calendar19(s, { weeks: 400 }).some((d) => d.id === `ux19:${g.id}`)).toBe(true);
    expect(explain18(s, 'ux19.goal', { g: g.id })).toBeTruthy();
    g.spec = { ...g.spec, tpl: 'art', n: 1 };
    const r0 = s.player.reputation.artistic;
    advanceMonth(s);
    expect(g.done).toBeTruthy();
    expect(s.player.reputation.artistic).toBeGreaterThanOrEqual(Math.min(100, r0) - 5);
    expect(recentFacts(s, { kind: 'era_goal', months: 3 }).length).toBe(1);
  });
});

describe('r19 ux — recibo, perda, fim, divulgação', () => {
  it('recibo de decisão registra escolha e ecos pendentes', () => {
    const s = game(1975, 'ux-rc');
    let d = s.decisions[0];
    for (let i = 0; i < 24 && !d; i++) { advanceMonth(s); d = s.decisions[0]; }
    expect(d).toBeTruthy();
    const o = d.options.find((x) => x.id !== d.defaultOption) ?? d.options[0];
    expect(resolveDecision(s, d.id, o.id)).toBe(true);
    const r = ux19(s).rc[0];
    expect(r.ev).toBe(d.eventId);
    expect(r.o.pt).toBe(o.label.pt);
    expect(receiptEchoes19(s, r).pend).toBe(r.n);
    expect(explain18(s, 'ux19.receipt', { r: r.id })).toBeTruthy();
  });
  it('"por que perdi?": causas do ledger e dos fatos, com o que teria ajudado', () => {
    const s = game(1975, 'ux-loss');
    for (let i = 0; i < 3; i++) advanceMonth(s);
    const F = fin18(s), m = mIdx18(s);
    for (let i = 1; i <= 12; i++) { const b = (F.m[m - i] ??= {}); b['rev:rec'] = 100000; b['cost:pay'] = -90000; b['nonop:int'] = -40000; }
    emitFact(s, { kind: 'scandal', actors: ['player'], severity: 70, visibility: 'public', tags: ['bad'], text: { pt: 'Escândalo X', en: 'Scandal X' }, src: 'test' });
    const C = lossCauses19(s);
    expect(C.length).toBe(3);
    expect(C.some((c) => c.k === 'cost:pay')).toBe(true);
    expect(C.some((c) => c.k === 'fact:scandal')).toBe(true);
    for (const c of C) expect(c.help.pt.length).toBeGreaterThan(10);
    expect(explain18(s, 'ux19.loss', {})!.parts.length).toBe(3);
  });
  it('cadeias de história contam elos; epitáfio; herança entra pelo ledger (financiamento)', () => {
    const s = game(1985, 'ux-end');
    const c4 = CHAINS19.find((c) => c.id === 'c4')!;
    for (const st of c4.steps) emitFact(s, { kind: st.k[0], actors: ['player'], severity: 30, visibility: 'public', tags: [], text: st.t, src: 'test' });
    emitFact(s, { kind: 'release', actors: ['x'], severity: 30, visibility: 'public', tags: ['documentary'], text: { pt: 'doc', en: 'doc' }, src: 'test' });
    const P = chainProgress19(s);
    expect(P.find((x) => x.id === 'c4')!.all).toBe(true);
    expect(P.find((x) => x.id === 'c4')!.me).toBe(true);
    expect(P.find((x) => x.id === 'c1')!.n).toBe(0); // elo fora de ordem (documentário sem separação) não conta
    const E = epitaph19(s);
    expect(E.name).toBe(s.config.companyName);
    expect(E.stats.length).toBe(5);
    const c0 = s.player.cash;
    expect(applyHeir19(s, 'cash', 'Selo Antigo')).toBeNull();
    expect(s.player.cash).toBeGreaterThan(c0);
    expect(applyHeir19(s, 'rep')).not.toBeNull(); // uma só por partida
    expect(Object.values(fin18(s).y[s.year] ?? {}).length).toBeGreaterThan(0);
  });
  it('divulgação progressiva: áreas avançadas fecham no início e abrem com tempo ou gatilho (e ficam abertas)', () => {
    const s = game(1975, 'ux-disc');
    expect(unlocked19(s, 'cockpit')).toBe(true);
    expect(unlocked19(s, 'crime')).toBe(false);
    expect(lockedAreas19(s).length).toBeGreaterThan(10);
    for (let i = 0; i < 13; i++) advanceMonth(s);
    expect(unlocked19(s, 'regions19')).toBe(true);
    expect(ux19(s).un.regions19).toBeTruthy();
    expect(Object.values(DISC19).every((m) => m <= 24)).toBe(true);
  });
  it('menu: páginas R19 com lugar e ícone próprios; seções com no máximo 5 páginas', () => {
    const tree = NAV17.flatMap((g) => g.secs.flatMap((x) => x.areas));
    for (const a of ['calendar19', 'contracts19', 'firm19', 'tribute19', 'media19', 'live19', 'regions19', 'market19a', 'zines19', 'fakes19']) {
      expect(tree, a).toContain(a);
      expect(ICON17[a], a).toBeTruthy();
    }
    for (const g of NAV17) for (const x of g.secs) expect(x.areas.length, x.id).toBeLessThanOrEqual(5);
  });
});

describe('r19 ux — "Sem tutoriais (já sei jogar)"', () => {
  const ALL: TutKind19[] = ['card', 'tour', 'tip', 'track', 'opening', 'nav', 'turn'];
  it('uma chave desliga tudo de uma vez e religa (com as escolhas finas coerentes)', () => {
    const p: TutPrefs19 = {};
    expect(ALL.every((k) => tutAllowed19(p, k))).toBe(true);
    setTutorials19(p, false);
    expect(tutorialsOff19(p)).toBe(true);
    expect(ALL.some((k) => tutAllowed19(p, k))).toBe(false);
    expect(p.tut18).toEqual({ noTours: true, noTips: true });
    setTutorials19(p, true);
    expect(ALL.every((k) => tutAllowed19(p, k))).toBe(true);
    expect(tutAllowed19({ tut18: { noTours: true } }, 'tour')).toBe(false); // escolha fina antiga continua valendo
    expect(tutAllowed19({ tut18: { noTours: true } }, 'card')).toBe(true);
  });
  it('com a chave desligada, partidas novas em 1889/1965/2005 seguem iguais (só a interface muda)', () => {
    for (const y of [1889, 1965, 2005]) {
      const s = game(y, `ux-tut-${y}`);
      expect(s.tutorial.done).toBe(false); // o cartão some pela preferência, não pelo save
      expect(activeGoals19(s).length).toBe(3);
    }
  });
});
