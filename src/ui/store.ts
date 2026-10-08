import { ensureExt } from '../sim/ext';
import { registerMovementGenres } from '../sim/culture';
// Estado da interface, preferências e persistência (IndexedDB + gzip; GDD §26).

import { getLang, setLang, type Lang } from '../i18n/strings';
import type { GameState } from '../sim/types';
import { SAVE_VERSION } from '../sim/worldgen';

export type Area = 'hq' | 'desk' | 'charts' | 'artists' | 'market' | 'media' | 'catalog' | 'creation' | 'shows' | 'company' | 'diary';

export interface Prefs {
  lang: Lang;
  textScale: number;
  contrast: boolean;
  reducedMotion: boolean;
  theme: 'auto' | 'light' | 'dark';
}

export const store = {
  game: null as GameState | null,
  area: 'desk' as Area,
  selectedAct: null as string | null,
  undoSnapshot: null as string | null,
  marketTab: 'scouting' as 'scouting' | 'pipeline' | 'rivals' | 'professionals',
  companyTab: 'finances' as 'finances' | 'staff' | 'hq' | 'legacy',
  prefs: loadPrefs(),
  rerender: () => {},
  toast: (_msg: string, _kind?: string) => {},
};

function loadPrefs(): Prefs {
  const def: Prefs = { lang: navigator.language?.startsWith('pt') ? 'pt' : 'en', textScale: 100, contrast: false, reducedMotion: false, theme: 'auto' };
  try {
    const raw = localStorage.getItem('vtn:prefs');
    if (raw) return { ...def, ...JSON.parse(raw) };
  } catch {
    /* armazenamento indisponível */
  }
  return def;
}

export function savePrefs(): void {
  try {
    localStorage.setItem('vtn:prefs', JSON.stringify(store.prefs));
  } catch {
    /* ignora */
  }
  applyPrefs();
}

export function applyPrefs(): void {
  const p = store.prefs;
  if (getLang() !== p.lang) setLang(p.lang);
  const root = document.documentElement;
  root.style.fontSize = `${p.textScale}%`;
  root.classList.toggle('contrast', p.contrast);
  root.classList.toggle('reduced-motion', p.reducedMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  if (p.theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', p.theme);
}

// ---------- IndexedDB ----------
const DB = 'vinyl-to-neural';
const STORE = 'saves';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function gzip(text: string): Promise<Blob | string> {
  if (typeof CompressionStream === 'undefined') return text;
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).blob();
}

async function gunzip(data: Blob | string): Promise<string> {
  if (typeof data === 'string') return data;
  const stream = data.stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

export interface SaveMeta {
  slot: string;
  signature: string;
  company: string;
  year: number;
  month: number;
  role: string;
  savedAt: number;
  version: number;
}

export async function saveGame(slot = 'auto'): Promise<boolean> {
  const g = store.game;
  if (!g) return false;
  try {
    const db = await openDb();
    const payload = await gzip(JSON.stringify(g));
    const meta: SaveMeta = { slot, signature: g.signature, company: g.config.companyName, year: g.year, month: g.month, role: g.config.role, savedAt: Date.now(), version: SAVE_VERSION };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ meta, payload }, slot);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch (e) {
    console.warn('save failed', e);
    return false;
  }
}

export async function listSaves(): Promise<SaveMeta[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as { meta: SaveMeta }[]).map((x) => x.meta).sort((a, b) => b.savedAt - a.savedAt));
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function loadGame(slot: string): Promise<GameState | null> {
  try {
    const db = await openDb();
    const rec = await new Promise<{ payload: Blob | string } | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(slot);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (!rec) return null;
    return migrate(JSON.parse(await gunzip(rec.payload)));
  } catch (e) {
    console.warn('load failed', e);
    return null;
  }
}

export async function deleteSave(slot: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(slot);
    tx.oncomplete = () => resolve();
  });
}

/** Migrações preservam IDs (GDD §26). */
export function migrate(g: GameState): GameState {
  g.flags ??= {};
  g.player.totals ??= {};
  g.economy.rightsMult ??= 1;
  g.economy.strikeUntil ??= 0;
  g.economy.investorShare ??= 0;
  g.economy.investorUntil ??= 0;
  g.upcoming ??= [];
  ensureExt(g);
  registerMovementGenres(g);
  g.version = SAVE_VERSION;
  return g;
}

export function exportSave(): void {
  const g = store.game;
  if (!g) return;
  const blob = new Blob([JSON.stringify(g)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vinyl-to-neural-${g.signature}-${g.year}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function importSave(file: File): Promise<GameState> {
  return file.text().then((txt) => migrate(JSON.parse(txt)));
}
