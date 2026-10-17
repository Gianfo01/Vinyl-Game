// R31 · onda 4 (PRED) — ARTE PRÓPRIA POR TIPO DE PRÉDIO no mapa "Nosso mundo" (puro, sem DOM, sem sorteio).
// Antes, todo lugar do mapa desembocava num dos ~21 `BKind` da simulação e loja de discos, loja de instrumentos,
// padaria, fliperama e locadora saíam da mesma carcaça "store" (só a cor mudava). Aqui fica o tipo de ARTE (`Art31`),
// mais fino que o BKind, e de onde ele vem: prédio seu (BKind), vizinho (nb19), lugar do bairro (place27: tipo, loja
// da época da frente H e porte da casa do LOTE) e lugar real (places31). Só aparência: a simulação continua com o BKind.
// Quem desenha é `pred31px.ts` (chamado por buildingSprite18); o inventário está em docs/r31/pred.md.

import type { BKind } from '../../sim/sys/campus18';
import type { RKind31 } from '../../data/places31';
import type { Nb19 } from '../../sim/sys/hood19';

export type Art31 =
  // prédios do selo (BKind próprios)
  | 'hq' | 'label' | 'sublabel' | 'imprint' | 'studio' | 'venue' | 'fest' | 'school' | 'museum' | 'publisher' | 'plant'
  | 'office' | 'radio' | 'platform' | 'booking' | 'rehearsal' | 'store' | 'sign' | 'dorm' | 'park'
  // moradia (LOTE): prédio de apartamentos, casa, mansão
  | 'apart' | 'house' | 'mansion'
  // lugares do bairro e reais
  | 'records' | 'instruments' | 'bar' | 'press' | 'hotel' | 'facade' | 'police' | 'alley' | 'tv' | 'theatre' | 'arena'
  // lojas da época (frente H)
  | 'sheet' | 'piano' | 'telegraph' | 'gramophone' | 'tailor' | 'cinema' | 'radiotv' | 'diner' | 'jukebox' | 'hifi'
  | 'arcade' | 'video' | 'cdmega' | 'pager' | 'lan' | 'phones' | 'games' | 'vinyl' | 'cafe' | 'holo' | 'bakery'
  // lojas de decoração (DECO-L): móveis/departamentos, antiquário/brechó, galeria (eletrônicos usam 'hifi')
  | 'furniture' | 'antique' | 'gallery';

/** Todos os tipos de arte (ordem da galeria). */
export const ART31_ALL: Art31[] = [
  'hq', 'label', 'sublabel', 'imprint', 'studio', 'venue', 'fest', 'school', 'museum', 'publisher', 'plant', 'office', 'radio', 'platform', 'booking',
  'rehearsal', 'store', 'sign', 'dorm', 'park', 'apart', 'house', 'mansion', 'records', 'instruments', 'bar', 'press', 'hotel', 'facade', 'police', 'alley',
  'tv', 'theatre', 'arena', 'sheet', 'piano', 'telegraph', 'gramophone', 'tailor', 'cinema', 'radiotv', 'diner', 'jukebox', 'hifi', 'arcade', 'video',
  'cdmega', 'pager', 'lan', 'phones', 'games', 'vinyl', 'cafe', 'holo', 'bakery', 'furniture', 'antique', 'gallery',
];
/** Rótulo curto (fonte 3×5, galeria e inventário). */
export const ART31_TAG: Record<Art31, string> = {
  hq: 'SEDE', label: 'GRAVADORA', sublabel: 'SUBSELO', imprint: 'SELO BOUTIQUE', studio: 'ESTUDIO', venue: 'CASA DE SHOWS', fest: 'FESTIVAL', school: 'ESCOLA',
  museum: 'MUSEU', publisher: 'EDITORA', plant: 'FABRICA', office: 'ESCRITORIO', radio: 'RADIO', platform: 'STREAMING', booking: 'AGENCIA TURNE',
  rehearsal: 'ENSAIO', store: 'LOJA DO SELO', sign: 'LETREIRO', dorm: 'ALOJAMENTO', park: 'PRACA', apart: 'APARTAMENTOS', house: 'CASA', mansion: 'MANSAO',
  records: 'LOJA DE DISCOS', instruments: 'INSTRUMENTOS', bar: 'BAR', press: 'JORNAL', hotel: 'HOTEL', facade: 'FACHADA', police: 'DELEGACIA', alley: 'BECO',
  tv: 'TV', theatre: 'TEATRO', arena: 'ARENA', sheet: 'PARTITURAS', piano: 'PIANOS', telegraph: 'TELEGRAFO', gramophone: 'GRAMOFONES', tailor: 'ALFAIATE',
  cinema: 'CINEMA', radiotv: 'RADIOS E TVS', diner: 'LANCHONETE', jukebox: 'BAR JUKEBOX', hifi: 'HI-FI', arcade: 'FLIPERAMA', video: 'LOCADORA',
  cdmega: 'MEGASTORE CD', pager: 'BIPES', lan: 'LAN HOUSE', phones: 'CELULARES', games: 'GAMES', vinyl: 'VINIL', cafe: 'CAFE WI-FI', holo: 'HOLOGRAMAS', bakery: 'PADARIA',
  furniture: 'MOVEIS', antique: 'ANTIQUARIO', gallery: 'GALERIA',
};
/** Carcaça da simulação usada para o tamanho base de cada arte (o desenho ajusta por cima, ver SHAPE em pred31px). */
export const ARTK31: Record<Art31, BKind> = {
  hq: 'hq', label: 'branch', sublabel: 'sublabel', imprint: 'imprint', studio: 'studio', venue: 'venue', fest: 'fest', school: 'school', museum: 'museum',
  publisher: 'publisher', plant: 'plant', office: 'office', radio: 'media', platform: 'platform', booking: 'booking', rehearsal: 'rehearsal', store: 'store',
  sign: 'sign', dorm: 'dorm', park: 'park', apart: 'office', house: 'home', mansion: 'home', records: 'store', instruments: 'store', bar: 'venue',
  press: 'publisher', hotel: 'office', facade: 'venue', police: 'office', alley: 'store', tv: 'media', theatre: 'museum', arena: 'venue',
  sheet: 'store', piano: 'store', telegraph: 'office', gramophone: 'store', tailor: 'store', cinema: 'venue', radiotv: 'store', diner: 'store', jukebox: 'venue',
  hifi: 'store', arcade: 'store', video: 'store', cdmega: 'store', pager: 'store', lan: 'store', phones: 'store', games: 'store', vinyl: 'store', cafe: 'store',
  holo: 'store', bakery: 'store', furniture: 'store', antique: 'store', gallery: 'store',
};

/** Prédio do selo (ou carcaça sem lugar): a arte padrão do BKind. */
export function artOfKind31(k: BKind): Art31 {
  switch (k) {
    case 'branch': return 'label';
    case 'media': return 'radio';
    case 'home': return 'house';
    default: return k;
  }
}
/** Vizinho do bairro (nb19). */
export const NBART31: Record<Nb19['k'], Art31> = { rival: 'label', records: 'records', bar: 'bar', rehearsal: 'rehearsal', radio: 'radio' };
/** Lugar real (places31). */
export const RART31: Record<RKind31, Art31> = { radio: 'radio', tv: 'tv', venue: 'venue', theatre: 'theatre', arena: 'arena', store: 'records', studio: 'studio', label: 'label', fest: 'fest', bar: 'bar' };
/** Loja da época (BIZ31.id → arte). */
export const BIZART31: Record<string, Art31> = {
  sheet: 'sheet', piano: 'piano', telegraph: 'telegraph', gramophone: 'gramophone', tailor: 'tailor', instruments: 'instruments', cinema: 'cinema',
  radio_tv: 'radiotv', records: 'records', diner: 'diner', jukebox_bar: 'jukebox', hifi: 'hifi', arcade: 'arcade', video: 'video', cd_mega: 'cdmega',
  pager: 'pager', lan: 'lan', phones: 'phones', games: 'games', vinyl: 'vinyl', cowork: 'cafe', holo: 'holo', bakery: 'bakery',
};
/** Loja de decoração (DECO-L, Place27.deco31) → arte. */
export const DECOART31: Record<'furniture' | 'antique' | 'hifi' | 'gallery', Art31> = { furniture: 'furniture', antique: 'antique', hifi: 'hifi', gallery: 'gallery' };
/** Faixa de época usada pela arte (igual às do resto do mapa): 0 = 1889–1919 … 5 = 2010–2040. */
export const eraIx31 = (y: number): number => (y < 1920 ? 0 : y < 1950 ? 1 : y < 1970 ? 2 : y < 1990 ? 3 : y < 2010 ? 4 : 5);
