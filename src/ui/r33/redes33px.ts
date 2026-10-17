// R33 · REDES — arte em Px do app Redes e do Jornal (regras do PLANO: desenhado por código, contorno INK via inked(),
// rampa de tons por lv(), luz de cima à esquerda, paleta pelas 6 faixas de ep5Of, sem emoji, nada flutuando).
//   redesIcon33(form, year)   ícone do app (16×16) por forma: jornal, perfil, post curto, foto, vídeo curto, avatar
//   masthead33(paper, year)   cabeçalho do jornal/revista/portal da época
//   thumb33(kind, seed, year, mode)  miniatura da "foto"/"vídeo"/"avatar" de um post
// Todas devolvem Px; use px33canvas() para pôr na tela.

import { groupOf33 } from '../../sim/r33/frases33data';
import { drawText, drawTextOutlined, textWidth } from '../pixel/font';
import { C, INK, Px, inked, lv, upscale, type Col } from '../pixel/px';
import { ep5Of } from '../pixel/exp5px';
import type { Form33 } from '../../sim/r33/redes33';

/** Papel e acento por faixa de época (0..5). */
const PAPER = ['#d6c392', '#e2d3a8', '#eee2c0', '#efe5ce', '#e8e6dc', '#dde6ee'];
const ACCENT = ['#6e2e20', '#8a2430', '#c83a32', '#2a5ab0', '#2a8a6a', '#3a7ab8'];
const GOLD = C('#e0b048'), W = C('#f8f4ec');

export function px33canvas(p: Px, k: number): HTMLCanvasElement {
  const c = upscale(p.canvas(), p.w * k, p.h * k);
  c.style.imageRendering = 'pixelated';
  c.style.display = 'block';
  return c;
}

const blk = (p: Px, x: number, y: number, w: number, h: number, c: Col): void => {
  p.rect(x, y, w, h, c);
  p.hline(x, x + w - 1, y, lv(c, 4));
  if (h > 3 && w > 3) p.vline(x, y + 1, y + h - 2, lv(c, 3.5));
  p.hline(x, x + w - 1, y + h - 1, lv(c, 1));
  if (h > 2) p.vline(x + w - 1, y + 1, y + h - 2, lv(c, 2));
};

// ---------------------------------------------------------------- ícone do app

export const ICON33 = 16;
export function redesIcon33(form: Form33, year: number): Px {
  const ep = ep5Of(year), acc = C(ACCENT[ep]), paper = C(PAPER[ep]);
  const out = new Px(ICON33 + 2, ICON33 + 2);
  inked(out, (q) => {
    const o = 1;
    switch (form) {
      case 'jornal': // folha dobrada com título e colunas
        blk(q, o + 1, o + 1, 13, 14, paper);
        q.rect(o + 2, o + 2, 11, 3, acc); q.hline(o + 3, o + 11, o + 3, lv(acc, 4));
        for (let r = 0; r < 4; r++) { q.hline(o + 2, o + 6, o + 7 + r * 2, lv(paper, -3)); q.hline(o + 8, o + 12, o + 7 + r * 2, lv(paper, -3)); }
        break;
      case 'perfil': // ficha com cabeça e ombros
        blk(q, o + 1, o + 2, 14, 12, paper);
        q.rect(o + 3, o + 4, 4, 4, C('#e8bf98')); q.rect(o + 3, o + 3, 4, 1, C('#4a3a30')); q.rect(o + 2, o + 8, 6, 3, acc);
        for (let r = 0; r < 3; r++) q.hline(o + 9, o + 13, o + 5 + r * 2, lv(paper, -3));
        break;
      case 'micro': // balão de fala curto
        blk(q, o + 1, o + 2, 14, 9, paper);
        q.rect(o + 3, o + 11, 3, 2, paper); q.put(o + 3, o + 13, paper); q.hline(o + 3, o + 5, o + 11, lv(paper, 1));
        q.hline(o + 3, o + 12, o + 5, acc); q.hline(o + 3, o + 9, o + 7, lv(paper, -3));
        break;
      case 'foto': // moldura com sol e morro
        blk(q, o + 1, o + 2, 14, 12, W);
        q.rect(o + 2, o + 3, 12, 10, C('#7ab8e0'));
        q.disc(o + 10, o + 6, 2, GOLD);
        q.poly([[o + 2, o + 12], [o + 6, o + 8], [o + 9, o + 12]], C('#4a8a4a')); q.poly([[o + 7, o + 12], [o + 11, o + 9], [o + 14, o + 12]], C('#3a7a3a'));
        break;
      case 'video': // tela com botão de tocar
        blk(q, o + 1, o + 2, 14, 12, C('#2a2630'));
        q.rect(o + 2, o + 3, 12, 10, acc);
        q.poly([[o + 6, o + 5], [o + 6, o + 11], [o + 11, o + 8]], W);
        break;
      case 'avatar': // cabeça de holograma
        q.disc(o + 8, o + 6, 4, C('#7ad0f0')); q.rect(o + 4, o + 10, 9, 4, C('#3a7ab8'));
        q.hline(o + 3, o + 13, o + 14, GOLD); q.ring(o + 8, o + 6, 6, lv(C('#7ad0f0'), 3));
        break;
    }
  });
  return out;
}

// ---------------------------------------------------------------- cabeçalho do jornal

export interface Masthead33 { w: number; h: number }
export const MASTHEAD33: Masthead33 = { w: 200, h: 26 };
/** `paper`: 'folha' | 'radio' | 'jornal' | 'fofoca' | 'paradas' | 'tv' | 'fanzine' | 'portal'. */
export function masthead33(paper: string, title: string, year: number): Px {
  const ep = ep5Of(year), acc = C(ACCENT[ep]), pap = C(PAPER[ep]);
  const { w, h } = MASTHEAD33;
  const p = new Px(w, h);
  p.rect(0, 0, w, h, pap);
  // textura de papel (pontilhado leve, sempre igual)
  for (let y = 0; y < h; y += 2) for (let x = (y / 2) % 2; x < w; x += 4) p.put(x, y, lv(pap, -1));
  p.hline(0, w - 1, 1, INK); p.hline(0, w - 1, 3, INK); p.hline(0, w - 1, h - 2, INK); p.hline(0, w - 1, h - 4, lv(acc, -1));
  const t = title.toUpperCase();
  const sc = textWidth(t, 2) <= w - 52 ? 2 : 1;
  const tw = textWidth(t, sc);
  const x0 = Math.round((w - tw) / 2), y0 = Math.round((h - 5 * sc) / 2);
  drawTextOutlined(p, t, x0, y0, INK, lv(pap, 4), sc);
  // ornamento de cada publicação
  const orn = (x: number): void => {
    switch (paper) {
      case 'radio': p.vline(x + 5, 6, 20, INK); p.line(x + 5, 6, x + 1, 20, INK); p.line(x + 5, 6, x + 9, 20, INK); p.hline(x + 2, x + 8, 14, INK); p.ring(x + 5, 6, 3, acc); break;
      case 'fofoca': p.poly([[x + 4, 5], [x + 9, 5], [x + 6, 12], [x + 10, 12], [x + 3, 22], [x + 5, 14], [x + 1, 14]], acc); break;
      case 'paradas': for (let i = 0; i < 5; i++) { const bh = 4 + ((i * 7) % 9); blk(p, x + i * 3, 21 - bh, 2, bh, i % 2 ? acc : GOLD); } break;
      case 'tv': blk(p, x, 8, 11, 9, C('#2a2630')); p.rect(x + 1, 9, 9, 7, acc); p.line(x + 3, 8, x + 1, 4, INK); p.line(x + 7, 8, x + 9, 4, INK); break;
      case 'fanzine': for (let i = 0; i < 4; i++) p.hline(x + (i % 2) * 2, x + 9 - (i % 2) * 2, 6 + i * 4, i % 2 ? acc : INK); p.put(x + 11, 8, INK); p.put(x + 12, 12, INK); break;
      case 'portal': blk(p, x, 6, 12, 12, C('#cfd6e0')); p.rect(x + 1, 7, 10, 2, acc); p.rect(x + 2, 11, 3, 5, lv(acc, 2)); p.rect(x + 6, 11, 4, 2, lv(acc, 3)); break;
      default: p.disc(x + 5, 12, 3, GOLD); p.ring(x + 5, 12, 4, INK); p.put(x + 5, 12, INK); // folha/jornal: selo
    }
  };
  orn(6); orn(w - 18);
  return p;
}

// ---------------------------------------------------------------- miniaturas de post

const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export type Thumb33 = 'foto' | 'video' | 'avatar';
export const THUMB33 = { w: 44, h: 30 };
/** Miniatura do post: cena pelo grupo do fato (carreira, vida, mundo, crime); vídeo ganha tocar e duração; avatar, holograma. */
export function thumb33(kind: string, seed: string, year: number, mode: Thumb33): Px {
  const g = groupOf33(kind), hs = hash(seed), ep = ep5Of(year);
  const { w, h } = THUMB33;
  const p = new Px(w, h);
  const sky = [C('#7ab8e0'), C('#e8905a'), C('#8a6ab8'), C('#4a6ab0'), C('#d8b86a')][hs % 5];
  p.rect(0, 0, w, h, mode === 'avatar' ? C('#1a2a3a') : sky);
  if (mode !== 'avatar') for (let y = 0; y < h * 0.5; y += 2) p.hline(0, w - 1, y, lv(sky, 1 + y / 12));
  inked(p, (q) => {
    if (mode === 'avatar') { // holograma: cabeça, ombros e um halo; cor, cabelo e antena variam por post
      const hue = [C('#7ad0f0'), C('#a8f0c0'), C('#f0a8d8'), C('#f0d880'), C('#b8a8f0')][hs % 5], cloth = [C('#3a7ab8'), C('#2a8a6a'), C('#8a4a9a'), C('#b0803a'), C('#4a4ab0')][(hs >> 3) % 5];
      q.rect(10, 20, 24, 9, cloth); q.rect(17, 19, 10, 3, lv(hue, -1));
      q.disc(22, 12, 7, hue); q.hline(16, 28, 7 + ((hs >> 5) % 3), lv(hue, -3));
      if ((hs >> 7) % 2) q.vline(22, 1, 4, GOLD);
      q.ring(22, 12, 10, withA(lv(hue, 3), 120));
      q.hline(6, 38, 29, GOLD);
      for (let x = 2; x < w; x += 6) q.put(x, 2 + ((hs >> 9) % 3), withA(lv(hue, 4), 160));
      return;
    }
    q.rect(0, 22, w, 8, g === 'world' ? C('#6a6a74') : C('#4a7a3a'));
    if (g === 'career') { // palco com holofotes e três silhuetas
      q.rect(4, 20, 36, 4, C('#6e2e20')); q.poly([[10, 0], [14, 0], [18, 20], [8, 20]], withA(C('#fff0b0'), 90)); q.poly([[30, 0], [34, 0], [38, 20], [28, 20]], withA(C('#ffe08a'), 80));
      for (let i = 0; i < 3; i++) { const x = 11 + i * 10; q.rect(x, 11, 3, 3, C('#e8bf98')); q.rect(x - 1, 14, 5, 6, C(['#c83a32', '#2a5ab0', '#2a8a6a'][(i + hs) % 3])); }
    } else if (g === 'life') { // casa e coração
      q.rect(8, 12, 16, 10, C('#d8c8a8')); q.poly([[6, 12], [16, 5], [26, 12]], C('#a8402c')); q.rect(14, 16, 4, 6, C('#6e4a30'));
      q.disc(34, 8, 4, C('#e0506a')); q.poly([[30, 10], [38, 10], [34, 16]], C('#e0506a'));
    } else if (g === 'world') { // horizonte da cidade
      for (let i = 0; i < 8; i++) { const bw = 4 + (i * 3) % 4, bh = 8 + ((i * 7 + hs) % 12); blk(q, i * 5 + 1, 22 - bh, bw, bh, lv(C(['#5a6a8a', '#7a6a8a', '#6a8a7a'][i % 3]), (i % 3) - 1)); }
    } else { // crime: viatura com luz
      blk(q, 8, 16, 26, 7, C('#e8e8f0')); q.rect(12, 12, 14, 4, C('#e8e8f0')); q.rect(16, 13, 6, 2, C('#7ab8e0')); q.rect(18, 9, 4, 3, C('#c83a32')); q.rect(22, 9, 3, 3, C('#2a5ab0'));
      q.disc(14, 23, 3, C('#2a2630')); q.disc(28, 23, 3, C('#2a2630'));
    }
  });
  if (mode === 'video') {
    p.disc(22, 14, 6, withA(C('#170e12'), 150));
    p.poly([[20, 11], [20, 17], [26, 14]], W);
    drawText(p, `0:${String(10 + (hs % 50))}`, w - 15, h - 7, W);
  }
  void ep;
  return p;
}
const withA = (c: Col, a: number): Col => ((c & 0xffffff) | ((a & 255) << 24)) >>> 0;
