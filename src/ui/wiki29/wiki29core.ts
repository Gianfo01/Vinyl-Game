// Rodada 29 (WIKI) — núcleo puro da wiki: endereços, contexto da partida, segredo/spoiler, texto com links e o catálogo
// estático dos dados reais (montado sob demanda, uma vez). Sem DOM e sem escrever no estado: nada novo entra no save.
//
// Endereços: "<tipo>:<id>" (ex.: "mech:money", "person:p12", "city:rio") ↔ hash "#/wiki/<tipo>/<id>".
// Regras de segredo (Bíblia de UI/UX): nunca mostrar talento/potencial oculto, intenção secreta de rival, mínimo oculto de
// negociação nem evento real agendado depois da data da partida. Fato real depois do ano da partida fica escondido até o
// jogador ligar "Revelar história real" (desligado por padrão; só vale na sessão aberta, não vai para o save).

import { CATALOG_ACTS, CATALOG_LABELS } from '../../data/catalog';
import { REAL_CLASSIC } from '../../data/realacts_classic';
import { REAL_ACTS, REAL_LABELS } from '../../data/realnames';
import type { RealMember, RealPeriod, RealRelease, RealRole } from '../../data/realtypes';
import { periodsOf } from '../../data/realtypes';
import { EXTRA_LABELS } from '../../data/labels10';
import { l, type L } from '../../data/world';
import { countryOfCity } from '../../data/geo';
import { t } from '../../i18n/strings';
import { canonKey, REAL_ALL } from '../../sim/sys/realworld';
import type { GameState } from '../../sim/types';
import type { Block29, Inline29 } from './wiki29types';

// ---------------------------------------------------------------- contexto

export interface W29 {
  /** partida carregada (null = catálogo estático dos dados reais) */
  s: GameState | null;
  /** "Revelar história real" (fatos reais depois do ano da partida) */
  reveal: boolean;
}

/** Ano de referência para spoilers: o da partida; sem partida, nada é futuro. */
export const year29 = (c: W29): number => c.s?.year ?? 9999;
/** Fato real do ano `y` está escondido agora? (só com partida carregada e o botão desligado) */
export const hidden29 = (c: W29, y: number | undefined): boolean => !!c.s && !c.reveal && y !== undefined && y > c.s.year;

export const tx = (x: L): string => t(x);
export const T = (pt: string, en: string): string => t(l(pt, en));

// ---------------------------------------------------------------- endereços

/** Tipos de artigo e a seção (aba do topo) onde moram. */
export const KINDS29 = {
  home: 'home', idx: 'home',
  mech: 'mech', glossario: 'glossario', faq: 'faq',
  person: 'pessoas', act: 'pessoas', label: 'pessoas', rp: 'pessoas', ract: 'pessoas', prod: 'pessoas', mgr: 'pessoas', exec: 'pessoas', critic: 'pessoas',
  city: 'mundo', country: 'mundo', genre: 'mundo', move: 'mundo', era: 'mundo', tech: 'mundo', venue: 'mundo', outlet: 'mundo', org: 'mundo',
  relic: 'objetos', gear: 'objetos', merch: 'objetos', vehicle: 'objetos',
  time: 'tempo', cat: 'dados', ci: 'dados',
} as const;
export type Kind29 = keyof typeof KINDS29;
export type Sec29W = 'home' | 'pessoas' | 'mech' | 'mundo' | 'objetos' | 'tempo' | 'dados' | 'glossario' | 'faq';
export const SECS29W: { id: Sec29W; label: L; icon: string }[] = [
  { id: 'home', label: l('Início', 'Home'), icon: 'book' },
  { id: 'pessoas', label: l('Personagens', 'Characters'), icon: 'people' },
  { id: 'mech', label: l('Mecânicas', 'Mechanics'), icon: 'chess' },
  { id: 'mundo', label: l('Mundo', 'World'), icon: 'globe' },
  { id: 'objetos', label: l('Objetos', 'Objects'), icon: 'diamond' },
  { id: 'tempo', label: l('Linha do tempo', 'Timeline'), icon: 'datebook' },
  { id: 'dados', label: l('Regras e dados', 'Rules and data'), icon: 'scroll' },
  { id: 'glossario', label: l('Glossário', 'Glossary'), icon: 'quill' },
  { id: 'faq', label: l('Perguntas frequentes', 'FAQ'), icon: 'bulb' },
];

export const kindOf29 = (id: string): Kind29 | undefined => {
  const k = id.split(':')[0];
  return k in KINDS29 ? (k as Kind29) : undefined;
};
export const restOf29 = (id: string): string => id.slice(id.indexOf(':') + 1);
export const secOf29W = (id: string): Sec29W => (id === 'home' ? 'home' : (KINDS29[kindOf29(id) ?? 'home'] as Sec29W));

/** id → hash (#/wiki, #/wiki/mech/money, #/wiki/idx/acts). */
export function hashOf29(id: string): string {
  if (!id || id === 'home') return '#/wiki';
  const k = kindOf29(id);
  return k ? `#/wiki/${k}/${encodeURIComponent(restOf29(id))}` : '#/wiki';
}
/** hash → id (null se não é da wiki). Aceita #/wiki, #/wiki/<seção> e #/wiki/<tipo>/<id>. */
export function idOfHash29(hash: string): string | null {
  const m = /^#\/wiki(?:\/([^/?#]+)(?:\/(.+))?)?\/?$/.exec(hash.trim());
  if (!m) return null;
  if (!m[1]) return 'home';
  let rest = '';
  try { rest = m[2] ? decodeURIComponent(m[2]) : ''; } catch { return 'home'; }
  const k = m[1];
  if (!rest) {
    // #/wiki/mech → índice da seção
    const sec = SECS29W.find((x) => x.id === k);
    if (sec) return sec.id === 'home' ? 'home' : `idx:${sec.id}`;
    return 'home';
  }
  return `${k}:${rest}`;
}

// ---------------------------------------------------------------- texto com links

const LINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
/** Ids citados num texto ([[id]] / [[id|rótulo]]). */
export function linksIn29(text: string): string[] {
  return [...text.matchAll(LINK_RE)].map((m) => m[1].trim());
}
/** Texto → trechos; rótulo ausente = título do artigo (função passada por quem monta). */
export function inl29(text: string, title: (id: string) => string): Inline29[] {
  const out: Inline29[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK_RE)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    const id = m[1].trim();
    out.push({ link: id, text: m[2]?.trim() || title(id) });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
export const ln29 = (id: string, text: string): Inline29 => ({ link: id, text });
/** junta trechos com separador */
export function join29(xs: Inline29[], sep = ', '): Inline29[] {
  const out: Inline29[] = [];
  xs.forEach((x, i) => { if (i) out.push(sep); out.push(x); });
  return out;
}
export const P = (...x: Inline29[]): Block29 => ({ k: 'p', x });
export const H = (t0: string): Block29 => ({ k: 'h', t: t0 });

/** "1965–1968, 1975–" */
export const span29 = (a?: number, b?: number): string => (a === undefined && b === undefined ? '' : `${a ?? '?'}–${b ?? ''}`);

// ---------------------------------------------------------------- funções e papéis

const ROLE_L: Record<string, L> = {
  vocal: l('Voz', 'Vocals'), guitar: l('Guitarra', 'Guitar'), bass: l('Baixo', 'Bass'), drums: l('Bateria', 'Drums'), keys: l('Teclados', 'Keys'),
  horns: l('Sopros', 'Horns'), dj: l('DJ', 'DJ'), producer: l('Produção', 'Producer'), mc: l('MC', 'MC'), strings: l('Cordas', 'Strings'), synthetic: l('IA', 'AI'),
  harmonica: l('Gaita', 'Harmonica'), piano: l('Piano', 'Piano'), rhythm: l('Guitarra base', 'Rhythm guitar'),
};
export const roleName29 = (r: string): string => tx(ROLE_L[r] ?? l(r, r));

// ---------------------------------------------------------------- slug

export const slug29 = (name: string): string => canonKey(name).replace(/\s+/g, '-') || name.toLowerCase();

// ---------------------------------------------------------------- catálogo estático (dados reais)

export interface RArt29 {
  slug: string; n: string; g: string; c: string; d: number; f?: number; e?: number; t: 1 | 2 | 3; cn: string;
  b?: number; x?: number; r?: RealRole; m?: RealMember[]; al?: RealRelease[]; rj?: [number, number?][]; exact?: false; z?: number;
}
export interface RPerAct29 { slug: string; per: RealPeriod[]; role: RealRole; solo: boolean }
export interface RPer29 { slug: string; n: string; b?: number; x?: number; role: RealRole; acts: RPerAct29[] }
interface RCat29 { arts: RArt29[]; artBy: Map<string, RArt29>; pers: RPer29[]; perBy: Map<string, RPer29> }
let RCAT: RCat29 | null = null;

/** Todos os artistas reais (REAL_ALL + os 100 clássicos do catálogo) e as pessoas que passaram por eles. */
export function realCat29(): RCat29 {
  if (RCAT) return RCAT;
  const arts: RArt29[] = [];
  const artBy = new Map<string, RArt29>();
  const add = (a: RArt29) => { if (artBy.has(a.slug)) return; artBy.set(a.slug, a); arts.push(a); };
  for (const [no, ex] of Object.entries(REAL_CLASSIC)) {
    const ca = CATALOG_ACTS.find((x) => x.no === +no);
    const n = REAL_ACTS[+no]?.name ?? ca?.name;
    if (!n || !ca) continue;
    add({ slug: slug29(n), n, g: ca.genre, c: ca.city, d: ex.d ?? ca.debut, f: ex.f, e: ex.e, t: 1, cn: countryOfCity(ca.city) ?? '', b: ex.b, x: ex.x, r: ex.r, m: ex.m, al: ex.al, rj: ex.rj });
  }
  for (const a of REAL_ALL) add({ slug: slug29(a.n), n: a.n, g: a.g, c: a.c, d: a.d, f: a.f, e: a.e, t: a.t, cn: a.cn, b: a.b, x: a.x, r: a.r, m: a.m, al: a.al, rj: a.rj, exact: a.exact, z: a.z });
  const pers: RPer29[] = [];
  const perBy = new Map<string, RPer29>();
  const person = (n: string, b: number | undefined, x: number | undefined, role: RealRole): RPer29 => {
    const k = slug29(n);
    let p = perBy.get(k);
    if (!p) { p = { slug: k, n, b, x, role, acts: [] }; perBy.set(k, p); pers.push(p); }
    p.b ??= b; p.x ??= x;
    return p;
  };
  for (const a of arts) {
    if (!a.m?.length) {
      const p = person(a.n, a.b, a.x, a.r ?? 'vocal');
      p.acts.push({ slug: a.slug, per: [[a.f ?? a.d, a.e]], role: a.r ?? 'vocal', solo: true });
    } else for (const m of a.m) {
      const p = person(m[0], m[2], m[3], m[1]);
      if (!p.acts.some((x) => x.slug === a.slug)) p.acts.push({ slug: a.slug, per: periodsOf(m).map(([x, y]) => [x ?? a.f ?? a.d, y ?? a.e] as RealPeriod), role: m[1], solo: false });
    }
  }
  for (const p of pers) p.acts.sort((x, y) => (x.per[0]?.[0] ?? 0) - (y.per[0]?.[0] ?? 0));
  pers.sort((x, y) => x.n.localeCompare(y.n));
  arts.sort((x, y) => x.n.localeCompare(y.n));
  return (RCAT = { arts, artBy, pers, perBy });
}

/** Selos do catálogo (com o nome real quando houver). */
export interface SLabel29 { id: string; name: string; real?: string; city: string; founded: number; focus: string[]; arch: L }
let SLAB: SLabel29[] | null = null;
export function staticLabels29(): SLabel29[] {
  return (SLAB ??= [...CATALOG_LABELS, ...EXTRA_LABELS].filter((x, i, xs) => xs.findIndex((y) => y.id === x.id) === i)
    .map((x) => ({ id: x.id, name: x.name, real: REAL_LABELS[x.id], city: x.city, founded: x.founded, focus: x.focus, arch: x.archetype })));
}

/** Texto livre (bio, história, descrição) que cita um ano depois da partida: escondido sem "Revelar história real". */
export function futureText29(c: W29, text: string): boolean {
  if (!c.s || c.reveal) return false;
  const y = c.s.year;
  return [...text.matchAll(/\b(1[89]\d\d|20\d\d)\b/g)].some((m) => +m[1] > y);
}
/** Parágrafo seguro: o texto, ou um aviso + spoiler quando cita o futuro. */
export function safeP29(c: W29, text: string): Block29[] {
  return futureText29(c, text)
    ? [{ k: 'p', x: [T('(Este texto cita fatos posteriores ao ano da partida.)', '(This text mentions facts after the run\'s year.)')] }, { k: 'spoiler', n: 1 }]
    : [{ k: 'p', x: [text] }];
}
