// Masters 31 (onda 0, W0-OP) — opinião sobre o jogador em FONTE ÚNICA.
//
// Um registro só, `x4.op[chave] = { v, w[] }`, com chave canônica por tipo de pessoa:
//   p:<pessoa>  l:<líder de selo>  c:<crítico>  s:<funcionário>  e:<empresário>  o:<veículo>
//   pd:<produtor>  w:<grupo, ex. w:artists>  … (qualquer chave de per13 vale)
// Escala −100 (ódio) … +100 (devoção). `w[]` guarda os últimos motivos ([ano, mês, delta, texto]).
//
// Transição (onda 31.3 termina): quatro tipos ainda têm um campo nativo que ~45 sistemas escrevem direto
// (`leaders10 L.rel.player`, `critrel.rel`, a lealdade da equipe e `Person.rel[pessoa do jogador]`). Enquanto
// isso, este módulo é o ÚNICO tradutor: `opinionOf` lê o nativo pela tabela NATIVE (na escala −100..100; a
// lealdade da equipe é `50 + op/2`), `opine`/`setOpinion` escrevem no nativo pela mesma tabela e espelham o
// valor em `x4.op[chave].v` junto com o motivo. Ninguém fora daqui deve ler `x4.op` direto nem converter escala.
// O teste `tests/r31-contracts-opinion.test.ts` trava novas escritas nos campos nativos fora deste arquivo.

import { clamp } from '../core/rng';
import type { L } from '../data/world';
import { critRel } from './criticrel';
import { registerExt4 } from './ext4';
import { actsNow27 } from './tickcache27';
import type { GameState } from './types';
import type { Leaders10State } from './sys/leaders10';
import { P, careerOf } from './sys/people/state';

/** Um motivo: [ano, mês (0–11), delta aplicado, texto]. */
export type OpWhy = [number, number, number, L];
export interface OpEntry { v: number; w: OpWhy[] }
export type OpState = Record<string, OpEntry>;

declare module './ext4' { interface Ext4 { op: OpState } }
registerExt4('op', () => ({}));

/** Limites do registro. */
export const OP_MIN = -100;
export const OP_MAX = 100;
/** Quantos motivos cada chave guarda (os mais recentes). */
export const OP_WHY_MAX = 6;
/** Quantas chaves o registro guarda (as mais antigas saem). */
export const OP_KEYS_MAX = 800;

/** Prefixos canônicos (documentação e validação leve). */
export const OP_PREFIX = {
  p: 'pessoa', l: 'líder de selo', c: 'crítico', s: 'funcionário', e: 'empresário', o: 'veículo', pd: 'produtor', w: 'grupo',
} as const;

export function opState(s: GameState): OpState {
  const x = s.x4 as unknown as { op?: OpState };
  return (x.op ??= {});
}

const split = (key: string): [string, string] => { const i = key.indexOf(':'); return i < 0 ? [key, ''] : [key.slice(0, i), key.slice(i + 1)]; };
// Só módulos leves aqui (sem sys/leaders10, sys/life, persona13): opinion.ts é carregado cedo e não pode
// disparar a avaliação dos sistemas grandes no meio de um ciclo de importação.
const meId = (s: GameState): string | undefined => { const id = P(s).owner?.personId; return id && s.persons[id] ? id : undefined; };
const leaders = (s: GameState): Leaders10State => (s as unknown as { x4: { leaders10: Leaders10State } }).x4.leaders10;

// ---------------------------------------------------------------- campos nativos (transição até 31.3)

interface Native {
  /** valor na escala −100..100, ou undefined quando o nativo não tem registro (cai no x4.op) */
  get: (s: GameState, id: string) => number | undefined;
  /** grava o valor (−100..100) no nativo; false quando o alvo não existe */
  set: (s: GameState, id: string, v: number) => boolean;
  /** quanto um gesto mexe neste tipo (críticos se mexem menos) */
  k?: number;
}

const NATIVE: Record<string, Native> = {
  l: {
    get: (s, id) => { const L0 = leaders(s).L[id]; return L0 ? L0.rel.player ?? 0 : undefined; },
    set: (s, id, v) => { const L0 = leaders(s).L[id]; if (!L0) return false; L0.rel.player = v; return true; },
  },
  c: {
    // o nativo do crítico é −50..50 (criticrel.ts): ×2 na leitura, ÷2 na escrita; sem registro = sem opinião
    get: (s, id) => { const v = critRel(s)?.rel[id]; return v === undefined ? undefined : v * 2; },
    set: (s, id, v) => { const cs = critRel(s); if (!cs?.rel) return false; cs.rel[id] = clamp(v / 2, -50, 50); return true; },
    k: 0.6,
  },
  s: {
    // lealdade 0..100 ⇄ opinião −100..100: lealdade = 50 + op/2
    // leitura sem criar a ficha (quem só lê não muda o estado): sem ficha, a lealdade inicial (60)
    get: (s, id) => { const st = s.player.staff.find((x) => x.id === id); return st ? ((P(s).career[st.id]?.loyalty ?? 60) - 50) * 2 : undefined; },
    set: (s, id, v) => { const st = s.player.staff.find((x) => x.id === id); if (!st) return false; careerOf(s, st).loyalty = clamp(50 + v / 2, 0, 100); return true; },
  },
  p: {
    get: (s, id) => { const me = meId(s); const p = s.persons[id]; return p && me && p.rel[me] !== undefined ? p.rel[me] : undefined; },
    set: (s, id, v) => { const me = meId(s); const p = s.persons[id]; if (!p || !me || me === id) return false; p.rel[me] = v; return true; },
  },
};

/** Lealdade (0..100) derivada da opinião: 50 + op/2. */
export const loyaltyOf = (op: number): number => clamp(50 + op / 2, 0, 100);

// ---------------------------------------------------------------- leitura

/** Opinião atual de alguém sobre você (−100..100, arredondada). */
export function opinionOf(s: GameState, key: string): number {
  const [k, id] = split(key);
  const n = NATIVE[k]?.get(s, id);
  if (n !== undefined) return Math.round(n);
  return Math.round(opState(s)[key]?.v ?? 0);
}

/** Existe opinião formada (algum registro, nativo ou do x4.op)? */
export function hasOpinion(s: GameState, key: string): boolean {
  const [k, id] = split(key);
  if (k === 'p' || k === 'c') return NATIVE[k].get(s, id) !== undefined || !!opState(s)[key];
  if (NATIVE[k]) return NATIVE[k].get(s, id) !== undefined;
  return !!opState(s)[key];
}

/** Motivos guardados (mais antigo → mais recente). */
export function opinionWhy(s: GameState, key: string): readonly OpWhy[] {
  return opState(s)[key]?.w ?? [];
}

// ---------------------------------------------------------------- escrita

function entry(s: GameState, key: string): OpEntry {
  const st = opState(s);
  const e = (st[key] ??= { v: 0, w: [] });
  const keys = Object.keys(st);
  if (keys.length > OP_KEYS_MAX) for (const x of keys.slice(0, keys.length - OP_KEYS_MAX)) if (x !== key) delete st[x];
  return e;
}

function write(s: GameState, key: string, v: number): number {
  const [k, id] = split(key);
  const val = clamp(v, OP_MIN, OP_MAX);
  NATIVE[k]?.set(s, id, val);
  const e = entry(s, key);
  e.v = NATIVE[k]?.get(s, id) ?? val;
  return e.v;
}

function addWhy(s: GameState, key: string, d: number, why: L | undefined): void {
  if (!why) return;
  const e = entry(s, key);
  e.w.push([s.year, s.month, d, why]);
  if (e.w.length > OP_WHY_MAX) e.w.splice(0, e.w.length - OP_WHY_MAX);
}

/** Quem não tem opinião: você mesmo. */
const isSelf = (s: GameState, key: string): boolean => key === 'player' || (key.startsWith('p:') && !!s.persons[key.slice(2)]?.isPlayer);

/** Peso da personalidade sobre um gesto (persona13 registra: empatia amplia gestos bons, teimosia os ruins). */
export type OpinionWeight = (s: GameState, key: string, d: number, o: { pol?: boolean }) => number;
/**
 * Registra o peso da personalidade. É uma declaração de função (içada) de propósito: persona13 chama isto no
 * carregamento, possivelmente antes de este módulo terminar de avaliar (ciclo de importação).
 */
export function registerOpinionWeight(fn: OpinionWeight): void { (registerOpinionWeight as unknown as { fn?: OpinionWeight }).fn = fn; }
const weightOf = (s: GameState, key: string, d: number, o: { pol?: boolean }): number => (registerOpinionWeight as unknown as { fn?: OpinionWeight }).fn?.(s, key, d, o) ?? 1;

/**
 * Muda a opinião de alguém sobre você e guarda o motivo. Devolve o delta efetivamente aplicado (já com
 * personalidade e sensibilidade do tipo), na escala −100..100.
 */
export function opine(s: GameState, key: string, delta: number, why: L, o: { pol?: boolean } = {}): number {
  if (isSelf(s, key)) return 0;
  const kp = weightOf(s, key, delta, o);
  const v = Math.round(delta * kp * 10) / 10;
  if (!v) return 0;
  const [k, id] = split(key);
  const kk = NATIVE[k]?.k ?? 1;
  const cur = NATIVE[k]?.get(s, id) ?? opState(s)[key]?.v ?? 0;
  write(s, key, cur + v * kk);
  addWhy(s, key, v, why);
  // efeito colateral herdado (até 31.3): a confiança do ato contratado acompanha um quarto do gesto
  if (k === 'p') {
    const a = s.persons[id] && actsNow27(s).find((x) => x.members.includes(id) && x.owner === 'player');
    if (a) a.trust = clamp(a.trust + v * 0.25, 0, 100);
  }
  return v;
}

/** Fixa a opinião (−100..100). Com motivo, registra o salto como um gesto. */
export function setOpinion(s: GameState, key: string, v: number, why?: L): number {
  if (isSelf(s, key)) return 0;
  const before = opinionOf(s, key);
  const now = write(s, key, v);
  addWhy(s, key, Math.round((now - before) * 10) / 10, why);
  return now;
}

/** Nativos que esfriam aqui (os demais — líder, equipe — têm o decaimento do próprio sistema até a 31.3). */
const DECAY_NATIVE = new Set(['p', 'c']);

/**
 * Memória que esfria (×f por mês). Vale para o que vive só no registro e para os nativos sem decaimento próprio:
 * a opinião de uma pessoa sobre VOCÊ (`Person.rel[pessoa do jogador]`, só das chaves com gesto registrado — a
 * relação entre NPCs não é tocada) e a do crítico (`critrel.rel`).
 */
export function decayOpinions(s: GameState, f: number): void {
  for (const [key, e] of Object.entries(opState(s))) {
    const [k, id] = split(key);
    const nat = NATIVE[k];
    const n = nat?.get(s, id);
    if (nat && n !== undefined) {
      if (!DECAY_NATIVE.has(k) || isSelf(s, key)) continue;
      const v = Math.round(n * f * 10) / 10;
      if (v !== n) nat.set(s, id, v);
      e.v = nat.get(s, id) ?? v;
      continue;
    }
    e.v = Math.round(e.v * f * 10) / 10;
  }
}
