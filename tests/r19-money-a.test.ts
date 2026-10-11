// Rodada 19 (onda 3, T1 money-a): juros por época × múltiplos, covenants e banco, leilão de masters, preferência e
// "Versão do artista", títulos lastreados em catálogo. Cada fato novo tem ouvinte com efeito.
import { describe, expect, it } from 'vitest';
import { l } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { conseq18 } from '../src/sim/decide18';
import { INSOLVENT_AT, loanOffer, takeLoan } from '../src/sim/economy';
import { explain18 } from '../src/sim/explain18';
import { MONEY19A } from '../src/sim/factmatrix19';
import { factListeners19, recentFacts } from '../src/sim/facts17';
import { fin18, mIdx18 } from '../src/sim/ledger18';
import { rate19, realRate19, rateTilt19 } from '../src/sim/rates19';
import { STREAMS19 } from '../src/sim/rng19';
import { closeLabel } from '../src/sim/rivals';
import { _test19, answerCall19, bidAuc19, bondTerms19, fanCampaign19, issueBond19, liveBond19, m19, setRofr19 } from '../src/sim/sys/money19';
import { P } from '../src/sim/sys/people/state';
import { r18 } from '../src/sim/sys/rights18';
import { SALE19, eraMultiple } from '../src/sim/sys/sale17';
import type { GameState, Release, Song } from '../src/sim/types';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';

const game = (y = 1990, over = {}) => createGame(defaultConfig('m19a', { startYear: y, ...over }));
const myAct = (s: GameState, fame = 40) => { const a = spawnProceduralAct(s, rngOf(s), { city: s.config.homeCity, fame }); a.owner = 'player'; a.fame = fame; return a; };
let n = 0;
const rel = (s: GameState, actId: string, o: Partial<Release> = {}): Release => {
  const r = { id: `rm${++n}`, actId, owner: 'player', type: 'lp', title: `Disco ${n}`, songs: [], week: s.week - 400, year: s.year - 6, q: 0.6, appeal: 0.5, formats: [], stock: 0, pressed: 0, marketing: [], marketingE: 0, territories: [], weekly: [], totalUnits: 50000, revenue: 40_000_000, peak: 3, weeksOnChart: 10, lastPos: 0, coverSeed: 1, shortage: 0, live: false, ...o } as Release;
  s.releases[r.id] = r;
  return r;
};
const msgs = (s: GameState, k: string) => P(s).inbox.filter((m) => m.ref?.k18 === k);

describe('registro', () => {
  it('todo fato novo tem ouvinte money19; fluxo próprio; porquês e ecos', () => {
    const ls = factListeners19();
    for (const k of Object.keys(MONEY19A)) expect(ls.some((x) => x.kind === k && x.id.startsWith('money19')), k).toBe(true);
    expect(STREAMS19.money19).toBeTruthy();
    for (const k of ['pay', 'pledge', 'sell', 'accept']) expect(conseq18(`ib:m19_call:${k}`)?.later?.length, k).toBeGreaterThan(0);
    const s = game(2021, { history: 'strict' });
    for (const k of ['m19.rate', 'm19.cov', 'm19.rating']) expect(explain18(s, k, {}), k).toBeTruthy();
  });
});

describe('M13 juros por época', () => {
  it('trajetória real: 1981 alto, 2009–2021 quase zero; múltiplo de masters 2021 entre 15 e 20', () => {
    expect(realRate19(1981)).toBeGreaterThan(15);
    expect(realRate19(2015)).toBeLessThan(1);
    const s = game(2021, { history: 'strict' });
    const m = eraMultiple(s).m;
    expect(m).toBeGreaterThanOrEqual(15);
    expect(m).toBeLessThanOrEqual(20);
    expect(rateTilt19(s, 1981)).toBeLessThan(rateTilt19(s, 1986));
  });
  it('crédito mais caro em 1981 que em 2015; deriva só fora do modo exato', () => {
    const a = game(1981, { history: 'strict' }), b = game(2015, { history: 'strict' });
    expect(loanOffer(a)!.rate).toBeGreaterThan(loanOffer(b)!.rate);
    const free = game(1990, { history: 'free' });
    let diff = 0;
    for (let y = 1991; y < 2020; y++) diff += Math.abs(rate19(free, y) - realRate19(y));
    expect(diff).toBeGreaterThan(0);
    const ex = game(1990, { history: 'strict' });
    expect(rate19(ex, 2005)).toBe(realRate19(2005));
  });
});

describe('J3 covenants e o banco', () => {
  it('3 trimestres no prejuízo → banco chama a dívida (carta + fato + elenco desconfia); aceleração; quebra de novo no vermelho → pedido de falência e leilão do empenho', () => {
    const s = game(1990);
    const a = myAct(s);
    a.trust = 60;
    expect(takeLoan(s)).toBe(true);
    s.year += 3; s.player.loans[0].startWeek -= 60; // carência: selo 2 anos+, empréstimo 1 ano+
    const st = m19(s);
    st.q = [-1, -1];
    const F = fin18(s);
    F.m[mIdx18(s)] = { 'cost:salaries': -5_000_000 };
    _test19.covenantQuarter(s);
    expect(st.call?.st).toBe('open');
    expect(msgs(s, 'm19_call').length).toBe(1);
    expect(recentFacts(s, { kind: 'debt_called' }).length).toBe(1);
    expect(a.trust).toBeLessThan(60);
    expect(loanOffer(s)).toBeNull(); // banco fechado
    // empenhar masters
    const r1 = rel(s, a.id), r2 = rel(s, a.id);
    const rate0 = s.player.loans[0].rate;
    answerCall19(s, 'pledge');
    expect(st.call?.st).toBe('pledge');
    expect(st.lien.length).toBeGreaterThan(0);
    expect(s.player.loans[0].rate).toBeGreaterThan(rate0);
    // de novo, no vermelho
    s.week += 20;
    s.player.cash = -100;
    st.q.push(-1);
    _test19.covenantQuarter(s);
    expect(st.call?.st).toBe('petition');
    expect(s.player.insolvencyMonths).toBeGreaterThanOrEqual(INSOLVENT_AT - 1);
    const au = st.auc.find((x) => x.cause === 'bank');
    expect(au?.rels.some((id) => id === r1.id || id === r2.id)).toBe(true);
    expect(s.releases[r1.id].owner).not.toBe('player');
  });
  it('aceleração sobe a prestação', () => {
    const s = game(1990);
    myAct(s);
    takeLoan(s);
    const st = m19(s);
    st.q = [-1, -1, -1];
    fin18(s).m[mIdx18(s)] = { 'cost:salaries': -5_000_000 };
    _test19.callDebt(s, [l('teste', 'test')]);
    const m0 = s.player.loans[0].monthly;
    answerCall19(s, 'accept');
    expect(s.player.loans[0].monthly).toBeGreaterThan(m0);
  });
});

describe('N1 falência de selo e leilão de masters', () => {
  it('rival quebra → fato → leilão com carta; lance do jogador vence e os masters mudam de dono', () => {
    const s = game(1985);
    const lb = Object.values(s.labels).find((x) => x.active && x.family !== 'A')!;
    const act = spawnProceduralAct(s, rngOf(s), { city: s.config.homeCity, fame: 20 });
    act.owner = lb.id;
    const rs = [rel(s, act.id, { owner: lb.id }), rel(s, act.id, { owner: lb.id })];
    for (const x of Object.values(s.labels)) x.cash = Math.min(x.cash, 0); // ninguém mais tem caixa
    closeLabel(s, rngOf(s), lb);
    expect(recentFacts(s, { kind: 'label_bankrupt' }).length).toBe(1);
    const au = m19(s).auc.find((x) => x.from === lb.id)!;
    expect(au.st).toBe('open');
    expect(msgs(s, 'm19_auc').length).toBe(1);
    s.player.cash = au.fair * 3;
    expect(bidAuc19(s, au.id, Math.round(au.ask * 1.2))).toBeNull();
    au.ends = s.week;
    _test19.closeAuction(s, au);
    expect(au.win).toBe('player');
    for (const r of rs) expect(s.releases[r.id].owner).toBe('player');
    expect(recentFacts(s, { kind: 'master_auction' }).length).toBe(1);
  });
});

describe('N5 preferência e "Versão do artista"', () => {
  it('preferência: o artista cobre a venda do master (fato + confiança)', () => {
    const s = game(2019);
    const a = myAct(s);
    const r = rel(s, a.id);
    expect(setRofr19(s, a.id, true)).toBeNull();
    const t0 = a.trust;
    expect(SALE19.rofr!(s, r, 1000)).toBe(true);
    expect(recentFacts(s, { kind: 'rofr_used' }).length).toBe(1);
    expect(a.trust).toBeGreaterThan(t0);
  });
  it('regravação + campanha dos fãs: master antigo de outro selo perde demanda pela parcela dos fãs', () => {
    const s = game(2019);
    const a = myAct(s, 60);
    const lb = Object.values(s.labels).find((x) => x.active)!;
    const old = rel(s, a.id, { owner: lb.id });
    const so = { id: 'so_old', title: 'Velha', actId: a.id, releaseId: old.id } as unknown as Song;
    const nv = { id: 'so_new', title: 'Velha (Versão do artista)', actId: a.id, coverOf: 'so_old', releaseId: rel(s, a.id, { year: s.year }).id } as unknown as Song;
    s.songs[so.id] = so; s.songs[nv.id] = nv;
    expect(fanCampaign19(s, a.id)).toBeNull();
    expect(recentFacts(s, { kind: 'rerecord_vow' }).length).toBe(1);
    s.week += 5;
    _test19.vowsMonth(s);
    expect(r18(s).rr[old.id]).toBeLessThan(0.8);
  });
});

describe('N6 títulos lastreados (Bowie Bonds)', () => {
  it('emite com rating e cupom = juro + spread; Napster rebaixa; inadimplência executa o lastro', () => {
    const s = game(1998, { history: 'strict' });
    const acts = [myAct(s), myAct(s), myAct(s)];
    for (const a of acts) { rel(s, a.id, { year: 1985 }); rel(s, a.id, { year: 1988 }); }
    const t = bondTerms19(s, 10);
    expect(t.ok).toBeNull();
    expect(t.coupon * 100).toBeGreaterThan(realRate19(1998));
    const cash0 = s.player.cash;
    expect(issueBond19(s, 10)).toBeNull();
    expect(s.player.cash).toBeGreaterThan(cash0);
    expect(recentFacts(s, { kind: 'bond_issued' }).length).toBe(1);
    const b = liveBond19(s)!;
    const r0 = b.rating;
    s.year = 2000; s.month = 0;
    _test19.bondsMonth(s);
    expect(b.rating).toBe(r0 + 1);
    expect(recentFacts(s, { kind: 'bond_rating' }).length).toBe(1);
    b.miss = 1; s.player.cash = -10; s.month = 1;
    _test19.bondsMonth(s);
    expect(b.st).toBe('default');
    expect(recentFacts(s, { kind: 'bond_default' }).length).toBe(1);
    expect(m19(s).auc.some((x) => x.cause === 'bond')).toBe(true);
  });
});
