// r27 (P2A) — cenas em pixel art das atividades de mídia e bastidores (mesmo estilo de scene27/hqpx27: paleta da
// era, contorno, pontilhado). PURAS (só Px), pintadas no <canvas> por drawScene27.
//   • paintWarRoom27: sala de guerra da campanha — calendário de semanas, termômetro de expectativa e os aparelhos
//     da época acesos conforme os canais ativos (rádio, TV, clipe, computador, celular, jornal, cartazes de turnê).
//   • paintPress27: coletiva/talk show — painel de fundo, mesa com microfones da época, repórteres e flashes.
//   • paintCork27: cortiça do quadro de favores.

import { paletteOf } from '../pixel/palette';
import { C, Px, dith, mix, noise, shade, type Col } from '../pixel/px';

export const PW27 = 200;
export const PH27 = 92;

function wall(p: Px, base: Col, trim: Col, floorY: number, fa: Col, fb: Col): void {
  p.fill((x, y) => (y < floorY ? shade(base, 0.03 - (y / floorY) * 0.12 + (noise(x >> 2, y >> 2, 3) - 0.5) * 0.03) : ((x >> 3) + (y >> 2)) % 2 ? fa : fb));
  p.hline(0, p.w - 1, floorY - 1, trim);
  p.hline(0, p.w - 1, floorY, shade(trim, -0.3));
}

/** Sala de guerra da campanha. `on` = ids de canais com verba; `week`/`weeks` = semana atual no quadro. */
export function paintWarRoom27(year: number, on: string[], week: number, weeks: number, launchAt: number, hype: number): Px {
  const pal = paletteOf(year);
  const p = new Px(PW27, PH27);
  wall(p, pal.wall, pal.trim, 64, pal.floors.office.a, pal.floors.office.b);
  const lit = (id: string) => on.includes(id);
  const glow = C('#ffe08a');
  // calendário de semanas (quadros) com a estreia marcada
  p.rect(8, 6, 92, 30, pal.outline); p.rect(9, 7, 90, 28, pal.paper);
  p.rect(9, 7, 90, 5, shade(pal.accent, -0.1));
  const n = Math.max(1, Math.min(8, weeks));
  const cw = Math.floor(88 / n);
  for (let i = 0; i < n; i++) {
    const x = 10 + i * cw;
    p.rect(x, 14, cw - 2, 19, i < week ? shade(pal.paper, -0.12) : pal.paper);
    p.hline(x, x + cw - 3, 14, shade(pal.paper, -0.3));
    if (i === launchAt) { p.rect(x + 2, 17, cw - 6, 12, C('#d83a3a')); p.rect(x + 3, 18, cw - 8, 10, pal.paper); p.rect(x + (cw >> 1) - 2, 21, 3, 4, C('#d83a3a')); }
    if (i < week) { p.line(x + 1, 16, x + cw - 4, 31, shade(pal.outline, 0.3)); p.line(x + cw - 4, 16, x + 1, 31, shade(pal.outline, 0.3)); }
    if (i === week) p.rect(x, 33, cw - 2, 1, pal.gold);
  }
  // termômetro de expectativa
  p.rect(188, 6, 8, 46, pal.outline); p.rect(189, 7, 6, 44, mix(pal.paper, pal.wall, 0.4));
  const hv = Math.round(Math.max(0, Math.min(100, hype)) * 0.4);
  p.rect(190, 50 - hv, 4, hv, hype >= 60 ? C('#e0533d') : hype >= 30 ? C('#e8a33a') : C('#7fb6e8'));
  p.disc(192, 52, 4, hype >= 60 ? C('#e0533d') : C('#e8a33a'));
  // pôsteres de turnê / cena local (apoio de turnê)
  for (let i = 0; i < 3; i++) {
    const x = 112 + i * 12, col = [pal.accent, pal.accent2, pal.gold][i];
    p.rect(x, 8 + (i % 2) * 3, 10, 14, lit('street_team') ? col : shade(col, -0.45));
    p.rect(x + 2, 11 + (i % 2) * 3, 6, 4, shade(pal.paper, lit('street_team') ? 0 : -0.4));
  }
  // jornal (imprensa) pregado
  p.rect(152, 8, 30, 20, lit('press') ? pal.paper : shade(pal.paper, -0.35));
  for (let y = 11; y < 26; y += 3) p.hline(154, 179 - ((y * 7) % 9), y, shade(pal.paper, -0.5));
  p.rect(154, 11, 10, 6, shade(pal.paper, -0.45));
  // mesa
  p.poly([[20, 64], [180, 64], [190, 74], [10, 74]], pal.wood);
  p.hline(10, 190, 74, pal.woodDark); p.rect(10, 75, 180, 3, shade(pal.woodDark, -0.2));
  p.rect(16, 78, 4, 12, pal.woodDark); p.rect(180, 78, 4, 12, pal.woodDark);
  // aparelhos da época sobre a mesa: rádio, TV, tela de clipes, computador, celular
  let x = 24;
  const halo = (cx: number, cy: number, r: number) => p.fill((xx, yy) => { const d = Math.hypot(xx - cx, yy - cy); return d < r && dith(xx, yy, 0.5 - d / (r * 2)) ? mix(p.get(xx, yy), glow, 0.25) : p.get(xx, yy); }, cx - r, cy - r, r * 2, r * 2);
  if (year >= 1920) { // rádio (de capela até 1955; depois transistor)
    const on1 = lit('radio_plug') || lit('jukebox');
    if (year < 1956) { p.rect(x, 48, 18, 16, pal.woodDark); p.ellipse(x + 9, 50, 9, 4, pal.woodDark); p.rect(x + 3, 52, 12, 6, on1 ? shade(pal.fabric, 0.2) : shade(pal.fabric, -0.3)); p.disc(x + 9, 60, 1, on1 ? glow : pal.metal); }
    else { p.rect(x, 54, 18, 10, pal.metalDark); p.rect(x + 2, 56, 8, 6, shade(pal.metal, -0.2)); for (let i = 0; i < 3; i++) p.hline(x + 2, x + 9, 56 + i * 2, pal.outline); p.rect(x + 12, 56, 4, 2, on1 ? glow : pal.metal); p.vline(x + 15, 46, 54, pal.metal); }
    if (on1) halo(x + 9, 54, 12);
    x += 26;
  }
  if (year >= 1948) { // TV
    const on2 = lit('tv_show');
    p.rect(x, 44, 26, 20, pal.woodDark); p.rect(x + 3, 47, 18, 14, pal.outline); p.rect(x + 4, 48, 16, 12, on2 ? mix(pal.screen, glow, 0.25) : shade(pal.screen, -0.5));
    if (on2) for (let i = 0; i < 4; i++) p.hline(x + 5, x + 18, 50 + i * 3, shade(pal.screen, 0.25));
    p.line(x + 8, 44, x + 4, 38, pal.metal); p.line(x + 16, 44, x + 20, 38, pal.metal);
    if (on2) halo(x + 12, 54, 16);
    x += 32;
  }
  if (year >= 1981) { // tela de clipes (MTV)
    const on3 = lit('music_video');
    p.rect(x, 48, 20, 16, pal.metalDark); p.rect(x + 2, 50, 16, 10, on3 ? C('#b04ad8') : shade(pal.screen, -0.5));
    if (on3) { p.rect(x + 5, 52, 3, 6, glow); p.rect(x + 10, 53, 4, 5, C('#4ad8c8')); halo(x + 10, 55, 12); }
    x += 26;
  }
  if (year >= 1995) { // computador (fóruns, playlists, redes)
    const on4 = lit('web_forums') || lit('playlists') || lit('social') || lit('neural_feed');
    p.rect(x, 46, 22, 14, pal.metal); p.rect(x + 2, 48, 18, 10, on4 ? mix(C('#2a6fd8'), glow, 0.15) : shade(pal.screen, -0.5));
    if (on4) for (let i = 0; i < 3; i++) p.rect(x + 4, 50 + i * 3, 6 + ((i * 5) % 9), 1, C('#ffffff'));
    p.rect(x + 9, 60, 4, 4, pal.metalDark); p.rect(x + 4, 63, 14, 1, pal.metalDark);
    if (on4) halo(x + 11, 53, 13);
    x += 28;
  }
  if (year >= 2008) { // celular (vídeo curto e redes)
    const on5 = lit('short_clips') || lit('social');
    p.rect(x, 52, 7, 12, pal.outline); p.rect(x + 1, 53, 5, 9, on5 ? C('#ff4a7a') : shade(pal.screen, -0.5));
    if (on5) { p.set(x + 3, 57, C('#ffffff')); halo(x + 3, 57, 9); }
  }
  // papéis de verba espalhados
  p.poly([[150, 66], [164, 65], [166, 72], [152, 73]], pal.paper);
  p.line(153, 68, 162, 67, shade(pal.paper, -0.45)); p.line(153, 70, 160, 70, shade(pal.paper, -0.45));
  return p;
}

/** Coletiva / talk show. `ctx`: 'press' | 'story' | 'scandal' | 'camp'; `flash` acende flashes; `heat` 0–100 avermelha. */
export function paintPress27(year: number, ctx: string, flash = false, heat = 0): Px {
  const pal = paletteOf(year);
  const p = new Px(PW27, PH27);
  const crisis = ctx === 'story' || ctx === 'scandal';
  wall(p, crisis ? mix(pal.wall, C('#3a2a30'), 0.35) : pal.wall, pal.trim, 60, pal.floors.hall.a, pal.floors.hall.b);
  // painel de fundo com logos (step-and-repeat) ou cortina de talk show
  if (crisis) {
    p.rect(30, 6, 140, 40, shade(pal.accent, -0.35));
    for (let y = 10; y < 44; y += 9) for (let x2 = 34 + ((y / 9) % 2) * 9; x2 < 166; x2 += 18) { p.rect(x2, y, 10, 4, shade(pal.accent, -0.1)); p.hline(x2 + 1, x2 + 8, y + 1, shade(pal.paper, -0.2)); }
  } else {
    p.fill((xx, yy) => (Math.sin(xx / 3) > 0.2 ? shade(pal.accent2, -0.15 - yy / 300) : shade(pal.accent2, -0.35 - yy / 300)), 20, 4, 160, 44);
    p.rect(70, 8, 60, 10, pal.outline); p.rect(71, 9, 58, 8, pal.gold); for (let i = 0; i < 8; i++) p.rect(74 + i * 7, 11, 4, 4, shade(pal.gold, -0.4));
  }
  front(p, year, crisis);
  // repórteres de costas (fileira da frente) e câmera/celulares
  for (let i = 0; i < 9; i++) {
    const rx = 12 + i * 22, ry = 74 + (i % 2) * 3;
    const tone = shade(C(['#3a3040', '#2c3a4a', '#4a3a2c', '#2f4a3a'][i % 4]), -0.1);
    p.ellipse(rx, ry + 10, 9, 8, tone); p.disc(rx, ry, 5, shade(C(['#2a2018', '#5a3a20', '#1a1a1a', '#8a6a3a'][i % 4]), 0));
    if (year >= 2008 && i % 3 === 1) { p.rect(rx + 3, ry - 12, 5, 8, pal.outline); p.rect(rx + 4, ry - 11, 3, 6, C('#9ad8ff')); p.line(rx + 4, ry - 4, rx + 2, ry + 2, tone); }
  }
  if (year >= 1950) { const cx = 176; p.vline(cx, 50, 72, pal.metalDark); p.line(cx, 72, cx - 6, 84, pal.metalDark); p.line(cx, 72, cx + 6, 84, pal.metalDark); p.rect(cx - 9, 40, 16, 10, pal.metalDark); p.rect(cx - 13, 43, 5, 4, pal.metal); p.disc(cx + 4, 42, 1, C('#e03030')); }
  // flashes
  if (flash) for (const [fx, fy] of [[30, 30], [150, 26], [64, 20], [128, 36]] as [number, number][]) {
    p.fill((xx, yy) => { const d = Math.hypot(xx - fx, yy - fy); return d < 14 && dith(xx, yy, 0.9 - d / 14) ? mix(p.get(xx, yy), C('#ffffff'), 0.7) : p.get(xx, yy); }, fx - 14, fy - 14, 28, 28);
    p.hline(fx - 6, fx + 6, fy, C('#ffffff')); p.vline(fx, fy - 6, fy + 6, C('#ffffff'));
  }
  // calor: vinheta avermelhada
  if (heat > 30) { const k = Math.min(0.35, (heat - 30) / 160); p.map((c, xx, yy) => { const e = Math.max(Math.abs(xx - 100) / 100, Math.abs(yy - 46) / 46); return e > 0.7 ? mix(c, C('#c02020'), k * (e - 0.7) / 0.3) : c; }); }
  return p;
}

/** Mesa com toalha e microfones (cacho cresce com a era; antes de 1950, um microfone de fita grande). */
function front(p: Px, year: number, crisis: boolean): void {
  const pal = paletteOf(year);
  p.rect(48, 48, 104, 12, crisis ? shade(pal.fabric, -0.2) : pal.fabric); p.hline(48, 151, 48, shade(pal.fabric, 0.2));
  p.rect(48, 60, 104, 2, shade(pal.fabric, -0.4));
  if (year < 1950) { p.vline(112, 40, 48, pal.metalDark); p.rect(108, 34, 9, 8, pal.metal); for (let i = 0; i < 3; i++) p.hline(109, 115, 36 + i * 2, pal.metalDark); return; }
  const n = year < 1975 ? 3 : year < 2000 ? 5 : 7;
  for (let i = 0; i < n; i++) {
    const mx = 100 + (i % 2 ? 1 : -1) * (7 + Math.floor(i / 2) * 4), my = 42 + (i % 3); // abre espaço para o rosto de quem fala
    p.line(mx, my + 3, 100, 48, pal.metalDark);
    p.rect(mx - 1, my, 4, 4, [pal.accent, pal.metal, pal.accent2, C('#e04040'), C('#3a7ae0')][i % 5]);
  }
}
/** Camada da frente (mesa + microfones) em fundo transparente: pintada por cima de quem fala, que fica "atrás da mesa". */
export function paintPressFront27(year: number, ctx: string): Px {
  const p = new Px(PW27, PH27);
  front(p, year, ctx === 'story' || ctx === 'scandal');
  return p;
}

/** Cortiça do quadro de favores (tamanho lógico pequeno; o CSS estica em pixel). */
export function paintCork27(w = 160, h = 100): Px {
  const p = new Px(w, h);
  const a = C('#b8864f'), b = C('#9c6c3c'), fr = C('#5a3a20');
  p.fill((x, y) => { const n = noise(x, y, 11); return n > 0.82 ? shade(a, 0.15) : n < 0.18 ? b : dith(x, y, 0.5) ? a : mix(a, b, 0.35); });
  p.rect(0, 0, w, 3, fr); p.rect(0, h - 3, w, 3, fr); p.rect(0, 0, 3, h, fr); p.rect(w - 3, 0, 3, h, fr);
  p.hline(0, w - 1, 3, shade(fr, 0.3)); p.vline(3, 3, h - 4, shade(fr, 0.3));
  return p;
}
