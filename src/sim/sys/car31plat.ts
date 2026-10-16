// R31 · onda 3 (CAR) — PLATAFORMA PRÓPRIA: PLAYLISTS COM VAGAS (interruptor car31.plat).
//
// Antes o dono da plataforma escolhia um CRITÉRIO de destaque e os escolhidos ganhavam embalo global. Agora a decisão
// é a playlist da casa, faixa a faixa e em ordem: "Top da semana" (20 vagas), "Novidades" (15) e, a partir de 2018,
// "Para o seu humor" (10). Streams = seguidores × posição × quanto o público salva (qualidade da faixa), e os
// seguidores têm PAÍS: os assinantes ficam metade no país da sede e o resto pelos mercados; a fatia da plataforma em
// cada país limita onde a execução vale (função única → paradas do país e fama local).
// Vaga vazia é preenchida pelo algoritmo pelo critério de destaque da plataforma (platform12) — a delegação da casa.
// Tensões: gravadoras grandes com acordo exigem vagas no Top (não cumprir = tiram o catálogo); pôr o seu selo é
// conflito (artistas e confiança caem, e a execução vale menos); fazendas de streams se escondem em Novidades.

import { Rng, clamp } from '../../core/rng';
import { COUNTRY_INFO, countryMarketSize, countryPop } from '../../data/countries';
import { countryOfCity } from '../../data/geo';
import { l, type L } from '../../data/world';
import { registerDeadline, type Deadline19 } from '../calendar19';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { opine } from '../opinion';
import { registerEditable, registerRunnable } from '../r31/editor';
import { allReleases17 } from '../relidx17';
import type { Act, GameState, Release } from '../types';
import { fmtL } from '../util';
import { car31On, exec31, registerExec31, touch31 } from './car31';
import { ventures, type Venture } from './ventures9';

export type List31 = 'top' | 'new' | 'mood';
export const LISTS31: List31[] = ['top', 'new', 'mood'];
export const LIST_NAME31: Record<List31, L> = { top: l('Top da semana', 'Top of the week'), new: l('Novidades', 'New this week'), mood: l('Para o seu humor', 'For your mood') };
export const LIST_SIZE31: Record<List31, number> = { top: 20, new: 15, mood: 10 };
/** fração dos assinantes que segue cada playlist */
const LIST_F: Record<List31, number> = { top: 0.5, new: 0.25, mood: 0.2 };
export const moodOn31 = (s: GameState): boolean => s.year >= 2018;

export interface Demand31 { lab: string; n: number; u: number }
export interface Plat31 { lists: Record<List31, string[]>; dem: Demand31[]; farm: { rel: string; w: number }[]; seq: number; log: { w: number; t: L }[]; boy?: number }
export interface Plat31State { p: Record<string, Plat31> }
declare module '../ext4' { interface Ext4 { car31p: Plat31State } }
registerExt4('car31p', () => ({ p: {} }));
const ro = (s: GameState): Plat31State | undefined => (s as unknown as { x4?: { car31p?: Plat31State } }).x4?.car31p;
const blank = (): Plat31 => ({ lists: { top: [], new: [], mood: [] }, dem: [], farm: [], seq: 0, log: [] });
export const platRo31 = (s: GameState, vid: string): Plat31 => ro(s)?.p[vid] ?? blank();
function pOf(s: GameState, vid: string): Plat31 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.car31p ??= { p: {} }) as Plat31State;
  const p = (st.p[vid] ??= blank());
  p.lists ??= { top: [], new: [], mood: [] }; p.dem ??= []; p.farm ??= []; p.log ??= [];
  for (const k of LISTS31) p.lists[k] ??= [];
  return p;
}
const note = (p: Plat31, w: number, t: L) => { p.log.unshift({ w, t }); if (p.log.length > 12) p.log.length = 12; };
export const platVentures31 = (s: GameState): Venture[] => ((s as unknown as { x4?: { ventures9?: { list?: Venture[] } } }).x4?.ventures9?.list ?? []).filter((v) => v.kind === 'platform');
interface PlatXLite { crit?: string; human?: number; curators?: number; trust?: number }
const px = (s: GameState, vid: string): PlatXLite | undefined => (s as unknown as { x4?: { ventures12?: { plat?: Record<string, PlatXLite> } } }).x4?.ventures12?.plat?.[vid];
const mine = (a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand);
const isMajor = (s: GameState, id: string): boolean => { const lb = s.labels[id]; return !!lb && (lb.family === 'A' || lb.roster.length >= 8); };

// ---------------------------------------------------------------- assinantes por país (puro)

/** penetração do streaming na população (cresce de 2005 até ~45%) */
export const pen31 = (year: number): number => clamp(0.01 + (year - 2005) * 0.02, 0.01, 0.45);
/** fatia da plataforma entre os ouvintes de streaming de cada país (só os 8 maiores para ela): metade dos assinantes no
 *  país da sede, o resto pelo tamanho do mercado de música de cada país */
export function subsShare31(s: GameState, v: Venture): { a3: string; share: number; subs: number }[] {
  const subs = v.subs ?? 0;
  if (subs <= 0) return [];
  const home = countryOfCity(v.city) ?? 'USA';
  let t = 0;
  const w = COUNTRY_INFO.map((c) => { const k = c.a3 === home ? 0 : countryMarketSize(c, s.year); t += k; return k; }); // o resto segue o dinheiro gasto com música
  const out = COUNTRY_INFO.map((c, i) => {
    const n = (c.a3 === home ? 0.5 : 0) * subs + (t > 0 ? (0.5 * subs * w[i]) / t : 0);
    const users = countryPop(c, s.year) * 1e6 * pen31(s.year);
    return { a3: c.a3, subs: Math.round(n), share: users > 0 ? Math.min(0.6, n / users) : 0 };
  });
  return out.sort((a, b) => b.share - a.share || (a.a3 < b.a3 ? -1 : 1)).slice(0, 8).filter((x) => x.share > 0);
}
export const posW31 = (pos: number): number => 1 / (1 + 0.15 * pos);
/** o quanto o público salva a faixa (qualidade; fazenda infla) */
const saveOf = (rel: Release, farm: boolean): number => 0.6 + rel.q / 150 + (farm ? 0.5 : 0);
export function slotW31p(s: GameState, v: Venture, p: Plat31, list: List31, pos: number, rel: Release, share: number): number {
  return 7 * share * LIST_F[list] * posW31(pos) * saveOf(rel, p.farm.some((f) => f.rel === rel.id));
}
registerExec31('platform', (s, out) => {
  if (!car31On(s, 'plat')) return;
  for (const v of platVentures31(s)) {
    const p = ro(s)?.p[v.id];
    if (!p) continue;
    const sh = subsShare31(s, v);
    for (const list of LISTS31) {
      if (list === 'mood' && !moodOn31(s)) continue;
      p.lists[list].forEach((id, pos) => {
        const rel = s.releases[id];
        if (!rel?.live) return;
        for (const c of sh) exec31(s, out, { rel: id, act: rel.actId, a3: c.a3, w: slotW31p(s, v, p, list, pos, rel, c.share), src: 'platform', by: v.id });
      });
    }
  }
});

// ---------------------------------------------------------------- decisões

const byId = (s: GameState, vid: string): Venture | undefined => platVentures31(s).find((v) => v.id === vid);
export function cands31p(s: GameState, n = 60): Release[] {
  return allReleases17(s).filter((r) => r.live && s.week - r.week <= 30 && s.week >= r.week && !!s.acts[r.actId])
    .sort((a, b) => b.appeal - a.appeal || (a.id < b.id ? -1 : 1)).slice(0, n);
}
export function addList31(s: GameState, vid: string, list: List31, relId: string, pos?: number): L | null {
  const v = byId(s, vid);
  if (!v) return l('Plataforma inválida.', 'Invalid platform.');
  if (list === 'mood' && !moodOn31(s)) return l('Playlists por humor só a partir de 2018.', 'Mood playlists only from 2018.');
  const rel = s.releases[relId];
  if (!rel?.live) return l('Esse lançamento não está mais em circulação.', 'That release is no longer in circulation.');
  const p = pOf(s, vid);
  const xs = p.lists[list].filter((x) => x !== relId);
  if (xs.length >= LIST_SIZE31[list]) return fmtL(l('{l} está cheia: tire uma faixa antes.', '{l} is full: drop a track first.'), { l: LIST_NAME31[list] });
  xs.splice(clamp(Math.round(pos ?? xs.length), 0, xs.length), 0, relId);
  p.lists[list] = xs;
  touch31(s);
  return null;
}
export function dropList31(s: GameState, vid: string, list: List31, relId: string): void {
  const p = pOf(s, vid);
  p.lists[list] = p.lists[list].filter((x) => x !== relId);
  touch31(s);
}
/** suspeitas visíveis (com curadores ou curadoria humana ≥ 50%) */
export function farmSeen31(s: GameState, vid: string): string[] {
  const x = px(s, vid);
  if (!x || ((x.curators ?? 0) <= 0 && (x.human ?? 0) < 50)) return [];
  return platRo31(s, vid).farm.map((f) => f.rel);
}
export function purgeFarm31(s: GameState, vid: string): number {
  const seen = new Set(farmSeen31(s, vid));
  if (!seen.size) return 0;
  const p = pOf(s, vid);
  for (const k of LISTS31) p.lists[k] = p.lists[k].filter((x) => !seen.has(x));
  p.farm = p.farm.filter((f) => !seen.has(f.rel));
  note(p, s.week, l('Faixas suspeitas de fazenda de streams retiradas.', 'Tracks suspected of stream farming removed.'));
  touch31(s);
  return seen.size;
}

// ---------------------------------------------------------------- mês

const mi = (s: GameState) => s.year * 12 + s.month;
/** vagas vazias: o algoritmo preenche pelo critério de destaque da plataforma */
function algoFill(s: GameState, v: Venture, p: Plat31): void {
  const crit = px(s, v.id)?.crit ?? 'popular';
  const pool = cands31p(s, 80);
  const score = (r: Release) => { const a = s.acts[r.actId]!; return crit === 'new' ? 100 - (s.year - a.debutYear) * 20 + r.appeal : crit === 'diverse' ? 60 - a.fame + r.q / 4 : crit === 'editorial' ? r.q + (a.fame < 45 ? 20 : 0) : r.appeal; };
  const sorted = [...pool].sort((a, b) => score(b) - score(a) || (a.id < b.id ? -1 : 1));
  for (const list of LISTS31) {
    if (list === 'mood' && !moodOn31(s)) continue;
    const xs = p.lists[list];
    for (const r of list === 'new' ? sorted.filter((x) => s.week - x.week <= 6) : sorted) {
      if (xs.length >= LIST_SIZE31[list]) break;
      if (!xs.includes(r.id) && !(list === 'new' && p.lists.top.includes(r.id))) xs.push(r.id);
    }
  }
}
function monthOne(s: GameState, v: Venture): void {
  const p = pOf(s, v.id);
  const r = Rng.fromSeed(`${s.config.seed}|car31|plat|${v.id}|${mi(s)}`);
  for (const k of LISTS31) p.lists[k] = p.lists[k].filter((id) => s.releases[id]?.live && s.acts[s.releases[id].actId] && (k !== 'new' || s.week - s.releases[id].week <= 10));
  algoFill(s, v, p);
  const x = (s as unknown as { x4: { ventures12?: { plat?: Record<string, { trust: number }> } } }).x4.ventures12?.plat?.[v.id];
  // conflito: o seu selo nas playlists da casa
  const all = LISTS31.flatMap((k) => p.lists[k]);
  const own = all.filter((id) => mine(s.acts[s.releases[id]?.actId ?? ''])).length;
  if (own && x) x.trust = clamp(x.trust - 0.6 * own, 0, 100);
  if (all.length && own / all.length > 0.3 && (p.boy ?? 0) < s.year) {
    p.boy = s.year;
    opine(s, 'w:artists', -3, l('a plataforma dele favorece o próprio selo', 'his platform favours its own label'));
    emitFact(s, { kind: 'platform_conflict', actors: ['player'], place: v.city, severity: 40, tags: ['car31', 'platform'], src: 'car31',
      text: fmtL(l('Artistas acusam {n} de encher as playlists com o próprio selo.', 'Artists accuse {n} of stuffing the playlists with its own label.'), { n: v.name }), notify: { kind: 'bad', cat: 'business' }, diary: true });
  }
  // exigências das gravadoras grandes com acordo
  for (const d of [...p.dem]) {
    if (d.u > s.week) continue;
    p.dem = p.dem.filter((y) => y !== d);
    const got = p.lists.top.filter((id) => s.releases[id]?.owner === d.lab).length;
    const lb = s.labels[d.lab];
    if (got >= d.n) {
      if (x) x.trust = clamp(x.trust + 1, 0, 100);
      if (lb?.leaderId) opine(s, `l:${lb.leaderId}`, 3, l('cumpriu as vagas combinadas na playlist', 'honoured the agreed playlist slots'));
      note(p, s.week, fmtL(l('{b}: vagas cumpridas, acordo mantido.', '{b}: slots honoured, deal kept.'), { b: lb?.name ?? '?' }));
    } else if (v.deals?.includes(d.lab)) {
      v.deals = v.deals.filter((y) => y !== d.lab);
      if (lb?.leaderId) opine(s, `l:${lb.leaderId}`, -6, l('não deu as vagas que pedimos na playlist', 'did not give the playlist slots we asked for'));
      emitFact(s, { kind: 'catalog_pulled', actors: ['player', d.lab], place: v.city, severity: 45, tags: ['car31', 'platform'], src: 'car31',
        text: fmtL(l('{b} tira o catálogo da {n}: as vagas exigidas no Top não vieram.', '{b} pulls its catalog from {n}: the demanded Top slots never came.'), { b: lb?.name ?? '?', n: v.name }), notify: { kind: 'bad', cat: 'business' }, diary: true });
    }
  }
  const majors = (v.deals ?? []).filter((id) => isMajor(s, id) && !p.dem.some((d) => d.lab === id)).sort();
  if (majors.length && r.chance(0.2)) {
    const lab = r.pick(majors), n = r.int(2, 3);
    p.dem.push({ lab, n, u: s.week + 8 });
    emitFact(s, { kind: 'slot_demand', actors: ['player', lab], place: v.city, severity: 30, tags: ['car31', 'platform'], src: 'car31',
      text: fmtL(l('{b} exige {k} vagas no Top da {n} nas próximas 8 semanas, ou tira o catálogo.', '{b} demands {k} Top slots on {n} within 8 weeks, or pulls its catalog.'), { b: s.labels[lab]?.name ?? '?', k: n, n: v.name }), notify: { kind: 'info', cat: 'business', prio: 2 } });
  }
  // fazendas de streams em Novidades
  for (const f of [...p.farm]) {
    if (!all.includes(f.rel)) { p.farm = p.farm.filter((y) => y !== f); continue; }
    if (s.week - f.w >= 8 && r.chance(0.35)) {
      p.farm = p.farm.filter((y) => y !== f);
      for (const k of LISTS31) p.lists[k] = p.lists[k].filter((id) => id !== f.rel);
      v.rep = clamp(v.rep - 6, 0, 100);
      if (x) x.trust = clamp(x.trust - 5, 0, 100);
      emitFact(s, { kind: 'stream_farm', actors: ['player'], place: v.city, severity: 45, tags: ['car31', 'platform', 'scandal'], src: 'car31',
        text: fmtL(l('Imprensa descobre fazenda de streams numa playlist da {n}: "{t}" tinha ouvintes falsos.', 'Press finds a stream farm in a {n} playlist: "{t}" had fake listeners.'), { n: v.name, t: s.releases[f.rel]?.title ?? '?' }), notify: { kind: 'bad', cat: 'business' }, diary: true });
    }
  }
  const sus = p.lists.new.filter((id) => { const rel = s.releases[id]; return rel && !mine(s.acts[rel.actId]) && !isMajor(s, rel.owner) && !p.farm.some((f) => f.rel === id); });
  if (sus.length && r.chance(0.12)) p.farm.push({ rel: r.pick(sus), w: s.week });
}

registerSimHook('month', 'car31plat', (s) => {
  if (!car31On(s, 'plat')) return;
  const vs = ventures(s).list.filter((v) => v.kind === 'platform');
  for (const v of vs) monthOne(s, v);
  const m = ro(s);
  if (m) for (const id of Object.keys(m.p)) if (!vs.some((v) => v.id === id)) delete m.p[id];
  touch31(s);
});

registerDeadline('car31plat', (s, from, to) => {
  const out: Deadline19[] = [];
  for (const v of platVentures31(s)) for (const d of ro(s)?.p[v.id]?.dem ?? []) if (d.u >= from && d.u <= to)
    out.push({ id: `car31d:${v.id}:${d.lab}:${d.u}`, w: d.u, kind: 'decision', act: true, tone: 'bad', t: fmtL(l('{b} quer {k} vagas no Top da {n}', '{b} wants {k} Top slots on {n}'), { b: s.labels[d.lab]?.name ?? '?', k: d.n, n: v.name }), goto: { area: 'car31' } });
  return out;
});

registerEditable({
  id: 'car31.plat.subs', area: 'careers', label: l('Assinantes da sua primeira plataforma', 'Subscribers of your first platform'), kind: 'number', min: 0, max: 500_000_000, step: 1000, raw: true,
  get: (s) => platVentures31(s)[0]?.subs ?? 0,
  set: (s, val) => { const v = platVentures31(s)[0]; if (!v) return l('Sem plataforma.', 'No platform.'); v.subs = Math.max(0, Math.round(Number(val))); touch31(s); },
});
registerRunnable({
  id: 'car31.plat.fill', area: 'careers', label: l('Algoritmo: preencher as vagas vazias das playlists agora', 'Algorithm: fill empty playlist slots now'),
  run: (s) => { const v = platVentures31(s)[0]; if (!v) return l('Sem plataforma.', 'No platform.'); algoFill(s, v, pOf(s, v.id)); touch31(s); return l('Vagas preenchidas.', 'Slots filled.'); },
});
