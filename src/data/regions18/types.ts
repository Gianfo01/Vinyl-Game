// Rodada 18 (regions18, feedback #11) — tipos dos submercados. As 7 regiões de MARKETS continuam sendo a visão geral
// (paradas, relevância, fama por região, saves antigos); cada região se abre em submercados/circuitos com dados por época.
import type { L, MarketId } from '../world';

/** Curva por ano-chave (interpolada). */
export type Ramp18 = [number, number][];
/** Gosto por época: chave = id de gênero OU de família; valor na escala de MARKET_PREF (0,2 … 2,4). */
export type Taste18 = [number, Record<string, number>][];

export interface Plat18 {
  name: string;
  /** nome genérico para os modos sem nomes reais */
  alt?: L;
  from: number;
  to?: number;
  kind: 'stream' | 'tv' | 'radio' | 'chart' | 'store' | 'mobile' | 'piracy' | 'download';
  /** +x de apelo quando você tem escritório local (metade com licenciado) */
  boost: number;
  note: L;
}
export interface Partner18 { name: string; alt: L; from: number; to?: number; /** adiantamento em US$ reais de 2020 */ adv: number; note: L }
export interface Barrier18 {
  id: string;
  kind: 'censor' | 'quota' | 'visa' | 'approval' | 'piracy' | 'ban';
  from: number;
  to?: number;
  /** gêneros ou famílias atingidos (vazio = todos os estrangeiros) */
  hit?: string[];
  /** só atinge quem é de fora do submercado */
  foreign?: boolean;
  mult: number;
  name: L;
  why: L;
}
export interface Sub18 {
  id: string;
  mk: MarketId;
  name: L;
  a3: string[];
  /** peso dentro da região (normalizado entre os irmãos) por época */
  share: Ramp18;
  /** poder de compra relativo aos EUA */
  pp: Ramp18;
  langs: string[];
  taste: Taste18;
  plats: Plat18[];
  partners: Partner18[];
  bars: Barrier18[];
  /** custo relativo de entrada (1 = médio) */
  entry: number;
  hub: string;
  note: L;
}
/** Virada histórica de afinidade (vale para todos os modos; fora do modo exato o tamanho e a chance variam). */
export interface Shift18 { y: number; sub: string; g: string; d: number; name: L; why: L }
/** Diáspora: público de origem morando no destino carrega o gosto de casa. */
export interface Dias18 { o: string; to: string; y: number; w: number; g: string[]; name: L }

/** Circuito com regras próprias (R3): renda, canais, porteiros. */
export interface Circ18 {
  id: string;
  sub: string;
  name: L;
  /** gêneros/famílias aceitos */
  g: string[];
  from: number;
  to?: number;
  /** porteiro (quem abre a porta) */
  gate: L;
  /** entrada e mensalidade em US$ de 2020 */
  usd: number;
  monthly: number;
  /** efeitos: shows no submercado ×, apelo no submercado ×, fama mensal no país-sede, renda mensal US$ 2020 */
  show?: number;
  appeal?: number;
  fame?: number;
  cash?: number;
  /** venda dos direitos à vista (pirataria/marketers): troca de royalties por dinheiro já */
  lump?: number;
  /** meses de pico (shows ×2 neles) */
  peak?: number[];
  risk?: { p: number; sev: number; kind: string; text: L };
  real: L;
  how: L;
}
