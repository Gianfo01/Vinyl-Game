// Catálogo do Universo: 100 atos (arquétipos), 22 gravadoras, festivais, mídia,
// casas e estúdios. A coluna "referência real" do documento é interna e NÃO entra
// no build (Catálogo, regra 4; GDD §26).

import { l, type L } from './world';

export interface CatalogAct {
  no: number;
  name: string;
  genre: string;
  debut: number;
  city: string;
  members: number;
  /** Regra de separação reforçada: biografia ficcional deve divergir */
  rs?: boolean;
  synthetic?: boolean;
}

const a = (no: number, name: string, genre: string, debut: number, city: string, members: number, rs = false, synthetic = false): CatalogAct =>
  ({ no, name, genre, debut, city, members, rs, synthetic });

export const CATALOG_ACTS: CatalogAct[] = [
  a(1, 'Ida Cypress', 'classic_blues', 1923, 'memphis', 1),
  a(2, 'Gideon Brass', 'nola_jazz', 1924, 'new_orleans', 1),
  a(3, 'Orquestra Valmont', 'big_band', 1926, 'new_york', 6),
  a(4, 'Ramiro Alcázar', 'tango', 1922, 'buenos_aires', 1, true),
  a(5, 'Silas Crowfoot', 'delta_blues', 1936, 'memphis', 1, true),
  a(6, 'Dulce Sampaio', 'samba_cancao', 1932, 'rio', 1),
  a(7, 'Anselme Bellegarde', 'gypsy_jazz', 1934, 'paris', 4),
  a(8, 'Wade Calloway', 'country', 1927, 'nashville', 1),
  a(9, 'Mireille Sauvage', 'chanson', 1935, 'paris', 1),
  a(10, 'Heitor da Penha', 'samba', 1930, 'rio', 1),
  a(11, 'Vince Albrecht', 'trad_pop', 1940, 'new_york', 1),
  a(12, 'Nella Whitmore', 'vocal_jazz', 1935, 'new_york', 1, true),
  a(13, 'Clay Lonnigan', 'honky_tonk', 1947, 'nashville', 1, true),
  a(14, 'Jesse Calder', 'rnr', 1954, 'memphis', 2, true),
  a(15, 'Marcus Flint', 'rnr', 1955, 'chicago', 1),
  a(16, 'Duke Lazarus', 'rnr', 1955, 'new_orleans', 1),
  a(17, 'Cal Redmond', 'country', 1955, 'memphis', 2),
  a(18, 'Henrique Maré', 'bossa', 1958, 'rio', 1),
  a(19, 'Lia Montefiore', 'canzone', 1958, 'milan', 1),
  a(20, 'Azucena Brava', 'salsa', 1950, 'havana', 1),
  a(21, 'Lucian Hale', 'cool_jazz', 1951, 'new_york', 4),
  a(22, 'Amos Delacroix', 'rnb', 1954, 'new_york', 1),
  a(23, 'Sebastião do Araripe', 'baiao', 1946, 'recife', 2),
  a(24, 'Arjun Devraj', 'indian_classical', 1955, 'mumbai', 1),
  a(25, 'Aristídes do Morro', 'samba', 1934, 'rio', 1),
  a(26, 'The Lanternmen', 'pop_rock', 1962, 'liverpool', 4),
  a(27, 'The Brick Lane Hounds', 'blues_rock', 1962, 'london', 4),
  a(28, 'Eli Whitaker', 'folk', 1961, 'new_york', 1),
  a(29, 'The Coral Sands', 'surf', 1961, 'los_angeles', 4),
  a(30, 'Julian Starling', 'psychedelic', 1966, 'london', 3, true),
  a(31, 'Maggie Ravensworth', 'blues_rock', 1966, 'los_angeles', 1, true),
  a(32, 'Odessa Grant', 'soul', 1961, 'detroit', 1),
  a(33, 'Brother Hardwick', 'funk', 1965, 'new_york', 1),
  a(34, 'Os Plenilúnios', 'tropicalia', 1966, 'sao_paulo', 3),
  a(35, 'Lúcia Brandão', 'mpb', 1965, 'sao_paulo', 1),
  a(36, 'Gaspard Valcour', 'chanson_pop', 1958, 'paris', 1),
  a(37, 'Cobalt Transit', 'art_rock', 1964, 'new_york', 4),
  a(38, 'Meridian Garden', 'prog', 1965, 'london', 4),
  a(39, 'The Starlight Sisters', 'girl_group', 1961, 'detroit', 3),
  a(40, 'Ironwood Falcon', 'hard_rock', 1968, 'london', 4),
  a(41, 'Kayode Marlow & The Sunrise Collective', 'afrobeat', 1968, 'lagos', 6, true),
  a(42, 'Ricardo Montalvão', 'jovem_guarda', 1963, 'rio', 1),
  a(43, 'Orion Vale', 'glam', 1969, 'london', 1),
  a(44, 'Velvet Regency', 'hard_rock', 1970, 'london', 4),
  a(45, 'Cinder Parish', 'heavy_metal', 1969, 'manchester', 4),
  a(46, 'Winston Dacosta & The Hightide', 'reggae', 1968, 'kingston', 4),
  a(47, 'Marlon Teague', 'soul', 1963, 'detroit', 1),
  a(48, 'Lumen Nordica', 'nordic_pop', 1972, 'stockholm', 4),
  a(49, 'Sunny Vasquez', 'disco', 1975, 'new_york', 1),
  a(50, 'The Rosemont Brothers', 'disco', 1967, 'manchester', 3),
  a(51, 'The Concrete Cousins', 'punk', 1974, 'new_york', 4),
  a(52, 'Gutterglass', 'punk', 1975, 'london', 4, true),
  a(53, 'Barricade Radio', 'punk', 1976, 'london', 4),
  a(54, 'Rhea Stoneman', 'punk', 1975, 'new_york', 1),
  a(55, 'Lichtstrom', 'krautrock', 1970, 'berlin', 3),
  a(56, 'Willow Ashdown', 'folk', 1968, 'los_angeles', 1),
  a(57, 'Galaxy Kitchen Orchestra', 'funk', 1970, 'detroit', 5),
  a(58, 'Jorge Bandeira', 'soul_br', 1970, 'rio', 1),
  a(59, 'Larkspur Road', 'soft_rock', 1975, 'los_angeles', 4),
  a(60, 'Altamiro Serra', 'mpb', 1967, 'bh', 1),
  a(61, 'Dorian Lake', 'dance_pop', 1982, 'los_angeles', 1, true),
  a(62, 'Dahlia Rush', 'dance_pop', 1982, 'new_york', 1),
  a(63, 'Sylvan Midnight', 'funk', 1978, 'chicago', 1, true),
  a(64, 'Celeste Maddox', 'pop_rnb', 1985, 'new_york', 1, true),
  a(65, 'Saint Brigid Avenue', 'arena_rock', 1980, 'dublin', 4),
  a(66, 'The Mill Street Wake', 'indie', 1982, 'manchester', 4),
  a(67, 'Pale Foundry', 'post_punk', 1980, 'manchester', 4),
  a(68, 'Static Garden', 'synthpop', 1980, 'london', 4),
  a(69, 'Uptown Triple', 'hiphop', 1983, 'new_york', 3),
  a(70, 'Dissent Unit', 'hiphop', 1985, 'new_york', 4),
  a(71, 'Scarlet Verdict', 'thrash', 1981, 'los_angeles', 4),
  a(72, 'Thorn & Gasoline', 'hard_rock', 1985, 'los_angeles', 4),
  a(73, 'Planalto Vermelho', 'rock_br', 1982, 'sao_paulo', 4),
  a(74, 'Sakura Circuit', 'synthpop', 1978, 'tokyo', 3),
  a(75, 'Cielo Eléctrico', 'rock_latino', 1982, 'buenos_aires', 3),
  a(76, 'Hollow Pines', 'grunge', 1987, 'seattle', 3, true),
  a(77, 'Argon Frequency', 'alt_rock', 1985, 'london', 4),
  a(78, 'Cloud Terrace', 'britpop', 1991, 'manchester', 4),
  a(79, 'Neon Five', 'dance_pop', 1994, 'london', 4),
  a(80, 'Starboys', 'boy_band', 1993, 'los_angeles', 4),
  a(81, 'Midtown Cipher', 'jazz_rap', 1988, 'new_york', 3),
  a(82, 'Pacific Drawl', 'gfunk', 1992, 'los_angeles', 3),
  a(83, 'Nine Gates Collective', 'hiphop', 1992, 'new_york', 5),
  a(84, 'Verre Noir', 'french_house', 1994, 'paris', 2),
  a(85, 'Marisol Cardona', 'pop_latino', 1993, 'bogota', 1),
  a(86, 'Salón Habanero de Oro', 'son', 1996, 'havana', 5),
  a(87, 'Nia Rousseau', 'pop_rnb', 1997, 'los_angeles', 1),
  a(88, 'Dupla Sertão Azul', 'sertanejo', 1975, 'sao_paulo', 2),
  a(89, 'Hallie Winter', 'country_pop', 2006, 'nashville', 1),
  a(90, 'Dorsey Knox', 'hiphop', 2011, 'los_angeles', 1),
  a(91, 'El Coyote Azul', 'reggaeton', 2016, 'havana', 1),
  a(92, 'Bela Cordeiro', 'funk_carioca', 2012, 'rio', 1),
  a(93, 'Tobi Sade', 'afrobeats', 2012, 'lagos', 1),
  a(94, 'Sloane Eiden', 'bedroom_pop', 2015, 'los_angeles', 1),
  a(95, 'Crescent Seven', 'kpop', 2013, 'seoul', 5),
  a(96, 'Moonblossom Nine', 'kpop', 2007, 'seoul', 5),
  a(97, 'Voltage Monk', 'edm', 2010, 'los_angeles', 1),
  a(98, 'Bubblegum Fault', 'hyperpop', 2016, 'chicago', 2),
  a(99, 'Aiko Prism', 'synthetic', 2007, 'tokyo', 1, false, true),
  a(100, 'Elias Thorne', 'ambient', 1975, 'london', 1),
];

export type PolicyFamily = 'A' | 'B' | 'C' | 'D';

export interface CatalogLabel {
  id: string;
  name: string;
  archetype: L;
  city: string;
  founded: number;
  family: PolicyFamily;
  /** famílias de gênero preferidas */
  focus: string[];
}

const lb = (id: string, name: string, pt: string, en: string, city: string, founded: number, family: PolicyFamily, focus: string[]): CatalogLabel =>
  ({ id, name, archetype: l(pt, en), city, founded, family, focus });

export const CATALOG_LABELS: CatalogLabel[] = [
  lb('imperial', 'Imperial Music Group', 'Capital enorme; compra estrelas e concorrentes', 'Huge capital; buys stars and rivals', 'new_york', 1925, 'A', []),
  lb('blackbird', 'Blackbird Records', 'Descoberta de cenas; credibilidade artística', 'Scene discovery; artistic credibility', 'london', 1978, 'B', ['rock', 'electronic']),
  lb('nova', 'Nova Entertainment', 'Fenômenos pop com compositores profissionais', 'Pop phenomena with pro songwriters', 'los_angeles', 1985, 'C', ['pop', 'rnb']),
  lb('heritage', 'Heritage Catalog Co.', 'Adquire e administra catálogos', 'Acquires and manages catalogs', 'new_york', 1968, 'D', []),
  lb('meridian', 'Meridian & Sons', 'Casa familiar clássica, repertório amplo', 'Classic family house, broad repertoire', 'london', 1931, 'A', []),
  lb('atlas', 'Atlas Sound Corporation', 'Eletrônicos + gravadora; domina formatos', 'Electronics + label; rules formats', 'berlin', 1948, 'A', []),
  lb('harbor', 'Harbor Street Records', 'Soul e R&B com linha de montagem de talentos', 'Soul & R&B talent assembly line', 'detroit', 1959, 'C', ['rnb']),
  lb('granite', 'Granite Valley Records', 'Rock pesado independente', 'Independent heavy rock', 'los_angeles', 1981, 'B', ['rock']),
  lb('southern_cross', 'Southern Cross Music', 'Música latina, do salão ao pop', 'Latin music, ballroom to pop', 'mexico_city', 1962, 'B', ['latin', 'caribbean']),
  lb('dragonfly', 'Dragonfly Entertainment', 'Agência-gravadora de ídolos treinados', 'Idol agency-label', 'seoul', 1995, 'C', ['pop', 'asia_me']),
  lb('sol_maior', 'Sol Maior Discos', 'MPB e rock brasileiros', 'Brazilian MPB & rock', 'rio', 1957, 'B', ['brazil']),
  lb('carioca_fono', 'Carioca Fono', 'Popular e sertanejo de massa', 'Mass popular & sertanejo', 'sao_paulo', 1949, 'C', ['brazil']),
  lb('palmwine', 'Palmwine Records', 'Highlife, afrobeat e música de Lagos', 'Highlife, afrobeat and Lagos sound', 'lagos', 1958, 'B', ['africa']),
  lb('northern_lights', 'Northern Lights Collective', 'Pop nórdico exportador', 'Export-driven Nordic pop', 'stockholm', 1989, 'C', ['pop', 'europe']),
  lb('cipher_street', 'Cipher Street', 'Hip hop independente', 'Independent hip hop', 'new_york', 1984, 'B', ['hiphop']),
  lb('foundry_wave', 'Foundry Wave', 'Eletrônica e synth independentes', 'Independent electronic & synth', 'manchester', 1979, 'B', ['electronic', 'rock']),
  lb('gold_prairie', 'Gold Prairie Music', 'Country e Americana, publishing forte', 'Country & Americana, strong publishing', 'nashville', 1952, 'D', ['country_folk']),
  lb('sunset_parkway', 'Sunset Parkway', 'Pop-rock de estúdio e hits de rádio', 'Studio pop-rock and radio hits', 'los_angeles', 1970, 'C', ['rock', 'pop']),
  lb('swiftrelease', 'SwiftRelease', 'Distribuidor digital de baixo custo', 'Low-cost digital distributor', 'los_angeles', 2007, 'A', []),
  lb('wayfarer', 'Wayfarer Roots', 'Folk, mundo e música regional', 'Folk, world and regional music', 'dublin', 1955, 'D', ['country_folk', 'europe', 'africa']),
  lb('livewire', 'Livewire Group', 'Booking, promoção e shows', 'Booking, promotion and live', 'london', 1990, 'A', []),
  lb('cortex', 'Cortex Sound', 'Selo de vozes sintéticas', 'Synthetic voice label', 'tokyo', 2028, 'C', ['electronic', 'pop']),
];

export interface Festival {
  name: string;
  city: string;
  kind: L;
  start: number;
  /** famílias favorecidas no line-up */
  focus: string[];
  prestige: number;
  scouting?: boolean;
}

const f = (name: string, city: string, pt: string, en: string, start: number, focus: string[], prestige: number, scouting = false): Festival =>
  ({ name, city, kind: l(pt, en), start, focus, prestige, scouting });

export const FESTIVALS: Festival[] = [
  f('Gala della Riviera', 'milan', 'Festival de canção', 'Song festival', 1951, ['europe', 'pop'], 70),
  f('Grande Festival da Canção', 'rio', 'Concurso de canção', 'Song contest', 1966, ['brazil'], 65),
  f('Concurso Eurocanção', 'stockholm', 'Concurso entre países', 'International contest', 1956, ['pop', 'europe'], 75),
  f('Bayfront Sound', 'los_angeles', 'Festival', 'Festival', 1967, ['rock', 'rnb'], 80),
  f('Timberfield Rock', 'new_york', 'Festival', 'Festival', 1969, ['rock', 'country_folk'], 90),
  f('Isle of Gull Festival', 'london', 'Festival', 'Festival', 1968, ['rock'], 70),
  f('Glasswick Fields', 'london', 'Festival de longa duração', 'Long-running festival', 1970, ['rock', 'pop', 'electronic', 'hiphop'], 92),
  f('Earth Aid', 'london', 'Beneficente global', 'Global benefit', 1985, ['rock', 'pop'], 95),
  f('Rock na Baía Dourada', 'rio', 'Festival', 'Festival', 1985, ['rock', 'pop', 'brazil'], 85),
  f('Parkaloo Festival', 'chicago', 'Festival itinerante', 'Touring festival', 1991, ['rock', 'hiphop'], 75),
  f('Dune Valley Sessions', 'los_angeles', 'Festival de deserto', 'Desert festival', 1999, ['pop', 'electronic', 'hiphop', 'rock'], 88),
  f('Nextday Beat', 'berlin', 'Eletrônico', 'Electronic', 2005, ['electronic'], 80),
  f('NeonGlasswick', 'london', 'Festival da era neural', 'Neural-era festival', 2032, ['electronic', 'pop'], 85),
  f('Nordfjord Open Air', 'stockholm', 'Festival', 'Festival', 1971, ['rock', 'pop'], 65),
  f('Lac Bleu Jazz', 'paris', 'Jazz', 'Jazz', 1967, ['blues_jazz', 'rnb'], 75),
  f('Harbor Point Folk & Jazz', 'new_york', 'Jazz e folk', 'Jazz & folk', 1954, ['blues_jazz', 'country_folk'], 72),
  f('Ringwald Open Air', 'berlin', 'Rock', 'Rock', 1985, ['rock'], 70),
  f('Ironbridge Open Air', 'london', 'Metal e hard rock', 'Metal & hard rock', 1980, ['rock'], 68),
  f('Mount Aoi Rock', 'tokyo', 'Rock e eletrônica', 'Rock & electronic', 1997, ['rock', 'electronic', 'asia_me'], 70),
  f('Ponent Sound', 'lisbon', 'Indie', 'Indie', 2001, ['rock', 'electronic'], 72),
  f('Lone Star Showcase', 'nashville', 'Showcase e conferência', 'Showcase & conference', 1987, ['rock', 'country_folk', 'pop'], 55, true),
  f('Biscayne Beats', 'havana', 'EDM', 'EDM', 1999, ['electronic'], 70),
  f('Passarela do Samba', 'rio', 'Carnaval', 'Carnival', 1984, ['brazil'], 70),
  f('Festival da Orla Azul', 'buenos_aires', 'Canção latina', 'Latin song', 1960, ['latin'], 65),
  f('Rock al Bosque', 'bogota', 'Festival gratuito', 'Free festival', 1995, ['rock', 'latin'], 55),
  f('Vibra Latina', 'mexico_city', 'Rock latino', 'Latin rock', 1998, ['latin', 'rock'], 65),
  f('Soul Weekend Crescent', 'new_orleans', 'Soul e R&B', 'Soul & R&B', 1995, ['rnb'], 68),
  f('Afro Praia Fest', 'lisbon', 'Afrobeats', 'Afrobeats', 2019, ['africa', 'caribbean'], 66),
  f('Sertão em Festa', 'sao_paulo', 'Rodeio e sertanejo', 'Rodeo & sertanejo', 1956, ['brazil', 'country_folk'], 60),
  f('Hallyu Convention', 'los_angeles', 'Convenção de K-pop', 'K-pop convention', 2012, ['pop', 'asia_me'], 62),
  f('Lakefront Summer Fest', 'chicago', 'Multigênero', 'Multi-genre', 1968, ['rock', 'pop', 'rnb', 'country_folk'], 58),
  f('Polderland Showcase', 'berlin', 'Showcase para scouting', 'Scouting showcase', 1986, ['rock', 'electronic', 'pop'], 45, true),
  f('Riviera Music Market', 'paris', 'Feira de negócios', 'Business fair', 1967, [], 40, true),
  f('Tonewood Expo', 'los_angeles', 'Feira de instrumentos', 'Instrument fair', 1950, [], 30, true),
];

export interface MediaOutlet {
  name: string;
  kind: 'radio' | 'tv' | 'press' | 'web' | 'platform' | 'retail';
  type: L;
  start: number;
  end?: number;
  /** prestígio (crítica) vs alcance (popularidade) */
  prestige: number;
  reach: number;
}

const m = (name: string, kind: MediaOutlet['kind'], pt: string, en: string, start: number, prestige: number, reach: number, end?: number): MediaOutlet =>
  ({ name, kind, type: l(pt, en), start, prestige, reach, end });

export const MEDIA: MediaOutlet[] = [
  m('Rádio Mundial Onda', 'radio', 'Rádio de rede nacional', 'National radio network', 1922, 40, 80),
  m('Corporação Nacional de Radiodifusão', 'radio', 'Rádio pública', 'Public radio', 1922, 70, 60),
  m('Rádio Galeão Livre', 'radio', 'Rádio pirata no mar', 'Offshore pirate radio', 1964, 50, 40, 1990),
  m('FM Estação Cidade', 'radio', 'FM segmentada', 'Format FM', 1970, 30, 70),
  m('Onda Universitária', 'radio', 'Rádio universitária', 'College radio', 1980, 75, 20),
  m('Dance Hall Hour', 'tv', 'TV de dança jovem', 'Teen dance TV', 1952, 25, 70, 1989),
  m('Gala de Domingo', 'tv', 'TV de variedades', 'Variety TV', 1948, 40, 90, 1971),
  m('Parada Quente', 'tv', 'TV de paradas', 'Chart TV', 1964, 35, 80, 2006),
  m('Groove Express', 'tv', 'TV de soul e funk', 'Soul & funk TV', 1971, 55, 50, 2006),
  m('Sábado Ao Vivo', 'tv', 'TV de humor com convidado musical', 'Comedy TV with musical guest', 1975, 60, 70),
  m('ClipNet', 'tv', 'Rede de clipes', 'Music video network', 1981, 40, 90),
  m('Next Voice', 'tv', 'Talent show', 'Talent show', 2002, 15, 85),
  m('Blind Stage', 'tv', 'Talent show de audição às cegas', 'Blind-audition talent show', 2011, 20, 80),
  m('Tune Maker', 'press', 'Semanal de música', 'Music weekly', 1926, 65, 40, 2000),
  m('WorldSound Weekly', 'press', 'Revista do setor e paradas', 'Trade & charts magazine', 1920, 50, 50),
  m('Weekly Needle', 'press', 'Semanal britânico influente', 'Influential UK weekly', 1952, 75, 45),
  m('Rock Chronicle', 'press', 'Revista de rock', 'Rock magazine', 1967, 80, 60),
  m('Whirl', 'press', 'Revista pop e alternativa', 'Pop & alternative magazine', 1985, 70, 40),
  m('Barulho', 'press', 'Revista brasileira de rock', 'Brazilian rock magazine', 1985, 70, 30),
  m('Vault Magazine', 'press', 'Revista de catálogo e reedições', 'Catalog & reissue magazine', 1993, 80, 25),
  m('Spearpoint Review', 'web', 'Crítica indie online', 'Online indie criticism', 1996, 90, 35),
  m('ShareWave', 'platform', 'Compartilhamento P2P', 'P2P sharing', 1999, 10, 80, 2003),
  m('TuneShop', 'platform', 'Loja de downloads', 'Download store', 2003, 20, 70),
  m('Pocket Radio', 'platform', 'Rádio personalizada', 'Personalized radio', 2005, 20, 40),
  m('Kaleido', 'platform', 'Vídeo sob demanda', 'Video on demand', 2005, 25, 95),
  m('Streamhaven', 'platform', 'Streaming por assinatura', 'Subscription streaming', 2008, 30, 95),
  m('Orchard Music', 'platform', 'Streaming de ecossistema fechado', 'Walled-garden streaming', 2015, 30, 70),
  m('AudioDrift', 'platform', 'Upload independente', 'Independent upload', 2007, 50, 40),
  m('Bandhaus', 'platform', 'Venda direta de artistas', 'Artist direct sales', 2008, 70, 20),
  m('Hearo', 'platform', 'Reconhecimento de música', 'Music recognition', 2009, 10, 50),
  m('LiveLoop', 'platform', 'Transmissão ao vivo', 'Live streaming', 2011, 15, 60),
  m('Loopit', 'platform', 'Vídeo curto', 'Short video', 2018, 10, 100),
  m('Voxera', 'platform', 'Plataforma de vozes licenciadas', 'Licensed voice platform', 2031, 20, 80),
  m('Spire Records', 'retail', 'Rede de lojas de discos', 'Record store chain', 1960, 30, 50, 2006),
  m('Maiden Megastore', 'retail', 'Megastore', 'Megastore', 1971, 25, 60, 2009),
  m('Cobble Trade', 'retail', 'Loja independente', 'Independent shop', 1976, 80, 15),
  m('Club do Disco', 'retail', 'Venda por correspondência', 'Mail-order club', 1955, 10, 40, 2009),
];

export const INSTITUTIONS = {
  performing: 'SMAC',
  mechanical: 'ADM',
  neighbouring: 'CDC',
  industry: 'AMIF',
  singlesChart: 'WorldSound 100',
  albumsChart: 'WorldSound Albums',
  awards: 'Gramófonos de Ouro',
  hall: 'Hall of Echoes',
};

export interface Venue {
  name: string;
  city: string;
  capacity: number;
}

export const VENUES: Venue[] = [
  { name: 'Bowery Cellar', city: 'new_york', capacity: 300 },
  { name: 'The Quarry Cellar', city: 'liverpool', capacity: 300 },
  { name: 'Harlem Marquee', city: 'new_york', capacity: 1500 },
  { name: 'Royal Meridian Hall', city: 'london', capacity: 5000 },
  { name: 'Garden Square Arena', city: 'new_york', capacity: 20000 },
  { name: 'Valley Stadium', city: 'london', capacity: 80000 },
  { name: 'Estádio Carioca', city: 'rio', capacity: 80000 },
  { name: 'Crimson Amphitheatre', city: 'los_angeles', capacity: 9000 },
  { name: 'Sunset Bowl', city: 'los_angeles', capacity: 17000 },
  { name: 'Sumida Budo Hall', city: 'tokyo', capacity: 10000 },
  { name: 'Whiskey Row Lounge', city: 'los_angeles', capacity: 500 },
  { name: 'Cobalt Jazz Club', city: 'london', capacity: 250 },
  { name: 'The Minstrel Room', city: 'los_angeles', capacity: 400 },
  { name: 'The Bay Ballroom', city: 'los_angeles', capacity: 1200 },
  { name: 'Club Mirrorball', city: 'new_york', capacity: 1500 },
  { name: 'Foundry Berlin', city: 'berlin', capacity: 1500 },
  { name: 'Théâtre Meridien', city: 'paris', capacity: 2000 },
];

export interface StudioDef {
  name: string;
  city: string;
  specialty: string[];
}

export const STUDIOS: StudioDef[] = [
  { name: 'Meridian Road Studios', city: 'london', specialty: ['rock', 'pop'] },
  { name: 'Sunrise Sound', city: 'memphis', specialty: ['rock', 'blues_jazz'] },
  { name: 'Motor City Sound House', city: 'detroit', specialty: ['rnb'] },
  { name: 'Shoal Creek Studios', city: 'memphis', specialty: ['rnb', 'rock'] },
  { name: 'Static Lady Studios', city: 'new_york', specialty: ['rock'] },
  { name: 'Capital Round Studios', city: 'los_angeles', specialty: ['pop', 'sacred'] },
  { name: 'Coral Point Studios', city: 'kingston', specialty: ['caribbean', 'rock'] },
  { name: 'Berlin Hall Studio', city: 'berlin', specialty: ['rock', 'electronic'] },
  { name: 'Hillfield Studios', city: 'london', specialty: ['rock'] },
  { name: 'Estúdio Maré Alta', city: 'rio', specialty: ['brazil'] },
];
