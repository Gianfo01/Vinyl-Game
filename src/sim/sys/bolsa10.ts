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
import { fmtL, money, notify, post, remember } from '../util';
import { capital, ownerShare } from './capital';
import { crashOf } from './goods8';
import { leaders } from './leaders10';
import { ownerOf } from './people/owner';
import { standingOf } from './standing9';
import { BOARD_SEAT, CONTROL, holdings as stakeHoldings, labelValue, npcAbsorb, stakeOf } from './stakes8';
import { ventures } from './ventures9';
import { withCatalogSums } from '../business';

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
  /** só existe depois desta tecnologia (na data da própria partida) */
  tech?: string;
  /** descrição que só vale depois de uma tecnologia (não antecipa o futuro) */
  later?: { tech: string; blurb: L };
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
  D({ id: 'victor', real: 'Victor Talking Machine', fake: 'Fonógrafos Vitória', kind: 'label', tags: ['label', 'vinyl', 'hifi'], from: 1920, to: 1928, fate: 'acquired', by: 'RCA', p0: 20, beta: 1, div: 0.04, blurb: l('Vitrolas e discos de 78 rotações: o selo do cachorrinho no gramofone.', 'Talking machines and 78s: the dog-and-gramophone label.') }),
  D({ id: 'columbia', real: 'Columbia Graphophone', fake: 'Grafofone Colúmbia', kind: 'label', tags: ['label', 'vinyl'], from: 1920, to: 1930, fate: 'acquired', by: 'EMI', p0: 16, beta: 1.1, div: 0.03, blurb: l('Discos e grafofones dos dois lados do Atlântico.', 'Records and graphophones on both sides of the Atlantic.') }),
  D({ id: 'emi', real: 'EMI', fake: 'Elétrica Musical Insular', kind: 'label', tags: ['label', 'vinyl', 'hifi', 'cd'], from: 1931, to: 2011, fate: 'acquired', by: 'Universal', p0: 22, beta: 1, div: 0.03, blurb: l('Fusão de gravadoras britânicas: estúdios, fábricas e um catálogo imenso.', 'A merger of British labels: studios, plants and a huge catalogue.') }),
  D({ id: 'decca', real: 'Decca Records', fake: 'Linha Alva Discos', kind: 'label', tags: ['label', 'vinyl'], from: 1929, to: 1979, fate: 'acquired', by: 'PolyGram', p0: 25, beta: 0.9, div: 0.04, blurb: l('Gravadora britânica clássica: pop, clássicos e o catálogo do rock.', 'Classic British label: pop, classical and a rock catalogue.') }),
  D({ id: 'rca', real: 'RCA', fake: 'Radiotron Americana', kind: 'hardware', tags: ['label', 'radio', 'tv', 'vinyl', 'hifi'], from: 1920, to: 1985, fate: 'acquired', by: 'General Electric', p0: 30, beta: 1, div: 0.035, blurb: l('Rádios, TVs, discos e a NBC no mesmo guarda-chuva.', 'Radios, TVs, records and a network under one roof.') }),
  D({ id: 'cbs', real: 'CBS', fake: 'Rede Colúmbia de Rádio', kind: 'media', tags: ['media', 'radio', 'tv', 'label'], from: 1929, to: 2018, fate: 'acquired', by: 'Viacom', p0: 30, beta: 0.9, div: 0.03, blurb: l('Rede de rádio e TV com selo próprio.', 'A radio and TV network with a label of its own.') }),
  D({ id: 'warnercomm', real: 'Warner Communications', fake: 'Comunicações Costa Oeste', kind: 'label', tags: ['label', 'media', 'tv'], from: 1969, to: 1989, fate: 'acquired', by: 'Time Warner', p0: 20, beta: 1.1, div: 0.01, blurb: l('Estúdios, discos e videogames: a mídia dos anos 70-80.', 'Studios, records and video games: 70s-80s media.') }),
  D({ id: 'timewarner', real: 'Time Warner', fake: 'Tempo & Estúdios Holding', kind: 'media', tags: ['label', 'media', 'tv', 'video'], from: 1990, to: 2017, fate: 'acquired', by: 'AT&T', p0: 40, beta: 1, div: 0.02, blurb: l('Revistas, cabo, cinema e música sob o mesmo teto.', 'Magazines, cable, film and music under one roof.') }),
  D({ id: 'polygram', real: 'PolyGram', fake: 'Polifonia Records NV', kind: 'label', tags: ['label', 'cd'], from: 1989, to: 1997, fate: 'acquired', by: 'Universal', p0: 22, beta: 1.1, div: 0.02, blurb: l('Gigante europeu do CD e da música clássica.', 'European giant of CDs and classical music.') }),
  D({ id: 'vivendi', real: 'Vivendi (Universal)', fake: 'Vivenda Mídia', kind: 'media', tags: ['label', 'media', 'tv', 'stream'], from: 1998, p0: 28, beta: 1.1, div: 0.03, blurb: l('Conglomerado francês de mídia dono do maior selo do mundo.', 'French media conglomerate that owns the world\'s biggest label.') }),
  D({ id: 'wmg', real: 'Warner Music Group', fake: 'Selos Pacífico Music', kind: 'label', tags: ['label', 'stream'], from: 2005, p0: 20, beta: 1.2, div: 0.04, blurb: l('Selo grande listado em bolsa: catálogo, streaming e pirataria na conta.', 'A major label on the exchange: catalogue, streaming and piracy all on the books.') }),
  D({ id: 'umg', tech: 'streaming', real: 'Universal Music Group', fake: 'Universo Música S.A.', kind: 'label', tags: ['label', 'stream'], from: after('streaming', 12, 2021), p0: 24, beta: 1, div: 0.02, blurb: l('Maior selo do mundo, já separado do conglomerado.', 'The world\'s biggest label, now spun off.') }),
  // streaming e plataformas
  D({ id: 'spotify', tech: 'streaming', real: 'Spotify', fake: 'Fonógrafo Online', kind: 'streaming', tags: ['stream', 'tech'], from: after('streaming', 8, 2018), p0: 40, beta: 1.5, div: 0, blurb: l('Streaming de música: cresce rápido e vive de contrato com os selos.', 'Music streaming: grows fast and lives on label contracts.') }),
  D({ id: 'tencentmusic', tech: 'streaming', real: 'Tencent Music', fake: 'Música Oriente Digital', kind: 'streaming', tags: ['stream', 'tech'], from: after('streaming', 8, 2018), p0: 10, beta: 1.4, div: 0, blurb: l('O streaming de música da Ásia, ligado a jogos e redes.', 'Asia\'s music streaming, tied to games and social apps.') }),
  D({ id: 'pandora', tech: 'streaming', real: 'Pandora', fake: 'Rádio da Rede', kind: 'streaming', tags: ['stream', 'radio', 'tech'], from: after('streaming', 3, 2011), to: 2018, fate: 'acquired', by: 'Sirius XM', p0: 12, beta: 1.5, div: 0, blurb: l('Rádio pela internet; sofre com royalties.', 'Internet radio; suffers under royalty bills.') }),
  D({ id: 'deezer', tech: 'streaming', real: 'Deezer', fake: 'Eco Sonoro', kind: 'streaming', tags: ['stream', 'tech'], from: after('streaming', 14, 2022), p0: 3, beta: 1.6, div: 0, blurb: l('Streaming menor: sobe e desce com notícias de contrato.', 'A smaller streamer: swings with contract news.') }),
  D({ id: 'siriusxm', real: 'Sirius XM', fake: 'Satélite Rádio Plus', kind: 'streaming', tags: ['radio', 'media', 'stream'], from: 2008, p0: 4, beta: 1.2, div: 0.01, blurb: l('Rádio por assinatura via satélite.', 'Subscription satellite radio.') }),
  D({ id: 'alphabet', tech: 'internet', real: 'Alphabet (Google / YouTube)', fake: 'Buscaí (buscas e vídeos)', kind: 'video', tags: ['video', 'stream', 'tech'], from: after('internet', 9, 2004), p0: 30, beta: 1.2, div: 0, blurb: l('Buscas e vídeo: onde a maior parte do mundo ouve música grátis.', 'Search and video: where most of the world listens to music for free.') }),
  D({ id: 'apple', real: 'Apple (iTunes / Apple Music)', fake: 'Maçã Digital', kind: 'hardware', tags: ['tech', 'hifi', 'stream'], from: 1980, p0: 25, beta: 1.3, div: 0.005, blurb: l('Computadores pessoais para casa e escritório.', 'Personal computers for home and office.'), later: { tech: 'download', blurb: l('Computadores, tocadores portáteis e loja de música digital.', 'Computers, portable players and a digital music store.') } }),
  D({ id: 'netflix', tech: 'internet', real: 'Netflix', fake: 'Telão Play', kind: 'video', tags: ['video', 'stream', 'tech'], from: after('internet', 7, 2002), p0: 12, beta: 1.5, div: 0, blurb: l('Vídeo por assinatura: trilhas sonoras viram hits.', 'Subscription video: soundtracks turn into hits.') }),
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
  /** carteira do selo (caixa da empresa), no mesmo mercado da carteira pessoal */
  cpos: Record<string, Pos>;
  /** blocos de NPCs por ação (fração da empresa): F:fundo, L:selo rival, P:líder, A:artista */
  own: Record<string, Record<string, number>>;
  seq: number;
}
/** Conta que negocia: 'p' = você (patrimônio pessoal), 'c' = o selo (caixa da empresa). */
export type Acct = 'p' | 'c';
/** Ticker do próprio selo do jogador depois do IPO. */
export const OWN = 'own';

declare module '../ext4' { interface Ext4 { bolsa10: BolsaState } }
const fresh = (): BolsaState => ({ q: {}, pos: {}, news: [], lbl: {}, lsh: {}, lref: {}, evDone: [], macroY: 0, init: false, realized: 0, flags: [], cpos: {}, own: {}, seq: 0 });
registerExt4('bolsa10', fresh);
export const bolsa = (s: GameState): BolsaState => {
  const x = s.x4 as unknown as { bolsa10?: BolsaState };
  const b = (x.bolsa10 ??= fresh());
  b.cpos ??= {};
  b.own ??= {};
  b.seq ??= 0;
  return b;
};

/** Ações em circulação: selo listado (escolhidas no IPO), o seu selo (s.listing) ou empresa grande (50 milhões). */
export const sharesOf = (s: GameState, id: string): number => id === OWN ? s.listing.shares : bolsa(s).lsh[id.replace(/^lb:/, '')] ?? (id.startsWith('lb:') || s.labels[id] ? 100_000 : 50_000_000);
const posOf = (s: GameState, acct: Acct): Record<string, Pos> => (acct === 'c' ? bolsa(s).cpos : bolsa(s).pos);
/** Fração da empresa nas suas duas carteiras (pessoal + selo). */
export const playerFrac = (s: GameState, id: string): number => ((bolsa(s).pos[id]?.sh ?? 0) + (bolsa(s).cpos[id]?.sh ?? 0)) / sharesOf(s, id);
const npcTotal = (s: GameState, id: string): number => Object.values(bolsa(s).own[id] ?? {}).reduce((t, x) => t + x, 0);
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
  if (id === OWN) return s.config.companyName;
  if (id.startsWith('lb:')) return s.labels[id.slice(3)]?.name ?? id;
  if (id.startsWith('nv:')) return nvDef(s, id.slice(3))?.name ?? (bolsa(s).flags.find((f) => f.startsWith(`nvn:${id}:`))?.slice(`nvn:${id}:`.length) ?? id);
  const d = DEF_BY_ID[id];
  return d ? (s.config.realNames ? d.real : d.fake) : id;
}

function defAlive(s: GameState, d: Def): boolean {
  const f = typeof d.from === 'function' ? d.from(s) : d.from;
  return s.year >= f && (d.to === undefined || s.year <= d.to) && (!d.tech || s.year >= T(s, d.tech));
}
const blurbOf = (s: GameState, d: Def): L => (d.later && s.year >= T(s, d.later.tech) ? d.later.blurb : d.blurb);

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
  const from = Math.max(typeof d.from === 'function' ? d.from(s) : d.from, d.tech ? T(s, d.tech) : 0);
  const q = newQuote(s, px(s, d.p0));
  // história desde o primeiro pregão até o ano passado
  let lv = 0;
  const end: Record<number, number> = {};
  for (let y = from; y < s.year; y++) { lv = clamp(lv + yearGrowth(d, y) + evPct(s, d.tags, y).pct, -3, 3); end[y] = lv; }
  q.lv = lv;
  q.x = 0;
  q.born = from;
  q.p = Math.max(100, Math.round(px(s, d.p0) * Math.exp(q.lv)));
  q.base = q.p;
  q.hist = seedHist(s, `${d.id}`, (s.year - from) * 12 + s.month + (from <= 1920 ? 24 : 0), (k) => {
    const y = Math.floor(k / 12);
    const a = end[y - 1] ?? 0;
    return px(s, d.p0) * Math.exp(a + ((end[y] ?? lv) - a) * ((k % 12) + 1) / 12);
  }, d.kind === 'streaming' ? 0.06 : 0.045);
  q.hist.push(q.p);
  q.evY = s.year === from ? s.year : s.year - 1;
  st.q[d.id] = q;
  return q;
}

/** Histórico de preços anterior ao início (até 36 meses): tendência `at(mês absoluto)` com ruído próprio e semeado. */
function seedHist(s: GameState, key: string, months: number, at: (abs: number) => number, sd: number): number[] {
  const n = clamp(months, 0, 36);
  const r = Rng.fromSeed(`${s.config.seed}:bolsa10h:${key}`);
  const now = s.year * 12 + s.month;
  const out: number[] = [];
  let x = 0;
  for (let k = n; k >= 1; k--) {
    x = clamp(x * 0.88 + r.normal(0, sd), -0.6, 0.6);
    out.push(Math.max(100, Math.round(at(now - k) * Math.exp(x * Math.min(1, k / 3)))));
  }
  return out;
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

/** Abertura de capital de um selo rival: só selo que fez IPO aparece na bolsa. */
function ipoLabel(s: GameState, lb: Label, year: number, announce: boolean): void {
  const st = bolsa(s);
  const id = `lb:${lb.id}`;
  st.lbl[lb.id] = year;
  st.lsh[lb.id] = nice(labelValue(s, lb).value / 4000);
  st.lref[lb.id] = labelWorth(s, lb);
  const q = newQuote(s, labelTarget(s, lb));
  q.ceo = lb.ceo;
  q.hits = chartTop(s, lb.id);
  q.sc = sumScandals(s, lb);
  q.ros = lb.roster.length;
  q.born = year;
  if (year < s.year) {
    // pregões anteriores ao início da partida: passeio aleatório que termina no preço de hoje
    const n = clamp((s.year - year) * 12 + s.month, 0, 36);
    const r = Rng.fromSeed(`${s.config.seed}:bolsa10l:${lb.id}`);
    const back: number[] = [];
    let p = q.p;
    for (let k = 0; k < n; k++) back.push((p = Math.max(100, Math.round(p / Math.exp(r.normal(0.004, 0.04))))));
    q.hist = back.reverse().concat(q.p);
  }
  st.q[id] = q;
  if (announce) {
    const t = fmtL(l('{n} abre capital na bolsa: preço inicial {p}.', '{n} goes public: opening price {p}.'), { n: lb.name, p: priceTxt(q.p) });
    news(s, t, 'info', id, true);
    notify(s, t, 'info');
  }
}

const canIpo = (s: GameState, lb: Label): boolean => lb.active && !lb.parentLabel && bolsa(s).lbl[lb.id] === undefined && !bolsa(s).q[`lb:${lb.id}`]?.dead;

/** Na partida nova: os selos mais valiosos já negociam em bolsa (mais deles quanto mais moderno o mercado). */
function historicIpos(s: GameState): void {
  const n = s.year < 1930 ? 0 : s.year < 1955 ? 1 : s.year < 1980 ? 2 : 3;
  const cand = Object.values(s.labels).filter((x) => canIpo(s, x) && s.year - x.founded >= 3).sort((a, b) => labelValue(s, b).value - labelValue(s, a).value).slice(0, n);
  cand.forEach((lb, i) => ipoLabel(s, lb, Math.max(lb.founded + 3, s.year - 2 - i * 2), false));
}

/** A cada semestre um selo rival grande pode decidir abrir capital (notícia no pregão). */
function rivalIpos(s: GameState, r: Rng): void {
  const st = bolsa(s);
  if (s.year < 1930 || Object.keys(st.lbl).filter((k) => s.labels[k]?.active).length >= 8) return;
  const cand = Object.values(s.labels).filter((x) => canIpo(s, x) && s.year - x.founded >= 5 && revenueOf(x) >= money(s, 250_000));
  for (const lb of cand.sort((a, b) => revenueOf(b) - revenueOf(a))) {
    const p = 0.025 + (lb.archetype === 'empire' || lb.archetype === 'hitmaker' ? 0.03 : 0) + (lb.cash < money(s, 200_000) ? 0.025 : 0);
    if (r.chance(p)) { ipoLabel(s, lb, s.year, true); return; }
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
  for (const acct of ['p', 'c'] as Acct[]) {
    const pos = posOf(s, acct)[id];
    if (!pos || pos.sh <= 0) continue;
    const pay = Math.round(pos.sh * q.p);
    if (acct === 'c') coPost(s, `settle:${id}`, pay, `Ações de ${stockName(s, id)} liquidadas`);
    else { ownerOf(s).wealth += pay; st.realized += pay - pos.cost; }
    delete posOf(s, acct)[id];
    notify(s, fmtL(acct === 'c' ? l('{t} As ações do selo valiam {v}.', '{t} The label\'s shares paid out {v}.') : l('{t} Suas ações valiam {v}.', '{t} Your shares paid out {v}.'), { t: text, v: priceTxt(pay) }), kind === 'acquired' ? 'good' : 'bad');
  }
  delete st.own[id];
  news(s, text, kind === 'acquired' ? 'good' : 'bad', id, true);
}

/** Movimento de caixa do selo na bolsa: entra no livro-caixa (categoria "investments"), mas não conta como receita nem lucro operacional. */
function coPost(s: GameState, key: string, amount: number, memo: string): void {
  const st = bolsa(s);
  const y = s.year;
  const rv = s.player.revenueByYear[y];
  const pf = s.player.profitByYear[y];
  post(s, `bolsa10:${key}:${(st.seq += 1)}`, amount, 'investments', memo);
  if (rv === undefined) delete s.player.revenueByYear[y]; else s.player.revenueByYear[y] = rv;
  if (pf === undefined) delete s.player.profitByYear[y]; else s.player.profitByYear[y] = pf;
}

// ---------------------------------------------------------------- abertura: o pregão já existe no 1º dia

/** Semeia a bolsa na partida nova (qualquer ano): empresas da época com histórico, selos que já fizeram IPO e acionistas. */
export function seedMarket(s: GameState): void {
  const st = bolsa(s);
  if (st.init) return;
  for (const d of DEFS) if (defAlive(s, d)) ensureStatic(s, d);
  historicIpos(s);
  syncOwn(s);
  const r = Rng.fromSeed(`${s.config.seed}:bolsa10seed`);
  for (const id of Object.keys(st.q)) seedHolders(s, id, r);
  st.macroY = s.year;
  for (const e of EVENTS) if (evYear(s, e) <= s.year) st.evDone.push(e.id);
  st.init = true;
}

registerSimHook('newgame', 'bolsa10', (s) => seedMarket(s));

// ---------------------------------------------------------------- mês

function bolsaMonth(s: GameState): void {
  const st = bolsa(s);
  const r = Rng.fromSeed(`${s.config.seed}:bolsa10:${s.year}:${s.month}`);
  seedMarket(s);

  // crise do ano
  if (st.macroY !== s.year) {
    st.macroY = s.year;
    const c = crashOf(s.year);
    if (c <= -0.15) news(s, fmtL(l('Quebra na bolsa em {y}: as ações caem em todo o mundo.', 'Stock market crash in {y}: shares fall everywhere.'), { y: s.year }), 'bad', undefined, true);
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
    if (isNew && s.year === q.born) news(s, fmtL(l('{n} estreia na bolsa por {p}.', '{n} debuts on the exchange at {p}.'), { n: stockName(s, d.id), p: priceTxt(q.p) }), 'info', d.id, true);
    if (!isNew || q.evY < s.year) stepStatic(s, d, q, r);
    pushDivs(s, d.id, d.div, q);
    if (isNew) seedHolders(s, d.id, r);
  }

  // selos rivais
  if (s.month === 0 || s.month === 6) rivalIpos(s, r);
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
      if (isNew) news(s, fmtL(l('{n} (plataforma de {l}) entra na bolsa por {p}.', '{n} ({l}\'s platform) lists at {p}.'), { n: d.name, l: s.labels[n.labelId]?.name ?? '—', p: priceTxt(q.p) }), 'info', id);
      if (!isNew) stepStatic(s, d, q, r, (n.rep - 50) / 50 * 0.004);
    }
  }
  for (const id of Object.keys(st.q)) {
    if (!id.startsWith('nv:') || st.q[id].dead) continue;
    const lbId = id.slice(3);
    if (!nvDef(s, lbId)) settle(s, id, st.q[id], 'bankrupt', fmtL(l('A plataforma {n} sai do ar: a ação despenca.', 'The platform {n} goes offline: the shares collapse.'), { n: stockName(s, id) }), 0.05);
  }

  // movimentos grandes nas ações que você tem
  for (const id of new Set([...Object.keys(st.pos), ...Object.keys(st.cpos)])) {
    const q = st.q[id];
    if (q && !q.dead && Math.abs(q.chg) >= 0.12 && q.note) notify(s, fmtL(l('{n}: {t}', '{n}: {t}'), { n: stockName(s, id), t: q.note }), q.chg > 0 ? 'good' : 'bad');
  }
  // manchetes dos setores
  for (const e of EVENTS) if (evYear(s, e) === s.year && !st.evDone.includes(e.id)) {
    st.evDone.push(e.id);
    news(s, fmtL(e.pct >= 0 ? l('Bolsa: {w} (setor +{p}%).', 'Markets: {w} (sector +{p}%).') : l('Bolsa: {w} (setor −{p}%).', 'Markets: {w} (sector −{p}%).'), { w: l(e.pt, e.en), p: Math.abs(e.pct) }), e.pct >= 0 ? 'good' : 'bad', undefined, Math.abs(e.pct) >= 25);
  }
  syncOwn(s);
  npcTrade(s);
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

/** Dividendo mensal aos donos das ações (você no bolso, o selo no caixa). */
function pushDivs(s: GameState, id: string, yieldYear: number, q: Quote): void {
  if (!yieldYear) return;
  for (const acct of ['p', 'c'] as Acct[]) {
    const pos = posOf(s, acct)[id];
    if (!pos) continue;
    const d = Math.round(pos.sh * q.p * (yieldYear / 12));
    if (d <= 0) continue;
    if (acct === 'c') post(s, `div10:${id}:${s.month}`, d, 'dividends', `Dividendos de ${stockName(s, id)}`);
    else ownerOf(s).wealth += d;
    pos.divs += d;
  }
}

/** Consequências de ser acionista relevante de um selo rival (informação, atrito). */
function afterLabelMonth(s: GameState, k: string, r: Rng): void {
  const f = playerFrac(s, `lb:${k}`);
  if (!f) return;
  if (f >= CONFLICT_AT && r.chance(0.06)) {
    s.rivalries[k] = (s.rivalries[k] ?? 0) + 3;
    news(s, fmtL(l('A diretoria de {n} vê com desconfiança o seu bloco de ações.', 'The board of {n} eyes your block of shares with suspicion.'), { n: s.labels[k].name }), 'info', `lb:${k}`);
  }
}

registerSimHook('month', 'bolsa10', (s) => withCatalogSums(s, () => bolsaMonth(s)));

// ---------------------------------------------------------------- o seu selo na bolsa

/** Espelha o preço do seu selo (s.listing: lucro, crescimento, conselho) como a ação OWN do mesmo pregão. */
function syncOwn(s: GameState): void {
  const st = bolsa(s);
  if (!s.listing.listed) { delete st.q[OWN]; return; }
  const p = Math.max(1, Math.round(s.listing.price));
  let q = st.q[OWN];
  if (!q) {
    q = st.q[OWN] = newQuote(s, p);
    news(s, fmtL(l('{n} estreia na bolsa por {p}.', '{n} debuts on the exchange at {p}.'), { n: s.config.companyName, p: priceTxt(p) }), 'good', OWN);
  }
  const prev = q.p;
  q.p = p;
  q.chg = prev ? p / prev - 1 : 0;
  q.hist = s.listing.history.length ? s.listing.history.slice(-60) : [p];
}

/** Sua fatia de controle no seu selo: a parte do dono mais as ações em circulação que você comprou no pregão. */
export const controlShare = (s: GameState): number => ownerShare(s) + (s.listing.listed ? (bolsa(s).pos[OWN]?.sh ?? 0) / s.listing.shares : 0);

// ---------------------------------------------------------------- acionistas NPC (fundos, selos rivais, líderes, artistas)

const FUNDS: { n: L; from: number }[] = [
  { n: l('Banco Meridional', 'Meridional Bank'), from: 1900 },
  { n: l('Seguradora Atlântica', 'Atlantic Assurance'), from: 1900 },
  { n: l('Truste da família Holloway', 'Holloway family trust'), from: 1900 },
  { n: l('Fundo de pensão dos músicos', 'Musicians\' pension fund'), from: 1946 },
  { n: l('Fundo mútuo Horizonte', 'Horizon mutual fund'), from: 1950 },
  { n: l('Fundo soberano do Golfo', 'Gulf sovereign fund'), from: 1974 },
  { n: l('Fundo de índice Total', 'Total index fund'), from: 1976 },
  { n: l('Hedge fund Quasar', 'Quasar hedge fund'), from: 1985 },
  { n: l('Fundo ativista Corvo', 'Raven activist fund'), from: 1988 },
];

export function holderName(s: GameState, k: string): L {
  const id = k.slice(2);
  if (k.startsWith('F:')) return FUNDS[Number(id)]?.n ?? l('Fundo', 'Fund');
  if (k.startsWith('L:')) return l(s.labels[id]?.name ?? id);
  if (k.startsWith('P:')) {
    const p = leaders(s).L[id];
    const lb = p?.label ? s.labels[p.label] : undefined;
    return lb ? fmtL(l('{n} (chefe de {l})', '{n} (head of {l})'), { n: p.name, l: lb.name }) : l(p?.name ?? '—');
  }
  return fmtL(l('{n} (artista)', '{n} (artist)'), { n: s.acts[id]?.name ?? '—' });
}

const holderAlive = (s: GameState, k: string): boolean => {
  const id = k.slice(2);
  if (k.startsWith('L:')) return !!s.labels[id]?.active;
  if (k.startsWith('P:')) return !!leaders(s).L[id] && leaders(s).L[id].st !== 'dead';
  if (k.startsWith('A:')) return !!s.acts[id];
  return true;
};

/** Quanto ainda cabe nas mãos dos NPCs (o resto é do fundador, dos sócios privados e da sua carteira). */
function npcCap(s: GameState, id: string): number {
  if (id === OWN) return Math.max(0, s.listing.floatShare - playerFrac(s, id));
  if (isLbl(id)) return Math.max(0, 0.75 - playerFrac(s, id));
  return 0.45;
}

/** Peso de um selo rival como comprador: no seu selo pesam rivalidade, império e agressividade. */
function rivalWeight(s: GameState, lb: Label, id: string): number {
  if (id === OWN) return 0.4 + (s.rivalries[lb.id] ?? 0) / 25 + (lb.archetype === 'empire' ? 1.5 : 0) + lb.aggression / 100;
  const t = isLbl(id) ? s.labels[id.slice(3)] : undefined;
  return 0.6 + (t && t.focus.some((f) => lb.focus.includes(f)) ? 0.8 : 0) + (lb.archetype === 'empire' || lb.archetype === 'catalog' ? 0.8 : 0);
}

function seedHolders(s: GameState, id: string, r: Rng): void {
  const own = (bolsa(s).own[id] ??= {});
  const fs = FUNDS.map((f, i) => ({ f, i })).filter((x) => s.year >= x.f.from);
  for (let n = r.int(1, 3); n > 0; n--) { const f = r.pick(fs); own[`F:${f.i}`] = (own[`F:${f.i}`] ?? 0) + r.float(0.01, 0.06); }
  if (isLbl(id)) { const lid = s.labels[id.slice(3)]?.leaderId; if (lid && leaders(s).L[lid]) own[`P:${lid}`] = r.float(0.03, 0.12); }
}

/** Uma vez por mês: fundos, selos rivais, líderes e artistas famosos compram e vendem ações (Rng próprio). */
function npcTrade(s: GameState): void {
  const st = bolsa(s);
  const r = Rng.fromSeed(`${s.config.seed}:bolsa10npc:${s.year}:${s.month}`);
  const rich = Object.values(s.labels).filter((x) => x.active && x.cash > money(s, 1_000_000));
  const lds = Object.values(s.labels).filter((x) => x.active && x.leaderId && leaders(s).L[x.leaderId]).map((x) => x.leaderId!);
  const stars = Object.values(s.acts).filter((a) => a.fame >= 70 && a.status !== 'retired' && a.status !== 'split').map((a) => a.id);
  const fs = FUNDS.map((_, i) => i).filter((i) => s.year >= FUNDS[i].from);
  for (const id of Object.keys(st.q).sort()) {
    const q = st.q[id];
    if (q.dead) { delete st.own[id]; continue; }
    const own = (st.own[id] ??= {});
    for (const k of Object.keys(own)) if (!holderAlive(s, k)) delete own[k];
    if (!r.chance(id === OWN ? 0.5 : 0.3)) continue;
    const cand: [string, number][] = fs.map((i) => [`F:${i}`, 9 / fs.length]);
    for (const lb of rich) if (`lb:${lb.id}` !== id) cand.push([`L:${lb.id}`, rivalWeight(s, lb, id)]);
    if (lds.length) cand.push([`P:${r.pick(lds)}`, 1]);
    if (stars.length) cand.push([`A:${r.pick(stars)}`, 0.6]);
    const k = r.weighted(cand, (c) => c[1])?.[0];
    if (!k) continue;
    const has = own[k] ?? 0;
    const raider = id === OWN && k.startsWith('L:') && ((s.rivalries[k.slice(2)] ?? 0) >= 15 || s.labels[k.slice(2)]?.archetype === 'empire');
    const big = id === OWN || isLbl(id);
    const sell = has > 0 && r.chance(raider ? 0.1 : 0.4);
    const room = npcCap(s, id) - npcTotal(s, id);
    const d = sell ? -has * (r.chance(0.5) ? 1 : 0.5)
      : Math.min(room, r.float(0.004, k.startsWith('F:') ? 0.03 : k.startsWith('L:') ? 0.025 : big ? 0.015 : 0.006) * (raider ? 2 : 1));
    if (!sell && d < 0.002) continue;
    if (k.startsWith('L:')) {
      const lb = s.labels[k.slice(2)];
      const cost = Math.round(d * q.p * sharesOf(s, id));
      if (d > 0 && cost > lb.cash * 0.3) continue;
      lb.cash -= cost;
    }
    const to = has + d < 0.0005 ? 0 : has + d;
    if (to) own[k] = to; else delete own[k];
    if (id === OWN) { s.listing.price = Math.max(1, Math.round(s.listing.price * (1 + d * 0.8))); ownCross(s, k, has, to); }
    else if (isLbl(id) && k.startsWith('L:') && d > 0) lblCross(s, id, k.slice(2), has, to);
  }
}

/** Um selo rival que junta o bloco do pregão com a fatia privada (participações) e passa de 50% engole o alvo. */
function lblCross(s: GameState, id: string, buyerId: string, from: number, to: number): void {
  const t = s.labels[id.slice(3)];
  const b = s.labels[buyerId];
  if (!t || !b) return;
  if (from < 0.1 && to >= 0.1) news(s, fmtL(l('{b} já tem {p}% das ações de {t}.', '{b} now holds {p}% of {t}.'), { b: b.name, p: Math.round(to * 100), t: t.name }), 'info', id);
  if (to + stakeOf(s, t.id, b.id) > CONTROL && stakeOf(s, t.id) < BOARD_SEAT) npcAbsorb(s, b, t);
}

/** Avisos quando um NPC junta um bloco grande do SEU selo listado: 5% (aviso), 10% (ameaça), 25% (assento), mais que você (aquisição hostil). */
function ownCross(s: GameState, k: string, from: number, to: number): void {
  const n = holderName(s, k);
  const up = (x: number) => from < x && to >= x;
  const v = { n, p: Math.round(to * 100), c: s.config.companyName };
  if (up(0.05)) { const t = fmtL(l('{n} comprou {p}% das ações da {c} no pregão.', '{n} bought {p}% of {c} on the exchange.'), v); news(s, t, 'info', OWN); notify(s, t, 'info'); }
  if (up(0.1)) {
    const t = k.startsWith('L:') ? fmtL(l('Ameaça de aquisição: {n} já tem {p}% da {c} e continua comprando.', 'Takeover threat: {n} already holds {p}% of {c} and keeps buying.'), v) : fmtL(l('{n} acumula {p}% da {c}: o mercado fala em pressão por mudanças.', '{n} has built a {p}% stake in {c}: the market talks of pressure for change.'), v);
    news(s, t, 'bad', OWN, true);
    notify(s, t, 'bad');
    if (k.startsWith('L:')) s.rivalries[k.slice(2)] = (s.rivalries[k.slice(2)] ?? 0) + 5;
  }
  if (up(BOARD_SEAT)) {
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100);
    const t = fmtL(l('{n} passou de 25% da {c} e exige um assento no conselho.', '{n} passed 25% of {c} and demands a board seat.'), v);
    news(s, t, 'bad', OWN, true);
    notify(s, t, 'bad');
  }
  const ctl = controlShare(s);
  if (from <= ctl && to > ctl) {
    s.listing.price = Math.round(s.listing.price * 1.08);
    const t = fmtL(l('Aquisição hostil: {n} tem mais ações da {c} do que você. Recompre o bloco ou compre ações no pregão.', 'Hostile takeover: {n} holds more of {c} than you do. Buy back the block or buy shares on the exchange.'), v);
    news(s, t, 'bad', OWN, true);
    notify(s, t, 'bad');
  }
}

export interface Raider { k: string; name: L; frac: number; hostile: boolean; cost: number }
/** Blocos de NPCs com 5% ou mais do seu selo (e quanto custaria recomprá-los com ágio de 20%). */
export function raiders(s: GameState): Raider[] {
  if (!s.listing.listed) return [];
  return Object.entries(bolsa(s).own[OWN] ?? {}).filter(([, f]) => f >= 0.05).sort((a, b) => b[1] - a[1])
    .map(([k, f]) => ({ k, name: holderName(s, k), frac: f, hostile: k.startsWith('L:') || f > controlShare(s), cost: Math.round(f * s.listing.shares * s.listing.price * 1.2) }));
}

/** Recompra (com ágio) o bloco de um NPC com o caixa do selo: as ações são canceladas e saem de circulação. */
export function repelRaider(s: GameState, k: string): L | null {
  const own = bolsa(s).own[OWN];
  const f = own?.[k];
  if (!s.listing.listed || !f) return l('Este acionista não tem bloco no seu selo.', 'This holder has no block in your label.');
  const cost = Math.round(f * s.listing.shares * s.listing.price * 1.2);
  if (s.player.cash < cost) return l('Caixa do selo insuficiente para a recompra.', 'Not enough label cash for the buyback.');
  coPost(s, `repel:${k}`, -cost, `Recompra do bloco de ${holderName(s, k).pt}`);
  delete own[k];
  s.listing.floatShare = Math.max(0, s.listing.floatShare - f);
  if (k.startsWith('L:')) { const lb = s.labels[k.slice(2)]; if (lb) lb.cash += cost; }
  news(s, fmtL(l('{c} recompra o bloco de {n} ({p}%) com ágio.', '{c} buys back {n}\'s block ({p}%) at a premium.'), { c: s.config.companyName, n: holderName(s, k), p: Math.round(f * 100) }), 'info', OWN, true);
  return null;
}

export interface Holder { k: string; name: L; frac: number; kind: 'you' | 'co' | 'founder' | 'private' | 'fund' | 'rival' | 'person' }
/** Maiores acionistas de uma ação: você, o selo, blocos de NPCs no pregão e (selos) fatias privadas e sócios. */
export function holders(s: GameState, id: string, top = 5): Holder[] {
  const st = bolsa(s);
  const sh = sharesOf(s, id);
  const out: Holder[] = [];
  if (st.pos[id]) out.push({ k: 'you', name: l('Você', 'You'), frac: st.pos[id].sh / sh, kind: 'you' });
  if (st.cpos[id]) out.push({ k: 'co', name: fmtL(l('{c} (caixa do selo)', '{c} (label cash)'), { c: s.config.companyName }), frac: st.cpos[id].sh / sh, kind: 'co' });
  for (const [k, f] of Object.entries(st.own[id] ?? {})) out.push({ k, name: holderName(s, k), frac: f, kind: k[0] === 'F' ? 'fund' : k[0] === 'L' ? 'rival' : 'person' });
  if (id === OWN) {
    out.push({ k: 'founder', name: l('Você (fundador)', 'You (founder)'), frac: ownerShare(s), kind: 'founder' });
    for (const inv of capital(s).investors) out.push({ k: `I:${inv.id}`, name: fmtL(l('{n} (sócio privado)', '{n} (private partner)'), { n: inv.name }), frac: inv.share, kind: 'private' });
  } else if (isLbl(id)) {
    for (const h of stakeHoldings(s, id.slice(3))) out.push({ k: `S:${h.holder}`, name: h.holder === 'player' ? l('Você (fatia privada)', 'You (private stake)') : fmtL(l('{n} (fatia privada)', '{n} (private stake)'), { n: s.labels[h.holder]?.name ?? '—' }), frac: h.share, kind: h.holder === 'player' ? 'you' : 'private' });
  }
  return out.filter((x) => x.frac >= 0.001).sort((a, b) => b.frac - a.frac).slice(0, top);
}

// ---------------------------------------------------------------- consulta

export function listed(s: GameState): Row[] {
  const st = bolsa(s);
  seedMarket(s);
  const out: Row[] = [];
  for (const id of Object.keys(st.q)) {
    const q = st.q[id];
    if (q.dead) continue;
    let kind: Kind; let tags: Tag[]; let div = 0; let blurb: L;
    if (id === OWN) {
      if (!s.listing.listed) continue;
      kind = 'label'; tags = ['label'];
      blurb = l('O seu selo: o preço segue lucro, crescimento e o conselho. Você pode comprar ações em circulação (reforça o controle); o caixa do selo não negocia a própria ação.', 'Your label: the price follows profit, growth and the board. You can buy floating shares (strengthens control); label cash cannot trade its own stock.');
    } else if (isLbl(id)) {
      const lb = s.labels[id.slice(3)];
      if (!lb) continue;
      kind = 'label'; tags = ['label']; div = lb.cash > 0 ? 0.02 : 0;
      blurb = fmtL(l('Selo rival ({c}), listado desde {y}: preço segue receita, catálogo, elenco e prestígio.', 'Rival label ({c}), listed since {y}: price follows revenue, catalogue, roster and standing.'), { c: lb.city, y: st.lbl[lb.id] ?? q.born });
    } else if (id.startsWith('nv:')) {
      const d = nvDef(s, id.slice(3));
      if (!d) continue;
      kind = d.kind; tags = d.tags; blurb = d.blurb;
    } else {
      const d = DEF_BY_ID[id];
      if (!d || !defAlive(s, d)) continue;
      kind = d.kind; tags = d.tags; div = d.div; blurb = blurbOf(s, d);
    }
    const rev = id === OWN ? Math.max(s.player.revenueByYear[s.year - 1] ?? 0, s.player.revenueByYear[s.year] ?? 0) : isLbl(id) ? revenueOf(s.labels[id.slice(3)]) : 0;
    const pe = id === OWN || isLbl(id)
      ? clamp((q.p * sharesOf(s, id)) / Math.max(money(s, 1000), rev * 0.14), 3, 80)
      : clamp(PE0[kind] * Math.exp(q.x + 0.4 * q.lv), 3, 90);
    out.push({ id, name: stockName(s, id), kind, blurb, tags, div, q, pe });
  }
  return out.sort((a, b) => (a.id === OWN ? -1 : b.id === OWN ? 1 : a.name.localeCompare(b.name)));
}

export const change12 = (q: Quote): number => q.hist.length > 1 ? q.p / Math.max(1, q.hist[Math.max(0, q.hist.length - 13)]) - 1 : 0;

/** Empresas que ainda não existem não aparecem; as grandes que nunca abrem capital aparecem como nota. */
export function unlistedNotes(s: GameState): typeof UNLISTED {
  return UNLISTED.filter((u) => s.year >= u.from && (!u.tech || s.year >= T(s, u.tech)));
}

export interface Holding { id: string; name: string; sh: number; cost: number; value: number; pl: number; divs: number; frac?: number; q: Quote }
/** Posições de uma carteira: 'p' = você, 'c' = o selo. */
export function holdingsOf(s: GameState, acct: Acct = 'p'): Holding[] {
  const st = bolsa(s);
  const pos = posOf(s, acct);
  return Object.keys(pos).map((id): Holding | null => {
    const p = pos[id];
    const q = st.q[id];
    if (!q) return null;
    return { id, name: stockName(s, id), sh: p.sh, cost: p.cost, value: Math.round(p.sh * q.p), pl: Math.round(p.sh * q.p - p.cost + p.divs), divs: p.divs, frac: isLbl(id) || id === OWN ? p.sh / sharesOf(s, id) : undefined, q };
  }).filter((x): x is Holding => !!x);
}
export const stocksValue = (s: GameState, acct: Acct = 'p'): number => holdingsOf(s, acct).reduce((t, x) => t + x.value, 0);

/** Informação de dentro: com 5% de um selo rival (somando você e o selo) você vê os números dele. */
export function insight(s: GameState, id: string): { revenue: number; cash: number; roster: number; ceo?: string; standing: number } | null {
  if (!isLbl(id)) return null;
  const lb = s.labels[id.slice(3)];
  if (!lb || playerFrac(s, id) < INSIGHT_AT) return null;
  return { revenue: revenueOf(lb), cash: lb.cash, roster: lb.roster.length, ceo: lb.ceo, standing: Math.round(standingOf(s, lb.id).mom) };
}

/** O próprio selo, se abriu capital (gerido em "Capital e sócios"). */
export function ownListing(s: GameState): { name: string; price: number; hist: number[] } | null {
  return s.listing.listed ? { name: s.config.companyName, price: s.listing.price, hist: s.listing.history.slice(-60) } : null;
}

// ---------------------------------------------------------------- negociar

function unit(s: GameState, id: string, side: 'buy' | 'sell', n: number): number {
  const q = bolsa(s).q[id];
  const slip = isLbl(id) || id === OWN ? 0.5 * (n / sharesOf(s, id)) : 0;
  return q.p * (side === 'buy' ? 1 + slip + FEE : 1 - slip - FEE);
}

/** Saldo de quem compra: patrimônio pessoal ou caixa do selo. */
export const walletOf = (s: GameState, acct: Acct): number => (acct === 'c' ? s.player.cash : ownerOf(s).wealth);

/** Compra `sh` ações com o patrimônio pessoal ('p') ou com o caixa do selo ('c'). */
export function buyShares(s: GameState, id: string, sh: number, acct: Acct = 'p'): L | null {
  const st = bolsa(s);
  seedMarket(s);
  const q = st.q[id];
  if (!q || q.dead || !listed(s).some((x) => x.id === id)) return l('Esta ação não está à venda.', 'This share is not for sale.');
  sh = Math.floor(sh);
  if (sh < 1) return l('Quantidade inválida.', 'Invalid quantity.');
  const before = playerFrac(s, id);
  if (id === OWN) {
    if (acct === 'c') return l('O caixa do selo não compra a própria ação no pregão: use a recompra de blocos.', 'Label cash cannot buy its own stock on the exchange: use the block buyback.');
    const free = Math.floor(sharesOf(s, id) * (s.listing.floatShare - npcTotal(s, id))) - (st.pos[id]?.sh ?? 0);
    if (sh > free) return l('Não há tantas ações do seu selo em circulação à venda.', 'There are not that many of your label\'s floating shares for sale.');
  }
  if (isLbl(id) && before + sh / sharesOf(s, id) > MAX_STAKE) return fmtL(l('Você e o selo, juntos, não podem passar de {p}% das ações de um selo (o resto é do fundador e do mercado).', 'You and your label together cannot hold more than {p}% of a label (the rest belongs to the founder and the float).'), { p: Math.round(MAX_STAKE * 100) });
  const cost = Math.round(sh * unit(s, id, 'buy', sh));
  if (walletOf(s, acct) < cost) return acct === 'c' ? l('Caixa do selo insuficiente.', 'Not enough label cash.') : l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.');
  if (acct === 'c') coPost(s, `buy:${id}`, -cost, `Compra de ações: ${stockName(s, id)}`);
  else ownerOf(s).wealth -= cost;
  const pos = (posOf(s, acct)[id] ??= { sh: 0, cost: 0, since: s.year, divs: 0 });
  pos.sh += sh;
  pos.cost += cost;
  if (isLbl(id)) crossing(s, id, before, playerFrac(s, id));
  return null;
}

/** Compra o máximo de ações possível com `cents`. */
export function buyValue(s: GameState, id: string, cents: number, acct: Acct = 'p'): L | null {
  const q = bolsa(s).q[id];
  if (!q) return l('Esta ação não está à venda.', 'This share is not for sale.');
  let sh = Math.floor(cents / (q.p * (1 + FEE)));
  while (sh > 1 && Math.round(sh * unit(s, id, 'buy', sh)) > cents) sh -= 1;
  return buyShares(s, id, sh, acct);
}

export function sellShares(s: GameState, id: string, frac = 1, acct: Acct = 'p'): L | null {
  const st = bolsa(s);
  const pos = posOf(s, acct)[id];
  const q = st.q[id];
  if (!pos || !q) return l('Você não tem estas ações.', 'You do not own these shares.');
  const sh = Math.max(1, Math.round(pos.sh * clamp(frac, 0, 1)));
  const gross = Math.round(sh * unit(s, id, 'sell', sh));
  const basis = Math.round(pos.cost * (sh / pos.sh));
  const before = playerFrac(s, id);
  if (acct === 'c') coPost(s, `sell:${id}`, gross, `Venda de ações: ${stockName(s, id)}`);
  else { ownerOf(s).wealth += gross; st.realized += gross - basis; }
  pos.sh -= sh;
  pos.cost -= basis;
  if (pos.sh <= 0) delete posOf(s, acct)[id];
  if (isLbl(id)) crossing(s, id, before, playerFrac(s, id));
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
