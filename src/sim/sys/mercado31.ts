// R31 · onda 3 (Y · Paradas por país) — a demanda passa a ter país. Antes, as vendas eram decididas no mundo inteiro e
// só depois repartidas pelos países (charts7), sem olhar a fama do artista em cada país: o artista local pequeno sumia
// das paradas da casa, a língua quase não pesava, leis e cotas valiam no mundo todo e estrelas tinham fama 100 em todo
// lugar. Aqui (cada parte com interruptor próprio, ver r31/market31.ts):
//   y31.local   o peso de cada país na repartição segue a fama do ato ALI (fame16: base + desvio de turnê, divulgação,
//               paradas e prêmios); o desvio também soma à demanda total (turnê e divulgação vendem disco no país).
//               Regra: mais fama local, com o resto igual, nunca diminui a demanda do próprio artista.
//   y31.lang    mesma língua vende mais, língua diferente vende menos (onde o público prefere o local); o peso cai
//               com o streaming e o vídeo curto.
//   y31.laws    leis e cotas (CanCon, Toubon, Austrália, Índia, Malvinas, Coreia × Japão, Indonésia, rádios livres,
//               rádio comercial britânica, cota da associação) valem só no país da lei: bônus ao local, desconto ao
//               estrangeiro ali. Cada cota conta uma vez (a barreira regions18 e a lei regions19 eram a mesma CanCon).
//   y31.domino  nº 1 num país (últimas 8 semanas) puxa os vizinhos de mercado e quem fala a mesma língua.
//   y31.fame    a parada nacional soma um pouco à fama global, pesada pelo tamanho do país; artistas do mundo guardam
//               picos por país como o jogador (o teto da fama fora de casa mora em fame16.base16).
//   y31.reserve parte de cada parada nacional reservada aos artistas da casa (último recurso; ligado: só ele levou o Japão
//               e a Índia perto do histórico, porque há poucos artistas locais no mundo gerado).
// Determinismo: nada sorteia. O cache por semana só é preenchido dentro do mercado da semana (marketWeek → charts7);
// fora dele (interface, previsão) a conta é refeita sem gravar nada.

import { clamp } from '../../core/rng';
import { COUNTRY_INFO, countryMarketSize } from '../../data/countries';
import { countryOfCity } from '../../data/geo';
import { localPref } from '../../data/relevance';
import { cityById, familyOf, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { Y31, on31, type Y31Why } from '../r31/market31';
import { registerEditable } from '../r31/editor';
import { switchDefs, sw, setSw } from '../r31/switches';
import type { Act, GameState, Release } from '../types';
import { hasTech } from '../util';
import { baseWeights7, board, ch7 } from './charts7';
import { baseVec16 } from './fame16';
import { lawOn19 } from './regions19';
import { passed } from './world4/laws';

const NC = COUNTRY_INFO.length;
const IDX: Record<string, number> = Object.fromEntries(COUNTRY_INFO.map((c, i) => [c.a3, i]));
const LP = COUNTRY_INFO.map((c) => localPref(c.a3));
/** fama → peso de demanda (a mesma curva convexa do apelo: estrelas concentram atenção) */
export const fameF31 = (f: number): number => 0.12 + Math.pow(Math.max(0, f) / 40, 1.6);

// ---------------------------------------------------------------- língua

/** Quanto a língua pesa na época (1 até o streaming; cai a 0,6 em 8 anos; vídeo curto tira mais um quarto). */
export function langEra31(s: GameState): number {
  const st = s.techDates.streaming ?? 2008;
  let k = s.year <= st ? 1 : Math.max(0.6, 1 - (0.4 * (s.year - st)) / 8);
  if (hasTech(s, 'short_video')) k *= 0.75;
  return k;
}
/** Desconto máximo para língua estrangeira no país: onde o público prefere o local (Japão, Brasil) pesa mais. */
const MU = LP.map((x) => 0.3 * clamp((x - 1) / 1.7, 0, 1));
const SAME_LANG = 0.3;

// ---------------------------------------------------------------- leis e cotas por país

interface Quota31 { id: string; a3: string; name: L; on: (s: GameState) => boolean; k: (s: GameState, a: Act, home: string | null, lang: string, fam: string) => number }
const FOREIGN = (home: string | null, a3: string) => home !== a3;
export const QUOTAS31: Quota31[] = [
  { id: 'cancon', a3: 'CAN', name: l('CanCon: 30% de música canadense no rádio', 'CanCon: 30% Canadian music on radio'),
    on: (s) => s.year >= 1971 || lawOn19(s, 'cancon'), k: (_s, _a, h) => (FOREIGN(h, 'CAN') ? 0.92 : 1.15) },
  { id: 'toubon', a3: 'FRA', name: l('Lei Toubon: 40% de canções em francês', 'Toubon law: 40% French-language songs'),
    on: (s) => s.year >= 1996 || lawOn19(s, 'toubon'),
    k: (_s, _a, _h, lang, fam) => (lang === 'fr' ? 1.25 : ['pop', 'rock', 'rnb', 'hiphop', 'electronic', 'country_folk'].includes(fam) ? 0.88 : 1) },
  { id: 'au_quota', a3: 'AUS', name: l('Cota de música australiana', 'Australian music quota'), on: (s) => s.year >= 1942, k: (_s, _a, h) => (FOREIGN(h, 'AUS') ? 0.92 : 1.15) },
  { id: 'in_film', a3: 'IND', name: l('Índia: o cinema domina as vendas', 'India: film dominates sales'), on: (s) => s.year >= 1940,
    k: (_s, _a, h, _l, fam) => (FOREIGN(h, 'IND') && ['pop', 'rock', 'rnb', 'hiphop', 'electronic', 'country_folk', 'blues_jazz', 'europe'].includes(fam) ? 0.8 : 1) },
  { id: 'falklands', a3: 'ARG', name: l('Malvinas: rock nacional nas rádios, inglês evitado', 'Falklands: national rock on air, English avoided'),
    on: (s) => lawOn19(s, 'falklands_radio') && s.year <= 1983, k: (_s, _a, h, lang, fam) => (h === 'ARG' && fam === 'rock' ? 1.4 : lang === 'en' ? 0.6 : 1) },
  { id: 'kr_japan', a3: 'KOR', name: l('Coreia × Japão: cultura japonesa fechada ou aberta', 'Korea × Japan: Japanese culture closed or open'),
    on: (s) => s.year >= 1965, k: (s, _a, h) => (h !== 'JPN' ? 1 : lawOn19(s, 'kr_japan_open') ? (s.year <= 2004 ? 1.1 : 1) : 0.3) },
  { id: 'indo_ban', a3: 'IDN', name: l('Indonésia contra o "ngak-ngik-ngok"', 'Indonesia against "ngak-ngik-ngok"'),
    on: (s) => lawOn19(s, 'indo_ban') && s.year <= 1965, k: (_s, _a, h, _l, fam) => (h !== 'IDN' && ['rock', 'pop'].includes(fam) ? 0.6 : 1) },
  { id: 'free_radios', a3: 'FRA', name: l('Rádios livres na França', 'French free radios'),
    on: (s) => lawOn19(s, 'free_radios_fr') && s.year <= 1990, k: (_s, _a, _h, _l, fam) => (['rock', 'electronic', 'hiphop', 'africa'].includes(fam) ? 1.12 : 1) },
  { id: 'uk_radio', a3: 'GBR', name: l('Rádios comerciais novas no Reino Unido', 'New UK commercial radio'),
    on: (s) => lawOn19(s, 'uk_broadcasting_1990') && s.year <= 1996, k: (_s, _a, _h, _l, fam) => (fam === 'pop' ? 1.08 : 1) },
];
/** Cota da associação (world4): vale no país do jogador. */
function assocQuota(s: GameState, home: string | null): [number, number] | null {
  if (!passed(s, 'radio_quota')) return null;
  const me = countryOfCity(s.config.homeCity);
  const i = me ? IDX[me] : undefined;
  return i === undefined ? null : [i, home === me ? 1.1 : 0.93];
}
const LAW_LABEL = l('Leis e cotas de rádio nos países', 'Radio laws and quotas by country');

// ---------------------------------------------------------------- vetores por ato e por lançamento (semana)

interface ActY { g: Float64Array | null; g0: Float64Array | null; lang: Float64Array | null; law: Float64Array | null }
interface RelY { m: Float64Array; K: number; loc: number; law: number; dom: number }
interface Cache31 { week: number; open: boolean; acts: Map<string, ActY>; rels: Map<string, RelY>; no1: Map<string, string[]> | null }
const CACHE = new WeakMap<GameState, Cache31>();

/** Abre o cache da semana (chamado pelo mercado antes de vender) e fecha depois das paradas. */
function begin(s: GameState): void { CACHE.set(s, { week: s.week, open: true, acts: new Map(), rels: new Map(), no1: null }); }
function end(s: GameState): void { const c = CACHE.get(s); if (c) c.open = false; }
const cacheOf = (s: GameState): Cache31 | null => { const c = CACHE.get(s); return c && c.week === s.week ? c : null; };

function actY(s: GameState, a: Act): ActY {
  const c = cacheOf(s);
  const hit = c?.acts.get(a.id);
  if (hit) return hit;
  const home = countryOfCity(a.city), lang = cityById[a.city]?.lang ?? 'en', fam = familyOf(a.genre);
  let g: Float64Array | null = null, g0: Float64Array | null = null, lg: Float64Array | null = null, law: Float64Array | null = null;
  if (on31(s, 'y31.local')) {
    const b = new Float64Array(NC), d = new Float64Array(NC);
    baseVec16(s, a, b, d);
    g0 = b; g = d;
    for (let i = 0; i < NC; i++) { g0[i] = fameF31(b[i]); g[i] = fameF31(d[i]); }
  }
  if (on31(s, 'y31.lang')) {
    const e = langEra31(s);
    lg = new Float64Array(NC);
    for (let i = 0; i < NC; i++) {
      const c = COUNTRY_INFO[i];
      lg[i] = c.a3 === home ? 1 : c.lang.includes(lang) ? 1 + SAME_LANG * e : 1 - MU[i] * e;
    }
  }
  if (on31(s, 'y31.laws')) {
    for (const q of QUOTAS31) {
      const i = IDX[q.a3];
      if (i === undefined || !q.on(s)) continue;
      const k = q.k(s, a, home, lang, fam);
      if (k === 1) continue;
      law ??= new Float64Array(NC).fill(1);
      law[i] *= k;
    }
    const aq = assocQuota(s, home);
    if (aq) { law ??= new Float64Array(NC).fill(1); law[aq[0]] *= aq[1]; }
  }
  const v = { g, g0, lang: lg, law };
  if (c?.open) c.acts.set(a.id, v);
  return v;
}

/** Países onde o lançamento foi nº 1 nas últimas 8 semanas (a lista que o jogo guarda por país). */
function no1Of(s: GameState, relId: string): string[] | undefined {
  const c = cacheOf(s);
  let m = c?.no1 ?? null;
  if (!m) {
    m = new Map();
    const st = ch7(s);
    for (const a3 of Object.keys(st?.no1 ?? {})) {
      const list = st.no1[a3];
      for (let i = list.length - 1; i >= 0 && s.week - list[i].week <= 8; i--) { const r = list[i].relId; const x = m.get(r); if (!x) m.set(r, [a3]); else if (!x.includes(a3)) x.push(a3); }
    }
    if (c?.open) c.no1 = m;
  }
  return m.get(relId);
}

const W0 = new Array<number>(NC).fill(0);
function relY(s: GameState, rel: Release, act: Act): RelY {
  const c = cacheOf(s);
  const hit = rel.id.startsWith('__') ? undefined : c?.rels.get(rel.id);
  if (hit) return hit;
  const ay = actY(s, act);
  const m = new Float64Array(NC).fill(1);
  let dom: Float64Array | null = null;
  if (on31(s, 'y31.domino')) {
    const src = no1Of(s, rel.id);
    if (src?.length) {
      dom = new Float64Array(NC).fill(1);
      const srcI = src.map((a3) => IDX[a3]).filter((i) => i !== undefined);
      for (let i = 0; i < NC; i++) {
        if (src.includes(COUNTRY_INFO[i].a3)) continue;
        let n = 0;
        for (const j of srcI) if (COUNTRY_INFO[j].market === COUNTRY_INFO[i].market || COUNTRY_INFO[j].lang.some((x) => COUNTRY_INFO[i].lang.includes(x))) n++;
        if (n) dom[i] = 1 + 0.2 * Math.min(3, n);
      }
    }
  }
  // demanda total: a mesma repartição antiga, com a fama de cada país (desvio local), leis e dominó; língua só reparte
  const w = W0;
  const sum = baseWeights7(s, rel, w);
  let num = 0, den = 0, nLoc = 0, nLaw = 0;
  for (let i = 0; i < NC; i++) {
    const g = ay.g ? ay.g[i] : 1, g0 = ay.g0 ? ay.g0[i] : 1, lw = ay.law ? ay.law[i] : 1, dm = dom ? dom[i] : 1;
    m[i] = (ay.g ? g : 1) * (ay.lang ? ay.lang[i] : 1) * lw * dm;
    den += w[i] * g0; nLoc += w[i] * g; nLaw += w[i] * g * lw; num += w[i] * g * lw * dm;
  }
  const ok = sum > 0 && den > 0;
  const loc = ok ? nLoc / den : 1, law = ok && nLoc > 0 ? nLaw / nLoc : 1, domK = ok && nLaw > 0 ? num / nLaw : 1;
  const K = ok ? clamp(num / den, 0.6, 1.8) : 1;
  const v: RelY = { m, K, loc, law, dom: domK };
  if (c?.open && !rel.id.startsWith('__')) c.rels.set(rel.id, v);
  return v;
}

Y31.begin = begin;
Y31.end = end;
const yOn = (s: GameState) => on31(s, 'y31.local') || on31(s, 'y31.laws') || on31(s, 'y31.domino');
// A demanda por país REDISTRIBUI: cada semana o fator é dividido pela média (pelo apelo) de todos os lançamentos vivos.
// Sem isso, quem já está nas paradas ganha desvio local positivo em todo país, a demanda total infla e o resto do
// mercado (o jogador incluído) perde fatia — a bola de neve fama → vendas → parada → fama.
Y31.normalize = (s, rels) => {
  if (!yOn(s)) return;
  let num = 0, den = 0;
  for (const r of rels) { const a = s.acts[r.actId]; if (!a || !(r.appeal > 0)) continue; num += r.appeal * relY(s, r, a).K; den += r.appeal; }
  s.stats.lastKn31 = den > 0 ? num / den : 1;
};
Y31.demand = (s, rel, act) => {
  if (!yOn(s)) return 1;
  return relY(s, rel, act).K / (s.stats.lastKn31 ?? 1);
};
Y31.why = (s, rel, act): Y31Why[] => {
  const y = relY(s, rel, act);
  return [
    { k: y.loc, label: l('Fama nos países (turnê, divulgação, paradas e prêmios de lá)', 'Fame by country (tours, promotion, charts and awards there)') },
    { k: y.law, label: LAW_LABEL },
    { k: y.dom, label: l('Efeito dominó: nº 1 em país vizinho ou da mesma língua', 'Domino effect: No. 1 in a neighbouring or same-language country') },
  ];
};
Y31.weights = (s, rel, act, w) => {
  if (!on31(s, 'y31.local') && !on31(s, 'y31.lang') && !on31(s, 'y31.laws') && !on31(s, 'y31.domino')) return;
  const { m } = relY(s, rel, act);
  for (let i = 0; i < w.length; i++) w[i] *= m[i];
};

// ---------------------------------------------------------------- mercado reservado (último recurso)

/** Fatia mínima da parada nacional que fica com artistas da casa, pela preferência local (Japão alto, Holanda baixo). */
export const reserveShare31 = (a3: string): number => clamp((localPref(a3) - 1.3) / 2.2, 0, 0.7);
Y31.reserve = (s, rels, U, nC) => {
  if (!on31(s, 'y31.reserve')) return;
  const home = rels.map((r) => countryOfCity(s.acts[r.actId]?.city ?? ''));
  for (let i = 0; i < nC; i++) {
    const a3 = COUNTRY_INFO[i].a3, r = reserveShare31(a3);
    let L = 0, T = 0;
    for (let j = 0; j < rels.length; j++) { const u = U[j * nC + i]; T += u; if (home[j] === a3) L += u; }
    if (r <= 0 || T <= 0 || L <= 0 || L >= r * T) continue;
    const up = Math.min(6, (r * T) / L), down = (T - L * up) / (T - L); // locais sobem até a fatia r; o resto encolhe (total igual)
    for (let j = 0; j < rels.length; j++) { const q = j * nC + i; if (U[q] > 0) U[q] *= home[j] === a3 ? up : Math.max(0, down); }
  }
};

// ---------------------------------------------------------------- fama: parada nacional e picos dos artistas do mundo

export interface Y31State { /** ato → país → melhor posição (top 10 de faixas ou álbuns) */ pk: Record<string, Record<string, number>> }
declare module '../ext4' { interface Ext4 { y31: Y31State } }
const fresh = (): Y31State => ({ pk: {} });
registerExt4('y31', fresh);
export function y31(s: GameState): Y31State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.y31 ??= fresh()) as Y31State;
  st.pk ??= {};
  return st;
}
/** Picos do ato por país (melhores primeiro). */
export function actPeaks31(s: GameState, actId: string): { a3: string; pos: number }[] {
  return Object.entries(y31(s).pk[actId] ?? {}).map(([a3, pos]) => ({ a3, pos })).sort((a, b) => a.pos - b.pos || (a.a3 < b.a3 ? -1 : 1));
}

function nationalWeek(s: GameState): void {
  if (!on31(s, 'y31.fame')) return;
  const st = y31(s);
  const usa = countryMarketSize(COUNTRY_INFO[IDX.USA], s.year) || 1;
  for (const c of COUNTRY_INFO) {
    const size = Math.min(1, countryMarketSize(c, s.year) / usa);
    const seen = new Set<string>();
    for (const k of ['songs', 'albums'] as const) for (const row of board(s, c.a3, k).slice(0, 10)) {
      const rel = s.releases[row.relId];
      const a = rel ? s.acts[rel.actId] : undefined;
      if (!a) continue;
      const pk = (st.pk[a.id] ??= {});
      if (row.pos < (pk[c.a3] ?? 99)) pk[c.a3] = row.pos;
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      // a parada nacional soma um pouco à fama global, pesada pelo tamanho do país (o mundial já soma em rankChart)
      a.fame = clamp(a.fame + (row.pos === 1 ? 0.12 : 0.03) * size * (1 - a.fame / 110), 0, 100);
    }
  }
}
registerSimHook('week', 'mercado31', (s) => nationalWeek(s));
registerSimHook('year', 'mercado31', (s) => {
  // poda: atos que saíram do mundo e no máximo 16 países por ato
  const st = y31(s);
  for (const id of Object.keys(st.pk)) {
    if (!s.acts[id]) { delete st.pk[id]; continue; }
    const e = Object.entries(st.pk[id]);
    if (e.length > 16) st.pk[id] = Object.fromEntries(e.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 16));
  }
});

// ---------------------------------------------------------------- editor (regra 10): os interruptores D e Y

for (const d of switchDefs()) {
  if (!d.id.startsWith('d31.') && !d.id.startsWith('y31.')) continue;
  const num = typeof d.def === 'number';
  registerEditable({
    id: `sw.${d.id}`, area: 'world', label: d.desc, kind: num ? 'number' : 'bool', min: num ? 0.3 : undefined, max: num ? 1 : undefined, step: num ? 0.05 : undefined,
    get: (s) => sw(s, d.id), set: (s, v) => { setSw(s, d.id, num ? Number(v) : !!v); },
  });
}
