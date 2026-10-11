// Revisão 21 (D-1) — IMPULSO DE VENDAS PÓS-LANÇAMENTO (`boost21`). Até aqui seis sistemas (certificação, relançamento,
// remix, sync em comercial, trilha e single beneficente) escreviam em `rel.hypeBoost` acreditando esquentar as vendas —
// mas `hypeBoost` é o multiplicador da ESTREIA (market.ts) e ninguém o lê depois do lançamento. Aqui fica o registro
// real: janelas de semanas com multiplicador, aplicadas às unidades da semana (`chartUnits`) e anotadas na autópsia.

import { l, type L } from '../../data/world';
import { registerExt4, registerMod } from '../ext4';
import type { GameState, Release } from '../types';

export interface Boost21 { mult: number; untilWeek: number; why: L }
declare module '../ext4' { interface Ext4 { boost21: Record<string, Boost21[]> } }
registerExt4('boost21', () => ({}));
export function b21(s: GameState): Record<string, Boost21[]> {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  return (x.boost21 ??= {}) as Record<string, Boost21[]>;
}

/** Soma uma janela de impulso ao lançamento: unidades ×`mult` por `weeks` semanas (motivo visível na autópsia). */
export function addBoost21(s: GameState, rel: Release, mult: number, weeks: number, why: L): void {
  if (!(mult > 0) || mult === 1 || weeks <= 0) return;
  const list = (b21(s)[rel.id] ??= []);
  list.push({ mult, untilWeek: s.week + weeks, why });
  if (list.length > 8) list.splice(0, list.length - 8);
  const au = (rel.autopsy ??= []);
  const key = `boost21:${why.en}`;
  const old = au.find((f) => f.key === key);
  if (old) old.value *= mult;
  else au.push({ key, label: why, value: mult, confidence: 'medium' });
}

/** Multiplicador ativo (produto das janelas vivas) e o motivo da maior. */
export function boostOf21(s: GameState, relId: string): { k: number; why?: L } {
  const list = b21(s)[relId];
  if (!list?.length) return { k: 1 };
  let k = 1, best: Boost21 | undefined;
  for (const b of list) {
    if (b.untilWeek <= s.week) continue;
    k *= b.mult;
    if (!best || Math.abs(b.mult - 1) > Math.abs(best.mult - 1)) best = b;
  }
  return { k, why: best?.why };
}

/** Limpa janelas vencidas (chamado pelo próprio mod, barato). */
export function sweep21(s: GameState): void {
  const st = b21(s);
  for (const id of Object.keys(st)) {
    const keep = st[id].filter((b) => b.untilWeek > s.week);
    if (keep.length) st[id] = keep; else delete st[id];
  }
}

registerMod('chartUnits', 'boost21', (s, v, c) => {
  const rel = c.release;
  if (!rel) return null;
  const { k, why } = boostOf21(s, rel.id);
  if (Math.abs(k - 1) < 0.005) return null;
  return { value: v * k, label: why ?? l('Impulso de vendas', 'Sales boost') };
});
