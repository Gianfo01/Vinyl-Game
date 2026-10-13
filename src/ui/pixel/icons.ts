// Ícones 16×16 em pixel art, desenhados por código e cacheados como data URL.
// Desenho em cores-base (iconkit.ts); o acabamento (rampas, luz de cima à esquerda, contorno quente) é automático.
// Use icon('money') para um <img class="px pxi"> pronto para o DOM.

import { drawText } from './font';
import { finishIcon, K } from './iconkit';
import { C, Px, hsl, mix, noise, shade, upscale, withAlpha, type Col } from './px';

export const ICON_NAMES = [
  'money', 'fame', 'fans', 'disc', 'cd', 'cassette', 'stream', 'chart-up', 'chart-down', 'mic', 'guitar', 'drums',
  'calendar', 'contract', 'warning', 'heart', 'broken-heart', 'trophy', 'gold-disc', 'platinum-disc', 'house', 'tour-bus',
  'plane', 'ship', 'train', 'newspaper', 'tv', 'radio', 'camera', 'film', 'gamepad', 'shirt', 'handshake', 'gavel', 'bank',
  'hologram', 'brain', 'fire', 'skull', 'sleep', 'sparkle', 'stress', 'clock', 'globe', 'lock', 'key',
  'flag', 'star', 'note', 'pen', 'vault', 'bulb', 'building', 'rocket',
] as const;

export type IconName = (typeof ICON_NAMES)[number];


function star(p: Px, cx: number, cy: number, ro: number, ri: number, n: number, col: Col | ((x: number, y: number) => Col)): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const r = i % 2 ? ri : ro;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  p.poly(pts, col);
}

function heartShape(p: Px, col: Col, dx = 0): void {
  p.disc(5 + dx, 6, 3.2, col);
  p.disc(11 + dx, 6, 3.2, col);
  p.poly([[1.6 + dx, 6.8], [14.4 + dx, 6.8], [8 + dx, 14]], col);
}

/** Disco: vinil com sulcos discretos (tons próximos agrupam no relevo), rótulo e furo. */
function record(p: Px, base: Col, label: Col): void {
  const groove = shade(base, -0.1);
  p.disc(8, 8, 7, (_x, _y, d) => (d < 2.6 ? label : d > 3.4 && d < 6.2 && Math.floor(d * 1.4) % 2 ? groove : base));
  p.put(7, 7, K.ink);
  p.put(8, 7, K.ink);
  p.put(7, 8, K.ink);
  p.put(8, 8, K.ink);
}

const DRAW: Record<IconName, (p: Px) => void> = {
  money: (p) => {
    p.disc(8, 8, 7, K.gold);
    drawText(p, '$', 7, 5.5, K.dbrown);
  },
  fame: (p) => star(p, 8, 8.6, 7.4, 3.2, 5, K.amber),
  fans: (p) => {
    p.disc(11, 4.5, 2.4, K.skin);
    p.ellipse(11, 11, 3.6, 3.5, K.dblue);
    p.disc(5.5, 6, 2.6, K.skin);
    p.ellipse(5.5, 12.5, 4, 3.4, K.orange);
    p.put(4, 5, K.dbrown);
    p.hline(4, 7, 3, K.dbrown);
  },
  disc: (p) => record(p, K.black, K.dred),
  cd: (p) => {
    p.disc(8, 8, 7, (x, y) => {
      const a = Math.atan2(y - 7.5, x - 7.5);
      return mix(K.grey, hsl((a * 180) / Math.PI + 180, 35, 72), 0.3);
    });
    p.ring(8, 8, 3, K.dgrey);
    for (let y = 6; y <= 9; y++) for (let x = 6; x <= 9; x++) if ((x - 7.5) ** 2 + (y - 7.5) ** 2 < 2.3) p.put(x, y, 0);
  },
  cassette: (p) => {
    p.rect(1, 3, 14, 10, K.black);
    p.rect(3, 4, 10, 4, K.cream);
    p.hline(3, 12, 5, K.red);
    p.disc(5.5, 9.5, 1.6, K.white);
    p.disc(10.5, 9.5, 1.6, K.white);
    p.put(5, 9, K.black);
    p.put(10, 9, K.black);
    p.rect(4, 12, 8, 1, K.dgrey);
  },
  stream: (p) => {
    p.rect(1, 2, 14, 12, K.teal);
    p.poly([[5.5, 4.5], [11.5, 8], [5.5, 11.5]], K.white);
  },
  'chart-up': (p) => {
    p.vline(1, 1, 14, K.dgrey);
    p.hline(1, 14, 14, K.dgrey);
    p.line(2, 12, 6, 8, K.green);
    p.line(6, 8, 8, 10, K.green);
    p.line(8, 10, 13, 4, K.green);
    p.line(2, 11, 6, 7, K.green);
    p.line(8, 9, 12, 4, K.green);
    p.poly([[10, 2.5], [14.5, 2], [14, 6.5]], K.green);
  },
  'chart-down': (p) => {
    p.vline(1, 1, 14, K.dgrey);
    p.hline(1, 14, 14, K.dgrey);
    p.line(2, 3, 6, 7, K.red);
    p.line(6, 7, 8, 5, K.red);
    p.line(8, 5, 13, 11, K.red);
    p.line(2, 4, 6, 8, K.red);
    p.line(8, 6, 12, 11, K.red);
    p.poly([[10, 12.5], [14.5, 13], [14, 8.5]], K.red);
  },
  mic: (p) => {
    p.rect(7, 10, 2, 5, K.black);
    p.hline(5, 10, 15, K.black);
    p.disc(8, 5.5, 4, K.grey);
    p.hline(6, 10, 4, K.dgrey);
    p.hline(5, 11, 6, K.dgrey);
    p.hline(6, 10, 8, K.dgrey);
    p.hline(6, 10, 10, K.dgold);
  },
  guitar: (p) => {
    p.line(8, 8, 13, 2, K.dbrown);
    p.line(9, 8, 14, 2, K.dbrown);
    p.rect(13, 1, 2, 2, K.black);
    p.disc(5.5, 11, 3.8, K.red);
    p.disc(8, 8.2, 2.6, K.red);
    p.disc(5.5, 11, 1.6, K.cream);
    p.put(7, 9, K.ink);
    p.put(6, 10, K.ink);
    p.hline(3, 5, 13, K.ink);
  },
  drums: (p) => {
    p.rect(2, 7, 12, 6, K.dred);
    p.ellipse(8, 7, 6, 2, K.white);
    p.ellipse(8, 13, 6, 1.5, K.dred);
    for (let x = 3; x <= 13; x += 3) p.vline(x, 9, 12, K.gold);
    p.line(2, 1, 8, 6, K.paper);
    p.line(14, 1, 9, 6, K.paper);
  },
  calendar: (p) => {
    p.rect(2, 3, 12, 12, K.white);
    p.rect(2, 3, 12, 3, K.dred);
    p.put(5, 2, K.dgrey);
    p.put(10, 2, K.dgrey);
    for (let y = 8; y <= 13; y += 2) for (let x = 4; x <= 12; x += 2) p.put(x, y, x === 8 && y === 10 ? K.red : K.dgrey);
  },
  contract: (p) => {
    p.poly([[3, 1], [11, 1], [13, 3], [13, 15], [3, 15]], K.white);
    p.poly([[11, 1], [13, 3], [11, 3]], K.paper);
    for (let y = 4; y <= 9; y += 2) p.hline(5, 11, y, K.paper);
    p.line(5, 13, 7, 11, K.dblue);
    p.line(7, 11, 8, 13, K.dblue);
    p.line(8, 13, 11, 11, K.dblue);
  },
  warning: (p) => {
    p.poly([[8, 1], [15.5, 14.5], [0.5, 14.5]], K.amber);
    p.rect(7, 5, 2, 5, K.ink);
    p.rect(7, 11, 2, 2, K.ink);
  },
  heart: (p) => heartShape(p, K.red),
  'broken-heart': (p) => {
    heartShape(p, K.dred);
    const crack = [[8, 3], [7, 5], [9, 7], [7, 9], [9, 11], [8, 13]];
    p.map((c, x) => (x > 8 ? shade(c, -0.12) : c));
    for (let i = 0; i + 1 < crack.length; i++) {
      const [x0, y0] = crack[i];
      const [x1, y1] = crack[i + 1];
      for (let k = 0; k <= 2; k++) p.put(Math.round(x0 + ((x1 - x0) * k) / 2), Math.round(y0 + ((y1 - y0) * k) / 2), 0);
    }
  },
  trophy: (p) => {
    p.ring(3, 5, 2.2, K.dgold);
    p.ring(13, 5, 2.2, K.dgold);
    p.poly([[3, 1], [13, 1], [12, 6], [9, 9], [7, 9], [4, 6]], K.gold);
    p.rect(7, 9, 2, 3, K.dgold);
    p.rect(4, 12, 8, 3, K.dbrown);
    p.hline(6, 9, 13, K.gold);
  },
  'gold-disc': (p) => record(p, K.gold, K.white),
  'platinum-disc': (p) => record(p, K.grey, K.dblue),
  house: (p) => {
    p.poly([[8, 1], [15, 8], [1, 8]], K.dred);
    p.rect(3, 8, 10, 7, K.cream);
    p.rect(7, 10, 3, 5, K.brown);
    p.rect(4, 9, 2, 2, K.glass);
    p.rect(11, 9, 2, 2, K.glass);
    p.rect(11, 2, 2, 4, K.dgrey);
  },
  'tour-bus': (p) => {
    p.rect(1, 4, 14, 8, K.orange);
    for (let x = 2; x <= 10; x += 3) p.rect(x, 5, 2, 3, K.glass);
    p.rect(13, 5, 2, 4, K.glass);
    p.hline(1, 14, 9, K.white);
    p.disc(4.5, 12.5, 1.8, K.black);
    p.disc(11.5, 12.5, 1.8, K.black);
  },
  plane: (p) => {
    p.ellipse(8, 8, 7, 1.8, K.white);
    p.poly([[6, 8], [10, 8], [7, 14], [5, 14]], K.grey);
    p.poly([[6, 8], [9, 8], [7, 3], [5, 3]], K.grey);
    p.poly([[1, 8], [3, 8], [2, 4], [1, 4]], K.dblue);
    for (let x = 9; x <= 13; x += 2) p.put(x, 7, K.dblue);
  },
  ship: (p) => {
    p.poly([[0.5, 10], [15.5, 10], [13, 14], [3, 14]], K.dblue);
    p.rect(4, 7, 8, 3, K.white);
    p.rect(9, 3, 2, 4, K.red);
    p.disc(11, 1.5, 1.2, withAlpha(K.grey, 200));
    p.hline(1, 14, 11, K.dred);
  },
  train: (p) => {
    p.rect(3, 2, 10, 11, K.dred);
    p.rect(4, 3, 8, 4, K.glass);
    p.rect(3, 9, 10, 2, K.black);
    p.put(5, 10, K.amber);
    p.put(10, 10, K.amber);
    p.disc(5, 14, 1.4, K.black);
    p.disc(11, 14, 1.4, K.black);
  },
  newspaper: (p) => {
    p.rect(1, 2, 14, 12, K.white);
    p.rect(2, 3, 12, 2, K.ink);
    p.rect(2, 6, 5, 4, K.paper);
    for (let y = 6; y <= 12; y += 2) p.hline(8, 13, y, K.dgrey);
    p.hline(2, 6, 11, K.dgrey);
    p.hline(2, 6, 13, K.dgrey);
  },
  tv: (p) => {
    p.line(6, 0, 8, 3, K.dgrey);
    p.line(11, 0, 8, 3, K.dgrey);
    p.rect(1, 3, 14, 10, K.brown);
    p.rect(2, 4, 9, 8, K.dblue);
    p.rect(3, 5, 4, 2, K.glass);
    p.put(13, 6, K.gold);
    p.put(13, 9, K.gold);
    p.rect(3, 13, 2, 2, K.dbrown);
    p.rect(11, 13, 2, 2, K.dbrown);
  },
  radio: (p) => {
    p.line(11, 1, 13, 4, K.dgrey);
    p.rect(1, 4, 14, 10, K.brown);
    p.rect(2, 6, 7, 6, K.paper);
    for (let y = 7; y <= 11; y += 2) p.hline(2, 8, y, K.dbrown);
    p.rect(10, 6, 4, 2, K.amber);
    p.disc(12, 11, 1.4, K.gold);
  },
  camera: (p) => {
    p.rect(1, 4, 14, 10, K.black);
    p.rect(3, 2, 4, 2, K.black);
    p.disc(8, 9, 3.6, K.dgrey);
    p.disc(8, 9, 2.2, K.dblue);
    p.put(7, 8, K.shine);
    p.rect(12, 5, 2, 1, K.gold);
  },
  film: (p) => {
    p.rect(1, 6, 14, 9, K.black);
    p.poly([[1, 2], [14, 0.5], [14.5, 4], [1.5, 5.5]], K.black);
    for (let x = 2; x < 14; x += 4) p.poly([[x, 2.2], [x + 2, 2], [x + 3, 4.6], [x + 1, 4.8]], K.white);
    p.hline(2, 13, 9, K.dgrey);
    p.hline(2, 13, 12, K.dgrey);
  },
  gamepad: (p) => {
    p.ellipse(4.5, 9, 3.6, 4, K.grey);
    p.ellipse(11.5, 9, 3.6, 4, K.grey);
    p.rect(4, 6, 8, 5, K.grey);
    p.rect(3, 8, 3, 1, K.black);
    p.rect(4, 7, 1, 3, K.black);
    p.put(11, 7, K.red);
    p.put(13, 8, K.blue);
    p.put(12, 9, K.green);
  },
  shirt: (p) => {
    p.poly([[5, 1], [11, 1], [15, 4], [13, 7], [12, 6], [12, 15], [4, 15], [4, 6], [3, 7], [1, 4]], K.red);
    p.poly([[6, 1], [10, 1], [8, 3.5]], K.skin);
    drawText(p, 'V', 7, 8, K.white);
  },
  handshake: (p) => {
    p.poly([[0, 5], [4, 4], [7, 8], [4, 11], [0, 10]], K.dblue);
    p.poly([[16, 5], [12, 4], [9, 8], [12, 11], [16, 10]], K.orange);
    p.ellipse(8, 8.5, 4, 3, K.skin);
    for (let x = 6; x <= 10; x += 2) p.put(x, 7, shade(K.skin, -0.25));
    p.hline(5, 11, 10, shade(K.skin, -0.25));
  },
  gavel: (p) => {
    p.rect(1, 12, 10, 3, K.brown);
    p.line(6, 9, 14, 1, K.dbrown);
    p.line(7, 9, 15, 1, K.dbrown);
    for (let k = 0; k < 4; k++) p.line(2 + k, 5 + k, 6 + k, 1 + k, K.brown);
    p.line(2, 5, 6, 1, K.gold);
  },
  bank: (p) => {
    p.poly([[8, 1], [15, 5], [1, 5]], K.paper);
    p.rect(1, 5, 14, 1, K.dgrey);
    for (let x = 2; x <= 12; x += 3) p.rect(x, 6, 2, 6, K.white);
    p.rect(1, 12, 14, 1, K.dgrey);
    p.rect(0, 13, 16, 2, K.paper);
    p.put(8, 3, K.gold);
  },
  hologram: (p) => {
    p.poly([[8, 9], [14, 2], [2, 2]], withAlpha(K.teal, 70));
    p.disc(8, 3.5, 1.8, withAlpha(C('#8ff0e4'), 220));
    p.rect(6, 5, 4, 4, withAlpha(C('#8ff0e4'), 200));
    for (let y = 2; y < 9; y += 2) p.hline(4, 12, y, withAlpha(K.shine, 40));
    p.ellipse(8, 12, 6, 2.2, K.dgrey);
    p.ellipse(8, 11, 4, 1.2, K.teal);
  },
  brain: (p) => {
    p.ellipse(8, 8, 7, 5.6, K.pink);
    const fold = shade(K.pink, -0.3);
    p.vline(8, 3, 13, fold);
    for (const [x0, y0, x1, y1] of [[3, 6, 6, 5], [4, 9, 7, 8], [10, 5, 13, 6], [9, 9, 12, 10], [3, 11, 5, 12], [11, 12, 13, 11]]) p.line(x0, y0, x1, y1, fold);
  },
  fire: (p) => {
    p.poly([[8, 0.5], [13, 7], [13.5, 11], [11, 15], [5, 15], [2.5, 11], [3.5, 6], [6, 8]], K.red);
    p.poly([[8, 4], [11, 9], [11, 12], [9.5, 15], [6.5, 15], [5, 12], [6, 9]], K.orange);
    p.poly([[8, 8], [9.6, 11], [9, 14.5], [7, 14.5], [6.4, 11]], K.amber);
  },
  skull: (p) => {
    p.disc(8, 7, 6, K.white);
    p.rect(5, 11, 6, 3, K.white);
    p.disc(5.6, 7, 1.6, K.ink);
    p.disc(10.4, 7, 1.6, K.ink);
    p.put(8, 10, K.ink);
    for (let x = 6; x <= 10; x += 2) p.vline(x, 12, 13, K.paper);
  },
  sleep: (p) => {
    p.disc(6, 9, 5.5, K.amber);
    for (let y = 1; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + 0.5 - 8.5) ** 2 + (y + 0.5 - 7) ** 2 < 4.6 * 4.6 + 0.3) p.put(x, y, 0);
    drawText(p, 'Z', 10, 1, K.dblue);
    drawText(p, 'Z', 12, 7, K.blue);
  },
  sparkle: (p) => {
    star(p, 6, 7, 6, 1.4, 4, K.amber);
    star(p, 12.5, 3.5, 3, 0.8, 4, K.gold);
    star(p, 12, 12, 2.6, 0.7, 4, K.white);
  },
  stress: (p) => {
    p.disc(5, 6, 3.4, K.grey);
    p.disc(10, 5, 4, K.grey);
    p.ellipse(8, 8, 6.5, 2.5, K.grey);
    p.poly([[8, 9], [11, 9], [9, 12], [11, 12], [6, 16], [7.5, 12.5], [5.5, 12.5]], K.amber);
  },
  clock: (p) => {
    p.disc(8, 8, 7, K.dbrown);
    p.disc(8, 8, 5.6, K.white);
    p.vline(8, 4, 8, K.ink);
    p.hline(8, 11, 8, K.ink);
    p.put(8, 3, K.dgrey);
    p.put(12, 8, K.dgrey);
    p.put(8, 12, K.dgrey);
    p.put(3, 8, K.dgrey);
  },
  globe: (p) => {
    p.disc(8, 8, 7, (x, y) => (noise(x >> 1, y >> 1, 7) > 0.55 ? K.green : K.blue));
  },
  lock: (p) => {
    p.ring(8, 5.5, 3.6, K.grey);
    p.ring(8, 5.5, 2.8, K.grey);
    p.rect(3, 7, 10, 8, K.gold);
    p.rect(7, 9, 2, 4, K.ink);
  },
  key: (p) => {
    p.disc(4.5, 5, 3.6, K.gold);
    for (let y = 3; y <= 6; y++) for (let x = 3; x <= 6; x++) if ((x + 0.5 - 4.5) ** 2 + (y + 0.5 - 5) ** 2 < 2.2) p.put(x, y, 0);
    p.line(7, 7, 14, 14, K.gold);
    p.line(8, 7, 15, 14, K.gold);
    p.line(11, 12, 13, 10, K.gold);
    p.line(13, 14, 14, 12, K.gold);
  },
  flag: (p) => {
    p.vline(3, 1, 15, K.dbrown);
    p.poly([[4, 2], [14, 2], [11, 5.5], [14, 9], [4, 9]], K.red);
  },
  star: (p) => {
    p.vline(8, 0, 2, K.dgreen);
    p.rect(9, 0, 3, 2, K.green);
    p.poly([[8, 2], [15, 13], [1, 13]], K.purple);
    p.poly([[8, 2], [11, 13], [5, 13]], K.white);
    p.rect(1, 13, 15, 2, K.dbrown);
    p.rect(7, 9, 2, 4, K.ink);
  },
  note: (p) => {
    p.disc(5, 12, 2.6, K.purple);
    p.disc(12, 10.5, 2.6, K.purple);
    p.vline(7, 3, 12, K.purple);
    p.vline(14, 2, 10, K.purple);
    p.rect(7, 2, 8, 2, K.purple);
  },
  pen: (p) => {
    p.line(3, 13, 12, 4, K.blue);
    p.line(4, 13, 13, 4, K.blue);
    p.line(4, 14, 13, 5, K.dblue);
    p.rect(12, 2, 2, 2, K.gold);
    p.put(2, 14, K.ink);
  },
  vault: (p) => {
    p.rect(2, 2, 12, 12, K.dgrey);
    p.rect(3, 3, 10, 10, K.grey);
    p.ring(8, 8, 3, K.dgrey);
    p.put(8, 8, K.gold);
  },
  bulb: (p) => {
    p.disc(8, 6.5, 5, K.amber);
    p.rect(6, 11, 4, 2, K.grey);
    p.rect(7, 13, 2, 2, K.dgrey);
  },
  building: (p) => {
    p.rect(3, 2, 10, 13, K.dblue);
    for (let y = 4; y < 13; y += 3) for (let x = 5; x < 12; x += 3) p.rect(x, y, 2, 2, K.amber);
    p.rect(7, 12, 2, 3, K.ink);
  },
  rocket: (p) => {
    p.poly([[8, 1], [11, 6], [11, 11], [5, 11], [5, 6]], K.white);
    p.disc(8, 6.5, 1.4, K.glass);
    p.poly([[5, 8], [2, 12], [5, 11]], K.red);
    p.poly([[11, 8], [14, 12], [11, 11]], K.red);
    p.rect(6, 12, 4, 2, K.orange);
  },
};

const pxCache = new Map<IconName, Px>();
const urlCache = new Map<string, string>();

export function iconPx(name: IconName): Px {
  let p = pxCache.get(name);
  if (!p) {
    p = new Px(16, 16);
    (DRAW[name] ?? DRAW.warning)(p);
    finishIcon(p);
    pxCache.set(name, p);
  }
  return p;
}

/** Canvas ampliado (escala inteira). */
export function iconCanvas(name: IconName, scale = 2): HTMLCanvasElement {
  return upscale(iconPx(name).canvas(), 16 * scale);
}

export function iconUrl(name: IconName, scale = 2): string {
  const key = `${name}:${scale}`;
  let u = urlCache.get(key);
  if (!u) {
    u = iconCanvas(name, scale).toDataURL();
    urlCache.set(key, u);
  }
  return u;
}

/** <img> nítido de um ícone; scale 1 = 16 px, 2 = 32 px. */
export function icon(name: IconName, scale = 1, title?: string): HTMLImageElement {
  const img = document.createElement('img');
  img.src = iconUrl(name, Math.max(1, Math.ceil(scale)));
  img.width = Math.round(16 * scale);
  img.height = Math.round(16 * scale);
  img.className = 'px pxi';
  img.alt = title ?? '';
  if (title) img.title = title;
  img.draggable = false;
  return img;
}
