// R29 (DEMO) — PÚBLICO POR IDADE E REGIÃO, com gosto por geração. Pergunta do autor: "hoje temos sistema de fãs e
// ouvintes por idade e por localidade? Também temos preferências ... por idade e região?" — agora sim:
//
// • IDADE (5 faixas: 13–17, 18–24, 25–34, 35–49, 50+). Cada ato guarda a FATIA de cada faixa (milésimos que somam
//   1000) sobre o total que já existe (act.fans casual+ativo+núcleo): nada é contado duas vezes e quem lê
//   fans.casual/active/core continua igual. As faixas ANDAM: na virada do ano 1/largura de cada faixa passa para a
//   próxima (quem tinha 15 em 1965 está em 35–49 nos anos 90). Fãs novos chegam pelo perfil de entrada (abaixo) e a
//   troca mensal (gente que sai e gente que chega) é maior com momento alto: banda parada envelhece com o público.
// • GOSTO (taste29): idade × gênero × região × ano. Jovem adota gênero novo; cada geração guarda afinidade com o
//   que tocava na sua juventude (ano de nascimento + 18 × popularidade histórica da família — curva por era +
//   genrePop registrado na partida). Região: tendência regional (rp) por família, medida nas paradas de cada
//   mercado; o genrePop global continua sendo o agregado (média ponderada dos mercados = 1).
// • REGIÃO: o livro por mercado já existia (terr20, só atos do jogador); aqui entram os PAÍSES (até 8 por ato do
//   jogador, como o teto de 12 do fame16) com herói local (fama de casa) e diáspora (regions18) e a conversão do
//   show no país onde ele aconteceu. Atos de fora: derivado da fama regional (sem custo de save).
// • Perfil de entrada: demografia do mercado na época (baby boom → anos 60 jovens; envelhecimento depois), alcance
//   da mídia por idade (streaming/vídeo curto puxam jovens), gosto da faixa, idade do artista (quem envelhece
//   segura e atrai público da sua idade), posicionamento, público-alvo do projeto (recipe12), canais de marketing e
//   redescobertas (revival19/audience8: filhos acham pelo streaming/vídeo curto; comercial/filme acorda a coorte
//   original).
// Efeitos (todos com rótulo e teto: caps18/APPEAL_CAT19) ficam no fim do arquivo. API de leitura para a sonda da
// R29 CONNECT: ageMix29, regionMix29, taste29.

import { Rng, clamp } from '../../core/rng';
import { COUNTRY_INFO, countryInfoByA3, countryMarketSize } from '../../data/countries';
import { subOfA3_18 } from '../../data/regions18';
import { countryOfCity } from '../../data/geo';
import { GENRES, MARKETS, MARKET_PREF, cityById, familyOf, genreById, l, type FamilyId, type L, type MarketId } from '../../data/world';
import { DEMO29, fraud29 } from '../demo29hook';
import { registerExt4, registerMod, registerOfferMod, registerSimHook } from '../ext4';
import { registerExplain, type WhyPart } from '../explain18';
import { onFact } from '../facts17';
import { registerAdvisorTip, type AdvTip18 } from '../inbox18';
import { MEDIA18 } from '../media18hook';
import { mainAmbition } from '../people';
import { actsNow27 } from '../tickcache27';
import { scandal } from '../scandal17';
import type { Act, GameState, Label, Release } from '../types';
import { fmtL, hasTech, notify, playerActs, recordAward, remember } from '../util';
import { REL_ADJ19, voters18 } from './awards18';
import { board } from './charts7';
import { fameIn, mkOf } from './fame16';
import { dias18 } from './regions18';
import { share20, target20 } from './terr20';
import { styleOfRel17 } from './trends17';

// ---------------------------------------------------------------- faixas

export const NB29 = 5;
export const AGE29: { id: string; name: L; lo: number; hi: number; mid: number; w: number }[] = [
  { id: 'teen', name: l('13–17', '13–17'), lo: 13, hi: 17, mid: 15, w: 5 },
  { id: 'young', name: l('18–24', '18–24'), lo: 18, hi: 24, mid: 21, w: 7 },
  { id: 'adult', name: l('25–34', '25–34'), lo: 25, hi: 34, mid: 29.5, w: 10 },
  { id: 'mid', name: l('35–49', '35–49'), lo: 35, hi: 49, mid: 42, w: 15 },
  { id: 'old', name: l('50+', '50+'), lo: 50, hi: 99, mid: 60, w: 0 },
];
/** mistura de referência (normaliza os efeitos): a de um ato em início/meio de carreira — medida em 4 eras
 *  (scripts/mix29demo.ts: atos do jogador ≈ 0,22/0,40/0,26/0,10/0,02; ativos com fama ≥ 5 ≈ 0,09/0,23/0,30/0,25/0,14).
 *  Assim a média dos efeitos fica neutra no equilíbrio do jogo e só a DIFERENÇA entre públicos pesa. */
export const REF29 = [0.17, 0.33, 0.28, 0.15, 0.07];
/** índice da faixa de uma idade */
export const bandOf29 = (age: number): number => (age < 18 ? 0 : age < 25 ? 1 : age < 35 ? 2 : age < 50 ? 3 : 4);

// ---------------------------------------------------------------- estado

export interface D29Act {
  /** fatias por faixa (milésimos, soma 1000) */
  b: number[];
  /** total de fãs na última conta (para separar entrada e saída) */
  n: number;
  /** mistura de um ano atrás (insights "seu público envelheceu") */
  p?: number[];
  /** países (só atos do jogador): [a3, milésimos do TOTAL] — até 8 */
  c?: [string, number][];
  /** idade do NÚCLEO (milésimos, soma 1000): quem fica anos vira núcleo — mais velho e mais estável que o casual */
  k?: number[];
  /** núcleo na última conta */
  nk?: number;
}
export interface Demo29 {
  a: Record<string, D29Act>;
  /** tendência regional por família (mercado → família → multiplicador; média ponderada = 1) */
  rp: Partial<Record<MarketId, Record<string, number>>>;
  /** popularidade registrada por família em blocos de 5 anos (família → ano do bloco → média) */
  gh: Record<string, Record<string, number>>;
  /** volta histórica (reunião): ato → semana */
  ru: Record<string, number>;
  /** conversão pendente de shows por país (ato → a3 → fãs) */
  pc: Record<string, Record<string, number>>;
  /** popularidade atual por família (fotografia do mês: o gosto não muda no meio do mês) */
  gp?: Record<string, number>;
  /** versão das curvas (sobe a cada virada de mês do demo29; chaves dos caches) */
  v?: number;
  log: [number, number, L][];
  /** voto popular: [ano, ato, fatia de votos falsos (robôs/urna cheia), cassado?] */
  pv?: [number, string, number, number][];
}
declare module '../ext4' { interface Ext4 { demo29: Demo29 } }
const fresh = (): Demo29 => ({ a: {}, rp: {}, gh: {}, ru: {}, pc: {}, log: [] });
registerExt4('demo29', fresh);
export function demo29(s: GameState): Demo29 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.demo29 ??= fresh()) as Demo29;
  st.a ??= {}; st.rp ??= {}; st.gh ??= {}; st.ru ??= {}; st.pc ??= {}; st.log ??= [];
  return st;
}

const MK: MarketId[] = MARKETS.map((m) => m.id);
const mineA = (a?: Act): a is Act => !!a && (a.owner === 'player' || !!a.playerBand);
const liveA = (a: Act) => a.status !== 'retired' && a.status !== 'split' && !a.deceased;
const total = (a: Act) => Math.max(0, a.fans.casual) + Math.max(0, a.fans.active) + Math.max(0, a.fans.core);
const norm = (v: number[]): number[] => { const t = v.reduce((a, b) => a + Math.max(0, b), 0) || 1; return v.map((x) => Math.max(0, x) / t); };
const dot = (a: number[], b: number[]) => a.reduce((t, x, i) => t + x * b[i], 0);
/** fator relativo de um perfil por faixa: mistura do ato × perfil ÷ referência × perfil */
const rel29 = (b: number[], prof: number[]) => dot(b, prof) / dot(REF29, prof);
/** restos maiores para milésimos */
function permille(v: number[]): number[] {
  const f = norm(v).map((x) => x * 1000), out = f.map(Math.floor);
  let rest = 1000 - out.reduce((a, b) => a + b, 0);
  const ord = f.map((x, i) => [x - Math.floor(x), i] as [number, number]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; rest > 0; k = (k + 1) % ord.length, rest--) out[ord[k][1]]++;
  return out;
}

// ---------------------------------------------------------------- demografia por era e região

type Key = [number, number[]];
const DEM: Record<MarketId, Key[]> = {
  na: [[1900, [0.13, 0.16, 0.22, 0.27, 0.22]], [1950, [0.09, 0.12, 0.19, 0.28, 0.32]], [1965, [0.13, 0.15, 0.17, 0.25, 0.30]], [1975, [0.12, 0.18, 0.21, 0.22, 0.27]], [1990, [0.08, 0.13, 0.22, 0.27, 0.30]], [2010, [0.08, 0.12, 0.17, 0.25, 0.38]], [2040, [0.07, 0.10, 0.16, 0.24, 0.43]]],
  eu: [[1900, [0.13, 0.16, 0.22, 0.26, 0.23]], [1950, [0.09, 0.13, 0.19, 0.28, 0.31]], [1965, [0.11, 0.14, 0.17, 0.27, 0.31]], [1980, [0.10, 0.15, 0.20, 0.24, 0.31]], [2010, [0.07, 0.10, 0.16, 0.27, 0.40]], [2040, [0.06, 0.09, 0.15, 0.25, 0.45]]],
  oceania: [[1900, [0.13, 0.16, 0.22, 0.27, 0.22]], [1965, [0.13, 0.15, 0.18, 0.25, 0.29]], [1990, [0.09, 0.13, 0.21, 0.27, 0.30]], [2040, [0.07, 0.10, 0.17, 0.25, 0.41]]],
  asia: [[1900, [0.15, 0.18, 0.23, 0.25, 0.19]], [1960, [0.14, 0.17, 0.22, 0.25, 0.22]], [2000, [0.10, 0.14, 0.21, 0.28, 0.27]], [2040, [0.07, 0.10, 0.16, 0.27, 0.40]]],
  br: [[1900, [0.17, 0.20, 0.23, 0.23, 0.17]], [1960, [0.17, 0.20, 0.23, 0.22, 0.18]], [1990, [0.15, 0.18, 0.23, 0.24, 0.20]], [2040, [0.09, 0.13, 0.19, 0.27, 0.32]]],
  latam: [[1900, [0.17, 0.20, 0.23, 0.23, 0.17]], [1960, [0.17, 0.20, 0.23, 0.22, 0.18]], [1990, [0.15, 0.18, 0.23, 0.24, 0.20]], [2040, [0.09, 0.13, 0.19, 0.27, 0.32]]],
  africa: [[1900, [0.18, 0.22, 0.24, 0.21, 0.15]], [2040, [0.17, 0.21, 0.24, 0.22, 0.16]]],
};
/** Estrutura etária (13+) de um mercado num ano (soma 1). */
export function demog29(mk: MarketId, y: number): number[] {
  const ks = DEM[mk] ?? DEM.na;
  if (y <= ks[0][0]) return norm(ks[0][1]);
  for (let i = 1; i < ks.length; i++) if (y <= ks[i][0]) {
    const [y0, a] = ks[i - 1], [y1, b] = ks[i], t = (y - y0) / (y1 - y0);
    return norm(a.map((x, j) => x + (b[j] - x) * t));
  }
  return norm(ks[ks.length - 1][1]);
}

// ---------------------------------------------------------------- história dos gêneros (nostalgia)

/** popularidade histórica por família (curva por era, ~0,15–1,8) */
const HIST29: Record<string, Key[]> = {
  blues_jazz: [[1900, [0.8]], [1925, [1.4]], [1940, [1.7]], [1955, [1.1]], [1970, [0.6]], [1990, [0.45]], [2040, [0.4]]],
  country_folk: [[1925, [0.8]], [1950, [1.1]], [1963, [1.4]], [1975, [1.0]], [1995, [1.0]], [2040, [0.9]]],
  rnb: [[1945, [0.6]], [1960, [1.2]], [1970, [1.4]], [1985, [1.1]], [2000, [1.4]], [2040, [1.1]]],
  rock: [[1950, [0.3]], [1956, [1.2]], [1965, [1.7]], [1975, [1.6]], [1990, [1.3]], [2005, [1.0]], [2020, [0.6]], [2040, [0.55]]],
  pop: [[1900, [1.0]], [1960, [1.2]], [1985, [1.5]], [2000, [1.4]], [2040, [1.4]]],
  hiphop: [[1975, [0.2]], [1985, [0.6]], [1995, [1.2]], [2005, [1.5]], [2020, [1.7]], [2040, [1.6]]],
  electronic: [[1970, [0.2]], [1980, [0.7]], [1995, [1.2]], [2010, [1.4]], [2020, [1.1]], [2040, [1.1]]],
  caribbean: [[1950, [0.4]], [1960, [0.5]], [1975, [1.1]], [1990, [0.8]], [2005, [1.0]], [2040, [1.0]]],
  latin: [[1930, [0.8]], [1955, [1.1]], [1980, [0.9]], [2000, [1.0]], [2017, [1.4]], [2040, [1.3]]],
  brazil: [[1930, [0.9]], [1960, [1.3]], [1980, [1.0]], [2000, [1.0]], [2040, [1.1]]],
  africa: [[1950, [0.4]], [1960, [0.5]], [1980, [0.8]], [2000, [0.7]], [2018, [1.2]], [2040, [1.3]]],
  asia_me: [[1950, [0.5]], [1960, [0.6]], [1990, [0.8]], [2010, [1.1]], [2020, [1.3]], [2040, [1.3]]],
  europe: [[1900, [1.1]], [1950, [1.0]], [1980, [0.8]], [2040, [0.7]]],
  sacred: [[1900, [1.4]], [1940, [1.0]], [1970, [0.7]], [2000, [0.6]], [2040, [0.55]]],
};
const FAMS = Object.keys(HIST29);
const FAM_BORN: Record<string, number> = {};
for (const g of GENRES) if (!g.id.startsWith('mv_')) FAM_BORN[g.family] = Math.min(FAM_BORN[g.family] ?? 9999, g.born);
function curve(ks: Key[], y: number): number {
  if (y <= ks[0][0]) return ks[0][1][0];
  for (let i = 1; i < ks.length; i++) if (y <= ks[i][0]) { const [y0, [a]] = ks[i - 1], [y1, [b]] = ks[i]; return a + (b - a) * (y - y0) / (y1 - y0); }
  return ks[ks.length - 1][1][0];
}
const bin5 = (y: number) => Math.floor(y / 5) * 5;
// cache das curvas (desempenho: taste29 roda milhares de vezes na semente dos atos); vale por partida/ano/mês
// Chave = objeto do estado + ano + versão do demo29: os valores só dependem de dados estáticos e do que o próprio gancho
// mensal grava (gh, gp, rp) — calcular antes ou depois de outro sistema no mesmo mês dá o mesmo (save/load idêntico).
interface HC29 { k: string; h: Map<string, number>; avg: Map<number, number>; der: Map<string, number[]> }
const HCS = new WeakMap<object, HC29>();
function hc(s: GameState): HC29 {
  const k = `${s.year}|${demo29(s).v ?? 0}`;
  let c = HCS.get(s);
  if (!c || c.k !== k) { c = { k, h: new Map(), avg: new Map(), der: new Map() }; HCS.set(s, c); }
  return c;
}
/** Popularidade de uma família num ano: curva histórica, misturada ao que a partida registrou (genrePop). */
export function histPop29(s: GameState, fam: string, y: number): number {
  const c = hc(s), key = `${fam}|${y}`;
  const hit = c.h.get(key);
  if (hit !== undefined) return hit;
  let v: number;
  if ((FAM_BORN[fam] ?? 1900) > y + 2) v = 0.12;
  else {
    const st = HIST29[fam] ? curve(HIST29[fam], y) : 0.8;
    if (y >= s.year) { const now = famPopNow(s, fam); v = now === undefined ? st : 0.5 * st + 0.5 * now; }
    else { const rec = demo29(s).gh[fam]?.[bin5(y)]; v = rec === undefined ? st : 0.5 * st + 0.5 * rec; }
  }
  c.h.set(key, v);
  return v;
}
/** popularidade atual da família pela fotografia do mês (sem fotografia ainda: só a curva) */
const famPopNow = (s: GameState, fam: string): number | undefined => demo29(s).gp?.[fam];
/** média do genrePop por família agora (lida só no gancho mensal) */
function famPopLive(s: GameState): Record<string, number> {
  const acc: Record<string, [number, number]> = {};
  for (const [g, v] of Object.entries(s.genrePop)) { const ge = genreById[g]; if (ge && ge.born <= s.year) { const x = (acc[ge.family] ??= [0, 0]); x[0] += v; x[1]++; } }
  const out: Record<string, number> = {};
  for (const f of FAMS) if (acc[f]) out[f] = Math.round((acc[f][0] / acc[f][1]) * 1000) / 1000;
  return out;
}
const avgPop = (s: GameState, y: number): number => {
  const c = hc(s);
  const hit = c.avg.get(y);
  if (hit !== undefined) return hit;
  let t = 0, n = 0;
  for (const f of FAMS) { const v = histPop29(s, f, y); if (v > 0.15) { t += v; n++; } }
  const v = n ? t / n : 1;
  c.avg.set(y, v);
  return v;
};

// ---------------------------------------------------------------- gosto: idade × gênero × região × ano

const regionOf = (r?: string): MarketId | undefined => (!r ? undefined : (MK as string[]).includes(r) ? (r as MarketId) : countryInfoByA3[r] ? mkOf(r) : undefined);
/** Tendência regional (multiplicador ≈ 0,6–1,6) da família num mercado; ausente = 1. */
export const rTrend29 = (s: GameState, mk: MarketId | undefined, fam: string): number => (mk ? demo29(s).rp[mk]?.[fam] ?? 1 : 1);

/** Preferência relativa (≈0,35–2,4; 1 = neutra) de quem tem `age` anos, na região (mercado ou país a3), pelo gênero,
 *  no ano `y`: novidade (jovem adota gênero novo; velho estranha) × nostalgia (a música da juventude da coorte) ×
 *  tendência regional. */
export function taste29(s: GameState, age: number, region: string | undefined, genre: string, y = s.year): number {
  const g = genreById[genre];
  const fam = g?.family ?? familyOf(genre);
  const born = y - age;
  const youth = born + 18;
  // nostalgia: quanto a família pesava na juventude da coorte (relativo à média daquele tempo)
  const wn = clamp((age - 20) / 25, 0, 1) * 0.85;
  const nost = Math.pow(clamp(histPop29(s, fam, Math.min(youth, y)) / avgPop(s, Math.min(youth, y)), 0.15, 2.5), wn);
  // novidade: o gênero é novo? (jovem: +, mais velho: −)
  const gAge = Math.max(0, y - (g?.born ?? FAM_BORN[fam] ?? 1950));
  const yF = clamp((30 - age) / 15, -1, 1);
  const nov = 1 + 0.45 * yF * Math.exp(-gAge / 10);
  const reg = y === s.year ? Math.sqrt(rTrend29(s, regionOf(region), fam)) : 1;
  return clamp(nost * nov * reg, 0.35, 2.4);
}

// ---------------------------------------------------------------- perfil de entrada (quem vira fã agora)

/** alcance da descoberta musical por idade na época (rádio/TV → streaming/vídeo curto) */
function reach29(s: GameState, y: number): number[] {
  const base = [1.3, 1.5, 1.0, 0.6, 0.35];
  const st = s.techDates.streaming, sv = s.techDates.short_video;
  const dig = (st !== undefined && y >= st ? 1 : 0) + (sv !== undefined && y >= sv ? 1 : 0);
  if (!dig) return base;
  const k = [1.12, 1.08, 1, 0.94, 0.88];
  return base.map((x, i) => x * Math.pow(k[i], dig));
}
/** idade mediana da formação no ano (solo = a pessoa) */
export function artistAge29(s: GameState, a: Act, y = s.year): number {
  const ages = a.members.map((id) => s.persons[id]).filter((p) => p && p.born).map((p) => y - p!.born).sort((x, z) => x - z);
  if (ages.length) return ages[Math.floor(ages.length / 2)];
  return 23 + Math.max(0, y - (a.debutYear || a.formed || y));
}
const YS = [1, 0.6, 0, -0.4, -0.7];
/** público-alvo do projeto (recipe12/project12) → peso por faixa */
const AUD_W: Record<string, number[]> = {
  young: [1.45, 1.3, 1, 0.8, 0.65], adult: [0.7, 0.9, 1.25, 1.25, 1.0], critics: [0.8, 1.1, 1.15, 1.0, 0.9], core: [1, 1, 1, 1, 1],
};
/** canal de marketing → idade de quem ele alcança */
export const CH_AGE29: Record<string, number[]> = {
  radio_plug: [0.9, 1.0, 1.1, 1.1, 1.0], press: [0.6, 0.9, 1.15, 1.2, 1.1], sheet_music: [0.6, 0.8, 1.1, 1.2, 1.2], tv_show: [1.0, 0.9, 1.0, 1.1, 1.3],
  jukebox: [1.4, 1.3, 0.9, 0.6, 0.5], music_video: [1.4, 1.3, 1.0, 0.7, 0.5], street_team: [1.1, 1.4, 1.0, 0.6, 0.4], web_forums: [1.0, 1.3, 1.2, 0.8, 0.5],
  playlists: [1.2, 1.35, 1.1, 0.8, 0.5], social: [1.4, 1.3, 1.0, 0.7, 0.5], short_clips: [1.7, 1.4, 0.9, 0.5, 0.3], neural_feed: [1.3, 1.3, 1.1, 0.8, 0.6],
};
/** juventude dos canais de lançamento (outlets17.youth) */
const OUT_YOUTH29: Record<string, number> = { jukebox_ops: 1, video: 2, streaming: 1, window: -2, short_video: 2 };
/** formato de rádio (radio18) → idade de quem ouve */
export const RADIO_AGE29: Record<string, number[]> = {
  network: [1.0, 1.0, 1.0, 1.1, 1.2], top40: [1.5, 1.3, 0.9, 0.6, 0.4], adult: [0.5, 0.8, 1.2, 1.3, 1.2], aor: [0.8, 1.3, 1.2, 0.9, 0.6], urban: [1.3, 1.3, 1.0, 0.7, 0.5],
  country: [0.8, 1.0, 1.1, 1.1, 1.2], college: [0.9, 1.6, 1.0, 0.5, 0.3], latin: [1.0, 1.1, 1.1, 1.0, 1.0], dance: [1.3, 1.5, 1.0, 0.5, 0.3],
};
/** projeto (proj8/proj12) que gerou o lançamento → público-alvo */
export function relAud29(s: GameState, rel: Release): string | undefined {
  const x = s.x4 as unknown as { proj8?: { list: { id: string; releaseId?: string }[] }; proj12?: { meta: Record<string, { aud?: string }> } };
  const p = x.proj8?.list.find((q) => q.releaseId === rel.id);
  return p ? x.proj12?.meta[p.id]?.aud : undefined;
}
/** redescoberta ativa do ato → geração que redescobre (pesos) e por quê */
function revivalSkew(s: GameState, a: Act, y: number): { w: number[]; why: L } | null {
  const x = s.x4 as unknown as { revival19?: { rv: { act: string; until: number; k: string; rel: string }[] }; audience8?: { rev: { rel: string; until: number }[] } };
  const rv = x.revival19?.rv.find((r) => r.act === a.id && r.until > s.week);
  const au = x.audience8?.rev.find((r) => r.until >= s.week && s.releases[r.rel]?.actId === a.id);
  const k = rv?.k ?? (au ? (hasTech(s, 'short_video') ? 'short' : hasTech(s, 'streaming') ? 'viral' : 'radio_ad') : undefined);
  if (!k) return null;
  const rel = s.releases[rv?.rel ?? au?.rel ?? ''];
  if (['short', 'viral', 'remix', 'game', 'series'].includes(k)) return { w: [2.2, 2.0, 1.0, 0.5, 0.4], why: l('filhos descobrem pelo streaming/vídeo curto', 'kids find it via streaming/short video') };
  // comercial, filme, documentário: acorda a coorte original (quem tinha ~18 no lançamento) e os pais de hoje
  const orig = bandOf29(18 + (y - (rel?.year ?? y)));
  const w = [0.5, 0.6, 0.9, 1.3, 1.2];
  w[orig] += 1.5;
  return { w, why: l('a geração original volta (comercial, filme, TV)', 'the original generation comes back (ad, film, TV)') };
}
export interface Inflow29 { w: number[]; parts: { label: L; w: number[] }[] }
/** Perfil de quem vira fã do ato no ano `y` (soma 1), com as partes (para o "por quê"). `extra` liga alvo/canais/revival. */
export function inflow29(s: GameState, a: Act, y = s.year, extra = true): Inflow29 {
  const mk = cityById[a.city]?.market ?? 'na';
  const parts: Inflow29['parts'] = [];
  const dem = demog29(mk, y); parts.push({ label: l('Demografia do mercado na época', 'Market demographics in the era'), w: dem });
  const rch = reach29(s, y); parts.push({ label: l('Quem descobre música nova (mídia da época)', 'Who discovers new music (era media)'), w: rch });
  const tst = AGE29.map((b) => taste29(s, b.mid, mk, a.genre, y)); parts.push({ label: l('Gosto de cada geração pelo gênero', 'Each generation\'s taste for the genre'), w: tst });
  const A = artistAge29(s, a, y);
  const aim = A * 0.85;
  const art = AGE29.map((b) => Math.pow(Math.exp(-Math.max(0, Math.abs(b.mid - aim) - 6) / 18), 0.7)); parts.push({ label: fmtL(l('Idade do artista ({n})', 'Artist age ({n})'), { n: Math.round(A) }), w: art });
  const pos = YS.map((k) => 1 + ((a.positioning - 50) / 250) * k); parts.push({ label: l('Posicionamento (crossover puxa jovens)', 'Positioning (crossover pulls youth)'), w: pos });
  let w = dem.map((x, i) => x * rch[i] * tst[i] * art[i] * pos[i]);
  if (extra) {
    const rels = a.releases.slice(-4).map((id) => s.releases[id]).filter((r): r is Release => !!r && s.week - r.week <= 26 && s.week >= r.week);
    for (const r of rels) {
      const aud = relAud29(s, r);
      if (aud && AUD_W[aud]) { w = w.map((x, i) => x * AUD_W[aud][i]); parts.push({ label: fmtL(l('Público-alvo do projeto "{t}"', 'Target audience of "{t}"'), { t: r.title }), w: AUD_W[aud] }); }
      // canais de lançamento (outlets17: jukebox, vídeo, vídeo curto puxam jovens; janela sem streaming os afasta)
      const ys = ((s.x4 as unknown as { out17?: { rel: Record<string, string[]> } }).out17?.rel[r.id] ?? []).reduce((t2, id) => t2 + (OUT_YOUTH29[id] ?? 0), 0);
      if (ys) { const ow = YS.map((k) => Math.max(0.5, 1 + 0.12 * ys * k)); w = w.map((x, i) => x * ow[i]); parts.push({ label: fmtL(l('Canais de venda de "{t}"', 'Retail outlets of "{t}"'), { t: r.title }), w: ow }); }
      // rotação nas rádios (radio18): o formato da estação decide a idade de quem ouve
      const rot = (s.x4 as unknown as { radio18?: { rot: Record<string, { st: string }[]>; st: { id: string; fmt: string }[] } }).radio18;
      const fm = (rot?.rot[r.id] ?? []).map((x) => RADIO_AGE29[rot!.st.find((k) => k.id === x.st)?.fmt ?? '']).filter(Boolean);
      if (fm.length) { const rw = fm[0].map((_, i) => fm.reduce((t2, f) => t2 + f[i], 0) / fm.length); w = w.map((x, i) => x * Math.sqrt(rw[i])); parts.push({ label: fmtL(l('Rádios que tocam "{t}"', 'Radio stations playing "{t}"'), { t: r.title }), w: rw.map(Math.sqrt) }); }
      const chs = r.marketing.map((m) => CH_AGE29[m.channel]).filter(Boolean);
      if (chs.length) { const cw = chs[0].map((_, i) => chs.reduce((t, c) => t + c[i], 0) / chs.length); w = w.map((x, i) => x * Math.sqrt(cw[i])); parts.push({ label: fmtL(l('Canais de "{t}"', 'Channels of "{t}"'), { t: r.title }), w: cw.map(Math.sqrt) }); }
    }
    const rv = revivalSkew(s, a, y);
    if (rv) { w = w.map((x, i) => x * rv.w[i]); parts.push({ label: fmtL(l('Redescoberta: {w}', 'Rediscovery: {w}'), { w: rv.why }), w: rv.w }); }
  }
  return { w: norm(w), parts };
}

// ---------------------------------------------------------------- mistura (guardada ou derivada)

/** rolagem anual: 1/largura de cada faixa sobe para a próxima; 50+ perde ~4%/ano (sai de cena) */
export function roll29(b: number[]): number[] {
  const o = [...b];
  for (let i = NB29 - 2; i >= 0; i--) { const mv = b[i] / AGE29[i].w; o[i] -= mv; o[i + 1] += mv; }
  o[NB29 - 1] *= 0.96;
  return norm(o);
}
const lastRelYear = (s: GameState, a: Act): number => { let y = a.debutYear || a.formed || s.year; for (const id of a.releases) { const r = s.releases[id]; if (r && r.year > y) y = r.year; } return y; };
/** Mistura inicial (migração de saves e atos sem registro): simula a carreira desde a estreia — o público entra com o
 *  perfil de cada ano e envelhece; com o ato parado, a troca quase some e a base envelhece. */
export function seed29(s: GameState, a: Act): number[] {
  const y1 = s.year;
  const y0 = clamp(Math.min(a.debutYear || a.formed || y1, y1), y1 - 70, y1);
  const lr = lastRelYear(s, a);
  let b = inflow29(s, a, y0, false).w;
  for (let y = y0 + 1; y <= y1; y++) {
    b = roll29(b);
    const act = y <= lr + 1 && liveA(a) ? 1 : y <= lr + 1 ? 0.8 : 0.25;
    const repl = (y - y0 <= 3 ? 0.35 : 0.12) * act;
    const w = inflow29(s, a, y, false).w;
    b = b.map((x, i) => x * (1 - repl) + w[i] * repl);
  }
  return norm(b);
}
/** assinatura do que a semente lê do ato (a mistura derivada é função pura disso + curvas do ano) */
const sig29 = (s: GameState, a: Act): string => `${a.id}|${a.genre}|${a.city}|${a.debutYear}|${a.formed}|${lastRelYear(s, a)}|${liveA(a) ? 1 : 0}|${Math.round(a.positioning)}|${a.members.map((id) => s.persons[id]?.born ?? 0).join(',')}`;
/** Fatias por faixa (0..1, soma 1) do público do ato: guardadas (seus atos e estrelas) ou derivadas da carreira. */
export function ageMix29(s: GameState, a: Act): number[] {
  const d = demo29(s).a[a.id];
  if (d) return d.b.map((x) => x / 1000);
  const c = hc(s), k = sig29(s, a);
  let v = c.der.get(k);
  if (!v) { v = seed29(s, a); c.der.set(k, v); }
  return v;
}
/** fãs por faixa (inteiros que somam o total atual) */
export function ageFans29(s: GameState, a: Act): number[] {
  const n = Math.round(total(a)), mix = ageMix29(s, a);
  const f = mix.map((x) => x * n), out = f.map(Math.floor);
  let rest = n - out.reduce((x, y) => x + y, 0);
  const ord = f.map((x, i) => [x - Math.floor(x), i] as [number, number]).sort((x, y) => y[0] - x[0] || x[1] - y[1]);
  for (let k = 0; rest > 0 && ord.length; k = (k + 1) % ord.length, rest--) out[ord[k][1]]++;
  return out;
}
/** idade do núcleo: guardada, ou ~3 anos mais velha que a base (quem fica é quem chegou antes) */
export function coreMix29(s: GameState, a: Act): number[] {
  const d = demo29(s).a[a.id];
  if (d?.k) return d.k.map((x) => x / 1000);
  return roll29(roll29(roll29(ageMix29(s, a))));
}
/** idade de casuais + ativos: o total menos o núcleo (por faixa) */
export function casualMix29(s: GameState, a: Act): number[] {
  const T = total(a), C = Math.max(0, Math.min(T, a.fans.core));
  if (T - C <= 0) return ageMix29(s, a);
  const b = ageMix29(s, a), k = coreMix29(s, a);
  return norm(b.map((x, i) => Math.max(0, x * T - k[i] * C)));
}
/** fãs por faixa em cada coorte: núcleo e casuais + ativos (inteiros que somam os totais) */
export function poolFans29(s: GameState, a: Act): { core: number[]; rest: number[] } {
  const ap = (mix: number[], n: number) => { const f = mix.map((x) => x * n), o = f.map(Math.floor); let r = n - o.reduce((x, y) => x + y, 0); const ord = f.map((x, i) => [x - Math.floor(x), i] as [number, number]).sort((x, y) => y[0] - x[0] || x[1] - y[1]); for (let q = 0; r > 0 && ord.length; q = (q + 1) % ord.length, r--) o[ord[q][1]]++; return o; };
  const C = Math.max(0, Math.round(a.fans.core)), R = Math.max(0, Math.round(total(a)) - C);
  return { core: ap(coreMix29(s, a), C), rest: ap(casualMix29(s, a), R) };
}
/** atalhos de leitura */
export const youth29 = (b: number[]) => b[0] + b[1];
export const older29 = (b: number[]) => b[3] + b[4];

// ---------------------------------------------------------------- região: mercados e países

/** Base por país (soma 1 no mundo): fama local × tamanho do mercado × diáspora do gênero (regions18). */
const CBS = new WeakMap<object, { k: string; m: Map<string, Map<string, number>> }>();
export function countryBase29(s: GameState, a: Act): Map<string, number> {
  const ck = `${s.week}|${demo29(s).v ?? 0}`;
  let CB = CBS.get(s);
  if (!CB || CB.k !== ck) { CB = { k: ck, m: new Map() }; CBS.set(s, CB); }
  const hit = CB.m.get(a.id);
  if (hit) return hit;
  const out = new Map<string, number>();
  CB.m.set(a.id, out);
  let t = 0;
  for (const c of COUNTRY_INFO) {
    const sub = subOfA3_18(c.a3);
    const dia = sub ? dias18(sub, a.genre, s.year).v : 0;
    const v = countryMarketSize(c, s.year) * (0.5 + fameIn(s, a, c.a3)) * (1 + Math.min(1, dia));
    out.set(c.a3, v); t += v;
  }
  if (t > 0) for (const [k, v] of out) out.set(k, v / t);
  return out;
}
export interface RegionMix29 { mk: Record<MarketId, number>; top: { a3: string; v: number; local: boolean }[] }
/** Onde estão os fãs: fatia por mercado (livro terr20 nos seus atos; fama regional nos outros) e os maiores países
 *  (países guardados nos seus atos; base de fama/diáspora nos outros). */
export function regionMix29(s: GameState, a: Act, n = 8): RegionMix29 {
  const mk = mineA(a) ? share20(s, a) : target20(s, a);
  const d = demo29(s).a[a.id];
  const base = countryBase29(s, a);
  const st = new Map<string, number>((d?.c ?? []).map(([k, v]) => [k, v / 1000]));
  const home = countryOfCity(a.city);
  // países guardados valem como estão; o resto do mercado se divide pela base
  const rows: { a3: string; v: number; local: boolean }[] = [];
  const stByMk: Partial<Record<MarketId, number>> = {}, baseRest: Partial<Record<MarketId, number>> = {};
  for (const [k, v] of st) stByMk[mkOf(k)] = (stByMk[mkOf(k)] ?? 0) + v;
  for (const [k, v] of base) if (!st.has(k)) baseRest[mkOf(k)] = (baseRest[mkOf(k)] ?? 0) + v;
  for (const [k, v] of base) {
    const m = mkOf(k);
    if (st.has(k)) { rows.push({ a3: k, v: st.get(k)!, local: k === home }); continue; }
    const room = Math.max(0, (mk[m] ?? 0) - (stByMk[m] ?? 0));
    rows.push({ a3: k, v: (baseRest[m] ?? 0) > 0 ? room * v / baseRest[m]! : 0, local: k === home });
  }
  rows.sort((x, y) => y.v - x.v || (x.a3 < y.a3 ? -1 : 1));
  return { mk, top: rows.slice(0, n) };
}

// ---------------------------------------------------------------- mês

const SEL_NPC = 60;
function storedSet(s: GameState): Set<string> {
  const set = new Set<string>();
  for (const id of playerActs(s)) { const a = s.acts[id]; if (a && liveA(a)) set.add(id); }
  const npc = actsNow27(s).filter((a) => !(a.owner === 'player' || a.playerBand) && liveA(a) && a.fame >= 45).sort((x, y) => y.fame - x.fame || (x.id < y.id ? -1 : 1)).slice(0, SEL_NPC);
  for (const a of npc) set.add(a.id);
  return set;
}
/** saída por faixa (jovem é mais volúvel) */
const LEAVE = [1.4, 1.2, 1.0, 0.8, 0.7];

function stepAct(s: GameState, a: Act, d: D29Act, viral: boolean): void {
  const T = total(a), T0 = d.n;
  let b = d.b.map((x) => x / 1000);
  const inf = inflow29(s, a).w;
  // troca mensal: sai gente (mais jovem) e entra pelo perfil — maior com momento alto
  const repl = 0.003 + 0.01 * (a.momentum / 100) + (viral ? 0.01 : 0);
  const lw = norm(b.map((x, i) => x * LEAVE[i]));
  b = b.map((x, i) => Math.max(0, x - lw[i] * repl) + inf[i] * repl);
  if (T0 > 0 && T > 0 && Math.abs(T - T0) >= 1) {
    if (T > T0) { const g = (T - T0) / T; b = b.map((x, i) => x * (1 - g) + inf[i] * g); }
    else { const g = (T0 - T) / T0; const lw2 = norm(b.map((x, i) => x * LEAVE[i])); b = b.map((x, i) => Math.max(0, x - lw2[i] * g)); }
  }
  d.b = permille(b);
  d.n = Math.round(T);
  // núcleo: quem entra no núcleo vem da base de ~1 ano antes (já era fã); troca bem mais lenta
  const C = Math.max(0, a.fans.core), C0 = d.nk ?? C;
  let k = (d.k ?? permille(roll29(roll29(roll29(b))))).map((x) => x / 1000);
  const kin = roll29(b);
  const kr = repl / 3;
  const lk = norm(k.map((x, i) => x * LEAVE[i]));
  k = k.map((x, i) => Math.max(0, x - lk[i] * kr) + kin[i] * kr);
  if (C0 > 0 && C > 0 && Math.abs(C - C0) >= 1) {
    if (C > C0) { const g = (C - C0) / C; k = k.map((x, i) => x * (1 - g) + kin[i] * g); }
    else { const g = (C0 - C) / C0; const lk2 = norm(k.map((x, i) => x * LEAVE[i])); k = k.map((x, i) => Math.max(0, x - lk2[i] * g)); }
  }
  d.k = permille(k);
  d.nk = Math.round(C);
}

function stepCountries(s: GameState, a: Act, d: D29Act): void {
  const base = countryBase29(s, a), T = Math.max(1, total(a));
  const cur = new Map<string, number>((d.c ?? []).map(([k, v]) => [k, v / 1000]));
  const pend = demo29(s).pc[a.id] ?? {};
  const keys = new Set<string>([...cur.keys(), ...Object.keys(pend), ...[...base].sort((x, y) => y[1] - x[1]).slice(0, 8).map((x) => x[0])]);
  const next: [string, number][] = [];
  for (const k of keys) {
    const b0 = base.get(k) ?? 0;
    const v = (cur.has(k) ? cur.get(k)! * 0.92 + b0 * 0.08 : b0) + Math.min(0.2, (pend[k] ?? 0) / T);
    next.push([k, v]);
  }
  next.sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
  d.c = next.slice(0, 8).map(([k, v]) => [k, Math.round(clamp(v, 0, 1) * 1000)] as [string, number]).filter((x) => x[1] > 0);
  delete demo29(s).pc[a.id];
}

/** tendência regional: fatia de cada família nas paradas do mercado ÷ fatia mundial; média ponderada = 1 */
function stepRegional(s: GameState): void {
  const st = demo29(s);
  const share = (key: string): Record<string, number> => {
    const out: Record<string, number> = {}; let t = 0;
    for (const row of board(s, key, 'songs')) { const g = styleOfRel17(s, row.relId); if (!g) continue; const f = familyOf(g); const x = 21 - row.pos; out[f] = (out[f] ?? 0) + x; t += x; }
    if (t > 0) for (const k of Object.keys(out)) out[k] /= t;
    return out;
  };
  const world = share('world');
  const size = Object.fromEntries(MK.map((m) => [m, MARKETS.find((x) => x.id === m)!.size(s.year)])) as Record<MarketId, number>;
  const sz = MK.reduce((t, m) => t + size[m], 0) || 1;
  for (const f of FAMS) {
    const raw: Record<string, number> = {};
    for (const m of MK) {
      const base = MARKET_PREF[m][f as FamilyId] ?? 0.6;
      const sh = share(`r:${m}`);
      const chart = Object.keys(sh).length ? Math.sqrt(clamp(((sh[f] ?? 0) + 0.03) / ((world[f] ?? 0) + 0.03), 0.4, 2.5)) : 1;
      raw[m] = base * chart;
    }
    const mean = MK.reduce((t, m) => t + raw[m] * size[m], 0) / sz || 1;
    for (const m of MK) {
      const tg = clamp(raw[m] / mean, 0.4, 2.2);
      const rp = (st.rp[m] ??= {});
      const cur = rp[f] ?? tg;
      rp[f] = Math.round((cur + (tg - cur) * 0.12) * 1000) / 1000;
    }
  }
}

function recordHistory(s: GameState): void {
  const st = demo29(s), y = s.year, k = String(bin5(y));
  for (const f of FAMS) {
    const v = st.gp?.[f];
    if (v === undefined) continue;
    const g = (st.gh[f] ??= {});
    g[k] = g[k] === undefined ? Math.round(v * 100) / 100 : Math.round((g[k] * 0.75 + v * 0.25) * 100) / 100;
  }
}

function logIt(s: GameState, t: L): void { const st = demo29(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 24) st.log.length = 24; }

export function demo29Month(s: GameState): void {
  const st = demo29(s);
  // os ganchos 'month' rodam no fechamento do mês (antes de o calendário andar): dezembro fecha o ano
  const jan = s.month === 11;
  if (jan) recordHistory(s);
  st.gp = famPopLive(s);
  stepRegional(s);
  st.v = ((st.v ?? 0) + 1) % 1e6;
  const set = storedSet(s);
  for (const id of Object.keys(st.a)) if (!set.has(id)) delete st.a[id];
  for (const id of Object.keys(st.pc)) if (!set.has(id)) delete st.pc[id];
  const au = (s.x4 as unknown as { audience8?: { a: Record<string, { vw?: number }> } }).audience8?.a ?? {};
  for (const id of set) {
    const a = s.acts[id];
    if (!a) continue;
    let d = st.a[id];
    if (!d) { const sd = seed29(s, a); d = st.a[id] = { b: permille(sd), n: Math.round(total(a)), k: permille(roll29(roll29(roll29(sd)))), nk: Math.round(Math.max(0, a.fans.core)) }; if (mineA(a)) d.p = [...d.b]; }
    else {
      if (jan) { d.b = permille(roll29(d.b.map((x) => x / 1000))); if (d.k) d.k = permille(roll29(d.k.map((x) => x / 1000))); }
      const vw = au[id]?.vw;
      stepAct(s, a, d, vw !== undefined && s.week - vw < 26);
    }
    if (mineA(a)) {
      stepCountries(s, a, d);
      if (jan) {
        const was = (d.p ?? d.b).map((x) => x / 1000), now = d.b.map((x) => x / 1000);
        const dOld = older29(now) - older29(was), dYoung = youth29(now) - youth29(was);
        if (dOld >= 0.06) logIt(s, fmtL(l('O público de {a} envelheceu: {p}% tem 35 anos ou mais (+{d} p.p. no ano). Vinil, CD e edições de luxo rendem mais; singles e vídeo curto, menos.', '{a}\'s audience got older: {p}% are 35 or over (+{d} pts this year). Vinyl, CDs and deluxe editions do better; singles and short video, worse.'), { a: a.name, p: Math.round(older29(now) * 100), d: Math.round(dOld * 100) }));
        else if (dYoung >= 0.06) logIt(s, fmtL(l('{a} rejuvenesceu: {p}% do público tem até 24 anos (+{d} p.p.). Singles, streaming e vídeo curto respondem melhor.', '{a} got younger: {p}% of the audience is 24 or under (+{d} pts). Singles, streaming and short video respond better.'), { a: a.name, p: Math.round(youth29(now) * 100), d: Math.round(dYoung * 100) }));
        d.p = [...d.b];
      }
    }
  }
  for (const [id, w] of Object.entries(st.ru)) if (s.week - w > 104) delete st.ru[id];
}
registerSimHook('month', 'demo29', (s) => demo29Month(s));

// show: os fãs convertidos nascem no PAÍS onde o show aconteceu (mesma taxa do acerto do show em tours.ts)
registerSimHook('show', 'demo29', (s, _r, arg) => {
  const sh = arg.show; const a = sh ? s.acts[sh.actId] : undefined;
  if (!sh || !mineA(a)) return;
  const a3 = countryOfCity(sh.cityId);
  if (!a3) return;
  const p = (demo29(s).pc[a.id] ??= {});
  p[a3] = (p[a3] ?? 0) + Math.round(sh.sold * 0.22);
});
// volta histórica: a coorte original compra o ingresso da turnê de reunião
onFact('reunion', (s, f) => { const id = f.actors[0]; if (id && s.acts[id]) demo29(s).ru[id] = s.week; }, 'demo29:reunion');

// ---------------------------------------------------------------- efeitos

/** Depuração/balanço: DEMO29_OFF=appeal,reg,units,phys,cw,live,elast,merch,eff,scandal,revw,fest,awards,offer desliga
 *  ligações (também 'popular' e 'labels'; só no Node, para a ablação do tools/balance19; no navegador nada desliga). */
export const OFF29: Set<string> = new Set(((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.DEMO29_OFF ?? '').split(',').filter(Boolean));

/** formato × idade: quem compra cada tipo de lançamento */
export const FMT_AGE29: Record<string, number[]> = {
  single: [1.3, 1.2, 1.0, 0.85, 0.7], ep: [1.1, 1.1, 1.0, 0.9, 0.85], lp: [0.75, 0.9, 1.1, 1.2, 1.15],
  catalog: [0.5, 0.6, 0.85, 1.25, 1.6], deluxe: [0.6, 0.8, 1.1, 1.3, 1.25], live: [0.8, 0.9, 1.05, 1.15, 1.15],
};
const fmtKey = (r: Release): string => (r.reissueOf || r.kind === 'compilation' || r.kind === 'anniversary' ? 'catalog' : r.kind === 'deluxe' || r.kind === 'limited' ? 'deluxe' : r.kind === 'live' ? 'live' : r.type);
/** físico × idade (vinil, CD; jovem quase só digital) */
export const PHYS_AGE29 = [0.55, 0.7, 1.0, 1.3, 1.5];
/** ida a shows por idade */
export const ATT29 = [0.9, 1.25, 1.1, 0.8, 0.5];
/** elasticidade do ingresso por idade (jovem sente o preço; adulto paga) */
export const EL29 = [1.35, 1.2, 1.0, 0.8, 0.85];
/** gasto na banca (merch) por idade */
export const MERCH29 = [1.15, 1.05, 0.95, 1.05, 0.8];
/** referência do núcleo (≈3 anos mais velha que REF29) e mistura 50/50 com a base: quem compra na banca e o físico */
const REFK29 = roll29(roll29(roll29(REF29)));
const buyMix29 = (s: GameState, a: Act, wk: number): number[] => { const b = ageMix29(s, a), k = coreMix29(s, a); return b.map((x, i) => x * (1 - wk) + k[i] * wk); };
const relBuy29 = (mix: number[], prof: number[], wk: number) => dot(mix, prof) / dot(REF29.map((x, i) => x * (1 - wk) + REFK29[i] * wk), prof);

/** Apelo da estreia: formato × idade dos fãs e público-alvo do projeto (família 'fans' do teto por causa). */
export function appealAge29(s: GameState, rel: Release, a: Act): { k: number; fmt: number; aim: number; aud?: string } {
  const b = ageMix29(s, a);
  // antes de 1955 (78 rpm e partitura) o formato não separava gerações: metade do efeito
  const era = s.year < 1955 ? 0.5 : 1;
  const fmt = 1 + (rel29(b, FMT_AGE29[fmtKey(rel)] ?? FMT_AGE29.lp) - 1) * era;
  const aud = relAud29(s, rel);
  // mirar onde o público está rende agora; mirar fora dele rende menos agora (mas puxa a faixa nova — inflow29)
  let aim = 1;
  if (aud && aud !== 'core' && AUD_W[aud]) aim = 0.95 + 0.1 * clamp(rel29(b, AUD_W[aud]) - 0.5, 0, 1);
  return { k: clamp(fmt * aim, 0.82, 1.18), fmt, aim, aud };
}
registerMod('appeal', 'demo29', (s, v, c) => {
  if (!c.release || !c.act || OFF29.has('appeal')) return null;
  const x = appealAge29(s, c.release, c.act);
  return Math.abs(x.k - 1) < 0.005 ? null : { value: v * x.k, label: l('Idade do público × formato', 'Audience age × format') };
});
/** tendência regional nos territórios do lançamento ÷ global (família 'world') */
export function regionAppeal29(s: GameState, rel: Release, a: Act): number {
  const fam = familyOf(a.genre);
  let t = 0, w = 0;
  for (const m of rel.territories) { const sz = MARKETS.find((x) => x.id === m)?.size(s.year) ?? 0; t += sz * rTrend29(s, m, fam); w += sz; }
  return w > 0 ? clamp(Math.pow(t / w, 0.4), 0.85, 1.15) : 1;
}
registerMod('appeal', 'demo29reg', (s, v, c) => {
  if (!c.release || !c.act || OFF29.has('reg')) return null;
  const k = regionAppeal29(s, c.release, c.act);
  return Math.abs(k - 1) < 0.005 ? null : { value: v * k, label: l('Tendência do gênero nas regiões do lançamento', 'Genre trend in the release regions') };
});

/** canais por idade no streaming: singles de base jovem vendem mais streams; álbum de base adulta segura o físico.
 *  Fraude (submundo, FRAUD29): o excedente de streams entra aqui e nunca vira fã (stream18/terr20 não contam). */
export function unitsAge29(s: GameState, rel: Release, a: Act): number {
  const st = s.techDates.streaming;
  if (st === undefined || s.year < st) return 1;
  const b = ageMix29(s, a), dig = clamp((s.year - st + 1) / 6, 0, 1);
  const yv = youth29(b) - (REF29[0] + REF29[1]), ov = older29(b) - (REF29[3] + REF29[4]);
  const single = rel.type === 'single';
  return clamp(1 + dig * (single ? 0.25 * yv - 0.1 * ov : 0.12 * ov - 0.05 * yv), 0.9, 1.1);
}
registerMod('chartUnits', 'demo29', (s, v, c) => {
  const rel = c.release, a = rel ? s.acts[rel.actId] : undefined;
  if (!rel || !a) return null;
  const k = (OFF29.has('units') ? 1 : unitsAge29(s, rel, a)) * fraud29(s, rel);
  return Math.abs(k - 1) < 0.003 ? null : { value: v * k, label: l('Idade do público × canal (streaming)', 'Audience age × channel (streaming)') };
});

// fatia física (eras18): base mais velha compra vinil/CD por mais tempo
DEMO29.phys = (s, rel) => {
  const a = s.acts[rel.actId];
  if (!a || OFF29.has('phys') || !hasTech(s, 'download') && !hasTech(s, 'streaming')) return 1;
  return clamp(relBuy29(buyMix29(s, a, 0.4), PHYS_AGE29, 0.4), 0.7, 1.35); // núcleo pesa 40% (coleciona)
};

// paradas por país: país onde o ato tem mais fãs do que a base explica leva mais das unidades (só atos com países)
const CWS = new WeakMap<object, { k: string; m: Map<string, Float64Array | null> }>();
DEMO29.cw = (s, rel, a) => {
  const ck = `${s.week}|${demo29(s).v ?? 0}`;
  let CW = CWS.get(s);
  if (!CW || CW.k !== ck) { CW = { k: ck, m: new Map() }; CWS.set(s, CW); }
  if (OFF29.has('cw')) return null;
  const hit = CW.m.get(a.id);
  if (hit !== undefined) return hit;
  const d = demo29(s).a[a.id];
  const fam = familyOf(a.genre);
  const rp = demo29(s).rp;
  let out: Float64Array | null = null;
  const anyRp = Object.keys(rp).length > 0;
  if (anyRp || d?.c?.length) {
    out = new Float64Array(COUNTRY_INFO.length).fill(1);
    if (anyRp) for (let i = 0; i < COUNTRY_INFO.length; i++) out[i] = Math.sqrt(rTrend29(s, COUNTRY_INFO[i].market, fam));
    if (d?.c?.length) {
      const base = countryBase29(s, a);
      for (const [k, v] of d.c) { const i = COUNTRY_INFO.findIndex((c) => c.a3 === k); const b0 = base.get(k) ?? 0; if (i >= 0 && b0 > 0) out[i] *= clamp(Math.sqrt(v / 1000 / b0), 0.6, 2.2); }
    }
  }
  CW.m.set(a.id, out);
  return out;
};

/** público na cidade: idade (quem vai a show) × fãs no país além do que o mercado explica × turnê de reunião */
export function cityAge29(s: GameState, a: Act, cityId: string): { k: number; att: number; loc: number; ru: number } {
  const b = ageMix29(s, a);
  const att = clamp(rel29(b, ATT29), 0.82, 1.15);
  let loc = 1;
  const d = demo29(s).a[a.id], a3 = countryOfCity(cityId);
  if (d?.c?.length && a3) {
    const c = d.c.find((x) => x[0] === a3);
    if (c) {
      const base = countryBase29(s, a), m = mkOf(a3);
      const mkS = share20(s, a)[m] ?? 0, mkB = MK.length ? [...base].filter(([k]) => mkOf(k) === m).reduce((t, [, v]) => t + v, 0) : 0;
      const b0 = base.get(a3) ?? 0;
      if (b0 > 0 && mkS > 0 && mkB > 0) loc = clamp(Math.pow((c[1] / 1000 / mkS) / (b0 / mkB), 0.3), 0.9, 1.15);
    }
  }
  const w = demo29(s).ru[a.id];
  const ru = w !== undefined && s.week - w <= 104 ? 1 + 0.3 * older29(b) : 1;
  return { k: att * loc * ru, att, loc, ru };
}
registerMod('cityDemand', 'demo29', (s, v, c) => {
  if (!c.act || !c.cityId || OFF29.has('live')) return null;
  const x = cityAge29(s, c.act, c.cityId);
  return Math.abs(x.k - 1) < 0.005 ? null : { value: v * x.k, label: x.ru > 1 ? l('Turnê de reunião: a geração original volta', 'Reunion tour: the original generation returns') : l('Idade e país dos fãs', 'Fans\' age and country') };
});
const WEALTH29: Record<string, number> = { na: 1.25, eu: 1.15, oceania: 1.15, asia: 1, br: 0.75, latam: 0.75, africa: 0.6 };
// ingresso: jovem sai quando o preço sobe; adulto de mercado rico paga
DEMO29.elast = (s, a, cityId) => OFF29.has('elast') ? 1 : clamp(rel29(ageMix29(s, a), EL29) / Math.pow(WEALTH29[cityById[cityId]?.market ?? 'na'] ?? 1, 0.3), 0.7, 1.35);
registerMod('showRevenue', 'demo29', (s, v, c) => {
  if (!c.act || OFF29.has('merch')) return null;
  const k = clamp(relBuy29(buyMix29(s, c.act, 0.5), MERCH29, 0.5), 0.92, 1.08); // núcleo pesa metade na banca
  return Math.abs(k - 1) < 0.005 ? null : { value: v * k, label: l('Banca: quanto cada idade gasta', 'Merch stand: spend by age') };
});

// mídia (só seus atos — MEDIA18.eff): o canal rende mais quando alcança a idade do público do ato
const prevEff = MEDIA18.eff;
export const chanFit29 = (s: GameState, a: Act, ch: string): number => (CH_AGE29[ch] ? clamp(Math.sqrt(rel29(ageMix29(s, a), CH_AGE29[ch])), 0.82, 1.2) : 1);
MEDIA18.eff = (s, actId, ch) => { const base = prevEff ? prevEff(s, actId, ch) : 1; const a = s.acts[actId]; return a && !OFF29.has('eff') ? base * chanFit29(s, a, ch) : base; };

// escândalo: jovem perdoa mais rápido; purista mais velho não (fanscandal28)
DEMO29.scandal = (s, a, kind, fac) => {
  if (OFF29.has('scandal')) return 0;
  const b = casualMix29(s, a), k = coreMix29(s, a);
  // mainstream/comunidade = os casuais e ativos; purista = o núcleo (que é mais velho)
  const yv = youth29(b) - (REF29[0] + REF29[1]), ov = older29(k) - (REFK29[3] + REFK29[4]);
  if (fac === 'main' || fac === 'comm') return 0.35 * yv;
  if (fac === 'purist' && kind !== 'politics' && kind !== 'blasphemy') return -0.35 * ov;
  return 0;
};

// redescoberta: o ciclo de nostalgia (~25 anos: quem era jovem no lançamento chega à idade de decidir trilha e comercial)
DEMO29.revW = (s, rel) => { if (OFF29.has('revw')) return 1; const age = s.year - rel.year; return 1 + 0.8 * Math.exp(-(((age - 25) / 6) ** 2)); };

// festival: público do festival (foco de gêneros → idade) × público do ato
const FEST_AGE = new Map<string, number[]>();
export function festAge29(s: GameState, f: { name: string; focus: string[]; city: string }): number[] {
  const k = `${f.name}|${s.year}`;
  const hit = FEST_AGE.get(k);
  if (hit) return hit;
  const mk = cityById[f.city]?.market ?? 'na', dem = demog29(mk, s.year), rch = reach29(s, s.year);
  const fams = f.focus.length ? f.focus : ['pop', 'rock'];
  const g = (fam: string) => GENRES.find((x) => x.family === fam && x.born <= s.year)?.id ?? 'pop';
  const w = norm(AGE29.map((b, i) => dem[i] * rch[i] * ATT29[i] * fams.reduce((t, fam) => t + taste29(s, b.mid, mk, g(fam)), 0) / fams.length));
  if (FEST_AGE.size > 400) FEST_AGE.clear();
  FEST_AGE.set(k, w);
  return w;
}
const cos = (a: number[], b: number[]) => dot(a, b) / Math.sqrt(dot(a, a) * dot(b, b) || 1);
DEMO29.fest = (s, f, a) => OFF29.has('fest') ? 1 : 0.85 + 0.3 * clamp((cos(festAge29(s, f), ageMix29(s, a)) - 0.75) / 0.25, 0, 1);

// prêmios: corpo de votantes mais velho (awards18) favorece público mais velho; categorias com voto popular/redes, o jovem
REL_ADJ19.push((s, rel) => {
  const a = s.acts[rel.actId];
  if (!a || OFF29.has('awards')) return null;
  const v = voters18(s), b = ageMix29(s, a);
  const pts = Math.round(clamp((older29(b) - 0.45) * 10 * ((v.age - 38) / 12) + (youth29(b) - 0.3) * 10 * v.young, -4, 4));
  return pts ? [fmtL(l('Idade dos votantes ({v}) × idade do público', 'Voter age ({v}) × audience age'), { v: v.age }), pts] : null;
});

// ofertas: carreiras de fama/status/dinheiro querem um selo que alcança o público delas (perfil do seu elenco)
export function labelMix29(s: GameState, except?: string): number[] | null {
  const ids = playerActs(s).filter((id) => id !== except && s.acts[id] && !s.acts[id].playerBand);
  if (!ids.length) return null;
  const w = [0, 0, 0, 0, 0];
  for (const id of ids) { const a = s.acts[id], n = Math.max(1, total(a)), b = ageMix29(s, a); for (let i = 0; i < NB29; i++) w[i] += b[i] * Math.sqrt(n); }
  return norm(w);
}
registerOfferMod('demo29', (s, act) => {
  const amb = mainAmbition(s, act);
  if (OFF29.has('offer') || amb !== 'fame' && amb !== 'status' && amb !== 'money') return null;
  const lm = labelMix29(s, act.id);
  if (!lm) return null;
  const delta = Math.round(clamp((cos(lm, ageMix29(s, act)) - 0.85) / 0.15, -1, 1) * 0.04 * 1000) / 1000;
  return Math.abs(delta) < 0.005 ? null : { delta, reason: delta > 0 ? l('Seu elenco fala com o mesmo público (idade)', 'Your roster reaches the same audience (age)') : l('Seu elenco fala com outra geração', 'Your roster reaches another generation') };
});

// ---------------------------------------------------------------- conselheiro e "por quê"

registerAdvisorTip('demo29', (s) => {
  const out: AdvTip18[] = [];
  for (const id of playerActs(s)) {
    const a = s.acts[id], d = demo29(s).a[id];
    if (!a || !d || total(a) < 2000) continue;
    const b = d.b.map((x) => x / 1000);
    if (older29(b) >= 0.55) out.push({ id: `demo29-old-${id}`, level: 'info', cat: 'release', score: 31,
      text: fmtL(l('Seu público envelheceu: {p}% dos fãs de {a} têm 35+. Vinil, CD e edição de luxo vendem mais; single e vídeo curto, menos.', 'Your audience got older: {p}% of {a}\'s fans are 35+. Vinyl, CD and deluxe sell more; singles and short video, less.'), { p: Math.round(older29(b) * 100), a: a.name }),
      why: [l('Formato × idade (apelo da estreia)', 'Format × age (launch appeal)'), l('Fatia física sobe com a idade', 'Physical share rises with age')], goto: { area: 'artists', act: id } });
    else if (youth29(b) >= 0.5) out.push({ id: `demo29-young-${id}`, level: 'info', cat: 'release', score: 30,
      text: fmtL(l('Público jovem: {p}% dos fãs de {a} têm até 24 anos. Singles, streaming e vídeo curto rendem mais; ingresso caro afasta.', 'Young audience: {p}% of {a}\'s fans are 24 or under. Singles, streaming and short video do better; pricey tickets push them away.'), { p: Math.round(youth29(b) * 100), a: a.name }),
      why: [l('Canal × idade e elasticidade do ingresso', 'Channel × age and ticket elasticity')], goto: { area: 'artists', act: id } });
  }
  return out.slice(0, 2);
});

registerExplain('demo29.inflow', (s, c) => {
  const a = s.acts[String(c.act ?? '')];
  if (!a) return null;
  const inf = inflow29(s, a);
  const top = inf.w.indexOf(Math.max(...inf.w));
  const parts: WhyPart[] = inf.parts.map((p) => ({ label: p.label, value: p.w.map((x) => x.toFixed(2)).join(' · '), fmt: 'text' as const }));
  return { title: l('Quem vira fã agora (13–17 · 18–24 · 25–34 · 35–49 · 50+)', 'Who becomes a fan now (13–17 · 18–24 · 25–34 · 35–49 · 50+)'), value: `${AGE29[top].name.pt}`, fmt: 'text', parts,
    note: l('Cada parte multiplica a anterior; o resultado é normalizado. Na virada do ano as faixas andam um ano.', 'Each part multiplies the previous one; the result is normalised. At each year turn the bands age one year.') };
});


/** Submundo (stream18.farm — também o 'x:streams' das organizações digitais do mob29): a fazenda já multiplica as
 *  unidades e não vira fã. Aqui só a LEITURA: os streams falsos aparecem nas plataformas como ouvintes de 13–24
 *  (é onde a fraude se esconde). Devolve a fatia falsa das unidades recentes e a mistura "como a plataforma vê". */
export function fakeYouth29(s: GameState, a: Act): { share: number; seen: number[] } {
  const farm = (s.x4 as unknown as { st18?: { farm: Record<string, { until: number; k: number }> } }).st18?.farm ?? {};
  let fake = 0, tot = 0;
  for (const id of a.releases.slice(-6)) {
    const r = s.releases[id];
    if (!r) continue;
    const u = r.weekly.slice(-4).reduce((x, y) => x + y, 0);
    tot += u;
    const f = farm[id];
    if (f && f.until > s.week && f.k > 1) fake += u * (1 - 1 / f.k);
  }
  const share = tot > 0 ? fake / tot : 0;
  const b = ageMix29(s, a);
  const seen = share > 0 ? norm(b.map((x, i) => x * (1 - share) + (i <= 1 ? share / 2 : 0))) : b;
  return { share, seen };
}

// ---------------------------------------------------------------- VOTO DO PÚBLICO (prêmio por voto popular)
// Todo novembro (desde 1955: enquete de revista adolescente; TV e depois internet ampliam o voto jovem) os fãs votam.
// Peso do voto por idade: quem tem 13–24 vota muito mais; 50+ quase não vota. Votos = fãs por faixa × peso × embalo.
// Submundo: robôs, urna cheia e voto encomendado comprados no rig29 (métodos 'bots', 'ballot', 'vote') para o ato
// viram votos FALSOS jovens; e a fazenda de streams (stream18) também infla o voto online. Ganhou com mais de 20% de
// voto falso → chance de vir à tona (Rng dedicado 'demo29|pop'): prêmio cassado e escândalo de dinheiro.

export const POP_START29 = 1955;
/** peso do voto por faixa na época (revista → TV → internet: o voto jovem cresce) */
export function voteW29(s: GameState): number[] {
  const net = hasTech(s, 'internet') ? 1 : 0, tv = hasTech(s, 'tv_music') ? 1 : 0;
  return [1.6 + 0.4 * net, 1.4 + 0.2 * tv + 0.2 * net, 0.9, 0.45, 0.25 - 0.05 * net];
}
export interface PopVote29 { act: Act; votes: number; fake: number; byAge: number[] }
/** placar do Voto do Público agora (os 40 atos com mais fãs entre quem lançou nos últimos 12 meses) */
export function popularBoard29(s: GameState, n = 10): PopVote29[] {
  const vw = voteW29(s);
  const rig = (s.x4 as unknown as { rig29?: { r: { act: string; m: string; pow: number; until: number; done?: string }[] } }).rig29?.r ?? [];
  const farm = (s.x4 as unknown as { st18?: { farm: Record<string, { until: number; k: number }> } }).st18?.farm ?? {};
  const cands = actsNow27(s).filter((a) => liveA(a) && total(a) >= 1000 && a.releases.some((id) => { const r = s.releases[id]; return !!r && s.week - r.week <= 52 && s.week >= r.week; }))
    .sort((x, y) => total(y) - total(x) || (x.id < y.id ? -1 : 1)).slice(0, 40);
  const out = cands.map((a) => {
    const f = ageFans29(s, a);
    const byAge = f.map((x, i) => x * vw[i] * (0.6 + a.momentum / 150));
    const real = byAge.reduce((x, y) => x + y, 0);
    let fake = 0;
    for (const r of rig) if (!r.done && r.act === a.id && r.until >= s.week && (r.m === 'bots' || r.m === 'ballot' || r.m === 'vote')) fake += real * Math.min(0.6, r.pow / 25);
    for (const id of a.releases.slice(-4)) { const fm = farm[id]; if (fm && fm.until > s.week) fake += real * Math.min(0.5, (fm.k - 1) * 0.4); }
    return { act: a, votes: real + fake, fake, byAge };
  });
  return out.sort((x, y) => y.votes - x.votes || (x.act.id < y.act.id ? -1 : 1)).slice(0, n);
}
function popularVote29(s: GameState): void {
  if (s.year < POP_START29 || OFF29.has('popular')) return;
  const st = demo29(s);
  if ((st.pv ?? []).some((x) => x[0] === s.year)) return;
  const top = popularBoard29(s, 1)[0];
  if (!top) return;
  const a = top.act, mine = a.owner === 'player' || !!a.playerBand, share = top.votes > 0 ? top.fake / top.votes : 0;
  const name = { pt: `Voto do Público ${s.year}`, en: `People's Vote ${s.year}` };
  recordAward(s, { year: s.year, category: 'popular29', actId: a.id, name: `${name.pt} / ${name.en}: ${a.name}`, byPlayer: mine });
  a.fame = clamp(a.fame + 1.5, 0, 100);
  a.momentum = clamp(a.momentum + 6, 0, 100);
  const young = youth29(norm(top.byAge));
  const tx = fmtL(l('{a} vence o Voto do Público {y} ({p}% dos votos vieram de quem tem até 24 anos).', '{a} wins the {y} People\'s Vote ({p}% of votes from people 24 or under).'), { a: a.name, y: s.year, p: Math.round(young * 100) });
  remember(s, 'award', tx, { actId: a.id, important: mine || a.fame >= 50 });
  if (mine) { s.player.reputation.commercial = clamp(s.player.reputation.commercial + 1, 0, 100); notify(s, tx, 'good'); }
  let revoked = 0;
  if (share > 0.2 && Rng.fromSeed(`${s.config.seed}|demo29|pop|${s.year}|${a.id}`).chance(0.3)) {
    revoked = 1;
    const i = s.awards.findIndex((e) => e.category === 'popular29' && e.year === s.year && e.actId === a.id);
    if (i >= 0) { s.awards.splice(i, 1); a.awards = Math.max(0, a.awards - 1); if (mine) s.player.stats.awards = Math.max(0, s.player.stats.awards - 1); }
    scandal(s, a.id, 'money', 35, fmtL(l('Voto do Público {y} cassado: {p}% dos votos de {a} eram robôs ou urna cheia.', '{y} People\'s Vote revoked: {p}% of {a}\'s votes were bots or ballot stuffing.'), { y: s.year, p: Math.round(share * 100), a: a.name }), { tags: ['awards', 'demo29', 'fraud'] });
  }
  (st.pv ??= []).unshift([s.year, a.id, Math.round(share * 100) / 100, revoked]);
  if (st.pv.length > 15) st.pv.length = 15;
  logIt(s, revoked ? fmtL(l('Voto do Público {y}: {a} venceu, mas o prêmio foi cassado (voto falso).', '{y} People\'s Vote: {a} won, but the prize was revoked (fake votes).'), { y: s.year, a: a.name }) : tx);
}
registerSimHook('month', 'demo29:popular', (s) => { if (s.month === 10) popularVote29(s); });

// ---------------------------------------------------------------- SELOS RIVAIS: cada um mira uma geração

/** público que o selo procura: arquétipo/estratégia (hitmaker e estrelas → jovens; catálogo → 35+; boutique e caçador
 *  de cena → 18–34) misturado com a idade do público do elenco que ele já tem (selo de roqueiros envelhecidos segue
 *  atrás de público envelhecido). Soma 1. */
/** geração que o selo procura (para a tela) */
export const labelAim29 = (lb: Label): 'young' | 'old' | 'mid' | 'flat' => (lb.archetype === 'hitmaker' || lb.strategy === 'stars' ? 'young' : lb.archetype === 'catalog' || lb.strategy === 'buy_catalog' ? 'old'
  : lb.archetype === 'boutique' || lb.archetype === 'scene_hunter' || lb.strategy === 'niche' ? 'mid' : lb.strategy === 'develop' ? 'young' : 'flat');
export function labelAge29(s: GameState, lb: Label): number[] {
  // distribuições-alvo absolutas (13–17, 18–24, 25–34, 35–49, 50+)
  const P: Record<string, number[]> = {
    young: [0.25, 0.38, 0.22, 0.10, 0.05], old: [0.04, 0.10, 0.21, 0.35, 0.30], mid: [0.10, 0.33, 0.35, 0.15, 0.07], flat: REF29,
  };
  const want = P[labelAim29(lb)];
  const ros = lb.roster.slice(0, 12).map((id) => s.acts[id]).filter((a): a is Act => !!a);
  if (!ros.length) return want;
  const rm = [0, 0, 0, 0, 0];
  for (const a of ros) ageMix29(s, a).forEach((x, i) => (rm[i] += x));
  return norm(want.map((x, i) => x + rm[i] / ros.length));
}
/** encaixe do público do ato com o que o selo procura (0,8–1,2) */
export function labelFit29(s: GameState, lb: Label, a: Act): number {
  if (OFF29.has('labels')) return 1;
  return 0.8 + 0.4 * clamp((cos(labelAge29(s, lb), ageMix29(s, a)) - 0.5) / 0.5, 0, 1);
}
DEMO29.label = (s, lb, a) => labelFit29(s, lb, a);
/** na disputa por uma oferta, o artista também pesa o selo que fala com o público dele (rival × você) */
DEMO29.rivalOffer = (s, lb, a) => {
  if (OFF29.has('labels')) return 0;
  const lm = labelMix29(s, a.id);
  const mine = lm ? cos(lm, ageMix29(s, a)) : 0.85;
  return Math.round(clamp((cos(labelAge29(s, lb), ageMix29(s, a)) - mine) / 0.3, -1, 1) * 0.04 * 1000) / 1000;
};
