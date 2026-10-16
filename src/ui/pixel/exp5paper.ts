// R31 · onda 5 (ART5) — PAPÉIS do jogo explorável em pixel art: as molduras dos objetos que abrem por cima da cena
// (livro-caixa, caderno do olheiro, quadro branco, revista de paradas, mural de cortiça, quadro de planejamento, agenda
// de couro, fichário, ficha de inscrição em prancheta) e a CAIXA DE ENTRADA nas aparências da época (escrivaninha com
// envelopes e lacres → cartas e telegrama → fax e secretária → monitor de tubo → tela plana → celular).
//
// Só a moldura é desenhada aqui; o conteúdo continua sendo HTML por cima, nas áreas que `paper5Layout`/`inbox5Layout`
// devolvem (pixels lógicos; a tela amplia em escala inteira, 2× ou 3×). Mesma paleta e contorno dos objetos (exp5px):
// luz de cima à esquerda, sombra arroxeada, contorno escuro quente. Tudo puro e determinístico (só Px, sem DOM).

import { C, INK, Px, lv, mix, noise, upscale, withAlpha, type Col } from './px';

export interface Rect5 { x: number; y: number; w: number; h: number }

// ---------------------------------------------------------------- peças

const W = C('#f8f4ec'), RED = C('#c83a32'), GOLD = C('#e0b048'), CHROME = C('#c0c4cc'), GREY = C('#8a8c94');
const blk = (p: Px, x: number, y: number, w: number, h: number, c: Col): void => {
  if (w <= 0 || h <= 0) return;
  p.rect(x, y, w, h, c);
  p.hline(x, x + w - 1, y, lv(c, 4));
  if (h > 3 && w > 3) p.vline(x, y + 1, y + h - 2, lv(c, 3.5));
  p.hline(x, x + w - 1, y + h - 1, lv(c, 1));
  if (h > 2) p.vline(x + w - 1, y + 1, y + h - 2, lv(c, 2));
};
/** Retângulo de cantos arredondados (raio em px), preenchido. */
function rrect(p: Px, x: number, y: number, w: number, h: number, r: number, c: Col | ((x: number, y: number) => Col)): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = i < r ? r - i - 0.5 : i >= w - r ? i - (w - r) + 0.5 : 0;
    const dy = j < r ? r - j - 0.5 : j >= h - r ? j - (h - r) + 0.5 : 0;
    if (dx * dx + dy * dy > r * r) continue;
    p.set(x + i, y + j, typeof c === 'number' ? c : c(x + i, y + j));
  }
}
/** Contorno INK só na silhueta (o Px final tem 1 px livre em volta). */
const finish = (p: Px): Px => { p.outline(INK); return p; };
/** Sombra projetada (para baixo e à direita) de um retângulo, dentro do Px. */
const drop = (p: Px, r: Rect5, a = 70): void => { p.rect(r.x + 2, r.y + 2, r.w, r.h, withAlpha(C('#140a14'), a)); };
/** Sombra só nos pixels vazios (depois do contorno, para a sombra não ganhar contorno). */
const under = (p: Px, x: number, y: number, w: number, h: number, a = 80): void => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (p.inb(i, j) && !p.get(i, j)) p.put(i, j, withAlpha(C('#140a14'), a)); };
/** Textura de pano/couro/cortiça por ruído. */
const tex = (base: Col, seed: number, lo = 0.16, hi = 0.86, dLo = 2.4, dHi = 3.8) => (x: number, y: number): Col => { const n = noise(x, y, seed); return n < lo ? lv(base, dLo) : n > hi ? lv(base, dHi) : base; };
/** Costura tracejada. */
function stitch(p: Px, r: Rect5, c: Col): void {
  for (let x = r.x; x < r.x + r.w; x++) if ((x - r.x) % 3 < 2) { p.set(x, r.y, c); p.set(x, r.y + r.h - 1, c); }
  for (let y = r.y; y < r.y + r.h; y++) if ((y - r.y) % 3 < 2) { p.set(r.x, y, c); p.set(r.x + r.w - 1, y, c); }
}
/** Página pautada: linhas a cada `step`, margem dupla vermelha opcional. */
function ruled(p: Px, r: Rect5, page: Col, line: Col, step: number, margin?: number, top = 10): void {
  p.rect(r.x, r.y, r.w, r.h, page);
  for (let y = r.y + top; y < r.y + r.h - 1; y += step) p.hline(r.x, r.x + r.w - 1, y, line);
  if (margin !== undefined) { p.vline(r.x + margin, r.y, r.y + r.h - 1, C('#e0908a')); p.vline(r.x + margin + 2, r.y, r.y + r.h - 1, C('#e8aaa4')); }
}
/** Tachinha (vista de frente): cabeça redonda com brilho. */
export function tack5(p: Px, x: number, y: number, c: Col): void { p.disc(x + 0.5, y + 0.5, 1.6, c); p.put(x, y - 1, lv(c, 5)); p.put(x + 1, y + 1, lv(c, 1)); }
/** Ímã redondo de quadro branco. */
export function magnet5(p: Px, x: number, y: number, c: Col): void { p.disc(x + 0.5, y + 0.5, 2.2, lv(c, 1.4)); p.disc(x, y, 1.6, c); p.put(x - 1, y - 1, lv(c, 5)); }
const PINS = [RED, C('#2a8a4a'), C('#e0c040'), C('#3a6ac8'), C('#8a4ab0')];

// ---------------------------------------------------------------- papéis

export const PAPER5 = ['ledger', 'scout', 'whiteboard', 'charts', 'cork', 'planning', 'agenda', 'rolodex', 'form'] as const;
export type Paper5 = (typeof PAPER5)[number];
export const PAPER5_LABEL: Record<Paper5, { pt: string; en: string }> = {
  ledger: { pt: 'Livro-caixa', en: 'Ledger' }, scout: { pt: 'Caderno do olheiro', en: "Scout's notebook" },
  whiteboard: { pt: 'Quadro branco', en: 'Whiteboard' }, charts: { pt: 'Revista de paradas', en: 'Charts magazine' },
  cork: { pt: 'Mural de cortiça', en: 'Corkboard' }, planning: { pt: 'Quadro de planejamento', en: 'Planning board' },
  agenda: { pt: 'Agenda de couro', en: 'Leather planner' }, rolodex: { pt: 'Fichário', en: 'Card file' },
  form: { pt: 'Ficha de inscrição', en: 'Sign-up form' },
};
/** Menor tamanho aceito (pixels lógicos). */
export const PAPER5_MIN = { w: 160, h: 100 };

export interface Paper5Lay {
  /** onde vai o título (na própria moldura: capa, faixa da revista, topo do quadro) */
  head: Rect5;
  /** onde vão as abas (marcadores do próprio objeto) */
  tabs: Rect5;
  /** áreas de conteúdo (páginas). Livro, caderno e agenda têm duas; o resto, uma. */
  body: Rect5[];
}

const HEAD = 12, TABS = 11;
/** Margens da moldura: [cima até o título, lados, baixo]. */
const M: Record<Paper5, [number, number, number]> = {
  ledger: [6, 7, 7], scout: [6, 7, 7], whiteboard: [6, 6, 10], charts: [0, 6, 6], cork: [6, 7, 7], planning: [6, 6, 6], agenda: [6, 8, 7], rolodex: [6, 7, 7], form: [16, 10, 8],
};

/** Áreas do conteúdo HTML para um papel de w×h pixels lógicos. */
export function paper5Layout(kind: Paper5, w0: number, h0: number): Paper5Lay {
  const w = Math.max(PAPER5_MIN.w, Math.round(w0)), h = Math.max(PAPER5_MIN.h, Math.round(h0));
  const [t, s, b] = M[kind];
  const head: Rect5 = kind === 'charts' ? { x: s + 4, y: 3, w: w - 2 * s - 8, h: 16 } : { x: s + 2, y: t, w: w - 2 * s - 4, h: HEAD };
  const ty = kind === 'charts' ? 24 : t + HEAD;
  const tabs: Rect5 = { x: s + 2, y: ty, w: w - 2 * s - 4, h: TABS };
  const by = ty + TABS + 2, bh = h - by - b;
  const two = kind === 'ledger' || kind === 'scout' || kind === 'agenda';
  const gap = kind === 'scout' ? 10 : 6;
  const body = two
    ? [{ x: s, y: by, w: Math.floor((w - 2 * s - gap) / 2), h: bh }, { x: s + Math.ceil((w - 2 * s + gap) / 2), y: by, w: Math.floor((w - 2 * s - gap) / 2), h: bh }]
    : [{ x: s, y: by, w: w - 2 * s, h: bh }];
  return { head, tabs, body };
}

export interface Paper5Opts { seed?: number; cols?: number; rows?: number }

/** A moldura do papel (w×h pixels lógicos). O conteúdo entra por cima, nas áreas de paper5Layout. */
export function paper5Px(kind: Paper5, w0: number, h0: number, o: Paper5Opts = {}): Px {
  const w = Math.max(PAPER5_MIN.w, Math.round(w0)), h = Math.max(PAPER5_MIN.h, Math.round(h0));
  const L = paper5Layout(kind, w, h);
  const p = new Px(w, h);
  const sd = o.seed ?? 5;
  const all: Rect5 = { x: 1, y: 1, w: w - 2, h: h - 2 };
  switch (kind) {
    case 'ledger': { // capa de pano verde costurada, cantoneiras de couro, páginas creme pautadas de verde, fita vermelha
      const cloth = C('#2f5a3a');
      rrect(p, all.x, all.y, all.w, all.h, 3, tex(cloth, sd, 0.2, 0.84, 2.6, 3.6));
      p.hline(3, w - 4, 2, lv(cloth, 4.2));
      stitch(p, { x: 4, y: 4, w: w - 8, h: h - 8 }, lv(cloth, 4.4));
      for (const [cx, cy, sx, sy] of [[1, 1, 1, 1], [w - 2, 1, -1, 1], [1, h - 2, 1, -1], [w - 2, h - 2, -1, -1]] as const)
        p.poly([[cx, cy], [cx + sx * 9, cy], [cx, cy + sy * 9]], C('#6a3a20'));
      for (const r of L.body) { drop(p, r, 90); ruled(p, r, C('#f6f0da'), C('#bcd8b8'), 6, 14, 14); p.hline(r.x, r.x + r.w - 1, r.y + 12, C('#7ab08a')); p.vline(r.x + r.w - 26, r.y, r.y + r.h - 1, C('#e0908a')); p.vline(r.x + r.w - 14, r.y, r.y + r.h - 1, C('#bcd8b8')); }
      const g = L.body[0].x + L.body[0].w; // calha entre as páginas
      p.rect(g, L.body[0].y, L.body[1].x - g, L.body[0].h, lv(cloth, 1));
      p.vline(L.body[0].x + L.body[0].w - 1, L.body[0].y, L.body[0].y + L.body[0].h - 1, C('#d8d0b4'));
      p.vline(L.body[1].x, L.body[1].y, L.body[1].y + L.body[1].h - 1, C('#d8d0b4'));
      const fx = L.body[1].x + L.body[1].w - 18; // fita marcadora saindo por baixo
      p.rect(fx, L.body[1].y - 2, 3, L.body[1].h + 2 + 6, RED); p.vline(fx, L.body[1].y - 2, L.body[1].y + L.body[1].h + 5, lv(RED, 4)); p.put(fx + 1, h - 2, 0);
      break;
    }
    case 'scout': { // capa cinza-ardósia, páginas brancas de linha azul com margem vermelha, espiral no meio
      const cov = C('#3a4048');
      rrect(p, all.x, all.y, all.w, all.h, 3, tex(cov, sd, 0.18, 0.88, 2.6, 3.6));
      p.hline(3, w - 4, 2, lv(cov, 4.2));
      for (const r of L.body) { drop(p, r, 90); ruled(p, r, C('#fbfaf4'), C('#c8d4ec'), 6, 12, 12); }
      const cx = L.body[0].x + L.body[0].w + 5;
      for (let y = L.body[0].y + 4; y < L.body[0].y + L.body[0].h - 3; y += 6) {
        p.rect(cx - 5, y, 2, 2, C('#c8c4b8')); p.rect(cx + 3, y, 2, 2, C('#c8c4b8')); // furos
        p.rect(cx - 4, y - 1, 8, 3, C('#2a2a30')); p.hline(cx - 3, cx + 2, y - 1, C('#9a9aa8')); p.put(cx - 3, y, C('#e8e8f0'));
      }
      break;
    }
    case 'whiteboard': { // moldura de alumínio, superfície branca com marcas de apagador, bandeja de canetas e ímãs
      const al = C('#b8bcc6');
      blk(p, all.x, all.y, all.w, all.h, al); p.hline(2, w - 3, 2, lv(al, 5));
      const s: Rect5 = { x: 5, y: 5, w: w - 10, h: h - 14 };
      p.rect(s.x, s.y, s.w, s.h, C('#f6f6f2'));
      p.hline(s.x, s.x + s.w - 1, s.y, C('#dcdcd8')); p.vline(s.x, s.y, s.y + s.h - 1, C('#e4e4e0'));
      for (let i = 0; i < 3; i++) { const x0 = s.x + 20 + Math.floor(noise(i, sd, 3) * (s.w - 60)), y0 = s.y + 20 + Math.floor(noise(sd, i, 4) * (s.h - 40)); for (let k = 0; k < 18; k++) p.set(x0 + k, y0 + (k >> 2), withAlpha(C('#c8ccd8'), 60)); }
      const ty = h - 9; // bandeja
      blk(p, 3, ty, w - 6, 4, al); p.hline(4, w - 5, ty + 4, lv(al, 1));
      const mk = [C('#2a5ab0'), RED, C('#2a8a3a'), C('#1e1e24')];
      mk.forEach((c, i) => { p.rect(10 + i * 9, ty - 2, 7, 2, c); p.rect(10 + i * 9, ty - 2, 2, 2, W); });
      blk(p, w - 24, ty - 4, 12, 4, C('#3a3a42')); p.rect(w - 24, ty - 1, 12, 1, C('#e8e0c8')); // apagador
      magnet5(p, w - 18, 9, RED); magnet5(p, w - 10, 9, C('#3a6ac8'));
      break;
    }
    case 'charts': { // revista: papel creme, faixa vermelha com retícula, grampos, orelha dobrada
      const pg: Rect5 = { x: 1, y: 1, w: w - 4, h: h - 4 };
      p.rect(pg.x, pg.y, pg.w, pg.h, C('#f3ecdc'));
      for (let y = pg.y; y < pg.y + pg.h; y++) for (let x = pg.x; x < pg.x + pg.w; x++) if (noise(x, y, sd) > 0.97) p.set(x, y, C('#e4dcc8'));
      p.rect(pg.x, pg.y, pg.w, 21, C('#c43a2e')); p.hline(pg.x, pg.x + pg.w - 1, pg.y, lv(C('#c43a2e'), 4)); p.hline(pg.x, pg.x + pg.w - 1, pg.y + 20, lv(C('#c43a2e'), 1));
      for (let y = pg.y + 2; y < pg.y + 19; y += 3) for (let x = pg.x + pg.w - 40; x < pg.x + pg.w - 2; x += 3) if ((x + y) % 2 === 0 && x > pg.x + pg.w - 40 + (19 - (y - pg.y)) * 1.4) p.set(x, y, lv(C('#c43a2e'), 4.5));
      p.hline(pg.x + 4, pg.x + pg.w - 5, pg.y + 35, C('#1e1a1e')); p.hline(pg.x + 4, pg.x + pg.w - 5, pg.y + 36, C('#1e1a1e'));
      p.hline(pg.x + 4, pg.x + pg.w - 5, pg.y + pg.h - 4, C('#1e1a1e'));
      for (const y of [Math.floor(h * 0.3), Math.floor(h * 0.7)]) { p.rect(pg.x + 2, y, 1, 4, CHROME); p.put(pg.x + 2, y, W); p.put(pg.x + 2, y + 3, GREY); } // grampos
      p.poly([[pg.x + pg.w - 9, pg.y + pg.h], [pg.x + pg.w, pg.y + pg.h - 9], [pg.x + pg.w, pg.y + pg.h]], 0);
      for (let y = pg.y + pg.h - 9; y < pg.y + pg.h; y++) for (let x = pg.x + pg.w - 9; x < pg.x + pg.w; x++) if (x - (pg.x + pg.w - 9) + (y - (pg.y + pg.h - 9)) >= 9) p.put(x, y, 0);
      p.poly([[pg.x + pg.w - 9, pg.y + pg.h], [pg.x + pg.w, pg.y + pg.h - 9], [pg.x + pg.w - 9, pg.y + pg.h - 9]], C('#ddd2b8'));
      break;
    }
    case 'cork': { // moldura de madeira, cortiça granulada, tachinhas soltas
      const wood = C('#6e3e22');
      blk(p, all.x, all.y, all.w, all.h, wood);
      for (let x = 3; x < w - 3; x += 7) p.vline(x, 2, 4, lv(wood, 2.4));
      const c0 = C('#b88a58');
      p.fill((x, y) => { const n = noise(x >> 1, y >> 1, sd) * 0.6 + noise(x, y, sd + 1) * 0.4; return n < 0.3 ? lv(c0, 2.6) : n > 0.72 ? lv(c0, 3.5) : c0; }, 6, 6, w - 12, h - 12);
      for (let i = 0; i < 40; i++) { const x = 7 + Math.floor(noise(i, 1, sd) * (w - 14)), y = 7 + Math.floor(noise(1, i, sd) * (h - 14)); p.set(x, y, lv(c0, 1.4)); }
      p.hline(6, w - 7, 6, lv(c0, 1.6)); p.vline(6, 6, h - 7, lv(c0, 1.8));
      tack5(p, w - 14, h - 12, PINS[0]); tack5(p, w - 20, h - 10, PINS[2]); tack5(p, 12, h - 11, PINS[3]);
      break;
    }
    case 'planning': { // quadro de parede: alumínio, superfície off-white, faixa de meses, grade de cartões T
      const al = C('#b8bcc6');
      blk(p, all.x, all.y, all.w, all.h, al); p.hline(2, w - 3, 2, lv(al, 5));
      const s: Rect5 = { x: 5, y: 5, w: w - 10, h: h - 10 };
      p.rect(s.x, s.y, s.w, s.h, C('#f2efe6'));
      const cols = o.cols ?? 13, rows = o.rows ?? 6;
      const gx = L.body[0].x, gy = L.body[0].y + 12, gw = L.body[0].w, gh = L.body[0].h - 14;
      p.rect(gx, gy - 12, gw, 12, C('#e4dccb')); p.hline(gx, gx + gw - 1, gy - 1, C('#b8ae98'));
      const cw = gw / cols, rh = gh / rows;
      for (let c = 1; c < cols; c++) p.vline(Math.round(gx + c * cw), gy - 12, gy + gh - 1, C('#d8d2c4'));
      for (let r = 1; r < rows; r++) p.hline(gx, gx + gw - 1, Math.round(gy + r * rh), C('#d8d2c4'));
      p.rect(gx, gy, Math.round(cw), gh, withAlpha(C('#e4dccb'), 160)); // coluna dos nomes
      for (let c = 1; c < cols; c++) for (let r = 0; r < rows; r++) p.hline(Math.round(gx + c * cw) + 2, Math.round(gx + (c + 1) * cw) - 3, Math.round(gy + r * rh) + 2, C('#e2ddd0')); // trilhos dos cartões
      break;
    }
    case 'agenda': { // couro marrom costurado, cantoneiras douradas, páginas creme, elástico e fita
      const lth = C('#6a3a22');
      rrect(p, all.x, all.y, all.w, all.h, 4, tex(lth, sd, 0.22, 0.82, 2.6, 3.6));
      p.hline(4, w - 5, 2, lv(lth, 4.2));
      stitch(p, { x: 4, y: 4, w: w - 8, h: h - 8 }, C('#c8a070'));
      for (const r of L.body) { drop(p, r, 90); ruled(p, r, C('#f8f0dc'), C('#ece0c4'), 8, undefined, 16); }
      const g = L.body[0].x + L.body[0].w;
      p.rect(g, L.body[0].y, L.body[1].x - g, L.body[0].h, lv(lth, 1));
      for (const [x, y] of [[L.body[0].x, L.body[0].y], [L.body[1].x + L.body[1].w - 6, L.body[1].y]] as const) p.poly([[x, y], [x + 6, y], [x + (x === L.body[0].x ? 0 : 6), y + 6]], GOLD);
      for (const [x, y] of [[L.body[0].x, L.body[0].y + L.body[0].h - 6], [L.body[1].x + L.body[1].w - 6, L.body[1].y + L.body[1].h - 6]] as const) p.poly(x === L.body[0].x ? [[x, y], [x, y + 6], [x + 6, y + 6]] : [[x + 6, y], [x + 6, y + 6], [x, y + 6]], GOLD);
      p.rect(w - 6, 1, 3, h - 2, C('#2a2026')); p.vline(w - 6, 1, h - 2, C('#4a3a40')); // elástico
      const fx = L.body[0].x + L.body[0].w - 10; p.rect(fx, L.body[0].y - 2, 3, L.body[0].h + 8, C('#8a2430')); p.vline(fx, L.body[0].y - 2, L.body[0].y + L.body[0].h + 5, lv(C('#8a2430'), 4));
      break;
    }
    case 'rolodex': { // gaveta de fichas: caixa de carvalho, fundo de papelão, guia das letras no topo
      const oak = C('#9a6a3a');
      blk(p, all.x, all.y, all.w, all.h, oak);
      for (let y = 3; y < h - 3; y += 4) for (let x = 2; x < w - 2; x++) if (noise(x, y, sd) > 0.7) p.set(x, y, lv(oak, 2.6));
      const inner: Rect5 = { x: 6, y: 6, w: w - 12, h: h - 12 };
      p.rect(inner.x, inner.y, inner.w, inner.h, C('#ece2c6')); p.hline(inner.x, inner.x + inner.w - 1, inner.y, lv(C('#ece2c6'), 1.6)); p.vline(inner.x, inner.y, inner.y + inner.h - 1, lv(C('#ece2c6'), 2));
      p.rect(L.tabs.x - 2, L.tabs.y + TABS - 2, L.tabs.w + 4, 2, C('#c8b890')); // guia
      const hx = Math.floor(w / 2); blk(p, hx - 10, h - 6, 20, 4, C('#c09048')); p.hline(hx - 8, hx + 7, h - 5, lv(C('#c09048'), 5)); // puxador de latão
      break;
    }
    case 'form': { // prancheta de eucatex com prendedor de metal e a folha branca
      const board = C('#a8703e');
      rrect(p, all.x, all.y, all.w, all.h, 5, tex(board, sd, 0.18, 0.88, 2.6, 3.7));
      p.hline(5, w - 6, 2, lv(board, 4.2));
      const sh: Rect5 = { x: 7, y: 12, w: w - 14, h: h - 18 };
      drop(p, sh, 80);
      p.rect(sh.x, sh.y, sh.w, sh.h, C('#f6f0e2'));
      p.hline(sh.x, sh.x + sh.w - 1, sh.y, C('#ffffff')); p.vline(sh.x + sh.w - 1, sh.y, sh.y + sh.h - 1, C('#e0d8c4'));
      const cx = Math.floor(w / 2), cw = Math.min(64, Math.floor(w * 0.36)); // prendedor
      blk(p, cx - (cw >> 1), 3, cw, 12, CHROME); p.rect(cx - (cw >> 1) + 3, 12, cw - 6, 4, lv(CHROME, 2)); p.hline(cx - (cw >> 1) + 2, cx + (cw >> 1) - 3, 4, W);
      p.disc(cx - (cw >> 1) + 5, 8, 1.6, GREY); p.disc(cx + (cw >> 1) - 5, 8, 1.6, GREY);
      p.rect(cx - 6, 1, 12, 3, lv(CHROME, 2)); p.hline(cx - 5, cx + 4, 1, W);
      break;
    }
  }
  finish(p);
  if (kind === 'charts') under(p, 4, 4, w - 4, h - 4, 110);
  return p;
}

// ---------------------------------------------------------------- peças de conteúdo (cartões, polaroids, post-its, abas)

/** Polaroid com tachinha: moldura branca de base larga e a foto (opcional) dentro. */
export function polaroid5Px(w: number, h: number, pin: Col = RED, photo?: Px, sepia = false): Px {
  w = Math.max(18, Math.round(w)); h = Math.max(20, Math.round(h));
  const p = new Px(w + 3, h + 4);
  const fr = sepia ? C('#e8dcc0') : C('#fbf8f0');
  p.rect(1, 2, w - 1, h - 1, fr); p.hline(1, w - 1, 2, W);
  const ph: Rect5 = { x: 3, y: 4, w: w - 5, h: Math.round((h - 1) * 0.74) - 3 };
  p.rect(ph.x, ph.y, ph.w, ph.h, sepia ? C('#6a5038') : C('#26324a'));
  if (photo) { const ox = ph.x + Math.floor((ph.w - photo.w) / 2), oy = ph.y + Math.max(0, ph.h - photo.h); for (let y = 0; y < photo.h; y++) for (let x = 0; x < photo.w; x++) { const c = photo.d[y * photo.w + x]; if (c && ox + x >= ph.x && ox + x < ph.x + ph.w && oy + y >= ph.y && oy + y < ph.y + ph.h) p.set(ox + x, oy + y, sepia ? mix(c, C('#a07a50'), 0.55) : c); } }
  p.hline(ph.x, ph.x + ph.w - 1, ph.y, withAlpha(C('#000000'), 80));
  p.outline(INK);
  under(p, 3, 4, w, h, 90); // sombra na cortiça
  tack5(p, Math.floor(w / 2), 2, pin);
  return p;
}

/** Ficha do fichário: cartão creme com aba cinza no topo (a "orelha" de puxar), linha vermelha e pauta azul clara. */
export function card5Px(w: number, h: number, mark?: Col): Px {
  w = Math.max(40, Math.round(w)); h = Math.max(24, Math.round(h));
  const p = new Px(w + 2, h + 2);
  p.rect(1, 2, w - 1, h - 2, C('#fbf6e8'));
  const tx = Math.floor(w / 2) - 10; p.rect(tx, 0, 20, 3, C('#d2ccbc')); p.hline(tx, tx + 19, 0, C('#e4e0d4'));
  p.hline(2, w - 2, 7, C('#e0908a'));
  for (let y = 12; y < h - 1; y += 5) p.hline(2, w - 2, y, C('#dce4f0'));
  if (mark) { p.rect(w - 12, 4, 10, 1, mark); }
  p.outline(INK);
  under(p, 3, 4, w, h - 1, 60);
  return p;
}

/** Post-it com sombra e canto levantado. */
export function postit5Px(w: number, h: number, c: Col = C('#f8e070')): Px {
  w = Math.max(14, Math.round(w)); h = Math.max(12, Math.round(h));
  const p = new Px(w + 2, h + 2);
  p.rect(0, 0, w, h, c); p.hline(0, w - 1, 0, lv(c, 2.6)); p.hline(0, w - 1, 1, lv(c, 3.4));
  p.poly([[w - 5, h], [w, h - 5], [w, h]], 0);
  for (let y = h - 5; y < h; y++) for (let x = w - 5; x < w; x++) if (x - (w - 5) + y - (h - 5) >= 5) p.put(x, y, 0);
  p.poly([[w - 5, h], [w, h - 5], [w - 5, h - 5]], lv(c, 2.4));
  under(p, 2, 2, w, h, 60);
  return p;
}

/** Aba (marcador) de cada objeto, w×11. `on` = aba aberta. */
export function tab5Px(kind: Paper5, w: number, on = false): Px {
  w = Math.max(16, Math.round(w));
  const p = new Px(w, TABS);
  const st: Record<Paper5, [Col, Col]> = {
    ledger: [C('#f0e6c8'), C('#c83a32')], scout: [C('#fbfaf4'), C('#e8b850')], whiteboard: [C('#ffffff'), C('#2a5ab0')], charts: [C('#f3ecdc'), C('#1e1a1e')],
    cork: [C('#efe2c2'), C('#6a3a22')], planning: [C('#ffffff'), C('#3a3030')], agenda: [C('#f8f0dc'), C('#8a2430')], rolodex: [C('#f0e6cc'), C('#c8502a')], form: [C('#f6f0e2'), C('#e8b850')],
  };
  const [off, act] = st[kind];
  const c = on ? act : off;
  const r = kind === 'scout' || kind === 'rolodex' || kind === 'agenda' ? 2 : 1;
  rrect(p, 1, on ? 0 : 1, w - 2, TABS - (on ? 0 : 1), r, c);
  p.hline(2, w - 3, on ? 0 : 1, lv(c, 4.4));
  p.hline(1, w - 2, TABS - 1, lv(c, 1.6));
  p.outline(INK);
  return p;
}

// ---------------------------------------------------------------- caixa de entrada por época

export const INBOX5 = ['desk', 'telegram', 'fax', 'crt', 'flat', 'phone'] as const;
export type Inbox5 = (typeof INBOX5)[number];
export const INBOX5_LABEL: Record<Inbox5, { pt: string; en: string; years: string }> = {
  desk: { pt: 'Escrivaninha com envelopes e lacres', en: 'Desk with sealed envelopes', years: '1889–1919' },
  telegram: { pt: 'Cartas e telegrama amarelo', en: 'Letters and the yellow telegram', years: '1920–1969' },
  fax: { pt: 'Fax e secretária eletrônica', en: 'Fax and answering machine', years: '1970–1989' },
  crt: { pt: 'Monitor de tubo', en: 'CRT monitor', years: '1990–1999' },
  flat: { pt: 'Tela plana', en: 'Flat screen', years: '2000–2009' },
  phone: { pt: 'Celular', en: 'Phone', years: '2010–2040' },
};
/** A aparência da época (a troca é sozinha; não muda nada no funcionamento da caixa). */
export function inbox5Look(year: number): Inbox5 {
  return year < 1920 ? 'desk' : year < 1970 ? 'telegram' : year < 1990 ? 'fax' : year < 2000 ? 'crt' : year < 2010 ? 'flat' : 'phone';
}
export const INBOX5_MIN = { w: 240, h: 150 };

/** Mesma estrutura em todas as épocas: cabeçalho, abas, filtros, lista, leitura, pendências e teclas. */
export interface Inbox5Lay { screen: Rect5; head: Rect5; tabs: Rect5; filters: Rect5; list: Rect5; read: Rect5; notes: Rect5; keys: Rect5 }

/** Moldura de cada aparência: [cima, esquerda, direita, baixo]. */
const IM: Record<Inbox5, [number, number, number, number]> = {
  desk: [10, 10, 10, 10], telegram: [10, 10, 10, 10], fax: [16, 8, 22, 8], crt: [12, 12, 12, 20], flat: [6, 6, 6, 12], phone: [14, 10, 10, 12],
};

export function inbox5Layout(look: Inbox5, w0: number, h0: number): Inbox5Lay {
  const w = Math.max(INBOX5_MIN.w, Math.round(w0)), h = Math.max(INBOX5_MIN.h, Math.round(h0));
  const [t, l, r, b] = IM[look];
  const screen: Rect5 = { x: l, y: t, w: w - l - r, h: h - t - b };
  const ix = screen.x + 4, iw = screen.w - 8;
  const head: Rect5 = { x: ix, y: screen.y + 3, w: iw, h: 10 };
  const tabs: Rect5 = { x: ix, y: head.y + head.h + 2, w: iw, h: 11 };
  const filters: Rect5 = { x: ix, y: tabs.y + tabs.h + 2, w: iw, h: 9 };
  const ty = filters.y + filters.h + 3, th = screen.y + screen.h - 4 - ty;
  const lw = Math.round(iw * 0.4), sw = Math.round(iw * 0.18), rw = iw - lw - sw - 8;
  const list: Rect5 = { x: ix, y: ty, w: lw, h: th };
  const read: Rect5 = { x: ix + lw + 4, y: ty, w: rw, h: th };
  const nh = Math.round(th * 0.6);
  const notes: Rect5 = { x: read.x + rw + 4, y: ty, w: sw, h: nh };
  const keys: Rect5 = { x: notes.x, y: ty + nh + 4, w: sw, h: th - nh - 4 };
  return { screen, head, tabs, filters, list, read, notes, keys };
}

const woodTex = (base: Col, sd: number) => (x: number, y: number): Col => {
  const g = Math.sin(y * 0.55 + Math.sin(x * 0.03 + sd) * 2.2) + noise(x >> 3, y, sd) * 0.6;
  return g > 1.05 ? lv(base, 3.7) : g < -0.95 ? lv(base, 2.3) : base;
};
/** Envelope pequeno com lacre (enfeite e item da lista da escrivaninha). */
function envelope(p: Px, x: number, y: number, w: number, h: number, seal: Col, paper = C('#efe4c4')): void {
  p.rect(x, y, w, h, paper); p.hline(x, x + w - 1, y, lv(paper, 4.2)); p.hline(x, x + w - 1, y + h - 1, lv(paper, 2));
  p.line(x, y, x + (w >> 1), y + Math.round(h * 0.55), lv(paper, 2)); p.line(x + w - 1, y, x + (w >> 1), y + Math.round(h * 0.55), lv(paper, 2));
  const cx = x + (w >> 1), cy = y + Math.round(h * 0.55);
  p.disc(cx + 0.5, cy + 0.5, 2.2, seal); p.put(cx - 1, cy - 1, lv(seal, 4.6)); p.put(cx + 1, cy + 1, lv(seal, 1.4));
}

/** A moldura da caixa de entrada da época (w×h pixels lógicos). */
export function inbox5Px(look: Inbox5, w0: number, h0: number, seed = 5): Px {
  const w = Math.max(INBOX5_MIN.w, Math.round(w0)), h = Math.max(INBOX5_MIN.h, Math.round(h0));
  const L = inbox5Layout(look, w, h);
  const s = L.screen;
  const p = new Px(w, h);
  if (look === 'desk' || look === 'telegram') {
    const wood = look === 'desk' ? C('#5e2e1c') : C('#7a4a2a');
    p.fill(woodTex(wood, seed), 1, 1, w - 2, h - 2);
    p.hline(1, w - 2, 1, lv(wood, 4.4)); p.hline(1, w - 2, h - 2, lv(wood, 1));
    // mata-borrão / tampo de couro no meio
    const felt = look === 'desk' ? C('#3a5a3a') : C('#6a4a32');
    p.rect(s.x - 2, s.y - 2, s.w + 4, s.h + 4, lv(felt, 1)); p.fill(look === 'desk' ? tex(felt, seed, 0.06, 0.95, 2.6, 3.4) : woodTex(lv(wood, 3.4), seed + 1), s.x, s.y, s.w, s.h);
    if (look === 'desk') { p.rect(s.x - 2, s.y - 2, 10, s.h + 4, C('#6a3a20')); p.rect(s.x + s.w - 8, s.y - 2, 10, s.h + 4, C('#6a3a20')); p.vline(s.x + 7, s.y - 2, s.y + s.h + 1, lv(C('#6a3a20'), 4)); }
    // enfeites nas bordas: envelopes lacrados, tinteiro e pena / telegrama amarelo e carimbo
    if (look === 'desk') {
      envelope(p, w - 40, 1, 14, 8, C('#b8322a')); envelope(p, w - 24, 2, 12, 7, C('#3a6ac8'));
      p.rect(6, h - 9, 5, 6, C('#1e1c22')); p.hline(6, 10, h - 9, C('#4a4a5a')); p.line(10, h - 9, 16, h - 2, C('#f0ece0')); p.put(11, h - 8, C('#d8d4c8'));
    } else {
      p.rect(w - 46, 1, 30, 8, C('#f0d040')); p.hline(w - 46, w - 17, 1, lv(C('#f0d040'), 4.4)); p.rect(w - 44, 3, 12, 1, C('#8a6a10')); p.rect(w - 44, 5, 20, 1, C('#8a6a10')); p.rect(w - 30, 0, 6, 3, withAlpha(C('#e8e0c0'), 200));
      envelope(p, 6, h - 9, 13, 7, C('#2a8a4a'), C('#f4ecd4'));
      p.rect(24, h - 8, 5, 5, C('#2a2a30')); p.rect(23, h - 4, 7, 2, C('#6a3a20'));
    }
  } else if (look === 'fax') {
    const plast = C('#d8ccae');
    rrect(p, 1, 3, w - 2, h - 4, 4, plast);
    p.hline(4, w - 5, 3, lv(plast, 4.6)); p.hline(3, w - 4, h - 2, lv(plast, 1.4));
    // fenda do papel no topo e o papel térmico saindo
    p.rect(s.x + 10, 8, s.w - 20, 3, C('#2a2620')); p.hline(s.x + 10, s.x + s.w - 11, 11, lv(plast, 4));
    p.rect(s.x + 16, 0, s.w - 32, 9, C('#f2efe6')); for (let x = s.x + 16; x < s.x + s.w - 16; x += 3) p.put(x, 0, 0);
    p.hline(s.x + 20, s.x + 60, 3, GREY); p.hline(s.x + 20, s.x + 44, 5, GREY);
    // tela/área de papel (moldura funda)
    p.rect(s.x - 2, s.y - 2, s.w + 4, s.h + 4, lv(plast, 1.4));
    p.rect(s.x, s.y, s.w, s.h, C('#ece8dc'));
    p.hline(s.x, s.x + s.w - 1, s.y, C('#c8c2b0'));
    // lateral: secretária eletrônica (fita e LED) e teclado
    const kx = w - 19;
    p.rect(kx, s.y, 15, 12, C('#2a2620')); p.rect(kx + 2, s.y + 2, 11, 6, C('#5a4a3a')); p.disc(kx + 5, s.y + 5, 1.2, C('#1e1c22')); p.disc(kx + 10, s.y + 5, 1.2, C('#1e1c22'));
    p.rect(kx + 12, s.y + 9, 2, 2, C('#ff4a3a'));
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) blk(p, kx + 1 + c * 5, s.y + 18 + r * 6, 4, 4, C('#efe8d6'));
    p.rect(kx + 1, s.y + 44, 14, 5, C('#3a8a4a')); p.hline(kx + 1, kx + 14, s.y + 44, lv(C('#3a8a4a'), 4.4));
    for (let y = s.y + s.h - 14; y < s.y + s.h; y += 2) p.hline(kx + 2, kx + 13, y, lv(plast, 1.8)); // alto-falante
  } else if (look === 'crt') {
    const plast = C('#d6cfbc');
    rrect(p, 1, 1, w - 2, h - 2, 6, plast);
    p.hline(6, w - 7, 1, lv(plast, 4.6)); p.vline(1, 6, h - 7, lv(plast, 3.8)); p.hline(5, w - 6, h - 2, lv(plast, 1.2));
    rrect(p, s.x - 4, s.y - 4, s.w + 8, s.h + 8, 5, lv(plast, 1.4)); // chanfro em volta do tubo
    rrect(p, s.x - 1, s.y - 1, s.w + 2, s.h + 2, 3, C('#1a1c22'));
    p.rect(s.x, s.y, s.w, s.h, C('#c0c0c0'));
    p.rect(s.x, s.y, s.w, 14, C('#0a246a')); for (let x = s.x; x < s.x + s.w; x++) p.put(x, s.y + 13, mix(C('#0a246a'), C('#a6caf0'), (x - s.x) / s.w));
    p.line(s.x + 2, s.y + s.h - 3, s.x + 12, s.y + s.h - 13, withAlpha(W, 50)); // reflexo do vidro
    const by = h - 13; p.rect(w - 30, by, 14, 3, lv(plast, 1.6)); p.rect(w - 14, by, 3, 3, C('#3aa04a')); p.put(w - 14, by, C('#9af0a0'));
    p.rect(14, by + 1, 20, 1, lv(plast, 2)); p.rect(14, by + 3, 12, 1, lv(plast, 2));
  } else if (look === 'flat') {
    const bez = C('#24262c');
    blk(p, 1, 1, w - 2, h - 9, bez);
    p.rect(s.x, s.y, s.w, s.h, C('#eceef2')); p.rect(s.x, s.y, s.w, 13, C('#2a4a8a')); p.hline(s.x, s.x + s.w - 1, s.y + 13, C('#6a8ac8'));
    p.line(s.x + s.w - 40, s.y + 1, s.x + s.w - 10, s.y + s.h - 2, withAlpha(W, 22));
    const chin = h - 9; p.rect(2, chin, w - 4, 6, C('#b8bcc6')); p.hline(2, w - 3, chin, lv(C('#b8bcc6'), 5)); p.hline(2, w - 3, chin + 5, lv(C('#b8bcc6'), 1.4));
    p.disc(Math.floor(w / 2) + 0.5, chin + 3, 1.2, C('#7a8090')); p.put(w - 10, chin + 2, C('#7af0ff'));
    p.rect(Math.floor(w / 2) - 14, h - 3, 28, 2, C('#8a8e98')); // pé
  } else { // celular
    const bez = C('#141418');
    rrect(p, 1, 1, w - 2, h - 2, 14, bez);
    rrect(p, 2, 2, w - 4, h - 4, 13, C('#26262c')); rrect(p, 4, 4, w - 8, h - 8, 11, bez);
    rrect(p, s.x, s.y, s.w, s.h, 8, C('#f2f2f6'));
    rrect(p, Math.floor(w / 2) - 16, 5, 32, 7, 3, C('#000000')); p.disc(Math.floor(w / 2) + 9.5, 8.5, 1.2, C('#2a3a5a'));
    p.hline(5, 9, 5, C('#3a3a42'));
    rrect(p, Math.floor(w / 2) - 20, h - 8, 40, 2, 1, C('#5a5a64'));
    p.rect(w - 2, 30, 1, 14, C('#3a3a42')); p.rect(0, 26, 1, 8, C('#3a3a42')); p.rect(0, 38, 1, 8, C('#3a3a42'));
  }
  return finish(p);
}

/** Categorias da caixa (mesmas cores dos filtros do mock). */
export const CAT5 = { decisao: C('#8a4ab0'), contrato: C('#2a8a4a'), imprensa: C('#2a5ab0'), financas: C('#8a6a3a'), mundo: C('#1a8a8a'), relatorio: C('#8a8c94'), resposta: C('#c83a32'), estrela: C('#e0b048') } as const;
export type Cat5 = keyof typeof CAT5;
export interface Item5Opts { sel?: boolean; unread?: boolean; urgent?: boolean }

/** Fundo de um item da lista na aparência da época (o texto vai por cima, em HTML). */
export function inboxItem5Px(look: Inbox5, w0: number, h0: number, cat: Cat5, o: Item5Opts = {}): Px {
  const w = Math.max(60, Math.round(w0)), h = Math.max(16, Math.round(h0));
  const p = new Px(w + 2, h + 2);
  const cc = CAT5[cat];
  const sel = o.sel ? C('#f0c040') : 0;
  const dim = (c: Col) => (o.unread === false ? mix(c, C('#d8d2c4'), 0.35) : c);
  if (look === 'desk') {
    const paper = dim(o.urgent ? C('#f4e8c8') : C('#efe4c4'));
    p.rect(1, 1, w - 1, h - 1, paper); p.hline(1, w - 1, 1, lv(paper, 4.4));
    p.line(1, 1, Math.floor(w * 0.32), Math.floor(h * 0.6), lv(paper, 2.4)); p.line(w - 1, 1, Math.floor(w * 0.68), Math.floor(h * 0.6), lv(paper, 2.4));
    p.disc(9, h / 2 + 1, 4, dim(cc)); p.disc(9, h / 2 + 1, 2.6, lv(dim(cc), 4)); p.disc(9, h / 2 + 1, 1.6, dim(cc)); // lacre
    for (let i = 0; i < 6; i++) p.set(9 + Math.round(Math.cos(i) * 4.6), h / 2 + 1 + Math.round(Math.sin(i) * 4.6), lv(dim(cc), 1.6));
    if (o.urgent) { p.poly([[w - 12, 1], [w - 1, 1], [w - 1, 12]], RED); }
  } else if (look === 'telegram') {
    const paper = dim(o.urgent ? C('#f2d448') : C('#f4ecd4'));
    p.rect(1, 1, w - 1, h - 1, paper); p.hline(1, w - 1, 1, lv(paper, 4.4));
    p.hline(1, w - 1, Math.floor(h * 0.45), lv(paper, 2.6)); // dobra da carta
    if (o.urgent) { p.rect(1, 1, w - 1, 2, C('#8a6a10')); p.rect(w - 14, h - 5, 10, 3, C('#d8b830')); } // faixa e selo do telegrama
    p.disc(9, h / 2 + 1, 4, dim(cc)); p.put(8, h / 2, lv(dim(cc), 4.6));
  } else if (look === 'fax') {
    const paper = dim(C('#f2efe6'));
    p.rect(1, 1, w - 1, h - 1, paper);
    for (let x = 1; x < w; x += 4) p.put(x, 1, lv(paper, 1.8)); // picote do rolo
    p.hline(1, w - 1, h - 1, lv(paper, 2)); p.hline(1, w - 1, h - 2, lv(paper, 3.2)); // papel enrolando
    p.rect(5, Math.floor(h / 2) - 2, 6, 6, dim(cc)); p.rect(6, Math.floor(h / 2) - 1, 4, 4, lv(dim(cc), 4)); p.rect(7, Math.floor(h / 2), 2, 2, dim(cc));
  } else if (look === 'crt' || look === 'flat') {
    const bg = o.sel ? C('#0a246a') : look === 'crt' ? C('#d4d0c8') : W;
    p.rect(1, 1, w - 1, h - 1, bg);
    if (look === 'crt' && !o.sel) { p.hline(1, w - 1, 1, W); p.vline(1, 1, h - 1, W); p.hline(1, w - 1, h - 1, C('#808080')); p.vline(w - 1, 1, h - 1, C('#808080')); }
    else p.hline(1, w - 1, h - 1, C('#d8dce4'));
    p.rect(5, Math.floor(h / 2) - 3, 7, 7, dim(cc)); p.hline(5, 11, Math.floor(h / 2) - 3, lv(dim(cc), 4.4));
    if (o.unread !== false) p.rect(1, 1, 2, h - 1, o.sel ? C('#a6caf0') : C('#2a5ab0'));
  } else { // celular: cartão arredondado
    rrect(p, 1, 1, w - 1, h - 1, 4, C('#ffffff'));
    p.disc(10, h / 2 + 1, 5, dim(cc)); p.disc(9, h / 2, 2.4, lv(dim(cc), 4)); p.disc(10, h / 2 + 1, 1.4, dim(cc));
    if (o.unread !== false) p.disc(w - 10, 5, 1.6, C('#2a7af0'));
  }
  if (o.urgent && look !== 'desk' && look !== 'telegram') p.rect(w - 5, 3, 3, h - 5, RED);
  p.outline(sel || INK);
  if (sel) p.outline(withAlpha(sel, 90));
  else if (look === 'desk' || look === 'telegram') under(p, 2, 2, w + 1, h + 1, 90);
  return p;
}

/** Canvas ampliado (escala inteira) de qualquer Px deste módulo. */
export function paper5Canvas(p: Px, scale = 2): HTMLCanvasElement { return upscale(p.canvas(), p.w * scale, p.h * scale); }
