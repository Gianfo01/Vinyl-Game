// Rodada 19 (onda 5, B) — auditoria 8 §3, §4, §5: chance mostrada = chance sorteada; cockpit por profissão;
// orçamento global de conflitos, aviso antes de avançar e resumo do mês.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { Rng } from '../src/core/rng';
import type { GameState } from '../src/sim/types';
import '../src/sim/sys';
import { ODDS19 } from '../src/sim/sys/odds19';
import { foundVenture, mgCandidates, ventures, bookingCandidates } from '../src/sim/sys/ventures9';
import { a18, band18, counterOdds18, openOffers18, type Ask18 } from '../src/sim/sys/artist18';
import { r18 } from '../src/sim/sys/rights18';
import { FESTIVALS } from '../src/data/catalog';
import { editionOf, festFee, pitchOdds8 } from '../src/sim/sys/fests8';
import { advanceMonth } from '../src/sim/tick';
import { careers } from '../src/sim/sys/careers12';
import { c12 } from '../src/sim/sys/manager12';
import { cockpit18 } from '../src/sim/sys/saga18';
import { mainCareer19 } from '../src/sim/sys/prof19';
import { quickList19 } from '../src/ui/sys/prof19';
import { found12, muOf } from '../src/sim/sys/fest12';
import { liveOf } from '../src/sim/sys/live';
import { foundCost } from '../src/sim/sys/ventures9';
import { CONFLICTS19 } from '../src/sim/conflicts19';
import { autoResolve19, conflicts19, delegateMonth } from '../src/sim/sys/budget19';
import { EVENTS, storyteller } from '../src/sim/events';
import { notify } from '../src/sim/util';
import { excs31, setMode31, stat31 } from '../src/sim/deleg31';
import { l } from '../src/data/world';
import { pitchTargets } from '../src/sim/sys/license17';
import { ATTN, attn, attnQueue, attnSeq, foldedSince, notes } from '../src/sim/attention';

/** Rng que devolve sempre u: "aceitou" tem de ser exatamente u < chance mostrada. */
class FixedRng extends Rng { constructor(private u: number) { super([1, 2, 3, 4]); } next(): number { return this.u; } }
const clone = (s: GameState) => JSON.parse(JSON.stringify(s)) as GameState;
const game = (y = 1975, seed = 'r19b', extra: object = {}) => createGame(defaultConfig(seed, { startYear: y, ...extra } as never));

function check(id: string, s: GameState, cases: unknown[][]): number {
  const d = ODDS19[id];
  let n = 0;
  for (const a of cases) {
    const p = d.chance(s, a);
    expect(p, `${id} ${JSON.stringify(a)}`).toBeGreaterThanOrEqual(0);
    // logo abaixo e logo acima da chance mostrada: o sorteio tem de virar exatamente ali
    for (const u of [p - 0.004, p + 0.004].filter((x) => x > 0 && x < 1)) {
    const ok = d.roll(clone(s), new FixedRng(u), a);
    expect(ok, `${id} ${JSON.stringify(a)} u=${u} p=${p}`).toBe(u < p);
    n++;
    }
  }
  return n;
}

describe('r19-fix-b §3: a chance mostrada segue os termos e é a mesma do sorteio', () => {
  it('empresário, agência, festival, editora: para várias comissões/termos', () => {
    const s = game();
    s.player.cash = 1e9;
    const covered = new Set<string>();
    const cands = mgCandidates(s).slice(0, 3);
    const rates = [0.1, 0.15, 0.2];
    const mg = cands.flatMap((a) => rates.map((r) => [a.id, r]));
    check('mg.pitch', s, mg); covered.add('mg.pitch');
    check('mg.poach', s, mg); covered.add('mg.poach');
    // a chance muda com a comissão (a tela tem de redesenhar)
    const a0 = mgCandidates(s).reduce((m, a) => (a.fame < m.fame ? a : m));
    expect(ODDS19['mg.pitch'].chance(s, [a0.id, 0.1])).toBeGreaterThan(ODDS19['mg.pitch'].chance(s, [a0.id, 0.2]));
    // cliente existente: renegociar comissão e mandato
    const c = cands[1];
    ventures(s).mg.clients.push({ actId: c.id, rate: 0.12, since: s.week, sat: 60, earned: 0 });
    check('mg.rate', s, [[c.id, 0.15], [c.id, 0.2], [c.id, 0.25]]); covered.add('mg.rate');
    check('mg.mandate', s, [0.1, 0.15, 0.2].flatMap((rate) => [[c.id, { areas: ['recordings'], rate, excl: false, auto: 1 }], [c.id, { areas: ['recordings', 'shows'], rate, excl: true, auto: 2 }]])); covered.add('mg.mandate');
    // agência de shows e festival próprio
    expect(foundVenture(s, 'booking', 'label', { name: 'Ag' })).toBeNull();
    expect(foundVenture(s, 'festival', 'label', { name: 'Fest' })).toBeNull();
    const bk = ventures(s).list.find((v) => v.kind === 'booking')!;
    const bc = bookingCandidates(s, bk.id).slice(0, 3);
    check('booking.sign', s, bc.flatMap((a) => [0.08, 0.12, 0.2].map((r) => [bk.id, a.id, r]))); covered.add('booking.sign');
    // editora: taxa de administração
    r18(s).admOff.push({ id: 'adm-t', name: 'Espólio X', size: 100000, fee: 0.15, until: s.year + 3, sat: 60, exp: s.week + 13 });
    check('pub.admin', s, [0.1, 0.15, 0.2].map((f) => ['adm-t', f])); covered.add('pub.admin');
    // festival de terceiros: seu artista pede faixa/cachê
    const eds = FESTIVALS.map((_, k) => k).filter((k) => { const ed = editionOf(s, k); return ed && !ed.done && ed.month > s.month; });
    const pool = Object.values(s.acts).filter((a) => a.status !== 'retired' && a.status !== 'split' && a.members.length);
    const pairs = eds.flatMap((fi) => pool.filter((a) => pitchOdds8(s, fi, a.id, 'opening', festFee(s, FESTIVALS[fi], a, 'opening')) > 0).slice(0, 1).map((a) => [fi, a] as const)).slice(0, 2);
    expect(pairs.length).toBeGreaterThan(0);
    const fc = pairs.flatMap(([fi, a]) => [0.9, 1.2, 2.5].flatMap((m) => (['opening', 'headline'] as const).map((t) => [fi, a.id, t, Math.round(festFee(s, FESTIVALS[fi], a, t) * m)])));
    check('fest.pitch', s, fc); covered.add('fest.pitch');
    expect(new Set(fc.map((a) => ODDS19['fest.pitch'].chance(s, a))).size).toBeGreaterThan(1);
    // licenciamento do catálogo para um selo de outro mercado
    const tg = pitchTargets(s).slice(0, 3);
    if (tg.length) { check('lic.pitch', s, tg.map((x) => [x.lb.id, x.m])); covered.add('lic.pitch'); }
    covered.add('artist.counter'); // coberto no teste abaixo
    expect([...covered].sort()).toEqual(Object.keys(ODDS19).sort());
  });

  it('contraproposta do artista: a chance depende do tamanho do pedido e é a do sorteio', () => {
    const s = createGame(defaultConfig('r19bart', { role: 'artist', startYear: 1965, bandGenre: 'rnr', bandName: 'Os Testes' } as never));
    let o = openOffers18(s).find((x) => x.k === 'record' || x.k === 'dist' || x.k === 'dev');
    for (let i = 0; i < 12 && !o; i++) { const a = band18(s)!; a.fame = 45; a.momentum = 70; advanceMonth(s); o = openOffers18(s).find((x) => x.k === 'record' || x.k === 'dist' || x.k === 'dev'); }
    expect(o).toBeTruthy();
    o!.master = 'label'; o!.rev = 0; o!.ar = 'label';
    const asks: Ask18[] = ['adv', 'roy', 'master', 'audit', 'term', 'promo', 'control'];
    const ps = asks.map((k) => counterOdds18(s, o!, k).p);
    expect(new Set(ps).size).toBeGreaterThan(2);
    expect(counterOdds18(s, o!, 'master').p).toBeLessThan(counterOdds18(s, o!, 'audit').p);
    check('artist.counter', s, asks.map((k) => [o!.id, k]));
    expect(a18(s).offers.length).toBeGreaterThan(0);
  });
});

const mgGame = (seed = 'r19bmg') => {
  const s = createGame(defaultConfig(seed, { startYear: 1975, careers: { main: ['manager'], origin: 'roadie', ambition: 'legacy' } } as never));
  careers(s);
  return s;
};
const addClients = (s: GameState, n: number, crisis = false) => {
  for (const a of mgCandidates(s).slice(0, n)) ventures(s).mg.clients.push({ actId: a.id, rate: 0.15, since: s.week, sat: 60, earned: 0, ...(crisis ? { crisis: { k: 'scandal' as const, w: s.week } } : {}) });
};

describe('r19-fix-b §4: cockpit por profissão', () => {
  it('empresário: "Hoje" traz crises e mandato vencendo; atalhos e humor são de clientes', () => {
    const s = mgGame();
    addClients(s, 2, true);
    const id = ventures(s).mg.clients[1].actId;
    c12(s, id).mandate.until = s.week + 5;
    const c = cockpit18(s);
    const txt = c.now.map((q) => q.t.pt).join(' | ');
    expect(txt).toMatch(/Crise com/);
    expect(txt).toMatch(/Mandato de .* vence em 5 semanas/);
    expect(c.works.some((q) => /Satisfação média/.test(q.t.pt))).toBe(true);
    const q = quickList19(s).map((x) => x[2].pt);
    expect(q).toContain('Clientes'); expect(q).toContain('Prospectar'); expect(q).not.toContain('Contratar');
    expect(mainCareer19(s)).toBe('manager');
  });
  it('selo continua com os atalhos clássicos; festival mostra edição e headliner faltando', () => {
    const s = game();
    expect(quickList19(s).map((x) => x[2].pt)).toContain('Contratar');
    const f = createGame(defaultConfig('r19bfe', { startYear: 1990, careers: { main: ['festival'], origin: 'roadie', ambition: 'legacy' } } as never));
    careers(f);
    f.player.cash += foundCost(f, 'festival') * 2;
    const fx = found12(f, 'label', { month: (f.month + 3) % 12, ident: 'discovery' });
    expect('pt' in fx ? fx.pt : '').toBe('');
    const own = liveOf(f).fests[0];
    own.month = (f.month + 3) % 12; own.nextYear = f.year + (f.month + 3 >= 12 ? 1 : 0);
    expect(muOf(f, own)).toBe(3);
    const c = cockpit18(f);
    expect(c.works.some((q) => /edição em 3/.test(q.t.pt))).toBe(true);
    expect(c.now.some((q) => /sem headliner/.test(q.t.pt))).toBe(true);
    expect(quickList19(f).map((x) => x[2].pt)).toContain('Line-up');
  });
});

describe('r19-fix-b §5: orçamento global, aviso antes de avançar, resumo do mês, delegação', () => {
  it('crises de clientes contam no orçamento: cheio, o narrador não abre crise nova (só oportunidades)', () => {
    const s = mgGame('r19bconf');
    expect(CONFLICTS19.full(s)).toBe(false);
    addClients(s, 8, true);
    const c = conflicts19(s);
    expect(c.n).toBeGreaterThanOrEqual(c.cap);
    expect(CONFLICTS19.full(s)).toBe(true);
    const d0 = new Set(s.decisions.map((d) => d.id));
    const seen: string[] = [];
    for (let i = 0; i < 8; i++) {
      storyteller(s, new Rng([9, 8, 7, i + 1]), i);
      for (const d of s.decisions) if (!d0.has(d.id)) seen.push(d.eventId);
      s.decisions = s.decisions.filter((d) => d0.has(d.id));
      expect(CONFLICTS19.full(s)).toBe(true);
    }
    const bad = new Set(EVENTS.filter((e) => e.tone === 'bad').map((e) => e.id));
    expect(seen.filter((e) => bad.has(e))).toEqual([]);
  });
  it('autoResolve19 lista os cartões da mesa com a resposta padrão', () => {
    const s = game(1975, 'r19bauto');
    for (let i = 0; i < 4 && !s.decisions.length; i++) advanceMonth(s);
    if (!s.decisions.length) s.decisions.push({ id: 'dx', eventId: 'x', cat: 'people', title: l('Teste', 'Test'), text: l('t', 't'), options: [{ id: 'a', label: l('A', 'A') }, { id: 'b', label: l('Ignorar', 'Ignore') }], ctx: {}, week: s.week, defaultOption: 'b', tags: [] } as never);
    s.clock.opened = false;
    const xs = autoResolve19(s, 'month');
    expect(xs.length).toBe(s.decisions.length);
    const d = s.decisions[0];
    expect(xs[0].def.pt).toBe(d.options.find((o) => o.id === d.defaultOption)!.label.pt);
    expect(autoResolve19(s, 'week').length).toBe(s.decisions.filter((x) => Number(x.ctx.dl18 ?? 0) && Number(x.ctx.dl18) <= s.week + 1).length);
  });
  // r31 (UNI-1): a cota é o orçamento único da fila de atenção (ATTN.notes por mês, somando avisos e mensagens) e o
  // agrupado vira o "Boletim da semana" (antes: cota de 8 avisos e um "Resumo do mês" em s.notifications).
  it('avisos menores além da cota viram o boletim da semana; ruins nunca são agrupados', () => {
    const s = game(1975, 'r19bnote');
    const n0 = attnSeq(s);
    attn(s).bm = s.year * 12 + s.month; attn(s).bn = 0;
    for (let i = 0; i < 30; i++) notify(s, l(`Aviso ${i}`, `Notice ${i}`), 'info');
    for (let i = 0; i < 3; i++) notify(s, l(`Ruim ${i}`, `Bad ${i}`), 'bad');
    const all = notes(s, { after: n0 });
    const fresh = all.filter((n) => !n.fold);
    expect(fresh.length).toBe(ATTN.notes + 3);
    expect(all.filter((n) => n.fold).length).toBe(30 - ATTN.notes); // ficam no registro
    expect(fresh.filter((n) => n.kind === 'bad').length).toBe(3);
    expect(attnQueue(s).some((x) => x.bw === s.week && /Boletim da semana/.test(x.title.pt))).toBe(true);
    expect(foldedSince(s, s.clock.monthStartWeek).length).toBeGreaterThanOrEqual(30 - ATTN.notes);
  });
  it('delegação do empresário renova mandato ou sobe exceção (fato deleg_exc → Caixa)', () => {
    const s = mgGame('r19bdlg');
    addClients(s, 2);
    const [a, b] = ventures(s).mg.clients.map((c) => c.actId);
    c12(s, a).mandate.until = s.week + 4; c12(s, a).trust = 95;
    c12(s, b).mandate.until = s.week + 4; c12(s, b).trust = 10;
    expect(setMode31(s, 'mandates', 'rule')).toBeNull();
    delegateMonth(s);
    expect(excs31(s).some((e) => /abaixo do mínimo/.test(e.t.pt))).toBe(true);
    expect(stat31(s, 'mandates').exc).toBeGreaterThan(0);
    expect(c12(s, a).mandate.until > s.week + 4 || excs31(s).some((e) => e.act === a)).toBe(true);
  });
});
