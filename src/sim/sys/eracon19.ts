// Rodada 19 (11.6, eracon19) — CONTRATO POR ÉPOCA. Em 1889 ninguém falava em "royalty 18%" nem em "master":
//  · antes de ~1903: cachê por sessão (ou por cilindro gravado), exclusividade com a fábrica, SEM royalty; as matrizes
//    são da fábrica (até 1902 cada cilindro era uma nova gravação). Caruso (1902–04) abre a porta do royalty por disco.
//  · 1903–1924: royalty baixo POR LADO vendido (2–6%; estrelas da ópera chegam a 10%) e a edição (partitura) contratada à
//    parte; ainda sem a palavra "master" (o termo e a fita-matriz como ativo negociável vêm com a gravação elétrica, ~1925).
//  · depois: faixa de royalty por década (3–8% nos anos 30, 5–12% nos 60, 10–20% nos 80, 14–30% a partir de 2000).
// Puro (sem estado): artist18 (propostas de selos NPC ao artista) e contracts18 (pacotes do selo) leem daqui.

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';

export type EraK19 = 'session' | 'side' | 'modern';
export const ROY_YEAR19 = 1903;
export const MASTER_YEAR19 = 1925;
export const eraK19 = (year: number): EraK19 => (year < ROY_YEAR19 ? 'session' : year < MASTER_YEAR19 ? 'side' : 'modern');
/** a palavra "master" (fita/matriz como ativo do contrato) já existe? */
export const hasMaster19 = (year: number): boolean => year >= MASTER_YEAR19;

/** faixa de royalty do artista por década [mín, máx] */
export function royBand19(year: number): [number, number] {
  if (year < ROY_YEAR19) return [0, 0];
  if (year < 1925) return [0.02, 0.06];
  if (year < 1945) return [0.03, 0.08];
  if (year < 1960) return [0.04, 0.1];
  if (year < 1970) return [0.05, 0.12];
  if (year < 1980) return [0.08, 0.16];
  if (year < 1990) return [0.1, 0.2];
  if (year < 2000) return [0.12, 0.22];
  return [0.14, 0.3];
}
/** royalty que o artista espera (fama 0–100 sobe dentro da faixa; estrelas passam um pouco do teto) */
export function expRoy19(year: number, fame: number): number {
  const [a, b] = royBand19(year);
  return a + (b - a) * (0.35 + fame / 160);
}
/** prende o royalty proposto na faixa da época (estrela: +40% do teto, como Caruso) */
export function clampRoy19(year: number, roy: number, fame: number): number {
  const [a, b] = royBand19(year);
  if (!b) return 0;
  return Math.round(clamp(roy, a * 0.6, b * (fame >= 70 ? 1.4 : 1)) * 100) / 100; // piso baixo: contrato predatório continua possível
}

/** Parte da proposta (forma mínima lida por artist18, sem importar o tipo) */
interface OfferEra { roy: number; fund: number; s360: number; master: 'label' | 'shared' | 'artist'; rev: number; opts: number; term: number; albums: number; model: string; k?: string;
  k18?: { rec: number; video: boolean; tour: boolean; mkt: number; cross: boolean; stmt: string; audit: boolean; base: string; pkg: string } }
/** Ajusta uma proposta de selo NPC ao costume da época. Devolve true se mudou algo. */
export function eraOffer19(year: number, o: OfferEra, fame: number): boolean {
  if (o.k === 'dist' || o.model === 'distribution') {
    if (year >= MASTER_YEAR19) return false;
    o.k = 'record'; o.model = 'classic'; // distribuidora "dona do seu master" não existe antes de 1925
  }
  const k = eraK19(year);
  o.roy = clampRoy19(year, o.roy, fame);
  if (k === 'modern') return true;
  o.s360 = 0; o.master = 'label'; o.rev = 0; o.opts = Math.min(o.opts, 1);
  if (k === 'session') { o.fund = 0; o.term = Math.min(o.term, 24); o.albums = Math.max(2, Math.min(o.albums, 4)); o.model = 'classic'; }
  if (o.k18) Object.assign(o.k18, { video: false, tour: false, mkt: 0, cross: false, stmt: 'a', audit: false, base: 'wholesale', rec: k === 'session' ? 0 : 0.5 });
  return true;
}

const money0 = (v: number) => { const x = Math.round(v / 100); return x >= 1e3 ? `$${(x / 1e3).toFixed(1)}k` : `$${x}`; };
/** Texto da proposta na linguagem da época (null = usar o texto moderno). */
export function eraOfferText19(year: number, o: { adv: number; roy: number; term: number; albums: number }, label: string): L | null {
  const k = eraK19(year);
  const y = Math.round(o.term / 12 * 10) / 10;
  if (k === 'session') return l(
    `Cachê de ${money0(o.adv)} pelas sessões de gravação (${o.albums} sessões em ${y} anos), pago na entrega das ceras; exclusividade com ${label} para cilindros e discos. Sem royalty: o costume é cachê fixo — as matrizes ficam com a fábrica.`,
    `A ${money0(o.adv)} fee for the recording sessions (${o.albums} sessions over ${y} years), paid when the waxes are delivered; exclusive to ${label} for cylinders and discs. No royalty: the custom is a flat fee — the matrices belong to the company.`);
  if (k === 'side') return l(
    `Adiantamento de ${money0(o.adv)}; royalty de ${Math.round(o.roy * 100)}% por lado vendido; ${y} anos (${o.albums} discos). A edição das canções (partitura) é contratada à parte; as matrizes ficam com a fábrica.`,
    `${money0(o.adv)} advance; ${Math.round(o.roy * 100)}% royalty per side sold; ${y} years (${o.albums} records). Song publishing (sheet music) is contracted separately; the matrices belong to the company.`);
  return null;
}
/** Linha "master" na linguagem da época (null = moderna). */
export function eraMasterL19(year: number): L | null {
  return hasMaster19(year) ? null : l('as matrizes ficam com a fábrica (costume da época)', 'the matrices belong to the company (the custom of the time)');
}
/** troca "master(s)" por "matriz(es)" (textos de antes de ~1925) */
export function eraWord19<T extends L | string>(x: T): T {
  const f = (t: string, pt: boolean) => (pt ? t.replace(/\b([Oo])s masters\b/g, (_m, o: string) => (o === 'O' ? 'As' : 'as') + ' matrizes').replace(/\b([Oo]) master\b/g, (_m, o: string) => (o === 'O' ? 'A' : 'a') + ' matriz') : t).replace(/\bmasters\b/g, pt ? 'matrizes' : 'matrices').replace(/\bmaster\b/g, pt ? 'matriz' : 'matrix').replace(/\bMaster\b/g, pt ? 'Matriz' : 'Matrix');
  if (typeof x === 'string') return f(x, true) as T;
  const v = x as L;
  return { ...v, pt: f(v.pt, true), en: f(v.en, false) } as T;
}
/** Pedidos de contraproposta que fazem sentido na época. */
export function eraAsks19<T extends string>(year: number, asks: T[]): T[] {
  return asks.filter((a) => (a !== 'master' || hasMaster19(year)) && (a !== 'roy' || year >= ROY_YEAR19));
}
/** Por que o contrato é assim (para o "por quê" e a ajuda). */
export function eraWhy19(year: number): L {
  const k = eraK19(year);
  const [a, b] = royBand19(year);
  return k === 'session' ? l('Antes de ~1903 cantores e bandas recebiam cachê por sessão ou por cilindro gravado; royalty sobre disco só vem com as estrelas da ópera (Caruso, 1902–04).', 'Before ~1903 singers and bands got a fee per session or per cylinder recorded; royalties on discs only come with the opera stars (Caruso, 1902–04).')
    : k === 'side' ? l('1903–1924: royalty baixo por lado vendido (2–6%, estrelas até ~10%) e a partitura à parte; a Lei de 1909 cria o royalty mecânico do compositor. Ainda não se fala em "master".', '1903–1924: a low royalty per side sold (2–6%, stars up to ~10%) and sheet music separately; the 1909 Act creates the songwriter\'s mechanical royalty. Nobody says "master" yet.')
      : l(`Royalty típico desta década: ${Math.round(a * 100)}–${Math.round(b * 100)}% (estrelas passam do teto).`, `Typical royalty this decade: ${Math.round(a * 100)}–${Math.round(b * 100)}% (stars go past the cap).`);
}
