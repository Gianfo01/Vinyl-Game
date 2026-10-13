// r27 (CHAR): sprites de semelhança das pessoas reais (art/personagens → tools/pack-people27.py → src/assets/people27).
// Busto 64×64 e corpo 96×152 por pessoa, em folhas WebP sem perdas. Só valem no modo nomes reais: com nomes
// fictícios as pessoas reais estão disfarçadas, e um rosto reconhecível as entregaria (fica o procedural).
// A busca é pura (nome → vaga no atlas, homônimos pelo ato); o desenho decodifica cada folha na primeira vez que
// alguém dela aparece e troca o retrato procedural pelo real assim que a folha fica pronta.

import IDX from '../../assets/people27/index.json';
import { BODY_URLS27, BUST_URLS27 } from '../../assets/people27/sheets';
import { canonKey, dedupKey27, realDataOf, rw } from '../../sim/sys/realworld';
import { actsOfPerson17 } from '../../sim/actidx17';
import type { Act, GameState, Person } from '../../sim/types';

interface Idx27 {
  v: number;
  bust: { w: number; h: number; cols: number; per: number; sheets: [number, number][] };
  body: { w: number; h: number; sheets: [number, number][] };
  /** nomes na ordem das vagas (homônimos com o ato entre parênteses) */
  n: string[];
  /** ano da fase retratada */
  y: number[];
  /** corpos: [folha, x, y, w, h, dx, dy] × n (dx, dy = canto do recorte no quadro 96×152) */
  c: number[];
  /** homônimos: nome no índice → atos */
  h: Record<string, string[]>;
}
const X = IDX as unknown as Idx27;

export interface Rect27 { sheet: number; x: number; y: number; w: number; h: number }
export interface Sprite27 {
  slot: number;
  /** nome no índice (homônimos com o ato) */
  key: string;
  /** fase retratada (o sprite vale para todas as idades por enquanto) */
  year: number;
  bust: Rect27;
  /** recorte do corpo; dx, dy = onde ele fica no quadro 96×152 */
  body: Rect27 & { dx: number; dy: number };
}

export const BUST27 = 64;
export const BODY_W27 = 96;
export const BODY_H27 = 152;
export const COUNT27 = X.n.length;

// ---------------------------------------------------------------- índice (puro)

const baseName = (n: string): string => n.replace(/ \([^)]*\)$/, '');
let BY_NAME: Map<string, number[]> | null = null;
let BY_KEY: Map<string, number[]> | null = null;
function maps(): [Map<string, number[]>, Map<string, number[]>] {
  if (!BY_NAME || !BY_KEY) {
    BY_NAME = new Map();
    BY_KEY = new Map();
    X.n.forEach((n, i) => {
      const b = baseName(n);
      const k = canonKey(b);
      (BY_NAME!.get(b) ?? BY_NAME!.set(b, []).get(b)!).push(i);
      if (k) (BY_KEY!.get(k) ?? BY_KEY!.set(k, []).get(k)!).push(i);
    });
  }
  return [BY_NAME, BY_KEY];
}

/** Vagas candidatas para um nome real (grafia exata primeiro; depois a chave canônica, que une apelidos). */
export function slotsForName27(name: string): number[] {
  const [byName, byKey] = maps();
  return byName.get(name) ?? byKey.get(canonKey(name)) ?? [];
}

/** Vaga do sprite com o nome de um ato (o ato era solo quando a arte foi feita e o desenho é o do líder: "Santana"
 *  = Carlos Santana na era Woodstock). Só vale para o líder (1º integrante nos dados reais). */
function actSlot(act: string): number | undefined {
  const i = maps()[0].get(act)?.find((j) => X.n[j] === act);
  return i;
}

/** Vaga do sprite de `name`. Homônimos (Roger Taylor do Queen × do Duran Duran) só casam pelo ato: `acts` são os
 *  nomes dos atos da pessoa (atuais e antigos). Sem ato que confirme, nada (melhor procedural que o rosto errado).
 *  Sem sprite próprio, quem lidera um ato real (`leads`) herda o sprite com o nome do ato, se houver. */
export function slotFor27(name: string, acts: () => string[], leads: () => string[] = () => []): number | undefined {
  const c = slotsForName27(name);
  if (!c.length) {
    for (const a of leads()) { const i = actSlot(a); if (i !== undefined) return i; }
    return undefined;
  }
  const homo = (i: number) => X.h[X.n[i]];
  if (c.length === 1 && !homo(c[0])) return c[0];
  const mine = new Set(acts().map(dedupKey27));
  const hit = c.find((i) => homo(i)?.some((a) => mine.has(dedupKey27(a))));
  if (hit !== undefined) return hit;
  return c.find((i) => !homo(i)); // um homônimo sem parênteses é o "padrão"
}

/** Retângulos do sprite de uma vaga. */
export function spriteAt27(slot: number): Sprite27 {
  const b = X.bust;
  const k = slot % b.per;
  const c = X.c.slice(slot * 7, slot * 7 + 7);
  return {
    slot, key: X.n[slot], year: X.y[slot],
    bust: { sheet: Math.floor(slot / b.per), x: (k % b.cols) * b.w, y: Math.floor(k / b.cols) * b.h, w: b.w, h: b.h },
    body: { sheet: c[0], x: c[1], y: c[2], w: c[3], h: c[4], dx: c[5], dy: c[6] },
  };
}

/** Tamanho (largura, altura) de cada folha — para conferir limites. */
export const sheetSize27 = (kind: 'bust' | 'body', i: number): [number, number] | undefined => X[kind].sheets[i];
export const sheetCount27 = (kind: 'bust' | 'body'): number => X[kind].sheets.length;

/** Atos (atuais e antigos) de uma pessoa. */
function actsOf(s: GameState, pid: string): Act[] {
  const out = [...actsOfPerson17(s, pid)];
  const former = rw(s)?.former ?? {};
  for (const [aid, xs] of Object.entries(former)) if (s.acts[aid] && !out.includes(s.acts[aid]) && xs.some((x) => x.personId === pid)) out.push(s.acts[aid]);
  return out;
}
/** Atos reais que a pessoa lidera nos dados (1º integrante da formação documentada; solo = o próprio ato). */
function leadsOf(s: GameState, p: Person): string[] {
  const k = canonKey(p.name);
  const out: string[] = [];
  for (const a of actsOf(s, p.id)) {
    const d = realDataOf(a);
    const lead = d?.m?.[0]?.[0];
    // o ato não pode ter integrante com o próprio nome (Quinteto do Hot Club: o sprite "Django Reinhardt" é dele, não do 1º)
    if (d && lead && canonKey(lead) === k && !d.m!.some((m) => canonKey(m[0]) === canonKey(d.n))) out.push(d.n);
  }
  return out;
}

/** É uma pessoa real? (r27 marca todas com `real27`; saves antigos: integrante atual de ato real). */
function isReal(s: GameState, p: Person): boolean {
  if (p.real27) return true;
  return actsOfPerson17(s, p.id).some((a) => a.catalogNo !== undefined);
}

const CACHE = new WeakMap<GameState, Map<string, number>>();
/** Vaga do sprite da pessoa `pid` na partida, ou undefined (fictícia, nomes fictícios, jogador ou sem arte). */
export function realSlot27(s: GameState | null | undefined, pid: string): number | undefined {
  if (!s?.config.realNames) return undefined;
  const p = s.persons[pid];
  if (!p || p.isPlayer) return undefined;
  let m = CACHE.get(s);
  if (!m) CACHE.set(s, (m = new Map()));
  const ck = `${pid}|${p.name}`;
  let v = m.get(ck);
  if (v === undefined) {
    v = isReal(s, p) ? slotFor27(p.name, () => actsOf(s, pid).flatMap((a) => [a.name, realDataOf(a)?.n ?? a.name]), () => leadsOf(s, p)) ?? -1 : -1;
    if (m.size > 20000) m.clear();
    m.set(ck, v);
  }
  return v >= 0 ? v : undefined;
}

/** Sprite real da pessoa (busto e corpo), ou undefined → arte procedural de sempre. */
export function realSprite27(s: GameState | null | undefined, p: { id: string } | undefined): Sprite27 | undefined {
  if (!p) return undefined;
  const slot = realSlot27(s, p.id);
  return slot === undefined ? undefined : spriteAt27(slot);
}

// ---------------------------------------------------------------- folhas (navegador)

type Kind = 'bust' | 'body';
interface Sheet { img?: HTMLImageElement; loading?: boolean; failed?: boolean }
const SHEETS: Record<Kind, Sheet[]> = { bust: [], body: [] };
const URLS: Record<Kind, string[]> = { bust: BUST_URLS27, body: BODY_URLS27 };
/** quem espera alguma folha: devolve true quando terminou (sai da fila) */
const WAITERS = new Set<() => boolean>();

function loaded(): void {
  for (const w of [...WAITERS]) {
    try { if (w()) WAITERS.delete(w); } catch { WAITERS.delete(w); }
  }
}

/** A folha decodificada (pronta para drawImage) ou undefined — e começa a carregar na primeira chamada. */
export function sheet27(kind: Kind, i: number): HTMLImageElement | undefined {
  const sh = (SHEETS[kind][i] ??= {});
  if (sh.img) return sh.img;
  if (sh.loading || sh.failed || typeof Image === 'undefined' || !URLS[kind][i]) return undefined;
  sh.loading = true;
  const img = new Image();
  img.decoding = 'async';
  img.src = URLS[kind][i];
  const ok = () => { sh.loading = false; sh.img = img; loaded(); };
  const bad = () => { sh.loading = false; sh.failed = true; loaded(); };
  if (typeof img.decode === 'function') img.decode().then(ok, () => (img.complete && img.naturalWidth ? ok() : bad()));
  else { img.onload = ok; img.onerror = bad; }
  return undefined;
}

/** Chama `fn` quando a folha ficar pronta (na hora, se já estiver). Falha de carga: não chama (fica o procedural). */
export function whenSheet27(kind: Kind, i: number, fn: () => void): void {
  if (sheet27(kind, i)) { fn(); return; }
  WAITERS.add(() => {
    const sh = SHEETS[kind][i];
    if (sh?.img) { fn(); return true; }
    return !!sh?.failed;
  });
}

/** Algum quadro de busto já pronto (para desenhar sem esperar). */
export const bustReady27 = (sp: Sprite27): boolean => !!sheet27('bust', sp.bust.sheet);
export const bodyReady27 = (sp: Sprite27): boolean => !!sheet27('body', sp.body.sheet);

/** Janela do busto (no quadro 64×64) para um destino de `size` px: escala inteira e recorte centrado no rosto.
 *  64·k cabe inteiro; entre um múltiplo e outro corta as bordas (96 px = janela 48 em 2×); 32 px = 2:1 do busto
 *  inteiro (legível e com figurino); menor que 32 = janela 48 (cabeça e ombros) com redução suave. */
export function bustWindow27(size: number): { x: number; y: number; w: number; smooth: boolean } {
  if (size === 32) return { x: 0, y: 0, w: BUST27, smooth: false };
  if (size < 32) return { x: 8, y: 6, w: 48, smooth: true };
  const k = Math.ceil(size / BUST27);
  const w = size / k;
  const off = BUST27 - w;
  return { x: Math.round(off / 2), y: Math.round(off * 0.35), w, smooth: false };
}

/** Desenha o busto em (0,0,size,size). Devolve false se a folha ainda não está pronta. */
export function drawBust27(ctx: CanvasRenderingContext2D, sp: Sprite27, size: number): boolean {
  const img = sheet27('bust', sp.bust.sheet);
  if (!img) return false;
  const win = bustWindow27(size);
  ctx.imageSmoothingEnabled = win.smooth;
  if (win.smooth) ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sp.bust.x + win.x, sp.bust.y + win.y, win.w, win.w, 0, 0, size, size);
  ctx.imageSmoothingEnabled = false;
  return true;
}

/** Desenha o corpo inteiro com o canto do quadro 96×152 em (x, y), escala inteira `k`. */
export function drawBody27(ctx: CanvasRenderingContext2D, sp: Sprite27, x: number, y: number, k = 1, flip = false): boolean {
  const img = sheet27('body', sp.body.sheet);
  if (!img) return false;
  const b = sp.body;
  ctx.imageSmoothingEnabled = false;
  if (!flip) ctx.drawImage(img, b.x, b.y, b.w, b.h, x + b.dx * k, y + b.dy * k, b.w * k, b.h * k);
  else {
    ctx.save();
    ctx.translate(x + BODY_W27 * k, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, b.x, b.y, b.w, b.h, b.dx * k, b.dy * k, b.w * k, b.h * k);
    ctx.restore();
  }
  return true;
}

/** Canvas do corpo inteiro em escala `k` (96k × 152k). Se a folha ainda carrega, desenha quando chegar. */
export function bodyCanvas27(sp: Sprite27, k = 2, cls = 'px body27'): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = BODY_W27 * k;
  c.height = BODY_H27 * k;
  c.className = cls;
  const paint = () => { const ctx = c.getContext('2d'); if (ctx) drawBody27(ctx, sp, 0, 0, k); };
  whenSheet27('body', sp.body.sheet, paint);
  return c;
}

/** Testes/diagnóstico: quantas folhas já foram decodificadas. */
export const sheetsLoaded27 = (): { bust: number; body: number } => ({ bust: SHEETS.bust.filter((x) => x?.img).length, body: SHEETS.body.filter((x) => x?.img).length });
