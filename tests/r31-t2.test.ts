// R31 · onda 4 (T2): proposta fechada de catálogos e masters, leilão silencioso do mercado negro e alfândega real —
// determinismo, envelope secreto, antitruste, apreensão por época e país, pistas só de quem você conhece, interruptores e
// "explorar não muda o mundo".
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { recentFacts } from '../src/sim/facts17';
import { rngSnapshot19 } from '../src/sim/rng19';
import { setSw } from '../src/sim/r31/switches';
import { advanceMonth } from '../src/sim/tick';
import type { GameState, Release } from '../src/sim/types';
import { playerActs } from '../src/sim/util';
import { createGame } from '../src/sim/worldgen';
import { ownerOf } from '../src/sim/sys/people/owner';
import { bidAuc19, m19, openAuction19 } from '../src/sim/sys/money19';
import {
  catAnti31, deliver31, envLock31, myEnvelope31, openEnvelopes31, openTender31, parties31, sealed31, sellCatalog31, sellable31, tenders31,
} from '../src/sim/sys/sealed31';
import {
  cargoAct31, customs31, customsMonth31, eraRisk31, held31, inspect31, seizeP31, ship31, strictOf31,
} from '../src/sim/sys/customs31';
import { corruption, crime17 } from '../src/sim/sys/crime17';
import {
  bauc31, closeSheet31, fakeOdds31, newSheet31, sheet31, top31, visibleLines31, writeBid31,
} from '../src/sim/sys/bauc31';
import { addRelic, relics } from '../src/sim/sys/relics9';
import { IMPORT31 } from '../src/sim/r31/hooks31t2';
import '../src/sim/sys';

const mk = (seed: string, y = 1985, over: Record<string, unknown> = {}) => createGame(defaultConfig(seed, { startYear: y, realNames: false, ...over }));
const rich = (s: GameState) => { ownerOf(s).wealth = 1e12; s.player.cash = 1e12; };
/** Um catálogo de rival com rendimento (para editais com valor justo). */
function catalog(s: GameState, n = 4): { lb: string; rels: Release[] } {
  const lb = Object.values(s.labels).filter((x) => x.active).sort((a, b) => (a.id < b.id ? -1 : 1))[0];
  const rels = Object.values(s.releases).filter((r) => r.owner !== 'player').slice(0, n);
  for (const r of rels) { r.owner = lb.id; r.revenue = Math.max(r.revenue, 5_000_000); r.totalUnits = Math.max(r.totalUnits, 20000); r.year = s.year - 3; }
  return { lb: lb.id, rels };
}

describe('r31 T2 · proposta fechada (envelope)', () => {
  it('determinístico: mesma semente, mesmos envelopes e mesmo vencedor', () => {
    const run = () => {
      const s = mk('t2-det');
      const { lb, rels } = catalog(s);
      const t = openTender31(s, 'split', lb, 'Teste', rels)!;
      expect(t).toBeTruthy();
      const w = openEnvelopes31(s, t);
      return JSON.stringify([w ?? null, sealed31(s).done[0].env]);
    };
    expect(run()).toBe(run());
  });

  it('o seu envelope é secreto: não entra na mesa até a abertura e não muda os lances dos rivais', () => {
    const go = (bid: boolean) => {
      const s = mk('t2-secret');
      rich(s);
      const { lb, rels } = catalog(s, 6);
      const a = openAuction19(s, lb, 'Selo Quebrado', rels, 'bankrupt')!;
      expect(a).toBeTruthy();
      if (bid) {
        expect(bidAuc19(s, a.id, Math.round(a.ask * 3))).toBeNull();
        expect(a.bids.some((b) => b.who === 'player')).toBe(false); // envelope fora da mesa
        expect(myEnvelope31(s, a.id)).toBe(Math.round(a.ask * 3));
        expect(deliver31(s, a.id, a.ask * 4)).toBeTruthy(); // proposta única
        // as pistas nunca trazem valores
        const ps = parties31(s, tenders31(s).find((x) => x.id === a.id)!);
        expect(JSON.stringify(ps)).not.toContain(String(Math.round(a.ask * 3)));
      }
      const npc: string[] = [];
      for (let i = 0; i < 3 && a.st === 'open'; i++) { advanceMonth(s); npc.push(JSON.stringify(a.bids.filter((b) => b.who !== 'player'))); }
      return { npc, a, s };
    };
    const off = go(false), on = go(true);
    expect(on.npc).toEqual(off.npc); // os rivais não viram o seu envelope
    const rec = sealed31(on.s).done.find((x) => x.id === on.a.id);
    expect(rec?.env?.some((e) => e.who === 'player')).toBe(true);
  });

  it('antitruste: envelope que passaria de 40% do catálogo do mercado é barrado (desde 1950, com o interruptor)', () => {
    const s = mk('t2-anti', 1985);
    rich(s);
    const { lb, rels } = catalog(s, 3);
    for (const r of Object.values(s.releases)) if (!rels.includes(r)) { r.owner = 'player'; r.totalUnits = Math.max(1000, r.totalUnits); }
    const t = openTender31(s, 'split', lb, 'Concorrente', rels)!;
    expect(catAnti31(s, t.rels).blocked).toBe(true);
    expect(envLock31(s, t.id, t.ask * 2)?.pt).toMatch(/antitruste/);
    setSw(s, 'w31.antitrust', false);
    expect(envLock31(s, t.id, t.ask * 2)).toBeNull();
    setSw(s, 'w31.antitrust', true);
    // antes de 1950 não há órgão antitruste
    const o = mk('t2-anti-old', 1930);
    const c = catalog(o, 3);
    for (const r of Object.values(o.releases)) if (!c.rels.includes(r)) { r.owner = 'player'; r.totalUnits = Math.max(1000, r.totalUnits); }
    expect(catAnti31(o, c.rels.map((r) => r.id)).blocked).toBe(false);
  });

  it('vender o próprio catálogo por envelope: edital no calendário, abertura no motor', () => {
    const s = mk('t2-sale');
    const mine = Object.values(s.releases).filter((r) => r.owner !== 'player' && !s.acts[r.actId]?.playerBand).slice(0, 3);
    for (const r of mine) { r.owner = 'player'; r.revenue = 9_000_000; r.totalUnits = 30000; r.year = s.year - 4; }
    const ids = sellable31(s).slice(0, 3).map((r) => r.id);
    expect(sellCatalog31(s, ids)).toBeNull();
    const t = tenders31(s).find((x) => x.from === 'player')!;
    expect(t).toBeTruthy();
    expect(envLock31(s, t.id, t.ask)?.pt).toMatch(/é seu/);
    for (let i = 0; i < 3; i++) advanceMonth(s);
    expect(tenders31(s).some((x) => x.id === t.id)).toBe(false);
    expect(sealed31(s).done.some((x) => x.id === t.id)).toBe(true);
  });

  it('explorar não muda o mundo: listar editais e pistas não gira sorteio nem muda estado', () => {
    const s = mk('t2-look');
    const { lb, rels } = catalog(s);
    openAuction19(s, lb, 'Selo', rels, 'bankrupt');
    const snap = rngSnapshot19(s), st = JSON.stringify([m19(s).auc, s.x4.sealed31]);
    for (const t of tenders31(s)) { parties31(s, t); catAnti31(s, t.rels); envLock31(s, t.id, t.ask); }
    expect(rngSnapshot19(s)).toBe(snap);
    expect(JSON.stringify([m19(s).auc, s.x4.sealed31])).toBe(st);
  });

  it('interruptor desligado: o leilão de masters volta a ser de lances abertos', () => {
    const s = mk('t2-off');
    rich(s);
    setSw(s, 't31.sealed', false);
    const { lb, rels } = catalog(s);
    const a = openAuction19(s, lb, 'Selo', rels, 'bankrupt')!;
    expect(bidAuc19(s, a.id, Math.round(a.ask * 2))).toBeNull();
    expect(a.bids.some((b) => b.who === 'player')).toBe(true);
    expect(tenders31(s)).toEqual([]);
  });
});

describe('r31 T2 · alfândega real', () => {
  it('apreensão depende da época e do país', () => {
    // época: lanterna → cão → raio X → scanner
    expect(eraRisk31(1910)).toBeLessThan(eraRisk31(1960));
    expect(eraRisk31(1960)).toBeLessThan(eraRisk31(2010));
    expect(inspect31(1910, 1, 'stolen', 'self', false)).toBeLessThan(inspect31(2010, 1, 'stolen', 'self', false));
    // país: rigor é o contrário da corrupção (crime17)
    const s = mk('t2-cus-country', 1990);
    const swe = strictOf31(corruption(s, 'SWE')), bra = strictOf31(corruption(s, 'BRA'));
    expect(bra).toBeLessThan(swe);
    expect(inspect31(1990, bra, 'stolen', 'self', false)).toBeLessThan(inspect31(1990, swe, 'stolen', 'self', false));
    // quem você conhece: despachante (e o conhecido) baixa o risco; carga com nota arrisca menos que roubada
    expect(inspect31(1990, 1, 'stolen', 'desp', true)).toBeLessThan(inspect31(1990, 1, 'stolen', 'desp', false));
    expect(inspect31(1990, 1, 'stolen', 'desp', false)).toBeLessThan(inspect31(1990, 1, 'stolen', 'self', false));
    expect(inspect31(1990, 1, 'legal', 'self', false)).toBeLessThan(inspect31(1990, 1, 'stolen', 'self', false));
    // a partida lê o país da sede
    const lon = mk('t2-cus-lon', 1990, { homeCity: 'london' }), sp = mk('t2-cus-sp', 1990, { homeCity: 'sao_paulo' });
    expect(seizeP31(sp, { law: 'stolen' }, 'self')).toBeLessThan(seizeP31(lon, { law: 'stolen' }, 'self'));
  });

  it('carga chega, fica parada e se decide no balcão: declarar paga imposto; pego sem declarar = multa, jornal e reputação', () => {
    const s = mk('t2-cus-flow', 2010);
    rich(s);
    const rl = addRelic(s, 'guitar', { pt: 'Guitarra importada', en: 'Imported guitar' }, undefined, undefined, 50000, 1970);
    rl.st = 'player';
    const c = ship31(s, { n: rl.n, k: 'relic', ref: rl.id, v: 5_000_000, law: 'legal', from: 'new_york', src: 'auction31' });
    expect(cargoAct31(s, c.id, 'declare').ok).toBe(false); // ainda a caminho
    s.week = c.arrive; customsMonth31(s);
    expect(held31(s).map((x) => x.id)).toContain(c.id);
    const cash = s.player.cash;
    expect(cargoAct31(s, c.id, 'declare').ok).toBe(true);
    expect(s.player.cash).toBe(cash - c.duty);
    // carga roubada, rigor no máximo: alguma é pega — multa, fato público, reputação cai, peça apreendida
    customs31(s).strict = 3;
    let caught = false;
    for (let i = 0; i < 6 && !caught; i++) {
      const r2 = addRelic(s, 'outfit', { pt: `Figurino ${i}`, en: `Outfit ${i}` }, undefined, undefined, 20000, 1975);
      r2.st = 'stolen'; crime17(s).stash.push(r2.id);
      const x = ship31(s, { n: r2.n, k: 'relic', ref: r2.id, v: 2_000_000, law: 'stolen', from: 'paris', src: 'bauc31' });
      x.arrive = s.week; customsMonth31(s);
      const rep = s.player.reputation.institutional;
      const res = cargoAct31(s, x.id, 'self');
      if (!res.ok) {
        caught = true;
        expect(x.st).toBe('seized');
        expect(crime17(s).stash).not.toContain(r2.id);
        expect(s.player.reputation.institutional).toBeLessThan(rep);
        expect(recentFacts(s, { kind: 'customs_seizure', months: 1 }).length).toBeGreaterThan(0);
      }
    }
    expect(caught).toBe(true);
  });

  it('a casa de leilões manda a compra no exterior para a alfândega (desligado: imposto automático como antes)', () => {
    const s = mk('t2-cus-auc', 1990);
    rich(s);
    const rl = addRelic(s, 'guitar', { pt: 'Guitarra', en: 'Guitar' }, undefined, undefined, 50000, 1970);
    expect(IMPORT31.f?.(s, { rid: rl.id, price: 1_000_000, from: 'new_york' })).toBe(true);
    expect(customs31(s).q.some((x) => x.ref === rl.id && x.law === 'legal')).toBe(true);
    setSw(s, 't31.customs', false);
    expect(IMPORT31.f?.(s, { rid: rl.id, price: 1_000_000, from: 'new_york' })).toBe(false);
  });
});

describe('r31 T2 · leilão silencioso do mercado negro', () => {
  const withStolen = (s: GameState) => { const rl = addRelic(s, 'guitar', { pt: 'Guitarra roubada', en: 'Stolen guitar' }, undefined, undefined, 80000, 1965); rl.st = 'stolen'; return rl; };

  it('folha determinística por semente e mês; só na virada do mês', () => {
    const run = () => { const s = mk('t2-bauc-det', 1990); withStolen(s); delete (s.x4 as { bauc31?: unknown }).bauc31; newSheet31(s); return JSON.stringify(sheet31(s)?.lots.map((x) => [x.k, x.open, x.max, x.fakeP, x.lines])); };
    expect(run()).toBe(run());
  });

  it('a folha passa de mão em mão: lances anônimos, o seu precisa superar; quem escreveu mais leva', () => {
    const s = mk('t2-bauc-bid', 1990);
    rich(s);
    withStolen(s);
    delete (s.x4 as { bauc31?: unknown }).bauc31;
    const sh = newSheet31(s)!;
    expect(sh.lots.length).toBeGreaterThan(0);
    const lot = sh.lots[0];
    const t = top31(s, lot);
    expect(writeBid31(s, lot.id, t.need - 1)).toBeTruthy();
    expect(writeBid31(s, lot.id, lot.max + lot.step)).toBeNull();
    // linhas visíveis não dizem quem é (só a mão)
    for (const x of visibleLines31(s, lot)) expect(Object.keys(x).sort()).toEqual(['amt', 'hand', 'w']);
    closeSheet31(s, sh);
    expect(lot.st).toBe('won');
    if (lot.k === 'relic') expect(crime17(s).stash).toContain(lot.got);
  });

  it('conhecer o vendedor reduz o risco de falsificação', () => {
    const s = mk('t2-bauc-know', 1990);
    const pid = playerActs(s).flatMap((a) => s.acts[a].members)[0] ?? Object.keys(s.persons)[0];
    const base = { fakeP: 0.4 };
    expect(fakeOdds31(s, { ...base, sk: pid })).toBeLessThanOrEqual(fakeOdds31(s, { ...base }));
    expect(fakeOdds31(s, { ...base })).toBeCloseTo(0.4);
  });

  it('explorar não muda o mundo; interruptor desligado não abre folha', () => {
    const s = mk('t2-bauc-look', 1990);
    withStolen(s);
    delete (s.x4 as { bauc31?: unknown }).bauc31;
    newSheet31(s);
    const snap = JSON.stringify([s.x4.bauc31, relics(s).list.length]);
    for (const lot of sheet31(s)!.lots) { visibleLines31(s, lot); top31(s, lot); fakeOdds31(s, lot); }
    expect(JSON.stringify([s.x4.bauc31, relics(s).list.length])).toBe(snap);
    const o = mk('t2-bauc-off', 1990);
    setSw(o, 't31.blackAuction', false);
    delete (o.x4 as { bauc31?: unknown }).bauc31;
    advanceMonth(o);
    expect(bauc31(o).sheets.length).toBe(0);
  });
});
