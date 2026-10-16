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
import { car31On, careerSw31, exec31, registerExec31, touch31 } from './car31';
import { ventures, vpay, type Venture } from './ventures9';
import { money } from '../util';

export type List31 = 'top' | 'new' | 'mood';
export const LISTS31: List31[] = ['top', 'new', 'mood'];
export const LIST_NAME31: Record<List31, L> = { top: l('Top da semana', 'Top of the week'), new: l('Novidades', 'New this week'), mood: l('Para o seu humor', 'For your mood') };
export const LIST_SIZE31: Record<List31, number> = { top: 20, new: 15, mood: 10 };
/** fração dos assinantes que segue cada playlist */
const LIST_F: Record<List31, number> = { top: 0.5, new: 0.25, mood: 0.2 };
export const moodOn31 = (s: GameState): boolean => s.year >= 2018;
careerSw31('boycott', l('Plataforma: artistas e selos que boicotam tiram o catálogo de verdade (sai das playlists, não volta por um ano, leva assinantes); você decide quando dá.', 'Platform: boycotting acts and labels really pull their catalog (off the playlists, gone for a year, taking subscribers); you decide when you can.'));

export interface Demand31 { lab: string; n: number; u: number }
/** boicote pendente: o artista avisa que tira o catálogo até `u` se nada mudar */
export interface Boy31 { act: string; w: number; u: number; why: 'trust' | 'own' | 'payout' }
export interface Plat31 {
  lists: Record<List31, string[]>; dem: Demand31[]; farm: { rel: string; w: number }[]; seq: number; log: { w: number; t: L }[]; boy?: number;
  /** car31.boycott: catálogo fora da plataforma (ato ou selo → semana em que pode voltar) e avisos pendentes */
  out?: Record<string, number>; outL?: Record<string, number>; bq?: Boy31[];
}
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

// ---------------------------------------------------------------- catálogo fora (boicote)

/** O catálogo deste lançamento saiu da plataforma (artista ou selo em boicote)? Puro. */
export function outOf31(s: GameState, vid: string, rel: Release): boolean {
  if (!car31On(s, 'boycott')) return false;
  const p = ro(s)?.p[vid];
  return !!p && ((p.out?.[rel.actId] ?? -1) >= s.week || (p.outL?.[rel.owner] ?? -1) >= s.week);
}

// ---------------------------------------------------------------- decisões

const byId = (s: GameState, vid: string): Venture | undefined => platVentures31(s).find((v) => v.id === vid);
export function cands31p(s: GameState, n = 60, vid?: string): Release[] {
  return allReleases17(s).filter((r) => r.live && s.week - r.week <= 30 && s.week >= r.week && !!s.acts[r.actId] && !(vid && outOf31(s, vid, r)))
    .sort((a, b) => b.appeal - a.appeal || (a.id < b.id ? -1 : 1)).slice(0, n);
}
export function addList31(s: GameState, vid: string, list: List31, relId: string, pos?: number): L | null {
  const v = byId(s, vid);
  if (!v) return l('Plataforma inválida.', 'Invalid platform.');
  if (list === 'mood' && !moodOn31(s)) return l('Playlists por humor só a partir de 2018.', 'Mood playlists only from 2018.');
  const rel = s.releases[relId];
  if (!rel?.live) return l('Esse lançamento não está mais em circulação.', 'That release is no longer in circulation.');
  if (outOf31(s, vid, rel)) return l('Esse catálogo saiu da sua plataforma (boicote): não dá para pôr na playlist.', 'That catalog left your platform (boycott): it cannot go on a playlist.');
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
  const pool = cands31p(s, 80, v.id);
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
      if (car31On(s, 'boycott')) pullOut(s, v, p, { lab: d.lab });
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
  if (car31On(s, 'boycott')) boycottMonth(s, v, p, r, own, all.length);
  const sus = p.lists.new.filter((id) => { const rel = s.releases[id]; return rel && !mine(s.acts[rel.actId]) && !isMajor(s, rel.owner) && !p.farm.some((f) => f.rel === id); });
  if (sus.length && r.chance(0.12)) p.farm.push({ rel: r.pick(sus), w: s.week });
}

// ---------------------------------------------------------------- boicote (car31.boycott)

/** o catálogo sai de verdade: das playlists, por um ano, levando parte dos assinantes */
function pullOut(s: GameState, v: Venture, p: Plat31, o: { act?: string; lab?: string }): void {
  const gone = (id: string) => { const r = s.releases[id]; return !!r && ((o.act && r.actId === o.act) || (o.lab && r.owner === o.lab)); };
  for (const k of LISTS31) p.lists[k] = p.lists[k].filter((id) => !gone(id));
  if (o.act) (p.out ??= {})[o.act] = s.week + 52;
  if (o.lab) (p.outL ??= {})[o.lab] = s.week + 52;
  const fame = o.act ? s.acts[o.act]?.fame ?? 0 : Math.max(0, ...(s.labels[o.lab ?? '']?.roster ?? []).map((id) => s.acts[id]?.fame ?? 0));
  v.subs = Math.max(0, Math.round((v.subs ?? 0) * (1 - Math.min(0.06, 0.005 + fame / 1500))));
  touch31(s);
}
const BOY_WHY: Record<Boy31['why'], L> = {
  trust: l('os artistas não confiam nos repasses', 'artists do not trust the payouts'),
  own: l('as playlists favorecem o seu próprio selo', 'the playlists favour your own label'),
  payout: l('o repasse por execução é baixo', 'the per-play payout is low'),
};
export const boyWhy31 = (b: Boy31): L => BOY_WHY[b.why];
/** custo de convencer o artista a ficar (bônus de repasse por um ano) */
export const boyCost31 = (s: GameState, a: Act): number => money(s, 2000 + a.fame * a.fame * 20);
function boycottMonth(s: GameState, v: Venture, p: Plat31, r: Rng, own: number, n: number): void {
  const x = px(s, v.id);
  for (const k of Object.keys(p.out ?? {})) if (p.out![k] < s.week) delete p.out![k];
  for (const k of Object.keys(p.outL ?? {})) if (p.outL![k] < s.week) delete p.outL![k];
  // prazo vencido sem resposta: o artista sai
  for (const b of [...(p.bq ?? [])]) {
    if (b.u > s.week) continue;
    p.bq = (p.bq ?? []).filter((y) => y !== b);
    leave(s, v, p, b.act, l('Sem resposta da plataforma, o artista cumpre o aviso.', 'With no answer from the platform, the act makes good on the warning.'));
  }
  const trust = x?.trust ?? 50;
  const why: Boy31['why'] | null = n && own / n > 0.3 ? 'own' : trust < 40 ? 'trust' : (v.payout ?? 0.65) < 0.55 ? 'payout' : null;
  if (!why || (p.bq ?? []).length || !r.chance(why === 'own' ? 0.35 : 0.2 + (40 - Math.min(40, trust)) / 200)) return;
  const inLists = new Set(LISTS31.flatMap((k) => p.lists[k]).map((id) => s.releases[id]?.actId));
  const cand = Object.values(s.acts).filter((a) => !mine(a) && a.status !== 'retired' && a.status !== 'split' && a.fame >= 25 && !p.out?.[a.id] && (inLists.has(a.id) || a.fame >= 50))
    .sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1)).slice(0, 6);
  if (!cand.length) return;
  const a = r.pick(cand);
  (p.bq ??= []).push({ act: a.id, w: s.week, u: s.week + 4, why });
  emitFact(s, { kind: 'artist_boycott', actors: ['player', a.id], place: v.city, severity: 40, tags: ['car31', 'platform', 'bad'], src: 'car31',
    text: fmtL(l('{a} ameaça tirar o catálogo da {n}: {w}. Você tem quatro semanas para responder.', '{a} threatens to pull their catalog from {n}: {w}. You have four weeks to answer.'), { a: a.name, n: v.name, w: BOY_WHY[why] }),
    notify: { kind: 'bad', cat: 'business', prio: 2 }, diary: true });
}
function leave(s: GameState, v: Venture, p: Plat31, actId: string, why: L): void {
  const a = s.acts[actId];
  if (!a) return;
  const before = v.subs ?? 0;
  pullOut(s, v, p, { act: actId });
  const x = px(s, v.id);
  if (x) x.trust = clamp((x.trust ?? 50) - 1, 0, 100);
  note(p, s.week, fmtL(l('{a} tirou o catálogo.', '{a} pulled their catalog.'), { a: a.name }));
  emitFact(s, { kind: 'catalog_exit', actors: ['player', actId], place: v.city, severity: 45, tags: ['car31', 'platform', 'bad'], src: 'car31',
    text: fmtL(l('{a} tira o catálogo da {n} por um ano. {w} Saem cerca de {k} assinantes.', '{a} pulls their catalog from {n} for a year. {w} About {k} subscribers leave.'), { a: a.name, n: v.name, w: why, k: Math.max(0, before - (v.subs ?? 0)).toLocaleString('pt-BR') }),
    notify: { kind: 'bad', cat: 'business' }, diary: true });
}
/** Resposta ao aviso de boicote: pagar um bônus de repasse, tirar o seu selo das playlists ou deixar sair. */
export function answerBoy31(s: GameState, vid: string, actId: string, k: 'pay' | 'fix' | 'let'): L | null {
  const v = byId(s, vid);
  if (!v) return l('Plataforma inválida.', 'Invalid platform.');
  if (!car31On(s, 'boycott')) return l('Desligado nas regras desta partida.', 'Turned off in this game\'s rules.');
  const p = pOf(s, vid), b = (p.bq ?? []).find((x) => x.act === actId), a = s.acts[actId];
  if (!b || !a) return l('Esse aviso já venceu.', 'That warning has expired.');
  const x = px(s, vid);
  if (k === 'pay') {
    vpay(s, v.owner, -boyCost31(s, a), `boy31:${vid}:${actId}:${s.week}`, `Bônus de repasse: ${a.name}`, v);
    if (x) x.trust = clamp((x.trust ?? 50) + 3, 0, 100);
    note(p, s.week, fmtL(l('{a} fica: bônus de repasse por um ano.', '{a} stays: a payout bonus for a year.'), { a: a.name }));
  } else if (k === 'fix') {
    const own = LISTS31.flatMap((q) => p.lists[q]).filter((id) => mine(s.acts[s.releases[id]?.actId ?? '']));
    if (!own.length) return l('Não há faixas do seu selo nas playlists para tirar.', 'There are no tracks from your label on the playlists to remove.');
    for (const q of LISTS31) p.lists[q] = p.lists[q].filter((id) => !own.includes(id));
    if (x) x.trust = clamp((x.trust ?? 50) + 2, 0, 100);
    note(p, s.week, fmtL(l('Seu selo sai das playlists; {a} fica.', 'Your label leaves the playlists; {a} stays.'), { a: a.name }));
  } else leave(s, v, p, actId, l('A plataforma deixou sair.', 'The platform let them go.'));
  p.bq = (p.bq ?? []).filter((y) => y !== b);
  touch31(s);
  return null;
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
  for (const v of platVentures31(s)) for (const b of ro(s)?.p[v.id]?.bq ?? []) if (b.u >= from && b.u <= to)
    out.push({ id: `car31b:${v.id}:${b.act}:${b.u}`, w: b.u, kind: 'decision', act: true, tone: 'bad', t: fmtL(l('{a} tira o catálogo da {n} se você não responder', '{a} pulls their catalog from {n} unless you answer'), { a: s.acts[b.act]?.name ?? '?', n: v.name }), goto: { area: 'car31' } });
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
