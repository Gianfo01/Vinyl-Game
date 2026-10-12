// Rodada 27 (KNOWN) — ordenação que vale para TODAS as páginas de uma tabela paginada.
// O sort22 ordena as linhas do DOM, ou seja, só a página visível. Tabelas paginadas agora declaram as colunas
// ordenáveis (chave → leitor do dado) e a tela ordena a lista inteira ANTES de fatiar a página; o clique no
// cabeçalho volta para a página 1, mostra a seta (▲/▼, mesmo visual do sort22) e alterna crescente/decrescente.
// A escolha fica guardada por tabela durante a sessão (memória do módulo; nunca estado do jogo).
// Tabelas não paginadas continuam com o sort22 (as que usam este módulo levam data-sort27 e o sort22 as ignora).
//
//   const S = sortSpec27('dir-acts', { name: (a) => a.name, fame: (a) => a.fame });
//   const rows = S.apply(lista);                       // lista inteira ordenada (ou na ordem original)
//   thead: sortHead27(S, [['', null], [l('Ato','Act'), 'name'], [l('Alcance','Reach'), 'fame']], () => { page = 0; rerender(); })

import type { L } from '../data/world';
import { t } from '../i18n/strings';
import { h } from './dom';

export type Dir27 = 1 | -1;
export interface Sort27 { col: string; dir: Dir27 }
export type Val27 = number | string | null | undefined;
export type Acc27<T> = (x: T) => Val27;

// ---------------------------------------------------------------- parte pura (testada em tests/r27-sort.test.ts)
/** Compara dois valores: vazios sempre por último; números por valor; textos com ordem natural (A2 < A10). */
export function cmp27(x: Val27, y: Val27): number {
  const ex = x === null || x === undefined || x === '' || (typeof x === 'number' && !Number.isFinite(x));
  const ey = y === null || y === undefined || y === '' || (typeof y === 'number' && !Number.isFinite(y));
  if (ex || ey) return ex === ey ? 0 : ex ? 1 : -1;
  if (typeof x === 'number' && typeof y === 'number') return x - y;
  return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' });
}

/** Ordena uma cópia da lista inteira pela coluna (estável; vazios no fim nos dois sentidos). */
export function sortAll27<T>(rows: readonly T[], acc: Acc27<T>, dir: Dir27): T[] {
  const ix = rows.map((r, i) => ({ r, i, v: acc(r) }));
  ix.sort((a, b) => {
    const ea = a.v === null || a.v === undefined || a.v === '', eb = b.v === null || b.v === undefined || b.v === '';
    if (ea || eb) return ea === eb ? a.i - b.i : ea ? 1 : -1;
    return cmp27(a.v, b.v) * dir || a.i - b.i;
  });
  return ix.map((x) => x.r);
}

/** Próximo estado ao clicar na coluna: coluna nova abre no sentido padrão dela; a mesma coluna alterna. */
export function nextSort27(cur: Sort27 | undefined, col: string, first: Dir27 = 1): Sort27 {
  return cur && cur.col === col ? { col, dir: (-cur.dir) as Dir27 } : { col, dir: first };
}

/** Fatia de uma página (página fora do intervalo é ajustada). */
export function page27<T>(rows: readonly T[], page: number, size: number): { items: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.max(0, Math.min(page, pages - 1));
  return { items: rows.slice(p * size, p * size + size), page: p, pages };
}

// ---------------------------------------------------------------- memória da sessão (por tabela)
const MEMO = new Map<string, Sort27>();
export const getSort27 = (id: string): Sort27 | undefined => MEMO.get(id);
export const setSort27 = (id: string, st: Sort27 | undefined): void => { if (st) MEMO.set(id, st); else MEMO.delete(id); };

export interface Spec27<T> {
  id: string;
  acc: Record<string, Acc27<T>>;
  /** sentido do primeiro clique por coluna (padrão: números do maior para o menor, textos de A a Z) */
  first: Record<string, Dir27>;
  /** ordena a lista inteira pela escolha guardada (sem escolha: devolve a lista como veio) */
  apply: (rows: readonly T[]) => T[];
}
/** Declara as colunas ordenáveis de uma tabela paginada. `first` opcional por coluna (1 = A→Z / menor→maior). */
export function sortSpec27<T>(id: string, acc: Record<string, Acc27<T>>, first: Record<string, Dir27> = {}): Spec27<T> {
  return {
    id, acc, first,
    apply: (rows) => {
      const st = MEMO.get(id);
      const f = st && acc[st.col];
      return f ? sortAll27(rows, f, st.dir) : rows.slice();
    },
  };
}

// ---------------------------------------------------------------- cabeçalho clicável
type Head27 = [L | string, string | null] | [L | string, string | null, Record<string, unknown>];
/**
 * Cabeçalho de tabela paginada: células com chave são clicáveis (mouse e Enter), mostram a seta e mudam a ordem
 * da lista INTEIRA. `onSort` deve voltar para a página 1 e redesenhar. Primeiro clique: sentido de `spec.first`
 * ou, sem ele, decrescente para colunas numéricas (descoberto pela primeira linha não vazia) e A→Z para texto.
 */
export function sortHead27<T>(spec: Spec27<T>, cols: Head27[], onSort: () => void, sample: readonly T[] = []): HTMLElement {
  const st = MEMO.get(spec.id);
  const firstDir = (key: string): Dir27 => {
    if (spec.first[key]) return spec.first[key];
    const f = spec.acc[key];
    const v = f ? sample.map(f).find((x) => x !== null && x !== undefined && x !== '') : undefined;
    return typeof v === 'number' ? -1 : 1;
  };
  const click = (key: string) => { setSort27(spec.id, nextSort27(MEMO.get(spec.id), key, firstDir(key))); onSort(); };
  return h('thead', null, h('tr', null, ...cols.map(([label, key, extra]) => {
    const txt = typeof label === 'string' ? label : t(label);
    if (!key || !spec.acc[key]) return h('th', extra ?? null, txt);
    const on = st?.col === key;
    return h('th', {
      ...(extra ?? {}), role: 'columnheader', tabindex: '0', 'data-key': key, title: 'Clique para ordenar todas as páginas / Click to sort all pages',
      'aria-sort': on ? (st!.dir === 1 ? 'ascending' : 'descending') : 'none',
      onclick: (e: Event) => { if ((e.target as HTMLElement).closest('button, a, input, select')) return; click(key); },
      onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(key); } },
    }, txt);
  })));
}

/** Atributos da <table> que usa sortHead27 (visual do sort22, e o sort22 deixa a tabela em paz). */
export const sortTable27 = (id: string, cls = 'tbl'): Record<string, string> => ({ class: `${cls} sort22`, 'data-sort27': id });
