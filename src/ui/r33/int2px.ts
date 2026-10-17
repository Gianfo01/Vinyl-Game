// R33 · INT-2 (arte) — INTERIORES e FACHADAS dos prédios novos, desenhados por código em `Px` (sem imagem externa, sem emoji,
// letras só na fonte do jogo). Mesmo corte lateral da sede (hqpx27/salas31px) e dos interiores (props31/interior27): luz de
// cima à esquerda, sombra arroxeada, contorno escuro quente, rampa de ~6 tons por material, paleta da época (6 faixas: 1889–1919,
// 1920–49, 1950–69, 1970–89, 1990–2009, 2010–2040). A cena PREENCHE a área toda (360×150, nada transparente, sem vazio em volta);
// as pessoas ficam em `spots` (frações da largura, na faixa do piso entre FY e a borda de baixo).
//
//   int2Interior(id, ano)   — PURO: cena opaca 360×150 do prédio novo `id` (14 tipos, ver sim/r33/int2.ts);
//   int2Shop(biz, ano)      — PURO: interior simples das lojas da época (BIZ31: partituras, gramofones, fliperama… holo);
//   int2Facade(id, ano)     — PURO: fachada de frente 128×96 (letreiro, porta, detalhe do tipo) para o cartão;
//   int2Spots(id)           — onde ficam as pessoas em cada interior.
// Determinístico: mesma entrada, mesmos pixels. Nada vai para o save.

import { drawText, textWidth } from '../pixel/font';
import { C, INK, Px, dith, inked, lv, noise, withAlpha, type Col } from '../pixel/px';
import { INT2, type Int2Id, int2Def } from '../../sim/r33/int2';
import { FY, IH, IW, WALL_Y, type Stock, bench, bev, chair, clockP, cols, counter, doorP, epOf, grain, lampHang, neon, obj, picture, pillar, plant, poster, room, screenP, seal, shadow, shelf, signBoard, speaker, table, windowP, type Room } from './int2kit';

export { IH, IW } from './int2kit';
export interface Spot2 { x: number; y: number; pose: 'stand' | 'sit' | 'play'; dir: 'SE' | 'SW' }
const S = (x: number, y = FY + 12, pose: Spot2['pose'] = 'stand', dir: Spot2['dir'] = 'SE'): Spot2 => ({ x, y, pose, dir });

// ---------------------------------------------------------------- peças soltas dos lugares

const wallCols = cols('#7a3a30', '#3a5a7a', '#c8a050', '#4a6a40', '#8a5a8a', '#a8452c');
const steel = (R: Room) => R.pal.metal;

function vault(R: Room, x: number, y: number): void { // porta de cofre redonda
  obj(R, (q) => {
    bev(q, x - 3, y - 41, 46, 44, lv(steel(R), 2.4)); q.disc(x + 20, y - 19, 17, lv(steel(R), 3.2)); q.disc(x + 20, y - 19, 13, lv(steel(R), 2.6)); q.ring(x + 20, y - 19, 9, lv(steel(R), 4.4));
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; q.disc(x + 20 + Math.cos(a) * 15, y - 19 + Math.sin(a) * 15, 1.4, lv(steel(R), 4.6)); }
    q.disc(x + 20, y - 19, 4, lv(R.pal.gold, 3.4)); q.line(x + 20, y - 19, x + 26, y - 14, lv(R.pal.gold, 4.4));
  });
}
function cage(R: Room, x: number, w: number): void { // guichê com grade de latão
  counter(R, x, w, { h: 22 });
  obj(R, (q) => { const t = FY - 22; q.hline(x, x + w - 1, t - 30, lv(R.pal.metal, 4)); for (let i = x + 4; i < x + w - 3; i += 6) q.vline(i, t - 30, t - 1, lv(R.pal.metal, 3.2)); q.rect(x + (w >> 1) - 8, t - 14, 16, 12, withAlpha(R.pal.wall, 0)); });
}
function terminal(R: Room, x: number, y: number, crt: boolean): void { // computador sobre a mesa
  screenP(R, x, y - 14, crt ? 12 : 14, crt ? 11 : 9, crt ? C('#7be08a') : C('#9fd8ff'), { crt, stand: false });
  obj(R, (q) => { bev(q, x - 1, y - 3, 16, 3, lv(C('#c8c4b8'), 3)); });
}
function desk(R: Room, x: number, w: number): void { counter(R, x, w, { h: 20, top: R.pal.woodDark }); }
function stageBlock(R: Room, x: number, w: number, h: number, c?: Col): void {
  shadow(R.p, x, FY, w, 80);
  obj(R, (q) => { bev(q, x, FY - h, w, h, c ?? R.pal.wood); grain(q, x, FY - h, w, h, c ?? R.pal.wood, x); q.hline(x, x + w - 1, FY - h, lv(c ?? R.pal.wood, 5)); });
}
function mic(R: Room, x: number, y: number): void { obj(R, (q) => { q.vline(x, y - 22, y - 3, lv(steel(R), 2.6)); q.rect(x - 4, y - 3, 9, 3, lv(steel(R), 2)); q.disc(x + 0.5, y - 24, 2.4, lv(steel(R), 4)); }); }
function piano(R: Room, x: number, y: number, w = 40): void {
  shadow(R.p, x, y, w, 90);
  obj(R, (q) => { bev(q, x, y - 30, w, 30, lv(C('#2a2630'), 2.6)); q.rect(x + 2, y - 15, w - 4, 4, lv(C('#efe6d0'), 4)); for (let i = x + 4; i < x + w - 3; i += 3) q.vline(i, y - 15, y - 12, INK); q.rect(x + 2, y - 28, w - 4, 8, lv(C('#2a2630'), 1.6)); q.rect(x + 3, y - 10, 2, 10, lv(C('#2a2630'), 2)); q.rect(x + w - 5, y - 10, 2, 10, lv(C('#2a2630'), 1.8)); });
}
function drums(R: Room, x: number, y: number): void {
  obj(R, (q) => { q.disc(x + 10, y - 9, 9, lv(R.pal.accent2, 3)); q.disc(x + 10, y - 9, 6, lv(C('#e8e2d4'), 4)); q.disc(x + 2, y - 22, 5, lv(C('#e8e2d4'), 3.6)); q.disc(x + 20, y - 22, 5, lv(C('#e8e2d4'), 3.2)); q.ring(x - 4, y - 27, 5, lv(R.pal.gold, 4.4)); q.ring(x + 26, y - 26, 5, lv(R.pal.gold, 4)); });
}
function spot(R: Room, x: number, y: number, c: Col, w = 26): void { // cone de refletor
  for (let j = 0; j < y; j += 1) { const half = Math.round((w / 2) * (j / y)); R.light.hline(x - half, x + half, j, withAlpha(c, 22 + Math.round(18 * (1 - j / y)))); }
}

// ---------------------------------------------------------------- interiores

type Draw = (R: Room) => Spot2[];

const bank: Draw = (R) => {
  const e = R.ep, mar = cols('#d8d0c0', '#a89c88');
  windowP(R, 30, 18, 34, 38); windowP(R, 296, 18, 34, 38); clockP(R, 180, 24, 9);
  if (e >= 3) { picture(R, 98, 22, 30, 20, C('#4a6a8a'), C('#c8a050')); picture(R, 232, 22, 30, 20, C('#8a5a3a'), C('#4a6a40')); } else { picture(R, 100, 24, 26, 22, C('#6a4a3a'), C('#9a8a5a')); picture(R, 234, 24, 26, 22, C('#4a5a7a'), C('#8a6a4a')); }
  vault(R, 290, FY - 2);
  if (e <= 1) { cage(R, 80, 52); cage(R, 150, 52); lampHang(R, 120, 0, 18); lampHang(R, 240, 0, 18); }
  else { counter(R, 70, 150, { h: 24, glass: e <= 3, top: lv(mar[0], 3), body: lv(R.pal.woodDark, 3) }); for (let i = 0; i < 3; i++) terminal(R, 88 + i * 46, FY - 24, e <= 3); lampHang(R, 140, 0, 14); }
  if (e >= 4) { obj(R, (q) => { bev(q, 24, FY - 40, 24, 40, lv(C('#8a8c96'), 3)); q.rect(27, FY - 36, 18, 12, lv(C('#9fd8ff'), 3)); q.rect(30, FY - 19, 12, 3, INK); }); R.light.rect(26, FY - 38, 20, 14, withAlpha(C('#9fd8ff'), 40)); }
  else desk(R, 20, 40);
  plant(R, 340, FY, 20); bench(R, 236, FY + 2, 40, R.pal.fabric);
  return [S(0.36), S(0.5, FY + 14), S(0.62, FY + 10, 'stand', 'SW'), S(0.17, FY + 6, 'sit')];
};

const court: Draw = (R) => {
  const e = R.ep;
  windowP(R, 24, 16, 30, 44); windowP(R, 306, 16, 30, 44);
  pillar(R, 70, 12, lv(R.pal.wall, 3.4), 10); pillar(R, 280, 12, lv(R.pal.wall, 3.4), 10);
  obj(R, (q) => { q.rect(160, 18, 40, 3, lv(R.pal.gold, 4)); q.vline(180, 21, 40, lv(R.pal.gold, 3)); q.hline(166, 194, 40, lv(R.pal.gold, 3.6)); q.line(166, 40, 162, 50, lv(R.pal.gold, 3)); q.line(194, 40, 198, 50, lv(R.pal.gold, 3)); q.ring(162, 52, 4, lv(R.pal.gold, 3.6)); q.ring(198, 52, 4, lv(R.pal.gold, 3.6)); });
  // bancada do juiz e mesas
  stageBlock(R, 120, 120, 12, lv(R.pal.woodDark, 3)); counter(R, 130, 100, { h: 26, y: FY - 12, top: R.pal.wood });
  obj(R, (q) => { q.rect(172, FY - 44, 16, 6, lv(R.pal.paper, 4)); q.rect(176, FY - 48, 8, 4, lv(R.pal.accent2, 3)); });
  table(R, 20, FY + 6, 70, { cloth: lv(R.pal.fabric2, 3) }); table(R, 270, FY + 6, 70, { cloth: lv(R.pal.fabric2, 3) });
  if (e >= 3) { terminal(R, 30, FY - 9, e <= 3); terminal(R, 290, FY - 9, e <= 3); } else { obj(R, (q) => { bev(q, 30, FY - 24, 22, 4, lv(R.pal.paper, 4)); bev(q, 292, FY - 24, 22, 4, lv(R.pal.paper, 4)); }); }
  lampHang(R, 90, 0, 22); lampHang(R, 270, 0, 22);
  return [S(0.5, FY - 20, 'sit'), S(0.2, FY + 14), S(0.78, FY + 14, 'stand', 'SW'), S(0.45, FY + 16)];
};

const hospital: Draw = (R) => {
  const e = R.ep, tile = cols('#d8e4e0', '#aebfba');
  windowP(R, 22, 16, 34, 40); windowP(R, 304, 16, 34, 40);
  obj(R, (q) => { q.rect(176, 14, 8, 22, lv(C('#d83a3a'), 3)); q.rect(169, 21, 22, 8, lv(C('#d83a3a'), 3)); });
  // leitos
  for (const bx of [70, 160, 250]) {
    shadow(R.p, bx, FY, 66, 90);
    obj(R, (q) => { bev(q, bx, FY - 14, 66, 6, lv(steel(R), 2.8)); bev(q, bx + 2, FY - 22, 62, 9, lv(C('#e8eef0'), 3.4)); bev(q, bx + 2, FY - 30, 16, 10, lv(C('#e8eef0'), 4)); q.rect(bx + 4, FY - 8, 2, 8, lv(steel(R), 2)); q.rect(bx + 60, FY - 8, 2, 8, lv(steel(R), 2)); q.rect(bx + 22, FY - 22, 40, 3, lv(R.pal.fabric2, 3)); });
  }
  obj(R, (q) => { q.vline(138, FY - 52, FY - 2, lv(steel(R), 3)); q.rect(132, FY - 54, 14, 6, lv(C('#a8d8f0'), 3.6)); q.rect(134, FY - 46, 10, 2, lv(C('#a8d8f0'), 2.4)); });
  if (e >= 3) { screenP(R, 100, 36, 20, 12, C('#7be08a'), { crt: e <= 3, stand: false }); } else obj(R, (q) => { q.rect(104, 28, 14, 24, lv(R.pal.paper, 3.8)); q.rect(107, 33, 8, 2, INK); q.rect(107, 38, 8, 2, INK); });
  counter(R, 14, 40, { h: 24, top: lv(tile[0], 3.4), body: lv(tile[1], 3) });
  if (R.year >= 1970) signBoard(R, 236, 22, 'REABILITACAO', { bg: lv(C('#2a6a8a'), 3), fg: C('#e8f4ff') });
  lampHang(R, 120, 0, 8, C('#e8f4ff')); lampHang(R, 240, 0, 8, C('#e8f4ff'));
  return [S(0.18, FY + 6), S(0.34, FY + 14), S(0.6, FY + 14, 'stand', 'SW'), S(0.8, FY + 10, 'sit')];
};

const stadium: Draw = (R) => {
  const e = R.ep;
  // arquibancada ao fundo: degraus com torcida em pontos de cor, refletores e placar
  for (let i = 0; i < 6; i++) { const y = 28 + i * 11; R.p.rect(0, y, IW, 11, lv(C('#a8a8a4'), 2.6 + i * 0.12)); R.p.hline(0, IW - 1, y, lv(C('#d8d8d0'), 4)); for (let x = 2; x < IW; x += 5) { const n = noise(x, i, 11); if (n > 0.28) { R.p.rect(x, y + 3, 3, 4, lv(wallCols[Math.floor(n * 6) % 6], 3)); R.p.rect(x, y + 2, 3, 2, lv(C('#e8c8a0'), 3.6)); } } }
  for (let y = 0; y < 28; y++) for (let x = 0; x < IW; x++) R.p.put(x, y, lv(R.pal.sky, 3.4 - y / 40));
  for (const lx of [40, 320]) { obj(R, (q) => { q.rect(lx, 2, 3, 70, lv(steel(R), 2.6)); bev(q, lx - 12, 0, 28, 10, lv(steel(R), 3)); for (let i = 0; i < 6; i++) q.set(lx - 9 + i * 4, 4, lv(C('#fff6d0'), 5)); }); R.light.disc(lx + 2, 8, 14, withAlpha(C('#fff6d0'), 30)); }
  obj(R, (q) => { bev(q, 150, 6, 60, 22, lv(C('#2a2a34'), 3)); drawText(q, e >= 4 ? 'HOME 2 1' : 'CASA 2 1', 156, 14, lv(R.pal.gold, 4.4)); });
  // gramado, linha de campo e palco central
  for (let y = WALL_Y - 6; y < IH; y++) for (let x = 0; x < IW; x++) R.p.put(x, y, lv(C('#4a8a3a'), 2.8 + ((x >> 4) % 2) * 0.35 + (y - WALL_Y) / 60));
  R.p.hline(0, IW - 1, WALL_Y + 14, lv(C('#e8f0e0'), 4)); R.p.disc(180, WALL_Y + 28, 20, 0); R.p.ring(180, WALL_Y + 30, 18, lv(C('#e8f0e0'), 4));
  stageBlock(R, 120, 120, 10, lv(R.pal.woodDark, 3)); speaker(R, 126, FY - 10, 26); speaker(R, 221, FY - 10, 26); mic(R, 180, FY - 10);
  obj(R, (q) => { q.rect(150, FY - 28, 60, 2, lv(steel(R), 3)); });
  spot(R, 180, WALL_Y, C('#fff6d0'), 70);
  return [S(0.5, FY - 10, 'play'), S(0.38, FY - 10, 'play'), S(0.62, FY - 10, 'play', 'SW'), S(0.2, FY + 14), S(0.82, FY + 14, 'stand', 'SW')];
};

const jazz: Draw = (R) => {
  windowP(R, 20, 14, 26, 30, { night: true }); poster(R, 300, 22, 20, 28, C('#8a2430'), C('#e0b860'), 'JAZZ'); poster(R, 326, 26, 18, 24, C('#2a4a6a'), C('#e8d8b0'));
  stageBlock(R, 140, 140, 10, lv(R.pal.woodDark, 3));
  piano(R, 150, FY - 10, 40); drums(R, 250, FY - 10); obj(R, (q) => { bev(q, 232, FY - 24, 8, 14, lv(C('#2a2630'), 3)); q.line(236, FY - 24, 236, FY - 40, lv(steel(R), 3)); q.line(236, FY - 40, 244, FY - 44, lv(R.pal.gold, 4)); q.disc(246, FY - 44, 3, lv(R.pal.gold, 4.4)); });
  obj(R, (q) => { q.vline(210, FY - 40, FY - 12, lv(steel(R), 2.8)); q.disc(210, FY - 44, 3, lv(steel(R), 4)); q.rect(206, FY - 12, 9, 2, lv(steel(R), 2.4)); });
  counter(R, 14, 90, { h: 26, body: lv(R.pal.woodDark, 3.2), top: lv(C('#2a2630'), 3) });
  obj(R, (q) => { for (let i = 0; i < 6; i++) { q.rect(26 + i * 12, FY - 44, 3, 11, lv(cols('#2a6a4a', '#7a3a1a', '#c8a050')[i % 3], 3)); q.rect(26 + i * 12, FY - 46, 3, 2, lv(C('#e8e2d4'), 3)); } });
  for (const tx of [120, 296]) { table(R, tx - 10, FY + 14, 30, { cloth: lv(R.pal.accent2, 2.6) }); obj(R, (q) => { q.rect(tx + 3, FY - 5, 3, 5, lv(R.pal.gold, 4)); }); R.light.disc(tx + 4, FY - 6, 4, withAlpha(C('#ffd889'), 90)); chair(R, tx - 18, FY + 14, lv(R.pal.fabric, 3), true); chair(R, tx + 22, FY + 14, lv(R.pal.fabric, 3), true, true); }
  spot(R, 180, WALL_Y, C('#ffd889'), 60); lampHang(R, 70, 0, 12, C('#ffb860')); lampHang(R, 290, 0, 12, C('#ffb860'));
  for (let i = 0; i < 28; i++) R.light.set(60 + ((i * 53) % 240), 8 + ((i * 17) % 50), withAlpha(C('#e8e0d0'), 40 + ((i * 7) % 40))); // fumaça
  return [S(0.46, FY - 10, 'sit'), S(0.6, FY - 10, 'play'), S(0.72, FY - 10, 'play', 'SW'), S(0.15, FY + 4), S(0.34, FY + 18, 'sit'), S(0.84, FY + 18, 'sit', 'SW')];
};

const nightclub: Draw = (R) => {
  const e = R.ep, c1 = e >= 5 ? C('#7be0ff') : e >= 4 ? C('#70ff90') : C('#ff5ab0'), c2 = e >= 5 ? C('#c070ff') : e >= 4 ? C('#ff4040') : C('#ffd040');
  // pista iluminada
  for (let y = WALL_Y; y < IH; y++) for (let x = 60; x < 300; x++) { const a = (Math.floor((x - 60) / 16) + Math.floor((y - WALL_Y) / 8)) % 2; R.p.put(x, y, lv(a ? c1 : c2, 2.4 + (y - WALL_Y) / 90)); }
  if (e >= 5) { obj(R, (q) => { bev(q, 110, 18, 140, 54, lv(C('#14142a'), 3)); }); for (let j = 0; j < 50; j++) for (let i = 0; i < 136; i++) { const bar = Math.floor(i / 8), hh = 8 + Math.floor(noise(bar, 3, 9) * 34); R.p.put(112 + i, 20 + j, i % 8 === 7 ? lv(C('#14142a'), 3) : 50 - j <= hh ? lv(50 - j > hh - 4 ? c2 : c1, 3 + (j / 50) * 0.6) : lv(C('#14142a'), 2.6)); } R.light.rect(106, 14, 148, 62, withAlpha(c1, 30)); }
  else if (e >= 4) { for (let i = 0; i < 6; i++) { R.light.line(180, 4, 40 + i * 56, WALL_Y, withAlpha(i % 2 ? c1 : c2, 110)); R.light.line(181, 4, 41 + i * 56, WALL_Y, withAlpha(i % 2 ? c1 : c2, 60)); } }
  else { obj(R, (q) => { q.disc(180, 20, 10, lv(C('#d0d4e0'), 3.6)); q.vline(180, 0, 10, lv(steel(R), 2)); for (let k = 0; k < 14; k++) q.set(172 + (k * 5) % 16, 12 + (k * 3) % 16, C('#ffffff')); }); for (let k = 0; k < 12; k++) R.light.disc(40 + ((k * 61) % 280), 30 + ((k * 23) % 60), 4, withAlpha(k % 2 ? c1 : c2, 40)); }
  // cabine do DJ
  stageBlock(R, 140, 80, 22, lv(C('#22222e'), 3)); obj(R, (q) => { bev(q, 150, FY - 32, 22, 10, lv(C('#3a3a46'), 3)); q.disc(158, FY - 27, 4, lv(C('#14141c'), 3)); q.disc(166, FY - 27, 4, lv(C('#14141c'), 3)); q.rect(176, FY - 32, 18, 8, lv(C('#14141c'), 3.4)); for (let i = 0; i < 4; i++) q.set(178 + i * 4, FY - 29, lv(c1, 4.4)); });
  doorP(R, 332, FY, { exit: true }); speaker(R, 40, FY, 34); speaker(R, 306, FY, 34); speaker(R, 120, FY - 22, 22); speaker(R, 227, FY - 22, 22);
  obj(R, (q) => { bev(q, 6, FY - 28, 28, 28, lv(C('#2a2234'), 3)); }); neon(R, 10, FY - 40, 22, c1, 2); neon(R, 10, FY - 36, 22, c2, 1);
  neon(R, 40, 8, 280, c1, 1); neon(R, 40, 12, 280, c2, 1);
  return [S(0.5, FY - 22, 'play'), S(0.3, FY + 12), S(0.42, FY + 18), S(0.6, FY + 16, 'stand', 'SW'), S(0.72, FY + 10), S(0.12, FY + 4, 'sit')];
};

const church: Draw = (R) => {
  const e = R.ep;
  // vitrais altos, arcos e nave
  for (const wx of [92, 124, 212, 244]) { obj(R, (q) => { bev(q, wx - 2, 8, 26, 50, lv(R.pal.trim, 3)); for (let j = 0; j < 46; j++) for (let i = 0; i < 22; i++) q.set(wx + i, 10 + j, lv(wallCols[((i >> 3) + (j >> 4) * 2) % 6], 2.8 + noise(i, j, wx) * 0.8)); q.vline(wx + 11, 10, 55, INK); q.hline(wx, wx + 21, 32, INK); }); R.light.rect(wx, 10, 22, 46, withAlpha(C('#fff0c0'), 22)); }
  // altar e cruz
  stageBlock(R, 150, 60, 8, lv(R.pal.wall, 3.2)); obj(R, (q) => { bev(q, 162, FY - 28, 36, 20, lv(R.pal.paper, 4)); q.rect(166, FY - 36, 4, 8, lv(R.pal.gold, 4)); q.rect(190, FY - 36, 4, 8, lv(R.pal.gold, 4)); q.rect(178, FY - 70, 4, 28, lv(R.pal.gold, 3.4)); q.rect(170, FY - 62, 20, 4, lv(R.pal.gold, 3.8)); });
  // órgão de tubos
  obj(R, (q) => { bev(q, 20, FY - 70, 56, 70, lv(R.pal.woodDark, 3)); for (let i = 0; i < 9; i++) { const h = 54 - Math.abs(4 - i) * 5; q.rect(24 + i * 6, FY - 8 - h, 4, h, lv(R.pal.metal, 3.6)); q.vline(24 + i * 6, FY - 8 - h, FY - 10, lv(R.pal.metal, 5)); q.set(25 + i * 6, FY - 8 - h + 3, INK); } bev(q, 30, FY - 12, 36, 12, lv(R.pal.wood, 2.8)); });
  // coral: bancos em degraus à direita
  obj(R, (q) => { for (let r = 0; r < 3; r++) bev(q, 244 + r * 4, FY - 8 - r * 8 - 6, 96 - r * 8, 8, lv(R.pal.wood, 2.4 - r * 0.1)); });
  for (let r = 0; r < 3; r++) for (let k = 0; k < 6 - r; k++) obj(R, (q) => { const px = 252 + r * 4 + k * 13, py = FY - 8 - r * 8 - 7; q.rect(px, py - 12, 7, 12, lv(C('#e8dcc0'), 3.2)); q.disc(px + 3.5, py - 15, 3, lv(C('#d8b890'), 3.4)); });
  // bancos da nave
  bench(R, 96, FY + 18, 56, lv(R.pal.woodDark, 3)); bench(R, 200, FY + 18, 56, lv(R.pal.woodDark, 3));
  obj(R, (q) => { for (const lx of [150, 206]) { q.rect(lx, FY - 22, 2, 14, lv(R.pal.gold, 3)); q.rect(lx - 2, FY - 24, 6, 3, lv(R.pal.gold, 4)); } }); neon(R, 152, FY - 28, 2, C('#ffd889'), 3); neon(R, 208, FY - 28, 2, C('#ffd889'), 3);
  if (e >= 3) obj(R, (q) => { bev(q, 330, FY - 24, 20, 22, lv(C('#2a2a32'), 3)); q.rect(334, FY - 20, 12, 4, lv(C('#a8d8f0'), 3)); }); // aparelho de som do coral
  return [S(0.14, FY + 10, 'play'), S(0.52, FY - 8), S(0.28, FY + 16, 'sit'), S(0.5, FY + 20, 'sit', 'SW'), S(0.8, FY - 18)];
};

const tvstudio: Draw = (R) => {
  const e = R.ep;
  // cenário e auditório
  stageBlock(R, 100, 160, 8, lv(R.pal.woodDark, 3.4));
  obj(R, (q) => { bev(q, 110, 14, 140, 54, lv(e >= 4 ? C('#1c1c3a') : R.pal.fabric, 2.8)); for (let i = 0; i < 6; i++) q.vline(122 + i * 22, 16, 66, lv(R.pal.fabric2, 2.4)); });
  if (e >= 2) signBoard(R, 180, 24, e >= 4 ? 'NO AR' : 'CALOUROS', { bg: lv(C('#2a1a3a'), 3), fg: C('#ffd040'), glow: true });
  else signBoard(R, 180, 24, 'CINEMA', { bg: lv(C('#2a1a3a'), 3), fg: C('#ffd040'), glow: true });
  if (e >= 4) { obj(R, (q) => { bev(q, 34, 20, 56, 44, lv(C('#2ea86a'), 3)); }); }
  // refletores no varal de luz
  obj(R, (q) => { q.hline(20, 340, 6, lv(steel(R), 2.4)); for (const lx of [60, 110, 170, 240, 300]) { q.rect(lx, 7, 3, 4, lv(steel(R), 2)); bev(q, lx - 3, 11, 10, 7, lv(C('#2a2a32'), 3)); } });
  for (const lx of [60, 110, 170, 240, 300]) spot(R, lx + 2, WALL_Y + 4, C('#fff0c0'), 22);
  // câmera: de manivela antes de 1950, de estúdio depois
  const cam = (x: number) => { shadow(R.p, x, FY + 14, 26, 90); obj(R, (q) => { q.rect(x + 11, FY - 16, 3, 28, lv(steel(R), 2.4)); q.line(x + 12, FY + 12, x + 2, FY + 14, lv(steel(R), 2)); q.line(x + 12, FY + 12, x + 24, FY + 14, lv(steel(R), 2)); bev(q, x, FY - 32, 26, 16, lv(C('#2a2a32'), 3)); q.rect(x + 22, FY - 29, 8, 10, lv(C('#3a3a46'), 3)); q.disc(x + 4, FY - 24, 3, lv(C('#6a8aa8'), 3.6)); if (e <= 1) { q.disc(x + 8, FY - 38, 5, lv(C('#2a2a32'), 3)); q.disc(x + 18, FY - 38, 5, lv(C('#2a2a32'), 3)); } else q.rect(x + 6, FY - 36, 14, 4, lv(C('#2a2a32'), 2.4)); }); };
  cam(30); cam(300);
  counter(R, 120, 54, { h: 16, y: FY - 8, top: lv(R.pal.wood, 3.4) }); mic(R, 190, FY - 8);
  if (e >= 2) signBoard(R, 62, 44, 'APLAUSOS', { bg: lv(C('#2a1a3a'), 3), fg: C('#ff5a40'), glow: true });
  for (let r = 0; r < 2; r++) obj(R, (q) => { bev(q, 26, FY + 20 + r * 16, 308, 4, lv(R.pal.woodDark, 2.2)); for (let k = 0; k < 15; k++) { const px = 32 + k * 20 + r * 8, py = FY + 20 + r * 16; q.rect(px, py - 9, 10, 9, lv(wallCols[(k + r) % 6], 2.8)); q.disc(px + 5, py - 12, 3, lv(C('#d8b890'), 3.4)); } });
  return [S(0.5, FY - 8, 'stand'), S(0.4, FY - 8, 'play'), S(0.6, FY - 8, 'stand', 'SW'), S(0.14, FY + 16), S(0.86, FY + 16, 'stand', 'SW')];
};

const adagency: Draw = (R) => {
  const e = R.ep;
  windowP(R, 24, 14, 40, 40); windowP(R, 296, 14, 40, 40);
  // cartazes e quadro de ideias
  poster(R, 90, 14, 24, 34, C('#c83a2a'), C('#f0d060'), e >= 3 ? 'NOVO' : 'COMPRE'); poster(R, 120, 20, 22, 30, C('#2a6aa8'), C('#e8e0c0')); poster(R, 148, 12, 26, 38, C('#3a8a4a'), C('#f0e8d0'));
  obj(R, (q) => { bev(q, 190, 14, 80, 46, lv(R.pal.paper, 3.8)); for (let i = 0; i < 6; i++) { q.rect(196 + (i % 3) * 24, 20 + (i >> 1) * 14 * (i > 2 ? 1 : 0) + (i > 2 ? 0 : 0), 18, 10, lv(wallCols[i], 3.4)); } q.hline(196, 262, 38, INK); });
  // mesa de criação com monitor / máquina de escrever, e mesa de som para jingle
  table(R, 70, FY + 6, 90, { top: lv(R.pal.woodDark, 3) }); if (e >= 3) terminal(R, 90, FY - 9, e <= 3); else obj(R, (q) => { bev(q, 92, FY - 20, 18, 6, lv(C('#2a2a32'), 3)); q.rect(94, FY - 26, 14, 6, lv(R.pal.paper, 4)); });
  obj(R, (q) => { bev(q, 220, FY - 28, 40, 28, lv(C('#2a2a32'), 3)); for (let i = 0; i < 6; i++) { q.rect(224 + i * 6, FY - 24, 3, 6, lv(R.pal.accent2, 3.4)); } q.disc(236, FY - 8, 3, lv(steel(R), 4)); });
  speaker(R, 266, FY, 24); mic(R, 292, FY);
  table(R, 170, FY + 16, 70, { top: lv(R.pal.wood, 3) }); chair(R, 160, FY + 16, lv(R.pal.fabric, 3), true); chair(R, 242, FY + 16, lv(R.pal.fabric, 3), true, true);
  obj(R, (q) => { q.line(14, FY, 22, FY - 40, lv(R.pal.woodDark, 2.4)); q.line(40, FY, 32, FY - 40, lv(R.pal.woodDark, 2.4)); bev(q, 12, FY - 52, 34, 26, lv(R.pal.paper, 4)); q.rect(16, FY - 48, 26, 12, lv(R.pal.accent2, 3)); q.disc(29, FY - 44, 4, lv(R.pal.gold, 4)); });
  plant(R, 340, FY, 22); lampHang(R, 120, 0, 14); lampHang(R, 240, 0, 14);
  if (e >= 5) screenP(R, 300, 32, 40, 24, C('#9fd8ff'), { stand: false });
  return [S(0.3, FY + 12), S(0.5, FY + 16, 'stand', 'SW'), S(0.7, FY + 10), S(0.18, FY - 2, 'sit')];
};

const samba: Draw = (R) => {
  const e = R.ep, g = C('#2a8a4a'), pk = C('#e83a8a');
  // quadra aberta: faixas verde e rosa, bandeirolas, bateria em arquibancada
  for (let y = 0; y < 30; y++) for (let x = 0; x < IW; x++) R.p.put(x, y, lv(R.pal.sky, 3.5 - y / 40));
  for (let i = 0; i < 26; i++) { obj(R, (q) => { q.rect(10 + i * 14, 10 + (i % 2) * 3, 8, 12, lv(i % 2 ? g : pk, 3.2)); q.hline(10 + i * 14, 17 + i * 14, 10 + (i % 2) * 3, lv(i % 2 ? g : pk, 4.8)); }); }
  R.p.hline(0, IW - 1, 9, lv(R.pal.metal, 2.4));
  for (let y = 30; y < WALL_Y; y++) for (let x = 0; x < IW; x++) if (((x + y) >> 4) % 2 === 0) R.p.put(x, y, lv(((x + y) >> 5) % 2 ? pk : g, 2.4 - (y - 30) / 90));
  obj(R, (q) => { bev(q, 150, 34, 60, 30, lv(C('#14142a'), 3)); q.disc(180, 49, 9, lv(R.pal.gold, 3.6)); q.disc(180, 49, 5, lv(pk, 3)); for (let k = 0; k < 8; k++) q.set(180 + Math.round(Math.cos(k * 0.785) * 12), 49 + Math.round(Math.sin(k * 0.785) * 12), lv(g, 4.4)); });
  obj(R, (q) => { for (const fx of [14, 330]) { q.vline(fx, 34, FY, lv(R.pal.woodDark, 2.4)); bev(q, fx, 36, 18, 22, lv(fx < 100 ? g : pk, 3)); q.hline(fx + 2, fx + 15, 47, lv(R.pal.paper, 4)); } });
  stageBlock(R, 20, 150, 18, lv(R.pal.wall, 3)); obj(R, (q) => { for (let i = 0; i < 12; i++) { const x = 28 + i * 12, y = FY - 18; q.rect(x, y - 14, 8, 14, lv(i % 2 ? g : pk, 2.8)); q.disc(x + 4, y - 17, 3, lv(C('#a86a3a'), 3.2)); q.disc(x + 4, y - 4, 4, lv(C('#d8c8a0'), 3.6)); } });
  // alegoria: carro com coroa
  obj(R, (q) => { bev(q, 230, FY - 44, 100, 28, lv(pk, 3)); q.disc(250, FY - 18, 8, lv(C('#2a2a32'), 3)); q.disc(310, FY - 18, 8, lv(C('#2a2a32'), 3)); bev(q, 250, FY - 70, 60, 26, lv(R.pal.gold, 3.4)); q.ring(280, FY - 76, 8, lv(R.pal.gold, 4.6)); for (let k = 0; k < 7; k++) q.line(262 + k * 6, FY - 70, 258 + k * 7, FY - 90, lv(g, 3 + (k % 2))); });
  neon(R, 120, 4, 120, e >= 4 ? C('#70ff90') : C('#ffd040'), 1);
  for (let i = 0; i < 9; i++) obj(R, (q) => { const px = 30 + i * 22 + (i % 2) * 6, py = FY + 24 + (i % 3) * 2; q.rect(px, py - 10, 8, 10, lv(wallCols[i % 6], 2.8)); q.disc(px + 4, py - 12, 3, lv(C('#a86a3a'), 3.2)); });
  return [S(0.2, FY - 12, 'play'), S(0.32, FY - 12, 'play'), S(0.44, FY - 12, 'play', 'SW'), S(0.6, FY + 16), S(0.74, FY + 10, 'stand', 'SW'), S(0.5, FY + 20)];
};

const printShop: Draw = (R) => {
  const e = R.ep, ink = cols('#1a1a22', '#c83a2a', '#2a6aa8', '#e0c040');
  windowP(R, 24, 14, 34, 36);
  // varal de impressos secando
  obj(R, (q) => { q.hline(80, 340, 14, lv(steel(R), 2.4)); for (let i = 0; i < 12; i++) { q.rect(84 + i * 21, 15, 12, 20 + (i % 3) * 3, lv(R.pal.paper, 3.8)); q.rect(86 + i * 21, 19, 8, 8, lv(wallCols[i % 6], 3)); } });
  // prensa / máquina offset grande
  shadow(R.p, 70, FY, 110, 100);
  obj(R, (q) => {
    if (e <= 1) { bev(q, 80, FY - 56, 70, 56, lv(C('#2a2a32'), 3)); q.rect(90, FY - 66, 50, 10, lv(steel(R), 3.4)); q.disc(160, FY - 30, 12, lv(R.pal.accent2, 3)); q.line(160, FY - 30, 172, FY - 40, lv(steel(R), 4)); for (let i = 0; i < 4; i++) q.rect(88 + i * 14, FY - 46, 10, 20, lv(R.pal.paper, 3.6)); }
    else { bev(q, 70, FY - 50, 110, 50, lv(e >= 5 ? C('#c8d0d8') : C('#6a7a8a'), 3)); for (let i = 0; i < 4; i++) { q.rect(78 + i * 26, FY - 44, 20, 20, lv(ink[i], 3)); q.ring(88 + i * 26, FY - 34, 7, lv(steel(R), 4.4)); } q.rect(74, FY - 16, 102, 6, lv(R.pal.paper, 3.8)); }
  });
  if (e >= 5) screenP(R, 190, FY - 70, 24, 16, C('#9fd8ff'), { stand: false });
  // mesa de arte com capas em prova
  table(R, 220, FY + 6, 86, { top: lv(R.pal.woodDark, 3) }); obj(R, (q) => { bev(q, 226, FY - 22, 22, 20, lv(R.pal.paper, 4)); q.rect(229, FY - 19, 16, 14, lv(wallCols[2], 3)); q.disc(237, FY - 12, 4, lv(wallCols[0], 3.4)); bev(q, 254, FY - 20, 20, 18, lv(R.pal.paper, 4)); q.rect(257, FY - 17, 14, 12, lv(wallCols[1], 3)); });
  // latas de tinta e rolos de papel
  obj(R, (q) => { for (let i = 0; i < 4; i++) { q.rect(314 + i * 8, FY - 10, 7, 10, lv(ink[i], 3)); q.hline(314 + i * 8, 320 + i * 8, FY - 10, lv(ink[i], 5)); } q.disc(330, FY - 18 - 6, 8, lv(R.pal.paper, 3.4)); q.disc(330, FY - 24, 3, lv(R.pal.woodDark, 2)); });
  lampHang(R, 130, 0, 14); lampHang(R, 260, 0, 14);
  return [S(0.18, FY + 10), S(0.42, FY + 18), S(0.66, FY + 14, 'stand', 'SW'), S(0.8, FY + 10, 'stand', 'SW')];
};

const pirate: Draw = (R) => {
  const e = R.ep;
  // porão/garagem: tijolo aparente, cabos, transmissor, discos empilhados
  obj(R, (q) => { q.hline(0, IW - 1, 18, lv(C('#3a3a42'), 2)); q.hline(0, IW - 1, 19, lv(C('#2a2a32'), 1)); for (let i = 0; i < 9; i++) q.vline(20 + i * 40, 18, 28 + (i % 3) * 4, lv(C('#2a2a32'), 2)); });
  // antena e mastro até o teto
  obj(R, (q) => { q.vline(318, 0, FY - 10, lv(steel(R), 2.4)); for (let i = 0; i < 4; i++) q.hline(306 + i * 2, 330 - i * 2, 22 + i * 12, lv(steel(R), 3.4)); });
  // rack do transmissor
  shadow(R.p, 230, FY, 60, 90);
  obj(R, (q) => { bev(q, 230, FY - 50, 60, 50, lv(C('#34343c'), 3)); for (let i = 0; i < 4; i++) { q.rect(234, FY - 46 + i * 12, 52, 9, lv(C('#22222a'), 3)); q.disc(242, FY - 41 + i * 12, 2, lv(i % 2 ? C('#e83a3a') : C('#40e070'), 4)); q.rect(252, FY - 42 + i * 12, 28, 2, lv(steel(R), 3)); } });
  R.light.disc(242, FY - 41, 5, withAlpha(C('#e83a3a'), 60));
  // mesa de mixagem + discos + microfone de lata
  table(R, 70, FY + 4, 110, { top: lv(R.pal.woodDark, 2.6) }); obj(R, (q) => { bev(q, 84, FY - 24, 32, 10, lv(C('#2a2a32'), 3)); for (let i = 0; i < 5; i++) q.rect(88 + i * 6, FY - 22, 3, 6, lv(R.pal.accent2, 3.4)); q.disc(130, FY - 20, 8, lv(C('#14141c'), 3)); q.disc(130, FY - 20, 2, lv(R.pal.accent2, 3.4)); });
  mic(R, 160, FY - 14);
  obj(R, (q) => { for (let i = 0; i < 5; i++) q.rect(20, FY - 6 - i * 4, 36, 4, lv(i % 2 ? C('#1a1a22') : C('#3a3a46'), 2.8)); });
  poster(R, 20, 30, 22, 30, C('#c83a2a'), C('#14141c'), 'FREE'); poster(R, 50, 36, 20, 26, C('#40e070'), C('#14141c'));
  if (e >= 4) screenP(R, 190, 38, 24, 16, C('#7be08a'), { crt: e <= 4, stand: false });
  obj(R, (q) => { bev(q, 196, FY - 14, 40, 10, lv(R.pal.fabric, 2.6)); bev(q, 196, FY - 26, 40, 14, lv(R.pal.fabric, 2.2)); q.rect(194, FY - 22, 4, 18, lv(R.pal.fabric, 3)); q.rect(234, FY - 22, 4, 18, lv(R.pal.fabric, 3)); });
  obj(R, (q) => { q.line(160, FY + 2, 190, FY + 8, lv(C('#14141c'), 2)); q.line(190, FY + 8, 228, FY + 2, lv(C('#14141c'), 2)); });
  lampHang(R, 150, 8, 22, C('#ffb860'));
  return [S(0.3, FY + 14, 'sit'), S(0.45, FY + 18), S(0.62, FY + 14, 'stand', 'SW'), S(0.86, FY + 6)];
};

const station: Draw = (R) => {
  const e = R.ep;
  // saguão alto: arcos, relógio grande, painel de partidas e a plataforma ao fundo
  for (let i = 0; i < 5; i++) obj(R, (q) => { bev(q, 20 + i * 76, 8, 8, WALL_Y - 8, lv(R.pal.wall, 3)); q.hline(24 + i * 76, 24 + i * 76 + 68, 8, lv(R.pal.wall, 4)); });
  clockP(R, 180, 26, 12);
  if (e <= 1) { obj(R, (q) => { bev(q, 120, 42, 120, 32, lv(C('#14141c'), 3)); for (let i = 0; i < 4; i++) { drawText(q, ['LISBOA 9 10', 'PARIS 10 30', 'ROMA 12 05', 'WIEN 13 40'][i], 126, 46 + i * 7, lv(R.pal.gold, 4.4)); } }); }
  else { screenP(R, 120, 42, 120, 32, e >= 4 ? C('#ffd040') : C('#e8a030'), { stand: false }); for (let i = 0; i < 4; i++) drawText(R.p, ['SAO PAULO 10 20', 'RIO 10 45', 'PARIS 11 05', 'BERLIM 11 30'][i], 128, 46 + i * 7, C('#2a1a08')); }
  // trilho e trem à direita
  R.p.rect(250, WALL_Y + 6, 110, 6, lv(C('#6a6a72'), 2.4)); for (let x = 252; x < 360; x += 8) R.p.rect(x, WALL_Y + 6, 3, 6, lv(R.pal.woodDark, 2));
  obj(R, (q) => { bev(q, 250, WALL_Y - 40, 110, 46, lv(e >= 4 ? C('#d8dce4') : C('#7a2a24'), 3)); for (let i = 0; i < 4; i++) q.rect(258 + i * 26, WALL_Y - 32, 18, 12, lv(C('#a8d8f0'), 3)); q.rect(250, WALL_Y - 10, 110, 3, lv(R.pal.accent, 3)); q.disc(266, WALL_Y + 8, 5, lv(C('#2a2a32'), 3)); q.disc(340, WALL_Y + 8, 5, lv(C('#2a2a32'), 3)); });
  // bilheteria e bancos
  counter(R, 14, 78, { h: 26, glass: true, body: lv(R.pal.woodDark, 3.2) }); bench(R, 120, FY + 18, 64, R.pal.wood); bench(R, 196, FY + 18, 44, R.pal.wood);
  obj(R, (q) => { for (let i = 0; i < 2; i++) { bev(q, 100 + i * 150, FY - 14, 22, 14, lv(R.pal.woodDark, 2.8)); q.rect(104 + i * 150, FY - 18, 14, 4, lv(C('#a86a3a'), 3)); } });
  lampHang(R, 100, 0, 16); lampHang(R, 260, 0, 16);
  return [S(0.16, FY - 2), S(0.4, FY + 16, 'sit'), S(0.56, FY + 18, 'sit'), S(0.7, FY + 10, 'stand', 'SW'), S(0.3, FY + 20)];
};

const port: Draw = (R) => {
  const e = R.ep, sea = C('#3a6a9a');
  // mar e céu ao fundo, navio, guindastes
  for (let y = 0; y < 60; y++) for (let x = 0; x < IW; x++) R.p.put(x, y, lv(R.pal.sky, 3.6 - y / 50));
  for (let y = 60; y < WALL_Y + 8; y++) for (let x = 0; x < IW; x++) R.p.put(x, y, lv(sea, 2.8 + ((y + (x >> 3)) % 4 === 0 ? 0.6 : 0) - (y - 60) / 60));
  obj(R, (q) => { q.rect(30, 40, 150, 30, lv(e <= 1 ? C('#2a2a32') : C('#a82a2a'), 3)); q.poly([[30, 70], [180, 70], [168, 80], [44, 80]], lv(C('#1a1a22'), 3)); q.rect(70, 28, 16, 12, lv(C('#e8e2d4'), 3.6)); q.rect(76, 14, 5, 14, lv(C('#2a2a32'), 3)); q.rect(75, 14, 7, 3, lv(C('#e83a3a'), 3)); if (e >= 3) { for (let i = 0; i < 5; i++) q.rect(100 + i * 14, 34, 12, 6, lv(wallCols[i % 6], 3)); } });
  const crane = (x: number) => obj(R, (q) => { q.vline(x, 20, WALL_Y, lv(steel(R), 2.6)); q.vline(x + 10, 20, WALL_Y, lv(steel(R), 2.2)); q.hline(x - 20, x + 40, 20, lv(steel(R), 3.4)); q.line(x, 20, x + 10, WALL_Y - 20, lv(steel(R), 2)); q.vline(x + 36, 20, 44, lv(steel(R), 1.8)); q.rect(x + 32, 44, 8, 6, lv(R.pal.accent2, 3)); });
  crane(215);
  // cais: pilha de caixotes e fardos, cordas e poste
  R.p.rect(0, WALL_Y + 8, IW, 10, lv(C('#8a8a82'), 2.6));
  obj(R, (q) => { for (let i = 0; i < 3; i++) { bev(q, 20 + i * 24, FY - 20 - (i % 2) * 14, 22, 20 + (i % 2) * 14, lv(R.pal.wood, 2.6)); q.line(22 + i * 24, FY - 20 - (i % 2) * 14, 40 + i * 24, FY - 2, lv(R.pal.woodDark, 2)); } });
  obj(R, (q) => { q.rect(150, FY - 24, 7, 24, lv(steel(R), 2.6)); q.rect(147, FY - 28, 13, 5, lv(steel(R), 3.4)); q.line(157, FY - 24, 240, FY - 6, lv(R.pal.woodDark, 3)); });
  // cabine da bilheteria de passagem
  counter(R, 270, 70, { h: 26, y: FY + 2, glass: true }); obj(R, (q) => { q.rect(274, FY - 52, 62, 12, lv(R.pal.woodDark, 3)); }); signBoard(R, 305, FY - 62, 'PASSAGENS', { bg: lv(C('#14202a'), 3), fg: C('#e8e0c0') });
  return [S(0.46, FY + 12), S(0.62, FY + 16), S(0.78, FY + 12, 'stand', 'SW'), S(0.12, FY + 6)];
};

export const INT2_DRAW: Record<Int2Id, { draw: Draw; shell: (year: number) => Parameters<typeof room>[1] }> = {
  bank: { draw: bank, shell: (y) => ({ floor: 'marble', floorA: C('#8a8478'), floorB: C('#c8c0b0'), kind: y < 1950 ? 'wainscot' : 'stone', wall: C('#d6cdb6') }) },
  court: { draw: court, shell: () => ({ floor: 'wood', kind: 'panel', wall: C('#a88458'), floorA: C('#5a3a24'), floorB: C('#6a4630') }) },
  hospital: { draw: hospital, shell: () => ({ floor: 'tiles', kind: 'tile', wall: C('#cfe0dc'), floorA: C('#b8cac6'), floorB: C('#8fa6a2') }) },
  stadium: { draw: stadium, shell: () => ({ floor: 'concrete', kind: 'plain', wall: C('#aab0b8'), floorA: C('#7a7a76') }) },
  jazz: { draw: jazz, shell: () => ({ floor: 'wood', kind: 'panel', wall: C('#5a2a34'), dim: true, floorA: C('#4a2a1c'), floorB: C('#5a3424') }) },
  nightclub: { draw: nightclub, shell: () => ({ floor: 'concrete', kind: 'plain', wall: C('#1c1830'), dim: true, floorA: C('#22203a') }) },
  church: { draw: church, shell: () => ({ floor: 'checker', kind: 'stone', wall: C('#cbbf9e'), floorA: C('#6a6258'), floorB: C('#b0a58c') }) },
  tvstudio: { draw: tvstudio, shell: (y) => ({ floor: 'rubber', kind: 'plain', wall: y < 1950 ? C('#4a4038') : C('#3a3a4a'), dim: true, floorA: C('#2e2a34') }) },
  adagency: { draw: adagency, shell: (y) => ({ floor: y < 1970 ? 'wood' : 'carpet', kind: y < 1970 ? 'wainscot' : 'plain', wall: y < 1990 ? C('#e0d4b4') : C('#e8e8ee'), floorA: y < 1970 ? undefined : C('#5a6a8a') }) },
  samba: { draw: samba, shell: () => ({ floor: 'concrete', kind: 'plain', wall: C('#7ad0a0'), floorA: C('#9a9488') }) },
  print: { draw: printShop, shell: () => ({ floor: 'concrete', kind: 'brick', wall: C('#a86a50'), floorA: C('#6a6862') }) },
  pirate: { draw: pirate, shell: () => ({ floor: 'concrete', kind: 'brick', wall: C('#6a5a60'), dim: true, floorA: C('#3a3a40') }) },
  station: { draw: station, shell: (y) => ({ floor: 'marble', kind: 'stone', wall: y < 1950 ? C('#bfae86') : C('#d4d0c4'), floorA: C('#8a847a'), floorB: C('#b8b0a0') }) },
  port: { draw: port, shell: () => ({ floor: 'concrete', kind: 'plain', wall: C('#aab4bc'), floorA: C('#8a8a82') }) },
};

/** Onde ficam as pessoas em cada interior (a época não muda as posições). */
const SPOTS = new Map<Int2Id, Spot2[]>();
export function int2Spots(id: Int2Id): Spot2[] {
  let v = SPOTS.get(id);
  if (!v) { v = INT2_DRAW[id].draw(room(1962, {})); SPOTS.set(id, v); }
  return v;
}

/** Cena opaca 360×150 do interior novo `id` no ano (as pessoas entram por cima, em int2Spots). */
export function int2Interior(id: Int2Id, year: number): Px {
  const d = INT2_DRAW[id];
  const R = room(year, d.shell(year), 31 + INT2.findIndex((t) => t.id === id));
  d.draw(R);
  return seal(R);
}

// ---------------------------------------------------------------- lojas da época (interior simples)

interface ShopSpec { sign: string; shelf: Col[]; prop: 'piano' | 'phono' | 'tailor' | 'cine' | 'radiotv' | 'jukebox' | 'hifi' | 'arcade' | 'video' | 'cd' | 'pager' | 'lan' | 'phones' | 'games' | 'vinyl' | 'cafe' | 'holo' | 'bakery' | 'sheet' | 'diner' | 'tele' | 'inst'; neon?: Col; stock?: Stock }
const SHOPS: Record<string, ShopSpec> = {
  sheet: { sign: 'PARTITURAS', shelf: cols('#e8dcc0', '#d8c8a0', '#b8a070'), prop: 'sheet', stock: 'spine' },
  piano: { sign: 'PIANOS', shelf: cols('#e8dcc0', '#6a3a24'), prop: 'piano', stock: 'spine' },
  telegraph: { sign: 'TELEGRAFO', shelf: cols('#6a5a3a', '#8a7a5a'), prop: 'tele', stock: 'box' },
  gramophone: { sign: 'GRAMOFONES', shelf: cols('#2a2a32', '#6a3a24'), prop: 'phono', stock: 'sleeve' },
  tailor: { sign: 'ALFAIATARIA', shelf: cols('#3a4a6a', '#6a4a3a', '#8a8a7a', '#2a3a2a'), prop: 'tailor', stock: 'cloth' },
  instruments: { sign: 'INSTRUMENTOS', shelf: cols('#a8452c', '#c8a050', '#3a3a42'), prop: 'inst', stock: 'box' },
  cinema: { sign: 'CINEMA', shelf: cols('#8a2430', '#e0b860'), prop: 'cine', stock: 'sleeve', neon: C('#ff5a40') },
  radio_tv: { sign: 'RADIOS E TVS', shelf: cols('#6a3a24', '#2a2a32', '#a89a78'), prop: 'radiotv', stock: 'box', neon: C('#ffd040') },
  records: { sign: 'DISCOS', shelf: cols('#c83a2a', '#2a6aa8', '#e0c040', '#14141c'), prop: 'vinyl', stock: 'sleeve', neon: C('#ff5ab0') },
  diner: { sign: 'LANCHONETE', shelf: cols('#e8d8b0', '#c83a2a'), prop: 'diner', stock: 'jar', neon: C('#40e0ff') },
  jukebox_bar: { sign: 'JUKEBOX', shelf: cols('#2a6a4a', '#7a3a1a', '#c8a050'), prop: 'jukebox', stock: 'jar', neon: C('#ff5ab0') },
  hifi: { sign: 'HI-FI', shelf: cols('#2a2a32', '#6a6a74', '#a89a78'), prop: 'hifi', stock: 'box' },
  arcade: { sign: 'FLIPERAMA', shelf: cols('#2a2a6a', '#c83a2a'), prop: 'arcade', stock: 'box', neon: C('#70ff90') },
  video: { sign: 'LOCADORA', shelf: cols('#14141c', '#c83a2a', '#2a6aa8', '#e0c040'), prop: 'video', stock: 'sleeve', neon: C('#ffd040') },
  cd_mega: { sign: 'MEGASTORE CD', shelf: cols('#c8d0d8', '#2a6aa8', '#c83a2a', '#e0c040'), prop: 'cd', stock: 'sleeve', neon: C('#40e0ff') },
  pager: { sign: 'BIPES', shelf: cols('#2a2a32', '#6a6a74'), prop: 'pager', stock: 'box' },
  lan: { sign: 'LAN HOUSE', shelf: cols('#2a2a32', '#3a3a46'), prop: 'lan', stock: 'box', neon: C('#70ff90') },
  phones: { sign: 'CELULARES', shelf: cols('#e8eef0', '#2a2a32'), prop: 'phones', stock: 'box', neon: C('#9fd8ff') },
  games: { sign: 'GAMES', shelf: cols('#2a6aa8', '#c83a2a', '#40e070', '#e0c040'), prop: 'games', stock: 'box', neon: C('#c070ff') },
  vinyl: { sign: 'VINIL', shelf: cols('#c83a2a', '#e0c040', '#2a6aa8', '#14141c'), prop: 'vinyl', stock: 'sleeve' },
  cowork: { sign: 'CAFE WI-FI', shelf: cols('#e8d8b0', '#6a3a24'), prop: 'cafe', stock: 'jar' },
  holo: { sign: 'HOLOGRAMAS', shelf: cols('#a8d8f0', '#c070ff'), prop: 'holo', stock: 'box', neon: C('#7be0ff') },
  bakery: { sign: 'PADARIA', shelf: cols('#e0b870', '#c89850', '#f0d8a0'), prop: 'bakery', stock: 'loaf' },
};
export const SHOP2_IDS: string[] = Object.keys(SHOPS);

/** Interior simples (balcão, estante, o objeto da loja e o letreiro) das lojas de época de `BIZ31` (city31). Opaco, 360×150. */
export function int2Shop(biz: string, year: number): Px {
  const sp = SHOPS[biz] ?? SHOPS.records, e = epOf(year);
  const dim = !!sp.neon && (sp.prop === 'arcade' || sp.prop === 'games' || sp.prop === 'lan' || sp.prop === 'holo' || sp.prop === 'cine');
  const R = room(year, { floor: sp.prop === 'diner' ? 'checker' : sp.prop === 'holo' || sp.prop === 'phones' ? 'glow' : 'wood', kind: sp.prop === 'arcade' || sp.prop === 'lan' ? 'plain' : 'wainscot', dim, wall: sp.prop === 'arcade' ? C('#26264a') : sp.prop === 'holo' ? C('#d8e4f0') : undefined,
    floorA: sp.prop === 'diner' ? C('#2a2a32') : sp.prop === 'holo' ? C('#aab8d0') : undefined, floorB: sp.prop === 'diner' ? C('#e8e4d8') : sp.prop === 'holo' ? C('#d0daea') : undefined }, 70 + SHOP2_IDS.indexOf(biz));
  const p = sp.prop;
  windowP(R, 20, 14, 36, 36, { night: dim });
  shelf(R, 80, 12, 130, 74, sp.shelf, { rows: 4, stock: sp.stock });
  signBoard(R, 275, 16, sp.sign, { bg: lv(R.pal.woodDark, 2.6), fg: R.pal.gold, glow: !!sp.neon });
  if (sp.neon) neon(R, 230, 38, 90, sp.neon, 2);
  counter(R, 230, 110, { h: 26, y: FY + 2 });
  obj(R, (q) => { bev(q, 246, FY - 34, 18, 8, lv(C('#2a2a32'), 3)); q.rect(250, FY - 38, 10, 4, lv(R.pal.paper, 4)); });
  const extra: Record<string, () => void> = {
    sheet: () => obj(R, (q) => { for (let i = 0; i < 3; i++) bev(q, 28 + i * 14, FY - 18 - i * 3, 12, 18 + i * 3, lv(cols('#e8dcc0', '#d8c8a0', '#b8a070')[i], 3.4)); }),
    piano: () => piano(R, 20, FY + 8, 52), phono: () => obj(R, (q) => { bev(q, 26, FY - 18, 24, 18, lv(R.pal.wood, 3)); q.rect(30, FY - 26, 16, 8, lv(R.pal.metal, 3.6)); q.poly([[36, FY - 26], [58, FY - 54], [66, FY - 46], [44, FY - 26]], lv(R.pal.metal, 3.8)); }),
    tailor: () => obj(R, (q) => { q.vline(36, FY - 54, FY, lv(R.pal.woodDark, 2.4)); q.disc(36, FY - 54, 6, lv(R.pal.paper, 3.4)); q.rect(26, FY - 46, 20, 24, lv(C('#3a4a6a'), 3)); q.rect(22, FY - 30, 28, 2, lv(R.pal.woodDark, 2)); }),
    cine: () => { poster(R, 22, 54, 26, 36, C('#c83a2a'), C('#2a1a3a'), 'FILME'); }, radiotv: () => { screenP(R, 24, FY - 36, 30, 22, C('#9fd8ff'), { crt: true, stand: false }); },
    jukebox: () => obj(R, (q) => { bev(q, 24, FY - 44, 30, 44, lv(R.pal.accent2, 3)); q.rect(28, FY - 40, 22, 14, lv(C('#ffd889'), 3.6)); q.disc(39, FY - 12, 6, lv(R.pal.metal, 4)); R.light.rect(26, FY - 42, 26, 16, withAlpha(C('#ffd889'), 40)); }),
    hifi: () => { speaker(R, 22, FY, 30); speaker(R, 54, FY, 30); },
    arcade: () => { for (let i = 0; i < 3; i++) obj(R, (q) => { bev(q, 22 + i * 28, FY - 46, 24, 46, lv(wallCols[i], 2.8)); q.rect(26 + i * 28, FY - 40, 16, 12, C('#0a0a1a')); q.disc(34 + i * 28, FY - 20, 2, lv(C('#e83a3a'), 4)); R.light.rect(26 + i * 28, FY - 40, 16, 12, withAlpha(C('#70ff90'), 70)); }); },
    video: () => shelf(R, 18, 54, 56, 62, sp.shelf, { rows: 4, stock: 'sleeve' }), cd: () => shelf(R, 18, 54, 56, 62, sp.shelf, { rows: 5, stock: 'sleeve' }),
    pager: () => obj(R, (q) => { for (let i = 0; i < 4; i++) bev(q, 26 + i * 12, FY - 24, 9, 14 + i * 2, lv(C('#2a2a32'), 3)); }),
    lan: () => { for (let i = 0; i < 3; i++) { screenP(R, 22 + i * 28, FY - 38, 22, 16, C('#7be08a'), { crt: e < 5, stand: false }); } },
    phones: () => obj(R, (q) => { for (let i = 0; i < 5; i++) { bev(q, 24 + i * 11, FY - 28, 8, 14, lv(C('#2a2a32'), 3)); q.rect(25 + i * 11, FY - 27, 6, 10, lv(C('#9fd8ff'), 3.4)); } }),
    games: () => { screenP(R, 22, FY - 44, 36, 24, C('#c070ff'), { stand: false }); },
    vinyl: () => obj(R, (q) => { for (let i = 0; i < 3; i++) bev(q, 24 + i * 16, FY - 22, 14, 22, lv(cols('#2a2a32', '#6a3a24', '#2a2a32')[i], 2.8)); for (let i = 0; i < 9; i++) q.rect(26 + i * 5, FY - 28 - (i % 2) * 2, 3, 8, lv(wallCols[i % 6], 3)); }),
    cafe: () => { table(R, 26, FY + 8, 36, { top: R.pal.wood }); chair(R, 14, FY + 8, lv(R.pal.fabric, 3)); chair(R, 64, FY + 8, lv(R.pal.fabric, 3), true, true); screenP(R, 30, FY - 32, 22, 14, C('#9fd8ff'), { stand: false }); },
    holo: () => { obj(R, (q) => { bev(q, 24, FY - 8, 36, 8, lv(C('#2a2a3a'), 3)); }); R.light.line(42, FY - 8, 24, FY - 56, withAlpha(C('#7be0ff'), 70)); R.light.line(42, FY - 8, 60, FY - 56, withAlpha(C('#7be0ff'), 70)); R.light.ellipse(42, FY - 60, 18, 5, withAlpha(C('#c070ff'), 80)); },
    bakery: () => obj(R, (q) => { for (let i = 0; i < 4; i++) { q.ellipse(32 + i * 14, FY - 18, 8, 4, lv(sp.shelf[i % 3], 3.2)); } bev(q, 24, FY - 14, 60, 4, lv(R.pal.woodDark, 3)); }),
    diner: () => { for (let i = 0; i < 3; i++) obj(R, (q) => { q.rect(30 + i * 22, FY - 16, 3, 16, lv(R.pal.metal, 2.6)); q.disc(31 + i * 22, FY - 18, 6, lv(R.pal.accent2, 3)); }); },
    inst: () => obj(R, (q) => { q.ellipse(40, FY - 26, 12, 16, lv(R.pal.wood, 2.8)); q.rect(38, FY - 62, 4, 24, lv(R.pal.woodDark, 2.6)); q.disc(40, FY - 26, 4, lv(C('#14141c'), 2)); }),
    tele: () => obj(R, (q) => { bev(q, 24, FY - 20, 30, 20, lv(R.pal.woodDark, 3)); q.rect(30, FY - 28, 14, 8, lv(R.pal.metal, 3.6)); q.line(38, FY - 28, 38, FY - 42, lv(R.pal.metal, 4)); }),
  };
  (extra[p] ?? (() => undefined))();
  lampHang(R, 150, 0, 12); lampHang(R, 290, 0, 12);
  return seal(R);
}

// ---------------------------------------------------------------- fachadas de frente (cartão e galeria)

export const FACADE_W = 128;
export const FACADE_H = 96;
/** Fachada de frente (128×96, opaca: céu, prédio, calçada) com letreiro na fonte do jogo e o detalhe de cada tipo. */
export function int2Facade(id: Int2Id, year: number): Px {
  const e = epOf(year), def = int2Def(id)!, p = new Px(FACADE_W, FACADE_H), R = room(year, {}, 5);
  const pal = R.pal, gy = 80;
  for (let y = 0; y < gy; y++) for (let x = 0; x < FACADE_W; x++) p.put(x, y, lv(pal.sky, 3.8 - y / 70));
  const paving = [C('#8a8070'), C('#8a8070'), C('#9a9486'), C('#8c8c90'), C('#9a9a9c'), C('#a8aab0')][e];
  for (let y = gy; y < FACADE_H; y++) for (let x = 0; x < FACADE_W; x++) p.put(x, y, e === 0 ? lv(paving, 2.4 + noise(x >> 2, y >> 1, 4) * 0.8 + (y - gy) / 50) : lv(paving, 2.8 + (((x + (y - gy) * 2) % 24 === 0 || (y - gy) % 8 === 0) ? -0.9 : 0) + (y - gy) / 50));
  p.hline(0, FACADE_W - 1, gy, lv(paving, 1.2));
  const body: Record<Int2Id, [Col, number, number]> = {
    bank: [C('#d6cdb6'), 78, 52], court: [C('#d0c8b0'), 84, 50], hospital: [C('#e4ebe6'), 84, 56], stadium: [C('#c8ccd0'), 110, 38], jazz: [C('#5a2a34'), 70, 40], nightclub: [C('#1c1830'), 70, 40],
    church: [C('#cbbf9e'), 56, 52], tvstudio: [C('#4a4a5a'), 88, 40], adagency: [C('#e0d8c4'), 70, 50], samba: [C('#2a8a4a'), 92, 36], print: [C('#a86a50'), 70, 42], pirate: [C('#6a5a60'), 54, 34], station: [C('#cfc7ae'), 104, 44], port: [C('#aab4bc'), 100, 34],
  };
  const [bc, bw, bh] = body[id], bx = Math.round((FACADE_W - bw) / 2), by = gy - bh;
  inked(p, (q) => {
    bev(q, bx, by, bw, bh, bc); for (let y = by + 2; y < gy - 1; y += 3) for (let x = bx + 1; x < bx + bw - 1; x++) if (dith(x, y, 0.1)) q.set(x, y, lv(bc, 3.5));
    // cornija e base
    bev(q, bx - 2, by - 3, bw + 4, 4, lv(bc, 3.6)); bev(q, bx - 1, gy - 3, bw + 2, 3, lv(bc, 2.4));
    // janelas
    const nw = Math.max(2, Math.floor(bw / 22));
    for (let i = 0; i < nw; i++) { const wx = bx + 6 + Math.round(i * ((bw - 12 - 10) / Math.max(1, nw - 1))); bev(q, wx, by + 8, 10, 12, lv(pal.glass, 3)); q.vline(wx + 5, by + 8, by + 19, lv(pal.trim, 3)); if (id === 'jazz' || id === 'nightclub') q.rect(wx, by + 8, 10, 12, lv(C('#ffb860'), 2.8)); }
    // porta
    const dw = id === 'stadium' || id === 'station' || id === 'port' ? 24 : 12; bev(q, bx + Math.round(bw / 2) - (dw >> 1), gy - 20, dw, 20, lv(pal.woodDark, 3)); q.rect(bx + Math.round(bw / 2) - (dw >> 1) + 2, gy - 17, dw - 4, 8, lv(pal.glass, 2.6));
    // detalhe do tipo
    const cx = bx + (bw >> 1);
    if (id === 'bank' || id === 'court') { for (let i = 0; i < 4; i++) bev(q, bx + 6 + i * Math.round((bw - 18) / 3), by + 2, 6, bh - 4, lv(bc, 4)); q.poly([[bx - 2, by - 3], [cx, by - 14], [bx + bw + 2, by - 3]], lv(bc, 3.2)); }
    if (id === 'hospital') { q.rect(cx - 2, by - 14, 4, 12, lv(C('#d83a3a'), 3)); q.rect(cx - 6, by - 10, 12, 4, lv(C('#d83a3a'), 3)); }
    if (id === 'stadium') { for (let i = 0; i < 5; i++) { q.ring(bx + 12 + i * 22, by + 18, 8, lv(bc, 2)); } for (const lx of [bx + 4, bx + bw - 8]) { q.rect(lx, by - 28, 3, 28, lv(pal.metal, 2.6)); bev(q, lx - 6, by - 32, 16, 6, lv(pal.metal, 3.4)); } }
    if (id === 'church') { q.rect(cx - 7, by - 24, 14, 24, lv(bc, 3.2)); q.poly([[cx - 8, by - 24], [cx, by - 40], [cx + 8, by - 24]], lv(pal.accent2, 2.8)); q.rect(cx - 1, by - 50, 2, 10, lv(pal.gold, 4)); q.rect(cx - 4, by - 46, 8, 2, lv(pal.gold, 4)); q.ring(cx, by + 14, 6, lv(pal.glass, 3)); }
    if (id === 'tvstudio') { q.rect(cx + 20, by - 30, 2, 30, lv(pal.metal, 3)); q.hline(cx + 14, cx + 28, by - 26, lv(pal.metal, 3.4)); q.hline(cx + 16, cx + 26, by - 20, lv(pal.metal, 3.4)); q.disc(bx + 12, by - 6, 6, lv(C('#e83a3a'), 3)); }
    if (id === 'samba') { for (let i = 0; i < 9; i++) q.rect(bx + 4 + i * 10, by - 8 + (i % 2) * 2, 6, 8, lv(i % 2 ? C('#2a8a4a') : C('#e83a8a'), 3.2)); q.hline(bx, bx + bw, by - 9, lv(pal.metal, 2.4)); }
    if (id === 'print') { q.rect(bx + bw - 14, by - 22, 8, 22, lv(C('#8a4a3a'), 2.8)); q.rect(bx + bw - 15, by - 24, 10, 3, lv(C('#6a3a2a'), 3)); }
    if (id === 'pirate') { q.vline(bx + bw - 6, by - 40, by, lv(pal.metal, 2.6)); for (let i = 0; i < 3; i++) q.hline(bx + bw - 12 + i * 2, bx + bw - i * 2, by - 36 + i * 8, lv(pal.metal, 3.4)); }
    if (id === 'station') { q.rect(cx - 8, by - 26, 16, 26, lv(bc, 3.4)); q.disc(cx, by - 18, 6, lv(C('#efe6cc'), 4)); q.line(cx, by - 18, cx, by - 22, INK); q.line(cx, by - 18, cx + 3, by - 17, INK); q.poly([[cx - 10, by - 26], [cx, by - 34], [cx + 10, by - 26]], lv(pal.accent2, 2.8)); }
    if (id === 'port') { q.vline(bx + 10, by - 36, by, lv(pal.metal, 2.6)); q.hline(bx - 8, bx + 40, by - 36, lv(pal.metal, 3.4)); q.vline(bx + 36, by - 36, by - 14, lv(pal.metal, 1.8)); q.rect(bx + 32, by - 14, 8, 5, lv(pal.accent2, 3)); }
    if (id === 'adagency') { q.rect(bx + 6, by - 14, bw - 12, 12, lv(pal.accent2, 3)); }
    if (id === 'jazz' || id === 'nightclub') { q.rect(bx + 4, by - 6, bw - 8, 4, lv(bc, 2)); }
  });
  // letreiro: placa sobre a cornija, sem tocar o detalhe do telhado
  const tw = textWidth(def.tag), sw = Math.min(FACADE_W - 8, tw + 10), sx = Math.round((FACADE_W - sw) / 2), sy = by + (id === 'bank' || id === 'court' ? 2 : 22);
  inked(p, (q) => { bev(q, sx, sy, sw, 11, lv(id === 'nightclub' || id === 'jazz' ? C('#14102a') : pal.woodDark, 3)); drawText(q, def.tag, sx + Math.round((sw - tw) / 2), sy + 3, id === 'nightclub' ? C('#7be0ff') : pal.gold); });
  if (id === 'nightclub' || id === 'jazz' || e >= 4) for (let x = sx - 2; x < sx + sw + 2; x++) p.set(x, sy + 12, withAlpha(id === 'nightclub' ? C('#7be0ff') : C('#ffd889'), 60));
  // poste de luz da época à esquerda: lampião a gás, lâmpada de rua, LED
  inked(p, (q) => { q.vline(6, gy - 30, gy - 1, lv(pal.metal, 2.4)); q.rect(3, gy - 34, 7, 5, lv(pal.metal, 3)); q.rect(4, gy - 33, 5, 3, lv(e <= 1 ? C('#ffd889') : e >= 4 ? C('#c8f4ff') : C('#ffe6a0'), 4)); q.rect(4, gy - 4, 5, 4, lv(pal.metal, 2)); });
  p.disc(6.5, gy - 31, 7, withAlpha(e >= 4 ? C('#c8f4ff') : C('#ffd889'), 26));
  if (e >= 3) for (let x = sx + 2; x < sx + sw - 2; x += 3) p.set(x, sy + 13, withAlpha(id === 'nightclub' ? C('#c070ff') : C('#ffd889'), 90));
  return p;
}
