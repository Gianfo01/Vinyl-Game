// R31 · W0-CON — PENDÊNCIA ÚNICA. Cada coisa que espera o jogador (decisão, resposta na caixa, contraproposta…) tem um
// id estável, um lugar dono (`owner`, onde ela "mora" e é resolvida) e pode aparecer em outros lugares como atalho sem
// ser contada de novo. Os números do menu e do Hoje contam pendências ÚNICAS (`pendingCount`).
//
// Provedores (`registerPendingSource`) montam a lista a partir do estado, só lendo — nada é gravado: a pendência some
// quando o sistema dono a resolve. Dois provedores podem devolver o mesmo id (a mesma decisão vista de dois sistemas):
// vale o primeiro registrado como dono, e os atalhos se somam.

import type { L } from '../../data/world';
import type { GameState } from '../types';
import { destKey, type Dest } from './dest';

export interface Pending {
  /** estável enquanto a pendência existir (ex.: 'dec:d12', 'msg:ib40', 'offer:o3') */
  id: string;
  /** lugar dono: onde a pendência é resolvida */
  owner: Dest;
  /** tipo ('decision', 'inbox:<tipo>', 'offer_counter'…) */
  kind: string;
  title: L;
  /** semana-limite (quando há) */
  due?: number;
  actId?: string;
  personId?: string;
  /** outros lugares onde ela aparece (não contam de novo) */
  shortcuts: Dest[];
  /** 0 (baixa) – 3 (urgente) */
  prio?: number;
}

type Source = (s: GameState) => Pending[];
const SOURCES: { id: string; fn: Source }[] = [];

/** Registra (ou substitui, pelo id) um provedor de pendências. Ordem de registro = ordem de prioridade do dono. */
export function registerPendingSource(id: string, fn: Source): void {
  const i = SOURCES.findIndex((x) => x.id === id);
  if (i >= 0) SOURCES[i] = { id, fn };
  else SOURCES.push({ id, fn });
}
export const pendingSources = (): string[] => SOURCES.map((x) => x.id);

/** Lista deduplicada por id. Ordem: prazo mais próximo primeiro, depois prioridade, depois ordem dos provedores. */
export function pendingList(s: GameState): Pending[] {
  const byId = new Map<string, Pending>();
  for (const src of SOURCES) {
    for (const p of src.fn(s)) {
      const cur = byId.get(p.id);
      if (!cur) { byId.set(p.id, { ...p, shortcuts: uniqDest(p.shortcuts, p.owner) }); continue; }
      cur.shortcuts = uniqDest([...cur.shortcuts, p.owner, ...p.shortcuts], cur.owner);
      if (p.due !== undefined && (cur.due === undefined || p.due < cur.due)) cur.due = p.due;
      if ((p.prio ?? 0) > (cur.prio ?? 0)) cur.prio = p.prio;
    }
  }
  const order = [...byId.keys()];
  return [...byId.values()].sort((a, b) => (a.due ?? Infinity) - (b.due ?? Infinity) || (b.prio ?? 0) - (a.prio ?? 0) || order.indexOf(a.id) - order.indexOf(b.id));
}

function uniqDest(list: Dest[], owner: Dest): Dest[] {
  const seen = new Set([destKey(owner)]);
  const out: Dest[] = [];
  for (const d of list) { const k = destKey(d); if (!seen.has(k)) { seen.add(k); out.push(d); } }
  return out;
}

/** Número de pendências únicas (o que o menu mostra). */
export const pendingCount = (s: GameState): number => pendingList(s).length;

/** Pendências visíveis numa área (como dona ou atalho) — cada uma conta uma vez. */
export function pendingAt(s: GameState, area: string): Pending[] {
  return pendingList(s).filter((p) => p.owner.area === area || p.shortcuts.some((d) => d.area === area));
}
