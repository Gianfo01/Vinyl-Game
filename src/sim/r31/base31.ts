// R31 · onda 1 (EDT) — EDITOR DE BASE (estilo pré-editor do Football Manager): modelo, validação, junção e troca.
//
// Uma base é SÓ A DIFERENÇA da base original (`BaseData31`): artistas e bandas do catálogo (`CATALOG_ACTS`, chave =
// número do catálogo), gravadoras (`CATALOG_LABELS`, chave = id), cidades (`CITIES`: nome, cenas, peso) e relíquias reais
// (`RELICS17`). Entrada `null` remove; chave nova cria. A partida guarda a base inteira em `config.base31` (nome +
// diferenças): a mesma base + a mesma semente dão a mesma partida, e a partida fica marcada com o nome da base.
//
//   validateBase31(b)  → { ok, errors[] }   (datas impossíveis, cidade/gênero que não existe, nome repetido…)
//   mergeBases31('Pacote', a, b)            (a última ganha, campo a campo)
//   baseJson31(b) / baseCode31(b)           (arquivo .json / código compartilhável "M31B1:…" comprimido em base64)
//   importBase31(texto)                     → { ok, base, errors, summary }  (aceita JSON ou código)
//   applyBase31(b | undefined)              (restaura a original e aplica; createGame chama pelo gancho BASE31)
//
// Sistemas novos com dado de base registram uma seção com `registerBaseSection31` (briefing, regra 10).

import { CATALOG_ACTS, CATALOG_LABELS, type CatalogAct, type CatalogLabel } from '../../data/catalog';
import { CITIES, cityById, genreById, l, type L } from '../../data/world';
import { RELICS17, type RelicDef17 } from '../relics17';
import { RELIC_KIND, type RelicKind } from '../sys/relics9';
import { registerSimHook } from '../ext4';
import type { GameState, RunConfig } from '../types';
import { fmtL } from '../util';
import { BASE31 } from './basehook';

export const BASE_V31 = 1;
export const GAME_V31 = '31.1';
export const BASE_CODE_PREFIX31 = 'M31B1:';

export type ActPatch31 = Partial<Pick<CatalogAct, 'name' | 'genre' | 'debut' | 'city' | 'members'>>;
export type LabelPatch31 = Partial<Pick<CatalogLabel, 'name' | 'city' | 'founded' | 'family' | 'focus' | 'archetype'>>;
export interface CityPatch31 { name?: L; scenes?: string[]; w?: number }
export type RelicPatch31 = Partial<Pick<RelicDef17, 'name' | 'owner' | 'year' | 'month' | 'kind' | 'value' | 'story' | 'location'>>;

export interface BaseData31 {
  v: number;
  /** versão do jogo em que a base foi feita */
  game: string;
  name: string;
  acts: Record<string, ActPatch31 | null>;
  labels: Record<string, LabelPatch31 | null>;
  cities: Record<string, CityPatch31>;
  relics: Record<string, RelicPatch31 | null>;
}
export interface BaseRef31 { name: string; data: BaseData31 }

export const emptyBase31 = (name: string): BaseData31 => ({ v: BASE_V31, game: GAME_V31, name, acts: {}, labels: {}, cities: {}, relics: {} });

// ---------------------------------------------------------------- base original (retrato tirado na 1ª aplicação)

interface Orig { acts: [CatalogAct, CatalogAct][]; labels: [CatalogLabel, CatalogLabel][]; cities: Map<string, CityPatch31>; relics: [RelicDef17, RelicDef17][] }
let ORIG: Orig | null = null;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
function orig(): Orig {
  return ORIG ??= {
    acts: CATALOG_ACTS.map((a) => [a, clone(a)]),
    labels: CATALOG_LABELS.map((a) => [a, clone(a)]),
    cities: new Map(CITIES.map((c) => [c.id, clone({ name: c.name, scenes: c.scenes, w: c.w })])),
    relics: RELICS17.map((a) => [a, clone(a)]),
  };
}
// ---------------------------------------------------------------- entrada não confiável (arquivo, código, save, navegador)
// Tudo que vem de fora passa por `cleanBase31`: chaves proibidas recusadas, só os campos conhecidos com o tipo certo são
// copiados (objetos novos, chaves em ordem) — nada de `Object.assign` com o objeto lido. Consultas em tabelas do jogo
// usam `Object.hasOwn` (`constructor`/`toString` não passam por "existe").
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const own = (o: object | null | undefined, k: unknown): boolean => !!o && typeof k === 'string' && Object.hasOwn(o, k);
const isRec = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const hasCity = (id: unknown): id is string => own(cityById, id);
const hasGenre = (id: unknown): id is string => own(genreById, id);
const hasRelicKind = (k: unknown): k is RelicKind => own(RELIC_KIND, k);
const numSort = (a: string, b: string): number => Number(a) - Number(b);
const strSort = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
/** Chaves em ordem canônica (artistas por número, o resto em ordem de texto): a mesma base dá o mesmo mundo. */
const keysOf = (rec: Record<string, unknown>, part: 'acts' | 'labels' | 'cities' | 'relics'): string[] => Object.keys(rec).sort(part === 'acts' ? numSort : strSort);
const KEY_RX = { acts: /^[1-9]\d{0,8}$/, labels: /^[A-Za-z0-9_-]{1,40}$/, cities: /^[A-Za-z0-9_-]{1,40}$/, relics: /^[A-Za-z0-9_-]{1,60}$/ };

type FieldT = 'str' | 'num' | 'L' | 'strs';
const FIELDS: Record<'acts' | 'labels' | 'cities' | 'relics', Record<string, FieldT>> = {
  acts: { name: 'str', genre: 'str', debut: 'num', city: 'str', members: 'num' },
  labels: { name: 'str', city: 'str', founded: 'num', family: 'str', focus: 'strs', archetype: 'L' },
  cities: { name: 'L', scenes: 'strs', w: 'num' },
  relics: { name: 'L', owner: 'str', year: 'num', month: 'num', kind: 'str', value: 'num', story: 'L', location: 'L' },
};
const MAX_STR = 400, MAX_LIST = 40;
function field(t: FieldT, v: unknown): unknown {
  if (t === 'str') return typeof v === 'string' && v.length <= MAX_STR ? v : undefined;
  if (t === 'num') return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  if (t === 'strs') return Array.isArray(v) && v.length <= MAX_LIST && v.every((x) => typeof x === 'string' && x.length <= MAX_STR) ? [...v] : undefined;
  if (isRec(v) && typeof v.pt === 'string' && typeof v.en === 'string' && v.pt.length <= MAX_STR * 4 && v.en.length <= MAX_STR * 4) return { pt: v.pt, en: v.en };
  return undefined;
}
/** Dado de seção extra: cópia JSON sem chaves proibidas. */
function plain(x: unknown, depth = 0): unknown {
  if (depth > 12) return undefined;
  if (Array.isArray(x)) return x.map((y) => plain(y, depth + 1));
  if (isRec(x)) { const o: Record<string, unknown> = {}; for (const k of Object.keys(x).sort(strSort)) if (!BAD_KEYS.has(k)) o[k] = plain(x[k], depth + 1); return o; }
  return typeof x === 'number' ? (Number.isFinite(x) ? x : undefined) : typeof x === 'string' || typeof x === 'boolean' || x === null ? x : undefined;
}

export interface BaseClean31 { base?: BaseData31; errors: L[] }
/** Lê uma base de fonte não confiável: devolve uma cópia canônica só com o que é permitido (entradas tortas ficam de
 *  fora e viram `errors`; sem `base` quando nem a forma geral é de base). */
export function cleanBase31(raw: unknown): BaseClean31 {
  const errors: L[] = [];
  const e = (pt: string, en: string, p: Record<string, string | number> = {}) => errors.push(fmtL(l(pt, en), p));
  if (!isRec(raw)) return { errors: [l('Isto não é uma base do Masters.', 'This is not a Masters database.')] };
  if (typeof raw.v !== 'number' || !isRec(raw.acts) || !isRec(raw.labels) || !isRec(raw.cities) || !isRec(raw.relics)) return { errors: [l('Isto não é uma base do Masters (faltam partes).', 'This is not a Masters database (parts are missing).')] };
  if (raw.v > BASE_V31) return { errors: [l('Base feita numa versão mais nova do jogo: atualize para usá-la.', 'Database made with a newer game version: update to use it.')] };
  const out = emptyBase31(typeof raw.name === 'string' ? raw.name.slice(0, 80) : '');
  out.v = raw.v;
  out.game = typeof raw.game === 'string' && raw.game.length <= 20 ? raw.game : GAME_V31;
  for (const part of ['acts', 'labels', 'cities', 'relics'] as const) {
    const src = raw[part] as Record<string, unknown>;
    const dst = out[part] as Record<string, object | null>;
    const keys = keysOf(src, part);
    if (keys.length > 5000) { e('Base grande demais.', 'Database too large.'); break; }
    for (const k of keys) {
      if (BAD_KEYS.has(k) || !KEY_RX[part].test(k)) { e('Identificador proibido ou inválido: "{k}".', 'Forbidden or invalid identifier: "{k}".', { k: k.slice(0, 40) }); continue; }
      const p = src[k];
      if (p === null && part !== 'cities') { dst[k] = null; continue; }
      if (!isRec(p)) { e('"{k}": a entrada precisa ser uma lista de campos.', '"{k}": the entry must be a set of fields.', { k }); continue; }
      const o: Record<string, unknown> = {};
      for (const f of Object.keys(FIELDS[part]).sort(strSort)) {
        if (!Object.hasOwn(p, f)) continue;
        const v = field(FIELDS[part][f], p[f]);
        if (v === undefined) e('"{k}": o campo "{f}" tem um valor inválido.', '"{k}": field "{f}" has an invalid value.', { k, f });
        else o[f] = v;
      }
      dst[k] = o;
    }
  }
  if (isRec(raw.ext) && SECTIONS.length) {
    const ext: Record<string, unknown> = {};
    for (const sec of SECTIONS) if (Object.hasOwn(raw.ext, sec.id) && !BAD_KEYS.has(sec.id)) ext[sec.id] = plain(raw.ext[sec.id]);
    if (Object.keys(ext).length) (out as BaseData31 & { ext?: Record<string, unknown> }).ext = ext;
  }
  // entradas tortas ficam de fora (a cópia é segura); quem precisa da base inteira confere `errors` vazio
  return { base: out, errors };
}

const reset = <T extends object>(obj: T, snap: T): T => { for (const k of Object.keys(obj)) delete (obj as Record<string, unknown>)[k]; return Object.assign(obj, clone(snap)); };

/** Listas da base original (cópias; para o editor mostrar). */
export const origActs31 = (): CatalogAct[] => orig().acts.map(([, s]) => clone(s));
export const origLabels31 = (): CatalogLabel[] => orig().labels.map(([, s]) => clone(s));
export const origRelics31 = (): RelicDef17[] => orig().relics.map(([, s]) => clone(s));
export const origCity31 = (id: string): CityPatch31 | undefined => { const c = orig().cities.get(id); return c ? clone(c) : undefined; };

// ---------------------------------------------------------------- resolução (original + diferenças)

export function resolvedActs31(b: BaseData31): (CatalogAct & { edited?: boolean; added?: boolean })[] {
  const out: (CatalogAct & { edited?: boolean; added?: boolean })[] = [];
  for (const a of origActs31()) {
    const p = own(b.acts, String(a.no)) ? b.acts[String(a.no)] : undefined;
    if (p === null) continue;
    out.push(p ? { ...a, ...p, edited: true } : a);
  }
  for (const [k, p] of Object.entries(b.acts)) if (p && !orig().acts.some(([, a]) => String(a.no) === k)) out.push({ no: Number(k), name: '', genre: '', debut: 0, city: '', members: 1, ...p, added: true });
  return out;
}
export function resolvedLabels31(b: BaseData31): (CatalogLabel & { edited?: boolean; added?: boolean })[] {
  const out: (CatalogLabel & { edited?: boolean; added?: boolean })[] = [];
  for (const a of origLabels31()) {
    const p = own(b.labels, a.id) ? b.labels[a.id] : undefined;
    if (p === null) continue;
    out.push(p ? { ...a, ...p, edited: true } : a);
  }
  for (const [k, p] of Object.entries(b.labels)) if (p && !orig().labels.some(([, a]) => a.id === k)) out.push({ id: k, name: '', archetype: l('Selo da base editada', 'Edited-base label'), city: '', founded: 0, family: 'B', focus: [], ...p, added: true });
  return out;
}
export function resolvedRelics31(b: BaseData31): (RelicDef17 & { edited?: boolean; added?: boolean })[] {
  const out: (RelicDef17 & { edited?: boolean; added?: boolean })[] = [];
  for (const a of origRelics31()) {
    const p = own(b.relics, a.id) ? b.relics[a.id] : undefined;
    if (p === null) continue;
    out.push(p ? { ...a, ...p, edited: true } : a);
  }
  for (const [k, p] of Object.entries(b.relics)) if (p && !orig().relics.some(([, a]) => a.id === k)) out.push({ id: k, name: l('', ''), owner: '', year: 0, month: 0, kind: 'guitar', value: 0, story: l('', ''), location: l('', ''), ...p, added: true });
  return out;
}
/** Próximo número livre para um artista novo da base. */
export const nextActNo31 = (b: BaseData31): number => Math.max(5000, ...resolvedActs31(b).map((a) => a.no)) + 1;

// ---------------------------------------------------------------- validação

const YEAR_MIN = 1850, YEAR_MAX = 2045;
export interface BaseCheck31 { ok: boolean; errors: L[] }

export function validateBase31(b: unknown): BaseCheck31 {
  let c: BaseClean31;
  try { c = cleanBase31(b); } catch { return { ok: false, errors: [l('Isto não é uma base do Masters.', 'This is not a Masters database.')] }; }
  if (!c.base) return { ok: false, errors: c.errors };
  const errors: L[] = [...c.errors];
  const e = (pt: string, en: string, p: Record<string, string | number> = {}) => errors.push(fmtL(l(pt, en), p));
  const B = c.base;
  if (!String(B.name ?? '').trim()) e('A base precisa de um nome.', 'The database needs a name.');
  const yr = (y: unknown) => typeof y === 'number' && Number.isFinite(y) && y >= YEAR_MIN && y <= YEAR_MAX;
  // artistas
  const acts = resolvedActs31(B);
  const seen = new Map<string, number>();
  for (const a of acts) {
    const touched = !!(a.edited || a.added);
    const nm = String(a.name ?? '').trim();
    if (touched && !nm) e('Artista nº {n}: falta o nome.', 'Act no. {n}: name missing.', { n: a.no });
    if (touched && !hasGenre(a.genre)) e('{a}: o gênero "{g}" não existe.', '{a}: genre "{g}" does not exist.', { a: nm || `nº ${a.no}`, g: String(a.genre ?? '') });
    if (touched && !hasCity(a.city)) e('{a}: a cidade "{c}" não existe.', '{a}: city "{c}" does not exist.', { a: nm || `nº ${a.no}`, c: String(a.city ?? '') });
    if (touched && !yr(a.debut)) e('{a}: estreia em {y} é impossível (use {lo} a {hi}).', '{a}: debut in {y} is impossible (use {lo} to {hi}).', { a: nm || `nº ${a.no}`, y: String(a.debut), lo: YEAR_MIN, hi: YEAR_MAX });
    if (touched && hasGenre(a.genre) && yr(a.debut) && a.debut < genreById[a.genre].born - 5) e('{a}: estreia em {y}, antes de o gênero existir ({b}).', '{a}: debuts in {y}, before the genre existed ({b}).', { a: nm, y: a.debut, b: genreById[a.genre].born });
    if (touched && !(Number.isInteger(a.members) && a.members >= 1 && a.members <= 12)) e('{a}: número de integrantes impossível ({m}).', '{a}: impossible member count ({m}).', { a: nm || `nº ${a.no}`, m: String(a.members) });
    const k = nm.toLowerCase();
    if (k) { const prev = seen.get(k); if (prev !== undefined && (touched || acts[prev].edited || acts[prev].added)) e('Nome repetido entre artistas: "{a}".', 'Duplicate act name: "{a}".', { a: nm }); else seen.set(k, acts.indexOf(a)); }
  }
  // gravadoras
  const labs = resolvedLabels31(B);
  const seenL = new Set<string>();
  for (const lb of labs) {
    const touched = !!(lb.edited || lb.added);
    const nm = String(lb.name ?? '').trim();
    if (touched && !nm) e('Gravadora "{i}": falta o nome.', 'Label "{i}": name missing.', { i: lb.id });
    if (touched && !hasCity(lb.city)) e('{a}: a cidade "{c}" não existe.', '{a}: city "{c}" does not exist.', { a: nm || lb.id, c: String(lb.city ?? '') });
    if (touched && !yr(lb.founded)) e('{a}: fundação em {y} é impossível.', '{a}: founded in {y} is impossible.', { a: nm || lb.id, y: String(lb.founded) });
    if (touched && !['A', 'B', 'C', 'D'].includes(lb.family)) e('{a}: política "{f}" não existe (A, B, C ou D).', '{a}: policy "{f}" does not exist (A, B, C or D).', { a: nm || lb.id, f: String(lb.family) });
    if (touched && !/^[a-z0-9_]{2,32}$/.test(lb.id)) e('Gravadora: identificador "{i}" inválido.', 'Label: invalid identifier "{i}".', { i: lb.id });
    const k = nm.toLowerCase();
    if (k && seenL.has(k) && touched) e('Nome repetido entre gravadoras: "{a}".', 'Duplicate label name: "{a}".', { a: nm });
    seenL.add(k);
  }
  // cidades
  for (const [id, c] of Object.entries(B.cities)) {
    if (!hasCity(id)) { e('A cidade "{c}" não existe (o editor só muda cidades que já existem).', 'City "{c}" does not exist (the editor only changes existing cities).', { c: id }); continue; }
    if (c.name && (!String(c.name.pt ?? '').trim() || !String(c.name.en ?? '').trim())) e('{c}: o nome não pode ficar vazio.', '{c}: the name cannot be empty.', { c: cityById[id].name.pt });
    for (const g of c.scenes ?? []) if (!hasGenre(g)) e('{c}: o gênero "{g}" não existe.', '{c}: genre "{g}" does not exist.', { c: cityById[id].name.pt, g });
    if (c.w !== undefined && !(typeof c.w === 'number' && c.w >= 0 && c.w <= 10)) e('{c}: peso impossível (0 a 10).', '{c}: impossible weight (0 to 10).', { c: cityById[id].name.pt });
  }
  // relíquias
  for (const r of resolvedRelics31(B)) {
    if (!r.edited && !r.added) continue;
    const nm = String(r.name?.pt ?? '').trim();
    if (!nm) e('Relíquia "{i}": falta o nome.', 'Relic "{i}": name missing.', { i: r.id });
    if (!yr(r.year)) e('{r}: ano {y} impossível.', '{r}: impossible year {y}.', { r: nm || r.id, y: String(r.year) });
    if (!hasRelicKind(r.kind)) e('{r}: tipo "{k}" não existe.', '{r}: kind "{k}" does not exist.', { r: nm || r.id, k: String(r.kind) });
    if (!(typeof r.value === 'number' && r.value >= 0)) e('{r}: valor impossível.', '{r}: impossible value.', { r: nm || r.id });
  }
  for (const f of SECTIONS) for (const er of f.validate?.(B) ?? []) errors.push(er);
  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------- seções extras (sistemas futuros)

export interface BaseSection31 { id: string; label: L; validate?: (b: BaseData31) => L[]; apply?: (b: BaseData31 | undefined) => void }
const SECTIONS: BaseSection31[] = [];
/** Sistemas com dado de base registram validação/aplicação próprias (os dados ficam em `b.ext[id]`). */
export function registerBaseSection31(sec: BaseSection31): void { const i = SECTIONS.findIndex((x) => x.id === sec.id); if (i >= 0) SECTIONS[i] = sec; else SECTIONS.push(sec); }

// ---------------------------------------------------------------- aplicar

let applied: string | null = null;
let appliedRef: unknown = undefined;
/** Restaura a base original e aplica `b` (ou só restaura). Idempotente: a mesma base (mesmas diferenças, qualquer ordem
 *  de chaves) não reaplica. `b` pode vir de fora (save, arquivo): passa por `cleanBase31`; inválida = só a original. */
export function applyBase31(raw: BaseData31 | undefined): void {
  if (raw !== undefined && raw === appliedRef && applied !== null) return;
  let b: BaseData31 | undefined;
  try { b = raw === undefined ? undefined : cleanBase31(raw).base; } catch { b = undefined; }
  const key = b ? baseJson31(b) : '';
  appliedRef = raw;
  if (applied === key) return;
  const o = orig();
  // restaura no lugar (outros módulos guardam referências aos objetos)
  CATALOG_ACTS.length = 0; for (const [obj, snap] of o.acts) CATALOG_ACTS.push(reset(obj, snap));
  CATALOG_LABELS.length = 0; for (const [obj, snap] of o.labels) CATALOG_LABELS.push(reset(obj, snap));
  RELICS17.length = 0; for (const [obj, snap] of o.relics) RELICS17.push(reset(obj, snap));
  for (const c of CITIES) { const sn = o.cities.get(c.id); if (sn) { c.name = clone(sn.name!); c.scenes = clone(sn.scenes!); if (sn.w === undefined) delete c.w; else c.w = sn.w; } }
  if (b) {
    // ordem canônica das chaves (a base limpa já vem ordenada; ordenar de novo não custa e não depende disso)
    for (const k of keysOf(b.acts, 'acts')) {
      const p = b.acts[k];
      const i = CATALOG_ACTS.findIndex((a) => String(a.no) === k);
      if (p === null) { if (i >= 0) CATALOG_ACTS.splice(i, 1); }
      else if (i >= 0) Object.assign(CATALOG_ACTS[i], clone(p));
      else CATALOG_ACTS.push({ no: Number(k), name: '', genre: 'pop', debut: 1960, city: 'new_york', members: 1, ...clone(p) });
    }
    for (const k of keysOf(b.labels, 'labels')) {
      const p = b.labels[k];
      const i = CATALOG_LABELS.findIndex((a) => a.id === k);
      if (p === null) { if (i >= 0) CATALOG_LABELS.splice(i, 1); }
      else if (i >= 0) Object.assign(CATALOG_LABELS[i], clone(p));
      else CATALOG_LABELS.push({ id: k, name: k, archetype: l('Selo da base editada', 'Edited-base label'), city: 'new_york', founded: 1960, family: 'B', focus: [], ...clone(p) });
    }
    for (const k of keysOf(b.cities, 'cities')) {
      if (!hasCity(k)) continue;
      const c = cityById[k], p = b.cities[k];
      if (p.name) c.name = clone(p.name); if (p.scenes) c.scenes = clone(p.scenes); if (p.w !== undefined) c.w = p.w;
    }
    for (const k of keysOf(b.relics, 'relics')) {
      const p = b.relics[k];
      const i = RELICS17.findIndex((a) => a.id === k);
      if (p === null) { if (i >= 0) RELICS17.splice(i, 1); }
      else if (i >= 0) Object.assign(RELICS17[i], clone(p));
      else RELICS17.push({ id: k, name: l(k, k), owner: '', year: 1960, month: 0, kind: 'guitar', value: 100, story: l('', ''), location: l('', ''), ...clone(p) });
    }
  }
  for (const f of SECTIONS) f.apply?.(b);
  applied = key;
}
/** Partida carregada (save, desfazer, troca de partida): a base dela vale — ou a original, se ela não tem base. */
export const ensureBase31 = (s: Pick<GameState, 'config'>): void => applyBase31(s.config?.base31?.data);
BASE31.apply = (cfg: RunConfig) => {
  // forma canônica em config.base31 (a mesma base com chaves em outra ordem gera e guarda o mesmo)
  if (cfg.base31) { let c: BaseData31 | undefined; try { c = cleanBase31(cfg.base31.data).base; } catch { c = undefined; } if (c) cfg.base31 = { name: String(cfg.base31.name ?? c.name), data: c }; else delete cfg.base31; }
  applyBase31(cfg.base31?.data);
};

/** Nomes editados valem por cima do interruptor "Nomes e obras reais" (o mundo pode ter trocado o nome do catálogo). */
registerSimHook('newgame', 'base31', (s: GameState) => {
  const b = s.config.base31?.data;
  if (!b) return;
  const act = (no: number | undefined) => (no !== undefined && own(b.acts, String(no)) ? b.acts[String(no)] : undefined);
  for (const a of Object.values(s.acts)) { const p = act(a.catalogNo); if (p?.name) a.name = p.name; }
  for (const u of s.upcoming) { const p = act(u.no); if (p?.name) u.name = p.name; }
  for (const lb of Object.values(s.labels)) { const p = own(b.labels, lb.id) ? b.labels[lb.id] : undefined; if (p?.name) lb.name = p.name; }
});

// ---------------------------------------------------------------- juntar, resumir, exportar e importar

/** Junta bases: a última ganha, campo a campo (remover vence edição anterior; edição posterior recria). */
export function mergeBases31(name: string, ...bs: BaseData31[]): BaseData31 {
  const out = emptyBase31(name);
  for (const b of bs) {
    for (const part of ['acts', 'labels', 'relics'] as const) for (const [k, p] of Object.entries(b[part] as Record<string, object | null>)) {
      const cur = (out[part] as Record<string, object | null>)[k];
      (out[part] as Record<string, object | null>)[k] = p === null ? null : { ...(cur ?? {}), ...clone(p) };
    }
    for (const [k, p] of Object.entries(b.cities)) out.cities[k] = { ...(out.cities[k] ?? {}), ...clone(p) };
  }
  return out;
}

/** Resumo do que a base muda (antes de aplicar). */
export function summarizeBase31(b: BaseData31): L {
  const cnt = (rec: Record<string, object | null>, origIds: Set<string>) => {
    let ed = 0, add = 0, del = 0;
    for (const [k, p] of Object.entries(rec)) { if (p === null) del++; else if (origIds.has(k)) ed++; else add++; }
    return { ed, add, del };
  };
  const a = cnt(b.acts, new Set(orig().acts.map(([, x]) => String(x.no))));
  const lb = cnt(b.labels, new Set(orig().labels.map(([, x]) => x.id)));
  const r = cnt(b.relics, new Set(orig().relics.map(([, x]) => x.id)));
  const c = Object.keys(b.cities).length;
  const part = (n: { ed: number; add: number; del: number }, pt: string, en: string): L | null =>
    n.ed + n.add + n.del ? fmtL(l(`${pt}: {e} mudados, {a} novos, {d} removidos`, `${en}: {e} changed, {a} new, {d} removed`), { e: n.ed, a: n.add, d: n.del }) : null;
  const parts = [part(a, 'Artistas', 'Acts'), part(lb, 'Gravadoras', 'Labels'), part(r, 'Relíquias', 'Relics'), c ? fmtL(l('Cidades: {n} mudadas', 'Cities: {n} changed'), { n: c }) : null].filter((x): x is L => !!x);
  const ver = b.game !== GAME_V31 ? fmtL(l(' · feita na versão {v}', ' · made with version {v}'), { v: b.game }) : l('', '');
  if (!parts.length) return fmtL(l('Igual à base original{v}.', 'Same as the original database{v}.'), { v: ver });
  return { pt: parts.map((x) => x.pt).join(' · ') + ver.pt, en: parts.map((x) => x.en).join(' · ') + ver.en };
}

/** JSON estável (chaves ordenadas) — o arquivo .json e a comparação de bases. */
export function baseJson31(b: BaseData31): string {
  const sort = (x: unknown): unknown => (Array.isArray(x) ? x.map(sort) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sort((x as Record<string, unknown>)[k])])) : x);
  return JSON.stringify(sort(b));
}

// LZW sobre bytes UTF-8 (síncrono, sem dependências) + base64. Dicionário cresce até 65536 códigos (16 bits) e para.
function lzw(bytes: Uint8Array): Uint8Array {
  const out: number[] = [];
  const dict = new Map<string, number>();
  for (let i = 0; i < 256; i++) dict.set(String.fromCharCode(i), i);
  let w = '';
  for (const b of bytes) {
    const wc = w + String.fromCharCode(b);
    if (dict.has(wc)) { w = wc; continue; }
    const code = dict.get(w)!; out.push(code >> 8, code & 255);
    if (dict.size < 65536) dict.set(wc, dict.size);
    w = String.fromCharCode(b);
  }
  if (w) { const code = dict.get(w)!; out.push(code >> 8, code & 255); }
  return Uint8Array.from(out);
}
/** Teto do texto expandido (e do texto colado): uma base de verdade fica muito abaixo disso. */
export const MAX_TEXT31 = 5 * 1024 * 1024;
function unlzw(data: Uint8Array, max = MAX_TEXT31): Uint8Array {
  if (data.length % 2) throw new Error('lzw');
  const dict: number[][] = [];
  for (let i = 0; i < 256; i++) dict.push([i]);
  const out: number[] = [];
  let w: number[] | null = null;
  for (let i = 0; i < data.length; i += 2) {
    const k = (data[i] << 8) | data[i + 1];
    let entry: number[];
    if (k < dict.length) entry = dict[k];
    else if (w && k === dict.length) entry = [...w, w[0]];
    else throw new Error('lzw');
    if (out.length + entry.length > max) throw new Error('lzw-size');
    for (const x of entry) out.push(x);
    if (w && dict.length < 65536) dict.push([...w, entry[0]]);
    w = entry;
  }
  return Uint8Array.from(out);
}
const toB64 = (u: Uint8Array): string => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = (t: string): Uint8Array => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));

/** Código para copiar e colar: "M31B1:" + base64(LZW(JSON)). */
export function baseCode31(b: BaseData31): string {
  return BASE_CODE_PREFIX31 + toB64(lzw(new TextEncoder().encode(baseJson31(b))));
}

export interface BaseImport31 { ok: boolean; base?: BaseData31; errors: L[]; summary?: L }
/** Lê um arquivo .json ou um código "M31B1:…", valida e resume. Base inválida é recusada com as mensagens. */
export function importBase31(text: string): BaseImport31 {
  const tx = String(text ?? '').trim();
  let raw: unknown;
  try {
    if (tx.length > MAX_TEXT31) return { ok: false, errors: [l('O código ou arquivo é grande demais para ser uma base.', 'The code or file is too large to be a database.')] };
    if (tx.startsWith(BASE_CODE_PREFIX31)) raw = JSON.parse(new TextDecoder().decode(unlzw(fromB64(tx.slice(BASE_CODE_PREFIX31.length).replace(/\s+/g, '')))));
    else if (tx.startsWith('{')) raw = JSON.parse(tx);
    else return { ok: false, errors: [l('Texto não reconhecido: cole um código que começa com M31B1: ou um arquivo .json de base.', 'Unrecognised text: paste a code starting with M31B1: or a database .json file.')] };
  } catch (er) {
    if ((er as Error)?.message === 'lzw-size') return { ok: false, errors: [l('O código expande para mais de 5 MB: grande demais para ser uma base.', 'The code expands to more than 5 MB: too large to be a database.')] };
    return { ok: false, errors: [l('O código ou arquivo está corrompido (talvez tenha sido cortado ao copiar).', 'The code or file is corrupted (maybe it was cut while copying).')] };
  }
  try {
    const chk = validateBase31(raw);
    if (!chk.ok) return { ok: false, errors: chk.errors };
    const base = cleanBase31(raw).base!;
    return { ok: true, base, errors: [], summary: summarizeBase31(base) };
  } catch {
    return { ok: false, errors: [l('A base não pôde ser lida (formato inesperado).', 'The database could not be read (unexpected format).')] };
  }
}

/** Mesma base (mesmas diferenças), ignorando a ordem das chaves. */
export const sameBase31 = (a: BaseData31, b: BaseData31): boolean => baseJson31(a) === baseJson31(b);
