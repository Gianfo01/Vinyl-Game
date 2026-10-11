// Rodada 17 — saves na nuvem por pessoa (runtime de artifacts do claude.ai: capacidades `db` + `user`).
// Cada visitante grava só no próprio subtrecho privado data/users/<id>/ (nem o dono do artifact lê).
// Documento máx. 256 KiB → o save vai gzip + base64 em pedaços de ~180 KB, e um doc de índice por slot:
//   índice:  data/users/<id>/saves/index/<slot>   {slot,name,year,label,chunks,size,ts,gen}
//   pedaços: data/users/<id>/saves/<slot>/c<n>     {gen,i,d}
// Ordem segura: pedaços primeiro, índice por último (gen confere que todos os pedaços são da mesma gravação).
// Rodada 20 (B2): pedaços IMUTÁVEIS por geração — data/users/<id>/saves/<slot>/g<gen>-c<n> (layout 2) — e o índice
// é o ponteiro publicado por último (com hash do conteúdo). A geração anterior continua inteira e carregável até
// o novo índice ser gravado; só depois os pedaços antigos são apagados. Gravações do mesmo slot são enfileiradas
// e, antes de publicar, o índice é relido: se outra gravação publicou no meio, esta desiste ('conflict') e limpa
// os próprios pedaços. Índices antigos (sem layout) continuam lidos pelos caminhos c<n>.
// Puro e testável: recebe um `DbLike` (o db real do runtime ou um falso nos testes).

import { hash20, inflate20 } from './save20';

export const CHUNK17 = 180_000;

export interface SnapLike { exists: boolean; data(): Record<string, unknown> | undefined }
export interface DocLike { get(): Promise<SnapLike>; set(d: Record<string, unknown>): Promise<void>; delete(): Promise<void> }
export interface DbLike { doc(path: string): DocLike; collection(path: string): { get(): Promise<{ docs: (SnapLike & { id: string })[] }> } }

export interface CloudMeta { slot: string; name: string; year: number; label: string; chunks: number; size: number; ts: number; gen: string; run?: string; player?: string; layout?: 2; hash?: string }

/** Slot válido como segmento de caminho (letras, dígitos, _ - .), sempre com prefixo (nunca colide com "index"). */
export const cloudSlot = (raw: string): string => `s-${raw.replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 120)}`;

export const cloudPaths = (uid: string, slot: string) => ({
  index: `data/users/${uid}/saves/index`,
  meta: `data/users/${uid}/saves/index/${slot}`,
  chunk: (i: number) => `data/users/${uid}/saves/${slot}/c${i}`,
  /** r20: pedaço imutável da geração `gen` */
  gchunk: (gen: string, i: number) => `data/users/${uid}/saves/${slot}/g${gen}-c${i}`,
});
/** Caminho do pedaço i conforme o layout do índice (antigo: c<n>; r20: g<gen>-c<n>). */
const chunkPath = (P: ReturnType<typeof cloudPaths>, m: Pick<CloudMeta, 'gen' | 'layout'>, i: number) => (m.layout === 2 ? P.gchunk(m.gen, i) : P.chunk(i));

/** gzip + base64 (sem CompressionStream: 'raw:' + base64 do texto). */
export async function pack17(text: string): Promise<string> {
  if (typeof CompressionStream === 'undefined') return 'raw:' + b64(new TextEncoder().encode(text));
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return b64(new Uint8Array(await new Response(stream).arrayBuffer()));
}

export async function unpack17(data: string): Promise<string> {
  if (data.startsWith('raw:')) return new TextDecoder().decode(unb64(data.slice(4)));
  return inflate20(unb64(data));
}

function b64(buf: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}
function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const chunks17 = (s: string, n = CHUNK17): string[] => { const out: string[] = []; for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n)); return out.length ? out : ['']; };

const gen = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 12) : Math.random().toString(36).slice(2, 12));

/** Fila por slot (no mesmo navegador): duas gravações do mesmo slot nunca se intercalam. */
const QUEUE = new Map<string, Promise<unknown>>();

/** Grava o save (JSON) no slot; devolve o índice gravado. Erros do db sobem (a interface traduz o código).
 *  Falha em qualquer pedaço: o índice antigo (e seus pedaços) fica intacto; os pedaços novos são limpos. */
export function cloudSave17(db: DbLike, uid: string, slot: string, json: string, meta: Omit<CloudMeta, 'slot' | 'chunks' | 'size' | 'ts' | 'gen'>): Promise<CloudMeta> {
  const k = `${uid}/${slot}`;
  const run = (QUEUE.get(k) ?? Promise.resolve()).catch(() => undefined).then(() => saveNow(db, uid, slot, json, meta));
  QUEUE.set(k, run);
  void run.finally(() => { if (QUEUE.get(k) === run) QUEUE.delete(k); }).catch(() => undefined);
  return run;
}

async function saveNow(db: DbLike, uid: string, slot: string, json: string, meta: Omit<CloudMeta, 'slot' | 'chunks' | 'size' | 'ts' | 'gen'>): Promise<CloudMeta> {
  const P = cloudPaths(uid, slot);
  const data = await pack17(json);
  const parts = chunks17(data);
  const g = gen();
  const old = await db.doc(P.meta).get();
  const om = old.exists ? (old.data() as unknown as CloudMeta) : null;
  const cleanNew = async (n: number) => { for (let i = 0; i < n; i++) await db.doc(P.gchunk(g, i)).delete().catch(() => undefined); };
  let i = 0;
  try { for (; i < parts.length; i++) await db.doc(P.gchunk(g, i)).set({ gen: g, i, d: parts[i] }); } catch (e) { await cleanNew(i + 1); throw e; }
  // compare-and-set: o ponteiro não mudou desde que começamos?
  const cur = await db.doc(P.meta).get();
  const cm = cur.exists ? (cur.data() as unknown as CloudMeta) : null;
  if ((cm?.gen ?? null) !== (om?.gen ?? null)) { await cleanNew(parts.length); throw Object.assign(new Error('conflict'), { code: 'conflict' }); }
  const m: CloudMeta = { ...meta, slot, chunks: parts.length, size: data.length, ts: Date.now(), gen: g, layout: 2, hash: hash20(data) };
  try { await db.doc(P.meta).set(m as unknown as Record<string, unknown>); } catch (e) {
    // resposta perdida mas gravado? relê antes de limpar (nunca apaga pedaços que o ponteiro publicado usa)
    const re = await db.doc(P.meta).get().catch(() => null);
    if (re?.exists && re.data()?.gen === g) return m;
    await cleanNew(parts.length);
    throw e;
  }
  // só depois do commit: apaga a geração anterior inteira
  if (om) for (let j = 0; j < Number(om.chunks ?? 0); j++) await db.doc(chunkPath(P, om, j)).delete().catch(() => undefined);
  return m;
}

/** Lê o save do slot (JSON) ou null se não existe; erro se um pedaço faltar ou for de outra gravação. */
export async function cloudLoad17(db: DbLike, uid: string, slot: string): Promise<string | null> {
  const P = cloudPaths(uid, slot);
  const ms = await db.doc(P.meta).get();
  if (!ms.exists) return null;
  const m = ms.data() as unknown as CloudMeta;
  const parts = await Promise.all(Array.from({ length: m.chunks }, (_, i) => db.doc(chunkPath(P, m, i)).get()));
  const out: string[] = [];
  for (const p of parts) {
    const d = p.data();
    if (!p.exists || !d || d.gen !== m.gen) throw new Error('incomplete');
    out[Number(d.i)] = String(d.d);
  }
  const data = out.join('');
  if (m.hash && hash20(data) !== m.hash) throw new Error('incomplete');
  return unpack17(data);
}

export async function cloudList17(db: DbLike, uid: string): Promise<CloudMeta[]> {
  const q = await db.collection(cloudPaths(uid, 'x').index).get();
  return q.docs.filter((d) => d.exists).map((d) => d.data() as unknown as CloudMeta).filter((m) => m && m.slot).sort((a, b) => b.ts - a.ts);
}

export async function cloudDelete17(db: DbLike, uid: string, slot: string): Promise<void> {
  const P = cloudPaths(uid, slot);
  const ms = await db.doc(P.meta).get();
  const m = ms.exists ? (ms.data() as unknown as CloudMeta) : null;
  await db.doc(P.meta).delete();
  if (m) for (let i = 0; i < Number(m.chunks ?? 0); i++) await db.doc(chunkPath(P, m, i)).delete().catch(() => undefined);
}

/** Renomeia só o índice (os pedaços não mudam). */
export async function cloudRename17(db: DbLike, uid: string, slot: string, name: string): Promise<void> {
  const P = cloudPaths(uid, slot);
  const ms = await db.doc(P.meta).get();
  if (!ms.exists) return;
  await db.doc(P.meta).set({ ...ms.data(), name: name.slice(0, 60) });
}

/** Banco falso em memória (testes e modo de demonstração). Rejeita docs > 256 KiB como o runtime. */
export function memDb17(): DbLike & { store: Map<string, Record<string, unknown>> } {
  const store = new Map<string, Record<string, unknown>>();
  const snap = (id: string, v?: Record<string, unknown>) => ({ id, exists: !!v, data: () => (v ? JSON.parse(JSON.stringify(v)) : undefined) });
  return {
    store,
    doc: (path: string) => ({
      get: async () => snap(path.split('/').pop()!, store.get(path)),
      set: async (d) => { if (JSON.stringify(d).length > 256 * 1024) throw Object.assign(new Error('too big'), { code: 'invalid_argument' }); store.set(path, JSON.parse(JSON.stringify(d))); },
      delete: async () => { store.delete(path); },
    }),
    collection: (path: string) => ({
      get: async () => ({ docs: [...store.entries()].filter(([k]) => k.startsWith(path + '/') && k.split('/').length === path.split('/').length + 1).map(([k, v]) => snap(k.split('/').pop()!, v)) }),
    }),
  };
}
