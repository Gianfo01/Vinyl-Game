// Rodada 29 (ARTE) — mais LOGOS DE BANDA (32×32, iniciais na fonte 3×5 ampliada), no estilo antigo: gótico com
// espinhos, faixa de pergaminho, trilhas de circuito, letras em chamas, 8-bit de fliperama, monolinha em círculo,
// moldura de diamante, asas, tubo de neon, carimbo redondo, fita de rotuladora (Dymo) e distintivo oval retrô.
// Entra no lugar de parte dos logos que seguiam o desenho original de art.ts (metade deles, pela semente); os logos da
// rodada 28 não mudam. Época manda: nada de circuito antes de 1978 nem de 8-bit antes de 1980.

import { drawText, fitText, textWidth } from './font';
import { C, Px, dith, hsl, mix, noise, shade, withAlpha, type Col } from './px';
import { K28 as K, h28, rng28 } from './art28kit';
import { genreMood28, type Mood28 } from './cover28';

export const LOGO_STYLES29 = ['gothic', 'ribbon', 'circuit', 'flame', 'pixel8', 'monoline', 'diamond', 'wings', 'neontube', 'roundstamp', 'dymo', 'oval'] as const;
export type LogoStyle29 = (typeof LOGO_STYLES29)[number];

const MOOD29: Record<Mood28, LogoStyle29[]> = {
  metal: ['gothic', 'flame', 'wings'], punk: ['dymo', 'roundstamp'], disco: ['neontube', 'diamond'], britpop: ['oval', 'monoline'], hiphop: ['diamond', 'flame', 'pixel8'],
  synth: ['neontube', 'pixel8', 'circuit'], indie: ['dymo', 'monoline'], country: ['ribbon', 'oval', 'wings'], jazz: ['monoline', 'ribbon'], reggae: ['roundstamp', 'oval'],
  electronic: ['circuit', 'pixel8', 'neontube'], soul: ['ribbon', 'diamond'], latin: ['ribbon', 'flame'], brazil: ['roundstamp', 'ribbon'], classical: ['ribbon', 'monoline'],
  asia: ['roundstamp', 'pixel8'], africa: ['oval', 'roundstamp'], pop: ['diamond', 'neontube', 'oval'], rock: ['wings', 'flame', 'oval'],
};
const FROM29: Partial<Record<LogoStyle29, number>> = { circuit: 1978, pixel8: 1980, neontube: 1955, dymo: 1962 };

/** Estilo novo de logo (ou null = logo original). Puro. Só atua sobre os atos que ficaram no logo original. */
export function logoStyle29(seed: number, genre: string, year: number): LogoStyle29 | null {
  if (year < 1930 || h28('logo29', seed) % 100 >= 50) return null;
  const opts = MOOD29[genreMood28(genre)].filter((s) => (FROM29[s] ?? 0) <= year);
  const o = opts.length ? opts : (['ribbon', 'oval', 'monoline'] as LogoStyle29[]);
  return o[h28('logo29s', seed) % o.length];
}

function letters(t: string, sc: number, w: number, hh: number): Px {
  const q = new Px(w, hh);
  drawText(q, t, Math.round((w - textWidth(t, sc)) / 2), Math.round((hh - 5 * sc) / 2), K.white, sc);
  return q;
}
function paint(p: Px, q: Px, dx: number, dy: number, f: (x: number, y: number) => Col): void {
  for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) if (q.get(x, y)) p.set(x + dx, y + dy, f(x, y));
}
function ring(p: Px, q: Px, dx: number, dy: number, c: Col): void {
  for (let y = -1; y <= q.h; y++) for (let x = -1; x <= q.w; x++) if (!q.get(x, y) && (q.get(x - 1, y) || q.get(x + 1, y) || q.get(x, y - 1) || q.get(x, y + 1))) p.set(x + dx, y + dy, c);
}
const ini2 = (ini: string, max = 28) => { const t = fitText(ini, max, 2); return t.length ? { t, sc: 2 } : { t: fitText(ini, max), sc: 1 }; };

export function logoStylePx29(st: LogoStyle29, seed: number, ini: string, genre: string, year: number): Px {
  const W = 32;
  const p = new Px(W, W);
  const r = rng28('logo29', seed, st);
  const hue = (h28('l29h', seed, genre)) % 360;
  const a = hsl(hue, 70, 50), b = hsl(hue + 160, 70, 60);
  const { t, sc } = ini2(ini);
  const q = letters(t, sc, W, W);
  switch (st) {
    case 'gothic': {
      p.disc(16, 16, 15, C('#141016'));
      ring(p, q, 0, 0, K.ink);
      paint(p, q, 0, 0, (_x, y) => (y < 15 ? K.white : K.silver));
      // serifas em espinho no alto e embaixo de cada traço vertical
      for (let x = 0; x < W; x++) for (let y = 1; y < W - 1; y++) if (q.get(x, y) && !q.get(x, y - 1)) p.set(x, y - 1, K.silver); else if (q.get(x, y) && !q.get(x, y + 1) && x % 2) p.set(x, y + 1, K.dsilver);
      p.poly([[16, 1], [18, 5], [14, 5]], C('#8a1a1a')); p.poly([[16, 31], [18, 27], [14, 27]], C('#8a1a1a'));
      break;
    }
    case 'ribbon': {
      p.rect(3, 11, 26, 10, a); p.hline(3, 28, 11, shade(a, 0.3)); p.hline(3, 28, 20, shade(a, -0.35));
      p.poly([[3, 13], [0, 13], [2, 16], [0, 19], [3, 19]], shade(a, -0.3)); p.poly([[29, 13], [32, 13], [30, 16], [32, 19], [29, 19]], shade(a, -0.3));
      const tt = fitText(ini, 24); drawText(p, tt, 16 - Math.round(textWidth(tt) / 2), 14, K.cream);
      p.disc(16, 6, 4, K.gold); p.disc(16, 6, 2, shade(K.gold, 0.4)); p.hline(10, 22, 25, K.dgold); p.hline(12, 20, 27, K.dgold);
      break;
    }
    case 'circuit': {
      p.rect(1, 1, 30, 30, C('#0e3a22'));
      for (let i = 0; i < 9; i++) { let x = r.int(2, 29), y = r.int(2, 29); for (let s = 0; s < 8; s++) { p.put(x, y, C('#d0a040')); if (r.chance(0.5)) x += r.chance(0.5) ? 1 : -1; else y += r.chance(0.5) ? 1 : -1; } p.disc(x, y, 1, C('#f0d080')); }
      ring(p, q, 0, 0, C('#0e3a22')); paint(p, q, 0, 0, () => C('#6ff8a0'));
      break;
    }
    case 'flame': {
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const v = noise(x >> 1, (y + x) >> 2, seed) * 0.6 + (W - y) / W * 0.8 - Math.abs(x - 16) / 24; if (v > 0.65) p.put(x, y, v > 0.95 ? C('#fff2a0') : v > 0.8 ? C('#f8b030') : C('#e04820')); }
      ring(p, q, 0, 2, K.ink); paint(p, q, 0, 2, (_x, y) => (y < 14 ? K.white : C('#ffe070')));
      break;
    }
    case 'pixel8': {
      p.rect(2, 4, 28, 24, C('#141020'));
      const cs = [C('#ff4080'), C('#ffa020'), C('#f8e040'), C('#40e0a0'), C('#40a0ff')];
      paint(p, q, 0, 0, (_x, y) => cs[Math.min(4, Math.max(0, Math.floor((y - 6) / 4)))]);
      for (let x = 2; x < 30; x += 2) p.put(x, 27, cs[(x >> 1) % 5]);
      for (let y = 4; y < 28; y += 2) p.hline(2, 29, y, withAlpha(K.ink, 60));
      break;
    }
    case 'monoline': {
      p.ring(16, 16, 14, a); p.ring(16, 16, 12, a);
      const tt = fitText(ini, 20); const qq = letters(tt, 1, W, W); paint(p, qq, 0, -3, () => a);
      p.hline(9, 22, 19, a); const yr = String(year).slice(2); drawText(p, `'${yr}`, 16 - Math.round(textWidth(`'${yr}`) / 2), 21, a);
      break;
    }
    case 'diamond': {
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const d = Math.abs(x + 0.5 - 16) + Math.abs(y + 0.5 - 16); if (d <= 15) p.put(x, y, d > 13 ? K.gold : (x + y) % 6 === 0 ? mix(a, K.white, 0.3) : x < 16 === y < 16 ? a : shade(a, -0.2)); }
      ring(p, q, 0, 0, K.ink); paint(p, q, 0, 0, () => K.white);
      p.put(9, 8, K.white); p.put(10, 7, K.white);
      break;
    }
    case 'wings': {
      for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { const x0 = 16 + s * (7 + i * 1.6); p.line(Math.round(16 + s * 7), 13 + i, Math.round(x0 + s * 3), 8 + i * 3, i % 2 ? K.silver : K.white); }
      p.disc(16, 16, 9, a); p.ring(16, 16, 9, shade(a, -0.4));
      ring(p, q, 0, 0, shade(a, -0.6)); paint(p, q, 0, 0, () => K.white);
      break;
    }
    case 'neontube': {
      p.rect(1, 5, 30, 22, C('#120a1a'));
      const nc = hsl(hue, 95, 64);
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (!q.get(x, y) && (q.get(x - 1, y) || q.get(x + 1, y) || q.get(x, y - 1) || q.get(x, y + 1))) p.set(x, y, withAlpha(nc, 90));
      paint(p, q, 0, 0, (x, y) => ((x + y) % 5 === 0 ? K.white : mix(nc, K.white, 0.35)));
      p.hline(4, 27, 25, b); p.hline(4, 27, 7, withAlpha(b, 160));
      break;
    }
    case 'roundstamp': {
      const ink2 = hsl(hue, 60, 38);
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 16); if ((d <= 15 && d > 13) || (d <= 11 && d > 10)) if (noise(x, y, seed) > 0.15) p.put(x, y, ink2); }
      for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6; p.put(Math.round(16 + Math.cos(an) * 12), Math.round(16 + Math.sin(an) * 12), ink2); }
      paint(p, q, 0, 0, (x, y) => (noise(x, y, seed + 1) > 0.12 ? ink2 : 0));
      break;
    }
    case 'dymo': {
      const tape = r.pick([C('#d02828'), C('#2a2a30'), C('#2a5ad0'), C('#1e8a3a')]);
      p.rect(0, 10, 32, 12, tape); p.hline(0, 31, 10, shade(tape, 0.25)); p.hline(0, 31, 21, shade(tape, -0.35));
      const tt = fitText(ini, 26); drawText(p, tt, 16 - Math.round(textWidth(tt) / 2) + 1, 14, shade(tape, -0.4)); drawText(p, tt, 16 - Math.round(textWidth(tt) / 2), 13, K.white);
      p.put(0, 10, 0); p.put(31, 21, 0);
      break;
    }
    case 'oval': {
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const e = ((x + 0.5 - 16) / 15) ** 2 + ((y + 0.5 - 16) / 11) ** 2; if (e <= 1) p.put(x, y, e > 0.8 ? K.cream : y > 13 && y < 19 ? b : dith(x, y, 0.3) ? a : shade(a, 0.1)); }
      const tt = fitText(ini, 22, 1); drawText(p, tt, 16 - Math.round(textWidth(tt) / 2), 14, K.ink);
      p.hline(6, 25, 9, K.cream); p.hline(6, 25, 22, K.cream);
      break;
    }
  }
  p.outline(C('#120d10'));
  return p;
}

/** Hook de art.ts: logo novo (ou null). */
export function logo29(seed: number, ini: string, genre: string, year: number): Px | null {
  const st = logoStyle29(seed, genre, year);
  return st ? logoStylePx29(st, seed, ini, genre, year) : null;
}
