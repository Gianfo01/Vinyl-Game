// R31 onda 4 (EMO) — ícones 16×16 que faltavam para trocar os emojis da interface por pixel art.
// Mesmo estilo de icons.ts/icons17.ts: paleta curta, contorno escuro (outline), escala inteira.
// O mapa emoji → ícone e o ajudante de texto ficam em emo31.ts.

import { drawText } from './font';
import { C, Px, type Col } from './px';

const K = {
  ink: C('#1a1214'), white: C('#f8f4ec'), grey: C('#a8a4a0'), dgrey: C('#5c5856'), gold: C('#f0c040'), dgold: C('#b07c1c'),
  lgold: C('#fff2b0'), red: C('#e04848'), dred: C('#9c2c2c'), green: C('#48b85c'), dgreen: C('#2c7a3c'), blue: C('#4a8ae0'),
  dblue: C('#2c5aa0'), lblue: C('#a8d0f8'), teal: C('#2ec8c0'), orange: C('#f08a2c'), brown: C('#9a6034'), dbrown: C('#5e3a1e'),
  skin: C('#f0c8a0'), dskin: C('#c89870'), purple: C('#8a5ad0'), black: C('#2a2628'), cream: C('#f4e4b8'), pink: C('#f0a0b8'),
  silver: C('#d0d4dc'), dsilver: C('#8a8e98'), bronze: C('#d08848'), dbronze: C('#8a5428'),
};

export const ICON31_NAMES = [
  'check', 'cross', 'star-empty', 'unlock', 'bolt', 'cloud', 'skip', 'pause', 'medal-gold', 'medal-silver', 'medal-bronze',
  'floppy', 'info', 'person', 'letter', 'trash', 'gear', 'magnifier', 'no-entry', 'receipt', 'swords', 'clipboard',
  'money-out', 'candle', 'bell-off', 'phone', 'chains', 'moon', 'sun', 'folder', 'coffee', 'trumpet', 'violin', 'keyboard',
  'fountain', 'crane', 'sponge', 'shark', 'drink', 'gift', 'tent', 'rain', 'speaker', 'palette', 'health', 'box', 'card',
  'speech', 'hand', 'thumbs-up', 'flex', 'shush',
  'face-happy', 'face-smile', 'face-neutral', 'face-wry', 'face-think', 'face-sad', 'face-angry', 'face-stress', 'face-no',
  'face-money',
] as const;
export type Icon31 = (typeof ICON31_NAMES)[number];

function starPts(cx: number, cy: number, ro: number, ri: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? ri : ro;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

function medal(p: Px, face: Col, rim: Col, n: string): void {
  p.poly([[3, 0], [7, 0], [9, 6], [6, 6]], K.blue);
  p.poly([[13, 0], [9, 0], [7, 6], [10, 6]], K.red);
  p.disc(8, 10.5, 5, face);
  p.ring(8, 10.5, 3.8, rim);
  drawText(p, n, 7, 8, rim);
}

/** Rosto redondo; `mood` desenha olhos e boca por cima. */
function face(p: Px, mood: (p: Px) => void, skin: Col = K.gold): void {
  p.disc(8, 8, 7, skin);
  p.set(4, 4, K.lgold);
  p.set(5, 3, K.lgold);
  mood(p);
}
const eyes = (p: Px, y = 6) => { p.rect(5, y, 2, 2, K.ink); p.rect(10, y, 2, 2, K.ink); };
const smile = (p: Px) => { p.put(4, 10, K.ink); p.put(11, 10, K.ink); p.hline(5, 10, 11, K.ink); };

const DRAW: Record<Icon31, (p: Px) => void> = {
  check: (p) => { p.poly([[1, 8], [4, 5], [7, 8], [13, 1], [15.5, 4], [7, 13]], K.green); p.line(2, 8, 4, 6, C('#98e0a0')); },
  cross: (p) => {
    p.poly([[1, 4], [4, 1], [8, 5], [12, 1], [15, 4], [11, 8], [15, 12], [12, 15], [8, 11], [4, 15], [1, 12], [5, 8]], K.red);
    p.line(3, 4, 4, 3, C('#ff9a9a'));
  },
  'star-empty': (p) => { p.poly(starPts(8, 8.6, 7.4, 3.2), K.dgold); p.poly(starPts(8, 8.8, 4.4, 1.9), K.cream); },
  unlock: (p) => {
    p.ring(5, 5.5, 3.6, K.dgrey); p.ring(5, 5.5, 2.8, K.dgrey);
    p.rect(1, 7, 3, 1, 0);
    p.rect(5, 7, 10, 8, K.gold); p.hline(5, 14, 7, K.lgold); p.rect(9, 9, 2, 4, K.ink);
  },
  bolt: (p) => { p.poly([[9, 0], [3, 9], [7.5, 9], [5, 16], [13, 6], [8.5, 6], [11, 0]], K.gold); p.line(9, 1, 5, 8, K.lgold); },
  cloud: (p) => {
    p.disc(5, 9, 3.6, K.white); p.disc(9.5, 6.5, 4.4, K.white); p.disc(12.5, 10, 3, K.white); p.rect(4, 9, 10, 4, K.white);
    p.hline(3, 14, 12, K.grey); p.set(8, 4, C('#ffffff'));
  },
  skip: (p) => { p.poly([[1, 3], [7, 8], [1, 13]], K.white); p.poly([[7, 3], [13, 8], [7, 13]], K.white); p.rect(13, 3, 2, 11, K.white); },
  pause: (p) => { p.rect(3, 2, 4, 12, K.white); p.rect(9, 2, 4, 12, K.white); p.vline(3, 2, 13, K.grey); p.vline(9, 2, 13, K.grey); },
  'medal-gold': (p) => medal(p, K.gold, K.dgold, '1'),
  'medal-silver': (p) => medal(p, K.silver, K.dsilver, '2'),
  'medal-bronze': (p) => medal(p, K.bronze, K.dbronze, '3'),
  floppy: (p) => {
    p.rect(1, 1, 14, 14, K.dblue); p.rect(4, 1, 8, 5, K.grey); p.rect(9, 2, 2, 3, K.dgrey);
    p.rect(3, 9, 10, 6, K.white); p.hline(4, 11, 11, K.grey); p.hline(4, 11, 13, K.grey);
  },
  info: (p) => { p.disc(8, 8, 7, K.blue); p.rect(7, 3, 2, 2, K.white); p.rect(7, 6, 2, 6, K.white); p.hline(6, 9, 12, K.white); },
  person: (p) => { p.disc(8, 5, 3.4, K.skin); p.rect(5, 1, 6, 2, K.dbrown); p.ellipse(8, 13.5, 5.5, 3.5, K.blue); p.rect(7, 10, 2, 3, K.dblue); },
  letter: (p) => {
    p.rect(1, 3, 14, 10, K.cream); p.line(1, 3, 8, 9, K.dgold); p.line(15, 3, 8, 9, K.dgold);
    p.line(1, 12, 6, 7, K.grey); p.line(14, 12, 10, 7, K.grey); p.rect(11, 4, 3, 3, K.red);
  },
  trash: (p) => {
    p.rect(6, 1, 4, 2, K.dgrey); p.rect(2, 3, 12, 2, K.grey); p.poly([[3, 5], [13, 5], [12, 15], [4, 15]], K.dgrey);
    for (const x of [6, 8, 10]) p.vline(x, 7, 13, K.grey);
  },
  gear: (p) => {
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; p.disc(8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, 1.6, K.grey); }
    p.disc(8, 8, 5.4, K.grey); p.disc(8, 8, 2.2, 0); p.ring(8, 8, 4.4, K.dgrey); p.set(5, 4, K.white);
  },
  magnifier: (p) => {
    p.line(10, 10, 14, 14, K.dbrown); p.line(11, 10, 15, 14, K.dbrown); p.line(10, 11, 14, 15, K.dbrown);
    p.disc(6.5, 6.5, 5.4, K.dgrey); p.disc(6.5, 6.5, 4, K.lblue); p.set(4, 4, K.white); p.set(5, 3, K.white);
  },
  'no-entry': (p) => { p.disc(8, 8, 7, K.red); p.rect(3, 7, 10, 3, K.white); p.set(4, 3, C('#ff9a9a')); },
  receipt: (p) => {
    p.poly([[3, 1], [13, 1], [13, 15], [11.5, 13.5], [10, 15], [8, 13.5], [6, 15], [4.5, 13.5], [3, 15]], K.white);
    for (const y of [4, 6, 8]) p.hline(5, 11, y, K.grey);
    p.hline(5, 8, 11, K.dgrey); p.rect(10, 10, 2, 2, K.green);
  },
  swords: (p) => {
    p.line(2, 2, 12, 12, K.silver); p.line(3, 2, 13, 12, K.dsilver);
    p.line(14, 2, 4, 12, K.silver); p.line(13, 2, 3, 12, K.dsilver);
    p.line(10, 14, 14, 10, K.dbrown); p.line(2, 10, 6, 14, K.dbrown); p.put(13, 13, K.gold); p.put(2, 13, K.gold);
  },
  clipboard: (p) => {
    p.rect(2, 2, 12, 14, K.brown); p.rect(4, 4, 8, 10, K.white); p.rect(6, 1, 4, 3, K.grey);
    for (const y of [6, 8, 10]) p.hline(5, 10, y, K.grey); p.hline(5, 8, 12, K.grey);
  },
  'money-out': (p) => {
    p.disc(9, 9, 6, K.gold); p.ring(9, 9, 4.6, K.dgold); drawText(p, '$', 8, 7, K.dgold);
    p.poly([[0, 3], [5, 1], [4, 5]], K.white); p.poly([[15, 1], [11, 0], [12, 4]], K.white);
  },
  candle: (p) => {
    p.ellipse(8, 3, 1.6, 2.6, K.orange); p.put(8, 3, K.gold); p.vline(8, 5, 6, K.ink);
    p.rect(5, 6, 6, 8, K.cream); p.vline(6, 7, 13, K.white); p.rect(3, 14, 10, 2, K.dgold);
  },
  'bell-off': (p) => {
    p.poly([[8, 1], [12, 4], [13, 11], [3, 11], [4, 4]], K.gold); p.rect(2, 11, 12, 2, K.dgold); p.disc(8, 14, 1.4, K.dgold);
    p.line(1, 1, 14, 14, K.red); p.line(2, 1, 15, 14, K.red);
  },
  phone: (p) => {
    p.poly([[2, 2], [6, 1], [7, 5], [5, 7], [9, 11], [11, 9], [15, 10], [14, 14], [11, 15], [1, 5]], K.red);
    p.line(3, 3, 5, 2, C('#ff9a9a'));
  },
  chains: (p) => {
    p.ellipse(4.5, 4.5, 3.6, 2.4, K.dsilver); p.ellipse(4.5, 4.5, 2, 0.9, 0);
    p.ellipse(8, 8, 2.4, 3.6, K.silver); p.ellipse(8, 8, 0.9, 2, 0);
    p.ellipse(11.5, 11.5, 3.6, 2.4, K.dsilver); p.ellipse(11.5, 11.5, 2, 0.9, 0);
  },
  moon: (p) => {
    p.disc(8, 8, 6.5, K.cream);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + 0.5 - 11) ** 2 + (y + 0.5 - 6) ** 2 < 30) p.put(x, y, 0);
    p.put(4, 9, K.grey);
  },
  sun: (p) => {
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; p.line(8 + Math.cos(a) * 5, 8 + Math.sin(a) * 5, 8 + Math.cos(a) * 7.4, 8 + Math.sin(a) * 7.4, K.orange); }
    p.disc(8, 8, 4.2, K.gold); p.set(6, 6, K.lgold);
  },
  folder: (p) => { p.rect(1, 3, 6, 2, K.dgold); p.rect(1, 5, 14, 9, K.gold); p.hline(1, 14, 7, K.lgold); p.hline(1, 14, 13, K.dgold); },
  coffee: (p) => {
    p.rect(2, 6, 10, 8, K.white); p.rect(3, 7, 8, 2, K.brown); p.ring(13, 9.5, 2, K.white); p.hline(1, 13, 14, K.grey);
    p.line(5, 1, 6, 4, K.grey); p.line(8, 0, 9, 4, K.grey);
  },
  trumpet: (p) => {
    p.rect(1, 7, 9, 2, K.gold); p.poly([[9, 8], [15, 3], [15, 13]], K.gold); p.vline(15, 3, 13, K.dgold);
    for (const x of [4, 6]) p.rect(x, 4, 1, 3, K.dgold); p.rect(1, 6, 2, 4, K.dgold);
  },
  violin: (p) => {
    p.ellipse(7, 11, 4.4, 4, K.brown); p.ellipse(7, 6.5, 3.2, 3, K.brown); p.rect(6, 7, 2, 4, K.dbrown);
    p.line(8, 4, 13, 0, K.black); p.line(9, 4, 14, 0, K.black); p.put(6, 9, K.ink); p.put(8, 9, K.ink);
    p.line(1, 15, 14, 5, K.cream);
  },
  keyboard: (p) => {
    p.rect(0, 4, 16, 9, K.white); p.rect(0, 3, 16, 2, K.black);
    for (const x of [2, 4, 7, 9, 11, 14]) p.rect(x, 5, 1, 4, K.black);
    for (let x = 2; x < 16; x += 2) p.vline(x, 9, 12, K.grey);
  },
  fountain: (p) => {
    p.ellipse(8, 13, 7, 2.4, K.grey); p.ellipse(8, 12.5, 5.6, 1.4, K.blue); p.rect(7, 6, 2, 6, K.grey);
    p.line(8, 2, 3, 9, K.lblue); p.line(8, 2, 13, 9, K.lblue); p.vline(8, 1, 6, K.lblue);
  },
  crane: (p) => {
    p.vline(4, 1, 14, K.gold); p.vline(5, 1, 14, K.dgold); p.hline(2, 15, 2, K.gold); p.line(5, 6, 12, 2, K.dgold);
    p.vline(13, 3, 8, K.dgrey); p.rect(12, 8, 3, 2, K.dgrey); p.rect(1, 14, 8, 2, K.dgrey);
  },
  sponge: (p) => {
    p.rect(2, 5, 12, 8, K.gold); p.rect(2, 11, 12, 2, K.green);
    for (const [x, y] of [[4, 6], [8, 7], [11, 6], [6, 9], [10, 9]]) p.put(x, y, K.dgold);
    p.disc(13, 3, 1.4, K.lblue); p.disc(4, 2.5, 1, K.lblue);
  },
  shark: (p) => {
    p.poly([[0, 10], [5, 7], [8, 2], [9, 7], [14, 8], [16, 6], [15, 11], [16, 14], [13, 12], [6, 13]], K.dsilver);
    p.poly([[3, 11], [13, 11], [8, 13]], K.white); p.put(4, 9, K.ink);
  },
  drink: (p) => {
    p.poly([[3, 1], [13, 1], [12, 6], [8, 9], [4, 6]], C('#f8f8ff')); p.poly([[4, 3], [12, 3], [11.5, 6], [8, 8], [4.5, 6]], K.dred);
    p.vline(8, 9, 13, K.grey); p.hline(5, 11, 14, K.grey);
  },
  gift: (p) => {
    p.rect(1, 6, 14, 9, K.red); p.rect(1, 6, 14, 2, K.dred); p.rect(7, 6, 2, 9, K.gold);
    p.ellipse(5, 4, 3, 2, K.gold); p.ellipse(11, 4, 3, 2, K.gold); p.rect(7, 4, 2, 2, K.dgold);
  },
  tent: (p) => {
    p.poly([[8, 1], [15, 14], [1, 14]], K.green); p.poly([[8, 1], [11, 14], [5, 14]], K.dgreen); p.poly([[8, 6], [10, 14], [6, 14]], K.ink);
    p.hline(0, 15, 15, K.dbrown);
  },
  rain: (p) => {
    p.disc(5, 6, 3.4, K.grey); p.disc(10, 5, 4, K.grey); p.rect(3, 6, 11, 3, K.grey); p.set(9, 3, K.white);
    for (const x of [4, 8, 12]) p.line(x, 11, x - 1, 14, K.blue);
  },
  speaker: (p) => {
    p.rect(1, 5, 4, 6, K.dgrey); p.poly([[5, 5], [9, 1], [9, 15], [5, 11]], K.grey);
    p.vline(11, 6, 9, K.blue); p.vline(13, 4, 11, K.blue); p.vline(15, 2, 13, K.blue);
  },
  palette: (p) => {
    p.ellipse(8, 8.5, 7.5, 6.5, K.cream); p.disc(10, 11, 1.6, 0);
    p.disc(4.5, 7, 1.4, K.red); p.disc(7.5, 4.5, 1.4, K.gold); p.disc(11.5, 5, 1.4, K.blue); p.disc(12.5, 8.5, 1.4, K.green);
  },
  health: (p) => { p.rect(1, 1, 14, 14, K.white); p.rect(6, 3, 4, 10, K.red); p.rect(3, 6, 10, 4, K.red); },
  box: (p) => {
    p.poly([[8, 1], [15, 4], [8, 7], [1, 4]], C('#d8a868')); p.poly([[1, 4], [8, 7], [8, 15], [1, 12]], K.brown);
    p.poly([[15, 4], [8, 7], [8, 15], [15, 12]], K.dbrown); p.line(4.5, 2.5, 11.5, 5.5, K.cream);
  },
  card: (p) => {
    p.rect(3, 1, 10, 14, K.white); p.rect(3, 1, 10, 1, K.grey);
    drawText(p, 'J', 4, 2, K.red); p.disc(8, 9, 2.2, K.purple); p.poly([[6, 7], [8, 4], [10, 7]], K.red);
  },
  speech: (p) => { p.ellipse(8, 7, 7.4, 5.4, K.white); p.poly([[3, 10], [6, 11], [2, 15]], K.white); for (const x of [5, 8, 11]) p.put(x, 7, K.dgrey); },
  hand: (p) => {
    p.rect(3, 7, 10, 7, K.skin);
    for (const [x, t] of [[3, 4], [6, 2], [9, 2], [12, 4]] as const) p.rect(x, t, 2, 8 - t + 1, K.skin);
    p.line(13, 9, 15, 6, K.skin); for (const x of [5, 8, 11]) p.vline(x, 4, 7, K.dskin);
  },
  'thumbs-up': (p) => {
    p.rect(1, 7, 3, 8, K.blue); p.rect(4, 7, 10, 8, K.skin); p.poly([[5, 7], [7, 1], [9, 2], [9, 7]], K.skin);
    for (const y of [9, 11, 13]) p.hline(10, 13, y, K.dskin);
  },
  flex: (p) => {
    p.poly([[1, 15], [1, 10], [6, 8], [9, 2], [12, 1], [12, 5], [10, 7], [14, 9], [13, 15]], K.skin);
    p.ellipse(9, 10, 3, 2.4, K.dskin); p.set(8, 9, C('#f8dcc0'));
  },
  shush: (p) => face(p, (q) => { q.hline(4, 6, 6, K.ink); q.hline(10, 12, 6, K.ink); q.hline(6, 10, 11, K.ink); q.rect(7, 7, 2, 7, K.skin); q.put(7, 7, K.dskin); }),
  'face-happy': (p) => face(p, (q) => { q.put(5, 6, K.ink); q.put(6, 5, K.ink); q.put(7, 6, K.ink); q.put(9, 6, K.ink); q.put(10, 5, K.ink); q.put(11, 6, K.ink); q.poly([[4, 9], [12, 9], [8, 13]], K.dred); q.set(3, 9, K.pink); q.set(12, 9, K.pink); }),
  'face-smile': (p) => face(p, (q) => { eyes(q); smile(q); }),
  'face-neutral': (p) => face(p, (q) => { eyes(q); q.hline(5, 10, 11, K.ink); }),
  'face-wry': (p) => face(p, (q) => { q.hline(4, 6, 5, K.ink); q.rect(5, 6, 2, 1, K.ink); q.rect(10, 6, 2, 2, K.ink); q.hline(6, 9, 11, K.ink); q.put(10, 10, K.ink); }),
  'face-think': (p) => face(p, (q) => { q.hline(4, 6, 4, K.ink); eyes(q); q.hline(6, 9, 11, K.ink); q.rect(9, 12, 4, 3, K.skin); q.rect(11, 10, 2, 2, K.skin); }),
  'face-sad': (p) => face(p, (q) => { eyes(q); q.hline(5, 10, 10, K.ink); q.put(4, 11, K.ink); q.put(11, 11, K.ink); q.vline(4, 8, 9, K.blue); }),
  'face-angry': (p) => face(p, (q) => { q.line(4, 4, 6, 5, K.ink); q.line(11, 5, 13, 4, K.ink); eyes(q); q.hline(5, 10, 11, K.ink); q.put(4, 12, K.ink); q.put(11, 12, K.ink); }, K.orange),
  'face-stress': (p) => face(p, (q) => { eyes(q); q.ellipse(8, 11, 2, 1.6, K.ink); q.rect(3, 1, 10, 3, K.lblue); q.disc(13, 6, 1.2, K.blue); }),
  'face-no': (p) => {
    p.disc(8, 5, 4, K.skin); p.rect(5, 4, 2, 1, K.ink); p.rect(9, 4, 2, 1, K.ink); p.hline(6, 9, 7, K.ink);
    p.rect(2, 9, 12, 6, K.purple); p.line(2, 10, 13, 14, K.skin); p.line(2, 14, 13, 10, K.skin); p.line(3, 10, 13, 13, K.dskin);
  },
  'face-money': (p) => face(p, (q) => { drawText(q, '$', 4, 4, K.dgreen); drawText(q, '$', 10, 4, K.dgreen); q.poly([[4, 10], [12, 10], [8, 13]], K.dred); q.hline(6, 10, 10, K.green); }),
};

export const isIcon31 = (n: string): n is Icon31 => (ICON31_NAMES as readonly string[]).includes(n);

/** Desenha o ícone 16×16 (com contorno) ou null se o nome não é deste conjunto. */
export function icon31Px(name: string): Px | null {
  if (!isIcon31(name)) return null;
  const p = new Px(16, 16);
  DRAW[name](p);
  p.outline(K.ink);
  return p;
}
