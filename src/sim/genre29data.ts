// Rodada 29 — gênero sugerido para a banda do jogador na Nova run (rápida e completa usam ESTES setters, então as duas dão
// a mesma RunConfig). Em vez do primeiro gênero em ordem alfabética ("Adhunik gaan" em Londres, 1962), o rascunho sugere
// o que faz sentido na cidade e no ano, pesando:
//   - a cena da cidade (City.scenes) e as cenas das outras cidades do mesmo país e da mesma região;
//   - o gosto do submercado por época (regions18: chave por gênero OU família, na escala de MARKET_PREF);
//   - o gosto do país pela família no ano (countries.ts countryTaste);
//   - a idade do gênero no ano (gêneros nascidos há pouco são a novidade; muito antigos perdem força, como o genrePop
//     inicial do worldgen, que só vale para gêneros já nascidos).
// Só o rascunho NOVO (fábrica newRunConfig20 → `genre29`) recebe a sugestão; configurações com bandGenre próprio (bots,
// testes, códigos de run, cenários) não mudam. Puro (só dados): testável.

import { countryInfoByA3, countryTaste } from '../data/countries';
import { countryOfCity } from '../data/geo';
import { subById18, subOfA3_18, type Sub18 } from '../data/regions18';
import { CITIES, GENRES, MARKET_PREF, cityById, familyOf, genreById, type Genre } from '../data/world';
import type { RunConfig } from './types';

/** Quantas sugestões o 🎲 percorre. */
export const GENRE29_TOP = 5;

/** Gosto do submercado por gênero na época (mesma regra de sys/regions18 tasteBase18, sem os ganchos do motor). */
function subTaste(sub: Sub18, g: string, y: number): number {
  const fam = familyOf(g);
  const fb = MARKET_PREF[sub.mk][fam] ?? 0.6;
  const eras = sub.taste;
  if (!eras.length) return fb;
  let i = 0;
  while (i + 1 < eras.length && eras[i + 1][0] <= y) i++;
  const va = eras[i][1][g] ?? eras[i][1][fam] ?? fb;
  const b = eras[i + 1];
  if (!b || y <= eras[i][0]) return va;
  const vb = b[1][g] ?? b[1][fam] ?? fb;
  return va + ((vb - va) * (y - eras[i][0])) / (b[0] - eras[i][0]);
}

/** Força do gênero no ano para uma banda nova: a novidade dos últimos anos pesa mais; o que tem mais de 20 anos cai. */
export function eraW29(g: Genre, y: number): number {
  const age = y - g.born;
  if (age < 0) return 0;
  if (age === 0) return 0.8; // nasceu no ano: ainda é coisa de poucos
  if (age === 1) return 1.05;
  if (age <= 12) return 1.2;
  if (age <= 20) return 1;
  return Math.max(0.2, 1 - (age - 20) / 35);
}

const cache = new Map<string, { id: string; w: number }[]>();
/** Todos os gêneros vivos no ano, do mais ao menos indicado para uma banda nova na cidade. */
export function genreScores29(city: string, year: number): { id: string; w: number }[] {
  const key = `${city}|${year}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = cityById[city];
  const a3 = countryOfCity(city);
  const sub = subById18[subOfA3_18(a3) ?? ''];
  const info = a3 ? countryInfoByA3[a3] : undefined;
  const mk = c?.market ?? 'na';
  const sameCountry = new Set<string>(), sameMarket = new Set<string>();
  for (const x of CITIES) {
    if (x.id === city) continue;
    if (a3 && countryOfCity(x.id) === a3) for (const s of x.scenes) sameCountry.add(s);
    else if (x.market === mk) for (const s of x.scenes) sameMarket.add(s);
  }
  const out = GENRES.filter((g) => g.born <= year).map((g) => {
    const fam = familyOf(g.id);
    const taste = sub ? subTaste(sub, g.id, year) : MARKET_PREF[mk][fam] ?? 0.6;
    const ct = info ? countryTaste(info, fam, year) : 0.5;
    const scene = c?.scenes.includes(g.id) ? 2.2 : sameCountry.has(g.id) ? 1.6 : sameMarket.has(g.id) ? 1.15 : 1;
    return { id: g.id, w: Math.round(taste * (0.6 + ct) * scene * eraW29(g, year) * 1000) / 1000 };
  }).sort((a, b) => b.w - a.w || a.id.localeCompare(b.id));
  if (cache.size > 500) cache.clear();
  cache.set(key, out);
  return out;
}

/** As sugestões que o 🎲 percorre (as mais indicadas). */
export const suggestGenres29 = (city: string, year: number, n = GENRE29_TOP): string[] => genreScores29(city, year).slice(0, n).map((x) => x.id);

/** Gênero automático do rascunho (índice `genre29` entre as sugestões). */
export function autoGenre29(cfg: Pick<RunConfig, 'homeCity' | 'startYear' | 'genre29'>): string | undefined {
  const xs = suggestGenres29(cfg.homeCity, cfg.startYear);
  return xs.length ? xs[(cfg.genre29 ?? 0) % xs.length] : undefined;
}

/** Mantém o gênero do rascunho coerente (chamado por draftDefaults27 e pelo bloco da banda da configuração completa):
 *  automático segue cidade e ano; escolhido fica, a não ser que ainda não exista no ano (aí vira a melhor sugestão). */
export function syncGenre29(cfg: RunConfig): void {
  if (cfg.genre29 !== undefined) { cfg.bandGenre = autoGenre29(cfg) ?? cfg.bandGenre; return; }
  const g = cfg.bandGenre ? genreById[cfg.bandGenre] : undefined;
  if (!g || g.born > cfg.startYear) cfg.bandGenre = suggestGenres29(cfg.homeCity, cfg.startYear, 1)[0] ?? cfg.bandGenre;
}

/** Escolha explícita na lista (deixa de ser automático). Gênero que ainda não existe no ano é ignorado. */
export function setBandGenre29(cfg: RunConfig, id: string): void {
  const g = genreById[id];
  if (!g || g.born > cfg.startYear) return;
  cfg.bandGenre = id;
  delete cfg.genre29;
}

/** 🎲: próxima sugestão para a cidade e o ano (volta a ser automático). */
export function rollGenre29(cfg: RunConfig): void {
  const xs = suggestGenres29(cfg.homeCity, cfg.startYear);
  const cur = cfg.genre29 ?? Math.max(-1, xs.indexOf(cfg.bandGenre ?? ''));
  cfg.genre29 = xs.length ? (cur + 1) % xs.length : 0;
  syncGenre29(cfg);
}

/** Mudou a cidade ou o ano: o 🎲 recomeça pela melhor sugestão do novo lugar (gênero escolhido na lista fica). */
export function placeChanged29(cfg: Pick<RunConfig, 'genre29'>): void {
  if (cfg.genre29 !== undefined) cfg.genre29 = 0;
}
