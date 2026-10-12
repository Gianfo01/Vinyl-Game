// Rodada 27 (KNOWN) — ordenação de tabelas paginadas: a lista INTEIRA é ordenada antes de fatiar a página.
import { describe, expect, it } from 'vitest';
import { cmp27, getSort27, nextSort27, page27, setSort27, sortAll27, sortSpec27 } from '../src/ui/sort27';

describe('r27 sort27 — helpers puros', () => {
  it('compara números, textos com ordem natural e deixa vazios no fim', () => {
    expect(cmp27(2, 10)).toBeLessThan(0);
    expect(cmp27('A2', 'A10')).toBeLessThan(0);
    expect(cmp27('beatles', 'Beatles')).toBe(0);
    expect(cmp27(null, 5)).toBeGreaterThan(0);
    expect(cmp27(5, undefined)).toBeLessThan(0);
    expect(cmp27('', '')).toBe(0);
  });
  it('ordena estável nos dois sentidos com vazios sempre por último', () => {
    const rows = [{ n: 'a', v: 3 }, { n: 'b', v: null }, { n: 'c', v: 1 }, { n: 'd', v: 3 }, { n: 'e', v: 2 }];
    expect(sortAll27(rows, (r) => r.v, 1).map((r) => r.n)).toEqual(['c', 'e', 'a', 'd', 'b']);
    expect(sortAll27(rows, (r) => r.v, -1).map((r) => r.n)).toEqual(['a', 'd', 'e', 'c', 'b']);
    expect(rows.map((r) => r.n)).toEqual(['a', 'b', 'c', 'd', 'e']); // não mexe na lista original
  });
  it('clique: coluna nova abre no sentido padrão; a mesma coluna alterna asc/desc', () => {
    const a = nextSort27(undefined, 'fame', -1);
    expect(a).toEqual({ col: 'fame', dir: -1 });
    const b = nextSort27(a, 'fame', -1);
    expect(b).toEqual({ col: 'fame', dir: 1 });
    expect(nextSort27(b, 'fame', -1)).toEqual({ col: 'fame', dir: -1 });
    expect(nextSort27(b, 'name')).toEqual({ col: 'name', dir: 1 });
  });
  it('página fora do intervalo é ajustada', () => {
    const xs = Array.from({ length: 65 }, (_, i) => i);
    expect(page27(xs, 0, 30)).toMatchObject({ page: 0, pages: 3 });
    expect(page27(xs, 9, 30).items).toEqual([60, 61, 62, 63, 64]);
    expect(page27([], 3, 30)).toMatchObject({ page: 0, pages: 1, items: [] });
  });
  it('ordenar pela fama na página 1 mostra o topo GLOBAL (todas as páginas), e a escolha fica guardada por tabela', () => {
    // fama embaralhada de forma determinística; a ordem "original" (dataset) não é por fama
    const rows = Array.from({ length: 95 }, (_, i) => ({ id: `a${i}`, fame: (i * 37) % 101 }));
    const spec = sortSpec27<(typeof rows)[number]>('t-test', { fame: (r) => r.fame, name: (r) => r.id });
    expect(spec.apply(rows).map((r) => r.id)).toEqual(rows.map((r) => r.id)); // sem escolha: ordem do dataset
    setSort27('t-test', nextSort27(getSort27('t-test'), 'fame', -1));
    const p1 = page27(spec.apply(rows), 0, 30).items;
    const top = rows.map((r) => r.fame).sort((a, b) => b - a).slice(0, 30);
    expect(p1.map((r) => r.fame)).toEqual(top);
    // o sort22 (DOM) só reordenaria a fatia 0..29 do dataset: o topo dele seria outro
    const domOnly = rows.slice(0, 30).map((r) => r.fame).sort((a, b) => b - a);
    expect(domOnly).not.toEqual(top);
    // alterna para crescente; a memória da sessão é por tabela
    setSort27('t-test', nextSort27(getSort27('t-test'), 'fame', -1));
    expect(getSort27('t-test')).toEqual({ col: 'fame', dir: 1 });
    expect(page27(spec.apply(rows), 0, 30).items[0].fame).toBe(Math.min(...rows.map((r) => r.fame)));
    expect(getSort27('outra')).toBeUndefined();
    setSort27('t-test', undefined);
    expect(getSort27('t-test')).toBeUndefined();
  });
});
