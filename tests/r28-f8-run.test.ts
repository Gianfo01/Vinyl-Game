// r28 F8: Mestre das cadeias (c1/c2/c5), modo história (D2), decisão do trimestre + delegação (C3/I25) e sociedade
// com NPC no festival/campus/venda.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { facts17 } from '../src/sim/facts17';
import type { Act, GameState } from '../src/sim/types';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { ASSIST_EV28 } from '../src/sim/events';
import { aid28, assistTips28, setAssist28 } from '../src/sim/sys/assist28';
import { ch28, chainsMonth28, nextStep28, STALL28 } from '../src/sim/sys/chains28';
import { ux19 } from '../src/sim/sys/ux19';
import { DOC_K19 } from '../src/sim/sys/session19';
import { countNew28, delegShare28, makeDecision28, mineCap28, q28, quarterMonth28 } from '../src/sim/sys/quarter28';
import { setGoal31 } from '../src/sim/deleg31';
import { P } from '../src/sim/sys/people/state';
import { DM_MINE18 } from '../src/sim/sys/dm18';
import { festFee28, festMonth28, stakeValue28 } from '../src/sim/sys/shared28';
import { sh18, type Ven18 } from '../src/sim/sys/shared18';
import { buildings18 } from '../src/sim/sys/campus18';
import { valuation17 } from '../src/sim/sys/sale17';
import { rng19 } from '../src/sim/rng19';

const game = (seed: string, y = 1985, sc = 'established'): GameState => { const c = defaultConfig(seed, { startYear: y, scenario: sc } as Parameters<typeof defaultConfig>[1]); (c as { dbSize?: string }).dbSize = 'small'; return createGame(c); };
const myAct = (s: GameState): Act => { const a = spawnProceduralAct(s, rng19(s, 'act'), { city: s.config.homeCity, fame: 50 }); a.owner = 'player'; a.fame = 50; return a; };

describe('r28 F8 — Mestre das cadeias', () => {
  it('cadeia parada além do limite recebe ajuda pelo sistema dono; sem ajuda antes do limite; estado no save', () => {
    const s = game('r28ch');
    advanceMonth(s);
    const st = ch28(s);
    const i2 = nextStep28(s, 'c2');
    chainsMonth28(s); // registra onde está
    expect(st.seen.c2).toBe(i2);
    const n0 = st.nudges.c2 ?? 0;
    // força "tempo parado" e tenta vários meses (a ajuda tem chance mensal)
    for (let k = 0; k < 24 && (st.nudges.c2 ?? 0) === n0; k++) { st.last.c2 = s.week - STALL28 * 5; s.month = k % 12; chainsMonth28(s); }
    expect(st.nudges.c2 ?? 0).toBeGreaterThan(n0);
    expect(st.log.some((x) => x[1] === 'c2')).toBe(true);
    expect(JSON.parse(JSON.stringify(st)).log.length).toBe(st.log.length);
  });
  it('documentário da turma: multiplicador lido do estado (boost) — 1 sem boost, 8 com', () => {
    const s = game('r28ch2');
    expect(DOC_K19.f?.(s)).toBe(1);
    ch28(s).boost.c1 = 4;
    expect(DOC_K19.f?.(s)).toBe(8);
  });
  it('fio da cadeia 2 anda remix → comercial → needle drop pelo sistema real (fatos nativos)', () => {
    const s = game('r28ch3', 1990);
    const U = ux19(s);
    U.ch.c2 = [];
    const st = ch28(s);
    for (let k = 0; k < 60 && (U.ch.c2 ?? []).length < 3; k++) { st.last.c2 = s.week - STALL28 * 5; st.seen.c2 = nextStep28(s, 'c2'); s.month = k % 12; chainsMonth28(s); }
    expect((U.ch.c2 ?? []).length).toBeGreaterThanOrEqual(3);
    const ks = facts17(s).f.filter((f) => ['remix_hit', 'ad_sync', 'needle_drop'].includes(f.kind)).map((f) => f.src);
    expect(ks).toEqual(expect.arrayContaining(['remix19', 'adsync19', 'score19']));
  });
});

describe('r28 F8 — modo história (D2)', () => {
  it('pesos de eventos só mudam com o modo ligado; socorro uma vez a cada 3 anos; dicas', () => {
    const s = game('r28as', 1985, 'from_zero');
    expect(ASSIST_EV28.f!(s, true)).toEqual({ bad: 1, good: 1 });
    setAssist28(s, true);
    expect(ASSIST_EV28.f!(s, true).bad).toBeLessThan(0.5);
    s.player.cash = -100000; s.player.insolvencyMonths = 1;
    const v = aid28(s);
    expect(v).toBeGreaterThan(0);
    expect(s.player.cash).toBeGreaterThan(-100000);
    s.player.cash = -100000;
    expect(aid28(s)).toBe(0); // já usado
    s.week += 160;
    expect(aid28(s)).toBeGreaterThan(0);
    expect(assistTips28(s).length).toBeGreaterThan(0);
    setAssist28(s, false);
    expect(assistTips28(s)).toEqual([]);
  });
});

describe('r28 F8 — decisão do trimestre e delegação', () => {
  it('trimestre vazio ganha uma decisão com ações (renovação ou foco)', () => {
    const s = game('r28q');
    const a = myAct(s);
    for (const id of Object.keys(s.acts)) if (id !== a.id && s.acts[id].owner === 'player') s.acts[id].fame = 1;
    const k = makeDecision28(s);
    expect(k).toBeTruthy();
    const m = P(s).inbox.find((x) => x.ref?.k18 === 'q28');
    expect(m?.actions?.length).toBeGreaterThanOrEqual(3);
    expect(countNew28(s, 0)).toBeGreaterThanOrEqual(0);
  });
  it('delegação: objetivo de política faz o diretor decidir (sem ações) e baixa o teto de fios do Mestre', () => {
    const s = game('r28q2');
    const cap0 = mineCap28(s);
    for (const id of Object.keys(s.acts)) if (s.acts[id].owner === 'player') setGoal31(s, id, 'profit');
    expect(delegShare28(s)).toBeGreaterThan(0.3);
    expect(mineCap28(s)).toBeLessThan(cap0 + 0.5);
    expect(DM_MINE18.f?.(s)).toBe(mineCap28(s));
    const before = P(s).inbox.length;
    makeDecision28(s);
    const m = P(s).inbox.slice(before).find((x) => x.ref?.k18 === 'q28');
    expect(m).toBeTruthy();
    expect(m?.actions?.length ?? 0).toBe(0); // relatório do diretor
  });
  it('fecha o trimestre no último mês e guarda histórico', () => {
    const s = game('r28q3');
    s.month = 2;
    quarterMonth28(s);
    expect(q28(s).hist.length).toBe(1);
  });
});

describe('r28 F8 — sociedade com NPC: festival, campus e venda', () => {
  const ven = (s: GameState, kind: Ven18['kind']): Ven18 => {
    const v: Ven18 = { id: `v-${kind}`, kind, name: `Soc ${kind}`, pk: 'lb:x', pn: 'Sócio', eq: 0.5, cash: 100000, rep: 40, since: s.year, mood: 0, style: 'loyal', votes: [], prof: Array(12).fill(20000), st: 'on', dead: 0, staff: 3 };
    sh18(s).v.push(v); return v;
  };
  it('festival da sociedade: show do seu artista em julho com cachê e fato', () => {
    const s = game('r28sh');
    myAct(s);
    const v = ven(s, 'festival');
    s.month = 6;
    const cash = s.player.cash;
    expect(festMonth28(s)).toBe(1);
    expect(s.player.cash).toBeGreaterThan(cash);
    expect(facts17(s).f.some((f) => f.src === 'shared28' && f.kind === 'show')).toBe(true);
    expect(festFee28(s, v, myAct(s))).toBeGreaterThan(0);
    expect(buildings18(s).some((b) => b.id === `sh:${v.id}`)).toBe(true);
  });
  it('participação em selo/imprint entra na avaliação', () => {
    const s = game('r28sh2');
    const v0 = valuation17(s).total;
    ven(s, 'imprint');
    expect(stakeValue28(s)).toBeGreaterThan(0);
    expect(valuation17(s).total).toBeGreaterThan(v0);
  });
});
