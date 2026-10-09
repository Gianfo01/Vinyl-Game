// Rodada 16 — FAMA REGIONAL: "a fama deve ser localizada, podendo alterar de acordo com a região".
// • Act.fame continua sendo o alcance global (nada quebra). A fama em cada país = BASE + DESVIO LOCAL.
//   BASE (derivada, sem custo de save): origem (país natal leva mais), mesmo mercado/idioma (transbordo
//   natural), alcance do degrau (quanto mais famoso, mais o nome atravessa fronteiras) e o gosto do país pelo
//   gênero. Artistas reais começam assim: famosos no país de origem e, conforme o degrau, no mundo.
// • DESVIO (guardado, só os 12 maiores países por ato + baldes por região): paradas do país, prêmios nacionais,
//   shows feitos lá, divulgação na cidade, rede da cena (scenes12: mídia/casas do seu selo), cena do gênero,
//   transbordo para vizinhos/idioma e hits mundiais. Sem atividade, o desvio volta devagar a zero.
// • Efeitos locais: público e cachê de shows na cidade, paparazzi/tumultos onde o ato está, interesse de selos
//   rivais da cidade, reconhecimento em turnê, imprensa local e o que o jogador sabe de atos estrangeiros
//   (exposição vista do país do jogador — knownLevel/canSee em fame15).

import { Rng, clamp } from '../../core/rng';
import { COUNTRY_INFO, countryInfoByA3, countryMarketSize, countryTaste } from '../../data/countries';
import { allCountryCodes, countryName, countryOfCity, marketOfCountry } from '../../data/geo';
import { CITIES, cityById, familyOf, l, type L, type MarketId } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { setFameAt } from '../famehook16';
import type { Act, GameState } from '../types';
import { fmtL, notify } from '../util';
import { board, ch7 } from './charts7';
import { FTIERS, fameTier, f15, feeMult, mainActOf, personFame } from './fame15';
import { addHype } from './hype12';
import { mapx } from './mapx8';
import { scene12 } from './scenes12';

// ---------------------------------------------------------------- estado

export interface Fame16 {
  /** desvio local: ato → (a3 | 'r:mercado') → pontos (±) */
  d: Record<string, Record<string, number>>;
  /** fontes do desvio (bits SRC) */
  m: Record<string, Record<string, number>>;
  /** último degrau anunciado por país (só seus atos) */
  lt: Record<string, Record<string, number>>;
}
declare module '../ext4' { interface Ext4 { fame16: Fame16 } }
const empty = (): Fame16 => ({ d: {}, m: {}, lt: {} });
registerExt4('fame16', empty);
export function f16(s: GameState): Fame16 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.fame16 ??= empty()) as Fame16;
  st.d ??= {}; st.m ??= {}; st.lt ??= {};
  return st;
}

export const SRC16: { bit: number; name: L }[] = [
  { bit: 1, name: l('paradas do país', 'national charts') },
  { bit: 2, name: l('prêmio nacional', 'national award') },
  { bit: 4, name: l('shows feitos lá', 'shows played there') },
  { bit: 8, name: l('divulgação local', 'local promotion') },
  { bit: 16, name: l('rede da cena (mídia/casas)', 'scene network (media/venues)') },
  { bit: 32, name: l('transbordo de vizinhos/idioma', 'spillover from neighbours/language') },
  { bit: 64, name: l('hit mundial', 'global hit') },
  { bit: 128, name: l('cena do gênero na cidade', 'genre scene in town') },
];
const CAP = 12;

// ---------------------------------------------------------------- geografia (cache)

let GEO16: { a2c: Map<string, string[]>; lang: Map<string, string[]> } | null = null;
function geo16() {
  if (GEO16) return GEO16;
  const a2c = new Map<string, string[]>(), lang = new Map<string, string[]>();
  for (const c of CITIES) {
    const a3 = countryOfCity(c.id);
    if (!a3) continue;
    (a2c.get(a3) ?? a2c.set(a3, []).get(a3)!).push(c.id);
    const ls = lang.get(a3) ?? lang.set(a3, [...(countryInfoByA3[a3]?.lang ?? [])]).get(a3)!;
    if (!ls.includes(c.lang)) ls.push(c.lang);
  }
  for (const c of COUNTRY_INFO) if (!lang.has(c.a3)) lang.set(c.a3, [...c.lang]);
  return (GEO16 = { a2c, lang });
}
export const mkOf = (a3: string): MarketId => countryInfoByA3[a3]?.market ?? marketOfCountry(a3);
const langsOf = (a3: string): string[] => geo16().lang.get(a3) ?? [];
export const citiesOf = (a3: string): string[] => geo16().a2c.get(a3) ?? [];
export const homeA3 = (a: Act): string | null => countryOfCity(a.city);
export const myA3 = (s: GameState): string | null => countryOfCity(s.config.homeCity);

// ---------------------------------------------------------------- base derivada

/** Alcance internacional 0..1 pelo tamanho da fama global (Local quase não sai do país; Ícone está em todo lugar). */
export const reach16 = (a: Act): number => clamp((a.fame - 18) / 62, 0, 1);

export interface Base16 { v: number; why: L; aff: number }
/** Fama de base num país (sem atividade local): origem, mercado/idioma, alcance e gosto pelo gênero. */
export function base16(s: GameState, a: Act, a3: string): Base16 {
  const home = homeA3(a);
  if (a3 === home) return { v: clamp(a.fame * 1.1 + (a.fame > 4 ? 3 : 0), 0, 100), why: l('país de origem', 'home country'), aff: 1 };
  const hc = cityById[a.city];
  const sameM = !!hc && mkOf(a3) === hc.market;
  const sameL = !!hc && langsOf(a3).includes(hc.lang);
  let w = sameM ? (sameL ? 0.6 : 0.4) : sameL ? 0.32 : 0.12;
  w += (1 - w) * reach16(a) * 0.92;
  const info = countryInfoByA3[a3];
  const aff = info ? 0.75 + 0.25 * countryTaste(info, familyOf(a.genre), s.year) : 1;
  const why = sameM && sameL ? l('mesmo mercado e idioma', 'same market and language') : sameM ? l('mesmo mercado', 'same market') : sameL ? l('mesmo idioma', 'same language') : l('só o alcance internacional', 'international reach only');
  return { v: clamp(a.fame * w * aff, 0, 100), why, aff };
}

/** Fama do ato no país (0–100): base + desvio local (ou o balde da região, se o país não está entre os 12). */
export function fameIn(s: GameState, a: Act, a3: string): number {
  const d = f16(s).d[a.id];
  const dv = d ? d[a3] ?? d[`r:${mkOf(a3)}`] ?? 0 : 0;
  return Math.round(clamp(base16(s, a, a3).v + dv, 0, 100) * 10) / 10;
}
export const tierIn = (s: GameState, a: Act, a3: string): number => fameTier(fameIn(s, a, a3));

/** Média mundial ponderada pelo tamanho do mercado (o "agregado" da fama regional). */
export function worldFame16(s: GameState, a: Act): number {
  let w = 0, v = 0;
  for (const c of COUNTRY_INFO) { const k = countryMarketSize(c, s.year); w += k; v += k * fameIn(s, a, c.a3); }
  return w ? Math.round((v / w) * 10) / 10 : a.fame;
}

/** Fama de uma pessoa num país: a fama dela escalada pela fama local do ato principal. */
export function personFameIn(s: GameState, pid: string, a3: string): number {
  const v = personFame(s, pid).v;
  const a = mainActOf(s, pid);
  if (!a || a.fame <= 0) return v;
  return Math.round(clamp(v * (fameIn(s, a, a3) / a.fame), 0, 100) * 10) / 10;
}

/** Cidade onde o ato está agora: turnê em andamento (última parada feita ou a próxima) ou a cidade natal. */
export function whereCity(s: GameState, a: Act): string {
  const t = s.tours.find((x) => x.actId === a.id && x.status === 'running');
  if (t) { const st = [...t.stops].reverse().find((x) => x.status === 'played') ?? t.stops.find((x) => x.status === 'scheduled'); if (st) return st.cityId; }
  return a.city;
}

setFameAt((s, a, where) => {
  const a3 = where === '@me' ? myA3(s) : !where ? countryOfCity(whereCity(s, a)) : cityById[where] ? countryOfCity(where) : where;
  return a3 ? fameIn(s, a, a3) : a.fame;
});

/** Lista ordenada (maiores primeiro) de países com a fama do ato: país natal, mercados com dados e os desvios guardados. */
export function fameMap16(s: GameState, a: Act, all = false): { a3: string; v: number; base: Base16; d: number; m: number }[] {
  const keys = new Set<string>(all ? allCountryCodes() : COUNTRY_INFO.map((c) => c.a3));
  const h = homeA3(a); if (h) keys.add(h);
  const d = f16(s).d[a.id] ?? {}, m = f16(s).m[a.id] ?? {};
  for (const k of Object.keys(d)) if (!k.startsWith('r:')) keys.add(k);
  return [...keys].map((a3) => {
    const base = base16(s, a, a3);
    const dv = d[a3] ?? d[`r:${mkOf(a3)}`] ?? 0;
    return { a3, v: Math.round(clamp(base.v + dv, 0, 100) * 10) / 10, base, d: Math.round(dv * 10) / 10, m: m[a3] ?? m[`r:${mkOf(a3)}`] ?? 0 };
  }).sort((x, y) => y.v - x.v || (x.a3 < y.a3 ? -1 : 1));
}

// ---------------------------------------------------------------- atividade local (mês)

const mineAct = (a: Act) => a.owner === 'player' || !!a.playerBand;
const live = (a: Act) => a.status !== 'retired' && a.status !== 'split';

/** Pontos de parada por ato e chave (país, 'r:mercado' ou 'world'): Σ (21 − posição) nos tops de faixas e álbuns. */
function chartPts(s: GameState): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  const add = (key: string) => {
    for (const k of ['songs', 'albums'] as const) for (const row of board(s, key, k)) {
      const rel = s.releases[row.relId];
      if (!rel || !s.acts[rel.actId]) continue;
      const m = out.get(rel.actId) ?? out.set(rel.actId, new Map()).get(rel.actId)!;
      m.set(key, (m.get(key) ?? 0) + Math.max(0, 21 - row.pos));
    }
  };
  for (const c of COUNTRY_INFO) add(c.a3);
  for (const mk of new Set(COUNTRY_INFO.map((c) => c.market))) add(`r:${mk}`);
  add('world');
  return out;
}

/** Alvo do desvio por país/balde e as fontes (bits). */
function targets(s: GameState, a: Act, cp: Map<string, number> | undefined): { t: Map<string, number>; m: Map<string, number> } {
  const t = new Map<string, number>(), m = new Map<string, number>();
  const add = (k: string, v: number, bit: number) => { if (v <= 0) return; t.set(k, (t.get(k) ?? 0) + v); m.set(k, (m.get(k) ?? 0) | bit); };
  // paradas
  if (cp) for (const [k, p] of cp) {
    if (k === 'world') continue;
    if (k.startsWith('r:')) add(k, Math.min(14, p * 0.3), 1); else add(k, Math.min(22, p * 0.5), 1);
  }
  // prêmios nacionais (este ano e o anterior)
  for (const aw of ch7(s)?.awards ?? []) if (aw.actId === a.id && aw.year >= s.year - 1) add(aw.a3, aw.year === s.year ? 9 : 5, 2);
  // shows no último ano (o selo marca played:ato:cidade com a semana)
  const pre = `played:${a.id}:`;
  const shows = new Map<string, number>();
  for (const c of CITIES) {
    const w = s.flags[pre + c.id];
    if (w === undefined || s.week - w > 52) continue;
    const a3 = countryOfCity(c.id);
    if (a3) shows.set(a3, (shows.get(a3) ?? 0) + (s.week - w <= 13 ? 3.5 : 2));
  }
  for (const [a3, v] of shows) add(a3, Math.min(12, v), 4);
  // divulgação dirigida (mapx8)
  for (const p of mapx(s).promos) if (p.actId === a.id && p.until > s.week) { const a3 = countryOfCity(p.city); if (a3) add(a3, 5, 8); }
  // rede da cena do seu selo (scenes12): mídia e casas da cidade empurram os seus atos do mesmo gênero
  if (mineAct(a)) for (const n of Object.values(scene12(s).nets)) {
    if (familyOf(n.genre) !== familyOf(a.genre)) continue;
    const a3 = countryOfCity(n.city);
    if (a3) add(a3, Math.min(8, (n.ties.media + n.ties.venue) / 14 * (n.health / 50)), 16);
  }
  // cena do gênero: onde já há atividade, uma cena forte fixa o nome
  for (const a3 of [...t.keys()]) {
    if (a3.startsWith('r:')) continue;
    let sc = 0;
    for (const c of citiesOf(a3)) sc = Math.max(sc, s.scenes[`${c}:${a.genre}`] ?? 0);
    if (sc > 0) add(a3, Math.min(4, sc / 10), 128);
  }
  // transbordo: vizinhos de mercado e países do mesmo idioma recebem parte do maior desvio
  const own = [...t].filter(([k]) => !k.startsWith('r:'));
  if (own.length) {
    const top = own.sort((x, y) => y[1] - x[1]).slice(0, 3);
    for (const [a3, v] of top) {
      const mk = mkOf(a3), ls = langsOf(a3);
      add(`r:${mk}`, v * 0.25, 32);
      for (const c of COUNTRY_INFO) if (c.market !== mk && !t.has(c.a3) && c.lang.some((x) => ls.includes(x))) add(c.a3, v * 0.15, 32); // mesmo mercado: o balde da região cobre
    }
  }
  // hit mundial: todo lugar ouve um pouco
  const wp = cp?.get('world') ?? 0;
  if (wp > 0) { const v = Math.min(10, wp * 0.25); for (const k of [...t.keys()]) if (!k.startsWith('r:')) add(k, v, 64); for (const mk of new Set(COUNTRY_INFO.map((c) => c.market))) add(`r:${mk}`, v, 64); }
  for (const [k, v] of t) t.set(k, Math.min(35, v));
  return { t, m };
}

export function fame16Month(s: GameState): void {
  const st = f16(s);
  const cp = chartPts(s);
  const cand = new Set<string>([...cp.keys(), ...Object.keys(st.d)]);
  for (const a of Object.values(s.acts)) if (live(a) && (mineAct(a) || a.fame >= 25)) cand.add(a.id);
  for (const id of cand) {
    const a = s.acts[id];
    if (!a) { delete st.d[id]; delete st.m[id]; delete st.lt[id]; continue; }
    const { t, m } = targets(s, a, cp.get(id));
    const d = st.d[id] ?? {};
    const decay = fameTier(a.fame) >= 5 ? 0.04 : 0.08;
    const nd: Record<string, number> = {};
    for (const k of new Set([...Object.keys(d), ...t.keys()])) {
      const cur = d[k] ?? 0, tg = t.get(k) ?? 0;
      const v = cur + (tg - cur) * (tg > cur ? 0.35 : decay);
      if (Math.abs(v) >= 0.8) nd[k] = Math.round(v * 10) / 10;
    }
    // limite: 12 países + baldes de região
    const cs = Object.keys(nd).filter((k) => !k.startsWith('r:')).sort((x, y) => nd[y] - nd[x] || (x < y ? -1 : 1));
    for (const k of cs.slice(CAP)) delete nd[k];
    if (Object.keys(nd).length) {
      st.d[id] = nd;
      const mm: Record<string, number> = {};
      for (const k of Object.keys(nd)) { const b = m.get(k) ?? st.m[id]?.[k] ?? 0; if (b) mm[k] = b; }
      st.m[id] = mm;
    } else { delete st.d[id]; delete st.m[id]; }
  }
  localEvents(s);
}

// ---------------------------------------------------------------- histórias locais (seus atos)

function localEvents(s: GameState): void {
  const st = f16(s);
  const r = Rng.fromSeed(`${s.config.seed}:fame16:${s.year}:${s.month}`);
  for (const a of Object.values(s.acts)) {
    if (!mineAct(a) || !live(a)) continue;
    const top = fameMap16(s, a).slice(0, 8);
    // novo degrau num país (≥ Nacional)
    const lt = (st.lt[a.id] ??= {});
    for (const x of top) {
      const ti = fameTier(x.v);
      const was = lt[x.a3];
      if (was !== undefined && ti > was && ti >= 2) {
        const src = SRC16.filter((b) => x.m & b.bit).map((b) => b.name);
        const tx = fmtL(l('{a} agora é {t} em {c} (fama local {v}). Por quê: {w}.', '{a} is now {t} in {c} (local fame {v}). Why: {w}.'), { a: a.name, t: FTIERS[ti].name, c: countryName(x.a3), v: Math.round(x.v), w: src.length ? { pt: src.map((z) => z.pt).join(', '), en: src.map((z) => z.en).join(', ') } : x.base.why });
        f15(s).log.push([s.year, s.month, a.id, tx, 1]);
        notify(s, tx, 'good');
      }
      lt[x.a3] = ti;
    }
    // reconhecimento em turnê: paradas feitas no último mês
    const t = s.tours.find((z) => z.actId === a.id && (z.status === 'running' || z.status === 'done') && z.stops.some((y) => y.status === 'played' && s.day - y.day <= 31 && s.day >= y.day));
    if (t) {
      const seen = new Set<string>();
      for (const sp of t.stops) {
        if (sp.status !== 'played' || s.day - sp.day > 31 || s.day < sp.day) continue;
        const a3 = countryOfCity(sp.cityId);
        if (!a3 || seen.has(a3)) continue;
        seen.add(a3);
        const ti = tierIn(s, a, a3), tg = fameTier(a.fame);
        if (ti >= 3 && r.chance(0.45)) {
          a.momentum = clamp(a.momentum + 3, 0, 100);
          a.fans.core += Math.round(a.fans.core * 0.005);
          for (const id of a.members) { const p = s.persons[id]; if (p?.alive) p.morale = clamp(p.morale + 2, 0, 100); }
          const tx = fmtL(l('Reconhecidos em {c}: {a} é {t} lá — gente na porta do hotel, rádio local tocando. +3 de momento, moral +2.', 'Recognised in {c}: {a} is {t} there — people outside the hotel, local radio playing them. +3 momentum, morale +2.'), { c: countryName(a3), a: a.name, t: FTIERS[ti].name });
          f15(s).log.push([s.year, s.month, a.id, tx, 0]); notify(s, tx, 'good');
          break;
        }
        if (ti <= 1 && tg >= 2 && r.chance(0.4)) {
          for (const id of a.members) { const p = s.persons[id]; if (p?.alive && (p.ambition === 'fame' || p.ambition === 'status')) p.morale = clamp(p.morale - 3, 0, 100); }
          a.rehearsed = clamp(a.rehearsed + 4, 0, 100);
          const tx = fmtL(l('Em {c} ninguém sabe quem é {a} (fama local {v}, {t} lá): casas vazias, banho de humildade. Quem quer fama perde moral; a banda ensaia com fome. Shows, paradas e divulgação lá constroem o nome.', 'In {c} nobody knows {a} (local fame {v}, {t} there): empty rooms, a dose of humility. Fame-seekers lose morale; the band rehearses hungry. Shows, charts and promotion there build the name.'), { c: countryName(a3), a: a.name, v: Math.round(fameIn(s, a, a3)), t: FTIERS[ti].name });
          f15(s).log.push([s.year, s.month, a.id, tx, 0]); notify(s, tx, 'info');
          break;
        }
      }
    }
    // imprensa local: país estrangeiro onde o nome cresceu acima da base
    const hot = top.find((x) => x.a3 !== homeA3(a) && x.d >= 6 && fameTier(x.v) >= 2);
    if (hot && r.chance(0.08)) {
      a.momentum = clamp(a.momentum + 2, 0, 100);
      const d = (f16(s).d[a.id] ??= {}); d[hot.a3] = Math.min(40, (d[hot.a3] ?? 0) + 2);
      addHype(s, `a:${a.id}`, 'fame16:press', l('Imprensa estrangeira', 'Foreign press'), 2);
      const tx = fmtL(l('A imprensa de {c} quer {a}: entrevista e capa local (+2 de fama lá, +2 de momento).', '{c}\'s press wants {a}: interview and a local cover (+2 fame there, +2 momentum).'), { c: countryName(hot.a3), a: a.name });
      f15(s).log.push([s.year, s.month, a.id, tx, 2]); notify(s, tx, 'info');
    }
  }
}

registerSimHook('month', 'fame16', (s) => fame16Month(s));

// ---------------------------------------------------------------- efeitos (mods)

const ratioLabel = (s: GameState, a: Act, cityId: string, v: number): L => fmtL(l('fama local em {c}: {v} (global {g})', 'local fame in {c}: {v} (global {g})'), { c: countryName(countryOfCity(cityId)), v: Math.round(v), g: Math.round(a.fame) });
// público na cidade: troca o peso da fama global pela local
registerMod('cityDemand', 'fame16', (s, v, c) => {
  if (!c.act || !c.cityId) return null;
  const a3 = countryOfCity(c.cityId);
  if (!a3) return null;
  const loc = fameIn(s, c.act, a3);
  const k = clamp((1 + loc / 70) / (1 + c.act.fame / 70), 0.6, 1.3);
  return Math.abs(k - 1) < 0.01 ? null : { value: v * k, label: ratioLabel(s, c.act, c.cityId, loc) };
});
// cachê: o degrau que vale é o local
registerMod('showRevenue', 'fame16', (s, v, c) => {
  if (!c.act || !c.cityId) return null;
  const a3 = countryOfCity(c.cityId);
  if (!a3) return null;
  const loc = fameIn(s, c.act, a3);
  const k = [1, 1, 1.05, 1.12, 1.22, 1.3][fameTier(loc)] / feeMult(c.act);
  return Math.abs(k - 1) < 0.01 ? null : { value: v * k, label: ratioLabel(s, c.act, c.cityId, loc) };
});
