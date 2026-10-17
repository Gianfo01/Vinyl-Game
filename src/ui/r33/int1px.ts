// R33 · INT-1 (arte) — INTERIORES PRÓPRIOS em pixel art, no corte da sede (hqpx27/interior27): escola de música, fábrica de
// discos, museu, plataforma de streaming, agência de turnê e filial. Desenhados por código, luz de cima à esquerda, contorno INK
// feito pelo mesmo acabamento dos adereços do interior27 (o `extra` entra na camada contornada), luz/vidro/vapor em camada
// translúcida (sem contorno), mobília e máquinas mudam com as 6 faixas de época (`ep5Of`).
//   interior33(k, ano, n)  — PURO: lugares das pessoas e adereços do balcão (frações da sala);
//   LAY33                  — onde cada objeto clicável fica (frações x, largura), usado pela pintura e pelo modelo;
//   paintInt33(k, ano)     — PURO: pinta os adereços (gancho `extra` de paintInterior27);
//   crop33 / drawInterior33 — recorta céu e rua: a cena preenche a área (QA5: "pequena, com muito vazio em volta").

import type { IntK33 } from '../../sim/sys/place27';
import { geom27, drawInterior27, type IDrawOpts27, type Interior27, type ISpot27, type IDrawn27, type Prop27, type Zone27 } from '../pixel/interior27';
import type { Person27 } from '../../sim/sys/place27';
import type { Pose } from '../pixel/avatar';
import { ep5Of } from '../pixel/exp5px';
import { C, INK, lv, mix, noise, tint, withAlpha, type Col, type Px } from '../pixel/px';
import { inst31 } from '../pixel/stage31px';
import { prim27, type Ctx27 } from '../ps/hqpx27';

const blk = prim27.blk;
const sp = (x: number, z: Zone27, pose: Pose = 'stand', dir: 'SE' | 'SW' = 'SE'): ISpot27 => ({ x, z, pose, dir });

// ---------------------------------------------------------------- layout (frações da largura da sala: x, largura)

/** Onde cada objeto fica. A mesma tabela serve à pintura e aos pontos clicáveis (sem número solto nos dois lados). */
export const LAY33: Record<IntK33, Record<string, [number, number]>> = {
  school: { board: [0.04, 0.3], stands: [0.05, 0.27], piano: [0.38, 0.27], metro: [0.67, 0.04], rack: [0.72, 0.13], era: [0.87, 0.1], door: [0.93, 0.06] },
  plant: { hopper: [0.03, 0.16], press: [0.22, 0.29], belt: [0.53, 0.2], qc: [0.76, 0.13], ship: [0.9, 0.08], pipes: [0.0, 1.0] },
  museum: { gold: [0.04, 0.2], case0: [0.28, 0.13], case1: [0.44, 0.13], case2: [0.6, 0.13], ticket: [0.8, 0.17], portraits: [0.3, 0.42] },
  platform: { rack: [0.03, 0.29], ac: [0.9, 0.09], wall: [0.36, 0.3], desk: [0.4, 0.26], chart: [0.7, 0.17], lounge: [0.9, 0.08] },
  agency: { map: [0.04, 0.3], desks: [0.37, 0.34], wall: [0.62, 0.15], posters: [0.78, 0.12], filing: [0.92, 0.05] },
  branch: { clocks: [0.04, 0.26], map: [0.33, 0.3], desks: [0.06, 0.4], reception: [0.65, 0.2], flags: [0.69, 0.1], filing: [0.9, 0.06] },
};

/** Interior (modelo puro) dos novos lugares: sem adereços de `interior27` (a pintura é do `extra`), só o balcão onde há um. */
export function interior33(k: IntK33, year: number, n = 4): Interior27 {
  const props: Prop27[] = [];
  let spots: ISpot27[] = [];
  let floor: Interior27['floor'] = 'lobby';
  switch (k) {
    case 'school':
      floor = 'lobby';
      spots = [sp(0.14, 'floor', 'sit'), sp(0.22, 'floor', 'sit', 'SW'), sp(0.3, 'floor', 'sit', 'SW'), sp(0.54, 'desk', 'sit', 'SW'), sp(0.46, 'floor', 'stand'), sp(0.82, 'floor', 'stand', 'SW')];
      break;
    case 'plant':
      floor = 'studio';
      spots = [sp(0.2, 'floor', 'stand'), sp(0.5, 'floor', 'stand', 'SW'), sp(0.62, 'floor', 'stand'), sp(0.8, 'desk', 'stand', 'SW'), sp(0.34, 'floor', 'stand', 'SW')];
      break;
    case 'museum':
      floor = 'lobby';
      props.push({ t: 'counter', x: LAY33.museum.ticket[0], w: LAY33.museum.ticket[1] });
      spots = [sp(0.9, 'counter', 'stand', 'SW'), sp(0.38, 'floor', 'stand'), sp(0.54, 'floor', 'stand', 'SW'), sp(0.2, 'floor', 'stand'), sp(0.7, 'floor', 'stand', 'SW')];
      break;
    case 'platform':
      floor = 'office';
      spots = [sp(0.5, 'desk', 'sit', 'SW'), sp(0.38, 'desk', 'sit'), sp(0.34, 'floor', 'stand'), sp(0.76, 'floor', 'stand', 'SW'), sp(0.94, 'floor', 'sit', 'SW')];
      break;
    case 'agency':
      floor = 'office';
      spots = [sp(0.43, 'desk', 'sit'), sp(0.6, 'desk', 'sit'), sp(0.3, 'floor', 'stand'), sp(0.74, 'floor', 'stand', 'SW'), sp(0.52, 'floor', 'stand', 'SW')];
      break;
    case 'branch':
      floor = 'office';
      props.push({ t: 'counter', x: LAY33.branch.reception[0], w: LAY33.branch.reception[1] });
      spots = [sp(0.12, 'desk', 'sit'), sp(0.4, 'desk', 'sit'), sp(0.72, 'counter', 'stand', 'SW'), sp(0.54, 'floor', 'stand', 'SW'), sp(0.3, 'floor', 'stand')];
      break;
  }
  let i = 0;
  while (spots.length < Math.max(4, Math.min(n, 8))) { spots.push(sp(0.15 + ((i * 0.23) % 0.7), 'floor', 'stand', i % 2 ? 'SW' : 'SE')); i++; }
  return { k, year, props, spots, floor, dim: false };
}

// ---------------------------------------------------------------- recorte (a cena preenche a área)

/** O corte do interior27 tem céu, vizinhos e rua em volta da sala (150 de altura, 12 de cada lado). Aqui fica só o prédio. */
export const CROP33 = { x: 12, y: 22, bottom: 16, side: 12 } as const;
export const cropSize33 = (W: number): { W: number; H: number } => ({ W: W - 2 * CROP33.side, H: 150 - CROP33.y - CROP33.bottom });
/** Tira o céu e a rua de um ponto do modelo (pixels lógicos do corte inteiro → do corte recortado). */
export const cropPt33 = (x: number, y: number): [number, number] => [x - CROP33.x, y - CROP33.y];

/** Pinta o interior (com as pessoas) num canvas recortado. */
export function drawInterior33(canvas: HTMLCanvasElement, m: Interior27, people: Person27[], o: IDrawOpts27 = {}): IDrawn27 {
  const tmp = document.createElement('canvas');
  const d = drawInterior27(tmp, m, people, o);
  const { W, H } = cropSize33(d.W);
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (ctx) { ctx.imageSmoothingEnabled = false; ctx.drawImage(tmp, CROP33.x, CROP33.y, W, H, 0, 0, W, H); }
  return { W, H, hits: d.hits.map((h) => ({ ...h, x: h.x - CROP33.x, y: h.y - CROP33.y })) };
}

// ---------------------------------------------------------------- pintura

interface A { p: Px; g: Ctx27; y0: number; fy: number; X: (f: number) => number; Wd: (f?: number) => number; ep: number; year: number; seed: number; k: IntK33 }
const pal = (a: A) => a.g.pal;
const STEEL = C('#7a828e'), STEEL_D = C('#4a505c'), BRASS = C('#c8a048'), CREAM = C('#efe6cc');

/** Vidro de vitrine: véu translúcido com fio de luz em cima/esquerda e reflexo em diagonal (camada de luz: sem contorno). */
function glass(p: Px, x: number, y: number, w: number, h: number): void {
  p.rect(x, y, w, h, withAlpha(C('#bfe4f2'), 46));
  p.hline(x, x + w - 1, y, withAlpha(C('#ffffff'), 130)); p.vline(x, y, y + h - 1, withAlpha(C('#ffffff'), 110));
  p.vline(x + w - 1, y + 1, y + h - 1, withAlpha(C('#5a7a9a'), 110));
  for (let i = 0; i < 3; i++) p.line(x + 3 + i * 2, y + h - 4, x + 7 + i * 2, y + h - 10, withAlpha(C('#ffffff'), 70));
}
/** Cone de luz do teto até o chão (camada translúcida). */
function cone(p: Px, cx: number, top: number, bot: number, wTop: number, wBot: number, col: Col, a: number): void {
  p.poly([[cx - wTop / 2, top], [cx + wTop / 2, top], [cx + wBot / 2, bot], [cx - wBot / 2, bot]], withAlpha(col, a));
}
/** Nota na pauta: cabeça 2×2 e haste. */
function note(p: Px, x: number, y: number, c: Col, up = true): void {
  p.rect(x, y, 2, 2, c);
  if (up) p.vline(x + 1, y - 5, y, c); else p.vline(x, y + 1, y + 6, c);
}
/** Pauta de cinco linhas. */
function staff(p: Px, x: number, y: number, w: number, c: Col): void { for (let i = 0; i < 5; i++) p.hline(x, x + w - 1, y + i * 2, c); }

// ---- escola de música

function chalkboard(a: A, x: number, y: number, w: number, h: number): void {
  const { p, ep } = a, P = pal(a);
  const frame = ep >= 5 ? C('#2a2d38') : ep >= 3 ? C('#b8bcc4') : P.woodDark;
  const face = ep >= 5 ? C('#10162a') : ep >= 3 ? C('#eef0ee') : C('#26463d');
  const line = ep >= 5 ? C('#7ac8ff') : ep >= 3 ? C('#34344a') : C('#d8e4d8');
  const ink2 = ep >= 5 ? C('#ffb870') : ep >= 3 ? C('#c8302c') : C('#f0e8b8');
  blk(p, x, y, w, h, frame);
  p.rect(x + 2, y + 2, w - 4, h - 4, face);
  p.hline(x + 2, x + w - 3, y + 2, lv(face, ep >= 3 && ep < 5 ? 5 : 1)); // fio de sombra do aro de cima
  const rows = h >= 30 ? 2 : 1;
  for (let r = 0; r < rows; r++) {
    const sy = y + 5 + r * Math.floor((h - 8) / rows);
    staff(p, x + 4, sy, w - 8, line);
    const n = Math.floor((w - 14) / 9);
    for (let i = 0; i < n; i++) {
      const nx = x + 8 + i * 9, off = Math.floor(noise(i, r, a.seed) * 8);
      note(p, nx, sy + off, i % 3 === 0 ? ink2 : line, off > 3);
    }
    p.rect(x + 4, sy - 1, 3, 11, line); p.rect(x + 5, sy - 1, 1, 11, face); // clave (volta de traço)
  }
  if (ep >= 5) { for (let i = 0; i < 4; i++) p.rect(x + 4 + i * 4, y + h - 5, 3, 2, [C('#ff6a6a'), C('#6aff9a'), C('#6aa8ff'), C('#ffd86a')][i]); p.rect(x - 2, y - 2, w + 4, h + 4, withAlpha(C('#7ac8ff'), 28)); }
  else { p.rect(x + 2, y + h, w - 4, 2, lv(frame, 2.4)); for (let i = 0; i < 3; i++) p.rect(x + 6 + i * 5, y + h - 1, 3, 1, ep >= 3 ? [C('#c8302c'), C('#2a5ab0'), C('#2a2a32')][i] : CREAM); }
}
function musicStand(a: A, x: number): void {
  const { p, fy } = a, P = pal(a);
  p.vline(x + 4, fy - 19, fy - 3, P.metalDark);
  p.line(x + 4, fy - 3, x + 1, fy - 1, P.metalDark); p.line(x + 4, fy - 3, x + 7, fy - 1, P.metalDark);
  p.rect(x, fy - 27, 9, 7, P.paper); p.rect(x, fy - 21, 9, 1, P.metalDark);
  p.hline(x + 1, x + 7, fy - 25, INK); p.hline(x + 1, x + 6, fy - 23, INK); p.put(x + 3, fy - 26, INK); p.put(x + 6, fy - 26, INK);
}
function grandPiano(a: A, x: number): void {
  const { p, fy } = a, body = C('#1c1a22');
  blk(p, x + 2, fy - 20, 44, 8, body);
  p.poly([[x + 4, fy - 21], [x + 34, fy - 35], [x + 46, fy - 29], [x + 46, fy - 21]], lv(body, 2.4)); // tampa aberta
  p.line(x + 4, fy - 21, x + 34, fy - 35, lv(body, 5)); p.line(x + 34, fy - 35, x + 46, fy - 29, lv(body, 3.4));
  p.vline(x + 30, fy - 33, fy - 21, C('#8a6a3a')); // vareta da tampa
  p.rect(x, fy - 13, 24, 3, C('#f2ece0')); for (let i = x + 2; i < x + 23; i += 2) p.vline(i, fy - 13, fy - 11, INK); // teclado
  for (let i = x + 1; i < x + 22; i += 4) p.rect(i, fy - 14, 1, 2, INK);
  blk(p, x + 4, fy - 12, 3, 12, body); blk(p, x + 38, fy - 12, 3, 12, body); p.rect(x + 20, fy - 12, 4, 7, lv(body, 1.4)); // pernas e pedais
  p.rect(x + 9, fy - 26, 8, 6, a.g.pal.paper); p.hline(x + 10, x + 15, fy - 24, INK); p.hline(x + 10, x + 14, fy - 22, INK);
  const sy = fy - 10; blk(p, x + 8, sy, 9, 2, C('#3a2a26')); p.vline(x + 9, sy + 2, fy - 1, C('#3a2a26')); p.vline(x + 15, sy + 2, fy - 1, C('#3a2a26')); // banco
}
function metronome(a: A, x: number): void {
  const { p, fy } = a, w = C('#8a5a30');
  blk(p, x - 2, fy - 12, 11, 12, pal(a).woodDark);
  p.poly([[x, fy - 13], [x + 7, fy - 13], [x + 5, fy - 25], [x + 2, fy - 25]], w);
  p.vline(x + 3, fy - 24, fy - 14, lv(w, 5)); p.line(x + 4, fy - 24, x + 5, fy - 17, BRASS); p.rect(x + 4, fy - 20, 2, 2, BRASS);
}
function schoolEra(a: A, x: number): void {
  const { p, fy, y0, ep, g } = a, P = pal(a);
  if (ep === 0) { // lampião a gás na parede e palmeira
    p.rect(x, y0 + 14, 3, 6, P.metalDark); p.rect(x - 2, y0 + 10, 7, 5, withAlpha(C('#ffe8a0'), 90)); p.rect(x, y0 + 11, 3, 3, C('#ffd060'));
    p.disc(x + 1, y0 + 12, 8, withAlpha(C('#ffd889'), 22));
    prim27.plant(g, x + 6, fy, true);
  } else if (ep === 1) { // vitrola de corneta
    blk(p, x, fy - 16, 12, 8, P.wood); p.rect(x + 2, fy - 18, 8, 2, C('#1a1a1e')); p.disc(x + 6, fy - 18, 3, C('#2a2a30'));
    p.poly([[x + 8, fy - 19], [x + 21, fy - 33], [x + 24, fy - 28], [x + 11, fy - 16]], BRASS); p.line(x + 8, fy - 19, x + 21, fy - 33, lv(BRASS, 5)); p.line(x + 11, fy - 16, x + 24, fy - 28, lv(BRASS, 1.6));
    p.rect(x + 2, fy - 8, 2, 8, P.woodDark); p.rect(x + 8, fy - 8, 2, 8, P.woodDark);
  } else if (ep === 2) { // gravador de rolo no carrinho
    blk(p, x - 2, fy - 14, 28, 2, STEEL); p.rect(x, fy - 12, 2, 12, STEEL_D); p.rect(x + 20, fy - 12, 2, 12, STEEL_D);
    prim27.reelDeck(g, x, fy - 14, false);
  } else if (ep === 3) { // teclado elétrico no suporte
    blk(p, x - 2, fy - 19, 28, 5, C('#2a2a32')); p.rect(x, fy - 15, 24, 2, C('#f2ece0')); for (let i = x + 1; i < x + 23; i += 2) p.vline(i, fy - 15, fy - 14, INK);
    p.rect(x + 2, fy - 18, 6, 2, C('#e8c050')); p.line(x + 1, fy - 14, x + 7, fy - 1, STEEL_D); p.line(x + 21, fy - 14, x + 15, fy - 1, STEEL_D);
  } else { // mesa com computador, fone e caixa de som
    prim27.desk(g, x - 2, fy, 28); prim27.deskGear(g, x + 2, fy);
    if (ep === 4) { blk(p, x + 18, fy - 20, 7, 8, C('#3a3a42')); p.disc(x + 21, fy - 15, 2, C('#1a1a1e')); } // caixa de som
    else { p.ring(x + 21, fy - 17, 4, C('#2a2a32')); p.rect(x + 17, fy - 17, 2, 4, C('#2a2a32')); p.rect(x + 24, fy - 17, 2, 4, C('#2a2a32')); } // fone
  }
}
function school(a: A): void {
  const L = LAY33.school, { p, y0, fy, X, Wd, ep, year } = a, P = pal(a);
  chalkboard(a, X(L.board[0]), y0 + 9, Wd(L.board[1]), ep >= 5 ? 36 : 34);
  for (let i = 0; i < 3; i++) { musicStand(a, X(L.stands[0] + i * 0.085)); prim27.chair(a.g, X(L.stands[0] + i * 0.085) + 10, fy); }
  if (ep === 0) prim27.piano(a.g, X(L.piano[0]) + 6, fy); else grandPiano(a, X(L.piano[0]));
  metronome(a, X(L.metro[0]));
  const ks = ep < 3 ? ['violin', 'mandolin', 'trumpet'] : ['solid_body', 'electric_bass', 'violin'];
  for (let i = 0; i < 3; i++) { const gx = X(L.rack[0]) + 4 + i * Math.round(Wd(L.rack[1]) / 3); const w = ks[i] === 'trumpet' ? 17 : 9; p.rect(gx - 1, y0 + 14, 3, 2, P.metalDark); inst31(p, ks[i], gx - (w >> 1), y0 + 16, year, i); }
  schoolEra(a, X(L.era[0]));
  prim27.door(a.g, X(L.door[0]), fy, Math.max(12, Wd(L.door[1])), fy - y0 - 34);
}

// ---- fábrica de discos

const MAT: Col[] = [C('#6a4a2a'), C('#6a4a2a'), C('#22222a'), C('#22222a'), C('#d8e0e8'), C('#3a6ad8')];
function pipes(a: A): void {
  const { p, y0, X, k: _k } = a; void _k;
  const x0 = X(0), x1 = X(1);
  p.rect(x0, y0 + 9, x1 - x0, 3, STEEL); p.hline(x0, x1 - 1, y0 + 9, lv(STEEL, 4.6)); p.hline(x0, x1 - 1, y0 + 11, lv(STEEL, 1.6));
  p.rect(x0, y0 + 15, x1 - x0, 2, STEEL_D); p.hline(x0, x1 - 1, y0 + 15, lv(STEEL_D, 4));
  for (let xx = x0 + 18; xx < x1 - 6; xx += 52) { blk(p, xx, y0 + 7, 5, 11, lv(STEEL, 2.8)); p.rect(xx + 1, y0 + 12, 3, 1, lv(STEEL, 5)); }
  const vx = x0 + Math.round((x1 - x0) * 0.62);
  p.vline(vx, y0 + 12, y0 + 22, STEEL_D); p.disc(vx, y0 + 24, 3, (xx, yy) => (xx + yy < vx + y0 + 24 ? C('#e85040') : C('#a02820'))); p.hline(vx - 4, vx + 4, y0 + 24, C('#a02820'));
}
function hopper(a: A, x: number): void {
  const { p, fy, ep } = a, m = MAT[ep];
  blk(p, x, fy - 6, 3, 6, STEEL_D); blk(p, x + 18, fy - 6, 3, 6, STEEL_D); // pés
  p.poly([[x, fy - 40], [x + 20, fy - 40], [x + 15, fy - 16], [x + 5, fy - 16]], lv(STEEL, 2.6));
  p.line(x, fy - 40, x + 5, fy - 16, lv(STEEL, 5)); p.line(x + 20, fy - 40, x + 15, fy - 16, lv(STEEL, 1.4));
  p.rect(x + 2, fy - 42, 16, 3, STEEL); p.hline(x + 2, x + 17, fy - 42, lv(STEEL, 5));
  blk(p, x + 8, fy - 16, 4, 6, STEEL_D); // bico
  for (let i = 0; i < 7; i++) p.rect(x + 3 + (i * 5) % 14, fy - 38 + ((i * 3) % 6), 3, 2, i % 2 ? lv(m, 3.4) : m); // pelotas visíveis pela abertura
  blk(p, x + 5, fy - 9, 11, 9, ep >= 4 ? C('#e8e8e0') : C('#8a6a3a')); // saco/caixa embaixo
  for (let i = 0; i < 4; i++) p.put(x + 7 + i * 2, fy - 4 - (i % 2), lv(m, 2)); // grão escorrido
}
function pressMachine(a: A, x: number, w: number): void {
  const { p, fy, ep } = a;
  const frame = ep === 0 ? C('#5a4a3a') : ep >= 4 ? C('#cfd4dc') : C('#3a424e');
  if (ep >= 4) { // injetora de CD: gabinete claro, janela e luz azul
    blk(p, x, fy - 40, w, 40, frame);
    p.rect(x + 3, fy - 36, w - 6, 18, C('#12202c')); glass(p, x + 3, fy - 36, w - 6, 18);
    p.disc(x + w / 2, fy - 28, 6, C('#c8ccd4')); p.disc(x + w / 2, fy - 28, 2, C('#12202c')); p.disc(x + w / 2 - 2, fy - 31, 1.2, C('#ffffff'));
    p.rect(x + 3, fy - 15, w - 6, 3, C('#5ab0ff')); p.rect(x + 3, fy - 14, w - 6, 1, withAlpha(C('#bfe8ff'), 160));
    p.rect(x + 4, fy - 10, 6, 5, C('#2a2a32')); p.rect(x + 5, fy - 9, 4, 2, C('#7af0a0')); p.rect(x + w - 12, fy - 10, 8, 5, STEEL_D);
    if (ep === 5) { p.rect(x + w + 2, fy - 12, 4, 12, STEEL_D); p.line(x + w + 4, fy - 12, x + w + 12, fy - 30, STEEL); p.line(x + w + 12, fy - 30, x + w + 20, fy - 22, STEEL); p.rect(x + w + 19, fy - 23, 4, 3, BRASS); }
    return;
  }
  blk(p, x, fy - 8, w, 8, frame); // base
  blk(p, x + 2, fy - 48, 7, 40, frame); blk(p, x + w - 9, fy - 48, 7, 40, frame); // colunas
  blk(p, x, fy - 52, w, 6, lv(frame, 2.4)); // travessa
  blk(p, x + w / 2 - 7, fy - 46, 14, 12, ep === 0 ? C('#7a5a30') : C('#3a6a8a')); p.rect(x + w / 2 - 2, fy - 34, 4, 9, lv(STEEL, 4)); // cilindro e haste
  blk(p, x + 9, fy - 25, w - 18, 4, STEEL); blk(p, x + 9, fy - 14, w - 18, 4, STEEL); // pratos
  const stack = ep <= 1 ? C('#3a2a20') : C('#1c1c22');
  p.rect(x + w / 2 - 9, fy - 21, 18, 7, lv(stack, 1.4)); p.hline(x + w / 2 - 9, x + w / 2 + 8, fy - 21, lv(stack, 4)); // o disco sendo prensado
  p.rect(x + w / 2 - 3, fy - 20, 6, 5, ep <= 1 ? C('#d8c8a0') : [C('#c8302c'), C('#e8c040'), C('#3a7ac8'), C('#e8e0d0')][a.seed % 4]); // rótulo
  p.disc(x + w - 14, fy - 38, 4, C('#f2ece0')); p.ring(x + w - 14, fy - 38, 4, INK); p.line(x + w - 14, fy - 38, x + w - 12, fy - 41, C('#c8302c')); // manômetro
  p.rect(x + 12, fy - 44, 3, 3, ep === 0 ? C('#e8c050') : C('#e85040')); p.put(x + 12, fy - 44, C('#ffffff')); // luz de operação
  if (ep === 0) { p.disc(x - 6, fy - 22, 9, lv(STEEL_D, 2.6)); p.ring(x - 6, fy - 22, 9, lv(STEEL_D, 4.4)); p.disc(x - 6, fy - 22, 2, BRASS); p.line(x + w - 2, fy - 22, x + w + 9, fy - 42, C('#8a5a30')); p.disc(x + w + 9, fy - 43, 2, C('#c8302c')); } // volante e alavanca
  // vapor (camada de luz)
  for (let i = 0; i < 4; i++) { const vx = x + w - 16 + i * 4 - (i % 2) * 6, vy = fy - 56 - i * 4; p.ellipse(vx, vy, 5 - (i >> 1), 3, withAlpha(C('#f4f4ff'), 96 - i * 16)); }
}
function conveyor(a: A, x: number, w: number): void {
  const { p, fy, ep } = a, P = pal(a);
  blk(p, x, fy - 13, w, 4, STEEL); p.rect(x + 1, fy - 9, 2, 9, STEEL_D); p.rect(x + w - 3, fy - 9, 2, 9, STEEL_D); p.hline(x + 2, x + w - 3, fy - 5, STEEL_D);
  for (let xx = x + 3; xx < x + w - 3; xx += 4) p.put(xx, fy - 12, lv(STEEL_D, 2)); // roletes
  const n = ep >= 4 ? 5 : 9, y = fy - 14;
  for (let i = 0; i < n; i++) { // pilha de discos de lado
    const c = ep <= 1 ? (i % 2 ? C('#2a2020') : C('#5a3a28')) : ep === 5 ? [C('#3a6ad8'), C('#e85a8a'), C('#e8c040'), C('#3ad8a0')][i % 4] : (i % 2 ? C('#22222a') : C('#2e2e38'));
    if (ep === 4) { p.rect(x + 4, y - 3 - i * 3, 17, 3, C('#d8e4ec')); p.hline(x + 4, x + 20, y - 3 - i * 3, C('#ffffff')); p.rect(x + 6, y - 2 - i * 3, 13, 1, C('#8a98a8')); } // caixinhas de CD
    else p.rect(x + 4, y - 1 - i, 17, 1, c);
  }
  if (ep <= 3) { blk(p, x + 26, y - 10, 12, 10, P.paper); p.rect(x + 28, y - 8, 8, 6, ep <= 1 ? C('#a82a2a') : C('#2a5ab0')); p.disc(x + 32, y - 5, 2, C('#f2ece0')); } // capa de papelão
  else blk(p, x + 26, y - 9, 12, 9, C('#e8e0d0'));
}
function qcStation(a: A, x: number): void {
  const { p, fy, ep } = a;
  blk(p, x, fy - 13, 26, 3, pal(a).wood); p.rect(x + 2, fy - 10, 2, 10, pal(a).woodDark); p.rect(x + 22, fy - 10, 2, 10, pal(a).woodDark);
  blk(p, x + 3, fy - 23, 15, 10, C('#fff4cc')); p.rect(x + 1, fy - 25, 19, 14, withAlpha(C('#fff4cc'), 40)); // caixa de luz
  p.disc(x + 10, fy - 18, 5, C('#1c1c22')); p.disc(x + 10, fy - 18, 1.5, C('#e8e0d0')); p.rect(x + 13, fy - 19, 2, 2, C('#e85040')); // disco contra a luz, com a falha
  p.line(x + 21, fy - 14, x + 24, fy - 30, STEEL_D); p.ellipse(x + 24, fy - 31, 4, 2, STEEL); p.rect(x + 20, fy - 32, 3, 1, withAlpha(C('#fff4cc'), 120)); // lupa
  blk(p, x + 28, fy - 11, 10, 11, STEEL_D); for (let i = 0; i < 3; i++) p.poly([[x + 30 + i * 2, fy - 12], [x + 33 + i * 2, fy - 12], [x + 32 + i * 2, fy - 15]], C('#1c1c22')); // lixeira com cacos
  if (ep >= 4) { blk(p, x + 14, fy - 28, 12, 8, C('#2a2a32')); p.rect(x + 16, fy - 26, 8, 4, C('#2a6ab0')); } // monitor
}
function shipping(a: A, x: number): void {
  const { p, fy } = a, k = C('#a87a40');
  blk(p, x, fy - 3, 20, 3, C('#7a5a30')); p.hline(x + 1, x + 18, fy - 2, INK);
  blk(p, x + 1, fy - 15, 12, 12, k); blk(p, x + 8, fy - 22, 11, 10, lv(k, 3)); blk(p, x + 1, fy - 27, 10, 12, lv(k, 2.2));
  p.vline(x + 7, fy - 15, fy - 4, C('#e8dcc0')); p.hline(x + 8, x + 18, fy - 17, C('#e8dcc0')); p.rect(x + 3, fy - 25, 5, 4, C('#f2ece0'));
}
function plant(a: A): void {
  const L = LAY33.plant, { X, Wd } = a;
  pipes(a);
  hopper(a, X(L.hopper[0]));
  pressMachine(a, X(L.press[0]), Wd(L.press[1]));
  conveyor(a, X(L.belt[0]), Wd(L.belt[1]));
  qcStation(a, X(L.qc[0]));
  shipping(a, X(L.ship[0]) - 8);
}

// ---- museu

function guitarCase(a: A, x: number, w: number, i: number): void {
  const { p, fy, y0, ep, year } = a, P = pal(a);
  const ped = ep < 3 ? P.woodDark : C('#e4e2dc');
  blk(p, x, fy - 14, w, 14, ped); p.hline(x + 1, x + w - 2, fy - 13, tint(BRASS, ep < 3 ? 0 : -0.2)); p.rect(x + w / 2 - 3, fy - 8, 6, 3, CREAM); p.hline(x + w / 2 - 2, x + w / 2 + 1, fy - 7, INK);
  const gy = fy - 44;
  p.rect(x, gy, w, 2, STEEL_D); p.rect(x, gy + 2, 1, 28, STEEL_D); p.rect(x + w - 1, gy + 2, 1, 28, STEEL_D);
  glass(p, x + 1, gy + 2, w - 2, 28);
  const cx = x + (w >> 1);
  if (i === 0) { const kind = ep < 3 ? 'parlor_guitar' : 'solid_body'; inst31(p, kind, cx - 5, gy + 3, year, 1); }
  else if (i === 1) { inst31(p, 'violin', cx - 3, gy + 5, year, 2); p.line(cx + 5, gy + 6, cx + 5, gy + 22, BRASS); } // violino e arco
  else { // disco de goma-laca/vinil num suporte e um microfone de fita
    p.disc(cx - 3, gy + 13, 7, ep < 2 ? C('#2a2020') : C('#1c1c22')); p.disc(cx - 3, gy + 13, 2.4, C('#c8302c')); p.put(cx - 3, gy + 13, INK); p.disc(cx - 6, gy + 10, 1, C('#ffffff'));
    p.rect(cx + 6, gy + 18, 2, 8, STEEL_D); p.rect(cx + 4, gy + 9, 6, 9, STEEL); p.hline(cx + 4, cx + 9, gy + 9, lv(STEEL, 5)); for (let r = 0; r < 3; r++) p.hline(cx + 5, cx + 8, gy + 11 + r * 2, STEEL_D);
  }
  cone(p, cx, y0 + 3, fy - 14, 4, w + 6, C('#fff2c0'), 26);
}
function museum(a: A): void {
  const L = LAY33.museum, { p, y0, fy, X, Wd, ep, g, seed } = a, P = pal(a);
  for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) prim27.goldDisc(g, X(L.gold[0]) + i * 13, y0 + 10 + r * 15, r === 0 && i === 3);
  p.rect(X(L.gold[0]), y0 + 6, 52, 2, BRASS); // trilho da galeria
  for (let i = 0; i < 3; i++) guitarCase(a, X(L[`case${i}`][0]), Wd(L[`case${i}`][1]), i);
  // retratos emoldurados acima das vitrines
  for (let i = 0; i < 3; i++) {
    const px = X(L.portraits[0]) + i * Math.round(Wd(L.portraits[1]) / 3) + 6, py = y0 + 9;
    blk(p, px, py, 16, 20, BRASS); p.rect(px + 2, py + 2, 12, 16, [C('#3a4a5a'), C('#5a3a3a'), C('#3a5a4a')][i]);
    p.disc(px + 8, py + 8, 3, mix(C('#e8c8a0'), C('#a87850'), (i + seed % 3) / 4)); p.ellipse(px + 8, py + 17, 5, 3, [C('#1e1e24'), C('#8a2430'), C('#24446a')][i]);
  }
  // cordão e postes na frente da vitrine do meio
  const bx = X(L.case1[0]) - 6, bw = Wd(L.case1[1]) + 12;
  for (const px of [bx, bx + bw]) { p.vline(px, fy - 14, fy - 3, BRASS); p.disc(px, fy - 15, 2, lv(BRASS, 4)); p.rect(px - 2, fy - 2, 5, 2, lv(BRASS, 2)); }
  for (let t = 0; t <= bw; t++) p.put(bx + t, fy - 13 + Math.round(3 * Math.sin((t / bw) * Math.PI)), C('#a82a38'));
  // tapete vermelho do corredor
  p.rect(X(0.25), fy - 1, Wd(0.5), 2, C('#7a1c28')); p.hline(X(0.25), X(0.75), fy - 1, lv(C('#7a1c28'), 3.4));
  // bilheteria: caixa registradora, ingressos e a tabela de preço na parede
  const tx = X(L.ticket[0]), tw = Wd(L.ticket[1]);
  blk(p, tx + 3, y0 + 10, tw - 6, 18, CREAM); p.rect(tx + 5, y0 + 12, tw - 10, 3, C('#a82a38')); for (let i = 0; i < 3; i++) p.hline(tx + 6, tx + tw - 8 - i * 3, y0 + 18 + i * 3, INK);
  if (ep <= 2) { blk(p, tx + tw - 22, fy - 28, 14, 12, BRASS); p.rect(tx + tw - 20, fy - 26, 10, 3, C('#2a2a32')); for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) p.put(tx + tw - 20 + c * 3, fy - 21 + r * 3, CREAM); }
  else if (ep <= 4) { blk(p, tx + tw - 22, fy - 24, 14, 8, C('#cfd4dc')); p.rect(tx + tw - 20, fy - 22, 10, 3, C('#7af0a0')); p.rect(tx + tw - 18, fy - 17, 6, 2, C('#f2ece0')); }
  else { blk(p, tx + tw - 20, fy - 32, 10, 16, C('#2a2d38')); p.rect(tx + tw - 18, fy - 30, 6, 6, C('#f2f2f2')); for (let i = 0; i < 6; i++) p.put(tx + tw - 18 + (i * 3) % 6, fy - 30 + ((i * 5) % 6), INK); p.rect(tx + tw - 18, fy - 22, 6, 3, C('#7af0a0')); } // quiosque com QR
  for (let i = 0; i < 3; i++) p.rect(tx + 4 + i * 4, fy - 18 - (i % 2), 3, 2, [C('#e8c040'), C('#c8302c'), C('#3a7ac8')][i]); // ingressos
  void P;
}

// ---- plataforma de streaming

function serverRack(a: A, x: number, w: number, old: boolean): void {
  const { p, fy, y0, seed } = a, h = fy - y0 - 12;
  const body = old ? C('#cfc8b4') : C('#22242c');
  blk(p, x, fy - h, w, h, body);
  for (let yy = fy - h + 3, r = 0; yy < fy - 6; yy += 5, r++) {
    p.rect(x + 2, yy, w - 4, 4, old ? C('#b8b09a') : C('#343846')); p.hline(x + 2, x + w - 3, yy, lv(old ? C('#b8b09a') : C('#343846'), 4.4));
    const leds = [C('#5af08a'), C('#f0b040'), C('#5ab0ff')];
    p.put(x + 4, yy + 2, leds[Math.floor(noise(r, x, seed) * 3)]); p.put(x + 6, yy + 2, noise(r, x, seed + 1) > 0.6 ? C('#ff5a5a') : leds[0]);
    for (let k = 0; k < Math.floor((w - 14) / 3); k++) p.put(x + 10 + k * 3, yy + 2, old ? C('#8a8470') : C('#161820'));
  }
  if (old) p.disc(x + w / 2, fy - 8, 3, C('#8a8470'));
  else { p.rect(x + 1, fy - h + 1, 1, h - 2, withAlpha(C('#5ab0ff'), 120)); for (let i = 0; i < 3; i++) p.line(x + 4 + i * 3, fy - 8, x + 6 + i * 3, fy - h + 6, withAlpha(C('#ffffff'), 28)); }
  p.rect(x + w - 4, fy - 6, 2, 6, [C('#e85040'), C('#e8c040'), C('#3ad8a0')][seed % 3]); // cabo no pé
}
function playlistWall(a: A, x: number, w: number): void {
  const { p, y0, seed } = a, P = pal(a);
  const h = 46;
  blk(p, x, y0 + 8, w, h, C('#12131c')); p.rect(x + 2, y0 + 10, w - 4, 4, C('#2a2d3c')); for (let i = 0; i < 3; i++) p.rect(x + 4 + i * 3, y0 + 11, 2, 2, [C('#ff5a5a'), C('#f0b040'), C('#5af08a')][i]);
  p.rect(x + w - 24, y0 + 11, 20, 2, C('#4a4e64'));
  const cols = 4, rows = 2, tw = Math.floor((w - 10) / cols) - 2, th = 15;
  const cl = [P.accent, P.accent2, P.fabric, P.gold, C('#3a8ad8'), C('#d8486a'), C('#48c878'), C('#a858d8')];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c, tx = x + 5 + c * (tw + 2), ty = y0 + 17 + r * (th + 3), col = cl[(i + seed) % cl.length];
    p.rect(tx, ty, tw, th, col); p.hline(tx, tx + tw - 1, ty, lv(col, 4.4)); p.rect(tx, ty + th - 5, tw, 5, lv(col, 1.6));
    const g = Math.floor(noise(i, seed, 3) * 3);
    if (g === 0) p.disc(tx + tw / 2, ty + 6, 3, lv(col, 4)); else if (g === 1) p.poly([[tx + 3, ty + 9], [tx + tw / 2, ty + 2], [tx + tw - 3, ty + 9]], lv(col, 4)); else for (let k = 0; k < 4; k++) p.rect(tx + 3 + k * 3, ty + 8 - k, 2, 2 + k, lv(col, 4));
    p.hline(tx + 2, tx + tw - 4, ty + th - 3, withAlpha(C('#ffffff'), 150));
  }
  const sel = (seed % 7) + 1, sc = sel % cols, sr = Math.floor(sel / cols), sx = x + 5 + sc * (tw + 2) - 1, sy = y0 + 17 + sr * (th + 3) - 1;
  p.hline(sx, sx + tw + 1, sy, C('#ffd34a')); p.hline(sx, sx + tw + 1, sy + th + 1, C('#ffd34a')); p.vline(sx, sy, sy + th + 1, C('#ffd34a')); p.vline(sx + tw + 1, sy, sy + th + 1, C('#ffd34a')); // curadoria: o escolhido
  p.rect(x - 2, y0 + 6, w + 4, h + 4, withAlpha(C('#7ac8ff'), 20));
}
function subsChart(a: A, x: number, w: number): void {
  const { p, y0 } = a, h = 34;
  blk(p, x, y0 + 12, w, h, C('#12131c')); p.rect(x + 2, y0 + 14, w - 4, h - 4, C('#1a1d2c'));
  const n = Math.floor((w - 8) / 4);
  for (let i = 0; i < n; i++) { const bh = 3 + Math.round((i / n) * 18 + noise(i, 4, a.seed) * 3); p.rect(x + 4 + i * 4, y0 + 12 + h - 4 - bh, 3, bh, i >= n - 2 ? C('#5af08a') : C('#3a8ad8')); p.hline(x + 4 + i * 4, x + 6 + i * 4, y0 + 12 + h - 4 - bh, C('#bfe8ff')); }
  p.rect(x + 2, y0 + 14, w - 4, 1, C('#4a4e64'));
  p.rect(x - 1, y0 + 11, w + 2, h + 2, withAlpha(C('#7ac8ff'), 18));
}
function curatorDesk(a: A, x: number): void {
  const { p, fy, g } = a;
  prim27.desk(g, x, fy, 38);
  for (let i = 0; i < 2; i++) { const mx = x + 3 + i * 16; blk(p, mx, fy - 26, 13, 10, C('#2a2d38')); p.rect(mx + 2, fy - 24, 9, 6, i ? C('#3a8ad8') : C('#d8486a')); p.rect(mx + 5, fy - 16, 3, 4, STEEL_D); p.rect(mx + 2, fy - 24, 9, 1, withAlpha(C('#ffffff'), 120)); }
  p.ring(x + 33, fy - 15, 3, C('#2a2a32')); p.rect(x + 29, fy - 15, 2, 3, C('#2a2a32')); // fone de ouvido
  prim27.chair(g, x + 40, fy);
}
function acUnit(a: A, x: number): void {
  const { p, y0 } = a;
  blk(p, x, y0 + 8, 30, 14, C('#b8bcc4')); p.disc(x + 9, y0 + 15, 5, C('#6a7280')); for (let i = 0; i < 3; i++) p.line(x + 9, y0 + 15, x + 9 + [4, -3, -1][i], y0 + 15 + [1, 3, -4][i], C('#2a2d38'));
  for (let i = 0; i < 4; i++) p.hline(x + 17, x + 27, y0 + 11 + i * 3, lv(C('#b8bcc4'), 2)); p.put(x + 27, y0 + 20, C('#5af08a'));
}
function platform(a: A): void {
  const L = LAY33.platform, { X, Wd, p, fy, y0, g, year } = a, old = year < 2012;
  const rx = X(L.rack[0]), rw = Math.floor(Wd(L.rack[1]) / 3) - 2;
  for (let i = 0; i < 3; i++) serverRack(a, rx + i * (rw + 3), rw, old);
  playlistWall(a, X(L.wall[0]), Wd(L.wall[1]));
  curatorDesk(a, X(L.desk[0]));
  subsChart(a, X(L.chart[0]), Wd(L.chart[1]));
  acUnit(a, X(L.ac[0]));
  // canto de descanso: pufe e planta
  const lx = X(L.lounge[0]);
  p.ellipse(lx + 6, fy - 5, 8, 5, C('#d8486a')); p.ellipse(lx + 4, fy - 7, 4, 2, lv(C('#d8486a'), 4)); prim27.plant(g, lx - 6, fy, true);
  // cabos pendurados da prateleira de servidores
  for (let i = 0; i < 3; i++) p.line(rx + 3 + i * 5, y0 + 8, rx + 6 + i * 5, y0 + 18, [C('#e85040'), C('#e8c040'), C('#3a8ad8')][i]);
  void fy;
}

// ---- agência de turnê

const LAND: [number, number, number, number][] = [[0.18, 0.4, 0.14, 0.26], [0.34, 0.5, 0.1, 0.3], [0.58, 0.42, 0.16, 0.24], [0.7, 0.62, 0.1, 0.18], [0.46, 0.28, 0.12, 0.16]];
function worldMap(a: A, x: number, y: number, w: number, h: number, pins: number): void {
  const { p, ep, seed } = a, P = pal(a);
  const screen = ep >= 5;
  blk(p, x, y, w, h, screen ? C('#2a2d38') : P.woodDark);
  const sea = screen ? C('#10203a') : ep >= 4 ? C('#bcd6e6') : C('#d8c898');
  const land = screen ? C('#2a6a9a') : ep >= 4 ? C('#9ab070') : C('#b08a58');
  p.rect(x + 2, y + 2, w - 4, h - 4, sea);
  for (const [fx, fy2, fw, fh] of LAND) p.ellipse(x + 2 + fx * (w - 4), y + 2 + fy2 * (h - 4), Math.max(3, (fw * (w - 4)) / 2), Math.max(2, (fh * (h - 4)) / 2), land);
  for (const [fx, fy2, fw] of LAND) p.hline(x + 2 + fx * (w - 4) - fw * (w - 4) / 3, x + 2 + fx * (w - 4), y + 2 + fy2 * (h - 4) - 1, lv(land, 4));
  if (screen) for (let i = 0; i < 6; i++) p.hline(x + 3, x + w - 4, y + 4 + i * 5, withAlpha(C('#7ac8ff'), 40));
  const pts: [number, number][] = [];
  for (let i = 0; i < pins; i++) pts.push([x + 6 + Math.floor(noise(i, seed, 8) * (w - 12)), y + 5 + Math.floor(noise(seed, i, 9) * (h - 12))]);
  for (let i = 1; i < pts.length; i++) p.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], screen ? C('#ffd34a') : C('#c8302c')); // a rota da turnê, fio vermelho
  for (const [px, py] of pts) { p.rect(px - 1, py - 1, 3, 3, screen ? C('#ffd34a') : C('#c8302c')); p.put(px - 1, py - 1, C('#ffffff')); }
}
function bookerDesk(a: A, x: number): void {
  const { p, fy, ep, g } = a;
  prim27.desk(g, x, fy, 34); prim27.deskGear(g, x + 3, fy);
  if (ep <= 1) { p.rect(x + 20, fy - 20, 2, 8, STEEL_D); p.disc(x + 21, fy - 21, 2, BRASS); p.rect(x + 18, fy - 14, 7, 2, STEEL_D); } // telefone de castiçal
  else if (ep === 2) { blk(p, x + 20, fy - 17, 10, 5, C('#1c1c22')); p.disc(x + 25, fy - 15, 2, C('#c8ccd4')); } // telefone de disco
  else if (ep >= 4) { p.ring(x + 24, fy - 18, 4, C('#2a2a32')); p.rect(x + 22, fy - 15, 5, 3, C('#2a2a32')); } // headset
  prim27.chair(g, x + 36, fy);
  blk(p, x + 25, fy - 16, 7, 4, C('#c8302c')); p.rect(x + 26, fy - 14, 5, 1, C('#f2ece0')); p.disc(x + 26, fy - 11, 1, INK); p.disc(x + 31, fy - 11, 1, INK); // ônibus de turnê de brinquedo
}
function tourCalendar(a: A, x: number, w: number): void {
  const { p, y0, seed } = a, P = pal(a);
  blk(p, x, y0 + 10, w, 30, P.paper);
  for (let r = 0; r < 4; r++) p.hline(x + 2, x + w - 3, y0 + 18 + r * 6, lv(P.paper, 2));
  for (let c = 0; c < 6; c++) p.vline(x + 5 + c * Math.floor((w - 8) / 6), y0 + 12, y0 + 38, lv(P.paper, 2));
  p.rect(x + 2, y0 + 11, w - 4, 4, C('#a82a38'));
  const cl = [P.accent, P.accent2, C('#3a8ad8'), C('#48c878')];
  for (let r = 0; r < 4; r++) { const sx = x + 4 + Math.floor(noise(r, seed, 2) * 12), bw = 8 + Math.floor(noise(seed, r, 3) * 14); p.rect(sx, y0 + 20 + r * 6, Math.min(bw, w - (sx - x) - 4), 3, cl[r]); p.hline(sx, sx + Math.min(bw, w - (sx - x) - 4) - 1, y0 + 20 + r * 6, lv(cl[r], 4.4)); }
}
function agency(a: A): void {
  const L = LAY33.agency, { X, Wd, y0, fy, g } = a;
  worldMap(a, X(L.map[0]), y0 + 9, Wd(L.map[1]), 40, 6);
  bookerDesk(a, X(L.desks[0])); bookerDesk(a, X(L.desks[0]) + 56);
  tourCalendar(a, X(L.wall[0]), Wd(L.wall[1]));
  for (let i = 0; i < 2; i++) prim27.poster(g, X(L.posters[0]) + i * 17, y0 + 12, 13, 19, a.seed + i);
  prim27.filing(g, X(L.filing[0]), fy);
}

// ---- filial

function clockFace(a: A, cx: number, cy: number, hh: number, mm: number, flag: [Col, Col, Col]): void {
  const { p } = a;
  p.disc(cx, cy, 8, lv(STEEL, 2.6)); p.disc(cx, cy, 6, C('#f2ece0')); p.ring(cx, cy, 8, lv(STEEL, 4.4));
  for (let i = 0; i < 12; i += 3) { const ang = (i / 12) * Math.PI * 2; p.put(cx + Math.round(Math.sin(ang) * 5), cy - Math.round(Math.cos(ang) * 5), INK); }
  const ah = ((hh % 12) / 12 + mm / 720) * Math.PI * 2, am = (mm / 60) * Math.PI * 2;
  p.line(cx, cy, cx + Math.round(Math.sin(ah) * 3), cy - Math.round(Math.cos(ah) * 3), INK); p.line(cx, cy, cx + Math.round(Math.sin(am) * 5), cy - Math.round(Math.cos(am) * 5), INK); p.put(cx, cy, C('#c8302c'));
  p.rect(cx - 5, cy + 10, 10, 6, flag[1]); p.rect(cx - 5, cy + 10, 10, 2, flag[0]); p.rect(cx - 5, cy + 14, 10, 2, flag[2]); p.vline(cx - 6, cy + 9, cy + 18, STEEL_D);
}
function branch(a: A): void {
  const L = LAY33.branch, { X, Wd, y0, fy, g, p, seed } = a;
  const fl: [Col, Col, Col][] = [[C('#c8302c'), C('#f2ece0'), C('#2a5ab0')], [C('#2a8a4a'), C('#f2ece0'), C('#c8302c')], [C('#2a2a32'), C('#e8c040'), C('#c8302c')], [C('#f2ece0'), C('#c8302c'), C('#f2ece0')]];
  for (let i = 0; i < 3; i++) clockFace(a, X(L.clocks[0]) + 10 + i * 27, y0 + 20, [9, 15, 3][i], [10, 40, 25][i], fl[(i + seed) % fl.length]);
  worldMap(a, X(L.map[0]), y0 + 9, Wd(L.map[1]), 42, 5);
  for (let i = 0; i < 2; i++) { const dx = X(L.desks[0]) + i * 86; prim27.desk(g, dx, fy, 32); prim27.deskGear(g, dx + 3, fy); prim27.chair(g, dx + 34, fy); }
  const fx = X(L.flags[0]);
  for (let i = 0; i < 2; i++) { const px = fx + i * 16; p.vline(px, y0 + 36, fy - 15, BRASS); p.disc(px, y0 + 35, 1.5, lv(BRASS, 4)); const f = fl[(i + seed + 1) % fl.length]; p.rect(px + 1, y0 + 37, 12, 8, f[1]); p.rect(px + 1, y0 + 37, 12, 3, f[0]); p.rect(px + 1, y0 + 42, 12, 3, f[2]); p.hline(px + 1, px + 12, y0 + 37, lv(f[0], 4)); }
  const rk = X(L.reception[0]) + 4; // folhetos
  blk(p, rk, fy - 28, 12, 12, pal(a).woodDark); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) p.rect(rk + 1 + c * 4, fy - 27 + r * 4, 3, 3, [C('#e85a8a'), C('#e8c040'), C('#3a8ad8')][(r + c) % 3]);
  prim27.filing(g, X(L.filing[0]), fy);
}

const DRAW: Record<IntK33, (a: A) => void> = { school, plant, museum, platform, agency, branch };
/** Pinta os adereços do interior próprio na camada do interior27 (a mesma que ganha o contorno INK). */
export function paintInt33(k: IntK33, year: number): (g: Ctx27, seed: number) => void {
  return (g, seed) => {
    const G = geom27(g.pl.W);
    DRAW[k]({ p: g.p, g, y0: G.y0, fy: G.fy, X: G.X, Wd: G.Wd, ep: ep5Of(year), year, seed: seed % 997, k });
  };
}
export { INK };
