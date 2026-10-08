// Motor de locais em pixel art: desenha um local por tipo e era (fundo, móveis, plateia) com pontos
// onde os personagens ficam. Use placeView() para um canvas animado e acessível.

import { l, type L } from '../../../data/world';
import type { PlaceKind } from '../../../sim/sys/scenes/state';
import { PALETTES, eraOf } from '../palette';
import { newCtx, finish, type PlaceModel } from './model';
import * as R from './rooms';
import * as V from './venues';

export type { PlaceKind } from '../../../sim/sys/scenes/state';
export type { PlaceModel, Spot } from './model';
export { placeView, type Actor, type PlaceFx, type PlaceViewOpts } from './view';

export const PLACE_NAMES: Record<PlaceKind, L> = {
  awards: l('Cerimônia de premiação', 'Awards ceremony'),
  tv_talk: l('Talk show', 'Talk show'),
  tv_variety: l('Show de variedades (P&B)', 'Variety show (B&W)'),
  tv_auditorium: l('Programa de auditório', 'Studio-audience show'),
  tv_chart: l('Parada musical na TV', 'TV chart show'),
  tv_clips: l('Canal de clipes', 'Music video channel'),
  podcast: l('Podcast em vídeo', 'Video podcast'),
  livestream: l('Live', 'Livestream'),
  venue_bar: l('Bar', 'Bar'),
  venue_club: l('Clube de shows', 'Music club'),
  venue_theatre: l('Teatro', 'Theatre'),
  venue_gym: l('Ginásio', 'Gymnasium'),
  venue_arena: l('Arena', 'Arena'),
  venue_stadium: l('Estádio', 'Stadium'),
  venue_festival: l('Campo de festival', 'Festival field'),
  radio_am: l('Rádio AM', 'AM radio'),
  radio_fm: l('Rádio FM', 'FM radio'),
  curators: l('Sala de curadoria', 'Curators\' room'),
  factory: l('Fábrica de discos', 'Pressing plant'),
  store: l('Loja de discos', 'Record store'),
  backstage: l('Camarim', 'Dressing room'),
  tour_bus: l('Ônibus de turnê', 'Tour bus'),
  airport: l('Aeroporto', 'Airport'),
  hotel: l('Quarto de hotel', 'Hotel room'),
  court: l('Tribunal', 'Courtroom'),
  boardroom: l('Sala do conselho', 'Boardroom'),
  exchange: l('Pregão da bolsa', 'Stock exchange floor'),
  dance_club: l('Pista de dança', 'Dance club'),
  video_set: l('Set de clipe e fotos', 'Video & photo set'),
  country_house: l('Casa de campo', 'Country house'),
  clinic: l('Clínica', 'Clinic'),
  funeral: l('Despedida', 'Farewell'),
  mansion: l('Mansão', 'Mansion'),
  street: l('Rua', 'Street'),
  trade_fair: l('Feira do setor', 'Trade fair'),
  holo_stage: l('Palco holográfico', 'Hologram stage'),
};

type Builder = (c: ReturnType<typeof newCtx>) => void;

const BUILD: Record<PlaceKind, Builder> = {
  awards: V.awards,
  tv_talk: (c) => V.tvStudio(c, 'talk'),
  tv_variety: (c) => V.tvStudio(c, 'variety'),
  tv_auditorium: (c) => V.tvStudio(c, 'auditorium'),
  tv_chart: (c) => V.tvStudio(c, 'chart'),
  tv_clips: (c) => V.tvStudio(c, 'clips'),
  podcast: V.podcast,
  livestream: V.livestream,
  venue_bar: (c) => V.venue(c, 0),
  venue_club: (c) => V.venue(c, 1),
  venue_theatre: (c) => V.venue(c, 2),
  venue_gym: (c) => V.venue(c, 3),
  venue_arena: (c) => V.venue(c, 4),
  venue_stadium: (c) => V.venue(c, 5),
  venue_festival: (c) => V.venue(c, 6),
  radio_am: (c) => R.radio(c, 'am'),
  radio_fm: (c) => R.radio(c, 'fm'),
  curators: (c) => R.radio(c, 'curators'),
  factory: R.factory,
  store: R.store,
  backstage: R.backstage,
  tour_bus: R.tourBus,
  airport: R.airport,
  hotel: R.hotel,
  court: R.court,
  boardroom: R.boardroom,
  exchange: R.exchange,
  dance_club: V.danceClub,
  video_set: R.videoSet,
  country_house: R.countryHouse,
  clinic: R.clinic,
  funeral: R.funeral,
  mansion: R.mansion,
  street: R.street,
  trade_fair: R.tradeFair,
  holo_stage: V.holoStage,
};

const cache = new Map<string, PlaceModel>();

/** Modelo do local (cacheado por tipo, era e variante). */
export function buildPlace(kind: PlaceKind, year: number, variant = 0): PlaceModel {
  const era = eraOf(year);
  // a fábrica muda em 1983 (linha de CD) mesmo dentro da era
  const key = `${kind}|${era}|${variant}|${kind === 'factory' && year >= 1983 ? 'cd' : ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = newCtx(PALETTES[era], year, variant);
  (BUILD[kind] ?? V.awards)(c);
  c.p.outline(PALETTES[era].outline);
  const m = finish(c);
  cache.set(key, m);
  if (cache.size > 60) cache.delete(cache.keys().next().value as string);
  return m;
}

/** Locais que fazem sentido em um ano (galeria "Lugares"). */
export function placesOfYear(year: number): PlaceKind[] {
  const tv: PlaceKind[] = year < 1950 ? [] : year < 1962 ? ['tv_variety'] : year < 1982 ? ['tv_auditorium', 'tv_chart'] : year < 1996 ? ['tv_clips', 'tv_chart', 'tv_talk'] : year < 2010 ? ['tv_talk'] : year < 2022 ? ['podcast', 'tv_talk'] : ['livestream', 'podcast'];
  const radio: PlaceKind[] = year >= 2008 ? ['curators'] : year >= 1966 ? ['radio_fm'] : ['radio_am'];
  const venues: PlaceKind[] = ['venue_bar', 'venue_club', 'venue_theatre'];
  if (year >= 1950) venues.push('venue_gym');
  if (year >= 1965) venues.push('venue_stadium', 'venue_festival');
  if (year >= 1975) venues.push('venue_arena');
  const biz: PlaceKind[] = ['factory', 'store', 'court', 'boardroom'];
  if (year >= 1950) biz.push('exchange', 'trade_fair');
  const life: PlaceKind[] = ['backstage', 'tour_bus', 'hotel', 'dance_club', 'country_house', 'clinic', 'funeral', 'mansion', 'street'];
  if (year >= 1950) life.push('airport');
  if (year >= 1981) life.push('video_set');
  if (year >= 2027) life.push('holo_stage');
  return ['awards', ...tv, ...radio, ...venues, ...biz, ...life];
}

/** Local da casa de show por porte (0 bar … 4 estádio, como VENUE_TIERS). */
export function venueOfTier(tier: number, festival = false): PlaceKind {
  if (festival) return 'venue_festival';
  return (['venue_bar', 'venue_club', 'venue_theatre', 'venue_arena', 'venue_stadium'] as PlaceKind[])[Math.max(0, Math.min(4, tier))];
}
