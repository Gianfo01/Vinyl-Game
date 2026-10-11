// Rodada 19 (T2 money-b): mercado de contratos (janelas, lances, override, cláusulas, empréstimos), empresário total,
// disco de cumprimento de contrato e briga de gestão (Klein).
import { describe, expect, it } from 'vitest';
import type { Rng } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { ownConseq18 } from '../src/sim/decide18';
import { applyMods } from '../src/sim/ext4';
import { recentFacts } from '../src/sim/facts17';
import '../src/sim/sys';
import { feudOf18 } from '../src/sim/sys/feud18';
import { _mb19, borrow19, deliverJunk19, lend19, loansOn19, mb19, recall19, sellContract19, setClause19, value19, vote19, window19, windows19 } from '../src/sim/sys/moneyb19';
import { answerMsg } from '../src/sim/sys/people/inbox';
import { P } from '../src/sim/sys/people/state';
import { press } from '../src/sim/sys/press9';
import { heatOf } from '../src/sim/util';
import type { Act, GameState, Label } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';
import { cityDemand } from '../src/sim/tours';

const yes = { chance: () => true, next: () => 0.1, int: (a: number) => a, pick: <T>(x: T[]) => x[0], normal: () => 0 } as unknown as Rng;
const game = (over: Parameters<typeof defaultConfig>[1] = {}) => {
  const s = createGame(defaultConfig('r19-mb', { startYear: 1966, ...over }));
  s.player.cash += 50_000_000;
  return s;
};
/** ato do selo com contrato próprio */
function myAct(s: GameState, fame = 50, members = 4): Act {
  const a = Object.values(s.acts).find((x) => !x.owner && x.members.length >= members && x.status !== 'retired' && x.status !== 'split')!;
  const id = `kmb${a.id}`;
  s.contracts[id] = { id, actId: a.id, party: 'player', model: 'classic', advance: 0, royalty: 0.15, termMonths: 48, startWeek: s.week, endWeek: s.week + 208, releasesOwed: 4, releasesDone: 0, creativeControl: false, publishing: false, share360: 0, recoupBalance: 0, promises: [] };
  a.contractId = id; a.owner = 'player'; a.fame = fame; a.trust = 60;
  return a;
}
const richLabel = (s: GameState): Label => { const lb = Object.values(s.labels).find((x) => x.active)!; lb.cash = 1e12; lb.aggression = 90; return lb; };
const msg = (s: GameState, k: string) => P(s).inbox.filter((m) => m.ref?.k18 === k && !m.resolved).pop()!;

describe('r19 money-b — janelas e valor de mercado (M1/M2)', () => {
  it('janelas em janeiro e julho–agosto; valor sobe com a fama', () => {
    const s = game();
    s.month = 0; expect(window19(s)).toBe(true);
    s.month = 3; expect(window19(s)).toBe(false);
    s.month = 7; expect(window19(s)).toBe(true);
    s.month = 3;
    expect(windows19(s, 2).every((w) => w.close >= w.open)).toBe(true);
    const a = myAct(s, 30), v30 = value19(s, a).v;
    a.fame = 70;
    expect(value19(s, a).v).toBeGreaterThan(v30 * 3);
  });
});

describe('r19 money-b — N2 vender o contrato (Sun → RCA)', () => {
  it('lance no aperto de caixa → vender com override paga % das vendas no rival; estrela que explode vira arrependimento', () => {
    const s = game();
    const a = myAct(s, 55), lb = richLabel(s);
    s.month = 3; s.player.cash = -1000; s.player.insolvencyMonths = 1;
    _mb19.bids(s, yes);
    const m = msg(s, 'mb19_bid');
    expect(m).toBeTruthy();
    s.player.cash = 1_000_000;
    answerMsg(s, m.id, 'override');
    expect(a.owner).not.toBe('player');
    const sold = mb19(s).sold.find((x) => x.act === a.id)!;
    expect(sold.pct).toBe(0.05);
    expect(recentFacts(s, { kind: 'contract_sold' }).length).toBe(1);
    // vendas no novo selo → override
    const rel = { id: 'rmb1', actId: a.id, owner: a.owner, title: 'X', songs: [], week: s.week + 1, revenue: 0, peak: 0, weekly: [], totalUnits: 0 } as unknown as GameState['releases'][string];
    s.releases[rel.id] = rel; a.releases.push(rel.id);
    _mb19.overrides(s);
    rel.revenue = 1_000_000;
    const c0 = s.player.cash;
    _mb19.overrides(s);
    expect(s.player.cash - c0).toBe(50_000);
    a.fame = 80;
    _mb19.overrides(s);
    expect(recentFacts(s, { kind: 'sale_regret' }).length).toBe(1);
    void lb;
  });
  it('vender esquenta pouco, mas o elenco perde confiança', () => {
    const s = game();
    const a = myAct(s, 50), b = myAct(s, 20), lb = richLabel(s);
    const t0 = b.trust;
    expect(sellContract19(s, a.id, lb.id, 100000)).toBeNull();
    expect(b.trust).toBeLessThan(t0);
  });
});

describe('r19 money-b — M2 cláusula de saída', () => {
  it('cláusula barata: rival rico paga na janela e leva o astro (calor sobe)', () => {
    const s = game();
    const a = myAct(s, 50), lb = richLabel(s);
    for (const x of Object.values(s.labels)) if (x !== lb) x.cash = 0;
    expect(setClause19(s, a.id, 'cheap')).toBeNull();
    const fee = s.contracts[a.contractId!].exitFee!;
    expect(fee).toBeLessThan(value19(s, a).v);
    const h0 = heatOf(s, lb.id), c0 = s.player.cash;
    s.month = 6;
    _mb19.clausePaid(s, yes);
    expect(a.owner).toBe(lb.id);
    expect(s.player.cash - c0).toBe(fee);
    expect(heatOf(s, lb.id)).toBeGreaterThan(h0);
    expect(recentFacts(s, { kind: 'release_clause' }).length).toBe(1);
  });
});

describe('r19 money-b — M1 empréstimos', () => {
  it('emprestar um ato: vai ao rival e volta no fim (com bônus se cresceu); pegar emprestado e chamar de volta', () => {
    const s = game();
    const a = myAct(s, 40), lb = richLabel(s);
    s.month = 3;
    expect(lend19(s, a.id, 'record')).not.toBeNull(); // fora da janela
    s.month = 0;
    expect(lend19(s, a.id, 'record')).toBeNull();
    expect(a.owner).toBe(lb.id);
    a.fame += 10; a.trust = 60;
    s.week += 30;
    _mb19.loansMonth(s, yes);
    expect(a.owner).toBe('player');
    expect(recentFacts(s, { kind: 'artist_loan' }).some((f) => f.tags.includes('back'))).toBe(true);
    // pegar emprestado um ato de rival e chamar o próprio de volta antes
    const other = Object.values(s.acts).find((x) => x.owner && x.owner !== 'player' && s.labels[x.owner]?.active && x.contractId && s.contracts[x.contractId] && x.status !== 'retired' && x.status !== 'split')!;
    const owner = other.owner;
    expect(borrow19(s, other.id)).toBeNull();
    expect(other.owner).toBe('player');
    expect(lend19(s, a.id, 'tour')).toBeNull();
    const ln = loansOn19(s).find((x) => x.act === a.id)!;
    expect(recall19(s, ln.id)).toBeNull();
    expect(a.owner).toBe('player');
    s.week += 30;
    _mb19.loansMonth(s, yes);
    expect(other.owner).toBe(owner);
  });
});

describe('r19 money-b — N3 empresário total', () => {
  it('fica com a parte do artista, traz renda, segura no país, revolta e escândalo', () => {
    const s = game();
    const a = myAct(s, 45);
    _mb19.signMgr(s, a, 'Coronel X', undefined, 0.5);
    const m = mb19(s).mgr[a.id];
    a.cash += 100000;
    const c0 = s.player.cash;
    _mb19.mgrMonth(s, { ...yes, chance: () => false } as unknown as Rng);
    expect(m.took).toBe(50000);
    expect(s.player.cash).toBeGreaterThan(c0);
    // procura de shows: fora do país cai
    const home = a.city;
    const abroad = ['london', 'tokyo', 'paris', 'new_york'].find((c) => c !== home)!;
    const base = applyMods(s, 'cityDemand', 1000, { act: { ...a, id: 'x' }, cityId: abroad }).value;
    const held = applyMods(s, 'cityDemand', 1000, { act: a, cityId: abroad }).value;
    expect(held).toBeLessThan(base);
    // revolta → carta; exposição → escândalo
    m.revolt = 70;
    const sc = a.scandals;
    _mb19.mgrMonth(s, yes);
    expect(msg(s, 'mb19_revolt')).toBeTruthy();
    expect(a.scandals).toBeGreaterThan(sc);
    answerMsg(s, msg(s, 'mb19_revolt').id, 'fire');
    expect(mb19(s).mgr[a.id]).toBeUndefined();
    void cityDemand;
  });
});

describe('r19 money-b — N4 disco de cumprimento', () => {
  it('artista insatisfeito entrega lixo; engavetar conta como entregue; processar abre processo', () => {
    const s = game();
    const a = myAct(s, 40);
    a.trust = 10;
    _mb19.junkOffer(s, yes);
    const m = msg(s, 'mb19_junk');
    expect(m).toBeTruthy();
    const k = s.contracts[a.contractId!];
    answerMsg(s, m.id, 'shelve');
    expect(k.releasesDone).toBe(1);
    expect(recentFacts(s, { kind: 'junk_record' }).length).toBe(1);
    mb19(s).cd = {};
    a.trust = 10;
    _mb19.junkOffer(s, yes);
    const n = s.lawsuits.length;
    answerMsg(s, msg(s, 'mb19_junk').id, 'sue');
    expect(s.lawsuits.length).toBe(n + 1);
  });
  it('carreira de artista: entregar o disco de cumprimento ao selo NPC', () => {
    const s = game({ role: 'artist' });
    const a = s.acts[s.player.bandActId!];
    const lb = richLabel(s);
    const id = 'kband';
    s.contracts[id] = { id, actId: a.id, party: lb.id, model: 'classic', advance: 0, royalty: 0.15, termMonths: 36, startWeek: s.week, endWeek: s.week + 156, releasesOwed: 3, releasesDone: 0, creativeControl: false, publishing: false, share360: 0, recoupBalance: 0, promises: [] };
    a.contractId = id;
    expect(deliverJunk19(s, a.id)).toBeNull();
    expect(s.contracts[id].releasesDone).toBe(1);
    expect(recentFacts(s, { kind: 'junk_record' }).length).toBe(1);
  });
});

describe('r19 money-b — N16 briga de gestão (Klein)', () => {
  it('votação pela Dinâmica; apoiar a minoria contra a maioria racha a banda e abre rixa', () => {
    const s = game();
    const a = myAct(s, 50, 4);
    const rel = { id: 'rkl1', actId: a.id, owner: 'player', title: 'Y', songs: [], week: s.week - 50, revenue: 0, peak: 0, weekly: [], totalUnits: 1000 } as unknown as GameState['releases'][string];
    s.releases[rel.id] = rel; a.releases.push(rel.id);
    // força a votação: dois a favor, o resto contra
    const ps = a.members.map((id) => s.persons[id]);
    for (const p of ps.slice(0, 2)) { p.persona = { openness: 50, perfectionism: 50, ambition: 100, sociability: 50, discipline: 0, resilience: 50 }; p.goal = 'security'; }
    for (const p of ps.slice(2)) { p.persona = { openness: 50, perfectionism: 50, ambition: 0, sociability: 50, discipline: 100, resilience: 50 }; p.goal = 'credit'; }
    for (const x of a.members) for (const y of a.members) s.persons[x].rel[y] = 0;
    const v = vote19(s, a);
    expect(v.yes.length + v.no.length).toBe(ps.length);
    expect(v.yes.length).toBeGreaterThan(0);
    expect(v.no.length).toBeGreaterThan(0);
    _mb19.kleinOffer(s, yes);
    const m = msg(s, 'mb19_klein');
    expect(m).toBeTruthy();
    const n0 = a.members.length;
    answerMsg(s, m.id, 'fight');
    expect(a.members.length).toBeLessThan(n0);
    const f = recentFacts(s, { kind: 'mgmt_split' })[0];
    expect(f).toBeTruthy();
    expect(feudOf18(s, f.actors[0], f.actors[1])).toBeTruthy();
  });
  it('fechar com ele vende os masters (presos por 35 anos) e paga royalty maior', () => {
    const s = game();
    const a = myAct(s, 50, 3);
    const rel = { id: 'rkl2', actId: a.id, owner: 'player', title: 'Z', songs: [], week: s.week - 50, revenue: 0, peak: 0, weekly: [], totalUnits: 1000 } as unknown as GameState['releases'][string];
    s.releases[rel.id] = rel; a.releases.push(rel.id);
    const roy = s.contracts[a.contractId!].royalty;
    _mb19.takeover(s, a, 'Administrador', 100000);
    expect(rel.owner).toBe('indie');
    expect(s.contracts[a.contractId!].royalty).toBeGreaterThan(roy);
    expect(mb19(s).tk[a.id].until).toBe(s.year + 35);
    expect(recentFacts(s, { kind: 'mgmt_takeover' }).length).toBe(1);
  });
});

describe('r19 money-b — modo exato e ecos', () => {
  it('crônica documentada no mês real (Sun → RCA, nov/1955)', () => {
    const s = createGame(defaultConfig('r19-mbx', { startYear: 1955, history: 'strict', mode: 'historic' }));
    s.year = 1955; s.month = 10;
    _mb19.chronMonth(s);
    expect(press(s).hl.some((h) => h.t.en.includes('RCA Victor'))).toBe(true);
    expect(recentFacts(s, { kind: 'real_history' }).some((f) => f.tags.includes('sun_rca'))).toBe(true);
  });
  it('toda resposta de carta nova tem eco escrito', () => {
    const keys = { mb19_bid: ['sell', 'override', 'counter', 'keep'], mb19_mgr: ['accept', 'limit', 'refuse'], mb19_revolt: ['fire', 'audit', 'keep'], mb19_junk: ['release', 'sue', 'free', 'shelve'], mb19_klein: ['deal', 'fight', 'unanimous'] };
    for (const [k, xs] of Object.entries(keys)) for (const x of xs) expect(ownConseq18(`ib:${k}:${x}`), `${k}:${x}`).toBeTruthy();
  });
});
