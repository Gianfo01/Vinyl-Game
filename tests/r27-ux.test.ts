// Rodada 27 (UX) — menos portas, nada some (docs/ux27.md).
// Páginas unificadas (hubs) são só uma camada de mapeamento: os ids antigos continuam abrindo, cada página aparece
// em exatamente uma entrada do menu (Essencial), cada seção tem poucas entradas, e as regras de escolha
// (segmentado × lista × chips × cartões) e das faixas compactas ("+N mais") são fixas.
import { describe, expect, it } from 'vitest';
import { ALIAS17, CAREER_PAGE17, NAV17, ORDER17, resolve17 } from '../src/ui/nav17';
import { KNOWN25, SECTIONS25, navGroups25, sectionIdOf25 } from '../src/ui/ps/nav25';
import { HUBBED27, HUBS27, VIEW_LABEL27, entries27, hubById27, hubOf27, resolveHub27, views27 } from '../src/ui/ps/hub27model';
import { TABS_SHOWN27, shownTabs27 } from '../src/ui/ps/view27';
import { pickKind27 } from '../src/ui/ps/pick27model';
import { REG27 } from '../src/ui/ps/subtabs27';

const TREE17 = NAV17.flatMap((g) => g.secs.flatMap((s) => s.areas));
const ABS = ORDER17.flatMap((id) => CAREER_PAGE17[id].absorbs);
const PAGES = ORDER17.map((id) => CAREER_PAGE17[id].area);
const OLD = ['identity', 'biz17', 'management', 'tour12', 'studio12', 'publishing16', 'outlets16', 'platform16', 'shared18', 'artist18', 'tut18', 'agenda17'];
/** Todo id de página que já existiu no menu (r17, r25, r27, carreiras e telas absorvidas). */
const ALL = [...new Set([...TREE17, ...ABS, ...PAGES, ...OLD, ...KNOWN25])];
const menu = (active: string[]) => navGroups25({ active, pages: active, has: (a) => ALL.includes(a), all: ALL, sede: true });
const COMBOS: string[][] = [['label'], ['musician'], ['manager'], ['label', 'musician'], ORDER17, ...ORDER17.map((x) => [x])];

describe('r27 UX: hubs (páginas unificadas)', () => {
  it('cada página está em no máximo um hub, todas existem e ficam na seção do hub', () => {
    const seen = HUBS27.flatMap((x) => x.areas);
    expect(seen.length).toBe(new Set(seen).size);
    for (const x of HUBS27) {
      expect(SECTIONS25.some((s) => s.id === x.section), x.id).toBe(true);
      expect(x.areas.length, x.id).toBeGreaterThanOrEqual(2);
      for (const a of x.areas) { expect(KNOWN25.has(a), a).toBe(true); expect(sectionIdOf25(a), a).toBe(x.section); }
      expect(x.label.pt && x.label.en && x.blurb.pt && x.blurb.en).toBeTruthy();
    }
    expect(new Set(HUBS27.map((x) => x.id)).size).toBe(HUBS27.length);
    for (const k of Object.keys(VIEW_LABEL27)) expect(HUBBED27.has(k), k).toBe(true);
  });
  it('quase toda página da árvore cabe num hub (as soltas são poucas e de propósito)', () => {
    const loose = [...KNOWN25].filter((a) => !HUBBED27.has(a));
    expect(loose.sort()).toEqual(['cockpit', 'tut18']);
  });
  it('vista Essencial: toda página do menu aparece em exatamente uma entrada (nada some), em toda combinação de carreiras', () => {
    for (const act of COMBOS) {
      for (const g of menu(act)) {
        const es = entries27(g);
        const shown = es.flatMap((e) => (e.kind === 'hub' ? e.areas : [e.area]));
        expect(shown.length, g.id).toBe(new Set(shown).size);
        expect([...shown].sort(), `${act.join('+')}/${g.id}`).toEqual([...g.areas].sort());
        for (const e of es) if (e.kind === 'hub') expect(e.areas.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
  it('poucas portas: ≤ 5 entradas por seção (fora as páginas de carreira) e ~1/3 das páginas no total', () => {
    for (const act of COMBOS) {
      const gs = menu(act);
      let entries = 0, pages = 0;
      for (const g of gs) {
        const es = entries27(g).filter((e) => !(e.kind === 'page' && e.career));
        // telas "fora da carreira" e carreiras sem página caem como páginas soltas: contam, mas a seção típica fica ≤ 5
        const loose = es.filter((e) => e.kind === 'page' && !KNOWN25.has(e.area)).length;
        // r27: o Mundo ganhou a 6ª porta (Submundo) a pedido do autor — ele não achava o Submundo dentro de "Mapa e política"
        expect(es.length - loose, `${act.join('+')}/${g.id}`).toBeLessThanOrEqual(g.id === 'world' ? 6 : 5);
        entries += entries27(g).length; pages += g.areas.length;
      }
      expect(entries, act.join('+')).toBeLessThan(pages * 0.5);
    }
    // todas as carreiras: ~80 páginas → ≤ 25 entradas além das 12 páginas de carreira
    const full = menu(ORDER17);
    expect(full.reduce((a, g) => a + entries27(g).filter((e) => !(e.kind === 'page' && e.career)).length, 0)).toBeLessThanOrEqual(25);
  });
  it('as carreiras vêm primeiro na seção, como entradas próprias', () => {
    const g = menu(['label', 'musician']).find((x) => x.id === 'projects')!;
    const es = entries27(g);
    expect(es[0]).toEqual({ kind: 'page', area: 'cp17-musician', career: true });
  });
  it('faixa de vistas: as páginas do mesmo hub; página solta não tem faixa', () => {
    const g = menu(['label']).find((x) => x.id === 'world')!;
    expect(views27(g, 'charts').slice(0, 5)).toEqual(['charts', 'labels', 'industry', 'regions18', 'market19a']);
    expect(views27(g, 'critics')).toContain('media');
    const c = menu(['label']).find((x) => x.id === 'cockpit')!;
    expect(views27(c, 'cockpit')).toEqual([]);
  });
});

describe('r27 UX: ids antigos continuam abrindo', () => {
  it('todo id antigo de página resolve para uma página do menu (direto, pela carreira ou por um hub)', () => {
    for (const act of COMBOS) {
      const gs = menu(act);
      const visible = new Set(gs.flatMap((g) => g.areas));
      for (const id of ALL) {
        const r = resolve17(id, gs);
        // telas absorvidas por uma carreira sem página ativa ficam em Gestão › carreira; ids sem página nenhuma não existem
        expect(visible.has(r.area) || !visible.has(id) && !(id in ALIAS17), `${act.join('+')}: ${id}`).toBe(true);
        if (visible.has(id)) expect(r.area === id || ALIAS17[id]?.[0] === r.area).toBe(true);
      }
    }
  });
  it('toda página com abas no registro continua alcançável no menu Essencial', () => {
    const gs = menu(ORDER17);
    const inMenu = new Set(gs.flatMap((g) => entries27(g).flatMap((e) => (e.kind === 'hub' ? e.areas : [e.area]))));
    for (const a of new Set(REG27.map((d) => d.area))) {
      const absorbed = ORDER17.some((id) => CAREER_PAGE17[id].absorbs.includes(a));
      expect(inMenu.has(a) || absorbed, a).toBe(true);
    }
  });
  it('ids de hub ("hub:money") abrem a última página visitada nele, ou a 1ª visível', () => {
    const vis = (a: string) => a !== 'finance';
    expect(resolveHub27('hub:money', () => true)).toBe('finance');
    expect(resolveHub27('hub:money', vis)).toBe('business');
    expect(resolveHub27('hub:money', () => true, 'supply18')).toBe('supply18');
    expect(resolveHub27('hub:money', vis, 'finance')).toBe('business');
    expect(resolveHub27('hub:nada', () => true)).toBeUndefined();
    expect(resolveHub27('finance', () => true)).toBeUndefined(); // id de página não é id de hub
    expect(hubById27('hub:press')?.areas).toContain('critics');
    expect(hubOf27('studio')?.id).toBe('record');
  });
});

describe('r27 UX: escolhas e faixas compactas', () => {
  it('segmentado para 2–4 opções curtas; lista para 5+ ou nomes longos; chips para filtros; cartões com consequência', () => {
    expect(pickKind27({ n: 3, labels: ['Mês', 'Trimestre', 'Ano'] })).toBe('segmented');
    expect(pickKind27({ n: 2, labels: ['Sim', 'Não'] })).toBe('segmented');
    expect(pickKind27({ n: 5, labels: ['a', 'b', 'c', 'd', 'e'] })).toBe('select');
    expect(pickKind27({ n: 1, labels: ['só'] })).toBe('select');
    expect(pickKind27({ n: 3, labels: ['Uma opção com nome bem comprido', 'b', 'c'] })).toBe('select');
    expect(pickKind27({ n: 6, multi: true })).toBe('chips');
    expect(pickKind27({ n: 3, consequences: true })).toBe('cards');
  });
  it('faixa de abas: até 6 mostra todas; mais que isso mostra 5 + a aberta e o resto vai para "+N"', () => {
    expect(TABS_SHOWN27).toBe(5);
    expect(shownTabs27(6, 5)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(shownTabs27(12, 0)).toEqual([0, 1, 2, 3, 4]);
    expect(shownTabs27(12, 9)).toEqual([0, 1, 2, 3, 4, 9]);
    expect(shownTabs27(3, 1)).toEqual([0, 1, 2]);
  });
});
