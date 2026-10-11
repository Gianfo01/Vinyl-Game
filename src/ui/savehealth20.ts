// Rodada 20 (G1 / B1) — saúde do save: estado separado do local (IndexedDB) e da nuvem, último checkpoint
// CONFIRMADO (só avança depois do oncomplete da transação / do índice publicado na nuvem), pendente/falhou com o
// motivo, tentativas e um "tentar de novo". Só estado (sem DOM, sem importar store/common: evita ciclo); o
// indicador fica em savechip20.ts. Estado da sessão da página, não do jogo (não vai para o save).

import type { Cost20 } from '../core/save20';

export type SaveSt = 'idle' | 'pending' | 'ok' | 'failed' | 'unavailable' | 'off' | 'stale';
export interface Ack20 { ts: number; year: number; month: number; week: number; slot: string; run: string }
export interface Chan20 { st: SaveSt; lastOk?: Ack20; err?: string; errAt?: number; fails: number }

export const health20 = {
  local: { st: 'idle', fails: 0 } as Chan20,
  cloud: { st: 'off', fails: 0 } as Chan20,
  cost: null as (Cost20 & { ts: number }) | null,
  /** último avanço que falhou e foi revertido (B27) */
  turnErr: null as { ts: number; msg: string } | null,
};

const subs = new Set<() => void>();
export const onHealth20 = (f: () => void): (() => void) => { subs.add(f); return () => { subs.delete(f); }; };
const emit = () => { for (const f of [...subs]) try { f(); } catch { /* indicador fora do DOM */ } };

export function setHealth20(ch: 'local' | 'cloud', patch: Partial<Chan20>): void {
  const c = health20[ch];
  if (patch.st === 'failed') patch.fails = c.fails + 1;
  if (patch.st === 'ok') { patch.fails = 0; patch.err = undefined; }
  Object.assign(c, patch);
  emit();
}
export function noteCost20(c: Cost20): void { health20.cost = { ...c, ts: Date.now() }; }
export function noteTurnErr20(msg: string | null): void { health20.turnErr = msg ? { ts: Date.now(), msg } : null; emit(); }

/** Ações de "tentar de novo" (registradas por store/saves17; o indicador só chama). */
export const retry20: { local: (() => Promise<unknown>) | null; cloud: (() => Promise<unknown>) | null } = { local: null, cloud: null };

/** Nome legível do erro (QuotaExceededError, InvalidStateError, código da nuvem...). */
export function errName20(e: unknown): string {
  const x = e as { name?: string; code?: string | number; message?: string } | null;
  if (!x) return 'Error';
  if (typeof x.code === 'string' && x.code) return x.code;
  if (x.name && x.name !== 'Error') return x.name;
  return String(x.message || x.name || e).slice(0, 80);
}
