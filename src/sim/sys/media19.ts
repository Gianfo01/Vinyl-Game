// Rodada 19 (Frente 10 WP-I, onda 3 — T9) — liga os dados novos de mídia aos módulos consumidores (append-only, sem
// duplicar): veículos (media17 → outlets17/press), programas de talento (tv18), covers/samples e cenas locais
// (heritage17), relíquias (relics17 → crime17/leilões/heirs8) e crime documentado (orgs17 → crime17). Os programas-vitrine
// (SHOWS19) e as contagens ficam aqui para eventos (media19ev), páginas e testes.

import { COVERS17, SCENES17 } from '../../data/heritage17';
import { COVERS19, FR19, OUTLETS19, SCENES19, SHOWS19, type Show19 } from '../../data/media19';
import { DOC19, ORGS19, RELICS19 } from '../../data/media19b';
import { OUTLETS17 } from '../../data/media17';
import { DOC17, ORGS17 } from '../../data/orgs17';
import { cityById, l, type L, type MarketId } from '../../data/world';
import { EVENTS } from '../events';
import { RELICS17 } from '../relics17';
import type { GameState } from '../types';
import { FR18 } from './tv18';
import { SITS } from './situations17';

for (const x of OUTLETS19) if (!OUTLETS17.some((y) => y.id === x.id)) OUTLETS17.push(x);
for (const x of FR19) if (!FR18.some((y) => y.id === x.id)) FR18.push(x);
for (const x of COVERS19) if (!COVERS17.some((y) => y[0] === x[0] && y[3] === x[3])) COVERS17.push(x);
for (const x of SCENES19) if (!SCENES17.some((y) => y[0] === x[0])) SCENES17.push(x);
for (const x of RELICS19) if (!RELICS17.some((y) => y.id === x.id)) RELICS17.push(x);
for (const x of ORGS19) if (!ORGS17.some((y) => y.id === x.id)) ORGS17.push(x);
for (const x of DOC19) if (!DOC17.some((y) => y.y === x.y && y.m === x.m && y.text.en === x.text.en)) DOC17.push(x);

export const homeMk19 = (s: GameState): MarketId => (cityById[s.config.homeCity]?.market ?? 'na') as MarketId;
/** Programas-vitrine no ar no ano (e no mercado, se dado). */
export const showsNow19 = (s: GameState, mk?: MarketId): Show19[] => SHOWS19.filter((x) => s.year >= x.from && s.year <= x.to && (!mk || x.mk.includes(mk)));
export const showName19 = (s: GameState, x: Show19): string => (s.config.realNames ? x.real : x.alt.pt);
export const showNameL19 = (s: GameState, x: Show19): L => (s.config.realNames ? l(x.real, x.real) : x.alt);

/** Tamanho do banco de mídia (página "Arquivo" e teste da onda 3). */
export function media19Counts(): Record<string, number> {
  return { events: EVENTS.length, situations: SITS.length, outlets: OUTLETS17.length, formats: FR18.length + SHOWS19.length, covers: COVERS17.length, scenes: SCENES17.length, relics: RELICS17.length, orgs: ORGS17.length, chronicles: DOC17.length };
}
