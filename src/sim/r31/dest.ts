// R31 · W0-CON — DESTINO. O caminho para qualquer ação: área, aba, intenção, pessoa (ou ato), país, época e carreira.
// `destKey` é a forma canônica e estável (mesma entrada → mesma chave, campos em ordem fixa) usada por voltar/avançar,
// fixados, histórico e pela pendência única (atalhos). `parseDestKey(destKey(d))` devolve `d`.
// `resolveDest` confere o destino contra o estado: o que não existe mais (pessoa morta e removida, carreira inexistente,
// país desconhecido) cai fora com o motivo, e a área volta para a sede quando não é conhecida. Só leitura.
//
// Áreas: a simulação não importa a interface; as áreas base estão aqui e a interface registra as extras
// (`registerDestArea`) quando registra as suas (onda 1).

import { allCountryCodes } from '../../data/geo';
import { careerDef, careerDefs } from '../sys/careers12';
import type { GameState } from '../types';

export interface Dest {
  /** área (lugar) do jogo: 'desk', 'artists', 'market'… */
  area: string;
  /** aba/sub-lugar dentro da área */
  tab?: string;
  /** o que se quer fazer ao chegar ('sign', 'renew', 'answer'…) */
  intent?: string;
  /** pessoa selecionada: id de `s.persons` (com ou sem 'p:') ou chave de ficha ('l:', 'e:', 'pd:'…) */
  personId?: string;
  /** ato selecionado (atalho comum; não faz parte da lista mínima do plano, mas é a seleção mais usada) */
  actId?: string;
  /** país ISO alfa-3 */
  country?: string;
  /** época: ano de referência (1889–2040) */
  era?: number;
  /** carreira (CareerId do careers12) */
  career?: string;
}

/** ordem fixa dos campos na chave */
const FIELDS = ['tab', 'intent', 'personId', 'actId', 'country', 'era', 'career'] as const;
type Field = (typeof FIELDS)[number];
const SHORT: Record<Field, string> = { tab: 't', intent: 'i', personId: 'p', actId: 'a', country: 'c', era: 'e', career: 'k' };
const LONG = Object.fromEntries(Object.entries(SHORT).map(([k, v]) => [v, k])) as Record<string, Field>;

const enc = (v: string): string => encodeURIComponent(v);
/** Chave canônica: `area?t=..&i=..` (só campos presentes, ordem fixa). */
export function destKey(d: Dest): string {
  const parts: string[] = [];
  for (const f of FIELDS) {
    const v = d[f];
    if (v === undefined || v === '') continue;
    parts.push(`${SHORT[f]}=${enc(String(v))}`);
  }
  return parts.length ? `${enc(d.area)}?${parts.join('&')}` : enc(d.area);
}

export function parseDestKey(key: string): Dest {
  const q = key.indexOf('?');
  const d: Dest = { area: decodeURIComponent(q < 0 ? key : key.slice(0, q)) };
  if (q < 0) return d;
  for (const kv of key.slice(q + 1).split('&')) {
    const i = kv.indexOf('=');
    const f = LONG[kv.slice(0, i)];
    if (!f) continue;
    const v = decodeURIComponent(kv.slice(i + 1));
    if (f === 'era') d.era = Number(v);
    else d[f] = v;
  }
  return d;
}

export const sameDest = (a: Dest, b: Dest): boolean => destKey(a) === destKey(b);

// ---------------------------------------------------------------- validação

const AREAS = new Set<string>(['hq', 'desk', 'plan', 'charts', 'artists', 'market', 'media', 'catalog', 'creation', 'studio', 'releases', 'shows', 'world', 'business', 'finance', 'company', 'diary']);
export function registerDestArea(id: string): void { AREAS.add(id); }
/** área base, registrada, ou área própria de uma carreira registrada (careers12) */
export const isDestArea = (id: string): boolean => AREAS.has(id) || careerDefs().some((c) => c.area === id);
export const DEST_HOME = 'hq';
export const ERA_MIN = 1889;
export const ERA_MAX = 2040;

let COUNTRIES: Set<string> | null = null;
const countries = (): Set<string> => (COUNTRIES ??= new Set(allCountryCodes()));

/** prefixos de ficha aceitos sem conferência (a ficha `per13` monta qualquer um deles) */
const KEY_PREFIX = /^(l|e|pd|c|s|o|w|g16|cr|m):/;

export type DestDrop = 'area' | 'personId' | 'actId' | 'country' | 'era' | 'career';
export interface DestResolved { ok: boolean; dest: Dest; dropped: DestDrop[] }

/** Confere o destino contra o estado. `ok` só quando nada precisou cair; `dest` é sempre utilizável. */
export function resolveDest(s: GameState, d: Dest): DestResolved {
  const out: Dest = { ...d };
  const dropped: DestDrop[] = [];
  if (!isDestArea(out.area)) { dropped.push('area'); out.area = DEST_HOME; delete out.tab; delete out.intent; }
  if (out.personId !== undefined) {
    const id = out.personId;
    const okP = id.startsWith('p:') ? !!s.persons[id.slice(2)] : KEY_PREFIX.test(id) ? id.length > id.indexOf(':') + 1 : !!s.persons[id];
    if (!okP) { dropped.push('personId'); delete out.personId; }
  }
  if (out.actId !== undefined && !s.acts[out.actId]) { dropped.push('actId'); delete out.actId; }
  if (out.country !== undefined && !countries().has(out.country)) { dropped.push('country'); delete out.country; }
  if (out.era !== undefined && !(Number.isInteger(out.era) && out.era >= ERA_MIN && out.era <= ERA_MAX)) { dropped.push('era'); delete out.era; }
  if (out.career !== undefined && !careerDef(out.career)) { dropped.push('career'); delete out.career; }
  return { ok: dropped.length === 0, dest: out, dropped };
}
