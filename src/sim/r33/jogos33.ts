// R33 · APARELHOS33 — MINIJOGOS JOGÁVEIS (lógica pura, sem DOM; desenho em ui/r33/aparelhos33px.ts).
// Um jogo por época, todos com teclado e todos determinísticos pela semente (mesma semente + mesmas teclas = mesma
// partida, o que o teste confere):
//   1982 PC     tênis de dois traços (`tennis`) e labirinto (`maze`)
//   1997 celular cobrinha (`snake`)
//   2007 celular quebra-cabeça de blocos (`blocks`)
//   2012 celular toque rápido (`tap`)
//   2032        cobrinha em holograma (`holo`): a mesma cobrinha, bordas que dão a volta e camada de profundidade
// Cada jogo: `new*(seed)` cria, `step*(g, tecla?)` avança um tique; `g.over` fecha a partida e `g.score` é o placar.
// O fim da partida (alívio de estresse, recorde no diário) é do aparelhos33.endGame33.

import { Rng } from '../../core/rng';
import { l, type L } from '../../data/world';

export type Game33 = 'snake' | 'tennis' | 'maze' | 'blocks' | 'tap' | 'holo';
export type Key33 = 'up' | 'down' | 'left' | 'right' | 'act' | `n${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`;
export const GAME_L33: Record<Game33, L> = {
  snake: l('Cobrinha', 'Snake'), tennis: l('Tênis de dois traços', 'Two-line tennis'), maze: l('Labirinto', 'Maze'),
  blocks: l('Blocos', 'Blocks'), tap: l('Toque rápido', 'Quick tap'), holo: l('Cobrinha em holograma', 'Hologram snake'),
};
/** Teclas de cada jogo (texto da ajuda). */
export const GAME_KEYS33: Record<Game33, L> = {
  snake: l('setas (ou 2, 4, 6, 8) mudam a direção', 'arrows (or 2, 4, 6, 8) change direction'), holo: l('setas mudam a direção; espaço troca de camada', 'arrows change direction; space switches layer'),
  tennis: l('↑ ↓ mexem a raquete', '↑ ↓ move the paddle'), maze: l('setas andam até a saída', 'arrows walk to the exit'),
  blocks: l('← → mexem, ↑ gira, ↓ desce', '← → move, ↑ rotates, ↓ drops'), tap: l('1–9 (ou o clique) acertam a casa que acende', '1–9 (or a click) hit the square that lights up'),
};
/** Quantos milissegundos dura um tique (a interface chama step nesse ritmo). */
export const TICK33: Record<Game33, number> = { snake: 180, holo: 160, tennis: 60, maze: 0, blocks: 320, tap: 100 };

type P = [number, number];
const DIR: Record<'up' | 'down' | 'left' | 'right', P> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const eq = (a: P, b: P) => a[0] === b[0] && a[1] === b[1];

// ---------------------------------------------------------------- cobrinha (e a de holograma)

export interface Snake33 { k: 'snake' | 'holo'; w: number; h: number; body: P[]; dir: P; next: P; food: P; z: number; foodZ: number; score: number; over: boolean; ticks: number; rng: number }
const rnd = (g: { rng: number }): Rng => { const r = Rng.fromSeed(`jogos33|${g.rng}`); g.rng = Math.floor(r.next() * 2 ** 31); return r; };
function placeFood(g: Snake33): void {
  const r = rnd(g);
  for (let i = 0; i < 400; i++) {
    const p: P = [r.int(0, g.w - 1), r.int(0, g.h - 1)];
    if (!g.body.some((b) => eq(b, p))) { g.food = p; g.foodZ = g.k === 'holo' ? r.int(0, 1) : 0; return; }
  }
}
export function newSnake33(seed: string | number, k: 'snake' | 'holo' = 'snake', w = 16, h = 10): Snake33 {
  const cy = Math.floor(h / 2);
  const g: Snake33 = { k, w, h, body: [[4, cy], [3, cy], [2, cy]], dir: [1, 0], next: [1, 0], food: [0, 0], z: 0, foodZ: 0, score: 0, over: false, ticks: 0,
    rng: Math.floor(Rng.fromSeed(`snake33|${seed}`).next() * 2 ** 31) };
  placeFood(g);
  return g;
}
/** Um passo: a tecla muda a direção (não dá para virar para trás); parede (cobrinha) ou o próprio corpo = fim. */
export function stepSnake33(g: Snake33, key?: Key33): Snake33 {
  if (g.over) return g;
  if (key === 'act' && g.k === 'holo') g.z = 1 - g.z;
  if (key && key in DIR) { const d = DIR[key as keyof typeof DIR]; if (d[0] !== -g.dir[0] || d[1] !== -g.dir[1]) g.next = d; }
  g.dir = g.next;
  g.ticks++;
  let head: P = [g.body[0][0] + g.dir[0], g.body[0][1] + g.dir[1]];
  if (g.k === 'holo') head = [(head[0] + g.w) % g.w, (head[1] + g.h) % g.h];
  else if (head[0] < 0 || head[1] < 0 || head[0] >= g.w || head[1] >= g.h) { g.over = true; return g; }
  const eat = eq(head, g.food) && g.z === g.foodZ;
  const body = eat ? g.body : g.body.slice(0, -1);
  if (body.some((b) => eq(b, head))) { g.over = true; return g; }
  g.body = [head, ...body];
  if (eat) { g.score += 10; placeFood(g); }
  return g;
}

// ---------------------------------------------------------------- tênis de dois traços

export interface Tennis33 { w: number; h: number; pad: number; me: number; cpu: number; bx: number; by: number; vx: number; vy: number; score: number; miss: number; over: boolean; ticks: number; rng: number }
export function newTennis33(seed: string | number, w = 40, h = 24): Tennis33 {
  const r = Rng.fromSeed(`tennis33|${seed}`);
  return { w, h, pad: 6, me: h / 2 - 3, cpu: h / 2 - 3, bx: w / 2, by: h / 2, vx: r.chance(0.5) ? 0.7 : -0.7, vy: r.float(-0.5, 0.5), score: 0, miss: 0, over: false, ticks: 0, rng: Math.floor(r.next() * 2 ** 31) };
}
/** Raquete da esquerda é sua (↑ ↓); a da direita segue a bola meio atrasada. 3 bolas perdidas = fim. */
export function stepTennis33(g: Tennis33, key?: Key33): Tennis33 {
  if (g.over) return g;
  g.ticks++;
  if (key === 'up') g.me = Math.max(0, g.me - 1.6);
  if (key === 'down') g.me = Math.min(g.h - g.pad, g.me + 1.6);
  const aim = g.by - g.pad / 2;
  g.cpu += Math.max(-0.55, Math.min(0.55, aim - g.cpu));
  g.cpu = Math.max(0, Math.min(g.h - g.pad, g.cpu));
  g.bx += g.vx; g.by += g.vy;
  if (g.by < 0) { g.by = -g.by; g.vy = -g.vy; }
  if (g.by > g.h - 1) { g.by = 2 * (g.h - 1) - g.by; g.vy = -g.vy; }
  const hit = (pad: number) => g.by >= pad - 0.5 && g.by <= pad + g.pad + 0.5;
  if (g.bx <= 1 && g.vx < 0) {
    if (hit(g.me)) { g.bx = 1; g.vx = Math.min(1.6, -g.vx * 1.06); g.vy += (g.by - (g.me + g.pad / 2)) * 0.12; g.score += 1; }
    else if (g.bx < -1) { g.miss++; if (g.miss >= 3) { g.over = true; return g; } Object.assign(g, { bx: g.w / 2, by: g.h / 2, vx: 0.7, vy: rnd(g).float(-0.5, 0.5) }); }
  }
  if (g.bx >= g.w - 2 && g.vx > 0) {
    if (hit(g.cpu)) { g.bx = g.w - 2; g.vx = -Math.min(1.6, g.vx * 1.04); }
    else if (g.bx > g.w + 1) { g.score += 3; Object.assign(g, { bx: g.w / 2, by: g.h / 2, vx: -0.7, vy: rnd(g).float(-0.5, 0.5) }); }
  }
  return g;
}

// ---------------------------------------------------------------- labirinto

export interface Maze33 { w: number; h: number; wall: boolean[]; at: P; exit: P; level: number; score: number; moves: number; over: boolean; ticks: number; rng: number }
/** Labirinto perfeito (backtracking) em células ímpares de uma grade 2w+1 × 2h+1. */
function carve(r: Rng, cw: number, ch: number): boolean[] {
  const W = cw * 2 + 1, H = ch * 2 + 1;
  const wall = new Array<boolean>(W * H).fill(true);
  const seen = new Set<number>();
  const st: P[] = [[0, 0]];
  seen.add(0);
  wall[1 * W + 1] = false;
  while (st.length) {
    const [x, y] = st[st.length - 1];
    const nb = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as P[]).map(([dx, dy]) => [x + dx, y + dy] as P).filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < cw && ny < ch && !seen.has(ny * cw + nx));
    if (!nb.length) { st.pop(); continue; }
    const [nx, ny] = nb[r.int(0, nb.length - 1)];
    seen.add(ny * cw + nx);
    wall[(2 * ny + 1) * W + 2 * nx + 1] = false;
    wall[(y + ny + 1) * W + x + nx + 1] = false;
    st.push([nx, ny]);
  }
  return wall;
}
export function newMaze33(seed: string | number, cw = 9, ch = 6, level = 1): Maze33 {
  const r = Rng.fromSeed(`maze33|${seed}|${level}`);
  return { w: cw * 2 + 1, h: ch * 2 + 1, wall: carve(r, cw, ch), at: [1, 1], exit: [cw * 2 - 1, ch * 2 - 1], level, score: 0, moves: 0, over: false, ticks: 0, rng: Math.floor(r.next() * 2 ** 31) };
}
export const mazeWall33 = (g: Maze33, x: number, y: number): boolean => x < 0 || y < 0 || x >= g.w || y >= g.h || g.wall[y * g.w + x];
/** Anda uma casa; chegar à saída dá pontos (menos passos, mais pontos) e abre o próximo labirinto. 3 labirintos = fim. */
export function stepMaze33(g: Maze33, key?: Key33): Maze33 {
  if (g.over || !key || !(key in DIR)) return g;
  const d = DIR[key as keyof typeof DIR];
  const to: P = [g.at[0] + d[0], g.at[1] + d[1]];
  if (mazeWall33(g, to[0], to[1])) return g;
  g.at = to; g.moves++; g.ticks++;
  if (eq(to, g.exit)) {
    g.score += Math.max(10, 120 - g.moves);
    if (g.level >= 3) { g.over = true; return g; }
    const nx = newMaze33(g.rng, (g.w - 1) / 2, (g.h - 1) / 2, g.level + 1);
    Object.assign(g, { wall: nx.wall, at: nx.at, exit: nx.exit, level: g.level + 1, moves: 0, rng: nx.rng });
  }
  return g;
}

// ---------------------------------------------------------------- blocos (quebra-cabeça que cai)

const PIECES33: P[][] = [
  [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 0], [1, 0], [2, 0], [0, 1]], [[1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]],
];
export interface Blocks33 { w: number; h: number; cells: number[]; piece: P[]; kind: number; px: number; py: number; score: number; lines: number; over: boolean; ticks: number; rng: number }
function spawn(g: Blocks33): void {
  const r = rnd(g);
  g.kind = r.int(0, PIECES33.length - 1);
  g.piece = PIECES33[g.kind].map((p) => [p[0], p[1]] as P);
  g.px = Math.floor(g.w / 2) - 1; g.py = 0;
  if (!fits(g, g.piece, g.px, g.py)) g.over = true;
}
function fits(g: Blocks33, pc: P[], x: number, y: number): boolean {
  return pc.every(([a, b]) => { const cx = a + x, cy = b + y; return cx >= 0 && cx < g.w && cy < g.h && (cy < 0 || !g.cells[cy * g.w + cx]); });
}
export function newBlocks33(seed: string | number, w = 8, h = 14): Blocks33 {
  const g: Blocks33 = { w, h, cells: new Array<number>(w * h).fill(0), piece: [], kind: 0, px: 0, py: 0, score: 0, lines: 0, over: false, ticks: 0, rng: Math.floor(Rng.fromSeed(`blocks33|${seed}`).next() * 2 ** 31) };
  spawn(g);
  return g;
}
/** ← → mexem, ↑ gira, ↓ (ou o tique) desce; linha cheia some (10 pontos por linha, bônus por várias). */
export function stepBlocks33(g: Blocks33, key?: Key33): Blocks33 {
  if (g.over) return g;
  if (key === 'left' && fits(g, g.piece, g.px - 1, g.py)) g.px--;
  else if (key === 'right' && fits(g, g.piece, g.px + 1, g.py)) g.px++;
  else if (key === 'up') {
    const mx = Math.max(...g.piece.map((p) => p[1]));
    const rot = g.piece.map(([a, b]) => [mx - b, a] as P);
    if (fits(g, rot, g.px, g.py)) g.piece = rot;
  }
  if (key === 'left' || key === 'right' || key === 'up') return g;
  g.ticks++;
  if (fits(g, g.piece, g.px, g.py + 1)) { g.py++; return g; }
  for (const [a, b] of g.piece) { const y = b + g.py; if (y < 0) { g.over = true; return g; } g.cells[y * g.w + a + g.px] = g.kind + 1; }
  let n = 0;
  for (let y = g.h - 1; y >= 0; y--) {
    if (g.cells.slice(y * g.w, y * g.w + g.w).every((c) => c)) {
      g.cells.splice(y * g.w, g.w); g.cells.unshift(...new Array<number>(g.w).fill(0)); n++; y++;
    }
  }
  if (n) { g.lines += n; g.score += [0, 10, 25, 45, 70][n] ?? 70; }
  spawn(g);
  return g;
}

// ---------------------------------------------------------------- toque rápido

export interface Tap33 { lit: number; life: number; left: number; score: number; miss: number; over: boolean; ticks: number; rng: number }
export function newTap33(seed: string | number): Tap33 {
  const g: Tap33 = { lit: -1, life: 0, left: 300, score: 0, miss: 0, over: false, ticks: 0, rng: Math.floor(Rng.fromSeed(`tap33|${seed}`).next() * 2 ** 31) };
  nextTap(g);
  return g;
}
function nextTap(g: Tap33): void { const r = rnd(g); let c = r.int(0, 8); if (c === g.lit) c = (c + 1 + r.int(0, 7)) % 9; g.lit = c; g.life = Math.max(6, 16 - Math.floor(g.score / 5)); }
/** Acende uma das 9 casas; acertar (1–9) antes de apagar dá ponto; errar ou deixar apagar conta falta. 30 s ou 5 faltas = fim. */
export function stepTap33(g: Tap33, key?: Key33): Tap33 {
  if (g.over) return g;
  if (key && key.startsWith('n')) {
    const c = Number(key.slice(1)) - 1;
    if (c === g.lit) { g.score++; nextTap(g); } else { g.miss++; if (g.miss >= 5) g.over = true; }
    return g;
  }
  g.ticks++; g.left--; g.life--;
  if (g.life <= 0) { g.miss++; if (g.miss >= 5) { g.over = true; return g; } nextTap(g); }
  if (g.left <= 0) g.over = true;
  return g;
}

// ---------------------------------------------------------------- um jogo qualquer (a interface só fala com isto)

export type AnyGame33 = { k: 'snake'; g: Snake33 } | { k: 'holo'; g: Snake33 } | { k: 'tennis'; g: Tennis33 } | { k: 'maze'; g: Maze33 } | { k: 'blocks'; g: Blocks33 } | { k: 'tap'; g: Tap33 };
/** `o`: tamanho da grade da cobrinha (a tela pede: o visor de 1997 é pequeno). */
export function newGame33(k: Game33, seed: string | number, o: { w?: number; h?: number } = {}): AnyGame33 {
  if (k === 'snake') return { k, g: newSnake33(seed, 'snake', o.w, o.h) };
  if (k === 'holo') return { k, g: newSnake33(seed, 'holo', o.w, o.h) };
  if (k === 'tennis') return { k, g: newTennis33(seed) };
  if (k === 'maze') return { k, g: newMaze33(seed) };
  if (k === 'blocks') return { k, g: newBlocks33(seed) };
  return { k, g: newTap33(seed) };
}
export function stepGame33(x: AnyGame33, key?: Key33): AnyGame33 {
  switch (x.k) {
    case 'snake': case 'holo': stepSnake33(x.g, key); break;
    case 'tennis': stepTennis33(x.g, key); break;
    case 'maze': stepMaze33(x.g, key); break;
    case 'blocks': stepBlocks33(x.g, key); break;
    default: stepTap33(x.g, key);
  }
  return x;
}
export const scoreOf33 = (x: AnyGame33): number => x.g.score;
export const overOf33 = (x: AnyGame33): boolean => x.g.over;

/** Jogos do aparelho em cada versão. */
export const PHONE_GAME33: Record<number, Game33[]> = { 1997: ['snake'], 2007: ['blocks'], 2012: ['tap'], 2032: ['holo'] };
export const PC_GAME33: Record<number, Game33[]> = { 1982: ['tennis', 'maze'], 1995: ['tennis', 'maze'], 2003: ['maze', 'tennis'], 2012: ['maze', 'tennis'], 2032: ['holo', 'maze'] };
