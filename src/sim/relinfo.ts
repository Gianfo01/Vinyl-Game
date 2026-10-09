// Ficha do lançamento (rodada 8): faixas com duração (inclusive de discos anteriores à run, que não
// guardam as músicas no save), nota agregada da crítica e dados de catálogo. Tudo determinístico a
// partir do id do lançamento, para não pesar o save.

import { Rng, clamp, hashString } from '../core/rng';
import { cityById } from '../data/world';
import { langForCity, songTitle } from './people';
import type { GameState, Release } from './types';

export interface TrackRow { n: number; title: string; secs: number; songId?: string; q?: number; single?: boolean }

const trackCount = (rel: Release, r: Rng): number =>
  rel.type === 'single' ? 2 : rel.type === 'ep' ? r.int(4, 6) : rel.year < 1966 ? r.int(10, 12) : rel.year < 1990 ? r.int(8, 11) : rel.year < 2010 ? r.int(11, 14) : r.int(10, 16);

function trackSecs(year: number, r: Rng): number {
  const base = year < 1965 ? 150 : year < 1975 ? 210 : year < 2000 ? 245 : year < 2015 ? 225 : 185;
  return Math.round(clamp(r.normal(base, base * 0.18), 95, 540));
}

/** Lista de faixas: as músicas reais do lançamento; discos antigos ganham faixas geradas. */
export function trackList(s: GameState, rel: Release): TrackRow[] {
  const r = Rng.fromSeed(`tracks:${rel.id}:${rel.coverSeed}`);
  const rows: TrackRow[] = rel.songs.map((id, i) => {
    const so = s.songs[id];
    return { n: i + 1, title: so?.title ?? '—', secs: so?.minutes ? Math.round(so.minutes * 60) : trackSecs(rel.year, r), songId: id, q: so?.q, single: i === 0 };
  });
  const want = Math.max(rows.length, rel.songs.length ? rows.length : trackCount(rel, r));
  const act = s.acts[rel.actId];
  const lang = langForCity(act?.city ?? 'london', r);
  // a faixa-título abre o disco quando não há músicas guardadas
  if (!rows.length) rows.push({ n: 1, title: rel.title, secs: trackSecs(rel.year, r), single: true });
  const used = new Set(rows.map((x) => x.title));
  while (rows.length < want) {
    let title = songTitle(r, lang);
    if (used.has(title)) title = `${title} (${rel.type === 'single' ? 'lado B' : 'reprise'})`;
    used.add(title);
    rows.push({ n: rows.length + 1, title, secs: trackSecs(rel.year, r) });
  }
  return rows;
}

export const fmtSecs = (secs: number): string => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

/** Nota agregada da crítica (0–100, estilo "metascore"): média das resenhas ou estimativa da imprensa. */
export function criticScore(s: GameState, rel: Release): { score: number; n: number; estimated: boolean } {
  const rv = s.reviews[rel.id];
  if (rv?.length) return { score: Math.round((rv.reduce((t, x) => t + x.score, 0) / rv.length) * 10), n: rv.length, estimated: false };
  if (rel.critic !== undefined) return { score: rel.critic, n: rel.criticN ?? 0, estimated: false };
  const h = hashString(`crit:${rel.id}`);
  const score = Math.round(clamp(rel.q * 0.95 + ((h % 21) - 10), 15, 98));
  return { score, n: 0, estimated: true };
}

export const scoreClass = (v: number): string => (v >= 75 ? 'good' : v >= 55 ? '' : 'bad');

/** Mercado de origem do lançamento (para mostrar onde foi lançado). */
export function originMarket(s: GameState, rel: Release): string {
  return cityById[s.acts[rel.actId]?.city ?? '']?.market ?? rel.territories[0] ?? 'na';
}
