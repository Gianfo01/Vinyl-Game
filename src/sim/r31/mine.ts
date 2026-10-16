// R31 · O — FAVORITOS (RN-15) e METAS PESSOAIS (RN-09) do jogador. Ficam no save (registerExt4 'my31').
//
//  Favoritos: pessoas, artistas, cidades e telas fixados pelo jogador. Cada um é um destino (r31/dest) com chave estável;
//  o que deixou de existir (pessoa removida, carreira inexistente) some da lista na leitura, sem apagar nada.
//  Metas: o jogador escolhe um alvo simples (caixa, fama de um artista, tamanho do elenco, lançamentos, top 10, nº 1,
//  discos de ouro) e um prazo opcional. Sem recompensa e sem efeito no mundo (RN-09: não é um segundo sistema de
//  objetivos). A virada do mês só carimba a semana em que a meta foi cumprida (ou perdeu o prazo), sem sorteio.

import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import type { GameState } from '../types';
import { playerActs } from '../util';
import { destKey, resolveDest, type Dest } from './dest';

export type FavKind31 = 'act' | 'person' | 'city' | 'screen';
export interface Fav31 {
  /** chave estável (destKey) */
  key: string;
  kind: FavKind31;
  dest: Dest;
  /** nome na hora de fixar (telas; pessoas e artistas leem o nome atual) */
  name?: L;
  week: number;
}

export type GoalKind31 = 'cash' | 'fame' | 'roster' | 'releases' | 'top10s' | 'number1s' | 'gold';
export interface Goal31 {
  id: string;
  kind: GoalKind31;
  target: number;
  /** artista (metas de fama) */
  actId?: string;
  /** prazo: até o fim deste ano (opcional) */
  byYear?: number;
  /** valor de partida (metas de contagem medem o que aconteceu DEPOIS de criar a meta) */
  base: number;
  week: number;
  /** semana em que foi cumprida */
  done?: number;
  /** semana em que o prazo passou sem cumprir */
  missed?: number;
}

export interface My31 { favs: Fav31[]; goals: Goal31[]; seq: number }
declare module '../ext4' { interface Ext4 { my31: My31 } }
const fresh = (): My31 => ({ favs: [], goals: [], seq: 0 });
registerExt4('my31', fresh);

export const my31 = (s: GameState): My31 => {
  const x4 = s.x4 as unknown as { my31?: My31 };
  return (x4.my31 ??= fresh());
};

export const FAV_MAX31 = 24;
export const GOAL_MAX31 = 8;

// ---------------------------------------------------------------- favoritos

export function favKey31(kind: FavKind31, dest: Dest): string { return `${kind}|${destKey(dest)}`; }
export const isFav31 = (s: GameState, kind: FavKind31, dest: Dest): boolean => my31(s).favs.some((f) => f.key === favKey31(kind, dest));

/** Fixa ou desfixa. Devolve true quando ficou fixado. Ao passar do máximo, sai o mais antigo. */
export function toggleFav31(s: GameState, kind: FavKind31, dest: Dest, name?: L): boolean {
  const m = my31(s);
  const key = favKey31(kind, dest);
  const i = m.favs.findIndex((f) => f.key === key);
  if (i >= 0) { m.favs.splice(i, 1); return false; }
  m.favs.push({ key, kind, dest: { ...dest }, name, week: s.week });
  if (m.favs.length > FAV_MAX31) m.favs.splice(0, m.favs.length - FAV_MAX31);
  return true;
}

/** Favoritos válidos agora (o que sumiu do mundo fica de fora; nada é apagado). */
export function favs31(s: GameState): Fav31[] {
  return my31(s).favs.filter((f) => {
    if (f.kind === 'act') return !!f.dest.actId && !!s.acts[f.dest.actId];
    const r = resolveDest(s, f.dest);
    return r.ok;
  });
}

// ---------------------------------------------------------------- metas

export const GOAL31: Record<GoalKind31, { label: L; unit: 'money' | 'n'; count: boolean; needsAct?: boolean }> = {
  cash: { label: l('Caixa de pelo menos {n}', 'Cash of at least {n}'), unit: 'money', count: false },
  fame: { label: l('{a} com fama {n}', '{a} at fame {n}'), unit: 'n', count: false, needsAct: true },
  roster: { label: l('{n} artistas no elenco', '{n} acts on the roster'), unit: 'n', count: false },
  releases: { label: l('{n} lançamentos novos', '{n} new releases'), unit: 'n', count: true },
  top10s: { label: l('{n} entradas novas no top 10', '{n} new top 10 entries'), unit: 'n', count: true },
  number1s: { label: l('{n} número(s) 1 novo(s)', '{n} new number 1(s)'), unit: 'n', count: true },
  gold: { label: l('{n} disco(s) de ouro novo(s)', '{n} new gold record(s)'), unit: 'n', count: true },
};

/** Valor bruto de hoje (antes de descontar o ponto de partida). */
function raw31(s: GameState, kind: GoalKind31, actId?: string): number {
  const st = s.player.stats;
  switch (kind) {
    case 'cash': return s.player.cash;
    case 'fame': return Math.round(actId ? (s.acts[actId]?.fame ?? 0) : 0);
    case 'roster': return playerActs(s).length;
    case 'releases': return st.releases;
    case 'top10s': return st.top10s;
    case 'number1s': return st.number1s;
    case 'gold': return st.gold;
  }
}

export interface GoalErr31 { err: L }
/** Cria uma meta. Erros em texto (alvo inválido, artista ausente, lista cheia). */
export function addGoal31(s: GameState, g: { kind: GoalKind31; target: number; actId?: string; byYear?: number }): Goal31 | GoalErr31 {
  const m = my31(s);
  const def = GOAL31[g.kind];
  if (!def) return { err: l('Tipo de meta desconhecido.', 'Unknown goal type.') };
  if (!(Number.isFinite(g.target) && g.target > 0)) return { err: l('Escolha um alvo maior que zero.', 'Pick a target above zero.') };
  if (def.needsAct && !(g.actId && s.acts[g.actId])) return { err: l('Escolha o artista da meta.', 'Pick the act for this goal.') };
  if (g.byYear !== undefined && g.byYear < s.year) return { err: l('O prazo já passou.', 'That deadline has passed.') };
  if (m.goals.filter((x) => !x.done && !x.missed).length >= GOAL_MAX31) return { err: l('Já há metas demais em andamento: conclua ou apague uma.', 'Too many goals in progress: finish or delete one.') };
  const goal: Goal31 = { id: `g${++m.seq}`, kind: g.kind, target: Math.round(g.target), actId: def.needsAct ? g.actId : undefined, byYear: g.byYear, base: def.count ? raw31(s, g.kind, g.actId) : 0, week: s.week };
  m.goals.push(goal);
  return goal;
}

export function removeGoal31(s: GameState, id: string): boolean {
  const m = my31(s);
  const i = m.goals.findIndex((g) => g.id === id);
  if (i < 0) return false;
  m.goals.splice(i, 1);
  return true;
}

export interface GoalProg31 { cur: number; target: number; pct: number; done: boolean; missed: boolean; label: L }
/** Progresso (só leitura). */
export function goalProgress31(s: GameState, g: Goal31): GoalProg31 {
  const def = GOAL31[g.kind];
  const cur = Math.max(0, raw31(s, g.kind, g.actId) - g.base);
  const pct = Math.max(0, Math.min(100, Math.round((cur / Math.max(1, g.target)) * 100)));
  const n = (loc: string) => (def.unit === 'money' ? `$${Math.round(g.target / 100).toLocaleString(loc)}` : String(g.target));
  const a = g.actId ? s.acts[g.actId]?.name ?? '—' : '';
  const label = l(def.label.pt.replace('{n}', n('pt-BR')).replace('{a}', a), def.label.en.replace('{n}', n('en-US')).replace('{a}', a));
  return { cur, target: g.target, pct, done: !!g.done || cur >= g.target, missed: !!g.missed, label };
}

/** Carimbo da virada do mês (sem sorteio, sem efeito no mundo). */
export function stampGoals31(s: GameState): void {
  for (const g of my31(s).goals) {
    if (g.done || g.missed) continue;
    const p = goalProgress31(s, g);
    if (p.cur >= g.target) g.done = s.week;
    else if (g.byYear !== undefined && s.year > g.byYear) g.missed = s.week;
  }
}
registerSimHook('month', 'my31.goals', (s) => stampGoals31(s));
