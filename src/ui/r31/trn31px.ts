// R31 · onda 5 (TRN) — a pintura das transições em pixel art, num buffer Px (o kit do jogo: px.ts, font.ts, icons).
// Unidade U = 2 px do buffer (o buffer é a tela dividida por 3, ampliado sem suavizar). Desenho a partir do mock
// docs/r31/mocks/onda5/trans.html: dobras do veludo em ciclos de 12 colunas, sanefa recortada com galão, franja,
// lâminas cromadas com filete de neon, painel de LED com onda; cartão, passagem e os três calendários.

import { drawText, textWidth } from '../pixel/font';
import { iconPx } from '../pixel/icons';
import { travel5Px } from '../pixel/exp5px';
import { C, INK, Px, type Col } from '../pixel/px';
import type { Cal31, Curtain31, TrnPlace31, Vehicle31 } from './trn31model';

export const U31 = 2;
const U = U31;
const K = INK;

interface Mat { f: Col[]; trim: Col; trim2: Col; edge: Col }
const hex = (xs: string[]) => xs.map((x) => C(x));
export const MAT31: Record<Exclude<Curtain31, 'led'>, Mat> = {
  velvet: { f: hex(['#3a0610', '#4e0a16', '#6a1020', '#821628', '#9c1e30', '#b42a3a', '#c83c48', '#b42a3a', '#9c1e30', '#821628', '#6a1020', '#4e0a16']), trim: C('#e0b040'), trim2: C('#a07818'), edge: C('#120208') },
  wine: { f: hex(['#22061c', '#34082a', '#4a0c3a', '#5e1248', '#741a58', '#8a2468', '#a03478', '#8a2468', '#741a58', '#5e1248', '#4a0c3a', '#34082a']), trim: C('#f0c860'), trim2: C('#a08030'), edge: C('#12020c') },
  lamina: { f: hex(['#2a2a3a', '#4a4a60', '#8a8aa8', '#c8c8e0', '#f0f0ff', '#c8c8e0', '#ff4fa0', '#c8c8e0', '#8a8aa8', '#4a4a60', '#2a2a3a', '#1a1a26']), trim: C('#ff4fa0'), trim2: C('#7a1a50'), edge: C('#0c0c14') },
};
const LED = { off: C('#070b14'), d1: C('#0e1828'), d2: C('#1a3050'), d3: C('#2a7ab0'), hi: C('#4ff0ff'), pink: C('#ff4fa0'), top: C('#0a1020') };

/** Largura (px do buffer) de cada painel da cortina com abertura `open` (0 = fechada, 1 = aberta). */
export function panelW31(W: number, open: number): number {
  const half = Math.ceil(W / 2);
  return Math.max(0, Math.min(half, Math.round((half * (1 - Math.max(0, Math.min(1, open)))) / U) * U));
}

/** Cortina de palco do material da época. `t` (ms) anima o LED. */
export function paintCurtain31(p: Px, mat: Curtain31, open: number, t = 0): void {
  const W = p.w, H = p.h;
  const pw = panelW31(W, open);
  if (mat === 'led') {
    ledPanel(p, 0, pw, t, false);
    ledPanel(p, W - pw, pw, t, true);
    // faixa de cima (moldura do painel) sobe junto quando abre
    const up = Math.round(Math.max(0, (open - 0.55) / 0.45) * 12 * U);
    p.rect(0, -up, W, 8 * U, LED.top);
    for (let x = 0; x < W; x += 2 * U) p.rect(x + 1, 3 * U - up, U, U, x % (8 * U) === 0 ? LED.pink : LED.hi);
    p.rect(0, 8 * U - up, W, U, LED.hi);
    return;
  }
  const m = MAT31[mat];
  for (const side of [0, 1])
    for (let x = 0; x < pw; x += U) {
      const ph = ((x / U) | 0) % 12;
      const X = side ? W - x - U : x;
      p.rect(X, 0, U, H, m.f[ph]);
      // franja embaixo: galão e borlas alternadas
      p.rect(X, H - 4 * U, U, 2 * U, m.trim);
      if (((x / U) | 0) % 2 === 0) p.rect(X, H - 2 * U, U, 2 * U, m.trim2);
      // brilho do veludo (ou o filete de neon da lâmina) em pontilhado
      if (ph === 6) for (let y = 2 * U; y < H - 6 * U; y += 4 * U) p.rect(X, y, U, U, m.f[7]);
    }
  // borda interna escura (onde as duas metades se encontram)
  if (pw > 0) { p.rect(pw - U, 0, U, H, m.edge); p.rect(W - pw, 0, U, H, m.edge); }
  // sanefa recortada com galão (sobe no fim da abertura)
  const up = Math.round(Math.max(0, (open - 0.6) / 0.4) * 20 * U);
  const band = [m.f[2], m.f[3], m.f[5], m.f[6], m.f[5], m.f[3], m.f[2], m.f[1]];
  for (let x = 0; x < W; x += U) {
    const c = band[((x / U) | 0) % 8];
    const sc = Math.round(Math.abs(Math.sin(((x / U) * Math.PI) / 12)) * 3) * U;
    const hh = 15 * U + sc - up;
    if (hh > 0) p.rect(x, 0, U, hh, c);
    if (hh > -U) p.rect(x, Math.max(0, hh), U, U, m.trim);
    if (hh > -2 * U) p.rect(x, Math.max(0, hh + U), U, U, m.trim2);
  }
  if (up < 3 * U) { p.rect(0, 0 - up, W, 2 * U, m.trim2); p.rect(0, 2 * U - up, W, U, m.trim); }
}

function ledPanel(p: Px, x0: number, w: number, t: number, flip: boolean): void {
  const H = p.h;
  for (let x = 0; x < w; x += U)
    for (let y = 0; y < H; y += U) {
      const X = flip ? x0 + w - x - U : x0 + x;
      const on = ((X / U) | 0) % 2 === 0 && ((y / U) | 0) % 2 === 0;
      let c = LED.off;
      if (on) {
        const k = (Math.sin((X + y * 0.7) / 30 - t / 160) + 1) / 2;
        c = k > 0.7 ? LED.hi : k > 0.45 ? LED.d3 : k > 0.25 ? LED.d2 : LED.d1;
        if ((((X / U) | 0) * 7919 + ((y / U) | 0) * 104729) % 211 === 0) c = LED.pink;
      }
      p.rect(X, y, U, U, c);
    }
  if (w > 0) p.rect(flip ? x0 : x0 + w - U, 0, U, H, LED.hi);
}

// ---------------------------------------------------------------- cartão do destino

export interface Box31 { x: number; y: number; w: number; h: number }
/** Cartão no centro da tela (px do buffer). */
export function cardBox31(W: number, H: number): Box31 {
  const w = Math.min(200, W - 16), h = 78;
  return { x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w, h };
}
/** Caixa do ícone dentro do cartão. */
export const cardIconBox31 = (b: Box31): Box31 => ({ x: b.x + 10, y: b.y + Math.round((b.h - 44) / 2), w: 44, h: 44 });

const SHADOW = C('#000000', 128);
const PANEL = C('#101a2a'), PANEL_LED = C('#06101c'), ICONBG = C('#1c3048');

/** Ícone de cada lugar: os ícones de viagem da onda 5 (exp5px.travel5Px, os mesmos dos botões Sede/Casa/Cidade/Mundo). */
export function placeIcon31(pl: TrnPlace31): Px {
  return travel5Px(pl, 'lit');
}
export function vehicleIcon31(v: Vehicle31): Px { return iconPx(v === 'bus' ? 'tour-bus' : v); }

function frame(p: Px, b: Box31, edge: Col, fill: Col): void {
  p.rect(b.x + 3, b.y + 3, b.w, b.h, SHADOW);
  p.rect(b.x, b.y, b.w, b.h, K);
  p.rect(b.x + 1, b.y + 1, b.w - 2, b.h - 2, edge);
  p.rect(b.x + 3, b.y + 3, b.w - 6, b.h - 6, fill);
}
/** Moldura do cartão com o ícone do destino (o texto vai por cima, em HTML). */
export function paintCard31(p: Px, b: Box31, mat: Curtain31, icon: Px): void {
  frame(p, b, C(mat === 'led' ? '#4ff0ff' : mat === 'lamina' ? '#ff4fa0' : '#f0c060'), mat === 'led' ? PANEL_LED : PANEL);
  const ib = cardIconBox31(b);
  p.rect(ib.x, ib.y, ib.w, ib.h, ICONBG);
  blitScaled(p, icon, ib.x + Math.round((ib.w - icon.w * 2) / 2), ib.y + Math.round((ib.h - icon.h * 2) / 2), 2);
}

/** Copia ampliando por inteiro (vizinho mais próximo). */
export function blitScaled(p: Px, src: Px, dx: number, dy: number, k: number, flip = false): void {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const c = src.d[y * src.w + (flip ? src.w - 1 - x : x)];
      if (c) p.rect(dx + x * k, dy + y * k, k, k, c);
    }
}

// ---------------------------------------------------------------- passagem

export function ticketBox31(W: number, H: number): Box31 {
  const w = Math.min(214, W - 16), h = 84;
  return { x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w, h };
}
const PAPER = C('#f4ecd8'), PAPER2 = C('#b0a488'), BLUE = C('#2a5ad0'), STAMP = C('#c0392b');
/** Passagem: faixa azul, serrilha, meio de transporte e carimbo "EMBARQUE". */
export function paintTicket31(p: Px, b: Box31, vehicle: Vehicle31, stamp: string): void {
  frame(p, b, PAPER, PAPER);
  p.rect(b.x + 1, b.y + 1, b.w - 2, 15, BLUE);
  const cut = b.x + Math.round(b.w * 0.73);
  for (let y = b.y + 20; y < b.y + b.h - 4; y += 5) p.rect(cut, y, 1, 3, PAPER2);
  const ic = vehicleIcon31(vehicle);
  const k = 3, iw = ic.w * k;
  blitScaled(p, ic, cut + Math.round((b.x + b.w - cut - iw) / 2), b.y + 24, k);
  // carimbo (texto da fonte do jogo, caixa vazada, levemente torto: a 2ª metade desce 1 px)
  const tw = textWidth(stamp, 1);
  const sx = cut - tw - 14, sy = b.y + b.h - 18;
  const sw = tw + 8, sh = 11;
  for (let x = 0; x < sw; x++) { const dy = x > sw / 2 ? 1 : 0; p.put(sx + x, sy + dy, STAMP); p.put(sx + x, sy + sh + dy, STAMP); }
  p.rect(sx, sy, 1, sh, STAMP); p.rect(sx + sw - 1, sy + 1, 1, sh, STAMP);
  drawText(p, stamp, sx + 4, sy + 3, STAMP, 1);
}

// ---------------------------------------------------------------- rota no mapa

/** Rota tracejada até `prog` (0–1) e o veículo na ponta. Coordenadas em px do buffer. */
export function paintRoute31(p: Px, a: [number, number], b: [number, number], prog: number, vehicle: Vehicle31): void {
  const gold = C('#f0c060'), dark = C('#1a1214');
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
  const lift = Math.min(40, n * 0.18); // arco suave
  const at = (s: number): [number, number] => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s - Math.sin(Math.PI * s) * lift];
  const end = Math.max(0, Math.min(1, prog));
  for (let i = 0; i <= n * end; i++) {
    if (((i / 4) | 0) % 2) continue;
    const [x, y] = at(i / n);
    p.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, dark);
  }
  for (let i = 0; i <= n * end; i++) {
    if (((i / 4) | 0) % 2) continue;
    const [x, y] = at(i / n);
    p.rect(Math.round(x), Math.round(y), 1, 1, gold);
  }
  for (const [x, y] of [a, b]) { p.disc(x, y, 3, dark); p.disc(x, y, 2, gold); }
  const [hx, hy] = at(end);
  const ic = vehicleIcon31(vehicle);
  blitScaled(p, ic, Math.round(hx - ic.w), Math.round(hy - ic.h - 2), 2, b[0] < a[0]);
}

// ---------------------------------------------------------------- calendário da virada

export function calBox31(cal: Cal31, W: number, H: number): Box31 {
  const [w, h] = cal === 'wall' ? [128, 148] : cal === 'flip' ? [156, 92] : [84, 150];
  const y = Math.max(6, Math.round((H - h) / 2) - 24);
  return { x: Math.round((W - w) / 2), y, w, h };
}
export interface CalFace31 { mon: string; year: string }
/** Calendário no estado `fall` (0 = mês velho inteiro, 1 = mês novo). */
export function paintCalendar31(p: Px, cal: Cal31, b: Box31, old: CalFace31, now: CalFace31, fall: number): void {
  if (cal === 'wall') return wall(p, b, old, now, fall);
  if (cal === 'flip') return flip(p, b, old, now, fall);
  return phone(p, b, old, now, fall);
}

const RED = C('#c0392b'), DAY = C('#e4dac2'), DAY_ON = C('#f0c060'), INKT = C('#3a3040');
function wallSheet(b: Box31, f: CalFace31): Px {
  const q = new Px(b.w, b.h);
  q.rect(0, 0, b.w, b.h, K);
  q.rect(1, 1, b.w - 2, b.h - 2, PAPER);
  q.rect(1, 1, b.w - 2, 36, RED);
  const mw = textWidth(f.mon, 3);
  drawText(q, f.mon, Math.round((b.w - mw) / 2), 8, PAPER, 3);
  const yw = textWidth(f.year, 1);
  drawText(q, f.year, Math.round((b.w - yw) / 2), 28, PAPER, 1);
  for (let i = 0; i < 30; i++) {
    const cx = 9 + (i % 7) * 16, cy = 44 + ((i / 7) | 0) * 20;
    if (cx + 13 > b.w - 4 || cy + 16 > b.h - 4) continue;
    q.rect(cx, cy, 13, 16, i === 0 ? DAY_ON : DAY);
    drawText(q, String(i + 1), cx + 1, cy + 1, INKT, 1);
  }
  return q;
}
function wall(p: Px, b: Box31, old: CalFace31, now: CalFace31, fall: number): void {
  p.rect(b.x + 4, b.y + 4, b.w, b.h, SHADOW);
  p.blit(wallSheet(b, now), b.x, b.y);
  if (fall < 1) {
    // a folha velha cai: desce acelerando e entorta (cada linha anda um pouco para o lado)
    const sh = wallSheet(b, old);
    const e = fall * fall;
    const dy = Math.round(e * (p.h - b.y + 10));
    for (let y = 0; y < sh.h; y++) {
      const dx = Math.round(e * (y - sh.h / 2) * 0.35 + e * 18);
      for (let x = 0; x < sh.w; x++) { const c = sh.d[y * sh.w + x]; if (c) p.set(b.x + x + dx, b.y + y + dy, c); }
    }
  }
  // argolas de cima (presas na parede, não caem)
  for (const rx of [b.x + 22, b.x + b.w - 30]) { p.rect(rx, b.y - 6, 7, 13, K); p.rect(rx + 2, b.y - 5, 3, 11, C('#a0a0b0')); }
}

const FLAP = C('#1c1c22'), FLAP2 = C('#2a2a32'), BODY = C('#3a3a44'), BODY2 = C('#56566a'), WHITE = C('#f0f0f0');
function flapFace(w: number, h: number, txt: string): Px {
  const q = new Px(w, h);
  q.rect(0, 0, w, h, FLAP);
  q.rect(0, 0, w, Math.floor(h / 2), FLAP2);
  const tw = textWidth(txt, 3);
  drawText(q, txt, Math.round((w - tw) / 2), Math.round((h - 15) / 2), WHITE, 3);
  q.rect(0, Math.floor(h / 2), w, 1, K);
  return q;
}
/** Relógio de virar: duas plaquetas (mês e ano); a de cima tomba e mostra a nova. */
function flip(p: Px, b: Box31, old: CalFace31, now: CalFace31, fall: number): void {
  p.rect(b.x + 4, b.y + 4, b.w, b.h, SHADOW);
  p.rect(b.x, b.y, b.w, b.h, K);
  p.rect(b.x + 1, b.y + 1, b.w - 2, b.h - 2, BODY);
  p.rect(b.x + 1, b.y + 1, b.w - 2, 3, BODY2);
  const fw = Math.round((b.w - 18) / 2), fh = b.h - 22;
  const cells: [number, string, string][] = [[b.x + 6, old.mon, now.mon], [b.x + 12 + fw, old.year, now.year]];
  for (const [x, o, n] of cells) {
    const y = b.y + 11;
    const A = flapFace(fw, fh, o), B = flapFace(fw, fh, n);
    const half = Math.floor(fh / 2);
    // metade de cima: já é a nova; metade de baixo: ainda a velha até a plaqueta cair
    copyRows(p, B, x, y, 0, half, half);
    copyRows(p, fall >= 1 ? B : A, x, y + half, half, fh, fh - half);
    if (fall < 0.5) {
      // a plaqueta velha de cima tomba (encolhe para a dobra)
      const k = 1 - fall * 2;
      const hh = Math.max(1, Math.round(half * k));
      copyRows(p, A, x, y + half - hh, 0, half, hh);
    } else {
      // a nova de baixo desce da dobra
      const k = (fall - 0.5) * 2;
      const hh = Math.max(1, Math.round((fh - half) * k));
      copyRows(p, B, x, y + half, half, fh, hh);
    }
    p.rect(x - 1, y + half, fw + 2, 1, K);
    p.rect(x - 2, y + half - 1, 2, 3, BODY2); p.rect(x + fw, y + half - 1, 2, 3, BODY2);
  }
}
/** Copia as linhas [s0, s1) de `src` para `h` linhas a partir de (x, y), amostrando (achatamento vertical). */
function copyRows(p: Px, src: Px, x: number, y: number, s0: number, s1: number, h: number): void {
  for (let j = 0; j < h; j++) {
    const sy = s0 + Math.min(s1 - s0 - 1, Math.floor(((j + 0.5) * (s1 - s0)) / Math.max(1, h)));
    for (let i = 0; i < src.w; i++) { const c = src.d[sy * src.w + i]; if (c) p.set(x + i, y + j, c); }
  }
}

const PH_BODY = C('#1a1a20'), PH_EDGE = C('#4a4a58'), SCR0 = C('#0e1a30'), SCR1 = C('#1c3a6a'), CYAN = C('#4ff0ff');
function phoneScreen(w: number, h: number, f: CalFace31): Px {
  const q = new Px(w, h);
  for (let y = 0; y < h; y++) q.rect(0, y, w, 1, y < h * 0.5 ? SCR1 : SCR0);
  const mw = textWidth(f.mon, 3);
  drawText(q, f.mon, Math.round((w - mw) / 2), Math.round(h * 0.28), WHITE, 3);
  const yw = textWidth(f.year, 2);
  drawText(q, f.year, Math.round((w - yw) / 2), Math.round(h * 0.28) + 20, CYAN, 2);
  return q;
}
/** Celular: a tela do mês velho sobe e sai; a do novo entra por baixo. */
function phone(p: Px, b: Box31, old: CalFace31, now: CalFace31, fall: number): void {
  p.rect(b.x + 4, b.y + 4, b.w, b.h, SHADOW);
  p.rect(b.x + 2, b.y, b.w - 4, b.h, K); p.rect(b.x, b.y + 2, b.w, b.h - 4, K);
  p.rect(b.x + 2, b.y + 1, b.w - 4, b.h - 2, PH_EDGE);
  p.rect(b.x + 3, b.y + 2, b.w - 6, b.h - 4, PH_BODY);
  const sx = b.x + 6, sy = b.y + 14, sw = b.w - 12, sh = b.h - 28;
  const A = phoneScreen(sw, sh, old), B = phoneScreen(sw, sh, now);
  const e = fall * fall * (3 - 2 * fall);
  const off = Math.round(e * sh);
  for (let y = 0; y < sh; y++) {
    const src = y + off < sh ? A : B;
    const yy = y + off < sh ? y + off : y + off - sh;
    for (let x = 0; x < sw; x++) p.put(sx + x, sy + y, src.d[yy * sw + x]);
  }
  // barra de status e alto-falante
  p.rect(sx, sy, sw, 4, C('#000000', 140));
  drawText(p, '5G', sx + 2, sy - 1 + 0, WHITE, 1);
  p.rect(b.x + Math.round(b.w / 2) - 8, b.y + 6, 16, 2, PH_EDGE);
  p.rect(b.x + Math.round(b.w / 2) - 6, b.y + b.h - 10, 12, 3, PH_EDGE);
}
