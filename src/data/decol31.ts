// R31 · DECO-L — CATÁLOGO PROVISÓRIO DE DECORAÇÃO (interface mínima até o catálogo da DECO-M, `src/data/deco31.ts`).
// Mesmos campos que a proposta pede ao catálogo da DECO-M (id, categoria, época, lugar/slot, tamanho) + o que as lojas
// precisam: ano em que aparece e sai de linha, preço novo (dólares reais, como itens31), loja que vende e efeito pequeno.
// Quando o catálogo da DECO-M chegar, `sim/r31/decoshop31.ts` passa a ler dele (`registerDecoCatalog31`) e este fica
// só como reserva para partidas de teste. Peça rara (`rare`) nunca entra em loja nem catálogo: só no leilão.

import { l, type L } from './world';

/** Estilos por época (proposta DECO). */
export type DecoEra31 = 'nouveau' | 'deco' | '50s' | '70s' | '80s' | '90s' | 'minimal' | 'smart';
export const DECO_ERAS31: DecoEra31[] = ['nouveau', 'deco', '50s', '70s', '80s', '90s', 'minimal', 'smart'];
export const DECO_ERA_NAME31: Record<DecoEra31, L> = {
  nouveau: l('Art nouveau', 'Art nouveau'), deco: l('Art déco', 'Art deco'), '50s': l('Anos 50', 'The fifties'), '70s': l('Anos 70', 'The seventies'),
  '80s': l('Anos 80', 'The eighties'), '90s': l('Anos 90', 'The nineties'), minimal: l('Minimalista', 'Minimalist'), smart: l('Casa inteligente', 'Smart home'),
};
/** Lugar no cômodo (proposta DECO). */
export type DecoSlot31 = 'wall' | 'floor' | 'desk' | 'ceiling' | 'paper' | 'rug' | 'window' | 'sign';
/** Loja que vende o item novo (o antiquário vende usado de todas). */
export type DecoSellK31 = 'furniture' | 'hifi' | 'gallery';
/** Efeito pequeno (só por funções que já existem): público num lugar aberto, prestígio, descanso em casa. */
export type DecoEffK31 = 'pub' | 'prest' | 'rest';
export interface DecoDef31 {
  id: string; name: L; desc: L; era: DecoEra31; slot: DecoSlot31; size: 1 | 2 | 3;
  from: number; to?: number; price: number; sell: DecoSellK31;
  rare?: true; eff?: [DecoEffK31, number];
}
const D = (id: string, era: DecoEra31, slot: DecoSlot31, size: 1 | 2 | 3, sell: DecoSellK31, pt: string, en: string, dp: string, de: string, from: number, to: number | undefined, price: number, x: Partial<DecoDef31> = {}): DecoDef31 =>
  ({ id, era, slot, size, sell, name: l(pt, en), desc: l(dp, de), from, to, price, ...x });

export const DECOL31: DecoDef31[] = [
  // ---- art nouveau (1889–1919)
  D('nv_chair', 'nouveau', 'floor', 1, 'furniture', 'Cadeira de palhinha curva', 'Curved cane chair', 'Madeira vergada a vapor, assento de palhinha.', 'Steam-bent wood, cane seat.', 1889, 1930, 120, { eff: ['rest', 1] }),
  D('nv_lamp', 'nouveau', 'ceiling', 1, 'furniture', 'Luminária de vitral', 'Stained-glass lamp', 'Cúpula de vidro colorido em forma de flor.', 'A coloured-glass shade shaped like a flower.', 1895, 1935, 260, { eff: ['prest', 1] }),
  D('nv_paper', 'nouveau', 'paper', 2, 'furniture', 'Papel de parede de lírios', 'Lily wallpaper', 'Ramos e lírios em curvas.', 'Branches and lilies in curves.', 1889, 1925, 90),
  D('nv_poster', 'nouveau', 'wall', 1, 'gallery', 'Cartaz litografado', 'Lithograph poster', 'Moça de cabelos longos anunciando um café-concerto.', 'A long-haired girl advertising a café-concert.', 1890, 1920, 70, { eff: ['pub', 1] }),
  D('nv_gramo', 'nouveau', 'desk', 1, 'hifi', 'Gramofone de corneta', 'Horn gramophone', 'Corneta de latão e manivela.', 'Brass horn and crank.', 1898, 1929, 180, { eff: ['pub', 1] }),
  D('nv_vase', 'nouveau', 'desk', 1, 'gallery', 'Vaso de vidro iridescente', 'Iridescent glass vase', 'Peça de ateliê, assinada.', 'A signed studio piece.', 1893, 1925, 400, { rare: true, eff: ['prest', 2] }),
  // ---- art déco (1920–1945)
  D('dc_armchair', 'deco', 'floor', 2, 'furniture', 'Poltrona clube de couro', 'Leather club armchair', 'Couro curtido e braços largos.', 'Tanned leather and wide arms.', 1920, 1960, 420, { eff: ['rest', 1] }),
  D('dc_mirror', 'deco', 'wall', 1, 'furniture', 'Espelho em leque', 'Fan mirror', 'Espelho escalonado com moldura cromada.', 'A stepped mirror with a chrome frame.', 1922, 1950, 160, { eff: ['prest', 1] }),
  D('dc_radio', 'deco', 'desk', 1, 'hifi', 'Rádio de capela', 'Cathedral radio', 'Gabinete de madeira em arco, válvulas acesas.', 'Arched wooden cabinet, glowing valves.', 1928, 1950, 220),
  D('dc_print', 'deco', 'wall', 1, 'gallery', 'Gravura de transatlântico', 'Ocean liner print', 'Proa gigante em linhas retas.', 'A giant bow in straight lines.', 1925, 1948, 110, { eff: ['prest', 1] }),
  D('dc_juke', 'deco', 'floor', 2, 'hifi', 'Jukebox de arco', 'Arched jukebox', 'Luzes que mudam de cor e 24 discos.', 'Colour-changing lights and 24 records.', 1937, 1952, 900, { eff: ['pub', 3] }),
  D('dc_bronze', 'deco', 'desk', 1, 'gallery', 'Bailarina de bronze e marfim', 'Bronze and ivory dancer', 'Escultura de salão, peça de leilão.', 'A salon sculpture, an auction piece.', 1924, 1940, 2400, { rare: true, eff: ['prest', 3] }),
  // ---- anos 50 (1946–1962)
  D('f5_sofa', '50s', 'floor', 2, 'furniture', 'Sofá de pés palito', 'Hairpin-leg sofa', 'Estofado turquesa, pés de metal finos.', 'Turquoise upholstery, thin metal legs.', 1950, 1972, 380, { eff: ['rest', 1] }),
  D('f5_tv', '50s', 'floor', 1, 'hifi', 'Televisor de gabinete', 'Console television', 'Tela pequena num móvel enorme.', 'A small screen in a huge cabinet.', 1950, 1968, 600, { eff: ['pub', 1] }),
  D('f5_juke', '50s', 'floor', 2, 'hifi', 'Jukebox cromada', 'Chrome jukebox', 'Bolhas de luz e cem compactos.', 'Bubble lights and a hundred singles.', 1948, 1966, 1100, { eff: ['pub', 3] }),
  D('f5_clock', '50s', 'wall', 1, 'furniture', 'Relógio sputnik', 'Sputnik clock', 'Raios de latão em volta do mostrador.', 'Brass rays around the dial.', 1955, 1970, 80),
  D('f5_poster', '50s', 'wall', 1, 'gallery', 'Pôster de rock and roll', 'Rock and roll poster', 'Letras gordas anunciando o baile.', 'Fat letters announcing the dance.', 1955, 1965, 40, { eff: ['pub', 1] }),
  // ---- anos 70 (1963–1979)
  D('s7_shag', '70s', 'rug', 2, 'furniture', 'Tapete felpudo laranja', 'Orange shag rug', 'Pelo comprido, cor de tangerina.', 'Long pile, tangerine colour.', 1965, 1985, 150, { eff: ['rest', 1] }),
  D('s7_lava', '70s', 'desk', 1, 'furniture', 'Luminária de lava', 'Lava lamp', 'Bolhas de cera subindo devagar.', 'Wax bubbles slowly rising.', 1965, undefined, 45),
  D('s7_hifi', '70s', 'floor', 2, 'hifi', 'Conjunto hi-fi com caixas de madeira', 'Hi-fi stack with wooden speakers', 'Receiver prateado, toca-discos e duas caixas altas.', 'Silver receiver, turntable and two tall speakers.', 1968, 1988, 950, { eff: ['pub', 2] }),
  D('s7_psych', '70s', 'wall', 1, 'gallery', 'Pôster psicodélico', 'Psychedelic poster', 'Letras derretendo em cores vivas.', 'Melting letters in loud colours.', 1966, 1978, 35, { eff: ['pub', 1] }),
  D('s7_gold', '70s', 'wall', 1, 'gallery', 'Disco de ouro emoldurado', 'Framed gold record', 'Disco dourado com placa da gravadora.', 'A gold disc with the label plaque.', 1963, undefined, 300, { eff: ['prest', 2] }),
  D('s7_egg', '70s', 'floor', 2, 'furniture', 'Poltrona ovo original', 'Original egg chair', 'Concha de fibra, primeira fornada.', 'A fibreglass shell, first batch.', 1963, 1975, 3200, { rare: true, eff: ['prest', 3] }),
  // ---- anos 80 (1980–1989)
  D('e8_neon', '80s', 'sign', 1, 'gallery', 'Letreiro de neon', 'Neon sign', 'Uma palavra em rosa e azul.', 'One word in pink and blue.', 1980, undefined, 380, { eff: ['pub', 2] }),
  D('e8_arcade', '80s', 'floor', 1, 'hifi', 'Fliperama de gabinete', 'Arcade cabinet', 'Joystick e tela de tubo.', 'Joystick and tube screen.', 1980, 1995, 1200, { eff: ['pub', 2] }),
  D('e8_boom', '80s', 'desk', 1, 'hifi', 'Rádio-gravador duplo', 'Double-deck boombox', 'Duas fitas, alça cromada.', 'Two tapes, chrome handle.', 1979, 1993, 260),
  D('e8_memphis', '80s', 'floor', 1, 'furniture', 'Estante geométrica colorida', 'Colourful geometric shelf', 'Blocos tortos em amarelo, preto e rosa.', 'Crooked blocks in yellow, black and pink.', 1981, 1992, 700, { eff: ['prest', 1] }),
  D('e8_pop', '80s', 'wall', 1, 'gallery', 'Serigrafia pop', 'Pop screen print', 'O mesmo rosto em quatro cores.', 'The same face in four colours.', 1980, 1990, 650, { eff: ['prest', 1] }),
  // ---- anos 90 (1990–1999)
  D('n9_futon', '90s', 'floor', 2, 'furniture', 'Futon de pinho', 'Pine futon', 'Vira cama para a banda que perdeu o ônibus.', 'Turns into a bed for the band that missed the bus.', 1990, 2005, 300, { eff: ['rest', 1] }),
  D('n9_cdtower', '90s', 'floor', 1, 'furniture', 'Torre de CDs', 'CD tower', 'Duzentos estojos em espiral.', 'Two hundred cases in a spiral.', 1990, 2006, 90),
  D('n9_micro', '90s', 'desk', 1, 'hifi', 'Microsystem com CD', 'CD micro hi-fi', 'Três CDs e controle remoto.', 'Three CDs and a remote.', 1990, 2008, 350, { eff: ['pub', 1] }),
  D('n9_grunge', '90s', 'wall', 1, 'gallery', 'Pôster de show em xerox', 'Photocopied gig poster', 'Colado com fita, rasgado na ponta.', 'Taped up, torn at the corner.', 1990, 2000, 20, { eff: ['pub', 1] }),
  D('n9_lava2', '90s', 'ceiling', 1, 'furniture', 'Luminária de papel de arroz', 'Rice-paper lamp', 'Globo branco que pendura do teto.', 'A white globe hanging from the ceiling.', 1990, undefined, 40),
  // ---- minimalista (2000–2014)
  D('m0_sofa', 'minimal', 'floor', 2, 'furniture', 'Sofá cinza de linhas retas', 'Straight-lined grey sofa', 'Nada sobrando.', 'Nothing extra.', 2000, 2020, 900, { eff: ['rest', 1] }),
  D('m0_flat', 'minimal', 'wall', 2, 'hifi', 'TV de tela plana', 'Flat-screen TV', 'Pendurada como um quadro.', 'Hung like a painting.', 2004, 2018, 1100, { eff: ['pub', 1] }),
  D('m0_print', 'minimal', 'wall', 1, 'gallery', 'Fotografia em preto e branco', 'Black and white photograph', 'Moldura fina, passe-partout largo.', 'Thin frame, wide mat.', 2000, undefined, 250, { eff: ['prest', 1] }),
  D('m0_dock', 'minimal', 'desk', 1, 'hifi', 'Caixa de som com encaixe', 'Speaker dock', 'Encaixa o tocador e enche a sala.', 'Dock the player and fill the room.', 2005, 2015, 300),
  D('m0_rug', 'minimal', 'rug', 2, 'furniture', 'Tapete de lã cru', 'Undyed wool rug', 'Cor de areia, sem estampa.', 'Sand coloured, no pattern.', 2000, undefined, 350),
  // ---- casa inteligente (2015–2040)
  D('sm_speaker', 'smart', 'desk', 1, 'hifi', 'Caixa de som inteligente', 'Smart speaker', 'Toca o que você pedir em voz alta.', 'Plays whatever you ask out loud.', 2015, undefined, 120, { eff: ['pub', 1] }),
  D('sm_light', 'smart', 'ceiling', 1, 'furniture', 'Lâmpadas de cor controlável', 'Colour-changing bulbs', 'Do pôr do sol ao palco em um toque.', 'From sunset to stage in one tap.', 2016, undefined, 150, { eff: ['rest', 1] }),
  D('sm_frame', 'smart', 'wall', 1, 'gallery', 'Moldura digital', 'Digital frame', 'Troca de quadro sozinha.', 'Changes painting by itself.', 2018, undefined, 400, { eff: ['prest', 1] }),
  D('sm_chair', 'smart', 'floor', 1, 'furniture', 'Poltrona ergonômica', 'Ergonomic chair', 'Ajusta tudo, até o humor.', 'Adjusts everything, even the mood.', 2015, undefined, 800, { eff: ['rest', 1] }),
  D('sm_vinyl', 'smart', 'floor', 1, 'hifi', 'Toca-discos de vitrine', 'Showcase turntable', 'Vinil de volta, agora com luz.', 'Vinyl is back, now with lights.', 2012, undefined, 700, { eff: ['pub', 2] }),
];
