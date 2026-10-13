// Rodada 28 (F4) — fim com peso. Modelo PURO (só lê o estado; nada de RNG, nada de escrita):
//  · rumo28: "Rumo a: <final> (x/100)" a partir de endingScores (o final mais provável hoje e o seguinte);
//  · chapters28: capítulos por década, cada um com um epitáfio parcial (números do ano a ano de saga18 + fatos marcantes);
//  · storyboard28: o fim de partida — álbum de cenas, as 3 maiores cadeias de eco (fios de decide18) e o epitáfio.
// Leituras cruas de s.x4 (sem `??=`): ler não muda o save.

import { endingById, ENDINGS } from '../../data/rules';
import { l, type L } from '../../data/world';
import { endingScores } from '../legacy';
import type { GameState } from '../types';
import { fmtL } from '../util';
import type { Year18 } from './saga18';
import type { Dec18State } from './decide18';
import type { SceneLog } from './scenes/state';

type X4 = Record<string, unknown>;
const x4 = (s: GameState): X4 => ((s as unknown as { x4?: X4 }).x4 ?? {});

// ---------------------------------------------------------------- rumo

export interface Rumo28 { id: string; name: L; score: number; next?: { id: string; name: L; score: number } }

const ABSENCE28 = new Set(['the_silence', 'end_of_bar']);
const EARLY28 = 5;

/** Final mais provável hoje (0–100) e o segundo colocado. */
export function rumo28(s: GameState): Rumo28 | null {
  let xs: { id: string; score: number }[];
  try { xs = endingScores(s); } catch { return null; }
  // finais "de ausência" (nada lançado, selo pequeno) medem o vazio do começo, não um rumo: só valem depois de 5 anos
  if (s.year - s.config.startYear < EARLY28) xs = xs.filter((x) => !ABSENCE28.has(x.id));
  const top = xs[0];
  if (!top) return null;
  const pct = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  const nm = (id: string): L => endingById[id]?.name ?? ENDINGS[0].name;
  const nx = xs[1];
  return { id: top.id, name: nm(top.id), score: pct(top.score), next: nx && nx.score > 0 ? { id: nx.id, name: nm(nx.id), score: pct(nx.score) } : undefined };
}

// ---------------------------------------------------------------- capítulos por década

export interface Chapter28 {
  decade: number;
  /** anos jogados da década (do 1º ao último registrado) */
  y0: number; y1: number;
  open: boolean;
  rev: number; prof: number; n1: number; rels: number; signed: number;
  best?: string;
  facts: L[];
  /** epitáfio parcial da década (uma frase) */
  epitaph: L;
}

const decadeOf = (y: number): number => Math.floor(y / 10) * 10;

function tone28(c: Omit<Chapter28, 'epitaph'>): L {
  if (c.n1 >= 2) return l('a década em que o selo mandou nas paradas', 'the decade the label ruled the charts');
  if (c.n1 === 1) return l('a década do primeiro topo', 'the decade of the first number one');
  if (c.prof > 0 && c.rels >= 3) return l('a década da construção', 'the decade of building');
  if (c.prof > 0) return l('a década do caixa no azul', 'the decade in the black');
  if (c.rels === 0) return l('a década do silêncio', 'the decade of silence');
  return l('a década da sobrevivência', 'the decade of survival');
}

/** Capítulos (um por década jogada), do mais antigo ao atual. */
export function chapters28(s: GameState): Chapter28[] {
  const years = ((x4(s).saga18 as { years?: Year18[] } | undefined)?.years ?? []) as Year18[];
  const out = new Map<number, Omit<Chapter28, 'epitaph'>>();
  const first = s.config.startYear;
  for (let d = decadeOf(first); d <= decadeOf(s.year); d += 10) {
    out.set(d, { decade: d, y0: Math.max(d, first), y1: Math.min(d + 9, s.year), open: d === decadeOf(s.year), rev: 0, prof: 0, n1: 0, rels: 0, signed: 0, facts: [] });
  }
  let bestRev = new Map<number, number>();
  for (const y of years) {
    const c = out.get(decadeOf(y.y));
    if (!c) continue;
    c.rev += y.rev ?? 0; c.prof += y.prof ?? 0; c.n1 += y.n1 ?? 0; c.rels += y.rels ?? 0; c.signed += y.signed ?? 0;
    if (y.best && (y.rev ?? 0) >= (bestRev.get(c.decade) ?? -1)) { c.best = y.best; bestRev.set(c.decade, y.rev ?? 0); }
    for (const f of y.facts ?? []) if (c.facts.length < 3) c.facts.push(f);
  }
  bestRev = new Map();
  // fatos marcantes da memória completam décadas sem resumo anual (ex.: a década corrente)
  for (const m of s.memory ?? []) {
    if (!m.important) continue;
    const a = m.actId ? s.acts[m.actId] : undefined;
    if (m.actId && !(a && (a.owner === 'player' || (a as { playerBand?: boolean }).playerBand))) continue; // o nº 1 alheio não é capítulo seu
    const c = out.get(decadeOf(m.year));
    if (c && c.facts.length < 3 && !c.facts.some((f) => f.pt === m.text.pt)) c.facts.push(m.text);
  }
  return [...out.values()].map((c) => {
    const span = c.y0 === c.y1 ? `${c.y0}` : `${c.y0}–${c.y1}`;
    const yrs = c.open ? fmtL(l('{a}–hoje', '{a}–now'), { a: c.y0 }) : l(span, span);
    const head = fmtL(l('Anos {d} ({y}): {t}.', 'The {d}s ({y}): {t}.'), { d: c.decade, y: yrs, t: tone28(c) });
    const nums = fmtL(l(' {r} lançamentos, {n} nº 1.', ' {r} releases, {n} #1s.'), { r: c.rels, n: c.n1 });
    const best = c.best ? fmtL(l(' Maior sucesso: {b}.', ' Biggest hit: {b}.'), { b: c.best }) : l('', '');
    return { ...c, epitaph: l(head.pt + nums.pt + best.pt, head.en + nums.en + best.en) };
  });
}

/** Capítulo que acabou de fechar (virada de década), ou null. */
export function closedChapter28(s: GameState, decade: number): Chapter28 | null {
  return chapters28(s).find((c) => c.decade === decade && !c.open) ?? null;
}

// ---------------------------------------------------------------- storyboard do fim

export interface Chain28 { id: string; title: L; choice: L; n: number; good: number; bad: number; last?: L; w0: number }

/** As maiores cadeias de eco: fios de decisão com mais ecos disparados (desempate: mais recentes). */
export function echoChains28(s: GameState, max = 3): Chain28[] {
  const d = x4(s).dec18 as Partial<Dec18State> | undefined;
  const by = new Map<string, Chain28>();
  for (const th of d?.th ?? []) by.set(th.id, { id: th.id, title: th.t, choice: th.o, n: 0, good: 0, bad: 0, w0: th.w });
  for (const [w, title, head, tone, thr] of d?.done ?? []) {
    if (tone === 'miss') continue;
    const c = by.get(thr) ?? { id: thr, title, choice: l('', ''), n: 0, good: 0, bad: 0, w0: w };
    c.n += 1;
    if (tone === 'good') c.good += 1;
    if (tone === 'bad') c.bad += 1;
    c.last = head;
    by.set(thr, c);
  }
  return [...by.values()].filter((c) => c.n > 0).sort((a, b) => b.n - a.n || b.w0 - a.w0).slice(0, max);
}

/** Álbum: até `max` cenas espalhadas pela partida (uma por ano, as mais recentes de cada ano). */
export function album28(s: GameState, max = 9): SceneLog[] {
  const arch = ((x4(s).scenes as { archive?: SceneLog[] } | undefined)?.archive ?? []) as SceneLog[];
  const perYear = new Map<number, SceneLog>();
  for (const a of arch) perYear.set(a.year, a);
  const xs = [...perYear.values()].sort((a, b) => a.week - b.week);
  if (xs.length <= max) return xs;
  const out: SceneLog[] = [];
  for (let i = 0; i < max; i++) out.push(xs[Math.round((i * (xs.length - 1)) / (max - 1))]);
  return out;
}

export interface Story28 { company: string; y0: number; y1: number; rumo: Rumo28 | null; chapters: Chapter28[]; album: SceneLog[]; chains: Chain28[]; epitaph: L }

/** Epitáfio final em uma frase. */
export function epitaph28(s: GameState, yEnd?: number): L {
  const st = s.player.stats;
  const r = rumo28(s);
  const y1 = yEnd ?? s.ended?.year ?? s.year;
  const base = fmtL(l('{c} ({a}–{b}): {r} lançamentos, {n} nº 1, {g} discos de ouro.', '{c} ({a}–{b}): {r} releases, {n} #1s, {g} gold records.'),
    { c: s.config.companyName, a: s.config.startYear, b: y1, r: st.releases, n: st.number1s, g: st.gold });
  const end = r ? fmtL(l(' Será lembrado como "{f}".', ' It will be remembered as "{f}".'), { f: r.name }) : l('', '');
  return l(base.pt + end.pt, base.en + end.en);
}

/** `yEnd`: ano em que a partida fechou (fim do prazo), quando a cena abre já no mês seguinte. */
export function storyboard28(s: GameState, yEnd?: number): Story28 {
  const y1 = yEnd ?? s.ended?.year ?? s.year;
  return { company: s.config.companyName, y0: s.config.startYear, y1, rumo: rumo28(s), chapters: chapters28(s), album: album28(s), chains: echoChains28(s), epitaph: epitaph28(s, y1) };
}
