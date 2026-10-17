// R31 · onda 5 (INI) — a cena do palco no DOM (canvas com animação leve: luz, plateia, músicos) e o logo MASTERS
// em pixel art na fonte do jogo. A animação respeita "movimento reduzido" e para sozinha quando o canvas sai da tela.
import { C, Px, lv } from '../pixel/px';
import { drawText, textWidth } from '../pixel/font';
import { store } from '../store';
import { paintScene5, scene5, type StageOpts5 } from './stage5px';

const reduced = (): boolean => { try { return !!store.prefs.reducedMotion || document.documentElement.classList.contains('reduced-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

/** Canvas com a cena; `set` redesenha com outra época/cidade/carreira/boneco (a prévia da nova run). */
export function mountStage5(o: StageOpts5, cls: string): { el: HTMLCanvasElement; set: (o: StageOpts5) => void; signTop: () => number; floorY: () => number } {
  const cv = document.createElement('canvas');
  cv.className = cls;
  cv.setAttribute('aria-hidden', 'true');
  let sc = scene5(o);
  let cache = new Map<Px, CanvasImageSource>();
  let t = 0;
  let timer = 0;
  const paint = () => {
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    if (cv.width !== sc.W || cv.height !== sc.H) { cv.width = sc.W; cv.height = sc.H; }
    try { paintScene5(ctx, sc, t, cache); } catch (e) { console.error(e); }
  };
  const loop = () => {
    if (timer || reduced()) return;
    timer = window.setInterval(() => {
      if (!cv.isConnected && t > 3) { window.clearInterval(timer); timer = 0; return; }
      t++;
      paint();
    }, 140);
  };
  paint();
  loop();
  // topo do letreiro (cabos incluídos) em pixels do canvas, para a tela inicial não cobri-lo com o título
  return { el: cv, set: (n) => { sc = scene5(n); cache = new Map(); paint(); loop(); }, signTop: () => sc.fy - 88, floorY: () => sc.fy };
}

/** Letras grossas 5×5 do logo (as do título); outras letras caem na fonte 3×5 do jogo. */
const LOGO5: Record<string, string> = {
  M: '#...#|##.##|#.#.#|#...#|#...#', A: '.###.|#...#|#####|#...#|#...#', S: '.####|#....|.###.|....#|####.', T: '#####|..#..|..#..|..#..|..#..',
  E: '#####|#....|####.|#....|#####', R: '####.|#...#|####.|#..#.|#...#',
};

/** Logo MASTERS em pixel: letras grossas com rampa dourada, contorno e sombra em degrau (vermelho e preto). */
export function logo5(text = 'MASTERS'): HTMLCanvasElement {
  const s = 2; // cada ponto da letra = 2×2 px (traço grosso, sombra de 1 px nítida)
  const glyphs = [...text.toUpperCase()].map((ch) => LOGO5[ch]?.split('|') ?? null);
  const cols = glyphs.reduce((w, g, i) => w + (g ? g[0].length : textWidth(text[i]) ) + (i ? 1 : 0), 0);
  const W = cols * s + 5, H = 5 * s + 5;
  const body = new Px(W, H);
  const gold = C('#f0c060');
  let x = 1;
  glyphs.forEach((g, i) => {
    if (g) { g.forEach((row, j) => [...row].forEach((c, k) => { if (c === '#') body.rect(x + k * s, 1 + j * s, s, s, gold); })); x += (g[0].length + 1) * s; }
    else { drawText(body, text[i], x, 1, gold, s); x += (textWidth(text[i]) + 1) * s; }
  });
  const P = new Px(W, H);
  const on = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < W && yy < H && (body.get(xx, yy) >>> 24) > 0;
  const deep = C('#7a2a10'), ink = C('#120a08');
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
    if (on(xx - 3, y - 3) || on(xx - 2, y - 2)) P.put(xx, y, ink); // sombra funda
    if (on(xx - 1, y - 1)) P.put(xx, y, deep); // degrau vermelho
  }
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) if (!on(xx, y) && (on(xx - 1, y) || on(xx + 1, y) || on(xx, y - 1) || on(xx, y + 1)) && !(P.get(xx, y) >>> 24)) P.put(xx, y, ink);
  const th = 5 * s;
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
    if (!on(xx, y)) continue;
    const v = (y - 1) / th; // brilho em cima, sombra embaixo; aresta esquerda acesa
    P.put(xx, y, !on(xx - 1, y) && v < 0.8 ? lv(gold, 4.6) : v < 0.2 ? lv(gold, 4.6) : v < 0.6 ? gold : v < 0.8 ? lv(gold, 2.4) : lv(gold, 1.6));
  }
  const cv = P.canvas();
  cv.className = 'h5-logo';
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', text);
  return cv;
}
