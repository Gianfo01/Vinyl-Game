// Rodada 29 (RELÍQUIAS) — versões PROCEDURAIS das relíquias reais. O catálogo real (relics17 + data/relics18) foi
// estudado e classificado em ARQUÉTIPOS (a guitarra com nome, o instrumento do show lendário, o figurino, a letra
// rabiscada do hit, a fita master/acetato, o primeiro contrato, a van da banda, o piano do hit, o microfone da sessão,
// a estatueta, a última carta, a mesa de som, o cartaz, a pele do bumbo com o logo, o objeto autografado, o item
// pessoal, o letreiro do estúdio, a peça chamuscada, o objeto do escândalo, a jaqueta e a credencial da turnê, a arte
// original). Cada arquétipo ganha "versões" que nascem em QUALQUER partida, para qualquer artista (real ou inventado,
// NPC ou seu), quando um fato que combina passa pelo barramento (facts17/onFact): nome no estilo real em pt/en,
// história com o acontecimento, o ato, a pessoa, a casa e a cidade, valor pelos fatores (fama, raridade, gravidade do
// fato, estado, procedência; dinheiro da época via money()), estado de conservação, procedência (o artista, o selo,
// um colecionador, um museu, o mercado negro, um fã, os herdeiros, leilão) e o tipo certo para a arte procedural
// (ui/pixel/relic28 + relic29 desenham pelo tipo e pelas palavras do nome).
//
// "E até mais", usando o que já existe (um fluxo por ação — docs/act27.md): o valor anda (legado do relics18 todo ano,
// pico na morte de quem usou a peça, volta/revival, aniversário, escândalo), falsificações entram no MERCADO NEGRO do
// crime17 e só a perícia do relics18 (authenticate18) as desmascara; roubo/recuperação seguem relics9/crime17;
// leilões e colecionadores do relics9; museu/ala-museu/exposições do relics9/17/18; herdeiros brigam pela peça
// (afterlife19 suit19 'relic'); as peças dos SEUS atos que o selo guarda (contrato, fitas, mesa, cartaz, credencial,
// arte) entram direto no seu acervo — guardar, vender, doar, expor, emprestar.
//
// Frequência: o sorteio acontece no fato (semente factSeedKey17, Rng próprio), mas a peça só nasce no fechamento do mês
// (fila curta), depois que relics9/18/28 já criaram as delas: nada de duas peças do mesmo tipo para o mesmo ato no
// mesmo ano. Tetos: 4 por ano, 1 por ato por ano, 3 vivas por ato, 1 de cada arquétipo por ato, 30 vivas no total (a poda do
// teto de 90 do relics9 não as tira — relicKeep9 — porque a poda delas é a própria: sai a mais barata sem disputa).
// Modo exato: ato real intocado (histLocked) só ganha arquétipos genéricos (cartaz, credencial, autografado, letreiro);
// e nenhum ato real ganha peça procedural do MESMO tipo de uma peça real documentada dele (não contradiz o catálogo).
// Armazenamento compacto: a peça vive na lista do relics9; aqui fica só "arq|estado|proc|cidade|casa|flags" por id
// e a história é montada na hora (story29).

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { actorId, emitFact, factSeedKey17, onFact, type Fact } from '../facts17';
import { histLocked } from '../history15';
import { RELICS17, type RelicDef17 } from '../relics17';
import type { Act, GameState } from '../types';
import { fmtL, money, notify } from '../util';
import { actsNow27, releasesNow27 } from '../tickcache27';
import { chron, cityL, nameOf } from './chron9';
import { crime17, fences } from './crime17';
import { est19, suit19 } from './afterlife19';
import { realAct17 } from './realidx17';
import { COLLECTORS, MUSEUMS, addRelic, archiveRelic9, myTrail9, relMeta, relicKeep9, relics, type Relic, type RelicKind } from './relics9';
import { per13 } from './persona13';
import { ORIGIN18, meta18, statuette18 } from './relics18';
import { VENUES17 } from './venues17';

// ---------------------------------------------------------------- arquétipos

export const ARCH29 = ['named_guitar', 'smashed', 'stage_outfit', 'ceremony_outfit', 'napkin_lyrics', 'hit_piano', 'master_tape', 'session_mic', 'console', 'first_contract',
  'tour_van', 'statue', 'last_note', 'show_poster', 'drum_head', 'signed', 'personal', 'fixture', 'charred', 'infamous', 'tour_jacket', 'tour_pass', 'artwork'] as const;
export type Arch29 = (typeof ARCH29)[number];

/** Fatores de valor: F fama · R raridade · E época · S peso da história · C estado · P procedência. */
export interface ArchDef29 { name: L; base: number; drv: string; generic?: 1; label?: 1; trig: string[]; ex: string[] }
export const ARCHDEF29: Record<Arch29, ArchDef29> = {
  named_guitar: { name: l('O instrumento com nome (a guitarra com nome)', 'The named instrument (the named guitar)'), base: 30000, drv: 'FRESP', trig: ['show', 'chart', 'legend'], ex: ['lucille', 'clapton_blackie', 'gilmour_black_strat', 'brownie_strat', 'garcia_tiger', 'srv_lenny', 'hofner_bass', 'lennon_j160e'] },
  smashed: { name: l('O instrumento do show lendário', 'The legendary-show instrument'), base: 22000, drv: 'FRSC', trig: ['show'], ex: ['monterey_strat', 'woodstock_strat', 'dylan_newport', 'unplugged_d18e', 'teen_spirit_mustang', 'simonon_bass'] },
  stage_outfit: { name: l('O figurino icônico', 'The iconic stage outfit'), base: 15000, drv: 'FESC', trig: ['show', 'retired', 'legend'], ex: ['carmen_baiana', 'ruby_slippers', 'aloha_eagle', 'ziggy_suit', 'waterloo_costumes', 'mj_glove', 'thriller_jacket', 'winehouse_belgrade'] },
  ceremony_outfit: { name: l('A roupa da cerimônia', 'The ceremony outfit'), base: 9000, drv: 'FSE', trig: ['award'], ex: ['meat_dress', 'bjork_swan'] },
  napkin_lyrics: { name: l('A letra manuscrita do hit', 'The handwritten hit lyrics'), base: 12000, drv: 'FRSC', trig: ['chart'], ex: ['rolling_stone_lyrics', 'bohemian_drafts', 'day_in_life_lyrics', 'hey_jude_notes', 'american_pie_ms', 'dylan_archive'] },
  hit_piano: { name: l('O piano onde o hit nasceu', 'The piano where the hit was written'), base: 25000, drv: 'FSEP', trig: ['chart'], ex: ['imagine_piano', 'mercury_yamaha', 'wilson_sandbox'] },
  master_tape: { name: l('A fita master / o acetato', 'The master tape / acetate'), base: 18000, drv: 'FRSEP', label: 1, trig: ['masterwork'], ex: ['my_happiness', 'god_save_am', 'quarrymen_tape', 'zaire74_tapes', 'first_cd_52nd'] },
  session_mic: { name: l('O microfone da sessão', 'The session microphone'), base: 9000, drv: 'FSE', label: 1, trig: ['masterwork', 'session_star'], ex: [] },
  console: { name: l('A mesa de som', 'The studio console'), base: 20000, drv: 'SEP', label: 1, trig: ['masterwork', 'session_star'], ex: ['tg12345_desk', 'edison_tinfoil'] },
  first_contract: { name: l('O primeiro contrato', 'The first contract'), base: 4000, drv: 'FRP', label: 1, trig: ['signing'], ex: [] },
  tour_van: { name: l('A van / o carro da banda', 'The band van / car'), base: 8000, drv: 'FEC', trig: ['split'], ex: ['elvis_cadillac', 'lennon_rolls', 'janis_porsche'] },
  statue: { name: l('A estatueta', 'The award statue'), base: 10000, drv: 'FSP', trig: ['award'], ex: ['lennon_mbe'] },
  last_note: { name: l('A última carta', 'The last letter'), base: 7000, drv: 'FS', trig: ['death'], ex: [] },
  show_poster: { name: l('O cartaz do show histórico', 'The historic-show poster'), base: 1500, drv: 'FEC', generic: 1, label: 1, trig: ['show', 'retired'], ex: [] },
  drum_head: { name: l('A pele do bumbo com o logo', 'The logo drum head'), base: 6000, drv: 'FRS', trig: ['split'], ex: ['ringo_ludwig', 'sgt_pepper_drum'] },
  signed: { name: l('O objeto autografado', 'The signed object'), base: 2500, drv: 'FP', generic: 1, trig: ['charity_show'], ex: [] },
  personal: { name: l('O objeto pessoal', 'The personal item'), base: 5000, drv: 'FSC', trig: ['death', 'legend'], ex: ['buddy_glasses', 'unplugged_cardigan', 'biggie_crown', 'tupac_ring', 'umm_kulthum_scarf', 'rundmc_adidas'] },
  fixture: { name: l('A peça do estúdio ou da casa', 'The studio or house fixture'), base: 3500, drv: 'SEP', generic: 1, trig: ['label_sold'], ex: ['cbgb_awning', 'motown_snakepit', 'opry_circle', 'apollo_tree', 'muddy_cabin'] },
  charred: { name: l('A peça chamuscada', 'The charred piece'), base: 4000, drv: 'SC', trig: ['crowd_incident', 'disaster'], ex: [] },
  infamous: { name: l('O objeto do escândalo', 'The infamous item'), base: 3000, drv: 'FSP', trig: ['scandal'], ex: ['algie_pig'] },
  tour_jacket: { name: l('A jaqueta da turnê', 'The tour jacket'), base: 2500, drv: 'FE', trig: ['tour_done'], ex: [] },
  tour_pass: { name: l('A credencial da turnê', 'The tour pass'), base: 600, drv: 'FE', generic: 1, label: 1, trig: ['tour_done'], ex: [] },
  artwork: { name: l('A arte original', 'The original artwork'), base: 9000, drv: 'FSP', label: 1, trig: ['catalog_rerelease'], ex: ['stones_tongue', 'nipper_painting', 'violeta_arpilleras'] },
};
/** Peças reais classificadas à mão (os exemplos de cada arquétipo, lidos peça a peça no catálogo). */
export const REAL_ARCH29: Record<string, Arch29> = Object.fromEntries((Object.entries(ARCHDEF29) as [Arch29, ArchDef29][]).flatMap(([k, d]) => d.ex.map((id) => [id, k])));
/** Arquétipo de QUALQUER peça do catálogo real (relics17 + data/relics18 + media19b + era1889): os exemplos à mão e,
 *  para o resto, a categoria + palavras do nome/história (o mesmo critério da classificação manual). */
export function realArch29(d: RelicDef17): Arch29 {
  const hand = REAL_ARCH29[d.id];
  if (hand) return hand;
  const n = `${d.name.en} ${d.story.en}`.toLowerCase();
  const has = (re: RegExp) => re.test(n);
  switch (d.kind) {
    case 'guitar': case 'bass': case 'amp': case 'horn': case 'synth':
      return has(/smash|burn|broke|destroy|woodstock|newport|monterey|unplugged|video|on stage|cover/) ? 'smashed' : 'named_guitar';
    case 'piano': return 'hit_piano';
    case 'lyrics': case 'notebook': return has(/last|final|letter|farewell/) ? 'last_note' : 'napkin_lyrics';
    case 'tape': case 'record': return 'master_tape';
    case 'outfit': case 'glasses':
      if (has(/glasses|hat\b|scarf|handkerchief|shoe|sneaker|adidas|cardigan|ring\b|crown/)) return 'personal';
      return has(/vma|grammy|award|oscar|ceremony/) ? 'ceremony_outfit' : 'stage_outfit';
    case 'car': return 'tour_van';
    case 'trophy': case 'goldrec': return 'statue';
    case 'drums': case 'sticks': return 'drum_head';
    case 'mic': return 'session_mic';
    case 'contract': return 'first_contract';
    case 'poster': case 'ticket': case 'setlist': return 'show_poster';
    case 'art': case 'photo': return 'artwork';
    case 'jukebox': return 'fixture';
    case 'prop':
      if (has(/desk|console|phonograph|studio a|mixing/)) return 'console';
      if (has(/awning|circle|stump|cabin|sign\b|door|snakepit|tree of hope/)) return 'fixture';
      if (has(/accordion|oud|violin|trumpet|sax|theremin|moog|tb-303|dulcimer|timbales|guitar/)) return 'named_guitar';
      if (has(/crown|ring\b|glove/)) return 'personal';
      return 'infamous';
  }
  return 'personal';
}

export const COND29: L[] = [l('impecável', 'mint'), l('bom', 'good'), l('gasto', 'worn'), l('danificado', 'damaged'), l('chamuscado', 'charred')];
const CONDM = [1.15, 1, 0.92, 0.85, 0.75];
export type Prov29 = 'a' | 'l' | 'c' | 'm' | 'b' | 'f' | 'h' | 'u' | 'p' | 'v';
export const PROV29: Record<Prov29, L> = {
  a: l('com o artista', 'with the artist'), l: l('no cofre do selo', 'in the label\'s vault'), c: l('com um colecionador', 'with a collector'), m: l('num museu', 'in a museum'),
  b: l('no mercado negro', 'on the black market'), f: l('com um fã', 'with a fan'), h: l('com os herdeiros', 'with the heirs'), u: l('em leilão', 'at auction'), p: l('no seu acervo', 'in your collection'), v: l('com a casa de shows', 'with the venue'),
};
/** Origens novas para o rótulo da ficha (Acervo vivo). */
Object.assign(ORIGIN18, {
  sign: l('Primeira assinatura', 'First signing'), session: l('Sessão famosa', 'Famous session'), tour: l('Turnê', 'Tour'), farewell: l('Despedida', 'Farewell'),
  fire: l('Incêndio ou tumulto', 'Fire or riot'), charity: l('Show beneficente', 'Charity show'), closing: l('Fim de um selo', 'A label\'s end'), reissue: l('Relançamento', 'Reissue'),
});

// ---------------------------------------------------------------- estado (compacto)

/** O registro compacto "arq|estado|proc|cidade|casa|flags" (flags: F falsa, S processo dos herdeiros já aberto) mora na
 *  própria peça (`rl.meta.q`, definição única em relics9); aqui fica só a fila e os contadores. */
export interface Relics29State {
  /** fila do mês: [arq, ato, pessoa, cidade, gravidade, origem, título, chave do fato, id do fato] */
  q: [number, string, string, string, number, string, string, string, string][];
  /** [ano, peças nascidas no ano] */
  yc: [number, number];
  /** nascidas por arquétipo (índice) — histórico, não cresce com o tempo */
  n: number[];
  /** falsificações postas no mercado */
  fk: number;
  /** contador dos ids próprios ("rq…": não mexe no contador global de ids do jogo) */
  seq: number;
  /** peças que cada ato ganhou no ano corrente (zera na virada do ano) */
  ay: Record<string, number>;
}
declare module '../ext4' { interface Ext4 { relics29: Relics29State } }
const fresh = (): Relics29State => ({ q: [], yc: [0, 0], n: [], fk: 0, seq: 0, ay: {} });
registerExt4('relics29', fresh);
export function rel29(s: GameState): Relics29State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.relics29 ??= fresh()) as Relics29State;
  st.q ??= []; st.yc ??= [0, 0]; st.n ??= []; st.fk ??= 0; st.seq ??= 0; st.ay ??= {};
  return st;
}
export interface Meta29 { arch: Arch29; cond: number; prov: Prov29; city: string; vi: number; fake: boolean; suit: boolean }
/** Arquétipo procedural da peça (pela peça ou pelo id). */
export function meta29(s: GameState, x: string | Relic): Meta29 | null {
  const raw = (typeof x === 'string' ? relics(s).list.find((r) => r.id === x) : x)?.meta?.q;
  if (!raw) return null;
  const [a, c, p, city, vi, fl] = raw.split('|');
  return { arch: ARCH29[+a] ?? 'personal', cond: +c, prov: p as Prov29, city, vi: +vi, fake: fl.includes('F'), suit: fl.includes('S') };
}
const nid29 = (s: GameState): string => `rq${(++rel29(s).seq).toString(36)}`;
const setQ = (rl: Relic, m: Meta29): void => { relMeta(rl).q = pack(m); };
const pack = (m: Meta29): string => `${ARCH29.indexOf(m.arch)}|${m.cond}|${m.prov}|${m.city}|${m.vi}|${m.fake ? 'F' : ''}${m.suit ? 'S' : ''}`;

/** Densidade (config.relicDensity; ausente = 'many', o pedido do autor). 'few' = os tetos da primeira versão.
 *  year: peças/ano num mundo médio (escala com o tamanho da base e os atos famosos ativos); actYear/actLive: de uma
 *  superestrela (atos menores ganham menos); archAct: repetições do mesmo arquétipo por ato; total: vivas; p: × chance
 *  dos gatilhos; archive: idade (anos) a partir da qual peça barata vai para o acervo histórico (0 = nunca);
 *  forge: tentativas de falsário por ano; famous: chance do leilão famoso do ano. */
export type Dens29 = NonNullable<GameState['config']['relicDensity']>;
export interface Caps29 { year: number; actYear: number; actLive: number; archAct: number; total: number; queue: number; fakes: number; p: number; archive: number; forge: number; famous: number; flat?: 1 }
export const DENS29: Record<Dens29, Caps29> = {
  few: { year: 4, actYear: 1, actLive: 3, archAct: 1, total: 30, queue: 12, fakes: 3, p: 1, archive: 0, forge: 1, famous: 0, flat: 1 },
  normal: { year: 10, actYear: 1, actLive: 6, archAct: 2, total: 150, queue: 24, fakes: 6, p: 2, archive: 10, forge: 1, famous: 0.3 },
  many: { year: 24, actYear: 2, actLive: 12, archAct: 3, total: 400, queue: 48, fakes: 15, p: 5, archive: 6, forge: 2, famous: 0.6 },
  all: { year: 40, actYear: 3, actLive: 16, archAct: 5, total: 500, queue: 80, fakes: 15, p: 8, archive: 5, forge: 3, famous: 0.9 },
};
export const DENS29_NAME: Record<Dens29, L> = { few: l('Poucas', 'Few'), normal: l('Normal', 'Normal'), many: l('Muitas', 'Many'), all: l('Tudo', 'Everything') };
export const dens29 = (s: GameState): Dens29 => s.config.relicDensity ?? 'many';
/** Tetos da primeira versão (= densidade "poucas"). */
export const CAPS29 = DENS29.few;
const SIZE29: Record<string, number> = { small: 0.6, medium: 1, large: 1.25, huge: 1.5 };
/** Tetos desta partida; o anual escala com o tamanho da base (dbSize) e os atos famosos ativos (fama ≥ 35). */
export function caps29(s: GameState): Caps29 {
  const c = DENS29[dens29(s)] ?? DENS29.many;
  if (c.flat) return c;
  let n = 0;
  for (const a of actsNow27(s)) if (a.fame >= 35 && (a.status === 'active' || a.status === 'emerging')) n++;
  return { ...c, year: Math.max(2, Math.round(c.year * (SIZE29[s.config.dbSize ?? 'medium'] ?? 1) * clamp(n / 30, 0.5, 1.6))) };
}
/** Tetos por ato: superestrela (lenda ou fama ≥ 70) leva o teto cheio; fama ≥ 45 ou ato seu, metade; o resto, um quarto. */
export function actCaps29(s: GameState, a: Act, c = DENS29[dens29(s)] ?? DENS29.many): { live: number; year: number } {
  if (c.flat) return { live: c.actLive, year: c.actYear };
  const tier = a.legend || a.fame >= 70 ? 1 : a.fame >= 45 || mine(a) ? 0.5 : 0.25;
  return { live: Math.max(1, Math.round(c.actLive * tier)), year: Math.max(1, Math.round(c.actYear * tier)) };
}
// as procedurais têm teto e poda próprios (room): a poda do teto de 90 do relics9 passa por cima delas
relicKeep9.f = (_s, rl) => !!rl.meta?.q;
/** Para testes: ignora o sorteio de nascimento (os tetos continuam valendo). */
export const R29 = { force: false };

// ---------------------------------------------------------------- nomes no estilo real

const band = (y: number) => (y < 1950 ? 0 : y < 1965 ? 1 : y < 1980 ? 2 : y < 2000 ? 3 : 4);
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const GUITARS: string[][] = [['Gibson L-5', 'Epiphone Emperor', 'Gretsch'], ['Telecaster', 'Les Paul', 'Stratocaster', 'Gretsch', 'ES-335'], ['Stratocaster', 'Les Paul', 'SG', 'Telecaster', 'Flying V', 'Rickenbacker'],
  ['Stratocaster', 'Superstrat', 'Jaguar', 'Les Paul', 'Explorer'], ['Telecaster', 'Jazzmaster', 'Stratocaster', 'Les Paul', 'SG']];
const BASSES = ['Precision', 'Jazz Bass', 'Rickenbacker 4001', 'Thunderbird', 'Höfner'];
const NICKS: [string, string][] = [['Rosa', 'Rosa'], ['Fênix', 'Phoenix'], ['Velha Senhora', 'Old Lady'], ['Trovão', 'Thunder'], ['Sereia', 'Siren'], ['Lola', 'Lola'], ['Duquesa', 'Duchess'], ['Coruja', 'Owl'], ['Brasa', 'Ember'], ['Estrela', 'Star'], ['Viúva', 'Widow'], ['Blue', 'Blue']];
const OUTFITS: [string, string][][] = [
  [['o terno de lamê dourado', 'gold lamé suit'], ['o vestido de paetês', 'sequin dress'], ['o chapéu de palco', 'stage hat']],
  [['o terno de lamê dourado', 'gold lamé suit'], ['o vestido de paetês', 'sequin dress'], ['o chapéu de palco', 'stage hat']],
  [['o macacão de lantejoulas', 'sequined jumpsuit'], ['as botas de plataforma', 'platform boots'], ['o casaco de franjas', 'fringed jacket']],
  [['a jaqueta de couro com tachas', 'studded leather jacket'], ['a luva de strass', 'rhinestone glove'], ['o vestido de vinil', 'vinyl dress']],
  [['o vestido de palco de LED', 'LED stage dress'], ['a jaqueta de palco bordada', 'embroidered stage jacket'], ['as botas de cano alto', 'thigh-high boots']],
];
const CEREMONY: [string, string][] = [['o paletó', 'blazer'], ['o vestido', 'gown'], ['a jaqueta', 'jacket']];
const SURFACES: [string, string][] = [['num guardanapo', 'on a napkin'], ['em papel de hotel', 'on hotel stationery'], ['no verso de um envelope', 'on the back of an envelope'], ['num maço de cigarros', 'on a cigarette pack']];
const PIANOS = [['Steinway'], ['Steinway', 'Baldwin'], ['Wurlitzer', 'Fender Rhodes', 'Steinway'], ['Yamaha CP-70', 'Bösendorfer'], ['Steinway', 'Yamaha']];
const MICS = ['RCA 44', 'Neumann U47', 'Neumann U87', 'Shure SM7', 'Neumann U47 fet'];
const PERSONAL: [string, string, RelicKind][] = [['os óculos escuros', 'sunglasses', 'glasses'], ['o chapéu', 'hat', 'outfit'], ['a jaqueta de couro', 'leather jacket', 'outfit'], ['o lenço', 'scarf', 'outfit']];
const GENERIC_V: [string, string][] = [['teatro municipal', 'Municipal Theatre'], ['arena', 'Arena'], ['ginásio', 'Gymnasium'], ['estádio', 'Stadium'], ['clube do porto', 'Harbour Club'], ['cine-teatro', 'Picture Palace']];

/** Casa de shows da cidade no ano: real (venues17) só com nomes reais; senão um tipo genérico. Índice ≥ 0 = VENUES17, < 0 = genérico. */
export function venuePick29(s: GameState, city: string, y: number, r: Rng): number {
  const real = s.config.realNames ? VENUES17.map((v, i) => [v, i] as const).filter(([v]) => v.city === city && v.from <= y && (!v.to || y <= v.to)) : [];
  return real.length ? r.pick(real)[1] : -1 - r.int(0, GENERIC_V.length - 1);
}
export function venueL29(city: string, vi: number): L {
  if (vi >= 0 && VENUES17[vi]) return l(VENUES17[vi].name, VENUES17[vi].name);
  const g = GENERIC_V[(-vi - 1) % GENERIC_V.length];
  const c = cityL(city);
  return l(`${cap(g[0])} de ${c.pt}`, `${c.en} ${g[1]}`);
}
/** Nome da cerimônia pela época (mesma semente da estatueta do relics18). */
function ceremonyL(s: GameState, y: number): L {
  const e = statuette18(s, y).en;
  if (/Grammy/.test(e)) return l('Grammy', 'Grammy');
  if (/BRIT/.test(e)) return l('BRIT Awards', 'BRIT Awards');
  if (/Moonman/.test(e)) return l('VMA', 'VMA');
  if (/Astronaut/.test(e)) return l('prêmio Astronauta de Prata', 'Silver Astronaut awards');
  return l('Gramófono de Ouro', 'Golden Gramophone');
}

export interface Ctx29 { a?: Act; pid?: string; y: number; city: string; vi: number; title?: string; lab?: string; farewell?: boolean }
export interface Made29 { k: RelicKind; n: L; cond: number }

/** Gera a peça de um arquétipo: tipo (para a arte), nome pt/en no estilo real e estado. Puro dado `r`. */
export function make29(s: GameState, arch: Arch29, c: Ctx29, r: Rng): Made29 {
  const role = c.pid ? s.persons[c.pid]?.role : undefined;
  const p = c.pid ? nameOf(s, c.pid) : c.a?.name ?? '?';
  const a = c.a?.name ?? p;
  const b = band(c.y);
  const t = c.title ?? a;
  const cityN = cityL(c.city);
  const v = venueL29(c.city, c.vi);
  const F = (pt: string, en: string, x: Record<string, string | number | L> = {}) => fmtL(l(pt, en), { p, a, y: c.y, t, c: cityN, v, ...x });
  const cond = (base: number) => clamp(base + (r.chance(0.3) ? 1 : 0), 0, 4);
  // vestido só para quem a persona diz que é mulher (sem dado: paletó, jaqueta, macacão…)
  const fem = !!c.pid && per13(s, `p:${c.pid}`)?.sex === 'f';
  const wear = (xs: [string, string][]) => (fem ? xs : xs.filter(([, en]) => !/dress|gown/.test(en)));
  switch (arch) {
    case 'named_guitar': {
      const [np, ne] = r.pick(NICKS);
      if (role === 'bass') return { k: 'bass', n: F('O baixo {m} "{np}" de {p}', '{p}\'s {m} bass "{ne}"', { m: r.pick(BASSES), np, ne }), cond: cond(1) };
      return { k: 'guitar', n: F('A {m} "{np}" de {p}', '{p}\'s {m} "{ne}"', { m: r.pick(GUITARS[b]), np, ne }), cond: cond(1) };
    }
    case 'smashed':
      if (role === 'drums') return { k: 'drums', n: F('O bumbo que {p} chutou do palco em {c}', 'The kick drum {p} kicked off the stage in {c}'), cond: 3 };
      if (role === 'vocal' || role === 'mc') return { k: 'mic', n: F('O pedestal que {p} entortou em {c}', 'The mic stand {p} bent in {c}'), cond: 3 };
      if (role === 'keys') return { k: 'piano', n: F('O teclado que {p} incendiou em {c}', 'The keyboard {p} set on fire in {c}'), cond: 4 };
      return r.chance(0.25) ? { k: 'guitar', n: F('Os restos da {m} que {p} queimou em {c}', 'The remains of the {m} {p} burned in {c}', { m: r.pick(GUITARS[b]) }), cond: 4 }
        : { k: 'guitar', n: F('Os restos da {m} que {p} destruiu em {c}', 'The remains of the {m} {p} smashed in {c}', { m: r.pick(GUITARS[b]) }), cond: 3 };
    case 'stage_outfit': {
      const [ip, ie] = r.pick(wear(OUTFITS[b]));
      return { k: 'outfit', n: c.farewell ? F('{i} da despedida de {p} ({y})', '{p}\'s farewell {ie} ({y})', { i: cap(ip), ie }) : F('{i} de {p} em {c} ({y})', '{p}\'s {ie} from {c} ({y})', { i: cap(ip), ie }), cond: cond(1) };
    }
    case 'ceremony_outfit': {
      const [ip, ie] = r.pick(wear(CEREMONY));
      return { k: 'outfit', n: F('{i} de {p} no {cer} de {y}', '{p}\'s {y} {cer} {ie}', { i: cap(ip), ie, cer: ceremonyL(s, c.y) }), cond: cond(0) };
    }
    case 'napkin_lyrics': {
      const [sp, se] = r.pick(SURFACES);
      return { k: 'lyrics', n: F('A letra de "{t}" {sp}', 'The "{t}" lyrics {se}', { sp, se }), cond: 2 };
    }
    case 'hit_piano': return { k: 'piano', n: F('O piano {m} em que {p} compôs "{t}"', 'The {m} piano {p} wrote "{t}" on', { m: r.pick(PIANOS[b]) }), cond: cond(1) };
    case 'master_tape':
      if (c.y < 1990 && r.chance(0.35)) return { k: 'record', n: F('O acetato de teste de "{t}"', 'The "{t}" test acetate'), cond: cond(1) };
      return c.y >= 2000 ? { k: 'tape', n: F('O HD master de "{t}"', 'The "{t}" master drive'), cond: 0 } : { k: 'tape', n: F('As fitas master de "{t}"', 'The "{t}" master tapes'), cond: cond(1) };
    case 'session_mic': return { k: 'mic', n: F('O microfone {m} da sessão de "{t}"', 'The {m} microphone from the "{t}" session', { m: MICS[b] }), cond: cond(1) };
    case 'console': return { k: 'prop', n: F('A mesa de som do estúdio de {l} ({y})', 'The {l} studio mixing console ({y})', { l: c.lab ?? a }), cond: cond(1) };
    case 'first_contract': return { k: 'contract', n: F('O primeiro contrato de {a} com {l} ({y})', '{a}\'s first contract with {l} ({y})', { l: c.lab ?? '?' }), cond: cond(0) };
    case 'tour_van': return b <= 1 ? { k: 'car', n: F('O carro da turnê de {a}', '{a}\'s tour car'), cond: 2 } : { k: 'car', n: F('A van da banda {a}', 'The {a} band van'), cond: 2 };
    case 'statue': return { k: 'trophy', n: F('{st} de {a} ({y})', '{a}\'s {st} ({y})', { st: statuette18(s, c.y) }), cond: 0 };
    case 'last_note': return { k: 'lyrics', n: F('A última carta de {p}', '{p}\'s last letter'), cond: 1 };
    case 'show_poster': return { k: 'poster', n: c.farewell ? F('O cartaz da despedida de {a} ({v}, {y})', 'The poster for {a}\'s farewell ({v}, {y})') : F('O cartaz do show de {a} ({v}, {y})', 'The poster for {a}\'s show ({v}, {y})'), cond: cond(1) };
    case 'drum_head': return { k: 'drums', n: F('A pele do bumbo com o logo de {a}', 'The {a} logo drum head'), cond: 2 };
    case 'signed':
      return (c.a?.members.length ?? 1) > 1 ? { k: 'record', n: F('O disco de {a} autografado pela banda inteira', 'A {a} record signed by the whole band'), cond: 0 }
        : { k: 'guitar', n: F('O violão autografado por {p}', 'An acoustic guitar signed by {p}'), cond: 0 };
    case 'personal': {
      const [ip, ie, k] = r.pick(PERSONAL);
      return { k, n: F('{i} de {p}', '{p}\'s {ie}', { i: cap(ip), ie }), cond: 2 };
    }
    case 'fixture': return { k: 'prop', n: F('O letreiro de neon do estúdio de {l}', '{l} studio neon sign', { l: c.lab ?? a }), cond: cond(1) };
    case 'charred':
      if (c.a && (role === 'guitar' || role === 'bass')) return { k: 'guitar', n: F('A guitarra chamuscada de {p} ({v}, {y})', '{p}\'s charred guitar ({v}, {y})'), cond: 4 };
      return r.chance(0.5) ? { k: 'amp', n: F('O amplificador chamuscado da noite do tumulto ({v}, {y})', 'The charred amplifier from the night of the riot ({v}, {y})'), cond: 4 }
        : { k: 'poster', n: F('O cartaz chamuscado da noite do incêndio ({v}, {y})', 'The charred poster from the night of the fire ({v}, {y})'), cond: 4 };
    case 'infamous': return { k: 'prop', n: F('O telefone do quarto de hotel do escândalo de {a}', 'The hotel-room phone from the {a} scandal'), cond: 2 };
    case 'tour_jacket': return { k: 'outfit', n: F('A jaqueta da equipe da turnê de {a} ({y})', '{a}\'s tour crew jacket ({y})'), cond: cond(1) };
    case 'tour_pass': return { k: 'prop', n: F('A credencial all-access da turnê de {a} ({y})', '{a}\'s all-access tour pass ({y})'), cond: cond(0) };
    case 'artwork': return { k: 'art', n: F('A arte original da capa de "{t}"', 'The original cover art for "{t}"'), cond: cond(0) };
  }
}

/** História da peça (montada na hora a partir do registro compacto). */
const STORY: Record<Arch29, [string, string]> = {
  named_guitar: ['{p} batizou o instrumento e o levou a todo palco; foi com ele que {a} virou notícia em {c}, {y}.', '{p} named the instrument and took it to every stage; it was with it that {a} made the news in {c}, {y}.'],
  smashed: ['No fim do show que entrou para a história, {p} destruiu a peça no palco ({v}, {c}, {y}). Os pedaços foram recolhidos e remontados.', 'At the end of the show that went down in history, {p} wrecked it on stage ({v}, {c}, {y}). The pieces were gathered and put back together.'],
  stage_outfit: ['{p} usou a peça no palco ({v}, {c}, {y}); as fotos daquela noite fixaram a imagem de {a}.', '{p} wore it on stage ({v}, {c}, {y}); the photos from that night fixed {a}\'s image.'],
  ceremony_outfit: ['Usada por {p} na cerimônia de {y}, a noite do prêmio de {a}.', 'Worn by {p} at the {y} ceremony, the night of {a}\'s award.'],
  napkin_lyrics: ['Rascunho de {p}, com rasuras, da canção que levou {a} ao nº 1 em {y}.', '{p}\'s scribbled draft of the song that took {a} to number one in {y}.'],
  hit_piano: ['Foi aqui que {p} achou a melodia do nº 1 de {a} ({c}, {y}).', 'This is where {p} found the melody of {a}\'s number one ({c}, {y}).'],
  master_tape: ['As gravações originais da obra de {a} ({y}), antes de qualquer mixagem.', 'The original recordings of {a}\'s work ({y}), before any mix.'],
  session_mic: ['O microfone da sessão de {y} em que {p} gravou a faixa que todo mundo lembra.', 'The microphone from the {y} session where {p} cut the track everyone remembers.'],
  console: ['A mesa por onde passou a sessão famosa de {a} em {c}, {y}.', 'The desk that ran {a}\'s famous session in {c}, {y}.'],
  first_contract: ['A assinatura de {a} na primeira página, em {c}, {y}: o começo de tudo.', '{a}\'s signature on the first page, in {c}, {y}: where it all began.'],
  tour_van: ['Rodou milhares de quilômetros com {a}; ficou para trás quando a banda acabou ({y}).', 'It rolled thousands of miles with {a}; it was left behind when the band ended ({y}).'],
  statue: ['O prêmio de {a} em {y}.', '{a}\'s award in {y}.'],
  last_note: ['A última coisa que {p} escreveu, guardada pela família depois de {y}.', 'The last thing {p} wrote, kept by the family after {y}.'],
  show_poster: ['Pregado nas ruas de {c} para o show de {a} ({v}, {y}).', 'Pasted on the streets of {c} for {a}\'s show ({v}, {y}).'],
  drum_head: ['A pele que estampou o logo de {a} em todos os shows, até o fim da banda ({y}).', 'The head that carried {a}\'s logo at every show, until the band ended ({y}).'],
  signed: ['Autografada no show beneficente de {y} em {c} e posta em leilão pela causa.', 'Signed at the {y} charity show in {c} and put up for auction for the cause.'],
  personal: ['Objeto do dia a dia de {p}, que virou relíquia depois de {y}.', 'An everyday object of {p}\'s that became a relic after {y}.'],
  fixture: ['Arrancada da parede quando {a} fechou as portas em {c}, {y}.', 'Pulled off the wall when {a} closed its doors in {c}, {y}.'],
  charred: ['Sobrou da noite do fogo e do tumulto em {v}, {c}, {y}.', 'Survivor of the night of fire and riot at {v}, {c}, {y}.'],
  infamous: ['Testemunha muda do escândalo de {a} ({c}, {y}).', 'Silent witness to {a}\'s scandal ({c}, {y}).'],
  tour_jacket: ['Feita para a equipe da turnê de {a} ({y}); poucas sobraram.', 'Made for the crew of {a}\'s tour ({y}); few survive.'],
  tour_pass: ['Abria todas as portas dos bastidores da turnê de {a} ({y}).', 'It opened every backstage door on {a}\'s tour ({y}).'],
  artwork: ['O original que virou a capa de {a}, achado no arquivo no relançamento de {y}.', 'The original that became {a}\'s cover, found in the archive at the {y} reissue.'],
};
export function story29(s: GameState, rl: Relic): L | null {
  const m = meta29(s, rl.id);
  if (!m) return null;
  const a = rl.a ? s.acts[rl.a] : undefined;
  const first = rl.own[0]?.[0] ?? '?'; // sem ato (letreiro do estúdio, peça do incêndio): o primeiro dono — o selo, a casa
  const p = rl.p ? nameOf(s, rl.p) : a ? nameOf(s, a.id) : rl.a ? nameOf(s, rl.a) : first;
  const [pt, en] = STORY[m.arch];
  return fmtL(l(pt, en), { p, a: a?.name ?? (rl.a ? nameOf(s, rl.a) : first), c: cityL(m.city), v: venueL29(m.city, m.vi), y: rl.y });
}

// ---------------------------------------------------------------- regras de nascimento

const lead = (a: Act): string | undefined => (a.leaderId && a.members.includes(a.leaderId) ? a.leaderId : a.members[0]);
const mine = (a?: Act) => !!a && (a.owner === 'player' || !!a.playerBand);
const live29 = (s: GameState) => relics(s).list.filter((x) => x.meta?.q && x.st !== 'lost');

/** Tipos de peça que o catálogo real documenta para este ato (nomes reais): procedural não repete o tipo. */
export function realKinds29(s: GameState, a: Act): Set<RelicKind> {
  if (!s.config.realNames || !a.catalogNo) return new Set();
  // índice ato → tipos reais, refeito uma vez por ano (o catálogo é fixo; o ato real de cada dono quase nunca muda)
  let c = RK29.get(s);
  if (!c || c.y !== s.year) {
    c = { y: s.year, m: new Map() };
    for (const d of RELICS17) { const id = realAct17(s, d.owner)?.id; if (id) { const set = c.m.get(id) ?? new Set<RelicKind>(); set.add(d.kind); c.m.set(id, set); } }
    RK29.set(s, c);
  }
  return c.m.get(a.id) ?? new Set();
}
const RK29 = new WeakMap<GameState, { y: number; m: Map<string, Set<RelicKind>> }>();

/** Pode nascer? (modo exato, catálogo real, tetos por ato e dedupe com relics9/18/28 no mesmo ano) */
export function canBorn29(s: GameState, arch: Arch29, a: Act | undefined, k?: RelicKind): boolean {
  const d = ARCHDEF29[arch];
  if (a && histLocked(s, a) && !d.generic) return false;
  if (a && k && !d.generic && realKinds29(s, a).has(k)) return false;
  if (!a) return true;
  const st = rel29(s);
  const c = DENS29[dens29(s)] ?? DENS29.many;
  const ac = actCaps29(s, a, c);
  const mineL = live29(s).filter((x) => x.a === a.id);
  if (mineL.length >= ac.live) return false;
  if (mineL.filter((x) => meta29(s, x)?.arch === arch).length >= c.archAct) return false;
  const thisYear = Math.max(mineL.filter((x) => x.y === s.year).length, st.yc[0] === s.year ? st.ay[a.id] ?? 0 : 0);
  if (thisYear >= ac.year) return false;
  if (k && relics(s).list.some((x) => x.a === a.id && x.k === k && x.y === s.year && !x.meta?.q)) return false; // relics9/18/28 já fizeram
  return true;
}

/** Arquétipos candidatos a um fato (sem sorteio) e a chance de nascer. */
export function candidates29(s: GameState, f: Fact): { arch: Arch29[]; p: number; o: string; act?: Act; pid?: string; farewell?: boolean } | null {
  const ids = f.actors.map(actorId);
  const act = ids.map((x) => s.acts[x]).find(Boolean);
  const pl = act ? lead(act) : undefined;
  const role = pl ? s.persons[pl]?.role : undefined;
  const fame = act?.fame ?? 0;
  const big = !!act && (fame >= 35 || mine(act) || act.legend);
  const tg = (t: string) => f.tags.includes(t);
  const boost = mine(act) ? 1.6 : 1;
  // densidade normal ou maior: gatilhos a mais (marcos de parada fora do nº 1, prêmios médios, escândalos médios,
  // lenda e hall da fama) — a densidade "poucas" segue só com os da primeira versão
  const wide = !(DENS29[dens29(s)] ?? DENS29.many).flat;
  if (wide && act) {
    const ins = (role === 'guitar' || role === 'bass') ? ['named_guitar' as Arch29] : [];
    if (f.kind === 'legend') return { arch: [...ins, 'stage_outfit', 'personal'], p: 0.35, o: 'base' };
    if (f.kind === 'award' && tg('chron:hall_of_fame')) return { arch: [...ins, 'stage_outfit'], p: 0.3, o: 'award' };
    if (f.kind === 'award' && f.severity >= 40 && f.severity < 60 && big) return { arch: ['ceremony_outfit', 'statue'], p: 0.04, o: 'award' };
    if (f.kind === 'chart' && !tg('chron:number1') && tg('good') && f.severity >= 60 && big) return { arch: ['napkin_lyrics', 'session_mic'], p: 0.03 * boost, o: 'hit' };
    if (f.kind === 'scandal' && f.severity >= 40 && f.severity < 60 && fame >= 35) return { arch: ['infamous'], p: 0.05, o: 'scandal' };
  }
  switch (f.kind) {
    case 'show': {
      if (!act || !big) return null;
      if (tg('chron:stage_incident')) return { arch: ['smashed', 'stage_outfit'], p: 0.3 * boost, o: 'stage' };
      const hist = tg('chron:legendary_show') || tg('chron:liveaid') || tg('homecoming') || (f.src === 'show27' && f.severity >= 60 && tg('good'));
      if (!hist) return null;
      const arch: Arch29[] = ['smashed', 'stage_outfit', 'show_poster'];
      if (role === 'guitar' || role === 'bass') arch.push('named_guitar');
      return { arch, p: 0.45 * boost, o: 'show' };
    }
    case 'chart': {
      if (!act || !big || !tg('chron:number1') || (act.number1s > 3 && fame < 70)) return null;
      const arch: Arch29[] = ['napkin_lyrics'];
      if (role === 'keys' || role === 'vocal') arch.push('hit_piano');
      if (role === 'guitar') arch.push('named_guitar');
      return { arch, p: 0.06 * boost, o: 'hit' };
    }
    case 'masterwork': return act ? { arch: ['master_tape', 'session_mic', 'console'], p: 0.2 * boost, o: 'master' } : null;
    case 'session_star': return act ? { arch: ['session_mic', 'console'], p: 0.4, o: 'session', pid: ids.find((x) => s.persons[x]) } : null;
    case 'award':
      if (!act) return null;
      if (f.severity >= 60) return { arch: ['ceremony_outfit'], p: 0.08 * boost, o: 'award' };
      return mine(act) && f.severity >= 30 ? { arch: ['statue'], p: 0.25, o: 'award' } : null;
    case 'death': {
      const pid = ids.find((x) => s.persons[x] && !s.persons[x].alive);
      const pa = act ?? (pid ? Object.values(s.acts).find((x) => x.members.includes(pid)) : undefined);
      if (!pid || !pa || (pa.fame < 25 && !mine(pa))) return null;
      return { arch: ['personal', 'last_note'], p: 0.55, o: 'death', act: pa, pid };
    }
    case 'split': return act && (fame >= 30 || mine(act)) && act.members.length > 1 ? { arch: ['drum_head', 'tour_van'], p: 0.45 * boost, o: 'split' } : null;
    case 'signing':
      if (!act || act.releases.length > 0) return null;
      if (act.owner === 'player' || ids.includes('player')) return { arch: ['first_contract'], p: 0.35, o: 'sign' };
      return fame >= 40 ? { arch: ['first_contract'], p: 0.06, o: 'sign' } : null;
    case 'scandal': return act && f.severity >= 60 && fame >= 35 ? { arch: ['infamous'], p: 0.15 * boost, o: 'scandal' } : null;
    case 'tour_done': return act && f.severity >= 40 ? { arch: ['tour_jacket', 'tour_pass'], p: 0.35, o: 'tour' } : null;
    case 'retired': return act && fame >= 30 ? { arch: ['show_poster', 'stage_outfit'], p: 0.5, o: 'farewell', farewell: true } : null;
    case 'crowd_incident': return f.severity >= 50 ? { arch: ['charred'], p: 0.5, o: 'fire' } : null;
    case 'disaster': return tg('fire') ? { arch: ['charred'], p: 0.5, o: 'fire' } : null;
    case 'charity_show': return act ? { arch: ['signed'], p: 0.5, o: 'charity' } : null;
    case 'label_sold': return { arch: ['fixture'], p: 0.3, o: 'closing' };
    case 'catalog_rerelease': return act ? { arch: ['artwork'], p: 0.15 * boost, o: 'reissue' } : null;
  }
  return null;
}

/** Ouvinte dos fatos-gatilho: sorteia (semente do fato) e põe na fila do mês. */
function onTrigger(s: GameState, f: Fact): void {
  const c = candidates29(s, f);
  if (!c) return;
  const key = factSeedKey17(f);
  const r = Rng.fromSeed(`${s.config.seed}|relics29|${key}`);
  const cp = DENS29[dens29(s)] ?? DENS29.many;
  if (!R29.force && !r.chance(Math.min(0.95, c.p * cp.p))) return;
  const st = rel29(s);
  if (st.q.length >= cp.queue) return;
  const act = c.act ?? f.actors.map((x) => s.acts[actorId(x)]).find(Boolean);
  const arch = r.pick(c.arch);
  if (!canBorn29(s, arch, act)) return;
  const pid = c.pid ?? (act ? lead(act) : undefined);
  let title = '';
  if (act && (arch === 'napkin_lyrics' || arch === 'hit_piano')) title = latest(s, act, true) ?? '';
  else if (act && (arch === 'master_tape' || arch === 'session_mic' || arch === 'artwork')) title = latest(s, act, false) ?? '';
  let lab = '';
  if (arch === 'fixture') { const lb = f.actors.map(actorId).find((x) => s.labels[x] || x === 'player'); lab = lb === 'player' ? s.config.companyName : lb ? s.labels[lb].name : ''; if (!lab) return; }
  const city = f.place ?? act?.city ?? s.config.homeCity;
  st.q.push([ARCH29.indexOf(arch), act?.id ?? '', pid ?? '', city, f.severity, c.o + (c.farewell ? '!' : ''), title || lab, key, f.id]);
}
const latest = (s: GameState, a: Act, no1: boolean): string | undefined => {
  let best: { t: string; w: number } | undefined;
  for (const x of releasesNow27(s)) if (x.actId === a.id && (!no1 || x.peak === 1) && (!best || x.week > best.w)) best = { t: x.title, w: x.week };
  return best?.t;
};

for (const k of ['show', 'chart', 'masterwork', 'session_star', 'award', 'death', 'split', 'signing', 'scandal', 'tour_done', 'retired', 'crowd_incident', 'disaster', 'charity_show', 'label_sold', 'catalog_rerelease', 'legend'])
  onFact(k, (s, f) => {
    const P = (globalThis as { __hookProf?: Record<string, number> }).__hookProf; // medição (scripts/measure29relics.ts)
    const t0 = P ? performance.now() : 0;
    onTrigger(s, f); if (k === 'death') onDeath(s, f); if (k === 'scandal') shift(s, f, 'scandal');
    if (P) P['fact:relics29'] = (P['fact:relics29'] ?? 0) + performance.now() - t0;
  }, `relics29:${k}`);
onFact('comeback', (s, f) => shift(s, f, 'up'), 'relics29:comeback');
onFact('revival_hit', (s, f) => shift(s, f, 'up'), 'relics29:revival');

/** Nascimento (no fechamento do mês): tetos, dedupe, valor, procedência, fato. */
export function flush29(s: GameState): Relic[] {
  const st = rel29(s);
  const out: Relic[] = [];
  if (st.yc[0] !== s.year) { st.yc = [s.year, 0]; st.ay = {}; }
  const q = st.q.splice(0);
  const cap = q.length ? caps29(s) : DENS29.few;
  for (const [ai, actId, pid0, city, sev, o0, title, key, fid] of q) {
    if (st.yc[1] >= cap.year) break;
    const arch = ARCH29[ai];
    const a = actId ? s.acts[actId] : undefined;
    const r = Rng.fromSeed(`${s.config.seed}|relics29g|${key}`);
    const farewell = o0.endsWith('!');
    const o = farewell ? o0.slice(0, -1) : o0;
    const pid = pid0 && s.persons[pid0] ? pid0 : undefined;
    const lab = arch === 'fixture' ? title : a ? (mine(a) ? s.config.companyName : a.owner && s.labels[a.owner] ? s.labels[a.owner].name : undefined) : undefined;
    const vi = venuePick29(s, city, s.year, r);
    const ctx: Ctx29 = { a, pid, y: s.year, city, vi, title: arch === 'fixture' ? undefined : title || undefined, lab: lab ?? l('um selo independente', 'an independent label').pt, farewell };
    let made = make29(s, arch, ctx, r);
    // repetições do mesmo arquétipo no mesmo ato: nome distinto (outro modelo, apelido, peça, cidade…)
    const taken = (n: L) => relics(s).list.some((x) => x.a === a?.id && x.n.pt === n.pt && !!x.meta?.q);
    for (let i = 0; i < 4 && taken(made.n); i++) made = make29(s, arch, ctx, r);
    if (taken(made.n)) continue;
    if (!canBorn29(s, arch, a, made.k)) continue;
    if (!room(s)) break;
    const prov = provOf(s, arch, a, pid, r);
    const nAct = a ? live29(s).filter((x) => x.a === a.id).length : 0;
    const fame = a?.fame ?? 30;
    const v = Math.round(ARCHDEF29[arch].base * (0.35 + fame / 45) * (0.8 + sev / 150) / (1 + 0.2 * nAct) * CONDM[made.cond]);
    const rl = addRelic(s, made.k, made.n, a?.id, pid, v, s.year, nid29(s));
    Object.assign(relMeta(rl), { q: pack({ arch, cond: made.cond, prov, city, vi, fake: false, suit: false }), o, b: rl.v });
    place(s, rl, prov, pid, lab, city, vi, r);
    st.yc[1]++;
    if (a) st.ay[a.id] = (st.ay[a.id] ?? 0) + 1;
    st.n[ai] = (st.n[ai] ?? 0) + 1;
    out.push(rl);
    emitFact(s, { kind: 'relic', actors: a ? [a.id, ...(pid ? [pid] : [])] : [], place: city, severity: 20 + Math.min(30, Math.round(v / 4000)), visibility: 'public', tags: ['relic', 'born', 'r29', arch], src: 'relics29', cause: fid ? [fid] : undefined,
      text: fmtL(l('Nasce uma relíquia: {n}.', 'A relic is born: {n}.'), { n: rl.n }), data: { relic: rl.id } });
    if (rl.st === 'player') notify(s, fmtL(l('Nova peça no seu acervo: {n} (Lendas → Relíquias).', 'New piece in your collection: {n} (Legends → Relics).'), { n: rl.n }), 'good');
    else if (mine(a)) notify(s, fmtL(l('Nova relíquia ligada ao seu elenco: {n} ({p}).', 'New relic tied to your roster: {n} ({p}).'), { n: rl.n, p: PROV29[prov] }), 'info');
  }
  return out;
}
/** Teto total: abre espaço tirando a peça procedural mais barata que ninguém disputa (fora do acervo, leilão e mercado). */
function room(s: GameState): boolean {
  const list = live29(s);
  if (list.length < (DENS29[dens29(s)] ?? DENS29.many).total) return true;
  const stash = new Set(crime17(s).stash);
  let pool = list.filter((x) => (x.st === 'kept' || x.st === 'museum') && !myTrail9(s, x));
  if (!pool.length) pool = list.filter((x) => x.st === 'stolen' && !stash.has(x.id) && !myTrail9(s, x)); // sumiu no submundo de vez
  const victim = (pool.some((x) => x.y < s.year) ? pool.filter((x) => x.y < s.year) : pool).sort((a, b) => a.v - b.v)[0];
  if (!victim) return false;
  archiveRelic9(s, victim); // R31 G: arquiva (compacto), nunca descarta
  return true;
}
function provOf(s: GameState, arch: Arch29, a: Act | undefined, pid: string | undefined, r: Rng): Prov29 {
  if (arch === 'signed' || arch === 'fixture') return 'u';
  if (ARCHDEF29[arch].label && a && mine(a)) return 'p';
  if (ARCHDEF29[arch].label && a?.owner && s.labels[a.owner]) return 'l';
  if (arch === 'smashed') return r.chance(0.4) ? 'f' : 'a';
  if (arch === 'charred') return r.chance(0.15) ? 'b' : 'v';
  if (arch === 'infamous') return r.chance(0.2) ? 'b' : 'c';
  if (arch === 'personal' || arch === 'last_note') return pid && s.persons[pid] && !s.persons[pid].alive ? 'h' : 'a';
  if (arch === 'ceremony_outfit' && r.chance(0.2)) return 'm';
  if (arch === 'show_poster' || arch === 'tour_pass') return 'c';
  return 'a';
}
/** Põe a peça com o dono certo (estado do relics9 + histórico de donos). */
function place(s: GameState, rl: Relic, prov: Prov29, pid: string | undefined, lab: string | undefined, city: string, vi: number, r: Rng): void {
  const who = (x: string, how = 'origem') => { rl.own[0] = [x, s.year, how]; };
  const pn = pid ? s.persons[pid]?.name : undefined;
  switch (prov) {
    case 'p': rl.st = 'player'; who(s.config.companyName); break;
    case 'l': who(lab ?? rl.own[0][0]); break;
    case 'c': who(`${r.pick(COLLECTORS)} (colecionador)`, 'compra'); break;
    case 'm': rl.st = 'museum'; who(r.pick(MUSEUMS), 'doação'); break;
    case 'b': rl.st = 'stolen'; who(`${pn ?? rl.own[0][0]}`); rl.own.push(['paradeiro desconhecido', s.year, 'saqueada']); break;
    case 'f': who(fmtL(l('um fã em {c}', 'a fan in {c}'), { c: cityL(city) }).pt, 'achado'); break;
    case 'h': who(`herdeiros de ${pn ?? rl.own[0][0]}`, 'herança'); break;
    case 'u': rl.st = 'auction'; rl.au = s.week + 13; who(lab ?? rl.own[0][0]); break;
    case 'v': who(venueL29(city, vi).pt); break;
    default: break;
  }
}

// ---------------------------------------------------------------- valor que anda

/** Morte: as peças de quem morreu sobem na hora (o legado do relics18 segura o novo patamar); o que estava com o artista vai aos herdeiros. */
function onDeath(s: GameState, f: Fact): void {
  const dead = f.actors.map(actorId).filter((x) => s.persons[x] && !s.persons[x].alive);
  if (!dead.length) return;
  for (const rl of live29(s)) {
    if (!rl.p || !dead.includes(rl.p)) continue;
    rl.v = Math.round(rl.v * 1.25);
    const mm = meta18(rl);
    if (mm) mm.b = Math.round(mm.b * 1.1);
    const m = meta29(s, rl)!;
    if (rl.st === 'kept' && m.prov === 'a') {
      rl.own.push([`herdeiros de ${s.persons[rl.p].name}`, s.year, 'herança']);
      setQ(rl, { ...m, prov: 'h' });
    }
  }
}
/** Escândalo derruba o resto e valoriza o objeto do escândalo; volta e revival valorizam. */
function shift(s: GameState, f: Fact, how: 'scandal' | 'up'): void {
  const ids = new Set(f.actors.map(actorId));
  for (const rl of live29(s)) {
    if (!rl.a || !ids.has(rl.a)) continue;
    const m = meta29(s, rl)!;
    rl.v = Math.round(rl.v * (how === 'up' ? 1.08 : m.arch === 'infamous' ? 1.2 : 0.95));
  }
}

// ---------------------------------------------------------------- falsificações (mercado negro do crime17)

/** Um falsário copia uma peça procedural famosa e a põe no mercado negro. A cópia é idêntica (nome, donos); só a perícia
 *  (authenticate18, Lendas → Acervo vivo) ou o tempo revelam. Devolve a cópia. */
export function forge29(s: GameState, src: Relic, r: Rng): Relic | null {
  const st = rel29(s);
  const m = meta29(s, src);
  if (!m || m.fake || !room(s) || !relics(s).list.includes(src)) return null; // a cópia conta no teto total
  const copy = addRelic(s, src.k, src.n, src.a, src.p, src.v, src.y, nid29(s));
  copy.own = [...src.own.map((o) => [...o] as [string, number, string]), [l('vendedor anônimo', 'anonymous seller').pt, s.year, 'mercado negro']];
  copy.st = 'stolen';
  crime17(s).fake[copy.id] = 1;
  Object.assign(relMeta(copy), { q: pack({ ...m, prov: 'b', fake: true, suit: false }), o: meta18(src)?.o ?? 'base', b: meta18(src)?.b ?? src.v });
  st.fk++;
  const fs = fences(s);
  const cm = crime17(s);
  if (fs.length && cm.market.length < (DENS29[dens29(s)]?.flat ? 6 : 10)) cm.market.push({ id: `bm${copy.id}`, rl: copy.id, fence: r.pick(fs).i, price: Math.round(money(s, src.v) * r.float(0.35, 0.5)), auth: r.float(0.45, 0.8), until: s.week + 12, seller: '' });
  emitFact(s, { kind: 'relic', actors: src.a ? [src.a] : [], severity: 30, visibility: 'rumor', tags: ['relic', 'forgery', 'r29'], src: 'relics29',
    text: fmtL(l('Circula no mercado negro uma peça que diz ser {n}.', 'A piece claiming to be {n} is circulating on the black market.'), { n: src.n }), data: { relic: copy.id } });
  return copy;
}

// ---------------------------------------------------------------- ganchos

registerSimHook('month', 'relics29', (s) => {
  if (rel29(s).q.length) flush29(s);
  const c = DENS29[dens29(s)] ?? DENS29.many;
  if (!c.flat) blackMarket29(s);
});
/** Mercado negro com mais peças (densidade normal ou maior): uma peça procedural roubada às vezes ganha oferta no
 *  mercado de sempre do crime17 (até 8 ofertas), com a mesma "autenticidade estimada" — e a falsa engana mais. */
function blackMarket29(s: GameState): void {
  const cm = crime17(s);
  if (cm.market.length >= 8) return;
  const r = Rng.fromSeed(`${s.config.seed}|relics29bm|${s.week}`);
  if (!r.chance(0.4)) return;
  const pool = relics(s).list.filter((rl) => rl.meta?.q && rl.st === 'stolen' && !cm.stash.includes(rl.id) && !cm.market.some((x) => x.rl === rl.id));
  const fs = fences(s);
  if (!pool.length || !fs.length) return;
  const rl = r.pick(pool);
  const auth = cm.fake[rl.id] ? r.float(0.45, 0.8) : r.chance(0.25) ? r.float(0.3, 0.6) : r.float(0.75, 0.97);
  cm.market.push({ id: `bm${rl.id}w${s.week}`, rl: rl.id, fence: r.pick(fs).i, price: Math.round(money(s, rl.v) * r.float(0.3, 0.55)), auth, until: s.week + 12, seller: '' });
}
registerSimHook('year', 'relics29', (s) => {
  const r = Rng.fromSeed(`${s.config.seed}|relics29y|${s.year}`);
  // o relics18 (gancho anual antes deste) guarda o multiplicador de legado com todas as casas; 3 bastam nas procedurais
  for (const x of relics(s).list) if (x.meta?.q && x.meta.lg) x.meta.lg = Math.round(x.meta.lg * 1000) / 1000;
  const list = live29(s);
  for (const rl of list) {
    const m = meta29(s, rl)!;
    const age = s.year - rl.y;
    // aniversário (10/25/40/50 anos): a peça volta à conversa e vale mais; colecionador aproveita e leiloa
    if (age === 10 || age === 25 || age === 40 || age === 50) {
      rl.v = Math.round(rl.v * 1.12);
      if (rl.st === 'kept' && m.prov === 'c' && r.chance(0.3)) {
        rl.st = 'auction'; rl.au = s.week + 13;
        chron(s, { k: 'relic', i: 2, a: rl.a ? [rl.a] : [], t: fmtL(l('{y} anos depois, {n} vai a leilão.', '{y} years on, {n} goes to auction.'), { y: age, n: rl.n }) });
      }
      if (rl.st === 'player') notify(s, fmtL(l('{n} faz {y} anos: o aniversário valoriza a peça.', '{n} turns {y}: the anniversary lifts its value.'), { n: rl.n, y: age }), 'good');
    }
    // herdeiros brigam pela peça (afterlife19): uma vez por peça, se o espólio existe
    if (m.prov === 'h' && !m.suit && rl.p && rl.st === 'kept' && est19(s, rl.p) && r.chance(0.3)) {
      setQ(rl, { ...m, suit: true });
      suit19(s, rl.p, 'relic');
    }
  }
  const c = DENS29[dens29(s)] ?? DENS29.many;
  // falsários: as peças procedurais mais valiosas atraem cópias (teto de falsas vivas)
  let fakes = list.filter((x) => meta29(s, x)!.fake && x.st !== 'lost').length;
  const tgts = list.filter((x) => !meta29(s, x)!.fake && x.st !== 'lost' && x.v >= 40000 && s.year - x.y >= 2).sort((a, b) => b.v - a.v).slice(0, c.forge * 2);
  for (let i = 0; i < c.forge && tgts.length && fakes < c.fakes; i++) if (r.chance(0.15)) { const tg = tgts.splice(r.int(0, tgts.length - 1), 1)[0]; if (forge29(s, tg, r)) fakes++; }
  // o leilão famoso do ano: a peça mais cobiçada com colecionador ou herdeiros vai a pregão (evento, manchete)
  if (c.famous && r.chance(c.famous)) famousAuction29(s, live29(s));
  if (c.archive) archive29(s, c.archive);
});

/** Leilão famoso: a peça procedural mais valiosa com colecionador/herdeiros vai a pregão, com fato e crônica. */
export function famousAuction29(s: GameState, list = live29(s)): Relic | null {
  const rl = list.filter((x) => { const m = meta29(s, x)!; return x.st === 'kept' && !m.fake && (m.prov === 'c' || m.prov === 'h') && s.year - x.y >= 3; }).sort((a, b) => b.v - a.v)[0];
  if (!rl) return null;
  rl.st = 'auction'; rl.au = s.week + 13;
  const t = fmtL(l('Leilão do ano: {n} vai a pregão (lance inicial ${v}).', 'Auction of the year: {n} goes under the hammer (opening bid ${v}).'), { n: rl.n, v: Math.round(money(s, rl.v)).toLocaleString('en-US') });
  chron(s, { k: 'relic', i: 3, a: rl.a ? [rl.a] : [], t });
  emitFact(s, { kind: 'relic', actors: rl.a ? [rl.a] : [], severity: 50, visibility: 'public', tags: ['relic', 'auction', 'r29', 'famous'], src: 'relics29', text: t, data: { relic: rl.id } });
  notify(s, fmtL(l('Leilão do ano: {n}. Veja Lendas → Relíquias.', 'Auction of the year: {n}. See Legends → Relics.'), { n: rl.n }), 'info');
  return rl;
}

/** Acervo histórico: peça procedural antiga, barata e sem disputa (com dono comum, sem lenda nem ato seu) sai da lista e
 *  vira contagem por ato. As notáveis (o quarto mais valioso, de lendas, do seu elenco, em museu, leilão, acervo,
 *  roubadas) ficam. Mantém o save pequeno com centenas de peças por partida. */
export function archive29(s: GameState, age: number): number {
  const list = live29(s);
  if (list.length < 40) return 0;
  const vs = list.map((x) => x.v).sort((a, b) => a - b);
  const p75 = vs[Math.floor(vs.length * 0.75)] ?? 0;
  let n = 0;
  for (const rl of list) {
    // com dono comum, ou roubada há muito tempo sem aparecer no mercado (sumiu no submundo)
    const gone = rl.st === 'stolen' && !crime17(s).stash.includes(rl.id) && !crime17(s).market.some((o) => o.rl === rl.id);
    if ((rl.st !== 'kept' && !gone) || s.year - rl.y < age || rl.v >= p75) continue;
    if (meta29(s, rl)?.fake) continue; // falsa não entra no acervo histórico do ato
    if (myTrail9(s, rl)) continue; // R31 G: peça com trajetória sua fica na lista viva
    const a = rl.a ? s.acts[rl.a] : undefined;
    if (a && (a.legend || mine(a))) continue;
    archiveRelic9(s, rl); // R31 G: arquivo único e compacto do relics9 (antes: contagem por ato só aqui)
    n++;
  }
  return n;
}
/** Resumo do acervo histórico (interface). */
export function arc29(s: GameState): { n: number; v: number; acts: number } {
  let n = 0, v = 0, acts = 0;
  const st = relics(s);
  const ks = new Set<string>();
  for (const x of st.arc) { n++; v += x.v; if (x.a) ks.add(x.a); }
  for (const [k, [c, x]] of Object.entries(st.arcN)) { n += c; v += x; if (k) ks.add(k); }
  acts = ks.size;
  return { n, v, acts };
}
