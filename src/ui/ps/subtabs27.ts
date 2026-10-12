// Rodada 27 — abas internas de cada página como dados (sem DOM: testável).
// Fonte: o registro gerado (tabsreg27.ts, todas as abas de todas as páginas, sem depender do que a pessoa abriu)
// somado às abas vistas neste navegador (search25) — assim abas novas de outras frentes também entram.
// Usado pelo menu em árvore (Seção › Página › Aba › aba interna), pela folha do celular e pela busca (Ctrl+K).

import { l, type L } from '../../data/world';
import { TABS_REG27, type TabRow27 } from './tabsreg27';

export interface TabDef27 { area: string; key: string; id: string; label: L; trail: [string, string][]; y0?: number; y1?: number }
export interface TabNode27 extends TabDef27 { kids: TabNode27[] }

/** Chaves de faixa que dependem de um objeto da partida (festival, artista…): não valem como endereço fixo. */
export const dynKey27 = (k: string): boolean => /[:]|_\d|\d{3,}/.test(k);

const fromRow = (r: TabRow27): TabDef27 => ({ area: r[0], key: r[1], id: r[2], label: l(r[3], r[4]), trail: r[5] ?? [], y0: r[6]?.[0] || undefined, y1: r[6]?.[1] || undefined });
/** Registro completo (cópia). */
export const REG27: TabDef27[] = TABS_REG27.map(fromRow);

const sig = (d: { area: string; key: string; id: string; trail: [string, string][] }) => `${d.area}|${d.trail.map((x) => x.join('=')).join('/')}|${d.key}|${d.id}`;
/** A aba existe no ano? (janela medida pelo gerador; sem ano = sempre) */
export const inYear27 = (d: TabDef27, year?: number): boolean => year == null || ((!d.y0 || year >= d.y0) && (!d.y1 || year <= d.y1));

/** Todas as abas conhecidas (registro + vistas), sem repetição, só as que existem no ano. */
export function allTabs27(year?: number, seen: TabDef27[] = []): TabDef27[] {
  const out = new Map<string, TabDef27>();
  for (const d of REG27) if (inYear27(d, year)) out.set(sig(d), d);
  for (const d of seen) {
    if (dynKey27(d.key) || d.trail.some(([k]) => dynKey27(k))) continue;
    const k = sig(d);
    if (!out.has(k)) out.set(k, d);
  }
  return [...out.values()];
}

/** Árvore de abas de uma página: faixas do topo e, sob cada aba, as abas que só aparecem com ela aberta. */
export function tabTree27(area: string, list: TabDef27[]): TabNode27[] {
  const mine = list.filter((d) => d.area === area);
  const nodes = mine.map((d): TabNode27 => ({ ...d, kids: [] }));
  const byPath = new Map<string, TabNode27>();
  for (const n of nodes) byPath.set([...n.trail, [n.key, n.id]].map((x) => x.join('=')).join('/'), n);
  const roots: TabNode27[] = [];
  for (const n of nodes) {
    // pai = a aba mais funda da trilha que existe nesta página (trilhas de outras páginas são ignoradas)
    let parent: TabNode27 | undefined;
    for (let i = n.trail.length; i > 0 && !parent; i--) parent = byPath.get(n.trail.slice(0, i).map((x) => x.join('=')).join('/'));
    (parent ? parent.kids : roots).push(n);
  }
  return roots;
}

/** Linhas para a busca global: rótulo no idioma atual, o outro idioma como apelido. */
export function tabIndex27(lang: 'pt' | 'en', year?: number, seen: TabDef27[] = []): { area: string; key: string; id: string; label: string; alt?: string; trail: [string, string][] }[] {
  return allTabs27(year, seen).map((d) => {
    const label = lang === 'pt' ? d.label.pt : d.label.en, alt = lang === 'pt' ? d.label.en : d.label.pt;
    return { area: d.area, key: d.key, id: d.id, label, alt: alt && alt !== label ? alt : undefined, trail: d.trail };
  });
}

/** Caminho de abas a abrir para chegar numa aba (abas-mãe primeiro). */
export const tabPath27 = (d: { key: string; id: string; trail: [string, string][] }): [string, string][] => [...d.trail, [d.key, d.id]];
