// Ícones 16×16 em pixel art, desenhados por código e cacheados como data URL.
// Use icon('money') para um <img class="px pxi"> pronto para o DOM.

import { drawText } from './font';
import { C, Px, dith, hsl, mix, noise, shade, upscale, withAlpha, type Col } from './px';

export const ICON_NAMES = [
  'money', 'fame', 'fans', 'disc', 'cd', 'cassette', 'stream', 'chart-up', 'chart-down', 'mic', 'guitar', 'drums',
  'calendar', 'contract', 'warning', 'heart', 'broken-heart', 'trophy', 'gold-disc', 'platinum-disc', 'house', 'tour-bus',
  'plane', 'ship', 'train', 'newspaper', 'tv', 'radio', 'camera', 'film', 'gamepad', 'shirt', 'handshake', 'gavel', 'bank',
  'hologram', 'brain', 'fire', 'skull', 'sleep', 'sparkle', 'stress', 'clock', 'globe', 'lock', 'key',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

const K = {
  ink: C('#1a1214'),
  white: C('#f8f4ec'),
  grey: C('#a8a4a0'),
  dgrey: C('#5c5856'),
  gold: C('#f0c040'),
  dgold: C('#b07c1c'),
  red: C('#e04848'),
  dred: C('#9c2c2c'),
  green: C('#48b85c'),
  dgreen: C('#2c7a3c'),
  blue: C('#4a8ae0'),
  dblue: C('#2c5aa0'),
  teal: C('#2ec8c0'),
  orange: C('#f08a2c'),
  brown: C('#9a6034'),
  dbrown: C('#5e3a1e'),
  skin: C('#f0c8a0'),
  pink: C('#f0a0b8'),
  purple: C('#8a5ad0'),
  black: C('#2a2628'),
};

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

function record(p: Px, base: Col, label: Col): void {
  p.disc(8, 8, 7, (_x, _y, d) => (d < 2.6 ? label : Math.floor(d * 1.4) % 2 ? base : shade(base, -0.18)));
  p.put(7, 7, K.ink);
  p.put(8, 7, K.ink);
  p.put(7, 8, K.ink);
  p.put(8, 8, K.ink);
  p.set(4, 4, withAlpha(C('#ffffff'), 150));
  p.set(5, 3, withAlpha(C('#ffffff'), 110));
  p.set(3, 5, withAlpha(C('#ffffff'), 110));
}

const DRAW: Record<IconName, (p: Px) => void> = {
  money: (p) => {
    p.disc(8, 8, 7, K.gold);
    p.ring(8, 8, 5.5, K.dgold);
    p.set(4, 4, C('#fff2b0'));
    p.set(5, 3, C('#fff2b0'));
    drawText(p, '$', 7, 6 - 0, K.dgold);
  },
  fame: (p) => star(p, 8, 8.6, 7.4, 3.2, 5, (_x, y) => (y < 7 ? C('#ffe680') : K.gold)),
  fans: (p) => {
    p.disc(11, 4.5, 2.4, C('#c8a080'));
    p.ellipse(11, 11, 3.6, 3.5, K.dblue);
    p.disc(5.5, 6, 2.6, K.skin);
    p.ellipse(5.5, 12.5, 4, 3.4, K.orange);
    p.put(4, 5, C('#5a3a20'));
    p.hline(4, 7, 3, C('#5a3a20'));
  },
  disc: (p) => record(p, K.black, K.red),
  cd: (p) => {
    p.disc(8, 8, 7, (x, y) => {
      const a = Math.atan2(y - 7.5, x - 7.5);
      return mix(C('#d8dce4'), hsl((a * 180) / Math.PI + 180, 60, 75), 0.35);
    });
    p.ring(8, 8, 3, C('#9aa0aa'));
    p.disc(8, 8, 1.4, 0);
    for (let y = 6; y <= 9; y++) for (let x = 6; x <= 9; x++) if ((x - 7.5) ** 2 + (y - 7.5) ** 2 < 2.3) p.put(x, y, 0);
    p.set(4, 4, C('#ffffff'));
    p.set(5, 4, C('#ffffff'));
  },
  cassette: (p) => {
    p.rect(1, 3, 14, 10, K.black);
    p.rect(3, 4, 10, 4, C('#e8d8b0'));
    p.hline(3, 12, 5, K.red);
    p.disc(5.5, 9.5, 1.6, K.white);
    p.disc(10.5, 9.5, 1.6, K.white);
    p.put(5, 9, K.black);
    p.put(10, 9, K.black);
    p.rect(4, 12, 8, 1, K.dgrey);
  },
  stream: (p) => {
    p.rect(1, 2, 14, 12, K.teal);
    p.hline(2, 13, 2, C('#7af0e8'));
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
    p.rect(7, 9, 2, 6, K.black);
    p.hline(6, 9, 9, K.dgrey);
    p.disc(8, 5, 3.6, (x, y) => (dith(x, y, 0.5) ? K.grey : C('#d8d4d0')));
    p.set(6, 3, K.white);
  },
  guitar: (p) => {
    p.line(8, 8, 13, 2, C('#4a2a14'));
    p.line(9, 8, 14, 2, C('#4a2a14'));
    p.rect(13, 1, 2, 2, K.black);
    p.disc(5.5, 11, 3.8, K.red);
    p.disc(8, 8.2, 2.6, K.red);
    p.disc(5.5, 11, 2.2, C('#f08060'));
    p.put(7, 9, K.black);
    p.put(6, 10, K.black);
    p.hline(3, 5, 13, K.black);
  },
  drums: (p) => {
    p.rect(2, 7, 12, 6, K.red);
    p.ellipse(8, 7, 6, 2, K.white);
    p.ellipse(8, 13, 6, 1.5, K.dred);
    for (let x = 3; x <= 13; x += 3) p.vline(x, 8, 12, K.gold);
    p.line(2, 1, 8, 6, C('#d8b080'));
    p.line(14, 1, 9, 6, C('#d8b080'));
  },
  calendar: (p) => {
    p.rect(2, 3, 12, 12, K.white);
    p.rect(2, 3, 12, 3, K.red);
    p.put(5, 2, K.dgrey);
    p.put(10, 2, K.dgrey);
    for (let y = 8; y <= 13; y += 2) for (let x = 4; x <= 12; x += 2) p.put(x, y, x === 8 && y === 10 ? K.red : K.dgrey);
  },
  contract: (p) => {
    p.poly([[3, 1], [11, 1], [13, 3], [13, 15], [3, 15]], K.white);
    p.poly([[11, 1], [13, 3], [11, 3]], K.grey);
    for (let y = 4; y <= 9; y += 2) p.hline(5, 11, y, K.grey);
    p.line(5, 13, 7, 11, K.dblue);
    p.line(7, 11, 8, 13, K.dblue);
    p.line(8, 13, 11, 11, K.dblue);
  },
  warning: (p) => {
    p.poly([[8, 1], [15.5, 14.5], [0.5, 14.5]], K.gold);
    p.rect(7, 5, 2, 5, K.ink);
    p.rect(7, 11, 2, 2, K.ink);
  },
  heart: (p) => {
    heartShape(p, K.red);
    p.put(4, 5, C('#ff9a9a'));
    p.put(5, 4, C('#ff9a9a'));
  },
  'broken-heart': (p) => {
    heartShape(p, K.dred);
    const crack = [[8, 3], [7, 5], [9, 7], [7, 9], [9, 11], [8, 13]];
    for (let i = 0; i + 1 < crack.length; i++) p.line(crack[i][0], crack[i][1], crack[i + 1][0], crack[i + 1][1], 0);
    p.map((c, x) => (x > 8 ? shade(c, -0.15) : c));
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
    p.hline(5, 10, 13, K.gold);
    p.vline(5, 2, 5, C('#fff2b0'));
  },
  'gold-disc': (p) => record(p, K.gold, K.white),
  'platinum-disc': (p) => record(p, C('#dfe8f0'), K.dblue),
  house: (p) => {
    p.poly([[8, 1], [15, 8], [1, 8]], K.red);
    p.rect(3, 8, 10, 7, C('#e8d0a0'));
    p.rect(7, 10, 3, 5, K.brown);
    p.rect(4, 9, 2, 2, K.blue);
    p.rect(11, 9, 2, 2, K.blue);
    p.rect(11, 2, 2, 4, K.dgrey);
  },
  'tour-bus': (p) => {
    p.rect(1, 4, 14, 8, K.orange);
    p.hline(1, 14, 4, C('#ffc070'));
    for (let x = 2; x <= 10; x += 3) p.rect(x, 5, 2, 3, C('#a8d8f0'));
    p.rect(13, 5, 2, 4, C('#a8d8f0'));
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
    p.hline(1, 14, 11, K.red);
  },
  train: (p) => {
    p.rect(3, 2, 10, 11, K.dred);
    p.rect(4, 3, 8, 4, C('#a8d8f0'));
    p.rect(3, 9, 10, 2, K.black);
    p.put(5, 10, K.gold);
    p.put(10, 10, K.gold);
    p.disc(5, 14, 1.4, K.black);
    p.disc(11, 14, 1.4, K.black);
  },
  newspaper: (p) => {
    p.rect(1, 2, 14, 12, K.white);
    p.rect(2, 3, 12, 2, K.ink);
    p.rect(2, 6, 5, 4, K.grey);
    for (let y = 6; y <= 12; y += 2) p.hline(8, 13, y, K.dgrey);
    p.hline(2, 6, 11, K.dgrey);
    p.hline(2, 6, 13, K.dgrey);
  },
  tv: (p) => {
    p.line(6, 0, 8, 3, K.dgrey);
    p.line(11, 0, 8, 3, K.dgrey);
    p.rect(1, 3, 14, 10, K.brown);
    p.rect(2, 4, 9, 8, C('#3a6ad0'));
    p.rect(3, 5, 3, 2, C('#a8d0ff'));
    p.put(13, 6, K.gold);
    p.put(13, 9, K.gold);
    p.rect(3, 13, 2, 2, K.dbrown);
    p.rect(11, 13, 2, 2, K.dbrown);
  },
  radio: (p) => {
    p.line(11, 1, 13, 4, K.dgrey);
    p.rect(1, 4, 14, 10, K.brown);
    p.hline(1, 14, 4, C('#c08850'));
    p.disc(5.5, 9, 3.2, (x, y) => (dith(x, y, 0.5) ? K.dbrown : C('#d8b080')));
    p.rect(10, 6, 4, 2, C('#f0e0a0'));
    p.disc(12, 11, 1.4, K.gold);
  },
  camera: (p) => {
    p.rect(1, 4, 14, 10, K.black);
    p.rect(3, 2, 4, 2, K.black);
    p.disc(8, 9, 3.6, K.dgrey);
    p.disc(8, 9, 2.2, C('#3a5aa0'));
    p.put(7, 8, K.white);
    p.rect(12, 5, 2, 1, K.gold);
  },
  film: (p) => {
    p.rect(1, 6, 14, 9, K.black);
    p.poly([[1, 2], [14, 0.5], [14.5, 4], [1.5, 5.5]], K.black);
    for (let x = 2; x < 14; x += 4) p.poly([[x, 2.2], [x + 2, 2], [x + 3, 4.6], [x + 1, 4.8]], K.white);
    p.hline(2, 13, 9, K.grey);
    p.hline(2, 13, 12, K.grey);
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
    p.poly([[6, 1], [10, 1], [8, 3.5]], C('#f8d0d0'));
    drawText(p, 'V', 7, 8, K.white);
  },
  handshake: (p) => {
    p.poly([[0, 5], [4, 4], [7, 8], [4, 11], [0, 10]], K.dblue);
    p.poly([[16, 5], [12, 4], [9, 8], [12, 11], [16, 10]], K.orange);
    p.ellipse(8, 8.5, 4, 3, K.skin);
    for (let x = 6; x <= 10; x += 2) p.put(x, 7, C('#c89870'));
    p.hline(5, 11, 10, C('#c89870'));
  },
  gavel: (p) => {
    p.rect(1, 12, 10, 3, K.brown);
    p.hline(1, 10, 12, C('#c08850'));
    p.line(6, 9, 14, 1, K.dbrown);
    p.line(7, 9, 15, 1, K.dbrown);
    for (let k = 0; k < 4; k++) p.line(2 + k, 5 + k, 6 + k, 1 + k, C('#b07038'));
    p.line(2, 5, 6, 1, C('#d89858'));
  },
  bank: (p) => {
    p.poly([[8, 1], [15, 5], [1, 5]], K.grey);
    p.rect(1, 5, 14, 1, K.dgrey);
    for (let x = 2; x <= 12; x += 3) p.rect(x, 6, 2, 6, C('#d8d4cc'));
    p.rect(1, 12, 14, 1, K.dgrey);
    p.rect(0, 13, 16, 2, K.grey);
    p.put(8, 3, K.gold);
  },
  hologram: (p) => {
    p.poly([[8, 9], [14, 2], [2, 2]], withAlpha(K.teal, 70));
    p.disc(8, 3.5, 1.8, withAlpha(C('#7ffff4'), 220));
    p.rect(6, 5, 4, 4, withAlpha(C('#7ffff4'), 200));
    for (let y = 2; y < 9; y += 2) p.hline(4, 12, y, withAlpha(C('#ffffff'), 40));
    p.ellipse(8, 12, 6, 2.2, K.dgrey);
    p.ellipse(8, 11, 4, 1.2, K.teal);
  },
  brain: (p) => {
    p.ellipse(8, 8, 7, 5.6, K.pink);
    p.vline(8, 3, 13, C('#c06a88'));
    for (const [x0, y0, x1, y1] of [[3, 6, 6, 5], [4, 9, 7, 8], [10, 5, 13, 6], [9, 9, 12, 10], [3, 11, 5, 12], [11, 12, 13, 11]]) p.line(x0, y0, x1, y1, C('#c06a88'));
    p.put(4, 4, C('#ffd0e0'));
  },
  fire: (p) => {
    p.poly([[8, 0.5], [13, 7], [13.5, 11], [11, 15], [5, 15], [2.5, 11], [3.5, 6], [6, 8]], K.red);
    p.poly([[8, 4], [11, 9], [11, 12], [9.5, 15], [6.5, 15], [5, 12], [6, 9]], K.orange);
    p.poly([[8, 8], [9.6, 11], [9, 14.5], [7, 14.5], [6.4, 11]], C('#ffe060'));
  },
  skull: (p) => {
    p.disc(8, 7, 6, K.white);
    p.rect(5, 11, 6, 3, K.white);
    p.disc(5.6, 7, 1.6, K.ink);
    p.disc(10.4, 7, 1.6, K.ink);
    p.put(8, 10, K.ink);
    for (let x = 6; x <= 10; x += 2) p.vline(x, 12, 13, K.grey);
  },
  sleep: (p) => {
    p.disc(6, 9, 5.5, C('#f0e08a'));
    p.disc(8.5, 7, 4.6, 0);
    for (let y = 1; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + 0.5 - 8.5) ** 2 + (y + 0.5 - 7) ** 2 < 4.6 * 4.6 + 0.3) p.put(x, y, 0);
    drawText(p, 'Z', 10, 1, K.dblue);
    drawText(p, 'Z', 12, 7, K.blue);
  },
  sparkle: (p) => {
    star(p, 6, 7, 6, 1.4, 4, K.gold);
    star(p, 12.5, 3.5, 3, 0.8, 4, C('#fff2b0'));
    star(p, 12, 12, 2.6, 0.7, 4, K.white);
  },
  stress: (p) => {
    p.disc(5, 6, 3.4, K.grey);
    p.disc(10, 5, 4, K.grey);
    p.ellipse(8, 8, 6.5, 2.5, K.grey);
    p.set(9, 3, C('#d0ccc8'));
    p.poly([[8, 9], [11, 9], [9, 12], [11, 12], [6, 16], [7.5, 12.5], [5.5, 12.5]], K.gold);
  },
  clock: (p) => {
    p.disc(8, 8, 7, K.ink);
    p.disc(8, 8, 6, K.white);
    p.vline(8, 4, 8, K.ink);
    p.hline(8, 11, 8, K.ink);
    p.put(8, 2, K.dgrey);
    p.put(13, 8, K.dgrey);
    p.put(8, 13, K.dgrey);
    p.put(2, 8, K.dgrey);
  },
  globe: (p) => {
    p.disc(8, 8, 7, (x, y) => (noise(x >> 1, y >> 1, 7) > 0.55 ? K.green : K.blue));
    p.set(4, 4, C('#c8e8ff'));
    p.set(5, 3, C('#c8e8ff'));
  },
  lock: (p) => {
    p.ring(8, 5.5, 3.6, K.dgrey);
    p.ring(8, 5.5, 2.8, K.dgrey);
    p.rect(3, 7, 10, 8, K.gold);
    p.hline(3, 12, 7, C('#fff2b0'));
    p.rect(7, 9, 2, 4, K.ink);
  },
  key: (p) => {
    p.disc(4.5, 5, 3.6, K.gold);
    p.disc(4.5, 5, 1.4, 0);
    for (let y = 3; y <= 6; y++) for (let x = 3; x <= 6; x++) if ((x + 0.5 - 4.5) ** 2 + (y + 0.5 - 5) ** 2 < 2.2) p.put(x, y, 0);
    p.line(7, 7, 14, 14, K.gold);
    p.line(8, 7, 15, 14, K.gold);
    p.line(11, 12, 13, 10, K.gold);
    p.line(13, 14, 14, 12, K.gold);
  },
};

const pxCache = new Map<IconName, Px>();
const urlCache = new Map<string, string>();

export function iconPx(name: IconName): Px {
  let p = pxCache.get(name);
  if (!p) {
    p = new Px(16, 16);
    (DRAW[name] ?? DRAW.warning)(p);
    p.outline(K.ink);
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
