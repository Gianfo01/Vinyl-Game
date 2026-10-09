// Prestígio dos selos (rodada 9): todo selo (o do jogador e os rivais) tem reconhecimento, popularidade,
// momento, credibilidade com a crítica e confiança dos artistas, recalculados todo mês a partir de
// lançamentos, paradas, prêmios, contratações e escândalos. Os números pesam: cobertura da mídia (apelo
// dos lançamentos), disposição dos artistas em assinar, termos de contrato e a IA dos rivais.

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerMod, registerOfferMod, registerSimHook } from '../ext4';
import type { GameState } from '../types';
import { fmtL, notify, playerActs } from '../util';

export type StandKey = 'rec' | 'pop' | 'mom' | 'crit' | 'trust';
export interface Standing { rec: number; pop: number; mom: number; crit: number; trust: number; hist: number[]; sc?: number; ros?: number }
export interface StandingState { by: Record<string, Standing> }

declare module '../ext4' { interface Ext4 { standing9: StandingState } }
registerExt4('standing9', () => ({ by: {} }));
export const standings = (s: GameState): StandingState => {
  const x = s.x4 as unknown as { standing9?: StandingState };
  x.standing9 ??= { by: {} };
  return x.standing9;
};

export const STAND_NAME: Record<StandKey, L> = {
  rec: l('Reconhecimento', 'Recognition'), pop: l('Popularidade', 'Popularity'), mom: l('Momento', 'Momentum'),
  crit: l('Crédito com a crítica', 'Critical standing'), trust: l('Confiança dos artistas', 'Artist trust'),
};
export const STAND_KEYS: StandKey[] = ['rec', 'pop', 'mom', 'crit', 'trust'];

/** Prestígio de um selo ('player' ou id de rival). Sempre devolve algo (neutro para selos sem histórico). */
export function standingOf(s: GameState, id: string): Standing {
  const by = standings(s).by;
  return (by[id] ??= { rec: baseRep(s, id), pop: 40, mom: 50, crit: 50, trust: id === 'player' ? s.player.reputation.artists : 50, hist: [] });
}

/** Nota única (0–100) para rankings. */
export function standingScore(st: Standing): number {
  return Math.round(st.rec * 0.35 + st.pop * 0.3 + st.mom * 0.15 + st.crit * 0.1 + st.trust * 0.1);
}

function baseRep(s: GameState, id: string): number {
  if (id === 'player') { const r = s.player.reputation; return clamp((r.artistic + r.institutional) / 2, 0, 100); }
  return clamp(s.labels[id]?.reputation ?? 40, 0, 100);
}

function rosterOf(s: GameState, id: string): string[] {
  return id === 'player' ? playerActs(s) : (s.labels[id]?.roster ?? []);
}

/** Recalcula todos os selos (mensal). */
export function updateStandings(s: GameState): void {
  const ids = ['player', ...Object.values(s.labels).filter((x) => x.active).map((x) => x.id)];
  const agg: Record<string, { u3: number; u12: number; cs: number; cn: number; hits: number }> = {};
  for (const id of ids) agg[id] = { u3: 0, u12: 0, cs: 0, cn: 0, hits: 0 };
  const from = s.week - 52;
  for (const rel of Object.values(s.releases)) {
    const a = agg[rel.owner];
    if (!a || rel.week + rel.weekly.length < from) continue;
    for (let i = Math.max(0, from - rel.week); i < rel.weekly.length; i++) {
      const u = rel.weekly[i];
      a.u12 += u;
      if (rel.week + i >= s.week - 13) a.u3 += u;
    }
    if (rel.critic !== undefined && rel.week >= from) { a.cs += rel.critic * (rel.criticN ?? 1); a.cn += rel.criticN ?? 1; }
  }
  for (const e of [...s.charts.singles, ...s.charts.albums]) {
    const owner = s.releases[e.releaseId]?.owner;
    if (owner && agg[owner] && e.pos <= 10) agg[owner].hits += 1;
  }
  const maxU = Math.max(1, ...ids.map((id) => agg[id].u12));
  for (const id of ids) {
    const st = standingOf(s, id);
    const a = agg[id];
    const acts = rosterOf(s, id).map((x) => s.acts[x]).filter(Boolean);
    const fame = acts.length ? acts.reduce((t, x) => t + x.fame, 0) / acts.length : 0;
    const honors = acts.reduce((t, x) => t + x.awards * 2 + x.number1s * 3 + (x.legend ? 6 : 0), 0);
    const scandals = acts.reduce((t, x) => t + x.scandals, 0);
    const newSc = st.sc === undefined ? 0 : Math.max(0, scandals - st.sc);
    const newSign = st.ros === undefined ? 0 : Math.max(0, acts.length - st.ros);
    st.sc = scandals;
    st.ros = acts.length;
    const crit = a.cn ? a.cs / a.cn : st.crit;
    const popT = 100 * Math.sqrt(a.u12 / maxU) * 0.7 + fame * 0.3;
    const momT = clamp(50 + ((a.u3 * 4) / (a.u12 + 1) - 1) * 45 + a.hits * 5 + newSign * 3, 0, 100);
    const recT = clamp(baseRep(s, id) * 0.5 + Math.min(30, honors) + (crit - 50) * 0.25 + fame * 0.15, 0, 100);
    const lb = s.labels[id];
    const trustT = id === 'player'
      ? s.player.reputation.artists * 0.7 + (acts.length ? acts.reduce((t, x) => t + x.trust, 0) / acts.length : 50) * 0.3
      : clamp(35 + (lb?.reputation ?? 40) * 0.45 - (lb?.aggression ?? 0.5) * 12 + st.pop * 0.1, 0, 100);
    const mv = (k: StandKey, target: number, rate: number) => { st[k] = Math.round(clamp(st[k] + (target - st[k]) * rate, 0, 100) * 10) / 10; };
    mv('rec', recT - newSc * 6, 0.08);
    mv('pop', popT, 0.25);
    mv('mom', momT - newSc * 8, 0.5);
    mv('crit', crit, 0.2);
    mv('trust', trustT - newSc * 6, 0.15);
    st.hist.push(standingScore(st));
    if (st.hist.length > 24) st.hist.shift();
    // a IA dos rivais lê a própria reputação: ela acompanha o prestígio devagar
    if (lb) lb.reputation = Math.round((lb.reputation + (st.rec - lb.reputation) * 0.03) * 10) / 10;
  }
  const me = standingOf(s, 'player');
  const prev = me.hist.at(-2);
  if (prev !== undefined && me.hist.at(-1)! - prev >= 6) notify(s, fmtL(l('{c} está em alta: o selo virou assunto (momento {m}).', '{c} is hot: the label is the talk of the town (momentum {m}).'), { c: s.config.companyName, m: Math.round(me.mom) }), 'good');
}

/** Posição de cada selo no ranking. */
export function standingRanking(s: GameState): { id: string; name: string; st: Standing; score: number }[] {
  const ids = ['player', ...Object.values(s.labels).filter((x) => x.active).map((x) => x.id)];
  return ids.map((id) => {
    const st = standingOf(s, id);
    return { id, name: id === 'player' ? s.config.companyName : s.labels[id].name, st, score: standingScore(st) };
  }).sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------- efeitos

// cobertura da mídia: selos populares e em alta recebem mais espaço
registerMod('appeal', 'standing9', (s, v, c) => {
  const rel = c.release;
  if (!rel || (rel.owner !== 'player' && !s.labels[rel.owner])) return null;
  const st = standings(s).by[rel.owner];
  if (!st) return null;
  return { value: v * (1 + (st.pop - 50) / 900 + (st.mom - 50) / 700), label: l('Prestígio do selo na mídia', 'Label standing in the media') };
});

// artistas pesam a reputação do selo ao assinar
registerOfferMod('standing9', (s) => {
  const st = standings(s).by.player;
  if (!st) return null;
  const delta = (st.trust - 50) / 600 + (st.rec - 50) / 900 + (st.mom - 50) / 1500;
  if (Math.abs(delta) < 0.01) return null;
  return { delta, reason: delta > 0 ? l('O selo tem prestígio e boa fama entre artistas.', 'The label has prestige and a good name among artists.') : l('A fama do selo entre artistas não ajuda.', 'The label\'s name among artists does not help.') };
});

registerSimHook('month', 'standing9', (s) => updateStandings(s));
