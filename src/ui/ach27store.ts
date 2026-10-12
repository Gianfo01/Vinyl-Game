// Rodada 27 (ACH) — armazenamento das conquistas do perfil (localStorage, mesmo lugar dos perfis do saves17; try/catch).
// Sem dependência da simulação: saves17 importa daqui para apagar as conquistas junto com o perfil.

import type { L } from '../data/world';
import type { GameState } from '../sim/types';
import { profileId17 } from './store';

/** Muda a cada perfil apagado (o cache de sincronização em ach27model recomeça). */
export const EPOCH27 = { n: 0 };
export type Medal27 = 'gold' | 'silver' | 'bronze';
export interface AchRun27 { co: string; y0: number; seed: string; sig: string }
export interface AchRec27 {
  /** data real do primeiro desbloqueio (ms) */
  at: number;
  /** ano do jogo em que destravou */
  gy: number;
  /** partida do primeiro desbloqueio */
  run: AchRun27;
  /** assinaturas das partidas em que destravou (no máximo 20) */
  sigs: string[];
}
export interface MedalRec27 { m: Medal27; at: number; gy: number; run: AchRun27 }
export interface ProfAch27 { v: 1; ach: Record<string, AchRec27>; medals: Record<string, MedalRec27> }

const KEY = (pid: string) => `vtn:ach27:${pid}`;
const empty = (): ProfAch27 => ({ v: 1, ach: {}, medals: {} });

/** Conquistas gravadas no perfil (padrão: o perfil atual). Falha de leitura = perfil sem conquistas. */
export function profAch27(pid: string = profileId17()): ProfAch27 {
  try {
    const raw = localStorage.getItem(KEY(pid));
    if (!raw) return empty();
    const p = JSON.parse(raw) as Partial<ProfAch27>;
    return { v: 1, ach: p.ach && typeof p.ach === 'object' ? p.ach : {}, medals: p.medals && typeof p.medals === 'object' ? p.medals : {} };
  } catch { return empty(); }
}
function saveProfAch27(pid: string, p: ProfAch27): void {
  try { localStorage.setItem(KEY(pid), JSON.stringify(p)); } catch { /* sem armazenamento: fica só na partida */ }
}
/** Marcos entre partidas do ux19 (cadeias, caminhos, medalhas de partida) por perfil; ux19 registra o leitor. */
export const MARKS27: { f?: (pid?: string) => { k: string; name: L; y: number }[] } = {};
/** Apaga as conquistas de um perfil (chamado ao apagar o perfil), inclusive o meta-perfil do ux19 dele. */
export function clearProfAch27(pid: string): void {
  try { localStorage.removeItem(KEY(pid)); if (pid !== 'default') localStorage.removeItem(`vtn19.profile:${pid}`); } catch { /* sem armazenamento */ }
  EPOCH27.n++;
}
/** Quantas conquistas o perfil tem (para o aviso ao apagar). */
export const profAchCount27 = (pid: string): number => Object.keys(profAch27(pid).ach).length + Object.keys(profAch27(pid).medals).length;

export const runOf27 = (s: GameState): AchRun27 => ({ co: s.config.companyName, y0: s.config.startYear, seed: String(s.config.seed ?? ''), sig: s.signature });

/** Grava desbloqueios no perfil. Devolve os ids novos para o perfil. */
export function recordAch27(pid: string, items: { id: string; gy: number }[], run: AchRun27, now = Date.now()): string[] {
  if (!items.length) return [];
  const p = profAch27(pid);
  const fresh: string[] = [];
  let dirty = false;
  for (const it of items) {
    const r = p.ach[it.id];
    if (!r) { p.ach[it.id] = { at: now, gy: it.gy, run, sigs: [run.sig] }; fresh.push(it.id); dirty = true; continue; }
    if (!r.sigs.includes(run.sig)) { r.sigs = [...r.sigs, run.sig].slice(-20); dirty = true; }
  }
  if (dirty) saveProfAch27(pid, p);
  return fresh;
}
/** Medalha de cenário: guarda a melhor por cenário. */
export function recordMedal27(pid: string, scen: string, m: Medal27, gy: number, run: AchRun27, now = Date.now()): boolean {
  const rank: Record<Medal27, number> = { bronze: 1, silver: 2, gold: 3 };
  const p = profAch27(pid);
  const cur = p.medals[scen];
  if (cur && rank[cur.m] >= rank[m]) return false;
  p.medals[scen] = { m, at: now, gy, run };
  saveProfAch27(pid, p);
  return true;
}
