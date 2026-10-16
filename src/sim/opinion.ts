// Masters 31 — opinião sobre o jogador em FONTE ÚNICA (W0-OP na onda 0; armazenamento único na 31.3, F/UNI-3).
//
// Um registro só, `x4.op[chave] = { v, w[] }`, com chave canônica por tipo de pessoa:
//   p:<pessoa>  l:<líder de selo>  c:<crítico>  s:<funcionário>  e:<empresário>  o:<veículo>
//   pd:<produtor>  w:<grupo, ex. w:artists>  … (qualquer chave de per13 vale)
// Escala −100 (ódio) … +100 (devoção). `w[]` guarda os últimos motivos ([ano, mês, delta, texto]).
//
// 31.3: os antigos campos nativos DEIXARAM DE SER ARMAZENAMENTO (B.2). Não existem mais `leaders10 L.rel.player`,
// `critrel.rel`, a lealdade guardada da equipe nem `Person.rel[pessoa do jogador]`: tudo mora aqui.
//   - lealdade da equipe = 50 + op/2 (derivada: `staffLoyalty`; sem registro, 60);
//   - o crítico guardava −50..50: quem pensa nessa escala usa `critRelOf/critRelPut` (op ÷ 2 / × 2);
//   - `Person.rel` continua só para NPC↔NPC: `relOf/relAdd/relPut` roteiam para cá quando o alvo é o jogador.
// Dois jeitos de escrever:
//   - `opine`/`setOpinion`: gesto com motivo (personalidade pesa; crítico se mexe ×0,6; marca o registro como "gesto",
//     o que faz a memória esfriar ×0,985/mês para pessoas e críticos);
//   - `shiftOpinion`/`putOpinion`: a conta do próprio sistema (sem peso de personalidade), com motivo opcional —
//     usada pelos sistemas que já tinham regra numérica própria (decaimento da lealdade, rivalidade dos líderes…).
// O teste `tests/r31-contracts-opinion.test.ts` trava escritas diretas fora deste arquivo.

import { clamp } from '../core/rng';
import type { L } from '../data/world';
// mesma ordem de carregamento de antes (criticrel registra o estado dele aqui; trocar a ordem dos módulos muda o mundo)
import './criticrel';
import { registerExt4 } from './ext4';
import { actsNow27 } from './tickcache27';
import type { GameState, Person } from './types';
import type { Leaders10State } from './sys/leaders10';
import { P } from './sys/people/state';

/** Um motivo: [ano, mês (0–11), delta aplicado, texto]. */
export type OpWhy = [number, number, number, L];
/** `g`: houve gesto (opine/setOpinion) — só então a opinião de pessoas e críticos esfria aqui. */
export interface OpEntry { v: number; w: OpWhy[]; g?: 1 }
export type OpState = Record<string, OpEntry>;

declare module './ext4' { interface Ext4 { op: OpState } }
registerExt4('op', () => ({}));

/** Limites do registro. */
export const OP_MIN = -100;
export const OP_MAX = 100;
/** Quantos motivos cada chave guarda (os mais recentes). */
export const OP_WHY_MAX = 6;
/** Quantas chaves "livres" (grupos, empresários, produtores…) o registro guarda (as mais antigas saem). Pessoas,
 *  líderes, críticos, equipe e veículos nunca saem por limite: saem quando a pessoa sai de cena (limpeza do social31). */
export const OP_KEYS_MAX = 800;

/** Prefixos canônicos (documentação e validação leve). */
export const OP_PREFIX = {
  p: 'pessoa', l: 'líder de selo', c: 'crítico', s: 'funcionário', e: 'empresário', o: 'veículo', pd: 'produtor', w: 'grupo',
} as const;
/** Tipos que eram campo nativo e agora só existem aqui (não saem por limite). */
const STORED = new Set(['p', 'l', 'c', 's', 'o']);
/** Tipos com decaimento próprio (o sistema dono chama shift/put): `decayOpinions` não mexe. */
const OWN_DECAY = new Set(['l', 's', 'o']);
/** Tipos que só esfriam aqui quando houve gesto (antes: nativos com espelho). */
const GESTURE_DECAY = new Set(['p', 'c']);

export function opState(s: GameState): OpState {
  const x = s.x4 as unknown as { op?: OpState };
  return (x.op ??= {});
}

const split = (key: string): [string, string] => { const i = key.indexOf(':'); return i < 0 ? [key, ''] : [key.slice(0, i), key.slice(i + 1)]; };
// Só módulos leves aqui (sem sys/leaders10, sys/life, persona13): opinion.ts é carregado cedo e não pode
// disparar a avaliação dos sistemas grandes no meio de um ciclo de importação.
/** Pessoa (s.persons) do jogador, quando existe. */
export const meId = (s: GameState): string | undefined => { const id = P(s).owner?.personId; return id && s.persons[id] ? id : undefined; };
const leaders = (s: GameState): Leaders10State | undefined => (s as unknown as { x4: { leaders10?: Leaders10State } }).x4.leaders10;

/** Valor de partida de quem existe e ainda não tem registro (equipe: lealdade 60 = opinião +20; líder: 0). */
function base(s: GameState, k: string, id: string): number | undefined {
  if (k === 's') return s.player.staff.some((x) => x.id === id) ? 20 : undefined;
  if (k === 'l') return leaders(s)?.L[id] ? 0 : undefined;
  return undefined;
}

// ---------------------------------------------------------------- leitura

/** Opinião sem arredondar (para quem faz conta com ela). */
export function opinionRaw(s: GameState, key: string): number {
  const e = opState(s)[key];
  if (e) return e.v;
  const [k, id] = split(key);
  return base(s, k, id) ?? 0;
}

/** Opinião atual de alguém sobre você (−100..100, arredondada). */
export function opinionOf(s: GameState, key: string): number {
  return Math.round(opinionRaw(s, key));
}

/** Existe opinião formada (algum registro; equipe e líderes existentes sempre têm)? */
export function hasOpinion(s: GameState, key: string): boolean {
  if (opState(s)[key]) return true;
  const [k, id] = split(key);
  return base(s, k, id) !== undefined;
}

/** Motivos guardados (mais antigo → mais recente). */
export function opinionWhy(s: GameState, key: string): readonly OpWhy[] {
  return opState(s)[key]?.w ?? [];
}

/** Chaves com registro de um tipo (ex.: 'c' = críticos com relação). Ordem de inserção. */
export function opinionKeys(s: GameState, kind: string): string[] {
  const p = `${kind}:`;
  return Object.keys(opState(s)).filter((k) => k.startsWith(p));
}

// ---------------------------------------------------------------- escrita

function entry(s: GameState, key: string): OpEntry {
  const st = opState(s);
  let e = st[key];
  if (!e) {
    const [k, id] = split(key);
    e = st[key] = { v: base(s, k, id) ?? 0, w: [] };
    if (!STORED.has(k)) {
      const free = Object.keys(st).filter((x) => !STORED.has(split(x)[0]));
      if (free.length > OP_KEYS_MAX) for (const x of free.slice(0, free.length - OP_KEYS_MAX)) if (x !== key) delete st[x];
    }
  }
  return e;
}

function addWhy(e: OpEntry, s: GameState, d: number, why: L | undefined): void {
  if (!why) return;
  e.w.push([s.year, s.month, d, why]);
  if (e.w.length > OP_WHY_MAX) e.w.splice(0, e.w.length - OP_WHY_MAX);
}

/** Quem não tem opinião: você mesmo. */
const isSelf = (s: GameState, key: string): boolean => key === 'player' || (key.startsWith('p:') && (!!s.persons[key.slice(2)]?.isPlayer || key.slice(2) === meId(s)));

/** Peso da personalidade sobre um gesto (persona13 registra: empatia amplia gestos bons, teimosia os ruins). */
export type OpinionWeight = (s: GameState, key: string, d: number, o: { pol?: boolean }) => number;
/**
 * Registra o peso da personalidade. É uma declaração de função (içada) de propósito: persona13 chama isto no
 * carregamento, possivelmente antes de este módulo terminar de avaliar (ciclo de importação).
 */
export function registerOpinionWeight(fn: OpinionWeight): void { (registerOpinionWeight as unknown as { fn?: OpinionWeight }).fn = fn; }
const weightOf = (s: GameState, key: string, d: number, o: { pol?: boolean }): number => (registerOpinionWeight as unknown as { fn?: OpinionWeight }).fn?.(s, key, d, o) ?? 1;
/** Críticos se mexem menos com gestos. */
const KIND_K: Record<string, number> = { c: 0.6 };

/** Ouvintes de mudança (social31 usa para registrar "já se conhecem" quando alguém passa a ter opinião). */
type OpListener = (s: GameState, key: string, d: number) => void;
const LISTEN: OpListener[] = [];
export function onOpinion(fn: OpListener): void { LISTEN.push(fn); }
const told = (s: GameState, key: string, d: number): void => { for (const f of LISTEN) f(s, key, d); };

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
  const kk = KIND_K[k] ?? 1;
  const e = entry(s, key);
  e.v = clamp(e.v + v * kk, OP_MIN, OP_MAX);
  e.g = 1;
  addWhy(e, s, v, why);
  // a confiança do ato contratado acompanha um quarto do gesto (a confiança é dado do CONTRATO; este é o único
  // ponto em que um gesto pessoal mexe nela — fica registrado em DECISOES/31.3)
  if (k === 'p') {
    const a = s.persons[id] && actsNow27(s).find((x) => x.members.includes(id) && x.owner === 'player');
    if (a) a.trust = clamp(a.trust + v * 0.25, 0, 100);
  }
  told(s, key, v);
  return v;
}

/** Fixa a opinião (−100..100). Com motivo, registra o salto como um gesto. */
export function setOpinion(s: GameState, key: string, v: number, why?: L): number {
  if (isSelf(s, key)) return 0;
  const before = opinionOf(s, key);
  const e = entry(s, key);
  e.v = clamp(v, OP_MIN, OP_MAX);
  e.g = 1;
  addWhy(e, s, Math.round((e.v - before) * 10) / 10, why);
  told(s, key, e.v - before);
  return e.v;
}

/**
 * A conta do próprio sistema: soma `d` (sem peso de personalidade), com limites opcionais e motivo opcional.
 * Devolve o valor novo. É a forma de quem antes escrevia o campo nativo direto (mesma aritmética).
 */
export function shiftOpinion(s: GameState, key: string, d: number, o: { min?: number; max?: number; why?: L } = {}): number {
  if (isSelf(s, key)) return 0;
  const e = entry(s, key);
  const before = e.v;
  e.v = clamp(e.v + d, o.min ?? OP_MIN, o.max ?? OP_MAX);
  if (o.why && e.v !== before) addWhy(e, s, Math.round((e.v - before) * 10) / 10, o.why);
  if (e.v !== before) told(s, key, e.v - before);
  return e.v;
}

/** Fixa o valor pela conta do próprio sistema (sem marcar gesto). */
export function putOpinion(s: GameState, key: string, v: number, why?: L): number {
  if (isSelf(s, key)) return 0;
  const e = entry(s, key);
  const before = e.v;
  e.v = clamp(v, OP_MIN, OP_MAX);
  if (why && e.v !== before) addWhy(e, s, Math.round((e.v - before) * 10) / 10, why);
  if (e.v !== before) told(s, key, e.v - before);
  return e.v;
}

/** Esquece a opinião (a pessoa saiu de cena; ou a relação com o crítico voltou ao zero e não há motivo guardado). */
export function forgetOpinion(s: GameState, key: string): void { delete opState(s)[key]; }

// ---------------------------------------------------------------- leituras derivadas (antigos campos nativos)

/** Lealdade (0..100) derivada da opinião: 50 + op/2. */
export const loyaltyOf = (op: number): number => clamp(50 + op / 2, 0, 100);
/** Lealdade de um funcionário (0..100; sem registro, 60). */
export const staffLoyalty = (s: GameState, staffId: string): number => loyaltyOf(opinionRaw(s, `s:${staffId}`));
/** Fixa a lealdade (0..100) — grava a opinião correspondente. */
export function setStaffLoyalty(s: GameState, staffId: string, loy: number, why?: L): number {
  putOpinion(s, `s:${staffId}`, clamp(loy, 0, 100) * 2 - 100, why);
  return staffLoyalty(s, staffId);
}
/** Soma à lealdade com o corte do próprio sistema (padrão 0..100). */
export function addStaffLoyalty(s: GameState, staffId: string, d: number, o: { min?: number; max?: number; why?: L } = {}): number {
  return setStaffLoyalty(s, staffId, clamp(staffLoyalty(s, staffId) + d, o.min ?? 0, o.max ?? 100), o.why);
}

/** Relação de um crítico na escala antiga do sistema de críticos (−50..50). */
export const critRelOf = (s: GameState, critic: string): number => opinionRaw(s, `c:${critic}`) / 2;
/** Grava a relação do crítico na escala −50..50. */
export const critRelPut = (s: GameState, critic: string, v: number, why?: L): number => putOpinion(s, `c:${critic}`, clamp(v, -50, 50) * 2, why) / 2;
/** Críticos com relação registrada (nomes). */
export const critRelNames = (s: GameState): string[] => opinionKeys(s, 'c').map((k) => k.slice(2));

// ---------------------------------------------------------------- pessoa → pessoa (roteador)

/**
 * O que a pessoa `a` sente por `b` (−100..100), ou undefined quando nunca se formou. Quando `b` é o jogador, a fonte
 * é este registro (`p:a`); entre NPCs (e do jogador pelos outros), `Person.rel`.
 */
export function relOf(s: GameState, a: string, b: string): number | undefined {
  if (b === meId(s) && a !== b) { const e = opState(s)[`p:${a}`]; return e ? e.v : undefined; }
  return s.persons[a]?.rel[b];
}
/** Como relOf, com 0 quando não há. */
export const rel0 = (s: GameState, a: string, b: string): number => relOf(s, a, b) ?? 0;
/** Fixa o que `a` sente por `b` (roteia para `p:a` quando `b` é o jogador). */
export function relPut(s: GameState, a: string, b: string, v: number, why?: L): void {
  if (a === b) return;
  if (b === meId(s)) { putOpinion(s, `p:${a}`, v, why); return; }
  const p: Person | undefined = s.persons[a];
  if (p) p.rel[b] = v;
}
/** Soma ao que `a` sente por `b`, com corte (padrão −100..100). Sem registro, parte de `from` (padrão 0). */
export function relAdd(s: GameState, a: string, b: string, d: number, o: { min?: number; max?: number; from?: number; why?: L } = {}): void {
  if (a === b) return;
  relPut(s, a, b, clamp((relOf(s, a, b) ?? o.from ?? 0) + d, o.min ?? -100, o.max ?? 100), o.why);
}
/** Passa a conhecer (registro em 0 quando não havia nada). */
export function relTouch(s: GameState, a: string, b: string, v = 0): void { if (relOf(s, a, b) === undefined) relPut(s, a, b, v); }

// ---------------------------------------------------------------- tempo

/**
 * Memória que esfria (×f por mês). Vale para o que vive só no registro (grupos, empresários…) e, quando houve gesto,
 * para pessoas e críticos. Líderes, equipe e veículos esfriam pela regra do próprio sistema (shift/put).
 */
export function decayOpinions(s: GameState, f: number): void {
  for (const [key, e] of Object.entries(opState(s))) {
    const [k] = split(key);
    if (OWN_DECAY.has(k)) continue;
    if (GESTURE_DECAY.has(k) && (!e.g || isSelf(s, key))) continue;
    e.v = Math.round(e.v * f * 10) / 10;
  }
}
