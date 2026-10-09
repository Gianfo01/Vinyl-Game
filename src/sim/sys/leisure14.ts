// Rodada 14: vida fora do trabalho para TODOS (artistas, executivos rivais e equipe), não só o jogador.
// Cada pessoa notável tem hobbies (com época), um ponto de encontro na sua cidade (bar, boate, igreja,
// academia, estúdio, café, praça, sindicato, fliperama) e uma vida pessoal que corre sozinha: namoros,
// casamentos, separações, filhos, forma física, vícios, esgotamento e recuperação. Nos pontos de encontro
// as pessoas se conhecem → amizades, romances, rixas, parcerias e laços com a cena local. Tudo isso mexe
// em moral, inspiração, estresse, saúde, relações, fofocas e no tema das próximas músicas (musa).
// Barato: no máximo CAP pessoas por mês (rodízio; o elenco do jogador sempre entra).
// Aleatoriedade própria (Rng semeado por semente+mês e por música): não mexe no fluxo compartilhado.

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { atPlace14 } from './polish14';
import { langForCity, personName } from '../people';
import { ensureFamily } from '../dynasty';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, nextId, notify, remember } from '../util';
import { nudgeAdmiration } from './bonds9';
import { themeById } from './creation/core';
import { leaders } from './leaders10';
import { energyLeft, playerPerson, spendEnergy } from './life';
import { P, addPost, healthOf, socialEra } from './people/state';
import { ownerOf } from './people/owner';
import { opine, opinionOf, per13, type P13 } from './persona13';
import { scene12 } from './scenes12';

// ---------------------------------------------------------------- dados

export type Spot14 = 'bar' | 'club' | 'church' | 'gym' | 'studio' | 'cafe' | 'park' | 'hall' | 'arcade' | 'home';
export const SPOT14: Record<Spot14, { name: (y: number) => L; from: number; cost: number; why: L }> = {
  bar: { name: () => l('Bar da esquina', 'Corner bar'), from: 0, cost: 40, why: l('Boemia e conversa solta: amizades rápidas e algumas brigas.', 'Drinks and loose talk: quick friendships and the odd fight.') },
  club: { name: (y) => (y < 1974 ? l('Boate', 'Nightclub') : y < 1988 ? l('Discoteca', 'Disco') : y < 2005 ? l('Clube / rave', 'Club / rave') : l('Clube noturno', 'Nightclub')), from: 1955, cost: 150, why: l('Noite longa: romances, excessos e gente da cena.', 'Long nights: romance, excess and scene people.') },
  church: { name: () => l('Igreja / templo', 'Church / temple'), from: 0, cost: 10, why: l('Fé e comunidade: acalma e aproxima quem crê igual.', 'Faith and community: calms and bonds believers.') },
  gym: { name: (y) => (y < 1975 ? l('Clube esportivo', 'Sports club') : l('Academia', 'Gym')), from: 0, cost: 60, why: l('Corpo em dia: menos cansaço, mais disciplina.', 'Body in shape: less fatigue, more discipline.') },
  studio: { name: () => l('Jam no estúdio', 'Studio jam'), from: 0, cost: 80, why: l('Músicos tocando fora do expediente: parcerias nascem aqui.', 'Musicians playing after hours: collaborations are born here.') },
  cafe: { name: (y) => (y < 1995 ? l('Café e livraria', 'Café and bookshop') : l('Café / coworking', 'Café / coworking')), from: 0, cost: 30, why: l('Livros, arte e ideias: inspiração tranquila.', 'Books, art and ideas: quiet inspiration.') },
  park: { name: () => l('Praça, praia e quadra', 'Park, beach and pitch'), from: 0, cost: 10, why: l('Esporte e natureza ao ar livre.', 'Sport and nature outdoors.') },
  hall: { name: (y) => (y < 1990 ? l('Sindicato / associação', 'Union hall') : l('Coletivo / ONG', 'Collective / NGO')), from: 0, cost: 20, why: l('Política e caridade: aliados de causa (e inimigos).', 'Politics and charity: allies of the cause (and enemies).') },
  arcade: { name: (y) => (y < 1998 ? l('Fliperama', 'Arcade') : y < 2012 ? l('Lan house', 'LAN café') : l('Bar de games', 'Gaming bar')), from: 1978, cost: 25, why: l('Jogos: aliviam o estresse, roubam o sono.', 'Games: relieve stress, steal sleep.') },
  home: { name: () => l('Em casa', 'At home'), from: 0, cost: 0, why: l('Tempo com a família: ninguém novo, mas o lar fica firme.', 'Family time: nobody new, but home stays solid.') },
};
export const SPOTS14 = Object.keys(SPOT14) as Spot14[];

type F = NonNullable<P13['facets']>;
interface Fx14 { mor?: number; insp?: number; str?: number; fat?: number; fit?: number; dep?: number }
export interface Hob14 { id: string; name: L; from: number; to?: number; spot: Spot14; fx: Fx14; theme?: string; w: (f: F, p: P13) => number }
const rel = (p: P13) => p.views.rel !== 'none' && p.views.rel !== 'atheist';
export const HOB14: Hob14[] = [
  { id: 'sport', name: l('Futebol e esportes', 'Football and sports'), from: 0, spot: 'park', fx: { fit: 3, str: -2, mor: 1 }, w: (f) => f.disciplina + f.sociabilidade + f.coragem - 120 },
  { id: 'fitness', name: l('Malhação', 'Working out'), from: 0, spot: 'gym', fx: { fit: 4, str: -2, fat: -1 }, w: (f) => f.disciplina + f.vaidade - 70 },
  { id: 'reading', name: l('Leitura', 'Reading'), from: 0, spot: 'cafe', fx: { insp: 2, str: -1 }, theme: 'nostalgia', w: (f) => f.curiosidade + f.melancolia - 70 },
  { id: 'party', name: l('Noitadas', 'Partying'), from: 1955, spot: 'club', fx: { mor: 3, fat: 3, dep: 2, insp: 1 }, theme: 'party', w: (f) => f.impulsividade + f.sociabilidade + f.vaidade - 120 },
  { id: 'bar', name: l('Boemia', 'Bar hopping'), from: 0, spot: 'bar', fx: { mor: 2, fat: 1, dep: 1, insp: 1 }, theme: 'heartbreak', w: (f) => f.sociabilidade + f.humor + f.melancolia - 110 },
  { id: 'faith', name: l('Religião', 'Religion'), from: 0, spot: 'church', fx: { str: -3, mor: 1 }, theme: 'faith', w: (_f, p) => (rel(p) ? 20 + p.views.dev : -40) },
  { id: 'family', name: l('Família', 'Family time'), from: 0, spot: 'home', fx: { mor: 2, str: -2 }, theme: 'love', w: (f) => f.romantismo + f.lealdade - 80 },
  { id: 'travel', name: l('Viagens', 'Travel'), from: 0, spot: 'home', fx: { insp: 3, str: -2, fat: -1 }, theme: 'road', w: (f) => f.curiosidade + f.impulsividade - 85 },
  { id: 'art', name: l('Cinema e artes', 'Film and art'), from: 0, spot: 'cafe', fx: { insp: 3 }, theme: 'city', w: (f) => f.curiosidade + f.perfeccionismo - 80 },
  { id: 'jam', name: l('Jam sessions', 'Jam sessions'), from: 0, spot: 'studio', fx: { insp: 2, mor: 1, fat: 1 }, theme: 'dance', w: (f) => f.curiosidade + f.ambicao - 75 },
  { id: 'activism', name: l('Política e ativismo', 'Politics and activism'), from: 0, spot: 'hall', fx: { insp: 2, str: 1 }, theme: 'protest', w: (f, p) => p.views.eng + f.rebeldia - 75 },
  { id: 'charity', name: l('Caridade', 'Charity'), from: 0, spot: 'hall', fx: { mor: 2, str: -1 }, w: (f) => f.generosidade + f.empatia - 85 },
  { id: 'games', name: l('Videogames', 'Video games'), from: 1978, spot: 'arcade', fx: { str: -2, fat: 1 }, theme: 'tech', w: (f) => f.curiosidade + f.ansiedade - 70 },
  { id: 'nature', name: l('Natureza, surfe e pesca', 'Nature, surf and fishing'), from: 0, spot: 'park', fx: { str: -3, fit: 2, insp: 1 }, theme: 'nature', w: (f) => f.paciencia + f.melancolia - 80 },
];
export const hob14 = Object.fromEntries(HOB14.map((x) => [x.id, x])) as Record<string, Hob14>;

// ---------------------------------------------------------------- estado

export interface Rec14 {
  /** hobbies, ponto de encontro (cidade|tipo), forma física e humor 0..100 */
  h: string[]; sp: string; fit: number; mood: number;
  /** musa: tema id e último mês (índice) em que inspira */
  muse?: [string, number];
  /** ano do casamento; parceiro(a) que também é pessoa do jogo */
  mar?: number; cp?: string;
  /** linha do tempo: [ano, mês, texto, tom] */
  log: [number, number, L, number][];
  /** laços fora do sistema de relações (chave → −100..100) */
  t?: Record<string, number>;
  /** último mês simulado (rodízio: eventos raros compensam os meses pulados) */
  lm?: number;
}
export interface Leisure14 { r: Record<string, Rec14>; cur: number; news: [number, number, L][]; pl: { n: number; v: Record<string, number>; log: [number, number, L][] } }
declare module '../ext4' { interface Ext4 { leisure14: Leisure14 } }
const fresh = (): Leisure14 => ({ r: {}, cur: 0, news: [], pl: { n: 0, v: {}, log: [] } });
registerExt4('leisure14', fresh);
export function lz14(s: GameState): Leisure14 {
  const x = s.x4 as unknown as { leisure14?: Leisure14 };
  const st = (x.leisure14 ??= fresh());
  st.r ??= {}; st.news ??= []; st.pl ??= { n: 0, v: {}, log: [] };
  return st;
}
export const CAP14 = 36;
const mIdx = (s: GameState) => s.year * 12 + s.month;

// ---------------------------------------------------------------- quem é quem

export interface Who14 { key: string; name: string; city: string; kind: 'artist' | 'exec' | 'staff'; p?: Person; act?: Act }
const actOfP = (s: GameState, pid: string): Act | undefined => Object.values(s.acts).find((a) => a.members.includes(pid) && a.status !== 'retired' && a.status !== 'split');

export function who14(s: GameState, key: string): Who14 | null {
  const [k, ...r] = key.split(':');
  const id = r.join(':');
  if (k === 'p') {
    const p = s.persons[id];
    if (!p?.alive || p.isPlayer) return null;
    const act = actOfP(s, id);
    return { key, name: p.name, city: act?.city ?? s.config.homeCity, kind: 'artist', p, act };
  }
  if (k === 'l') { const L0 = leaders(s)?.L[id]; return L0 && L0.st === 'active' ? { key, name: L0.name, city: L0.city, kind: 'exec' } : null; }
  if (k === 's') { const st = s.player.staff.find((x) => x.id === id); return st ? { key, name: st.name, city: s.config.homeCity, kind: 'staff' } : null; }
  return null;
}

/** Pessoas notáveis: elenco do jogador (sempre), artistas de atos com fama, líderes ativos e sua equipe. */
export function pool14(s: GameState): { fixed: string[]; rot: string[] } {
  const fixed: string[] = [];
  const rot: string[] = [];
  const seen = new Set<string>();
  for (const a of Object.values(s.acts)) {
    if (a.status === 'retired' || a.status === 'split' || a.deceased) continue;
    const mine = a.owner === 'player';
    if (!mine && a.fame < 30) continue;
    for (const id of a.members) {
      const p = s.persons[id];
      if (!p?.alive || p.isPlayer || seen.has(id) || s.year - p.born < 16) continue;
      seen.add(id);
      (mine ? fixed : rot).push(`p:${id}`);
    }
  }
  for (const L0 of Object.values(leaders(s)?.L ?? {})) if (L0.st === 'active') rot.push(`l:${L0.id}`);
  for (const st of s.player.staff) rot.push(`s:${st.id}`);
  return { fixed: fixed.slice(0, 16), rot };
}

// ---------------------------------------------------------------- registro e textos

function logTo(s: GameState, key: string, text: L, tone = 0): void {
  const rc = lz14(s).r[key];
  if (!rc) return;
  rc.log.unshift([s.year, s.month, text, tone]);
  if (rc.log.length > 12) rc.log.length = 12;
}
function news(s: GameState, w: Who14, text: L, tone: number, loud: boolean): void {
  logTo(s, w.key, text, tone);
  const mine = w.act?.owner === 'player' || w.kind === 'staff';
  const famous = (w.act?.fame ?? 0) >= 55 || w.kind === 'exec';
  if (!mine && !famous) return;
  const st = lz14(s);
  st.news.unshift([s.year, s.month, text]);
  if (st.news.length > 30) st.news.length = 30;
  if (loud) {
    remember(s, 'leisure14', text, { actId: w.act?.id, important: famous && (w.act?.fame ?? 0) >= 70 });
    if (mine) notify(s, text, tone < 0 ? 'bad' : 'event');
    if (famous && w.act) addPost(s, { author: socialEra(s.year) ? '@fofocapop' : l('Coluna social', 'Society column').pt, role: 'gossip', text, sentiment: tone * 0.3, actId: w.act.id, likes: 200 + w.act.fame * 40 });
  }
}

// ---------------------------------------------------------------- escolha de hobbies

function pickHobbies(s: GameState, r: Rng, P0: P13, n: number, keep: string[] = []): string[] {
  const pool = HOB14.filter((x) => x.from <= s.year && (!x.to || x.to >= s.year) && !keep.includes(x.id));
  const out = [...keep];
  while (out.length < n && pool.length) {
    const h0 = r.weighted(pool, (x) => Math.max(4, 30 + x.w(P0.facets, P0)));
    if (!h0) break;
    out.push(h0.id);
    pool.splice(pool.indexOf(h0), 1);
  }
  return out;
}
const spotOf = (rc: Rec14): Spot14 => rc.sp.split('|')[1] as Spot14;
function chooseSpot(s: GameState, w: Who14, hs: string[]): string {
  const sp = hs.map((x) => hob14[x]?.spot).find((x) => x && x !== 'home' && SPOT14[x].from <= s.year) ?? 'bar';
  return `${w.city}|${sp}`;
}

function ensureRec(s: GameState, r: Rng, w: Who14, P0: P13): Rec14 {
  const st = lz14(s);
  let rc = st.r[w.key];
  if (!rc) {
    const hs = pickHobbies(s, r, P0, r.chance(0.5) ? 3 : 2);
    rc = st.r[w.key] = { h: hs, sp: chooseSpot(s, w, hs), fit: Math.round(clamp(40 + (P0.facets.disciplina - 50) / 2 - Math.max(0, s.year - (P0.born ?? s.year - 30) - 40) / 2, 10, 90)), mood: 55, log: [] };
  }
  if (!rc.sp.startsWith(`${w.city}|`)) rc.sp = chooseSpot(s, w, rc.h); // mudou de cidade
  return rc;
}

// ---------------------------------------------------------------- compatibilidade

const POL_AX: Record<string, number> = { left: -2, cleft: -1, center: 0, cright: 1, right: 2 };
export function compat14(A: P13, B: P13, ha: string[], hb: string[]): { v: number; pos: L[]; neg: L[] } {
  const pos: L[] = [];
  const neg: L[] = [];
  let v = 0;
  const sh = ha.filter((x) => hb.includes(x));
  if (sh.length) { v += 10 * sh.length; pos.push(fmtL(l('gostam de {h}', 'both into {h}'), { h: hob14[sh[0]]?.name ?? l(sh[0]) })); }
  if (A.views.rel === B.views.rel && rel(A)) { v += 6; pos.push(l('mesma fé', 'same faith')); }
  const pa = POL_AX[A.views.pol];
  const pb = POL_AX[B.views.pol];
  if (pa !== undefined && pb !== undefined) {
    const d = Math.abs(pa - pb) * (A.views.eng + B.views.eng) / 100;
    if (d >= 2) { v -= d * 4; neg.push(l('política oposta', 'opposite politics')); } else if (d < 0.6 && A.views.eng > 50) { v += 4; pos.push(l('mesma causa', 'same cause')); }
  }
  const warm = (A.facets.humor + B.facets.humor + A.facets.empatia + B.facets.empatia) / 4 - 50;
  v += warm / 3;
  if (warm > 10) pos.push(l('o humor bateu', 'the humour clicked'));
  else if (warm < -8) neg.push(l('nenhum dos dois tem paciência', 'neither has any patience'));
  if (A.facets.ego > 65 && B.facets.ego > 65) { v -= 12; neg.push(l('dois egos grandes', 'two big egos')); }
  if (A.facets.teimosia + B.facets.teimosia > 140) { v -= 6; neg.push(l('teimosia dos dois lados', 'stubborn on both sides')); }
  return { v, pos, neg };
}

function tie(s: GameState, a: string, b: string, dv: number): void {
  const [ka, ia] = [a.slice(0, 1), a.slice(2)];
  const [kb, ib] = [b.slice(0, 1), b.slice(2)];
  if (ka === 'p' && kb === 'p') {
    const A = s.persons[ia];
    const B = s.persons[ib];
    if (A && B) { A.rel[ib] = clamp((A.rel[ib] ?? 0) + dv, -100, 100); B.rel[ia] = clamp((B.rel[ia] ?? 0) + dv, -100, 100); }
    return;
  }
  if (ka === 'l' && kb === 'l') {
    const LL = leaders(s).L;
    if (LL[ia] && LL[ib]) { LL[ia].rel[ib] = clamp((LL[ia].rel[ib] ?? 0) + dv, -100, 100); LL[ib].rel[ia] = clamp((LL[ib].rel[ia] ?? 0) + dv, -100, 100); }
    return;
  }
  const st = lz14(s);
  for (const [x, y] of [[a, b], [b, a]]) {
    const rc = st.r[x];
    if (!rc) continue;
    rc.t ??= {};
    rc.t[y] = clamp((rc.t[y] ?? 0) + dv, -100, 100);
    const ks = Object.keys(rc.t);
    if (ks.length > 8) delete rc.t[ks[0]];
  }
}
/** Laço atual entre duas pessoas (relação nativa quando existe). */
export function tieOf(s: GameState, a: string, b: string): number {
  if (a[0] === 'p' && b[0] === 'p') return s.persons[a.slice(2)]?.rel[b.slice(2)] ?? 0;
  if (a[0] === 'l' && b[0] === 'l') return leaders(s).L[a.slice(2)]?.rel[b.slice(2)] ?? 0;
  return lz14(s).r[a]?.t?.[b] ?? 0;
}

// ---------------------------------------------------------------- encontros entre NPCs

const single = (s: GameState, p: Person, rc: Rec14) => !rc.cp && (!s.families[p.id]?.partner || s.families[p.id]?.separated);

function meet(s: GameState, r: Rng, a: Who14, b: Who14, PA: P13, PB: P13, ra: Rec14, rb: Rec14): void {
  const sp = spotOf(ra);
  const place = atPlace14(SPOT14[sp].name(s.year));
  const c = compat14(PA, PB, ra.h, rb.h);
  const v = c.v + r.normal(0, 10);
  const why = (v >= 0 ? c.pos[0] : c.neg[0]) ?? (v >= 0 ? l('acaso', 'chance') : l('bebida demais e palavras erradas', 'too many drinks and the wrong words'));
  const T = (x: L, o: Record<string, string | L>) => fmtL(x, { a: a.name, b: b.name, p: place, w: why, ...o });
  // romance: dois artistas adultos, solteiros e românticos
  if (a.p && b.p && v > 18 && single(s, a.p, ra) && single(s, b.p, rb) && s.year - a.p.born >= 18 && s.year - b.p.born >= 18
    && (PA.sex !== PB.sex || r.chance(s.year < 1990 ? 0.04 : 0.3)) && r.chance(0.08 + (PA.facets.romantismo + PB.facets.romantismo) / 1000)) {
    for (const [x, y, rx] of [[a, b, ra], [b, a, rb]] as const) {
      const fam = ensureFamily(s, x.p!.id);
      fam.partner = { name: y.name, job: y.act ? l(`músico(a) de ${y.act.name}`, `musician in ${y.act.name}`) : l('artista', 'artist'), trust: 65, wellbeing: 65, agenda: l('divide a agenda de shows', 'shares the gig calendar') };
      fam.separated = false;
      rx.cp = y.key;
      rx.muse = ['love', mIdx(s) + 8];
      x.p!.morale = clamp(x.p!.morale + 8, 0, 100);
    }
    tie(s, a.key, b.key, 25);
    const tx = T(l('{a} e {b} se conheceram {p} ({w}) e estão namorando.', '{a} and {b} met {p} ({w}) and are dating.'), {});
    news(s, a, tx, 1, true); logTo(s, b.key, tx, 1);
    return;
  }
  if (v > 10) {
    tie(s, a.key, b.key, 6 + Math.round(v / 4));
    const collab = a.p && b.p && a.act && b.act && a.act.id !== b.act.id && (sp === 'studio' || sp === 'club' || sp === 'bar') && r.chance(0.2);
    if (collab) {
      for (const [x, y] of [[a, b], [b, a]] as const) { x.p!.inspiration = clamp(x.p!.inspiration + 6, 0, 100); nudgeAdmiration(s, x.p!.id, y.act!.id, 6); }
      const tx = T(l('{a} e {b} tocaram juntos {p} até de manhã — fala-se em parceria ({w}).', '{a} and {b} played together {p} till dawn — talk of a collaboration ({w}).'), {});
      news(s, a, tx, 1, a.act!.owner === 'player' || b.act!.owner === 'player'); logTo(s, b.key, tx, 1);
    } else {
      const tx = T(l('Ficou amigo(a) de {b} {p} ({w}).', 'Became friends with {b} {p} ({w}).'), {});
      logTo(s, a.key, tx, 1);
      logTo(s, b.key, T(l('Ficou amigo(a) de {a} {p} ({w}).', 'Became friends with {a} {p} ({w}).'), {}), 1);
      // executivo rival amigo do seu artista: risco de assédio
      const mineA = a.act?.owner === 'player' ? a : b.act?.owner === 'player' ? b : null;
      const ex = a.kind === 'exec' ? a : b.kind === 'exec' ? b : null;
      if (mineA && ex && r.chance(0.5)) notify(s, fmtL(l('{e} (selo rival) anda aparecendo {p} com {a}. Fique de olho na lealdade.', '{e} (rival label) has been hanging out {p} with {a}. Watch their loyalty.'), { e: ex.name, p: place, a: mineA.name }), 'event');
    }
    if (sp === 'club' || sp === 'studio' || sp === 'bar') for (const x of [a, b]) if (x.act?.owner === 'player') { const n = scene12(s).nets[x.city]; if (n) n.health = clamp(n.health + 0.5, 0, 100); }
    return;
  }
  if (v < -8) {
    tie(s, a.key, b.key, -8 + Math.round(v / 4));
    for (const x of [a, b]) if (x.p) x.p.stress = clamp(x.p.stress + 4, 0, 100);
    const tx = T(l('{a} e {b} discutiram feio {p} ({w}). Viraram desafetos.', '{a} and {b} had an ugly row {p} ({w}). Now they\'re enemies.'), {});
    news(s, a, tx, -1, (a.act?.fame ?? 0) + (b.act?.fame ?? 0) > 110 || a.act?.owner === 'player' || b.act?.owner === 'player'); logTo(s, b.key, tx, -1);
    return;
  }
  tie(s, a.key, b.key, 3);
}

// ---------------------------------------------------------------- vida pessoal (artistas)

/** Quem é simulado em rodízio passa k meses sem sorteio: a chance de evento raro vale por k meses. */
function catchUp(r: Rng, k: number): Pick<Rng, 'chance' | 'pick' | 'int'> {
  if (k <= 1) return r;
  return { chance: (p: number) => r.chance(1 - Math.pow(1 - Math.max(0, Math.min(1, p)), k)), pick: (a) => r.pick(a), int: (a, b) => r.int(a, b) };
}

const JOBS = [l('professor(a)', 'teacher'), l('médico(a)', 'doctor'), l('fotógrafo(a)', 'photographer'), l('advogado(a)', 'lawyer'), l('atriz/ator', 'actor'), l('modelo', 'model'), l('jornalista', 'journalist'), l('empresário(a)', 'businessperson'), l('dançarino(a)', 'dancer')];

function lifeMonth(s: GameState, r0: Rng, w: Who14, P0: P13, rc: Rec14, free: number, k: number): void {
  const r = catchUp(r0, k);
  const p = w.p!;
  const age = s.year - p.born;
  const fam = s.families[p.id];
  const has = !!fam?.partner && !fam.separated;
  const f = P0.facets;
  const T = (x: L, o: Record<string, string | number | L> = {}) => fmtL(x, { a: p.name, ...o });
  if (!has && !rc.cp && age >= 19 && age <= 70) {
    const pr = 0.01 * (1 + f.romantismo / 100 + f.sociabilidade / 150) * (rc.h.includes('party') || rc.h.includes('bar') ? 1.6 : 1);
    if (r.chance(pr)) {
      const F0 = ensureFamily(s, p.id);
      F0.partner = { name: personName(r0, langForCity(w.city, r0)), job: r.pick(JOBS), trust: 60, wellbeing: 60, agenda: l('quer mais tempo juntos', 'wants more time together') };
      F0.separated = false;
      rc.muse = ['love', mIdx(s) + 6];
      p.morale = clamp(p.morale + 6, 0, 100);
      logTo(s, w.key, T(l('Começou a namorar {q} ({j}).', 'Started dating {q} ({j}).'), { q: F0.partner.name, j: F0.partner.job }), 1);
    }
    return;
  }
  if (!has && !rc.cp) return;
  const F0 = ensureFamily(s, p.id);
  // casamento
  if (!rc.mar && r.chance(0.006 + (f.romantismo + f.lealdade) / 20000)) {
    rc.mar = s.year;
    p.morale = clamp(p.morale + 10, 0, 100);
    p.fatigue = clamp(p.fatigue + 5, 0, 100);
    rc.muse = ['love', mIdx(s) + 6];
    news(s, w, T(l('{a} se casou com {q}.', '{a} married {q}.'), { q: F0.partner?.name ?? '?' }), 1, true);
    if (rc.cp) { const o = lz14(s).r[rc.cp]; if (o) o.mar = s.year; }
    return;
  }
  // separação: estresse, noitadas, pouca presença (turnê/agenda cheia), infidelidade; família segura
  const split = 0.004 + p.stress / 5000 + (rc.h.includes('party') ? 0.005 : 0) + (free < 0.35 ? 0.006 : 0) + (f.impulsividade > 65 ? 0.003 : 0)
    - (rc.h.includes('family') ? 0.004 : 0) - (rc.mar ? 0.002 : 0);
  if (r.chance(Math.max(0.001, split))) {
    const why = free < 0.35 ? l('a agenda não deixava tempo para casa', 'the schedule left no time for home') : rc.h.includes('party') ? l('as noitadas cobraram o preço', 'the nights out took their toll') : p.stress > 60 ? l('o estresse transbordou', 'the stress spilled over') : l('se afastaram aos poucos', 'they drifted apart');
    const was = F0.partner?.name ?? '?';
    const ends = (x: Person, xr: Rec14) => {
      const fx = ensureFamily(s, x.id);
      fx.separated = true;
      x.morale = clamp(x.morale - 14, 0, 100);
      x.stress = clamp(x.stress + 12, 0, 100);
      x.inspiration = clamp(x.inspiration + 10, 0, 100); // disco de separação
      xr.muse = ['heartbreak', mIdx(s) + 10];
      xr.mar = undefined;
    };
    ends(p, rc);
    if (rc.cp) {
      const o = lz14(s).r[rc.cp];
      const op = s.persons[rc.cp.slice(2)];
      if (o && op) { ends(op, o); o.cp = undefined; tie(s, w.key, rc.cp, -35); logTo(s, rc.cp, T(l('Separou-se de {a}.', 'Split from {a}.')), -1); }
      rc.cp = undefined;
    }
    news(s, w, T(l('{a} e {q} se separaram: {w}.', '{a} and {q} split: {w}.'), { q: was, w: why }), -1, true);
    return;
  }
  // filhos
  if (age >= 21 && age <= 46 && F0.kids.length < 3 && r.chance(rc.mar ? 0.008 : 0.003)) {
    const kid = { id: nextId(s, 'k'), name: personName(r0, langForCity(w.city, r0)), born: s.year, bond: 70, musical: r.int(10, 90) };
    F0.kids.push(kid);
    p.morale = clamp(p.morale + 10, 0, 100);
    p.fatigue = clamp(p.fatigue + 12, 0, 100);
    rc.muse = ['longing', mIdx(s) + 6];
    if (!rc.h.includes('family') && rc.h.length >= 3) rc.h[rc.h.length - 1] = 'family';
    else if (!rc.h.includes('family')) rc.h.push('family');
    news(s, w, T(l('Nasceu {k}, filho(a) de {a}. Menos noites fora, mais cansaço — e muito amor.', '{k} is born to {a}. Fewer nights out, more tiredness — and lots of love.'), { k: kid.name }), 1, true);
  }
}

function healthMonth(s: GameState, r0: Rng, w: Who14, P0: P13, rc: Rec14, fx: Required<Fx14>, k: number): void {
  const r = catchUp(r0, k);
  const p = w.p!;
  const age = s.year - p.born;
  const T = (x: L) => fmtL(x, { a: p.name });
  if (fx.dep > 0) {
    const hs = healthOf(s, p.id);
    hs.dependency = clamp(hs.dependency + fx.dep * (0.4 + P0.facets.impulsividade / 100) * (p.stress > 60 ? 1.5 : 1) - (rc.h.some((x) => x === 'faith' || x === 'sport' || x === 'family') ? 1.5 : 0.6), 0, 100);
    if (hs.dependency > 60 && p.health === 'ok' && r.chance(0.3)) {
      p.health = 'addiction'; hs.history = true;
      news(s, w, T(l('{a} perdeu o controle das noitadas: dependência. Moral e voz vão sofrer até tratar.', '{a} lost control of the nights out: addiction. Morale and voice will suffer until treated.')), -1, true);
    }
  } else if (P(s).health[p.id]?.dependency) {
    const hs = healthOf(s, p.id);
    hs.dependency = clamp(hs.dependency - (rc.h.some((x) => x === 'faith' || x === 'sport' || x === 'family' || x === 'fitness') ? 2 : 0.5), 0, 100);
    if (p.health === 'addiction' && hs.dependency < 30 && r.chance(0.25)) { p.health = 'recovering'; news(s, w, T(l('{a} está em recuperação — a rotina fora do palco ajudou.', '{a} is recovering — the off-stage routine helped.')), 1, true); }
  }
  if (p.stress > 80 && p.fatigue > 65 && p.health === 'ok' && r.chance(0.25)) {
    p.health = 'burnout';
    news(s, w, T(l('{a} teve esgotamento: sem tempo livre há meses.', '{a} burned out: no free time for months.')), -1, true);
  } else if (p.health === 'burnout' && p.stress < 45 && r.chance(0.25 + rc.fit / 300)) {
    p.health = 'ok';
    logTo(s, w.key, T(l('Saiu do esgotamento — descanso e hobbies funcionaram.', 'Recovered from burnout — rest and hobbies worked.')), 1);
  } else if (p.health === 'ok' && age > 50 && rc.fit < 25 && r.chance(0.006)) {
    p.health = 'ill';
    news(s, w, T(l('{a} adoeceu: sedentarismo e idade cobraram.', '{a} fell ill: inactivity and age took their toll.')), -1, true);
  }
}

// ---------------------------------------------------------------- mês

export function leisureMonth14(s: GameState): void {
  const st = lz14(s);
  const r = Rng.fromSeed(`lz14:${s.config.seed}:${s.year}:${s.month}`);
  const { fixed, rot } = pool14(s);
  const take: string[] = [...fixed];
  const n = Math.max(0, CAP14 - take.length);
  if (rot.length) {
    st.cur = st.cur % rot.length;
    for (let i = 0; i < Math.min(n, rot.length); i++) take.push(rot[(st.cur + i) % rot.length]);
    st.cur = (st.cur + n) % Math.max(1, rot.length);
  }
  const mi = mIdx(s);
  const here: Record<string, { w: Who14; P0: P13; rc: Rec14 }[]> = {};
  for (const key of take) {
    const w = who14(s, key);
    if (!w) continue;
    const P0 = per13(s, key);
    if (!P0) continue;
    const rc = ensureRec(s, r, w, P0);
    const k = Math.max(1, Math.min(12, mi - (rc.lm ?? mi - 1)));
    rc.lm = mi;
    if (r.chance(0.015)) { // gostos mudam com o tempo (e com a época)
      const keep = rc.h.filter(() => r.chance(0.6));
      rc.h = pickHobbies(s, r, P0, Math.max(2, rc.h.length), keep);
      rc.sp = chooseSpot(s, w, rc.h);
    }
    // tempo livre: agenda do ato e turnês comem o lazer
    let free = 1;
    if (w.act) {
      free = 1 - (s.loadNow[w.act.id] ?? 0) / 130;
      if (s.tours.some((t) => t.actId === w.act!.id && t.status === 'running')) free = Math.min(free, 0.3);
    }
    const fx: Required<Fx14> = { mor: 0, insp: 0, str: 0, fat: 0, fit: -1, dep: 0 };
    for (const id of rc.h) { const h0 = hob14[id]; if (!h0) continue; for (const k of Object.keys(h0.fx) as (keyof Fx14)[]) fx[k] += (h0.fx[k] ?? 0) * free * 0.7; }
    if (rc.h.includes('family') && !(s.families[w.p?.id ?? '']?.partner || s.families[w.p?.id ?? '']?.kids.length)) fx.mor -= 1;
    if (free < 0.35) fx.str += 3;
    rc.fit = Math.round(clamp(rc.fit + fx.fit, 0, 100));
    rc.mood = Math.round(clamp(rc.mood + fx.mor - fx.str * 0.5 + (55 - rc.mood) * 0.1, 0, 100));
    if (w.p) {
      const p = w.p;
      p.morale = clamp(p.morale + fx.mor, 0, 100);
      p.inspiration = clamp(p.inspiration + fx.insp, 0, 100);
      p.stress = clamp(p.stress + fx.str, 0, 100);
      p.fatigue = clamp(p.fatigue + fx.fat - (rc.fit - 50) / 50, 0, 100);
      healthMonth(s, r, w, P0, rc, fx, k);
      lifeMonth(s, r, w, P0, rc, free, k);
      // hobby forte vira musa de vez em quando
      if (!rc.muse || rc.muse[1] < mi) { const th = rc.h.map((x) => hob14[x]?.theme).filter((x): x is string => !!x); if (th.length && r.chance(0.08)) rc.muse = [r.pick(th), mi + 4]; }
    }
    if (rc.muse && rc.muse[1] < mi) rc.muse = undefined;
    const sp = spotOf(rc);
    const it = { w, P0, rc };
    if (sp !== 'home' && free > 0.25) (here[rc.sp] ??= []).push(it);
  }
  // encontros: cada um tem uma chance de cruzar com outro frequentador do mesmo lugar
  for (const xs of Object.values(here)) {
    if (xs.length < 2) continue;
    for (const a of xs) {
      if (!r.chance(0.3 + a.P0.facets.sociabilidade / 400)) continue;
      const b = xs[r.int(0, xs.length - 1)];
      if (b === a) continue;
      meet(s, r, a.w, b.w, a.P0, b.P0, a.rc, b.rc);
    }
  }
}

registerSimHook('month', 'leisure14', (s) => leisureMonth14(s));

// musa: o que se vive fora do trabalho vira tema da próxima música
registerSimHook('compose', 'leisure14', (s, _r, a) => {
  const song = a.song;
  const act = song && s.acts[song.actId];
  if (!song || !act) return;
  const st = lz14(s);
  const mi = mIdx(s);
  const m = act.members.map((id) => ({ id, rc: st.r[`p:${id}`] })).find((x) => x.rc?.muse && x.rc.muse[1] >= mi);
  if (!m) return;
  const r = Rng.fromSeed(`lz14c:${s.config.seed}:${song.id}`);
  if (!r.chance(0.5)) return;
  const th = m.rc!.muse![0];
  const x = (s.x4 as unknown as { creation?: { songs?: Record<string, { theme?: string }> } }).creation?.songs?.[song.id];
  if (x) x.theme = th;
  if (act.owner === 'player' && themeById[th]) {
    song.theme = themeById[th].name;
    song.lyrics = clamp(song.lyrics + 2, 0, 100);
    logTo(s, `p:${m.id}`, fmtL(l('A vida pessoal virou letra: "{t}" fala de {th}.', 'Personal life became lyrics: "{t}" is about {th}.'), { t: song.title, th: themeById[th].name }), 1);
  }
});

// ---------------------------------------------------------------- jogador sai para encontrar gente

export function spotsHere14(s: GameState): Spot14[] {
  return SPOTS14.filter((k) => k !== 'home' && SPOT14[k].from <= s.year);
}
export function regulars14(s: GameState, k: Spot14, city = s.config.homeCity): string[] {
  const key = `${city}|${k}`;
  return Object.entries(lz14(s).r).filter(([id, rc]) => rc.sp === key && who14(s, id)).map(([id]) => id).sort();
}
export const goCost14 = (s: GameState, k: Spot14): number => money(s, SPOT14[k].cost);
export const wentThisMonth = (s: GameState, k: Spot14): boolean => lz14(s).pl.v[k] === mIdx(s);

/** Vai a um ponto de encontro: gasta tempo livre e dinheiro pessoal, encontra até 2 frequentadores. */
export function goOut14(s: GameState, k: Spot14): { ok: boolean; text: L; met: { key: string; dv: number; why: L }[] } {
  const no = (text: L) => ({ ok: false, text, met: [] });
  if (k === 'home' || SPOT14[k].from > s.year) return no(l('Esse lugar ainda não existe nesta época.', 'That place does not exist yet in this era.'));
  if (wentThisMonth(s, k)) return no(l('Você já foi lá este mês.', 'You already went there this month.'));
  if (energyLeft(s) < 1) return no(l('Sem tempo livre este mês.', 'No free time left this month.'));
  const o = ownerOf(s);
  const c = goCost14(s, k);
  if (o.wealth < c) return no(l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.'));
  const e = spendEnergy(s, 1);
  if (e) return no(e);
  o.wealth -= c;
  const st = lz14(s);
  st.pl.v[k] = mIdx(s);
  const r = Rng.fromSeed(`lz14p:${s.config.seed}:${mIdx(s)}:${k}:${st.pl.n++}`);
  o.stress = clamp(o.stress - (k === 'church' || k === 'park' ? 4 : 2), 0, 100);
  if (k === 'gym' || k === 'park') o.health = clamp(o.health + 2, 0, 100);
  const me = per13(s, 'player');
  const pp = playerPerson(s);
  const regs = regulars14(s, k);
  const place = atPlace14(SPOT14[k].name(s.year));
  const met: { key: string; dv: number; why: L }[] = [];
  const pick = r.shuffle([...regs]).slice(0, 2);
  for (const key of pick) {
    const P0 = per13(s, key);
    const rc = st.r[key];
    const w = who14(s, key);
    if (!P0 || !rc || !me || !w) continue;
    const c0 = compat14(me, P0, rc.h, rc.h.filter((x) => hob14[x]?.spot === k));
    const v = c0.v + 8 + r.normal(0, 8);
    const dv = Math.round(clamp(v / 3, -6, 10));
    const why = (dv >= 0 ? c0.pos[0] : c0.neg[0]) ?? (dv >= 0 ? l('frequentam o mesmo lugar', 'same haunt') : l('santo não bateu', 'no chemistry'));
    opine(s, key, dv, fmtL(l('Encontro {p}: {w}', 'Met {p}: {w}'), { p: place, w: why }));
    if (pp && w.p && w.p.rel[pp.id] === undefined) w.p.rel[pp.id] = 0; // passa a conhecer você
    logTo(s, key, fmtL(dv >= 0 ? l('Encontrou o(a) dono(a) de {c} {p} e gostou ({w}).', 'Met the owner of {c} {p} and liked them ({w}).') : l('Encontrou o(a) dono(a) de {c} {p} e não gostou ({w}).', 'Met the owner of {c} {p} and disliked them ({w}).'), { c: s.config.companyName, p: place, w: why }), dv >= 0 ? 1 : -1);
    met.push({ key, dv, why });
  }
  const names = met.map((x) => `${who14(s, x.key)?.name ?? '?'} (${x.dv >= 0 ? '+' : ''}${x.dv}: ${x.why.pt})`).join(', ');
  const namesEn = met.map((x) => `${who14(s, x.key)?.name ?? '?'} (${x.dv >= 0 ? '+' : ''}${x.dv}: ${x.why.en})`).join(', ');
  const text: L = met.length
    ? { pt: `${SPOT14[k].name(s.year).pt}: você conversou com ${names}.`, en: `${SPOT14[k].name(s.year).en}: you talked with ${namesEn}.` }
    : fmtL(l('{p}: noite tranquila, ninguém conhecido por lá — pelo menos a cabeça descansou.', '{p}: quiet night, nobody notable around — at least your mind rested.'), { p: SPOT14[k].name(s.year) });
  st.pl.log.unshift([s.year, s.month, text]);
  if (st.pl.log.length > 12) st.pl.log.length = 12;
  return { ok: true, text, met };
}

/** Linha do tempo e resumo de lazer de alguém (para fichas). */
export function leisureOf14(s: GameState, key: string): { rec: Rec14; spot: L; hobbies: L[]; muse?: L; opinion: number } | null {
  const rc = lz14(s).r[key];
  if (!rc) return null;
  const sp = spotOf(rc);
  return {
    rec: rc, spot: SPOT14[sp]?.name(s.year) ?? l(sp), hobbies: rc.h.map((x) => hob14[x]?.name ?? l(x)),
    muse: rc.muse && rc.muse[1] >= mIdx(s) ? themeById[rc.muse[0]]?.name : undefined, opinion: opinionOf(s, key),
  };
}
