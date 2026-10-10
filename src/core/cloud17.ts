// Rodada 17 — saves na nuvem por pessoa (runtime de artifacts do claude.ai: capacidades `db` + `user`).
// Cada visitante grava só no próprio subtrecho privado data/users/<id>/ (nem o dono do artifact lê).
// Documento máx. 256 KiB → o save vai gzip + base64 em pedaços de ~180 KB, e um doc de índice por slot:
//   índice:  data/users/<id>/saves/index/<slot>   {slot,name,year,label,chunks,size,ts,gen}
//   pedaços: data/users/<id>/saves/<slot>/c<n>     {gen,i,d}
// Ordem segura: pedaços primeiro, índice por último (gen confere que todos os pedaços são da mesma gravação).
// Puro e testável: recebe um `DbLike` (o db real do runtime ou um falso nos testes).

export const CHUNK17 = 180_000;

export interface SnapLike { exists: boolean; data(): Record<string, unknown> | undefined }
export interface DocLike { get(): Promise<SnapLike>; set(d: Record<string, unknown>): Promise<void>; delete(): Promise<void> }
export interface DbLike { doc(path: string): DocLike; collection(path: string): { get(): Promise<{ docs: (SnapLike & { id: string })[] }> } }

export interface CloudMeta { slot: string; name: string; year: number; label: string; chunks: number; size: number; ts: number; gen: string; run?: string; player?: string }

/** Slot válido como segmento de caminho (letras, dígitos, _ - .), sempre com prefixo (nunca colide com "index"). */
export const cloudSlot = (raw: string): string => `s-${raw.replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 120)}`;

export const cloudPaths = (uid: string, slot: string) => ({
  index: `data/users/${uid}/saves/index`,
  meta: `data/users/${uid}/saves/index/${slot}`,
  chunk: (i: number) => `data/users/${uid}/saves/${slot}/c${i}`,
});

/** gzip + base64 (sem CompressionStream: 'raw:' + base64 do texto). */
export async function pack17(text: string): Promise<string> {
  if (typeof CompressionStream === 'undefined') return 'raw:' + b64(new TextEncoder().encode(text));
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return b64(new Uint8Array(await new Response(stream).arrayBuffer()));
}

export async function unpack17(data: string): Promise<string> {
  if (data.startsWith('raw:')) return new TextDecoder().decode(unb64(data.slice(4)));
  const stream = new Blob([unb64(data)]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
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

const gen = () => Math.random().toString(36).slice(2, 10);

/** Grava o save (JSON) no slot; devolve o índice gravado. Erros do db sobem (a interface traduz o código). */
export async function cloudSave17(db: DbLike, uid: string, slot: string, json: string, meta: Omit<CloudMeta, 'slot' | 'chunks' | 'size' | 'ts' | 'gen'>): Promise<CloudMeta> {
  const P = cloudPaths(uid, slot);
  const data = await pack17(json);
  const parts = chunks17(data);
  const g = gen();
  const old = await db.doc(P.meta).get();
  const oldN = old.exists ? Number(old.data()?.chunks ?? 0) : 0;
  for (let i = 0; i < parts.length; i++) await db.doc(P.chunk(i)).set({ gen: g, i, d: parts[i] });
  const m: CloudMeta = { ...meta, slot, chunks: parts.length, size: data.length, ts: Date.now(), gen: g };
  await db.doc(P.meta).set(m as unknown as Record<string, unknown>);
  for (let i = parts.length; i < oldN; i++) await db.doc(P.chunk(i)).delete().catch(() => undefined);
  return m;
}

/** Lê o save do slot (JSON) ou null se não existe; erro se um pedaço faltar ou for de outra gravação. */
export async function cloudLoad17(db: DbLike, uid: string, slot: string): Promise<string | null> {
  const P = cloudPaths(uid, slot);
  const ms = await db.doc(P.meta).get();
  if (!ms.exists) return null;
  const m = ms.data() as unknown as CloudMeta;
  const parts = await Promise.all(Array.from({ length: m.chunks }, (_, i) => db.doc(P.chunk(i)).get()));
  const out: string[] = [];
  for (const p of parts) {
    const d = p.data();
    if (!p.exists || !d || d.gen !== m.gen) throw new Error('incomplete');
    out[Number(d.i)] = String(d.d);
  }
  return unpack17(out.join(''));
}

export async function cloudList17(db: DbLike, uid: string): Promise<CloudMeta[]> {
  const q = await db.collection(cloudPaths(uid, 'x').index).get();
  return q.docs.filter((d) => d.exists).map((d) => d.data() as unknown as CloudMeta).filter((m) => m && m.slot).sort((a, b) => b.ts - a.ts);
}

export async function cloudDelete17(db: DbLike, uid: string, slot: string): Promise<void> {
  const P = cloudPaths(uid, slot);
  const ms = await db.doc(P.meta).get();
  const n = ms.exists ? Number(ms.data()?.chunks ?? 0) : 0;
  await db.doc(P.meta).delete();
  for (let i = 0; i < n; i++) await db.doc(P.chunk(i)).delete().catch(() => undefined);
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
