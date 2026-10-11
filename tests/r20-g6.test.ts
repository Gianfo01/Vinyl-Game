// Rodada 20 (G6): cockpit em primeiro plano, pós-turno "3 destaques + N outros" (B23), ajuda mínima por área (B22),
// resumo acessível de gráficos (B24), unidades (p.p. × %) e oferta de contrato em camadas (§4.5). Rápido, sem DOM.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { defaultOffer } from '../src/sim/contracts';
import { defaultRights } from '../src/sim/rights';
import type { Notification } from '../src/sim/types';
import { helpFor18, help18 } from '../src/ui/help18';
import '../src/ui/help18data';
import '../src/ui/help18tabs';
import { CAREER_PAGE17, NAV17, ORDER17 } from '../src/ui/nav17';
import { chartSummary20, compareOffers20, concessions20, decisions20, highlights20, minimalHelp20, pp20, rel20, review20, rightsDiff20, changes20 } from '../src/ui/ux20';

const N = (kind: Notification['kind'], week: number, pt = `${kind}${week}`): Notification => ({ kind, week, text: { pt, en: pt } });

describe('r20 G6 — pós-turno (B23)', () => {
  it('1, 3, 4 e >8 avisos: nada se perde e a ordem prioriza severidade', () => {
    for (const n of [1, 3, 4, 9, 12]) {
      const kinds: Notification['kind'][] = ['info', 'good', 'event', 'bad'];
      const xs = Array.from({ length: n }, (_, i) => N(kinds[i % 4], i));
      const { top, rest } = highlights20(xs);
      expect(top.length).toBe(Math.min(3, n));
      expect(top.length + rest.length).toBe(n);
      expect(new Set([...top, ...rest]).size).toBe(n);
      for (let i = 1; i < top.length; i++) expect(['bad', 'event', 'good', 'info'].indexOf(top[i].kind)).toBeGreaterThanOrEqual(['bad', 'event', 'good', 'info'].indexOf(top[i - 1].kind));
      if (n >= 4) expect(top[0].kind).toBe('bad');
    }
    // empate de severidade: o mais recente primeiro
    expect(highlights20([N('bad', 1), N('bad', 5), N('info', 9)]).top.map((x) => x.week)).toEqual([5, 1, 9]);
  });
});

describe('r20 G6 — ajuda mínima (B22)', () => {
  it('nenhuma página do menu cai em ajuda vazia; a geral vem rotulada', () => {
    const areas = [...NAV17.flatMap((g) => g.secs.flatMap((s) => s.areas)), ...ORDER17.flatMap((id) => [CAREER_PAGE17[id].area, ...CAREER_PAGE17[id].absorbs]), 'nada-registrado'];
    for (const a of areas) {
      const own = helpFor18(a).area;
      const x = own ?? minimalHelp20(a);
      expect(x.what.pt.length, a).toBeGreaterThan(10);
      expect(x.how.en.length, a).toBeGreaterThan(10);
      if (!own) { expect(minimalHelp20(a).general).toBe(true); expect(minimalHelp20(a).tips?.length).toBe(2); }
    }
    for (const id of ['cockpit20', 'offer20', 'review20']) for (const lk of help18(id)!.links ?? []) expect(help18(lk), `${id}→${lk}`).toBeTruthy();
  });
});

describe('r20 G6 — gráficos, unidades e cockpit', () => {
  it('resumo acessível em PT e EN; p.p. distinto de %', () => {
    expect(chartSummary20('Vendas', [1, 5, 3])).toContain('3 pontos');
    expect(chartSummary20('Sales', [1, 5, 3], undefined, true)).toContain('max 5');
    expect(chartSummary20('X', [])).toContain('sem dados');
    expect(pp20(0.14, 0.16)).toBe('+2 p.p.');
    expect(rel20(100, 125)).toBe('+25%');
  });
  it('decisões por prazo e mudanças em destaques', () => {
    const s = createGame(defaultConfig('r20g6', { startYear: 1975 }));
    const rows = decisions20(s);
    for (let i = 1; i < rows.length; i++) expect((rows[i].left ?? 999) >= (rows[i - 1].left ?? 999)).toBe(true);
    s.notifications.push(N('info', s.week), N('bad', s.week), N('good', s.week), N('event', s.week), { ...N('info', s.week), fold: 1 });
    const c = changes20(s);
    expect(c.top[0].kind).toBe('bad');
    expect(c.folded).toBeGreaterThanOrEqual(1);
  });
});

describe('r20 G6 — oferta em camadas (§4.5)', () => {
  it('resumo, diferença do preset, comparação e revisão de caixa', () => {
    const s = createGame(defaultConfig('r20g6o', { startYear: 1975 }));
    const a = Object.values(s.acts).find((x) => x.owner !== 'player')!;
    const o = defaultOffer(s, a);
    o.rights = defaultRights(o.model, o.publishing);
    expect(rightsDiff20(defaultRights(o.model, o.publishing), o.rights)).toEqual([]);
    const hard = { ...o.rights, master: 'label' as const, options: 2, reversionYears: 0, sync: !o.rights.sync };
    expect(rightsDiff20(o.rights, hard).length).toBeGreaterThan(0);
    const cs = concessions20(o);
    expect(cs.some((x) => x.side === 'label')).toBe(true);
    expect(cs.some((x) => x.side === 'artist')).toBe(true);
    const alt = { ...o, royalty: o.royalty + 0.02 };
    const rows = compareOffers20([o, alt, o], 0.2);
    for (const r of rows) expect(r.v.length).toBe(3);
    expect(rows[1].v[1]).toContain('+2 p.p.');
    const rv = review20(s, o);
    expect(rv.free).toBe(rv.cash - rv.reserved);
    const big = review20(s, { ...o, advance: s.player.cash + 100 });
    expect(big.ok).toBe(false);
    expect(big.reqs.length).toBeGreaterThan(0);
  });
});
