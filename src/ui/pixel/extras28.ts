// Rodada 28 (ARTE) — extras no estilo antigo: MARCA DE GRAVADORA (32×32, pela época de fundação), CARTAZ DE FESTIVAL
// (32×44) e BOTTOM do festival (16×16), MASTRO DE REVISTA/JORNAL (64×12, pelo tipo de veículo). Troféus de premiação
// e ingressos reaproveitam as relíquias (relic28: 'trophy', 'ticket'). Puro e semeado; <img> memorizado.

import { drawText, fitText, textWidth } from './font';
import { C, Px, dith, hsl, noise, shade, withAlpha, type Col } from './px';
import { K28 as K, OUT28, h28, pxImg28, rng28 } from './art28kit';

const initials = (name: string): string => {
  const w = name.replace(/^(The|Os|As|O|A|Los|Las|Les|Le|La)\s+/i, '').split(/[\s&\-]+/).filter(Boolean);
  if (!w.length) return '?';
  return w.length === 1 ? w[0].slice(0, 2).toUpperCase() : (w[0][0] + w[1][0]).toUpperCase();
};

// ---------------------------------------------------------------- marca de gravadora

export const LABEL_MARKS28 = ['roundel78', 'rays', 'bars', 'bird', 'geo', 'box', 'dot', 'monogram', 'star', 'wave'] as const;
export type LabelMark28 = (typeof LABEL_MARKS28)[number];

export function labelMarkOf28(id: string, founded: number): LabelMark28 {
  const opts: LabelMark28[] = founded < 1950 ? ['roundel78', 'rays', 'star'] : founded < 1965 ? ['rays', 'bars', 'roundel78', 'star'] : founded < 1980 ? ['bird', 'wave', 'bars', 'star'] : founded < 1995 ? ['geo', 'box', 'wave'] : ['dot', 'monogram', 'box', 'geo'];
  return opts[h28('lm', id) % opts.length];
}

export function labelMarkPx28(id: string, name: string, founded: number, mark = labelMarkOf28(id, founded)): Px {
  const N = 32;
  const p = new Px(N, N);
  const r = rng28('label', id);
  const hue = h28('lmh', id) % 360;
  const a = founded < 1950 ? r.pick([C('#7a2a20'), C('#2a3a6a'), C('#1e1a1c')]) : hsl(hue, 65, founded < 1980 ? 45 : 52);
  const m = founded < 1965 ? K.gold : r.pick([K.white, K.cream, K.gold]);
  const ini = initials(name);
  const t2 = fitText(ini, 22, 2);
  const txt = (x: number, y: number, c: Col, sh?: Col) => { const T = t2 || fitText(ini, 22); const sc = t2 ? 2 : 1; const xx = x - Math.round(textWidth(T, sc) / 2); if (sh) drawText(p, T, xx + 1, y + 1, sh, sc); drawText(p, T, xx, y, c, sc); };
  switch (mark) {
    case 'roundel78': p.disc(16, 16, 15, C('#1e1a1c')); p.disc(16, 16, 10, a); p.ring(16, 16, 9, m); p.disc(16, 16, 1, C('#1e1a1c')); txt(16, 7, m); p.hline(9, 23, 21, m); break;
    case 'rays': p.disc(16, 16, 14, K.cream); for (let i = 0; i < 18; i++) { const an = i * 0.349; p.line(16, 16, Math.round(16 + Math.cos(an) * 14), Math.round(16 + Math.sin(an) * 14), i % 2 ? a : shade(K.cream, -0.12)); } p.disc(16, 16, 7.5, a); txt(16, 11, m, shade(a, -0.5)); break;
    case 'bars': p.rect(2, 6, 28, 20, a); p.rect(2, 6, 6, 20, K.ink); p.hline(10, 28, 23, m); txt(19, 10, K.white); break;
    case 'bird': p.disc(16, 16, 14, a); p.poly([[6, 18], [14, 13], [16, 15], [19, 8], [26, 6], [21, 12], [18, 19], [11, 20]], m); p.put(22, 8, K.ink); txt(16, 22 - 2, m); break;
    case 'geo': p.poly([[16, 2], [30, 28], [2, 28]], a); p.rect(9, 17, 14, 9, K.ink); p.disc(25, 8, 4, hsl(hue + 150, 80, 60)); txt(16, 18, K.white); break;
    case 'box': p.rect(3, 3, 26, 26, K.ink); p.rect(5, 5, 22, 22, a); for (let y = 5; y < 27; y++) for (let x = 5; x < 27; x++) if (noise(x, y, 7) < 0.06) p.put(x, y, shade(a, 0.3)); txt(16, 11, K.white, K.ink); break;
    case 'dot': p.disc(16, 16, 13, K.white); p.disc(16, 12, 5, a); p.ring(16, 16, 13, a); { const T = fitText(ini, 20); drawText(p, T, 16 - Math.round(textWidth(T) / 2), 20, K.ink); } break;
    case 'monogram': p.rect(4, 4, 24, 24, K.ink); p.hline(7, 24, 7, m); p.hline(7, 24, 24, m); txt(16, 11, m); break;
    case 'star': p.disc(16, 16, 14, a); { const pts: [number, number][] = []; for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? 5 : 11; pts.push([16 + Math.cos(an) * rr, 16 + Math.sin(an) * rr]); } p.poly(pts, m); } txt(16, 12, shade(a, -0.4)); break;
    case 'wave': p.disc(16, 16, 14, K.cream); for (let y = 16; y < 30; y++) for (let x = 2; x < 30; x++) if (p.get(x, y) && Math.sin(x * 0.5 + y * 0.8) > 0) p.put(x, y, a); p.disc(16, 9, 4, hsl(hue + 40, 80, 60)); p.rect(7, 16, 18, 12, K.cream); txt(16, 17, K.ink); break;
  }
  p.outline(OUT28);
  return p;
}

export function labelMarkImg28(id: string, name: string, founded: number, size = 32): HTMLImageElement {
  return pxImg28(`lm:${id}:${name}:${founded}`, () => labelMarkPx28(id, name, founded), size, size, { cls: 'label28', title: name });
}

// ---------------------------------------------------------------- festival

/** Cartaz de festival 32×44: nome, palco/campo da época, faixas do line-up. */
export function festivalPosterPx28(name: string, year: number, focusHue = 0, heads: string[] = []): Px {
  const W = 32, H = 44;
  const p = new Px(W, H);
  const r = rng28('fest', name, year);
  const hue = (h28('fh', name) + focusHue) % 360;
  const era = year < 1965 ? 0 : year < 1980 ? 1 : year < 2000 ? 2 : 3;
  if (era === 0) { p.rect(0, 0, W, H, K.cream); p.rect(0, 0, W, 14, hsl(hue, 60, 40)); }
  else if (era === 1) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x - 16, y - 18) + Math.sin(Math.atan2(y - 18, x - 16) * 5) * 1.5; p.put(x, y, hsl(hue + Math.floor(d / 2.5) * 40, 80, 58)); }
  else if (era === 2) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.put(x, y, dith(x, y, y / H) ? hsl(hue + 300, 60, 30) : hsl(hue + 240, 60, 14));
  else p.rect(0, 0, W, H, hsl(hue, 55, 60));
  // palco e público
  const stg = era === 1 ? C('#2a1a20') : era === 2 ? C('#0e0a12') : C('#1e1a1c');
  p.poly([[4, 26], [28, 26], [26, 18], [6, 18]], stg); p.rect(6, 16, 20, 2, shade(stg, 0.3));
  for (let x = 1; x < W; x += 3) p.disc(x + 0.5, 30 - (h28('cr', x, name) % 2), 1.5, stg);
  p.rect(0, 30, W, 3, stg);
  if (era >= 2) for (const sx of [8, 24]) p.poly([[sx, 16], [sx + 1, 16], [16 + (sx - 16) * 0.3 + 4, 2], [16 + (sx - 16) * 0.3 - 4, 2]], withAlpha(hsl(hue + sx * 8, 90, 70), 60));
  if (r.chance(0.6)) for (const fx of [3, 28]) { p.vline(fx, 6, 16, K.dgrey); p.poly([[fx, 6], [fx + (fx < 16 ? 4 : -4), 7.5], [fx, 9]], hsl(hue + fx * 10, 80, 55)); }
  // nome e line-up
  // nome em até duas linhas (quebra por palavra)
  const words = fitText(name, 999).split(' ');
  let l1 = '';
  while (words.length && textWidth(`${l1} ${words[0]}`.trim()) <= 30) l1 = `${l1} ${words.shift()}`.trim();
  if (!l1) l1 = fitText(words.shift() ?? '', 30);
  const l2 = fitText(words.join(' '), 30);
  const tc = era === 0 ? K.white : era === 3 ? C('#151214') : K.white;
  const sh = era === 0 || era === 3 ? 0 : C('#151214');
  for (const [tx, ty] of [[l1, 2], [l2, 8]] as const) if (tx) { const x = Math.round((W - textWidth(tx)) / 2); if (sh) drawText(p, tx, x + 1, ty + 1, sh); drawText(p, tx, x, ty, tc); }
  p.rect(0, 33, W, 11, era === 0 ? K.cream : withAlpha(C('#151214'), 200));
  const lc = era === 0 ? C('#3a2a18') : K.cream;
  const hl = fitText(heads[0] ?? '', 30);
  if (hl) drawText(p, hl, Math.round((W - textWidth(hl)) / 2), 34, era === 0 ? hsl(hue, 60, 35) : K.gold);
  else p.hline(6, 25, 36, lc);
  for (let k = 0; k < 2; k++) p.hline(3 + k * 2, 28 - k * 3, 40 + k * 2, withAlpha(lc, 200));
  p.outline(OUT28);
  return p;
}

export function festivalPosterImg28(name: string, year: number, heads: string[] = [], w = 96): HTMLImageElement {
  return pxImg28(`fp:${name}:${year}:${heads[0] ?? ''}`, () => festivalPosterPx28(name, year, 0, heads), w, (w * 44) / 32, { cls: 'fest28', title: name, scale: 3 });
}

/** Bottom (pin) do festival 16×16: cor, barraca/estrela e inicial. */
export function festivalPinPx28(name: string, year: number): Px {
  const p = new Px(16, 16);
  const hue = h28('fh', name) % 360;
  const k = h28('pin', name) % 3;
  p.disc(8, 8, 7, hsl(hue, 70, 50)); p.ring(8, 8, 7, shade(hsl(hue, 70, 50), -0.4));
  if (k === 0) p.poly([[3, 11], [8, 4], [13, 11]], K.cream);
  else if (k === 1) { const pts: [number, number][] = []; for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i * Math.PI / 5; pts.push([8 + Math.cos(an) * (i % 2 ? 2.4 : 5.5), 8 + Math.sin(an) * (i % 2 ? 2.4 : 5.5)]); } p.poly(pts, K.gold); }
  else { p.disc(8, 8, 4, K.cream); p.disc(8, 8, 1.4, hsl(hue, 70, 50)); }
  if (year < 1975) p.set(4, 4, withAlpha(K.white, 200));
  drawText(p, initials(name).slice(0, 1), 7, 6 + (k === 0 ? 3 : 0) - (k === 0 ? 0 : 0), k === 0 ? shade(hsl(hue, 70, 50), -0.5) : K.ink);
  p.outline(OUT28);
  return p;
}
export function festivalPinImg28(name: string, year: number, size = 16): HTMLImageElement {
  return pxImg28(`fpin:${name}:${year < 1975 ? 0 : 1}`, () => festivalPinPx28(name, year), size, size, { cls: 'fest28', title: name });
}

// ---------------------------------------------------------------- mastro de revista / jornal

export type MastKind28 = 'tabloid' | 'magazine' | 'newspaper' | 'zine' | 'online' | 'radio' | 'tv' | 'trade';
export const MAST_KINDS28: MastKind28[] = ['tabloid', 'magazine', 'newspaper', 'zine', 'online', 'radio', 'tv', 'trade'];

/** Tipo de mastro: pelo tipo do veículo se vier, senão pelo nome. */
export function mastKindOf28(name: string, kind?: string): MastKind28 {
  const k = (kind ?? '').toLowerCase();
  if ((MAST_KINDS28 as string[]).includes(k)) return k as MastKind28;
  if (/blog|web|online|site|stream|digital|podcast/.test(k)) return 'online';
  if (/zine|fanzine/.test(k + name.toLowerCase())) return 'zine';
  if (/news|jornal|daily|times|gazette|diário|diario|folha/.test(k + ' ' + name.toLowerCase())) return 'newspaper';
  if (/radio|rádio/.test(k)) return 'radio';
  if (/tv/.test(k)) return 'tv';
  return (['magazine', 'magazine', 'tabloid', 'newspaper', 'trade'] as const)[h28('mk', name) % 5];
}

export function mastheadPx28(name: string, kind: MastKind28): Px {
  const W = 64, H = 12;
  const p = new Px(W, H);
  const hue = h28('mh', name) % 360;
  const t = fitText(name, kind === 'online' || kind === 'radio' ? W - 14 : kind === 'zine' ? Math.round((W - 8) * 0.68) : W - 6);
  const tw = textWidth(t);
  const x0 = Math.round((W - tw) / 2);
  switch (kind) {
    case 'tabloid': p.rect(0, 0, W, H, C('#d02828')); drawText(p, t, x0 + 1, 4, C('#5a0a0a')); drawText(p, t, x0, 3, K.white); break;
    case 'magazine': { const c = hsl(hue, 70, 50); p.rect(0, 0, W, H, K.white); drawText(p, t, x0 + 1, 4, shade(c, -0.5)); drawText(p, t, x0, 3, c); p.hline(2, W - 3, 10, c); break; }
    case 'newspaper': p.rect(0, 0, W, H, C('#ece6d8')); p.hline(1, W - 2, 1, K.ink); p.hline(1, W - 2, 10, K.ink); drawText(p, t, x0, 3, K.ink); for (let x = x0; x < x0 + tw; x += 2) p.set(x, 8, withAlpha(K.ink, 90)); break;
    case 'zine': p.rect(0, 0, W, H, K.white); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (noise(x >> 1, y, h28(name)) < 0.12) p.put(x, y, C('#c8c4c0')); { let x = Math.max(1, x0 - 4); for (let i = 0; i < t.length && x < W - 4; i++) { const ch = t[i]; const w = textWidth(ch); if (ch !== ' ') { const bg = i % 2 ? K.ink : hsl(hue + i * 40, 80, 60); p.rect(x - 1, 2 + (i % 2), w + 2, 7, bg); drawText(p, ch, x, 3 + (i % 2), i % 2 ? K.white : K.ink); } x += w + 2; } } break;
    case 'online': p.rect(0, 0, W, H, hsl(hue, 30, 18)); p.disc(5, 6, 3, hsl(hue, 80, 60)); drawText(p, t.toLowerCase(), Math.max(10, x0), 3, hsl(hue, 80, 75)); break;
    case 'radio': p.rect(0, 0, W, H, C('#2a2628')); for (let x = 2; x < 9; x += 2) p.vline(x, 9 - (x % 4) - 2, 9, K.gold); drawText(p, t, Math.max(11, x0), 3, K.gold); break;
    case 'tv': p.rect(0, 0, W, H, hsl(hue + 200, 60, 30)); p.rect(1, 1, W - 2, H - 2, withAlpha(K.white, 30)); drawText(p, t, x0, 3, K.white); p.rect(W - 6, 2, 3, 3, C('#e04848')); break;
    case 'trade': p.rect(0, 0, W, H, K.ink); p.rect(0, 0, 4, H, hsl(hue, 70, 50)); drawText(p, t, Math.max(6, x0), 3, K.white); break;
  }
  p.outline(OUT28);
  return p;
}

export function mastheadImg28(name: string, kind?: string, w = 96): HTMLImageElement {
  const k = mastKindOf28(name, kind);
  return pxImg28(`mh:${name}:${k}`, () => mastheadPx28(name, k), w, (w * 12) / 64, { cls: 'mast28', title: name });
}

/** Rótulo genérico de cor do festival (para testes e folha). */
export const festHue28 = (name: string): number => h28('fh', name) % 360;
