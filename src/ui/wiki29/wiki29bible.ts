// Rodada 29 (WIKI, bíblia) — duas seções novas:
//  - Linha do tempo: todos os marcos datados que o jogo conhece (time29.ts), por década;
//  - Regras e dados: cada tabela de dados do jogo vira um catálogo (cat29_a/b.ts), e cada item, uma página.
// Endereços: time:<década> ("time:1960", "time:antes", "time:futuro"), cat:<catálogo>, ci:<catálogo>~<item>.

import { l } from '../../data/world';
import { CATS_A } from './cat29_a';
import { CATS_B } from './cat29_b';
import { CATS_C } from './cat29_c';
import { TIME_KINDS29, timeline29 } from './time29';
import { H, P, T, tx } from './wiki29core';
import type { Block29, Cat29, CatItem29, Inline29, Page29 } from './wiki29types';

// ---------------------------------------------------------------- linha do tempo

/** Década de um ano: antes de 1880 = "antes"; depois de 2029 = "futuro" (eras e tecnologias especulativas do jogo). */
export const decadeOf29 = (y: number): string => (y < 1880 ? 'antes' : y > 2029 ? 'futuro' : String(Math.floor(y / 10) * 10));
let DEC: string[] | null = null;
export function decades29(): string[] {
  if (DEC) return DEC;
  const xs = [...new Set(timeline29().map((e) => decadeOf29(e.y)))];
  const n = (d: string) => (d === 'antes' ? -1 : d === 'futuro' ? 9999 : +d);
  return (DEC = xs.sort((a, b) => n(a) - n(b)));
}
export const decadeTitle29 = (d: string): string => (d === 'antes' ? T('Antes de 1880', 'Before 1880') : d === 'futuro' ? T('Depois de 2029 (futuro do jogo)', 'After 2029 (game future)') : T(`Anos ${d}`, `The ${d}s`));
const kindL = (k: string): string => tx(TIME_KINDS29.find((x) => x.id === k)?.label ?? l(k));

export function pageDecade29(d: string, title: (id: string) => string): Page29 | null {
  const evs = timeline29().filter((e) => decadeOf29(e.y) === d);
  if (!evs.length) return null;
  const ds = decades29(), i = ds.indexOf(d);
  const nav: Inline29[] = [];
  if (i > 0) nav.push({ link: `time:${ds[i - 1]}`, text: `← ${decadeTitle29(ds[i - 1])}` });
  if (i > 0 && i < ds.length - 1) nav.push('  ·  ');
  if (i < ds.length - 1) nav.push({ link: `time:${ds[i + 1]}`, text: `${decadeTitle29(ds[i + 1])} →` });
  const kinds = new Map<string, number>();
  for (const e of evs) kinds.set(e.kind, (kinds.get(e.kind) ?? 0) + 1);
  return {
    id: `time:${d}`, title: decadeTitle29(d), kind: `${evs.length.toLocaleString()} ${T('marcos', 'milestones')}`, art: { k: 'icon', name: 'datebook' },
    crumbs: [{ id: 'home', label: T('Início', 'Home') }, { id: 'idx:tempo', label: T('Linha do tempo', 'Timeline') }],
    blocks: [P(...nav), P([...kinds].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${kindL(k)} ${n}`).join(' · ')),
      { k: 'events', items: evs.map((e) => ({ y: e.y, m: e.m !== undefined ? e.m + 1 : undefined, text: tx(e.text), kind: kindL(e.kind), links: (e.see ?? []).filter((x) => title(x) !== x.split(':').slice(1).join(':')) })) },
      P(...nav)],
  };
}

// ---------------------------------------------------------------- regras e dados

export const CATS29: Cat29[] = [...CATS_A, ...CATS_B, ...CATS_C].filter((x, i, xs) => xs.findIndex((y) => y.id === x.id) === i);
const ITEMS = new Map<string, CatItem29[]>();
export function catItems29(id: string): CatItem29[] {
  let xs = ITEMS.get(id);
  if (!xs) { try { xs = CATS29.find((c) => c.id === id)?.items() ?? []; } catch { xs = []; } ITEMS.set(id, xs); }
  return xs;
}
const txs = (x: string | ReturnType<typeof l> | undefined): string => (x === undefined ? '' : typeof x === 'string' ? x : tx(x));
export const catItemTitle29 = (cat: string, item: string): string => txs(catItems29(cat).find((x) => x.id === item)?.title) || item;
export const ciId29 = (cat: string, item: string): string => `ci:${cat}~${item}`;
export function splitCi29(rest: string): [string, string] { const i = rest.indexOf('~'); return [rest.slice(0, i), rest.slice(i + 1)]; }

const GROUP_L: Record<Cat29['group'], [string, string]> = { pessoas: ['Pessoas e personalidade', 'People and personality'], regras: ['Regras do jogo', 'Game rules'], mundo: ['Mundo', 'World'], objetos: ['Objetos', 'Objects'], historia: ['História e cenas', 'History and scenes'] };

/** Índice da seção Regras e dados: catálogos agrupados. */
export function pageCats29(): Page29 {
  const blocks: Block29[] = [P(T('Cada tabela de dados do jogo, lida do código: o que existe, quanto custa, o que muda e desde quando.', 'Every game data table, read from the code: what exists, what it costs, what it changes and since when.'))];
  for (const g of Object.keys(GROUP_L) as Cat29['group'][]) {
    const cs = CATS29.filter((c) => c.group === g);
    if (!cs.length) continue;
    blocks.push(H(T(GROUP_L[g][0], GROUP_L[g][1])), { k: 'ul', items: cs.map((c) => [{ link: `cat:${c.id}`, text: tx(c.title) }, ` — ${catItems29(c.id).length} · ${tx(c.desc)}`]) });
  }
  return { id: 'idx:dados', title: T('Regras e dados', 'Rules and data'), kind: `${CATS29.length} ${T('catálogos', 'catalogs')}`, art: { k: 'icon', name: 'scroll' }, crumbs: [{ id: 'home', label: T('Início', 'Home') }], blocks };
}

export function pageCat29(id: string): Page29 | null {
  const c = CATS29.find((x) => x.id === id);
  if (!c) return null;
  const xs = catItems29(id);
  return { id: `cat:${id}`, title: tx(c.title), kind: `${xs.length} ${T('itens', 'items')}`, art: { k: 'icon', name: c.icon }, crumbs: [{ id: 'home', label: T('Início', 'Home') }, { id: 'idx:dados', label: T('Regras e dados', 'Rules and data') }],
    blocks: [P(tx(c.desc)), { k: 'list', ids: xs.map((x) => ciId29(id, x.id)), group: `cat:${id}` }] };
}

export function pageCatItem29(rest: string, title: (id: string) => string): Page29 | null {
  const [cid, iid] = splitCi29(rest);
  const c = CATS29.find((x) => x.id === cid);
  const it = catItems29(cid).find((x) => x.id === iid);
  if (!c || !it) return null;
  const blocks: Block29[] = [];
  if (it.sub) blocks.push(P(txs(it.sub)));
  if (it.rows.length) blocks.push({ k: 'kv', rows: it.rows.map(([k, v]) => [tx(k), [txs(v)]] as [string, Inline29[]]) });
  for (const t of it.text ?? []) blocks.push(P(tx(t)));
  const see = (it.see ?? []).filter((x) => title(x) !== x.split(':').slice(1).join(':') || x.startsWith('mech:'));
  if (see.length) blocks.push(H(T('Veja também', 'See also')), { k: 'ul', items: see.map((x) => [{ link: x, text: title(x) }]) });
  return { id: `ci:${rest}`, title: txs(it.title), kind: tx(c.title), art: { k: 'icon', name: it.icon ?? c.icon },
    crumbs: [{ id: 'home', label: T('Início', 'Home') }, { id: 'idx:dados', label: T('Regras e dados', 'Rules and data') }, { id: `cat:${cid}`, label: tx(c.title) }], blocks };
}
