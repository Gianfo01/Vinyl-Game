// Rodada 18 (U3) — registro único de "por quê" (CK3: tooltip dentro de tooltip). Qualquer número da interface
// pode ter uma explicação: uma lista de partes {rótulo, valor, por quê?}; cada parte com `why` abre o próximo
// nível. Puro (sem DOM): a interface (src/ui/explain18.ts) só desenha. Sistemas registram assim:
//
//   registerExplain('act.hype', (s, c) => ({ value: 42, parts: [{ label: l('Teaser', 'Teaser'), value: +8, why: { key: 'x', ctx: {} } }] }));
//   explain18(s, 'act.hype', { act: id })   // → Why18 | null

import type { L } from '../data/world';
import type { GameState } from './types';

export type WhyFmt = 'num' | 'signed' | 'pct' | 'money' | 'mult' | 'text';
export type WhyCtx = Record<string, unknown>;
export interface WhyRef { key: string; ctx?: WhyCtx }
export interface WhyPart {
  label: L | string;
  value?: number | string;
  fmt?: WhyFmt;
  /** nível seguinte (outra explicação registrada) */
  why?: WhyRef;
  tone?: 'good' | 'bad' | '';
  note?: L | string;
}
export interface Why18 {
  title?: L | string;
  value: number | string;
  fmt?: WhyFmt;
  parts: WhyPart[];
  /** frase final (regra, fórmula, aviso de incerteza) */
  note?: L | string;
}
export type ExplainFn = (s: GameState, ctx: WhyCtx) => Why18 | null;

const REG: Record<string, ExplainFn> = {};

/** Registra (ou substitui) a explicação de uma chave. */
export function registerExplain(key: string, fn: ExplainFn): void { REG[key] = fn; }
export const hasExplain = (key: string): boolean => !!REG[key];
export const explainKeys = (): string[] => Object.keys(REG).sort();

/** Calcula a explicação (null se a chave não existe ou não se aplica). Nunca lança. */
export function explain18(s: GameState, key: string, ctx: WhyCtx = {}): Why18 | null {
  const f = REG[key];
  if (!f) return null;
  try {
    const w = f(s, ctx);
    if (!w) return null;
    w.parts = w.parts.filter((p) => p.value === undefined || typeof p.value === 'string' || Number.isFinite(p.value));
    return w;
  } catch {
    return null;
  }
}

/** Partes numéricas ordenadas por impacto absoluto (para listas longas). */
export function sortParts(parts: WhyPart[]): WhyPart[] {
  return [...parts].sort((a, b) => Math.abs(Number(b.value) || 0) - Math.abs(Number(a.value) || 0));
}
