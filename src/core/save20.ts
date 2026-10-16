// Rodada 20 (G1) — formato de save versionado, importação segura e avanço transacional.
// Puro (sem DOM): usado por ui/store (local/arquivo/texto) e core/cloud17 (nuvem).
//
// Envelope (B6):  {"$masters":1,"formatVersion":2,"saveVersion":6,"rngVersion":31,"game":{...}}
//   formatVersion  = forma do arquivo (1 = jogo "cru" das rodadas antigas, ainda aceito; 2 = envelope)
//   saveVersion    = esquema do estado (SAVE_VERSION); migrações em sequência v → v+1 (MIG20) e depois o backfill
//   rngVersion     = fluxos de sorteio (s.rngVersion; RNG_VERSION19): sem ele a mesma semente contaria outra história
// Versão do futuro (qualquer um dos três acima do que este build conhece) é RECUSADA sem tocar no original.
//
// Limites (B5): texto de entrada, tamanho expandido (contado durante a descompressão, que é cortada no teto),
// profundidade do JSON e forma mínima do estado — tudo verificado numa cópia, antes de trocar o jogo ou gravar.
//
// Custo (B26): measure20() cronometra serialização/compressão/gravação; o último resultado aparece no indicador de
// save. Medido (Node, 1975, sem jogador): JSON 2,3→7,9 MB em 0→3 anos; stringify 31→98 ms (síncrono), gzip
// 85→331 ms (assíncrono, fora do quadro no navegador), parse 18→119 ms. Bem abaixo do custo de um mês simulado;
// nada domina a ponto de justificar Worker/save incremental agora — o indicador mostra o custo real para reavaliar.

import { RNG_VERSION19 } from '../sim/rng19';
import type { GameState } from '../sim/types';
import { MIN_SAVE_VERSION, SAVE_VERSION } from '../sim/worldgen';

export const FORMAT20 = 2;
/** Texto de entrada compactado (VTN1/base64 ou arquivo compactado). r23: 96 → 32 MiB. */
export const MAX_IN20 = 32 * 1024 * 1024;
/** JSON expandido (depois do gzip) — acima de uma partida longa, abaixo do que trava a aba. r23: 384 → 128 MiB. */
export const MAX_OUT20 = 128 * 1024 * 1024;
/** r23: arquivo/colagem de save (JSON cru ou VTN1) — checado antes de ler o texto inteiro. */
export const MAX_FILE23 = MAX_OUT20;
export const MAX_DEPTH20 = 256;

export type SaveErrCode = 'too_big' | 'malformed' | 'future' | 'schema' | 'format' | 'old' | 'old31';
export class SaveError20 extends Error {
  constructor(public code: SaveErrCode, public detail = '') { super(`save20:${code}${detail ? ' ' + detail : ''}`); }
}

export interface Envelope20 { $masters: 1; formatVersion: number; saveVersion: number; rngVersion: number; game: GameState }

/** Serializa o jogo dentro do envelope versionado. */
export function encodeSave20(g: GameState): string {
  return `{"$masters":1,"formatVersion":${FORMAT20},"saveVersion":${SAVE_VERSION},"rngVersion":${g.rngVersion ?? 0},"game":${JSON.stringify(g)}}`;
}

/** Migrações em sequência: MIG20[v] leva um estado da versão v para v+1. As antigas (1→5) foram backfills
 *  idempotentes e vivem no `migrate` final (ui/store); novas mudanças de esquema entram aqui, nunca no lugar. */
export const MIG20: Record<number, (g: GameState) => void> = {};

/** Profundidade máxima sem recursão (JSON patológico não estoura a pilha). */
export function depthOk20(v: unknown, max = MAX_DEPTH20): boolean {
  const st: [unknown, number][] = [[v, 0]];
  while (st.length) {
    const [x, d] = st.pop()!;
    if (!x || typeof x !== 'object') continue;
    if (d > max) return false;
    for (const k in x as object) { const y = (x as Record<string, unknown>)[k]; if (y && typeof y === 'object') st.push([y, d + 1]); }
  }
  return true;
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Forma mínima do estado (antes e depois de migrar): lista de problemas, vazia = ok. */
export function schemaProblems20(x: unknown): string[] {
  const p: string[] = [];
  if (!isObj(x)) return ['root'];
  for (const k of ['player', 'economy', 'acts', 'config'] as const) if (!isObj(x[k])) p.push(k);
  if (x.persons !== undefined && !isObj(x.persons)) p.push('persons');
  if (typeof x.signature !== 'string' || !x.signature) p.push('signature');
  if (!isNum(x.year) || x.year < 1800 || x.year > 2300) p.push('year');
  if (x.month !== undefined && (!Number.isInteger(x.month) || (x.month as number) < 0 || (x.month as number) > 11)) p.push('month');
  if (isObj(x.player) && x.player.cash !== undefined && typeof x.player.cash !== 'number') p.push('player.cash');
  if (isObj(x.acts)) for (const [id, a] of Object.entries(x.acts)) if (!isObj(a)) { p.push(`acts.${id}`); break; }
  if (isObj(x.persons)) for (const [id, a] of Object.entries(x.persons)) if (!isObj(a)) { p.push(`persons.${id}`); break; }
  return p;
}

/** Lê o envelope (ou o jogo cru antigo), recusa futuro/inválido e devolve o jogo migrado — sempre numa cópia nova.
 *  `backfill` é o migrate idempotente da interface (defaults, ext, ledger). */
export function decodeSave20(text: string, backfill: (g: GameState) => GameState): GameState {
  if (text.length > MAX_OUT20) throw new SaveError20('too_big');
  let raw: unknown;
  try { raw = JSON.parse(text); } catch (e) { throw new SaveError20('malformed', (e as Error)?.name ?? ''); }
  if (!depthOk20(raw)) throw new SaveError20('malformed', 'depth');
  let fmt = 1, sv: number, rv: number, game: unknown = raw;
  if (isObj(raw) && raw.$masters === 1) {
    fmt = isNum(raw.formatVersion) ? raw.formatVersion : NaN;
    if (!(fmt >= 1)) throw new SaveError20('format');
    game = raw.game;
    sv = isNum(raw.saveVersion) ? raw.saveVersion : 0;
    rv = isNum(raw.rngVersion) ? raw.rngVersion : 0;
  } else { sv = 0; rv = 0; }
  if (!isObj(game)) throw new SaveError20('schema', 'root');
  sv = Math.max(sv, isNum(game.version) ? game.version : 1);
  rv = Math.max(rv, isNum(game.rngVersion) ? game.rngVersion : 0);
  if (fmt > FORMAT20 || sv > SAVE_VERSION || rv > RNG_VERSION19) throw new SaveError20('future', `f${fmt} v${sv} r${rv}`);
  const bad = schemaProblems20(game);
  if (bad.length) throw new SaveError20('schema', bad.join(','));
  if (sv < MIN_SAVE_VERSION) throw new SaveError20('old', `v${sv}`); // r27 (F): save de antes do modelo histórico novo
  if (rv < RNG_VERSION19) throw new SaveError20('old31', `r${rv}`); // r31: sorteio de antes da 31 (regra 5: sem ponte)
  const g = game as unknown as GameState;
  for (let v = Math.max(1, Math.floor(sv)); v < SAVE_VERSION; v++) MIG20[v]?.(g);
  const out = backfill(g);
  const bad2 = schemaProblems20(out);
  if (bad2.length) throw new SaveError20('schema', 'post:' + bad2.join(','));
  return out;
}

/** Expande gzip contando bytes: corta (e cancela o fluxo) ao passar do teto, antes de montar a string inteira. */
export async function inflate20(bytes: Uint8Array | Blob, max = MAX_OUT20): Promise<string> {
  const src = bytes instanceof Blob ? bytes : new Blob([bytes as BlobPart]);
  const rd = src.stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const dec = new TextDecoder();
  const out: string[] = [];
  let n = 0;
  for (;;) {
    let r: ReadableStreamReadResult<Uint8Array>;
    try { r = await rd.read(); } catch (e) { throw new SaveError20('malformed', (e as Error)?.name ?? 'gzip'); }
    if (r.done) break;
    n += r.value.byteLength;
    if (n > max) { void rd.cancel().catch(() => undefined); throw new SaveError20('too_big'); }
    out.push(dec.decode(r.value, { stream: true }));
  }
  out.push(dec.decode());
  return out.join('');
}

/** FNV-1a 32 bits (hex) — confere que os pedaços da nuvem remontam exatamente o que foi gravado. */
export function hash20(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Cronômetro simples (B26). */
export const now20 = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());
export interface Cost20 { stringifyMs: number; packMs: number; writeMs: number; bytes: number; packed: number }

export type Tx20<T> = { ok: true; g: GameState; r: T } | { ok: false; g: GameState; err: unknown };
/** Avanço transacional (B27): roda `fn` no jogo; se lançar, devolve o estado anterior restaurado do instantâneo
 *  (o jogo meio-mutado é descartado; o checkpoint gravado não é tocado). Vale também no ironman: isso não é o
 *  "desfazer" voluntário, é a proteção contra erro de software. */
export function tx20<T>(g: GameState, fn: (g: GameState) => T, restore: (snap: string) => GameState, snap = JSON.stringify(g)): Tx20<T> {
  try { return { ok: true, g, r: fn(g) }; } catch (err) {
    try { console.error('advance failed — state restored', err); } catch { /* sem console */ }
    return { ok: false, g: restore(snap), err };
  }
}
