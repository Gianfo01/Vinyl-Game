// Bolsa de valores (rodada 10): ações avulsas de selos rivais, plataformas de streaming e vídeo, grupos de mídia,
// fabricantes de aparelhos e formatos (jukebox, fita, CD, hi-fi) — só empresas que EXISTEM no ano da partida.
// Os preços reagem ao mundo do jogo: o valor real dos selos (receita, catálogo, elenco, caixa — mesmo cálculo
// das participações), o prestígio (standing9), hits no top 10, escândalos, troca de CEO, perda e ganho de
// elenco, fechamentos (a ação vai a ~0) e aquisições (acionistas recebem ágio); e às viradas tecnológicas
// do mundo (datas de tecnologia da própria partida: LP, 45 rpm, cassete, clipes, CD, pirataria P2P,
// downloads, streaming, vídeo curto) e às crises históricas já existentes (1929, 1973, 1987, 2000, 2008, 2020).
// Dividendos mensais para empresas maduras. Aleatoriedade própria (Rng semeado por mês), fora do fluxo comum.

import { clamp, Rng } from '../../core/rng';
import { priceIndex } from '../../core/money';
import { techById } from '../../data/rules';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import type { GameState, Label } from '../types';
import { fmtL, money, notify, remember } from '../util';
import { crashOf } from './goods8';
import { ownerOf } from './people/owner';
import { standingOf } from './standing9';
import { labelValue } from './stakes8';
import { ventures } from './ventures9';

// ---------------------------------------------------------------- catálogo

export type Tag = 'label' | 'stream' | 'video' | 'media' | 'radio' | 'tv' | 'cd' | 'tape' | 'vinyl' | 'jukebox' | 'hifi' | 'tech';
export type Kind = 'label' | 'streaming' | 'video' | 'media' | 'hardware';

export const KIND_NAME: Record<Kind, L> = {
  label: l('Selos e música', 'Labels and music'),
  streaming: l('Streaming', 'Streaming'),
  video: l('Vídeo e plataformas', 'Video and platforms'),
  media: l('Mídia e rádio/TV', 'Media, radio and TV'),
  hardware: l('Aparelhos e formatos', 'Hardware and formats'),
};

type Fate = 'acquired' | 'bankrupt';
interface Def {
  id: string;
  real: string;
  fake: string;
  kind: Kind;
  tags: Tag[];
  /** ano do primeiro pregão (função: acompanha as datas de tecnologia da partida) */
  from: number | ((s: GameState) => number);
  /** último ano listada (depois disso: aquisição ou falência) */
  to?: number;
  fate?: Fate;
  by?: string;
  /** preço inicial em dólares reais (corrigido pela inflação da época) */
  p0: number;
  beta: number;
  div: number;
  blurb: L;
}

/** Preço-base em centavos: dólares de 2020 corrigidos só em parte pela inflação (desdobramentos mantêm ações acessíveis). */
const px = (s: GameState, dollars: number): number => Math.round(dollars * 100 * Math.pow(priceIndex(s.year), 0.3));
const T = (s: GameState, id: string): number => s.techDates[id] ?? techById[id]?.base ?? 9999;
const after = (tech: string, plus: number, floor: number) => (s: GameState): number => Math.max(floor, T(s, tech) + plus);

const D = (d: Def): Def => d;
export const DEFS: Def[] = [
  // selos e música
  D({ id: 'decca', real: 'Decca Records', fake: 'Linha Alva Discos', kind: 'label', tags: ['label', 'vinyl'], from: 1929, to: 1979, fate: 'acquired', by: 'PolyGram', p0: 25, beta: 0.9, div: 0.04, blurb: l('Gravadora britânica clássica: pop, clássicos e o catálogo do rock.', 'Classic British label: pop, classical and a rock catalogue.') }),
  D({ id: 'rca', real: 'RCA', fake: 'Radiotron Americana', kind: 'hardware', tags: ['label', 'radio', 'tv', 'vinyl', 'hifi'], from: 1920, to: 1985, fate: 'acquired', by: 'General Electric', p0: 30, beta: 1, div: 0.035, blurb: l('Rádios, TVs, discos e a NBC no mesmo guarda-chuva.', 'Radios, TVs, records and a network under one roof.') }),
  D({ id: 'cbs', real: 'CBS', fake: 'Rede Colúmbia de Rádio', kind: 'media', tags: ['media', 'radio', 'tv', 'label'], from: 1929, to: 2018, fate: 'acquired', by: 'Viacom', p0: 30, beta: 0.9, div: 0.03, blurb: l('Rede de rádio e TV com selo próprio.', 'A radio and TV network with a label of its own.') }),
  D({ id: 'warnercomm', real: 'Warner Communications', fake: 'Comunicações Costa Oeste', kind: 'label', tags: ['label', 'media', 'tv'], from: 1969, to: 1989, fate: 'acquired', by: 'Time Warner', p0: 20, beta: 1.1, div: 0.01, blurb: l('Estúdios, discos e videogames: a mídia dos anos 70-80.', 'Studios, records and video games: 70s-80s media.') }),
  D({ id: 'timewarner', real: 'Time Warner', fake: 'Tempo & Estúdios Holding', kind: 'media', tags: ['label', 'media', 'tv', 'video'], from: 1990, to: 2017, fate: 'acquired', by: 'AT&T', p0: 40, beta: 1, div: 0.02, blurb: l('Revistas, cabo, cinema e música sob o mesmo teto.', 'Magazines, cable, film and music under one roof.') }),
  D({ id: 'polygram', real: 'PolyGram', fake: 'Polifonia Records NV', kind: 'label', tags: ['label', 'cd'], from: 1989, to: 1997, fate: 'acquired', by: 'Universal', p0: 22, beta: 1.1, div: 0.02, blurb: l('Gigante europeu do CD e da música clássica.', 'European giant of CDs and classical music.') }),
  D({ id: 'vivendi', real: 'Vivendi (Universal)', fake: 'Vivenda Mídia', kind: 'media', tags: ['label', 'media', 'tv', 'stream'], from: 1998, p0: 28, beta: 1.1, div: 0.03, blurb: l('Conglomerado francês de mídia dono do maior selo do mundo.', 'French media conglomerate that owns the world\'s biggest label.') }),
  D({ id: 'wmg', real: 'Warner Music Group', fake: 'Selos Pacífico Music', kind: 'label', tags: ['label', 'stream'], from: 2005, p0: 20, beta: 1.2, div: 0.04, blurb: l('Selo grande listado em bolsa: catálogo, streaming e pirataria na conta.', 'A major label on the exchange: catalogue, streaming and piracy all on the books.') }),
  D({ id: 'umg', real: 'Universal Music Group', fake: 'Universo Música S.A.', kind: 'label', tags: ['label', 'stream'], from: after('streaming', 12, 2021), p0: 24, beta: 1, div: 0.02, blurb: l('Maior selo do mundo, já separado do conglomerado.', 'The world\'s biggest label, now spun off.') }),
  // streaming e plataformas
  D({ id: 'spotify', real: 'Spotify', fake: 'Fonógrafo Online', kind: 'streaming', tags: ['stream', 'tech'], from: after('streaming', 8, 2018), p0: 40, beta: 1.5, div: 0, blurb: l('Streaming de música: cresce rápido e vive de contrato com os selos.', 'Music streaming: grows fast and lives on label contracts.') }),
  D({ id: 'tencentmusic', real: 'Tencent Music', fake: 'Música Oriente Digital', kind: 'streaming', tags: ['stream', 'tech'], from: after('streaming', 8, 2018), p0: 10, beta: 1.4, div: 0, blurb: l('O streaming de música da Ásia, ligado a jogos e redes.', 'Asia\'s music streaming, tied to games and social apps.') }),
  D({ id: 'pandora', real: 'Pandora', fake: 'Rádio da Rede', kind: 'streaming', tags: ['stream', 'radio', 'tech'], from: after('streaming', 3, 2011), to: 2018, fate: 'acquired', by: 'Sirius XM', p0: 12, beta: 1.5, div: 0, blurb: l('Rádio pela internet; sofre com royalties.', 'Internet radio; suffers under royalty bills.') }),
  D({ id: 'deezer', real: 'Deezer', fake: 'Eco Sonoro', kind: 'streaming', tags: ['stream', 'tech'], from: after('streaming', 14, 2022), p0: 3, beta: 1.6, div: 0, blurb: l('Streaming menor: sobe e desce com notícias de contrato.', 'A smaller streamer: swings with contract news.') }),
  D({ id: 'siriusxm', real: 'Sirius XM', fake: 'Satélite Rádio Plus', kind: 'streaming', tags: ['radio', 'media', 'stream'], from: 2008, p0: 4, beta: 1.2, div: 0.01, blurb: l('Rádio por assinatura via satélite.', 'Subscription satellite radio.') }),
  D({ id: 'alphabet', real: 'Alphabet (Google / YouTube)', fake: 'Buscaí (buscas e vídeos)', kind: 'video', tags: ['video', 'stream', 'tech'], from: after('internet', 9, 2004), p0: 30, beta: 1.2, div: 0, blurb: l('Buscas e vídeo: onde a maior parte do mundo ouve música grátis.', 'Search and video: where most of the world listens to music for free.') }),
  D({ id: 'apple', real: 'Apple (iTunes / Apple Music)', fake: 'Maçã Digital', kind: 'video', tags: ['tech', 'hifi', 'stream'], from: 1980, p0: 25, beta: 1.3, div: 0.005, blurb: l('Aparelhos, loja de música e streaming.', 'Devices, a music store and streaming.') }),
  D({ id: 'netflix', real: 'Netflix', fake: 'Telão Play', kind: 'video', tags: ['video', 'stream', 'tech'], from: after('internet', 7, 2002), p0: 12, beta: 1.5, div: 0, blurb: l('Vídeo por assinatura: trilhas sonoras viram hits.', 'Subscription video: soundtracks turn into hits.') }),
  // mídia, rádio e TV
  D({ id: 'viacom', real: 'Viacom (MTV)', fake: 'Videoclip Networks', kind: 'media', tags: ['media', 'tv', 'video', 'label'], from: 1971, to: 2018, fate: 'acquired', by: 'CBS', p0: 22, beta: 1.1, div: 0.02, blurb: l('Canais a cabo e a TV de clipes.', 'Cable channels and the music video network.') }),
  D({ id: 'clearchannel', real: 'Clear Channel', fake: 'Canal Aberto Rádios', kind: 'media', tags: ['radio', 'media'], from: 1984, to: 2007, fate: 'acquired', by: 'um fundo de investimento', p0: 14, beta: 1, div: 0.025, blurb: l('Maior dona de rádios dos EUA: define o que toca.', 'The largest radio owner in the US: decides what gets played.') }),
  D({ id: 'newscorp', real: 'News Corporation', fake: 'Grupo Jornal Mundial', kind: 'media', tags: ['media', 'tv', 'video'], from: 1980, p0: 18, beta: 1, div: 0.015, blurb: l('Jornais, TV e estúdios.', 'Newspapers, TV and studios.') }),
  D({ id: 'disney', real: 'Walt Disney', fake: 'Estúdios Fantasia', kind: 'media', tags: ['media', 'tv', 'video', 'stream'], from: 1957, p0: 30, beta: 1, div: 0.01, blurb: l('Estúdios, parques e trilhas sonoras que vendem milhões.', 'Studios, parks and soundtracks that sell millions.') }),
  // aparelhos e formatos
  D({ id: 'sony', real: 'Sony', fake: 'Sonora Eletrônica', kind: 'hardware', tags: ['cd', 'tape', 'hifi', 'label', 'tv', 'tech'], from: 1958, p0: 25, beta: 1.1, div: 0.015, blurb: l('Walkman, CD e um selo gigante: ganha com o formato e com a música.', 'Walkman, CD and a giant label: earns on the format and the music.') }),
  D({ id: 'philips', real: 'Philips', fake: 'Lumina Eletrônica', kind: 'hardware', tags: ['cd', 'tape', 'hifi', 'tech'], from: 1920, p0: 20, beta: 1, div: 0.03, blurb: l('Cassete, CD e rádios: o formato da vez decide o ano.', 'Cassette, CD and radios: the format of the day decides the year.') }),
  D({ id: 'matsushita', real: 'Matsushita (Technics)', fake: 'Sakura Eletro', kind: 'hardware', tags: ['hifi', 'tape', 'tv'], from: 1949, p0: 18, beta: 1, div: 0.02, blurb: l('Toca-discos e equipamentos de som profissionais.', 'Turntables and pro sound gear.') }),
  D({ id: 'wurlitzer', real: 'Wurlitzer', fake: 'Vitrolas Baldini', kind: 'hardware', tags: ['jukebox', 'vinyl', 'hifi'], from: 1920, to: 1983, fate: 'acquired', by: 'um grupo industrial', p0: 12, beta: 1, div: 0.05, blurb: l('Jukeboxes e pianos elétricos.', 'Jukeboxes and electric pianos.') }),
  D({ id: 'seeburg', real: 'Seeburg', fake: 'Rockolas União', kind: 'hardware', tags: ['jukebox', 'vinyl'], from: 1920, to: 1978, fate: 'bankrupt', p0: 10, beta: 1.2, div: 0.04, blurb: l('Jukeboxes: vive do compacto de 45 rpm.', 'Jukeboxes: lives on the 45 rpm single.') }),
  D({ id: 'ampex', real: 'Ampex', fake: 'Fitas Magnéticas Ltda', kind: 'hardware', tags: ['tape', 'hifi'], from: 1958, to: 2007, fate: 'bankrupt', p0: 12, beta: 1.3, div: 0, blurb: l('Gravadores de fita de estúdio.', 'Studio tape recorders.') }),
  D({ id: 'zenith', real: 'Zenith Radio', fake: 'Zênite Rádio e TV', kind: 'hardware', tags: ['radio', 'tv', 'hifi'], from: 1923, to: 1998, fate: 'acquired', by: 'um grupo coreano', p0: 14, beta: 1, div: 0.03, blurb: l('Rádios e televisores de sala.', 'Living-room radios and TV sets.') }),
  D({ id: 'tdk', real: 'TDK', fake: 'Fitas Tóquio-K', kind: 'hardware', tags: ['tape', 'cd', 'hifi'], from: 1960, p0: 15, beta: 1, div: 0.02, blurb: l('Fitas cassete e mídias virgens.', 'Cassette tapes and blank media.') }),
  D({ id: 'pioneer', real: 'Pioneer', fake: 'Aurora Hi-Fi', kind: 'hardware', tags: ['hifi', 'cd', 'tape'], from: 1961, to: 2013, fate: 'acquired', by: 'um fundo de investimento', p0: 14, beta: 1.1, div: 0.02, blurb: l('Amplificadores, toca-discos e som de carro.', 'Amplifiers, turntables and car audio.') }),
  D({ id: 'jvc', real: 'JVC (Victor Co. of Japan)', fake: 'Vitor Nipônica', kind: 'hardware', tags: ['tape', 'hifi', 'tv'], from: 1927, to: 2007, fate: 'acquired', by: 'uma fusão', p0: 13, beta: 1, div: 0.02, blurb: l('VHS, hi-fi e aparelhos de som.', 'VHS, hi-fi and sound equipment.') }),
  D({ id: 'dolby', real: 'Dolby Laboratories', fake: 'Laboratórios Sonoros', kind: 'hardware', tags: ['hifi', 'cd', 'tech'], from: 2005, p0: 25, beta: 0.9, div: 0.01, blurb: l('Licencia tecnologia de áudio para tudo que toca som.', 'Licenses audio technology for everything that plays sound.') }),
];

export const DEF_BY_ID: Record<string, Def> = Object.fromEntries(DEFS.map((d) => [d.id, d]));

/** Gigantes que ficam fora da bolsa (para o jogador saber que não é esquecimento). */
export const UNLISTED: { name: L; why: L; from: number; to?: number; tech?: string }[] = [
  { name: l('Globo e grupos de TV familiares', 'Globo and family-owned TV groups'), why: l('Controle familiar: sem ações.', 'Family-controlled: no shares.'), from: 1950 },
  { name: l('Bertelsmann (BMG)', 'Bertelsmann (BMG)'), why: l('Fundação controladora: nunca abriu capital.', 'Controlling foundation: never went public.'), from: 1950 },
  { name: l('TikTok (ByteDance)', 'TikTok (ByteDance)'), why: l('Empresa fechada: não negocia em bolsa.', 'Privately held: not traded.'), from: 2018, tech: 'short_video' },
  { name: l('Fábricas de prensagem de vinil', 'Vinyl pressing plants'), why: l('Empresas pequenas e familiares.', 'Small family firms.'), from: 1920 },
];

// ---------------------------------------------------------------- eventos que mexem com setores inteiros

interface Ev { id: string; tag: Tag; pct: number; tech?: string; year?: number; pt: string; en: string }
const EV = (e: Ev): Ev => e;
export const EVENTS: Ev[] = [
  EV({ id: 'radio', tag: 'radio', pct: 30, tech: 'radio', pt: 'o rádio chega aos lares e dispara a venda de aparelhos', en: 'radio reaches the home and receiver sales take off' }),
  EV({ id: 'radio-l', tag: 'label', pct: 12, tech: 'radio', pt: 'o rádio divulga discos e abre um mercado novo', en: 'radio promotes records and opens a new market' }),
  EV({ id: 'lp', tag: 'vinyl', pct: 22, tech: 'lp', pt: 'o LP abre um mercado novo para discos e toca-discos', en: 'the LP opens a new market for records and players' }),
  EV({ id: 'lp-l', tag: 'label', pct: 10, tech: 'lp', pt: 'o LP faz o ouvinte pagar mais por álbum', en: 'the LP makes listeners pay more per album' }),
  EV({ id: '45', tag: 'jukebox', pct: 30, tech: 'single45', pt: 'o compacto de 45 rpm alimenta as jukeboxes', en: 'the 45 rpm single feeds the jukeboxes' }),
  EV({ id: 'tv', tag: 'tv', pct: 15, tech: 'tv_music', pt: 'a TV musical atrai audiência e anunciantes', en: 'music TV draws audiences and advertisers' }),
  EV({ id: 'tv-r', tag: 'radio', pct: -10, tech: 'tv_music', pt: 'a TV tira audiência do rádio', en: 'TV pulls audience from radio' }),
  EV({ id: 'cassette', tag: 'tape', pct: 35, tech: 'cassette', pt: 'a fita cassete deixa todo mundo gravar em casa', en: 'the cassette lets everyone record at home' }),
  EV({ id: 'cassette-j', tag: 'jukebox', pct: -12, tech: 'cassette', pt: 'o cassete esvazia os bares com jukebox', en: 'the cassette empties the jukebox bars' }),
  EV({ id: 'fm', tag: 'radio', pct: 12, tech: 'fm', pt: 'o FM atrai ouvintes e anúncios', en: 'FM brings listeners and ads' }),
  EV({ id: 'disco', tag: 'label', pct: -18, year: 1979, pt: 'o fim da febre disco deixa os selos com estoques encalhados', en: 'the end of the disco craze leaves labels with unsold stock' }),
  EV({ id: 'clip', tag: 'media', pct: 25, tech: 'clipnet', pt: 'a rede de clipes faz da imagem um produto', en: 'the video network turns image into a product' }),
  EV({ id: 'clip-l', tag: 'label', pct: 12, tech: 'clipnet', pt: 'clipes passam a vender discos', en: 'music videos start selling records' }),
  EV({ id: 'cd', tag: 'cd', pct: 40, tech: 'cd', pt: 'o CD faz todo mundo recomprar o catálogo', en: 'the CD makes everyone re-buy the catalogue' }),
  EV({ id: 'cd-l', tag: 'label', pct: 22, tech: 'cd', pt: 'o CD faz todo mundo recomprar o catálogo', en: 'the CD makes everyone re-buy the catalogue' }),
  EV({ id: 'cd-v', tag: 'vinyl', pct: -25, tech: 'cd', pt: 'o CD destrona o vinil', en: 'the CD dethrones vinyl' }),
  EV({ id: 'cd-t', tag: 'tape', pct: -20, tech: 'cd', pt: 'o CD destrona a fita', en: 'the CD dethrones tape' }),
  EV({ id: 'net', tag: 'tech', pct: 30, tech: 'internet', pt: 'a internet doméstica vira promessa de bilhões', en: 'home internet becomes a billion-dollar promise' }),
  EV({ id: 'p2p', tag: 'label', pct: -20, tech: 'p2p', pt: 'a pirataria derrubou as vendas de CD', en: 'piracy knocked CD sales down' }),
  EV({ id: 'p2p-cd', tag: 'cd', pct: -18, tech: 'p2p', pt: 'a pirataria derrubou as vendas de CD', en: 'piracy knocked CD sales down' }),
  EV({ id: 'dl', tag: 'stream', pct: 12, tech: 'download', pt: 'as lojas de download legalizam o consumo digital', en: 'download stores legitimize digital listening' }),
  EV({ id: 'dl-t', tag: 'tech', pct: 15, tech: 'download', pt: 'as lojas de download legalizam o consumo digital', en: 'download stores legitimize digital listening' }),
  EV({ id: 'dl-l', tag: 'label', pct: 6, tech: 'download', pt: 'o download volta a cobrar pela música', en: 'downloads start charging for music again' }),
  EV({ id: 'stream', tag: 'stream', pct: 45, tech: 'streaming', pt: 'o streaming vira a forma dominante de ouvir música', en: 'streaming becomes the dominant way to listen' }),
  EV({ id: 'stream-l', tag: 'label', pct: 15, tech: 'streaming', pt: 'o streaming devolve receita aos selos', en: 'streaming brings revenue back to labels' }),
  EV({ id: 'stream-cd', tag: 'cd', pct: -25, tech: 'streaming', pt: 'o streaming enterra o CD', en: 'streaming buries the CD' }),
  EV({ id: 'short', tag: 'video', pct: 30, tech: 'short_video', pt: 'o vídeo curto vira a vitrine dos hits', en: 'short video becomes the hit showcase' }),
  EV({ id: 'short-s', tag: 'stream', pct: -6, tech: 'short_video', pt: 'o vídeo curto rouba tempo de escuta', en: 'short video steals listening time' }),
  EV({ id: 'short-l', tag: 'label', pct: 5, tech: 'short_video', pt: 'o vídeo curto lança hits virais', en: 'short video launches viral hits' }),
  EV({ id: 'covid', tag: 'media', pct: -10, year: 2020, pt: 'a pandemia fecha estúdios e redações', en: 'the pandemic shuts studios and newsrooms' }),
  EV({ id: 'covid-s', tag: 'stream', pct: 18, year: 2020, pt: 'a pandemia põe todo mundo em casa, ouvindo e assistindo', en: 'the pandemic puts everyone at home listening and watching' }),
  EV({ id: 'hologram', tag: 'tech', pct: 14, tech: 'hologram', pt: 'hologramas de palco abrem um mercado de shows', en: 'stage holograms open a live market' }),
  EV({ id: 'synth', tag: 'label', pct: -8, tech: 'synthetic_voice', pt: 'vozes sintéticas barateiam a produção e preocupam artistas', en: 'synthetic voices cheapen production and worry artists' }),
];

const evYear = (s: GameState, e: Ev): number => (e.tech ? T(s, e.tech) : e.year ?? 9999);

// ---------------------------------------------------------------- estado

export interface Quote {
  p: number;
  lv: number;
  x: number;
  hist: number[];
  born: number;
  evY: number;
  chg: number;
  note?: L;
  base: number;
  dead?: { y: number; kind: Fate; text: L };
  ceo?: string;
  hits?: number;
  sc?: number;
  ros?: number;
}
export interface Pos { sh: number; cost: number; since: number; divs: number }
export interface NewsItem { y: number; m: number; t: L; tone: 'good' | 'bad' | 'info'; id?: string }
export interface BolsaState {
  q: Record<string, Quote>;
  pos: Record<string, Pos>;
  news: NewsItem[];
  /** selos listados em bolsa (ano da abertura de capital) */
  lbl: Record<string, number>;
  /** ações em circulação por selo (escolhidas na abertura de capital: preço inicial na casa de 40 dólares) */
  lsh: Record<string, number>;
  /** valor (ajustado pelo prestígio) do selo na abertura de capital: referência do preço */
  lref: Record<string, number>;
  evDone: string[];
  macroY: number;
  init: boolean;
  realized: number;
  flags: string[];
}

declare module '../ext4' { interface Ext4 { bolsa10: BolsaState } }
const fresh = (): BolsaState => ({ q: {}, pos: {}, news: [], lbl: {}, lsh: {}, lref: {}, evDone: [], macroY: 0, init: false, realized: 0, flags: [] });
registerExt4('bolsa10', fresh);
export const bolsa = (s: GameState): BolsaState => {
  const x = s.x4 as unknown as { bolsa10?: BolsaState };
  x.bolsa10 ??= fresh();
  return x.bolsa10;
};

/** Ações em circulação de um selo listado. */
export const sharesOf = (s: GameState, id: string): number => bolsa(s).lsh[id.replace(/^lb:/, '')] ?? 100_000;
const nice = (n: number): number => { const f = Math.pow(10, Math.floor(Math.log10(Math.max(1, n)))); const m = n / f; return Math.max(1000, f * (m >= 5 ? 5 : m >= 2 ? 2 : 1)); };
/** Teto de participação pessoal numa ação de selo (fração das ações). */
export const MAX_STAKE = 0.2;
const FEE = 0.005;
const DRIFT = 0.04;
export const INSIGHT_AT = 0.05;
export const CONFLICT_AT = 0.1;

// ---------------------------------------------------------------- nomes e universo

export interface Row {
  id: string;
  name: string;
  kind: Kind;
  blurb: L;
  tags: Tag[];
  div: number;
  q: Quote;
  pe: number;
}

const PE0: Record<Kind, number> = { label: 16, hardware: 14, media: 15, streaming: 30, video: 24 };

function nvDef(s: GameState, labelId: string): (Def & { name: string }) | null {
  const n = ventures(s).npc.find((x) => x.kind === 'platform' && x.labelId === labelId);
  if (!n) return null;
  return { id: `nv:${labelId}`, name: n.name, real: n.name, fake: n.name, kind: 'streaming', tags: ['stream', 'tech'], from: n.y, p0: Math.round(12 * (0.6 + n.rep / 80)), beta: 1.3, div: 0, blurb: l('Plataforma de streaming de um selo rival.', 'A streaming platform run by a rival label.') };
}

export function stockName(s: GameState, id: string): string {
  if (id.startsWith('lb:')) return s.labels[id.slice(3)]?.name ?? id;
  if (id.startsWith('nv:')) return nvDef(s, id.slice(3))?.name ?? (bolsa(s).flags.find((f) => f.startsWith(`nvn:${id}:`))?.slice(`nvn:${id}:`.length) ?? id);
  const d = DEF_BY_ID[id];
  return d ? (s.config.realNames ? d.real : d.fake) : id;
}

function defAlive(s: GameState, d: Def): boolean {
  const f = typeof d.from === 'function' ? d.from(s) : d.from;
  return s.year >= f && (d.to === undefined || s.year <= d.to);
}

const isLbl = (id: string) => id.startsWith('lb:');

// ---------------------------------------------------------------- macro

/** Variação anual da bolsa por crises históricas (com retomada no ano seguinte). */
function macroOf(y: number): number {
  const c = crashOf(y);
  const rb = c === 0 && crashOf(y - 1) < 0 ? -crashOf(y - 1) * 0.45 : 0;
  return c + rb;
}
const techExtra = (y: number, tags: Tag[]): number => (y >= 2000 && y <= 2002 && (tags.includes('tech') || tags.includes('stream')) ? -0.4 : y === 2003 && tags.includes('tech') ? 0.3 : 0);
const yearGrowth = (d: { beta: number; tags: Tag[] }, y: number): number => DRIFT + d.beta * macroOf(y) + techExtra(y, d.tags);

function evPct(s: GameState, tags: Tag[], y: number, only?: Set<string>): { pct: number; why: Ev[] } {
  let lp = 0;
  const why: Ev[] = [];
  for (const e of EVENTS) {
    if (evYear(s, e) !== y || !tags.includes(e.tag) || (only && !only.has(e.id))) continue;
    lp += Math.log(1 + e.pct / 100);
    why.push(e);
  }
  return { pct: lp, why };
}

// ---------------------------------------------------------------- cotações

const pushHist = (q: Quote) => { q.hist.push(q.p); if (q.hist.length > 60) q.hist.shift(); };
const pctTxt = (x: number) => `${Math.abs(Math.round(x * 100))}%`;

function news(s: GameState, t: L, tone: NewsItem['tone'] = 'info', id?: string, important = false): void {
  const st = bolsa(s);
  st.news.unshift({ y: s.year, m: s.month, t, tone, id });
  if (st.news.length > 40) st.news.length = 40;
  if (important) remember(s, 'bolsa10', t, { important: true });
}

function newQuote(s: GameState, p: number): Quote {
  return { p: Math.max(100, Math.round(p)), lv: 0, x: 0, hist: [Math.max(100, Math.round(p))], born: s.year, evY: s.year - 1, chg: 0, base: Math.max(100, Math.round(p)) };
}

function ensureStatic(s: GameState, d: Def): Quote {
  const st = bolsa(s);
  const hit = st.q[d.id];
  if (hit) return hit;
  const from = typeof d.from === 'function' ? d.from(s) : d.from;
  const q = newQuote(s, px(s, d.p0));
  // história desde o primeiro pregão até o ano passado
  let lv = 0;
  for (let y = from; y < s.year; y++) lv += yearGrowth(d, y) + evPct(s, d.tags, y).pct;
  q.lv = clamp(lv, -3, 3);
  q.x = 0;
  q.born = from;
  q.p = Math.max(100, Math.round(px(s, d.p0) * Math.exp(q.lv)));
  q.base = q.p;
  q.hist = [q.p];
  q.evY = s.year === from ? s.year : s.year - 1;
  st.q[d.id] = q;
  return q;
}

function stepStatic(s: GameState, d: Def, q: Quote, r: Rng, extra = 0): void {
  const y = s.year;
  const prev = q.p;
  q.lv += yearGrowth(d, y) / 12 + extra;
  let note: L | undefined;
  if (q.evY < y) {
    const ev = evPct(s, d.tags, y);
    if (ev.pct) {
      q.lv += ev.pct;
      const e = ev.why.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0];
      const pc = Math.round((Math.exp(ev.pct) - 1) * 100);
      note = fmtL(pc >= 0 ? l('subiu {p}%: {w}', 'rose {p}%: {w}') : l('caiu {p}%: {w}', 'fell {p}%: {w}'), { p: Math.abs(pc), w: l(e.pt, e.en) });
    }
    q.evY = y;
  }
  q.lv = clamp(q.lv, -3, 3);
  q.x = q.x * 0.88 + r.normal(0, d.kind === 'streaming' ? 0.06 : d.kind === 'hardware' ? 0.04 : 0.045);
  q.x = clamp(q.x, -0.8, 0.8);
  q.p = Math.max(100, Math.round(px(s, d.p0) * Math.exp(q.lv + q.x)));
  q.chg = q.p / prev - 1;
  if (!note && Math.abs(q.chg) >= 0.05) {
    const c = crashOf(y);
    note = c < -0.1 && q.chg < 0 ? l('a crise financeira derrubou a bolsa', 'the financial crisis hit the market') : macroOf(y) > 0.05 && q.chg > 0 ? l('a bolsa se recupera após a crise', 'the market recovers after the crisis') : q.chg > 0 ? l('compras de investidores empurram o preço', 'investor buying pushes the price up') : l('realização de lucros e nervosismo no setor', 'profit-taking and sector jitters');
  }
  q.note = note ?? q.note;
  pushHist(q);
}

// ---------------------------------------------------------------- selos rivais

const revenueOf = (lb: Label): number => Math.max(lb.revenueLastYear, lb.revenueYear);

/** Valor do selo (mesmo cálculo das participações) ajustado pelo prestígio e momento. */
function labelWorth(s: GameState, lb: Label): number {
  const v = labelValue(s, lb).value;
  const st = standingOf(s, lb.id);
  return v * clamp(0.78 + (st.mom - 50) / 220 + (st.rec - 50) / 420, 0.5, 1.3);
}

/** Preço-alvo: parte do preço de abertura e acompanha o valor do selo com elasticidade 0,6 (o mercado desconta o crescimento acumulado). */
function labelTarget(s: GameState, lb: Label, q?: Quote): number {
  const w = labelWorth(s, lb);
  const ref = bolsa(s).lref[lb.id];
  if (!q || !ref) return Math.max(100, w / sharesOf(s, lb.id));
  return Math.max(100, q.base * Math.pow(Math.max(0.05, w / ref), 0.6));
}

function chartTop(s: GameState, id: string): number {
  let n = 0;
  for (const e of [...s.charts.singles, ...s.charts.albums]) if (e.pos <= 10 && s.releases[e.releaseId]?.owner === id) n += 1;
  return n;
}

function listLabels(s: GameState): void {
  const st = bolsa(s);
  const first = !st.init;
  const cand = Object.values(s.labels).filter((x) => x.active && s.year - x.founded >= 3 && revenueOf(x) >= money(s, 150_000)).sort((a, b) => revenueOf(b) - revenueOf(a)).slice(0, 4);
  for (const lb of cand) {
    const id = `lb:${lb.id}`;
    if (st.lbl[lb.id] !== undefined || st.q[id]?.dead) continue;
    if (Object.keys(st.lbl).filter((k) => s.labels[k]?.active).length >= 6) break;
    st.lbl[lb.id] = first ? s.year - 3 : s.year;
    st.lsh[lb.id] = nice(labelValue(s, lb).value / 4000);
    st.lref[lb.id] = labelWorth(s, lb);
    const q = newQuote(s, labelTarget(s, lb));
    q.ceo = lb.ceo;
    q.hits = chartTop(s, lb.id);
    q.sc = sumScandals(s, lb);
    q.ros = lb.roster.length;
    q.born = st.lbl[lb.id];
    st.q[id] = q;
    if (!first) news(s, fmtL(l('{n} abre capital na bolsa: preço inicial {p}.', '{n} goes public: opening price {p}.'), { n: lb.name, p: priceTxt(q.p) }), 'info', id);
  }
}

const priceTxt = (cents: number): string => `$${(cents / 100).toFixed(2)}`;
const sumScandals = (s: GameState, lb: Label): number => lb.roster.reduce((t, id) => t + (s.acts[id]?.scandals ?? 0), 0);

function stepLabel(s: GameState, lb: Label, q: Quote, r: Rng): void {
  const y = s.year;
  const prev = q.p;
  const notes: { w: number; t: L }[] = [];
  // 1) o valor real do selo puxa o preço
  const target = labelTarget(s, lb, q);
  q.p = q.p + (target - q.p) * 0.3;
  // 2) setor: crises e viradas de formato (metade do efeito, o resto já está nos números do selo)
  q.p *= Math.exp(DRIFT / 12 * 0.2 + (macroOf(y) * 0.8) / 12);
  if (q.evY < y) {
    const ev = evPct(s, ['label'], y);
    if (ev.pct) {
      q.p *= Math.exp(ev.pct * 0.5);
      const e = ev.why.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0];
      notes.push({ w: Math.abs(ev.pct) * 0.5, t: l(e.pt, e.en) });
    }
    q.evY = y;
  }
  // 3) fatos do selo neste mês
  const hits = chartTop(s, lb.id);
  const dh = hits - (q.hits ?? hits);
  if (dh > 0) { const k = Math.min(0.08, dh * 0.025); q.p *= 1 + k; notes.push({ w: k, t: fmtL(l('{n} emplacou no top 10', '{n} chart entries in the top 10'), { n: dh }) }); }
  q.hits = hits;
  const sc = sumScandals(s, lb);
  if (q.sc !== undefined && sc > q.sc) { const k = Math.min(0.15, (sc - q.sc) * 0.06); q.p *= 1 - k; notes.push({ w: k, t: l('escândalo envolvendo artistas do selo', 'scandal involving the label\'s artists') }); }
  q.sc = sc;
  const ros = lb.roster.length;
  if (q.ros !== undefined && ros - q.ros <= -2) { q.p *= 0.96; notes.push({ w: 0.04, t: l('debandada de artistas', 'artists leaving in droves') }); }
  else if (q.ros !== undefined && ros - q.ros >= 2) { q.p *= 1.03; notes.push({ w: 0.03, t: l('novas contratações animam o mercado', 'new signings cheer the market') }); }
  q.ros = ros;
  if (q.ceo !== undefined && lb.ceo && lb.ceo !== q.ceo) {
    const st = standingOf(s, lb.id);
    const k = st.mom >= 50 ? 0.03 : -0.03;
    q.p *= 1 + k;
    notes.push({ w: 0.03, t: fmtL(l('troca de comando: {c} assume', 'leadership change: {c} takes over'), { c: lb.ceo }) });
  }
  if (lb.ceo) q.ceo = lb.ceo;
  q.p *= Math.exp(r.normal(0, 0.03));
  q.p = Math.max(100, Math.round(q.p));
  q.chg = q.p / prev - 1;
  const top = notes.sort((a, b) => b.w - a.w)[0];
  if (top && Math.abs(q.chg) >= 0.03) q.note = fmtL(q.chg >= 0 ? l('subiu {p}: {w}', 'rose {p}: {w}') : l('caiu {p}: {w}', 'fell {p}: {w}'), { p: pctTxt(q.chg), w: top.t });
  else if (Math.abs(q.chg) >= 0.05) q.note = q.chg > 0 ? l('o mercado reavalia o selo para cima', 'the market marks the label up') : l('o mercado reavalia o selo para baixo', 'the market marks the label down');
  pushHist(q);
}

// ---------------------------------------------------------------- fim de empresa

function settle(s: GameState, id: string, q: Quote, kind: Fate, text: L, factor: number): void {
  const st = bolsa(s);
  q.dead = { y: s.year, kind, text };
  q.p = Math.max(1, Math.round(q.p * factor));
  q.chg = factor - 1;
  pushHist(q);
  const pos = st.pos[id];
  if (pos && pos.sh > 0) {
    const pay = Math.round(pos.sh * q.p);
    ownerOf(s).wealth += pay;
    st.realized += pay - pos.cost;
    delete st.pos[id];
    notify(s, fmtL(l('{t} Suas ações valiam {v}.', '{t} Your shares paid out {v}.'), { t: text, v: priceTxt(pay) }), kind === 'acquired' ? 'good' : 'bad');
  }
  news(s, text, kind === 'acquired' ? 'good' : 'bad', id, true);
}

// ---------------------------------------------------------------- mês

function bolsaMonth(s: GameState): void {
  const st = bolsa(s);
  const r = Rng.fromSeed(`${s.config.seed}:bolsa10:${s.year}:${s.month}`);
  const first = !st.init;

  // crise do ano
  if (st.macroY !== s.year) {
    st.macroY = s.year;
    const c = crashOf(s.year);
    if (c <= -0.15 && !first) news(s, fmtL(l('Quebra na bolsa em {y}: as ações caem em todo o mundo.', 'Stock market crash in {y}: shares fall everywhere.'), { y: s.year }), 'bad', undefined, true);
  }

  // empresas fixas
  for (const d of DEFS) {
    const alive = defAlive(s, d);
    const q0 = st.q[d.id];
    if (q0?.dead) continue;
    if (!alive) {
      if (q0 && d.to !== undefined && s.year > d.to) {
        const txt = d.fate === 'bankrupt'
          ? fmtL(l('{n} quebra: as ações viram pó.', '{n} goes bust: the shares are worthless.'), { n: stockName(s, d.id) })
          : fmtL(l('{n} é comprada por {b}: acionistas recebem ágio de 25%.', '{n} is bought by {b}: shareholders get a 25% premium.'), { n: stockName(s, d.id), b: d.by ?? '—' });
        settle(s, d.id, q0, d.fate ?? 'acquired', txt, d.fate === 'bankrupt' ? 0.02 : 1.25);
      }
      continue;
    }
    const isNew = !q0;
    const q = ensureStatic(s, d);
    if (isNew && !first && s.year === q.born) news(s, fmtL(l('{n} estreia na bolsa por {p}.', '{n} debuts on the exchange at {p}.'), { n: stockName(s, d.id), p: priceTxt(q.p) }), 'info', d.id, true);
    if (!isNew || q.evY < s.year) stepStatic(s, d, q, r);
    pushDivs(s, d.id, d.div, q);
  }

  // selos rivais
  if (first || s.month === 0 || s.month === 6) listLabels(s);
  for (const k of Object.keys(st.lbl)) {
    const id = `lb:${k}`;
    const q = st.q[id];
    const lb = s.labels[k];
    if (!q || q.dead) continue;
    if (!lb || !lb.active) {
      const name = lb?.name ?? k;
      if (lb?.parentLabel && s.labels[lb.parentLabel]) settle(s, id, q, 'acquired', fmtL(l('{n} é absorvida por {b}: acionistas recebem ágio de 25%.', '{n} is absorbed by {b}: shareholders get a 25% premium.'), { n: name, b: s.labels[lb.parentLabel].name }), 1.25);
      else settle(s, id, q, 'bankrupt', fmtL(l('{n} fecha as portas: a ação vai a quase zero.', '{n} shuts down: the shares go to almost nothing.'), { n: name }), 0.02);
      continue;
    }
    stepLabel(s, lb, q, r);
    if (lb.cash > 0 && revenueOf(lb) > 0) pushDivs(s, id, 0.02, q);
    afterLabelMonth(s, k, r);
  }

  // plataformas de streaming de selos rivais
  if (s.year >= T(s, 'streaming')) {
    for (const n of ventures(s).npc) {
      if (n.kind !== 'platform') continue;
      const d = nvDef(s, n.labelId);
      if (!d) continue;
      const id = d.id;
      if (st.q[id]?.dead) continue;
      const isNew = !st.q[id];
      const q = ensureNv(s, d);
      if (isNew && !first) news(s, fmtL(l('{n} (plataforma de {l}) entra na bolsa por {p}.', '{n} ({l}\'s platform) lists at {p}.'), { n: d.name, l: s.labels[n.labelId]?.name ?? '—', p: priceTxt(q.p) }), 'info', id);
      if (!isNew) stepStatic(s, d, q, r, (n.rep - 50) / 50 * 0.004);
    }
  }
  for (const id of Object.keys(st.q)) {
    if (!id.startsWith('nv:') || st.q[id].dead) continue;
    const lbId = id.slice(3);
    if (!nvDef(s, lbId)) settle(s, id, st.q[id], 'bankrupt', fmtL(l('A plataforma {n} sai do ar: a ação despenca.', 'The platform {n} goes offline: the shares collapse.'), { n: stockName(s, id) }), 0.05);
  }

  // movimentos grandes nas ações que você tem
  for (const id of Object.keys(st.pos)) {
    const q = st.q[id];
    if (q && !q.dead && Math.abs(q.chg) >= 0.12 && q.note) notify(s, fmtL(l('{n}: {t}', '{n}: {t}'), { n: stockName(s, id), t: q.note }), q.chg > 0 ? 'good' : 'bad');
  }
  // manchetes dos setores
  if (!first) for (const e of EVENTS) if (evYear(s, e) === s.year && !st.evDone.includes(e.id)) {
    st.evDone.push(e.id);
    news(s, fmtL(e.pct >= 0 ? l('Bolsa: {w} (setor +{p}%).', 'Markets: {w} (sector +{p}%).') : l('Bolsa: {w} (setor −{p}%).', 'Markets: {w} (sector −{p}%).'), { w: l(e.pt, e.en), p: Math.abs(e.pct) }), e.pct >= 0 ? 'good' : 'bad', undefined, Math.abs(e.pct) >= 25);
  }
  if (first) for (const e of EVENTS) if (evYear(s, e) <= s.year) st.evDone.push(e.id);
  st.init = true;
}

function ensureNv(s: GameState, d: Def & { name: string }): Quote {
  const st = bolsa(s);
  if (st.q[d.id]) return st.q[d.id];
  const q = newQuote(s, px(s, d.p0));
  q.evY = s.year;
  st.q[d.id] = q;
  st.flags = st.flags.filter((f) => !f.startsWith(`nvn:${d.id}:`));
  st.flags.push(`nvn:${d.id}:${d.name}`);
  return q;
}

/** Dividendo mensal ao dono das ações. */
function pushDivs(s: GameState, id: string, yieldYear: number, q: Quote): void {
  const pos = bolsa(s).pos[id];
  if (!pos || !yieldYear) return;
  const d = Math.round(pos.sh * q.p * (yieldYear / 12));
  if (d <= 0) return;
  ownerOf(s).wealth += d;
  pos.divs += d;
}

/** Consequências de ser acionista relevante de um selo rival (informação, atrito). */
function afterLabelMonth(s: GameState, k: string, r: Rng): void {
  const pos = bolsa(s).pos[`lb:${k}`];
  if (!pos) return;
  const f = pos.sh / sharesOf(s, k);
  if (f >= CONFLICT_AT && r.chance(0.06)) {
    s.rivalries[k] = (s.rivalries[k] ?? 0) + 3;
    news(s, fmtL(l('A diretoria de {n} vê com desconfiança o seu bloco de ações.', 'The board of {n} eyes your block of shares with suspicion.'), { n: s.labels[k].name }), 'info', `lb:${k}`);
  }
}

registerSimHook('month', 'bolsa10', (s) => bolsaMonth(s));

// ---------------------------------------------------------------- consulta

export function listed(s: GameState): Row[] {
  const st = bolsa(s);
  const out: Row[] = [];
  for (const id of Object.keys(st.q)) {
    const q = st.q[id];
    if (q.dead) continue;
    let kind: Kind; let tags: Tag[]; let div = 0; let blurb: L;
    if (isLbl(id)) {
      const lb = s.labels[id.slice(3)];
      if (!lb) continue;
      kind = 'label'; tags = ['label']; div = lb.cash > 0 ? 0.02 : 0;
      blurb = fmtL(l('Selo rival ({c}): preço segue receita, catálogo, elenco e prestígio.', 'Rival label ({c}): price follows revenue, catalogue, roster and standing.'), { c: lb.city });
    } else if (id.startsWith('nv:')) {
      const d = nvDef(s, id.slice(3));
      if (!d) continue;
      kind = d.kind; tags = d.tags; blurb = d.blurb;
    } else {
      const d = DEF_BY_ID[id];
      if (!d || !defAlive(s, d)) continue;
      kind = d.kind; tags = d.tags; div = d.div; blurb = d.blurb;
    }
    const pe = isLbl(id)
      ? clamp((q.p * sharesOf(s, id)) / Math.max(money(s, 1000), revenueOf(s.labels[id.slice(3)]) * 0.14), 3, 80)
      : clamp(PE0[kind] * Math.exp(q.x + 0.4 * q.lv), 3, 90);
    out.push({ id, name: stockName(s, id), kind, blurb, tags, div, q, pe });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export const change12 = (q: Quote): number => q.hist.length > 1 ? q.p / Math.max(1, q.hist[Math.max(0, q.hist.length - 13)]) - 1 : 0;

/** Empresas que ainda não existem não aparecem; as grandes que nunca abrem capital aparecem como nota. */
export function unlistedNotes(s: GameState): typeof UNLISTED {
  return UNLISTED.filter((u) => s.year >= u.from && (!u.tech || s.year >= T(s, u.tech)));
}

export interface Holding { id: string; name: string; sh: number; cost: number; value: number; pl: number; divs: number; frac?: number; q: Quote }
export function holdingsOf(s: GameState): Holding[] {
  const st = bolsa(s);
  return Object.keys(st.pos).map((id): Holding | null => {
    const p = st.pos[id];
    const q = st.q[id];
    if (!q) return null;
    return { id, name: stockName(s, id), sh: p.sh, cost: p.cost, value: Math.round(p.sh * q.p), pl: Math.round(p.sh * q.p - p.cost + p.divs), divs: p.divs, frac: isLbl(id) ? p.sh / sharesOf(s, id) : undefined, q };
  }).filter((x): x is Holding => !!x);
}
export const stocksValue = (s: GameState): number => holdingsOf(s).reduce((t, x) => t + x.value, 0);

/** Informação de dentro: com 5% de um selo rival você vê os números dele. */
export function insight(s: GameState, id: string): { revenue: number; cash: number; roster: number; ceo?: string; standing: number } | null {
  if (!isLbl(id)) return null;
  const pos = bolsa(s).pos[id];
  const lb = s.labels[id.slice(3)];
  if (!pos || !lb || pos.sh / sharesOf(s, id) < INSIGHT_AT) return null;
  return { revenue: revenueOf(lb), cash: lb.cash, roster: lb.roster.length, ceo: lb.ceo, standing: Math.round(standingOf(s, lb.id).mom) };
}

/** O próprio selo, se abriu capital (gerido em "Capital e sócios"). */
export function ownListing(s: GameState): { name: string; price: number; hist: number[] } | null {
  return s.listing.listed ? { name: s.config.companyName, price: s.listing.price, hist: s.listing.history.slice(-60) } : null;
}

// ---------------------------------------------------------------- negociar

function unit(s: GameState, id: string, side: 'buy' | 'sell', n: number): number {
  const q = bolsa(s).q[id];
  const slip = isLbl(id) ? 0.5 * (n / sharesOf(s, id)) : 0;
  return q.p * (side === 'buy' ? 1 + slip + FEE : 1 - slip - FEE);
}

/** Compra `sh` ações com o patrimônio pessoal. */
export function buyShares(s: GameState, id: string, sh: number): L | null {
  const st = bolsa(s);
  const q = st.q[id];
  if (!q || q.dead || !listed(s).some((x) => x.id === id)) return l('Esta ação não está à venda.', 'This share is not for sale.');
  sh = Math.floor(sh);
  if (sh < 1) return l('Quantidade inválida.', 'Invalid quantity.');
  const have = st.pos[id]?.sh ?? 0;
  if (isLbl(id) && have + sh > sharesOf(s, id) * MAX_STAKE) return fmtL(l('Você não pode passar de {p}% das ações de um selo (o resto é do fundador e do mercado).', 'You cannot hold more than {p}% of a label (the rest belongs to the founder and the float).'), { p: Math.round(MAX_STAKE * 100) });
  const cost = Math.round(sh * unit(s, id, 'buy', sh));
  const o = ownerOf(s);
  if (o.wealth < cost) return l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.');
  o.wealth -= cost;
  const pos = (st.pos[id] ??= { sh: 0, cost: 0, since: s.year, divs: 0 });
  pos.sh += sh;
  pos.cost += cost;
  if (isLbl(id)) crossing(s, id, have / sharesOf(s, id), pos.sh / sharesOf(s, id));
  return null;
}

/** Compra o máximo de ações possível com `cents`. */
export function buyValue(s: GameState, id: string, cents: number): L | null {
  const q = bolsa(s).q[id];
  if (!q) return l('Esta ação não está à venda.', 'This share is not for sale.');
  let sh = Math.floor(cents / (q.p * (1 + FEE)));
  while (sh > 1 && Math.round(sh * unit(s, id, 'buy', sh)) > cents) sh -= 1;
  return buyShares(s, id, sh);
}

export function sellShares(s: GameState, id: string, frac = 1): L | null {
  const st = bolsa(s);
  const pos = st.pos[id];
  const q = st.q[id];
  if (!pos || !q) return l('Você não tem estas ações.', 'You do not own these shares.');
  const sh = Math.max(1, Math.round(pos.sh * clamp(frac, 0, 1)));
  const gross = Math.round(sh * unit(s, id, 'sell', sh));
  const basis = Math.round(pos.cost * (sh / pos.sh));
  ownerOf(s).wealth += gross;
  st.realized += gross - basis;
  const before = pos.sh;
  pos.sh -= sh;
  pos.cost -= basis;
  if (pos.sh <= 0) delete st.pos[id];
  if (isLbl(id)) crossing(s, id, before / sharesOf(s, id), (before - sh) / sharesOf(s, id));
  return null;
}

/** Cruzar 5% e 10% de um selo: o selo e a imprensa notam. */
function crossing(s: GameState, id: string, from: number, to: number): void {
  const lb = s.labels[id.slice(3)];
  if (!lb) return;
  if (from < INSIGHT_AT && to >= INSIGHT_AT) news(s, fmtL(l('Você passa de 5% das ações de {n}: o selo passa a lhe mostrar os números do conselho.', 'You pass 5% of {n}: the label starts showing you the board numbers.'), { n: lb.name }), 'good', id, true);
  if (from < CONFLICT_AT && to >= CONFLICT_AT) {
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 1, 0, 100);
    s.rivalries[lb.id] = (s.rivalries[lb.id] ?? 0) + 5;
    news(s, fmtL(l('A imprensa pergunta se {c} tem conflito de interesses: acionista de peso de {n}.', 'The press asks whether {c} has a conflict of interest: a major shareholder of {n}.'), { c: s.config.companyName, n: lb.name }), 'info', id, true);
  }
}
