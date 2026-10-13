// Rodada 29 (ARTE) — PAPÉIS E TELAS no estilo antigo: CONTRATO (28×36, pela época: pergaminho com selo de cera →
// datilografado com carbono → formulário de impressora matricial → PDF no tablet → contrato inteligente em holograma),
// CAPA DE REVISTA/FANZINE (32×40, com o retrato do artista em pontilhado de fotocópia), CARTÃO DE PROGRAMA DE TV ou
// RÁDIO (48×32: aparelho da época com o apresentador na tela ou o microfone "no ar") e PROCESSO (32×32: martelo,
// balança e autos; tribunal quando o caso é grande). PURO e semeado; <img> memorizado em pxImg28.

import type { Appearance } from '../../sim/types';
import { drawText, fitText, textWidth } from './font';
import { C, Px, dith, hsl, mix, noise, shade, withAlpha, type Col } from './px';
import { K28 as K, OUT28, h28, pxImg28 } from './art28kit';
import { relicBand28 } from './relic28';
import { portraitPx } from './avatar';

// ---------------------------------------------------------------- contrato

export type Doc29 = 'parchment' | 'typed' | 'form' | 'tablet' | 'holo' | 'napkin';
export const DOCS29: Doc29[] = ['parchment', 'typed', 'form', 'tablet', 'holo', 'napkin'];
export function docKindOf29(year: number, seed = '', informal = false): Doc29 {
  if (informal) return 'napkin';
  const b = relicBand28(year);
  if (b <= 1) return h28('dk29', seed) % 4 === 0 && b === 1 ? 'typed' : 'parchment';
  if (b <= 3) return b === 3 && h28('dk29', seed) % 2 ? 'form' : 'typed';
  return b === 4 ? (year >= 2008 ? 'tablet' : 'form') : 'holo';
}

/** Contrato 28×36 com título curto (modelo), linhas de texto, assinatura e selo. */
export function contractPx29(seed: string, title: string, year: number, kind = docKindOf29(year, seed)): Px {
  const W = 28, H = 36;
  const p = new Px(W, H);
  const hue = h28('ct29', seed) % 360;
  const line = (y: number, x0: number, x1: number, c: Col) => { for (let x = x0; x <= x1; x++) if (noise(x, y, h28(seed)) > 0.18) p.put(x, y, c); };
  const t = fitText(title, W - 6);
  if (kind === 'tablet' || kind === 'holo') {
    const holo = kind === 'holo';
    p.rect(0, 0, W, H, holo ? withAlpha(C('#0a3a4a'), 220) : C('#1e1c22'));
    p.rect(2, 3, W - 4, H - 7, holo ? withAlpha(C('#0e4a5a'), 200) : K.white);
    const ink = holo ? C('#6ff8f0') : C('#3a3a48');
    drawText(p, t, 3, 5, holo ? C('#e8fcff') : hsl(hue, 60, 40));
    for (let y = 12; y < 24; y += 2) line(y, 4, W - 6 - (y % 4), withAlpha(ink, 200));
    if (holo) { p.ring(W / 2, 28, 3, C('#e85ac8')); p.disc(W / 2, 28, 1, C('#6ff8f0')); for (let y = 0; y < H; y += 3) p.hline(0, W - 1, y, withAlpha(C('#6ff8f0'), 30)); }
    else { p.rect(4, 26, 10, 3, hsl(hue, 60, 45)); drawText(p, 'OK', 6, 25 + 1 - 1, K.white); p.disc(W / 2, H - 2, 1, K.dgrey); }
    p.outline(OUT28);
    return p;
  }
  const paper = kind === 'parchment' ? C('#e8d4a0') : kind === 'napkin' ? K.white : kind === 'form' ? C('#f0f4f0') : K.paper;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.put(x, y, noise(x, y, h28('ctp', seed)) < (kind === 'parchment' ? 0.12 : 0.04) ? shade(paper, -0.08) : paper);
  if (kind === 'napkin') { for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x++) if ((x + y) % 4 === 0) p.put(x, y, C('#e8e4dc')); p.disc(20, 8, 4, withAlpha(C('#b07840'), 70)); }
  if (kind === 'form') { for (let y = 0; y < H; y += 4) p.hline(0, W - 1, y, C('#d8ecd8')); for (let y = 2; y < H; y += 4) { p.put(0, y, K.lgrey); p.put(W - 1, y, K.lgrey); } }
  if (kind === 'parchment') { for (const y of [0, H - 1]) for (let x = 0; x < W; x++) p.put(x, y, shade(paper, -0.25)); }
  const ink = kind === 'parchment' ? C('#3a2414') : kind === 'napkin' ? C('#2a4ab0') : C('#24222a');
  drawText(p, t, Math.round((W - textWidth(t)) / 2), 2, kind === 'typed' || kind === 'form' ? ink : hsl(hue, 50, 30));
  p.hline(4, W - 5, 8, withAlpha(ink, 140));
  const n = kind === 'napkin' ? 4 : 9;
  for (let i = 0; i < n; i++) line(10 + i * 2, 3, W - 4 - ((i * 7) % 6), withAlpha(ink, kind === 'typed' ? 230 : 170));
  // assinatura rabiscada
  for (let x = 4; x < 15; x++) p.put(x, Math.round(31 + Math.sin(x * 1.3 + (h28('sig', seed) % 5)) * 1.5), ink);
  p.hline(3, 15, 33, withAlpha(ink, 120));
  if (kind === 'parchment') { p.disc(21, 30, 3.5, C('#a02020')); p.disc(21, 30, 2, C('#c83030')); p.put(20, 29, C('#e06060')); p.line(19, 33, 17, 35, C('#a02020')); p.line(23, 33, 25, 35, C('#a02020')); }
  else if (kind === 'typed') { p.ring(21, 30, 3.5, withAlpha(hsl(hue, 60, 40), 200)); p.ring(21, 30, 2, withAlpha(hsl(hue, 60, 40), 150)); }
  else if (kind === 'form') p.rect(18, 28, 7, 5, withAlpha(C('#c83030'), 120));
  p.outline(OUT28);
  return p;
}

export function contractImg29(seed: string, title: string, year: number, size = 28, informal = false): HTMLImageElement {
  const k = docKindOf29(year, seed, informal);
  return pxImg28(`ct29:${seed}:${title}:${k}`, () => contractPx29(seed, title, year, k), size, (size * 36) / 28, { cls: 'doc29', title });
}

// ---------------------------------------------------------------- capa de revista / fanzine

export type Mag29 = 'glossy' | 'zine' | 'tabloid' | 'trade' | 'web';
export const MAGS29: Mag29[] = ['glossy', 'zine', 'tabloid', 'trade', 'web'];

/** Capa 32×40: mastro, retrato (fotocópia no fanzine, foto pontilhada na revista) e chamadas. */
export function magCoverPx29(outlet: string, kind: Mag29, year: number, cover: { id: string; look?: Appearance; born?: number } | null = null, headline = ''): Px {
  const W = 32, H = 40;
  const p = new Px(W, H);
  const hue = h28('mg29', outlet) % 360;
  const bg = kind === 'zine' ? K.white : kind === 'tabloid' ? C('#f8e050') : kind === 'trade' ? C('#e8e4dc') : kind === 'web' ? C('#16141c') : hsl(hue, 45, 70);
  p.rect(0, 0, W, H, bg);
  // retrato do artista em destaque (busto 32×32, recortado)
  if (cover) {
    const por = portraitPx(cover, year);
    for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) {
      const c = por.get(x + 1, y + 1);
      if (!c || c >>> 24 < 200) continue;
      const lum = ((c & 255) * 0.3 + ((c >>> 8) & 255) * 0.59 + ((c >>> 16) & 255) * 0.11) / 255;
      let o: Col = c;
      const ln = Math.max(0, Math.min(1, (lum - 0.18) / 0.62)); // contraste esticado (o retrato é de tons médios)
      if (kind === 'zine') o = ln < 0.35 || (ln < 0.6 && (x + y) % 2 === 0) ? K.ink : K.white;
      else if (kind === 'trade') o = mix(C('#2a2a30'), C('#f0ece4'), Math.round(ln * 3) / 3);
      else if (year < 1965 && kind !== 'web') o = mix(C('#2a2420'), C('#f0e8d8'), lum);
      p.put(x + 1, y + 9, o);
    }
  } else {
    for (let y = 9; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot(x - 16, y - 22) < 8 + noise(x, y, hue) * 2) p.put(x, y, hsl(hue + 180, 40, 40));
  }
  // mastro
  const t = fitText(outlet.toUpperCase(), W - 2);
  if (kind === 'zine') { let x = 1; for (let i = 0; i < t.length && x < W - 3; i++) { const ch = t[i]; const w = textWidth(ch); if (ch !== ' ') { p.rect(x - 1, 1 + (i % 2), w + 2, 7, i % 2 ? K.ink : hsl(hue + i * 50, 80, 60)); drawText(p, ch, x, 2 + (i % 2), i % 2 ? K.white : K.ink); } x += w + 2; } }
  else if (kind === 'tabloid') { p.rect(0, 0, W, 8, C('#d02828')); drawText(p, t, Math.round((W - textWidth(t)) / 2), 2, K.white); }
  else if (kind === 'web') { p.rect(0, 0, W, 8, hsl(hue, 70, 45)); drawText(p, t.toLowerCase(), 2, 2, K.white); p.disc(W - 4, 4, 1.5, K.white); }
  else { drawText(p, t, Math.round((W - textWidth(t)) / 2) + 1, 2, shade(hsl(hue, 70, 40), -0.4)); drawText(p, t, Math.round((W - textWidth(t)) / 2), 1, kind === 'trade' ? K.ink : hsl(hue, 75, 40)); }
  // chamadas
  const hl = fitText(headline.toUpperCase(), W - 4);
  if (hl) { p.rect(1, 32, W - 2, 7, kind === 'tabloid' ? C('#151214') : withAlpha(K.ink, 190)); drawText(p, hl, 2, 33, kind === 'tabloid' ? C('#f8e050') : K.white); }
  else for (let i = 0; i < 2; i++) p.hline(2, 12 - i * 3, 34 + i * 2, kind === 'zine' ? K.ink : K.white);
  if (kind === 'glossy' && year >= 1970) { p.disc(26, 14, 3.5, C('#f0c040')); drawText(p, 'NEW', 21, 12, C('#c83030')); }
  p.outline(OUT28);
  return p;
}

export function magCoverImg29(outlet: string, kind: Mag29, year: number, cover: { id: string; look?: Appearance; born?: number } | null = null, headline = '', w = 48): HTMLImageElement {
  return pxImg28(`mg29:${outlet}:${kind}:${Math.floor(year / 5)}:${cover?.id ?? ''}:${headline}`, () => magCoverPx29(outlet, kind, year, cover, headline), w, (w * 40) / 32, { cls: 'mag29', title: outlet });
}

// ---------------------------------------------------------------- programa de TV / rádio

/** Cartão 48×32: TV (aparelho da época com o apresentador) ou rádio (microfone "no ar" + mostrador). */
export function showCardPx29(id: string, name: string, kind: 'tv' | 'radio', year: number, host?: { id: string; look?: Appearance; born?: number }): Px {
  const W = 48, H = 32;
  const p = new Px(W, H);
  const hue = h28('sc29', id) % 360;
  const b = relicBand28(year);
  const t = fitText(name.toUpperCase(), W - 4);
  if (kind === 'tv') {
    const cab = b <= 2 ? C('#7a4a26') : b === 3 ? C('#2a2a30') : C('#141418');
    p.rect(0, 0, W, H, hsl(hue, 30, 22));
    if (b <= 3) { p.rect(4, 2, 40, 26, cab); p.rect(7, 4, 28, 20, C('#1a1e1a')); p.rect(37, 6, 5, 3, K.dgrey); p.disc(39.5, 13, 1.5, K.grey); p.disc(39.5, 18, 1.5, K.grey); if (b <= 1) { p.line(18, 2, 13, -2, K.dgrey); p.line(24, 2, 29, -2, K.dgrey); } }
    else { p.rect(2, 2, 44, 24, cab); p.rect(3, 3, 42, 22, C('#1a1e1a')); p.rect(20, 26, 8, 2, cab); }
    const sx = b <= 3 ? 7 : 3, sy = b <= 3 ? 4 : 3, sw = b <= 3 ? 28 : 42, sh = b <= 3 ? 20 : 22;
    for (let y = sy; y < sy + sh; y++) for (let x = sx; x < sx + sw; x++) p.put(x, y, b <= 1 ? (dith(x, y, 0.4) ? C('#a8b0a8') : C('#7a847a')) : hsl(hue + (y - sy) * 4, 55, 40 + (b >= 4 ? 10 : 0)));
    if (host) {
      const por = portraitPx(host, year);
      const ox = sx + Math.round(sw / 2) - 10, oy = sy + sh - 20;
      for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) { const c = por.get(x * 32 / 20 | 0, y * 32 / 20 | 0); if (c && c >>> 24 > 200) p.put(ox + x, oy + y, b <= 1 ? mix(C('#2a2e2a'), C('#d8e0d8'), ((c & 255) + ((c >>> 8) & 255)) / 510) : c); }
    }
    for (let y = sy; y < sy + sh; y += 2) p.hline(sx, sx + sw - 1, y, withAlpha(K.ink, 40));
    p.rect(0, H - 5, W, 5, K.ink); drawText(p, t, 2, H - 5, hsl(hue, 80, 70));
  } else {
    p.rect(0, 0, W, H, b <= 2 ? C('#e8d8b0') : C('#1e1c26'));
    // microfone
    const mc = b <= 1 ? K.silver : b <= 3 ? K.dgrey : K.black;
    if (b <= 1) { p.rect(5, 3, 10, 13, mc); for (let y = 4; y < 15; y += 2) p.hline(6, 13, y, K.dsilver); }
    else { p.disc(10, 8, 5, mc); for (let y = 4; y < 13; y += 2) p.hline(7, 13, y, shade(mc, 0.3)); }
    p.rect(9, 15, 2, 8, K.dgrey); p.rect(5, 23, 10, 2, K.dgrey);
    // "no ar"
    p.rect(19, 3, 26, 8, C('#2a0a0a')); drawText(p, b >= 4 ? 'LIVE' : 'ON AIR', 21, 4, C('#ff4040'));
    // mostrador
    p.rect(19, 14, 26, 9, b <= 2 ? C('#f0e0b0') : C('#0a1a10'));
    for (let x = 20; x < 44; x += 2) p.vline(x, 20, 21, b <= 2 ? C('#5e3a1e') : C('#48d870'));
    p.vline(22 + (h28('dial', id) % 20), 15, 22, C('#e04848'));
    p.rect(0, H - 6, W, 6, b <= 2 ? C('#6e4426') : hsl(hue, 60, 35)); drawText(p, t, 2, H - 5, K.cream);
  }
  p.outline(OUT28);
  return p;
}

export function showCardImg29(id: string, name: string, kind: 'tv' | 'radio', year: number, host?: { id: string; look?: Appearance; born?: number }, w = 96): HTMLImageElement {
  return pxImg28(`sc29:${id}:${kind}:${relicBand28(year)}:${host?.id ?? ''}`, () => showCardPx29(id, name, kind, year, host), w, (w * 32) / 48, { cls: 'show29', title: name });
}

// ---------------------------------------------------------------- processo / tribunal

export type Case29 = 'gavel' | 'courtroom' | 'scales';
/** Processo 32×32: martelo + autos (pequeno), balança (direitos), sala de tribunal (grande). */
export function casePx29(id: string, kind: Case29, year: number): Px {
  const N = 32;
  const p = new Px(N, N);
  const b = relicBand28(year);
  const wood = K.wood, dw = K.dwood;
  if (kind === 'courtroom') {
    p.rect(0, 0, N, N, C('#6e4426'));
    for (let x = 0; x < N; x += 4) p.vline(x, 0, 18, C('#5e3a1e'));
    p.rect(0, 18, N, 14, C('#8a5a30'));
    // brasão/relógio na parede
    if (b <= 2) { p.disc(16, 5, 3, K.gold); p.put(16, 5, K.ink); } else { p.rect(13, 2, 6, 5, C('#2c3a6a')); p.put(15, 4, K.white); }
    // bancada do juiz
    p.rect(6, 10, 20, 10, dw); p.hline(6, 25, 10, wood); p.rect(13, 6, 6, 5, C('#1e1a1c')); p.disc(16, 6, 2, K.skin);
    // mesas das partes e plateia
    p.rect(2, 23, 10, 3, wood); p.rect(20, 23, 10, 3, wood);
    for (let x = 1; x < N; x += 4) { p.disc(x + 1, 29, 1.3, C('#2a2628')); p.rect(x, 30, 3, 2, C('#2a2628')); }
    if (b >= 4) p.rect(26, 8, 5, 4, C('#2a6ad0'));
  } else if (kind === 'scales') {
    p.vline(16, 4, 24, K.dgold); p.hline(6, 26, 6, K.gold); p.disc(16, 4, 1.5, K.gold);
    for (const sx of [7, 25]) { p.line(sx, 6, sx - 4, 15, K.dgold); p.line(sx, 6, sx + 4, 15, K.dgold); p.ellipse(sx, 16, 5, 1.6, K.gold); }
    p.rect(10, 24, 12, 3, K.dgold); p.rect(7, 27, 18, 3, K.gold);
    // disco num prato e moedas no outro (direitos × dinheiro)
    p.disc(7, 13, 3, K.black); p.disc(7, 13, 1, K.red); for (let i = 0; i < 3; i++) p.ellipse(25, 14 - i, 2.5, 1, K.lgold);
  } else {
    // autos empilhados + martelo
    for (let i = 0; i < 3; i++) { const y = 20 - i * 3; p.rect(3 + i, y, 18, 4, i % 2 ? C('#e8dcc0') : C('#d8c49a')); p.hline(3 + i, 20 + i, y, shade(K.paper, -0.2)); }
    p.rect(4, 22, 16, 4, C('#c0a070')); p.rect(8, 23, 6, 2, hsl(h28('cs29', id) % 360, 60, 38));
    p.rect(17, 26, 12, 3, dw); p.hline(17, 28, 26, wood);
    // martelo inclinado
    p.line(12, 8, 24, 20, dw); p.line(13, 8, 25, 20, wood);
    for (let k = -3; k <= 3; k++) p.line(9 + k, 9 - k, 13 + k, 5 - k, k === -3 || k === 3 ? K.dgold : dw);
  }
  p.outline(OUT28);
  return p;
}

export function caseImg29(id: string, kind: Case29, year: number, size = 32): HTMLImageElement {
  return pxImg28(`cs29:${id}:${kind}:${relicBand28(year)}`, () => casePx29(id, kind, year), size, size, { cls: 'case29' });
}
