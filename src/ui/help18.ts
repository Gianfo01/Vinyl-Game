// Rodada 18 (tutorial18) — registro de AJUDA por página e por aba (sem DOM: testável).
//
//   registerHelp18('finance', { title, what, how, tips: [...], links: ['business'], gloss: ['recoup'] });
//   registerHelp18('tab:mediaHub:st18', {...})   // aba de um host (data-tabs) · 'tab:*:id' vale para qualquer host
//   helpFor18('finance', [['business-finance', 'dre18']]) → { area, tabs }
//
// Textos curtos e concretos, sempre com um exemplo. Conteúdo: help18data.ts (áreas) e help18tabs.ts (abas).

import { l, type L } from '../data/world';

export interface Help18 {
  title: L;
  /** o que é a página/aba */
  what: L;
  /** como usar (passos, com exemplo) */
  how: L;
  tips?: L[];
  /** áreas relacionadas (ids de área) */
  links?: string[];
  /** termos do glossário (ids de gloss18) */
  gloss?: string[];
}

const HELP: Record<string, Help18> = {};
export function registerHelp18(id: string, d: Help18): void { HELP[id] = d; }
export const help18 = (id: string): Help18 | undefined => HELP[id];
export const helpIds18 = (): string[] => Object.keys(HELP);

/** Ajuda de uma aba: host exato primeiro, depois a genérica. */
export const tabHelp18 = (key: string, id: string): Help18 | undefined => HELP[`tab:${key}:${id}`] ?? HELP[`tab:*:${id}`];

export function helpFor18(area: string, tabs: [string, string][] = []): { area?: Help18; tabs: Help18[] } {
  const seen = new Set<Help18>();
  const out: Help18[] = [];
  for (const [k, id] of tabs) { const x = tabHelp18(k, id); if (x && !seen.has(x) && x !== HELP[area]) { seen.add(x); out.push(x); } }
  return { area: HELP[area], tabs: out };
}

// ---------------------------------------------------------------- atalhos de escrita (pt, en)

type P = [string, string];
const L2 = (x: P): L => l(x[0], x[1]);
/** Área: id, título, o quê, como, dicas, ligações, glossário. */
export function H(id: string, title: P, what: P, how: P, tips: P[] = [], links: string[] = [], gloss: string[] = []): void {
  registerHelp18(id, { title: L2(title), what: L2(what), how: L2(how), tips: tips.map(L2), links, gloss });
}
/** Aba: host ('*' = qualquer), id, título, o quê, como, glossário. */
export function T(host: string, id: string, title: P, what: P, how: P, gloss: string[] = [], tips: P[] = []): void {
  registerHelp18(`tab:${host}:${id}`, { title: L2(title), what: L2(what), how: L2(how), tips: tips.map(L2), gloss });
}
