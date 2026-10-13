// Rodada 17 — ícones extras 16×16 para o menu (cada grupo e cada página com um ícone próprio).
// Mesma paleta e acabamento de icons.ts (iconkit.ts: rampas, luz de cima à esquerda, contorno quente); cacheados.

import { drawText } from './font';
import { finishIcon, K } from './iconkit';
import { Px, shade, upscale, type Col } from './px';


export const ICON17_NAMES = [
  'crown', 'compass', 'target', 'book', 'pin', 'people', 'eye', 'briefcase', 'headphones', 'megaphone', 'scroll', 'map',
  'chess', 'coin', 'ticket', 'medal', 'mask', 'diamond', 'tie', 'stage', 'mixer', 'hourglass', 'skyline',
  // r18 final: páginas novas da rodada 18
  'door', 'clapper', 'typewriter', 'copyright', 'factory', 'signpost', 'network', 'seedling', 'passport', 'columns', 'dice',
  // r19 onda 4 (ux19): páginas da rodada 19 com lugar próprio no menu
  'datebook', 'quill', 'turntable', 'spotlight', 'ballot', 'zine', 'certificate',
] as const;
export type Icon17 = (typeof ICON17_NAMES)[number];

const person = (p: Px, x: number, body: Col) => { p.disc(x, 5, 2.2, K.skin); p.ellipse(x, 12, 3.2, 3.2, body); };

const DRAW: Record<Icon17, (p: Px) => void> = {
  crown: (p) => { p.poly([[2, 12], [2, 5], [5, 8], [8, 3], [11, 8], [14, 5], [14, 12]], K.gold); p.rect(2, 12, 13, 2, K.dgold); p.put(8, 9, K.red); p.put(5, 10, K.blue); p.put(11, 10, K.green); },
  compass: (p) => { p.disc(8, 8, 7, K.cream); p.ring(8, 8, 6.5, K.dgold); p.poly([[8, 2.5], [10, 8], [6, 8]], K.red); p.poly([[8, 13.5], [10, 8], [6, 8]], K.dgrey); p.put(8, 8, K.ink); },
  target: (p) => { p.disc(8, 8, 7, K.white); p.disc(8, 8, 5, K.red); p.disc(8, 8, 3, K.white); p.disc(8, 8, 1.4, K.red); p.line(9, 7, 14, 2, K.dbrown); p.put(14, 1, K.gold); },
  book: (p) => { p.rect(2, 3, 12, 11, K.dred); p.rect(4, 3, 9, 10, K.cream); p.rect(3, 3, 1, 11, K.red); p.hline(6, 11, 6, K.grey); p.hline(6, 11, 8, K.grey); p.hline(6, 10, 10, K.grey); },
  pin: (p) => { p.disc(8, 6, 4.6, K.red); p.disc(8, 6, 1.8, K.white); p.poly([[4.5, 8], [11.5, 8], [8, 15]], K.red); },
  people: (p) => { person(p, 4.5, K.blue); person(p, 11.5, K.green); p.disc(8, 6, 2.4, K.skin); p.ellipse(8, 13, 3.4, 3, K.orange); },
  eye: (p) => { p.ellipse(8, 8, 7, 4.2, K.white); p.disc(8, 8, 3, K.teal); p.disc(8, 8, 1.4, K.ink); p.put(7, 7, K.white); },
  briefcase: (p) => { p.rect(6, 2, 4, 2, K.dbrown); p.rect(2, 4, 12, 10, K.brown); p.hline(2, 13, 8, K.dbrown); p.rect(7, 7, 2, 3, K.gold); },
  headphones: (p) => { p.vline(3, 5, 9, K.dgrey); p.vline(12, 5, 9, K.dgrey); p.line(3, 5, 5, 3, K.dgrey); p.line(12, 5, 10, 3, K.dgrey); p.hline(5, 10, 2, K.dgrey); p.rect(2, 9, 3, 5, K.red); p.rect(11, 9, 3, 5, K.red); },
  megaphone: (p) => { p.poly([[2, 6], [10, 2], [10, 14], [2, 10]], K.orange); p.rect(10, 3, 2, 10, K.red); p.rect(3, 10, 2, 4, K.dgrey); p.put(13, 5, K.gold); p.put(14, 8, K.gold); p.put(13, 11, K.gold); },
  scroll: (p) => { p.rect(3, 3, 10, 10, K.cream); p.rect(2, 2, 12, 2, K.dgold); p.rect(2, 12, 12, 2, K.dgold); p.hline(5, 11, 6, K.grey); p.hline(5, 11, 8, K.grey); p.hline(5, 9, 10, K.grey); },
  map: (p) => { p.poly([[1, 3], [5, 1], [11, 3], [15, 1], [15, 13], [11, 15], [5, 13], [1, 15]], K.cream); p.vline(5, 1, 13, K.grey); p.vline(11, 3, 15, K.grey); p.disc(9, 7, 1.6, K.red); p.line(3, 11, 8, 8, K.green); },
  chess: (p) => { p.disc(8, 4, 2.4, K.black); p.poly([[5.5, 7], [10.5, 7], [11.5, 12], [4.5, 12]], K.black); p.rect(3, 12, 10, 3, K.dgrey); p.put(7, 3, K.grey); },
  coin: (p) => { p.disc(8, 8, 6.5, K.gold); p.ring(8, 8, 5, K.dgold); drawText(p, 'C', 7, 6, K.dgold); },
  ticket: (p) => { p.rect(1, 4, 14, 8, K.gold); p.disc(1, 8, 1.6, K.ink); p.disc(15, 8, 1.6, K.ink); p.vline(10, 4, 11, K.dgold); p.hline(3, 8, 7, K.dgold); p.hline(3, 7, 9, K.dgold); },
  medal: (p) => { p.poly([[4, 1], [7, 1], [9, 7], [6, 7]], K.blue); p.poly([[12, 1], [9, 1], [7, 7], [10, 7]], K.red); p.disc(8, 10.5, 4, K.gold); p.disc(8, 10.5, 2.2, K.dgold); },
  mask: (p) => { p.ellipse(8, 8, 7, 5, K.black); p.disc(5, 7.5, 1.6, K.white); p.disc(11, 7.5, 1.6, K.white); p.rect(7, 11, 2, 1, K.dred); },
  diamond: (p) => { p.poly([[4, 3], [12, 3], [15, 7], [8, 15], [1, 7]], K.teal); p.hline(1, 15, 7, shade(K.teal, 0.35)); p.poly([[5, 4], [8, 4], [6, 7]], K.shine); },
  tie: (p) => { p.poly([[6, 1], [10, 1], [9, 4], [7, 4]], K.dblue); p.poly([[7, 4], [9, 4], [11, 12], [8, 15], [5, 12]], K.blue); p.line(6, 8, 10, 6, K.dblue); },
  stage: (p) => { p.rect(1, 2, 14, 2, K.dred); p.rect(1, 2, 2, 10, K.red); p.rect(13, 2, 2, 10, K.red); p.rect(1, 12, 14, 3, K.brown); p.disc(8, 8, 1.6, K.skin); p.rect(7, 9, 3, 3, K.purple); },
  hourglass: (p) => { p.rect(3, 1, 10, 2, K.brown); p.rect(3, 13, 10, 2, K.brown); p.poly([[4, 3], [12, 3], [8, 8]], K.cream); p.poly([[8, 8], [12, 13], [4, 13]], K.cream); p.poly([[6, 5], [10, 5], [8, 7]], K.gold); p.poly([[8, 10], [11, 13], [5, 13]], K.gold); },
  skyline: (p) => { p.rect(1, 7, 4, 8, K.brown); p.rect(5, 2, 5, 13, K.blue); p.rect(10, 5, 5, 10, K.cream); p.vline(7, 0, 2, K.grey); for (let y = 4; y < 14; y += 3) { p.put(6, y, K.gold); p.put(8, y, K.gold); } for (let y = 7; y < 14; y += 3) { p.put(11, y, K.dblue); p.put(13, y, K.dblue); p.put(2, y + 1, K.gold); } p.hline(0, 15, 15, K.dgreen); },
  mixer: (p) => { p.rect(1, 4, 14, 9, K.dgrey); for (const x of [3, 6, 9, 12]) { p.vline(x, 5, 11, K.black); p.rect(x - 1, x % 2 ? 6 : 9, 3, 2, K.gold); } },
  door: (p) => { p.rect(4, 1, 9, 14, K.brown); p.rect(5, 2, 7, 12, K.dbrown); p.rect(6, 3, 5, 5, K.brown); p.rect(6, 9, 5, 4, K.brown); p.put(10, 8, K.gold); p.hline(1, 15, 15, K.dgrey); },
  clapper: (p) => { p.rect(2, 6, 12, 8, K.black); p.poly([[2, 3], [13, 1], [14, 4], [2, 6]], K.white); p.line(5, 3, 6, 5, K.black); p.line(9, 2, 10, 4, K.black); p.hline(4, 12, 9, K.grey); p.hline(4, 10, 11, K.grey); },
  typewriter: (p) => { p.rect(4, 1, 8, 5, K.white); p.hline(5, 10, 3, K.grey); p.rect(1, 6, 14, 8, K.dgrey); p.rect(1, 6, 14, 2, K.black); for (const x of [3, 6, 9, 12]) { p.put(x, 9, K.cream); p.put(x, 11, K.cream); } p.hline(5, 10, 13, K.cream); },
  copyright: (p) => { p.disc(8, 8, 7, K.blue); p.disc(8, 8, 5.5, K.white); p.ring(8, 8, 3.4, K.dblue); p.rect(10, 7, 2, 3, K.white); },
  factory: (p) => { p.rect(1, 7, 14, 8, K.dred); p.poly([[1, 7], [5, 4], [5, 7], [9, 4], [9, 7], [13, 4], [13, 7]], K.red); p.rect(11, 1, 3, 6, K.dgrey); p.rect(3, 10, 2, 2, K.gold); p.rect(7, 10, 2, 2, K.gold); p.rect(11, 10, 2, 2, K.gold); },
  signpost: (p) => { p.rect(7, 2, 2, 13, K.dbrown); p.poly([[2, 3], [12, 3], [14, 5], [12, 7], [2, 7]], K.gold); p.poly([[14, 8], [4, 8], [2, 10], [4, 12], [14, 12]], K.green); p.hline(4, 10, 5, K.dgold); p.hline(6, 12, 10, K.dgreen); },
  network: (p) => { p.line(4, 4, 12, 4, K.grey); p.line(4, 4, 8, 12, K.grey); p.line(12, 4, 8, 12, K.grey); p.disc(4, 4, 2.4, K.blue); p.disc(12, 4, 2.4, K.red); p.disc(8, 12, 2.4, K.green); },
  seedling: (p) => { p.rect(4, 11, 8, 4, K.brown); p.rect(3, 10, 10, 2, K.dbrown); p.vline(8, 4, 10, K.dgreen); p.ellipse(5, 5, 3, 1.8, K.green); p.ellipse(11, 3.5, 3, 1.8, K.green); },
  passport: (p) => { p.rect(3, 1, 10, 14, K.dblue); p.disc(8, 7, 3, K.gold); p.ring(8, 7, 2, K.dgold); p.hline(5, 10, 12, K.gold); },
  columns: (p) => { p.poly([[1, 5], [8, 1], [15, 5]], K.cream); p.rect(2, 5, 12, 1, K.grey); for (const x of [3, 7, 11]) p.rect(x, 6, 2, 7, K.white); p.rect(1, 13, 14, 2, K.grey); },
  datebook: (p) => { p.rect(2, 3, 12, 12, K.white); p.rect(2, 3, 12, 3, K.red); p.rect(4, 1, 2, 4, K.dgrey); p.rect(10, 1, 2, 4, K.dgrey); for (let y = 8; y < 14; y += 2) for (let x = 4; x < 13; x += 3) p.rect(x, y, 2, 1, K.grey); p.rect(10, 11, 2, 2, K.red); },
  quill: (p) => { p.rect(2, 10, 9, 5, K.cream); p.hline(3, 9, 12, K.grey); p.poly([[14, 1], [9, 9], [8, 11], [10, 9], [15, 3]], K.white); p.line(13, 3, 8, 11, K.grey); p.put(8, 12, K.ink); },
  turntable: (p) => { p.rect(1, 3, 14, 11, K.brown); p.disc(7, 8.5, 4.6, K.black); p.disc(7, 8.5, 1.4, K.red); p.ring(7, 8.5, 3, K.dgrey); p.line(13, 4, 11, 10, K.grey); p.rect(12, 3, 2, 2, K.white); },
  spotlight: (p) => { p.poly([[6, 1], [10, 1], [14, 14], [2, 14]], K.cream); p.rect(5, 0, 6, 2, K.dgrey); p.ellipse(8, 14, 6, 1.4, K.gold); p.disc(8, 10, 1.6, K.skin); p.rect(7, 11, 3, 3, K.blue); },
  ballot: (p) => { p.rect(2, 7, 12, 8, K.dblue); p.rect(2, 7, 12, 2, K.blue); p.rect(6, 7, 4, 1, K.black); p.poly([[5, 1], [11, 1], [11, 7], [5, 7]], K.white); p.line(6, 4, 7, 5, K.green); p.line(7, 5, 10, 2, K.green); },
  zine: (p) => { p.poly([[2, 2], [13, 1], [14, 14], [3, 15]], K.cream); p.rect(4, 3, 7, 4, K.black); p.put(5, 4, K.red); p.put(9, 5, K.red); p.hline(4, 11, 9, K.grey); p.hline(4, 10, 11, K.grey); p.hline(5, 12, 13, K.grey); },
  certificate: (p) => { p.rect(1, 2, 14, 10, K.cream); p.rect(1, 2, 14, 1, K.dgold); p.rect(1, 11, 14, 1, K.dgold); p.disc(8, 7, 3, K.gold); p.disc(8, 7, 1.4, K.white); p.hline(3, 5, 5, K.grey); p.hline(11, 13, 9, K.grey); p.poly([[6, 10], [8, 10], [7, 15]], K.red); p.poly([[8, 10], [10, 10], [9, 15]], K.dred); },
  dice: (p) => { p.rect(2, 2, 12, 12, K.white); p.rect(2, 2, 12, 1, K.grey); p.disc(5, 5, 1.2, K.red); p.disc(8, 8, 1.2, K.red); p.disc(11, 11, 1.2, K.red); p.disc(11, 5, 1.2, K.ink); p.disc(5, 11, 1.2, K.ink); },
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
    finishIcon(p);
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
