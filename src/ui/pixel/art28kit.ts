// Rodada 28 (ARTE) — kit comum das artes novas (relíquias, emblemas do submundo, capas e logos extras, selos de
// gravadora, festivais, mastros de revista, troféus, ingressos). Mesmo estilo antigo de icons.ts/art.ts: paleta curta,
// contorno escuro quente de 1 px, pontilhado Bayer, ruído determinístico. Tudo PURO (só Px) e semeado: a mesma entrada
// dá sempre a mesma imagem. A parte de DOM (data URL + <img>) fica em pxUrl28/pxImg28, com memo por chave.

import { hashString, Rng } from '../../core/rng';
import { C, Px, shade, upscale, type Col } from './px';

/** Paleta curta (a mesma família de cores de icons.ts / icons17.ts). */
export const K28 = {
  ink: C('#1a1214'), white: C('#f8f4ec'), cream: C('#f4e4b8'), paper: C('#ece0c4'), oldpaper: C('#d8c49a'),
  grey: C('#a8a4a0'), lgrey: C('#d0ccc6'), dgrey: C('#5c5856'), black: C('#2a2628'),
  gold: C('#f0c040'), dgold: C('#b07c1c'), lgold: C('#fff2b0'), silver: C('#d8dce4'), dsilver: C('#8a90a0'),
  red: C('#e04848'), dred: C('#9c2c2c'), green: C('#48b85c'), dgreen: C('#2c7a3c'), blue: C('#4a8ae0'), dblue: C('#2c5aa0'),
  teal: C('#2ec8c0'), orange: C('#f08a2c'), brown: C('#9a6034'), dbrown: C('#5e3a1e'), skin: C('#f0c8a0'), pink: C('#f0a0b8'),
  purple: C('#8a5ad0'), yellow: C('#f8e060'), wood: C('#b07840'), dwood: C('#6e4426'), maple: C('#e8c890'), rose: C('#5a2a20'),
} as const;

export const OUT28 = K28.ink;

/** RNG semeado por texto (não toca no RNG do jogo). */
export const rng28 = (...parts: (string | number)[]): Rng => Rng.fromSeed(`a28|${parts.join('|')}`);
/** Hash curto (0..2^32) por texto. */
export const h28 = (...parts: (string | number)[]): number => hashString(`a28|${parts.join('|')}`) >>> 0;

/**
 * Bitmap por strings: cada caractere vira um pixel pela tabela de cores (`.` e espaço = vazio).
 * Usado para cargas heráldicas e pequenos objetos (estilo "sprite desenhado à mão").
 */
export function bmp(p: Px, rows: readonly string[], x0: number, y0: number, pal: Record<string, Col>, flip = false): void {
  for (let j = 0; j < rows.length; j++) {
    const r = rows[j];
    for (let i = 0; i < r.length; i++) {
      const ch = r[flip ? r.length - 1 - i : i];
      if (ch === '.' || ch === ' ') continue;
      const c = pal[ch];
      if (c) p.set(x0 + i, y0 + j, c);
    }
  }
}

/** Contorno de 1 px só da camada desenhada em `draw` (para objetos por cima de um fundo). */
export function layer(dst: Px, draw: (q: Px) => void, ink: Col = OUT28): void {
  const q = new Px(dst.w, dst.h);
  draw(q);
  q.outline(ink);
  dst.blit(q, 0, 0);
}

/** Retângulo com luz no topo/esquerda e sombra embaixo/direita (2 tons, estilo antigo). */
export function bevel(p: Px, x: number, y: number, w: number, hh: number, c: Col, d = 0.22): void {
  p.rect(x, y, w, hh, c);
  p.hline(x, x + w - 1, y, shade(c, d));
  p.vline(x, y, y + hh - 1, shade(c, d * 0.6));
  p.hline(x, x + w - 1, y + hh - 1, shade(c, -d * 1.4));
  p.vline(x + w - 1, y, y + hh - 1, shade(c, -d));
}

/** Hash dos pixels (FNV-1a) — usado nos testes de determinismo e variedade. */
export function pxHash28(p: Px): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < p.d.length; i++) {
    h ^= p.d[i];
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// ---------------------------------------------------------------- DOM (memo de data URL)

const URLS = new Map<string, string>();
const MAX_URLS = 1500;

/** Data URL ampliada por vizinho mais próximo, memorizada pela chave (a arte só é gerada uma vez). */
export function pxUrl28(key: string, make: () => Px, scale = 2): string {
  const k = `${key}@${scale}`;
  const hit = URLS.get(k);
  if (hit) return hit;
  const p = make();
  const url = upscale(p.canvas(), p.w * scale, p.h * scale).toDataURL();
  if (URLS.size > MAX_URLS) URLS.clear();
  URLS.set(k, url);
  return url;
}

/** <img class="px"> nítido com a arte; w/h em px de tela. */
export function pxImg28(key: string, make: () => Px, w: number, hgt: number, opts: { cls?: string; title?: string; scale?: number } = {}): HTMLImageElement {
  const img = document.createElement('img');
  img.src = pxUrl28(key, make, opts.scale ?? 2);
  img.width = Math.round(w);
  img.height = Math.round(hgt);
  img.className = `px ${opts.cls ?? ''}`.trim();
  img.alt = opts.title ?? '';
  if (opts.title) img.title = opts.title;
  img.draggable = false;
  return img;
}
