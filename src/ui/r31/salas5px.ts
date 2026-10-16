// R31 · onda 5 (SALAS) — as salas antigas do r27 refeitas no corte da sede (mesmo acabamento de scene31px/POL):
// casca da época (cut27/cutEnd27: céu, vizinhos, rua, parede, lâmpadas), janela com a cidade e a época reais
// (window31), peças da fonte única (prim27 / stage31px) e a camada da FRENTE (mesa, balcão) pintada depois das
// pessoas — quem senta atrás da mesa aparece do tronco para cima, pé no chão escondido. Todo pé fica em MFY31.
//   compose5 — mesa de composição: quadro com as ideias jogadas (cor por tipo), piano/sintetizador, violão no suporte
//   studio5  — estúdio: sala de gravação (espuma, bateria, amplificador, microfones) + técnica atrás do vidro, luz REC
//   war5     — sala de guerra da campanha: calendário de semanas, termômetro de expectativa, aparelhos da época na mesa
//   crisis5  — sala de crise: relógio grande (anda), quadro de avisos, gráfico caindo, luz de alerta, telefones
//   press5   — coletiva / talk show: painel de fundo, mesa com toalha e microfones, repórteres de pé, câmera, flashes
//   heist5   — sala dos fundos do golpe: cortiça com o alvo e o barbante, luminária, mesa com a planta do lugar
// PURO: só Px. Os bonecos (avatarSprite) são pintados pela tela (drawScene27) entre o fundo e a frente.

import { C, INK, Px, dith, inked, lv, mix, noise, withAlpha, type Col } from '../pixel/px';
import { amp31, drumKit31, inst31 } from '../pixel/stage31px';
import { window31 } from '../pixel/window31';
import { drawText } from '../pixel/font';
import type { Palette } from '../pixel/palette';
import { prim27 } from '../ps/hqpx27';
import { MFY31, MH31, MW31, roomBegin31, roomEnd31, tableFront31, type RoomOpts31, type RoomPx31 } from './scene31px';
import { registerPol31, type PolScene31 } from './pol31';

export const SW5 = MW31, SH5 = MH31, SFY5 = MFY31;
export interface Spot5 { x: number; y: number; pose: 'stand' | 'sit' | 'play'; dir: 'SE' | 'SW'; behind?: boolean }
export interface Sala5 extends RoomPx31 { spots: Spot5[]; texts: string[] }
const blk = prim27.blk;
const KIND5: Record<string, string> = { hook: '#e8b04a', lyric: '#7fb6e8', harmony: '#b58be0', rhythm: '#e07a5f', special: '#7fd18a' };
const sit = (x: number, dir: 'SE' | 'SW', up = 0): Spot5 => ({ x, y: SFY5 - up, pose: 'sit', dir, behind: true });
/** Quem senta numa cadeira alta atrás de uma mesa de painel fechado até o chão: aparece mais do tronco (pés escondidos). */
const UP5 = 5;
const stand = (x: number, dir: 'SE' | 'SW', pose: 'stand' | 'play' = 'stand'): Spot5 => ({ x, y: SFY5, pose, dir });
/** Mesa de painel fechado (frente até o chão): tampo com fio de luz, painel com almofadas e rodapé. */
function deskFront(f: Px, fy: number, x: number, w: number, h: number, top: Col): void {
  blk(f, x, fy - h, w, 3, top); f.hline(x, x + w - 1, fy - h, lv(top, 4.4));
  blk(f, x + 1, fy - h + 3, w - 2, h - 3, lv(top, 2.4));
  for (let xx = x + 6; xx < x + w - 8; xx += 22) { f.rect(xx, fy - h + 5, Math.min(18, x + w - 4 - xx), h - 9, lv(top, 2.8)); f.hline(xx, xx + Math.min(18, x + w - 4 - xx) - 1, fy - 5, lv(top, 2)); }
  f.rect(x + 1, fy - 2, w - 2, 2, lv(top, 1.6));
}
/** Papel deitado no tampo (camada da frente). */
const paper = (f: Px, x: number, fy: number, col: Col, w = 12) => f.poly([[x, fy - 15], [x + w, fy - 15], [x + w + 1, fy - 14], [x - 1, fy - 14]], col);
/** Lugares de quem senta numa mesa centrada em cx (n pessoas, `gap` px). */
const seatsX = (n: number, cx: number, gap: number): number[] => Array.from({ length: n }, (_, i) => Math.round(cx + (i - (n - 1) / 2) * gap));

// ---------------------------------------------------------------- mesa de composição
export function seatsCompose5(n: number): Spot5[] { return seatsX(Math.max(1, Math.min(3, n)), 150, 34).map((x, i, a) => sit(x, i < a.length / 2 ? 'SE' : 'SW', UP5)); }
export function paintCompose5(year: number, played: string[] = [], n = 2, o: RoomOpts31 = {}): Sala5 {
  const spots = seatsCompose5(n);
  const { c, f } = roomBegin31(year, { ...o, seats: spots }, 'lounge', 271);
  const { layer: p, back, g, y0, fy, pal } = c;
  window31(back, 26, y0 + 8, 46, 30, o.city ?? 'rio', year, o.month ?? 6);
  if (year < 1975) prim27.piano({ ...g, p }, 34, fy); else inst31(p, year < 2000 ? 'analog_synth' : 'modular', 34, fy - (year < 2000 ? 18 : 13), year);
  if (year >= 2000) { blk(p, 32, fy - 10, 22, 3, pal.wood); p.rect(34, fy - 7, 2, 7, pal.woodDark); p.rect(50, fy - 7, 2, 7, pal.woodDark); }
  prim27.tv({ ...g, p }, 76, fy);
  // quadro de cortiça com as ideias jogadas: um cartão por carta, na cor do tipo (as mais recentes)
  const bx = 196, by = y0 + 8, bw = 66, bh = 34;
  blk(back, bx, by, bw, bh, pal.woodDark); back.rect(bx + 2, by + 2, bw - 4, bh - 4, C('#b88a58'));
  for (let yy = by + 2; yy < by + bh - 2; yy++) for (let xx = bx + 2; xx < bx + bw - 2; xx++) if (noise(xx, yy, 5) > 0.86) back.put(xx, yy, C('#9c6c3c'));
  played.slice(-8).forEach((k, i) => {
    const x = bx + 5 + (i % 4) * 15, y = by + 4 + Math.floor(i / 4) * 15, col = C(KIND5[k] ?? '#cccccc');
    back.rect(x, y, 11, 12, lv(col, 2)); back.rect(x, y, 10, 11, col); back.hline(x + 2, x + 7, y + 4, lv(col, 4.4)); back.hline(x + 2, x + 6, y + 7, lv(col, 2.6));
    back.put(x + 5, y, C('#d03030'));
  });
  if (!played.length) for (let i = 0; i < 3; i++) { const x = bx + 8 + i * 18, y = by + 9 + (i % 2) * 6; back.rect(x, y, 10, 12, pal.paper); back.hline(x + 2, x + 7, y + 4, lv(pal.paper, 2)); back.put(x + 5, y, C('#d03030')); }
  prim27.guitar({ ...g, p }, 240, fy, pal.accent);
  prim27.plant({ ...g, p }, 266, fy, true);
  deskFront(f, fy, 96, 110, 12, pal.wood);
  paper(f, 112, fy + 2, pal.paper); f.line(114, fy - 14, 121, fy - 17, C('#2a2a30')); // letra e lápis (tampo em fy-12)
  paper(f, 176, fy + 2, lv(pal.paper, 3.4), 10);
  f.rect(194, fy - 15, 5, 3, pal.paper); f.put(199, fy - 14, pal.paper); // xícara
  return { ...roomEnd31(c, f), spots, texts: [] };
}

// ---------------------------------------------------------------- estúdio
/** Músicos de pé no chão da sala de gravação (até 5); o técnico senta atrás da mesa de som (`eng`). */
export function spotsStudio5(n: number, eng = false, year = 1975): Spot5[] {
  const xs = [96, 122, 148, 70, 166];
  const out = xs.slice(0, Math.max(0, Math.min(5, n))).map((x, i) => stand(x, i % 2 ? 'SW' : 'SE', i ? 'play' : 'stand'));
  if (eng) out.push(year < 1948 ? stand(246, 'SW') : sit(236, 'SW')); // antes de 1948 o técnico fica de pé no torno
  return out;
}
export function paintStudio5(year: number, rec = false, n = 4, o: RoomOpts31 & { eng?: boolean } = {}): Sala5 {
  const spots = spotsStudio5(n, o.eng, year);
  const { c, f } = roomBegin31(year, { ...o, seats: spots.filter((s) => s.pose === 'sit') }, 'studio', 61);
  const { layer: p, back, g, y0, x0, fy, pal } = c;
  const wx = 184; // parede da técnica
  for (let i = 0; i < 4; i++) { const fx = x0 + 6 + i * 41; blk(back, fx - 1, y0 + 9, 37, 34, lv(pal.wall, 1.8)); prim27.foam({ ...g, p: back }, fx, y0 + 10, 35, 32); } // painéis de espuma
  // tapete persa da sala de gravação (faixa no chão) — embaixo de todo mundo
  for (let x = 46; x < 176; x++) { back.put(x, fy - 1, ((x >> 2) % 2) ? mix(pal.fabric2, pal.accent, 0.3) : pal.fabric2); back.put(x, fy, lv(pal.fabric2, 2)); }
  drumKit31(p, 26, fy, year, pal.accent2);
  amp31(p, 172 - 12, fy, year, true);
  for (const x of [88, 140]) prim27.micStand({ ...g, p }, x, fy);
  // a técnica fica atrás do vidro: caixilho e mureta na frente, vidro translúcido (quem opera aparece através dele)
  const gx = wx, gw = c.x0 + c.w0 - wx;
  blk(f, gx, y0 + 16, 4, fy - y0 - 16, pal.metalDark); blk(f, gx, y0 + 16, gw, 3, pal.metalDark);
  blk(f, gx, fy - 9, gw, 9, mix(pal.wall, C('#8a8478'), 0.4));
  f.rect(gx + 4, y0 + 19, gw - 4, fy - y0 - 28, withAlpha(C('#c8e0ec'), 46));
  for (let i = 0; i < 2; i++) f.line(gx + 12 + i * 34, y0 + 22, gx + 22 + i * 34, fy - 12, withAlpha(C('#ffffff'), 64));
  blk(p, wx - 6, y0 + 6, 20, 8, C('#1a1214'));
  p.rect(wx - 5, y0 + 7, 18, 6, rec ? C('#e03030') : C('#4a1f1f'));
  const label = year < 1950 ? 'ON' : 'REC';
  drawText(p, label, wx + 4 - Math.round((label.length * 4 - 1) / 2), y0 + 8, rec ? C('#ffe0d0') : C('#7a4a44'));
  // técnica: rolo/fita na parede do fundo, mesa de som da época na frente de quem opera
  if (year >= 1948 && year < 2000) prim27.reelDeck({ ...g, p }, 262, fy, year >= 1965);
  else prim27.shelf({ ...g, p }, 258, y0 + 30, 20, fy - y0 - 30, year < 1948 ? 'records' : 'drives');
  prim27.consoleDesk({ ...g, p: f }, 206, fy - 9, 52); // na mureta, atrás do vidro
  if (year < 1948) { // gravação direta em disco: o torno fica na técnica e o técnico fica de pé ao lado
    for (let i = 0; i < 2; i++) prim27.goldDisc({ ...g, p }, 214 + i * 14, y0 + 12);
  } else prim27.poster({ ...g, p }, 218, y0 + 10, 14, 18, 1);
  return { ...roomEnd31(c, f, 'studio'), spots, texts: [label] };
}

// ---------------------------------------------------------------- aparelhos da época na mesa (sala de guerra)
function devices(f: Px, year: number, lit: (id: string) => boolean, xs: number[], fy: number, pal: Palette): void {
  const top = fy - 14, glow = C('#ffe08a');
  const list: ((x: number) => void)[] = [];
  if (year >= 1920) list.push((x) => { const on = lit('radio_plug') || lit('jukebox');
    if (year < 1956) { blk(f, x, top - 16, 18, 16, pal.woodDark); f.ellipse(x + 9, top - 15, 9, 3, pal.woodDark); f.rect(x + 3, top - 12, 12, 6, on ? lv(pal.fabric, 4) : lv(pal.fabric, 2)); f.put(x + 9, top - 3, on ? glow : pal.metal); }
    else { blk(f, x, top - 10, 18, 10, pal.metalDark); for (let i = 0; i < 3; i++) f.hline(x + 2, x + 9, top - 8 + i * 2, INK); f.rect(x + 12, top - 8, 4, 2, on ? glow : pal.metal); f.vline(x + 15, top - 18, top - 11, pal.metal); } });
  if (year >= 1948) list.push((x) => { const on = lit('tv_show');
    blk(f, x, top - 18, 22, 18, pal.woodDark); f.rect(x + 3, top - 15, 14, 12, on ? mix(pal.screen, glow, 0.3) : lv(pal.screen, 1.6));
    if (on) for (let i = 0; i < 3; i++) f.hline(x + 4, x + 15, top - 13 + i * 3, lv(pal.screen, 4.4));
    if (year < 1985) { f.line(x + 7, top - 18, x + 4, top - 24, pal.metal); f.line(x + 14, top - 18, x + 17, top - 24, pal.metal); } });
  if (year >= 1981) list.push((x) => { const on = lit('music_video');
    blk(f, x, top - 14, 18, 14, C('#2a2a30')); f.rect(x + 2, top - 12, 14, 9, on ? C('#b04ad8') : C('#1e1e26'));
    if (on) { f.rect(x + 4, top - 10, 3, 5, glow); f.rect(x + 9, top - 9, 4, 4, C('#4ad8c8')); } });
  if (year >= 1995) list.push((x) => { const on = lit('web_forums') || lit('playlists') || lit('social') || lit('neural_feed');
    const body = year < 2005 ? C('#d8d0bc') : C('#2a2a32');
    blk(f, x, top - 16, 20, 13, body); f.rect(x + 2, top - 14, 16, 9, on ? C('#2a6fd8') : C('#1e1e26'));
    if (on) for (let i = 0; i < 3; i++) f.hline(x + 4, x + 8 + ((i * 5) % 7), top - 12 + i * 3, C('#ffffff'));
    f.rect(x + 8, top - 3, 4, 3, body); });
  if (year >= 2008) list.push((x) => { const on = lit('short_clips') || lit('social');
    blk(f, x, top - 10, 6, 10, C('#1a1a20')); f.rect(x + 1, top - 9, 4, 7, on ? C('#ff4a7a') : C('#2a2a34')); });
  // o jornal (imprensa) dobrado na mesa
  list.push((x) => { const on = lit('press'); f.poly([[x, top - 1], [x + 14, top - 1], [x + 15, top], [x - 1, top]], on ? pal.paper : lv(pal.paper, 2.4)); f.rect(x + 2, top - 3, 10, 2, on ? pal.paper : lv(pal.paper, 2.4)); f.hline(x + 3, x + 10, top - 2, INK); });
  list.slice(-xs.length).forEach((d, i) => d(xs[i]));
}

// ---------------------------------------------------------------- sala de guerra da campanha
export function seatsWar5(n: number): Spot5[] { return [70, 150, 230].slice(0, Math.max(0, Math.min(3, n))).map((x, i) => sit(x, i === 2 ? 'SW' : 'SE', UP5)); }
export interface War5 { on: string[]; week: number; weeks: number; launchAt: number; hype: number; n?: number }
export function paintWar5(year: number, w: War5, o: RoomOpts31 = {}): Sala5 {
  const spots = seatsWar5(w.n ?? 0);
  const { c, f } = roomBegin31(year, { ...o, seats: spots }, 'office', 199);
  const { layer: p, back, g, y0, fy, pal } = c;
  const lit = (id: string) => w.on.includes(id);
  // calendário de semanas com a estreia marcada (quadro na parede)
  const cx0 = 26, cy0 = y0 + 8, cwT = 98;
  blk(p, cx0, cy0, cwT, 32, pal.woodDark); p.rect(cx0 + 2, cy0 + 2, cwT - 4, 28, pal.paper); p.rect(cx0 + 2, cy0 + 2, cwT - 4, 5, lv(pal.accent, 2.6));
  const n = Math.max(1, Math.min(8, w.weeks)), cw = Math.floor((cwT - 6) / n);
  for (let i = 0; i < n; i++) {
    const x = cx0 + 4 + i * cw;
    p.rect(x, cy0 + 9, cw - 2, 19, i < w.week ? lv(pal.paper, 3.2) : pal.paper); p.hline(x, x + cw - 3, cy0 + 9, lv(pal.paper, 2.4));
    if (i === w.launchAt) { p.rect(x + 1, cy0 + 12, cw - 4, 12, C('#d83a3a')); p.rect(x + 2, cy0 + 13, cw - 6, 10, pal.paper); p.rect(x + (cw >> 1) - 2, cy0 + 15, 2, 5, C('#d83a3a')); }
    if (i < w.week) { p.line(x + 1, cy0 + 11, x + cw - 4, cy0 + 26, lv(INK, 3.4)); p.line(x + cw - 4, cy0 + 11, x + 1, cy0 + 26, lv(INK, 3.4)); }
    if (i === w.week) p.rect(x, cy0 + 28, cw - 2, 1, pal.gold);
  }
  // cartazes de turnê/rua (apoio de rua): acesos quando há verba
  for (let i = 0; i < 3; i++) {
    const x = 134 + i * 13, y = y0 + 10 + (i % 2) * 4, col = [pal.accent, pal.accent2, pal.gold][i];
    blk(p, x, y, 11, 16, lit('street_team') ? col : mix(col, pal.wall, 0.6));
    p.rect(x + 2, y + 3, 7, 5, lit('street_team') ? pal.paper : mix(pal.paper, pal.wall, 0.5)); p.put(x + 5, y, C('#d03030'));
  }
  window31(back, 180, y0 + 8, 64, 34, o.city ?? 'rio', year, o.month ?? 6);
  // termômetro de expectativa
  const tx = 258, ty = y0 + 8;
  blk(p, tx, ty, 10, 54, pal.woodDark); p.rect(tx + 3, ty + 3, 4, 44, mix(pal.paper, pal.wall, 0.3));
  const hv = Math.round(Math.max(0, Math.min(100, w.hype)) * 0.42), hc = w.hype >= 60 ? C('#e0533d') : w.hype >= 30 ? C('#e8a33a') : C('#7fb6e8');
  p.rect(tx + 3, ty + 47 - hv, 4, hv, hc); p.disc(tx + 5, ty + 49, 3, hc);
  for (let i = 0; i < 5; i++) p.hline(tx + 1, tx + 2, ty + 7 + i * 9, pal.paper);
  prim27.filing({ ...g, p }, 28, fy); prim27.plant({ ...g, p }, 270, fy, true);
  deskFront(f, fy, 44, 212, 12, pal.wood);
  devices(f, year, lit, [84, 104, 170, 192, 214, 124], fy + 2, pal); // tampo em fy-12
  paper(f, 52, fy + 2, pal.paper, 10);
  return { ...roomEnd31(c, f, 'label'), spots, texts: [] };
}

// ---------------------------------------------------------------- sala de crise
export function seatsCrisis5(n: number): Spot5[] { return seatsX(Math.max(0, Math.min(3, n)), 150, 44).map((x, i, a) => sit(x, i < a.length / 2 ? 'SE' : 'SW', UP5)); }
function phone(f: Px, x: number, top: number, year: number, ring: boolean): void {
  const body = ring ? C('#e05555') : year < 1975 ? C('#1e1e22') : year < 1995 ? C('#c8bca8') : C('#2a2a32');
  if (year < 1935) { f.rect(x + 3, top - 12, 2, 10, body); blk(f, x, top - 3, 8, 3, body); f.rect(x + 2, top - 14, 4, 3, body); f.rect(x + 6, top - 10, 3, 4, body); }
  else if (year < 1995) { blk(f, x, top - 5, 12, 5, body); f.rect(x - 1, top - 8, 14, 3, lv(body, 3.6)); f.ring(x + 6, top - 3, 1, lv(body, 2)); }
  else { blk(f, x, top - 4, 12, 4, body); f.rect(x + 9, top - 10, 3, 6, lv(body, 3.4)); f.rect(x + 2, top - 3, 5, 1, C('#7ad0f0')); }
  if (ring) for (const d of [-4, 15]) { f.put(x + d, top - 9, C('#ffd04a')); f.put(x + d + (d < 0 ? -1 : 1), top - 11, C('#ffd04a')); }
}
export function paintCrisis5(year: number, threat: number, frame = 0, n = 3, o: RoomOpts31 = {}): Sala5 {
  const spots = seatsCrisis5(n);
  const { c, f } = roomBegin31(year, { ...o, seats: spots }, 'office', 113);
  const { layer: p, back, g, y0, fy, pal } = c;
  // quadro de avisos com papéis presos
  blk(p, 26, y0 + 8, 52, 34, pal.woodDark); p.rect(28, y0 + 10, 48, 30, C('#b88a58'));
  for (let i = 0; i < 7; i++) { const x = 31 + (i % 4) * 11, y = y0 + 12 + Math.floor(i / 4) * 14; p.rect(x, y, 9, 11, pal.paper); p.hline(x + 1, x + 7, y + 3, lv(pal.paper, 2)); p.hline(x + 1, x + 5, y + 6, lv(pal.paper, 2)); p.put(x + 4, y, C('#d83a3a')); }
  window31(back, 88, y0 + 8, 36, 30, o.city ?? 'rio', year, o.month ?? 6);
  // relógio grande (o ponteiro anda com o quadro)
  const kx = 150, ky = y0 + 22;
  p.disc(kx, ky, 14, year < 1960 ? pal.woodDark : C('#2a2a30')); p.disc(kx, ky, 12, pal.paper);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.put(kx + Math.round(Math.sin(a) * 10), ky - Math.round(Math.cos(a) * 10), INK); }
  const a = (frame / 60) * Math.PI * 2;
  p.line(kx, ky, kx + Math.round(Math.sin(a) * 9), ky - Math.round(Math.cos(a) * 9), C('#c0392b'));
  p.line(kx, ky, kx + 5, ky - 3, INK); p.put(kx, ky, INK);
  // gráfico caindo: lousa com giz antes de 1955, tela depois
  const sx = 186, sy = y0 + 8, chalk = year < 1955;
  blk(p, sx, sy, 56, 34, chalk ? pal.woodDark : C('#2a2a30')); p.rect(sx + 2, sy + 2, 52, 30, chalk ? C('#2f4a3a') : pal.screen);
  let yy = sy + 7;
  for (let x = sx + 5; x < sx + 50; x += 4) { const ny = Math.min(sy + 29, yy + Math.round((noise(x, 1, 3) - 0.3) * 6)); p.line(x, yy, x + 4, ny, chalk ? C('#e8e8e0') : threat > 50 ? C('#e05555') : C('#6fd08c')); yy = ny; }
  // luz de alerta (giroflex) — pisca pela ameaça
  const on = threat >= 35 && (frame >> 3) % 2 === 0, lc = threat >= 65 ? C('#ff3b3b') : threat >= 35 ? C('#ffb020') : C('#3fae5a');
  blk(p, 258, y0 + 6, 10, 4, C('#2a2a30')); p.disc(263, y0 + 5, 4, on || threat < 35 ? lc : lv(lc, 1.4));
  if (on) back.fill((x, y) => (dith(x, y, 0.5) && Math.hypot(x - 263, y - y0 - 5) < 18 ? mix(back.get(x, y), lc, 0.18) : back.get(x, y)), 245, y0, 36, 24);
  prim27.filing({ ...g, p }, 252, fy); prim27.filing({ ...g, p }, 262, fy);
  prim27.plant({ ...g, p }, 32, fy);
  deskFront(f, fy, 78, 144, 12, year < 1990 ? pal.woodDark : C('#8a8e98'));
  const ringI = threat > 40 ? (frame >> 4) % 3 : -1;
  seatsX(3, 150, 44).map((x) => x + 18).forEach((x, i) => phone(f, x - 6, fy - 12, year, i === ringI));
  for (const x of [92, 140, 208]) paper(f, x, fy + 2, pal.paper, 8);
  return { ...roomEnd31(c, f), spots, texts: [] };
}

// ---------------------------------------------------------------- coletiva / talk show
/** Quem fala senta atrás da mesa (centro); os repórteres ficam de pé nos lados, virados para a mesa. */
export function spotsPress5(lead: boolean, reporters = 4): Spot5[] {
  const out: Spot5[] = lead ? [sit(150, 'SE', UP5)] : [];
  [44, 66, 234, 256].slice(0, reporters).forEach((x) => out.push(stand(x, x < 150 ? 'SE' : 'SW')));
  return out;
}
export function paintPress5(year: number, ctx: string, flash = false, heat = 0, o: RoomOpts31 & { lead?: boolean } = {}): Sala5 {
  const crisis = ctx === 'story' || ctx === 'scandal';
  const lead = o.lead ?? true;
  const spots = spotsPress5(lead);
  const { c, f } = roomBegin31(year, { ...o, seats: spots.filter((s) => s.pose === 'sit') }, 'lobby', 83);
  const { layer: p, back, y0, fy, pal } = c;
  // painel de fundo: logos repetidos (coletiva de crise) ou cortina com o letreiro do programa
  const px0 = 88, pw = 124, py = y0 + 6, ph = fy - y0 - 22;
  if (crisis) {
    blk(back, px0, py, pw, ph, lv(pal.accent, 1.8));
    for (let y = py + 4; y < py + ph - 4; y += 9) for (let x = px0 + 4 + ((((y - py) / 9) | 0) % 2) * 9; x < px0 + pw - 10; x += 18) { back.rect(x, y, 10, 4, lv(pal.accent, 2.8)); back.hline(x + 1, x + 8, y + 1, lv(pal.paper, 2.6)); }
  } else {
    back.fill((x, y) => (Math.sin(x / 3) > 0.2 ? lv(pal.accent2, 2.8 - (y - py) / 60) : lv(pal.accent2, 2.2 - (y - py) / 60)), px0, py, pw, ph);
    back.hline(px0, px0 + pw - 1, py, lv(pal.accent2, 4.2));
    const sw = 56; blk(back, 150 - (sw >> 1), py + 4, sw, 10, INK); back.rect(151 - (sw >> 1), py + 5, sw - 2, 8, pal.gold);
    for (let i = 0; i < 7; i++) back.rect(154 - (sw >> 1) + i * 7, py + 7, 4, 4, lv(pal.gold, 2));
  }
  back.rect(px0 - 2, py + ph, pw + 4, 2, lv(pal.trim, 2));
  // câmera de TV no tripé (desde 1950) e holofote
  if (year >= 1950) {
    const cx = 92; p.vline(cx, fy - 22, fy - 2, C('#3a3a42')); p.line(cx, fy - 6, cx - 6, fy - 1, C('#3a3a42')); p.line(cx, fy - 6, cx + 6, fy - 1, C('#3a3a42'));
    blk(p, cx - 8, fy - 32, year < 1990 ? 18 : 12, 10, C('#2a2a32')); p.rect(cx + (year < 1990 ? 10 : 4), fy - 30, 4, 5, C('#4a4a52')); p.put(cx - 6, fy - 31, C('#e03030'));
  } else { // microfone de fita grande no pedestal (rádio) e o fotógrafo da época fica nos lados
    p.vline(98, fy - 26, fy - 1, C('#9aa0aa')); p.hline(95, 101, fy - 1, C('#9aa0aa')); p.rect(96, fy - 32, 5, 7, C('#c8ccd0'));
  }
  blk(p, 206, fy - 40, 8, 6, C('#2a2a32')); p.vline(210, fy - 34, fy - 1, C('#3a3a42')); p.hline(206, 214, fy - 1, C('#3a3a42')); p.rect(207, fy - 39, 6, 4, C('#fff2c0'));
  // mesa com toalha até o chão e os microfones (o cacho cresce com a época; antes de 1950, um microfone grande)
  const tx = 118, tw = 64, cloth = crisis ? lv(pal.fabric, 2.4) : pal.fabric;
  blk(f, tx, fy - 14, tw, 14, cloth); f.hline(tx, tx + tw - 1, fy - 14, lv(cloth, 4.2));
  for (let x = tx + 3; x < tx + tw - 2; x += 6) f.vline(x, fy - 11, fy - 1, lv(cloth, 2.6));
  if (year < 1950) { f.vline(162, fy - 22, fy - 15, C('#5a5e68')); f.rect(159, fy - 29, 7, 8, C('#c8ccd0')); for (let i = 0; i < 3; i++) f.hline(160, 164, fy - 27 + i * 2, C('#5a5e68')); }
  else {
    const nm = year < 1975 ? 3 : year < 2000 ? 5 : 7;
    for (let i = 0; i < nm; i++) { const mx = 150 + (i % 2 ? 1 : -1) * (11 + Math.floor(i / 2) * 5), my = fy - 18 + (i % 2); /* longe do rosto de quem fala */ f.line(mx, my + 3, 150 + (i % 2 ? 4 : -4), fy - 15, C('#3a3a42')); f.rect(mx - 1, my, 3, 3, [pal.accent, pal.metal, pal.accent2, C('#e04040'), C('#3a7ae0')][i % 5]); }
  }
  f.rect(126, fy - 17, 3, 3, mix(pal.glass, C('#ffffff'), 0.4)); // copo d'água
  const r = roomEnd31(c, f, 'office');
  // flashes dos fotógrafos (por cima de tudo, translúcidos) e o calor da sala (vinheta avermelhada)
  if (flash) for (const [fx, fy2] of [[60, fy - 30], [242, fy - 32], [54, fy - 26], [250, fy - 28]].slice(0, year < 1990 ? 2 : 4) as [number, number][]) {
    for (let y = fy2 - 12; y <= fy2 + 12; y++) for (let x = fx - 12; x <= fx + 12; x++) { const d = Math.hypot(x - fx, y - fy2); if (d < 12 && dith(x, y, 0.9 - d / 12)) r.front.put(x, y, withAlpha(C('#ffffff'), 150)); }
    r.front.hline(fx - 5, fx + 5, fy2, C('#ffffff')); r.front.vline(fx, fy2 - 5, fy2 + 5, C('#ffffff'));
  }
  if (heat > 30) { const k = Math.min(0.35, (heat - 30) / 160); r.back.map((col, x, y) => { const e = Math.max(Math.abs(x - 150) / 150, Math.abs(y - 75) / 75); return e > 0.6 ? mix(col, C('#c02020'), (k * (e - 0.6)) / 0.4) : col; }); }
  return { ...r, spots, texts: [] };
}

// ---------------------------------------------------------------- sala dos fundos do golpe
export const crewX5 = (i: number): number => 62 + i * 26;
export function spotsHeist5(n: number): Spot5[] { return Array.from({ length: Math.max(0, Math.min(5, n)) }, (_, i) => stand(crewX5(i), i % 2 ? 'SW' : 'SE')); }
/** `tk` alvo; `n` gente da equipe no quadro; `risk` 0..1 (luz mais vermelha); `stage` etapa feita (0..3). */
export function paintHeist5(year: number, tk: string, n: number, risk: number, stage: number, o: RoomOpts31 = {}): Sala5 {
  const spots = spotsHeist5(n + 1);
  const { c, f } = roomBegin31(year, o, 'lounge', 41);
  const { layer: p, back, g, y0, fy, pal } = c;
  // parede dos fundos: tijolo aparente
  for (let y = y0 + 2; y < fy - 6; y++) for (let x = c.x0 + 2; x < c.x0 + c.w0 - 2; x++) {
    const row = ((y - y0) / 5) | 0, mortar = (y - y0) % 5 === 0 || ((x + (row % 2) * 6) % 12) === 0;
    back.put(x, y, mortar ? mix(back.get(x, y), C('#3a3030'), 0.5) : mix(back.get(x, y), noise(x >> 2, row, 3) > 0.5 ? C('#8a4a3a') : C('#7a3e32'), 0.55));
  }
  // cortiça com o alvo no meio, os cartões da equipe e o barbante vermelho
  const bx = 30, by = y0 + 6, bw = 150, bh = 52;
  blk(p, bx, by, bw, bh, pal.woodDark);
  p.fill((x, y) => ((x * 7 + y * 13) % 11 < 2 ? C('#9c6c3c') : C('#b8864f')), bx + 2, by + 2, bw - 4, bh - 4);
  const tx = bx + 62, ty = by + 6, str = C('#d03030');
  p.rect(tx, ty, 26, 32, C('#efe6cf')); p.rect(tx + 2, ty + 2, 22, 22, C('#3a4660'));
  target(p, tk, tx + 13, ty + 13); p.put(tx + 13, ty, str);
  const cards: [number, number][] = [[bx + 10, by + 6], [bx + 118, by + 6], [bx + 10, by + 30], [bx + 118, by + 30], [bx + 36, by + 34]];
  for (let i = 0; i < Math.min(n, cards.length); i++) {
    const [x, y] = cards[i];
    p.line(x + 7, y + 1, tx + 13, ty, str);
    p.rect(x, y, 16, 13, C('#efe6cf')); p.rect(x + 3, y + 2, 10, 6, C('#c9b48e')); p.hline(x + 2, x + 13, y + 10, C('#9a8e76')); p.put(x + 7, y, str);
  }
  for (let i = 0; i < 3; i++) { const x = bx + 102 + i * 13, y = by + bh - 9; p.rect(x, y, 10, 5, i < stage ? C('#7fc27a') : i === stage ? C('#ffd27a') : C('#6a6050')); }
  // luminária baixa com o cone de luz (mais vermelho com mais risco) sobre a mesa
  const lx = 226;
  p.vline(lx, y0, y0 + 10, C('#555a66')); p.poly([[lx - 8, y0 + 16], [lx + 8, y0 + 16], [lx + 4, y0 + 10], [lx - 4, y0 + 10]], C('#3b4252'));
  const lc = mix(C('#ffd27a'), C('#d0402c'), risk), al = Math.round(40 + risk * 70);
  back.poly([[lx - 6, y0 + 17], [lx + 6, y0 + 17], [lx + 34, fy - 14], [lx - 34, fy - 14]], (x, y) => (dith(x, y, 0.5) ? mix(back.get(x, y), lc, al / 255) : back.get(x, y)));
  prim27.filing({ ...g, p }, 266, fy);
  tableFront31(f, c, 196, 62, 14, pal.woodDark);
  f.poly([[208, fy - 15], [228, fy - 15], [229, fy - 14], [207, fy - 14]], C('#4a7ab8')); f.hline(210, 224, fy - 15, C('#9ac8f0')); // planta do lugar
  phone(f, 236, fy - 14, year, false);
  return { ...roomEnd31(c, f), spots, texts: [] };
}
function target(p: Px, tk: string, cx: number, cy: number): void {
  const gd = C('#d8b040'), w = C('#e8e2d0'), k = C('#14161c');
  if (tk === 'act') { p.disc(cx, cy, 8, k); p.ring(cx, cy, 6, C('#2a2c34')); p.disc(cx, cy, 2, C('#c0302a')); return; }
  if (tk === 'own_act') { p.line(cx - 8, cy + 6, cx - 2, cy, gd); p.line(cx - 2, cy, cx + 2, cy + 3, gd); p.line(cx + 2, cy + 3, cx + 8, cy - 6, gd); p.rect(cx + 6, cy - 7, 3, 3, gd); return; }
  if (tk === 'label') { p.rect(cx - 7, cy - 8, 14, 17, C('#6a7690')); for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) p.rect(cx - 5 + i * 4, cy - 6 + j * 4, 2, 2, w); return; }
  if (tk === 'relic') { p.ellipse(cx, cy + 4, 5, 4, C('#a0522d')); p.rect(cx - 1, cy - 9, 2, 10, C('#5a3a20')); p.rect(cx - 2, cy - 10, 4, 2, gd); return; }
  if (tk === 'case') { p.rect(cx - 6, cy - 7, 12, 15, w); for (let j = 0; j < 4; j++) p.hline(cx - 4, cx + 3, cy - 4 + j * 3, C('#8a8a90')); return; }
  p.disc(cx, cy - 3, 4, C('#2a2c34')); p.ellipse(cx, cy + 7, 7, 4, C('#2a2c34'));
}

// ---------------------------------------------------------------- exemplos para a checagem automática (POL)
const YEARS5 = [1935, 1975, 2015];
const pol = (id: string, s: Sala5): PolScene31 => ({ id, W: SW5, H: SH5, back: s.back, front: s.front, floors: [SFY5], people: s.spots.map((x) => ({ x: x.x, y: x.y, behind: x.behind })), texts: s.texts, spots: [] });
registerPol31('salas5', () => YEARS5.flatMap((y) => [
  pol(`salas5:compose:${y}`, paintCompose5(y, ['hook', 'lyric', 'harmony', 'rhythm', 'special'], 3)),
  pol(`salas5:compose0:${y}`, paintCompose5(y, [], 1)),
  pol(`salas5:studio:${y}`, paintStudio5(y, true, 5, { eng: true })),
  pol(`salas5:war:${y}`, paintWar5(y, { on: ['radio_plug', 'tv_show', 'music_video', 'web_forums', 'short_clips', 'press', 'street_team'], week: 3, weeks: 8, launchAt: 6, hype: 55, n: 3 })),
  pol(`salas5:crisis:${y}`, paintCrisis5(y, 70, 8, 3)),
  pol(`salas5:press:${y}`, paintPress5(y, 'press', true, 40)),
  pol(`salas5:scandal:${y}`, paintPress5(y, 'scandal', false, 80)),
  pol(`salas5:heist:${y}`, paintHeist5(y, 'relic', 3, 0.5, 1)),
]));

// ---------------------------------------------------------------- a van da turnê (estrada)
/** Van/ônibus da turnê de lado, virado para a direita, por época: furgão de capô comprido com para-lamas e estribo
 *  (até 1949), perua de duas cores com bagageiro (1950–74), furgão quadrado com faixa lateral (1975–99) e van alta
 *  moderna de vidros escuros (2000+). Bagageiro com os cases dos instrumentos, motorista no para-brisa, rodas com
 *  calota, farol e lanterna; `broken` = capô aberto. Pés das rodas em `gy`. Devolve a caixa (para a fumaça). PURO. */
export function tourVan5(p: Px, x: number, gy: number, year: number, accent: Col, o: { broken?: boolean; frame?: number } = {}): { x: number; y: number; w: number; h: number } {
  const era = year < 1950 ? 0 : year < 1975 ? 1 : year < 2000 ? 2 : 3;
  const W = [56, 52, 56, 60][era], H = [22, 22, 22, 26][era], y = gy - H;
  const cream = C('#ece2c8'), glass = C('#24384c'), glassHi = C('#7aa6c8'), chrome = C('#c8ccd4'), tire = C('#1a1a1e');
  const body = era === 3 ? C('#e8e8ec') : era === 2 ? mix(accent, C('#e8dcc0'), 0.35) : accent;
  const wheel = (cx: number, r = 4) => { p.disc(cx, gy - r, r, tire); p.disc(cx, gy - r, r - 2, era === 0 ? C('#d8d0c0') : chrome); p.put(cx, gy - r, INK);
    if (era === 0) for (let a = 0; a < 6; a++) p.put(cx + Math.round(Math.cos(a) * 1.5), gy - r + Math.round(Math.sin(a) * 1.5), C('#6a6458')); };
  const driver = (wx: number, wy: number) => { p.disc(wx, wy + 2, 2, C('#2a2026')); p.rect(wx - 2, wy + 4, 5, 2, C('#2a2026')); };
  const cases = (x0: number, w: number, top: number) => { // bagageiro com cases de instrumento
    p.hline(x0, x0 + w, top, C('#3a3a40')); for (let xx = x0; xx <= x0 + w; xx += 6) p.vline(xx, top, top + 1, C('#3a3a40'));
    blk(p, x0 + 2, top - 4, 12, 4, C('#1e1e24')); p.hline(x0 + 4, x0 + 11, top - 2, chrome);
    p.ellipse(x0 + 22, top - 3, 6, 2.4, C('#3a2a22')); p.ellipse(x0 + 18, top - 3, 3, 2.4, C('#3a2a22')); // case de violão
    blk(p, x0 + 30, top - 5, 8, 5, C('#5a4a3a')); p.put(x0 + 34, top - 3, C('#d8b048'));
  };
  inked(p, (q) => {
    const P = p; p = q; // desenha na camada do contorno
    try {
      if (era === 0) { // furgão anos 30/40: capô comprido, cabine, baú arredondado, para-lamas e estribo
        blk(p, x, y + 4, 34, H - 9, body); p.ellipse(x + 17, y + 5, 17, 3, body); // baú
        p.rect(x + 2, y + 8, 30, 1, lv(body, 4.4)); drawText(p, 'TOUR', x + 9, y + 9, cream);
        blk(p, x + 34, y + 6, 10, H - 11, body); p.rect(x + 36, y + 8, 6, 5, glass); p.put(x + 37, y + 8, glassHi); driver(x + 39, y + 8);
        blk(p, x + 44, y + 11, 11, 6, lv(body, 2.6)); for (let i = 0; i < 3; i++) p.vline(x + 47 + i * 2, y + 12, y + 15, lv(body, 1.6)); // capô com grelha lateral
        p.rect(x + 54, y + 11, 2, 2, C('#ffe8a0')); // farol
        p.ellipse(x + 10, gy - 5, 7, 3, C('#1e1e22')); p.ellipse(x + 46, gy - 5, 7, 3, C('#1e1e22')); // para-lamas
        p.rect(x + 16, gy - 4, 24, 2, C('#2a2a2e')); // estribo
        cases(x + 2, 30, y + 1);
        wheel(x + 10); wheel(x + 46);
      } else if (era === 1) { // perua de duas cores, frente arredondada, janelinhas, bagageiro
        blk(p, x, y + 4, W, H - 8, body); blk(p, x, y + 4, W, 8, cream);
        p.ellipse(x + W - 4, y + 10, 4, 6, body); p.ellipse(x + W - 4, y + 8, 4, 4, cream); // frente curva
        for (let i = 0; i < 4; i++) { p.rect(x + 4 + i * 9, y + 6, 7, 5, glass); p.put(x + 5 + i * 9, y + 6, glassHi); }
        p.rect(x + W - 9, y + 6, 7, 5, glass); driver(x + W - 5, y + 6);
        p.poly([[x + W - 2, y + 13], [x + W - 12, y + 18], [x + W - 2, y + 18]], cream); // "V" da frente
        p.vline(x + 30, y + 12, gy - 5, lv(body, 2)); p.rect(x + 26, y + 15, 3, 1, chrome); // porta de correr
        p.rect(x + W - 2, y + 15, 2, 2, C('#ffe8a0')); p.rect(x, y + 15, 2, 2, C('#e83030'));
        p.rect(x + 2, gy - 5, W - 4, 1, lv(body, 1.6));
        cases(x + 4, 36, y + 3);
        wheel(x + 10); wheel(x + W - 12);
      } else if (era === 2) { // furgão quadrado anos 70–90 com faixa e capô curto
        blk(p, x, y + 3, W - 10, H - 7, body); blk(p, x + W - 12, y + 9, 12, H - 13, body);
        p.rect(x + 2, y + 11, W - 4, 2, accent); p.rect(x + 2, y + 13, W - 4, 1, mix(accent, C('#e8b048'), 0.5)); // faixa lateral
        p.rect(x + W - 18, y + 5, 7, 5, glass); p.put(x + W - 17, y + 5, glassHi); driver(x + W - 14, y + 5);
        p.poly([[x + W - 11, y + 9], [x + W - 4, y + 9], [x + W - 11, y + 4]], glass); // para-brisa inclinado
        p.rect(x + 6, y + 5, 14, 5, glass); p.vline(x + 30, y + 4, gy - 5, lv(body, 2)); p.rect(x + W - 2, y + 11, 2, 2, C('#ffe8a0'));
        p.rect(x, y + 11, 2, 3, C('#e83030')); p.rect(x + W - 12, gy - 5, 12, 2, chrome); // para-choque
        cases(x + 4, 36, y + 2);
        wheel(x + 11); wheel(x + W - 11);
      } else { // van alta moderna (sprinter): teto alto, vidros escuros, capô inclinado, adesivo da turnê
        blk(p, x, y + 2, W - 12, H - 6, body); p.poly([[x + W - 12, y + 4], [x + W - 4, y + 12], [x + W, y + 14], [x + W, gy - 5], [x + W - 12, gy - 5]], body);
        p.poly([[x + W - 12, y + 5], [x + W - 5, y + 12], [x + W - 12, y + 12]], glass); driver(x + W - 10, y + 7);
        p.rect(x + 4, y + 6, W - 20, 6, C('#1a1e26')); p.hline(x + 5, x + W - 18, y + 6, C('#3a4a5a'));
        p.rect(x + 4, y + 14, W - 22, 4, accent); p.rect(x + 8, y + 15, 10, 2, C('#f4f4f4')); p.rect(x + 20, y + 15, 3, 2, C('#f4f4f4')); // adesivo da turnê
        p.rect(x + W - 3, y + 15, 3, 2, C('#e8f4ff')); p.rect(x, y + 14, 2, 4, C('#e83030'));
        p.vline(x + 36, y + 4, gy - 5, lv(body, 2.4));
        wheel(x + 11, 5); wheel(x + W - 12, 5);
      }
      if (o.broken) { const hx = x + W - (era === 0 ? 11 : 11), hy = y + (era === 0 ? 11 : era === 3 ? 12 : 9); p.poly([[hx, hy], [hx + 2, hy], [hx + 12, hy - 8], [hx + 10, hy - 9]], lv(body, 3.6)); p.rect(hx + 1, hy, 9, 2, C('#2a2a30')); } // capô levantado e o motor à mostra
    } finally { p = P; }
  }, INK, { relief: true });
  p.rect(x + 2, gy, W - 4, 1, withAlpha(C('#000000'), 90)); // sombra no asfalto
  return { x, y, w: W, h: H };
}
