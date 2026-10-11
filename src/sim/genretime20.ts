// Rodada 20 (B30/B31) — TEMPO DOS GÊNEROS num predicado só, e relações de gênero com tipo.
//
// B30: eventos e geradores escolhiam gêneros por popularidade (s.genrePop) sem olhar o ano de nascimento do
// gênero; um evento "genre_shift" podia levar um ato para trap em 1980. Regra única: um gênero só pode ser
// escolhido por evento/gerador se já nasceu (genre.born <= ano). Vale em todos os modos (nada do futuro);
// gêneros de movimento (mv_*) só valem na partida que os criou.
//
// B31: Genre.parents é uma lista sem tipo. Cinco arestas têm o "pai" catalogado DEPOIS do filho — não são
// precursores, são parentescos retrospectivos ou contemporâneos. GENRE_REL20 tipa essas arestas e
// lintGenreEdges20() acusa qualquer aresta causal ('influence') invertida: uma curadoria nova que aponte um
// pai mais novo sem declarar o tipo falha no teste.
//
// Módulo puro (só dados + tipos).
import { GENRES, genreById } from '../data/world';
import type { GameState } from './types';

/** Gênero disponível para eventos/geradores no ano (default: ano corrente). */
export function genreAvailable20(s: Pick<GameState, 'year' | 'movements'>, gid: string, year = s.year): boolean {
  const g = genreById[gid];
  if (!g || g.born > year) return false;
  if (gid.startsWith('mv_')) return (s.movements ?? []).some((m) => m.genreId === gid);
  return true;
}

/** Tipo de relação entre gênero filho e "pai" catalogado. */
export type GenreRel20 = 'influence' | 'contemporary' | 'retro' | 'similar';

/** Arestas cujo "pai" nasceu no mesmo ano ou depois do filho, com o tipo declarado pela curadoria. */
export const GENRE_REL20: Record<string, GenreRel20> = {
  'art_rock<psychedelic': 'contemporary', // 1964 × 1965: cenas paralelas de Londres
  'torch_song<vocal_jazz': 'retro', // 1930 × 1933: o rótulo "vocal jazz" é retrospectivo
  'bhangra<dance_pop': 'similar', // 1980 × 1982: fusão posterior aproxima os dois, não é ancestral
  'psytrance<trance': 'contemporary', // 1990 × 1991: Goa e Frankfurt ao mesmo tempo
  'alt_rnb<bedroom_pop': 'contemporary', // 2011 × 2012: mesma geração da internet
};

/** Tipo efetivo da aresta: declarado, senão deduzido pelos anos (mesmo ano = contemporâneo). */
export function genreRel20(child: string, parent: string): GenreRel20 {
  const d = GENRE_REL20[`${child}<${parent}`];
  if (d) return d;
  const c = genreById[child], p = genreById[parent];
  if (!c || !p) return 'similar';
  return p.born < c.born ? 'influence' : p.born === c.born ? 'contemporary' : 'influence';
}

/** Lint: arestas tratadas como causais ('influence') em que o pai nasceu depois do filho. Deve ficar vazio. */
export function lintGenreEdges20(): { child: string; parent: string; childBorn: number; parentBorn: number }[] {
  const out: { child: string; parent: string; childBorn: number; parentBorn: number }[] = [];
  for (const g of GENRES) for (const p of g.parents) {
    const pg = genreById[p];
    if (!pg) continue;
    if (pg.born > g.born && genreRel20(g.id, p) === 'influence') out.push({ child: g.id, parent: p, childBorn: g.born, parentBorn: pg.born });
  }
  return out;
}

/** Precursores causais de um gênero (só arestas 'influence' com pai mais velho). */
export function genreInfluences20(gid: string): string[] {
  return (genreById[gid]?.parents ?? []).filter((p) => genreRel20(gid, p) === 'influence' && (genreById[p]?.born ?? 1e9) < (genreById[gid]?.born ?? 0));
}
