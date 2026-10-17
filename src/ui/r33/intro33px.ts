// R33 · INTRO33 — a RUA QUE ATRAVESSA AS ÉPOCAS, desenhada só com a arte do jogo (Px, INK via inked, luz de cima à
// esquerda, rampas lv, paleta pelas 6 faixas ep5Of). Uma rua só, de 1889 a 2035: andar para a direita é avançar no
// tempo, e uma onda de som de luz (dourado → laranja → rosa → roxo → ciano) atravessa tudo e puxa a câmera.
//
// Este módulo é PURO (só Px e sprites, testável no node): `buildWorld33` desenha uma vez a faixa de mundo (os 7 trechos
// em cortes isométricos: piso em losango, duas paredes de fundo, adereços em caixas) e `frame33` monta cada quadro
// (céu e horizonte em paralaxe, mundo, janelas acendendo, gente andando, carros, luz dos postes, onda). Quem põe isso
// no canvas, no tempo e na tela é `intro33.ts`. Nada aqui lê ou muda a partida.

import { C, INK, Px, dith, discV, inked, lv, mix, noise, withAlpha, type Col } from '../pixel/px';
import { ep5Of } from '../pixel/exp5px';
import { avatarSprite, crowdLook27, type Dir, type Pose } from '../pixel/avatar';
import { crowd31, drumKit31 } from '../pixel/stage31px';
import { drawText, textWidth } from '../pixel/font';
import { holoRgb5 } from '../pixel/holo5col';
import type { Appearance } from '../../sim/types';

// ---------------------------------------------------------------- medidas do mundo (pixels lógicos)

/** Lado do piso do corte (losango de 2L × L), altura da parede, do telhado e espessura da laje. */
export const L33 = 40, HW33 = 54, ROOF33 = 11, SLAB33 = 6;
/** Escala dos cortes sobre o desenho-base (piso de 32): posições dos adereços e das janelas crescem, os adereços não. */
const K33 = L33 / 32;
/** Canto de trás do piso (y) e linhas da rua, no mundo. */
export const YB33 = 112;
/** Horizonte do gramado (de onde começa o chão atrás dos cortes). */
const Y_HOR = YB33 - 30;
const Y_TIP = YB33 + L33; // ponta da frente do piso
const Y_SW1 = Y_TIP + SLAB33; // calçada de cima começa
const Y_RD0 = Y_SW1 + 10; // pista
const Y_RD1 = Y_RD0 + 27;
const Y_SW2 = Y_RD1 + 8;
const Y_EMB = Y_SW2 + 9; // paredão do rio
export const WH33 = YB33 + 156;
/** Linha do telhado (topo dos trechos) no mundo: o que fica acima disso é enfeite. */
export const ROOFLINE33 = YB33 - HW33 - ROOF33;
/** Pitch entre trechos e margens (o rio e a ponte moram nas margens). */
export const PITCH33 = 150, MARGIN33 = 400;
export const WW33 = MARGIN33 * 2 + PITCH33 * 6;
/** Onde a onda e os pés da gente andando ficam. */
const Y_WAVE = Y_TIP + 12;
export const Y_WALK = Y_SW1 + 9;
const Y_CAR1 = Y_RD0 + 15, Y_CAR2 = Y_RD0 + 26;

export interface Stop33 { year: number; id: string; cx: number }
const YEARS: [number, string][] = [[1889, 'sobrado'], [1920, 'radio'], [1950, 'discos'], [1965, 'fita'], [1975, 'palco'], [1995, 'digital'], [2035, 'vidro']];
export const STOPS33: Stop33[] = YEARS.map(([year, id], i) => ({ year, id, cx: MARGIN33 + i * PITCH33 }));
/** Dourado → laranja → rosa → roxo → ciano, um por trecho. */
export const WAVE33 = ['#ffd060', '#ffa83c', '#ff8a48', '#ff5a8c', '#ff44c4', '#9a62ff', '#44e8ff'].map((h) => C(h));
/** Ano de uma posição x do mundo (interpola entre os trechos). */
export function yearAt33(x: number): number {
  const f = Math.max(0, Math.min(6, (x - MARGIN33) / PITCH33)), i = Math.min(5, Math.floor(f));
  return Math.round(STOPS33[i].year + (STOPS33[i + 1].year - STOPS33[i].year) * (f - i));
}
/** Cor da onda numa posição x do mundo. */
export function waveColAt33(x: number): Col {
  const f = Math.max(0, Math.min(6, (x - MARGIN33) / PITCH33)), i = Math.min(5, Math.floor(f));
  return mix(WAVE33[i], WAVE33[i + 1], f - i);
}

// ---------------------------------------------------------------- utilidades de desenho

const put = (p: Px, x: number, y: number, c: Col) => p.put(x, y, c);
const half = (n: number) => Math.floor(n / 2);
/** Ponto do piso (gx, gy) do corte com canto de trás em (cx, yB). */
const fx = (cx: number, gx: number, gy: number) => cx + gx - gy;
const fy = (yB: number, gx: number, gy: number, z = 0) => yB + (gx + gy) / 2 - z;

/** Janela que acende quando a onda passa: caixa no mundo + a camada acesa (mesmo lugar). */
export interface Win33 { x: number; y: number; w: number; h: number; stop: number; k: number }
export interface Lamp33 { x: number; y: number; kind: 'gas' | 'elec' | 'led'; col: Col }
export interface Walker33 { stop: number; x0: number; x1: number; speed: number; ph: number; seed: string; pose: 'walk' | 'stand'; y: number; /** casal conversando: não anda */ }
export interface Car33 { stop: number; lane: 1 | 2; x0: number; x1: number; speed: number; ph: number; kind: number }
export interface Fixed33 { x: number; y: number; look: Appearance; role: string | null; pose: Pose; dir: Dir; year: number; holo?: boolean }
export interface World33 {
  W: number; H: number;
  /** arte fixa, opaca onde há desenho */
  base: Px;
  /** só as janelas acesas, no mesmo lugar */
  lit: Px;
  /** camada que se mexe com a plateia do palco (1975) */
  crowd: [Px, Px];
  crowdBox: [number, number, number, number];
  windows: Win33[];
  lamps: Lamp33[];
  walkers: Walker33[];
  cars: Car33[];
  fixed: Fixed33[];
  /** quantos hologramas o mundo tem (sempre 1) */
  holos: number;
  /** reflexos na água (x) */
  glints: number[];
  /** bicos de gás da ribalta de 1889 */
  gas: [number, number][];
  /** luzes do palco: (x, y) do refletor e cor */
  spots: [number, number, Col][];
  /** cones de luz de abajur (x, y, comprimento, cor) */
  cones: [number, number, number, Col][];
  /** carretéis da fita, telas, luzes pulsantes */
  reels: [number, number][];
  screens: [number, number, number, number, number][];
  tower: [number, number];
  holo: { x: number; y: number };
  /** topo do que importa (para o título não cobrir): linha do telhado */
  roofline: number;
  /** easter eggs: gatos nos telhados (x, y), pombos pousados (x, y), violonista de rua (x) */
  eggs: { cats: [number, number][]; pigeons: [number, number][]; busker: number };
}

// ---------------------------------------------------------------- o corte isométrico (piso + duas paredes de fundo)

type Side = 'R' | 'L';
/** Um corte: piso em losango com o canto de trás em (cx, yB); parede R (plano gy=0, a que pega a luz) e L (plano gx=0). */
class Cut {
  constructor(readonly p: Px, readonly cx: number, readonly yB: number, readonly lit: Px, readonly wins: Win33[], readonly stop: number) {}
  /** pixel do ponto da parede em px reais (u ao longo da parede, v de altura) */
  wpRaw(side: Side, u: number, v: number): [number, number] { return [side === 'R' ? this.cx + u : this.cx - u, this.yB + half(u) - v]; }
  /** pixel do ponto (u, v) em unidades do desenho-base (escalam com o corte) */
  wp(side: Side, u: number, v: number): [number, number] { return this.wpRaw(side, Math.round(u * K33), Math.round(v * K33)); }
  /** preenche um retângulo na parede, tudo em unidades-base (escala com o corte); fn(i, j) recebe a coluna i (para fora do canto) e a linha j contada de cima (0) nas unidades-base */
  wall(side: Side, u: number, v: number, w: number, h: number, fn: (i: number, j: number) => Col | 0, dst: Px = this.p): void {
    const ub = Math.round(u * K33), vb = Math.round(v * K33), W = Math.round(w * K33), Hh = Math.round(h * K33);
    for (let i = 0; i < W; i++) for (let j = 0; j < Hh; j++) {
      const c = fn(Math.min(w - 1, Math.floor(i / K33)), Math.min(h - 1, Math.floor(j / K33)));
      if (!c) continue;
      const [x, y] = this.wpRaw(side, ub + i, vb + Hh - 1 - j);
      dst.put(x, y, c);
    }
  }
  /** caixa isométrica com o canto de trás no ponto do piso (gx, gy) (unidades-base); tamanho em px */
  box(gx: number, gy: number, w: number, d: number, h: number, base: Col, o: { top?: Col; tex?: { top?: (u: number, v: number) => Col; left?: (u: number, v: number) => Col; right?: (u: number, v: number) => Col }; edge?: boolean } = {}, z = 0): void {
    const sc = (f?: (u: number, v: number) => Col) => (f ? (u: number, v: number) => f(u / K33, v / K33) : undefined);
    const tex = o.tex ? { top: sc(o.tex.top), left: sc(o.tex.left), right: sc(o.tex.right) } : undefined;
    this.p.sbox(fx(this.cx, gx * K33, gy * K33), fy(this.yB, gx * K33, gy * K33, z * K33), w * K33, d * K33, h * K33, base, { ...o, tex });
  }
  /** ponto do piso → pixel */
  fp(gx: number, gy: number, z = 0): [number, number] { return [Math.round(fx(this.cx, gx * K33, gy * K33)), Math.round(fy(this.yB, gx * K33, gy * K33, z * K33))]; }
  /** retângulo no piso (tapete, faixa) em unidades-base: fn(gx, gy) relativo, em unidades-base */
  floorRect(gx0: number, gy0: number, gw: number, gd: number, fn: (gx: number, gy: number) => Col | 0): void {
    for (let y = this.yB; y <= this.yB + L33; y++) for (let x = this.cx - L33; x <= this.cx + L33; x++) {
      const X = x + 0.5 - this.cx, Y = y + 0.5 - this.yB, gx = (Y + X / 2) / K33, gy = (Y - X / 2) / K33;
      if (gx < gx0 || gx >= gx0 + gw || gy < gy0 || gy >= gy0 + gd) continue;
      const c = fn(gx - gx0, gy - gy0);
      if (c) this.p.put(x, y, c);
    }
  }
  /** janela na parede (moldura + vidro); a versão acesa vai para a camada `lit` */
  window(side: Side, u: number, v: number, w: number, h: number, frame: Col, glassOff: Col, glassOn: Col, cross = true): void {
    const ub = Math.round(u * K33), vb = Math.round(v * K33), wS = Math.round(w * K33), hS = Math.round(h * K33);
    const x0 = side === 'R' ? this.cx + ub : this.cx - ub - wS + 1, ya = this.yB + half(side === 'R' ? ub : ub + wS - 1) - vb - hS, yb = this.yB + half(side === 'R' ? ub + wS : ub) - vb;
    for (let i = 0; i < wS; i++) for (let j = 0; j < hS; j++) {
      const edge = i === 0 || j === 0 || i === wS - 1 || j === hS - 1, [x, y] = this.wpRaw(side, ub + i, vb + hS - 1 - j);
      if (edge) { this.p.put(x, y, j === 0 || i === 0 ? lv(frame, 4) : lv(frame, 2)); continue; }
      if (cross && (i === half(wS) || j === half(hS))) { this.p.put(x, y, lv(frame, 3)); continue; }
      this.p.put(x, y, mix(glassOff, lv(glassOff, 4), (hS - j) / hS * 0.7));
      this.lit.put(x, y, mix(lv(glassOn, 5), glassOn, j / hS));
    }
    this.wins.push({ x: x0, y: ya, w: wS, h: yb - ya + 1, stop: this.stop, k: this.wins.length });
  }
}

interface RoomSpec {
  wallR: (u: number, v: number) => Col;
  wallL: (u: number, v: number) => Col;
  floor: (gx: number, gy: number) => Col;
  slab: Col; trim: Col; pil: Col; roof: Col;
  roofKind: 'slate' | 'brick' | 'flat' | 'truss' | 'glass';
}

/** Piso, laje, paredes, pilares e telhado do corte. Sem os adereços. */
function roomBase(c: Cut, s: RoomSpec): void {
  const { p, cx, yB } = c;
  // piso
  for (let y = yB; y <= yB + L33; y++) for (let x = cx - L33; x <= cx + L33; x++) {
    const X = x + 0.5 - cx, Y = y + 0.5 - yB, gx = Y + X / 2, gy = Y - X / 2;
    if (gx >= 0 && gx < L33 && gy >= 0 && gy < L33) put(p, x, y, s.floor(gx, gy));
  }
  // laje: duas faces sob a frente do piso (esquerda na luz, direita na sombra) com aresta de cima clara
  for (let i = 0; i < L33; i++) {
    const xl = cx - L33 + i, yl = yB + L33 / 2 + half(i), xr = cx + i, yr = yB + L33 - half(i);
    for (let k = 0; k < SLAB33; k++) {
      put(p, xl, yl + k, k === 0 ? lv(s.slab, 4.2) : k === SLAB33 - 1 ? lv(s.slab, 1.6) : s.slab);
      put(p, xr, yr + k, k === 0 ? lv(s.slab, 2.8) : k === SLAB33 - 1 ? lv(s.slab, 1) : lv(s.slab, 2.2));
    }
  }
  // paredes de fundo
  const wall = (side: Side, tex: (u: number, v: number) => Col) => {
    for (let u = 0; u < L33; u++) {
      const x = side === 'R' ? cx + u : cx - u, yb = yB + half(u);
      for (let v = 0; v < HW33; v++) {
        let col = tex(u, v);
        if (v >= HW33 - 2) col = lv(s.trim, v === HW33 - 1 ? 4.6 : 3.4);
        else if (v < 3) col = lv(col, v === 0 ? 1 : 2);
        put(p, x, yb - v, col);
      }
    }
  };
  wall('L', s.wallL); wall('R', s.wallR);
  for (let v = 0; v < HW33; v++) put(p, cx, yB - v, lv(s.trim, v === HW33 - 1 ? 4.6 : 1.8)); // quina do fundo
  // pilares das pontas da frente
  const pilar = (x0: number, side: Side) => {
    const yb = yB + half(L33);
    for (let k = 0; k < 3; k++) for (let v = -1; v < HW33; v++) {
      const col = v === HW33 - 1 ? lv(s.pil, 4.6) : side === 'L' ? (k === 0 ? lv(s.pil, 3.6) : lv(s.pil, 2.6)) : (k === 2 ? lv(s.pil, 1.8) : lv(s.pil, 2.4));
      put(p, x0 + (side === 'L' ? -1 - k : k), yb - v + k * (side === 'L' ? -0 : 0), (v + k) % 7 === 3 ? lv(col, 1.6) : col);
    }
  };
  pilar(cx - L33, 'L'); pilar(cx + L33, 'R');
  // telhado
  const roofBand = (side: Side) => {
    for (let u = 0; u < L33 + 3; u++) {
      const x = side === 'R' ? cx + u : cx - u, top = yB + half(Math.min(u, L33)) - HW33;
      for (let k = 1; k <= ROOF33; k++) {
        let col: Col;
        switch (s.roofKind) {
          case 'slate': col = k === ROOF33 ? lv(s.roof, 4.4) : (k + (side === 'R' ? half(u) : -half(u)) + 40) % 3 === 0 ? lv(s.roof, 1.8) : (u + k * 2) % 6 === 0 ? lv(s.roof, 2.2) : lv(s.roof, side === 'R' ? 3.1 : 2.4); break;
          case 'brick': col = k === ROOF33 ? lv(s.roof, 4.4) : k <= 2 ? lv(s.roof, 2) : (u + (k % 2) * 4) % 8 === 0 ? lv(s.roof, 1.8) : lv(s.roof, side === 'R' ? 3.2 : 2.6); break;
          case 'truss': col = k === ROOF33 || k === 1 ? lv(C('#8a8e98'), 3.6) : (k === 4 ? lv(C('#8a8e98'), 2.8) : (u + k) % 5 === 0 ? lv(C('#8a8e98'), 3.2) : 0); break;
          case 'glass': col = k === ROOF33 ? lv(C('#7ae8ff'), 4) : lv(C('#2a3a6a'), 2 + (k % 3) * 0.4); break;
          default: col = k === ROOF33 ? lv(s.roof, 4.4) : k === 1 ? lv(s.roof, 1.6) : lv(s.roof, side === 'R' ? 3 : 2.3);
        }
        if (col) put(p, x, top - k, col);
      }
    }
  };
  roofBand('L'); roofBand('R');
}

// ---------------------------------------------------------------- texturas

/** papel de parede com losangos: fundo, motivo, passo */
function paper(base: Col, motif: Col, step = 8, lit = 0): (u: number, v: number) => Col {
  return (u, v) => {
    const a = (u + (half(v / 1 | 0) % 2 ? step / 2 : 0)) % step, b = v % step;
    const dm = (a === 0 && b === 0) || (a === step / 2 && b === step / 2) ? 1 : 0;
    return dm ? motif : (u + v) % 11 === 0 ? lv(base, 3.4 + lit) : lv(base, 3 + lit);
  };
}
/** lambri embaixo (altura `wh`), papel em cima */
function wainscot(lower: Col, upper: (u: number, v: number) => Col, wh: number, lit = 0): (u: number, v: number) => Col {
  return (u, v) => {
    if (v < wh) {
      if (v === wh - 1) return lv(lower, 4.6);
      if (v === wh - 2) return lv(lower, 1.6);
      const panel = u % 10 === 0 || (v === 3 || v === wh - 4 ? 1 : 0);
      return panel ? lv(lower, 1.8) : lv(lower, 3 + lit - (v > wh / 2 ? 0 : 0.4));
    }
    return upper(u, v);
  };
}
const planks = (base: Col, alt = 0.5): ((gx: number, gy: number) => Col) => (gx, gy) => {
  const row = Math.floor(gy / 4), seam = Math.floor(gy) % 4 === 0;
  const off = (Math.floor(gx + (row % 2) * 7) % 14) === 0;
  return seam || off ? lv(base, 1.6) : lv(base, 3 + ((row + Math.floor(gx / 9)) % 2) * alt - 0.1);
};
const checker = (a: Col, b: Col, s = 4): ((gx: number, gy: number) => Col) => (gx, gy) => ((Math.floor(gx / s) + Math.floor(gy / s)) % 2 ? a : b);

// ---------------------------------------------------------------- peças pequenas

/** Texto na fonte do jogo, num Px pequeno (para letreiros que vão colados na parede). */
function textPx(txt: string, col: Col, back: Col, pad = 2): Px {
  const w = textWidth(txt) + pad * 2, p = new Px(w, 5 + pad * 2);
  p.rect(0, 0, w, p.h, back);
  drawText(p, txt, pad, pad, col);
  return p;
}
/** Letreiro luminoso de telhado: placa de frente para a rua (texto na fonte do jogo, sem acento) sobre duas pernas. */
function roofSign(q: Px, x: number, base: number, txt: string, col: Col, back: Col): number {
  const tp = textPx(txt, lv(col, 4.6), back, 2), w = tp.w + 2, h = tp.h + 2, x0 = x - half(w), y0 = base - 4 - h;
  q.vline(x0 + 2, base - 4, base, lv(metalC, 2.4)); q.vline(x0 + w - 3, base - 4, base, lv(metalC, 2));
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) q.put(x0 + i, y0 + j, i === 0 || j === 0 || i === w - 1 || j === h - 1 ? lv(col, j === 0 || i === 0 ? 4 : 2.4) : tp.get(i - 1, j - 1));
  return y0;
}
const metalC = C('#8a8e98'), brassC = C('#d8b048'), woodD = C('#4a2618');

/** Vaso com planta: terracota e folhas. */
function plant(p: Px, x: number, y: number, k = 1): void {
  const pot = C('#a85a38');
  for (let j = 0; j < 7; j++) for (let i = -4 + (j > 4 ? 1 : 0); i <= 4 - (j > 4 ? 1 : 0); i++) put(p, x + i, y - 7 + j, i < -2 ? lv(pot, 4) : i > 2 ? lv(pot, 2) : j === 0 ? lv(pot, 4.4) : pot);
  const leaf = C('#2f7a3c');
  for (let a = 0; a < 7; a++) {
    const ang = -Math.PI / 2 + (a - 3) * 0.42, len = (9 + (a % 3) * 3) * k;
    for (let s = 2; s < len; s++) { const lx = x + Math.cos(ang) * s * 0.7, ly = y - 7 + Math.sin(ang) * s; put(p, Math.round(lx), Math.round(ly), s > len - 3 ? lv(leaf, 4) : lv(leaf, 2.4 + (a % 2) * 0.8)); if (s > 3 && s < len - 2) put(p, Math.round(lx) + 1, Math.round(ly), lv(leaf, 3)); }
  }
}
/** Postes: a gás (haste de ferro e lampião), elétrico (braço curvo) e de LED (haste fina e cabeça reta). */
function lampPost(P: Px, x: number, y: number, kind: 'gas' | 'elec' | 'led'): void {
  inked(P, (q) => {
    const iron = kind === 'led' ? C('#8a96a8') : C('#2e3038'), H = kind === 'gas' ? 34 : 38;
    q.rect(x - 2, y - 3, 5, 3, lv(iron, 3)); q.rect(x - 1, y - 6, 3, 3, lv(iron, 2.6)); // base
    q.vline(x, y - H, y - 6, lv(iron, 3.4)); q.vline(x + 1, y - H, y - 6, lv(iron, 1.8));
    if (kind === 'gas') {
      q.rect(x - 3, y - H - 1, 7, 2, lv(iron, 3)); // pescoço
      for (let j = 0; j < 8; j++) for (let i = -3; i <= 3; i++) { const w = j < 2 ? 3 : 4 - (j > 5 ? (j - 5) : 0) ; if (Math.abs(i) <= w) put(q, x + i, y - H - 9 + j, i < -1 ? C('#ffe9a8') : i > 1 ? C('#e8b050') : C('#fff4c8')); }
      q.hline(x - 4, x + 4, y - H - 10, lv(iron, 3.6)); q.put(x, y - H - 11, lv(iron, 3.4)); q.vline(x - 4, y - H - 9, y - H - 2, lv(iron, 2.8)); q.vline(x + 4, y - H - 9, y - H - 2, lv(iron, 1.8)); // aro
    } else if (kind === 'elec') {
      for (let k = 0; k < 9; k++) q.put(x + 1 + k, y - H - Math.round(Math.sin((k / 8) * 1.4) * 4), lv(iron, 3.2)); // braço
      q.rect(x + 8, y - H - 4, 7, 3, lv(iron, 3)); q.hline(x + 9, x + 14, y - H - 1, C('#fff2c0'));
    } else {
      q.rect(x - 3, y - H - 2, 7, 2, lv(iron, 4)); q.hline(x - 3, x + 3, y - H, C('#d8f8ff')); q.rect(x - 2, y - H + 1, 5, 1, C('#9ae8ff'));
    }
  });
}

/** Casa do segundo plano (nas folgas entre os cortes): caixa isométrica da época, janelas escuras e algumas acesas, telhado. */
function backHouse(P: Px, x: number, y: number, w: number, d: number, h: number, ep: number, seed: number): void {
  const wallC = [C('#8a4630'), C('#8a5a3c'), C('#c8a898'), C('#8a8ea0'), C('#4a6a9a'), C('#5a4a9a')][ep], roofC = [C('#363c5a'), C('#5a3a30'), C('#4a4a5a'), C('#3a3a46'), C('#2a3a5a'), C('#3a2a6a')][ep];
  const warm = ep < 3 ? ['#ffd070', '#ffb040'] : ['#9af0ff', '#ffe0a0'], dark = lv(C('#16203a'), 2.4);
  const win = (f: number, u: number, v: number): Col => {
    const cu = Math.floor(u / 6), cv = Math.floor(v / 9), iu = u % 6, iv = v % 9;
    if (v < 5 || v > h - 6 || iu < 1 || iu > 3 || iv < 3 || iv > 7) return 0;
    const on = noise(cu, cv, seed + f) > 0.7;
    return on ? C(warm[(cu + cv) % 2]) : (iu === 1 || iv === 3 ? lv(C('#2a3a5a'), 3) : dark);
  };
  inked(P, (q) => {
    q.sbox(x, y, w, d, h, wallC, { tex: { left: (u, v) => win(0, Math.floor(u), Math.floor(v)), right: (u, v) => win(1, Math.floor(u), Math.floor(v)) } });
    q.sbox(x, y - 1 - h, w + 2, d + 2, 5, roofC, { top: lv(roofC, 3.4) }); // beiral: telhado um pouco maior, sobre o topo
    if (ep < 2) q.sbox(x + 3, y - h - 5, 3, 3, 8, C('#8a4630')); // chaminé
  });
}

/** Banco de praça visto de frente: assento e encosto de ripas, pés de ferro fundido, luz em cima à esquerda. */
function bench(P: Px, x: number, y: number): void {
  inked(P, (q) => {
    const wood = C('#8a5a30'), iron = C('#2e3038');
    for (const sx of [x - 8, x + 7]) { q.vline(sx, y - 9, y - 1, lv(iron, 3.2)); q.rect(sx - 1, y - 2, 3, 2, lv(iron, 2.6)); q.rect(sx - 1, y - 9, 3, 1, lv(iron, 4)); } // laterais de ferro
    for (let k = 0; k < 3; k++) q.hline(x - 7, x + 6, y - 9 + k * 2, lv(wood, k === 0 ? 4.4 : 3 - k * 0.2)); // encosto: 3 ripas
    q.hline(x - 7, x + 6, y - 4, lv(wood, 4.2)); q.hline(x - 7, x + 6, y - 3, lv(wood, 3)); q.hline(x - 7, x + 6, y - 2, lv(wood, 1.8)); // assento
  });
}
/** Árvore: tronco e copa de bolhas com luz em cima à esquerda (contorno INK). */
function tree(P: Px, x: number, y: number, s: number, seed: number, dead = false): void {
  inked(P, (q) => {
    const bark = C('#4a2e1c');
    q.rect(x - 1, y - 12 * s, 3, 12 * s, lv(bark, 2.6)); q.vline(x - 1, y - 12 * s, y - 1, lv(bark, 3.8));
    q.rect(x - 3, y - 2, 7, 2, lv(bark, 2));
    const leaf = C(dead ? '#3a4a3a' : '#2a6a38');
    const blobs: [number, number, number][] = [[0, -22, 9], [-7, -17, 7], [7, -17, 7], [-3, -27, 6], [4, -26, 6]];
    for (const [bx, by, r] of blobs) { const rr = Math.round(r * s); discV(q, x + Math.round(bx * s), y + Math.round(by * s), rr, mix(leaf, C('#1c4a3a'), noise(seed, bx, 2) * 0.5), { r: rr, spec: false }); }
  });
}

/** Chaminé de tijolo sobre o telhado. */
function chimney(c: Cut, gx: number, gy: number): void {
  c.box(gx, gy, 5, 5, 24, C('#8a4630'), { tex: { left: (u, v) => (v < 21 ? ((v % 3 === 0) || ((u + (Math.floor(v / 3) % 2) * 2) % 4 === 0) ? lv(C('#8a4630'), 1.8) : 0) : lv(C('#8a4630'), 4.2)), right: (u, v) => (v % 3 === 0 ? lv(C('#8a4630'), 1.2) : 0) } }, (HW33 - 3) / K33);
}

// ---------------------------------------------------------------- os 7 trechos

interface Acc33 {
  P: Px; lit: Px; wins: Win33[]; lang: 'pt' | 'en';
  gas: [number, number][]; spots: [number, number, Col][]; cones: [number, number, number, Col][]; reels: [number, number][]; screens: [number, number, number, number, number][];
  fixed: Fixed33[]; tower: [number, number]; holo: { x: number; y: number }; holos: number;
  crowd: [Px, Px]; crowdBox: [number, number, number, number];
}
/** tipos de painel animado em `screens` */
export const SCR33 = { eq: 0, jb: 1, vu: 2, mon: 3, led: 4 } as const;
const look = (seed: string, year: number): Appearance => crowdLook27(seed, year);
const cut = (a: Acc33, q: Px, cx: number, st: number) => new Cut(q, cx, YB33, a.lit, a.wins, st);

/** 1889 · sobrado com gramofone, piano e ribalta a gás. */
function room1889(a: Acc33, cx: number): void {
  const wood = C('#5a3420'), wine = C('#7a2e3c'), gold = C('#d8a848');
  const spec: RoomSpec = {
    wallR: wainscot(wood, paper(wine, gold, 8, 0.5), 13, 0.5), wallL: wainscot(wood, paper(wine, gold, 8, -0.2), 13, -0.1),
    floor: planks(C('#8a5a32')), slab: C('#4a3020'), trim: C('#e0c890'), pil: C('#8a4630'), roof: C('#363c5a'), roofKind: 'slate',
  };
  inked(a.P, (q) => { const c = cut(a, q, cx, 0); chimney(c, 6, 5); chimney(c, 22, 2); }); // atrás do telhado: os pés ficam escondidos
  inked(a.P, (q) => {
    const c = cut(a, q, cx, 0);
    roomBase(c, spec);
    c.floorRect(5, 6, 22, 20, (u, v) => (u < 1 || v < 1 || u > 20.2 || v > 18.2 ? lv(gold, 2.6) : (Math.floor(u) + Math.floor(v)) % 5 === 0 ? lv(C('#c04050'), 3.4) : lv(C('#9a2a34'), 3.1)));
    c.window('R', 22, 15, 8, 19, C('#e0c890'), C('#1c2a4a'), C('#ffc860'));
    // cortinas de veludo
    c.wall('R', 20, 15, 3, 22, (i, j) => (j < 21 ? lv(C('#a02a38'), 2.4 + (i % 2) * 0.8 + (j > 14 ? -0.4 : 0)) : 0));
    c.wall('R', 30, 15, 3, 22, (i, j) => (j < 21 ? lv(C('#a02a38'), 2 + (i % 2) * 0.8) : 0));
    c.window('L', 18, 15, 8, 19, C('#e0c890'), C('#1c2a4a'), C('#ffc860'));
    // retrato dourado na parede da esquerda
    c.wall('L', 5, 20, 10, 15, (i, j) => (i === 0 || j === 0 || i === 9 || j === 14 ? lv(gold, i === 0 || j === 0 ? 4.4 : 2.4) : i < 2 || j < 2 || i > 7 || j > 12 ? lv(gold, 3) : j < 6 ? (i > 3 && i < 6 ? lv(C('#e0b090'), 3.4) : lv(C('#3a2a2a'), 2)) : lv(C('#2a2a3a'), 2.4 + (i % 3 === 0 ? 0.6 : 0))));
  });
  // piano de armário na parede da luz
  inked(a.P, (q) => {
    const c = cut(a, q, cx, 0);
    c.box(5, 0.4, 18, 6, 22, woodD, {
      tex: {
        left: (u, v) => {
          if (v >= 9 && v <= 11) return u > 0.5 && u < 17.5 ? (v === 9 ? C('#c8c0a8') : (Math.floor(u) % 3 === 1 && v >= 10 ? C('#16161a') : C('#f4f0e4'))) : 0;
          if (v === 12) return lv(woodD, 4.4);
          if (v >= 14 && v <= 20 && u > 2 && u < 16) return u > 4 && u < 14 && v >= 15 && v <= 19 ? ((Math.floor(u * 1.5) + v) % 4 === 0 ? C('#2a2020') : C('#ece4cc')) : lv(woodD, 2);
          if (v < 3) return lv(woodD, 1.4);
          return 0;
        },
      },
    });
    // castiçais no tampo
    for (const g of [2, 15]) { const [x, y] = c.fp(5 + g + 1, 2, 22); put(q, x, y, brassC); put(q, x, y - 1, C('#f0ece0')); put(q, x, y - 2, C('#ffd860')); }
    c.box(11.5, 8.6, 6, 6, 8, C('#5a3420'), {}, 0);
    // gramofone numa mesinha, encostado na parede da sombra
    c.box(1, 20, 8, 8, 9, C('#7a4a2a'));
    c.box(1.6, 20.6, 6.8, 6.8, 4, C('#8a5a30'), {}, 9);
    const [gx, gy] = c.fp(5, 24, 14);
    q.disc(gx, gy + 1, 4, C('#1c1a20')); q.ellipse(gx, gy, 4, 2, C('#1c1a20')); put(q, gx, gy, C('#c03a2a'));
    q.line(gx + 3, gy, gx + 6, gy - 6, lv(brassC, 2.6));
    for (let i = 0; i < 14; i++) { const hx = gx + 6 - i, hy = gy - 6 - Math.round(i * 0.55), r = 1 + Math.round(i * 0.4); for (let k = -r; k <= r; k++) put(q, hx, hy + k, k < 0 ? lv(brassC, 4.2) : k > r - 1 ? lv(brassC, 2) : brassC); }
    for (let k = -6; k <= 6; k++) put(q, gx - 8, gy - 14 + k, lv(brassC, k < 0 ? 1.6 : 1.2));
    plant(q, c.fp(27, 4)[0], c.fp(27, 4)[1] + 1);
  });
  // pianista e a banqueta (sentado de costas, tocando)
  const c0 = new Cut(a.P, cx, YB33, a.lit, a.wins, 0), [px, py] = c0.fp(14.6, 11.6);
  a.fixed.push({ x: px, y: py - 2, look: look('piano', 1889), role: 'keys', pose: 'sitplay', dir: 'NE', year: 1889 });
  // ribalta a gás: trilho de latão e bicos na borda da frente do piso
  inked(a.P, (q) => {
    const c = cut(a, q, cx, 0);
    const [x0, y0] = c.fp(0, L33 - 0.4, 3), [x1, y1] = c.fp(L33 - 0.4, L33 - 0.4, 3), [x2, y2] = c.fp(L33 - 0.4, 0, 3);
    q.line(x0, y0, x1, y1, lv(brassC, 3)); q.line(x1, y1, x2, y2, lv(brassC, 2.2));
    for (let g = 2; g < L33 - 1; g += 5) { const [x, y] = c.fp(g, L33 - 0.4, 3); put(q, x, y - 1, lv(brassC, 4.4)); put(q, x, y - 2, lv(brassC, 2.4)); a.gas.push([x, y - 4]); }
    for (let g = L33 - 3; g > 1; g -= 5) { const [x, y] = c.fp(L33 - 0.4, g, 3); put(q, x, y - 1, lv(brassC, 3.4)); put(q, x, y - 2, lv(brassC, 2)); a.gas.push([x, y - 4]); }
  });
}

/** Disco/rótulo redondo colado na parede (o círculo acompanha a inclinação da parede). */
function wallDisc(c: Cut, side: Side, u: number, v: number, r: number, fn: (d: number, i: number, j: number) => Col): void {
  c.wall(side, u - r, v - r, 2 * r + 1, 2 * r + 1, (i, j) => { const dx = i - r, dy = j - r, d = Math.hypot(dx, dy); return d <= r + 0.3 ? fn(d / r, i, j) : 0; });
}
const stripes = (base: Col, line: Col, lit = 0): ((u: number, v: number) => Col) => (u, v) => (u % 8 < 2 ? lv(line, 3 + lit) : (u + v) % 13 === 0 ? lv(base, 3.4 + lit) : lv(base, 3 + lit));

/** 1920 · torre de rádio com faíscas, estúdio de válvulas, microfone de carbono. */
function room1920(a: Acc33, cx: number): void {
  const wood = C('#4a3a2c'), green = C('#4a6e66'), cream = C('#c8b878');
  const spec: RoomSpec = {
    wallR: wainscot(wood, stripes(green, cream, 0.5), 12, 0.5), wallL: wainscot(wood, stripes(green, cream, -0.2), 12, -0.1),
    floor: planks(C('#6a4a30'), 0.4), slab: C('#3a2a22'), trim: C('#d8c890'), pil: C('#8a5a3c'), roof: C('#7a4a38'), roofKind: 'brick',
  };
  // torre de rádio ATRÁS da casa: o telhado esconde os pés dela e ela nasce do prédio. Treliça de 4 pernas com bandas vermelhas
  // e brancas, plataforma com guarda-corpo, prato preso nela; luz vermelha e faíscas no topo (dinâmicas)
  const tx = cx + 16, tb = YB33 + half(16) - HW33 + 2, TH = 54;
  inked(a.P, (q) => {
    const steel = C('#6a6e82'), red = C('#c8402c'), white = C('#e8e4dc');
    for (let i = 0; i <= TH; i++) {
      const f = i / TH, hw = Math.max(1, Math.round(10 * (1 - f * 0.88))), y = tb - i, sec = Math.floor(i / 9), band = sec % 2 ? white : red, vis = i > 14;
      const leg = (x: number, tone: number) => { put(q, x, y, lv(vis ? band : steel, tone)); if (hw > 3) put(q, x + (x < tx ? 1 : -1), y, lv(vis ? band : steel, tone - 1)); };
      leg(tx - hw, 4); leg(tx + hw, 2);
      const m = i % 9; // travessas e contraventamento em X em cada trecho
      if (m === 0) for (let x = tx - hw; x <= tx + hw; x++) put(q, x, y, lv(steel, 3));
      else { const off = Math.round((2 * hw) * (m / 9)); put(q, tx - hw + off, y, lv(steel, 2.6)); put(q, tx + hw - off, y, lv(steel, 2.2)); }
    }
    // plataforma com guarda-corpo a 3/4 da altura e o prato preso nela por um consolo
    const py = tb - 38, ph = Math.max(1, Math.round(10 * (1 - (38 / TH) * 0.88)));
    q.rect(tx - ph - 3, py, 2 * ph + 7, 2, lv(steel, 3.6)); q.hline(tx - ph - 3, tx + ph + 3, py - 4, lv(steel, 3.4));
    for (let x = tx - ph - 3; x <= tx + ph + 3; x += 3) q.vline(x, py - 3, py - 1, lv(steel, 2.8));
    q.line(tx - ph - 3, py + 2, tx - ph - 8, py + 1, lv(steel, 2.4)); q.line(tx - ph - 3, py - 3, tx - ph - 8, py - 2, lv(steel, 2.4));
    q.ellipse(tx - ph - 11, py - 1, 4.4, 5.6, lv(C('#c8ccd8'), 3.6)); q.ellipse(tx - ph - 10, py - 1, 2.8, 4, lv(C('#6a6e7a'), 2.4)); q.put(tx - ph - 9, py - 1, lv(C('#ffe090'), 4.4)); // prato e alimentador
    q.vline(tx, tb - TH - 9, tb - TH, lv(steel, 3.6)); q.put(tx, tb - TH - 10, C('#ff4a3a')); // haste e luz de aviso
  });
  a.tower = [tx, tb - TH - 10];
  inked(a.P, (q) => {
    const c = cut(a, q, cx, 1);
    roomBase(c, spec);
    c.floorRect(6, 8, 20, 17, (u, v) => (u < 1 || v < 1 || u > 18.2 || v > 15.2 ? lv(cream, 2.4) : lv(C('#2f5a4a'), 3 + ((Math.floor(u / 2) + Math.floor(v / 2)) % 2) * 0.35)));
    c.window('R', 24, 16, 7, 17, C('#d8c890'), C('#1c2a3a'), C('#ffd070'));
    // quadro de ondas e relógio na parede da sombra
    c.wall('L', 10, 14, 11, 9, (i, j) => (i === 0 || j === 0 || i === 10 || j === 8 ? lv(C('#d8c890'), 3.4) : lv(C('#1a2a2a'), 2.6) && (Math.round(4 + Math.sin(i * 0.9) * 2.4) === j ? C('#7af0c8') : lv(C('#1a2a2a'), 2.6))));
  });
  inked(a.P, (q) => {
    const c = cut(a, q, cx, 1);
    // rádio de válvulas grande, de chão, encostado na parede da luz
    c.box(4, 0.4, 11, 6, 23, C('#5a3420'), {
      tex: {
        left: (u, v) => {
          if (v >= 9 && v <= 20 && u > 1.2 && u < 9.8) { const du = (u - 5.5) / 4.3, dv = (v - 15) / 5.5; return du * du + dv * dv < 1 ? ((Math.floor(u) + v) % 2 ? C('#8a6a3a') : C('#6a4a28')) : lv(C('#5a3420'), 2.2); }
          if (v >= 4 && v <= 7 && u > 1.5 && u < 9.5) return v === 4 ? C('#2a1a10') : ((u - 5.5) * (u - 5.5) + (v - 5.5) * (v - 5.5) < 4 ? C('#ffb840') : lv(C('#5a3420'), 2));
          if (v < 2) return lv(C('#5a3420'), 1.4);
          return 0;
        },
      },
    });
    // mesa de locução, microfone de carbono no pedestal
    c.box(15, 2.4, 12, 8, 9, C('#6a3e22'), { tex: { top: (u, v) => ((u > 2 && u < 6 && v > 2 && v < 5) ? C('#ece4cc') : (u > 8 && u < 10 && v > 3 && v < 6 ? C('#c03a2a') : 0)) } });
    const [mx, my] = c.fp(22, 15);
    q.vline(mx, my - 24, my - 2, lv(metalC, 3.4)); q.line(mx - 3, my, mx, my - 3, lv(metalC, 2.4)); q.line(mx + 3, my, mx, my - 3, lv(metalC, 2.4));
    q.rect(mx - 3, my - 31, 7, 8, lv(metalC, 3)); for (let j = 0; j < 6; j++) for (let i = 0; i < 5; i++) if ((i + j) % 2 === 0) put(q, mx - 2 + i, my - 30 + j, lv(C('#2a2a30'), 2.6));
    put(q, mx - 3, my - 31, lv(metalC, 5));
    plant(q, c.fp(2, 28)[0] + 1, c.fp(2, 28)[1]);
  });
  const c0 = new Cut(a.P, cx, YB33, a.lit, a.wins, 1), [ax, ay] = c0.fp(18.5, 20.5);
  a.fixed.push({ x: ax, y: ay, look: look('ann', 1925), role: null, pose: 'stand', dir: 'SE', year: 1925 });
  inked(a.P, (q) => { roofSign(q, cx - 20, YB33 + half(20) - HW33 - ROOF33 + 1, 'RADIO', C('#ff5040'), C('#2a0e0e')); });
  a.tower = [tx, tb - TH - 8];
}

/** 1950 · loja de discos com toldo listrado, jukebox e caixas de LPs. */
function room1950(a: Acc33, cx: number): void {
  const teal = C('#3a8a86'), cream = C('#e8e0c8'), red = C('#c43a3a');
  const spec: RoomSpec = {
    wallR: (u, v) => (v < 10 ? (v === 9 ? lv(C('#2a2a30'), 4) : lv(red, 2.6 + (u % 6 < 3 ? 0.3 : 0))) : (u * 3 + v) % 17 === 0 ? lv(teal, 3.7) : lv(teal, 3.4)),
    wallL: (u, v) => (v < 10 ? (v === 9 ? lv(C('#2a2a30'), 3) : lv(red, 2)) : (u * 3 + v) % 17 === 0 ? lv(teal, 3) : lv(teal, 2.4)),
    floor: checker(lv(C('#e8e4dc'), 3), lv(C('#26262e'), 3), 4), slab: C('#2a2a30'), trim: cream, pil: C('#b8bcc4'), roof: C('#3a3c4a'), roofKind: 'flat',
  };
  inked(a.P, (q) => {
    const c = cut(a, q, cx, 2);
    roomBase(c, spec);
    c.window('R', 6, 13, 13, 19, C('#c8ccd4'), C('#1c3040'), C('#ffe0a0'));
    // discos gigantes na parede da sombra
    wallDisc(c, 'L', 8, 28, 7, (d) => (d < 0.28 ? C('#e03a3a') : d < 0.34 ? C('#0a0a0e') : (Math.floor(d * 22) % 2 ? lv(C('#16161c'), 2) : lv(C('#16161c'), 3.2))));
    wallDisc(c, 'L', 21, 22, 5, (d) => (d < 0.34 ? C('#f0c040') : d < 0.4 ? C('#0a0a0e') : (Math.floor(d * 18) % 2 ? lv(C('#16161c'), 2) : lv(C('#16161c'), 3.2))));
  });
  inked(a.P, (q) => {
    const c = cut(a, q, cx, 2);
    // toldo listrado vermelho e branco sobre a vitrine
    const A = c.wp('R', 3, 35), B = c.wp('R', 21, 35), dx = -8, dy = 4 - 6;
    q.poly([[A[0], A[1]], [B[0], B[1]], [B[0] + dx, B[1] + dy + 4], [A[0] + dx, A[1] + dy + 4]], (x, y) => ((Math.floor((x + (y >> 1)) / 3) % 2) ? lv(C('#f4f0e4'), 3) : lv(red, 3.2)));
    for (let k = 0; k < 7; k++) { const x = A[0] + dx + Math.round(((B[0] - A[0]) * k) / 6), y = A[1] + dy + 4 + Math.round(((B[1] - A[1]) * k) / 6) + 1; put(q, x, y, k % 2 ? lv(C('#f4f0e4'), 2.4) : lv(red, 2)); put(q, x + 1, y, k % 2 ? lv(C('#f4f0e4'), 2.4) : lv(red, 2)); }
    // caixas de LPs (capas coloridas) e balcão com caixa registradora
    c.box(1, 7, 7, 13, 9, C('#6a3e22'), { tex: { top: (u, v) => (u > 1 && u < 6 && v > 1 && v < 12 ? [C('#e03a3a'), C('#3a6ad0'), C('#f0c040'), C('#2a9a5a'), C('#e0e0e0')][Math.floor(v) % 5] : 0) } });
    c.box(14, 14, 15, 6, 11, C('#e8e0d0'), { top: C('#b8bcc4'), tex: { top: (u, v) => (u > 10 && u < 14 && v > 1 && v < 4 ? lv(C('#2a2a30'), 3) : 0) } });
    // jukebox: corpo vermelho com arco de bolhas luminosas e cromados
    c.box(21, 0.4, 9, 7, 24, C('#b0302c'), {
      tex: {
        left: (u, v) => {
          if (v >= 16 && v <= 22 && u > 1 && u < 8) return lv(C('#16161c'), 2.4);
          if (v >= 4 && v <= 9 && u > 1 && u < 8) return (Math.floor(u) + v) % 2 ? lv(C('#8a8e98'), 3) : lv(C('#4a4e58'), 2.6);
          if (v === 12 || v === 13) return lv(C('#b8bcc4'), v === 13 ? 4.4 : 2.4);
          if (u < 0.8) return lv(C('#b8bcc4'), 4.4);
          return 0;
        },
      },
    });
    const [jx, jy] = c.fp(21, 7.4, 22);
    a.screens.push([jx - 6, jy - 5, 5, 11, SCR33.jb]);
  });
  inked(a.P, (q) => { roofSign(q, cx + 2, YB33 - HW33 - ROOF33 + 1, a.lang === 'en' ? 'RECORDS' : 'DISCOS', C('#ff5a9a'), C('#1e0a14')); });
  const c0 = new Cut(a.P, cx, YB33, a.lit, a.wins, 2), [sx, sy] = c0.fp(21, 21);
  a.fixed.push({ x: sx, y: sy, look: look('shop', 1952), role: null, pose: 'stand', dir: 'SW', year: 1952 });
}

/** 1965 · estúdio de fita: gravador de rolo, mesa de som, painéis acústicos. */
function room1965(a: Acc33, cx: number): void {
  const wood = C('#7a4a2a'), foam = C('#3a3a46'), carpet = C('#8a2a30');
  const spec: RoomSpec = {
    wallR: (u, v) => (v < 3 ? lv(wood, 1.6) : u % 5 === 0 ? lv(wood, 2.2) : lv(wood, 3.3 + (u % 10 < 5 ? 0.3 : 0))),
    wallL: (u, v) => { const px = (u % 6), py = (v % 6); const d = Math.abs(px - 2.5) + Math.abs(py - 2.5); return d < 2 ? lv(foam, 3.4) : d < 3.5 ? lv(foam, 2.4) : lv(foam, 1.5); },
    floor: (gx, gy) => lv(carpet, 2.8 + noise(Math.floor(gx), Math.floor(gy), 4) * 0.5), slab: C('#3a1e20'), trim: C('#c8a070'), pil: C('#6a4a30'), roof: C('#2e2a30'), roofKind: 'flat',
  };
  inked(a.P, (q) => {
    const c = cut(a, q, cx, 3);
    roomBase(c, spec);
    c.window('R', 22, 20, 8, 12, C('#c8a070'), C('#102030'), C('#9ae0ff'), false); // vidro da sala de controle
  });
  inked(a.P, (q) => {
    const c = cut(a, q, cx, 3);
    // rack com dois gravadores de rolo e medidores
    c.box(3, 0.4, 15, 7, 27, C('#5a5e68'), {
      tex: { left: (u, v) => { if (v >= 8 && v <= 11 && u > 1 && u < 14) return (Math.floor(u) % 5 === 2 ? C('#e8e0c8') : lv(C('#2a2a30'), 2.6)); if (v === 6 || v === 7) return (Math.floor(u) % 3 === 0 ? lv(C('#d8b048'), 3.4) : lv(C('#2a2a30'), 2)); if (v < 2) return lv(C('#5a5e68'), 1.4); return 0; } },
    });
    for (const g of [4.5, 11]) {
      const [rx, ry] = c.fp(3 + g, 7.4, 20);
      q.disc(rx, ry, 4.4, lv(C('#b8bcc4'), 3)); q.disc(rx, ry, 3.4, lv(C('#16161c'), 2.2)); q.disc(rx, ry, 1.2, lv(metalC, 4)); a.reels.push([rx, ry]);
    }
    // mesa de som com faders, banqueta e engenheiro
    c.box(17, 9, 13, 10, 10, C('#3a3a44'), { tex: { top: (u, v) => { if (v > 1 && v < 9 && u > 1 && u < 12) { if (Math.floor(v) % 3 === 1) return u % 2 < 1 ? lv(C('#16161c'), 2.2) : 0; return (Math.floor(v) % 3 === 2 && u % 2 < 1) ? ([C('#e03a3a'), C('#e8e0c8'), C('#f0c040')][Math.floor(u / 2) % 3]) : 0; } return 0; } } });
    c.box(21, 21, 5, 5, 2, C('#2a2a32'), {}, 8);
    // violão encostado na parede da sombra e abajur de parede
    const [gx, gy] = c.fp(1.4, 25);
    q.ellipse(gx + 2, gy - 4, 4, 5, lv(C('#c08040'), 3)); q.disc(gx + 2, gy - 4, 1.4, C('#1c1010')); q.ellipse(gx + 2, gy - 11, 3, 3, lv(C('#c08040'), 3)); q.vline(gx + 2, gy - 25, gy - 12, lv(C('#6a3e22'), 3)); q.rect(gx + 1, gy - 28, 3, 4, lv(C('#6a3e22'), 2.4));
    // luminárias de parede: braço de ferro saindo da parede e cúpula de latão com a lâmpada embaixo
    const sconce = (side: Side, u: number, v: number) => {
      const [lx, ly] = c.wp(side, u, v), d = side === 'R' ? -1 : 1, ax = lx + d * 6, ay = ly + 3;
      q.rect(lx - 1, ly - 2, 3, 5, lv(metalC, 3)); // chapa na parede
      q.line(lx, ly, ax, ay, lv(metalC, 3.4)); q.line(lx, ly + 1, ax, ay + 1, lv(metalC, 2));
      for (let k = 0; k < 4; k++) q.hline(ax - 1 - k, ax + 1 + k, ay + 1 + k, lv(C('#d8b048'), k === 0 ? 4.4 : 2.2 + k * 0.4));
      q.put(ax, ay + 6, C('#ffe9a8')); q.put(ax - 1, ay + 6, lv(C('#ffd070'), 3));
      a.cones.push([ax, ay + 6, 26, C('#ffd890')]);
    };
    sconce('R', 13, 38); sconce('L', 12, 38);
  });
  const c0 = new Cut(a.P, cx, YB33, a.lit, a.wins, 3), [ex, ey] = c0.fp(23.5, 23.5);
  a.fixed.push({ x: ex, y: ey - 1, look: look('eng', 1965), role: 'producer', pose: 'sit', dir: 'NE', year: 1965 });
  inked(a.P, (q) => { roofSign(q, cx + 10, YB33 + half(10) - HW33 - ROOF33 + 1, 'REC', C('#ff4040'), C('#2a0a0a')); });
}

/** 1975 · palco com truss, caixas de som, banda e luzes coloridas (a plateia fica na calçada). */
function room1975(a: Acc33, cx: number): void {
  const cloth = C('#262232'), grill = C('#34303e');
  const spec: RoomSpec = {
    wallR: (u, v) => (v < 12 ? ((u + v) % 3 === 0 ? lv(grill, 2.4) : lv(grill, 3.1)) : (u * 5 + v * 3) % 19 === 0 ? lv(cloth, 3.6) : lv(cloth, 3.2)),
    wallL: (u, v) => (v < 12 ? ((u + v) % 3 === 0 ? lv(grill, 1.6) : lv(grill, 2.2)) : (u * 5 + v * 3) % 19 === 0 ? lv(cloth, 2.6) : lv(cloth, 2.1)),
    floor: (gx, gy) => (Math.abs(gx - gy) < 0.9 || Math.abs(gx + gy - L33) < 0.9 ? lv(C('#c8c0d0'), 3) : planks(C('#6a4426'))(gx, gy)), slab: C('#2a1a1a'), trim: C('#8a8e98'), pil: C('#3a3a46'), roof: C('#1c1c24'), roofKind: 'truss',
  };
  inked(a.P, (q) => {
    const c = cut(a, q, cx, 4);
    roomBase(c, spec);
    // faixa de neon na borda da frente do palco
    const [x0, y0] = c.fp(0, L33 - 0.4, 1), [x1, y1] = c.fp(L33 - 0.4, L33 - 0.4, 1), [x2, y2] = c.fp(L33 - 0.4, 0, 1);
    q.line(x0, y0, x1, y1, C('#ff44c4')); q.line(x1, y1, x2, y2, C('#b030f0'));
    for (const [u, side, col] of [[7, 'R', '#ff4a4a'], [17, 'R', '#ffa83c'], [26, 'R', '#ff44c4'], [9, 'L', '#b45cff'], [21, 'L', '#44e8ff']] as const) {
      const [x, y] = c.wp(side, u, (HW33 - 1) / K33);
      q.rect(x - 2, y + 1, 5, 3, lv(C('#1a1a20'), 3)); q.hline(x - 1, x + 1, y + 4, lv(C(col), 4)); // refletor sob a treliça
      a.spots.push([x, y + 4, C(col)]);
    }
  });
  inked(a.P, (q) => {
    const c = cut(a, q, cx, 4), cab = C('#1e1c22'), cone = C('#3a3842');
    // caixas de som e amplificadores como caixas isométricas ENCOSTADAS nas paredes, dentro do piso (a grade fica na face que olha o palco)
    const grill = (n: number) => (u: number, v: number): Col => {
      if (v < 2) return lv(cab, 1.4);
      for (let k = 0; k < n; k++) { const cy = 6 + k * (v >= 0 ? 8.6 : 0), dd = Math.hypot(u - 4.5, v - cy); if (dd < 2.2) return lv(cone, 4.6); if (dd < 3.6) return lv(cone, 2.2 + (u < 4.5 ? 1 : 0)); if (dd < 4.2) return lv(cab, 1.6); }
      return v > 30 ? lv(cab, 4.4) : 0;
    };
    c.box(0.4, 21, 6.5, 10.5, 27, cab, { tex: { right: grill(3) } }); // torre de PA na quina da frente, na parede da sombra
    c.box(21, 0.4, 10.5, 6.5, 27, cab, { tex: { left: grill(3) } }); // e a outra na parede da luz
    const [dx, dy] = c.fp(14.5, 8); drumKit31(q, dx - 14, dy + 3, 1975, C('#c0392b')); // bateria no fundo, dentro do piso
  });
  const c0 = new Cut(a.P, cx, YB33, a.lit, a.wins, 4);
  const mk = (seed: string, role: string, gx: number, gy: number, dir: Dir): void => { const [x, y] = c0.fp(gx, gy); a.fixed.push({ x, y, look: look(seed, 1975), role, pose: 'play', dir, year: 1975 }); };
  mk('gtr', 'guitar', 8, 24, 'SE'); mk('voc', 'vocal', 18, 26, 'SE'); mk('bas', 'bass', 27, 14, 'SW'); mk('drm', 'drums', 14.5, 7, 'SE');
  // plateia na calçada, em duas fileiras que pulam (camadas próprias)
  const bx = cx - 50;
  inked(a.crowd[0], (q) => crowd31(q, bx, 100, 18, Y_SW1 + 15, 1975, 37));
  inked(a.crowd[1], (q) => crowd31(q, bx - 5, 110, 16, Y_SW1 + 26, 1975, 23));
  a.crowdBox = [bx - 10, Y_SW1 - 8, 124, 50];
  inked(a.P, (q) => { roofSign(q, cx + 2, YB33 - HW33 - ROOF33 + 1, a.lang === 'en' ? 'LIVE' : 'AO VIVO', C('#ff4fa0'), C('#1e0a18')); });
}

/** 1995 · estúdio digital: mesa com três telas, teclado, monitores de estúdio, faixa de LED. */
function room1995(a: Acc33, cx: number): void {
  const slate = C('#2c3c56');
  const spec: RoomSpec = {
    wallR: (u, v) => (v === 38 || v === 39 ? C('#44e8ff') : v > 39 || v < 15 ? ((u + v) % 7 === 0 ? lv(slate, 3.6) : lv(slate, 3.1)) : (u % 8 === 0 ? lv(slate, 2) : lv(slate, 2.7))),
    wallL: (u, v) => (v === 38 || v === 39 ? C('#b45cff') : v > 39 || v < 15 ? lv(slate, 2.1) : (u % 8 === 0 ? lv(slate, 1.4) : lv(slate, 1.9))),
    floor: (gx, gy) => (Math.floor(gx) % 8 === 0 || Math.floor(gy) % 8 === 0 ? lv(C('#3a5a9a'), 2.6) : lv(C('#1c2438'), 2.6 + noise(Math.floor(gx), Math.floor(gy), 7) * 0.3)), slab: C('#161c2c'), trim: C('#6a7a9a'), pil: C('#3a4a66'), roof: C('#2a3040'), roofKind: 'flat',
  };
  inked(a.P, (q) => {
    const c = cut(a, q, cx, 5);
    roomBase(c, spec);
    wallDisc(c, 'L', 12, 20, 5, (d) => (d < 0.3 ? C('#16161c') : lv(C('#c8ccd4'), 3.8 - d * 2.4))); // CD gigante
  });
  inked(a.P, (q) => {
    const c = cut(a, q, cx, 5);
    c.box(5, 1, 22, 9, 10, C('#2a2a34'), { tex: { top: (u, v) => (v > 6 && v < 8 && u > 3 && u < 19 ? lv(C('#b8bcc4'), 2.6) : 0) } });
    for (const g of [8, 15, 22]) { // três monitores, vidro aceso
      const [mx, my] = c.fp(g + 1, 5, 10);
      q.rect(mx - 6, my - 14, 12, 9, lv(C('#3a3a44'), 3)); q.rect(mx - 5, my - 13, 10, 7, C('#0a1a2a')); q.rect(mx - 2, my - 5, 4, 2, lv(C('#3a3a44'), 2));
      a.screens.push([mx - 5, my - 13, 10, 7, SCR33.mon]);
    }
    const [sx, sy] = c.fp(3, 5, 10); q.rect(sx - 3, sy - 9, 6, 9, lv(C('#16161c'), 3)); q.disc(sx, sy - 3, 2, lv(C('#3a3a44'), 3)); q.disc(sx, sy - 7, 1, lv(C('#3a3a44'), 3));
    const [sx2, sy2] = c.fp(27, 5, 10); q.rect(sx2 - 3, sy2 - 9, 6, 9, lv(C('#16161c'), 3)); q.disc(sx2, sy2 - 3, 2, lv(C('#3a3a44'), 3)); q.disc(sx2, sy2 - 7, 1, lv(C('#3a3a44'), 3));
    // teclado sintetizador e torre de CDs
    c.box(21, 17, 9, 14, 6, C('#2a2a32'), { tex: { top: (u, v) => (v > 2 && v < 12 && u > 1 && u < 7 ? (Math.floor(v) % 2 ? C('#f4f0e4') : C('#16161a')) : 0) } });
    c.box(1, 20, 4, 6, 20, C('#3a3a46'), { tex: { left: (u, v) => (u > 0.6 && u < 3.4 && v > 2 && v < 18 ? ([C('#e03a3a'), C('#44e8ff'), C('#f0c040'), C('#b45cff')][Math.floor(v / 2) % 4]) : 0) } });
    c.box(14, 16, 5, 5, 2, C('#1c1c24'), {}, 8);
  });
  const c0 = new Cut(a.P, cx, YB33, a.lit, a.wins, 5), [ex, ey] = c0.fp(16.5, 18.5);
  a.fixed.push({ x: ex, y: ey - 1, look: look('dig', 1995), role: 'producer', pose: 'sit', dir: 'NE', year: 1995 });
  inked(a.P, (q) => { roofSign(q, cx, YB33 - HW33 - ROOF33 + 1, 'DIGITAL', C('#44e8ff'), C('#08141c')); });
}

/** 2035 · cidade de vidro e o único holograma (a cantora, em pé na plataforma da praça). */
function room2035(a: Acc33, cx: number): void {
  const glass = (base: Col, seed: number) => ({
    left: (u: number, v: number) => glassTex(u, v, base, seed, 3.4), right: (u: number, v: number) => glassTex(u, v, base, seed + 7, 2.2),
    top: (u: number, v: number) => lv(mix(base, C('#9af0ff'), 0.4), 3.6 + ((Math.floor(u) + Math.floor(v)) % 3 === 0 ? 0.5 : 0)),
  });
  // torres de vidro (atrás para frente): a mais alta é a do fundo
  const towers: [number, number, number, number, number, string][] = [[2, 2, 10, 10, 66, '#3a5ab0'], [14, 0.5, 9, 9, 54, '#5a3aa8'], [24, 6, 8, 8, 44, '#2f6ab8'], [2, 16, 9, 8, 40, '#4a3a9a'], [13, 13, 10, 9, 32, '#3a8ab0']];
  towers.forEach(([gx, gy, w, d, h, col], i) => {
    inked(a.P, (q) => {
      const c = cut(a, q, cx, 6);
      c.box(gx, gy, w, d, h, C(col), { tex: glass(C(col), i * 13 + 3), top: lv(C(col), 4.2) });
    });
  });
  // painéis de LED roxos nas faces e anéis de neon no topo da maior
  inked(a.P, (q) => {
    const c = cut(a, q, cx, 6);
    for (const [gx, gy, z, w, h] of [[12, 12.5, 30, 6, 11], [3, 12, 26, 5, 9], [32, 14, 14, 5, 8]] as const) {
      const [x, y] = c.fp(gx, gy, z);
      q.rect(x - 1, y - h - 1, w + 2, h + 2, lv(C('#6a3ad0'), 2.6)); q.rect(x, y - h, w, h, C('#14083a'));
      a.screens.push([x, y - h, w, h, SCR33.led]);
    }
  });
  const [tx, ty] = new Cut(a.P, cx, YB33, a.lit, a.wins, 6).fp(7, 7, 66);
  for (const [k, r] of [[0, 9], [-8, 7]] as const) for (let t = 0; t < 120; t++) { const an = (t / 120) * Math.PI * 2; put(a.P, Math.round(tx + Math.cos(an) * r), Math.round(ty + k + Math.sin(an) * r * 0.35), t % 3 === 0 ? C('#d8f8ff') : C('#44e8ff')); }
  // praça com o projetor (pedestal de metal com anel aceso) e a cantora em holograma em cima (um só holograma no mundo)
  const px = cx + 30, py = Y_SW1 + 9, PH = 13;
  inked(a.P, (q) => {
    const steel = C('#4a5a7a');
    q.ellipse(px, py, 14, 5, lv(steel, 2.4)); // base larga
    for (let y = py - PH; y < py; y++) for (let x = px - 11; x <= px + 11; x++) { const e = Math.abs(x - px) / 11; if (e * e + 0 > 1) continue; q.put(x, y, x < px - 5 ? lv(steel, 4) : x > px + 5 ? lv(steel, 1.8) : lv(steel, 3)); if ((y - py) % 4 === 0) q.put(x, y, lv(steel, x < px ? 2 : 1.2)); }
    q.ellipse(px, py - PH, 12, 4.4, lv(steel, 4)); q.ellipse(px, py - PH, 9, 3.2, lv(C('#0a1a30'), 3));
    q.ring(px, py - PH, 10, C('#44e8ff')); q.ring(px, py - PH, 6, C('#9af0ff'));
  });
  a.fixed.push({ x: px, y: py - PH, look: SINGER33, role: 'vocal', pose: 'play', dir: 'SE', year: 2035, holo: true });
  a.holos++;
  a.holo = { x: px, y: py - PH };
}
/** Aparência fixa da cantora do holograma. */
const SINGER33: Appearance = { body: 0, face: 1, skin: 1, hair: 11, hairColor: 5, outfit: 3, outfitColor: 9, glasses: false, hat: false, beard: false };
/** Vidro: gradiente de cima (claro) para baixo (fundo), janelas em grade, algumas acesas. */
function glassTex(u: number, v: number, base: Col, seed: number, lit: number): Col {
  const cell = Math.floor(u / 3) * 7 + Math.floor(v / 4) * 13 + seed;
  const grid = u % 3 === 0 || v % 4 === 0;
  const on = noise(cell, seed, 5) > 0.72;
  if (grid) return lv(base, lit - 1.2);
  return on ? (noise(cell, 1, seed) > 0.5 ? C('#ff9ae0') : C('#9af0ff')) : lv(base, lit + Math.min(1.2, v / 60) - 0.4 + noise(cell, 2, seed) * 0.4);
}

// ---------------------------------------------------------------- chão, rua, rio e pontes

const eraAtX = (x: number): number => ep5Of(yearAt33(x));
/** Calçada de losangos 2:1 (a mesma grade do mapa), cor pela época. */
function paveTile(x: number, y: number, base: Col, ep: number): Col {
  const a = ((x + 2 * y) >> 4) + ((x - 2 * y) >> 4); // losangos de 16×8
  const edge = ((x + 2 * y) & 15) === 0 || ((x - 2 * y) & 15) === 0;
  const c = ep >= 4 ? lv(base, 3.3 + (a & 1) * 0.5) : lv(base, 3 + ((a & 1) * 0.7) + noise(x, y, 4) * 0.25);
  return edge ? lv(base, 1.8) : c;
}
function ground(P: Px): void {
  const W = P.w;
  // gramado/terra de trás até a calçada
  for (let y = Y_HOR; y < Y_SW1; y++) for (let x = 0; x < W; x++) {
    const ep = eraAtX(x), g = ep >= 4 ? C('#26364a') : ep >= 2 ? C('#2c4a3a') : C('#2e4636');
    P.put(x, y, mix(lv(g, 2.2 + noise(x, y, 8) * 0.9), C('#101420'), Math.max(0, (Y_HOR + 6 - y) / 12)));
  }
  // muro baixo de pedra com sebe e grade de ferro ao fundo (a faixa de trás deixa de ser só gramado)
  for (let x = 0; x < W; x++) {
    const ep = eraAtX(x);
    for (let k = 0; k < 6; k++) P.put(x, YB33 + 15 + k, k === 0 ? lv(C('#8a8698'), 4.2) : (x + (k % 2) * 4) % 8 === 0 || k === 5 ? lv(C('#3a384a'), 1.4) : lv(C('#5a566a'), 2.6 + noise(x >> 2, k, 12) * 0.4));
    const hh = 6 + Math.round(noise(x >> 3, 1, 13) * 3);
    for (let k = 0; k < hh; k++) P.put(x, YB33 + 14 - k, k === hh - 1 ? lv(C(ep >= 4 ? '#3a8a7a' : '#2f7a3c'), 4) : (x * 3 + k * 5) % 7 === 0 ? lv(C(ep >= 4 ? '#3a8a7a' : '#2f7a3c'), 3.4) : lv(C(ep >= 4 ? '#2a6a6a' : '#256a34'), 2.6 + (k > hh / 2 ? 0 : 0.4)));
    if (x % 9 === 0) for (let k = 0; k < 10; k++) P.put(x, YB33 + 6 - k, k === 9 ? lv(C('#2e3038'), 4) : lv(C('#2e3038'), 3));
  }
  // calçada de cima
  for (let y = Y_SW1; y < Y_RD0; y++) for (let x = 0; x < W; x++) P.put(x, y, paveTile(x, y, C('#6a6678'), eraAtX(x)));
  // pista
  for (let y = Y_RD0; y < Y_RD1; y++) for (let x = 0; x < W; x++) {
    const ep = eraAtX(x);
    let c: Col;
    if (ep === 0) c = lv(C('#5a5048'), 2.6 + noise(x >> 2, y >> 1, 3) * 1.0); // rua de pedra e terra
    else c = lv(C('#3a3c46'), 2.6 + noise(x, y, 3) * 0.35);
    if (ep >= 1 && y === Y_RD0 + 13 && (x >> 3) % 2 === 0) c = lv(C('#e8c860'), 3.4);
    if (y === Y_RD0) c = lv(C('#8a8698'), 4);
    if (y === Y_RD1 - 1) c = lv(C('#8a8698'), 2);
    P.put(x, y, c);
  }
  // calçada de baixo e paredão do rio
  for (let y = Y_RD1; y < Y_EMB; y++) for (let x = 0; x < W; x++) P.put(x, y, paveTile(x, y, C('#605c70'), eraAtX(x)));
  for (let y = Y_EMB; y < Y_EMB + 12; y++) for (let x = 0; x < W; x++) {
    const row = (y - Y_EMB) >> 2, col = ((x + (row % 2) * 6) % 12);
    P.put(x, y, y === Y_EMB ? lv(C('#8a8698'), 4.4) : col === 0 || (y - Y_EMB) % 4 === 3 ? lv(C('#3a384a'), 1.4) : lv(C('#5a566a'), 2.6 + noise(x >> 2, row, 5) * 0.5 - (y - Y_EMB) * 0.05));
  }
  // rio
  for (let y = Y_EMB + 12; y < WH33; y++) for (let x = 0; x < W; x++) {
    const d = (y - Y_EMB - 12) / (WH33 - Y_EMB - 12);
    P.put(x, y, mix(lv(C('#1c3a6a'), 2.4 + noise(x >> 1, y, 6) * 0.5), C('#0a1428'), d * 0.7));
  }
}
/** Centro e meia-largura (no topo) dos dois rios das pontas. */
const RIVER_C = [MARGIN33 - 265, WW33 - MARGIN33 + 265], RIVER_HW0 = 50, Y_FAR = Y_HOR;
/** Meia-largura da água na linha y: o rio abre para quem olha (perspectiva), 1 px a cada 2 linhas. */
export const riverHW33 = (y: number): number => RIVER_HW0 + Math.round((y - Y_FAR) / 2);
/** Rio que corta a rua nas pontas, com cais de pedra dos dois lados, margem do outro lado com sebe e casinhas, e a ponte
 *  de pedra de três arcos por cima (parapeitos, pilares, aduelas nos arcos, friso e espuma na água). */
function rivers(P: Px): void {
  const stone = C('#5a566a');
  for (const cxr of RIVER_C) {
    const hwS = riverHW33(Y_SW1), x0 = cxr - hwS - 8, x1 = cxr + hwS + 8;
    // água de trás: clara ao longe (reflete o céu), escura perto da ponte; faixas de reflexo e riscos de ondinha
    for (let y = Y_FAR; y < Y_SW1 - 10; y++) {
      const hw = riverHW33(y), d = (y - Y_FAR) / (Y_SW1 - Y_FAR);
      for (let x = cxr - hw - 9; x <= cxr + hw + 9; x++) {
        const dx = x - cxr, ed = Math.abs(dx) - hw;
        if (ed > 0) { // cais: parede de pedra com fiadas, friso de luz na quina de cima e sombra no pé
          const wall = ed <= 4, course = (y >> 2) % 2, brick = (x + course * 4) % 8 === 0 || y % 4 === 3;
          if (ed === 1) P.put(x, y, lv(stone, dx < 0 ? 4.6 : 3.8));
          else if (wall) P.put(x, y, brick ? lv(C('#3a384a'), 1.5) : lv(stone, (dx < 0 ? 3.2 : 2.2) + noise(x >> 1, y >> 2, 15) * 0.4));
          else P.put(x, y, lv(C('#2a4a32'), 2.4 + noise(x, y, 16) * 0.5));
          continue;
        }
        const streak = noise(x >> 3, y >> 1, 21) > 0.78 && (x + y) % 3 === 0, ripple = (x + y * 3) % 19 === 0 || (x * 2 + y) % 29 === 0;
        let c = mix(lv(C('#2a5a9a'), 3.2 + noise(x >> 1, y, 6) * 0.3), C('#0a1428'), 0.25 + d * 0.55);
        if (ed > -3) c = mix(c, C('#06101e'), 0.45); // sombra da parede na água
        if (streak) c = mix(c, C('#9ac8ff'), 0.35 * (1 - d));
        if (ripple) c = mix(c, C('#bcdcff'), 0.22 * (1 - d * 0.6));
        P.put(x, y, c);
      }
    }
    // outra margem lá no fundo: cais, sebe e casinhas escuras com janelas acesas
    const hwF = riverHW33(Y_FAR);
    for (let x = cxr - hwF - 12; x <= cxr + hwF + 12; x++) {
      for (let k = 0; k < 5; k++) P.put(x, Y_FAR + k - 3, k === 0 ? lv(stone, 4.4) : (x + (k % 2) * 4) % 8 === 0 ? lv(C('#3a384a'), 1.5) : lv(stone, 2.8 - k * 0.15));
      const hh = 4 + Math.round(noise(x >> 2, 1, 17) * 3);
      for (let k = 0; k < hh; k++) P.put(x, Y_FAR - 4 - k, k === hh - 1 ? lv(C('#2f7a3c'), 4) : lv(C('#256a34'), 2.6 + (k % 2) * 0.4));
    }
    for (let k = -2; k <= 2; k++) { // casinhas do outro lado
      const bx = cxr + k * 24 - 8, bh = 12 + ((k + 3) % 3) * 5;
      for (let y = Y_FAR - 9 - bh; y < Y_FAR - 8; y++) for (let x = bx; x < bx + 14; x++) P.put(x, y, y === Y_FAR - 9 - bh ? lv(C('#2a2a3a'), 4) : (x - bx) % 5 === 2 && (y - Y_FAR) % 5 === 1 && noise(x, y, 23) > 0.3 ? C('#ffc860') : lv(C('#2a2640'), 2.4));
    }
    // ponte: parapeito de trás com balaústres, pilares com remate nas pontas e juntas no tabuleiro
    inked(P, (q) => {
      for (let x = x0 - 2; x <= x1 + 2; x++) {
        const bal = (x - x0) % 5 < 2;
        if (bal) q.vline(x, Y_SW1 - 9, Y_SW1 - 2, lv(C('#8a8698'), 3 + ((x - x0) % 5) * 0.5)); else q.hline(x, x, Y_SW1 - 6, lv(C('#6a6678'), 2.4));
        q.put(x, Y_SW1 - 10, lv(C('#aaa6b8'), 4.8)); q.put(x, Y_SW1 - 1, lv(C('#8a8698'), 4)); q.put(x, Y_SW1 - 11, lv(C('#5a566a'), 2.6));
      }
      for (const px of [x0 - 6, x1 + 2]) {
        q.rect(px, Y_SW1 - 18, 8, 18, lv(C('#6a6678'), 3.2));
        for (let k = 0; k < 18; k += 4) q.hline(px, px + 7, Y_SW1 - 18 + k, lv(C('#3a384a'), 1.8)); // fiadas
        q.rect(px - 1, Y_SW1 - 21, 10, 3, lv(C('#8a8698'), 4)); q.rect(px + 1, Y_SW1 - 24, 6, 3, lv(C('#8a8698'), 3.4)); q.put(px + 3, Y_SW1 - 25, lv(C('#aaa6b8'), 4.8)); q.put(px + 4, Y_SW1 - 25, lv(C('#aaa6b8'), 4.2));
        q.vline(px, Y_SW1 - 18, Y_SW1 - 1, lv(C('#8a8698'), 4.4)); q.vline(px + 7, Y_SW1 - 18, Y_SW1 - 1, lv(C('#3a384a'), 2));
      }
    });
    for (const jx of [x0 + 2, x1 - 2]) for (let y = Y_SW1; y < Y_EMB; y++) P.put(jx, y, lv(C('#2a283a'), 1.8)); // juntas do tabuleiro
    // parte da frente: parapeito baixo e a face da ponte com friso, três arcos com aduelas e pilares com luz
    const fw = x1 - x0, top = Y_EMB - 9, wallB = Y_EMB + 42, n = 3, span = fw / n;
    inked(P, (q) => {
      for (let x = x0 - 8; x <= x1 + 8; x++) {
        const bal = (x - x0) % 5 < 2;
        for (let y = top; y < Y_EMB; y++) q.put(x, y, y === top ? lv(C('#aaa6b8'), 4.8) : bal ? lv(C('#8a8698'), 3 + ((x - x0) % 5) * 0.5) : (y === top + 4 ? lv(C('#6a6678'), 2.4) : 0));
        for (let y = Y_EMB; y < wallB; y++) {
          const row = (y - Y_EMB) >> 2, brick = (x + (row % 2) * 5) % 10 === 0 || (y - Y_EMB) % 4 === 3;
          let c = y === Y_EMB ? lv(C('#aaa6b8'), 4.8) : y < Y_EMB + 4 ? lv(C('#7a768a'), 3.4 - (y - Y_EMB) * 0.15) : brick ? lv(C('#3a384a'), 1.5) : lv(C('#6a6678'), 2.7 + noise(x >> 1, row, 9) * 0.5 - (y - Y_EMB) * 0.01 + (x < x0 + 8 ? 0.5 : 0));
          if (y === Y_EMB + 4) c = lv(C('#3a384a'), 1.4); // sombra do friso
          q.put(x, y, c);
        }
      }
    });
    for (let kk = 0; kk < n; kk++) {
      const acx = x0 + (kk + 0.5) * span, rr = span / 2 - 7, archTop = (x: number) => { const dxx = (x - acx) / rr; return Y_EMB + 36 - Math.round(Math.sqrt(Math.max(0, 1 - dxx * dxx)) * 26); };
      for (let x = Math.ceil(acx - rr - 3); x <= Math.floor(acx + rr + 3); x++) { // aduelas: anel de pedra clara em volta da boca do arco
        const inside = Math.abs(x - acx) <= rr, tA = inside ? archTop(x) : Y_EMB + 36;
        for (let k = 1; k <= 3; k++) { const yy = tA - k; if (yy > Y_EMB + 4 && (inside || k <= 3 - Math.floor(Math.abs(x - acx) - rr))) P.put(x, yy, ((x + k) % 3 === 0 ? lv(C('#aaa6b8'), 4.4) : lv(C('#8a8698'), 3.6)) as Col); }
      }
      for (let x = Math.ceil(acx - rr); x <= Math.floor(acx + rr); x++) {
        const tA = archTop(x);
        for (let y = tA; y < wallB; y++) P.put(x, y, mix(lv(C('#0a1220'), 1.4), C('#2a4a7a'), clamp01((y - tA) / 30) * 0.9));
        if ((x * 3 + 1) % 7 === 0) for (let y = Y_EMB + 32; y < wallB; y += 3) P.put(x, y, withAlpha(C('#9ac8ff'), 255));
      }
      P.put(Math.round(acx), archTop(Math.round(acx)) - 4, lv(C('#d8d4e8'), 4.8)); // pedra-chave
    }
    for (let x = x0 - 8; x <= x1 + 8; x++) { P.put(x, wallB, lv(C('#d8e8ff'), 3.6)); if ((x + 1) % 4) P.put(x, wallB + 1, lv(C('#8ab8e8'), 2.6)); } // espuma na linha d'água
  }
}
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// ---------------------------------------------------------------- carros da época (perfil, virados para a direita)

/** 7 veículos, um por trecho: charrete, Ford T, sedã de rabo-de-peixe, perua, esportivo, hatch, carro-cápsula elétrico. */
function carPx(kind: number, hue: number): Px {
  const W = kind === 0 ? 46 : 38, H = kind === 0 ? 24 : 17, p = new Px(W, H);
  const glass = C('#8ac0e0'), tyre = C('#16161c');
  const body = [C('#2a2a30'), C('#26303a'), mix(C('#e8a0b0'), C('#70c8c0'), hue), mix(C('#c8b070'), C('#3a6a9a'), hue), mix(C('#c03a2a'), C('#e08a20'), hue), mix(C('#c8ccd4'), C('#3a4a8a'), hue), C('#d8e0f0')][kind];
  inked(p, (q) => {
    const wheel = (cx: number, r = 3) => { q.disc(cx, H - r, r + 0.4, tyre); q.disc(cx, H - r, r - 1.2, lv(C('#a8acb8'), 3)); put(q, cx - 1, H - r - 1, lv(C('#a8acb8'), 5)); };
    const shell = (x0: number, y0: number, w: number, h: number, c: Col) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) put(q, x0 + x, y0 + y, y === 0 ? lv(c, 4.4) : x === 0 ? lv(c, 3.8) : y >= h - 2 ? lv(c, 1.8) : x === w - 1 ? lv(c, 2.2) : lv(c, 3)); };
    if (kind === 0) { // charrete: cavalo marrom puxando o coche preto
      const hs = C('#6a3e22');
      q.ellipse(36, 11, 6, 4, hs); q.rect(40, 5, 3, 7, lv(hs, 3)); q.rect(41, 3, 5, 3, lv(hs, 3.4)); put(q, 45, 5, lv(hs, 1.4)); put(q, 42, 3, INK);
      for (const lx of [32, 34, 39, 41]) q.vline(lx, 13, H - 2, lv(hs, lx % 2 ? 2.4 : 1.8));
      q.line(30, 10, 22, 10, lv(C('#6a5a3a'), 3));
      shell(4, 7, 18, 9, body); q.poly([[5, 7], [8, 2], [18, 2], [21, 7]], lv(body, 2.4)); q.rect(10, 4, 6, 3, lv(glass, 2)); put(q, 3, 8, lv(C('#d8b048'), 4));
      wheel(8, 4); wheel(19, 4); q.vline(8, H - 8, H - 5, lv(C('#6a5a3a'), 3));
    } else if (kind === 1) { // Ford T: cabine alta, para-lama curvo, estribo
      shell(5, 6, 28, 8, body); shell(10, 1, 12, 6, body); q.rect(12, 2, 8, 4, glass); put(q, 12, 2, lv(glass, 5)); q.rect(33, 5, 3, 5, lv(C('#d8b048'), 3)); q.hline(5, 33, 14, lv(C('#6a5a3a'), 2)); wheel(10, 4); wheel(28, 4);
    } else if (kind === 2) { // anos 50: capô longo, rabo de peixe, faixa cromada
      shell(2, 7, 34, 7, body); q.poly([[10, 7], [14, 2], [26, 2], [31, 7]], lv(body, 3.2)); q.rect(15, 3, 9, 4, glass); q.poly([[1, 6], [4, 3], [5, 7]], lv(body, 4)); q.hline(3, 35, 10, lv(C('#e8e4dc'), 4)); put(q, 36, 9, lv(C('#fff2c0'), 5)); wheel(9, 3.5); wheel(28, 3.5);
    } else if (kind === 3) { // perua dos anos 60 com bagageiro
      shell(2, 4, 34, 10, body); q.rect(6, 5, 7, 4, glass); q.rect(15, 5, 7, 4, glass); q.rect(24, 5, 7, 4, glass); q.hline(4, 34, 3, lv(C('#6a5a3a'), 3)); q.rect(8, 2, 22, 1, lv(C('#6a5a3a'), 3.4)); q.hline(2, 36, 11, lv(C('#f4f0e4'), 3)); put(q, 36, 9, lv(C('#fff2c0'), 5)); wheel(9, 3.5); wheel(29, 3.5);
    } else if (kind === 4) { // esportivo dos anos 70: baixo, longo, faixa
      shell(2, 7, 35, 7, body); q.poly([[14, 7], [19, 3], [29, 3], [33, 7]], lv(body, 3.2)); q.rect(20, 4, 8, 3, glass); q.hline(3, 36, 10, lv(C('#f0c040'), 3.4)); put(q, 37, 9, lv(C('#fff2c0'), 5)); put(q, 2, 9, lv(C('#e03a3a'), 3)); wheel(9, 3.5); wheel(29, 3.5);
    } else if (kind === 5) { // hatch dos anos 90
      shell(3, 6, 31, 8, body); q.poly([[8, 6], [12, 1], [26, 1], [31, 6]], lv(body, 3.2)); q.rect(13, 2, 5, 4, glass); q.rect(19, 2, 5, 4, glass); put(q, 34, 9, lv(C('#fff2c0'), 5)); put(q, 3, 9, lv(C('#e03a3a'), 3)); wheel(9, 3.4); wheel(28, 3.4);
    } else { // 2035: cápsula de vidro com luz azul embaixo
      shell(3, 7, 33, 7, body); q.poly([[7, 7], [12, 2], [27, 2], [33, 7]], withAlpha(lv(glass, 3.4), 255)); q.hline(10, 28, 4, lv(C('#44e8ff'), 4)); q.hline(4, 35, 11, C('#44e8ff')); wheel(10, 3); wheel(28, 3);
    }
  });
  return p;
}

// ---------------------------------------------------------------- easter eggs (pequenos, na mesma arte)

/** Gato preto sentado, 3 quadros da cauda; olhos verdes; luz de cima à esquerda no pelo. */
function catPx(f: number): Px {
  const p = new Px(15, 13), fur = C('#2c2a3a');
  inked(p, (q) => {
    q.ellipse(6, 9, 4.2, 3.4, lv(fur, 2.8)); q.rect(3, 6, 6, 5, lv(fur, 2.6)); // corpo sentado
    q.disc(6, 4.5, 3, lv(fur, 2.9)); q.poly([[3.4, 3], [3.6, -0.2], [5.4, 2]], lv(fur, 3)); q.poly([[8.6, 3], [8.4, -0.2], [6.6, 2]], lv(fur, 2.2)); // orelhas
    q.hline(3, 5, 3, lv(fur, 4.4)); q.put(3, 4, lv(fur, 4));
    q.vline(4, 9, 11, lv(fur, 3.4)); q.vline(8, 9, 11, lv(fur, 1.8)); // patas da frente
    const tail: [number, number][][] = [[[10, 11], [11, 10], [12, 9], [12, 8]], [[10, 11], [11, 11], [12, 10], [13, 10]], [[10, 11], [11, 10], [11, 9], [11, 7]]];
    for (const [x, y] of tail[f % 3]) q.put(x, y, lv(fur, 2.6));
  });
  p.put(5, 4, C('#a8ff60')); p.put(7, 4, C('#a8ff60')); // olhos
  return p;
}
/** Pombo: 2 quadros de asa (pousado = asa fechada). */
function pigeonPx(wing: 0 | 1 | 2): Px {
  const p = new Px(9, 7), g = C('#8a8ea4');
  inked(p, (q) => {
    q.ellipse(4, 4, 3, 1.7, lv(g, 3)); q.disc(7, 3, 1.4, lv(C('#5a5e78'), 3)); q.put(8, 3, C('#e8a840')); q.hline(0, 1, 4, lv(g, 2));
    if (wing === 1) { q.line(3, 3, 1, 0, lv(g, 3.6)); q.line(4, 3, 3, 0, lv(g, 3)); } else if (wing === 2) { q.line(3, 5, 1, 6, lv(g, 2.4)); q.line(4, 5, 3, 6, lv(g, 2)); } else q.hline(2, 5, 3, lv(g, 4.4));
  });
  return p;
}
/** Disco voador dos anos 50: cúpula de vidro, casco prateado e luzes que correm. */
function saucerPx(f: number): Px {
  const p = new Px(22, 11);
  inked(p, (q) => {
    q.ellipse(11, 7, 10, 3, lv(C('#a8acb8'), 3)); q.ellipse(11, 5.6, 9, 1.6, lv(C('#c8ccd8'), 4)); q.ellipse(11, 4, 4.2, 3, lv(C('#7af0ff'), 3.4)); q.hline(8, 12, 2, lv(C('#d8ffff'), 5));
    for (let i = 0; i < 4; i++) q.put(4 + i * 4, 8, (i + f) % 3 === 0 ? C('#ffe860') : (i + f) % 3 === 1 ? C('#ff5a8c') : C('#44e8ff'));
  });
  return p;
}
/** Patinho de borracha que boia no canal. */
function duckPx(): Px {
  const p = new Px(9, 8), y = C('#f0c820');
  inked(p, (q) => { q.ellipse(4, 5, 3.6, 2.2, lv(y, 3.4)); q.disc(6, 2.6, 2, lv(y, 3.8)); q.hline(7, 9, 3, C('#f08a20')); q.put(6, 2, INK); q.hline(2, 4, 5, lv(y, 2)); });
  return p;
}
/** Disco de vinil que rola na rua (o brilho gira). */
function rollingPx(an: number): Px {
  const p = new Px(13, 13);
  inked(p, (q) => {
    q.disc(6, 6, 5.6, lv(C('#1c1a24'), 2.4)); for (const r of [2.6, 3.6, 4.6]) q.ring(6, 6, r, lv(C('#1c1a24'), 3.4));
    q.disc(6, 6, 2, C('#e03a3a')); q.put(6, 6, INK);
    q.put(Math.round(6 + Math.cos(an) * 4), Math.round(6 + Math.sin(an) * 4), lv(C('#e8e4f4'), 4)); q.put(Math.round(6 + Math.cos(an + Math.PI) * 4), Math.round(6 + Math.sin(an + Math.PI) * 4), lv(C('#e8e4f4'), 3));
  });
  return p;
}
const eggCache = new Map<string, Px>();
const egg = (k: string, make: () => Px): Px => { let p = eggCache.get(k); if (!p) { p = make(); eggCache.set(k, p); } return p; };

// ---------------------------------------------------------------- horizonte em paralaxe

export interface Sky33 {
  /** silhueta da cidade ao fundo, larga (anda a 30% da câmera) */
  far: Px; farBase: number;
  stars: [number, number, number][];
}
/** Horizonte: telhados e chaminés (1889) → mastros → blocos → torres → arranha-céus de vidro com anéis (2035). */
export function buildSky33(): Sky33 {
  const FW = Math.round(WW33 * 0.3 + 760), FH = 124, far = new Px(FW, FH);
  const ink = C('#161226');
  const col = (i: number) => lv(mix(ink, C('#2a2048'), 0.25 + (i % 3) * 0.12), 2.4);
  let x = 0, i = 0;
  while (x < FW) {
    const f = x / FW, era = Math.min(6, Math.floor(f * 7)), r = noise(i, 3, 41);
    const w = 14 + Math.floor(r * 18) + (era >= 4 ? 4 : 0), h = [28, 32, 38, 46, 62, 76, 92][era] * (0.55 + noise(i, 5, 41) * 0.55);
    const c = col(i), y0 = FH - Math.round(h);
    for (let yy = y0; yy < FH; yy++) for (let xx = x; xx < Math.min(FW, x + w); xx++) far.put(xx, yy, yy === y0 ? lv(c, 3.6) : xx === x ? lv(c, 3.4) : xx === x + w - 1 ? lv(c, 1.6) : c);
    if (era === 0) { for (let k = 0; k < 2; k++) { const cxk = x + 3 + k * 8; for (let yy = y0 - 6; yy < y0; yy++) put(far, cxk, yy, lv(c, 2.4)); } }
    if (era === 1 && i % 3 === 0) { far.vline(x + 5, y0 - 14, y0, lv(c, 3)); put(far, x + 5, y0 - 15, C('#ff4a3a')); }
    if (era >= 4) { far.vline(x + (w >> 1), y0 - 10, y0, lv(c, 3)); put(far, x + (w >> 1), y0 - 11, era === 6 ? C('#44e8ff') : C('#ff4a3a')); }
    if (era === 6 && i % 4 === 1) { for (let t2 = 0; t2 < 40; t2++) { const an = (t2 / 40) * Math.PI * 2; put(far, Math.round(x + w / 2 + Math.cos(an) * (w / 2 + 3)), Math.round(y0 - 3 + Math.sin(an) * 2.4), C('#44e8ff')); } }
    // janelas acesas (quentes antes de 1950, frias depois)
    const warm = era < 3 ? ['#ffd070', '#ffb040'] : era < 5 ? ['#ffe0a0', '#9ae0ff'] : ['#9af0ff', '#ff9ae0'];
    for (let yy = y0 + 4; yy < FH - 3; yy += 5) for (let xx = x + 3; xx < x + w - 3; xx += 4) if (noise(xx, yy, 43) > 0.62) far.put(xx, yy, C(warm[(xx + yy) % 2]));
    x += w + (era === 0 ? 0 : 1 + Math.floor(r * 3)); i++;
  }
  const stars: [number, number, number][] = [];
  for (let k = 0; k < 140; k++) stars.push([Math.floor(noise(k, 1, 55) * 2400), Math.floor(noise(k, 2, 55) * 150), k % 7]);
  return { far, farBase: Y_HOR + 8, stars };
}
const SKY_TOP = ['#0c1030', '#0c1030', '#0e1030', '#10122e', '#0a1230', '#0a1236', '#081230'].map((h) => C(h));
const SKY_BOT = ['#6a3a4a', '#6a3e48', '#58305a', '#4a2a5a', '#2a3a6a', '#3a2a7a', '#1a4a7a'].map((h) => C(h));

// ---------------------------------------------------------------- monta o mundo

export function buildWorld33(lang: 'pt' | 'en' = 'pt'): World33 {
  const P = new Px(WW33, WH33), lit = new Px(WW33, WH33);
  const a: Acc33 = { P, lit, wins: [], lang, gas: [], spots: [], cones: [], reels: [], screens: [], fixed: [], tower: [0, 0], holo: { x: 0, y: 0 }, holos: 0, crowd: [new Px(WW33, WH33), new Px(WW33, WH33)], crowdBox: [0, 0, 0, 0] };
  ground(P);
  rivers(P);
  // árvores atrás (nas folgas entre os cortes) e bancos na calçada
  const gaps: number[] = [];
  for (let i = -1; i < 7; i++) gaps.push(MARGIN33 + i * PITCH33 + PITCH33 / 2);
  gaps.forEach((gx, i) => {
    const ep = eraAtX(gx), hh = [28, 34, 36, 42, 50, 56][ep] + Math.round(noise(i, 9, 70) * 12);
    backHouse(P, gx - 4, YB33 - 4, 14, 14, hh, ep, i * 3);
    backHouse(P, gx + 14, YB33 - 1, 12, 12, hh - 9, ep, i * 3 + 1);
    tree(P, gx + 6, YB33 + 24, 1.05 + noise(i, 1, 60) * 0.2, i, eraAtX(gx) === 0 && i % 3 === 0);
    tree(P, gx - 12, YB33 + 12, 0.8, i + 20);
    if (i % 2 === 0) tree(P, gx + 18, YB33 + 8, 0.7, i + 40);
    bench(P, Math.round(gx) - 4, Y_SW1 + 8);
  });
  const rooms = [room1889, room1920, room1950, room1965, room1975, room1995, room2035];
  STOPS33.forEach((s2, i) => { rooms[i](a, s2.cx); });
  // postes (a gás → elétrico → LED) nas folgas e nas pontas; luz acende quando a onda passa
  const lamps: Lamp33[] = [];
  const lampXs = [...gaps, RIVER_C[0] - riverHW33(Y_SW1) - 24, RIVER_C[0] + riverHW33(Y_SW1) + 24, RIVER_C[1] - riverHW33(Y_SW1) - 24, RIVER_C[1] + riverHW33(Y_SW1) + 24];
  for (const lx of lampXs) {
    const ep = eraAtX(lx), kind: Lamp33['kind'] = ep === 0 ? 'gas' : ep <= 3 ? 'elec' : 'led';
    lampPost(P, Math.round(lx), Y_SW1 + 9, kind);
    lamps.push({ x: Math.round(lx) + (kind === 'elec' ? 12 : 0), y: Y_SW1 + 9 - (kind === 'gas' ? 44 : 38), kind, col: kind === 'led' ? C('#cfeaff') : kind === 'gas' ? C('#ffcf70') : C('#ffe6a0') });
  }
  // gente que anda na calçada (roupa do trecho) e carros que passam
  const walkers: Walker33[] = [], cars: Car33[] = [];
  STOPS33.forEach((s2, i) => {
    walkers.push({ stop: i, x0: s2.cx - 70, x1: s2.cx + 68, speed: 9 + (i % 3) * 3, ph: i * 0.37, seed: `wA${i}`, pose: 'walk', y: Y_WALK });
    walkers.push({ stop: i, x0: s2.cx - 40, x1: s2.cx + 74, speed: 11 + (i % 2) * 4, ph: 0.55 + i * 0.21, seed: `wB${i}`, pose: 'walk', y: Y_WALK + 1 });
    walkers.push({ stop: i, x0: s2.cx - 74, x1: s2.cx + 60, speed: 8 + (i % 4) * 2, ph: 0.2 + i * 0.13, seed: `wC${i}`, pose: 'walk', y: Y_SW2 - 1 });
    walkers.push({ stop: i, x0: s2.cx + 56, x1: s2.cx + 56, speed: 0, ph: 0, seed: `wD${i}`, pose: 'stand', y: Y_WALK });
    walkers.push({ stop: i, x0: s2.cx + 65, x1: s2.cx + 65, speed: 0, ph: 0, seed: `wE${i}`, pose: 'stand', y: Y_WALK });
    cars.push({ stop: i, lane: 1, x0: s2.cx - 74, x1: s2.cx + 74, speed: 16 + (i % 3) * 5, ph: (i * 0.29) % 1, kind: i });
    cars.push({ stop: i, lane: 2, x0: s2.cx - 74, x1: s2.cx + 74, speed: 14 + (i % 2) * 6, ph: (0.5 + i * 0.17) % 1, kind: i });
  });
  // easter eggs: gatos nos telhados (sobrado e estúdio de fita), pombos nos telhados, violonista de rua entre 1965 e 1975
  const roofY = (cx: number, u: number, side: 1 | -1): [number, number] => [Math.round(cx + side * u), YB33 + half(u) - HW33 - ROOF33 + 1];
  const eggs: World33['eggs'] = {
    cats: [roofY(STOPS33[0].cx, 30, -1), roofY(STOPS33[3].cx, 34, 1)],
    pigeons: [roofY(STOPS33[0].cx, 12, 1), roofY(STOPS33[0].cx, 18, 1), roofY(STOPS33[2].cx, 16, -1), roofY(STOPS33[2].cx, 22, -1), roofY(STOPS33[4].cx, 8, 1)],
    busker: Math.round(STOPS33[3].cx + PITCH33 / 2 + 24),
  };
  inked(P, (q) => { // estojo de violão aberto, forrado de vermelho, com moedas
    const bx = eggs.busker + 10, by = Y_WALK + 1;
    q.rect(bx, by - 4, 13, 4, lv(C('#3a2418'), 2.4)); q.rect(bx + 1, by - 3, 11, 2, lv(C('#a02a38'), 3)); q.put(bx + 3, by - 3, C('#f0d060')); q.put(bx + 7, by - 2, C('#e8e4dc')); q.put(bx + 9, by - 3, C('#f0d060'));
  });
  a.fixed.push({ x: eggs.busker, y: Y_WALK + 1, look: crowdLook27('busker', 1970), role: 'guitar', pose: 'play', dir: 'SW', year: 1970 });
  const glints = lampXs.map((x) => Math.round(x));
  return { W: WW33, H: WH33, base: P, lit, crowd: a.crowd, crowdBox: a.crowdBox, windows: a.wins, lamps, walkers, cars, fixed: a.fixed, holos: a.holos, glints, gas: a.gas, spots: a.spots, cones: a.cones, reels: a.reels, screens: a.screens, tower: a.tower, holo: a.holo, roofline: ROOFLINE33, eggs };
}

// ---------------------------------------------------------------- tempo: o que a câmera e a onda fazem

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const smooth = (x: number) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
/** Âncoras da onda: um pouco antes do 1º trecho, os 7 trechos e um pouco depois do último. */
const ANCHORS = [STOPS33[0].cx - 150, ...STOPS33.map((s) => s.cx), STOPS33[6].cx + 90];
/** Posição x da cabeça da onda para v em 0..8 (entre âncoras, devagar perto de cada trecho). */
function headOf33(v: number): number {
  const i = clamp(Math.floor(v), 0, ANCHORS.length - 2), f = clamp(v - i, 0, 1), g = f - (0.2 * Math.sin(2 * Math.PI * f)) / (2 * Math.PI);
  return ANCHORS[i] + (ANCHORS[i + 1] - ANCHORS[i]) * g;
}
export interface State33 { head: number; cam: number; fade: number; flash: number; /** 0..1 do aparecimento do logo (só na intro) */ logo: number }
/** Câmera: a cabeça da onda fica um pouco à direita do meio; sempre dentro do mundo. */
export const camOf33 = (head: number, W: number): number => clamp(Math.round(head - W * 0.5 - W * 0.04), 0, WW33 - W);
/** Fundo da tela inicial: u = 0..1 do loop. Escurece nas pontas, a onda vai do 1889 ao 2035, o fim acende e apaga. */
export function homeState33(u: number, W: number): State33 {
  const p = clamp((u - 0.03) / 0.83, 0, 1), head = headOf33(p * (ANCHORS.length - 1));
  const flash = u < 0.86 ? 0 : u < 0.93 ? smooth((u - 0.86) / 0.07) * 0.55 : 0.55 * (1 - smooth((u - 0.93) / 0.05));
  const fade = u < 0.04 ? 1 - smooth(u / 0.04) : u > 0.95 ? smooth((u - 0.95) / 0.05) : 0;
  return { head, cam: camOf33(head, W), fade, flash, logo: 0 };
}
/** Quadro parado do fundo (movimento reduzido): a onda já acendeu a rua até o palco de 1975. */
export function stillHome33(W: number): State33 {
  const head = STOPS33[4].cx + 50;
  return { head, cam: camOf33(head, W), fade: 0, flash: 0, logo: 0 };
}
/** Trecho que representa um ano de início de partida (as 6 faixas de época do jogo; a faixa 1950–69 tem dois). */
export function stopOfYear33(year: number): number {
  const ep = ep5Of(year);
  return ep === 0 ? 0 : ep === 1 ? 1 : ep === 2 ? (year < 1960 ? 2 : 3) : ep === 3 ? 4 : ep === 4 ? 5 : 6;
}
export interface Intro33Plan { start: number; end: number; walkMs: number; totalMs: number; stop: number }
/** Roteiro da intro da partida: o herói anda do 1889 (ou de perto) até o trecho do ano escolhido e para; depois o texto. */
export function intro33Plan(year: number): Intro33Plan {
  const stop = stopOfYear33(year), end = STOPS33[stop].cx, start = Math.min(ANCHORS[0], end - 300);
  const walkMs = clamp(Math.round(((end - start) / 62) * 1000), 6000, 9000);
  return { start, end, walkMs, totalMs: walkMs + 5200 + 1000, stop };
}
export interface Hero33 { x: number; look: Appearance; year: number; walking: boolean; stride: number }
/** Estado da intro da partida no instante `ms`. */
export function introState33(ms: number, W: number, plan: Intro33Plan): State33 & { hero: number; walking: boolean } {
  const wp = clamp(ms / plan.walkMs, 0, 1), e = 0.8 * wp + 0.2 * smooth(wp), hero = plan.start + (plan.end - plan.start) * e;
  const rest = clamp((ms - plan.walkMs) / 1500, 0, 1), head = Math.min(hero - 26, plan.end - 26) + smooth(rest) * 96;
  const fade = ms > plan.totalMs - 1000 ? smooth((ms - (plan.totalMs - 1000)) / 1000) : ms < 400 ? 1 - smooth(ms / 400) : 0;
  return { head, cam: camOf33(hero, W), fade, flash: 0, logo: 0, hero, walking: ms < plan.walkMs };
}

// ---------------------------------------------------------------- o quadro

export interface View33 { W: number; H: number; cam: number; /** linha da tela onde está a linha 0 do mundo */ y0: number }
export interface FrameOpts33 {
  /** tempo em segundos (0 = quadro parado, movimento reduzido) */
  t: number;
  state: State33;
  hero?: Hero33 | null;
  /** número do ano no alto (intro) */
  yearTag?: number | null;
  /** logo MASTERS em Px (intro) */
  logo?: Px | null;
}

const spriteCache = new WeakMap<object, Px>();
/** Sprite do boneco como Px (no node o canvas já é o próprio Px; no navegador lê os pixels uma vez). */
function spritePx(c: unknown): Px {
  if (c instanceof Px) return c;
  const hit = spriteCache.get(c as object);
  if (hit) return hit;
  const cv = c as HTMLCanvasElement, g = cv.getContext('2d')!, im = g.getImageData(0, 0, cv.width, cv.height), p = new Px(cv.width, cv.height);
  p.d.set(new Uint32Array(im.data.buffer.slice(0)));
  spriteCache.set(cv, p);
  return p;
}
const sprite33 = (look: Appearance, year: number, role: string | null, pose: Pose, dir: Dir, frame: number) => {
  const sp = avatarSprite(look, { year, role: role as never, pose, dir, frame: pose === 'walk' || pose === 'play' ? frame : 0 });
  return { p: spritePx(sp.c), ax: sp.ax, ay: sp.ay };
};
const carCache = new Map<string, Px>();
const car33 = (kind: number, flip: boolean): Px => {
  const k = `${kind}|${flip ? 1 : 0}`;
  let p = carCache.get(k);
  if (!p) {
    const base = carPx(kind, (kind * 0.37) % 1);
    if (flip) { p = new Px(base.w, base.h); p.blit(base, 0, 0, true); } else p = base;
    carCache.set(k, p);
  }
  return p;
};
/** holograma da cantora: 4 quadros do passo, recoloridos como o holo5 da tela do palco */
const holoCache = new Map<number, Px>();
function holoFrame33(f: number): Px {
  let p = holoCache.get(f);
  if (p) return p;
  const s = sprite33(SINGER33, 2035, 'vocal', 'play', 'SE', f).p;
  p = new Px(s.w, s.h);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const c = s.get(x, y);
    if (!(c >>> 24)) continue;
    const [r, g, b] = holoRgb5(c & 255, (c >> 8) & 255, (c >> 16) & 255, y < s.h * 0.45);
    p.put(x, y, ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0);
  }
  p.outline(C('#1c7ab0'));
  holoCache.set(f, p);
  return p;
}

const mixTo = (out: Px, c: Col, k: number): void => {
  if (k <= 0) return;
  const d = out.d, r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
  for (let i = 0; i < d.length; i++) { const o = d[i]; d[i] = ((255 << 24) | (Math.round(((o >> 16) & 255) + (b - ((o >> 16) & 255)) * k) << 16) | (Math.round(((o >> 8) & 255) + (g - ((o >> 8) & 255)) * k) << 8) | Math.round((o & 255) + (r - (o & 255)) * k)) >>> 0; }
};
/** halo redondo suave (pontilhado nas bordas): luz de poste, lanterna, chama */
function halo(out: Px, x: number, y: number, r: number, c: Col, a: number, sy = 1): void {
  for (let dy = -Math.ceil(r * sy); dy <= Math.ceil(r * sy); dy++) for (let dx = -r; dx <= r; dx++) {
    const d = Math.hypot(dx, dy / sy) / r;
    if (d >= 1) continue;
    const k = (1 - d) * (1 - d) * a;
    if (k > 2) out.set(x + dx, y + dy, withAlpha(c, Math.round(k)));
  }
}
/** nota musical em pixel (5×8): cabeça, haste e bandeira */
function note(out: Px, x: number, y: number, c: Col, a: number): void {
  const w = withAlpha(c, a);
  for (const [dx, dy] of [[0, 6], [1, 6], [0, 7], [1, 7], [2, 6], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [3, 1], [4, 2], [4, 3]]) out.set(x + dx, y + dy, w);
}

/** Monta um quadro inteiro em `out` (View33.W × H). Puro. */
export function frame33(w: World33, sky: Sky33, out: Px, v: View33, o: FrameOpts33): void {
  const { W, H, cam, y0 } = v, t = o.t, head = o.state.head, d = out.d;
  const act = (i: number) => clamp((head - (STOPS33[i].cx - 80)) / 70, 0, 1);
  // ---- céu (degradê pontilhado que muda com a época), estrelas, lua de vinil
  const f6 = clamp((cam + W / 2 - STOPS33[0].cx) / PITCH33, 0, 6), si = Math.min(5, Math.floor(f6)), sf = f6 - si;
  const top = mix(SKY_TOP[si], SKY_TOP[si + 1], sf), bot = mix(SKY_BOT[si], SKY_BOT[si + 1], sf);
  const hy = y0 + sky.farBase + 14, N = 14, lvls: Col[] = [];
  for (let k = 0; k <= N; k++) lvls.push(mix(top, bot, Math.pow(k / N, 1.7)));
  for (let y = 0; y < H; y++) {
    const g = clamp((y / hy) * N, 0, N - 0.001), k = Math.floor(g), fr = g - k;
    const pat = [0, 1, 2, 3].map((xm) => (y >= hy ? lvls[N] : dith(xm, y, fr) ? lvls[k + 1] : lvls[k])), row = y * W;
    for (let x = 0; x < W; x++) d[row + x] = pat[x & 3];
  }
  const sx = Math.floor(cam * 0.08);
  for (const [x, y, k] of sky.stars) {
    const X = ((x - sx) % 2400 + 2400) % 2400;
    if (X >= W || y + 0 >= hy - 20 || y < 0) continue;
    const tw = t ? (Math.floor(t * 2 + k) % 4 === 0 ? 0 : 1) : 1;
    if (tw) out.put(X, y + Math.max(0, y0 - 28), k % 3 ? C('#9aa8d8') : C('#ffffff'));
  }
  const year = yearAt33(cam + W / 2), mx = Math.round(W * 0.82 - cam * 0.05), my = Math.round(hy * 0.34), mr = Math.max(9, Math.round(H * 0.07));
  if (mx > -mr && mx < W + mr) {
    discV(out, mx, my, mr, C('#1c1a24'));
    for (let r = Math.round(mr * 0.45); r < mr - 1; r += 3) out.ring(mx, my, r, C('#2a2834'));
    for (let an = 200; an < 250; an += 3) out.put(mx + Math.round(Math.cos((an * Math.PI) / 180) * (mr - 3)), my + Math.round(Math.sin((an * Math.PI) / 180) * (mr - 3)), C('#5a5870'));
    discV(out, mx, my, Math.round(mr * 0.35), C(year < 1975 ? '#c0392b' : year < 2005 ? '#f0c040' : '#2ec8c0'));
    out.put(mx, my, C('#0a0a10'));
  }
  // ---- horizonte (anda devagar)
  {
    const fx0 = Math.floor(cam * 0.3), by = y0 + sky.farBase + 4 - sky.far.h;
    for (let y = 0; y < sky.far.h; y++) { const Y = by + y; if (Y < 0 || Y >= H) continue; for (let x = 0; x < W; x++) { const c = sky.far.d[y * sky.far.w + fx0 + x]; if (c) d[Y * W + x] = mix(c, bot, 0.18 + Math.max(0, (y - 80) / 140)); } }
  }
  // ---- easter egg: um disco voador cruza o céu quando a onda passa pelos anos 50
  {
    const a0 = STOPS33[2].cx - 90, b0 = STOPS33[3].cx + 60, pr = clamp((head - a0) / (b0 - a0), 0, 1);
    if (pr > 0.03 && pr < 0.97) {
      const sx2 = Math.round(-26 + pr * (W + 52)), sy2 = Math.round(H * 0.1 + Math.sin(pr * 11) * 6 + pr * 8), fl = Math.floor(t * 8);
      out.blit(egg(`ufo${fl % 3}`, () => saucerPx(fl % 3)), sx2 - 11, sy2);
      if (fl % 11 < 3) out.poly([[sx2 - 3, sy2 + 9], [sx2 + 3, sy2 + 9], [sx2 + 9, sy2 + 40], [sx2 - 9, sy2 + 40]], withAlpha(C('#9af0ff'), 34)); // raio de luz que pisca
    }
  }
  // ---- mundo fixo
  const blitWorld = (src: Px, sx0: number, sy0: number, sw: number, sh: number, dx: number, dy: number, a = 1): void => {
    for (let y = 0; y < sh; y++) { const Y = dy + y; if (Y < 0 || Y >= H) continue; for (let x = 0; x < sw; x++) { const X = dx + x; if (X < 0 || X >= W) continue; const c = src.d[(sy0 + y) * src.w + sx0 + x]; if (!c) continue; if (a >= 1 && c >>> 24 === 255) d[Y * W + X] = c; else out.set(X, Y, a >= 1 ? c : withAlpha(c, Math.round((c >>> 24) * a))); } }
  };
  blitWorld(w.base, cam, 0, W, Math.min(w.H, H - y0), 0, y0);
  { // abaixo do mundo: a água do canal continua, escurecendo
    const yb = y0 + w.H;
    if (yb < H && yb > 0) for (let y = yb; y < H; y++) for (let x = 0; x < W; x++) d[y * W + x] = mix(d[(yb - 1) * W + x], C('#06080e'), Math.min(0.85, 0.3 + (y - yb) * 0.04));
  }
  const X = (x: number) => Math.round(x - cam), Y = (y: number) => Math.round(y + y0);
  const seen = (x: number, m = 30) => x > cam - m && x < cam + W + m;
  // ---- reflexos na água, brilho que corre
  for (const gx of w.glints) {
    if (!seen(gx)) continue;
    const lit = clamp((head - gx + 20) / 30, 0, 1);
    for (let k = 0; k < 7; k++) { const yy = Y(Y_EMB + 15 + k * 5), off = Math.round(Math.sin(t * 1.6 + k * 1.9 + gx) * 2); out.hline(X(gx) + off - 1, X(gx) + off + 1, yy, withAlpha(C('#ffd890'), Math.round(110 * lit * (1 - k / 8)))); }
  }
  for (let k = 0; k < 40; k++) { const gx = Math.floor(noise(k, Math.floor(t * 2), 77) * W), gy = Y(Y_EMB + 14) + Math.floor(noise(k, 3, Math.floor(t * 2)) * 36); if (gy < H) out.set(gx, gy, withAlpha(C('#8ab8ff'), 90)); }
  // ---- easter eggs do chão: patinho no canal, disco que rola na pista, gatos e pombos nos telhados
  {
    const dx = STOPS33[1].cx + 50 + Math.sin(t * 0.35) * 34, dy = Y_EMB + 24 + Math.round(Math.sin(t * 2.1) * 0.8);
    if (seen(dx)) { out.ring(X(dx) + 4, Y(dy) + 7, 7 + ((t * 5) % 4), withAlpha(C('#d8e8ff'), 70)); out.blit(egg('duck', duckPx), X(dx), Y(dy)); }
    const rx = STOPS33[2].cx - 110 + ((t * 24) % 240), an = rx * 0.35;
    if (seen(rx)) { out.ellipse(X(rx) + 6, Y(Y_CAR2) + 1, 6, 1.6, withAlpha(C('#06080e'), 100)); out.blit(egg(`rec${Math.floor((an * 2) % 6)}`, () => rollingPx(Math.floor((an * 2) % 6) / 2)), X(rx), Y(Y_CAR2) - 12); }
    w.eggs.cats.forEach(([x, y], i) => { if (seen(x)) { const f = t ? (Math.floor(t * 1.6 + i * 2) % 6 < 3 ? 0 : Math.floor(t * 3) % 2 + 1) : 0; out.blit(egg(`cat${f}`, () => catPx(f)), X(x) - 6, Y(y) - 12); } });
    w.eggs.pigeons.forEach(([x, y], i) => {
      if (!seen(x)) return;
      const pr = (head - (x - 24 - i * 7)) / 150;
      if (pr <= 0) { out.blit(egg('pg0', () => pigeonPx(0)), X(x) - 4, Y(y) - 6); return; }
      if (pr >= 1) return; // já foi embora
      const wing = Math.floor(t * 12 + i) % 2 ? 1 : 2, fx2 = x + pr * 120 + Math.sin(i) * 20, fy2 = y - 4 - pr * 70 - Math.sin(pr * 6) * 4;
      out.blit(egg(`pg${wing}`, () => pigeonPx(wing as 1 | 2)), Math.round(X(fx2)) - 4, Math.round(Y(fy2)) - 4, false, pr > 0.8 ? (c) => withAlpha(c, Math.round((c >>> 24) * (1 - pr) * 5)) : undefined);
    });
    const bx2 = w.eggs.busker; // notinhas que sobem do violonista de rua
    if (seen(bx2)) for (let k = 0; k < 3; k++) { const rise = (t * 9 + k * 8) % 24; note(out, X(bx2) - 14 + k * 10 + Math.round(Math.sin(t * 2 + k) * 2), Y(Y_WALK) - 40 - Math.round(rise), lv(waveColAt33(bx2), 4.4), Math.round(210 * (1 - rise / 24))); }
  }
  // ---- janelas que acendem quando a onda passa
  for (const wn of w.windows) {
    if (!seen(wn.x, 20)) continue;
    const a = clamp((head - (wn.x + wn.w / 2) - 4 - (wn.k % 4) * 5) / 14, 0, 1);
    if (a <= 0) continue;
    blitWorld(w.lit, wn.x, wn.y, wn.w, wn.h, X(wn.x), Y(wn.y), a);
    halo(out, X(wn.x + wn.w / 2), Y(wn.y + wn.h / 2), 11, C('#ffc860'), Math.round(34 * a));
  }
  // ---- ribalta a gás (1889): chamas que tremulam
  w.gas.forEach(([x, y], i) => {
    if (!seen(x)) return;
    const a = act(0), k = t ? (Math.floor(t * 9) + i * 3) % 5 : 1, hgt = k === 0 ? 3 : 2;
    out.rect(X(x), Y(y) - hgt + 1, 1, hgt, k % 2 ? C('#ffd27a') : C('#ffb040')); out.put(X(x), Y(y), C('#fff4c0'));
    halo(out, X(x), Y(y) - 1, 6, C('#ffc060'), Math.round(60 * Math.max(a, 0.5)));
  });
  // ---- cones dos abajures do estúdio de fita
  for (const [x, y, len, c] of w.cones) {
    if (!seen(x)) continue;
    const a = 0.3 + 0.7 * act(3);
    out.poly([[X(x) - 2, Y(y)], [X(x) + 2, Y(y)], [X(x) + 10, Y(y) + len], [X(x) - 10, Y(y) + len]], withAlpha(c, Math.round(26 * a)));
  }
  // ---- luzes do palco (1975): fachos coloridos que balançam
  {
    const a = act(4), cx4 = STOPS33[4].cx, tx = cx4 + 2, ty = YB33 + L33 - 6;
    if (a > 0 && seen(cx4, 80)) w.spots.forEach(([x, y, c], i) => {
      const sway = t ? Math.round(Math.sin(t * 1.3 + i * 1.7) * 9) : 0;
      out.poly([[X(x) - 2, Y(y)], [X(x) + 2, Y(y)], [X(tx) + sway + 11, Y(ty)], [X(tx) + sway - 11, Y(ty)]], withAlpha(c, Math.round(54 * a)));
      halo(out, X(tx) + sway, Y(ty), 9, c, Math.round(46 * a), 0.4);
    });
  }
  // ---- carretéis, telas e a torre de rádio
  const rA = act(3);
  for (const [x, y] of w.reels) {
    if (!seen(x)) continue;
    const an = t * 3.2 * rA;
    for (let k = 0; k < 3; k++) { const ang = an + (k * 2 * Math.PI) / 3; out.line(X(x), Y(y), X(x) + Math.round(Math.cos(ang) * 3), Y(y) + Math.round(Math.sin(ang) * 3), C('#16161c')); }
  }
  for (const [x, y, sw, sh, kind] of w.screens) {
    if (!seen(x)) continue;
    const st = kind === SCR33.jb ? 2 : kind === SCR33.mon ? 5 : 6, a = act(st);
    const bx = X(x), by = Y(y);
    if (kind === SCR33.jb) {
      const cols = ['#ff4a4a', '#ffa83c', '#ffe860', '#5ae070', '#44e8ff', '#ff44c4'];
      for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) out.put(bx + i, by + j, i === 0 || i === sw - 1 ? lv(C('#b8bcc4'), 3.6) : lv(C(cols[(j + i + Math.floor(t * 6 * a)) % cols.length]), a > 0 ? 3.6 : 1.4));
    } else if (kind === SCR33.mon) {
      out.rect(bx, by, sw, sh, C('#06182a'));
      for (let i = 0; i < sw; i++) { const yy = Math.round(sh / 2 + Math.sin(i * 0.9 + t * 4) * (sh / 2 - 1) * a); out.put(bx + i, by + clamp(yy, 0, sh - 1), C(i % 4 ? '#44e8ff' : '#9af0ff')); }
      out.hline(bx, bx + sw - 1, by + sh - 1, lv(C('#44e8ff'), 1.6));
    } else {
      out.rect(bx, by, sw, sh, C('#14083a'));
      for (let i = 0; i < sw; i += 2) { const hh = Math.round((0.3 + 0.7 * Math.abs(Math.sin(i * 0.8 + t * 3.1))) * (sh - 1) * Math.max(0.35, a)); out.rect(bx + i, by + sh - hh, 1, hh, i % 4 === 0 ? C('#ff44c4') : C('#44e8ff')); }
    }
  }
  {
    const a = act(1), [tx, ty] = w.tower;
    if (a > 0 && seen(tx, 40)) {
      for (let k = 0; k < 3; k++) { // ondas de rádio que saem do alto
        const r = ((t * 14 + k * 9) % 27) + 2, al = Math.round(140 * (1 - r / 29) * a);
        for (let an = -2.6; an <= -0.54; an += 0.07) out.set(X(tx) + Math.round(Math.cos(an) * r), Y(ty) + Math.round(Math.sin(an) * r * 0.8), withAlpha(C('#ffe090'), al));
      }
      const n = Math.floor(t * 14);
      for (let k = 0; k < 4; k++) { // faíscas: raios curtos em zigue-zague
        const an = noise(n, k, 91) * Math.PI * 2, len = 5 + noise(n, k, 92) * 8;
        let px0 = X(tx), py0 = Y(ty);
        for (let sgm = 1; sgm <= 3; sgm++) { const nx = X(tx) + Math.round(Math.cos(an + (noise(n, sgm + k, 93) - 0.5) * 1.2) * len * (sgm / 3)), ny = Y(ty) + Math.round(Math.sin(an + (noise(n, sgm + k, 94) - 0.5) * 1.2) * len * (sgm / 3)); out.line(px0, py0, nx, ny, sgm === 3 ? C('#ffffff') : C('#ffe860')); px0 = nx; py0 = ny; }
      }
      halo(out, X(tx), Y(ty), 9, C('#ffe090'), Math.round(60 * a));
    }
  }
  // ---- plateia do palco: as duas fileiras pulam em quadros alternados
  if (w.crowdBox[2] && seen(w.crowdBox[0], 60)) {
    const [bx, by, bw, bh] = w.crowdBox, j = t ? Math.floor(t * 4) : 0;
    blitWorld(w.crowd[0], bx, by, bw, bh, X(bx), Y(by) - (j % 2 ? 1 : 0));
    blitWorld(w.crowd[1], bx, by, bw, bh, X(bx), Y(by) - ((j + 1) % 2 ? 1 : 0));
  }
  // ---- gente fixa dos cortes (músicos, pianista, engenheiros), na ordem do fundo para a frente
  const frame4 = t ? Math.floor(t * 5) % 4 : 1;
  const actors = [...w.fixed].sort((p, q) => p.y - q.y);
  for (const f of actors) {
    if (!seen(f.x, 40) || f.holo) continue;
    const s = sprite33(f.look, f.year, f.role, f.pose, f.dir, f.pose === 'play' ? frame4 : 0);
    out.blit(s.p, X(f.x) - s.ax, Y(f.y) - s.ay);
  }
  // ---- carros e gente andando (com sombra no chão), do fundo para a frente
  type Item = { y: number; draw: () => void };
  const items: Item[] = [];
  for (const c of w.cars) {
    const span = c.x1 - c.x0, pos = ((t * c.speed) / span + c.ph) % 1, x = c.lane === 1 ? c.x0 + pos * span : c.x1 - pos * span, y = c.lane === 1 ? Y_CAR1 : Y_CAR2;
    if (!seen(x, 50)) continue;
    const a = Math.min(1, pos / 0.12, (1 - pos) / 0.12), sp = car33(c.kind, c.lane === 2);
    items.push({ y, draw: () => {
      out.ellipse(X(x), Y(y) + 1, sp.w / 2 - 2, 2, withAlpha(C('#06080e'), 90));
      out.blit(sp, X(x) - (sp.w >> 1), Y(y) - sp.h + 1, false, a >= 1 ? undefined : (col) => withAlpha(col, Math.round((col >>> 24) * a)));
      if (c.kind >= 1) halo(out, X(x) + (c.lane === 1 ? sp.w / 2 + 3 : -sp.w / 2 - 3), Y(y) - 5, 6, C('#fff2c0'), Math.round(60 * a));
    } });
  }
  for (const wk of w.walkers) {
    const span = wk.x1 - wk.x0;
    let x = wk.x0, dir: Dir = 'SE';
    if (span > 0) { const pos = ((t * wk.speed) / span + wk.ph) % 2; x = wk.x0 + (pos < 1 ? pos : 2 - pos) * span; dir = pos < 1 ? 'SE' : 'SW'; } else dir = wk.seed.charCodeAt(2) % 2 ? 'SW' : 'SE';
    if (!seen(x, 30) || (o.hero && Math.abs(x - o.hero.x) < 22)) continue; // ninguém colado no protagonista
    const yr = STOPS33[wk.stop].year, s = sprite33(crowdLook27(wk.seed, yr), yr, null, wk.pose, dir, t ? Math.floor(t * 6 + wk.ph * 10) % 4 : 1);
    items.push({ y: wk.y, draw: () => { out.ellipse(X(x), Y(wk.y), 5, 2, withAlpha(C('#06080e'), 90)); out.blit(s.p, X(x) - s.ax, Y(wk.y) - s.ay); } });
  }
  if (o.hero) {
    const hh = o.hero, s = sprite33(hh.look, hh.year, null, hh.walking ? 'walk' : 'stand', 'SE', hh.walking ? Math.floor(hh.stride) % 4 : 0);
    items.push({ y: Y_WALK + 2, draw: () => {
      const fx2 = X(hh.x), fy2 = Y(Y_WALK + 2), gold = waveColAt33(hh.x);
      out.poly([[fx2 - 7, fy2 - 70], [fx2 + 7, fy2 - 70], [fx2 + 26, fy2 + 1], [fx2 - 26, fy2 + 1]], withAlpha(lv(gold, 4.6), 52)); // foco de luz que acompanha o protagonista
      halo(out, fx2, fy2, 24, lv(gold, 4.4), 190, 0.4);
      out.ellipse(fx2, fy2, 7, 2.6, withAlpha(C('#06080e'), 120));
      const rim = (c: Col) => ((c >>> 24) > 60 ? withAlpha(lv(gold, 5), 235) : 0); // contorno de luz dourada em volta dele
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) out.blit(s.p, fx2 - s.ax + ox, fy2 - s.ay + oy, false, rim);
      out.blit(s.p, fx2 - s.ax, fy2 - s.ay);
    } });
  }
  items.sort((p, q) => p.y - q.y).forEach((it) => it.draw());
  // ---- luz dos postes (acendem quando a onda passa)
  for (const lp of w.lamps) {
    if (!seen(lp.x, 30)) continue;
    const on = clamp((head - lp.x + 20) / 30, 0, 1);
    if (on <= 0) continue;
    const fl = lp.kind === 'gas' ? 0.8 + 0.2 * (t ? noise(Math.floor(t * 8), lp.x, 5) : 1) : 1;
    halo(out, X(lp.x), Y(lp.y) + 2, 20, lp.col, Math.round(54 * on * fl));
    halo(out, X(lp.x) - (lp.kind === 'elec' ? 12 : 0), Y(Y_SW1 + 9), 15, lp.col, Math.round(34 * on * fl), 0.3);
    out.put(X(lp.x), Y(lp.y), lv(lp.col, 5));
  }
  // ---- holograma: UM só, no trecho de 2035
  if (w.holos && seen(w.holo.x, 60)) {
    const a = 0.25 + 0.75 * act(6), fr = holoFrame33(t ? Math.floor(t * 5) % 4 : 1), hx = w.holo.x, hy = w.holo.y;
    const pulse = t ? 0.88 + 0.12 * Math.abs(Math.sin(t * 2.2)) : 0.96, jump = t && Math.floor(t * 12) % 23 < 2 ? (Math.floor(t * 12) % 2 ? 2 : -2) : 0;
    out.poly([[X(hx) - 11, Y(hy) - 1], [X(hx) + 11, Y(hy) - 1], [X(hx) + 16, Y(hy) - 54], [X(hx) - 16, Y(hy) - 54]], withAlpha(C('#7af0ff'), Math.round(22 * pulse * a)));
    const rs = t ? (t * 12) % 40 : 14;
    for (const [dy, rr] of [[8 + (rs % 30), 13], [22 + ((rs * 0.7) % 26), 11], [38 + ((rs * 0.5) % 16), 9]] as const) for (let an = 0; an < 6.283; an += 0.07) out.set(X(hx) + Math.round(Math.cos(an) * rr), Y(hy) - Math.round(dy) + Math.round(Math.sin(an) * rr * 0.34), withAlpha(C('#9af0ff'), Math.round(150 * a * (1 - dy / 60))));
    const dx = X(hx) - 12 + jump, dy0 = Y(hy) - 31;
    for (let y = 0; y < fr.h; y++) { const dim = (y + (t ? Math.floor(t * 20) : 0)) % 4 === 0 ? 0.66 : 1; for (let x = 0; x < fr.w; x++) { const c = fr.d[y * fr.w + x]; if (c) out.set(dx + x, dy0 + y, withAlpha(c, Math.round(255 * 0.96 * pulse * a * dim))); } }
    if (t) { const r = Math.floor(fr.h - 1 - ((t * 24) % (fr.h + 8))); if (r >= 0) for (let x = 0; x < fr.w; x++) { const c = fr.d[r * fr.w + x]; if (c) out.set(dx + x, dy0 + r, withAlpha(C('#e0ffff'), Math.round(230 * a))); } }
    halo(out, X(hx), Y(hy) - 14, 22, C('#44e8ff'), Math.round(40 * a * pulse));
  }
  // ---- a onda de som de luz
  if (head > cam - 20) {
    const trail = W * 1.15, x1 = Math.min(head, cam + W + 2), x0 = Math.max(cam - 2, head - trail);
    let py = 0;
    for (let xw = Math.floor(x0); xw <= x1; xw++) {
      const yy = Y_WAVE + 11 * (0.8 * Math.sin(xw * 0.058 - t * 2.4) + 0.35 * Math.sin(xw * 0.131 + t * 1.7)), yr = Math.round(yy) + y0, col = waveColAt33(xw);
      const k = clamp(1 - (head - xw) / trail, 0.22, 1) * (xw > head - 14 ? 1 : 1), cx = xw - cam;
      const ya = xw === Math.floor(x0) ? yr : py;
      for (let y = Math.min(ya, yr); y <= Math.max(ya, yr); y++) { const A = (c2: Col, q: number) => withAlpha(c2, Math.round(255 * q * k)); out.set(cx, y, A(lv(col, 5), 1)); out.set(cx, y + 1, A(lv(col, 5), 1)); out.set(cx, y - 1, A(lv(col, 4), 1)); out.set(cx, y + 2, A(col, 1)); out.set(cx, y - 2, A(col, 0.8)); out.set(cx, y + 3, A(col, 0.6)); out.set(cx, y - 3, A(col, 0.35)); out.set(cx, y + 4, A(col, 0.3)); out.set(cx, y - 4, A(col, 0.15)); }
      if (xw % 2 === 0) for (let g = 5; g < 12; g++) { const al = Math.round(34 * k * (1 - g / 12)); out.set(cx, yr - g, withAlpha(col, al)); out.set(cx, yr + g + 1, withAlpha(col, al)); }
      py = yr;
    }
    // notas que sobem da onda e brilho na ponta
    for (let k = 0; k < 14; k++) {
      const xn = head - 24 - k * 41 - ((t * 22) % 41), rise = ((t * 11 + k * 7) % 22), yy = Y_WAVE + 11 * (0.8 * Math.sin(xn * 0.058 - t * 2.4) + 0.35 * Math.sin(xn * 0.131 + t * 1.7));
      if (xn < cam - 6 || xn > cam + W) continue;
      note(out, Math.round(xn - cam), Math.round(yy + y0 - 16 - rise), lv(waveColAt33(xn), 4.6), Math.round(220 * (1 - rise / 24) * clamp(1 - (head - xn) / trail, 0.2, 1)));
    }
    if (head < cam + W + 6) {
      const hx = Math.round(head - cam), hyy = Math.round(Y_WAVE + y0 + 11 * (0.8 * Math.sin(head * 0.058 - t * 2.4) + 0.35 * Math.sin(head * 0.131 + t * 1.7))), hc = waveColAt33(head);
      halo(out, hx, hyy, 16, hc, 120); out.hline(hx - 5, hx + 5, hyy, C('#ffffff')); out.vline(hx, hyy - 5, hyy + 5, C('#ffffff')); out.rect(hx - 1, hyy - 1, 3, 3, C('#ffffff'));
      for (let k = 0; k < 7; k++) { const sa = noise(Math.floor(t * 12), k, 31) * 6.283, sr = 4 + noise(Math.floor(t * 12), k, 32) * 10; out.set(hx + Math.round(Math.cos(sa) * sr), hyy + Math.round(Math.sin(sa) * sr), withAlpha(lv(hc, 5), 230)); }
    }
  }
  // ---- fecho: clarão da cor da onda, escuro, número do ano, logo
  if (o.state.flash > 0) mixTo(out, mix(waveColAt33(head), C('#ffffff'), 0.55), o.state.flash);
  if (o.yearTag) {
    const txt = String(o.yearTag), sc = Math.max(2, Math.round(H / 90)), x = Math.round(Math.max(8, W * 0.05)), y = Math.round(H * 0.8), col = waveColAt33(head);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [sc, sc], [sc, 0], [0, sc]] as const) drawText(out, txt, x + dx, y + dy, INK, sc);
    drawText(out, txt, x, y, lv(col, 4.4), sc);
  }
  if (o.logo && o.state.logo > 0) {
    const lg = o.logo, s = clamp(Math.floor((W * 0.46) / lg.w), 1, 6), lx = Math.round(W / 2 - (lg.w * s) / 2), ly = Math.round(H * 0.38 - (lg.h * s) / 2), a = o.state.logo;
    for (let y = 0; y < lg.h; y++) for (let x = 0; x < lg.w; x++) { const c = lg.d[y * lg.w + x]; if (c) out.rect(lx + x * s, ly + y * s, s, s, withAlpha(c, Math.round(255 * a))); }
  }
  mixTo(out, C('#06080e'), o.state.fade);
}
