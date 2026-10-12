import { INT_PREF23 } from '../sim/interrupt23';
import { ensureExt } from '../sim/ext';
import { migrate18 } from '../sim/ledger18';
import { registerMovementGenres } from '../sim/culture';
// Estado da interface, preferências e persistência (IndexedDB + gzip; GDD §26).

import { getLang, setLang, type Lang } from '../i18n/strings';
import type { GameState } from '../sim/types';
import { SAVE_VERSION } from '../sim/worldgen';
import { decodeSave20, encodeSave20, inflate20, MAX_FILE23, MAX_IN20, MAX_OUT20, now20, SaveError20 } from '../core/save20';
import { errName20, noteCost20, retry20, setHealth20 } from './savehealth20';

export type BaseArea = 'hq' | 'desk' | 'plan' | 'charts' | 'artists' | 'market' | 'media' | 'catalog' | 'creation' | 'shows' | 'company' | 'business' | 'world' | 'diary';
/** Áreas base + áreas registradas pelos sistemas da rodada 4 (registerArea). */
export type Area = BaseArea | (string & {});

export interface Prefs {
  lang: Lang;
  textScale: number;
  contrast: boolean;
  reducedMotion: boolean;
  theme: 'auto' | 'light' | 'dark';
  /** r25: preferências já migradas para o Pixel Studio (escuro padrão) */
  ps25?: boolean;
  colorblind?: 'none' | 'deutan' | 'protan' | 'tritan';
  /** mini-jogos: jogar ou resolver automaticamente */
  minigames?: 'play' | 'auto';
  /** mostrar cenas (premiação, crítica, entrevista) ao avançar o tempo */
  cutscenes?: boolean;
  /** r23 (A): o que interrompe — só decisões, marcos também (padrão) ou tudo */
  interrupt23?: 'decisions' | 'milestones' | 'all';
  /** r27 (K): cenas animadas dos grandes momentos — todas, só importantes ou desligadas */
  cut27?: 'all' | 'major' | 'off';
  /** pele da interface por era */
  eraSkin?: boolean;
  /** r19 (B.5): perguntar antes de avançar quando há cartões que vão valer o padrão (false = não perguntar) */
  ask19?: boolean;
  /** r18 tutorial18: tours vistos, dicas vistas, visitas, trilhas concluídas e o que está desligado */
  /** r19 tutoff19: "Sem tutoriais (já sei jogar)" — desliga tudo que é tutorial de uma vez */
  noTut19?: boolean;
  /** r20 G4: ações fixadas no cabeçalho do artista (ids do registro ui/actions20.ts) */
  pins20?: string[];
  tut18?: { tours: Record<string, number>; tips: Record<string, number>; visits: Record<string, number>; done: Record<string, number>; noTours?: boolean; noTips?: boolean };
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

INT_PREF23.v = store.prefs.interrupt23 ?? 'milestones'; // r23 (A)

function loadPrefs(): Prefs {
  // r25 Pixel Studio: escuro (azul-noite + dourado) é o padrão. Quem tinha 'auto' só porque era o padrão antigo
  // (sem a marca ps25) passa ao escuro uma vez; escolhas explícitas de claro/escuro ficam como estão.
  const def: Prefs = { lang: navigator.language?.startsWith('pt') ? 'pt' : 'en', textScale: 100, contrast: false, reducedMotion: false, theme: 'dark', ps25: true };
  try {
    const raw = localStorage.getItem('vtn:prefs');
    if (raw) { const p = { ...def, ...JSON.parse(raw) } as Prefs; if (!(JSON.parse(raw) as Partial<Prefs>).ps25) { if (p.theme === 'auto') p.theme = 'dark'; p.ps25 = true; } return p; }
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
  root.setAttribute('data-cb', p.colorblind ?? 'none');
  // r25: o atributo sempre diz o tema resolvido ('auto' segue o sistema), para o CSS ter uma única fonte
  let th = p.theme;
  if (th !== 'light' && th !== 'dark') { try { th = window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; } catch { th = 'dark'; } }
  root.setAttribute('data-theme', th);
}

// ---------- IndexedDB ----------
const DB = 'vinyl-to-neural';
const STORE = 'saves';

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function gzip(text: string): Promise<Blob | string> {
  if (typeof CompressionStream === 'undefined') return text;
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).blob();
}

export async function gunzip(data: Blob | string): Promise<string> {
  if (typeof data === 'string') return data;
  return inflate20(data);
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
  /** rodada 17: nome dado pelo jogador, perfil local, tipo (auto/manual), tamanho compactado e resumo */
  name?: string;
  profile?: string;
  kind?: 'auto' | 'manual';
  size?: number;
  player?: string;
  cash?: number;
  ironman?: boolean;
  run?: string;
}

/** Rodada 17: perfil local ativo (várias pessoas no mesmo navegador) e ganchos depois de gravar (nuvem). */
export const profileId17 = (): string => { try { return localStorage.getItem('vtn:profile17') || 'default'; } catch { return 'default'; } };
export const afterSave17: ((g: GameState, slot: string) => void)[] = [];
/** Autosave por partida (não sobrescreve outra run): um por ano em rodízio de 3 (ironman: um só). */
export const runId17 = (g: GameState): string => ((g as { run17?: string }).run17 ??= `${g.signature}-${Date.now().toString(36)}`);
export const autoSlot17 = (g: GameState): string => g.config.ironman ? `auto-${runId17(g)}` : `auto-${runId17(g)}-${g.year % 3}`;

/** r20 (B1): grava e só marca o checkpoint como confirmado depois do oncomplete; falha (quota, IndexedDB
 *  indisponível, transação abortada) fica visível no indicador do topo, com motivo e "tentar de novo". */
export async function saveGame(slot = 'auto', name?: string): Promise<boolean> {
  const g = store.game;
  if (!g) return false;
  const kind = slot === 'auto' ? 'auto' : 'manual';
  if (slot === 'auto' || g.config.ironman) slot = autoSlot17(g);
  const at = { year: g.year, month: g.month, week: g.week, slot, run: runId17(g) };
  retry20.local = () => saveGame(kind === 'auto' ? 'auto' : slot, name);
  setHealth20('local', { st: 'pending' });
  try {
    const t0 = now20();
    const db = await openDb();
    const json = encodeSave20(g);
    const t1 = now20();
    const payload = await gzip(json);
    const t2 = now20();
    const pp = Object.values(g.persons).find((p) => p.isPlayer);
    const meta: SaveMeta = { slot, signature: g.signature, company: g.config.companyName, year: g.year, month: g.month, role: g.config.role, savedAt: Date.now(), version: SAVE_VERSION,
      name, profile: profileId17(), kind, size: typeof payload === 'string' ? payload.length : payload.size, player: pp?.name, cash: Math.round(g.player.cash), ironman: !!g.config.ironman, run: runId17(g) };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ meta, payload }, slot);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new DOMException('aborted', 'AbortError')); // quota estoura no commit: só abort
    });
    noteCost20({ stringifyMs: t1 - t0, packMs: t2 - t1, writeMs: now20() - t2, bytes: json.length, packed: meta.size ?? 0 });
    setHealth20('local', { st: 'ok', lastOk: { ts: Date.now(), ...at } });
    for (const f of afterSave17) try { f(g, slot); } catch { /* nuvem opcional */ }
    return true;
  } catch (e) {
    console.warn('save failed', e);
    setHealth20('local', { st: typeof indexedDB === 'undefined' ? 'unavailable' : 'failed', err: errName20(e), errAt: Date.now() });
    return false;
  }
}

/** r20 (B1): erro de leitura SOBE (a interface mostra "indisponível" + tentar de novo); lista vazia = vazio de verdade. */
export async function listSaves(): Promise<SaveMeta[]> {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as { meta: SaveMeta }[]).map((x) => x.meta).filter((m) => m && m.slot).sort((a, b) => b.savedAt - a.savedAt));
    req.onerror = () => reject(req.error);
  });
}

/** Motivo da última falha de carga (para a interface explicar; o registro gravado nunca é alterado). */
export let lastLoadErr20 = '';

export async function loadGame(slot: string): Promise<GameState | null> {
  try {
    const db = await openDb();
    const rec = await new Promise<{ payload: Blob | string } | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(slot);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    lastLoadErr20 = '';
    if (!rec) return null;
    return decodeSave20(await gunzip(rec.payload), migrate);
  } catch (e) {
    console.warn('load failed', e);
    lastLoadErr20 = e instanceof SaveError20 ? e.code : errName20(e);
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
  g.config.card = 'none'; // r22: a Carta do selo saiu do jogo
  ensureExt(g);
  migrate18(g);
  registerMovementGenres(g);
  g.version = SAVE_VERSION;
  return g;
}

export function exportSave(): boolean {
  const g = store.game;
  if (!g) return false;
  return tryDownload(`masters-${g.signature}-${g.year}.json`, encodeSave20(g));
}

const SAVE_PREFIX = 'VTN1:';

export async function gzipB64(text: string): Promise<string> {
  if (typeof CompressionStream === 'undefined') return 'raw:' + btoa(unescape(encodeURIComponent(text)));
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  const buf = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

export async function unGzipB64(b64: string): Promise<string> {
  if (b64.startsWith('raw:')) return decodeURIComponent(escape(atob(b64.slice(4))));
  if (b64.length > MAX_IN20) throw new SaveError20('too_big');
  let bin: string;
  try { bin = atob(b64); } catch { throw new SaveError20('malformed', 'base64'); }
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return inflate20(buf);
}

/** Save como texto compactado (para copiar e colar onde downloads são bloqueados). */
export async function exportSaveText(): Promise<string> {
  const g = store.game;
  if (!g) return '';
  return SAVE_PREFIX + (await gzipB64(encodeSave20(g)));
}

/** r20 (B5/B6): envelope/versão, limites, profundidade e forma — numa cópia; erro = SaveError20 com código. */
const validateSave = (text: string): GameState => decodeSave20(text, migrate);

/** Aceita JSON puro (cru ou envelope r20) ou o formato compactado (VTN1:...), com espaços/quebras de linha de
 *  copiar e colar. Nada é trocado nem gravado aqui: quem chama decide depois que tudo validou. */
export async function importSaveText(text: string): Promise<GameState> {
  if (text.length > MAX_OUT20) throw new SaveError20('too_big');
  let tx = text.replace(/^\uFEFF/, '').trim();
  if (tx.startsWith('{')) return validateSave(tx);
  tx = tx.replace(/\s+/g, '');
  const i = tx.indexOf(SAVE_PREFIX);
  if (i < 0) throw new SaveError20('format');
  return validateSave(await unGzipB64(tx.slice(i + SAVE_PREFIX.length)));
}

/** Tenta baixar como arquivo; devolve false se o navegador (ex.: visualizador isolado) bloquear. */
export function tryDownload(name: string, content: string, type = 'application/json'): boolean {
  // Dentro do visualizador de artifacts do claude.ai, links de download não funcionam: usa a
  // capacidade "downloads" (o visitante confirma o arquivo). Fora dele, link de blob comum.
  const cl = (window as unknown as { claude?: { use?: (n: string) => Promise<{ save: (r: { filename: string; data: string }) => Promise<unknown> } | null> } }).claude;
  if (cl?.use) {
    void cl.use('downloads').then((d) => (d ? d.save({ filename: name, data: content }) : blobDownload(name, content, type))).catch((e: { code?: string }) => {
      if (e?.code !== 'declined') blobDownload(name, content, type);
    });
    return true;
  }
  return blobDownload(name, content, type);
}

function blobDownload(name: string, content: string, type: string): boolean {
  try {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return true;
  } catch {
    return false;
  }
}

/** Copia um texto para a área de transferência; se não der, devolve false (a interface mostra o texto para seleção). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** r23: toda rota de arquivo checa o tamanho ANTES de ler o texto inteiro. */
export async function readSaveFile23(file: File): Promise<string> {
  if (file.size > MAX_FILE23) throw new SaveError20('too_big');
  return file.text();
}

export function importSave(file: File): Promise<GameState> {
  return readSaveFile23(file).then((txt) => importSaveText(txt));
}
