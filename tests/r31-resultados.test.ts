// Masters 31 · onda 3 (P) — resultados por projeto e por artista (RN-07) e diário com contexto (RN-10).
// Marcas gravadas no ato, totais duráveis (não somem quando o razão corta), rateio declarado do custo comum,
// não alocado visível e o fechamento: direto + rateado + não alocado == total (e atribuído + não alocado == total).

import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { l } from '../src/data/world';
import { advanceMonth } from '../src/sim/tick';
import { playMonth } from '../src/sim/playbot16';
import type { GameState } from '../src/sim/types';
import { post, remember } from '../src/sim/util';
import { projAlias31, txn31, txnBalance, withTxn } from '../src/sim/r31/txn';
import {
  closeMonth31, diaryCtx31, journal31, projectResult31, res31, resultsReport31, results31Balance, setRule31, withDiaryCtx31,
} from '../src/sim/r31/results31';

const game = (seed = 'r31p', y = 1990): GameState => createGame(defaultConfig(`${seed}-${y}`, { startYear: y, scenario: 'established' }));
const mine = (g: GameState) => Object.values(g.acts).filter((a) => a.owner === 'player');

describe('resultados por artista e projeto', () => {
  it('marca no ato, rateia o custo comum pela receita no fechamento do mês e fecha no centavo', () => {
    const g = game('r31p1');
    const [a, b] = mine(g);
    expect(a && b).toBeTruthy();
    closeMonth31(g);
    const r0 = resultsReport31(g, 'artist');
    const A0 = r0.rows.find((x) => x.id === a.id)?.shared ?? 0;
    const B0 = r0.rows.find((x) => x.id === b.id)?.shared ?? 0;
    // mês novo de teste: só estes lançamentos no mês aberto
    res31(g).cur = { m: g.year * 12 + g.month, y: g.year, a: {}, p: {}, comA: 0, comP: 0 };
    withTxn({ artist: a.id, project: 'projA' }, () => post(g, 'p31:a', 30000, 'sales', 'teste'));
    withTxn({ artist: b.id, project: 'projB' }, () => post(g, 'p31:b', 10000, 'sales', 'teste'));
    post(g, 'p31:sal', -4001, 'salaries', 'salários da casa'); // custo comum (sem artista)
    post(g, 'p31:tax', -700, 'taxes', 'imposto'); // nunca rateado
    const open = resultsReport31(g, 'artist');
    expect(open.totals.direct + open.totals.shared + open.totals.unallocated).toBe(open.totals.total);
    closeMonth31(g);
    const rep = resultsReport31(g, 'artist');
    const A = rep.rows.find((x) => x.id === a.id)!;
    const B = rep.rows.find((x) => x.id === b.id)!;
    // 75% / 25% da receita do mês → 3001 / 1000 (resto do arredondamento vai para o maior)
    expect(A.shared - A0).toBe(-3001);
    expect(B.shared - B0).toBe(-1000);
    const t = rep.totals;
    expect(t.direct + t.shared + t.unallocated).toBe(t.total);
    expect(t.direct + t.unRev + t.unCost).toBe(t.total); // atribuído + não alocado (antes do rateio) == total
    expect(t.total).toBe(txn31(g).cls.res.total);
    const P = resultsReport31(g, 'project');
    expect(P.totals.direct + P.totals.shared + P.totals.unallocated).toBe(P.totals.total);
    expect(projectResult31(g, 'projA')!.shared).toBe(-3001);
    expect(results31Balance(g)).toEqual([]);
    expect(txnBalance(g)).toEqual([]);
  });

  it('regra declarada: igual entre quem teve movimento, ou sem rateio (vale do mês seguinte)', () => {
    const g = game('r31p2');
    const [a, b] = mine(g);
    closeMonth31(g);
    setRule31(g, 'equal');
    expect(res31(g).rule).toBe('equal');
    const s0 = resultsReport31(g, 'artist').totals.shared;
    res31(g).cur = { m: g.year * 12 + g.month, y: g.year, a: {}, p: {}, comA: 0, comP: 0 };
    withTxn({ artist: a.id }, () => post(g, 'p31e:a', 9000, 'sales', 'x'));
    withTxn({ artist: b.id }, () => post(g, 'p31e:b', -100, 'marketing', 'x'));
    post(g, 'p31e:c', -1000, 'rent', 'aluguel');
    closeMonth31(g);
    expect(resultsReport31(g, 'artist').totals.shared - s0).toBe(-1000);
    setRule31(g, 'none');
    const s1 = resultsReport31(g, 'artist').totals.shared;
    res31(g).cur = { m: g.year * 12 + g.month, y: g.year, a: {}, p: {}, comA: 0, comP: 0 };
    withTxn({ artist: a.id }, () => post(g, 'p31n:a', 9000, 'sales', 'x'));
    post(g, 'p31n:c', -1000, 'rent', 'aluguel');
    const un0 = resultsReport31(g, 'artist').totals.unallocated;
    closeMonth31(g);
    const r = resultsReport31(g, 'artist');
    expect(r.totals.shared).toBe(s1);
    expect(r.totals.unallocated).toBe(un0); // continua visível como não alocado
    expect(results31Balance(g)).toEqual([]);
  });

  it('totais duráveis: o razão corta em 400 linhas, os resultados não', () => {
    const g = game('r31p3');
    const a = mine(g)[0];
    const t0 = resultsReport31(g, 'artist').rows.find((x) => x.id === a.id)?.rev ?? 0;
    for (let i = 0; i < 450; i++) withTxn({ artist: a.id, project: 'pdur' }, () => post(g, `p31d${i}`, 100, 'sales', 'x'));
    expect(g.ledger.length).toBeLessThanOrEqual(400);
    expect(resultsReport31(g, 'artist').rows.find((x) => x.id === a.id)!.rev - t0).toBe(45000);
    expect(projectResult31(g, 'pdur')!.rev).toBe(45000);
    expect(journal31(g).length).toBeLessThanOrEqual(120);
    expect(journal31(g, { p: 'pdur' })[0]).toMatchObject({ amt: 100, a: a.id, memo: 'x' });
  });

  it('o lançamento programado vira o lançamento: as linhas se juntam', () => {
    const g = game('r31p4');
    const a = mine(g)[0];
    withTxn({ artist: a.id, project: 'prX' }, () => post(g, 'p31al:plan', -5000, 'release', 'plano'));
    withTxn({ artist: a.id, project: 'rX' }, () => post(g, 'p31al:sale', 8000, 'sales', 'venda'));
    for (const fn of projAlias31()) fn(g, 'prX', 'rX');
    expect(projectResult31(g, 'prX')).toBeUndefined();
    expect(projectResult31(g, 'rX')).toMatchObject({ rev: 8000, cost: -5000, kind: 'rel' });
    expect(results31Balance(g)).toEqual([]);
  });

  it('jogando de verdade: fecha todo mês, turnê/lançamento marcados no ato e não alocado visível', () => {
    const g = game('r31p5', 1990);
    for (let i = 0; i < 14; i++) { playMonth(g); advanceMonth(g); }
    expect(results31Balance(g)).toEqual([]);
    expect(txnBalance(g)).toEqual([]);
    const rep = resultsReport31(g, 'artist');
    expect(rep.rows.length).toBeGreaterThan(0);
    expect(Math.abs(rep.totals.direct)).toBeGreaterThan(0);
    expect(rep.totals.unallocated).not.toBe(0); // imposto, juros e o que não tem base aparecem
    expect(rep.totals.shared).toBeLessThan(0); // custo comum rateado
    // atribuído direto cobre a maior parte do movimento
    const P = resultsReport31(g, 'project');
    expect(P.rows.some((r) => r.kind === 'rel')).toBe(true);
    for (const y of Object.keys(res31(g).Y)) {
      const t = resultsReport31(g, 'artist', Number(y)).totals;
      expect(t.direct + t.shared + t.unallocated).toBe(t.total);
    }
  });

  it('explorar não muda o mundo: ler os relatórios não grava nada', () => {
    const g = game('r31p6');
    for (let i = 0; i < 2; i++) { playMonth(g); advanceMonth(g); }
    const before = JSON.stringify(g);
    resultsReport31(g, 'artist'); resultsReport31(g, 'project'); resultsReport31(g, 'artist', g.year);
    journal31(g); results31Balance(g);
    for (const m of g.memory.slice(-20)) diaryCtx31(g, m);
    expect(JSON.stringify(g)).toBe(before);
  });
});

describe('diário com contexto (RN-10)', () => {
  it('fato seu guarda caixa, fama, chance mostrada e o lançamento em jogo', () => {
    const g = game('r31p7');
    const a = mine(g)[0];
    const rel = Object.values(g.releases).find((r) => r.actId === a.id);
    const e = withTxn({ artist: a.id, release: rel?.id ?? 'rZ', project: rel?.id ?? 'rZ' }, () =>
      withDiaryCtx31({ chance: 0.42 }, () => remember(g, 'p31test', l('teste', 'test'), { actId: a.id })));
    const c = diaryCtx31(g, e)!;
    expect(c.cash).toBe(g.player.cash);
    expect(c.fame).toBe(Math.round(a.fame));
    expect(c.famous).toBe('act');
    expect(c.chance).toBe(42);
    expect(c.ref?.id).toBe(rel?.id ?? 'rZ');
    // fato do mundo (ato de outro) não guarda contexto
    const other = Object.values(g.acts).find((x) => x.owner !== 'player' && !x.playerBand)!;
    const e2 = remember(g, 'p31test', l('outro', 'other'), { actId: other.id });
    expect(diaryCtx31(g, e2)).toBeUndefined();
  });
});
