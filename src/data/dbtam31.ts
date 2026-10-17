// R31 · frente DBTAM — em que tamanho de base de dados entra cada artista das bases novas (BR, IT, HITS).
// Critério objetivo por notoriedade, só com o que está fichado em cada base (nada de opinião):
//   Média (z 1)   o núcleo: estrelas e grandes nomes (t ≤ 2), vencedores de Sanremo/Eurovision, carreiras longas com
//                 discografia ampla (BR), artistas com nº 1 nos EUA/Reino Unido/mundo e mais de um top 10 que não são
//                 one-hit wonders (HITS).
//   Grande (z 2)  o degrau seguinte: carreira de 15+ anos com 2+ discos fichados, ou de 30+ anos (BR/IT), quem tem 10+ lançamentos no
//                 MusicBrainz (IT 2ª passada), quem tem hit no top 10 sem ser one-hit wonder, e o one-hit wonder que foi
//                 nº 1 nos EUA/Reino Unido/mundo (HITS).
//   Enorme (z 3)  a cauda longa: carreiras curtas ou pouco documentadas, artistas regionais, MusicBrainz com < 10
//                 lançamentos e os demais one-hit wonders.
// Pequena (z 0) não recebe nada das bases novas (só os principais nomes das listas originais, como sempre).
// Aplicado na carga (sim/sys/realworld.ts), sobrescrevendo o `z` gravado nos dados; tabela e contagens em docs/r31/dbtam.md.
import type { RealArtist } from './realtypes';
import type { HitSrc31 } from './hits31types';
import type { It31 } from './base31it';
import type { BrNote31 } from './base31br';

export type Z31 = 1 | 2 | 3;
/** ano de referência para quem ainda está ativo (sem fim fichado) */
const NOW31 = 2025;
const career = (a: RealArtist): number => (a.e ?? NOW31) - a.d;
const discs = (a: RealArtist): number => a.al?.length ?? 0;

/** Degrau Grande das bases BR/IT (curadoria): carreira de 15+ anos com 2+ discos fichados, ou de 30+ anos. */
const longCareer = (a: RealArtist): boolean => (career(a) >= 15 && discs(a) >= 2) || career(a) >= 30;

/** BASE-BR: estrela/grande nome, ou carreira de 20+ anos com 3+ discos e 2+ fontes → Média; carreira longa → Grande. */
export function zBr31(a: RealArtist, note?: BrNote31): Z31 {
  if (a.t <= 2 || (career(a) >= 20 && discs(a) >= 3 && (note?.f.length ?? 0) >= 2)) return 1;
  return longCareer(a) ? 2 : 3;
}

/** BASE-IT: curadoria (1ª passada) — t ≤ 2 ou vencedor de Sanremo/Eurovision → Média; carreira longa → Grande.
 *  MusicBrainz (2ª passada, fonte `mb:`): 10+ lançamentos → Grande; menos (o `z: 2` gravado no dado) → Enorme. */
export function zIt31(x: It31): Z31 {
  const a = x.a;
  if (x.fo.some((f) => f.startsWith('mb:'))) return a.z === 2 ? 3 : 2;
  if (a.t <= 2 || x.fo.some((f) => /^(sr|ev)\d{4}$/.test(f))) return 1;
  return longCareer(a) ? 2 : 3;
}

const BIG31 = new Set(['US', 'UK', 'WW']);
/** BASE-HITS: pelos hits fichados (`h` + `h2`, top 10 de parada oficial) e a marca de one-hit wonder (`o`). */
export function zHit31(h: HitSrc31): Z31 {
  const hits = [h.h, ...(h.h2 ?? [])];
  const n1 = hits.filter((x) => x[3] === 1);
  const n1Big = n1.some((x) => BIG31.has(x[2]));
  if (!h.o && n1Big && hits.length >= 2) return 1;
  if (!h.o || n1Big) return 2;
  return 3;
}

/** Listas antigas (antes do lote Z): estrela global (t 1) que ficou só na Grande (z 2) volta para a Média — Herbert
 *  Grönemeyer, Flume, aespa, IVE, LE SSERAFIM, Tate McRae, Jorge e Mateus, Paulo Londra. Devolve os índices promovidos.
 *  A cota por país (dar à França, Alemanha, Japão… seus grandes nomes t 2 na Média) foi medida e ficou de fora: +272 atos
 *  custavam +11% a +23% no mês da Média (docs/r31/dbtam.md, "Reequilíbrio por país"). */
export function rebalance31(all: RealArtist[], oldTo: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < oldTo; i++) if (all[i].z === 2 && all[i].t === 1) out.push(i);
  return out;
}
