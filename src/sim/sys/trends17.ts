// Rodada 17 — "gêneros em alta" passam a sair das paradas. Antes, a popularidade do gênero (genrePop) andava
// sozinha e só se aproximava das paradas 3% ao mês: a lista de gêneros em alta não batia com as músicas em
// alta. Agora: (1) a fatia de cada estilo nas paradas (pondera posição) é medida todo mês; (2) o gênero sobe/desce
// em direção a essa fatia mais rápido, e um estilo sem nenhuma música nas paradas esfria; (3) como genrePop já
// entra no apelo dos lançamentos (market.ts), estilo em alta ajuda quem lança nele — o ciclo fecha.

import { clamp } from '../../core/rng';
import { GENRES, genreById, l } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import type { GameState } from '../types';
import { fmtL } from '../util';

export interface Trends17State { share: Record<string, number>; prev: Record<string, number>; lead?: string; n: Record<string, number> }
declare module '../ext4' { interface Ext4 { trends17: Trends17State } }
const fresh = (): Trends17State => ({ share: {}, prev: {}, n: {} });
registerExt4('trends17', fresh);
export function trends17(s: GameState): Trends17State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.trends17 ??= fresh()) as Trends17State;
  st.share ??= {}; st.prev ??= {}; st.n ??= {};
  return st;
}

/** Estilo de uma faixa/lançamento: o da música; sem ficha, o do ato. */
export const styleOfRel17 = (s: GameState, relId: string): string | undefined => {
  const r = s.releases[relId];
  if (!r) return undefined;
  const so = r.songs.map((x) => s.songs[x]).find(Boolean);
  return so?.genre ?? s.acts[r.actId]?.genre;
};

/** Fatia de cada estilo nas paradas agora (0..1, ponderada pela posição) e nº de músicas. */
export function chartShare17(s: GameState): { share: Record<string, number>; n: Record<string, number> } {
  const w: Record<string, number> = {};
  const n: Record<string, number> = {};
  let tot = 0;
  for (const e of s.charts.singles.slice(0, 40).concat(s.charts.albums.slice(0, 40))) {
    const g = styleOfRel17(s, e.releaseId);
    if (!g) continue;
    const x = (41 - Math.min(40, e.pos)) / 40;
    w[g] = (w[g] ?? 0) + x; n[g] = (n[g] ?? 0) + 1; tot += x;
  }
  for (const g of Object.keys(w)) w[g] /= tot || 1;
  return { share: w, n };
}

/** Tabela "em alta": estilos ordenados pela fatia nas paradas, com tendência (mês anterior) e popularidade. */
export function hotList17(s: GameState, k = 10): { g: string; share: number; n: number; d: number; pop: number }[] {
  const st = trends17(s);
  const cur = Object.keys(st.share).length ? st : { ...chartShare17(s), prev: {} as Record<string, number> };
  return Object.entries(cur.share).filter(([g]) => genreById[g]).map(([g, x]) => ({ g, share: x, n: cur.n[g] ?? 0, d: x - (cur.prev[g] ?? 0), pop: s.genrePop[g] ?? 0.6 }))
    .sort((a, b) => b.share - a.share).slice(0, k);
}

registerSimHook('month', 'trends17', (s) => {
  const st = trends17(s);
  const { share, n } = chartShare17(s);
  st.prev = st.share; st.share = share; st.n = n;
  const alive = GENRES.filter((g) => g.born <= s.year && s.genrePop[g.id] !== undefined);
  for (const g of alive) {
    const x = share[g.id] ?? 0;
    const target = clamp(0.5 + x * 12, 0.3, 2);
    let p = s.genrePop[g.id];
    p += (target - p) * 0.07;
    if (!x && p > 1) p -= 0.02; // sem nenhuma música nas paradas, o "hype" esfria
    s.genrePop[g.id] = clamp(p, 0.15, 2.2);
  }
  const lead = Object.entries(share).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (lead && lead !== st.lead && (share[lead] ?? 0) >= 0.12) {
    if (st.lead) emitFact(s, { kind: 'chart', actors: [], severity: 30, visibility: 'public', tags: ['trend', lead], src: 'trends17',
      text: fmtL(l('Virada nas paradas: {g} passa a ser o estilo dominante ({p}% das paradas).', 'Chart shift: {g} becomes the dominant style ({p}% of the charts).'), { g: genreById[lead].name, p: Math.round(share[lead] * 100) }) });
    st.lead = lead;
  }
});
