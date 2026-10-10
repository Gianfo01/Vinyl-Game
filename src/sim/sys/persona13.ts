// Rodada 13 — ficha unificada de pessoas. Todo personagem (artistas, o jogador, líderes de selos rivais,
// equipe, críticos, gente da mídia e donos NPC) passa a ter o MESMO conjunto de atributos — valores
// diferentes: ouvido, negociação, carisma, gestão e imagem; facetas de personalidade (as 20 da rodada 9) e
// traços marcantes; visão política e religião (rodada 10); aptidão para cada cargo; sexo, tom de pele e
// visual. O que já existe em cada tipo é aproveitado; o que falta é derivado do id, deterministicamente
// (hash da semente, nunca o Rng compartilhado).
//
// Os atributos pesam: negociação nas propostas, ouvido no A&R, aptidão no desempenho da equipe, política
// nas reações às suas declarações. Imagem, sexo e pele pesam nas barreiras históricas de cada época e país
// (rádio segregada, MTV que valoriza o visual, machismo nos negócios), que o jogador pode enfrentar.
// Ações do jogador (dispensar, aliciar, processar, atrasar salário, presentes, favores, declarações,
// prêmios) mexem na opinião das pessoas, sempre com o motivo guardado e visível.

import { clamp, hashString, Rng } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { STAFF_ROLES } from '../../data/rules';
import { cityById, familyOf, l, type FamilyId, type L } from '../../data/world';
import { compatOf, deriveViews, viewsOf, playerViews, shiftPlayerViews, type Views } from '../beliefs';
import { critRel } from '../criticrel';
import { emitEvent, type EventDef } from '../events';
import { deferEvents, registerExt4, registerMod, registerOfferMod, registerSimHook } from '../ext4';
import type { Act, Appearance, GameState, Person, StaffMember } from '../types';
import { fmtL, money, notify, playerActs, post, rememberListeners, staffAdjusters } from '../util';
import { leaderFacets, leaderOf, leaders, type Leader } from './leaders10';
import { backgroundById, life, playerPerson } from './life';
import { ownerOf } from './people/owner';
import { careerOf } from './people/staff';
import { persona, playerTraitById } from './persona';
import type { BackgroundId } from './life/data';
import { FACETS, FACET_TXT, soul, type Facet } from './soul9';
import { actsOfPerson17 } from '../actidx17';

// ---------------------------------------------------------------- esquema

export type Kind13 = 'player' | 'person' | 'leader' | 'staff' | 'critic' | 'media' | 'npc' | 'manager';
export type Attr13 = 'ear' | 'neg' | 'cha' | 'mgmt' | 'img';
export const ATTR13: Record<Attr13, [L, L]> = {
  ear: [l('Ouvido', 'Ear'), l('Reconhece talento e hits antes dos outros: pesa no A&R e na escolha de repertório.', 'Spots talent and hits before others: weighs on A&R and song choice.')],
  neg: [l('Negociação', 'Negotiation'), l('Arranca termos melhores em contratos, propostas e acordos.', 'Gets better terms in contracts, offers and deals.')],
  cha: [l('Carisma', 'Charisma'), l('Convence, encanta a imprensa e segura o público.', 'Persuades, charms the press and holds a crowd.')],
  mgmt: [l('Gestão', 'Management'), l('Organiza, cumpre prazos e segura equipes.', 'Organizes, meets deadlines and holds teams together.')],
  img: [l('Imagem e visual', 'Image and look'), l('Presença visual: vale pouco na era do rádio e muito na era da MTV e das redes.', 'Visual presence: worth little in the radio era, a lot in the MTV and social media eras.')],
};
export const ATTR13_IDS = Object.keys(ATTR13) as Attr13[];

/** Cargos: as funções de equipe + artista, executivo e crítico. */
export const JOBS13: { id: string; name: L }[] = [
  { id: 'artist', name: l('Artista', 'Artist') }, { id: 'exec', name: l('Executivo(a) de selo', 'Label executive') },
  ...STAFF_ROLES.map((r) => ({ id: r.id, name: r.name })), { id: 'critic', name: l('Crítico(a)', 'Critic') },
];

export type Sex13 = 'm' | 'f' | 'x';
export const SEX13: Record<Sex13, L> = { m: l('Masculino', 'Male'), f: l('Feminino', 'Female'), x: l('Não binário', 'Non-binary') };
export const SKIN13: L[] = [l('Pele clara', 'Light skin'), l('Pele morena clara', 'Light-brown skin'), l('Pele morena', 'Brown skin'), l('Pele negra', 'Dark skin')];

export interface P13 {
  key: string;
  kind: Kind13;
  name: string;
  born?: number;
  city?: string;
  attrs: Record<Attr13, number>;
  facets: Record<Facet, number>;
  /** traços marcantes (facetas extremas), iguais para todos os tipos */
  traits: { k: Facet; hi: boolean }[];
  /** traços próprios do tipo (artista, jogador, líder…) */
  native: L[];
  views: Views;
  prof: Record<string, number>;
  sex: Sex13;
  skin: number;
  /** cargo atual, quando houver */
  job?: string;
}

// ---------------------------------------------------------------- estado

export interface Op13 { v: number; w: [number, number, number, L][] }
export interface P13State {
  op: Record<string, Op13>;
  /** barreiras enfrentadas / contornadas / aceitas por ato: [ano, modo] */
  bar: Record<string, [number, 'fight' | 'niche' | 'comply']>;
  /** cooldowns (semana) */
  cd: Record<string, number>;
  /** dono anterior (selo rival) de atos */
  ex: Record<string, string>;
}
declare module '../ext4' { interface Ext4 { persona13: P13State } }
const fresh = (): P13State => ({ op: {}, bar: {}, cd: {}, ex: {} });
registerExt4('persona13', fresh);
export function p13(s: GameState): P13State {
  const x = s.x4 as unknown as { persona13?: P13State };
  const st = (x.persona13 ??= fresh());
  st.op ??= {}; st.bar ??= {}; st.cd ??= {}; st.ex ??= {};
  return st;
}

// ---------------------------------------------------------------- derivação

const u = (s: GameState, key: string, k: string): number => hashString(`${s.config.seed}|p13|${key}|${k}`) / 4294967296;
const c100 = (v: number): number => Math.round(clamp(v, 1, 99));

/** Mesma derivação de src/ui/pixel/avatar.ts (randomLook): mantém pele/barba coerentes com o retrato. */
export function lookOf13(id: string, look?: Appearance): Appearance {
  if (look) return look;
  const r = Rng.fromSeed(`look:${id}`);
  const hairColor = r.weighted([0, 1, 2, 3, 4, 5, 6, 7], (i) => [26, 24, 18, 7, 11, 5, 5, 4][i]) ?? 0;
  const hair = r.chance(0.07) ? 0 : r.int(1, 15);
  return {
    body: r.weighted([0, 1, 2], (i) => [36, 46, 18][i]) ?? 1, face: r.int(0, 2), skin: r.int(0, 3), hair, hairColor,
    outfit: r.int(0, 3), outfitColor: r.int(0, 7), glasses: r.chance(0.18), hat: r.chance(0.12), beard: r.chance(0.2),
  };
}

function hashFacets(s: GameState, key: string): Record<Facet, number> {
  const f = {} as Record<Facet, number>;
  for (const k of FACETS) f[k] = Math.round(25 + (u(s, key, k) + u(s, key, k + '2')) * 25);
  return f;
}

function sexFor(s: GameState, key: string, kind: Kind13, year: number, role?: string, look?: Appearance): Sex13 {
  if (look?.sx) return look.sx;
  if (look?.beard) return 'm';
  const late = clamp((year - 1965) / 50, 0, 1);
  const pf = kind === 'person' ? (role === 'vocal' ? 0.42 : 0.1 + late * 0.15) : kind === 'leader' ? 0.05 + late * 0.22 : kind === 'staff' || kind === 'media' ? 0.25 + late * 0.2 : 0.18 + late * 0.25;
  const x = u(s, key, 'sex');
  return x < pf ? 'f' : x > 0.985 && year >= 1990 ? 'x' : 'm';
}

function skinFor(s: GameState, key: string, city?: string): number {
  const m = city ? cityById[city]?.market : undefined;
  const w = m === 'africa' ? [3, 8, 25, 64] : m === 'br' || m === 'latam' ? [25, 30, 28, 17] : m === 'asia' ? [30, 50, 15, 5] : [62, 18, 9, 11];
  let x = u(s, key, 'skin') * 100;
  for (let i = 0; i < 4; i++) { x -= w[i]; if (x <= 0) return i; }
  return 0;
}

function baseProf(s: GameState, key: string): Record<string, number> {
  const p: Record<string, number> = {};
  for (const j of JOBS13) p[j.id] = 15 + u(s, key, 'j' + j.id) * 35;
  return p;
}

const traitsOf = (f: Record<Facet, number>): { k: Facet; hi: boolean }[] =>
  FACETS.map((k) => ({ k, d: f[k] - 50 })).filter((x) => Math.abs(x.d) >= 20).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 5).map((x) => ({ k: x.k, hi: x.d > 0 }));

// r17: cache por partida (WeakMap) — um Map global vazava fichas entre jogos com a mesma seed e quebrava o determinismo
const CACHES = new WeakMap<GameState, Map<string, P13>>();

/** Ficha unificada de qualquer pessoa. Chaves: 'player', 'p:<pessoa>', 'l:<líder>', 's:<equipe>', 'c:<crítico>', 'm:<id>|<nome>', 'n:<nome>'. */
export function per13(s: GameState, key: string): P13 | null {
  if (key === 'player') {
    const pp = playerPerson(s);
    if (pp) key = `p:${pp.id}`;
  }
  const ck = `${s.config.seed}|${s.year}|${key}|${staffSig(s, key)}|${POST13.sig?.(s, key) ?? ''}`;
  let CACHE = CACHES.get(s);
  if (!CACHE) CACHES.set(s, (CACHE = new Map()));
  const hit = CACHE.get(ck);
  if (hit) return hit;
  const out = build(s, key);
  if (!out) return null;
  if (CACHE.size > 20000) CACHE.clear();
  CACHE.set(ck, out);
  return out;
}
const staffSig = (s: GameState, key: string): string => {
  if (key === 'player' || s.persons[key.slice(2)]?.isPlayer) return Object.values(ownerOf(s).attrs).join(',') + persona(s).traits.join(',');
  if (key.startsWith('p:')) { const p = s.persons[key.slice(2)]; return p?.look ? `${p.look.skin}${p.look.beard ? 1 : 0}` : ''; }
  if (key.startsWith('e:')) return s.config.realNames ? 'R' : 'F';
  if (!key.startsWith('s:')) return '';
  const st = s.player.staff.find((x) => x.id === key.slice(2));
  return st ? `${st.role}${st.skill}` : '';
};

function build(s: GameState, key: string): P13 | null {
  const [kc, ...rest] = key.split(':');
  const id = rest.join(':');
  const prof = baseProf(s, key);
  const up = (j: string, v: number) => { prof[j] = Math.max(prof[j] ?? 0, v); };
  let facets: Record<Facet, number>;
  const native: L[] = [];
  let attrs: Record<Attr13, number>;
  let name = id;
  let born: number | undefined;
  let city: string | undefined;
  let kind: Kind13 = 'npc';
  let views: Views;
  let look: Appearance | undefined;
  let role: string | undefined;
  let job: string | undefined;
  let extSex: [Sex13 | undefined, number | undefined] | undefined;
  if (key === 'player') {
    const o = ownerOf(s);
    kind = 'player'; name = o.name; born = o.born; city = s.config.homeCity; job = 'exec';
    facets = hashFacets(s, key);
    attrs = { ear: o.attrs.ear, neg: o.attrs.negotiation, cha: o.attrs.charisma, mgmt: o.attrs.management, img: o.attrs.charisma * 0.45 + facets.vaidade * 0.25 + 18 };
    for (const t of persona(s).traits) { const d = playerTraitById[t]; if (d) native.push(d.name); }
    up('exec', 45 + o.attrs.management * 0.4); up('anr', o.attrs.ear * 0.9); up('legal', o.attrs.negotiation * 0.7); up('manager', o.attrs.negotiation * 0.8);
    up('publicist', o.attrs.charisma * 0.8); up('admin', o.attrs.management * 0.85); up('producer', o.attrs.ear * 0.7);
    views = playerViews(s);
  } else if (kc === 'p') {
    const p = s.persons[id];
    if (!p) return null;
    kind = p.isPlayer ? 'player' : 'person';
    name = p.name; born = p.born; role = p.role;
    const a = actsOfPerson17(s, p.id)[0];
    city = a?.city ?? s.config.homeCity;
    facets = soul(s, p).f;
    const k = p.skills;
    const art = (k.comp + k.lyr + k.voice + k.instr + k.stage) / 5;
    attrs = {
      ear: (k.comp + k.prod + k.instr) / 3 * 0.75 + facets.curiosidade * 0.25,
      neg: k.biz * 0.65 + facets.teimosia * 0.15 + facets.confianca * 0.1 + 8,
      cha: k.stage * 0.55 + facets.sociabilidade * 0.25 + facets.confianca * 0.15 + 5,
      mgmt: k.biz * 0.45 + facets.disciplina * 0.4 + 8,
      img: k.stage * 0.3 + facets.vaidade * 0.35 + u(s, key, 'img') * 35,
    };
    up('artist', art); up('producer', k.prod); up('engineer', k.prod * 0.8); up('anr', (k.comp + k.prod) / 2 * 0.75); up('manager', k.biz * 0.85);
    up('booking', k.biz * 0.6 + k.stage * 0.2); up('publicist', k.stage * 0.35 + k.biz * 0.35); up('legal', k.biz * 0.45); up('exec', k.biz * 0.6 + facets.ambicao * 0.2);
    up('critic', k.lyr * 0.5 + facets.curiosidade * 0.3); job = p.isPlayer ? 'exec' : 'artist';
    look = p.look ?? (p.isPlayer ? lookOf13(p.id) : undefined); // rodada 15: sem visual salvo, pele vem da cidade (retrato segue)
    views = viewsOf(s, p.id);
    if (p.isPlayer) {
      const o = ownerOf(s);
      attrs.ear = o.attrs.ear; attrs.neg = o.attrs.negotiation; attrs.cha = o.attrs.charisma; attrs.mgmt = o.attrs.management;
      attrs.img = o.attrs.charisma * 0.45 + facets.vaidade * 0.25 + 18 + (persona(s).visual === 'casual' ? 0 : 8);
      for (const t of persona(s).traits) { const d = playerTraitById[t]; if (d) native.push(d.name); }
      up('exec', 45 + o.attrs.management * 0.4); up('anr', o.attrs.ear * 0.9); up('legal', o.attrs.negotiation * 0.7); up('manager', o.attrs.negotiation * 0.8);
      up('publicist', o.attrs.charisma * 0.8); up('admin', o.attrs.management * 0.85); up('producer', o.attrs.ear * 0.7);
    }
  } else if (kc === 'l') {
    const L0 = leaders(s).L[id];
    if (!L0) return null;
    kind = 'leader'; name = L0.name; born = L0.born; city = L0.city; job = 'exec';
    facets = leaderFacets(s, L0);
    const st = L0.style;
    const b = (k: string) => u(s, key, k) * 30 + 35;
    attrs = {
      ear: b('ear') + (st === 'visionary' ? 18 : 0) + (['producer', 'dj', 'engineer', 'artist'].includes(L0.bg) ? 12 : 0),
      neg: b('neg') + (st === 'dealmaker' ? 20 : 0) + (L0.bg === 'lawyer' || L0.bg === 'banker' ? 12 : 0),
      cha: b('cha') + (st === 'showman' ? 20 : 0) + (L0.bg === 'promoter' ? 8 : 0),
      mgmt: b('mgmt') + (st === 'numbers' ? 16 : st === 'consensus' ? 10 : st === 'autocrat' ? 6 : 0) + (L0.bg === 'accountant' ? 10 : 0),
      img: b('img') * 0.7 + facets.vaidade * 0.35,
    };
    up('exec', 55 + L0.amb * 0.3);
    const BG: Record<string, [string, number][]> = {
      lawyer: [['legal', 78], ['rights', 62]], promoter: [['booking', 76], ['tour_manager', 60]], banker: [['analyst', 72], ['admin', 60]], engineer: [['engineer', 78], ['producer', 60]],
      producer: [['producer', 78], ['anr', 66]], dj: [['publicist', 66], ['anr', 64]], journalist: [['critic', 72], ['publicist', 66]], accountant: [['analyst', 74], ['admin', 72]],
      artist: [['artist', 68], ['anr', 58]], heir: [['exec', 65]],
    };
    for (const [j, v] of BG[L0.bg] ?? []) up(j, v);
    views = deriveViews(s.config.seed, L0.id, { born: L0.born, year: s.year, city: L0.city });
  } else if (kc === 's') {
    const st = s.player.staff.find((x) => x.id === id);
    if (!st) return null;
    kind = 'staff'; name = st.name; city = s.config.homeCity; job = st.role;
    facets = hashFacets(s, key);
    const k = st.skill / 70;
    const b = (a: string) => 30 + u(s, key, a) * 30;
    const R = st.role;
    attrs = {
      ear: b('ear') + (R === 'anr' || R === 'producer' ? 16 * k : 0),
      neg: b('neg') + (['legal', 'manager', 'agent', 'sync', 'rights'].includes(R) ? 16 * k : 0),
      cha: b('cha') + (['publicist', 'booking', 'manager'].includes(R) ? 14 * k : 0),
      mgmt: b('mgmt') + (['admin', 'analyst', 'tour_manager', 'manufacturing'].includes(R) ? 14 * k : 0),
      img: b('img') * 0.8 + facets.vaidade * 0.3,
    };
    prof[R] = st.skill + (u(s, key, 'fit') - 0.5) * 26;
    views = viewsOf(s, st.id);
  } else if (kc === 'c' || kc === 'm' || kc === 'n') {
    kind = kc === 'c' ? 'critic' : kc === 'm' ? 'media' : 'npc';
    name = kc === 'm' ? id.split('|').pop() ?? id : id;
    city = s.config.homeCity;
    facets = hashFacets(s, key);
    const b = (a: string) => 30 + u(s, key, a) * 35;
    attrs = { ear: b('ear') + (kind === 'critic' ? 18 : 0), neg: b('neg'), cha: b('cha') + (kind === 'media' ? 12 : 0), mgmt: b('mgmt'), img: b('img') * 0.8 + facets.vaidade * 0.3 };
    if (kind === 'critic') { up('critic', 70 + u(s, key, 'cq') * 25); up('anr', 50 + u(s, key, 'ca') * 20); job = 'critic'; }
    if (kind === 'media') { up('publicist', 60 + u(s, key, 'mq') * 25); job = 'publicist'; }
    views = viewsOf(s, key);
  } else if (EXT13[kc]) {
    const e = EXT13[kc](s, id);
    if (!e) return null;
    kind = e.kind; name = e.name; born = e.born; city = e.city ?? s.config.homeCity; job = e.job;
    facets = { ...hashFacets(s, key), ...e.facets };
    attrs = { ...e.attrs };
    native.push(...(e.native ?? []));
    for (const [j, v] of Object.entries(e.prof ?? {})) up(j, v);
    views = deriveViews(s.config.seed, key, { born, year: s.year, city });
    if (e.sex || e.skin !== undefined) extSex = [e.sex, e.skin];
  } else return null;
  if (POST13.fn && kind !== 'person' && kind !== 'player') POST13.fn(s, key, { kind, born, job, facets, attrs, prof });
  for (const k of ATTR13_IDS) attrs[k] = c100(attrs[k]);
  for (const j of Object.keys(prof)) prof[j] = c100(prof[j]);
  const year = s.year;
  const sex: Sex13 = kind === 'player' ? (persona(s).sex ?? 'x') : extSex?.[0] ?? sexFor(s, key, kind, born ? born + 25 : year, role, look);
  const skin = look ? look.skin : extSex?.[1] ?? skinFor(s, key, city);
  return { key, kind, name, born, city, attrs, facets, traits: traitsOf(facets), native, views, prof, sex, skin, job };
}

/** Rodada 18 (ability18): ajuste pós-derivação (crescimento/declínio de quem não é artista) e assinatura do cache. */
export const POST13: { fn?: (s: GameState, key: string, x: { kind: Kind13; born?: number; job?: string; facets: Record<Facet, number>; attrs: Record<Attr13, number>; prof: Record<string, number> }) => void; sig?: (s: GameState, key: string) => string } = {};

/** Rodada 14: outros sistemas registram tipos de pessoa por prefixo de chave (ex.: 'e:' empresários). */
export interface Ext13 { kind: Kind13; name: string; born?: number; city?: string; job?: string; attrs: Record<Attr13, number>; facets?: Partial<Record<Facet, number>>; native?: L[]; prof?: Record<string, number>; sex?: Sex13; skin?: number }
const EXT13: Record<string, (s: GameState, id: string) => Ext13 | null> = {};
export function registerPer13(prefix: string, fn: (s: GameState, id: string) => Ext13 | null): void { EXT13[prefix] = fn; }

export const keyOfPerson = (p: Person): string => `p:${p.id}`;
export const keyOfLeader = (L0: Leader): string => `l:${L0.id}`;
export const keyOfStaff = (st: StaffMember): string => `s:${st.id}`;

// ---------------------------------------------------------------- uso: equipe (aptidão + atributo do cargo)

/** Ajuste do desempenho efetivo de um funcionário (−8..+8) e o porquê. */
export function staffAdj13(s: GameState, st: StaffMember): { v: number; why: L[] } {
  const P = per13(s, `s:${st.id}`);
  if (!P) return { v: 0, why: [] };
  const why: L[] = [];
  let v = clamp((P.prof[st.role] - st.skill) * 0.25, -6, 6);
  if (Math.abs(v) >= 1) why.push(fmtL(l('aptidão para o cargo {a}', 'aptitude for the role {a}'), { a: P.prof[st.role] }));
  const R = st.role;
  const at: Attr13 | null = R === 'anr' ? 'ear' : ['legal', 'manager', 'agent', 'sync'].includes(R) ? 'neg' : ['publicist', 'booking'].includes(R) ? 'cha' : ['admin', 'analyst', 'rights', 'tour_manager'].includes(R) ? 'mgmt' : null;
  if (at) { const d = (P.attrs[at] - 50) / 10; v += d; if (Math.abs(d) >= 1) why.push(fmtL(l('{n} {v}', '{n} {v}'), { n: ATTR13[at][0], v: P.attrs[at] })); }
  const o = p13(s).op[`s:${st.id}`]?.v ?? 0;
  if (o <= -25) { v -= 3; why.push(l('desmotivado(a) com você', 'demotivated with you')); }
  return { v: Math.round(clamp(v, -8, 8)), why };
}
staffAdjusters().push((s, st) => staffAdj13(s, st).v);

// ---------------------------------------------------------------- uso: propostas (negociação, política, memória)

const front = (s: GameState, a: Act): Person | undefined => {
  const ms = a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive);
  return ms.find((p) => p.role === 'vocal' || p.role === 'mc') ?? ms[0];
};
/** Quem negocia pelo ato: o membro com mais negociação. */
export function negotiatorOf(s: GameState, a: Act): { p: Person; neg: number } | null {
  let best: { p: Person; neg: number } | null = null;
  for (const id of a.members) { const p = s.persons[id]; const P = p && per13(s, `p:${id}`); if (P && (!best || P.attrs.neg > best.neg)) best = { p, neg: P.attrs.neg }; }
  return best;
}
/** Negociação efetiva do selo: a sua, com reforço do melhor jurídico/empresário. */
export function labelNeg(s: GameState): number {
  const mine = ownerOf(s).attrs.negotiation;
  const helpers = s.player.staff.filter((x) => x.role === 'legal' || x.role === 'manager').map((x) => per13(s, `s:${x.id}`)?.attrs.neg ?? 0);
  const h = helpers.length ? Math.max(...helpers) : 0;
  return Math.round(Math.max(mine, mine * 0.7 + h * 0.3));
}

registerOfferMod('persona13', (s, act) => {
  const ng = negotiatorOf(s, act);
  if (!ng) return null;
  const me = labelNeg(s);
  const d = clamp((me - ng.neg) / 700, -0.05, 0.05);
  if (Math.abs(d) < 0.01) return null;
  return { delta: d, reason: fmtL(d > 0 ? l('Negociação: você ({m}) leva vantagem sobre {n} ({o}).', 'Negotiation: you ({m}) outplay {n} ({o}).') : l('Negociação: {n} ({o}) é mais duro(a) na mesa que você ({m}).', 'Negotiation: {n} ({o}) is tougher at the table than you ({m}).'), { m: me, n: ng.p.name, o: ng.neg }) };
});
registerOfferMod('persona13op', (s, act) => {
  const ops = act.members.map((id) => p13(s).op[`p:${id}`]).filter(Boolean) as Op13[];
  const world = p13(s).op['w:artists']?.v ?? 0;
  const v = (ops.length ? ops.reduce((t, x) => t + x.v, 0) / ops.length : 0) + world;
  const d = clamp(v / 400, -0.08, 0.06);
  if (Math.abs(d) < 0.01) return null;
  const last = ops.flatMap((x) => x.w).sort((a, b) => b[0] * 12 + b[1] - a[0] * 12 - a[1])[0];
  const why = last ? last[3] : p13(s).op['w:artists']?.w.slice(-1)[0]?.[3];
  return { delta: d, reason: fmtL(d > 0 ? l('Boa fama com quem negocia: {w}', 'Good name with them: {w}') : l('Lembram do que você fez: {w}', 'They remember what you did: {w}'), { w: why ?? l('o que se fala no meio', 'what the trade says') }) };
});
registerOfferMod('persona13pol', (s, act) => {
  const f = front(s, act);
  if (!f) return null;
  const c = compatOf(playerViews(s), viewsOf(s, f.id));
  const d = Math.round(c * 0.035 * 100) / 100;
  if (Math.abs(d) < 0.015) return null;
  return { delta: d, reason: fmtL(d > 0 ? l('{n} se identifica com suas posições.', '{n} shares your views.') : l('{n} discorda das suas posições políticas/religiosas.', '{n} disagrees with your political/religious views.'), { n: f.name }) };
});

// ---------------------------------------------------------------- barreiras históricas (imagem, pele, sexo)

export interface Barrier13 { k: 'img' | 'race' | 'sex' | 'owner'; m: number; why: L; niche?: L; fought?: L }

const NICHE_RACE: FamilyId[] = ['blues_jazz', 'rnb', 'hiphop', 'caribbean', 'africa', 'brazil', 'latin', 'sacred'];
function raceBase(a3: string | null, y: number): number {
  if (a3 === 'USA') return y < 1955 ? 0.22 : y < 1965 ? 0.14 : y < 1981 ? 0.07 : y < 1986 ? 0.06 : y < 2000 ? 0.03 : 0.01;
  if (a3 === 'ZAF') return y < 1994 ? 0.25 : y < 2005 ? 0.06 : 0.02;
  if (a3 === 'GBR') return y < 1965 ? 0.1 : y < 1981 ? 0.06 : y < 2000 ? 0.025 : 0.01;
  if (a3 === 'BRA') return y < 1970 ? 0.08 : y < 1990 ? 0.05 : y < 2010 ? 0.025 : 0.01;
  return y < 1960 ? 0.08 : y < 1980 ? 0.05 : y < 2000 ? 0.02 : 0.005;
}
const raceWhy = (a3: string | null, y: number): L =>
  a3 === 'USA' && y < 1965 ? l('Rádios e TVs segregadas: muitas emissoras não tocam artistas negros fora das "race records".', 'Segregated radio and TV: many stations will not play Black artists outside "race records".')
    : a3 === 'USA' && y >= 1981 && y < 1986 ? l('A MTV dos primeiros anos quase não exibe clipes de artistas negros.', 'Early MTV barely airs videos by Black artists.')
      : a3 === 'ZAF' && y < 1994 ? l('Apartheid: rádio e TV separadas por raça, censura e circuito restrito.', 'Apartheid: radio and TV split by race, censorship and a restricted circuit.')
        : l('Preconceito racial nas programações e nas capas de revista desta época.', 'Racial prejudice in playlists and magazine covers of this era.');
function sexBase(fam: FamilyId, y: number): number {
  const hard = fam === 'rock' || fam === 'hiphop' || fam === 'electronic' || fam === 'country_folk';
  if (!hard) return y < 1960 ? 0.04 : y < 1980 ? 0.02 : 0;
  return y < 1980 ? 0.1 : y < 2000 ? 0.05 : y < 2015 ? 0.02 : 0;
}
/** Peso da imagem por época: rádio (pouco), TV (médio), MTV (muito), streaming (médio), redes (muito). */
export function imageWeight(y: number): { w: number; era: L } {
  if (y < 1950) return { w: 0.02, era: l('era do rádio', 'radio era') };
  if (y < 1981) return { w: 0.06, era: l('era da TV', 'TV era') };
  if (y < 2006) return { w: 0.14, era: l('era da MTV e do videoclipe', 'MTV and music-video era') };
  if (y < 2013) return { w: 0.08, era: l('era do download', 'download era') };
  return { w: 0.12, era: l('era das redes sociais', 'social media era') };
}

/** Barreiras e trunfos de um ato num país (padrão: a cidade do ato). m = multiplicador do alcance. */
const BCACHES = new WeakMap<GameState, Map<string, Barrier13[]>>();
export function barriers13(s: GameState, a: Act, cityId?: string): Barrier13[] {
  const ck = `${s.config.seed}|${s.year}|${a.id}|${a.genre}|${a.city}|${cityId ?? ''}|${a.members.join(',')}|${p13(s).bar[a.id]?.join() ?? ''}`;
  let BCACHE = BCACHES.get(s);
  if (!BCACHE) BCACHES.set(s, (BCACHE = new Map()));
  const hit = BCACHE.get(ck);
  if (hit) return hit;
  if (BCACHE.size > 20000) BCACHE.clear(); // r15: sem semana na chave (só muda por ano) e teto maior p/ bases grandes
  const out = barriersRaw(s, a, cityId);
  BCACHE.set(ck, out);
  return out;
}
function barriersRaw(s: GameState, a: Act, cityId?: string): Barrier13[] {
  const f = front(s, a);
  if (!f) return [];
  const P = per13(s, `p:${f.id}`);
  if (!P) return [];
  const y = s.year;
  const a3 = countryOfCity(cityId ?? a.city);
  const fam = familyOf(a.genre);
  const out: Barrier13[] = [];
  const bar = p13(s).bar[a.id];
  const mode = bar && y - bar[0] <= 12 ? bar[1] : undefined;
  const iw = imageWeight(y);
  const imgs = a.members.map((id) => per13(s, `p:${id}`)?.attrs.img ?? 50);
  const img = P.attrs.img * 0.6 + (imgs.reduce((t, x) => t + x, 0) / imgs.length) * 0.4 + (mode === 'comply' && P.sex === 'f' ? 10 : 0);
  // visual forte rende inteiro; visual apagado pesa pela metade (o som ainda conta mais que a foto)
  const im = 1 + ((img - 50) / 50) * iw.w * (img < 50 ? 0.5 : 1);
  if (Math.abs(im - 1) >= 0.005) out.push({ k: 'img', m: im, why: fmtL(im > 1 ? l('Visual forte ({v}) rende mais na {e}.', 'A strong look ({v}) pays off in the {e}.') : l('Visual apagado ({v}) pesa contra na {e}.', 'A plain look ({v}) holds them back in the {e}.'), { v: Math.round(img), e: iw.era }) });
  if (P.skin >= 2) {
    let pen = raceBase(a3, y) * (P.skin === 3 ? 1 : 0.6);
    let niche: L | undefined;
    if (NICHE_RACE.includes(fam)) { pen *= 0.45; niche = l('A cena do gênero abraça o artista: rádios, clubes e imprensa da comunidade compensam boa parte.', 'The genre\'s scene embraces the act: community radio, clubs and press make up much of it.'); }
    let fought: L | undefined;
    if (mode === 'fight') { pen *= 0.5; fought = l('Você enfrentou a barreira publicamente: portas se abriram.', 'You fought the barrier publicly: doors opened.'); }
    if (mode === 'niche') { pen *= 0.7; fought = l('Você apostou no circuito que acolhe o artista.', 'You leaned on the circuit that welcomes the act.'); }
    if (mode === 'comply') { pen *= 0.8; fought = l('Capas sem foto e só rádio: menos barreira, artista ressentido.', 'Faceless covers and radio only: less barrier, resentful artist.'); }
    if (pen >= 0.005) out.push({ k: 'race', m: 1 - pen, why: raceWhy(a3, y), niche, fought });
  }
  if (P.sex === 'f') {
    let pen = sexBase(fam, y);
    let fought: L | undefined;
    if (mode === 'fight') { pen *= 0.5; fought = l('Você bancou a artista contra o machismo do meio.', 'You backed the artist against the trade\'s sexism.'); }
    if (mode === 'niche') { pen *= 0.6; fought = l('Você levou a artista ao público que a procura.', 'You took the artist to the audience looking for her.'); }
    if (pen >= 0.005) out.push({ k: 'sex', m: 1 - pen, why: l('Machismo do meio: rádios e programadores duvidam de mulheres neste gênero e nesta época.', 'Industry sexism: radio and programmers doubt women in this genre and era.'), fought });
    else if ((fam === 'pop' || fam === 'rnb') && y >= 1958 && y < 1995) out.push({ k: 'sex', m: 1.03, why: l('Era das divas e dos grupos vocais femininos: o público procura vozes como a dela.', 'Era of divas and girl groups: audiences look for voices like hers.') });
  }
  return out;
}

const pickB = (s: GameState, a: Act | undefined, k: Barrier13['k'], city?: string) => (a ? barriers13(s, a, city).find((b) => b.k === k) : undefined);
registerMod('appeal', 'persona13img', (s, v, c) => { const b = pickB(s, c.act, 'img'); return b ? { value: v * b.m, label: b.why } : null; });
registerMod('appeal', 'persona13race', (s, v, c) => { const b = pickB(s, c.act, 'race'); return b ? { value: v * b.m, label: b.why } : null; });
registerMod('appeal', 'persona13sex', (s, v, c) => { const b = pickB(s, c.act, 'sex'); return b ? { value: v * b.m, label: b.why } : null; });
registerMod('cityDemand', 'persona13seg', (s, v, c) => {
  if (!c.cityId) return null;
  const b = pickB(s, c.act, 'race', c.cityId);
  return b ? { value: v * (1 - (1 - b.m) * 0.7), label: l('Circuito de shows segregado nesta cidade e época.', 'Segregated touring circuit in this city and era.') } : null;
});

/** Machismo nos negócios contra a dona do selo (diminui com as décadas). */
export function ownerBarrier(s: GameState): Barrier13 | null {
  if (persona(s).sex !== 'f') return null;
  const y = s.year;
  const pen = y < 1965 ? 0.035 : y < 1985 ? 0.02 : y < 2005 ? 0.008 : 0;
  return pen ? { k: 'owner', m: 1 - pen, why: l('Muitos artistas e empresários ainda desconfiam de uma mulher no comando de um selo.', 'Many artists and managers still distrust a woman running a label.') } : null;
}
registerOfferMod('persona13owner', (s, act) => {
  const b = ownerBarrier(s);
  if (!b) return null;
  const f = front(s, act);
  const P = f && per13(s, `p:${f.id}`);
  if (P?.sex === 'f') return { delta: 0.02, reason: l('A artista se identifica com uma mulher no comando do selo.', 'The artist identifies with a woman running the label.') };
  return { delta: -(1 - b.m), reason: b.why };
});

// ---------------------------------------------------------------- opinião (ações → relações, com motivo)

const pid0 = (s: GameState): string | undefined => playerPerson(s)?.id;

/** Opinião atual sobre você: relação nativa do tipo (quando existe) ou o registro desta rodada. */
export function opinionOf(s: GameState, key: string): number {
  const [k, ...r] = key.split(':');
  const id = r.join(':');
  if (k === 'l') return leaders(s).L[id]?.rel.player ?? 0;
  if (k === 'c') return critRel(s).rel[id] ?? 0;
  if (k === 's') { const st = s.player.staff.find((x) => x.id === id); return st ? Math.round((careerOf(s, st).loyalty - 50) * 2) : 0; }
  if (k === 'p') { const me = pid0(s); const p = s.persons[id]; if (p && me && p.rel[me] !== undefined) return Math.round(p.rel[me]); }
  return Math.round(p13(s).op[key]?.v ?? 0);
}

/** Muda a opinião de alguém sobre você, ponderada pela personalidade, e guarda o motivo. */
export function opine(s: GameState, key: string, d: number, why: L, o: { pol?: boolean } = {}): number {
  if (key === 'player' || (key.startsWith('p:') && s.persons[key.slice(2)]?.isPlayer)) return 0; // ninguém tem opinião sobre si mesmo
  const P = key.startsWith('w:') ? null : per13(s, key);
  let k = 1;
  if (P) {
    const f = P.facets;
    k = d < 0 ? 0.7 + f.teimosia / 250 + (100 - f.empatia) / 400 + (100 - f.paciencia) / 500 : 0.7 + f.empatia / 300 + f.generosidade / 500;
    if (o.pol) k *= 0.4 + P.views.eng / 80;
  }
  const v = Math.round(d * k * 10) / 10;
  if (!v) return 0;
  const st = p13(s);
  const e = (st.op[key] ??= { v: 0, w: [] });
  e.v = clamp(e.v + v, -100, 100);
  e.w.push([s.year, s.month, v, why]);
  if (e.w.length > 6) e.w.shift();
  const [kk, ...r] = key.split(':');
  const id = r.join(':');
  if (kk === 'l') { const L0 = leaders(s).L[id]; if (L0) L0.rel.player = clamp((L0.rel.player ?? 0) + v, -100, 100); }
  else if (kk === 'c') critRel(s).rel[id] = clamp((critRel(s).rel[id] ?? 0) + v * 0.6, -100, 100);
  else if (kk === 's') { const sm = s.player.staff.find((x) => x.id === id); if (sm) { const c = careerOf(s, sm); c.loyalty = clamp(c.loyalty + v * 0.5, 0, 100); } }
  else if (kk === 'p') {
    const p = s.persons[id];
    const me = pid0(s);
    if (p && me && me !== id) p.rel[me] = clamp((p.rel[me] ?? 0) + v, -100, 100);
    const a = p && Object.values(s.acts).find((x) => x.members.includes(id) && x.owner === 'player');
    if (a) a.trust = clamp(a.trust + v * 0.25, 0, 100);
  }
  const keys = Object.keys(st.op);
  if (keys.length > 800) for (const x of keys.slice(0, keys.length - 800)) delete st.op[x];
  return v;
}
const actOpine = (s: GameState, a: Act, d: number, why: L): void => { for (const id of a.members) if (s.persons[id]?.alive) opine(s, `p:${id}`, d, why); };
const leaderKeyOfLabel = (s: GameState, lb: string): string | null => { const L0 = leaderOf(s, lb); return L0 ? `l:${L0.id}` : null; };
const activeLeaders = (s: GameState): Leader[] => Object.values(leaders(s).L).filter((x) => x.st === 'active' && x.label && s.labels[x.label]);

/** Declaração política: cada um reage conforme a afinidade com as suas posições e o engajamento. */
function politicalWave(s: GameState, why: L, w: number): void {
  const pv = playerViews(s);
  for (const L0 of activeLeaders(s).slice(0, 25)) opine(s, `l:${L0.id}`, compatOf(pv, per13(s, `l:${L0.id}`)!.views) * w, why, { pol: true });
  for (const id of playerActs(s)) for (const m of s.acts[id]?.members ?? []) if (s.persons[m] && !s.persons[m].isPlayer) opine(s, `p:${m}`, compatOf(pv, viewsOf(s, m)) * w, why, { pol: true });
  for (const st of s.player.staff) opine(s, `s:${st.id}`, compatOf(pv, viewsOf(s, st.id)) * w * 0.7, why, { pol: true });
}

rememberListeners().push((s, e) => {
  const a = e.actId ? s.acts[e.actId] : undefined;
  const st = p13(s);
  const T = (pt: string, en: string, p: Record<string, string | number> = {}) => fmtL(l(pt, en), p);
  switch (e.kind) {
    case 'left':
      if (!a) return;
      if ((e.text.pt ?? '').includes('rescis')) {
        actOpine(s, a, -22, T('você nos dispensou em {y}.', 'you dropped us in {y}.', { y: s.year }));
        for (const id of playerActs(s)) if (id !== a.id) for (const m of s.acts[id]?.members.slice(0, 2) ?? []) opine(s, `p:${m}`, -3, T('viu {a} ser dispensado.', 'saw {a} get dropped.', { a: a.name }));
        opine(s, 'w:artists', -6, T('dispensou {a}', 'dropped {a}', { a: a.name }));
      } else if ((e.text.pt ?? '').includes('insatisf')) actOpine(s, a, -8, T('saímos insatisfeitos em {y}.', 'we left unhappy in {y}.', { y: s.year }));
      return;
    case 'poach': {
      if (!a) return;
      const lk = st.ex[a.id] ? leaderKeyOfLabel(s, st.ex[a.id]) : null;
      if (lk) opine(s, lk, -25, T('você roubou {a} do nosso selo.', 'you poached {a} from our label.', { a: a.name }));
      for (const L0 of activeLeaders(s).slice(0, 12)) if (`l:${L0.id}` !== lk) opine(s, `l:${L0.id}`, -2, T('aliciou {a}: ninguém está seguro.', 'poached {a}: nobody is safe.', { a: a.name }));
      return;
    }
    case 'signed': {
      if (!a) return;
      const ex = st.ex[a.id];
      const lk = ex ? leaderKeyOfLabel(s, ex) : null;
      if (lk) opine(s, lk, -7, T('contratou {a}, que era nosso.', 'signed {a}, who used to be ours.', { a: a.name }));
      actOpine(s, a, 4, T('nos recebeu bem no selo.', 'welcomed us to the label.'));
      return;
    }
    case 'lawsuit': {
      const suit = s.lawsuits[s.lawsuits.length - 1];
      if (!suit) return;
      const other = suit.plaintiff === 'player' ? suit.defendant : suit.plaintiff;
      const lk = s.labels[other] ? leaderKeyOfLabel(s, other) : null;
      if (lk) opine(s, lk, -12, T('estamos em processo na justiça.', 'we are in court against each other.'));
      if (a && a.owner !== 'player') actOpine(s, a, -8, T('processo na justiça em {y}.', 'lawsuit in {y}.', { y: s.year }));
      return;
    }
    case 'award': case 'award2': case 'nat_award':
      if (!a || a.owner !== 'player' || !e.important) return;
      for (const L0 of activeLeaders(s).sort((x, y) => (s.labels[y.label!].revenueYear ?? 0) - (s.labels[x.label!].revenueYear ?? 0)).slice(0, 3)) {
        const P = per13(s, `l:${L0.id}`);
        opine(s, `l:${L0.id}`, -2 - ((P?.facets.ego ?? 50) - 50) / 12, T('{a} ganhou o prêmio em cima dos nossos.', '{a} won the award over ours.', { a: a.name }));
      }
      actOpine(s, a, 3, T('o selo nos levou ao prêmio.', 'the label took us to the award.'));
      return;
    case 'era_stance':
      politicalWave(s, T('sua posição pública em {y}.', 'your public stance in {y}.', { y: s.year }), 7);
      return;
    case 'payola': case 'chart_rig': case 'scheme_caught': case 'payola9':
      for (const name of Object.keys(critRel(s).rel).slice(0, 15)) opine(s, `c:${name}`, -5, T('escândalo de bastidores ({y}).', 'backroom scandal ({y}).', { y: s.year }));
      return;
    case 'promise_broken': case 'broken_promise':
      if (a) actOpine(s, a, -10, T('você não cumpriu o que prometeu.', 'you broke your promise.'));
      return;
    case 'promise_kept':
      if (a) actOpine(s, a, 6, T('você cumpriu o que prometeu.', 'you kept your promise.'));
      return;
    case 'masters_sold':
      if (a) actOpine(s, a, -10, T('vendeu nossas masters.', 'sold our masters.'));
      return;
    case 'renegotiation_refused':
      if (a) actOpine(s, a, -4, T('recusou renegociar conosco.', 'refused to renegotiate with us.'));
      return;
  }
});

// ---------------------------------------------------------------- ações do jogador sobre pessoas

export const GIFT_COST = 600;
const cdOk = (s: GameState, k: string): boolean => (p13(s).cd[k] ?? -1e9) <= s.week;

export function giftBlock(s: GameState, key: string): L | null {
  if (!cdOk(s, `gift|${key}`)) return l('Já recebeu um presente seu este ano.', 'Already got a gift from you this year.');
  if (s.player.cash < money(s, GIFT_COST)) return l('Caixa insuficiente.', 'Not enough cash.');
  return null;
}
export function sendGift(s: GameState, key: string): L {
  const e = giftBlock(s, key);
  if (e) return e;
  const P = per13(s, key);
  post(s, `gift13:${key}:${s.week}`, -money(s, GIFT_COST), 'marketing', 'Presente');
  p13(s).cd[`gift|${key}`] = s.week + 52;
  const greedy = P ? (P.facets.generosidade < 40 ? 1.4 : 1) * (P.facets.vaidade > 60 ? 1.2 : 1) : 1;
  const v = opine(s, key, 7 * greedy, l('mandou um presente.', 'sent a gift.'));
  return fmtL(l('{n} recebeu o presente (+{v}).', '{n} got the gift (+{v}).'), { n: P?.name ?? '?', v });
}

export function favorBlock(s: GameState, key: string): L | null {
  if (!cdOk(s, `favor|${key}`)) return l('Você já pediu um favor recentemente.', 'You asked a favor recently.');
  if (opinionOf(s, key) < 15) return l('Precisa de opinião +15 ou mais: ninguém faz favor a quem mal conhece.', 'Needs opinion +15 or more: nobody does favors for strangers.');
  return null;
}
/** Favor: gasta boa vontade (−10) por um ganho que depende de quem é a pessoa. */
export function askFavor(s: GameState, key: string): L {
  const e = favorBlock(s, key);
  if (e) return e;
  const P = per13(s, key)!;
  p13(s).cd[`favor|${key}`] = s.week + 26;
  opine(s, key, -8, l('pediu um favor.', 'asked a favor.'));
  const R = s.player.reputation;
  if (P.kind === 'leader') { R.institutional = clamp(R.institutional + 3, 0, 100); return fmtL(l('{n} abriu portas: +3 de reputação institucional.', '{n} opened doors: +3 institutional reputation.'), { n: P.name }); }
  if (P.kind === 'critic' || P.kind === 'media') { R.artistic = clamp(R.artistic + 2, 0, 100); return fmtL(l('{n} falou bem do selo: +2 de reputação artística.', '{n} spoke well of the label: +2 artistic reputation.'), { n: P.name }); }
  if (P.kind === 'staff') { const sm = s.player.staff.find((x) => `s:${x.id}` === key); if (sm) sm.skill = Math.min(100, sm.skill + 2); return fmtL(l('{n} virou noites por você: +2 de habilidade.', '{n} pulled all-nighters for you: +2 skill.'), { n: P.name }); }
  R.artists = clamp(R.artists + 2, 0, 100);
  return fmtL(l('{n} indicou o selo a colegas: +2 de reputação com artistas.', '{n} recommended the label to peers: +2 reputation with artists.'), { n: P.name });
}

/** Declaração pública sobre alguém: elogio (+) ou crítica (−; os desafetos dele gostam). */
export function publicStatement(s: GameState, key: string, praise: boolean): L {
  if (!cdOk(s, `say|${key}`)) return l('Você já falou dessa pessoa em público este ano.', 'You already spoke about this person publicly this year.');
  const P = per13(s, key);
  if (!P) return l('Pessoa desconhecida.', 'Unknown person.');
  p13(s).cd[`say|${key}`] = s.week + 52;
  if (praise) { opine(s, key, 8, l('elogiou em público.', 'praised publicly.')); return fmtL(l('Você elogiou {n} na imprensa.', 'You praised {n} in the press.'), { n: P.name }); }
  opine(s, key, -16, l('criticou em público.', 'criticized publicly.'));
  let fans = 0;
  if (P.kind === 'leader') {
    const id = key.slice(2);
    for (const L0 of activeLeaders(s)) if (L0.id !== id && (L0.rel[id] ?? 0) <= -20) { opine(s, `l:${L0.id}`, 4, fmtL(l('você bateu de frente com {n}.', 'you took on {n}.'), { n: P.name })); fans++; }
  }
  s.player.reputation.institutional = clamp(s.player.reputation.institutional - 1, 0, 100);
  return fmtL(l('Você criticou {n} em público (−1 reputação institucional; {f} desafeto(s) dele(a) gostaram).', 'You criticized {n} publicly (−1 institutional reputation; {f} of their foes liked it).'), { n: P.name, f: fans });
}

/** Declaração política do jogador: reforça o engajamento e mexe com todos conforme a afinidade. */
export function politicalStatement(s: GameState): L {
  if (!cdOk(s, 'polsay')) return l('Você já fez uma declaração política este ano.', 'You already made a political statement this year.');
  const v = playerViews(s);
  if (v.pol === 'apolitical') return l('Você é apolítico(a): não há o que declarar.', 'You are apolitical: nothing to declare.');
  p13(s).cd['polsay'] = s.week + 52;
  shiftPlayerViews(s, { eng: 6 });
  politicalWave(s, fmtL(l('sua declaração política de {y}.', 'your political statement in {y}.'), { y: s.year }), 8);
  return l('Declaração feita. Quem pensa como você se aproximou; quem discorda, se afastou.', 'Statement made. Those who think like you came closer; those who disagree drifted away.');
}

// ---------------------------------------------------------------- eventos: enfrentar barreiras e rancores

const rngFor = (s: GameState, k: string): Rng => Rng.fromSeed(`${s.config.seed}|p13|${k}|${s.week}`);
const fightCost = (s: GameState, a: Act): number => 1500 + a.fame * 60;
const setBar = (s: GameState, id: string, m: 'fight' | 'niche' | 'comply') => { p13(s).bar[id] = [s.year, m]; };
const conservativeWave = (s: GameState, why: L, pos: number) => {
  for (const L0 of activeLeaders(s).slice(0, 20)) {
    const v = per13(s, `l:${L0.id}`)!.views;
    const ax = v.pol === 'apolitical' ? 0 : v.pol === 'left' ? -2 : v.pol === 'cleft' ? -1 : v.pol === 'cright' ? 1 : v.pol === 'right' ? 2 : 0;
    if (ax) opine(s, `l:${L0.id}`, ax < 0 ? pos : -pos, why, { pol: true });
  }
};

function barrierFight(s: GameState, actId: string, kind: 'race' | 'sex'): void {
  const a = s.acts[actId];
  if (!a) return;
  post(s, `p13fight:${actId}:${s.week}`, -money(s, fightCost(s, a)), 'marketing', 'Campanha contra barreira');
  setBar(s, actId, 'fight');
  const R = s.player.reputation;
  R.artistic = clamp(R.artistic + 3, 0, 100); R.artists = clamp(R.artists + 4, 0, 100); R.institutional = clamp(R.institutional - 3, 0, 100);
  actOpine(s, a, 12, fmtL(l('o selo nos defendeu contra {k} em {y}.', 'the label stood up for us against {k} in {y}.'), { k: kind === 'race' ? l('o racismo', 'racism') : l('o machismo', 'sexism'), y: s.year }));
  conservativeWave(s, fmtL(l('pressionou rádios e TVs por {a}.', 'pressured radio and TV for {a}.'), { a: a.name }), 5);
  notify(s, fmtL(l('{a}: a campanha abriu portas — metade da barreira some por uma década.', '{a}: the campaign opened doors — half the barrier is gone for a decade.'), { a: a.name }), 'good');
}
function barrierNiche(s: GameState, actId: string): void {
  const a = s.acts[actId];
  if (!a) return;
  setBar(s, actId, 'niche');
  actOpine(s, a, 3, l('o selo nos levou ao público certo.', 'the label took us to the right crowd.'));
}
function barrierComply(s: GameState, actId: string): void {
  const a = s.acts[actId];
  if (!a) return;
  setBar(s, actId, 'comply');
  actOpine(s, a, -14, l('o selo nos escondeu para agradar as rádios.', 'the label hid us to please the radio.'));
  for (const m of a.members) { const p = s.persons[m]; if (p) p.morale = clamp(p.morale - 8, 0, 100); }
  s.player.reputation.artists = clamp(s.player.reputation.artists - 3, 0, 100);
}

deferEvents<EventDef>([
  {
    id: 'p13_race', cat: 'culture', tone: 'bad', tags: [], cooldown: 6, forcedOnly: true,
    title: l('Portas fechadas para {act}', 'Doors closed to {act}'),
    text: l('Programadores de rádio e TV estão recusando {act} — não pela música, mas pela cor da pele. É uma barreira da época, e o selo precisa decidir como responder.', 'Radio and TV programmers are turning down {act} — not for the music, but for the color of their skin. It is a barrier of the era, and the label must decide how to respond.'),
    options: [
      { id: 'fight', label: l('Enfrentar: campanha pública e pressão nas emissoras', 'Fight: public campaign and pressure on stations'), hint: l('Custa caro; reduz a barreira à metade por 12 anos; artistas e crítica respeitam, executivos conservadores se irritam.', 'Costly; halves the barrier for 12 years; artists and critics respect it, conservative executives get annoyed.'), apply: (s, _r, c) => barrierFight(s, String(c.act), 'race') },
      { id: 'niche', label: l('Apostar no circuito que acolhe (rádios e clubes da comunidade)', 'Lean on the circuit that welcomes them (community radio and clubs)'), hint: l('Sem custo; reduz parte da barreira.', 'No cost; trims part of the barrier.'), apply: (s, _r, c) => barrierNiche(s, String(c.act)) },
      { id: 'comply', label: l('Esconder o artista (capa sem foto, só rádio)', 'Hide the act (faceless cover, radio only)'), hint: l('Menos barreira, mas o artista se sente traído.', 'Less barrier, but the act feels betrayed.'), apply: (s, _r, c) => barrierComply(s, String(c.act)) },
    ],
  },
  {
    id: 'p13_sex', cat: 'culture', tone: 'bad', tags: [], cooldown: 6, forcedOnly: true,
    title: l('"Mulher não vende {genreName}"', '"Women don\'t sell {genreName}"'),
    text: l('Programadores e lojistas torcem o nariz para {act}: dizem que mulher não vende esse gênero. É o machismo do meio nesta época.', 'Programmers and retailers turn their noses up at {act}: they say women do not sell this genre. It is the trade\'s sexism of the era.'),
    options: [
      { id: 'fight', label: l('Bancar a artista: campanha e turnê de imprensa', 'Back the artist: campaign and press tour'), hint: l('Custa caro; reduz a barreira à metade por 12 anos.', 'Costly; halves the barrier for 12 years.'), apply: (s, _r, c) => barrierFight(s, String(c.act), 'sex') },
      { id: 'niche', label: l('Buscar o público que já a procura', 'Find the audience already looking for her'), hint: l('Sem custo; reduz parte da barreira.', 'No cost; trims part of the barrier.'), apply: (s, _r, c) => barrierNiche(s, String(c.act)) },
      { id: 'comply', label: l('Ceder: imagem mais "vendável", menos voz', 'Give in: more "sellable" image, less say'), hint: l('Imagem sobe; a artista se ressente.', 'Image rises; the artist resents it.'), apply: (s, _r, c) => barrierComply(s, String(c.act)) },
    ],
  },
  {
    id: 'p13_grudge', cat: 'business', tone: 'bad', tags: [], cooldown: 12, forcedOnly: true,
    title: l('{leaderName} fala mal de você', '{leaderName} badmouths you'),
    text: l('{leaderName}, de {labelName}, anda dizendo a artistas e distribuidores que você não é confiável. Motivo: {why}', '{leaderName} of {labelName} is telling artists and distributors you cannot be trusted. Reason: {whyEn}'),
    options: [
      { id: 'gift', label: l('Fazer as pazes (jantar e presente)', 'Make peace (dinner and a gift)'), hint: l('Custa dinheiro; a opinião melhora.', 'Costs money; opinion improves.'), apply: (s, _r, c) => { post(s, `p13peace:${s.week}`, -money(s, GIFT_COST * 2), 'marketing', 'Reconciliação'); opine(s, String(c.lk), 18, l('fizemos as pazes num jantar.', 'we made peace over dinner.')); } },
      { id: 'hit', label: l('Responder na imprensa', 'Hit back in the press'), hint: l('Artistas gostam de firmeza; a briga esquenta.', 'Artists like firmness; the feud heats up.'), apply: (s, _r, c) => { opine(s, String(c.lk), -10, l('respondeu na imprensa.', 'hit back in the press.')); s.player.reputation.artists = clamp(s.player.reputation.artists + 2, 0, 100); s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100); } },
      { id: 'ignore', label: l('Ignorar', 'Ignore it'), hint: l('Alguns artistas acreditam nele.', 'Some artists believe them.'), apply: (s) => { opine(s, 'w:artists', -3, l('boatos de um rival', 'a rival\'s rumors')); } },
    ],
  },
]);

// ---------------------------------------------------------------- você e a sua pessoa são a mesma pessoa

/** Espelha o personagem do jogador na pessoa `isPlayer` (fonte única: dono + persona + ficha de criação). */
export function syncPlayerPerson13(s: GameState): void {
  const p = playerPerson(s);
  if (!p) return;
  const o = ownerOf(s);
  const pe = persona(s);
  p.name = o.name;
  p.born = o.born;
  const bg = backgroundById[life(s).background as BackgroundId];
  const mapped = pe.traits.map((t) => playerTraitById[t]?.personTrait).filter((x): x is string => !!x);
  const tr = [...new Set([...mapped, ...(bg?.traits ?? [])])].slice(0, 3);
  if (tr.length) p.traits = tr;
  const spec = s.config.character;
  if (!p.look && spec?.look && (o.generation ?? 1) === 1) p.look = spec.look;
  // o tino de negócio da pessoa acompanha a negociação/gestão do dono
  p.skills.biz = Math.max(p.skills.biz, Math.round((o.attrs.negotiation + o.attrs.management) / 2));
}
registerSimHook('newgame', 'persona13sync', (s) => syncPlayerPerson13(s));

registerSimHook('month', 'persona13', (s) => {
  syncPlayerPerson13(s);
  const st = p13(s);
  // dono anterior (para detectar aliciamento e contratação de ex-artistas de rivais)
  for (const lb of Object.values(s.labels)) if (lb.active) for (const id of lb.roster) st.ex[id] = lb.id;
  const exk = Object.keys(st.ex);
  if (exk.length > 3000) for (const k of exk.slice(0, exk.length - 3000)) delete st.ex[k];
  // memória que esfria devagar
  for (const e of Object.values(st.op)) e.v = Math.round(e.v * 0.985 * 10) / 10;
  // salários atrasando quando o caixa está no vermelho
  if (s.player.cash < 0) for (const sm of s.player.staff) opine(s, `s:${sm.id}`, -2, l('salário atrasado: caixa no vermelho.', 'late salary: cash in the red.'));
  const r = rngFor(s, 'm');
  // barreiras históricas viram decisão (no máximo uma por mês, cada ato a cada 3 anos)
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || a.fame < 8 || !cdOk(s, `bar|${id}`) || st.bar[id] && s.year - st.bar[id][0] <= 12) continue;
    const bs = barriers13(s, a);
    const b = bs.find((x) => (x.k === 'race' || x.k === 'sex') && x.m < 0.97);
    if (!b || !r.chance(0.12)) continue;
    st.cd[`bar|${id}`] = s.week + 156;
    emitEvent(s, r, b.k === 'race' ? 'p13_race' : 'p13_sex', { act: id, genre: a.genre });
    break;
  }
  // rancor: líder muito contrariado fala mal de você
  const g = activeLeaders(s).filter((L0) => (L0.rel.player ?? 0) <= -40 && cdOk(s, `grudge|${L0.id}`));
  if (g.length && r.chance(0.1)) {
    const L0 = r.pick(g);
    st.cd[`grudge|${L0.id}`] = s.week + 104;
    const w = st.op[`l:${L0.id}`]?.w.slice(-1)[0]?.[3] ?? l('velhas rusgas do mercado.', 'old market grudges.');
    emitEvent(s, r, 'p13_grudge', { lk: `l:${L0.id}`, label: L0.label!, leaderName: L0.name, why: w.pt, whyEn: w.en });
  }
});

// lançar disco de ex-artista de um rival incomoda o antigo líder (uma vez por ato)
registerSimHook('launch', 'persona13', (s, _r, arg) => {
  const rel = arg.release;
  if (!rel || rel.owner !== 'player') return;
  const st = p13(s);
  const ex = st.ex[rel.actId];
  if (!ex || ex === 'player' || st.cd[`exrel|${rel.actId}`]) return;
  st.cd[`exrel|${rel.actId}`] = 1;
  const lk = leaderKeyOfLabel(s, ex);
  if (lk) opine(s, lk, -4, fmtL(l('lançou disco de {a}, que era nosso.', 'released a record by {a}, who used to be ours.'), { a: s.acts[rel.actId]?.name ?? '?' }));
});

export const facetName = (k: Facet, hi: boolean): L => FACET_TXT[k][hi ? 2 : 1];
