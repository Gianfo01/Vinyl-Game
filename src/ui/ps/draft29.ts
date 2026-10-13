// Rodada 29 (REORG, M42 da Bíblia de UI/UX) — rascunhos persistentes de formulários longos (ex.: a mesa de negociação).
// Rascunho é PREFERÊNCIA DE INTERFACE deste navegador, não estado da simulação: guardar/abrir não processa nada, não
// mexe no RNG e não vai para o save. Expira (o mundo muda: a revisão sempre usa o estado atual) e é por partida.

export interface DraftRec29<T> { v: T; week: number; at: number }
const PFX = 'vtn29.draft:';
const key = (run: string, kind: string, id: string) => `${PFX}${run}:${kind}:${id}`;

/** Grava (ou substitui) o rascunho. */
export function saveDraft29<T>(run: string, kind: string, id: string, v: T, week: number): void {
  try { localStorage.setItem(key(run, kind, id), JSON.stringify({ v, week, at: Date.now() } satisfies DraftRec29<T>)); } catch { /* sem armazenamento: segue sem rascunho */ }
}
/** Lê o rascunho se ainda vale (no máximo `maxWeeks` semanas de jogo de idade); senão apaga e devolve null. */
export function loadDraft29<T>(run: string, kind: string, id: string, week: number, maxWeeks = 8): DraftRec29<T> | null {
  try {
    const raw = localStorage.getItem(key(run, kind, id));
    if (!raw) return null;
    const r = JSON.parse(raw) as DraftRec29<T>;
    if (!r || typeof r.week !== 'number' || week - r.week > maxWeeks || week < r.week) { localStorage.removeItem(key(run, kind, id)); return null; }
    return r;
  } catch { return null; }
}
export function clearDraft29(run: string, kind: string, id: string): void {
  try { localStorage.removeItem(key(run, kind, id)); } catch { /* ignora */ }
}
