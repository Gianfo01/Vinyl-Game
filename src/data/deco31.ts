// R31 · DECO-M — CATÁLOGO DA DECORAÇÃO (casa, sede e estabelecimentos). Dado puro: sem estado, sem sorteio.
//
// Publicado cedo para as frentes DECO-A (arte: `src/ui/pixel/deco31px.ts` desenha cada `id` por `style`/época e cada
// nível de upgrade) e DECO-L (lojas: estoque pela vitrine31, preço "vintage" fora de linha). O motor é
// `src/sim/r31/deco31.ts` (lugares, colocar/tirar/mover, efeitos com teto).
//
//   DECO31          — itens decorativos (móveis, quadros, plantas, luminárias, som, coleção) + papéis de parede, pisos e
//                     tapetes, luzes de teto, cortinas/molduras de janela e letreiros/logos de fachada;
//   UPG31           — níveis dos itens OBRIGATÓRIOS (telefone, arquivo de aço, mesa de som, cofre, livro-caixa…):
//                     nunca saem do lugar; só trocam de modelo/acabamento ou sobem de nível;
//   DECO_CAP31      — teto do efeito por LUGAR (cômodo/sala) e por tipo de efeito: somar itens não passa disso;
//   SLOT31 / STYLE31 — rótulos bilíngues.
//
// Tamanho (`w`×`h`) em pixels na escala do boneco (avatarSprite 24×34): a poltrona bate no peito, o quadro grande tem a
// largura de um boneco e meio. `from`/`to`: ano em que aparece e sai de linha (fora de linha só usado/antiquário/leilão).
// Efeito (`fx`) é opcional e PEQUENO (fração: 0.02 = +2%), sempre por uma função que já existe (ver `DecoFxK31`).

import { l, type L } from './world';

/** Lugar onde a peça encaixa: parede, chão, sobre a mesa, teto/luz, papel de parede/pintura, piso/tapete,
 *  cortina/moldura da janela (a vista continua a cidade real), letreiro/logo da fachada (sede e negócios). */
export type DecoSlot31 = 'wall' | 'floor' | 'desk' | 'ceiling' | 'paper' | 'ground' | 'window' | 'sign';
export const SLOT31: DecoSlot31[] = ['wall', 'floor', 'desk', 'ceiling', 'paper', 'ground', 'window', 'sign'];
export const SLOT31_L: Record<DecoSlot31, L> = {
  wall: l('Parede', 'Wall'), floor: l('Chão', 'Floor'), desk: l('Sobre a mesa', 'On the desk'), ceiling: l('Teto e luz', 'Ceiling and light'),
  paper: l('Papel de parede', 'Wallpaper'), ground: l('Piso e tapete', 'Flooring and rug'), window: l('Janela', 'Window'), sign: l('Letreiro', 'Sign'),
};

export type DecoCat31 = 'furniture' | 'art' | 'plant' | 'lamp' | 'hifi' | 'collect' | 'paper' | 'ground' | 'light' | 'window' | 'sign';
export const CAT31_L: Record<DecoCat31, L> = {
  furniture: l('Móveis', 'Furniture'), art: l('Quadros e pôsteres', 'Art and posters'), plant: l('Plantas', 'Plants'), lamp: l('Luminárias', 'Lamps'),
  hifi: l('Som e aparelhos', 'Sound and appliances'), collect: l('Coleção e enfeites', 'Collectibles and ornaments'), paper: l('Papéis de parede', 'Wallpapers'),
  ground: l('Pisos e tapetes', 'Floors and rugs'), light: l('Luzes de teto', 'Ceiling lights'), window: l('Cortinas e molduras', 'Curtains and frames'), sign: l('Letreiros e logos', 'Signs and logos'),
};

/** Estilo de época (conjunto completo de um estilo num cômodo = conquista). 'any' = sem época (planta, vaso). */
export type DecoStyle31 = 'nouveau' | 'deco' | 'fifties' | 'seventies' | 'eighties' | 'nineties' | 'minimal' | 'smart' | 'any';
export const STYLE31: DecoStyle31[] = ['nouveau', 'deco', 'fifties', 'seventies', 'eighties', 'nineties', 'minimal', 'smart'];
export const STYLE31_L: Record<DecoStyle31, L> = {
  nouveau: l('Art nouveau', 'Art nouveau'), deco: l('Art déco', 'Art deco'), fifties: l('Anos 50', '1950s'), seventies: l('Anos 70', '1970s'),
  eighties: l('Anos 80', '1980s'), nineties: l('Anos 90', '1990s'), minimal: l('Minimalista', 'Minimalist'), smart: l('Casa inteligente', 'Smart home'), any: l('Sem época', 'Timeless'),
};
/** Ano em que cada estilo começa (galeria e lojas). */
export const STYLE31_FROM: Record<DecoStyle31, number> = { nouveau: 1889, deco: 1922, fifties: 1948, seventies: 1966, eighties: 1979, nineties: 1990, minimal: 2000, smart: 2015, any: 1889 };

/** Onde a peça pode ir: casa, sede, negócio (estúdio, casa de shows, bar/loja, festival, imóvel). */
export type DecoPlace31 = 'home' | 'sede' | 'venue';

/** Efeito pequeno, sempre por função que já existe:
 *  rest     — energia/descanso em casa (recuperação semanal do dono);
 *  prestige — prestígio da sede (reuniões, negociação);
 *  crowd    — público dos negócios (bar, casa de shows, loja, festival);
 *  opinion  — opinião de quem visita (via opinion.ts, uma vez por visita);
 *  cap      — capacidade/vantagem da sala (lugares a mais na sala);
 *  rec      — qualidade de gravação (estúdio). */
export type DecoFxK31 = 'rest' | 'prestige' | 'crowd' | 'opinion' | 'cap' | 'rec';
export interface DecoFx31 { k: DecoFxK31; v: number }

export interface DecoDef31 {
  id: string;
  name: L;
  cat: DecoCat31;
  /** lugares onde encaixa (o primeiro é o preferido) */
  slots: DecoSlot31[];
  /** tamanho em px na escala do boneco (24×34) */
  w: number; h: number;
  from: number; to?: number;
  style: DecoStyle31;
  /** preço novo em dólares reais (como items31) */
  price: number;
  fx?: DecoFx31;
  places: DecoPlace31[];
}

const HSV: DecoPlace31[] = ['home', 'sede', 'venue'];
const HS: DecoPlace31[] = ['home', 'sede'];
const H: DecoPlace31[] = ['home'];
const HV: DecoPlace31[] = ['home', 'venue'];
const SV: DecoPlace31[] = ['sede', 'venue'];
const V: DecoPlace31[] = ['venue'];
const S: DecoPlace31[] = ['sede'];
const SL = (x: string): DecoSlot31[] => x.split(',') as DecoSlot31[];
const fx = (k: DecoFxK31, v: number): DecoFx31 => ({ k, v });

const D = (id: string, pt: string, en: string, cat: DecoCat31, slots: string, w: number, h: number, from: number, to: number | undefined,
  style: DecoStyle31, price: number, places: DecoPlace31[], f?: DecoFx31): DecoDef31 =>
  ({ id, name: l(pt, en), cat, slots: SL(slots), w, h, from, ...(to ? { to } : {}), style, price, ...(f ? { fx: f } : {}), places });

export const DECO31: DecoDef31[] = [
  // ---------------------------------------------------------------- móveis
  D('d_chaise_nouveau', 'Chaise longue de vime curvado', 'Bentwood chaise longue', 'furniture', 'floor', 34, 20, 1889, 1930, 'nouveau', 180, H, fx('rest', 0.02)),
  D('d_armchair_nouveau', 'Poltrona de veludo com flores entalhadas', 'Carved velvet armchair', 'furniture', 'floor', 20, 26, 1889, 1925, 'nouveau', 140, HS, fx('rest', 0.01)),
  D('d_screen_nouveau', 'Biombo de seda pintada', 'Painted silk screen', 'furniture', 'floor', 30, 34, 1889, 1930, 'nouveau', 120, HSV),
  D('d_sideboard_nouveau', 'Aparador de nogueira com vitral', 'Walnut sideboard with stained glass', 'furniture', 'floor', 36, 24, 1889, 1925, 'nouveau', 220, HS),
  D('d_bookcase_nouveau', 'Estante de carvalho com portas de vidro', 'Glass-fronted oak bookcase', 'furniture', 'floor', 26, 40, 1889, 1935, 'nouveau', 190, HS, fx('prestige', 0.01)),
  D('d_plantstand_nouveau', 'Floreira de ferro batido', 'Wrought-iron plant stand', 'furniture', 'floor', 12, 24, 1889, 1930, 'nouveau', 45, HSV),
  D('d_sofa_deco', 'Sofá curvo de couro', 'Curved leather sofa', 'furniture', 'floor', 44, 22, 1922, 1950, 'deco', 420, HSV, fx('rest', 0.02)),
  D('d_club_chair', 'Poltrona club', 'Club chair', 'furniture', 'floor', 22, 24, 1922, 1955, 'deco', 260, HSV, fx('rest', 0.01)),
  D('d_bar_cart_deco', 'Carrinho de bar cromado', 'Chrome bar cart', 'furniture', 'floor', 20, 20, 1925, 1960, 'deco', 150, HSV, fx('opinion', 0.01)),
  D('d_cabinet_deco', 'Bufê laqueado com marchetaria', 'Lacquered inlaid cabinet', 'furniture', 'floor', 38, 24, 1922, 1950, 'deco', 380, HS, fx('prestige', 0.01)),
  D('d_vanity_deco', 'Penteadeira de espelho redondo', 'Round-mirror vanity', 'furniture', 'floor', 26, 32, 1925, 1955, 'deco', 210, H),
  D('d_desk_deco', 'Escrivaninha de executivo em ébano', 'Ebony executive desk', 'furniture', 'floor', 40, 22, 1925, 1955, 'deco', 520, S, fx('prestige', 0.02)),
  D('d_sofa_fifties', 'Sofá de pés palito', 'Hairpin-leg sofa', 'furniture', 'floor', 42, 20, 1948, 1970, 'fifties', 300, HSV, fx('rest', 0.02)),
  D('d_eames_chair', 'Poltrona de couro com banqueta', 'Leather lounge chair with ottoman', 'furniture', 'floor', 24, 24, 1956, undefined, 'fifties', 900, HS, fx('rest', 0.02)),
  D('d_diner_booth', 'Banco de lanchonete vermelho', 'Red diner booth', 'furniture', 'floor', 36, 22, 1948, 1975, 'fifties', 240, V, fx('crowd', 0.01)),
  D('d_boomerang_table', 'Mesa de centro bumerangue', 'Boomerang coffee table', 'furniture', 'floor', 28, 10, 1950, 1970, 'fifties', 110, HSV),
  D('d_credenza_fifties', 'Aparador de teca', 'Teak credenza', 'furniture', 'floor', 38, 20, 1952, 1975, 'fifties', 260, HS),
  D('d_shell_chair', 'Cadeira de concha de fibra', 'Fiberglass shell chair', 'furniture', 'floor', 16, 24, 1950, undefined, 'fifties', 90, HSV),
  D('d_bean_bag', 'Pufe de bolinhas', 'Bean bag', 'furniture', 'floor', 20, 14, 1969, undefined, 'seventies', 60, HSV, fx('rest', 0.01)),
  D('d_conversation_pit', 'Sofá rebaixado em U', 'Sunken conversation pit', 'furniture', 'floor', 54, 16, 1966, 1985, 'seventies', 700, HS, fx('rest', 0.02)),
  D('d_egg_chair', 'Poltrona ovo', 'Egg chair', 'furniture', 'floor', 22, 30, 1966, undefined, 'seventies', 650, HSV, fx('opinion', 0.01)),
  D('d_waterbed', 'Cama d\'água', 'Waterbed', 'furniture', 'floor', 44, 14, 1970, 1992, 'seventies', 480, H, fx('rest', 0.02)),
  D('d_macrame_chair', 'Cadeira suspensa de macramê', 'Hanging macramé chair', 'furniture', 'floor,ceiling', 20, 34, 1968, 1985, 'seventies', 120, HV),
  D('d_rattan_set', 'Conjunto de vime', 'Rattan set', 'furniture', 'floor', 40, 22, 1966, 1985, 'seventies', 340, HSV),
  D('d_sofa_eighties', 'Sofá modular cinza', 'Grey modular sofa', 'furniture', 'floor', 48, 20, 1979, 1995, 'eighties', 520, HSV, fx('rest', 0.02)),
  D('d_glass_desk', 'Mesa de vidro e cromo', 'Glass and chrome desk', 'furniture', 'floor', 38, 20, 1979, 1998, 'eighties', 600, S, fx('prestige', 0.02)),
  D('d_memphis_shelf', 'Estante colorida de formas geométricas', 'Geometric colour-block shelf', 'furniture', 'floor', 30, 38, 1981, 1995, 'eighties', 450, HSV, fx('opinion', 0.01)),
  D('d_arcade_cab', 'Fliperama de ficha', 'Coin-op arcade cabinet', 'furniture', 'floor', 18, 38, 1978, 2000, 'eighties', 1500, HV, fx('crowd', 0.02)),
  D('d_futon', 'Futon dobrável', 'Folding futon', 'furniture', 'floor', 42, 14, 1990, undefined, 'nineties', 200, H, fx('rest', 0.01)),
  D('d_leather_sofa90', 'Sofá de couro preto', 'Black leather sofa', 'furniture', 'floor', 46, 22, 1990, 2010, 'nineties', 800, HSV, fx('rest', 0.02)),
  D('d_cd_tower', 'Torre de CDs', 'CD tower', 'furniture', 'floor', 10, 36, 1990, 2008, 'nineties', 60, HS),
  D('d_pool_table', 'Mesa de sinuca', 'Pool table', 'furniture', 'floor', 50, 20, 1900, undefined, 'any', 1800, HV, fx('crowd', 0.02)),
  D('d_lowsofa_min', 'Sofá baixo de linho', 'Low linen sofa', 'furniture', 'floor', 46, 16, 2000, undefined, 'minimal', 1200, HSV, fx('rest', 0.02)),
  D('d_floating_shelf', 'Prateleira flutuante', 'Floating shelf', 'furniture', 'wall', 30, 6, 2000, undefined, 'minimal', 80, HSV),
  D('d_standing_desk', 'Mesa de trabalho em pé', 'Standing desk', 'furniture', 'floor', 34, 30, 2012, undefined, 'minimal', 700, S, fx('prestige', 0.01)),
  D('d_bench_min', 'Banco de madeira maciça', 'Solid-wood bench', 'furniture', 'floor', 36, 10, 2000, undefined, 'minimal', 300, HSV),
  D('d_smart_sofa', 'Sofá com carregador e som embutido', 'Sofa with built-in charger and speakers', 'furniture', 'floor', 48, 20, 2015, undefined, 'smart', 2200, HS, fx('rest', 0.03)),
  D('d_massage_chair', 'Poltrona de massagem', 'Massage chair', 'furniture', 'floor', 24, 30, 2010, undefined, 'smart', 2500, HS, fx('rest', 0.03)),
  D('d_pod_bed', 'Cama com controle de clima', 'Climate-control bed', 'furniture', 'floor', 46, 16, 2018, undefined, 'smart', 3500, H, fx('rest', 0.03)),
  D('d_bar_counter', 'Balcão de bar de madeira', 'Wooden bar counter', 'furniture', 'floor', 56, 26, 1889, undefined, 'any', 900, V, fx('crowd', 0.02)),
  D('d_merch_rack', 'Arara de camisetas da casa', 'House T-shirt rack', 'furniture', 'floor', 30, 30, 1965, undefined, 'any', 250, V, fx('crowd', 0.01)),
  D('d_record_bin', 'Caixote de discos', 'Record crate bin', 'furniture', 'floor', 28, 16, 1950, undefined, 'any', 120, HV),
  D('d_piano_bench', 'Banqueta de piano estofada', 'Upholstered piano bench', 'furniture', 'floor', 20, 12, 1889, undefined, 'any', 70, HSV),
  D('d_coat_stand', 'Cabideiro de pé', 'Coat stand', 'furniture', 'floor', 12, 36, 1889, undefined, 'any', 50, HSV),
  // ---------------------------------------------------------------- quadros, pôsteres, parede
  D('a_mucha_print', 'Gravura de moça com flores no cabelo', 'Print of a woman with flowers in her hair', 'art', 'wall', 18, 30, 1895, 1930, 'nouveau', 60, HSV, fx('opinion', 0.01)),
  D('a_oil_landscape', 'Paisagem a óleo em moldura dourada', 'Gilt-framed oil landscape', 'art', 'wall', 32, 24, 1889, undefined, 'nouveau', 300, HS, fx('prestige', 0.01)),
  D('a_family_portrait', 'Retrato de família', 'Family portrait', 'art', 'wall', 22, 28, 1889, undefined, 'any', 150, H, fx('rest', 0.01)),
  D('a_sheet_frame', 'Partitura emoldurada', 'Framed sheet music', 'art', 'wall,desk', 16, 22, 1889, undefined, 'any', 40, HSV),
  D('a_cabaret_poster', 'Cartaz de cabaré', 'Cabaret poster', 'art', 'wall', 20, 30, 1890, 1935, 'nouveau', 35, HSV, fx('crowd', 0.01)),
  D('a_deco_mirror', 'Espelho solar dourado', 'Gilded sunburst mirror', 'art', 'wall', 24, 24, 1925, 1960, 'deco', 180, HSV, fx('opinion', 0.01)),
  D('a_ocean_liner', 'Cartaz de transatlântico', 'Ocean liner poster', 'art', 'wall', 20, 30, 1925, 1955, 'deco', 40, HSV),
  D('a_jazz_poster', 'Cartaz de baile de jazz', 'Jazz dance poster', 'art', 'wall', 20, 30, 1922, 1950, 'deco', 30, HSV, fx('crowd', 0.01)),
  D('a_skyline_etch', 'Gravura do horizonte da cidade', 'City skyline etching', 'art', 'wall', 34, 18, 1925, undefined, 'deco', 120, HS),
  D('a_gold_78', 'Disco de ouro em goma-laca', 'Shellac gold record', 'art', 'wall', 18, 24, 1930, 1960, 'deco', 0, S, fx('prestige', 0.02)),
  D('a_pinup', 'Calendário de pin-up', 'Pin-up calendar', 'art', 'wall', 16, 24, 1948, 1972, 'fifties', 15, SV),
  D('a_abstract_fifties', 'Quadro abstrato de formas soltas', 'Free-form abstract painting', 'art', 'wall', 30, 22, 1950, 1970, 'fifties', 260, HSV, fx('opinion', 0.01)),
  D('a_starburst_clock', 'Relógio de parede estrela', 'Starburst wall clock', 'art', 'wall', 22, 22, 1950, 1972, 'fifties', 70, HSV),
  D('a_rocknroll_poster', 'Cartaz de show de rock\'n\'roll', 'Rock\'n\'roll show poster', 'art', 'wall', 20, 30, 1954, 1970, 'fifties', 20, HSV, fx('crowd', 0.01)),
  D('a_gold_lp', 'Disco de ouro em LP', 'Gold LP award', 'art', 'wall', 20, 26, 1958, undefined, 'any', 0, HS, fx('prestige', 0.02)),
  D('a_psych_poster', 'Cartaz psicodélico', 'Psychedelic poster', 'art', 'wall', 20, 30, 1966, 1980, 'seventies', 20, HSV, fx('crowd', 0.01)),
  D('a_macrame_wall', 'Painel de macramê', 'Macramé wall hanging', 'art', 'wall', 18, 30, 1968, 1985, 'seventies', 45, HV),
  D('a_sunset_canvas', 'Tela de pôr do sol laranja', 'Orange sunset canvas', 'art', 'wall', 30, 20, 1968, 1985, 'seventies', 90, HSV),
  D('a_platinum', 'Disco de platina', 'Platinum record award', 'art', 'wall', 20, 26, 1976, undefined, 'any', 0, HS, fx('prestige', 0.02)),
  D('a_neon_art', 'Quadro de néon', 'Neon art piece', 'art', 'wall', 30, 18, 1980, undefined, 'eighties', 400, HSV, fx('crowd', 0.01)),
  D('a_pop_print', 'Serigrafia pop colorida', 'Colourful pop-art silkscreen', 'art', 'wall', 24, 24, 1979, undefined, 'eighties', 500, HSV, fx('opinion', 0.01)),
  D('a_mtv_poster', 'Pôster de videoclipe', 'Music-video poster', 'art', 'wall', 20, 30, 1981, 2000, 'eighties', 15, HSV),
  D('a_tour_poster90', 'Pôster de turnê de estádio', 'Stadium tour poster', 'art', 'wall', 20, 30, 1990, undefined, 'nineties', 20, HSV, fx('crowd', 0.01)),
  D('a_grunge_flyer', 'Mural de flyers de show', 'Wall of gig flyers', 'art', 'wall', 32, 24, 1990, undefined, 'nineties', 10, SV, fx('crowd', 0.01)),
  D('a_photo_bw', 'Foto de palco em preto e branco', 'Black-and-white stage photo', 'art', 'wall', 24, 18, 1930, undefined, 'any', 80, HSV),
  D('a_canvas_min', 'Tela branca com um traço', 'White canvas with a single line', 'art', 'wall', 30, 30, 2000, undefined, 'minimal', 700, HS, fx('prestige', 0.01)),
  D('a_streaming_plaque', 'Placa de bilhão de execuções', 'Billion-streams plaque', 'art', 'wall', 20, 26, 2012, undefined, 'any', 0, HS, fx('prestige', 0.02)),
  D('a_digital_frame', 'Moldura digital de capas', 'Digital album-art frame', 'art', 'wall,desk', 22, 18, 2010, undefined, 'smart', 300, HSV),
  D('a_led_wall', 'Painel de LED animado', 'Animated LED panel', 'art', 'wall', 40, 24, 2015, undefined, 'smart', 1500, SV, fx('crowd', 0.02)),
  D('a_guitar_wall', 'Guitarra pendurada na parede', 'Wall-hung guitar', 'art', 'wall', 12, 34, 1950, undefined, 'any', 600, HSV, fx('opinion', 0.01)),
  D('a_world_map', 'Mapa antigo emoldurado', 'Framed antique map', 'art', 'wall', 34, 22, 1889, undefined, 'any', 200, HS),
  D('a_signed_photo', 'Foto autografada de ídolo', 'Signed photo of an idol', 'art', 'wall,desk', 14, 18, 1920, undefined, 'any', 120, HSV, fx('opinion', 0.01)),
  D('a_cover_frame', 'Capa de disco emoldurada', 'Framed album cover', 'art', 'wall', 18, 18, 1950, undefined, 'any', 30, HSV),
  // ---------------------------------------------------------------- plantas
  D('p_fern', 'Samambaia no pedestal', 'Fern on a pedestal', 'plant', 'floor', 16, 26, 1889, undefined, 'nouveau', 25, HSV, fx('rest', 0.01)),
  D('p_palm', 'Palmeira de vaso', 'Potted palm', 'plant', 'floor', 20, 36, 1889, undefined, 'deco', 40, HSV, fx('rest', 0.01)),
  D('p_orchid', 'Orquídea', 'Orchid', 'plant', 'desk', 8, 12, 1889, undefined, 'any', 30, HSV),
  D('p_cactus', 'Cacto de vaso', 'Potted cactus', 'plant', 'desk,floor', 8, 12, 1950, undefined, 'fifties', 10, HSV),
  D('p_spider', 'Clorofito pendurado', 'Hanging spider plant', 'plant', 'ceiling,wall', 14, 20, 1966, undefined, 'seventies', 15, HSV, fx('rest', 0.01)),
  D('p_rubber', 'Falsa-seringueira', 'Rubber plant', 'plant', 'floor', 18, 34, 1970, undefined, 'seventies', 35, HSV),
  D('p_bonsai', 'Bonsai', 'Bonsai', 'plant', 'desk', 12, 10, 1950, undefined, 'any', 120, HSV, fx('prestige', 0.01)),
  D('p_ficus', 'Fícus de escritório', 'Office ficus', 'plant', 'floor', 18, 34, 1979, undefined, 'eighties', 50, SV),
  D('p_succulents', 'Trio de suculentas', 'Trio of succulents', 'plant', 'desk', 14, 8, 2000, undefined, 'minimal', 25, HSV),
  D('p_monstera', 'Costela-de-adão', 'Monstera', 'plant', 'floor', 22, 30, 2005, undefined, 'minimal', 60, HSV, fx('rest', 0.01)),
  D('p_green_wall', 'Jardim vertical', 'Living green wall', 'plant', 'wall', 36, 30, 2012, undefined, 'smart', 900, HSV, fx('rest', 0.02)),
  D('p_hydro', 'Horta hidropônica com luz', 'Lit hydroponic garden', 'plant', 'floor', 20, 28, 2015, undefined, 'smart', 400, H, fx('rest', 0.01)),
  // ---------------------------------------------------------------- luminárias (abajur, pé)
  D('l_tiffany', 'Abajur de vitral colorido', 'Stained-glass table lamp', 'lamp', 'desk', 12, 16, 1895, 1940, 'nouveau', 150, HSV, fx('opinion', 0.01)),
  D('l_gas_sconce', 'Arandela a gás', 'Gas wall sconce', 'lamp', 'wall', 8, 12, 1889, 1915, 'nouveau', 30, HSV),
  D('l_deco_floor', 'Luminária de pé com cúpula escalonada', 'Stepped-shade floor lamp', 'lamp', 'floor', 12, 38, 1922, 1950, 'deco', 120, HSV),
  D('l_banker', 'Luminária de banqueiro verde', 'Green banker\'s lamp', 'lamp', 'desk', 12, 12, 1909, undefined, 'deco', 60, HS, fx('prestige', 0.01)),
  D('l_arc', 'Luminária de arco', 'Arc floor lamp', 'lamp', 'floor', 30, 40, 1962, undefined, 'fifties', 350, HSV),
  D('l_atomic', 'Luminária atômica de três braços', 'Three-arm atomic lamp', 'lamp', 'floor', 16, 38, 1950, 1970, 'fifties', 140, HSV),
  D('l_lava', 'Lâmpada de lava', 'Lava lamp', 'lamp', 'desk', 6, 14, 1965, undefined, 'seventies', 30, HSV, fx('opinion', 0.01)),
  D('l_mushroom', 'Abajur cogumelo', 'Mushroom lamp', 'lamp', 'desk', 12, 12, 1968, 1985, 'seventies', 70, HSV),
  D('l_neon_sign', 'Placa de néon "On Air"', '"On Air" neon sign', 'lamp', 'wall', 24, 10, 1930, undefined, 'any', 200, SV),
  D('l_halogen', 'Luminária halógena de pé', 'Halogen torchiere', 'lamp', 'floor', 10, 40, 1983, 2010, 'eighties', 90, HSV),
  D('l_desk_tensor', 'Luminária articulada', 'Articulated desk lamp', 'lamp', 'desk', 12, 14, 1932, undefined, 'any', 50, HS),
  D('l_paper_lantern', 'Lanterna de papel', 'Paper lantern', 'lamp', 'floor', 14, 30, 1990, undefined, 'nineties', 40, HSV),
  D('l_led_strip', 'Fita de LED colorida', 'Colour LED strip', 'lamp', 'wall', 40, 4, 2012, undefined, 'smart', 60, HSV, fx('opinion', 0.01)),
  D('l_smart_bulb', 'Abajur que muda de cor pela música', 'Music-reactive lamp', 'lamp', 'desk', 10, 14, 2016, undefined, 'smart', 120, HSV, fx('rest', 0.01)),
  // ---------------------------------------------------------------- som e aparelhos
  D('h_gramophone', 'Gramofone de corneta', 'Horn gramophone', 'hifi', 'floor,desk', 16, 22, 1895, 1935, 'nouveau', 160, HSV, fx('opinion', 0.01)),
  D('h_music_box', 'Caixa de música', 'Music box', 'hifi', 'desk', 10, 8, 1889, 1930, 'nouveau', 70, H),
  D('h_player_piano', 'Pianola', 'Player piano', 'hifi', 'floor', 36, 34, 1900, 1935, 'nouveau', 900, HV, fx('crowd', 0.01)),
  D('h_cathedral_radio', 'Rádio capelinha', 'Cathedral radio', 'hifi', 'desk,floor', 14, 16, 1928, 1950, 'deco', 90, HSV),
  D('h_console_radio', 'Rádio-vitrola de móvel', 'Radio-phonograph console', 'hifi', 'floor', 30, 30, 1930, 1960, 'deco', 350, HS, fx('rest', 0.01)),
  D('h_jukebox', 'Jukebox', 'Jukebox', 'hifi', 'floor', 22, 36, 1935, undefined, 'fifties', 1200, V, fx('crowd', 0.03)),
  D('h_hifi_tube', 'Toca-discos com receiver valvulado', 'Turntable with valve receiver', 'hifi', 'floor', 34, 24, 1955, 1980, 'fifties', 500, HS, fx('rest', 0.01)),
  D('h_tv_fifties', 'Televisão de móvel', 'Console television', 'hifi', 'floor', 26, 28, 1950, 1975, 'fifties', 400, HS),
  D('h_reel_deck', 'Gravador de rolo doméstico', 'Home reel-to-reel deck', 'hifi', 'floor,desk', 22, 22, 1955, 1985, 'seventies', 600, HS),
  D('h_quad_stereo', 'Aparelho de som quadrifônico', 'Quadraphonic stereo', 'hifi', 'floor', 36, 26, 1971, 1985, 'seventies', 900, HS, fx('rest', 0.01)),
  D('h_boombox', 'Rádio-gravador portátil', 'Boombox', 'hifi', 'floor,desk', 18, 10, 1979, 1998, 'eighties', 150, HSV),
  D('h_vcr_tv', 'TV com videocassete', 'TV with VCR', 'hifi', 'floor', 24, 24, 1980, 2000, 'eighties', 600, HS, fx('rest', 0.01)),
  D('h_cd_micro', 'Micro system de CD', 'CD micro system', 'hifi', 'desk', 20, 10, 1990, 2008, 'nineties', 300, HS),
  D('h_pa_speaker', 'Caixa de som de palco', 'PA speaker stack', 'hifi', 'floor', 20, 36, 1968, undefined, 'any', 800, V, fx('crowd', 0.01)),
  D('h_flat_tv', 'TV de tela plana', 'Flat-screen TV', 'hifi', 'wall,floor', 36, 22, 2005, undefined, 'minimal', 1200, HS, fx('rest', 0.01)),
  D('h_smart_speaker', 'Alto-falante inteligente', 'Smart speaker', 'hifi', 'desk', 6, 10, 2015, undefined, 'smart', 100, HSV),
  D('h_vinyl_revival', 'Toca-discos com Bluetooth', 'Bluetooth turntable', 'hifi', 'desk,floor', 18, 8, 2010, undefined, 'smart', 300, HSV, fx('opinion', 0.01)),
  D('h_holo', 'Projetor de holograma', 'Hologram projector', 'hifi', 'floor', 16, 30, 2028, undefined, 'smart', 6000, SV, fx('crowd', 0.02)),
  D('h_karaoke', 'Máquina de karaokê', 'Karaoke machine', 'hifi', 'floor', 16, 26, 1985, undefined, 'any', 600, V, fx('crowd', 0.02)),
  // ---------------------------------------------------------------- coleção e enfeites
  D('c_bust', 'Busto de compositor', 'Composer bust', 'collect', 'desk,floor', 10, 14, 1889, undefined, 'nouveau', 90, HS, fx('prestige', 0.01)),
  D('c_globe', 'Globo terrestre de mesa', 'Desk globe', 'collect', 'desk', 12, 14, 1889, undefined, 'any', 80, HS),
  D('c_grandfather_clock', 'Relógio de pêndulo', 'Grandfather clock', 'collect', 'floor', 14, 40, 1889, 1950, 'nouveau', 400, HS, fx('prestige', 0.01)),
  D('c_metronome', 'Metrônomo de madeira', 'Wooden metronome', 'collect', 'desk', 6, 10, 1889, undefined, 'any', 30, HSV),
  D('c_deco_statue', 'Estatueta de bailarina em bronze', 'Bronze dancer figurine', 'collect', 'desk', 8, 16, 1922, 1950, 'deco', 160, HS, fx('opinion', 0.01)),
  D('c_cocktail_set', 'Coqueteleira e taças', 'Cocktail shaker set', 'collect', 'desk', 14, 10, 1922, undefined, 'deco', 60, HSV),
  D('c_aquarium', 'Aquário', 'Aquarium', 'collect', 'floor,desk', 26, 18, 1950, undefined, 'fifties', 200, HSV, fx('rest', 0.01)),
  D('c_jukebox_mini', 'Miniatura de jukebox', 'Mini jukebox ornament', 'collect', 'desk', 6, 10, 1955, undefined, 'fifties', 25, HSV),
  D('c_disco_ball', 'Globo espelhado', 'Mirror ball', 'collect', 'ceiling', 12, 12, 1970, undefined, 'seventies', 120, HSV, fx('crowd', 0.01)),
  D('c_rubik', 'Cubo mágico', 'Puzzle cube', 'collect', 'desk', 4, 4, 1980, undefined, 'eighties', 10, HSV),
  D('c_cassette_wall', 'Parede de fitas cassete', 'Cassette wall display', 'collect', 'wall', 30, 20, 1979, 2000, 'eighties', 80, HSV),
  D('c_gameconsole', 'Videogame na estante', 'Game console on the shelf', 'collect', 'desk', 12, 6, 1977, undefined, 'eighties', 200, HS, fx('rest', 0.01)),
  D('c_action_figures', 'Prateleira de bonecos colecionáveis', 'Collectible figure shelf', 'collect', 'wall', 28, 12, 1990, undefined, 'nineties', 150, HS),
  D('c_trophy_case', 'Cristaleira de troféus', 'Trophy cabinet', 'collect', 'floor', 26, 38, 1900, undefined, 'any', 500, HS, fx('prestige', 0.02)),
  D('c_drumhead', 'Pele de bumbo autografada', 'Signed bass-drum head', 'collect', 'wall', 18, 18, 1960, undefined, 'any', 300, HSV, fx('crowd', 0.01)),
  D('c_setlist_frame', 'Setlist de show histórico', 'Historic gig setlist', 'collect', 'wall', 12, 16, 1960, undefined, 'any', 90, HSV),
  D('c_ceramic_min', 'Vaso de cerâmica fosca', 'Matte ceramic vase', 'collect', 'desk,floor', 8, 14, 2000, undefined, 'minimal', 80, HSV),
  D('c_robot_vac', 'Aspirador robô', 'Robot vacuum', 'collect', 'floor', 10, 4, 2010, undefined, 'smart', 300, H, fx('rest', 0.01)),
  D('c_drone_cam', 'Drone de filmagem na base', 'Camera drone on its dock', 'collect', 'desk', 10, 6, 2015, undefined, 'smart', 900, SV),
  D('c_fireplace', 'Lareira', 'Fireplace', 'collect', 'floor', 34, 32, 1889, undefined, 'any', 1500, H, fx('rest', 0.02)),
  D('c_piano_grand', 'Piano de cauda de sala', 'Parlour grand piano', 'collect', 'floor', 46, 30, 1889, undefined, 'any', 9000, HSV, fx('opinion', 0.02)),
  D('c_candles', 'Castiçal de prata', 'Silver candelabra', 'collect', 'desk', 10, 14, 1889, undefined, 'any', 70, HSV),

  // ---------------------------------------------------------------- papéis de parede e pintura (lugar 'paper')
  D('w_damask', 'Papel adamascado vinho', 'Wine damask wallpaper', 'paper', 'paper', 0, 0, 1889, 1935, 'nouveau', 80, HSV, fx('opinion', 0.01)),
  D('w_floral_nouveau', 'Papel de lírios entrelaçados', 'Entwined-lily wallpaper', 'paper', 'paper', 0, 0, 1890, 1925, 'nouveau', 90, HSV),
  D('w_wood_panel', 'Lambri de madeira escura', 'Dark wood panelling', 'paper', 'paper', 0, 0, 1889, undefined, 'any', 200, HSV, fx('prestige', 0.01)),
  D('w_deco_fan', 'Papel de leques dourados', 'Gold fan-pattern wallpaper', 'paper', 'paper', 0, 0, 1922, 1950, 'deco', 110, HSV, fx('opinion', 0.01)),
  D('w_deco_stripe', 'Listras creme e preto', 'Cream and black stripes', 'paper', 'paper', 0, 0, 1925, 1955, 'deco', 70, HSV),
  D('w_atomic', 'Papel de estrelinhas atômicas', 'Atomic-star wallpaper', 'paper', 'paper', 0, 0, 1950, 1970, 'fifties', 60, HSV),
  D('w_pastel', 'Pintura verde-menta', 'Mint-green paint', 'paper', 'paper', 0, 0, 1948, 1970, 'fifties', 30, HSV),
  D('w_psych', 'Papel de ondas psicodélicas', 'Psychedelic wave wallpaper', 'paper', 'paper', 0, 0, 1966, 1980, 'seventies', 60, HSV, fx('crowd', 0.01)),
  D('w_orange_geo', 'Papel geométrico laranja e marrom', 'Orange and brown geometric wallpaper', 'paper', 'paper', 0, 0, 1968, 1985, 'seventies', 50, HSV),
  D('w_cork', 'Parede de cortiça', 'Cork wall', 'paper', 'paper', 0, 0, 1970, 1990, 'seventies', 90, HSV, fx('rec', 0.01)),
  D('w_memphis', 'Papel de rabiscos coloridos', 'Colourful squiggle wallpaper', 'paper', 'paper', 0, 0, 1981, 1995, 'eighties', 60, HSV),
  D('w_grey_sponge', 'Pintura cinza esponjada', 'Sponged grey paint', 'paper', 'paper', 0, 0, 1979, 1998, 'eighties', 30, HSV),
  D('w_brick', 'Tijolo aparente', 'Exposed brick', 'paper', 'paper', 0, 0, 1990, undefined, 'nineties', 150, HSV, fx('crowd', 0.01)),
  D('w_acoustic', 'Espuma acústica', 'Acoustic foam', 'paper', 'paper', 0, 0, 1975, undefined, 'any', 250, SV, fx('rec', 0.02)),
  D('w_white_matte', 'Branco fosco', 'Matte white', 'paper', 'paper', 0, 0, 2000, undefined, 'minimal', 40, HSV),
  D('w_concrete', 'Concreto aparente', 'Bare concrete', 'paper', 'paper', 0, 0, 2005, undefined, 'minimal', 120, HSV),
  D('w_led_paint', 'Parede de painéis de luz', 'Light-panel wall', 'paper', 'paper', 0, 0, 2018, undefined, 'smart', 800, HSV, fx('crowd', 0.01)),
  // ---------------------------------------------------------------- pisos e tapetes (lugar 'ground')
  D('g_parquet', 'Parquê em espinha de peixe', 'Herringbone parquet', 'ground', 'ground', 0, 0, 1889, undefined, 'nouveau', 300, HSV, fx('prestige', 0.01)),
  D('g_persian', 'Tapete persa', 'Persian rug', 'ground', 'ground', 40, 6, 1889, undefined, 'any', 600, HSV, fx('rest', 0.01)),
  D('g_mosaic', 'Ladrilho hidráulico', 'Encaustic tiles', 'ground', 'ground', 0, 0, 1889, 1950, 'nouveau', 200, HSV),
  D('g_terrazzo', 'Granilite', 'Terrazzo', 'ground', 'ground', 0, 0, 1925, 1965, 'deco', 250, HSV),
  D('g_checker', 'Piso xadrez preto e branco', 'Black-and-white checker floor', 'ground', 'ground', 0, 0, 1948, 1975, 'fifties', 150, HSV, fx('crowd', 0.01)),
  D('g_shag', 'Carpete felpudo', 'Shag carpet', 'ground', 'ground', 0, 0, 1966, 1985, 'seventies', 200, HSV, fx('rest', 0.01)),
  D('g_disco_floor', 'Pista de dança iluminada', 'Light-up dance floor', 'ground', 'ground', 0, 0, 1975, undefined, 'seventies', 3000, V, fx('crowd', 0.03)),
  D('g_grey_carpet', 'Carpete cinza de escritório', 'Grey office carpet', 'ground', 'ground', 0, 0, 1979, 2005, 'eighties', 120, S),
  D('g_laminate', 'Piso laminado', 'Laminate flooring', 'ground', 'ground', 0, 0, 1990, undefined, 'nineties', 100, HSV),
  D('g_rug_kilim', 'Tapete kilim', 'Kilim rug', 'ground', 'ground', 36, 6, 1990, undefined, 'nineties', 250, HSV),
  D('g_polished_concrete', 'Cimento queimado', 'Polished concrete', 'ground', 'ground', 0, 0, 2000, undefined, 'minimal', 180, HSV),
  D('g_wide_oak', 'Tábua corrida larga de carvalho', 'Wide oak planks', 'ground', 'ground', 0, 0, 2005, undefined, 'minimal', 400, HSV, fx('rest', 0.01)),
  D('g_heated', 'Piso aquecido', 'Heated floor', 'ground', 'ground', 0, 0, 2015, undefined, 'smart', 1200, H, fx('rest', 0.02)),
  D('g_floating_studio', 'Piso flutuante de estúdio', 'Floating studio floor', 'ground', 'ground', 0, 0, 1960, undefined, 'any', 1500, SV, fx('rec', 0.02)),
  // ---------------------------------------------------------------- luzes de teto (lugar 'ceiling')
  D('t_crystal', 'Lustre de cristal', 'Crystal chandelier', 'light', 'ceiling', 26, 18, 1889, undefined, 'nouveau', 900, HSV, fx('prestige', 0.01)),
  D('t_gas_pendant', 'Pendente a gás de latão', 'Brass gas pendant', 'light', 'ceiling', 14, 14, 1889, 1915, 'nouveau', 80, HSV),
  D('t_deco_dish', 'Plafon de vidro jateado', 'Frosted glass dish light', 'light', 'ceiling', 20, 8, 1922, 1955, 'deco', 120, HSV),
  D('t_sputnik', 'Lustre Sputnik', 'Sputnik chandelier', 'light', 'ceiling', 24, 20, 1955, 1975, 'fifties', 300, HSV, fx('opinion', 0.01)),
  D('t_fluorescent', 'Calha fluorescente', 'Fluorescent fixture', 'light', 'ceiling', 30, 4, 1945, undefined, 'any', 40, SV),
  D('t_rice_globe', 'Globo de papel de arroz', 'Rice-paper globe', 'light', 'ceiling', 16, 16, 1968, undefined, 'seventies', 30, HSV),
  D('t_stage_par', 'Refletores de palco coloridos', 'Coloured stage cans', 'light', 'ceiling', 30, 10, 1965, undefined, 'any', 600, V, fx('crowd', 0.02)),
  D('t_track', 'Trilho de spots', 'Track spotlights', 'light', 'ceiling', 34, 6, 1979, undefined, 'eighties', 200, HSV),
  D('t_industrial', 'Pendentes industriais', 'Industrial pendants', 'light', 'ceiling', 30, 14, 1995, undefined, 'nineties', 180, HSV),
  D('t_led_panel', 'Painel de LED embutido', 'Recessed LED panel', 'light', 'ceiling', 24, 4, 2008, undefined, 'minimal', 150, HSV),
  D('t_smart_ceiling', 'Teto de luz que acompanha o dia', 'Circadian ceiling light', 'light', 'ceiling', 30, 4, 2018, undefined, 'smart', 900, HS, fx('rest', 0.02)),
  D('t_laser', 'Canhão de laser', 'Laser rig', 'light', 'ceiling', 16, 10, 1985, undefined, 'eighties', 1500, V, fx('crowd', 0.02)),
  // ---------------------------------------------------------------- cortinas e molduras de janela (lugar 'window')
  D('k_velvet', 'Cortina de veludo com borlas', 'Tasselled velvet curtains', 'window', 'window', 0, 0, 1889, 1940, 'nouveau', 150, HSV, fx('rest', 0.01)),
  D('k_lace', 'Cortina de renda', 'Lace curtains', 'window', 'window', 0, 0, 1889, 1960, 'nouveau', 60, H),
  D('k_stained', 'Vitral na bandeira da janela', 'Stained-glass transom', 'window', 'window', 0, 0, 1890, 1935, 'nouveau', 250, HSV, fx('opinion', 0.01)),
  D('k_venetian', 'Persiana de alumínio', 'Venetian blinds', 'window', 'window', 0, 0, 1930, undefined, 'deco', 50, HSV),
  D('k_barkcloth', 'Cortina estampada de folhagens', 'Barkcloth leaf curtains', 'window', 'window', 0, 0, 1948, 1970, 'fifties', 70, H),
  D('k_beads', 'Cortina de contas', 'Beaded curtain', 'window', 'window', 0, 0, 1966, 1985, 'seventies', 40, HV),
  D('k_vertical', 'Persiana vertical', 'Vertical blinds', 'window', 'window', 0, 0, 1979, 2005, 'eighties', 80, S),
  D('k_blackout', 'Cortina blecaute', 'Blackout curtains', 'window', 'window', 0, 0, 1990, undefined, 'nineties', 90, HSV, fx('rest', 0.01)),
  D('k_linen', 'Cortina de linho cru', 'Raw linen drapes', 'window', 'window', 0, 0, 2000, undefined, 'minimal', 120, HS),
  D('k_smart_glass', 'Vidro que escurece sozinho', 'Self-tinting smart glass', 'window', 'window', 0, 0, 2018, undefined, 'smart', 2000, HS, fx('rest', 0.02)),
  D('k_planters', 'Floreira de janela', 'Window planter box', 'window', 'window', 0, 0, 1889, undefined, 'any', 40, HSV),
  // ---------------------------------------------------------------- letreiros e logos de fachada (lugar 'sign')
  D('s_painted', 'Letreiro pintado à mão', 'Hand-painted sign', 'sign', 'sign', 40, 10, 1889, undefined, 'nouveau', 50, SV),
  D('s_brass_plate', 'Placa de latão gravada', 'Engraved brass plate', 'sign', 'sign', 16, 8, 1889, undefined, 'any', 80, S, fx('prestige', 0.01)),
  D('s_gilt_letters', 'Letras douradas na vidraça', 'Gilt lettering on the glass', 'sign', 'sign', 40, 8, 1900, 1950, 'deco', 150, SV),
  D('s_marquee', 'Marquise de lâmpadas', 'Bulb marquee', 'sign', 'sign', 50, 16, 1922, undefined, 'deco', 1200, V, fx('crowd', 0.02)),
  D('s_neon_script', 'Neon cursivo', 'Script neon sign', 'sign', 'sign', 44, 14, 1930, undefined, 'fifties', 700, SV, fx('crowd', 0.02)),
  D('s_googie', 'Placa com seta e estrela', 'Arrow-and-star roadside sign', 'sign', 'sign', 30, 30, 1950, 1975, 'fifties', 900, V, fx('crowd', 0.01)),
  D('s_supergraphic', 'Logotipo gigante pintado', 'Painted supergraphic logo', 'sign', 'sign', 50, 20, 1966, 1990, 'seventies', 400, SV),
  D('s_lightbox', 'Caixa de luz acrílica', 'Acrylic lightbox sign', 'sign', 'sign', 40, 12, 1975, undefined, 'eighties', 500, SV, fx('crowd', 0.01)),
  D('s_steel_letters', 'Letras de aço escovado', 'Brushed-steel letters', 'sign', 'sign', 44, 10, 1990, undefined, 'nineties', 600, S, fx('prestige', 0.01)),
  D('s_min_logo', 'Logo pequeno em relevo', 'Small embossed logo', 'sign', 'sign', 16, 10, 2000, undefined, 'minimal', 300, SV, fx('prestige', 0.01)),
  D('s_led_screen', 'Telão de LED na fachada', 'LED facade screen', 'sign', 'sign', 50, 24, 2012, undefined, 'smart', 5000, SV, fx('crowd', 0.02)),
  D('s_projection', 'Logo projetado na calçada', 'Logo projected on the pavement', 'sign', 'sign', 30, 6, 2020, undefined, 'smart', 1500, V, fx('crowd', 0.01)),
];
export const decoDef31 = (id: string): DecoDef31 | undefined => DECO_BY_ID.get(id);
const DECO_BY_ID = new Map(DECO31.map((d) => [d.id, d]));

// ---------------------------------------------------------------- upgrades dos itens obrigatórios

/** Item obrigatório: já existe na cena (objects5/sede5/casa5), nunca sai; tem um lugar fixo e só troca de nível. */
export interface ReqDef31 { id: string; name: L; place: DecoPlace31; room: string; slot: DecoSlot31 }
/** Ids dos objetos obrigatórios: os mesmos do registro de objetos da onda 5 (objects5) quando existem. */
export const REQ31: ReqDef31[] = [
  { id: 'telefone', name: l('Telefone', 'Telephone'), place: 'sede', room: 'office', slot: 'desk' },
  { id: 'arquivoaco', name: l('Arquivo de aço', 'Steel filing cabinet'), place: 'sede', room: 'office', slot: 'floor' },
  { id: 'cofre', name: l('Cofre', 'Safe'), place: 'sede', room: 'office', slot: 'floor' },
  { id: 'livrocaixa', name: l('Livro-caixa', 'Ledger'), place: 'sede', room: 'office', slot: 'desk' },
  { id: 'fichario', name: l('Fichário', 'Card index'), place: 'sede', room: 'office', slot: 'desk' },
  { id: 'mesames', name: l('Mesa de trabalho', 'Work desk'), place: 'sede', room: 'office', slot: 'floor' },
  { id: 'radiotv', name: l('Rádio / TV', 'Radio / TV'), place: 'sede', room: 'office', slot: 'floor' },
  { id: 'mesasom', name: l('Mesa de som', 'Mixing desk'), place: 'sede', room: 'studio', slot: 'floor' },
  { id: 'piano', name: l('Piano de ensaio', 'Rehearsal piano'), place: 'sede', room: 'rehearsal', slot: 'floor' },
  { id: 'palco', name: l('Som do palco', 'Stage PA'), place: 'sede', room: 'stage', slot: 'floor' },
  { id: 'mesareuniao', name: l('Mesa de reunião', 'Meeting table'), place: 'sede', room: 'meeting', slot: 'floor' },
  { id: 'cama', name: l('Cama', 'Bed'), place: 'home', room: 'quarto', slot: 'floor' },
];
export const reqDef31 = (id: string): ReqDef31 | undefined => REQ31.find((r) => r.id === id);

/** Um nível (modelo/acabamento) de um item obrigatório. Nível 0 é o que vem de graça (não está na lista). */
export interface UpgDef31 { id: string; req: string; lv: number; name: L; from: number; to?: number; style: DecoStyle31; price: number; fx?: DecoFx31 }
const U = (req: string, lv: number, pt: string, en: string, from: number, to: number | undefined, style: DecoStyle31, price: number, f?: DecoFx31): UpgDef31 =>
  ({ id: `u_${req}_${lv}_${from}`, req, lv, name: l(pt, en), from, ...(to ? { to } : {}), style, price, ...(f ? { fx: f } : {}) });

export const UPG31: UpgDef31[] = [
  // telefone: prestígio pequeno (atende melhor nas reuniões por telefone)
  U('telefone', 1, 'Telefone de parede com manivela de nogueira', 'Walnut crank wall telephone', 1889, 1925, 'nouveau', 120, fx('prestige', 0.005)),
  U('telefone', 1, 'Telefone de mesa de baquelite', 'Bakelite desk telephone', 1925, 1960, 'deco', 90, fx('prestige', 0.005)),
  U('telefone', 2, 'Telefone com várias linhas', 'Multi-line key telephone', 1955, 1990, 'fifties', 300, fx('prestige', 0.01)),
  U('telefone', 2, 'Central com secretária eletrônica', 'Office system with answering machine', 1985, 2005, 'eighties', 400, fx('prestige', 0.01)),
  U('telefone', 3, 'Central de videoconferência', 'Video-conference hub', 2005, undefined, 'smart', 1200, fx('prestige', 0.015)),
  // arquivo de aço: capacidade (uma gaveta a mais no catálogo)
  U('arquivoaco', 1, 'Arquivo de carvalho com puxadores de latão', 'Oak cabinet with brass pulls', 1889, 1935, 'nouveau', 150, fx('cap', 0.01)),
  U('arquivoaco', 1, 'Arquivo de aço de quatro gavetas', 'Four-drawer steel cabinet', 1935, 1975, 'deco', 120, fx('cap', 0.01)),
  U('arquivoaco', 2, 'Arquivo deslizante', 'Rolling compact shelving', 1965, 2000, 'seventies', 600, fx('cap', 0.02)),
  U('arquivoaco', 3, 'Servidor de arquivos', 'File server', 1995, undefined, 'minimal', 1500, fx('cap', 0.03)),
  // cofre
  U('cofre', 1, 'Cofre de ferro com segredo de disco', 'Dial-combination iron safe', 1889, 1950, 'nouveau', 300, fx('prestige', 0.005)),
  U('cofre', 2, 'Cofre-forte embutido', 'Built-in strongroom safe', 1940, undefined, 'deco', 1200, fx('prestige', 0.01)),
  U('cofre', 3, 'Cofre biométrico', 'Biometric safe', 2005, undefined, 'smart', 2500, fx('prestige', 0.015)),
  // livro-caixa
  U('livrocaixa', 1, 'Livro-caixa encadernado em couro', 'Leather-bound ledger', 1889, 1960, 'nouveau', 40, fx('prestige', 0.005)),
  U('livrocaixa', 2, 'Máquina de somar elétrica', 'Electric adding machine', 1950, 1985, 'fifties', 200, fx('prestige', 0.01)),
  U('livrocaixa', 2, 'Computador com planilha', 'Computer with spreadsheet', 1982, 2010, 'eighties', 1500, fx('prestige', 0.01)),
  U('livrocaixa', 3, 'Painel financeiro em tempo real', 'Real-time finance dashboard', 2010, undefined, 'smart', 2000, fx('prestige', 0.015)),
  // fichário
  U('fichario', 1, 'Fichário giratório', 'Rotary card file', 1950, undefined, 'fifties', 60, fx('opinion', 0.005)),
  U('fichario', 2, 'Agenda eletrônica', 'Electronic organiser', 1985, 2008, 'eighties', 200, fx('opinion', 0.01)),
  U('fichario', 3, 'Contatos na nuvem', 'Cloud contacts', 2008, undefined, 'smart', 300, fx('opinion', 0.01)),
  // mesa de trabalho
  U('mesames', 1, 'Escrivaninha de tampo corrediço', 'Roll-top desk', 1889, 1940, 'nouveau', 250, fx('prestige', 0.005)),
  U('mesames', 2, 'Mesa de executivo', 'Executive desk', 1935, undefined, 'deco', 700, fx('prestige', 0.01)),
  U('mesames', 3, 'Mesa com tela embutida', 'Desk with built-in screen', 2012, undefined, 'smart', 2500, fx('prestige', 0.015)),
  // rádio / TV
  U('radiotv', 1, 'Rádio de válvula de mesa', 'Tabletop valve radio', 1925, 1960, 'deco', 80),
  U('radiotv', 2, 'TV em cores com controle remoto', 'Colour TV with remote', 1965, 2000, 'seventies', 600, fx('opinion', 0.005)),
  U('radiotv', 3, 'Parede de telas', 'Wall of screens', 2000, undefined, 'minimal', 3000, fx('opinion', 0.01)),
  // mesa de som: qualidade de gravação (2–4 níveis por época)
  U('mesasom', 1, 'Mesa de corte direto em cera', 'Direct-to-wax cutting lathe', 1889, 1930, 'nouveau', 900, fx('rec', 0.01)),
  U('mesasom', 1, 'Console de válvulas de 4 canais', '4-channel valve console', 1930, 1960, 'deco', 2500, fx('rec', 0.01)),
  U('mesasom', 2, 'Console de 8 pistas', '8-track console', 1960, 1975, 'fifties', 8000, fx('rec', 0.02)),
  U('mesasom', 2, 'Console de 24 pistas', '24-track console', 1972, 1995, 'seventies', 25000, fx('rec', 0.02)),
  U('mesasom', 3, 'Console grande com automação', 'Large-format console with automation', 1985, undefined, 'eighties', 60000, fx('rec', 0.03)),
  U('mesasom', 3, 'Estação digital com superfície de controle', 'DAW with control surface', 2000, undefined, 'minimal', 30000, fx('rec', 0.03)),
  U('mesasom', 4, 'Sala imersiva com mixagem espacial', 'Immersive spatial-mix room', 2018, undefined, 'smart', 90000, fx('rec', 0.04)),
  // piano de ensaio
  U('piano', 1, 'Piano de armário afinado', 'Tuned upright piano', 1889, undefined, 'nouveau', 1500, fx('rec', 0.005)),
  U('piano', 2, 'Piano de meia cauda', 'Baby grand piano', 1900, undefined, 'deco', 8000, fx('rec', 0.01)),
  U('piano', 3, 'Piano de concerto', 'Concert grand', 1920, undefined, 'any', 30000, fx('rec', 0.015)),
  // som do palco: capacidade
  U('palco', 1, 'Corneta e megafone', 'Horn PA and megaphone', 1889, 1935, 'nouveau', 200, fx('cap', 0.01)),
  U('palco', 1, 'Amplificação valvulada de palco', 'Valve stage amplification', 1935, 1970, 'deco', 1500, fx('cap', 0.01)),
  U('palco', 2, 'Paredão de caixas', 'Wall of speakers', 1968, undefined, 'seventies', 12000, fx('cap', 0.02)),
  U('palco', 3, 'Sistema em linha suspenso', 'Flown line array', 1993, undefined, 'nineties', 40000, fx('cap', 0.03)),
  // mesa de reunião
  U('mesareuniao', 1, 'Mesa de reunião de mogno', 'Mahogany boardroom table', 1889, undefined, 'deco', 1200, fx('prestige', 0.01)),
  U('mesareuniao', 2, 'Mesa com sistema de apresentação', 'Table with presentation system', 1995, undefined, 'minimal', 4000, fx('prestige', 0.015)),
  // cama (casa): descanso
  U('cama', 1, 'Cama de ferro com colchão de molas', 'Iron bed with spring mattress', 1889, 1950, 'nouveau', 100, fx('rest', 0.01)),
  U('cama', 1, 'Cama de casal estofada', 'Upholstered double bed', 1950, undefined, 'fifties', 400, fx('rest', 0.01)),
  U('cama', 2, 'Cama king com colchão ortopédico', 'King bed with orthopaedic mattress', 1985, undefined, 'eighties', 1500, fx('rest', 0.02)),
  U('cama', 3, 'Cama que mede o sono', 'Sleep-tracking bed', 2015, undefined, 'smart', 4000, fx('rest', 0.03)),
];
export const upgDef31 = (id: string): UpgDef31 | undefined => UPG_BY_ID.get(id);
const UPG_BY_ID = new Map(UPG31.map((u) => [u.id, u]));
export const upgsOf31 = (req: string): UpgDef31[] => UPG31.filter((u) => u.req === req);

// ---------------------------------------------------------------- teto do efeito

/** Teto por LUGAR (um cômodo ou sala) e por tipo de efeito: a soma dos itens do lugar nunca passa disso. */
export const DECO_CAP31: Record<DecoFxK31, number> = { rest: 0.05, prestige: 0.04, crowd: 0.05, opinion: 0.03, cap: 0.03, rec: 0.05 };
/** Teto GERAL do conjunto de lugares de um dono (todas as salas da sede juntas, toda a casa junta). */
export const DECO_TOTAL_CAP31: Record<DecoFxK31, number> = { rest: 0.08, prestige: 0.06, crowd: 0.08, opinion: 0.04, cap: 0.05, rec: 0.06 };

/** Preço "vintage" de uma peça fora de linha no ano `y` (antiquário/leilão): sobe devagar com a idade. */
export function vintagePrice31(d: { price: number; to?: number; from: number }, y: number): number {
  if (!d.to || y < d.to) return d.price;
  const age = y - d.to;
  return Math.round(Math.max(10, d.price) * (1 + Math.min(4, age / 15)));
}
/** A peça está à venda nova neste ano? */
export const inLine31 = (d: { from: number; to?: number }, y: number): boolean => y >= d.from && (d.to === undefined || y < d.to);
