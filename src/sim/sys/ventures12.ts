// Rodada 12 — as carreiras do dono de EDITORA: uma composição é uma obra com várias vidas. Compositores com
// especialidade e ética, pedidos específicos (artistas, cinema, publicidade, games), duplas de coautoria,
// propostas de cover/adaptação/sync/sample com exclusividade e autorização dos autores, divisão de autoria,
// proteger x oferecer, repertório para necessidades futuras e ressurreição de canções esquecidas.
// Mídia e plataforma vivem em media12.ts / platform12.ts, com o mesmo estado (ext4 'ventures12').

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import type { Act, GameState } from '../types';
import { fmtL, money, nextId, notify } from '../util';
import type { MedX } from './media12';
import type { PlatX } from './platform12';
import { funds, ventures, vpay, type Venture } from './ventures9';

export type Stance = 'protect' | 'pitch';
export interface CatX { stance?: Stance; split?: number; co?: string; excl?: { to: string; until: number }; lives?: number; last?: number }
export interface WProf { spec: string; ethic: number; mood: number; start: number; cut: number; lastAct: number; low: number; busy: number }
export type ReqKind = 'artist' | 'film' | 'ad' | 'game';
export interface Req { id: string; kind: ReqKind; genre: string; who: string; fee: number; until: number; actId?: string; brand?: { name: L; edge: number }; conflict?: string }
export type OfferKind = 'cover' | 'adapt' | 'sync' | 'sample';
export interface Offer12 { id: string; key: string; title: string; kind: OfferKind; by: string; fee: number; excl: number; until: number; countered?: boolean; actId?: string }
export interface PubX { w: Record<string, WProf>; reqs: Req[]; offers: Offer12[]; stock: Record<string, number>; pairs: [string, string][]; placed: number; relevant: number; revived: number; gained: number; cow: number; notes: L[] }
export interface V12 { pub: Record<string, PubX>; med: Record<string, MedX>; plat: Record<string, PlatX> }

declare module '../ext4' { interface Ext4 { ventures12: V12 } }
const fresh = (): V12 => ({ pub: {}, med: {}, plat: {} });
registerExt4('ventures12', fresh);
export const v12 = (s: GameState): V12 => {
  const x = s.x4 as unknown as { ventures12?: V12 };
  x.ventures12 ??= fresh();
  return x.ventures12;
};
export const hash = (str: string): number => { let h = 7; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; };
export const activeAct = (a?: Act): a is Act => !!a && a.status !== 'retired' && a.status !== 'split' && a.members.length > 0 && a.debutYear >= 0;
export const venture = (s: GameState, id: string, kind: Venture['kind']): Venture | undefined => ventures(s).list.find((x) => x.id === id && x.kind === kind);
export const res = (ok: boolean, text: L) => ({ ok, text });
export const seedRng = (s: GameState, tag: string): Rng => Rng.fromSeed(`${s.config.seed}:${tag}:${s.year}:${s.month}`);

// ================================================================== editora

export const pubOf = (s: GameState, vid: string): PubX => (v12(s).pub[vid] ??= { w: {}, reqs: [], offers: [], stock: {}, pairs: [], placed: 0, relevant: 0, revived: 0, gained: 0, cow: 0, notes: [] });
export const genresInPlay = (s: GameState): string[] => [...new Set(Object.values(s.acts).filter(activeAct).map((a) => a.genre))].sort();
export const keyOf = (c: { title: string; actId: string; y: number }): string => `${c.title}|${c.actId}|${c.y}`;
export const workOf = (v: Venture, key: string) => v.cat!.find((c) => keyOf(c) === key);
export const cx = (c: NonNullable<Venture['cat']>[number]): CatX => (c.x ??= {});
const pnote = (x: PubX, t: L) => { x.notes.unshift(t); if (x.notes.length > 8) x.notes.pop(); };

export function profOf(s: GameState, v: Venture, pid: string): WProf {
  const x = pubOf(s, v.id);
  const gs = genresInPlay(s);
  const w = v.writers!.find((q) => q.pid === pid);
  const h = hash(pid + s.config.seed);
  return (x.w[pid] ??= { spec: gs.length ? gs[h % gs.length] : 'pop', ethic: 20 + ((h >> 5) % 71), mood: 60, start: w?.skill ?? 50, cut: Math.round((0.3 + ((h >> 9) % 20) / 100) * 100) / 100, lastAct: s.week, low: 0, busy: 0 });
}
export const fitOf = (p: WProf, genre: string): number => (p.spec === genre ? 1 : 0.55);
export const ETHIC_NAME = (e: number): L => (e >= 70 ? l('princípios fortes', 'strong principles') : e >= 45 ? l('flexível', 'flexible') : l('pragmático', 'pragmatic'));
const TITLE_A = ['Noite', 'Estrada', 'Coração', 'Cidade', 'Fogo', 'Mar', 'Saudade', 'Asfalto', 'Lua', 'Rádio', 'Vento', 'Ouro'];
const TITLE_B = ['Azul', 'Sem Fim', 'de Neon', 'Perdida', 'Elétrica', 'do Sul', 'em Chamas', 'Calada', 'Selvagem', 'de Vidro'];
const BRANDS: { name: L; edge: number; from: number }[] = [
  { name: l('Cigarros Fumaça', 'Smoke Cigarettes'), edge: 85, from: 1930 }, { name: l('Refrigerante Borbulha', 'Fizz Soda'), edge: 40, from: 1930 },
  { name: l('Banco Cofre', 'Vault Bank'), edge: 55, from: 1930 }, { name: l('Petrolífera Atlas', 'Atlas Oil'), edge: 75, from: 1950 },
  { name: l('Fast-food Burguer Rei', 'King Burger'), edge: 50, from: 1960 }, { name: l('Candidato Dr. Pires', 'Candidate Pires'), edge: 90, from: 1950 },
  { name: l('Tênis Corrida', 'Run Sneakers'), edge: 30, from: 1975 }, { name: l('Casa de apostas Sorte Já', 'LuckyNow Betting'), edge: 80, from: 2010 },
];
export function reqKinds(s: GameState): ReqKind[] { return ['artist', ...(s.year >= 1925 ? ['film' as const] : []), ...(s.year >= 1950 ? ['ad' as const] : []), ...(s.year >= 1985 ? ['game' as const] : [])]; }
export const REQ_NAME: Record<ReqKind, L> = { artist: l('Artista procura música', 'Artist wants a song'), film: l('Trilha de cinema/TV', 'Film/TV score'), ad: l('Campanha publicitária', 'Ad campaign'), game: l('Trilha de game', 'Game soundtrack') };
export const OFFER_NAME: Record<OfferKind, L> = { cover: l('Versão (cover)', 'Cover'), adapt: l('Adaptação/tradução', 'Adaptation/translation'), sync: l('Sincronização', 'Sync'), sample: l('Sample', 'Sample') };
const BASE_FEE: Record<ReqKind, number> = { artist: 3000, film: 6000, ad: 12000, game: 5000 };

function newReq(s: GameState, r: Rng, v: Venture, x: PubX): void {
  const kind = r.pick(reqKinds(s));
  const acts = Object.values(s.acts).filter((a) => activeAct(a) && a.fame >= 10);
  if (!acts.length) return;
  const a = r.pick(acts);
  const q: Req = { id: nextId(s, 'rq'), kind, genre: kind === 'artist' ? a.genre : r.pick(genresInPlay(s)), who: kind === 'artist' ? a.name : '', fee: Math.round(money(s, BASE_FEE[kind]) * v.level * (0.7 + r.next() * 0.8)), until: s.week + 10 };
  if (kind === 'artist') q.actId = a.id;
  if (kind === 'ad') { const b = r.pick(BRANDS.filter((q2) => q2.from <= s.year)); q.brand = { name: b.name, edge: b.edge }; q.who = b.name.pt; q.fee = Math.round(q.fee * 1.8); }
  if (kind === 'film') q.who = r.pick(['Estúdio Aurora', 'Cine Sul', 'TV Nacional', 'Produtora Faro']);
  if (kind === 'game') q.who = r.pick(['Pixel Norte', 'Estúdio Fase 2', 'Lúdica Games']);
  x.reqs.push(q);
}

function addWork(s: GameState, r: Rng, v: Venture, pid: string, act: Act, mult: number, co?: string): NonNullable<Venture['cat']>[number] {
  const w = v.writers!.find((q) => q.pid === pid)!;
  const c = { title: `${r.pick(TITLE_A)} ${r.pick(TITLE_B)}`, actId: act.id, y: s.year, v: money(s, 20 + act.fame * w.skill * 0.08) * (0.7 + r.next() * 0.6) * mult, wp: pid, x: { lives: 1, last: s.year, co } as CatX };
  v.cat!.push(c);
  if (v.cat!.length > 80) { v.cat!.sort((a, b) => b.v - a.v); v.cat!.length = 80; }
  return c;
}
const touch = (s: GameState, v: Venture, pid: string, mood: number, skill = 0): void => {
  const p = profOf(s, v, pid), w = v.writers!.find((q) => q.pid === pid);
  p.mood = clamp(p.mood + mood, 0, 100); p.lastAct = s.week;
  if (w && skill) { const n = Math.min(95, w.skill + skill); pubOf(s, v.id).gained += n - w.skill; w.skill = n; }
};
export const writerNet = (s: GameState, v: Venture, pid: string | undefined, fee: number): number => fee * (1 - (pid ? profOf(s, v, pid).cut : 0.35));

/** Probabilidade de o autor entregar o que o pedido quer. */
export function reqChance(s: GameState, v: Venture, q: Req, pid: string): number {
  const w = v.writers!.find((z) => z.pid === pid)!;
  const p = profOf(s, v, pid), x = pubOf(s, v.id);
  return clamp(0.3 + w.skill / 200 * fitOf(p, q.genre) + v.rep / 400 + ((x.stock[q.genre] ?? 0) > 0 ? 0.25 : 0) + (p.mood - 50) / 300, 0.08, 0.92);
}
export const adConflict = (s: GameState, v: Venture, q: Req, pid: string): boolean => !!q.brand && q.brand.edge * profOf(s, v, pid).ethic / 100 > 35;

function deliver(s: GameState, r: Rng, v: Venture, x: PubX, q: Req, pid: string, feeMult: number, why: L): { ok: boolean; text: L } {
  const gs = Object.values(s.acts).filter(activeAct);
  const act = q.actId && s.acts[q.actId] ? s.acts[q.actId] : gs.find((a) => a.genre === q.genre) ?? r.pick(gs);
  const stock = (x.stock[q.genre] ?? 0) > 0 && q.kind === 'artist';
  if (stock) x.stock[q.genre]--;
  const c = addWork(s, r, v, pid, act, q.kind === 'artist' ? 1 : 0.8);
  const fee = Math.round(q.fee * feeMult);
  vpay(s, v.owner, writerNet(s, v, pid, fee), `rq:${q.id}`, `Encomenda: ${q.who || 'cliente'}`, v);
  x.reqs = x.reqs.filter((z) => z.id !== q.id);
  x.placed++;
  if (q.kind !== 'artist' || act.fame >= 30) x.relevant++;
  v.rep = clamp(v.rep + (q.kind === 'artist' ? act.fame / 60 : 2), 0, 100);
  touch(s, v, pid, 6, 0.8);
  return res(true, fmtL(l('"{t}" fecha com {c}. {w}', '"{t}" lands with {c}. {w}'), { t: c.title, c: q.who || act.name, w: why }));
}

/** Escala um compositor para um pedido (publicidade pode esbarrar na ética do autor). */
export function serveReq(s: GameState, r: Rng, vid: string, rid: string, pid: string): { ok: boolean; text: L } {
  const v = venture(s, vid, 'publisher'), x = v && pubOf(s, vid), q = x?.reqs.find((z) => z.id === rid);
  if (!v || !x || !q || !v.writers!.some((w) => w.pid === pid)) return res(false, l('Inválido.', 'Invalid.'));
  const p = profOf(s, v, pid), nm = v.writers!.find((w) => w.pid === pid)!.name;
  if (p.busy > s.week) return res(false, fmtL(l('{n} está ocupado até a semana {w}.', '{n} is busy until week {w}.'), { n: nm, w: p.busy }));
  if (adConflict(s, v, q, pid)) { q.conflict = pid; p.mood = clamp(p.mood - 2, 0, 100); return res(false, fmtL(l('{n} ({e}) rejeita associar o nome à marca {b}. Decida: recusar, oferecer outra música ou negociar condições.', '{n} ({e}) refuses to attach their name to {b}. Decide: refuse, pitch another song or negotiate terms.'), { n: nm, e: ETHIC_NAME(p.ethic), b: q.brand!.name }));
  }
  p.busy = s.week + 3;
  if (!r.chance(reqChance(s, v, q, pid))) { touch(s, v, pid, -2); return res(false, fmtL(l('A versão de {n} não convenceu {c}.', '{n}\'s take did not convince {c}.'), { n: nm, c: q.who })); }
  return deliver(s, r, v, x, q, pid, 1, (x.stock[q.genre] ?? 0) > 0 && q.kind === 'artist' ? l('Repertório de estoque ajudou.', 'Stocked repertoire helped.') : fitOf(p, q.genre) === 1 ? l('Especialidade certeira.', 'Spot-on specialty.') : l('Fora da zona de conforto, mas passou.', 'Outside the comfort zone, but it worked.'));
}

export type AdMode = 'refuse' | 'other' | 'negotiate';
/** Cenário da campanha que paga muito mas o autor rejeita a marca. */
export function resolveAd(s: GameState, r: Rng, vid: string, rid: string, mode: AdMode, otherKey?: string): { ok: boolean; text: L } {
  const v = venture(s, vid, 'publisher'), x = v && pubOf(s, vid), q = x?.reqs.find((z) => z.id === rid);
  if (!v || !x || !q?.conflict) return res(false, l('Inválido.', 'Invalid.'));
  const pid = q.conflict, p = profOf(s, v, pid), nm = v.writers!.find((w) => w.pid === pid)?.name ?? '—';
  if (mode === 'refuse') {
    x.reqs = x.reqs.filter((z) => z.id !== q.id);
    touch(s, v, pid, 10); v.rep = clamp(v.rep + 1, 0, 100);
    return res(true, fmtL(l('Você recusa os {f}. {n} fica grato: confiança em alta, integridade da editora também.', 'You turn down {f}. {n} is grateful: trust up, and so is the publisher\'s integrity.'), { f: Math.round(q.fee / 100), n: nm }));
  }
  if (mode === 'other') {
    const c = otherKey ? workOf(v, otherKey) : undefined;
    if (!c || (c.wp && adConflict(s, v, q, c.wp))) return res(false, l('Escolha uma música de autor sem objeção à marca.', 'Pick a song by a writer with no objection to the brand.'));
    if (c.x?.excl && c.x.excl.until > s.year) return res(false, l('Essa música está presa a uma exclusividade.', 'That song is tied to an exclusivity.'));
    vpay(s, v.owner, writerNet(s, v, c.wp, q.fee * 0.8), `rq:${q.id}`, `Sync de catálogo: ${q.who}`, v);
    const e = cx(c); e.lives = (e.lives ?? 1) + 1; e.last = s.year; c.v *= 1.06;
    x.reqs = x.reqs.filter((z) => z.id !== q.id); x.placed++; x.relevant++;
    if (c.wp) touch(s, v, c.wp, 2);
    touch(s, v, pid, 3);
    return res(true, fmtL(l('"{t}" vai para a campanha por 80% do cachê; {n} não precisou se queimar.', '"{t}" goes into the campaign for 80% of the fee; {n} did not have to compromise.'), { t: c.title, n: nm }));
  }
  const pr = clamp(0.25 + (100 - q.brand!.edge) / 200 + v.rep / 300 + p.mood / 400, 0.1, 0.85);
  if (!r.chance(pr)) { x.reqs = x.reqs.filter((z) => z.id !== q.id); touch(s, v, pid, -5); return res(false, fmtL(l('A {b} não aceita as condições e leva a campanha embora. {n} se sentiu pressionado.', '{b} will not accept the terms and walks. {n} felt pressured.'), { b: q.brand!.name, n: nm })); }
  q.conflict = undefined; q.fee = Math.round(q.fee * 0.75); p.ethic = clamp(p.ethic - 6, 0, 100);
  const out = deliver(s, r, v, x, q, pid, 1, l('Com roteiro limpo, sem a letra associada ao produto.', 'With a clean script and no product mention in the lyrics.'));
  return out;
}

// ---- repertório, duplas, divisão, proteger/oferecer, ressurreição
export function trending(s: GameState): { g: string; m: number }[] {
  const by: Record<string, number[]> = {};
  for (const a of Object.values(s.acts)) if (activeAct(a)) (by[a.genre] ??= []).push(a.momentum);
  return Object.entries(by).map(([g, m]) => ({ g, m: m.reduce((t, z) => t + z, 0) / m.length })).sort((a, b) => b.m - a.m).slice(0, 4);
}
export const commissionCost = (s: GameState, skill: number): number => money(s, 700 + skill * 8);
export function commission(s: GameState, vid: string, pid: string, genre: string): { ok: boolean; text: L } {
  const v = venture(s, vid, 'publisher'), w = v?.writers!.find((z) => z.pid === pid);
  if (!v || !w) return res(false, l('Inválido.', 'Invalid.'));
  const p = profOf(s, v, pid), x = pubOf(s, vid);
  if (p.busy > s.week) return res(false, l('Compositor ocupado.', 'Writer is busy.'));
  const c = commissionCost(s, w.skill);
  if (funds(s, v.owner) < c) return res(false, l('Sem dinheiro.', 'Not enough money.'));
  vpay(s, v.owner, -c, `stock:${vid}:${pid}`, 'Repertório encomendado', v);
  p.busy = s.week + 6; x.stock[genre] = (x.stock[genre] ?? 0) + 1; touch(s, v, pid, 3, 0.4);
  return res(true, fmtL(l('{n} escreve uma música de reserva em {g}. Estoque: {k}.', '{n} writes a spare song in {g}. Stock: {k}.'), { n: w.name, g: genre, k: x.stock[genre] }));
}
export function chemistry(s: GameState, v: Venture, a: string, b: string): number {
  const pa = profOf(s, v, a), pb = profOf(s, v, b), A = s.persons[a], B = s.persons[b];
  const rel = ((A?.rel[b] ?? 0) + (B?.rel[a] ?? 0)) / 2;
  return clamp(0.45 + rel / 250 + (pa.spec === pb.spec ? 0.08 : 0.12) - Math.abs(pa.mood - pb.mood) / 400, 0.1, 0.95);
}
export function setPair(s: GameState, vid: string, a: string, b: string): { ok: boolean; text: L } {
  const v = venture(s, vid, 'publisher'), x = v && pubOf(s, vid);
  if (!v || !x || a === b) return res(false, l('Inválido.', 'Invalid.'));
  if (x.pairs.some((p) => p.includes(a) && p.includes(b))) return res(false, l('Dupla já existe.', 'Pair already exists.'));
  if (x.pairs.length >= v.level + 1) return res(false, l('Sem espaço para mais duplas neste nível.', 'No room for more pairs at this level.'));
  x.pairs.push([a, b]);
  return res(true, l('Dupla formada.', 'Pair formed.'));
}
export function coWrite(s: GameState, r: Rng, vid: string, a: string, b: string): { ok: boolean; text: L } {
  const v = venture(s, vid, 'publisher'), x = v && pubOf(s, vid);
  const wa = v?.writers!.find((z) => z.pid === a), wb = v?.writers!.find((z) => z.pid === b);
  if (!v || !x || !wa || !wb) return res(false, l('Inválido.', 'Invalid.'));
  const pa = profOf(s, v, a), pb = profOf(s, v, b);
  if (pa.busy > s.week || pb.busy > s.week) return res(false, l('Alguém da dupla está ocupado.', 'Someone in the pair is busy.'));
  const c = money(s, 600);
  if (funds(s, v.owner) < c) return res(false, l('Sem dinheiro.', 'Not enough money.'));
  vpay(s, v.owner, -c, `cow:${vid}`, 'Sessão de coautoria', v);
  pa.busy = pb.busy = s.week + 4;
  const ch = chemistry(s, v, a, b);
  if (!r.chance(0.3 + ch * 0.65)) { touch(s, v, a, -3); touch(s, v, b, -3); return res(false, fmtL(l('A sessão de {a} e {b} não rendeu (química {c}%).', 'The {a} and {b} session went nowhere (chemistry {c}%).'), { a: wa.name, b: wb.name, c: Math.round(ch * 100) })); }
  const gs = Object.values(s.acts).filter(activeAct);
  const act = gs.find((z) => z.genre === pa.spec) ?? gs.find((z) => z.genre === pb.spec) ?? r.pick(gs);
  const hit = ch > 0.7 && r.chance(0.12);
  const w = addWork(s, r, v, a, act, (1 + ch * 0.8) * (hit ? 2 : 1), b);
  cx(w).split = 50; x.cow++;
  touch(s, v, a, 4, 0.8 * ch + 0.3); touch(s, v, b, 4, 0.8 * ch + 0.3);
  const t = fmtL(hit ? l('Dupla afinadíssima: {a} e {b} escrevem "{t}", um achado.', 'A perfect match: {a} and {b} write "{t}", a gem.') : l('{a} e {b} escrevem "{t}" para {c}.', '{a} and {b} write "{t}" for {c}.'), { a: wa.name, b: wb.name, t: w.title, c: act.name });
  pnote(x, t);
  return res(true, t);
}
/** Divisão de autoria: o autor principal fica com pct%. Quem rende mais e leva menos fica ressentido. */
export function setSplit(s: GameState, vid: string, key: string, pct: number): { ok: boolean; text: L } {
  const v = venture(s, vid, 'publisher'), c = v && workOf(v, key);
  if (!v || !c?.wp || !c.x?.co) return res(false, l('Só obras de coautoria têm divisão.', 'Only co-written works have a split.'));
  pct = clamp(Math.round(pct), 20, 80); c.x.split = pct;
  const sa = v.writers!.find((z) => z.pid === c.wp)?.skill ?? 50, sb = v.writers!.find((z) => z.pid === c.x!.co)?.skill ?? 50;
  const fairA = sa / (sa + sb) * 100;
  touch(s, v, c.wp, clamp((pct - fairA) / 4, -8, 6)); touch(s, v, c.x.co, clamp(((100 - pct) - (100 - fairA)) / 4, -8, 6));
  return res(true, fmtL(l('Divisão {a}/{b}. Pela habilidade o justo seria ~{f}/{g}.', 'Split {a}/{b}. By skill the fair split is ~{f}/{g}.'), { a: pct, b: 100 - pct, f: Math.round(fairA), g: 100 - Math.round(fairA) }));
}
export function setStance(s: GameState, vid: string, key: string, st: Stance | undefined): void {
  const v = venture(s, vid, 'publisher'), c = v && workOf(v, key);
  if (c) cx(c).stance = st;
}
export const forgotten = (s: GameState, v: Venture): NonNullable<Venture['cat']> => v.cat!.filter((c) => s.year - (c.x?.last ?? c.y) >= 6).sort((a, b) => b.v - a.v).slice(0, 10);
export function revive(s: GameState, r: Rng, vid: string, key: string): { ok: boolean; text: L } {
  const v = venture(s, vid, 'publisher'), x = v && pubOf(s, vid), c = v && workOf(v, key);
  if (!v || !x || !c || s.year - (c.x?.last ?? c.y) < 6) return res(false, l('Só músicas esquecidas há 6+ anos.', 'Only songs forgotten for 6+ years.'));
  const cost = money(s, 1200);
  if (funds(s, v.owner) < cost) return res(false, l('Sem dinheiro.', 'Not enough money.'));
  vpay(s, v.owner, -cost, `rev:${c.title}`, `Nova versão de "${c.title}"`, v);
  const pool = Object.values(s.acts).filter((a) => activeAct(a) && a.fame >= 15 && a.id !== c.actId).sort((a, b) => b.momentum - a.momentum);
  const act = pool.find((a) => profOf(s, v, c.wp ?? '').spec === a.genre) ?? pool[0];
  if (!act) return res(false, l('Nenhum artista para regravar.', 'Nobody to re-record it.'));
  if (!r.chance(clamp(0.35 + act.fame / 250 + v.rep / 300, 0.1, 0.9))) return res(false, fmtL(l('{a} ouviu a ideia e não se interessou.', '{a} heard the pitch and passed.'), { a: act.name }));
  const viral = act.fame >= 40 && r.chance(0.18);
  c.v *= viral ? 3 : 1.8;
  const e = cx(c); e.lives = (e.lives ?? 1) + 1; e.last = s.year; x.revived++; x.placed++; if (act.fame >= 30) x.relevant++;
  act.momentum = clamp(act.momentum + 3, 0, 100);
  if (c.wp) touch(s, v, c.wp, 8);
  const t = fmtL(viral ? l('"{t}" renasce com {a} e vira febre de novo.', '"{t}" is reborn with {a} and goes viral again.') : l('{a} grava nova versão de "{t}".', '{a} records a new version of "{t}".'), { t: c.title, a: act.name });
  pnote(x, t);
  return res(true, t);
}

// ---- propostas (cover/adaptação/sync/sample)
export function answerOffer(s: GameState, r: Rng, vid: string, oid: string, mode: 'accept' | 'counter' | 'decline', excl = false): { ok: boolean; text: L } {
  const v = venture(s, vid, 'publisher'), x = v && pubOf(s, vid), o = x?.offers.find((z) => z.id === oid), c = v && o && workOf(v, o.key);
  if (!v || !x || !o) return res(false, l('Inválido.', 'Invalid.'));
  const drop = () => { x.offers = x.offers.filter((z) => z.id !== oid); };
  if (mode === 'decline' || !c) { drop(); return res(true, l('Proposta recusada.', 'Offer declined.')); }
  if (mode === 'counter') {
    if (o.countered) return res(false, l('Já houve contraproposta.', 'Already countered.'));
    o.countered = true;
    if (r.chance(clamp(0.35 + v.rep / 300, 0.1, 0.8))) { o.fee = Math.round(o.fee * 1.3); return res(true, fmtL(l('{b} topa subir o cachê para {f}.', '{b} agrees to raise the fee to {f}.'), { b: o.by, f: Math.round(o.fee / 100) })); }
    if (r.chance(0.35)) { drop(); return res(false, fmtL(l('{b} desiste da proposta.', '{b} walks away.'), { b: o.by })); }
    return res(false, fmtL(l('{b} mantém a oferta original.', '{b} stands by the original offer.'), { b: o.by }));
  }
  if (c.x?.excl && c.x.excl.until > s.year) { drop(); return res(false, fmtL(l('Exclusividade com {t} impede.', 'Exclusivity with {t} blocks this.'), { t: c.x.excl.to })); }
  // autorização dos autores
  const need = [c.wp, c.x?.co].filter((z): z is string => !!z);
  for (const pid of need) {
    const p = profOf(s, v, pid), nm = v.writers!.find((z) => z.pid === pid)?.name ?? '—';
    const pr = clamp(0.92 - p.ethic / 100 * (o.kind === 'adapt' ? 0.55 : o.kind === 'sample' ? 0.4 : 0.25) + (p.mood - 50) / 200, 0.08, 0.98);
    if (!r.chance(pr)) { drop(); touch(s, v, pid, -3); return res(false, fmtL(l('{n} não autoriza ({k}): {w}.', '{n} does not authorize ({k}): {w}.'), { n: nm, k: OFFER_NAME[o.kind], w: p.mood < 40 ? l('anda desmotivado e se sente ignorado', 'is demotivated and feels ignored') : l('a obra é íntima demais para isso', 'the work is too personal for that') })); }
  }
  const fee = Math.round(o.fee * (excl ? 1.4 : 1));
  const e = cx(c);
  vpay(s, v.owner, writerNet(s, v, c.wp, fee), `of:${o.id}`, `${OFFER_NAME[o.kind].pt} "${c.title}"`, v);
  e.lives = (e.lives ?? 1) + 1; e.last = s.year;
  if (e.lives > 4) c.v *= 0.9; else c.v *= o.kind === 'cover' ? 1.1 : 1.05;
  if (excl) e.excl = { to: o.by, until: s.year + 2 };
  const act = o.actId ? s.acts[o.actId] : undefined;
  if (act) { act.momentum = clamp(act.momentum + 2, 0, 100); if (act.fame >= 30) x.relevant++; } else x.relevant++;
  x.placed++; v.rep = clamp(v.rep + 1.5, 0, 100);
  for (const pid of need) touch(s, v, pid, 4, 0.3);
  drop();
  return res(true, fmtL(l('"{t}" ganha nova vida: {k} com {b}{e}.', '"{t}" gets a new life: {k} with {b}{e}.'), { t: c.title, k: OFFER_NAME[o.kind], b: o.by, e: excl ? l(' (exclusivo por 2 anos)', ' (exclusive for 2 years)') : '' }));
}

function pubMonth(s: GameState, r: Rng, v: Venture): void {
  const x = pubOf(s, v.id);
  const ids = new Set(v.writers!.map((w) => w.pid));
  for (const pid of Object.keys(x.w)) if (!ids.has(pid)) delete x.w[pid];
  x.reqs = x.reqs.filter((q) => q.until > s.week);
  x.offers = x.offers.filter((o) => o.until > s.week && workOf(v, o.key));
  if (v.writers!.length) {
    for (const w of v.writers!) {
      const p = profOf(s, v, w.pid);
      const base = (s.week - p.lastAct > 26 ? 32 : 60) + (v.rep - 50) / 8;
      p.mood = clamp(p.mood + (base - p.mood) * 0.1, 0, 100);
      p.low = p.mood < 22 ? p.low + 1 : 0;
      if (p.low >= 3) {
        v.writers = v.writers!.filter((z) => z.pid !== w.pid); x.pairs = x.pairs.filter((q) => !q.includes(w.pid));
        const t = fmtL(l('{n} rompe o contrato com {v}: sentia-se esquecido e mal aproveitado.', '{n} leaves {v}: felt forgotten and underused.'), { n: w.name, v: v.name });
        notify(s, t, 'bad'); pnote(x, t); v.rep = clamp(v.rep - 2, 0, 100);
      }
    }
    if (x.reqs.length < 3 && r.chance(0.3 + v.rep / 300)) newReq(s, r, v, x);
  }
  // vidas da obra: protegidas ganham valor (e prestígio); oferecidas atraem propostas, mas saturam
  let pitchW = 0, prot = 0;
  for (const c of v.cat!) { const st = c.x?.stance; if (st === 'protect') { c.v *= 1.003; prot++; } else if (!(c.x?.excl && c.x.excl.until > s.year)) pitchW += st === 'pitch' ? 2.2 : 1; }
  v.rep = clamp(v.rep + prot * 0.01, 0, 100);
  if (v.cat!.length && x.offers.length < 4 && r.chance(clamp(pitchW * 0.006 * (0.6 + v.rep / 100), 0, 0.5))) {
    const pool = v.cat!.filter((c) => c.x?.stance !== 'protect' && !(c.x?.excl && c.x.excl.until > s.year));
    const c = pool.length ? r.pick(pool.flatMap((z) => (z.x?.stance === 'pitch' ? [z, z] : [z]))) : undefined;
    if (c) {
      const kinds: OfferKind[] = ['cover', ...(s.year >= 1930 ? ['adapt' as const] : []), ...(s.year >= 1925 ? ['sync' as const] : []), ...(s.year >= 1985 ? ['sample' as const] : [])];
      const a = r.pick(Object.values(s.acts).filter((z) => activeAct(z) && z.id !== c.actId && z.fame >= 8));
      const k = r.pick(kinds);
      if (a) x.offers.push({ id: nextId(s, 'of'), key: keyOf(c), title: c.title, kind: k, by: k === 'sync' ? r.pick(['Cine Sul', 'TV Nacional', 'Produtora Faro']) : a.name, actId: k === 'sync' ? undefined : a.id, fee: Math.round(Math.max(money(s, 800), c.v * 12 * (1 + r.next() * 2))), excl: 0, until: s.week + 12 });
    }
  }
}

// reputação do compositor entre os pares cresce com o desenvolvimento da casa
registerSimHook('month', 'ventures12:pub', (s) => {
  const r = seedRng(s, 'ventures12:pub');
  for (const v of ventures(s).list) if (v.kind === 'publisher') pubMonth(s, r, v);
  const st = v12(s), alive = new Set(ventures(s).list.map((z) => z.id));
  for (const k of ['pub', 'med', 'plat'] as const) for (const id of Object.keys(st[k])) if (!alive.has(id)) delete st[k][id];
});
