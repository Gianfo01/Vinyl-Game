// Rodada 19 (onda 2) — 11.2 cobertura de ecos (piso testado, eco padrão pelo tom, ecos à mão no topo do sorteio e nas
// famílias r11/w4/org12/era8), 11.5 era 1889 ligada (card, Conselheiro, ecos de patente/formato/vaudeville),
// 11.6 contratos por época (sem royalty antes de ~1903, sem "master" antes de ~1925) e o piloto da Frente 2 (4 marcos reais).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { Fx18, conseq18, ownConseq18 } from '../src/sim/decide18';
import { l } from '../src/data/world';
import { EVENTS, emitEvent, eventById, resolveDecision } from '../src/sim/events';
import { dec18, fire18 } from '../src/sim/sys/decide18';
import { TOP19, coverage19, optTone19 } from '../src/sim/sys/echoes19';
import { eraFactors19, era19 } from '../src/sim/sys/era19';
import { clampRoy19, eraOffer19, eraOfferText19, eraWord19, eraAsks19, royBand19 } from '../src/sim/sys/eracon19';
import { pkgsFor19 } from '../src/sim/sys/contracts18';
import { REAL19, realCards19, rh19 } from '../src/sim/sys/realhist19';
import { MILESTONES, fireMilestone } from '../src/sim/sys/world4/milestones';
import { advisorTips18 } from '../src/sim/inbox18';
import { facts17 } from '../src/sim/facts17';
import { playerActs, rngOf } from '../src/sim/util';
import { w4 } from '../src/sim/sys/world4/state';
import type { GameState } from '../src/sim/types';
import '../src/sim/sys';

const own = (k: string) => !!ownConseq18(k)?.later?.length;
const myAct = (s: GameState) => {
  const id = playerActs(s)[0];
  if (id) return s.acts[id];
  const a = Object.values(s.acts).filter((x) => x.members.length >= 1 && x.status !== 'retired' && x.status !== 'split').sort((x, y) => x.id.localeCompare(y.id))[0];
  a.owner = 'player';
  return a;
};

describe('r19 ecos (11.2)', () => {
  it('piso: ≥35% das opções dos 120 eventos mais sorteados têm eco escrito à mão; os 40 primeiros têm eco', () => {
    expect(TOP19.length).toBe(120);
    expect(TOP19.filter((id) => eventById[id]).length).toBe(120);
    const c = coverage19(TOP19);
    expect(c.own / c.opts).toBeGreaterThanOrEqual(0.35);
    expect(c.any / c.opts).toBeGreaterThanOrEqual(0.85);
    for (const id of TOP19.slice(0, 40)) expect(eventById[id].options.some((o) => own(`ev:${id}:${o.id}`)), id).toBe(true);
    const all = coverage19();
    expect(all.own).toBeGreaterThan(300);
  });

  it('famílias r11, w4, org12 e era8 deixaram de ter zero ecos', () => {
    for (const pre of ['r11_', 'w4_', 'org12_', 'era8_']) {
      const ids = EVENTS.filter((e) => e.id.startsWith(pre)).map((e) => e.id);
      expect(coverage19(ids).own, pre).toBeGreaterThan(0);
    }
    expect(coverage19(EVENTS.filter((e) => e.id.startsWith('org12_')).map((e) => e.id)).own).toBe(60);
  });

  it('eco padrão pelo tom: classifica, agenda e dispara com Fato', () => {
    expect(optTone19('controversial_remark', 'double_down')).toBe('aggressive');
    expect(optTone19('d18_press_lie', 'lie')).toBe('deceitful');
    expect(optTone19('jingle_commission', 'ghost')).toBe('deceitful');
    expect(optTone19('benefit_concert', 'join')).toBe('generous');
    expect(optTone19('extra_date', 'add')).toBe('risky');
    expect(optTone19('extra_date', 'rest')).toBe('generous');
    expect(optTone19('magazine_cover', 'basic')).toBe('cautious');
    const k = 'ev:benefit_concert:join';
    expect(own(k)).toBe(false);
    expect(conseq18(k)?.later?.[0].tone).toBe('good');
    const s = createGame(defaultConfig('r19-ech-1'));
    advanceMonth(s);
    const a = myAct(s);
    s.decisions = [];
    emitEvent(s, rngOf(s), 'extra_date', { act: a.id });
    const d = s.decisions.find((x) => x.eventId === 'extra_date')!;
    expect(d).toBeTruthy();
    resolveDecision(s, d.id, 'add');
    const e = dec18(s).q.find((x) => x.k === 'ev:extra_date:add')!;
    expect(e).toBeTruthy();
    expect(e.hint.pt.length).toBeGreaterThan(5);
    e.p = 1;
    const out = fire18(s, e)!;
    expect(out.tone).toBe('mixed');
    expect(facts17(s).f.some((f) => f.kind === 'risk_paid' || f.kind === 'risk_lost')).toBe(true);
  });
});

describe('r19 era 1889 (11.5) e contratos por época (11.6)', () => {
  it('card "A era", Conselheiro e ecos de época', () => {
    const s = createGame(defaultConfig('r19-era-1', { startYear: 1889 }));
    advanceMonth(s);
    const f = eraFactors19(s).map((x) => x.id);
    expect(f).toContain('format');
    expect(f).toContain('contract');
    s.year = 1892; s.month = 10;
    expect(eraFactors19(s).some((x) => x.id === 'rumor')).toBe(true);
    expect(advisorTips18(s).some((t) => t.id === 'era19_panic')).toBe(true);
    s.year = 1960;
    expect(eraFactors19(s)).toEqual([]);
    for (const k of ['ib:era1889_patent:lic', 'ib:era1889_patent:risk', 'ev:era19_cyl_bet:disc', 'ev:era19_vaud:exclusive', 'ev:shellac_breakage:repress']) expect(own(k), k).toBe(true);
    s.year = 1900;
    s.decisions = [];
    emitEvent(s, rngOf(s), 'era19_cyl_bet', {});
    const d = s.decisions.find((x) => x.eventId === 'era19_cyl_bet')!;
    resolveDecision(s, d.id, 'disc');
    expect(era19(s).bet).toBe('disc');
    expect(facts17(s).f.some((x) => x.kind === 'format_bet')).toBe(true);
  });

  it('1889: cachê por sessão, sem royalty e sem "master"; royalty por década depois', () => {
    expect(royBand19(1889)).toEqual([0, 0]);
    const o = { roy: 0.18, fund: 500, s360: 0.2, master: 'artist' as const, rev: 7, opts: 3, term: 48, albums: 4, model: 'licensing', k: 'record' };
    eraOffer19(1889, o, 40);
    expect(o.roy).toBe(0);
    expect(o.master).toBe('label');
    expect(o.s360).toBe(0);
    const txt = eraOfferText19(1889, { adv: 30000, roy: 0, term: 24, albums: 3 }, 'Columbia')!;
    for (const x of [txt.pt, txt.en]) { expect(x).not.toMatch(/master|royalty \d|\d+%|360/i); }
    expect(eraOfferText19(1910, { adv: 30000, roy: 0.04, term: 24, albums: 3 }, 'Victor')!.pt).toMatch(/por lado/);
    expect(eraOfferText19(1960, { adv: 1, roy: 0.1, term: 1, albums: 1 }, 'x')).toBeNull();
    expect(clampRoy19(1960, 0.3, 20)).toBeLessThanOrEqual(0.12);
    expect(clampRoy19(1990, 0.15, 20)).toBe(0.15);
    expect(eraWord19('Pedir os masters de volta')).toBe('Pedir as matrizes de volta');
    expect(eraWord19(l('o master continua seu', 'you keep the master')).en).toBe('you keep the matrix');
    expect(eraAsks19(1889, ['adv', 'roy', 'master'])).toEqual(['adv']);
    expect(pkgsFor19(1889).map((p) => p.id)).toEqual(['session']);
    expect(pkgsFor19(1910).map((p) => p.id)).toEqual(['side']);
    expect(pkgsFor19(1960).some((p) => p.id === 'major')).toBe(true);
    expect(pkgsFor19(1960).some((p) => p.id === 'session')).toBe(false);
  });
});

describe('r19 Frente 2 — piloto da história real', () => {
  it('4 marcos com decisão; escolha e desfecho aparecem no cartão "A história real" (modo alternativo)', () => {
    for (const r of REAL19) expect(MILESTONES.some((m) => m.id === r.ms), r.ms).toBe(true);
    expect(REAL19.length).toBe(4);
    const s = createGame(defaultConfig('r19-rh-1', { startYear: 1983 }));
    advanceMonth(s);
    s.decisions = [];
    const m = MILESTONES.find((x) => x.id === 'rh19_mtv')!;
    myAct(s);
    delete w4(s).ms.rh19_mtv;
    fireMilestone(s, rngOf(s), { ...m, tech: undefined });
    const d = s.decisions.find((x) => x.eventId === 'rh19_mtv');
    expect(d).toBeTruthy();
    resolveDecision(s, d!.id, 'pressure');
    expect(rh19(s).run.mtv.opt).toBe('pressure');
    const e = dec18(s).q.find((x) => x.k === 'ev:rh19_mtv:pressure')!;
    e.p = 1;
    fire18(s, e);
    const c = realCards19(s).find((x) => x.r.id === 'mtv')!;
    expect(c.alt).toBe(true);
    expect(c.run?.out?.pt).toMatch(/ClipNet/);
    expect(c.r.real.pt).toMatch(/1983/);
    expect(facts17(s).f.some((f) => f.kind === 'real_history')).toBe(true);
  });

  it('festival gratuito: vítima anônima e fictícia, sem detalhe gráfico', () => {
    const k = conseq18('ev:rh19_fest:cheap')!.later![0];
    const s = createGame(defaultConfig('r19-rh-2', { startYear: 1970 }));
    advanceMonth(s);
    const a = myAct(s);
    const f = new Fx18(s, { act: a.id }, rngOf(s));
    const t = k.fx(f);
    expect(t.pt).toMatch(/não foi divulgado/);
    expect(t.pt).not.toMatch(/sangue|faca|esfaque/i);
  });
});
