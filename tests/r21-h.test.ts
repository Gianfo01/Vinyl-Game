// Revisão 21 (H) — contratos, subselos e multa de saída de ponta a ponta:
// assina ato, lança disco, roda `distribute` (marketWeek) e confere recoupment, royalty do artista e autores;
// o mesmo com o ato num subselo (caixa do subselo, não da matriz); saída por trust < 12 cobrando `exitFee`.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { acceptOffer, defaultOffer, endContract, signAct, transferAct } from '../src/sim/contracts';
import { marketWeek } from '../src/sim/market';
import { assignAct, closeSubLabel, foundSubLabel } from '../src/sim/sublabels';
import { setClauses } from '../src/sim/contracts2';
import { recoup } from '../src/sim/sys/contracts18';
import { labelRate } from '../src/sim/sys/deal360_17';
import { money, nextId, rngOf } from '../src/sim/util';
import type { Act, GameState, Offer, Release } from '../src/sim/types';

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
const mk = (seed: string) => createGame(defaultConfig(seed, { startYear: 1985 }));
const freeAct = (s: GameState, skip = 0) => Object.values(s.acts).filter((a) => !a.owner && !a.playerBand && a.status !== 'retired' && a.status !== 'split' && a.members.length)[skip];

function sign(s: GameState, act: Act, over: Partial<Offer> = {}): string {
  const o = { ...defaultOffer(s, act), ...over, id: nextId(s, 'o'), week: s.week, status: 'pending' } as Offer;
  acceptOffer(s, act, o);
  return act.contractId!;
}
function release(s: GameState, act: Act, over: Partial<Release> = {}): Release {
  const rel: Release = {
    id: nextId(s, 'r'), actId: act.id, owner: 'player', type: 'lp', title: 'Teste', songs: [], week: s.week, year: s.year, q: 70, appeal: 400,
    formats: [], stock: 0, pressed: 0, marketing: [], marketingE: 0.5, territories: [...s.player.territories], weekly: [], totalUnits: 0, revenue: 0,
    peak: 999, weeksOnChart: 0, lastPos: 0, coverSeed: 1, shortage: 0, live: true, ...over,
  };
  s.releases[rel.id] = rel;
  act.releases.push(rel.id);
  return rel;
}
const sumLedger = (s: GameState, prefix: string) => s.ledger.filter((e) => e.key.includes(prefix)).reduce((t, e) => t + e.amount, 0);
const run = (s: GameState, n: number) => { const r = rngOf(s); for (let i = 0; i < n; i++) { marketWeek(s, r); s.week += 1; } };

describe('r21 H — assinatura, disco e distribute', () => {
  it('matriz: recoupment abate antes do royalty, autores recebem, caixa fecha', () => {
    const s = mk('r21h-main');
    const act = freeAct(s);
    const id = sign(s, act, { advance: money(s, 400), royalty: 0.2 });
    const c = s.contracts[id];
    const rec0 = c.recoupBalance;
    expect(rec0).toBe(money(s, 400));
    const rel = release(s, act);
    const cash0 = act.cash;
    run(s, 8);
    expect(rel.totalUnits).toBeGreaterThan(0);
    expect(sumLedger(s, `sales:${rel.id}`)).toBeGreaterThan(0);
    // o saldo caiu (recuperado) e o que foi recuperado bate com o que não virou royalty
    expect(c.recoupBalance).toBeLessThan(rec0);
    expect(c.recouped ?? 0).toBe(rec0 - c.recoupBalance);
    if (c.recoupBalance > 0) expect(sumLedger(s, `roy:${rel.id}`)).toBe(0);
    else expect(act.cash).toBeGreaterThan(cash0);
    // autores: a parte da edição foi paga a alguém (ledger de edição ou caixa dos autores)
    expect(sumLedger(s, 'pub') + sumLedger(s, 'author') !== 0 || act.cash !== cash0).toBe(true);
    invariant(s);
  });

  it('subselo: o mesmo contrato liquida no caixa do subselo, recupera o adiantamento e paga o artista', () => {
    const s = mk('r21h-sub');
    s.player.hq = 2;
    s.player.cash += money(s, 100000);
    s.player.initialCash += money(s, 100000);
    const act = freeAct(s);
    const id = sign(s, act, { advance: money(s, 400), royalty: 0.2 });
    const c = s.contracts[id];
    const sl = foundSubLabel(s, rngOf(s), 'Sub', act.genre, money(s, 5000), 'commercial');
    expect('id' in sl).toBe(true);
    if (!('id' in sl)) return;
    expect(assignAct(s, sl.id, act.id)).toBeNull();
    const rel = release(s, act, { owner: sl.id });
    const rec0 = c.recoupBalance;
    const subCash0 = sl.cash;
    const playerCash0 = s.player.cash;
    run(s, 8);
    expect(rel.totalUnits).toBeGreaterThan(0);
    expect(c.recoupBalance).toBeLessThan(rec0); // H-1: o disco do subselo abate o recoupment
    expect(sl.cash).toBeGreaterThan(subCash0); // vendas creditadas no subselo
    expect(sl.log.some((x) => x.memo.startsWith('Vendas'))).toBe(true);
    expect(sumLedger(s, `sales:${rel.id}`)).toBe(0); // nada no caixa da matriz
    expect(s.player.cash).toBe(playerCash0 - 0 + sumLedger(s, 'pub')); // só a edição vai à matriz
    expect(act.fans.casual + act.fans.active).toBeGreaterThan(0);
    // H-2: fechar o subselo devolve o master à matriz
    expect(closeSubLabel(s, sl.id)).toBeNull();
    expect(rel.owner).toBe('player');
    invariant(s);
  });

  it('H-3: sair do selo tira o ato do roster do subselo', () => {
    const s = mk('r21h-roster');
    s.player.hq = 2;
    s.player.cash += money(s, 100000);
    s.player.initialCash += money(s, 100000);
    const act = freeAct(s);
    sign(s, act, { advance: 0 });
    const sl = foundSubLabel(s, rngOf(s), 'Sub', act.genre, money(s, 5000), 'development');
    if (!('id' in sl)) throw new Error('sub');
    assignAct(s, sl.id, act.id);
    expect(sl.roster).toContain(act.id);
    endContract(s, act, 'expired');
    expect(sl.roster).not.toContain(act.id);
    expect(act.owner).toBeNull();
    expect(s.delegated[act.id]).toBeUndefined();
    transferAct(s, act, 'player', 'signed');
    expect(act.owner).toBe('player');
  });
});

describe('r21 H — multa de saída e cláusulas', () => {
  it('H-5: saída por trust < 12 cobra a multa de saída dentro de endContract', () => {
    const s = mk('r21h-exit');
    const act = freeAct(s);
    const id = sign(s, act, { advance: money(s, 1000) });
    const c = s.contracts[id];
    c.exitFee = money(s, 2000);
    act.cash = money(s, 5000);
    act.trust = 5;
    const cash0 = s.player.cash;
    endContract(s, act, 'left');
    expect(act.owner).toBeNull();
    expect(act.cash).toBe(money(s, 3000));
    expect(s.player.cash).toBe(cash0 + money(s, 2000));
    expect(s.memory.some((m) => m.kind === 'exit_fee')).toBe(true);
    invariant(s);
  });

  it('H-4: cláusula depois da assinatura custa confiança e respeita cooldown; na assinatura não', () => {
    const s = mk('r21h-clause');
    const act = freeAct(s);
    const id = sign(s, act, { advance: 0 });
    expect(setClauses(s, act.id, { options: 2 })).toBeNull(); // mesma semana = mesa de negociação
    expect(s.contracts[id].options).toBe(2);
    s.week += 10;
    const t0 = act.trust;
    setClauses(s, act.id, { options: 3 });
    expect(act.trust).toBeLessThan(t0);
    const again = setClauses(s, act.id, { crossCollat: true });
    expect(again).not.toBeNull(); // cooldown de 26 semanas
  });

  it('H-9: recoup é o único gravador e respeita a cláusula; H-8: fatia 360 numa régua só', () => {
    const s = mk('r21h-recoup');
    const act = freeAct(s);
    const id = sign(s, act, { advance: 0 });
    const c = s.contracts[id];
    expect(recoup(s, c, 'adv', 1000)).toBe(1000);
    expect(c.recoupBalance).toBe(1000);
    expect(recoup(s, c, 'rec', 1000)).toBe(500); // contrato antigo: metade da gravação
    expect(labelRate(s, act, 'live')).toBe(0); // clássico: bilheteria é do artista
    expect(labelRate(s, act, 'merch')).toBe(0.7); // estoque bancado pelo selo
    c.model = '360'; c.share360 = 0.2;
    expect(labelRate(s, act, 'merch')).toBe(0.5);
    expect(labelRate(s, act, 'live')).toBeGreaterThan(0);
  });

  it('H-7: signAct recusa quem não é contratável e assina quem é', () => {
    const s = mk('r21h-sign');
    const act = freeAct(s);
    expect(signAct(s, act, { advance: 0 }, 'dev').ok).toBe(true);
    expect(act.owner).toBe('player');
    const other = freeAct(s);
    other.status = 'retired';
    expect(signAct(s, other, { advance: 0 }, 'dev').ok).toBe(false);
  });
});
