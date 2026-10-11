// Rodada 20 (G2): integridade financeira — títulos no passivo, covenant bancário separado, reserva de adiantamentos,
// AR/AP ao vivo, reconciliação, cauda do recoupment e os dois legados. Rápido: um jogo, sem simulação longa.
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { acceptCounter, acceptOffer, defaultOffer, makeOffer, resolveOne } from '../src/sim/contracts';
import { explain18 } from '../src/sim/explain18';
import { balanceSheet } from '../src/sim/finance';
import { bucket18, fin18, mIdx18 } from '../src/sim/ledger18';
import { bankDebt20, closeSnapshot20, freeCash20, obligations20, position20, recon20, reservedAdvances20 } from '../src/sim/oblig20';
import { recoupTail20, revertWeek } from '../src/sim/rights';
import { legacyCompo20 } from '../src/sim/sys/fin20';
import { cov19, debt19, m19 } from '../src/sim/sys/money19';
import { legacyTotal } from '../src/sim/legacy';
import type { Act, GameState, Offer } from '../src/sim/types';
import { post } from '../src/sim/util';
import { createGame } from '../src/sim/worldgen';
import '../src/sim/hooks';

const game = (): GameState => createGame(defaultConfig('r20g2', { startYear: 1998 }));
const freeAct = (s: GameState, skip: string[] = []): Act => Object.values(s.acts).find((x) => !x.owner && !x.playerBand && !x.catalogNo && !skip.includes(x.id))!;

describe('r20 G2 — finanças', () => {
  it('B3: emitir título aumenta caixa e passivo igualmente (patrimônio inalterado); covenant bancário não conta o título', () => {
    const s = game();
    const b0 = balanceSheet(s), bank0 = debt19(s);
    const P = 5_000_000;
    m19(s).bonds.unshift({ id: 'bd-t', amt: P, left: P, coupon: 0.08, rating: 2, rels: [], y: s.year, start: s.week, ends: s.week + 520, weak: 0, miss: 0, st: 'live' });
    post(s, 'm19:bond:bd-t', P, 'securitization', 'Título lastreado em catálogo');
    const b1 = balanceSheet(s);
    expect(b1.cash - b0.cash).toBe(P);
    expect(b1.debt - b0.debt).toBe(P);
    expect(b1.bonds).toBe(P);
    expect(b1.equity).toBe(b0.equity);
    expect(debt19(s)).toBe(bank0);
    expect(bankDebt20(s)).toBe(bank0);
    expect(cov19(s).parts.some((p) => (typeof p.label === 'string' ? p.label : p.label.pt).includes('Fora do covenant'))).toBe(true);
    // amortizar a reduz caixa e dívida em a
    const a = 1_000_000;
    post(s, 'm19:amort:bd-t:x', -a, 'securitization', 'Amortização');
    m19(s).bonds[0].left -= a;
    const b2 = balanceSheet(s);
    expect(b1.cash - b2.cash).toBe(a);
    expect(b1.debt - b2.debt).toBe(a);
    expect(b2.equity).toBe(b1.equity);
    expect(obligations20(s).some((o) => o.kind === 'bond' && !o.bank && o.liability)).toBe(true);
  });

  it('B4: oferta pendente reserva caixa; sem caixa na aceitação nada muda; repetir não debita duas vezes', () => {
    const s = game();
    const a = freeAct(s);
    s.player.cash = 2_000_000;
    const o = makeOffer(s, { ...defaultOffer(s, a), advance: 1_500_000 })!;
    expect(o).toBeTruthy();
    expect(reservedAdvances20(s)).toBe(1_500_000);
    expect(freeCash20(s)).toBe(500_000);
    // segunda oferta que só caberia sem a reserva: recusada na origem
    const b = freeAct(s, [a.id]);
    expect(makeOffer(s, { ...defaultOffer(s, b), advance: 1_000_000 })).toBeNull();
    // gasto interveniente: caixa some antes da resposta
    s.player.cash = 100_000;
    const before = { cash: s.player.cash, contracts: Object.keys(s.contracts).length, signed: s.player.stats.signed, ledger: s.ledger.length, owner: a.owner };
    o.thinkUntil = -1;
    a.fame = 0; // sem disputa de rival
    let res: string = 'thinking', hit = false;
    for (let i = 0; i < 80 && !hit; i++) {
      o.status = 'pending'; o.advance = 1_500_000; o.note = undefined;
      res = resolveOne(s, Rng.fromSeed(`b4|${i}`), o, false);
      expect(res).not.toBe('accepted');
      hit = (o.note ?? '').includes('caixa não cobre');
    }
    expect(hit).toBe(true);
    expect(s.player.cash).toBe(before.cash);
    expect(Object.keys(s.contracts).length).toBe(before.contracts);
    expect(s.player.stats.signed).toBe(before.signed);
    expect(a.owner).toBe(before.owner);
    expect(reservedAdvances20(s)).toBe(0); // recusa/caducidade libera a reserva
    // idempotência
    s.player.cash = 5_000_000;
    const o2: Offer = { ...defaultOffer(s, a), advance: 1_000_000, id: 'o-r20', week: s.week, status: 'pending' };
    expect(acceptOffer(s, a, o2)).toBe(true);
    const c1 = s.player.cash;
    expect(acceptOffer(s, a, o2)).toBe(false);
    expect(s.player.cash).toBe(c1);
    // contraproposta respeita reserva de outra oferta
    const c = freeAct(s, [a.id]);
    s.player.cash = 1_000_000;
    makeOffer(s, { ...defaultOffer(s, c), advance: 800_000 });
    const d = freeAct(s, [a.id, c.id]);
    s.offers.push({ ...defaultOffer(s, d), advance: 500_000, id: 'o-ctr', week: s.week, status: 'counter' });
    expect(acceptCounter(s, 'o-ctr')).toBe(false);
  });

  it('B8: AR/AP do balanço são ao vivo; fechamento guarda retrato datado e a reconciliação fecha', () => {
    const s = game();
    closeSnapshot20(s);
    const f = fin18(s);
    bucket18(f.ar, { due: mIdx18(s) + 2, amt: 300_000, cat: 'sales', who: 'dist' });
    bucket18(f.ap, { due: mIdx18(s) + 1, amt: -120_000, cat: 'royalties', who: 'act' });
    const b = balanceSheet(s);
    expect(b.receivables).toBe(position20(s).ar);
    expect(b.payables).toBe(position20(s).ap);
    expect(b.receivables).toBeGreaterThanOrEqual(300_000);
    post(s, 'test:in', 250_000, 'sales', 'Venda');
    post(s, 'test:fin', 400_000, 'loans', 'Empréstimo');
    s.player.cash += 7; // ajuste fora do livro
    const r = recon20(s)!;
    expect(r.open + r.op + r.inv + r.fin + r.other).toBe(s.player.cash);
    expect(r.fin).toBe(400_000);
    expect(r.other).toBe(7);
    expect(explain18(s, 'fin.recon20')).toBeTruthy();
  });

  it('B29: cenário de cauda e teto da trava de recoupment', () => {
    const s = game();
    const a = freeAct(s);
    s.player.cash = 10_000_000;
    const o: Offer = { ...defaultOffer(s, a), advance: 2_000_000, id: 'o-b29', week: s.week, status: 'pending' };
    o.rights = { ...(o.rights ?? ({} as NonNullable<Offer['rights']>)), master: 'label', reversionYears: 5, reversionNeedsRecoup: true } as NonNullable<Offer['rights']>;
    acceptOffer(s, a, o);
    const c = s.contracts[a.contractId!];
    c.rights = { ...c.rights!, master: 'label', reversionYears: 5, reversionNeedsRecoup: true };
    const tl = recoupTail20(s, c);
    expect(tl.needs).toBe(true);
    expect(tl.revertAt).toBe(Infinity); // sem vendas: nunca recupera, master fica com o selo
    c.rights.recoupCapYears = 10;
    const t2 = recoupTail20(s, c);
    expect(t2.capWeek).toBe(revertWeek(c) + 520);
    expect(t2.revertAt).toBe(t2.capWeek);
  });

  it('B21: dois legados com nomes distintos e composição que reconcilia', () => {
    const s = game();
    const c = legacyCompo20(s);
    expect(c.label.total).toBe(legacyTotal(s));
    expect(Math.abs(c.label.parts.reduce((t, p) => t + p.v, 0) - c.label.total)).toBeLessThanOrEqual(c.label.parts.length);
    const sum = (c.path.best?.v ?? 0) + (c.path.second?.w ?? 0) + c.path.pts;
    expect(Math.abs(sum - c.path.total)).toBeLessThanOrEqual(2);
    expect(explain18(s, 'legacy.label20')!.title).not.toEqual(explain18(s, 'legacy.path20')!.title);
  });
});
