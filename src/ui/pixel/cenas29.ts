// Rodada 29 (cenas) — CENÁRIOS das cenas animadas novas e acabamento das antigas, no estilo procedural de sempre
// (kit27: paleta da era, rampas, contorno escuro de 1px nos objetos, objetos que mudam com a geração).
// Tudo PURO (só o buffer Px, sem DOM, sem Rng): o mesmo (cena, ano, semente, t) pinta sempre o mesmo quadro.
//   paintStage29(k, key, o)  — cenário completo (tribunal, escritório à noite, sala dos herdeiros, sede, venda,
//                              aeroporto/porto, sala de estar com o aparelho da época, disco de ouro, palco vazio,
//                              camelô pirata, cabine de rádio, ensaio abandonado, limusine do rival...) ou camada
//                              por cima do cenário-base do art27 (estúdio, palco, festival, escritório);
//   light29(k, o)            — luz por ERA (grão e vinheta nos anos 20–50, brilho quente 55–79, névoa neon 80–99,
//                              LED frio 2000+) e por HORA (dia, fim de tarde, noite), por cima de qualquer cena;
//   holoFx29(k, cx, fy, t)   — o feixe do projetor e as linhas de varredura do holograma (F8).
// Quem escolhe o cenário é o cut29model (puro); quem chama é o tocador (cut27.ts).

import { C, Px, inked, noise, rectV, shade, withAlpha, type Col } from './px';
import {
  R, amp, blink, bricks, candle, chair, computer, cone, crowd, desk, dim, disc, drums, floor, grad, guitar, halo, lampDesk, micStand,
  neon, phone, planks, policeCar, poster, pressCam, radio, recLight, shelf, skyline, speaker, stackDiscs, stars, text, tourVehicle,
  tvSet, tw, wall, wave, windowPane, type K27,
} from '../ps/art27kit';

export type Hour29 = 'day' | 'dusk' | 'night';
/** O que o pintor precisa saber da cena (tudo já resolvido pelo modelo). */
export interface Stage29 {
  /** letreiros curtos (já em maiúsculas, sem acento) */
  act?: string; title?: string; brand?: string; city?: string;
  /** número livre por cena (nível da sede, tecnologia, lado do veredito, formato do pirata...) */
  v?: number;
  /** id da tecnologia (cena 'tech') */
  tech?: string;
  hour: Hour29;
  /** cenário completo (true) ou camada por cima do art27 (false) */
  full: boolean;
}

const up = (s: string | undefined, n: number): string => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().slice(0, n);
const ink = (k: K27, draw: (q: Px) => void): void => inked(k.p, draw, withAlpha(C('#170e12'), 255));

// ---------------------------------------------------------------- luz por era e hora (todas as cenas)

/** Luz por cima do quadro: hora do dia e "filme" da geração. Leve (alfa baixo) para não apagar a arte. */
export function light29(k: K27, o: { hour: Hour29; interior?: boolean }): void {
  const { W, H } = k;
  if (o.hour === 'night' && !o.interior) dim(k, 34, '#0a1030');
  if (o.hour === 'dusk') for (let y = 0; y < H; y++) { const a = Math.round(36 * (1 - y / H)); if (a > 2) k.p.hline(0, W - 1, y, withAlpha(C('#ff8a3a'), a)); }
  if (o.hour === 'day' && !o.interior) for (let y = 0; y < Math.round(H * 0.4); y++) if (y % 2 === 0) k.p.hline(0, W - 1, y, withAlpha(C('#fff4d0'), 10));
  switch (k.band) {
    case 0: { // grão de filme + vinheta (os anos de sépia)
      for (let i = 0; i < 40; i++) { const x = Math.floor(noise(i, Math.floor(k.t * 8), k.seed) * W), y = Math.floor(noise(i, 7, Math.floor(k.t * 8)) * H); k.p.set(x, y, withAlpha(C('#2a2018'), 90)); }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.max(Math.abs(x - W / 2) / (W / 2), Math.abs(y - H / 2) / (H / 2)); if (e > 0.82 && (x + y) % 2 === 0) k.p.set(x, y, withAlpha(C('#140c08'), Math.round((e - 0.82) * 600))); }
      if (k.t > 0 && noise(Math.floor(k.t * 5), 2, k.seed) > 0.93) k.p.vline(Math.floor(noise(Math.floor(k.t * 5), 3) * W), 0, H - 1, withAlpha(C('#f4e6c8'), 70)); // risco na película
      break;
    }
    case 1: halo(k, Math.round(W * 0.2), Math.round(H * 0.18), Math.round(W * 0.35), k.c('#ffc070'), 26); break; // brilho quente
    case 2: { // névoa neon nas bordas
      for (let x = 0; x < 18; x++) { const a = Math.round(30 * (1 - x / 18)); k.p.vline(x, 0, H - 1, withAlpha(C('#ff3aa0'), a)); k.p.vline(W - 1 - x, 0, H - 1, withAlpha(C('#3ad0ff'), a)); }
      break;
    }
    default: for (let y = H - 14; y < H; y++) k.p.hline(0, W - 1, y, withAlpha(C('#3a7aff'), Math.round((y - (H - 14)) * 2))); // LED frio no chão
  }
}

/** Feixe do projetor e varredura do holograma (o boneco é desenhado translúcido pelo drawFigs27). */
export function holoFx29(k: K27, cx: number, fy: number, t: number): void {
  const top = Math.max(2, fy - 54);
  cone(k, cx, k.H - 2, 4, top, 34, k.c('#7af0ff'), 34);
  halo(k, cx, fy - 22, 30, k.c('#5ae0ff'), 60);
  for (let y = top; y < fy; y += 2) { const on = t === 0 || noise(y, Math.floor(t * 10), k.seed) > 0.1; if (on) k.p.hline(cx - 16, cx + 16, y, withAlpha(C('#a0f8ff'), y % 4 ? 18 : 36)); }
  R(k, cx - 8, k.H - 4, 16, 3, k.c('#2a3038')); R(k, cx - 3, k.H - 6, 6, 2, k.c('#7af0ff')); // o projetor no chão
  if (t > 0 && noise(Math.floor(t * 3), 4, k.seed) > 0.8) R(k, cx - 18, fy - 40 + Math.floor(noise(Math.floor(t * 3), 5) * 30), 36, 2, withAlpha(C('#ffffff'), 70)); // falha
}

// ---------------------------------------------------------------- peças reutilizáveis

/** Pessoa em silhueta simples (plateia ao fundo, jurados, equipe). */
function sil(k: K27, x: number, y: number, col: Col, tall = 0): void {
  R(k, x, y - 12 - tall, 6, 12 + tall, col); R(k, x + 1, y - 16 - tall, 4, 4, shade(col, 0.15));
}
/** Moldura dourada (retrato do falecido / disco de ouro na parede). */
function frame29(k: K27, x: number, y: number, w: number, h: number, inner: Col): void {
  ink(k, (q) => { rectV(q, x, y, w, h, k.pal.gold, { r: 1 }); });
  R(k, x + 2, y + 2, w - 4, h - 4, inner);
}
/** Disco certificado (ouro, platina ou diamante) emoldurado. */
function certDisc(k: K27, x: number, y: number, lvl: number): void {
  const g = lvl >= 2 ? k.c('#e8f4ff') : lvl === 1 ? k.c('#d8dce8') : k.pal.gold;
  frame29(k, x, y, 24, 30, k.c('#1a1418'));
  k.p.disc(x + 12, y + 12, 8, g); for (let r = 3; r < 8; r += 2) k.p.ring(x + 12, y + 12, r, shade(g, -0.18)); k.p.disc(x + 12, y + 12, 2, k.pal.accent);
  k.p.set(x + 8, y + 8, k.c('#ffffff')); R(k, x + 5, y + 23, 14, 3, k.c('#f4ecd8'));
  if (k.t > 0 && blink(k, 0.7, x)) k.p.set(x + 15, y + 6, k.c('#ffffff'));
}
/** Martelo do juiz (bate no ritmo). */
function gavel(k: K27, x: number, y: number): void {
  const up0 = k.t === 0 ? 3 : Math.round(Math.max(0, Math.sin(k.t * 3)) * 4);
  R(k, x - 1, y - 2, 10, 2, k.pal.woodDark);
  k.p.line(x + 2, y - 4 - up0, x + 10, y - 8 - up0, k.pal.woodDark); R(k, x, y - 7 - up0, 5, 4, k.pal.wood);
  if (up0 === 0 && k.t > 0) halo(k, x + 3, y - 3, 6, k.c('#fff0c0'), 90);
}
/** Carro da geração (frente para a direita); `long` = limusine. */
export function car29(k: K27, x: number, y: number, col: Col, long = false): void {
  const L = long ? 58 : 36;
  if (k.band === 0) { R(k, x, y - 9, L, 6, col); R(k, x + 8, y - 15, 16, 6, col); R(k, x + L - 8, y - 11, 6, 2, k.c('#c0c0c8')); R(k, x + 10, y - 14, 5, 4, k.c('#9ac0d8')); R(k, x + 17, y - 14, 5, 4, k.c('#9ac0d8')); }
  else if (k.band === 1) { R(k, x, y - 9, L, 6, col); R(k, x + 6, y - 14, L - 16, 5, col); R(k, x + 8, y - 13, L - 22, 3, k.c('#9ac0d8')); R(k, x + L - 2, y - 8, 2, 2, k.c('#ff5040')); }
  else { R(k, x, y - 10, L, 7, col); R(k, x + 4, y - 15, L - 10, 5, col); R(k, x + 6, y - 14, L - 14, 3, k.c(k.band === 3 ? '#1a2030' : '#3a4a5a')); R(k, x + L - 2, y - 9, 2, 2, k.c('#fff4b0')); }
  for (const wx of [x + 7, x + L - 8]) { k.p.disc(wx, y - 3, 3, k.c('#141418')); k.p.set(wx, y - 3, k.c('#8a8a92')); }
  halo(k, x + L + 2, y - 8, 8, k.c('#fff4b0'), 40);
}
/** Placa de rua / faixa com texto. */
function banner(k: K27, cx: number, y: number, s: string, bg: Col, fg: Col): void {
  const w = tw(s) + 8;
  ink(k, (q) => q.rect(Math.round(cx - w / 2), y, w, 9, bg));
  text(k, s, Math.round(cx - w / 2) + 4, y + 2, fg);
}
/** Mesa de reunião comprida (vista de frente, com cadeiras atrás). */
function longTable(k: K27, x0: number, x1: number, y: number): void {
  for (let x = x0 + 6; x < x1 - 6; x += 18) chair(k, x, y - 6);
  ink(k, (q) => { q.rect(x0, y - 12, x1 - x0, 3, k.band >= 3 ? k.c('#d8d4cc') : k.pal.wood); });
  R(k, x0 + 3, y - 9, x1 - x0 - 6, 9, withAlpha(shade(k.band >= 3 ? k.c('#d8d4cc') : k.pal.wood, -0.35), 230));
}
/** Papéis sobre a mesa (contrato, testamento, autos). */
function papers(k: K27, x: number, y: number, n = 3): void {
  for (let i = 0; i < n; i++) { R(k, x + i * 7, y - 2 - (i % 2), 6, 2, k.pal.paper); k.p.hline(x + i * 7 + 1, x + i * 7 + 4, y - 2 - (i % 2), shade(k.pal.paper, -0.3)); }
}
/** Telefone que toca (treme). */
function ringing(k: K27, x: number, y: number): void {
  const sh = k.t > 0 && blink(k, 3) ? (Math.floor(k.t * 20) % 2 ? 1 : -1) : 0;
  phone(k, x + sh, y);
  if (sh) { k.p.set(x - 3, y - 7, k.c('#ffe080')); k.p.set(x + 9, y - 7, k.c('#ffe080')); k.p.set(x - 2, y - 9, k.c('#ffe080')); k.p.set(x + 8, y - 9, k.c('#ffe080')); }
}
/** Chuva na janela (escorre). */
function rainOn(k: K27, x: number, y: number, w: number, h: number): void {
  for (let i = 0; i < Math.floor(w * h / 40); i++) { const xx = x + Math.floor(noise(i, 1, k.seed) * w); const yy = y + Math.floor((noise(i, 2, k.seed) * h + k.t * (18 + (i % 5) * 6)) % h); k.p.vline(xx, yy, Math.min(y + h - 1, yy + 2), k.c('#b0c8e8', 150)); }
}
/** Mídia da geração no balcão do pirata (78 de goma-laca, LP, cassete, CD-R, pendrive). */
function bootlegItem(k: K27, x: number, y: number, i: number): void {
  if (k.year < 1950) { k.p.disc(x + 4, y - 4, 4, k.c('#1a1418')); k.p.disc(x + 4, y - 4, 1, k.c('#c0603a')); }
  else if (k.year < 1968) { R(k, x, y - 8, 8, 8, [k.pal.accent, k.pal.accent2, k.pal.fabric2][i % 3]); k.p.disc(x + 4, y - 4, 2, k.c('#121214')); }
  else if (k.year < 1990) { R(k, x, y - 4, 8, 4, k.c('#26262c')); R(k, x + 1, y - 3, 6, 1, [k.c('#f4ecd8'), k.c('#e05a4e'), k.c('#ffd040')][i % 3]); k.p.set(x + 2, y - 2, k.c('#8a8a92')); k.p.set(x + 5, y - 2, k.c('#8a8a92')); }
  else if (k.year < 2008) { k.p.disc(x + 4, y - 4, 4, k.c('#d8dce8')); k.p.disc(x + 4, y - 4, 1, k.c('#8890a0')); k.p.set(x + 2, y - 6, k.c('#ffffff')); text(k, 'X', x + 6, y - 9, k.c('#e05a4e')); }
  else { R(k, x + 2, y - 4, 4, 3, k.c('#3a3a42')); R(k, x + 3, y - 5, 2, 1, k.c('#c0c0c8')); }
}
/** Placar de partidas (aeroporto/estação) com o destino. */
function departures(k: K27, x: number, y: number, dest: string): void {
  ink(k, (q) => q.rect(x, y, 70, 22, k.c('#121216')));
  const rows = [dest || 'TOKYO', 'LONDON', 'PARIS'];
  rows.forEach((r, i) => { const flip = k.t > 0 && i === 0 && Math.floor(k.t * 2) % 5 === 0; text(k, flip ? '-----' : r.slice(0, 10), x + 3, y + 2 + i * 7, k.c(i === 0 ? '#ffd040' : '#c0c0c8')); if (i === 0) text(k, blink(k, 1.2) ? (k.band >= 2 ? 'BOARD' : 'EMBARQ') : '', x + 46, y + 2, k.c('#5aff9a')); });
}

// ---------------------------------------------------------------- cenários

type Painter29 = (k: K27, o: Stage29) => void;

/** Sala de reunião alta (venda, compra, herdeiros): janela para a cidade, mesa comprida. */
function boardroom(k: K27, o: Stage29, portrait = false): void {
  const { W, fy } = k;
  wall(k, 0, fy, k.band >= 3 ? k.c('#c8ccd4') : k.pal.wall);
  const wx = Math.round(W * 0.56), ww = Math.round(W * 0.38), wy = 8, wh = Math.round(fy * 0.52);
  R(k, wx - 2, wy - 2, ww + 4, wh + 4, k.pal.trim);
  grad(k, wx, wy, ww, wy + wh, k.c(o.hour === 'night' ? '#0c0a24' : o.hour === 'dusk' ? '#e8904a' : '#8ac0e8'), k.c(o.hour === 'night' ? '#2a1c48' : o.hour === 'dusk' ? '#ffd080' : '#d8ecf8'));
  const sk = new Px(ww, wh); const kk = { ...k, p: sk, W: ww, H: wh } as K27;
  skyline(kk, wh, k.c(o.hour === 'day' ? '#5a6a80' : '#141024'), k.c('#ffd889', o.hour === 'day' ? 40 : 200), { seed: k.seed, tall: 0.9 });
  k.p.blit(sk, wx, wy);
  for (let i = 1; i < 4; i++) k.p.vline(wx + Math.round((ww * i) / 4), wy, wy + wh - 1, k.pal.trim);
  if (portrait) frame29(k, Math.round(W * 0.5) - 18, 4, 36, 42, k.c('#2a1c18'));
  else if (k.band >= 2) { R(k, 10, 10, 60, 10, k.c('#101418')); for (let i = 0; i < 8; i++) { const v = noise(i, Math.floor(k.t * 2), k.seed); text(k, v > 0.5 ? '+' : '-', 12 + i * 7, 12, k.c(v > 0.5 ? '#5aff9a' : '#ff5a5a')); } } // cotação
  else { frame29(k, 14, 8, 26, 20, k.pal.accent); frame29(k, 46, 10, 18, 16, k.pal.fabric2); }
  floor(k, fy, k.pal.floors.office.a, k.pal.floors.office.b);
  longTable(k, Math.round(W * 0.14), Math.round(W * 0.86), fy - 4);
  papers(k, Math.round(W * 0.42), fy - 16, 4);
  lampDesk(k, Math.round(W * 0.2), fy - 16, o.hour !== 'day');
}

const FULL29: Record<string, Painter29> = {
  /** Tribunal: lambri, bancada do juiz no alto, bandeiras, réus e advogados; o martelo bate. */
  court(k, o) {
    const { W, fy } = k;
    wall(k, 0, fy, k.pal.wood);
    planks(k, 0, Math.round(fy * 0.45), W, Math.round(fy * 0.55), k.pal.woodDark, true);
    for (const x of [Math.round(W * 0.12), Math.round(W * 0.84)]) { windowPane(k, x, 8, 22, 30, k.c(o.hour === 'night' ? '#1a2040' : '#a8c8e8'), o.hour === 'night'); if (o.hour !== 'night') cone(k, x + 11, 38, 22, fy, 40, k.c('#fff0c0'), 26); }
    // brasão e bandeiras
    const cx = Math.round(W / 2);
    ink(k, (q) => { q.disc(cx, 14, 8, k.pal.gold); q.disc(cx, 14, 5, k.pal.accent2); });
    for (const fx of [cx - 30, cx + 26]) { k.p.vline(fx, 6, 46, k.pal.metal); R(k, fx + 1, 7, 10, 7, k.pal.accent); R(k, fx + 1, 10, 10, 2, k.pal.paper); }
    // bancada do juiz
    ink(k, (q) => { rectV(q, cx - 34, fy - 40, 68, 22, k.pal.woodDark, { r: 1 }); });
    R(k, cx - 34, fy - 40, 68, 2, shade(k.pal.wood, 0.25));
    sil(k, cx - 3, fy - 40, k.c('#16141a'), 2); R(k, cx - 2, fy - 54, 4, 2, k.c('#f4f0e0')); // juiz de toga
    gavel(k, cx + 12, fy - 40);
    // mesas das partes
    for (const [x, side] of [[Math.round(W * 0.1), 0], [Math.round(W * 0.62), 1]] as const) { desk(k, x, fy, Math.round(W * 0.28)); papers(k, x + 4, fy - 12, 3); if (side) R(k, x + 20, fy - 15, 6, 3, k.c('#3a2a1a')); }
    // galeria ao fundo
    for (let i = 0; i < 6; i++) sil(k, 8 + i * 9, fy - 20, k.c('#2a2024', 220));
    if (o.v === 1 || o.v === 2) { // veredito: carimbo
      const won = o.v === 1, x = Math.round(W * 0.55), y = 14;
      if (k.t === 0 || k.t > 4) { R(k, x - 2, y - 2, 70, 13, k.c(won ? '#2a8a4a' : '#c02020', 230)); R(k, x, y, 66, 9, k.c('#f4e6d0', 230)); text(k, won ? (k.year >= 1980 ? 'WON' : 'VITORIA') : (k.year >= 1980 ? 'LOST' : 'DERROTA'), x + 6, y + 2, k.c(won ? '#2a8a4a' : '#c02020')); }
    }
  },
  /** Golpe: escritório escuro, chuva na janela, telefone tocando, sombra na persiana. */
  coup(k, o) {
    const { W, fy } = k;
    wall(k, 0, fy, shade(k.pal.wall, -0.45));
    const wx = Math.round(W * 0.5), ww = Math.round(W * 0.42), wy = 6, wh = Math.round(fy * 0.62);
    windowPane(k, wx, wy, ww, wh, k.c('#141838'), true);
    const sk = new Px(ww, wh); skyline({ ...k, p: sk, W: ww, H: wh } as K27, wh, k.c('#0c0a1a'), k.c('#ffd889', 210), { seed: k.seed + 7, tall: 0.8 }); k.p.blit(sk, wx, wy);
    rainOn(k, wx, wy, ww, wh);
    if (k.band >= 1) for (let y = wy; y < wy + wh; y += 3) k.p.hline(wx, wx + ww - 1, y, k.c('#0a0a14', 120)); // persiana
    if (k.t > 0 && noise(Math.floor(k.t * 2), 1, k.seed) > 0.85) R(k, 0, 0, W, fy, withAlpha(C('#e8f0ff'), 40)); // relâmpago
    // sombra de alguém atrás da persiana
    const sx = wx + Math.round(ww * 0.3 + wave(k, 0.15) * 10);
    R(k, sx, wy + wh - 30, 12, 30, k.c('#060610', 170)); R(k, sx + 2, wy + wh - 38, 8, 8, k.c('#060610', 170));
    floor(k, fy, shade(k.pal.floors.office.a, -0.4), shade(k.pal.floors.office.b, -0.4));
    desk(k, Math.round(W * 0.12), fy, 54);
    lampDesk(k, Math.round(W * 0.14), fy - 12, true);
    cone(k, Math.round(W * 0.14) + 2, fy - 20, 4, fy - 12, 26, k.pal.lamp, 50);
    ringing(k, Math.round(W * 0.3), fy - 12);
    papers(k, Math.round(W * 0.2), fy - 12, 2);
    if (k.band >= 2) computer(k, Math.round(W * 0.36), fy - 12, false);
    text(k, o.brand ?? '', 6, 4, k.c('#5a4a3a'));
  },
  /** Herdeiros: sala fria, retrato na parede (o boneco é posto na moldura pela interface), dois lados da mesa. */
  heirs(k, o) {
    boardroom(k, { ...o, hour: o.hour === 'day' ? 'dusk' : o.hour }, true);
    papers(k, Math.round(k.W * 0.3), k.fy - 16, 2); papers(k, Math.round(k.W * 0.62), k.fy - 16, 2);
    // testamento selado no meio
    const cx = Math.round(k.W / 2);
    R(k, cx - 6, k.fy - 19, 12, 4, k.pal.paper); k.p.disc(cx, k.fy - 17, 2, k.c('#a02020'));
  },
  /** Venda da empresa / compra de um selo: a sala de reunião, o contrato e a caneta. */
  sale(k, o) {
    boardroom(k, o);
    const cx = Math.round(k.W / 2);
    R(k, cx - 10, k.fy - 19, 20, 5, k.pal.paper); k.p.hline(cx - 8, cx + 6, k.fy - 17, shade(k.pal.paper, -0.35));
    k.p.line(cx + 6, k.fy - 22, cx + 12, k.fy - 26, k.c('#1a1a1e'));
    if (o.brand) banner(k, Math.round(k.W * 0.28), 30, o.brand.slice(0, 14), k.c('#1a1418'), k.pal.gold);
    if (o.v) { stackDiscs(k, Math.round(k.W * 0.18), k.fy - 16, 4, k.pal.accent); stackDiscs(k, Math.round(k.W * 0.72), k.fy - 16, 3, k.pal.accent2); }
  },
  /** Sede nova: fachada por nível, faixa com o nome, fita para cortar, equipe e carros da época. */
  hq(k, o) {
    const { W, fy } = k;
    grad(k, 0, 0, W, fy, k.c(o.hour === 'night' ? '#0c0a24' : '#7ab0e0'), k.c(o.hour === 'night' ? '#2a1c48' : '#e0f0f8'));
    if (o.hour === 'night') stars(k, 20, fy * 0.4);
    skyline(k, fy - 10, k.c(o.hour === 'night' ? '#141024' : '#8a98b0'), k.c('#ffd889', 160), { seed: k.seed + 3, dens: 0.6 });
    const lvl = Math.max(0, Math.min(4, o.v ?? 1));
    const bw = 60 + lvl * 14, bh = 34 + lvl * 12, bx = Math.round(W / 2 - bw / 2), by = fy - bh;
    ink(k, (q) => { if (lvl <= 1) bricks({ ...k, p: q } as K27, bx, by, bw, bh, k.c('#8a4a3a')); else rectV(q, bx, by, bw, bh, k.band >= 2 ? k.c('#9aa4b4') : k.c('#c8b898'), { r: 1 }); });
    for (let r = 0; r < Math.floor((bh - 16) / 10); r++) for (let c = 0; c < Math.floor((bw - 8) / 10); c++) { const lit = o.hour !== 'day' && noise(r, c, k.seed) > 0.35; R(k, bx + 5 + c * 10, by + 5 + r * 10, 6, 6, lit ? k.c('#ffe8a0') : k.c(k.band >= 2 ? '#5a7a9a' : '#3a4a5a')); }
    R(k, Math.round(W / 2) - 7, fy - 14, 14, 14, k.pal.woodDark); R(k, Math.round(W / 2) - 1, fy - 14, 2, 14, k.pal.gold);
    banner(k, Math.round(W / 2), by + 2, (o.brand ?? 'HQ').slice(0, 16), k.pal.accent, k.c('#fffaf0'));
    if (lvl >= 3) { k.p.vline(bx + bw + 8, 4, fy - 1, k.c('#e0a020')); k.p.hline(bx + bw - 10, bx + bw + 26, 4, k.c('#e0a020')); k.p.vline(bx + bw + 24, 5, 12 + Math.round(wave(k, 0.3) * 3), k.c('#3a3a42')); } // guindaste (obra)
    for (let y = fy; y < k.H; y++) k.p.hline(0, W - 1, y, k.c(k.band === 0 ? '#5a5048' : '#3a3a40'));
    // fita da inauguração (cortada depois de 4 s)
    const cut = k.t > 4;
    if (!cut || k.t === 0) k.p.hline(Math.round(W / 2) - 26, Math.round(W / 2) + 26, fy - 8, k.c('#e02a2a'));
    else { k.p.line(Math.round(W / 2) - 26, fy - 8, Math.round(W / 2) - 4, fy - 2, k.c('#e02a2a')); k.p.line(Math.round(W / 2) + 26, fy - 8, Math.round(W / 2) + 4, fy - 2, k.c('#e02a2a')); }
    k.p.disc(Math.round(W / 2), fy - 8, 3, k.c('#e02a2a'));
    car29(k, 6, fy + 8, k.pal.accent2); if (lvl >= 2) car29(k, W - 46, fy + 8, k.c('#1a1a1e'));
  },
  /** Perna da turnê no exterior: porto (até 54), pista com escada do avião (55+), placar com o destino. */
  leg(k, o) {
    const { W, fy } = k;
    grad(k, 0, 0, W, fy, k.c(o.hour === 'night' ? '#0c0a24' : o.hour === 'dusk' ? '#e07a4a' : '#7ab8e8'), k.c(o.hour === 'night' ? '#2a2a5a' : o.hour === 'dusk' ? '#ffd890' : '#e8f4fc'));
    if (k.band === 0) { // cais e navio
      for (let y = fy - 18; y < fy; y++) k.p.hline(0, W - 1, y, k.c(y % 3 ? '#2a4a6a' : '#3a5a7a'));
      const sx = Math.round(W * 0.42) + Math.round(wave(k, 0.1) * 2);
      ink(k, (q) => { q.poly([[sx, fy - 30], [sx + 120, fy - 30], [sx + 110, fy - 16], [sx + 8, fy - 16]], k.c('#1a1a22')); q.rect(sx + 20, fy - 44, 70, 14, k.c('#f0ece0')); });
      for (let i = 0; i < 3; i++) { R(k, sx + 34 + i * 20, fy - 60, 8, 16, k.c('#c02a2a')); R(k, sx + 34 + i * 20, fy - 60, 8, 3, k.c('#1a1a1e')); if (k.t > 0) for (let j = 0; j < 3; j++) k.p.disc(sx + 38 + i * 20 + j * 4, fy - 64 - j * 5 - Math.round(k.t * 4) % 6, 2 + j, k.c('#d8d8e0', 140)); }
      for (let i = 0; i < 12; i++) R(k, sx + 24 + i * 6, fy - 42, 3, 3, k.c('#ffe8a0'));
      planks(k, 0, fy - 4, Math.round(W * 0.45), 4, k.pal.woodDark, false);
      k.p.line(Math.round(W * 0.3), fy - 4, sx + 20, fy - 30, k.pal.wood);
    } else { // pista e avião
      for (let y = fy - 6; y < fy; y++) k.p.hline(0, W - 1, y, k.c('#4a4a52'));
      for (let x = 0; x < W; x += 16) k.p.hline(x, x + 7, fy - 3, k.c('#e8e0a0'));
      const px0 = Math.round(W * 0.38), jet = k.band >= 2;
      ink(k, (q) => { q.rect(px0, fy - 30, jet ? 150 : 120, 16, k.c('#e8eaf0')); q.disc(px0 + (jet ? 150 : 120), fy - 22, 8, k.c('#e8eaf0')); q.poly([[px0 + 4, fy - 30], [px0 + 22, fy - 30], [px0 + 10, fy - 52]], k.c('#e8eaf0')); q.poly([[px0 + 50, fy - 18], [px0 + 90, fy - 18], [px0 + 66, fy - 6]], k.c('#c8ccd8')); });
      R(k, px0, fy - 24, jet ? 150 : 120, 3, k.pal.accent);
      for (let i = 0; i < (jet ? 18 : 12); i++) R(k, px0 + 30 + i * 6, fy - 28, 3, 3, k.c('#3a5a7a'));
      if (!jet) for (const ex of [px0 + 56, px0 + 84]) { k.p.disc(ex, fy - 16, 4, k.c('#2a2a30')); if (k.t > 0) k.p.line(ex - 4, fy - 16, ex + 4, fy - 16 + (Math.floor(k.t * 12) % 2 ? 4 : -4), k.c('#8a8a92')); }
      // escada
      for (let i = 0; i < 6; i++) R(k, px0 + 20 - i * 3, fy - 26 + i * 4, 8, 2, k.c('#c0c0c8'));
      k.p.line(px0 + 14, fy - 30, px0 + 2, fy - 4, k.c('#8a8a92'));
    }
    departures(k, 6, 6, o.city ?? '');
    if (k.band >= 1) tourVehicle(k, 4, fy + 10, o.act);
  },
  /** Nova tecnologia: sala de estar da época com o aparelho que chega, a família reunida na luz dele. */
  tech(k, o) {
    const { W, fy } = k;
    wall(k, 0, fy, k.pal.wall);
    windowPane(k, Math.round(W * 0.06), 10, 34, 34, k.c(o.hour === 'night' ? '#141838' : '#9ac8e8'), o.hour === 'night');
    floor(k, fy, k.pal.floors.lounge.a, k.pal.floors.lounge.b);
    // tapete e sofá
    k.p.ellipse(Math.round(W * 0.42), fy - 1, 40, 4, withAlpha(k.pal.fabric2, 200));
    ink(k, (q) => { rectV(q, Math.round(W * 0.2), fy - 16, 52, 10, k.pal.fabric, { r: 1 }); rectV(q, Math.round(W * 0.2), fy - 22, 52, 7, shade(k.pal.fabric, -0.15), { r: 1 }); });
    for (let i = 0; i < 3; i++) sil(k, Math.round(W * 0.23) + i * 15, fy - 12, shade(k.pal.fabric2, -0.5 + i * 0.1), i === 1 ? 3 : 0);
    // aparelho por tecnologia (à direita, a luz dele nas pessoas)
    const dx = Math.round(W * 0.66), tech = o.tech ?? '';
    const glow = tech === 'clipnet' ? k.c('#ff4ad0') : tech === 'tv_music' ? k.c('#c8d8ff') : tech === 'streaming' || tech === 'short_video' || tech === 'internet' ? k.c('#3aa0ff') : k.pal.lamp;
    R(k, dx - 8, fy - 12, 50, 3, k.pal.woodDark); k.p.vline(dx - 6, fy - 9, fy - 1, k.pal.woodDark); k.p.vline(dx + 39, fy - 9, fy - 1, k.pal.woodDark);
    switch (tech) {
      case 'radio': { const k0 = { ...k, band: 0 } as K27; radio(k0, dx + 8, fy - 12); for (let i = 0; i < 3; i++) if (k.t === 0 || blink(k, 1.5, i * 0.3)) k.p.ring(dx + 15, fy - 22, 4 + i * 4 + (k.t > 0 ? Math.floor(k.t * 3) % 2 : 0), withAlpha(k.pal.gold, 120 - i * 30)); break; }
      case 'lp': case 'single45': R(k, dx + 2, fy - 16, 28, 4, k.pal.wood); disc(k, dx + 14, fy - 18, 8, k.pal.accent, k.t * 4); k.p.line(dx + 26, fy - 22, dx + 18, fy - 18, k.pal.metal); break;
      case 'cassette': { const k2 = { ...k, band: 2 } as K27; radio(k2, dx + 6, fy - 12); break; }
      case 'cd': R(k, dx + 2, fy - 18, 30, 6, k.c('#1a1a1e')); R(k, dx + 4 + (k.t > 0 ? Math.min(10, Math.floor(k.t * 3)) : 10), fy - 17, 12, 2, k.c('#2a2a30')); k.p.disc(dx + 18, fy - 24, 5, k.c('#d8dce8')); k.p.disc(dx + 18, fy - 24, 1, k.c('#8890a0')); k.p.set(dx + 16, fy - 26, k.c('#ffffff')); text(k, '0:0' + (k.t > 0 ? Math.floor(k.t) % 10 : 1), dx + 6, fy - 18, k.c('#5aff9a')); break;
      case 'internet': computer({ ...k, band: 2 } as K27, dx + 8, fy - 12, false); for (let i = 0; i < 4; i++) k.p.set(dx + 30 + i * 2, fy - 16, blink(k, 4, i) ? k.c('#5aff9a') : k.c('#1a3a1a')); break;
      case 'streaming': case 'download': case 'short_video': R(k, dx + 10, fy - 26, 10, 16, k.c('#16161a')); R(k, dx + 11, fy - 25, 8, 13, glow); for (let i = 0; i < 4; i++) k.p.vline(dx + 12 + i * 2, fy - 14 - Math.round(Math.abs(wave(k, 2, i * 0.3)) * 6) - 1, fy - 14, k.c('#ffffff')); break;
      default: { // TV (musical ou rede de clipes)
        tvSet({ ...k, band: tech === 'clipnet' ? 2 : 1 } as K27, dx + 6, fy - 12, glow);
        if (tech === 'clipnet') text(k, k.t > 0 && Math.floor(k.t * 2) % 2 ? '24H' : 'CLIPES', dx + 8, fy - 24, k.c('#fffaf0'));
        else for (let i = 0; i < 3; i++) k.p.hline(dx + 9, dx + 18, fy - 24 + i * 3 + (k.t > 0 ? Math.floor(k.t * 6) % 3 : 0), k.c('#ffffff', 90));
      }
    }
    halo(k, dx + 14, fy - 20, 40, glow, 46);
    cone(k, dx + 14, fy - 20, 6, fy - 4, 70, glow, 18);
    // calendário com o ano
    R(k, Math.round(W * 0.5), 10, 18, 20, k.pal.paper); R(k, Math.round(W * 0.5), 10, 18, 5, k.pal.accent); text(k, String(k.year).slice(-2), Math.round(W * 0.5) + 4, 17, k.c('#1a1a1e'));
  },
  /** Disco de ouro/platina: parede do escritório com os quadros, placa entregue, flash da foto. */
  cert(k, o) {
    const { W, fy } = k;
    wall(k, 0, fy, k.pal.wall);
    for (let i = 0; i < 5; i++) certDisc(k, 10 + i * 30, 8 + (i % 2) * 4, i === 2 ? (o.v ?? 0) : 0);
    shelf(k, Math.round(W * 0.74), fy - 4, 50, 40, 0.85);
    floor(k, fy, k.pal.floors.office.a, k.pal.floors.office.b);
    // a placa grande no cavalete
    const cx = Math.round(W * 0.5);
    k.p.line(cx - 10, fy - 1, cx - 4, fy - 30, k.pal.woodDark); k.p.line(cx + 10, fy - 1, cx + 4, fy - 30, k.pal.woodDark);
    certDisc(k, cx - 12, fy - 52, o.v ?? 0);
    if (o.title) text(k, o.title.slice(0, 10), cx - 18, fy - 20, k.c('#fffaf0'), k.c('#1a1418'));
    pressCam(k, Math.round(W * 0.12), fy - 20, k.t > 0 && blink(k, 0.5) && Math.sin(k.t * 3) > 0.9);
    R(k, Math.round(W * 0.12) + 2, fy - 20, 2, 20, k.pal.metalDark);
  },
  /** Aposentadoria: palco vazio, um banquinho, o instrumento no suporte, um foco só; isqueiros ou celulares. */
  retire(k, o) {
    const { W, fy } = k;
    R(k, 0, 0, W, fy, k.c('#0a0810'));
    for (let x = 0; x < W; x += 6) R(k, x, 0, 4, Math.round(fy * 0.75), k.c(x % 12 ? '#3a0e14' : '#4a141c')); // cortina
    R(k, 0, fy - 14, W, 14, k.pal.woodDark); R(k, 0, fy - 14, W, 1, shade(k.pal.wood, 0.3));
    const cx = Math.round(W / 2);
    cone(k, cx, 0, 6, fy - 14, 46, k.c('#fff4d0'), 60);
    k.p.ellipse(cx, fy - 14, 24, 3, k.c('#fff4d0', 90));
    micStand(k, cx + 10, fy - 14, 22);
    R(k, cx - 6, fy - 22, 10, 2, k.pal.wood); k.p.vline(cx - 5, fy - 20, fy - 15, k.pal.woodDark); k.p.vline(cx + 2, fy - 20, fy - 15, k.pal.woodDark); // banquinho
    guitar(k, cx - 22, fy - 14, k.pal.accent2);
    // plateia: isqueiros (até 1999) ou celulares (2000+)
    for (let i = 0; i < 22; i++) {
      const x = 6 + i * Math.round((W - 12) / 22), y = fy + 6 + (i % 3) * 2;
      R(k, x, y - 2, 6, 10, k.c('#120e16'));
      const sway = Math.round(wave(k, 0.4, i * 0.2) * 2);
      if (k.band >= 3) { R(k, x + 2 + sway, y - 8, 2, 3, k.c('#9ad0ff')); halo(k, x + 3 + sway, y - 7, 4, k.c('#9ad0ff'), 60); }
      else { k.p.set(x + 3 + sway, y - 7, k.c('#ffd040')); halo(k, x + 3 + sway, y - 7, 4, k.c('#ffb040'), 60); }
    }
    if (o.act) neon(k, o.act.slice(0, 14), cx, 4, k.pal.gold);
  },
  /** Pirataria: camelô na calçada com a mídia da época, toldo, poste; a viatura chega no fim. */
  bootleg(k, o) {
    const { W, fy } = k;
    grad(k, 0, 0, W, fy, k.c('#0c0a24'), k.c('#2a1c48')); stars(k, 16, fy * 0.3);
    bricks(k, 0, Math.round(fy * 0.2), W, Math.round(fy * 0.8), k.c('#4a2a24'));
    R(k, 0, Math.round(fy * 0.2), W, Math.round(fy * 0.8), k.c('#06040c', 110));
    for (let i = 0; i < 3; i++) poster(k, 10 + i * 26, 18 + (i % 2) * 4, 18, 24, [k.pal.accent, k.pal.accent2, k.pal.fabric2][i], o.act);
    for (let y = fy; y < k.H; y++) k.p.hline(0, W - 1, y, k.c('#1a1a20'));
    const sx = Math.round(W * 0.36);
    for (let x = 0; x < 80; x += 8) R(k, sx + x, fy - 44, 8, 6, k.c(x % 16 ? '#e8e0d0' : '#c02a2a')); // toldo listrado
    k.p.vline(sx + 1, fy - 38, fy - 1, k.pal.metalDark); k.p.vline(sx + 78, fy - 38, fy - 1, k.pal.metalDark);
    R(k, sx + 2, fy - 14, 76, 3, k.pal.wood); R(k, sx + 4, fy - 11, 72, 11, shade(k.pal.wood, -0.4));
    for (let i = 0; i < 8; i++) bootlegItem(k, sx + 4 + i * 9, fy - 14, i);
    text(k, k.year >= 1980 ? '$5' : '$1', sx + 60, fy - 34, k.c('#ffd040'));
    const lx = Math.round(W * 0.88); R(k, lx, fy - 50, 2, 50, k.c('#2a2a30')); cone(k, lx + 1, fy - 48, 4, fy, 30, k.c('#ffd889'), 36); halo(k, lx + 1, fy - 49, 6, k.c('#ffe8b0'), 120);
    if (k.t > 6 || k.t === 0) policeCar(k, W - 40, fy + 10);
    neon(k, k.year >= 1975 ? 'PIRATA' : 'DISCOS', Math.round(W * 0.2), 6, k.c('#ff4a8a'));
  },
  /** Jabá: cabine de rádio, ON AIR, o envelope desliza pela mesa. */
  payola(k, o) {
    const { W, fy } = k;
    wall(k, 0, fy, shade(k.pal.wall, -0.2));
    for (let i = 0; i < W; i += 8) R(k, i, 6, 6, Math.round(fy * 0.4), shade(k.pal.fabric, -0.35)); // espuma
    recLight(k, Math.round(W * 0.44), 4, blink(k, 0.8));
    windowPane(k, Math.round(W * 0.66), 14, 60, 30, k.c('#1a2a3a'), true);
    floor(k, fy, k.pal.floors.control.a, k.pal.floors.control.b);
    desk(k, Math.round(W * 0.16), fy, Math.round(W * 0.66));
    // pratos / mesa da época
    if (k.band <= 1) { disc(k, Math.round(W * 0.28), fy - 15, 7, k.pal.accent, k.t * 5); disc(k, Math.round(W * 0.48), fy - 15, 7, k.pal.accent2, -k.t * 5); }
    else { R(k, Math.round(W * 0.26), fy - 18, 40, 6, k.c('#2a2a30')); for (let i = 0; i < 12; i++) k.p.set(Math.round(W * 0.26) + 2 + i * 3, fy - 16 - (i % 3), k.c(i % 4 ? '#c8c8d0' : '#ff8a3a')); }
    micStand(k, Math.round(W * 0.38), fy - 12, 16);
    // o envelope (desliza da direita para o DJ)
    const ex = Math.round(W * 0.72 - Math.min(1, k.t / 5) * W * 0.16);
    ink(k, (q) => q.rect(ex, fy - 16, 14, 8, k.c('#e8dcb8')));
    k.p.line(ex, fy - 16, ex + 7, fy - 12, k.c('#b8a888')); k.p.line(ex + 13, fy - 16, ex + 7, fy - 12, k.c('#b8a888'));
    text(k, '$', ex + 5, fy - 15, k.c('#2a8a4a'));
    if (o.title) text(k, o.title.slice(0, 12), Math.round(W * 0.67), 18, k.c('#ffd040'));
  },
  /** Fim da banda: sala de ensaio depois da briga, instrumentos largados, lâmpada pendurada balançando. */
  split(k, o) {
    const { W, fy } = k;
    bricks(k, 0, 0, W, fy, k.c('#3a2620'));
    R(k, 0, 0, W, fy, k.c('#08060c', 120));
    for (let i = 0; i < 4; i++) poster(k, 12 + i * 30, 10 + (i % 2) * 5, 20, 26, [k.pal.accent, k.pal.accent2, k.pal.fabric2, k.c('#e8e0d0')][i], i === 0 ? o.act : undefined);
    floor(k, fy, k.pal.floors.garage.a, k.pal.floors.garage.b);
    const lx = Math.round(W * 0.5 + wave(k, 0.35) * 8);
    k.p.line(Math.round(W * 0.5), 0, lx, 30, k.c('#1a1a1e')); k.p.disc(lx, 32, 2, k.c('#ffe8a0'));
    cone(k, lx, 32, 3, fy, 60, k.c('#ffe8a0'), 40); halo(k, lx, 32, 10, k.c('#ffe8a0'), 90);
    drums(k, Math.round(W * 0.62), fy);
    k.p.line(Math.round(W * 0.62) + 5, fy - 6, Math.round(W * 0.62) + 13, fy - 6, k.c('#2a2a2e')); // pele furada
    amp(k, Math.round(W * 0.8), fy); speaker(k, Math.round(W * 0.88), fy, 10, 16);
    // guitarra no chão (deitada) e o cabo
    k.p.ellipse(Math.round(W * 0.3), fy - 3, 5, 2, k.pal.accent2); k.p.line(Math.round(W * 0.3) + 4, fy - 3, Math.round(W * 0.3) + 20, fy - 5, k.pal.woodDark);
    k.p.line(Math.round(W * 0.3) + 20, fy - 5, Math.round(W * 0.8), fy - 4, k.c('#1a1a1e'));
    micStand(k, Math.round(W * 0.42), fy, 20);
    for (let i = 0; i < 5; i++) R(k, Math.round(W * 0.14) + i * 5, fy - 2, 2, 2, k.pal.paper); // setlist rasgada
  },
  /** Rival leva o seu artista: calçada do selo à noite, a limusine do outro selo com a porta aberta. */
  poach(k, o) {
    const { W, fy } = k;
    grad(k, 0, 0, W, fy, k.c('#0c0a24'), k.c('#2a1c48')); stars(k, 18, fy * 0.3);
    skyline(k, fy - 14, k.c('#141024'), k.c('#ffd889', 200), { seed: k.seed + 11 });
    // fachada do seu selo à esquerda
    ink(k, (q) => rectV(q, 0, fy - 64, Math.round(W * 0.34), 64, k.c('#5a3a2c'), { r: 1 }));
    R(k, 10, fy - 26, 16, 26, k.c('#ffd889', 200));
    if (o.brand) neon(k, o.brand.slice(0, 12), Math.round(W * 0.17), fy - 58, k.pal.gold);
    for (let y = fy; y < k.H; y++) k.p.hline(0, W - 1, y, k.c('#18181e'));
    k.p.ellipse(Math.round(W * 0.6), fy + 4, 30, 2, k.c('#2a3a5a', 180)); // poça
    car29(k, Math.round(W * 0.58), fy + 6, k.c('#121216'), true);
    R(k, Math.round(W * 0.58) + 20, fy - 14, 2, 8, k.c('#ffd889', 220)); // porta aberta (luz de dentro)
    halo(k, Math.round(W * 0.58) + 21, fy - 10, 10, k.c('#ffd889'), 70);
    rainOn(k, 0, 0, W, fy);
  },
};

/** Camadas por cima do cenário-base do art27 (cenas novas sem cenário próprio e as antigas). */
const OVER29: Record<string, Painter29> = {
  sign1(k) { // a primeira assinatura: caneta-tinteiro ou esferográfica, o carimbo do selo
    const cx = Math.round(k.W * 0.52);
    R(k, cx - 12, k.fy - 15, 24, 4, k.pal.paper); for (let i = 0; i < 3; i++) k.p.hline(cx - 10, cx + 6 - i * 3, k.fy - 14 + i, shade(k.pal.paper, -0.35));
    const s = k.t === 0 ? 1 : Math.min(1, k.t / 6); k.p.line(cx - 8, k.fy - 12, cx - 8 + Math.round(s * 14), k.fy - 12 - Math.round(Math.sin(s * 9) * 1), k.c('#1a2a6a'));
    if (k.t === 0 || k.t > 6) { k.p.ring(cx + 9, k.fy - 13, 3, k.c('#c02020')); k.p.set(cx + 9, k.fy - 13, k.c('#c02020')); }
  },
  studio1(k) { // primeira sessão: luz vermelha e fita/HD girando
    recLight(k, Math.round(k.W * 0.06), 6, blink(k, 0.6));
    if (k.band <= 1) for (const x of [Math.round(k.W * 0.18), Math.round(k.W * 0.26)]) disc(k, x, 30, 6, k.pal.paper, k.t * 3);
  },
  reunion(k, o) { // a faixa da volta e a plateia lotada
    banner(k, Math.round(k.W / 2), 4, k.year >= 1975 ? 'REUNION' : 'DE VOLTA', k.pal.accent, k.c('#fffaf0'));
    crowd(k, 0, k.W, k.fy + 4, 0.95, 1, 2, k.band >= 3 ? k.c('#9ad0ff') : k.c('#ffd040'));
    if (o.act) text(k, o.act, 6, 16, k.pal.gold, k.c('#1a1418'));
  },
  join(k) { // case novo encostado e cadeira a mais no ensaio
    R(k, Math.round(k.W * 0.82), k.fy - 22, 9, 22, k.c('#1a1a1e')); R(k, Math.round(k.W * 0.82) + 2, k.fy - 12, 5, 2, k.pal.metal);
    chair(k, Math.round(k.W * 0.74), k.fy);
  },
  steal(k, o) { // você leva um artista: a mala de dinheiro na mesa do restaurante
    const x = Math.round(k.W * 0.46);
    R(k, x - 12, k.fy - 12, 32, 2, k.c('#f4ecd8')); k.p.vline(x + 4, k.fy - 10, k.fy - 1, k.pal.woodDark);
    ink(k, (q) => q.rect(x - 4, k.fy - 19, 16, 7, k.c('#3a2a1a'))); R(k, x + 2, k.fy - 21, 4, 2, k.pal.gold);
    candle(k, x - 9, k.fy - 12); candle(k, x + 16, k.fy - 12);
    if (o.brand) text(k, o.brand.slice(0, 10), 6, 6, k.pal.gold);
  },
  vow_kept(k) { // o calendário com a data riscada e o aperto de mão (luz quente)
    R(k, Math.round(k.W * 0.08), 8, 22, 24, k.pal.paper); R(k, Math.round(k.W * 0.08), 8, 22, 5, k.c('#2a8a4a'));
    k.p.ring(Math.round(k.W * 0.08) + 11, 22, 4, k.c('#2a8a4a')); halo(k, Math.round(k.W * 0.5), k.fy - 30, 40, k.c('#ffc070'), 30);
  },
  vow_broken(k) { // a data passou: X vermelho, chuva lá fora
    R(k, Math.round(k.W * 0.08), 8, 22, 24, k.pal.paper); R(k, Math.round(k.W * 0.08), 8, 22, 5, k.c('#c02020'));
    k.p.line(Math.round(k.W * 0.08) + 5, 16, Math.round(k.W * 0.08) + 17, 28, k.c('#c02020')); k.p.line(Math.round(k.W * 0.08) + 17, 16, Math.round(k.W * 0.08) + 5, 28, k.c('#c02020'));
    for (let i = 0; i < 50; i++) k.p.vline(Math.round((i * 29 + k.t * 30) % k.W), Math.round((i * 47 + k.t * 120) % k.fy), Math.round((i * 47 + k.t * 120) % k.fy) + 3, k.c('#aabedc', 110));
  },
  headline(k, o) { // telão com o nome, colunas de fogo, multidão cheia
    const cx = Math.round(k.W / 2);
    ink(k, (q) => q.rect(cx - 50, 2, 100, 14, k.c('#0a0a10')));
    text(k, (o.act ?? 'HEADLINER').slice(0, 20), cx - Math.round(tw((o.act ?? 'HEADLINER').slice(0, 20)) / 2), 6, k.band >= 2 ? k.c('#ff4ad0') : k.pal.gold);
    for (const x of [cx - 70, cx + 66]) { const f = k.t === 0 ? 1 : Math.max(0, Math.sin(k.t * 2 + x)); if (f > 0.3) { for (let i = 0; i < 6; i++) k.p.disc(x, k.fy - 30 - i * 5, Math.max(1, 4 - Math.floor(i / 2)), k.c(i < 2 ? '#fff4b0' : i < 4 ? '#ffb040' : '#ff5020', 220 - i * 20)); halo(k, x, k.fy - 40, 16, k.c('#ffb040'), 60); } }
    crowd(k, 0, k.W, k.fy + 6, 1, 1, 2, k.band >= 3 ? k.c('#9ad0ff') : k.c('#ffd040'));
  },
  // ---- acabamento das cenas antigas (r27/r28) ----
  press1(k) { stackDiscs(k, Math.round(k.W * 0.08), k.fy, 6, k.pal.accent); stackDiscs(k, Math.round(k.W * 0.16), k.fy, 4, k.pal.accent2); },
  chart1(k) { halo(k, Math.round(k.W * 0.5), 20, 30, k.pal.gold, 30); },
  no1(k) { for (let i = 0; i < 6; i++) { const x = Math.round(noise(i, 1, k.seed) * k.W), y = 8 + Math.round(noise(i, 2, k.seed) * 30); if (k.t === 0 || blink(k, 1.3, i * 0.2)) { k.p.set(x, y, k.pal.gold); k.p.set(x - 1, y, k.pal.gold); k.p.set(x + 1, y, k.pal.gold); k.p.set(x, y - 1, k.pal.gold); k.p.set(x, y + 1, k.pal.gold); } } },
  show1(k) { crowd(k, 0, Math.round(k.W * 0.6), k.fy + 6, 0.3, 0.2, 1); },
  sold(k) { banner(k, Math.round(k.W * 0.82), 4, k.year >= 1980 ? 'SOLD OUT' : 'ESGOTADO', k.c('#c02020'), k.c('#fffaf0')); crowd(k, 0, k.W, k.fy + 6, 1, 1, 2); },
  flop(k) { for (let i = 0; i < 5; i++) { const y = Math.round(((k.t * 40 + i * 30) % (k.fy - 20))) + 10; if (k.t > 0) k.p.disc(Math.round(k.W * (0.3 + i * 0.1)), y, 1, k.c('#c8e070')); } }, // tomates voando
  tour(k, o) { const x = Math.round(k.W * 0.86); k.p.vline(x, k.fy - 30, k.fy - 1, k.pal.metal); banner(k, x, k.fy - 38, (o.city ?? o.title ?? '').slice(0, 10) || 'ROAD', k.c('#2a7a3a'), k.c('#ffffff')); },
  award(k) { for (let i = 0; i < 2; i++) { const x = Math.round(k.W * (0.3 + 0.4 * i) + wave(k, 0.25, i * 0.5) * 30); cone(k, x, 0, 3, k.fy, 30, k.c('#fff4d0'), 26); } },
  scandal(k) { for (let i = 0; i < 4; i++) pressCam(k, 8 + i * 16, k.fy - 10 - (i % 2) * 6, k.t > 0 && Math.sin(k.t * (5 + i) + i) > 0.9); },
  raid(k) { const x = Math.round(k.W * 0.5 + wave(k, 0.3) * k.W * 0.4); cone(k, x, 0, 2, k.fy, 22, k.c('#f0f8ff'), 30); },
  death(k) { for (let i = 0; i < 9; i++) candle(k, Math.round(k.W * 0.2) + i * Math.round(k.W * 0.07), k.fy); for (let i = 0; i < 6; i++) k.p.disc(Math.round(k.W * 0.24) + i * 22, k.fy - 1, 2, [k.c('#f4f0f0'), k.c('#e05a7a'), k.c('#ffd040')][i % 3]); },
  broke(k) { for (let i = 0; i < 7; i++) { const x = Math.round((i * 41 + k.t * 20) % k.W), y = Math.round((i * 17 + k.t * 14) % k.fy); R(k, x, y, 5, 3, k.pal.paper); k.p.set(x + 1, y + 1, k.c('#c02020')); } },
  era(k) { R(k, Math.round(k.W * 0.84), 8, 26, 30, k.pal.paper); R(k, Math.round(k.W * 0.84), 8, 26, 7, k.pal.accent); text(k, String(k.year), Math.round(k.W * 0.84) + 3, 20, k.c('#1a1a1e')); },
  fest(k) { for (let i = 0; i < 5; i++) { const x = 10 + i * Math.round(k.W / 5); k.p.vline(x, 4, 20, k.pal.metal); R(k, x + 1, 5, 8, 5, [k.pal.accent, k.pal.accent2, k.c('#ffd040'), k.c('#4ab0e0'), k.c('#6cc35a')][i]); } },
  magic(k) { recLight(k, Math.round(k.W * 0.06), 6, true); },
  holo(k) { holoFx29(k, Math.round(k.W / 2), k.fy - 16, k.t); },
};

/** Cenas com cenário completo (as outras usam o art27 + camada). */
export const FULL_KEYS29 = new Set(Object.keys(FULL29));
/** Pinta o cenário (completo) ou a camada da cena `key`. Devolve true se pintou algo. */
export function paintStage29(k: K27, key: string, o: Stage29): boolean {
  const f = o.full ? FULL29[key] : OVER29[key];
  if (!f) return false;
  f(k, o);
  return true;
}
/** Cenário completo ou camada para uma chave (os testes e a folha de contato usam). */
export const hasStage29 = (key: string): boolean => !!FULL29[key] || !!OVER29[key];
/** Para a folha de contato: as cenas e as camadas registradas. */
export const STAGE_KEYS29 = { full: Object.keys(FULL29), over: Object.keys(OVER29) };
export { up as up29 };
