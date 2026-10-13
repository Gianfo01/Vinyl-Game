// Rodada 27 — mais variedade nos bonecos desenhados pelo jogo (mesmo estilo e resolução de sempre).
// Catálogo das peças novas (cabelos, barbas, chapéus, óculos, roupas, colares, brincos, tatuagens e
// instrumentos), com o ano em que cada uma passa a existir, e o "tempero" do gerador procedural: pesos por
// época, família de gênero, região e tom de pele. Referência: os 3.130 visuais de art/personagens (specs da
// skill masters-artist-sprites) — só como pesquisa; nada daqueles sprites é usado aqui.
//
// Compatibilidade: tudo é ANEXADO (índices novos depois dos antigos; campos novos opcionais). Visual salvo
// sem as peças novas desenha pixel a pixel igual ao de antes. Peça anterior ao seu ano cai para a equivalente
// antiga (gate27) — ninguém usa moletom em 1930.

import { Rng, hashString } from '../../core/rng';
import { l, type L } from '../../data/world';
import type { Appearance } from '../../sim/types';
import { flavor29 } from './looks29';

/** [nome, ano mínimo, peça antiga equivalente (fallback), sexo ('m'/'f' = só esse; '' = todos)] */
export type Item27 = [L, number, number, '' | 'm' | 'f'];

/** Cabelos novos (índice = 23 + posição). */
export const HAIR27: Item27[] = [
  [l('tranças longas (box braids)', 'box braids'), 1970, 15, ''], // 23
  [l('cortina (repartido ao meio)', 'curtains'), 1965, 2, ''], // 24
  [l('permanente / jheri curl', 'jheri curl / perm'), 1977, 12, ''], // 25
  [l('high-top fade', 'high-top fade'), 1984, 3, ''], // 26
  [l('dois coquinhos afro', 'afro puffs'), 1965, 6, 'f'], // 27
  [l('maria-chiquinha', 'pigtails'), 0, 9, 'f'], // 28
  [l('franja emo', 'emo fringe'), 1998, 2, ''], // 29
  [l('undercut com coque', 'man bun / undercut'), 2008, 18, ''], // 30
  [l('flat top', 'flat top'), 1950, 3, ''], // 31
  [l('ondas anos 20', 'finger waves'), 0, 13, 'f'], // 32
  [l('raspado com risco', 'fade with part line'), 1988, 3, ''], // 33
  [l('longo repartido (hippie)', 'long center part'), 1964, 7, ''], // 34
  [l('dreads presos no alto', 'locs updo'), 1975, 15, ''], // 35
  [l('victory rolls', 'victory rolls'), 1938, 10, 'f'], // 36
];
export const HAIR_BASE = 23;

/** Barbas novas (bdT = 4 + posição). */
export const BEARD27: Item27[] = [
  [l('costeletas', 'mutton chops'), 0, 0, 'm'], // 4
  [l('barba longa', 'long beard'), 0, 0, 'm'], // 5
  [l('bigode ferradura', 'horseshoe mustache'), 0, 1, 'm'], // 6
  [l('bigodinho fino', 'pencil mustache'), 0, 1, 'm'], // 7
  [l('barba de contorno', 'chin strap'), 0, 3, 'm'], // 8
];
/** Chapéus novos (hatT = 9 + posição). Fallback 0 = sem chapéu. */
export const HAT27: Item27[] = [
  [l('turbante', 'turban'), 0, 0, ''], // 9
  [l('turbante africano (gele)', 'headwrap (gele)'), 0, 0, ''], // 10
  [l('boné pra trás', 'backwards cap'), 1985, 0, ''], // 11
  [l('chapéu bucket', 'bucket hat'), 1965, 0, ''], // 12
  [l('boina de jornaleiro / kangol', 'flat cap / kangol'), 0, 0, ''], // 13
  [l('chapéu-coco', 'bowler'), 0, 0, ''], // 14
  [l('panamá / palheta', 'panama / boater'), 0, 0, ''], // 15
  [l('sombrero', 'sombrero'), 0, 0, ''], // 16
  [l('quepe militar', 'military cap'), 0, 0, ''], // 17
  [l('kufi / fila', 'kufi / fila'), 0, 0, ''], // 18
  [l('chapéu de cangaceiro', 'cangaceiro hat'), 0, 0, ''], // 19
  [l('cloche', 'cloche'), 1918, 0, 'f'], // 20
  [l('durag', 'durag'), 1990, 0, ''], // 21
  [l('boina rasta (tam)', 'rasta tam'), 1970, 0, ''], // 22
];
/** Óculos novos (glT = 4 + posição). */
export const GLASSES27: Item27[] = [
  [l('aviador', 'aviator'), 1965, 2, ''], // 4
  [l('aro grosso', 'thick frames'), 1945, 0, ''], // 5
  [l('gatinho', 'cat-eye'), 1950, 0, 'f'], // 6
  [l('redondos coloridos', 'tinted round'), 1966, 1, ''], // 7
  [l('esportivo envolvente', 'wraparound'), 1990, 2, ''], // 8
];
/** Roupas novas (outfit = 4 + posição). Fallback = roupa base 0..3. */
export const OUTFIT27: Item27[] = [
  [l('Jaqueta de couro', 'Leather jacket'), 1950, 1, ''], // 4
  [l('Jaqueta jeans', 'Denim jacket'), 1955, 1, ''], // 5
  [l('Camisa aberta', 'Open shirt'), 1955, 0, ''], // 6
  [l('Regata', 'Tank top'), 1965, 0, ''], // 7
  [l('Smoking', 'Tuxedo'), 0, 1, ''], // 8
  [l('Túnica / kaftan estampado', 'Kaftan / African print'), 0, 2, ''], // 9
  [l('Lantejoulas', 'Sequins'), 0, 2, ''], // 10
  [l('Casaco militar', 'Military jacket'), 0, 1, ''], // 11
  [l('Agasalho esportivo', 'Tracksuit'), 1975, 3, ''], // 12
  [l('Moletom com capuz', 'Hoodie'), 1975, 3, ''], // 13
  [l('Top cropped', 'Crop top'), 1965, 0, 'f'], // 14
  [l('Camisa xadrez', 'Flannel shirt'), 0, 0, ''], // 15
  [l('Macacão', 'Jumpsuit'), 1968, 1, ''], // 16
  [l('Jaqueta de franjas', 'Fringe jacket'), 0, 1, ''], // 17
  [l('Qipao', 'Cheongsam / qipao'), 1925, 2, 'f'], // 18
  [l('Sári', 'Sari'), 0, 2, 'f'], // 19
  [l('Quimono', 'Kimono'), 0, 2, ''], // 20
  [l('Gola alta', 'Turtleneck'), 0, 3, ''], // 21
  [l('Colete', 'Waistcoat'), 0, 1, ''], // 22
  [l('Poncho', 'Poncho'), 0, 3, ''], // 23
  [l('Camisa florida', 'Hawaiian shirt'), 1935, 0, ''], // 24
  [l('Camiseta estampada', 'Graphic tee'), 1965, 0, ''], // 25
  // rodada 29 (looks29.ts): roupas por época e região
  [l('Terno zoot', 'Zoot suit'), 1938, 1, 'm'], // 26
  [l('Guayabera', 'Guayabera'), 1940, 0, ''], // 27
  [l('Agbada / bubu', 'Agbada / boubou'), 0, 2, ''], // 28
  [l('Hanbok', 'Hanbok'), 0, 2, ''], // 29
  [l('Jaqueta college', 'Varsity jacket'), 1950, 1, ''], // 30
  [l('Terninho de ombreiras', 'Power suit'), 1980, 1, ''], // 31
  [l('Colete de patches', 'Battle vest'), 1970, 0, ''], // 32
  [l('Camisa de futebol', 'Football shirt'), 1970, 0, ''], // 33
];
export const OUTFIT_BASE = 4;
/** Peças que vão até o tornozelo (saia/túnica comprida). */
export const LONG27 = new Set([9, 18, 19, 20, 28, 29]);

/** Colares e afins (nk). */
export const NECK27: Item27[] = [
  [l('nenhum', 'none'), 0, 0, ''],
  [l('corrente de ouro', 'gold chain'), 0, 0, ''], // 1
  [l('correntão', 'big gold chain'), 1984, 1, ''], // 2
  [l('colar de pérolas', 'pearls'), 0, 0, ''], // 3
  [l('colar de contas', 'beads'), 0, 0, ''], // 4
  [l('crucifixo', 'cross'), 0, 0, ''], // 5
  [l('lenço no pescoço', 'neck scarf'), 0, 0, ''], // 6
  [l('gargantilha', 'choker'), 0, 0, ''], // 7
  [l('boá de plumas', 'feather boa'), 0, 0, ''], // 8
  [l('gravata-borboleta', 'bow tie'), 0, 0, ''], // 9
  [l('medalhão da paz', 'peace medallion'), 1966, 4, ''], // 10
];
/** Brincos (ear). */
export const EAR27: Item27[] = [
  [l('nenhum', 'none'), 0, 0, ''],
  [l('argola dourada', 'gold hoop'), 0, 0, ''], // 1
  [l('ponto de luz', 'stud'), 0, 0, ''], // 2
  [l('argola prateada', 'silver hoop'), 0, 0, ''], // 3
  [l('brincão', 'drop earrings'), 0, 0, ''], // 4
];
/** Tatuagens (tat). */
export const TAT27: Item27[] = [
  [l('nenhuma', 'none'), 0, 0, ''],
  [l('braços fechados', 'sleeves'), 1970, 4, ''], // 1
  [l('pescoço', 'neck'), 1985, 0, ''], // 2
  [l('rosto', 'face'), 2005, 2, ''], // 3
  [l('um braço (old school)', 'one arm (old school)'), 1930, 0, ''], // 4
];

export type InstRole = 'guitar' | 'bass' | 'keys' | 'vocal' | 'horns' | 'strings' | 'drums' | 'producer' | 'dj' | 'mc';
/** Instrumentos (inst): [nome, ano, papéis que podem usar]. */
export const INST27: [L, number, InstRole[]][] = [
  [l('padrão do papel', 'role default'), 0, []],
  [l('violão', 'acoustic guitar'), 0, ['guitar', 'strings', 'vocal']], // 1
  [l('guitarra Les Paul', 'single-cut (Les Paul)'), 1952, ['guitar']], // 2
  [l('guitarra Strato', 'double-cut (Strat)'), 1954, ['guitar']], // 3
  [l('guitarra SG', 'SG'), 1961, ['guitar']], // 4
  [l('Flying V', 'Flying V'), 1958, ['guitar']], // 5
  [l('semiacústica', 'hollow body'), 1936, ['guitar']], // 6
  [l('guitarra de dois braços', 'double-neck'), 1958, ['guitar']], // 7
  [l('banjo', 'banjo'), 0, ['guitar', 'strings']], // 8
  [l('cavaquinho', 'cavaquinho'), 0, ['guitar', 'strings', 'vocal']], // 9
  [l('cítara', 'sitar'), 0, ['guitar', 'strings']], // 10
  [l('ukulele', 'ukulele'), 0, ['guitar', 'strings', 'vocal']], // 11
  [l('baixo violino', 'violin bass'), 1956, ['bass']], // 12
  [l('contrabaixo acústico', 'upright bass'), 0, ['bass', 'strings']], // 13
  [l('sanfona / acordeão', 'accordion'), 0, ['keys', 'strings', 'vocal']], // 14
  [l('keytar', 'keytar'), 1980, ['keys']], // 15
  [l('gaita', 'harmonica'), 0, ['vocal', 'guitar']], // 16
  [l('pandeiro', 'pandeiro'), 0, ['vocal', 'drums']], // 17
  [l('trombone', 'trombone'), 0, ['horns']], // 18
  [l('clarinete', 'clarinet'), 0, ['horns']], // 19
  [l('flauta', 'flute'), 0, ['horns']], // 20
  [l('violoncelo', 'cello'), 0, ['strings']], // 21
  [l('maracas', 'maracas'), 0, ['vocal', 'drums']], // 22
  [l('sampler / MPC', 'sampler / MPC'), 1988, ['producer', 'dj', 'mc']], // 23
  [l('microfone headset', 'headset mic'), 1985, ['vocal', 'mc']], // 24
  [l('alaúde / buzuqui', 'oud / bouzouki'), 0, ['guitar', 'strings']], // 25
];

const MAXI = { hair: HAIR_BASE + HAIR27.length, outfit: OUTFIT_BASE + OUTFIT27.length };
export const HAIR_COUNT27 = MAXI.hair;
export const OUTFIT_COUNT27 = MAXI.outfit;

/** Instrumento válido para o papel e o ano (0 = padrão do papel). */
export function instFor(a: Appearance, role: string | null | undefined, year: number): number {
  const i = a.inst ?? 0;
  const it = INST27[i];
  if (!i || !it || !role || it[1] > year || !it[2].includes(role as InstRole)) return 0;
  return i;
}

/** Visual com as peças novas que ainda não existem no ano trocadas pela equivalente antiga. Sem peça nova = o mesmo objeto. */
export function gate27(a: Appearance, year: number): Appearance {
  let o: Appearance | null = null;
  const w = (): Appearance => (o ??= { ...a });
  const hi = a.hair - HAIR_BASE;
  if (hi >= 0 && HAIR27[hi] && HAIR27[hi][1] > year) w().hair = HAIR27[hi][2];
  const oi = a.outfit - OUTFIT_BASE;
  if (oi >= 0 && OUTFIT27[oi] && OUTFIT27[oi][1] > year) w().outfit = OUTFIT27[oi][2];
  const ht = (a.hatT ?? 0) - 9;
  if (ht >= 0 && HAT27[ht] && HAT27[ht][1] > year) { w().hat = false; delete w().hatT; }
  const gt = (a.glT ?? 0) - 4;
  if (gt >= 0 && GLASSES27[gt] && GLASSES27[gt][1] > year) w().glT = GLASSES27[gt][2] || undefined;
  if (a.nk && NECK27[a.nk]?.[1] > year) w().nk = NECK27[a.nk][2] || undefined;
  if (a.tat && TAT27[a.tat]?.[1] > year) w().tat = TAT27[a.tat][2] || undefined;
  if (a.inst && (INST27[a.inst]?.[1] ?? 0) > year) w().inst = undefined;
  return o ?? a;
}

// ------------------------------------------------------------------ gerador (tempero por época/gênero/região)

export type Fam27 = 'blues_jazz' | 'country_folk' | 'rnb' | 'rock' | 'pop' | 'hiphop' | 'electronic' | 'caribbean' | 'latin' | 'brazil' | 'africa' | 'asia_me' | 'europe' | 'sacred';
export interface Ctx27 { year: number; family?: string; genre?: string; country?: string | null; sex?: 'm' | 'f' | 'x'; role?: string }

/** Peso por janela de anos: 0 antes de `from`, `pk` dentro do pico, 1 fora (×0.35 depois de `to`). */
const win = (y: number, from: number, p0: number, p1: number, to = 9999, pk = 4): number => (y < from ? 0 : y >= p0 && y <= p1 ? pk : y > to ? 0.35 : 1);
const TEXTURED = [0.12, 0.35, 1.6, 2.2];
const STRAIGHT = [1.2, 1.1, 0.6, 0.35];

type W = (c: Ctx27, skin: number) => number;
const F = (fams: Partial<Record<Fam27, number>>, def = 1) => (c: Ctx27) => fams[c.family as Fam27] ?? def;

/** Cabelos que o gerador sorteia (inclui os antigos que marcaram época). */
const HAIR_W: [number, '' | 'm' | 'f', W][] = [
  [4, 'm', (c) => win(c.year, 1950, 1954, 1962, 1970) * F({ rock: 2, country_folk: 1.6, latin: 1.3 })(c)], // topete
  [5, '', (c) => win(c.year, 1962, 1963, 1967, 1975) * F({ rock: 2.5, pop: 1.5, europe: 1.5 })(c)], // cuia
  [6, '', (c, s) => win(c.year, 1965, 1968, 1979, 1985) * TEXTURED[s] * F({ rnb: 2, africa: 1.5, brazil: 1.4, blues_jazz: 1.2 })(c)], // black
  [11, '', (c) => win(c.year, 1976, 1977, 1984, 1995) * F({ rock: 1.5 }, 0.1)(c) * 0.6], // moicano
  [16, '', (c) => win(c.year, 1975, 1981, 1991, 1996) * F({ rock: 2, country_folk: 1.8, europe: 1.4, latin: 1.2 })(c)], // mullet
  [17, 'f', (c) => win(c.year, 1958, 1960, 1966, 1972) * F({ rnb: 2, pop: 1.6, country_folk: 1.6 })(c)], // colmeia
  [18, '', (c) => win(c.year, 0, 1920, 1955, 1965) * F({ blues_jazz: 2, latin: 1.5, europe: 1.4 })(c)], // gomalina
  [13, 'f', (c) => win(c.year, 0, 1920, 1935, 1950)], // chanel anos 20
  [7, '', (c) => win(c.year, 1965, 1968, 1978) * F({ rock: 2, country_folk: 1.4, brazil: 1.2 })(c)], // longo
  [3, '', (c) => win(c.year, 0, 1990, 2030) * F({ hiphop: 2.5, africa: 2, caribbean: 1.6, electronic: 1.4 })(c) * 0.5], // raspado
  [23, '', (c, s) => win(c.year, 1970, 1990, 2030) * TEXTURED[s] * F({ hiphop: 2, rnb: 1.8, africa: 1.8, caribbean: 1.4, pop: 1.1 })(c)],
  [24, '', (c, s) => win(c.year, 1965, 1992, 1999, 2005) * STRAIGHT[s] * F({ pop: 1.8, rock: 1.6, asia_me: 2 })(c)],
  [25, '', (c, s) => win(c.year, 1977, 1980, 1988, 1994) * TEXTURED[s] * F({ rnb: 2.5, pop: 1.3, hiphop: 1.4 })(c)],
  [26, 'm', (c, s) => win(c.year, 1984, 1987, 1993, 1997) * TEXTURED[s] * F({ hiphop: 3, rnb: 2 }, 0.3)(c)],
  [27, 'f', (c, s) => win(c.year, 1965, 1970, 1980) * TEXTURED[s] * F({ rnb: 2, africa: 1.5, hiphop: 1.5 })(c)],
  [28, 'f', (c) => win(c.year, 0, 1995, 2030) * F({ pop: 1.6, asia_me: 1.8, country_folk: 1.2 })(c) * 0.6],
  [29, '', (c, s) => win(c.year, 1998, 2003, 2012, 2016) * STRAIGHT[s] * F({ rock: 2.5, pop: 1.2 }, 0.4)(c)],
  [30, '', (c) => win(c.year, 2008, 2012, 2030) * F({ pop: 1.4, electronic: 1.4, rock: 1.2 })(c)],
  [31, 'm', (c) => win(c.year, 1950, 1955, 1962, 1990) * F({ rock: 1.3, europe: 1.2 })(c) * 0.6],
  [32, 'f', (c) => win(c.year, 0, 1920, 1938, 1950) * F({ blues_jazz: 2, europe: 1.5 })(c)],
  [33, 'm', (c, s) => win(c.year, 1988, 1989, 1996) * TEXTURED[s] * F({ hiphop: 2.5, rnb: 1.8, caribbean: 1.6, africa: 1.4 }, 0.3)(c)],
  [34, '', (c, s) => win(c.year, 1964, 1967, 1975, 1982) * STRAIGHT[s] * F({ rock: 2, country_folk: 2.2, brazil: 1.4, latin: 1.3 })(c)],
  [35, '', (c, s) => win(c.year, 1975, 2000, 2030) * TEXTURED[s] * F({ caribbean: 2.5, hiphop: 1.6, africa: 1.6, rnb: 1.2 })(c)],
  [36, 'f', (c) => win(c.year, 1938, 1940, 1952, 1958) * F({ blues_jazz: 1.8, country_folk: 1.6, pop: 1.3 })(c)],
];

const OUT_W: [number, '' | 'm' | 'f', W][] = [
  [4, '', (c) => win(c.year, 1950, 1977, 1992) * F({ rock: 3, hiphop: 1.3, electronic: 1.4, pop: 1.1 }, 0.5)(c)],
  [5, '', (c) => win(c.year, 1955, 1980, 1995) * F({ rock: 2, country_folk: 1.8, pop: 1.2 }, 0.6)(c)],
  [6, 'm', (c) => win(c.year, 1955, 1970, 1982) * F({ rock: 1.6, latin: 1.8, brazil: 1.8, rnb: 1.4, caribbean: 1.4 })(c)],
  [7, '', (c) => win(c.year, 1965, 1985, 2030) * F({ rock: 1.6, hiphop: 1.4, brazil: 1.3 })(c) * 0.7],
  [8, 'm', (c) => win(c.year, 0, 1925, 1960) * F({ blues_jazz: 2.5, sacred: 2, latin: 1.3, europe: 1.4 })(c) * 0.7],
  [9, '', (c) => F({ africa: 4, asia_me: 1.8, caribbean: 0.8 }, 0.08)(c) * (c.year >= 1967 && c.year < 1978 ? 2 : 1)],
  [10, '', (c) => win(c.year, 0, 1972, 1982) * F({ pop: 1.6, rnb: 1.8, latin: 1.3 }, 0.4)(c) * (c.sex === 'f' ? 1.5 : 0.5)],
  [11, '', (c) => win(c.year, 0, 1966, 1970, 1975) * F({ rock: 1.4, pop: 1.3 }, 0.3)(c) * 0.5],
  [12, '', (c) => win(c.year, 1975, 1983, 1990) * F({ hiphop: 3, electronic: 1.4, europe: 1.1 }, 0.3)(c)],
  [13, '', (c) => win(c.year, 1975, 1995, 2030) * F({ hiphop: 3, electronic: 2, rock: 1.2, pop: 1.2 }, 0.5)(c)],
  [14, 'f', (c) => win(c.year, 1965, 1990, 2030) * F({ pop: 2, latin: 1.5, hiphop: 1.4, rnb: 1.4, brazil: 1.2 }, 0.6)(c)],
  [15, '', (c) => win(c.year, 0, 1990, 1996) * F({ rock: 2.5, country_folk: 2.5 }, 0.4)(c)],
  [16, '', (c) => win(c.year, 1968, 1970, 1979, 1985) * F({ rnb: 1.6, pop: 1.4, rock: 1.2 }, 0.6)(c) * 0.6],
  [17, '', (c) => win(c.year, 0, 1966, 1974, 1980) * F({ rock: 1.6, country_folk: 2.5 }, 0.3)(c) * 0.6],
  [18, 'f', (c) => (c.year >= 1925 ? 1 : 0) * F({ asia_me: 3 }, 0)(c) * (c.country === 'CHN' || c.country === 'HKG' || c.country === 'TWN' ? 3 : 1)],
  [19, 'f', (c) => F({ asia_me: 2 }, 0)(c) * (c.country === 'IND' || c.country === 'PAK' || c.country === 'BGD' ? 4 : 0.6)],
  [20, '', (c) => F({ asia_me: 1.4 }, 0.03)(c) * (c.country === 'JPN' ? 4 : 0.5) * (c.year >= 1966 && c.year < 1976 ? 2 : 1)],
  [21, '', (c) => win(c.year, 0, 1955, 1970) * F({ blues_jazz: 2, europe: 1.8, pop: 1.1 })(c) * 0.6],
  [22, '', (c) => win(c.year, 0, 1920, 1945) * F({ country_folk: 2, blues_jazz: 1.4, europe: 1.4 })(c) * 0.6],
  [23, '', (c) => F({ latin: 2.5, country_folk: 0.8 }, 0.05)(c) * (c.year >= 1966 && c.year < 1976 ? 2 : 1)],
  [24, '', (c) => win(c.year, 1935, 1955, 1965) * F({ caribbean: 2.5, latin: 2, brazil: 2, pop: 1.1 }, 0.5)(c)],
  [25, '', (c) => win(c.year, 1965, 1975, 2030) * F({ rock: 1.6, hiphop: 1.4, pop: 1.2, electronic: 1.3 })(c)],
];

/** Cores típicas de algumas peças (índices de OUTFIT_COLORS). */
const OUT_COLOR: Record<number, number[]> = { 4: [6, 6, 11, 6, 1], 5: [0, 12, 0], 8: [6, 6, 5, 0], 11: [1, 2, 0, 6], 12: [1, 0, 2, 6, 4], 15: [1, 2, 0], 16: [5, 6, 8, 1], 17: [11, 3, 11], 24: [1, 12, 7, 2] };

const HAT_W: [number, W][] = [
  [2, (c) => F({ country_folk: 5, latin: 1.5, brazil: 1.3 }, 0.3)(c)], // caubói
  [6, (c) => win(c.year, 1975, 1990, 2030) * F({ hiphop: 2.5, rock: 1.2, electronic: 1.4 })(c)], // boné
  [7, (c) => win(c.year, 0, 1925, 1960) * F({ blues_jazz: 2.5, caribbean: 2, latin: 1.4, brazil: 1.4 })(c)], // fedora
  [9, (c) => F({ asia_me: 1.5 }, 0.05)(c) * (c.country === 'IND' || c.country === 'PAK' ? 5 : 1)],
  [10, (c) => F({ africa: 3.5, rnb: 0.6, caribbean: 0.8 }, 0.05)(c) * (c.sex === 'f' ? 2 : 0.2)],
  [11, (c) => win(c.year, 1985, 1990, 2005) * F({ hiphop: 3, pop: 1.1 }, 0.4)(c)],
  [12, (c) => win(c.year, 1965, 1988, 1998) * F({ hiphop: 2.2, electronic: 1.6, rock: 1.4 }, 0.5)(c)],
  [13, (c) => (win(c.year, 0, 1920, 1945) + win(c.year, 1982, 1983, 1990, 1995)) * F({ hiphop: 2, europe: 1.6, blues_jazz: 1.6 })(c)],
  [14, (c) => win(c.year, 0, 1920, 1935, 1945) * F({ europe: 2, blues_jazz: 1.5 })(c)],
  [15, (c) => win(c.year, 0, 1920, 1940) * F({ brazil: 2.5, caribbean: 2, latin: 2, blues_jazz: 1.4 })(c)],
  [16, (c) => F({ latin: 2.5 }, 0)(c) * (c.country === 'MEX' ? 3 : 0.4)],
  [18, (c) => F({ africa: 2.5, hiphop: 0.8 }, 0.05)(c) * (c.sex === 'f' ? 0.1 : 1)],
  [19, (c) => F({ brazil: 1 }, 0)(c) * ((c.genre ?? '').includes('forro') || (c.genre ?? '').includes('baiao') ? 6 : 0.3)],
  [20, (c) => win(c.year, 1918, 1922, 1932, 1938) * (c.sex === 'f' ? 4 : 0)],
  [21, (c) => win(c.year, 1990, 1997, 2030) * F({ hiphop: 3, rnb: 1.6 }, 0.1)(c)],
  [22, (c) => win(c.year, 1970, 1975, 1990) * F({ caribbean: 4 }, 0.08)(c)],
];

function pickW<T>(r: Rng, items: [T, number][]): T | undefined {
  let tot = 0;
  for (const [, w] of items) tot += Math.max(0, w);
  if (tot <= 0) return undefined;
  let x = r.next() * tot;
  for (const [v, w] of items) { x -= Math.max(0, w); if (x < 0) return v; }
  return items[items.length - 1][0];
}

const okSex = (s: '' | 'm' | 'f', sx: 'm' | 'f' | 'x' | undefined) => !s || !sx || sx === 'x' || s === sx;

/** Instrumento sorteado pelo papel/gênero/época (0 = padrão). Semente fixa por pessoa (não muda por década). */
function instPick(seed: string, c: Ctx27): number {
  const r = Rng.fromSeed(`inst27:${seed}`);
  const g = c.genre ?? '';
  const f = c.family as Fam27 | undefined;
  const y = c.year;
  const opts: [number, number][] = [[0, 10]];
  const add = (i: number, w: number) => { if (INST27[i][1] <= y && INST27[i][2].includes(c.role as InstRole)) opts.push([i, w]); };
  if (c.role === 'guitar') {
    add(1, f === 'country_folk' ? 14 : f === 'brazil' || f === 'latin' ? 9 : y < 1950 ? 12 : 2.5);
    add(2, f === 'rock' ? 4 : 1.5); add(3, f === 'rock' || f === 'pop' ? 4 : 1.5); add(4, f === 'rock' && y < 1985 ? 2.5 : 0.6);
    add(5, /metal|thrash|hard_rock/.test(g) ? 6 : f === 'rock' ? 0.8 : 0.1); add(6, f === 'blues_jazz' || f === 'rnb' ? 6 : y < 1965 ? 3 : 0.6);
    add(7, f === 'rock' && y >= 1968 && y < 1985 ? 0.6 : 0.05); add(8, f === 'country_folk' ? 4 : 0.2);
    add(9, /samba|pagode|choro/.test(g) ? 14 : f === 'brazil' ? 1.5 : 0); add(10, f === 'asia_me' ? 5 : y >= 1966 && y < 1970 && f === 'rock' ? 0.3 : 0);
    add(11, f === 'caribbean' ? 0.6 : 0.15); add(16, f === 'blues_jazz' || f === 'country_folk' ? 1.2 : 0.2); add(25, f === 'asia_me' || f === 'europe' ? 2 : 0);
  } else if (c.role === 'bass') {
    add(12, y >= 1960 && y < 1975 ? 1 : 0.2); add(13, f === 'blues_jazz' ? 20 : y < 1955 ? 12 : f === 'country_folk' || f === 'latin' ? 3 : 0.4);
  } else if (c.role === 'keys') {
    add(14, /forro|baiao|tango|cumbia|vallenato|norte|polka|chanson|musette|zydeco/.test(g) ? 20 : f === 'europe' || f === 'latin' ? 2 : 0.3);
    add(15, y >= 1980 && y < 1990 ? 1.8 : 0.3);
  } else if (c.role === 'vocal') {
    add(1, f === 'country_folk' ? 4 : f === 'brazil' || f === 'latin' ? 1.5 : 0.6); add(9, /samba|pagode/.test(g) ? 2 : 0);
    add(14, /forro|baiao/.test(g) ? 4 : 0); add(16, f === 'blues_jazz' || f === 'country_folk' ? 1 : 0.1);
    add(17, f === 'brazil' ? 2 : 0.05); add(22, f === 'latin' || f === 'caribbean' ? 1.6 : 0.05); add(24, f === 'pop' && y >= 1990 ? 1.5 : 0.1);
  } else if (c.role === 'horns') {
    add(18, f === 'blues_jazz' || f === 'caribbean' || f === 'latin' ? 3 : 1); add(19, y < 1950 ? 4 : f === 'europe' ? 1 : 0.5); add(20, f === 'latin' || f === 'brazil' ? 1.5 : 0.6);
  } else if (c.role === 'strings') {
    add(21, f === 'europe' || f === 'sacred' ? 4 : 1); add(10, f === 'asia_me' ? 6 : 0); add(25, f === 'asia_me' || f === 'europe' ? 3 : 0);
    add(9, f === 'brazil' ? 6 : 0); add(14, f === 'brazil' || f === 'latin' ? 2 : 0); add(13, f === 'blues_jazz' ? 3 : 0.5);
  } else if (c.role === 'drums') {
    add(17, f === 'brazil' ? 2 : 0); add(22, f === 'latin' || f === 'caribbean' ? 1 : 0);
  } else if (c.role === 'producer' || c.role === 'dj' || c.role === 'mc') add(23, f === 'hiphop' ? 4 : 1);
  return pickW(r, opts) ?? 0;
}

/**
 * Tempero da rodada 27 sobre o visual procedural (randomLook): troca cabelo, roupa e acessórios por peças da
 * época, do gênero e da região. Determinístico (semente da pessoa + década). Nunca é aplicado a visual gravado.
 */
export function flavor27(base: Appearance, seed: string, c: Ctx27): Appearance {
  const dec = Math.floor(c.year / 10);
  const r = Rng.fromSeed(`look27:${seed}:${dec}`);
  const a: Appearance = { ...base };
  const sx = c.sex ?? base.sx;
  const skin = base.skin % 4;
  const fem = sx === 'f';
  // cabelo da moda
  if (a.hair > 0 && r.chance(0.42)) {
    const h = pickW(r, HAIR_W.filter(([i, s]) => okSex(s, sx) && (i < HAIR_BASE || HAIR27[i - HAIR_BASE][1] <= c.year)).map(([i, , w]) => [i, w(c, skin)] as [number, number]));
    if (h !== undefined) a.hair = h;
  } else r.next();
  // roupa da moda
  if (r.chance(0.48)) {
    const o = pickW(r, OUT_W.filter(([i, s]) => okSex(s, sx) && OUTFIT27[i - OUTFIT_BASE][1] <= c.year).map(([i, , w]) => [i, w(c, skin)] as [number, number]));
    if (o !== undefined) { a.outfit = o; const oc = OUT_COLOR[o]; if (oc && r.chance(0.7)) a.outfitColor = r.pick(oc); }
  } else r.next();
  // chapéu: quem já tinha ganha um tipo coerente; alguns gêneros põem chapéu em mais gente
  const hatP = c.family === 'country_folk' ? 0.25 : c.family === 'hiphop' && c.year >= 1985 ? 0.22 : c.family === 'africa' && fem ? 0.2 : c.family === 'caribbean' ? 0.12 : 0.04;
  if (a.hat || r.chance(hatP)) {
    const t = pickW(r, HAT_W.filter(([i]) => i < 9 || HAT27[i - 9][1] <= c.year).map(([i, w]) => [i, w(c, skin)] as [number, number]));
    if (t !== undefined && r.chance(0.8)) { a.hat = true; a.hatT = t; }
  } else { r.next(); }
  // óculos
  if (a.glasses) {
    const g = pickW(r, [[0, 6], [1, c.year < 1950 || (c.year >= 1966 && c.year < 1976) ? 3 : 0.8], [2, 2], [4, win(c.year, 1965, 1972, 1985) * 1.2], [5, win(c.year, 1945, 1950, 1965) * 1.5 + (c.year >= 2008 ? 2 : 0)], [6, fem ? win(c.year, 1950, 1952, 1964, 1970) * 2 : 0], [7, win(c.year, 1966, 1967, 1975, 1980) * 1.4], [8, win(c.year, 1990, 1995, 2005, 2010) * 0.8]] as [number, number][]);
    a.glT = g || undefined;
  } else r.next();
  // barba
  if (a.beard && !fem) {
    const b = pickW(r, [[0, 5], [1, 3], [2, c.year >= 1990 ? 2 : 0.8], [3, c.year >= 1985 ? 2.5 : 0.6], [4, win(c.year, 0, 1968, 1978) * 0.8], [5, win(c.year, 1966, 1969, 1976) * (c.family === 'rock' || c.family === 'country_folk' ? 1 : 0.3) + (c.year >= 2010 ? 0.6 : 0)], [6, win(c.year, 1965, 1968, 1980) * 0.8], [7, win(c.year, 0, 1925, 1955, 1962) * 2.2], [8, win(c.year, 1998, 2002, 2015) * (c.family === 'hiphop' || c.family === 'rnb' ? 2 : 0.4)]] as [number, number][]);
    a.bdT = b || undefined;
  } else r.next();
  // colares
  const nkW: [number, number][] = [[0, 12],
    [1, win(c.year, 1970, 1985, 2030) * (c.family === 'hiphop' ? 6 : c.family === 'rnb' || c.family === 'latin' || c.family === 'caribbean' ? 1.5 : 0.4)],
    [2, win(c.year, 1984, 1986, 1992) * (c.family === 'hiphop' ? 8 : 0.2) + (c.year >= 2005 && c.family === 'hiphop' ? 3 : 0)],
    [3, fem ? win(c.year, 0, 1925, 1965) * 2 : 0], [4, win(c.year, 0, 1966, 1975) * (c.family === 'rock' || c.family === 'country_folk' ? 1.5 : 0.4) + (c.family === 'africa' || c.family === 'caribbean' ? 2 : 0)],
    [5, c.family === 'latin' || c.family === 'rock' ? 0.7 : 0.2], [6, win(c.year, 0, 1960, 1975) * 0.5 + (c.family === 'country_folk' ? 0.5 : 0)],
    [7, fem ? win(c.year, 1990, 1993, 2000) * 1.6 : 0], [8, c.year >= 1970 && c.year < 1980 && (c.family === 'rock' || c.family === 'pop') ? 0.4 : 0.03],
    [9, win(c.year, 0, 1925, 1955) * (fem ? 0 : 1.2)], [10, win(c.year, 1966, 1967, 1973, 1980) * (c.family === 'rock' || c.family === 'country_folk' ? 1.6 : 0.3)]];
  a.nk = pickW(r, nkW.filter(([i]) => NECK27[i][1] <= c.year)) || undefined;
  // brincos
  const earP = fem ? 0.55 : c.year >= 1980 ? (c.family === 'hiphop' || c.family === 'rock' ? 0.22 : 0.08) : 0.02;
  a.ear = r.chance(earP) ? (fem ? pickW(r, [[1, 3], [2, 2], [3, 1], [4, 2]] as [number, number][]) : pickW(r, [[2, 3], [1, 1.5], [3, 1.5]] as [number, number][])) : (r.next(), undefined);
  // tatuagens
  const tatP = c.year < 1960 ? 0.01 : c.year < 1985 ? (c.family === 'rock' ? 0.1 : 0.03) : (c.family === 'hiphop' || c.family === 'rock' ? 0.32 : c.family === 'latin' || c.family === 'pop' ? 0.12 : 0.07);
  if (r.chance(tatP)) {
    a.tat = pickW(r, ([[1, 4], [4, 3], [2, c.family === 'hiphop' ? 3 : 0.8], [3, c.family === 'hiphop' ? 1.4 : 0.1]] as [number, number][]).filter(([i]) => TAT27[i][1] <= c.year)) || undefined;
  } else r.next();
  if (!a.nk) delete a.nk;
  if (!a.ear) delete a.ear;
  if (!a.tat) delete a.tat;
  if (!a.glT) delete a.glT;
  if (!a.bdT) delete a.bdT;
  const ins = c.role ? instPick(seed, c) : 0;
  if (ins) a.inst = ins;
  return gate27(flavor29(a, seed, c), c.year); // r29: roupas regionais e corpos novos (RNG próprio)
}

/** Variação estável (0..n-1) por pessoa — útil para cores do instrumento etc. */
export const h27 = (seed: string, n: number): number => (hashString(`h27:${seed}`) >>> 0) % n;
