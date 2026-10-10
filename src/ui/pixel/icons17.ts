// Rodada 17 — ícones extras 16×16 para o menu (cada grupo e cada página com um ícone próprio).
// Mesmo estilo de icons.ts (contorno escuro, paleta curta); renderizados sob demanda e cacheados.

import { drawText } from './font';
import { C, Px, upscale, type Col } from './px';

const K = {
  ink: C('#1a1214'), white: C('#f8f4ec'), grey: C('#a8a4a0'), dgrey: C('#5c5856'), gold: C('#f0c040'), dgold: C('#b07c1c'),
  red: C('#e04848'), dred: C('#9c2c2c'), green: C('#48b85c'), dgreen: C('#2c7a3c'), blue: C('#4a8ae0'), dblue: C('#2c5aa0'),
  teal: C('#2ec8c0'), orange: C('#f08a2c'), brown: C('#9a6034'), dbrown: C('#5e3a1e'), skin: C('#f0c8a0'), purple: C('#8a5ad0'), black: C('#2a2628'), cream: C('#f4e4b8'),
};

export const ICON17_NAMES = [
  'crown', 'compass', 'target', 'book', 'pin', 'people', 'eye', 'briefcase', 'headphones', 'megaphone', 'scroll', 'map',
  'chess', 'coin', 'ticket', 'medal', 'mask', 'diamond', 'tie', 'stage', 'mixer', 'hourglass',
] as const;
export type Icon17 = (typeof ICON17_NAMES)[number];

const person = (p: Px, x: number, body: Col) => { p.disc(x, 5, 2.2, K.skin); p.ellipse(x, 12, 3.2, 3.2, body); };

const DRAW: Record<Icon17, (p: Px) => void> = {
  crown: (p) => { p.poly([[2, 12], [2, 5], [5, 8], [8, 3], [11, 8], [14, 5], [14, 12]], K.gold); p.rect(2, 12, 13, 2, K.dgold); p.put(8, 9, K.red); p.put(5, 10, K.blue); p.put(11, 10, K.green); },
  compass: (p) => { p.disc(8, 8, 7, K.cream); p.ring(8, 8, 6.5, K.dgold); p.poly([[8, 2.5], [10, 8], [6, 8]], K.red); p.poly([[8, 13.5], [10, 8], [6, 8]], K.dgrey); p.put(8, 8, K.ink); },
  target: (p) => { p.disc(8, 8, 7, K.white); p.disc(8, 8, 5, K.red); p.disc(8, 8, 3, K.white); p.disc(8, 8, 1.4, K.red); p.line(9, 7, 14, 2, K.dbrown); p.put(14, 1, K.gold); },
  book: (p) => { p.rect(2, 3, 12, 11, K.dred); p.rect(4, 3, 9, 10, K.cream); p.rect(3, 3, 1, 11, K.red); p.hline(6, 11, 6, K.grey); p.hline(6, 11, 8, K.grey); p.hline(6, 10, 10, K.grey); },
  pin: (p) => { p.disc(8, 6, 4.6, K.red); p.disc(8, 6, 1.8, K.white); p.poly([[4.5, 8], [11.5, 8], [8, 15]], K.red); p.set(6, 4, C('#ffb0b0')); },
  people: (p) => { person(p, 4.5, K.blue); person(p, 11.5, K.green); p.disc(8, 6, 2.4, K.skin); p.ellipse(8, 13, 3.4, 3, K.orange); },
  eye: (p) => { p.ellipse(8, 8, 7, 4.2, K.white); p.disc(8, 8, 3, K.teal); p.disc(8, 8, 1.4, K.ink); p.put(7, 7, K.white); },
  briefcase: (p) => { p.rect(6, 2, 4, 2, K.dbrown); p.rect(2, 4, 12, 10, K.brown); p.hline(2, 13, 8, K.dbrown); p.rect(7, 7, 2, 3, K.gold); },
  headphones: (p) => { p.vline(3, 5, 9, K.dgrey); p.vline(12, 5, 9, K.dgrey); p.line(3, 5, 5, 3, K.dgrey); p.line(12, 5, 10, 3, K.dgrey); p.hline(5, 10, 2, K.dgrey); p.rect(2, 9, 3, 5, K.red); p.rect(11, 9, 3, 5, K.red); },
  megaphone: (p) => { p.poly([[2, 6], [10, 2], [10, 14], [2, 10]], K.orange); p.rect(10, 3, 2, 10, K.red); p.rect(3, 10, 2, 4, K.dgrey); p.put(13, 5, K.gold); p.put(14, 8, K.gold); p.put(13, 11, K.gold); },
  scroll: (p) => { p.rect(3, 3, 10, 10, K.cream); p.rect(2, 2, 12, 2, K.dgold); p.rect(2, 12, 12, 2, K.dgold); p.hline(5, 11, 6, K.grey); p.hline(5, 11, 8, K.grey); p.hline(5, 9, 10, K.grey); },
  map: (p) => { p.poly([[1, 3], [5, 1], [11, 3], [15, 1], [15, 13], [11, 15], [5, 13], [1, 15]], K.cream); p.vline(5, 1, 13, K.grey); p.vline(11, 3, 15, K.grey); p.disc(9, 7, 1.6, K.red); p.line(3, 11, 8, 8, K.green); },
  chess: (p) => { p.disc(8, 4, 2.4, K.black); p.poly([[5.5, 7], [10.5, 7], [11.5, 12], [4.5, 12]], K.black); p.rect(3, 12, 10, 3, K.dgrey); p.put(7, 3, K.grey); },
  coin: (p) => { p.disc(8, 8, 6.5, K.gold); p.ring(8, 8, 5, K.dgold); drawText(p, 'C', 7, 6, K.dgold); p.set(5, 4, C('#fff2b0')); },
  ticket: (p) => { p.rect(1, 4, 14, 8, K.gold); p.disc(1, 8, 1.6, K.ink); p.disc(15, 8, 1.6, K.ink); p.vline(10, 4, 11, K.dgold); p.hline(3, 8, 7, K.dgold); p.hline(3, 7, 9, K.dgold); },
  medal: (p) => { p.poly([[4, 1], [7, 1], [9, 7], [6, 7]], K.blue); p.poly([[12, 1], [9, 1], [7, 7], [10, 7]], K.red); p.disc(8, 10.5, 4, K.gold); p.disc(8, 10.5, 2.2, K.dgold); },
  mask: (p) => { p.ellipse(8, 8, 7, 5, K.black); p.disc(5, 7.5, 1.6, K.white); p.disc(11, 7.5, 1.6, K.white); p.rect(7, 11, 2, 1, K.dred); },
  diamond: (p) => { p.poly([[4, 3], [12, 3], [15, 7], [8, 15], [1, 7]], K.teal); p.hline(1, 15, 7, C('#a8f0ec')); p.poly([[5, 4], [8, 4], [6, 7]], C('#e8ffff')); },
  tie: (p) => { p.poly([[6, 1], [10, 1], [9, 4], [7, 4]], K.dblue); p.poly([[7, 4], [9, 4], [11, 12], [8, 15], [5, 12]], K.blue); p.line(6, 8, 10, 6, K.dblue); },
  stage: (p) => { p.rect(1, 2, 14, 2, K.dred); p.rect(1, 2, 2, 10, K.red); p.rect(13, 2, 2, 10, K.red); p.rect(1, 12, 14, 3, K.brown); p.disc(8, 8, 1.6, K.skin); p.rect(7, 9, 3, 3, K.purple); },
  hourglass: (p) => { p.rect(3, 1, 10, 2, K.brown); p.rect(3, 13, 10, 2, K.brown); p.poly([[4, 3], [12, 3], [8, 8]], K.cream); p.poly([[8, 8], [12, 13], [4, 13]], K.cream); p.poly([[6, 5], [10, 5], [8, 7]], K.gold); p.poly([[8, 10], [11, 13], [5, 13]], K.gold); },
  mixer: (p) => { p.rect(1, 4, 14, 9, K.dgrey); for (const x of [3, 6, 9, 12]) { p.vline(x, 5, 11, K.black); p.rect(x - 1, x % 2 ? 6 : 9, 3, 2, K.gold); } },
};

const cache = new Map<string, string>();
const isIcon17 = (n: string): n is Icon17 => (ICON17_NAMES as readonly string[]).includes(n);

/** <img> do ícone extra, ou null se o nome não é um deles. */
export function icon17(name: string, scale = 1): HTMLImageElement | null {
  if (!isIcon17(name)) return null;
  const sc = Math.max(1, Math.ceil(scale));
  const key = `${name}:${sc}`;
  let url = cache.get(key);
  if (!url) {
    const p = new Px(16, 16);
    DRAW[name](p);
    p.outline(K.ink);
    url = upscale(p.canvas(), 16 * sc).toDataURL();
    cache.set(key, url);
  }
  const img = document.createElement('img');
  img.src = url;
  img.width = Math.round(16 * scale);
  img.height = Math.round(16 * scale);
  img.className = 'px pxi';
  img.alt = '';
  img.draggable = false;
  return img;
}
