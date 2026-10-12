// Rodada 23 (D) — COERÊNCIA TEMPORAL E GEOGRÁFICA NA VITRINE.
//  - Um ato real pode carregar o gênero pelo qual ficou conhecido (Jimi Hendrix Experience = Psicodelia, 1965;
//    Willie Nelson = Outlaw country, 1972). Antes do gênero nascer, os cartões mostram o gênero que JÁ existe no ano
//    (o ancestral mais novo já nascido, via GENRES.parents) com a etiqueta "pioneiro de <gênero>".
//  - Atos procedurais com gênero regional fora da sua terra (ranchera em Odessa, kayōkyoku em Vancouver) ficam mais
//    raros e, quando saem, levam uma nota de origem (act.origin23 = "diáspora mexicana").
// Módulo puro.

import { cityById, familyOf, genreById, l, type FamilyId, type L, type MarketId } from '../data/world';
import { FORMATS, TECHS } from '../data/rules';

export interface EraGenre23 {
  /** gênero a mostrar no ano */
  id: string;
  /** o gênero do ato ainda não nasceu: o ato é pioneiro dele */
  pioneer: boolean;
  /** o gênero do ato (sempre o original) */
  real: string;
}

/** Gênero exibível em `year`: o próprio, se já nasceu; senão o ancestral mais novo já nascido (busca em largura). */
export function eraGenre23(gid: string, year: number): EraGenre23 {
  const g = genreById[gid];
  if (!g || g.born <= year || gid.startsWith('mv_')) return { id: gid, pioneer: false, real: gid };
  const seen = new Set<string>([gid]);
  let frontier = [...g.parents];
  while (frontier.length) {
    const born = frontier.map((p) => genreById[p]).filter((p) => p && p.born <= year).sort((a, b) => b.born - a.born);
    if (born.length) return { id: born[0].id, pioneer: true, real: gid };
    const next: string[] = [];
    for (const p of frontier) {
      if (seen.has(p)) continue;
      seen.add(p);
      next.push(...(genreById[p]?.parents ?? []));
    }
    frontier = next.filter((p) => !seen.has(p));
  }
  // sem ancestral já nascido: mostra o próprio (raro; gêneros-raiz nascem cedo), ainda marcado como pioneiro
  return { id: gid, pioneer: true, real: gid };
}

// ---------------------------------------------------------------- gênero × cidade (atos procedurais)

/** Famílias regionais e os mercados onde são "da terra" (as demais famílias circulam no mundo todo). */
const HOME23: Partial<Record<FamilyId, MarketId[]>> = {
  latin: ['latam'], brazil: ['br'], africa: ['africa'], asia_me: ['asia', 'africa'], europe: ['eu'], caribbean: ['latam', 'na'],
};
const JA23 = new Set(['enka', 'city_pop', 'kayokyoku', 'visual_kei', 'anison', 'vocaloid_pop', 'jpop']);
const KO23 = new Set(['trot', 'kpop']);
const ZH23 = new Set(['cantopop', 'shidaiqu', 'mandopop']);
const IN23 = new Set(['indian_classical', 'bollywood', 'ghazal_pop', 'bhangra', 'qawwali_fusion']);
const AR23 = new Set(['arabic_classical', 'arabic_pop', 'khaleeji']);

function hasAncestor(gid: string, root: string, depth = 0): boolean {
  if (gid === root) return true;
  if (depth > 6) return false;
  return (genreById[gid]?.parents ?? []).some((p) => hasAncestor(p, root, depth + 1));
}

/** Nota de origem para um gênero fora da sua terra (ex.: ranchera em Odessa = "diáspora mexicana"). */
export function originNote23(gid: string): L {
  const f = familyOf(gid);
  if (f === 'latin') return hasAncestor(gid, 'ranchera') || gid === 'corridos_tumbados' ? l('diáspora mexicana', 'Mexican diaspora') : l('diáspora latino-americana', 'Latin American diaspora');
  if (f === 'brazil') return l('diáspora brasileira', 'Brazilian diaspora');
  if (f === 'africa') return l('diáspora africana', 'African diaspora');
  if (f === 'caribbean') return l('diáspora caribenha', 'Caribbean diaspora');
  if (f === 'europe') return l('comunidade de imigrantes europeus', 'European immigrant community');
  if (JA23.has(gid)) return l('comunidade nipo-descendente', 'Japanese community');
  if (KO23.has(gid)) return l('comunidade coreana', 'Korean community');
  if (ZH23.has(gid)) return l('comunidade chinesa', 'Chinese community');
  if (IN23.has(gid)) return l('diáspora sul-asiática', 'South Asian diaspora');
  if (AR23.has(gid)) return l('diáspora árabe', 'Arab diaspora');
  return l('comunidade imigrante', 'immigrant community');
}

/** O gênero combina com a cidade? (cena local, família global, mercado de origem ou família presente nas cenas) */
export function cityGenreFit23(cityId: string, gid: string): boolean {
  const c = cityById[cityId];
  if (!c || c.scenes.includes(gid) || gid.startsWith('mv_')) return true;
  const f = familyOf(gid);
  const home = HOME23[f];
  if (!home) return true;
  if (home.includes(c.market)) return true;
  return c.scenes.some((x) => genreById[x] && familyOf(x) === f);
}

/** Peso de sorteio para gênero fora da terra (atos procedurais): bem menor, mas possível (diásporas existem). */
export const MISFIT_W23 = 0.15;

// ---------------------------------------------------------------- formatos com data alternativa

/** Ano em que a tecnologia do formato chegou NESTA história e o ano real (só quando diferem). */
export function formatArrival23(techDates: Record<string, number> | undefined, fid: string): { here: number; real: number } | null {
  const f = FORMATS.find((x) => x.id === fid);
  const tech = f?.tech ? TECHS.find((x) => x.id === f.tech) : undefined;
  const here = tech ? techDates?.[tech.id] : undefined;
  if (!tech || here === undefined || Math.round(here) === tech.base) return null;
  return { here: Math.round(here), real: tech.base };
}
