// Fonte bitmap 3×5 (largura variável) para logos, capas, placas e ícones.
// Acentos são reduzidos à letra base (á → A); só maiúsculas.

import type { Px, Col } from './px';

const G: Record<string, string> = {
  A: '.#.|#.#|###|#.#|#.#', B: '##.|#.#|##.|#.#|##.', C: '.##|#..|#..|#..|.##', D: '##.|#.#|#.#|#.#|##.',
  E: '###|#..|##.|#..|###', F: '###|#..|##.|#..|#..', G: '.##|#..|#.#|#.#|.##', H: '#.#|#.#|###|#.#|#.#',
  I: '###|.#.|.#.|.#.|###', J: '..#|..#|..#|#.#|.#.', K: '#.#|#.#|##.|#.#|#.#', L: '#..|#..|#..|#..|###',
  M: '#...#|##.##|#.#.#|#...#|#...#', N: '#..#|##.#|#.##|#..#|#..#', O: '.#.|#.#|#.#|#.#|.#.', P: '##.|#.#|##.|#..|#..',
  Q: '.#.|#.#|#.#|##.|.##', R: '##.|#.#|##.|#.#|#.#', S: '.##|#..|.#.|..#|##.', T: '###|.#.|.#.|.#.|.#.',
  U: '#.#|#.#|#.#|#.#|###', V: '#.#|#.#|#.#|#.#|.#.', W: '#...#|#...#|#.#.#|##.##|#...#', X: '#.#|#.#|.#.|#.#|#.#',
  Y: '#.#|#.#|.#.|.#.|.#.', Z: '###|..#|.#.|#..|###',
  '0': '###|#.#|#.#|#.#|###', '1': '.#.|##.|.#.|.#.|###', '2': '##.|..#|.#.|#..|###', '3': '##.|..#|.#.|..#|##.',
  '4': '#.#|#.#|###|..#|..#', '5': '###|#..|##.|..#|##.', '6': '.##|#..|###|#.#|###', '7': '###|..#|.#.|.#.|.#.',
  '8': '###|#.#|###|#.#|###', '9': '###|#.#|###|..#|##.',
  '.': '.|.|.|.|#', ',': '.|.|.|#|#', '!': '#|#|#|.|#', '?': '##.|..#|.#.|...|.#.', '-': '...|...|###|...|...',
  ':': '.|#|.|#|.', "'": '#|#|.|.|.', '&': '.#.|#.#|.#.|#.#|.##', '/': '..#|..#|.#.|#..|#..', '+': '...|.#.|###|.#.|...',
  '$': '.##|##.|.#.|.##|##.', '%': '#.#|..#|.#.|#..|#.#', '(': '.#|#.|#.|#.|.#', ')': '#.|.#|.#|.#|#.',
  '#': '#.#|###|#.#|###|#.#', '"': '#.#|#.#|...|...|...', '*': '...|#.#|.#.|#.#|...', '=': '...|###|...|###|...',
  '<': '..#|.#.|#..|.#.|..#', '>': '#..|.#.|..#|.#.|#..', '_': '...|...|...|...|###', '@': '###|#.#|#.#|#..|.##',
  ' ': '..|..|..|..|..',
};

const glyphs = new Map<string, boolean[][]>();
for (const [ch, s] of Object.entries(G)) glyphs.set(ch, s.split('|').map((row) => [...row].map((c) => c === '#')));

/** Normaliza: maiúsculas, sem acentos; caracteres desconhecidos viram espaço. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/ß/g, 'SS')
    .replace(/Æ/g, 'AE')
    .replace(/Ø/g, 'O')
    .split('')
    .map((c) => (glyphs.has(c) ? c : ' '))
    .join('');
}

export function textWidth(text: string, scale = 1): number {
  const t = normalizeText(text);
  let w = 0;
  for (const ch of t) w += (glyphs.get(ch)![0].length + 1) * scale;
  return Math.max(0, w - scale);
}

export const FONT_H = 5;

type Target = Px | CanvasRenderingContext2D;

function isPx(t: Target): t is Px {
  return (t as Px).d !== undefined;
}

/**
 * Escreve texto na fonte 3×5. Aceita um contexto 2D (color = string CSS) ou um buffer Px (color = Col).
 * Retorna a largura escrita.
 */
export function drawText(ctx: Target, text: string, x: number, y: number, color: string | Col, scale = 1): number {
  const t = normalizeText(text);
  let cx = Math.round(x);
  const px = isPx(ctx) ? ctx : null;
  const c2d = px ? null : (ctx as CanvasRenderingContext2D);
  if (c2d) c2d.fillStyle = typeof color === 'string' ? color : '#fff';
  for (const ch of t) {
    const g = glyphs.get(ch)!;
    for (let j = 0; j < g.length; j++)
      for (let i = 0; i < g[j].length; i++) {
        if (!g[j][i]) continue;
        if (px) px.rect(cx + i * scale, Math.round(y) + j * scale, scale, scale, color as Col);
        else c2d!.fillRect(cx + i * scale, Math.round(y) + j * scale, scale, scale);
      }
    cx += (g[0].length + 1) * scale;
  }
  return cx - Math.round(x) - scale;
}

/** Texto com sombra/contorno de 1 px (legível sobre fundos ruidosos). */
export function drawTextOutlined(p: Px, text: string, x: number, y: number, color: Col, outline: Col, scale = 1): number {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]] as const) drawText(p, text, x + dx, y + dy, outline, scale);
  return drawText(p, text, x, y, color, scale);
}

/** Corta o texto para caber em maxW pixels. */
export function fitText(text: string, maxW: number, scale = 1): string {
  let t = normalizeText(text).trim();
  while (t.length > 1 && textWidth(t, scale) > maxW) t = t.slice(0, -1);
  return t.trim();
}
