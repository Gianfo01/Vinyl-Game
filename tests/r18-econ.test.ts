// R18 econ18: DRE (operacional × investimento × financiamento), contas a receber, cláusulas de recuperação,
// câmbio por exposição e retornos decrescentes.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { post } from '../src/sim/util';
import { fin18, arTotal18, opProfit18 } from '../src/sim/ledger18';
import { fxExposure18, postAR18, settleMonth18 } from '../src/sim/sys/econ18';
import { addRecoup18, applyPkg18, LEGACY18, recoupable18, takeRecoup18, reason18 } from '../src/sim/sys/contracts18';
import { modAdj18 } from '../src/sim/caps18';
import { defaultOffer } from '../src/sim/contracts';
import type { Contract } from '../src/sim/types';

const mk = (seed: string, y = 1990) => createGame(defaultConfig(seed, { startYear: y }));

function contract(s: ReturnType<typeof mk>, clauses?: Contract['clauses18']): Contract {
  const act = Object.values(s.acts).find((a) => !a.owner && !a.playerBand)!;
  const c: Contract = { id: 'k18', actId: act.id, party: 'player', model: 'classic', advance: 1000, royalty: 0.15, termMonths: 36, startWeek: s.week, endWeek: s.week + 156, releasesOwed: 3, releasesDone: 0, creativeControl: false, publishing: false, share360: 0, recoupBalance: 1000, promises: [], clauses18: clauses };
  s.contracts[c.id] = c;
  act.owner = 'player'; act.contractId = c.id; act.trust = 80;
  return c;
}

describe('r18 econ: livro contábil', () => {
  it('aporte, empréstimo e IPO entram no caixa mas não são receita nem lucro', () => {
    const s = mk('r18e-1');
    const rev = s.player.revenueByYear[s.year] ?? 0, prof = s.player.profitByYear[s.year] ?? 0, cash = s.player.cash;
    post(s, 't:inv', 500000, 'investment', 'Aporte');
    post(s, 't:loan', 300000, 'financing', 'Empréstimo');
    post(s, 't:ipo', 900000, 'financing', 'IPO');
    expect(s.player.cash).toBe(cash + 1700000);
    expect(s.player.revenueByYear[s.year] ?? 0).toBe(rev);
    expect(s.player.profitByYear[s.year] ?? 0).toBe(prof);
    expect(fin18(s).y[s.year]['cf:fin']).toBeGreaterThanOrEqual(1700000);
    // receita operacional de verdade entra
    post(s, 't:show', 10000, 'live', 'Show');
    expect(s.player.revenueByYear[s.year]).toBe(rev + 10000);
    expect(opProfit18(fin18(s).y[s.year])).toBe(prof + 10000);
  });

  it('venda de catálogo e compra de casa são investimento (não lucro)', () => {
    const s = mk('r18e-2');
    const prof = s.player.profitByYear[s.year] ?? 0;
    post(s, 't:cat', 250000, 'asset_sales', 'Master vendido');
    post(s, 'v17buy:x', -400000, 'investments', 'Compra: casa');
    post(s, 'eq:mixer', -50000, 'equipment', 'Mesa de som');
    expect(s.player.profitByYear[s.year] ?? 0).toBe(prof);
    expect(fin18(s).y[s.year]['inv:x']).toBe(250000 - 400000 - 50000);
    expect(fin18(s).y[s.year]['cf:inv']).toBe(-200000);
  });

  it('receita a prazo: reconhecida agora, caixa só no vencimento', () => {
    const s = mk('r18e-3');
    const cash = s.player.cash, rev = s.player.revenueByYear[s.year] ?? 0;
    const due = s.year * 12 + s.month + 3;
    postAR18(s, 't:pub', 80000, 'publishing', 'Edição', 'pro', due);
    expect(s.player.cash).toBe(cash);
    expect(s.player.revenueByYear[s.year]).toBe(rev + 80000);
    expect(arTotal18(s)).toBe(80000);
    fin18(s).auto = false;
    settleMonth18(s);
    expect(s.player.cash).toBe(cash);
    s.month += 3;
    settleMonth18(s);
    expect(s.player.cash).toBe(cash + 80000);
    expect(arTotal18(s)).toBe(0);
    expect(s.player.revenueByYear[s.year]).toBe(rev + 80000); // não conta duas vezes
  });

  it('câmbio depende da exposição real (sem títulos/vendas no país, sem perda)', () => {
    const s = mk('r18e-4', 1988);
    expect(fxExposure18(s, 'na').reduce((t, e) => t + e.loss, 0)).toBe(0);
    postAR18(s, 't:br', 1000000, 'sales', 'Vendas BR', 'dist', s.year * 12 + s.month + 4, 'br');
    const ex = fxExposure18(s, 'na');
    expect(ex.find((e) => e.mk === 'br')!.loss).toBeGreaterThan(0);
  });
});

describe('r18 econ: cláusulas de recuperação', () => {
  it('fração da gravação conforme a cláusula (0 / 50% legado / 100%)', () => {
    const s = mk('r18e-5');
    const c0 = contract(s, { ...LEGACY18, rec: 0, pkg: 'x' });
    expect(addRecoup18(s, c0, 'rec', 10000)).toBe(0);
    c0.clauses18 = undefined; // contrato antigo
    expect(addRecoup18(s, c0, 'rec', 10000)).toBe(5000);
    c0.clauses18 = { ...LEGACY18, rec: 1, video: true, pkg: 'x' };
    expect(addRecoup18(s, c0, 'rec', 10000)).toBe(10000);
    expect(addRecoup18(s, c0, 'video', 4000)).toBe(4000);
    c0.clauses18.video = false;
    expect(addRecoup18(s, c0, 'video', 4000)).toBe(0);
  });

  it('por projeto: o disco novo não paga a dívida do anterior; cruzado paga', () => {
    const s = mk('r18e-6');
    const c = contract(s, { ...LEGACY18, rec: 1, cross: false, pkg: 'x' });
    c.recoupBalance = 1000; // adiantamento
    addRecoup18(s, c, 'rec', 20000); // projeto 0
    c.releasesDone = 1;
    expect(recoupable18(c, 'relA')).toBe(21000); // disco do projeto 0
    takeRecoup18(c, 'relA', 0);
    addRecoup18(s, c, 'rec', 5000); // projeto 1
    c.releasesDone = 2;
    expect(recoupable18(c, 'relB')).toBe(1000 + 5000);
    c.clauses18!.cross = true;
    expect(recoupable18(c, 'relB')).toBe(c.recoupBalance);
  });

  it('o artista lê as cláusulas (pacote pró-artista pesa a favor do pacote major)', () => {
    const s = mk('r18e-7');
    const act = Object.values(s.acts).find((a) => !a.owner && !a.playerBand)!;
    const o = defaultOffer(s, act);
    o.rights = undefined;
    applyPkg18(o, 'major');
    const major = reason18(s, act, o).reduce((t, x) => t + x.d, 0);
    applyPkg18(o, 'artist');
    const fair = reason18(s, act, o).reduce((t, x) => t + x.d, 0);
    expect(fair).toBeGreaterThan(major);
    expect(reason18(s, act, o).length).toBeGreaterThan(3);
  });
});

describe('r18 retornos decrescentes', () => {
  it('bônus pequeno quase intacto, pilha grande encosta no teto', () => {
    expect(modAdj18('appeal', 1.05)).toBe(1);
    expect(modAdj18('appeal', 1.25)).toBe(1); // até o joelho (+30%) passa inteiro
    const big = 2.5 * modAdj18('appeal', 2.5);
    expect(big).toBeLessThan(1.91);
    expect(big).toBeGreaterThan(1.8);
    expect(modAdj18('pressingCost', 2)).toBeGreaterThan(1); // custo: redução limitada
  });
});
